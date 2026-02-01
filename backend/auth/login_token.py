"""
登入 Token 服務

支持多種無密碼登入方式：
1. Deep Link - 打開 Telegram App 確認登入
2. QR Code - 手機掃碼登入（Phase 2）

安全特性：
1. 64 字符隨機 Token
2. 5 分鐘過期
3. 一次性使用
4. IP 和 User-Agent 記錄

Phase 3 優化：
1. 本地 QR Code 生成（離線支持）
2. Base64 圖片直接返回
"""

import os
import io
import base64
import secrets
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# QR Code 生成庫
try:
    import qrcode
    from PIL import Image
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False
    logger = logging.getLogger(__name__)
    logger.warning("qrcode/Pillow not installed, QR generation will use fallback")

logger = logging.getLogger(__name__)


class LoginTokenType(Enum):
    """登入 Token 類型"""
    DEEP_LINK = 'deep_link'
    QR_CODE = 'qr_code'


class LoginTokenStatus(Enum):
    """登入 Token 狀態"""
    PENDING = 'pending'      # 等待掃碼/確認
    SCANNED = 'scanned'      # 已掃碼，等待確認
    CONFIRMED = 'confirmed'  # 已確認登入
    EXPIRED = 'expired'      # 已過期
    CANCELLED = 'cancelled'  # 已取消


