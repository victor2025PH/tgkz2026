/**
 * TG-AI智控王 搜索聚合器
 * Search Aggregator v1.0
 * 
 * 功能：
 * - 統一管理所有搜索適配器
 * - 並行搜索多個源
 * - 結果聚合與去重
 * - 智能排序與融合
 * - 健康檢測與故障轉移
 */

import { Injectable, signal, computed } from '@angular/core';
import { 
  ISearchAdapter, 
  AdapterSearchResult, 
  AdapterStatus 
} from './search-adapter.interface';
import { TelegramAdapter } from './telegram-adapter';
import { JisoAdapter } from './jiso-adapter';
import { LocalAdapter } from './local-adapter';
import { 
  SearchSource, 
  SearchQuery, 
  SearchResult, 
  GroupSearchItem,
  SearchSourceConfig,
  SearchSourceStatus
} from '../search.types';

// 聚合配置
const AGGREGATOR_CONFIG = {
  // 搜索超時（毫秒）
  searchTimeout: 15000,
  // 並行搜索
  parallelSearch: true,
  // 健康檢查間隔（毫秒）
  healthCheckInterval: 60000,
  // 最大重試次數
  maxRetries: 2,
  // 結果融合權重
  sourceWeights: {
    telegram: 1.0,
    jiso: 0.9,
    local: 0.7
  } as Record<SearchSource, number>
};

