/**
 * TG-AI智控王 跟進調度器服務
 * Follow-Up Scheduler Service v1.0
 * 
 * 功能：
 * - 智能跟進時機選擇
 * - 在線狀態監測
 * - 跟進隊列管理
 * - 頻率自動調整
 * - 疲勞度控制
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { LeadService } from './lead.service';
import {
  Lead,
  FollowUp,
  ConversationType,
  FunnelStage,
  FollowUpStatus
} from './lead.models';

// ============ 配置 ============

const SCHEDULER_CONFIG = {
  // 調度間隔（毫秒）
  scheduleInterval: 60000, // 每分鐘檢查一次
  
  // 活躍時段
  activeHours: {
    start: 9,   // 09:00
    end: 22,    // 22:00
    preferredStart: 10,
    preferredEnd: 12,
    eveningStart: 19,
    eveningEnd: 21
  },
  
  // 疲勞度控制
  fatigue: {
    // 單個用戶最大每日消息數
    maxDailyMessagesPerUser: 3,
    // 消息間最小間隔（小時）
    minHoursBetweenMessages: 4,
    // 連續無回覆後降低頻率
    reduceFrequencyAfterNoReply: 3,
    // 負面情緒後暫停天數
    pauseDaysAfterNegative: 7
  },
  
  // 優先級權重
  priorityWeights: {
    onlineStatus: 0.30,
    activeHours: 0.20,
    intervalSinceLastContact: 0.15,
    responseRate: 0.15,
    intentScore: 0.10,
    fatigue: 0.10
  },
  
  // 階段對應的跟進策略
  stageStrategy: {
    stranger: { businessRatio: 0.7, casualRatio: 0.3 },
    visitor: { businessRatio: 0.6, casualRatio: 0.4 },
    lead: { businessRatio: 0.5, casualRatio: 0.5 },
    qualified: { businessRatio: 0.8, casualRatio: 0.2 },
    customer: { businessRatio: 0.3, casualRatio: 0.7 },
    advocate: { businessRatio: 0.2, casualRatio: 0.8 },
    dormant: { businessRatio: 0.5, casualRatio: 0.5 }
  } as Record<FunnelStage, { businessRatio: number; casualRatio: number }>
};

// ============ 類型定義 ============

/** 跟進優先級評分 */
export interface FollowUpPriorityScore {
  leadId: string;
  score: number;
  factors: {
    onlineStatus: number;
    activeHours: number;
    intervalScore: number;
    responseRate: number;
    intentScore: number;
    fatigueScore: number;
  };
  recommendedType: ConversationType;
  recommendedTime: Date;
  reason: string;
}

/** 調度器狀態 */
export interface SchedulerStatus {
  isRunning: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  pendingCount: number;
  executedTodayCount: number;
  queuedCount: number;
}