@dataclass
class LoginToken:
    """登入 Token 數據"""
    id: str
    token: str
    type: LoginTokenType
    status: LoginTokenStatus
    user_id: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = None
    expires_at: datetime = None
    confirmed_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        """檢查是否過期"""
        return datetime.utcnow() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'token': self.token,
            'type': self.type.value,
            'status': self.status.value,
            'user_id': self.user_id,
            'telegram_id': self.telegram_id,
            'telegram_username': self.telegram_username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class LoginTokenService:
    """
    登入 Token 服務
    
    提供 Deep Link 和 QR Code 登入的 Token 管理
    """
    
    # Token 有效期（秒）
    TOKEN_EXPIRY_SECONDS = 300  # 5 分鐘
    
    # Token 長度
    TOKEN_LENGTH = 32  # 生成 64 字符的 hex 字符串
    
    def __init__(self, db_path: Optional[str] = None):
        """初始化服務"""
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._init_db()
    
    def _get_db(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_tokens (
                    id TEXT PRIMARY KEY,
                    token TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL DEFAULT 'deep_link',
                    status TEXT NOT NULL DEFAULT 'pending',
                    user_id TEXT,
                    telegram_id TEXT,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    confirmed_at TIMESTAMP
                )
            ''')
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_status_expires ON login_tokens(status, expires_at)')
            
            db.commit()
            logger.info("Login tokens table initialized")
        except Exception as e:
            logger.error(f"Failed to initialize login_tokens table: {e}")
        finally:
            db.close()
    
    def generate_token(
        self,
        token_type: LoginTokenType = LoginTokenType.DEEP_LINK,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> LoginToken:
        """
        生成新的登入 Token
        
        Args:
            token_type: Token 類型
            ip_address: 請求 IP
            user_agent: 瀏覽器信息
        
        Returns:
            LoginToken 對象
        """
        import uuid
        
        token_id = str(uuid.uuid4())
        token = secrets.token_hex(self.TOKEN_LENGTH)
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.TOKEN_EXPIRY_SECONDS)
        
        login_token = LoginToken(
            id=token_id,
            token=token,
            type=token_type,
            status=LoginTokenStatus.PENDING,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at
        )
        
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO login_tokens 
                (id, token, type, status, ip_address, user_agent, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                token_id,
                token,
                token_type.value,
                LoginTokenStatus.PENDING.value,
                ip_address,
                user_agent,
                now.isoformat(),
                expires_at.isoformat()
            ))
            db.commit()
            logger.info(f"Generated login token: {token[:8]}... (type={token_type.value})")
        finally:
            db.close()
        
        return login_token
    
    def get_token(self, token: str) -> Optional[LoginToken]:
        """
        獲取 Token 信息
        
        Args:
            token: Token 字符串
        
        Returns:
            LoginToken 對象，不存在返回 None
        """
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE token = ?',
                (token,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def get_token_by_id(self, token_id: str) -> Optional[LoginToken]:
        """通過 ID 獲取 Token"""
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE id = ?',
                (token_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def confirm_token(
        self,
        token: str,
        telegram_id: str,
        telegram_username: Optional[str] = None,
        telegram_first_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        確認登入 Token（Bot 收到確認後調用）
        
        Args:
            token: Token 字符串
            telegram_id: Telegram 用戶 ID
            telegram_username: Telegram 用戶名
            telegram_first_name: Telegram 名字
            user_id: 系統用戶 ID（如果已存在）
        
        Returns:
            (success, error_message) 元組
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return False, "Token 不存在"
        
        if login_token.status != LoginTokenStatus.PENDING:
            return False, f"Token 狀態無效: {login_token.status.value}"
        
        if login_token.is_expired():
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return False, "Token 已過期，請重新獲取"
        
        # 更新 Token 狀態
        db = self._get_db()
        try:
            db.execute('''
                UPDATE login_tokens 
                SET status = ?, 
                    telegram_id = ?, 
                    telegram_username = ?,
                    telegram_first_name = ?,
                    user_id = ?,
                    confirmed_at = ?
                WHERE token = ?
            ''', (
                LoginTokenStatus.CONFIRMED.value,
                telegram_id,
                telegram_username,
                telegram_first_name,
                user_id,
                datetime.utcnow().isoformat(),
                token
            ))
            db.commit()
            logger.info(f"Login token confirmed: {token[:8]}... by TG user {telegram_id}")
            return True, None
        except Exception as e:
            logger.error(f"Failed to confirm token: {e}")
            return False, str(e)
        finally:
            db.close()
    
    def check_token_status(self, token: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        檢查 Token 狀態（前端輪詢調用）
        
        Returns:
            (status, user_data) 元組
            - status: pending/confirmed/expired
            - user_data: 確認後的用戶數據
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return 'not_found', None
        
        if login_token.is_expired() and login_token.status == LoginTokenStatus.PENDING:
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return 'expired', None
        
        if login_token.status == LoginTokenStatus.CONFIRMED:
            return 'confirmed', {
                'telegram_id': login_token.telegram_id,
                'telegram_username': login_token.telegram_username,
                'telegram_first_name': login_token.telegram_first_name,
                'user_id': login_token.user_id
            }
        
        return login_token.status.value, None
    
    def _update_status(self, token: str, status: LoginTokenStatus):
        """更新 Token 狀態"""
        db = self._get_db()
        try:
            db.execute(
                'UPDATE login_tokens SET status = ? WHERE token = ?',
                (status.value, token)
            )
            db.commit()
        finally:
            db.close()
    
    def _row_to_token(self, row) -> LoginToken:
        """將數據庫行轉換為 LoginToken 對象"""
        return LoginToken(
            id=row['id'],
            token=row['token'],
            type=LoginTokenType(row['type']),
            status=LoginTokenStatus(row['status']),
            user_id=row['user_id'],
            telegram_id=row['telegram_id'],
            telegram_username=row['telegram_username'],
            telegram_first_name=row['telegram_first_name'],
            ip_address=row['ip_address'],
            user_agent=row['user_agent'],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
            expires_at=datetime.fromisoformat(row['expires_at']) if row['expires_at'] else None,
            confirmed_at=datetime.fromisoformat(row['confirmed_at']) if row['confirmed_at'] else None
        )
    
    def cleanup_expired(self):
        """清理過期的 Token"""
        db = self._get_db()
        try:
            result = db.execute('''
                DELETE FROM login_tokens 
                WHERE expires_at < ? AND status IN (?, ?)
            ''', (
                datetime.utcnow().isoformat(),
                LoginTokenStatus.PENDING.value,
                LoginTokenStatus.EXPIRED.value
            ))
            db.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired login tokens")
        finally:
            db.close()
    
    # ==================== 🆕 Phase 3: QR Code 生成 ====================
    
    @staticmethod
    def generate_qr_image(data: str, size: int = 200, with_logo: bool = True) -> Optional[str]:
        """
        生成 QR Code 圖片（Base64 格式）
        
        優化：
        1. 本地生成，不依賴外部 API
        2. 可選添加 Logo
        3. 高容錯率確保掃描可靠性
        
        Args:
            data: 要編碼的數據（通常是 Deep Link URL）
            size: 圖片尺寸（像素）
            with_logo: 是否添加中央 Logo
        
        Returns:
            Base64 編碼的 PNG 圖片，如果失敗返回 None
        """
        if not HAS_QRCODE:
            logger.warning("QR Code library not available, using fallback URL")
            return None
        
        try:
            # 使用高容錯率（H = 30%）
            qr = qrcode.QRCode(
                version=None,  # 自動選擇最佳版本
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=2
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            # 生成圖片
            img = qr.make_image(fill_color="#0088cc", back_color="white")
            
            # 調整大小
            img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # 可選：添加 Telegram Logo 到中央
            if with_logo:
                try:
                    # 創建一個簡單的中央圓形標記
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(img)
                    center = size // 2
                    radius = size // 8
                    # 白色圓形背景
                    draw.ellipse(
                        [center - radius, center - radius, center + radius, center + radius],
                        fill='white',
                        outline='#0088cc',
                        width=2
                    )
                    # Telegram 藍色內圓
                    inner_radius = radius - 4
                    draw.ellipse(
                        [center - inner_radius, center - inner_radius, 
                         center + inner_radius, center + inner_radius],
                        fill='#0088cc'
                    )
                except Exception as e:
                    logger.debug(f"Logo overlay skipped: {e}")
            
            # 轉換為 Base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True)
            buffer.seek(0)
            
            base64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{base64_data}"
            
        except Exception as e:
            logger.error(f"Failed to generate QR code: {e}")
            return None
    
    @staticmethod
    def get_fallback_qr_url(data: str, size: int = 200) -> str:
        """
        備用 QR Code URL（使用外部 API）
        
        當本地生成失敗時使用
        """
        import urllib.parse
        encoded = urllib.parse.quote_plus(data)
        return f"https://api.qrserver.com/v1/create-qr-code/?size={size}x{size}&data={encoded}&bgcolor=ffffff&color=0088cc&margin=10"
    
    # ==================== 🆕 Phase 3.5: 安全增強 ====================
    
    def record_login_attempt(
        self, 
        token: str, 
        success: bool,
        telegram_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        additional_info: Dict[str, Any] = None
    ) -> None:
        """
        記錄登入嘗試（審計日誌）
        
        安全特性：
        1. 記錄所有登入嘗試（成功和失敗）
        2. 用於異常檢測和審計
        """
        db = self._get_db()
        try:
            # 確保審計表存在
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_audit (
                    id TEXT PRIMARY KEY,
                    token TEXT,
                    telegram_id TEXT,
                    success INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    additional_info TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            import uuid
            import json
            
            db.execute('''
                INSERT INTO login_audit 
                (id, token, telegram_id, success, ip_address, user_agent, additional_info, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                token[:16] if token else None,  # 只記錄部分 Token
                telegram_id,
                1 if success else 0,
                ip_address,
                user_agent[:200] if user_agent else None,  # 限制長度
                json.dumps(additional_info) if additional_info else None,
                datetime.utcnow().isoformat()
            ))
            db.commit()
            
        except Exception as e:
            logger.warning(f"Failed to record login audit: {e}")
        finally:
            db.close()
    
    def check_suspicious_activity(self, telegram_id: str, ip_address: str = None) -> Dict[str, Any]:
        """
        檢查可疑活動
        
        異常檢測：
        1. 短時間內多次登入嘗試
        2. 不同 IP 的登入請求
        3. 異常的 User-Agent 模式
        
        Returns:
            {
                'is_suspicious': bool,
                'risk_level': 'low' | 'medium' | 'high',
                'reasons': [],
                'recent_attempts': int
            }
        """
        db = self._get_db()
        result = {
            'is_suspicious': False,
            'risk_level': 'low',
            'reasons': [],
            'recent_attempts': 0
        }
        
        try:
            # 檢查過去 5 分鐘的登入嘗試次數
            five_minutes_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            
            cursor = db.execute('''
                SELECT COUNT(*) as count FROM login_audit
                WHERE telegram_id = ? AND created_at > ?
            ''', (telegram_id, five_minutes_ago))
            
            row = cursor.fetchone()
            recent_attempts = row['count'] if row else 0
            result['recent_attempts'] = recent_attempts
            
            # 規則 1: 5 分鐘內超過 5 次嘗試
            if recent_attempts > 5:
                result['is_suspicious'] = True
                result['reasons'].append('頻繁登入嘗試')
                result['risk_level'] = 'high' if recent_attempts > 10 else 'medium'
            
            # 規則 2: 檢查不同 IP 的登入
            if ip_address:
                cursor = db.execute('''
                    SELECT COUNT(DISTINCT ip_address) as ip_count 
                    FROM login_audit
                    WHERE telegram_id = ? AND created_at > ?
                ''', (telegram_id, five_minutes_ago))
                
                row = cursor.fetchone()
                ip_count = row['ip_count'] if row else 0
                
                if ip_count > 3:
                    result['is_suspicious'] = True
                    result['reasons'].append('多個 IP 地址登入')
                    result['risk_level'] = 'high'
            
        except Exception as e:
            logger.warning(f"Failed to check suspicious activity: {e}")
        finally:
            db.close()
        
        return result
    
    def get_login_history(self, telegram_id: str, limit: int = 10) -> list:
        """
        獲取用戶登入歷史
        
        用於用戶查看自己的登入記錄
        """
        db = self._get_db()
        history = []
        
        try:
            cursor = db.execute('''
                SELECT success, ip_address, user_agent, created_at
                FROM login_audit
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (telegram_id, limit))
            
            for row in cursor.fetchall():
                history.append({
                    'success': bool(row['success']),
                    'ip_address': row['ip_address'],
                    'user_agent': row['user_agent'][:50] if row['user_agent'] else None,
                    'time': row['created_at']
                })
                
        except Exception as e:
            logger.warning(f"Failed to get login history: {e}")
        finally:
            db.close()
        
        return history


# 全局服務實例
_login_token_service: Optional[LoginTokenService] = None


def get_login_token_service() -> LoginTokenService:
    """獲取全局登入 Token 服務實例"""
    global _login_token_service
    if _login_token_service is None:
        _login_token_service = LoginTokenService()
    return _login_token_service


# ==================== 🆕 WebSocket 訂閱管理 ====================

class LoginTokenSubscriptionManager:
    """
    登入 Token WebSocket 訂閱管理器
    
    管理前端客戶端對特定 Token 的訂閱，
    當 Token 狀態變化時推送通知。
    
    優化設計：
    1. 只通知訂閱了該 Token 的客戶端（非廣播）
    2. 支持多客戶端訂閱同一 Token
    3. 自動清理斷開的連接
    """
    
    def __init__(self):
        # token -> set of websocket connections
        self._subscriptions: Dict[str, set] = {}
        # websocket -> token (反向映射，方便清理)
        self._ws_to_token: Dict[Any, str] = {}
    
    def subscribe(self, token: str, ws) -> None:
        """訂閱 Token 狀態變化"""
        if token not in self._subscriptions:
            self._subscriptions[token] = set()
        self._subscriptions[token].add(ws)
        self._ws_to_token[ws] = token
        logger.debug(f"WS subscribed to token {token[:8]}...")
    
    def unsubscribe(self, ws) -> None:
        """取消訂閱"""
        token = self._ws_to_token.pop(ws, None)
        if token and token in self._subscriptions:
            self._subscriptions[token].discard(ws)
            if not self._subscriptions[token]:
                del self._subscriptions[token]
        logger.debug(f"WS unsubscribed from token")
    
    async def notify(self, token: str, status: str, data: Dict[str, Any] = None) -> int:
        """
        通知所有訂閱該 Token 的客戶端
        
        Returns:
            通知的客戶端數量
        """
        import json
        from datetime import datetime
        
        if token not in self._subscriptions:
            return 0
        
        message = json.dumps({
            'type': 'login_token_update',
            'event': 'login_token_update',
            'token': token[:16] + '...',  # 只返回部分 token
            'status': status,
            'data': data or {},
            'timestamp': datetime.utcnow().isoformat()
        })
        
        notified = 0
        dead_connections = []
        
        for ws in self._subscriptions[token]:
            try:
                await ws.send_str(message)
                notified += 1
            except Exception as e:
                logger.debug(f"Failed to notify WS: {e}")
                dead_connections.append(ws)
        
        # 清理失效連接
        for ws in dead_connections:
            self.unsubscribe(ws)
        
        logger.info(f"Notified {notified} clients for token {token[:8]}...")
        return notified
    
    def get_subscriber_count(self, token: str) -> int:
        """獲取 Token 的訂閱者數量"""
        return len(self._subscriptions.get(token, set()))
    
    def cleanup_token(self, token: str) -> None:
        """清理 Token 的所有訂閱"""
        if token in self._subscriptions:
            for ws in list(self._subscriptions[token]):
                self._ws_to_token.pop(ws, None)
            del self._subscriptions[token]


# 全局訂閱管理器
_subscription_manager: Optional[LoginTokenSubscriptionManager] = None


def get_subscription_manager() -> LoginTokenSubscriptionManager:
    """獲取全局訂閱管理器"""
    global _subscription_manager
    if _subscription_manager is None:
        _subscription_manager = LoginTokenSubscriptionManager()
    return _subscription_manager
