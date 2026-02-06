"""
告警推送服務

功能：
- 容量告警推送（API 池不足、使用率過高等）
- 支持多種推送渠道：Webhook、郵件、Telegram Bot
- 告警節流：避免重複推送相同告警
- 告警歷史記錄
"""

import asyncio
import aiohttp
import logging
import json
import hashlib
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'system_config.db')


class AlertChannel(str, Enum):
    """告警渠道"""
    WEBHOOK = "webhook"
    EMAIL = "email"
    TELEGRAM = "telegram"


class AlertLevel(str, Enum):
    """告警級別"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class AlertConfig:
    """告警配置"""
    enabled: bool = True
    # Webhook 配置
    webhook_url: Optional[str] = None
    webhook_secret: Optional[str] = None
    # 郵件配置
    email_enabled: bool = False
    email_smtp_host: Optional[str] = None
    email_smtp_port: int = 587
    email_smtp_user: Optional[str] = None
    email_smtp_password: Optional[str] = None
    email_from: Optional[str] = None
    email_to: Optional[List[str]] = None
    # Telegram 配置
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    # 節流配置
    throttle_minutes: int = 30  # 相同告警間隔時間
    # 告警級別過濾
    min_level: AlertLevel = AlertLevel.WARNING


class AlertService:
    """
    告警推送服務（單例）
    支持配置持久化到數據庫
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._config = AlertConfig()
        self._sent_alerts: Dict[str, datetime] = {}  # 已發送告警的時間戳（用於節流）
        self._alert_history: List[Dict[str, Any]] = []  # 告警歷史
        self._db_path = DB_PATH
        self._initialized = True
        
        # 初始化數據庫並加載配置
        self._init_db()
        self._load_config_from_db()
        
        logger.info("[AlertService] Initialized with persistent config")
    
    def _init_db(self):
        """初始化配置數據庫"""
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
        
        conn = sqlite3.connect(self._db_path)
        cursor = conn.cursor()
        
        # 系統配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 告警歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                suggestion TEXT,
                details TEXT,
                channels TEXT,
                sent_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_config_from_db(self):
        """從數據庫加載配置"""
        try:
            conn = sqlite3.connect(self._db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT value FROM system_config WHERE key = 'alert_config'")
            row = cursor.fetchone()
            
            if row:
                config_data = json.loads(row[0])
                self.configure(config_data, save_to_db=False)
                logger.info("[AlertService] Config loaded from database")
            
            conn.close()
        except Exception as e:
            logger.warning(f"[AlertService] Failed to load config from DB: {e}")
    
    def _save_config_to_db(self):
        """保存配置到數據庫"""
        try:
            config_data = {
                "enabled": self._config.enabled,
                "webhook_url": self._config.webhook_url,
                "webhook_secret": self._config.webhook_secret,
                "email_enabled": self._config.email_enabled,
                "email_smtp_host": self._config.email_smtp_host,
                "email_smtp_port": self._config.email_smtp_port,
                "email_smtp_user": self._config.email_smtp_user,
                "email_smtp_password": self._config.email_smtp_password,
                "email_from": self._config.email_from,
                "email_to": self._config.email_to,
                "telegram_bot_token": self._config.telegram_bot_token,
                "telegram_chat_id": self._config.telegram_chat_id,
                "throttle_minutes": self._config.throttle_minutes,
                "min_level": self._config.min_level.value
            }
            
            conn = sqlite3.connect(self._db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO system_config (key, value, updated_at)
                VALUES ('alert_config', ?, ?)
            ''', (json.dumps(config_data), datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            
            logger.info("[AlertService] Config saved to database")
        except Exception as e:
            logger.error(f"[AlertService] Failed to save config to DB: {e}")
    
    def configure(self, config: Dict[str, Any], save_to_db: bool = True) -> None:
        """
        配置告警服務
        
        Args:
            config: 配置字典
            save_to_db: 是否保存到數據庫
        """
        self._config.enabled = config.get('enabled', True)
        self._config.webhook_url = config.get('webhook_url')
        self._config.webhook_secret = config.get('webhook_secret')
        self._config.email_enabled = config.get('email_enabled', False)
        self._config.email_smtp_host = config.get('email_smtp_host')
        self._config.email_smtp_port = config.get('email_smtp_port', 587)
        self._config.email_smtp_user = config.get('email_smtp_user')
        self._config.email_smtp_password = config.get('email_smtp_password')
        self._config.email_from = config.get('email_from')
        self._config.email_to = config.get('email_to', [])
        self._config.telegram_bot_token = config.get('telegram_bot_token')
        self._config.telegram_chat_id = config.get('telegram_chat_id')
        self._config.throttle_minutes = config.get('throttle_minutes', 30)
        
        min_level = config.get('min_level', 'warning')
        self._config.min_level = AlertLevel(min_level) if min_level in [l.value for l in AlertLevel] else AlertLevel.WARNING
        
        # 保存到數據庫
        if save_to_db:
            self._save_config_to_db()
        
        logger.info(f"[AlertService] Configured: webhook={bool(self._config.webhook_url)}, email={self._config.email_enabled}, telegram={bool(self._config.telegram_bot_token)}")
    
    def get_config(self) -> Dict[str, Any]:
        """獲取當前配置（脫敏）"""
        return {
            "enabled": self._config.enabled,
            "webhook_configured": bool(self._config.webhook_url),
            "email_enabled": self._config.email_enabled,
            "email_configured": bool(self._config.email_smtp_host and self._config.email_to),
            "telegram_configured": bool(self._config.telegram_bot_token and self._config.telegram_chat_id),
            "throttle_minutes": self._config.throttle_minutes,
            "min_level": self._config.min_level.value
        }
    
    def _get_alert_hash(self, alert_type: str, message: str) -> str:
        """生成告警唯一標識（用於節流）"""
        content = f"{alert_type}:{message}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _should_send(self, alert_hash: str, level: AlertLevel) -> bool:
        """檢查是否應該發送告警（節流邏輯）"""
        if not self._config.enabled:
            return False
        
        # 級別過濾
        level_order = {AlertLevel.INFO: 0, AlertLevel.WARNING: 1, AlertLevel.CRITICAL: 2}
        if level_order.get(level, 0) < level_order.get(self._config.min_level, 1):
            return False
        
        # 節流檢查
        if alert_hash in self._sent_alerts:
            last_sent = self._sent_alerts[alert_hash]
            if datetime.now() - last_sent < timedelta(minutes=self._config.throttle_minutes):
                return False
        
        return True
    
    async def send_alert(
        self,
        alert_type: str,
        message: str,
        level: AlertLevel = AlertLevel.WARNING,
        details: Optional[Dict[str, Any]] = None,
        suggestion: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        發送告警
        
        Args:
            alert_type: 告警類型
            message: 告警消息
            level: 告警級別
            details: 詳細信息
            suggestion: 建議操作
            
        Returns:
            發送結果
        """
        alert_hash = self._get_alert_hash(alert_type, message)
        
        if not self._should_send(alert_hash, level):
            return {"sent": False, "reason": "throttled_or_disabled"}
        
        # 構建告警數據
        alert_data = {
            "type": alert_type,
            "level": level.value,
            "message": message,
            "suggestion": suggestion,
            "details": details or {},
            "timestamp": datetime.now().isoformat(),
            "source": "tgmatrix_api_pool"
        }
        
        results = {
            "sent": False,
            "channels": {},
            "alert_hash": alert_hash
        }
        
        # 發送到各個渠道
        tasks = []
        
        if self._config.webhook_url:
            tasks.append(("webhook", self._send_webhook(alert_data)))
        
        if self._config.email_enabled and self._config.email_to:
            tasks.append(("email", self._send_email(alert_data)))
        
        if self._config.telegram_bot_token and self._config.telegram_chat_id:
            tasks.append(("telegram", self._send_telegram(alert_data)))
        
        if tasks:
            for channel, task in tasks:
                try:
                    success = await task
                    results["channels"][channel] = success
                    if success:
                        results["sent"] = True
                except Exception as e:
                    logger.error(f"[AlertService] Error sending to {channel}: {e}")
                    results["channels"][channel] = False
        
        # 記錄發送時間（用於節流）
        if results["sent"]:
            self._sent_alerts[alert_hash] = datetime.now()
        
        # 記錄歷史到內存
        self._alert_history.append({
            **alert_data,
            "results": results,
            "sent_at": datetime.now().isoformat()
        })
        
        # 保留最近 100 條內存歷史
        if len(self._alert_history) > 100:
            self._alert_history = self._alert_history[-100:]
        
        # 🆕 保存到數據庫
        self._save_alert_to_db(alert_data, results)
        
        logger.info(f"[AlertService] Alert sent: {alert_type} - {level.value} - channels: {results['channels']}")
        return results
    
    def _save_alert_to_db(self, alert_data: Dict[str, Any], results: Dict[str, Any]):
        """保存告警記錄到數據庫"""
        try:
            conn = sqlite3.connect(self._db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO alert_history (alert_type, level, message, suggestion, details, channels, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert_data['type'],
                alert_data['level'],
                alert_data['message'],
                alert_data.get('suggestion'),
                json.dumps(alert_data.get('details', {})),
                json.dumps(results.get('channels', {})),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"[AlertService] Failed to save alert to DB: {e}")
    
    async def _send_webhook(self, alert_data: Dict[str, Any]) -> bool:
        """發送 Webhook"""
        try:
            headers = {"Content-Type": "application/json"}
            
            # 添加簽名（如果配置了密鑰）
            if self._config.webhook_secret:
                payload_str = json.dumps(alert_data, sort_keys=True)
                signature = hashlib.sha256(
                    (payload_str + self._config.webhook_secret).encode()
                ).hexdigest()
                headers["X-Alert-Signature"] = signature
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self._config.webhook_url,
                    json=alert_data,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    return resp.status in (200, 201, 202, 204)
        except Exception as e:
            logger.error(f"[AlertService] Webhook error: {e}")
            return False
    
    async def _send_email(self, alert_data: Dict[str, Any]) -> bool:
        """發送郵件"""
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            # 構建郵件
            msg = MIMEMultipart()
            msg['From'] = self._config.email_from
            msg['To'] = ', '.join(self._config.email_to)
            msg['Subject'] = f"[{alert_data['level'].upper()}] TGMatrix API Pool Alert: {alert_data['type']}"
            
            # 郵件正文
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <div style="background: {'#ffebee' if alert_data['level'] == 'critical' else '#fff3e0'}; 
                            border-left: 4px solid {'#f44336' if alert_data['level'] == 'critical' else '#ff9800'}; 
                            padding: 15px; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: {'#c62828' if alert_data['level'] == 'critical' else '#e65100'};">
                        {alert_data['message']}
                    </h2>
                </div>
                
                <p><strong>類型:</strong> {alert_data['type']}</p>
                <p><strong>級別:</strong> {alert_data['level']}</p>
                <p><strong>時間:</strong> {alert_data['timestamp']}</p>
                
                {f"<p><strong>建議:</strong> {alert_data['suggestion']}</p>" if alert_data.get('suggestion') else ""}
                
                {f"<pre style='background: #f5f5f5; padding: 10px;'>{json.dumps(alert_data.get('details', {}), indent=2, ensure_ascii=False)}</pre>" if alert_data.get('details') else ""}
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">此郵件由 TGMatrix 系統自動發送</p>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            # 發送郵件
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._sync_send_email, msg)
            return True
            
        except Exception as e:
            logger.error(f"[AlertService] Email error: {e}")
            return False
    
    def _sync_send_email(self, msg):
        """同步發送郵件"""
        with smtplib.SMTP(self._config.email_smtp_host, self._config.email_smtp_port) as server:
            server.starttls()
            server.login(self._config.email_smtp_user, self._config.email_smtp_password)
            server.send_message(msg)
    
    async def _send_telegram(self, alert_data: Dict[str, Any]) -> bool:
        """發送 Telegram 消息"""
        try:
            level_emoji = {"info": "ℹ️", "warning": "⚠️", "critical": "🚨"}
            emoji = level_emoji.get(alert_data['level'], "📢")
            
            text = f"""
{emoji} *TGMatrix API Pool Alert*

*{alert_data['message']}*

類型: `{alert_data['type']}`
級別: `{alert_data['level']}`
時間: `{alert_data['timestamp']}`

{f"💡 *建議:* {alert_data['suggestion']}" if alert_data.get('suggestion') else ""}
            """.strip()
            
            url = f"https://api.telegram.org/bot{self._config.telegram_bot_token}/sendMessage"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json={
                    "chat_id": self._config.telegram_chat_id,
                    "text": text,
                    "parse_mode": "Markdown"
                }, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    return resp.status == 200
                    
        except Exception as e:
            logger.error(f"[AlertService] Telegram error: {e}")
            return False
    
    def get_history(self, limit: int = 50, from_db: bool = True) -> List[Dict[str, Any]]:
        """獲取告警歷史"""
        if not from_db:
            return self._alert_history[-limit:][::-1]
        
        try:
            conn = sqlite3.connect(self._db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM alert_history 
                ORDER BY sent_at DESC 
                LIMIT ?
            ''', (limit,))
            
            history = []
            for row in cursor.fetchall():
                history.append({
                    "id": row['id'],
                    "type": row['alert_type'],
                    "level": row['level'],
                    "message": row['message'],
                    "suggestion": row['suggestion'],
                    "details": json.loads(row['details']) if row['details'] else {},
                    "channels": json.loads(row['channels']) if row['channels'] else {},
                    "sent_at": row['sent_at']
                })
            
            conn.close()
            return history
        except Exception as e:
            logger.error(f"[AlertService] Failed to get history from DB: {e}")
            return self._alert_history[-limit:][::-1]
    
    def test_channels(self) -> Dict[str, bool]:
        """測試各渠道配置"""
        return {
            "webhook": bool(self._config.webhook_url),
            "email": bool(self._config.email_enabled and self._config.email_smtp_host and self._config.email_to),
            "telegram": bool(self._config.telegram_bot_token and self._config.telegram_chat_id)
        }


# 單例獲取
_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    """獲取告警服務實例"""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service


async def check_and_send_capacity_alerts():
    """
    檢查容量並發送告警（定時任務調用）
    """
    try:
        from .api_pool import get_api_pool_manager
        
        pool = get_api_pool_manager()
        alerts_data = pool.check_capacity_alerts()
        
        if alerts_data['alert_level'] in ('warning', 'critical'):
            service = get_alert_service()
            
            for alert in alerts_data['alerts']:
                await service.send_alert(
                    alert_type=alert['type'],
                    message=alert['message'],
                    level=AlertLevel.CRITICAL if alert['level'] == 'critical' else AlertLevel.WARNING,
                    suggestion=alert['suggestion'],
                    details=alerts_data['stats']
                )
        
        return alerts_data
    except Exception as e:
        logger.error(f"[AlertService] Error checking capacity alerts: {e}")
        return None
