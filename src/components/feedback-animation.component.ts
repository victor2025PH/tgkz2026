/**
 * Feedback Animation Component & Service
 * 反饋動畫組件和服務
 */
import { Injectable, signal, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface FeedbackConfig {
  type: FeedbackType;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  private _visible = signal(false);
  private _config = signal<FeedbackConfig | null>(null);
  
  visible = this._visible.asReadonly();
  config = this._config.asReadonly();
  
  private timeoutId: any;
  
  /**
   * 顯示反饋動畫
   */
  show(config: FeedbackConfig): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    this._config.set(config);
    this._visible.set(true);
    
    const duration = config.duration ?? 2000;
    if (duration > 0 && config.type !== 'loading') {
      this.timeoutId = setTimeout(() => {
        this.hide();
      }, duration);
    }
  }
  
  /**
   * 隱藏反饋動畫
   */
  hide(): void {
    this._visible.set(false);
    this._config.set(null);
  }
  
  /**
   * 顯示成功反饋
   */
  success(message: string, duration?: number): void {
    this.show({ type: 'success', message, duration });
  }
  
  /**
   * 顯示錯誤反饋
   */
  error(message: string, duration?: number): void {
    this.show({ type: 'error', message, duration });
  }
  
  /**
   * 顯示警告反饋
   */
  warning(message: string, duration?: number): void {
    this.show({ type: 'warning', message, duration });
  }
  
  /**
   * 顯示信息反饋
   */
  info(message: string, duration?: number): void {
    this.show({ type: 'info', message, duration });
  }
  
  /**
   * 顯示加載中
   */
  loading(message: string = '處理中...'): void {
    this.show({ type: 'loading', message, duration: 0 });
  }
}

@Component({
  selector: 'app-feedback-animation',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (feedback.visible()) {
      <div class="feedback-overlay">
        <div class="feedback-content" [class]="feedback.config()?.type">
          @switch (feedback.config()?.type) {
            @case ('success') {
              <div class="icon">✓</div>
            }
            @case ('error') {
              <div class="icon">✕</div>
            }
            @case ('warning') {
              <div class="icon">⚠</div>
            }
            @case ('info') {
              <div class="icon">ℹ</div>
            }
            @case ('loading') {
              <div class="spinner"></div>
            }
          }
          <div class="message">{{ feedback.config()?.message }}</div>
        </div>
      </div>
    }
  `,
  styles: [`
    .feedback-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }
    
    .feedback-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 48px;
      background: var(--card-bg, #1e1e2e);
      border-radius: 16px;
      animation: scaleIn 0.3s ease;
    }
    
    .icon {
      font-size: 48px;
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }
    
    .success .icon {
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    
    .error .icon {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    
    .warning .icon {
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    
    .info .icon {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(124, 58, 237, 0.2);
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    .message {
      font-size: 16px;
      color: var(--text-color, #fff);
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class FeedbackAnimationComponent {
  readonly feedback = inject(FeedbackService);
}
