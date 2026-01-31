"""
TG-Matrix 消息可靠性模組
Phase A: Functionality - 消息可靠性

功能：
1. 消息狀態機
2. 可靠發送機制
3. 消息追蹤
4. 重試策略
"""

import asyncio
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Awaitable
import json
import uuid

from .logging import get_logger

logger = get_logger("message_reliability")


class MessageStatus(Enum):
    """消息狀態"""
    CREATED = "created"          # 已創建
    PENDING = "pending"          # 待發送
    SENDING = "sending"          # 發送中
    SENT = "sent"                # 已發送
    DELIVERED = "delivered"      # 已送達
    READ = "read"                # 已讀
    FAILED = "failed"            # 發送失敗
    RETRYING = "retrying"        # 重試中
    FINAL_FAILED = "final_failed"  # 最終失敗
    CANCELLED = "cancelled"      # 已取消


class MessagePriority(Enum):
    """消息優先級"""
    LOW = 0
    NORMAL = 1
    HIGH = 2
    URGENT = 3


@dataclass
class MessageStatusChange:
    """狀態變更記錄"""
    from_status: MessageStatus
    to_status: MessageStatus
    timestamp: datetime
    reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReliableMessage:
    """可靠消息"""
    id: str
    content: str
    recipient_id: str
    sender_account: Optional[str] = None
    status: MessageStatus = MessageStatus.CREATED
    priority: MessagePriority = MessagePriority.NORMAL
    
    # 時間戳
    created_at: datetime = field(default_factory=datetime.now)
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    
    # 重試信息
    retry_count: int = 0
    max_retries: int = 3
    next_retry_at: Optional[datetime] = None
    
    # 錯誤信息
    last_error: Optional[str] = None
    error_code: Optional[int] = None
    
    # 追蹤信息
    telegram_message_id: Optional[int] = None
    status_history: List[MessageStatusChange] = field(default_factory=list)
    
    # 元數據
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content[:100] + "..." if len(self.content) > 100 else self.content,
            "recipient_id": self.recipient_id,
            "sender_account": self.sender_account,
            "status": self.status.value,
            "priority": self.priority.value,
            "created_at": self.created_at.isoformat(),
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries,
            "next_retry_at": self.next_retry_at.isoformat() if self.next_retry_at else None,
            "last_error": self.last_error,
            "error_code": self.error_code,
            "telegram_message_id": self.telegram_message_id,
            "status_history_count": len(self.status_history),
            "metadata": self.metadata
        }


class RetryStrategy:
    """重試策略"""
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay_seconds: float = 5.0,
        max_delay_seconds: float = 300.0,
        exponential_base: float = 2.0,
        jitter: bool = True
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay_seconds
        self.max_delay = max_delay_seconds
        self.exponential_base = exponential_base
        self.jitter = jitter
    
    def get_next_retry_delay(self, retry_count: int) -> float:
        """計算下次重試延遲（指數退避）"""
        delay = self.base_delay * (self.exponential_base ** retry_count)
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            import random
            delay = delay * (0.5 + random.random())
        
        return delay
    
    def should_retry(self, retry_count: int, error_code: Optional[int] = None) -> bool:
        """判斷是否應該重試"""
        if retry_count >= self.max_retries:
            return False
        
        # 某些錯誤不應重試
        non_retryable_codes = [
            1007,  # ACCOUNT_PHONE_BANNED
            2004,  # MESSAGE_SEND_BLOCKED
            2008,  # MESSAGE_RECIPIENT_BLOCKED
        ]
        
        if error_code and error_code in non_retryable_codes:
            return False
        
        return True


