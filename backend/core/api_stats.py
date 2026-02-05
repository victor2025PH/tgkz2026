"""
API 使用统计服务

功能：
1. 记录 API 使用历史
2. 追踪登录成功率
3. 生成时间序列数据
4. 提供告警阈值监控
"""

import sys
import time
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class EventType(Enum):
    """事件类型"""
    LOGIN_ATTEMPT = "login_attempt"       # 登录尝试
    LOGIN_SUCCESS = "login_success"       # 登录成功
    LOGIN_FAILED = "login_failed"         # 登录失败
    API_ALLOCATED = "api_allocated"       # API 分配
    API_RELEASED = "api_released"         # API 释放
    API_ERROR = "api_error"               # API 错误
    API_RECOVERED = "api_recovered"       # API 恢复


@dataclass
class StatsEvent:
    """统计事件"""
    event_type: EventType
    api_id: str
    timestamp: float = field(default_factory=time.time)
    phone: str = ""
    error: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ApiDailyStats:
    """API 每日统计"""
    date: str
    api_id: str
    total_attempts: int = 0
    successful: int = 0
    failed: int = 0
    errors: int = 0
    
    @property
    def success_rate(self) -> float:
        if self.total_attempts == 0:
            return 0.0
        return self.successful / self.total_attempts * 100


@dataclass 
class AlertConfig:
    """告警配置"""
    success_rate_threshold: float = 80.0    # 成功率阈值（低于此值告警）
    error_count_threshold: int = 5          # 错误数阈值
    capacity_threshold: float = 90.0        # 容量阈值（高于此值告警）
    check_interval: int = 60                # 检查间隔（秒）


