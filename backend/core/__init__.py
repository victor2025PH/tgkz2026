"""
TG-Matrix 核心模組

包含：
- 多租戶上下文管理
- 使用量追蹤
- 郵件服務
"""

from .tenant_context import (
    TenantContext,
    get_current_tenant,
    set_current_tenant,
    clear_current_tenant,
    get_user_id,
    require_tenant,
    tenant_query,
    TenantAwareQuery
)

from .usage_tracker import (
    UsageStats,
    UsageTracker,
    get_usage_tracker
)

from .email_service import (
    EmailConfig,
    EmailService,
    get_email_service,
    EMAIL_TEMPLATES
)

__all__ = [
    # 租戶上下文
    'TenantContext',
    'get_current_tenant',
    'set_current_tenant',
    'clear_current_tenant',
    'get_user_id',
    'require_tenant',
    'tenant_query',
    'TenantAwareQuery',
    
    # 使用量追蹤
    'UsageStats',
    'UsageTracker',
    'get_usage_tracker',
    
    # 郵件服務
    'EmailConfig',
    'EmailService',
    'get_email_service',
    'EMAIL_TEMPLATES'
]
