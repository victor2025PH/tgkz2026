"""
TG-Matrix Queue Optimizer
消息发送队列优化器 - 智能调度消息发送，提高送达率和效率
"""
import asyncio
import time
from typing import Dict, List, Optional, Tuple, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, deque
import sys


@dataclass
class UserActivityProfile:
    """用户活动时间画像"""
    user_id: str
    # 在线时间统计（小时 -> 在线次数）
    online_hours: Dict[int, int] = field(default_factory=lambda: defaultdict(int))
    # 最近在线时间
    last_seen: Optional[datetime] = None
    # 平均在线时长（分钟）
    avg_online_duration: float = 0.0
    # 总观察次数
    observation_count: int = 0
    # 最佳发送时间（小时）
    best_send_hours: List[int] = field(default_factory=list)
    
    def update_activity(self, hour: int, is_online: bool = True):
        """更新活动时间"""
        if is_online:
            self.online_hours[hour] += 1
            self.last_seen = datetime.now()
        self.observation_count += 1
        self._calculate_best_hours()
    
    def _calculate_best_hours(self):
        """计算最佳发送时间"""
        if not self.online_hours:
            # 默认：9:00-12:00, 19:00-22:00
            self.best_send_hours = [9, 10, 11, 12, 19, 20, 21, 22]
            return
        
        # 计算每个小时的在线率
        hour_rates = {}
        for hour in range(24):
            online_count = self.online_hours.get(hour, 0)
            # 假设每个小时至少观察一次
            rate = online_count / max(self.observation_count / 24, 1)
            hour_rates[hour] = rate
        
        # 选择在线率最高的时间段（前 8 个小时）
        sorted_hours = sorted(hour_rates.items(), key=lambda x: x[1], reverse=True)
        self.best_send_hours = [h for h, _ in sorted_hours[:8]]
        self.best_send_hours.sort()
    
    def should_send_now(self) -> Tuple[bool, float]:
        """
        判断是否应该现在发送
        
        Returns:
            (should_send, priority_score)
            priority_score: 0-1，越高优先级越高
        """
        current_hour = datetime.now().hour
        
        if current_hour in self.best_send_hours:
            # 在最佳时间段内，高优先级
            return True, 0.9
        
        # 检查是否接近最佳时间段
        for best_hour in self.best_send_hours:
            hour_diff = abs(current_hour - best_hour)
            if hour_diff <= 1:
                # 接近最佳时间段，中等优先级
                return True, 0.6
        
        # 不在最佳时间段，低优先级
        return True, 0.3  # 仍然允许发送，但优先级较低


@dataclass
class BatchGroup:
    """批量发送组"""
    account_phone: str
    messages: List[Dict[str, any]] = field(default_factory=list)
    priority: int = 0  # 组优先级（基于消息优先级）
    estimated_send_time: float = 0.0  # 预计发送时间（秒）
    
    def add_message(self, message: Dict[str, any]):
        """添加消息到组"""
        self.messages.append(message)
        # 更新组优先级（取最高优先级）
        msg_priority = message.get('priority', 2)
        if msg_priority < self.priority or self.priority == 0:
            self.priority = msg_priority
        # 估算发送时间（每条消息约 2-5 秒）
        self.estimated_send_time += 3.0


