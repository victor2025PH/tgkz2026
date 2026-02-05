"""
TG-Matrix Account Pool Manager
账号连接池管理器 - 实现 Hot/Warm/Cold 三层池化

设计原则：
1. Hot Pool: 活跃账号，保持完整连接，可立即收发消息
2. Warm Pool: 待命账号，保持轻量连接，可快速激活
3. Cold Pool: 休眠账号，无连接，需要时才激活

调度策略：
- 收到消息 → 账号自动提升到 Hot
- 长时间无活动 → 降级到 Warm/Cold
- 发送任务 → 优先选择 Hot 池健康账号
- 账号被限流 → 冷却，切换备用账号
"""

import asyncio
import time
import sys
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import logging

from config import SandboxConfig

logger = logging.getLogger(__name__)


class PoolTier(str, Enum):
    """连接池层级"""
    HOT = "hot"      # 活跃：完整连接，可收发消息
    WARM = "warm"    # 待命：轻量连接，快速激活
    COLD = "cold"    # 休眠：无连接，需激活


class AccountState(str, Enum):
    """账号状态"""
    ONLINE = "online"           # 在线，可用
    CONNECTING = "connecting"   # 连接中
    IDLE = "idle"               # 空闲
    ERROR = "error"             # 错误，需处理
    BANNED = "banned"           # 已封禁
    COOLDOWN = "cooldown"       # 冷却中（FloodWait）
    NEEDS_AUTH = "needs_auth"   # 需要验证
    DISCONNECTED = "disconnected"  # 已断开


@dataclass
class PoolConfig:
    """连接池配置"""
    hot_pool_size: int = 10       # Hot池最大容量
    warm_pool_size: int = 20      # Warm池最大容量
    cold_pool_size: int = -1      # Cold池无限制
    
    # 自动降级阈值
    hot_to_warm_idle_seconds: int = 300      # 5分钟无活动降级到Warm
    warm_to_cold_idle_seconds: int = 1800    # 30分钟无活动降级到Cold
    
    # 自动升级触发
    auto_promote_on_message: bool = True     # 收到消息自动升级到Hot
    
    # 健康检查
    health_check_interval: int = 60          # 健康检查间隔（秒）
    max_consecutive_failures: int = 3        # 最大连续失败次数
    
    # FloodWait处理
    default_cooldown_seconds: int = 300      # 默认冷却时间
    max_cooldown_seconds: int = 3600         # 最大冷却时间


@dataclass
class AccountPoolEntry:
    """账号池条目"""
    phone: str
    tier: PoolTier = PoolTier.COLD
    state: AccountState = AccountState.DISCONNECTED
    
    # 时间戳
    last_active_at: float = 0
    last_message_at: float = 0
    promoted_at: float = 0
    demoted_at: float = 0
    
    # 健康指标
    priority: int = 50                       # 优先级 (0-100)
    connection_quality: float = 1.0          # 连接质量 (0-1)
    consecutive_failures: int = 0            # 连续失败次数
    total_messages_today: int = 0            # 今日消息数
    
    # FloodWait
    cooldown_until: float = 0                # 冷却结束时间
    cooldown_reason: str = ""                # 冷却原因
    
    # 元数据
    proxy: str = ""
    device_model: str = ""
    created_at: float = field(default_factory=time.time)
    
    def is_available(self) -> bool:
        """检查账号是否可用"""
        if self.state in (AccountState.BANNED, AccountState.NEEDS_AUTH):
            return False
        if self.cooldown_until > time.time():
            return False
        return True
    
    def is_in_cooldown(self) -> bool:
        """检查是否在冷却中"""
        return self.cooldown_until > time.time()
    
    def get_cooldown_remaining(self) -> int:
        """获取剩余冷却时间（秒）"""
        remaining = self.cooldown_until - time.time()
        return max(0, int(remaining))
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'phone': self.phone,
            'tier': self.tier.value,
            'state': self.state.value,
            'last_active_at': self.last_active_at,
            'priority': self.priority,
            'connection_quality': self.connection_quality,
            'is_available': self.is_available(),
            'cooldown_remaining': self.get_cooldown_remaining(),
            'consecutive_failures': self.consecutive_failures,
            'total_messages_today': self.total_messages_today,
        }


