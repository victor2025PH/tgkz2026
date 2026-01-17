/**
 * TG-AI智控王 對話策略引擎
 * Conversation Strategy Engine v1.0
 * 
 * 功能：
 * - 智能選擇對話策略
 * - 話題推薦和輪換
 * - 對話節奏控制
 * - 成交引導策略
 * - 多輪對話狀態管理
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { Lead, FunnelStage, ConversationType, LeadConversation } from './lead.models';

// ============ 配置 ============

const STRATEGY_CONFIG = {
  // 階段策略配置
  stageStrategies: {
    stranger: {
      primaryGoal: '建立初步聯繫',
      conversationRatio: { business: 0.3, casual: 0.7 },
      maxBusinessAttempts: 2,
      recommendedTopics: ['自我介紹', '共同話題', '輕鬆聊天'],
      avoidTopics: ['直接推銷', '價格', '成交'],
      toneStyle: 'friendly'
    },
    visitor: {
      primaryGoal: '加深了解和信任',
      conversationRatio: { business: 0.4, casual: 0.6 },
      maxBusinessAttempts: 3,
      recommendedTopics: ['興趣愛好', '行業動態', '輕度需求探索'],
      avoidTopics: ['過度推銷'],
      toneStyle: 'friendly'
    },
    lead: {
      primaryGoal: '深入了解需求',
      conversationRatio: { business: 0.5, casual: 0.5 },
      maxBusinessAttempts: 5,
      recommendedTopics: ['需求分析', '解決方案', '案例分享', '價值展示'],
      avoidTopics: ['強迫成交'],
      toneStyle: 'professional'
    },
    qualified: {
      primaryGoal: '促成交易',
      conversationRatio: { business: 0.7, casual: 0.3 },
      maxBusinessAttempts: 10,
      recommendedTopics: ['報價', '優惠', '成交流程', '疑慮解答'],
      avoidTopics: [],
      toneStyle: 'professional'
    },
    customer: {
      primaryGoal: '維護關係',
      conversationRatio: { business: 0.3, casual: 0.7 },
      maxBusinessAttempts: 2,
      recommendedTopics: ['使用反饋', '增值服務', '節日問候'],
      avoidTopics: ['過度推銷'],
      toneStyle: 'caring'
    },
    advocate: {
      primaryGoal: '深化關係',
      conversationRatio: { business: 0.2, casual: 0.8 },
      maxBusinessAttempts: 1,
      recommendedTopics: ['專屬福利', '內部消息', '感謝回饋'],
      avoidTopics: ['推銷'],
      toneStyle: 'intimate'
    },
    dormant: {
      primaryGoal: '重新激活',
      conversationRatio: { business: 0.4, casual: 0.6 },
      maxBusinessAttempts: 3,
      recommendedTopics: ['問候', '新動態', '特別優惠'],
      avoidTopics: ['責備', '過度推銷'],
      toneStyle: 'warm'
    }
  } as Record<FunnelStage, StageStrategy>,
  
  // 對話輪次配置
  conversationRounds: {
    maxWithoutResponse: 3,
    switchToCareroundAfter: 2,
    escalateToHumanAfter: 10
  },
  
  // 話題輪換配置
  topicRotation: {
    minTopicsBeforeRepeat: 3,
    casualTopicMaxUses: 2
  }
};

// ============ 類型定義 ============

/** 階段策略 */
interface StageStrategy {
  primaryGoal: string;
  conversationRatio: { business: number; casual: number };
  maxBusinessAttempts: number;
  recommendedTopics: string[];
  avoidTopics: string[];
  toneStyle: 'friendly' | 'professional' | 'caring' | 'intimate' | 'warm';
}

/** 對話策略 */
export interface ConversationStrategy {
  type: ConversationType;
  goal: string;
  topics: string[];
  tone: string;
  openingStyle: 'greeting' | 'question' | 'sharing' | 'direct';
  closingStyle: 'open' | 'cta' | 'question' | 'soft';
  suggestedLength: 'short' | 'medium' | 'long';
  useEmoji: boolean;
  urgencyLevel: 'low' | 'medium' | 'high';
  shouldEscalate: boolean;
  escalationReason?: string;
}

