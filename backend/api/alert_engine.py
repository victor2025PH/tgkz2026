"""
P15-3: 运维告警规则引擎

功能：
1. 声明式告警规则（阈值 + 检查函数 + 严重等级）
2. 每次调用 evaluate() 检查所有规则，生成 alert 列表
3. 告警去重 — 同一规则连续触发只记录一次 (cool-down 机制)
4. 历史告警环形缓冲区（最近 200 条）
5. 为 /api/v1/metrics/alerts 端点提供数据
"""

import time
import logging
import threading
from typing import Dict, Any, Optional, List, Callable
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


# ==================== 告警严重等级 ====================

class Severity(str, Enum):
    INFO = 'info'
    WARNING = 'warning'
    CRITICAL = 'critical'


@dataclass
class AlertRule:
    """告警规则定义"""
    name: str
    description: str
    severity: Severity
    check_fn: Callable[[], Optional[Dict[str, Any]]]  # 返回 None = 正常, dict = 告警详情
    cooldown_seconds: int = 300  # 同一规则 5 分钟内不重复触发


@dataclass
class Alert:
    """一条告警记录"""
    rule_name: str
    severity: str
    message: str
    details: Dict[str, Any]
    timestamp: str
    resolved: bool = False

    def to_dict(self) -> dict:
        return {
            'rule_name': self.rule_name,
            'severity': self.severity,
            'message': self.message,
            'details': self.details,
            'timestamp': self.timestamp,
            'resolved': self.resolved,
        }


# ==================== 告警引擎 ====================

