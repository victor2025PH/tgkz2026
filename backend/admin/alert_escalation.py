"""
告警升級路徑系統

功能：
- 多級告警升級
- 值班表管理
- 升級規則配置
- 自動升級和手動確認
- 通知渠道升級
"""

import asyncio
import logging
import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'alert_escalation.db')


class EscalationLevel(str, Enum):
    """升級等級"""
    L1 = "L1"   # 一線：郵件/Webhook
    L2 = "L2"   # 二線：SMS/Telegram
    L3 = "L3"   # 三線：電話/緊急
    L4 = "L4"   # 四線：高管/全員


class AlertStatus(str, Enum):
    """告警狀態"""
    OPEN = "open"                 # 開啟
    ACKNOWLEDGED = "acknowledged" # 已確認
    ESCALATED = "escalated"       # 已升級
    RESOLVED = "resolved"         # 已解決
    CLOSED = "closed"             # 已關閉


class NotificationChannel(str, Enum):
    """通知渠道"""
    EMAIL = "email"
    WEBHOOK = "webhook"
    TELEGRAM = "telegram"
    SMS = "sms"
    PHONE_CALL = "phone_call"


@dataclass
class OnCallSchedule:
    """值班表"""
    id: str
    name: str
    team: str = ""
    escalation_level: str = "L1"
    members: List[Dict] = field(default_factory=list)  # [{user_id, name, contact, priority}]
    schedule_type: str = "weekly"  # weekly/daily/custom
    schedule_config: Dict = field(default_factory=dict)  # 具體排班配置
    is_active: bool = True
    created_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "team": self.team,
            "escalation_level": self.escalation_level,
            "members": self.members,
            "schedule_type": self.schedule_type,
            "schedule_config": self.schedule_config,
            "is_active": self.is_active,
            "created_at": self.created_at
        }


@dataclass
class EscalationPolicy:
    """升級策略"""
    id: str
    name: str
    description: str = ""
    levels: List[Dict] = field(default_factory=list)  # 各級配置
    is_default: bool = False
    is_active: bool = True
    created_at: str = ""
    
    # 每級配置示例：
    # {
    #   "level": "L1",
    #   "wait_minutes": 15,           # 等待多久升級
    #   "channels": ["email", "webhook"],
    #   "schedule_id": "xxx",         # 值班表 ID
    #   "notify_all": false           # 是否通知所有人
    # }
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "levels": self.levels,
            "is_default": self.is_default,
            "is_active": self.is_active,
            "created_at": self.created_at
        }


@dataclass
class EscalationAlert:
    """升級告警"""
    id: str
    original_alert_id: str
    title: str
    message: str
    severity: str = "warning"
    current_level: str = "L1"
    status: AlertStatus = AlertStatus.OPEN
    policy_id: str = ""
    created_at: str = ""
    escalated_at: str = ""
    acknowledged_by: str = ""
    acknowledged_at: str = ""
    resolved_at: str = ""
    escalation_history: List[Dict] = field(default_factory=list)
    metadata: Dict = field(default_factory=dict)


