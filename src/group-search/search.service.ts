/**
 * TG-AI智控王 群組搜索服務
 * Group Search Service v1.0
 * 
 * 功能：
 * - 多搜索源聚合
 * - 結果標準化
 * - 緩存管理
 * - 搜索歷史
 */
import { Injectable, signal, computed, inject, WritableSignal } from '@angular/core';
import { ElectronIpcService as IpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MembershipService } from '../membership.service';
import {
  SearchSource,
  SearchSourceConfig,
  SearchQuery,
  SearchFilters,
  SearchResult,
  GroupSearchItem,
  GroupDetailInfo,
  GroupBasicInfo,
  SearchHistory,
  FavoriteGroup,
  SearchCache
} from './search.types';

// ============ 搜索源配置 ============

const DEFAULT_SEARCH_SOURCES: SearchSourceConfig[] = [
  {
    id: 'telegram',
    name: 'Telegram 官方',
    icon: '✈️',
    enabled: true,
    status: 'available',
    rateLimit: 20,
    description: 'TG 官方搜索 API',
    requiredLevel: 'bronze'
  },
  {
    id: 'jiso',
    name: '極搜',
    icon: '🔍',
    enabled: true,
    status: 'checking',
    rateLimit: 10,
    description: '極搜 Bot 對接',
    requiredLevel: 'silver'
  },
  {
    id: 'tgstat',
    name: 'TGStat',
    icon: '📊',
    enabled: false,
    status: 'unavailable',
    rateLimit: 30,
    description: 'TGStat 數據分析平台',
    requiredLevel: 'gold'
  },
  {
    id: 'local',
    name: '本地索引',
    icon: '💾',
    enabled: true,
    status: 'available',
    rateLimit: 100,
    description: '本地群組數據庫',
    requiredLevel: 'bronze'
  }
];

// ============ 配額配置 ============

const SEARCH_QUOTAS: Record<string, { searches: number; sources: number }> = {
  bronze: { searches: 5, sources: 1 },
  silver: { searches: 20, sources: 2 },
  gold: { searches: 50, sources: 3 },
  diamond: { searches: 200, sources: 4 },
  star: { searches: 500, sources: 4 },
  king: { searches: -1, sources: 4 }  // -1 = 無限
};

