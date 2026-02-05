"""
API 健康检查和自动轮换服务

功能：
1. 定期检查 API 健康状态
2. 自动轮换问题 API
3. 实现渐进式恢复策略
4. 提供 API 负载均衡
"""

import sys
import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """健康状态"""
    HEALTHY = "healthy"           # 健康
    DEGRADED = "degraded"         # 降级（有问题但可用）
    UNHEALTHY = "unhealthy"       # 不健康（暂停使用）
    RECOVERING = "recovering"     # 恢复中
    UNKNOWN = "unknown"           # 未知


@dataclass
class HealthMetrics:
    """健康指标"""
    api_id: str
    status: HealthStatus = HealthStatus.UNKNOWN
    success_rate: float = 0.0
    error_rate: float = 0.0
    avg_response_time: float = 0.0
    recent_errors: int = 0
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    last_check: float = 0
    last_success: float = 0
    last_failure: float = 0
    recovery_attempts: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'api_id': self.api_id,
            'status': self.status.value,
            'success_rate': round(self.success_rate, 2),
            'error_rate': round(self.error_rate, 2),
            'avg_response_time': round(self.avg_response_time, 2),
            'recent_errors': self.recent_errors,
            'consecutive_failures': self.consecutive_failures,
            'consecutive_successes': self.consecutive_successes,
            'last_check': self.last_check,
            'recovery_attempts': self.recovery_attempts
        }


@dataclass
class HealthConfig:
    """健康检查配置"""
    check_interval: int = 60                    # 检查间隔（秒）
    failure_threshold: int = 3                  # 连续失败阈值
    success_threshold: int = 5                  # 恢复所需连续成功次数
    degraded_threshold: float = 70.0            # 降级阈值（成功率）
    unhealthy_threshold: float = 50.0           # 不健康阈值（成功率）
    recovery_backoff_base: int = 60             # 恢复退避基础时间（秒）
    recovery_backoff_max: int = 3600            # 最大退避时间（1小时）
    response_time_threshold: float = 10.0       # 响应时间阈值（秒）
    sample_window: int = 100                    # 采样窗口大小


@dataclass
class ApiSample:
    """API 采样数据"""
    timestamp: float
    success: bool
    response_time: float
    error: str = ""


