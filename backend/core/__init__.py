"""
TG-Matrix 核心模組

包含：
- 多租戶上下文管理
- 使用量追蹤
- 郵件服務
- 支付服務
- 數據導出
- 系統監控
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

from .payment_service import (
    PaymentService,
    get_payment_service,
    SUBSCRIPTION_PLANS
)

from .data_export import (
    DataExportService,
    get_export_service,
    ExportOptions,
    BackupInfo
)

from .monitoring import (
    SystemMonitor,
    get_system_monitor,
    SystemMetrics,
    Alert
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
    'EMAIL_TEMPLATES',
    
    # 支付服務
    'PaymentService',
    'get_payment_service',
    'SUBSCRIPTION_PLANS',
    
    # 數據導出
    'DataExportService',
    'get_export_service',
    'ExportOptions',
    'BackupInfo',
    
    # 系統監控
    'SystemMonitor',
    'get_system_monitor',
    'SystemMetrics',
    'Alert'
]
