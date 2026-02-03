/**
 * 認證過渡動畫組件
 * 
 * 🆕 功能：
 * 1. 全屏過渡動畫
 * 2. 登入成功動畫
 * 3. 登出過渡動畫
 * 4. 提升品牌感
 */

import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthEventsService, AuthEvent } from './auth-events.service';

export type TransitionType = 'login' | 'logout' | 'session_expired' | 'none';

@Component({
  selector: 'app-auth-transition',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (show()) {
      <div class="transition-overlay" [class]="'type-' + type()">
        <div class="transition-content">
          @switch (type()) {
            @case ('login') {
              <div class="success-icon">✓</div>
              <h2 class="title">歡迎回來</h2>
              <p class="subtitle">正在進入系統...</p>
            }
            @case ('logout') {
              <div class="logout-icon">👋</div>
              <h2 class="title">已安全登出</h2>
              <p class="subtitle">期待您的再次訪問</p>
            }
            @case ('session_expired') {
              <div class="warning-icon">⚠️</div>
              <h2 class="title">會話已過期</h2>
              <p class="subtitle">請重新登入</p>
            }
          }
        </div>
        <div class="brand-footer">
          <span class="brand-icon">🤖</span>
          <span class="brand-name">TG-AI 智控王</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .transition-overlay {
      position: fixed;
      inset: 0;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .type-login {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
    }
    
    .type-logout {
      background: linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%);
    }
    
    .type-session_expired {
      background: linear-gradient(135deg, #1e293b 0%, #422006 50%, #1e293b 100%);
    }
    
    .transition-content {
      text-align: center;
      animation: scaleIn 0.4s ease-out;
    }
    
    @keyframes scaleIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .success-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      color: white;
      animation: bounceIn 0.5s ease-out;
    }
    
    .logout-icon, .warning-icon {
      font-size: 4rem;
      margin-bottom: 1.5rem;
      animation: bounceIn 0.5s ease-out;
    }
    
    @keyframes bounceIn {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .title {
      font-size: 1.75rem;
      font-weight: 600;
      color: white;
      margin: 0 0 0.5rem;
    }
    
    .subtitle {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
    
    .brand-footer {
      position: absolute;
      bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
    }
    
    .brand-icon {
      font-size: 1.25rem;
    }
    
    .brand-name {
      font-weight: 500;
    }
  `]
})
export class AuthTransitionComponent implements OnInit, OnDestroy {
  private authEvents = inject(AuthEventsService);
  private subscription: Subscription | null = null;
  
  // 狀態
  show = signal(false);
  type = signal<TransitionType>('none');
  
  private hideTimer: any = null;
  
  ngOnInit(): void {
    // 訂閱認證事件
    this.subscription = this.authEvents.authEvents$.subscribe(event => {
      this.handleEvent(event);
    });
  }
  
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
  }
  
  private handleEvent(event: AuthEvent): void {
    // 清除之前的定時器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    
    switch (event.type) {
      case 'login':
        this.type.set('login');
        this.show.set(true);
        // 1.5 秒後自動隱藏
        this.hideTimer = setTimeout(() => {
          this.show.set(false);
        }, 1500);
        break;
        
      case 'logout':
        this.type.set('logout');
        this.show.set(true);
        // 1 秒後自動隱藏
        this.hideTimer = setTimeout(() => {
          this.show.set(false);
        }, 1000);
        break;
        
      case 'session_expired':
        this.type.set('session_expired');
        this.show.set(true);
        // 2 秒後自動隱藏
        this.hideTimer = setTimeout(() => {
          this.show.set(false);
        }, 2000);
        break;
    }
  }
}