class ApiHealthChecker:
    """
    API 健康检查器
    
    职责：
    1. 追踪每个 API 的健康指标
    2. 基于滑动窗口计算成功率
    3. 实现渐进式恢复策略
    4. 提供健康状态查询
    """
    
    def __init__(
        self,
        config: Optional[HealthConfig] = None,
        on_status_change: Optional[Callable[[str, HealthStatus, HealthStatus], None]] = None
    ):
        self.config = config or HealthConfig()
        self.on_status_change = on_status_change
        
        # 健康指标
        self._metrics: Dict[str, HealthMetrics] = {}
        
        # 采样数据
        self._samples: Dict[str, List[ApiSample]] = {}
        
        # 恢复计划
        self._recovery_schedule: Dict[str, float] = {}
        
        # 监控任务
        self._monitor_task: Optional[asyncio.Task] = None
        
        print("[ApiHealthChecker] 初始化健康检查器", file=sys.stderr)
    
    # ==================== 采样记录 ====================
    
    def record_success(
        self,
        api_id: str,
        response_time: float = 0.0
    ) -> None:
        """记录成功请求"""
        self._ensure_api(api_id)
        
        sample = ApiSample(
            timestamp=time.time(),
            success=True,
            response_time=response_time
        )
        self._add_sample(api_id, sample)
        
        # 更新指标
        metrics = self._metrics[api_id]
        metrics.consecutive_successes += 1
        metrics.consecutive_failures = 0
        metrics.last_success = time.time()
        
        # 检查是否可以恢复
        self._check_recovery(api_id)
        
        # 重新计算健康状态
        self._update_health_status(api_id)
    
    def record_failure(
        self,
        api_id: str,
        error: str = "",
        response_time: float = 0.0
    ) -> None:
        """记录失败请求"""
        self._ensure_api(api_id)
        
        sample = ApiSample(
            timestamp=time.time(),
            success=False,
            response_time=response_time,
            error=error
        )
        self._add_sample(api_id, sample)
        
        # 更新指标
        metrics = self._metrics[api_id]
        metrics.consecutive_failures += 1
        metrics.consecutive_successes = 0
        metrics.last_failure = time.time()
        metrics.recent_errors += 1
        
        # 检查是否需要降级
        self._check_degradation(api_id)
        
        # 重新计算健康状态
        self._update_health_status(api_id)
    
    def _add_sample(self, api_id: str, sample: ApiSample) -> None:
        """添加采样"""
        if api_id not in self._samples:
            self._samples[api_id] = []
        
        samples = self._samples[api_id]
        samples.append(sample)
        
        # 保持窗口大小
        if len(samples) > self.config.sample_window:
            samples.pop(0)
    
    def _ensure_api(self, api_id: str) -> None:
        """确保 API 存在"""
        if api_id not in self._metrics:
            self._metrics[api_id] = HealthMetrics(api_id=api_id)
    
    # ==================== 健康计算 ====================
    
    def _update_health_status(self, api_id: str) -> None:
        """更新健康状态"""
        if api_id not in self._metrics:
            return
        
        metrics = self._metrics[api_id]
        old_status = metrics.status
        
        # 计算成功率
        samples = self._samples.get(api_id, [])
        if samples:
            success_count = sum(1 for s in samples if s.success)
            metrics.success_rate = success_count / len(samples) * 100
            metrics.error_rate = 100 - metrics.success_rate
            
            # 计算平均响应时间
            response_times = [s.response_time for s in samples if s.response_time > 0]
            if response_times:
                metrics.avg_response_time = sum(response_times) / len(response_times)
        
        metrics.last_check = time.time()
        
        # 判断状态
        if metrics.consecutive_failures >= self.config.failure_threshold:
            new_status = HealthStatus.UNHEALTHY
        elif metrics.status == HealthStatus.RECOVERING:
            if metrics.consecutive_successes >= self.config.success_threshold:
                new_status = HealthStatus.HEALTHY
            else:
                new_status = HealthStatus.RECOVERING
        elif metrics.success_rate < self.config.unhealthy_threshold:
            new_status = HealthStatus.UNHEALTHY
        elif metrics.success_rate < self.config.degraded_threshold:
            new_status = HealthStatus.DEGRADED
        else:
            new_status = HealthStatus.HEALTHY
        
        # 状态变更
        if new_status != old_status:
            metrics.status = new_status
            self._on_status_change(api_id, old_status, new_status)
    
    def _on_status_change(
        self,
        api_id: str,
        old_status: HealthStatus,
        new_status: HealthStatus
    ) -> None:
        """处理状态变更"""
        print(f"[ApiHealthChecker] API {api_id} 状态变更: {old_status.value} -> {new_status.value}",
              file=sys.stderr)
        
        if self.on_status_change:
            try:
                self.on_status_change(api_id, old_status, new_status)
            except Exception as e:
                print(f"[ApiHealthChecker] 回调错误: {e}", file=sys.stderr)
    
    # ==================== 降级和恢复 ====================
    
    def _check_degradation(self, api_id: str) -> None:
        """检查是否需要降级"""
        metrics = self._metrics.get(api_id)
        if not metrics:
            return
        
        # 连续失败达到阈值，进入不健康状态
        if metrics.consecutive_failures >= self.config.failure_threshold:
            if metrics.status != HealthStatus.UNHEALTHY:
                old_status = metrics.status
                metrics.status = HealthStatus.UNHEALTHY
                
                # 安排恢复
                self._schedule_recovery(api_id)
                
                self._on_status_change(api_id, old_status, HealthStatus.UNHEALTHY)
    
    def _schedule_recovery(self, api_id: str) -> None:
        """安排恢复尝试"""
        metrics = self._metrics.get(api_id)
        if not metrics:
            return
        
        # 指数退避
        backoff = min(
            self.config.recovery_backoff_base * (2 ** metrics.recovery_attempts),
            self.config.recovery_backoff_max
        )
        
        recovery_time = time.time() + backoff
        self._recovery_schedule[api_id] = recovery_time
        
        metrics.recovery_attempts += 1
        
        print(f"[ApiHealthChecker] API {api_id} 将在 {backoff} 秒后尝试恢复 "
              f"(第 {metrics.recovery_attempts} 次)", file=sys.stderr)
    
    def _check_recovery(self, api_id: str) -> None:
        """检查是否可以恢复"""
        metrics = self._metrics.get(api_id)
        if not metrics:
            return
        
        if metrics.status == HealthStatus.RECOVERING:
            if metrics.consecutive_successes >= self.config.success_threshold:
                # 恢复成功
                old_status = metrics.status
                metrics.status = HealthStatus.HEALTHY
                metrics.recovery_attempts = 0
                self._recovery_schedule.pop(api_id, None)
                
                print(f"[ApiHealthChecker] ✅ API {api_id} 恢复成功", file=sys.stderr)
                self._on_status_change(api_id, old_status, HealthStatus.HEALTHY)
    
    def start_recovery(self, api_id: str) -> bool:
        """开始恢复尝试"""
        metrics = self._metrics.get(api_id)
        if not metrics:
            return False
        
        if metrics.status == HealthStatus.UNHEALTHY:
            metrics.status = HealthStatus.RECOVERING
            metrics.consecutive_successes = 0
            print(f"[ApiHealthChecker] API {api_id} 开始恢复尝试", file=sys.stderr)
            return True
        
        return False
    
    def is_recovery_due(self, api_id: str) -> bool:
        """检查是否到达恢复时间"""
        scheduled = self._recovery_schedule.get(api_id)
        if scheduled:
            return time.time() >= scheduled
        return False
    
    # ==================== 查询接口 ====================
    
    def get_health(self, api_id: str) -> Optional[HealthMetrics]:
        """获取 API 健康指标"""
        return self._metrics.get(api_id)
    
    def get_all_health(self) -> Dict[str, HealthMetrics]:
        """获取所有 API 健康指标"""
        return self._metrics.copy()
    
    def get_healthy_apis(self) -> List[str]:
        """获取所有健康的 API"""
        return [
            api_id for api_id, metrics in self._metrics.items()
            if metrics.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]
        ]
    
    def get_unhealthy_apis(self) -> List[str]:
        """获取所有不健康的 API"""
        return [
            api_id for api_id, metrics in self._metrics.items()
            if metrics.status == HealthStatus.UNHEALTHY
        ]
    
    def get_recovering_apis(self) -> List[str]:
        """获取所有恢复中的 API"""
        return [
            api_id for api_id, metrics in self._metrics.items()
            if metrics.status == HealthStatus.RECOVERING
        ]
    
    def is_healthy(self, api_id: str) -> bool:
        """检查 API 是否健康"""
        metrics = self._metrics.get(api_id)
        if not metrics:
            return True  # 未知状态默认健康
        return metrics.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED, HealthStatus.UNKNOWN]
    
    def get_health_summary(self) -> Dict[str, Any]:
        """获取健康摘要"""
        total = len(self._metrics)
        if total == 0:
            return {
                'total': 0,
                'healthy': 0,
                'degraded': 0,
                'unhealthy': 0,
                'recovering': 0,
                'health_ratio': 100.0
            }
        
        status_counts = {
            HealthStatus.HEALTHY: 0,
            HealthStatus.DEGRADED: 0,
            HealthStatus.UNHEALTHY: 0,
            HealthStatus.RECOVERING: 0,
            HealthStatus.UNKNOWN: 0
        }
        
        for metrics in self._metrics.values():
            status_counts[metrics.status] += 1
        
        healthy = status_counts[HealthStatus.HEALTHY]
        degraded = status_counts[HealthStatus.DEGRADED]
        
        return {
            'total': total,
            'healthy': healthy,
            'degraded': degraded,
            'unhealthy': status_counts[HealthStatus.UNHEALTHY],
            'recovering': status_counts[HealthStatus.RECOVERING],
            'health_ratio': (healthy + degraded) / total * 100
        }
    
    # ==================== 监控循环 ====================
    
    async def start_monitoring(self) -> None:
        """启动监控任务"""
        if self._monitor_task:
            return
        
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        print("[ApiHealthChecker] 启动健康监控", file=sys.stderr)
    
    async def stop_monitoring(self) -> None:
        """停止监控任务"""
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
    
    async def _monitor_loop(self) -> None:
        """监控循环"""
        while True:
            try:
                await asyncio.sleep(self.config.check_interval)
                
                # 检查需要恢复的 API
                for api_id in list(self._recovery_schedule.keys()):
                    if self.is_recovery_due(api_id):
                        self.start_recovery(api_id)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ApiHealthChecker] 监控错误: {e}", file=sys.stderr)