class ApiStatsService:
    """
    API 统计服务
    
    功能：
    1. 记录所有 API 相关事件
    2. 计算成功率、错误率等指标
    3. 生成时间序列数据
    4. 触发告警
    """
    
    def __init__(self, alert_config: Optional[AlertConfig] = None):
        self.alert_config = alert_config or AlertConfig()
        
        # 事件存储（最近 7 天）
        self._events: List[StatsEvent] = []
        self._max_events = 100000  # 最多保留 10 万条
        
        # 每日统计缓存
        self._daily_stats: Dict[str, Dict[str, ApiDailyStats]] = defaultdict(dict)
        
        # 实时计数器
        self._realtime: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        
        # 告警状态
        self._alerts: List[Dict[str, Any]] = []
        self._alert_cooldown: Dict[str, float] = {}  # 防止重复告警
        
        # 监控任务
        self._monitor_task: Optional[asyncio.Task] = None
        
        print("[ApiStatsService] 初始化 API 统计服务", file=sys.stderr)
    
    # ==================== 事件记录 ====================
    
    def record_event(
        self,
        event_type: EventType,
        api_id: str,
        phone: str = "",
        error: str = "",
        metadata: Dict[str, Any] = None
    ) -> None:
        """记录事件"""
        event = StatsEvent(
            event_type=event_type,
            api_id=api_id,
            phone=phone,
            error=error,
            metadata=metadata or {}
        )
        
        self._events.append(event)
        
        # 清理过期事件
        if len(self._events) > self._max_events:
            cutoff = time.time() - 7 * 24 * 3600  # 7 天前
            self._events = [e for e in self._events if e.timestamp > cutoff]
        
        # 更新每日统计
        self._update_daily_stats(event)
        
        # 更新实时计数
        self._update_realtime(event)
        
        print(f"[ApiStatsService] 记录事件: {event_type.value} - API: {api_id}", file=sys.stderr)
    
    def record_login_attempt(self, api_id: str, phone: str = "") -> None:
        """记录登录尝试"""
        self.record_event(EventType.LOGIN_ATTEMPT, api_id, phone)
    
    def record_login_success(self, api_id: str, phone: str = "") -> None:
        """记录登录成功"""
        self.record_event(EventType.LOGIN_SUCCESS, api_id, phone)
    
    def record_login_failed(self, api_id: str, phone: str = "", error: str = "") -> None:
        """记录登录失败"""
        self.record_event(EventType.LOGIN_FAILED, api_id, phone, error)
    
    def record_api_error(self, api_id: str, error: str = "") -> None:
        """记录 API 错误"""
        self.record_event(EventType.API_ERROR, api_id, error=error)
    
    # ==================== 统计计算 ====================
    
    def _update_daily_stats(self, event: StatsEvent) -> None:
        """更新每日统计"""
        date = datetime.fromtimestamp(event.timestamp).strftime('%Y-%m-%d')
        
        if event.api_id not in self._daily_stats[date]:
            self._daily_stats[date][event.api_id] = ApiDailyStats(
                date=date,
                api_id=event.api_id
            )
        
        stats = self._daily_stats[date][event.api_id]
        
        if event.event_type == EventType.LOGIN_ATTEMPT:
            stats.total_attempts += 1
        elif event.event_type == EventType.LOGIN_SUCCESS:
            stats.successful += 1
        elif event.event_type == EventType.LOGIN_FAILED:
            stats.failed += 1
        elif event.event_type == EventType.API_ERROR:
            stats.errors += 1
    
    def _update_realtime(self, event: StatsEvent) -> None:
        """更新实时计数"""
        counter = self._realtime[event.api_id]
        
        if event.event_type == EventType.LOGIN_ATTEMPT:
            counter['attempts'] += 1
        elif event.event_type == EventType.LOGIN_SUCCESS:
            counter['success'] += 1
        elif event.event_type == EventType.LOGIN_FAILED:
            counter['failed'] += 1
        elif event.event_type == EventType.API_ERROR:
            counter['errors'] += 1
    
    def get_api_stats(self, api_id: str, days: int = 7) -> Dict[str, Any]:
        """获取指定 API 的统计"""
        today = datetime.now()
        stats_list = []
        
        for i in range(days):
            date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            if date in self._daily_stats and api_id in self._daily_stats[date]:
                ds = self._daily_stats[date][api_id]
                stats_list.append({
                    'date': ds.date,
                    'attempts': ds.total_attempts,
                    'success': ds.successful,
                    'failed': ds.failed,
                    'errors': ds.errors,
                    'success_rate': ds.success_rate
                })
            else:
                stats_list.append({
                    'date': date,
                    'attempts': 0,
                    'success': 0,
                    'failed': 0,
                    'errors': 0,
                    'success_rate': 0
                })
        
        # 计算总计
        total_attempts = sum(s['attempts'] for s in stats_list)
        total_success = sum(s['success'] for s in stats_list)
        
        return {
            'api_id': api_id,
            'days': days,
            'daily': list(reversed(stats_list)),  # 按日期正序
            'total': {
                'attempts': total_attempts,
                'success': total_success,
                'failed': sum(s['failed'] for s in stats_list),
                'errors': sum(s['errors'] for s in stats_list),
                'success_rate': (total_success / total_attempts * 100) if total_attempts > 0 else 0
            }
        }
    
    def get_overall_stats(self, days: int = 7) -> Dict[str, Any]:
        """获取总体统计"""
        today = datetime.now()
        daily_totals = []
        
        for i in range(days):
            date = (today - timedelta(days=i)).strftime('%Y-%m-%d')
            day_stats = {
                'date': date,
                'attempts': 0,
                'success': 0,
                'failed': 0,
                'errors': 0
            }
            
            if date in self._daily_stats:
                for api_stats in self._daily_stats[date].values():
                    day_stats['attempts'] += api_stats.total_attempts
                    day_stats['success'] += api_stats.successful
                    day_stats['failed'] += api_stats.failed
                    day_stats['errors'] += api_stats.errors
            
            if day_stats['attempts'] > 0:
                day_stats['success_rate'] = day_stats['success'] / day_stats['attempts'] * 100
            else:
                day_stats['success_rate'] = 0
            
            daily_totals.append(day_stats)
        
        # 汇总
        total_attempts = sum(d['attempts'] for d in daily_totals)
        total_success = sum(d['success'] for d in daily_totals)
        
        return {
            'days': days,
            'daily': list(reversed(daily_totals)),
            'total': {
                'attempts': total_attempts,
                'success': total_success,
                'failed': sum(d['failed'] for d in daily_totals),
                'errors': sum(d['errors'] for d in daily_totals),
                'success_rate': (total_success / total_attempts * 100) if total_attempts > 0 else 0
            },
            'realtime': dict(self._realtime)
        }
    
    def get_hourly_stats(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取每小时统计"""
        now = time.time()
        hourly = []
        
        for i in range(hours):
            start_time = now - (i + 1) * 3600
            end_time = now - i * 3600
            
            hour_events = [e for e in self._events if start_time <= e.timestamp < end_time]
            
            attempts = len([e for e in hour_events if e.event_type == EventType.LOGIN_ATTEMPT])
            success = len([e for e in hour_events if e.event_type == EventType.LOGIN_SUCCESS])
            failed = len([e for e in hour_events if e.event_type == EventType.LOGIN_FAILED])
            errors = len([e for e in hour_events if e.event_type == EventType.API_ERROR])
            
            hourly.append({
                'hour': datetime.fromtimestamp(end_time).strftime('%H:00'),
                'attempts': attempts,
                'success': success,
                'failed': failed,
                'errors': errors,
                'success_rate': (success / attempts * 100) if attempts > 0 else 0
            })
        
        return list(reversed(hourly))
    
    def get_api_ranking(self, top_n: int = 10) -> List[Dict[str, Any]]:
        """获取 API 排名（按成功率）"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        api_scores = []
        for api_id, counter in self._realtime.items():
            total = counter.get('attempts', 0)
            success = counter.get('success', 0)
            
            if total >= 5:  # 至少 5 次尝试才计入排名
                api_scores.append({
                    'api_id': api_id,
                    'attempts': total,
                    'success': success,
                    'failed': counter.get('failed', 0),
                    'errors': counter.get('errors', 0),
                    'success_rate': success / total * 100
                })
        
        # 按成功率降序
        api_scores.sort(key=lambda x: x['success_rate'], reverse=True)
        
        return api_scores[:top_n]
    
    # ==================== 告警系统 ====================
    
    async def start_monitoring(self) -> None:
        """启动监控任务"""
        if self._monitor_task:
            return
        
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        print("[ApiStatsService] 启动监控任务", file=sys.stderr)
    
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
                await asyncio.sleep(self.alert_config.check_interval)
                self._check_alerts()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ApiStatsService] 监控错误: {e}", file=sys.stderr)
    
    def _check_alerts(self) -> None:
        """检查告警条件"""
        now = time.time()
        new_alerts = []
        
        # 检查每个 API 的成功率
        for api_id, counter in self._realtime.items():
            total = counter.get('attempts', 0)
            success = counter.get('success', 0)
            errors = counter.get('errors', 0)
            
            if total >= 10:  # 至少 10 次才检查
                success_rate = success / total * 100
                
                # 成功率过低
                if success_rate < self.alert_config.success_rate_threshold:
                    alert_key = f"low_success_rate:{api_id}"
                    if self._can_alert(alert_key):
                        new_alerts.append({
                            'type': 'low_success_rate',
                            'api_id': api_id,
                            'current_rate': success_rate,
                            'threshold': self.alert_config.success_rate_threshold,
                            'message': f"API {api_id} 成功率过低: {success_rate:.1f}%",
                            'timestamp': now
                        })
                        self._mark_alerted(alert_key)
            
            # 错误数过多
            if errors >= self.alert_config.error_count_threshold:
                alert_key = f"high_errors:{api_id}"
                if self._can_alert(alert_key):
                    new_alerts.append({
                        'type': 'high_errors',
                        'api_id': api_id,
                        'error_count': errors,
                        'threshold': self.alert_config.error_count_threshold,
                        'message': f"API {api_id} 错误数过多: {errors}",
                        'timestamp': now
                    })
                    self._mark_alerted(alert_key)
        
        if new_alerts:
            self._alerts.extend(new_alerts)
            # 只保留最近 100 条告警
            if len(self._alerts) > 100:
                self._alerts = self._alerts[-100:]
            
            for alert in new_alerts:
                print(f"[ApiStatsService] ⚠️ 告警: {alert['message']}", file=sys.stderr)
    
    def _can_alert(self, key: str, cooldown: int = 3600) -> bool:
        """检查是否可以发送告警（防止重复）"""
        last_alert = self._alert_cooldown.get(key, 0)
        return time.time() - last_alert > cooldown
    
    def _mark_alerted(self, key: str) -> None:
        """标记已告警"""
        self._alert_cooldown[key] = time.time()
    
    def get_alerts(self, limit: int = 20) -> List[Dict[str, Any]]:
        """获取最近的告警"""
        return list(reversed(self._alerts[-limit:]))
    
    def clear_alerts(self) -> None:
        """清除告警"""
        self._alerts.clear()
    
    # ==================== 导出/报告 ====================
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表板数据"""
        return {
            'overall': self.get_overall_stats(days=7),
            'hourly': self.get_hourly_stats(hours=24),
            'ranking': self.get_api_ranking(top_n=10),
            'alerts': self.get_alerts(limit=10),
            'last_updated': time.time()
        }


# ==================== 全局实例 ====================

_stats_service: Optional[ApiStatsService] = None


def get_stats_service() -> ApiStatsService:
    """获取全局统计服务"""
    global _stats_service
    if _stats_service is None:
        _stats_service = ApiStatsService()
    return _stats_service


async def init_stats_service(alert_config: Optional[AlertConfig] = None) -> ApiStatsService:
    """初始化统计服务"""
    global _stats_service
    _stats_service = ApiStatsService(alert_config=alert_config)
    await _stats_service.start_monitoring()
    return _stats_service
