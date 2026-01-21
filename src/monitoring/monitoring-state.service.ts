/**
 * 監控狀態管理服務
 * 統一管理所有監控相關的數據狀態
 * 
 * 功能：
 * 1. 集中管理帳號、群組、詞集、模版數據
 * 2. 提供配置完整度檢查
 * 3. 廣播狀態更新到所有訂閱者
 */
import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 帳號數據接口
export interface MonitoringAccount {
  id: number;
  phone: string;
  username?: string;
  firstName?: string;
  avatar?: string;
  status: 'connected' | 'disconnected' | 'error';
  isListener: boolean;
  isSender: boolean;
  healthScore?: number;
  dailySendLimit?: number;
  dailySendCount?: number;
  stats?: {
    sentToday: number;
    sentWeek: number;
    repliesWeek: number;
    conversionsWeek: number;
  };
}

// 群組數據接口
export interface MonitoringGroup {
  id: string;
  name: string;
  url?: string;
  memberCount: number;
  isMonitoring: boolean;
  linkedKeywordSets: string[];
  accountPhone?: string;
  stats?: {
    matchesToday: number;
    matchesWeek: number;
    leadsToday: number;
    leadsWeek: number;
  };
}

// 關鍵詞項接口
export interface KeywordItem {
  id: string;
  text: string;
  matchCount: number;
  isNew?: boolean;
}

// 關鍵詞集接口
export interface KeywordSet {
  id: string;
  name: string;
  keywords: KeywordItem[];
  matchMode: 'exact' | 'fuzzy' | 'regex';
  isActive: boolean;
  totalMatches: number;
}

// 聊天模版接口
export interface ChatTemplate {
  id: string;
  name: string;
  content: string;
  templateType: 'greeting' | 'follow_up' | 'promotion' | 'custom';
  variables: string[];
  usageCount: number;
  isActive: boolean;
}

// 配置步驟狀態
export interface ConfigStep {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  count?: number;
  action?: string;
  icon: string;
}

// 配置完整度狀態
export interface ConfigStatus {
  steps: ConfigStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isReady: boolean;
  nextStep?: ConfigStep;
}

@Injectable({
  providedIn: 'root'
})
export class MonitoringStateService implements OnDestroy {
  private ipcService = inject(ElectronIpcService);
  
  // === 核心數據 Signals ===
  private _accounts = signal<MonitoringAccount[]>([]);
  private _groups = signal<MonitoringGroup[]>([]);
  private _keywordSets = signal<KeywordSet[]>([]);
  private _chatTemplates = signal<ChatTemplate[]>([]);
  private _triggerRules = signal<any[]>([]);
  private _isLoading = signal(false);
  private _lastUpdated = signal<Date | null>(null);
  
  // === 公開的只讀 Signals ===
  readonly accounts = this._accounts.asReadonly();
  readonly groups = this._groups.asReadonly();
  readonly keywordSets = this._keywordSets.asReadonly();
  readonly chatTemplates = this._chatTemplates.asReadonly();
  readonly triggerRules = this._triggerRules.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly lastUpdated = this._lastUpdated.asReadonly();
  
  // === 計算屬性 ===
  
  // 帳號統計
  readonly connectedAccounts = computed(() => 
    this._accounts().filter(a => a.status === 'connected')
  );
  readonly listenerAccounts = computed(() => 
    this._accounts().filter(a => a.isListener)
  );
  readonly senderAccounts = computed(() => 
    this._accounts().filter(a => a.isSender)
  );
  
  // 群組統計
  readonly monitoringGroups = computed(() => 
    this._groups().filter(g => g.isMonitoring)
  );
  readonly totalMembers = computed(() => 
    this._groups().reduce((sum, g) => sum + g.memberCount, 0)
  );
  readonly todayMatches = computed(() => 
    this._groups().reduce((sum, g) => sum + (g.stats?.matchesToday || 0), 0)
  );
  readonly groupsWithKeywords = computed(() => 
    this._groups().filter(g => g.linkedKeywordSets.length > 0)
  );
  
