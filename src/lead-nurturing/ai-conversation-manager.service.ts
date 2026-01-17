/**
 * TG-AI智控王 AI對話管理器
 * AI Conversation Manager Service v1.0
 * 
 * 功能：
 * - 多輪對話上下文管理
 * - AI回覆生成和優化
 * - 購買引導策略
 * - 異議處理
 * - 人工介入觸發
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AIProviderService, AIMessage } from './ai-provider.service';
import { SentimentAnalyzerService, SentimentResult, IntentType } from './sentiment-analyzer.service';
import { DynamicTopicGeneratorService } from './dynamic-topic-generator.service';
import { LeadService } from './lead.service';
import { Lead, FunnelStage, ConversationType, LeadMessage } from './lead.models';

// ============ 類型定義 ============

/** 對話上下文 */
export interface ConversationContext {
  leadId: string;
  sessionId: string;
  messages: AIMessage[];
  currentTopic?: string;
  objectives: string[];
  detectedIntents: IntentType[];
  purchaseSignals: number;
  objectionCount: number;
  sentimentHistory: SentimentResult[];
  turnsWithoutResponse: number;
  totalTurns: number;
  startedAt: Date;
  lastActivityAt: Date;
}

/** 回覆生成請求 */
export interface ReplyGenerationRequest {
  leadId: string;
  userMessage: string;
  type: ConversationType;
  context?: Partial<ConversationContext>;
  forceAI?: boolean;
}

/** 回覆生成結果 */
export interface ReplyGenerationResult {
  content: string;
  type: ConversationType;
  confidence: number;
  strategy: string;
  suggestedActions: {
    action: string;
    label: string;
    params?: Record<string, any>;
  }[];
  needsHumanReview: boolean;
  reviewReason?: string;
  sentiment: SentimentResult;
  shouldClose: boolean;
  closingOpportunity?: {
    confidence: number;
    suggestedClose: string;
  };
}

/** 系統提示配置 */
export interface SystemPromptConfig {
  businessInfo: {
    companyName: string;
    productName: string;
    mainBenefits: string[];
    priceRange?: string;
  };
  personality: {
    tone: 'professional' | 'friendly' | 'casual' | 'warm';
    useEmoji: boolean;
    formality: 'high' | 'medium' | 'low';
  };
  objectives: {
    primary: string;
    secondary: string[];
  };
  constraints: {
    maxMessageLength: number;
    forbiddenTopics: string[];
    mustInclude: string[];
  };
}

// ============ 默認配置 ============

const DEFAULT_SYSTEM_PROMPT_CONFIG: SystemPromptConfig = {
  businessInfo: {
    companyName: 'TG-AI智控王',
    productName: 'Telegram自動化營銷工具',
    mainBenefits: [
      '自動化客戶開發',
      'AI智能回覆',
      '多帳號管理',
      '銷售漏斗追蹤'
    ],
    priceRange: '按需定價'
  },
  personality: {
    tone: 'friendly',
    useEmoji: true,
    formality: 'medium'
  },
  objectives: {
    primary: '建立信任並引導成交',
    secondary: ['了解需求', '解答疑問', '提供價值']
  },
  constraints: {
    maxMessageLength: 200,
    forbiddenTopics: ['政治', '宗教', '競爭對手負面評價'],
    mustInclude: []
  }
};

// ============ 異議處理模板 ============

const OBJECTION_HANDLERS: Record<string, string[]> = {
  price: [
    '我理解價格是重要考量。不過如果算上節省的時間成本，其實是很划算的。',
    '我們有不同價位的套餐，可以先從基礎版開始體驗。',
    '現在有優惠活動，是個不錯的入手時機。',
    '可以先試用看看效果，滿意再考慮付費。'
  ],
  timing: [
    '沒關係，可以先了解一下，有需要隨時找我。',
    '好的，那我先給你留一份資料，方便的時候看看。',
    '明白，那我過段時間再聯繫你？'
  ],
  need: [
    '了解，可以告訴我你目前的情況嗎？也許我能提供一些建議。',
    '沒問題，那你現在主要用什麼方式呢？',
    '好的，如果以後有需要隨時找我。'
  ],
  trust: [
    '理解你的顧慮。這是我們的一些客戶評價，你可以看看。',
    '我們已經服務了很多客戶，口碑一直不錯。',
    '你可以先試用一下，滿意再考慮付費。'
  ],
  authority: [
    '好的，需要我準備一些資料給你參考嗎？',
    '沒問題，你可以把主要優勢分享給對方看看。',
    '了解，有什麼問題可以隨時問我。'
  ],
  competition: [
    '相比其他產品，我們的優勢是...',
    '很多用戶從其他產品轉過來，主要是因為...',
    '我們可以並行使用，你自己比較看看效果。'
  ]
};

