/**
 * 觸發動作系統數據模型
 * Trigger Action System Data Models
 * 
 * 支持五種觸發模式：
 * 1. AI 智能聊天 - 使用 AI 自動回覆
 * 2. 模板發送 - 使用預設模板回覆
 * 3. 多角色協作 - 高意向客戶自動建群，多角色 AI 協作
 * 4. 僅記錄 - 只記錄線索不發送
 * 5. 通知人工 - 發送通知等待人工處理
 */

// ========== 帳號角色系統 ==========

// 擴展帳號角色
export type ExtendedAccountRole = 
  | 'monitor'     // 監控號 - 負責監聽群組消息
  | 'sender'      // 發送號 - 負責發送消息
  | 'ai_chat'     // AI號 - 負責 AI 對話
  | 'role_play'   // 角色號 - 多角色協作專用
  | 'explorer'    // 探索號 - 資源發現
  | 'backup';     // 備用號

// 帳號角色配置
export interface AccountRoleConfig {
  accountId: number;
  phone: string;
  username?: string;
  roles: ExtendedAccountRole[];
  primaryRole: ExtendedAccountRole;
  
  // 角色專屬配置
  roleSettings: {
    // 監控號設置
    monitor?: {
      maxGroups: number;
      priority: number;
    };
    // 發送號設置
    sender?: {
      dailyLimit: number;
      cooldownMin: number;
      cooldownMax: number;
      rotationOrder: number;
    };
    // AI號設置
    ai_chat?: {
      useGlobalConfig: boolean;
      customPrompt?: string;
    };
    // 角色號設置
    role_play?: {
      roleId: string;
      roleName: string;
      personality: string;
    };
  };
  
  // 狀態
  isOnline: boolean;
  healthScore: number;
  lastActiveAt?: string;
}

// ========== 觸發動作系統 ==========

// 觸發動作模式
export type TriggerActionMode = 
  | 'ai_smart'        // AI 智能聊天
  | 'template_send'   // 模板發送
  | 'multi_role'      // 多角色協作
  | 'record_only'     // 僅記錄
  | 'notify_human';   // 通知人工

// AI 智能聊天配置
export interface AISmartConfig {
  // 使用的 AI 配置（從 AI 中心調用）
  useAICenterConfig: boolean;
  
  // 自定義配置（如果不使用全局）
  customConfig?: {
    modelId: string;
    knowledgeBaseId: string;
    promptPrefix: string;
  };
  
  // 回覆策略
  replyStrategy: {
    delayMin: number;      // 最小延遲（秒）
    delayMax: number;      // 最大延遲（秒）
    simulateTyping: boolean;
    maxRoundsPerDay: number;
  };
  
  // 轉人工條件
  humanHandoff: {
    onPurchaseIntent: boolean;
    onNegativeSentiment: boolean;
    onNoResponseRounds: number;
    onCustomKeywords: string[];
  };
}

// 模板發送配置
export interface TemplateSendConfig {
  templateId: number;
  templateName: string;
  templateContent: string;
  
  // 發送策略
  sendStrategy: {
    delayMin: number;
    delayMax: number;
    useSpintax: boolean;
    personalizeWithName: boolean;
  };
  
  // 發送帳號
  senderAccountIds: number[];
  accountRotation: 'sequential' | 'random' | 'load_balance';
}

// 多角色協作配置
export interface MultiRoleConfig {
  // 觸發條件
  triggerConditions: {
    intentScoreThreshold: number;  // 意向評分閾值
    minConversationRounds: number; // 最少對話輪數
    hasPriceInquiry: boolean;      // 是否詢問過價格
    manualTrigger: boolean;        // 是否允許手動觸發
  };
  
  // 建群設置
  groupSettings: {
    nameTemplate: string;          // 群名模板，如 "VIP專屬服務群 - {客戶名}"
    inviteMessage: string;         // 邀請話術
  };
  
  // 參與角色
  roleAccounts: {
    accountId: number;
    roleId: string;
    roleName: string;
    roleType: 'expert' | 'satisfied_customer' | 'support' | 'manager';
    personality: string;
    aiPrompt: string;
  }[];
  
