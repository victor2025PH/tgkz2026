/**
 * 應用外觀服務
 * App Facade Service
 * 
 * 🆕 Phase 22: 統一委託入口
 * 
 * 提供統一的服務調用入口，減少 app.component.ts 的方法數量
 * 遵循 Facade 設計模式，封裝複雜的服務交互
 */

import { Injectable, inject, signal, computed } from '@angular/core';

// 核心服務
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MembershipService } from '../membership.service';
import { I18nService } from '../i18n.service';

// 專用服務
import { AccountManagementService } from './account-management.service';
import { NavigationService } from './navigation.service';
import { NavBridgeService, LegacyView } from './nav-bridge.service';
import { CampaignManagementService } from './campaign-management.service';
import { TemplateManagementService } from './template-management.service';
import { MonitoringManagementService } from './monitoring-management.service';
import { LeadManagementService } from './lead-management.service';
import { GroupManagementService } from './group-management.service';
import { MessageQueueService } from './message-queue.service';

// ============ 類型定義 ============

export type ViewType = 
  | 'dashboard' | 'accounts' | 'settings' | 'leads' 
  | 'ai-center' | 'automation' | 'multi-role' | 'analytics'
  | 'resource-discovery' | 'monitoring';

export interface SystemStatus {
  accounts: { total: number; online: number; offline: number };
  monitoring: { active: boolean; groups: number };
  queue: { pending: number; sent: number; failed: number };
  ai: { enabled: boolean; provider: string };
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AppFacadeService {
  // 注入服務
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private membership = inject(MembershipService);
  private i18n = inject(I18nService);
  
  // 專用服務
  readonly accounts = inject(AccountManagementService);
  readonly navigation = inject(NavigationService);
  readonly campaigns = inject(CampaignManagementService);
  readonly templates = inject(TemplateManagementService);
  readonly monitoring = inject(MonitoringManagementService);
  readonly leads = inject(LeadManagementService);
  readonly groups = inject(GroupManagementService);
  readonly messages = inject(MessageQueueService);
  
  // ========== 應用狀態 ==========
  
  private _isInitialized = signal(false);
  private _isLoading = signal(false);
  private _systemStatus = signal<SystemStatus | null>(null);
  private _currentView = signal<ViewType>('dashboard');
  
  isInitialized = this._isInitialized.asReadonly();
  isLoading = this._isLoading.asReadonly();
  systemStatus = this._systemStatus.asReadonly();
  currentView = this._currentView.asReadonly();
  
  // ========== 計算屬性 ==========
  
  hasOnlineAccounts = computed(() => {
    const status = this._systemStatus();
    return (status?.accounts?.online ?? 0) > 0;
  });
  
  isMonitoringActive = computed(() => {
    const status = this._systemStatus();
    return status?.monitoring?.active ?? false;
  });
  
  pendingMessages = computed(() => {
    const status = this._systemStatus();
    return status?.queue?.pending ?? 0;
  });
  
  constructor() {
    this.setupNavSync();
    this.setupIpcListeners();
  }
  
  // ========== 導航同步 ==========
  
  private setupNavSync(): void {
    // 使用 NavBridgeService 的 currentView 同步
    // 注意：由於使用 @switch 視圖切換，導航已由 AppComponent 管理
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    // 帳號相關
    this.ipc.on('accounts-loaded', (accounts: any[]) => {
      this.accounts.setAccounts(accounts);
    });
    
    this.ipc.on('account-status-changed', (data: any) => {
      this.accounts.updateAccount(data);
    });
    
    this.ipc.on('login-code-required', (data: any) => {
      this.accounts.handleCodeRequired(data);
    });
    
    this.ipc.on('login-2fa-required', (data: any) => {
      this.accounts.handle2FARequired(data);
    });
    
    this.ipc.on('login-success', (data: any) => {
      this.accounts.handleLoginSuccess(data);
    });
    
    this.ipc.on('login-failed', (data: any) => {
      this.accounts.handleLoginFailed(data);
    });
    
    // 群組相關
    this.ipc.on('join-group-result', (data: any) => {
      this.groups.handleJoinResult(data);
    });
    
    this.ipc.on('batch-join-progress', (data: any) => {
      this.groups.handleBatchJoinProgress(data);
    });
    
    // 消息隊列相關
    this.ipc.on('queue-status-update', (data: any) => {
      this.messages.handleQueueStatusUpdate(data);
    });
    
    this.ipc.on('message-sent', (data: any) => {
      this.messages.handleMessageSent(data);
    });
    
    // 系統狀態
    this.ipc.on('system-status', (status: SystemStatus) => {
      this._systemStatus.set(status);
    });
  }
  
  // ========== 導航操作 ==========
  
  /**
   * 導航到指定視圖
   */
  navigateTo(view: ViewType): void {
    this.nav.navigateTo(view as LegacyView);
  }
  
  /**
   * 導航回上一頁
   */
  goBack(): void {
    this.navigation.goBack();
  }
  
  /**
   * 導航到首頁
   */
  goHome(): void {
    this.navigateTo('dashboard');
  }
  
  // ========== 帳號操作（委託） ==========
  
  loginAccount(accountId: number): void {
    this.accounts.loginAccount(accountId);
  }
  
  logoutAccount(accountId: number): void {
    this.accounts.logoutAccount(accountId);
  }
  
  submitLoginCode(): void {
    this.accounts.submitLoginCode();
  }
  
  submitLogin2FA(): void {
    this.accounts.submitLogin2FA();
  }
  
  cancelLogin(): void {
    this.accounts.cancelLogin();
  }
  
  // ========== 群組操作（委託） ==========
  
  openJoinMonitorDialog(resource: any): void {
    this.groups.openJoinMonitorDialog(resource);
  }
  
  executeJoinAndMonitor(): void {
    this.groups.executeJoinAndMonitor();
  }
  
  openBatchJoinDialog(resources: any[]): void {
    this.groups.openBatchJoinDialog(resources);
  }
  
  leaveGroup(resource: any, phone: string): void {
    this.groups.leaveGroup(resource, phone);
  }
  
  // ========== 消息操作（委託） ==========
  
  openSingleMessageDialog(target: any, type: 'user' | 'group' | 'channel'): void {
    this.messages.openSingleMessageDialog(target, type);
  }
  
  openBatchMessageDialog(targets: any[], type: 'user' | 'group' | 'channel'): void {
    this.messages.openBatchMessageDialog(targets, type);
  }
  
  pauseQueue(phone: string): void {
    this.messages.pauseQueue(phone);
  }
  
  resumeQueue(phone: string): void {
    this.messages.resumeQueue(phone);
  }
  
  // ========== 監控操作（委託） ==========
  
  startMonitoring(): void {
    this.ipc.send('start-monitoring');
    this.toast.info('正在啟動監控...');
  }
  
  stopMonitoring(): void {
    this.ipc.send('stop-monitoring');
    this.toast.info('正在停止監控...');
  }
  
  // ========== 營銷活動（委託） ==========
  
  loadCampaigns(): void {
    this.campaigns.loadCampaigns();
  }
  
  createCampaign(): void {
    this.campaigns.createCampaignFromForm();
  }
  
  startCampaign(campaignId: string): void {
    this.campaigns.startCampaign(campaignId);
  }
  
  // ========== 線索管理（委託） ==========
  
  loadLeads(): void {
    this.leads.loadLeads();
  }
  
  selectLead(lead: any): void {
    this.leads.selectLead(lead);
  }
  
  // ========== 系統操作 ==========
  
  /**
   * 初始化應用
   */
  async initialize(): Promise<void> {
    if (this._isInitialized()) return;
    
    this._isLoading.set(true);
    
    try {
      // 加載帳號
      this.ipc.send('get-accounts');
      
      // 加載系統狀態
      this.ipc.send('get-system-status');
      
      // 加載配置
      this.ipc.send('get-config');
      
      this._isInitialized.set(true);
    } catch (error) {
      console.error('[AppFacade] Initialization failed:', error);
      this.toast.error('應用初始化失敗');
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 刷新系統狀態
   */
  refreshSystemStatus(): void {
    this.ipc.send('get-system-status');
  }
  
  /**
   * 重新加載所有數據
   */
  reloadAll(): void {
    this.ipc.send('get-accounts');
    this.ipc.send('get-system-status');
    this.campaigns.loadCampaigns();
    this.templates.loadTemplates();
    this.leads.loadLeads();
    this.messages.refreshQueueStatus();
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 翻譯
   */
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  /**
   * 檢查功能權限
   */
  hasFeature(feature: string): boolean {
    return this.membership.hasFeature(feature as any);
  }
  
  /**
   * 顯示成功提示
   */
  showSuccess(message: string): void {
    this.toast.success(message);
  }
  
  /**
   * 顯示錯誤提示
   */
  showError(message: string): void {
    this.toast.error(message);
  }
  
  /**
   * 顯示信息提示
   */
  showInfo(message: string): void {
    this.toast.info(message);
  }
  
  // ========== 數據加載操作（委託） ==========
  
  /**
   * 加載資源列表
   */
  loadResources(): void {
    this.ipc.send('get-resources');
  }
  
  /**
   * 加載 AI 設置
   */
  loadAiSettings(): void {
    this.ipc.send('get-ai-settings');
  }
  
  /**
   * 加載成員列表
   */
  loadMemberList(resourceId: number): void {
    this.ipc.send('get-member-list', { resourceId });
  }
  
  /**
   * 加載日誌文件
   */
  loadLogFiles(): void {
    this.ipc.send('get-log-files');
  }
  
  /**
   * 加載日誌統計
   */
  loadLogStats(): void {
    this.ipc.send('get-log-stats');
  }
  
  /**
   * 加載調度器狀態
   */
  loadSchedulerStatus(): void {
    this.ipc.send('get-scheduler-status');
  }
  
  /**
   * 加載預熱詳情
   */
  loadWarmupDetails(accountId: number): void {
    this.ipc.send('get-warmup-details', { accountId });
  }
  
  // ========== 資源操作（委託） ==========
  
  /**
   * 搜索頻道/群組
   */
  searchChannels(query: string, options?: { limit?: number; type?: string }): void {
    this.ipc.send('search-channels', { query, ...options });
  }
  
  /**
   * 提取成員
   */
  extractMembers(resourceId: number, phone: string, options?: { limit?: number }): void {
    this.ipc.send('extract-members', { resourceId, phone, ...options });
    this.toast.info('開始提取成員...');
  }
  
  /**
   * 邀請成員到群組
   */
  inviteMembers(resourceId: number, userIds: number[], phone: string): void {
    this.ipc.send('invite-members', { resourceId, userIds, phone });
    this.toast.info(`正在邀請 ${userIds.length} 位成員...`);
  }
  
  // ========== AI 操作（委託） ==========
  
  /**
   * 生成 AI 回復
   */
  generateAiResponse(prompt: string, context?: any): void {
    this.ipc.send('generate-ai-response', { prompt, context });
  }
  
  /**
   * 保存 AI 設置
   */
  saveAiSettings(settings: any): void {
    this.ipc.send('save-ai-settings', settings);
    this.toast.success('AI 設置已保存');
  }
  
  /**
   * 測試 AI 連接
   */
  testAiConnection(): void {
    this.ipc.send('test-ai-connection');
    this.toast.info('正在測試 AI 連接...');
  }
  
  // ========== 自動化操作（委託） ==========
  
  /**
   * 啟動自動化活動
   */
  startAutomation(campaignId: string): void {
    this.campaigns.startCampaign(campaignId);
  }
  
  /**
   * 暫停自動化活動
   */
  pauseAutomation(campaignId: string): void {
    this.ipc.send('pause-campaign', { campaignId });
    this.toast.info('正在暫停活動...');
  }
  
  /**
   * 停止自動化活動
   */
  stopAutomation(campaignId: string): void {
    this.ipc.send('stop-campaign', { campaignId });
    this.toast.info('正在停止活動...');
  }
  
  // ========== 備份操作（委託） ==========
  
  /**
   * 創建備份
   */
  createBackup(): void {
    this.ipc.send('create-backup');
    this.toast.info('正在創建備份...');
  }
  
  /**
   * 恢復備份
   */
  restoreBackup(backupId: string): void {
    if (confirm('確定要恢復此備份嗎？當前數據將被覆蓋。')) {
      this.ipc.send('restore-backup', { backupId });
      this.toast.info('正在恢復備份...');
    }
  }
  
  /**
   * 獲取備份列表
   */
  getBackups(): void {
    this.ipc.send('get-backups');
  }
  
  // ========== 導出操作（委託） ==========
  
  /**
   * 導出線索
   */
  exportLeads(format: 'csv' | 'xlsx' | 'json' = 'csv'): void {
    this.ipc.send('export-leads', { format });
    this.toast.info('正在導出線索...');
  }
  
  /**
   * 導出成員
   */
  exportMembers(resourceId: number, format: 'csv' | 'xlsx' | 'json' = 'csv'): void {
    this.ipc.send('export-members', { resourceId, format });
    this.toast.info('正在導出成員...');
  }
  
  /**
   * 導出統計報告
   */
  exportReport(type: 'daily' | 'weekly' | 'monthly' = 'daily'): void {
    this.ipc.send('export-report', { type });
    this.toast.info('正在生成報告...');
  }
}