@Injectable({
  providedIn: 'root'
})
export class AIConversationManagerService {
  private aiProvider = inject(AIProviderService);
  private sentimentAnalyzer = inject(SentimentAnalyzerService);
  private topicGenerator = inject(DynamicTopicGeneratorService);
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 對話上下文緩存
  private _contexts = signal<Map<string, ConversationContext>>(new Map());
  contexts = computed(() => this._contexts());
  
  // 系統提示配置
  private _promptConfig = signal<SystemPromptConfig>(DEFAULT_SYSTEM_PROMPT_CONFIG);
  promptConfig = computed(() => this._promptConfig());
  
  // 最大上下文消息數
  private maxContextMessages = 20;
  
  // 人工介入閾值
  private humanInterventionThresholds = {
    objectionCount: 3,
    turnsWithoutResponse: 5,
    negativeSentiment: -0.5,
    lowConfidence: 0.4
  };
  
  constructor() {
    this.loadConfig();
  }
  
  // ============ 核心對話功能 ============
  
  /**
   * 生成AI回覆
   */
  async generateReply(request: ReplyGenerationRequest): Promise<ReplyGenerationResult> {
    const lead = this.leadService.getLead(request.leadId);
    if (!lead) {
      throw new Error('用戶不存在');
    }
    
    // 獲取或創建對話上下文
    const context = this.getOrCreateContext(request.leadId);
    
    // 分析用戶消息
    const sentiment = await this.sentimentAnalyzer.analyze(request.userMessage, request.leadId);
    
    // 更新上下文
    this.updateContextWithMessage(context, request.userMessage, 'user', sentiment);
    
    // 確定回覆策略
    const strategy = this.determineStrategy(lead, context, sentiment, request.type);
    
    // 生成回覆
    const reply = await this.generateReplyContent(lead, context, strategy, request);
    
    // 檢查是否需要人工介入
    const { needsReview, reason } = this.checkNeedsHumanReview(lead, context, sentiment, reply.confidence);
    
    // 檢查成交機會
    const closingOpportunity = this.evaluateClosingOpportunity(lead, context, sentiment);
    
    // 更新上下文
    this.updateContextWithMessage(context, reply.content, 'assistant');
    
    // 構建結果
    const result: ReplyGenerationResult = {
      content: reply.content,
      type: request.type,
      confidence: reply.confidence,
      strategy: strategy.name,
      suggestedActions: this.getSuggestedActions(lead, context, sentiment, closingOpportunity),
      needsHumanReview: needsReview,
      reviewReason: reason,
      sentiment,
      shouldClose: closingOpportunity.confidence > 0.7,
      closingOpportunity: closingOpportunity.confidence > 0.5 ? closingOpportunity : undefined
    };
    
    // 保存上下文
    this.saveContext(context);
    
    return result;
  }
  
