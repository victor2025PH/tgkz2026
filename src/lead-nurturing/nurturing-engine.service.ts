/**
 * TG-AI智控王 培育引擎服務
 * Nurturing Engine Service v2.0
 * 
 * 功能：
 * - AI智能對話生成
 * - 業務對話策略
 * - 情感維護策略
 * - 購買信號識別與響應
 * - 持續引導直到成交
 * - Phase 3: 深度AI整合
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
// Phase 3 AI服務
import { AIConversationManagerService } from './ai-conversation-manager.service';
import { SentimentAnalyzerService } from './sentiment-analyzer.service';
import { DynamicTopicGeneratorService } from './dynamic-topic-generator.service';
import {
  Lead,
  FunnelStage,
  ConversationType,
  LeadConversation,
  PurchaseSignal,
  NurturingSettings
} from './lead.models';

// ============ 配置 ============

const DEFAULT_NURTURING_SETTINGS: NurturingSettings = {
  mode: 'semi-auto',
  
  followUpFrequency: {
    stranger: { businessDays: 3, casualDays: 7 },
    visitor: { businessDays: 2, casualDays: 5 },
    lead: { businessDays: 2, casualDays: 5 },
    qualified: { businessDays: 1, casualDays: 3 },
    customer: { businessDays: 7, casualDays: 7 },
    advocate: { businessDays: 14, casualDays: 14 },
    dormant: { businessDays: 14, casualDays: 30 }
  },
  
  activeHours: {
    start: 9,
    end: 22,
    preferredStart: 10,
    preferredEnd: 12
  },
  
  conversationStyle: {
    tone: 'friendly',
    useEmoji: true,
    messageLength: 'medium'
  },
  
  businessGoals: {
    discountEnabled: true
  },
  
  humanInterventionTriggers: {
    purchaseIntent: true,
    complexQuestion: true,
    negativeEmotion: true,
    maxConversationRounds: 10,
    humanRequest: true
  },
  
  notifications: {
    sound: true,
    desktop: true,
    urgentOnly: false
  }
};

// ============ 話題庫 ============

const TOPIC_LIBRARY = {
  // 日常問候
  greetings: {
    morning: [
      '早安！☀️ 新的一天開始了，今天有什麼計劃嗎？',
      '早上好！希望你今天一切順利！',
      '早安～昨晚休息得好嗎？'
    ],
    afternoon: [
      '下午好！工作順利嗎？',
      '午安！別忘了休息一下哦～',
      '下午好！今天過得怎麼樣？'
    ],
    evening: [
      '晚上好！今天辛苦了～',
      '晚安！忙了一天該放鬆一下了',
      '晚上好！有時間聊聊嗎？'
    ],
    weekend: [
      '周末愉快！有什麼安排嗎？',
      '週末到了，好好放鬆一下吧！',
      '周末好！準備做什麼有趣的事？'
    ]
  },
  
  // 情感維護話題
  casual: {
    general: [
      '最近過得怎麼樣？',
      '好久沒聊了，最近忙些什麼？',
      '突然想起你，來問候一下～'
    ],
    weather: [
      '今天天氣真不錯，適合出去走走',
      '最近天氣變化大，要注意身體哦',
      '這幾天好熱啊，記得多喝水'
    ],
    holidays: [
      '節日快樂！🎉 祝你一切順利！',
      '假期開心嗎？有去哪裡玩嗎？',
      '佳節愉快！別忘了好好休息'
    ],
    interests: {
      crypto: [
        '最近加密市場挺有意思的，有在關注嗎？',
        '看到一個有趣的區塊鏈項目，想分享給你',
        'BTC最近的走勢你怎麼看？'
      ],
      investment: [
        '最近有什麼好的投資機會嗎？',
        '看到一份不錯的市場分析報告，有興趣看看嗎？',
        '投資方面最近有什麼心得？'
      ],
      tech: [
        '看到一個有趣的新技術，讓我想到你',
        '最近AI發展好快，你有在用嗎？',
        '科技圈又有新動態了，聊聊？'
      ]
    }
  },
  
  // 業務相關話題
  business: {
    introduction: [
      '對了，想跟你分享一下我們最近的新功能...',
      '不知道你有沒有這方面的需求，我們正好可以幫到你',
      '突然想到有個工具可能對你很有用'
    ],
    valueProposition: [
      '我們的服務已經幫助很多人提高了效率',
      '很多用戶反饋說這個功能特別實用',
      '這個工具最大的優勢是...'
    ],
    caseStudy: [
      '有個客戶情況和你類似，分享一下他的經驗',
      '最近有個很成功的案例，你可能會感興趣',
      '說個真實的例子給你聽...'
    ],
    promotion: [
      '對了，我們現在有個限時優惠活動',
      '想到你可能感興趣，現在購買有特別折扣',
      '活動快結束了，想提醒你一下'
    ],
    followUp: [
      '上次說的那個，你考慮得怎麼樣了？',
      '還有什麼疑問嗎？我可以幫你解答',
      '需要我提供更多信息嗎？'
    ],
    closing: [
      '如果沒問題的話，我幫你安排開通？',
      '需要我現在幫你處理嗎？',
      '準備好了就告訴我，隨時可以開始'
    ]
  },
  
  // 購買信號響應
  purchaseResponse: {
    strong: [
      '太好了！我現在就幫你處理。需要確認一下幾個細節...',
      '沒問題！請問您希望選擇哪個套餐？',
      '好的！我馬上為您安排，請問方便的話...'
    ],
    medium: [
      '很高興你感興趣！這個套餐包含以下功能：{{features}}',
      '關於價格，我們有幾個選項可以考慮：{{options}}',
      '這是我們的價格表，現在還有優惠活動哦：{{pricing}}'
    ],
    weak: [
      '沒問題，我來詳細介紹一下...',
      '這個功能主要可以幫你：{{benefits}}',
      '簡單說明一下：{{explanation}}'
    ]
  },
  
  // 異議處理
  objectionHandling: {
    price: [
      '我理解價格是重要考量。不過如果算上節省的時間成本，其實是很划算的',
      '我們有不同價位的套餐，可以先從基礎版開始體驗',
      '現在有優惠活動，是個不錯的入手時機'
    ],
    timing: [
      '沒關係，可以先了解一下，有需要隨時找我',
      '好的，那我先給你留一份資料，方便的時候看看',
      '明白，那我過段時間再聯繫你？'
    ],
    trust: [
      '可以理解您的顧慮。這是我們的一些客戶評價：{{reviews}}',
      '我們已經服務了{{count}}位客戶，口碑一直不錯',
      '您可以先試用一下，滿意再考慮付費'
    ],
    competitor: [
      '相比{{competitor}}，我們的優勢是：{{advantages}}',
      '很多用戶從{{competitor}}轉過來，主要是因為：{{reasons}}',
      '我們可以並行使用，您自己比較看看效果'
    ]
  }
};

// ============ 類型定義 ============

/** 生成內容請求 */
export interface GenerateContentRequest {
  leadId: string;
  type: ConversationType;
  context?: {
    previousMessages?: string[];
    userLastMessage?: string;
    purchaseSignal?: PurchaseSignal;
    specificTopic?: string;
  };
}