/** 話題推薦 */
export interface TopicRecommendation {
  topic: string;
  category: 'business' | 'casual' | 'interest' | 'seasonal';
  priority: number;
  reason: string;
  lastUsed?: Date;
  useCount: number;
}

/** 對話狀態 */
export interface ConversationState {
  leadId: string;
  currentPhase: 'opening' | 'building' | 'exploring' | 'presenting' | 'closing' | 'following';
  roundsWithoutResponse: number;
  totalRounds: number;
  businessAttempts: number;
  topicsUsed: string[];
  lastTopic?: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  purchaseSignalsDetected: number;
  objectionCount: number;
  needsHumanIntervention: boolean;
  updatedAt: Date;
}

/** 成交引導建議 */
export interface ClosingGuidance {
  shouldAttemptClose: boolean;
  technique: string;
  suggestedMessage: string;
  confidence: number;
  fallbackStrategy: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConversationStrategyService {
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 對話狀態緩存
  private _conversationStates = signal<Map<string, ConversationState>>(new Map());
  conversationStates = computed(() => this._conversationStates());
  
  // 話題使用歷史
  private _topicHistory = signal<Map<string, { topic: string; usedAt: Date }[]>>(new Map());
  
  constructor() {
    this.loadData();
  }
  
  // ============ 策略選擇 ============
  
  /**
   * 獲取當前推薦的對話策略
   */
  getStrategy(lead: Lead): ConversationStrategy {
    const stageStrategy = STRATEGY_CONFIG.stageStrategies[lead.stage];
    const state = this.getConversationState(lead.id);
    
    // 決定對話類型
    const type = this.selectConversationType(lead, stageStrategy, state);
    
    // 選擇話題
    const topics = this.selectTopics(lead, stageStrategy, type, state);
    
    // 確定開場和結束風格
    const openingStyle = this.selectOpeningStyle(lead, state);
    const closingStyle = this.selectClosingStyle(lead, state, type);
    
    // 確定消息長度
    const suggestedLength = this.selectMessageLength(lead, state);
    
    // 檢查是否需要升級
    const shouldEscalate = this.checkShouldEscalate(lead, state);
    
    return {
      type,
      goal: stageStrategy.primaryGoal,
      topics,
      tone: stageStrategy.toneStyle,
      openingStyle,
      closingStyle,
      suggestedLength,
      useEmoji: stageStrategy.toneStyle !== 'professional',
      urgencyLevel: this.calculateUrgency(lead),
      shouldEscalate,
      escalationReason: shouldEscalate ? this.getEscalationReason(lead, state) : undefined
    };
  }
  
  /**
   * 選擇對話類型
   */
  private selectConversationType(
    lead: Lead,
    stageStrategy: StageStrategy,
    state: ConversationState
  ): ConversationType {
    // 如果連續多輪無回覆，切換到情感維護
    if (state.roundsWithoutResponse >= STRATEGY_CONFIG.conversationRounds.switchToCareroundAfter) {
      return 'casual';
    }
    
    // 如果業務嘗試次數過多，降低業務比例
    const effectiveBusinessRatio = state.businessAttempts >= stageStrategy.maxBusinessAttempts
      ? stageStrategy.conversationRatio.business * 0.5
      : stageStrategy.conversationRatio.business;
    
    // 基於比例隨機選擇
    const roll = Math.random();
    if (roll < effectiveBusinessRatio) {
      return 'business';
    }
    
    return 'casual';
  }
  
  /**
   * 選擇話題
   */
  private selectTopics(
    lead: Lead,
    stageStrategy: StageStrategy,
    type: ConversationType,
    state: ConversationState
  ): string[] {
    const recommendations = this.getTopicRecommendations(lead, type);
    
    // 過濾掉最近使用過的話題
    const recentTopics = state.topicsUsed.slice(-STRATEGY_CONFIG.topicRotation.minTopicsBeforeRepeat);
    const availableTopics = recommendations.filter(r => !recentTopics.includes(r.topic));
    
    // 如果沒有可用話題，使用推薦話題
    if (availableTopics.length === 0) {
      return stageStrategy.recommendedTopics.slice(0, 3);
    }
    
    // 按優先級排序並返回前3個
    return availableTopics
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(r => r.topic);
  }
  
  /**
   * 選擇開場風格
   */
  private selectOpeningStyle(
    lead: Lead,
    state: ConversationState
  ): ConversationStrategy['openingStyle'] {
    // 首次聯繫
    if (state.totalRounds === 0) {
      return 'greeting';
    }
    
    // 連續無回覆後
    if (state.roundsWithoutResponse > 0) {
      return 'question';
    }
    
    // 高意向客戶
    if (lead.stage === 'qualified') {
      return 'direct';
    }
    
    // 默認分享
    return 'sharing';
  }
  
  /**
   * 選擇結束風格
   */
  private selectClosingStyle(
    lead: Lead,
    state: ConversationState,
    type: ConversationType
  ): ConversationStrategy['closingStyle'] {
    // 業務對話且高意向
    if (type === 'business' && lead.stage === 'qualified') {
      return 'cta';
    }
    
    // 有購買信號
    if (state.purchaseSignalsDetected > 0) {
      return 'cta';
    }
    
    // 情感維護
    if (type === 'casual') {
      return 'open';
    }
    
    // 默認問題結尾
    return 'question';
  }
  
  /**
   * 選擇消息長度
   */
  private selectMessageLength(
    lead: Lead,
    state: ConversationState
  ): ConversationStrategy['suggestedLength'] {
    // 根據用戶回覆習慣
    if (lead.profile.responsePattern.avgMessageLength < 50) {
      return 'short';
    }
    
    if (lead.profile.responsePattern.avgMessageLength > 150) {
      return 'long';
    }
    
    // 無回覆時用短消息
    if (state.roundsWithoutResponse > 0) {
      return 'short';
    }
    
    return 'medium';
  }
  
  /**
   * 計算緊迫度
   */
  private calculateUrgency(lead: Lead): 'low' | 'medium' | 'high' {
    if (lead.stage === 'qualified' && lead.scores.urgency > 70) {
      return 'high';
    }
    
    if (lead.scores.intent > 60) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // ============ 話題推薦 ============
  
  /**
   * 獲取話題推薦列表
   */
  getTopicRecommendations(lead: Lead, type: ConversationType): TopicRecommendation[] {
    const recommendations: TopicRecommendation[] = [];
    const history = this._topicHistory().get(lead.id) || [];
    
    if (type === 'business') {
      // 業務話題
      recommendations.push(...this.getBusinessTopics(lead, history));
    } else {
      // 情感話題
      recommendations.push(...this.getCasualTopics(lead, history));
    }
    
    // 添加季節性話題
    recommendations.push(...this.getSeasonalTopics());
    
    // 添加基於用戶興趣的話題
    recommendations.push(...this.getInterestBasedTopics(lead, history));
    
    return recommendations;
  }
  
  /**
   * 獲取業務話題
   */
  private getBusinessTopics(
    lead: Lead,
    history: { topic: string; usedAt: Date }[]
  ): TopicRecommendation[] {
    const topics: TopicRecommendation[] = [];
    const stageStrategy = STRATEGY_CONFIG.stageStrategies[lead.stage];
    
    for (const topic of stageStrategy.recommendedTopics) {
      const usageInfo = history.filter(h => h.topic === topic);
      
      topics.push({
        topic,
        category: 'business',
        priority: this.calculateTopicPriority(topic, usageInfo, lead),
        reason: `${lead.stage}階段推薦話題`,
        lastUsed: usageInfo[usageInfo.length - 1]?.usedAt,
        useCount: usageInfo.length
      });
    }
    
    return topics;
  }
  
  /**
   * 獲取情感話題
   */
  private getCasualTopics(
    lead: Lead,
    history: { topic: string; usedAt: Date }[]
  ): TopicRecommendation[] {
    const casualTopics = [
      '最近過得怎樣',
      '週末計劃',
      '興趣愛好',
      '生活分享',
      '行業見聞',
      '有趣的事',
      '節日問候'
    ];
    
    return casualTopics.map(topic => {
      const usageInfo = history.filter(h => h.topic === topic);
      
      return {
        topic,
        category: 'casual' as const,
        priority: this.calculateTopicPriority(topic, usageInfo, lead),
        reason: '情感維護話題',
        lastUsed: usageInfo[usageInfo.length - 1]?.usedAt,
        useCount: usageInfo.length
      };
    });
  }
  
  /**
   * 獲取季節性話題
   */
  private getSeasonalTopics(): TopicRecommendation[] {
    const now = new Date();
    const month = now.getMonth() + 1;
    const topics: TopicRecommendation[] = [];
    
    // 根據月份推薦話題
    if (month === 1 || month === 2) {
      topics.push({
        topic: '新年計劃',
        category: 'seasonal',
        priority: 80,
        reason: '新年話題',
        useCount: 0
      });
    }
    
    if (month >= 6 && month <= 8) {
      topics.push({
        topic: '暑假安排',
        category: 'seasonal',
        priority: 70,
        reason: '夏季話題',
        useCount: 0
      });
    }
    
    // 周末話題
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      topics.push({
        topic: '週末愉快',
        category: 'seasonal',
        priority: 75,
        reason: '週末問候',
        useCount: 0
      });
    }
    
    return topics;
  }
  
  /**
   * 獲取基於興趣的話題
   */
  private getInterestBasedTopics(
    lead: Lead,
    history: { topic: string; usedAt: Date }[]
  ): TopicRecommendation[] {
    const topics: TopicRecommendation[] = [];
    
    for (const interest of lead.profile.interests) {
      const usageInfo = history.filter(h => h.topic === interest);
      
      // 不要過度使用同一個興趣話題
      if (usageInfo.length < STRATEGY_CONFIG.topicRotation.casualTopicMaxUses) {
        topics.push({
          topic: interest,
          category: 'interest',
          priority: 90 - usageInfo.length * 20, // 使用越多優先級越低
          reason: `基於用戶興趣: ${interest}`,
          lastUsed: usageInfo[usageInfo.length - 1]?.usedAt,
          useCount: usageInfo.length
        });
      }
    }
    
    return topics;
  }
  
  /**
   * 計算話題優先級
   */
  private calculateTopicPriority(
    topic: string,
    usageInfo: { topic: string; usedAt: Date }[],
    lead: Lead
  ): number {
    let priority = 50;
    
    // 從未使用過的話題優先
    if (usageInfo.length === 0) {
      priority += 30;
    } else {
      // 最近使用過的降低優先級
      const lastUsed = usageInfo[usageInfo.length - 1].usedAt;
      const daysSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSince < 1) {
        priority -= 40;
      } else if (daysSince < 3) {
        priority -= 20;
      } else if (daysSince > 7) {
        priority += 10;
      }
    }
    
    // 使用次數過多降低優先級
    priority -= usageInfo.length * 10;
    
    return Math.max(0, Math.min(100, priority));
  }
  