class AccountPoolManager:
    """
    账号连接池管理器
    
    职责：
    1. 管理账号的连接池层级（Hot/Warm/Cold）
    2. 自动升降级账号
    3. 智能调度账号执行任务
    4. 健康检查和故障恢复
    """
    
    def __init__(
        self,
        config: Optional[PoolConfig] = None,
        event_callback: Optional[Callable[[str, Any], None]] = None
    ):
        self.config = config or PoolConfig(
            hot_pool_size=SandboxConfig.MAX_CONCURRENT_CLIENTS
        )
        self.event_callback = event_callback
        
        # 账号池
        self._accounts: Dict[str, AccountPoolEntry] = {}
        
        # 层级索引（快速查找）
        self._tier_index: Dict[PoolTier, Set[str]] = {
            PoolTier.HOT: set(),
            PoolTier.WARM: set(),
            PoolTier.COLD: set(),
        }
        
        # 锁
        self._lock = asyncio.Lock()
        
        # 后台任务
        self._maintenance_task: Optional[asyncio.Task] = None
        self._running = False
        
        # 统计
        self._stats = {
            'promotions': 0,
            'demotions': 0,
            'failures': 0,
            'recoveries': 0,
        }
        
        print(f"[AccountPool] 初始化: Hot={self.config.hot_pool_size}, Warm={self.config.warm_pool_size}", file=sys.stderr)
    
    # ==================== 基础操作 ====================
    
    async def register_account(self, phone: str, **kwargs) -> AccountPoolEntry:
        """
        注册账号到连接池
        
        Args:
            phone: 手机号
            **kwargs: 其他属性（proxy, device_model等）
        
        Returns:
            账号池条目
        """
        async with self._lock:
            if phone in self._accounts:
                # 更新现有账号
                entry = self._accounts[phone]
                for key, value in kwargs.items():
                    if hasattr(entry, key):
                        setattr(entry, key, value)
                return entry
            
            # 创建新条目
            entry = AccountPoolEntry(
                phone=phone,
                tier=PoolTier.COLD,
                state=AccountState.DISCONNECTED,
                **{k: v for k, v in kwargs.items() if hasattr(AccountPoolEntry, k)}
            )
            
            self._accounts[phone] = entry
            self._tier_index[PoolTier.COLD].add(phone)
            
            print(f"[AccountPool] 注册账号: {phone} → Cold池", file=sys.stderr)
            return entry
    
    async def unregister_account(self, phone: str) -> bool:
        """注销账号"""
        async with self._lock:
            if phone not in self._accounts:
                return False
            
            entry = self._accounts[phone]
            self._tier_index[entry.tier].discard(phone)
            del self._accounts[phone]
            
            print(f"[AccountPool] 注销账号: {phone}", file=sys.stderr)
            return True
    
    def get_account(self, phone: str) -> Optional[AccountPoolEntry]:
        """获取账号信息"""
        return self._accounts.get(phone)
    
    def get_all_accounts(self) -> List[AccountPoolEntry]:
        """获取所有账号"""
        return list(self._accounts.values())
    
    # ==================== 层级管理 ====================
    
    async def promote_to_hot(self, phone: str, reason: str = "") -> bool:
        """
        提升账号到 Hot 池
        
        Args:
            phone: 手机号
            reason: 提升原因
        
        Returns:
            是否成功
        """
        async with self._lock:
            entry = self._accounts.get(phone)
            if not entry:
                return False
            
            if entry.tier == PoolTier.HOT:
                return True
            
            # 检查 Hot 池容量
            if len(self._tier_index[PoolTier.HOT]) >= self.config.hot_pool_size:
                # 需要降级一个账号
                await self._demote_least_active_hot()
            
            # 提升
            old_tier = entry.tier
            self._tier_index[old_tier].discard(phone)
            entry.tier = PoolTier.HOT
            entry.promoted_at = time.time()
            self._tier_index[PoolTier.HOT].add(phone)
            
            self._stats['promotions'] += 1
            print(f"[AccountPool] 提升: {phone} {old_tier.value}→Hot ({reason})", file=sys.stderr)
            
            # 发送事件
            if self.event_callback:
                self.event_callback('pool.promoted', {
                    'phone': phone,
                    'from_tier': old_tier.value,
                    'to_tier': 'hot',
                    'reason': reason
                })
            
            return True
    
    async def demote_to_warm(self, phone: str, reason: str = "") -> bool:
        """降级到 Warm 池"""
        async with self._lock:
            return await self._demote_account(phone, PoolTier.WARM, reason)
    
    async def demote_to_cold(self, phone: str, reason: str = "") -> bool:
        """降级到 Cold 池"""
        async with self._lock:
            return await self._demote_account(phone, PoolTier.COLD, reason)
    
    async def _demote_account(self, phone: str, target_tier: PoolTier, reason: str) -> bool:
        """内部降级方法"""
        entry = self._accounts.get(phone)
        if not entry:
            return False
        
        if entry.tier == target_tier:
            return True
        
        old_tier = entry.tier
        self._tier_index[old_tier].discard(phone)
        entry.tier = target_tier
        entry.demoted_at = time.time()
        self._tier_index[target_tier].add(phone)
        
        self._stats['demotions'] += 1
        print(f"[AccountPool] 降级: {phone} {old_tier.value}→{target_tier.value} ({reason})", file=sys.stderr)
        
        if self.event_callback:
            self.event_callback('pool.demoted', {
                'phone': phone,
                'from_tier': old_tier.value,
                'to_tier': target_tier.value,
                'reason': reason
            })
        
        return True
    
    async def _demote_least_active_hot(self):
        """降级最不活跃的 Hot 池账号"""
        hot_accounts = [
            self._accounts[phone] 
            for phone in self._tier_index[PoolTier.HOT]
        ]
        
        if not hot_accounts:
            return
        
        # 按活跃时间排序，降级最不活跃的
        hot_accounts.sort(key=lambda x: x.last_active_at)
        least_active = hot_accounts[0]
        
        await self._demote_account(
            least_active.phone, 
            PoolTier.WARM, 
            "为新账号腾出Hot池位置"
        )
    
    # ==================== 状态更新 ====================
    
    async def update_state(self, phone: str, state: AccountState) -> bool:
        """更新账号状态"""
        async with self._lock:
            entry = self._accounts.get(phone)
            if not entry:
                return False
            
            old_state = entry.state
            entry.state = state
            
            if state == AccountState.ONLINE:
                entry.consecutive_failures = 0
            elif state == AccountState.ERROR:
                entry.consecutive_failures += 1
            
            print(f"[AccountPool] 状态更新: {phone} {old_state.value}→{state.value}", file=sys.stderr)
            return True
    
    async def mark_active(self, phone: str):
        """标记账号为活跃"""
        entry = self._accounts.get(phone)
        if entry:
            entry.last_active_at = time.time()
            
            # 自动提升到 Hot
            if self.config.auto_promote_on_message and entry.tier != PoolTier.HOT:
                await self.promote_to_hot(phone, "收到活动")
    
    async def mark_message_received(self, phone: str):
        """标记收到消息"""
        entry = self._accounts.get(phone)
        if entry:
            entry.last_message_at = time.time()
            entry.last_active_at = time.time()
            entry.total_messages_today += 1
            
            # 自动提升到 Hot
            if self.config.auto_promote_on_message and entry.tier != PoolTier.HOT:
                await self.promote_to_hot(phone, "收到消息")
    
    async def set_cooldown(self, phone: str, seconds: int, reason: str = "FloodWait"):
        """设置账号冷却"""
        async with self._lock:
            entry = self._accounts.get(phone)
            if not entry:
                return
            
            seconds = min(seconds, self.config.max_cooldown_seconds)
            entry.cooldown_until = time.time() + seconds
            entry.cooldown_reason = reason
            entry.state = AccountState.COOLDOWN
            
            # 降级到 Cold
            await self._demote_account(phone, PoolTier.COLD, f"冷却 {seconds}s: {reason}")
            
            print(f"[AccountPool] 冷却: {phone} {seconds}s ({reason})", file=sys.stderr)
    
    async def record_failure(self, phone: str, error: str = ""):
        """记录失败"""
        async with self._lock:
            entry = self._accounts.get(phone)
            if not entry:
                return
            
            entry.consecutive_failures += 1
            entry.connection_quality *= 0.9  # 降低质量评分
            self._stats['failures'] += 1
            
            # 超过阈值，降级
            if entry.consecutive_failures >= self.config.max_consecutive_failures:
                entry.state = AccountState.ERROR
                await self._demote_account(phone, PoolTier.COLD, f"连续失败{entry.consecutive_failures}次")
    
    async def record_success(self, phone: str):
        """记录成功"""
        entry = self._accounts.get(phone)
        if entry:
            entry.consecutive_failures = 0
            entry.connection_quality = min(1.0, entry.connection_quality * 1.1 + 0.05)
            
            if entry.state == AccountState.ERROR:
                entry.state = AccountState.ONLINE
                self._stats['recoveries'] += 1
    
    # ==================== 调度选择 ====================
    
    async def select_account_for_task(
        self,
        task_type: str = "send",
        exclude: Optional[Set[str]] = None,
        prefer_proxy: Optional[str] = None
    ) -> Optional[str]:
        """
        为任务选择最佳账号
        
        Args:
            task_type: 任务类型（send, monitor, etc.）
            exclude: 排除的账号
            prefer_proxy: 首选代理
        
        Returns:
            选中的账号手机号，或 None
        """
        exclude = exclude or set()
        
        candidates = []
        
        # 优先从 Hot 池选择
        for phone in self._tier_index[PoolTier.HOT]:
            if phone in exclude:
                continue
            entry = self._accounts[phone]
            if entry.is_available() and entry.state == AccountState.ONLINE:
                candidates.append(entry)
        
        # Hot 池不够，从 Warm 池选择
        if not candidates:
            for phone in self._tier_index[PoolTier.WARM]:
                if phone in exclude:
                    continue
                entry = self._accounts[phone]
                if entry.is_available():
                    candidates.append(entry)
        
        if not candidates:
            return None
        
        # 评分排序
        def score_account(entry: AccountPoolEntry) -> float:
            score = entry.priority * 10
            score += entry.connection_quality * 50
            score -= entry.consecutive_failures * 20
            score -= (time.time() - entry.last_active_at) / 60  # 越活跃越好
            
            if prefer_proxy and entry.proxy == prefer_proxy:
                score += 30
            
            return score
        
        candidates.sort(key=score_account, reverse=True)
        return candidates[0].phone
    
    async def get_available_accounts(self, tier: Optional[PoolTier] = None) -> List[str]:
        """获取可用账号列表"""
        result = []
        
        tiers = [tier] if tier else [PoolTier.HOT, PoolTier.WARM, PoolTier.COLD]
        
        for t in tiers:
            for phone in self._tier_index[t]:
                entry = self._accounts[phone]
                if entry.is_available():
                    result.append(phone)
        
        return result
    
    # ==================== 统计信息 ====================
    
    def get_pool_stats(self) -> Dict[str, Any]:
        """获取连接池统计"""
        return {
            'total_accounts': len(self._accounts),
            'hot_count': len(self._tier_index[PoolTier.HOT]),
            'warm_count': len(self._tier_index[PoolTier.WARM]),
            'cold_count': len(self._tier_index[PoolTier.COLD]),
            'hot_limit': self.config.hot_pool_size,
            'warm_limit': self.config.warm_pool_size,
            'available_hot_slots': max(0, self.config.hot_pool_size - len(self._tier_index[PoolTier.HOT])),
            'stats': self._stats.copy(),
            'config': {
                'hot_to_warm_idle': self.config.hot_to_warm_idle_seconds,
                'warm_to_cold_idle': self.config.warm_to_cold_idle_seconds,
                'health_check_interval': self.config.health_check_interval,
            }
        }
    
    def get_tier_accounts(self, tier: PoolTier) -> List[Dict[str, Any]]:
        """获取指定层级的账号列表"""
        return [
            self._accounts[phone].to_dict()
            for phone in self._tier_index[tier]
        ]
    
    # ==================== 后台维护 ====================
    
    async def start(self):
        """启动后台维护任务"""
        if self._running:
            return
        
        self._running = True
        self._maintenance_task = asyncio.create_task(self._maintenance_loop())
        print("[AccountPool] 后台维护任务已启动", file=sys.stderr)
    
    async def stop(self):
        """停止后台维护任务"""
        self._running = False
        if self._maintenance_task:
            self._maintenance_task.cancel()
            try:
                await self._maintenance_task
            except asyncio.CancelledError:
                pass
        print("[AccountPool] 后台维护任务已停止", file=sys.stderr)
    
    async def _maintenance_loop(self):
        """后台维护循环"""
        while self._running:
            try:
                await self._perform_maintenance()
                await asyncio.sleep(self.config.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[AccountPool] 维护任务错误: {e}", file=sys.stderr)
                await asyncio.sleep(10)
    
    async def _perform_maintenance(self):
        """执行维护任务"""
        current_time = time.time()
        
        async with self._lock:
            # 1. 检查 Hot 池，降级不活跃账号
            for phone in list(self._tier_index[PoolTier.HOT]):
                entry = self._accounts.get(phone)
                if not entry:
                    continue
                
                idle_time = current_time - entry.last_active_at
                if idle_time > self.config.hot_to_warm_idle_seconds:
                    await self._demote_account(phone, PoolTier.WARM, f"空闲{int(idle_time)}s")
            
            # 2. 检查 Warm 池，降级不活跃账号
            for phone in list(self._tier_index[PoolTier.WARM]):
                entry = self._accounts.get(phone)
                if not entry:
                    continue
                
                idle_time = current_time - entry.last_active_at
                if idle_time > self.config.warm_to_cold_idle_seconds:
                    await self._demote_account(phone, PoolTier.COLD, f"空闲{int(idle_time)}s")
            
            # 3. 检查冷却结束的账号
            for phone, entry in self._accounts.items():
                if entry.state == AccountState.COOLDOWN and not entry.is_in_cooldown():
                    entry.state = AccountState.DISCONNECTED
                    print(f"[AccountPool] 冷却结束: {phone}", file=sys.stderr)
            
            # 4. 重置每日计数（简化版，实际应该在午夜重置）
            # 这里暂时不实现，需要更复杂的时间判断


# 全局实例
_pool_instance: Optional[AccountPoolManager] = None


def get_account_pool() -> AccountPoolManager:
    """获取全局账号池实例"""
    global _pool_instance
    if _pool_instance is None:
        _pool_instance = AccountPoolManager()
    return _pool_instance


async def init_account_pool(event_callback: Optional[Callable] = None) -> AccountPoolManager:
    """初始化账号池"""
    global _pool_instance
    _pool_instance = AccountPoolManager(event_callback=event_callback)
    await _pool_instance.start()
    return _pool_instance