class AlertEngine:
    """P15-3: 运维告警引擎单例"""

    _instance: Optional['AlertEngine'] = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._rules: List[AlertRule] = []
        self._history: deque = deque(maxlen=200)  # 环形缓冲
        self._active_alerts: Dict[str, Alert] = {}  # rule_name -> 当前活跃告警
        self._last_fired: Dict[str, float] = {}  # rule_name -> 上次触发时间戳
        self._eval_count: int = 0

        self._register_default_rules()
        self._initialized = True
        logger.info("P15-3: AlertEngine initialized with %d rules", len(self._rules))

    @classmethod
    def get_instance(cls) -> 'AlertEngine':
        return cls()

    # ==================== 规则注册 ====================

    def _register_default_rules(self):
        """注册默认告警规则"""

        # 规则 1: API 错误率 > 5%
        self._rules.append(AlertRule(
            name='high_error_rate',
            description='API error rate exceeds 5%',
            severity=Severity.CRITICAL,
            check_fn=self._check_high_error_rate,
            cooldown_seconds=300,
        ))

        # 规则 2: P95 响应时间 > 2000ms
        self._rules.append(AlertRule(
            name='slow_response_p95',
            description='API P95 response time > 2000ms',
            severity=Severity.WARNING,
            check_fn=self._check_slow_response,
            cooldown_seconds=300,
        ))

        # 规则 3: 缓存命中率 < 10%（缓存启用后）
        self._rules.append(AlertRule(
            name='low_cache_hit_rate',
            description='Cache hit rate below 10%',
            severity=Severity.WARNING,
            check_fn=self._check_low_cache_hit_rate,
            cooldown_seconds=600,
        ))

        # 规则 4: 限流封禁率 > 2%
        self._rules.append(AlertRule(
            name='high_rate_limit_blocks',
            description='Rate limiter blocking > 2% of requests',
            severity=Severity.WARNING,
            check_fn=self._check_rate_limit_blocks,
            cooldown_seconds=300,
        ))

        # 规则 5: 数据库连接泄漏
        self._rules.append(AlertRule(
            name='db_connection_leak',
            description='Potentially leaked DB connections detected',
            severity=Severity.CRITICAL,
            check_fn=self._check_db_connection_leak,
            cooldown_seconds=600,
        ))

        # 规则 6: WAL 文件过大 (>100MB)
        self._rules.append(AlertRule(
            name='wal_too_large',
            description='SQLite WAL file exceeds 100MB',
            severity=Severity.WARNING,
            check_fn=self._check_wal_size,
            cooldown_seconds=1800,
        ))

        # 规则 7: 慢查询激增
        self._rules.append(AlertRule(
            name='slow_query_surge',
            description='Too many slow queries (>10 in recent window)',
            severity=Severity.WARNING,
            check_fn=self._check_slow_query_surge,
            cooldown_seconds=300,
        ))

    # ==================== 检查函数 ====================

    def _check_high_error_rate(self) -> Optional[Dict[str, Any]]:
        """检查 API 错误率"""
        try:
            from api.perf_metrics import ApiMetrics
            metrics = ApiMetrics.get_instance()
            summary = metrics.get_summary()
            total = summary.get('total_requests', 0)
            if total < 50:  # 样本太少不判断
                return None
            errors = sum(
                v for k, v in summary.get('status_distribution', {}).items()
                if k.startswith('5')
            )
            error_rate = errors / max(total, 1) * 100
            if error_rate > 5.0:
                return {
                    'error_rate': round(error_rate, 2),
                    'total_requests': total,
                    'server_errors': errors,
                }
        except Exception:
            pass
        return None

    def _check_slow_response(self) -> Optional[Dict[str, Any]]:
        """检查 P95 响应时间"""
        try:
            from api.perf_metrics import ApiMetrics
            metrics = ApiMetrics.get_instance()
            summary = metrics.get_summary()
            latency = summary.get('latency_percentiles', {})
            p95 = latency.get('p95_ms', 0)
            if p95 > 2000:
                return {
                    'p95_ms': p95,
                    'p99_ms': latency.get('p99_ms', 0),
                    'avg_ms': latency.get('avg_ms', 0),
                }
        except Exception:
            pass
        return None

    def _check_low_cache_hit_rate(self) -> Optional[Dict[str, Any]]:
        """检查缓存命中率"""
        try:
            from api.response_cache import ResponseCache
            stats = ResponseCache.get_instance().get_stats()
            total = stats.get('total_requests', 0)
            if total < 100:  # 样本太少
                return None
            hit_rate = stats.get('hit_rate_pct', 100)
            if hit_rate < 10:
                return {
                    'hit_rate_pct': hit_rate,
                    'total_requests': total,
                    'hits': stats.get('hits', 0),
                }
        except Exception:
            pass
        return None

    def _check_rate_limit_blocks(self) -> Optional[Dict[str, Any]]:
        """检查限流封禁率"""
        try:
            from core.rate_limiter import get_rate_limiter
            stats = get_rate_limiter().get_stats()
            total = stats.get('total_requests', 0)
            blocked = stats.get('blocked_requests', 0)
            if total < 50:
                return None
            block_rate = blocked / max(total, 1) * 100
            if block_rate > 2.0:
                return {
                    'block_rate': round(block_rate, 2),
                    'total_requests': total,
                    'blocked_requests': blocked,
                    'by_rule': stats.get('by_rule', {}),
                }
        except Exception:
            pass
        return None

    def _check_db_connection_leak(self) -> Optional[Dict[str, Any]]:
        """检查数据库连接泄漏"""
        try:
            from core.db_utils import ConnectionStats
            stats = ConnectionStats.stats()
            leaked = stats.get('potentially_leaked', 0)
            if leaked > 5:
                return {
                    'potentially_leaked': leaked,
                    'total_created': stats.get('total_created', 0),
                    'total_closed': stats.get('total_closed', 0),
                }
        except Exception:
            pass
        return None

    def _check_wal_size(self) -> Optional[Dict[str, Any]]:
        """检查 WAL 文件大小"""
        try:
            from api.db_health import DbHealthMonitor
            stats = DbHealthMonitor.get_instance().get_stats()
            pragma = stats.get('pragma', {})
            wal_mb = pragma.get('wal_size_mb', 0)
            if wal_mb > 100:
                return {
                    'wal_size_mb': wal_mb,
                    'db_size_mb': pragma.get('db_size_mb', 0),
                }
        except Exception:
            pass
        return None

    def _check_slow_query_surge(self) -> Optional[Dict[str, Any]]:
        """检查慢查询激增"""
        try:
            from db_connection_pool import get_connection_pool
            pool = get_connection_pool()
            if not pool:
                return None
            stats = pool.get_stats()
            slow_count = stats.get('slow_queries', 0)
            if slow_count > 10:
                recent = pool.get_slow_queries(5)
                return {
                    'slow_query_count': slow_count,
                    'recent_samples': recent,
                }
        except Exception:
            pass
        return None

    # ==================== 评估引擎 ====================

    def evaluate(self) -> List[Alert]:
        """评估所有规则，返回新产生的告警"""
        now = time.time()
        new_alerts: List[Alert] = []
        self._eval_count += 1

        for rule in self._rules:
            try:
                result = rule.check_fn()

                if result is not None:
                    # 触发告警 — 检查 cooldown
                    last = self._last_fired.get(rule.name, 0)
                    if now - last < rule.cooldown_seconds:
                        continue  # 冷却中，跳过

                    alert = Alert(
                        rule_name=rule.name,
                        severity=rule.severity.value,
                        message=rule.description,
                        details=result,
                        timestamp=datetime.utcnow().isoformat(),
                    )
                    new_alerts.append(alert)
                    self._active_alerts[rule.name] = alert
                    self._history.append(alert)
                    self._last_fired[rule.name] = now

                    logger.warning(
                        "P15-3 ALERT [%s] %s: %s",
                        rule.severity.value.upper(), rule.name, result
                    )
                else:
                    # 规则通过 — 如果之前有活跃告警，标记为已解决
                    if rule.name in self._active_alerts:
                        self._active_alerts[rule.name].resolved = True
                        del self._active_alerts[rule.name]

            except Exception as e:
                logger.debug("Alert rule '%s' check error: %s", rule.name, e)

        return new_alerts

    # ==================== 状态输出 ====================

    def get_status(self) -> Dict[str, Any]:
        """获取告警引擎状态 — 供 /api/v1/metrics/alerts"""
        # 每次获取状态时都先 evaluate
        self.evaluate()

        return {
            'rules_count': len(self._rules),
            'eval_count': self._eval_count,
            'active_alerts': [a.to_dict() for a in self._active_alerts.values()],
            'active_count': len(self._active_alerts),
            'history_recent': [a.to_dict() for a in list(self._history)[-20:]],
            'history_total': len(self._history),
            'rules': [
                {
                    'name': r.name,
                    'description': r.description,
                    'severity': r.severity.value,
                    'cooldown_seconds': r.cooldown_seconds,
                    'active': r.name in self._active_alerts,
                }
                for r in self._rules
            ],
        }
