/**
 * TG-AI智控王 智能時機選擇服務
 * Optimal Timing Service v1.0
 * 
 * 功能：
 * - 基於多因素的最佳聯繫時機計算
 * - 時區感知
 * - 歷史數據學習
 * - 動態權重調整
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { OnlineStatusMonitorService } from './online-status-monitor.service';
import { Lead, FunnelStage, ConversationType } from './lead.models';

// ============ 配置 ============

const TIMING_CONFIG = {
  // 全局活躍時段（24小時制）
  globalActiveHours: {
    weekday: { start: 9, end: 22 },
    weekend: { start: 10, end: 23 }
  },
  
  // 優先時段
  priorityPeriods: [
    { start: 10, end: 12, weight: 1.3, name: '上午黃金時段' },
    { start: 14, end: 16, weight: 1.1, name: '下午工作時段' },
    { start: 19, end: 21, weight: 1.4, name: '晚間黃金時段' }
  ],
  
  // 因素權重
  factorWeights: {
    userOnline: 0.35,         // 用戶在線狀態
    userPattern: 0.25,        // 用戶活躍模式
    globalPeriod: 0.15,       // 全局優先時段
    responseHistory: 0.15,    // 歷史回覆率
    funnelStage: 0.10         // 漏斗階段
  },
  
  // 階段緊迫度係數
  stageUrgency: {
    stranger: 0.5,
    visitor: 0.6,
    lead: 0.8,
    qualified: 1.0,
    customer: 0.4,
    advocate: 0.3,
    dormant: 0.2
  } as Record<FunnelStage, number>,
  
  // 最小聯繫間隔（小時）
  minContactInterval: {
    stranger: 48,
    visitor: 24,
    lead: 12,
    qualified: 4,
    customer: 72,
    advocate: 168,
    dormant: 168
  } as Record<FunnelStage, number>
};

// ============ 類型定義 ============

/** 時機評分 */
export interface TimingScore {
  score: number;          // 0-100
  confidence: number;     // 0-1
  factors: {
    userOnline: number;
    userPattern: number;
    globalPeriod: number;
    responseHistory: number;
    funnelStage: number;
  };
}

/** 時機建議 */
export interface TimingRecommendation {
  leadId: string;
  recommendedTime: Date;
  score: TimingScore;
  type: ConversationType;
  reason: string;
  alternatives: {
    time: Date;
    score: number;
    reason: string;
  }[];
}

/** 時間窗口 */
export interface TimeWindow {
  start: Date;
  end: Date;
  score: number;
  reason: string;
}

/** 批量時機計劃 */
export interface BatchTimingPlan {
  recommendations: TimingRecommendation[];
  totalLeads: number;
  scheduledCount: number;
  skippedCount: number;
  skippedReasons: { leadId: string; reason: string }[];
}

@Injectable({
  providedIn: 'root'
})
export class OptimalTimingService {
  private leadService = inject(LeadService);
  private onlineMonitor = inject(OnlineStatusMonitorService);
  
  // ============ 狀態 ============
  
  // 回覆率統計（按時段）
  private _hourlyResponseRates = signal<number[]>(new Array(24).fill(0.5));
  hourlyResponseRates = computed(() => this._hourlyResponseRates());
  
  // 成功聯繫歷史
  private _successfulContacts = signal<{ hour: number; dayOfWeek: number; responded: boolean }[]>([]);
  
  constructor() {
    this.loadData();
  }
  
  // ============ 核心計算 ============
  
  /**
   * 計算當前時刻的聯繫評分
   */
  calculateCurrentScore(lead: Lead): TimingScore {
    return this.calculateScoreForTime(lead, new Date());
  }
  
