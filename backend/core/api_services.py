"""
API 服务统一初始化模块

整合所有 API 池相关服务：
1. API 池管理器
2. 健康检查器
3. 统计服务
4. 告警服务
5. 登录追踪器
6. 错误处理器
"""

import sys
import asyncio
from typing import Optional, Callable, Any

# 服务导入
from core.api_pool import (
    init_api_pool,
    get_api_pool,
    ApiPoolManager,
    PoolConfig
)

from core.api_health import (
    init_health_service,
    get_health_checker,
    get_load_balancer,
    ApiHealthChecker,
    LoadBalancer,
    HealthConfig
)

from core.api_stats import (
    init_stats_service,
    get_stats_service,
    ApiStatsService,
    AlertConfig as StatsAlertConfig
)

from core.api_alerts import (
    init_alert_service,
    get_alert_service,
    AlertService,
    Alert
)

from core.login_tracker import (
    get_login_tracker,
    track_login_start,
    track_login_complete,
    LoginTracker
)

from core.login_error_handler import (
    get_error_handler,
    analyze_login_error,
    format_error_response,
    LoginErrorHandler
)

from core.event_emitter import (
    event_emitter,
    EventEmitter,
    EventType
)


class ApiServicesManager:
    """
    API 服务管理器
    
    统一管理所有 API 池相关服务的生命周期
    """
    
    def __init__(self):
        self._initialized = False
        self._services = {}
        
    async def initialize(
        self,
        db=None,
        pool_config: Optional[PoolConfig] = None,
        health_config: Optional[HealthConfig] = None,
        on_alert: Optional[Callable[[Alert], None]] = None
    ) -> None:
        """
        初始化所有服务
        
        Args:
            db: 数据库连接
            pool_config: API 池配置
            health_config: 健康检查配置
            on_alert: 告警回调
        """
        if self._initialized:
            print("[ApiServicesManager] 服务已初始化，跳过", file=sys.stderr)
            return
        
        print("[ApiServicesManager] 开始初始化 API 服务...", file=sys.stderr)
        
        try:
            # 1. 初始化告警服务（优先，其他服务可能需要发告警）
            alert_service = init_alert_service(on_alert=on_alert)
            self._services['alert'] = alert_service
            
            # 2. 初始化健康检查（带状态变更回调）
            def on_health_change(api_id, old_status, new_status):
                from core.api_health import HealthStatus
                if new_status == HealthStatus.UNHEALTHY:
                    alert_service.alert_api_unhealthy(api_id, f"状态从 {old_status.value} 变为 {new_status.value}")
                elif new_status == HealthStatus.HEALTHY and old_status == HealthStatus.UNHEALTHY:
                    alert_service.alert_api_recovered(api_id)
            
            health_checker = await init_health_service(
                config=health_config,
                on_status_change=on_health_change
            )
            self._services['health'] = health_checker
            self._services['load_balancer'] = get_load_balancer()
            
            # 3. 初始化统计服务
            stats_service = await init_stats_service()
            self._services['stats'] = stats_service
            
            # 4. 初始化 API 池
            def on_pool_event(event_type, data):
                if event_type == 'pool.exhausted':
                    alert_service.alert_pool_exhausted()
            
            pool = await init_api_pool(
                db=db,
                config=pool_config,
                event_callback=on_pool_event
            )
            self._services['pool'] = pool
            
            # 5. 初始化登录追踪器
            tracker = get_login_tracker()
            self._services['tracker'] = tracker
            
            # 6. 初始化错误处理器
            error_handler = get_error_handler()
            self._services['error_handler'] = error_handler
            
            # 7. 集成事件发射器
            self._services['event_emitter'] = event_emitter
            
            # 注册告警服务的事件发射
            alert_service.set_event_callback(self._emit_alert_event)
            
            self._initialized = True
            
            print("[ApiServicesManager] ✅ 所有 API 服务初始化完成", file=sys.stderr)
            print(f"  - API 池: {pool.get_stats().get('total_apis', 0)} 个 API", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiServicesManager] ❌ 服务初始化失败: {e}", file=sys.stderr)
            raise
    
    async def shutdown(self) -> None:
        """关闭所有服务"""
        print("[ApiServicesManager] 关闭 API 服务...", file=sys.stderr)
        
        # 停止健康检查
        health = self._services.get('health')
        if health:
            await health.stop_monitoring()
        
        # 停止统计监控
        stats = self._services.get('stats')
        if stats:
            await stats.stop_monitoring()
        
        self._initialized = False
        self._services.clear()
        
        print("[ApiServicesManager] ✅ API 服务已关闭", file=sys.stderr)
    
    def get_service(self, name: str) -> Optional[Any]:
        """获取指定服务"""
        return self._services.get(name)
    
    @property
    def pool(self) -> Optional[ApiPoolManager]:
        """获取 API 池"""
        return self._services.get('pool')
    
    @property
    def health_checker(self) -> Optional[ApiHealthChecker]:
        """获取健康检查器"""
        return self._services.get('health')
    
    @property
    def load_balancer(self) -> Optional[LoadBalancer]:
        """获取负载均衡器"""
        return self._services.get('load_balancer')
    
    @property
    def stats(self) -> Optional[ApiStatsService]:
        """获取统计服务"""
        return self._services.get('stats')
    
    @property
    def alert_service(self) -> Optional[AlertService]:
        """获取告警服务"""
        return self._services.get('alert')
    
    @property
    def tracker(self) -> Optional[LoginTracker]:
        """获取登录追踪器"""
        return self._services.get('tracker')
    
    @property
    def error_handler(self) -> Optional[LoginErrorHandler]:
        """获取错误处理器"""
        return self._services.get('error_handler')
    
    @property
    def events(self) -> Optional[EventEmitter]:
        """获取事件发射器"""
        return self._services.get('event_emitter')
    
    def _emit_alert_event(self, alert: Alert) -> None:
        """将告警转换为事件并发射"""
        if not self.events:
            return
        
        self.events.emit_alert({
            'id': alert.id,
            'type': alert.type.value if hasattr(alert.type, 'value') else str(alert.type),
            'level': alert.level.value if hasattr(alert.level, 'value') else str(alert.level),
            'title': alert.title,
            'message': alert.message,
            'timestamp': alert.created_at
        })
    
    def emit_event(self, event_type: EventType, data: dict) -> None:
        """发射事件（便捷方法）"""
        if self.events:
            self.events.emit(event_type, data)
    
    def get_dashboard_data(self) -> dict:
        """获取仪表板数据"""
        data = {
            'initialized': self._initialized,
            'services': list(self._services.keys())
        }
        
        # API 池状态
        if self.pool:
            data['pool'] = self.pool.get_pool_status()
        
        # 健康摘要
        if self.health_checker:
            data['health'] = self.health_checker.get_health_summary()
        
        # 统计摘要
        if self.stats:
            data['stats'] = self.stats.get_dashboard_data()
        
        # 告警摘要
        if self.alert_service:
            data['alerts'] = self.alert_service.get_alerts_for_dashboard()
        
        # 登录追踪
        if self.tracker:
            data['login'] = self.tracker.get_dashboard_data()
        
        return data