  // 關鍵詞統計
  readonly activeKeywordSets = computed(() => 
    this._keywordSets().filter(s => s.isActive)
  );
  readonly totalKeywords = computed(() => 
    this._keywordSets().reduce((sum, s) => sum + s.keywords.length, 0)
  );
  readonly totalKeywordMatches = computed(() => 
    this._keywordSets().reduce((sum, s) => sum + s.totalMatches, 0)
  );
  
  // 模版統計
  readonly activeTemplates = computed(() => 
    this._chatTemplates().filter(t => t.isActive)
  );
  
  // 觸發規則統計
  readonly activeTriggerRules = computed(() => 
    this._triggerRules().filter(r => r.isActive || r.is_active)
  );
  readonly hasActiveTriggerRules = computed(() => 
    this.activeTriggerRules().length > 0
  );
  
  // === 配置完整度 ===
  readonly configStatus = computed<ConfigStatus>(() => {
    const steps: ConfigStep[] = [
      {
        id: 'listener',
        name: '監控帳號',
        description: '設置用於監控群組消息的帳號',
        isCompleted: this.listenerAccounts().some(a => a.status === 'connected'),
        count: this.listenerAccounts().length,
        action: 'add-listener',
        icon: '👤'
      },
      {
        id: 'groups',
        name: '監控群組',
        description: '添加需要監控的 Telegram 群組',
        isCompleted: this._groups().length > 0,
        count: this._groups().length,
        action: 'add-group',
        icon: '💬'
      },
      {
        id: 'keywords',
        name: '關鍵詞集',
        description: '創建用於匹配消息的關鍵詞',
        isCompleted: this._keywordSets().some(s => s.keywords.length > 0),
        count: this.totalKeywords(),
        action: 'add-keywords',
        icon: '🔑'
      },
      {
        id: 'binding',
        name: '綁定詞集',
        description: '將關鍵詞集綁定到監控群組',
        isCompleted: this.groupsWithKeywords().length > 0,
        count: this.groupsWithKeywords().length,
        action: 'bind-keywords',
        icon: '🔗'
      },
      {
        id: 'templates',
        name: '聊天模版',
        description: '設置自動回覆使用的消息模版',
        isCompleted: this._chatTemplates().length > 0,
        count: this._chatTemplates().length,
        action: 'add-template',
        icon: '📝'
      },
      {
        id: 'sender',
        name: '發送帳號',
        description: '配置用於發送消息的帳號',
        isCompleted: this.senderAccounts().some(a => a.status === 'connected'),
        count: this.senderAccounts().length,
        action: 'add-sender',
        icon: '📤'
      }
    ];
    
    const completedCount = steps.filter(s => s.isCompleted).length;
    const totalCount = steps.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    const isReady = completedCount >= 4; // 至少完成前4步才能開始
    const nextStep = steps.find(s => !s.isCompleted);
    
    return {
      steps,
      completedCount,
      totalCount,
      percentage,
      isReady,
      nextStep
    };
  });
  
  private listeners: (() => void)[] = [];
  
