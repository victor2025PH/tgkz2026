/**
 * 統一營銷任務數據模型
 * Unified Marketing Task Data Models
 * 
 * 🆕 Phase 2-1: 統一數據模型
 * 
 * 整合多角色協作和AI中心的功能，提供統一的任務管理
 * 
 * 數據關係：
 * - MarketingTask 是核心實體，代表一個營銷任務
 * - MarketingTask 可以引用 CollaborationGroup（多角色協作群組）
 * - MarketingTask 可以引用 RoleDefinition（角色資源庫）
 * - MarketingTask 可以引用 ScriptTemplate（劇本模板）
 */

// 🆕 導入多角色模型類型（用於類型兼容）
import type { RoleType, CollaborationGroup as LegacyCollaborationGroup } from '../multi-role/multi-role.models';

// 任務目標類型
export type GoalType = 
  | 'conversion'    // 促進成交
  | 'retention'     // 挽回流失
  | 'engagement'    // 社群活躍
  | 'support';      // 售後服務

// 執行模式
export type ExecutionMode = 
  | 'scripted'      // 劇本模式：按預設流程執行
  | 'hybrid'        // 混合模式：關鍵節點預設 + AI即興
  | 'scriptless';   // 無劇本模式：AI完全自主

// 任務狀態
export type TaskStatus = 
  | 'draft'         // 草稿
  | 'scheduled'     // 已計劃
  | 'running'       // 執行中
  | 'paused'        // 已暫停
  | 'completed'     // 已完成
  | 'failed';       // 失敗

// 目標用戶狀態
export type TargetStatus = 
  | 'pending'       // 待處理
  | 'contacted'     // 已接觸
  | 'replied'       // 已回覆
  | 'converted'     // 已轉化
  | 'failed';       // 失敗

// 結果類型
export type TaskOutcome = 
  | 'converted'     // 成功轉化
  | 'rejected'      // 被拒絕
  | 'no_response'   // 無回應
  | 'pending';      // 待定

// 角色類型（統一定義）
export type UnifiedRoleType = 
  | 'expert'              // 產品專家
  | 'satisfied_customer'  // 滿意老客戶
  | 'support'             // 客服助理
  | 'manager'             // 經理
  | 'newbie'              // 好奇新人
  | 'hesitant'            // 猶豫者
  | 'sales'               // 銷售
  | 'callback'            // 回訪專員
  | 'custom';             // 自定義

// ============ 核心數據結構 ============

/**
 * 統一營銷任務
 */
export interface MarketingTask {
  id: string;
  
  // 基本信息
  name: string;
  description?: string;
  goalType: GoalType;
  
  // AI 配置
  aiConfigId?: string;
  executionMode: ExecutionMode;
  
  // 狀態
  status: TaskStatus;
  currentStage?: string;
  
  // 目標配置
  targetCount: number;
  targetCriteria?: TargetCriteria;
  
  // 角色配置
  roleConfig?: RoleConfig[];
  scriptId?: string;
  
  // 執行配置
  scheduleConfig?: ScheduleConfig;
  triggerConditions?: TriggerConditions;
  
  // 統計指標
  stats: TaskStats;
  
  // 時間戳
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
  
  // 創建者
  createdBy?: string;
  
  // ============ 🆕 Phase 2-1: 整合舊模型 ============
  
  // 關聯的協作群組 ID（如果使用多角色協作）
  collaborationGroupId?: string;
  
  // 關聯的劇本模板 ID（來自角色資源庫）
  scriptTemplateId?: string;
  
  // AI 配置快照（從智能引擎複製的配置）
  aiSnapshot?: {
    modelId: string;
    knowledgeBaseId?: string;
    personaId?: string;
    temperature?: number;
  };
  
  // 舊數據遷移標記
  legacySource?: 'collaboration_group' | 'ai_auto_chat' | 'campaign';
  legacyId?: string;
}

/**
 * 任務統計
 */
export interface TaskStats {
  totalContacts: number;    // 總目標數
  contacted: number;        // 已接觸
  replied: number;          // 已回覆
  converted: number;        // 已轉化
  messagesSent: number;     // 發送消息數
  aiCost: number;           // AI 成本
  
  // 計算值
  contactRate: number;      // 接觸率
  replyRate: number;        // 回覆率
  conversionRate: number;   // 轉化率
}

/**
 * 目標用戶篩選條件
 */
export interface TargetCriteria {
  intentScoreMin?: number;
  intentScoreMax?: number;
  tags?: string[];
  sources?: string[];
  excludeContacted?: boolean;
  maxAge?: number;  // 最近N天內
}

/**
 * 角色配置
 */
export interface RoleConfig {
  roleType: UnifiedRoleType;
  roleName: string;
  accountId?: number;
  accountPhone?: string;
  personaPrompt?: string;
  speakingStyle?: string;
  entryTiming?: string;  // 何時介入
}

/**
 * 計劃任務配置
 */
export interface ScheduleConfig {
  type: 'immediate' | 'scheduled' | 'recurring';
  startTime?: string;
  endTime?: string;
  dailyStartHour?: number;
  dailyEndHour?: number;
  timezone?: string;
}

/**
 * 觸發條件
 */
export interface TriggerConditions {
  intentScoreThreshold?: number;
  minConversationRounds?: number;
  requirePriceInquiry?: boolean;
  keywords?: string[];
}

