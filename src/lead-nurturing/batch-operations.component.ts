/**
 * 批量操作組件
 * Batch Operations Component
 * 
 * 功能:
 * 1. 批量選擇線索
 * 2. 批量添加/移除標籤
 * 3. 批量發送消息
 * 4. 批量變更階段
 * 5. 批量刪除
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Lead, FunnelStage } from './lead.models';
import { LeadClassifierService } from './lead-classifier.service';
import { TagSelectorComponent } from './tag-manager.component';

// 批量操作類型
export type BatchActionType = 
  | 'add_tags'
  | 'remove_tags'
  | 'change_stage'
  | 'send_message'
  | 'start_nurturing'
  | 'stop_nurturing'
  | 'assign_account'
  | 'export'
  | 'delete';

// 批量操作結果
export interface BatchActionResult {
  action: BatchActionType;
  totalCount: number;
  successCount: number;
  failCount: number;
  errors: { leadId: string; error: string }[];
  timestamp: Date;
}

@Component({
  selector: 'app-batch-operations-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, TagSelectorComponent],
  template: `
    <!-- 批量操作工具欄 -->
    @if (selectedCount() > 0) {
      <div class="batch-bar fixed bottom-4 left-1/2 -translate-x-1/2 z-50 
                  bg-slate-800/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-600/50
                  px-4 py-3 flex items-center gap-4 animate-slideUp">
        
        <!-- 選中計數 -->
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-sm font-bold">
            {{ selectedCount() }}
          </div>
          <span class="text-sm text-slate-300">已選擇</span>
          <button (click)="clearSelection.emit()"
                  class="text-xs text-slate-500 hover:text-slate-300 underline">
            取消
          </button>
        </div>
        
        <div class="w-px h-8 bg-slate-600"></div>
        
        <!-- 快捷操作按鈕 -->
        <div class="flex items-center gap-2">
          <!-- 添加標籤 -->
          <button (click)="showTagPanel.set(!showTagPanel())"
                  class="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5"
                  [class.ring-2]="showTagPanel()"
                  [class.ring-purple-500]="showTagPanel()">
            <span>🏷️</span>
            標籤
          </button>
          
          <!-- 變更階段 -->
          <button (click)="showStagePanel.set(!showStagePanel())"
                  class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5"
                  [class.ring-2]="showStagePanel()"
                  [class.ring-amber-500]="showStagePanel()">
            <span>📊</span>
            階段
          </button>
          
          <!-- 發送消息 -->
          <button (click)="showMessagePanel.set(!showMessagePanel())"
                  class="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5">
            <span>💬</span>
            發送消息
          </button>
          
          <!-- 開始培育 -->
          <button (click)="onBatchAction('start_nurturing')"
                  class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5">
            <span>🚀</span>
            開始培育
          </button>
          
          <!-- 導出 -->
          <button (click)="onBatchAction('export')"
                  class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-slate-300 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5">
            <span>📤</span>
            導出
          </button>
          
          <!-- 刪除 -->
          <button (click)="confirmDelete()"
                  class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 
                         rounded-lg text-sm transition-colors flex items-center gap-1.5">
            <span>🗑️</span>
            刪除
          </button>
        </div>
      </div>
      
      <!-- 標籤面板 -->
      @if (showTagPanel()) {
        <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 
                    bg-slate-800 rounded-xl shadow-2xl border border-slate-600 p-4 w-80 animate-slideUp">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-white">批量添加標籤</h4>
            <button (click)="showTagPanel.set(false)" class="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <!-- 快速標籤 -->
          <div class="flex flex-wrap gap-1.5 mb-3">
            @for (tag of quickTags; track tag) {
              <button (click)="toggleBatchTag(tag)"
                      class="px-2 py-1 rounded text-xs transition-all"
                      [class.bg-cyan-500]="batchTags().includes(tag)"
                      [class.text-white]="batchTags().includes(tag)"
                      [class.bg-slate-700]="!batchTags().includes(tag)"
                      [class.text-slate-300]="!batchTags().includes(tag)">
                {{ tag }}
              </button>
            }
          </div>
          
          <div class="flex gap-2">
            <button (click)="applyBatchTags('add')"
                    [disabled]="batchTags().length === 0"
                    class="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 
                           disabled:text-slate-400 text-white rounded-lg text-sm transition-colors">
              添加標籤
            </button>
            <button (click)="applyBatchTags('remove')"
                    [disabled]="batchTags().length === 0"
                    class="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 
                           rounded-lg text-sm transition-colors">
              移除標籤
            </button>
          </div>
        </div>
      }
      
      <!-- 階段面板 -->
      @if (showStagePanel()) {
        <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 
                    bg-slate-800 rounded-xl shadow-2xl border border-slate-600 p-4 w-72 animate-slideUp">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-white">批量變更階段</h4>
            <button (click)="showStagePanel.set(false)" class="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <div class="grid grid-cols-2 gap-2">
            @for (stage of stages; track stage.value) {
              <button (click)="applyBatchStage(stage.value)"
                      class="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-left transition-colors">
                <span class="mr-1.5">{{ stage.icon }}</span>
                {{ stage.label }}
              </button>
            }
          </div>
        </div>
      }
      
      <!-- 消息面板 -->
      @if (showMessagePanel()) {
        <div class="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 
                    bg-slate-800 rounded-xl shadow-2xl border border-slate-600 p-4 w-96 animate-slideUp">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-medium text-white">批量發送消息</h4>
            <button (click)="showMessagePanel.set(false)" class="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <!-- 模板選擇 -->
          <div class="mb-3">
            <label class="text-xs text-slate-400 mb-1 block">選擇模板</label>
            <select [(ngModel)]="selectedTemplate"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">自定義消息</option>
              @for (template of messageTemplates(); track template.id) {
                <option [value]="template.id">{{ template.name }}</option>
              }
            </select>
          </div>
          
          <!-- 消息內容 -->
          <div class="mb-3">
            <label class="text-xs text-slate-400 mb-1 block">消息內容</label>
            <textarea [(ngModel)]="batchMessage"
                      rows="3"
                      class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white
                             resize-none"
                      placeholder="輸入消息內容...&#10;可用變量: {name}, {username}"></textarea>
          </div>
          
          <!-- 發送選項 -->
          <div class="flex items-center gap-4 mb-3 text-xs text-slate-400">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" [(ngModel)]="sendWithDelay" class="rounded">
              隨機延遲發送
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" [(ngModel)]="useRandomVariation" class="rounded">
              內容隨機變體
            </label>
          </div>
          
          <button (click)="sendBatchMessage()"
                  [disabled]="!batchMessage.trim()"
                  class="w-full px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 
                         disabled:text-slate-400 text-white rounded-lg text-sm transition-colors">
            發送給 {{ selectedCount() }} 人
          </button>
        </div>
      }
      
      <!-- 刪除確認 -->
      @if (showDeleteConfirm()) {
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" (click)="showDeleteConfirm.set(false)">
          <div class="bg-slate-800 rounded-xl p-6 w-80 text-center" (click)="$event.stopPropagation()">
            <div class="text-4xl mb-3">⚠️</div>
            <h3 class="text-lg font-bold text-white mb-2">確認刪除</h3>
            <p class="text-sm text-slate-400 mb-4">
              確定要刪除選中的 {{ selectedCount() }} 條線索嗎？<br>
              此操作無法撤銷。
            </p>
            <div class="flex gap-3">
              <button (click)="showDeleteConfirm.set(false)"
                      class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                取消
              </button>
              <button (click)="onBatchAction('delete'); showDeleteConfirm.set(false)"
                      class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors">
                確認刪除
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    .animate-slideUp {
      animation: slideUp 0.2s ease-out;
    }
  `]
})
export class BatchOperationsBarComponent {
  classifierService = inject(LeadClassifierService);
  
  // 輸入
  selectedLeads = input<Lead[]>([]);
  messageTemplates = input<{ id: string; name: string; content: string }[]>([]);
  
  // 輸出
  batchAction = output<{ action: BatchActionType; data?: any; leads: Lead[] }>();
  clearSelection = output<void>();
  
  // 狀態
  showTagPanel = signal(false);
  showStagePanel = signal(false);
  showMessagePanel = signal(false);
  showDeleteConfirm = signal(false);
  
  batchTags = signal<string[]>([]);
  batchMessage = '';
  selectedTemplate = '';
  sendWithDelay = true;
  useRandomVariation = false;
  
  // 計算
  selectedCount = computed(() => this.selectedLeads().length);
  
  // 快速標籤
  quickTags = ['🔥 高意向', '⭐ 高活躍', '💎 VIP', '待跟進', '已聯繫', '等待回覆'];
  
  // 階段選項
  stages: { value: FunnelStage; label: string; icon: string }[] = [
    { value: 'stranger', label: '陌生人', icon: '👤' },
    { value: 'visitor', label: '訪客', icon: '👁️' },
    { value: 'lead', label: '潛在客戶', icon: '🎯' },
    { value: 'qualified', label: '高意向', icon: '🔥' },
    { value: 'customer', label: '客戶', icon: '💰' },
    { value: 'dormant', label: '沉默用戶', icon: '💤' }
  ];
  
  toggleBatchTag(tag: string) {
    const current = this.batchTags();
    const index = current.indexOf(tag);
    if (index > -1) {
      this.batchTags.set(current.filter(t => t !== tag));
    } else {
      this.batchTags.set([...current, tag]);
    }
  }
  
  applyBatchTags(mode: 'add' | 'remove') {
    this.batchAction.emit({
      action: mode === 'add' ? 'add_tags' : 'remove_tags',
      data: { tags: this.batchTags() },
      leads: this.selectedLeads()
    });
    this.showTagPanel.set(false);
    this.batchTags.set([]);
  }
  
  applyBatchStage(stage: FunnelStage) {
    this.batchAction.emit({
      action: 'change_stage',
      data: { stage },
      leads: this.selectedLeads()
    });
    this.showStagePanel.set(false);
  }
  
  sendBatchMessage() {
    this.batchAction.emit({
      action: 'send_message',
      data: {
        message: this.batchMessage,
        templateId: this.selectedTemplate || undefined,
        withDelay: this.sendWithDelay,
        useVariation: this.useRandomVariation
      },
      leads: this.selectedLeads()
    });
    this.showMessagePanel.set(false);
    this.batchMessage = '';
  }
  
  confirmDelete() {
    this.showDeleteConfirm.set(true);
  }
  
  onBatchAction(action: BatchActionType) {
    this.batchAction.emit({
      action,
      leads: this.selectedLeads()
    });
  }
}

// 批量選擇複選框組件
@Component({
  selector: 'app-batch-select-checkbox',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="flex items-center justify-center w-5 h-5 cursor-pointer"
           (click)="$event.stopPropagation()">
      <input type="checkbox"
             [checked]="isSelected()"
             (change)="toggle()"
             class="w-4 h-4 rounded border-slate-500 bg-slate-700 text-cyan-500 
                    focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer">
    </label>
  `
})
export class BatchSelectCheckboxComponent {
  isSelected = input(false);
  selectionChange = output<boolean>();
  
  toggle() {
    this.selectionChange.emit(!this.isSelected());
  }
}

// 全選複選框組件
@Component({
  selector: 'app-batch-select-all',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-400 hover:text-white transition-colors"
           (click)="$event.stopPropagation()">
      <input type="checkbox"
             [checked]="isAllSelected()"
             [indeterminate]="isPartiallySelected()"
             (change)="toggleAll()"
             class="w-4 h-4 rounded border-slate-500 bg-slate-700 text-cyan-500 
                    focus:ring-cyan-500 focus:ring-offset-0 cursor-pointer">
      @if (isAllSelected()) {
        取消全選
      } @else {
        全選 ({{ totalCount() }})
      }
    </label>
  `
})
export class BatchSelectAllComponent {
  selectedCount = input(0);
  totalCount = input(0);
  
  selectAll = output<void>();
  clearAll = output<void>();
  
  isAllSelected = computed(() => 
    this.totalCount() > 0 && this.selectedCount() === this.totalCount()
  );
  
  isPartiallySelected = computed(() => 
    this.selectedCount() > 0 && this.selectedCount() < this.totalCount()
  );
  
  toggleAll() {
    if (this.isAllSelected()) {
      this.clearAll.emit();
    } else {
      this.selectAll.emit();
    }
  }
}
