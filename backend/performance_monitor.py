"""
TG-Matrix Performance Monitor
Monitors system performance metrics and provides insights
"""
import sys
import time
import psutil
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from collections import deque
from config_loader import get_config


@dataclass
class PerformanceMetric:
    """Single performance metric data point"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    disk_usage_percent: float
    active_connections: int
    queue_length: int
    avg_query_time_ms: float
    avg_send_delay_ms: float


@dataclass
class QueryPerformance:
    """Database query performance tracking"""
    query_name: str
    execution_time_ms: float
    timestamp: datetime


@dataclass
class SendPerformance:
    """Message send performance tracking"""
    phone: str
    delay_ms: float
    timestamp: datetime


class PerformanceMonitor:
    """Monitors and tracks system performance metrics"""
    
    def __init__(
        self,
        max_history: int = 1000,
        collection_interval: float = 5.0,
        event_callback: Optional[Callable[[str, Any], None]] = None
    ):
        """
        Initialize performance monitor
        
        Args:
            max_history: Maximum number of metrics to keep in history
            collection_interval: Interval in seconds between metric collections
            event_callback: Callback function for performance events
        """
        self.max_history = max_history
        self.collection_interval = collection_interval
        self.event_callback = event_callback
        
        # Metric history (circular buffer)
        self.metrics_history: deque = deque(maxlen=max_history)
        
        # Query performance tracking
        self.query_times: Dict[str, List[float]] = {}  # query_name -> [times in ms]
        self.max_query_samples = 100  # Keep last 100 samples per query
        
        # Send performance tracking
        self.send_delays: Dict[str, List[float]] = {}  # phone -> [delays in ms]
        self.max_send_samples = 100  # Keep last 100 samples per phone
        
        # Connection tracking
        self.active_connections: Dict[str, datetime] = {}  # phone -> last_active
        
        # Queue length tracking
        self.queue_length_history: deque = deque(maxlen=100)
        
        # Background task
        self.running = False
        self.collection_task: Optional[asyncio.Task] = None
        
        # Performance thresholds (can be configured)
        self.config = get_config()
        self.cpu_threshold = 80.0  # Alert if CPU > 80%
        self.memory_threshold = 85.0  # Alert if Memory > 85%
        self.disk_threshold = 90.0  # Alert if Disk > 90%
        self.query_time_threshold = 1000.0  # Alert if query > 1000ms
        self.send_delay_threshold = 5000.0  # Alert if send delay > 5000ms
    
    async def start(self):
        """Start the performance monitoring background task"""
        if not self.running:
            self.running = True
            self.collection_task = asyncio.create_task(self._collection_loop())
            print("[PerformanceMonitor] Started.", file=sys.stderr)
    
    async def stop(self):
        """Stop the performance monitoring background task"""
        self.running = False
        if self.collection_task:
            self.collection_task.cancel()
            try:
                await self.collection_task
            except asyncio.CancelledError:
                pass
            print("[PerformanceMonitor] Stopped.", file=sys.stderr)
    
    async def _collection_loop(self):
        """Background task to collect performance metrics"""
        while self.running:
            try:
                await self.collect_metrics()
                await asyncio.sleep(self.collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[PerformanceMonitor] Error collecting metrics: {e}", file=sys.stderr)
                await asyncio.sleep(self.collection_interval)
    
    async def collect_metrics(self) -> PerformanceMetric:
        """
        Collect current performance metrics
        
        Returns:
            PerformanceMetric object with current metrics
        """
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Application metrics
        active_connections = len(self.active_connections)
        queue_length = self._get_current_queue_length()
        
        # Calculate average query time
        avg_query_time = self._calculate_avg_query_time()
        
        # Calculate average send delay
        avg_send_delay = self._calculate_avg_send_delay()
        
        # Create metric
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_mb=memory.used / (1024 * 1024),
            disk_usage_percent=disk.percent,
            active_connections=active_connections,
            queue_length=queue_length,
            avg_query_time_ms=avg_query_time,
            avg_send_delay_ms=avg_send_delay
        )
        
        # Add to history
        self.metrics_history.append(metric)
        
        # Check thresholds and send alerts
        await self._check_thresholds(metric)
        
        # Notify callback if set
        if self.event_callback:
            # Convert metric to dict and serialize datetime to ISO string
            metric_dict = {
                "timestamp": metric.timestamp.isoformat(),
                "cpu_percent": metric.cpu_percent,
                "memory_percent": metric.memory_percent,
                "memory_mb": metric.memory_mb,
                "disk_usage_percent": metric.disk_usage_percent,
                "active_connections": metric.active_connections,
                "queue_length": metric.queue_length,
                "avg_query_time_ms": metric.avg_query_time_ms,
                "avg_send_delay_ms": metric.avg_send_delay_ms
            }
            self.event_callback("performance-metric", metric_dict)
        
        return metric
    
    def _get_current_queue_length(self) -> int:
        """Get current message queue length"""
        # This will be updated by external code
        if self.queue_length_history:
            return self.queue_length_history[-1]
        return 0
    
    def update_queue_length(self, length: int):
        """Update current queue length"""
        self.queue_length_history.append(length)
    
    def _calculate_avg_query_time(self) -> float:
        """Calculate average query execution time"""
        if not self.query_times:
            return 0.0
        
        all_times = []
        for times in self.query_times.values():
            all_times.extend(times[-10:])  # Last 10 samples per query
        
        if not all_times:
            return 0.0
        
        return sum(all_times) / len(all_times)
    
    def _calculate_avg_send_delay(self) -> float:
        """Calculate average message send delay"""
        if not self.send_delays:
            return 0.0
        
        all_delays = []
        for delays in self.send_delays.values():
            all_delays.extend(delays[-10:])  # Last 10 samples per phone
        
        if not all_delays:
            return 0.0
        
        return sum(all_delays) / len(all_delays)
    
    async def _check_thresholds(self, metric: PerformanceMetric):
        """Check performance thresholds and send alerts if exceeded"""
        alerts = []
        
        if metric.cpu_percent > self.cpu_threshold:
            alerts.append(f"High CPU usage: {metric.cpu_percent:.1f}%")
        
        if metric.memory_percent > self.memory_threshold:
            alerts.append(f"High memory usage: {metric.memory_percent:.1f}%")
        
        if metric.disk_usage_percent > self.disk_threshold:
            alerts.append(f"High disk usage: {metric.disk_usage_percent:.1f}%")
        
        if metric.avg_query_time_ms > self.query_time_threshold:
            alerts.append(f"Slow queries: {metric.avg_query_time_ms:.1f}ms average")
        
        if metric.avg_send_delay_ms > self.send_delay_threshold:
            alerts.append(f"Slow message sending: {metric.avg_send_delay_ms:.1f}ms average")
        
        if alerts and self.event_callback:
            # Convert metric to dict and serialize datetime to ISO string
            metric_dict = {
                "timestamp": metric.timestamp.isoformat(),
                "cpu_percent": metric.cpu_percent,
                "memory_percent": metric.memory_percent,
                "memory_mb": metric.memory_mb,
                "disk_usage_percent": metric.disk_usage_percent,
                "active_connections": metric.active_connections,
                "queue_length": metric.queue_length,
                "avg_query_time_ms": metric.avg_query_time_ms,
                "avg_send_delay_ms": metric.avg_send_delay_ms
            }
            self.event_callback("performance-alert", {
                "timestamp": metric.timestamp.isoformat(),
                "alerts": alerts,
                "metrics": metric_dict
            })
    
    def record_query_performance(self, query_name: str, execution_time_ms: float):
        """Record a database query performance metric"""
        if query_name not in self.query_times:
            self.query_times[query_name] = []
        
        self.query_times[query_name].append(execution_time_ms)
        
        # Keep only last N samples
        if len(self.query_times[query_name]) > self.max_query_samples:
            self.query_times[query_name] = self.query_times[query_name][-self.max_query_samples:]
    
    def record_send_performance(self, phone: str, delay_ms: float):
        """Record a message send performance metric"""
        if phone not in self.send_delays:
            self.send_delays[phone] = []
        
        self.send_delays[phone].append(delay_ms)
        
        # Keep only last N samples
        if len(self.send_delays[phone]) > self.max_send_samples:
            self.send_delays[phone] = self.send_delays[phone][-self.max_send_samples:]
    
    def register_connection(self, phone: str):
        """Register an active connection"""
        self.active_connections[phone] = datetime.now()
    
    def unregister_connection(self, phone: str):
        """Unregister a connection"""
        if phone in self.active_connections:
            del self.active_connections[phone]
    
    def get_current_metrics(self) -> Optional[Dict[str, Any]]:
        """Get the most recent performance metrics"""
        if not self.metrics_history:
            return None
        
        metric = self.metrics_history[-1]
        # Convert metric to dict and serialize datetime to ISO string
        return {
            "timestamp": metric.timestamp.isoformat(),
            "cpu_percent": metric.cpu_percent,
            "memory_percent": metric.memory_percent,
            "memory_mb": metric.memory_mb,
            "disk_usage_percent": metric.disk_usage_percent,
            "active_connections": metric.active_connections,
            "queue_length": metric.queue_length,
            "avg_query_time_ms": metric.avg_query_time_ms,
            "avg_send_delay_ms": metric.avg_send_delay_ms
        }
    
    def get_metrics_history(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get historical performance metrics
        
        Args:
            start_time: Start time filter (optional)
            end_time: End time filter (optional)
            limit: Maximum number of metrics to return
        
        Returns:
            List of metric dictionaries
        """
        metrics = list(self.metrics_history)
        
        # Apply time filters
        if start_time:
            metrics = [m for m in metrics if m.timestamp >= start_time]
        if end_time:
            metrics = [m for m in metrics if m.timestamp <= end_time]
        
        # Limit results
        metrics = metrics[-limit:]
        
        # Convert to dictionaries and serialize datetime to ISO string
        return [{
            "timestamp": m.timestamp.isoformat(),
            "cpu_percent": m.cpu_percent,
            "memory_percent": m.memory_percent,
            "memory_mb": m.memory_mb,
            "disk_usage_percent": m.disk_usage_percent,
            "active_connections": m.active_connections,
            "queue_length": m.queue_length,
            "avg_query_time_ms": m.avg_query_time_ms,
            "avg_send_delay_ms": m.avg_send_delay_ms
        } for m in metrics]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get a summary of performance statistics"""
        if not self.metrics_history:
            return {
                "status": "no_data",
                "message": "No performance data collected yet"
            }
        
        metrics = list(self.metrics_history)
        
        # Calculate statistics
        cpu_values = [m.cpu_percent for m in metrics]
        memory_values = [m.memory_percent for m in metrics]
        query_times = [m.avg_query_time_ms for m in metrics if m.avg_query_time_ms > 0]
        send_delays = [m.avg_send_delay_ms for m in metrics if m.avg_send_delay_ms > 0]
        
        summary = {
            "status": "active",
            "collection_period": {
                "start": metrics[0].timestamp.isoformat(),
                "end": metrics[-1].timestamp.isoformat(),
                "duration_seconds": (metrics[-1].timestamp - metrics[0].timestamp).total_seconds()
            },
            "cpu": {
                "current": cpu_values[-1] if cpu_values else 0,
                "average": sum(cpu_values) / len(cpu_values) if cpu_values else 0,
                "max": max(cpu_values) if cpu_values else 0,
                "min": min(cpu_values) if cpu_values else 0
            },
            "memory": {
                "current_percent": memory_values[-1] if memory_values else 0,
                "average_percent": sum(memory_values) / len(memory_values) if memory_values else 0,
                "max_percent": max(memory_values) if memory_values else 0,
                "min_percent": min(memory_values) if memory_values else 0
            },
            "query_performance": {
                "average_time_ms": sum(query_times) / len(query_times) if query_times else 0,
                "max_time_ms": max(query_times) if query_times else 0,
                "min_time_ms": min(query_times) if query_times else 0,
                "sample_count": len(query_times)
            },
            "send_performance": {
                "average_delay_ms": sum(send_delays) / len(send_delays) if send_delays else 0,
                "max_delay_ms": max(send_delays) if send_delays else 0,
                "min_delay_ms": min(send_delays) if send_delays else 0,
                "sample_count": len(send_delays)
            },
            "connections": {
                "active": len(self.active_connections),
                "total_registered": len(self.active_connections)
            },
            "queue": {
                "current_length": self._get_current_queue_length(),
                "average_length": sum(self.queue_length_history) / len(self.queue_length_history) if self.queue_length_history else 0,
                "max_length": max(self.queue_length_history) if self.queue_length_history else 0
            }
        }
        
        return summary


# Global performance monitor instance
_performance_monitor: Optional[PerformanceMonitor] = None


def init_performance_monitor(
    event_callback: Optional[Callable[[str, Any], None]] = None,
    collection_interval: float = 30.0  # 優化：默認 30 秒，減少事件發送頻率
) -> PerformanceMonitor:
    """Initialize the global performance monitor"""
    global _performance_monitor
    if _performance_monitor is None:
        config = get_config()
        # 使用配置值或傳入的間隔，默認 30 秒
        interval = getattr(config.monitoring, 'performance_collection_interval', collection_interval)
        _performance_monitor = PerformanceMonitor(
            collection_interval=interval,
            event_callback=event_callback
        )
    return _performance_monitor


def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance"""
    if _performance_monitor is None:
        raise RuntimeError("PerformanceMonitor not initialized. Call init_performance_monitor() first.")
    return _performance_monitor

