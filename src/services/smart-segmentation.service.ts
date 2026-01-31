/**
 * 智能分群服務
 * Smart Segmentation Service
 * 
 * 🆕 P5 階段：高級功能擴展
 * 
 * 功能：
 * - 自動用戶分群
 * - 規則引擎
 * - 動態分群
 * - 分群洞察
 */

import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

/** 分群定義 */
export interface Segment {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  
  // 規則
  rules: SegmentRule[];
  ruleOperator: 'and' | 'or';
  
  // 統計
  memberCount: number;
  lastUpdated: Date;
  
  // 元數據
  isSystem: boolean;    // 系統預設
  isActive: boolean;
  priority: number;     // 優先級（用於互斥分群）
  
  createdAt: Date;
}

/** 分群規則 */
export interface SegmentRule {
  id: string;
  field: SegmentField;
  operator: RuleOperator;
  value: any;
  valueTo?: any;  // 用於 between 操作符
}

/** 可用字段 */
export type SegmentField = 
  | 'interest_score'      // 興趣分
  | 'engagement_score'    // 參與度
  | 'total_sessions'      // 總會話數
  | 'last_contact_days'   // 最後聯繫天數
  | 'response_rate'       // 回覆率
  | 'total_revenue'       // 總消費
  | 'source'              // 來源
  | 'tags'                // 標籤
  | 'intent_level'        // 購買意向
  | 'active_hours'        // 活躍時段
  | 'message_length';     // 消息長度偏好

/** 操作符 */
export type RuleOperator = 
  | 'eq' | 'neq'           // 等於/不等於
  | 'gt' | 'gte'           // 大於/大於等於
  | 'lt' | 'lte'           // 小於/小於等於
  | 'between'              // 區間
  | 'contains'             // 包含
  | 'not_contains'         // 不包含
  | 'in' | 'not_in'        // 在列表中/不在列表中
  | 'is_empty' | 'is_not_empty';  // 為空/不為空

/** 用戶數據（用於分群匹配） */
export interface UserData {
  userId: string;
  interestScore?: number;
  engagementScore?: number;
  totalSessions?: number;
  lastContactDate?: Date;
  responseRate?: number;
  totalRevenue?: number;
  source?: string;
  tags?: string[];
  intentLevel?: string;
  activeHours?: number[];
  messageLength?: string;
}

/** 分群統計 */
export interface SegmentStats {
  segmentId: string;
  memberCount: number;
  avgInterestScore: number;
  avgEngagementScore: number;
  totalRevenue: number;
  conversionRate: number;
  topTags: { tag: string; count: number }[];
}

// ============ 預設分群 ============