  // 劇本 ID（從多角色協作模塊引用）
  scriptId: string;
  
  // 使用 AI 中心配置
  useAICenterForRoles: boolean;
}

// 僅記錄配置
export interface RecordOnlyConfig {
  autoTag: string[];           // 自動標籤
  autoStage: string;           // 自動階段
  notifyOnMatch: boolean;      // 匹配時通知
}

// 通知人工配置
export interface NotifyHumanConfig {
  notificationChannels: ('app' | 'telegram' | 'email')[];
  notifyUserIds: string[];     // 要通知的用戶 ID
  urgencyLevel: 'low' | 'medium' | 'high';
  autoAssignTo?: string;       // 自動分配給
  reminderIntervalMinutes: number;
}

// 觸發動作完整配置
export interface TriggerActionConfig {
  id: string;
  name: string;
  description: string;
  
  // 動作模式
  mode: TriggerActionMode;
  
  // 模式專屬配置
  aiSmartConfig?: AISmartConfig;
  templateSendConfig?: TemplateSendConfig;
  multiRoleConfig?: MultiRoleConfig;
  recordOnlyConfig?: RecordOnlyConfig;
  notifyHumanConfig?: NotifyHumanConfig;
  
  // 發送帳號（通用）
  senderAccountIds: number[];
  accountRotationStrategy: 'sequential' | 'random' | 'load_balance';
  
  // 狀態
  isActive: boolean;
  isDefault: boolean;
  
  // 統計
  stats: {
    triggered: number;
    successful: number;
    failed: number;
    conversions: number;
  };
  
  createdAt: string;
  updatedAt: string;
}

// 群組專屬配置（覆蓋全局配置）
export interface GroupTriggerConfig {
  groupId: string;
  groupName: string;
  
  // 是否使用全局配置
  useGlobalConfig: boolean;
  
  // 群組專屬配置（如果不使用全局）
  customConfig?: TriggerActionConfig;
  
  // 覆蓋的選項
  overrides?: {
    mode?: TriggerActionMode;
    senderAccountIds?: number[];
    customDelay?: { min: number; max: number };
  };
}

// 默認觸發動作配置
export const DEFAULT_TRIGGER_CONFIG: TriggerActionConfig = {
  id: 'default',
  name: '默認配置',
  description: 'AI 智能聊天 + 自動發送',
  mode: 'ai_smart',
  aiSmartConfig: {
    useAICenterConfig: true,
    replyStrategy: {
      delayMin: 30,
      delayMax: 90,
      simulateTyping: true,
      maxRoundsPerDay: 50
    },
    humanHandoff: {
      onPurchaseIntent: true,
      onNegativeSentiment: true,
      onNoResponseRounds: 3,
      onCustomKeywords: []
    }
  },
  senderAccountIds: [],
  accountRotationStrategy: 'load_balance',
  isActive: true,
  isDefault: true,
  stats: { triggered: 0, successful: 0, failed: 0, conversions: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// 觸發動作模式元數據
export const TRIGGER_MODE_META: Record<TriggerActionMode, {
  icon: string;
  label: string;
  description: string;
  color: string;
  recommended?: boolean;
  advanced?: boolean;
}> = {
  ai_smart: {
    icon: '🤖',
    label: 'AI 智能聊天',
    description: 'AI 自動分析意圖並回覆',
    color: 'cyan',
    recommended: true
  },
  template_send: {
    icon: '📝',
    label: '模板發送',
    description: '使用預設模板回覆',
    color: 'blue'
  },
  multi_role: {
    icon: '👥',
    label: '多角色協作',
    description: '高意向客戶自動建群，多角色 AI 協作',
    color: 'purple',
    advanced: true
  },
  record_only: {
    icon: '👁️',
    label: '僅記錄',
    description: '只記錄線索不發送',
    color: 'gray'
  },
  notify_human: {
    icon: '🔔',
    label: '通知人工',
    description: '發送通知等待人工處理',
    color: 'orange'
  }
};
