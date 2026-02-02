/**
 * 掃碼登入中轉頁面 - 優化版
 * 
 * 🆕 新流程（解決回訪用戶問題）：
 * 1. 用戶用手機相機掃描 QR Code
 * 2. 打開此頁面
 * 3. 頁面顯示 Telegram 授權按鈕（Login Widget）
 * 4. 用戶點擊授權 → 獲取 Telegram ID
 * 5. 後端主動向用戶 Telegram 發送確認消息
 * 6. 用戶在 Bot 中點擊確認 → 電腦端自動登入
 * 
 * 核心改變：不再依賴 /start 命令，而是後端主動推送
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../i18n.service';

// 全局 Telegram Widget 回調聲明
declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TokenStatus {
  status: 'loading' | 'valid' | 'expired' | 'confirmed' | 'error' | 'authorizing' | 'sending' | 'bot_blocked';
  message?: string;
  botUsername?: string;
  deepLinkUrl?: string;
  expiresIn?: number;
  botLink?: string;  // 🆕 用於 Bot 封鎖時的開啟連結
}

// 🆕 設備類型檢測
type DeviceType = 'ios' | 'android' | 'desktop' | 'unknown';

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua)) return 'desktop';
  return 'unknown';
}

// 🆕 檢查是否為移動設備
function isMobile(): boolean {
  const device = detectDevice();
  return device === 'ios' || device === 'android';
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

        <!-- Valid Token - 顯示 Telegram 授權按鈕 -->
        @if (tokenStatus().status === 'valid') {
          <div class="status-section valid">
            <div class="info-icon">📱</div>
            <h2>{{ t('scanLogin.confirmTitle') }}</h2>
            <p class="description">{{ t('scanLogin.authDesc') }}</p>
            
            <!-- 🆕 Telegram Login Widget 容器 -->
            <div class="telegram-widget-container" id="telegram-login-widget"></div>
            
            <!-- 備用方案：手動打開 Telegram -->
            <div class="divider">
              <span>{{ t('scanLogin.or') }}</span>
            </div>
            
            <a 
              [href]="tokenStatus().deepLinkUrl" 
              class="telegram-btn secondary"
              (click)="onTelegramClick()"
            >
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              <span>{{ t('scanLogin.openTelegramManual') }}</span>
            </a>

            @if (countdown() > 0) {
              <p class="countdown">
                {{ t('scanLogin.expiresIn', {seconds: countdown()}) }}
              </p>
            }

            <div class="steps">
              <div class="step">
                <span class="step-num">1</span>
                <span>{{ t('scanLogin.stepAuth') }}</span>
              </div>
              <div class="step">
                <span class="step-num">2</span>
                <span>{{ t('scanLogin.stepConfirm') }}</span>
              </div>
              <div class="step">
                <span class="step-num">3</span>
                <span>{{ t('scanLogin.stepDone') }}</span>
              </div>
            </div>
          </div>
        }
        
        <!-- 🆕 正在發送確認消息 -->
        @if (tokenStatus().status === 'sending') {
          <div class="status-section sending">
            <div class="spinner"></div>
            <h2>{{ t('scanLogin.sendingTitle') }}</h2>
            <p>{{ t('scanLogin.sendingDesc') }}</p>
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

        <!-- 🆕 Bot 被封鎖提示 -->
        @if (tokenStatus().status === 'bot_blocked') {
          <div class="status-section bot-blocked">
            <div class="warning-icon">🤖</div>
            <h2>{{ t('scanLogin.botBlockedTitle') }}</h2>
            <p>{{ t('scanLogin.botBlockedDesc') }}</p>
            
            <a 
              [href]="tokenStatus().botLink" 
              class="telegram-btn primary"
              target="_blank"
            >
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              <span>{{ t('scanLogin.openBotFirst') }}</span>
            </a>
            
            <p class="hint">{{ t('scanLogin.botBlockedHint') }}</p>
            
            <button class="retry-btn" (click)="retryAfterUnblock()">
              {{ t('scanLogin.retryAfterUnblock') }}
            </button>
          </div>
        }

        <!-- Confirmed - 🆕 增強動畫效果 -->
        @if (tokenStatus().status === 'confirmed') {
          <div class="status-section confirmed" [class.animate]="showSuccessAnimation()">
            <div class="success-animation">
              <div class="checkmark-circle">
                <svg class="checkmark" viewBox="0 0 52 52">
                  <circle class="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
            </div>
            <h2>{{ t('scanLogin.successTitle') }}</h2>
            <p>{{ t('scanLogin.successDesc') }}</p>
            <p class="redirect-hint">{{ t('scanLogin.redirecting') }}</p>
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

    .telegram-btn.secondary {
      background: transparent;
      border: 1px solid #0088cc;
      box-shadow: none;
    }

    .telegram-btn.secondary:hover {
      background: rgba(0, 136, 204, 0.1);
      box-shadow: none;
    }

    .telegram-widget-container {
      display: flex;
      justify-content: center;
      margin: 1.5rem 0;
      min-height: 48px;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1.5rem 0;
      color: #64748b;
      font-size: 0.85rem;
    }

    .divider::before,
    .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
    }

    .divider span {
      padding: 0 1rem;
    }

    .status-section.sending h2 {
      color: #60a5fa;
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

    /* 🆕 Bot 封鎖樣式 */
    .status-section.bot-blocked .warning-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .status-section.bot-blocked h2 {
      color: #fbbf24;
    }

    .telegram-btn.primary {
      background: linear-gradient(135deg, #0088cc, #0066aa);
      box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);
    }

    .hint {
      color: #64748b;
      font-size: 0.8rem;
      margin: 1rem 0;
    }

    /* 🆕 成功動畫 */
    .success-animation {
      margin: 1rem 0 2rem;
    }

    .checkmark-circle {
      width: 80px;
      height: 80px;
      margin: 0 auto;
    }

    .checkmark {
      width: 100%;
      height: 100%;
    }

    .checkmark-circle-bg {
      stroke: #4ade80;
      stroke-width: 2;
      stroke-dasharray: 157;
      stroke-dashoffset: 157;
      animation: circle-draw 0.6s ease-out forwards;
    }

    .checkmark-check {
      stroke: #4ade80;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: check-draw 0.4s 0.4s ease-out forwards;
    }

    @keyframes circle-draw {
      to { stroke-dashoffset: 0; }
    }

    @keyframes check-draw {
      to { stroke-dashoffset: 0; }
    }

    .status-section.confirmed.animate {
      animation: success-scale 0.5s ease-out;
    }

    @keyframes success-scale {
      0% { transform: scale(0.8); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }

    .redirect-hint {
      color: #64748b;
      font-size: 0.85rem;
      margin-top: 1rem;
      animation: blink 1.5s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* 🆕 設備提示樣式 */
    .device-hint {
      background: rgba(0, 136, 204, 0.1);
      border: 1px solid rgba(0, 136, 204, 0.3);
      border-radius: 8px;
      padding: 0.75rem;
      margin: 1rem 0;
      color: #60a5fa;
      font-size: 0.85rem;
    }

    .device-hint .icon {
      margin-right: 0.5rem;
    }
  `]
})
export class ScanLoginComponent implements OnInit, OnDestroy, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private i18n = inject(I18nService);

  tokenStatus = signal<TokenStatus>({ status: 'loading' });
  countdown = signal(0);
  waitingConfirm = signal(false);
  telegramUser = signal<TelegramUser | null>(null);
  showSuccessAnimation = signal(false);
  deviceType = signal<DeviceType>('unknown');

  private token = '';
  private botUsername = '';
  private countdownInterval: any = null;
  private pollInterval: any = null;
  private widgetLoaded = false;
  
  // 🆕 LocalStorage 鍵
  private readonly SAVED_TG_USER_KEY = 'tg_matrix_saved_user';

  ngOnInit() {
    // 🆕 檢測設備類型
    this.deviceType.set(detectDevice());
    console.log('Device type:', this.deviceType());
    
    // 從 URL 獲取 token
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.tokenStatus.set({
        status: 'error',
        message: this.t('scanLogin.noToken')
      });
      return;
    }

    // 設置全局回調函數
    window.onTelegramAuth = this.handleTelegramAuth.bind(this);

    // 驗證 Token
    this.verifyToken();
    
    // 🆕 檢查是否有保存的用戶（記住授權功能）
    this.checkSavedUser();
  }
  
  /**
   * 🆕 檢查是否有保存的 Telegram 用戶
   */
  private checkSavedUser() {
    try {
      const savedUserStr = localStorage.getItem(this.SAVED_TG_USER_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr) as TelegramUser;
        // 檢查授權是否過期（24小時）
        const authTime = savedUser.auth_date * 1000;
        const now = Date.now();
        const hoursSinceAuth = (now - authTime) / (1000 * 60 * 60);
        
        if (hoursSinceAuth < 24) {
          console.log('Found saved user, auto-sending confirmation...');
          this.telegramUser.set(savedUser);
          // 自動發送確認（延遲等待 token 驗證完成）
          setTimeout(() => {
            if (this.tokenStatus().status === 'valid') {
              this.sendConfirmationToUser(savedUser);
            }
          }, 500);
        } else {
          // 授權過期，清除
          localStorage.removeItem(this.SAVED_TG_USER_KEY);
        }
      }
    } catch (e) {
      console.error('Error checking saved user:', e);
    }
  }

  ngAfterViewInit() {
    // 在視圖初始化後加載 Telegram Widget（如果需要）
  }

  /**
   * 🆕 處理 Telegram Login Widget 授權回調
   */
  handleTelegramAuth(user: TelegramUser) {
    console.log('Telegram auth received:', user);
    this.telegramUser.set(user);
    
    // 更新狀態為"正在發送確認消息"
    this.tokenStatus.update(s => ({ ...s, status: 'sending' }));
    
    // 調用後端 API 發送確認消息
    this.sendConfirmationToUser(user);
  }

  /**
   * 🆕 調用後端 API，讓 Bot 主動發送確認消息給用戶
   */
  async sendConfirmationToUser(user: TelegramUser) {
    try {
      const response = await fetch(`/api/v1/auth/login-token/${this.token}/send-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telegram_id: user.id,
          telegram_username: user.username,
          telegram_first_name: user.first_name,
          telegram_last_name: user.last_name,
          auth_date: user.auth_date,
          hash: user.hash
        })
      });

      const result = await response.json();

      if (result.success) {
        // 🆕 保存用戶信息（記住授權）
        this.saveUser(user);
        
        // 成功發送，等待用戶在 Telegram 確認
        this.tokenStatus.update(s => ({ ...s, status: 'valid' }));
        this.waitingConfirm.set(true);
        this.startPolling();
        
        // 🆕 在移動設備上自動打開 Telegram
        if (isMobile()) {
          setTimeout(() => {
            window.location.href = `tg://resolve?domain=${this.botUsername}`;
          }, 1000);
        }
      } else {
        // 🆕 檢測 Bot 封鎖情況
        if (result.need_start_bot) {
          this.tokenStatus.set({
            status: 'bot_blocked',
            message: result.error,
            botLink: result.bot_link || `https://t.me/${this.botUsername}`
          });
        } else {
          this.tokenStatus.set({
            status: 'error',
            message: result.error || this.t('scanLogin.sendFailed')
          });
        }
      }
    } catch (e: any) {
      console.error('Send confirmation error:', e);
      this.tokenStatus.set({
        status: 'error',
        message: this.t('scanLogin.networkError')
      });
    }
  }
  
  /**
   * 🆕 保存用戶信息到 LocalStorage
   */
  private saveUser(user: TelegramUser) {
    try {
      localStorage.setItem(this.SAVED_TG_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Error saving user:', e);
    }
  }
  
  /**
   * 🆕 Bot 解封後重試
   */
  retryAfterUnblock() {
    const user = this.telegramUser();
    if (user) {
      this.tokenStatus.set({ status: 'sending' });
      this.sendConfirmationToUser(user);
    } else {
      // 重新加載頁面
      window.location.reload();
    }
  }

  /**
   * 🆕 加載 Telegram Login Widget
   */
  private loadTelegramWidget() {
    if (this.widgetLoaded || !this.botUsername) return;
    
    const container = document.getElementById('telegram-login-widget');
    if (!container) return;

    // 清空容器
    container.innerHTML = '';

    // 創建 script 標籤
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', this.botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '10');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    
    container.appendChild(script);
    this.widgetLoaded = true;
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

      // 保存 Bot username 供 Widget 使用
      this.botUsername = bot_username || 'tgzkw_bot';

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
      
      // 🆕 延遲加載 Telegram Widget（等待 DOM 渲染完成）
      setTimeout(() => {
        this.loadTelegramWidget();
      }, 100);

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
            
            // 🆕 顯示成功動畫
            this.showSuccessAnimation.set(true);
            this.tokenStatus.set({ status: 'confirmed' });
            
            // 🆕 動畫結束後可以關閉頁面或顯示提示
            setTimeout(() => {
              // 如果在移動設備上，提示用戶可以關閉頁面
              // 電腦端會通過 WebSocket 自動跳轉
            }, 2000);
            
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
