"""
TG-Matrix Services Initializer
服务初始化器 - 统一初始化和管理所有核心服务

设计原则：
1. 统一入口：所有服务从这里初始化
2. 依赖注入：服务之间通过回调连接
3. 生命周期：支持优雅启动和关闭
4. 健康检查：提供服务状态监控
"""

import asyncio
import sys
import time
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
import logging

# 核心服务导入
from core.account_pool import (
    AccountPoolManager, 
    get_account_pool, 
    init_account_pool,
    PoolTier,
    AccountState
)
from core.error_recovery import (
    ErrorRecoveryService,
    get_error_recovery,
    init_error_recovery
)
from core.message_aggregator import (
    MessageAggregator,
    get_message_aggregator,
    init_message_aggregator
)
from core.metrics_service import (
    MetricsService,
    get_metrics_service,
    init_metrics_service
)
from core.sandbox_validator import (
    SandboxValidator,
    get_sandbox_validator
)

logger = logging.getLogger(__name__)


@dataclass
class ServiceStatus:
    """服务状态"""
    name: str
    running: bool
    healthy: bool
    message: str = ""
    stats: Dict[str, Any] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'running': self.running,
            'healthy': self.healthy,
            'message': self.message,
            'stats': self.stats or {}
        }


class ServicesManager:
    """
    服务管理器
    
    职责：
    1. 统一初始化所有服务
    2. 管理服务间依赖
    3. 提供健康检查
    4. 支持优雅关闭
    """
    
    def __init__(self, event_callback: Optional[Callable[[str, Any], None]] = None):
        self.event_callback = event_callback
        
        # 服务实例
        self.pool: Optional[AccountPoolManager] = None
        self.recovery: Optional[ErrorRecoveryService] = None
        self.aggregator: Optional[MessageAggregator] = None
        self.metrics: Optional[MetricsService] = None
        self.sandbox_validator: Optional[SandboxValidator] = None
        
        # 状态
        self._initialized = False
        self._running = False
        self._start_time: float = 0
        
        print("[ServicesManager] 创建服务管理器", file=sys.stderr)
    
    async def initialize(self) -> bool:
        """
        初始化所有服务
        
        Returns:
            是否成功
        """
        if self._initialized:
            print("[ServicesManager] 服务已初始化，跳过", file=sys.stderr)
            return True
        
        try:
            print("[ServicesManager] 开始初始化服务...", file=sys.stderr)
            self._start_time = time.time()
            
            # 1. 初始化监控服务（最先，用于收集其他服务的指标）
            print("[ServicesManager] 初始化监控服务...", file=sys.stderr)
            self.metrics = await init_metrics_service(
                event_callback=self._handle_metrics_event
            )
            
            # 2. 初始化账号池
            print("[ServicesManager] 初始化账号池...", file=sys.stderr)
            self.pool = await init_account_pool(
                event_callback=self._handle_pool_event
            )
            
            # 3. 初始化错误恢复服务
            print("[ServicesManager] 初始化错误恢复服务...", file=sys.stderr)
            self.recovery = init_error_recovery(
                event_callback=self._handle_recovery_event,
                account_pool=self.pool
            )
            
            # 4. 初始化消息聚合器
            print("[ServicesManager] 初始化消息聚合器...", file=sys.stderr)
            self.aggregator = await init_message_aggregator(
                event_callback=self._handle_aggregator_event
            )
            
            # 5. 初始化沙盒验证器
            print("[ServicesManager] 初始化沙盒验证器...", file=sys.stderr)
            self.sandbox_validator = get_sandbox_validator()
            
            self._initialized = True
            self._running = True
            
            elapsed = time.time() - self._start_time
            print(f"[ServicesManager] ✅ 所有服务初始化完成，耗时 {elapsed:.2f}s", file=sys.stderr)
            
            # 发送初始化完成事件
            if self.event_callback:
                self.event_callback('services.initialized', {
                    'elapsed_seconds': elapsed,
                    'services': ['pool', 'recovery', 'aggregator', 'metrics', 'sandbox_validator']
                })
            
            return True
            
        except Exception as e:
            print(f"[ServicesManager] ❌ 服务初始化失败: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return False
    
    async def shutdown(self) -> bool:
        """
        关闭所有服务
        
        Returns:
            是否成功
        """
        if not self._running:
            return True
        
        print("[ServicesManager] 开始关闭服务...", file=sys.stderr)
        
        try:
            # 按相反顺序关闭
            if self.aggregator:
                await self.aggregator.stop()
            
            if self.pool:
                await self.pool.stop()
            
            if self.metrics:
                await self.metrics.stop()
            
            self._running = False
            print("[ServicesManager] ✅ 所有服务已关闭", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"[ServicesManager] ❌ 服务关闭错误: {e}", file=sys.stderr)
            return False
    
    # ==================== 事件处理 ====================
    
    def _handle_pool_event(self, event_type: str, data: Any):
        """处理账号池事件"""
        # 收集指标
        if self.metrics:
            pool_stats = self.pool.get_pool_stats() if self.pool else {}
            self.metrics.collect_pool_metrics(pool_stats)
        
        # 转发事件
        if self.event_callback:
            self.event_callback(f"pool.{event_type}", data)
    
    def _handle_recovery_event(self, event_type: str, data: Any):
        """处理错误恢复事件"""
        # 收集指标
        if self.metrics and self.recovery:
            self.metrics.collect_error_metrics(self.recovery.get_stats())
        
        # 转发事件
        if self.event_callback:
            self.event_callback(f"recovery.{event_type}", data)
    
    def _handle_aggregator_event(self, event_type: str, data: Any):
        """处理消息聚合器事件"""
        # 收集指标
        if self.metrics and self.aggregator:
            self.metrics.collect_message_metrics(self.aggregator.get_stats())
        
        # 转发事件
        if self.event_callback:
            self.event_callback(f"aggregator.{event_type}", data)
    
    def _handle_metrics_event(self, event_type: str, data: Any):
        """处理监控事件"""
        # 转发事件
        if self.event_callback:
            self.event_callback(f"metrics.{event_type}", data)
    
    # ==================== 健康检查 ====================
    
    def get_health(self) -> Dict[str, Any]:
        """获取所有服务的健康状态"""
        services = []
        
        # 检查账号池
        if self.pool:
            stats = self.pool.get_pool_stats()
            services.append(ServiceStatus(
                name="account_pool",
                running=True,
                healthy=True,
                message=f"Hot={stats['hot_count']}, Warm={stats['warm_count']}, Cold={stats['cold_count']}",
                stats=stats
            ))
        else:
            services.append(ServiceStatus(
                name="account_pool",
                running=False,
                healthy=False,
                message="服务未初始化"
            ))
        
        # 检查错误恢复
        if self.recovery:
            stats = self.recovery.get_stats()
            services.append(ServiceStatus(
                name="error_recovery",
                running=True,
                healthy=True,
                message=f"处理={stats['total_errors']}, 恢复={stats['recovered']}",
                stats=stats
            ))
        else:
            services.append(ServiceStatus(
                name="error_recovery",
                running=False,
                healthy=False,
                message="服务未初始化"
            ))
        
        # 检查消息聚合器
        if self.aggregator:
            stats = self.aggregator.get_stats()
            services.append(ServiceStatus(
                name="message_aggregator",
                running=True,
                healthy=True,
                message=f"消息={stats['total_messages']}, 连接={stats['connected_users']}",
                stats=stats
            ))
        else:
            services.append(ServiceStatus(
                name="message_aggregator",
                running=False,
                healthy=False,
                message="服务未初始化"
            ))
        
        # 检查监控服务
        if self.metrics:
            dashboard = self.metrics.get_dashboard_data()
            services.append(ServiceStatus(
                name="metrics",
                running=True,
                healthy=True,
                message=f"CPU={dashboard['system']['cpu_percent']:.1f}%, 内存={dashboard['system']['memory_percent']:.1f}%",
                stats=dashboard
            ))
        else:
            services.append(ServiceStatus(
                name="metrics",
                running=False,
                healthy=False,
                message="服务未初始化"
            ))
        
        # 总体状态
        all_healthy = all(s.healthy for s in services)
        all_running = all(s.running for s in services)
        
        return {
            'status': 'healthy' if all_healthy else 'unhealthy',
            'running': self._running,
            'initialized': self._initialized,
            'uptime_seconds': time.time() - self._start_time if self._start_time else 0,
            'services': [s.to_dict() for s in services]
        }
    
    def get_dashboard(self) -> Dict[str, Any]:
        """获取仪表盘数据"""
        if self.metrics:
            dashboard = self.metrics.get_dashboard_data()
        else:
            dashboard = {}
        
        # 添加服务健康信息
        dashboard['health'] = self.get_health()
        
        return dashboard


# 全局实例
_services_manager: Optional[ServicesManager] = None


def get_services_manager() -> ServicesManager:
    """获取全局服务管理器"""
    global _services_manager
    if _services_manager is None:
        _services_manager = ServicesManager()
    return _services_manager


async def init_all_services(
    event_callback: Optional[Callable] = None
) -> ServicesManager:
    """初始化所有服务"""
    global _services_manager
    _services_manager = ServicesManager(event_callback=event_callback)
    await _services_manager.initialize()
    return _services_manager


async def shutdown_all_services():
    """关闭所有服务"""
    global _services_manager
    if _services_manager:
        await _services_manager.shutdown()

