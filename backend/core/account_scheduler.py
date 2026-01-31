"""
TG-Matrix 多帳號調度模組
Phase B: Functionality - 多帳號調度

功能：
1. 帳號健康度模型
2. 智能選擇算法
3. 負載均衡
4. 故障轉移
"""

import asyncio
import time
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Awaitable
from collections import defaultdict
import random

from .logging import get_logger

logger = get_logger("account_scheduler")


class AccountRole(Enum):
    """帳號角色"""
    LISTENER = "Listener"
    SENDER = "Sender"
    NORMAL = "Normal"


class AccountStatus(Enum):
    """帳號狀態"""
    ONLINE = "online"
    OFFLINE = "offline"
    CONNECTING = "connecting"
    COOLING = "cooling"      # 冷卻中（FloodWait）
    DISABLED = "disabled"    # 已禁用
    ERROR = "error"


@dataclass
class AccountHealth:
    """帳號健康度"""
    account_id: str
    phone: str
    role: AccountRole
    status: AccountStatus
    
    # 健康指標 (0-100)
    online_score: float = 0        # 在線狀態分數
    success_rate_score: float = 0  # 發送成功率分數
    cooldown_score: float = 0      # 冷卻狀態分數
    risk_score: float = 0          # 風險等級分數
    load_score: float = 0          # 負載均衡分數
    
    # 原始數據
    total_sent: int = 0
    total_success: int = 0
    total_failed: int = 0
    last_send_time: Optional[datetime] = None
    last_flood_wait: Optional[datetime] = None
    flood_wait_seconds: int = 0
    current_tasks: int = 0
    daily_sent: int = 0
    daily_limit: int = 200
    
    # 計算屬性
    @property
    def health_score(self) -> float:
        """計算綜合健康分數"""
        weights = {
            "online": 0.30,
            "success_rate": 0.25,
            "cooldown": 0.20,
            "risk": 0.15,
            "load": 0.10
        }
        return (
            self.online_score * weights["online"] +
            self.success_rate_score * weights["success_rate"] +
            self.cooldown_score * weights["cooldown"] +
            self.risk_score * weights["risk"] +
            self.load_score * weights["load"]
        )
    
    @property
    def is_available(self) -> bool:
        """是否可用"""
        return (
            self.status == AccountStatus.ONLINE and
            not self.is_cooling and
            self.daily_sent < self.daily_limit
        )
    
    @property
    def is_cooling(self) -> bool:
        """是否在冷卻中"""
        if not self.last_flood_wait or not self.flood_wait_seconds:
            return False
        
        cooldown_end = self.last_flood_wait + timedelta(seconds=self.flood_wait_seconds)
        return datetime.now() < cooldown_end
    
    @property
    def cooling_remaining(self) -> int:
        """剩餘冷卻時間（秒）"""
        if not self.is_cooling:
            return 0
        
        cooldown_end = self.last_flood_wait + timedelta(seconds=self.flood_wait_seconds)
        return int((cooldown_end - datetime.now()).total_seconds())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "account_id": self.account_id,
            "phone": self.phone,
            "role": self.role.value,
            "status": self.status.value,
            "health_score": round(self.health_score, 2),
            "is_available": self.is_available,
            "is_cooling": self.is_cooling,
            "cooling_remaining": self.cooling_remaining,
            "scores": {
                "online": round(self.online_score, 2),
                "success_rate": round(self.success_rate_score, 2),
                "cooldown": round(self.cooldown_score, 2),
                "risk": round(self.risk_score, 2),
                "load": round(self.load_score, 2)
            },
            "stats": {
                "total_sent": self.total_sent,
                "total_success": self.total_success,
                "total_failed": self.total_failed,
                "daily_sent": self.daily_sent,
                "daily_limit": self.daily_limit,
                "current_tasks": self.current_tasks
            }
        }


@dataclass
class SchedulerConfig:
    """調度器配置"""
    # 選擇策略
    selection_strategy: str = "weighted_random"  # weighted_random, round_robin, least_loaded
    # 選擇 Top N 中隨機
    top_n_selection: int = 3
    # 最小冷卻間隔（秒）
    min_send_interval: float = 2.0
    # 最大並發任務
    max_concurrent_tasks: int = 5
    # 每日發送限制
    default_daily_limit: int = 200
    # 健康度閾值（低於此值不使用）
    min_health_score: float = 30.0
    # 故障轉移等待時間（秒）
    failover_timeout: float = 10.0


