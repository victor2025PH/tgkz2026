/**
 * TG-AI智控王 搜索源適配器接口
 * Search Adapter Interface v1.0
 * 
 * 定義統一的搜索源適配器接口，支持多源擴展
 */

import { 
  SearchSource, 
  SearchQuery, 
  GroupSearchItem, 
  GroupDetailInfo,
  SearchSourceStatus
} from '../search.types';

/**
 * 搜索結果
 */
export interface AdapterSearchResult {
  success: boolean;
  groups: GroupSearchItem[];
  totalCount: number;
  hasMore: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * 適配器狀態
 */
export interface AdapterStatus {
  source: SearchSource;
  status: SearchSourceStatus;
  lastCheck: Date;
  rateLimit: {
    remaining: number;
    resetAt: Date;
  };
  error?: string;
}

/**
 * 搜索源適配器接口
 */
export interface ISearchAdapter {
  // 基本信息
  readonly source: SearchSource;
  readonly name: string;
  readonly icon: string;
  readonly description: string;
  readonly requiredLevel: string;
  
  // 狀態
  getStatus(): Promise<AdapterStatus>;
  isAvailable(): Promise<boolean>;
  
  // 搜索
  search(query: SearchQuery): Promise<AdapterSearchResult>;
  
  // 詳情（可選）
  getGroupDetail?(groupId: string): Promise<GroupDetailInfo | null>;
  
  // 初始化/清理
  initialize?(): Promise<void>;
  dispose?(): Promise<void>;
}

/**
 * 搜索適配器基類
 */
export abstract class BaseSearchAdapter implements ISearchAdapter {
  abstract readonly source: SearchSource;
  abstract readonly name: string;
  abstract readonly icon: string;
  abstract readonly description: string;
  abstract readonly requiredLevel: string;
  
  protected lastStatus: AdapterStatus | null = null;
  protected rateLimitRemaining = 100;
  protected rateLimitResetAt = new Date();
  
  async getStatus(): Promise<AdapterStatus> {
    if (this.lastStatus && Date.now() - this.lastStatus.lastCheck.getTime() < 30000) {
      return this.lastStatus;
    }
    
    const available = await this.isAvailable();
    
    this.lastStatus = {
      source: this.source,
      status: available ? 'available' : 'unavailable',
      lastCheck: new Date(),
      rateLimit: {
        remaining: this.rateLimitRemaining,
        resetAt: this.rateLimitResetAt
      }
    };
    
    return this.lastStatus;
  }
  
  abstract isAvailable(): Promise<boolean>;
  abstract search(query: SearchQuery): Promise<AdapterSearchResult>;
  
  /**
   * 標準化群組數據
   */
  protected normalizeGroup(rawData: any): GroupSearchItem {
    return {
      id: String(rawData.id || ''),
      title: rawData.title || rawData.name || 'Unknown',
      username: rawData.username || rawData.link?.replace('https://t.me/', '') || undefined,
      type: this.parseGroupType(rawData.type),
      accessType: rawData.isPublic !== false ? 'public' : 'private',
      membersCount: parseInt(rawData.members || rawData.membersCount || rawData.subscribers || 0),
      description: rawData.description || rawData.about || undefined,
      photo: rawData.photo ? {
        smallUrl: rawData.photo.small || rawData.photo,
        bigUrl: rawData.photo.big || rawData.photo
      } : undefined,
      source: this.source,
      relevanceScore: rawData.score || rawData.relevance || 0.5
    };
  }
  
  protected parseGroupType(type: string | number): 'group' | 'supergroup' | 'channel' {
    if (typeof type === 'string') {
      if (type.includes('channel')) return 'channel';
      if (type.includes('super')) return 'supergroup';
    }
    return 'supergroup';
  }
  
  /**
   * 更新速率限制
   */
  protected updateRateLimit(remaining: number, resetInSeconds: number): void {
    this.rateLimitRemaining = remaining;
    this.rateLimitResetAt = new Date(Date.now() + resetInSeconds * 1000);
  }
  
  /**
   * 檢查速率限制
   */
  protected isRateLimited(): boolean {
    if (this.rateLimitRemaining <= 0 && this.rateLimitResetAt > new Date()) {
      return true;
    }
    return false;
  }
}
