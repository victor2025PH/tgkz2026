/**
 * 忘記密碼頁面
 */

import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { I18nService } from '../i18n.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="forgot-password-page">
      <h2 class="page-title">重置密碼</h2>
      <p class="page-subtitle">輸入您的電子郵件，我們將發送重置鏈接</p>
      
      @if (success()) {
        <div class="success-alert">
          <span class="success-icon">✅</span>
          <span>重置鏈接已發送到您的郵箱，請查收</span>
        </div>
      }
      
      @if (error()) {
        <div class="error-alert">
          <span class="error-icon">⚠️</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      @if (!success()) {
        <form class="forgot-form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="email">電子郵件</label>
            <div class="input-wrapper">
              <span class="input-icon">📧</span>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                name="email"
                placeholder="請輸入電子郵件"
                required
                autocomplete="email"
                [disabled]="isLoading()"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            class="submit-btn"
            [disabled]="isLoading() || !email"
          >
            @if (isLoading()) {
              <span class="loading-spinner"></span>
              <span>發送中...</span>
            } @else {
              <span>發送重置鏈接</span>
            }
          </button>
        </form>
      }
      
      <p class="back-link">
        <a routerLink="/auth/login">← 返回登入</a>
      </p>
    </div>
  `,
  styles: [`
    .forgot-password-page {
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
    
    .success-alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 8px;
      color: #4ade80;
      margin-bottom: 1.5rem;
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
    
    .forgot-form {
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
export class ForgotPasswordComponent {
  private i18n = inject(I18nService);
  private authService = inject(AuthService);
  
  email = '';
  isLoading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  
  async onSubmit() {
    if (!this.email) return;
    
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const result = await this.authService.forgotPassword(this.email);
      
      if (result.success) {
        this.success.set(true);
      } else {
        this.error.set(result.error || '發送失敗');
      }
    } catch (e: any) {
      this.error.set(e.message || '發送失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
}
