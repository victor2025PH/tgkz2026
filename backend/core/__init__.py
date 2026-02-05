"""
TG-Matrix 核心模組

包含：
- 多租戶上下文管理
- 使用量追蹤
- 郵件服務
- 支付服務
- 數據導出
- 系統監控

🆕 v2.0 更新：
- 統一表定義（tenant_schema）
- 異常類型（tenant_exceptions）
- 增強的備份與回滾
"""

from .tenant_context import (
    TenantContext,
    get_current_tenant,
    set_current_tenant,
    clear_current_tenant,
    get_user_id,
    require_tenant,
    tenant_query,
    TenantAwareQuery,
    # 🆕 數據庫級隔離支持
    get_tenant_connection,
    get_system_connection,
    get_connection_for_table
)

# 🆕 統一表定義（唯一數據源）
from .tenant_schema import (
    TENANT_TABLES,
    SYSTEM_TABLES,
    SCHEMA_VERSION,
    TableCategory,
    is_tenant_table,
    is_system_table,
    get_table_category,
    get_all_tables,
    get_critical_tables,
    TENANT_DB_SCHEMA,
    SYSTEM_DB_SCHEMA
)

# 🆕 異常類型
from .tenant_exceptions import (
    TenantError,
    TenantConnectionError,
    TenantContextError,
    TenantNotFoundError,
    TenantNotAuthenticatedError,
    MigrationError,
    MigrationInProgressError,
    MigrationValidationError,
    MigrationRollbackError,
    BackupError,
    RestoreError,
    QuotaExceededError,
    FeatureNotAvailableError,
    ConnectionPoolExhaustedError
)

# 多租戶數據庫管理
from .tenant_database import (
    TenantDatabaseManager,
    get_tenant_db_manager,
    LOCAL_USER_ID,
    TENANTS_DIR,
    BACKUPS_DIR
)

# 🆕 數據庫操作輔助
from .db_operations import (
    TenantDB,
    QueryBuilder,
    get_tenant_db
)

