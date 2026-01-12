"""
Error Recovery Manager
自動錯誤恢復管理器 - 處理連接斷開、消息發送失敗等錯誤的自動恢復
"""
import asyncio
import sys
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum


class RetryStrategy(Enum):
    """重試策略"""
    EXPONENTIAL = "exponential"  # 指數退避
    LINEAR = "linear"            # 線性退避
    FIXED = "fixed"              # 固定間隔


class ErrorRecoveryManager:
    """錯誤恢復管理器"""
    
    def __init__(self, log_callback: Optional[Callable] = None):
        self.log_callback = log_callback
        self.reconnect_tasks: Dict[str, asyncio.Task] = {}
        self.retry_schedules: Dict[str, Dict[str, Any]] = {}
        
        # 重試策略配置
        self.retry_strategies = {
            RetryStrategy.EXPONENTIAL: lambda attempt: 2 ** attempt,  # 2^attempt 秒
            RetryStrategy.LINEAR: lambda attempt: attempt * 60,        # attempt * 60 秒
            RetryStrategy.FIXED: lambda attempt: 300,                  # 固定 300 秒
        }
        
        # 默認重試配置
        self.default_max_retries = 5
        self.default_backoff_factor = 2.0
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        if self.log_callback:
            self.log_callback(message, level)
        else:
            print(f"[ErrorRecovery] [{level}] {message}", file=sys.stderr)
    
    async def reconnect_client(
        self, 
        phone: str, 
        connect_func: Callable,
        max_retries: int = None,
        backoff_factor: float = None
    ) -> bool:
        """
        自動重連客戶端
        
        Args:
            phone: 帳號電話
            connect_func: 連接函數（async）
            max_retries: 最大重試次數
            backoff_factor: 退避因子
            
        Returns:
            是否成功重連
        """
        max_retries = max_retries or self.default_max_retries
        backoff_factor = backoff_factor or self.default_backoff_factor
        retry_count = 0
        
        self.log(f"開始自動重連: {phone}")
        
        while retry_count < max_retries:
            try:
                self.log(f"重連嘗試 {retry_count + 1}/{max_retries}: {phone}")
                
                # 嘗試連接
                result = await connect_func()
                
                if result:
                    self.log(f"✓ 成功重連: {phone}", "success")
                    # 清除重連任務
                    if phone in self.reconnect_tasks:
                        del self.reconnect_tasks[phone]
                    return True
                    
            except Exception as e:
                retry_count += 1
                wait_time = backoff_factor ** retry_count
                
                self.log(f"重連失敗 ({retry_count}/{max_retries}): {phone} - {str(e)}, {wait_time}秒後重試", "warning")
                
                if retry_count < max_retries:
                    await asyncio.sleep(wait_time)
                else:
                    self.log(f"✗ 重連失敗，已達最大重試次數: {phone}", "error")
                    if phone in self.reconnect_tasks:
                        del self.reconnect_tasks[phone]
                    return False
        
        return False
    
    async def monitor_connection(
        self, 
        phone: str, 
        check_func: Callable,
        connect_func: Callable,
        check_interval: int = 30
    ):
        """
        監控連接狀態並自動重連
        
        Args:
            phone: 帳號電話
            check_func: 檢查連接狀態的函數（async，返回 bool）
            connect_func: 連接函數（async）
            check_interval: 檢查間隔（秒）
        """
        while True:
            try:
                await asyncio.sleep(check_interval)
                
                # 檢查連接狀態
                is_connected = await check_func()
                
                if not is_connected:
                    self.log(f"檢測到連接斷開: {phone}, 開始重連...", "warning")
                    
                    # 如果已經有重連任務在運行，跳過
                    if phone in self.reconnect_tasks and not self.reconnect_tasks[phone].done():
                        continue
                    
                    # 啟動重連任務
                    task = asyncio.create_task(
                        self.reconnect_client(phone, connect_func)
                    )
                    self.reconnect_tasks[phone] = task
                    
            except asyncio.CancelledError:
                self.log(f"連接監控已取消: {phone}")
                break
            except Exception as e:
                self.log(f"連接監控錯誤: {phone} - {str(e)}", "error")
                await asyncio.sleep(check_interval)
    
    async def retry_with_backoff(
        self,
        func: Callable,
        max_retries: int = 3,
        strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
        on_retry: Optional[Callable] = None
    ) -> Any:
        """
        使用退避策略重試函數
        
        Args:
            func: 要重試的函數（async）
            max_retries: 最大重試次數
            strategy: 重試策略
            on_retry: 重試前的回調函數（async，接收 attempt 參數）
            
        Returns:
            函數返回值
            
        Raises:
            Exception: 如果所有重試都失敗
        """
        attempt = 0
        last_exception = None
        
        while attempt < max_retries:
            try:
                result = await func()
                return result
                
            except Exception as e:
                attempt += 1
                last_exception = e
                
                if attempt >= max_retries:
                    self.log(f"重試失敗，已達最大次數 ({max_retries}): {str(e)}", "error")
                    raise
                
                # 計算等待時間
                wait_time = self.retry_strategies[strategy](attempt)
                
                self.log(f"重試 {attempt}/{max_retries}，{wait_time}秒後重試: {str(e)}", "warning")
                
                # 執行重試回調
                if on_retry:
                    try:
                        await on_retry(attempt)
                    except:
                        pass
                
                await asyncio.sleep(wait_time)
        
        # 如果執行到這裡，所有重試都失敗了
        raise last_exception if last_exception else Exception("Retry failed")
    
    def schedule_retry(
        self,
        task_id: str,
        retry_func: Callable,
        scheduled_time: datetime,
        max_retries: int = 3,
        strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    ):
        """
        安排稍後重試
        
        Args:
            task_id: 任務ID
            retry_func: 重試函數（async）
            scheduled_time: 計劃執行時間
            max_retries: 最大重試次數
            strategy: 重試策略
        """
        self.retry_schedules[task_id] = {
            'func': retry_func,
            'scheduled_time': scheduled_time,
            'max_retries': max_retries,
            'strategy': strategy,
            'created_at': datetime.now()
        }
        
        # 計算延遲時間
        delay = (scheduled_time - datetime.now()).total_seconds()
        
        if delay > 0:
            # 創建延遲任務
            asyncio.create_task(self._execute_scheduled_retry(task_id, delay))
        else:
            # 立即執行
            asyncio.create_task(self._execute_scheduled_retry(task_id, 0))
    
    async def _execute_scheduled_retry(self, task_id: str, delay: float):
        """執行計劃的重試"""
        if delay > 0:
            await asyncio.sleep(delay)
        
        if task_id not in self.retry_schedules:
            return
        
        schedule = self.retry_schedules[task_id]
        func = schedule['func']
        max_retries = schedule['max_retries']
        strategy = schedule['strategy']
        
        try:
            await self.retry_with_backoff(func, max_retries, strategy)
            # 成功後移除計劃
            del self.retry_schedules[task_id]
        except Exception as e:
            self.log(f"計劃重試失敗: {task_id} - {str(e)}", "error")
            # 失敗後也移除計劃（避免無限重試）
            del self.retry_schedules[task_id]
    
    async def cancel_reconnect(self, phone: str):
        """取消重連任務"""
        if phone in self.reconnect_tasks:
            task = self.reconnect_tasks[phone]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self.reconnect_tasks[phone]
            self.log(f"已取消重連任務: {phone}")
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        return {
            'active_reconnect_tasks': len([t for t in self.reconnect_tasks.values() if not t.done()]),
            'scheduled_retries': len(self.retry_schedules),
            'reconnect_tasks': list(self.reconnect_tasks.keys()),
            'scheduled_retry_ids': list(self.retry_schedules.keys())
        }
