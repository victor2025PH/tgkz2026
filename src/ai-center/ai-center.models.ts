/**
 * AI 中心數據模型
 * AI Center Data Models
 */

// AI 模型提供商
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'custom';

// AI 模型配置
export interface AIModelConfig {
  id: string;
  provider: AIProvider;
  modelName: string;
  apiKey: string;
  apiEndpoint?: string;
  isConnected: boolean;
  lastTestedAt?: string;
  usageToday: number;
  costToday: number;
}

// 對話風格
export type ConversationStyle = 'professional' | 'friendly' | 'casual' | 'enthusiastic' | 'direct';

// AI 對話策略
export interface ConversationStrategy {
  style: ConversationStyle;
  responseLength: 'short' | 'medium' | 'long';
  useEmoji: boolean;
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  language: string;
  customPromptPrefix?: string;
}

// 知識庫項目
export interface KnowledgeItem {
  id: string;
  category: 'product' | 'faq' | 'sales' | 'objection' | 'custom';
  title: string;
  content: string;
  keywords: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 知識庫
export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  items: KnowledgeItem[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// 意圖類型
export type IntentType = 
  | 'purchase_intent' 
  | 'price_inquiry' 
  | 'product_question' 
  | 'complaint' 
  | 'general_chat'
  | 'negative_sentiment'
  | 'high_value'
  | 'urgent';

// 智能規則
export interface SmartRule {
  id: string;
  name: string;
  description: string;
  triggerIntent: IntentType;
  triggerConditions: {
    intentScore?: number;
    keywordMatch?: string[];
    conversationRounds?: number;
    customCondition?: string;
  };
  actions: {
    notifyHuman: boolean;
    autoReply: boolean;
    replyTemplate?: string;
    addTag?: string;
    changeStage?: string;
    sendOffer?: boolean;
  };
  isActive: boolean;
  priority: number;
}

// AI 中心配置
export interface AICenterConfig {
  // 模型配置
  models: AIModelConfig[];
  defaultModelId: string;
  modelUsage: {
    intentRecognition: string;
    dailyChat: string;
    multiRoleScript: string;
  };
  
  // 對話策略
  conversationStrategy: ConversationStrategy;
  
  // 知識庫
  knowledgeBases: KnowledgeBase[];
  activeKnowledgeBaseId: string;
  
  // 智能規則
  smartRules: SmartRule[];
  
  // 全局設置
  settings: {
    autoLearnFromConversations: boolean;
    maxDailyBudget: number;
    fallbackToHuman: boolean;
    fallbackTimeout: number; // 秒
    debugMode: boolean;
  };
}

// AI 使用統計
export interface AIUsageStats {
  today: {
    conversations: number;
    messages: number;
    intentsRecognized: number;
    conversions: number;
    cost: number;
    avgResponseTime: number;
  };
  weekly: {
    conversations: number;
    messages: number;
    intentsRecognized: number;
    conversions: number;
    cost: number;
    conversionRate: number;
  };
  byModel: {
    modelId: string;
    modelName: string;
    usage: number;
    cost: number;
  }[];
}

// 默認 AI 配置
export const DEFAULT_AI_CONFIG: AICenterConfig = {
  models: [],
  defaultModelId: '',
  modelUsage: {
    intentRecognition: '',
    dailyChat: '',
    multiRoleScript: ''
  },
  conversationStrategy: {
    style: 'friendly',
    responseLength: 'medium',
    useEmoji: true,
    emojiFrequency: 'low',
    language: 'zh-TW'
  },
  knowledgeBases: [],
  activeKnowledgeBaseId: '',
  smartRules: [],
  settings: {
    autoLearnFromConversations: false,
    maxDailyBudget: 50,
    fallbackToHuman: true,
    fallbackTimeout: 300,
    debugMode: false
  }
};
