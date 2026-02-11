/**
 * Phase 10: Delete Confirm Dialog
 * Extracted from app.component.html (50 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" 
         (click)="cancel.emit()">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
           (click)="$event.stopPropagation()">
        <!-- Title -->
        <div class="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
          <div class="p-2 bg-red-500/20 rounded-lg">
            <svg class="h-6 w-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-white">確認刪除</h3>
        </div>
        
        <!-- Content -->
        <div class="px-6 py-6">
          @if(dialogData().type === 'single') {
            <p class="text-slate-300 mb-4">
              確定要刪除客戶 <span class="font-bold text-cyan-400">&#64;{{ dialogData().lead?.username || dialogData().lead?.userId }}</span> 嗎？
            </p>
          } @else {
            <p class="text-slate-300 mb-4">
              確定要刪除 <span class="font-bold text-red-400">{{ dialogData().count }}</span> 個選中的客戶嗎？
            </p>
          }
          <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
            ⚠️ 此操作無法撤銷，所有相關記錄將被永久刪除。
          </div>
        </div>
        
        <!-- Buttons -->
        <div class="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button (click)="cancel.emit()" 
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            取消
          </button>
          <button (click)="confirm.emit()" 
                  class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
            確認刪除
          </button>
        </div>
      </div>
    </div>
  `
})
export class DeleteConfirmDialogComponent {
  dialogData = input<any>({});
  cancel = output<void>();
  confirm = output<void>();
}
