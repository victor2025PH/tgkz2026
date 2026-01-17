"""
TG-Matrix 並發消息處理器 - Phase 2 性能優化
Concurrent Message Processor with Rate Limiting and Backpressure

功能:
1. 異步並發消息處理
2. 智能速率限制
3. 背壓控制
4. 優先級隊列
"""

import asyncio
import logging
import time
from typing import Dict, Any, List, Optional, Callable, Awaitable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import heapq

logger = logging.getLogger(__name__)


class Priority(Enum):
    """消息優先級"""
    CRITICAL = 0  # 最高優先級（如驗證碼）
    HIGH = 1      # 高優先級（如即時回覆）
    NORMAL = 2    # 普通優先級
    LOW = 3       # 低優先級（如定時任務）
    BACKGROUND = 4  # 後台任務


@dataclass(order=True)
class PriorityMessage:
    """優先級消息"""
    priority: int
    timestamp: float = field(compare=False)
    message_id: str = field(compare=False)
    payload: Dict[str, Any] = field(compare=False)
    account_phone: str = field(compare=False)
    retry_count: int = field(compare=False, default=0)
    callback: Optional[Callable] = field(compare=False, default=None)


@dataclass
class AccountRateLimit:
    """帳號速率限制狀態"""
    account_phone: str
    messages_sent: int = 0
    last_reset: datetime = field(default_factory=datetime.now)
    current_delay: float = 1.0  # 當前延遲（秒）
    is_limited: bool = False
    limit_until: Optional[datetime] = None
    daily_count: int = 0
    daily_limit: int = 100
    
    def can_send(self) -> bool:
        """檢查是否可以發送"""
        if self.is_limited and self.limit_until:
            if datetime.now() < self.limit_until:
                return False
            self.is_limited = False
            self.limit_until = None
        
        # 檢查日限
        if self.daily_count >= self.daily_limit:
            return False
        
        return True
    
    def record_send(self):
        """記錄發送"""
        self.messages_sent += 1
        self.daily_count += 1
    
    def apply_rate_limit(self, duration_seconds: int = 300):
        """應用速率限制"""
        self.is_limited = True
        self.limit_until = datetime.now() + timedelta(seconds=duration_seconds)
        logger.warning(f"[Rate Limit] {self.account_phone} limited for {duration_seconds}s")
    
    def reset_hourly(self):
        """重置每小時計數"""
        now = datetime.now()
        if (now - self.last_reset).total_seconds() >= 3600:
            self.messages_sent = 0
            self.last_reset = now
            self.current_delay = 1.0


