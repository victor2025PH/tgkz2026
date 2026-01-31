/**
 * Monitoring Management Service
 * 監控管理服務
 * 
 * 🆕 Phase 19: 從 app.component.ts 提取
 * 
 * 管理群組監控、關鍵詞匹配、觸發規則等功能
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export interface MonitoredGroup {
  id: number;
  name: string;
  username?: string;
  url?: string;
  member_count?: number;
  status: 'active' | 'paused' | 'error';
  keywordSetId?: number;
  accountPhone?: string;
  lastActivity?: string;
  messagesCount?: number;
  matchedCount?: number;
}

export interface KeywordSet {
  id: number;
  name: string;
  keywords: KeywordConfig[];
  active: boolean;
  matchCount?: number;
  createdAt?: string;
}

export interface KeywordConfig {
  keyword: string;
  isRegex: boolean;
  caseSensitive?: boolean;
}

export interface TriggerRule {
  id: number;
  name: string;
  keywordSetId: number;
  sourceGroupIds: number[];
  action: TriggerAction;
  active: boolean;
  triggerCount?: number;
}

export interface TriggerAction {
  type: 'send_message' | 'add_to_funnel' | 'notify' | 'extract_member';
  templateId?: number;
  targetGroupId?: number;
  delaySeconds?: number;
}

export interface JoinMonitorConfig {
  resourceId: number;
  resourceTitle: string;
  accountPhone: string;
  selectedKeywordSetId: number | null;
  customKeywords: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 狀態
  readonly monitoredGroups = signal<MonitoredGroup[]>([]);
  readonly keywordSets = signal<KeywordSet[]>([]);
  readonly triggerRules = signal<TriggerRule[]>([]);
  readonly monitoringActive = signal(false);
  
  // 加入監控對話框狀態
  readonly showJoinMonitorDialog = signal(false);
  readonly joinMonitorConfig = signal<JoinMonitorConfig>({
    resourceId: 0,
    resourceTitle: '',
    accountPhone: '',
    selectedKeywordSetId: null,
    customKeywords: []
  });
  
  // 快速創建關鍵詞集
  readonly showQuickCreateKeywordSet = signal(false);
  readonly quickKeywordSetName = signal('');
  readonly quickKeywords = signal<string[]>([]);
  readonly quickKeywordInput = signal('');
  
  // 批量加入監控
  readonly showBatchJoinMonitorDialog = signal(false);
  readonly batchJoinMonitorProgress = signal(0);
  readonly isBatchJoining = signal(false);
  
  // 計算屬性
  readonly activeMonitoredGroups = computed(() => 
    this.monitoredGroups().filter(g => g.status === 'active')
  );
  
  readonly activeKeywordSets = computed(() => 
    this.keywordSets().filter(s => s.active)
  );
  
  readonly totalMatchedCount = computed(() => 
    this.monitoredGroups().reduce((sum, g) => sum + (g.matchedCount || 0), 0)
  );
  
  // 推薦關鍵詞
  readonly recommendedKeywords = [
    '付款', '支付', '收款', 'USDT', 'BTC', '比特幣',
    '投資', '理財', '賺錢', '兼職', '代理', '合作'
  ];
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ==================== 加載方法 ====================
  
  loadMonitoredGroups(): void {
    this.ipcService.send('get-monitored-groups', {});
  }
  
  loadKeywordSets(): void {
    this.ipcService.send('get-keyword-sets', {});
  }
  
  loadTriggerRules(): void {
    this.ipcService.send('get-trigger-rules', {});
  }
  
  loadAllMonitoringData(): void {
    this.loadMonitoredGroups();
    this.loadKeywordSets();
    this.loadTriggerRules();
  }
  
  // ==================== 監控群組操作 ====================
  
  startMonitoring(): void {
    this.ipcService.send('start-monitoring', {});
    this.monitoringActive.set(true);
  }
  
  stopMonitoring(): void {
    this.ipcService.send('stop-monitoring', {});
    this.monitoringActive.set(false);
  }
  
  toggleMonitoring(): void {
    if (this.monitoringActive()) {
      this.stopMonitoring();
    } else {
      this.startMonitoring();
    }
  }
  
  addMonitoredGroup(group: Partial<MonitoredGroup>): void {
    this.ipcService.send('add-monitored-group', group);
  }
  
  removeMonitoredGroup(groupId: number): void {
    if (!confirm('確定要停止監控此群組嗎？')) return;
    this.ipcService.send('remove-monitored-group', { id: groupId });
  }
  
  pauseMonitoredGroup(groupId: number): void {
    this.ipcService.send('pause-monitored-group', { id: groupId });
  }
  
  resumeMonitoredGroup(groupId: number): void {
    this.ipcService.send('resume-monitored-group', { id: groupId });
  }
  
  // ==================== 加入並監控 ====================
  
  openJoinAndMonitorDialog(resource: any): void {
    this.joinMonitorConfig.set({
      resourceId: resource.id,
      resourceTitle: resource.title || resource.name,
      accountPhone: '',
      selectedKeywordSetId: null,
      customKeywords: []
    });
    this.showJoinMonitorDialog.set(true);
  }
  
  closeJoinMonitorDialog(): void {
    this.showJoinMonitorDialog.set(false);
  }
  
  selectMonitorAccount(phone: string): void {
    this.joinMonitorConfig.update(c => ({ ...c, accountPhone: phone }));
  }
  
  selectKeywordSet(setId: number): void {
    this.joinMonitorConfig.update(c => ({ ...c, selectedKeywordSetId: setId }));
  }
  
  addMonitorKeyword(keyword?: string): void {
    const kw = keyword || this.quickKeywordInput().trim();
    if (!kw) return;
    
    this.joinMonitorConfig.update(c => ({
      ...c,
      customKeywords: [...c.customKeywords, kw]
    }));
    this.quickKeywordInput.set('');
  }
  
  removeMonitorKeyword(keyword: string): void {
    this.joinMonitorConfig.update(c => ({
      ...c,
      customKeywords: c.customKeywords.filter(k => k !== keyword)
    }));
  }
  
  executeJoinAndMonitor(): void {
    const config = this.joinMonitorConfig();
    
    if (!config.accountPhone) {
      this.toastService.warning('請選擇執行帳號');
      return;
    }
    
    if (!config.selectedKeywordSetId && config.customKeywords.length === 0) {
      this.toastService.warning('請選擇關鍵詞集或添加自定義關鍵詞');
      return;
    }
    
    this.ipcService.send('join-and-monitor', {
      resourceId: config.resourceId,
      accountPhone: config.accountPhone,
      keywordSetId: config.selectedKeywordSetId,
      customKeywords: config.customKeywords
    });
    
    this.closeJoinMonitorDialog();
    this.toastService.success('正在加入並設置監控...');
  }
  
  // ==================== 快速創建關鍵詞集 ====================
  
  openQuickCreateKeywordSet(): void {
    this.quickKeywordSetName.set('');
    this.quickKeywords.set([]);
    this.quickKeywordInput.set('');
    this.showQuickCreateKeywordSet.set(true);
  }
  
  closeQuickCreateKeywordSet(): void {
    this.showQuickCreateKeywordSet.set(false);
  }
  
  addQuickKeyword(): void {
    const keyword = this.quickKeywordInput().trim();
    if (!keyword) return;
    
    this.quickKeywords.update(kws => [...kws, keyword]);
    this.quickKeywordInput.set('');
  }
  
  removeQuickKeyword(keyword: string): void {
    this.quickKeywords.update(kws => kws.filter(k => k !== keyword));
  }
  
  addQuickRecommendedKeyword(keyword: string): void {
    if (!this.quickKeywords().includes(keyword)) {
      this.quickKeywords.update(kws => [...kws, keyword]);
    }
  }
  
  executeQuickCreateKeywordSet(): void {
    const name = this.quickKeywordSetName().trim();
    const keywords = this.quickKeywords();
    
    if (!name) {
      this.toastService.warning('請輸入關鍵詞集名稱');
      return;
    }
    
    if (keywords.length === 0) {
      this.toastService.warning('請添加至少一個關鍵詞');
      return;
    }
    
    this.ipcService.send('create-keyword-set', {
      name,
      keywords: keywords.map(k => ({ keyword: k, isRegex: false }))
    });
    
    this.closeQuickCreateKeywordSet();
    this.toastService.success('關鍵詞集創建成功');
  }
  
  // ==================== 批量加入監控 ====================
  
  openBatchJoinMonitorDialog(): void {
    this.batchJoinMonitorProgress.set(0);
    this.isBatchJoining.set(false);
    this.showBatchJoinMonitorDialog.set(true);
  }
  
  closeBatchJoinMonitorDialog(): void {
    this.showBatchJoinMonitorDialog.set(false);
  }
  
  executeBatchJoinMonitor(resources: any[], accountPhone: string, keywordSetId: number): void {
    if (resources.length === 0) {
      this.toastService.warning('請選擇要加入的群組');
      return;
    }
    
    if (!accountPhone) {
      this.toastService.warning('請選擇執行帳號');
      return;
    }
    
    this.isBatchJoining.set(true);
    this.batchJoinMonitorProgress.set(0);
    
    this.ipcService.send('batch-join-and-monitor', {
      resourceIds: resources.map(r => r.id),
      accountPhone,
      keywordSetId
    });
  }
  
  // ==================== 關鍵詞集操作 ====================
  
  createKeywordSet(name: string, keywords: KeywordConfig[]): void {
    this.ipcService.send('create-keyword-set', { name, keywords });
  }
  
  deleteKeywordSet(setId: number): void {
    if (!confirm('確定要刪除此關鍵詞集嗎？')) return;
    this.ipcService.send('delete-keyword-set', { id: setId });
  }
  
  toggleKeywordSetStatus(setId: number): void {
    this.ipcService.send('toggle-keyword-set-status', { id: setId });
  }
  
  addKeywordToSet(setId: number, keyword: KeywordConfig): void {
    this.ipcService.send('add-keyword-to-set', { setId, keyword });
  }
  
  removeKeywordFromSet(setId: number, keyword: string): void {
    this.ipcService.send('remove-keyword-from-set', { setId, keyword });
  }
  
  // ==================== 觸發規則操作 ====================
  
  createTriggerRule(rule: Partial<TriggerRule>): void {
    this.ipcService.send('create-trigger-rule', rule);
  }
  
  deleteTriggerRule(ruleId: number): void {
    if (!confirm('確定要刪除此觸發規則嗎？')) return;
    this.ipcService.send('delete-trigger-rule', { id: ruleId });
  }
  
  toggleTriggerRuleStatus(ruleId: number): void {
    this.ipcService.send('toggle-trigger-rule-status', { id: ruleId });
  }
  
  // ==================== 輔助方法 ====================
  
  getKeywordSetName(setId: number): string {
    return this.keywordSets().find(s => s.id === setId)?.name || 'Unknown';
  }
  
  getKeywordPreview(keywords: KeywordConfig[]): string {
    if (!keywords || keywords.length === 0) return '';
    const preview = keywords.slice(0, 3).map(k => k.keyword).join(', ');
    if (keywords.length > 3) {
      return `${preview} 等 ${keywords.length} 個`;
    }
    return preview;
  }
  
  getRecommendedKeywords(): string[] {
    return this.recommendedKeywords;
  }
  
  // ==================== IPC 事件處理 ====================
  
  private setupIpcListeners(): void {
    this.ipcService.on('monitored-groups-result', (data: any) => this.handleMonitoredGroups(data));
    this.ipcService.on('keyword-sets-result', (data: any) => this.handleKeywordSets(data));
    this.ipcService.on('trigger-rules-result', (data: any) => this.handleTriggerRules(data));
    // 🔧 P0修復: 監聽所有監控狀態相關事件
    this.ipcService.on('monitoring-started', (data: any) => {
      console.log('[MonitoringManagement] monitoring-started:', data);
      this.monitoringActive.set(true);
    });
    this.ipcService.on('monitoring-stopped', () => {
      console.log('[MonitoringManagement] monitoring-stopped');
      this.monitoringActive.set(false);
    });
    this.ipcService.on('monitoring-status-changed', (active: boolean) => {
      console.log('[MonitoringManagement] monitoring-status-changed:', active);
      this.monitoringActive.set(active);
    });
    this.ipcService.on('monitoring-status', (data: { isMonitoring?: boolean; active?: boolean }) => {
      const isActive = data.isMonitoring ?? data.active ?? false;
      console.log('[MonitoringManagement] monitoring-status:', isActive);
      this.monitoringActive.set(isActive);
    });
    this.ipcService.on('group-added-to-monitor', (data: any) => this.handleGroupAdded(data));
    this.ipcService.on('keyword-set-created', (data: any) => this.handleKeywordSetCreated(data));
    this.ipcService.on('batch-join-progress', (data: any) => this.handleBatchJoinProgress(data));
    this.ipcService.on('batch-join-completed', (data: any) => this.handleBatchJoinCompleted(data));
  }
  
  private handleMonitoredGroups(data: any): void {
    if (data.success || data.groups) {
      this.monitoredGroups.set(data.groups || []);
    }
  }
  
  private handleKeywordSets(data: any): void {
    if (data.success || data.sets) {
      this.keywordSets.set(data.sets || []);
    }
  }
  
  private handleTriggerRules(data: any): void {
    if (data.success || data.rules) {
      this.triggerRules.set(data.rules || []);
    }
  }
  
  private handleGroupAdded(data: any): void {
    if (data.success) {
      this.toastService.success('群組已加入監控');
      this.loadMonitoredGroups();
    } else {
      this.toastService.error(`加入失敗: ${data.error}`);
    }
  }
  
  private handleKeywordSetCreated(data: any): void {
    if (data.success) {
      this.loadKeywordSets();
    }
  }
  
  private handleBatchJoinProgress(data: any): void {
    this.batchJoinMonitorProgress.set(data.progress || 0);
  }
  
  private handleBatchJoinCompleted(data: any): void {
    this.isBatchJoining.set(false);
    this.batchJoinMonitorProgress.set(100);
    
    if (data.success) {
      this.toastService.success(`批量加入完成: ${data.successCount}/${data.totalCount} 個群組`);
      this.loadMonitoredGroups();
    } else {
      this.toastService.error(`批量加入失敗: ${data.error}`);
    }
    
    setTimeout(() => this.closeBatchJoinMonitorDialog(), 1500);
  }
}
