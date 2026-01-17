/**
 * TG-AI智控王 潛在客戶培育系統 - 數據模型
 * Lead Nurturing System - Data Models v1.0
 */

// ============ 基礎類型 ============

/** 銷售漏斗階段 */
export type FunnelStage = 
  | 'stranger'      // 陌生人
  | 'visitor'       // 訪客（有過1-2次互動）
  | 'lead'          // 潛在客戶（表達過興趣）
  | 'qualified'     // 高意向（明確購買意向）
  | 'customer'      // 客戶（已成交）
  | 'advocate'      // 忠實客戶（多次購買/推薦）
  | 'dormant';      // 沉默用戶

/** 對話類型 */
export type ConversationType = 
  | 'business'      // 業務跟進
  | 'casual'        // 情感維護
  | 'greeting'      // 問候
  | 'nurture'       // 培育
  | 'support'       // 售後支持
  | 'manual';       // 手動對話

/** 跟進狀態 */
export type FollowUpStatus = 
  | 'scheduled'     // 已排程
  | 'pending'       // 待執行
  | 'executed'      // 已執行
  | 'skipped'       // 已跳過
  | 'failed'        // 執行失敗
  | 'cancelled';    // 已取消

/** 通知優先級 */
export type NotificationPriority = 'urgent' | 'important' | 'normal' | 'low';

/** 通知類型 */
export type NotificationType = 
  | 'purchase_intent'    // 購買意向
  | 'negative_sentiment' // 負面情緒
  | 'keyword_trigger'    // 關鍵詞觸發
  | 'new_reply'          // 新回覆
  | 'follow_up_due'      // 跟進到期
  | 'ai_needs_help'      // AI需要幫助
  | 'stage_change'       // 階段變更
  | 'task_complete';     // 任務完成

// ============ 評分系統 ============

/** 客戶評分集合 */
export interface LeadScores {
  /** 綜合評分 (0-100) */
  overall: number;
  /** 信任度評分 (0-100) */
  trust: number;
  /** 參與度評分 (0-100) */
  engagement: number;
  /** 購買意向評分 (0-100) */
  intent: number;
  /** 緊迫度評分 (0-100) */
  urgency: number;
  /** 評分最後更新時間 */
  updatedAt: Date;
}

// ============ 用戶畫像 ============

/** 溝通風格 */
export type CommunicationStyle = 'direct' | 'friendly' | 'formal' | 'casual' | 'unknown';

/** 回覆模式 */
export interface ResponsePattern {
  /** 平均回覆時間（分鐘） */
  avgResponseTime: number;
  /** 回覆率 */
  responseRate: number;
  /** 平均消息長度 */
  avgMessageLength: number;
  /** 偏好回覆時間 */
  preferredHours: number[];
}

/** 話題偏好 */
export interface TopicPreference {
  topic: string;
  interestLevel: number;  // 0-1
  mentionCount: number;
  lastMentioned?: Date;
}

/** 個人信息 */
export interface PersonalInfo {
  birthday?: Date;
  location?: string;
  profession?: string;
  interests?: string[];
  notes?: string;
}

/** 用戶畫像 */
export interface LeadProfile {
  /** 興趣標籤 */
  interests: string[];
  /** 溝通風格偏好 */
  communicationStyle: CommunicationStyle;
  /** 活躍時段 */
  activeHours: { start: number; end: number }[];
  /** 回覆模式 */
  responsePattern: ResponsePattern;
  /** 話題偏好 */
  topicPreferences: TopicPreference[];
  /** 個人信息 */
  personalInfo: PersonalInfo;
  /** 語言偏好 */
  preferredLanguage: string;
  /** 畫像最後更新時間 */
  updatedAt: Date;
}

// ============ 對話記錄 ============

/** 消息 */
export interface LeadMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** 是否由AI生成 */
  isAIGenerated: boolean;
  /** AI模型（如果是AI生成） */
  aiModel?: string;
  /** 情感分析結果 */
  sentiment?: {
    type: 'positive' | 'negative' | 'neutral';
    score: number;
  };
  /** 識別到的意圖 */
  detectedIntent?: string;
  /** 是否已讀 */
  isRead: boolean;
}

/** 對話記錄 */
export interface LeadConversation {
  id: string;
  leadId: string;
  type: ConversationType;
  messages: LeadMessage[];
  /** 對話開始時間 */
  startedAt: Date;
  /** 對話結束時間 */
  endedAt?: Date;
  /** 對話摘要 */
  summary?: string;
  /** 討論話題 */
  topics: string[];
  /** 整體情感趨勢 */
  sentimentTrend: 'improving' | 'declining' | 'stable' | 'unknown';
  /** 識別的購買信號 */
  purchaseSignals: PurchaseSignal[];
  /** 對話結果 */
  outcome?: ConversationOutcome;
}

