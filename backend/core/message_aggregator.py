"""
TG-Matrix Message Aggregator
消息聚合服务 - 实现跨账号消息统一管理

设计原则：
1. 消息聚合：多账号消息统一收集
2. 消息确认：确保消息不丢失
3. 离线支持：断线期间消息缓存
4. 实时推送：WebSocket实时通知
"""

import asyncio
import time
import sys
import json
import uuid
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)


class MessageStatus(str, Enum):
    """消息状态"""
    PENDING = "pending"       # 待处理
    DELIVERED = "delivered"   # 已送达
    CONFIRMED = "confirmed"   # 已确认
    FAILED = "failed"         # 失败
    EXPIRED = "expired"       # 已过期


class MessageType(str, Enum):
    """消息类型"""
    TEXT = "text"
    MEDIA = "media"
    SYSTEM = "system"
    NOTIFICATION = "notification"


@dataclass
class AggregatedMessage:
    """聚合消息"""
    id: str = ""
    account_phone: str = ""
    user_id: int = 0
    username: str = ""
    first_name: str = ""
    chat_id: int = 0
    chat_type: str = ""       # private, group, supergroup, channel
    message_type: MessageType = MessageType.TEXT
    content: str = ""
    media_url: str = ""
    reply_to_id: int = 0
    telegram_message_id: int = 0
    
    # 状态
    status: MessageStatus = MessageStatus.PENDING
    direction: str = "incoming"  # incoming, outgoing
    
    # 时间戳
    created_at: float = 0
    delivered_at: float = 0
    confirmed_at: float = 0
    
    # 确认
    ack_id: str = ""
    retry_count: int = 0
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
        if not self.created_at:
            self.created_at = time.time()
        if not self.ack_id:
            self.ack_id = f"ack_{self.id[:8]}"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'account_phone': self.account_phone,
            'user_id': self.user_id,
            'username': self.username,
            'first_name': self.first_name,
            'chat_id': self.chat_id,
            'chat_type': self.chat_type,
            'message_type': self.message_type.value,
            'content': self.content,
            'media_url': self.media_url,
            'reply_to_id': self.reply_to_id,
            'telegram_message_id': self.telegram_message_id,
            'status': self.status.value,
            'direction': self.direction,
            'created_at': self.created_at,
            'ack_id': self.ack_id,
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


@dataclass
class PendingAck:
    """待确认项"""
    ack_id: str
    message_id: str
    user_id: str
    created_at: float = field(default_factory=time.time)
    retry_count: int = 0
    max_retries: int = 3
    timeout: float = 30.0  # 秒
    
    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.timeout
    
    def can_retry(self) -> bool:
        return self.retry_count < self.max_retries