# 🆕 多租戶初始化
from .tenant_init import (
    initialize_tenant_system,
    check_migration_needed,
    get_tenant_system_status,
    get_database_connection
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

from .realtime import (
    RealtimeService,
    get_realtime_service,
    notify_user,
    broadcast_event,
    EventType
)

from .level_config import (
    MembershipLevel,
    QuotaType,
    QuotaConfig,
    PriceConfig,
    LevelConfig,
    LevelConfigService,
    get_level_config_service,
    get_subscription_tiers,
    get_user_quota,
    check_user_quota,
    has_user_feature
)

from .quota_service import (
    QuotaService,
    QuotaStatus,
    QuotaAction,
    QuotaCheckResult,
    QuotaUsageSummary,
    QuotaExceededException,
    get_quota_service,
    require_quota
)

from .scheduler import (
    TaskScheduler,
    ScheduledTask,
    TaskStatus,
    get_scheduler,
    start_scheduler,
    stop_scheduler
)

from .billing_service import (
    BillingService,
    BillingType,
    BillStatus,
    QuotaPackType,
    QuotaPack,
    OverageRate,
    BillingItem,
    UserQuotaPackage,
    QUOTA_PACKS,
    OVERAGE_RATES,
    get_billing_service
)

from .unified_payment import (
    UnifiedPaymentService,
    PaymentProvider,
    PaymentType,
    PaymentState,
    PaymentIntent,
    Invoice,
    InvoiceStatus,
    ProviderConfig,
    get_unified_payment_service
)

from .subscription_manager import (
    SubscriptionManager,
    SubscriptionAction,
    SubscriptionState,
    SubscriptionChange,
    UserSubscription,
    get_subscription_manager
)

from .coupon_service import (
    CouponService,
    CouponType,
    CouponStatus,
    Coupon,
    CouponUsage,
    Campaign,
    get_coupon_service
)

from .referral_service import (
    ReferralService,
    RewardType,
    ReferralStatus,
    Referral,
    Commission,
    get_referral_service
)

from .analytics_service import (
    AnalyticsService,
    MetricType,
    get_analytics_service
)

from .notification_service import (
    NotificationService,
    NotificationType,
    NotificationChannel,
    NotificationPriority,
    Notification,
    NotificationPreference,
    NOTIFICATION_TEMPLATES,
    get_notification_service
)

from .i18n_service import (
    I18nService,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    get_i18n_service,
    t
)

from .timezone_service import (
    TimezoneService,
    COMMON_TIMEZONES,
    DEFAULT_TIMEZONE,
    UserTimezoneSettings,
    get_timezone_service
)

from .cache_service import (
    CacheService,
    CacheConfig,
    CacheLevel,
    LRUCache,
    cached,
    get_cache_service
)

from .message_queue import (
    MessageQueue,
    TaskPriority,
    TaskStatus,
    QueueTask,
    get_message_queue
)

from .health_service import (
    HealthService,
    HealthStatus,
    HealthCheck,
    ServiceHealth,
    CircuitBreaker,
    CircuitState,
    CircuitBreakerOpenError,
    circuit_breaker,
    get_health_service
)

from .rate_limiter import (
    RateLimiter,
    RateLimitScope,
    RateLimitRule,
    RateLimitResult,
    get_rate_limiter
)

from .security_service import (
    SecurityService,
    SignatureAlgorithm,
    SENSITIVE_FIELDS,
    get_security_service
)

# 容錯：audit_service 若導入失敗（如 Docker 環境），使用樁以保證後端能啟動
try:
    from .audit_service import (
        AuditService,
        AuditCategory,
        AuditAction,
        AuditSeverity,
        AuditLog,
        get_audit_service
    )
except Exception as _audit_err:
    import sys
    from enum import Enum
    from typing import Any
    import logging
    _log = logging.getLogger(__name__)
    _log.warning("core.audit_service import failed, using stubs: %s", _audit_err)
    class AuditCategory(Enum):
        AUTH = "auth"
        USER = "user"
        LICENSE = "license"
        ORDER = "order"
        SYSTEM = "system"
        NOTIFICATION = "notification"
    class AuditSeverity(Enum):
        INFO = "info"
        WARNING = "warning"
        ERROR = "error"
        CRITICAL = "critical"
    class AuditAction(Enum):
        API_ADD = "api.add"
        ACCOUNT_LOGIN = "account.login"
        USER_LOGIN = "user.login"
    class AuditLog:
        pass
    class _StubAuditService:
        async def log(self, *args: Any, **kwargs: Any) -> Any:
            return None
        def log_admin_action(self, *args: Any, **kwargs: Any) -> None:
            pass
    _stub_audit = _StubAuditService()
    def get_audit_service():
        return _stub_audit
    AuditService = type(_stub_audit)
    _stub_mod = type(sys)("core.audit_service")
    _stub_mod.AuditCategory = AuditCategory
    _stub_mod.AuditAction = AuditAction
    _stub_mod.AuditSeverity = AuditSeverity
    _stub_mod.AuditLog = AuditLog
    _stub_mod.AuditService = AuditService
    _stub_mod.get_audit_service = get_audit_service
    sys.modules["core.audit_service"] = _stub_mod

from .security_alert import (
    SecurityAlertService,
    AlertType,
    AlertSeverity,
    AlertStatus,
    SecurityAlert,
    get_security_alert_service
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
    'get_tenant_connection',
    'get_system_connection',
    'get_connection_for_table',
    
    # 🆕 統一表定義
    'TENANT_TABLES',
    'SYSTEM_TABLES',
    'SCHEMA_VERSION',
    'TableCategory',
    'is_tenant_table',
    'is_system_table',
    'get_table_category',
    'get_all_tables',
    'get_critical_tables',
    'TENANT_DB_SCHEMA',
    'SYSTEM_DB_SCHEMA',
    
    # 🆕 異常類型
    'TenantError',
    'TenantConnectionError',
    'TenantContextError',
    'TenantNotFoundError',
    'TenantNotAuthenticatedError',
    'MigrationError',
    'MigrationInProgressError',
    'MigrationValidationError',
    'MigrationRollbackError',
    'BackupError',
    'RestoreError',
    'QuotaExceededError',
    'FeatureNotAvailableError',
    'ConnectionPoolExhaustedError',
    
    # 多租戶數據庫管理
    'TenantDatabaseManager',
    'get_tenant_db_manager',
    'LOCAL_USER_ID',
    'TENANTS_DIR',
    'BACKUPS_DIR',
    
    # 🆕 數據庫操作輔助
    'TenantDB',
    'QueryBuilder',
    'get_tenant_db',
    
    # 多租戶初始化
    'initialize_tenant_system',
    'check_migration_needed',
    'get_tenant_system_status',
    'get_database_connection',
    
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
    'Alert',
    
    # 實時通知
    'RealtimeService',
    'get_realtime_service',
    'notify_user',
    'broadcast_event',
    'EventType',
    
    # 等級配置
    'MembershipLevel',
    'QuotaType',
    'QuotaConfig',
    'PriceConfig',
    'LevelConfig',
    'LevelConfigService',
    'get_level_config_service',
    'get_subscription_tiers',
    'get_user_quota',
    'check_user_quota',
    'has_user_feature',
    
    # 配額服務
    'QuotaService',
    'QuotaStatus',
    'QuotaAction',
    'QuotaCheckResult',
    'QuotaUsageSummary',
    'QuotaExceededException',
    'get_quota_service',
    'require_quota',
    
    # 定時任務調度
    'TaskScheduler',
    'ScheduledTask',
    'TaskStatus',
    'get_scheduler',
    'start_scheduler',
    'stop_scheduler',
    
    # 計費服務
    'BillingService',
    'BillingType',
    'BillStatus',
    'QuotaPackType',
    'QuotaPack',
    'OverageRate',
    'BillingItem',
    'UserQuotaPackage',
    'QUOTA_PACKS',
    'OVERAGE_RATES',
    'get_billing_service',
    
    # 統一支付
    'UnifiedPaymentService',
    'PaymentProvider',
    'PaymentType',
    'PaymentState',
    'PaymentIntent',
    'Invoice',
    'InvoiceStatus',
    'ProviderConfig',
    'get_unified_payment_service',
    
    # 訂閱管理
    'SubscriptionManager',
    'SubscriptionAction',
    'SubscriptionState',
    'SubscriptionChange',
    'UserSubscription',
    'get_subscription_manager',
    
    # 優惠券
    'CouponService',
    'CouponType',
    'CouponStatus',
    'Coupon',
    'CouponUsage',
    'Campaign',
    'get_coupon_service',
    
    # 推薦獎勵
    'ReferralService',
    'RewardType',
    'ReferralStatus',
    'Referral',
    'Commission',
    'get_referral_service',
    
    # 數據分析
    'AnalyticsService',
    'MetricType',
    'get_analytics_service',
    
    # 通知中心
    'NotificationService',
    'NotificationType',
    'NotificationChannel',
    'NotificationPriority',
    'Notification',
    'NotificationPreference',
    'NOTIFICATION_TEMPLATES',
    'get_notification_service',
    
    # 國際化
    'I18nService',
    'SUPPORTED_LANGUAGES',
    'DEFAULT_LANGUAGE',
    'get_i18n_service',
    't',
    
    # 時區
    'TimezoneService',
    'COMMON_TIMEZONES',
    'DEFAULT_TIMEZONE',
    'UserTimezoneSettings',
    'get_timezone_service',
    
    # 緩存
    'CacheService',
    'CacheConfig',
    'CacheLevel',
    'LRUCache',
    'cached',
    'get_cache_service',
    
    # 消息隊列
    'MessageQueue',
    'TaskPriority',
    'TaskStatus',
    'QueueTask',
    'get_message_queue',
    
    # 健康檢查
    'HealthService',
    'HealthStatus',
    'HealthCheck',
    'ServiceHealth',
    'CircuitBreaker',
    'CircuitState',
    'CircuitBreakerOpenError',
    'circuit_breaker',
    'get_health_service',
    
    # 速率限制
    'RateLimiter',
    'RateLimitScope',
    'RateLimitRule',
    'RateLimitResult',
    'get_rate_limiter',
    
    # 安全服務
    'SecurityService',
    'SignatureAlgorithm',
    'SENSITIVE_FIELDS',
    'get_security_service',
    
    # 審計服務
    'AuditService',
    'AuditCategory',
    'AuditAction',
    'AuditSeverity',
    'AuditLog',
    'get_audit_service',
    
    # 安全告警
    'SecurityAlertService',
    'AlertType',
    'AlertSeverity',
    'AlertStatus',
    'SecurityAlert',
    'get_security_alert_service'
]
