/**
 * 任務詳情抽屜組件
 * Task Detail Drawer Component
 * 
 * 🆕 前端優化: 任務詳情抽屜
 * 
 * 功能：
 * - 滑入式詳情面板
 * - 完整任務信息展示
 * - 實時統計和日誌
 * - 快捷操作
 */

import { Component, signal, computed, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingTaskService } from '../services/marketing-task.service';
import { ToastService } from '../toast.service';
import { 
  MarketingTask, 
  GoalType, 
  GOAL_TYPE_CONFIG,
  TaskStatus 
} from '../models/marketing-task.models';

@Component({
  selector: 'app-task-detail-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- 背景遮罩 -->
    <div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
         [class.opacity-0]="!isOpen()"
         [class.pointer-events-none]="!isOpen()"
         (click)="close.emit()">
    </div>
    
    <!-- 抽屜面板 -->
    <div class="fixed right-0 top-0 h-full w-[600px] z-50 bg-slate-900 border-l border-slate-700/50 shadow-2xl transform transition-transform duration-300"
         [class.translate-x-0]="isOpen()"
         [class.translate-x-full]="!isOpen()">
      
      @if (task(); as t) {
        <!-- 頭部 -->
        <div class="p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">{{ getGoalIcon(t.goalType) }}</span>
              <div>
                <h2 class="text-xl font-bold text-white">{{ t.name }}</h2>
                <p class="text-sm text-slate-400">{{ t.description || '無描述' }}</p>
              </div>
            </div>
            <button (click)="close.emit()" 
                    class="text-slate-400 hover:text-white transition-colors text-xl">
              ✕
            </button>
          </div>
          
          <!-- 狀態和操作 -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-full text-sm font-medium"
                    [class.bg-emerald-500/20]="t.status === 'running'"
                    [class.text-emerald-400]="t.status === 'running'"
                    [class.bg-yellow-500/20]="t.status === 'paused'"
                    [class.text-yellow-400]="t.status === 'paused'"
                    [class.bg-slate-500/20]="t.status === 'draft'"
                    [class.text-slate-400]="t.status === 'draft'"
                    [class.bg-purple-500/20]="t.status === 'completed'"
                    [class.text-purple-400]="t.status === 'completed'">
                {{ getStatusLabel(t.status) }}
              </span>
              <span class="text-xs text-slate-500">
                創建於 {{ formatDate(t.createdAt) }}
              </span>
            </div>
            
            <div class="flex items-center gap-2">
              @switch (t.status) {
                @case ('draft') {
                  <button (click)="startTask()"
                          class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm flex items-center gap-2">
                    <span>▶️</span> 啟動
                  </button>
                }
                @case ('running') {
                  <button (click)="pauseTask()"
                          class="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 text-sm flex items-center gap-2">
                    <span>⏸️</span> 暫停
                  </button>
                }
                @case ('paused') {
                  <button (click)="resumeTask()"
                          class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm flex items-center gap-2">
                    <span>▶️</span> 恢復
                  </button>
                }
              }
              <button (click)="duplicateTask()"
                      class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm flex items-center gap-2">
                <span>📋</span> 複製
              </button>
            </div>
          </div>
        </div>
        
        <!-- 內容區域 -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6" style="max-height: calc(100vh - 180px);">
          
          <!-- 統計卡片 -->
          <div class="grid grid-cols-4 gap-3">
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div class="text-2xl font-bold text-cyan-400">{{ t.stats.contacted }}</div>
              <div class="text-xs text-slate-400">已接觸</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div class="text-2xl font-bold text-blue-400">{{ t.stats.replied }}</div>
              <div class="text-xs text-slate-400">已回覆</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div class="text-2xl font-bold text-emerald-400">{{ t.stats.converted }}</div>
              <div class="text-xs text-slate-400">已轉化</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
              <div class="text-2xl font-bold text-purple-400">{{ getConversionRate(t) }}%</div>
              <div class="text-xs text-slate-400">轉化率</div>
            </div>
          </div>
          
          <!-- 執行配置 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 class="font-medium text-white mb-4 flex items-center gap-2">
              <span>⚙️</span> 執行配置
            </h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-slate-400">目標類型：</span>
                <span class="text-white ml-2">{{ getGoalLabel(t.goalType) }}</span>
              </div>
              <div>
                <span class="text-slate-400">執行模式：</span>
                <span class="text-white ml-2">{{ getModeLabel(t.executionMode) }}</span>
              </div>
              <div>
                <span class="text-slate-400">意向閾值：</span>
                <span class="text-white ml-2">{{ t.targetCriteria?.intentScoreMin || 50 }}%</span>
              </div>
              <div>
                <span class="text-slate-400">AI 成本：</span>
                <span class="text-white ml-2">¥{{ t.stats.aiCost.toFixed(2) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 角色配置 -->
          @if (t.roleConfig && t.roleConfig.length > 0) {
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
              <h3 class="font-medium text-white mb-4 flex items-center gap-2">
                <span>🎭</span> 角色配置
              </h3>
              <div class="flex flex-wrap gap-2">
                @for (role of t.roleConfig; track role.roleType) {
                  <div class="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <span class="text-lg">{{ getRoleIcon(role.roleType) }}</span>
                    <span class="text-sm text-white">{{ getRoleLabel(role.roleType) }}</span>
                  </div>
                }
              </div>
            </div>
          }
          
          <!-- 執行進度 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 class="font-medium text-white mb-4 flex items-center gap-2">
              <span>📊</span> 執行進度
            </h3>
            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-400">接觸進度</span>
                  <span class="text-white">{{ getContactProgress(t) }}%</span>
                </div>
                <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full bg-cyan-500 rounded-full transition-all"
                       [style.width.%]="getContactProgress(t)"></div>
                </div>
              </div>
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-400">消息發送</span>
                  <span class="text-white">{{ t.stats.messagesSent }} 條</span>
                </div>
                <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full bg-purple-500 rounded-full transition-all"
                       [style.width.%]="Math.min(100, t.stats.messagesSent / 10)"></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 實時日誌 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-medium text-white flex items-center gap-2">
                <span>📝</span> 執行日誌
              </h3>
              <button (click)="refreshLogs()"
                      class="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                <span class="text-sm">🔄</span> 刷新
              </button>
            </div>
            
            <div class="max-h-48 overflow-y-auto space-y-2">
              @for (log of taskLogs(); track log.id) {
                <div class="flex items-start gap-3 text-sm py-2 border-b border-slate-700/30 last:border-0">
                  <span class="text-slate-500 text-xs whitespace-nowrap">{{ formatTime(log.timestamp) }}</span>
                  <span class="flex-shrink-0"
                        [class.text-emerald-400]="log.type === 'success'"
                        [class.text-amber-400]="log.type === 'warning'"
                        [class.text-red-400]="log.type === 'error'"
                        [class.text-cyan-400]="log.type === 'info'">
                    {{ getLogIcon(log.type) }}
                  </span>
                  <span class="text-slate-300 flex-1">{{ log.message }}</span>
                </div>
              }
              
              @if (taskLogs().length === 0) {
                <div class="text-center py-8 text-slate-500">
                  <div class="text-2xl mb-2">📝</div>
                  <p class="text-sm">暫無日誌</p>
                </div>
              }
            </div>
          </div>
          
          <!-- 時間線 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 class="font-medium text-white mb-4 flex items-center gap-2">
              <span>🕐</span> 時間線
            </h3>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                <div class="flex-1">
                  <div class="text-sm text-white">任務創建</div>
                  <div class="text-xs text-slate-500">{{ formatDate(t.createdAt) }}</div>
                </div>
              </div>
              @if (t.startedAt) {
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div class="flex-1">
                    <div class="text-sm text-white">開始執行</div>
                    <div class="text-xs text-slate-500">{{ formatDate(t.startedAt) }}</div>
                  </div>
                </div>
              }
              @if (t.completedAt) {
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <div class="flex-1">
                    <div class="text-sm text-white">任務完成</div>
                    <div class="text-xs text-slate-500">{{ formatDate(t.completedAt) }}</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- 底部操作 -->
        <div class="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-900/90 backdrop-blur-sm">
          <div class="flex items-center justify-between">
            <button (click)="deleteTask()"
                    class="px-4 py-2 text-red-400 hover:text-red-300 text-sm flex items-center gap-2">
              <span>🗑️</span> 刪除任務
            </button>
            <button (click)="close.emit()"
                    class="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-sm">
              關閉
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class TaskDetailDrawerComponent implements OnInit, OnDestroy {
  private taskService = inject(MarketingTaskService);
  private toast = inject(ToastService);
  
  // 輸入
  taskId = input<string | null>(null);
  isOpen = input(false);
  
  // 輸出
  close = output<void>();
  taskUpdated = output<void>();
  
  // 狀態
  taskLogs = signal<TaskLog[]>([]);
  private logRefreshInterval: any;
  
  // 計算屬性
  task = computed(() => {
    const id = this.taskId();
    if (!id) return null;
    return this.taskService.tasks().find(t => t.id === id) || null;
  });
  
  // 提供 Math 給模板使用
  Math = Math;
  
  ngOnInit(): void {
    // 模擬日誌刷新
    this.refreshLogs();
    this.logRefreshInterval = setInterval(() => {
      if (this.isOpen() && this.task()?.status === 'running') {
        this.addRandomLog();
      }
    }, 5000);
  }
  
  ngOnDestroy(): void {
    if (this.logRefreshInterval) {
      clearInterval(this.logRefreshInterval);
    }
  }
  
  // 任務操作
  startTask(): void {
    const id = this.taskId();
    if (id) {
      this.taskService.startTask(id);
      this.toast.success('任務已啟動');
      this.taskUpdated.emit();
    }
  }
  
  pauseTask(): void {
    const id = this.taskId();
    if (id) {
      this.taskService.pauseTask(id);
      this.toast.success('任務已暫停');
      this.taskUpdated.emit();
    }
  }
  
  resumeTask(): void {
    const id = this.taskId();
    if (id) {
      this.taskService.resumeTask(id);
      this.toast.success('任務已恢復');
      this.taskUpdated.emit();
    }
  }
  
  async duplicateTask(): Promise<void> {
    const t = this.task();
    if (!t) return;
    
    const newId = await this.taskService.create({
      name: `${t.name} (複製)`,
      description: t.description,
      goalType: t.goalType,
      executionMode: t.executionMode,
      roleConfig: t.roleConfig,
      targetCriteria: t.targetCriteria
    });
    
    if (newId) {
      this.toast.success('任務已複製');
      this.taskUpdated.emit();
    }
  }
  
  deleteTask(): void {
    const t = this.task();
    if (!t) return;
    
    if (confirm(`確定要刪除任務「${t.name}」嗎？此操作不可恢復。`)) {
      this.taskService.deleteTask(t.id);
      this.toast.success('任務已刪除');
      this.close.emit();
      this.taskUpdated.emit();
    }
  }
  
  // 日誌操作
  refreshLogs(): void {
    // 模擬獲取日誌
    const t = this.task();
    if (!t) return;
    
    const sampleLogs: TaskLog[] = [
      { id: '1', type: 'info', message: '任務初始化完成', timestamp: t.createdAt },
      { id: '2', type: 'info', message: `目標類型: ${this.getGoalLabel(t.goalType)}`, timestamp: t.createdAt },
    ];
    
    if (t.startedAt) {
      sampleLogs.push({ id: '3', type: 'success', message: '開始執行任務', timestamp: t.startedAt });
    }
    
    if (t.stats.contacted > 0) {
      sampleLogs.push({ id: '4', type: 'success', message: `已接觸 ${t.stats.contacted} 位客戶`, timestamp: new Date().toISOString() });
    }
    
    if (t.stats.converted > 0) {
      sampleLogs.push({ id: '5', type: 'success', message: `🎉 成功轉化 ${t.stats.converted} 位客戶`, timestamp: new Date().toISOString() });
    }
    
    this.taskLogs.set(sampleLogs.reverse());
  }
  
  private addRandomLog(): void {
    const messages = [
      { type: 'info' as const, message: '正在分析客戶意向...' },
      { type: 'success' as const, message: '成功發送問候消息' },
      { type: 'info' as const, message: '等待客戶回覆中' },
      { type: 'success' as const, message: '客戶回覆了消息' },
      { type: 'warning' as const, message: '客戶暫時未回覆，稍後重試' },
    ];
    
    const random = messages[Math.floor(Math.random() * messages.length)];
    const newLog: TaskLog = {
      id: Date.now().toString(),
      ...random,
      timestamp: new Date().toISOString()
    };
    
    this.taskLogs.update(logs => [newLog, ...logs.slice(0, 19)]);
  }
  
  // 輔助方法
  getGoalIcon(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.icon || '🎯';
  }
  
  getGoalLabel(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.label || goalType;
  }
  
  getModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'scripted': '劇本模式',
      'hybrid': '混合模式',
      'scriptless': '無劇本模式'
    };
    return labels[mode] || mode;
  }
  
  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      'draft': '草稿',
      'running': '運行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status];
  }
  
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      'expert': '👨‍💼',
      'satisfied_customer': '😊',
      'support': '👩‍💻',
      'manager': '👔',
      'newbie': '🙋',
      'hesitant': '🤔',
      'sales': '💼',
      'callback': '📞'
    };
    return icons[role] || '🎭';
  }
  
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'expert': '產品專家',
      'satisfied_customer': '滿意老客戶',
      'support': '客服助理',
      'manager': '經理',
      'newbie': '好奇新人',
      'hesitant': '猶豫者',
      'sales': '銷售',
      'callback': '回訪專員'
    };
    return labels[role] || role;
  }
  
  getConversionRate(task: MarketingTask): number {
    if (task.stats.contacted === 0) return 0;
    return Math.round((task.stats.converted / task.stats.contacted) * 100);
  }
  
  getContactProgress(task: MarketingTask): number {
    // 假設目標是接觸 100 人
    return Math.min(100, task.stats.contacted);
  }
  
  getLogIcon(type: string): string {
    const icons: Record<string, string> = {
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'info': 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// 日誌接口
interface TaskLog {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}
