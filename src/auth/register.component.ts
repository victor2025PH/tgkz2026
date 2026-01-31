/**
 * 註冊頁面組件
 * 
 * 優化設計：
 * 1. 密碼強度檢查
 * 2. 實時表單驗證
 * 3. 服務條款確認
 * 4. 密碼匹配檢查
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="register-page">
      <h2 class="page-title">{{ t('auth.createAccount') }}</h2>
      <p class="page-subtitle">{{ t('auth.registerSubtitle') }}</p>
      
      <!-- 錯誤提示 -->
      @if (error()) {
        <div class="error-alert">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      <form class="register-form" (ngSubmit)="onSubmit()">
        <!-- 用戶名 -->
        <div class="form-group">
          <label for="username">{{ t('auth.username') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">👤</span>
            <input
              type="text"
              id="username"
              [(ngModel)]="username"
              name="username"
              [placeholder]="t('auth.usernamePlaceholder')"
              autocomplete="username"
              [disabled]="isLoading()"
            />
          </div>
        </div>
        
        <!-- 郵箱 -->
        <div class="form-group">
          <label for="email">{{ t('auth.email') }} *</label>
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
          <label for="password">{{ t('auth.password') }} *</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="password"
              [(ngModel)]="password"
              name="password"
              [placeholder]="t('auth.passwordPlaceholder')"
              required
              autocomplete="new-password"
              [disabled]="isLoading()"
              (input)="checkPasswordStrength()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? '🙈' : '👁️' }}
            </button>
          </div>
          
          <!-- 密碼強度指示器 -->
          @if (password) {
            <div class="password-strength">
              <div class="strength-bars">
                @for (i of [1, 2, 3, 4]; track i) {
                  <div 
                    class="strength-bar" 
                    [class.active]="passwordStrength() >= i"
                    [class.weak]="passwordStrength() === 1"
                    [class.fair]="passwordStrength() === 2"
                    [class.good]="passwordStrength() === 3"
                    [class.strong]="passwordStrength() === 4"
                  ></div>
                }
              </div>
              <span class="strength-text" [class]="strengthClass()">
                {{ passwordStrengthText() }}
              </span>
            </div>
          }
        </div>
        
        <!-- 確認密碼 -->
        <div class="form-group">
          <label for="confirmPassword">{{ t('auth.confirmPassword') }} *</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="confirmPassword"
              [(ngModel)]="confirmPassword"
              name="confirmPassword"
              [placeholder]="t('auth.confirmPasswordPlaceholder')"
              required
              autocomplete="new-password"
              [disabled]="isLoading()"
            />
            @if (confirmPassword && password !== confirmPassword) {
              <span class="input-error">❌</span>
            }
            @if (confirmPassword && password === confirmPassword) {
              <span class="input-success">✅</span>
            }
          </div>
        </div>
        
        <!-- 服務條款 -->
        <label class="checkbox-label terms">
          <input 
            type="checkbox" 
            [(ngModel)]="agreeTerms" 
            name="agreeTerms"
            required
          />
          <span>
            {{ t('auth.agreeToTerms') }}
            <a href="/terms" target="_blank">{{ t('auth.termsOfService') }}</a>
            {{ t('auth.and') }}
            <a href="/privacy" target="_blank">{{ t('auth.privacyPolicy') }}</a>
          </span>
        </label>
        
        <!-- 註冊按鈕 -->
        <button 
          type="submit" 
          class="submit-btn"
          [disabled]="!canSubmit()"
        >
          @if (isLoading()) {
            <span class="loading-spinner"></span>
            <span>{{ t('auth.registering') }}</span>
          } @else {
            <span>{{ t('auth.register') }}</span>
          }
        </button>
      </form>
      
      <!-- 登入入口 -->
      <p class="login-link">
        {{ t('auth.haveAccount') }}
        <a routerLink="/auth/login">{{ t('auth.loginNow') }}</a>
      </p>
    </div>
  `,
  styles: [`
    .register-page {
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
    
    .register-form {
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
    
    .toggle-password,
    .input-error,
    .input-success {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
    }
    
    .toggle-password {
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    
    .toggle-password:hover {
      opacity: 1;
    }
    
    /* 密碼強度 */
    .password-strength {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    
    .strength-bars {
      display: flex;
      gap: 4px;
    }
    
    .strength-bar {
      width: 40px;
      height: 4px;
      background: var(--bg-tertiary, #333);
      border-radius: 2px;
      transition: all 0.3s ease;
    }
    
    .strength-bar.active.weak { background: #ef4444; }
    .strength-bar.active.fair { background: #f59e0b; }
    .strength-bar.active.good { background: #10b981; }
    .strength-bar.active.strong { background: #22c55e; }
    
    .strength-text {
      font-size: 0.75rem;
    }
    
    .strength-text.weak { color: #ef4444; }
    .strength-text.fair { color: #f59e0b; }
    .strength-text.good { color: #10b981; }
    .strength-text.strong { color: #22c55e; }
    
    /* 條款 */
    .checkbox-label.terms {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-secondary, #aaa);
      font-size: 0.875rem;
      line-height: 1.4;
    }
    
    .checkbox-label input[type="checkbox"] {
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--primary, #3b82f6);
    }
    
    .checkbox-label a {
      color: var(--primary, #3b82f6);
      text-decoration: none;
    }
    
    .checkbox-label a:hover {
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
    
    .login-link {
      text-align: center;
      margin-top: 1.5rem;
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
    }
    
    .login-link a {
      color: var(--primary, #3b82f6);
      text-decoration: none;
      font-weight: 500;
    }
    
    .login-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private i18n = inject(I18nService);
  
  // 表單數據
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  agreeTerms = false;
  
  // 狀態
  showPassword = signal(false);
  isLoading = signal(false);
  error = signal<string | null>(null);
  passwordStrength = signal(0);
  
  // 計算屬性
  canSubmit = computed(() => 
    this.email && 
    this.password && 
    this.password === this.confirmPassword &&
    this.agreeTerms &&
    this.passwordStrength() >= 2 &&
    !this.isLoading()
  );
  
  passwordStrengthText = computed(() => {
    const strength = this.passwordStrength();
    const texts = ['', this.t('auth.weak'), this.t('auth.fair'), this.t('auth.good'), this.t('auth.strong')];
    return texts[strength] || '';
  });
  
  strengthClass = computed(() => {
    const classes = ['', 'weak', 'fair', 'good', 'strong'];
    return classes[this.passwordStrength()] || '';
  });
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  checkPasswordStrength() {
    let strength = 0;
    const pwd = this.password;
    
    if (pwd.length >= 6) strength++;
    if (pwd.length >= 8 && /[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength++;
    
    this.passwordStrength.set(strength);
  }
  
  async onSubmit() {
    if (!this.canSubmit()) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.register({
        email: this.email,
        password: this.password,
        username: this.username || undefined,
        display_name: this.username || undefined
      });
      
      if (result.success) {
        this.router.navigate(['/']);
      } else {
        this.error.set(result.error || this.t('auth.registerFailed'));
      }
    } catch (e: any) {
      this.error.set(e.message || this.t('auth.registerFailed'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
