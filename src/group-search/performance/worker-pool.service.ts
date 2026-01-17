/**
 * TG-AI智控王 Web Worker 池服務
 * Worker Pool Service v1.0
 * 
 * 💡 設計思考：
 * 1. Worker 池化 - 復用 Worker 避免頻繁創建/銷毀
 * 2. 任務隊列 - 管理待處理任務
 * 3. 自動降級 - Worker 不可用時在主線程處理
 * 4. 進度追蹤 - 支持長任務的進度回調
 * 5. 取消機制 - 支持取消正在進行的任務
 */

import { Injectable, signal, computed, NgZone, inject, OnDestroy } from '@angular/core';

// ============ 類型定義 ============

export type TaskType = 
  | 'analyze-members'    // 分析成員
  | 'score-groups'       // 群組評分
  | 'export-data'        // 導出數據
  | 'filter-data'        // 過濾數據
  | 'sort-data'          // 排序數據
  | 'search-index'       // 搜索索引
  | 'encrypt-data'       // 加密數據
  | 'decrypt-data'       // 解密數據
  | 'custom';            // 自定義

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: TaskType;
  data: T;
  priority: number;
  createdAt: number;
  onProgress?: (progress: number) => void;
  onComplete?: (result: R) => void;
  onError?: (error: Error) => void;
}

export interface WorkerMessage {
  taskId: string;
  type: 'result' | 'progress' | 'error';
  data?: any;
  progress?: number;
  error?: string;
}

export interface WorkerPoolConfig {
  maxWorkers: number;
  taskTimeout: number;
  enableFallback: boolean;
}

export interface PoolStats {
  totalWorkers: number;
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgTaskTime: number;
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: WorkerPoolConfig = {
  maxWorkers: navigator.hardwareConcurrency || 4,
  taskTimeout: 30000, // 30 秒
  enableFallback: true
};

// ============ Worker 代碼 ============

/**
 * 💡 思考：使用 Blob URL 創建內聯 Worker
 * 這樣不需要額外的 Worker 文件，更容易打包和部署
 */
const WORKER_SCRIPT = `
  // Worker 內部處理函數
  const processors = {
    // 分析成員
    'analyze-members': (data) => {
      const members = data.members || [];
      const results = members.map((member, index) => {
        // 計算價值分數
        let score = 50;
        
        if (member.status === 'online') score += 20;
        else if (member.status === 'recently') score += 10;
        
        if (member.isPremium) score += 15;
        if (member.username) score += 5;
        if (member.photo) score += 5;
        if (member.bio) score += 5;
        
        if (member.isBot) score -= 30;
        if (member.isScam) score -= 50;
        if (member.isFake) score -= 40;
        
        // 發送進度
        if (index % 100 === 0) {
          self.postMessage({
            taskId: data.taskId,
            type: 'progress',
            progress: Math.round((index / members.length) * 100)
          });
        }
        
        return {
          ...member,
          valueScore: Math.max(0, Math.min(100, score)),
          grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
        };
      });
      
      return results;
    },
    
    // 群組評分
    'score-groups': (data) => {
      const groups = data.groups || [];
      return groups.map(group => {
        const stats = group.stats || {};
        
        // 五維度評分
        const scale = Math.min(100, Math.log10(stats.membersCount || 1) * 25);
        const activity = Math.min(100, (stats.dailyMessages || 0) / 10);
        const quality = Math.min(100, (stats.activeRate || 0) * 2);
        const interaction = Math.min(100, (stats.onlineCount || 0) / (stats.membersCount || 1) * 100);
        const security = 80; // 默認安全分
        
        const total = (scale * 0.2) + (activity * 0.25) + (quality * 0.25) + 
                     (interaction * 0.15) + (security * 0.15);
        
        return {
          groupId: group.id,
          scores: { scale, activity, quality, interaction, security },
          total: Math.round(total),
          grade: total >= 85 ? 'S' : total >= 70 ? 'A' : total >= 55 ? 'B' : 
                 total >= 40 ? 'C' : total >= 25 ? 'D' : 'F'
        };
      });
    },
    
    // 導出數據
    'export-data': (data) => {
      const { items, format, fields } = data;
      
      // 篩選字段
      const exportItems = items.map(item => {
        if (!fields || fields.length === 0) return item;
        const filtered = {};
        fields.forEach(field => {
          if (item[field] !== undefined) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });
      
      switch (format) {
        case 'json':
          return JSON.stringify(exportItems, null, 2);
          
        case 'csv':
          if (exportItems.length === 0) return '';
          const headers = Object.keys(exportItems[0]);
          const csvRows = [
            headers.join(','),
            ...exportItems.map(item => 
              headers.map(h => JSON.stringify(item[h] ?? '')).join(',')
            )
          ];
          return csvRows.join('\\n');
          
        default:
          return exportItems;
      }
    },
    
    // 過濾數據
    'filter-data': (data) => {
      const { items, filters } = data;
      return items.filter(item => {
        for (const [key, condition] of Object.entries(filters)) {
          const value = item[key];
          
          if (typeof condition === 'object') {
            if (condition.min !== undefined && value < condition.min) return false;
            if (condition.max !== undefined && value > condition.max) return false;
            if (condition.eq !== undefined && value !== condition.eq) return false;
            if (condition.contains !== undefined && 
                !String(value).toLowerCase().includes(String(condition.contains).toLowerCase())) {
              return false;
            }
          } else if (value !== condition) {
            return false;
          }
        }
        return true;
      });
    },
    
    // 排序數據
    'sort-data': (data) => {
      const { items, sortBy, order = 'asc' } = data;
      return [...items].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
      });
    },
    
    // 搜索索引構建
    'search-index': (data) => {
      const { items, fields } = data;
      const index = new Map();
      
      items.forEach((item, idx) => {
        fields.forEach(field => {
          const value = String(item[field] || '').toLowerCase();
          const words = value.split(/\\s+/);
          
          words.forEach(word => {
            if (word.length < 2) return;
            
            if (!index.has(word)) {
              index.set(word, new Set());
            }
            index.get(word).add(idx);
          });
        });
      });
      
      // 轉換為可序列化格式
      const result = {};
      for (const [key, value] of index) {
        result[key] = Array.from(value);
      }
      return result;
    }
  };
  
  // 監聽消息
  self.onmessage = async (e) => {
    const { taskId, type, data } = e.data;
    
    try {
      const processor = processors[type];
      
      if (!processor) {
        throw new Error('Unknown task type: ' + type);
      }
      
      const result = processor({ ...data, taskId });
      
      self.postMessage({
        taskId,
        type: 'result',
        data: result
      });
      
    } catch (error) {
      self.postMessage({
        taskId,
        type: 'error',
        error: error.message
      });
    }
  };
`;

@Injectable({
  providedIn: 'root'
})
export class WorkerPoolService implements OnDestroy {
  private ngZone = inject(NgZone);
  
