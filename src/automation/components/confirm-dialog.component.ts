/**
 * 確認對話框組件
 * Confirm Dialog Component
 * 
 * 功能:
 * 1. 通用確認/取消對話框
 * 2. 支持危險操作樣式
 * 3. 自定義按鈕文字
 * 4. 防誤刪二次確認
 */

import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type DialogType = 'info' | 'warning' | 'danger';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"
             (click)="onCancel()">
        </div>
        
        <!-- 對話框 -->
        <div class="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 
                    transform transition-all animate-scale-in">
          <!-- 圖標 -->
          <div class="pt-6 text-center">
            <div class="inline-flex w-16 h-16 rounded-full items-center justify-center text-3xl"
                 [class.bg-blue-500/20]="type() === 'info'"
                 [class.bg-yellow-500/20]="type() === 'warning'"
                 [class.bg-red-500/20]="type() === 'danger'">
              @switch (type()) {
                @case ('info') { ℹ️ }
                @case ('warning') { ⚠️ }
                @case ('danger') { 🗑️ }
              }
            </div>
          </div>
          
          <!-- 內容 -->
          <div class="p-6 text-center">
            <h3 class="text-lg font-semibold text-white mb-2">{{ title() }}</h3>
            <p class="text-sm text-slate-400 mb-4">{{ message() }}</p>
            
            <!-- 受影響項目列表 -->
            @if (affectedItems().length > 0) {
              <div class="mt-4 p-3 bg-slate-700/50 rounded-lg text-left">
                <p class="text-xs text-slate-500 mb-2">將會受到影響:</p>
                <ul class="space-y-1">
                  @for (item of affectedItems().slice(0, 5); track item) {
                    <li class="text-sm text-slate-300 flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full"
                            [class.bg-yellow-500]="type() === 'warning'"
                            [class.bg-red-500]="type() === 'danger'">
                      </span>
                      {{ item }}
                    </li>
                  }
                  @if (affectedItems().length > 5) {
                    <li class="text-xs text-slate-500">...還有 {{ affectedItems().length - 5 }} 項</li>
                  }
                </ul>
              </div>
            }
            
            <!-- 危險操作需要輸入確認 -->
            @if (requireConfirmText()) {
              <div class="mt-4">
                <p class="text-xs text-slate-500 mb-2">
                  輸入「<span class="text-red-400 font-medium">{{ confirmTextRequired() }}</span>」以確認刪除
                </p>
                <input type="text"
                       [(ngModel)]="confirmTextInput"
                       [placeholder]="confirmTextRequired()"
                       class="w-full px-4 py-2 bg-slate-700 border rounded-lg text-white text-center
                              placeholder-slate-500 focus:outline-none focus:ring-2"
                       [class.border-slate-600]="!isConfirmTextMatch()"
                       [class.focus:ring-cyan-500]="!isConfirmTextMatch()"
                       [class.border-emerald-500]="isConfirmTextMatch()"
                       [class.focus:ring-emerald-500]="isConfirmTextMatch()">
              </div>
            }
          </div>
          
          <!-- 按鈕 -->
          <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
            <button (click)="onCancel()"
                    class="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
              {{ cancelText() }}
            </button>
            <button (click)="onConfirm()"
                    [disabled]="requireConfirmText() && !isConfirmTextMatch()"
                    class="px-5 py-2.5 text-sm rounded-lg transition-all font-medium
                           disabled:opacity-50 disabled:cursor-not-allowed"
                    [class.bg-blue-500]="type() === 'info'"
                    [class.hover:bg-blue-400]="type() === 'info'"
                    [class.bg-yellow-500]="type() === 'warning'"
                    [class.hover:bg-yellow-400]="type() === 'warning'"
                    [class.text-black]="type() === 'warning'"
                    [class.bg-red-500]="type() === 'danger'"
                    [class.hover:bg-red-400]="type() === 'danger'"
                    [class.text-white]="type() !== 'warning'">
              {{ confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes scale-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    .animate-scale-in {
      animation: scale-in 0.15s ease-out;
    }
  `]
})
export class ConfirmDialogComponent {
  // 輸入
  isOpen = input(false);
  type = input<DialogType>('info');
  title = input('確認操作');
  message = input('您確定要執行此操作嗎？');
  confirmText = input('確認');
  cancelText = input('取消');
  affectedItems = input<string[]>([]);
  requireConfirmText = input(false);
  confirmTextRequired = input('DELETE');
  
  // 輸出
  confirm = output<void>();
  cancel = output<void>();
  
  // 狀態
  confirmTextInput = '';
  
  isConfirmTextMatch(): boolean {
    return this.confirmTextInput.trim().toUpperCase() === this.confirmTextRequired().toUpperCase();
  }
  
  onConfirm() {
    if (this.requireConfirmText() && !this.isConfirmTextMatch()) {
      return;
    }
    this.confirmTextInput = '';
    this.confirm.emit();
  }
  
  onCancel() {
    this.confirmTextInput = '';
    this.cancel.emit();
  }
}
