"""
TG-Matrix Messaging Domain
消息領域 - 處理所有消息相關操作

包含:
- 消息發送
- 消息隊列
- 消息模板
"""

from .handlers import register_messaging_handlers

__all__ = [
    'register_messaging_handlers',
]
