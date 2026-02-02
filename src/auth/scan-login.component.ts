/**
 * 掃碼登入中轉頁面
 * 
 * 流程：
 * 1. 用戶用手機相機掃描 QR Code
 * 2. 打開此頁面（HTTPS URL，任何相機都能識別）
 * 3. 頁面驗證 Token 有效性
 * 4. 顯示「在 Telegram 中確認登入」按鈕
 * 5. 用戶點擊按鈕 → 打開 Telegram Bot
 * 6. 在 Bot 中確認 → 電腦端自動登入
 */

import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../i18n.service';

interface TokenStatus {
  status: 'loading' | 'valid' | 'expired' | 'confirmed' | 'error';
  message?: string;
  botUsername?: string;
  deepLinkUrl?: string;
  expiresIn?: number;
}

@Component({
  selector: 'app-scan-login',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scan-login-page">
      <div class="scan-card">
        <!-- Logo -->
        <div class="logo">
          <div class="logo-icon">🔐</div>
          <h1>TG-Matrix</h1>
        </div>

        <!-- Loading -->
        @if (tokenStatus().status === 'loading') {
          <div class="status-section loading">
            <div class="spinner"></div>
            <p>{{ t('scanLogin.verifying') }}</p>
          </div>
        }

        <!-- Valid Token - 顯示確認按鈕 -->
        @if (tokenStatus().status === 'valid') {
          <div class="status-section valid">
            <div class="info-icon">📱</div>
            <h2>{{ t('scanLogin.confirmTitle') }}</h2>
            <p class="description">{{ t('scanLogin.confirmDesc') }}</p>
            
            <a 
              [href]="tokenStatus().deepLinkUrl" 
              class="telegram-btn"
              (click)="onTelegramClick()"
            >
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              <span>{{ t('scanLogin.openTelegram') }}</span>
            </a>

            @if (countdown() > 0) {
              <p class="countdown">
                {{ t('scanLogin.expiresIn', {seconds: countdown()}) }}
              </p>
            }

            <div class="steps">
              <div class="step">
                <span class="step-num">1</span>
                <span>{{ t('scanLogin.step1') }}</span>
              </div>
              <div class="step">
                <span class="step-num">2</span>
                <span>{{ t('scanLogin.step2') }}</span>
              </div>
              <div class="step">
                <span class="step-num">3</span>
                <span>{{ t('scanLogin.step3') }}</span>
              </div>
            </div>
          </div>
        }

        <!-- Waiting for confirmation (after clicking button) -->
        @if (waitingConfirm()) {
          <div class="status-section waiting">
            <div class="pulse-icon">⏳</div>
            <h2>{{ t('scanLogin.waitingTitle') }}</h2>
            <p>{{ t('scanLogin.waitingDesc') }}</p>
            <div class="spinner small"></div>
          </div>
        }

        <!-- Confirmed -->
        @if (tokenStatus().status === 'confirmed') {
          <div class="status-section confirmed">
            <div class="success-icon">✅</div>
            <h2>{{ t('scanLogin.successTitle') }}</h2>
            <p>{{ t('scanLogin.successDesc') }}</p>
          </div>
        }

        <!-- Expired -->
        @if (tokenStatus().status === 'expired') {
          <div class="status-section expired">
            <div class="error-icon">⏰</div>
            <h2>{{ t('scanLogin.expiredTitle') }}</h2>
            <p>{{ t('scanLogin.expiredDesc') }}</p>
            <button class="retry-btn" (click)="goToLogin()">
              {{ t('scanLogin.backToLogin') }}
            </button>
          </div>
        }

        <!-- Error -->
        @if (tokenStatus().status === 'error') {
          <div class="status-section error">
            <div class="error-icon">❌</div>
            <h2>{{ t('scanLogin.errorTitle') }}</h2>
            <p>{{ tokenStatus().message || t('scanLogin.errorDesc') }}</p>
            <button class="retry-btn" (click)="goToLogin()">
              {{ t('scanLogin.backToLogin') }}
            </button>
          </div>
        }

        <!-- Footer -->
        <div class="footer">
          <p>© 2026 TG-Matrix. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scan-login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      padding: 1rem;
    }

    .scan-card {
      background: rgba(30, 41, 59, 0.9);
      border-radius: 20px;
      padding: 2rem;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .logo {
      margin-bottom: 2rem;
    }

    .logo-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .logo h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }

    .status-section {
      padding: 1rem 0;
    }

    .info-icon, .success-icon, .error-icon, .pulse-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .pulse-icon {
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }

    h2 {
      color: #fff;
      font-size: 1.25rem;
      margin: 0 0 0.5rem;
    }

    .description {
      color: #94a3b8;
      font-size: 0.9rem;
      margin: 0 0 1.5rem;
    }

    .telegram-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #0088cc, #0066aa);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 1.1rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
      box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);
    }

    .telegram-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 136, 204, 0.5);
    }

    .telegram-btn:active {
      transform: translateY(0);
    }

    .btn-icon {
      display: flex;
      align-items: center;
    }

    .btn-icon svg {
      width: 24px;
      height: 24px;
    }

    .countdown {
      color: #64748b;
      font-size: 0.85rem;
      margin: 1rem 0 0;
    }

    .steps {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: linear-gradient(135deg, #0088cc, #0066aa);
      border-radius: 50%;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #0088cc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 1rem auto;
    }

    .spinner.small {
      width: 24px;
      height: 24px;
      border-width: 2px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .retry-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid #64748b;
      border-radius: 8px;
      color: #94a3b8;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 1rem;
    }

    .retry-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #fff;
      color: #fff;
    }

    .footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .footer p {
      color: #475569;
      font-size: 0.75rem;
      margin: 0;
    }

    /* Status specific styles */
    .status-section.loading p {
      color: #94a3b8;
    }

    .status-section.waiting h2 {
      color: #fbbf24;
    }

    .status-section.confirmed .success-icon {
      color: #4ade80;
    }

    .status-section.confirmed h2 {
      color: #4ade80;
    }

    .status-section.expired .error-icon,
    .status-section.error .error-icon {
      color: #f87171;
    }

    .status-section.expired h2,
    .status-section.error h2 {
      color: #f87171;
    }
  `]
})
export class ScanLoginComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private i18n = inject(I18nService);

  tokenStatus = signal<TokenStatus>({ status: 'loading' });
  countdown = signal(0);
  waitingConfirm = signal(false);

  private token = '';
  private countdownInterval: any = null;
  private pollInterval: any = null;

  ngOnInit() {
    // 從 URL 獲取 token
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.tokenStatus.set({
        status: 'error',
        message: this.t('scanLogin.noToken')
      });
      return;
    }

    // 驗證 Token
    this.verifyToken();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  t(key: string, params?: Record<string, any>): string {
    return this.i18n.t(key, params);
  }

  async verifyToken() {
    try {
      const response = await fetch(`/api/v1/auth/login-token/${this.token}`);
      const result = await response.json();

      if (!result.success) {
        this.tokenStatus.set({
          status: 'error',
          message: result.error || this.t('scanLogin.tokenInvalid')
        });
        return;
      }

      const { status, expires_in, deep_link_url, bot_username } = result.data;

      if (status === 'expired') {
        this.tokenStatus.set({ status: 'expired' });
        return;
      }

      if (status === 'confirmed') {
        this.tokenStatus.set({ status: 'confirmed' });
        return;
      }

      // Token 有效
      this.tokenStatus.set({
        status: 'valid',
        deepLinkUrl: deep_link_url,
        botUsername: bot_username,
        expiresIn: expires_in || 300
      });

      // 啟動倒計時
      this.countdown.set(expires_in || 300);
      this.startCountdown();

    } catch (e: any) {
      console.error('Token verification error:', e);
      this.tokenStatus.set({
        status: 'error',
        message: this.t('scanLogin.networkError')
      });
    }
  }

  onTelegramClick() {
    // 用戶點擊了 Telegram 按鈕，開始等待確認
    this.waitingConfirm.set(true);
    this.startPolling();
  }

  private startCountdown() {
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current <= 0) {
        clearInterval(this.countdownInterval);
        this.tokenStatus.set({ status: 'expired' });
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  private startPolling() {
    // 每 2 秒輪詢一次 Token 狀態
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/auth/login-token/${this.token}`);
        const result = await response.json();

        if (result.success && result.data) {
          if (result.data.status === 'confirmed') {
            clearInterval(this.pollInterval);
            this.waitingConfirm.set(false);
            this.tokenStatus.set({ status: 'confirmed' });
          } else if (result.data.status === 'expired') {
            clearInterval(this.pollInterval);
            this.waitingConfirm.set(false);
            this.tokenStatus.set({ status: 'expired' });
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 2000);
  }

  goToLogin() {
    // 跳轉回登入頁（使用完整 URL 以支持跨設備）
    window.location.href = 'https://tgw.usdt2026.cc/auth/login';
  }
}
