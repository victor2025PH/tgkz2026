"""
自动扩缩容策略引擎
==================

功能：
1. 容量监控与预测
2. 自动扩容建议/执行
3. 自动缩容（禁用闲置 API）
4. 策略配置管理
5. 扩缩容历史记录

策略类型：
- 阈值策略：超过阈值触发
- 预测策略：基于趋势预测
- 时间策略：按时间段调整
- 混合策略：多种策略组合
"""

import sys
import asyncio
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ScalingAction(Enum):
    """扩缩容动作"""
    SCALE_UP = "scale_up"       # 扩容
    SCALE_DOWN = "scale_down"   # 缩容
    ENABLE_API = "enable_api"   # 启用 API
    DISABLE_API = "disable_api" # 禁用 API
    NONE = "none"               # 无操作


class ScalingTrigger(Enum):
    """触发原因"""
    THRESHOLD = "threshold"     # 阈值触发
    PREDICTION = "prediction"   # 预测触发
    SCHEDULE = "schedule"       # 定时触发
    MANUAL = "manual"           # 手动触发
    RECOVERY = "recovery"       # 恢复触发


class ScalingMode(Enum):
    """扩缩容模式"""
    AUTO = "auto"           # 全自动
    SEMI_AUTO = "semi_auto" # 半自动（需确认）
    MANUAL = "manual"       # 纯手动
    DISABLED = "disabled"   # 禁用


@dataclass
class ScalingPolicy:
    """扩缩容策略"""
    id: str
    name: str
    enabled: bool = True
    
    # 扩容设置
    scale_up_threshold: float = 80.0      # 使用率触发扩容
    scale_up_count: int = 2               # 每次扩容数量
    scale_up_cooldown: int = 300          # 扩容冷却时间（秒）
    
    # 缩容设置
    scale_down_threshold: float = 30.0    # 使用率触发缩容
    scale_down_count: int = 1             # 每次缩容数量
    scale_down_cooldown: int = 600        # 缩容冷却时间（秒）
    min_api_count: int = 2                # 最小 API 数量
    
    # 预测设置
    prediction_enabled: bool = True
    prediction_horizon: int = 3600        # 预测时间范围（秒）
    prediction_threshold: float = 90.0    # 预测触发阈值
    
    # 时间策略
    schedule_enabled: bool = False
    peak_hours: List[int] = field(default_factory=lambda: [9, 10, 11, 14, 15, 16])
    peak_multiplier: float = 1.5          # 高峰期容量倍数
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "enabled": self.enabled,
            "scale_up_threshold": self.scale_up_threshold,
            "scale_up_count": self.scale_up_count,
            "scale_up_cooldown": self.scale_up_cooldown,
            "scale_down_threshold": self.scale_down_threshold,
            "scale_down_count": self.scale_down_count,
            "scale_down_cooldown": self.scale_down_cooldown,
            "min_api_count": self.min_api_count,
            "prediction_enabled": self.prediction_enabled,
            "prediction_horizon": self.prediction_horizon,
            "prediction_threshold": self.prediction_threshold,
            "schedule_enabled": self.schedule_enabled,
            "peak_hours": self.peak_hours,
            "peak_multiplier": self.peak_multiplier
        }


@dataclass
class ScalingDecision:
    """扩缩容决策"""
    action: ScalingAction
    trigger: ScalingTrigger
    count: int = 0
    api_ids: List[str] = field(default_factory=list)
    reason: str = ""
    confidence: float = 0.0
    timestamp: float = field(default_factory=time.time)
    executed: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "action": self.action.value,
            "trigger": self.trigger.value,
            "count": self.count,
            "api_ids": self.api_ids,
            "reason": self.reason,
            "confidence": self.confidence,
            "timestamp": self.timestamp,
            "executed": self.executed
        }


@dataclass
class ScalingRecord:
    """扩缩容记录"""
    id: str
    decision: ScalingDecision
    before_state: Dict
    after_state: Dict
    success: bool
    error: str = ""
    duration_ms: int = 0
    created_at: float = field(default_factory=time.time)


