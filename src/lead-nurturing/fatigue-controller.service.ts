/**
 * TG-AI智控王 疲勞度控制器
 * Fatigue Controller Service v1.0
 * 
 * 功能：
 * - 防止過度聯繫用戶
 * - 動態調整跟進頻率
 * - 負面情緒檢測後自動降頻
 * - 聯繫限制管理
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { Lead, FunnelStage, LeadConversation } from './lead.models';

// ============ 配置 ============

const FATIGUE_CONFIG = {
  // 每日聯繫限制（按階段）
  dailyLimit: {
    stranger: 1,
    visitor: 2,
    lead: 2,
    qualified: 3,
    customer: 1,
    advocate: 1,
    dormant: 1
  } as Record<FunnelStage, number>,
  
  // 最小消息間隔（小時，按階段）
  minInterval: {
    stranger: 24,
    visitor: 12,
    lead: 8,
    qualified: 4,
    customer: 48,
    advocate: 72,
    dormant: 168
  } as Record<FunnelStage, number>,
  
  // 連續無回覆閾值
  noReplyThreshold: 3,
  
  // 無回覆後降頻倍數
  noReplyPenaltyMultiplier: 2,
  
  // 負面情緒後暫停天數
  negativeSentimentPauseDays: 7,
  
  // 疲勞度恢復速率（每小時恢復的疲勞度）
  recoveryRate: 2,
  
  // 最大疲勞度
  maxFatigue: 100,
  
  // 疲勞度閾值（超過此值暫停聯繫）
  fatigueThreshold: 80,
  
  // 動作疲勞度增量
  actionFatigue: {
    businessMessage: 25,
    casualMessage: 15,
    greeting: 10,
    followUp: 20,
    promotion: 30
  }
};

// ============ 類型定義 ============

/** 疲勞度狀態 */
export interface FatigueStatus {
  leadId: string;
  /** 當前疲勞度 (0-100) */
  currentFatigue: number;
  /** 今日已發送消息數 */
  todayMessageCount: number;
  /** 今日限制 */
  dailyLimit: number;
  /** 距離上次聯繫的小時數 */
  hoursSinceLastContact: number;
  /** 最小間隔要求（小時） */
  minIntervalHours: number;
  /** 連續無回覆次數 */
  consecutiveNoReply: number;
  /** 是否可以聯繫 */
  canContact: boolean;
  /** 不可聯繫原因 */
  blockReason?: string;
  /** 建議下次聯繫時間 */
  nextContactTime?: Date;
  /** 最後更新時間 */
  updatedAt: Date;
}

/** 疲勞度歷史記錄 */
export interface FatigueRecord {
  leadId: string;
  timestamp: Date;
  action: string;
  fatigueChange: number;
  newFatigue: number;
  reason: string;
}

/** 聯繫決策 */
export interface ContactDecision {
  allowed: boolean;
  reason: string;
  suggestedDelay?: number; // 建議延遲（小時）
  alternativeAction?: string;
  fatigueImpact: number;
}

@Injectable({
  providedIn: 'root'
})
export class FatigueControllerService {
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 疲勞度緩存
  private _fatigueCache = signal<Map<string, FatigueStatus>>(new Map());
  fatigueCache = computed(() => this._fatigueCache());
  
  // 今日聯繫計數
  private _todayContacts = signal<Map<string, number>>(new Map());
  
  // 疲勞度歷史
  private _fatigueHistory = signal<FatigueRecord[]>([]);
  fatigueHistory = computed(() => this._fatigueHistory());
  
  // 暫停名單（負面情緒觸發）
  private _pausedLeads = signal<Map<string, Date>>(new Map());
  pausedLeads = computed(() => this._pausedLeads());
  
  // 恢復定時器
  private recoveryTimer: any;
  
  constructor() {
    this.loadData();
    this.startRecoveryTimer();
  }
  
  // ============ 核心功能 ============
  
  /**
   * 獲取用戶疲勞度狀態
   */
  getFatigueStatus(leadId: string): FatigueStatus {
    const cached = this._fatigueCache().get(leadId);
    if (cached && this.isStatusFresh(cached)) {
      return cached;
    }
    
    return this.calculateFatigueStatus(leadId);
  }
  
