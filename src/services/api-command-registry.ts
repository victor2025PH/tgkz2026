/**
 * API 命令註冊表
 * 統一管理所有 IPC 命令到 HTTP API 的映射
 * 
 * 這個註冊表確保：
 * 1. 所有命令都有明確的 HTTP 端點映射
 * 2. 響應事件統一管理
 * 3. 新增命令只需在此註冊
 */

export interface CommandConfig {
  /** IPC 命令名稱 */
  command: string;
  /** HTTP 方法 */
  httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** HTTP 端點路徑（支持路徑參數如 {id}） */
  endpoint: string;
  /** 成功時觸發的事件列表 */
  responseEvents: string[];
  /** 是否需要認證 */
  requiresAuth?: boolean;
  /** 使用通用命令端點而非 RESTful 端點 */
  useCommandEndpoint?: boolean;
}

/**
 * 完整的命令註冊表
 * 按功能模塊分類
 */
export const COMMAND_REGISTRY: CommandConfig[] = [
  // ==================== 用戶認證 (SaaS) ====================
  {
    command: 'user-register',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/register',
    responseEvents: ['user-registered', 'auth-state-changed']
  },
  {
    command: 'user-login',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/login',
    responseEvents: ['user-logged-in', 'auth-state-changed']
  },
  {
    command: 'user-logout',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/logout',
    responseEvents: ['user-logged-out', 'auth-state-changed']
  },
  {
    command: 'user-refresh-token',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/refresh',
    responseEvents: ['token-refreshed']
  },
  {
    command: 'get-current-user',
    httpMethod: 'GET',
    endpoint: '/api/v1/auth/me',
    responseEvents: ['current-user-loaded']
  },
  
  // ==================== OAuth 第三方登入 ====================
  {
    command: 'oauth-telegram',
    httpMethod: 'POST',
    endpoint: '/api/v1/oauth/telegram',
    responseEvents: ['oauth-telegram-success', 'auth-state-changed']
  },
  {
    command: 'oauth-telegram-config',
    httpMethod: 'GET',
    endpoint: '/api/v1/oauth/telegram/config',
    responseEvents: ['oauth-telegram-config-loaded']
  },
  {
    command: 'oauth-google',
    httpMethod: 'POST',
    endpoint: '/api/v1/oauth/google',
    responseEvents: ['oauth-google-success', 'auth-state-changed']
  },
  {
    command: 'oauth-providers',
    httpMethod: 'GET',
    endpoint: '/api/v1/oauth/providers',
    responseEvents: ['oauth-providers-loaded']
  },
  
  // ==================== 郵箱驗證和密碼重置 ====================
  {
    command: 'send-verification-email',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/send-verification',
    responseEvents: ['verification-email-sent'],
    requiresAuth: true
  },
  {
    command: 'verify-email',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/verify-email',
    responseEvents: ['email-verified']
  },
  {
    command: 'verify-email-code',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/verify-email-code',
    responseEvents: ['email-verified']
  },
  {
    command: 'forgot-password',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/forgot-password',
    responseEvents: ['password-reset-requested']
  },
  {
    command: 'reset-password',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/reset-password',
    responseEvents: ['password-reset-completed']
  },
  {
    command: 'reset-password-code',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/reset-password-code',
    responseEvents: ['password-reset-completed']
  },
  {
    command: 'update-current-user',
    httpMethod: 'PUT',
    endpoint: '/api/v1/auth/me',
    responseEvents: ['current-user-updated']
  },
  {
    command: 'change-password',
    httpMethod: 'POST',
    endpoint: '/api/v1/auth/change-password',
    responseEvents: ['password-changed']
  },
  {
    command: 'get-user-sessions',
    httpMethod: 'GET',
    endpoint: '/api/v1/auth/sessions',
    responseEvents: ['sessions-loaded']
  },
  {
    command: 'revoke-session',
    httpMethod: 'DELETE',
    endpoint: '/api/v1/auth/sessions/{id}',
    responseEvents: ['session-revoked']
  },

  // ==================== 帳號管理 ====================
  {
    command: 'get-accounts',
    httpMethod: 'GET',
    endpoint: '/api/v1/accounts',
    responseEvents: ['accounts-updated']
  },
  {
    command: 'add-account',
    httpMethod: 'POST',
    endpoint: '/api/v1/accounts',
    responseEvents: ['login-requires-code', 'login-requires-2fa', 'login-success', 'login-error', 'accounts-updated']
  },
  {
    command: 'login-account',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['login-requires-code', 'login-requires-2fa', 'login-success', 'login-error'],
    useCommandEndpoint: true
  },
  {
    command: 'logout-account',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['logout-result'],
    useCommandEndpoint: true
  },
  {
    command: 'update-account',
    httpMethod: 'PUT',
    endpoint: '/api/v1/accounts/{id}',
    responseEvents: ['account-updated']
  },
  {
    command: 'update-account-data',
    httpMethod: 'PUT',
    endpoint: '/api/v1/accounts/{id}',
    responseEvents: ['account-updated']
  },
  {
    command: 'delete-account',
    httpMethod: 'DELETE',
    endpoint: '/api/v1/accounts/{id}',
    responseEvents: ['account-deleted', 'accounts-updated']
  },
  {
    command: 'remove-account',
    httpMethod: 'DELETE',
    endpoint: '/api/v1/accounts/{id}',
    responseEvents: ['account-deleted', 'accounts-updated']
  },
  {
    command: 'connect-account',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['account-connection-status'],
    useCommandEndpoint: true
  },
  {
    command: 'disconnect-account',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['account-disconnected'],
    useCommandEndpoint: true
  },
  {
    command: 'check-account-status',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['account-status-checked'],
    useCommandEndpoint: true
  },
  {
    command: 'import-session',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['session-imported'],
    useCommandEndpoint: true
  },
  {
    command: 'export-session',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['session-exported'],
    useCommandEndpoint: true
  },
  {
    command: 'bulk-assign-role',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['accounts-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'bulk-delete-accounts',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['accounts-updated'],
    useCommandEndpoint: true
  },

  // ==================== 監控系統 ====================
  {
    command: 'start-monitoring',
    httpMethod: 'POST',
    endpoint: '/api/v1/monitoring/start',
    responseEvents: ['monitoring-started', 'monitoring-status']
  },
  {
    command: 'stop-monitoring',
    httpMethod: 'POST',
    endpoint: '/api/v1/monitoring/stop',
    responseEvents: ['monitoring-stopped', 'monitoring-status']
  },
  {
    command: 'get-monitoring-status',
    httpMethod: 'GET',
    endpoint: '/api/v1/monitoring/status',
    responseEvents: ['monitoring-status']
  },
  {
    command: 'one-click-start',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['one-click-started', 'monitoring-status'],
    useCommandEndpoint: true
  },
  {
    command: 'one-click-stop',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['one-click-stopped', 'monitoring-status'],
    useCommandEndpoint: true
  },
  {
    command: 'get-system-status',
    httpMethod: 'GET',
    endpoint: '/api/v1/system/status',
    responseEvents: ['system-status']
  },

  // ==================== 群組管理 ====================
  {
    command: 'get-monitored-groups',
    httpMethod: 'GET',
    endpoint: '/api/v1/groups',
    responseEvents: ['monitored-groups-updated']
  },
  {
    command: 'add-group',
    httpMethod: 'POST',
    endpoint: '/api/v1/groups',
    responseEvents: ['group-added', 'monitored-groups-updated']
  },
  {
    command: 'remove-group',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-removed', 'monitored-groups-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'join-group',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-joined'],
    useCommandEndpoint: true
  },
  {
    command: 'leave-group',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-left'],
    useCommandEndpoint: true
  },
  {
    command: 'join-and-monitor-with-account',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['join-and-monitor-result', 'monitored-groups-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'join-and-monitor-resource',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['join-and-monitor-result', 'monitored-groups-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-join-and-monitor',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['batch-join-result'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-join-resources',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['batch-join-result'],
    useCommandEndpoint: true
  },

  // ==================== 關鍵詞管理 ====================
  {
    command: 'get-keyword-sets',
    httpMethod: 'GET',
    endpoint: '/api/v1/keywords',
    responseEvents: ['keyword-sets-updated']
  },
  {
    command: 'add-keyword-set',
    httpMethod: 'POST',
    endpoint: '/api/v1/keywords',
    responseEvents: ['keyword-set-added', 'keyword-sets-updated']
  },
  {
    command: 'add-keyword',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['keyword-added'],
    useCommandEndpoint: true
  },
  {
    command: 'remove-keyword',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['keyword-removed'],
    useCommandEndpoint: true
  },

  // ==================== 消息隊列 ====================
  {
    command: 'get-queue-status',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['queue-status'],
    useCommandEndpoint: true
  },
  {
    command: 'get-queue-messages',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['queue-messages'],
    useCommandEndpoint: true
  },
  {
    command: 'clear-queue',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['queue-cleared'],
    useCommandEndpoint: true
  },
  {
    command: 'retry-message',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['message-retried'],
    useCommandEndpoint: true
  },
  {
    command: 'cancel-message',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['message-cancelled'],
    useCommandEndpoint: true
  },
  {
    command: 'pause-queue',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['queue-paused'],
    useCommandEndpoint: true
  },
  {
    command: 'resume-queue',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['queue-resumed'],
    useCommandEndpoint: true
  },
  {
    command: 'send-message',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['message-sent'],
    useCommandEndpoint: true
  },
  {
    command: 'send-group-message',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['message-sent'],
    useCommandEndpoint: true
  },
  {
    command: 'schedule-message',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['message-sent'],
    useCommandEndpoint: true
  },

  // ==================== 線索管理 ====================
  {
    command: 'get-leads',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['leads-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'get-leads-paginated',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['leads-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'add-lead',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['lead-added', 'leads-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'update-lead-status',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['lead-status-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-lead',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['lead-deleted'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-delete-leads',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['leads-batch-deleted'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-update-lead-status',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['leads-status-batch-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'search-leads',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['leads-search-result'],
    useCommandEndpoint: true
  },
  {
    command: 'get-all-tags',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['tags-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'create-tag',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['tag-created', 'tags-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-tag',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['tag-deleted', 'tags-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-add-tag',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['tags-batch-added'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-remove-tag',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['tags-batch-removed'],
    useCommandEndpoint: true
  },
  {
    command: 'add-to-dnc',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['dnc-added'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-add-to-dnc',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['dnc-batch-added'],
    useCommandEndpoint: true
  },

  // ==================== 資源發現 ====================
  {
    command: 'search-resources',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-search-result'],
    useCommandEndpoint: true
  },
  {
    command: 'search-jiso',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-search-result'],
    useCommandEndpoint: true
  },
  {
    command: 'get-resources',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'save-resource',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resource-saved'],
    useCommandEndpoint: true
  },
  {
    command: 'unsave-resource',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resource-unsaved'],
    useCommandEndpoint: true
  },
  {
    command: 'get-resource-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resource-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'clear-all-resources',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-cleared'],
    useCommandEndpoint: true
  },
  {
    command: 'clear-resources',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-cleared'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-resource',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resource-deleted'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-resources-batch',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['resources-batch-deleted'],
    useCommandEndpoint: true
  },

  // ==================== 成員提取 ====================
  {
    command: 'extract-members',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['members-extracted'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-extract-members',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['members-extracted'],
    useCommandEndpoint: true
  },

  // ==================== 歷史消息收集 ====================
  {
    command: 'collect-users-from-history',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['collect-from-history-result'],
    useCommandEndpoint: true
  },
  {
    command: 'collect-users-from-history-advanced',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['history-collection-result'],
    useCommandEndpoint: true
  },
  {
    command: 'get-history-collection-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['history-collection-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'get-group-collected-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-collected-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'get-collected-users-count',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['collected-users-count'],
    useCommandEndpoint: true
  },
  {
    command: 'check-group-monitoring-status',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-monitoring-status'],
    useCommandEndpoint: true
  },

  // ==================== P4：數據導出與管理 ====================
  {
    command: 'export-members',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['members-exported'],
    useCommandEndpoint: true
  },
  {
    command: 'deduplicate-members',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['members-deduplicated'],
    useCommandEndpoint: true
  },
  {
    command: 'batch-tag-members',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['members-tagged'],
    useCommandEndpoint: true
  },
  {
    command: 'get-all-tags',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['all-tags-result'],
    useCommandEndpoint: true
  },
  {
    command: 'get-group-profile',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['group-profile-result'],
    useCommandEndpoint: true
  },
  {
    command: 'compare-groups',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['groups-compared'],
    useCommandEndpoint: true
  },
  {
    command: 'recalculate-scores',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['scores-recalculated'],
    useCommandEndpoint: true
  },
  {
    command: 'get-extraction-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['extraction-stats-result'],
    useCommandEndpoint: true
  },
  {
    command: 'start-background-extraction',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['background-extraction-started'],
    useCommandEndpoint: true
  },
  {
    command: 'get-background-tasks',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['background-tasks-result'],
    useCommandEndpoint: true
  },
  {
    command: 'clear-extraction-cache',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['extraction-cache-cleared'],
    useCommandEndpoint: true
  },

  // ==================== AI 功能 ====================
  {
    command: 'generate-ai-response',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ai-response-generated'],
    useCommandEndpoint: true
  },
  {
    command: 'test-ai-connection',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ai-connection-tested'],
    useCommandEndpoint: true
  },
  {
    command: 'test-local-ai',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['local-ai-tested'],
    useCommandEndpoint: true
  },
  {
    command: 'get-ollama-models',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ollama-models'],
    useCommandEndpoint: true
  },
  {
    command: 'search-rag',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['rag-search-result'],
    useCommandEndpoint: true
  },
  {
    command: 'get-rag-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['rag-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'init-rag-system',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['rag-initialized'],
    useCommandEndpoint: true
  },
  {
    command: 'trigger-rag-learning',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['rag-learning-triggered'],
    useCommandEndpoint: true
  },
  {
    command: 'add-rag-knowledge',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['rag-knowledge-added'],
    useCommandEndpoint: true
  },
  {
    command: 'search-vector-memories',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['vector-memories-result'],
    useCommandEndpoint: true
  },
  {
    command: 'add-vector-memory',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['vector-memory-added'],
    useCommandEndpoint: true
  },
  {
    command: 'get-memory-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['memory-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-vector-memory',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['vector-memory-deleted'],
    useCommandEndpoint: true
  },

  // ==================== 營銷系統 ====================
  {
    command: 'get-ad-templates',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-templates-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'create-ad-template',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-template-created'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-ad-template',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-template-deleted'],
    useCommandEndpoint: true
  },
  {
    command: 'get-ad-schedules',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-schedules-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'get-ad-send-logs',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-send-logs'],
    useCommandEndpoint: true
  },
  {
    command: 'get-ad-overview-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ad-overview-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'get-marketing-stats',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['marketing-stats'],
    useCommandEndpoint: true
  },
  {
    command: 'get-marketing-campaigns',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['marketing-campaigns-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'create-marketing-campaign',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['marketing-campaign-created'],
    useCommandEndpoint: true
  },
  {
    command: 'start-marketing-campaign',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['marketing-campaign-started'],
    useCommandEndpoint: true
  },

  // ==================== 設置 ====================
  {
    command: 'get-settings',
    httpMethod: 'GET',
    endpoint: '/api/v1/settings',
    responseEvents: ['settings-loaded']
  },
  {
    command: 'save-settings',
    httpMethod: 'POST',
    endpoint: '/api/v1/settings',
    responseEvents: ['settings-saved']
  },
  {
    command: 'save-ai-settings',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ai-settings-saved'],
    useCommandEndpoint: true
  },
  {
    command: 'update-ai-chat-settings',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['ai-settings-saved'],
    useCommandEndpoint: true
  },
  {
    command: 'get-initial-state',
    httpMethod: 'GET',
    endpoint: '/api/v1/initial-state',
    responseEvents: ['initial-state', 'initial-state-core', 'initial-state-config', 'initial-state-data', 'accounts-updated']
  },

  // ==================== 備份 ====================
  {
    command: 'list-backups',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['backups-listed'],
    useCommandEndpoint: true
  },
  {
    command: 'create-backup',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['backup-created'],
    useCommandEndpoint: true
  },
  {
    command: 'restore-backup',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['backup-restored'],
    useCommandEndpoint: true
  },
  {
    command: 'delete-backup',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['backup-deleted'],
    useCommandEndpoint: true
  },

  // ==================== 日誌 ====================
  {
    command: 'get-logs',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['logs-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'clear-logs',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['logs-cleared'],
    useCommandEndpoint: true
  },
  {
    command: 'export-logs',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['logs-exported'],
    useCommandEndpoint: true
  },

  // ==================== 告警 ====================
  {
    command: 'get-alerts',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['alerts-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'acknowledge-alert',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['alert-updated'],
    useCommandEndpoint: true
  },
  {
    command: 'resolve-alert',
    httpMethod: 'POST',
    endpoint: '/api/command',
    responseEvents: ['alert-updated'],
    useCommandEndpoint: true
  },

  // ==================== API 憑據 ====================
  {
    command: 'get-api-credentials',
    httpMethod: 'GET',
    endpoint: '/api/v1/credentials',
    responseEvents: ['api-credentials-updated']
  },
  {
    command: 'add-api-credential',
    httpMethod: 'POST',
    endpoint: '/api/v1/credentials',
    responseEvents: ['api-credential-added']
  },
  {
    command: 'remove-api-credential',
    httpMethod: 'DELETE',
    endpoint: '/api/v1/credentials/{id}',
    responseEvents: ['api-credential-removed']
  },
  {
    command: 'get-api-recommendation',
    httpMethod: 'GET',
    endpoint: '/api/v1/credentials/recommend',
    responseEvents: ['api-recommendation']
  },
  
  // ==================== 配額管理 ====================
  {
    command: 'get-quota-status',
    httpMethod: 'GET',
    endpoint: '/api/v1/quota',
    responseEvents: ['quota-status-loaded']
  },
  {
    command: 'check-quota',
    httpMethod: 'POST',
    endpoint: '/api/v1/quota/check',
    responseEvents: ['quota-check-result']
  },
  {
    command: 'get-quota-alerts',
    httpMethod: 'GET',
    endpoint: '/api/v1/quota/alerts',
    responseEvents: ['quota-alerts-loaded']
  },
  {
    command: 'acknowledge-quota-alert',
    httpMethod: 'POST',
    endpoint: '/api/v1/quota/alerts/acknowledge',
    responseEvents: ['quota-alert-acknowledged']
  },
  {
    command: 'get-membership-levels',
    httpMethod: 'GET',
    endpoint: '/api/v1/membership/levels',
    responseEvents: ['membership-levels-loaded']
  },
  {
    command: 'get-quota-trend',
    httpMethod: 'GET',
    endpoint: '/api/v1/quota/trend',
    responseEvents: ['quota-trend-loaded']
  },
  {
    command: 'get-quota-history',
    httpMethod: 'GET',
    endpoint: '/api/v1/quota/history',
    responseEvents: ['quota-history-loaded']
  },
  // 計費和配額包
  {
    command: 'get-quota-packs',
    httpMethod: 'GET',
    endpoint: '/api/v1/billing/quota-packs',
    responseEvents: ['quota-packs-loaded']
  },
  {
    command: 'purchase-quota-pack',
    httpMethod: 'POST',
    endpoint: '/api/v1/billing/quota-packs/purchase',
    responseEvents: ['quota-pack-purchased']
  },
  {
    command: 'get-my-packages',
    httpMethod: 'GET',
    endpoint: '/api/v1/billing/my-packages',
    responseEvents: ['my-packages-loaded']
  },
  {
    command: 'get-user-bills',
    httpMethod: 'GET',
    endpoint: '/api/v1/billing/bills',
    responseEvents: ['user-bills-loaded']
  },
  {
    command: 'pay-bill',
    httpMethod: 'POST',
    endpoint: '/api/v1/billing/bills/pay',
    responseEvents: ['bill-paid']
  },
  {
    command: 'get-overage-info',
    httpMethod: 'GET',
    endpoint: '/api/v1/billing/overage',
    responseEvents: ['overage-info-loaded']
  },
  {
    command: 'get-freeze-status',
    httpMethod: 'GET',
    endpoint: '/api/v1/billing/freeze-status',
    responseEvents: ['freeze-status-loaded']
  },
  // 統一支付
  {
    command: 'create-payment',
    httpMethod: 'POST',
    endpoint: '/api/v1/payment/create',
    responseEvents: ['payment-created']
  },
  {
    command: 'get-payment-status',
    httpMethod: 'GET',
    endpoint: '/api/v1/payment/status',
    responseEvents: ['payment-status-loaded']
  },
  {
    command: 'get-payment-history',
    httpMethod: 'GET',
    endpoint: '/api/v1/payment/history',
    responseEvents: ['payment-history-loaded']
  },
  // 發票
  {
    command: 'get-invoices',
    httpMethod: 'GET',
    endpoint: '/api/v1/invoices',
    responseEvents: ['invoices-loaded']
  },
  {
    command: 'get-invoice-detail',
    httpMethod: 'GET',
    endpoint: '/api/v1/invoices/{invoice_id}',
    responseEvents: ['invoice-detail-loaded']
  }
];

/**
 * 根據命令名稱獲取配置
 */
export function getCommandConfig(command: string): CommandConfig | undefined {
  return COMMAND_REGISTRY.find(c => c.command === command);
}

/**
 * 獲取所有需要認證的命令
 */
export function getAuthRequiredCommands(): string[] {
  return COMMAND_REGISTRY
    .filter(c => c.requiresAuth)
    .map(c => c.command);
}

/**
 * 獲取命令的響應事件
 */
export function getResponseEvents(command: string): string[] {
  const config = getCommandConfig(command);
  return config?.responseEvents || [`${command}-result`];
}

/**
 * 構建 HTTP 端點 URL
 */
export function buildEndpointUrl(config: CommandConfig, payload: any): string {
  let endpoint = config.endpoint;
  
  // 替換路徑參數
  const pathParams = endpoint.match(/\{(\w+)\}/g);
  if (pathParams) {
    for (const param of pathParams) {
      const paramName = param.slice(1, -1); // 移除 { 和 }
      const value = payload[paramName] || payload.id || payload.accountId;
      if (value) {
        endpoint = endpoint.replace(param, String(value));
      }
    }
  }
  
  return endpoint;
}