class LoadBalancer:
    """
    负载均衡器
    
    策略：
    1. 加权轮询（根据健康状态和容量）
    2. 最少连接
    3. 随机选择（带权重）
    """
    
    def __init__(self, health_checker: Optional[ApiHealthChecker] = None):
        self.health_checker = health_checker
        self._weights: Dict[str, float] = {}
        self._round_robin_index = 0
        
    def set_weight(self, api_id: str, weight: float) -> None:
        """设置 API 权重"""
        self._weights[api_id] = max(0, weight)
    
    def get_weight(self, api_id: str) -> float:
        """获取 API 权重"""
        base_weight = self._weights.get(api_id, 1.0)
        
        # 根据健康状态调整权重
        if self.health_checker:
            metrics = self.health_checker.get_health(api_id)
            if metrics:
                if metrics.status == HealthStatus.UNHEALTHY:
                    return 0  # 不健康的不参与负载均衡
                elif metrics.status == HealthStatus.DEGRADED:
                    return base_weight * 0.5  # 降级的降低权重
                elif metrics.status == HealthStatus.RECOVERING:
                    return base_weight * 0.3  # 恢复中的更低权重
        
        return base_weight
    
    def select_api(self, available_apis: List[str]) -> Optional[str]:
        """选择一个 API（加权轮询）"""
        if not available_apis:
            return None
        
        # 过滤健康的 API
        healthy_apis = [
            api_id for api_id in available_apis
            if self.get_weight(api_id) > 0
        ]
        
        if not healthy_apis:
            # 如果没有健康的，从恢复中的选择
            if self.health_checker:
                recovering = [
                    api_id for api_id in available_apis
                    if api_id in self.health_checker.get_recovering_apis()
                ]
                if recovering:
                    return recovering[0]
            return None
        
        # 加权轮询
        total_weight = sum(self.get_weight(api_id) for api_id in healthy_apis)
        if total_weight == 0:
            return healthy_apis[0]
        
        # 简单轮询（可以改进为加权）
        self._round_robin_index = (self._round_robin_index + 1) % len(healthy_apis)
        return healthy_apis[self._round_robin_index]


# ==================== 全局实例 ====================

_health_checker: Optional[ApiHealthChecker] = None
_load_balancer: Optional[LoadBalancer] = None


def get_health_checker() -> ApiHealthChecker:
    """获取全局健康检查器"""
    global _health_checker
    if _health_checker is None:
        _health_checker = ApiHealthChecker()
    return _health_checker


def get_load_balancer() -> LoadBalancer:
    """获取全局负载均衡器"""
    global _load_balancer
    if _load_balancer is None:
        _load_balancer = LoadBalancer(get_health_checker())
    return _load_balancer


async def init_health_service(
    config: Optional[HealthConfig] = None,
    on_status_change: Optional[Callable] = None
) -> ApiHealthChecker:
    """初始化健康检查服务"""
    global _health_checker, _load_balancer
    _health_checker = ApiHealthChecker(config=config, on_status_change=on_status_change)
    _load_balancer = LoadBalancer(_health_checker)
    await _health_checker.start_monitoring()
    return _health_checker