/** 生成內容響應 */
export interface GenerateContentResponse {
  content: string;
  type: ConversationType;
  confidence: number;
  suggestedActions?: {
    action: string;
    label: string;
  }[];
  requiresHumanReview: boolean;
  reason?: string;
}

/** 對話策略 */
export interface ConversationStrategy {
  type: ConversationType;
  topics: string[];
  tone: string;
  goals: string[];
  avoidTopics: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NurturingEngineService {
  private leadService = inject(LeadService);
  private scheduler = inject(FollowUpSchedulerService);
  // Phase 3 AI服務
  private aiConversationManager = inject(AIConversationManagerService);
  private sentimentAnalyzer = inject(SentimentAnalyzerService);
  private topicGenerator = inject(DynamicTopicGeneratorService);

  // ============ 狀態 ============
  
  // 全局設置
  private _settings = signal<NurturingSettings>(DEFAULT_NURTURING_SETTINGS);
  settings = computed(() => this._settings());
  
  // 正在培育的客戶
  private _activeNurturing = signal<Set<string>>(new Set());
  activeNurturing = computed(() => this._activeNurturing());
  
  // AI生成歷史
  private _generationHistory = signal<Map<string, GenerateContentResponse[]>>(new Map());
  
  constructor() {
    this.loadSettings();
  }
  
  // ============ 核心功能 ============
  
  /**
   * 生成跟進內容
   */
  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const lead = this.leadService.getLead(request.leadId);
    if (!lead) {
      throw new Error(`Lead not found: ${request.leadId}`);
    }

    // Phase 3: 使用AI對話管理器生成更智能的回覆
    if (request.context?.userLastMessage) {
      try {
        const aiResult = await this.aiConversationManager.generateReply({
          leadId: request.leadId,
          userMessage: request.context.userLastMessage,
          type: request.type
        });
        
        return {
          content: aiResult.content,
          type: request.type,
          confidence: aiResult.confidence,
          requiresHumanReview: aiResult.needsHumanReview,
          reason: aiResult.reviewReason,
          suggestedActions: aiResult.suggestedActions.map(a => ({
            action: a.action,
            label: a.label
          }))
        };
      } catch (error) {
        console.error('[NurturingEngine] AI generation failed, using fallback:', error);
      }
    }

    // 確定對話策略
    const strategy = this.determineStrategy(lead, request.type, request.context);

    // Phase 3: 使用話題生成器生成更個性化的開場白
    let content: string;
    if (!request.context?.userLastMessage) {
      try {
        const opener = await this.topicGenerator.generatePersonalizedOpener(lead, request.type);
        content = opener.content;
        
        // 記錄話題使用
        if (opener.topic) {
          this.topicGenerator.recordTopicUsage(lead.id, opener.topic.id);
        }
      } catch (error) {
        console.error('[NurturingEngine] Topic generation failed, using fallback:', error);
        content = await this.generateMessage(lead, strategy, request.context);
      }
    } else {
      content = await this.generateMessage(lead, strategy, request.context);
    }

    // 檢查是否需要人工審核
    const requiresReview = this.checkNeedsHumanReview(lead, request.context);

    const response: GenerateContentResponse = {
      content,
      type: request.type,
      confidence: this.calculateConfidence(lead, strategy),
      requiresHumanReview: requiresReview,
      reason: requiresReview ? this.getReviewReason(lead, request.context) : undefined,
      suggestedActions: this.getSuggestedActions(lead, strategy)
    };

    // 保存到歷史
    this.saveToHistory(request.leadId, response);

    return response;
  }
  
