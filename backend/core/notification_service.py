"""
通知中心系統

功能：
1. 多渠道通知（應用內、郵件、推送）
2. 通知模板管理
3. 通知偏好設置
4. 通知歷史記錄
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import json

logger = logging.getLogger(__name__)


# ==================== 枚舉定義 ====================

class NotificationType(str, Enum):
    SYSTEM = 'system'               # 系統通知
    BILLING = 'billing'             # 計費通知
    SUBSCRIPTION = 'subscription'   # 訂閱通知
    QUOTA = 'quota'                 # 配額通知
    PROMOTION = 'promotion'         # 促銷通知
    SECURITY = 'security'           # 安全通知
    REFERRAL = 'referral'           # 推薦通知
    UPDATE = 'update'               # 更新通知


class NotificationChannel(str, Enum):
    IN_APP = 'in_app'               # 應用內
    EMAIL = 'email'                 # 郵件
    PUSH = 'push'                   # 推送
    SMS = 'sms'                     # 短信


class NotificationPriority(str, Enum):
    LOW = 'low'
    NORMAL = 'normal'
    HIGH = 'high'
    URGENT = 'urgent'


# ==================== 數據模型 ====================

@dataclass
class Notification:
    """通知"""
    id: str
    user_id: str
    type: NotificationType
    title: str
    content: str
    
    priority: NotificationPriority = NotificationPriority.NORMAL
    channels: List[NotificationChannel] = field(default_factory=lambda: [NotificationChannel.IN_APP])
    
    # 狀態
    is_read: bool = False
    is_archived: bool = False
    
    # 關聯
    action_url: str = ''
    action_label: str = ''
    related_id: str = ''  # 關聯對象 ID
    
    # 元數據
    metadata: Dict = field(default_factory=dict)
    
    # 時間
    created_at: str = ''
    read_at: str = ''
    expires_at: str = ''
    
    def to_dict(self) -> dict:
        d = asdict(self)
        d['type'] = self.type.value
        d['priority'] = self.priority.value
        d['channels'] = [c.value if isinstance(c, NotificationChannel) else c for c in self.channels]
        return d


@dataclass
class NotificationPreference:
    """通知偏好設置"""
    user_id: str
    
    # 渠道開關
    email_enabled: bool = True
    push_enabled: bool = True
    sms_enabled: bool = False
    
    # 類型開關
    system_enabled: bool = True
    billing_enabled: bool = True
    subscription_enabled: bool = True
    quota_enabled: bool = True
    promotion_enabled: bool = True
    security_enabled: bool = True
    referral_enabled: bool = True
    update_enabled: bool = True
    
    # 靜默時段
    quiet_hours_start: str = ''  # 例如 "22:00"
    quiet_hours_end: str = ''    # 例如 "08:00"
    
    def to_dict(self) -> dict:
        return asdict(self)


# ==================== 通知模板 ====================

NOTIFICATION_TEMPLATES = {
    # 訂閱相關
    'subscription_upgraded': {
        'type': NotificationType.SUBSCRIPTION,
        'title': '訂閱升級成功',
        'template': '您已成功升級到 {tier} 等級，新權益已生效。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    'subscription_expiring': {
        'type': NotificationType.SUBSCRIPTION,
        'title': '訂閱即將到期',
        'template': '您的 {tier} 訂閱將在 {days} 天後到期，請及時續費。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    'subscription_expired': {
        'type': NotificationType.SUBSCRIPTION,
        'title': '訂閱已過期',
        'template': '您的訂閱已過期，部分功能將受限。立即續費以恢復完整功能。',
        'priority': NotificationPriority.URGENT,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH]
    },
    
    # 計費相關
    'payment_success': {
        'type': NotificationType.BILLING,
        'title': '支付成功',
        'template': '您已成功支付 {amount}，訂單號：{order_id}',
        'priority': NotificationPriority.NORMAL,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    'payment_failed': {
        'type': NotificationType.BILLING,
        'title': '支付失敗',
        'template': '您的支付未能完成，請檢查支付方式或重試。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    'invoice_ready': {
        'type': NotificationType.BILLING,
        'title': '發票已生成',
        'template': '發票 {invoice_number} 已生成，可在賬單中心查看下載。',
        'priority': NotificationPriority.LOW,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    
    # 配額相關
    'quota_warning': {
        'type': NotificationType.QUOTA,
        'title': '配額使用提醒',
        'template': '您的 {quota_type} 配額已使用 {percent}%，請注意控制使用量。',
        'priority': NotificationPriority.NORMAL,
        'channels': [NotificationChannel.IN_APP]
    },
    'quota_exceeded': {
        'type': NotificationType.QUOTA,
        'title': '配額已用完',
        'template': '您的 {quota_type} 配額已用完。購買配額包或升級訂閱以繼續使用。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    
    # 推薦相關
    'referral_signup': {
        'type': NotificationType.REFERRAL,
        'title': '好友已註冊',
        'template': '您邀請的好友已完成註冊，待其完成首次購買後您將獲得獎勵。',
        'priority': NotificationPriority.NORMAL,
        'channels': [NotificationChannel.IN_APP]
    },
    'referral_reward': {
        'type': NotificationType.REFERRAL,
        'title': '獲得推薦獎勵',
        'template': '恭喜！您獲得了 {amount} 推薦獎勵，已添加到賬戶餘額。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    
    # 促銷相關
    'new_campaign': {
        'type': NotificationType.PROMOTION,
        'title': '新活動上線',
        'template': '{campaign_name} 活動開始啦！使用優惠碼 {coupon_code} 享受專屬優惠。',
        'priority': NotificationPriority.NORMAL,
        'channels': [NotificationChannel.IN_APP]
    },
    
    # 安全相關
    'new_login': {
        'type': NotificationType.SECURITY,
        'title': '新設備登入',
        'template': '您的帳戶在 {location} 的新設備上登入。如非本人操作，請立即修改密碼。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
    'password_changed': {
        'type': NotificationType.SECURITY,
        'title': '密碼已修改',
        'template': '您的帳戶密碼已成功修改。如非本人操作，請立即聯繫客服。',
        'priority': NotificationPriority.HIGH,
        'channels': [NotificationChannel.IN_APP, NotificationChannel.EMAIL]
    },
}


class NotificationService:
    """通知服務"""
    
    _instance: Optional['NotificationService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        self._init_db()
        self._initialized = True
        logger.info("NotificationService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 通知表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    type TEXT NOT NULL,
                    title TEXT,
                    content TEXT,
                    priority TEXT DEFAULT 'normal',
                    channels TEXT,
                    is_read INTEGER DEFAULT 0,
                    is_archived INTEGER DEFAULT 0,
                    action_url TEXT,
                    action_label TEXT,
                    related_id TEXT,
                    metadata TEXT,
                    created_at TEXT,
                    read_at TEXT,
                    expires_at TEXT
                )
            ''')
            
            # 通知偏好表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    user_id TEXT PRIMARY KEY,
                    email_enabled INTEGER DEFAULT 1,
                    push_enabled INTEGER DEFAULT 1,
                    sms_enabled INTEGER DEFAULT 0,
                    system_enabled INTEGER DEFAULT 1,
                    billing_enabled INTEGER DEFAULT 1,
                    subscription_enabled INTEGER DEFAULT 1,
                    quota_enabled INTEGER DEFAULT 1,
                    promotion_enabled INTEGER DEFAULT 1,
                    security_enabled INTEGER DEFAULT 1,
                    referral_enabled INTEGER DEFAULT 1,
                    update_enabled INTEGER DEFAULT 1,
                    quiet_hours_start TEXT,
                    quiet_hours_end TEXT,
                    updated_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init notification DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 通知發送 ====================
    
    async def send(
        self,
        user_id: str,
        template_key: str,
        params: Dict = None,
        **kwargs
    ) -> Optional[Notification]:
        """使用模板發送通知"""
        template = NOTIFICATION_TEMPLATES.get(template_key)
        if not template:
            logger.warning(f"Unknown notification template: {template_key}")
            return None
        
        params = params or {}
        
        # 渲染模板
        content = template['template'].format(**params) if params else template['template']
        
        return await self.send_custom(
            user_id=user_id,
            notification_type=template['type'],
            title=template['title'],
            content=content,
            priority=template.get('priority', NotificationPriority.NORMAL),
            channels=template.get('channels', [NotificationChannel.IN_APP]),
            **kwargs
        )
    
    async def send_custom(
        self,
        user_id: str,
        notification_type: NotificationType,
        title: str,
        content: str,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        channels: List[NotificationChannel] = None,
        action_url: str = '',
        action_label: str = '',
        related_id: str = '',
        metadata: Dict = None,
        expires_at: str = ''
    ) -> Optional[Notification]:
        """發送自定義通知"""
        try:
            # 檢查用戶偏好
            prefs = self.get_user_preferences(user_id)
            if not self._should_send(prefs, notification_type):
                logger.debug(f"Notification blocked by user preference: {user_id}")
                return None
            
            # 過濾渠道
            channels = channels or [NotificationChannel.IN_APP]
            channels = self._filter_channels(prefs, channels)
            
            if not channels:
                return None
            
            now = datetime.utcnow()
            notification_id = f"notif_{now.strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            
            notification = Notification(
                id=notification_id,
                user_id=user_id,
                type=notification_type,
                title=title,
                content=content,
                priority=priority,
                channels=channels,
                action_url=action_url,
                action_label=action_label,
                related_id=related_id,
                metadata=metadata or {},
                created_at=now.isoformat(),
                expires_at=expires_at
            )
            
            # 保存到數據庫
            db = self._get_db()
            db.execute('''
                INSERT INTO notifications 
                (id, user_id, type, title, content, priority, channels, action_url, 
                 action_label, related_id, metadata, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                notification.id, notification.user_id, notification.type.value,
                notification.title, notification.content, notification.priority.value,
                json.dumps([c.value for c in channels]),
                notification.action_url, notification.action_label,
                notification.related_id, json.dumps(notification.metadata),
                notification.created_at, notification.expires_at
            ))
            db.commit()
            db.close()
            
            # 通過各渠道發送
            await self._dispatch(notification)
            
            logger.info(f"Sent notification {notification_id} to user {user_id}")
            return notification
            
        except Exception as e:
            logger.error(f"Send notification error: {e}")
            return None
    
    async def _dispatch(self, notification: Notification):
        """分發通知到各渠道"""
        for channel in notification.channels:
            try:
                if channel == NotificationChannel.IN_APP:
                    await self._send_in_app(notification)
                elif channel == NotificationChannel.EMAIL:
                    await self._send_email(notification)
                elif channel == NotificationChannel.PUSH:
                    await self._send_push(notification)
            except Exception as e:
                logger.warning(f"Dispatch to {channel} error: {e}")
    
    async def _send_in_app(self, notification: Notification):
        """發送應用內通知"""
        try:
            from .realtime import notify_user
            notify_user(notification.user_id, 'notification', notification.to_dict())
        except:
            pass
    
    async def _send_email(self, notification: Notification):
        """發送郵件通知"""
        try:
            from .email_service import get_email_service
            email_service = get_email_service()
            
            # 獲取用戶郵箱
            db = self._get_db()
            user = db.execute('SELECT email FROM users WHERE id = ?', (notification.user_id,)).fetchone()
            db.close()
            
            if user and user['email']:
                await email_service.send_email(
                    to=user['email'],
                    subject=notification.title,
                    template='notification',
                    context={
                        'title': notification.title,
                        'content': notification.content,
                        'action_url': notification.action_url,
                        'action_label': notification.action_label
                    }
                )
        except Exception as e:
            logger.warning(f"Send email notification error: {e}")
    
    async def _send_push(self, notification: Notification):
        """發送推送通知（預留接口）"""
        # TODO: 實現 Web Push / Firebase
        pass
    
    def _should_send(self, prefs: NotificationPreference, ntype: NotificationType) -> bool:
        """檢查是否應該發送該類型通知"""
        type_map = {
            NotificationType.SYSTEM: prefs.system_enabled,
            NotificationType.BILLING: prefs.billing_enabled,
            NotificationType.SUBSCRIPTION: prefs.subscription_enabled,
            NotificationType.QUOTA: prefs.quota_enabled,
            NotificationType.PROMOTION: prefs.promotion_enabled,
            NotificationType.SECURITY: prefs.security_enabled,
            NotificationType.REFERRAL: prefs.referral_enabled,
            NotificationType.UPDATE: prefs.update_enabled,
        }
        return type_map.get(ntype, True)
    
    def _filter_channels(
        self,
        prefs: NotificationPreference,
        channels: List[NotificationChannel]
    ) -> List[NotificationChannel]:
        """根據偏好過濾渠道"""
        filtered = []
        for channel in channels:
            if channel == NotificationChannel.IN_APP:
                filtered.append(channel)
            elif channel == NotificationChannel.EMAIL and prefs.email_enabled:
                filtered.append(channel)
            elif channel == NotificationChannel.PUSH and prefs.push_enabled:
                filtered.append(channel)
            elif channel == NotificationChannel.SMS and prefs.sms_enabled:
                filtered.append(channel)
        return filtered
    
    # ==================== 通知查詢 ====================
    
    def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        notification_type: str = None,
        limit: int = 50
    ) -> List[Notification]:
        """獲取用戶通知列表"""
        try:
            db = self._get_db()
            
            query = 'SELECT * FROM notifications WHERE user_id = ? AND is_archived = 0'
            params = [user_id]
            
            if unread_only:
                query += ' AND is_read = 0'
            
            if notification_type:
                query += ' AND type = ?'
                params.append(notification_type)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = db.execute(query, params).fetchall()
            db.close()
            
            notifications = []
            for row in rows:
                notifications.append(Notification(
                    id=row['id'],
                    user_id=row['user_id'],
                    type=NotificationType(row['type']),
                    title=row['title'],
                    content=row['content'],
                    priority=NotificationPriority(row['priority']) if row['priority'] else NotificationPriority.NORMAL,
                    channels=[NotificationChannel(c) for c in json.loads(row['channels'])] if row['channels'] else [],
                    is_read=bool(row['is_read']),
                    is_archived=bool(row['is_archived']),
                    action_url=row['action_url'] or '',
                    action_label=row['action_label'] or '',
                    related_id=row['related_id'] or '',
                    metadata=json.loads(row['metadata']) if row['metadata'] else {},
                    created_at=row['created_at'] or '',
                    read_at=row['read_at'] or '',
                    expires_at=row['expires_at'] or ''
                ))
            
            return notifications
            
        except Exception as e:
            logger.error(f"Get user notifications error: {e}")
            return []
    
    def get_unread_count(self, user_id: str) -> int:
        """獲取未讀通知數量"""
        try:
            db = self._get_db()
            row = db.execute('''
                SELECT COUNT(*) as count FROM notifications 
                WHERE user_id = ? AND is_read = 0 AND is_archived = 0
            ''', (user_id,)).fetchone()
            db.close()
            return row['count'] if row else 0
        except:
            return 0
    
    def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """標記為已讀"""
        try:
            db = self._get_db()
            db.execute('''
                UPDATE notifications SET is_read = 1, read_at = ?
                WHERE id = ? AND user_id = ?
            ''', (datetime.utcnow().isoformat(), notification_id, user_id))
            db.commit()
            db.close()
            return True
        except:
            return False
    
    def mark_all_as_read(self, user_id: str) -> int:
        """標記所有為已讀"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            cursor = db.execute('''
                UPDATE notifications SET is_read = 1, read_at = ?
                WHERE user_id = ? AND is_read = 0
            ''', (now, user_id))
            count = cursor.rowcount
            db.commit()
            db.close()
            return count
        except:
            return 0
    
    def archive_notification(self, notification_id: str, user_id: str) -> bool:
        """歸檔通知"""
        try:
            db = self._get_db()
            db.execute('''
                UPDATE notifications SET is_archived = 1
                WHERE id = ? AND user_id = ?
            ''', (notification_id, user_id))
            db.commit()
            db.close()
            return True
        except:
            return False
    
    # ==================== 偏好設置 ====================
    
    def get_user_preferences(self, user_id: str) -> NotificationPreference:
        """獲取用戶通知偏好"""
        try:
            db = self._get_db()
            row = db.execute(
                'SELECT * FROM notification_preferences WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            db.close()
            
            if row:
                return NotificationPreference(
                    user_id=user_id,
                    email_enabled=bool(row['email_enabled']),
                    push_enabled=bool(row['push_enabled']),
                    sms_enabled=bool(row['sms_enabled']),
                    system_enabled=bool(row['system_enabled']),
                    billing_enabled=bool(row['billing_enabled']),
                    subscription_enabled=bool(row['subscription_enabled']),
                    quota_enabled=bool(row['quota_enabled']),
                    promotion_enabled=bool(row['promotion_enabled']),
                    security_enabled=bool(row['security_enabled']),
                    referral_enabled=bool(row['referral_enabled']),
                    update_enabled=bool(row['update_enabled']),
                    quiet_hours_start=row['quiet_hours_start'] or '',
                    quiet_hours_end=row['quiet_hours_end'] or ''
                )
            
            return NotificationPreference(user_id=user_id)
            
        except:
            return NotificationPreference(user_id=user_id)
    
    def update_user_preferences(self, user_id: str, prefs: Dict) -> bool:
        """更新用戶通知偏好"""
        try:
            db = self._get_db()
            now = datetime.utcnow().isoformat()
            
            # 構建更新字段
            fields = []
            values = []
            for key, value in prefs.items():
                if key in ['email_enabled', 'push_enabled', 'sms_enabled',
                          'system_enabled', 'billing_enabled', 'subscription_enabled',
                          'quota_enabled', 'promotion_enabled', 'security_enabled',
                          'referral_enabled', 'update_enabled']:
                    fields.append(f'{key} = ?')
                    values.append(1 if value else 0)
                elif key in ['quiet_hours_start', 'quiet_hours_end']:
                    fields.append(f'{key} = ?')
                    values.append(value)
            
            if not fields:
                db.close()
                return False
            
            fields.append('updated_at = ?')
            values.append(now)
            values.append(user_id)
            
            db.execute(f'''
                INSERT INTO notification_preferences (user_id, {', '.join(f.split(' = ')[0] for f in fields[:-1])}, updated_at)
                VALUES (?, {', '.join('?' * (len(values) - 1))})
                ON CONFLICT(user_id) DO UPDATE SET {', '.join(fields)}
            ''', [user_id] + values[:-1] + values)
            
            db.commit()
            db.close()
            return True
            
        except Exception as e:
            logger.error(f"Update preferences error: {e}")
            return False


# ==================== 單例訪問 ====================

_notification_service: Optional[NotificationService] = None


def get_notification_service() -> NotificationService:
    """獲取通知服務"""
    global _notification_service
    if _notification_service is None:
        _notification_service = NotificationService()
    return _notification_service
