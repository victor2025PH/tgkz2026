/**
 * 服務模組統一導出
 * Services Module Index
 * 
 * 🆕 Phase 32: 修復導出衝突問題
 */

// 核心服務
export * from './app-state.service';
export * from './account-management.service';
export { ResourceDiscoveryService } from './resource-discovery.service';

// 錯誤處理
export * from './error-handler.service';

// 導航
export * from './nav-bridge.service';

// 快捷鍵
export * from './keyboard-shortcuts.service';

// 業務服務
export * from './unified-contacts.service';
export { UnifiedExtractionService } from './unified-extraction.service';
export * from './lead-scoring.service';
export * from './ab-testing.service';
export * from './system-diagnostic.service';

// 日志服務
export * from './logger.service';

// 廣告系統服務
export * from './ad-system.service';

// 用戶追蹤服務
export * from './user-tracking.service';

// 成員管理服務
export { MemberManagementService } from './member-management.service';

// 隊列管理服務
export { QueueManagementService } from './queue-management.service';

// 營銷活動管理服務
export * from './campaign-management.service';

// 模板管理服務
export * from './template-management.service';

// 導航服務
export { NavigationService, type ViewType } from './navigation.service';

// 監控管理服務
export * from './monitoring-management.service';

// 線索管理服務
export * from './lead-management.service';

// 群組管理服務
export * from './group-management.service';

// 消息隊列服務
export { MessageQueueService } from './message-queue.service';

// 應用外觀服務
export { AppFacadeService } from './app-facade.service';

// 動畫配置服務
export * from './animation-config.service';

// 設定服務
export * from './settings.service';

// AI 對話服務
export { AiChatService } from './ai-chat.service';

// 資源服務
export { ResourceService } from './resource.service';

// 導出服務
export * from './export.service';

// 🆕 Phase 26: 新增服務
export { RagService } from './rag.service';
export * from './vector-memory.service';
export * from './backup.service';
export * from './scheduler.service';
export * from './dialog.service';

// 🆕 P0-P2: 統一營銷任務服務
export * from './marketing-task.service';
export * from './marketing-state.service';

// 🆕 優化 1-2: 任務模板服務
export * from './task-template.service';

// 🆕 優化 1-3: 智能推薦服務
export * from './smart-recommendation.service';

// 🆕 前端優化: 執行日誌服務
export * from './execution-log.service';

// 🆕 數據優化: API 客戶端和實時服務
export * from './api-client.service';
export * from './realtime.service';

// 🆕 AI優化: 話術生成和 A/B 測試
export * from './ai-copywriting.service';
export * from './ab-testing.service';

// 🆕 體驗優化: 引導、快捷鍵、主題
export * from './onboarding.service';
export * from './keyboard-shortcuts.service';
export * from './theme.service';
