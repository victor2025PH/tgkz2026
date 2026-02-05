"""
事件推送服务
============

功能：
1. 后端实时事件发布
2. 支持前端订阅
3. 事件历史缓存
4. 事件过滤和路由

事件类型：
- alert: 系统告警
- capacity: 容量变化
- api_status: API 状态变化
- login: 登录事件
"""

import asyncio
import time
from typing import Any, Callable, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import logging

logger = logging.getLogger(__name__)


class EventType(Enum):
    """事件类型"""
    # 告警相关
    ALERT_NEW = "alert.new"
    ALERT_RESOLVED = "alert.resolved"
    ALERT_CLEARED = "alert.cleared"
    
    # 容量相关
    CAPACITY_WARNING = "capacity.warning"
    CAPACITY_CRITICAL = "capacity.critical"
    CAPACITY_NORMAL = "capacity.normal"
    
    # API 状态
    API_ADDED = "api.added"
    API_REMOVED = "api.removed"
    API_DISABLED = "api.disabled"
    API_RECOVERED = "api.recovered"
    API_EXHAUSTED = "api.exhausted"
    
    # 登录相关
    LOGIN_SUCCESS = "login.success"
    LOGIN_FAILED = "login.failed"
    LOGIN_BATCH_COMPLETE = "login.batch_complete"
    
    # 系统状态
    SYSTEM_STATUS = "system.status"
    STATS_UPDATE = "stats.update"


@dataclass
class Event:
    """事件对象"""
    type: EventType
    data: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    id: str = field(default_factory=lambda: f"evt_{int(time.time() * 1000)}")
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type.value,
            "data": self.data,
            "timestamp": self.timestamp
        }


