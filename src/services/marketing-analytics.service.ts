/**
 * 營銷數據分析服務
 * Marketing Analytics Service
 * 
 * 🆕 P2 階段：數據驅動優化
 * 
 * 職責：
 * - 角色組合效果統計
 * - 用戶畫像分析
 * - 轉化漏斗追蹤
 * - 營銷報表生成
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// ============ 類型定義 ============

// 營銷會話記錄
export interface MarketingSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  
  // 目標用戶
  targetUserId: string;
  targetUserName: string;
  targetUserProfile?: UserProfile;
  
  // 角色配置
  roleCombo: RoleCombo;
  
  // 對話統計
  totalMessages: number;
  userMessages: number;
  roleMessages: number;
  avgResponseTime: number;  // 毫秒
  
  // 階段追蹤
  stagesReached: string[];
  finalStage: string;
  
  // 結果
  outcome: 'converted' | 'interested' | 'neutral' | 'rejected' | 'no_response' | 'ongoing';
  conversionValue?: number;  // 成交金額
  
  // 評分
  interestScore: number;     // 用戶興趣度 0-100
  engagementScore: number;   // 互動參與度 0-100
  
  // 標籤
  tags: string[];
  notes?: string;
}

// 角色組合
export interface RoleCombo {
  id: string;
  name: string;
  roles: {
    roleId: string;
    roleName: string;
    roleType: string;
    accountPhone: string;
  }[];
  hash: string;  // 用於快速比對相同組合
}

// 用戶畫像
export interface UserProfile {
  userId: string;
  
  // 基本信息
  name?: string;
  username?: string;
  
  // 行為特徵
  responseSpeed: 'fast' | 'normal' | 'slow';  // 回覆速度
  messageLength: 'short' | 'medium' | 'long';  // 消息長度偏好
  activeHours: number[];  // 活躍時段
  
  // 興趣標籤
  interests: string[];
  painPoints: string[];
  objections: string[];
  
  // 購買意向
  intentLevel: 'high' | 'medium' | 'low' | 'unknown';
  pricesSensitivity: 'high' | 'medium' | 'low';
  
  // 歷史統計
  totalSessions: number;
  totalMessages: number;
  lastContactTime?: Date;
  
  // 標籤
  tags: string[];
  
  updatedAt: Date;
}

// 角色組合統計
export interface RoleComboStats {
  comboId: string;
  comboName: string;
  roles: string[];
  
  // 使用統計
  totalSessions: number;
  
  // 效果統計
  conversions: number;
  conversionRate: number;  // 轉化率
  avgInterestScore: number;
  avgEngagementScore: number;
  avgSessionDuration: number;  // 分鐘
  avgMessageCount: number;
  
  // 階段到達率
  stageReachRates: Record<string, number>;
  
  // 趨勢
  trend: 'up' | 'down' | 'stable';
  lastUsed: Date;
}

// 日報數據
export interface DailyReport {
  date: string;  // YYYY-MM-DD
  
  // 基礎統計
  totalSessions: number;
  newUsers: number;
  activeUsers: number;
  
  // 轉化統計
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  
  // 消息統計
  totalMessages: number;
  avgResponseTime: number;
  
  // 帳號使用
  accountUsage: {
    phone: string;
    sessions: number;
    messages: number;
  }[];
  
  // 最佳角色組合
  topRoleCombos: {
    comboName: string;
    conversions: number;
    rate: number;
  }[];
  
  // 用戶漏斗
  funnel: {
    stage: string;
    count: number;
    rate: number;
  }[];
}

// 週期對比
export interface PeriodComparison {
  current: {
    sessions: number;
    conversions: number;
    revenue: number;
  };
  previous: {
    sessions: number;
    conversions: number;
    revenue: number;
  };
  changes: {
    sessions: number;  // 百分比變化
    conversions: number;
    revenue: number;
  };
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class MarketingAnalyticsService {
  private ipc = inject(ElectronIpcService);
  
  // 數據存儲
  private _sessions = signal<MarketingSession[]>([]);
  private _userProfiles = signal<Map<string, UserProfile>>(new Map());
  private _roleComboStats = signal<Map<string, RoleComboStats>>(new Map());
  
  // 計算屬性
  sessions = this._sessions.asReadonly();
  userProfiles = computed(() => Array.from(this._userProfiles().values()));
  roleComboStats = computed(() => Array.from(this._roleComboStats().values()));
  
  // 總體統計
  totalStats = computed(() => {
    const sessions = this._sessions();
    const conversions = sessions.filter(s => s.outcome === 'converted').length;
    
    return {
      totalSessions: sessions.length,
      conversions,
      conversionRate: sessions.length > 0 ? (conversions / sessions.length * 100) : 0,
      avgInterestScore: this.calcAverage(sessions.map(s => s.interestScore)),
      avgEngagementScore: this.calcAverage(sessions.map(s => s.engagementScore)),
      totalRevenue: sessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
  });
  
  // 今日統計
  todayStats = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = this._sessions().filter(s => 
      s.startTime.toISOString().split('T')[0] === today
    );
    const conversions = todaySessions.filter(s => s.outcome === 'converted').length;
    
    return {
      sessions: todaySessions.length,
      conversions,
      conversionRate: todaySessions.length > 0 ? (conversions / todaySessions.length * 100) : 0,
      revenue: todaySessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
  });
  
  // 最佳角色組合
  topRoleCombos = computed(() => {
    const stats = Array.from(this._roleComboStats().values());
    return stats
      .filter(s => s.totalSessions >= 3)  // 至少 3 次使用
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);
  });
  
  private readonly STORAGE_KEY = 'marketingAnalytics';
  
  constructor() {
    this.loadFromStorage();
    this.initializeListeners();
  }
  
  /**
   * 初始化監聽器
   */
  private initializeListeners() {
    // 監聽協作會話結束事件
    this.ipc.on('collaboration:session-ended', (data: any) => {
      this.recordSession(data);
    });
    
    // 監聽用戶消息（用於更新畫像）
    this.ipc.on('collaboration:user-message', (data: any) => {
      this.updateUserProfile(data.userId, data.message);
    });
  }
  
  // ============ 會話記錄 ============
  
  /**
   * 記錄營銷會話
   */
  recordSession(data: {
    sessionId: string;
    targetUserId: string;
    targetUserName: string;
    roles: { roleId: string; roleName: string; roleType: string; accountPhone: string }[];
    messages: { role: string; content: string; timestamp: Date; isUser: boolean }[];
    outcome: MarketingSession['outcome'];
    conversionValue?: number;
    interestScore: number;
    stagesReached: string[];
    finalStage: string;
  }) {
    // 創建角色組合
    const roleCombo = this.createRoleCombo(data.roles);
    
    // 計算統計數據
    const userMessages = data.messages.filter(m => m.isUser);
    const roleMessages = data.messages.filter(m => !m.isUser);
    
    const session: MarketingSession = {
      id: data.sessionId,
      startTime: data.messages[0]?.timestamp || new Date(),
      endTime: data.messages[data.messages.length - 1]?.timestamp,
      targetUserId: data.targetUserId,
      targetUserName: data.targetUserName,
      roleCombo,
      totalMessages: data.messages.length,
      userMessages: userMessages.length,
      roleMessages: roleMessages.length,
      avgResponseTime: this.calcAvgResponseTime(data.messages),
      stagesReached: data.stagesReached,
      finalStage: data.finalStage,
      outcome: data.outcome,
      conversionValue: data.conversionValue,
      interestScore: data.interestScore,
      engagementScore: this.calcEngagementScore(data.messages),
      tags: this.extractSessionTags(data)
    };
    
    // 保存會話
    this._sessions.update(sessions => [...sessions, session]);
    
    // 更新角色組合統計
    this.updateRoleComboStats(roleCombo, session);
    
    // 保存到存儲
    this.saveToStorage();
    
    console.log(`[Analytics] 記錄會話: ${session.id}, 結果: ${session.outcome}`);
    
    return session;
  }
  
  /**
   * 創建角色組合標識
   */
  private createRoleCombo(roles: { roleId: string; roleName: string; roleType: string; accountPhone: string }[]): RoleCombo {
    const sortedRoles = [...roles].sort((a, b) => a.roleId.localeCompare(b.roleId));
    const hash = sortedRoles.map(r => r.roleType).join('_');
    const name = sortedRoles.map(r => r.roleName).join(' + ');
    
    return {
      id: `combo_${hash}`,
      name,
      roles: sortedRoles,
      hash
    };
  }
  
  /**
   * 更新角色組合統計
   */
  private updateRoleComboStats(combo: RoleCombo, session: MarketingSession) {
    const statsMap = this._roleComboStats();
    const existing = statsMap.get(combo.id);
    
    const isConversion = session.outcome === 'converted';
    
    if (existing) {
      // 更新現有統計
      const newTotal = existing.totalSessions + 1;
      const newConversions = existing.conversions + (isConversion ? 1 : 0);
      
      const updated: RoleComboStats = {
        ...existing,
        totalSessions: newTotal,
        conversions: newConversions,
        conversionRate: (newConversions / newTotal) * 100,
        avgInterestScore: (existing.avgInterestScore * existing.totalSessions + session.interestScore) / newTotal,
        avgEngagementScore: (existing.avgEngagementScore * existing.totalSessions + session.engagementScore) / newTotal,
        avgMessageCount: (existing.avgMessageCount * existing.totalSessions + session.totalMessages) / newTotal,
        lastUsed: new Date()
      };
      
      // 計算趨勢（簡化版：與上次比較）
      updated.trend = session.interestScore > existing.avgInterestScore ? 'up' : 
                      session.interestScore < existing.avgInterestScore ? 'down' : 'stable';
      
      this._roleComboStats.update(m => {
        const newMap = new Map(m);
        newMap.set(combo.id, updated);
        return newMap;
      });
    } else {
      // 創建新統計
      const newStats: RoleComboStats = {
        comboId: combo.id,
        comboName: combo.name,
        roles: combo.roles.map(r => r.roleName),
        totalSessions: 1,
        conversions: isConversion ? 1 : 0,
        conversionRate: isConversion ? 100 : 0,
        avgInterestScore: session.interestScore,
        avgEngagementScore: session.engagementScore,
        avgSessionDuration: 0,
        avgMessageCount: session.totalMessages,
        stageReachRates: {},
        trend: 'stable',
        lastUsed: new Date()
      };
      
      this._roleComboStats.update(m => {
        const newMap = new Map(m);
        newMap.set(combo.id, newStats);
        return newMap;
      });
    }
  }
  
  // ============ 用戶畫像 ============
  
  /**
   * 更新用戶畫像
   */
  updateUserProfile(userId: string, message: string) {
    const existing = this._userProfiles().get(userId);
    
    // 分析消息特徵
    const msgLength = message.length;
    const lengthCategory = msgLength < 20 ? 'short' : msgLength > 100 ? 'long' : 'medium';
    
    // 提取興趣和痛點
    const interests = this.extractInterests(message);
    const painPoints = this.extractPainPoints(message);
    const objections = this.extractObjections(message);
    
    if (existing) {
      // 更新現有畫像
      const updated: UserProfile = {
        ...existing,
        totalMessages: existing.totalMessages + 1,
        interests: [...new Set([...existing.interests, ...interests])].slice(0, 10),
        painPoints: [...new Set([...existing.painPoints, ...painPoints])].slice(0, 5),
        objections: [...new Set([...existing.objections, ...objections])].slice(0, 5),
        lastContactTime: new Date(),
        updatedAt: new Date()
      };
      
      // 更新消息長度偏好
      updated.messageLength = lengthCategory as 'short' | 'medium' | 'long';
      
      this._userProfiles.update(m => {
        const newMap = new Map(m);
        newMap.set(userId, updated);
        return newMap;
      });
    } else {
      // 創建新畫像
      const newProfile: UserProfile = {
        userId,
        responseSpeed: 'normal',
        messageLength: lengthCategory as 'short' | 'medium' | 'long',
        activeHours: [new Date().getHours()],
        interests,
        painPoints,
        objections,
        intentLevel: 'unknown',
        pricesSensitivity: 'medium',
        totalSessions: 1,
        totalMessages: 1,
        lastContactTime: new Date(),
        tags: [],
        updatedAt: new Date()
      };
      
      this._userProfiles.update(m => {
        const newMap = new Map(m);
        newMap.set(userId, newProfile);
        return newMap;
      });
    }
    
    this.saveToStorage();
  }
  
  /**
   * 提取興趣點
   */
  private extractInterests(message: string): string[] {
    const interests: string[] = [];
    const lowerMsg = message.toLowerCase();
    
    const keywords = {
      '支付': '支付解決方案',
      '收款': '收款服務',
      '跨境': '跨境業務',
      '費率': '價格敏感',
      '安全': '安全需求',
      '速度': '效率需求',
      '穩定': '穩定性需求'
    };
    
    Object.entries(keywords).forEach(([key, interest]) => {
      if (lowerMsg.includes(key)) {
        interests.push(interest);
      }
    });
    
    return interests;
  }
  
  /**
   * 提取痛點
   */
  private extractPainPoints(message: string): string[] {
    const painPoints: string[] = [];
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('貴') || lowerMsg.includes('費率高')) {
      painPoints.push('費率問題');
    }
    if (lowerMsg.includes('慢') || lowerMsg.includes('等待')) {
      painPoints.push('效率問題');
    }
    if (lowerMsg.includes('擔心') || lowerMsg.includes('風險')) {
      painPoints.push('安全顧慮');
    }
    if (lowerMsg.includes('複雜') || lowerMsg.includes('麻煩')) {
      painPoints.push('操作複雜');
    }
    
    return painPoints;
  }
  
  /**
   * 提取異議
   */
  private extractObjections(message: string): string[] {
    const objections: string[] = [];
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('不需要') || lowerMsg.includes('不用')) {
      objections.push('無需求');
    }
    if (lowerMsg.includes('再考慮') || lowerMsg.includes('再說')) {
      objections.push('需要考慮');
    }
    if (lowerMsg.includes('太貴') || lowerMsg.includes('便宜')) {
      objections.push('價格異議');
    }
    if (lowerMsg.includes('不信') || lowerMsg.includes('騙')) {
      objections.push('信任問題');
    }
    
    return objections;
  }
  
  /**
   * 獲取用戶畫像
   */
  getUserProfile(userId: string): UserProfile | undefined {
    return this._userProfiles().get(userId);
  }
  
  // ============ 報表生成 ============
  
  /**
   * 生成日報
   */
  generateDailyReport(date?: string): DailyReport {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const sessions = this._sessions().filter(s => 
      s.startTime.toISOString().split('T')[0] === targetDate
    );
    
    const conversions = sessions.filter(s => s.outcome === 'converted');
    const uniqueUsers = new Set(sessions.map(s => s.targetUserId));
    
    // 帳號使用統計
    const accountUsage = new Map<string, { sessions: number; messages: number }>();
    sessions.forEach(s => {
      s.roleCombo.roles.forEach(r => {
        const existing = accountUsage.get(r.accountPhone) || { sessions: 0, messages: 0 };
        existing.sessions++;
        existing.messages += s.roleMessages / s.roleCombo.roles.length;
        accountUsage.set(r.accountPhone, existing);
      });
    });
    
    // 角色組合統計
    const comboStats = new Map<string, { name: string; conversions: number; total: number }>();
    sessions.forEach(s => {
      const existing = comboStats.get(s.roleCombo.id) || { name: s.roleCombo.name, conversions: 0, total: 0 };
      existing.total++;
      if (s.outcome === 'converted') existing.conversions++;
      comboStats.set(s.roleCombo.id, existing);
    });
    
    // 漏斗統計
    const stages = ['opening', 'building_trust', 'discovering_needs', 'presenting_value', 'handling_objections', 'closing', 'follow_up'];
    const stageCounts = stages.map(stage => ({
      stage,
      count: sessions.filter(s => s.stagesReached.includes(stage)).length
    }));
    
    return {
      date: targetDate,
      totalSessions: sessions.length,
      newUsers: uniqueUsers.size,
      activeUsers: uniqueUsers.size,
      conversions: conversions.length,
      conversionRate: sessions.length > 0 ? (conversions.length / sessions.length * 100) : 0,
      totalRevenue: sessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0),
      totalMessages: sessions.reduce((sum, s) => sum + s.totalMessages, 0),
      avgResponseTime: this.calcAverage(sessions.map(s => s.avgResponseTime)),
      accountUsage: Array.from(accountUsage.entries()).map(([phone, stats]) => ({
        phone,
        ...stats
      })),
      topRoleCombos: Array.from(comboStats.values())
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 5)
        .map(c => ({
          comboName: c.name,
          conversions: c.conversions,
          rate: c.total > 0 ? (c.conversions / c.total * 100) : 0
        })),
      funnel: stageCounts.map((sc, idx) => ({
        stage: sc.stage,
        count: sc.count,
        rate: sessions.length > 0 ? (sc.count / sessions.length * 100) : 0
      }))
    };
  }
  
  /**
   * 生成週期對比
   */
  generatePeriodComparison(days: number = 7): PeriodComparison {
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    
    const currentSessions = this._sessions().filter(s => 
      s.startTime >= currentStart && s.startTime < now
    );
    const previousSessions = this._sessions().filter(s => 
      s.startTime >= previousStart && s.startTime < currentStart
    );
    
    const current = {
      sessions: currentSessions.length,
      conversions: currentSessions.filter(s => s.outcome === 'converted').length,
      revenue: currentSessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
    
    const previous = {
      sessions: previousSessions.length,
      conversions: previousSessions.filter(s => s.outcome === 'converted').length,
      revenue: previousSessions.reduce((sum, s) => sum + (s.conversionValue || 0), 0)
    };
    
    return {
      current,
      previous,
      changes: {
        sessions: previous.sessions > 0 ? ((current.sessions - previous.sessions) / previous.sessions * 100) : 0,
        conversions: previous.conversions > 0 ? ((current.conversions - previous.conversions) / previous.conversions * 100) : 0,
        revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue * 100) : 0
      }
    };
  }
  
  // ============ 推薦功能 ============
  
  /**
   * 推薦角色組合
   */
  recommendRoleCombo(targetProfile?: UserProfile): RoleComboStats | null {
    const stats = Array.from(this._roleComboStats().values());
    
    if (stats.length === 0) return null;
    
    // 基礎排序：轉化率
    let sorted = stats
      .filter(s => s.totalSessions >= 2)
      .sort((a, b) => b.conversionRate - a.conversionRate);
    
    // 如果有用戶畫像，可以進一步優化推薦
    if (targetProfile) {
      // 根據用戶特徵調整推薦
      // TODO: 實現更複雜的推薦邏輯
    }
    
    return sorted[0] || null;
  }
  
  // ============ 輔助方法 ============
  
  private calcAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  
  private calcAvgResponseTime(messages: { timestamp: Date; isUser: boolean }[]): number {
    let totalTime = 0;
    let count = 0;
    
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].isUser && !messages[i - 1].isUser) {
        // 用戶回覆時間
        totalTime += new Date(messages[i].timestamp).getTime() - new Date(messages[i - 1].timestamp).getTime();
        count++;
      }
    }
    
    return count > 0 ? totalTime / count : 0;
  }
  
  private calcEngagementScore(messages: { isUser: boolean; content: string }[]): number {
    const userMsgs = messages.filter(m => m.isUser);
    if (userMsgs.length === 0) return 0;
    
    let score = 0;
    
    // 基於用戶回覆數量
    score += Math.min(userMsgs.length * 10, 40);
    
    // 基於用戶消息長度
    const avgLength = userMsgs.reduce((sum, m) => sum + m.content.length, 0) / userMsgs.length;
    score += Math.min(avgLength / 5, 30);
    
    // 基於問題數量（問號）
    const questions = userMsgs.filter(m => m.content.includes('?') || m.content.includes('？')).length;
    score += Math.min(questions * 10, 30);
    
    return Math.min(score, 100);
  }
  
  private extractSessionTags(data: any): string[] {
    const tags: string[] = [];
    
    if (data.outcome === 'converted') tags.push('成交');
    if (data.interestScore >= 80) tags.push('高意向');
    if (data.stagesReached.includes('closing')) tags.push('到達成交階段');
    
    return tags;
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      sessions: this._sessions(),
      userProfiles: Array.from(this._userProfiles().entries()),
      roleComboStats: Array.from(this._roleComboStats().entries()),
      savedAt: Date.now()
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      // 恢復會話（轉換日期）
      if (data.sessions) {
        const sessions = data.sessions.map((s: any) => ({
          ...s,
          startTime: new Date(s.startTime),
          endTime: s.endTime ? new Date(s.endTime) : undefined
        }));
        this._sessions.set(sessions);
      }
      
      // 恢復用戶畫像
      if (data.userProfiles) {
        const map = new Map<string, UserProfile>(data.userProfiles.map((e: any) => [
          e[0],
          { ...e[1], updatedAt: new Date(e[1].updatedAt), lastContactTime: e[1].lastContactTime ? new Date(e[1].lastContactTime) : undefined }
        ]));
        this._userProfiles.set(map);
      }
      
      // 恢復角色組合統計
      if (data.roleComboStats) {
        const map = new Map<string, RoleComboStats>(data.roleComboStats.map((e: any) => [
          e[0],
          { ...e[1], lastUsed: new Date(e[1].lastUsed) }
        ]));
        this._roleComboStats.set(map);
      }
      
      console.log('[Analytics] 已從存儲恢復數據');
    } catch (e) {
      console.error('[Analytics] 恢復數據失敗:', e);
    }
  }
  
  /**
   * 清除所有數據
   */
  clearAllData() {
    this._sessions.set([]);
    this._userProfiles.set(new Map());
    this._roleComboStats.set(new Map());
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[Analytics] 已清除所有數據');
  }
  
  /**
   * 導出數據
   */
  exportData(): string {
    return JSON.stringify({
      sessions: this._sessions(),
      userProfiles: Array.from(this._userProfiles().entries()),
      roleComboStats: Array.from(this._roleComboStats().entries()),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}