const DEFAULT_SEGMENTS: Partial<Segment>[] = [
  {
    id: 'seg_hot_leads',
    name: '熱門線索',
    description: '高興趣度、高參與度的潛在客戶',
    color: '#ef4444',
    icon: '🔥',
    rules: [
      { id: 'r1', field: 'interest_score', operator: 'gte', value: 70 },
      { id: 'r2', field: 'engagement_score', operator: 'gte', value: 60 }
    ],
    ruleOperator: 'and',
    isSystem: true,
    priority: 1
  },
  {
    id: 'seg_warm_leads',
    name: '溫暖線索',
    description: '有一定興趣，需要進一步培育',
    color: '#f59e0b',
    icon: '☀️',
    rules: [
      { id: 'r1', field: 'interest_score', operator: 'between', value: 40, valueTo: 69 },
      { id: 'r2', field: 'total_sessions', operator: 'gte', value: 2 }
    ],
    ruleOperator: 'and',
    isSystem: true,
    priority: 2
  },
  {
    id: 'seg_cold_leads',
    name: '冷門線索',
    description: '低興趣度，可能需要重新激活',
    color: '#3b82f6',
    icon: '❄️',
    rules: [
      { id: 'r1', field: 'interest_score', operator: 'lt', value: 40 }
    ],
    ruleOperator: 'and',
    isSystem: true,
    priority: 3
  },
  {
    id: 'seg_vip',
    name: 'VIP 客戶',
    description: '高價值已轉化客戶',
    color: '#8b5cf6',
    icon: '👑',
    rules: [
      { id: 'r1', field: 'total_revenue', operator: 'gte', value: 1000 }
    ],
    ruleOperator: 'and',
    isSystem: true,
    priority: 0
  },
  {
    id: 'seg_inactive',
    name: '沉睡用戶',
    description: '超過 30 天未聯繫',
    color: '#6b7280',
    icon: '💤',
    rules: [
      { id: 'r1', field: 'last_contact_days', operator: 'gte', value: 30 }
    ],
    ruleOperator: 'and',
    isSystem: true,
    priority: 10
  }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SmartSegmentationService {
  
  // 分群列表
  private _segments = signal<Segment[]>([]);
  segments = this._segments.asReadonly();
  
  // 用戶-分群映射
  private _userSegments = signal<Map<string, string[]>>(new Map());
  
  // 分群統計
  private _segmentStats = signal<Map<string, SegmentStats>>(new Map());
  segmentStats = computed(() => Array.from(this._segmentStats().values()));
  
  // 活躍分群
  activeSegments = computed(() => 
    this._segments().filter(s => s.isActive)
  );
  
  private readonly STORAGE_KEY = 'smartSegmentation';
  
  constructor() {
    this.loadFromStorage();
    this.initDefaultSegments();
  }
  
  // ============ 分群管理 ============
  
  /**
   * 創建分群
   */
  createSegment(config: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    rules: Omit<SegmentRule, 'id'>[];
    ruleOperator?: 'and' | 'or';
  }): Segment {
    const segment: Segment = {
      id: `seg_${Date.now()}`,
      name: config.name,
      description: config.description,
      color: config.color || '#8b5cf6',
      icon: config.icon || '📁',
      rules: config.rules.map((r, i) => ({ ...r, id: `r${i}` })),
      ruleOperator: config.ruleOperator || 'and',
      memberCount: 0,
      lastUpdated: new Date(),
      isSystem: false,
      isActive: true,
      priority: 100,
      createdAt: new Date()
    };
    
    this._segments.update(segs => [...segs, segment]);
    this.saveToStorage();
    
    console.log(`[Segmentation] 創建分群: ${segment.name}`);
    return segment;
  }
  
  /**
   * 更新分群
   */
  updateSegment(segmentId: string, updates: Partial<Segment>) {
    this._segments.update(segs => 
      segs.map(s => s.id === segmentId ? { ...s, ...updates, lastUpdated: new Date() } : s)
    );
    this.saveToStorage();
  }
  
  /**
   * 刪除分群
   */
  deleteSegment(segmentId: string): boolean {
    const segment = this._segments().find(s => s.id === segmentId);
    if (!segment || segment.isSystem) return false;
    
    this._segments.update(segs => segs.filter(s => s.id !== segmentId));
    this.saveToStorage();
    return true;
  }
  
  /**
   * 獲取分群
   */
  getSegment(segmentId: string): Segment | undefined {
    return this._segments().find(s => s.id === segmentId);
  }
  
  // ============ 用戶分群 ============
  
  /**
   * 為用戶分配分群
   */
  assignUserToSegments(user: UserData): string[] {
    const matchedSegments: { id: string; priority: number }[] = [];
    
    for (const segment of this.activeSegments()) {
      if (this.matchesSegment(user, segment)) {
        matchedSegments.push({ id: segment.id, priority: segment.priority });
      }
    }
    
    // 按優先級排序
    matchedSegments.sort((a, b) => a.priority - b.priority);
    const segmentIds = matchedSegments.map(s => s.id);
    
    // 更新用戶分群映射
    this._userSegments.update(map => {
      const newMap = new Map(map);
      newMap.set(user.userId, segmentIds);
      return newMap;
    });
    
    // 更新分群成員數
    this.updateMemberCounts();
    
    return segmentIds;
  }
  
  /**
   * 批量分配用戶
   */
  assignUsersToSegments(users: UserData[]): Map<string, string[]> {
    const result = new Map<string, string[]>();
    
    for (const user of users) {
      const segments = this.assignUserToSegments(user);
      result.set(user.userId, segments);
    }
    
    this.saveToStorage();
    return result;
  }
  
  /**
   * 獲取用戶所屬分群
   */
  getUserSegments(userId: string): Segment[] {
    const segmentIds = this._userSegments().get(userId) || [];
    return segmentIds
      .map(id => this.getSegment(id))
      .filter((s): s is Segment => s !== undefined);
  }
  
  /**
   * 獲取分群的所有用戶
   */
  getSegmentUsers(segmentId: string): string[] {
    const users: string[] = [];
    
    this._userSegments().forEach((segments, userId) => {
      if (segments.includes(segmentId)) {
        users.push(userId);
      }
    });
    
    return users;
  }
  
  // ============ 規則匹配 ============
  
  /**
   * 檢查用戶是否匹配分群
   */
  matchesSegment(user: UserData, segment: Segment): boolean {
    if (segment.rules.length === 0) return false;
    
    const results = segment.rules.map(rule => this.evaluateRule(user, rule));
    
    if (segment.ruleOperator === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  /**
   * 評估單個規則
   */
  private evaluateRule(user: UserData, rule: SegmentRule): boolean {
    const value = this.getFieldValue(user, rule.field);
    
    switch (rule.operator) {
      case 'eq':
        return value === rule.value;
      case 'neq':
        return value !== rule.value;
      case 'gt':
        return typeof value === 'number' && value > rule.value;
      case 'gte':
        return typeof value === 'number' && value >= rule.value;
      case 'lt':
        return typeof value === 'number' && value < rule.value;
      case 'lte':
        return typeof value === 'number' && value <= rule.value;
      case 'between':
        return typeof value === 'number' && value >= rule.value && value <= (rule.valueTo ?? rule.value);
      case 'contains':
        return Array.isArray(value) ? value.includes(rule.value) : String(value).includes(String(rule.value));
      case 'not_contains':
        return Array.isArray(value) ? !value.includes(rule.value) : !String(value).includes(String(rule.value));
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      case 'is_empty':
        return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
      case 'is_not_empty':
        return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
      default:
        return false;
    }
  }
  
  /**
   * 獲取字段值
   */
  private getFieldValue(user: UserData, field: SegmentField): any {
    switch (field) {
      case 'interest_score':
        return user.interestScore ?? 0;
      case 'engagement_score':
        return user.engagementScore ?? 0;
      case 'total_sessions':
        return user.totalSessions ?? 0;
      case 'last_contact_days':
        return user.lastContactDate 
          ? Math.floor((Date.now() - user.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
      case 'response_rate':
        return user.responseRate ?? 0;
      case 'total_revenue':
        return user.totalRevenue ?? 0;
      case 'source':
        return user.source ?? '';
      case 'tags':
        return user.tags ?? [];
      case 'intent_level':
        return user.intentLevel ?? 'unknown';
      case 'active_hours':
        return user.activeHours ?? [];
      case 'message_length':
        return user.messageLength ?? 'medium';
      default:
        return undefined;
    }
  }
  
  // ============ 統計分析 ============
  
  /**
   * 更新成員數
   */
  private updateMemberCounts() {
    const counts = new Map<string, number>();
    
    this._userSegments().forEach(segments => {
      segments.forEach(segId => {
        counts.set(segId, (counts.get(segId) || 0) + 1);
      });
    });
    
    this._segments.update(segs => 
      segs.map(s => ({ ...s, memberCount: counts.get(s.id) || 0 }))
    );
  }
  
  /**
   * 計算分群統計
   */
  calculateSegmentStats(segmentId: string, users: UserData[]): SegmentStats {
    const segmentUsers = users.filter(u => 
      this._userSegments().get(u.userId)?.includes(segmentId)
    );
    
    if (segmentUsers.length === 0) {
      return {
        segmentId,
        memberCount: 0,
        avgInterestScore: 0,
        avgEngagementScore: 0,
        totalRevenue: 0,
        conversionRate: 0,
        topTags: []
      };
    }
    
    const avgInterest = segmentUsers.reduce((sum, u) => sum + (u.interestScore || 0), 0) / segmentUsers.length;
    const avgEngagement = segmentUsers.reduce((sum, u) => sum + (u.engagementScore || 0), 0) / segmentUsers.length;
    const totalRevenue = segmentUsers.reduce((sum, u) => sum + (u.totalRevenue || 0), 0);
    const converted = segmentUsers.filter(u => (u.totalRevenue || 0) > 0).length;
    
    // 統計標籤
    const tagCounts = new Map<string, number>();
    segmentUsers.forEach(u => {
      u.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    const topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    const stats: SegmentStats = {
      segmentId,
      memberCount: segmentUsers.length,
      avgInterestScore: avgInterest,
      avgEngagementScore: avgEngagement,
      totalRevenue,
      conversionRate: segmentUsers.length > 0 ? (converted / segmentUsers.length) * 100 : 0,
      topTags
    };
    
    this._segmentStats.update(m => {
      const newMap = new Map(m);
      newMap.set(segmentId, stats);
      return newMap;
    });
    
    return stats;
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 初始化默認分群
   */
  private initDefaultSegments() {
    const existing = this._segments();
    const existingIds = new Set(existing.map(s => s.id));
    
    for (const defaultSeg of DEFAULT_SEGMENTS) {
      if (!existingIds.has(defaultSeg.id!)) {
        const segment: Segment = {
          ...defaultSeg as Segment,
          memberCount: 0,
          lastUpdated: new Date(),
          isActive: true,
          createdAt: new Date()
        };
        this._segments.update(segs => [...segs, segment]);
      }
    }
    
    this.saveToStorage();
  }
  
  /**
   * 獲取字段選項
   */
  getFieldOptions(): { field: SegmentField; label: string; type: 'number' | 'string' | 'array' }[] {
    return [
      { field: 'interest_score', label: '興趣分', type: 'number' },
      { field: 'engagement_score', label: '參與度', type: 'number' },
      { field: 'total_sessions', label: '總會話數', type: 'number' },
      { field: 'last_contact_days', label: '最後聯繫天數', type: 'number' },
      { field: 'response_rate', label: '回覆率', type: 'number' },
      { field: 'total_revenue', label: '總消費', type: 'number' },
      { field: 'source', label: '來源', type: 'string' },
      { field: 'tags', label: '標籤', type: 'array' },
      { field: 'intent_level', label: '購買意向', type: 'string' },
      { field: 'message_length', label: '消息長度偏好', type: 'string' }
    ];
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      segments: this._segments(),
      userSegments: Array.from(this._userSegments().entries()),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.segments) {
        this._segments.set(data.segments.map((s: any) => ({
          ...s,
          lastUpdated: new Date(s.lastUpdated),
          createdAt: new Date(s.createdAt)
        })));
      }
      
      if (data.userSegments) {
        this._userSegments.set(new Map(data.userSegments));
      }
      
      console.log('[Segmentation] 已從存儲恢復數據');
    } catch (e) {
      console.error('[Segmentation] 恢復數據失敗:', e);
    }
  }
}
