"""
🔧 P12-3: 消息重試策略

功能：
1. 指數退避重試（base * 2^attempt，帶抖動）
2. 可配置的最大重試次數和退避上限
3. 基於錯誤類型的差異化策略
4. 死信隊列（超過最大重試的消息）
"""

import random
import time
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class RetryDecision(str, Enum):
    """重試決策"""
    RETRY = 'retry'           # 稍後重試
    RETRY_NOW = 'retry_now'   # 立即重試（暫時性錯誤）
    DEAD_LETTER = 'dead_letter'  # 放入死信隊列
    DISCARD = 'discard'       # 直接丟棄


@dataclass
class RetryPolicy:
    """重試策略配置"""
    max_retries: int = 3
    base_delay_seconds: float = 60.0      # 初始退避 1 分鐘
    max_delay_seconds: float = 3600.0     # 最大退避 1 小時
    jitter_factor: float = 0.2            # 抖動因子 (±20%)
    backoff_multiplier: float = 2.0       # 退避倍數

    def calculate_delay(self, attempt: int) -> float:
        """
        計算第 N 次重試的延遲

        delay = min(base * multiplier^attempt, max_delay) * (1 ± jitter)
        """
        raw_delay = self.base_delay_seconds * (self.backoff_multiplier ** attempt)
        capped_delay = min(raw_delay, self.max_delay_seconds)

        # 添加抖動
        jitter_range = capped_delay * self.jitter_factor
        jitter = random.uniform(-jitter_range, jitter_range)
        final_delay = max(1.0, capped_delay + jitter)

        return round(final_delay, 1)


# 錯誤類型分類
ERROR_CATEGORIES = {
    # 暫時性錯誤 → 值得重試
    'transient': [
        'FloodWait', 'timeout', 'connection', 'network',
        'temporarily unavailable', 'too many requests', 'rate limit',
        'ConnectionError', 'TimeoutError', 'ServerError',
    ],
    # 永久性錯誤 → 不重試
    'permanent': [
        'UserBlocked', 'UserBannedInChannel', 'ChatWriteForbidden',
        'PeerFlood', 'PHONE_NUMBER_BANNED', 'AUTH_KEY_UNREGISTERED',
        'USER_DEACTIVATED', 'USER_PRIVACY_RESTRICTED',
        'InputUserDeactivated', 'UserNotMutualContact',
    ],
    # 需要人工介入
    'manual': [
        'TWO_STEPS_VERIFICATION', 'SESSION_REVOKED', 'AUTH_KEY_DUPLICATED',
    ],
}


class MessageRetryManager:
    """消息重試管理器"""

    def __init__(self, policy: RetryPolicy = None):
        self.policy = policy or RetryPolicy()

    def should_retry(self, error_message: str, current_retry_count: int) -> tuple:
        """
        判斷是否應該重試

        Args:
            error_message: 錯誤信息
            current_retry_count: 當前已重試次數

        Returns:
            (RetryDecision, delay_seconds, reason)
        """
        error_lower = (error_message or '').lower()

        # 1. 檢查是否永久性錯誤
        for keyword in ERROR_CATEGORIES['permanent']:
            if keyword.lower() in error_lower:
                return (RetryDecision.DEAD_LETTER, 0,
                        f'Permanent error: {keyword}')

        # 2. 檢查是否需要人工介入
        for keyword in ERROR_CATEGORIES['manual']:
            if keyword.lower() in error_lower:
                return (RetryDecision.DEAD_LETTER, 0,
                        f'Manual intervention required: {keyword}')

        # 3. 超過最大重試次數
        if current_retry_count >= self.policy.max_retries:
            return (RetryDecision.DEAD_LETTER, 0,
                    f'Max retries ({self.policy.max_retries}) exceeded')

        # 4. FloodWait 特殊處理（提取等待時間）
        if 'floodwait' in error_lower or 'flood' in error_lower:
            import re
            match = re.search(r'(\d+)\s*(?:seconds?|s)', error_lower)
            if match:
                flood_wait = int(match.group(1))
                return (RetryDecision.RETRY, flood_wait + 5,
                        f'FloodWait: {flood_wait}s + 5s buffer')

        # 5. 暫時性錯誤 → 指數退避重試
        for keyword in ERROR_CATEGORIES['transient']:
            if keyword.lower() in error_lower:
                delay = self.policy.calculate_delay(current_retry_count)
                return (RetryDecision.RETRY, delay,
                        f'Transient error ({keyword}), retry #{current_retry_count + 1}')

        # 6. 未知錯誤 → 保守重試
        if current_retry_count < 2:
            delay = self.policy.calculate_delay(current_retry_count)
            return (RetryDecision.RETRY, delay,
                    f'Unknown error, conservative retry #{current_retry_count + 1}')

        return (RetryDecision.DEAD_LETTER, 0, 'Unknown error after 2 retries')

    def get_retry_schedule(self) -> list:
        """獲取完整的重試時間表（用於展示）"""
        schedule = []
        for attempt in range(self.policy.max_retries):
            delay = self.policy.calculate_delay(attempt)
            schedule.append({
                'attempt': attempt + 1,
                'delay_seconds': delay,
                'delay_human': self._format_delay(delay),
            })
        return schedule

    @staticmethod
    def _format_delay(seconds: float) -> str:
        if seconds < 60:
            return f"{seconds:.0f}s"
        elif seconds < 3600:
            return f"{seconds / 60:.1f}m"
        else:
            return f"{seconds / 3600:.1f}h"


_retry_manager: Optional[MessageRetryManager] = None


def get_retry_manager() -> MessageRetryManager:
    """獲取重試管理器單例"""
    global _retry_manager
    if _retry_manager is None:
        _retry_manager = MessageRetryManager()
    return _retry_manager