  /**
   * 確定回覆策略
   */
  private determineStrategy(
    lead: Lead,
    context: ConversationContext,
    sentiment: SentimentResult,
    type: ConversationType
  ): { name: string; approach: string; goals: string[] } {
    // 檢測異議
    if (sentiment.objections && sentiment.objections.length > 0) {
      return {
        name: 'objection_handling',
        approach: '先認同理解，再提供解決方案',
        goals: ['化解疑慮', '重建信任', '提供替代方案']
      };
    }
    
    // 檢測強購買信號
    if (sentiment.purchaseSignals && sentiment.purchaseSignals.some(s => s.startsWith('strong'))) {
      return {
        name: 'closing',
        approach: '直接引導成交',
        goals: ['確認需求', '提供報價', '促成下單']
      };
    }
    
    // 檢測中等購買信號
    if (sentiment.purchaseSignals && sentiment.purchaseSignals.length > 0) {
      return {
        name: 'nurturing_to_close',
        approach: '繼續培育並適時引導',
        goals: ['解答疑問', '強調價值', '製造緊迫感']
      };
    }
    
    // 根據階段和類型
    if (type === 'business') {
      switch (lead.stage) {
        case 'stranger':
        case 'visitor':
          return {
            name: 'building_rapport',
            approach: '建立關係，了解需求',
            goals: ['自我介紹', '引起興趣', '探索需求']
          };
        case 'lead':
          return {
            name: 'value_presentation',
            approach: '展示價值，解決痛點',
            goals: ['展示案例', '強調優勢', '製造興趣']
          };
        case 'qualified':
          return {
            name: 'conversion',
            approach: '促成轉化',
            goals: ['解答疑問', '提供報價', '推動決策']
          };
        default:
          return {
            name: 'relationship_maintenance',
            approach: '維護關係',
            goals: ['提供價值', '保持聯繫', '尋找機會']
          };
      }
    } else {
      return {
        name: 'casual_nurturing',
        approach: '輕鬆聊天，加深關係',
        goals: ['表達關心', '建立信任', '保持聯繫']
      };
    }
  }
  
  /**
   * 生成回覆內容
   */
  private async generateReplyContent(
    lead: Lead,
    context: ConversationContext,
    strategy: { name: string; approach: string; goals: string[] },
    request: ReplyGenerationRequest
  ): Promise<{ content: string; confidence: number }> {
    // 構建系統提示
    const systemPrompt = this.buildSystemPrompt(lead, context, strategy);
    
    // 構建消息列表
    const messages: AIMessage[] = [
      ...context.messages.slice(-this.maxContextMessages)
    ];
    
    try {
      // 調用AI生成
      const response = await this.aiProvider.generate({
        messages,
        systemPrompt,
        maxTokens: this._promptConfig().constraints.maxMessageLength * 2,
        temperature: 0.7
      });
      
      // 後處理
      let content = this.postProcessReply(response.content, lead);
      
      // 處理異議
      const sentiment = await this.sentimentAnalyzer.analyze(request.userMessage);
      if (sentiment.objections && sentiment.objections.length > 0) {
        content = this.handleObjection(content, sentiment.objections[0]);
      }
      
      return {
        content,
        confidence: this.calculateConfidence(response, context)
      };
    } catch (error) {
      console.error('[AIConversationManager] Generation error:', error);
      
      // 使用模板回覆
      return this.getFallbackReply(lead, strategy, request.type);
    }
  }
  
  /**
   * 構建系統提示
   */
  private buildSystemPrompt(
    lead: Lead,
    context: ConversationContext,
    strategy: { name: string; approach: string; goals: string[] }
  ): string {
    const config = this._promptConfig();
    
    const prompt = `你是${config.businessInfo.companyName}的銷售顧問，正在與潛在客戶對話。

## 客戶信息
- 稱呼: ${lead.firstName || lead.displayName}
- 階段: ${this.leadService.getStageName(lead.stage)}
- 興趣: ${lead.profile.interests.join(', ') || '未知'}
- 信任度: ${lead.scores.trust}%
- 購買意向: ${lead.scores.intent}%

## 產品信息
- 產品: ${config.businessInfo.productName}
- 主要優勢: ${config.businessInfo.mainBenefits.join('、')}
${config.businessInfo.priceRange ? `- 價格範圍: ${config.businessInfo.priceRange}` : ''}

## 當前策略
- 策略: ${strategy.name}
- 方式: ${strategy.approach}
- 目標: ${strategy.goals.join('、')}

## 對話狀態
- 已進行 ${context.totalTurns} 輪對話
- 檢測到 ${context.purchaseSignals} 個購買信號
- 異議次數: ${context.objectionCount}

## 回覆要求
1. 風格: ${config.personality.tone}
2. ${config.personality.useEmoji ? '適當使用表情符號' : '不使用表情符號'}
3. 長度控制在 ${config.constraints.maxMessageLength} 字以內
4. ${config.personality.formality === 'high' ? '保持正式' : config.personality.formality === 'low' ? '輕鬆隨意' : '適度正式'}
5. 避免: ${config.constraints.forbiddenTopics.join('、')}

請根據以上信息，生成一條自然、有針對性的回覆。只返回回覆內容，不要其他說明。`;

    return prompt;
  }
  
