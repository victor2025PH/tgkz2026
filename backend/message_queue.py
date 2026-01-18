"""
TG-Matrix Message Queue System
Handles message sending queue, rate limiting, and retry logic
"""
import sys
import asyncio
import time
from typing import Dict, Any, Optional, List, Callable, TYPE_CHECKING
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
from pyrogram.errors import FloodWait, Flood, RPCError
from retry_config import get_retry_handler, RetryStrategy

if TYPE_CHECKING:
    from database import Database


class MessagePriority(Enum):
    """Message priority levels"""
    HIGH = 1
    NORMAL = 2
    LOW = 3


class RotationStrategy(Enum):
    """帳號輪換策略"""
    ROUND_ROBIN = "round_robin"      # 順序輪換
    LOAD_BALANCE = "load_balance"    # 負載均衡（選擇發送最少的帳號）
    RANDOM = "random"                # 隨機選擇
    HEALTH_FIRST = "health_first"    # 健康度優先


class AccountRotator:
    """帳號輪換器 - 自動選擇最適合的發送帳號"""
    
    def __init__(self, database):
        self.database = database
        self.strategy = RotationStrategy.LOAD_BALANCE
        self._current_index = 0
        self._account_stats: Dict[str, Dict[str, Any]] = {}
    
    async def get_sender_accounts(self) -> List[Dict[str, Any]]:
        """獲取所有可用的發送帳號"""
        accounts = await self.database.get_all_accounts()
        return [
            a for a in accounts 
            if a.get('role') == 'Sender' and a.get('status') == 'Online'
        ]
    
    async def select_account(self, exclude_phones: List[str] = None) -> Optional[Dict[str, Any]]:
        """根據策略選擇一個發送帳號
        
        Args:
            exclude_phones: 要排除的帳號電話號碼列表
            
        Returns:
            選中的帳號，如果沒有可用帳號則返回 None
        """
        import random
        
        accounts = await self.get_sender_accounts()
        if not accounts:
            return None
        
        # 排除指定帳號
        if exclude_phones:
            accounts = [a for a in accounts if a.get('phone') not in exclude_phones]
            if not accounts:
                return None
        
        # 過濾掉已達到每日限制的帳號
        available_accounts = []
        for acc in accounts:
            phone = acc.get('phone')
            daily_limit = acc.get('daily_send_limit', 50)
            daily_count = acc.get('daily_send_count', 0)
            if daily_count < daily_limit:
                available_accounts.append(acc)
        
        if not available_accounts:
            print(f"[AccountRotator] 所有帳號都已達到每日發送限制", file=sys.stderr)
            return None
        
        # 根據策略選擇帳號
        if self.strategy == RotationStrategy.ROUND_ROBIN:
            # 順序輪換
            self._current_index = self._current_index % len(available_accounts)
            selected = available_accounts[self._current_index]
            self._current_index += 1
            return selected
        
        elif self.strategy == RotationStrategy.LOAD_BALANCE:
            # 負載均衡 - 選擇今日發送最少的帳號
            available_accounts.sort(key=lambda a: a.get('daily_send_count', 0))
            return available_accounts[0]
        
        elif self.strategy == RotationStrategy.RANDOM:
            # 隨機選擇
            return random.choice(available_accounts)
        
        elif self.strategy == RotationStrategy.HEALTH_FIRST:
            # 健康度優先 - 選擇健康度最高的帳號
            available_accounts.sort(key=lambda a: a.get('health_score', 0), reverse=True)
            return available_accounts[0]
        
        # 默認返回第一個
        return available_accounts[0]
    
    def set_strategy(self, strategy: RotationStrategy):
        """設置輪換策略"""
        self.strategy = strategy
        print(f"[AccountRotator] 輪換策略設置為: {strategy.value}", file=sys.stderr)
    
    async def update_account_stats(self, phone: str, success: bool):
        """更新帳號統計信息"""
        if phone not in self._account_stats:
            self._account_stats[phone] = {
                'sent_today': 0,
                'success_today': 0,
                'failed_today': 0
            }
        
        self._account_stats[phone]['sent_today'] += 1
        if success:
            self._account_stats[phone]['success_today'] += 1
        else:
            self._account_stats[phone]['failed_today'] += 1


