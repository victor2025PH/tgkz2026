/**
 * TG-AI智控王 本地索引適配器
 * Local Index Adapter v1.0
 * 
 * 本地群組數據庫搜索
 * 
 * 功能：
 * - 緩存之前搜索/加入的群組
 * - 支持離線搜索
 * - 提供快速本地結果
 * 
 * 存儲結構：
 * - IndexedDB: 持久化存儲
 * - 內存緩存: 快速訪問
 */

import { 
  BaseSearchAdapter, 
  AdapterSearchResult 
} from './search-adapter.interface';
import { 
  SearchSource, 
  SearchQuery, 
  GroupSearchItem,
  GroupDetailInfo
} from '../search.types';

// 本地索引配置
const LOCAL_CONFIG = {
  dbName: 'tgai_groups_db',
  storeName: 'groups',
  version: 1,
  maxCacheSize: 10000,
  searchLimit: 200
};

// 本地群組記錄
interface LocalGroupRecord extends GroupSearchItem {
  addedAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  isFavorite: boolean;
  isJoined: boolean;
  notes?: string;
  customTags?: string[];
}

export class LocalAdapter extends BaseSearchAdapter {
  readonly source: SearchSource = 'local';
  readonly name = '本地索引';
  readonly icon = '💾';
  readonly description = '本地群組數據庫';
  readonly requiredLevel = 'bronze';
  
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, LocalGroupRecord> = new Map();
  private initialized = false;
  
  constructor() {
    super();
    this.initDatabase();
  }
  
  async isAvailable(): Promise<boolean> {
    return this.initialized || await this.initDatabase();
  }
  
  async search(query: SearchQuery): Promise<AdapterSearchResult> {
    if (!await this.isAvailable()) {
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: '本地數據庫不可用'
      };
    }
    
