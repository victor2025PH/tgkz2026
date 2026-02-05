"""
TG-Matrix Metrics Service
监控指标服务 - 提供系统运行状态监控

设计原则：
1. 低开销：不影响主业务性能
2. 实时性：关键指标实时更新
3. 可观测：支持 Prometheus 格式导出
4. 告警：超阈值自动告警
"""

import asyncio
import time
import sys
import psutil
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """指标类型"""
    COUNTER = "counter"       # 累计计数
    GAUGE = "gauge"           # 实时值
    HISTOGRAM = "histogram"   # 直方图
    SUMMARY = "summary"       # 摘要


class AlertLevel(str, Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Metric:
    """指标定义"""
    name: str
    type: MetricType
    description: str
    value: float = 0
    labels: Dict[str, str] = field(default_factory=dict)
    timestamp: float = field(default_factory=time.time)
    
    def to_prometheus(self) -> str:
        """转换为 Prometheus 格式"""
        label_str = ""
        if self.labels:
            label_pairs = [f'{k}="{v}"' for k, v in self.labels.items()]
            label_str = "{" + ",".join(label_pairs) + "}"
        
        return f"{self.name}{label_str} {self.value}"


@dataclass
class AlertRule:
    """告警规则"""
    name: str
    metric_name: str
    condition: str          # "gt", "lt", "eq", "gte", "lte"
    threshold: float
    level: AlertLevel
    message_template: str
    cooldown: int = 300     # 冷却时间（秒）
    last_fired: float = 0


@dataclass
class Alert:
    """告警"""
    id: str
    rule_name: str
    level: AlertLevel
    message: str
    metric_name: str
    metric_value: float
    threshold: float
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'rule_name': self.rule_name,
            'level': self.level.value,
            'message': self.message,
            'metric_name': self.metric_name,
            'metric_value': self.metric_value,
            'threshold': self.threshold,
            'timestamp': self.timestamp,
        }


