/**
 * TG-AI智控王 批量操作引擎
 * Batch Operator Engine v2.0
 * 
 * 功能：
 * - 批量發送消息
 * - 批量邀請成員
 * - 智能防封策略
 * - 任務隊列管理（優先級排序）
 * - 進度追蹤
 * - 多帳號輪換支持
 * - 自動化中心聯動
 */

import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { 
  MemberBasicInfo, 
  BatchOperation, 
  BatchOperationType, 
  BatchOperationConfig,
  BatchOperationStatus
} from '../search.types';
import { AccountManager, ManagedAccount } from '../multi-account/account-manager';

// ============ 配置 ============

const BATCH_CONFIG = {
  // 默認延遲範圍（秒）
  defaultDelay: { min: 30, max: 60 },
  // 每日默認上限
  defaultDailyLimit: 50,
  // 每小時上限
  hourlyLimit: 20,
  // 最大並行操作
  maxParallel: 1,
  // 失敗重試次數
  maxRetries: 2,
  // 失敗後等待時間（秒）
  retryDelay: 60,
  // 最大隊列長度
  maxQueueSize: 100,
  // 帳號切換閾值（連續失敗次數）
  accountSwitchThreshold: 3,
  // 帳號冷卻時間（分鐘）
  accountCooldownMinutes: 30
};

// 防封策略配置
const ANTI_BLOCK_CONFIG = {
  // 新帳號保護期（天）
  newAccountDays: 14,
  // 新帳號每日限制
  newAccountDailyLimit: 10,
  // 預熱模式每日增量
  warmupIncrement: 5,
  // 休息間隔（每 N 條消息後休息）
  restInterval: 10,
  // 休息時間（秒）
  restDuration: { min: 120, max: 300 },
  // 異常行為檢測閾值
  anomalyThreshold: 0.3,
  // 時間窗口內最大失敗率
  maxFailureRate: 0.2,
  // 帳號輪換每次操作數
  rotationInterval: 20
};

// 操作優先級
export type OperationPriority = 'high' | 'normal' | 'low';

// 帳號輪換策略
export type RotationStrategy = 'round_robin' | 'health_based' | 'random' | 'least_used';

// 擴展批量操作配置
export interface ExtendedBatchConfig extends BatchOperationConfig {
  priority: OperationPriority;
  accountIds?: string[];           // 指定使用的帳號
  rotationStrategy: RotationStrategy;
  enableAccountRotation: boolean;
  maxAccountsToUse: number;
  failureThreshold: number;        // 整體失敗閾值
  estimatedDuration?: number;      // 預估時長（分鐘）
}

// 操作事件類型
export type BatchEventType = 
  | 'operation_started'
  | 'operation_progress'
  | 'operation_paused'
  | 'operation_resumed'
  | 'operation_completed'
  | 'operation_failed'
  | 'account_switched'
  | 'account_cooldown'
  | 'quota_reached';

// 批量操作事件
export interface BatchOperationEvent {
  type: BatchEventType;
  operationId: string;
  timestamp: Date;
  data: Record<string, any>;
}

// 帳號使用統計
interface AccountUsageStats {
  accountId: string;
  messagesCount: number;
  successCount: number;
  failureCount: number;
  lastUsed: Date;
  cooldownUntil?: Date;
}