  private config: WorkerPoolConfig;
  private workerPool: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, { 
    worker: Worker; 
    task: WorkerTask;
    timeoutId: number;
  }>();
  
  // 統計
  private _stats = signal<PoolStats>({
    totalWorkers: 0,
    activeWorkers: 0,
    queuedTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    avgTaskTime: 0
  });
  stats = computed(() => this._stats());
  
  private taskTimes: number[] = [];
  private workerBlobUrl?: string;
  private isSupported = typeof Worker !== 'undefined';
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    
    if (this.isSupported) {
      this.initializePool();
    } else {
      console.warn('[WorkerPool] Web Workers not supported, using fallback');
    }
  }
  
  ngOnDestroy(): void {
    this.terminate();
  }
  
  // === 公開方法 ===
  
  /**
   * 執行任務
   * 
   * 💡 優化思考：
   * 返回 Promise 而不是 Observable，因為大多數任務是一次性的
   * 但提供 onProgress 回調支持長任務進度追蹤
   */
  async execute<T, R>(
    type: TaskType,
    data: T,
    options?: {
      priority?: number;
      onProgress?: (progress: number) => void;
      timeout?: number;
    }
  ): Promise<R> {
    const task: WorkerTask<T, R> = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      priority: options?.priority ?? 5,
      createdAt: Date.now(),
      onProgress: options?.onProgress
    };
    
    // 如果 Worker 不可用，使用降級處理
    if (!this.isSupported || this.workerPool.length === 0) {
      if (this.config.enableFallback) {
        return this.executeFallback(task);
      }
      throw new Error('Web Workers not available and fallback disabled');
    }
    
