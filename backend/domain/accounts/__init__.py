"""
TG-Matrix Accounts Domain
帳號領域 - 處理所有帳號相關操作

包含:
- 帳號 CRUD
- 登錄/登出
- 狀態管理
- 健康度監控
- 批量操作
"""

from .handlers import register_account_handlers
from .service import AccountService, get_account_service

__all__ = [
    'register_account_handlers',
    'AccountService',
    'get_account_service',
]