class EventEmitter:
    """
    事件发射器
    
    负责在后端服务之间以及向前端推送事件
    """
    
    _instance: Optional['EventEmitter'] = None
    
    def __new__(cls) -> 'EventEmitter':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self._initialized = True
        
        # 事件监听器
        self._listeners: Dict[EventType, List[Callable]] = {}
        
        # 通配符监听器（监听所有事件）
        self._wildcard_listeners: List[Callable] = []
        
        # 前端回调（通过 IPC 推送）
        self._frontend_callback: Optional[Callable] = None
        
        # 事件历史（用于新连接的客户端获取最近事件）
        self._history: deque[Event] = deque(maxlen=100)
        
        # 事件队列（异步处理）
        self._event_queue: asyncio.Queue = None
        self._processing = False
        
        # 订阅者统计
        self._stats = {
            "events_emitted": 0,
            "events_delivered": 0,
            "listeners_count": 0
        }
        
        logger.info("EventEmitter initialized")
    
    def set_frontend_callback(self, callback: Callable[[Dict], None]) -> None:
        """设置前端推送回调"""
        self._frontend_callback = callback
        logger.info("Frontend callback registered")
    
    def on(self, event_type: EventType, callback: Callable) -> None:
        """注册事件监听器"""
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        
        self._listeners[event_type].append(callback)
        self._stats["listeners_count"] += 1
        
        logger.debug(f"Listener registered for {event_type.value}")
    
    def on_all(self, callback: Callable) -> None:
        """注册通配符监听器"""
        self._wildcard_listeners.append(callback)
        self._stats["listeners_count"] += 1
    
    def off(self, event_type: EventType, callback: Callable) -> None:
        """移除事件监听器"""
        if event_type in self._listeners:
            try:
                self._listeners[event_type].remove(callback)
                self._stats["listeners_count"] -= 1
            except ValueError:
                pass
    
    def emit(self, event_type: EventType, data: Dict[str, Any] = None) -> Event:
        """
        发射事件
        
        同步发射，异步处理
        """
        event = Event(type=event_type, data=data or {})
        
        # 添加到历史
        self._history.append(event)
        
        # 统计
        self._stats["events_emitted"] += 1
        
        # 异步处理
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self._process_event(event))
            else:
                # 同步模式
                self._process_event_sync(event)
        except RuntimeError:
            # 没有事件循环，同步处理
            self._process_event_sync(event)
        
        return event
    
    async def emit_async(self, event_type: EventType, data: Dict[str, Any] = None) -> Event:
        """异步发射事件"""
        event = Event(type=event_type, data=data or {})
        
        self._history.append(event)
        self._stats["events_emitted"] += 1
        
        await self._process_event(event)
        
        return event
    
    async def _process_event(self, event: Event) -> None:
        """异步处理事件"""
        try:
            # 调用特定类型的监听器
            if event.type in self._listeners:
                for callback in self._listeners[event.type]:
                    try:
                        result = callback(event)
                        if asyncio.iscoroutine(result):
                            await result
                        self._stats["events_delivered"] += 1
                    except Exception as e:
                        logger.error(f"Event listener error: {e}")
            
            # 调用通配符监听器
            for callback in self._wildcard_listeners:
                try:
                    result = callback(event)
                    if asyncio.iscoroutine(result):
                        await result
                    self._stats["events_delivered"] += 1
                except Exception as e:
                    logger.error(f"Wildcard listener error: {e}")
            
            # 推送到前端
            await self._push_to_frontend(event)
            
        except Exception as e:
            logger.error(f"Event processing error: {e}")
    
    def _process_event_sync(self, event: Event) -> None:
        """同步处理事件"""
        try:
            # 调用特定类型的监听器
            if event.type in self._listeners:
                for callback in self._listeners[event.type]:
                    try:
                        callback(event)
                        self._stats["events_delivered"] += 1
                    except Exception as e:
                        logger.error(f"Event listener error: {e}")
            
            # 调用通配符监听器
            for callback in self._wildcard_listeners:
                try:
                    callback(event)
                    self._stats["events_delivered"] += 1
                except Exception as e:
                    logger.error(f"Wildcard listener error: {e}")
            
            # 推送到前端
            if self._frontend_callback:
                try:
                    self._frontend_callback(event.to_dict())
                except Exception as e:
                    logger.error(f"Frontend push error: {e}")
                    
        except Exception as e:
            logger.error(f"Sync event processing error: {e}")
    
    async def _push_to_frontend(self, event: Event) -> None:
        """推送事件到前端"""
        if self._frontend_callback:
            try:
                result = self._frontend_callback(event.to_dict())
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Frontend push error: {e}")
    
    def get_history(self, 
                    event_types: List[EventType] = None,
                    since: float = None,
                    limit: int = 50) -> List[Dict]:
        """获取事件历史"""
        events = list(self._history)
        
        # 按类型过滤
        if event_types:
            events = [e for e in events if e.type in event_types]
        
        # 按时间过滤
        if since:
            events = [e for e in events if e.timestamp > since]
        
        # 限制数量
        events = events[-limit:]
        
        return [e.to_dict() for e in events]
    
    def get_stats(self) -> Dict[str, Any]:
        """获取事件统计"""
        return {
            **self._stats,
            "history_size": len(self._history),
            "registered_types": list(self._listeners.keys())
        }
    
    # 便捷方法
    def emit_alert(self, alert_data: Dict) -> Event:
        """发射告警事件"""
        return self.emit(EventType.ALERT_NEW, alert_data)
    
    def emit_alert_resolved(self, alert_id: str) -> Event:
        """发射告警解决事件"""
        return self.emit(EventType.ALERT_RESOLVED, {"alert_id": alert_id})
    
    def emit_capacity_change(self, level: str, data: Dict) -> Event:
        """发射容量变化事件"""
        event_type = {
            "warning": EventType.CAPACITY_WARNING,
            "critical": EventType.CAPACITY_CRITICAL,
            "normal": EventType.CAPACITY_NORMAL
        }.get(level, EventType.CAPACITY_WARNING)
        
        return self.emit(event_type, data)
    
    def emit_api_status(self, action: str, api_data: Dict) -> Event:
        """发射 API 状态事件"""
        event_type = {
            "added": EventType.API_ADDED,
            "removed": EventType.API_REMOVED,
            "disabled": EventType.API_DISABLED,
            "recovered": EventType.API_RECOVERED,
            "exhausted": EventType.API_EXHAUSTED
        }.get(action, EventType.SYSTEM_STATUS)
        
        return self.emit(event_type, api_data)
    
    def emit_login(self, success: bool, data: Dict) -> Event:
        """发射登录事件"""
        event_type = EventType.LOGIN_SUCCESS if success else EventType.LOGIN_FAILED
        return self.emit(event_type, data)
    
    def emit_stats_update(self, stats: Dict) -> Event:
        """发射统计更新事件"""
        return self.emit(EventType.STATS_UPDATE, stats)


# 全局单例
event_emitter = EventEmitter()


# 装饰器：自动发射事件
def emit_event(event_type: EventType, data_extractor: Callable = None):
    """
    装饰器：函数执行后自动发射事件
    
    用法:
        @emit_event(EventType.API_ADDED, lambda result: {"api_id": result.id})
        def add_api(...):
            ...
    """
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            try:
                data = data_extractor(result) if data_extractor else {"result": str(result)}
                event_emitter.emit(event_type, data)
            except Exception as e:
                logger.error(f"Event emit decorator error: {e}")
            
            return result
        
        def sync_wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            try:
                data = data_extractor(result) if data_extractor else {"result": str(result)}
                event_emitter.emit(event_type, data)
            except Exception as e:
                logger.error(f"Event emit decorator error: {e}")
            
            return result
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator
