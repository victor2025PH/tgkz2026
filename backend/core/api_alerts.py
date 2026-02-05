"""
API 池告警服务

功能：
1. 多级告警（信息、警告、严重、紧急）
2. 告警聚合和去重
3. 告警通知推送
4. 告警历史记录
"""

import sys
import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class AlertLevel(Enum):
    """告警级别"""
    INFO = "info"           # 信息
    WARNING = "warning"     # 警告
    CRITICAL = "critical"   # 严重
    URGENT = "urgent"       # 紧急


class AlertType(Enum):
    """告警类型"""
    # 容量相关
    POOL_EXHAUSTED = "pool_exhausted"           # API 池耗尽
    POOL_LOW_CAPACITY = "pool_low_capacity"     # 容量不足
    API_FULL = "api_full"                       # 单个 API 已满
    
    # 健康相关
    API_UNHEALTHY = "api_unhealthy"             # API 不健康
    API_DEGRADED = "api_degraded"               # API 降级
    LOW_SUCCESS_RATE = "low_success_rate"       # 成功率低
    HIGH_ERROR_RATE = "high_error_rate"         # 错误率高
    
    # 性能相关
    SLOW_RESPONSE = "slow_response"             # 响应慢
    HIGH_LATENCY = "high_latency"               # 高延迟
    
    # 系统相关
    SERVICE_ERROR = "service_error"             # 服务错误
    DB_ERROR = "db_error"                       # 数据库错误
    
    # 恢复相关
    API_RECOVERED = "api_recovered"             # API 恢复
    POOL_RECOVERED = "pool_recovered"           # 池恢复


@dataclass
class Alert:
    """告警"""
    id: str
    type: AlertType
    level: AlertLevel
    title: str
    message: str
    api_id: str = ""
    timestamp: float = field(default_factory=time.time)
    resolved: bool = False
    resolved_at: float = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type.value,
            'level': self.level.value,
            'title': self.title,
            'message': self.message,
            'api_id': self.api_id,
            'timestamp': self.timestamp,
            'resolved': self.resolved,
            'resolved_at': self.resolved_at,
            'metadata': self.metadata
        }


@dataclass
class AlertRule:
    """告警规则"""
    type: AlertType
    level: AlertLevel
    threshold: float
    cooldown: int = 300  # 冷却时间（秒）
    auto_resolve: bool = True
    enabled: bool = True


class AlertService:
    """
    告警服务
    
    职责：
    1. 管理告警规则
    2. 触发和管理告警
    3. 通知推送
    4. 告警历史
    """
    
    def __init__(
        self,
        on_alert: Optional[Callable[[Alert], None]] = None,
        max_history: int = 1000
    ):
        self.on_alert = on_alert
        self.max_history = max_history
        
        # 告警规则
        self._rules: Dict[AlertType, AlertRule] = {}
        self._init_default_rules()
        
        # 活跃告警
        self._active_alerts: Dict[str, Alert] = {}
        
        # 告警历史
        self._alert_history: List[Alert] = []
        
        # 冷却记录（防止重复告警）
        self._cooldowns: Dict[str, float] = {}
        
        # 告警计数
        self._alert_count = 0
        
        # 事件回调（用于发射实时事件）
        self._event_callback: Optional[Callable[[Alert], None]] = None
        
        print("[AlertService] 初始化告警服务", file=sys.stderr)
    
    def set_event_callback(self, callback: Callable[[Alert], None]) -> None:
        """设置事件回调，告警触发时调用"""
        self._event_callback = callback
    
    def _init_default_rules(self) -> None:
        """初始化默认规则"""
        default_rules = [
            AlertRule(AlertType.POOL_EXHAUSTED, AlertLevel.URGENT, 0, 600),
            AlertRule(AlertType.POOL_LOW_CAPACITY, AlertLevel.WARNING, 80, 300),
            AlertRule(AlertType.API_FULL, AlertLevel.INFO, 100, 300),
            AlertRule(AlertType.API_UNHEALTHY, AlertLevel.CRITICAL, 0, 300),
            AlertRule(AlertType.API_DEGRADED, AlertLevel.WARNING, 0, 300),
            AlertRule(AlertType.LOW_SUCCESS_RATE, AlertLevel.WARNING, 70, 300),
            AlertRule(AlertType.HIGH_ERROR_RATE, AlertLevel.CRITICAL, 30, 300),
            AlertRule(AlertType.SLOW_RESPONSE, AlertLevel.WARNING, 10, 300),
            AlertRule(AlertType.SERVICE_ERROR, AlertLevel.CRITICAL, 0, 600),
            AlertRule(AlertType.API_RECOVERED, AlertLevel.INFO, 0, 0),
            AlertRule(AlertType.POOL_RECOVERED, AlertLevel.INFO, 0, 0),
        ]
        
        for rule in default_rules:
            self._rules[rule.type] = rule
    
    # ==================== 告警触发 ====================
    
    def trigger(
        self,
        alert_type: AlertType,
        title: str,
        message: str,
        api_id: str = "",
        level: Optional[AlertLevel] = None,
        metadata: Dict[str, Any] = None
    ) -> Optional[Alert]:
        """触发告警"""
        rule = self._rules.get(alert_type)
        
        # 检查规则
        if rule and not rule.enabled:
            return None
        
        # 检查冷却
        cooldown_key = f"{alert_type.value}:{api_id}"
        if self._is_in_cooldown(cooldown_key):
            return None
        
        # 确定级别
        if level is None:
            level = rule.level if rule else AlertLevel.WARNING
        
        # 创建告警
        self._alert_count += 1
        alert = Alert(
            id=f"alert-{self._alert_count}",
            type=alert_type,
            level=level,
            title=title,
            message=message,
            api_id=api_id,
            metadata=metadata or {}
        )
        
        # 保存活跃告警
        self._active_alerts[alert.id] = alert
        
        # 设置冷却
        if rule:
            self._set_cooldown(cooldown_key, rule.cooldown)
        
        # 添加到历史
        self._add_to_history(alert)
        
        # 通知
        self._notify(alert)
        
        print(f"[AlertService] 🔔 {level.value.upper()}: {title}", file=sys.stderr)
        
        return alert
    
    def resolve(self, alert_id: str) -> bool:
        """解决告警"""
        alert = self._active_alerts.get(alert_id)
        if not alert:
            return False
        
        alert.resolved = True
        alert.resolved_at = time.time()
        
        del self._active_alerts[alert_id]
        
        print(f"[AlertService] ✅ 告警已解决: {alert.title}", file=sys.stderr)
        
        return True
    
    def resolve_by_type(self, alert_type: AlertType, api_id: str = "") -> int:
        """按类型解决告警"""
        resolved_count = 0
        
        to_resolve = [
            alert_id for alert_id, alert in self._active_alerts.items()
            if alert.type == alert_type and (not api_id or alert.api_id == api_id)
        ]
        
        for alert_id in to_resolve:
            if self.resolve(alert_id):
                resolved_count += 1
        
        return resolved_count
    
    # ==================== 便捷方法 ====================
    
    def alert_pool_exhausted(self) -> Optional[Alert]:
        """告警：API 池耗尽"""
        return self.trigger(
            AlertType.POOL_EXHAUSTED,
            "API 池已耗尽",
            "所有 API 都不可用，请立即添加新的 API 或检查现有 API 状态",
            level=AlertLevel.URGENT
        )
    
    def alert_pool_low_capacity(self, usage_percent: float) -> Optional[Alert]:
        """告警：容量不足"""
        return self.trigger(
            AlertType.POOL_LOW_CAPACITY,
            "API 池容量不足",
            f"当前使用率 {usage_percent:.1f}%，建议添加更多 API",
            metadata={'usage_percent': usage_percent}
        )
    
    def alert_api_unhealthy(self, api_id: str, reason: str = "") -> Optional[Alert]:
        """告警：API 不健康"""
        return self.trigger(
            AlertType.API_UNHEALTHY,
            f"API 不健康: {api_id[:8]}...",
            f"API {api_id} 状态异常: {reason}",
            api_id=api_id,
            level=AlertLevel.CRITICAL,
            metadata={'reason': reason}
        )
    
    def alert_api_degraded(self, api_id: str, success_rate: float) -> Optional[Alert]:
        """告警：API 降级"""
        return self.trigger(
            AlertType.API_DEGRADED,
            f"API 降级: {api_id[:8]}...",
            f"API {api_id} 成功率降至 {success_rate:.1f}%",
            api_id=api_id,
            metadata={'success_rate': success_rate}
        )
    
    def alert_low_success_rate(self, api_id: str, rate: float) -> Optional[Alert]:
        """告警：成功率低"""
        return self.trigger(
            AlertType.LOW_SUCCESS_RATE,
            f"成功率过低: {api_id[:8]}...",
            f"API {api_id} 成功率只有 {rate:.1f}%",
            api_id=api_id,
            metadata={'success_rate': rate}
        )
    
    def alert_high_error_rate(self, api_id: str, rate: float) -> Optional[Alert]:
        """告警：错误率高"""
        return self.trigger(
            AlertType.HIGH_ERROR_RATE,
            f"错误率过高: {api_id[:8]}...",
            f"API {api_id} 错误率达到 {rate:.1f}%",
            api_id=api_id,
            level=AlertLevel.CRITICAL,
            metadata={'error_rate': rate}
        )
    
    def alert_api_recovered(self, api_id: str) -> Optional[Alert]:
        """通知：API 恢复"""
        # 同时解决相关告警
        self.resolve_by_type(AlertType.API_UNHEALTHY, api_id)
        self.resolve_by_type(AlertType.API_DEGRADED, api_id)
        
        return self.trigger(
            AlertType.API_RECOVERED,
            f"API 已恢复: {api_id[:8]}...",
            f"API {api_id} 已恢复正常工作",
            api_id=api_id,
            level=AlertLevel.INFO
        )
    
    # ==================== 冷却管理 ====================
    
    def _is_in_cooldown(self, key: str) -> bool:
        """检查是否在冷却中"""
        cooldown_until = self._cooldowns.get(key, 0)
        return time.time() < cooldown_until
    
    def _set_cooldown(self, key: str, seconds: int) -> None:
        """设置冷却"""
        if seconds > 0:
            self._cooldowns[key] = time.time() + seconds
    
    # ==================== 历史和通知 ====================
    
    def _add_to_history(self, alert: Alert) -> None:
        """添加到历史"""
        self._alert_history.append(alert)
        
        # 限制历史大小
        if len(self._alert_history) > self.max_history:
            self._alert_history = self._alert_history[-self.max_history:]
    
    def _notify(self, alert: Alert) -> None:
        """发送通知"""
        if self.on_alert:
            try:
                self.on_alert(alert)
            except Exception as e:
                print(f"[AlertService] 通知发送失败: {e}", file=sys.stderr)
        
        # 触发事件回调（用于实时推送）
        if self._event_callback:
            try:
                self._event_callback(alert)
            except Exception as e:
                print(f"[AlertService] 事件回调失败: {e}", file=sys.stderr)
    
    # ==================== 查询接口 ====================
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        return list(self._active_alerts.values())
    
    def get_active_by_level(self, level: AlertLevel) -> List[Alert]:
        """按级别获取活跃告警"""
        return [a for a in self._active_alerts.values() if a.level == level]
    
    def get_alert_history(self, limit: int = 50) -> List[Alert]:
        """获取告警历史"""
        return list(reversed(self._alert_history[-limit:]))
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """获取告警摘要"""
        active = list(self._active_alerts.values())
        
        level_counts = {
            AlertLevel.INFO: 0,
            AlertLevel.WARNING: 0,
            AlertLevel.CRITICAL: 0,
            AlertLevel.URGENT: 0
        }
        
        for alert in active:
            level_counts[alert.level] += 1
        
        return {
            'total_active': len(active),
            'info': level_counts[AlertLevel.INFO],
            'warning': level_counts[AlertLevel.WARNING],
            'critical': level_counts[AlertLevel.CRITICAL],
            'urgent': level_counts[AlertLevel.URGENT],
            'total_history': len(self._alert_history)
        }
    
    def get_alerts_for_dashboard(self) -> Dict[str, Any]:
        """获取仪表板告警数据"""
        return {
            'summary': self.get_alert_summary(),
            'active': [a.to_dict() for a in self.get_active_alerts()],
            'recent': [a.to_dict() for a in self.get_alert_history(limit=20)]
        }
    
    # ==================== 规则管理 ====================
    
    def set_rule(self, rule: AlertRule) -> None:
        """设置规则"""
        self._rules[rule.type] = rule
    
    def get_rule(self, alert_type: AlertType) -> Optional[AlertRule]:
        """获取规则"""
        return self._rules.get(alert_type)
    
    def enable_rule(self, alert_type: AlertType) -> bool:
        """启用规则"""
        rule = self._rules.get(alert_type)
        if rule:
            rule.enabled = True
            return True
        return False
    
    def disable_rule(self, alert_type: AlertType) -> bool:
        """禁用规则"""
        rule = self._rules.get(alert_type)
        if rule:
            rule.enabled = False
            return True
        return False


# ==================== 全局实例 ====================

_alert_service: Optional[AlertService] = None


def get_alert_service() -> AlertService:
    """获取全局告警服务"""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService()
    return _alert_service


def init_alert_service(
    on_alert: Optional[Callable[[Alert], None]] = None,
    max_history: int = 1000
) -> AlertService:
    """初始化告警服务"""
    global _alert_service
    _alert_service = AlertService(on_alert=on_alert, max_history=max_history)
    return _alert_service
