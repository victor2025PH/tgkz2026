"""
TG-Matrix 基礎監控系統
Phase A: SRE & Performance - 指標收集與健康檢查

功能：
1. 系統指標收集（CPU、內存、磁盤）
2. 應用指標收集（請求數、錯誤率、延遲）
3. 業務指標收集（發送成功率、在線帳號數）
4. 健康檢查
5. 告警閾值監控
"""

import os
import sys
import time
import asyncio
import psutil
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import threading
import json

from .logging import get_logger

logger = get_logger("metrics")


class MetricType(Enum):
    """指標類型"""
    COUNTER = "counter"      # 累計計數器
    GAUGE = "gauge"          # 即時值
    HISTOGRAM = "histogram"  # 分佈統計
    TIMER = "timer"          # 時間統計


class HealthStatus(Enum):
    """健康狀態"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class AlertSeverity(Enum):
    """告警嚴重程度"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class Metric:
    """指標數據"""
    name: str
    type: MetricType
    value: float
    timestamp: datetime = field(default_factory=datetime.now)
    labels: Dict[str, str] = field(default_factory=dict)
    unit: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type.value,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "labels": self.labels,
            "unit": self.unit
        }


@dataclass
class HealthCheck:
    """健康檢查結果"""
    name: str
    status: HealthStatus
    message: str = ""
    latency_ms: float = 0
    timestamp: datetime = field(default_factory=datetime.now)
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "message": self.message,
            "latency_ms": self.latency_ms,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details
        }


@dataclass
class AlertRule:
    """告警規則"""
    name: str
    metric_name: str
    condition: str  # ">", "<", ">=", "<=", "=="
    threshold: float
    severity: AlertSeverity
    message_template: str
    cooldown_seconds: int = 300  # 冷卻時間，避免重複告警
    
    def check(self, value: float) -> bool:
        """檢查是否觸發告警"""
        ops = {
            ">": lambda a, b: a > b,
            "<": lambda a, b: a < b,
            ">=": lambda a, b: a >= b,
            "<=": lambda a, b: a <= b,
            "==": lambda a, b: a == b,
        }
        return ops.get(self.condition, lambda a, b: False)(value, self.threshold)


@dataclass
class Alert:
    """告警"""
    rule_name: str
    severity: AlertSeverity
    message: str
    metric_value: float
    threshold: float
    timestamp: datetime = field(default_factory=datetime.now)
    acknowledged: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_name": self.rule_name,
            "severity": self.severity.value,
            "message": self.message,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "timestamp": self.timestamp.isoformat(),
            "acknowledged": self.acknowledged
        }