# ==================== 全局实例 ====================

_manager: Optional[ApiServicesManager] = None


def get_services_manager() -> ApiServicesManager:
    """获取全局服务管理器"""
    global _manager
    if _manager is None:
        _manager = ApiServicesManager()
    return _manager


async def init_all_services(
    db=None,
    pool_config: Optional[PoolConfig] = None,
    health_config: Optional[HealthConfig] = None,
    on_alert: Optional[Callable[[Alert], None]] = None
) -> ApiServicesManager:
    """初始化所有服务（便捷函数）"""
    manager = get_services_manager()
    await manager.initialize(
        db=db,
        pool_config=pool_config,
        health_config=health_config,
        on_alert=on_alert
    )
    return manager


async def shutdown_all_services() -> None:
    """关闭所有服务"""
    manager = get_services_manager()
    await manager.shutdown()


# ==================== 导出便捷函数 ====================

__all__ = [
    # 管理器
    'ApiServicesManager',
    'get_services_manager',
    'init_all_services',
    'shutdown_all_services',
    
    # API 池
    'get_api_pool',
    'PoolConfig',
    
    # 健康检查
    'get_health_checker',
    'get_load_balancer',
    'HealthConfig',
    
    # 统计
    'get_stats_service',
    
    # 告警
    'get_alert_service',
    'Alert',
    
    # 登录追踪
    'get_login_tracker',
    'track_login_start',
    'track_login_complete',
    
    # 错误处理
    'get_error_handler',
    'analyze_login_error',
    'format_error_response',
    
    # 事件
    'event_emitter',
    'EventType',
]