/** 執行結果 */
export interface ExecutionResult {
  followUpId: string;
  leadId: string;
  success: boolean;
  message?: string;
  error?: string;
  executedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FollowUpSchedulerService implements OnDestroy {
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 調度器運行狀態
  private _isRunning = signal(false);
  isRunning = computed(() => this._isRunning());
  
  // 調度器狀態
  private _status = signal<SchedulerStatus>({
    isRunning: false,
    pendingCount: 0,
    executedTodayCount: 0,
    queuedCount: 0
  });
  status = computed(() => this._status());
  
  // 優先級隊列
  private _priorityQueue = signal<FollowUpPriorityScore[]>([]);
  priorityQueue = computed(() => this._priorityQueue());
  
  // 今日執行記錄
  private _todayExecutions = signal<ExecutionResult[]>([]);
  todayExecutions = computed(() => this._todayExecutions());
  
  // 用戶在線狀態緩存
  private _onlineStatusCache = signal<Map<string, { status: string; lastChecked: Date }>>(new Map());
  
  // 定時器
  private schedulerInterval: any;
  private statusCheckInterval: any;
  
  // ============ 計算屬性 ============
  
  // 待執行數量
  pendingCount = computed(() => 
    this.leadService.getPendingFollowUps().length
  );
  
  // 今日已執行數量
  executedTodayCount = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this._todayExecutions().filter(e => 
      e.executedAt >= today
    ).length;
  });
  
  constructor() {
    this.loadExecutionHistory();
  }
  
  ngOnDestroy(): void {
    this.stop();
  }
  
  // ============ 調度器控制 ============
  
  /**
   * 啟動調度器
   */
  start(): void {
    if (this._isRunning()) {
      console.log('[Scheduler] Already running');
      return;
    }
    
    console.log('[Scheduler] Starting...');
    this._isRunning.set(true);
    
    // 立即執行一次
    this.runScheduleCycle();
    
    // 設置定時調度
    this.schedulerInterval = setInterval(() => {
      this.runScheduleCycle();
    }, SCHEDULER_CONFIG.scheduleInterval);
    
    // 設置狀態檢查
    this.statusCheckInterval = setInterval(() => {
      this.updateStatus();
    }, 30000);
    
    this.updateStatus();
    console.log('[Scheduler] Started');
  }
  
  /**
   * 停止調度器
   */
  stop(): void {
    if (!this._isRunning()) return;
    
    console.log('[Scheduler] Stopping...');
    this._isRunning.set(false);
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
    }
    
    this.updateStatus();
    console.log('[Scheduler] Stopped');
  }
  
  /**
   * 暫停調度器
   */
  pause(): void {
    this.stop();
  }
  
  /**
   * 恢復調度器
   */
  resume(): void {
    this.start();
  }
  
  // ============ 調度週期 ============
  
  /**
   * 運行調度週期
   */
  private async runScheduleCycle(): Promise<void> {
    if (!this._isRunning()) return;
    
    const now = new Date();
    
    // 檢查是否在活躍時段
    if (!this.isWithinActiveHours(now)) {
      console.log('[Scheduler] Outside active hours, skipping');
      return;
    }
    
    console.log('[Scheduler] Running schedule cycle...');
    
    try {
      // 1. 更新優先級隊列
      await this.updatePriorityQueue();
      
      // 2. 處理到期的跟進
      await this.processScheduledFollowUps();
      
      // 3. 為沒有跟進計劃的客戶創建計劃
      await this.createMissingFollowUps();
      
      // 更新狀態
      this._status.update(s => ({
        ...s,
        lastRunAt: now,
        nextRunAt: new Date(now.getTime() + SCHEDULER_CONFIG.scheduleInterval)
      }));
      
    } catch (error) {
      console.error('[Scheduler] Error in schedule cycle:', error);
    }
  }
  
  /**
   * 更新優先級隊列
   */
  private async updatePriorityQueue(): Promise<void> {
    const leads = this.leadService.leads().filter(l => 
      l.isNurturing && !l.doNotContact
    );
    
    const priorityScores: FollowUpPriorityScore[] = [];
    
    for (const lead of leads) {
      const score = this.calculatePriorityScore(lead);
      priorityScores.push(score);
    }
    
    // 按分數排序
    priorityScores.sort((a, b) => b.score - a.score);
    
    this._priorityQueue.set(priorityScores);
  }
  
  /**
   * 計算優先級分數
   */
  calculatePriorityScore(lead: Lead): FollowUpPriorityScore {
    const now = new Date();
    const weights = SCHEDULER_CONFIG.priorityWeights;
    
    // 1. 在線狀態分數
    const onlineScore = this.calculateOnlineScore(lead);
    
    // 2. 活躍時段分數
    const activeHoursScore = this.calculateActiveHoursScore(lead, now);
    
    // 3. 距離上次聯繫的間隔分數
    const intervalScore = this.calculateIntervalScore(lead);
    
    // 4. 回覆率分數
    const responseRateScore = lead.stats.responseRate * 100;
    
    // 5. 購買意向分數
    const intentScore = lead.scores.intent;
    
    // 6. 疲勞度分數（越低越需要休息）
    const fatigueScore = this.calculateFatigueScore(lead);
    
    // 計算加權總分
    const totalScore = 
      onlineScore * weights.onlineStatus +
      activeHoursScore * weights.activeHours +
      intervalScore * weights.intervalSinceLastContact +
      responseRateScore * weights.responseRate +
      intentScore * weights.intentScore +
      fatigueScore * weights.fatigue;
    
    // 確定推薦的跟進類型
    const strategy = SCHEDULER_CONFIG.stageStrategy[lead.stage];
    const recommendedType: ConversationType = 
      Math.random() < strategy.businessRatio ? 'business' : 'casual';
    
    // 確定推薦時間
    const recommendedTime = this.calculateRecommendedTime(lead);
    
    // 生成原因說明
    const reason = this.generateReasonText(lead, {
      onlineScore,
      activeHoursScore,
      intervalScore,
      responseRateScore,
      intentScore,
      fatigueScore
    });
    
    return {
      leadId: lead.id,
      score: Math.round(totalScore),
      factors: {
        onlineStatus: onlineScore,
        activeHours: activeHoursScore,
        intervalScore,
        responseRate: responseRateScore,
        intentScore,
        fatigueScore
      },
      recommendedType,
      recommendedTime,
      reason
    };
  }
  
  /**
   * 計算在線狀態分數
   */
  private calculateOnlineScore(lead: Lead): number {
    switch (lead.onlineStatus) {
      case 'online':
        return 100;
      case 'recently':
        return 70;
      case 'offline':
        return 30;
      default:
        return 50;
    }
  }
  
  /**
   * 計算活躍時段分數
   */
  private calculateActiveHoursScore(lead: Lead, now: Date): number {
    const currentHour = now.getHours();
    const config = SCHEDULER_CONFIG.activeHours;
    
    // 如果不在活躍時段，返回低分
    if (currentHour < config.start || currentHour >= config.end) {
      return 10;
    }
    
    // 優先時段給高分
    if ((currentHour >= config.preferredStart && currentHour < config.preferredEnd) ||
        (currentHour >= config.eveningStart && currentHour < config.eveningEnd)) {
      return 100;
    }
    
    // 根據用戶畫像中的活躍時段調整
    if (lead.profile.activeHours.length > 0) {
      for (const range of lead.profile.activeHours) {
        if (currentHour >= range.start && currentHour < range.end) {
          return 90;
        }
      }
    }
    
    return 60;
  }
  
  /**
   * 計算距離上次聯繫的間隔分數
   */
  private calculateIntervalScore(lead: Lead): number {
    if (!lead.lastInteractionAt) {
      return 100; // 從未聯繫，優先處理
    }
    
    const daysSinceContact = (Date.now() - new Date(lead.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24);
    const expectedDays = lead.nurturingConfig.businessFollowUpDays;
    
    if (daysSinceContact >= expectedDays) {
      // 超過預期間隔，需要跟進
      return Math.min(100, 50 + (daysSinceContact - expectedDays) * 10);
    } else {
      // 還沒到時間
      return Math.max(0, 50 - (expectedDays - daysSinceContact) * 10);
    }
  }
  
  /**
   * 計算疲勞度分數
   */
  private calculateFatigueScore(lead: Lead): number {
    const config = SCHEDULER_CONFIG.fatigue;
    
    // 檢查今日已發送消息數
    const todayMessages = this.getTodayMessagesForLead(lead.id);
    if (todayMessages >= config.maxDailyMessagesPerUser) {
      return 0; // 已達今日上限
    }
    
    // 檢查上次消息間隔
    if (lead.lastFollowUpAt) {
      const hoursSinceLastMessage = (Date.now() - new Date(lead.lastFollowUpAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastMessage < config.minHoursBetweenMessages) {
        return 0; // 間隔太短
      }
    }
    
    // 檢查連續無回覆次數
    const consecutiveNoReply = this.getConsecutiveNoReplyCount(lead.id);
    if (consecutiveNoReply >= config.reduceFrequencyAfterNoReply) {
      return 30; // 連續無回覆，降低優先級
    }
    
    return 100;
  }
  
  /**
   * 獲取今日發送給某用戶的消息數
   */
  private getTodayMessagesForLead(leadId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this._todayExecutions().filter(e => 
      e.leadId === leadId && 
      e.success && 
      e.executedAt >= today
    ).length;
  }
  
  /**
   * 獲取連續無回覆次數
   */
  private getConsecutiveNoReplyCount(leadId: string): number {
    const conversations = this.leadService.getConversations(leadId);
    if (conversations.length === 0) return 0;
    
    let count = 0;
    const allMessages = conversations
      .flatMap(c => c.messages)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    for (const msg of allMessages) {
      if (msg.role === 'assistant') {
        count++;
      } else {
        break;
      }
    }
    
    return count;
  }
  
  /**
   * 計算推薦時間
   */
  private calculateRecommendedTime(lead: Lead): Date {
    const now = new Date();
    const config = SCHEDULER_CONFIG.activeHours;
    
    // 如果用戶有活躍時段偏好，優先使用
    if (lead.profile.activeHours.length > 0) {
      const preferred = lead.profile.activeHours[0];
      const recommendedHour = Math.floor((preferred.start + preferred.end) / 2);
      
      const recommended = new Date(now);
      recommended.setHours(recommendedHour, 0, 0, 0);
      
      // 如果今天這個時間已過，安排明天
      if (recommended <= now) {
        recommended.setDate(recommended.getDate() + 1);
      }
      
      return recommended;
    }
    
    // 否則使用默認優先時段
    const currentHour = now.getHours();
    const recommended = new Date(now);
    
    if (currentHour < config.preferredStart) {
      recommended.setHours(config.preferredStart, 0, 0, 0);
    } else if (currentHour < config.preferredEnd) {
      // 在優先時段內，立即
      return now;
    } else if (currentHour < config.eveningStart) {
      recommended.setHours(config.eveningStart, 0, 0, 0);
    } else if (currentHour < config.eveningEnd) {
      // 在晚間優先時段內，立即
      return now;
    } else {
      // 已過晚間優先時段，安排明天
      recommended.setDate(recommended.getDate() + 1);
      recommended.setHours(config.preferredStart, 0, 0, 0);
    }
    
    return recommended;
  }
  
  /**
   * 生成原因文本
   */
  private generateReasonText(lead: Lead, factors: Record<string, number>): string {
    const reasons: string[] = [];
    
    if (factors.onlineScore >= 100) {
      reasons.push('用戶當前在線');
    } else if (factors.onlineScore >= 70) {
      reasons.push('用戶最近活躍');
    }
    
    if (factors.intervalScore >= 80) {
      reasons.push('距離上次聯繫較久');
    }
    
    if (factors.intentScore >= 70) {
      reasons.push('購買意向較高');
    }
    
    if (factors.fatigueScore <= 30) {
      reasons.push('建議降低跟進頻率');
    }
    
    if (reasons.length === 0) {
      reasons.push('定期維護');
    }
    
    return reasons.join('，');
  }
  
  // ============ 跟進處理 ============
  
  /**
   * 處理排程的跟進
   */
  private async processScheduledFollowUps(): Promise<void> {
    const pendingFollowUps = this.leadService.getPendingFollowUps();
    
    for (const followUp of pendingFollowUps) {
      const lead = this.leadService.getLead(followUp.leadId);
      if (!lead) continue;
      
      // 檢查疲勞度
      const fatigueScore = this.calculateFatigueScore(lead);
      if (fatigueScore === 0) {
        console.log(`[Scheduler] Skipping follow-up for ${lead.displayName} due to fatigue`);
        continue;
      }
      
      // 標記為待執行
      this.leadService.updateFollowUpStatus(followUp.id, 'pending');
      
      console.log(`[Scheduler] Follow-up ready for ${lead.displayName}: ${followUp.type}`);
    }
  }
  
  /**
   * 為沒有跟進計劃的客戶創建計劃
   */
  private async createMissingFollowUps(): Promise<void> {
    const leads = this.leadService.leads().filter(l => 
      l.isNurturing && 
      !l.doNotContact &&
      !l.nextFollowUpAt
    );
    
    for (const lead of leads) {
      const priorityScore = this._priorityQueue().find(p => p.leadId === lead.id);
      if (!priorityScore) continue;
      
      this.leadService.createFollowUp(
        lead.id,
        priorityScore.recommendedType,
        priorityScore.recommendedTime,
        {
          suggestedTopics: this.getSuggestedTopics(lead, priorityScore.recommendedType)
        }
      );
      
      console.log(`[Scheduler] Created follow-up for ${lead.displayName}`);
    }
  }
  
  /**
   * 獲取建議話題
   */
  private getSuggestedTopics(lead: Lead, type: ConversationType): string[] {
    if (type === 'business') {
      return ['產品介紹', '優惠活動', '案例分享'];
    } else {
      // 根據用戶興趣選擇話題
      if (lead.profile.interests.length > 0) {
        return lead.profile.interests.slice(0, 3);
      }
      return ['日常問候', '近況', '熱點話題'];
    }
  }
  
  // ============ 手動操作 ============
  
  /**
   * 立即執行跟進
   */
  async executeFollowUpNow(followUpId: string): Promise<ExecutionResult> {
    const followUp = this.leadService.followUps().find(f => f.id === followUpId);
    if (!followUp) {
      return {
        followUpId,
        leadId: '',
        success: false,
        error: '跟進計劃不存在',
        executedAt: new Date()
      };
    }
    
    const lead = this.leadService.getLead(followUp.leadId);
    if (!lead) {
      return {
        followUpId,
        leadId: followUp.leadId,
        success: false,
        error: '客戶不存在',
        executedAt: new Date()
      };
    }
    
    // 這裡需要與消息發送系統集成
    // 暫時只更新狀態
    this.leadService.updateFollowUpStatus(followUpId, 'executed', {
      success: true
    });
    
    const result: ExecutionResult = {
      followUpId,
      leadId: lead.id,
      success: true,
      message: `已發送${followUp.type === 'business' ? '業務' : '情感維護'}消息`,
      executedAt: new Date()
    };
    
    this._todayExecutions.update(execs => [...execs, result]);
    this.saveExecutionHistory();
    
    return result;
  }
  
  /**
   * 跳過跟進
   */
  skipFollowUp(followUpId: string, reason?: string): void {
    this.leadService.updateFollowUpStatus(followUpId, 'skipped', {
      success: false,
      error: reason || '用戶手動跳過'
    });
  }
  
  /**
   * 延後跟進
   */
  postponeFollowUp(followUpId: string, days: number): void {
    const followUp = this.leadService.followUps().find(f => f.id === followUpId);
    if (!followUp) return;
    
    const newTime = new Date();
    newTime.setDate(newTime.getDate() + days);
    newTime.setHours(10, 0, 0, 0);
    
    // 創建新的跟進計劃
    this.leadService.createFollowUp(
      followUp.leadId,
      followUp.type,
      newTime,
      followUp.content
    );
    
    // 取消當前計劃
    this.leadService.updateFollowUpStatus(followUpId, 'cancelled');
  }
  
  /**
   * 批量執行跟進
   */
  async executeBatchFollowUps(followUpIds: string[]): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const id of followUpIds) {
      const result = await this.executeFollowUpNow(id);
      results.push(result);
      
      // 添加延遲避免發送過快
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }
  
  // ============ 在線狀態 ============
  
  /**
   * 更新用戶在線狀態
   */
  updateOnlineStatus(leadId: string, status: 'online' | 'offline' | 'recently'): void {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return;
    
    this.leadService.updateLead(leadId, {
      // 這裡需要擴展 UpdateLeadInput 來支持在線狀態
    });
    
    // 更新緩存
    this._onlineStatusCache.update(cache => {
      const newCache = new Map(cache);
      newCache.set(leadId, { status, lastChecked: new Date() });
      return newCache;
    });
    
    // 如果用戶在線且有待執行的跟進，提升優先級
    if (status === 'online') {
      this.boostPriorityForOnlineUser(leadId);
    }
  }
  
  /**
   * 提升在線用戶的優先級
   */
  private boostPriorityForOnlineUser(leadId: string): void {
    this._priorityQueue.update(queue => {
      return queue.map(item => {
        if (item.leadId !== leadId) return item;
        return {
          ...item,
          score: Math.min(100, item.score + 20),
          factors: {
            ...item.factors,
            onlineStatus: 100
          },
          reason: '用戶剛剛上線'
        };
      }).sort((a, b) => b.score - a.score);
    });
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 檢查是否在活躍時段
   */
  isWithinActiveHours(time: Date): boolean {
    const hour = time.getHours();
    const config = SCHEDULER_CONFIG.activeHours;
    return hour >= config.start && hour < config.end;
  }
  
  /**
   * 獲取下一個活躍時段開始時間
   */
  getNextActiveHoursStart(): Date {
    const now = new Date();
    const config = SCHEDULER_CONFIG.activeHours;
    
    if (this.isWithinActiveHours(now)) {
      return now;
    }
    
    const next = new Date(now);
    if (now.getHours() >= config.end) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(config.start, 0, 0, 0);
    
    return next;
  }
  
  /**
   * 更新調度器狀態
   */
  private updateStatus(): void {
    this._status.set({
      isRunning: this._isRunning(),
      lastRunAt: this._status().lastRunAt,
      nextRunAt: this._status().nextRunAt,
      pendingCount: this.pendingCount(),
      executedTodayCount: this.executedTodayCount(),
      queuedCount: this._priorityQueue().length
    });
  }
  
  // ============ 持久化 ============
  
  private saveExecutionHistory(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 只保存今天的記錄
    const todayExecutions = this._todayExecutions().filter(e => 
      e.executedAt >= today
    );
    
    localStorage.setItem(
      'tgai-followup-executions',
      JSON.stringify(todayExecutions)
    );
  }
  
  private loadExecutionHistory(): void {
    try {
      const data = localStorage.getItem('tgai-followup-executions');
      if (data) {
        const executions = JSON.parse(data).map((e: any) => ({
          ...e,
          executedAt: new Date(e.executedAt)
        }));
        
        // 只保留今天的記錄
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        this._todayExecutions.set(
          executions.filter((e: ExecutionResult) => e.executedAt >= today)
        );
      }
    } catch (e) {
      console.error('[Scheduler] Failed to load execution history:', e);
    }
  }
}