    return new Promise((resolve, reject) => {
      task.onComplete = resolve;
      task.onError = reject;
      
      this.enqueueTask(task);
      this.processQueue();
    });
  }
  
  /**
   * 取消任務
   */
  cancelTask(taskId: string): boolean {
    // 從隊列中移除
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.updateStats();
      return true;
    }
    
    // 取消正在執行的任務
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      clearTimeout(activeTask.timeoutId);
      this.releaseWorker(activeTask.worker);
      this.activeTasks.delete(taskId);
      activeTask.task.onError?.(new Error('Task cancelled'));
      this.updateStats();
      return true;
    }
    
    return false;
  }
  
  /**
   * 批量執行任務
   * 
   * 💡 優化：並行執行多個任務，充分利用 Worker 池
   */
  async executeBatch<T, R>(
    type: TaskType,
    dataArray: T[],
    options?: {
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<R[]> {
    const concurrency = options?.concurrency ?? this.config.maxWorkers;
    const results: R[] = new Array(dataArray.length);
    let completed = 0;
    
    // 分批執行
    const batches: Promise<void>[] = [];
    
    for (let i = 0; i < dataArray.length; i += concurrency) {
      const batch = dataArray.slice(i, i + concurrency);
      
      const batchPromise = Promise.all(
        batch.map(async (data, batchIndex) => {
          const index = i + batchIndex;
          results[index] = await this.execute<T, R>(type, data);
          completed++;
          options?.onProgress?.(completed, dataArray.length);
        })
      );
      
      batches.push(batchPromise.then(() => {}));
      
      // 等待這批完成再開始下一批
      if (batches.length >= 1) {
        await Promise.all(batches);
        batches.length = 0;
      }
    }
    
    return results;
  }
  
  /**
   * 調整池大小
   */
  resize(maxWorkers: number): void {
    this.config.maxWorkers = maxWorkers;
    
    // 如果需要更多 Worker
    while (this.workerPool.length < maxWorkers) {
      const worker = this.createWorker();
      if (worker) {
        this.workerPool.push(worker);
        this.availableWorkers.push(worker);
      }
    }
    
    // 如果需要減少 Worker
    while (this.workerPool.length > maxWorkers && this.availableWorkers.length > 0) {
      const worker = this.availableWorkers.pop();
      if (worker) {
        const index = this.workerPool.indexOf(worker);
        if (index !== -1) {
          this.workerPool.splice(index, 1);
          worker.terminate();
        }
      }
    }
    
    this.updateStats();
  }
  
  /**
   * 終止所有 Worker
   */
  terminate(): void {
    // 取消所有任務
    for (const [taskId, { task }] of this.activeTasks) {
      task.onError?.(new Error('Worker pool terminated'));
    }
    this.activeTasks.clear();
    
    // 清空隊列
    for (const task of this.taskQueue) {
      task.onError?.(new Error('Worker pool terminated'));
    }
    this.taskQueue = [];
    
    // 終止所有 Worker
    for (const worker of this.workerPool) {
      worker.terminate();
    }
    this.workerPool = [];
    this.availableWorkers = [];
    
    // 釋放 Blob URL
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = undefined;
    }
    
    this.updateStats();
  }
  
  // === 私有方法 ===
  
  private initializePool(): void {
    // 創建 Worker Blob URL
    const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
    this.workerBlobUrl = URL.createObjectURL(blob);
    
    // 創建初始 Worker
    const initialWorkers = Math.min(2, this.config.maxWorkers);
    for (let i = 0; i < initialWorkers; i++) {
      const worker = this.createWorker();
      if (worker) {
        this.workerPool.push(worker);
        this.availableWorkers.push(worker);
      }
    }
    
    this.updateStats();
  }
  
  private createWorker(): Worker | null {
    if (!this.workerBlobUrl) return null;
    
    try {
      const worker = new Worker(this.workerBlobUrl);
      
      worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(worker, e.data);
      };
      
      worker.onerror = (e) => {
        console.error('[WorkerPool] Worker error:', e);
        this.handleWorkerError(worker, e);
      };
      
      return worker;
    } catch (error) {
      console.error('[WorkerPool] Failed to create worker:', error);
      return null;
    }
  }
  
  private handleWorkerMessage(worker: Worker, message: WorkerMessage): void {
    const activeTask = [...this.activeTasks.entries()]
      .find(([, { worker: w }]) => w === worker);
    
    if (!activeTask) return;
    
    const [taskId, { task, timeoutId }] = activeTask;
    
    this.ngZone.run(() => {
      switch (message.type) {
        case 'progress':
          task.onProgress?.(message.progress ?? 0);
          break;
          
        case 'result':
          clearTimeout(timeoutId);
          this.completeTask(taskId, message.data);
          break;
          
        case 'error':
          clearTimeout(timeoutId);
          this.failTask(taskId, new Error(message.error));
          break;
      }
    });
  }
  
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    // 找到使用該 Worker 的任務
    for (const [taskId, { worker: w, task }] of this.activeTasks) {
      if (w === worker) {
        this.failTask(taskId, new Error(error.message));
        break;
      }
    }
    
    // 替換壞掉的 Worker
    const index = this.workerPool.indexOf(worker);
    if (index !== -1) {
      this.workerPool.splice(index, 1);
      worker.terminate();
      
      const newWorker = this.createWorker();
      if (newWorker) {
        this.workerPool.push(newWorker);
        this.availableWorkers.push(newWorker);
      }
    }
  }
  
  private enqueueTask(task: WorkerTask): void {
    // 按優先級插入
    const insertIndex = this.taskQueue.findIndex(t => t.priority < task.priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
    
    this.updateStats();
  }
  
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.acquireWorker();
      
      if (worker) {
        this.executeTask(worker, task);
      } else {
        // 沒有可用 Worker，放回隊列
        this.taskQueue.unshift(task);
        break;
      }
    }
  }
  
  private acquireWorker(): Worker | null {
    // 嘗試從可用池獲取
    if (this.availableWorkers.length > 0) {
      return this.availableWorkers.pop()!;
    }
    
    // 如果池未滿，創建新 Worker
    if (this.workerPool.length < this.config.maxWorkers) {
      const worker = this.createWorker();
      if (worker) {
        this.workerPool.push(worker);
        return worker;
      }
    }
    
    return null;
  }
  
  private releaseWorker(worker: Worker): void {
    if (this.workerPool.includes(worker)) {
      this.availableWorkers.push(worker);
    }
    this.updateStats();
    
    // 處理等待的任務
    this.processQueue();
  }
  
  private executeTask(worker: Worker, task: WorkerTask): void {
    // 設置超時
    const timeoutId = window.setTimeout(() => {
      this.failTask(task.id, new Error('Task timeout'));
    }, this.config.taskTimeout);
    
    this.activeTasks.set(task.id, { worker, task, timeoutId });
    
    // 發送任務到 Worker
    worker.postMessage({
      taskId: task.id,
      type: task.type,
      data: task.data
    });
    
    this.updateStats();
  }
  
  private completeTask(taskId: string, result: any): void {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;
    
    const { worker, task } = activeTask;
    const duration = Date.now() - task.createdAt;
    
    this.taskTimes.push(duration);
    if (this.taskTimes.length > 100) {
      this.taskTimes.shift();
    }
    
    this.activeTasks.delete(taskId);
    this.releaseWorker(worker);
    
    task.onComplete?.(result);
    
    this._stats.update(s => ({
      ...s,
      completedTasks: s.completedTasks + 1,
      avgTaskTime: this.taskTimes.reduce((a, b) => a + b, 0) / this.taskTimes.length
    }));
  }
  
  private failTask(taskId: string, error: Error): void {
    const activeTask = this.activeTasks.get(taskId);
    if (!activeTask) return;
    
    const { worker, task, timeoutId } = activeTask;
    
    clearTimeout(timeoutId);
    this.activeTasks.delete(taskId);
    this.releaseWorker(worker);
    
    task.onError?.(error);
    
    this._stats.update(s => ({
      ...s,
      failedTasks: s.failedTasks + 1
    }));
  }
  
  /**
   * 降級處理：在主線程執行
   * 
   * 💡 思考：使用 setTimeout 分片避免阻塞
   */
  private async executeFallback<T, R>(task: WorkerTask<T, R>): Promise<R> {
    return new Promise((resolve, reject) => {
      // 使用 setTimeout 讓出主線程
      setTimeout(() => {
        try {
          // 簡化的主線程處理
          const result = this.processFallback(task.type, task.data);
          resolve(result as R);
        } catch (error) {
          reject(error);
        }
      }, 0);
    });
  }
  
  private processFallback(type: TaskType, data: any): any {
    // 簡化版本的處理邏輯
    switch (type) {
      case 'filter-data':
        return data.items.filter((item: any) => {
          for (const [key, value] of Object.entries(data.filters)) {
            if (item[key] !== value) return false;
          }
          return true;
        });
        
      case 'sort-data':
        return [...data.items].sort((a, b) => {
          const aVal = a[data.sortBy];
          const bVal = b[data.sortBy];
          return data.order === 'asc' ? 
            (aVal < bVal ? -1 : 1) : 
            (aVal > bVal ? -1 : 1);
        });
        
      default:
        console.warn('[WorkerPool] Fallback not implemented for:', type);
        return data.items || data;
    }
  }
  
  private updateStats(): void {
    this._stats.set({
      totalWorkers: this.workerPool.length,
      activeWorkers: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      completedTasks: this._stats().completedTasks,
      failedTasks: this._stats().failedTasks,
      avgTaskTime: this._stats().avgTaskTime
    });
  }
}
