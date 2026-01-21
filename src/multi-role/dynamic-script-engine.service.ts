/**
 * AI 動態劇本引擎服務
 * Dynamic Script Engine Service
 * 
 * 核心功能：
 * 1. 一句話意圖理解
 * 2. 實時對話分析（每N條消息）
 * 3. 動態策略生成和調整
 * 4. 多角色自然配合調度
 * 5. 話題生成（新聞/生活/產品）
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MultiRoleService } from './multi-role.service';

// ============ 類型定義 ============

// 用戶意圖類型
export type IntentType = 
  | 'sales_conversion'      // 銷售轉化
  | 'churn_recovery'        // 流失挽回
  | 'community_activation'  // 社群活躍
  | 'customer_support'      // 售後服務
  | 'brand_promotion'       // 品牌推廣
  | 'lead_nurturing'        // 潛客培育
  | 'custom';               // 自定義

// 意圖解析結果
export interface IntentAnalysis {
  type: IntentType;
  confidence: number;           // 置信度 0-100
  goal: string;                 // 理解後的目標描述
  targetAudience: string;       // 目標群體
  productType?: string;         // 產品類型
  urgency: 'high' | 'medium' | 'low';  // 緊迫程度
  suggestedDuration: string;    // 建議週期
}

// 推薦的角色配置
export interface RecommendedRole {
  id: string;
  name: string;
  icon: string;
  type: string;
  purpose: string;              // 角色目的
  personality: string;          // 性格特點
  speakingStyle: string;        // 說話風格
  entryTiming: string;          // 出場時機
  sampleMessages: string[];     // 示例消息
  accountId?: number;           // 綁定的帳號 ID
}

// 動態策略
export interface DynamicStrategy {
  id: string;
  name: string;
  description: string;
  phases: StrategyPhase[];
  adjustmentRules: AdjustmentRule[];
  constraints: StrategyConstraints;
}

// 策略階段
export interface StrategyPhase {
  id: string;
  name: string;
  duration: string;             // 如 "1-2天"
  goal: string;
  tactics: string[];
  rolesFocus: string[];         // 主要活躍的角色
  successIndicators: string[];  // 成功指標
}

// 調整規則
export interface AdjustmentRule {
  trigger: string;              // 觸發條件描述
  condition: {
    type: 'sentiment' | 'engagement' | 'keyword' | 'silence' | 'interest';
    threshold?: number;
    keywords?: string[];
  };
  action: string;               // 執行動作
  newStrategy?: Partial<DynamicStrategy>;
}

// 策略約束
export interface StrategyConstraints {
  maxDailyMessages: number;
  maxConsecutiveFromSameRole: number;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  activeHours: { start: number; end: number };  // 活躍時間
  toneGuidelines: string[];
  forbiddenTopics: string[];
}

// 實時分析結果
export interface RealtimeAnalysis {
  timestamp: string;
  messageCount: number;         // 分析的消息數量
  
  // 用戶畫像
  userProfile: {
    engagementLevel: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    interests: string[];
    objections: string[];
    readinessScore: number;     // 購買準備度 0-100
  };
  
  // 對話質量
  conversationQuality: {
    responseRate: number;
    avgResponseTime: number;
    topicEngagement: Record<string, number>;
  };
  
  // AI 建議
  suggestions: {
    nextAction: 'continue' | 'escalate' | 'pause' | 'close';
    recommendedRole: string;
    topicSuggestion: string;
    toneAdjustment: string;
    reasoning: string;
  };
}

// 執行狀態
export interface ExecutionState {
  id: string;
  status: 'idle' | 'planning' | 'running' | 'paused' | 'completed';
  goal: string;
  intent: IntentAnalysis | null;
  strategy: DynamicStrategy | null;
  roles: RecommendedRole[];
  
  // 執行統計
  stats: {
    startTime: string;
    messagesSent: number;
    responsesReceived: number;
    currentPhase: number;
    interestScore: number;
    lastAnalysis?: RealtimeAnalysis | null;
  };
  
  // 消息歷史（用於分析）
  messageHistory?: {
    role: string;
    content: string;
    timestamp: string;
    isFromCustomer: boolean;
  }[];
  
  // 目標用戶列表（包含意向評分）
  targetUsers?: {
    id: number | string;
    username?: string;
    firstName?: string;
    lastName?: string;
    intentScore: number;
    lastContact?: string;
    source?: string;
  }[];
  
  // 來自 AI 營銷助手的策略數據
  marketingData?: {
    industry: string;
    targetAudience: string;
    keywords: { highIntent: string[]; mediumIntent: string[]; extended: string[] };
    customerProfile: { identity: string[]; features: string[]; needs: string[] };
    recommendedGroups: string[];
    messageTemplates: { firstTouch: string; followUp: string; closing: string };
  };
}

// 話題類型
export interface TopicSuggestion {
  type: 'news' | 'weather' | 'life' | 'holiday' | 'product' | 'casual';
  content: string;
  context: string;
  suitableRoles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DynamicScriptEngineService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private multiRoleService = inject(MultiRoleService);
  
  // ============ 狀態 ============
  
  // 當前執行狀態
  private _currentExecution = signal<ExecutionState | null>(null);
  currentExecution = computed(() => this._currentExecution());
  
  // 所有執行歷史
  private _executions = signal<ExecutionState[]>([]);
  executions = computed(() => this._executions());
  
  // 是否正在處理
  private _isProcessing = signal(false);
  isProcessing = computed(() => this._isProcessing());
  
  // 分析間隔（每N條消息分析一次）
  private analysisInterval = 10;
  
  // ============ 意圖預設庫 ============
  
  private intentTemplates: Record<IntentType, {
    keywords: string[];
    description: string;
    defaultRoles: RecommendedRole[];
    defaultPhases: StrategyPhase[];
  }> = {
    sales_conversion: {
      keywords: ['成交', '購買', '下單', '付費', '轉化', '買', '訂單', '付款'],
      description: '促進潛在客戶完成購買',
      defaultRoles: [
        {
          id: 'friendly_member',
          name: '熱心群友',
          icon: '😄',
          type: 'atmosphere',
          purpose: '活躍氣氛，自然引入話題',
          personality: '熱情開朗，愛分享，好奇心強',
          speakingStyle: '口語化，帶表情符號，像朋友聊天',
          entryTiming: '開場和氣氛冷場時',
          sampleMessages: [
            '大家早安！今天天氣真好～',
            '哈哈這個有意思，我也遇到過',
            '對了，最近有人用過XX嗎？想聽聽意見'
          ]
        },
        {
          id: 'loyal_customer',
          name: '老用戶',
          icon: '❤️',
          type: 'endorsement',
          purpose: '分享真實使用體驗，建立信任',
          personality: '真誠可靠，樂於助人',
          speakingStyle: '平實自然，分享個人經歷',
          entryTiming: '話題轉到產品相關時',
          sampleMessages: [
            '我用了大概三個月吧，感覺還不錯',
            '一開始也是朋友推薦的，沒想到真的好用',
            '說實話剛開始也有點猶豫，後來覺得值得'
          ]
        },
        {
          id: 'sales_expert',
          name: '顧問專家',
          icon: '💼',
          type: 'professional',
          purpose: '專業解答，促成成交',
          personality: '專業可靠，耐心細緻',
          speakingStyle: '專業但不生硬，有親和力',
          entryTiming: '客戶表現出明確興趣時',
          sampleMessages: [
            '這個問題問得好，我來詳細說明一下',
            '根據您的需求，我建議...',
            '現在正好有活動，可以了解一下'
          ]
        }
      ],
      defaultPhases: [
        {
          id: 'phase_1',
          name: '氛圍營造',
          duration: '1-2天',
          goal: '建立存在感，活躍群氣氛',
          tactics: ['日常問候', '分享趣事', '參與討論'],
          rolesFocus: ['friendly_member'],
          successIndicators: ['群活躍度提升', '有人回覆互動']
        },
        {
          id: 'phase_2',
          name: '話題引入',
          duration: '1-2天',
          goal: '自然引入產品相關話題',
          tactics: ['場景分享', '痛點討論', '經驗交流'],
          rolesFocus: ['friendly_member', 'loyal_customer'],
          successIndicators: ['目標客戶參與討論', '提及產品相關需求']
        },
        {
          id: 'phase_3',
          name: '價值展示',
          duration: '1-2天',
          goal: '展示產品價值，建立信任',
          tactics: ['使用體驗分享', '效果見證', '專業解答'],
          rolesFocus: ['loyal_customer', 'sales_expert'],
          successIndicators: ['客戶詢問詳情', '興趣度上升']
        },
        {
          id: 'phase_4',
          name: '促成成交',
          duration: '靈活',
          goal: '把握時機，促成購買',
          tactics: ['優惠告知', '限時刺激', '異議處理'],
          rolesFocus: ['sales_expert'],
          successIndicators: ['客戶詢價', '達成購買']
        }
      ]
    },
    churn_recovery: {
      keywords: ['流失', '挽回', '回來', '再次', '重新', '老客戶', '續費'],
      description: '挽回流失或沉默的老客戶',
      defaultRoles: [
        {
          id: 'callback_agent',
          name: '回訪專員',
          icon: '📞',
          type: 'care',
          purpose: '真誠關懷，了解離開原因',
          personality: '溫暖真誠，善於傾聽',
          speakingStyle: '親切關懷，不急躁',
          entryTiming: '開場',
          sampleMessages: [
            '好久沒聯繫了，最近怎麼樣？',
            '想起您了，特意來問候一下',
            '之前用著還順利嗎？有什麼可以幫忙的？'
          ]
        },
        {
          id: 'customer_success',
          name: '客戶成功',
          icon: '🎯',
          type: 'solution',
          purpose: '解決問題，展示改進',
          personality: '專業負責，積極主動',
          speakingStyle: '問題導向，提供方案',
          entryTiming: '客戶說出離開原因後',
          sampleMessages: [
            '感謝您的反饋，這個問題我們已經優化了',
            '針對這個情況，我們現在有新的解決方案',
            '來，我幫您看看現在怎麼處理最好'
          ]
        },
        {
          id: 'vip_manager',
          name: 'VIP經理',
          icon: '👑',
          type: 'retention',
          purpose: '高層出面，誠意挽留',
          personality: '有權威但親和，誠意十足',
          speakingStyle: '正式但不生硬，展現誠意',
          entryTiming: '需要特別優惠或決策時',
          sampleMessages: [
            '我是VIP經理，特意來跟您聊聊',
            '您是我們的重要客戶，這個優惠是專門為您申請的',
            '有什麼顧慮都可以說，我們一定盡力解決'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '關懷回訪', duration: '1天', goal: '真誠問候，了解近況', tactics: ['問候', '關心', '傾聽'], rolesFocus: ['callback_agent'], successIndicators: ['客戶回覆', '說出離開原因'] },
        { id: 'phase_2', name: '問題解決', duration: '1-2天', goal: '針對問題提供方案', tactics: ['問題確認', '方案提供', '改進說明'], rolesFocus: ['customer_success'], successIndicators: ['客戶認可改進', '願意再試'] },
        { id: 'phase_3', name: '誠意挽留', duration: '靈活', goal: '提供優惠，促成回歸', tactics: ['專屬優惠', 'VIP待遇', '承諾保障'], rolesFocus: ['vip_manager'], successIndicators: ['客戶同意回歸', '續費成功'] }
      ]
    },
    community_activation: {
      keywords: ['活躍', '社群', '氣氛', '互動', '討論', '冷清', '帶動'],
      description: '提升社群活躍度和用戶粘性',
      defaultRoles: [
        {
          id: 'community_host',
          name: '社群管家',
          icon: '🏠',
          type: 'host',
          purpose: '發起話題，維護秩序',
          personality: '熱情負責，有組織能力',
          speakingStyle: '親切有序，引導討論',
          entryTiming: '開場和話題轉換時',
          sampleMessages: [
            '早安各位！新的一天開始了～',
            '今天來聊聊XXX，大家怎麼看？',
            '感謝分享！還有其他想法嗎？'
          ]
        },
        {
          id: 'active_member_1',
          name: '活躍群友A',
          icon: '🤗',
          type: 'participant',
          purpose: '積極互動，帶動氣氛',
          personality: '外向活潑，愛分享',
          speakingStyle: '輕鬆隨意，多用表情',
          entryTiming: '話題發起後積極響應',
          sampleMessages: [
            '這個話題我有話說！',
            '哈哈確實是這樣',
            '我也有類似的經歷～'
          ]
        },
        {
          id: 'active_member_2',
          name: '活躍群友B',
          icon: '😎',
          type: 'participant',
          purpose: '補充觀點，延續討論',
          personality: '幽默風趣，見解獨到',
          speakingStyle: '有趣有料，偶爾抖機靈',
          entryTiming: '討論進行中補充',
          sampleMessages: [
            '樓上說得對，我補充一點',
            '換個角度想想...',
            '這讓我想起一個有意思的事'
          ]
        },
        {
          id: 'opinion_leader',
          name: '意見領袖',
          icon: '🎤',
          type: 'expert',
          purpose: '輸出價值，總結觀點',
          personality: '專業權威，有深度',
          speakingStyle: '有見地，能總結提升',
          entryTiming: '討論需要總結或升華時',
          sampleMessages: [
            '看了大家的討論，我來總結一下',
            '這個問題的關鍵在於...',
            '分享一個我的思考框架'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '話題發起', duration: '持續', goal: '發起有價值的討論話題', tactics: ['熱點話題', '經驗分享', '問題討論'], rolesFocus: ['community_host'], successIndicators: ['有人參與討論'] },
        { id: 'phase_2', name: '互動響應', duration: '持續', goal: '帶動討論氛圍', tactics: ['積極回覆', '補充觀點', '表達認同'], rolesFocus: ['active_member_1', 'active_member_2'], successIndicators: ['多人參與', '討論深入'] },
        { id: 'phase_3', name: '價值輸出', duration: '適時', goal: '總結討論價值', tactics: ['觀點總結', '經驗提煉', '知識分享'], rolesFocus: ['opinion_leader'], successIndicators: ['獲得認可', '被收藏轉發'] }
      ]
    },
    customer_support: {
      keywords: ['售後', '問題', '投訴', '故障', '不滿', '解決', '處理', '退'],
      description: '高效處理客戶售後問題',
      defaultRoles: [
        {
          id: 'cs_agent',
          name: '客服專員',
          icon: '🎧',
          type: 'frontline',
          purpose: '快速響應，記錄問題',
          personality: '耐心細緻，態度好',
          speakingStyle: '禮貌專業，表達歉意',
          entryTiming: '問題出現時立即響應',
          sampleMessages: [
            '您好，非常抱歉給您帶來不便！',
            '請問具體是什麼問題呢？我來幫您處理',
            '我已經記錄下來了，馬上為您跟進'
          ]
        },
        {
          id: 'tech_support',
          name: '技術支持',
          icon: '🔧',
          type: 'technical',
          purpose: '技術排查，解決問題',
          personality: '專業嚴謹，邏輯清晰',
          speakingStyle: '技術專業但易懂',
          entryTiming: '需要技術解答時',
          sampleMessages: [
            '根據您描述的情況，請您嘗試以下步驟',
            '這個問題我來看一下，稍等',
            '找到原因了，是因為XXX，解決方案是...'
          ]
        },
        {
          id: 'satisfaction_manager',
          name: '滿意度經理',
          icon: '😊',
          type: 'recovery',
          purpose: '確認滿意，補償挽回',
          personality: '溫暖真誠，有誠意',
          speakingStyle: '真誠道歉，積極補償',
          entryTiming: '問題解決後',
          sampleMessages: [
            '問題解決了嗎？給您造成不便真的很抱歉',
            '為表歉意，我們為您申請了一份小禮物',
            '以後有任何問題都可以隨時找我'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '快速響應', duration: '立即', goal: '第一時間響應，安撫情緒', tactics: ['表達歉意', '確認問題', '表示重視'], rolesFocus: ['cs_agent'], successIndicators: ['客戶情緒緩和'] },
        { id: 'phase_2', name: '問題解決', duration: '盡快', goal: '排查並解決問題', tactics: ['技術排查', '提供方案', '確認解決'], rolesFocus: ['tech_support'], successIndicators: ['問題解決'] },
        { id: 'phase_3', name: '滿意確認', duration: '問題解決後', goal: '確認滿意，適當補償', tactics: ['確認滿意', '補償挽回', '建立好感'], rolesFocus: ['satisfaction_manager'], successIndicators: ['客戶滿意', '好評反饋'] }
      ]
    },
    brand_promotion: {
      keywords: ['推廣', '品牌', '宣傳', '知名度', '曝光', '傳播'],
      description: '提升品牌知名度和好感度',
      defaultRoles: [
        {
          id: 'brand_ambassador',
          name: '品牌大使',
          icon: '🏆',
          type: 'promotion',
          purpose: '傳播品牌價值',
          personality: '專業自信，有感染力',
          speakingStyle: '積極正面，有號召力',
          entryTiming: '品牌相關話題',
          sampleMessages: ['這個品牌我一直關注，理念很好', '他們家的品質確實沒話說']
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '品牌曝光', duration: '持續', goal: '自然傳播品牌', tactics: ['價值分享', '故事講述'], rolesFocus: ['brand_ambassador'], successIndicators: ['被討論', '好評'] }
      ]
    },
    lead_nurturing: {
      keywords: ['培育', '潛客', '跟進', '預熱', '教育'],
      description: '培育潛在客戶，提升購買意願',
      defaultRoles: [
        {
          id: 'content_sharer',
          name: '內容達人',
          icon: '📚',
          type: 'education',
          purpose: '分享有價值內容',
          personality: '知識豐富，樂於分享',
          speakingStyle: '有料有趣，不說教',
          entryTiming: '持續',
          sampleMessages: ['分享一個很有用的方法', '這篇文章寫得太好了']
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '價值輸出', duration: '持續', goal: '通過內容建立信任', tactics: ['知識分享', '案例分析'], rolesFocus: ['content_sharer'], successIndicators: ['被關注', '主動詢問'] }
      ]
    },
    custom: {
      keywords: [],
      description: '自定義目標',
      defaultRoles: [],
      defaultPhases: []
    }
  };
  
  // ============ 核心方法 ============
  
  /**
   * 一句話啟動：解析用戶意圖並生成執行計劃
   */
  async startFromOnePhrase(userInput: string): Promise<ExecutionState | null> {
    if (!userInput.trim()) {
      this.toast.error('請輸入您的目標');
      return null;
    }
    
    this._isProcessing.set(true);
    
    try {
      // 1. 解析意圖
      const intent = await this.analyzeIntent(userInput);
      
      // 2. 生成策略
      const strategy = this.generateStrategy(intent);
      
      // 3. 推薦角色
      const roles = this.recommendRoles(intent);
      
      // 4. 創建執行狀態
      const execution: ExecutionState = {
        id: `exec_${Date.now()}`,
        status: 'planning',
        goal: userInput,
        intent,
        strategy,
        roles,
        stats: {
          startTime: new Date().toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0,
          lastAnalysis: null
        },
        messageHistory: []
      };
      
      this._currentExecution.set(execution);
      this._executions.update(list => [execution, ...list]);
      
      this.toast.success('AI 已理解您的目標，正在策劃最佳方案...');
      
      return execution;
      
    } catch (error) {
      this.toast.error('策劃失敗，請重試');
      console.error('[DynamicEngine] Start failed:', error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 使用 AI 營銷助手策略啟動（完整策略數據）
   */
  async startWithMarketingStrategy(
    userGoal: string,
    marketingStrategy: {
      industry: string;
      targetAudience: string;
      keywords: { highIntent: string[]; mediumIntent: string[]; extended: string[] };
      customerProfile: { identity: string[]; features: string[]; needs: string[] };
      recommendedGroups: string[];
      messageTemplates: { firstTouch: string; followUp: string; closing: string };
    }
  ): Promise<ExecutionState | null> {
    this._isProcessing.set(true);
    
    try {
      console.log('[DynamicEngine] 接收 AI 營銷策略:', marketingStrategy);
      
      // 1. 構建增強版意圖分析
      const intent: IntentAnalysis = {
        type: 'sales_conversion',
        confidence: 90,  // 來自 AI 營銷助手，置信度高
        goal: `在${marketingStrategy.industry}行業，促進${marketingStrategy.targetAudience}成交`,
        targetAudience: marketingStrategy.targetAudience,
        productType: marketingStrategy.industry,
        urgency: 'medium',
        suggestedDuration: '3-5天'
      };
      
      // 2. 使用策略中的關鍵詞和消息模板生成增強策略
      const strategy = this.generateEnhancedStrategy(intent, marketingStrategy);
      
      // 3. 推薦角色（可能根據行業調整）
      const roles = this.recommendRoles(intent);
      
      // 4. 創建執行狀態
      const execution: ExecutionState = {
        id: `exec_${Date.now()}`,
        status: 'planning',
        goal: userGoal,
        intent,
        strategy,
        roles,
        stats: {
          startTime: new Date().toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0
        },
        // 保存原始營銷策略用於執行
        marketingData: marketingStrategy
      };
      
      this._currentExecution.set(execution);
      this._executions.update(list => [execution, ...list]);
      
      this.toast.success('🤖 AI 已整合營銷策略，準備執行最優方案！');
      
      return execution;
      
    } catch (error) {
      this.toast.error('策略整合失敗，請重試');
      console.error('[DynamicEngine] Marketing strategy start failed:', error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 生成增強版策略（使用 AI 營銷助手數據）
   */
  private generateEnhancedStrategy(
    intent: IntentAnalysis,
    marketingData: any
  ): DynamicStrategy {
    const baseStrategy = this.generateStrategy(intent);
    
    // 使用營銷數據增強策略
    return {
      ...baseStrategy,
      name: `${marketingData.industry} - AI 營銷策略`,
      description: `針對「${marketingData.targetAudience}」的智能營銷策略，使用關鍵詞：${marketingData.keywords.highIntent.slice(0, 3).join('、')}`,
      // 將消息模板注入到策略中
      messageTemplates: marketingData.messageTemplates,
      keywords: marketingData.keywords
    } as DynamicStrategy;
  }
  
  /**
   * 解析用戶意圖
   */
  private async analyzeIntent(userInput: string): Promise<IntentAnalysis> {
    const input = userInput.toLowerCase();
    
    // 關鍵詞匹配確定意圖類型
    let matchedType: IntentType = 'custom';
    let maxScore = 0;
    
    for (const [type, template] of Object.entries(this.intentTemplates)) {
      const score = template.keywords.filter(kw => input.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        matchedType = type as IntentType;
      }
    }
    
    // 構建意圖分析結果
    const template = this.intentTemplates[matchedType];
    
    return {
      type: matchedType,
      confidence: Math.min(95, 50 + maxScore * 15),
      goal: matchedType === 'custom' ? userInput : template.description,
      targetAudience: this.extractTargetAudience(input),
      productType: this.extractProductType(input),
      urgency: this.determineUrgency(input),
      suggestedDuration: this.suggestDuration(matchedType)
    };
  }
  
  /**
   * 生成動態策略
   */
  private generateStrategy(intent: IntentAnalysis): DynamicStrategy {
    const template = this.intentTemplates[intent.type];
    
    return {
      id: `strategy_${Date.now()}`,
      name: `${intent.goal} - 動態策略`,
      description: `AI 根據「${intent.goal}」自動生成的動態執行策略`,
      phases: template.defaultPhases,
      adjustmentRules: this.generateAdjustmentRules(intent),
      constraints: {
        maxDailyMessages: 50,
        maxConsecutiveFromSameRole: 3,
        minIntervalSeconds: 60,
        maxIntervalSeconds: 300,
        activeHours: { start: 9, end: 22 },
        toneGuidelines: ['友好自然', '不過度推銷', '像朋友聊天'],
        forbiddenTopics: ['政治', '敏感話題']
      }
    };
  }
  
  /**
   * 推薦角色
   */
  private recommendRoles(intent: IntentAnalysis): RecommendedRole[] {
    const template = this.intentTemplates[intent.type];
    return template.defaultRoles;
  }
  
  /**
   * 生成調整規則
   */
  private generateAdjustmentRules(intent: IntentAnalysis): AdjustmentRule[] {
    return [
      {
        trigger: '客戶情緒負面',
        condition: { type: 'sentiment', threshold: 30 },
        action: '暫停推銷，切換到關懷模式'
      },
      {
        trigger: '客戶詢問價格',
        condition: { type: 'keyword', keywords: ['多少錢', '價格', '費用', '貴不貴'] },
        action: '這是成交信號！引入銷售專家'
      },
      {
        trigger: '客戶提到競品',
        condition: { type: 'keyword', keywords: ['其他', '別家', '競品', '對比'] },
        action: '引入對比分析，突出優勢'
      },
      {
        trigger: '對話沉默',
        condition: { type: 'silence', threshold: 3600 },
        action: '發起新話題或換角色活躍'
      },
      {
        trigger: '興趣度上升',
        condition: { type: 'interest', threshold: 70 },
        action: '可以開始價值展示和促單'
      }
    ];
  }
  
  /**
   * 實時分析對話（每N條消息調用一次）
   */
  async analyzeConversation(messages: { role: string; content: string; isFromCustomer: boolean }[]): Promise<RealtimeAnalysis> {
    // 統計基礎數據
    const customerMessages = messages.filter(m => m.isFromCustomer);
    const responseRate = messages.length > 0 ? customerMessages.length / messages.length * 100 : 0;
    
    // 情感分析（簡化版，實際應調用AI）
    const sentiment = this.analyzeSentiment(customerMessages);
    
    // 興趣點提取
    const interests = this.extractInterests(customerMessages);
    
    // 計算準備度
    const readinessScore = this.calculateReadiness(customerMessages, sentiment);
    
    // 生成建議
    const suggestions = this.generateSuggestions(sentiment, readinessScore, interests);
    
    return {
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      userProfile: {
        engagementLevel: responseRate > 50 ? 'high' : responseRate > 20 ? 'medium' : 'low',
        sentiment,
        interests,
        objections: this.extractObjections(customerMessages),
        readinessScore
      },
      conversationQuality: {
        responseRate,
        avgResponseTime: 0, // 需要時間戳計算
        topicEngagement: {}
      },
      suggestions
    };
  }
  
  /**
   * 生成下一條消息（動態編劇）
   */
  async generateNextMessage(execution: ExecutionState): Promise<{
    role: RecommendedRole;
    content: string;
    type: 'casual' | 'value' | 'close' | 'objection_handling';
  } | null> {
    if (!execution.strategy || execution.roles.length === 0) return null;
    
    const lastAnalysis = execution.stats.lastAnalysis;
    const currentPhase = execution.strategy.phases[execution.stats.currentPhase];
    
    // 選擇合適的角色
    const suitableRoles = currentPhase?.rolesFocus || [];
    const role = execution.roles.find(r => suitableRoles.includes(r.id)) || execution.roles[0];
    
    // 根據分析結果決定消息類型
    let messageType: 'casual' | 'value' | 'close' | 'objection_handling' = 'casual';
    if (lastAnalysis) {
      if (lastAnalysis.userProfile.readinessScore > 70) {
        messageType = 'close';
      } else if (lastAnalysis.userProfile.objections.length > 0) {
        messageType = 'objection_handling';
      } else if (lastAnalysis.userProfile.engagementLevel === 'high') {
        messageType = 'value';
      }
    }
    
    // 生成消息內容（使用示例消息，實際應調用AI）
    const content = role.sampleMessages[Math.floor(Math.random() * role.sampleMessages.length)];
    
    return { role, content, type: messageType };
  }
  
  /**
   * 生成話題建議
   */
  generateTopicSuggestions(): TopicSuggestion[] {
    const now = new Date();
    const hour = now.getHours();
    
    const suggestions: TopicSuggestion[] = [];
    
    // 根據時間生成話題
    if (hour >= 6 && hour < 10) {
      suggestions.push({
        type: 'casual',
        content: '早安問候，聊聊今天的計劃',
        context: '早晨適合輕鬆問候',
        suitableRoles: ['friendly_member', 'community_host']
      });
    } else if (hour >= 11 && hour < 13) {
      suggestions.push({
        type: 'life',
        content: '午餐話題，聊聊美食',
        context: '午餐時間話題',
        suitableRoles: ['active_member_1', 'active_member_2']
      });
    } else if (hour >= 18 && hour < 20) {
      suggestions.push({
        type: 'casual',
        content: '下班話題，聊聊今天的趣事',
        context: '晚間輕鬆聊天',
        suitableRoles: ['friendly_member']
      });
    }
    
    // 添加通用話題
    suggestions.push({
      type: 'news',
      content: '最近的熱點新聞討論',
      context: '可以結合產品場景',
      suitableRoles: ['opinion_leader', 'community_host']
    });
    
    return suggestions;
  }
  
  // ============ 輔助方法 ============
  
  private extractTargetAudience(input: string): string {
    if (input.includes('群')) return '群成員';
    if (input.includes('客戶')) return '潛在客戶';
    if (input.includes('老')) return '老客戶';
    return '目標用戶';
  }
  
  private extractProductType(input: string): string {
    if (input.includes('課程') || input.includes('教育')) return '教育課程';
    if (input.includes('產品')) return '實體產品';
    if (input.includes('服務')) return '服務類';
    return '產品/服務';
  }
  
  private determineUrgency(input: string): 'high' | 'medium' | 'low' {
    if (input.includes('馬上') || input.includes('立即') || input.includes('今天')) return 'high';
    if (input.includes('盡快') || input.includes('這週')) return 'medium';
    return 'low';
  }
  
  private suggestDuration(type: IntentType): string {
    const durations: Record<IntentType, string> = {
      sales_conversion: '3-7天',
      churn_recovery: '1-3天',
      community_activation: '持續進行',
      customer_support: '即時處理',
      brand_promotion: '持續進行',
      lead_nurturing: '2-4週',
      custom: '根據情況調整'
    };
    return durations[type];
  }
  
  private analyzeSentiment(messages: { content: string }[]): 'positive' | 'neutral' | 'negative' {
    const text = messages.map(m => m.content).join(' ');
    const positiveWords = ['好', '棒', '喜歡', '謝謝', '感謝', '讚', '不錯'];
    const negativeWords = ['不好', '差', '失望', '生氣', '投訴', '退', '爛'];
    
    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private extractInterests(messages: { content: string }[]): string[] {
    const interests: string[] = [];
    const text = messages.map(m => m.content).join(' ');
    
    if (text.includes('價格') || text.includes('多少錢')) interests.push('價格敏感');
    if (text.includes('效果') || text.includes('有用嗎')) interests.push('效果關注');
    if (text.includes('怎麼用') || text.includes('使用')) interests.push('使用方法');
    
    return interests;
  }
  
  private extractObjections(messages: { content: string }[]): string[] {
    const objections: string[] = [];
    const text = messages.map(m => m.content).join(' ');
    
    if (text.includes('太貴') || text.includes('貴了')) objections.push('價格顧慮');
    if (text.includes('沒用') || text.includes('不需要')) objections.push('需求不明確');
    if (text.includes('考慮') || text.includes('再說')) objections.push('決策猶豫');
    
    return objections;
  }
  
  private calculateReadiness(messages: { content: string }[], sentiment: string): number {
    let score = 30; // 基礎分
    
    const text = messages.map(m => m.content).join(' ');
    
    // 積極信號加分
    if (text.includes('怎麼買') || text.includes('在哪買')) score += 30;
    if (text.includes('多少錢') || text.includes('價格')) score += 20;
    if (text.includes('有活動嗎') || text.includes('優惠')) score += 15;
    if (sentiment === 'positive') score += 10;
    
    // 消極信號減分
    if (text.includes('不需要') || text.includes('不用了')) score -= 20;
    if (sentiment === 'negative') score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private generateSuggestions(
    sentiment: string, 
    readiness: number, 
    interests: string[]
  ): RealtimeAnalysis['suggestions'] {
    let nextAction: 'continue' | 'escalate' | 'pause' | 'close' = 'continue';
    let recommendedRole = 'friendly_member';
    let topicSuggestion = '繼續輕鬆聊天';
    let toneAdjustment = '保持友好';
    let reasoning = '對話進行正常';
    
    if (readiness > 70) {
      nextAction = 'close';
      recommendedRole = 'sales_expert';
      topicSuggestion = '產品價值和優惠';
      toneAdjustment = '可以更直接';
      reasoning = '客戶準備度高，可以促單';
    } else if (sentiment === 'negative') {
      nextAction = 'pause';
      recommendedRole = 'cs_agent';
      topicSuggestion = '關心和傾聽';
      toneAdjustment = '更加溫和耐心';
      reasoning = '客戶情緒負面，需要關懷';
    } else if (interests.includes('價格敏感')) {
      nextAction = 'escalate';
      recommendedRole = 'sales_expert';
      topicSuggestion = '價值優先，再談價格';
      reasoning = '客戶關注價格，需要強調價值';
    }
    
    return { nextAction, recommendedRole, topicSuggestion, toneAdjustment, reasoning };
  }
  
  // ============ 執行控制 ============
  
  /**
   * 確認並開始執行
   */
  confirmAndStart(executionId: string): boolean {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return false;
    
    execution.status = 'running';
    this._currentExecution.set(execution);
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    this.toast.success('AI 團隊已開始工作！');
    
    // 啟動後端 AI 執行任務
    this.startBackendExecution(execution);
    
    return true;
  }
  
  /**
   * 啟動後端 AI 執行任務
   */
  private startBackendExecution(execution: ExecutionState): void {
    console.log('[DynamicEngine] 啟動後端執行:', execution.id);
    
    // 發送到後端開始 AI 團隊執行
    this.ipc.send('ai-team:start-execution', {
      executionId: execution.id,
      goal: execution.goal,
      intent: execution.intent,
      strategy: execution.strategy,
      roles: execution.roles,
      marketingData: execution.marketingData
    });
    
    // 監聽執行進度更新
    this.setupExecutionListeners(execution.id);
  }
  
  /**
   * 設置執行監聽器
   */
  private setupExecutionListeners(executionId: string): void {
    // 監聽消息發送成功
    this.ipc.on('ai-team:message-sent', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          messagesSent: data.totalSent
        });
      }
    });
    
    // 監聽收到回覆
    this.ipc.on('ai-team:response-received', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          responsesReceived: data.totalResponses,
          interestScore: data.interestScore
        });
      }
    });
    
    // 監聽階段變化
    this.ipc.on('ai-team:phase-changed', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          currentPhase: data.phase
        });
        this.toast.info(`📊 進入階段 ${data.phase + 1}: ${data.phaseName}`);
      }
    });
    
    // 監聽執行完成
    this.ipc.on('ai-team:execution-completed', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStatus(executionId, 'completed');
        this.toast.success(`🎉 任務完成！發送 ${data.totalSent} 條消息，收到 ${data.totalResponses} 個回覆`);
      }
    });
  }
  
  /**
   * 更新執行統計
   */
  private updateExecutionStats(executionId: string, updates: Partial<ExecutionState['stats']>): void {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return;
    
    execution.stats = { ...execution.stats, ...updates };
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
  }
  
  /**
   * 暫停執行
   */
  pauseExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'paused');
  }
  
  /**
   * 恢復執行
   */
  resumeExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'running');
  }
  
  /**
   * 停止執行
   */
  stopExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'completed');
  }
  
  private updateExecutionStatus(executionId: string, status: ExecutionState['status']): boolean {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return false;
    
    execution.status = status;
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
    
    return true;
  }
}
