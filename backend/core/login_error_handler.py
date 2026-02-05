"""
登录错误处理器

功能：
1. 错误分类和识别
2. 智能重试策略
3. 用户友好的错误消息
4. 自动恢复建议
"""

import sys
import time
import re
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """错误类别"""
    # 可重试错误
    NETWORK = "network"                 # 网络错误
    TIMEOUT = "timeout"                 # 超时
    RATE_LIMIT = "rate_limit"           # 频率限制
    SERVER_ERROR = "server_error"       # 服务器错误
    
    # 需要用户操作
    PHONE_INVALID = "phone_invalid"     # 手机号无效
    CODE_INVALID = "code_invalid"       # 验证码错误
    CODE_EXPIRED = "code_expired"       # 验证码过期
    PASSWORD_INVALID = "password_invalid"  # 密码错误
    PHONE_BANNED = "phone_banned"       # 手机号被封
    
    # API 相关
    API_INVALID = "api_invalid"         # API 凭据无效
    API_DISABLED = "api_disabled"       # API 被禁用
    API_FLOOD = "api_flood"             # API 频率限制
    
    # 账号相关
    ACCOUNT_BANNED = "account_banned"   # 账号被封
    SESSION_EXPIRED = "session_expired" # 会话过期
    
    # 未知错误
    UNKNOWN = "unknown"


class RetryStrategy(Enum):
    """重试策略"""
    NO_RETRY = "no_retry"               # 不重试
    IMMEDIATE = "immediate"             # 立即重试
    EXPONENTIAL = "exponential"         # 指数退避
    FIXED_DELAY = "fixed_delay"         # 固定延迟
    SWITCH_API = "switch_api"           # 切换 API 重试


@dataclass
class ErrorInfo:
    """错误信息"""
    category: ErrorCategory
    original_error: str
    user_message: str
    suggestion: str
    retry_strategy: RetryStrategy
    retry_delay: int = 0                # 重试延迟（秒）
    max_retries: int = 0                # 最大重试次数
    should_switch_api: bool = False     # 是否应该切换 API
    is_user_error: bool = False         # 是否是用户操作错误
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'category': self.category.value,
            'original_error': self.original_error,
            'user_message': self.user_message,
            'suggestion': self.suggestion,
            'retry_strategy': self.retry_strategy.value,
            'retry_delay': self.retry_delay,
            'max_retries': self.max_retries,
            'should_switch_api': self.should_switch_api,
            'is_user_error': self.is_user_error
        }


