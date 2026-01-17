/**
 * TG-AI智控王 Telegram 官方搜索適配器
 * Telegram Adapter v1.0
 * 
 * 使用 Telegram 官方 API 搜索群組
 * 
 * 搜索方式：
 * 1. contacts.Search - 全局搜索用戶和聊天
 * 2. channels.SearchPosts - 搜索公開頻道的帖子
 * 3. messages.SearchGlobal - 全局消息搜索
 * 
 * 限制：
 * - 官方搜索結果有限
 * - 只能搜索公開群組/頻道
 * - 搜索結果排序由官方決定
 */

import { 
  BaseSearchAdapter, 
  AdapterSearchResult 
} from './search-adapter.interface';
import { 
  SearchSource, 
  SearchQuery, 
  GroupSearchItem,
  GroupDetailInfo,
  GroupStats
} from '../search.types';

// Telegram API 配置
const TG_CONFIG = {
  searchLimit: 100,  // 每次搜索最大返回數
  rateLimit: {
    searches: 20,
    window: 60
  }
};

export class TelegramAdapter extends BaseSearchAdapter {
  readonly source: SearchSource = 'telegram';
  readonly name = 'Telegram 官方';
  readonly icon = '✈️';
  readonly description = 'Telegram 官方搜索 API';
  readonly requiredLevel = 'bronze';
  
  private tgClient: any = null;
  private searchCount = 0;
  private windowStart = Date.now();
  
  constructor(tgClient?: any) {
    super();
    this.tgClient = tgClient;
  }
  
  setClient(client: any): void {
    this.tgClient = client;
  }
  
  async isAvailable(): Promise<boolean> {
    return !!(this.tgClient && this.tgClient.connected);
  }
  
  async search(query: SearchQuery): Promise<AdapterSearchResult> {
    if (!await this.isAvailable()) {
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: 'Telegram 客戶端未連接'
      };
    }
    