class MetricsService:
    """
    监控指标服务
    
    职责：
    1. 收集和存储指标
    2. 提供指标查询
    3. 执行告警规则
    4. 导出 Prometheus 格式
    """
    
    def __init__(
        self,
        event_callback: Optional[Callable[[str, Any], None]] = None,
        collection_interval: int = 10
    ):
        self.event_callback = event_callback
        self.collection_interval = collection_interval
        
        # 指标存储
        self._metrics: Dict[str, Metric] = {}
        self._metric_history: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=360)  # 保留1小时数据（10秒间隔）
        )
        
        # 告警规则
        self._alert_rules: Dict[str, AlertRule] = {}
        self._active_alerts: Dict[str, Alert] = {}
        self._alert_history: deque = deque(maxlen=1000)
        
        # 后台任务
        self._collection_task: Optional[asyncio.Task] = None
        self._running = False
        
        # 初始化默认规则
        self._init_default_rules()
        
        print("[MetricsService] 初始化完成", file=sys.stderr)
    
    def _init_default_rules(self):
        """初始化默认告警规则"""
        default_rules = [
            AlertRule(
                name="high_memory_usage",
                metric_name="system_memory_percent",
                condition="gt",
                threshold=80,
                level=AlertLevel.WARNING,
                message_template="内存使用率超过 {threshold}%，当前: {value:.1f}%"
            ),
            AlertRule(
                name="critical_memory_usage",
                metric_name="system_memory_percent",
                condition="gt",
                threshold=90,
                level=AlertLevel.CRITICAL,
                message_template="内存使用率严重超标: {value:.1f}%"
            ),
            AlertRule(
                name="high_cpu_usage",
                metric_name="system_cpu_percent",
                condition="gt",
                threshold=80,
                level=AlertLevel.WARNING,
                message_template="CPU使用率超过 {threshold}%，当前: {value:.1f}%"
            ),
            AlertRule(
                name="low_online_accounts",
                metric_name="account_pool_hot_count",
                condition="lt",
                threshold=1,
                level=AlertLevel.WARNING,
                message_template="在线账号数过低: {value:.0f}"
            ),
            AlertRule(
                name="high_error_rate",
                metric_name="error_rate_per_minute",
                condition="gt",
                threshold=10,
                level=AlertLevel.ERROR,
                message_template="错误率过高: {value:.1f}/分钟"
            ),
            AlertRule(
                name="websocket_disconnected",
                metric_name="websocket_connections",
                condition="lt",
                threshold=1,
                level=AlertLevel.INFO,
                message_template="WebSocket连接数: {value:.0f}"
            ),
        ]
        
        for rule in default_rules:
            self._alert_rules[rule.name] = rule
    
    # ==================== 指标操作 ====================
    
    def set_gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None, description: str = ""):
        """设置 Gauge 指标"""
        key = self._make_key(name, labels)
        self._metrics[key] = Metric(
            name=name,
            type=MetricType.GAUGE,
            description=description,
            value=value,
            labels=labels or {},
            timestamp=time.time()
        )
        
        # 记录历史
        self._metric_history[key].append((time.time(), value))
    
    def inc_counter(self, name: str, value: float = 1, labels: Optional[Dict[str, str]] = None, description: str = ""):
        """增加 Counter 指标"""
        key = self._make_key(name, labels)
        
        if key not in self._metrics:
            self._metrics[key] = Metric(
                name=name,
                type=MetricType.COUNTER,
                description=description,
                value=0,
                labels=labels or {}
            )
        
        self._metrics[key].value += value
        self._metrics[key].timestamp = time.time()
    
    def observe_histogram(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """记录 Histogram 值"""
        # 简化实现：存储为最新值
        key = self._make_key(name, labels)
        self._metrics[key] = Metric(
            name=name,
            type=MetricType.HISTOGRAM,
            description="",
            value=value,
            labels=labels or {},
            timestamp=time.time()
        )
        self._metric_history[key].append((time.time(), value))
    
    def _make_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        """生成指标键"""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}{{{label_str}}}"
    
    # ==================== 指标查询 ====================
    
    def get_metric(self, name: str, labels: Optional[Dict[str, str]] = None) -> Optional[Metric]:
        """获取指标"""
        key = self._make_key(name, labels)
        return self._metrics.get(key)
    
    def get_all_metrics(self) -> List[Dict[str, Any]]:
        """获取所有指标"""
        return [
            {
                'name': m.name,
                'type': m.type.value,
                'value': m.value,
                'labels': m.labels,
                'timestamp': m.timestamp,
            }
            for m in self._metrics.values()
        ]
    
    def get_metrics_by_prefix(self, prefix: str) -> List[Metric]:
        """按前缀获取指标"""
        return [
            m for k, m in self._metrics.items()
            if m.name.startswith(prefix)
        ]
    
    def get_metric_history(self, name: str, labels: Optional[Dict[str, str]] = None, limit: int = 60) -> List[tuple]:
        """获取指标历史"""
        key = self._make_key(name, labels)
        history = list(self._metric_history.get(key, []))
        return history[-limit:]
    
    # ==================== Prometheus 导出 ====================
    
    def export_prometheus(self) -> str:
        """导出 Prometheus 格式"""
        lines = [
            "# TG-Matrix Metrics",
            f"# Generated at {datetime.utcnow().isoformat()}",
            ""
        ]
        
        # 按名称分组
        by_name = defaultdict(list)
        for metric in self._metrics.values():
            by_name[metric.name].append(metric)
        
        for name, metrics in sorted(by_name.items()):
            if metrics:
                m = metrics[0]
                lines.append(f"# HELP {name} {m.description}")
                lines.append(f"# TYPE {name} {m.type.value}")
                for metric in metrics:
                    lines.append(metric.to_prometheus())
                lines.append("")
        
        return "\n".join(lines)
    
    # ==================== 告警 ====================
    
    def add_alert_rule(self, rule: AlertRule):
        """添加告警规则"""
        self._alert_rules[rule.name] = rule
    
    def check_alerts(self):
        """检查告警规则"""
        now = time.time()
        
        for rule in self._alert_rules.values():
            # 检查冷却
            if now - rule.last_fired < rule.cooldown:
                continue
            
            # 获取指标值
            metric = None
            for m in self._metrics.values():
                if m.name == rule.metric_name:
                    metric = m
                    break
            
            if not metric:
                continue
            
            # 检查条件
            triggered = False
            if rule.condition == "gt" and metric.value > rule.threshold:
                triggered = True
            elif rule.condition == "lt" and metric.value < rule.threshold:
                triggered = True
            elif rule.condition == "gte" and metric.value >= rule.threshold:
                triggered = True
            elif rule.condition == "lte" and metric.value <= rule.threshold:
                triggered = True
            elif rule.condition == "eq" and metric.value == rule.threshold:
                triggered = True
            
            if triggered:
                self._fire_alert(rule, metric)
    
    def _fire_alert(self, rule: AlertRule, metric: Metric):
        """触发告警"""
        rule.last_fired = time.time()
        
        alert = Alert(
            id=f"alert_{int(time.time())}_{rule.name}",
            rule_name=rule.name,
            level=rule.level,
            message=rule.message_template.format(
                value=metric.value,
                threshold=rule.threshold
            ),
            metric_name=rule.metric_name,
            metric_value=metric.value,
            threshold=rule.threshold
        )
        
        self._active_alerts[alert.id] = alert
        self._alert_history.append(alert)
        
        print(f"[MetricsService] 🚨 告警: {rule.level.value} - {alert.message}", file=sys.stderr)
        
        # 发送事件
        if self.event_callback:
            self.event_callback('alert.fired', alert.to_dict())
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """获取活跃告警"""
        return [a.to_dict() for a in self._active_alerts.values()]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """确认告警"""
        if alert_id in self._active_alerts:
            del self._active_alerts[alert_id]
            return True
        return False
    
    # ==================== 系统指标收集 ====================
    
    def collect_system_metrics(self):
        """收集系统指标"""
        try:
            # CPU
            cpu_percent = psutil.cpu_percent(interval=None)
            self.set_gauge("system_cpu_percent", cpu_percent, description="CPU使用率")
            
            # 内存
            memory = psutil.virtual_memory()
            self.set_gauge("system_memory_percent", memory.percent, description="内存使用率")
            self.set_gauge("system_memory_used_bytes", memory.used, description="已用内存")
            self.set_gauge("system_memory_available_bytes", memory.available, description="可用内存")
            
            # 进程
            process = psutil.Process()
            process_memory = process.memory_info()
            self.set_gauge("process_memory_rss_bytes", process_memory.rss, description="进程RSS内存")
            self.set_gauge("process_memory_vms_bytes", process_memory.vms, description="进程VMS内存")
            
            # 线程
            self.set_gauge("process_threads", process.num_threads(), description="进程线程数")
            
        except Exception as e:
            print(f"[MetricsService] 收集系统指标错误: {e}", file=sys.stderr)
    
    def collect_pool_metrics(self, pool_stats: Dict[str, Any]):
        """收集连接池指标"""
        self.set_gauge("account_pool_total", pool_stats.get('total_accounts', 0), description="总账号数")
        self.set_gauge("account_pool_hot_count", pool_stats.get('hot_count', 0), description="Hot池账号数")
        self.set_gauge("account_pool_warm_count", pool_stats.get('warm_count', 0), description="Warm池账号数")
        self.set_gauge("account_pool_cold_count", pool_stats.get('cold_count', 0), description="Cold池账号数")
        self.set_gauge("account_pool_hot_limit", pool_stats.get('hot_limit', 10), description="Hot池上限")
        
        # 统计
        stats = pool_stats.get('stats', {})
        self.set_gauge("account_pool_promotions_total", stats.get('promotions', 0), description="提升次数")
        self.set_gauge("account_pool_demotions_total", stats.get('demotions', 0), description="降级次数")
    
    def collect_message_metrics(self, aggregator_stats: Dict[str, Any]):
        """收集消息指标"""
        self.set_gauge("message_total", aggregator_stats.get('total_messages', 0), description="消息总数")
        self.set_gauge("message_delivered", aggregator_stats.get('delivered', 0), description="已送达消息")
        self.set_gauge("message_confirmed", aggregator_stats.get('confirmed', 0), description="已确认消息")
        self.set_gauge("message_failed", aggregator_stats.get('failed', 0), description="失败消息")
        self.set_gauge("message_pending_acks", aggregator_stats.get('pending_acks', 0), description="待确认消息")
        self.set_gauge("websocket_connections", aggregator_stats.get('connected_users', 0), description="WebSocket连接数")
    
    def collect_error_metrics(self, error_stats: Dict[str, Any]):
        """收集错误指标"""
        self.set_gauge("error_total", error_stats.get('total_errors', 0), description="错误总数")
        self.set_gauge("error_recovered", error_stats.get('recovered', 0), description="已恢复错误")
        self.set_gauge("error_failed", error_stats.get('failed', 0), description="恢复失败")
        
        # 按类别
        by_category = error_stats.get('by_category', {})
        for category, count in by_category.items():
            self.set_gauge(
                "error_by_category",
                count,
                labels={'category': category},
                description=f"{category}类型错误数"
            )
    
    # ==================== 后台任务 ====================
    
    async def start(self):
        """启动后台收集任务"""
        if self._running:
            return
        
        self._running = True
        self._collection_task = asyncio.create_task(self._collection_loop())
        print("[MetricsService] 后台收集任务已启动", file=sys.stderr)
    
    async def stop(self):
        """停止后台任务"""
        self._running = False
        if self._collection_task:
            self._collection_task.cancel()
            try:
                await self._collection_task
            except asyncio.CancelledError:
                pass
        print("[MetricsService] 后台收集任务已停止", file=sys.stderr)
    
    async def _collection_loop(self):
        """收集循环"""
        while self._running:
            try:
                # 收集系统指标
                self.collect_system_metrics()
                
                # 检查告警
                self.check_alerts()
                
                await asyncio.sleep(self.collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[MetricsService] 收集任务错误: {e}", file=sys.stderr)
                await asyncio.sleep(30)
    
    # ==================== 仪表盘数据 ====================
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表盘数据"""
        return {
            'timestamp': time.time(),
            'system': {
                'cpu_percent': self._get_metric_value("system_cpu_percent"),
                'memory_percent': self._get_metric_value("system_memory_percent"),
                'process_memory_mb': self._get_metric_value("process_memory_rss_bytes") / 1024 / 1024,
                'threads': self._get_metric_value("process_threads"),
            },
            'pool': {
                'total': self._get_metric_value("account_pool_total"),
                'hot': self._get_metric_value("account_pool_hot_count"),
                'warm': self._get_metric_value("account_pool_warm_count"),
                'cold': self._get_metric_value("account_pool_cold_count"),
            },
            'messages': {
                'total': self._get_metric_value("message_total"),
                'delivered': self._get_metric_value("message_delivered"),
                'confirmed': self._get_metric_value("message_confirmed"),
                'pending': self._get_metric_value("message_pending_acks"),
            },
            'errors': {
                'total': self._get_metric_value("error_total"),
                'recovered': self._get_metric_value("error_recovered"),
            },
            'websocket': {
                'connections': self._get_metric_value("websocket_connections"),
            },
            'alerts': {
                'active': len(self._active_alerts),
                'items': [a.to_dict() for a in list(self._active_alerts.values())[:10]]
            }
        }
    
    def _get_metric_value(self, name: str) -> float:
        """获取指标值"""
        for m in self._metrics.values():
            if m.name == name:
                return m.value
        return 0


# 全局实例
_metrics_instance: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """获取全局监控服务"""
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = MetricsService()
    return _metrics_instance


async def init_metrics_service(
    event_callback: Optional[Callable] = None
) -> MetricsService:
    """初始化监控服务"""
    global _metrics_instance
    _metrics_instance = MetricsService(event_callback=event_callback)
    await _metrics_instance.start()
    return _metrics_instance