class ConcurrentMessageProcessor:
    """並發消息處理器"""
    
    def __init__(
        self,
        max_concurrent: int = 10,
        rate_limit_per_account: int = 30,  # 每分鐘每帳號
        global_rate_limit: int = 100,       # 每分鐘全局
        backpressure_threshold: int = 1000, # 隊列長度閾值
    ):
        """
        初始化處理器
        
        Args:
            max_concurrent: 最大並發數
            rate_limit_per_account: 每帳號每分鐘限制
            global_rate_limit: 全局每分鐘限制
            backpressure_threshold: 背壓閾值
        """
        self.max_concurrent = max_concurrent
        self.rate_limit_per_account = rate_limit_per_account
        self.global_rate_limit = global_rate_limit
        self.backpressure_threshold = backpressure_threshold
        
        # 優先級隊列
        self.queue: List[PriorityMessage] = []
        self.queue_lock = asyncio.Lock()
        
        # 帳號速率限制
        self.account_limits: Dict[str, AccountRateLimit] = {}
        
        # 全局計數器
        self.global_sent_count = 0
        self.global_last_reset = datetime.now()
        
        # 信號量控制並發
        self.semaphore = asyncio.Semaphore(max_concurrent)
        
        # 處理回調
        self.message_handler: Optional[Callable[[Dict[str, Any]], Awaitable[bool]]] = None
        
        # 統計
        self.stats = {
            'processed': 0,
            'success': 0,
            'failed': 0,
            'retried': 0,
            'rate_limited': 0,
            'backpressure_triggered': 0
        }
        
        # 運行狀態
        self._running = False
        self._processor_task: Optional[asyncio.Task] = None
    
    def set_handler(self, handler: Callable[[Dict[str, Any]], Awaitable[bool]]):
        """設置消息處理回調"""
        self.message_handler = handler
    
    async def enqueue(
        self,
        message_id: str,
        payload: Dict[str, Any],
        account_phone: str,
        priority: Priority = Priority.NORMAL,
        callback: Optional[Callable] = None
    ) -> bool:
        """
        入隊消息
        
        Args:
            message_id: 消息ID
            payload: 消息內容
            account_phone: 發送帳號
            priority: 優先級
            callback: 完成回調
            
        Returns:
            是否成功入隊
        """
        # 背壓檢查
        if len(self.queue) >= self.backpressure_threshold:
            self.stats['backpressure_triggered'] += 1
            logger.warning(f"[Backpressure] Queue full ({len(self.queue)}), rejecting message")
            return False
        
        msg = PriorityMessage(
            priority=priority.value,
            timestamp=time.time(),
            message_id=message_id,
            payload=payload,
            account_phone=account_phone,
            callback=callback
        )
        
        async with self.queue_lock:
            heapq.heappush(self.queue, msg)
        
        return True
    
    async def start(self):
        """啟動處理器"""
        if self._running:
            return
        
        self._running = True
        self._processor_task = asyncio.create_task(self._process_loop())
        logger.info("[Concurrent Processor] Started")
    
    async def stop(self):
        """停止處理器"""
        self._running = False
        if self._processor_task:
            self._processor_task.cancel()
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
        logger.info("[Concurrent Processor] Stopped")
    
    async def _process_loop(self):
        """主處理循環"""
        while self._running:
            try:
                # 檢查是否有消息
                if not self.queue:
                    await asyncio.sleep(0.1)
                    continue
                
                # 檢查全局速率限制
                if not self._check_global_rate_limit():
                    await asyncio.sleep(1)
                    continue
                
                # 獲取消息
                msg = await self._get_next_message()
                if not msg:
                    await asyncio.sleep(0.1)
                    continue
                
                # 並發處理
                await self.semaphore.acquire()
                asyncio.create_task(self._process_message(msg))
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[Concurrent Processor] Error in process loop: {e}")
                await asyncio.sleep(1)
    
    async def _get_next_message(self) -> Optional[PriorityMessage]:
        """獲取下一個可處理的消息"""
        async with self.queue_lock:
            # 找到一個可以發送的消息
            for i, msg in enumerate(self.queue):
                if self._check_account_rate_limit(msg.account_phone):
                    self.queue.pop(i)
                    heapq.heapify(self.queue)
                    return msg
        
        return None
    
    async def _process_message(self, msg: PriorityMessage):
        """處理單個消息"""
        try:
            success = False
            
            if self.message_handler:
                # 獲取帳號限制器
                limit = self._get_account_limit(msg.account_phone)
                
                # 應用延遲
                if limit.current_delay > 0:
                    await asyncio.sleep(limit.current_delay)
                
                # 調用處理器
                try:
                    success = await self.message_handler(msg.payload)
                except Exception as e:
                    logger.error(f"[Process] Handler error: {e}")
                    success = False
                
                # 更新統計和限制
                if success:
                    self.stats['success'] += 1
                    limit.record_send()
                    self.global_sent_count += 1
                    
                    # 成功時減少延遲
                    limit.current_delay = max(0.5, limit.current_delay * 0.9)
                else:
                    self.stats['failed'] += 1
                    
                    # 失敗時增加延遲
                    limit.current_delay = min(10, limit.current_delay * 1.5)
                    
                    # 重試邏輯
                    if msg.retry_count < 3:
                        msg.retry_count += 1
                        self.stats['retried'] += 1
                        async with self.queue_lock:
                            # 降低優先級重新入隊
                            msg.priority = min(msg.priority + 1, Priority.BACKGROUND.value)
                            heapq.heappush(self.queue, msg)
            
            self.stats['processed'] += 1
            
            # 執行回調
            if msg.callback:
                try:
                    if asyncio.iscoroutinefunction(msg.callback):
                        await msg.callback(success)
                    else:
                        msg.callback(success)
                except Exception as e:
                    logger.error(f"[Process] Callback error: {e}")
                    
        finally:
            self.semaphore.release()
    
    def _get_account_limit(self, account_phone: str) -> AccountRateLimit:
        """獲取帳號限制器"""
        if account_phone not in self.account_limits:
            self.account_limits[account_phone] = AccountRateLimit(account_phone=account_phone)
        return self.account_limits[account_phone]
    
    def _check_account_rate_limit(self, account_phone: str) -> bool:
        """檢查帳號速率限制"""
        limit = self._get_account_limit(account_phone)
        limit.reset_hourly()
        
        if not limit.can_send():
            self.stats['rate_limited'] += 1
            return False
        
        return True
    
    def _check_global_rate_limit(self) -> bool:
        """檢查全局速率限制"""
        now = datetime.now()
        
        # 每分鐘重置
        if (now - self.global_last_reset).total_seconds() >= 60:
            self.global_sent_count = 0
            self.global_last_reset = now
        
        return self.global_sent_count < self.global_rate_limit
    
    def apply_flood_wait(self, account_phone: str, wait_seconds: int):
        """
        應用 FloodWait 限制
        
        Args:
            account_phone: 帳號
            wait_seconds: 等待時間
        """
        limit = self._get_account_limit(account_phone)
        limit.apply_rate_limit(wait_seconds)
    
    def get_queue_status(self) -> Dict[str, Any]:
        """獲取隊列狀態"""
        # 按帳號統計
        by_account: Dict[str, int] = defaultdict(int)
        by_priority: Dict[int, int] = defaultdict(int)
        
        for msg in self.queue:
            by_account[msg.account_phone] += 1
            by_priority[msg.priority] += 1
        
        return {
            'queue_length': len(self.queue),
            'by_account': dict(by_account),
            'by_priority': {
                Priority(k).name: v for k, v in by_priority.items()
            },
            'stats': self.stats.copy(),
            'account_limits': {
                phone: {
                    'daily_count': limit.daily_count,
                    'daily_limit': limit.daily_limit,
                    'is_limited': limit.is_limited,
                    'current_delay': limit.current_delay
                }
                for phone, limit in self.account_limits.items()
            }
        }
    
    def clear_queue(self):
        """清空隊列"""
        self.queue.clear()
    
    def update_account_limit(self, account_phone: str, daily_limit: int):
        """更新帳號日限"""
        limit = self._get_account_limit(account_phone)
        limit.daily_limit = daily_limit


