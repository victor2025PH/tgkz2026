"""
Webhook 事件訂閱系統

功能：
- 事件類型定義和管理
- Webhook 訂閱者管理
- 事件觸發和推送
- 重試機制和日誌記錄
"""

import asyncio
import aiohttp
import hashlib
import hmac
import json
import logging
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'webhooks.db')


class EventType(str, Enum):
    """事件類型"""
    # API 池事件
    API_ALLOCATED = "api.allocated"
    API_RELEASED = "api.released"
    API_FAILED = "api.failed"
    API_RECOVERED = "api.recovered"
    API_DISABLED = "api.disabled"
    API_ENABLED = "api.enabled"
    API_ADDED = "api.added"
    API_REMOVED = "api.removed"
    
    # 容量事件
    CAPACITY_WARNING = "capacity.warning"
    CAPACITY_CRITICAL = "capacity.critical"
    CAPACITY_RESTORED = "capacity.restored"
    
    # 系統事件
    SYSTEM_ALERT = "system.alert"
    SYSTEM_ERROR = "system.error"
    SYSTEM_BACKUP = "system.backup"
    
    # 租戶事件
    TENANT_QUOTA_WARNING = "tenant.quota_warning"
    TENANT_QUOTA_EXCEEDED = "tenant.quota_exceeded"


class DeliveryStatus(str, Enum):
    """推送狀態"""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class WebhookSubscriber:
    """Webhook 訂閱者"""
    id: str
    name: str
    url: str
    secret: str = ""
    events: List[str] = field(default_factory=list)  # 訂閱的事件類型
    is_active: bool = True
    created_at: str = ""
    headers: Dict[str, str] = field(default_factory=dict)  # 自定義請求頭
    retry_count: int = 3
    timeout: int = 30


@dataclass
class WebhookEvent:
    """Webhook 事件"""
    id: str
    event_type: str
    payload: Dict[str, Any]
    created_at: str
    subscriber_id: Optional[str] = None
    delivery_status: DeliveryStatus = DeliveryStatus.PENDING
    attempts: int = 0
    last_attempt_at: Optional[str] = None
    response_code: Optional[int] = None
    response_body: Optional[str] = None


