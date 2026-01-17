/**
 * QR 掃碼登入組件
 * 支持掃碼快速登入 Telegram 帳號
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { I18nService } from './i18n.service';
import { ApiSelectorComponent, SelectedApi } from './api-selector.component';

interface QRLoginSession {
  sessionId: string;
  qrUrl: string;
  qrImageBase64: string;
  expiresAt: number;
  expiresIn: number;
  status: 'pending' | 'scanned' | 'waiting_2fa' | 'success' | 'expired' | 'error';
  message?: string;
  deviceInfo?: {
    model: string;
    system: string;
    platform: string;
  };
  phone?: string;
  userInfo?: {
    id: number;
    phone: string;
    firstName: string;
    lastName?: string;
    username?: string;
  };
}

type DeviceType = 'random' | 'ios' | 'android' | 'desktop';

@Component({
  selector: 'app-qr-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiSelectorComponent],
  template: `
    <div class="qr-login-container">
      <!-- 標題 -->
      <div class="header">
        <h3 class="title">
          <span class="icon">📱</span>
          掃碼快速登入
        </h3>
        <button (click)="onClose()" class="close-btn">×</button>
      </div>
      
      <!-- 主要內容區 -->
      <div class="content">
        @if (!session()) {
          <!-- 初始狀態：顯示配置選項 -->
          <div class="setup-section">
            <div class="info-box">
              <p>使用 Telegram App 掃描二維碼，快速添加帳號。</p>
            </div>
            
            <!-- API 選擇器 -->
            <div class="option-group">
              <label class="option-label">🔐 選擇 API 憑據</label>
              <app-api-selector 
                [showSelected]="false"
                (apiSelected)="onApiSelected($event)"
                (selectionCleared)="onApiCleared()">
              </app-api-selector>
            </div>
            
            <!-- 設備類型選擇 -->
            <div class="option-group">
              <label class="option-label">📲 設備模擬</label>
              <div class="device-options">
                <button 
                  (click)="deviceType.set('random')"
                  [class.active]="deviceType() === 'random'"
                  class="device-btn">
                  🎲 智能隨機
                </button>
                <button 
                  (click)="deviceType.set('ios')"
                  [class.active]="deviceType() === 'ios'"
                  class="device-btn">
                  📱 iOS
                </button>
                <button 
                  (click)="deviceType.set('android')"
                  [class.active]="deviceType() === 'android'"
                  class="device-btn">
                  🤖 Android
                </button>
                <button 
                  (click)="deviceType.set('desktop')"
                  [class.active]="deviceType() === 'desktop'"
                  class="device-btn">
                  💻 Desktop
                </button>
              </div>
            </div>
            
            <!-- 代理設置 -->
            <div class="option-group">
              <label class="option-label">🌐 代理設置（可選）</label>
              <div class="proxy-input-group">
                <input 
                  type="text" 
                  [(ngModel)]="proxyInput"
                  placeholder="socks5://host:port 或留空使用直連"
                  class="proxy-input">
                <button (click)="selectRandomProxy()" class="random-proxy-btn" title="隨機選擇代理">
                  🎲
                </button>
              </div>
              <div class="checkbox-option">
                <input type="checkbox" [(ngModel)]="bindProxyToAccount" id="bindProxy">
                <label for="bindProxy">為此帳號綁定此代理 IP（推薦）</label>
              </div>
            </div>
            
            <!-- 二步驗證密碼（預設） -->
            <div class="option-group">
              <label class="option-label">🔐 二步驗證密碼（如有）</label>
              <input 
                type="password" 
                [(ngModel)]="twoFactorPassword"
                placeholder="可選，如果帳號開啟了二步驗證"
                class="form-input">
            </div>
            
            <!-- 生成按鈕 -->
            <button 
              (click)="createQRLogin()" 
              [disabled]="isCreating() || !selectedApi()"
              class="create-btn">
              @if (isCreating()) {
                <span class="spinner"></span> 生成中...
              } @else {
                📷 生成二維碼
              }
            </button>
          </div>
        } @else {
          <!-- QR 碼顯示區 -->
          <div class="qr-section">
            @switch (session()!.status) {
              @case ('pending') {
                <div class="qr-display">
                  @if (session()!.qrImageBase64) {
                    <img 
                      [src]="'data:image/png;base64,' + session()!.qrImageBase64" 
                      alt="QR Code"
                      class="qr-image">
                  } @else {
                    <div class="qr-placeholder">
                      <span class="spinner large"></span>
                    </div>
                  }
                </div>
                
                <div class="qr-info">
                  <div class="countdown" [class.warning]="countdown() <= 10">
                    ⏱️ 有效期：{{ countdown() }} 秒
                  </div>
                  <p class="instruction">
                    1. 打開 Telegram App<br>
                    2. 設置 → 設備 → 掃描二維碼<br>
                    3. 掃描上方二維碼並確認登入
                  </p>
                </div>
                
                <div class="device-info">
                  <span class="label">模擬設備:</span>
                  <span class="value">{{ session()!.deviceInfo?.model }} ({{ session()!.deviceInfo?.system }})</span>
                </div>
              }
              
              @case ('waiting_2fa') {
                <div class="tfa-section">
                  <div class="status-icon warning">🔐</div>
                  <h4>需要二步驗證</h4>
                  <p>請輸入您的二步驗證密碼：</p>
                  
                  <input 
                    type="password" 
                    [(ngModel)]="twoFactorInput"
                    placeholder="二步驗證密碼"
                    class="form-input tfa-input"
                    (keyup.enter)="submit2FA()">
                  
                  <button 
                    (click)="submit2FA()" 
                    [disabled]="!twoFactorInput || isSubmitting2FA()"
                    class="submit-btn">
                    @if (isSubmitting2FA()) {
                      <span class="spinner"></span> 驗證中...
                    } @else {
                      確認
                    }
                  </button>
                </div>
              }
              
              @case ('success') {
                <div class="success-section">
                  <div class="status-icon success">✅</div>
                  <h4>登入成功！</h4>
                  
                  @if (session()!.userInfo) {
                    <div class="user-info-card">
                      <div class="user-avatar">
                        {{ (session()!.userInfo!.firstName || '?').charAt(0).toUpperCase() }}
                      </div>
                      <div class="user-details">
                        <div class="user-name">
                          {{ session()!.userInfo!.firstName }}
                          @if (session()!.userInfo!.lastName) {
                            {{ session()!.userInfo!.lastName }}
                          }
                        </div>
                        <div class="user-phone">{{ session()!.phone }}</div>
                        @if (session()!.userInfo!.username) {
                          <div class="user-username">{{ '@' + session()!.userInfo!.username }}</div>
                        }
                      </div>
                    </div>
                  }
                  
                  <p class="success-message">帳號已成功添加，正在後台升級為原生 API...</p>
                  
                  <button (click)="onClose()" class="done-btn">完成</button>
                </div>
              }
              
              @case ('expired') {
                <div class="error-section">
                  <div class="status-icon warning">⏰</div>
                  <h4>二維碼已過期</h4>
                  <p>請點擊下方按鈕重新生成。</p>
                  <button (click)="refreshQR()" class="refresh-btn">🔄 重新生成</button>
                </div>
              }
              
              @case ('error') {
                <div class="error-section">
                  <div class="status-icon error">❌</div>
                  <h4>登入失敗</h4>
                  <p>{{ session()!.message || '未知錯誤' }}</p>
                  <button (click)="refreshQR()" class="refresh-btn">🔄 重試</button>
                </div>
              }
            }
          </div>
          
          <!-- 底部操作按鈕 -->
          @if (session()!.status === 'pending') {
            <div class="action-buttons">
              <button (click)="refreshQR()" class="action-btn secondary">
                🔄 刷新二維碼
              </button>
              <button (click)="cancelLogin()" class="action-btn cancel">
                ❌ 取消
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .qr-login-container {
      background: var(--bg-card, rgba(30, 41, 59, 0.95));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 1rem;
      width: 420px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }
    
    .title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text-primary, white);
    }
    
    .icon {
      font-size: 1.25rem;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 1;
    }
    
    .close-btn:hover {
      color: var(--text-primary, white);
    }
    
    .content {
      padding: 1.5rem;
    }
    
    /* Setup Section */
    .setup-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .info-box {
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 0.5rem;
      padding: 1rem;
    }
    
    .info-box p {
      margin: 0;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.875rem;
    }
    
    .info-box .hint {
      color: var(--text-muted, #94a3b8);
      font-size: 0.75rem;
      margin-top: 0.5rem;
    }
    
    .option-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .option-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .device-options {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }
    
    .device-btn {
      padding: 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary, #94a3b8);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .device-btn:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--text-primary, white);
    }
    
    .device-btn.active {
      background: rgba(6, 182, 212, 0.2);
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }
    
    .proxy-input-group {
      display: flex;
      gap: 0.5rem;
    }
    
    .proxy-input {
      flex: 1;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }
    
    .proxy-input:focus {
      outline: none;
      border-color: var(--primary, #06b6d4);
    }
    
    .random-proxy-btn {
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .random-proxy-btn:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }
    
    .checkbox-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    
    .checkbox-option input {
      accent-color: var(--primary, #06b6d4);
    }
    
    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }
    
    .form-input:focus {
      outline: none;
      border-color: var(--primary, #06b6d4);
    }
    
    .create-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }
    
    .create-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }
    
    .create-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* QR Section */
    .qr-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    
    .qr-display {
      padding: 1rem;
      background: white;
      border-radius: 0.75rem;
    }
    
    .qr-image {
      width: 200px;
      height: 200px;
      display: block;
    }
    
    .qr-placeholder {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
    }
    
    .qr-info {
      text-align: center;
    }
    
    .countdown {
      font-size: 1rem;
      font-weight: 600;
      color: var(--primary, #06b6d4);
      margin-bottom: 0.5rem;
    }
    
    .countdown.warning {
      color: #f59e0b;
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .instruction {
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
      line-height: 1.6;
      margin: 0;
    }
    
    .device-info {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
    }
    
    .device-info .label {
      margin-right: 0.5rem;
    }
    
    /* Status Sections */
    .tfa-section, .success-section, .error-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 1rem;
      padding: 1rem;
    }
    
    .status-icon {
      font-size: 3rem;
    }
    
    .status-icon.success { color: #22c55e; }
    .status-icon.warning { color: #f59e0b; }
    .status-icon.error { color: #ef4444; }
    
    .tfa-section h4, .success-section h4, .error-section h4 {
      margin: 0;
      color: var(--text-primary, white);
    }
    
    .tfa-section p, .success-section p, .error-section p {
      margin: 0;
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
    }
    
    .tfa-input {
      max-width: 250px;
      text-align: center;
    }
    
    .submit-btn, .done-btn, .refresh-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1.5rem;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
    }
    
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .refresh-btn {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
    }
    
    /* User Info Card */
    .user-info-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
      width: 100%;
    }
    
    .user-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: bold;
      color: white;
    }
    
    .user-details {
      text-align: left;
    }
    
    .user-name {
      font-weight: 600;
      color: var(--text-primary, white);
    }
    
    .user-phone {
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .user-username {
      font-size: 0.75rem;
      color: var(--primary, #06b6d4);
    }
    
    .success-message {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
    }
    
    /* Action Buttons */
    .action-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
      width: 100%;
    }
    
    .action-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn.secondary {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      color: var(--text-secondary, #cbd5e1);
    }
    
    .action-btn.secondary:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }
    
    .action-btn.cancel {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }
    
    .action-btn.cancel:hover {
      background: rgba(239, 68, 68, 0.2);
    }
    
    /* Spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .spinner.large {
      width: 40px;
      height: 40px;
      border-width: 3px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* Warning Box */
    .warning-box {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 0.75rem;
      overflow: hidden;
    }
    
    .warning-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(239, 68, 68, 0.2);
      border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .warning-icon {
      font-size: 1.25rem;
    }
    
    .warning-title {
      flex: 1;
      font-weight: 600;
      color: #fca5a5;
    }
    
    .dismiss-btn {
      background: none;
      border: none;
      color: #fca5a5;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    
    .warning-content {
      padding: 0.75rem 1rem;
    }
    
    .warning-content p {
      margin: 0 0 0.5rem 0;
      color: #fecaca;
      font-size: 0.8rem;
    }
    
    .warning-content ul {
      margin: 0.5rem 0;
      padding-left: 1.25rem;
      color: #fca5a5;
      font-size: 0.75rem;
    }
    
    .warning-content li {
      margin-bottom: 0.25rem;
    }
    
    .warning-action {
      margin-top: 0.75rem !important;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .warning-action a {
      color: #60a5fa;
      text-decoration: underline;
    }
    
    /* API Section */
    .api-section {
      background: rgba(6, 182, 212, 0.05);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }
    
    .option-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .checkbox-option.inline {
      font-size: 0.75rem;
    }
    
    .api-inputs {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .api-input-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .input-label {
      width: 70px;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    
    .api-input-row .form-input {
      flex: 1;
    }
    
    .api-hint {
      margin: 0;
      font-size: 0.7rem;
      color: var(--text-muted, #64748b);
    }
    
    .api-hint a {
      color: var(--primary, #06b6d4);
    }
    
    .public-api-warning {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 0.25rem;
      font-size: 0.75rem;
      color: #fca5a5;
    }
    
    .warning-badge {
      background: rgba(239, 68, 68, 0.3);
      padding: 0.125rem 0.375rem;
      border-radius: 0.25rem;
      font-size: 0.65rem;
      font-weight: 600;
    }
  `]
})
export class QrLoginComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  
  @Output() closed = new EventEmitter<void>();
  @Output() loginSuccess = new EventEmitter<any>();
  
  // 狀態
  session = signal<QRLoginSession | null>(null);
  isCreating = signal(false);
  isSubmitting2FA = signal(false);
  countdown = signal(60);
  
  // 配置輸入
  deviceType = signal<DeviceType>('random');
  proxyInput = '';
  twoFactorPassword = '';
  twoFactorInput = '';
  bindProxyToAccount = true;
  
  // 選擇的 API
  selectedApi = signal<SelectedApi | null>(null);
  
  // 計時器
  private countdownTimer: any = null;
  private statusCheckTimer: any = null;
  private createTimeout: any = null;  // QR 創建超時計時器
  
  // IPC 事件清理 - 存儲頻道名稱列表
  private ipcChannels: string[] = [];
  
  ngOnInit(): void {
    this.setupIpcListeners();
  }

  // API 選擇回調
  onApiSelected(api: SelectedApi): void {
    this.selectedApi.set(api);
  }

  onApiCleared(): void {
    this.selectedApi.set(null);
  }
  
  ngOnDestroy(): void {
    this.clearTimers();
    
    // 清除創建超時
    if (this.createTimeout) {
      clearTimeout(this.createTimeout);
      this.createTimeout = null;
    }
    
    // 移除所有 IPC 監聽器
    this.ipcChannels.forEach(channel => {
      this.ipcService.cleanup(channel);
    });
    this.ipcChannels = [];
  }
  
  private setupIpcListeners(): void {
    // QR 登入創建成功
    this.ipcService.on('qr-login-created', (result: any) => {
      // 清除超時計時器
      if (this.createTimeout) {
        clearTimeout(this.createTimeout);
        this.createTimeout = null;
      }
      
      this.isCreating.set(false);
      console.log('[QR Login] QR code created successfully', result);
      
      if (result.success !== false) {
        this.session.set({
          sessionId: result.sessionId,
          qrUrl: result.qrUrl,
          qrImageBase64: result.qrImageBase64,
          expiresAt: result.expiresAt,
          expiresIn: result.expiresIn,
          status: 'pending',
          deviceInfo: result.deviceInfo,
          message: result.message
        });
        this.startCountdown(result.expiresIn || 60);
      }
    });
    this.ipcChannels.push('qr-login-created');
    
    // QR 登入狀態更新
    this.ipcService.on('qr-login-status', (data: any) => {
      const currentSession = this.session();
      if (currentSession && data.sessionId === currentSession.sessionId) {
        this.session.set({
          ...currentSession,
          status: data.status,
          message: data.message
        });
      }
    });
    this.ipcChannels.push('qr-login-status');
    
    // QR 登入成功
    this.ipcService.on('qr-login-success', (data: any) => {
      this.clearTimers();
      const currentSession = this.session();
      if (currentSession) {
        this.session.set({
          ...currentSession,
          status: 'success',
          phone: data.phone,
          userInfo: data.userInfo,
          message: data.message
        });
      }
      this.toast.success(data.message || '登入成功！');
      this.loginSuccess.emit(data);
    });
    this.ipcChannels.push('qr-login-success');
    
    // QR 碼刷新
    this.ipcService.on('qr-login-refreshed', (result: any) => {
      const currentSession = this.session();
      if (currentSession && result.success !== false) {
        this.session.set({
          ...currentSession,
          qrUrl: result.qrUrl,
          qrImageBase64: result.qrImageBase64,
          expiresAt: result.expiresAt,
          status: 'pending'
        });
        this.startCountdown(result.expiresIn || 60);
      }
    });
    this.ipcChannels.push('qr-login-refreshed');
    
    // 錯誤處理
    this.ipcService.on('qr-login-error', (data: any) => {
      // 清除超時計時器
      if (this.createTimeout) {
        clearTimeout(this.createTimeout);
        this.createTimeout = null;
      }
      
      this.isCreating.set(false);
      this.isSubmitting2FA.set(false);
      
      console.error('[QR Login] Error:', data.error);
      
      const currentSession = this.session();
      if (currentSession) {
        this.session.set({
          ...currentSession,
          status: 'error',
          message: data.error
        });
      }
      
      this.toast.error(data.error || '操作失敗');
    });
    this.ipcChannels.push('qr-login-error');
    
    // 2FA 成功
    this.ipcService.on('qr-login-2fa-success', (data: any) => {
      this.isSubmitting2FA.set(false);
      // 等待最終的 success 事件
    });
    this.ipcChannels.push('qr-login-2fa-success');
  }
  
  createQRLogin(): void {
    const api = this.selectedApi();
    if (!api) {
      this.toast.error('請先選擇 API 憑據');
      return;
    }
    
    // 清除之前的超時
    if (this.createTimeout) {
      clearTimeout(this.createTimeout);
      this.createTimeout = null;
    }
    
    this.isCreating.set(true);
    
    const payload = {
      proxy: this.proxyInput || null,
      deviceType: this.deviceType() === 'random' ? null : this.deviceType(),
      twoFactorPassword: this.twoFactorPassword || null,
      bindProxy: this.bindProxyToAccount,
      customApiId: api.api_id,
      customApiHash: api.api_hash
    };
    
    console.log('[QR Login] Creating QR login...', {
      ...payload,
      customApiHash: '***'  // 隱藏敏感信息
    });
    
    // 設置超時處理（60秒）
    this.createTimeout = setTimeout(() => {
      if (this.isCreating()) {
        console.error('[QR Login] Timeout waiting for QR code generation (60s)');
        this.isCreating.set(false);
        this.toast.error('生成二維碼超時（60秒），請檢查：\n1. 後端日誌是否有錯誤\n2. 網絡連接是否正常\n3. 代理設置是否正確\n4. 是否已安裝 telethon 和 qrcode 庫');
        this.createTimeout = null;
      }
    }, 60000);
    
    this.ipcService.send('qr-login-create', payload);
  }
  
  refreshQR(): void {
    const currentSession = this.session();
    if (currentSession) {
      this.ipcService.send('qr-login-refresh', {
        sessionId: currentSession.sessionId
      });
    } else {
      // 如果沒有會話，創建新的
      this.createQRLogin();
    }
  }
  
  submit2FA(): void {
    const currentSession = this.session();
    if (!currentSession || !this.twoFactorInput) return;
    
    this.isSubmitting2FA.set(true);
    this.ipcService.send('qr-login-submit-2fa', {
      sessionId: currentSession.sessionId,
      password: this.twoFactorInput
    });
  }
  
  cancelLogin(): void {
    const currentSession = this.session();
    if (currentSession) {
      this.ipcService.send('qr-login-cancel', {
        sessionId: currentSession.sessionId
      });
    }
    this.clearTimers();
    this.session.set(null);
  }
  
  onClose(): void {
    this.cancelLogin();
    this.closed.emit();
  }
  
  selectRandomProxy(): void {
    // TODO: 從代理池中隨機選擇一個代理
    this.toast.info('代理池功能即將推出');
  }
  
  private startCountdown(seconds: number): void {
    this.clearTimers();
    this.countdown.set(seconds);
    
    this.countdownTimer = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        this.clearTimers();
        const currentSession = this.session();
        if (currentSession && currentSession.status === 'pending') {
          this.session.set({
            ...currentSession,
            status: 'expired',
            message: '二維碼已過期'
          });
        }
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }
  
  private clearTimers(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }
}
