"""
TG-Matrix Event Bus
事件總線 - 實現模塊間解耦通訊

使用方式:
    from core import get_event_bus
    
    # 訂閱事件
    event_bus = get_event_bus()
    event_bus.subscribe('account.login.success', handle_login_success)
    
    # 發布事件
    await event_bus.publish('account.login.success', {'phone': '+1234567890'})
"""

import asyncio
from typing import Dict, Any, Callable, List, Optional, Awaitable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import sys


class EventPriority(Enum):
    """事件優先級"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class Event:
    """事件數據結構"""
    name: str
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.now)
    source: Optional[str] = None
    priority: EventPriority = EventPriority.NORMAL


@dataclass
class Subscriber:
    """訂閱者信息"""
    callback: Callable[[Event], Awaitable[None]]
    priority: EventPriority = EventPriority.NORMAL
    once: bool = False  # 是否只觸發一次


class EventBus:
    """
    事件總線實現
    
    支持:
    - 異步事件處理
    - 事件優先級
    - 通配符訂閱 (account.* 匹配所有 account 開頭的事件)
    - 一次性訂閱
    - 事件歷史記錄
    """
    
    def __init__(self, max_history: int = 1000):
        self._subscribers: Dict[str, List[Subscriber]] = {}
        self._history: List[Event] = []
        self._max_history = max_history
        self._lock = asyncio.Lock()
        
    async def subscribe(
        self,
        event_name: str,
        callback: Callable[[Event], Awaitable[None]],
        priority: EventPriority = EventPriority.NORMAL,
        once: bool = False
    ) -> Callable[[], None]:
        """
        訂閱事件
        
        Args:
            event_name: 事件名稱，支持通配符 (e.g., 'account.*')
            callback: 異步回調函數
            priority: 優先級
            once: 是否只觸發一次
            
        Returns:
            取消訂閱的函數
        """
        async with self._lock:
            if event_name not in self._subscribers:
                self._subscribers[event_name] = []
            
            subscriber = Subscriber(callback=callback, priority=priority, once=once)
            self._subscribers[event_name].append(subscriber)
            
            # 按優先級排序
            self._subscribers[event_name].sort(key=lambda s: s.priority.value, reverse=True)
        
        def unsubscribe():
            if event_name in self._subscribers:
                self._subscribers[event_name] = [
                    s for s in self._subscribers[event_name] if s.callback != callback
                ]
        
        return unsubscribe
    
    async def publish(
        self,
        event_name: str,
        payload: Dict[str, Any] = None,
        source: Optional[str] = None,
        priority: EventPriority = EventPriority.NORMAL
    ) -> None:
        """
        發布事件
        
        Args:
            event_name: 事件名稱
            payload: 事件數據
            source: 事件來源模塊
            priority: 事件優先級
        """
        event = Event(
            name=event_name,
            payload=payload or {},
            source=source,
            priority=priority
        )
        
        # 記錄歷史
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
        
        # 收集匹配的訂閱者
        matching_subscribers: List[Subscriber] = []
        
        async with self._lock:
            # 精確匹配
            if event_name in self._subscribers:
                matching_subscribers.extend(self._subscribers[event_name])
            
            # 通配符匹配
            for pattern, subscribers in self._subscribers.items():
                if pattern.endswith('.*'):
                    prefix = pattern[:-2]
                    if event_name.startswith(prefix + '.') and event_name != pattern:
                        matching_subscribers.extend(subscribers)
                elif pattern == '*':
                    matching_subscribers.extend(subscribers)
        
        # 按優先級排序後執行
        matching_subscribers.sort(key=lambda s: s.priority.value, reverse=True)
        
        # 收集需要移除的一次性訂閱
        once_callbacks = set()
        
        for subscriber in matching_subscribers:
            try:
                await subscriber.callback(event)
                if subscriber.once:
                    once_callbacks.add(subscriber.callback)
            except Exception as e:
                print(f"[EventBus] Error in subscriber for {event_name}: {e}", file=sys.stderr)
        
        # 移除一次性訂閱
        if once_callbacks:
            async with self._lock:
                for event_key, subscribers in self._subscribers.items():
                    self._subscribers[event_key] = [
                        s for s in subscribers if s.callback not in once_callbacks
                    ]
    
    async def publish_async(
        self,
        event_name: str,
        payload: Dict[str, Any] = None,
        source: Optional[str] = None
    ) -> asyncio.Task:
        """
        異步發布事件（不等待處理完成）
        
        Returns:
            asyncio.Task 對象
        """
        return asyncio.create_task(
            self.publish(event_name, payload, source)
        )
    
    def get_history(
        self,
        event_name: Optional[str] = None,
        limit: int = 100
    ) -> List[Event]:
        """獲取事件歷史"""
        if event_name:
            filtered = [e for e in self._history if e.name == event_name]
        else:
            filtered = self._history
        return filtered[-limit:]
    
    def clear_history(self) -> None:
        """清除事件歷史"""
        self._history.clear()
    
    def get_subscriber_count(self, event_name: Optional[str] = None) -> int:
        """獲取訂閱者數量"""
        if event_name:
            return len(self._subscribers.get(event_name, []))
        return sum(len(subs) for subs in self._subscribers.values())


# 全局事件總線實例
_event_bus: Optional[EventBus] = None


def init_event_bus(max_history: int = 1000) -> EventBus:
    """初始化全局事件總線"""
    global _event_bus
    _event_bus = EventBus(max_history=max_history)
    return _event_bus


def get_event_bus() -> EventBus:
    """獲取全局事件總線實例"""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


# 預定義事件名稱常量
class Events:
    """預定義事件名稱"""
    
    # 帳號相關
    ACCOUNT_ADDED = 'account.added'
    ACCOUNT_REMOVED = 'account.removed'
    ACCOUNT_LOGIN_START = 'account.login.start'
    ACCOUNT_LOGIN_SUCCESS = 'account.login.success'
    ACCOUNT_LOGIN_FAILED = 'account.login.failed'
    ACCOUNT_STATUS_CHANGED = 'account.status.changed'
    ACCOUNT_HEALTH_UPDATED = 'account.health.updated'
    
    # 消息相關
    MESSAGE_RECEIVED = 'message.received'
    MESSAGE_SENT = 'message.sent'
    MESSAGE_FAILED = 'message.failed'
    MESSAGE_QUEUED = 'message.queued'
    
    # 監控相關
    MONITORING_STARTED = 'monitoring.started'
    MONITORING_STOPPED = 'monitoring.stopped'
    KEYWORD_MATCHED = 'monitoring.keyword.matched'
    
    # 自動化相關
    AUTOMATION_TRIGGERED = 'automation.triggered'
    AUTOMATION_COMPLETED = 'automation.completed'
    AUTOMATION_FAILED = 'automation.failed'
    
    # 客戶相關
    CONTACT_CAPTURED = 'contact.captured'
    CONTACT_STATUS_CHANGED = 'contact.status.changed'
    CONTACT_CONVERTED = 'contact.converted'
    
    # AI 相關
    AI_RESPONSE_GENERATED = 'ai.response.generated'
    AI_RESPONSE_FAILED = 'ai.response.failed'
    
    # 系統相關
    SYSTEM_STARTED = 'system.started'
    SYSTEM_SHUTDOWN = 'system.shutdown'
    SYSTEM_ERROR = 'system.error'
