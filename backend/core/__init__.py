"""
TG-Matrix Core Module
核心基礎設施模塊

提供:
- 事件總線 (模塊間解耦通訊)
- 日誌脫敏 (敏感信息保護)
- 連接池 (資源管理)
- 查詢緩存 (性能優化)
- 錯誤代碼 (統一錯誤處理)
- 備份服務 (數據保護)
- 監控系統 (指標與告警)
- 消息可靠性 (可靠發送)
- 數據完整性 (約束與軟刪除)
- IPC 安全 (通訊簽名)
- 帳號調度 (智能選擇)
- 告警通知 (多渠道)
"""

from .event_bus import EventBus, get_event_bus, init_event_bus
from .logging import SecureLogger, mask_phone, mask_sensitive, get_logger
from .connection_pool import (
    ConnectionPool, 
    ConnectionPoolManager, 
    get_pool_manager,
    ConnectionState,
    PooledConnection
)
from .cache import (
    LRUCache,
    CacheManager,
    get_cache_manager,
    cached,
    CacheEntry
)
from .security import (
    InputValidator,
    ValidationError,
    RateLimiter,
    RateLimitRule,
    DataEncryption,
    APIAuthenticator,
    APIToken,
    get_rate_limiter,
    get_authenticator,
    get_encryption,
    rate_limited,
    require_permission,
    validate_input
)
from .apm import (
    APMService,
    Span,
    MetricsCollector,
    get_apm,
    trace,
    measure_time
)
from .error_codes import (
    ErrorCode,
    ErrorInfo,
    ERROR_INFO_MAP,
    get_error_info,
    create_error_response
)
from .backup_service import (
    BackupType,
    BackupStatus,
    BackupRecord,
    BackupConfig,
    BackupService,
    init_backup_service,
    get_backup_service
)
from .metrics import (
    MetricType,
    HealthStatus,
    AlertSeverity,
    Metric,
    HealthCheck,
    AlertRule,
    Alert,
    MetricsCollector as SystemMetricsCollector,
    HealthChecker,
    AlertManager,
    MonitoringService,
    init_monitoring,
    get_monitoring
)
from .message_reliability import (
    MessageStatus,
    MessagePriority,
    MessageStatusChange,
    ReliableMessage,
    RetryStrategy,
    MessageStateMachine,
    MessageReliabilityService,
    init_message_reliability,
    get_message_reliability
)
# data_integrity 模塊已移除 - 功能未被使用
from .ipc_security import (
    IPCSecurityConfig,
    SignedMessage,
    NonceCache,
    IPCSecurityService,
    init_ipc_security,
    get_ipc_security
)
from .account_scheduler import (
    AccountRole,
    AccountStatus,
    AccountHealth,
    SchedulerConfig,
    AccountScheduler,
    init_account_scheduler,
    get_account_scheduler
)
# alert_notifier 模塊已移除 - 功能未被使用
# audit_log 模塊已移除 - 功能未被使用
from .ai_context import (
    IntentCategory,
    SentimentType,
    ConversationTurn,
    UserProfile,
    ConversationContext,
    IntentRecognizer,
    SentimentAnalyzer,
    ContextManager,
    init_context_manager,
    get_context_manager
)
from .di_container import (
    Lifetime,
    ServiceDescriptor,
    Scope,
    DIContainer,
    injectable,
    inject,
    get_container,
    set_container,
    reset_container
)

__all__ = [
    # 事件總線
    'EventBus',
    'get_event_bus', 
    'init_event_bus',
    # 日誌
    'SecureLogger',
    'mask_phone',
    'mask_sensitive',
    'get_logger',
    # 連接池
    'ConnectionPool',
    'ConnectionPoolManager',
    'get_pool_manager',
    'ConnectionState',
    'PooledConnection',
    # 緩存
    'LRUCache',
    'CacheManager',
    'get_cache_manager',
    'cached',
    'CacheEntry',
    # 安全
    'InputValidator',
    'ValidationError',
    'RateLimiter',
    'RateLimitRule',
    'DataEncryption',
    'APIAuthenticator',
    'APIToken',
    'get_rate_limiter',
    'get_authenticator',
    'get_encryption',
    'rate_limited',
    'require_permission',
    'validate_input',
    # APM 性能監控
    'APMService',
    'Span',
    'MetricsCollector',
    'get_apm',
    'trace',
    'measure_time',
    # 錯誤代碼
    'ErrorCode',
    'ErrorInfo',
    'ERROR_INFO_MAP',
    'get_error_info',
    'create_error_response',
    # 備份服務
    'BackupType',
    'BackupStatus',
    'BackupRecord',
    'BackupConfig',
    'BackupService',
    'init_backup_service',
    'get_backup_service',
    # 監控系統
    'MetricType',
    'HealthStatus',
    'AlertSeverity',
    'Metric',
    'HealthCheck',
    'AlertRule',
    'Alert',
    'SystemMetricsCollector',
    'HealthChecker',
    'AlertManager',
    'MonitoringService',
    'init_monitoring',
    'get_monitoring',
    # 消息可靠性
    'MessageStatus',
    'MessagePriority',
    'MessageStatusChange',
    'ReliableMessage',
    'RetryStrategy',
    'MessageStateMachine',
    'MessageReliabilityService',
    'init_message_reliability',
    'get_message_reliability',
    # 數據完整性 - 模塊已移除
    # IPC 安全
    'IPCSecurityConfig',
    'SignedMessage',
    'NonceCache',
    'IPCSecurityService',
    'init_ipc_security',
    'get_ipc_security',
    # 帳號調度
    'AccountRole',
    'AccountStatus',
    'AccountHealth',
    'SchedulerConfig',
    'AccountScheduler',
    'init_account_scheduler',
    'get_account_scheduler',
    # 告警通知 - 模塊已移除
    # 審計日誌 - 模塊已移除
    # AI 上下文
    'IntentCategory',
    'SentimentType',
    'ConversationTurn',
    'UserProfile',
    'ConversationContext',
    'IntentRecognizer',
    'SentimentAnalyzer',
    'ContextManager',
    'init_context_manager',
    'get_context_manager',
    # 依賴注入
    'Lifetime',
    'ServiceDescriptor',
    'Scope',
    'DIContainer',
    'injectable',
    'inject',
    'get_container',
    'set_container',
    'reset_container',
]
