/**
 * 監控模組導出
 */

// 狀態管理服務
export { MonitoringStateService } from './monitoring-state.service';
export type { 
  MonitoringAccount, 
  MonitoringGroup, 
  KeywordSet, 
  KeywordItem,
  ChatTemplate,
  ConfigStep,
  ConfigStatus 
} from './monitoring-state.service';

// 配置進度組件
export { ConfigProgressComponent } from './config-progress.component';

// 頁面組件
export { MonitoringAccountsComponent } from './monitoring-accounts.component';
export { MonitoringGroupsComponent } from './monitoring-groups.component';
export { KeywordSetsComponent } from './keyword-sets.component';
export { ChatTemplatesComponent } from './chat-templates.component';
export { TriggerRulesComponent } from './trigger-rules.component';
export { CollectedUsersComponent } from './collected-users.component';