class MetricsCollector:
    """指標收集器"""
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        self._metrics: Dict[str, deque] = {}
        self._counters: Dict[str, float] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._lock = threading.Lock()
    
    def increment(self, name: str, value: float = 1, labels: Dict[str, str] = None):
        """增加計數器"""
        key = self._make_key(name, labels)
        with self._lock:
            self._counters[key] = self._counters.get(key, 0) + value
            self._record_metric(name, MetricType.COUNTER, self._counters[key], labels)
    
    def gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """設置即時值"""
        key = self._make_key(name, labels)
        with self._lock:
            self._gauges[key] = value
            self._record_metric(name, MetricType.GAUGE, value, labels)
    
    def histogram(self, name: str, value: float, labels: Dict[str, str] = None):
        """記錄分佈值"""
        key = self._make_key(name, labels)
        with self._lock:
            if key not in self._histograms:
                self._histograms[key] = []
            self._histograms[key].append(value)
            # 只保留最近 1000 個值
            if len(self._histograms[key]) > 1000:
                self._histograms[key] = self._histograms[key][-1000:]
            self._record_metric(name, MetricType.HISTOGRAM, value, labels)
    
    def timer(self, name: str):
        """創建計時器上下文管理器"""
        return TimerContext(self, name)
    
    def _make_key(self, name: str, labels: Dict[str, str] = None) -> str:
        """生成指標鍵"""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"
    
    def _record_metric(self, name: str, type: MetricType, value: float, labels: Dict[str, str] = None):
        """記錄指標"""
        key = self._make_key(name, labels)
        if key not in self._metrics:
            self._metrics[key] = deque(maxlen=self.max_history)
        self._metrics[key].append(Metric(
            name=name,
            type=type,
            value=value,
            labels=labels or {}
        ))
    
    def get_counter(self, name: str, labels: Dict[str, str] = None) -> float:
        """獲取計數器值"""
        key = self._make_key(name, labels)
        return self._counters.get(key, 0)
    
    def get_gauge(self, name: str, labels: Dict[str, str] = None) -> float:
        """獲取即時值"""
        key = self._make_key(name, labels)
        return self._gauges.get(key, 0)
    
    def get_histogram_stats(self, name: str, labels: Dict[str, str] = None) -> Dict[str, float]:
        """獲取分佈統計"""
        key = self._make_key(name, labels)
        values = self._histograms.get(key, [])
        if not values:
            return {"count": 0, "min": 0, "max": 0, "avg": 0, "p50": 0, "p95": 0, "p99": 0}
        
        sorted_values = sorted(values)
        count = len(sorted_values)
        return {
            "count": count,
            "min": sorted_values[0],
            "max": sorted_values[-1],
            "avg": sum(sorted_values) / count,
            "p50": sorted_values[int(count * 0.5)],
            "p95": sorted_values[int(count * 0.95)],
            "p99": sorted_values[int(count * 0.99)]
        }
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """獲取所有指標"""
        return {
            "counters": dict(self._counters),
            "gauges": dict(self._gauges),
            "histograms": {k: self.get_histogram_stats(k) for k in self._histograms}
        }


class TimerContext:
    """計時器上下文管理器"""
    
    def __init__(self, collector: MetricsCollector, name: str, labels: Dict[str, str] = None):
        self.collector = collector
        self.name = name
        self.labels = labels
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.perf_counter() - self.start_time) * 1000
        self.collector.histogram(self.name, duration_ms, self.labels)


class SystemMetricsCollector:
    """系統指標收集器"""
    
    def __init__(self, collector: MetricsCollector):
        self.collector = collector
        self._process = psutil.Process()
    
    def collect(self):
        """收集系統指標"""
        # CPU
        cpu_percent = psutil.cpu_percent(interval=None)
        self.collector.gauge("system.cpu.percent", cpu_percent)
        
        # 內存
        memory = psutil.virtual_memory()
        self.collector.gauge("system.memory.percent", memory.percent)
        self.collector.gauge("system.memory.used_mb", memory.used / (1024 * 1024))
        self.collector.gauge("system.memory.available_mb", memory.available / (1024 * 1024))
        
        # 磁盤
        disk = psutil.disk_usage('/')
        self.collector.gauge("system.disk.percent", disk.percent)
        self.collector.gauge("system.disk.free_gb", disk.free / (1024 * 1024 * 1024))
        
        # 進程
        process_memory = self._process.memory_info()
        self.collector.gauge("process.memory.rss_mb", process_memory.rss / (1024 * 1024))
        self.collector.gauge("process.cpu.percent", self._process.cpu_percent())
        
        # 線程數
        self.collector.gauge("process.threads", self._process.num_threads())
        
        # 文件描述符（Unix）
        if hasattr(self._process, 'num_fds'):
            self.collector.gauge("process.open_files", self._process.num_fds())


