"""
TG-Matrix Proxy Rotation Manager
智能代理轮换管理器 - 自动轮换代理，降低 IP 封禁风险
"""
import asyncio
import time
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import sys


class RotationReason(Enum):
    """轮换原因"""
    SCHEDULED = "scheduled"  # 定期轮换
    ERROR = "error"  # 代理错误
    BAN_RISK = "ban_risk"  # 封禁风险
    PERFORMANCE = "performance"  # 性能问题
    MANUAL = "manual"  # 手动触发


@dataclass
class ProxyHealth:
    """代理健康状态"""
    proxy: str
    last_check: datetime
    latency: float  # 延迟（毫秒）
    success_rate: float  # 成功率（0-1）
    error_count: int  # 错误次数
    total_requests: int  # 总请求数
    consecutive_errors: int  # 连续错误次数
    last_error: Optional[str] = None
    last_success: Optional[datetime] = None
    is_healthy: bool = True
    
    def update_success(self, latency: float):
        """更新成功记录"""
        self.last_success = datetime.now()
        self.last_check = datetime.now()
        self.latency = (self.latency * 0.8) + (latency * 0.2)  # 移动平均
        self.total_requests += 1
        self.consecutive_errors = 0
        
        # 计算成功率
        if self.total_requests > 0:
            self.success_rate = 1.0 - (self.error_count / self.total_requests)
        
        # 判断健康状态
        self.is_healthy = (
            self.success_rate >= 0.8 and
            self.latency < 5000 and  # 延迟小于 5 秒
            self.consecutive_errors < 3
        )
    
    def update_error(self, error: str):
        """更新错误记录"""
        self.last_check = datetime.now()
        self.error_count += 1
        self.total_requests += 1
        self.consecutive_errors += 1
        self.last_error = error
        
        # 计算成功率
        if self.total_requests > 0:
            self.success_rate = 1.0 - (self.error_count / self.total_requests)
        
        # 判断健康状态
        self.is_healthy = (
            self.success_rate >= 0.8 and
            self.consecutive_errors < 3
        )


@dataclass
class ProxyRotationConfig:
    """代理轮换配置"""
    rotation_interval_hours: int = 24  # 定期轮换间隔（小时）
    max_consecutive_errors: int = 3  # 最大连续错误次数
    min_success_rate: float = 0.8  # 最小成功率
    max_latency_ms: float = 5000  # 最大延迟（毫秒）
    health_check_interval_seconds: int = 300  # 健康检查间隔（秒）
    auto_rotate_on_error: bool = True  # 错误时自动轮换
    auto_rotate_on_ban_risk: bool = True  # 封禁风险时自动轮换


