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
    
    def is_account_available(self, phone: str) -> bool:
        """檢查帳號是否可用（不在 FloodWait 冷卻期）"""
        flood_until = self._flood_wait_until.get(phone, 0)
        return flood_until <= time.time()
    
    def get_remaining_cooldown(self, phone: str) -> float:
        """獲取帳號剩餘冷卻時間（秒），0 表示可用"""
        flood_until = self._flood_wait_until.get(phone, 0)
        remaining = flood_until - time.time()
        return max(0, remaining)
    
    def get_available_accounts(self, clients: dict, operation: str = 'default') -> list:
        """
        從已連接帳號中篩選出不在 FloodWait 冷卻期的帳號
        
        Args:
            clients: {phone: Client} 已連接的 Telegram 客戶端
            operation: 操作類型（用於日誌）
        
        Returns:
            可用帳號列表 [(phone, remaining_cooldown)]，按冷卻時間升序排列
        """
        now = time.time()
        available = []
        cooling = []
        
        for phone, client in clients.items():
            if not client or not hasattr(client, 'is_connected') or not client.is_connected:
                continue
            
            flood_until = self._flood_wait_until.get(phone, 0)
            remaining = flood_until - now
            
            if remaining <= 0:
                available.append((phone, 0.0))
            else:
                cooling.append((phone, remaining))
        
        if cooling:
            print(
                f"[FloodWait] 帳號可用狀態 ({operation}): "
                f"{len(available)} 可用, {len(cooling)} 冷卻中 "
                f"[{', '.join(f'{p[:4]}****({r:.0f}s)' for p, r in cooling)}]",
                file=sys.stderr
            )
        
        # 先返回可用帳號，再返回冷卻中的（按剩餘時間排序）
        return available + sorted(cooling, key=lambda x: x[1])
    
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
    
    async def execute_with_rotation(
        self,
        func_factory: Callable,
        clients: dict,
        operation: str = 'default',
        preferred_phone: str = None,
        on_rotation: Callable = None,
        max_retries_per_account: int = 1,
    ) -> Any:
        """
        智能帳號輪換執行 — 當一個帳號觸發 FloodWait 時自動切換到下一個可用帳號
        
        Args:
            func_factory: 接受 (client, phone) 返回協程的工廠函數
                          例: lambda client, phone: client.join_chat(chat_id)
            clients: {phone: Client} 已連接的 Telegram 客戶端
            operation: 操作類型
            preferred_phone: 優先使用的帳號
            on_rotation: 輪換時的回調 (old_phone, new_phone, wait_time)
            max_retries_per_account: 每個帳號的最大重試次數
        
        Returns:
            (result, used_phone) — 操作結果和實際使用的帳號
        
        Raises:
            所有帳號都失敗時拋出最後的異常
        """
        # 獲取可用帳號列表
        account_list = self.get_available_accounts(clients, operation)
        
        if not account_list:
            raise RuntimeError(f"沒有可用的已連接帳號執行 {operation}")
        
        # 如果有優先帳號且可用，放到最前面
        if preferred_phone:
            account_list = sorted(
                account_list,
                key=lambda x: (0 if x[0] == preferred_phone else 1, x[1])
            )
        
        last_exception = None
        attempted_phones = []
        
        for phone, cooldown in account_list:
            # 如果帳號在冷卻中且還有其他可用帳號，跳過
            if cooldown > 0 and len([a for a in account_list if a[1] == 0]) > 0:
                continue
            
            client = clients.get(phone)
            if not client or not hasattr(client, 'is_connected') or not client.is_connected:
                continue
            
            attempted_phones.append(phone)
            
            for attempt in range(max_retries_per_account + 1):
                try:
                    await self.wait_before_operation(phone, operation)
                    result = await func_factory(client, phone)
                    
                    if len(attempted_phones) > 1:
                        print(
                            f"[FloodWait] ✓ 帳號輪換成功: {phone[:4]}**** "
                            f"(嘗試了 {len(attempted_phones)} 個帳號)",
                            file=sys.stderr
                        )
                    
                    return result, phone
                    
                except Exception as e:
                    last_exception = e
                    wait_time = self.get_wait_time_from_error(e)
                    
                    if wait_time is not None:
                        # FloodWait — 記錄冷卻並嘗試下一個帳號
                        self.record_flood_wait(phone, wait_time)
                        
                        if on_rotation:
                            try:
                                on_rotation(phone, None, wait_time)
                            except Exception:
                                pass
                        
                        print(
                            f"[FloodWait] 帳號 {phone[:4]}**** 被限速 {wait_time}s，嘗試輪換...",
                            file=sys.stderr
                        )
                        break  # 跳出重試循環，嘗試下一個帳號
                    else:
                        # 非 FloodWait 錯誤
                        if attempt < max_retries_per_account:
                            await asyncio.sleep(1)
                        else:
                            raise
        
        # 所有帳號都失敗了
        total_attempted = len(attempted_phones)
        if last_exception:
            print(
                f"[FloodWait] ✗ 所有帳號都失敗 ({total_attempted} 個)，"
                f"最後錯誤: {last_exception}",
                file=sys.stderr
            )
            raise last_exception
        raise RuntimeError(f"沒有可用帳號完成 {operation}")


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
