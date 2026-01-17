/**
 * TG-AI智控王 觸發器系統
 * Trigger System v1.0
 * 
 * 功能：
 * - 靈活的條件定義
 * - 多種觸發事件
 * - 自定義動作執行
 * - 條件組合與邏輯
 * - 觸發日誌記錄
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IntentAnalyzer, MessageAnalysis, IntentCategory, UrgencyLevel } from './intent-analyzer';

// ============ 類型定義 ============

export type TriggerEvent = 
  | 'message_received'     // 收到消息
  | 'member_joined'        // 成員加入
  | 'member_left'          // 成員離開
  | 'keyword_detected'     // 關鍵詞檢測
  | 'intent_detected'      // 意圖檢測
  | 'sentiment_detected'   // 情感檢測
  | 'time_based'           // 定時觸發
  | 'quota_reached'        // 配額達到
  | 'error_occurred'       // 錯誤發生
  | 'manual';              // 手動觸發

export type ActionType = 
  | 'send_message'         // 發送消息
  | 'send_template'        // 發送模板
  | 'ai_reply'             // AI 回覆
  | 'add_tag'              // 添加標籤
  | 'remove_tag'           // 移除標籤
  | 'move_to_group'        // 移動到群組
  | 'export_data'          // 導出數據
  | 'notify_admin'         // 通知管理員
  | 'log_event'            // 記錄事件
  | 'execute_workflow'     // 執行工作流
  | 'execute_batch'        // 執行批量操作
  | 'batch_message'        // 批量發送消息
  | 'batch_invite'         // 批量邀請成員
  | 'webhook'              // 調用 Webhook
  | 'custom';              // 自定義動作

export type ConditionOperator = 
  | 'equals'               // 等於
  | 'not_equals'           // 不等於
  | 'contains'             // 包含
  | 'not_contains'         // 不包含
  | 'starts_with'          // 開頭是
  | 'ends_with'            // 結尾是
  | 'matches_regex'        // 正則匹配
  | 'greater_than'         // 大於
  | 'less_than'            // 小於
  | 'in_list'              // 在列表中
  | 'not_in_list';         // 不在列表中

export type LogicOperator = 'and' | 'or';

export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

export interface ConditionGroup {
  id: string;
  logic: LogicOperator;
  conditions: (Condition | ConditionGroup)[];
}

export interface TriggerAction {
  id: string;
  type: ActionType;
  params: Record<string, any>;
  delay?: number;  // 延遲執行（毫秒）
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export interface Trigger {
  id: string;
  name: string;
  description?: string;
  
  // 事件
  event: TriggerEvent;
  eventFilter?: Record<string, any>;
  
  // 條件
  conditions?: ConditionGroup;
  
  // 動作
  actions: TriggerAction[];
  
  // 設置
  enabled: boolean;
  priority: number;
  cooldown?: number;  // 冷卻時間（毫秒）
  maxExecutions?: number;  // 最大執行次數
  
  // 統計
  stats: {
    executionCount: number;
    lastExecutedAt?: Date;
    successCount: number;
    failureCount: number;
  };
  
  // 元數據
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface TriggerContext {
  event: TriggerEvent;
  data: Record<string, any>;
  analysis?: MessageAnalysis;
  timestamp: Date;
}

export interface TriggerLog {
  id: string;
  triggerId: string;
  triggerName: string;
  event: TriggerEvent;
  context: Record<string, any>;
  actionsExecuted: {
    actionId: string;
    actionType: ActionType;
    success: boolean;
    result?: any;
    error?: string;
    duration: number;
  }[];
  success: boolean;
  executedAt: Date;
}

// ============ 預設觸發器 ============

const DEFAULT_TRIGGERS: Partial<Trigger>[] = [
  {
    name: '歡迎新成員',
    description: '當有新成員加入群組時自動發送歡迎消息',
    event: 'member_joined',
    actions: [
      {
        id: 'action_welcome',
        type: 'send_template',
        params: { templateName: '歡迎新成員' }
      }
    ],
    enabled: true,
    priority: 10
  },
  {
    name: '負面情感警報',
    description: '檢測到強烈負面情感時通知管理員',
    event: 'sentiment_detected',
    eventFilter: { sentiment: 'negative', threshold: 0.7 },
    actions: [
      {
        id: 'action_notify',
        type: 'notify_admin',
        params: { message: '檢測到強烈負面情感' }
      },
      {
        id: 'action_tag',
        type: 'add_tag',
        params: { tag: 'needs_attention' }
      }
    ],
    enabled: true,
    priority: 20
  },
  {
    name: '投訴自動回覆',
    description: '檢測到投訴意圖時自動回覆並標記',
    event: 'intent_detected',
    eventFilter: { intent: 'complaint' },
    actions: [
      {
        id: 'action_reply',
        type: 'send_template',
        params: { templateName: '處理投訴' }
      },
      {
        id: 'action_tag',
        type: 'add_tag',
        params: { tag: 'complaint' }
      },
      {
        id: 'action_notify',
        type: 'notify_admin',
        params: { message: '收到客戶投訴', urgent: true }
      }
    ],
    enabled: true,
    priority: 30
  }
];

// ============ 配置 ============

const TRIGGER_CONFIG = {
  maxTriggersPerEvent: 10,
  defaultCooldown: 5000,  // 5 秒
  maxActionsPerTrigger: 10,
  logRetentionDays: 7,
  maxLogsToKeep: 1000
};

@Injectable({
  providedIn: 'root'
})
export class TriggerSystem {
  private intentAnalyzer = inject(IntentAnalyzer);
  
  // 觸發器列表
  private _triggers = signal<Trigger[]>([]);
  triggers = computed(() => this._triggers());
  
  // 觸發日誌
  private _logs = signal<TriggerLog[]>([]);
  logs = computed(() => this._logs());
  
  // 系統狀態
  private _isRunning = signal(true);
  isRunning = computed(() => this._isRunning());
  
  // 冷卻追蹤
  private cooldowns: Map<string, number> = new Map();
  
  // 執行計數
  private executionCounts: Map<string, number> = new Map();
  
  // 自定義動作處理器
  private customActionHandlers: Map<string, (params: any, context: TriggerContext) => Promise<any>> = new Map();
  
  // 計算屬性
  enabledTriggers = computed(() => this._triggers().filter(t => t.enabled));
  
  triggersByEvent = computed(() => {
    const map = new Map<TriggerEvent, Trigger[]>();
    for (const trigger of this._triggers()) {
      if (!trigger.enabled) continue;
      const list = map.get(trigger.event) || [];
      list.push(trigger);
      map.set(trigger.event, list);
    }
    return map;
  });
  
  constructor() {
    this.loadTriggers();
    this.loadLogs();
    this.registerDefaultHandlers();
  }
  
  // ============ 事件處理 ============
  
  /**
   * 處理事件
   */
  async handleEvent(event: TriggerEvent, data: Record<string, any>): Promise<TriggerLog[]> {
    if (!this._isRunning()) {
      console.log('[TriggerSystem] System is paused');
      return [];
    }
    
    const context: TriggerContext = {
      event,
      data,
      timestamp: new Date()
    };
    
    // 如果是消息事件，進行分析
    if (event === 'message_received' && data.text) {
      context.analysis = this.intentAnalyzer.analyze(data.text);
      
      // 觸發額外的意圖和情感事件
      await this.handleIntentEvent(context);
      await this.handleSentimentEvent(context);
    }
    
    // 獲取匹配的觸發器
    const matchingTriggers = this.getMatchingTriggers(event, context);
    
    // 按優先級排序
    matchingTriggers.sort((a, b) => b.priority - a.priority);
    
    // 執行觸發器
    const logs: TriggerLog[] = [];
    for (const trigger of matchingTriggers) {
      const log = await this.executeTrigger(trigger, context);
      logs.push(log);
    }
    
    return logs;
  }
  
  /**
   * 處理意圖事件
   */
  private async handleIntentEvent(context: TriggerContext): Promise<void> {
    if (!context.analysis) return;
    
    const intentTriggers = this.getMatchingTriggers('intent_detected', {
      ...context,
      event: 'intent_detected',
      data: {
        ...context.data,
        intent: context.analysis.intent.intent,
        confidence: context.analysis.intent.confidence
      }
    });
    
    for (const trigger of intentTriggers) {
      await this.executeTrigger(trigger, {
        ...context,
        event: 'intent_detected'
      });
    }
  }
  
  /**
   * 處理情感事件
   */
  private async handleSentimentEvent(context: TriggerContext): Promise<void> {
    if (!context.analysis) return;
    
    const sentimentTriggers = this.getMatchingTriggers('sentiment_detected', {
      ...context,
      event: 'sentiment_detected',
      data: {
        ...context.data,
        sentiment: context.analysis.sentiment.sentiment,
        score: context.analysis.sentiment.score
      }
    });
    
    for (const trigger of sentimentTriggers) {
      await this.executeTrigger(trigger, {
        ...context,
        event: 'sentiment_detected'
      });
    }
  }
  
  /**
   * 獲取匹配的觸發器
   */
  private getMatchingTriggers(event: TriggerEvent, context: TriggerContext): Trigger[] {
    const triggers = this.triggersByEvent().get(event) || [];
    
    return triggers.filter(trigger => {
      // 檢查冷卻
      if (!this.checkCooldown(trigger)) return false;
      
      // 檢查最大執行次數
      if (!this.checkMaxExecutions(trigger)) return false;
      
      // 檢查事件過濾器
      if (!this.checkEventFilter(trigger, context)) return false;
      
      // 檢查條件
      if (!this.evaluateConditions(trigger.conditions, context)) return false;
      
      return true;
    });
  }
  
  /**
   * 執行觸發器
   */
  private async executeTrigger(trigger: Trigger, context: TriggerContext): Promise<TriggerLog> {
    console.log(`[TriggerSystem] Executing trigger: ${trigger.name}`);
    
    const log: TriggerLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      triggerId: trigger.id,
      triggerName: trigger.name,
      event: context.event,
      context: context.data,
      actionsExecuted: [],
      success: true,
      executedAt: new Date()
    };
    
    // 執行所有動作
    for (const action of trigger.actions) {
      const startTime = Date.now();
      
      try {
        // 延遲執行
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay));
        }
        
        // 執行動作
        const result = await this.executeAction(action, context);
        
        log.actionsExecuted.push({
          actionId: action.id,
          actionType: action.type,
          success: true,
          result,
          duration: Date.now() - startTime
        });
        
      } catch (error: any) {
        console.error(`[TriggerSystem] Action failed: ${action.type}`, error);
        
        log.actionsExecuted.push({
          actionId: action.id,
          actionType: action.type,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
        
        log.success = false;
        
        // 重試邏輯
        if (action.retryOnFailure && action.maxRetries) {
          // 可以實現重試邏輯
        }
      }
    }
    
    // 更新觸發器統計
    this.updateTriggerStats(trigger.id, log.success);
    
    // 更新冷卻
    this.setCooldown(trigger);
    
    // 更新執行計數
    this.incrementExecutionCount(trigger.id);
    
    // 保存日誌
    this.addLog(log);
    
    return log;
  }
  
  /**
   * 執行動作
   */
  private async executeAction(action: TriggerAction, context: TriggerContext): Promise<any> {
    const handler = this.getActionHandler(action.type);
    
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }
    
    return await handler(action.params, context);
  }
  
  // ============ 條件評估 ============
  
  /**
   * 評估條件組
   */
  private evaluateConditions(
    conditionGroup: ConditionGroup | undefined,
    context: TriggerContext
  ): boolean {
    if (!conditionGroup) return true;
    
    const results: boolean[] = [];
    
    for (const item of conditionGroup.conditions) {
      if ('logic' in item) {
        // 嵌套條件組
        results.push(this.evaluateConditions(item, context));
      } else {
        // 單個條件
        results.push(this.evaluateCondition(item, context));
      }
    }
    
    if (conditionGroup.logic === 'and') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }
  
  /**
   * 評估單個條件
   */
  private evaluateCondition(condition: Condition, context: TriggerContext): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    const compareValue = condition.value;
    
    // 處理大小寫
    const processString = (val: any) => {
      if (typeof val === 'string' && !condition.caseSensitive) {
        return val.toLowerCase();
      }
      return val;
    };
    
    const actual = processString(fieldValue);
    const expected = processString(compareValue);
    
    switch (condition.operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'starts_with':
        return String(actual).startsWith(String(expected));
      case 'ends_with':
        return String(actual).endsWith(String(expected));
      case 'matches_regex':
        return new RegExp(expected).test(String(actual));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'in_list':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in_list':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }
  
  /**
   * 獲取字段值
   */
  private getFieldValue(field: string, context: TriggerContext): any {
    const parts = field.split('.');
    let value: any = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }
  
  /**
   * 檢查事件過濾器
   */
  private checkEventFilter(trigger: Trigger, context: TriggerContext): boolean {
    if (!trigger.eventFilter) return true;
    
    for (const [key, expected] of Object.entries(trigger.eventFilter)) {
      const actual = context.data[key] || (context.analysis as any)?.[key];
      
      if (key === 'threshold') {
        // 閾值比較
        const score = Math.abs(context.analysis?.sentiment?.score || 0);
        if (score < expected) return false;
      } else if (actual !== expected) {
        return false;
      }
    }
    
    return true;
  }
  
  // ============ 冷卻和限制 ============
  
  private checkCooldown(trigger: Trigger): boolean {
    const lastExecution = this.cooldowns.get(trigger.id) || 0;
    const cooldown = trigger.cooldown || TRIGGER_CONFIG.defaultCooldown;
    return Date.now() - lastExecution >= cooldown;
  }
  
  private setCooldown(trigger: Trigger): void {
    this.cooldowns.set(trigger.id, Date.now());
  }
  
  private checkMaxExecutions(trigger: Trigger): boolean {
    if (!trigger.maxExecutions) return true;
    const count = this.executionCounts.get(trigger.id) || 0;
    return count < trigger.maxExecutions;
  }
  
  private incrementExecutionCount(triggerId: string): void {
    const count = this.executionCounts.get(triggerId) || 0;
    this.executionCounts.set(triggerId, count + 1);
  }
  
  // ============ 觸發器管理 ============
  
  /**
   * 創建觸發器
   */
  createTrigger(config: Omit<Trigger, 'id' | 'stats' | 'createdAt' | 'updatedAt'>): Trigger {
    const trigger: Trigger = {
      ...config,
      id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stats: {
        executionCount: 0,
        successCount: 0,
        failureCount: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._triggers.update(triggers => [...triggers, trigger]);
    this.saveTriggers();
    
    console.log(`[TriggerSystem] Created trigger: ${trigger.name}`);
    
    return trigger;
  }
  
  /**
   * 更新觸發器
   */
  updateTrigger(id: string, updates: Partial<Trigger>): boolean {
    const trigger = this._triggers().find(t => t.id === id);
    if (!trigger) return false;
    
    this._triggers.update(triggers =>
      triggers.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t)
    );
    this.saveTriggers();
    
    return true;
  }
  
  /**
   * 刪除觸發器
   */
  deleteTrigger(id: string): boolean {
    const exists = this._triggers().some(t => t.id === id);
    if (!exists) return false;
    
    this._triggers.update(triggers => triggers.filter(t => t.id !== id));
    this.saveTriggers();
    
    return true;
  }
  
  /**
   * 啟用觸發器
   */
  enableTrigger(id: string): boolean {
    return this.updateTrigger(id, { enabled: true });
  }
  
  /**
   * 禁用觸發器
   */
  disableTrigger(id: string): boolean {
    return this.updateTrigger(id, { enabled: false });
  }
  
  /**
   * 手動觸發
   */
  async manualTrigger(triggerId: string, data: Record<string, any> = {}): Promise<TriggerLog | null> {
    const trigger = this._triggers().find(t => t.id === triggerId);
    if (!trigger) return null;
    
    const context: TriggerContext = {
      event: 'manual',
      data,
      timestamp: new Date()
    };
    
    return await this.executeTrigger(trigger, context);
  }
  
  // ============ 動作處理器 ============
  
  /**
   * 獲取動作處理器
   */
  private getActionHandler(type: ActionType): ((params: any, context: TriggerContext) => Promise<any>) | undefined {
    // 自定義處理器優先
    const custom = this.customActionHandlers.get(type);
    if (custom) return custom;
    
    // 內置處理器
    const builtin: Record<ActionType, (params: any, context: TriggerContext) => Promise<any>> = {
      send_message: this.handleSendMessage.bind(this),
      send_template: this.handleSendTemplate.bind(this),
      ai_reply: this.handleAIReply.bind(this),
      add_tag: this.handleAddTag.bind(this),
      remove_tag: this.handleRemoveTag.bind(this),
      move_to_group: this.handleMoveToGroup.bind(this),
      export_data: this.handleExportData.bind(this),
      notify_admin: this.handleNotifyAdmin.bind(this),
      log_event: this.handleLogEvent.bind(this),
      execute_workflow: this.handleExecuteWorkflow.bind(this),
      execute_batch: this.handleExecuteBatch.bind(this),
      batch_message: this.handleBatchMessage.bind(this),
      batch_invite: this.handleBatchInvite.bind(this),
      webhook: this.handleWebhook.bind(this),
      custom: async () => {}
    };
    
    return builtin[type];
  }
  
  /**
   * 註冊自定義動作處理器
   */
  registerActionHandler(
    type: string,
    handler: (params: any, context: TriggerContext) => Promise<any>
  ): void {
    this.customActionHandlers.set(type, handler);
  }
  
  /**
   * 註冊默認處理器
   */
  private registerDefaultHandlers(): void {
    // 這些處理器在實際應用中會連接到真實的服務
  }
  
  // ============ 內置動作處理器 ============
  
  private async handleSendMessage(params: { message: string; peerId?: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Sending message: ${params.message}`);
    return { sent: true, message: params.message };
  }
  
  private async handleSendTemplate(params: { templateName: string; variables?: Record<string, string> }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Sending template: ${params.templateName}`);
    return { sent: true, template: params.templateName };
  }
  
  private async handleAIReply(params: { style?: string; maxLength?: number }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Generating AI reply`);
    return { generated: true };
  }
  
  private async handleAddTag(params: { tag: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Adding tag: ${params.tag}`);
    return { tagged: true, tag: params.tag };
  }
  
  private async handleRemoveTag(params: { tag: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Removing tag: ${params.tag}`);
    return { untagged: true, tag: params.tag };
  }
  
  private async handleMoveToGroup(params: { groupId: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Moving to group: ${params.groupId}`);
    return { moved: true, groupId: params.groupId };
  }
  
  private async handleExportData(params: { format?: string; fields?: string[] }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Exporting data`);
    return { exported: true };
  }
  
  private async handleNotifyAdmin(params: { message: string; urgent?: boolean }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Notifying admin: ${params.message}`);
    return { notified: true, message: params.message };
  }
  
  private async handleLogEvent(params: { message: string; level?: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Logging event: ${params.message}`);
    return { logged: true };
  }
  
  private async handleExecuteWorkflow(params: { workflowId: string }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Executing workflow: ${params.workflowId}`);
    return { executed: true, workflowId: params.workflowId };
  }
  
  private async handleWebhook(params: { url: string; method?: string; body?: any }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Calling webhook: ${params.url}`);
    // const response = await fetch(params.url, { method: params.method || 'POST', body: JSON.stringify(params.body) });
    return { called: true, url: params.url };
  }
  
  private async handleExecuteBatch(params: { 
    operationType: 'message' | 'invite' | 'tag';
    targetMembers?: string[];
    memberSource?: 'context' | 'group' | 'list';
    groupId?: string;
    messageTemplate?: string;
    targetGroupId?: string;
    priority?: 'high' | 'normal' | 'low';
    useAccountRotation?: boolean;
  }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Executing batch operation: ${params.operationType}`);
    
    // 這裡會通過 BatchAutomationBridge 服務來執行
    // 暫時返回模擬結果
    return { 
      queued: true, 
      operationType: params.operationType,
      memberCount: params.targetMembers?.length ?? 0,
      priority: params.priority ?? 'normal'
    };
  }
  
  private async handleBatchMessage(params: {
    memberSource: 'context' | 'group' | 'list';
    groupId?: string;
    memberIds?: string[];
    messageTemplate: string;
    messageVariables?: Record<string, string>;
    priority?: 'high' | 'normal' | 'low';
    delayMin?: number;
    delayMax?: number;
    useAccountRotation?: boolean;
  }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Batch message operation`);
    
    return { 
      queued: true, 
      operationType: 'message',
      source: params.memberSource,
      priority: params.priority ?? 'normal'
    };
  }
  
  private async handleBatchInvite(params: {
    memberSource: 'context' | 'group' | 'list';
    sourceGroupId?: string;
    memberIds?: string[];
    targetGroupId: string;
    priority?: 'high' | 'normal' | 'low';
    delayMin?: number;
    delayMax?: number;
    useAccountRotation?: boolean;
  }, context: TriggerContext): Promise<any> {
    console.log(`[TriggerSystem] Batch invite operation to ${params.targetGroupId}`);
    
    return { 
      queued: true, 
      operationType: 'invite',
      targetGroup: params.targetGroupId,
      priority: params.priority ?? 'normal'
    };
  }
  
  // ============ 統計和日誌 ============
  
  private updateTriggerStats(triggerId: string, success: boolean): void {
    this._triggers.update(triggers =>
      triggers.map(t => {
        if (t.id !== triggerId) return t;
        return {
          ...t,
          stats: {
            executionCount: t.stats.executionCount + 1,
            lastExecutedAt: new Date(),
            successCount: t.stats.successCount + (success ? 1 : 0),
            failureCount: t.stats.failureCount + (success ? 0 : 1)
          }
        };
      })
    );
  }
  
  private addLog(log: TriggerLog): void {
    this._logs.update(logs => {
      const newLogs = [log, ...logs];
      // 限制日誌數量
      if (newLogs.length > TRIGGER_CONFIG.maxLogsToKeep) {
        return newLogs.slice(0, TRIGGER_CONFIG.maxLogsToKeep);
      }
      return newLogs;
    });
    this.saveLogs();
  }
  
  /**
   * 獲取觸發器統計
   */
  getTriggerStats(triggerId: string): Trigger['stats'] | null {
    const trigger = this._triggers().find(t => t.id === triggerId);
    return trigger?.stats || null;
  }
  
  /**
   * 獲取觸發器日誌
   */
  getTriggerLogs(triggerId: string, limit: number = 50): TriggerLog[] {
    return this._logs()
      .filter(l => l.triggerId === triggerId)
      .slice(0, limit);
  }
  
  // ============ 系統控制 ============
  
  /**
   * 暫停系統
   */
  pause(): void {
    this._isRunning.set(false);
    console.log('[TriggerSystem] System paused');
  }
  
  /**
   * 恢復系統
   */
  resume(): void {
    this._isRunning.set(true);
    console.log('[TriggerSystem] System resumed');
  }
  
  /**
   * 重置執行計數
   */
  resetExecutionCounts(): void {
    this.executionCounts.clear();
  }
  
  // ============ 持久化 ============
  
  private saveTriggers(): void {
    localStorage.setItem('tgai-triggers', JSON.stringify(this._triggers()));
  }
  
  private loadTriggers(): void {
    try {
      const data = localStorage.getItem('tgai-triggers');
      if (data) {
        const triggers = JSON.parse(data).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          stats: {
            ...t.stats,
            lastExecutedAt: t.stats.lastExecutedAt ? new Date(t.stats.lastExecutedAt) : undefined
          }
        }));
        this._triggers.set(triggers);
      } else {
        // 載入默認觸發器
        const triggers = DEFAULT_TRIGGERS.map((t, i) => ({
          ...t,
          id: `trigger_default_${i}`,
          stats: {
            executionCount: 0,
            successCount: 0,
            failureCount: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        })) as Trigger[];
        this._triggers.set(triggers);
      }
    } catch (e) {}
  }
  
  private saveLogs(): void {
    localStorage.setItem('tgai-trigger-logs', JSON.stringify(this._logs().slice(0, 200)));
  }
  
  private loadLogs(): void {
    try {
      const data = localStorage.getItem('tgai-trigger-logs');
      if (data) {
        const logs = JSON.parse(data).map((l: any) => ({
          ...l,
          executedAt: new Date(l.executedAt)
        }));
        this._logs.set(logs);
      }
    } catch (e) {}
  }
}
