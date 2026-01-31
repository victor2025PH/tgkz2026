/**
 * 應用狀態管理服務
 * App State Management Service
 * 
 * 集中管理應用核心狀態，減少 app.component.ts 的複雜度
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { TelegramAccount, MonitoredGroup, KeywordSet, MessageTemplate } from '../models';

// ============ 視圖類型 ============

export type AppView = 
  | 'dashboard' 
  | 'accounts' 
  | 'add-account' 
  | 'api-credentials' 
  | 'resources' 
  | 'member-database' 
  | 'resource-center' 
  | 'search-discovery' 
  | 'ai-assistant' 
  | 'automation' 
  | 'automation-legacy' 
  | 'leads' 
  | 'lead-nurturing' 
  | 'nurturing-analytics' 
  | 'ads' 
  | 'user-tracking' 
  | 'campaigns' 
  | 'multi-role' 
  | 'ai-team' 
  | 'ai-center' 
  | 'settings' 
  | 'analytics' 
  | 'analytics-center' 
  | 'logs' 
  | 'performance' 
  | 'alerts' 
  | 'profile' 
  | 'membership-center' 
  | 'monitoring-accounts' 
  | 'monitoring-groups' 
  | 'keyword-sets' 
  | 'chat-templates' 
  | 'trigger-rules' 
  | 'collected-users';

export type ConnectionState = 'connecting' | 'connected' | 'timeout' | 'error';

// ============ 導航模組定義 ============

export interface NavModule {
  id: string;
  name: string;
  icon: string;
  views: NavView[];
  badge?: number;
}

export interface NavView {
  id: AppView;
  name: string;
  icon: string;
  badge?: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  
  // ========== 連接狀態 ==========
  private _backendConnectionState = signal<ConnectionState>('connecting');
  private _backendConnectionMessage = signal('正在連接後端服務...');
  private _backendConnectionProgress = signal(0);
  
  backendConnectionState = this._backendConnectionState.asReadonly();
  backendConnectionMessage = this._backendConnectionMessage.asReadonly();
  backendConnectionProgress = this._backendConnectionProgress.asReadonly();
  
  isConnected = computed(() => this._backendConnectionState() === 'connected');
  
  // ========== 當前視圖 ==========
  private _currentView = signal<AppView>('dashboard');
  private _previousView = signal<AppView | null>(null);
  private _sidebarCollapsed = signal(false);
  
  currentView = this._currentView.asReadonly();
  previousView = this._previousView.asReadonly();
  sidebarCollapsed = this._sidebarCollapsed.asReadonly();
  
  // ========== 帳號狀態 ==========
  private _accounts = signal<TelegramAccount[]>([]);
  private _selectedAccountId = signal<number | null>(null);
  
  accounts = this._accounts.asReadonly();
  selectedAccountId = this._selectedAccountId.asReadonly();
  
  selectedAccount = computed(() => {
    const id = this._selectedAccountId();
    return id ? this._accounts().find(a => a.id === id) : null;
  });
  
  onlineAccounts = computed(() => 
    this._accounts().filter(a => a.status === 'Online')
  );
  
  accountStats = computed(() => {
    const accounts = this._accounts();
    return {
      total: accounts.length,
      online: accounts.filter(a => a.status === 'Online').length,
      offline: accounts.filter(a => a.status === 'Offline').length,
      error: accounts.filter(a => a.status === 'Error' || a.status === 'Banned').length
    };
  });
  
  // ========== 監控狀態 ==========
  private _groups = signal<MonitoredGroup[]>([]);
  private _keywordSets = signal<KeywordSet[]>([]);
  private _templates = signal<MessageTemplate[]>([]);
  private _isMonitoring = signal(false);
  
  groups = this._groups.asReadonly();
  keywordSets = this._keywordSets.asReadonly();
  templates = this._templates.asReadonly();
  isMonitoring = this._isMonitoring.asReadonly();
  
  monitoringStats = computed(() => {
    const groups = this._groups();
    const keywordSets = this._keywordSets();
    return {
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.isActive).length,
      totalKeywords: keywordSets.reduce((sum, ks) => sum + (ks.keywords?.length || 0), 0),
      activeKeywordSets: keywordSets.filter(ks => ks.is_active).length
    };
  });
  
  // ========== Loading 狀態 ==========
  private _isLoading = signal(false);
  private _loadingMessage = signal('');
  
  isLoading = this._isLoading.asReadonly();
  loadingMessage = this._loadingMessage.asReadonly();
  
  // ========== 導航模組 ==========
  readonly navModules: NavModule[] = [
    {
      id: 'dashboard',
      name: '工作台',
      icon: '📊',
      views: [
        { id: 'dashboard', name: '總覽', icon: '🏠' },
        { id: 'analytics-center', name: '數據分析', icon: '📈' }
      ]
    },
    {
      id: 'accounts',
      name: '帳號管理',
      icon: '👤',
      views: [
        { id: 'accounts', name: '帳號列表', icon: '📱' },
        { id: 'add-account', name: '添加帳號', icon: '➕' },
        { id: 'api-credentials', name: 'API 憑證', icon: '🔑' }
      ]
    },
    {
      id: 'automation',
      name: '自動化中心',
      icon: '🤖',
      views: [
        { id: 'automation', name: '自動化面板', icon: '⚡' },
        { id: 'monitoring-accounts', name: '監控帳號', icon: '👁️' },
        { id: 'monitoring-groups', name: '監控群組', icon: '💬' },
        { id: 'keyword-sets', name: '關鍵詞集', icon: '🔤' },
        { id: 'chat-templates', name: '話術模板', icon: '📝' },
        { id: 'trigger-rules', name: '觸發規則', icon: '🎯' },
        { id: 'collected-users', name: '收集用戶', icon: '👥' }
      ]
    },
    {
      id: 'resources',
      name: '資源中心',
      icon: '📦',
      views: [
        { id: 'search-discovery', name: '搜索發現', icon: '🔍' },
        { id: 'member-database', name: '成員資料庫', icon: '👥' },
        { id: 'resource-center', name: '資源管理', icon: '📁' }
      ]
    },
    {
      id: 'leads',
      name: '客戶培育',
      icon: '🎯',
      views: [
        { id: 'lead-nurturing', name: '線索管理', icon: '📋' },
        { id: 'nurturing-analytics', name: '培育分析', icon: '📊' }
      ]
    },
    {
      id: 'ai',
      name: 'AI 中心',
      icon: '🧠',
      views: [
        { id: 'ai-center', name: 'AI 配置', icon: '⚙️' },
        { id: 'ai-assistant', name: 'AI 助手', icon: '💬' },
        { id: 'ai-team', name: 'AI 團隊', icon: '👥' },
        { id: 'multi-role', name: '多角色協作', icon: '🎭' }
      ]
    },
    {
      id: 'system',
      name: '系統設置',
      icon: '⚙️',
      views: [
        { id: 'settings', name: '系統設置', icon: '🔧' },
        { id: 'profile', name: '個人資料', icon: '👤' },
        { id: 'membership-center', name: '會員中心', icon: '💎' }
      ]
    }
  ];
  
  // ========== 狀態更新方法 ==========
  
  setConnectionState(state: ConnectionState, message?: string): void {
    this._backendConnectionState.set(state);
    if (message) {
      this._backendConnectionMessage.set(message);
    }
  }
  
  setConnectionProgress(progress: number): void {
    this._backendConnectionProgress.set(progress);
  }
  
  navigateTo(view: AppView): void {
    this._previousView.set(this._currentView());
    this._currentView.set(view);
  }
  
  goBack(): void {
    const prev = this._previousView();
    if (prev) {
      this._currentView.set(prev);
      this._previousView.set(null);
    }
  }
  
  toggleSidebar(): void {
    this._sidebarCollapsed.update(v => !v);
  }
  
  setSidebarCollapsed(collapsed: boolean): void {
    this._sidebarCollapsed.set(collapsed);
  }
  
  setAccounts(accounts: TelegramAccount[]): void {
    this._accounts.set(accounts);
  }
  
  updateAccount(account: TelegramAccount): void {
    this._accounts.update(list => 
      list.map(a => a.id === account.id ? account : a)
    );
  }
  
  addAccount(account: TelegramAccount): void {
    this._accounts.update(list => [...list, account]);
  }
  
  removeAccount(accountId: number): void {
    this._accounts.update(list => list.filter(a => a.id !== accountId));
  }
  
  selectAccount(accountId: number | null): void {
    this._selectedAccountId.set(accountId);
  }
  
  setGroups(groups: MonitoredGroup[]): void {
    this._groups.set(groups);
  }
  
  setKeywordSets(sets: KeywordSet[]): void {
    this._keywordSets.set(sets);
  }
  
  setTemplates(templates: MessageTemplate[]): void {
    this._templates.set(templates);
  }
  
  setMonitoring(active: boolean): void {
    this._isMonitoring.set(active);
  }
  
  setLoading(loading: boolean, message?: string): void {
    this._isLoading.set(loading);
    if (message !== undefined) {
      this._loadingMessage.set(message);
    }
  }
  
  // ========== 輔助方法 ==========
  
  getModuleForView(view: AppView): NavModule | undefined {
    return this.navModules.find(m => m.views.some(v => v.id === view));
  }
  
  getViewInfo(view: AppView): NavView | undefined {
    for (const module of this.navModules) {
      const found = module.views.find(v => v.id === view);
      if (found) return found;
    }
    return undefined;
  }
  
  getBreadcrumb(): { module: NavModule; view: NavView } | null {
    const view = this._currentView();
    const module = this.getModuleForView(view);
    const viewInfo = this.getViewInfo(view);
    
    if (module && viewInfo) {
      return { module, view: viewInfo };
    }
    return null;
  }
}
