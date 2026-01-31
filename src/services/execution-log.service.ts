/**
 * 執行日誌服務
 * Execution Log Service
 * 
 * 🆕 前端優化: 實時執行日誌
 * 
 * 功能：
 * - 收集和管理任務執行日誌
 * - 實時更新
 * - 日誌過濾和搜索
 * - 日誌導出
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 日誌級別
export type ExecutionLogLevel = 'debug' | 'info' | 'success' | 'warning' | 'error';

// 日誌條目
export interface ExecutionLog {
  id: string;
  taskId: string;
  taskName?: string;
  level: ExecutionLogLevel;
  category: string;
  message: string;
  details?: any;
  timestamp: string;
}

// 日誌過濾器
export interface LogFilter {
  taskId?: string;
  level?: ExecutionLogLevel;
  category?: string;
  search?: string;
  startTime?: string;
  endTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExecutionLogService {
  private ipc = inject(ElectronIpcService);
  
  // 日誌存儲
  private _logs = signal<ExecutionLog[]>([]);
  logs = this._logs.asReadonly();
  
  // 是否實時更新
  private _isLive = signal(true);
  isLive = this._isLive.asReadonly();
  
  // 過濾器
  private _filter = signal<LogFilter>({});
  filter = this._filter.asReadonly();
  
  // 最大日誌數量
  private readonly MAX_LOGS = 1000;
  
  // 計算屬性
  filteredLogs = computed(() => {
    const logs = this._logs();
    const filter = this._filter();
    
    return logs.filter(log => {
      if (filter.taskId && log.taskId !== filter.taskId) return false;
      if (filter.level && log.level !== filter.level) return false;
      if (filter.category && log.category !== filter.category) return false;
      if (filter.search) {
        const search = filter.search.toLowerCase();
        if (!log.message.toLowerCase().includes(search) &&
            !log.category.toLowerCase().includes(search)) {
          return false;
        }
      }
      if (filter.startTime && log.timestamp < filter.startTime) return false;
      if (filter.endTime && log.timestamp > filter.endTime) return false;
      
      return true;
    });
  });
  
  // 按任務分組
  logsByTask = computed(() => {
    const logs = this._logs();
    const grouped = new Map<string, ExecutionLog[]>();
    
    logs.forEach(log => {
      if (!grouped.has(log.taskId)) {
        grouped.set(log.taskId, []);
      }
      grouped.get(log.taskId)!.push(log);
    });
    
    return grouped;
  });
  
  // 統計
  stats = computed(() => {
    const logs = this._logs();
    return {
      total: logs.length,
      debug: logs.filter(l => l.level === 'debug').length,
      info: logs.filter(l => l.level === 'info').length,
      success: logs.filter(l => l.level === 'success').length,
      warning: logs.filter(l => l.level === 'warning').length,
      error: logs.filter(l => l.level === 'error').length
    };
  });
  
  constructor() {
    this.setupIpcListeners();
  }
  
  /**
   * 設置 IPC 監聽器
   */
  private setupIpcListeners(): void {
    // 監聽後端日誌
    this.ipc.on('execution-log', (log: ExecutionLog) => {
      if (this._isLive()) {
        this.addLog(log);
      }
    });
    
    // 批量日誌
    this.ipc.on('execution-logs-batch', (logs: ExecutionLog[]) => {
      if (this._isLive()) {
        logs.forEach(log => this.addLog(log));
      }
    });
  }
  
  /**
   * 添加日誌
   */
  addLog(log: Omit<ExecutionLog, 'id' | 'timestamp'>): void {
    const newLog: ExecutionLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
    
    this._logs.update(logs => {
      const updated = [newLog, ...logs];
      // 限制日誌數量
      if (updated.length > this.MAX_LOGS) {
        return updated.slice(0, this.MAX_LOGS);
      }
      return updated;
    });
  }
  
  /**
   * 記錄調試日誌
   */
  debug(taskId: string, category: string, message: string, details?: any): void {
    this.addLog({ taskId, level: 'debug', category, message, details });
  }
  
  /**
   * 記錄信息日誌
   */
  info(taskId: string, category: string, message: string, details?: any): void {
    this.addLog({ taskId, level: 'info', category, message, details });
  }
  
  /**
   * 記錄成功日誌
   */
  success(taskId: string, category: string, message: string, details?: any): void {
    this.addLog({ taskId, level: 'success', category, message, details });
  }
  
  /**
   * 記錄警告日誌
   */
  warning(taskId: string, category: string, message: string, details?: any): void {
    this.addLog({ taskId, level: 'warning', category, message, details });
  }
  
  /**
   * 記錄錯誤日誌
   */
  error(taskId: string, category: string, message: string, details?: any): void {
    this.addLog({ taskId, level: 'error', category, message, details });
  }
  
  /**
   * 設置過濾器
   */
  setFilter(filter: LogFilter): void {
    this._filter.set(filter);
  }
  
  /**
   * 更新過濾器
   */
  updateFilter(updates: Partial<LogFilter>): void {
    this._filter.update(f => ({ ...f, ...updates }));
  }
  
  /**
   * 清除過濾器
   */
  clearFilter(): void {
    this._filter.set({});
  }
  
  /**
   * 切換實時更新
   */
  toggleLive(): void {
    this._isLive.update(v => !v);
  }
  
  /**
   * 設置實時更新
   */
  setLive(live: boolean): void {
    this._isLive.set(live);
  }
  
  /**
   * 清除日誌
   */
  clearLogs(): void {
    this._logs.set([]);
  }
  
  /**
   * 清除特定任務的日誌
   */
  clearTaskLogs(taskId: string): void {
    this._logs.update(logs => logs.filter(l => l.taskId !== taskId));
  }
  
  /**
   * 獲取特定任務的日誌
   */
  getTaskLogs(taskId: string): ExecutionLog[] {
    return this._logs().filter(l => l.taskId === taskId);
  }
  
  /**
   * 導出日誌
   */
  exportLogs(format: 'json' | 'csv' = 'json'): void {
    const logs = this.filteredLogs();
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
      filename = `execution-logs-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      // CSV 格式
      const headers = ['時間', '任務ID', '級別', '類別', '消息'];
      const rows = logs.map(l => [
        l.timestamp,
        l.taskId,
        l.level,
        l.category,
        `"${l.message.replace(/"/g, '""')}"`
      ].join(','));
      
      content = [headers.join(','), ...rows].join('\n');
      filename = `execution-logs-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}
