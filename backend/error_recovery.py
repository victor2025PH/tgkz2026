"""
TG-Matrix Error Recovery Manager
错误恢复管理器 - 智能处理错误，自动恢复和重试
"""
import asyncio
import time
from typing import Dict, List, Optional, Tuple, Callable, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import sys
import re

from pyrogram.errors import (
    FloodWait, Flood, RPCError, AuthKeyUnregistered, UserDeactivated,
    PhoneCodeInvalid, PasswordHashInvalid, BadRequest, RpcConnectFailed
)

# ConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ConnectionError as PyrogramConnectionError
except ImportError:
    # Use Python's built-in ConnectionError as fallback
    from builtins import ConnectionError as PyrogramConnectionError

# ProxyConnectionError might not exist in all Pyrogram versions
try:
    from pyrogram.errors import ProxyConnectionError
except ImportError:
    ProxyConnectionError = RpcConnectFailed  # Use RpcConnectFailed as fallback

# UserBanned might not exist in all Pyrogram versions
try:
    from pyrogram.errors import UserBanned
except ImportError:
    UserBanned = UserDeactivated  # Use UserDeactivated as fallback


class ErrorCategory(Enum):
    """错误分类"""
    FLOOD_WAIT = "flood_wait"  # Flood Wait 错误
    CONNECTION_ERROR = "connection_error"  # 连接错误
    PROXY_ERROR = "proxy_error"  # 代理错误
    AUTH_ERROR = "auth_error"  # 认证错误
    RATE_LIMIT = "rate_limit"  # 限流错误
    TEMPORARY_ERROR = "temporary_error"  # 临时错误
    PERMANENT_ERROR = "permanent_error"  # 永久错误
    UNKNOWN_ERROR = "unknown_error"  # 未知错误


class RecoveryAction(Enum):
    """恢复动作"""
    RETRY = "retry"  # 重试
    RECONNECT = "reconnect"  # 重新连接
    ROTATE_PROXY = "rotate_proxy"  # 切换代理
    RELOGIN = "relogin"  # 重新登录
    WAIT = "wait"  # 等待
    SKIP = "skip"  # 跳过
    FAIL = "fail"  # 失败


@dataclass
class ErrorInfo:
    """错误信息"""
    error: Exception
    category: ErrorCategory
    message: str
    retryable: bool = True
    recovery_action: RecoveryAction = RecoveryAction.RETRY
    wait_seconds: float = 0.0
    max_retries: int = 3
    context: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class RecoveryResult:
    """恢复结果"""
    success: bool
    action_taken: RecoveryAction
    message: str
    retry_after: Optional[float] = None  # 重试等待时间（秒）
    should_retry: bool = True
    details: Dict[str, Any] = field(default_factory=dict)


