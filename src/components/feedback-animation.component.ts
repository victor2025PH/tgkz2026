/**
 * 操作反饋動效組件
 * Feedback Animation Component
 * 
 * 用於顯示操作成功/失敗的視覺反饋
 */

import { Component, input, output, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// 動效類型
export type FeedbackType = 'success' | 'error' | 'warning' | 'loading' | 'info';

// 動效配置
interface FeedbackConfig {
  icon: string;
  color: string;
  bgColor: string;
  glowColor: string;
}

const CONFIGS: Record<FeedbackType, FeedbackConfig> = {
  success: {
    icon: '✓',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    glowColor: 'rgba(34, 197, 94, 0.5)'
  },
  error: {
    icon: '✕',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    glowColor: 'rgba(239, 68, 68, 0.5)'
  },
  warning: {
    icon: '!',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.1)',
    glowColor: 'rgba(234, 179, 8, 0.5)'
  },
  loading: {
    icon: '⟳',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    glowColor: 'rgba(6, 182, 212, 0.5)'
  },
  info: {
    icon: 'i',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    glowColor: 'rgba(59, 130, 246, 0.5)'
  }
};

@Component({
  selector: 'app-feedback-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="feedback-overlay fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm"
           [class.animate-fade-in]="animateIn()"
           [class.animate-fade-out]="animateOut()"
           (click)="onOverlayClick()">
        
        <div class="feedback-container relative" (click)="$event.stopPropagation()">
          <!-- 光暈效果 -->
          <div class="absolute inset-0 rounded-full blur-3xl animate-pulse"
               [style.background]="config.glowColor">
          </div>
          
          <!-- 主圓圈 -->
          <div class="relative w-32 h-32 rounded-full flex items-center justify-center"
               [style.background]="config.bgColor"
               [class.animate-scale-in]="animateIn()">
            
            <!-- SVG 圓圈動畫 -->
            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <!-- 背景圓 -->
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                [attr.stroke]="config.color"
                stroke-width="2"
                opacity="0.2"
              />
              <!-- 進度圓 -->
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                [attr.stroke]="config.color"
                stroke-width="3"
                stroke-linecap="round"
                [class.animate-circle-draw]="type() !== 'loading'"
                [class.animate-circle-spin]="type() === 'loading'"
                [attr.stroke-dasharray]="type() === 'loading' ? '70 200' : '283'"
                [attr.stroke-dashoffset]="type() === 'loading' ? '0' : '283'"
                transform="rotate(-90 50 50)"
              />
            </svg>
            
            <!-- 圖標 -->
            <div class="relative text-4xl font-bold"
                 [style.color]="config.color"
                 [class.animate-icon-pop]="type() !== 'loading'"
                 [class.animate-spin]="type() === 'loading'">
              {{ config.icon }}
            </div>
          </div>
          
          <!-- 文字 -->
          @if (message()) {
            <div class="mt-6 text-center animate-slide-up">
              <p class="text-lg font-medium text-white">{{ message() }}</p>
              @if (subMessage()) {
                <p class="text-sm text-slate-400 mt-1">{{ subMessage() }}</p>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in {
      animation: fade-in 0.2s ease-out;
    }
    
    .animate-fade-out {
      animation: fade-out 0.2s ease-out forwards;
    }
    
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    .animate-scale-in {
      animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    
    @keyframes scale-in {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .animate-circle-draw {
      animation: circle-draw 0.6s ease-out 0.1s forwards;
    }
    
    @keyframes circle-draw {
      to { stroke-dashoffset: 0; }
    }
    
    .animate-circle-spin {
      animation: circle-spin 1s linear infinite;
      transform-origin: center;
    }
    
    @keyframes circle-spin {
      from { transform: rotate(-90deg); }
      to { transform: rotate(270deg); }
    }
    
    .animate-icon-pop {
      animation: icon-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s forwards;
      opacity: 0;
      transform: scale(0);
    }
    
    @keyframes icon-pop {
      from { opacity: 0; transform: scale(0); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .animate-slide-up {
      animation: slide-up 0.3s ease-out 0.4s forwards;
      opacity: 0;
      transform: translateY(10px);
    }
    
    @keyframes slide-up {
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class FeedbackAnimationComponent implements OnInit, OnDestroy {
  // 輸入
  type = input<FeedbackType>('success');
  message = input<string>();
  subMessage = input<string>();
  duration = input(2000);          // 自動關閉時間（毫秒），0 表示不自動關閉
  closeOnClick = input(true);      // 點擊關閉
  
  // 輸出
  closed = output<void>();
  
  // 狀態
  visible = signal(false);
  animateIn = signal(true);
  animateOut = signal(false);
  
  private autoCloseTimer?: ReturnType<typeof setTimeout>;
  
  get config(): FeedbackConfig {
    return CONFIGS[this.type()];
  }
  
  ngOnInit(): void {
    this.show();
  }
  
  ngOnDestroy(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
  }
  
  show(): void {
    this.visible.set(true);
    this.animateIn.set(true);
    this.animateOut.set(false);
    
    // 自動關閉
    if (this.duration() > 0 && this.type() !== 'loading') {
      this.autoCloseTimer = setTimeout(() => {
        this.hide();
      }, this.duration());
    }
  }
  
  hide(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
    }
    
    this.animateIn.set(false);
    this.animateOut.set(true);
    
    setTimeout(() => {
      this.visible.set(false);
      this.closed.emit();
    }, 200);
  }
  
  onOverlayClick(): void {
    if (this.closeOnClick() && this.type() !== 'loading') {
      this.hide();
    }
  }
}

/**
 * 反饋動效服務
 * 用於以編程方式顯示反饋動效
 */
import { Injectable, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);
  
  private currentComponent: any = null;
  
  /**
   * 顯示成功反饋
   */
  success(message?: string, subMessage?: string, duration = 2000): Promise<void> {
    return this.show('success', message, subMessage, duration);
  }
  
  /**
   * 顯示錯誤反饋
   */
  error(message?: string, subMessage?: string, duration = 3000): Promise<void> {
    return this.show('error', message, subMessage, duration);
  }
  
  /**
   * 顯示警告反饋
   */
  warning(message?: string, subMessage?: string, duration = 2500): Promise<void> {
    return this.show('warning', message, subMessage, duration);
  }
  
  /**
   * 顯示加載反饋
   */
  loading(message?: string, subMessage?: string): void {
    this.show('loading', message, subMessage, 0);
  }
  
  /**
   * 隱藏當前反饋
   */
  hide(): void {
    if (this.currentComponent) {
      this.currentComponent.instance.hide();
    }
  }
  
  /**
   * 顯示反饋
   */
  private show(
    type: FeedbackType,
    message?: string,
    subMessage?: string,
    duration = 2000
  ): Promise<void> {
    return new Promise((resolve) => {
      // 移除現有的反饋
      if (this.currentComponent) {
        this.currentComponent.instance.hide();
      }
      
      // 創建新組件
      const componentRef = createComponent(FeedbackAnimationComponent, {
        environmentInjector: this.injector
      });
      
      // 設置輸入
      componentRef.setInput('type', type);
      componentRef.setInput('message', message);
      componentRef.setInput('subMessage', subMessage);
      componentRef.setInput('duration', duration);
      
      // 監聽關閉事件
      componentRef.instance.closed.subscribe(() => {
        this.appRef.detachView(componentRef.hostView);
        componentRef.destroy();
        if (this.currentComponent === componentRef) {
          this.currentComponent = null;
        }
        resolve();
      });
      
      // 添加到 DOM
      this.appRef.attachView(componentRef.hostView);
      document.body.appendChild(componentRef.location.nativeElement);
      
      this.currentComponent = componentRef;
    });
  }
}