  /**
   * Phase 3: 分析用戶消息情感
   */
  async analyzeUserMessage(leadId: string, message: string) {
    return this.sentimentAnalyzer.analyze(message, leadId);
  }
  
  /**
   * Phase 3: 獲取話題推薦
   */
  getTopicRecommendations(lead: Lead, type: ConversationType) {
    return this.topicGenerator.getRecommendations(lead, type);
  }
  
  /**
   * Phase 3: 獲取情緒趨勢
   */
  getEmotionTrend(leadId: string) {
    return this.sentimentAnalyzer.getEmotionTrend(leadId);
  }
  
  /**
   * 確定對話策略
   */
  private determineStrategy(
    lead: Lead,
    type: ConversationType,
    context?: GenerateContentRequest['context']
  ): ConversationStrategy {
    const settings = this._settings();
    
    // 基礎策略
    const strategy: ConversationStrategy = {
      type,
      topics: [],
      tone: settings.conversationStyle.tone,
      goals: [],
      avoidTopics: []
    };
    
    // 根據階段調整
    switch (lead.stage) {
      case 'stranger':
        strategy.topics = ['自我介紹', '了解需求'];
        strategy.goals = ['建立初步聯繫', '了解基本情況'];
        strategy.avoidTopics = ['直接推銷', '價格'];
        break;
        
      case 'visitor':
        strategy.topics = ['興趣話題', '輕度業務'];
        strategy.goals = ['增加互動', '建立信任'];
        strategy.avoidTopics = ['過度推銷'];
        break;
        
      case 'lead':
        strategy.topics = ['解決方案', '產品介紹', '案例分享'];
        strategy.goals = ['深入了解需求', '提供價值'];
        break;
        
      case 'qualified':
        strategy.topics = ['報價', '優惠', '成交'];
        strategy.goals = ['促成交易', '解決最後疑慮'];
        break;
        
      case 'customer':
        strategy.topics = ['使用反饋', '新功能', '增值服務'];
        strategy.goals = ['維護關係', '促進復購'];
        strategy.avoidTopics = ['過度推銷'];
        break;
        
      case 'advocate':
        strategy.topics = ['專屬優惠', '內部消息', '感謝回饋'];
        strategy.goals = ['深化關係', '鼓勵推薦'];
        break;
        
      case 'dormant':
        strategy.topics = ['問候', '新動態', '特別優惠'];
        strategy.goals = ['重新激活', '了解原因'];
        break;
    }
    
    // 根據對話類型調整
    if (type === 'casual') {
      strategy.topics = this.getCasualTopics(lead);
      strategy.goals = ['維護關係', '加深印象'];
      strategy.avoidTopics = ['直接業務'];
    } else if (type === 'greeting') {
      strategy.topics = ['問候'];
      strategy.goals = ['保持聯繫'];
    }
    
    // 如果有購買信號，調整策略
    if (context?.purchaseSignal) {
      strategy.type = 'business';
      strategy.goals = ['響應購買意向', '促成交易'];
    }
    
    return strategy;
  }
  
