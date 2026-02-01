/**
 * 批量操作組件
 * Batch Operations Component
 * 
 * 🆕 優化 3-1: 批量操作支持
 * 
 * 功能：
 * - 批量選擇任務
 * - 批量啟動/暫停/完成
 * - 批量刪除/複製
 */

import { Component, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketingTaskService } from '../services/marketing-task.service';
import { ToastService } from '../toast.service';
import { MarketingTask, TaskStatus } from '../models/marketing-task.models';

@Component({
  selector: 'app-batch-operations',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="batch-operations">
      <!-- 選擇模式切換 -->
      @if (!isSelecting()) {
        <button (click)="startSelecting()"
                class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm flex items-center gap-2">
          <span>☑️</span> 批量操作
        </button>
      } @else {
        <div class="flex items-center gap-3 p-3 bg-slate-800/80 rounded-xl border border-purple-500/30">
          <!-- 選擇統計 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-400">已選擇</span>
            <span class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg font-bold">
              {{ selectedCount() }}
            </span>
            <span class="text-sm text-slate-400">項</span>
          </div>
          
          <div class="w-px h-6 bg-slate-700"></div>
          
          <!-- 全選/取消 -->
          <button (click)="toggleSelectAll()"
                  class="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            {{ isAllSelected() ? '取消全選' : '全選' }}
          </button>
          
          <div class="w-px h-6 bg-slate-700"></div>
          
          <!-- 批量操作按鈕 -->
          <div class="flex items-center gap-2">
            <!-- 啟動 -->
            <button (click)="batchStart()"
                    [disabled]="!canBatchStart()"
                    class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <span>▶️</span> 啟動
            </button>
            
            <!-- 暫停 -->
            <button (click)="batchPause()"
                    [disabled]="!canBatchPause()"
                    class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <span>⏸️</span> 暫停
            </button>
            
            <!-- 完成 -->
            <button (click)="batchComplete()"
                    [disabled]="!hasSelection()"
                    class="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <span>✅</span> 完成
            </button>
            
            <!-- 複製 -->
            <button (click)="batchDuplicate()"
                    [disabled]="!hasSelection()"
                    class="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <span>📋</span> 複製
            </button>
            
            <!-- 刪除 -->
            <button (click)="batchDelete()"
                    [disabled]="!hasSelection()"
                    class="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
              <span>🗑️</span> 刪除
            </button>
          </div>
          
          <div class="w-px h-6 bg-slate-700"></div>
          
          <!-- 退出選擇模式 -->
          <button (click)="cancelSelecting()"
                  class="px-3 py-1.5 text-slate-400 hover:text-white transition-colors text-sm">
            取消
          </button>
        </div>
      }
    </div>
  `
})
export class BatchOperationsComponent {
  private taskService = inject(MarketingTaskService);
  private toast = inject(ToastService);
  
  // 輸入
  tasks = input<MarketingTask[]>([]);
  
  // 輸出
  selectionChange = output<string[]>();
  operationComplete = output<void>();
  
  // 狀態
  isSelecting = signal(false);
  selectedIds = signal<Set<string>>(new Set());
  
  // 計算屬性
  selectedCount = computed(() => this.selectedIds().size);
  hasSelection = computed(() => this.selectedIds().size > 0);
  
  isAllSelected = computed(() => {
    const taskList = this.tasks();
    return taskList.length > 0 && this.selectedIds().size === taskList.length;
  });
  
  canBatchStart = computed(() => {
    const selected = this.getSelectedTasks();
    return selected.some(t => t.status === 'draft' || t.status === 'paused');
  });
  
  canBatchPause = computed(() => {
    const selected = this.getSelectedTasks();
    return selected.some(t => t.status === 'running');
  });
  
  // 方法
  startSelecting(): void {
    this.isSelecting.set(true);
    this.selectedIds.set(new Set());
  }
  
  cancelSelecting(): void {
    this.isSelecting.set(false);
    this.selectedIds.set(new Set());
    this.selectionChange.emit([]);
  }
  
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.tasks().map(t => t.id)));
    }
    this.selectionChange.emit(Array.from(this.selectedIds()));
  }
  
  toggleSelection(taskId: string): void {
    const current = new Set(this.selectedIds());
    if (current.has(taskId)) {
      current.delete(taskId);
    } else {
      current.add(taskId);
    }
    this.selectedIds.set(current);
    this.selectionChange.emit(Array.from(current));
  }
  
  isSelected(taskId: string): boolean {
    return this.selectedIds().has(taskId);
  }
  
  private getSelectedTasks(): MarketingTask[] {
    const ids = this.selectedIds();
    return this.tasks().filter(t => ids.has(t.id));
  }
  
  private getSelectedIds(): string[] {
    return Array.from(this.selectedIds());
  }
  
  // 批量操作
  batchStart(): void {
    const ids = this.getSelectedIds();
    const eligible = this.getSelectedTasks()
      .filter(t => t.status === 'draft' || t.status === 'paused')
      .map(t => t.id);
    
    if (eligible.length === 0) {
      this.toast.warning('沒有可啟動的任務');
      return;
    }
    
    this.taskService.batchStartTasks(eligible);
    this.toast.success(`已啟動 ${eligible.length} 個任務`);
    this.operationComplete.emit();
    this.cancelSelecting();
  }
  
  batchPause(): void {
    const eligible = this.getSelectedTasks()
      .filter(t => t.status === 'running')
      .map(t => t.id);
    
    if (eligible.length === 0) {
      this.toast.warning('沒有正在運行的任務');
      return;
    }
    
    this.taskService.batchPauseTasks(eligible);
    this.toast.success(`已暫停 ${eligible.length} 個任務`);
    this.operationComplete.emit();
    this.cancelSelecting();
  }
  
  batchComplete(): void {
    const ids = this.getSelectedIds();
    
    if (!confirm(`確定要將 ${ids.length} 個任務標記為完成嗎？`)) {
      return;
    }
    
    this.taskService.batchCompleteTasks(ids);
    this.toast.success(`已完成 ${ids.length} 個任務`);
    this.operationComplete.emit();
    this.cancelSelecting();
  }
  
  async batchDuplicate(): Promise<void> {
    const ids = this.getSelectedIds();
    
    const newIds = await this.taskService.batchDuplicateTasks(ids);
    this.toast.success(`已複製 ${newIds.length} 個任務`);
    this.operationComplete.emit();
    this.cancelSelecting();
  }
  
  batchDelete(): void {
    const ids = this.getSelectedIds();
    
    if (!confirm(`確定要刪除 ${ids.length} 個任務嗎？此操作不可恢復。`)) {
      return;
    }
    
    this.taskService.batchDeleteTasks(ids);
    this.toast.success(`已刪除 ${ids.length} 個任務`);
    this.operationComplete.emit();
    this.cancelSelecting();
  }
}