    try {
      console.log(`[LocalAdapter] Searching: ${query.keyword}`);
      
      const keyword = query.keyword.toLowerCase().trim();
      const allGroups = await this.getAllGroups();
      
      // 搜索匹配
      let matchedGroups = allGroups.filter(group => 
        this.matchesKeyword(group, keyword)
      );
      
      // 應用篩選
      matchedGroups = this.applyFilters(matchedGroups, query.filters);
      
      // 計算相關度並排序
      matchedGroups = matchedGroups.map(group => ({
        ...group,
        relevanceScore: this.calculateRelevance(group, keyword)
      }));
      
      // 排序
      matchedGroups = this.sortResults(matchedGroups, query.filters.sortBy);
      
      // 分頁
      const start = (query.page - 1) * query.limit;
      const pagedGroups = matchedGroups.slice(start, start + query.limit);
      
      return {
        success: true,
        groups: pagedGroups,
        totalCount: matchedGroups.length,
        hasMore: start + query.limit < matchedGroups.length,
        metadata: {
          source: 'local',
          cacheSize: this.memoryCache.size
        }
      };
    } catch (error: any) {
      console.error('[LocalAdapter] Search error:', error);
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: error.message || '搜索失敗'
      };
    }
  }
  
  async getGroupDetail(groupId: string): Promise<GroupDetailInfo | null> {
    const record = await this.getGroup(groupId);
    if (!record) return null;
    
    // 更新訪問記錄
    await this.updateAccessRecord(groupId);
    
    return {
      ...record,
      stats: {
        membersCount: record.membersCount,
        onlineCount: 0,
        dailyMessages: 0,
        weeklyGrowth: 0,
        activeRate: 0
      },
      tags: record.customTags || [],
      lastUpdated: record.updatedAt
    };
  }
  
  // ============ 數據管理 ============
  
  /**
   * 添加或更新群組
   */
  async addOrUpdateGroup(group: GroupSearchItem, options?: {
    isFavorite?: boolean;
    isJoined?: boolean;
    notes?: string;
    customTags?: string[];
  }): Promise<void> {
    const existing = await this.getGroup(group.id);
    
    const record: LocalGroupRecord = {
      ...group,
      addedAt: existing?.addedAt || new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: (existing?.accessCount || 0) + 1,
      isFavorite: options?.isFavorite ?? existing?.isFavorite ?? false,
      isJoined: options?.isJoined ?? existing?.isJoined ?? false,
      notes: options?.notes ?? existing?.notes,
      customTags: options?.customTags ?? existing?.customTags
    };
    
    await this.saveGroup(record);
    this.memoryCache.set(group.id, record);
  }
  
  /**
   * 批量導入群組
   */
  async importGroups(groups: GroupSearchItem[], source: string): Promise<number> {
    let imported = 0;
    
    for (const group of groups) {
      try {
        await this.addOrUpdateGroup({
          ...group,
          source: group.source || source as SearchSource
        });
        imported++;
      } catch (error) {
        console.error('[LocalAdapter] Import error:', error);
      }
    }
    
    console.log(`[LocalAdapter] Imported ${imported}/${groups.length} groups`);
    return imported;
  }
  
  /**
   * 從 t.me 鏈接列表批量導入群組
   * 支持格式：
   * - https://t.me/username
   * - t.me/username
   * - @username
   * - https://t.me/+inviteHash
   * - 每行一個鏈接
   */
  async importFromLinks(linksText: string, options?: {
    verifyCallback?: (link: string) => Promise<GroupSearchItem | null>;
    progressCallback?: (current: number, total: number, status: string) => void;
  }): Promise<{
    total: number;
    imported: number;
    failed: number;
    skipped: number;
    errors: Array<{ link: string; error: string }>;
  }> {
    const result = {
      total: 0,
      imported: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ link: string; error: string }>
    };
    
    // 解析鏈接
    const lines = linksText.split(/[\n\r,;]+/).map(l => l.trim()).filter(Boolean);
    const links: Array<{ link: string; username: string; isInvite: boolean }> = [];
    
    for (const line of lines) {
      const parsed = this.parseLink(line);
      if (parsed) {
        links.push(parsed);
      }
    }
    
    result.total = links.length;
    console.log(`[LocalAdapter] Parsing ${result.total} links from input`);
    
    if (!links.length) {
      return result;
    }
    
    // 檢查重複
    const existingGroups = await this.getAllGroups();
    const existingUsernames = new Set(
      existingGroups
        .filter(g => g.username)
        .map(g => g.username!.toLowerCase())
    );
    
    // 處理每個鏈接
    for (let i = 0; i < links.length; i++) {
      const { link, username, isInvite } = links[i];
      
      // 進度回調
      options?.progressCallback?.(i + 1, links.length, `處理: ${username || link}`);
      
      // 檢查是否已存在
      if (username && existingUsernames.has(username.toLowerCase())) {
        result.skipped++;
        continue;
      }
      
      try {
        let groupInfo: GroupSearchItem | null = null;
        
        // 如果有驗證回調，嘗試驗證並獲取詳細信息
        if (options?.verifyCallback) {
          groupInfo = await options.verifyCallback(link);
        }
        
        // 如果驗證失敗或沒有回調，創建基礎記錄
        if (!groupInfo) {
          groupInfo = {
            id: `local_${username || Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            title: username || link,
            username: username || undefined,
            type: 'supergroup',
            accessType: isInvite ? 'private' : 'public',
            membersCount: 0,
            source: 'local',
            relevanceScore: 0.5,
            inviteLink: isInvite ? link : undefined
          };
        }
        
        await this.addOrUpdateGroup(groupInfo);
        result.imported++;
        
        if (username) {
          existingUsernames.add(username.toLowerCase());
        }
        
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          link,
          error: error.message || '導入失敗'
        });
      }
    }
    
    console.log(`[LocalAdapter] Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`);
    return result;
  }
  
  /**
   * 解析 t.me 鏈接或 username
   */
  private parseLink(input: string): { link: string; username: string; isInvite: boolean } | null {
    const text = input.trim();
    if (!text) return null;
    
    // 格式 1: https://t.me/username 或 t.me/username
    const usernameMatch = text.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z][a-zA-Z0-9_]{3,})/);
    if (usernameMatch) {
      return {
        link: `https://t.me/${usernameMatch[1]}`,
        username: usernameMatch[1],
        isInvite: false
      };
    }
    
    // 格式 2: @username
    const atMatch = text.match(/^@([a-zA-Z][a-zA-Z0-9_]{3,})$/);
    if (atMatch) {
      return {
        link: `https://t.me/${atMatch[1]}`,
        username: atMatch[1],
        isInvite: false
      };
    }
    
    // 格式 3: 邀請鏈接 https://t.me/+xxx 或 t.me/joinchat/xxx
    const inviteMatch = text.match(/(?:https?:\/\/)?t\.me\/(?:\+|joinchat\/)([a-zA-Z0-9_-]+)/);
    if (inviteMatch) {
      const fullLink = text.startsWith('http') ? text : `https://${text}`;
      return {
        link: fullLink,
        username: '',
        isInvite: true
      };
    }
    
    // 格式 4: 純 username（假設是以字母開頭的單詞）
    const pureUsername = text.match(/^([a-zA-Z][a-zA-Z0-9_]{3,})$/);
    if (pureUsername) {
      return {
        link: `https://t.me/${pureUsername[1]}`,
        username: pureUsername[1],
        isInvite: false
      };
    }
    
    return null;
  }
  
  /**
   * 導出群組為鏈接列表
   */
  async exportToLinks(options?: {
    onlyFavorites?: boolean;
    onlyJoined?: boolean;
    includePrivate?: boolean;
  }): Promise<string> {
    let groups = await this.getAllGroups();
    
    if (options?.onlyFavorites) {
      groups = groups.filter(g => g.isFavorite);
    }
    if (options?.onlyJoined) {
      groups = groups.filter(g => g.isJoined);
    }
    if (!options?.includePrivate) {
      groups = groups.filter(g => g.accessType !== 'private');
    }
    
    const links = groups
      .map(g => {
        if (g.inviteLink) return g.inviteLink;
        if (g.username) return `https://t.me/${g.username}`;
        return null;
      })
      .filter(Boolean);
    
    return links.join('\n');
  }
  
  /**
   * 刪除群組
   */
  async removeGroup(groupId: string): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(LOCAL_CONFIG.storeName, 'readwrite');
      const store = tx.objectStore(LOCAL_CONFIG.storeName);
      const request = store.delete(groupId);
      
      request.onsuccess = () => {
        this.memoryCache.delete(groupId);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 清空數據庫
   */
  async clearAll(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(LOCAL_CONFIG.storeName, 'readwrite');
      const store = tx.objectStore(LOCAL_CONFIG.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        this.memoryCache.clear();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 獲取統計信息
   */
  async getStats(): Promise<{
    totalGroups: number;
    favorites: number;
    joined: number;
    recentlyAccessed: number;
  }> {
    const allGroups = await this.getAllGroups();
    const now = Date.now();
    const recentThreshold = 7 * 24 * 60 * 60 * 1000; // 7 天
    
    return {
      totalGroups: allGroups.length,
      favorites: allGroups.filter(g => g.isFavorite).length,
      joined: allGroups.filter(g => g.isJoined).length,
      recentlyAccessed: allGroups.filter(
        g => now - new Date(g.lastAccessedAt).getTime() < recentThreshold
      ).length
    };
  }
  
  // ============ 私有方法 ============
  
  private async initDatabase(): Promise<boolean> {
    if (this.initialized && this.db) return true;
    
    return new Promise((resolve) => {
      const request = indexedDB.open(LOCAL_CONFIG.dbName, LOCAL_CONFIG.version);
      
      request.onerror = () => {
        console.error('[LocalAdapter] Failed to open database');
        resolve(false);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        this.loadToMemoryCache();
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(LOCAL_CONFIG.storeName)) {
          const store = db.createObjectStore(LOCAL_CONFIG.storeName, { keyPath: 'id' });
          store.createIndex('title', 'title', { unique: false });
          store.createIndex('username', 'username', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('isJoined', 'isJoined', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }
  
  private async loadToMemoryCache(): Promise<void> {
    const groups = await this.getAllGroups();
    groups.forEach(g => this.memoryCache.set(g.id, g));
    console.log(`[LocalAdapter] Loaded ${groups.length} groups to cache`);
  }
  
  private async getAllGroups(): Promise<LocalGroupRecord[]> {
    if (!this.db) return [];
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(LOCAL_CONFIG.storeName, 'readonly');
      const store = tx.objectStore(LOCAL_CONFIG.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async getGroup(groupId: string): Promise<LocalGroupRecord | null> {
    // 先查內存緩存
    if (this.memoryCache.has(groupId)) {
      return this.memoryCache.get(groupId)!;
    }
    
    if (!this.db) return null;
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(LOCAL_CONFIG.storeName, 'readonly');
      const store = tx.objectStore(LOCAL_CONFIG.storeName);
      const request = store.get(groupId);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  
  private async saveGroup(record: LocalGroupRecord): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(LOCAL_CONFIG.storeName, 'readwrite');
      const store = tx.objectStore(LOCAL_CONFIG.storeName);
      const request = store.put(record);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  private async updateAccessRecord(groupId: string): Promise<void> {
    const record = await this.getGroup(groupId);
    if (record) {
      record.lastAccessedAt = new Date();
      record.accessCount++;
      await this.saveGroup(record);
      this.memoryCache.set(groupId, record);
    }
  }
  
  // ============ 搜索邏輯 ============
  
  private matchesKeyword(group: LocalGroupRecord, keyword: string): boolean {
    if (!keyword) return true;
    
    const searchText = [
      group.title,
      group.username,
      group.description,
      ...(group.customTags || [])
    ].filter(Boolean).join(' ').toLowerCase();
    
    // 支持多關鍵詞（空格分隔）
    const keywords = keyword.split(/\s+/);
    return keywords.every(kw => searchText.includes(kw));
  }
  
  private calculateRelevance(group: LocalGroupRecord, keyword: string): number {
    let score = 0.3; // 基礎分
    
    const title = group.title.toLowerCase();
    const keywords = keyword.split(/\s+/);
    
    // 標題匹配
    if (title.includes(keyword)) {
      score += 0.3;
    } else if (keywords.every(kw => title.includes(kw))) {
      score += 0.2;
    }
    
    // 精確用戶名匹配
    if (group.username?.toLowerCase() === keyword.replace(/^@/, '')) {
      score += 0.2;
    }
    
    // 成員數加分
    if (group.membersCount > 10000) score += 0.1;
    else if (group.membersCount > 1000) score += 0.05;
    
    // 收藏加分
    if (group.isFavorite) score += 0.05;
    
    // 已加入加分
    if (group.isJoined) score += 0.05;
    
    // 最近訪問加分
    const daysSinceAccess = (Date.now() - new Date(group.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceAccess < 1) score += 0.05;
    else if (daysSinceAccess < 7) score += 0.02;
    
    return Math.min(score, 1);
  }
  
  private applyFilters(groups: LocalGroupRecord[], filters: any): LocalGroupRecord[] {
    let result = groups;
    
    if (filters.type?.length) {
      result = result.filter(g => filters.type.includes(g.type));
    }
    
    if (filters.minMembers) {
      result = result.filter(g => g.membersCount >= filters.minMembers);
    }
    
    if (filters.maxMembers) {
      result = result.filter(g => g.membersCount <= filters.maxMembers);
    }
    
    if (filters.hasUsername) {
      result = result.filter(g => !!g.username);
    }
    
    return result;
  }
  
  private sortResults(
    groups: LocalGroupRecord[], 
    sortBy?: 'relevance' | 'members' | 'activity' | 'growth'
  ): LocalGroupRecord[] {
    switch (sortBy) {
      case 'members':
        return groups.sort((a, b) => b.membersCount - a.membersCount);
      case 'activity':
        // 按最近訪問時間排序
        return groups.sort((a, b) => 
          new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
        );
      case 'relevance':
      default:
        return groups.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }
  }
}