class HealthChecker:
    """健康檢查器"""
    
    def __init__(self):
        self._checks: Dict[str, Callable[[], Awaitable[HealthCheck]]] = {}
    
    def register(self, name: str, check_func: Callable[[], Awaitable[HealthCheck]]):
        """註冊健康檢查"""
        self._checks[name] = check_func
    
    async def run_all(self) -> Dict[str, HealthCheck]:
        """運行所有健康檢查"""
        results = {}
        for name, check_func in self._checks.items():
            try:
                start = time.perf_counter()
                result = await check_func()
                result.latency_ms = (time.perf_counter() - start) * 1000
                results[name] = result
            except Exception as e:
                results[name] = HealthCheck(
                    name=name,
                    status=HealthStatus.UNHEALTHY,
                    message=str(e)
                )
        return results
    
    async def run_check(self, name: str) -> Optional[HealthCheck]:
        """運行單個健康檢查"""
        if name not in self._checks:
            return None
        try:
            start = time.perf_counter()
            result = await self._checks[name]()
            result.latency_ms = (time.perf_counter() - start) * 1000
            return result
        except Exception as e:
            return HealthCheck(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )
    
    def get_overall_status(self, results: Dict[str, HealthCheck]) -> HealthStatus:
        """獲取整體健康狀態"""
        if not results:
            return HealthStatus.UNKNOWN
        
        statuses = [r.status for r in results.values()]
        
        if HealthStatus.UNHEALTHY in statuses:
            return HealthStatus.UNHEALTHY
        if HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        if all(s == HealthStatus.HEALTHY for s in statuses):
            return HealthStatus.HEALTHY
        return HealthStatus.UNKNOWN


class AlertManager:
    """告警管理器"""
    
    def __init__(self, collector: MetricsCollector):
        self.collector = collector
        self._rules: Dict[str, AlertRule] = {}
        self._alerts: List[Alert] = []
        self._last_alert_time: Dict[str, datetime] = {}
        self._alert_handlers: List[Callable[[Alert], Awaitable[None]]] = []
    
    def add_rule(self, rule: AlertRule):
        """添加告警規則"""
        self._rules[rule.name] = rule
    
    def remove_rule(self, name: str):
        """移除告警規則"""
        self._rules.pop(name, None)
    
    def add_handler(self, handler: Callable[[Alert], Awaitable[None]]):
        """添加告警處理器"""
        self._alert_handlers.append(handler)
    
    async def check_alerts(self):
        """檢查告警"""
        now = datetime.now()
        
        for rule in self._rules.values():
            # 獲取指標值
            value = self.collector.get_gauge(rule.metric_name)
            if value == 0:
                value = self.collector.get_counter(rule.metric_name)
            
            # 檢查冷卻
            last_alert = self._last_alert_time.get(rule.name)
            if last_alert and (now - last_alert).total_seconds() < rule.cooldown_seconds:
                continue
            
            # 檢查閾值
            if rule.check(value):
                alert = Alert(
                    rule_name=rule.name,
                    severity=rule.severity,
                    message=rule.message_template.format(value=value, threshold=rule.threshold),
                    metric_value=value,
                    threshold=rule.threshold
                )
                self._alerts.append(alert)
                self._last_alert_time[rule.name] = now
                
                # 調用處理器
                for handler in self._alert_handlers:
                    try:
                        await handler(alert)
                    except Exception as e:
                        logger.error(f"Alert handler error: {e}")
    
    def get_active_alerts(self) -> List[Alert]:
        """獲取活躍告警"""
        return [a for a in self._alerts if not a.acknowledged]
    
    def acknowledge_alert(self, index: int):
        """確認告警"""
        if 0 <= index < len(self._alerts):
            self._alerts[index].acknowledged = True
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """獲取告警歷史"""
        cutoff = datetime.now() - timedelta(hours=hours)
        return [a for a in self._alerts if a.timestamp > cutoff]