  constructor() {
    this.setupListeners();
  }
  
  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }
  
  private setupListeners() {
    // 監聽 initial-state 事件
    const cleanup1 = this.ipcService.on('initial-state', (data: any) => {
      this.processInitialState(data);
    });
    this.listeners.push(cleanup1);
    
    // 監聽 accounts-updated 事件
    const cleanup2 = this.ipcService.on('accounts-updated', (accounts: any[]) => {
      this.updateAccounts(accounts);
    });
    this.listeners.push(cleanup2);
    
    // 監聽 groups 更新
    const cleanup3 = this.ipcService.on('get-groups-result', (data: any) => {
      if (data.groups) {
        this.updateGroups(data.groups);
      }
    });
    this.listeners.push(cleanup3);
    
    // 監聽 keyword-sets 更新
    const cleanup4 = this.ipcService.on('get-keyword-sets-result', (data: any) => {
      if (data.keywordSets) {
        this.updateKeywordSets(data.keywordSets);
      }
    });
    this.listeners.push(cleanup4);
    
    // 監聽 chat-templates 更新
    const cleanup5 = this.ipcService.on('get-chat-templates-result', (data: any) => {
      if (data.templates) {
        this.updateChatTemplates(data.templates);
      }
    });
    this.listeners.push(cleanup5);
    
    // 監聽 templates-updated 事件（模板創建/編輯/刪除後觸發）
    const cleanup6 = this.ipcService.on('templates-updated', (data: any) => {
      if (data.chatTemplates) {
        this.updateChatTemplates(data.chatTemplates);
      } else if (data.messageTemplates) {
        this.updateChatTemplates(data.messageTemplates);
      }
    });
    this.listeners.push(cleanup6);
    
    // 監聽 trigger-rules 更新
    const cleanup7 = this.ipcService.on('trigger-rules-result', (data: any) => {
      if (data.success && data.rules) {
        this.updateTriggerRules(data.rules);
      }
    });
    this.listeners.push(cleanup7);
  }
  
  // === 數據加載 ===
  
  loadAll() {
    this._isLoading.set(true);
    this.ipcService.send('get-initial-state');
    this.ipcService.send('get-trigger-rules', {});
  }
  
  refresh() {
    this.loadAll();
  }
  
  // === 數據處理 ===
  
  private processInitialState(data: any) {
    if (data.accounts) {
      this.updateAccounts(data.accounts);
    }
    if (data.monitoredGroups) {
      this.updateGroups(data.monitoredGroups);
    }
    if (data.keywordSets) {
      this.updateKeywordSets(data.keywordSets);
    }
    if (data.chatTemplates) {
      this.updateChatTemplates(data.chatTemplates);
    }
    
    this._isLoading.set(false);
    this._lastUpdated.set(new Date());
  }
  
  private updateAccounts(rawAccounts: any[]) {
    const accounts: MonitoringAccount[] = rawAccounts.map(acc => ({
      id: acc.id || acc.phone,
      phone: acc.phone || '',
      username: acc.nickname || acc.username || acc.firstName || '',
      firstName: acc.first_name || acc.firstName || '',
      avatar: acc.avatar || acc.photo || '',
      status: (acc.status === 'Online' ? 'connected' : 
               acc.status === 'Error' ? 'error' : 'disconnected') as 'connected' | 'disconnected' | 'error',
      isListener: acc.role === 'Listener',
      isSender: acc.role === 'Sender',
      healthScore: acc.healthScore || 100,
      dailySendLimit: acc.dailySendLimit || 50,
      dailySendCount: acc.dailySendCount || 0,
      stats: { 
        sentToday: acc.dailyMessageCount || 0, 
        sentWeek: acc.weeklyMessageCount || 0, 
        repliesWeek: 0, 
        conversionsWeek: 0 
      }
    }));
    
    this._accounts.set(accounts);
  }
  
  private updateGroups(rawGroups: any[]) {
    console.log('[StateService] ========== updateGroups ==========');
    console.log('[StateService] Raw groups count:', rawGroups?.length);
    
    const groups: MonitoringGroup[] = rawGroups.map(g => {
      const keywordSetIds = g.keywordSetIds || g.keyword_set_ids || [];
      const linkedKeywordSets = keywordSetIds.map((id: any) => String(id));
      
      console.log(`[StateService] Group ${g.id} "${g.name}": keywordSetIds=`, keywordSetIds, 'linkedKeywordSets=', linkedKeywordSets);
      
      return {
        id: String(g.id),
        name: g.name || g.title || g.url || '未知群組',
        url: g.url || g.link || '',
        memberCount: g.memberCount || g.member_count || 0,
        isMonitoring: g.is_active !== false,
        linkedKeywordSets,
        accountPhone: g.phone || g.account_phone,
        stats: { 
          matchesToday: g.matchesToday || 0, 
          matchesWeek: g.matchesWeek || 0, 
          leadsToday: g.leadsToday || 0, 
          leadsWeek: g.leadsWeek || 0
        }
      };
    });
    
    this._groups.set(groups);
    console.log('[StateService] Groups updated, total:', groups.length);
  }

  /**
   * 更新單個群組的關鍵詞集綁定
   */
  updateGroupKeywordSets(groupId: string, linkedKeywordSets: string[]) {
    this._groups.update(groups => 
      groups.map(g => 
        g.id === groupId 
          ? { ...g, linkedKeywordSets } 
          : g
      )
    );
  }
  
  private updateKeywordSets(rawSets: any[]) {
    const sets: KeywordSet[] = rawSets.map(s => {
      let keywords: KeywordItem[] = [];
      if (s.keywords) {
        if (typeof s.keywords === 'string') {
          try {
            const parsed = JSON.parse(s.keywords);
            keywords = Array.isArray(parsed) ? parsed.map((k: any, idx: number) => ({
              id: String(k.id || idx),
              text: typeof k === 'string' ? k : (k.text || k.keyword || ''),
              matchCount: k.matchCount || 0,
              isNew: false
            })) : [];
          } catch {
            keywords = [];
          }
        } else if (Array.isArray(s.keywords)) {
          keywords = s.keywords.map((k: any, idx: number) => ({
            id: String(k.id || idx),
            text: typeof k === 'string' ? k : (k.text || k.keyword || ''),
            matchCount: k.matchCount || 0,
            isNew: false
          }));
        }
      }
      
      return {
        id: String(s.id),
        name: s.name,
        keywords,
        matchMode: (s.matchMode || 'fuzzy') as 'exact' | 'fuzzy' | 'regex',
        isActive: s.is_active !== false && s.isActive !== false,
        totalMatches: keywords.reduce((sum, k) => sum + (k.matchCount || 0), 0)
      };
    });
    
    this._keywordSets.set(sets);
  }
  
  private updateChatTemplates(rawTemplates: any[]) {
    const templates: ChatTemplate[] = rawTemplates.map(t => {
      let variables: string[] = [];
      if (t.variables) {
        if (typeof t.variables === 'string') {
          try {
            variables = JSON.parse(t.variables);
          } catch {
            variables = [];
          }
        } else if (Array.isArray(t.variables)) {
          variables = t.variables;
        }
      }

      return {
        id: String(t.id),
        name: t.name,
        content: t.content || '',
        templateType: (t.template_type || t.templateType || 'custom') as ChatTemplate['templateType'],
        variables,
        usageCount: t.usage_count || t.usageCount || 0,
        isActive: t.is_active !== false && t.isActive !== false
      };
    });
    
    this._chatTemplates.set(templates);
  }
  
  private updateTriggerRules(rawRules: any[]) {
    // 轉換規則數據，統一字段名
    const rules = rawRules.map(r => ({
      ...r,
      id: r.id,
      name: r.name,
      isActive: r.is_active === 1 || r.isActive === true,
      responseType: r.response_type || r.responseType,
      triggerCount: r.trigger_count || r.triggerCount || 0,
      successCount: r.success_count || r.successCount || 0
    }));
    
    this._triggerRules.set(rules);
    console.log('[StateService] Trigger rules updated, total:', rules.length, 'active:', rules.filter(r => r.isActive).length);
  }
  
  // === 輔助方法 ===
  
  getKeywordSetById(id: string): KeywordSet | undefined {
    return this._keywordSets().find(s => s.id === id);
  }
  
  getKeywordSetName(id: string): string {
    const set = this.getKeywordSetById(id);
    return set ? set.name : `詞集 ${id}`;
  }
  
  getAccountById(id: number): MonitoringAccount | undefined {
    return this._accounts().find(a => a.id === id);
  }
  
  getGroupById(id: string): MonitoringGroup | undefined {
    return this._groups().find(g => g.id === id);
  }
}
