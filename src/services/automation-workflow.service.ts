/**
 * 自動化工作流服務
 * Automation Workflow Service
 * 
 * 🆕 Phase 1：全鏈路智能營銷自動化
 * 
 * 功能：
 * - 監控關鍵詞觸發 → AI 策劃
 * - AI 策劃完成 → 私聊執行
 * - 興趣信號識別 → 建群觸發
 * - 工作流狀態管理
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { UnifiedContactsService } from './unified-contacts.service';

// ============ 類型定義 ============

/** 工作流定義 */
export interface AutomationWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  config: WorkflowConfig;
  stats: WorkflowStats;
  createdAt: Date;
  updatedAt: Date;
}

/** 觸發條件 */
export interface WorkflowTrigger {
  type: 'keyword_match' | 'user_action' | 'schedule' | 'manual';
  groupIds?: number[];           // 監控的群組
  keywordSetIds?: number[];      // 關鍵詞集
  minIntentScore?: number;       // 最低意向分
  cooldownMinutes?: number;      // 同用戶冷卻時間
  excludeContacted?: boolean;    // 排除已聯繫
  excludeBlacklist?: boolean;    // 排除黑名單
}

/** 工作流步驟 */
export interface WorkflowStep {
  id: string;
  type: 'evaluate' | 'plan' | 'private_chat' | 'detect_interest' | 'create_group' | 'group_marketing' | 'record';
  name: string;
  config: Record<string, any>;
  nextOnSuccess?: string;
  nextOnFail?: string;
}

/** 工作流配置 */
export interface WorkflowConfig {
  marketingGoal: string;         // 營銷目標
  roleCount: number | 'auto';    // 角色數量
  accountSelection: 'auto' | 'manual';
  selectedAccountIds?: number[];
  firstContactDelay: { min: number; max: number };  // 首次接觸延遲（分鐘）
  interestSignals: string[];     // 興趣信號關鍵詞
  groupNameTemplate?: string;    // 群名模板
}

/** 工作流統計 */
export interface WorkflowStats {
  totalTriggers: number;
  todayTriggers: number;
  activeExecutions: number;
  conversions: number;
  lastTriggeredAt?: Date;
}

/** 工作流執行實例 */
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  targetUserId: string;
  targetUserName: string;
  targetUserPhone?: string;
  currentStep: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  stepResults: Record<string, StepResult>;
  aiPlanResult?: any;
  sessionId?: string;           // 協作會話 ID
  groupId?: string;             // 創建的群組 ID
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  outcome?: 'converted' | 'interested' | 'neutral' | 'rejected' | 'no_response';
}

/** 步驟結果 */
export interface StepResult {
  status: 'success' | 'failed' | 'skipped';
  data?: any;
  error?: string;
  timestamp: Date;
}

/** 興趣信號 */
export interface InterestSignal {
  type: 'price_inquiry' | 'product_detail' | 'purchase_intent' | 'positive_feedback' | 'comparison';
  keyword: string;
  confidence: number;
  message: string;
  detectedAt: Date;
}

// ============ 預設興趣信號關鍵詞 ============

const DEFAULT_INTEREST_SIGNALS: Record<string, string[]> = {
  price_inquiry: ['多少錢', '什麼價格', '價格', '費用', '收費', '怎麼收', '報價'],
  product_detail: ['怎麼用', '有什麼功能', '詳細介紹', '了解一下', '能做什麼'],
  purchase_intent: ['怎麼買', '在哪買', '我要', '我想買', '下單', '付款', '購買'],
  positive_feedback: ['不錯', '挺好', '可以', '行', '好的', '感興趣'],
  comparison: ['比', '對比', '區別', '差別', '哪個好']
};

// ============ 預設工作流 ============

