"""
API 容量预警系统

功能：
1. 监控 API 池容量使用
2. 预测容量耗尽时间
3. 发送容量告警
4. 自动扩容建议
"""

import sys
import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@dataclass
class CapacityConfig:
    """容量配置"""
    warning_threshold: float = 75.0      # 警告阈值（%）
    critical_threshold: float = 90.0     # 严重阈值（%）
    urgent_threshold: float = 98.0       # 紧急阈值（%）
    check_interval: int = 60             # 检查间隔（秒）
    prediction_window: int = 24          # 预测窗口（小时）
    min_available_apis: int = 2          # 最小可用 API 数量


@dataclass
class CapacitySnapshot:
    """容量快照"""
    timestamp: float
    total_capacity: int
    used_capacity: int
    available_capacity: int
    usage_percent: float
    available_apis: int
    full_apis: int
    
    @property
    def is_warning(self) -> bool:
        return self.usage_percent >= 75
    
    @property
    def is_critical(self) -> bool:
        return self.usage_percent >= 90
    
    @property
    def is_urgent(self) -> bool:
        return self.usage_percent >= 98


@dataclass
class CapacityPrediction:
    """容量预测"""
    current_usage: float
    trend: str  # 'increasing', 'stable', 'decreasing'
    rate_per_hour: float  # 每小时增长率
    estimated_full_hours: Optional[float]  # 预计多少小时后耗尽
    confidence: float  # 置信度


