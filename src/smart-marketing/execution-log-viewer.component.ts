/**
 * 執行日誌查看器組件
 * Execution Log Viewer Component
 * 
 * 🆕 前端優化: 實時執行日誌查看
 */

import { Component, signal, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExecutionLogService, ExecutionLogLevel, ExecutionLog } from '../services/execution-log.service';
import { MarketingTaskService } from '../services/marketing-task.service';

@Component({
  selector: 'app-execution-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="execution-log-viewer h-full flex flex-col">
      <!-- 工具欄 -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
        <div class="flex items-center gap-3">
          <h3 class="font-semibold text-white flex items-center gap-2">
            <span>📝</span> 執行日誌
          </h3>
          
          <!-- 實時開關 -->
          <button (click)="toggleLive()"
                  class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all"
                  [class.bg-emerald-500/20]="logService.isLive()"
                  [class.text-emerald-400]="logService.isLive()"
                  [class.bg-slate-700]="!logService.isLive()"
                  [class.text-slate-400]="!logService.isLive()">
            <span class="w-2 h-2 rounded-full"
                  [class.bg-emerald-400]="logService.isLive()"
                  [class.animate-pulse]="logService.isLive()"
                  [class.bg-slate-500]="!logService.isLive()"></span>
            {{ logService.isLive() ? '實時' : '暫停' }}
          </button>
          
          <!-- 統計 -->
          <div class="flex items-center gap-2 text-xs">
            <span class="px-2 py-1 rounded bg-slate-700 text-slate-300">
              {{ logService.stats().total }} 條
            </span>
            @if (logService.stats().error > 0) {
              <span class="px-2 py-1 rounded bg-red-500/20 text-red-400">
                {{ logService.stats().error }} 錯誤
              </span>
            }
            @if (logService.stats().warning > 0) {
              <span class="px-2 py-1 rounded bg-amber-500/20 text-amber-400">
                {{ logService.stats().warning }} 警告
              </span>
            }
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- 搜索 -->
          <div class="relative">
            <input type="text"
                   [(ngModel)]="searchQuery"
                   (ngModelChange)="updateSearch($event)"
                   placeholder="搜索日誌..."
                   class="pl-8 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 w-48">
            <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
          
          <!-- 級別過濾 -->
          <select [(ngModel)]="levelFilter"
                  (ngModelChange)="updateLevelFilter($event)"
                  class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
            <option value="">全部級別</option>
            <option value="debug">調試</option>
            <option value="info">信息</option>
            <option value="success">成功</option>
            <option value="warning">警告</option>
            <option value="error">錯誤</option>
          </select>
          
          <!-- 任務過濾 -->
          @if (!taskId()) {
            <select [(ngModel)]="taskFilter"
                    (ngModelChange)="updateTaskFilter($event)"
                    class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm max-w-[150px]">
              <option value="">全部任務</option>
              @for (task of tasks(); track task.id) {
                <option [value]="task.id">{{ task.name }}</option>
              }
            </select>
          }
          
          <!-- 操作按鈕 -->
          <button (click)="exportLogs()"
                  class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
            📥 導出
          </button>
          <button (click)="clearLogs()"
                  class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
            🗑️ 清除
          </button>
        </div>
      </div>
      
      <!-- 日誌列表 -->
      <div class="flex-1 overflow-y-auto p-2">
        @if (filteredLogs().length > 0) {
          <div class="space-y-1">
            @for (log of filteredLogs(); track log.id) {
              <div class="log-entry flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors text-sm"
                   [class.bg-red-500/5]="log.level === 'error'"
                   [class.bg-amber-500/5]="log.level === 'warning'">
                <!-- 時間 -->
                <span class="text-xs text-slate-500 font-mono whitespace-nowrap w-20">
                  {{ formatTime(log.timestamp) }}
                </span>
                
                <!-- 級別圖標 -->
                <span class="flex-shrink-0 w-5 text-center">
                  {{ getLevelIcon(log.level) }}
                </span>
                
                <!-- 類別 -->
                <span class="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50"
                      [class.text-cyan-400]="log.category === 'AI'"
                      [class.text-purple-400]="log.category === '任務'"
                      [class.text-emerald-400]="log.category === '消息'"
                      [class.text-amber-400]="log.category === '客戶'"
                      [class.text-slate-400]="!['AI', '任務', '消息', '客戶'].includes(log.category)">
                  {{ log.category }}
                </span>
                
                <!-- 消息 -->
                <span class="flex-1 text-slate-300">{{ log.message }}</span>
                
                <!-- 任務名稱 -->
                @if (log.taskName && !taskId()) {
                  <span class="text-xs text-slate-500 truncate max-w-[120px]" [title]="log.taskName">
                    {{ log.taskName }}
                  </span>
                }
                
                <!-- 詳情按鈕 -->
                @if (log.details) {
                  <button (click)="showDetails(log)"
                          class="text-xs text-slate-500 hover:text-white transition-colors">
                    📋
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="flex flex-col items-center justify-center h-full text-slate-400">
            <div class="text-5xl mb-4">📝</div>
            <p class="text-lg mb-2">暫無日誌</p>
            <p class="text-sm text-slate-500">
              @if (searchQuery || levelFilter || taskFilter) {
                嘗試調整過濾條件
              } @else {
                任務執行時將顯示日誌
              }
            </p>
          </div>
        }
      </div>
      
      <!-- 詳情彈窗 -->
      @if (selectedLog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
             (click)="selectedLog.set(null)">
          <div class="bg-slate-900 rounded-xl border border-slate-700 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
               (click)="$event.stopPropagation()">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-white">日誌詳情</h3>
              <button (click)="selectedLog.set(null)" class="text-slate-400 hover:text-white">✕</button>
            </div>
            
            <div class="space-y-3 text-sm">
              <div class="flex gap-3">
                <span class="text-slate-400 w-20">時間</span>
                <span class="text-white">{{ formatFullTime(selectedLog()!.timestamp) }}</span>
              </div>
              <div class="flex gap-3">
                <span class="text-slate-400 w-20">級別</span>
                <span [class.text-emerald-400]="selectedLog()!.level === 'success'"
                      [class.text-amber-400]="selectedLog()!.level === 'warning'"
                      [class.text-red-400]="selectedLog()!.level === 'error'"
                      [class.text-cyan-400]="selectedLog()!.level === 'info'">
                  {{ getLevelLabel(selectedLog()!.level) }}
                </span>
              </div>
              <div class="flex gap-3">
                <span class="text-slate-400 w-20">類別</span>
                <span class="text-white">{{ selectedLog()!.category }}</span>
              </div>
              <div class="flex gap-3">
                <span class="text-slate-400 w-20">消息</span>
                <span class="text-white">{{ selectedLog()!.message }}</span>
              </div>
              @if (selectedLog()!.details) {
                <div>
                  <span class="text-slate-400 block mb-2">詳細數據</span>
                  <pre class="p-4 bg-slate-800 rounded-lg text-xs text-slate-300 overflow-auto">{{ selectedLog()!.details | json }}</pre>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ExecutionLogViewerComponent {
  logService = inject(ExecutionLogService);
  private taskService = inject(MarketingTaskService);
  
  // 輸入 - 限制為特定任務
  taskId = input<string | null>(null);
  
  // 過濾狀態
  searchQuery = '';
  levelFilter: ExecutionLogLevel | '' = '';
  taskFilter = '';
  
  // 詳情彈窗
  selectedLog = signal<ExecutionLog | null>(null);
  
  // 計算屬性
  tasks = computed(() => this.taskService.tasks());
  
  filteredLogs = computed(() => {
    let logs = this.logService.filteredLogs();
    
    // 如果指定了任務ID，只顯示該任務的日誌
    const tid = this.taskId();
    if (tid) {
      logs = logs.filter(l => l.taskId === tid);
    }
    
    return logs;
  });
  
  // 方法
  toggleLive(): void {
    this.logService.toggleLive();
  }
  
  updateSearch(query: string): void {
    this.logService.updateFilter({ search: query || undefined });
  }
  
  updateLevelFilter(level: ExecutionLogLevel | ''): void {
    this.logService.updateFilter({ level: level || undefined });
  }
  
  updateTaskFilter(taskId: string): void {
    this.logService.updateFilter({ taskId: taskId || undefined });
  }
  
  clearLogs(): void {
    if (confirm('確定要清除所有日誌嗎？')) {
      const tid = this.taskId();
      if (tid) {
        this.logService.clearTaskLogs(tid);
      } else {
        this.logService.clearLogs();
      }
    }
  }
  
  exportLogs(): void {
    this.logService.exportLogs('json');
  }
  
  showDetails(log: ExecutionLog): void {
    this.selectedLog.set(log);
  }
  
  // 輔助方法
  getLevelIcon(level: ExecutionLogLevel): string {
    const icons: Record<ExecutionLogLevel, string> = {
      'debug': '🔧',
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    };
    return icons[level];
  }
  
  getLevelLabel(level: ExecutionLogLevel): string {
    const labels: Record<ExecutionLogLevel, string> = {
      'debug': '調試',
      'info': '信息',
      'success': '成功',
      'warning': '警告',
      'error': '錯誤'
    };
    return labels[level];
  }
  
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  formatFullTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW');
  }
}
