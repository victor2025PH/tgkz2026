"""
TG-Matrix Error Recovery Service
错误处理和自动恢复服务

设计原则：
1. 统一错误分类和处理策略
2. 自动重试和降级
3. 智能故障检测
4. 恢复策略执行
"""

import asyncio
import time
import sys
from enum import Enum
from typing import Dict, Optional, Any, Callable, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    """错误类别"""
    NETWORK = "network"           # 网络错误
    PROXY = "proxy"               # 代理错误
    AUTH = "auth"                 # 认证错误
    FLOOD_WAIT = "flood_wait"     # 限流错误
    SESSION = "session"           # 会话错误
    BANNED = "banned"             # 封禁错误
    RATE_LIMIT = "rate_limit"     # 速率限制
    SERVER = "server"             # 服务器错误
    CLIENT = "client"             # 客户端错误
    UNKNOWN = "unknown"           # 未知错误


class RecoveryAction(str, Enum):
    """恢复动作"""
    RETRY = "retry"               # 重试
    RETRY_WITH_DELAY = "retry_with_delay"  # 延迟重试
    SWITCH_PROXY = "switch_proxy"  # 切换代理
    RECONNECT = "reconnect"        # 重新连接
    RE_AUTH = "re_auth"            # 重新认证
    COOLDOWN = "cooldown"          # 冷却
    DISABLE = "disable"            # 禁用账号
    NOTIFY = "notify"              # 通知用户
    SKIP = "skip"                  # 跳过
    ESCALATE = "escalate"          # 升级处理


@dataclass
class ErrorContext:
    """错误上下文"""
    phone: str
    error: Exception
    error_str: str
    category: ErrorCategory
    timestamp: float = field(default_factory=time.time)
    retry_count: int = 0
    operation: str = ""
    extra_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'phone': self.phone,
            'error': self.error_str,
            'category': self.category.value,
            'timestamp': self.timestamp,
            'retry_count': self.retry_count,
            'operation': self.operation,
        }


@dataclass
class RecoveryResult:
    """恢复结果"""
    success: bool
    action_taken: RecoveryAction
    message: str
    should_retry: bool = False
    retry_delay: int = 0
    next_action: Optional[RecoveryAction] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'success': self.success,
            'action': self.action_taken.value,
            'message': self.message,
            'should_retry': self.should_retry,
            'retry_delay': self.retry_delay,
        }


class ErrorClassifier:
    """错误分类器"""
    
    # 错误模式映射
    PATTERNS = {
        ErrorCategory.FLOOD_WAIT: [
            "floodwait", "flood_wait", "too many requests", "wait_seconds",
            "slowdown", "please wait"
        ],
        ErrorCategory.BANNED: [
            "banned", "account_banned", "user_deactivated", "auth_key_unregistered",
            "user_banned", "phone_number_banned"
        ],
        ErrorCategory.AUTH: [
            "unauthorized", "auth_key", "session_expired", "session_revoked",
            "invalid_session", "not_authorized", "2fa", "password_required"
        ],
        ErrorCategory.PROXY: [
            "proxy", "socks", "connection refused", "proxy error",
            "tunneling socket", "proxy authentication"
        ],
        ErrorCategory.NETWORK: [
            "timeout", "connection reset", "network unreachable", "dns",
            "connection error", "ssl", "eof", "broken pipe"
        ],
        ErrorCategory.SESSION: [
            "database is locked", "locked", "session", "sqliteexception",
            "peer id invalid"
        ],
        ErrorCategory.RATE_LIMIT: [
            "rate limit", "too fast", "slowmode", "limit exceeded"
        ],
        ErrorCategory.SERVER: [
            "rpc_error", "internal error", "server error", "503", "502"
        ],
    }
    
    @classmethod
    def classify(cls, error: Exception) -> Tuple[ErrorCategory, Dict[str, Any]]:
        """
        分类错误
        
        Returns:
            (错误类别, 额外信息)
        """
        error_str = str(error).lower()
        error_type = type(error).__name__
        extra = {}
        
        # 检查 FloodWait，提取等待时间
        if "floodwait" in error_str or "flood_wait" in error_str:
            # 尝试提取等待秒数
            import re
            match = re.search(r'(\d+)\s*(seconds?|s)', error_str)
            if match:
                extra['wait_seconds'] = int(match.group(1))
            else:
                # 尝试从属性获取
                if hasattr(error, 'value'):
                    extra['wait_seconds'] = getattr(error, 'value', 300)
                elif hasattr(error, 'x'):
                    extra['wait_seconds'] = getattr(error, 'x', 300)
            return ErrorCategory.FLOOD_WAIT, extra
        
        # 检查其他模式
        for category, patterns in cls.PATTERNS.items():
            for pattern in patterns:
                if pattern in error_str or pattern in error_type.lower():
                    return category, extra
        
        return ErrorCategory.UNKNOWN, extra


