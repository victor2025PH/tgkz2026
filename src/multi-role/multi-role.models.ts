/**
 * 多角色協作數據模型
 * Multi-Role Collaboration Data Models
 */

// 角色類型
export type RoleType = 
  | 'expert'              // 產品專家
  | 'satisfied_customer'  // 滿意老客戶（托）
  | 'support'             // 客服助理
  | 'manager'             // 經理
  | 'newbie'              // 好奇新人
  | 'hesitant'            // 猶豫者
  | 'custom';             // 自定義

// 說話風格
export type SpeakingStyle = 
  | 'professional'        // 專業正式
  | 'friendly'            // 友好親切
  | 'casual'              // 輕鬆隨意
  | 'enthusiastic'        // 熱情
  | 'careful'             // 謹慎
  | 'curious';            // 好奇

// 角色定義
export interface RoleDefinition {
  id: string;
  name: string;
  type: RoleType;
  
  // 綁定帳號
  boundAccountId?: number;
  boundAccountPhone?: string;
  
  // 人設描述
  personality: {
    description: string;      // 人設描述
    speakingStyle: SpeakingStyle;
    traits: string[];         // 性格特點
    background?: string;      // 背景故事
  };
  
  // AI 配置
  aiConfig: {
    useGlobalAI: boolean;     // 使用全局 AI 配置
    customPrompt?: string;    // 自定義 AI 人設 Prompt
    responseLength: 'short' | 'medium' | 'long';
    emojiFrequency: 'none' | 'low' | 'medium' | 'high';
    typingSpeed: 'fast' | 'medium' | 'slow' | 'random';
  };
  
  // 核心職責
  responsibilities: string[];
  
  // 統計數據
  usageCount?: number;      // 使用次數
  successCount?: number;    // 成功次數
  
  // 狀態
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 劇本階段
export interface ScriptStage {
  id: string;
  name: string;
  order: number;
  
  // 觸發條件
  trigger: {
    type: 'time' | 'message' | 'keyword' | 'manual';
    delaySeconds?: number;      // 時間觸發：延遲秒數
    afterStageId?: string;      // 在某階段後
    keywords?: string[];        // 關鍵詞觸發
    condition?: string;         // 自定義條件
  };
  
  // 階段消息
  messages: ScriptMessage[];
  
  // 成功條件
  successConditions?: {
    customerReplied?: boolean;
    keywordMentioned?: string[];
    minDuration?: number;       // 最短持續秒數
  };
  
  // 失敗處理
  failureAction?: 'skip' | 'retry' | 'pause' | 'notify';
}

// 劇本消息
export interface ScriptMessage {
  id: string;
  roleId: string;             // 發送角色 ID
  
  // 消息內容
  content: {
    type: 'text' | 'ai_generate' | 'template';
    text?: string;            // 固定文本
    templateId?: string;      // 模板 ID
    aiPrompt?: string;        // AI 生成提示
    variables?: string[];     // 可用變量，如 {客戶名}
  };
  
  // 發送時機
  timing: {
    delayAfterPrevious: number;   // 上一條消息後延遲（秒）
    randomDelay?: { min: number; max: number };
  };
  
  // 條件
  condition?: {
    onlyIf?: string;          // 條件表達式
    skipIf?: string;
  };
}

// 劇本模板
export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  
  // 適用場景
  scenario: 'high_intent_conversion' | 'product_introduction' | 'objection_handling' | 'custom';
  
  // 必需角色
  requiredRoles: RoleType[];
  minRoleCount: number;
  
  // 劇本階段
  stages: ScriptStage[];
  
  // 統計
  stats: {
    useCount: number;
    successCount: number;
    avgDuration: number;      // 平均持續時間（分鐘）
    conversionRate: number;
  };
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 協作群組（自動建群的結果）
export interface CollaborationGroup {
  id: string;
  telegramGroupId?: string;
  groupTitle: string;
  
  // 目標客戶
  targetCustomer: {
    id: string;
    username?: string;
    firstName?: string;
    intentScore: number;
    source: string;
  };
  
  // 參與角色
  participants: {
    roleId: string;
    roleName: string;
    accountId: number;
    accountPhone: string;
  }[];
  
  // 使用的劇本
  scriptId: string;
  scriptName: string;
  
