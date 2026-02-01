/**
 * 登入頁面組件
 * 
 * 優化設計：
 * 1. 表單驗證和錯誤提示
 * 2. 密碼可見切換
 * 3. 記住我功能
 * 4. 第三方登入入口
 * 5. 加載狀態
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';
import { FrontendSecurityService } from '../services/security.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page">
      <h2 class="page-title">{{ t('auth.welcomeBack') }}</h2>
      <p class="page-subtitle">{{ t('auth.loginSubtitle') }}</p>
      
      <!-- 鎖定提示 -->
      @if (isLocked()) {
        <div class="lockout-alert">
          <span class="lockout-icon">🔒</span>
          <div class="lockout-content">
            <span class="lockout-title">帳號暫時鎖定</span>
            <span class="lockout-time">請等待 {{ lockoutRemaining() }} 秒後重試</span>
          </div>
        </div>
      }
      
      <!-- 錯誤提示 -->
      @if (error() && !isLocked()) {
        <div class="error-alert">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      <form class="login-form" (ngSubmit)="onSubmit()">
        <!-- 郵箱 -->
        <div class="form-group">
          <label for="email">{{ t('auth.email') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">📧</span>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              [placeholder]="t('auth.emailPlaceholder')"
              required
              autocomplete="email"
              [disabled]="isLoading()"
            />
          </div>
        </div>
        
        <!-- 密碼 -->
        <div class="form-group">
          <label for="password">{{ t('auth.password') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="password"
              [(ngModel)]="password"
              name="password"
              [placeholder]="t('auth.passwordPlaceholder')"
              required
              autocomplete="current-password"
              [disabled]="isLoading()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>
        
        <!-- 記住我 & 忘記密碼 -->
        <div class="form-options">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="rememberMe" 
              name="rememberMe"
            />
            <span>{{ t('auth.rememberMe') }}</span>
          </label>
          <a routerLink="/auth/forgot-password" class="forgot-link">
            {{ t('auth.forgotPassword') }}
          </a>
        </div>
        
        <!-- 登入按鈕 -->
        <button 
          type="submit" 
          class="submit-btn"
          [disabled]="isLoading() || !email || !password || isLocked()"
        >
          @if (isLoading()) {
            <span class="loading-spinner"></span>
            <span>{{ t('auth.loggingIn') }}</span>
          } @else {
            <span>{{ t('auth.login') }}</span>
          }
        </button>
      </form>
      
      <!-- 分隔線 -->
      <div class="divider">
        <span>{{ t('auth.or') }}</span>
      </div>
      
      <!-- 第三方登入 - 嵌入式 Telegram Widget -->
      <div class="social-login">
        @if (telegramWidgetReady()) {
          <!-- 🆕 嵌入式 Telegram Login Widget -->
          <div class="telegram-widget-container">
            <div id="telegram-login-widget"></div>
          </div>
        } @else {
          <!-- 載入中或備用按鈕 -->
          <button 
            class="social-btn telegram full-width" 
            (click)="initTelegramWidget()"
            [disabled]="telegramLoading()"
          >
            @if (telegramLoading()) {
              <span class="loading-spinner small"></span>
              <span>{{ t('auth.loadingTelegram') }}</span>
            } @else {
              <span class="social-icon">✈️</span>
              <span>{{ t('auth.loginWithTelegram') }}</span>
            }
          </button>
        }
      </div>
      
      <!-- 註冊入口 -->
      <p class="register-link">
        {{ t('auth.noAccount') }}
        <a routerLink="/auth/register">{{ t('auth.registerNow') }}</a>
      </p>
    </div>
  `,
  styles: [`
    .login-page {
      color: var(--text-primary, #fff);
    }
    
    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .page-subtitle {
      color: var(--text-secondary, #888);
      margin-bottom: 2rem;
    }
    
    .error-alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #f87171;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }
    
    .lockout-alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: rgba(251, 146, 60, 0.1);
      border: 1px solid rgba(251, 146, 60, 0.3);
      border-radius: 8px;
      color: #fb923c;
      margin-bottom: 1.5rem;
    }
    
    .lockout-icon {
      font-size: 1.5rem;
    }
    
    .lockout-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .lockout-title {
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .lockout-time {
      font-size: 0.8rem;
      opacity: 0.8;
    }
    
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-group label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #aaa);
    }
    
    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }
    
    .input-icon {
      position: absolute;
      left: 1rem;
      font-size: 1rem;
      opacity: 0.5;
    }
    
    .input-wrapper input {
      width: 100%;
      padding: 0.875rem 1rem 0.875rem 2.75rem;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    
    .input-wrapper input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    .input-wrapper input::placeholder {
      color: var(--text-muted, #666);
    }
    
    .toggle-password {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    
    .toggle-password:hover {
      opacity: 1;
    }
    
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary, #aaa);
    }
    
    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary, #3b82f6);
    }
    
    .forgot-link {
      color: var(--primary, #3b82f6);
      text-decoration: none;
      transition: color 0.2s;
    }
    
    .forgot-link:hover {
      color: var(--primary-hover, #60a5fa);
      text-decoration: underline;
    }
    
    .submit-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 0.5rem;
    }
    
    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .loading-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: var(--text-muted, #666);
      font-size: 0.875rem;
    }
    
    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-color, #333);
    }
    
    .divider span {
      padding: 0 1rem;
    }
    
    .social-login {
      display: flex;
      gap: 1rem;
    }
    
    .social-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .social-btn:hover {
      background: var(--bg-tertiary, #252525);
      border-color: var(--border-hover, #444);
    }
    
    .social-btn.google .social-icon {
      color: #ea4335;
      font-weight: bold;
    }
    
    .social-btn.telegram .social-icon {
      color: #0088cc;
    }
    
    .social-btn.full-width {
      width: 100%;
      flex: none;
    }
    
    .social-btn.telegram {
      background: linear-gradient(135deg, #0088cc, #0077b5);
      border-color: #0088cc;
    }
    
    .social-btn.telegram:hover {
      background: linear-gradient(135deg, #0099dd, #0088cc);
    }
    
    /* 🆕 Telegram Widget 容器樣式 */
    .telegram-widget-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 48px;
      width: 100%;
    }
    
    .telegram-widget-container iframe {
      border-radius: 8px !important;
    }
    
    #telegram-login-widget {
      display: flex;
      justify-content: center;
    }
    
    .loading-spinner.small {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }
    
    .register-link {
      text-align: center;
      margin-top: 1.5rem;
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
    }
    
    .register-link a {
      color: var(--primary, #3b82f6);
      text-decoration: none;
      font-weight: 500;
    }
    
    .register-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private security = inject(FrontendSecurityService);
  
  // 表單數據
  email = '';
  password = '';
  rememberMe = false;
  
  // 狀態
  showPassword = signal(false);
  isLoading = signal(false);
  telegramLoading = signal(false);
  telegramWidgetReady = signal(false);  // 🆕 Widget 是否已載入
  error = signal<string | null>(null);
  
  // P1.5: 安全增強 - 登入限制
  isLocked = computed(() => this.security.isLocked());
  lockoutRemaining = computed(() => this.security.lockoutRemaining());
  attemptsLeft = computed(() => this.security.attemptsLeft());
  
  // Telegram 配置
  private telegramBotUsername = '';
  private telegramBotId = '';  // 🆕 數字格式的 Bot ID
  private lockoutCleanup: (() => void) | null = null;
  
  ngOnInit() {
    // 檢查登入限制狀態
    this.checkLoginLimit();
  }
  
  ngOnDestroy() {
    // 清理倒計時
    this.lockoutCleanup?.();
  }
  
  private checkLoginLimit() {
    const result = this.security.canAttemptLogin();
    if (!result.allowed) {
      this.error.set(result.message || '');
      // 啟動倒計時
      this.lockoutCleanup = this.security.startLockoutCountdown((remaining) => {
        if (remaining <= 0) {
          this.error.set(null);
        }
      });
    }
  }
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  async onSubmit() {
    if (!this.email || !this.password) return;
    
    // P1.5: 安全檢查 - 登入限制
    const canLogin = this.security.canAttemptLogin();
    if (!canLogin.allowed) {
      this.error.set(canLogin.message || '');
      return;
    }
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.login({
        email: this.email,
        password: this.password,
        remember: this.rememberMe
      });
      
      if (result.success) {
        // 記錄成功嘗試（清除限制）
        this.security.recordLoginAttempt(true, this.email);
        
        // 獲取重定向 URL
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      } else {
        // 記錄失敗嘗試
        this.security.recordLoginAttempt(false, this.email);
        
        // 顯示錯誤和剩餘嘗試次數
        const attemptsLeft = this.security.attemptsLeft();
        let errorMsg = result.error || this.t('auth.loginFailed');
        if (attemptsLeft > 0 && attemptsLeft <= 3) {
          errorMsg += ` (剩餘 ${attemptsLeft} 次嘗試機會)`;
        }
        this.error.set(errorMsg);
        
        // 檢查是否需要鎖定
        this.checkLoginLimit();
      }
    } catch (e: any) {
      // 記錄失敗嘗試
      this.security.recordLoginAttempt(false, this.email);
      this.error.set(e.message || this.t('auth.loginFailed'));
      this.checkLoginLimit();
    } finally {
      this.isLoading.set(false);
    }
  }
  
  async socialLogin(provider: string) {
    if (provider === 'telegram') {
      await this.initTelegramWidget();  // 🔧 使用嵌入式 Widget
    } else if (provider === 'google') {
      await this.googleLogin();
    }
  }
  
  private async googleLogin() {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      // 1. 獲取 Google 配置
      const response = await fetch('/api/v1/oauth/google/config');
      const config = await response.json();
      
      if (!config.success || !config.data?.enabled) {
        this.error.set(this.t('auth.googleNotAvailable'));
        return;
      }
      
      // 2. 打開 Google OAuth 彈窗
      this.openGoogleLoginPopup();
      
    } catch (e: any) {
      console.error('Google login error:', e);
      this.error.set(this.t('auth.googleNotAvailable'));
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private openGoogleLoginPopup() {
    // 構建回調 URL
    const origin = window.location.origin;
    const callbackUrl = `${origin}/api/v1/oauth/google/callback`;
    
    // Google OAuth 授權 URL
    const authUrl = `/api/v1/oauth/google/authorize?callback=${encodeURIComponent(callbackUrl)}`;
    
    // 打開彈窗
    const width = 550;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'GoogleAuth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
    
    // 監聽彈窗消息
    const handleMessage = async (event: MessageEvent) => {
      // 接受來自任何來源的消息（因為 Google 回調會發送消息）
      if (event.data && event.data.type === 'google_auth') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        
        // 處理 Google 認證數據
        await this.handleGoogleAuth(event.data.auth);
      } else if (event.data && event.data.type === 'google_auth_error') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        
        this.error.set(event.data.error || 'Google 登入失敗');
        this.isLoading.set(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // 監測彈窗關閉
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        this.isLoading.set(false);
      }
    }, 500);
  }
  
  private async handleGoogleAuth(authData: any) {
    this.isLoading.set(true);
    
    try {
      if (authData.access_token && authData.user) {
        // 設置認證狀態（直接使用返回的 token）
        localStorage.setItem('tgm_access_token', authData.access_token);
        if (authData.refresh_token) {
          localStorage.setItem('tgm_refresh_token', authData.refresh_token);
        }
        localStorage.setItem('tgm_user', JSON.stringify(authData.user));
        
        // 登入成功，重定向
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        window.location.href = returnUrl;
      } else {
        this.error.set('Google 登入失敗：無效的認證數據');
      }
    } catch (e: any) {
      this.error.set(e.message || 'Google 登入失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  /**
   * 🆕 初始化嵌入式 Telegram Login Widget
   * 優點：自動檢測已登入的 Telegram 帳號，一鍵確認登入
   */
  async initTelegramWidget() {
    this.telegramLoading.set(true);
    this.error.set(null);
    
    try {
      // 1. 獲取 Telegram 配置
      const config = await this.authService.getTelegramConfig();
      
      if (!config.enabled || !config.bot_username) {
        this.error.set(this.t('auth.telegramNotConfigured'));
        return;
      }
      
      this.telegramBotUsername = config.bot_username;
      this.telegramBotId = config.bot_id || '';
      
      // 2. 定義全局回調函數
      (window as any).onTelegramAuth = (user: any) => {
        console.log('Telegram auth callback:', user);
        this.handleTelegramAuth(user);
      };
      
      // 🔧 修復：先顯示容器，等待 Angular 渲染完成，再載入腳本
      this.telegramWidgetReady.set(true);
      
      // 等待下一個變更檢測週期，確保 DOM 已渲染
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. 動態載入 Telegram Widget 腳本
      await this.loadTelegramWidgetScript();
      
    } catch (e: any) {
      console.error('Telegram widget init error:', e);
      this.error.set(e.message || 'Telegram 載入失敗');
      this.telegramWidgetReady.set(false);  // 🔧 錯誤時重置狀態
    } finally {
      this.telegramLoading.set(false);
    }
  }
  
  /**
   * 動態載入 Telegram Widget 腳本
   */
  private loadTelegramWidgetScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 檢查是否已載入
      if (document.getElementById('telegram-widget-script')) {
        resolve();
        return;
      }
      
      const container = document.getElementById('telegram-login-widget');
      if (!container) {
        reject(new Error('Widget container not found'));
        return;
      }
      
      // 清空容器
      container.innerHTML = '';
      
      // 創建 Telegram Login Widget 腳本
      const script = document.createElement('script');
      script.id = 'telegram-widget-script';
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', this.telegramBotUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '8');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      
      script.onload = () => {
        console.log('Telegram widget script loaded');
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Telegram widget'));
      };
      
      container.appendChild(script);
    });
  }
  
  private async handleTelegramAuth(authData: any) {
    this.telegramLoading.set(true);
    this.error.set(null);
    
    console.log('[TelegramAuth] Processing auth data:', authData);
    
    try {
      // 🆕 P1.4: 錯誤重試機制（最多重試 3 次）
      let result: { success: boolean; error?: string } = { success: false };
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          result = await this.authService.telegramLogin(authData);
          break;  // 成功則跳出循環
        } catch (e: any) {
          retries++;
          console.warn(`[TelegramAuth] Retry ${retries}/${maxRetries}:`, e.message);
          if (retries >= maxRetries) throw e;
          await new Promise(r => setTimeout(r, 1000 * retries));  // 遞增延遲
        }
      }
      
      if (result.success) {
        console.log('[TelegramAuth] Login successful, redirecting...');
        // 🆕 登入成功，使用 window.location 強制刷新以確保狀態更新
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        window.location.href = returnUrl;
      } else {
        console.error('[TelegramAuth] Login failed:', result.error);
        this.error.set(result.error || this.t('auth.telegramLoginFailed'));
      }
    } catch (e: any) {
      console.error('[TelegramAuth] Exception:', e);
      this.error.set(e.message || this.t('auth.telegramLoginFailed'));
    } finally {
      this.telegramLoading.set(false);
    }
  }
}