class QueueOptimizer:
    """消息队列优化器"""
    
    def __init__(
        self,
        max_batch_size: int = 10,
        batch_interval_seconds: float = 5.0,
        min_send_interval: float = 2.0,
        max_send_interval: float = 10.0
    ):
        """
        初始化队列优化器
        
        Args:
            max_batch_size: 最大批量大小
            batch_interval_seconds: 批量发送间隔（秒）
            min_send_interval: 最小发送间隔（秒）
            max_send_interval: 最大发送间隔（秒）
        """
        self.max_batch_size = max_batch_size
        self.batch_interval = batch_interval_seconds
        self.min_send_interval = min_send_interval
        self.max_send_interval = max_send_interval
        
        # 用户活动画像：user_id -> UserActivityProfile
        self.user_profiles: Dict[str, UserActivityProfile] = {}
        
        # 账户发送统计：phone -> stats
        self.account_stats: Dict[str, Dict[str, any]] = {}
        
        # 批量发送队列：phone -> BatchGroup
        self.batch_queues: Dict[str, BatchGroup] = {}
        
        # 发送历史：phone -> deque(发送时间)
        self.send_history: Dict[str, deque] = {}
        
        # 性能统计
        self.performance_stats = {
            "total_optimized": 0,
            "total_batches": 0,
            "avg_batch_size": 0.0,
            "avg_delivery_rate": 0.0,
            "avg_response_time": 0.0
        }
    
    def get_or_create_profile(self, user_id: str) -> UserActivityProfile:
        """获取或创建用户活动画像"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserActivityProfile(user_id=user_id)
        return self.user_profiles[user_id]
    
    def update_user_activity(self, user_id: str, is_online: bool = True):
        """更新用户活动时间"""
        profile = self.get_or_create_profile(user_id)
        current_hour = datetime.now().hour
        profile.update_activity(current_hour, is_online)
    
    def optimize_send_time(
        self,
        user_id: str,
        scheduled_at: Optional[datetime] = None
    ) -> datetime:
        """
        优化发送时间
        
        Args:
            user_id: 目标用户 ID
            scheduled_at: 原始计划发送时间
        
        Returns:
            优化后的发送时间
        """
        profile = self.get_or_create_profile(user_id)
        
        # 如果用户有活动画像，使用最佳发送时间
        if profile.best_send_hours:
            now = datetime.now()
            current_hour = now.hour
            
            # 如果当前不在最佳时间段，调整到最近的最佳时间段
            if current_hour not in profile.best_send_hours:
                # 找到下一个最佳时间段
                next_best_hour = None
                for best_hour in sorted(profile.best_send_hours):
                    if best_hour > current_hour:
                        next_best_hour = best_hour
                        break
                
                if next_best_hour is None:
                    # 如果今天没有更好的时间，使用明天的最佳时间
                    next_best_hour = min(profile.best_send_hours)
                    now = now + timedelta(days=1)
                
                # 调整到最佳时间段的开始
                optimized_time = now.replace(hour=next_best_hour, minute=0, second=0)
                
                # 如果优化后的时间太远（超过 24 小时），使用原始时间
                if (optimized_time - datetime.now()).total_seconds() > 86400:
                    return scheduled_at or datetime.now()
                
                return optimized_time
        
        # 如果没有活动画像，使用原始时间或当前时间
        return scheduled_at or datetime.now()
    
    def should_send_now(
        self,
        user_id: str,
        account_phone: str
    ) -> Tuple[bool, float]:
        """
        判断是否应该现在发送
        
        Args:
            user_id: 目标用户 ID
            account_phone: 发送账户
        
        Returns:
            (should_send, priority_score)
        """
        # 检查账户发送频率
        if account_phone in self.send_history:
            history = self.send_history[account_phone]
            now = time.time()
            
            # 清理旧记录（超过 1 小时）
            while history and now - history[0] > 3600:
                history.popleft()
            
            # 检查是否超过频率限制
            if len(history) >= 200:  # 每小时最多 200 条
                # 计算需要等待的时间
                oldest = history[0]
                wait_seconds = 3600 - (now - oldest)
                if wait_seconds > 0:
                    return False, 0.0
        
        # 检查用户活动时间
        profile = self.get_or_create_profile(user_id)
        should_send, priority = profile.should_send_now()
        
        return should_send, priority
    
    def create_batch_group(
        self,
        account_phone: str,
        messages: List[Dict[str, any]]
    ) -> BatchGroup:
        """
        创建批量发送组
        
        Args:
            account_phone: 账户电话
            messages: 消息列表
        
        Returns:
            批量发送组
        """
        batch = BatchGroup(account_phone=account_phone)
        
        # 按优先级排序消息
        sorted_messages = sorted(
            messages,
            key=lambda m: (
                m.get('priority', 2),  # 优先级（数字越小优先级越高）
                m.get('created_at', datetime.now()).timestamp()  # 创建时间
            )
        )
        
        # 添加到批量组（限制批量大小）
        for msg in sorted_messages[:self.max_batch_size]:
            batch.add_message(msg)
        
        return batch
    
    def add_to_batch(
        self,
        account_phone: str,
        message: Dict[str, any]
    ) -> bool:
        """
        添加消息到批量队列
        
        Args:
            account_phone: 账户电话
            message: 消息数据
        
        Returns:
            是否成功添加
        """
        if account_phone not in self.batch_queues:
            self.batch_queues[account_phone] = BatchGroup(account_phone=account_phone)
        
        batch = self.batch_queues[account_phone]
        
        # 检查批量大小
        if len(batch.messages) >= self.max_batch_size:
            return False  # 批量已满
        
        batch.add_message(message)
        return True
    
    def get_batch_for_sending(
        self,
        account_phone: str
    ) -> Optional[BatchGroup]:
        """
        获取准备发送的批量组
        
        Args:
            account_phone: 账户电话
        
        Returns:
            批量发送组，如果没有则返回 None
        """
        if account_phone not in self.batch_queues:
            return None
        
        batch = self.batch_queues[account_phone]
        
        # 检查批量大小和间隔
        if len(batch.messages) == 0:
            return None
        
        # 如果批量大小达到阈值，或者等待时间超过间隔，返回批量
        if len(batch.messages) >= self.max_batch_size:
            return batch
        
        # 检查是否达到批量间隔（简化：总是返回，实际应该检查时间）
        return batch
    
    def clear_batch(self, account_phone: str):
        """清空批量队列"""
        if account_phone in self.batch_queues:
            batch = self.batch_queues[account_phone]
            batch.messages.clear()
            batch.priority = 0
            batch.estimated_send_time = 0.0
    
    def record_send(
        self,
        account_phone: str,
        user_id: str,
        success: bool,
        response_time: float
    ):
        """记录发送结果"""
        # 记录发送历史
        if account_phone not in self.send_history:
            self.send_history[account_phone] = deque(maxlen=1000)
        
        if success:
            self.send_history[account_phone].append(time.time())
        
        # 更新账户统计
        if account_phone not in self.account_stats:
            self.account_stats[account_phone] = {
                "total_sends": 0,
                "successful_sends": 0,
                "failed_sends": 0,
                "avg_response_time": 0.0,
                "response_times": deque(maxlen=100)
            }
        
        stats = self.account_stats[account_phone]
        stats["total_sends"] += 1
        if success:
            stats["successful_sends"] += 1
        else:
            stats["failed_sends"] += 1
        
        # 更新平均响应时间
        stats["response_times"].append(response_time)
        if len(stats["response_times"]) > 0:
            stats["avg_response_time"] = sum(stats["response_times"]) / len(stats["response_times"])
        
        # 更新性能统计
        self.performance_stats["total_optimized"] += 1
        if success:
            self.performance_stats["avg_delivery_rate"] = (
                self.performance_stats["avg_delivery_rate"] * 0.9 + 0.1
            )
        else:
            self.performance_stats["avg_delivery_rate"] = (
                self.performance_stats["avg_delivery_rate"] * 0.9
            )
    
    def calculate_send_interval(
        self,
        account_phone: str,
        base_interval: Optional[float] = None
    ) -> float:
        """
        计算发送间隔
        
        Args:
            account_phone: 账户电话
            base_interval: 基础间隔（秒）
        
        Returns:
            优化后的发送间隔（秒）
        """
        if base_interval:
            return max(self.min_send_interval, min(self.max_send_interval, base_interval))
        
        # 根据账户统计动态调整
        if account_phone in self.account_stats:
            stats = self.account_stats[account_phone]
            success_rate = stats["successful_sends"] / max(stats["total_sends"], 1)
            
            # 如果成功率低，增加间隔
            if success_rate < 0.8:
                return self.max_send_interval
            elif success_rate < 0.9:
                return (self.min_send_interval + self.max_send_interval) / 2
            else:
                return self.min_send_interval
        
        # 默认间隔
        return (self.min_send_interval + self.max_send_interval) / 2
    
    def get_performance_stats(self) -> Dict[str, any]:
        """获取性能统计"""
        return {
            **self.performance_stats,
            "total_accounts": len(self.account_stats),
            "total_user_profiles": len(self.user_profiles),
            "active_batches": len([b for b in self.batch_queues.values() if len(b.messages) > 0])
        }
    
    def get_account_stats(self, account_phone: str) -> Optional[Dict[str, any]]:
        """获取账户统计"""
        return self.account_stats.get(account_phone)
    
    def get_user_profile(self, user_id: str) -> Optional[UserActivityProfile]:
        """获取用户活动画像"""
        return self.user_profiles.get(user_id)