  // 狀態
  status: 'creating' | 'inviting' | 'running' | 'paused' | 'completed' | 'failed';
  currentStageId?: string;
  currentStageOrder?: number;
  
  // 統計
  messagesSent: number;
  customerMessages: number;
  
  // 結果
  outcome?: 'converted' | 'no_response' | 'rejected' | 'pending';
  
  createdAt: string;
  completedAt?: string;
}

// 多角色協作配置
export interface MultiRoleConfig {
  // 角色定義
  roles: RoleDefinition[];
  
  // 劇本模板
  scripts: ScriptTemplate[];
  
  // 自動建群設置
  autoGroupSettings: {
    enabled: boolean;
    nameTemplate: string;           // 如 "VIP專屬服務群 - {客戶名}"
    inviteMessageTemplate: string;  // 邀請話術
    maxConcurrentGroups: number;    // 最大同時協作群數
    autoCloseAfterDays: number;     // 自動關閉天數
  };
  
  // 觸發條件（默認）
  defaultTriggerConditions: {
    intentScoreThreshold: number;
    minConversationRounds: number;
    requirePriceInquiry: boolean;
  };
  
  // AI 設置
  aiSettings: {
    useAICenter: boolean;           // 使用 AI 中心配置
    coordinationMode: 'sequential' | 'responsive';  // 順序執行 / 響應式
    maxAIResponseTime: number;      // AI 最大響應時間（秒）
  };
}

// 角色類型元數據
export const ROLE_TYPE_META: Record<RoleType, {
  icon: string;
  label: string;
  description: string;
  defaultStyle: SpeakingStyle;
  defaultPrompt: string;
}> = {
  expert: {
    icon: '👨‍💼',
    label: '產品專家',
    description: '專業的產品顧問，詳細解答問題',
    defaultStyle: 'professional',
    defaultPrompt: '你是一位資深產品專家，有5年行業經驗。你的特點是專業、耐心、善於用案例說明問題。'
  },
  satisfied_customer: {
    icon: '😊',
    label: '滿意老客戶',
    description: '真誠分享使用體驗的老客戶',
    defaultStyle: 'friendly',
    defaultPrompt: '你是一位使用產品半年的滿意客戶。你會真誠分享自己的使用體驗，解答新人疑慮。'
  },
  support: {
    icon: '👩‍💻',
    label: '客服助理',
    description: '熱情的客服，處理訂單售後',
    defaultStyle: 'enthusiastic',
    defaultPrompt: '你是一位熱情的客服助理。你快速響應、解決問題，處理訂單和售後支持。'
  },
  manager: {
    icon: '👔',
    label: '經理',
    description: '有決策權的管理人員',
    defaultStyle: 'professional',
    defaultPrompt: '你是產品經理，有一定決策權。你可以給予特別優惠或做出承諾。'
  },
  newbie: {
    icon: '🙋',
    label: '好奇新人',
    description: '對產品感興趣的新用戶',
    defaultStyle: 'curious',
    defaultPrompt: '你是一個對產品感興趣的新人，會問一些基礎問題，引導專家解答。'
  },
  hesitant: {
    icon: '🤔',
    label: '猶豫者',
    description: '有顧慮但被說服的用戶',
    defaultStyle: 'careful',
    defaultPrompt: '你一開始有顧慮，但被專家和老客戶說服後決定購買，分享你被說服的過程。'
  },
  custom: {
    icon: '🎭',
    label: '自定義角色',
    description: '根據需要自定義的角色',
    defaultStyle: 'friendly',
    defaultPrompt: ''
  }
};

// 默認多角色配置
export const DEFAULT_MULTI_ROLE_CONFIG: MultiRoleConfig = {
  roles: [],
  scripts: [],
  autoGroupSettings: {
    enabled: true,
    nameTemplate: 'VIP專屬服務群 - {客戶名}',
    inviteMessageTemplate: '為了更好地服務您，我們特別建立了VIP群，有專家和老用戶可以解答您的問題！',
    maxConcurrentGroups: 5,
    autoCloseAfterDays: 7
  },
  defaultTriggerConditions: {
    intentScoreThreshold: 70,
    minConversationRounds: 3,
    requirePriceInquiry: false
  },
  aiSettings: {
    useAICenter: true,
    coordinationMode: 'sequential',
    maxAIResponseTime: 30
  }
};
