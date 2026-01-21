"""
FloodWait 智能處理模塊

提供智能延遲和重試機制，避免觸發 Telegram 的限速保護。
"""
import asyncio
import time
import re
import sys
from functools import wraps
from typing import Callable, Any, Optional


class FloodWaitHandler:
    """FloodWait 智能處理器"""
    
    # 基礎延遲設置（秒）
    BASE_DELAY = 0.5
    MAX_DELAY = 60
    MAX_RETRIES = 3
    
    # 操作類型的推薦延遲
    OPERATION_DELAYS = {
        'get_chat': 0.3,
        'get_chat_member': 0.3,
        'get_participants': 1.0,
        'join_chat': 2.0,
        'leave_chat': 2.0,
        'send_message': 1.0,
        'search_global': 1.5,
        'get_dialogs': 0.5,
        'resolve_peer': 0.2,
    }
    
    # 帳號最後操作時間追蹤
    _last_operation_time: dict = {}
    _flood_wait_until: dict = {}
    
    def __init__(self):
        self._last_operation_time = {}
        self._flood_wait_until = {}
    
    def get_delay_for_operation(self, operation: str) -> float:
        """獲取特定操作的推薦延遲"""
        return self.OPERATION_DELAYS.get(operation, self.BASE_DELAY)
    
    def get_wait_time_from_error(self, error: Exception) -> Optional[int]:
        """從 FloodWait 錯誤中提取等待時間"""
        error_str = str(error).upper()
        
        # 檢查是否為 FloodWait 錯誤
        if 'FLOOD_WAIT' not in error_str and 'FLOOD WAIT' not in error_str:
            return None
        
        # 提取等待時間
        # 格式可能是: "FLOOD_WAIT (420)" 或 "A wait of 420 seconds"
        patterns = [
            r'FLOOD_WAIT.*?(\d+)',
            r'wait.*?(\d+).*?second',
            r'\((\d+)\)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, str(error), re.IGNORECASE)
            if match:
                return int(match.group(1))
        
        # 默認等待時間
        return 30
    
    async def wait_before_operation(self, phone: str, operation: str = 'default'):
        """在執行操作前等待適當的時間"""
        # 檢查是否在 FloodWait 冷卻期
        flood_until = self._flood_wait_until.get(phone, 0)
        if flood_until > time.time():
            wait_time = flood_until - time.time()
            print(f"[FloodWait] 帳號 {phone} 仍在冷卻期，等待 {wait_time:.1f}s", file=sys.stderr)
            await asyncio.sleep(wait_time)
        
        # 獲取推薦延遲
        delay = self.get_delay_for_operation(operation)
        
        # 計算距離上次操作的時間
        last_time = self._last_operation_time.get(f"{phone}:{operation}", 0)
        elapsed = time.time() - last_time
        
        # 如果距離上次操作時間不足，等待
        if elapsed < delay:
            wait_time = delay - elapsed
            await asyncio.sleep(wait_time)
        
        # 更新最後操作時間
        self._last_operation_time[f"{phone}:{operation}"] = time.time()
    
    def record_flood_wait(self, phone: str, wait_seconds: int):
        """記錄 FloodWait，設置冷卻期"""
        self._flood_wait_until[phone] = time.time() + wait_seconds
        print(f"[FloodWait] 帳號 {phone} 被限速，冷卻 {wait_seconds}s", file=sys.stderr)
    
    async def execute_with_retry(
        self,
        func: Callable,
        phone: str,
        operation: str = 'default',
        max_retries: int = None,
        on_flood_wait: Callable = None,
        *args,
        **kwargs
    ) -> Any:
        """
        執行操作並自動處理 FloodWait
        
        Args:
            func: 要執行的異步函數
            phone: 帳號電話號碼
            operation: 操作類型（用於確定延遲）
            max_retries: 最大重試次數
            on_flood_wait: FloodWait 時的回調
            *args, **kwargs: 傳遞給 func 的參數
        
        Returns:
            func 的返回值
        
        Raises:
            最後一次重試失敗時的異常
        """
        max_retries = max_retries or self.MAX_RETRIES
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # 等待適當時間
                await self.wait_before_operation(phone, operation)
                
                # 執行操作
                result = await func(*args, **kwargs)
                return result
                
            except Exception as e:
                last_exception = e
                wait_time = self.get_wait_time_from_error(e)
                
                if wait_time is not None:
                    # 是 FloodWait 錯誤
                    self.record_flood_wait(phone, wait_time)
                    
                    if on_flood_wait:
                        on_flood_wait(phone, wait_time, attempt)
                    
                    if attempt < max_retries:
                        # 等待並重試
                        actual_wait = min(wait_time, self.MAX_DELAY)
                        print(f"[FloodWait] 第 {attempt + 1} 次重試，等待 {actual_wait}s...", file=sys.stderr)
                        await asyncio.sleep(actual_wait)
                    else:
                        # 已達最大重試次數
                        raise
                else:
                    # 不是 FloodWait 錯誤，直接拋出
                    raise
        
        raise last_exception


# 全局單例
flood_handler = FloodWaitHandler()


def with_flood_handling(operation: str = 'default'):
    """
    裝飾器：自動處理 FloodWait
    
    用法:
        @with_flood_handling('get_chat')
        async def my_operation(client, chat_id):
            return await client.get_chat(chat_id)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 嘗試從參數中獲取 phone
            phone = kwargs.get('phone', 'unknown')
            if not phone or phone == 'unknown':
                # 嘗試從第一個參數獲取
                if args and hasattr(args[0], 'phone'):
                    phone = args[0].phone
            
            return await flood_handler.execute_with_retry(
                func,
                phone=phone,
                operation=operation,
                *args,
                **kwargs
            )
        return wrapper
    return decorator


async def safe_telegram_call(
    func: Callable,
    phone: str,
    operation: str = 'default',
    on_error: Callable = None,
    default_value: Any = None,
    *args,
    **kwargs
) -> Any:
    """
    安全執行 Telegram API 調用
    
    自動處理 FloodWait 和其他常見錯誤
    
    Args:
        func: 要執行的異步函數
        phone: 帳號電話號碼
        operation: 操作類型
        on_error: 錯誤處理回調
        default_value: 失敗時返回的默認值
        *args, **kwargs: 傳遞給 func 的參數
    
    Returns:
        func 的返回值，或 default_value
    """
    try:
        return await flood_handler.execute_with_retry(
            func,
            phone=phone,
            operation=operation,
            *args,
            **kwargs
        )
    except Exception as e:
        if on_error:
            on_error(e)
        else:
            print(f"[FloodWait] 操作失敗: {e}", file=sys.stderr)
        return default_value