class AlertEscalationManager:
    """告警升級管理器"""
    
    _instance = None
    
    # 默認升級策略
    DEFAULT_POLICY = {
        "levels": [
            {"level": "L1", "wait_minutes": 15, "channels": ["email", "webhook"]},
            {"level": "L2", "wait_minutes": 30, "channels": ["telegram", "sms"]},
            {"level": "L3", "wait_minutes": 60, "channels": ["phone_call"]},
            {"level": "L4", "wait_minutes": 120, "channels": ["phone_call"], "notify_all": True}
        ]
    }
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._init_db()
        self._notification_handlers: Dict[str, Callable] = {}
        self._running = False
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 值班表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS on_call_schedules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                team TEXT DEFAULT '',
                escalation_level TEXT DEFAULT 'L1',
                members TEXT DEFAULT '[]',
                schedule_type TEXT DEFAULT 'weekly',
                schedule_config TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        ''')
        
        # 升級策略
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS escalation_policies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                levels TEXT DEFAULT '[]',
                is_default INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        ''')
        
        # 升級告警
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS escalation_alerts (
                id TEXT PRIMARY KEY,
                original_alert_id TEXT,
                title TEXT NOT NULL,
                message TEXT DEFAULT '',
                severity TEXT DEFAULT 'warning',
                current_level TEXT DEFAULT 'L1',
                status TEXT DEFAULT 'open',
                policy_id TEXT,
                created_at TEXT,
                escalated_at TEXT,
                acknowledged_by TEXT,
                acknowledged_at TEXT,
                resolved_at TEXT,
                escalation_history TEXT DEFAULT '[]',
                metadata TEXT DEFAULT '{}'
            )
        ''')
        
        # 通知記錄
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notification_logs (
                id TEXT PRIMARY KEY,
                alert_id TEXT,
                level TEXT,
                channel TEXT,
                recipient TEXT,
                status TEXT DEFAULT 'pending',
                sent_at TEXT,
                delivered_at TEXT,
                error_message TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_status ON escalation_alerts(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_level ON escalation_alerts(current_level)')
        
        # 創建默認策略
        cursor.execute('SELECT COUNT(*) FROM escalation_policies WHERE is_default = 1')
        if cursor.fetchone()[0] == 0:
            import uuid
            cursor.execute('''
                INSERT INTO escalation_policies 
                (id, name, description, levels, is_default, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()), '默認升級策略', '系統默認的告警升級策略',
                json.dumps(self.DEFAULT_POLICY['levels']), 1, 1, datetime.now().isoformat()
            ))
        
        conn.commit()
        conn.close()
        logger.info("告警升級數據庫已初始化")
    
    # ==================== 值班表管理 ====================
    
    def create_schedule(self, schedule: OnCallSchedule) -> bool:
        """創建值班表"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO on_call_schedules 
                (id, name, team, escalation_level, members, schedule_type, schedule_config, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                schedule.id, schedule.name, schedule.team, schedule.escalation_level,
                json.dumps(schedule.members), schedule.schedule_type,
                json.dumps(schedule.schedule_config), 1 if schedule.is_active else 0,
                schedule.created_at or datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"創建值班表失敗: {e}")
            return False
    
    def list_schedules(self, level: Optional[str] = None) -> List[Dict]:
        """列出值班表"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if level:
            cursor.execute('SELECT * FROM on_call_schedules WHERE escalation_level = ?', (level,))
        else:
            cursor.execute('SELECT * FROM on_call_schedules')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "team": row[2],
            "escalation_level": row[3],
            "members": json.loads(row[4]) if row[4] else [],
            "schedule_type": row[5],
            "schedule_config": json.loads(row[6]) if row[6] else {},
            "is_active": bool(row[7]),
            "created_at": row[8]
        } for row in rows]
    
    def get_current_on_call(self, level: str = "L1") -> List[Dict]:
        """獲取當前值班人員"""
        schedules = self.list_schedules(level)
        on_call = []
        
        now = datetime.now()
        weekday = now.weekday()
        hour = now.hour
        
        for schedule in schedules:
            if not schedule['is_active']:
                continue
            
            members = schedule['members']
            config = schedule['schedule_config']
            
            if schedule['schedule_type'] == 'weekly':
                # 週輪值
                week_number = now.isocalendar()[1]
                if members:
                    index = week_number % len(members)
                    on_call.append(members[index])
                    
            elif schedule['schedule_type'] == 'daily':
                # 日輪值
                day_of_year = now.timetuple().tm_yday
                if members:
                    index = day_of_year % len(members)
                    on_call.append(members[index])
                    
            elif schedule['schedule_type'] == 'shift':
                # 班次制
                shifts = config.get('shifts', [])
                for shift in shifts:
                    if shift.get('start_hour', 0) <= hour < shift.get('end_hour', 24):
                        if shift.get('weekdays', []) and weekday in shift['weekdays']:
                            member_id = shift.get('member_id')
                            member = next((m for m in members if m.get('user_id') == member_id), None)
                            if member:
                                on_call.append(member)
            else:
                # 默認：所有成員
                on_call.extend(members)
        
        return on_call
    
    # ==================== 升級策略管理 ====================
    
    def create_policy(self, policy: EscalationPolicy) -> bool:
        """創建升級策略"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO escalation_policies 
                (id, name, description, levels, is_default, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                policy.id, policy.name, policy.description,
                json.dumps(policy.levels), 1 if policy.is_default else 0,
                1 if policy.is_active else 0, policy.created_at or datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"創建策略失敗: {e}")
            return False
    
    def list_policies(self) -> List[Dict]:
        """列出升級策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM escalation_policies ORDER BY is_default DESC')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "levels": json.loads(row[3]) if row[3] else [],
            "is_default": bool(row[4]),
            "is_active": bool(row[5]),
            "created_at": row[6]
        } for row in rows]
    
    def get_policy(self, policy_id: str) -> Optional[Dict]:
        """獲取策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM escalation_policies WHERE id = ?', (policy_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "levels": json.loads(row[3]) if row[3] else [],
                "is_default": bool(row[4]),
                "is_active": bool(row[5]),
                "created_at": row[6]
            }
        return None
    
    def get_default_policy(self) -> Optional[Dict]:
        """獲取默認策略"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM escalation_policies WHERE is_default = 1 LIMIT 1')
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "name": row[1],
                "description": row[2],
                "levels": json.loads(row[3]) if row[3] else [],
                "is_default": bool(row[4]),
                "is_active": bool(row[5]),
                "created_at": row[6]
            }
        return None
    
    # ==================== 告警升級 ====================
    
    async def create_alert(
        self,
        title: str,
        message: str,
        severity: str = "warning",
        original_alert_id: str = "",
        policy_id: str = "",
        metadata: Dict = None
    ) -> str:
        """創建升級告警"""
        import uuid
        alert_id = str(uuid.uuid4())
        
        # 獲取策略
        if policy_id:
            policy = self.get_policy(policy_id)
        else:
            policy = self.get_default_policy()
        
        if not policy:
            logger.error("沒有可用的升級策略")
            return ""
        
        now = datetime.now().isoformat()
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO escalation_alerts 
            (id, original_alert_id, title, message, severity, current_level, status,
             policy_id, created_at, escalation_history, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            alert_id, original_alert_id, title, message, severity, "L1", "open",
            policy['id'], now, json.dumps([{"level": "L1", "time": now, "action": "created"}]),
            json.dumps(metadata or {})
        ))
        
        conn.commit()
        conn.close()
        
        # 發送 L1 通知
        await self._send_notifications(alert_id, "L1", policy)
        
        logger.info(f"創建升級告警: {alert_id}, 標題: {title}")
        return alert_id
    
    async def escalate_alert(self, alert_id: str, reason: str = "") -> Tuple[bool, str]:
        """手動升級告警"""
        alert = self._get_alert(alert_id)
        if not alert:
            return False, "告警不存在"
        
        if alert['status'] in ('resolved', 'closed'):
            return False, "告警已關閉"
        
        # 獲取策略
        policy = self.get_policy(alert['policy_id'])
        if not policy:
            return False, "策略不存在"
        
        # 確定下一級
        current_level = alert['current_level']
        levels = policy['levels']
        current_index = next((i for i, l in enumerate(levels) if l['level'] == current_level), -1)
        
        if current_index < 0 or current_index >= len(levels) - 1:
            return False, "已達最高級別"
        
        next_level = levels[current_index + 1]['level']
        
        # 更新告警
        history = alert['escalation_history']
        history.append({
            "level": next_level,
            "time": datetime.now().isoformat(),
            "action": "escalated",
            "reason": reason
        })
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE escalation_alerts 
            SET current_level = ?, status = 'escalated', escalated_at = ?, escalation_history = ?
            WHERE id = ?
        ''', (next_level, datetime.now().isoformat(), json.dumps(history), alert_id))
        conn.commit()
        conn.close()
        
        # 發送通知
        await self._send_notifications(alert_id, next_level, policy)
        
        return True, f"已升級到 {next_level}"
    
    async def acknowledge_alert(self, alert_id: str, user_id: str) -> Tuple[bool, str]:
        """確認告警"""
        alert = self._get_alert(alert_id)
        if not alert:
            return False, "告警不存在"
        
        history = alert['escalation_history']
        history.append({
            "level": alert['current_level'],
            "time": datetime.now().isoformat(),
            "action": "acknowledged",
            "user_id": user_id
        })
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE escalation_alerts 
            SET status = 'acknowledged', acknowledged_by = ?, acknowledged_at = ?, escalation_history = ?
            WHERE id = ?
        ''', (user_id, datetime.now().isoformat(), json.dumps(history), alert_id))
        conn.commit()
        conn.close()
        
        return True, "告警已確認"
    
    async def resolve_alert(self, alert_id: str, user_id: str, resolution: str = "") -> Tuple[bool, str]:
        """解決告警"""
        alert = self._get_alert(alert_id)
        if not alert:
            return False, "告警不存在"
        
        history = alert['escalation_history']
        history.append({
            "level": alert['current_level'],
            "time": datetime.now().isoformat(),
            "action": "resolved",
            "user_id": user_id,
            "resolution": resolution
        })
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE escalation_alerts 
            SET status = 'resolved', resolved_at = ?, escalation_history = ?
            WHERE id = ?
        ''', (datetime.now().isoformat(), json.dumps(history), alert_id))
        conn.commit()
        conn.close()
        
        return True, "告警已解決"
    
    def _get_alert(self, alert_id: str) -> Optional[Dict]:
        """獲取告警"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM escalation_alerts WHERE id = ?', (alert_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row[0],
                "original_alert_id": row[1],
                "title": row[2],
                "message": row[3],
                "severity": row[4],
                "current_level": row[5],
                "status": row[6],
                "policy_id": row[7],
                "created_at": row[8],
                "escalated_at": row[9],
                "acknowledged_by": row[10],
                "acknowledged_at": row[11],
                "resolved_at": row[12],
                "escalation_history": json.loads(row[13]) if row[13] else [],
                "metadata": json.loads(row[14]) if row[14] else {}
            }
        return None
    
    def list_alerts(
        self,
        status: Optional[str] = None,
        level: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """列出告警"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM escalation_alerts WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        if level:
            query += ' AND current_level = ?'
            params.append(level)
        
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "original_alert_id": row[1],
            "title": row[2],
            "message": row[3],
            "severity": row[4],
            "current_level": row[5],
            "status": row[6],
            "policy_id": row[7],
            "created_at": row[8],
            "escalated_at": row[9],
            "acknowledged_by": row[10],
            "acknowledged_at": row[11],
            "resolved_at": row[12]
        } for row in rows]
    
    # ==================== 通知發送 ====================
    
    async def _send_notifications(self, alert_id: str, level: str, policy: Dict):
        """發送通知"""
        alert = self._get_alert(alert_id)
        if not alert:
            return
        
        # 獲取該級別的配置
        level_config = next((l for l in policy['levels'] if l['level'] == level), None)
        if not level_config:
            return
        
        channels = level_config.get('channels', ['email'])
        notify_all = level_config.get('notify_all', False)
        
        # 獲取值班人員
        on_call = self.get_current_on_call(level)
        
        if notify_all:
            recipients = on_call
        else:
            # 只通知優先級最高的
            recipients = sorted(on_call, key=lambda x: x.get('priority', 0), reverse=True)[:1]
        
        for recipient in recipients:
            for channel in channels:
                await self._send_notification(
                    alert_id=alert_id,
                    level=level,
                    channel=channel,
                    recipient=recipient,
                    alert=alert
                )
    
    async def _send_notification(
        self,
        alert_id: str,
        level: str,
        channel: str,
        recipient: Dict,
        alert: Dict
    ):
        """發送單條通知"""
        import uuid
        notification_id = str(uuid.uuid4())
        
        try:
            # 根據渠道調用對應的發送器
            handler = self._notification_handlers.get(channel)
            
            if handler:
                await handler(
                    recipient=recipient,
                    title=alert['title'],
                    message=alert['message'],
                    severity=alert['severity'],
                    level=level
                )
                status = "delivered"
                error = ""
            else:
                # 如果沒有處理器，記錄為待處理
                status = "pending"
                error = f"未配置 {channel} 通知處理器"
                logger.warning(error)
            
            # 記錄通知
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO notification_logs 
                (id, alert_id, level, channel, recipient, status, sent_at, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                notification_id, alert_id, level, channel,
                json.dumps(recipient), status, datetime.now().isoformat(), error
            ))
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"發送通知失敗: {e}")
    
    def register_notification_handler(self, channel: str, handler: Callable):
        """註冊通知處理器"""
        self._notification_handlers[channel] = handler
        logger.info(f"註冊通知處理器: {channel}")
    
    # ==================== 自動升級檢查 ====================
    
    async def check_and_escalate(self):
        """檢查並自動升級超時的告警"""
        # 獲取所有未解決的告警
        alerts = self.list_alerts(status='open')
        alerts.extend(self.list_alerts(status='escalated'))
        
        escalated_count = 0
        
        for alert in alerts:
            policy = self.get_policy(alert['policy_id'])
            if not policy:
                continue
            
            # 獲取當前級別配置
            levels = policy['levels']
            current_level = alert['current_level']
            current_config = next((l for l in levels if l['level'] == current_level), None)
            
            if not current_config:
                continue
            
            # 檢查是否超時
            wait_minutes = current_config.get('wait_minutes', 15)
            created = datetime.fromisoformat(alert['created_at'])
            elapsed = (datetime.now() - created).total_seconds() / 60
            
            if elapsed >= wait_minutes:
                success, _ = await self.escalate_alert(
                    alert['id'],
                    reason=f"自動升級：超過 {wait_minutes} 分鐘未處理"
                )
                if success:
                    escalated_count += 1
        
        return escalated_count
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 按狀態統計
        cursor.execute('''
            SELECT status, COUNT(*) FROM escalation_alerts GROUP BY status
        ''')
        by_status = dict(cursor.fetchall())
        
        # 按級別統計
        cursor.execute('''
            SELECT current_level, COUNT(*) FROM escalation_alerts 
            WHERE status IN ('open', 'escalated', 'acknowledged')
            GROUP BY current_level
        ''')
        by_level = dict(cursor.fetchall())
        
        # 最近 24 小時
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        cursor.execute('''
            SELECT COUNT(*) FROM escalation_alerts WHERE created_at > ?
        ''', (yesterday,))
        recent_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "by_status": by_status,
            "by_level": by_level,
            "active_alerts": by_status.get('open', 0) + by_status.get('escalated', 0),
            "last_24h": recent_count
        }


# 獲取單例
def get_escalation_manager() -> AlertEscalationManager:
    return AlertEscalationManager()