// 操作結果
interface OperationResult {
  memberId: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// 操作統計
interface OperationStats {
  today: {
    sent: number;
    success: number;
    failed: number;
    lastReset: Date;
  };
  thisHour: {
    sent: number;
    success: number;
    failed: number;
    lastReset: Date;
  };
  total: {
    sent: number;
    success: number;
    failed: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BatchOperator {
  private ngZone = inject(NgZone);
  private accountManager = inject(AccountManager);
  
  // TG 客戶端映射（帳號ID -> 客戶端）
  private tgClients: Map<string, any> = new Map();
  private currentClientId: string | null = null;
  
  // 當前操作
  private _currentOperation = signal<BatchOperation | null>(null);
  private _isOperating = signal(false);
  
  // 操作隊列（支持優先級排序）
  private _operationQueue = signal<BatchOperation[]>([]);
  
  // 統計
  private _stats = signal<OperationStats>({
    today: { sent: 0, success: 0, failed: 0, lastReset: new Date() },
    thisHour: { sent: 0, success: 0, failed: 0, lastReset: new Date() },
    total: { sent: 0, success: 0, failed: 0 }
  });
  
  // 操作結果日誌
  private _operationLog = signal<OperationResult[]>([]);
  
  // 停止標誌
  private stopFlag = false;
  private pauseFlag = false;
  
  // 帳號信息（用於防封）
  private accountCreatedAt: Date = new Date();
  private isWarmupMode = false;
  
  // 多帳號輪換相關
  private _accountUsageStats = signal<Map<string, AccountUsageStats>>(new Map());
  private currentAccountIndex = 0;
  private availableAccountIds: string[] = [];
  private consecutiveFailures = 0;
  
  // 事件監聽器
  private eventListeners: Map<BatchEventType, Set<(event: BatchOperationEvent) => void>> = new Map();
  
  // 操作歷史
  private _operationHistory = signal<BatchOperation[]>([]);
  
  // 計算屬性
  currentOperation = computed(() => this._currentOperation());
  isOperating = computed(() => this._isOperating());
  operationQueue = computed(() => this._operationQueue());
  stats = computed(() => this._stats());
  operationLog = computed(() => this._operationLog());
  operationHistory = computed(() => this._operationHistory());
  accountUsageStats = computed(() => this._accountUsageStats());
  
  // 隊列中的操作數量
  queuedCount = computed(() => this._operationQueue().length);
  
  // 獲取下一個可用帳號
  nextAvailableAccount = computed(() => {
    const accounts = this.accountManager.accounts().filter(
      a => a.status === 'active' && !this.isAccountInCooldown(a.id)
    );
    return accounts.length > 0 ? accounts[0] : null;
  });
  
  // 今日剩餘額度
  remainingToday = computed(() => {
    const stats = this._stats();
    const limit = this.getDailyLimit();
    return Math.max(0, limit - stats.today.sent);
  });
  
  // 本小時剩餘額度
  remainingThisHour = computed(() => {
    const stats = this._stats();
    return Math.max(0, BATCH_CONFIG.hourlyLimit - stats.thisHour.sent);
  });
  
  constructor() {
    this.loadStats();
    this.checkAndResetStats();
    this.initializeAccountStats();
  }
  
  // ============ 初始化 ============
  
  private initializeAccountStats(): void {
    const accounts = this.accountManager.accounts();
    const statsMap = new Map<string, AccountUsageStats>();
    
    for (const account of accounts) {
      statsMap.set(account.id, {
        accountId: account.id,
        messagesCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: new Date(0)
      });
    }
    
    this._accountUsageStats.set(statsMap);
  }
  
  /**
   * 設置 TG 客戶端（支持多帳號）
   */
  setClient(client: any, accountId?: string): void {
    if (accountId) {
      this.tgClients.set(accountId, client);
      if (!this.currentClientId) {
        this.currentClientId = accountId;
      }
    } else {
      // 向後兼容
      this.currentClientId = 'default';
      this.tgClients.set('default', client);
    }
  }
  
  /**
   * 獲取當前活動客戶端
   */
  getActiveClient(): any {
    return this.currentClientId ? this.tgClients.get(this.currentClientId) : null;
  }
  
  /**
   * 設置帳號創建時間（用於防封策略）
   */
  setAccountCreatedAt(date: Date): void {
    this.accountCreatedAt = date;
    const daysSinceCreation = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    this.isWarmupMode = daysSinceCreation < ANTI_BLOCK_CONFIG.newAccountDays;
  }
  
  // ============ 事件系統 ============
  
  /**
   * 訂閱事件
   */
  on(event: BatchEventType, callback: (event: BatchOperationEvent) => void): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
    
    // 返回取消訂閱函數
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }
  
  /**
   * 發送事件
   */
  private emit(type: BatchEventType, operationId: string, data: Record<string, any> = {}): void {
    const event: BatchOperationEvent = {
      type,
      operationId,
      timestamp: new Date(),
      data
    };
    
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (e) {
          console.error(`[BatchOperator] Event listener error:`, e);
        }
      });
    }
  }
  
  // ============ 多帳號輪換 ============
  
  /**
   * 設置可用帳號列表
   */
  setAvailableAccounts(accountIds: string[]): void {
    this.availableAccountIds = accountIds;
    this.currentAccountIndex = 0;
  }
  
  /**
   * 獲取下一個帳號（根據策略）
   */
  private getNextAccount(strategy: RotationStrategy): string | null {
    const activeAccounts = this.availableAccountIds.filter(id => !this.isAccountInCooldown(id));
    
    if (activeAccounts.length === 0) {
      return null;
    }
    
    switch (strategy) {
      case 'round_robin':
        this.currentAccountIndex = (this.currentAccountIndex + 1) % activeAccounts.length;
        return activeAccounts[this.currentAccountIndex];
        
      case 'health_based':
        // 選擇健康度最高的帳號
        const sortedByHealth = activeAccounts
          .map(id => {
            const account = this.accountManager.accounts().find(a => a.id === id);
            return { id, health: account?.healthScore ?? 0 };
          })
          .sort((a, b) => b.health - a.health);
        return sortedByHealth[0]?.id ?? null;
        
      case 'least_used':
        // 選擇使用次數最少的帳號
        const stats = this._accountUsageStats();
        const sortedByUsage = activeAccounts
          .map(id => ({ id, count: stats.get(id)?.messagesCount ?? 0 }))
          .sort((a, b) => a.count - b.count);
        return sortedByUsage[0]?.id ?? null;
        
      case 'random':
      default:
        return activeAccounts[Math.floor(Math.random() * activeAccounts.length)];
    }
  }
  
  /**
   * 切換到指定帳號
   */
  private async switchToAccount(accountId: string): Promise<boolean> {
    if (!this.tgClients.has(accountId)) {
      console.warn(`[BatchOperator] Client not found for account: ${accountId}`);
      return false;
    }
    
    const previousId = this.currentClientId;
    this.currentClientId = accountId;
    
    console.log(`[BatchOperator] Switched account: ${previousId} -> ${accountId}`);
    
    this.emit('account_switched', this._currentOperation()?.id ?? '', {
      previousAccount: previousId,
      newAccount: accountId
    });
    
    return true;
  }
  
  /**
   * 檢查帳號是否在冷卻中
   */
  private isAccountInCooldown(accountId: string): boolean {
    const stats = this._accountUsageStats().get(accountId);
    if (!stats?.cooldownUntil) return false;
    return new Date() < stats.cooldownUntil;
  }
  
  /**
   * 將帳號放入冷卻
   */
  private putAccountInCooldown(accountId: string): void {
    this._accountUsageStats.update(map => {
      const newMap = new Map(map);
      const stats = newMap.get(accountId);
      if (stats) {
        stats.cooldownUntil = new Date(Date.now() + BATCH_CONFIG.accountCooldownMinutes * 60 * 1000);
        newMap.set(accountId, stats);
      }
      return newMap;
    });
    
    this.emit('account_cooldown', this._currentOperation()?.id ?? '', {
      accountId,
      cooldownMinutes: BATCH_CONFIG.accountCooldownMinutes
    });
  }
  
  /**
   * 更新帳號使用統計
   */
  private updateAccountStats(accountId: string, success: boolean): void {
    this._accountUsageStats.update(map => {
      const newMap = new Map(map);
      const stats = newMap.get(accountId) ?? {
        accountId,
        messagesCount: 0,
        successCount: 0,
        failureCount: 0,
        lastUsed: new Date()
      };
      
      stats.messagesCount++;
      stats.lastUsed = new Date();
      if (success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }
      
      newMap.set(accountId, stats);
      return newMap;
    });
  }
  
  // ============ 批量操作 ============
  
  /**
   * 創建批量操作（支持擴展配置）
   */
  createOperation(
    type: BatchOperationType,
    members: MemberBasicInfo[],
    config: Partial<ExtendedBatchConfig>
  ): BatchOperation & { extendedConfig?: Partial<ExtendedBatchConfig> } {
    // 預估執行時間
    const avgDelay = ((config.delayMin ?? BATCH_CONFIG.defaultDelay.min) + 
                      (config.delayMax ?? BATCH_CONFIG.defaultDelay.max)) / 2;
    const estimatedMinutes = Math.ceil((members.length * avgDelay) / 60);
    
    const operation: BatchOperation & { extendedConfig?: Partial<ExtendedBatchConfig> } = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      targetMembers: members,
      config: {
        messageTemplate: config.messageTemplate,
        messageVariables: config.messageVariables,
        targetGroupId: config.targetGroupId,
        delayMin: config.delayMin ?? BATCH_CONFIG.defaultDelay.min,
        delayMax: config.delayMax ?? BATCH_CONFIG.defaultDelay.max,
        dailyLimit: config.dailyLimit ?? this.getDailyLimit(),
        retryOnFail: config.retryOnFail ?? true,
        smartAntiBlock: config.smartAntiBlock ?? true
      },
      extendedConfig: {
        priority: config.priority ?? 'normal',
        accountIds: config.accountIds,
        rotationStrategy: config.rotationStrategy ?? 'round_robin',
        enableAccountRotation: config.enableAccountRotation ?? true,
        maxAccountsToUse: config.maxAccountsToUse ?? 3,
        failureThreshold: config.failureThreshold ?? 0.3,
        estimatedDuration: estimatedMinutes
      },
      status: 'pending',
      progress: {
        total: members.length,
        processed: 0,
        success: 0,
        failed: 0
      },
      createdAt: new Date()
    };
    
    return operation;
  }
  
  /**
   * 預覽批量操作（不執行）
   */
  previewOperation(
    type: BatchOperationType,
    members: MemberBasicInfo[],
    config: Partial<ExtendedBatchConfig>
  ): {
    operation: BatchOperation;
    estimatedDuration: number;
    estimatedCost: number;
    warnings: string[];
    availableAccounts: number;
  } {
    const operation = this.createOperation(type, members, config);
    const warnings: string[] = [];
    
    // 檢查配額
    const remainingToday = this.remainingToday();
    if (members.length > remainingToday) {
      warnings.push(`目標成員 ${members.length} 人，超過今日剩餘配額 ${remainingToday} 人`);
    }
    
    // 檢查帳號
    const availableAccounts = this.accountManager.accounts().filter(
      a => a.status === 'active' && !this.isAccountInCooldown(a.id)
    ).length;
    
    if (availableAccounts === 0) {
      warnings.push('沒有可用的帳號，需要等待冷卻結束');
    } else if (availableAccounts < (config.maxAccountsToUse ?? 3)) {
      warnings.push(`可用帳號 ${availableAccounts} 個，少於建議的 ${config.maxAccountsToUse ?? 3} 個`);
    }
    
    // 預估費用（假設每條消息消耗 1 點配額）
    const estimatedCost = members.length;
    
    return {
      operation,
      estimatedDuration: operation.extendedConfig?.estimatedDuration ?? 0,
      estimatedCost,
      warnings,
      availableAccounts
    };
  }
  
  /**
   * 獲取隊列摘要
   */
  getQueueSummary(): {
    total: number;
    byPriority: Record<OperationPriority, number>;
    byType: Record<BatchOperationType, number>;
    estimatedTotalDuration: number;
  } {
    const queue = this._operationQueue();
    const byPriority: Record<OperationPriority, number> = { high: 0, normal: 0, low: 0 };
    const byType: Record<BatchOperationType, number> = { message: 0, invite: 0, tag: 0 };
    let totalDuration = 0;
    
    for (const op of queue) {
      const priority = (op as any).extendedConfig?.priority ?? 'normal';
      byPriority[priority]++;
      byType[op.type]++;
      totalDuration += (op as any).extendedConfig?.estimatedDuration ?? 0;
    }
    
    return {
      total: queue.length,
      byPriority,
      byType,
      estimatedTotalDuration: totalDuration
    };
  }
  
  /**
   * 開始批量操作（支持優先級隊列）
   */
  async startOperation(
    operation: BatchOperation,
    onProgress?: (progress: BatchOperation['progress']) => void
  ): Promise<BatchOperation> {
    // 檢查隊列大小
    if (this._operationQueue().length >= BATCH_CONFIG.maxQueueSize) {
      operation.status = 'failed';
      operation.error = '操作隊列已滿，請稍後再試';
      return operation;
    }
    
    // 檢查是否已有操作在運行
    if (this._isOperating()) {
      // 加入隊列（按優先級插入）
      this.enqueueWithPriority(operation);
      return operation;
    }
    
    // 檢查額度
    if (!this.canOperate()) {
      operation.status = 'failed';
      operation.error = '已達到今日/本小時操作上限';
      this.emit('quota_reached', operation.id, { 
        remainingToday: this.remainingToday(),
        remainingThisHour: this.remainingThisHour() 
      });
      return operation;
    }
    
    // 設置可用帳號
    const extConfig = (operation as any).extendedConfig as Partial<ExtendedBatchConfig> | undefined;
    if (extConfig?.enableAccountRotation) {
      const accountIds = extConfig.accountIds ?? 
        this.accountManager.accounts()
          .filter(a => a.status === 'active')
          .slice(0, extConfig.maxAccountsToUse ?? 3)
          .map(a => a.id);
      this.setAvailableAccounts(accountIds);
    }
    
    return this.executeOperation(operation, onProgress);
  }
  
  /**
   * 按優先級入隊
   */
  private enqueueWithPriority(operation: BatchOperation): void {
    const priority = (operation as any).extendedConfig?.priority ?? 'normal';
    const priorityOrder: Record<OperationPriority, number> = { high: 0, normal: 1, low: 2 };
    
    this._operationQueue.update(queue => {
      const newQueue = [...queue];
      
      // 找到插入位置
      let insertIndex = newQueue.length;
      for (let i = 0; i < newQueue.length; i++) {
        const queuedPriority = (newQueue[i] as any).extendedConfig?.priority ?? 'normal';
        if (priorityOrder[priority] < priorityOrder[queuedPriority]) {
          insertIndex = i;
          break;
        }
      }
      
      newQueue.splice(insertIndex, 0, operation);
      return newQueue;
    });
    
    console.log(`[BatchOperator] Operation queued at position ${this._operationQueue().indexOf(operation) + 1}`);
  }
  
  /**
   * 暫停操作
   */
  pause(): void {
    this.pauseFlag = true;
    const op = this._currentOperation();
    if (op) {
      op.status = 'paused';
      this._currentOperation.set({ ...op });
    }
  }
  
  /**
   * 繼續操作
   */
  async resume(
    onProgress?: (progress: BatchOperation['progress']) => void
  ): Promise<BatchOperation | null> {
    const op = this._currentOperation();
    if (!op || op.status !== 'paused') {
      return null;
    }
    
    this.pauseFlag = false;
    return this.executeOperation(op, onProgress);
  }
  
  /**
   * 停止操作
   */
  stop(): void {
    this.stopFlag = true;
    const op = this._currentOperation();
    if (op) {
      op.status = 'cancelled';
      this._currentOperation.set({ ...op });
    }
  }
  
  /**
   * 取消隊列中的操作
   */
  cancelQueued(operationId: string): void {
    this._operationQueue.update(queue => 
      queue.filter(op => op.id !== operationId)
    );
  }
  
  // ============ 核心執行邏輯 ============
  
  private async executeOperation(
    operation: BatchOperation,
    onProgress?: (progress: BatchOperation['progress']) => void
  ): Promise<BatchOperation> {
    operation.status = 'running';
    operation.startedAt = new Date();
    
    this._currentOperation.set(operation);
    this._isOperating.set(true);
    this.stopFlag = false;
    this.pauseFlag = false;
    this.consecutiveFailures = 0;
    
    const { targetMembers, config } = operation;
    const extConfig = (operation as any).extendedConfig as Partial<ExtendedBatchConfig> | undefined;
    let processed = operation.progress.processed;
    let success = operation.progress.success;
    let failed = operation.progress.failed;
    let operationsSinceRotation = 0;
    
    // 發送開始事件
    this.emit('operation_started', operation.id, {
      type: operation.type,
      targetCount: targetMembers.length,
      priority: extConfig?.priority ?? 'normal'
    });
    
    try {
      // 從上次位置繼續
      const startIndex = processed;
      
      for (let i = startIndex; i < targetMembers.length; i++) {
        // 檢查停止/暫停
        if (this.stopFlag || this.pauseFlag) {
          break;
        }
        
        // 檢查額度
        if (!this.canOperate()) {
          operation.status = 'paused';
          operation.error = '已達到操作上限，自動暫停';
          this.emit('quota_reached', operation.id, {
            remainingToday: this.remainingToday(),
            remainingThisHour: this.remainingThisHour()
          });
          break;
        }
        
        const member = targetMembers[i];
        
        // 多帳號輪換：檢查是否需要切換帳號
        if (extConfig?.enableAccountRotation && this.availableAccountIds.length > 1) {
          operationsSinceRotation++;
          
          // 達到輪換間隔或連續失敗超過閾值
          const shouldRotate = operationsSinceRotation >= ANTI_BLOCK_CONFIG.rotationInterval ||
                               this.consecutiveFailures >= BATCH_CONFIG.accountSwitchThreshold;
          
          if (shouldRotate) {
            const nextAccountId = this.getNextAccount(extConfig.rotationStrategy ?? 'round_robin');
            if (nextAccountId && nextAccountId !== this.currentClientId) {
              // 如果連續失敗太多，將當前帳號放入冷卻
              if (this.consecutiveFailures >= BATCH_CONFIG.accountSwitchThreshold && this.currentClientId) {
                this.putAccountInCooldown(this.currentClientId);
              }
              
              await this.switchToAccount(nextAccountId);
              operationsSinceRotation = 0;
              this.consecutiveFailures = 0;
            }
          }
        }
        
        // 智能防封：檢查是否需要休息
        if (config.smartAntiBlock && this.shouldRest(processed)) {
          await this.takeRest();
        }
        
        // 執行操作
        const result = await this.performOperation(operation.type, member, config);
        
        processed++;
        if (result.success) {
          success++;
          this.consecutiveFailures = 0;
        } else {
          failed++;
          this.consecutiveFailures++;
          
          // 記錄失敗
          this.logResult(member.id, false, result.error);
          
          // 智能防封：連續失敗檢測
          if (config.smartAntiBlock && this.isAnomalyDetected(this.consecutiveFailures, processed)) {
            console.log('[BatchOp] Anomaly detected, pausing...');
            operation.status = 'paused';
            operation.error = '檢測到異常，自動暫停以保護帳號';
            this.emit('operation_paused', operation.id, { reason: 'anomaly_detected' });
            break;
          }
          
          // 檢查整體失敗率是否超過閾值
          const failureRate = failed / processed;
          if (extConfig?.failureThreshold && failureRate > extConfig.failureThreshold) {
            operation.status = 'paused';
            operation.error = `失敗率 ${(failureRate * 100).toFixed(1)}% 超過閾值 ${(extConfig.failureThreshold * 100).toFixed(1)}%`;
            this.emit('operation_paused', operation.id, { reason: 'failure_threshold_exceeded', failureRate });
            break;
          }
          
          // 重試邏輯
          if (config.retryOnFail && this.consecutiveFailures <= BATCH_CONFIG.maxRetries) {
            await this.delay(BATCH_CONFIG.retryDelay * 1000);
            i--;  // 重試當前成員
            continue;
          }
        }
        
        // 更新帳號使用統計
        if (this.currentClientId) {
          this.updateAccountStats(this.currentClientId, result.success);
        }
        
        // 更新進度
        operation.progress = { total: targetMembers.length, processed, success, failed };
        
        this.ngZone.run(() => {
          this._currentOperation.set({ ...operation });
          onProgress?.(operation.progress);
          
          // 發送進度事件（每 10 條發送一次）
          if (processed % 10 === 0) {
            this.emit('operation_progress', operation.id, {
              progress: operation.progress,
              currentAccount: this.currentClientId
            });
          }
        });
        
        // 更新統計
        this.updateStats(result.success);
        
        // 延遲
        const delay = this.calculateDelay(config, processed);
        await this.delay(delay);
      }
      
      // 完成
      if (operation.status === 'running') {
        operation.status = 'completed';
        this.emit('operation_completed', operation.id, {
          progress: operation.progress,
          duration: Date.now() - operation.startedAt!.getTime()
        });
      }
      operation.completedAt = new Date();
      
    } catch (error: any) {
      console.error('[BatchOp] Operation error:', error);
      operation.status = 'failed';
      operation.error = error.message;
      this.emit('operation_failed', operation.id, { error: error.message });
    } finally {
      this._isOperating.set(false);
      this._currentOperation.set({ ...operation });
      
      // 保存到歷史
      this._operationHistory.update(history => [operation, ...history.slice(0, 99)]);
      
      // 處理隊列中的下一個操作
      this.processQueue();
    }
    
    return operation;
  }
  
  private async performOperation(
    type: BatchOperationType,
    member: MemberBasicInfo,
    config: BatchOperationConfig
  ): Promise<{ success: boolean; error?: string }> {
    try {
      switch (type) {
        case 'message':
          return await this.sendMessage(member, config);
        case 'invite':
          return await this.inviteMember(member, config);
        case 'tag':
          return { success: true };  // 標籤操作在本地處理
        default:
          return { success: false, error: '未知操作類型' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  private async sendMessage(
    member: MemberBasicInfo,
    config: BatchOperationConfig
  ): Promise<{ success: boolean; error?: string }> {
    if (!config.messageTemplate) {
      return { success: false, error: '消息模板為空' };
    }
    
    // 替換變量
    let message = config.messageTemplate
      .replace(/{name}/g, member.firstName || member.username || '朋友')
      .replace(/{username}/g, member.username ? `@${member.username}` : '')
      .replace(/{firstname}/g, member.firstName || '')
      .replace(/{lastname}/g, member.lastName || '');
    
    // 添加隨機性（防封）
    if (config.smartAntiBlock) {
      message = this.addMessageVariation(message);
    }
    
    if (!this.tgClient) {
      // 模擬發送
      console.log(`[BatchOp] Mock send to ${member.id}: ${message.substring(0, 50)}...`);
      await this.delay(500);
      return { success: Math.random() > 0.1 };  // 模擬 90% 成功率
    }
    
    try {
      // 使用 TG API 發送消息
      // await this.tgClient.invoke(
      //   new Api.messages.SendMessage({
      //     peer: member.id,
      //     message,
      //     randomId: BigInt(Math.floor(Math.random() * 1e15))
      //   })
      // );
      
      return { success: true };
    } catch (error: any) {
      // 處理常見錯誤
      if (error.message?.includes('PEER_FLOOD')) {
        throw new Error('發送過於頻繁，請稍後再試');
      }
      if (error.message?.includes('USER_PRIVACY')) {
        return { success: false, error: '用戶隱私設置限制' };
      }
      throw error;
    }
  }
  
  private async inviteMember(
    member: MemberBasicInfo,
    config: BatchOperationConfig
  ): Promise<{ success: boolean; error?: string }> {
    if (!config.targetGroupId) {
      return { success: false, error: '目標群組未設置' };
    }
    
    if (!this.tgClient) {
      // 模擬邀請
      console.log(`[BatchOp] Mock invite ${member.id} to ${config.targetGroupId}`);
      await this.delay(500);
      return { success: Math.random() > 0.15 };  // 模擬 85% 成功率
    }
    
    try {
      // 使用 TG API 邀請成員
      // await this.tgClient.invoke(
      //   new Api.channels.InviteToChannel({
      //     channel: config.targetGroupId,
      //     users: [member.id]
      //   })
      // );
      
      return { success: true };
    } catch (error: any) {
      if (error.message?.includes('USER_PRIVACY')) {
        return { success: false, error: '用戶隱私設置限制' };
      }
      if (error.message?.includes('USER_NOT_MUTUAL')) {
        return { success: false, error: '非互相好友' };
      }
      throw error;
    }
  }
  
  // ============ 智能防封策略 ============
  
  private getDailyLimit(): number {
    if (this.isWarmupMode) {
      const daysSinceCreation = Math.floor(
        (Date.now() - this.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return Math.min(
        ANTI_BLOCK_CONFIG.newAccountDailyLimit + 
        daysSinceCreation * ANTI_BLOCK_CONFIG.warmupIncrement,
        BATCH_CONFIG.defaultDailyLimit
      );
    }
    return BATCH_CONFIG.defaultDailyLimit;
  }
  
  private canOperate(): boolean {
    const stats = this._stats();
    const limit = this.getDailyLimit();
    return stats.today.sent < limit && stats.thisHour.sent < BATCH_CONFIG.hourlyLimit;
  }
  
  private shouldRest(processed: number): boolean {
    return processed > 0 && processed % ANTI_BLOCK_CONFIG.restInterval === 0;
  }
  
  private async takeRest(): Promise<void> {
    const { min, max } = ANTI_BLOCK_CONFIG.restDuration;
    const duration = min + Math.random() * (max - min);
    console.log(`[BatchOp] Taking rest for ${Math.round(duration)}s...`);
    await this.delay(duration * 1000);
  }
  
  private isAnomalyDetected(consecutiveFailures: number, processed: number): boolean {
    if (processed < 5) return false;
    
    // 連續失敗超過閾值
    if (consecutiveFailures >= 3) return true;
    
    // 失敗率超過閾值
    const stats = this._stats();
    const failureRate = stats.thisHour.failed / Math.max(stats.thisHour.sent, 1);
    return failureRate > ANTI_BLOCK_CONFIG.maxFailureRate;
  }
  
  private calculateDelay(config: BatchOperationConfig, processed: number): number {
    let baseDelay = config.delayMin + Math.random() * (config.delayMax - config.delayMin);
    
    // 智能防封：動態調整延遲
    if (config.smartAntiBlock) {
      // 隨著發送量增加，逐漸增加延遲
      const factor = 1 + Math.floor(processed / 20) * 0.1;
      baseDelay *= factor;
      
      // 添加隨機性
      baseDelay *= 0.8 + Math.random() * 0.4;
    }
    
    return baseDelay * 1000;
  }
  
  private addMessageVariation(message: string): string {
    // 添加不可見字符增加唯一性
    const variations = ['', ' ', '  ', '​', '‌', '‍'];
    const variation = variations[Math.floor(Math.random() * variations.length)];
    return message + variation;
  }
  
  // ============ 統計管理 ============
  
  private updateStats(success: boolean): void {
    this._stats.update(stats => {
      const newStats = { ...stats };
      
      newStats.today.sent++;
      newStats.thisHour.sent++;
      newStats.total.sent++;
      
      if (success) {
        newStats.today.success++;
        newStats.thisHour.success++;
        newStats.total.success++;
      } else {
        newStats.today.failed++;
        newStats.thisHour.failed++;
        newStats.total.failed++;
      }
      
      this.saveStats(newStats);
      return newStats;
    });
  }
  
  private checkAndResetStats(): void {
    const stats = this._stats();
    const now = new Date();
    
    // 重置每日統計
    if (!this.isSameDay(stats.today.lastReset, now)) {
      stats.today = { sent: 0, success: 0, failed: 0, lastReset: now };
    }
    
    // 重置每小時統計
    if (!this.isSameHour(stats.thisHour.lastReset, now)) {
      stats.thisHour = { sent: 0, success: 0, failed: 0, lastReset: now };
    }
    
    this._stats.set(stats);
    this.saveStats(stats);
  }
  
  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.toDateString() === d2.toDateString();
  }
  
  private isSameHour(d1: Date, d2: Date): boolean {
    return d1.toDateString() === d2.toDateString() && 
           d1.getHours() === d2.getHours();
  }
  
  private saveStats(stats: OperationStats): void {
    try {
      localStorage.setItem('tgai-batch-stats', JSON.stringify(stats));
    } catch (e) {}
  }
  
  private loadStats(): void {
    try {
      const data = localStorage.getItem('tgai-batch-stats');
      if (data) {
        const stats = JSON.parse(data);
        stats.today.lastReset = new Date(stats.today.lastReset);
        stats.thisHour.lastReset = new Date(stats.thisHour.lastReset);
        this._stats.set(stats);
      }
    } catch (e) {}
  }
  
  private logResult(memberId: string, success: boolean, error?: string): void {
    this._operationLog.update(log => {
      const newLog = [
        { memberId, success, error, timestamp: new Date() },
        ...log
      ].slice(0, 1000);  // 保留最近 1000 條
      return newLog;
    });
  }
  
  private async processQueue(): Promise<void> {
    const queue = this._operationQueue();
    if (queue.length === 0) return;
    
    const next = queue[0];
    this._operationQueue.update(q => q.slice(1));
    
    await this.startOperation(next);
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
