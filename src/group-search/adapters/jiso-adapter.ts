/**
 * TG-AI智控王 极搜 Bot 适配器
 * Jiso Bot Adapter v2.0
 * 
 * 通过后端 API 对接极搜搜索机器人
 * 
 * 工作流程：
 * 1. 前端发送搜索请求到后端
 * 2. 后端使用已登录账号向 @jisou_bot 发送消息
 * 3. 后端监听并解析 Bot 回复
 * 4. 返回解析后的群组列表
 */

import { 
  BaseSearchAdapter, 
  AdapterSearchResult 
} from './search-adapter.interface';
import { 
  SearchSource, 
  SearchQuery, 
  GroupSearchItem 
} from '../search.types';

// 极搜配置
const JISO_CONFIG = {
  searchTimeout: 30000,  // 搜索超时（毫秒）
  maxRetries: 2
};

// 后端返回的搜索结果
interface JisoBackendResult {
  success: boolean;
  results?: Array<{
    title: string;
    username?: string;
    link?: string;
    member_count: number;
    description?: string;
    chat_type: string;
    source: string;
  }>;
  total?: number;
  cached?: boolean;
  error?: string;
  bot?: string;
}

export class JisoAdapter extends BaseSearchAdapter {
  readonly source: SearchSource = 'jiso';
  readonly name = '极搜';
  readonly icon = '🔍';
  readonly description = '极搜 Bot - 中文群组搜索引擎';
  readonly requiredLevel = 'silver';
  
  private ipcService: any = null;
  private selectedPhone: string | null = null;
  private _isAvailable: boolean | null = null;
  private _lastAvailabilityCheck: number = 0;
  
  constructor(ipcService?: any) {
    super();
    this.ipcService = ipcService;
  }
  
  setIpcService(ipcService: any): void {
    this.ipcService = ipcService;
  }
  
  setSelectedPhone(phone: string | null): void {
    this.selectedPhone = phone;
  }
  
  async isAvailable(): Promise<boolean> {
    if (!this.ipcService) {
      console.warn('[JisoAdapter] IPC service not set');
      return false;
    }
    
    // 缓存可用性检查结果（5分钟）
    const now = Date.now();
    if (this._isAvailable !== null && now - this._lastAvailabilityCheck < 300000) {
      return this._isAvailable;
    }
    
    try {
      const result = await this.ipcService.invoke('check-jiso-availability', {
        phone: this.selectedPhone
      });
      
      this._isAvailable = result?.available ?? false;
      this._lastAvailabilityCheck = now;
      
      if (!this._isAvailable) {
        console.log('[JisoAdapter] Not available:', result?.reason);
      }
      
      return this._isAvailable;
    } catch (error) {
      console.error('[JisoAdapter] Availability check failed:', error);
      this._isAvailable = false;
      this._lastAvailabilityCheck = now;
      return false;
    }
  }
  
  async search(query: SearchQuery): Promise<AdapterSearchResult> {
    if (!this.ipcService) {
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: '服务未初始化'
      };
    }
    