class MessageStatus(Enum):
    """Message status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"


@dataclass
class QueuedMessage:
    """Represents a message in the queue"""
    id: str
    phone: str
    user_id: str
    text: str
    attachment: Optional[str] = None
    source_group: Optional[str] = None  # 源群組（用於獲取用戶信息）
    target_username: Optional[str] = None  # 目標用戶名（作為備選）
    priority: MessagePriority = MessagePriority.NORMAL
    status: MessageStatus = MessageStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    attempts: int = 0
    max_attempts: int = 3
    last_error: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    callback: Optional[Callable] = None


class RateLimiter:
    """Rate limiter for message sending per account"""
    
    def __init__(self, phone: str, max_messages_per_minute: int = 20, max_messages_per_hour: int = 200):
        self.phone = phone
        self.max_per_minute = max_messages_per_minute
        self.max_per_hour = max_messages_per_hour
        self.minute_window: List[float] = []
        self.hour_window: List[float] = []
        self.flood_wait_until: Optional[float] = None
        self.lock = asyncio.Lock()
    
    async def can_send(self) -> tuple[bool, Optional[float]]:
        """
        Check if we can send a message now
        
        Returns:
            (can_send, wait_seconds)
        """
        async with self.lock:
            now = time.time()
            
            # Check flood wait
            if self.flood_wait_until and now < self.flood_wait_until:
                wait_seconds = self.flood_wait_until - now
                return False, wait_seconds
            
            # Clean old entries
            self.minute_window = [t for t in self.minute_window if now - t < 60]
            self.hour_window = [t for t in self.hour_window if now - t < 3600]
            
            # Check limits
            if len(self.minute_window) >= self.max_per_minute:
                # Wait until oldest message in minute window expires
                oldest = min(self.minute_window)
                wait_seconds = 60 - (now - oldest)
                return False, max(0, wait_seconds)
            
            if len(self.hour_window) >= self.max_per_hour:
                # Wait until oldest message in hour window expires
                oldest = min(self.hour_window)
                wait_seconds = 3600 - (now - oldest)
                return False, max(0, wait_seconds)
            
            return True, None
    
    async def record_send(self):
        """Record that a message was sent"""
        async with self.lock:
            now = time.time()
            self.minute_window.append(now)
            self.hour_window.append(now)
    
    async def set_flood_wait(self, seconds: float):
        """Set flood wait period"""
        async with self.lock:
            self.flood_wait_until = time.time() + seconds
    
    async def clear_flood_wait(self):
        """Clear flood wait"""
        async with self.lock:
            self.flood_wait_until = None


class RetryHandler:
    """Handles retry logic with exponential backoff"""
    
    @staticmethod
    def calculate_delay(attempt: int, base_delay: float = 1.0, max_delay: float = 300.0, strategy: str = "exponential") -> float:
        """
        Calculate retry delay using specified strategy
        
        Args:
            attempt: Current attempt number (0-indexed)
            base_delay: Base delay in seconds
            max_delay: Maximum delay in seconds
            strategy: Retry strategy ("exponential", "linear", "fixed")
        
        Returns:
            Delay in seconds
        """
        if strategy == "exponential":
            delay = base_delay * (2 ** attempt)
        elif strategy == "linear":
            delay = base_delay * (attempt + 1)
        else:  # fixed
            delay = 300.0  # 5分鐘固定延遲
        
        return min(delay, max_delay)
    
    @staticmethod
    def should_retry(error: Exception, attempt: int, max_attempts: int, strategy: str = "exponential") -> tuple[bool, Optional[float]]:
        """
        Determine if we should retry and how long to wait
        
        Args:
            error: The exception that occurred
            attempt: Current attempt number (0-indexed)
            max_attempts: Maximum number of retry attempts
            strategy: Retry strategy ("exponential", "linear", "fixed")
        
        Returns:
            (should_retry, wait_seconds)
        """
        if attempt >= max_attempts:
            return False, None
        
        # Retry on FloodWait (使用 Telegram 指定的等待時間)
        if isinstance(error, FloodWait):
            return True, float(error.value)
        
        # Retry on Flood (general rate limit)
        if isinstance(error, Flood):
            if strategy == "exponential":
                delay = RetryHandler.calculate_delay(attempt, base_delay=60.0, strategy=strategy)
            elif strategy == "linear":
                delay = RetryHandler.calculate_delay(attempt, base_delay=60.0, strategy=strategy)
            else:
                delay = 300.0
            return True, delay
        
        # Retry on temporary RPC errors
        if isinstance(error, RPCError):
            error_code = getattr(error, 'code', None)
            # Temporary errors that should be retried
            retryable_codes = [500, 502, 503, 504, 429]
            if error_code in retryable_codes:
                delay = RetryHandler.calculate_delay(attempt, strategy=strategy)
                return True, delay
        
        # Retry on connection errors
        try:
            from pyrogram.errors import RpcConnectFailed
            connection_errors = [ConnectionError, RpcConnectFailed]
        except:
            connection_errors = [ConnectionError]
        
        if any(isinstance(error, err) for err in connection_errors):
            # 連接錯誤使用更長的退避時間
            if strategy == "exponential":
                delay = RetryHandler.calculate_delay(attempt, base_delay=5.0, max_delay=600.0, strategy=strategy)
            elif strategy == "linear":
                delay = RetryHandler.calculate_delay(attempt, base_delay=30.0, strategy=strategy)
            else:
                delay = 300.0
            return True, delay
        
        # Don't retry on permanent errors
        return False, None


class MessageQueue:
    """Message queue manager for handling message sending"""
    
    def __init__(self, send_callback: Callable, database: Optional['Database'] = None, optimizer: Optional[Any] = None):
        """
        Initialize message queue
        
        Args:
            send_callback: Async function to actually send the message
                          Signature: async def send(phone, user_id, text, attachment) -> Dict[str, Any]
            database: Optional database instance for persistence
            optimizer: Optional queue optimizer instance
        """
        self.send_callback = send_callback
        self.database = database
        self.optimizer = optimizer  # Queue optimizer (队列优化)
        self.queues: Dict[str, List[QueuedMessage]] = {}  # phone -> queue
        self.rate_limiters: Dict[str, RateLimiter] = {}  # phone -> rate limiter
        self.processing: Dict[str, bool] = {}  # phone -> is processing
        self.paused: Dict[str, bool] = {}  # phone -> is paused
        self.lock = asyncio.Lock()
        self.stats: Dict[str, Dict[str, Any]] = {}  # phone -> stats
        self.running = True
        self.workers: Dict[str, asyncio.Task] = {}  # phone -> worker task
        
        # 帳號輪換器
        self.account_rotator = AccountRotator(database) if database else None
    
    async def add_message_auto_rotate(
        self,
        user_id: str,
        text: str,
        attachment: Optional[str] = None,
        source_group: Optional[str] = None,
        target_username: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        max_attempts: int = 3,
        callback: Optional[Callable] = None
    ) -> Optional[str]:
        """
        自動選擇帳號並添加消息到隊列
        
        Returns:
            Message ID, or None if no account available
        """
        if not self.account_rotator:
            print("[MessageQueue] 帳號輪換器未初始化", file=sys.stderr)
            return None
        
        # 自動選擇發送帳號
        account = await self.account_rotator.select_account()
        if not account:
            print("[MessageQueue] 沒有可用的發送帳號", file=sys.stderr)
            return None
        
        phone = account.get('phone')
        print(f"[MessageQueue] 自動選擇帳號: {phone}", file=sys.stderr)
        
        # 使用選中的帳號添加消息
        return await self.add_message(
            phone=phone,
            user_id=user_id,
            text=text,
            attachment=attachment,
            source_group=source_group,
            target_username=target_username,
            priority=priority,
            scheduled_at=scheduled_at,
            max_attempts=max_attempts,
            callback=callback
        )
    
    async def add_message(
        self,
        phone: str,
        user_id: str,
        text: str,
        attachment: Optional[str] = None,
        source_group: Optional[str] = None,
        target_username: Optional[str] = None,
        priority: MessagePriority = MessagePriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        max_attempts: int = 3,
        callback: Optional[Callable] = None
    ) -> str:
        """
        Add a message to the queue
        
        Args:
            source_group: Source group ID/URL (used to resolve user)
            target_username: Target username (fallback if user_id fails)
        
        Returns:
            Message ID
        """
        message_id = f"{phone}_{user_id}_{int(time.time() * 1000)}"
        
        async with self.lock:
            if phone not in self.queues:
                self.queues[phone] = []
                self.rate_limiters[phone] = RateLimiter(phone)
                self.processing[phone] = False
                self.stats[phone] = {
                    "total": 0,
                    "completed": 0,
                    "failed": 0,
                    "retries": 0,
                    "avg_time": 0.0
                }
            
            # 优化发送时间（队列优化）
            optimized_scheduled_at = scheduled_at
            if self.optimizer:
                try:
                    optimized_scheduled_at = self.optimizer.optimize_send_time(user_id, scheduled_at)
                except Exception as e:
                    print(f"Error optimizing send time: {e}", file=sys.stderr)
            
            message = QueuedMessage(
                id=message_id,
                phone=phone,
                user_id=user_id,
                text=text,
                attachment=attachment,
                source_group=source_group,
                target_username=target_username,
                priority=priority,
                scheduled_at=optimized_scheduled_at,
                max_attempts=max_attempts,
                callback=callback
            )
            
            # Insert based on priority
            queue = self.queues[phone]
            if priority == MessagePriority.HIGH:
                queue.insert(0, message)
            elif priority == MessagePriority.LOW:
                queue.append(message)
            else:
                # Insert after high priority messages
                insert_pos = 0
                for i, m in enumerate(queue):
                    if m.priority != MessagePriority.HIGH:
                        insert_pos = i
                        break
                else:
                    insert_pos = len(queue)
                queue.insert(insert_pos, message)
            
            # Save to database if available
            if self.database:
                try:
                    await self.database.save_queue_message(
                        message_id=message_id,
                        phone=phone,
                        user_id=user_id,
                        text=text,
                        attachment=attachment,
                        priority=priority.name,
                        status=message.status.value,
                        scheduled_at=scheduled_at,
                        attempts=0,
                        max_attempts=max_attempts
                    )
                except Exception as e:
                    # Log error but don't fail the operation
                    print(f"Error saving message to database: {e}")
            
            # Start worker if not running
            if phone not in self.workers or self.workers[phone].done():
                self.workers[phone] = asyncio.create_task(self._process_queue(phone))
        
        return message_id
    
    async def _process_queue(self, phone: str):
        """Process messages for a specific account - optimized to reduce lock contention"""
        while self.running:
            try:
                # Get message and check pause status in single lock operation
                message = None
                is_paused = False
                
                async with self.lock:
                    is_paused = self.paused.get(phone, False)
                    if is_paused:
                        # Release lock before sleeping
                        pass
                    elif phone in self.queues and self.queues[phone]:
                        # Get next message
                        now = datetime.now()
                        for m in self.queues[phone]:
                            if m.status == MessageStatus.PENDING:
                                # Check if scheduled time has arrived
                                if m.scheduled_at is None or m.scheduled_at <= now:
                                    message = m
                                    break
                
                # Check pause status outside lock
                if is_paused:
                    await asyncio.sleep(1)  # Wait before checking again
                    continue
                
                if not message:
                    # No ready messages, wait a bit
                    await asyncio.sleep(0.5)  # Reduced wait time for better responsiveness
                    continue
                
                # 检查是否应该现在发送（队列优化）
                if self.optimizer:
                    try:
                        should_send, priority_score = self.optimizer.should_send_now(
                            message.user_id,
                            message.phone
                        )
                        if not should_send:
                            # 不应该现在发送，等待一段时间
                            await asyncio.sleep(60)  # 等待 1 分钟
                            continue
                    except Exception as e:
                        print(f"Error checking send time: {e}", file=sys.stderr)
                
                # Process message outside lock
                await self._process_message(message)
                
            except Exception as e:
                print(f"Error processing queue for {phone}: {e}", file=sys.stderr)
                await asyncio.sleep(1)
        
        # Clean up
        async with self.lock:
            if phone in self.workers:
                del self.workers[phone]
    
    async def _update_message_status(self, message: QueuedMessage, status: MessageStatus, error: Optional[str] = None):
        """Update message status and sync to database"""
        message.status = status
        if error:
            message.last_error = error
        
        if self.database:
            try:
                await self.database.update_queue_message_status(
                    message_id=message.id,
                    status=status.value,
                    last_error=error
                )
            except Exception as e:
                print(f"Error updating message status in database: {e}")
    
    async def _process_message(self, message: QueuedMessage):
        """Process a single message"""
        await self._update_message_status(message, MessageStatus.PROCESSING)
        message.attempts += 1
        start_time = time.time()
        
        # Update attempts in database
        if self.database:
            try:
                await self.database.increment_queue_message_attempts(message.id)
            except Exception as e:
                import sys
                print(f"Error updating message attempts in database: {e}", file=sys.stderr)
        
        try:
            # Check rate limit
            rate_limiter = self.rate_limiters[message.phone]
            can_send, wait_seconds = await rate_limiter.can_send()
            
            if not can_send:
                # Wait and retry
                await self._update_message_status(message, MessageStatus.RETRYING)
                await asyncio.sleep(wait_seconds or 1)
                await self._update_message_status(message, MessageStatus.PENDING)
                return
            
            # 计算发送间隔（队列优化）
            send_interval = 0.0
            if self.optimizer:
                try:
                    send_interval = self.optimizer.calculate_send_interval(message.phone)
                    if send_interval > 0:
                        await asyncio.sleep(send_interval)
                except Exception as e:
                    print(f"Error calculating send interval: {e}", file=sys.stderr)
            
            # Send message
            result = await self.send_callback(
                message.phone,
                message.user_id,
                message.text,
                message.attachment,
                message.source_group,
                message.target_username
            )
            
            # Record send
            await rate_limiter.record_send()
            
            # 记录发送结果（队列优化）
            if self.optimizer:
                try:
                    elapsed = time.time() - start_time
                    self.optimizer.record_send(
                        message.phone,
                        message.user_id,
                        result.get('success', False),
                        elapsed * 1000  # 转换为毫秒
                    )
                except Exception as e:
                    print(f"Error recording send result: {e}", file=sys.stderr)
            
            # Handle result
            if result.get('success'):
                await self._update_message_status(message, MessageStatus.COMPLETED)
                elapsed = time.time() - start_time
                
                # Update stats
                async with self.lock:
                    stats = self.stats[message.phone]
                    stats["total"] += 1
                    stats["completed"] += 1
                    # Update average time
                    total_completed = stats["completed"]
                    stats["avg_time"] = (
                        (stats["avg_time"] * (total_completed - 1) + elapsed) / total_completed
                    )
                
                # Call callback if provided
                if message.callback:
                    try:
                        await message.callback(message, result)
                    except Exception as e:
                        import sys
                        print(f"Error in message callback: {e}", file=sys.stderr)
                
                # Remove from queue (but keep in database for history)
                async with self.lock:
                    if message.phone in self.queues:
                        self.queues[message.phone] = [
                            m for m in self.queues[message.phone] if m.id != message.id
                        ]
            else:
                # Send failed
                error = result.get('error', 'Unknown error')
                await self._handle_send_failure(message, Exception(error), strategy="exponential")
        
        except FloodWait as e:
            # Set flood wait
            await rate_limiter.set_flood_wait(e.value)
            await self._handle_send_failure(message, e, strategy="exponential")
        
        except Exception as e:
            await self._handle_send_failure(message, e, strategy="exponential")
    
    async def _handle_send_failure(self, message: QueuedMessage, error: Exception, strategy: str = "exponential"):
        """Handle send failure with retry strategy"""
        should_retry, wait_seconds = RetryHandler.should_retry(
            error,
            message.attempts,
            message.max_attempts,
            strategy=strategy
        )
        
        message.last_error = str(error)
        message.attempts += 1
        
        if should_retry:
            await self._update_message_status(message, MessageStatus.RETRYING, str(error))
            
            # Update stats
            async with self.lock:
                if message.phone in self.stats:
                    self.stats[message.phone]["retries"] += 1
            
            # 詳細日誌
            print(f"[MessageQueue] 消息 {message.id} 重試 {message.attempts}/{message.max_attempts}，等待 {wait_seconds} 秒", file=sys.stderr)
            
            # Wait before retry
            if wait_seconds and wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
            
            # Put back in queue for retry
            await self._update_message_status(message, MessageStatus.PENDING)
        else:
            # Max attempts reached, mark as failed
            await self._update_message_status(message, MessageStatus.FAILED, str(error))
            
            # Update stats
            async with self.lock:
                if message.phone in self.stats:
                    stats = self.stats[message.phone]
                    stats["total"] += 1
                    stats["failed"] += 1
            
            # Remove from queue (but keep in database for history)
            async with self.lock:
                if message.phone in self.queues:
                    self.queues[message.phone] = [
                        m for m in self.queues[message.phone] if m.id != message.id
                    ]
    
    async def get_queue_status(self, phone: Optional[str] = None) -> Dict[str, Any]:
        """Get queue status for account(s)"""
        async with self.lock:
            if phone:
                if phone not in self.queues:
                    return {}
                
                queue = self.queues[phone]
                return {
                    "phone": phone,
                    "pending": len([m for m in queue if m.status == MessageStatus.PENDING]),
                    "processing": len([m for m in queue if m.status == MessageStatus.PROCESSING]),
                    "retrying": len([m for m in queue if m.status == MessageStatus.RETRYING]),
                    "failed": len([m for m in queue if m.status == MessageStatus.FAILED]),
                    "total": len(queue),
                    "stats": self.stats.get(phone, {})
                }
            else:
                # All accounts
                result = {}
                for p in self.queues.keys():
                    result[p] = await self.get_queue_status(p)
                return result
    
    async def clear_queue(self, phone: str, status: Optional[MessageStatus] = None):
        """Clear messages from queue"""
        async with self.lock:
            if phone not in self.queues:
                return
            
            if status:
                self.queues[phone] = [
                    m for m in self.queues[phone] if m.status != status
                ]
            else:
                self.queues[phone] = []
    
    async def restore_from_database(self):
        """Restore pending messages from database"""
        if not self.database:
            return
        
        try:
            pending_messages = await self.database.get_pending_queue_messages()
            
            for msg_data in pending_messages:
                try:
                    # Parse scheduled_at
                    scheduled_at = None
                    if msg_data.get('scheduled_at'):
                        scheduled_at = datetime.fromisoformat(msg_data['scheduled_at'].replace('Z', '+00:00'))
                    
                    # Parse priority
                    priority = MessagePriority[msg_data.get('priority', 'NORMAL')]
                    
                    # Parse status
                    status = MessageStatus[msg_data.get('status', 'pending').upper()]
                    
                    # Create message object
                    message = QueuedMessage(
                        id=msg_data['id'],
                        phone=msg_data['phone'],
                        user_id=msg_data['user_id'],
                        text=msg_data['text'],
                        attachment=msg_data.get('attachment'),
                        priority=priority,
                        status=status,
                        created_at=datetime.fromisoformat(msg_data['created_at'].replace('Z', '+00:00')),
                        attempts=msg_data.get('attempts', 0),
                        max_attempts=msg_data.get('max_attempts', 3),
                        last_error=msg_data.get('last_error'),
                        scheduled_at=scheduled_at
                    )
                    
                    # Add to queue
                    async with self.lock:
                        phone = message.phone
                        if phone not in self.queues:
                            self.queues[phone] = []
                            self.rate_limiters[phone] = RateLimiter(phone)
                            self.processing[phone] = False
                            self.stats[phone] = {
                                "total": 0,
                                "completed": 0,
                                "failed": 0,
                                "retries": 0,
                                "avg_time": 0.0
                            }
                        
                        # Insert based on priority
                        queue = self.queues[phone]
                        if priority == MessagePriority.HIGH:
                            queue.insert(0, message)
                        elif priority == MessagePriority.LOW:
                            queue.append(message)
                        else:
                            insert_pos = 0
                            for i, m in enumerate(queue):
                                if m.priority != MessagePriority.HIGH:
                                    insert_pos = i
                                    break
                            else:
                                insert_pos = len(queue)
                            queue.insert(insert_pos, message)
                        
                        # Start worker if not running
                        if phone not in self.workers or self.workers[phone].done():
                            self.workers[phone] = asyncio.create_task(self._process_queue(phone))
                
                except Exception as e:
                    print(f"Error restoring message {msg_data.get('id')}: {e}")
        
        except Exception as e:
            print(f"Error restoring queue from database: {e}")
    
    async def pause_queue(self, phone: str):
        """Pause queue processing for an account"""
        async with self.lock:
            self.paused[phone] = True
    
    async def resume_queue(self, phone: str):
        """Resume queue processing for an account"""
        async with self.lock:
            self.paused[phone] = False
            # Restart worker if needed
            if phone in self.queues and (phone not in self.workers or self.workers[phone].done()):
                self.workers[phone] = asyncio.create_task(self._process_queue(phone))
    
    async def is_paused(self, phone: str) -> bool:
        """Check if queue is paused for an account"""
        async with self.lock:
            return self.paused.get(phone, False)
    
    async def delete_message(self, phone: str, message_id: str) -> bool:
        """Delete a message from the queue"""
        async with self.lock:
            if phone not in self.queues:
                return False
            
            queue = self.queues[phone]
            for i, msg in enumerate(queue):
                if msg.id == message_id:
                    queue.pop(i)
                    # Also delete from database
                    if self.database:
                        await self.database.delete_queue_message(message_id)
                    return True
            return False
    
    async def update_message_priority(self, phone: str, message_id: str, priority: MessagePriority) -> bool:
        """Update message priority"""
        async with self.lock:
            if phone not in self.queues:
                return False
            
            queue = self.queues[phone]
            for msg in queue:
                if msg.id == message_id:
                    old_priority = msg.priority
                    msg.priority = priority
                    
                    # Re-sort queue based on new priority
                    queue.remove(msg)
                    if priority == MessagePriority.HIGH:
                        queue.insert(0, msg)
                    elif priority == MessagePriority.LOW:
                        queue.append(msg)
                    else:
                        # Insert after high priority messages
                        insert_pos = 0
                        for i, m in enumerate(queue):
                            if m.priority != MessagePriority.HIGH:
                                insert_pos = i
                                break
                        else:
                            insert_pos = len(queue)
                        queue.insert(insert_pos, msg)
                    
                    # Update in database
                    if self.database:
                        await self.database.update_queue_message_status(
                            message_id,
                            status=None,  # Don't change status
                            priority=priority.value
                        )
                    return True
            return False
    
    async def get_queue_messages(self, phone: Optional[str] = None, status: Optional[MessageStatus] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get detailed list of messages in queue"""
        async with self.lock:
            result = []
            
            phones_to_check = [phone] if phone else list(self.queues.keys())
            
            for p in phones_to_check:
                if p not in self.queues:
                    continue
                
                queue = self.queues[p]
                for msg in queue:
                    if status and msg.status != status:
                        continue
                    
                    result.append({
                        "id": msg.id,
                        "phone": msg.phone,
                        "user_id": msg.user_id,
                        "text": msg.text[:100] + "..." if len(msg.text) > 100 else msg.text,  # Truncate long text
                        "attachment": msg.attachment,
                        "priority": msg.priority.name,
                        "status": msg.status.value,
                        "created_at": msg.created_at.isoformat(),
                        "scheduled_at": msg.scheduled_at.isoformat() if msg.scheduled_at else None,
                        "attempts": msg.attempts,
                        "max_attempts": msg.max_attempts,
                        "last_error": msg.last_error
                    })
                    
                    if len(result) >= limit:
                        break
                
                if len(result) >= limit:
                    break
            
            return result
    
    async def stop(self):
        """Stop all queue workers"""
        self.running = False
        
        # Wait for workers to finish
        for task in self.workers.values():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

