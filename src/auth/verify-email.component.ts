/**
 * 郵箱驗證頁面
 * 
 * 支持兩種驗證方式：
 * 1. 通過 URL Token 驗證
 * 2. 通過輸入驗證碼驗證
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="verify-email-page">
      @if (verifying()) {
        <div class="verifying-state">
          <div class="loading-spinner large"></div>
          <h2>正在驗證...</h2>
          <p>請稍候</p>
        </div>
      } @else if (success()) {
        <div class="success-state">
          <div class="success-icon">✅</div>
          <h2>驗證成功！</h2>
          <p>您的郵箱已成功驗證，現在可以使用所有功能了</p>
          <button class="primary-btn" routerLink="/">開始使用</button>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <div class="error-icon">❌</div>
          <h2>驗證失敗</h2>
          <p>{{ error() }}</p>
          <div class="actions">
            <button class="secondary-btn" (click)="resendEmail()">重新發送驗證郵件</button>
            <a routerLink="/auth/login" class="link">返回登入</a>
          </div>
        </div>
      } @else {
        <div class="code-form">
          <h2>驗證您的郵箱</h2>
          <p>請輸入發送到 {{ email }} 的 6 位驗證碼</p>
          
          <div class="code-input-group">
            @for (i of [0,1,2,3,4,5]; track i) {
              <input
                type="text"
                maxlength="1"
                class="code-input"
                [value]="codeDigits()[i] || ''"
                (input)="onCodeInput($event, i)"
                (keydown)="onKeyDown($event, i)"
                (paste)="onPaste($event)"
                [disabled]="isLoading()"
              />
            }
          </div>
          
          <button 
            class="primary-btn"
            (click)="verifyByCode()"
            [disabled]="isLoading() || code.length < 6"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>驗證中...</span>
            } @else {
              驗證
            }
          </button>
          
          <p class="resend-text">
            沒有收到郵件？
            <button class="link-btn" (click)="resendEmail()" [disabled]="resendCooldown() > 0">
              @if (resendCooldown() > 0) {
                {{ resendCooldown() }}s 後重新發送
              } @else {
                重新發送
              }
            </button>
          </p>
        </div>
      }
    </div>
  `,
  styles: [`
    .verify-email-page {
      color: var(--text-primary, #fff);
      text-align: center;
      padding: 2rem;
    }
    
    .verifying-state, .success-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .success-icon, .error-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    
    .loading-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .loading-spinner.large {
      width: 48px;
      height: 48px;
      border-width: 4px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .code-form h2 {
      margin-bottom: 0.5rem;
    }
    
    .code-form p {
      color: var(--text-secondary, #888);
      margin-bottom: 2rem;
    }
    
    .code-input-group {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      margin-bottom: 2rem;
    }
    
    .code-input {
      width: 48px;
      height: 56px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      transition: all 0.2s;
    }
    
    .code-input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
    
    .primary-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 2rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .primary-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .primary-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .secondary-btn {
      padding: 0.75rem 1.5rem;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .secondary-btn:hover {
      background: var(--bg-tertiary, #252525);
    }
    
    .actions {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .link, .link-btn {
      color: var(--primary, #3b82f6);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      font-size: inherit;
    }
    
    .link:hover, .link-btn:hover:not(:disabled) {
      text-decoration: underline;
    }
    
    .link-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .resend-text {
      margin-top: 1.5rem;
      color: var(--text-secondary, #888);
    }
  `]
})
export class VerifyEmailComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  
  email = '';
  code = '';
  codeDigits = signal<string[]>(['', '', '', '', '', '']);
  
  verifying = signal(false);
  isLoading = signal(false);
  success = signal(false);
  error = signal<string | null>(null);
  resendCooldown = signal(0);
  
  private cooldownInterval: any;
  
  ngOnInit() {
    // 從 URL 獲取 token 或 email
    const token = this.route.snapshot.queryParams['token'];
    this.email = this.route.snapshot.queryParams['email'] || '';
    
    if (token) {
      this.verifyByToken(token);
    }
  }
  
  async verifyByToken(token: string) {
    this.verifying.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.verifyEmail(token);
      
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || '驗證失敗');
      }
    } catch (e: any) {
      this.error.set(e.message || '驗證失敗');
    } finally {
      this.verifying.set(false);
    }
  }
  
  async verifyByCode() {
    if (this.code.length < 6) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.verifyEmailByCode(this.email, this.code);
      
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || '驗證失敗');
      }
    } catch (e: any) {
      this.error.set(e.message || '驗證失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  async resendEmail() {
    if (this.resendCooldown() > 0) return;
    
    try {
      await this.authService.resendVerificationEmail();
      
      // 開始冷卻倒計時
      this.resendCooldown.set(60);
      this.cooldownInterval = setInterval(() => {
        const current = this.resendCooldown();
        if (current <= 1) {
          clearInterval(this.cooldownInterval);
          this.resendCooldown.set(0);
        } else {
          this.resendCooldown.set(current - 1);
        }
      }, 1000);
      
    } catch (e: any) {
      this.error.set(e.message || '發送失敗');
    }
  }
  
  onCodeInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    
    const digits = [...this.codeDigits()];
    digits[index] = value;
    this.codeDigits.set(digits);
    this.code = digits.join('');
    
    // 自動跳到下一個輸入框
    if (value && index < 5) {
      const nextInput = input.parentElement?.children[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  }
  
  onKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;
    
    // Backspace 跳到上一個
    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = input.parentElement?.children[index - 1] as HTMLInputElement;
      prevInput?.focus();
    }
  }
  
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 6) || '';
    
    const digits = paste.split('');
    while (digits.length < 6) digits.push('');
    
    this.codeDigits.set(digits);
    this.code = paste;
  }
}
