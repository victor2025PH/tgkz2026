"""
TG-Matrix Application Performance Monitoring (APM)
應用性能監控

提供:
- 請求追蹤
- 性能指標收集
- 錯誤監控
- 資源使用統計
"""

import sys
import time
import asyncio
import threading
import traceback
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
from functools import wraps
import statistics

from core.logging import get_logger

logger = get_logger('APM')


# ============ 數據模型 ============

@dataclass
class Span:
    """追蹤跨度"""
    trace_id: str
    span_id: str
    name: str
    start_time: float
    end_time: Optional[float] = None
    parent_span_id: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    logs: List[Dict[str, Any]] = field(default_factory=list)
    status: str = 'ok'  # ok, error
    
    @property
    def duration_ms(self) -> float:
        if self.end_time is None:
            return 0
        return (self.end_time - self.start_time) * 1000
    
    def log(self, message: str, **kwargs):
        self.logs.append({
            'timestamp': time.time(),
            'message': message,
            **kwargs
        })
    
    def set_tag(self, key: str, value: str):
        self.tags[key] = value
    
    def set_error(self, error: Exception):
        self.status = 'error'
        self.tags['error'] = str(error)
        self.tags['error_type'] = type(error).__name__
    
    def finish(self):
        self.end_time = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'traceId': self.trace_id,
            'spanId': self.span_id,
            'name': self.name,
            'startTime': self.start_time,
            'endTime': self.end_time,
            'durationMs': self.duration_ms,
            'parentSpanId': self.parent_span_id,
            'tags': self.tags,
            'logs': self.logs,
            'status': self.status,
        }


@dataclass
class MetricPoint:
    """指標數據點"""
    name: str
    value: float
    timestamp: float
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'value': self.value,
            'timestamp': self.timestamp,
            'tags': self.tags,
        }


@dataclass
class ErrorRecord:
    """錯誤記錄"""
    error_type: str
    message: str
    stack_trace: str
    timestamp: float
    context: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'errorType': self.error_type,
            'message': self.message,
            'stackTrace': self.stack_trace,
            'timestamp': self.timestamp,
            'context': self.context,
        }


# ============ 指標收集器 ============

class MetricsCollector:
    """
    指標收集器
    
    收集和聚合性能指標
    """
    
    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self._metrics: Dict[str, deque] = {}
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._lock = threading.RLock()
    
    def record(self, name: str, value: float, tags: Dict[str, str] = None):
        """記錄指標值"""
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = deque(maxlen=self.window_size)
            
            point = MetricPoint(
                name=name,
                value=value,
                timestamp=time.time(),
                tags=tags or {}
            )
            self._metrics[name].append(point)
    
    def increment(self, name: str, value: int = 1):
        """增加計數器"""
        with self._lock:
            self._counters[name] = self._counters.get(name, 0) + value
    
    def decrement(self, name: str, value: int = 1):
        """減少計數器"""
        self.increment(name, -value)
    
    def set_gauge(self, name: str, value: float):
        """設置儀表值"""
        with self._lock:
            self._gauges[name] = value
    
    def get_stats(self, name: str) -> Dict[str, float]:
        """獲取指標統計"""
        with self._lock:
            if name not in self._metrics or len(self._metrics[name]) == 0:
                return {}
            
            values = [p.value for p in self._metrics[name]]
            
            return {
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'avg': statistics.mean(values),
                'median': statistics.median(values),
                'p95': self._percentile(values, 95),
                'p99': self._percentile(values, 99),
            }
    
    def get_counter(self, name: str) -> int:
        """獲取計數器值"""
        return self._counters.get(name, 0)
    
    def get_gauge(self, name: str) -> Optional[float]:
        """獲取儀表值"""
        return self._gauges.get(name)
    
    def get_all_stats(self) -> Dict[str, Any]:
        """獲取所有統計"""
        with self._lock:
            return {
                'metrics': {name: self.get_stats(name) for name in self._metrics.keys()},
                'counters': dict(self._counters),
                'gauges': dict(self._gauges),
            }
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """計算百分位數"""
        if not values:
            return 0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]


# ============ APM 服務 ============

