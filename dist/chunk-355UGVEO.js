import {
  Injectable,
  NgZone,
  __spreadValues,
  setClassMetadata,
  ɵɵdefineInjectable,
  ɵɵinject
} from "./chunk-Y4VZODST.js";

// src/services/api-command-registry.ts
var COMMAND_REGISTRY = [
  // ==================== 用戶認證 (SaaS) ====================
  {
    command: "user-register",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/register",
    responseEvents: ["user-registered", "auth-state-changed"]
  },
  {
    command: "user-login",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/login",
    responseEvents: ["user-logged-in", "auth-state-changed"]
  },
  {
    command: "user-logout",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/logout",
    responseEvents: ["user-logged-out", "auth-state-changed"]
  },
  {
    command: "user-refresh-token",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/refresh",
    responseEvents: ["token-refreshed"]
  },
  {
    command: "get-current-user",
    httpMethod: "GET",
    endpoint: "/api/v1/auth/me",
    responseEvents: ["current-user-loaded"]
  },
  // ==================== OAuth 第三方登入 ====================
  {
    command: "oauth-telegram",
    httpMethod: "POST",
    endpoint: "/api/v1/oauth/telegram",
    responseEvents: ["oauth-telegram-success", "auth-state-changed"]
  },
  {
    command: "oauth-telegram-config",
    httpMethod: "GET",
    endpoint: "/api/v1/oauth/telegram/config",
    responseEvents: ["oauth-telegram-config-loaded"]
  },
  {
    command: "oauth-google",
    httpMethod: "POST",
    endpoint: "/api/v1/oauth/google",
    responseEvents: ["oauth-google-success", "auth-state-changed"]
  },
  {
    command: "oauth-providers",
    httpMethod: "GET",
    endpoint: "/api/v1/oauth/providers",
    responseEvents: ["oauth-providers-loaded"]
  },
  // ==================== 郵箱驗證和密碼重置 ====================
  {
    command: "send-verification-email",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/send-verification",
    responseEvents: ["verification-email-sent"],
    requiresAuth: true
  },
  {
    command: "verify-email",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/verify-email",
    responseEvents: ["email-verified"]
  },
  {
    command: "verify-email-code",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/verify-email-code",
    responseEvents: ["email-verified"]
  },
  {
    command: "forgot-password",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/forgot-password",
    responseEvents: ["password-reset-requested"]
  },
  {
    command: "reset-password",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/reset-password",
    responseEvents: ["password-reset-completed"]
  },
  {
    command: "reset-password-code",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/reset-password-code",
    responseEvents: ["password-reset-completed"]
  },
  {
    command: "update-current-user",
    httpMethod: "PUT",
    endpoint: "/api/v1/auth/me",
    responseEvents: ["current-user-updated"]
  },
  {
    command: "change-password",
    httpMethod: "POST",
    endpoint: "/api/v1/auth/change-password",
    responseEvents: ["password-changed"]
  },
  {
    command: "get-user-sessions",
    httpMethod: "GET",
    endpoint: "/api/v1/auth/sessions",
    responseEvents: ["sessions-loaded"]
  },
  {
    command: "revoke-session",
    httpMethod: "DELETE",
    endpoint: "/api/v1/auth/sessions/{id}",
    responseEvents: ["session-revoked"]
  },
  // ==================== 帳號管理 ====================
  {
    command: "get-accounts",
    httpMethod: "GET",
    endpoint: "/api/v1/accounts",
    responseEvents: ["accounts-updated"]
  },
  {
    command: "add-account",
    httpMethod: "POST",
    endpoint: "/api/v1/accounts",
    responseEvents: ["login-requires-code", "login-requires-2fa", "login-success", "login-error", "accounts-updated"]
  },
  {
    command: "login-account",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["login-requires-code", "login-requires-2fa", "login-success", "login-error"],
    useCommandEndpoint: true
  },
  {
    command: "logout-account",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["logout-result"],
    useCommandEndpoint: true
  },
  {
    command: "update-account",
    httpMethod: "PUT",
    endpoint: "/api/v1/accounts/{id}",
    responseEvents: ["account-updated"]
  },
  {
    command: "update-account-data",
    httpMethod: "PUT",
    endpoint: "/api/v1/accounts/{id}",
    responseEvents: ["account-updated"]
  },
  {
    command: "delete-account",
    httpMethod: "DELETE",
    endpoint: "/api/v1/accounts/{id}",
    responseEvents: ["account-deleted", "accounts-updated"]
  },
  {
    command: "remove-account",
    httpMethod: "DELETE",
    endpoint: "/api/v1/accounts/{id}",
    responseEvents: ["account-deleted", "accounts-updated"]
  },
  {
    command: "connect-account",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["account-connection-status"],
    useCommandEndpoint: true
  },
  {
    command: "disconnect-account",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["account-disconnected"],
    useCommandEndpoint: true
  },
  {
    command: "check-account-status",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["account-status-checked"],
    useCommandEndpoint: true
  },
  {
    command: "import-session",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["session-imported"],
    useCommandEndpoint: true
  },
  {
    command: "export-session",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["session-exported"],
    useCommandEndpoint: true
  },
  {
    command: "bulk-assign-role",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["accounts-updated"],
    useCommandEndpoint: true
  },
  {
    command: "bulk-delete-accounts",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["accounts-updated"],
    useCommandEndpoint: true
  },
  // ==================== 監控系統 ====================
  {
    command: "start-monitoring",
    httpMethod: "POST",
    endpoint: "/api/v1/monitoring/start",
    responseEvents: ["monitoring-started", "monitoring-status"]
  },
  {
    command: "stop-monitoring",
    httpMethod: "POST",
    endpoint: "/api/v1/monitoring/stop",
    responseEvents: ["monitoring-stopped", "monitoring-status"]
  },
  {
    command: "get-monitoring-status",
    httpMethod: "GET",
    endpoint: "/api/v1/monitoring/status",
    responseEvents: ["monitoring-status"]
  },
  {
    command: "one-click-start",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["one-click-started", "monitoring-status"],
    useCommandEndpoint: true
  },
  {
    command: "one-click-stop",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["one-click-stopped", "monitoring-status"],
    useCommandEndpoint: true
  },
  {
    command: "get-system-status",
    httpMethod: "GET",
    endpoint: "/api/v1/system/health",
    responseEvents: ["system-status"]
  },
  // ==================== 群組管理 ====================
  {
    command: "get-monitored-groups",
    httpMethod: "GET",
    endpoint: "/api/v1/groups",
    responseEvents: ["monitored-groups-updated"]
  },
  {
    command: "add-group",
    httpMethod: "POST",
    endpoint: "/api/v1/groups",
    responseEvents: ["group-added", "monitored-groups-updated"]
  },
  {
    command: "remove-group",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-removed", "monitored-groups-updated"],
    useCommandEndpoint: true
  },
  {
    command: "join-group",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-joined"],
    useCommandEndpoint: true
  },
  {
    command: "leave-group",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-left"],
    useCommandEndpoint: true
  },
  {
    command: "join-and-monitor-with-account",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["join-and-monitor-result", "monitored-groups-updated"],
    useCommandEndpoint: true
  },
  {
    command: "join-and-monitor-resource",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["join-and-monitor-result", "monitored-groups-updated"],
    useCommandEndpoint: true
  },
  {
    command: "batch-join-and-monitor",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["batch-join-result"],
    useCommandEndpoint: true
  },
  {
    command: "batch-join-resources",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["batch-join-result"],
    useCommandEndpoint: true
  },
  // ==================== 關鍵詞管理 ====================
  {
    command: "get-keyword-sets",
    httpMethod: "GET",
    endpoint: "/api/v1/keywords",
    responseEvents: ["keyword-sets-updated"]
  },
  {
    command: "add-keyword-set",
    httpMethod: "POST",
    endpoint: "/api/v1/keywords",
    responseEvents: ["keyword-set-added", "keyword-sets-updated"]
  },
  {
    command: "add-keyword",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["keyword-added"],
    useCommandEndpoint: true
  },
  {
    command: "remove-keyword",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["keyword-removed"],
    useCommandEndpoint: true
  },
  // ==================== 消息隊列 ====================
  {
    command: "get-queue-status",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["queue-status"],
    useCommandEndpoint: true
  },
  {
    command: "get-queue-messages",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["queue-messages"],
    useCommandEndpoint: true
  },
  {
    command: "clear-queue",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["queue-cleared"],
    useCommandEndpoint: true
  },
  {
    command: "retry-message",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["message-retried"],
    useCommandEndpoint: true
  },
  {
    command: "cancel-message",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["message-cancelled"],
    useCommandEndpoint: true
  },
  {
    command: "pause-queue",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["queue-paused"],
    useCommandEndpoint: true
  },
  {
    command: "resume-queue",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["queue-resumed"],
    useCommandEndpoint: true
  },
  {
    command: "send-message",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["message-sent"],
    useCommandEndpoint: true
  },
  {
    command: "send-group-message",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["message-sent"],
    useCommandEndpoint: true
  },
  {
    command: "schedule-message",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["message-sent"],
    useCommandEndpoint: true
  },
  // ==================== 線索管理 ====================
  {
    command: "get-leads",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["leads-updated"],
    useCommandEndpoint: true
  },
  {
    command: "get-leads-paginated",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["leads-updated"],
    useCommandEndpoint: true
  },
  {
    command: "add-lead",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["lead-added", "leads-updated"],
    useCommandEndpoint: true
  },
  {
    command: "update-lead-status",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["lead-status-updated"],
    useCommandEndpoint: true
  },
  {
    command: "delete-lead",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["lead-deleted"],
    useCommandEndpoint: true
  },
  {
    command: "batch-delete-leads",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["leads-batch-deleted"],
    useCommandEndpoint: true
  },
  {
    command: "batch-update-lead-status",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["leads-status-batch-updated"],
    useCommandEndpoint: true
  },
  {
    command: "search-leads",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["leads-search-result"],
    useCommandEndpoint: true
  },
  {
    command: "get-all-tags",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["tags-updated"],
    useCommandEndpoint: true
  },
  {
    command: "create-tag",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["tag-created", "tags-updated"],
    useCommandEndpoint: true
  },
  {
    command: "delete-tag",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["tag-deleted", "tags-updated"],
    useCommandEndpoint: true
  },
  {
    command: "batch-add-tag",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["tags-batch-added"],
    useCommandEndpoint: true
  },
  {
    command: "batch-remove-tag",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["tags-batch-removed"],
    useCommandEndpoint: true
  },
  {
    command: "add-to-dnc",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["dnc-added"],
    useCommandEndpoint: true
  },
  {
    command: "batch-add-to-dnc",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["dnc-batch-added"],
    useCommandEndpoint: true
  },
  // ==================== 資源發現 ====================
  {
    command: "search-resources",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-search-result"],
    useCommandEndpoint: true
  },
  {
    command: "search-jiso",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-search-result"],
    useCommandEndpoint: true
  },
  {
    command: "get-resources",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-updated"],
    useCommandEndpoint: true
  },
  {
    command: "save-resource",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resource-saved"],
    useCommandEndpoint: true
  },
  {
    command: "unsave-resource",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resource-unsaved"],
    useCommandEndpoint: true
  },
  {
    command: "get-resource-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resource-stats"],
    useCommandEndpoint: true
  },
  {
    command: "clear-all-resources",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-cleared"],
    useCommandEndpoint: true
  },
  {
    command: "clear-resources",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-cleared"],
    useCommandEndpoint: true
  },
  {
    command: "delete-resource",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resource-deleted"],
    useCommandEndpoint: true
  },
  {
    command: "delete-resources-batch",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["resources-batch-deleted"],
    useCommandEndpoint: true
  },
  // ==================== 成員提取 ====================
  {
    command: "extract-members",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["members-extracted"],
    useCommandEndpoint: true
  },
  {
    command: "batch-extract-members",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["members-extracted"],
    useCommandEndpoint: true
  },
  // ==================== 歷史消息收集 ====================
  {
    command: "collect-users-from-history",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["collect-from-history-result"],
    useCommandEndpoint: true
  },
  {
    command: "collect-users-from-history-advanced",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["history-collection-result"],
    useCommandEndpoint: true
  },
  {
    command: "get-history-collection-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["history-collection-stats"],
    useCommandEndpoint: true
  },
  {
    command: "get-group-collected-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-collected-stats"],
    useCommandEndpoint: true
  },
  {
    command: "get-collected-users-count",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["collected-users-count"],
    useCommandEndpoint: true
  },
  {
    command: "check-group-monitoring-status",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-monitoring-status"],
    useCommandEndpoint: true
  },
  // ==================== P4：數據導出與管理 ====================
  {
    command: "export-members",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["members-exported"],
    useCommandEndpoint: true
  },
  {
    command: "deduplicate-members",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["members-deduplicated"],
    useCommandEndpoint: true
  },
  {
    command: "batch-tag-members",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["members-tagged"],
    useCommandEndpoint: true
  },
  {
    command: "get-all-tags",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["all-tags-result"],
    useCommandEndpoint: true
  },
  {
    command: "get-group-profile",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["group-profile-result"],
    useCommandEndpoint: true
  },
  {
    command: "compare-groups",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["groups-compared"],
    useCommandEndpoint: true
  },
  {
    command: "recalculate-scores",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["scores-recalculated"],
    useCommandEndpoint: true
  },
  {
    command: "get-extraction-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["extraction-stats-result"],
    useCommandEndpoint: true
  },
  {
    command: "start-background-extraction",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["background-extraction-started"],
    useCommandEndpoint: true
  },
  {
    command: "get-background-tasks",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["background-tasks-result"],
    useCommandEndpoint: true
  },
  {
    command: "clear-extraction-cache",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["extraction-cache-cleared"],
    useCommandEndpoint: true
  },
  // ==================== AI 功能 ====================
  {
    command: "generate-ai-response",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ai-response-generated"],
    useCommandEndpoint: true
  },
  {
    command: "test-ai-connection",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ai-connection-tested"],
    useCommandEndpoint: true
  },
  {
    command: "test-local-ai",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["local-ai-tested"],
    useCommandEndpoint: true
  },
  {
    command: "get-ollama-models",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ollama-models"],
    useCommandEndpoint: true
  },
  {
    command: "search-rag",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["rag-search-result"],
    useCommandEndpoint: true
  },
  {
    command: "get-rag-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["rag-stats"],
    useCommandEndpoint: true
  },
  {
    command: "init-rag-system",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["rag-initialized"],
    useCommandEndpoint: true
  },
  {
    command: "trigger-rag-learning",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["rag-learning-triggered"],
    useCommandEndpoint: true
  },
  {
    command: "add-rag-knowledge",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["rag-knowledge-added"],
    useCommandEndpoint: true
  },
  {
    command: "search-vector-memories",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["vector-memories-result"],
    useCommandEndpoint: true
  },
  {
    command: "add-vector-memory",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["vector-memory-added"],
    useCommandEndpoint: true
  },
  {
    command: "get-memory-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["memory-stats"],
    useCommandEndpoint: true
  },
  {
    command: "delete-vector-memory",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["vector-memory-deleted"],
    useCommandEndpoint: true
  },
  // ==================== 營銷系統 ====================
  {
    command: "get-ad-templates",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-templates-updated"],
    useCommandEndpoint: true
  },
  {
    command: "create-ad-template",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-template-created"],
    useCommandEndpoint: true
  },
  {
    command: "delete-ad-template",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-template-deleted"],
    useCommandEndpoint: true
  },
  {
    command: "get-ad-schedules",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-schedules-updated"],
    useCommandEndpoint: true
  },
  {
    command: "get-ad-send-logs",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-send-logs"],
    useCommandEndpoint: true
  },
  {
    command: "get-ad-overview-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ad-overview-stats"],
    useCommandEndpoint: true
  },
  {
    command: "get-marketing-stats",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["marketing-stats"],
    useCommandEndpoint: true
  },
  {
    command: "get-marketing-campaigns",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["marketing-campaigns-updated"],
    useCommandEndpoint: true
  },
  {
    command: "create-marketing-campaign",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["marketing-campaign-created"],
    useCommandEndpoint: true
  },
  {
    command: "start-marketing-campaign",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["marketing-campaign-started"],
    useCommandEndpoint: true
  },
  // ==================== 設置 ====================
  {
    command: "get-settings",
    httpMethod: "GET",
    endpoint: "/api/v1/settings",
    responseEvents: ["settings-loaded"]
  },
  {
    command: "save-settings",
    httpMethod: "POST",
    endpoint: "/api/v1/settings",
    responseEvents: ["settings-saved"]
  },
  {
    command: "save-ai-settings",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ai-settings-saved"],
    useCommandEndpoint: true
  },
  {
    command: "update-ai-chat-settings",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["ai-settings-saved"],
    useCommandEndpoint: true
  },
  {
    command: "get-initial-state",
    httpMethod: "GET",
    endpoint: "/api/v1/initial-state",
    responseEvents: ["initial-state", "initial-state-core", "initial-state-config", "initial-state-data", "accounts-updated"]
  },
  // ==================== 備份 ====================
  {
    command: "list-backups",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["backups-listed"],
    useCommandEndpoint: true
  },
  {
    command: "create-backup",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["backup-created"],
    useCommandEndpoint: true
  },
  {
    command: "restore-backup",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["backup-restored"],
    useCommandEndpoint: true
  },
  {
    command: "delete-backup",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["backup-deleted"],
    useCommandEndpoint: true
  },
  // ==================== 日誌 ====================
  {
    command: "get-logs",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["logs-updated"],
    useCommandEndpoint: true
  },
  {
    command: "clear-logs",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["logs-cleared"],
    useCommandEndpoint: true
  },
  {
    command: "export-logs",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["logs-exported"],
    useCommandEndpoint: true
  },
  // ==================== 告警 ====================
  {
    command: "get-alerts",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["alerts-updated"],
    useCommandEndpoint: true
  },
  {
    command: "acknowledge-alert",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["alert-updated"],
    useCommandEndpoint: true
  },
  {
    command: "resolve-alert",
    httpMethod: "POST",
    endpoint: "/api/command",
    responseEvents: ["alert-updated"],
    useCommandEndpoint: true
  },
  // ==================== API 憑據 ====================
  {
    command: "get-api-credentials",
    httpMethod: "GET",
    endpoint: "/api/v1/credentials",
    responseEvents: ["api-credentials-updated"]
  },
  {
    command: "add-api-credential",
    httpMethod: "POST",
    endpoint: "/api/v1/credentials",
    responseEvents: ["api-credential-added"]
  },
  {
    command: "remove-api-credential",
    httpMethod: "DELETE",
    endpoint: "/api/v1/credentials/{id}",
    responseEvents: ["api-credential-removed"]
  },
  {
    command: "get-api-recommendation",
    httpMethod: "GET",
    endpoint: "/api/v1/credentials/recommend",
    responseEvents: ["api-recommendation"]
  },
  // ==================== 配額管理 ====================
  {
    command: "get-quota-status",
    httpMethod: "GET",
    endpoint: "/api/v1/quota",
    responseEvents: ["quota-status-loaded"]
  },
  {
    command: "check-quota",
    httpMethod: "POST",
    endpoint: "/api/v1/quota/check",
    responseEvents: ["quota-check-result"]
  },
  {
    command: "get-quota-alerts",
    httpMethod: "GET",
    endpoint: "/api/v1/quota/alerts",
    responseEvents: ["quota-alerts-loaded"]
  },
  {
    command: "acknowledge-quota-alert",
    httpMethod: "POST",
    endpoint: "/api/v1/quota/alerts/acknowledge",
    responseEvents: ["quota-alert-acknowledged"]
  },
  {
    command: "get-membership-levels",
    httpMethod: "GET",
    endpoint: "/api/v1/membership/levels",
    responseEvents: ["membership-levels-loaded"]
  },
  {
    command: "get-quota-trend",
    httpMethod: "GET",
    endpoint: "/api/v1/quota/trend",
    responseEvents: ["quota-trend-loaded"]
  },
  {
    command: "get-quota-history",
    httpMethod: "GET",
    endpoint: "/api/v1/quota/history",
    responseEvents: ["quota-history-loaded"]
  },
  // 計費和配額包
  {
    command: "get-quota-packs",
    httpMethod: "GET",
    endpoint: "/api/v1/billing/quota-packs",
    responseEvents: ["quota-packs-loaded"]
  },
  {
    command: "purchase-quota-pack",
    httpMethod: "POST",
    endpoint: "/api/v1/billing/quota-packs/purchase",
    responseEvents: ["quota-pack-purchased"]
  },
  {
    command: "get-my-packages",
    httpMethod: "GET",
    endpoint: "/api/v1/billing/my-packages",
    responseEvents: ["my-packages-loaded"]
  },
  {
    command: "get-user-bills",
    httpMethod: "GET",
    endpoint: "/api/v1/billing/bills",
    responseEvents: ["user-bills-loaded"]
  },
  {
    command: "pay-bill",
    httpMethod: "POST",
    endpoint: "/api/v1/billing/bills/pay",
    responseEvents: ["bill-paid"]
  },
  {
    command: "get-overage-info",
    httpMethod: "GET",
    endpoint: "/api/v1/billing/overage",
    responseEvents: ["overage-info-loaded"]
  },
  {
    command: "get-freeze-status",
    httpMethod: "GET",
    endpoint: "/api/v1/billing/freeze-status",
    responseEvents: ["freeze-status-loaded"]
  },
  // 統一支付
  {
    command: "create-payment",
    httpMethod: "POST",
    endpoint: "/api/v1/payment/create",
    responseEvents: ["payment-created"]
  },
  {
    command: "get-payment-status",
    httpMethod: "GET",
    endpoint: "/api/v1/payment/status",
    responseEvents: ["payment-status-loaded"]
  },
  {
    command: "get-payment-history",
    httpMethod: "GET",
    endpoint: "/api/v1/payment/history",
    responseEvents: ["payment-history-loaded"]
  },
  // 發票
  {
    command: "get-invoices",
    httpMethod: "GET",
    endpoint: "/api/v1/invoices",
    responseEvents: ["invoices-loaded"]
  },
  {
    command: "get-invoice-detail",
    httpMethod: "GET",
    endpoint: "/api/v1/invoices/{invoice_id}",
    responseEvents: ["invoice-detail-loaded"]
  }
];
function getCommandConfig(command) {
  return COMMAND_REGISTRY.find((c) => c.command === command);
}
function buildEndpointUrl(config, payload) {
  let endpoint = config.endpoint;
  const pathParams = endpoint.match(/\{(\w+)\}/g);
  if (pathParams) {
    for (const param of pathParams) {
      const paramName = param.slice(1, -1);
      const value = payload[paramName] || payload.id || payload.accountId;
      if (value) {
        endpoint = endpoint.replace(param, String(value));
      }
    }
  }
  return endpoint;
}

