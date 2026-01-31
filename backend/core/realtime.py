"""
實時通知服務

優化設計：
1. WebSocket 連接管理
2. 事件訂閱機制
3. 房間/頻道支持
4. 心跳和斷線重連
"""

import os
import json
import asyncio
import logging
import time
from typing import Optional, Dict, Set, Any, Callable, List
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum
import weakref

logger = logging.getLogger(__name__)


class EventType(str, Enum):
    """事件類型"""
    # 系統事件
    CONNECTED = 'connected'
    DISCONNECTED = 'disconnected'
    ERROR = 'error'
    
    # 帳號事件
    ACCOUNT_STATUS_CHANGED = 'account.status_changed'
    ACCOUNT_MESSAGE_RECEIVED = 'account.message_received'
    ACCOUNT_LOGIN_REQUIRED = 'account.login_required'
    
    # 監控事件
    MONITORING_ALERT = 'monitoring.alert'
    KEYWORD_MATCHED = 'monitoring.keyword_matched'
    
    # 使用量事件
    QUOTA_WARNING = 'usage.quota_warning'
    QUOTA_EXCEEDED = 'usage.quota_exceeded'
    
    # 訂閱事件
    SUBSCRIPTION_UPDATED = 'subscription.updated'
    PAYMENT_RECEIVED = 'subscription.payment_received'
    
    # 任務事件
    TASK_STARTED = 'task.started'
    TASK_PROGRESS = 'task.progress'
    TASK_COMPLETED = 'task.completed'
    TASK_FAILED = 'task.failed'


