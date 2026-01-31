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

import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page">
      <h2 class="page-title">{{ t('auth.welcomeBack') }}</h2>
      <p class="page-subtitle">{{ t('auth.loginSubtitle') }}</p>
      
      <!-- 錯誤提示 -->
      @if (error()) {
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
          [disabled]="isLoading() || !email || !password"
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
      
      <!-- 第三方登入 -->
      <div class="social-login">
        <button class="social-btn google" (click)="socialLogin('google')">
          <span class="social-icon">G</span>
          <span>Google</span>
        </button>
        <button class="social-btn telegram" (click)="socialLogin('telegram')">
          <span class="social-icon">✈️</span>
          <span>Telegram</span>
        </button>
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
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  
  // 表單數據
  email = '';
  password = '';
  rememberMe = false;
  
  // 狀態
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  async onSubmit() {
    if (!this.email || !this.password) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.login({
        email: this.email,
        password: this.password,
        remember: this.rememberMe
      });
      
      if (result.success) {
        // 獲取重定向 URL
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.error.set(result.error || this.t('auth.loginFailed'));
      }
    } catch (e: any) {
      this.error.set(e.message || this.t('auth.loginFailed'));
    } finally {
      this.isLoading.set(false);
    }
  }
  
  socialLogin(provider: string) {
    // TODO: 實現第三方登入
    console.log('Social login:', provider);
  }
}