class ProxyRotationManager:
    """代理轮换管理器"""
    
    def __init__(
        self,
        proxy_pool: List[Dict],  # 代理池配置
        config: Optional[ProxyRotationConfig] = None,
        health_check_callback: Optional[Callable] = None
    ):
        """
        初始化代理轮换管理器
        
        Args:
            proxy_pool: 代理池列表，每个代理包含：
                - proxy: 代理地址
                - country: 国家代码
                - type: 代理类型（residential, datacenter, mobile）
                - quality: 质量评级（high, medium, low）
            config: 轮换配置
            health_check_callback: 健康检查回调函数
        """
        self.proxy_pool = proxy_pool
        self.config = config or ProxyRotationConfig()
        self.health_check_callback = health_check_callback
        
        # 账户代理映射：account_id -> current_proxy
        self.account_proxies: Dict[int, str] = {}
        
        # 代理健康状态：proxy -> ProxyHealth
        self.proxy_health: Dict[str, ProxyHealth] = {}
        
        # 代理使用时间：account_id -> (proxy, start_time)
        self.proxy_usage_time: Dict[int, tuple] = {}
        
        # 轮换历史：account_id -> List[(proxy, reason, timestamp)]
        self.rotation_history: Dict[int, List] = {}
        
        # 初始化代理健康状态
        for proxy_config in proxy_pool:
            proxy = proxy_config.get('proxy')
            if proxy:
                self.proxy_health[proxy] = ProxyHealth(
                    proxy=proxy,
                    last_check=datetime.now(),
                    latency=0.0,
                    success_rate=1.0,
                    error_count=0,
                    total_requests=0,
                    consecutive_errors=0
                )
    
    def get_current_proxy(self, account_id: int) -> Optional[str]:
        """获取账户当前使用的代理"""
        return self.account_proxies.get(account_id)
    
    async def assign_proxy(
        self,
        account_id: int,
        phone: str,
        preferred_country: Optional[str] = None
    ) -> Optional[str]:
        """
        为账户分配代理
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            preferred_country: 首选国家代码
        
        Returns:
            分配的代理地址
        """
        # 如果已有代理，检查是否需要轮换
        current_proxy = self.account_proxies.get(account_id)
        if current_proxy:
            should_rotate = await self._should_rotate(account_id, current_proxy)
            if not should_rotate:
                return current_proxy
        
        # 选择新代理
        new_proxy = await self._select_best_proxy(account_id, phone, preferred_country)
        
        if new_proxy:
            # 更新账户代理
            self.account_proxies[account_id] = new_proxy
            self.proxy_usage_time[account_id] = (new_proxy, datetime.now())
            
            # 记录轮换历史
            reason = RotationReason.SCHEDULED.value if current_proxy else "initial"
            self._record_rotation(account_id, new_proxy, reason)
            
            print(f"[ProxyRotation] Assigned proxy to account {account_id}: {new_proxy[:50]}...", file=sys.stderr)
        
        return new_proxy
    
    async def _select_best_proxy(
        self,
        account_id: int,
        phone: str,
        preferred_country: Optional[str] = None
    ) -> Optional[str]:
        """选择最佳代理"""
        if not self.proxy_pool:
            return None
        
        # 过滤候选代理
        candidates = []
        
        # 1. 优先选择匹配国家的代理
        if preferred_country:
            country_proxies = [p for p in self.proxy_pool if p.get('country') == preferred_country]
            if country_proxies:
                candidates = country_proxies
            else:
                candidates = self.proxy_pool
        else:
            candidates = self.proxy_pool
        
        # 2. 优先选择健康的代理
        healthy_proxies = []
        for proxy_config in candidates:
            proxy = proxy_config.get('proxy')
            if proxy:
                health = self.proxy_health.get(proxy)
                if health and health.is_healthy:
                    healthy_proxies.append(proxy_config)
        
        if healthy_proxies:
            candidates = healthy_proxies
        
        # 3. 优先选择住宅代理
        residential_proxies = [p for p in candidates if p.get('type') == 'residential']
        if residential_proxies:
            candidates = residential_proxies
        
        # 4. 优先选择高质量代理
        high_quality_proxies = [p for p in candidates if p.get('quality') == 'high']
        if high_quality_proxies:
            candidates = high_quality_proxies
        
        # 5. 选择延迟最低的代理
        if candidates:
            best_proxy = None
            best_latency = float('inf')
            
            for proxy_config in candidates:
                proxy = proxy_config.get('proxy')
                if proxy:
                    health = self.proxy_health.get(proxy)
                    if health:
                        if health.latency < best_latency:
                            best_latency = health.latency
                            best_proxy = proxy
            
            return best_proxy or candidates[0].get('proxy')
        
        return None
    
    async def _should_rotate(self, account_id: int, proxy: str) -> bool:
        """判断是否需要轮换代理"""
        # 检查代理健康状态
        health = self.proxy_health.get(proxy)
        if not health:
            return True
        
        # 检查连续错误
        if health.consecutive_errors >= self.config.max_consecutive_errors:
            print(f"[ProxyRotation] Proxy {proxy[:50]}... has {health.consecutive_errors} consecutive errors, should rotate", file=sys.stderr)
            return True
        
        # 检查成功率
        if health.success_rate < self.config.min_success_rate:
            print(f"[ProxyRotation] Proxy {proxy[:50]}... has low success rate ({health.success_rate:.2%}), should rotate", file=sys.stderr)
            return True
        
        # 检查延迟
        if health.latency > self.config.max_latency_ms:
            print(f"[ProxyRotation] Proxy {proxy[:50]}... has high latency ({health.latency:.0f}ms), should rotate", file=sys.stderr)
            return True
        
        # 检查使用时间（定期轮换）
        if account_id in self.proxy_usage_time:
            proxy_used, start_time = self.proxy_usage_time[account_id]
            if proxy_used == proxy:
                hours_used = (datetime.now() - start_time).total_seconds() / 3600
                if hours_used >= self.config.rotation_interval_hours:
                    print(f"[ProxyRotation] Proxy {proxy[:50]}... used for {hours_used:.1f} hours, scheduled rotation", file=sys.stderr)
                    return True
        
        return False
    
    async def rotate_proxy(
        self,
        account_id: int,
        phone: str,
        reason: RotationReason = RotationReason.SCHEDULED,
        preferred_country: Optional[str] = None
    ) -> Optional[str]:
        """
        轮换账户代理
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            reason: 轮换原因
            preferred_country: 首选国家代码
        
        Returns:
            新代理地址
        """
        old_proxy = self.account_proxies.get(account_id)
        
        # 选择新代理
        new_proxy = await self._select_best_proxy(account_id, phone, preferred_country)
        
        if new_proxy and new_proxy != old_proxy:
            # 更新账户代理
            self.account_proxies[account_id] = new_proxy
            self.proxy_usage_time[account_id] = (new_proxy, datetime.now())
            
            # 记录轮换历史
            self._record_rotation(account_id, new_proxy, reason.value, old_proxy)
            
            print(f"[ProxyRotation] Rotated proxy for account {account_id}: {old_proxy[:50] if old_proxy else 'None'}... -> {new_proxy[:50]}... (reason: {reason.value})", file=sys.stderr)
            
            return new_proxy
        
        return old_proxy
    
    async def check_proxy_health(self, proxy: str) -> Dict[str, any]:
        """
        检查代理健康状态
        
        Args:
            proxy: 代理地址
        
        Returns:
            健康检查结果
        """
        if not self.health_check_callback:
            # 如果没有回调，返回默认健康状态
            health = self.proxy_health.get(proxy)
            if health:
                return {
                    "proxy": proxy,
                    "is_healthy": health.is_healthy,
                    "latency": health.latency,
                    "success_rate": health.success_rate,
                    "error_count": health.error_count,
                    "consecutive_errors": health.consecutive_errors
                }
            return {"proxy": proxy, "is_healthy": False, "error": "Proxy not found"}
        
        # 使用回调函数检查代理
        try:
            start_time = time.time()
            result = await self.health_check_callback(proxy)
            latency = (time.time() - start_time) * 1000  # 转换为毫秒
            
            # 更新健康状态
            health = self.proxy_health.get(proxy)
            if health:
                if result.get('success'):
                    health.update_success(latency)
                else:
                    health.update_error(result.get('error', 'Unknown error'))
            
            return {
                "proxy": proxy,
                "is_healthy": health.is_healthy if health else False,
                "latency": latency,
                "success_rate": health.success_rate if health else 0.0,
                "error_count": health.error_count if health else 0,
                "consecutive_errors": health.consecutive_errors if health else 0
            }
        except Exception as e:
            # 更新错误状态
            health = self.proxy_health.get(proxy)
            if health:
                health.update_error(str(e))
            
            return {
                "proxy": proxy,
                "is_healthy": False,
                "error": str(e)
            }
    
    def record_proxy_success(self, proxy: str, latency: float):
        """记录代理成功使用"""
        health = self.proxy_health.get(proxy)
        if health:
            health.update_success(latency)
    
    def record_proxy_error(self, proxy: str, error: str):
        """记录代理错误"""
        health = self.proxy_health.get(proxy)
        if health:
            health.update_error(error)
            
            # 如果启用自动轮换，检查是否需要轮换
            if self.config.auto_rotate_on_error:
                if health.consecutive_errors >= self.config.max_consecutive_errors:
                    # 找到使用此代理的账户并轮换
                    for account_id, current_proxy in self.account_proxies.items():
                        if current_proxy == proxy:
                            # 触发异步轮换（不等待）
                            asyncio.create_task(self._auto_rotate_on_error(account_id))
    
    async def _auto_rotate_on_error(self, account_id: int):
        """自动轮换错误代理"""
        # 需要获取账户信息（电话号码等）
        # 这里简化处理，实际应该从数据库获取
        print(f"[ProxyRotation] Auto-rotating proxy for account {account_id} due to errors", file=sys.stderr)
        # 实际实现需要账户信息，这里只是占位
    
    def _record_rotation(
        self,
        account_id: int,
        new_proxy: str,
        reason: str,
        old_proxy: Optional[str] = None
    ):
        """记录轮换历史"""
        if account_id not in self.rotation_history:
            self.rotation_history[account_id] = []
        
        self.rotation_history[account_id].append({
            "old_proxy": old_proxy,
            "new_proxy": new_proxy,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        })
        
        # 只保留最近 50 条记录
        if len(self.rotation_history[account_id]) > 50:
            self.rotation_history[account_id] = self.rotation_history[account_id][-50:]
    
    def get_rotation_history(self, account_id: int) -> List[Dict]:
        """获取账户轮换历史"""
        return self.rotation_history.get(account_id, [])
    
    def get_proxy_statistics(self) -> Dict[str, any]:
        """获取代理统计信息"""
        total_proxies = len(self.proxy_pool)
        healthy_proxies = sum(1 for h in self.proxy_health.values() if h.is_healthy)
        
        avg_latency = sum(h.latency for h in self.proxy_health.values()) / len(self.proxy_health) if self.proxy_health else 0
        avg_success_rate = sum(h.success_rate for h in self.proxy_health.values()) / len(self.proxy_health) if self.proxy_health else 0
        
        return {
            "total_proxies": total_proxies,
            "healthy_proxies": healthy_proxies,
            "unhealthy_proxies": total_proxies - healthy_proxies,
            "avg_latency_ms": avg_latency,
            "avg_success_rate": avg_success_rate,
            "accounts_using_proxies": len(self.account_proxies)
        }

