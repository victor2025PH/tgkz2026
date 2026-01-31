"""
TG-Matrix Automation Domain
自動化領域 - 處理所有自動化相關操作

包含:
- 監控管理
- 觸發規則
- 關鍵詞匹配
- 自動化活動
"""

from .handlers import register_automation_handlers

__all__ = [
    'register_automation_handlers',
]
