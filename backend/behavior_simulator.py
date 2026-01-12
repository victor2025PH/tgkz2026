"""
TG-Matrix Behavior Simulator
行为模式模拟器 - 模拟真实用户行为，降低自动化检测风险
"""
import asyncio
import random
import time
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
import sys


@dataclass
class BehaviorConfig:
    """行为模拟配置"""
    # 打字延迟配置
    typing_speed_wpm: int = 40  # 打字速度（每分钟字数）
    typing_variance: float = 0.2  # 打字速度变化（±20%）
    min_typing_delay: float = 0.1  # 最小打字延迟（秒）
    max_typing_delay: float = 0.5  # 最大打字延迟（秒）
    
    # 浏览行为配置
    browse_interval_minutes: int = 30  # 浏览间隔（分钟）
    browse_duration_seconds: int = 60  # 浏览持续时间（秒）
    browse_groups_count: int = 3  # 每次浏览的群组数量
    
    # 活动时间配置
    activity_start_hour: int = 8  # 活动开始时间（小时）
    activity_end_hour: int = 23  # 活动结束时间（小时）
    activity_peak_hours: List[int] = None  # 高峰时段（小时列表）
    random_activity_variance: float = 0.3  # 随机活动变化（±30%）
    
    # 互动行为配置
    like_probability: float = 0.1  # 点赞概率（10%）
    reply_probability: float = 0.05  # 回复概率（5%）
    forward_probability: float = 0.02  # 转发概率（2%）
    
    # 消息发送延迟配置
    min_send_delay: float = 2.0  # 最小发送延迟（秒）
    max_send_delay: float = 10.0  # 最大发送延迟（秒）
    send_delay_variance: float = 0.3  # 发送延迟变化（±30%）