class CapacityMonitor:
    """
    容量监控器
    
    职责：
    1. 定期检查容量
    2. 分析使用趋势
    3. 预测容量耗尽
    4. 触发容量告警
    """
    
    def __init__(
        self,
        config: Optional[CapacityConfig] = None,
        on_alert: Optional[Callable[[str, Dict[str, Any]], None]] = None
    ):
        self.config = config or CapacityConfig()
        self.on_alert = on_alert
        
        # 历史快照（用于趋势分析）
        self._snapshots: List[CapacitySnapshot] = []
        self._max_snapshots = 1440  # 保留 24 小时（每分钟一个）
        
        # 监控任务
        self._monitor_task: Optional[asyncio.Task] = None
        
        # 上次告警时间（防止重复告警）
        self._last_alerts: Dict[str, float] = {}
        self._alert_cooldown = 3600  # 1 小时冷却
        
        print("[CapacityMonitor] 初始化容量监控器", file=sys.stderr)
    
    # ==================== 快照采集 ====================
    
    def take_snapshot(self, pool_stats: Dict[str, Any]) -> CapacitySnapshot:
        """采集容量快照"""
        total = pool_stats.get('total_capacity', 0)
        used = pool_stats.get('total_used', 0)
        available = total - used
        usage_percent = (used / total * 100) if total > 0 else 0
        
        snapshot = CapacitySnapshot(
            timestamp=time.time(),
            total_capacity=total,
            used_capacity=used,
            available_capacity=available,
            usage_percent=usage_percent,
            available_apis=pool_stats.get('available_apis', 0),
            full_apis=pool_stats.get('full_apis', 0)
        )
        
        self._snapshots.append(snapshot)
        
        # 清理旧快照
        if len(self._snapshots) > self._max_snapshots:
            self._snapshots = self._snapshots[-self._max_snapshots:]
        
        return snapshot
    
    # ==================== 趋势分析 ====================
    
    def analyze_trend(self, hours: int = 6) -> CapacityPrediction:
        """分析容量使用趋势"""
        if len(self._snapshots) < 2:
            return CapacityPrediction(
                current_usage=self._snapshots[-1].usage_percent if self._snapshots else 0,
                trend='stable',
                rate_per_hour=0,
                estimated_full_hours=None,
                confidence=0
            )
        
        # 获取指定时间范围的快照
        cutoff = time.time() - hours * 3600
        recent = [s for s in self._snapshots if s.timestamp >= cutoff]
        
        if len(recent) < 2:
            recent = self._snapshots[-min(10, len(self._snapshots)):]
        
        # 计算趋势
        first = recent[0]
        last = recent[-1]
        time_diff_hours = (last.timestamp - first.timestamp) / 3600
        
        if time_diff_hours < 0.1:  # 不到 6 分钟的数据
            return CapacityPrediction(
                current_usage=last.usage_percent,
                trend='stable',
                rate_per_hour=0,
                estimated_full_hours=None,
                confidence=0.2
            )
        
        # 使用率变化
        usage_change = last.usage_percent - first.usage_percent
        rate_per_hour = usage_change / time_diff_hours
        
        # 确定趋势
        if rate_per_hour > 1:
            trend = 'increasing'
        elif rate_per_hour < -1:
            trend = 'decreasing'
        else:
            trend = 'stable'
        
        # 预测耗尽时间
        estimated_full_hours = None
        if rate_per_hour > 0.1:
            remaining = 100 - last.usage_percent
            estimated_full_hours = remaining / rate_per_hour
        
        # 计算置信度（基于数据量和一致性）
        confidence = min(len(recent) / 60, 1.0)  # 最多 60 个样本
        
        return CapacityPrediction(
            current_usage=last.usage_percent,
            trend=trend,
            rate_per_hour=round(rate_per_hour, 2),
            estimated_full_hours=round(estimated_full_hours, 1) if estimated_full_hours else None,
            confidence=round(confidence, 2)
        )
    
    # ==================== 容量检查 ====================
    
    async def check_capacity(self, pool_stats: Dict[str, Any]) -> List[Dict[str, Any]]:
        """检查容量并触发告警"""
        snapshot = self.take_snapshot(pool_stats)
        prediction = self.analyze_trend()
        
        alerts = []
        
        # 检查使用率阈值
        if snapshot.usage_percent >= self.config.urgent_threshold:
            alert = self._create_alert(
                'capacity_urgent',
                'urgent',
                f"API 池容量紧急：{snapshot.usage_percent:.1f}%",
                f"剩余容量仅 {snapshot.available_capacity} 个账号位置",
                {
                    'usage_percent': snapshot.usage_percent,
                    'available_capacity': snapshot.available_capacity,
                    'available_apis': snapshot.available_apis
                }
            )
            if alert:
                alerts.append(alert)
                
        elif snapshot.usage_percent >= self.config.critical_threshold:
            alert = self._create_alert(
                'capacity_critical',
                'critical',
                f"API 池容量严重不足：{snapshot.usage_percent:.1f}%",
                f"剩余容量 {snapshot.available_capacity} 个账号位置",
                {
                    'usage_percent': snapshot.usage_percent,
                    'available_capacity': snapshot.available_capacity
                }
            )
            if alert:
                alerts.append(alert)
                
        elif snapshot.usage_percent >= self.config.warning_threshold:
            alert = self._create_alert(
                'capacity_warning',
                'warning',
                f"API 池容量警告：{snapshot.usage_percent:.1f}%",
                f"建议添加更多 API 以应对增长",
                {
                    'usage_percent': snapshot.usage_percent,
                    'available_capacity': snapshot.available_capacity
                }
            )
            if alert:
                alerts.append(alert)
        
        # 检查可用 API 数量
        if snapshot.available_apis < self.config.min_available_apis:
            alert = self._create_alert(
                'low_available_apis',
                'critical' if snapshot.available_apis == 0 else 'warning',
                f"可用 API 数量不足：仅 {snapshot.available_apis} 个",
                f"请立即添加新的 API 或检查现有 API 状态",
                {'available_apis': snapshot.available_apis}
            )
            if alert:
                alerts.append(alert)
        
        # 检查预测耗尽
        if prediction.estimated_full_hours is not None:
            if prediction.estimated_full_hours <= 2:
                alert = self._create_alert(
                    'capacity_exhaustion_imminent',
                    'urgent',
                    f"预计 {prediction.estimated_full_hours:.1f} 小时后容量耗尽",
                    f"当前增长率 {prediction.rate_per_hour:.1f}%/小时",
                    {
                        'estimated_hours': prediction.estimated_full_hours,
                        'rate_per_hour': prediction.rate_per_hour
                    }
                )
                if alert:
                    alerts.append(alert)
                    
            elif prediction.estimated_full_hours <= 12:
                alert = self._create_alert(
                    'capacity_exhaustion_warning',
                    'warning',
                    f"预计 {prediction.estimated_full_hours:.1f} 小时后容量耗尽",
                    f"建议提前规划扩容",
                    {
                        'estimated_hours': prediction.estimated_full_hours,
                        'rate_per_hour': prediction.rate_per_hour
                    }
                )
                if alert:
                    alerts.append(alert)
        
        return alerts
    
    def _create_alert(
        self,
        alert_type: str,
        level: str,
        title: str,
        message: str,
        metadata: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """创建告警（带冷却检查）"""
        # 检查冷却
        last_time = self._last_alerts.get(alert_type, 0)
        if time.time() - last_time < self._alert_cooldown:
            return None
        
        # 更新告警时间
        self._last_alerts[alert_type] = time.time()
        
        alert = {
            'type': alert_type,
            'level': level,
            'title': title,
            'message': message,
            'metadata': metadata,
            'timestamp': time.time()
        }
        
        # 发送告警
        if self.on_alert:
            try:
                self.on_alert(alert_type, alert)
            except Exception as e:
                print(f"[CapacityMonitor] 告警发送失败: {e}", file=sys.stderr)
        
        print(f"[CapacityMonitor] 🔔 {level.upper()}: {title}", file=sys.stderr)
        
        return alert
    
    # ==================== 扩容建议 ====================
    
    def get_expansion_recommendation(self) -> Dict[str, Any]:
        """获取扩容建议"""
        if not self._snapshots:
            return {'recommendation': 'insufficient_data'}
        
        current = self._snapshots[-1]
        prediction = self.analyze_trend()
        
        # 计算建议
        recommendation = {
            'current_status': {
                'usage_percent': current.usage_percent,
                'available_capacity': current.available_capacity,
                'available_apis': current.available_apis,
                'full_apis': current.full_apis
            },
            'trend': prediction.trend,
            'rate_per_hour': prediction.rate_per_hour,
            'estimated_full_hours': prediction.estimated_full_hours
        }
        
        # 扩容建议
        if current.usage_percent >= 90:
            recommendation['action'] = 'expand_immediately'
            recommendation['urgency'] = 'critical'
            recommendation['suggested_apis'] = self._calculate_suggested_apis(current, prediction)
            recommendation['message'] = "建议立即添加 API，容量已接近上限"
            
        elif current.usage_percent >= 75:
            recommendation['action'] = 'plan_expansion'
            recommendation['urgency'] = 'high'
            recommendation['suggested_apis'] = self._calculate_suggested_apis(current, prediction)
            recommendation['message'] = "建议规划扩容，当前容量使用率较高"
            
        elif prediction.estimated_full_hours and prediction.estimated_full_hours <= 24:
            recommendation['action'] = 'prepare_expansion'
            recommendation['urgency'] = 'medium'
            recommendation['suggested_apis'] = self._calculate_suggested_apis(current, prediction)
            recommendation['message'] = f"按当前增长趋势，约 {prediction.estimated_full_hours:.1f} 小时后需要扩容"
            
        else:
            recommendation['action'] = 'monitor'
            recommendation['urgency'] = 'low'
            recommendation['suggested_apis'] = 0
            recommendation['message'] = "容量充足，继续监控即可"
        
        return recommendation
    
    def _calculate_suggested_apis(
        self,
        current: CapacitySnapshot,
        prediction: CapacityPrediction
    ) -> int:
        """计算建议添加的 API 数量"""
        # 目标：保持使用率在 60% 左右
        target_usage = 60
        current_total = current.total_capacity
        current_used = current.used_capacity
        
        # 预估未来 24 小时的增长
        future_growth = 0
        if prediction.rate_per_hour > 0:
            future_growth = (prediction.rate_per_hour / 100) * current_total * 24
        
        # 计算需要的总容量
        needed_total = (current_used + future_growth) / (target_usage / 100)
        
        # 计算需要添加的容量
        additional_capacity = max(0, needed_total - current_total)
        
        # 假设每个 API 可容纳 15 个账号
        suggested_apis = int(additional_capacity / 15) + 1
        
        return max(1, min(suggested_apis, 10))  # 至少 1 个，最多 10 个
    
    # ==================== 监控任务 ====================
    
    async def start_monitoring(self, get_pool_stats: Callable) -> None:
        """启动监控"""
        if self._monitor_task:
            return
        
        async def monitor_loop():
            while True:
                try:
                    stats = get_pool_stats()
                    await self.check_capacity(stats)
                    await asyncio.sleep(self.config.check_interval)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    print(f"[CapacityMonitor] 监控错误: {e}", file=sys.stderr)
                    await asyncio.sleep(60)
        
        self._monitor_task = asyncio.create_task(monitor_loop())
        print("[CapacityMonitor] 启动容量监控", file=sys.stderr)
    
    async def stop_monitoring(self) -> None:
        """停止监控"""
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
    
    # ==================== 状态查询 ====================
    
    def get_current_status(self) -> Dict[str, Any]:
        """获取当前状态"""
        if not self._snapshots:
            return {'status': 'no_data'}
        
        current = self._snapshots[-1]
        prediction = self.analyze_trend()
        
        return {
            'snapshot': {
                'timestamp': current.timestamp,
                'total_capacity': current.total_capacity,
                'used_capacity': current.used_capacity,
                'available_capacity': current.available_capacity,
                'usage_percent': round(current.usage_percent, 1),
                'available_apis': current.available_apis,
                'full_apis': current.full_apis
            },
            'prediction': {
                'trend': prediction.trend,
                'rate_per_hour': prediction.rate_per_hour,
                'estimated_full_hours': prediction.estimated_full_hours,
                'confidence': prediction.confidence
            },
            'recommendation': self.get_expansion_recommendation()
        }
    
    def get_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取历史数据"""
        cutoff = time.time() - hours * 3600
        
        return [
            {
                'timestamp': s.timestamp,
                'usage_percent': round(s.usage_percent, 1),
                'available_capacity': s.available_capacity,
                'available_apis': s.available_apis
            }
            for s in self._snapshots
            if s.timestamp >= cutoff
        ]


# ==================== 全局实例 ====================

_monitor: Optional[CapacityMonitor] = None


def get_capacity_monitor() -> CapacityMonitor:
    """获取全局容量监控器"""
    global _monitor
    if _monitor is None:
        _monitor = CapacityMonitor()
    return _monitor


async def init_capacity_monitor(
    config: Optional[CapacityConfig] = None,
    on_alert: Optional[Callable] = None
) -> CapacityMonitor:
    """初始化容量监控器"""
    global _monitor
    _monitor = CapacityMonitor(config=config, on_alert=on_alert)
    return _monitor
