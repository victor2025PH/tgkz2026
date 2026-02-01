/**
 * 密碼重置頁面
 * 
 * 用戶通過郵件鏈接或驗證碼重置密碼
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reset-password-page">
      @if (success()) {
        <div class="success-state">
          <div class="success-icon">✅</div>
          <h2>密碼重置成功！</h2>
          <p>您的密碼已更新，請使用新密碼登入</p>
          <button class="primary-btn" routerLink="/auth/login">前往登入</button>
        </div>
      } @else if (invalidToken()) {
        <div class="error-state">
          <div class="error-icon">❌</div>
          <h2>鏈接無效或已過期</h2>
          <p>請重新請求密碼重置</p>
          <button class="primary-btn" routerLink="/auth/forgot-password">重新請求</button>
        </div>
      } @else {
        <h2 class="page-title">設置新密碼</h2>
        <p class="page-subtitle">請輸入您的新密碼</p>
        
        @if (error()) {
          <div class="error-alert">
            <span class="error-icon-small">⚠️</span>
            <span>{{ error() }}</span>
          </div>
        }
        
        <form class="reset-form" (ngSubmit)="onSubmit()">
          <!-- 新密碼 -->
          <div class="form-group">
            <label for="password">新密碼</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                [(ngModel)]="password"
                name="password"
                placeholder="請輸入新密碼（至少8個字符）"
                required
                minlength="8"
                autocomplete="new-password"
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
            
            <!-- 密碼強度指示器 -->
            <div class="password-strength">
              <div class="strength-bar" [class]="passwordStrength()"></div>
              <span class="strength-text">{{ passwordStrengthText() }}</span>
            </div>
          </div>
          
          <!-- 確認密碼 -->
          <div class="form-group">
            <label for="confirmPassword">確認密碼</label>
            <div class="input-wrapper">
              <span class="input-icon">🔒</span>
              <input
                [type]="showConfirmPassword() ? 'text' : 'password'"
                id="confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                placeholder="請再次輸入新密碼"
                required
                autocomplete="new-password"
                [disabled]="isLoading()"
              />
              <button 
                type="button" 
                class="toggle-password"
                (click)="showConfirmPassword.set(!showConfirmPassword())"
              >
                {{ showConfirmPassword() ? '🙈' : '👁️' }}
              </button>
            </div>
            @if (confirmPassword && password !== confirmPassword) {
              <span class="error-text">密碼不匹配</span>
            }
          </div>
          
          <button 
            type="submit" 
            class="submit-btn"
            [disabled]="isLoading() || !isFormValid()"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>重置中...</span>
            } @else {
              <span>重置密碼</span>
            }
          </button>
        </form>
        
        <p class="back-link">
          <a routerLink="/auth/login">← 返回登入</a>
        </p>
      }
    </div>
  `,
  styles: [`
    .reset-password-page {
      color: var(--text-primary, #fff);
    }
    
    .success-state, .error-state {
      text-align: center;
      padding: 2rem 0;
    }
    
    .success-icon, .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
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
    }
    
    .reset-form {
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
      padding: 0.875rem 3rem 0.875rem 2.75rem;
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
    
    .toggle-password {
      position: absolute;
      right: 1rem;
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      opacity: 0.5;
    }
    
    .toggle-password:hover {
      opacity: 1;
    }
    
    .password-strength {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }
    
    .strength-bar {
      flex: 1;
      height: 4px;
      background: var(--bg-tertiary, #252525);
      border-radius: 2px;
      position: relative;
      overflow: hidden;
    }
    
    .strength-bar::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      border-radius: 2px;
      transition: all 0.3s;
    }
    
    .strength-bar.weak::before {
      width: 33%;
      background: #ef4444;
    }
    
    .strength-bar.medium::before {
      width: 66%;
      background: #f59e0b;
    }
    
    .strength-bar.strong::before {
      width: 100%;
      background: #22c55e;
    }
    
    .strength-text {
      font-size: 0.75rem;
      color: var(--text-muted, #666);
    }
    
    .error-text {
      color: #f87171;
      font-size: 0.75rem;
    }
    
    .submit-btn, .primary-btn {
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
    
    .submit-btn:hover:not(:disabled), .primary-btn:hover:not(:disabled) {
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
    
    .back-link {
      text-align: center;
      margin-top: 1.5rem;
    }
    
    .back-link a {
      color: var(--primary, #3b82f6);
      text-decoration: none;
    }
    
    .back-link a:hover {
      text-decoration: underline;
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  
  token = '';
  password = '';
  confirmPassword = '';
  
  showPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  success = signal(false);
  invalidToken = signal(false);
  error = signal<string | null>(null);
  
  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.invalidToken.set(true);
    }
  }
  
  passwordStrength(): string {
    if (!this.password) return '';
    if (this.password.length < 8) return 'weak';
    
    let score = 0;
    if (this.password.length >= 8) score++;
    if (this.password.length >= 12) score++;
    if (/[a-z]/.test(this.password) && /[A-Z]/.test(this.password)) score++;
    if (/\d/.test(this.password)) score++;
    if (/[^a-zA-Z0-9]/.test(this.password)) score++;
    
    if (score >= 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }
  
  passwordStrengthText(): string {
    const strength = this.passwordStrength();
    switch (strength) {
      case 'weak': return '弱';
      case 'medium': return '中';
      case 'strong': return '強';
      default: return '';
    }
  }
  
  isFormValid(): boolean {
    return (
      this.password.length >= 8 &&
      this.password === this.confirmPassword
    );
  }
  
  async onSubmit() {
    if (!this.isFormValid()) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.resetPassword(this.token, this.password);
      
      if (result.success) {
        this.success.set(true);
      } else {
        if (result.error?.includes('過期') || result.error?.includes('無效')) {
          this.invalidToken.set(true);
        } else {
          this.error.set(result.error || '重置失敗');
        }
      }
    } catch (e: any) {
      this.error.set(e.message || '重置失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
}