@Injectable({
  providedIn: 'root'
})
export class GroupSearchService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  private membershipService = inject(MembershipService);
  
  // ============ 狀態 ============
  
  // 搜索源
  private _searchSources: WritableSignal<SearchSourceConfig[]> = signal(DEFAULT_SEARCH_SOURCES);
  
  // 搜索狀態
  private _isSearching = signal(false);
  private _currentQuery = signal<SearchQuery | null>(null);
  private _searchResults = signal<SearchResult | null>(null);
  private _searchError = signal<string | null>(null);
  
  // 搜索歷史與收藏
  private _searchHistory = signal<SearchHistory[]>([]);
  private _favorites = signal<FavoriteGroup[]>([]);
  
  // 緩存
  private searchCache: Map<string, SearchCache> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000;  // 5分鐘緩存
  
  // 今日搜索計數
  private _todaySearchCount = signal(0);
  private lastSearchDate: string = '';
  
  // ============ 計算屬性 ============
  
  searchSources = computed(() => this._searchSources());
  isSearching = computed(() => this._isSearching());
  currentQuery = computed(() => this._currentQuery());
  searchResults = computed(() => this._searchResults());
  searchError = computed(() => this._searchError());
  searchHistory = computed(() => this._searchHistory());
  favorites = computed(() => this._favorites());
  todaySearchCount = computed(() => this._todaySearchCount());
  
  // 可用搜索源
  availableSources = computed(() => {
    const level = this.membershipService.level();
    return this._searchSources().filter(source => {
      const levelRank = this.membershipService.levelRank();
      const requiredRank = this.getLevelRank(source.requiredLevel);
      return source.enabled && source.status === 'available' && levelRank >= requiredRank;
    });
  });
  
  // 搜索配額
  searchQuota = computed(() => {
    const level = this.membershipService.level();
    return SEARCH_QUOTAS[level] || SEARCH_QUOTAS.bronze;
  });
  
  // 剩餘搜索次數
  remainingSearches = computed(() => {
    const quota = this.searchQuota();
    if (quota.searches === -1) return -1;
    return Math.max(0, quota.searches - this._todaySearchCount());
  });
  
  // 是否可以搜索
  canSearch = computed(() => {
    const remaining = this.remainingSearches();
    return remaining === -1 || remaining > 0;
  });
  
  constructor() {
    this.loadFromStorage();
    this.checkSearchSources();
    this.resetDailyCountIfNeeded();
  }
  
  // ============ 初始化 ============
  
  private loadFromStorage(): void {
    try {
      // 加載搜索歷史
      const historyJson = localStorage.getItem('tgai-search-history');
      if (historyJson) {
        const history = JSON.parse(historyJson);
        this._searchHistory.set(history.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        })));
      }
      
      // 加載收藏
      const favoritesJson = localStorage.getItem('tgai-favorites');
      if (favoritesJson) {
        const favorites = JSON.parse(favoritesJson);
        this._favorites.set(favorites.map((f: any) => ({
          ...f,
          addedAt: new Date(f.addedAt)
        })));
      }
      
      // 加載今日搜索計數
      const countData = localStorage.getItem('tgai-search-count');
      if (countData) {
        const { date, count } = JSON.parse(countData);
        this.lastSearchDate = date;
        if (date === this.getTodayDate()) {
          this._todaySearchCount.set(count);
        }
      }
    } catch (e) {
      console.error('Failed to load search data:', e);
    }
  }
  
  private saveToStorage(): void {
    try {
      localStorage.setItem('tgai-search-history', JSON.stringify(this._searchHistory()));
      localStorage.setItem('tgai-favorites', JSON.stringify(this._favorites()));
      localStorage.setItem('tgai-search-count', JSON.stringify({
        date: this.getTodayDate(),
        count: this._todaySearchCount()
      }));
    } catch (e) {
      console.error('Failed to save search data:', e);
    }
  }
  
  private resetDailyCountIfNeeded(): void {
    const today = this.getTodayDate();
    if (this.lastSearchDate !== today) {
      this._todaySearchCount.set(0);
      this.lastSearchDate = today;
      this.saveToStorage();
    }
  }
  
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }
  
  private getLevelRank(level: string): number {
    const ranks: Record<string, number> = {
      bronze: 0, silver: 1, gold: 2, diamond: 3, star: 4, king: 5
    };
    return ranks[level] || 0;
  }
  
  // ============ 搜索源管理 ============
  
  private async checkSearchSources(): Promise<void> {
    const sources = this._searchSources();
    
    for (const source of sources) {
      if (source.enabled) {
        this.checkSourceStatus(source.id);
      }
    }
  }
  
  private async checkSourceStatus(sourceId: SearchSource): Promise<void> {
    const sources = this._searchSources();
    const sourceIndex = sources.findIndex(s => s.id === sourceId);
    if (sourceIndex === -1) return;
    
    // 更新為檢查中
    this._searchSources.update(list => {
      const newList = [...list];
      newList[sourceIndex] = { ...newList[sourceIndex], status: 'checking' };
      return newList;
    });
    
    try {
      // 通過 IPC 檢查搜索源狀態
      const result = await this.ipcService.invoke('check-search-source', { source: sourceId });
      
      this._searchSources.update(list => {
        const newList = [...list];
        newList[sourceIndex] = { 
          ...newList[sourceIndex], 
          status: result.available ? 'available' : 'unavailable',
          lastCheck: new Date()
        };
        return newList;
      });
    } catch {
      this._searchSources.update(list => {
        const newList = [...list];
        newList[sourceIndex] = { ...newList[sourceIndex], status: 'unavailable' };
        return newList;
      });
    }
  }
  
  toggleSource(sourceId: SearchSource, enabled: boolean): void {
    this._searchSources.update(list => 
      list.map(s => s.id === sourceId ? { ...s, enabled } : s)
    );
  }
  
  // ============ 搜索功能 ============
  
  /**
   * 執行搜索
   */
  async search(keyword: string, options?: Partial<SearchQuery>): Promise<SearchResult | null> {
    // 檢查配額
    if (!this.canSearch()) {
      const quota = this.searchQuota();
      this.toastService.warning(`今日搜索次數已用完 (${quota.searches}次)，請升級會員`);
      return null;
    }
    
    if (!keyword.trim()) {
      this.toastService.warning('請輸入搜索關鍵詞');
      return null;
    }
    
    // 構建查詢
    const query: SearchQuery = {
      keyword: keyword.trim(),
      sources: options?.sources || this.getDefaultSources(),
      filters: options?.filters || {},
      page: options?.page || 1,
      limit: options?.limit || 20
    };
    
    // 檢查緩存
    const cacheKey = this.getCacheKey(query);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this._searchResults.set(cached);
      return cached;
    }
    
    this._isSearching.set(true);
    this._currentQuery.set(query);
    this._searchError.set(null);
    
    try {
      const startTime = Date.now();
      
      // 通過 IPC 執行搜索
      const result = await this.ipcService.invoke('search-groups', query);
      
      if (result.success) {
        const searchResult: SearchResult = {
          query,
          groups: result.data.groups || [],
          totalCount: result.data.totalCount || 0,
          hasMore: result.data.hasMore || false,
          sources: result.data.sources || [],
          searchTime: Date.now() - startTime,
          timestamp: new Date()
        };
        
        // 更新結果
        this._searchResults.set(searchResult);
        
        // 緩存結果
        this.addToCache(cacheKey, searchResult);
        
        // 添加到歷史
        this.addToHistory(query, searchResult.totalCount);
        
        // 增加計數
        this._todaySearchCount.update(n => n + 1);
        this.saveToStorage();
        
        return searchResult;
      } else {
        throw new Error(result.message || '搜索失敗');
      }
    } catch (error: any) {
      const errorMessage = error.message || '搜索出錯，請稍後重試';
      this._searchError.set(errorMessage);
      this.toastService.error(errorMessage);
      return null;
    } finally {
      this._isSearching.set(false);
    }
  }
  
  /**
   * 加載更多結果
   */
  async loadMore(): Promise<boolean> {
    const currentResult = this._searchResults();
    const currentQuery = this._currentQuery();
    
    if (!currentResult || !currentQuery || !currentResult.hasMore) {
      return false;
    }
    
    const nextQuery: SearchQuery = {
      ...currentQuery,
      page: currentQuery.page + 1
    };
    
    this._isSearching.set(true);
    
    try {
      const result = await this.ipcService.invoke('search-groups', nextQuery);
      
      if (result.success) {
        const newGroups = result.data.groups || [];
        
        this._searchResults.update(r => r ? {
          ...r,
          groups: [...r.groups, ...newGroups],
          hasMore: result.data.hasMore,
          query: nextQuery
        } : null);
        
        this._currentQuery.set(nextQuery);
        
        return newGroups.length > 0;
      }
      
      return false;
    } catch {
      return false;
    } finally {
      this._isSearching.set(false);
    }
  }
  
  /**
   * 清除搜索結果
   */
  clearResults(): void {
    this._searchResults.set(null);
    this._currentQuery.set(null);
    this._searchError.set(null);
  }
  
  private getDefaultSources(): SearchSource[] {
    const available = this.availableSources();
    const quota = this.searchQuota();
    return available.slice(0, quota.sources).map(s => s.id);
  }
  
  // ============ 緩存管理 ============
  
  private getCacheKey(query: SearchQuery): string {
    return JSON.stringify({
      keyword: query.keyword.toLowerCase(),
      sources: query.sources.sort(),
      filters: query.filters,
      page: query.page
    });
  }
  
  private getFromCache(key: string): SearchResult | null {
    const cached = this.searchCache.get(key);
    if (cached && cached.expiresAt > new Date()) {
      return cached.result;
    }
    this.searchCache.delete(key);
    return null;
  }
  
  private addToCache(key: string, result: SearchResult): void {
    this.searchCache.set(key, {
      key,
      query: result.query,
      result,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_DURATION)
    });
    
    // 清理過期緩存
    this.cleanExpiredCache();
  }
  
  private cleanExpiredCache(): void {
    const now = new Date();
    for (const [key, cache] of this.searchCache.entries()) {
      if (cache.expiresAt <= now) {
        this.searchCache.delete(key);
      }
    }
  }
  
  clearCache(): void {
    this.searchCache.clear();
  }
  
  // ============ 搜索歷史 ============
  
  private addToHistory(query: SearchQuery, resultsCount: number): void {
    const historyItem: SearchHistory = {
      id: `h_${Date.now()}`,
      query,
      resultsCount,
      timestamp: new Date()
    };
    
    this._searchHistory.update(history => {
      // 去重：如果已有相同關鍵詞的搜索，移除舊的
      const filtered = history.filter(h => 
        h.query.keyword.toLowerCase() !== query.keyword.toLowerCase()
      );
      // 最多保留 50 條
      return [historyItem, ...filtered].slice(0, 50);
    });
    
    this.saveToStorage();
  }
  
  removeFromHistory(id: string): void {
    this._searchHistory.update(history => history.filter(h => h.id !== id));
    this.saveToStorage();
  }
  
  clearHistory(): void {
    this._searchHistory.set([]);
    this.saveToStorage();
  }
  
  // ============ 收藏管理 ============
  
  addToFavorites(group: GroupBasicInfo, notes?: string, tags?: string[]): void {
    const favorite: FavoriteGroup = {
      id: `f_${group.id}`,
      group,
      addedAt: new Date(),
      notes,
      tags
    };
    
    this._favorites.update(favorites => {
      // 檢查是否已收藏
      if (favorites.some(f => f.group.id === group.id)) {
        this.toastService.info('該群組已在收藏中');
        return favorites;
      }
      this.toastService.success('已添加到收藏');
      return [favorite, ...favorites];
    });
    
    this.saveToStorage();
  }
  
  removeFromFavorites(groupId: string): void {
    this._favorites.update(favorites => 
      favorites.filter(f => f.group.id !== groupId)
    );
    this.toastService.info('已從收藏中移除');
    this.saveToStorage();
  }
  
  updateFavorite(groupId: string, updates: Partial<FavoriteGroup>): void {
    this._favorites.update(favorites =>
      favorites.map(f => f.group.id === groupId ? { ...f, ...updates } : f)
    );
    this.saveToStorage();
  }
  
  isFavorite(groupId: string): boolean {
    return this._favorites().some(f => f.group.id === groupId);
  }
  
  // ============ 群組詳情 ============
  
  /**
   * 獲取群組詳細信息
   */
  async getGroupDetail(groupId: string, source?: SearchSource): Promise<GroupDetailInfo | null> {
    try {
      const result = await this.ipcService.invoke('get-group-detail', { 
        groupId, 
        source: source || 'telegram' 
      });
      
      if (result.success) {
        return result.data;
      }
      
      throw new Error(result.message || '獲取群組詳情失敗');
    } catch (error: any) {
      this.toastService.error(error.message || '獲取群組詳情失敗');
      return null;
    }
  }
  
  /**
   * 加入群組
   */
  async joinGroup(group: GroupBasicInfo): Promise<boolean> {
    try {
      const result = await this.ipcService.invoke('join-group', {
        groupId: group.id,
        username: group.username,
        inviteLink: group.inviteLink
      });
      
      if (result.success) {
        this.toastService.success(`已加入群組: ${group.title}`);
        return true;
      }
      
      throw new Error(result.message || '加入群組失敗');
    } catch (error: any) {
      this.toastService.error(error.message || '加入群組失敗');
      return false;
    }
  }

  /**
   * 加入並監控群組
   * 發送 add-monitored-group 命令，將群組添加到監控列表
   */
  joinAndMonitorGroup(group: GroupBasicInfo): void {
    const url = group.username 
      ? `https://t.me/${group.username}` 
      : (group.inviteLink || '');
    
    this.ipcService.send('add-monitored-group', {
      url: url,
      name: group.title,
      telegramId: group.id,
      username: group.username,
      keywordSetIds: []
    });
    
    this.toastService.info(`📡 正在將「${group.title}」添加到監控列表...`);
  }
}
