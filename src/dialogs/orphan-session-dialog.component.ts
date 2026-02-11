/**
 * Phase 10: Orphan Session Recovery Dialog
 * Extracted from app.component.html (70 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-orphan-session-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div class="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-amber-500/50">
        
        <!-- Header -->
        <div class="bg-amber-500/20 p-6 text-center border-b border-amber-500/30">
          <div class="text-5xl mb-3">🔄</div>
          <h2 class="text-xl font-bold text-amber-400">發現可恢復的帳號</h2>
          <p class="text-slate-400 text-sm mt-2">
            發現 {{ sessions().length }} 個 Session 文件需要手動恢復
          </p>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-4">
          <p class="text-slate-300 text-sm">
            這些 Session 文件存在於系統中，但未在數據庫中找到對應的帳號記錄。
            您可以嘗試恢復這些帳號，或選擇忽略。
          </p>
          
          <div class="bg-slate-700/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
            @for (session of sessions(); track session.phone) {
              <div class="flex items-center justify-between p-2 bg-slate-600/50 rounded-lg">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">📱</span>
                  <div>
                    <p class="text-white font-medium">+{{ session.phone }}</p>
                    @if (session.hasMetadata && session.metadata) {
                      <p class="text-green-400 text-xs">
                        ✓ 有元數據: {{ session.metadata.firstName || '' }} {{ session.metadata.username ? '@' + session.metadata.username : '' }}
                      </p>
                    } @else {
                      <p class="text-amber-400 text-xs">⚠ 無元數據，需要重新登錄驗證</p>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          
          <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p class="text-blue-400 text-sm">
              💡 <strong>提示：</strong> 恢復後，帳號將以「離線」狀態添加到列表中。
              您需要點擊「登錄」來重新連接帳號。
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="p-4 bg-slate-700/30 flex justify-end gap-3">
          <button (click)="dismiss.emit()" 
                  class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
            稍後處理
          </button>
          <button (click)="recover.emit()" 
                  [disabled]="isRecovering()"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2">
            @if (isRecovering()) {
              <span class="animate-spin">⏳</span>
              <span>恢復中...</span>
            } @else {
              <span>🔄</span>
              <span>恢復帳號</span>
            }
          </button>
        </div>
      </div>
    </div>
  `
})
export class OrphanSessionDialogComponent {
  sessions = input<any[]>([]);
  isRecovering = input(false);
  dismiss = output<void>();
  recover = output<void>();
}