/** 購買信號 */
export interface PurchaseSignal {
  type: 'strong' | 'medium' | 'weak';
  signal: string;
  message: string;
  detectedAt: Date;
  confidence: number;
}

/** 對話結果 */
export interface ConversationOutcome {
  type: 'positive' | 'neutral' | 'negative';
  action?: string;
  nextStep?: string;
  notes?: string;
}

// ============ 跟進計劃 ============

/** 跟進內容計劃 */
export interface FollowUpContent {
  /** 消息模板 */
  template?: string;
  /** AI生成的消息 */
  generatedMessage?: string;
  /** 話題建議 */
  suggestedTopics: string[];
  /** 變量值 */
  variables?: Record<string, string>;
}

/** 跟進計劃 */
export interface FollowUp {
  id: string;
  leadId: string;
  /** 跟進類型 */
  type: ConversationType;
  /** 排程時間 */
  scheduledAt: Date;
  /** 觸發條件（可選） */
  triggerCondition?: {
    type: 'online' | 'time' | 'event';
    config: Record<string, any>;
  };
  /** 內容計劃 */
  content: FollowUpContent;
  /** 優先級 */
  priority: NotificationPriority;
  /** 狀態 */
  status: FollowUpStatus;
  /** 實際執行時間 */
  executedAt?: Date;
  /** 執行結果 */
  result?: {
    success: boolean;
    messageId?: string;
    error?: string;
    userResponse?: string;
  };
  /** 創建時間 */
  createdAt: Date;
  /** 更新時間 */
  updatedAt: Date;
}

// ============ 活動記錄 ============

/** 活動類型 */
export type ActivityType = 
  | 'first_contact'     // 首次接觸
  | 'message_sent'      // 發送消息
  | 'message_received'  // 收到消息
  | 'stage_changed'     // 階段變更
  | 'score_updated'     // 評分更新
  | 'tag_added'         // 添加標籤
  | 'tag_removed'       // 移除標籤
  | 'follow_up_created' // 創建跟進
  | 'follow_up_executed'// 執行跟進
  | 'note_added'        // 添加備註
  | 'converted'         // 轉化成交
  | 'lost';             // 流失

/** 活動記錄 */
export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  description: string;
  details?: Record<string, any>;
  createdAt: Date;
  createdBy: 'ai' | 'user' | 'system';
}

// ============ 來源信息 ============

/** 客戶來源信息 */
export interface LeadSource {
  /** 來源類型 */
  type: 'group_search' | 'keyword_trigger' | 'manual' | 'import' | 'referral';
  /** 來源群組ID */
  groupId?: string;
  /** 來源群組名稱 */
  groupTitle?: string;
  /** 觸發關鍵詞 */
  triggerKeyword?: string;
  /** 來源活動ID */
  campaignId?: string;
  /** 推薦人 */
  referrer?: string;
  /** 發現時間 */
  discoveredAt: Date;
}

// ============ 主數據模型：潛在客戶 ============

/** 潛在客戶 */
export interface Lead {
  id: string;
  /** Telegram用戶ID */
  peerId: string;
  /** 用戶名 */
  username?: string;
  /** 顯示名稱 */
  displayName: string;
  /** 名字 */
  firstName?: string;
  /** 姓氏 */
  lastName?: string;
  /** 頭像URL */
  avatar?: string;
  /** 手機號（如果有） */
  phone?: string;
  
  // 狀態
  /** 銷售漏斗階段 */
  stage: FunnelStage;
  /** 在線狀態 */
  onlineStatus: 'online' | 'offline' | 'recently' | 'unknown';
  /** 最後在線時間 */
  lastOnlineAt?: Date;
  /** 是否在培育中 */
  isNurturing: boolean;
  /** 是否標記為不聯繫 */
  doNotContact: boolean;
  
  // 評分和畫像
  /** 評分集合 */
  scores: LeadScores;
  /** 用戶畫像 */
  profile: LeadProfile;
  
  // 來源
  /** 來源信息 */
  source: LeadSource;
  
  // 標籤
  /** 標籤列表 */
  tags: string[];
  
  // 培育設置
  /** 培育配置 */
  nurturingConfig: {
    /** 是否啟用自動培育 */
    enabled: boolean;
    /** 業務跟進間隔（天） */
    businessFollowUpDays: number;
    /** 情感維護間隔（天） */
    casualFollowUpDays: number;
    /** 最大跟進次數 */
    maxFollowUps: number;
    /** 當前跟進次數 */
    currentFollowUpCount: number;
  };
  
  // 統計
  /** 統計數據 */
  stats: {
    /** 總對話次數 */
    totalConversations: number;
    /** 我方發送消息數 */
    messagesSent: number;
    /** 對方回覆消息數 */
    messagesReceived: number;
    /** 回覆率 */
    responseRate: number;
    /** 平均回覆時間（分鐘） */
    avgResponseTime: number;
  };
  
