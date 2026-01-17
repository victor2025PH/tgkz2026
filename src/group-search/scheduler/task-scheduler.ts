/**
 * TG-AI智控王 定時任務調度器
 * Task Scheduler v1.0
 * 
 * 功能：
 * - Cron 表達式支持
 * - 定時/週期任務
 * - 任務依賴管理
 * - 失敗重試與通知
 * - 任務日誌記錄
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';

// ============ 類型定義 ============

export type ScheduleType = 
  | 'once'       // 一次性
  | 'interval'   // 間隔重複
  | 'cron'       // Cron 表達式
  | 'daily'      // 每日
  | 'weekly'     // 每週
  | 'monthly';   // 每月

export type TaskStatus = 
  | 'pending'    // 等待中
  | 'running'    // 執行中
  | 'completed'  // 已完成
  | 'failed'     // 失敗
  | 'paused'     // 暫停
  | 'cancelled'; // 取消

export interface ScheduledTask {
  id: string;
  name: string;
  description?: string;
  
  // 調度配置
  schedule: {
    type: ScheduleType;
    cron?: string;           // Cron 表達式
    interval?: number;       // 間隔（毫秒）
    time?: string;           // HH:mm 格式
    dayOfWeek?: number;      // 0-6 (週日-週六)
    dayOfMonth?: number;     // 1-31
    timezone?: string;       // 時區
  };
  
  // 任務配置
  action: {
    type: 'search' | 'extraction' | 'message' | 'export' | 'sync' | 'backup' | 'custom';
    params: Record<string, any>;
    handler?: () => Promise<any>;
  };
  
  // 狀態
  status: TaskStatus;
  enabled: boolean;
  
  // 執行信息
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastResult?: {
    success: boolean;
    data?: any;
    error?: string;
    duration: number;
  };
  
  // 統計
  stats: {
    totalRuns: number;
    successRuns: number;
    failedRuns: number;
    avgDuration: number;
  };
  
  // 依賴
  dependsOn?: string[];  // 依賴的任務 ID
  
  // 重試配置
  retry?: {
    maxRetries: number;
    retryDelay: number;  // 毫秒
    currentRetry: number;
  };
  
  // 通知配置
  notifications?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    channels?: string[];
  };
  
  // 元數據
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  tags?: string[];
}

export interface TaskLog {
  id: string;
  taskId: string;
  taskName: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'success' | 'failed';
  result?: any;
  error?: string;
  duration?: number;
}

export interface SchedulerStats {
  totalTasks: number;
  activeTasks: number;
  pausedTasks: number;
  todayRuns: number;
  todaySuccess: number;
  todayFailed: number;
  upcomingTasks: ScheduledTask[];
}

// ============ Cron 解析器 ============

class CronParser {
  /**
   * 解析 Cron 表達式，返回下次執行時間
   * 格式: 分 時 日 月 週
   * 例如: "0 9 * * 1" = 每週一 9:00
   */
  static getNextRun(cron: string, fromDate: Date = new Date()): Date | null {
    try {
      const parts = cron.trim().split(/\s+/);
      if (parts.length !== 5) return null;
      
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      const now = new Date(fromDate);
      const next = new Date(now);
      next.setSeconds(0);
      next.setMilliseconds(0);
      
      // 簡化版本：支持基本格式
      // 完整實現需要更複雜的邏輯
      
      const targetMinute = minute === '*' ? -1 : parseInt(minute);
      const targetHour = hour === '*' ? -1 : parseInt(hour);
      const targetDayOfMonth = dayOfMonth === '*' ? -1 : parseInt(dayOfMonth);
      const targetMonth = month === '*' ? -1 : parseInt(month) - 1;
      const targetDayOfWeek = dayOfWeek === '*' ? -1 : parseInt(dayOfWeek);
      
      // 設置時間
      if (targetMinute >= 0) next.setMinutes(targetMinute);
      if (targetHour >= 0) next.setHours(targetHour);
      
      // 如果時間已過，推到下一天
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      // 處理週幾
      if (targetDayOfWeek >= 0) {
        while (next.getDay() !== targetDayOfWeek) {
          next.setDate(next.getDate() + 1);
        }
      }
      
      // 處理每月幾號
      if (targetDayOfMonth >= 0) {
        next.setDate(targetDayOfMonth);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
      }
      
      // 處理月份
      if (targetMonth >= 0) {
        next.setMonth(targetMonth);
        if (next <= now) {
          next.setFullYear(next.getFullYear() + 1);
        }
      }
      
      return next;
    } catch {
      return null;
    }
  }
  
  /**
   * 驗證 Cron 表達式
   */
  static isValid(cron: string): boolean {
    return this.getNextRun(cron) !== null;
  }
  
  /**
   * 生成人類可讀的描述
   */
  static describe(cron: string): string {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return '無效的 Cron 表達式';
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    const descriptions: string[] = [];
    
    // 時間
    if (minute !== '*' && hour !== '*') {
      descriptions.push(`每天 ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
    } else if (hour !== '*') {
      descriptions.push(`每小時的第 ${hour} 分鐘`);
    }
    
    // 週幾
    if (dayOfWeek !== '*') {
      const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
      descriptions.push(days[parseInt(dayOfWeek)] || '');
    }
    
    // 日期
    if (dayOfMonth !== '*') {
      descriptions.push(`每月 ${dayOfMonth} 號`);
    }
    
    // 月份
    if (month !== '*') {
      descriptions.push(`${month} 月`);
    }
    
    return descriptions.join(' ') || '未知調度';
  }
}

// ============ 調度器配置 ============

const SCHEDULER_CONFIG = {
  // 檢查間隔（毫秒）
  checkInterval: 10000,  // 10 秒
  
  // 默認重試配置
  defaultRetry: {
    maxRetries: 3,
    retryDelay: 60000  // 1 分鐘
  },
  
  // 日誌保留天數
  logRetentionDays: 30,
  
  // 最大並行任務數
  maxConcurrentTasks: 5
};

@Injectable({
  providedIn: 'root'
})
export class TaskScheduler implements OnDestroy {
  // 任務列表
  private _tasks = signal<ScheduledTask[]>([]);
  tasks = computed(() => this._tasks());
  
  // 任務日誌
  private _logs = signal<TaskLog[]>([]);
  logs = computed(() => this._logs());
  
  // 運行中的任務
  private _runningTasks = signal<Set<string>>(new Set());
  runningTasks = computed(() => this._runningTasks());
  
  // 調度器狀態
  private _isRunning = signal(false);
  isRunning = computed(() => this._isRunning());
  
  // 計時器
  private checkTimer: any = null;
  
  // 任務處理器映射
  private handlers: Map<string, (params: any) => Promise<any>> = new Map();
  
  // 計算屬性
  enabledTasks = computed(() => this._tasks().filter(t => t.enabled));
  pendingTasks = computed(() => this._tasks().filter(t => t.status === 'pending'));
  
  upcomingTasks = computed(() => {
    const now = new Date();
    return this._tasks()
      .filter(t => t.enabled && t.nextRunAt && t.nextRunAt > now)
      .sort((a, b) => (a.nextRunAt?.getTime() || 0) - (b.nextRunAt?.getTime() || 0))
      .slice(0, 10);
  });
  
  todayStats = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = this._logs().filter(l => 
      new Date(l.startedAt) >= today
    );
    
    return {
      runs: todayLogs.length,
      success: todayLogs.filter(l => l.status === 'success').length,
      failed: todayLogs.filter(l => l.status === 'failed').length
    };
  });
  
  constructor() {
    this.loadTasks();
    this.loadLogs();
    this.registerDefaultHandlers();
  }
  
  ngOnDestroy(): void {
    this.stop();
  }
  
  // ============ 調度器控制 ============
  
  /**
   * 啟動調度器
   */
  start(): void {
    if (this._isRunning()) return;
    
    this._isRunning.set(true);
    this.checkTimer = setInterval(() => {
      this.checkAndRunTasks();
    }, SCHEDULER_CONFIG.checkInterval);
    
    console.log('[Scheduler] Started');
    
    // 立即檢查一次
    this.checkAndRunTasks();
  }
  
  /**
   * 停止調度器
   */
  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    this._isRunning.set(false);
    
    console.log('[Scheduler] Stopped');
  }
  
  /**
   * 檢查並執行到期任務
   */
  private async checkAndRunTasks(): Promise<void> {
    const now = new Date();
    const tasks = this._tasks();
    
    for (const task of tasks) {
      if (!task.enabled || task.status === 'running' || task.status === 'paused') {
        continue;
      }
      
      // 檢查並行限制
      if (this._runningTasks().size >= SCHEDULER_CONFIG.maxConcurrentTasks) {
        break;
      }
      
      // 檢查是否到執行時間
      if (task.nextRunAt && task.nextRunAt <= now) {
        // 檢查依賴
        if (task.dependsOn && task.dependsOn.length > 0) {
          const dependenciesMet = task.dependsOn.every(depId => {
            const depTask = tasks.find(t => t.id === depId);
            return depTask && depTask.lastResult?.success;
          });
          
          if (!dependenciesMet) {
            console.log(`[Scheduler] Task ${task.id} dependencies not met`);
            continue;
          }
        }
        
        // 執行任務
        this.executeTask(task);
      }
    }
  }
  
  // ============ 任務管理 ============
  
  /**
   * 創建任務
   */
  createTask(config: {
    name: string;
    description?: string;
    schedule: ScheduledTask['schedule'];
    action: ScheduledTask['action'];
    retry?: ScheduledTask['retry'];
    notifications?: ScheduledTask['notifications'];
    dependsOn?: string[];
    tags?: string[];
  }): ScheduledTask {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const task: ScheduledTask = {
      id,
      name: config.name,
      description: config.description,
      schedule: config.schedule,
      action: config.action,
      status: 'pending',
      enabled: true,
      stats: {
        totalRuns: 0,
        successRuns: 0,
        failedRuns: 0,
        avgDuration: 0
      },
      dependsOn: config.dependsOn,
      retry: config.retry || { ...SCHEDULER_CONFIG.defaultRetry, currentRetry: 0 },
      notifications: config.notifications,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: config.tags
    };
    
    // 計算下次執行時間
    task.nextRunAt = this.calculateNextRun(task);
    
    this._tasks.update(tasks => [...tasks, task]);
    this.saveTasks();
    
    console.log(`[Scheduler] Task created: ${task.name} (${task.id})`);
    
    return task;
  }
  
  /**
   * 更新任務
   */
  updateTask(taskId: string, updates: Partial<ScheduledTask>): boolean {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task) return false;
    
    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };
    
    // 如果調度配置變更，重新計算下次執行時間
    if (updates.schedule) {
      updated.nextRunAt = this.calculateNextRun(updated);
    }
    
    this._tasks.update(tasks => 
      tasks.map(t => t.id === taskId ? updated : t)
    );
    this.saveTasks();
    
    return true;
  }
  
  /**
   * 刪除任務
   */
  deleteTask(taskId: string): boolean {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task) return false;
    
    // 如果正在運行，先取消
    if (task.status === 'running') {
      this.cancelTask(taskId);
    }
    
    this._tasks.update(tasks => tasks.filter(t => t.id !== taskId));
    this.saveTasks();
    
    console.log(`[Scheduler] Task deleted: ${task.name}`);
    
    return true;
  }
  
  /**
   * 啟用任務
   */
  enableTask(taskId: string): boolean {
    return this.updateTask(taskId, { enabled: true, status: 'pending' });
  }
  
  /**
   * 禁用任務
   */
  disableTask(taskId: string): boolean {
    return this.updateTask(taskId, { enabled: false, status: 'paused' });
  }
  
  /**
   * 立即執行任務
   */
  runNow(taskId: string): void {
    const task = this._tasks().find(t => t.id === taskId);
    if (!task) return;
    
    this.executeTask(task);
  }
  
  /**
   * 取消任務
   */
  cancelTask(taskId: string): void {
    this._runningTasks.update(running => {
      const newRunning = new Set(running);
      newRunning.delete(taskId);
      return newRunning;
    });
    
    this.updateTask(taskId, { status: 'cancelled' });
  }
  
  // ============ 任務執行 ============
  
  /**
   * 執行任務
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    console.log(`[Scheduler] Executing task: ${task.name}`);
    
    // 標記為運行中
    this._runningTasks.update(running => new Set(running).add(task.id));
    this.updateTask(task.id, { status: 'running' });
    
    // 創建日誌
    const log: TaskLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      taskId: task.id,
      taskName: task.name,
      startedAt: new Date(),
      status: 'running'
    };
    this._logs.update(logs => [log, ...logs.slice(0, 999)]);
    
    const startTime = Date.now();
    
    try {
      // 獲取處理器
      const handler = task.action.handler || this.handlers.get(task.action.type);
      
      if (!handler) {
        throw new Error(`No handler for action type: ${task.action.type}`);
      }
      
      // 執行
      const result = await handler(task.action.params);
      
      // 計算執行時間
      const duration = Date.now() - startTime;
      
      // 更新任務
      const newAvgDuration = 
        (task.stats.avgDuration * task.stats.totalRuns + duration) / (task.stats.totalRuns + 1);
      
      this.updateTask(task.id, {
        status: 'pending',
        lastRunAt: new Date(),
        nextRunAt: this.calculateNextRun(task),
        lastResult: { success: true, data: result, duration },
        stats: {
          ...task.stats,
          totalRuns: task.stats.totalRuns + 1,
          successRuns: task.stats.successRuns + 1,
          avgDuration: newAvgDuration
        },
        retry: task.retry ? { ...task.retry, currentRetry: 0 } : undefined
      });
      
      // 更新日誌
      log.status = 'success';
      log.completedAt = new Date();
      log.duration = duration;
      log.result = result;
      this.updateLog(log);
      
      console.log(`[Scheduler] Task completed: ${task.name} (${duration}ms)`);
      
      // 成功通知
      if (task.notifications?.onSuccess) {
        this.sendNotification(task, 'success', result);
      }
      
    } catch (error: any) {
      console.error(`[Scheduler] Task failed: ${task.name}`, error);
      
      const duration = Date.now() - startTime;
      
      // 更新日誌
      log.status = 'failed';
      log.completedAt = new Date();
      log.duration = duration;
      log.error = error.message;
      this.updateLog(log);
      
      // 重試邏輯
      if (task.retry && task.retry.currentRetry < task.retry.maxRetries) {
        const nextRetry = task.retry.currentRetry + 1;
        const retryAt = new Date(Date.now() + task.retry.retryDelay * nextRetry);
        
        this.updateTask(task.id, {
          status: 'pending',
          nextRunAt: retryAt,
          retry: { ...task.retry, currentRetry: nextRetry },
          lastResult: { success: false, error: error.message, duration }
        });
        
        console.log(`[Scheduler] Task ${task.name} will retry (${nextRetry}/${task.retry.maxRetries}) at ${retryAt}`);
      } else {
        // 最終失敗
        this.updateTask(task.id, {
          status: 'failed',
          lastRunAt: new Date(),
          lastResult: { success: false, error: error.message, duration },
          stats: {
            ...task.stats,
            totalRuns: task.stats.totalRuns + 1,
            failedRuns: task.stats.failedRuns + 1
          }
        });
        
        // 失敗通知
        if (task.notifications?.onFailure) {
          this.sendNotification(task, 'failure', error.message);
        }
      }
      
    } finally {
      // 從運行中移除
      this._runningTasks.update(running => {
        const newRunning = new Set(running);
        newRunning.delete(task.id);
        return newRunning;
      });
    }
  }
  
  // ============ 時間計算 ============
  
  /**
   * 計算下次執行時間
   */
  private calculateNextRun(task: ScheduledTask): Date | undefined {
    const schedule = task.schedule;
    const now = new Date();
    
    switch (schedule.type) {
      case 'once':
        // 一次性任務不重複
        return task.lastRunAt ? undefined : now;
        
      case 'interval':
        if (!schedule.interval) return undefined;
        const lastRun = task.lastRunAt || now;
        return new Date(lastRun.getTime() + schedule.interval);
        
      case 'cron':
        if (!schedule.cron) return undefined;
        return CronParser.getNextRun(schedule.cron) || undefined;
        
      case 'daily':
        if (!schedule.time) return undefined;
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const daily = new Date(now);
        daily.setHours(hours, minutes, 0, 0);
        if (daily <= now) {
          daily.setDate(daily.getDate() + 1);
        }
        return daily;
        
      case 'weekly':
        if (schedule.dayOfWeek === undefined || !schedule.time) return undefined;
        const [wHours, wMinutes] = schedule.time.split(':').map(Number);
        const weekly = new Date(now);
        weekly.setHours(wHours, wMinutes, 0, 0);
        while (weekly.getDay() !== schedule.dayOfWeek || weekly <= now) {
          weekly.setDate(weekly.getDate() + 1);
        }
        return weekly;
        
      case 'monthly':
        if (schedule.dayOfMonth === undefined || !schedule.time) return undefined;
        const [mHours, mMinutes] = schedule.time.split(':').map(Number);
        const monthly = new Date(now);
        monthly.setDate(schedule.dayOfMonth);
        monthly.setHours(mHours, mMinutes, 0, 0);
        if (monthly <= now) {
          monthly.setMonth(monthly.getMonth() + 1);
        }
        return monthly;
        
      default:
        return undefined;
    }
  }
  
  // ============ 處理器註冊 ============
  
  /**
   * 註冊任務處理器
   */
  registerHandler(type: string, handler: (params: any) => Promise<any>): void {
    this.handlers.set(type, handler);
    console.log(`[Scheduler] Handler registered: ${type}`);
  }
  
  /**
   * 註冊默認處理器
   */
  private registerDefaultHandlers(): void {
    // 搜索任務
    this.registerHandler('search', async (params) => {
      console.log('[Scheduler] Executing search task:', params);
      // 實際實現會調用搜索服務
      return { searched: true, params };
    });
    
    // 提取任務
    this.registerHandler('extraction', async (params) => {
      console.log('[Scheduler] Executing extraction task:', params);
      return { extracted: true, params };
    });
    
    // 消息任務
    this.registerHandler('message', async (params) => {
      console.log('[Scheduler] Executing message task:', params);
      return { sent: true, params };
    });
    
    // 導出任務
    this.registerHandler('export', async (params) => {
      console.log('[Scheduler] Executing export task:', params);
      return { exported: true, params };
    });
    
    // 同步任務
    this.registerHandler('sync', async (params) => {
      console.log('[Scheduler] Executing sync task:', params);
      return { synced: true, params };
    });
    
    // 備份任務
    this.registerHandler('backup', async (params) => {
      console.log('[Scheduler] Executing backup task:', params);
      return { backed_up: true, params };
    });
  }
  
  // ============ 通知 ============
  
  private sendNotification(task: ScheduledTask, type: 'success' | 'failure', data: any): void {
    console.log(`[Scheduler] Notification: Task "${task.name}" ${type}`, data);
    // 實際實現可以發送 Telegram 消息、郵件等
  }
  
  // ============ 日誌管理 ============
  
  private updateLog(log: TaskLog): void {
    this._logs.update(logs => 
      logs.map(l => l.id === log.id ? log : l)
    );
    this.saveLogs();
  }
  
  /**
   * 獲取任務日誌
   */
  getTaskLogs(taskId: string, limit: number = 50): TaskLog[] {
    return this._logs()
      .filter(l => l.taskId === taskId)
      .slice(0, limit);
  }
  
  /**
   * 清理舊日誌
   */
  cleanOldLogs(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - SCHEDULER_CONFIG.logRetentionDays);
    
    this._logs.update(logs => 
      logs.filter(l => new Date(l.startedAt) >= cutoff)
    );
    this.saveLogs();
  }
  
  // ============ 持久化 ============
  
  private saveTasks(): void {
    try {
      const tasks = this._tasks().map(t => ({
        ...t,
        action: { ...t.action, handler: undefined }  // 不保存處理器函數
      }));
      localStorage.setItem('tgai-scheduled-tasks', JSON.stringify(tasks));
    } catch (e) {}
  }
  
  private loadTasks(): void {
    try {
      const data = localStorage.getItem('tgai-scheduled-tasks');
      if (data) {
        const tasks = JSON.parse(data).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          nextRunAt: t.nextRunAt ? new Date(t.nextRunAt) : undefined,
          lastRunAt: t.lastRunAt ? new Date(t.lastRunAt) : undefined
        }));
        this._tasks.set(tasks);
      }
    } catch (e) {}
  }
  
  private saveLogs(): void {
    try {
      localStorage.setItem('tgai-task-logs', JSON.stringify(this._logs().slice(0, 500)));
    } catch (e) {}
  }
  
  private loadLogs(): void {
    try {
      const data = localStorage.getItem('tgai-task-logs');
      if (data) {
        const logs = JSON.parse(data).map((l: any) => ({
          ...l,
          startedAt: new Date(l.startedAt),
          completedAt: l.completedAt ? new Date(l.completedAt) : undefined
        }));
        this._logs.set(logs);
      }
    } catch (e) {}
  }
  
  // ============ 快捷方法 ============
  
  /**
   * 創建每日任務
   */
  createDailyTask(
    name: string,
    time: string,  // HH:mm
    action: ScheduledTask['action']
  ): ScheduledTask {
    return this.createTask({
      name,
      schedule: { type: 'daily', time },
      action
    });
  }
  
  /**
   * 創建間隔任務
   */
  createIntervalTask(
    name: string,
    intervalMs: number,
    action: ScheduledTask['action']
  ): ScheduledTask {
    return this.createTask({
      name,
      schedule: { type: 'interval', interval: intervalMs },
      action
    });
  }
  
  /**
   * 創建 Cron 任務
   */
  createCronTask(
    name: string,
    cron: string,
    action: ScheduledTask['action']
  ): ScheduledTask {
    return this.createTask({
      name,
      schedule: { type: 'cron', cron },
      action
    });
  }
  
  /**
   * 獲取統計
   */
  getStats(): SchedulerStats {
    const tasks = this._tasks();
    const today = this.todayStats();
    
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.enabled && t.status !== 'paused').length,
      pausedTasks: tasks.filter(t => !t.enabled || t.status === 'paused').length,
      todayRuns: today.runs,
      todaySuccess: today.success,
      todayFailed: today.failed,
      upcomingTasks: this.upcomingTasks()
    };
  }
  
  /**
   * Cron 表達式輔助
   */
  static describeCron = CronParser.describe;
  static validateCron = CronParser.isValid;
}