  /**
   * 生成消息內容
   */
  private async generateMessage(
    lead: Lead,
    strategy: ConversationStrategy,
    context?: GenerateContentRequest['context']
  ): Promise<string> {
    // 如果是響應購買信號
    if (context?.purchaseSignal) {
      return this.generatePurchaseResponse(lead, context.purchaseSignal);
    }
    
    // 根據對話類型選擇模板
    switch (strategy.type) {
      case 'greeting':
        return this.generateGreeting(lead);
        
      case 'casual':
        return this.generateCasualMessage(lead);
        
      case 'business':
        return this.generateBusinessMessage(lead, strategy);
        
      case 'nurture':
        return this.generateNurtureMessage(lead, strategy);
        
      default:
        return this.generateGenericMessage(lead);
    }
  }
  
  /**
   * 生成問候消息
   */
  private generateGreeting(lead: Lead): string {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    let greetings: string[];
    
    // 周末特殊問候
    if (day === 0 || day === 6) {
      greetings = TOPIC_LIBRARY.greetings.weekend;
    } else if (hour < 12) {
      greetings = TOPIC_LIBRARY.greetings.morning;
    } else if (hour < 18) {
      greetings = TOPIC_LIBRARY.greetings.afternoon;
    } else {
      greetings = TOPIC_LIBRARY.greetings.evening;
    }
    
    // 隨機選擇並個性化
    let message = this.randomPick(greetings);
    message = this.personalizeMessage(message, lead);
    
    return message;
  }
  
  /**
   * 生成情感維護消息
   */
  private generateCasualMessage(lead: Lead): string {
    // 根據用戶興趣選擇話題
    const interests = lead.profile.interests;
    
    if (interests.length > 0) {
      // 嘗試匹配興趣話題
      for (const interest of interests) {
        const lowerInterest = interest.toLowerCase();
        if (lowerInterest.includes('加密') || lowerInterest.includes('crypto') || lowerInterest.includes('btc')) {
          return this.randomPick(TOPIC_LIBRARY.casual.interests.crypto);
        }
        if (lowerInterest.includes('投資') || lowerInterest.includes('理財')) {
          return this.randomPick(TOPIC_LIBRARY.casual.interests.investment);
        }
        if (lowerInterest.includes('技術') || lowerInterest.includes('科技') || lowerInterest.includes('ai')) {
          return this.randomPick(TOPIC_LIBRARY.casual.interests.tech);
        }
      }
    }
    
    // 默認使用通用話題
    const allCasual = [
      ...TOPIC_LIBRARY.casual.general,
      ...TOPIC_LIBRARY.casual.weather
    ];
    
    return this.personalizeMessage(this.randomPick(allCasual), lead);
  }
  
  /**
   * 生成業務消息
   */
  private generateBusinessMessage(lead: Lead, strategy: ConversationStrategy): string {
    // 根據階段選擇合適的業務話題
    switch (lead.stage) {
      case 'stranger':
      case 'visitor':
        return this.personalizeMessage(
          this.randomPick(TOPIC_LIBRARY.business.introduction),
          lead
        );
        
      case 'lead':
        // 輪換不同的業務話題
        const leadTopics = [
          ...TOPIC_LIBRARY.business.valueProposition,
          ...TOPIC_LIBRARY.business.caseStudy
        ];
        return this.personalizeMessage(this.randomPick(leadTopics), lead);
        
      case 'qualified':
        // 高意向客戶，更直接
        if (lead.scores.urgency > 70) {
          return this.personalizeMessage(
            this.randomPick(TOPIC_LIBRARY.business.closing),
            lead
          );
        }
        return this.personalizeMessage(
          this.randomPick(TOPIC_LIBRARY.business.followUp),
          lead
        );
        
      case 'customer':
        return this.personalizeMessage(
          this.randomPick(TOPIC_LIBRARY.business.promotion),
          lead
        );
        
      default:
        return this.personalizeMessage(
          this.randomPick(TOPIC_LIBRARY.business.introduction),
          lead
        );
    }
  }
  