class BehaviorSimulator:
    """行为模式模拟器"""
    
    def __init__(self, config: Optional[BehaviorConfig] = None):
        """
        初始化行为模拟器
        
        Args:
            config: 行为模拟配置
        """
        self.config = config or BehaviorConfig()
        
        # 账户活动时间记录：account_id -> last_activity_time
        self.account_activity_times: Dict[int, datetime] = {}
        
        # 账户浏览历史：account_id -> List[(group_id, timestamp)]
        self.account_browse_history: Dict[int, List] = {}
        
        # 账户最后浏览时间：account_id -> timestamp
        self.account_last_browse: Dict[int, datetime] = {}
    
    def calculate_typing_delay(self, message_length: int) -> float:
        """
        根据消息长度计算打字延迟
        
        人类打字速度：平均 40 WPM（每分钟 40 个单词）
        1 个单词 ≈ 5 个字符
        
        Args:
            message_length: 消息长度（字符数）
        
        Returns:
            打字延迟（秒）
        """
        # 计算单词数（简化：每 5 个字符 = 1 个单词）
        word_count = message_length / 5
        
        # 计算基础延迟（秒）
        base_delay = (word_count / self.config.typing_speed_wpm) * 60
        
        # 添加随机变化（±20%）
        variance = random.uniform(
            1 - self.config.typing_variance,
            1 + self.config.typing_variance
        )
        delay = base_delay * variance
        
        # 限制在最小和最大延迟之间
        delay = max(self.config.min_typing_delay, delay)
        delay = min(self.config.max_typing_delay, delay)
        
        return delay
    
    async def simulate_typing(self, message_length: int) -> float:
        """
        模拟打字过程（实际等待）
        
        Args:
            message_length: 消息长度（字符数）
        
        Returns:
            实际延迟时间（秒）
        """
        delay = self.calculate_typing_delay(message_length)
        await asyncio.sleep(delay)
        return delay
    
    def should_activate_now(self, account_id: int) -> bool:
        """
        判断账户是否应该在当前时间活动
        
        考虑因素：
        - 活动时间段（8:00 - 23:00）
        - 高峰时段
        - 随机变化
        
        Args:
            account_id: 账户 ID
        
        Returns:
            是否应该活动
        """
        current_hour = datetime.now().hour
        
        # 检查是否在活动时间段内
        if current_hour < self.config.activity_start_hour or current_hour >= self.config.activity_end_hour:
            return False
        
        # 检查是否在高峰时段
        if self.config.activity_peak_hours and current_hour in self.config.activity_peak_hours:
            # 高峰时段：80% 概率活动
            return random.random() < 0.8
        
        # 非高峰时段：50% 概率活动（添加随机性）
        return random.random() < 0.5
    
    def get_random_activity_delay(self) -> float:
        """
        获取随机活动延迟
        
        用于避开固定模式，增加随机性
        
        Returns:
            延迟时间（秒）
        """
        # 基础延迟：30-60 分钟
        base_delay = random.uniform(30, 60) * 60  # 转换为秒
        
        # 添加随机变化（±30%）
        variance = random.uniform(
            1 - self.config.random_activity_variance,
            1 + self.config.random_activity_variance
        )
        
        return base_delay * variance
    
    async def simulate_browsing(
        self,
        client,
        account_id: int,
        group_ids: List[int],
        on_browse: Optional[Callable] = None
    ) -> Dict[str, any]:
        """
        模拟浏览群组行为
        
        行为包括：
        - 随机选择群组浏览
        - 查看历史消息
        - 偶尔点赞/回复
        
        Args:
            client: Pyrogram Client 实例
            account_id: 账户 ID
            group_ids: 群组 ID 列表
            on_browse: 浏览回调函数
        
        Returns:
            浏览结果
        """
        if not group_ids:
            return {"success": False, "error": "No groups to browse"}
        
        try:
            # 随机选择要浏览的群组（最多 3 个）
            browse_count = min(self.config.browse_groups_count, len(group_ids))
            selected_groups = random.sample(group_ids, browse_count)
            
            browsed_groups = []
            
            for group_id in selected_groups:
                try:
                    # 获取群组信息
                    chat = await client.get_chat(group_id)
                    
                    # 查看最近的消息（模拟浏览）
                    messages = []
                    try:
                        # 获取最近 10 条消息
                        async for message in client.get_chat_history(group_id, limit=10):
                            messages.append(message.id)
                    except Exception:
                        pass  # 如果无法获取消息，继续
                    
                    # 随机决定是否点赞（10% 概率）
                    if random.random() < self.config.like_probability and messages:
                        try:
                            # 尝试点赞（如果支持）
                            # 注意：Telegram API 可能不支持直接点赞，这里只是模拟
                            pass
                        except Exception:
                            pass
                    
                    browsed_groups.append({
                        "group_id": group_id,
                        "group_name": chat.title if hasattr(chat, 'title') else str(group_id),
                        "messages_viewed": len(messages),
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    # 添加随机延迟（模拟浏览时间）
                    await asyncio.sleep(random.uniform(5, 15))
                    
                except Exception as e:
                    # 如果浏览某个群组失败，继续下一个
                    import sys
                    print(f"[BehaviorSimulator] Failed to browse group {group_id}: {e}", file=sys.stderr)
                    continue
            
            # 记录浏览历史
            if account_id not in self.account_browse_history:
                self.account_browse_history[account_id] = []
            
            self.account_browse_history[account_id].extend(browsed_groups)
            self.account_last_browse[account_id] = datetime.now()
            
            # 只保留最近 50 条浏览记录
            if len(self.account_browse_history[account_id]) > 50:
                self.account_browse_history[account_id] = self.account_browse_history[account_id][-50:]
            
            # 调用回调函数
            if on_browse:
                try:
                    on_browse(account_id, browsed_groups)
                except Exception:
                    pass
            
            return {
                "success": True,
                "browsed_groups": browsed_groups,
                "count": len(browsed_groups)
            }
        
        except Exception as e:
            import sys
            print(f"[BehaviorSimulator] Error simulating browsing: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
    
    def should_browse_now(self, account_id: int) -> bool:
        """
        判断账户是否应该现在浏览
        
        Args:
            account_id: 账户 ID
        
        Returns:
            是否应该浏览
        """
        # 检查上次浏览时间
        last_browse = self.account_last_browse.get(account_id)
        if not last_browse:
            # 从未浏览过，可以浏览
            return True
        
        # 检查是否达到浏览间隔
        time_since_last_browse = (datetime.now() - last_browse).total_seconds() / 60  # 转换为分钟
        
        if time_since_last_browse >= self.config.browse_interval_minutes:
            return True
        
        return False
    
    def get_send_delay(self) -> float:
        """
        获取消息发送延迟
        
        用于在发送消息前添加随机延迟，避免固定模式
        
        Returns:
            延迟时间（秒）
        """
        # 基础延迟：2-10 秒
        base_delay = random.uniform(self.config.min_send_delay, self.config.max_send_delay)
        
        # 添加随机变化（±30%）
        variance = random.uniform(
            1 - self.config.send_delay_variance,
            1 + self.config.send_delay_variance
        )
        
        return base_delay * variance
    
    async def add_send_delay(self):
        """
        添加消息发送延迟（实际等待）
        """
        delay = self.get_send_delay()
        await asyncio.sleep(delay)
        return delay
    
    def get_browse_history(self, account_id: int) -> List[Dict]:
        """获取账户浏览历史"""
        return self.account_browse_history.get(account_id, [])
    
    def get_activity_statistics(self, account_id: int) -> Dict[str, any]:
        """获取账户活动统计"""
        browse_history = self.get_browse_history(account_id)
        last_browse = self.account_last_browse.get(account_id)
        
        return {
            "account_id": account_id,
            "total_browses": len(browse_history),
            "last_browse": last_browse.isoformat() if last_browse else None,
            "browse_groups_count": len(set(b.get('group_id') for b in browse_history)),
            "recent_browses": browse_history[-10:] if browse_history else []
        }
    
    async def simulate_random_activity(
        self,
        client,
        account_id: int,
        group_ids: List[int],
        on_activity: Optional[Callable] = None
    ) -> Dict[str, any]:
        """
        模拟随机活动
        
        包括：
        - 浏览群组
        - 查看消息
        - 随机互动
        
        Args:
            client: Pyrogram Client 实例
            account_id: 账户 ID
            group_ids: 群组 ID 列表
            on_activity: 活动回调函数
        
        Returns:
            活动结果
        """
        activities = []
        
        # 1. 浏览群组（如果应该浏览）
        if self.should_browse_now(account_id):
            browse_result = await self.simulate_browsing(client, account_id, group_ids, on_activity)
            if browse_result.get('success'):
                activities.append({
                    "type": "browse",
                    "result": browse_result
                })
        
        # 2. 随机延迟（模拟思考时间）
        await asyncio.sleep(random.uniform(10, 30))
        
        return {
            "success": True,
            "activities": activities,
            "timestamp": datetime.now().isoformat()
        }