  /**
   * 計算指定時間的聯繫評分
   */
  calculateScoreForTime(lead: Lead, time: Date): TimingScore {
    const weights = TIMING_CONFIG.factorWeights;
    
    // 1. 用戶在線狀態分數
    const userOnlineScore = this.calculateUserOnlineScore(lead, time);
    
    // 2. 用戶活躍模式分數
    const userPatternScore = this.calculateUserPatternScore(lead, time);
    
    // 3. 全局優先時段分數
    const globalPeriodScore = this.calculateGlobalPeriodScore(time);
    
    // 4. 歷史回覆率分數
    const responseHistoryScore = this.calculateResponseHistoryScore(lead, time);
    
    // 5. 漏斗階段分數
    const funnelStageScore = this.calculateFunnelStageScore(lead);
    
    // 加權計算總分
    const totalScore = 
      userOnlineScore * weights.userOnline +
      userPatternScore * weights.userPattern +
      globalPeriodScore * weights.globalPeriod +
      responseHistoryScore * weights.responseHistory +
      funnelStageScore * weights.funnelStage;
    
    // 計算信心度
    const confidence = this.calculateConfidence(lead);
    
    return {
      score: Math.round(totalScore),
      confidence,
      factors: {
        userOnline: userOnlineScore,
        userPattern: userPatternScore,
        globalPeriod: globalPeriodScore,
        responseHistory: responseHistoryScore,
        funnelStage: funnelStageScore
      }
    };
  }
  
  /**
   * 計算用戶在線狀態分數
   */
  private calculateUserOnlineScore(lead: Lead, time: Date): number {
    const status = this.onlineMonitor.getOnlineStatus(lead.peerId);
    
    if (!status) return 50;
    
    const now = Date.now();
    const checkAge = now - status.checkedAt.getTime();
    
    // 檢查狀態是否過期（超過5分鐘）
    if (checkAge > 300000) {
      return 50; // 狀態過期，返回中等分數
    }
    
    switch (status.status) {
      case 'online':
        return 100;
      case 'recently':
        return 75;
      case 'offline':
        // 根據最後上線時間調整
        if (status.lastSeen) {
          const offlineHours = (now - status.lastSeen.getTime()) / 3600000;
          if (offlineHours < 1) return 60;
          if (offlineHours < 6) return 40;
          if (offlineHours < 24) return 25;
        }
        return 15;
      default:
        return 50;
    }
  }
  
  /**
   * 計算用戶活躍模式分數
   */
  private calculateUserPatternScore(lead: Lead, time: Date): number {
    const pattern = this.onlineMonitor.getActivityPattern(lead.peerId);
    
    if (!pattern || pattern.preferredHours.length === 0) {
      return 50; // 無數據，返回中等分數
    }
    
    const hour = time.getHours();
    const day = time.getDay();
    
    let score = 30; // 基礎分
    
    // 檢查是否在偏好時段
    if (pattern.preferredHours.includes(hour)) {
      score += 40;
    }
    
    // 檢查是否在偏好星期
    if (pattern.preferredDays.includes(day)) {
      score += 20;
    }
    
    // 檢查具體時段頻率
    const periodMatch = pattern.activityPeriods.find(
      p => p.hour === hour && p.dayOfWeek === day
    );
    if (periodMatch) {
      // 根據頻率調整
      score += Math.min(10, periodMatch.frequency * 2);
    }
    
    return Math.min(100, score);
  }
  
  /**
   * 計算全局優先時段分數
   */
  private calculateGlobalPeriodScore(time: Date): number {
    const hour = time.getHours();
    const day = time.getDay();
    const isWeekend = day === 0 || day === 6;
    
    // 獲取當天的活躍時段
    const activeHours = isWeekend 
      ? TIMING_CONFIG.globalActiveHours.weekend
      : TIMING_CONFIG.globalActiveHours.weekday;
    
    // 不在活躍時段
    if (hour < activeHours.start || hour >= activeHours.end) {
      return 10;
    }
    
    // 檢查是否在優先時段
    for (const period of TIMING_CONFIG.priorityPeriods) {
      if (hour >= period.start && hour < period.end) {
        return Math.round(80 * period.weight);
      }
    }
    
    // 在活躍時段但不在優先時段
    return 60;
  }
  
  /**
   * 計算歷史回覆率分數
   */
  private calculateResponseHistoryScore(lead: Lead, time: Date): number {
    const hour = time.getHours();
    
    // 使用全局時段回覆率
    const hourlyRate = this._hourlyResponseRates()[hour];
    
    // 結合用戶個人回覆率
    const userRate = lead.stats.responseRate;
    
    // 加權平均
    const combinedRate = hourlyRate * 0.4 + userRate * 0.6;
    
    return Math.round(combinedRate * 100);
  }
  
