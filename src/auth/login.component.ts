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
import { ElectronIpcService } from '../electron-ipc.service';
// 🔧 修復 Electron app:// 協議下相對路徑 fetch 失效問題：統一用共用工具解析 API/WS 基址
import { resolveApiBaseUrl, resolveWsBaseUrl } from '../utils/api-base-url.util';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page">
      <!-- 🆕 Phase 3: 登入成功動畫遮罩 -->
      @if (loginSuccess()) {
        <div class="success-overlay">
          <div class="success-content">
            <div class="success-icon">
              <svg viewBox="0 0 52 52" class="checkmark">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <h3 class="success-title">{{ t('auth.loginSuccess') }}</h3>
            <p class="success-user">{{ t('auth.welcomeBackUser') }}，{{ successUserName() }}</p>
            <p class="success-hint">{{ t('auth.redirecting') }}</p>
          </div>
        </div>
      }
      
      <h2 class="page-title">{{ t('auth.welcomeBack') }}</h2>
      <p class="page-subtitle">{{ t('auth.loginSubtitle') }}</p>
      
      <!-- 鎖定提示 -->
      @if (isLocked()) {
        <div class="lockout-alert">
          <span class="lockout-icon">🔒</span>
          <div class="lockout-content">
            <span class="lockout-title">{{ t('auth.accountLocked') }}</span>
            <span class="lockout-time">{{ t('auth.waitSeconds', {seconds: lockoutRemaining()}) }}</span>
          </div>
        </div>
      }
      
      <!-- 錯誤提示（兜底：若為 JSON 解析錯誤則顯示網絡錯誤文案） -->
      @if (displayError() && !isLocked()) {
        <div class="error-alert">
          <span class="error-icon">⚠️</span>
          <span>{{ displayError() }}</span>
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
      
      <!-- 🆕 Phase 2: 多種 Telegram 登入方式（含 QR Code） -->
      <div class="telegram-login-section">
        <!-- 登入方式選擇器 -->
        <div class="login-method-tabs">
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'qrcode'"
            (click)="switchLoginMethod('qrcode')"
          >
            <span class="tab-icon">📷</span>
            <span>{{ t('auth.qrCodeLogin') }}</span>
          </button>
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'deeplink'"
            (click)="switchLoginMethod('deeplink')"
          >
            <span class="tab-icon">📱</span>
            <span>{{ t('auth.appLogin') }}</span>
          </button>
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'widget'"
            (click)="switchLoginMethod('widget')"
          >
            <span class="tab-icon">💬</span>
            <span>{{ t('auth.webLogin') }}</span>
          </button>
        </div>
        
        <!-- QR Code 登入（默認） -->
        @if (loginMethod() === 'qrcode') {
          <div class="qr-login-panel">
            @if (qrCodeLoading()) {
              <div class="qr-loading">
                <span class="loading-spinner"></span>
                <span>{{ t('auth.generatingQR') }}</span>
              </div>
            } @else if (qrCodeUrl()) {
              <div class="qr-container">
                <div class="qr-code-wrapper">
                  <img [src]="qrCodeUrl()" [alt]="t('auth.telegramLoginQR')" class="qr-code-img" />
                  @if (qrCodeExpired()) {
                    <div class="qr-expired-overlay">
                      <span class="expired-text">{{ t('auth.qrExpired') }}</span>
                      <button class="refresh-btn" (click)="refreshQRCode()">{{ t('auth.clickToRefresh') }}</button>
                    </div>
                  }
                </div>
                <div class="qr-instructions">
                  <p class="step"><span class="step-num">1</span> {{ t('auth.openTelegram') }}</p>
                  <p class="step"><span class="step-num">2</span> {{ t('auth.scanQRCode') }}</p>
                  <p class="step"><span class="step-num">3</span> {{ t('auth.confirmLogin') }}</p>
                </div>
                
                <!-- 🆕 驗證碼（老用戶備用） -->
                @if (verifyCode()) {
                  <div class="verify-code-section">
                    <p class="verify-hint">掃碼無效？在 Bot 中輸入驗證碼：</p>
                    <div class="verify-code">{{ verifyCode() }}</div>
                  </div>
                }
                @if (!qrCodeExpired()) {
                  <div class="qr-countdown">
                    <span class="ws-status" [class.connected]="wsConnected()">
                      {{ wsConnected() ? ('🟢 ' + t('auth.realtimeConnected')) : ('🔴 ' + t('auth.reconnecting')) }}
                    </span>
                    <span class="countdown-text">{{ qrCountdown() }}s</span>
                  </div>
                }
              </div>
            } @else {
              <button class="generate-qr-btn" (click)="generateQRCode()">
                <span class="btn-icon">📷</span>
                <span>{{ t('auth.generateQRCode') }}</span>
              </button>
            }
          </div>
        }
        
        <!-- Deep Link 登入 -->
        @if (loginMethod() === 'deeplink') {
          <div class="deeplink-panel">
            <button 
              class="social-btn telegram full-width primary-telegram" 
              (click)="openDeepLink()"
              [disabled]="telegramLoading()"
            >
              @if (deepLinkLoading()) {
                <span class="loading-spinner small"></span>
                <span>{{ t('auth.waitingConfirm') }}</span>
              } @else {
                <span class="social-icon">📱</span>
                <span>{{ t('auth.openTelegramApp') }}</span>
              }
            </button>
            
            @if (deepLinkLoading()) {
              <div class="deep-link-status">
                <div class="status-text">
                  {{ t('auth.clickConfirmInTelegram') }}
                </div>
                <div class="countdown">
                  {{ t('auth.remainingTime', {seconds: deepLinkCountdown()}) }}
                </div>
                <button class="cancel-btn" (click)="cancelDeepLink()">{{ t('auth.cancel') }}</button>
              </div>
            }
          </div>
        }
        
        <!-- Widget 登入（備用） -->
        @if (loginMethod() === 'widget') {
          <div class="widget-panel">
            <button 
              class="social-btn telegram full-width secondary-telegram" 
              (click)="initTelegramWidget()"
              [disabled]="telegramLoading()"
            >
              @if (telegramLoading() && !deepLinkLoading()) {
                <span class="loading-spinner small"></span>
                <span>{{ t('auth.loadingTelegram') }}</span>
              } @else {
                <span class="social-icon">💬</span>
                <span>{{ t('auth.useTelegramWidget') }}</span>
              }
            </button>
            <p class="widget-hint">{{ t('auth.widgetHint') }}</p>
          </div>
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
    
    /* 🆕 Deep Link 主按鈕 */
    .social-btn.primary-telegram {
      background: linear-gradient(135deg, #0088cc, #0066aa);
      border-color: #0088cc;
      font-weight: 600;
    }
    
    .social-btn.primary-telegram:hover {
      background: linear-gradient(135deg, #0099dd, #0077bb);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);
    }
    
    /* 🆕 Widget 備用按鈕 */
    .social-btn.secondary-telegram {
      background: transparent;
      border: 1px solid #0088cc;
      color: #0088cc;
    }
    
    .social-btn.secondary-telegram:hover {
      background: rgba(0, 136, 204, 0.1);
    }
    
    /* 🆕 Deep Link 狀態提示 */
    .deep-link-status {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(0, 136, 204, 0.1);
      border: 1px solid rgba(0, 136, 204, 0.3);
      border-radius: 8px;
      margin: 0.75rem 0;
    }
    
    .deep-link-status .status-text {
      color: #0088cc;
      font-size: 0.875rem;
      text-align: center;
    }
    
    .deep-link-status .countdown {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    .deep-link-status .cancel-btn {
      padding: 0.375rem 1rem;
      background: transparent;
      border: 1px solid #888;
      border-radius: 4px;
      color: #888;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .deep-link-status .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: #fff;
      color: #fff;
    }
    
    .social-login {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
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
    
    /* 🆕 Phase 2: 登入方式選擇器 */
    .telegram-login-section {
      margin-top: 0.5rem;
    }
    
    .login-method-tabs {
      display: flex;
      gap: 0.25rem;
      background: var(--bg-secondary, #1a1a1a);
      padding: 0.25rem;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    .method-tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-secondary, #888);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .method-tab:hover {
      background: var(--bg-tertiary, #252525);
      color: var(--text-primary, #fff);
    }
    
    .method-tab.active {
      background: linear-gradient(135deg, #0088cc, #0066aa);
      color: #fff;
    }
    
    .tab-icon {
      font-size: 1.25rem;
    }
    
    /* QR Code 面板 */
    .qr-login-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      border: 1px solid var(--border-color, #333);
    }
    
    .qr-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      color: var(--text-secondary, #888);
    }
    
    .qr-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      width: 100%;
    }
    
    .qr-code-wrapper {
      position: relative;
      padding: 1rem;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 136, 204, 0.2);
    }
    
    .qr-code-img {
      width: 180px;
      height: 180px;
      display: block;
    }
    
    .qr-expired-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
    
    .expired-text {
      color: #f87171;
      font-size: 0.875rem;
    }
    
    .refresh-btn {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #0088cc, #0066aa);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-size: 0.875rem;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .refresh-btn:hover {
      transform: scale(1.05);
    }
    
    .qr-instructions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }
    
    .qr-instructions .step {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
      margin: 0;
    }
    
    .step-num {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      background: linear-gradient(135deg, #0088cc, #0066aa);
    }

    /* 🆕 驗證碼樣式 */
    .verify-code-section {
      margin-top: 1.25rem;
      padding-top: 1.25rem;
      border-top: 1px dashed var(--border-color, #333);
      text-align: center;
    }

    .verify-hint {
      font-size: 0.8rem;
      color: var(--text-muted, #666);
      margin-bottom: 0.75rem;
    }

    .verify-code {
      font-family: 'Courier New', monospace;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(139, 92, 246, 0.15));
      border: 2px solid rgba(14, 165, 233, 0.3);
      border-radius: 12px;
      color: #0ea5e9;
      display: inline-block;
      border-radius: 50%;
      color: #fff;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .qr-countdown {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0;
      border-top: 1px solid var(--border-color, #333);
      margin-top: 0.5rem;
    }
    
    .ws-status {
      font-size: 0.75rem;
      color: #f87171;
    }
    
    .ws-status.connected {
      color: #4ade80;
    }
    
    .countdown-text {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
    }
    
    .generate-qr-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #0088cc, #0066aa);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .generate-qr-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);
    }
    
    .btn-icon {
      font-size: 1.25rem;
    }
    
    /* Deep Link 面板 */
    .deeplink-panel, .widget-panel {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .widget-hint {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
      margin: 0;
    }
    
    /* 🆕 Phase 3: 登入成功動畫 */
    .success-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .success-content {
      text-align: center;
      animation: scaleIn 0.4s ease-out;
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.8); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .success-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
    }
    
    .checkmark {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: block;
      stroke-width: 2;
      stroke: #4ade80;
      stroke-miterlimit: 10;
      animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;
    }
    
    .checkmark-circle {
      stroke-dasharray: 166;
      stroke-dashoffset: 166;
      stroke-width: 2;
      stroke-miterlimit: 10;
      stroke: #4ade80;
      fill: none;
      animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
    }
    
    .checkmark-check {
      transform-origin: 50% 50%;
      stroke-dasharray: 48;
      stroke-dashoffset: 48;
      animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;
    }
    
    @keyframes stroke {
      100% { stroke-dashoffset: 0; }
    }
    
    @keyframes scale {
      0%, 100% { transform: none; }
      50% { transform: scale3d(1.1, 1.1, 1); }
    }
    
    @keyframes fill {
      100% { box-shadow: inset 0px 0px 0px 40px rgba(74, 222, 128, 0.1); }
    }
    
    .success-title {
      color: #4ade80;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
    }
    
    .success-user {
      color: #fff;
      font-size: 1rem;
      margin: 0 0 0.5rem;
    }
    
    .success-hint {
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
      margin: 0;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private security = inject(FrontendSecurityService);
  private ipcService = inject(ElectronIpcService);
  
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
  /** 顯示用錯誤文案：若為 JSON 解析類錯誤則統一顯示網絡錯誤（兜底） */
  displayError = computed(() => {
    const e = this.error();
    if (!e) return null;
    if (/json|unexpected token|not valid json/i.test(e)) return this.i18n.t('auth.networkError');
    return e;
  });
  
  // 🆕 Deep Link 登入狀態
  deepLinkLoading = signal(false);
  deepLinkCountdown = signal(300);  // 5 分鐘倒計時
  private deepLinkToken = '';
  private deepLinkPollInterval: any = null;
  private deepLinkCountdownInterval: any = null;
  
  // 🆕 Phase 2: QR Code + WebSocket 登入狀態
  loginMethod = signal<'qrcode' | 'deeplink' | 'widget'>('qrcode');  // 默認 QR Code
  qrCodeLoading = signal(false);
  qrCodeUrl = signal<string | null>(null);
  qrCodeExpired = signal(false);
  qrCountdown = signal(300);
  wsConnected = signal(false);
  verifyCode = signal<string | null>(null);  // 🆕 6 位驗證碼
  private qrToken = '';
  private qrWebSocket: WebSocket | null = null;
  private qrCountdownInterval: any = null;
  private qrPollInterval: any = null;  // 🆕 驗證碼/掃碼確認的 HTTP 輪詢後備

  // 🆕 Phase 3: 登入成功動畫
  loginSuccess = signal(false);
  successUserName = signal('');
  
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
    
    // 🆕 Phase 3: 優先使用保存的偏好
    const savedPreference = this.loadLoginPreference();
    
    if (savedPreference) {
      // 使用用戶之前的選擇
      this.loginMethod.set(savedPreference);
      if (savedPreference === 'qrcode') {
        this.generateQRCode();
      }
    } else if (this.isMobileDevice()) {
      // 移動端默認使用 Deep Link
      this.loginMethod.set('deeplink');
    } else {
      // 桌面端自動生成 QR Code
      this.generateQRCode();
    }
  }
  
  /**
   * 檢測是否為移動設備
   */
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  ngOnDestroy() {
    // 清理倒計時
    this.lockoutCleanup?.();
    // 清理 Deep Link 輪詢
    this.cancelDeepLink();
    // 清理 QR Code WebSocket
    this.cleanupQRCode();
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

  /** 安全解析 JSON，後端返回 HTML 時返回 null，避免拋出 "Unexpected token" */
  private async parseJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
    const text = await response.text();
    const t = text.trim();
    if (t.startsWith('<') || !t) return null;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private setErrorFromException(e: any, fallback: string): void {
    const msg = e?.message || '';
    const isJsonOrNetwork = /json|unexpected token|not valid json|fetch|network/i.test(msg);
    this.error.set(isJsonOrNetwork ? this.t('auth.networkError') : (msg || fallback));
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
        // 與掃碼登入一致：標記「剛登入」並整頁跳轉，避免首屏 401 被攔截器踢回登入頁（第一用戶也適用）
        try {
          sessionStorage.setItem('tgm_just_logged_in', String(Date.now()));
        } catch (_) {}
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        const url = returnUrl.startsWith('/') ? `${window.location.origin}${returnUrl}` : returnUrl;
        window.location.href = url;
        return;
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
      this.security.recordLoginAttempt(false, this.email);
      this.setErrorFromException(e, this.t('auth.loginFailed'));
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
      // 1. 獲取 Google 配置（經共用工具解析基址，兼容 Electron app:// 協議）
      const response = await fetch(`${resolveApiBaseUrl()}/api/v1/oauth/google/config`);
      const config = await this.parseJsonResponse(response);
      if (!config?.success || !(config?.data as any)?.enabled) {
        this.error.set(this.t('auth.googleNotAvailable'));
        return;
      }
      
      // 2. 打開 Google OAuth 彈窗
      this.openGoogleLoginPopup();
      
    } catch (e: any) {
      console.error('Google login error:', e);
      this.setErrorFromException(e, this.t('auth.googleNotAvailable'));
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
        
        // 🔧 修復：通知 IpcService 更新 Token
        this.ipcService.setAuthToken(authData.access_token);
        
        // 登入成功，重定向
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        window.location.href = returnUrl;
      } else {
        this.error.set('Google 登入失敗：無效的認證數據');
      }
    } catch (e: any) {
      this.setErrorFromException(e, 'Google 登入失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  // ==================== 🆕 Deep Link 登入 ====================
  
  // 🆕 Deep Link WebSocket
  private deepLinkWebSocket: WebSocket | null = null;
  
  /**
   * 打開 Telegram Deep Link 登入
   * 🔧 修復：使用 WebSocket 替代輪詢，確保實時接收登錄確認
   * 流程：生成 Token → 建立 WebSocket → 打開 Telegram App → 用戶確認 → WebSocket 接收通知
   */
  async openDeepLink() {
    this.error.set(null);
    this.deepLinkLoading.set(true);
    this.telegramLoading.set(true);
    
    try {
      // 1. 調用 API 生成登入 Token（經共用工具解析基址，兼容 Electron app:// 協議）
      const response = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/login-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'deep_link' })
      });
      
      const result = await this.parseJsonResponse(response);
      if (!result?.success || !result?.data) {
        this.error.set(result ? String(result.error || '無法生成登入連結') : this.t('auth.networkError'));
        this.deepLinkLoading.set(false);
        this.telegramLoading.set(false);
        return;
      }
      
      const data = result.data as { token?: string; deep_link_url?: string; expires_in?: number };
      const { token, deep_link_url, expires_in } = data;
      this.deepLinkToken = token || '';
      this.deepLinkCountdown.set(expires_in ?? 300);
      
      console.log('[DeepLink] Token generated:', (token || '').substring(0, 8) + '...');
      
      // 2. 🆕 建立 WebSocket 連接（優先使用實時通知）
      this.connectDeepLinkWebSocket(token || '');
      
      // 3. 打開 Telegram Deep Link
      console.log('[DeepLink] Opening:', deep_link_url);
      window.open(deep_link_url || '', '_blank');
      
      // 4. 開始倒計時
      this.deepLinkCountdownInterval = setInterval(() => {
        const current = this.deepLinkCountdown();
        if (current <= 0) {
          this.cancelDeepLink();
          this.error.set('登入超時，請重試');
        } else {
          this.deepLinkCountdown.set(current - 1);
        }
      }, 1000);
      
      // 5. 🆕 備用輪詢（WebSocket 失敗時使用）
      this.startPollingLoginStatus();
      
    } catch (e: any) {
      console.error('[DeepLink] Error:', e);
      this.setErrorFromException(e, '登入失敗');
      this.deepLinkLoading.set(false);
      this.telegramLoading.set(false);
    }
  }
  
  /**
   * 🆕 建立 Deep Link WebSocket 連接
   */
  private connectDeepLinkWebSocket(token: string) {
    // 關閉現有連接
    if (this.deepLinkWebSocket) {
      this.deepLinkWebSocket.close();
    }
    
    // 構建 WebSocket URL（經共用工具解析基址，兼容 Electron app:// 協議）
    const wsUrl = `${resolveWsBaseUrl()}/ws/login-token/${token}`;
    
    console.log('[DeepLink WS] Connecting to:', wsUrl);
    
    try {
      this.deepLinkWebSocket = new WebSocket(wsUrl);
      
      this.deepLinkWebSocket.onopen = () => {
        console.log('[DeepLink WS] ✅ Connected');
      };
      
      this.deepLinkWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[DeepLink WS] Message received:', data);
          
          // 處理登入成功消息
          if (data.type === 'login_success' || data.event === 'login_confirmed') {
            console.log('[DeepLink WS] 🎉 Login confirmed via WebSocket!');
            this.handleLoginSuccess(data.data);
          } else if (data.status === 'confirmed' && data.data?.access_token) {
            console.log('[DeepLink WS] 🎉 Login confirmed (direct)!');
            this.handleLoginSuccess(data.data);
          }
        } catch (e) {
          console.error('[DeepLink WS] Parse error:', e);
        }
      };
      
      this.deepLinkWebSocket.onclose = () => {
        console.log('[DeepLink WS] Disconnected');
      };
      
      this.deepLinkWebSocket.onerror = (error) => {
        console.warn('[DeepLink WS] Error (will fallback to polling):', error);
      };
      
    } catch (e) {
      console.warn('[DeepLink WS] Failed to create WebSocket:', e);
    }
  }
  
  /**
   * 取消 Deep Link 登入
   */
  cancelDeepLink() {
    // 🆕 關閉 WebSocket
    if (this.deepLinkWebSocket) {
      this.deepLinkWebSocket.close();
      this.deepLinkWebSocket = null;
    }
    if (this.deepLinkPollInterval) {
      clearInterval(this.deepLinkPollInterval);
      this.deepLinkPollInterval = null;
    }
    if (this.deepLinkCountdownInterval) {
      clearInterval(this.deepLinkCountdownInterval);
      this.deepLinkCountdownInterval = null;
    }
    this.deepLinkLoading.set(false);
    this.telegramLoading.set(false);
    this.deepLinkToken = '';
  }
  
  /**
   * 輪詢登入狀態（備用方案，WebSocket 失敗時使用）
   */
  private startPollingLoginStatus() {
    if (this.deepLinkPollInterval) {
      clearInterval(this.deepLinkPollInterval);
    }
    
    const pollStatus = async () => {
      if (!this.deepLinkToken) return;
      
      try {
        console.log('[DeepLink Poll] Checking status...');
        const response = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/login-token/${this.deepLinkToken}`);
        const result = await this.parseJsonResponse(response);
        
        console.log('[DeepLink Poll] Response:', result);
        
        if (!result || !result.success) {
          console.warn('[DeepLink Poll] Error:', result.error);
          return;
        }
        
        const { status, access_token, refresh_token, user } = (result.data as Record<string, unknown>) || {};
        
        console.log('[DeepLink Poll] Status:', status, 'Has Token:', !!access_token);
        
        if (status === 'confirmed' && access_token) {
          // 登入成功！
          console.log('[DeepLink Poll] 🎉 Login confirmed via polling!');
          this.handleLoginSuccess({
            access_token,
            refresh_token,
            user
          });
          
        } else if (status === 'expired') {
          this.cancelDeepLink();
          this.error.set('登入連結已過期，請重試');
        }
        // pending 狀態繼續輪詢
        
      } catch (e) {
        console.error('[DeepLink Poll] Error:', e);
      }
    };
    
    // 3 秒後開始輪詢（給 WebSocket 一點時間連接）
    setTimeout(() => {
      if (this.deepLinkToken) {
        pollStatus();
        // 每 2 秒輪詢一次
        this.deepLinkPollInterval = setInterval(pollStatus, 2000);
      }
    }, 3000);
  }
  
  // ==================== 🆕 Phase 2: QR Code + WebSocket 登入 ====================
  
  /**
   * 切換登入方式
   */
  switchLoginMethod(method: 'qrcode' | 'deeplink' | 'widget') {
    // 清理當前方式的資源
    if (this.loginMethod() === 'qrcode' && method !== 'qrcode') {
      this.cleanupQRCode();
    }
    if (this.loginMethod() === 'deeplink' && method !== 'deeplink') {
      this.cancelDeepLink();
    }
    
    this.loginMethod.set(method);
    this.error.set(null);
    
    // 如果切換到 QR Code，自動生成
    if (method === 'qrcode' && !this.qrCodeUrl()) {
      this.generateQRCode();
    }
  }
  
  /**
   * 生成 QR Code
   */
  async generateQRCode() {
    this.qrCodeLoading.set(true);
    this.qrCodeExpired.set(false);
    this.error.set(null);
    
    try {
      // 1. 調用 API 生成登入 Token（經共用工具解析基址，兼容 Electron app:// 協議）
      const response = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/login-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'qr_code' })
      });
      
      const result = await this.parseJsonResponse(response);
      if (!result?.success || !result?.data) {
        this.error.set(result ? String(result.error || '無法生成二維碼') : this.t('auth.networkError'));
        this.qrCodeLoading.set(false);
        return;
      }
      
      const data = result.data as { token?: string; deep_link_url?: string; expires_in?: number; qr_image?: string; qr_fallback_url?: string; verify_code?: string };
      const { token, deep_link_url, expires_in, qr_image, qr_fallback_url, verify_code } = data;
      this.qrToken = token || '';
      this.qrCountdown.set(expires_in ?? 300);
      
      // 🆕 保存驗證碼（老用戶備用）
      this.verifyCode.set(verify_code || null);
      
      // 優先使用後端生成的 QR Code
      const qrDataUrl = (qr_image || qr_fallback_url || this.generateQRCodeImage(deep_link_url || '')) as string;
      this.qrCodeUrl.set(qrDataUrl);
      
      // 3. 建立 WebSocket 連接
      this.connectWebSocket(token || '');
      
      // 🆕 4. 啟動 HTTP 輪詢後備（驗證碼輸入後即使 WebSocket 未收到也能拿到 token）
      this.startQRCodePolling(token || '');
      
      // 5. 開始倒計時
      this.startQRCountdown();
      
    } catch (e: any) {
      console.error('[QRCode] Error:', e);
      this.setErrorFromException(e, '生成二維碼失敗');
    } finally {
      this.qrCodeLoading.set(false);
    }
  }
  
  /**
   * 生成 QR Code 圖片 URL
   * 使用 Google Chart API（簡單可靠）
   */
  private generateQRCodeImage(data: string): string {
    // 方案1: Google Chart API（需要網絡）
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&bgcolor=ffffff&color=000000&margin=10`;
    
    // 備選方案: 本地生成（需要 qrcode 庫）
    // 如果需要離線支持，可以使用 qrcode.js
  }
  
  /**
   * 刷新 QR Code
   */
  refreshQRCode() {
    this.cleanupQRCode();
    this.generateQRCode();
  }
  
  /**
   * 清理 QR Code 資源
   */
  private cleanupQRCode() {
    // 關閉 WebSocket
    if (this.qrWebSocket) {
      this.qrWebSocket.close();
      this.qrWebSocket = null;
    }
    
    // 清理輪詢
    if (this.qrPollInterval) {
      clearInterval(this.qrPollInterval);
      this.qrPollInterval = null;
    }
    
    // 清理倒計時
    if (this.qrCountdownInterval) {
      clearInterval(this.qrCountdownInterval);
      this.qrCountdownInterval = null;
    }
    
    // 重置狀態
    this.qrToken = '';
    this.qrCodeUrl.set(null);
    this.qrCodeExpired.set(false);
    this.wsConnected.set(false);
  }

  /**
   * 🆕 QR 碼/驗證碼登入的 HTTP 輪詢後備
   * 用戶在 Bot 輸入驗證碼或掃碼確認後，即使 WebSocket 未推送也能拿到 JWT 並進入後台
   */
  private startQRCodePolling(token: string) {
    if (this.qrPollInterval) {
      clearInterval(this.qrPollInterval);
    }
    // 🔧 原用 window.location.origin，在 Electron app:// 協議下會拼出 app://... 導致請求失敗
    const base = resolveApiBaseUrl();
    const poll = async () => {
      if (this.qrCodeExpired()) return;
      try {
        const res = await fetch(`${base}/api/v1/auth/login-token/${token}`);
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status >= 500 && !this.error()) {
            this.error.set(result?.error || '服務暫時不可用，請稍後重試');
          }
          return;
        }
        if (!result?.success || !result.data) return;
        const { status, access_token, refresh_token, user } = result.data;
        if (status === 'confirmed' && access_token) {
          if (this.qrPollInterval) {
            clearInterval(this.qrPollInterval);
            this.qrPollInterval = null;
          }
          this.handleLoginSuccess({ access_token, refresh_token, user });
        } else if (status === 'expired') {
          if (this.qrPollInterval) {
            clearInterval(this.qrPollInterval);
            this.qrPollInterval = null;
          }
        }
      } catch (_e) {
        // 忽略單次輪詢錯誤
      }
    };
    this.qrPollInterval = setInterval(poll, 2000);
    poll(); // 立即執行一次
  }
  
  /**
   * 開始 QR Code 倒計時
   */
  private startQRCountdown() {
    if (this.qrCountdownInterval) {
      clearInterval(this.qrCountdownInterval);
    }
    
    this.qrCountdownInterval = setInterval(() => {
      const current = this.qrCountdown();
      if (current <= 0) {
        this.qrCodeExpired.set(true);
        clearInterval(this.qrCountdownInterval);
        this.qrCountdownInterval = null;
      } else {
        this.qrCountdown.set(current - 1);
      }
    }, 1000);
  }
  
  /**
   * 建立 WebSocket 連接
   */
  private connectWebSocket(token: string) {
    // 關閉現有連接
    if (this.qrWebSocket) {
      this.qrWebSocket.close();
    }
    
    // 構建 WebSocket URL（經共用工具解析基址，兼容 Electron app:// 協議）
    const wsUrl = `${resolveWsBaseUrl()}/ws/login-token/${token}`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    
    try {
      this.qrWebSocket = new WebSocket(wsUrl);
      
      this.qrWebSocket.onopen = () => {
        console.log('[WebSocket] Connected');
        this.wsConnected.set(true);
      };
      
      this.qrWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message:', data);
          
          // 處理不同類型的消息
          if (data.type === 'login_success' || data.event === 'login_confirmed') {
            // 登入成功！
            this.handleLoginSuccess(data.data);
          } else if (data.type === 'login_token_update') {
            // Token 狀態更新
            if (data.status === 'confirmed') {
              // 狀態已確認，發送 check_status 獲取完整數據
              this.qrWebSocket?.send(JSON.stringify({ type: 'check_status' }));
            }
          } else if (data.status === 'confirmed' && data.data?.access_token) {
            // 直接包含 token 的確認消息
            this.handleLoginSuccess(data.data);
          }
        } catch (e) {
          console.error('[WebSocket] Parse error:', e);
        }
      };
      
      this.qrWebSocket.onclose = () => {
        console.log('[WebSocket] Disconnected');
        this.wsConnected.set(false);
        
        // 如果未過期且未成功，嘗試重連
        if (!this.qrCodeExpired() && this.qrToken) {
          setTimeout(() => {
            if (this.qrToken && !this.qrCodeExpired()) {
              console.log('[WebSocket] Reconnecting...');
              this.connectWebSocket(this.qrToken);
            }
          }, 3000);
        }
      };
      
      this.qrWebSocket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.wsConnected.set(false);
      };
      
      // 設置心跳
      const heartbeat = setInterval(() => {
        if (this.qrWebSocket?.readyState === WebSocket.OPEN) {
          this.qrWebSocket.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(heartbeat);
        }
      }, 15000);
      
    } catch (e) {
      console.error('[WebSocket] Create error:', e);
      this.wsConnected.set(false);
    }
  }
  
  /**
   * 處理登入成功
   * 
   * 🆕 Phase 3: 添加成功動畫
   */
  private handleLoginSuccess(data: any) {
    console.log('[Login] Success - Full data:', JSON.stringify(data));
    console.log('[Login] access_token exists:', !!data?.access_token);
    
    if (!data?.access_token) {
      console.error('[Login] ❌ No access_token in data!');
      this.error.set('登入失敗：未收到認證令牌');
      return;
    }
    
    // 清理資源
    this.cleanupQRCode();
    this.cancelDeepLink();
    
    // 🆕 使用 AuthService 設置會話（確保狀態同步）
    this.authService.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      session_id: data.session_id
    });
    
    // 🔧 修復：通知 IpcService 重新連接帶認證的 WebSocket
    this.ipcService.setAuthToken(data.access_token);
    
    console.log('[Login] ✅ Session set via AuthService');
    console.log('[Login] isAuthenticated:', this.authService.isAuthenticated());
    
    // 🆕 Phase 3: 顯示成功動畫
    this.successUserName.set(data?.user?.display_name || data?.user?.username || 'User');
    this.loginSuccess.set(true);
    
    // 記住登入方式偏好
    this.saveLoginPreference();
    
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    console.log('[Login] Will redirect to:', returnUrl, 'in 1.5 seconds');
    // 🔧 第二用戶載入前台時避免被 401 立即踢回登入頁：標記「剛登入」，攔截器在短時間內不因 401 清除會話
    try {
      sessionStorage.setItem('tgm_just_logged_in', String(Date.now()));
    } catch (_) {}
    // 🔧 掃碼/驗證碼登入後使用整頁跳轉，確保前端重新載入並讀取 localStorage 的 token
    setTimeout(() => {
      const url = returnUrl.startsWith('/') ? `${window.location.origin}${returnUrl}` : returnUrl;
      window.location.href = url;
    }, 1500);  // 1.5 秒後跳轉
  }
  
  /**
   * 🆕 Phase 3: 保存登入方式偏好
   */
  private saveLoginPreference() {
    try {
      localStorage.setItem('tgm_login_method', this.loginMethod());
    } catch (e) {
      console.debug('Could not save login preference');
    }
  }
  
  /**
   * 🆕 Phase 3: 讀取登入方式偏好
   */
  private loadLoginPreference(): 'qrcode' | 'deeplink' | 'widget' | null {
    try {
      const saved = localStorage.getItem('tgm_login_method');
      if (saved === 'qrcode' || saved === 'deeplink' || saved === 'widget') {
        return saved;
      }
    } catch (e) {
      console.debug('Could not load login preference');
    }
    return null;
  }
  
  // ==================== Telegram Widget 登入 ====================
  
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
      
      if (!config.enabled || !config.bot_id) {
        this.error.set(this.t('auth.telegramNotConfigured'));
        return;
      }
      
      this.telegramBotUsername = config.bot_username || '';
      this.telegramBotId = config.bot_id;
      
      // 2. 定義全局回調函數
      (window as any).onTelegramAuth = (user: any) => {
        console.log('Telegram auth callback:', user);
        this.handleTelegramAuth(user);
      };
      
      // 🆕 優先嘗試 Widget（支持一鍵登入），失敗則回退到 OAuth
      try {
        await this.loadTelegramWidget();
      } catch (widgetError) {
        console.warn('Widget failed, falling back to OAuth:', widgetError);
        this.openTelegramOAuth();
      }
      
    } catch (e: any) {
      console.error('Telegram login error:', e);
      this.setErrorFromException(e, 'Telegram 登入失敗');
    } finally {
      this.telegramLoading.set(false);
    }
  }
  
  /**
   * 🆕 載入 Telegram Login Widget（支持一鍵登入）
   */
  private loadTelegramWidget(): Promise<void> {
    return new Promise((resolve, reject) => {
      // 創建彈窗容器
      const popup = window.open('', 'telegram-widget', 'width=550,height=470,scrollbars=yes');
      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }
      
      // 寫入 Widget HTML
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Telegram 登入</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              flex-direction: column;
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #0f172a, #1e293b);
              color: white;
            }
            h2 { margin-bottom: 30px; }
            #telegram-login { min-height: 50px; }
            .hint { color: #94a3b8; font-size: 14px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <h2>使用 Telegram 登入</h2>
          <div id="telegram-login"></div>
          <p class="hint">如果您已在瀏覽器登入 Telegram，將顯示一鍵登入按鈕</p>
          <script>
            window.onTelegramAuth = function(user) {
              window.opener.onTelegramAuth(user);
              window.close();
            };
          </script>
          <script async src="https://telegram.org/js/telegram-widget.js?22"
            data-telegram-login="${this.telegramBotUsername}"
            data-size="large"
            data-radius="8"
            data-onauth="onTelegramAuth(user)"
            data-request-access="write">
          </script>
        </body>
        </html>
      `);
      popup.document.close();
      
      // 監聽彈窗關閉
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 500);
      
      // 5秒超時
      setTimeout(() => {
        clearInterval(checkClosed);
        resolve();
      }, 30000);
    });
  }
  
  /**
   * 🔧 改用 OAuth URL 重定向方式（更可靠）
   * 不依賴外部腳本加載，直接跳轉到 Telegram 授權頁面
   */
  private openTelegramOAuth(): void {
    // 構建回調 URL
    const callbackUrl = `${window.location.origin}/auth/telegram-callback`;
    
    // 構建 Telegram OAuth URL
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${this.telegramBotId}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`;
    
    console.log('Opening Telegram OAuth:', authUrl);
    
    // 在新窗口打開（避免離開當前頁面）
    const width = 550;
    const height = 470;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'telegram-oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );
    
    // 監聽授權結果
    if (popup) {
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            // 用戶關閉了彈窗
            this.telegramLoading.set(false);
          }
        } catch (e) {
          // 跨域錯誤，忽略
        }
      }, 500);
    }
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
        this.setErrorFromException(e, this.t('auth.telegramLoginFailed'));
    } finally {
      this.telegramLoading.set(false);
    }
  }
}
