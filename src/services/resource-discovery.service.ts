/**
 * 資源發現服務
 * Resource Discovery Service
 * 
 * 處理群組搜索、成員提取等資源發現相關邏輯
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { TelegramAccount } from '../models';

// ============ 類型定義 ============

export type SearchSource = 'telegram' | 'jiso' | 'all';

export interface DiscoveredResource {
  id: string;
  type: 'group' | 'channel' | 'user';
  title: string;
  username?: string;
  description?: string;
  memberCount?: number;
  source: SearchSource;
  accessHash?: string;
  isPublic?: boolean;
  isVerified?: boolean;
  photo?: string;
  addedAt?: string;
}

export interface SearchResult {
  query: string;
  source: SearchSource;
  results: DiscoveredResource[];
  timestamp: number;
  totalCount: number;
}

export interface SearchState {
  isSearching: boolean;
  query: string;
  progress: number;
  currentSource: SearchSource | null;
  error: string | null;
}

export interface ResourceStats {
  totalDiscovered: number;
  groups: number;
  channels: number;
  users: number;
  todayDiscovered: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ResourceDiscoveryService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  private _initialized = signal(false);
  private _selectedAccountId = signal<number | null>(null);
  private _searchState = signal<SearchState>({
    isSearching: false,
    query: '',
    progress: 0,
    currentSource: null,
    error: null
  });
  private _results = signal<DiscoveredResource[]>([]);
  private _savedResources = signal<DiscoveredResource[]>([]);
  private _searchHistory = signal<string[]>([]);
  private _stats = signal<ResourceStats>({
    totalDiscovered: 0,
    groups: 0,
    channels: 0,
    users: 0,
    todayDiscovered: 0
  });
  
  // 搜索結果緩存
  private searchCache = new Map<string, SearchResult>();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 分鐘
  
  // ========== 公開狀態 ==========
  initialized = this._initialized.asReadonly();
  selectedAccountId = this._selectedAccountId.asReadonly();
  searchState = this._searchState.asReadonly();
  results = this._results.asReadonly();
  savedResources = this._savedResources.asReadonly();
  searchHistory = this._searchHistory.asReadonly();
  stats = this._stats.asReadonly();
  
  // ========== 計算屬性 ==========
  isSearching = computed(() => this._searchState().isSearching);
  searchProgress = computed(() => this._searchState().progress);
  
  groupResults = computed(() => 
    this._results().filter(r => r.type === 'group')
  );
  
  channelResults = computed(() => 
    this._results().filter(r => r.type === 'channel')
  );
  
  userResults = computed(() => 
    this._results().filter(r => r.type === 'user')
  );
  
  // ========== 初始化 ==========
  
  async initialize(accounts: TelegramAccount[]): Promise<boolean> {
    // 選擇最佳帳號
    const account = this.selectBestAccount(accounts);
    if (!account) {
      this.toast.error('沒有可用的在線帳號');
      return false;
    }
    
    this._selectedAccountId.set(account.id);
    
    return new Promise((resolve) => {
      this.ipc.send('init-resource-discovery', {
        accountId: account.id,
        phone: account.phone
      });
      
      // 假設初始化成功
      setTimeout(() => {
        this._initialized.set(true);
        resolve(true);
      }, 1000);
    });
  }
  
  private selectBestAccount(accounts: TelegramAccount[]): TelegramAccount | null {
    const online = accounts.filter(a => a.status === 'Online');
    if (online.length === 0) return null;
    
    // 優先級：Explorer > Listener > Sender > 其他
    const priority: Record<string, number> = {
      'Explorer': 1,
      'Listener': 2,
      'Sender': 3,
      'AI': 4,
      'Backup': 5,
      'Unassigned': 6
    };
    
    return online.sort((a, b) => 
      (priority[a.role] || 99) - (priority[b.role] || 99)
    )[0];
  }
  
  // ========== 搜索操作 ==========
  
  async search(query: string, sources: SearchSource[] = ['telegram']): Promise<DiscoveredResource[]> {
    if (!query.trim()) {
      this.toast.warning('請輸入搜索關鍵詞');
      return [];
    }
    
    // 檢查緩存
    const cacheKey = this.generateCacheKey(query, sources);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this._results.set(cached.results);
      return cached.results;
    }
    
    // 開始搜索
    this._searchState.set({
      isSearching: true,
      query,
      progress: 0,
      currentSource: sources[0],
      error: null
    });
    
    this._results.set([]);
    
    // 添加到搜索歷史
    this.addToHistory(query);
    
    // 發送搜索請求
    this.ipc.send('search-resources', {
      query,
      sources,
      accountId: this._selectedAccountId()
    });
    
    return [];
  }
  
  handleSearchResults(data: { results: DiscoveredResource[]; source: SearchSource; isComplete: boolean }): void {
    // 合併結果
    this._results.update(existing => {
      const newResults = [...existing];
      for (const result of data.results) {
        if (!newResults.some(r => r.id === result.id)) {
          newResults.push(result);
        }
      }
      return newResults;
    });
    
    // 更新進度
    this._searchState.update(state => ({
      ...state,
      progress: data.isComplete ? 100 : state.progress + 20,
      currentSource: data.source
    }));
    
    if (data.isComplete) {
      this.completeSearch();
    }
  }
  
  handleSearchError(error: string): void {
    this._searchState.update(state => ({
      ...state,
      isSearching: false,
      error
    }));
    this.toast.error(`搜索失敗: ${error}`);
  }
  
  private completeSearch(): void {
    const state = this._searchState();
    const results = this._results();
    
    // 緩存結果
    const cacheKey = this.generateCacheKey(state.query, ['telegram']);
    this.searchCache.set(cacheKey, {
      query: state.query,
      source: 'telegram',
      results,
      timestamp: Date.now(),
      totalCount: results.length
    });
    
    // 更新狀態
    this._searchState.update(s => ({
      ...s,
      isSearching: false,
      progress: 100
    }));
    
    // 更新統計
    this.updateStats();
    
    this.toast.success(`找到 ${results.length} 個結果`);
  }
  
  cancelSearch(): void {
    this.ipc.send('cancel-search');
    this._searchState.update(state => ({
      ...state,
      isSearching: false,
      progress: 0
    }));
  }
  
  clearResults(): void {
    this._results.set([]);
    this._searchState.update(state => ({
      ...state,
      query: '',
      progress: 0,
      error: null
    }));
  }
  
  // ========== 資源操作 ==========
  
  async saveResource(resource: DiscoveredResource): Promise<boolean> {
    if (this._savedResources().some(r => r.id === resource.id)) {
      this.toast.info('此資源已保存');
      return false;
    }
    
    const saved = { ...resource, addedAt: new Date().toISOString() };
    this._savedResources.update(list => [...list, saved]);
    
    this.ipc.send('save-resource', { resource: saved });
    this.toast.success('資源已保存');
    
    return true;
  }
  
  removeResource(resourceId: string): void {
    this._savedResources.update(list => list.filter(r => r.id !== resourceId));
    this.ipc.send('remove-resource', { resourceId });
  }
  
  async joinGroup(resource: DiscoveredResource): Promise<boolean> {
    if (resource.type !== 'group' && resource.type !== 'channel') {
      this.toast.error('只能加入群組或頻道');
      return false;
    }
    
    this.ipc.send('join-group', {
      username: resource.username,
      accessHash: resource.accessHash,
      accountId: this._selectedAccountId()
    });
    
    this.toast.info(`正在加入 ${resource.title}...`);
    return true;
  }
  
  async extractMembers(resource: DiscoveredResource, limit: number = 100): Promise<void> {
    if (resource.type !== 'group') {
      this.toast.error('只能從群組提取成員');
      return;
    }
    
    // 🆕 Phase2: 補全所有關鍵字段（之前缺少 resourceId, telegramId, username, phone）
    this.ipc.send('extract-members', {
      resourceId: resource.id,
      groupId: resource.id,  // 保持向後兼容
      telegramId: resource.telegram_id || null,
      username: resource.username || null,
      groupName: resource.title,
      phone: (resource as any).joined_phone || (resource as any).joined_by_phone || null,
      limit,
      offset: 0
    });
    
    this.toast.info(`正在提取成員...`);
  }
  
  // ========== 輔助方法 ==========
  
  private generateCacheKey(query: string, sources: SearchSource[]): string {
    const normalizedQuery = query.toLowerCase().trim();
    const sortedSources = [...sources].sort().join(',');
    return `${normalizedQuery}|${sortedSources}`;
  }
  
  private getFromCache(cacheKey: string): SearchResult | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.searchCache.delete(cacheKey);
      return null;
    }
    
    return cached;
  }
  
  private addToHistory(query: string): void {
    this._searchHistory.update(history => {
      const filtered = history.filter(h => h !== query);
      return [query, ...filtered].slice(0, 20);
    });
  }
  
  clearHistory(): void {
    this._searchHistory.set([]);
  }
  
  private updateStats(): void {
    const results = this._results();
    const saved = this._savedResources();
    
    this._stats.set({
      totalDiscovered: saved.length,
      groups: saved.filter(r => r.type === 'group').length,
      channels: saved.filter(r => r.type === 'channel').length,
      users: saved.filter(r => r.type === 'user').length,
      todayDiscovered: results.length
    });
  }
  
  refreshStats(): void {
    this.ipc.send('get-resource-stats');
  }
  
  setStats(stats: ResourceStats): void {
    this._stats.set(stats);
  }
  
  selectAccount(accountId: number): void {
    this._selectedAccountId.set(accountId);
    this._initialized.set(false);
  }
}
