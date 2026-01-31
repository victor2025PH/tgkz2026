/**
 * Views Module Index
 * 視圖模塊索引
 * 
 * 🆕 Phase 31: 統一導出所有視圖組件
 */

// 核心視圖
export { DashboardViewComponent } from './dashboard-view.component';
export { AccountsViewComponent } from './accounts-view.component';
export { SettingsViewComponent } from './settings-view.component';

// 營銷視圖
export { LeadsViewComponent } from './leads-view.component';
// Lead, LeadStats 類型從 services/lead-management.service 導出
export { AutomationViewComponent } from './automation-view.component';
export type { MonitoringStats } from './automation-view.component';
export { ResourceDiscoveryViewComponent } from './resource-discovery-view.component';

// AI 視圖
export { AiCenterViewComponent } from './ai-center-view.component';
export { MultiRoleViewComponent } from './multi-role-view.component';

// 分析視圖
export { AnalyticsViewComponent } from './analytics-view.component';

// 系統視圖
export { MonitoringViewComponent } from './monitoring-view.component';