  /**
   * 後處理回覆
   */
  private postProcessReply(content: string, lead: Lead): string {
    // 移除多餘的引號
    content = content.replace(/^["']|["']$/g, '');
    
    // 確保長度合適
    const maxLength = this._promptConfig().constraints.maxMessageLength;
    if (content.length > maxLength) {
      // 嘗試在句號或問號處截斷
      const truncated = content.substring(0, maxLength);
      const lastPunctuation = Math.max(
        truncated.lastIndexOf('。'),
        truncated.lastIndexOf('？'),
        truncated.lastIndexOf('！'),
        truncated.lastIndexOf('.')
      );
      if (lastPunctuation > maxLength * 0.5) {
        content = truncated.substring(0, lastPunctuation + 1);
      } else {
        content = truncated + '...';
      }
    }
    
    // 個性化
    const name = lead.firstName || lead.displayName.split(' ')[0];
    if (name && Math.random() < 0.3 && !content.includes(name)) {
      content = name + '，' + content;
    }
    
    return content.trim();
  }
  
  /**
   * 處理異議
   */
  private handleObjection(originalReply: string, objectionType: string): string {
    const handlers = OBJECTION_HANDLERS[objectionType];
    if (!handlers || handlers.length === 0) {
      return originalReply;
    }
    
    // 選擇一個處理模板
    const handler = handlers[Math.floor(Math.random() * handlers.length)];
    
    // 如果原始回覆已經包含處理，直接返回
    if (originalReply.includes('理解') || originalReply.includes('明白')) {
      return originalReply;
    }
    
    // 組合回覆
    return handler + '\n\n' + originalReply;
  }
  
  /**
   * 獲取備選回覆
   */
  private getFallbackReply(
    lead: Lead,
    strategy: { name: string },
    type: ConversationType
  ): { content: string; confidence: number } {
    const name = lead.firstName || lead.displayName;
    
    const fallbacks: Record<string, string[]> = {
      objection_handling: [
        '我理解你的顧慮，讓我來解釋一下...',
        '這確實是很多人會問的問題，其實...'
      ],
      closing: [
        `${name}，如果沒有其他問題，我們可以開始了嗎？`,
        '需要我現在幫你安排嗎？'
      ],
      nurturing_to_close: [
        '還有什麼疑問嗎？我可以幫你解答',
        '你考慮得怎麼樣了？'
      ],
      building_rapport: [
        '很高興認識你！你主要在做什麼呢？',
        '可以告訴我你目前的情況嗎？'
      ],
      value_presentation: [
        '讓我分享一個案例給你...',
        '這個功能可以幫你解決...'
      ],
      casual_nurturing: [
        '最近怎麼樣？',
        '好久沒聊了，最近忙些什麼？'
      ]
    };
    
    const options = fallbacks[strategy.name] || fallbacks['casual_nurturing'];
    const content = options[Math.floor(Math.random() * options.length)];
    
    return {
      content,
      confidence: 0.5
    };
  }
  
  /**
   * 計算信心度
   */
  private calculateConfidence(
    response: any,
    context: ConversationContext
  ): number {
    let confidence = 0.7;
    
    // 根據上下文長度調整
    if (context.messages.length >= 4) {
      confidence += 0.1;
    }
    
    // 根據回覆長度調整
    if (response.content.length > 20 && response.content.length < 150) {
      confidence += 0.1;
    }
    
    // 根據是否有問題結尾
    if (response.content.includes('?') || response.content.includes('？')) {
      confidence += 0.05;
    }
    
    return Math.min(1, confidence);
  }
  
  // ============ 上下文管理 ============
  
  /**
   * 獲取或創建對話上下文
   */
  private getOrCreateContext(leadId: string): ConversationContext {
    const existing = this._contexts().get(leadId);
    if (existing) {
      return existing;
    }
    
    const newContext: ConversationContext = {
      leadId,
      sessionId: `session_${Date.now()}`,
      messages: [],
      objectives: [],
      detectedIntents: [],
      purchaseSignals: 0,
      objectionCount: 0,
      sentimentHistory: [],
      turnsWithoutResponse: 0,
      totalTurns: 0,
      startedAt: new Date(),
      lastActivityAt: new Date()
    };
    
    this._contexts.update(contexts => {
      const newContexts = new Map(contexts);
      newContexts.set(leadId, newContext);
      return newContexts;
    });
    
    return newContext;
  }
  
  /**
   * 更新上下文
   */
  private updateContextWithMessage(
    context: ConversationContext,
    content: string,
    role: 'user' | 'assistant',
    sentiment?: SentimentResult
  ): void {
    // 添加消息
    context.messages.push({ role, content });
    
    // 保持消息數量限制
    if (context.messages.length > this.maxContextMessages) {
      context.messages = context.messages.slice(-this.maxContextMessages);
    }
    
    // 更新統計
    context.totalTurns++;
    context.lastActivityAt = new Date();
    
    if (role === 'user' && sentiment) {
      context.sentimentHistory.push(sentiment);
      
      // 更新意圖
      if (sentiment.primaryIntent !== 'unknown' && !context.detectedIntents.includes(sentiment.primaryIntent)) {
        context.detectedIntents.push(sentiment.primaryIntent);
      }
      
      // 更新購買信號
      if (sentiment.purchaseSignals) {
        context.purchaseSignals += sentiment.purchaseSignals.length;
      }
      
      // 更新異議
      if (sentiment.objections) {
        context.objectionCount += sentiment.objections.length;
      }
      
      // 重置無回覆計數
      context.turnsWithoutResponse = 0;
    }
    
    if (role === 'assistant') {
      context.turnsWithoutResponse++;
    }
  }
  
  /**
   * 保存上下文
   */
  private saveContext(context: ConversationContext): void {
    this._contexts.update(contexts => {
      const newContexts = new Map(contexts);
      newContexts.set(context.leadId, context);
      return newContexts;
    });
  }
  
  /**
   * 清除對話上下文
   */
  clearContext(leadId: string): void {
    this._contexts.update(contexts => {
      const newContexts = new Map(contexts);
      newContexts.delete(leadId);
      return newContexts;
    });
  }
  
  /**
   * 獲取對話上下文
   */
  getContext(leadId: string): ConversationContext | undefined {
    return this._contexts().get(leadId);
  }
  
  // ============ 人工介入檢查 ============
  
  /**
   * 檢查是否需要人工介入
   */
  private checkNeedsHumanReview(
    lead: Lead,
    context: ConversationContext,
    sentiment: SentimentResult,
    confidence: number
  ): { needsReview: boolean; reason?: string } {
    const thresholds = this.humanInterventionThresholds;
    
    // 異議次數過多
    if (context.objectionCount >= thresholds.objectionCount) {
      return { needsReview: true, reason: '異議次數較多，建議人工介入' };
    }
    
    // 連續無回覆
    if (context.turnsWithoutResponse >= thresholds.turnsWithoutResponse) {
      return { needsReview: true, reason: '多輪無回覆，建議人工跟進' };
    }
    
    // 負面情緒
    if (sentiment.score <= thresholds.negativeSentiment) {
      return { needsReview: true, reason: '檢測到負面情緒，建議人工處理' };
    }
    
    // 信心度低
    if (confidence <= thresholds.lowConfidence) {
      return { needsReview: true, reason: 'AI信心度較低，建議人工審核' };
    }
    
    // 高意向客戶
    if (lead.stage === 'qualified' && lead.scores.intent >= 80) {
      return { needsReview: true, reason: '高意向客戶，建議人工確認' };
    }
    
    return { needsReview: false };
  }
  
  // ============ 成交機會評估 ============
  
  /**
   * 評估成交機會
   */
  private evaluateClosingOpportunity(
    lead: Lead,
    context: ConversationContext,
    sentiment: SentimentResult
  ): { confidence: number; suggestedClose: string } {
    let confidence = 0.2;
    
    // 購買信號
    if (sentiment.purchaseSignals && sentiment.purchaseSignals.some(s => s.startsWith('strong'))) {
      confidence += 0.4;
    } else if (sentiment.purchaseSignals && sentiment.purchaseSignals.length > 0) {
      confidence += 0.2;
    }
    
    // 意圖
    if (sentiment.primaryIntent === 'purchase') {
      confidence += 0.3;
    } else if (sentiment.primaryIntent === 'inquiry') {
      confidence += 0.1;
    }
    
    // 正面情緒
    if (sentiment.score > 0.5) {
      confidence += 0.1;
    }
    
    // 階段
    if (lead.stage === 'qualified') {
      confidence += 0.1;
    }
    
    // 沒有異議
    if (!sentiment.objections || sentiment.objections.length === 0) {
      confidence += 0.1;
    }
    
    const name = lead.firstName || lead.displayName;
    let suggestedClose = '';
    
    if (confidence >= 0.7) {
      suggestedClose = `${name}，既然你已經確認需求了，我現在就幫你安排，好嗎？`;
    } else if (confidence >= 0.5) {
      suggestedClose = `${name}，如果沒問題的話，我們可以開始了？`;
    } else {
      suggestedClose = `有什麼其他問題嗎？我可以幫你解答。`;
    }
    
    return {
      confidence: Math.min(1, confidence),
      suggestedClose
    };
  }
  
  // ============ 建議操作 ============
  
  /**
   * 獲取建議操作
   */
  private getSuggestedActions(
    lead: Lead,
    context: ConversationContext,
    sentiment: SentimentResult,
    closingOpportunity: { confidence: number; suggestedClose: string }
  ): ReplyGenerationResult['suggestedActions'] {
    const actions: ReplyGenerationResult['suggestedActions'] = [];
    
    // 如果有成交機會
    if (closingOpportunity.confidence >= 0.5) {
      actions.push({
        action: 'attempt_close',
        label: '嘗試成交',
        params: { suggestedClose: closingOpportunity.suggestedClose }
      });
    }
    
    // 如果有異議
    if (sentiment.objections && sentiment.objections.length > 0) {
      actions.push({
        action: 'handle_objection',
        label: '處理異議',
        params: { objections: sentiment.objections }
      });
    }
    
    // 如果購買意向高
    if (sentiment.primaryIntent === 'purchase' || sentiment.primaryIntent === 'inquiry') {
      actions.push({
        action: 'send_pricing',
        label: '發送報價'
      });
    }
    
    // 通用操作
    actions.push({
      action: 'regenerate',
      label: '重新生成'
    });
    
    actions.push({
      action: 'human_takeover',
      label: '人工接管'
    });
    
    return actions;
  }
  
  // ============ 配置管理 ============
  
  /**
   * 更新系統提示配置
   */
  updatePromptConfig(config: Partial<SystemPromptConfig>): void {
    this._promptConfig.update(current => ({
      ...current,
      ...config,
      businessInfo: { ...current.businessInfo, ...config.businessInfo },
      personality: { ...current.personality, ...config.personality },
      objectives: { ...current.objectives, ...config.objectives },
      constraints: { ...current.constraints, ...config.constraints }
    }));
    this.saveConfig();
  }
  
  /**
   * 重置配置
   */
  resetPromptConfig(): void {
    this._promptConfig.set(DEFAULT_SYSTEM_PROMPT_CONFIG);
    this.saveConfig();
  }
  
  // ============ 持久化 ============
  
  private saveConfig(): void {
    try {
      localStorage.setItem('tgai-ai-conversation-config', JSON.stringify(this._promptConfig()));
    } catch (e) {
      console.error('[AIConversationManager] Save config error:', e);
    }
  }
  
  private loadConfig(): void {
    try {
      const data = localStorage.getItem('tgai-ai-conversation-config');
      if (data) {
        const config = JSON.parse(data);
        this._promptConfig.set({ ...DEFAULT_SYSTEM_PROMPT_CONFIG, ...config });
      }
    } catch (e) {
      console.error('[AIConversationManager] Load config error:', e);
    }
  }
}
