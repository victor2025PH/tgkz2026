/**
 * Scheduler Service
 * 排程系統服務
 * 
 * 功能：
 * - 定時任務管理
 * - Cron 表達式支持
 * - 任務隊列
 * - 任務歷史記錄
 */
import { Injectable, signal, computed, OnDestroy } from '@angular/core';

// ============ 類型定義 ============

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskType = 'message' | 'backup' | 'report' | 'cleanup' | 'sync' | 'custom';
export type RepeatType = 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';

export interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  enabled: boolean;
  
  // 調度設置
  schedule: {
    type: RepeatType;
    time?: string;          // HH:mm 格式
    dayOfWeek?: number;     // 0-6 (週日-週六)
    dayOfMonth?: number;    // 1-31
    cron?: string;          // Cron 表達式
    timezone?: string;
  };
  
  // 任務配置
  config: Record<string, any>;
  
  // 執行信息
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  lastResult?: {
    success: boolean;
    message: string;
    duration: number;
    data?: any;
  };
  
  // 元數據
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  taskName: string;
  startTime: Date;
  endTime?: Date;
  status: TaskStatus;
  result?: {
    success: boolean;
    message: string;
    data?: any;
  };
  duration?: number;
  logs: string[];
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SchedulerService implements OnDestroy {
  
  // 任務列表
  private _tasks = signal<ScheduledTask[]>([]);
  tasks = this._tasks.asReadonly();
  
  // 執行歷史
  private _executions = signal<TaskExecution[]>([]);
  executions = this._executions.asReadonly();
  
  // 當前運行的任務
  private _runningTasks = signal<Set<string>>(new Set());
  runningTasks = this._runningTasks.asReadonly();
  
  // 計算屬性
  enabledTasks = computed(() => this._tasks().filter(t => t.enabled));
  pendingTasks = computed(() => this._tasks().filter(t => t.status === 'pending'));
  
  upcomingTasks = computed(() => {
    const now = new Date();
    return this._tasks()
      .filter(t => t.enabled && t.nextRun && t.nextRun > now)
      .sort((a, b) => (a.nextRun?.getTime() || 0) - (b.nextRun?.getTime() || 0))
      .slice(0, 10);
  });
  
  // 定時器
  private checkInterval: any;
  private taskHandlers = new Map<TaskType, (task: ScheduledTask) => Promise<any>>();
  
  constructor() {
    this.loadData();
    this.registerDefaultHandlers();
    this.startScheduler();
  }
  
  ngOnDestroy(): void {
    this.stopScheduler();
  }
  
  // ============ 任務管理 ============
  
  /**
   * 創建任務
   */
  createTask(params: {
    name: string;
    description?: string;
    type: TaskType;
    schedule: ScheduledTask['schedule'];
    config?: Record<string, any>;
    enabled?: boolean;
  }): ScheduledTask {
    const task: ScheduledTask = {
      id: 'task-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: params.name,
      description: params.description || '',
      type: params.type,
      status: 'pending',
      enabled: params.enabled ?? true,
      schedule: params.schedule,
      config: params.config || {},
      runCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 計算下次運行時間
    task.nextRun = this.calculateNextRun(task);
    
    this._tasks.update(tasks => [...tasks, task]);
    this.saveData();
    
    return task;
  }
  
  /**
   * 更新任務
   */
  updateTask(taskId: string, updates: Partial<ScheduledTask>): void {
    this._tasks.update(tasks =>
      tasks.map(t => {
        if (t.id !== taskId) return t;
        const updated = { ...t, ...updates, updatedAt: new Date() };
        updated.nextRun = this.calculateNextRun(updated);
        return updated;
      })
    );
    this.saveData();
  }
  
  /**
   * 刪除任務
   */
  deleteTask(taskId: string): void {
    this._tasks.update(tasks => tasks.filter(t => t.id !== taskId));
    this.saveData();
  }
  
  /**
   * 啟用/禁用任務
   */
  toggleTask(taskId: string): void {
    this._tasks.update(tasks =>
      tasks.map(t => {
        if (t.id !== taskId) return t;
        const enabled = !t.enabled;
        return {
          ...t,
          enabled,
          nextRun: enabled ? this.calculateNextRun(t) : undefined,
          updatedAt: new Date()
        };
      })
    );
    this.saveData();
  }
  
  /**
   * 立即執行任務
   */
  async runNow(taskId: string): Promise<TaskExecution | null> {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task) return null;
    
    return this.executeTask(task);
  }
  
  // ============ 任務執行 ============
  
  /**
   * 註冊任務處理器
   */
  registerHandler(type: TaskType, handler: (task: ScheduledTask) => Promise<any>): void {
    this.taskHandlers.set(type, handler);
  }
  
  /**
   * 執行任務
   */
  private async executeTask(task: ScheduledTask): Promise<TaskExecution> {
    const execution: TaskExecution = {
      id: 'exec-' + Date.now().toString(36),
      taskId: task.id,
      taskName: task.name,
      startTime: new Date(),
      status: 'running',
      logs: []
    };
    
    // 標記為運行中
    this._runningTasks.update(running => {
      const newSet = new Set(running);
      newSet.add(task.id);
      return newSet;
    });
    
    this._tasks.update(tasks =>
      tasks.map(t => t.id === task.id ? { ...t, status: 'running' as TaskStatus } : t)
    );
    
    execution.logs.push(`[${new Date().toISOString()}] 任務開始執行`);
    
    try {
      const handler = this.taskHandlers.get(task.type);
      if (!handler) {
        throw new Error(`No handler registered for task type: ${task.type}`);
      }
      
      const result = await handler(task);
      
      execution.endTime = new Date();
      execution.status = 'completed';
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.result = {
        success: true,
        message: '執行成功',
        data: result
      };
      execution.logs.push(`[${new Date().toISOString()}] 任務完成，耗時 ${execution.duration}ms`);
      
    } catch (error: any) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.result = {
        success: false,
        message: error.message || '執行失敗'
      };
      execution.logs.push(`[${new Date().toISOString()}] 任務失敗: ${error.message}`);
    }
    
    // 更新任務狀態
    this._tasks.update(tasks =>
      tasks.map(t => {
        if (t.id !== task.id) return t;
        return {
          ...t,
          status: 'pending' as TaskStatus,
          lastRun: execution.startTime,
          nextRun: t.schedule.type !== 'once' ? this.calculateNextRun(t) : undefined,
          runCount: t.runCount + 1,
          lastResult: execution.result,
          updatedAt: new Date()
        };
      })
    );
    
    // 移除運行標記
    this._runningTasks.update(running => {
      const newSet = new Set(running);
      newSet.delete(task.id);
      return newSet;
    });
    
    // 添加到執行歷史
    this._executions.update(execs => [execution, ...execs].slice(0, 500));
    
    this.saveData();
    
    return execution;
  }
  
  /**
   * 註冊默認處理器
   */
  private registerDefaultHandlers(): void {
    // 備份任務
    this.registerHandler('backup', async (task) => {
      // 模擬備份
      await new Promise(r => setTimeout(r, 1000));
      return { backupId: 'backup-' + Date.now(), size: Math.random() * 1000000 };
    });
    
    // 清理任務
    this.registerHandler('cleanup', async (task) => {
      // 模擬清理
      await new Promise(r => setTimeout(r, 500));
      return { cleanedItems: Math.floor(Math.random() * 100) };
    });
    
    // 報告任務
    this.registerHandler('report', async (task) => {
      await new Promise(r => setTimeout(r, 800));
      return { reportGenerated: true };
    });
    
    // 同步任務
    this.registerHandler('sync', async (task) => {
      await new Promise(r => setTimeout(r, 1500));
      return { syncedRecords: Math.floor(Math.random() * 500) };
    });
    
    // 消息任務
    this.registerHandler('message', async (task) => {
      await new Promise(r => setTimeout(r, 300));
      return { messagesSent: task.config.count || 1 };
    });
    
    // 自定義任務
    this.registerHandler('custom', async (task) => {
      if (task.config.script) {
        // 可以執行自定義邏輯
      }
      return { executed: true };
    });
  }
  
  // ============ 調度器 ============
  
  /**
   * 啟動調度器
   */
  private startScheduler(): void {
    // 每分鐘檢查一次
    this.checkInterval = setInterval(() => this.checkTasks(), 60000);
    
    // 立即檢查一次
    this.checkTasks();
  }
  
  /**
   * 停止調度器
   */
  private stopScheduler(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }
  
  /**
   * 檢查待執行任務
   */
  private checkTasks(): void {
    const now = new Date();
    const tasks = this._tasks();
    
    for (const task of tasks) {
      if (!task.enabled) continue;
      if (this._runningTasks().has(task.id)) continue;
      if (!task.nextRun) continue;
      
      if (task.nextRun <= now) {
        this.executeTask(task);
      }
    }
  }
  
  /**
   * 計算下次運行時間
   */
  calculateNextRun(task: ScheduledTask): Date | undefined {
    const now = new Date();
    const schedule = task.schedule;
    
    switch (schedule.type) {
      case 'once':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const next = new Date();
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1);
          return next;
        }
        return undefined;
        
      case 'hourly':
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(nextHour.getHours() + 1);
        return nextHour;
        
      case 'daily':
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          const next = new Date();
          next.setHours(hours, minutes, 0, 0);
          if (next <= now) next.setDate(next.getDate() + 1);
          return next;
        }
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay;
        
      case 'weekly':
        const targetDay = schedule.dayOfWeek ?? 1;  // 默認週一
        const next = new Date();
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          next.setHours(hours, minutes, 0, 0);
        }
        const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + daysUntil);
        return next;
        
      case 'monthly':
        const targetDate = schedule.dayOfMonth ?? 1;
        const nextMonth = new Date();
        nextMonth.setDate(targetDate);
        if (schedule.time) {
          const [hours, minutes] = schedule.time.split(':').map(Number);
          nextMonth.setHours(hours, minutes, 0, 0);
        }
        if (nextMonth <= now) {
          nextMonth.setMonth(nextMonth.getMonth() + 1);
        }
        return nextMonth;
        
      case 'cron':
        if (schedule.cron) {
          return this.parseCron(schedule.cron, now);
        }
        return undefined;
        
      default:
        return undefined;
    }
  }
  
  /**
   * 解析 Cron 表達式（簡化版）
   */
  private parseCron(cron: string, from: Date): Date {
    // 簡化的 Cron 解析（分 時 日 月 週）
    const parts = cron.split(' ');
    if (parts.length < 5) return from;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const next = new Date(from);
    next.setSeconds(0, 0);
    
    // 設置時間
    if (minute !== '*') {
      next.setMinutes(parseInt(minute, 10));
    }
    if (hour !== '*') {
      next.setHours(parseInt(hour, 10));
    }
    
    // 如果時間已過，加一天
    if (next <= from) {
      next.setDate(next.getDate() + 1);
    }
    
    return next;
  }
  
  // ============ 統計 ============
  
  /**
   * 獲取任務統計
   */
  getStats(): {
    totalTasks: number;
    enabledTasks: number;
    runToday: number;
    successRate: number;
    tasksByType: Record<TaskType, number>;
  } {
    const tasks = this._tasks();
    const executions = this._executions();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayExecs = executions.filter(e => e.startTime >= today);
    const successExecs = executions.filter(e => e.result?.success);
    
    const tasksByType: Record<TaskType, number> = {
      message: 0, backup: 0, report: 0, cleanup: 0, sync: 0, custom: 0
    };
    tasks.forEach(t => tasksByType[t.type]++);
    
    return {
      totalTasks: tasks.length,
      enabledTasks: tasks.filter(t => t.enabled).length,
      runToday: todayExecs.length,
      successRate: executions.length > 0 ? (successExecs.length / executions.length) * 100 : 100,
      tasksByType
    };
  }
  
  // ============ 持久化 ============
  
  private loadData(): void {
    try {
      const tasksData = localStorage.getItem('tg-matrix-scheduled-tasks');
      if (tasksData) {
        const tasks = JSON.parse(tasksData).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          lastRun: t.lastRun ? new Date(t.lastRun) : undefined,
          nextRun: t.nextRun ? new Date(t.nextRun) : undefined
        }));
        this._tasks.set(tasks);
      }
      
      const execsData = localStorage.getItem('tg-matrix-task-executions');
      if (execsData) {
        const execs = JSON.parse(execsData).map((e: any) => ({
          ...e,
          startTime: new Date(e.startTime),
          endTime: e.endTime ? new Date(e.endTime) : undefined
        }));
        this._executions.set(execs);
      }
    } catch (e) {
      console.error('Failed to load scheduler data:', e);
    }
  }
  
  private saveData(): void {
    try {
      localStorage.setItem('tg-matrix-scheduled-tasks', JSON.stringify(this._tasks()));
      localStorage.setItem('tg-matrix-task-executions', JSON.stringify(this._executions().slice(0, 100)));
    } catch (e) {
      console.error('Failed to save scheduler data:', e);
    }
  }
}
