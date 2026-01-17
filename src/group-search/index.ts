/**
 * TG-AI智控王 群組搜索模塊
 * Group Search Module Export v1.0
 * 
 * 完整的群組搜索與成員管理解決方案
 */

// ============ 類型定義 ============
export * from './search.types';

// ============ 搜索適配器 ============
export * from './adapters';

// ============ 核心引擎 ============
export * from './engines';

// ============ 數據分析 ============
export * from './analytics';

// ============ 多帳號管理 ============
export * from './multi-account';

// ============ 任務調度 ============
export * from './scheduler';

// ============ 雲端同步 ============
export * from './sync';

// ============ 智能自動化 ============
export * from './automation';

// ============ 測試工具 ============
export * from './testing';

// ============ UI 組件 ============
export * from './ui';

// ============ 性能優化 ============
export * from './performance';

// ============ 安全模塊 ============
export * from './security';

// ============ AI 模塊 ============
export * from './ai';

// ============ 商業化模塊 ============
export * from './business';

// ============ 服務 ============
export { GroupSearchService } from './search.service';
export { MemberExtractionService } from './member-extraction.service';

// ============ 組件 ============
export { GroupSearchComponent } from './group-search.component';
export { GroupDetailComponent } from './group-detail.component';
export { MemberListComponent } from './member-list.component';
