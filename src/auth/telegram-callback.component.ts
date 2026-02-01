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
      // 🔧 優化：支持多種 Telegram 回調格式
      let authData: any = null;
      
      // 1. 嘗試從 hash fragment 獲取 tgAuthResult（Telegram OAuth 標準格式）
      const hash = window.location.hash;
      if (hash && hash.includes('tgAuthResult=')) {
        const match = hash.match(/tgAuthResult=([^&]+)/);
        if (match && match[1]) {
          try {
            // 解碼 base64 並解析 JSON
            const decoded = atob(match[1]);
            authData = JSON.parse(decoded);
            console.log('Telegram auth data from tgAuthResult:', authData);
          } catch (e) {
            console.error('Failed to parse tgAuthResult:', e);
          }
        }
      }
      
      // 2. 嘗試從 query params 獲取
      if (!authData) {
        const params = this.route.snapshot.queryParams;
        if (params['id'] && params['hash']) {
          authData = {
            id: params['id'],
            first_name: params['first_name'],
            last_name: params['last_name'],
            username: params['username'],
            photo_url: params['photo_url'],
            auth_date: params['auth_date'],
            hash: params['hash']
          };
        }
      }
      
      // 3. 嘗試從 fragment params 獲取（舊格式）
      if (!authData) {
        const fragment = this.route.snapshot.fragment;
        if (fragment && fragment.includes('id=')) {
          const fragmentParams = new URLSearchParams(fragment);
          authData = {
            id: fragmentParams.get('id'),
            first_name: fragmentParams.get('first_name'),
            last_name: fragmentParams.get('last_name'),
            username: fragmentParams.get('username'),
            photo_url: fragmentParams.get('photo_url'),
            auth_date: fragmentParams.get('auth_date'),
            hash: fragmentParams.get('hash')
          };
        }
      }
      
      if (!authData || !authData.id) {
        throw new Error('缺少 Telegram 認證數據');
      }
      
      await this.processTelegramAuth(authData);
      
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