  /**
   * 生成培育消息（混合型）
   */
  private generateNurtureMessage(lead: Lead, strategy: ConversationStrategy): string {
    // 根據信任度決定業務/情感比例
    if (lead.scores.trust < 40) {
      // 信任度低，主要情感維護
      return this.generateCasualMessage(lead);
    } else if (lead.scores.intent > 60) {
      // 購買意向高，可以更多業務
      return this.generateBusinessMessage(lead, strategy);
    } else {
      // 平衡策略：先情感開場，後業務過渡
      const casual = this.generateCasualMessage(lead);
      const transition = this.randomPick(TOPIC_LIBRARY.business.introduction);
      return `${casual}\n\n${transition}`;
    }
  }
  
  /**
   * 生成通用消息
   */
  private generateGenericMessage(lead: Lead): string {
    return this.personalizeMessage(
      this.randomPick(TOPIC_LIBRARY.casual.general),
      lead
    );
  }
  
  /**
   * 生成購買信號響應
   */
  private generatePurchaseResponse(lead: Lead, signal: PurchaseSignal): string {
    const responses = TOPIC_LIBRARY.purchaseResponse[signal.type];
    let response = this.randomPick(responses);
    
    // 替換變量
    response = response
      .replace('{{features}}', '這裡是功能介紹...')
      .replace('{{options}}', '我們有基礎版、專業版、企業版...')
      .replace('{{pricing}}', '具體價格如下...')
      .replace('{{benefits}}', '主要優勢是...')
      .replace('{{explanation}}', '簡單來說就是...');
    
    return this.personalizeMessage(response, lead);
  }
  
  /**
   * 獲取情感維護話題
   */
  private getCasualTopics(lead: Lead): string[] {
    const topics: string[] = ['問候', '近況'];
    
    // 添加用戶興趣話題
    for (const interest of lead.profile.interests) {
      topics.push(interest);
    }
    
    return topics;
  }
  
  /**
   * 個性化消息
   */
  private personalizeMessage(message: string, lead: Lead): string {
    const settings = this._settings();
    
    // 替換稱呼
    const name = lead.firstName || lead.displayName.split(' ')[0] || lead.username || '';
    message = message.replace(/{{name}}/g, name);
    
    // 根據設置調整表情符號
    if (!settings.conversationStyle.useEmoji) {
      message = message.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
    }
    
    return message.trim();
  }
  
  // ============ 人工介入判斷 ============
  