class MessageStateMachine:
    """消息狀態機"""
    
    # 有效的狀態轉換
    VALID_TRANSITIONS = {
        MessageStatus.CREATED: [MessageStatus.PENDING, MessageStatus.CANCELLED],
        MessageStatus.PENDING: [MessageStatus.SENDING, MessageStatus.CANCELLED],
        MessageStatus.SENDING: [MessageStatus.SENT, MessageStatus.FAILED, MessageStatus.CANCELLED],
        MessageStatus.SENT: [MessageStatus.DELIVERED, MessageStatus.FAILED],
        MessageStatus.DELIVERED: [MessageStatus.READ],
        MessageStatus.FAILED: [MessageStatus.RETRYING, MessageStatus.FINAL_FAILED, MessageStatus.CANCELLED],
        MessageStatus.RETRYING: [MessageStatus.SENDING, MessageStatus.FINAL_FAILED, MessageStatus.CANCELLED],
        MessageStatus.FINAL_FAILED: [],  # 終態
        MessageStatus.READ: [],  # 終態
        MessageStatus.CANCELLED: [],  # 終態
    }
    
    @classmethod
    def can_transition(cls, from_status: MessageStatus, to_status: MessageStatus) -> bool:
        """檢查狀態轉換是否有效"""
        return to_status in cls.VALID_TRANSITIONS.get(from_status, [])
    
    @classmethod
    def transition(
        cls,
        message: ReliableMessage,
        new_status: MessageStatus,
        reason: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """執行狀態轉換"""
        if not cls.can_transition(message.status, new_status):
            logger.warning(
                f"Invalid state transition: {message.status.value} -> {new_status.value} "
                f"for message {message.id}"
            )
            return False
        
        old_status = message.status
        message.status = new_status
        
        # 記錄狀態歷史
        message.status_history.append(MessageStatusChange(
            from_status=old_status,
            to_status=new_status,
            timestamp=datetime.now(),
            reason=reason,
            metadata=metadata or {}
        ))
        
        # 更新相關時間戳
        if new_status == MessageStatus.SENT:
            message.sent_at = datetime.now()
        elif new_status == MessageStatus.DELIVERED:
            message.delivered_at = datetime.now()
        
        logger.debug(f"Message {message.id}: {old_status.value} -> {new_status.value}")
        return True


class MessageReliabilityService:
    """消息可靠性服務"""
    
    def __init__(
        self,
        retry_strategy: Optional[RetryStrategy] = None,
        persist_callback: Optional[Callable[[ReliableMessage], Awaitable[None]]] = None
    ):
        self.retry_strategy = retry_strategy or RetryStrategy()
        self.persist_callback = persist_callback
        
        # 消息存儲（生產環境應使用數據庫）
        self._messages: Dict[str, ReliableMessage] = {}
        
        # 事件處理器
        self._status_handlers: Dict[MessageStatus, List[Callable[[ReliableMessage], Awaitable[None]]]] = {}
        
        # 發送函數（需要注入）
        self._send_function: Optional[Callable[[ReliableMessage], Awaitable[bool]]] = None
    
    def set_send_function(self, func: Callable[[ReliableMessage], Awaitable[bool]]):
        """設置發送函數"""
        self._send_function = func
    
    def on_status_change(
        self,
        status: MessageStatus,
        handler: Callable[[ReliableMessage], Awaitable[None]]
    ):
        """註冊狀態變更處理器"""
        if status not in self._status_handlers:
            self._status_handlers[status] = []
        self._status_handlers[status].append(handler)
    
    async def create_message(
        self,
        content: str,
        recipient_id: str,
        sender_account: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ReliableMessage:
        """創建可靠消息"""
        message = ReliableMessage(
            id=str(uuid.uuid4()),
            content=content,
            recipient_id=recipient_id,
            sender_account=sender_account,
            priority=priority,
            scheduled_at=scheduled_at,
            max_retries=self.retry_strategy.max_retries,
            metadata=metadata or {}
        )
        
        self._messages[message.id] = message
        
        # 持久化
        await self._persist(message)
        
        logger.info(f"Created message {message.id} for recipient {recipient_id}")
        return message
    
    async def enqueue(self, message: ReliableMessage) -> bool:
        """將消息加入發送隊列"""
        if not MessageStateMachine.transition(message, MessageStatus.PENDING, "Enqueued"):
            return False
        
        await self._persist(message)
        await self._notify_handlers(MessageStatus.PENDING, message)
        return True
    
    async def send(self, message: ReliableMessage) -> bool:
        """發送消息"""
        if not self._send_function:
            logger.error("Send function not configured")
            return False
        
        # 檢查是否在計劃時間之前
        if message.scheduled_at and datetime.now() < message.scheduled_at:
            logger.debug(f"Message {message.id} scheduled for {message.scheduled_at}")
            return False
        
        # 轉換為發送中狀態
        if not MessageStateMachine.transition(message, MessageStatus.SENDING, "Starting send"):
            return False
        
        await self._persist(message)
        await self._notify_handlers(MessageStatus.SENDING, message)
        
        try:
            # 調用實際發送函數
            success = await self._send_function(message)
            
            if success:
                MessageStateMachine.transition(message, MessageStatus.SENT, "Send successful")
                await self._persist(message)
                await self._notify_handlers(MessageStatus.SENT, message)
                return True
            else:
                await self._handle_send_failure(message, "Send returned false")
                return False
                
        except Exception as e:
            await self._handle_send_failure(message, str(e))
            return False
    
    async def _handle_send_failure(
        self,
        message: ReliableMessage,
        error: str,
        error_code: Optional[int] = None
    ):
        """處理發送失敗"""
        message.last_error = error
        message.error_code = error_code
        
        MessageStateMachine.transition(
            message,
            MessageStatus.FAILED,
            error,
            {"error_code": error_code}
        )
        
        await self._persist(message)
        await self._notify_handlers(MessageStatus.FAILED, message)
        
        # 檢查是否應該重試
        if self.retry_strategy.should_retry(message.retry_count, error_code):
            await self._schedule_retry(message)
        else:
            MessageStateMachine.transition(message, MessageStatus.FINAL_FAILED, "Max retries exceeded")
            await self._persist(message)
            await self._notify_handlers(MessageStatus.FINAL_FAILED, message)
    
    async def _schedule_retry(self, message: ReliableMessage):
        """安排重試"""
        message.retry_count += 1
        delay = self.retry_strategy.get_next_retry_delay(message.retry_count)
        message.next_retry_at = datetime.now() + timedelta(seconds=delay)
        
        MessageStateMachine.transition(
            message,
            MessageStatus.RETRYING,
            f"Scheduled retry #{message.retry_count} in {delay:.1f}s"
        )
        
        await self._persist(message)
        await self._notify_handlers(MessageStatus.RETRYING, message)
        
        logger.info(
            f"Message {message.id} retry #{message.retry_count} scheduled in {delay:.1f}s"
        )
    
    async def retry_now(self, message_id: str) -> bool:
        """立即重試消息"""
        message = self._messages.get(message_id)
        if not message:
            return False
        
        if message.status not in (MessageStatus.FAILED, MessageStatus.RETRYING, MessageStatus.FINAL_FAILED):
            return False
        
        # 重置為待發送狀態
        message.status = MessageStatus.PENDING
        message.next_retry_at = None
        
        await self._persist(message)
        return await self.send(message)
    
    async def cancel(self, message_id: str) -> bool:
        """取消消息"""
        message = self._messages.get(message_id)
        if not message:
            return False
        
        if MessageStateMachine.transition(message, MessageStatus.CANCELLED, "User cancelled"):
            await self._persist(message)
            await self._notify_handlers(MessageStatus.CANCELLED, message)
            return True
        return False
    
    async def mark_delivered(self, message_id: str) -> bool:
        """標記為已送達"""
        message = self._messages.get(message_id)
        if not message:
            return False
        
        if MessageStateMachine.transition(message, MessageStatus.DELIVERED, "Delivery confirmed"):
            await self._persist(message)
            await self._notify_handlers(MessageStatus.DELIVERED, message)
            return True
        return False
    
    async def mark_read(self, message_id: str) -> bool:
        """標記為已讀"""
        message = self._messages.get(message_id)
        if not message:
            return False
        
        if MessageStateMachine.transition(message, MessageStatus.READ, "Read confirmed"):
            await self._persist(message)
            await self._notify_handlers(MessageStatus.READ, message)
            return True
        return False
    
    def get_message(self, message_id: str) -> Optional[ReliableMessage]:
        """獲取消息"""
        return self._messages.get(message_id)
    
    def get_messages_by_status(self, status: MessageStatus) -> List[ReliableMessage]:
        """按狀態獲取消息"""
        return [m for m in self._messages.values() if m.status == status]
    
    def get_pending_retries(self) -> List[ReliableMessage]:
        """獲取待重試的消息"""
        now = datetime.now()
        return [
            m for m in self._messages.values()
            if m.status == MessageStatus.RETRYING
            and m.next_retry_at
            and m.next_retry_at <= now
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        status_counts = {}
        for status in MessageStatus:
            status_counts[status.value] = len([
                m for m in self._messages.values() if m.status == status
            ])
        
        total = len(self._messages)
        sent = status_counts.get(MessageStatus.SENT.value, 0)
        delivered = status_counts.get(MessageStatus.DELIVERED.value, 0)
        failed = status_counts.get(MessageStatus.FINAL_FAILED.value, 0)
        
        return {
            "total_messages": total,
            "status_counts": status_counts,
            "success_rate": (sent + delivered) / total * 100 if total > 0 else 0,
            "failure_rate": failed / total * 100 if total > 0 else 0,
            "avg_retries": sum(m.retry_count for m in self._messages.values()) / total if total > 0 else 0
        }
    
    async def _persist(self, message: ReliableMessage):
        """持久化消息"""
        if self.persist_callback:
            try:
                await self.persist_callback(message)
            except Exception as e:
                logger.error(f"Failed to persist message {message.id}: {e}")
    
    async def _notify_handlers(self, status: MessageStatus, message: ReliableMessage):
        """通知狀態處理器"""
        handlers = self._status_handlers.get(status, [])
        for handler in handlers:
            try:
                await handler(message)
            except Exception as e:
                logger.error(f"Status handler error for {status.value}: {e}")


# 全局實例
_reliability_service: Optional[MessageReliabilityService] = None


def init_message_reliability(
    retry_strategy: Optional[RetryStrategy] = None,
    persist_callback: Optional[Callable[[ReliableMessage], Awaitable[None]]] = None
) -> MessageReliabilityService:
    """初始化消息可靠性服務"""
    global _reliability_service
    _reliability_service = MessageReliabilityService(retry_strategy, persist_callback)
    return _reliability_service


def get_message_reliability() -> Optional[MessageReliabilityService]:
    """獲取消息可靠性服務"""
    return _reliability_service


__all__ = [
    'MessageStatus',
    'MessagePriority',
    'MessageStatusChange',
    'ReliableMessage',
    'RetryStrategy',
    'MessageStateMachine',
    'MessageReliabilityService',
    'init_message_reliability',
    'get_message_reliability'
]
