"""
TG-Matrix API Handlers
API 處理器模塊

按領域組織的命令處理器
"""

from .system_handlers import register_system_handlers

__all__ = [
    'register_system_handlers',
]