class RecoveryStrategyManager:
    """恢复策略管理器"""
    
    # 策略配置：错误类别 -> (动作列表, 最大重试, 基础延迟)
    STRATEGIES = {
        ErrorCategory.NETWORK: (
            [RecoveryAction.RETRY, RecoveryAction.RETRY_WITH_DELAY, RecoveryAction.RECONNECT],
            3, 5
        ),
        ErrorCategory.PROXY: (
            [RecoveryAction.SWITCH_PROXY, RecoveryAction.RETRY],
            2, 10
        ),
        ErrorCategory.AUTH: (
            [RecoveryAction.RE_AUTH, RecoveryAction.NOTIFY],
            1, 0
        ),
        ErrorCategory.FLOOD_WAIT: (
            [RecoveryAction.COOLDOWN],
            1, 0
        ),
        ErrorCategory.SESSION: (
            [RecoveryAction.RETRY_WITH_DELAY, RecoveryAction.RECONNECT],
            3, 2
        ),
        ErrorCategory.BANNED: (
            [RecoveryAction.DISABLE, RecoveryAction.NOTIFY],
            0, 0
        ),
        ErrorCategory.RATE_LIMIT: (
            [RecoveryAction.COOLDOWN, RecoveryAction.RETRY_WITH_DELAY],
            2, 60
        ),
        ErrorCategory.SERVER: (
            [RecoveryAction.RETRY_WITH_DELAY, RecoveryAction.SKIP],
            3, 30
        ),
        ErrorCategory.UNKNOWN: (
            [RecoveryAction.RETRY, RecoveryAction.SKIP],
            2, 10
        ),
    }
    
    @classmethod
    def get_strategy(cls, category: ErrorCategory, retry_count: int) -> Tuple[RecoveryAction, int]:
        """
        获取恢复策略
        
        Returns:
            (恢复动作, 延迟秒数)
        """
        actions, max_retry, base_delay = cls.STRATEGIES.get(
            category, 
            ([RecoveryAction.SKIP], 0, 0)
        )
        
        if retry_count >= max_retry:
            # 超过重试次数，使用最后一个动作或跳过
            return actions[-1] if actions else RecoveryAction.SKIP, 0
        
        # 指数退避
        delay = base_delay * (2 ** retry_count)
        
        action_index = min(retry_count, len(actions) - 1)
        return actions[action_index], delay