  /**
   * 檢查是否需要人工審核
   */
  private checkNeedsHumanReview(
    lead: Lead,
    context?: GenerateContentRequest['context']
  ): boolean {
    const triggers = this._settings().humanInterventionTriggers;
    
    // 強購買意向
    if (triggers.purchaseIntent && context?.purchaseSignal?.type === 'strong') {
      return true;
    }
    
    // 高意向客戶的所有業務對話
    if (lead.stage === 'qualified' && lead.scores.intent > 80) {
      return true;
    }
    
    // 連續對話輪次過多
    const conversations = this.leadService.getConversations(lead.id);
    const currentConversation = conversations.find(c => !c.endedAt);
    if (currentConversation && 
        currentConversation.messages.length >= triggers.maxConversationRounds * 2) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 獲取審核原因
   */
  private getReviewReason(
    lead: Lead,
    context?: GenerateContentRequest['context']
  ): string {
    if (context?.purchaseSignal?.type === 'strong') {
      return '檢測到強購買意向，建議人工跟進';
    }
    
    if (lead.stage === 'qualified') {
      return '高意向客戶，建議人工確認內容';
    }
    
    return '對話輪次較多，建議人工介入';
  }
  
  /**
   * 獲取建議操作
   */
  private getSuggestedActions(
    lead: Lead,
    strategy: ConversationStrategy
  ): GenerateContentResponse['suggestedActions'] {
    const actions: GenerateContentResponse['suggestedActions'] = [];
    
    if (strategy.type === 'business' && lead.stage === 'qualified') {
      actions.push({ action: 'send_pricing', label: '發送報價' });
      actions.push({ action: 'schedule_call', label: '預約通話' });
    }
    
    if (lead.scores.intent > 70) {
      actions.push({ action: 'human_takeover', label: '人工接管' });
    }
    
    actions.push({ action: 'regenerate', label: '重新生成' });
    actions.push({ action: 'edit', label: '編輯內容' });
    
    return actions;
  }
  
  /**
   * 計算信心度
   */
  private calculateConfidence(lead: Lead, strategy: ConversationStrategy): number {
    let confidence = 0.7; // 基礎信心
    
    // 有用戶畫像數據，增加信心
    if (lead.profile.interests.length > 0) {
      confidence += 0.1;
    }
    
    // 有對話歷史，增加信心
    if (lead.stats.totalConversations > 0) {
      confidence += 0.1;
    }
    
    // 回覆率高，增加信心
    if (lead.stats.responseRate > 0.5) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }
  
  // ============ 設置管理 ============
  
  /**
   * 更新設置
   */
  updateSettings(updates: Partial<NurturingSettings>): void {
    this._settings.update(s => ({ ...s, ...updates }));
    this.saveSettings();
  }
  
  /**
   * 獲取設置
   */
  getSettings(): NurturingSettings {
    return this._settings();
  }
  
  /**
   * 重置設置
   */
  resetSettings(): void {
    this._settings.set(DEFAULT_NURTURING_SETTINGS);
    this.saveSettings();
  }
  
  // ============ 培育控制 ============
  
  /**
   * 開始培育客戶
   */
  startNurturing(leadId: string): void {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return;
    
    this.leadService.updateLead(leadId, {
      isNurturing: true,
      nurturingConfig: {
        ...lead.nurturingConfig,
        enabled: true,
        currentFollowUpCount: 0
      }
    });
    
    this._activeNurturing.update(set => {
      const newSet = new Set(set);
      newSet.add(leadId);
      return newSet;
    });
    
    // 創建首個跟進計劃
    const nextFollowUp = this.scheduler.calculatePriorityScore(lead);
    this.leadService.createFollowUp(
      leadId,
      nextFollowUp.recommendedType,
      nextFollowUp.recommendedTime,
      {
        suggestedTopics: this.getCasualTopics(lead)
      }
    );
    
    console.log(`[NurturingEngine] Started nurturing for ${lead.displayName}`);
  }
  
  /**
   * 停止培育客戶
   */
  stopNurturing(leadId: string): void {
    this.leadService.updateLead(leadId, {
      isNurturing: false
    });
    
    this._activeNurturing.update(set => {
      const newSet = new Set(set);
      newSet.delete(leadId);
      return newSet;
    });
    
    console.log(`[NurturingEngine] Stopped nurturing for ${leadId}`);
  }
  
  /**
   * 暫停培育客戶
   */
  pauseNurturing(leadId: string, days: number = 7): void {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return;
    
    // 暫停但不完全停止，設置下次跟進時間為N天後
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    
    this.leadService.updateLead(leadId, {
      nurturingConfig: {
        ...lead.nurturingConfig,
        enabled: false
      }
    });
    
    console.log(`[NurturingEngine] Paused nurturing for ${leadId} for ${days} days`);
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 隨機選擇
   */
  private randomPick<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * 保存到歷史
   */
  private saveToHistory(leadId: string, response: GenerateContentResponse): void {
    this._generationHistory.update(map => {
      const newMap = new Map(map);
      const history = newMap.get(leadId) || [];
      history.push(response);
      // 只保留最近20條
      newMap.set(leadId, history.slice(-20));
      return newMap;
    });
  }
  
  /**
   * 獲取生成歷史
   */
  getGenerationHistory(leadId: string): GenerateContentResponse[] {
    return this._generationHistory().get(leadId) || [];
  }
  
  // ============ 持久化 ============
  
  private saveSettings(): void {
    localStorage.setItem('tgai-nurturing-settings', JSON.stringify(this._settings()));
  }
  
  private loadSettings(): void {
    try {
      const data = localStorage.getItem('tgai-nurturing-settings');
      if (data) {
        const settings = JSON.parse(data);
        this._settings.set({ ...DEFAULT_NURTURING_SETTINGS, ...settings });
      }
    } catch (e) {
      console.error('[NurturingEngine] Failed to load settings:', e);
    }
  }
}