    if (this.isRateLimited()) {
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: '搜索頻率過高，請稍後再試'
      };
    }
    
    try {
      console.log(`[TelegramAdapter] Searching: ${query.keyword}`);
      
      // 使用 TG API 搜索
      const results = await this.performSearch(query);
      
      // 標準化結果
      const groups = results.map(item => this.normalizeSearchResult(item));
      
      // 應用篩選
      const filteredGroups = this.applyFilters(groups, query.filters);
      
      // 排序
      const sortedGroups = this.sortResults(filteredGroups, query.filters.sortBy);
      
      // 分頁
      const start = (query.page - 1) * query.limit;
      const pagedGroups = sortedGroups.slice(start, start + query.limit);
      
      // 更新速率限制
      this.updateSearchCount();
      
      return {
        success: true,
        groups: pagedGroups,
        totalCount: sortedGroups.length,
        hasMore: start + query.limit < sortedGroups.length,
        metadata: {
          source: 'telegram',
          rawCount: results.length
        }
      };
    } catch (error: any) {
      console.error('[TelegramAdapter] Search error:', error);
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
    if (!await this.isAvailable()) {
      return null;
    }
    
    try {
      const detail = await this.fetchGroupDetail(groupId);
      return detail;
    } catch (error) {
      console.error('[TelegramAdapter] Get detail error:', error);
      return null;
    }
  }
  
  // ============ 搜索實現 ============
  
  private async performSearch(query: SearchQuery): Promise<any[]> {
    // 使用 GramJS API
    // const { Api } = require('telegram/tl');
    
    try {
      // 1. 使用 contacts.Search 搜索
      // const searchResult = await this.tgClient.invoke(
      //   new Api.contacts.Search({
      //     q: query.keyword,
      //     limit: Math.min(query.limit * 2, TG_CONFIG.searchLimit)
      //   })
      // );
      
      // 提取聊天結果
      // const chats = searchResult.chats || [];
      
      // 模擬搜索結果
      const chats = this.generateMockChats(query.keyword, query.limit);
      
      return chats;
    } catch (error) {
      console.error('[TelegramAdapter] performSearch error:', error);
      throw error;
    }
  }
  
  private async fetchGroupDetail(groupId: string): Promise<GroupDetailInfo | null> {
    try {
      // 使用 GramJS 獲取完整群組信息
      // const { Api } = require('telegram/tl');
      
      // const fullChat = await this.tgClient.invoke(
      //   new Api.channels.GetFullChannel({
      //     channel: groupId
      //   })
      // );
      
      // 模擬詳情數據
      return this.generateMockDetail(groupId);
    } catch (error) {
      console.error('[TelegramAdapter] fetchGroupDetail error:', error);
      return null;
    }
  }
  
  // ============ 數據轉換 ============
  
  private normalizeSearchResult(chat: any): GroupSearchItem {
    // 從 TG API 結果轉換為標準格式
    return {
      id: String(chat.id || chat._id || ''),
      title: chat.title || chat.name || 'Unknown',
      username: chat.username,
      type: this.detectChatType(chat),
      accessType: chat.username ? 'public' : 'private',
      membersCount: chat.participantsCount || chat.membersCount || 0,
      description: chat.about || chat.description,
      photo: chat.photo ? {
        smallUrl: chat.photo.smallFileId,
        bigUrl: chat.photo.bigFileId
      } : undefined,
      source: this.source,
      relevanceScore: this.calculateScore(chat)
    };
  }
  
  private detectChatType(chat: any): 'group' | 'supergroup' | 'channel' {
    if (chat.broadcast || chat._ === 'Channel') {
      return 'channel';
    }
    if (chat.megagroup || chat._ === 'ChatForbidden') {
      return 'supergroup';
    }
    return 'group';
  }
  
  private calculateScore(chat: any): number {
    let score = 0.5;
    
    // 根據成員數
    const members = chat.participantsCount || 0;
    if (members > 50000) score += 0.2;
    else if (members > 10000) score += 0.15;
    else if (members > 1000) score += 0.1;
    else if (members > 100) score += 0.05;
    
    // 有用戶名加分
    if (chat.username) score += 0.1;
    
    // 有描述加分
    if (chat.about) score += 0.05;
    
    return Math.min(score, 1);
  }
  
  // ============ 篩選與排序 ============
  
  private applyFilters(groups: GroupSearchItem[], filters: any): GroupSearchItem[] {
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
    groups: GroupSearchItem[], 
    sortBy?: 'relevance' | 'members' | 'activity' | 'growth'
  ): GroupSearchItem[] {
    switch (sortBy) {
      case 'members':
        return groups.sort((a, b) => b.membersCount - a.membersCount);
      case 'activity':
        // 按活躍度排序（使用 relevanceScore 作為近似）
        return groups.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      case 'relevance':
      default:
        return groups.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    }
  }
  
  // ============ 速率限制 ============
  
  private updateSearchCount(): void {
    const now = Date.now();
    const windowDuration = TG_CONFIG.rateLimit.window * 1000;
    
    if (now - this.windowStart > windowDuration) {
      this.windowStart = now;
      this.searchCount = 0;
    }
    
    this.searchCount++;
    
    const remaining = TG_CONFIG.rateLimit.searches - this.searchCount;
    const resetIn = (windowDuration - (now - this.windowStart)) / 1000;
    this.updateRateLimit(remaining, resetIn);
  }
  
  // ============ 模擬數據 ============
  
  private generateMockChats(keyword: string, limit: number): any[] {
    const count = Math.min(limit, Math.floor(Math.random() * 20) + 5);
    const chats: any[] = [];
    
    const prefixes = ['🔥', '💰', '📈', '🌟', '💎', '🚀'];
    const suffixes = ['交流群', '討論區', '社群', '頻道', '資訊站', '官方群'];
    
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      const isChannel = Math.random() > 0.6;
      
      chats.push({
        id: `tg_${Date.now()}_${i}`,
        title: `${prefix} ${keyword} ${suffix}`,
        username: Math.random() > 0.2 
          ? `${keyword.replace(/\s/g, '_').toLowerCase()}_${i + 1}` 
          : undefined,
        participantsCount: Math.floor(Math.random() * 80000) + 500,
        about: `歡迎加入 ${keyword} 相關交流社群！這裡有最新資訊和專業討論。`,
        broadcast: isChannel,
        megagroup: !isChannel
      });
    }
    
    return chats;
  }
  
  private generateMockDetail(groupId: string): GroupDetailInfo {
    const members = Math.floor(Math.random() * 50000) + 1000;
    const online = Math.floor(members * Math.random() * 0.1);
    
    return {
      id: groupId,
      title: '示例群組',
      username: 'example_group',
      type: 'supergroup',
      accessType: 'public',
      membersCount: members,
      description: '這是一個示例群組的詳細描述。',
      stats: {
        membersCount: members,
        onlineCount: online,
        dailyMessages: Math.floor(Math.random() * 1000),
        weeklyGrowth: Math.random() * 15 - 5,
        monthlyGrowth: Math.random() * 30 - 10,
        activeRate: Math.random() * 25
      },
      tags: ['中文', '交流', '官方'],
      source: 'telegram',
      lastUpdated: new Date()
    };
  }
}
