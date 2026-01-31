/**
 * 任務調度服務
 * Scheduler Service
 * 
 * 🆕 Phase 26: 從 app.component.ts 提取調度相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface ScheduledTask {
  name: string;
  description?: string;
  interval: number; // 秒
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
  status: 'running' | 'idle' | 'error' | 'disabled';
  enabled: boolean;
  errorMessage?: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  uptime: number; // 秒
  totalTasks: number;
  activeTasks: number;
  tasks: ScheduledTask[];
}

export interface SchedulerLog {
  id: string;
  taskName: string;
  timestamp: string;
  type: 'start' | 'complete' | 'error' | 'skip';
  message: string;
  duration?: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _status = signal<SchedulerStatus>({
    isRunning: false,
    uptime: 0,
    totalTasks: 0,
    activeTasks: 0,
    tasks: []
  });
  private _logs = signal<SchedulerLog[]>([]);
  private _isLoading = signal(false);
  
  status = this._status.asReadonly();
  logs = this._logs.asReadonly();
  isLoading = this._isLoading.asReadonly();
  
  // ========== 計算屬性 ==========
  
  isRunning = computed(() => this._status().isRunning);
  tasks = computed(() => this._status().tasks);
  activeTasks = computed(() => this._status().tasks.filter(t => t.status === 'running'));
  idleTasks = computed(() => this._status().tasks.filter(t => t.status === 'idle'));
  errorTasks = computed(() => this._status().tasks.filter(t => t.status === 'error'));
  
  uptimeFormatted = computed(() => {
    const seconds = this._status().uptime;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  });
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('scheduler-status', (data: SchedulerStatus) => {
      this._status.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('scheduler-started', () => {
      this._status.update(s => ({ ...s, isRunning: true }));
      this.toast.success('調度器已啟動');
    });
    
    this.ipc.on('scheduler-stopped', () => {
      this._status.update(s => ({ ...s, isRunning: false }));
      this.toast.info('調度器已停止');
    });
    
    this.ipc.on('scheduler-task-started', (data: { taskName: string }) => {
      this._status.update(s => ({
        ...s,
        tasks: s.tasks.map(t => 
          t.name === data.taskName ? { ...t, status: 'running' as const } : t
        )
      }));
    });
    
    this.ipc.on('scheduler-task-completed', (data: { taskName: string; duration: number }) => {
      this._status.update(s => ({
        ...s,
        tasks: s.tasks.map(t => 
          t.name === data.taskName ? { 
            ...t, 
            status: 'idle' as const,
            lastRun: new Date().toISOString(),
            runCount: t.runCount + 1
          } : t
        )
      }));
    });
    
    this.ipc.on('scheduler-task-error', (data: { taskName: string; error: string }) => {
      this._status.update(s => ({
        ...s,
        tasks: s.tasks.map(t => 
          t.name === data.taskName ? { 
            ...t, 
            status: 'error' as const,
            errorMessage: data.error
          } : t
        )
      }));
      this.toast.error(`任務 ${data.taskName} 執行失敗`);
    });
    
    this.ipc.on('scheduler-logs', (data: SchedulerLog[]) => {
      this._logs.set(data);
    });
  }
  
  // ========== 調度器操作 ==========
  
  loadStatus(): void {
    this._isLoading.set(true);
    this.ipc.send('get-scheduler-status');
  }
  
  start(): void {
    this.ipc.send('start-scheduler');
  }
  
  stop(): void {
    this.ipc.send('stop-scheduler');
  }
  
  restart(): void {
    this.ipc.send('restart-scheduler');
    this.toast.info('正在重啟調度器...');
  }
  
  // ========== 任務操作 ==========
  
  runTask(taskName: string): void {
    this.ipc.send('run-scheduler-task', { taskName });
    this.toast.info(`正在執行任務: ${taskName}`);
  }
  
  enableTask(taskName: string): void {
    this.ipc.send('enable-scheduler-task', { taskName });
    this._status.update(s => ({
      ...s,
      tasks: s.tasks.map(t => 
        t.name === taskName ? { ...t, enabled: true, status: 'idle' as const } : t
      )
    }));
  }
  
  disableTask(taskName: string): void {
    this.ipc.send('disable-scheduler-task', { taskName });
    this._status.update(s => ({
      ...s,
      tasks: s.tasks.map(t => 
        t.name === taskName ? { ...t, enabled: false, status: 'disabled' as const } : t
      )
    }));
  }
  
  updateTaskInterval(taskName: string, interval: number): void {
    this.ipc.send('update-task-interval', { taskName, interval });
    this._status.update(s => ({
      ...s,
      tasks: s.tasks.map(t => 
        t.name === taskName ? { ...t, interval } : t
      )
    }));
    this.toast.success('任務間隔已更新');
  }
  
  // ========== 日誌操作 ==========
  
  loadLogs(limit: number = 100): void {
    this.ipc.send('get-scheduler-logs', { limit });
  }
  
  clearLogs(): void {
    if (!confirm('確定要清除所有調度日誌嗎？')) return;
    this.ipc.send('clear-scheduler-logs');
    this._logs.set([]);
    this.toast.success('調度日誌已清除');
  }
  
  // ========== 工具方法 ==========
  
  getTaskStatusColor(status: ScheduledTask['status']): string {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'idle': return 'text-slate-400';
      case 'error': return 'text-red-400';
      case 'disabled': return 'text-slate-600';
      default: return 'text-slate-400';
    }
  }
  
  getTaskStatusIcon(status: ScheduledTask['status']): string {
    switch (status) {
      case 'running': return '🟢';
      case 'idle': return '⚪';
      case 'error': return '🔴';
      case 'disabled': return '⚫';
      default: return '⚪';
    }
  }
  
  formatInterval(seconds: number): string {
    if (seconds < 60) return `${seconds} 秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} 分鐘`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小時`;
    return `${Math.floor(seconds / 86400)} 天`;
  }
}