  /**
   * 計算漏斗階段分數
   */
  private calculateFunnelStageScore(lead: Lead): number {
    const urgency = TIMING_CONFIG.stageUrgency[lead.stage];
    return Math.round(urgency * 100);
  }
  
  /**
   * 計算信心度
   */
  private calculateConfidence(lead: Lead): number {
    let confidence = 0.5;
    
    // 有活躍模式數據
    const pattern = this.onlineMonitor.getActivityPattern(lead.peerId);
    if (pattern && pattern.activityPeriods.length > 5) {
      confidence += 0.2;
    }
    
    // 有足夠的互動歷史
    if (lead.stats.totalConversations >= 3) {
      confidence += 0.15;
    }
    
    // 有回覆記錄
    if (lead.stats.messagesReceived > 0) {
      confidence += 0.15;
    }
    
    return Math.min(1, confidence);
  }
  
  // ============ 時機推薦 ============
  
  /**
   * 獲取最佳聯繫時機推薦
   */
  getRecommendation(lead: Lead, type: ConversationType = 'nurture'): TimingRecommendation {
    const now = new Date();
    
    // 檢查最小聯繫間隔
    const minInterval = TIMING_CONFIG.minContactInterval[lead.stage];
    const lastContact = lead.lastFollowUpAt || lead.lastInteractionAt;
    
    if (lastContact) {
      const hoursSinceContact = (now.getTime() - new Date(lastContact).getTime()) / 3600000;
      if (hoursSinceContact < minInterval) {
        // 還沒到聯繫間隔，推薦稍後
        const recommendedTime = new Date(new Date(lastContact).getTime() + minInterval * 3600000);
        return {
          leadId: lead.id,
          recommendedTime,
          score: this.calculateScoreForTime(lead, recommendedTime),
          type,
          reason: `距離上次聯繫不足 ${minInterval} 小時，建議稍後跟進`,
          alternatives: []
        };
      }
    }
    
    // 如果當前適合聯繫
    const currentScore = this.calculateCurrentScore(lead);
    if (currentScore.score >= 70) {
      return {
        leadId: lead.id,
        recommendedTime: now,
        score: currentScore,
        type,
        reason: this.generateReason(currentScore),
        alternatives: this.getAlternativeTimings(lead, now)
      };
    }
    
    // 搜索未來24小時內的最佳時機
    const bestTiming = this.findBestTimingInRange(lead, now, 24);
    
    return {
      leadId: lead.id,
      recommendedTime: bestTiming.time,
      score: bestTiming.score,
      type,
      reason: this.generateReason(bestTiming.score),
      alternatives: this.getAlternativeTimings(lead, bestTiming.time)
    };
  }
  
  /**
   * 在時間範圍內搜索最佳時機
   */
  private findBestTimingInRange(
    lead: Lead, 
    startTime: Date, 
    hoursAhead: number
  ): { time: Date; score: TimingScore } {
    let bestTime = startTime;
    let bestScore = this.calculateScoreForTime(lead, startTime);
    
    // 每30分鐘採樣一次
    const sampleInterval = 30 * 60 * 1000; // 30分鐘
    const endTime = new Date(startTime.getTime() + hoursAhead * 3600000);
    
    let currentTime = new Date(startTime.getTime() + sampleInterval);
    
    while (currentTime <= endTime) {
      const score = this.calculateScoreForTime(lead, currentTime);
      
      if (score.score > bestScore.score) {
        bestScore = score;
        bestTime = new Date(currentTime);
      }
      
      currentTime = new Date(currentTime.getTime() + sampleInterval);
    }
    
    return { time: bestTime, score: bestScore };
  }
  