class APMService:
    """
    APM 服務
    
    提供完整的應用性能監控功能
    """
    
    _instance: Optional['APMService'] = None
    _lock = threading.Lock()
    
    # 預定義指標名稱
    METRIC_REQUEST_DURATION = 'request.duration'
    METRIC_REQUEST_COUNT = 'request.count'
    METRIC_ERROR_COUNT = 'error.count'
    METRIC_DB_QUERY_DURATION = 'db.query.duration'
    METRIC_CACHE_HIT_RATE = 'cache.hit_rate'
    METRIC_MEMORY_USAGE = 'system.memory_mb'
    METRIC_CPU_USAGE = 'system.cpu_percent'
    METRIC_ACTIVE_CONNECTIONS = 'connections.active'
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self.metrics = MetricsCollector()
        self._traces: deque = deque(maxlen=1000)
        self._errors: deque = deque(maxlen=500)
        self._current_span: Dict[int, Span] = {}  # thread_id -> span
        self._span_counter = 0
        self._lock = threading.RLock()
        self._started_at = datetime.now()
        
        self._initialized = True
        logger.info("APM Service initialized")
    
    def start_span(self, name: str, parent: Span = None) -> Span:
        """開始新的追蹤跨度"""
        with self._lock:
            self._span_counter += 1
            
            if parent:
                trace_id = parent.trace_id
                parent_span_id = parent.span_id
            else:
                trace_id = f"trace_{self._span_counter}_{int(time.time()*1000)}"
                parent_span_id = None
            
            span = Span(
                trace_id=trace_id,
                span_id=f"span_{self._span_counter}",
                name=name,
                start_time=time.time(),
                parent_span_id=parent_span_id
            )
            
            # 保存當前線程的跨度
            thread_id = threading.current_thread().ident
            self._current_span[thread_id] = span
            
            return span
    
    def finish_span(self, span: Span):
        """結束追蹤跨度"""
        span.finish()
        
        with self._lock:
            self._traces.append(span)
            
            # 記錄持續時間指標
            self.metrics.record(
                f"{self.METRIC_REQUEST_DURATION}.{span.name}",
                span.duration_ms
            )
            
            # 清理當前跨度
            thread_id = threading.current_thread().ident
            if thread_id in self._current_span:
                del self._current_span[thread_id]
    
    def get_current_span(self) -> Optional[Span]:
        """獲取當前線程的跨度"""
        thread_id = threading.current_thread().ident
        return self._current_span.get(thread_id)
    
    def record_error(self, error: Exception, context: Dict[str, Any] = None):
        """記錄錯誤"""
        record = ErrorRecord(
            error_type=type(error).__name__,
            message=str(error),
            stack_trace=traceback.format_exc(),
            timestamp=time.time(),
            context=context or {}
        )
        
        with self._lock:
            self._errors.append(record)
            self.metrics.increment(self.METRIC_ERROR_COUNT)
        
        logger.error(f"Error recorded: {error}", error_type=type(error).__name__)
    
    def record_request(self, name: str, duration_ms: float, success: bool = True):
        """記錄請求"""
        self.metrics.record(f"{self.METRIC_REQUEST_DURATION}.{name}", duration_ms)
        self.metrics.increment(f"{self.METRIC_REQUEST_COUNT}.{name}")
        
        if not success:
            self.metrics.increment(f"{self.METRIC_ERROR_COUNT}.{name}")
    
    def record_db_query(self, query_type: str, duration_ms: float):
        """記錄數據庫查詢"""
        self.metrics.record(f"{self.METRIC_DB_QUERY_DURATION}.{query_type}", duration_ms)
    
    def record_cache_access(self, hit: bool):
        """記錄緩存訪問"""
        if hit:
            self.metrics.increment('cache.hits')
        else:
            self.metrics.increment('cache.misses')
    
    def update_system_metrics(self):
        """更新系統指標"""
        try:
            import psutil
            
            # 內存使用
            memory = psutil.Process().memory_info()
            self.metrics.set_gauge(self.METRIC_MEMORY_USAGE, memory.rss / 1024 / 1024)
            
            # CPU 使用
            cpu = psutil.Process().cpu_percent()
            self.metrics.set_gauge(self.METRIC_CPU_USAGE, cpu)
            
        except ImportError:
            pass
    
    def get_health(self) -> Dict[str, Any]:
        """獲取健康狀態"""
        self.update_system_metrics()
        
        uptime = (datetime.now() - self._started_at).total_seconds()
        
        return {
            'status': 'healthy',
            'uptime_seconds': uptime,
            'uptime_human': str(timedelta(seconds=int(uptime))),
            'started_at': self._started_at.isoformat(),
            'metrics_summary': {
                'total_requests': self.metrics.get_counter(self.METRIC_REQUEST_COUNT),
                'total_errors': self.metrics.get_counter(self.METRIC_ERROR_COUNT),
                'memory_mb': self.metrics.get_gauge(self.METRIC_MEMORY_USAGE),
                'cpu_percent': self.metrics.get_gauge(self.METRIC_CPU_USAGE),
            }
        }
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """獲取儀表板數據"""
        self.update_system_metrics()
        
        return {
            'health': self.get_health(),
            'metrics': self.metrics.get_all_stats(),
            'recent_traces': [s.to_dict() for s in list(self._traces)[-20:]],
            'recent_errors': [e.to_dict() for e in list(self._errors)[-10:]],
        }
    
    def get_traces(self, limit: int = 100) -> List[Dict[str, Any]]:
        """獲取追蹤記錄"""
        return [s.to_dict() for s in list(self._traces)[-limit:]]
    
    def get_errors(self, limit: int = 50) -> List[Dict[str, Any]]:
        """獲取錯誤記錄"""
        return [e.to_dict() for e in list(self._errors)[-limit:]]


# ============ 全局實例 ============

_apm: Optional[APMService] = None


def get_apm() -> APMService:
    """獲取 APM 服務實例"""
    global _apm
    if _apm is None:
        _apm = APMService()
    return _apm


# ============ 裝飾器 ============

def trace(name: str = None):
    """
    追蹤裝飾器
    
    用法:
        @trace('send_message')
        async def send_message(payload):
            ...
    """
    def decorator(func: Callable) -> Callable:
        span_name = name or func.__name__
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            apm = get_apm()
            span = apm.start_span(span_name)
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                span.set_error(e)
                apm.record_error(e, {'function': span_name})
                raise
            finally:
                apm.finish_span(span)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            apm = get_apm()
            span = apm.start_span(span_name)
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                span.set_error(e)
                apm.record_error(e, {'function': span_name})
                raise
            finally:
                apm.finish_span(span)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def measure_time(metric_name: str):
    """
    測量時間裝飾器
    
    用法:
        @measure_time('db.query.users')
        async def get_users():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            apm = get_apm()
            start = time.time()
            
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = (time.time() - start) * 1000
                apm.metrics.record(metric_name, duration)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            apm = get_apm()
            start = time.time()
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = (time.time() - start) * 1000
                apm.metrics.record(metric_name, duration)
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