  /**
   * 計算疲勞度狀態
   */
  private calculateFatigueStatus(leadId: string): FatigueStatus {
    const lead = this.leadService.getLead(leadId);
    if (!lead) {
      return this.createEmptyStatus(leadId);
    }
    
    const now = new Date();
    
    // 計算基礎數據
    const todayCount = this._todayContacts().get(leadId) || 0;
    const dailyLimit = FATIGUE_CONFIG.dailyLimit[lead.stage];
    const minInterval = this.getEffectiveMinInterval(lead);
    
    // 計算距離上次聯繫的時間
    const lastContact = lead.lastFollowUpAt || lead.lastInteractionAt;
    const hoursSinceContact = lastContact 
      ? (now.getTime() - new Date(lastContact).getTime()) / 3600000
      : Infinity;
    
    // 計算連續無回覆次數
    const noReplyCount = this.getConsecutiveNoReplyCount(lead);
    
    // 計算當前疲勞度
    const currentFatigue = this.calculateCurrentFatigue(lead, noReplyCount);
    
    // 判斷是否可以聯繫
    const { canContact, blockReason } = this.checkCanContact(
      lead, todayCount, dailyLimit, hoursSinceContact, minInterval, currentFatigue
    );
    
    // 計算下次可聯繫時間
    const nextContactTime = canContact ? undefined : this.calculateNextContactTime(
      lead, hoursSinceContact, minInterval
    );
    
    const status: FatigueStatus = {
      leadId,
      currentFatigue,
      todayMessageCount: todayCount,
      dailyLimit,
      hoursSinceLastContact: Math.round(hoursSinceContact * 10) / 10,
      minIntervalHours: minInterval,
      consecutiveNoReply: noReplyCount,
      canContact,
      blockReason,
      nextContactTime,
      updatedAt: now
    };
    
    // 更新緩存
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.set(leadId, status);
      return newCache;
    });
    
    return status;
  }
  
  /**
   * 檢查是否可以聯繫
   */
  private checkCanContact(
    lead: Lead,
    todayCount: number,
    dailyLimit: number,
    hoursSinceContact: number,
    minInterval: number,
    currentFatigue: number
  ): { canContact: boolean; blockReason?: string } {
    // 檢查是否在暫停名單
    const pauseUntil = this._pausedLeads().get(lead.id);
    if (pauseUntil && pauseUntil > new Date()) {
      return {
        canContact: false,
        blockReason: `因負面情緒暫停至 ${pauseUntil.toLocaleDateString()}`
      };
    }
    
    // 檢查每日限制
    if (todayCount >= dailyLimit) {
      return {
        canContact: false,
        blockReason: `已達今日限制 (${todayCount}/${dailyLimit})`
      };
    }
    
    // 檢查最小間隔
    if (hoursSinceContact < minInterval) {
      return {
        canContact: false,
        blockReason: `間隔不足 (${Math.round(hoursSinceContact)}h/${minInterval}h)`
      };
    }
    
    // 檢查疲勞度
    if (currentFatigue >= FATIGUE_CONFIG.fatigueThreshold) {
      return {
        canContact: false,
        blockReason: `疲勞度過高 (${currentFatigue}%)`
      };
    }
    
    // 檢查不聯繫標記
    if (lead.doNotContact) {
      return {
        canContact: false,
        blockReason: '用戶已標記為不聯繫'
      };
    }
    
    return { canContact: true };
  }
  
  /**
   * 獲取有效的最小間隔（考慮無回覆懲罰）
   */
  private getEffectiveMinInterval(lead: Lead): number {
    const baseInterval = FATIGUE_CONFIG.minInterval[lead.stage];
    const noReplyCount = this.getConsecutiveNoReplyCount(lead);
    
    if (noReplyCount >= FATIGUE_CONFIG.noReplyThreshold) {
      // 應用無回覆懲罰
      const penalty = Math.min(noReplyCount - FATIGUE_CONFIG.noReplyThreshold + 1, 3);
      return baseInterval * (1 + penalty * 0.5);
    }
    
    return baseInterval;
  }
  
  /**
   * 獲取連續無回覆次數
   */
  private getConsecutiveNoReplyCount(lead: Lead): number {
    const conversations = this.leadService.getConversations(lead.id);
    if (conversations.length === 0) return 0;
    
    // 獲取所有消息並按時間排序
    const allMessages = conversations
      .flatMap(c => c.messages)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    let count = 0;
    for (const msg of allMessages) {
      if (msg.role === 'assistant') {
        count++;
      } else {
        break; // 遇到用戶回覆就停止計數
      }
    }
    
    return count;
  }
  
  /**
   * 計算當前疲勞度
   */
  private calculateCurrentFatigue(lead: Lead, noReplyCount: number): number {
    let fatigue = 0;
    
    // 基於今日聯繫次數
    const todayCount = this._todayContacts().get(lead.id) || 0;
    fatigue += todayCount * 20;
    
    // 基於連續無回覆
    if (noReplyCount >= FATIGUE_CONFIG.noReplyThreshold) {
      fatigue += (noReplyCount - FATIGUE_CONFIG.noReplyThreshold + 1) * 15;
    }
    
    // 基於距離上次聯繫的時間恢復
    const lastContact = lead.lastFollowUpAt || lead.lastInteractionAt;
    if (lastContact) {
      const hoursSince = (Date.now() - new Date(lastContact).getTime()) / 3600000;
      const recovery = Math.floor(hoursSince * FATIGUE_CONFIG.recoveryRate);
      fatigue = Math.max(0, fatigue - recovery);
    }
    
    return Math.min(FATIGUE_CONFIG.maxFatigue, fatigue);
  }
  
  /**
   * 計算下次可聯繫時間
   */
  private calculateNextContactTime(
    lead: Lead,
    hoursSinceContact: number,
    minInterval: number
  ): Date {
    const now = new Date();
    
    // 如果是間隔問題
    if (hoursSinceContact < minInterval) {
      const hoursToWait = minInterval - hoursSinceContact;
      return new Date(now.getTime() + hoursToWait * 3600000);
    }
    
    // 如果是每日限制問題，等到明天
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }
  
  // ============ 聯繫決策 ============
  
  /**
   * 請求聯繫許可
   */
  requestContactPermission(
    leadId: string, 
    actionType: keyof typeof FATIGUE_CONFIG.actionFatigue = 'businessMessage'
  ): ContactDecision {
    const status = this.getFatigueStatus(leadId);
    const fatigueImpact = FATIGUE_CONFIG.actionFatigue[actionType];
    
    if (!status.canContact) {
      // 計算建議延遲
      let suggestedDelay = 0;
      if (status.nextContactTime) {
        suggestedDelay = Math.ceil(
          (status.nextContactTime.getTime() - Date.now()) / 3600000
        );
      }
      
      // 建議替代動作
      let alternativeAction: string | undefined;
      if (status.blockReason?.includes('疲勞度')) {
        alternativeAction = '建議發送輕量問候而非業務消息';
      } else if (status.blockReason?.includes('無回覆')) {
        alternativeAction = '建議等待用戶主動回覆';
      }
      
      return {
        allowed: false,
        reason: status.blockReason || '無法聯繫',
        suggestedDelay,
        alternativeAction,
        fatigueImpact
      };
    }
    
    // 檢查動作會不會導致疲勞度超標
    const projectedFatigue = status.currentFatigue + fatigueImpact;
    if (projectedFatigue >= FATIGUE_CONFIG.fatigueThreshold) {
      return {
        allowed: true,
        reason: '允許但疲勞度將接近上限',
        alternativeAction: '建議使用較輕量的溝通方式',
        fatigueImpact
      };
    }
    
    return {
      allowed: true,
      reason: '可以聯繫',
      fatigueImpact
    };
  }
  
  /**
   * 記錄聯繫動作
   */
  recordContact(
    leadId: string, 
    actionType: keyof typeof FATIGUE_CONFIG.actionFatigue = 'businessMessage'
  ): void {
    const fatigueChange = FATIGUE_CONFIG.actionFatigue[actionType];
    const now = new Date();
    
    // 更新今日計數
    this._todayContacts.update(counts => {
      const newCounts = new Map(counts);
      const current = newCounts.get(leadId) || 0;
      newCounts.set(leadId, current + 1);
      return newCounts;
    });
    
    // 記錄疲勞度變化
    const status = this.getFatigueStatus(leadId);
    const newFatigue = Math.min(
      FATIGUE_CONFIG.maxFatigue,
      status.currentFatigue + fatigueChange
    );
    
    this._fatigueHistory.update(history => [
      {
        leadId,
        timestamp: now,
        action: actionType,
        fatigueChange,
        newFatigue,
        reason: '發送消息'
      },
      ...history.slice(0, 499)
    ]);
    
    // 清除緩存以便重新計算
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this.saveData();
  }
  
  /**
   * 記錄用戶回覆（降低疲勞度）
   */
  recordUserReply(leadId: string): void {
    // 用戶回覆時大幅降低疲勞度
    const status = this.getFatigueStatus(leadId);
    const fatigueReduction = -30;
    const newFatigue = Math.max(0, status.currentFatigue + fatigueReduction);
    
    this._fatigueHistory.update(history => [
      {
        leadId,
        timestamp: new Date(),
        action: 'user_reply',
        fatigueChange: fatigueReduction,
        newFatigue,
        reason: '用戶回覆'
      },
      ...history.slice(0, 499)
    ]);
    
    // 清除緩存
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this.saveData();
  }
  
  /**
   * 記錄負面情緒（觸發暫停）
   */
  recordNegativeSentiment(leadId: string): void {
    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + FATIGUE_CONFIG.negativeSentimentPauseDays);
    
    this._pausedLeads.update(paused => {
      const newPaused = new Map(paused);
      newPaused.set(leadId, pauseUntil);
      return newPaused;
    });
    
    this._fatigueHistory.update(history => [
      {
        leadId,
        timestamp: new Date(),
        action: 'negative_sentiment',
        fatigueChange: 50,
        newFatigue: 100,
        reason: `檢測到負面情緒，暫停至 ${pauseUntil.toLocaleDateString()}`
      },
      ...history.slice(0, 499)
    ]);
    
    // 清除緩存
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this.saveData();
    
    console.log(`[FatigueController] Lead ${leadId} paused until ${pauseUntil}`);
  }
  
  // ============ 批量操作 ============
  
  /**
   * 獲取可聯繫的客戶列表
   */
  getContactableLeads(): Lead[] {
    return this.leadService.leads().filter(lead => {
      if (!lead.isNurturing || lead.doNotContact) return false;
      const status = this.getFatigueStatus(lead.id);
      return status.canContact;
    });
  }
  
  /**
   * 獲取疲勞度統計
   */
  getFatigueStats(): {
    totalLeads: number;
    contactable: number;
    fatigued: number;
    paused: number;
    avgFatigue: number;
  } {
    const leads = this.leadService.leads().filter(l => l.isNurturing);
    let contactable = 0;
    let fatigued = 0;
    let totalFatigue = 0;
    
    for (const lead of leads) {
      const status = this.getFatigueStatus(lead.id);
      totalFatigue += status.currentFatigue;
      
      if (status.canContact) {
        contactable++;
      } else if (status.currentFatigue >= FATIGUE_CONFIG.fatigueThreshold) {
        fatigued++;
      }
    }
    
    // 清理過期的暫停記錄
    const now = new Date();
    const activePaused = Array.from(this._pausedLeads().entries())
      .filter(([_, until]) => until > now).length;
    
    return {
      totalLeads: leads.length,
      contactable,
      fatigued,
      paused: activePaused,
      avgFatigue: leads.length > 0 ? Math.round(totalFatigue / leads.length) : 0
    };
  }
  
  // ============ 恢復機制 ============
  
  /**
   * 啟動疲勞度恢復定時器
   */
  private startRecoveryTimer(): void {
    // 每小時執行一次恢復
    this.recoveryTimer = setInterval(() => {
      this.processRecovery();
    }, 3600000);
    
    // 每天重置今日計數
    this.scheduleDailyReset();
  }
  
  /**
   * 處理疲勞度恢復
   */
  private processRecovery(): void {
    // 清除所有緩存，讓下次訪問時重新計算（包含恢復）
    this._fatigueCache.set(new Map());
    
    // 清理過期的暫停記錄
    const now = new Date();
    this._pausedLeads.update(paused => {
      const newPaused = new Map();
      for (const [leadId, until] of paused) {
        if (until > now) {
          newPaused.set(leadId, until);
        }
      }
      return newPaused;
    });
  }
  
  /**
   * 安排每日重置
   */
  private scheduleDailyReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCounters();
      // 重新安排
      this.scheduleDailyReset();
    }, msUntilMidnight);
  }
  
  /**
   * 重置每日計數
   */
  private resetDailyCounters(): void {
    this._todayContacts.set(new Map());
    this._fatigueCache.set(new Map());
    this.saveData();
    console.log('[FatigueController] Daily counters reset');
  }
  
  // ============ 手動控制 ============
  
  /**
   * 手動重置用戶疲勞度
   */
  resetFatigue(leadId: string): void {
    this._todayContacts.update(counts => {
      const newCounts = new Map(counts);
      newCounts.delete(leadId);
      return newCounts;
    });
    
    this._pausedLeads.update(paused => {
      const newPaused = new Map(paused);
      newPaused.delete(leadId);
      return newPaused;
    });
    
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this._fatigueHistory.update(history => [
      {
        leadId,
        timestamp: new Date(),
        action: 'manual_reset',
        fatigueChange: 0,
        newFatigue: 0,
        reason: '手動重置'
      },
      ...history.slice(0, 499)
    ]);
    
    this.saveData();
  }
  
  /**
   * 手動暫停用戶
   */
  pauseLead(leadId: string, days: number): void {
    const pauseUntil = new Date();
    pauseUntil.setDate(pauseUntil.getDate() + days);
    
    this._pausedLeads.update(paused => {
      const newPaused = new Map(paused);
      newPaused.set(leadId, pauseUntil);
      return newPaused;
    });
    
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this.saveData();
  }
  
  /**
   * 取消暫停
   */
  unpauseLead(leadId: string): void {
    this._pausedLeads.update(paused => {
      const newPaused = new Map(paused);
      newPaused.delete(leadId);
      return newPaused;
    });
    
    this._fatigueCache.update(cache => {
      const newCache = new Map(cache);
      newCache.delete(leadId);
      return newCache;
    });
    
    this.saveData();
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 檢查狀態是否新鮮
   */
  private isStatusFresh(status: FatigueStatus): boolean {
    const age = Date.now() - status.updatedAt.getTime();
    return age < 60000; // 1分鐘內有效
  }
  
  /**
   * 創建空狀態
   */
  private createEmptyStatus(leadId: string): FatigueStatus {
    return {
      leadId,
      currentFatigue: 0,
      todayMessageCount: 0,
      dailyLimit: 2,
      hoursSinceLastContact: Infinity,
      minIntervalHours: 24,
      consecutiveNoReply: 0,
      canContact: false,
      blockReason: '用戶不存在',
      updatedAt: new Date()
    };
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      const today = new Date().toDateString();
      
      localStorage.setItem('tgai-fatigue-today-contacts', JSON.stringify({
        date: today,
        contacts: Array.from(this._todayContacts().entries())
      }));
      
      localStorage.setItem('tgai-fatigue-paused', JSON.stringify(
        Array.from(this._pausedLeads().entries()).map(([k, v]) => [k, v.toISOString()])
      ));
      
      localStorage.setItem('tgai-fatigue-history', JSON.stringify(
        this._fatigueHistory().slice(0, 200)
      ));
    } catch (e) {
      console.error('[FatigueController] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const today = new Date().toDateString();
      
      // 載入今日計數
      const contactsData = localStorage.getItem('tgai-fatigue-today-contacts');
      if (contactsData) {
        const parsed = JSON.parse(contactsData);
        if (parsed.date === today) {
          this._todayContacts.set(new Map(parsed.contacts));
        }
      }
      
      // 載入暫停名單
      const pausedData = localStorage.getItem('tgai-fatigue-paused');
      if (pausedData) {
        const entries = JSON.parse(pausedData).map(([k, v]: [string, string]) => 
          [k, new Date(v)]
        );
        this._pausedLeads.set(new Map(entries));
      }
      
      // 載入歷史
      const historyData = localStorage.getItem('tgai-fatigue-history');
      if (historyData) {
        const history = JSON.parse(historyData).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
        this._fatigueHistory.set(history);
      }
      
      console.log('[FatigueController] Data loaded');
    } catch (e) {
      console.error('[FatigueController] Load error:', e);
    }
  }
}