  /**
   * 獲取替代時機
   */
  private getAlternativeTimings(lead: Lead, primaryTime: Date): TimingRecommendation['alternatives'] {
    const alternatives: TimingRecommendation['alternatives'] = [];
    
    // 提前2小時
    const earlier = new Date(primaryTime.getTime() - 2 * 3600000);
    if (earlier > new Date()) {
      const earlierScore = this.calculateScoreForTime(lead, earlier);
      alternatives.push({
        time: earlier,
        score: earlierScore.score,
        reason: '提前2小時'
      });
    }
    
    // 延後2小時
    const later = new Date(primaryTime.getTime() + 2 * 3600000);
    const laterScore = this.calculateScoreForTime(lead, later);
    alternatives.push({
      time: later,
      score: laterScore.score,
      reason: '延後2小時'
    });
    
    // 明天同一時間
    const tomorrow = new Date(primaryTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowScore = this.calculateScoreForTime(lead, tomorrow);
    alternatives.push({
      time: tomorrow,
      score: tomorrowScore.score,
      reason: '明天同一時間'
    });
    
    return alternatives.sort((a, b) => b.score - a.score);
  }
  
  /**
   * 生成推薦原因
   */
  private generateReason(score: TimingScore): string {
    const reasons: string[] = [];
    
    if (score.factors.userOnline >= 90) {
      reasons.push('用戶當前在線');
    } else if (score.factors.userOnline >= 70) {
      reasons.push('用戶最近活躍');
    }
    
    if (score.factors.userPattern >= 80) {
      reasons.push('符合用戶常用時段');
    }
    
    if (score.factors.globalPeriod >= 80) {
      reasons.push('黃金聯繫時段');
    }
    
    if (score.factors.responseHistory >= 70) {
      reasons.push('該時段回覆率較高');
    }
    
    if (score.factors.funnelStage >= 80) {
      reasons.push('高優先級客戶');
    }
    
    if (reasons.length === 0) {
      reasons.push('適合聯繫');
    }
    
    return reasons.join('，');
  }
  
  // ============ 批量計劃 ============
  
  /**
   * 生成批量時機計劃
   */
  generateBatchPlan(
    leads: Lead[],
    type: ConversationType = 'nurture',
    maxPerHour: number = 10
  ): BatchTimingPlan {
    const recommendations: TimingRecommendation[] = [];
    const skippedReasons: { leadId: string; reason: string }[] = [];
    
    // 時間槽佔用計數
    const hourSlots = new Map<string, number>();
    
    for (const lead of leads) {
      // 檢查是否可以聯繫
      if (lead.doNotContact) {
        skippedReasons.push({ leadId: lead.id, reason: '已標記為不聯繫' });
        continue;
      }
      
      if (!lead.isNurturing) {
        skippedReasons.push({ leadId: lead.id, reason: '未開啟培育' });
        continue;
      }
      
      // 獲取推薦
      const recommendation = this.getRecommendation(lead, type);
      
      // 檢查時間槽是否已滿
      const slotKey = this.getHourSlotKey(recommendation.recommendedTime);
      const slotCount = hourSlots.get(slotKey) || 0;
      
      if (slotCount >= maxPerHour) {
        // 嘗試替代時間
        let found = false;
        for (const alt of recommendation.alternatives) {
          const altSlotKey = this.getHourSlotKey(alt.time);
          const altSlotCount = hourSlots.get(altSlotKey) || 0;
          if (altSlotCount < maxPerHour) {
            recommendation.recommendedTime = alt.time;
            recommendation.score = this.calculateScoreForTime(lead, alt.time);
            recommendation.reason = alt.reason;
            hourSlots.set(altSlotKey, altSlotCount + 1);
            found = true;
            break;
          }
        }
        
        if (!found) {
          skippedReasons.push({ leadId: lead.id, reason: '所有時間槽已滿' });
          continue;
        }
      } else {
        hourSlots.set(slotKey, slotCount + 1);
      }
      
      recommendations.push(recommendation);
    }
    
    // 按時間排序
    recommendations.sort((a, b) => 
      a.recommendedTime.getTime() - b.recommendedTime.getTime()
    );
    
    return {
      recommendations,
      totalLeads: leads.length,
      scheduledCount: recommendations.length,
      skippedCount: skippedReasons.length,
      skippedReasons
    };
  }
  
  /**
   * 獲取時間槽鍵
   */
  private getHourSlotKey(time: Date): string {
    return `${time.toDateString()}-${time.getHours()}`;
  }
  
  // ============ 時間窗口 ============
  
  /**
   * 獲取今日可用時間窗口
   */
  getTodayTimeWindows(lead: Lead): TimeWindow[] {
    const windows: TimeWindow[] = [];
    const now = new Date();
    const today = new Date(now);
    
    // 獲取活躍時段配置
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const activeHours = isWeekend 
      ? TIMING_CONFIG.globalActiveHours.weekend
      : TIMING_CONFIG.globalActiveHours.weekday;
    
    // 優先時段
    for (const period of TIMING_CONFIG.priorityPeriods) {
      const start = new Date(today);
      start.setHours(period.start, 0, 0, 0);
      
      const end = new Date(today);
      end.setHours(period.end, 0, 0, 0);
      
      // 跳過已過去的時段
      if (end <= now) continue;
      
      // 調整開始時間
      const actualStart = start < now ? now : start;
      
      const midPoint = new Date((actualStart.getTime() + end.getTime()) / 2);
      const score = this.calculateScoreForTime(lead, midPoint);
      
      windows.push({
        start: actualStart,
        end,
        score: score.score,
        reason: period.name
      });
    }
    
    // 添加剩餘活躍時段
    const endOfDay = new Date(today);
    endOfDay.setHours(activeHours.end, 0, 0, 0);
    
    if (endOfDay > now) {
      // 找到下一個空閒時段
      const usedHours = new Set(
        TIMING_CONFIG.priorityPeriods.flatMap(p => 
          Array.from({ length: p.end - p.start }, (_, i) => p.start + i)
        )
      );
      
      for (let hour = Math.max(activeHours.start, now.getHours()); hour < activeHours.end; hour++) {
        if (!usedHours.has(hour)) {
          const start = new Date(today);
          start.setHours(hour, 0, 0, 0);
          
          const end = new Date(today);
          end.setHours(hour + 1, 0, 0, 0);
          
          if (start < now) continue;
          
          const score = this.calculateScoreForTime(lead, start);
          
          windows.push({
            start,
            end,
            score: score.score,
            reason: '一般時段'
          });
        }
      }
    }
    
    return windows.sort((a, b) => b.score - a.score);
  }
  
  // ============ 學習更新 ============
  
  /**
   * 記錄聯繫結果（用於學習）
   */
  recordContactResult(leadId: string, contactTime: Date, responded: boolean): void {
    const hour = contactTime.getHours();
    const dayOfWeek = contactTime.getDay();
    
    // 添加到歷史記錄
    this._successfulContacts.update(contacts => [
      ...contacts.slice(-1000), // 保留最近1000條
      { hour, dayOfWeek, responded }
    ]);
    
    // 更新時段回覆率
    this.updateHourlyResponseRates();
    
    this.saveData();
  }
  
  /**
   * 更新時段回覆率
   */
  private updateHourlyResponseRates(): void {
    const contacts = this._successfulContacts();
    const hourlyStats = new Array(24).fill(null).map(() => ({ total: 0, responded: 0 }));
    
    for (const contact of contacts) {
      hourlyStats[contact.hour].total++;
      if (contact.responded) {
        hourlyStats[contact.hour].responded++;
      }
    }
    
    const rates = hourlyStats.map(stat => 
      stat.total > 0 ? stat.responded / stat.total : 0.5
    );
    
    this._hourlyResponseRates.set(rates);
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      localStorage.setItem('tgai-successful-contacts', 
        JSON.stringify(this._successfulContacts().slice(-500))
      );
      localStorage.setItem('tgai-hourly-rates',
        JSON.stringify(this._hourlyResponseRates())
      );
    } catch (e) {
      console.error('[OptimalTiming] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const contactsData = localStorage.getItem('tgai-successful-contacts');
      if (contactsData) {
        this._successfulContacts.set(JSON.parse(contactsData));
        this.updateHourlyResponseRates();
      }
      
      const ratesData = localStorage.getItem('tgai-hourly-rates');
      if (ratesData) {
        this._hourlyResponseRates.set(JSON.parse(ratesData));
      }
    } catch (e) {
      console.error('[OptimalTiming] Load error:', e);
    }
  }
}