class WebhookEventSystem:
    """Webhook 事件系統"""
    
    _instance = None
    
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
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._delivery_queue = asyncio.Queue()
        self._running = False
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 訂閱者表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS webhook_subscribers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                secret TEXT DEFAULT '',
                events TEXT DEFAULT '[]',
                is_active INTEGER DEFAULT 1,
                created_at TEXT,
                headers TEXT DEFAULT '{}',
                retry_count INTEGER DEFAULT 3,
                timeout INTEGER DEFAULT 30
            )
        ''')
        
        # 事件日誌表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS webhook_events (
                id TEXT PRIMARY KEY,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                created_at TEXT,
                subscriber_id TEXT,
                delivery_status TEXT DEFAULT 'pending',
                attempts INTEGER DEFAULT 0,
                last_attempt_at TEXT,
                response_code INTEGER,
                response_body TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON webhook_events(event_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_status ON webhook_events(delivery_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_subscriber ON webhook_events(subscriber_id)')
        
        conn.commit()
        conn.close()
        logger.info("Webhook 事件數據庫已初始化")
    
    # ==================== 訂閱者管理 ====================
    
    def add_subscriber(self, subscriber: WebhookSubscriber) -> bool:
        """添加訂閱者"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO webhook_subscribers 
                (id, name, url, secret, events, is_active, created_at, headers, retry_count, timeout)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                subscriber.id,
                subscriber.name,
                subscriber.url,
                subscriber.secret,
                json.dumps(subscriber.events),
                1 if subscriber.is_active else 0,
                subscriber.created_at or datetime.now().isoformat(),
                json.dumps(subscriber.headers),
                subscriber.retry_count,
                subscriber.timeout
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"添加 Webhook 訂閱者: {subscriber.name}")
            return True
        except Exception as e:
            logger.error(f"添加訂閱者失敗: {e}")
            return False
    
    def update_subscriber(self, subscriber_id: str, updates: Dict[str, Any]) -> bool:
        """更新訂閱者"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            set_clauses = []
            values = []
            
            for key, value in updates.items():
                if key in ('events', 'headers'):
                    value = json.dumps(value)
                elif key == 'is_active':
                    value = 1 if value else 0
                set_clauses.append(f"{key} = ?")
                values.append(value)
            
            values.append(subscriber_id)
            
            cursor.execute(f'''
                UPDATE webhook_subscribers 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            ''', values)
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"更新訂閱者失敗: {e}")
            return False
    
    def remove_subscriber(self, subscriber_id: str) -> bool:
        """刪除訂閱者"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM webhook_subscribers WHERE id = ?', (subscriber_id,))
            conn.commit()
            conn.close()
            logger.info(f"刪除 Webhook 訂閱者: {subscriber_id}")
            return True
        except Exception as e:
            logger.error(f"刪除訂閱者失敗: {e}")
            return False
    
    def get_subscriber(self, subscriber_id: str) -> Optional[WebhookSubscriber]:
        """獲取訂閱者"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM webhook_subscribers WHERE id = ?', (subscriber_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_subscriber(row)
        return None
    
    def list_subscribers(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """列出所有訂閱者"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if active_only:
            cursor.execute('SELECT * FROM webhook_subscribers WHERE is_active = 1')
        else:
            cursor.execute('SELECT * FROM webhook_subscribers')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._subscriber_to_dict(self._row_to_subscriber(row)) for row in rows]
    
    def _row_to_subscriber(self, row) -> WebhookSubscriber:
        return WebhookSubscriber(
            id=row[0],
            name=row[1],
            url=row[2],
            secret=row[3] or '',
            events=json.loads(row[4]) if row[4] else [],
            is_active=bool(row[5]),
            created_at=row[6] or '',
            headers=json.loads(row[7]) if row[7] else {},
            retry_count=row[8] or 3,
            timeout=row[9] or 30
        )
    
    def _subscriber_to_dict(self, sub: WebhookSubscriber) -> Dict[str, Any]:
        return {
            "id": sub.id,
            "name": sub.name,
            "url": sub.url,
            "secret": "***" if sub.secret else "",  # 隱藏密鑰
            "events": sub.events,
            "is_active": sub.is_active,
            "created_at": sub.created_at,
            "headers": sub.headers,
            "retry_count": sub.retry_count,
            "timeout": sub.timeout
        }
    
    # ==================== 事件觸發 ====================
    
    async def emit(self, event_type: EventType, payload: Dict[str, Any]) -> str:
        """
        觸發事件
        
        Args:
            event_type: 事件類型
            payload: 事件數據
            
        Returns:
            事件 ID
        """
        import uuid
        event_id = str(uuid.uuid4())
        
        event = WebhookEvent(
            id=event_id,
            event_type=event_type.value if isinstance(event_type, EventType) else event_type,
            payload=payload,
            created_at=datetime.now().isoformat()
        )
        
        # 記錄事件
        self._save_event(event)
        
        # 找到訂閱該事件的訂閱者
        subscribers = self._get_subscribers_for_event(event.event_type)
        
        # 異步推送給所有訂閱者
        for subscriber in subscribers:
            asyncio.create_task(self._deliver_event(event, subscriber))
        
        # 觸發內部處理器
        if event.event_type in self._event_handlers:
            for handler in self._event_handlers[event.event_type]:
                try:
                    await handler(event)
                except Exception as e:
                    logger.error(f"事件處理器錯誤: {e}")
        
        logger.info(f"事件已觸發: {event.event_type}, ID: {event_id}, 訂閱者數: {len(subscribers)}")
        return event_id
    
    def _get_subscribers_for_event(self, event_type: str) -> List[WebhookSubscriber]:
        """獲取訂閱特定事件的訂閱者"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM webhook_subscribers WHERE is_active = 1')
        rows = cursor.fetchall()
        conn.close()
        
        subscribers = []
        for row in rows:
            sub = self._row_to_subscriber(row)
            # 檢查是否訂閱了該事件（支持通配符）
            if '*' in sub.events or event_type in sub.events:
                subscribers.append(sub)
            else:
                # 檢查類別訂閱（如 api.* 匹配 api.allocated）
                event_category = event_type.split('.')[0] + '.*'
                if event_category in sub.events:
                    subscribers.append(sub)
        
        return subscribers
    
    async def _deliver_event(self, event: WebhookEvent, subscriber: WebhookSubscriber):
        """推送事件到訂閱者"""
        payload = {
            "event_id": event.id,
            "event_type": event.event_type,
            "timestamp": event.created_at,
            "data": event.payload
        }
        
        # 生成簽名
        signature = ""
        if subscriber.secret:
            signature = self._generate_signature(json.dumps(payload), subscriber.secret)
        
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Event": event.event_type,
            "X-Webhook-Signature": signature,
            "X-Webhook-Timestamp": event.created_at,
            **subscriber.headers
        }
        
        # 重試邏輯
        for attempt in range(subscriber.retry_count):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        subscriber.url,
                        json=payload,
                        headers=headers,
                        timeout=aiohttp.ClientTimeout(total=subscriber.timeout)
                    ) as response:
                        response_body = await response.text()
                        
                        # 更新事件狀態
                        self._update_event_delivery(
                            event.id,
                            subscriber.id,
                            DeliveryStatus.DELIVERED if response.status < 400 else DeliveryStatus.FAILED,
                            attempt + 1,
                            response.status,
                            response_body[:500]  # 只保存前 500 字符
                        )
                        
                        if response.status < 400:
                            logger.info(f"Webhook 推送成功: {subscriber.name}, 事件: {event.event_type}")
                            return
                        else:
                            logger.warning(f"Webhook 推送失敗 ({response.status}): {subscriber.name}")
                            
            except asyncio.TimeoutError:
                logger.warning(f"Webhook 推送超時: {subscriber.name}, 嘗試 {attempt + 1}/{subscriber.retry_count}")
            except Exception as e:
                logger.error(f"Webhook 推送錯誤: {subscriber.name}, {e}")
            
            # 等待重試
            if attempt < subscriber.retry_count - 1:
                await asyncio.sleep(2 ** attempt)  # 指數退避
        
        # 所有重試都失敗
        self._update_event_delivery(
            event.id,
            subscriber.id,
            DeliveryStatus.FAILED,
            subscriber.retry_count,
            None,
            "All retries exhausted"
        )
    
    def _generate_signature(self, payload: str, secret: str) -> str:
        """生成 HMAC 簽名"""
        return hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
    
    def _save_event(self, event: WebhookEvent):
        """保存事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO webhook_events 
            (id, event_type, payload, created_at, delivery_status)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            event.id,
            event.event_type,
            json.dumps(event.payload),
            event.created_at,
            event.delivery_status.value
        ))
        conn.commit()
        conn.close()
    
    def _update_event_delivery(
        self,
        event_id: str,
        subscriber_id: str,
        status: DeliveryStatus,
        attempts: int,
        response_code: Optional[int],
        response_body: Optional[str]
    ):
        """更新事件推送狀態"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE webhook_events 
            SET subscriber_id = ?,
                delivery_status = ?,
                attempts = ?,
                last_attempt_at = ?,
                response_code = ?,
                response_body = ?
            WHERE id = ?
        ''', (
            subscriber_id,
            status.value,
            attempts,
            datetime.now().isoformat(),
            response_code,
            response_body,
            event_id
        ))
        conn.commit()
        conn.close()
    
    # ==================== 事件查詢 ====================
    
    def get_event_history(
        self,
        event_type: Optional[str] = None,
        subscriber_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """獲取事件歷史"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM webhook_events WHERE 1=1'
        params = []
        
        if event_type:
            query += ' AND event_type = ?'
            params.append(event_type)
        
        if subscriber_id:
            query += ' AND subscriber_id = ?'
            params.append(subscriber_id)
        
        if status:
            query += ' AND delivery_status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "event_type": row[1],
            "payload": json.loads(row[2]) if row[2] else {},
            "created_at": row[3],
            "subscriber_id": row[4],
            "delivery_status": row[5],
            "attempts": row[6],
            "last_attempt_at": row[7],
            "response_code": row[8],
            "response_body": row[9]
        } for row in rows]
    
    def get_delivery_stats(self) -> Dict[str, Any]:
        """獲取推送統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 按狀態統計
        cursor.execute('''
            SELECT delivery_status, COUNT(*) 
            FROM webhook_events 
            GROUP BY delivery_status
        ''')
        status_counts = dict(cursor.fetchall())
        
        # 按事件類型統計
        cursor.execute('''
            SELECT event_type, COUNT(*) 
            FROM webhook_events 
            GROUP BY event_type
            ORDER BY COUNT(*) DESC
            LIMIT 10
        ''')
        type_counts = dict(cursor.fetchall())
        
        # 最近 24 小時統計
        yesterday = (datetime.now() - timedelta(days=1)).isoformat()
        cursor.execute('''
            SELECT COUNT(*) FROM webhook_events WHERE created_at > ?
        ''', (yesterday,))
        recent_count = cursor.fetchone()[0]
        
        cursor.execute('''
            SELECT COUNT(*) FROM webhook_events 
            WHERE created_at > ? AND delivery_status = 'failed'
        ''', (yesterday,))
        recent_failed = cursor.fetchone()[0]
        
        conn.close()
        
        total = sum(status_counts.values())
        delivered = status_counts.get('delivered', 0)
        
        return {
            "total_events": total,
            "by_status": status_counts,
            "by_type": type_counts,
            "success_rate": round(delivered / total * 100, 1) if total > 0 else 100,
            "last_24h": {
                "total": recent_count,
                "failed": recent_failed,
                "success_rate": round((recent_count - recent_failed) / recent_count * 100, 1) if recent_count > 0 else 100
            }
        }
    
    # ==================== 內部事件處理器 ====================
    
    def register_handler(self, event_type: str, handler: Callable):
        """註冊內部事件處理器"""
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)
    
    async def retry_failed_events(self, max_age_hours: int = 24):
        """重試失敗的事件"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cutoff = (datetime.now() - timedelta(hours=max_age_hours)).isoformat()
        cursor.execute('''
            SELECT * FROM webhook_events 
            WHERE delivery_status = 'failed' AND created_at > ?
        ''', (cutoff,))
        
        failed_events = cursor.fetchall()
        conn.close()
        
        retried = 0
        for row in failed_events:
            event = WebhookEvent(
                id=row[0],
                event_type=row[1],
                payload=json.loads(row[2]) if row[2] else {},
                created_at=row[3],
                subscriber_id=row[4]
            )
            
            if event.subscriber_id:
                subscriber = self.get_subscriber(event.subscriber_id)
                if subscriber and subscriber.is_active:
                    await self._deliver_event(event, subscriber)
                    retried += 1
        
        return retried


# 獲取單例
def get_webhook_system() -> WebhookEventSystem:
    return WebhookEventSystem()