  // ============ 對話狀態管理 ============
  
  /**
   * 獲取對話狀態
   */
  getConversationState(leadId: string): ConversationState {
    const cached = this._conversationStates().get(leadId);
    if (cached) return cached;
    
    // 創建新狀態
    const state = this.initializeConversationState(leadId);
    this._conversationStates.update(states => {
      const newStates = new Map(states);
      newStates.set(leadId, state);
      return newStates;
    });
    
    return state;
  }
  
  /**
   * 初始化對話狀態
   */
  private initializeConversationState(leadId: string): ConversationState {
    const lead = this.leadService.getLead(leadId);
    const conversations = this.leadService.getConversations(leadId);
    
    // 計算當前狀態
    let roundsWithoutResponse = 0;
    let businessAttempts = 0;
    const topicsUsed: string[] = [];
    
    if (conversations.length > 0) {
      const latestConversation = conversations[conversations.length - 1];
      const messages = latestConversation.messages;
      
      // 計算連續無回覆
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          roundsWithoutResponse++;
        } else {
          break;
        }
      }
    }
    
    return {
      leadId,
      currentPhase: this.determinePhase(lead),
      roundsWithoutResponse,
      totalRounds: conversations.reduce((sum, c) => sum + c.messages.length, 0),
      businessAttempts,
      topicsUsed,
      sentiment: 'unknown',
      purchaseSignalsDetected: 0,
      objectionCount: 0,
      needsHumanIntervention: false,
      updatedAt: new Date()
    };
  }
  
  /**
   * 確定對話階段
   */
  private determinePhase(lead?: Lead): ConversationState['currentPhase'] {
    if (!lead) return 'opening';
    
    switch (lead.stage) {
      case 'stranger':
        return 'opening';
      case 'visitor':
        return 'building';
      case 'lead':
        return 'exploring';
      case 'qualified':
        return 'presenting';
      case 'customer':
        return 'following';
      default:
        return 'building';
    }
  }
  
  /**
   * 更新對話狀態（發送消息後）
   */
  updateStateAfterMessage(
    leadId: string,
    type: ConversationType,
    topic?: string
  ): void {
    this._conversationStates.update(states => {
      const newStates = new Map(states);
      const current = newStates.get(leadId) || this.initializeConversationState(leadId);
      
      const updated: ConversationState = {
        ...current,
        totalRounds: current.totalRounds + 1,
        roundsWithoutResponse: current.roundsWithoutResponse + 1,
        businessAttempts: type === 'business' 
          ? current.businessAttempts + 1 
          : current.businessAttempts,
        topicsUsed: topic 
          ? [...current.topicsUsed.slice(-10), topic]
          : current.topicsUsed,
        lastTopic: topic,
        updatedAt: new Date()
      };
      
      newStates.set(leadId, updated);
      return newStates;
    });
    
    // 記錄話題使用
    if (topic) {
      this._topicHistory.update(history => {
        const newHistory = new Map(history);
        const leadHistory = newHistory.get(leadId) || [];
        leadHistory.push({ topic, usedAt: new Date() });
        newHistory.set(leadId, leadHistory.slice(-50));
        return newHistory;
      });
    }
    
    this.saveData();
  }
  
  /**
   * 更新對話狀態（收到回覆後）
   */
  updateStateAfterReply(
    leadId: string,
    sentiment: 'positive' | 'neutral' | 'negative',
    hasPurchaseSignal: boolean
  ): void {
    this._conversationStates.update(states => {
      const newStates = new Map(states);
      const current = newStates.get(leadId) || this.initializeConversationState(leadId);
      
      const updated: ConversationState = {
        ...current,
        roundsWithoutResponse: 0, // 重置
        sentiment,
        purchaseSignalsDetected: hasPurchaseSignal 
          ? current.purchaseSignalsDetected + 1
          : current.purchaseSignalsDetected,
        updatedAt: new Date()
      };
      
      newStates.set(leadId, updated);
      return newStates;
    });
    
    this.saveData();
  }
  
  // ============ 成交引導 ============
  
  /**
   * 獲取成交引導建議
   */
  getClosingGuidance(lead: Lead): ClosingGuidance {
    const state = this.getConversationState(lead.id);
    
    // 判斷是否應該嘗試成交
    const shouldClose = this.shouldAttemptClose(lead, state);
    
    if (!shouldClose) {
      return {
        shouldAttemptClose: false,
        technique: 'continue_nurturing',
        suggestedMessage: '',
        confidence: 0.3,
        fallbackStrategy: '繼續培育，建立更多信任'
      };
    }
    
    // 選擇成交技巧
    const technique = this.selectClosingTechnique(lead, state);
    const suggestedMessage = this.generateClosingMessage(lead, technique);
    
    return {
      shouldAttemptClose: true,
      technique,
      suggestedMessage,
      confidence: this.calculateClosingConfidence(lead, state),
      fallbackStrategy: this.getFallbackStrategy(technique)
    };
  }
  
  /**
   * 判斷是否應該嘗試成交
   */
  private shouldAttemptClose(lead: Lead, state: ConversationState): boolean {
    // 必須是高意向階段
    if (lead.stage !== 'qualified') return false;
    
    // 檢測到購買信號
    if (state.purchaseSignalsDetected > 0) return true;
    
    // 意向分數高
    if (lead.scores.intent >= 75 && lead.scores.urgency >= 60) return true;
    
    return false;
  }
  
  /**
   * 選擇成交技巧
   */
  private selectClosingTechnique(lead: Lead, state: ConversationState): string {
    if (lead.scores.urgency >= 80) {
      return 'direct_close'; // 直接成交
    }
    
    if (state.objectionCount > 0) {
      return 'objection_handling'; // 異議處理後成交
    }
    
    if (state.purchaseSignalsDetected >= 2) {
      return 'assumptive_close'; // 假設成交
    }
    
    return 'soft_close'; // 軟成交
  }
  
  /**
   * 生成成交消息
   */
  private generateClosingMessage(lead: Lead, technique: string): string {
    const name = lead.firstName || lead.displayName;
    
    switch (technique) {
      case 'direct_close':
        return `${name}，既然您已經確認需求了，我現在就幫您安排開通，您看方便嗎？`;
      
      case 'assumptive_close':
        return `${name}，那我幫您準備合同，您是選擇月付還是年付呢？年付可以享受更多優惠哦~`;
      
      case 'soft_close':
        return `${name}，我可以先幫您預留一個名額，這樣您考慮好了隨時可以開始，不會錯過當前的優惠活動，您看怎麼樣？`;
      
      case 'objection_handling':
        return `${name}，我理解您的顧慮。不如這樣，我們可以先從基礎方案開始，隨時可以升級，這樣風險最小，您覺得呢？`;
      
      default:
        return `${name}，如果沒有其他問題的話，我們可以開始了嗎？`;
    }
  }
  
  /**
   * 計算成交信心度
   */
  private calculateClosingConfidence(lead: Lead, state: ConversationState): number {
    let confidence = 0.5;
    
    // 購買信號
    confidence += state.purchaseSignalsDetected * 0.1;
    
    // 意向分數
    confidence += (lead.scores.intent / 100) * 0.2;
    
    // 正面情緒
    if (state.sentiment === 'positive') {
      confidence += 0.1;
    }
    
    // 回覆率高
    if (lead.stats.responseRate > 0.7) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }
  
  /**
   * 獲取備選策略
   */
  private getFallbackStrategy(technique: string): string {
    switch (technique) {
      case 'direct_close':
        return '如果用戶猶豫，轉為軟成交或提供更多價值說明';
      case 'assumptive_close':
        return '如果用戶拒絕，詢問具體顧慮並解答';
      case 'soft_close':
        return '保持跟進，定期提供價值內容';
      default:
        return '繼續培育關係';
    }
  }
  
  // ============ 升級檢查 ============
  
  /**
   * 檢查是否需要升級到人工
   */
  private checkShouldEscalate(lead: Lead, state: ConversationState): boolean {
    // 連續無回覆超過閾值
    if (state.roundsWithoutResponse >= STRATEGY_CONFIG.conversationRounds.maxWithoutResponse) {
      return true;
    }
    
    // 對話輪次過多
    if (state.totalRounds >= STRATEGY_CONFIG.conversationRounds.escalateToHumanAfter) {
      return true;
    }
    
    // 負面情緒
    if (state.sentiment === 'negative') {
      return true;
    }
    
    // 高意向但多次無法成交
    if (lead.stage === 'qualified' && state.businessAttempts >= 5 && state.purchaseSignalsDetected === 0) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 獲取升級原因
   */
  private getEscalationReason(lead: Lead, state: ConversationState): string {
    if (state.roundsWithoutResponse >= STRATEGY_CONFIG.conversationRounds.maxWithoutResponse) {
      return '連續多次無回覆';
    }
    
    if (state.sentiment === 'negative') {
      return '檢測到負面情緒';
    }
    
    if (state.totalRounds >= STRATEGY_CONFIG.conversationRounds.escalateToHumanAfter) {
      return '對話輪次過多';
    }
    
    return '需要人工介入';
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      const states = Array.from(this._conversationStates().entries());
      localStorage.setItem('tgai-conversation-states', JSON.stringify(states));
      
      const history = Array.from(this._topicHistory().entries());
      localStorage.setItem('tgai-topic-history', JSON.stringify(history));
    } catch (e) {
      console.error('[ConversationStrategy] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const statesData = localStorage.getItem('tgai-conversation-states');
      if (statesData) {
        const entries = JSON.parse(statesData).map(([k, v]: [string, any]) => [
          k,
          { ...v, updatedAt: new Date(v.updatedAt) }
        ]);
        this._conversationStates.set(new Map(entries));
      }
      
      const historyData = localStorage.getItem('tgai-topic-history');
      if (historyData) {
        const entries = JSON.parse(historyData).map(([k, v]: [string, any[]]) => [
          k,
          v.map((h: any) => ({ ...h, usedAt: new Date(h.usedAt) }))
        ]);
        this._topicHistory.set(new Map(entries));
      }
    } catch (e) {
      console.error('[ConversationStrategy] Load error:', e);
    }
  }
}