// 搜索源狀態
interface SourceState {
  adapter: ISearchAdapter;
  config: SearchSourceConfig;
  status: SearchSourceStatus;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchAggregator {
  // 適配器映射
  private adapters: Map<SearchSource, SourceState> = new Map();
  
  // 健康檢查定時器
  private healthCheckTimer: any = null;
  
  // 狀態 signals
  private _sources = signal<SearchSourceConfig[]>([]);
  private _isSearching = signal(false);
  private _lastError = signal<string | null>(null);
  
  // 計算屬性
  sources = computed(() => this._sources());
  isSearching = computed(() => this._isSearching());
  lastError = computed(() => this._lastError());
  
  availableSources = computed(() => 
    this._sources().filter(s => s.enabled && s.status === 'available')
  );
  
  constructor() {
    this.initializeAdapters();
    this.startHealthCheck();
  }
  
  // ============ 初始化 ============
  
  private initializeAdapters(): void {
    // 初始化所有適配器
    const adaptersConfig: { adapter: ISearchAdapter; enabled: boolean }[] = [
      { adapter: new TelegramAdapter(), enabled: true },
      { adapter: new JisoAdapter(), enabled: true },
      { adapter: new LocalAdapter(), enabled: true }
    ];
    
    for (const { adapter, enabled } of adaptersConfig) {
      const config: SearchSourceConfig = {
        id: adapter.source,
        name: adapter.name,
        icon: adapter.icon,
        enabled,
        status: 'checking',
        rateLimit: 100,
        description: adapter.description,
        requiredLevel: adapter.requiredLevel
      };
      
      this.adapters.set(adapter.source, {
        adapter,
        config,
        status: 'checking',
        lastCheck: new Date(),
        consecutiveFailures: 0
      });
    }
    
    this.updateSourcesList();
  }
  
  /**
   * 設置 TG 客戶端
   */
  setTelegramClient(client: any): void {
    const tgState = this.adapters.get('telegram');
    if (tgState) {
      (tgState.adapter as TelegramAdapter).setClient(client);
    }
    
    const jisoState = this.adapters.get('jiso');
    if (jisoState) {
      (jisoState.adapter as JisoAdapter).setClient(client);
    }
    
    // 重新檢查狀態
    this.checkSourceHealth('telegram');
    this.checkSourceHealth('jiso');
  }
  
  
  // ============ 搜索 ============
  
  /**
   * 聚合搜索
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    this._isSearching.set(true);
    this._lastError.set(null);
    
    try {
      // 獲取要搜索的源
      const sourcesToSearch = query.sources.filter(source => {
        const state = this.adapters.get(source);
        return state && state.config.enabled && state.status === 'available';
      });
      
      if (sourcesToSearch.length === 0) {
        throw new Error('沒有可用的搜索源');
      }
      
      console.log(`[Aggregator] Searching ${sourcesToSearch.length} sources:`, sourcesToSearch);
      
      // 並行搜索
      const searchPromises = sourcesToSearch.map(source => 
        this.searchSource(source, query)
      );
      
      const results = await Promise.all(searchPromises);
      
      // 聚合結果
      const aggregatedResult = this.aggregateResults(query, results, startTime);
      
      // 保存結果到本地索引
      this.saveToLocalIndex(aggregatedResult.groups);
      
      return aggregatedResult;
    } catch (error: any) {
      console.error('[Aggregator] Search error:', error);
      this._lastError.set(error.message);
      
      return {
        query,
        groups: [],
        totalCount: 0,
        hasMore: false,
        sources: [],
        searchTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } finally {
      this._isSearching.set(false);
    }
  }
  
  private async searchSource(
    source: SearchSource, 
    query: SearchQuery
  ): Promise<{ source: SearchSource; result: AdapterSearchResult }> {
    const state = this.adapters.get(source);
    if (!state) {
      return {
        source,
        result: {
          success: false,
          groups: [],
          totalCount: 0,
          hasMore: false,
          error: '適配器不存在'
        }
      };
    }
    
    try {
      // 添加超時控制
      const result = await Promise.race([
        state.adapter.search(query),
        this.createTimeout(AGGREGATOR_CONFIG.searchTimeout)
      ]) as AdapterSearchResult;
      
      // 更新狀態
      if (result.success) {
        state.consecutiveFailures = 0;
      } else {
        state.consecutiveFailures++;
      }
      
      return { source, result };
    } catch (error: any) {
      console.error(`[Aggregator] ${source} search failed:`, error);
      state.consecutiveFailures++;
      
      // 連續失敗過多，標記為不可用
      if (state.consecutiveFailures >= AGGREGATOR_CONFIG.maxRetries) {
        state.status = 'unavailable';
        state.lastError = error.message;
        this.updateSourcesList();
      }
      
      return {
        source,
        result: {
          success: false,
          groups: [],
          totalCount: 0,
          hasMore: false,
          error: error.message
        }
      };
    }
  }
  
  private createTimeout(ms: number): Promise<AdapterSearchResult> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('搜索超時')), ms);
    });
  }
  
  // ============ 結果聚合 ============
  
  private aggregateResults(
    query: SearchQuery,
    results: { source: SearchSource; result: AdapterSearchResult }[],
    startTime: number
  ): SearchResult {
    // 收集所有群組
    let allGroups: GroupSearchItem[] = [];
    const sourceStats: SearchResult['sources'] = [];
    
    for (const { source, result } of results) {
      sourceStats.push({
        source,
        count: result.groups.length,
        status: result.success ? 'success' : 'error',
        error: result.error
      });
      
      if (result.success) {
        // 添加來源標記
        const groupsWithSource = result.groups.map(g => ({
          ...g,
          source
        }));
        allGroups = allGroups.concat(groupsWithSource);
      }
    }
    
    // 去重
    const uniqueGroups = this.deduplicateGroups(allGroups);
    
    // 計算融合分數並排序
    const scoredGroups = uniqueGroups.map(group => ({
      ...group,
      relevanceScore: this.calculateFusionScore(group, query)
    }));
    
    // 排序
    const sortedGroups = this.sortFusedResults(scoredGroups, query.filters.sortBy);
    
    // 分頁
    const start = (query.page - 1) * query.limit;
    const pagedGroups = sortedGroups.slice(start, start + query.limit);
    
    return {
      query,
      groups: pagedGroups,
      totalCount: sortedGroups.length,
      hasMore: start + query.limit < sortedGroups.length,
      sources: sourceStats,
      searchTime: Date.now() - startTime,
      timestamp: new Date()
    };
  }
  
  /**
   * 去重算法
   * 
   * 策略：
   * 1. 優先按 username 去重（精確匹配）
   * 2. 其次按 id 去重
   * 3. 最後按標題相似度去重
   */
  private deduplicateGroups(groups: GroupSearchItem[]): GroupSearchItem[] {
    const seen = new Map<string, GroupSearchItem>();
    const seenTitles = new Map<string, GroupSearchItem>();
    
    for (const group of groups) {
      // 按 username 去重
      if (group.username) {
        const key = group.username.toLowerCase();
        if (seen.has(key)) {
          // 保留成員數更多的或分數更高的
          const existing = seen.get(key)!;
          if (this.shouldReplace(existing, group)) {
            seen.set(key, group);
          }
          continue;
        }
        seen.set(key, group);
        continue;
      }
      
      // 按 id 去重
      const idKey = `id_${group.id}`;
      if (seen.has(idKey)) {
        const existing = seen.get(idKey)!;
        if (this.shouldReplace(existing, group)) {
          seen.set(idKey, group);
        }
        continue;
      }
      
      // 按標題相似度去重（簡單版本）
      const normalizedTitle = this.normalizeTitle(group.title);
      if (seenTitles.has(normalizedTitle)) {
        const existing = seenTitles.get(normalizedTitle)!;
        if (this.shouldReplace(existing, group)) {
          seenTitles.set(normalizedTitle, group);
          seen.set(idKey, group);
        }
        continue;
      }
      
      seen.set(idKey, group);
      seenTitles.set(normalizedTitle, group);
    }
    
    return Array.from(seen.values());
  }
  
  private shouldReplace(existing: GroupSearchItem, newItem: GroupSearchItem): boolean {
    // 優先選擇有更多信息的
    const existingScore = this.calculateInfoScore(existing);
    const newScore = this.calculateInfoScore(newItem);
    
    if (newScore > existingScore) return true;
    if (newScore < existingScore) return false;
    
    // 相同信息量時選擇成員數更多的
    return newItem.membersCount > existing.membersCount;
  }
  
  private calculateInfoScore(group: GroupSearchItem): number {
    let score = 0;
    if (group.username) score += 2;
    if (group.description) score += 1;
    if (group.photo) score += 1;
    if (group.membersCount > 0) score += 1;
    return score;
  }
  
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]/g, '')  // 保留字母數字和中文
      .trim();
  }
  
  /**
   * 計算融合分數
   */
  private calculateFusionScore(group: GroupSearchItem, query: SearchQuery): number {
    let score = group.relevanceScore || 0.5;
    
    // 來源權重
    const sourceWeight = AGGREGATOR_CONFIG.sourceWeights[group.source] || 0.5;
    score *= sourceWeight;
    
    // 關鍵詞匹配加權
    const keywords = query.keyword.toLowerCase().split(/\s+/);
    const titleLower = group.title.toLowerCase();
    const descLower = (group.description || '').toLowerCase();
    
    let keywordMatches = 0;
    for (const kw of keywords) {
      if (titleLower.includes(kw)) keywordMatches += 2;
      else if (descLower.includes(kw)) keywordMatches += 1;
    }
    score += keywordMatches * 0.05;
    
    // 成員數加權（對數縮放）
    if (group.membersCount > 0) {
      score += Math.log10(group.membersCount) * 0.02;
    }
    
    // 有用戶名加分
    if (group.username) score += 0.05;
    
    return Math.min(score, 1);
  }
  
  private sortFusedResults(
    groups: GroupSearchItem[], 
    sortBy?: 'relevance' | 'members' | 'activity' | 'growth'
  ): GroupSearchItem[] {
    switch (sortBy) {
      case 'members':
        return groups.sort((a, b) => b.membersCount - a.membersCount);
      case 'relevance':
      default:
        return groups.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }
  }
  
  // ============ 本地索引 ============
  
  private async saveToLocalIndex(groups: GroupSearchItem[]): Promise<void> {
    const localState = this.adapters.get('local');
    if (!localState) return;
    
    const localAdapter = localState.adapter as LocalAdapter;
    
    // 異步保存，不阻塞搜索結果返回
    localAdapter.importGroups(groups, 'search_result').catch(err => {
      console.error('[Aggregator] Failed to save to local index:', err);
    });
  }
  
  // ============ 健康檢測 ============
  
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.checkAllSourcesHealth();
    }, AGGREGATOR_CONFIG.healthCheckInterval);
    
    // 初始檢查
    this.checkAllSourcesHealth();
  }
  
  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  private async checkAllSourcesHealth(): Promise<void> {
    console.log('[Aggregator] Running health check...');
    
    for (const source of this.adapters.keys()) {
      await this.checkSourceHealth(source);
    }
    
    this.updateSourcesList();
  }
  
  private async checkSourceHealth(source: SearchSource): Promise<void> {
    const state = this.adapters.get(source);
    if (!state || !state.config.enabled) return;
    
    state.status = 'checking';
    this.updateSourcesList();
    
    try {
      const available = await state.adapter.isAvailable();
      state.status = available ? 'available' : 'unavailable';
      state.lastCheck = new Date();
      
      if (available) {
        state.consecutiveFailures = 0;
        state.lastError = undefined;
      }
    } catch (error: any) {
      state.status = 'unavailable';
      state.lastError = error.message;
    }
    
    this.updateSourcesList();
  }
  
  private updateSourcesList(): void {
    const configs: SearchSourceConfig[] = [];
    
    for (const [_, state] of this.adapters) {
      configs.push({
        ...state.config,
        status: state.status,
        lastCheck: state.lastCheck
      });
    }
    
    this._sources.set(configs);
  }
  
  // ============ 公開方法 ============
  
  /**
   * 啟用/禁用搜索源
   */
  toggleSource(source: SearchSource, enabled: boolean): void {
    const state = this.adapters.get(source);
    if (state) {
      state.config.enabled = enabled;
      this.updateSourcesList();
    }
  }
  
  /**
   * 手動觸發健康檢查
   */
  async refreshSourceStatus(): Promise<void> {
    await this.checkAllSourcesHealth();
  }
  
  /**
   * 獲取本地適配器（用於數據管理）
   */
  getLocalAdapter(): LocalAdapter | null {
    const state = this.adapters.get('local');
    return state ? state.adapter as LocalAdapter : null;
  }
  
  /**
   * 清理資源
   */
  dispose(): void {
    this.stopHealthCheck();
  }
}
