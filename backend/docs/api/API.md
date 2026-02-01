# TG-Matrix API 文檔

*自動生成於 2026-01-25 01:46:35*

## 目錄

- [帳號管理](#account)
- [消息系統](#messaging)
- [自動化](#automation)
- [AI 服務](#ai)
- [客戶管理](#contacts)
- [系統管理](#system)
- [多角色協作](#multi_role)
- [廣告系統](#ads)
- [數據分析](#analytics)

---

## 帳號管理

共 39 個命令

| 命令 | 描述 |
|------|------|
| `add-account` | 添加帳號 |
| `batch-update-accounts` | 批量update 帳號 |
| `bulk-assign-group` | 批量assign 群組 |
| `bulk-assign-role` | 批量assign role |
| `bulk-delete-accounts` | 批量delete 帳號 |
| `check-account-status` | check帳號 狀態 |
| `credential-cancel-scrape` | credentialcancel scrape |
| `credential-get-all` | credentialget all |
| `credential-get-status` | credentialget 狀態 |
| `credential-start-scrape` | credentialstart scrape |
| `credential-submit-code` | credentialsubmit code |
| `get-accounts` | 獲取帳號 |
| `get-groups` | 獲取群組 |
| `get-personas` | 獲取personas |
| `get-tags` | 獲取tags |
| `ip-bind` | ipbind |
| `ip-get-all-bindings` | ipget all bindings |
| `ip-get-binding` | ipget binding |
| `ip-get-statistics` | ipget statistics |
| `ip-unbind` | ipunbind |
| `ip-verify-binding` | ipverify binding |
| `login-account` | login帳號 |
| `logout-account` | logout帳號 |
| `qr-login-cancel` | qrlogin cancel |
| `qr-login-create` | qrlogin create |
| `qr-login-refresh` | qrlogin refresh |
| `qr-login-status` | qrlogin 狀態 |
| `qr-login-submit-2fa` | qrlogin submit 2fa |
| `remove-account` | 移除帳號 |
| `resend-code` | resendcode |
| `save-groups` | 保存群組 |
| `save-personas` | 保存personas |
| `save-tags` | 保存tags |
| `submit-2fa-password` | submit2fa password |
| `sync-account-info` | 同步帳號 info |
| `test-proxy` | 測試proxy |
| `update-account` | 更新帳號 |
| `update-account-data` | 更新帳號 data |
| `verify-code` | verifycode |

## 廣告系統

共 9 個命令

| 命令 | 描述 |
|------|------|
| `create-ad-campaign` | 創建ad 活動 |
| `delete-ad-campaign` | 刪除ad 活動 |
| `get-ad-campaigns` | 獲取ad 活動 |
| `get-ad-stats` | 獲取ad stats |
| `get-ad-templates` | 獲取ad 模板 |
| `preview-ad` | previewad |
| `start-ad-campaign` | 啟動ad 活動 |
| `stop-ad-campaign` | 停止ad 活動 |
| `update-ad-campaign` | 更新ad 活動 |

## AI 服務

共 26 個命令

| 命令 | 描述 |
|------|------|
| `add-knowledge` | 添加knowledge |
| `ai-analyze-conversation` | aianalyze conversation |
| `ai-apply-strategy` | aiapply strategy |
| `ai-generate-group-names` | aigenerate 群組 names |
| `ai-generate-message` | aigenerate 消息 |
| `ai-generate-response` | aigenerate response |
| `ai-generate-welcome` | aigenerate welcome |
| `ai-get-strategies` | aiget strategies |
| `ai-memory-clear` | aimemory clear |
| `ai-memory-get` | aimemory get |
| `ai-memory-save` | aimemory save |
| `ai-save-strategy` | aisave strategy |
| `ai-suggest-reply` | aisuggest reply |
| `clear-knowledge` | clearknowledge |
| `get-ai-models` | 獲取AI models |
| `get-ai-settings` | 獲取AI 設置 |
| `get-ai-usage` | 獲取AI usage |
| `get-knowledge-stats` | 獲取knowledge stats |
| `learn-from-history` | learnfrom history |
| `rag-add-document` | ragadd document |
| `rag-get-status` | ragget 狀態 |
| `rag-search` | ragsearch |
| `remove-knowledge` | 移除knowledge |
| `save-ai-settings` | 保存AI 設置 |
| `search-knowledge` | searchknowledge |
| `test-ai-connection` | 測試AI connection |

## 數據分析

共 8 個命令

| 命令 | 描述 |
|------|------|
| `export-report` | exportreport |
| `get-analytics` | 獲取analytics |
| `get-conversion-stats` | 獲取conversion stats |
| `get-dashboard-stats` | 獲取dashboard stats |
| `get-group-stats` | 獲取群組 stats |
| `get-message-stats` | 獲取消息 stats |
| `get-user-stats` | 獲取用戶 stats |
| `schedule-report` | schedulereport |

## 自動化

共 34 個命令

| 命令 | 描述 |
|------|------|
| `add-campaign` | 添加活動 |
| `add-group` | 添加群組 |
| `add-keyword` | 添加關鍵詞 |
| `add-keyword-set` | 添加關鍵詞 set |
| `bind-keyword-set` | bind關鍵詞 set |
| `delete-keyword-set` | 刪除關鍵詞 set |
| `delete-trigger-rule` | 刪除trigger 規則 |
| `get-campaign-stats` | 獲取活動 stats |
| `get-campaigns` | 獲取活動 |
| `get-group-members` | 獲取群組 members |
| `get-keyword-sets` | 獲取關鍵詞 sets |
| `get-monitored-groups` | 獲取monitored 群組 |
| `get-system-status` | 獲取system 狀態 |
| `get-trigger-rules` | 獲取trigger 規則 |
| `join-group` | join群組 |
| `leave-group` | leave群組 |
| `one-click-start` | oneclick start |
| `one-click-stop` | oneclick stop |
| `pause-monitoring` | pausemonitoring |
| `remove-campaign` | 移除活動 |
| `remove-group` | 移除群組 |
| `remove-keyword` | 移除關鍵詞 |
| `remove-keyword-set` | 移除關鍵詞 set |
| `resume-monitoring` | resumemonitoring |
| `save-keyword-set` | 保存關鍵詞 set |
| `save-trigger-rule` | 保存trigger 規則 |
| `search-groups` | search群組 |
| `start-campaign` | 啟動活動 |
| `start-monitoring` | 啟動monitoring |
| `stop-campaign` | 停止活動 |
| `stop-monitoring` | 停止monitoring |
| `test-trigger-rule` | 測試trigger 規則 |
| `toggle-trigger-rule` | 切換trigger 規則 |
| `unbind-keyword-set` | unbind關鍵詞 set |

## 客戶管理

共 20 個命令

| 命令 | 描述 |
|------|------|
| `add-lead` | 添加線索 |
| `assign-lead` | assign線索 |
| `blacklist-user` | blacklist用戶 |
| `cancel-extraction` | 取消extraction |
| `delete-lead` | 刪除線索 |
| `export-collected-users` | exportcollected 用戶 |
| `extract-members` | extractmembers |
| `get-collected-users` | 獲取collected 用戶 |
| `get-extraction-status` | 獲取extraction 狀態 |
| `get-funnel-stats` | 獲取funnel stats |
| `get-funnel-users` | 獲取funnel 用戶 |
| `get-lead-details` | 獲取線索 details |
| `get-leads` | 獲取線索 |
| `get-tracked-users` | 獲取tracked 用戶 |
| `get-user-activity` | 獲取用戶 activity |
| `track-user` | track用戶 |
| `untrack-user` | untrack用戶 |
| `update-funnel-stage` | 更新funnel stage |
| `update-lead` | 更新線索 |
| `update-lead-stage` | 更新線索 stage |

## 消息系統

共 18 個命令

| 命令 | 描述 |
|------|------|
| `add-template` | 添加模板 |
| `clear-queue` | clear隊列 |
| `delete-chat-template` | 刪除chat 模板 |
| `get-chat-history` | 獲取chat history |
| `get-chat-templates` | 獲取chat 模板 |
| `get-private-messages` | 獲取private 消息 |
| `get-queue-status` | 獲取隊列 狀態 |
| `pause-queue` | pause隊列 |
| `queue-message` | queue消息 |
| `remove-template` | 移除模板 |
| `resume-queue` | resume隊列 |
| `save-chat-history` | 保存chat history |
| `save-chat-template` | 保存chat 模板 |
| `send-direct-message` | 發送direct 消息 |
| `send-group-message` | 發送群組 消息 |
| `send-message` | 發送消息 |
| `send-private-message` | 發送private 消息 |
| `toggle-template-status` | 切換模板 狀態 |

## 多角色協作

共 15 個命令

| 命令 | 描述 |
|------|------|
| `delete-role` | 刪除role |
| `delete-scenario` | 刪除scenario |
| `delete-script` | 刪除script |
| `get-collaboration-status` | 獲取collaboration 狀態 |
| `get-roles` | 獲取roles |
| `get-scenarios` | 獲取scenarios |
| `get-scripts` | 獲取scripts |
| `get-swarm-status` | 獲取swarm 狀態 |
| `save-role` | 保存role |
| `save-scenario` | 保存scenario |
| `save-script` | 保存script |
| `start-collaboration` | 啟動collaboration |
| `start-swarm` | 啟動swarm |
| `stop-collaboration` | 停止collaboration |
| `stop-swarm` | 停止swarm |

## 系統管理

共 24 個命令

| 命令 | 描述 |
|------|------|
| `backup-database` | backupdatabase |
| `clear-alerts` | clearalerts |
| `clear-logs` | clear日誌 |
| `create-group` | 創建群組 |
| `delete-api-credential` | 刪除api credential |
| `dismiss-alert` | dismissalert |
| `export-logs` | export日誌 |
| `get-alerts` | 獲取alerts |
| `get-api-credentials` | 獲取api credentials |
| `get-backup-status` | 獲取backup 狀態 |
| `get-created-groups` | 獲取created 群組 |
| `get-initial-state` | 獲取initial state |
| `get-logs` | 獲取日誌 |
| `get-migration-status` | 獲取migration 狀態 |
| `get-performance` | 獲取performance |
| `get-settings` | 獲取設置 |
| `get-system-info` | 獲取system info |
| `graceful-shutdown` | gracefulshutdown |
| `reset-settings` | reset設置 |
| `restore-database` | restoredatabase |
| `run-migrations` | runmigrations |
| `save-api-credential` | 保存api credential |
| `save-settings` | 保存設置 |
| `test-api-credential` | 測試api credential |

---

## 使用說明

### 命令格式

所有命令通過 IPC 通道發送，格式為：

```json
{
  "command": "命令名稱",
  "payload": { ... },
  "requestId": "唯一請求ID"
}
```

### 響應格式

成功響應：

```json
{
  "event": "命令名稱-result",
  "data": { ... }
}
```

錯誤響應：

```json
{
  "event": "error",
  "data": {
    "message": "錯誤信息",
    "code": "錯誤代碼"
  }
}
```