const DEFAULT_WORKFLOW: AutomationWorkflow = {
  id: 'default_marketing',
  name: '智能營銷工作流',
  enabled: false,
  trigger: {
    type: 'keyword_match',
    minIntentScore: 60,
    cooldownMinutes: 1440,  // 24小時
    excludeContacted: true,
    excludeBlacklist: true
  },
  steps: [
    { id: 'evaluate', type: 'evaluate', name: '用戶評估', config: {}, nextOnSuccess: 'plan' },
    { id: 'plan', type: 'plan', name: 'AI 策劃', config: {}, nextOnSuccess: 'private_chat' },
    { id: 'private_chat', type: 'private_chat', name: '私聊協作', config: {}, nextOnSuccess: 'detect_interest' },
    { id: 'detect_interest', type: 'detect_interest', name: '興趣檢測', config: {}, nextOnSuccess: 'create_group', nextOnFail: 'record' },
    { id: 'create_group', type: 'create_group', name: '自動建群', config: {}, nextOnSuccess: 'group_marketing' },
    { id: 'group_marketing', type: 'group_marketing', name: '組群營銷', config: {}, nextOnSuccess: 'record' },
    { id: 'record', type: 'record', name: '記錄結果', config: {} }
  ],
  config: {
    marketingGoal: '促進成交',
    roleCount: 'auto',
    accountSelection: 'auto',
    firstContactDelay: { min: 5, max: 15 },
    interestSignals: ['price_inquiry', 'purchase_intent', 'positive_feedback']
  },
  stats: {
    totalTriggers: 0,
    todayTriggers: 0,
    activeExecutions: 0,
    conversions: 0
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

@Injectable({ providedIn: 'root' })
export class AutomationWorkflowService {
  private readonly ipc = inject(ElectronIpcService);
  private readonly toast = inject(ToastService);
  private readonly contacts = inject(UnifiedContactsService);
  
  // ============ 狀態 ============
  
  private readonly STORAGE_KEY = 'automationWorkflows';
  
  // 工作流列表
  private _workflows = signal<AutomationWorkflow[]>([DEFAULT_WORKFLOW]);
  workflows = this._workflows.asReadonly();
  
  // 執行中的實例
  private _executions = signal<Map<string, WorkflowExecution>>(new Map());
  executions = computed(() => Array.from(this._executions().values()));
  
  // 活躍執行數
  activeExecutionCount = computed(() => 
    this.executions().filter(e => e.status === 'running' || e.status === 'pending').length
  );
  
  // 用戶冷卻記錄 (userId -> lastTriggerTime)
  private userCooldowns = new Map<string, Date>();
  
  // IPC 清理函數
  private ipcCleanups: (() => void)[] = [];
  
  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
    
    console.log('[AutomationWorkflow] 服務已初始化');
  }
  
  // ============ 事件監聽 ============
  
  private setupEventListeners(): void {
    // 監聽關鍵詞匹配事件
    const cleanup1 = this.ipc.on('keyword-matched', (data: any) => {
      this.handleKeywordMatch(data);
    });
    this.ipcCleanups.push(cleanup1);
    
    // 監聯用戶捕獲事件
    const cleanup2 = this.ipc.on('lead-captured', (data: any) => {
      this.handleLeadCaptured(data);
    });
    this.ipcCleanups.push(cleanup2);
    
    // 監聽私聊消息（用於興趣信號檢測）
    const cleanup3 = this.ipc.on('private-message-received', (data: any) => {
      this.handlePrivateMessage(data);
    });
    this.ipcCleanups.push(cleanup3);
    
    // 監聽協作會話完成
    const cleanup4 = this.ipc.on('collaboration-session-completed', (data: any) => {
      this.handleSessionCompleted(data);
    });
    this.ipcCleanups.push(cleanup4);
  }
  
  // ============ 事件處理 ============
  
  /**
   * 處理關鍵詞匹配事件
   */
  private handleKeywordMatch(data: {
    keyword: string;
    groupUrl: string;
    groupName: string;
    userId: string;
    username: string;
    firstName: string;
    messagePreview: string;
    timestamp: string;
  }): void {
    console.log('[AutomationWorkflow] 收到關鍵詞匹配:', data);
    
    // 檢查是否有啟用的工作流
    const enabledWorkflows = this._workflows().filter(w => w.enabled && w.trigger.type === 'keyword_match');
    
    if (enabledWorkflows.length === 0) {
      console.log('[AutomationWorkflow] 無啟用的工作流，跳過');
      return;
    }
    
    for (const workflow of enabledWorkflows) {
      this.tryTriggerWorkflow(workflow, data);
    }
  }
  
  /**
   * 嘗試觸發工作流
   */
  private async tryTriggerWorkflow(workflow: AutomationWorkflow, userData: any): Promise<void> {
    const userId = userData.userId;
    
    // 檢查冷卻
    if (this.isUserInCooldown(userId, workflow.trigger.cooldownMinutes || 1440)) {
      console.log(`[AutomationWorkflow] 用戶 ${userId} 在冷卻期內，跳過`);
      return;
    }
    
    // 檢查是否已有進行中的執行
    const existingExecution = this.executions().find(
      e => e.targetUserId === userId && (e.status === 'running' || e.status === 'pending')
    );
    if (existingExecution) {
      console.log(`[AutomationWorkflow] 用戶 ${userId} 已有進行中的工作流，跳過`);
      return;
    }
    
    // 評估用戶意向分
    const intentScore = this.evaluateUserIntent(userData);
    const minScore = workflow.trigger.minIntentScore || 60;
    
    if (intentScore < minScore) {
      console.log(`[AutomationWorkflow] 用戶意向分 ${intentScore} < ${minScore}，跳過`);
      return;
    }
    
    // 創建執行實例
    const execution = this.createExecution(workflow, userData, intentScore);
    
    // 更新冷卻記錄
    this.userCooldowns.set(userId, new Date());
    
    // 更新統計
    this.updateWorkflowStats(workflow.id, 'trigger');
    
    // 開始執行
    this.toast.success(`🚀 自動觸發工作流：${workflow.name}`);
    console.log(`[AutomationWorkflow] 開始執行工作流: ${workflow.name}，目標用戶: ${userData.username || userId}`);
    
    // 延遲後開始（避免太機械化）
    const delay = this.getRandomDelay(workflow.config.firstContactDelay);
    console.log(`[AutomationWorkflow] 將在 ${delay} 秒後開始執行`);
    
    setTimeout(() => {
      this.executeWorkflow(execution.id);
    }, delay * 1000);
  }
  
  /**
   * 處理用戶捕獲事件
   */
  private handleLeadCaptured(data: any): void {
    console.log('[AutomationWorkflow] 收到用戶捕獲事件:', data);
    // 可用於更新執行狀態或觸發後續步驟
  }
  
  /**
   * 處理私聊消息（興趣信號檢測）
   */
  private handlePrivateMessage(data: {
    userId: string;
    message: string;
    fromUser: boolean;
  }): void {
    if (!data.fromUser) return;  // 只分析用戶消息
    
    // 查找該用戶的活躍執行
    const execution = this.executions().find(
      e => e.targetUserId === data.userId && e.status === 'running' && e.currentStep === 'private_chat'
    );
    
    if (!execution) return;
    
    // 檢測興趣信號
    const signal = this.detectInterestSignal(data.message);
    
    if (signal) {
      console.log(`[AutomationWorkflow] 檢測到興趣信號:`, signal);
      
      // 更新執行狀態
      this.updateExecutionStep(execution.id, 'detect_interest', {
        status: 'success',
        data: signal,
        timestamp: new Date()
      });
      
      // 如果是強購買意向，觸發建群
      if (signal.type === 'purchase_intent' || signal.type === 'price_inquiry') {
        this.toast.info(`🎯 檢測到購買意向！準備自動建群...`);
        this.advanceToStep(execution.id, 'create_group');
      }
    }
  }
  
  /**
   * 處理協作會話完成
   */
  private handleSessionCompleted(data: {
    sessionId: string;
    outcome: string;
    targetUserId: string;
  }): void {
    // 查找對應的執行
    const execution = this.executions().find(e => e.sessionId === data.sessionId);
    
    if (execution) {
      this.updateExecution(execution.id, {
        outcome: data.outcome as any,
        status: 'completed',
        completedAt: new Date()
      });
      
      if (data.outcome === 'converted') {
        this.updateWorkflowStats(execution.workflowId, 'conversion');
      }
    }
  }
  
  // ============ 工作流執行 ============
  
  /**
   * 執行工作流
   */
  async executeWorkflow(executionId: string): Promise<void> {
    const execution = this._executions().get(executionId);
    if (!execution) return;
    
    const workflow = this._workflows().find(w => w.id === execution.workflowId);
    if (!workflow) return;
    
    // 更新狀態為運行中
    this.updateExecution(executionId, { status: 'running' });
    
    // 獲取當前步驟
    const currentStep = workflow.steps.find(s => s.id === execution.currentStep);
    if (!currentStep) return;
    
    console.log(`[AutomationWorkflow] 執行步驟: ${currentStep.name}`);
    
    try {
      // 根據步驟類型執行
      const result = await this.executeStep(execution, currentStep, workflow);
      
      // 記錄結果
      this.updateExecutionStep(executionId, currentStep.id, result);
      
      // 決定下一步
      const nextStepId = result.status === 'success' ? currentStep.nextOnSuccess : currentStep.nextOnFail;
      
      if (nextStepId) {
        this.advanceToStep(executionId, nextStepId);
      } else {
        // 工作流完成
        this.updateExecution(executionId, { 
          status: 'completed',
          completedAt: new Date()
        });
        console.log(`[AutomationWorkflow] 工作流執行完成: ${executionId}`);
      }
    } catch (error: any) {
      console.error(`[AutomationWorkflow] 步驟執行失敗:`, error);
      this.updateExecutionStep(executionId, currentStep.id, {
        status: 'failed',
        error: error.message,
        timestamp: new Date()
      });
      this.updateExecution(executionId, { status: 'failed' });
    }
  }
  
  /**
   * 執行單個步驟
   */
  private async executeStep(execution: WorkflowExecution, step: WorkflowStep, workflow: AutomationWorkflow): Promise<StepResult> {
    switch (step.type) {
      case 'evaluate':
        // 用戶評估已在觸發時完成
        return { status: 'success', timestamp: new Date() };
        
      case 'plan':
        // 觸發 AI 策劃
        return await this.executeAiPlanStep(execution, workflow);
        
      case 'private_chat':
        // 開始私聊協作
        return await this.executePrivateChatStep(execution, workflow);
        
      case 'detect_interest':
        // 興趣檢測是被動的，這裡只是等待
        return { status: 'success', timestamp: new Date() };
        
      case 'create_group':
        // 自動建群
        return await this.executeCreateGroupStep(execution, workflow);
        
      case 'group_marketing':
        // 組群營銷
        return await this.executeGroupMarketingStep(execution, workflow);
        
      case 'record':
        // 記錄結果
        return this.executeRecordStep(execution);
        
      default:
        return { status: 'skipped', timestamp: new Date() };
    }
  }
  
  /**
   * 執行 AI 策劃步驟
   */
  private async executeAiPlanStep(execution: WorkflowExecution, workflow: AutomationWorkflow): Promise<StepResult> {
    return new Promise((resolve) => {
      const goal = workflow.config.marketingGoal || '促進成交';
      
      console.log(`[AutomationWorkflow] 調用 AI 策劃，目標: ${goal}`);
      
      // 發送 AI 策劃請求
      this.ipc.send('multi-role:ai-plan', {
        goal,
        targetUsers: [{
          id: execution.targetUserId,
          username: execution.targetUserName
        }],
        autoExecute: true,
        workflowExecutionId: execution.id
      });
      
      // 監聽結果
      const cleanup = this.ipc.on('multi-role:ai-plan-result', (data: any) => {
        cleanup();
        
        if (data.success) {
          // 保存策劃結果到執行實例
          this.updateExecution(execution.id, { aiPlanResult: data });
          resolve({ status: 'success', data, timestamp: new Date() });
        } else {
          resolve({ status: 'failed', error: data.error, timestamp: new Date() });
        }
      });
      
      // 超時處理
      setTimeout(() => {
        cleanup();
        resolve({ status: 'failed', error: '策劃超時', timestamp: new Date() });
      }, 60000);
    });
  }
  
  /**
   * 執行私聊協作步驟
   */
  private async executePrivateChatStep(execution: WorkflowExecution, workflow: AutomationWorkflow): Promise<StepResult> {
    console.log(`[AutomationWorkflow] 開始私聊協作，目標用戶: ${execution.targetUserName}`);
    
    // 發送開始私聊協作請求
    this.ipc.send('multi-role:start-private-collaboration', {
      targetUserId: execution.targetUserId,
      targetUserName: execution.targetUserName,
      aiPlanResult: execution.aiPlanResult,
      workflowExecutionId: execution.id
    });
    
    // 私聊是長時間運行的，這裡只標記開始
    return { status: 'success', timestamp: new Date() };
  }
  
  /**
   * 執行建群步驟
   */
  private async executeCreateGroupStep(execution: WorkflowExecution, workflow: AutomationWorkflow): Promise<StepResult> {
    return new Promise((resolve) => {
      const groupName = (workflow.config.groupNameTemplate || 'VIP 服務群 - {user}')
        .replace('{user}', execution.targetUserName);
      
      console.log(`[AutomationWorkflow] 自動建群: ${groupName}`);
      
      this.ipc.send('multi-role:auto-create-group', {
        groupName,
        targetUserId: execution.targetUserId,
        workflowExecutionId: execution.id
      });
      
      const cleanup = this.ipc.on('multi-role:group-created', (data: any) => {
        cleanup();
        
        if (data.success) {
          this.updateExecution(execution.id, { groupId: data.groupId });
          this.toast.success(`✅ 已自動創建群組: ${groupName}`);
          resolve({ status: 'success', data, timestamp: new Date() });
        } else {
          resolve({ status: 'failed', error: data.error, timestamp: new Date() });
        }
      });
      
      setTimeout(() => {
        cleanup();
        resolve({ status: 'failed', error: '建群超時', timestamp: new Date() });
      }, 120000);
    });
  }
  
  /**
   * 執行組群營銷步驟
   */
  private async executeGroupMarketingStep(execution: WorkflowExecution, workflow: AutomationWorkflow): Promise<StepResult> {
    if (!execution.groupId) {
      return { status: 'skipped', timestamp: new Date() };
    }
    
    console.log(`[AutomationWorkflow] 開始組群營銷，群組: ${execution.groupId}`);
    
    this.ipc.send('multi-role:start-group-collaboration', {
      groupId: execution.groupId,
      aiPlanResult: execution.aiPlanResult,
      workflowExecutionId: execution.id
    });
    
    return { status: 'success', timestamp: new Date() };
  }
  
  /**
   * 執行記錄步驟
   */
  private executeRecordStep(execution: WorkflowExecution): StepResult {
    console.log(`[AutomationWorkflow] 記錄執行結果:`, execution);
    
    // 更新統一通訊錄中的用戶狀態
    // this.contacts.updateContact(execution.targetUserId, { ... });
    
    return { status: 'success', timestamp: new Date() };
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 評估用戶意向分
   */
  private evaluateUserIntent(userData: any): number {
    let score = 50;  // 基礎分
    
    // 關鍵詞加分
    const message = userData.messagePreview?.toLowerCase() || '';
    
    if (message.includes('價格') || message.includes('多少錢')) score += 20;
    if (message.includes('怎麼買') || message.includes('購買')) score += 25;
    if (message.includes('了解') || message.includes('介紹')) score += 10;
    if (message.includes('急') || message.includes('馬上')) score += 15;
    
    return Math.min(100, score);
  }
  
  /**
   * 檢測興趣信號（關鍵詞匹配）
   */
  private detectInterestSignal(message: string): InterestSignal | null {
    const lowerMessage = message.toLowerCase();
    
    // 1. 首先用關鍵詞匹配
    for (const [type, keywords] of Object.entries(DEFAULT_INTEREST_SIGNALS)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          return {
            type: type as InterestSignal['type'],
            keyword,
            confidence: 0.8,
            message,
            detectedAt: new Date()
          };
        }
      }
    }
    
    return null;
  }
  
  /**
   * 🆕 Phase2: AI 增強興趣信號檢測
   * 使用 AI 分析消息語義，識別更複雜的購買意向
   */
  async detectInterestSignalWithAI(message: string, conversationHistory: string[] = []): Promise<InterestSignal | null> {
    // 首先嘗試關鍵詞匹配（快速）
    const quickMatch = this.detectInterestSignal(message);
    if (quickMatch && quickMatch.confidence >= 0.8) {
      return quickMatch;
    }
    
    // 對於不確定的情況，使用 AI 分析
    return new Promise((resolve) => {
      const context = conversationHistory.slice(-5).join('\n');
      
      this.ipc.send('ai:analyze-interest', {
        message,
        context,
        analysisType: 'interest_signal'
      });
      
      const cleanup = this.ipc.on('ai:analyze-interest-result', (data: any) => {
        cleanup();
        
        if (data.success && data.hasInterest) {
          resolve({
            type: this.mapAISignalType(data.signalType),
            keyword: data.keyPhrase || message.substring(0, 20),
            confidence: data.confidence || 0.7,
            message,
            detectedAt: new Date()
          });
        } else {
          resolve(null);
        }
      });
      
      // 超時回退到關鍵詞結果
      setTimeout(() => {
        cleanup();
        resolve(quickMatch);
      }, 5000);
    });
  }
  
  /**
   * 映射 AI 信號類型
   */
  private mapAISignalType(aiType: string): InterestSignal['type'] {
    const mapping: Record<string, InterestSignal['type']> = {
      'price': 'price_inquiry',
      'buying': 'purchase_intent',
      'positive': 'positive_feedback',
      'detail': 'product_detail',
      'compare': 'comparison'
    };
    return mapping[aiType] || 'positive_feedback';
  }
  
  /**
   * 🆕 Phase2: 分析對話階段
   * 判斷當前對話處於哪個銷售階段
   */
  analyzeConversationStage(messages: { fromUser: boolean; text: string }[]): {
    stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase';
    confidence: number;
    nextAction: string;
  } {
    const userMessages = messages.filter(m => m.fromUser).map(m => m.text.toLowerCase());
    const lastUserMessage = userMessages[userMessages.length - 1] || '';
    
    // 購買階段檢測
    if (this.containsAny(lastUserMessage, ['怎麼付款', '下單', '購買', '付錢', '轉帳'])) {
      return { stage: 'purchase', confidence: 0.9, nextAction: '提供付款方式' };
    }
    
    // 意向階段
    if (this.containsAny(lastUserMessage, ['多少錢', '價格', '優惠', '折扣', '便宜'])) {
      return { stage: 'intent', confidence: 0.85, nextAction: '報價並強調價值' };
    }
    
    // 考慮階段
    if (this.containsAny(lastUserMessage, ['有什麼', '能做什麼', '功能', '詳細', '了解'])) {
      return { stage: 'consideration', confidence: 0.8, nextAction: '詳細介紹產品' };
    }
    
    // 興趣階段
    if (this.containsAny(lastUserMessage, ['不錯', '可以', '挺好', '感興趣'])) {
      return { stage: 'interest', confidence: 0.7, nextAction: '挖掘需求' };
    }
    
    // 認知階段
    return { stage: 'awareness', confidence: 0.6, nextAction: '建立信任' };
  }
  
  /**
   * 輔助：檢查是否包含任一關鍵詞
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(k => text.includes(k));
  }
  
  /**
   * 🆕 Phase2: 計算轉化概率
   */
  calculateConversionProbability(execution: WorkflowExecution): number {
    let probability = 0.3;  // 基礎概率
    
    const stepResults = execution.stepResults;
    
    // AI 策劃成功 +10%
    if (stepResults['plan']?.status === 'success') {
      probability += 0.1;
    }
    
    // 私聊開始 +15%
    if (stepResults['private_chat']?.status === 'success') {
      probability += 0.15;
    }
    
    // 檢測到興趣信號 +25%
    if (stepResults['detect_interest']?.status === 'success') {
      probability += 0.25;
      
      // 如果是購買意向信號，額外 +15%
      const signal = stepResults['detect_interest']?.data as InterestSignal;
      if (signal?.type === 'purchase_intent' || signal?.type === 'price_inquiry') {
        probability += 0.15;
      }
    }
    
    // 建群成功 +10%
    if (stepResults['create_group']?.status === 'success') {
      probability += 0.1;
    }
    
    return Math.min(0.95, probability);
  }
  
  /**
   * 檢查用戶是否在冷卻期
   */
  private isUserInCooldown(userId: string, cooldownMinutes: number): boolean {
    const lastTrigger = this.userCooldowns.get(userId);
    if (!lastTrigger) return false;
    
    const cooldownMs = cooldownMinutes * 60 * 1000;
    return Date.now() - lastTrigger.getTime() < cooldownMs;
  }
  
  /**
   * 獲取隨機延遲
   */
  private getRandomDelay(range: { min: number; max: number }): number {
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }
  
  /**
   * 創建執行實例
   */
  private createExecution(workflow: AutomationWorkflow, userData: any, intentScore: number): WorkflowExecution {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId: workflow.id,
      targetUserId: userData.userId,
      targetUserName: userData.username || userData.firstName || 'User',
      currentStep: workflow.steps[0].id,
      status: 'pending',
      stepResults: {},
      startedAt: new Date(),
      updatedAt: new Date()
    };
    
    this._executions.update(map => {
      const newMap = new Map(map);
      newMap.set(execution.id, execution);
      return newMap;
    });
    
    return execution;
  }
  
  /**
   * 更新執行實例
   */
  private updateExecution(id: string, updates: Partial<WorkflowExecution>): void {
    this._executions.update(map => {
      const newMap = new Map(map);
      const execution = newMap.get(id);
      if (execution) {
        newMap.set(id, { ...execution, ...updates, updatedAt: new Date() });
      }
      return newMap;
    });
  }
  
  /**
   * 更新執行步驟結果
   */
  private updateExecutionStep(executionId: string, stepId: string, result: StepResult): void {
    this._executions.update(map => {
      const newMap = new Map(map);
      const execution = newMap.get(executionId);
      if (execution) {
        newMap.set(executionId, {
          ...execution,
          stepResults: { ...execution.stepResults, [stepId]: result },
          updatedAt: new Date()
        });
      }
      return newMap;
    });
  }
  
  /**
   * 推進到下一步
   */
  private advanceToStep(executionId: string, nextStepId: string): void {
    this.updateExecution(executionId, { currentStep: nextStepId });
    
    // 延遲執行下一步
    setTimeout(() => {
      this.executeWorkflow(executionId);
    }, 1000);
  }
  
  /**
   * 更新工作流統計
   */
  private updateWorkflowStats(workflowId: string, type: 'trigger' | 'conversion'): void {
    this._workflows.update(workflows => 
      workflows.map(w => {
        if (w.id !== workflowId) return w;
        
        return {
          ...w,
          stats: {
            ...w.stats,
            totalTriggers: w.stats.totalTriggers + (type === 'trigger' ? 1 : 0),
            todayTriggers: w.stats.todayTriggers + (type === 'trigger' ? 1 : 0),
            conversions: w.stats.conversions + (type === 'conversion' ? 1 : 0),
            lastTriggeredAt: type === 'trigger' ? new Date() : w.stats.lastTriggeredAt
          },
          updatedAt: new Date()
        };
      })
    );
    
    this.saveToStorage();
  }
  
  // ============ 公開 API ============
  
  /**
   * 啟用/禁用工作流
   */
  toggleWorkflow(id: string, enabled: boolean): void {
    this._workflows.update(workflows =>
      workflows.map(w => w.id === id ? { ...w, enabled, updatedAt: new Date() } : w)
    );
    
    this.saveToStorage();
    this.toast.success(enabled ? '✅ 工作流已啟用' : '⏸️ 工作流已暫停');
  }
  
  /**
   * 手動觸發工作流（用於測試）
   */
  manualTrigger(workflowId: string, targetUser: { userId: string; username: string }): void {
    const workflow = this._workflows().find(w => w.id === workflowId);
    if (!workflow) {
      this.toast.error('找不到工作流');
      return;
    }
    
    this.tryTriggerWorkflow(workflow, {
      ...targetUser,
      messagePreview: '手動觸發',
      manual: true
    });
  }
  
  /**
   * 取消執行
   */
  cancelExecution(id: string): void {
    this.updateExecution(id, { status: 'cancelled', completedAt: new Date() });
    this.toast.info('已取消工作流執行');
  }
  
  /**
   * 獲取執行詳情
   */
  getExecution(id: string): WorkflowExecution | undefined {
    return this._executions().get(id);
  }
  
  // ============ 持久化 ============
  
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._workflows()));
    } catch (e) {
      console.error('[AutomationWorkflow] 保存失敗:', e);
    }
  }
  
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const workflows = JSON.parse(saved);
        this._workflows.set(workflows.map((w: any) => ({
          ...w,
          createdAt: new Date(w.createdAt),
          updatedAt: new Date(w.updatedAt),
          stats: {
            ...w.stats,
            lastTriggeredAt: w.stats.lastTriggeredAt ? new Date(w.stats.lastTriggeredAt) : undefined
          }
        })));
      }
    } catch (e) {
      console.error('[AutomationWorkflow] 載入失敗:', e);
    }
  }
  
  /**
   * 清理
   */
  destroy(): void {
    this.ipcCleanups.forEach(cleanup => cleanup());
  }
}