class ErrorRecoveryService:
    """
    错误恢复服务
    
    职责：
    1. 统一处理所有类型的错误
    2. 根据策略执行恢复动作
    3. 记录错误历史
    4. 通知相关方
    """
    
    def __init__(
        self,
        event_callback: Optional[Callable[[str, Any], None]] = None,
        account_pool: Optional[Any] = None
    ):
        self.event_callback = event_callback
        self.account_pool = account_pool
        
        # 错误历史
        self._error_history: Dict[str, List[ErrorContext]] = {}
        self._max_history_per_account = 50
        
        # 恢复动作处理器
        self._action_handlers: Dict[RecoveryAction, Callable] = {}
        
        # 统计
        self._stats = {
            'total_errors': 0,
            'recovered': 0,
            'failed': 0,
            'by_category': {},
        }
    
    async def handle_error(
        self,
        phone: str,
        error: Exception,
        operation: str = "",
        retry_count: int = 0
    ) -> RecoveryResult:
        """
        处理错误
        
        Args:
            phone: 账号手机号
            error: 错误对象
            operation: 操作名称
            retry_count: 当前重试次数
        
        Returns:
            恢复结果
        """
        error_str = str(error)
        
        # 分类错误
        category, extra = ErrorClassifier.classify(error)
        
        # 创建错误上下文
        context = ErrorContext(
            phone=phone,
            error=error,
            error_str=error_str,
            category=category,
            retry_count=retry_count,
            operation=operation,
            extra_data=extra
        )
        
        # 记录错误
        self._record_error(context)
        
        # 获取恢复策略
        action, delay = RecoveryStrategyManager.get_strategy(category, retry_count)
        
        # 执行恢复动作
        result = await self._execute_recovery(context, action, delay)
        
        # 更新统计
        self._stats['total_errors'] += 1
        self._stats['by_category'][category.value] = \
            self._stats['by_category'].get(category.value, 0) + 1
        
        if result.success:
            self._stats['recovered'] += 1
        else:
            self._stats['failed'] += 1
        
        # 发送事件
        if self.event_callback:
            self.event_callback('error.handled', {
                'phone': phone,
                'category': category.value,
                'action': action.value,
                'success': result.success,
                'message': result.message
            })
        
        print(f"[ErrorRecovery] {phone} | {category.value} | {action.value} | {result.message}", file=sys.stderr)
        
        return result
    
    async def _execute_recovery(
        self,
        context: ErrorContext,
        action: RecoveryAction,
        delay: int
    ) -> RecoveryResult:
        """执行恢复动作"""
        
        if action == RecoveryAction.RETRY:
            return RecoveryResult(
                success=True,
                action_taken=action,
                message="将重试操作",
                should_retry=True,
                retry_delay=0
            )
        
        elif action == RecoveryAction.RETRY_WITH_DELAY:
            return RecoveryResult(
                success=True,
                action_taken=action,
                message=f"将在 {delay} 秒后重试",
                should_retry=True,
                retry_delay=delay
            )
        
        elif action == RecoveryAction.COOLDOWN:
            wait_seconds = context.extra_data.get('wait_seconds', 300)
            
            # 更新账号池状态
            if self.account_pool:
                await self.account_pool.set_cooldown(
                    context.phone, 
                    wait_seconds, 
                    context.error_str[:100]
                )
            
            return RecoveryResult(
                success=True,
                action_taken=action,
                message=f"账号冷却 {wait_seconds} 秒",
                should_retry=False
            )
        
        elif action == RecoveryAction.SWITCH_PROXY:
            # 通知切换代理
            if self.event_callback:
                self.event_callback('account.switch_proxy', {
                    'phone': context.phone,
                    'reason': context.error_str[:100]
                })
            
            return RecoveryResult(
                success=True,
                action_taken=action,
                message="请求切换代理",
                should_retry=True,
                retry_delay=5
            )
        
        elif action == RecoveryAction.RECONNECT:
            if self.event_callback:
                self.event_callback('account.reconnect', {
                    'phone': context.phone
                })
            
            return RecoveryResult(
                success=True,
                action_taken=action,
                message="请求重新连接",
                should_retry=True,
                retry_delay=delay
            )
        
        elif action == RecoveryAction.RE_AUTH:
            if self.account_pool:
                await self.account_pool.update_state(
                    context.phone, 
                    # 需要导入 AccountState
                    "needs_auth"
                )
            
            if self.event_callback:
                self.event_callback('account.needs_auth', {
                    'phone': context.phone,
                    'reason': context.error_str[:100]
                })
            
            return RecoveryResult(
                success=False,
                action_taken=action,
                message="需要重新验证",
                should_retry=False
            )
        
        elif action == RecoveryAction.DISABLE:
            if self.account_pool:
                await self.account_pool.update_state(context.phone, "banned")
            
            if self.event_callback:
                self.event_callback('account.disabled', {
                    'phone': context.phone,
                    'reason': context.error_str[:100]
                })
            
            return RecoveryResult(
                success=False,
                action_taken=action,
                message="账号已禁用",
                should_retry=False
            )
        
        elif action == RecoveryAction.NOTIFY:
            if self.event_callback:
                self.event_callback('account.error', {
                    'phone': context.phone,
                    'category': context.category.value,
                    'error': context.error_str[:200]
                })
            
            return RecoveryResult(
                success=True,
                action_taken=action,
                message="已通知用户",
                should_retry=False
            )
        
        else:  # SKIP or ESCALATE
            return RecoveryResult(
                success=False,
                action_taken=action,
                message="跳过此操作",
                should_retry=False
            )
    
    def _record_error(self, context: ErrorContext):
        """记录错误到历史"""
        phone = context.phone
        
        if phone not in self._error_history:
            self._error_history[phone] = []
        
        self._error_history[phone].append(context)
        
        # 限制历史长度
        if len(self._error_history[phone]) > self._max_history_per_account:
            self._error_history[phone] = self._error_history[phone][-self._max_history_per_account:]
    
    def get_error_history(self, phone: str, limit: int = 10) -> List[Dict[str, Any]]:
        """获取错误历史"""
        history = self._error_history.get(phone, [])
        return [ctx.to_dict() for ctx in history[-limit:]]
    
    def get_stats(self) -> Dict[str, Any]:
        """获取统计信息"""
        return self._stats.copy()
    
    def get_account_health(self, phone: str) -> Dict[str, Any]:
        """获取账号健康状态"""
        history = self._error_history.get(phone, [])
        
        if not history:
            return {
                'phone': phone,
                'error_count_24h': 0,
                'last_error': None,
                'health_score': 100
            }
        
        # 最近24小时的错误
        now = time.time()
        errors_24h = [e for e in history if now - e.timestamp < 86400]
        
        # 计算健康分数
        base_score = 100
        base_score -= len(errors_24h) * 5
        
        # 严重错误额外扣分
        for e in errors_24h:
            if e.category in (ErrorCategory.BANNED, ErrorCategory.AUTH):
                base_score -= 20
            elif e.category == ErrorCategory.FLOOD_WAIT:
                base_score -= 10
        
        return {
            'phone': phone,
            'error_count_24h': len(errors_24h),
            'last_error': history[-1].to_dict() if history else None,
            'health_score': max(0, base_score),
            'categories': {
                cat.value: sum(1 for e in errors_24h if e.category == cat)
                for cat in ErrorCategory
            }
        }


# 全局实例
_recovery_service: Optional[ErrorRecoveryService] = None


def get_error_recovery() -> ErrorRecoveryService:
    """获取全局错误恢复服务"""
    global _recovery_service
    if _recovery_service is None:
        _recovery_service = ErrorRecoveryService()
    return _recovery_service


def init_error_recovery(
    event_callback: Optional[Callable] = None,
    account_pool: Optional[Any] = None
) -> ErrorRecoveryService:
    """初始化错误恢复服务"""
    global _recovery_service
    _recovery_service = ErrorRecoveryService(
        event_callback=event_callback,
        account_pool=account_pool
    )
    return _recovery_service

