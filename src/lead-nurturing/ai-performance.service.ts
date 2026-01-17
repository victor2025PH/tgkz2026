/**
 * TG-AI智控王 AI效果評估服務
 * AI Performance Service v1.0
 * 
 * 功能：
 * - AI回覆效果追蹤
 * - 響應率分析
 * - 情感變化分析
 * - 轉化貢獻分析
 * - AI vs 人工對比
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { AIProviderService } from './ai-provider.service';
import { SentimentAnalyzerService } from './sentiment-analyzer.service';
import { AnalyticsDataService, TimeRange } from './analytics-data.service';
import { Lead, LeadMessage, ConversationType } from './lead.models';

// ============ 類型定義 ============

/** AI消息效果 */
export interface AIMessageEffect {
  messageId: string;
  leadId: string;
  content: string;
  sentAt: Date;
  type: ConversationType;
  // 效果指標
  gotResponse: boolean;
  responseTime?: number;
  responseSentiment?: number;
  ledToConversion: boolean;
  // 評分
  effectivenessScore: number;
}

/** AI效果摘要 */
export interface AIEffectSummary {
  totalAIMessages: number;
  responseRate: number;
  avgResponseTime: number;
  positiveResponseRate: number;
  conversionContribution: number;
  avgEffectivenessScore: number;
}

/** AI vs 人工對比 */
export interface AIVsManualComparison {
  metric: string;
  aiValue: number;
  manualValue: number;
  difference: number;
  winner: 'ai' | 'manual' | 'tie';
}

/** 話題效果 */
export interface TopicEffectiveness {
  topic: string;
  usageCount: number;
  responseRate: number;
  avgSentiment: number;
  conversionRate: number;
  score: number;
}

/** 時段效果 */
export interface TimeSlotEffectiveness {
  hour: number;
  messageCount: number;
  responseRate: number;
  avgResponseTime: number;
  score: number;
}

