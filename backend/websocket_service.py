"""
WebSocket 實時推送服務
WebSocket Realtime Service

🆕 後端優化: WebSocket 實時推送

功能：
- 實時數據推送
- 訂閱管理
- 心跳檢測
- 連接管理
"""

import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import Dict, Set, Optional, Callable, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import logging

logger = logging.getLogger(__name__)


class SubscriptionType(str, Enum):
    """訂閱類型"""
    TASK_STATUS = "task:status"
    TASK_STATS = "task:stats"
    TASK_LOG = "task:log"
    MESSAGE_NEW = "message:new"
    MESSAGE_STATUS = "message:status"
    CONTACT_UPDATE = "contact:update"
    SYSTEM_STATUS = "system:status"


@dataclass
class Subscription:
    """訂閱"""
    id: str
    type: SubscriptionType
    filter: Optional[Dict[str, Any]] = None


@dataclass
class Connection:
    """連接"""
    id: str
    created_at: str
    last_heartbeat: str
    subscriptions: Dict[str, Subscription]


@dataclass
class RealtimeMessage:
    """實時消息"""
    type: str
    data: Any
    timestamp: str = None
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


class WebSocketService:
    """WebSocket 服務"""
    
    def __init__(self):
        self._connections: Dict[str, Connection] = {}
        self._type_subscriptions: Dict[SubscriptionType, Set[str]] = {
            t: set() for t in SubscriptionType
        }
        self._message_handler: Optional[Callable] = None
        self._lock = threading.Lock()
        self._heartbeat_interval = 30  # 秒
        self._connection_timeout = 90  # 秒
        
        # 啟動心跳檢測
        self._running = True
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        self._heartbeat_thread.start()
    
    def set_message_handler(self, handler: Callable[[str, Dict], None]):
        """設置消息處理器（用於發送到前端）"""
        self._message_handler = handler
    
    # ============ 連接管理 ============
    
    def connect(self, connection_id: str = None) -> str:
        """建立連接"""
        if not connection_id:
            connection_id = f"conn-{uuid.uuid4().hex[:12]}"
        
        now = datetime.now().isoformat()
        
        with self._lock:
            self._connections[connection_id] = Connection(
                id=connection_id,
                created_at=now,
                last_heartbeat=now,
                subscriptions={}
            )
        
        logger.info(f"WebSocket connected: {connection_id}")
        self._notify_state_change(connection_id, "connected")
        
        return connection_id
    
    def disconnect(self, connection_id: str):
        """斷開連接"""
        with self._lock:
            if connection_id in self._connections:
                conn = self._connections[connection_id]
                
                # 清理訂閱
                for sub_id, sub in conn.subscriptions.items():
                    if sub.type in self._type_subscriptions:
                        self._type_subscriptions[sub.type].discard(connection_id)
                
                del self._connections[connection_id]
                logger.info(f"WebSocket disconnected: {connection_id}")
        
        self._notify_state_change(connection_id, "disconnected")
    
    def heartbeat(self, connection_id: str) -> bool:
        """心跳"""
        with self._lock:
            if connection_id in self._connections:
                self._connections[connection_id].last_heartbeat = datetime.now().isoformat()
                return True
        return False
    
    def is_connected(self, connection_id: str) -> bool:
        """檢查連接狀態"""
        return connection_id in self._connections
    
    def get_connection_count(self) -> int:
        """獲取連接數"""
        return len(self._connections)
    
    # ============ 訂閱管理 ============
    
    def subscribe(
        self, 
        connection_id: str, 
        subscription_type: SubscriptionType,
        subscription_id: str = None,
        filter_: Dict[str, Any] = None
    ) -> Optional[str]:
        """訂閱"""
        with self._lock:
            if connection_id not in self._connections:
                return None
            
            if not subscription_id:
                subscription_id = f"sub-{uuid.uuid4().hex[:12]}"
            
            subscription = Subscription(
                id=subscription_id,
                type=subscription_type,
                filter=filter_
            )
            
            self._connections[connection_id].subscriptions[subscription_id] = subscription
            self._type_subscriptions[subscription_type].add(connection_id)
            
            logger.debug(f"Subscription added: {subscription_id} for {connection_id}")
            
            return subscription_id
    
    def unsubscribe(self, connection_id: str, subscription_id: str) -> bool:
        """取消訂閱"""
        with self._lock:
            if connection_id not in self._connections:
                return False
            
            conn = self._connections[connection_id]
            if subscription_id in conn.subscriptions:
                sub = conn.subscriptions[subscription_id]
                self._type_subscriptions[sub.type].discard(connection_id)
                del conn.subscriptions[subscription_id]
                return True
            
            return False
    
    def unsubscribe_all(self, connection_id: str):
        """取消所有訂閱"""
        with self._lock:
            if connection_id in self._connections:
                conn = self._connections[connection_id]
                for sub in conn.subscriptions.values():
                    self._type_subscriptions[sub.type].discard(connection_id)
                conn.subscriptions.clear()
    
    # ============ 消息推送 ============
    
    def publish(
        self, 
        subscription_type: SubscriptionType, 
        data: Any,
        filter_match: Dict[str, Any] = None
    ):
        """發佈消息到訂閱者"""
        message = RealtimeMessage(
            type=subscription_type.value,
            data=data
        )
        
        with self._lock:
            connection_ids = self._type_subscriptions.get(subscription_type, set()).copy()
        
        for connection_id in connection_ids:
            # 檢查過濾器
            if filter_match and not self._match_filter(connection_id, subscription_type, filter_match):
                continue
            
            self._send_to_connection(connection_id, message)
    
    def broadcast(self, data: Any, message_type: str = "broadcast"):
        """廣播消息到所有連接"""
        message = RealtimeMessage(type=message_type, data=data)
        
        with self._lock:
            connection_ids = list(self._connections.keys())
        
        for connection_id in connection_ids:
            self._send_to_connection(connection_id, message)
    
    def send_to(self, connection_id: str, data: Any, message_type: str = "message"):
        """發送消息到指定連接"""
        if connection_id not in self._connections:
            return
        
        message = RealtimeMessage(type=message_type, data=data)
        self._send_to_connection(connection_id, message)
    
    # ============ 便捷方法 ============
    
    def publish_task_status(self, task_id: str, status: str, task_data: Dict = None):
        """發佈任務狀態更新"""
        self.publish(
            SubscriptionType.TASK_STATUS,
            {"task_id": task_id, "status": status, "task": task_data},
            {"task_id": task_id}
        )
    
    def publish_task_stats(self, task_id: str, stats: Dict):
        """發佈任務統計更新"""
        self.publish(
            SubscriptionType.TASK_STATS,
            {"task_id": task_id, "stats": stats},
            {"task_id": task_id}
        )
    
    def publish_task_log(self, task_id: str, level: str, category: str, message: str, details: Any = None):
        """發佈任務日誌"""
        self.publish(
            SubscriptionType.TASK_LOG,
            {
                "task_id": task_id,
                "level": level,
                "category": category,
                "message": message,
                "details": details,
                "timestamp": datetime.now().isoformat()
            },
            {"task_id": task_id}
        )
    
    def publish_new_message(self, message_data: Dict):
        """發佈新消息通知"""
        self.publish(SubscriptionType.MESSAGE_NEW, message_data)
    
    def publish_system_status(self, status: Dict):
        """發佈系統狀態"""
        self.publish(SubscriptionType.SYSTEM_STATUS, status)
    
    # ============ 私有方法 ============
    
    def _send_to_connection(self, connection_id: str, message: RealtimeMessage):
        """發送消息到連接"""
        if self._message_handler:
            try:
                self._message_handler(connection_id, asdict(message))
            except Exception as e:
                logger.error(f"Failed to send message to {connection_id}: {e}")
    
    def _notify_state_change(self, connection_id: str, state: str):
        """通知狀態變化"""
        if self._message_handler:
            try:
                self._message_handler(connection_id, {
                    "type": "realtime:state",
                    "data": state,
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as e:
                logger.error(f"Failed to notify state change: {e}")
    
    def _match_filter(
        self, 
        connection_id: str, 
        subscription_type: SubscriptionType,
        filter_match: Dict[str, Any]
    ) -> bool:
        """檢查過濾器是否匹配"""
        with self._lock:
            if connection_id not in self._connections:
                return False
            
            conn = self._connections[connection_id]
            
            for sub in conn.subscriptions.values():
                if sub.type != subscription_type:
                    continue
                
                if not sub.filter:
                    return True
                
                # 檢查所有過濾條件
                match = True
                for key, value in sub.filter.items():
                    if key in filter_match and filter_match[key] != value:
                        match = False
                        break
                
                if match:
                    return True
            
            return False
    
    def _heartbeat_loop(self):
        """心跳檢測循環"""
        while self._running:
            time.sleep(self._heartbeat_interval)
            self._check_connections()
    
    def _check_connections(self):
        """檢查連接超時"""
        now = datetime.now()
        timeout_connections = []
        
        with self._lock:
            for conn_id, conn in self._connections.items():
                last_hb = datetime.fromisoformat(conn.last_heartbeat)
                if (now - last_hb).total_seconds() > self._connection_timeout:
                    timeout_connections.append(conn_id)
        
        for conn_id in timeout_connections:
            logger.warning(f"Connection timeout: {conn_id}")
            self.disconnect(conn_id)
    
    def shutdown(self):
        """關閉服務"""
        self._running = False
        
        with self._lock:
            for conn_id in list(self._connections.keys()):
                self.disconnect(conn_id)


# ============ 全局實例 ============
_ws_service: Optional[WebSocketService] = None


def get_websocket_service() -> WebSocketService:
    """獲取 WebSocket 服務實例"""
    global _ws_service
    if _ws_service is None:
        _ws_service = WebSocketService()
    return _ws_service


# ============ IPC 處理器 ============

def register_websocket_handlers(ipc_handler, electron_send: Callable):
    """註冊 WebSocket IPC 處理器"""
    ws = get_websocket_service()
    
    # 設置消息處理器
    def message_handler(connection_id: str, message: Dict):
        electron_send("realtime:data", {"connection_id": connection_id, **message})
    
    ws.set_message_handler(message_handler)
    
    @ipc_handler.handle("realtime:connect")
    async def handle_connect(data):
        connection_id = ws.connect(data.get("connection_id"))
        return {"success": True, "connection_id": connection_id}
    
    @ipc_handler.handle("realtime:disconnect")
    async def handle_disconnect(data):
        ws.disconnect(data.get("connection_id", "default"))
        return {"success": True}
    
    @ipc_handler.handle("realtime:subscribe")
    async def handle_subscribe(data):
        sub_type = SubscriptionType(data.get("type"))
        sub_id = ws.subscribe(
            data.get("connection_id", "default"),
            sub_type,
            data.get("id"),
            data.get("filter")
        )
        return {"success": sub_id is not None, "subscription_id": sub_id}
    
    @ipc_handler.handle("realtime:unsubscribe")
    async def handle_unsubscribe(data):
        success = ws.unsubscribe(
            data.get("connection_id", "default"),
            data.get("id")
        )
        return {"success": success}
    
    @ipc_handler.handle("realtime:heartbeat")
    async def handle_heartbeat(data):
        success = ws.heartbeat(data.get("connection_id", "default"))
        electron_send("realtime:heartbeat", {"success": success})
        return {"success": success}
    
    return ws
