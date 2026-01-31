"""
TG-Matrix Contacts Domain
客戶領域 - 處理所有客戶/線索相關操作

包含:
- 統一聯繫人模型
- 線索管理
- 漏斗追蹤
- 用戶分析
"""

from .handlers import register_contacts_handlers
from .models import (
    UnifiedContact,
    ContactFilter,
    ContactStats,
    ContactStatus,
    FunnelStage,
    ValueLevel,
    ContactSource
)
from .service import (
    UnifiedContactService,
    init_contact_service,
    get_contact_service
)

__all__ = [
    'register_contacts_handlers',
    # 模型
    'UnifiedContact',
    'ContactFilter',
    'ContactStats',
    'ContactStatus',
    'FunnelStage',
    'ValueLevel',
    'ContactSource',
    # 服務
    'UnifiedContactService',
    'init_contact_service',
    'get_contact_service',
]
