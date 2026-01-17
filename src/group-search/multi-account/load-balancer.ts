/**
 * TG-AI智控王 負載均衡器
 * Load Balancer v1.0
 * 
 * 智能分配任務到最優帳號
 * 
 * 策略：
 * 1. 加權輪詢 - 基於健康度和配額
 * 2. 最少連接 - 選擇當前任務最少的帳號
 * 3. 響應時間 - 選擇響應最快的帳號
 * 4. 風險隔離 - 高風險操作使用專用帳號
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { AccountManager, TelegramAccount, AccountStatus } from './account-manager';

// ============ 類型定義 ============

export type BalancingStrategy = 
  | 'weighted-round-robin'   // 加權輪詢
  | 'least-connections'      // 最少連接
  | 'response-time'          // 響應時間
  | 'risk-isolation';        // 風險隔離

export type TaskPriority = 'high' | 'normal' | 'low';

export interface Task {
  id: string;
  type: 'message' | 'search' | 'extraction' | 'join' | 'other';
  priority: TaskPriority;
  targetId?: string;
  payload?: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  assignedAccount?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
}

export interface AccountLoad {
  accountId: string;
  activeTasks: number;
  pendingTasks: number;
  avgResponseTime: number;
  successRate: number;
  lastTaskAt?: Date;
}

export interface BalancerStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgResponseTime: number;
  tasksByAccount: Map<string, number>;
  tasksByType: Map<string, number>;
}

// ============ 配置 ============

const BALANCER_CONFIG = {
  // 默認策略
  defaultStrategy: 'weighted-round-robin' as BalancingStrategy,
  
  // 任務超時（毫秒）
  taskTimeout: 60000,
  
  // 最大重試次數
  maxRetries: 3,
  
  // 重試延遲（毫秒）
  retryDelay: 5000,
  
  // 健康度權重閾值
  healthWeightThresholds: {
    excellent: { min: 90, weight: 1.5 },
    good: { min: 70, weight: 1.2 },
    fair: { min: 50, weight: 1.0 },
    poor: { min: 30, weight: 0.5 }
  },
  
  // 高風險任務類型
  highRiskTasks: ['message', 'join'],
  
  // 響應時間衰減因子
  responseTimeDecay: 0.95
};

@Injectable({
  providedIn: 'root'
})
export class LoadBalancer {
  private accountManager = inject(AccountManager);
  
  // 當前策略
  private _strategy = signal<BalancingStrategy>(BALANCER_CONFIG.defaultStrategy);
  strategy = computed(() => this._strategy());
  
  // 任務隊列
  private _taskQueue = signal<Task[]>([]);
  taskQueue = computed(() => this._taskQueue());
  
  // 活躍任務
  private _activeTasks = signal<Map<string, Task>>(new Map());
  activeTasks = computed(() => this._activeTasks());
  
  // 帳號負載
  private _accountLoads = signal<Map<string, AccountLoad>>(new Map());
  accountLoads = computed(() => this._accountLoads());
  
  // 統計
  private _stats = signal<BalancerStats>({
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgResponseTime: 0,
    tasksByAccount: new Map(),
    tasksByType: new Map()
  });
  stats = computed(() => this._stats());
  
  // 輪詢索引
  private roundRobinIndex = 0;
  
  // 響應時間記錄
  private responseTimes: Map<string, number[]> = new Map();
  
  // 處理中標誌
  private isProcessing = false;
  
  constructor() {
    this.initializeLoads();
    this.startQueueProcessor();
  }
  
  // ============ 策略設置 ============
  
  /**
   * 設置負載均衡策略
   */
  setStrategy(strategy: BalancingStrategy): void {
    this._strategy.set(strategy);
    console.log(`[LoadBalancer] Strategy set to: ${strategy}`);
  }
  
  // ============ 任務提交 ============
  
  /**
   * 提交任務
   */
  submitTask(
    type: Task['type'],
    payload?: any,
    options?: {
      priority?: TaskPriority;
      targetId?: string;
      maxRetries?: number;
    }
  ): Task {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority: options?.priority || 'normal',
      targetId: options?.targetId,
      payload,
      createdAt: new Date(),
      status: 'pending',
      retries: 0,
      maxRetries: options?.maxRetries ?? BALANCER_CONFIG.maxRetries
    };
    
    // 按優先級插入隊列
    this._taskQueue.update(queue => {
      const newQueue = [...queue];
      if (task.priority === 'high') {
        // 高優先級插入到隊列前面
        const firstNonHigh = newQueue.findIndex(t => t.priority !== 'high');
        if (firstNonHigh === -1) {
          newQueue.push(task);
        } else {
          newQueue.splice(firstNonHigh, 0, task);
        }
      } else if (task.priority === 'low') {
        // 低優先級插入到隊列最後
        newQueue.push(task);
      } else {
        // 普通優先級插入到低優先級之前
        const firstLow = newQueue.findIndex(t => t.priority === 'low');
        if (firstLow === -1) {
          newQueue.push(task);
        } else {
          newQueue.splice(firstLow, 0, task);
        }
      }
      return newQueue;
    });
    
    // 更新統計
    this._stats.update(s => ({
      ...s,
      totalTasks: s.totalTasks + 1,
      tasksByType: new Map(s.tasksByType).set(type, (s.tasksByType.get(type) || 0) + 1)
    }));
    
    console.log(`[LoadBalancer] Task submitted: ${task.id} (${type})`);
    
    // 觸發處理
    this.processQueue();
    
    return task;
  }
  
  /**
   * 取消任務
   */
  cancelTask(taskId: string): boolean {
    // 檢查是否在隊列中
    const queueTask = this._taskQueue().find(t => t.id === taskId);
    if (queueTask) {
      this._taskQueue.update(queue => queue.filter(t => t.id !== taskId));
      return true;
    }
    
    // 檢查是否在執行中
    const activeTask = this._activeTasks().get(taskId);
    if (activeTask) {
      activeTask.status = 'cancelled';
      this._activeTasks.update(tasks => {
        const newTasks = new Map(tasks);
        newTasks.delete(taskId);
        return newTasks;
      });
      return true;
    }
    
    return false;
  }
  
  /**
   * 批量提交任務
   */
  submitBatch(
    tasks: Array<{
      type: Task['type'];
      payload?: any;
      targetId?: string;
    }>,
    options?: {
      priority?: TaskPriority;
      maxRetries?: number;
    }
  ): Task[] {
    return tasks.map(t => this.submitTask(t.type, t.payload, {
      ...options,
      targetId: t.targetId
    }));
  }
  
  // ============ 帳號選擇 ============
  
  /**
   * 選擇最佳帳號執行任務
   */
  private selectAccount(task: Task): TelegramAccount | null {
    const strategy = this._strategy();
    const availableAccounts = this.accountManager.availableAccounts();
    
    if (availableAccounts.length === 0) {
      return null;
    }
    
    // 風險隔離：高風險任務優先使用專用帳號
    if (strategy === 'risk-isolation' || BALANCER_CONFIG.highRiskTasks.includes(task.type)) {
      const dedicated = availableAccounts.find(a => a.role === 'dedicated');
      if (dedicated) {
        return dedicated;
      }
    }
    
    switch (strategy) {
      case 'weighted-round-robin':
        return this.selectByWeightedRoundRobin(availableAccounts, task);
      case 'least-connections':
        return this.selectByLeastConnections(availableAccounts);
      case 'response-time':
        return this.selectByResponseTime(availableAccounts);
      default:
        return this.selectByWeightedRoundRobin(availableAccounts, task);
    }
  }
  
  /**
   * 加權輪詢選擇
   */
  private selectByWeightedRoundRobin(
    accounts: TelegramAccount[],
    task: Task
  ): TelegramAccount | null {
    // 計算每個帳號的權重
    const weighted = accounts.map(account => {
      let weight = 1.0;
      
      // 健康度權重
      for (const [_, config] of Object.entries(BALANCER_CONFIG.healthWeightThresholds)) {
        if (account.healthScore >= config.min) {
          weight = config.weight;
          break;
        }
      }
      
      // 配額剩餘權重
      const quotaKey = `daily${task.type.charAt(0).toUpperCase() + task.type.slice(1)}s` as keyof TelegramAccount['quotas'];
      const usedKey = `${quotaKey}Used` as keyof TelegramAccount['quotas'];
      
      if (account.quotas[quotaKey]) {
        const remaining = 1 - (account.quotas[usedKey] / account.quotas[quotaKey]);
        weight *= (0.5 + remaining * 0.5);
      }
      
      // 當前負載權重
      const load = this._accountLoads().get(account.id);
      if (load) {
        weight *= Math.max(0.3, 1 - load.activeTasks * 0.2);
      }
      
      return { account, weight };
    }).filter(w => w.weight > 0);
    
    if (weighted.length === 0) return null;
    
    // 加權隨機選擇
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const { account, weight } of weighted) {
      random -= weight;
      if (random <= 0) {
        return account;
      }
    }
    
    return weighted[weighted.length - 1].account;
  }
  
  /**
   * 最少連接選擇
   */
  private selectByLeastConnections(accounts: TelegramAccount[]): TelegramAccount | null {
    const loads = this._accountLoads();
    
    let minLoad = Infinity;
    let selected: TelegramAccount | null = null;
    
    for (const account of accounts) {
      const load = loads.get(account.id);
      const activeTasks = load?.activeTasks || 0;
      
      if (activeTasks < minLoad) {
        minLoad = activeTasks;
        selected = account;
      }
    }
    
    return selected;
  }
  
  /**
   * 響應時間選擇
   */
  private selectByResponseTime(accounts: TelegramAccount[]): TelegramAccount | null {
    let minTime = Infinity;
    let selected: TelegramAccount | null = null;
    
    for (const account of accounts) {
      const times = this.responseTimes.get(account.id) || [];
      const avgTime = times.length > 0 
        ? times.reduce((a, b) => a + b, 0) / times.length 
        : 1000;  // 默認 1 秒
      
      if (avgTime < minTime) {
        minTime = avgTime;
        selected = account;
      }
    }
    
    return selected;
  }
  
  // ============ 隊列處理 ============
  
  /**
   * 開始隊列處理器
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 100);  // 每 100ms 檢查一次
  }
  
  /**
   * 處理隊列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    const queue = this._taskQueue();
    if (queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const task = queue[0];
      const account = this.selectAccount(task);
      
      if (!account) {
        // 沒有可用帳號
        console.warn('[LoadBalancer] No available account for task:', task.id);
        this.isProcessing = false;
        return;
      }
      
      // 檢查配額
      const quotaType = task.type === 'extraction' ? 'extraction' 
        : task.type === 'search' ? 'search' 
        : 'message';
      
      if (!this.accountManager.checkQuota(account.id, quotaType)) {
        // 配額不足，嘗試其他帳號
        console.warn('[LoadBalancer] Quota exceeded for account:', account.id);
        // 這裡可以實現更複雜的重試邏輯
        this.isProcessing = false;
        return;
      }
      
      // 從隊列移除
      this._taskQueue.update(q => q.slice(1));
      
      // 分配任務
      task.assignedAccount = account.id;
      task.status = 'running';
      task.startedAt = new Date();
      
      // 添加到活躍任務
      this._activeTasks.update(tasks => {
        const newTasks = new Map(tasks);
        newTasks.set(task.id, task);
        return newTasks;
      });
      
      // 更新帳號負載
      this.updateAccountLoad(account.id, 1);
      
      // 執行任務（異步）
      this.executeTask(task, account).catch(error => {
        console.error('[LoadBalancer] Task execution error:', error);
      });
      
    } finally {
      this.isProcessing = false;
    }
  }
  
  /**
   * 執行任務
   */
  private async executeTask(task: Task, account: TelegramAccount): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 使用配額
      const quotaType = task.type === 'extraction' ? 'extraction' 
        : task.type === 'search' ? 'search' 
        : 'message';
      this.accountManager.useQuota(account.id, quotaType);
      
      // 執行實際操作
      // const result = await this.executeTaskByType(task, account);
      
      // 模擬執行
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      const result = { success: Math.random() > 0.1 };
      
      if (result.success) {
        // 任務成功
        task.status = 'completed';
        task.result = result;
        task.completedAt = new Date();
        
        // 更新統計
        this._stats.update(s => ({
          ...s,
          completedTasks: s.completedTasks + 1,
          tasksByAccount: new Map(s.tasksByAccount).set(
            account.id, 
            (s.tasksByAccount.get(account.id) || 0) + 1
          )
        }));
        
        // 記錄響應時間
        this.recordResponseTime(account.id, Date.now() - startTime);
        
      } else {
        throw new Error('Task execution failed');
      }
      
    } catch (error: any) {
      console.error(`[LoadBalancer] Task ${task.id} failed:`, error);
      
      // 記錄錯誤
      this.accountManager.recordError(account.id, error.message);
      
      // 重試邏輯
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = 'pending';
        task.assignedAccount = undefined;
        
        // 延遲後重新加入隊列
        setTimeout(() => {
          this._taskQueue.update(queue => [task, ...queue]);
        }, BALANCER_CONFIG.retryDelay * task.retries);
        
        console.log(`[LoadBalancer] Task ${task.id} will retry (${task.retries}/${task.maxRetries})`);
      } else {
        // 任務失敗
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = new Date();
        
        this._stats.update(s => ({
          ...s,
          failedTasks: s.failedTasks + 1
        }));
      }
      
    } finally {
      // 從活躍任務移除
      this._activeTasks.update(tasks => {
        const newTasks = new Map(tasks);
        newTasks.delete(task.id);
        return newTasks;
      });
      
      // 更新帳號負載
      this.updateAccountLoad(account.id, -1);
    }
  }
  
  // ============ 負載管理 ============
  
  /**
   * 初始化負載信息
   */
  private initializeLoads(): void {
    const accounts = this.accountManager.accounts();
    const loads = new Map<string, AccountLoad>();
    
    for (const account of accounts) {
      loads.set(account.id, {
        accountId: account.id,
        activeTasks: 0,
        pendingTasks: 0,
        avgResponseTime: 1000,
        successRate: account.stats.successRate
      });
    }
    
    this._accountLoads.set(loads);
  }
  
  /**
   * 更新帳號負載
   */
  private updateAccountLoad(accountId: string, delta: number): void {
    this._accountLoads.update(loads => {
      const newLoads = new Map(loads);
      const load = newLoads.get(accountId);
      
      if (load) {
        load.activeTasks = Math.max(0, load.activeTasks + delta);
        load.lastTaskAt = new Date();
      }
      
      return newLoads;
    });
  }
  
  /**
   * 記錄響應時間
   */
  private recordResponseTime(accountId: string, time: number): void {
    const times = this.responseTimes.get(accountId) || [];
    times.push(time);
    
    // 只保留最近 20 條記錄
    if (times.length > 20) {
      times.shift();
    }
    
    this.responseTimes.set(accountId, times);
    
    // 更新平均響應時間
    this._accountLoads.update(loads => {
      const newLoads = new Map(loads);
      const load = newLoads.get(accountId);
      
      if (load) {
        load.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
      }
      
      return newLoads;
    });
    
    // 更新全局平均響應時間
    const allTimes = [...this.responseTimes.values()].flat();
    if (allTimes.length > 0) {
      this._stats.update(s => ({
        ...s,
        avgResponseTime: allTimes.reduce((a, b) => a + b, 0) / allTimes.length
      }));
    }
  }
  
  // ============ 查詢方法 ============
  
  /**
   * 獲取任務狀態
   */
  getTaskStatus(taskId: string): Task | null {
    // 檢查活躍任務
    const active = this._activeTasks().get(taskId);
    if (active) return active;
    
    // 檢查隊列
    const queued = this._taskQueue().find(t => t.id === taskId);
    if (queued) return queued;
    
    return null;
  }
  
  /**
   * 獲取隊列長度
   */
  getQueueLength(): number {
    return this._taskQueue().length;
  }
  
  /**
   * 獲取帳號任務數
   */
  getAccountTaskCount(accountId: string): { active: number; pending: number } {
    const load = this._accountLoads().get(accountId);
    return {
      active: load?.activeTasks || 0,
      pending: this._taskQueue().filter(t => t.assignedAccount === accountId).length
    };
  }
  
  /**
   * 清空隊列
   */
  clearQueue(): void {
    this._taskQueue.set([]);
    console.log('[LoadBalancer] Queue cleared');
  }
  
  /**
   * 暫停處理
   */
  pause(): void {
    this.isProcessing = true;  // 阻止新任務處理
    console.log('[LoadBalancer] Processing paused');
  }
  
  /**
   * 恢復處理
   */
  resume(): void {
    this.isProcessing = false;
    console.log('[LoadBalancer] Processing resumed');
    this.processQueue();
  }
}