/** AI效果報告 */
export interface AIPerformanceReport {
  period: string;
  summary: AIEffectSummary;
  comparison: AIVsManualComparison[];
  topTopics: TopicEffectiveness[];
  bestTimeSlots: TimeSlotEffectiveness[];
  recommendations: string[];
  generatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AIPerformanceService {
  private leadService = inject(LeadService);
  private aiProvider = inject(AIProviderService);
  private sentimentAnalyzer = inject(SentimentAnalyzerService);
  private analyticsData = inject(AnalyticsDataService);
  
  // ============ 狀態 ============
  
  // 效果記錄
  private _messageEffects = signal<Map<string, AIMessageEffect>>(new Map());
  messageEffects = computed(() => this._messageEffects());
  
  // AI效果摘要
  summary = computed(() => this.calculateSummary());
  
  // AI vs 人工對比
  comparison = computed(() => this.calculateComparison());
  
  constructor() {
    this.loadData();
  }
  
  // ============ 效果追蹤 ============
  
  /**
   * 記錄AI消息發送
   */
  trackAIMessage(
    messageId: string,
    leadId: string,
    content: string,
    type: ConversationType
  ): void {
    const effect: AIMessageEffect = {
      messageId,
      leadId,
      content,
      sentAt: new Date(),
      type,
      gotResponse: false,
      ledToConversion: false,
      effectivenessScore: 0
    };
    
    this._messageEffects.update(effects => {
      const newEffects = new Map(effects);
      newEffects.set(messageId, effect);
      return newEffects;
    });
    
    this.saveData();
  }
  
  /**
   * 記錄用戶響應
   */
  trackUserResponse(
    aiMessageId: string,
    responseContent: string,
    responseTime: number
  ): void {
    const effect = this._messageEffects().get(aiMessageId);
    if (!effect) return;
    
    // 分析響應情感
    const sentiment = this.sentimentAnalyzer.quickSentiment(responseContent);
    const sentimentScore = sentiment === 'positive' ? 1 : sentiment === 'negative' ? -1 : 0;
    
    this._messageEffects.update(effects => {
      const newEffects = new Map(effects);
      newEffects.set(aiMessageId, {
        ...effect,
        gotResponse: true,
        responseTime,
        responseSentiment: sentimentScore,
        effectivenessScore: this.calculateEffectivenessScore(effect, true, responseTime, sentimentScore)
      });
      return newEffects;
    });
    
    this.saveData();
  }
  
  /**
   * 記錄轉化
   */
  trackConversion(leadId: string): void {
    this._messageEffects.update(effects => {
      const newEffects = new Map(effects);
      
      effects.forEach((effect, id) => {
        if (effect.leadId === leadId) {
          newEffects.set(id, {
            ...effect,
            ledToConversion: true,
            effectivenessScore: Math.min(100, effect.effectivenessScore + 20)
          });
        }
      });
      
      return newEffects;
    });
    
    this.saveData();
  }
  
  /**
   * 計算效果評分
   */
  private calculateEffectivenessScore(
    effect: AIMessageEffect,
    gotResponse: boolean,
    responseTime?: number,
    sentiment?: number
  ): number {
    let score = 0;
    
    // 有回覆 +40分
    if (gotResponse) score += 40;
    
    // 回覆速度 (5分鐘內 +20, 30分鐘內 +10)
    if (responseTime !== undefined) {
      const minutes = responseTime / (1000 * 60);
      if (minutes < 5) score += 20;
      else if (minutes < 30) score += 10;
      else if (minutes < 60) score += 5;
    }
    
    // 情感 (正面 +30, 中性 +10)
    if (sentiment !== undefined) {
      if (sentiment > 0) score += 30;
      else if (sentiment === 0) score += 10;
    }
    
    // 導致轉化 +20
    if (effect.ledToConversion) score += 20;
    
    return Math.min(100, score);
  }
  
  // ============ 效果分析 ============
  
  /**
   * 計算AI效果摘要
   */
  private calculateSummary(): AIEffectSummary {
    const effects = Array.from(this._messageEffects().values());
    
    if (effects.length === 0) {
      return {
        totalAIMessages: 0,
        responseRate: 0,
        avgResponseTime: 0,
        positiveResponseRate: 0,
        conversionContribution: 0,
        avgEffectivenessScore: 0
      };
    }
    
    const withResponse = effects.filter(e => e.gotResponse);
    const positiveResponses = effects.filter(e => e.responseSentiment && e.responseSentiment > 0);
    const conversions = effects.filter(e => e.ledToConversion);
    
    const totalResponseTime = withResponse.reduce((sum, e) => sum + (e.responseTime || 0), 0);
    const avgEffectiveness = effects.reduce((sum, e) => sum + e.effectivenessScore, 0) / effects.length;
    
    return {
      totalAIMessages: effects.length,
      responseRate: Math.round((withResponse.length / effects.length) * 100),
      avgResponseTime: withResponse.length > 0 ? totalResponseTime / withResponse.length : 0,
      positiveResponseRate: withResponse.length > 0 
        ? Math.round((positiveResponses.length / withResponse.length) * 100) 
        : 0,
      conversionContribution: Math.round((conversions.length / effects.length) * 100),
      avgEffectivenessScore: Math.round(avgEffectiveness)
    };
  }
  
  /**
   * 計算AI vs 人工對比
   */
  private calculateComparison(): AIVsManualComparison[] {
    const conversations = this.leadService.conversations();
    
    let aiMessages = 0;
    let aiResponses = 0;
    let manualMessages = 0;
    let manualResponses = 0;
    
    conversations.forEach(convs => {
      convs.forEach(conv => {
        for (let i = 0; i < conv.messages.length; i++) {
          const msg = conv.messages[i];
          if (msg.role === 'assistant') {
            const gotResponse = i < conv.messages.length - 1 && conv.messages[i + 1].role === 'user';
            
            if (msg.isAIGenerated) {
              aiMessages++;
              if (gotResponse) aiResponses++;
            } else {
              manualMessages++;
              if (gotResponse) manualResponses++;
            }
          }
        }
      });
    });
    
    const aiResponseRate = aiMessages > 0 ? Math.round((aiResponses / aiMessages) * 100) : 0;
    const manualResponseRate = manualMessages > 0 ? Math.round((manualResponses / manualMessages) * 100) : 0;
    
    const comparisons: AIVsManualComparison[] = [
      {
        metric: '消息數量',
        aiValue: aiMessages,
        manualValue: manualMessages,
        difference: aiMessages - manualMessages,
        winner: aiMessages > manualMessages ? 'ai' : aiMessages < manualMessages ? 'manual' : 'tie'
      },
      {
        metric: '響應率 (%)',
        aiValue: aiResponseRate,
        manualValue: manualResponseRate,
        difference: aiResponseRate - manualResponseRate,
        winner: aiResponseRate > manualResponseRate ? 'ai' : aiResponseRate < manualResponseRate ? 'manual' : 'tie'
      },
      {
        metric: 'Token費用 ($)',
        aiValue: Math.round(this.aiProvider.usageStats().totalCost * 100) / 100,
        manualValue: 0,
        difference: this.aiProvider.usageStats().totalCost,
        winner: 'manual' // 人工無費用
      }
    ];
    
    return comparisons;
  }
  
  // ============ 話題效果分析 ============
  
  /**
   * 分析話題效果
   */
  analyzeTopicEffectiveness(): TopicEffectiveness[] {
    const effects = Array.from(this._messageEffects().values());
    const topicMap = new Map<string, AIMessageEffect[]>();
    
    // 按話題分組（簡化：使用消息類型作為話題）
    effects.forEach(effect => {
      const topic = effect.type;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(effect);
    });
    
    const result: TopicEffectiveness[] = [];
    
    topicMap.forEach((topicEffects, topic) => {
      const withResponse = topicEffects.filter(e => e.gotResponse);
      const positiveResponses = topicEffects.filter(e => e.responseSentiment && e.responseSentiment > 0);
      const conversions = topicEffects.filter(e => e.ledToConversion);
      
      const responseRate = topicEffects.length > 0 
        ? Math.round((withResponse.length / topicEffects.length) * 100) 
        : 0;
      
      const avgSentiment = withResponse.length > 0
        ? withResponse.reduce((sum, e) => sum + (e.responseSentiment || 0), 0) / withResponse.length
        : 0;
      
      const conversionRate = topicEffects.length > 0
        ? Math.round((conversions.length / topicEffects.length) * 100)
        : 0;
      
      // 綜合評分
      const score = Math.round(responseRate * 0.4 + (avgSentiment + 1) * 30 + conversionRate * 0.3);
      
      result.push({
        topic: this.getTopicName(topic),
        usageCount: topicEffects.length,
        responseRate,
        avgSentiment,
        conversionRate,
        score
      });
    });
    
    return result.sort((a, b) => b.score - a.score);
  }
  
  /**
   * 獲取話題名稱
   */
  private getTopicName(type: string): string {
    const names: Record<string, string> = {
      business: '業務跟進',
      casual: '日常聊天',
      greeting: '問候寒暄',
      nurture: '持續培育',
      support: '客戶支持',
      manual: '人工回覆'
    };
    return names[type] || type;
  }
  
  // ============ 時段效果分析 ============
  
  /**
   * 分析時段效果
   */
  analyzeTimeSlotEffectiveness(): TimeSlotEffectiveness[] {
    const effects = Array.from(this._messageEffects().values());
    const hourMap = new Map<number, AIMessageEffect[]>();
    
    // 按小時分組
    effects.forEach(effect => {
      const hour = new Date(effect.sentAt).getHours();
      if (!hourMap.has(hour)) {
        hourMap.set(hour, []);
      }
      hourMap.get(hour)!.push(effect);
    });
    
    const result: TimeSlotEffectiveness[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourEffects = hourMap.get(hour) || [];
      
      if (hourEffects.length === 0) {
        result.push({
          hour,
          messageCount: 0,
          responseRate: 0,
          avgResponseTime: 0,
          score: 0
        });
        continue;
      }
      
      const withResponse = hourEffects.filter(e => e.gotResponse);
      const responseRate = Math.round((withResponse.length / hourEffects.length) * 100);
      
      const totalResponseTime = withResponse.reduce((sum, e) => sum + (e.responseTime || 0), 0);
      const avgResponseTime = withResponse.length > 0 ? totalResponseTime / withResponse.length : 0;
      
      // 評分：響應率高 + 響應時間短 = 好時段
      const responseTimeScore = avgResponseTime > 0 
        ? Math.max(0, 50 - (avgResponseTime / (1000 * 60 * 2))) // 2分鐘以內得50分
        : 0;
      const score = Math.round(responseRate * 0.5 + responseTimeScore);
      
      result.push({
        hour,
        messageCount: hourEffects.length,
        responseRate,
        avgResponseTime,
        score
      });
    }
    
    return result;
  }
  
  /**
   * 獲取最佳發送時段
   */
  getBestTimeSlots(count: number = 5): TimeSlotEffectiveness[] {
    return this.analyzeTimeSlotEffectiveness()
      .filter(t => t.messageCount > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
  
  // ============ 效果報告 ============
  
  /**
   * 生成AI效果報告
   */
  generateReport(timeRange: TimeRange = 'month'): AIPerformanceReport {
    const summary = this.summary();
    const comparison = this.comparison();
    const topTopics = this.analyzeTopicEffectiveness().slice(0, 5);
    const bestTimeSlots = this.getBestTimeSlots(5);
    
    // 生成建議
    const recommendations = this.generateRecommendations(summary, comparison, topTopics, bestTimeSlots);
    
    return {
      period: this.getPeriodName(timeRange),
      summary,
      comparison,
      topTopics,
      bestTimeSlots,
      recommendations,
      generatedAt: new Date()
    };
  }
  
  /**
   * 生成優化建議
   */
  private generateRecommendations(
    summary: AIEffectSummary,
    comparison: AIVsManualComparison[],
    topTopics: TopicEffectiveness[],
    bestTimeSlots: TimeSlotEffectiveness[]
  ): string[] {
    const recommendations: string[] = [];
    
    // 響應率建議
    if (summary.responseRate < 30) {
      recommendations.push('AI響應率較低，建議優化開場白和話題選擇');
    } else if (summary.responseRate > 50) {
      recommendations.push('AI響應率表現良好，可以增加AI自動化比例');
    }
    
    // 情感建議
    if (summary.positiveResponseRate < 40) {
      recommendations.push('正面響應率需提升，建議調整對話語調和內容策略');
    }
    
    // 時段建議
    if (bestTimeSlots.length > 0) {
      const bestHours = bestTimeSlots.slice(0, 3).map(t => `${t.hour}:00`).join('、');
      recommendations.push(`建議優先在 ${bestHours} 時段發送消息`);
    }
    
    // 話題建議
    if (topTopics.length > 0 && topTopics[0].score > 60) {
      recommendations.push(`"${topTopics[0].topic}" 話題效果最佳，建議多使用`);
    }
    
    // AI vs 人工建議
    const responseComparison = comparison.find(c => c.metric === '響應率 (%)');
    if (responseComparison && responseComparison.winner === 'ai') {
      recommendations.push('AI響應率優於人工，可以信任AI處理更多對話');
    } else if (responseComparison && responseComparison.winner === 'manual') {
      recommendations.push('人工響應率較高，建議AI學習人工對話模式');
    }
    
    // 成本建議
    if (summary.totalAIMessages > 100 && summary.avgEffectivenessScore < 40) {
      recommendations.push('AI效果評分較低，建議審視AI策略以優化成本效益');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('AI表現穩定，繼續保持當前策略');
    }
    
    return recommendations;
  }
  
  /**
   * 獲取時段名稱
   */
  private getPeriodName(range: TimeRange): string {
    const names: Record<TimeRange, string> = {
      today: '今日',
      yesterday: '昨日',
      week: '本週',
      month: '本月',
      quarter: '本季',
      year: '本年',
      all: '全部'
    };
    return names[range];
  }
  
  // ============ 統計數據 ============
  
  /**
   * 獲取AI使用統計
   */
  getAIUsageStats(): {
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    avgTokensPerRequest: number;
    costPerConversion: number;
  } {
    const aiStats = this.aiProvider.usageStats();
    const effects = Array.from(this._messageEffects().values());
    const conversions = effects.filter(e => e.ledToConversion).length;
    
    return {
      totalRequests: aiStats.totalRequests,
      totalTokens: aiStats.totalTokens,
      totalCost: aiStats.totalCost,
      avgTokensPerRequest: aiStats.totalRequests > 0 
        ? Math.round(aiStats.totalTokens / aiStats.totalRequests) 
        : 0,
      costPerConversion: conversions > 0 
        ? Math.round((aiStats.totalCost / conversions) * 100) / 100 
        : 0
    };
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      const effects = Array.from(this._messageEffects().entries()).map(([k, v]) => [
        k,
        { ...v, sentAt: v.sentAt.toISOString() }
      ]);
      localStorage.setItem('tgai-ai-message-effects', JSON.stringify(effects));
    } catch (e) {
      console.error('[AIPerformance] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const data = localStorage.getItem('tgai-ai-message-effects');
      if (data) {
        const entries = JSON.parse(data).map(([k, v]: [string, any]) => [
          k,
          { ...v, sentAt: new Date(v.sentAt) }
        ]);
        this._messageEffects.set(new Map(entries));
      }
    } catch (e) {
      console.error('[AIPerformance] Load error:', e);
    }
  }
}