class MessageAggregator:
    """
    消息聚合器
    
    职责：
    1. 收集多账号消息
    2. 统一推送到前端
    3. 处理消息确认
    4. 管理离线消息队列
    """
    
    def __init__(
        self,
        event_callback: Optional[Callable[[str, Any], None]] = None,
        max_offline_messages: int = 1000,
        ack_timeout: float = 30.0
    ):
        self.event_callback = event_callback
        self.max_offline_messages = max_offline_messages
        self.ack_timeout = ack_timeout
        
        # 消息存储
        self._messages: Dict[str, AggregatedMessage] = {}  # id -> message
        self._message_queue: deque = deque(maxlen=10000)   # 消息队列
        
        # 用户订阅
        self._user_subscriptions: Dict[str, Set[str]] = defaultdict(set)  # user_id -> {account_phones}
        
        # 离线消息队列
        self._offline_queues: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=self.max_offline_messages)
        )  # user_id -> messages
        
        # 待确认消息
        self._pending_acks: Dict[str, PendingAck] = {}  # ack_id -> PendingAck
        
        # 连接状态
        self._connected_users: Set[str] = set()
        
        # 统计
        self._stats = {
            'total_messages': 0,
            'delivered': 0,
            'confirmed': 0,
            'failed': 0,
            'pending_acks': 0,
        }
        
        # 后台任务
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False
        
        print("[MessageAggregator] 初始化完成", file=sys.stderr)
    
    # ==================== 消息发布 ====================
    
    async def publish_message(self, message: AggregatedMessage) -> bool:
        """
        发布消息
        
        Args:
            message: 聚合消息
        
        Returns:
            是否成功发布
        """
        # 存储消息
        self._messages[message.id] = message
        self._message_queue.append(message.id)
        self._stats['total_messages'] += 1
        
        # 获取订阅该账号的用户
        subscribers = self._get_subscribers(message.account_phone)
        
        if not subscribers:
            # 没有订阅者，存入通用队列
            return True
        
        # 推送给每个订阅者
        for user_id in subscribers:
            await self._deliver_to_user(user_id, message)
        
        return True
    
    async def publish_incoming_message(
        self,
        account_phone: str,
        user_id: int,
        username: str,
        first_name: str,
        chat_id: int,
        content: str,
        telegram_message_id: int,
        chat_type: str = "private",
        **kwargs
    ) -> AggregatedMessage:
        """
        发布收到的消息（便捷方法）
        """
        message = AggregatedMessage(
            account_phone=account_phone,
            user_id=user_id,
            username=username or "",
            first_name=first_name or "",
            chat_id=chat_id,
            chat_type=chat_type,
            content=content,
            telegram_message_id=telegram_message_id,
            direction="incoming",
            **{k: v for k, v in kwargs.items() if hasattr(AggregatedMessage, k)}
        )
        
        await self.publish_message(message)
        return message
    
    async def _deliver_to_user(self, user_id: str, message: AggregatedMessage):
        """投递消息给用户"""
        if user_id in self._connected_users:
            # 用户在线，直接推送
            success = await self._push_to_user(user_id, message)
            
            if success:
                message.status = MessageStatus.DELIVERED
                message.delivered_at = time.time()
                self._stats['delivered'] += 1
                
                # 创建待确认项
                pending = PendingAck(
                    ack_id=message.ack_id,
                    message_id=message.id,
                    user_id=user_id,
                    timeout=self.ack_timeout
                )
                self._pending_acks[message.ack_id] = pending
                self._stats['pending_acks'] += 1
            else:
                # 推送失败，加入离线队列
                self._offline_queues[user_id].append(message)
        else:
            # 用户离线，加入离线队列
            self._offline_queues[user_id].append(message)
    
    async def _push_to_user(self, user_id: str, message: AggregatedMessage) -> bool:
        """推送消息到用户（通过WebSocket）"""
        if self.event_callback:
            try:
                self.event_callback('message.new', {
                    'user_id': user_id,
                    'message': message.to_dict(),
                    'ack_id': message.ack_id
                })
                return True
            except Exception as e:
                print(f"[MessageAggregator] 推送失败: {e}", file=sys.stderr)
                return False
        return False
    
    # ==================== 消息确认 ====================
    
    async def acknowledge(self, ack_id: str) -> bool:
        """
        确认消息已收到
        
        Args:
            ack_id: 确认ID
        
        Returns:
            是否成功
        """
        pending = self._pending_acks.get(ack_id)
        if not pending:
            return False
        
        message = self._messages.get(pending.message_id)
        if message:
            message.status = MessageStatus.CONFIRMED
            message.confirmed_at = time.time()
            self._stats['confirmed'] += 1
        
        del self._pending_acks[ack_id]
        self._stats['pending_acks'] -= 1
        
        return True
    
    async def batch_acknowledge(self, ack_ids: List[str]) -> int:
        """批量确认消息"""
        confirmed = 0
        for ack_id in ack_ids:
            if await self.acknowledge(ack_id):
                confirmed += 1
        return confirmed
    
    # ==================== 用户连接管理 ====================
    
    async def user_connected(self, user_id: str, account_phones: Optional[List[str]] = None):
        """
        用户连接
        
        Args:
            user_id: 用户ID
            account_phones: 订阅的账号列表
        """
        self._connected_users.add(user_id)
        
        if account_phones:
            self._user_subscriptions[user_id] = set(account_phones)
        
        # 发送离线消息
        await self._flush_offline_queue(user_id)
        
        print(f"[MessageAggregator] 用户连接: {user_id}, 订阅 {len(account_phones or [])} 个账号", file=sys.stderr)
    
    async def user_disconnected(self, user_id: str):
        """用户断开连接"""
        self._connected_users.discard(user_id)
        print(f"[MessageAggregator] 用户断开: {user_id}", file=sys.stderr)
    
    async def update_subscription(self, user_id: str, account_phones: List[str]):
        """更新订阅"""
        self._user_subscriptions[user_id] = set(account_phones)
    
    async def _flush_offline_queue(self, user_id: str):
        """发送离线消息"""
        queue = self._offline_queues.get(user_id)
        if not queue:
            return
        
        messages = list(queue)
        queue.clear()
        
        for message in messages:
            await self._deliver_to_user(user_id, message)
        
        if messages:
            print(f"[MessageAggregator] 发送离线消息: {user_id}, {len(messages)} 条", file=sys.stderr)
    
    def _get_subscribers(self, account_phone: str) -> Set[str]:
        """获取订阅指定账号的用户"""
        subscribers = set()
        for user_id, phones in self._user_subscriptions.items():
            if account_phone in phones or not phones:  # 空集表示订阅全部
                subscribers.add(user_id)
        return subscribers
    
    # ==================== 消息查询 ====================
    
    def get_messages(
        self,
        account_phone: Optional[str] = None,
        user_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """查询消息"""
        messages = list(self._messages.values())
        
        # 过滤
        if account_phone:
            messages = [m for m in messages if m.account_phone == account_phone]
        if user_id:
            messages = [m for m in messages if m.user_id == user_id]
        
        # 排序（最新在前）
        messages.sort(key=lambda m: m.created_at, reverse=True)
        
        # 分页
        messages = messages[offset:offset + limit]
        
        return [m.to_dict() for m in messages]
    
    def get_unread_count(self, user_id: str) -> Dict[str, int]:
        """获取未读消息数"""
        offline = self._offline_queues.get(user_id, deque())
        pending = sum(1 for p in self._pending_acks.values() if p.user_id == user_id)
        
        return {
            'offline': len(offline),
            'pending_ack': pending,
            'total': len(offline) + pending
        }
    
    # ==================== 统计 ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return {
            **self._stats,
            'connected_users': len(self._connected_users),
            'total_subscriptions': sum(len(s) for s in self._user_subscriptions.values()),
            'offline_queue_size': sum(len(q) for q in self._offline_queues.values()),
        }
    
    # ==================== 后台维护 ====================
    
    async def start(self):
        """启动后台任务"""
        if self._running:
            return
        
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        print("[MessageAggregator] 后台任务已启动", file=sys.stderr)
    
    async def stop(self):
        """停止后台任务"""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        print("[MessageAggregator] 后台任务已停止", file=sys.stderr)
    
    async def _cleanup_loop(self):
        """清理循环"""
        while self._running:
            try:
                await self._cleanup_expired()
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[MessageAggregator] 清理任务错误: {e}", file=sys.stderr)
                await asyncio.sleep(30)
    
    async def _cleanup_expired(self):
        """清理过期项"""
        now = time.time()
        
        # 清理过期的待确认项
        expired_acks = [
            ack_id for ack_id, pending in self._pending_acks.items()
            if pending.is_expired()
        ]
        
        for ack_id in expired_acks:
            pending = self._pending_acks[ack_id]
            
            if pending.can_retry():
                # 重试
                pending.retry_count += 1
                pending.created_at = now
                
                message = self._messages.get(pending.message_id)
                if message:
                    await self._deliver_to_user(pending.user_id, message)
            else:
                # 放弃
                message = self._messages.get(pending.message_id)
                if message:
                    message.status = MessageStatus.FAILED
                    self._stats['failed'] += 1
                
                del self._pending_acks[ack_id]
                self._stats['pending_acks'] -= 1
        
        # 清理旧消息（保留最近1小时）
        cutoff = now - 3600
        old_ids = [
            mid for mid, msg in self._messages.items()
            if msg.created_at < cutoff and msg.status in (MessageStatus.CONFIRMED, MessageStatus.FAILED)
        ]
        
        for mid in old_ids[:100]:  # 每次最多清理100条
            del self._messages[mid]


# 全局实例
_aggregator_instance: Optional[MessageAggregator] = None


def get_message_aggregator() -> MessageAggregator:
    """获取全局消息聚合器"""
    global _aggregator_instance
    if _aggregator_instance is None:
        _aggregator_instance = MessageAggregator()
    return _aggregator_instance


async def init_message_aggregator(
    event_callback: Optional[Callable] = None
) -> MessageAggregator:
    """初始化消息聚合器"""
    global _aggregator_instance
    _aggregator_instance = MessageAggregator(event_callback=event_callback)
    await _aggregator_instance.start()
    return _aggregator_instance

