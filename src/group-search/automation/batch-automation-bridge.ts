/**
 * TG-AI智控王 批量操作與自動化中心橋接服務
 * Batch Automation Bridge v1.0
 * 
 * 功能：
 * - 連接 BatchOperator 與 TriggerSystem
 * - 連接 BatchOperator 與 WorkflowEngine
 * - 統一的批量操作調度
 * - 操作狀態同步
 * - 事件傳遞
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { BatchOperator, BatchOperationEvent, OperationPriority, RotationStrategy } from '../engines/batch-operator';
import { TriggerSystem, TriggerContext, TriggerAction } from './trigger-system';
import { WorkflowEngine } from './workflow-engine';
import { MemberBasicInfo, BatchOperationType, BatchOperation } from '../search.types';

// ============ 類型定義 ============

export interface BatchJobConfig {
  type: BatchOperationType;
  members: MemberBasicInfo[];
  
  // 消息配置
  messageTemplate?: string;
  messageVariables?: Record<string, string>;
  
  // 邀請配置
  targetGroupId?: string;
  
  // 標籤配置
  tags?: string[];
  
  // 通用配置
  priority?: OperationPriority;
  rotationStrategy?: RotationStrategy;
  enableAccountRotation?: boolean;
  maxAccountsToUse?: number;
  delayMin?: number;
  delayMax?: number;
  dailyLimit?: number;
  
  // 來源信息
  source?: 'trigger' | 'workflow' | 'manual' | 'api';
  sourceId?: string;  // 觸發器ID或工作流ID
}

export interface BatchJobStatus {
  jobId: string;
  operationId: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  source: BatchJobConfig['source'];
  sourceId?: string;
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface AutomationBatchContext {
  triggerId?: string;
  triggerName?: string;
  workflowId?: string;
  workflowName?: string;
  nodeId?: string;
  nodeName?: string;
  originalContext?: TriggerContext;
}

// ============ 服務 ============

@Injectable({
  providedIn: 'root'
})
export class BatchAutomationBridge implements OnDestroy {
  private batchOperator = inject(BatchOperator);
  private triggerSystem = inject(TriggerSystem);
  private workflowEngine = inject(WorkflowEngine);
  
  // 作業追蹤
  private _activeJobs = signal<Map<string, BatchJobStatus>>(new Map());
  private _jobHistory = signal<BatchJobStatus[]>([]);
  
  // 事件訂閱清理
  private eventUnsubscribes: (() => void)[] = [];
  
  // 計算屬性
  activeJobs = computed(() => Array.from(this._activeJobs().values()));
  jobHistory = computed(() => this._jobHistory());
  
  runningJobsCount = computed(() => {
    return this.activeJobs().filter(j => j.status === 'running').length;
  });
  
  queuedJobsCount = computed(() => {
    return this.activeJobs().filter(j => j.status === 'queued').length;
  });
  
  constructor() {
    this.initialize();
  }
  
  ngOnDestroy(): void {
    this.cleanup();
  }
  
  // ============ 初始化 ============
  
  private initialize(): void {
    // 訂閱批量操作事件
    this.subscribeToBatchEvents();
    
    // 註冊觸發器動作處理器
    this.registerTriggerHandlers();
    
    // 註冊工作流節點處理器
    this.registerWorkflowHandlers();
    
    console.log('[BatchAutomationBridge] Initialized');
  }
  
  private cleanup(): void {
    for (const unsubscribe of this.eventUnsubscribes) {
      unsubscribe();
    }
    this.eventUnsubscribes = [];
  }
  
  // ============ 事件訂閱 ============
  
  private subscribeToBatchEvents(): void {
    const events: Array<Parameters<typeof this.batchOperator.on>[0]> = [
      'operation_started',
      'operation_progress',
      'operation_paused',
      'operation_resumed',
      'operation_completed',
      'operation_failed',
      'account_switched',
      'quota_reached'
    ];
    
    for (const event of events) {
      const unsubscribe = this.batchOperator.on(event, (e) => this.handleBatchEvent(e));
      this.eventUnsubscribes.push(unsubscribe);
    }
  }
  
  private handleBatchEvent(event: BatchOperationEvent): void {
    const job = this.findJobByOperationId(event.operationId);
    if (!job) return;
    
    switch (event.type) {
      case 'operation_started':
        this.updateJobStatus(job.jobId, { status: 'running', startedAt: event.timestamp });
        break;
        
      case 'operation_progress':
        if (event.data.progress) {
          this.updateJobStatus(job.jobId, { progress: event.data.progress });
        }
        break;
        
      case 'operation_paused':
        this.updateJobStatus(job.jobId, { status: 'paused' });
        break;
        
      case 'operation_completed':
        this.updateJobStatus(job.jobId, { 
          status: 'completed', 
          completedAt: event.timestamp,
          progress: event.data.progress 
        });
        this.moveJobToHistory(job.jobId);
        break;
        
      case 'operation_failed':
        this.updateJobStatus(job.jobId, { 
          status: 'failed', 
          completedAt: event.timestamp,
          error: event.data.error 
        });
        this.moveJobToHistory(job.jobId);
        break;
    }
  }
  
  // ============ 觸發器整合 ============
  
  private registerTriggerHandlers(): void {
    // 註冊 execute_batch 動作處理器
    this.triggerSystem.registerActionHandler('execute_batch', async (params, context) => {
      return this.handleTriggerBatch(params, context);
    });
    
    // 註冊 batch_message 動作處理器
    this.triggerSystem.registerActionHandler('batch_message', async (params, context) => {
      return this.handleTriggerBatchMessage(params, context);
    });
    
    // 註冊 batch_invite 動作處理器
    this.triggerSystem.registerActionHandler('batch_invite', async (params, context) => {
      return this.handleTriggerBatchInvite(params, context);
    });
  }
  
  private async handleTriggerBatch(params: any, context: TriggerContext): Promise<any> {
    const members = await this.resolveMemberSource(params.memberSource, params, context);
    
    const job = await this.createAndQueueJob({
      type: params.operationType || 'message',
      members,
      messageTemplate: params.messageTemplate,
      targetGroupId: params.targetGroupId,
      priority: params.priority || 'normal',
      enableAccountRotation: params.useAccountRotation ?? true,
      source: 'trigger',
      sourceId: context.data.triggerId
    });
    
    return { queued: true, jobId: job.jobId, memberCount: members.length };
  }
  
  private async handleTriggerBatchMessage(params: any, context: TriggerContext): Promise<any> {
    const members = await this.resolveMemberSource(params.memberSource, params, context);
    
    const job = await this.createAndQueueJob({
      type: 'message',
      members,
      messageTemplate: params.messageTemplate,
      messageVariables: params.messageVariables,
      priority: params.priority || 'normal',
      delayMin: params.delayMin,
      delayMax: params.delayMax,
      enableAccountRotation: params.useAccountRotation ?? true,
      source: 'trigger',
      sourceId: context.data.triggerId
    });
    
    return { queued: true, jobId: job.jobId, memberCount: members.length };
  }
  
  private async handleTriggerBatchInvite(params: any, context: TriggerContext): Promise<any> {
    const members = await this.resolveMemberSource(params.memberSource, params, context);
    
    const job = await this.createAndQueueJob({
      type: 'invite',
      members,
      targetGroupId: params.targetGroupId,
      priority: params.priority || 'normal',
      delayMin: params.delayMin,
      delayMax: params.delayMax,
      enableAccountRotation: params.useAccountRotation ?? true,
      source: 'trigger',
      sourceId: context.data.triggerId
    });
    
    return { queued: true, jobId: job.jobId, memberCount: members.length };
  }
  
  // ============ 工作流整合 ============
  
  private registerWorkflowHandlers(): void {
    // 工作流節點的實際執行會在這裡處理
    // 通過監聽工作流事件並在適當時機調用批量操作
  }
  
  /**
   * 從工作流節點執行批量操作
   */
  async executeFromWorkflow(
    workflowId: string,
    nodeId: string,
    config: BatchJobConfig
  ): Promise<BatchJobStatus> {
    const workflow = this.workflowEngine.workflows().find(w => w.id === workflowId);
    const node = workflow?.nodes.find(n => n.id === nodeId);
    
    return this.createAndQueueJob({
      ...config,
      source: 'workflow',
      sourceId: workflowId
    });
  }
  
  // ============ 核心作業管理 ============
  
  /**
   * 創建並排隊批量作業
   */
  async createAndQueueJob(config: BatchJobConfig): Promise<BatchJobStatus> {
    // 創建批量操作
    const operation = this.batchOperator.createOperation(
      config.type,
      config.members,
      {
        messageTemplate: config.messageTemplate,
        messageVariables: config.messageVariables,
        targetGroupId: config.targetGroupId,
        priority: config.priority || 'normal',
        rotationStrategy: config.rotationStrategy || 'round_robin',
        enableAccountRotation: config.enableAccountRotation ?? true,
        maxAccountsToUse: config.maxAccountsToUse || 3,
        delayMin: config.delayMin,
        delayMax: config.delayMax,
        dailyLimit: config.dailyLimit,
        retryOnFail: true,
        smartAntiBlock: true
      }
    );
    
    // 創建作業狀態
    const jobStatus: BatchJobStatus = {
      jobId: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      operationId: operation.id,
      status: 'queued',
      source: config.source || 'manual',
      sourceId: config.sourceId,
      progress: operation.progress,
      createdAt: new Date()
    };
    
    // 添加到活動作業
    this._activeJobs.update(map => {
      const newMap = new Map(map);
      newMap.set(jobStatus.jobId, jobStatus);
      return newMap;
    });
    
    // 啟動操作
    this.batchOperator.startOperation(operation, (progress) => {
      this.updateJobStatus(jobStatus.jobId, { progress });
    });
    
    console.log(`[BatchAutomationBridge] Job created: ${jobStatus.jobId} from ${config.source}`);
    
    return jobStatus;
  }
  
  /**
   * 取消作業
   */
  cancelJob(jobId: string): boolean {
    const job = this._activeJobs().get(jobId);
    if (!job) return false;
    
    // 調用 BatchOperator 停止操作
    this.batchOperator.stop();
    
    this.updateJobStatus(jobId, { status: 'cancelled', completedAt: new Date() });
    this.moveJobToHistory(jobId);
    
    return true;
  }
  
  /**
   * 暫停作業
   */
  pauseJob(jobId: string): boolean {
    const job = this._activeJobs().get(jobId);
    if (!job || job.status !== 'running') return false;
    
    this.batchOperator.pause();
    this.updateJobStatus(jobId, { status: 'paused' });
    
    return true;
  }
  
  /**
   * 恢復作業
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this._activeJobs().get(jobId);
    if (!job || job.status !== 'paused') return false;
    
    await this.batchOperator.resume((progress) => {
      this.updateJobStatus(jobId, { progress });
    });
    
    this.updateJobStatus(jobId, { status: 'running' });
    
    return true;
  }
  
  /**
   * 獲取作業詳情
   */
  getJobStatus(jobId: string): BatchJobStatus | undefined {
    return this._activeJobs().get(jobId) || 
           this._jobHistory().find(j => j.jobId === jobId);
  }
  
  /**
   * 獲取來源的所有作業
   */
  getJobsBySource(source: BatchJobConfig['source'], sourceId?: string): BatchJobStatus[] {
    const allJobs = [...this.activeJobs(), ...this._jobHistory()];
    return allJobs.filter(j => 
      j.source === source && (!sourceId || j.sourceId === sourceId)
    );
  }
  
  // ============ 輔助方法 ============
  
  private async resolveMemberSource(
    source: 'context' | 'group' | 'list',
    params: any,
    context: TriggerContext
  ): Promise<MemberBasicInfo[]> {
    switch (source) {
      case 'context':
        // 從觸發上下文獲取成員
        return context.data.members || [];
        
      case 'list':
        // 從參數列表獲取成員ID並轉換
        const memberIds: string[] = params.memberIds || [];
        return memberIds.map(id => ({
          id,
          status: 'unknown' as const,
          role: 'member' as const,
          isBot: false
        }));
        
      case 'group':
        // 從群組提取成員（這裡需要調用 MemberExtractor）
        // 暫時返回空數組
        console.log(`[BatchAutomationBridge] Extracting members from group: ${params.groupId}`);
        return [];
        
      default:
        return [];
    }
  }
  
  private findJobByOperationId(operationId: string): BatchJobStatus | undefined {
    for (const job of this._activeJobs().values()) {
      if (job.operationId === operationId) {
        return job;
      }
    }
    return undefined;
  }
  
  private updateJobStatus(jobId: string, updates: Partial<BatchJobStatus>): void {
    this._activeJobs.update(map => {
      const newMap = new Map(map);
      const job = newMap.get(jobId);
      if (job) {
        newMap.set(jobId, { ...job, ...updates });
      }
      return newMap;
    });
  }
  
  private moveJobToHistory(jobId: string): void {
    const job = this._activeJobs().get(jobId);
    if (!job) return;
    
    // 從活動作業移除
    this._activeJobs.update(map => {
      const newMap = new Map(map);
      newMap.delete(jobId);
      return newMap;
    });
    
    // 添加到歷史
    this._jobHistory.update(history => [job, ...history.slice(0, 99)]);
  }
  
  // ============ 統計與報告 ============
  
  /**
   * 獲取統計摘要
   */
  getStatsSummary(): {
    activeJobs: number;
    queuedJobs: number;
    runningJobs: number;
    completedToday: number;
    failedToday: number;
    totalProcessed: number;
    totalSuccess: number;
    totalFailed: number;
  } {
    const active = this.activeJobs();
    const history = this._jobHistory();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayJobs = history.filter(j => 
      j.completedAt && new Date(j.completedAt) >= today
    );
    
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const job of [...active, ...history]) {
      totalProcessed += job.progress.processed;
      totalSuccess += job.progress.success;
      totalFailed += job.progress.failed;
    }
    
    return {
      activeJobs: active.length,
      queuedJobs: active.filter(j => j.status === 'queued').length,
      runningJobs: active.filter(j => j.status === 'running').length,
      completedToday: todayJobs.filter(j => j.status === 'completed').length,
      failedToday: todayJobs.filter(j => j.status === 'failed').length,
      totalProcessed,
      totalSuccess,
      totalFailed
    };
  }
}