/**
 * 任務目標用戶
 */
export interface TaskTarget {
  id: string;
  taskId: string;
  
  // 用戶信息
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  
  // 狀態追蹤
  status: TargetStatus;
  intentScore: number;
  
  // 執行信息
  assignedRole?: string;
  lastMessageAt?: string;
  messageCount: number;
  
  // 結果
  outcome?: TaskOutcome;
  outcomeNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

/**
 * 任務執行日誌
 */
export interface TaskLog {
  id: string;
  taskId: string;
  targetId?: string;
  
  // 日誌類型
  logType: 'status_change' | 'message_sent' | 'ai_decision' | 'role_switch' | 'error';
  
  // 日誌內容
  action: string;
  details?: Record<string, any>;
  
  // 執行者
  actorType: 'ai' | 'role' | 'system' | 'human';
  actorId?: string;
  
  createdAt: string;
}

/**
 * 任務角色分配
 */
export interface TaskRole {
  id: string;
  taskId: string;
  
  // 角色信息
  roleType: UnifiedRoleType;
  roleName: string;
  
  // 帳號綁定
  accountId?: number;
  accountPhone?: string;
  
  // AI 配置
  personaPrompt?: string;
  speakingStyle?: string;
  
  // 執行統計
  messagesSent: number;
  lastActiveAt?: string;
  
  createdAt: string;
}

// ============ 預設目標類型配置 ============

export const GOAL_TYPE_CONFIG: Record<GoalType, {
  icon: string;
  label: string;
  description: string;
  suggestedRoles: UnifiedRoleType[];
  suggestedMode: ExecutionMode;
}> = {
  conversion: {
    icon: '💰',
    label: '促進首單',
    description: '把猶豫不決的潛在客戶轉化為付費用戶',
    suggestedRoles: ['expert', 'satisfied_customer', 'sales'],
    suggestedMode: 'hybrid'
  },
  retention: {
    icon: '💝',
    label: '挽回流失',
    description: '挽回已流失的老客戶，讓他們重新購買',
    suggestedRoles: ['callback', 'support', 'manager'],
    suggestedMode: 'hybrid'
  },
  engagement: {
    icon: '🎉',
    label: '社群活躍',
    description: '讓社群更活躍，增加用戶互動和粘性',
    suggestedRoles: ['newbie', 'satisfied_customer', 'expert'],
    suggestedMode: 'scriptless'
  },
  support: {
    icon: '🔧',
    label: '售後服務',
    description: '高效處理客戶售後問題，提升滿意度',
    suggestedRoles: ['support', 'expert', 'manager'],
    suggestedMode: 'scripted'
  }
};

// ============ 輔助函數 ============

/**
 * 計算任務統計
 */
export function calculateTaskStats(task: MarketingTask): TaskStats {
  const stats = task.stats;
  return {
    ...stats,
    contactRate: stats.totalContacts > 0 
      ? Math.round((stats.contacted / stats.totalContacts) * 100) 
      : 0,
    replyRate: stats.contacted > 0 
      ? Math.round((stats.replied / stats.contacted) * 100) 
      : 0,
    conversionRate: stats.contacted > 0 
      ? Math.round((stats.converted / stats.contacted) * 100) 
      : 0
  };
}

/**
 * 創建默認任務
 */
export function createDefaultTask(goalType: GoalType = 'conversion'): Partial<MarketingTask> {
  const config = GOAL_TYPE_CONFIG[goalType];
  
  return {
    goalType,
    executionMode: config.suggestedMode,
    status: 'draft',
    targetCount: 0,
    stats: {
      totalContacts: 0,
      contacted: 0,
      replied: 0,
      converted: 0,
      messagesSent: 0,
      aiCost: 0,
      contactRate: 0,
      replyRate: 0,
      conversionRate: 0
    }
  };
}

/**
 * 從舊的 CollaborationGroup 轉換
 */
export function fromCollaborationGroup(group: any): Partial<MarketingTask> {
  return {
    name: group.groupTitle || '協作任務',
    goalType: mapPurposeToGoal(group.purpose),
    executionMode: 'scripted',
    status: mapCollabStatusToTaskStatus(group.status),
    targetCount: 1,
    stats: {
      totalContacts: 1,
      contacted: group.customerMessages > 0 ? 1 : 0,
      replied: group.customerMessages > 0 ? 1 : 0,
      converted: group.outcome === 'converted' ? 1 : 0,
      messagesSent: group.messagesSent || 0,
      aiCost: 0,
      contactRate: 100,
      replyRate: group.customerMessages > 0 ? 100 : 0,
      conversionRate: group.outcome === 'converted' ? 100 : 0
    }
  };
}

function mapPurposeToGoal(purpose: string): GoalType {
  const mapping: Record<string, GoalType> = {
    'conversion': 'conversion',
    'support': 'support',
    'community': 'engagement',
    'engagement': 'engagement'
  };
  return mapping[purpose] || 'conversion';
}

function mapCollabStatusToTaskStatus(status: string): TaskStatus {
  const mapping: Record<string, TaskStatus> = {
    'creating': 'draft',
    'inviting': 'running',
    'running': 'running',
    'paused': 'paused',
    'completed': 'completed',
    'failed': 'failed'
  };
  return mapping[status] || 'draft';
}
