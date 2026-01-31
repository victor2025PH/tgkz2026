"""
Error Recovery Manager
向後兼容模組 - 整合到 error_recovery.py

此文件保留用於向後兼容，新代碼應直接使用:
    from error_recovery import ErrorRecoveryManager, RecoveryAction, ErrorCategory
"""

import sys
import asyncio
from typing import Optional, Callable, Dict, Any

# 導入主要的錯誤恢復模組
try:
    from error_recovery import ErrorRecoveryManager as MainErrorRecoveryManager
    _has_main_module = True
except ImportError:
    _has_main_module = False


class RetryStrategy:
    """重試策略（向後兼容）"""
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"


class ErrorRecoveryManager:
    """
    錯誤恢復管理器（向後兼容包裝器）
    
    此類提供簡化的接口，內部使用 error_recovery.py 的實現
    """
    
    def __init__(self, log_callback: Optional[Callable] = None):
        self.log_callback = log_callback
        self.reconnect_tasks: Dict[str, asyncio.Task] = {}
        self.retry_schedules: Dict[str, Dict[str, Any]] = {}
        
        # 如果主模組可用，創建實例
        if _has_main_module:
            self._main_manager = MainErrorRecoveryManager()
        else:
            self._main_manager = None
        
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
                
                result = await connect_func()
                
                if result:
                    self.log(f"✓ 成功重連: {phone}", "success")
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
    
    def schedule_retry(
        self,
        key: str,
        action: str,
        delay: float,
        callback: Optional[Callable] = None
    ) -> None:
        """
        安排重試
        """
        self.retry_schedules[key] = {
            "action": action,
            "delay": delay,
            "scheduled_at": asyncio.get_event_loop().time(),
            "callback": callback
        }
        self.log(f"已安排重試: {key} -> {action} ({delay}秒後)")
    
    def cancel_retry(self, key: str) -> bool:
        """
        取消重試
        """
        if key in self.retry_schedules:
            del self.retry_schedules[key]
            self.log(f"已取消重試: {key}")
            return True
        return False
    
    def get_retry_info(self, key: str) -> Optional[Dict[str, Any]]:
        """
        獲取重試信息
        """
        return self.retry_schedules.get(key)


__all__ = [
    'RetryStrategy',
    'ErrorRecoveryManager',
]