// src/electron-ipc.service.ts
var ElectronIpcService = class _ElectronIpcService {
  constructor(ngZone) {
    this.ngZone = ngZone;
    this.listeners = [];
    this.channelListeners = /* @__PURE__ */ new Map();
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsConnected = false;
    this.webListeners = /* @__PURE__ */ new Map();
    this.apiBaseUrl = "";
    this.isWebMode = false;
    this.wsReconnectAttempts = 0;
    this.WS_MAX_RECONNECT_ATTEMPTS = 3;
    this.WS_RECONNECT_DELAYS = [5e3, 1e4, 2e4, 4e4, 6e4];
    this.isDegradedMode = false;
    this.pollingInterval = null;
    this.POLLING_INTERVAL_MS = 3e4;
    this.wsHeartbeatTimer = null;
    this.WS_HEARTBEAT_INTERVAL = 3e4;
    this.wsLastPong = 0;
    this.WS_PONG_TIMEOUT = 1e4;
    this.httpConnected = false;
    this.authToken = null;
    if (window.require) {
      try {
        const electron = window.require("electron");
        if (electron && electron.ipcRenderer) {
          this.ipcRenderer = electron.ipcRenderer;
          console.log("Electron IPC renderer successfully loaded.");
        } else {
          console.warn("Electron IPC renderer not found, running in browser mode.");
          this.initWebMode();
        }
      } catch (e) {
        console.error("Could not load Electron IPC renderer:", e);
        this.initWebMode();
      }
    } else {
      console.warn("Electron IPC not available, running in browser mode.");
      this.initWebMode();
    }
  }
  /**
   * 🆕 初始化 Web 模式（HTTP + WebSocket）
   */
  initWebMode() {
    this.isWebMode = true;
    if (window.location.hostname === "localhost" && window.location.port === "4200") {
      this.apiBaseUrl = "http://localhost:8000";
    } else {
      this.apiBaseUrl = `${window.location.protocol}//${window.location.host}`;
    }
    console.log(`[Web Mode] API URL: ${this.apiBaseUrl}`);
    this.connectWebSocket();
  }
  /**
   * 🆕 P1 優化：智能 WebSocket 連接
   * - 指數退避重連
   * - 心跳機制保活
   * - 超過最大重試次數後降級到 HTTP 輪詢
   */
  connectWebSocket() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    let wsUrl;
    if (window.location.hostname === "localhost" && window.location.port === "4200") {
      wsUrl = "ws://localhost:8000/ws";
    } else {
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }
    console.log(`[Web Mode] Connecting WebSocket: ${wsUrl} (attempt ${this.wsReconnectAttempts + 1})`);
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log("[Web Mode] \u2705 WebSocket connected");
        this.wsConnected = true;
        this.wsReconnectAttempts = 0;
        this.wsLastPong = Date.now();
        this.startHeartbeat();
        if (this.isDegradedMode) {
          console.log("[Web Mode] \u{1F504} Recovered from degraded mode");
          this.isDegradedMode = false;
          this.stopPolling();
          this.triggerEvent("connection-mode-changed", { mode: "websocket" });
        }
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
        this.triggerEvent("websocket-connected", { timestamp: Date.now() });
      };
      this.ws.onmessage = (event) => {
        try {
          this.wsLastPong = Date.now();
          const message = JSON.parse(event.data);
          if (message.type === "pong" || message.event === "pong") {
            return;
          }
          const eventName = message.event || message.type;
          const payload = message.data || message.payload || message;
          const listeners = this.webListeners.get(eventName);
          if (listeners) {
            this.ngZone.run(() => {
              listeners.forEach((listener) => {
                try {
                  listener(payload);
                } catch (e) {
                  console.error(`[Web Mode] Listener error for ${eventName}:`, e);
                }
              });
            });
          }
        } catch (e) {
          console.error("[Web Mode] WebSocket message parse error:", e);
        }
      };
      this.ws.onclose = (event) => {
        console.log(`[Web Mode] WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        this.wsConnected = false;
        this.stopHeartbeat();
        this.triggerEvent("websocket-disconnected", { code: event.code, reason: event.reason });
        this.scheduleReconnect();
      };
      this.ws.onerror = (error) => {
        console.error("[Web Mode] WebSocket error:", error);
        this.wsReconnectAttempts++;
      };
    } catch (e) {
      console.error("[Web Mode] WebSocket connection failed:", e);
      this.wsReconnectAttempts++;
      this.scheduleReconnect();
    }
  }
  /**
   * 🆕 啟動心跳機制
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.wsHeartbeatTimer = setInterval(() => {
      if (this.ws && this.wsConnected) {
        const timeSinceLastPong = Date.now() - this.wsLastPong;
        if (timeSinceLastPong > this.WS_HEARTBEAT_INTERVAL + this.WS_PONG_TIMEOUT) {
          console.warn("[Web Mode] WebSocket heartbeat timeout, reconnecting...");
          this.ws.close();
          return;
        }
        try {
          this.ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        } catch (e) {
          console.error("[Web Mode] Failed to send heartbeat:", e);
        }
      }
    }, this.WS_HEARTBEAT_INTERVAL);
  }
  /**
   * 🆕 停止心跳機制
   */
  stopHeartbeat() {
    if (this.wsHeartbeatTimer) {
      clearInterval(this.wsHeartbeatTimer);
      this.wsHeartbeatTimer = null;
    }
  }
  /**
   * 🆕 P1 優化：智能重連（指數退避 + 降級模式）
   */
  scheduleReconnect() {
    if (this.wsReconnectTimer)
      return;
    if (this.wsReconnectAttempts >= this.WS_MAX_RECONNECT_ATTEMPTS) {
      if (!this.isDegradedMode) {
        console.log("[Web Mode] \u26A0\uFE0F WebSocket failed, switching to HTTP polling mode");
        this.isDegradedMode = true;
        this.startPolling();
        this.triggerEvent("connection-mode-changed", { mode: "polling" });
      }
      this.wsReconnectTimer = setTimeout(() => {
        this.wsReconnectTimer = null;
        console.log("[Web Mode] Background WebSocket reconnection attempt...");
        this.connectWebSocket();
      }, 6e4);
      return;
    }
    const delay = this.WS_RECONNECT_DELAYS[Math.min(this.wsReconnectAttempts, this.WS_RECONNECT_DELAYS.length - 1)];
    console.log(`[Web Mode] Reconnecting in ${delay / 1e3}s...`);
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }
  /**
   * 🆕 P1: 啟動 HTTP 輪詢模式
   */
  startPolling() {
    if (this.pollingInterval)
      return;
    console.log("[Web Mode] Starting HTTP polling mode");
    this.pollingInterval = setInterval(() => {
      if (this.httpConnected) {
        this.httpSend("get-system-status", {});
      }
    }, this.POLLING_INTERVAL_MS);
  }
  /**
   * 🆕 P1: 停止 HTTP 輪詢
   */
  stopPolling() {
    if (this.pollingInterval) {
      console.log("[Web Mode] Stopping HTTP polling mode");
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  /**
   * 🆕 P1: 獲取當前連接模式
   */
  getConnectionMode() {
    if (this.wsConnected)
      return "websocket";
    if (this.isDegradedMode && this.httpConnected)
      return "polling";
    return "disconnected";
  }
  ngOnDestroy() {
    this.cleanupAll();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
    }
  }
  /**
   * Sends a message to the Electron main process over a specified channel.
   * @param channel The channel to send the message on.
   * @param args The data to send.
   */
  send(channel, ...args) {
    if (this.ipcRenderer) {
      console.log(`[IPC Service] \u2192 Sending '${channel}':`, args);
      this.ipcRenderer.send(channel, ...args);
    } else if (this.isWebMode) {
      console.log(`[Web Mode] \u2192 Sending '${channel}':`, args);
      this.httpSend(channel, args[0] || {});
    } else {
      console.log(`[Browser Mode] IPC Send to '${channel}':`, ...args);
    }
  }
  /**
   * 設置認證 Token（供 AuthService 調用）
   */
  setAuthToken(token) {
    this.authToken = token;
  }
  /**
   * 🆕 Web 模式：通過 HTTP 發送命令
   * 使用命令註冊表驅動，支持 RESTful 和通用命令端點
   */
  async httpSend(command, payload) {
    try {
      const config = getCommandConfig(command);
      let url;
      let method;
      let body;
      if (config && !config.useCommandEndpoint) {
        const endpoint = buildEndpointUrl(config, payload);
        url = `${this.apiBaseUrl}${endpoint}`;
        method = config.httpMethod;
        if (method === "GET") {
          body = void 0;
        } else {
          body = JSON.stringify(payload);
        }
      } else {
        url = `${this.apiBaseUrl}/api/command`;
        method = "POST";
        body = JSON.stringify({ command, payload });
      }
      console.log(`[Web Mode] ${method} ${url}`, config ? "(registry)" : "(fallback)", { command, payload });
      const headers = {
        "Content-Type": "application/json"
      };
      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }
      const fetchOptions = {
        method,
        headers
      };
      if (body) {
        fetchOptions.body = body;
      }
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        console.error(`[Web Mode] HTTP error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`[Web Mode] Error body:`, errorText);
        if (response.status === 401) {
          this.triggerEvent("auth-error", {
            error: "\u8A8D\u8B49\u5931\u6557",
            message: "\u8ACB\u91CD\u65B0\u767B\u5165"
          });
          return;
        }
        this.triggerEvent("connection-error", {
          error: `HTTP \u932F\u8AA4: ${response.status}`,
          message: errorText,
          command
        });
        this.handleResponseEvents(command, {
          success: false,
          error: errorText || `HTTP ${response.status}`,
          status: response.status
        });
        return;
      }
      const result = await response.json();
      console.log(`[Web Mode] Response for '${command}':`, result);
      if (!this.httpConnected) {
        this.httpConnected = true;
        console.log("[Web Mode] \u2705 HTTP connection confirmed");
        this.triggerEvent("connection-confirmed", {
          mode: "http",
          timestamp: Date.now()
        });
      }
      if (result.events && Array.isArray(result.events)) {
        for (const event of result.events) {
          this.triggerEvent(event.name || event.type, event.data || event.payload);
        }
      }
      if (result.event) {
        const listeners = this.webListeners.get(result.event);
        if (listeners) {
          this.ngZone.run(() => {
            listeners.forEach((listener) => listener(result.data || result));
          });
        }
      }
      this.handleResponseEvents(command, result);
    } catch (error) {
      console.error(`[Web Mode] HTTP send error for '${command}':`, error);
      this.triggerEvent("connection-error", {
        error: error.message || "\u7DB2\u7D61\u9023\u63A5\u932F\u8AA4",
        message: "\u7121\u6CD5\u9023\u63A5\u5230\u670D\u52D9\u5668\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u7D61\u9023\u63A5",
        command
      });
      this.handleResponseEvents(command, {
        success: false,
        error: error.message || "\u7DB2\u7D61\u932F\u8AA4"
      });
    }
  }
  /**
   * 🆕 處理 HTTP 響應並觸發對應的事件
   * 完整的命令-事件映射，支持所有 IPC 命令在 SaaS 模式下正常工作
   */
  handleResponseEvents(command, result) {
    if (command === "login-account" || command === "add-account") {
      if (result.success && result.requires_code) {
        this.triggerEvent("login-requires-code", {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          phoneCodeHash: result.phone_code_hash || result.phoneCodeHash,
          sendType: result.send_type || result.sendType || "app",
          message: result.message
        });
      } else if (result.success && result.requires_2fa) {
        this.triggerEvent("login-requires-2fa", {
          accountId: result.account_id || result.accountId,
          phone: result.phone
        });
      } else if (result.success && (result.status === "Online" || result.logged_in)) {
        this.triggerEvent("login-success", {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          userInfo: result.user_info || result.userInfo
        });
      } else if (!result.success) {
        this.triggerEvent("login-error", {
          accountId: result.account_id || result.accountId,
          error: result.error || result.message,
          phone: result.phone,
          codeExpired: result.code_expired || result.codeExpired
        });
      }
    }
    if (command === "get-accounts") {
      const accounts = result.accounts || result.data || result;
      if (Array.isArray(accounts)) {
        this.triggerEvent("accounts-updated", accounts);
      }
    }
    if (command === "update-account" || command === "update-account-data") {
      this.triggerEvent("account-updated", {
        success: result.success !== false,
        account: result.account || result.data,
        accountId: result.accountId || result.account_id
      });
    }
    if (command === "delete-account" || command === "remove-account") {
      this.triggerEvent("account-deleted", {
        success: result.success !== false,
        accountId: result.accountId || result.account_id,
        error: result.error
      });
    }
    if (command === "connect-account") {
      this.triggerEvent("account-connection-status", {
        accountId: result.accountId || result.account_id,
        status: result.status || (result.success ? "Connecting" : "Error"),
        error: result.error
      });
    }
    if (command === "disconnect-account") {
      this.triggerEvent("account-disconnected", {
        accountId: result.accountId || result.account_id,
        success: result.success !== false
      });
    }
    if (command === "logout-account") {
      this.triggerEvent("logout-result", {
        success: result.success !== false,
        accountId: result.accountId || result.account_id,
        error: result.error
      });
    }
    if (command === "check-account-status") {
      this.triggerEvent("account-status-checked", {
        accountId: result.accountId || result.account_id,
        status: result.status,
        online: result.online
      });
    }
    if (result.accounts && Array.isArray(result.accounts)) {
      this.triggerEvent("accounts-updated", result.accounts);
    }
    if (command === "start-monitoring") {
      this.triggerEvent("monitoring-started", {
        success: result.success !== false,
        error: result.error
      });
      if (result.success !== false) {
        this.triggerEvent("monitoring-status", __spreadValues({ running: true }, result));
      }
    }
    if (command === "stop-monitoring") {
      this.triggerEvent("monitoring-stopped", {
        success: result.success !== false,
        error: result.error
      });
      if (result.success !== false) {
        this.triggerEvent("monitoring-status", __spreadValues({ running: false }, result));
      }
    }
    if (command === "get-monitoring-status") {
      this.triggerEvent("monitoring-status", result);
    }
    if (command === "one-click-start") {
      this.triggerEvent("one-click-started", result);
    }
    if (command === "one-click-stop") {
      this.triggerEvent("one-click-stopped", result);
    }
    if (command === "get-monitored-groups") {
      this.triggerEvent("monitored-groups-updated", {
        groups: result.groups || result.data || result
      });
    }
    if (command === "add-group") {
      this.triggerEvent("group-added", {
        success: result.success !== false,
        group: result.group || result.data,
        error: result.error
      });
    }
    if (command === "remove-group") {
      this.triggerEvent("group-removed", {
        success: result.success !== false,
        groupId: result.groupId || result.group_id,
        error: result.error
      });
    }
    if (command === "join-group") {
      this.triggerEvent("group-joined", {
        success: result.success !== false,
        group: result.group,
        error: result.error
      });
    }
    if (command === "leave-group") {
      this.triggerEvent("group-left", {
        success: result.success !== false,
        groupId: result.groupId || result.group_id,
        error: result.error
      });
    }
    if (command === "join-and-monitor-with-account" || command === "join-and-monitor-resource") {
      this.triggerEvent("join-and-monitor-result", {
        success: result.success !== false,
        group: result.group,
        error: result.error
      });
    }
    if (command === "batch-join-and-monitor" || command === "batch-join-resources") {
      this.triggerEvent("batch-join-result", {
        success: result.success !== false,
        results: result.results || result.data,
        error: result.error
      });
    }
    if (command === "get-keyword-sets") {
      this.triggerEvent("keyword-sets-updated", {
        keywordSets: result.keywordSets || result.data || result
      });
    }
    if (command === "add-keyword-set") {
      this.triggerEvent("keyword-set-added", {
        success: result.success !== false,
        setId: result.setId || result.id,
        keywordSet: result.keywordSet || result.data,
        error: result.error
      });
    }
    if (command === "add-keyword") {
      this.triggerEvent("keyword-added", {
        success: result.success !== false,
        setId: result.setId,
        keyword: result.keyword,
        error: result.error
      });
    }
    if (command === "remove-keyword") {
      this.triggerEvent("keyword-removed", {
        success: result.success !== false,
        setId: result.setId,
        keywordId: result.keywordId,
        error: result.error
      });
    }
    if (command === "get-queue-status") {
      this.triggerEvent("queue-status", result);
    }
    if (command === "get-queue-messages") {
      this.triggerEvent("queue-messages", {
        messages: result.messages || result.data || result
      });
    }
    if (command === "clear-queue") {
      this.triggerEvent("queue-cleared", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "retry-message") {
      this.triggerEvent("message-retried", {
        success: result.success !== false,
        messageId: result.messageId,
        error: result.error
      });
    }
    if (command === "cancel-message") {
      this.triggerEvent("message-cancelled", {
        success: result.success !== false,
        messageId: result.messageId,
        error: result.error
      });
    }
    if (command === "pause-queue") {
      this.triggerEvent("queue-paused", {
        success: result.success !== false,
        phone: result.phone,
        error: result.error
      });
    }
    if (command === "resume-queue") {
      this.triggerEvent("queue-resumed", {
        success: result.success !== false,
        phone: result.phone,
        error: result.error
      });
    }
    if (command === "send-message" || command === "send-group-message" || command === "schedule-message") {
      this.triggerEvent("message-sent", {
        success: result.success !== false,
        messageId: result.messageId || result.message_id,
        error: result.error
      });
    }
    if (command === "get-leads" || command === "get-leads-paginated") {
      this.triggerEvent("leads-updated", {
        leads: result.leads || result.data || result,
        total: result.total || result.leadsTotal,
        hasMore: result.hasMore || result.leadsHasMore
      });
    }
    if (command === "add-lead") {
      this.triggerEvent("lead-added", {
        success: result.success !== false,
        lead: result.lead || result.data,
        error: result.error
      });
    }
    if (command === "update-lead-status") {
      this.triggerEvent("lead-status-updated", {
        success: result.success !== false,
        leadId: result.leadId,
        newStatus: result.newStatus || result.status,
        error: result.error
      });
    }
    if (command === "delete-lead") {
      this.triggerEvent("lead-deleted", {
        success: result.success !== false,
        leadId: result.leadId,
        error: result.error
      });
    }
    if (command === "batch-delete-leads") {
      this.triggerEvent("leads-batch-deleted", {
        success: result.success !== false,
        count: result.count,
        error: result.error
      });
    }
    if (command === "batch-update-lead-status") {
      this.triggerEvent("leads-status-batch-updated", {
        success: result.success !== false,
        count: result.count,
        error: result.error
      });
    }
    if (command === "search-leads") {
      this.triggerEvent("leads-search-result", {
        leads: result.leads || result.data || result,
        total: result.total
      });
    }
    if (command === "get-all-tags") {
      this.triggerEvent("tags-updated", {
        tags: result.tags || result.data || result
      });
    }
    if (command === "search-resources" || command === "search-jiso") {
      this.triggerEvent("resources-search-result", {
        resources: result.resources || result.data || result,
        total: result.total,
        source: command === "search-jiso" ? "jiso" : "telegram"
      });
    }
    if (command === "get-resources") {
      this.triggerEvent("resources-updated", {
        resources: result.resources || result.data || result
      });
    }
    if (command === "save-resource") {
      this.triggerEvent("resource-saved", {
        success: result.success !== false,
        resource: result.resource,
        error: result.error
      });
    }
    if (command === "unsave-resource") {
      this.triggerEvent("resource-unsaved", {
        success: result.success !== false,
        resourceId: result.resourceId,
        error: result.error
      });
    }
    if (command === "get-resource-stats") {
      this.triggerEvent("resource-stats", result);
    }
    if (command === "clear-all-resources" || command === "clear-resources") {
      this.triggerEvent("resources-cleared", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "extract-members" || command === "batch-extract-members") {
      this.triggerEvent("members-extracted", {
        success: result.success !== false,
        members: result.members || result.data,
        count: result.count,
        error: result.error
      });
    }
    if (command === "generate-ai-response") {
      this.triggerEvent("ai-response-generated", {
        success: result.success !== false,
        response: result.response || result.message,
        error: result.error
      });
    }
    if (command === "test-ai-connection") {
      this.triggerEvent("ai-connection-tested", {
        success: result.success !== false,
        provider: result.provider,
        error: result.error
      });
    }
    if (command === "get-ollama-models") {
      this.triggerEvent("ollama-models", {
        models: result.models || result.data || result
      });
    }
    if (command === "search-rag") {
      this.triggerEvent("rag-search-result", {
        results: result.results || result.data || result
      });
    }
    if (command === "get-rag-stats") {
      this.triggerEvent("rag-stats", result);
    }
    if (command === "search-vector-memories") {
      this.triggerEvent("vector-memories-result", {
        memories: result.memories || result.data || result
      });
    }
    if (command === "get-memory-stats") {
      this.triggerEvent("memory-stats", result);
    }
    if (command === "get-ad-templates") {
      this.triggerEvent("ad-templates-updated", {
        templates: result.templates || result.data || result
      });
    }
    if (command === "create-ad-template") {
      this.triggerEvent("ad-template-created", {
        success: result.success !== false,
        template: result.template || result.data,
        error: result.error
      });
    }
    if (command === "delete-ad-template") {
      this.triggerEvent("ad-template-deleted", {
        success: result.success !== false,
        templateId: result.templateId,
        error: result.error
      });
    }
    if (command === "get-ad-schedules") {
      this.triggerEvent("ad-schedules-updated", {
        schedules: result.schedules || result.data || result
      });
    }
    if (command === "get-ad-send-logs") {
      this.triggerEvent("ad-send-logs", {
        logs: result.logs || result.data || result
      });
    }
    if (command === "get-ad-overview-stats") {
      this.triggerEvent("ad-overview-stats", result);
    }
    if (command === "get-marketing-stats") {
      this.triggerEvent("marketing-stats", result);
    }
    if (command === "get-marketing-campaigns") {
      this.triggerEvent("marketing-campaigns-updated", {
        campaigns: result.campaigns || result.data || result
      });
    }
    if (command === "create-marketing-campaign") {
      this.triggerEvent("marketing-campaign-created", {
        success: result.success !== false,
        campaign: result.campaign || result.data,
        error: result.error
      });
    }
    if (command === "start-marketing-campaign") {
      this.triggerEvent("marketing-campaign-started", {
        success: result.success !== false,
        campaignId: result.campaignId,
        error: result.error
      });
    }
    if (command === "get-settings") {
      this.triggerEvent("settings-loaded", {
        settings: result.settings || result.data || result
      });
    }
    if (command === "save-settings") {
      this.triggerEvent("settings-saved", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "save-ai-settings" || command === "update-ai-chat-settings") {
      this.triggerEvent("ai-settings-saved", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "list-backups") {
      this.triggerEvent("backups-listed", {
        backups: result.backups || result.data || result
      });
    }
    if (command === "create-backup") {
      this.triggerEvent("backup-created", {
        success: result.success !== false,
        backup: result.backup || result.data,
        error: result.error
      });
    }
    if (command === "restore-backup") {
      this.triggerEvent("backup-restored", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "delete-backup") {
      this.triggerEvent("backup-deleted", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "import-session") {
      this.triggerEvent("session-imported", {
        success: result.success !== false,
        account: result.account,
        error: result.error
      });
    }
    if (command === "export-session") {
      this.triggerEvent("session-exported", {
        success: result.success !== false,
        path: result.path,
        error: result.error
      });
    }
    if (command === "get-logs") {
      this.triggerEvent("logs-updated", {
        logs: result.logs || result.data || result
      });
    }
    if (command === "clear-logs") {
      this.triggerEvent("logs-cleared", {
        success: result.success !== false,
        error: result.error
      });
    }
    if (command === "get-alerts") {
      this.triggerEvent("alerts-updated", {
        alerts: result.alerts || result.data || result
      });
    }
    if (command === "acknowledge-alert" || command === "resolve-alert") {
      this.triggerEvent("alert-updated", {
        success: result.success !== false,
        alertId: result.alertId,
        error: result.error
      });
    }
    if (command === "get-api-credentials") {
      this.triggerEvent("api-credentials-updated", {
        credentials: result.credentials || result.data || []
      });
    }
    if (command === "add-api-credential") {
      this.triggerEvent("api-credential-added", {
        success: result.success !== false,
        credential: result.credential || result.data,
        error: result.error
      });
    }
    if (command === "remove-api-credential") {
      this.triggerEvent("api-credential-removed", {
        success: result.success !== false,
        credentialId: result.credentialId,
        error: result.error
      });
    }
    if (command === "get-system-status") {
      this.triggerEvent("system-status", result);
    }
    if (command === "get-initial-state") {
      if (result.accounts || result.settings) {
        this.triggerEvent("initial-state-core", {
          accounts: result.accounts || [],
          settings: result.settings || {},
          isMonitoring: result.isMonitoring || false
        });
      }
      if (result.keywordSets || result.monitoredGroups || result.campaigns) {
        this.triggerEvent("initial-state-config", {
          keywordSets: result.keywordSets || [],
          monitoredGroups: result.monitoredGroups || [],
          campaigns: result.campaigns || [],
          messageTemplates: result.messageTemplates || [],
          chatTemplates: result.chatTemplates || [],
          triggerRules: result.triggerRules || []
        });
      }
      if (result.leads || result.logs) {
        this.triggerEvent("initial-state-data", {
          leads: result.leads || [],
          leadsTotal: result.leadsTotal || 0,
          leadsHasMore: result.leadsHasMore || false,
          logs: result.logs || []
        });
      }
      this.triggerEvent("initial-state", result);
      if (result.accounts && result.accounts.length > 0) {
        this.triggerEvent("accounts-updated", result.accounts);
      }
    }
    if (!this.isCommandHandled(command)) {
      const eventName = command.replace(/-/g, "-") + "-result";
      this.triggerEvent(eventName, {
        success: result.success !== false,
        data: result.data || result,
        error: result.error
      });
    }
  }
  /**
   * 檢查命令是否已被特別處理
   */
  isCommandHandled(command) {
    const handledCommands = [
      "login-account",
      "add-account",
      "get-accounts",
      "update-account",
      "update-account-data",
      "delete-account",
      "remove-account",
      "connect-account",
      "disconnect-account",
      "logout-account",
      "check-account-status",
      "start-monitoring",
      "stop-monitoring",
      "get-monitoring-status",
      "one-click-start",
      "one-click-stop",
      "get-monitored-groups",
      "add-group",
      "remove-group",
      "join-group",
      "leave-group",
      "join-and-monitor-with-account",
      "join-and-monitor-resource",
      "batch-join-and-monitor",
      "batch-join-resources",
      "get-keyword-sets",
      "add-keyword-set",
      "add-keyword",
      "remove-keyword",
      "get-queue-status",
      "get-queue-messages",
      "clear-queue",
      "retry-message",
      "cancel-message",
      "pause-queue",
      "resume-queue",
      "send-message",
      "send-group-message",
      "schedule-message",
      "get-leads",
      "get-leads-paginated",
      "add-lead",
      "update-lead-status",
      "delete-lead",
      "batch-delete-leads",
      "batch-update-lead-status",
      "search-leads",
      "get-all-tags",
      "search-resources",
      "search-jiso",
      "get-resources",
      "save-resource",
      "unsave-resource",
      "get-resource-stats",
      "clear-all-resources",
      "clear-resources",
      "extract-members",
      "batch-extract-members",
      "generate-ai-response",
      "test-ai-connection",
      "get-ollama-models",
      "search-rag",
      "get-rag-stats",
      "search-vector-memories",
      "get-memory-stats",
      "get-ad-templates",
      "create-ad-template",
      "delete-ad-template",
      "get-ad-schedules",
      "get-ad-send-logs",
      "get-ad-overview-stats",
      "get-marketing-stats",
      "get-marketing-campaigns",
      "create-marketing-campaign",
      "start-marketing-campaign",
      "get-settings",
      "save-settings",
      "save-ai-settings",
      "update-ai-chat-settings",
      "list-backups",
      "create-backup",
      "restore-backup",
      "delete-backup",
      "import-session",
      "export-session",
      "get-logs",
      "clear-logs",
      "get-alerts",
      "acknowledge-alert",
      "resolve-alert",
      "get-api-credentials",
      "add-api-credential",
      "remove-api-credential",
      "get-system-status",
      "get-initial-state"
    ];
    return handledCommands.includes(command);
  }
  /**
   * 🆕 手動觸發事件
   */
  triggerEvent(eventName, payload) {
    const listeners = this.webListeners.get(eventName);
    if (listeners && listeners.size > 0) {
      console.log(`[Web Mode] Triggering event '${eventName}':`, payload);
      this.ngZone.run(() => {
        listeners.forEach((listener) => {
          try {
            listener(payload);
          } catch (e) {
            console.error(`[Web Mode] Listener error for ${eventName}:`, e);
          }
        });
      });
    }
  }
  /**
   * Listens for messages from the Electron main process on a specified channel.
   * Returns an unsubscribe function to remove the listener.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  on(channel, listener) {
    if (this.isWebMode) {
      if (!this.webListeners.has(channel)) {
        this.webListeners.set(channel, /* @__PURE__ */ new Set());
      }
      this.webListeners.get(channel).add(listener);
      console.log(`[Web Mode] Added listener for '${channel}'`);
      return () => {
        const listeners = this.webListeners.get(channel);
        if (listeners) {
          listeners.delete(listener);
          console.log(`[Web Mode] Removed listener for '${channel}'`);
        }
      };
    }
    if (!this.ipcRenderer) {
      return () => {
      };
    }
    const wrappedListener = (event, ...args) => {
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    const listenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    this.listeners.push(listenerInfo);
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    this.ipcRenderer.on(channel, wrappedListener);
    return () => {
      this.removeListener(channel, listener);
    };
  }
  /**
   * Listens for a single message from the Electron main process on a specified channel.
   * Automatically removes the listener after first invocation.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  once(channel, listener) {
    if (this.isWebMode) {
      const onceListener = (...args) => {
        this.webListeners.get(channel)?.delete(onceListener);
        listener(...args);
      };
      if (!this.webListeners.has(channel)) {
        this.webListeners.set(channel, /* @__PURE__ */ new Set());
      }
      this.webListeners.get(channel).add(onceListener);
      return () => {
        this.webListeners.get(channel)?.delete(onceListener);
      };
    }
    if (!this.ipcRenderer) {
      return () => {
      };
    }
    let fired = false;
    const wrappedListener = (event, ...args) => {
      if (fired)
        return;
      fired = true;
      this.removeListenerByWrapped(channel, wrappedListener);
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    const listenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    this.listeners.push(listenerInfo);
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    this.ipcRenderer.on(channel, wrappedListener);
    return () => {
      if (!fired) {
        this.removeListenerByWrapped(channel, wrappedListener);
      }
    };
  }
  /**
   * Invokes a method on the Electron main process and returns a promise.
   * @param channel The channel to invoke on.
   * @param args The data to send.
   */
  invoke(channel, ...args) {
    if (this.isWebMode) {
      return this.httpInvoke(channel, args[0] || {});
    }
    if (!this.ipcRenderer) {
      console.log(`[Browser Mode] IPC Invoke to '${channel}':`, ...args);
      return Promise.resolve(null);
    }
    return this.ipcRenderer.invoke(channel, ...args);
  }
  /**
   * 🆕 Web 模式：HTTP invoke
   */
  async httpInvoke(command, payload) {
    try {
      const url = `${this.apiBaseUrl}/api/command`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ command, payload })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[Web Mode] HTTP invoke error for '${command}':`, error);
      return { success: false, error: error.message };
    }
  }
  /**
   * 移除特定監聽器
   */
  removeListener(channel, listener) {
    if (this.isWebMode) {
      this.webListeners.get(channel)?.delete(listener);
      return;
    }
    if (!this.ipcRenderer)
      return;
    const channelList = this.channelListeners.get(channel);
    if (!channelList)
      return;
    const index = channelList.findIndex((info) => info.originalListener === listener);
    if (index !== -1) {
      const info = channelList[index];
      this.ipcRenderer.removeListener(channel, info.wrappedListener);
      channelList.splice(index, 1);
      const globalIndex = this.listeners.findIndex((l) => l === info);
      if (globalIndex !== -1) {
        this.listeners.splice(globalIndex, 1);
      }
    }
  }
  /**
   * 通過包裝後的監聽器移除
   */
  removeListenerByWrapped(channel, wrappedListener) {
    if (!this.ipcRenderer)
      return;
    this.ipcRenderer.removeListener(channel, wrappedListener);
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      const index = channelList.findIndex((info) => info.wrappedListener === wrappedListener);
      if (index !== -1) {
        const info = channelList[index];
        channelList.splice(index, 1);
        const globalIndex = this.listeners.findIndex((l) => l === info);
        if (globalIndex !== -1) {
          this.listeners.splice(globalIndex, 1);
        }
      }
    }
  }
  /**
   * Removes all listeners from a specified channel to prevent memory leaks.
   * @param channel The channel to clean up listeners for.
   */
  cleanup(channel) {
    if (this.isWebMode) {
      this.webListeners.delete(channel);
      return;
    }
    if (!this.ipcRenderer)
      return;
    this.ipcRenderer.removeAllListeners(channel);
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      channelList.forEach((info) => {
        const index = this.listeners.findIndex((l) => l === info);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      });
      this.channelListeners.delete(channel);
    }
  }
  /**
   * 清理所有監聽器
   */
  cleanupAll() {
    if (this.isWebMode) {
      this.webListeners.clear();
      return;
    }
    if (!this.ipcRenderer)
      return;
    const channels = new Set(this.listeners.map((l) => l.channel));
    channels.forEach((channel) => {
      this.ipcRenderer.removeAllListeners(channel);
    });
    this.listeners = [];
    this.channelListeners.clear();
    console.log("[IPC] All listeners cleaned up");
  }
  /**
   * Alias for cleanup - removes all listeners from a channel.
   * @param channel The channel to clean up listeners for.
   * @param _listener Ignored - provided for API compatibility
   */
  off(channel, _listener) {
    this.cleanup(channel);
  }
  /**
   * 獲取當前監聽器數量（用於調試）
   */
  getListenerCount(channel) {
    if (this.isWebMode) {
      if (channel) {
        return this.webListeners.get(channel)?.size || 0;
      }
      let total = 0;
      this.webListeners.forEach((set) => total += set.size);
      return total;
    }
    if (channel) {
      return this.channelListeners.get(channel)?.length || 0;
    }
    return this.listeners.length;
  }
  /**
   * 獲取所有活躍的頻道
   */
  getActiveChannels() {
    if (this.isWebMode) {
      return Array.from(this.webListeners.keys());
    }
    return Array.from(this.channelListeners.keys());
  }
  /**
   * 選擇文件附件（使用原生文件對話框）
   * 返回文件路徑而非 base64，支持大文件上傳
   * @param type 'image' 或 'file'
   * @param multiple 是否允許多選
   */
  async selectFileForAttachment(type, multiple = false) {
    if (this.isWebMode) {
      console.warn("[Web Mode] selectFileForAttachment - using browser file picker");
      return { success: false, canceled: true };
    }
    if (!this.ipcRenderer) {
      console.warn("[Browser Mode] selectFileForAttachment not available");
      return { success: false, canceled: true };
    }
    return this.invoke("select-file-for-attachment", { type, multiple });
  }
  static {
    this.\u0275fac = function ElectronIpcService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ElectronIpcService)(\u0275\u0275inject(NgZone));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ElectronIpcService, factory: _ElectronIpcService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ElectronIpcService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: NgZone }], null);
})();

export {
  ElectronIpcService
};
//# sourceMappingURL=chunk-355UGVEO.js.map
