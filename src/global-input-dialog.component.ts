/**
 * 全局輸入對話框組件
 * 替代 window.prompt()，在 Electron 中可用
 */
import { Component, inject, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService } from './services/dialog.service';

@Component({
  selector: 'app-global-input-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (dialogService.inputDialog()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
             (click)="cancelDialog()">
        </div>
        
        <!-- 對話框 -->
        <div class="relative w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 
                    transform animate-scale-in">
          <!-- 標題 -->
          <div class="p-6 pb-4">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>✏️</span>
              {{ dialogService.inputDialog()?.title }}
            </h3>
            @if (dialogService.inputDialog()?.message) {
              <p class="text-sm text-slate-400 mt-2">{{ dialogService.inputDialog()?.message }}</p>
            }
          </div>
          
          <!-- 輸入區域 -->
          <div class="px-6 pb-4" (click)="focusInput($event)">
            @if (dialogService.inputDialog()?.inputType === 'textarea') {
              <textarea #inputRef
                        [(ngModel)]="inputValue"
                        (keydown.enter)="onEnterKey($event)"
                        [placeholder]="dialogService.inputDialog()?.placeholder || '請輸入...'"
                        rows="4"
                        class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white
                               placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 
                               focus:ring-purple-500/20 resize-none transition-all">
              </textarea>
            } @else {
              <input #inputRef
                     type="text"
                     [(ngModel)]="inputValue"
                     (keydown.enter)="onEnterKey($event)"
                     [placeholder]="dialogService.inputDialog()?.placeholder || '請輸入...'"
                     class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white
                            placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 
                            focus:ring-purple-500/20 transition-all cursor-text">
            }
            
            <!-- 錯誤提示 -->
            @if (dialogService.inputDialogError()) {
              <p class="mt-2 text-sm text-red-400 flex items-center gap-1">
                <span>⚠️</span>
                {{ dialogService.inputDialogError() }}
              </p>
            }
          </div>
          
          <!-- 按鈕 -->
          <div class="flex gap-3 p-4 border-t border-slate-700">
            <button (click)="cancelDialog()"
                    class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              {{ dialogService.inputDialog()?.cancelText || '取消' }}
            </button>
            <button (click)="confirmWithValue()"
                    class="flex-1 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg 
                           transition-colors font-medium">
              {{ dialogService.inputDialog()?.confirmText || '確定' }}
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
export class GlobalInputDialogComponent implements AfterViewChecked {
  dialogService = inject(DialogService);
  
  @ViewChild('inputRef') inputRef?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;
  
  // 🔧 FIX: 使用本地變量進行雙向綁定
  inputValue = '';
  private lastDialogState = false;
  
  ngAfterViewChecked() {
    const isOpen = !!this.dialogService.inputDialog();
    
    // 對話框剛打開時
    if (isOpen && !this.lastDialogState) {
      this.inputValue = this.dialogService.inputDialog()?.defaultValue || '';
      // 延遲聚焦
      setTimeout(() => this.focusInput(), 100);
      setTimeout(() => this.focusInput(), 300);
    }
    
    // 對話框關閉時重置
    if (!isOpen && this.lastDialogState) {
      this.inputValue = '';
    }
    
    this.lastDialogState = isOpen;
  }
  
  focusInput(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.inputRef?.nativeElement) {
      this.inputRef.nativeElement.focus();
      console.log('[InputDialog] Focus requested');
    }
  }
  
  onEnterKey(event: KeyboardEvent) {
    // textarea 允許換行，input 則提交
    if (this.dialogService.inputDialog()?.inputType !== 'textarea') {
      event.preventDefault();
      this.confirmWithValue();
    }
  }
  
  confirmWithValue() {
    // 🔧 FIX: 先更新服務中的值，再確認
    this.dialogService.updateInputValue(this.inputValue);
    this.dialogService.confirmInput();
  }
  
  cancelDialog() {
    this.inputValue = '';
    this.dialogService.cancelInput();
  }
}
