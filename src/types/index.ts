/**
 * TG-AI智控王 統一類型定義
 * Unified Type Definitions
 * 
 * 此文件導出所有共享類型，避免重複定義
 */

// ============ 通用類型 ============

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type Status = 'idle' | 'loading' | 'success' | 'error';

// ============ AI 相關類型 ============

export type AIProviderType = 'gemini' | 'openai' | 'claude' | 'ollama' | 'deepseek';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface AIConfig {
  provider: AIProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
}

// ============ 聯繫人相關類型 ============

export type ContactStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type FunnelStage = 
  | 'stranger'    // 陌生人
  | 'aware'       // 有認知
  | 'interested'  // 有興趣
  | 'considering' // 考慮中
  | 'qualified'   // 合格線索
  | 'customer'    // 已成交
  | 'advocate';   // 忠實用戶

export interface Contact {
  id: string;
  telegram_id?: string;
  telegram_username?: string;
  display_name: string;
  phone?: string;
  status: ContactStatus;
  funnel_stage: FunnelStage;
  source?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  last_interaction?: string;
}

// ============ 帳號相關類型 ============

export type AccountStatus = 'offline' | 'online' | 'connecting' | 'error' | 'banned' | 'limited';

export type AccountRole = 'listener' | 'sender' | 'both';

export interface TelegramAccount {
  id: number;
  phone: string;
  name: string;
  status: AccountStatus;
  role: AccountRole;
  is_primary?: boolean;
  api_id?: string;
  api_hash?: string;
  session_file?: string;
  created_at?: string;
  last_active?: string;
}

// ============ 消息相關類型 ============

export type MessageStatus = 'pending' | 'sending' | 'sent' | 'delivered' | 'failed' | 'cancelled';

export interface QueueMessage {
  id: string;
  target_id: string;
  target_type: 'user' | 'group';
  content: string;
  status: MessageStatus;
  scheduled_at?: string;
  sent_at?: string;
  error?: string;
  retry_count: number;
}

// ============ 分析相關類型 ============

export type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MetricValue {
  value: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
}

// ============ 自動化相關類型 ============

export type TriggerType = 'keyword' | 'time' | 'event' | 'condition';

export type ActionType = 'send_message' | 'add_tag' | 'move_stage' | 'notify' | 'webhook';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: TriggerType;
    config: Record<string, any>;
  };
  actions: Array<{
    type: ActionType;
    config: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
}

// ============ 會話相關類型 ============

export interface ConversationContext {
  leadId: string;
  messages: AIMessage[];
  totalTurns: number;
  purchaseSignals: number;
  objectionCount: number;
  lastActivity: Date;
}

// ============ 通知相關類型 ============

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}

// ============ 權限相關類型 ============

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
}

// ============ API 響應類型 ============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
