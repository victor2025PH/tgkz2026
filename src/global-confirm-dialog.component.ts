/**
 * 全局確認對話框組件
 * 使用 ConfirmDialogService 管理狀態
 */
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-global-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dialogService.state().isOpen) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
             (click)="dialogService.onCancel()">
        </div>
        
        <!-- 對話框 -->
        <div class="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 
                    transform animate-scale-in">
          <!-- 圖標 -->
          <div class="pt-6 text-center">
            <div class="inline-flex w-16 h-16 rounded-full items-center justify-center text-3xl"
                 [class.bg-blue-500/20]="dialogService.state().type === 'info'"
                 [class.bg-yellow-500/20]="dialogService.state().type === 'warning'"
                 [class.bg-red-500/20]="dialogService.state().type === 'danger'">
              @switch (dialogService.state().type) {
                @case ('info') { <span class="text-blue-400">ℹ️</span> }
                @case ('warning') { <span class="text-yellow-400">⚠️</span> }
                @case ('danger') { <span class="text-red-400">🗑️</span> }
              }
            </div>
          </div>
          
          <!-- 內容 -->
          <div class="p-6 text-center">
            <h3 class="text-lg font-semibold text-white mb-2">{{ dialogService.state().title }}</h3>
            <p class="text-sm text-slate-400 mb-4 whitespace-pre-line">{{ dialogService.state().message }}</p>
            
            <!-- 受影響項目列表 -->
            @if (dialogService.state().affectedItems && dialogService.state().affectedItems!.length > 0) {
              <div class="mt-4 p-3 bg-slate-700/50 rounded-lg text-left max-h-32 overflow-y-auto">
                <p class="text-xs text-slate-500 mb-2">將會受到影響:</p>
                <ul class="space-y-1">
                  @for (item of dialogService.state().affectedItems!.slice(0, 5); track item) {
                    <li class="text-sm text-slate-300 flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            [class.bg-yellow-500]="dialogService.state().type === 'warning'"
                            [class.bg-red-500]="dialogService.state().type === 'danger'"
                            [class.bg-blue-500]="dialogService.state().type === 'info'">
                      </span>
                      <span class="truncate">{{ item }}</span>
                    </li>
                  }
                  @if (dialogService.state().affectedItems!.length > 5) {
                    <li class="text-xs text-slate-500">...還有 {{ dialogService.state().affectedItems!.length - 5 }} 項</li>
                  }
                </ul>
              </div>
            }
            
            <!-- 危險操作需要輸入確認 -->
            @if (dialogService.state().requireConfirmText) {
              <div class="mt-4">
                <p class="text-xs text-slate-500 mb-2">
                  輸入「<span class="text-red-400 font-medium">{{ dialogService.state().confirmTextRequired }}</span>」以確認
                </p>
                <input type="text"
                       [(ngModel)]="confirmTextInput"
                       class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center
                              focus:border-red-500 focus:outline-none"
                       placeholder="請輸入確認文字">
              </div>
            }
          </div>
          
          <!-- 按鈕 -->
          <div class="flex gap-3 p-4 border-t border-slate-700">
            <button (click)="dialogService.onCancel()"
                    class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              {{ dialogService.state().cancelText }}
            </button>
            <button (click)="onConfirmClick()"
                    [disabled]="!canConfirm()"
                    class="flex-1 px-4 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.bg-blue-500]="dialogService.state().type === 'info'"
                    [class.hover:bg-blue-600]="dialogService.state().type === 'info'"
                    [class.bg-yellow-500]="dialogService.state().type === 'warning'"
                    [class.hover:bg-yellow-600]="dialogService.state().type === 'warning'"
                    [class.text-black]="dialogService.state().type === 'warning'"
                    [class.bg-red-500]="dialogService.state().type === 'danger'"
                    [class.hover:bg-red-600]="dialogService.state().type === 'danger'"
                    [class.text-white]="dialogService.state().type !== 'warning'">
              {{ dialogService.state().confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in {
      animation: fade-in 0.15s ease-out;
    }
    .animate-scale-in {
      animation: scale-in 0.2s ease-out;
    }
  `]
})
export class GlobalConfirmDialogComponent {
  dialogService = inject(ConfirmDialogService);
  confirmTextInput = '';

  canConfirm(): boolean {
    const state = this.dialogService.state();
    if (state.requireConfirmText) {
      return this.confirmTextInput === state.confirmTextRequired;
    }
    return true;
  }

  onConfirmClick() {
    if (this.canConfirm()) {
      this.confirmTextInput = '';
      this.dialogService.onConfirm();
    }
  }
}
