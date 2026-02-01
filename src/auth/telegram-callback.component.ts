/**
 * Telegram OAuth 回調組件
 * 
 * 處理 Telegram Login Widget 的回調
 */

import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-telegram-callback',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="callback-page">
      @if (isLoading()) {
        <div class="loading">
          <div class="spinner"></div>
          <p>正在處理 Telegram 登入...</p>
        </div>
      } @else if (error()) {
        <div class="error">
          <span class="error-icon">⚠️</span>
          <h3>登入失敗</h3>
          <p>{{ error() }}</p>
          <button class="back-btn" (click)="goToLogin()">返回登入</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .callback-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--bg-primary, #0a0a0a);
      color: var(--text-primary, #fff);
    }
    
    .loading {
      text-align: center;
    }
    
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error {
      text-align: center;
      padding: 2rem;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      max-width: 400px;
    }
    
    .error-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }
    
    .error h3 {
      margin-bottom: 0.5rem;
      color: #f87171;
    }
    
    .error p {
      color: var(--text-secondary, #888);
      margin-bottom: 1.5rem;
    }
    
    .back-btn {
      padding: 0.75rem 1.5rem;
      background: var(--primary, #3b82f6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    .back-btn:hover {
      opacity: 0.9;
    }
  `]
})
export class TelegramCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  async ngOnInit() {
    try {
      // 獲取 URL 參數（Telegram 回調數據）
      const params = this.route.snapshot.queryParams;
      
      // 檢查必要參數
      if (!params['id'] || !params['hash']) {
        // 嘗試從 fragment 獲取
        const fragment = this.route.snapshot.fragment;
        if (fragment) {
          const fragmentParams = new URLSearchParams(fragment);
          await this.processTelegramAuth({
            id: fragmentParams.get('id'),
            first_name: fragmentParams.get('first_name'),
            last_name: fragmentParams.get('last_name'),
            username: fragmentParams.get('username'),
            photo_url: fragmentParams.get('photo_url'),
            auth_date: fragmentParams.get('auth_date'),
            hash: fragmentParams.get('hash')
          });
        } else {
          throw new Error('缺少 Telegram 認證數據');
        }
      } else {
        // 從 query params 獲取
        await this.processTelegramAuth({
          id: params['id'],
          first_name: params['first_name'],
          last_name: params['last_name'],
          username: params['username'],
          photo_url: params['photo_url'],
          auth_date: params['auth_date'],
          hash: params['hash']
        });
      }
    } catch (e: any) {
      console.error('Telegram callback error:', e);
      this.error.set(e.message || 'Telegram 登入失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private async processTelegramAuth(authData: any) {
    if (!authData.id || !authData.hash) {
      throw new Error('無效的 Telegram 認證數據');
    }
    
    // 發送到後端驗證
    const result = await this.authService.telegramLogin(authData);
    
    if (result.success) {
      // 檢查是否有保存的重定向 URL
      const returnUrl = sessionStorage.getItem('auth_return_url') || '/';
      sessionStorage.removeItem('auth_return_url');
      
      // 如果是彈窗模式，發送消息給父窗口
      if (window.opener) {
        window.opener.postMessage({
          type: 'telegram_auth',
          auth: authData
        }, window.location.origin);
        window.close();
      } else {
        this.router.navigateByUrl(returnUrl);
      }
    } else {
      throw new Error(result.error || 'Telegram 登入失敗');
    }
  }
  
  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