class BatchProcessor:
    """批量處理器 - 用於批量操作優化"""
    
    def __init__(self, batch_size: int = 50, flush_interval: float = 1.0):
        """
        初始化批量處理器
        
        Args:
            batch_size: 批量大小
            flush_interval: 刷新間隔（秒）
        """
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.batches: Dict[str, List[Any]] = defaultdict(list)
        self.handlers: Dict[str, Callable[[List[Any]], Awaitable[None]]] = {}
        self._last_flush: Dict[str, float] = {}
        self._lock = asyncio.Lock()
    
    def register_handler(self, batch_type: str, handler: Callable[[List[Any]], Awaitable[None]]):
        """註冊批量處理回調"""
        self.handlers[batch_type] = handler
        self._last_flush[batch_type] = time.time()
    
    async def add(self, batch_type: str, item: Any):
        """添加項目到批量"""
        async with self._lock:
            self.batches[batch_type].append(item)
            
            # 檢查是否需要刷新
            should_flush = (
                len(self.batches[batch_type]) >= self.batch_size or
                time.time() - self._last_flush.get(batch_type, 0) >= self.flush_interval
            )
            
            if should_flush:
                await self._flush(batch_type)
    
    async def _flush(self, batch_type: str):
        """刷新批量"""
        if batch_type not in self.batches or not self.batches[batch_type]:
            return
        
        items = self.batches[batch_type]
        self.batches[batch_type] = []
        self._last_flush[batch_type] = time.time()
        
        if batch_type in self.handlers:
            try:
                await self.handlers[batch_type](items)
            except Exception as e:
                logger.error(f"[Batch Processor] Flush error for {batch_type}: {e}")
    
    async def flush_all(self):
        """刷新所有批量"""
        async with self._lock:
            for batch_type in list(self.batches.keys()):
                await self._flush(batch_type)


# 全局處理器實例
_processor_instance: Optional[ConcurrentMessageProcessor] = None


def get_processor() -> ConcurrentMessageProcessor:
    """獲取全局處理器實例"""
    global _processor_instance
    
    if _processor_instance is None:
        _processor_instance = ConcurrentMessageProcessor()
    
    return _processor_instance
