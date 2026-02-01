/**
 * Toast Notification Component
 * 增強版 - 支持操作按鈕、進度條、下一步提示
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] space-y-3 max-w-md">
      @for(toast of toasts(); track toast.id) {
        <div 
          class="toast-item rounded-xl shadow-2xl backdrop-blur-md border animate-slide-in overflow-hidden"
          [class.bg-emerald-500/95]="toast.type === 'success'"
          [class.bg-red-500/95]="toast.type === 'error'"
          [class.bg-amber-500/95]="toast.type === 'warning'"
          [class.bg-blue-500/95]="toast.type === 'info'"
          [class.bg-slate-700/95]="toast.type === 'progress'"
          [class.border-emerald-400/50]="toast.type === 'success'"
          [class.border-red-400/50]="toast.type === 'error'"
          [class.border-amber-400/50]="toast.type === 'warning'"
          [class.border-blue-400/50]="toast.type === 'info'"
          [class.border-slate-600/50]="toast.type === 'progress'">
          
          <!-- 主內容 -->
          <div class="flex items-start gap-3 p-4">
            <!-- Icon -->
            <div class="flex-shrink-0 text-xl">
              {{ toast.icon || getDefaultIcon(toast.type) }}
            </div>
            
            <!-- Message -->
            <div class="flex-1 min-w-0">
              @if (toast.title) {
                <div class="font-semibold text-white mb-0.5">{{ toast.title }}</div>
              }
              <div class="text-white text-sm">
                {{ toast.message }}
              </div>
              
              <!-- 下一步提示 -->
              @if (toast.nextStep) {
                <button 
                  (click)="handleNextStep(toast)"
                  class="mt-2 text-xs text-white/90 hover:text-white flex items-center gap-1 transition-colors">
                  <span>→</span>
                  <span class="underline">{{ toast.nextStep.label }}</span>
                </button>
              }
              
              <!-- 操作按鈕 -->
              @if (toast.actions && toast.actions.length > 0) {
                <div class="flex items-center gap-2 mt-3">
                  @for (action of toast.actions; track action.label) {
                    <button 
                      (click)="handleAction(toast, action)"
                      class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      [class.bg-white]="action.variant === 'primary'"
                      [class.text-slate-900]="action.variant === 'primary'"
                      [class.hover:bg-white/90]="action.variant === 'primary'"
                      [class.bg-white/20]="action.variant === 'secondary' || !action.variant"
                      [class.text-white]="action.variant === 'secondary' || !action.variant"
                      [class.hover:bg-white/30]="action.variant === 'secondary' || !action.variant"
                      [class.bg-red-600]="action.variant === 'danger'"
                      [class.text-white]="action.variant === 'danger'"
                      [class.hover:bg-red-700]="action.variant === 'danger'">
                      {{ action.label }}
                    </button>
                  }
                </div>
              }
            </div>
            
            <!-- Close button -->
            @if (toast.dismissible !== false) {
              <button 
                (click)="dismiss(toast.id)"
                class="flex-shrink-0 text-white/60 hover:text-white transition-colors p-1 -mr-1 -mt-1">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            }
          </div>
          
          <!-- 進度條 -->
          @if (toast.type === 'progress' && toast.progress !== undefined) {
            <div class="h-1 bg-slate-600">
              <div 
                class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                [style.width.%]="toast.progress">
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%) scale(0.95);
        opacity: 0;
      }
      to {
        transform: translateX(0) scale(1);
        opacity: 1;
      }
    }
    
    .animate-slide-in {
      animation: slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
  `]
})
export class ToastComponent {
  private toastService = inject(ToastService);
  
  get toasts() {
    return this.toastService.getToasts();
  }
  
  getDefaultIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      progress: '⏳'
    };
    return icons[type] || 'ℹ️';
  }
  
  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
  
  handleNextStep(toast: Toast): void {
    if (toast.nextStep) {
      toast.nextStep.action();
      this.dismiss(toast.id);
    }
  }
  
  handleAction(toast: Toast, action: { label: string; handler: () => void }): void {
    action.handler();
    this.dismiss(toast.id);
  }
}
