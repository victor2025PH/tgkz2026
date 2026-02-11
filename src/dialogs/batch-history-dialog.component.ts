/**
 * Phase 10: Batch Operation History Dialog
 * Extracted from app.component.html (79 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-batch-history-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm" (click)="close.emit()">
      <div class="bg-slate-100 dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-300 dark:border-slate-700 w-full max-w-3xl max-h-[80vh] overflow-hidden" (click)="$event.stopPropagation()">
        <!-- Title -->
        <div class="p-4 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between bg-slate-200/50 dark:bg-slate-800/50">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>
            批量操作歷史
          </h3>
          <button (click)="close.emit()" class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        
        <!-- Content -->
        <div class="p-4 overflow-y-auto max-h-[60vh]">
          @if(history().length === 0) {
            <div class="text-center py-8 text-slate-500">
              <svg class="h-12 w-12 mx-auto mb-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
              <p>暫無操作歷史</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for(op of history(); track op.id) {
                <div class="bg-slate-200/50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-300 dark:border-slate-700"
                     [class.opacity-50]="op.reversed">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg" 
                           [class.bg-cyan-500/20]="op.operationType === 'update_status'"
                           [class.bg-blue-500/20]="op.operationType === 'add_tag'"
                           [class.bg-red-500/20]="op.operationType === 'delete' || op.operationType === 'add_to_dnc'">
                        <svg class="h-4 w-4" 
                             [class.text-cyan-400]="op.operationType === 'update_status'"
                             [class.text-blue-400]="op.operationType === 'add_tag'"
                             [class.text-red-400]="op.operationType === 'delete' || op.operationType === 'add_to_dnc'"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                      </div>
                      <div>
                        <p class="font-medium text-slate-900 dark:text-white">{{ getOpTypeName(op.operationType) }}</p>
                        <p class="text-xs text-slate-500">
                          {{ op.itemCount }} 項 · {{ formatDate(op.createdAt) }}
                          @if(op.reversed) {
                            <span class="text-yellow-500 ml-2">（已撤銷）</span>
                          }
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="text-sm">
                        <span class="text-green-400">{{ op.successCount }} 成功</span>
                        @if(op.failureCount > 0) {
                          <span class="text-red-400 ml-2">{{ op.failureCount }} 失敗</span>
                        }
                      </div>
                      @if(op.isReversible && !op.reversed) {
                        <button (click)="undo.emit(op.id); $event.stopPropagation()" 
                                class="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-2 py-1 rounded">
                          撤銷
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-slate-300 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800/50 flex justify-end">
          <button (click)="close.emit()" 
                  class="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors">
            關閉
          </button>
        </div>
      </div>
    </div>
  `
})
export class BatchHistoryDialogComponent {
  history = input<any[]>([]);
  close = output<void>();
  undo = output<string>();

  /** Format operation type name */
  getOpTypeName(type: string): string {
    const map: Record<string, string> = {
      'update_status': '狀態更新',
      'add_tag': '添加標籤',
      'delete': '刪除',
      'add_to_dnc': '加入黑名單',
      'export': '導出',
    };
    return map[type] || type;
  }

  /** Format date */
  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  }
}