class AutoScalingEngine:
    """
    自动扩缩容引擎
    
    核心功能：
    1. 实时监控容量使用
    2. 评估扩缩容需求
    3. 生成扩缩容决策
    4. 执行或等待确认
    """
    
    def __init__(
        self,
        mode: ScalingMode = ScalingMode.SEMI_AUTO,
        on_decision: Optional[Callable[[ScalingDecision], None]] = None
    ):
        self.mode = mode
        self.on_decision = on_decision
        
        # 策略配置
        self._policy = ScalingPolicy(
            id="default",
            name="默认策略"
        )
        
        # 状态
        self._running = False
        self._last_scale_up: float = 0
        self._last_scale_down: float = 0
        self._pending_decisions: List[ScalingDecision] = []
        
        # 历史记录
        self._history: List[ScalingRecord] = []
        self._max_history = 100
        
        # 容量数据（用于预测）
        self._capacity_samples: List[Tuple[float, float]] = []  # (timestamp, utilization)
        self._max_samples = 360  # 保留 6 小时数据（每分钟采样）
        
        # 统计
        self._stats = {
            "decisions_made": 0,
            "scale_ups": 0,
            "scale_downs": 0,
            "predictions_triggered": 0
        }
        
        logger.info(f"AutoScalingEngine initialized in {mode.value} mode")
    
    # ==================== 策略管理 ====================
    
    def get_policy(self) -> ScalingPolicy:
        """获取当前策略"""
        return self._policy
    
    def update_policy(self, **kwargs) -> ScalingPolicy:
        """更新策略配置"""
        for key, value in kwargs.items():
            if hasattr(self._policy, key):
                setattr(self._policy, key, value)
        
        logger.info(f"Policy updated: {kwargs}")
        return self._policy
    
    def set_mode(self, mode: ScalingMode) -> None:
        """设置扩缩容模式"""
        self.mode = mode
        logger.info(f"Scaling mode set to: {mode.value}")
    
    # ==================== 容量评估 ====================
    
    def record_capacity(self, utilization: float) -> None:
        """记录容量使用数据"""
        now = time.time()
        self._capacity_samples.append((now, utilization))
        
        # 清理旧数据
        cutoff = now - (self._max_samples * 60)
        self._capacity_samples = [
            (t, u) for t, u in self._capacity_samples if t > cutoff
        ]
    
    def get_capacity_trend(self) -> Dict[str, Any]:
        """获取容量趋势"""
        if len(self._capacity_samples) < 10:
            return {
                "direction": "unknown",
                "rate": 0,
                "samples": len(self._capacity_samples)
            }
        
        # 计算趋势
        recent = self._capacity_samples[-30:]
        if len(recent) < 2:
            return {"direction": "stable", "rate": 0, "samples": len(recent)}
        
        # 线性回归计算斜率
        n = len(recent)
        sum_x = sum(i for i in range(n))
        sum_y = sum(u for _, u in recent)
        sum_xy = sum(i * u for i, (_, u) in enumerate(recent))
        sum_xx = sum(i * i for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x) if n > 1 else 0
        
        # 每分钟变化率
        rate_per_minute = slope
        
        if rate_per_minute > 0.5:
            direction = "increasing"
        elif rate_per_minute < -0.5:
            direction = "decreasing"
        else:
            direction = "stable"
        
        return {
            "direction": direction,
            "rate": rate_per_minute,
            "samples": len(self._capacity_samples),
            "current": recent[-1][1] if recent else 0
        }
    
    def predict_exhaustion(self) -> Dict[str, Any]:
        """预测容量耗尽时间"""
        trend = self.get_capacity_trend()
        
        if trend["direction"] != "increasing" or trend["rate"] <= 0:
            return {
                "will_exhaust": False,
                "time_to_exhaustion": None,
                "confidence": 0.8
            }
        
        current = trend.get("current", 0)
        rate = trend["rate"]
        
        if rate <= 0:
            return {"will_exhaust": False, "time_to_exhaustion": None, "confidence": 0.8}
        
        # 计算到达 100% 的时间（分钟）
        remaining = 100 - current
        minutes_to_full = remaining / rate if rate > 0 else float('inf')
        
        # 转换为秒
        seconds_to_full = minutes_to_full * 60
        
        # 置信度基于样本数量
        confidence = min(0.95, 0.5 + (len(self._capacity_samples) / self._max_samples) * 0.45)
        
        return {
            "will_exhaust": seconds_to_full < self._policy.prediction_horizon,
            "time_to_exhaustion": seconds_to_full,
            "confidence": confidence,
            "current_rate": rate
        }
    
    # ==================== 决策生成 ====================
    
    async def evaluate(self, pool_status: Dict) -> Optional[ScalingDecision]:
        """
        评估是否需要扩缩容
        
        Args:
            pool_status: API 池状态信息
        
        Returns:
            扩缩容决策或 None
        """
        if not self._policy.enabled or self.mode == ScalingMode.DISABLED:
            return None
        
        utilization = pool_status.get("utilization", 0)
        available = pool_status.get("available_apis", 0)
        total = pool_status.get("total_apis", 0)
        
        # 记录容量数据
        self.record_capacity(utilization)
        
        # 检查是否需要扩容
        scale_up_decision = await self._check_scale_up(utilization, pool_status)
        if scale_up_decision:
            return scale_up_decision
        
        # 检查是否需要缩容
        scale_down_decision = await self._check_scale_down(utilization, pool_status)
        if scale_down_decision:
            return scale_down_decision
        
        return None
    
    async def _check_scale_up(self, utilization: float, pool_status: Dict) -> Optional[ScalingDecision]:
        """检查是否需要扩容"""
        now = time.time()
        
        # 冷却期检查
        if now - self._last_scale_up < self._policy.scale_up_cooldown:
            return None
        
        decision = None
        
        # 阈值检查
        if utilization >= self._policy.scale_up_threshold:
            decision = ScalingDecision(
                action=ScalingAction.SCALE_UP,
                trigger=ScalingTrigger.THRESHOLD,
                count=self._policy.scale_up_count,
                reason=f"使用率 {utilization:.1f}% 超过阈值 {self._policy.scale_up_threshold}%",
                confidence=0.9
            )
        
        # 预测检查
        elif self._policy.prediction_enabled:
            prediction = self.predict_exhaustion()
            if prediction["will_exhaust"]:
                time_left = prediction["time_to_exhaustion"]
                decision = ScalingDecision(
                    action=ScalingAction.SCALE_UP,
                    trigger=ScalingTrigger.PREDICTION,
                    count=self._policy.scale_up_count,
                    reason=f"预测 {time_left/60:.0f} 分钟后容量耗尽",
                    confidence=prediction["confidence"]
                )
                self._stats["predictions_triggered"] += 1
        
        # 时间策略
        if self._policy.schedule_enabled and not decision:
            current_hour = datetime.now().hour
            if current_hour in self._policy.peak_hours:
                target = int(pool_status.get("total_apis", 0) * self._policy.peak_multiplier)
                if pool_status.get("available_apis", 0) < target:
                    decision = ScalingDecision(
                        action=ScalingAction.SCALE_UP,
                        trigger=ScalingTrigger.SCHEDULE,
                        count=target - pool_status.get("available_apis", 0),
                        reason=f"高峰时段 ({current_hour}:00) 预扩容",
                        confidence=0.85
                    )
        
        if decision:
            self._stats["decisions_made"] += 1
            await self._handle_decision(decision)
        
        return decision
    
    async def _check_scale_down(self, utilization: float, pool_status: Dict) -> Optional[ScalingDecision]:
        """检查是否需要缩容"""
        now = time.time()
        
        # 冷却期检查
        if now - self._last_scale_down < self._policy.scale_down_cooldown:
            return None
        
        # 最小 API 数量检查
        if pool_status.get("total_apis", 0) <= self._policy.min_api_count:
            return None
        
        # 阈值检查
        if utilization <= self._policy.scale_down_threshold:
            # 找出可以禁用的 API（闲置时间最长的）
            idle_apis = pool_status.get("idle_apis", [])
            
            if idle_apis:
                count = min(self._policy.scale_down_count, len(idle_apis))
                decision = ScalingDecision(
                    action=ScalingAction.SCALE_DOWN,
                    trigger=ScalingTrigger.THRESHOLD,
                    count=count,
                    api_ids=idle_apis[:count],
                    reason=f"使用率 {utilization:.1f}% 低于阈值 {self._policy.scale_down_threshold}%",
                    confidence=0.85
                )
                
                self._stats["decisions_made"] += 1
                await self._handle_decision(decision)
                return decision
        
        return None
    
    async def _handle_decision(self, decision: ScalingDecision) -> None:
        """处理决策"""
        # 通知回调
        if self.on_decision:
            try:
                self.on_decision(decision)
            except Exception as e:
                logger.error(f"Decision callback error: {e}")
        
        # 根据模式处理
        if self.mode == ScalingMode.AUTO:
            # 自动执行
            await self.execute_decision(decision)
        elif self.mode == ScalingMode.SEMI_AUTO:
            # 等待确认
            self._pending_decisions.append(decision)
            logger.info(f"Decision pending confirmation: {decision.action.value}")
        else:
            # 仅记录
            logger.info(f"Decision recorded (manual mode): {decision.action.value}")
    
    # ==================== 决策执行 ====================
    
    async def execute_decision(self, decision: ScalingDecision) -> ScalingRecord:
        """执行扩缩容决策"""
        start_time = time.time()
        
        # 获取执行前状态
        before_state = await self._get_pool_state()
        
        try:
            if decision.action == ScalingAction.SCALE_UP:
                await self._execute_scale_up(decision)
                self._last_scale_up = time.time()
                self._stats["scale_ups"] += 1
                
            elif decision.action == ScalingAction.SCALE_DOWN:
                await self._execute_scale_down(decision)
                self._last_scale_down = time.time()
                self._stats["scale_downs"] += 1
            
            decision.executed = True
            
            # 获取执行后状态
            after_state = await self._get_pool_state()
            
            record = ScalingRecord(
                id=f"scale-{int(time.time() * 1000)}",
                decision=decision,
                before_state=before_state,
                after_state=after_state,
                success=True,
                duration_ms=int((time.time() - start_time) * 1000)
            )
            
        except Exception as e:
            logger.error(f"Execute scaling failed: {e}")
            
            record = ScalingRecord(
                id=f"scale-{int(time.time() * 1000)}",
                decision=decision,
                before_state=before_state,
                after_state=before_state,
                success=False,
                error=str(e),
                duration_ms=int((time.time() - start_time) * 1000)
            )
        
        # 保存记录
        self._add_to_history(record)
        
        return record
    
    async def _execute_scale_up(self, decision: ScalingDecision) -> None:
        """执行扩容"""
        # 这里调用 API 池的扩容方法
        # 实际实现需要连接到 API 池管理器
        logger.info(f"Executing scale up: {decision.count} APIs")
        
        # 发送事件
        from core.event_emitter import event_emitter, EventType
        event_emitter.emit(EventType.SYSTEM_STATUS, {
            "action": "scale_up",
            "count": decision.count,
            "reason": decision.reason
        })
    
    async def _execute_scale_down(self, decision: ScalingDecision) -> None:
        """执行缩容"""
        logger.info(f"Executing scale down: {decision.count} APIs")
        
        # 发送事件
        from core.event_emitter import event_emitter, EventType
        event_emitter.emit(EventType.SYSTEM_STATUS, {
            "action": "scale_down",
            "count": decision.count,
            "api_ids": decision.api_ids,
            "reason": decision.reason
        })
    
    async def _get_pool_state(self) -> Dict:
        """获取 API 池状态"""
        try:
            from core.api_pool import get_api_pool
            pool = get_api_pool()
            if pool:
                return pool.get_pool_status()
        except:
            pass
        return {}
    
    # ==================== 待确认决策管理 ====================
    
    def get_pending_decisions(self) -> List[ScalingDecision]:
        """获取待确认的决策"""
        return self._pending_decisions.copy()
    
    async def confirm_decision(self, decision_index: int = 0) -> Optional[ScalingRecord]:
        """确认并执行决策"""
        if decision_index >= len(self._pending_decisions):
            return None
        
        decision = self._pending_decisions.pop(decision_index)
        return await self.execute_decision(decision)
    
    async def reject_decision(self, decision_index: int = 0) -> Optional[ScalingDecision]:
        """拒绝决策"""
        if decision_index >= len(self._pending_decisions):
            return None
        
        decision = self._pending_decisions.pop(decision_index)
        logger.info(f"Decision rejected: {decision.action.value}")
        return decision
    
    def clear_pending(self) -> int:
        """清除所有待确认决策"""
        count = len(self._pending_decisions)
        self._pending_decisions.clear()
        return count
    
    # ==================== 历史记录 ====================
    
    def _add_to_history(self, record: ScalingRecord) -> None:
        """添加到历史记录"""
        self._history.append(record)
        
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
    
    def get_history(self, limit: int = 20) -> List[Dict]:
        """获取历史记录"""
        records = self._history[-limit:]
        return [
            {
                "id": r.id,
                "decision": r.decision.to_dict(),
                "before_state": r.before_state,
                "after_state": r.after_state,
                "success": r.success,
                "error": r.error,
                "duration_ms": r.duration_ms,
                "created_at": r.created_at
            }
            for r in reversed(records)
        ]
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            **self._stats,
            "mode": self.mode.value,
            "policy_enabled": self._policy.enabled,
            "pending_count": len(self._pending_decisions),
            "history_count": len(self._history),
            "last_scale_up": self._last_scale_up,
            "last_scale_down": self._last_scale_down
        }


# ==================== 全局实例 ====================

_engine: Optional[AutoScalingEngine] = None


def get_auto_scaling_engine() -> AutoScalingEngine:
    """获取自动扩缩容引擎"""
    global _engine
    if _engine is None:
        _engine = AutoScalingEngine()
    return _engine


def init_auto_scaling(
    mode: ScalingMode = ScalingMode.SEMI_AUTO,
    on_decision: Optional[Callable[[ScalingDecision], None]] = None
) -> AutoScalingEngine:
    """初始化自动扩缩容引擎"""
    global _engine
    _engine = AutoScalingEngine(mode=mode, on_decision=on_decision)
    return _engine