class MonitoringService:
    """監控服務"""
    
    def __init__(self):
        self.metrics = MetricsCollector()
        self.system_metrics = SystemMetricsCollector(self.metrics)
        self.health_checker = HealthChecker()
        self.alert_manager = AlertManager(self.metrics)
        
        self._running = False
        self._collection_task: Optional[asyncio.Task] = None
        self._alert_task: Optional[asyncio.Task] = None
        
        # 註冊默認告警規則
        self._register_default_alerts()
    
    def _register_default_alerts(self):
        """註冊默認告警規則"""
        self.alert_manager.add_rule(AlertRule(
            name="high_cpu",
            metric_name="system.cpu.percent",
            condition=">=",
            threshold=90,
            severity=AlertSeverity.CRITICAL,
            message_template="CPU 使用率過高: {value:.1f}%（閾值: {threshold}%）"
        ))
        
        self.alert_manager.add_rule(AlertRule(
            name="high_memory",
            metric_name="system.memory.percent",
            condition=">=",
            threshold=90,
            severity=AlertSeverity.CRITICAL,
            message_template="內存使用率過高: {value:.1f}%（閾值: {threshold}%）"
        ))
        
        self.alert_manager.add_rule(AlertRule(
            name="low_disk",
            metric_name="system.disk.percent",
            condition=">=",
            threshold=90,
            severity=AlertSeverity.WARNING,
            message_template="磁盤空間不足: 已使用 {value:.1f}%（閾值: {threshold}%）"
        ))
        
        self.alert_manager.add_rule(AlertRule(
            name="high_error_rate",
            metric_name="api.errors.total",
            condition=">",
            threshold=100,
            severity=AlertSeverity.WARNING,
            message_template="錯誤數過多: {value:.0f}（閾值: {threshold}）",
            cooldown_seconds=600
        ))
    
    async def start(self):
        """啟動監控服務"""
        if self._running:
            return
        
        self._running = True
        self._collection_task = asyncio.create_task(self._collect_loop())
        self._alert_task = asyncio.create_task(self._alert_loop())
        logger.info("Monitoring service started")
    
    async def stop(self):
        """停止監控服務"""
        self._running = False
        
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        
        if self._alert_task:
            self._alert_task.cancel()
            try:
                await self._alert_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Monitoring service stopped")
    
    async def _collect_loop(self):
        """指標收集循環"""
        while self._running:
            try:
                self.system_metrics.collect()
                # 🆕 性能優化：將收集間隔從 10 秒增加到 30 秒
                await asyncio.sleep(30)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(60)
    
    async def _alert_loop(self):
        """告警檢查循環"""
        while self._running:
            try:
                await self.alert_manager.check_alerts()
                await asyncio.sleep(60)  # 每分鐘檢查一次
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Alert check error: {e}")
                await asyncio.sleep(60)
    
    async def get_status(self) -> Dict[str, Any]:
        """獲取監控狀態"""
        health_results = await self.health_checker.run_all()
        
        return {
            "overall_health": self.health_checker.get_overall_status(health_results).value,
            "health_checks": {k: v.to_dict() for k, v in health_results.items()},
            "metrics": self.metrics.get_all_metrics(),
            "active_alerts": [a.to_dict() for a in self.alert_manager.get_active_alerts()],
            "timestamp": datetime.now().isoformat()
        }
    
    def record_request(self, endpoint: str, method: str, status_code: int, duration_ms: float):
        """記錄 API 請求"""
        labels = {"endpoint": endpoint, "method": method}
        self.metrics.increment("api.requests.total", labels=labels)
        self.metrics.histogram("api.request.duration_ms", duration_ms, labels=labels)
        
        if status_code >= 400:
            self.metrics.increment("api.errors.total", labels={"endpoint": endpoint, "status": str(status_code)})
    
    def record_message_sent(self, success: bool, account_id: str = ""):
        """記錄消息發送"""
        labels = {"account": account_id} if account_id else {}
        self.metrics.increment("messages.sent.total", labels=labels)
        if success:
            self.metrics.increment("messages.sent.success", labels=labels)
        else:
            self.metrics.increment("messages.sent.failed", labels=labels)
    
    def record_account_status(self, online_count: int, total_count: int):
        """記錄帳號狀態"""
        self.metrics.gauge("accounts.online", online_count)
        self.metrics.gauge("accounts.total", total_count)
        if total_count > 0:
            self.metrics.gauge("accounts.online_ratio", online_count / total_count * 100)


# 全局實例
_monitoring_service: Optional[MonitoringService] = None


def init_monitoring() -> MonitoringService:
    """初始化監控服務"""
    global _monitoring_service
    _monitoring_service = MonitoringService()
    return _monitoring_service


def get_monitoring() -> Optional[MonitoringService]:
    """獲取監控服務"""
    return _monitoring_service


__all__ = [
    'MetricType',
    'HealthStatus',
    'AlertSeverity',
    'Metric',
    'HealthCheck',
    'AlertRule',
    'Alert',
    'MetricsCollector',
    'SystemMetricsCollector',
    'HealthChecker',
    'AlertManager',
    'MonitoringService',
    'init_monitoring',
    'get_monitoring'
]