    if (this.isRateLimited()) {
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: '搜索频率过高，请稍后再试'
      };
    }
    
    try {
      const keyword = query.keyword.trim();
      
      console.log(`[JisoAdapter] Searching via backend: ${keyword}`);
      
      // 调用后端搜索 API
      const result: JisoBackendResult = await this.ipcService.invoke('search-jiso', {
        keyword,
        phone: this.selectedPhone,
        limit: query.limit || 50
      });
      
      if (!result.success) {
        return {
          success: false,
          groups: [],
          totalCount: 0,
          hasMore: false,
          error: result.error || '搜索失败'
        };
      }
      
      // 转换后端结果为前端格式
      const groups = (result.results || []).map(item => this.normalizeBackendResult(item));
      
      // 应用筛选
      const filteredGroups = this.applyFilters(groups, query.filters);
      
      // 更新速率限制
      this.updateRateLimit(this.rateLimitRemaining - 1, 60);
      
      return {
        success: true,
        groups: filteredGroups,
        totalCount: result.total || filteredGroups.length,
        hasMore: false,
        metadata: {
          source: 'jiso',
          keyword,
          cached: result.cached,
          bot: result.bot
        }
      };
      
    } catch (error: any) {
      console.error('[JisoAdapter] Search error:', error);
      return {
        success: false,
        groups: [],
        totalCount: 0,
        hasMore: false,
        error: error.message || '搜索失败'
      };
    }
  }
  
  // ============ 私有方法 ============
  
  private normalizeBackendResult(item: JisoBackendResult['results'][0]): GroupSearchItem {
    // 使用標題 hash 生成穩定的 ID（避免重複刷新時 ID 變化）
    const titleHash = this.hashString(item.title || 'unknown');
    const hasRealLink = !!(item.link || item.username);
    
    return {
      id: item.username ? `jiso_${item.username}` : `jiso_${titleHash}`,
      title: item.title,
      username: item.username,
      type: this.parseGroupType(item.chat_type || 'supergroup'),
      accessType: 'public',
      membersCount: item.member_count || 0,
      description: item.description,
      inviteLink: item.link || (item.username ? `https://t.me/${item.username}` : undefined),
      source: this.source,
      relevanceScore: this.calculateRelevanceScore(item),
      // 標記是否有真實鏈接（用於前端顯示警告）
      needsVerification: !hasRealLink
    } as GroupSearchItem;
  }
  
  // 簡單的字符串 hash 函數
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  private calculateRelevanceScore(item: JisoBackendResult['results'][0]): number {
    // 多維度評分系統（總分 0-1）
    let score = 0;
    
    // 1. 可達性分數 (0-0.30) - 最重要，有真實鏈接才有價值
    if (item.link) {
      score += 0.30;  // 有完整鏈接
    } else if (item.username) {
      score += 0.25;  // 有 username 可構建鏈接
    } else {
      score += 0.05;  // 無法訪問，只有標題
    }
    
    // 2. 規模分數 (0-0.25) - 成員數量梯度
    const members = item.member_count || 0;
    if (members >= 100000) {
      score += 0.25;  // 10萬+
    } else if (members >= 50000) {
      score += 0.22;  // 5萬+
    } else if (members >= 10000) {
      score += 0.18;  // 1萬+
    } else if (members >= 5000) {
      score += 0.14;  // 5千+
    } else if (members >= 1000) {
      score += 0.10;  // 1千+
    } else if (members >= 100) {
      score += 0.05;  // 100+
    } else {
      score += 0.02;  // <100
    }
    
    // 3. 信息完整度 (0-0.20)
    if (item.description && item.description.length > 50) {
      score += 0.10;  // 有詳細描述
    } else if (item.description && item.description.length > 10) {
      score += 0.05;  // 有簡短描述
    }
    
    if (item.username) {
      score += 0.10;  // 有公開 username
    }
    
    // 4. 類型加成 (0-0.10)
    if (item.chat_type === 'channel') {
      score += 0.05;  // 頻道通常質量較穩定
    } else if (item.chat_type === 'supergroup') {
      score += 0.03;  // 超級群組
    }
    
    // 5. 數據來源可信度 (0-0.15) - 有來源標記加分
    if (item.source === 'jiso') {
      score += 0.10;  // 極搜數據
    }
    
    // 額外獎勵：同時有 username 和 高成員數
    if (item.username && members >= 10000) {
      score += 0.05;
    }
    
    return Math.min(Math.max(score, 0), 1);
  }
  
  private applyFilters(groups: GroupSearchItem[], filters: any): GroupSearchItem[] {
    let result = groups;
    
    if (filters?.minMembers) {
      result = result.filter(g => g.membersCount >= filters.minMembers);
    }
    
    if (filters?.maxMembers) {
      result = result.filter(g => g.membersCount <= filters.maxMembers);
    }
    
    if (filters?.hasUsername) {
      result = result.filter(g => !!g.username);
    }
    
    if (filters?.type?.length) {
      result = result.filter(g => filters.type.includes(g.type));
    }
    
    return result;
  }
}