class ErrorRecoveryManager:
    """错误恢复管理器"""
    
    def __init__(
        self,
        reconnect_callback: Optional[Callable] = None,
        rotate_proxy_callback: Optional[Callable] = None,
        relogin_callback: Optional[Callable] = None,
        max_retries: int = 3,
        base_retry_delay: float = 1.0,
        max_retry_delay: float = 300.0
    ):
        """
        初始化错误恢复管理器
        
        Args:
            reconnect_callback: 重新连接回调函数
            rotate_proxy_callback: 切换代理回调函数
            relogin_callback: 重新登录回调函数
            max_retries: 最大重试次数
            base_retry_delay: 基础重试延迟（秒）
            max_retry_delay: 最大重试延迟（秒）
        """
        self.reconnect_callback = reconnect_callback
        self.rotate_proxy_callback = rotate_proxy_callback
        self.relogin_callback = relogin_callback
        self.max_retries = max_retries
        self.base_retry_delay = base_retry_delay
        self.max_retry_delay = max_retry_delay
        
        # 错误历史：account_id -> deque(ErrorInfo)
        self.error_history: Dict[str, deque] = {}
        
        # 恢复统计：account_id -> stats
        self.recovery_stats: Dict[str, Dict[str, Any]] = {}
        
        # 账户恢复状态：account_id -> recovery_state
        self.recovery_states: Dict[str, Dict[str, Any]] = {}
    
    def classify_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> ErrorInfo:
        """
        分类错误
        
        Args:
            error: 异常对象
            context: 上下文信息
        
        Returns:
            错误信息
        """
        error_str = str(error).lower()
        error_type = type(error).__name__
        
        # Flood Wait 错误
        if isinstance(error, FloodWait):
            return ErrorInfo(
                error=error,
                category=ErrorCategory.FLOOD_WAIT,
                message=f"Flood Wait: {error.value} seconds",
                retryable=True,
                recovery_action=RecoveryAction.WAIT,
                wait_seconds=float(error.value),
                max_retries=5,
                context=context or {}
            )
        
        # Flood 错误（通用限流）
        if isinstance(error, Flood):
            return ErrorInfo(
                error=error,
                category=ErrorCategory.RATE_LIMIT,
                message="Rate limit exceeded",
                retryable=True,
                recovery_action=RecoveryAction.WAIT,
                wait_seconds=60.0,
                max_retries=3,
                context=context or {}
            )
        
        # 代理连接错误
        if isinstance(error, ProxyConnectionError) or "proxy" in error_str or "Proxy" in error_type:
            return ErrorInfo(
                error=error,
                category=ErrorCategory.PROXY_ERROR,
                message=f"Proxy connection error: {str(error)}",
                retryable=True,
                recovery_action=RecoveryAction.ROTATE_PROXY,
                wait_seconds=5.0,
                max_retries=3,
                context=context or {}
            )
        
        # 连接错误
        if isinstance(error, PyrogramConnectionError) or "connection" in error_str or "Connection" in error_type:
            return ErrorInfo(
                error=error,
                category=ErrorCategory.CONNECTION_ERROR,
                message=f"Connection error: {str(error)}",
                retryable=True,
                recovery_action=RecoveryAction.RECONNECT,
                wait_seconds=10.0,
                max_retries=3,
                context=context or {}
            )
        
        # 认证错误
        if isinstance(error, (AuthKeyUnregistered, UserDeactivated, UserBanned)):
            return ErrorInfo(
                error=error,
                category=ErrorCategory.AUTH_ERROR,
                message=f"Authentication error: {str(error)}",
                retryable=False,
                recovery_action=RecoveryAction.FAIL,
                wait_seconds=0.0,
                max_retries=0,
                context=context or {}
            )
        
        # 2FA 错误
        if isinstance(error, (PasswordHashInvalid, BadRequest)) and ("password" in error_str or "2fa" in error_str):
            return ErrorInfo(
                error=error,
                category=ErrorCategory.AUTH_ERROR,
                message=f"2FA authentication error: {str(error)}",
                retryable=False,
                recovery_action=RecoveryAction.FAIL,
                wait_seconds=0.0,
                max_retries=0,
                context=context or {}
            )
        
        # 验证码错误
        if isinstance(error, PhoneCodeInvalid):
            return ErrorInfo(
                error=error,
                category=ErrorCategory.AUTH_ERROR,
                message="Invalid verification code",
                retryable=False,
                recovery_action=RecoveryAction.FAIL,
                wait_seconds=0.0,
                max_retries=0,
                context=context or {}
            )
        
        # RPC 错误（临时错误）
        if isinstance(error, RPCError):
            error_code = getattr(error, 'code', None)
            # 临时错误（500, 502, 503, 504, 429）
            retryable_codes = [500, 502, 503, 504, 429]
            if error_code in retryable_codes:
                return ErrorInfo(
                    error=error,
                    category=ErrorCategory.TEMPORARY_ERROR,
                    message=f"Temporary RPC error (code {error_code}): {str(error)}",
                    retryable=True,
                    recovery_action=RecoveryAction.RETRY,
                    wait_seconds=self._calculate_exponential_backoff(0),
                    max_retries=3,
                    context=context or {}
                )
            else:
                # 永久错误
                return ErrorInfo(
                    error=error,
                    category=ErrorCategory.PERMANENT_ERROR,
                    message=f"Permanent RPC error (code {error_code}): {str(error)}",
                    retryable=False,
                    recovery_action=RecoveryAction.FAIL,
                    wait_seconds=0.0,
                    max_retries=0,
                    context=context or {}
                )
        
        # 未知错误（默认重试）
        return ErrorInfo(
            error=error,
            category=ErrorCategory.UNKNOWN_ERROR,
            message=f"Unknown error: {str(error)}",
            retryable=True,
            recovery_action=RecoveryAction.RETRY,
            wait_seconds=self._calculate_exponential_backoff(0),
            max_retries=2,
            context=context or {}
        )
    
    def _calculate_exponential_backoff(self, attempt: int) -> float:
        """计算指数退避延迟"""
        delay = self.base_retry_delay * (2 ** attempt)
        return min(delay, self.max_retry_delay)
    
    async def handle_error(
        self,
        account_id: str,
        phone: str,
        error: Exception,
        attempt: int = 0,
        context: Optional[Dict[str, Any]] = None
    ) -> RecoveryResult:
        """
        处理错误并执行恢复动作
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            error: 异常对象
            attempt: 当前尝试次数
            context: 上下文信息
        
        Returns:
            恢复结果
        """
        # 分类错误
        error_info = self.classify_error(error, context)
        
        # 记录错误历史
        if account_id not in self.error_history:
            self.error_history[account_id] = deque(maxlen=100)
        self.error_history[account_id].append(error_info)
        
        # 检查是否超过最大重试次数
        if attempt >= error_info.max_retries:
            return RecoveryResult(
                success=False,
                action_taken=RecoveryAction.FAIL,
                message=f"Max retries ({error_info.max_retries}) exceeded",
                should_retry=False,
                details={"error_info": error_info}
            )
        
        # 检查是否可重试
        if not error_info.retryable:
            return RecoveryResult(
                success=False,
                action_taken=RecoveryAction.FAIL,
                message=f"Error is not retryable: {error_info.message}",
                should_retry=False,
                details={"error_info": error_info}
            )
        
        # 执行恢复动作
        recovery_result = await self._execute_recovery_action(
            account_id=account_id,
            phone=phone,
            error_info=error_info,
            attempt=attempt
        )
        
        return recovery_result
    
    async def _execute_recovery_action(
        self,
        account_id: str,
        phone: str,
        error_info: ErrorInfo,
        attempt: int
    ) -> RecoveryResult:
        """
        执行恢复动作
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            error_info: 错误信息
            attempt: 当前尝试次数
        
        Returns:
            恢复结果
        """
        action = error_info.recovery_action
        
        if action == RecoveryAction.WAIT:
            # 等待指定时间
            wait_time = error_info.wait_seconds
            return RecoveryResult(
                success=True,
                action_taken=RecoveryAction.WAIT,
                message=f"Waiting {wait_time:.1f} seconds before retry",
                retry_after=wait_time,
                should_retry=True,
                details={"error_info": error_info}
            )
        
        elif action == RecoveryAction.RECONNECT:
            # 重新连接
            if self.reconnect_callback:
                try:
                    await self.reconnect_callback(account_id, phone)
                    return RecoveryResult(
                        success=True,
                        action_taken=RecoveryAction.RECONNECT,
                        message="Reconnected successfully",
                        retry_after=self._calculate_exponential_backoff(attempt),
                        should_retry=True,
                        details={"error_info": error_info}
                    )
                except Exception as e:
                    return RecoveryResult(
                        success=False,
                        action_taken=RecoveryAction.RECONNECT,
                        message=f"Reconnect failed: {str(e)}",
                        retry_after=self._calculate_exponential_backoff(attempt),
                        should_retry=attempt < error_info.max_retries,
                        details={"error_info": error_info, "reconnect_error": str(e)}
                    )
            else:
                # 没有重新连接回调，直接重试
                return RecoveryResult(
                    success=True,
                    action_taken=RecoveryAction.RETRY,
                    message="No reconnect callback, retrying directly",
                    retry_after=self._calculate_exponential_backoff(attempt),
                    should_retry=True,
                    details={"error_info": error_info}
                )
        
        elif action == RecoveryAction.ROTATE_PROXY:
            # 切换代理
            if self.rotate_proxy_callback:
                try:
                    new_proxy = await self.rotate_proxy_callback(account_id, phone)
                    if new_proxy:
                        return RecoveryResult(
                            success=True,
                            action_taken=RecoveryAction.ROTATE_PROXY,
                            message=f"Proxy rotated successfully: {new_proxy[:30]}...",
                            retry_after=error_info.wait_seconds,
                            should_retry=True,
                            details={"error_info": error_info, "new_proxy": new_proxy}
                        )
                    else:
                        return RecoveryResult(
                            success=False,
                            action_taken=RecoveryAction.ROTATE_PROXY,
                            message="Proxy rotation failed: No new proxy available",
                            retry_after=self._calculate_exponential_backoff(attempt),
                            should_retry=attempt < error_info.max_retries,
                            details={"error_info": error_info}
                        )
                except Exception as e:
                    return RecoveryResult(
                        success=False,
                        action_taken=RecoveryAction.ROTATE_PROXY,
                        message=f"Proxy rotation failed: {str(e)}",
                        retry_after=self._calculate_exponential_backoff(attempt),
                        should_retry=attempt < error_info.max_retries,
                        details={"error_info": error_info, "rotation_error": str(e)}
                    )
            else:
                # 没有切换代理回调，直接重试
                return RecoveryResult(
                    success=True,
                    action_taken=RecoveryAction.RETRY,
                    message="No proxy rotation callback, retrying directly",
                    retry_after=self._calculate_exponential_backoff(attempt),
                    should_retry=True,
                    details={"error_info": error_info}
                )
        
        elif action == RecoveryAction.RELOGIN:
            # 重新登录
            if self.relogin_callback:
                try:
                    await self.relogin_callback(account_id, phone)
                    return RecoveryResult(
                        success=True,
                        action_taken=RecoveryAction.RELOGIN,
                        message="Relogin successful",
                        retry_after=error_info.wait_seconds,
                        should_retry=True,
                        details={"error_info": error_info}
                    )
                except Exception as e:
                    return RecoveryResult(
                        success=False,
                        action_taken=RecoveryAction.RELOGIN,
                        message=f"Relogin failed: {str(e)}",
                        retry_after=0.0,
                        should_retry=False,
                        details={"error_info": error_info, "relogin_error": str(e)}
                    )
            else:
                # 没有重新登录回调，标记为失败
                return RecoveryResult(
                    success=False,
                    action_taken=RecoveryAction.FAIL,
                    message="No relogin callback available",
                    retry_after=0.0,
                    should_retry=False,
                    details={"error_info": error_info}
                )
        
        elif action == RecoveryAction.RETRY:
            # 直接重试
            return RecoveryResult(
                success=True,
                action_taken=RecoveryAction.RETRY,
                message="Retrying operation",
                retry_after=self._calculate_exponential_backoff(attempt),
                should_retry=True,
                details={"error_info": error_info}
            )
        
        else:
            # 其他动作（SKIP, FAIL）
            return RecoveryResult(
                success=False,
                action_taken=action,
                message=f"Action {action.value} taken, no retry",
                retry_after=0.0,
                should_retry=False,
                details={"error_info": error_info}
            )
    
    def get_error_history(self, account_id: str, limit: int = 50) -> List[ErrorInfo]:
        """获取账户错误历史"""
        history = self.error_history.get(account_id, deque())
        return list(history)[-limit:]
    
    def get_recovery_stats(self, account_id: str) -> Optional[Dict[str, Any]]:
        """获取账户恢复统计"""
        return self.recovery_stats.get(account_id)
    
    def record_recovery_success(self, account_id: str, action: RecoveryAction):
        """记录恢复成功"""
        if account_id not in self.recovery_stats:
            self.recovery_stats[account_id] = {
                "total_recoveries": 0,
                "successful_recoveries": 0,
                "failed_recoveries": 0,
                "actions_taken": {}
            }
        
        stats = self.recovery_stats[account_id]
        stats["total_recoveries"] += 1
        stats["successful_recoveries"] += 1
        stats["actions_taken"][action.value] = stats["actions_taken"].get(action.value, 0) + 1
    
    def record_recovery_failure(self, account_id: str, action: RecoveryAction):
        """记录恢复失败"""
        if account_id not in self.recovery_stats:
            self.recovery_stats[account_id] = {
                "total_recoveries": 0,
                "successful_recoveries": 0,
                "failed_recoveries": 0,
                "actions_taken": {}
            }
        
        stats = self.recovery_stats[account_id]
        stats["total_recoveries"] += 1
        stats["failed_recoveries"] += 1
        stats["actions_taken"][action.value] = stats["actions_taken"].get(action.value, 0) + 1