# 错误模式匹配规则
ERROR_PATTERNS: List[Tuple[str, ErrorCategory, str, str, RetryStrategy, int, int, bool]] = [
    # (pattern, category, user_message, suggestion, strategy, delay, max_retries, switch_api)
    
    # 网络错误
    (r"connection.*reset|connection.*refused|network.*unreachable",
     ErrorCategory.NETWORK,
     "网络连接失败",
     "请检查网络连接后重试",
     RetryStrategy.EXPONENTIAL, 5, 3, False),
    
    (r"timeout|timed? out",
     ErrorCategory.TIMEOUT,
     "请求超时",
     "服务响应较慢，请稍后重试",
     RetryStrategy.EXPONENTIAL, 10, 3, False),
    
    # 频率限制
    (r"flood.*wait|too many requests|rate limit|429",
     ErrorCategory.RATE_LIMIT,
     "请求过于频繁",
     "请等待一段时间后再试",
     RetryStrategy.FIXED_DELAY, 60, 1, True),
    
    (r"wait.*(\d+).*second|retry.*after.*(\d+)",
     ErrorCategory.RATE_LIMIT,
     "请求过于频繁",
     "请等待后重试",
     RetryStrategy.FIXED_DELAY, 0, 1, False),  # delay 从错误消息提取
    
    # 手机号相关
    (r"phone.*invalid|invalid.*phone|phone.*number.*incorrect",
     ErrorCategory.PHONE_INVALID,
     "手机号格式不正确",
     "请确认手机号码格式，需要包含国家代码（如 +86）",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    (r"phone.*banned|phone.*deactivated",
     ErrorCategory.PHONE_BANNED,
     "该手机号已被 Telegram 封禁",
     "请使用其他手机号或联系 Telegram 客服",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    # 验证码相关
    (r"code.*invalid|invalid.*code|wrong.*code",
     ErrorCategory.CODE_INVALID,
     "验证码错误",
     "请检查验证码是否正确",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    (r"code.*expired|code.*timeout",
     ErrorCategory.CODE_EXPIRED,
     "验证码已过期",
     "请点击重新发送验证码",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    # 密码相关
    (r"password.*invalid|wrong.*password|incorrect.*password",
     ErrorCategory.PASSWORD_INVALID,
     "两步验证密码错误",
     "请检查密码是否正确",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    # API 相关
    (r"api.*id.*invalid|invalid.*api.*id|api.*id.*not.*found",
     ErrorCategory.API_INVALID,
     "API ID 无效",
     "请检查 API 凭据是否正确",
     RetryStrategy.SWITCH_API, 0, 1, True),
    
    (r"api.*hash.*invalid|invalid.*api.*hash",
     ErrorCategory.API_INVALID,
     "API Hash 无效",
     "请检查 API 凭据是否正确",
     RetryStrategy.SWITCH_API, 0, 1, True),
    
    (r"api.*disabled|api.*revoked",
     ErrorCategory.API_DISABLED,
     "API 已被禁用",
     "请使用其他 API 或重新申请",
     RetryStrategy.SWITCH_API, 0, 1, True),
    
    # 账号相关
    (r"account.*banned|user.*banned|session.*revoked",
     ErrorCategory.ACCOUNT_BANNED,
     "账号已被封禁",
     "该账号可能因违规被封禁，请联系 Telegram 客服",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    (r"session.*expired|auth.*key.*duplicated|logout",
     ErrorCategory.SESSION_EXPIRED,
     "会话已过期",
     "请重新登录",
     RetryStrategy.NO_RETRY, 0, 0, False),
    
    # 服务器错误
    (r"internal.*error|server.*error|500|502|503",
     ErrorCategory.SERVER_ERROR,
     "服务器暂时不可用",
     "请稍后重试",
     RetryStrategy.EXPONENTIAL, 10, 3, False),
]


class LoginErrorHandler:
    """
    登录错误处理器
    
    职责：
    1. 解析和分类错误
    2. 提供用户友好的错误信息
    3. 建议重试策略
    """
    
    def __init__(self):
        # 重试计数器
        self._retry_counts: Dict[str, int] = {}
        
        # 错误历史
        self._error_history: List[Dict[str, Any]] = []
        self._max_history = 100
        
        print("[LoginErrorHandler] 初始化登录错误处理器", file=sys.stderr)
    
    def analyze(self, error: str, phone: str = "") -> ErrorInfo:
        """
        分析错误并返回处理建议
        
        Args:
            error: 错误消息
            phone: 手机号（用于跟踪重试）
        
        Returns:
            ErrorInfo 错误信息
        """
        error_lower = error.lower()
        
        # 匹配错误模式
        for pattern, category, user_msg, suggestion, strategy, delay, max_retries, switch_api in ERROR_PATTERNS:
            match = re.search(pattern, error_lower)
            if match:
                # 特殊处理：从错误消息提取等待时间
                actual_delay = delay
                if delay == 0 and match.groups():
                    try:
                        actual_delay = int(match.group(1))
                    except (ValueError, IndexError):
                        actual_delay = 60
                
                error_info = ErrorInfo(
                    category=category,
                    original_error=error,
                    user_message=user_msg,
                    suggestion=suggestion,
                    retry_strategy=strategy,
                    retry_delay=actual_delay,
                    max_retries=max_retries,
                    should_switch_api=switch_api,
                    is_user_error=category in [
                        ErrorCategory.PHONE_INVALID,
                        ErrorCategory.CODE_INVALID,
                        ErrorCategory.CODE_EXPIRED,
                        ErrorCategory.PASSWORD_INVALID
                    ]
                )
                
                # 记录历史
                self._record_error(phone, error_info)
                
                return error_info
        
        # 未匹配到的错误
        return ErrorInfo(
            category=ErrorCategory.UNKNOWN,
            original_error=error,
            user_message="登录失败",
            suggestion="请稍后重试，如果问题持续请联系客服",
            retry_strategy=RetryStrategy.EXPONENTIAL,
            retry_delay=10,
            max_retries=2,
            should_switch_api=False,
            is_user_error=False
        )
    
    def should_retry(self, phone: str, error_info: ErrorInfo) -> bool:
        """
        判断是否应该重试
        
        Args:
            phone: 手机号
            error_info: 错误信息
        
        Returns:
            是否应该重试
        """
        if error_info.retry_strategy == RetryStrategy.NO_RETRY:
            return False
        
        # 检查重试次数
        retry_key = f"{phone}:{error_info.category.value}"
        current_retries = self._retry_counts.get(retry_key, 0)
        
        if current_retries >= error_info.max_retries:
            return False
        
        # 增加重试计数
        self._retry_counts[retry_key] = current_retries + 1
        
        return True
    
    def get_retry_delay(self, phone: str, error_info: ErrorInfo) -> int:
        """
        获取重试延迟
        
        Args:
            phone: 手机号
            error_info: 错误信息
        
        Returns:
            延迟秒数
        """
        retry_key = f"{phone}:{error_info.category.value}"
        current_retries = self._retry_counts.get(retry_key, 0)
        
        if error_info.retry_strategy == RetryStrategy.EXPONENTIAL:
            # 指数退避：5, 10, 20, 40...
            return error_info.retry_delay * (2 ** current_retries)
        elif error_info.retry_strategy == RetryStrategy.FIXED_DELAY:
            return error_info.retry_delay
        else:
            return 0
    
    def reset_retries(self, phone: str) -> None:
        """重置重试计数"""
        keys_to_remove = [k for k in self._retry_counts if k.startswith(f"{phone}:")]
        for key in keys_to_remove:
            del self._retry_counts[key]
    
    def _record_error(self, phone: str, error_info: ErrorInfo) -> None:
        """记录错误历史"""
        record = {
            'phone': phone,
            'error': error_info.to_dict(),
            'timestamp': time.time()
        }
        
        self._error_history.append(record)
        
        if len(self._error_history) > self._max_history:
            self._error_history = self._error_history[-self._max_history:]
    
    def get_error_stats(self) -> Dict[str, Any]:
        """获取错误统计"""
        stats = {cat.value: 0 for cat in ErrorCategory}
        
        for record in self._error_history:
            category = record['error']['category']
            stats[category] = stats.get(category, 0) + 1
        
        return {
            'total': len(self._error_history),
            'by_category': stats
        }
    
    def format_error_for_user(self, error_info: ErrorInfo) -> Dict[str, Any]:
        """
        格式化错误信息给用户
        
        Returns:
            用户友好的错误响应
        """
        return {
            'success': False,
            'error': error_info.user_message,
            'suggestion': error_info.suggestion,
            'can_retry': error_info.retry_strategy != RetryStrategy.NO_RETRY,
            'retry_delay': error_info.retry_delay if error_info.retry_strategy != RetryStrategy.NO_RETRY else None,
            'is_user_error': error_info.is_user_error,
            'error_code': error_info.category.value
        }


# ==================== 全局实例 ====================

_error_handler: Optional[LoginErrorHandler] = None


def get_error_handler() -> LoginErrorHandler:
    """获取全局错误处理器"""
    global _error_handler
    if _error_handler is None:
        _error_handler = LoginErrorHandler()
    return _error_handler


def analyze_login_error(error: str, phone: str = "") -> ErrorInfo:
    """分析登录错误（便捷函数）"""
    return get_error_handler().analyze(error, phone)


def format_error_response(error: str, phone: str = "") -> Dict[str, Any]:
    """格式化错误响应（便捷函数）"""
    handler = get_error_handler()
    error_info = handler.analyze(error, phone)
    return handler.format_error_for_user(error_info)