class AccountScheduler:
    """帳號調度器"""
    
    def __init__(self, config: Optional[SchedulerConfig] = None):
        self.config = config or SchedulerConfig()
        
        # 帳號健康數據
        self._accounts: Dict[str, AccountHealth] = {}
        
        # 任務分配追蹤
        self._task_assignments: Dict[str, List[str]] = defaultdict(list)  # account_id -> [task_ids]
        
        # 輪詢索引（用於 round_robin）
        self._round_robin_index = 0
        
        # 鎖
        self._lock = asyncio.Lock()
        
        # 事件回調
        self._on_failover: Optional[Callable[[str, str, str], Awaitable[None]]] = None
    
    def register_account(
        self,
        account_id: str,
        phone: str,
        role: AccountRole,
        status: AccountStatus = AccountStatus.OFFLINE,
        daily_limit: Optional[int] = None
    ) -> AccountHealth:
        """註冊帳號"""
        health = AccountHealth(
            account_id=account_id,
            phone=phone,
            role=role,
            status=status,
            daily_limit=daily_limit or self.config.default_daily_limit
        )
        
        self._accounts[account_id] = health
        self._update_scores(account_id)
        
        logger.info(f"Registered account: {phone} ({role.value})")
        return health
    
    def update_account_status(self, account_id: str, status: AccountStatus):
        """更新帳號狀態"""
        if account_id in self._accounts:
            self._accounts[account_id].status = status
            self._update_scores(account_id)
    
    def record_send_result(
        self,
        account_id: str,
        success: bool,
        flood_wait_seconds: int = 0
    ):
        """記錄發送結果"""
        if account_id not in self._accounts:
            return
        
        health = self._accounts[account_id]
        health.total_sent += 1
        health.daily_sent += 1
        health.last_send_time = datetime.now()
        
        if success:
            health.total_success += 1
        else:
            health.total_failed += 1
            
            if flood_wait_seconds > 0:
                health.last_flood_wait = datetime.now()
                health.flood_wait_seconds = flood_wait_seconds
                health.status = AccountStatus.COOLING
                logger.warning(f"Account {health.phone} in FloodWait: {flood_wait_seconds}s")
        
        self._update_scores(account_id)
    
    def start_task(self, account_id: str, task_id: str):
        """開始任務"""
        if account_id in self._accounts:
            self._accounts[account_id].current_tasks += 1
            self._task_assignments[account_id].append(task_id)
            self._update_scores(account_id)
    
    def end_task(self, account_id: str, task_id: str):
        """結束任務"""
        if account_id in self._accounts:
            self._accounts[account_id].current_tasks = max(0, self._accounts[account_id].current_tasks - 1)
            if task_id in self._task_assignments[account_id]:
                self._task_assignments[account_id].remove(task_id)
            self._update_scores(account_id)
    
    async def select_account(
        self,
        role: Optional[AccountRole] = None,
        exclude: Optional[List[str]] = None
    ) -> Optional[AccountHealth]:
        """
        選擇最佳帳號
        
        Args:
            role: 指定角色（None 表示不限）
            exclude: 排除的帳號 ID 列表
        
        Returns:
            選中的帳號健康信息，或 None
        """
        async with self._lock:
            exclude = exclude or []
            
            # 篩選候選帳號
            candidates = [
                h for h in self._accounts.values()
                if h.is_available
                and h.account_id not in exclude
                and h.health_score >= self.config.min_health_score
                and (role is None or h.role == role)
            ]
            
            if not candidates:
                logger.warning("No available accounts for selection")
                return None
            
            # 根據策略選擇
            if self.config.selection_strategy == "weighted_random":
                return self._weighted_random_select(candidates)
            elif self.config.selection_strategy == "round_robin":
                return self._round_robin_select(candidates)
            elif self.config.selection_strategy == "least_loaded":
                return self._least_loaded_select(candidates)
            else:
                return self._weighted_random_select(candidates)
    
    def _weighted_random_select(self, candidates: List[AccountHealth]) -> AccountHealth:
        """加權隨機選擇"""
        # 按健康度排序
        sorted_candidates = sorted(candidates, key=lambda h: h.health_score, reverse=True)
        
        # 從 Top N 中隨機選擇
        top_n = sorted_candidates[:self.config.top_n_selection]
        
        # 按健康度加權
        total_score = sum(h.health_score for h in top_n)
        if total_score == 0:
            return random.choice(top_n)
        
        r = random.uniform(0, total_score)
        cumulative = 0
        for h in top_n:
            cumulative += h.health_score
            if r <= cumulative:
                return h
        
        return top_n[-1]
    
    def _round_robin_select(self, candidates: List[AccountHealth]) -> AccountHealth:
        """輪詢選擇"""
        # 按 ID 排序確保順序一致
        sorted_candidates = sorted(candidates, key=lambda h: h.account_id)
        
        self._round_robin_index = self._round_robin_index % len(sorted_candidates)
        selected = sorted_candidates[self._round_robin_index]
        self._round_robin_index += 1
        
        return selected
    
    def _least_loaded_select(self, candidates: List[AccountHealth]) -> AccountHealth:
        """最少負載選擇"""
        return min(candidates, key=lambda h: h.current_tasks)
    
    async def failover(
        self,
        failed_account_id: str,
        task_id: str,
        reason: str
    ) -> Optional[AccountHealth]:
        """
        故障轉移
        
        Args:
            failed_account_id: 失敗的帳號 ID
            task_id: 任務 ID
            reason: 失敗原因
        
        Returns:
            新選擇的帳號，或 None
        """
        logger.warning(f"Failover triggered for {failed_account_id}: {reason}")
        
        # 標記失敗帳號
        if failed_account_id in self._accounts:
            self._accounts[failed_account_id].status = AccountStatus.ERROR
            self.end_task(failed_account_id, task_id)
        
        # 選擇新帳號
        new_account = await self.select_account(exclude=[failed_account_id])
        
        if new_account:
            logger.info(f"Failover to {new_account.phone}")
            
            # 回調通知
            if self._on_failover:
                await self._on_failover(failed_account_id, new_account.account_id, reason)
        
        return new_account
    
    def on_failover(self, callback: Callable[[str, str, str], Awaitable[None]]):
        """設置故障轉移回調"""
        self._on_failover = callback
    
    def _update_scores(self, account_id: str):
        """更新帳號分數"""
        if account_id not in self._accounts:
            return
        
        health = self._accounts[account_id]
        
        # 在線狀態分數
        health.online_score = 100.0 if health.status == AccountStatus.ONLINE else 0.0
        
        # 發送成功率分數
        if health.total_sent > 0:
            health.success_rate_score = (health.total_success / health.total_sent) * 100
        else:
            health.success_rate_score = 100.0  # 新帳號默認滿分
        
        # 冷卻狀態分數
        if health.is_cooling:
            # 剩餘冷卻時間越長，分數越低
            remaining = health.cooling_remaining
            max_cooldown = 3600  # 假設最大冷卻 1 小時
            health.cooldown_score = max(0, (1 - remaining / max_cooldown) * 100)
        else:
            # 距離上次發送越久，分數越高
            if health.last_send_time:
                seconds_since = (datetime.now() - health.last_send_time).total_seconds()
                health.cooldown_score = min(100, seconds_since / self.config.min_send_interval * 100)
            else:
                health.cooldown_score = 100.0
        
        # 風險等級分數（基於 FloodWait 歷史）
        if health.last_flood_wait:
            hours_since = (datetime.now() - health.last_flood_wait).total_seconds() / 3600
            health.risk_score = min(100, hours_since * 10)  # 10 小時恢復滿分
        else:
            health.risk_score = 100.0
        
        # 負載均衡分數
        health.load_score = max(0, (1 - health.current_tasks / self.config.max_concurrent_tasks) * 100)
    
    def reset_daily_stats(self):
        """重置每日統計"""
        for health in self._accounts.values():
            health.daily_sent = 0
        logger.info("Daily stats reset")
    
    def get_account_health(self, account_id: str) -> Optional[AccountHealth]:
        """獲取帳號健康信息"""
        return self._accounts.get(account_id)
    
    def get_all_accounts(self) -> List[AccountHealth]:
        """獲取所有帳號"""
        return list(self._accounts.values())
    
    def get_available_accounts(
        self,
        role: Optional[AccountRole] = None
    ) -> List[AccountHealth]:
        """獲取可用帳號"""
        return [
            h for h in self._accounts.values()
            if h.is_available
            and (role is None or h.role == role)
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        accounts = list(self._accounts.values())
        
        return {
            "total_accounts": len(accounts),
            "online_accounts": len([a for a in accounts if a.status == AccountStatus.ONLINE]),
            "available_accounts": len([a for a in accounts if a.is_available]),
            "cooling_accounts": len([a for a in accounts if a.is_cooling]),
            "by_role": {
                role.value: len([a for a in accounts if a.role == role])
                for role in AccountRole
            },
            "by_status": {
                status.value: len([a for a in accounts if a.status == status])
                for status in AccountStatus
            },
            "avg_health_score": sum(a.health_score for a in accounts) / len(accounts) if accounts else 0,
            "total_daily_sent": sum(a.daily_sent for a in accounts),
            "config": {
                "selection_strategy": self.config.selection_strategy,
                "min_health_score": self.config.min_health_score,
                "default_daily_limit": self.config.default_daily_limit
            }
        }


# 全局實例
_scheduler: Optional[AccountScheduler] = None


def init_account_scheduler(config: Optional[SchedulerConfig] = None) -> AccountScheduler:
    """初始化帳號調度器"""
    global _scheduler
    _scheduler = AccountScheduler(config)
    return _scheduler


def get_account_scheduler() -> Optional[AccountScheduler]:
    """獲取帳號調度器"""
    return _scheduler


__all__ = [
    'AccountRole',
    'AccountStatus',
    'AccountHealth',
    'SchedulerConfig',
    'AccountScheduler',
    'init_account_scheduler',
    'get_account_scheduler'
]