@dataclass
class Event:
    """事件數據"""
    type: str
    data: Dict = field(default_factory=dict)
    timestamp: str = ''
    target_user: str = ''  # 目標用戶，空表示廣播
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()
    
    def to_dict(self) -> dict:
        return {
            'type': self.type,
            'data': self.data,
            'timestamp': self.timestamp
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class Connection:
    """WebSocket 連接"""
    id: str
    user_id: str
    websocket: Any  # aiohttp WebSocket
    created_at: float = field(default_factory=time.time)
    last_ping: float = field(default_factory=time.time)
    subscriptions: Set[str] = field(default_factory=set)  # 訂閱的頻道
    
    async def send(self, event: Event) -> bool:
        """發送事件"""
        try:
            if self.websocket and not self.websocket.closed:
                await self.websocket.send_str(event.to_json())
                return True
        except Exception as e:
            logger.debug(f"Send to {self.id} failed: {e}")
        return False
    
    async def close(self):
        """關閉連接"""
        try:
            if self.websocket and not self.websocket.closed:
                await self.websocket.close()
        except Exception:
            pass


class RealtimeService:
    """實時通知服務"""
    
    _instance = None
    
    def __init__(self):
        # 連接管理
        self._connections: Dict[str, Connection] = {}  # conn_id -> Connection
        self._user_connections: Dict[str, Set[str]] = {}  # user_id -> {conn_ids}
        
        # 頻道訂閱
        self._channels: Dict[str, Set[str]] = {}  # channel -> {conn_ids}
        
        # 事件處理器
        self._handlers: Dict[str, List[Callable]] = {}
        
        # 心跳配置
        self._heartbeat_interval = 30  # 秒
        self._connection_timeout = 90  # 秒
        
        # 統計
        self._message_count = 0
        self._peak_connections = 0
        
        # 心跳任務
        self._heartbeat_task = None
        self._running = False
    
    @classmethod
    def get_instance(cls) -> 'RealtimeService':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    # ==================== 連接管理 ====================
    
    async def register(self, conn_id: str, user_id: str, websocket: Any) -> Connection:
        """註冊新連接"""
        conn = Connection(
            id=conn_id,
            user_id=user_id,
            websocket=websocket
        )
        
        self._connections[conn_id] = conn
        
        # 用戶連接映射
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        self._user_connections[user_id].add(conn_id)
        
        # 更新峰值
        current_count = len(self._connections)
        if current_count > self._peak_connections:
            self._peak_connections = current_count
        
        # 發送連接成功事件
        await conn.send(Event(
            type=EventType.CONNECTED,
            data={'connection_id': conn_id}
        ))
        
        logger.info(f"WebSocket registered: {conn_id} (user: {user_id}, total: {current_count})")
        return conn
    
    async def unregister(self, conn_id: str):
        """註銷連接"""
        conn = self._connections.pop(conn_id, None)
        if not conn:
            return
        
        # 從用戶連接中移除
        user_conns = self._user_connections.get(conn.user_id)
        if user_conns:
            user_conns.discard(conn_id)
            if not user_conns:
                del self._user_connections[conn.user_id]
        
        # 從所有頻道中移除
        for channel, conns in self._channels.items():
            conns.discard(conn_id)
        
        # 關閉連接
        await conn.close()
        
        logger.info(f"WebSocket unregistered: {conn_id} (remaining: {len(self._connections)})")
    
    def get_connection(self, conn_id: str) -> Optional[Connection]:
        """獲取連接"""
        return self._connections.get(conn_id)
    
    def get_user_connections(self, user_id: str) -> List[Connection]:
        """獲取用戶的所有連接"""
        conn_ids = self._user_connections.get(user_id, set())
        return [self._connections[cid] for cid in conn_ids if cid in self._connections]
    
    # ==================== 頻道訂閱 ====================
    
    def subscribe(self, conn_id: str, channel: str):
        """訂閱頻道"""
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(conn_id)
        
        conn = self._connections.get(conn_id)
        if conn:
            conn.subscriptions.add(channel)
    
    def unsubscribe(self, conn_id: str, channel: str):
        """取消訂閱"""
        if channel in self._channels:
            self._channels[channel].discard(conn_id)
        
        conn = self._connections.get(conn_id)
        if conn:
            conn.subscriptions.discard(channel)
    
    # ==================== 事件發送 ====================
    
    async def send_to_user(self, user_id: str, event: Event) -> int:
        """發送事件給指定用戶"""
        sent = 0
        for conn in self.get_user_connections(user_id):
            if await conn.send(event):
                sent += 1
        self._message_count += sent
        return sent
    
    async def send_to_connection(self, conn_id: str, event: Event) -> bool:
        """發送事件給指定連接"""
        conn = self._connections.get(conn_id)
        if conn and await conn.send(event):
            self._message_count += 1
            return True
        return False
    
    async def broadcast(self, event: Event, channel: str = None) -> int:
        """廣播事件"""
        sent = 0
        
        if channel:
            # 發送給頻道訂閱者
            conn_ids = self._channels.get(channel, set())
            for conn_id in list(conn_ids):
                conn = self._connections.get(conn_id)
                if conn and await conn.send(event):
                    sent += 1
        else:
            # 全局廣播
            for conn in list(self._connections.values()):
                if await conn.send(event):
                    sent += 1
        
        self._message_count += sent
        return sent
    
    async def emit(self, event_type: str, data: Dict = None, user_id: str = None, channel: str = None):
        """便捷方法：發送事件"""
        event = Event(type=event_type, data=data or {}, target_user=user_id)
        
        if user_id:
            return await self.send_to_user(user_id, event)
        elif channel:
            return await self.broadcast(event, channel)
        else:
            return await self.broadcast(event)
    
    # ==================== 事件處理 ====================
    
    def on(self, event_type: str, handler: Callable):
        """註冊事件處理器"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
    
    async def handle_message(self, conn_id: str, message: str):
        """處理客戶端消息"""
        try:
            data = json.loads(message)
            msg_type = data.get('type', '')
            payload = data.get('data', {})
            
            # 心跳
            if msg_type == 'ping':
                conn = self._connections.get(conn_id)
                if conn:
                    conn.last_ping = time.time()
                    await conn.send(Event(type='pong'))
                return
            
            # 訂閱
            if msg_type == 'subscribe':
                channel = payload.get('channel')
                if channel:
                    self.subscribe(conn_id, channel)
                return
            
            # 取消訂閱
            if msg_type == 'unsubscribe':
                channel = payload.get('channel')
                if channel:
                    self.unsubscribe(conn_id, channel)
                return
            
            # 調用處理器
            handlers = self._handlers.get(msg_type, [])
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(conn_id, payload)
                    else:
                        handler(conn_id, payload)
                except Exception as e:
                    logger.error(f"Handler error for {msg_type}: {e}")
                    
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from {conn_id}")
        except Exception as e:
            logger.error(f"Handle message error: {e}")
    
    # ==================== 心跳和清理 ====================
    
    async def start(self):
        """啟動服務"""
        if self._running:
            return
        
        self._running = True
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        logger.info("Realtime service started")
    
    async def stop(self):
        """停止服務"""
        self._running = False
        
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
        
        # 關閉所有連接
        for conn_id in list(self._connections.keys()):
            await self.unregister(conn_id)
        
        logger.info("Realtime service stopped")
    
    async def _heartbeat_loop(self):
        """心跳循環"""
        while self._running:
            try:
                now = time.time()
                timeout_conns = []
                
                for conn_id, conn in list(self._connections.items()):
                    # 檢查超時
                    if now - conn.last_ping > self._connection_timeout:
                        timeout_conns.append(conn_id)
                    else:
                        # 發送心跳
                        await conn.send(Event(type='ping'))
                
                # 清理超時連接
                for conn_id in timeout_conns:
                    logger.info(f"Connection timeout: {conn_id}")
                    await self.unregister(conn_id)
                
                await asyncio.sleep(self._heartbeat_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat loop error: {e}")
                await asyncio.sleep(5)
    
    # ==================== 統計 ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            'connections': len(self._connections),
            'users_online': len(self._user_connections),
            'channels': len(self._channels),
            'peak_connections': self._peak_connections,
            'messages_sent': self._message_count
        }


# ==================== 便捷函數 ====================

def get_realtime_service() -> RealtimeService:
    """獲取實時服務實例"""
    return RealtimeService.get_instance()


async def notify_user(user_id: str, event_type: str, data: Dict = None):
    """通知用戶"""
    service = get_realtime_service()
    await service.emit(event_type, data, user_id=user_id)


async def broadcast_event(event_type: str, data: Dict = None, channel: str = None):
    """廣播事件"""
    service = get_realtime_service()
    await service.emit(event_type, data, channel=channel)