  // 重要時間點
  /** 首次接觸時間 */
  firstContactAt: Date;
  /** 最後互動時間 */
  lastInteractionAt?: Date;
  /** 最後跟進時間 */
  lastFollowUpAt?: Date;
  /** 下次計劃跟進時間 */
  nextFollowUpAt?: Date;
  /** 轉化時間（如果已成交） */
  convertedAt?: Date;
  
  // 關聯
  /** 分配的賬戶（用於發送消息） */
  assignedAccountPhone?: string;
  
  // 備註
  /** 備註 */
  notes?: string;
  
  // 元數據
  /** 創建時間 */
  createdAt: Date;
  /** 更新時間 */
  updatedAt: Date;
}

// ============ 通知 ============

/** 通知 */
export interface LeadNotification {
  id: string;
  leadId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  /** 相關數據 */
  data?: Record<string, any>;
  /** 建議操作 */
  suggestedActions?: {
    label: string;
    action: string;
    params?: Record<string, any>;
  }[];
  /** 是否已讀 */
  isRead: boolean;
  /** 是否已處理 */
  isHandled: boolean;
  /** 創建時間 */
  createdAt: Date;
  /** 已讀時間 */
  readAt?: Date;
  /** 處理時間 */
  handledAt?: Date;
}

// ============ 培育設置 ============

/** 全局培育設置 */
export interface NurturingSettings {
  /** 培育模式 */
  mode: 'auto' | 'semi-auto' | 'manual';
  
  /** 跟進頻率設置（按階段） */
  followUpFrequency: {
    [key in FunnelStage]?: {
      businessDays: number;
      casualDays: number;
    };
  };
  
  /** 活躍時段設置 */
  activeHours: {
    start: number;  // 0-23
    end: number;    // 0-23
    preferredStart?: number;
    preferredEnd?: number;
  };
  
  /** 對話風格 */
  conversationStyle: {
    tone: 'professional' | 'friendly' | 'casual' | 'formal';
    useEmoji: boolean;
    messageLength: 'short' | 'medium' | 'long';
  };
  
  /** 業務目標 */
  businessGoals: {
    mainProduct?: string;
    priceRange?: { min: number; max: number };
    discountEnabled: boolean;
  };
  
  /** 人工介入觸發條件 */
  humanInterventionTriggers: {
    purchaseIntent: boolean;
    complexQuestion: boolean;
    negativeEmotion: boolean;
    maxConversationRounds: number;
    humanRequest: boolean;
  };
  
  /** 通知設置 */
  notifications: {
    sound: boolean;
    desktop: boolean;
    urgentOnly: boolean;
  };
}

// ============ 統計報表 ============

/** 培育統計 */
export interface NurturingStats {
  /** 時間範圍 */
  period: {
    start: Date;
    end: Date;
  };
  
  /** 漏斗統計 */
  funnel: {
    stranger: number;
    visitor: number;
    lead: number;
    qualified: number;
    customer: number;
    advocate: number;
    dormant: number;
  };
  
  /** 轉化統計 */
  conversion: {
    totalContacted: number;
    totalReplied: number;
    replyRate: number;
    totalConverted: number;
    conversionRate: number;
    avgConversionDays: number;
  };
  
  /** AI統計 */
  aiStats: {
    totalAIMessages: number;
    aiHandledRate: number;
    humanInterventions: number;
    avgAIResponseTime: number;
  };
  
  /** 跟進統計 */
  followUpStats: {
    totalScheduled: number;
    totalExecuted: number;
    executionRate: number;
    totalResponses: number;
    responseRate: number;
  };
}

// ============ 輔助函數類型 ============

/** 創建潛在客戶的輸入 */
export interface CreateLeadInput {
  peerId: string;
  username?: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  source: LeadSource;
  tags?: string[];
  assignedAccountPhone?: string;
  notes?: string;
  /** 是否立即開始培育 */
  startNurturing?: boolean;
}

/** 更新潛在客戶的輸入 */
export interface UpdateLeadInput {
  displayName?: string;
  stage?: FunnelStage;
  tags?: string[];
  isNurturing?: boolean;
  doNotContact?: boolean;
  nurturingConfig?: Partial<Lead['nurturingConfig']>;
  assignedAccountPhone?: string;
  notes?: string;
}

/** 潛在客戶列表過濾器 */
export interface LeadFilters {
  stage?: FunnelStage | FunnelStage[];
  tags?: string[];
  isNurturing?: boolean;
  hasUnreadMessages?: boolean;
  needsFollowUp?: boolean;
  scoreRange?: { min: number; max: number };
  source?: LeadSource['type'];
  search?: string;
}

/** 排序選項 */
export interface LeadSortOptions {
  field: 'score' | 'lastInteraction' | 'nextFollowUp' | 'createdAt' | 'name';
  direction: 'asc' | 'desc';
}
