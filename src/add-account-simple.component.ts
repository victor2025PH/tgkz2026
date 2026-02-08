/**
 * 添加帳戶頁面組件（簡化版）
 * 
 * 設計原則：
 * - 用戶無需了解 API 概念
 * - 像登錄微信一樣簡單：手機號 → 驗證碼 → 完成
 * - 進階選項隱藏在底部
 * 
 * 三種登入方式：
 * 1. 手機號登入（推薦）- 自動使用平台 API 池
 * 2. TData 導入（最安全）
 * 3. 進階模式 - 使用自己的 API（折疊隱藏）
 */

import { Component, signal, inject, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { MembershipService } from './membership.service';
import { AuthService } from './core/auth.service';

type LoginMethod = 'phone' | 'tdata' | 'advanced';
type Step = 1 | 2;  // 簡化為 2 步：登入 → 完成

@Component({
  selector: 'app-add-account-simple',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="add-account-page">
      <!-- 頂部導航 -->
      <div class="page-header">
        <button (click)="goBack()" class="back-btn">← 返回</button>
        <h1 class="page-title">添加 Telegram 帳號</h1>
      </div>

      <!-- 步驟指示器（簡化版） -->
      <div class="step-indicator">
        <div class="step" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
          <span class="step-number">1</span>
          <span class="step-label">登入帳號</span>
        </div>
        <div class="step-line" [class.active]="currentStep() > 1"></div>
        <div class="step" [class.active]="currentStep() === 2">
          <span class="step-number">2</span>
          <span class="step-label">完成</span>
        </div>
      </div>

      <!-- Step 1: 選擇登入方式 -->
      @if (currentStep() === 1 && !activeMethod()) {
        <div class="login-options">
          <!-- 手機號登入 - 主推 -->
          <div class="login-option primary" (click)="startPhoneLogin()">
            <div class="option-badge">推薦</div>
            <div class="option-icon">📱</div>
            <div class="option-content">
              <h3>手機號登入</h3>
              <p>輸入手機號和驗證碼，30秒完成</p>
            </div>
            <div class="option-arrow">→</div>
          </div>

          <!-- TData 導入 -->
          <div class="login-option secondary" (click)="startTdataImport()">
            <div class="option-badge safe">最安全</div>
            <div class="option-icon">📂</div>
            <div class="option-content">
              <h3>導入已有帳號</h3>
              <p>從 Telegram Desktop 導入，無需重新登入</p>
            </div>
            <div class="option-arrow">→</div>
          </div>

          <!-- 進階選項（折疊） -->
          <div class="advanced-section">
            <button class="advanced-toggle" (click)="showAdvanced.set(!showAdvanced())">
              🔧 進階選項
              <span class="toggle-icon">{{ showAdvanced() ? '▲' : '▼' }}</span>
            </button>
            
            @if (showAdvanced()) {
              <div class="advanced-options">
                <div class="login-option tertiary" (click)="startAdvancedMode()">
                  <div class="option-icon">🔑</div>
                  <div class="option-content">
                    <h3>使用自己的 API</h3>
                    <p>適合技術用戶或大批量帳號</p>
                  </div>
                  <div class="option-arrow">→</div>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- 手機號登入流程 -->
      @if (currentStep() === 1 && activeMethod() === 'phone') {
        <div class="login-form">
          <div class="form-header">
            <button (click)="activeMethod.set(null)" class="back-link">← 返回選擇</button>
            <h2>📱 手機號登入</h2>
          </div>

          <div class="form-card">
            @if (!codeStep()) {
              <!-- 輸入手機號 -->
              <div class="form-group">
                <label>手機號碼</label>
                <input 
                  type="tel" 
                  [ngModel]="phoneNumber"
                  (ngModelChange)="onPhoneChange($event)"
                  placeholder="+86 138 xxxx xxxx"
                  class="form-input large"
                  [class.error]="phoneError()"
                  [class.valid]="phoneValid()">
                @if (phoneError()) {
                  <span class="error-hint">{{ phoneError() }}</span>
                } @else {
                  <span class="input-hint">請輸入完整手機號，包含國家代碼（如 +86、+1）</span>
                }
              </div>

              <!-- 代理設置（簡化） -->
              <div class="form-group">
                <label>網絡設置</label>
                <div class="proxy-simple">
                  <label class="radio-option" [class.selected]="proxyMode === 'auto'">
                    <input type="radio" name="proxy" value="auto" [(ngModel)]="proxyMode">
                    <span class="radio-label">
                      <strong>🌐 自動（推薦）</strong>
                      <small>系統自動分配最佳網絡</small>
                    </span>
                  </label>
                  <label class="radio-option" [class.selected]="proxyMode === 'none'">
                    <input type="radio" name="proxy" value="none" [(ngModel)]="proxyMode">
                    <span class="radio-label">
                      <strong>🔌 直連</strong>
                      <small>不使用代理</small>
                    </span>
                  </label>
                </div>
              </div>

              <button 
                (click)="sendVerificationCode()" 
                [disabled]="!phoneValid() || isSending()"
                class="btn-primary full-width">
                @if (isSending()) {
                  <span class="spinner"></span> 發送中...
                } @else {
                  發送驗證碼
                }
              </button>
            } @else {
              <!-- 輸入驗證碼 -->
              <div class="code-sent-banner">
                <span class="banner-icon">✅</span>
                <span>驗證碼已發送至 <strong>{{ phoneNumber }}</strong></span>
              </div>

              <div class="form-group">
                <label>驗證碼</label>
                <input 
                  type="text" 
                  [(ngModel)]="verificationCode"
                  placeholder="請輸入驗證碼"
                  class="form-input large code-input"
                  maxlength="6"
                  autofocus>
                <span class="input-hint">驗證碼已發送到您的 Telegram App</span>
              </div>

              @if (needs2FA()) {
                <div class="form-group">
                  <label>二步驗證密碼</label>
                  <input 
                    type="password" 
                    [(ngModel)]="twoFactorPassword"
                    placeholder="請輸入二步驗證密碼"
                    class="form-input">
                </div>
              }

              <div class="resend-row">
                @if (resendCooldown() > 0) {
                  <span class="resend-countdown">{{ resendCooldown() }}秒後可重發</span>
                } @else {
                  <button (click)="resendCode()" class="resend-btn">重新發送驗證碼</button>
                }
              </div>

              <div class="form-actions-row">
                <button (click)="codeStep.set(false)" class="btn-secondary">返回</button>
                <button 
                  (click)="submitVerificationCode()" 
                  [disabled]="!verificationCode || isVerifying()"
                  class="btn-primary">
                  @if (isVerifying()) {
                    <span class="spinner"></span> 驗證中...
                  } @else {
                    確認登入
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- TData 導入流程 -->
      @if (currentStep() === 1 && activeMethod() === 'tdata') {
        <div class="login-form">
          <div class="form-header">
            <button (click)="activeMethod.set(null)" class="back-link">← 返回選擇</button>
            <h2>📂 導入已有帳號</h2>
          </div>

          <div class="form-card">
            <!-- TData 路徑提示 -->
            <div class="tdata-hint">
              <h4>📍 TData 文件位置</h4>
              <code>{{ getDefaultTdataPath() }}</code>
              <div class="hint-actions">
                <button (click)="copyTdataPath()" class="hint-btn">📋 複製</button>
                <button (click)="openTdataFolder()" class="hint-btn">📂 打開</button>
              </div>
            </div>

            <!-- 拖放區域 -->
            <div 
              class="drop-zone"
              [class.dragging]="isDragging()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDropTdata($event)">
              <div class="drop-icon">📁</div>
              <p class="drop-text">拖放 tdata 文件夾到這裡</p>
              <p class="drop-hint">或點擊下方按鈕選擇</p>
              <div class="drop-buttons">
                <button (click)="selectTdataFolder()" class="select-btn">選擇文件夾</button>
                <button (click)="selectTdataZip()" class="select-btn outline">選擇 ZIP</button>
              </div>
            </div>

            <!-- 掃描結果 -->
            @if (tdataScanResult()) {
              @if (tdataScanResult()!.success && tdataScanResult()!.accounts?.length) {
                <div class="scan-result success">
                  <h4>📋 找到 {{ tdataScanResult()!.accounts!.length }} 個帳號</h4>
                  <div class="accounts-list">
                    @for (account of tdataScanResult()!.accounts || []; track account.index) {
                      <label class="account-checkbox" [class.disabled]="!account.can_import">
                        <input 
                          type="checkbox" 
                          [checked]="selectedTdataAccounts().includes(account.index)"
                          [disabled]="!account.can_import"
                          (change)="toggleTdataAccount(account.index)">
                        <span class="account-info">
                          <strong>{{ account.phone }}</strong>
                          @if (account.first_name) {
                            <span class="account-name">{{ account.first_name }}</span>
                          }
                        </span>
                      </label>
                    }
                  </div>
                  
                  <button 
                    (click)="importTdataAccounts()" 
                    [disabled]="selectedTdataAccounts().length === 0 || isImporting()"
                    class="btn-primary full-width">
                    @if (isImporting()) {
                      <span class="spinner"></span> 導入中...
                    } @else {
                      導入 {{ selectedTdataAccounts().length }} 個帳號
                    }
                  </button>
                </div>
              } @else {
                <div class="scan-result error">
                  ❌ {{ tdataScanResult()!.error || '未找到有效帳號' }}
                </div>
              }
            }

            @if (isScanningTdata()) {
              <div class="scanning">
                <span class="spinner"></span> 正在掃描...
              </div>
            }
          </div>
        </div>
      }

      <!-- 進階模式（使用自己的 API） -->
      @if (currentStep() === 1 && activeMethod() === 'advanced') {
        <div class="login-form">
          <div class="form-header">
            <button (click)="activeMethod.set(null)" class="back-link">← 返回選擇</button>
            <h2>🔑 使用自己的 API</h2>
          </div>

          <div class="form-card">
            <div class="api-guide">
              <p>請先在 <a href="https://my.telegram.org" target="_blank">my.telegram.org</a> 申請 API 憑據</p>
              <p class="advanced-link">需要更多功能？<a (click)="goToAdvancedPage()" class="link-btn">切換到專業版 →</a></p>
            </div>

            <div class="form-group">
              <label>API ID</label>
              <input 
                type="text" 
                [(ngModel)]="customApiId"
                placeholder="例如：12345678"
                class="form-input">
            </div>

            <div class="form-group">
              <label>API Hash</label>
              <input 
                type="text" 
                [(ngModel)]="customApiHash"
                placeholder="例如：a1b2c3d4e5f6..."
                class="form-input">
            </div>

            <div class="form-group">
              <label>手機號碼</label>
              <input 
                type="tel" 
                [ngModel]="phoneNumber"
                (ngModelChange)="onPhoneChange($event)"
                placeholder="+86 138 xxxx xxxx"
                class="form-input"
                [class.error]="phoneError()">
            </div>

            <button 
              (click)="sendVerificationCodeWithCustomApi()" 
              [disabled]="!isAdvancedFormValid() || isSending()"
              class="btn-primary full-width">
              @if (isSending()) {
                <span class="spinner"></span> 發送中...
              } @else {
                發送驗證碼
              }
            </button>
          </div>
        </div>
      }

      <!-- Step 2: 完成 -->
      @if (currentStep() === 2) {
        <div class="success-section">
          <div class="success-animation">✅</div>
          <h2>帳號添加成功！</h2>
          
          @if (addedAccountInfo()) {
            <div class="account-card">
              <div class="account-avatar">
                {{ getAvatarLetter() }}
              </div>
              <div class="account-details">
                @if (addedAccountInfo().firstName || addedAccountInfo().lastName) {
                  <div class="account-name">
                    {{ addedAccountInfo().firstName || '' }} {{ addedAccountInfo().lastName || '' }}
                  </div>
                }
                <div class="account-phone">{{ addedAccountInfo().phone }}</div>
                @if (addedAccountInfo().username) {
                  <div class="account-username">@{{ addedAccountInfo().username }}</div>
                }
              </div>
            </div>
          }

          <div class="success-actions">
            <button (click)="addAnother()" class="btn-secondary">➕ 繼續添加</button>
            <button (click)="goBack()" class="btn-primary">返回帳戶列表</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .add-account-page {
      max-width: 600px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    /* Header */
    .page-header {
      margin-bottom: 1.5rem;
    }

    .back-btn {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0;
      margin-bottom: 0.5rem;
    }

    .page-title {
      margin: 0;
      font-size: 1.75rem;
      color: var(--text-primary, white);
    }

    /* Step Indicator */
    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      gap: 0.5rem;
    }

    .step {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-muted, #94a3b8);
    }

    .step.active .step-number {
      background: var(--primary, #06b6d4);
      color: white;
    }

    .step.completed .step-number {
      background: #22c55e;
      color: white;
    }

    .step-label {
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
    }

    .step.active .step-label {
      color: var(--text-primary, white);
    }

    .step-line {
      width: 60px;
      height: 2px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
    }

    .step-line.active {
      background: var(--primary, #06b6d4);
    }

    /* Login Options */
    .login-options {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .login-option {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 2px solid transparent;
      border-radius: 1rem;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .login-option:hover {
      transform: translateX(4px);
      border-color: var(--primary, #06b6d4);
    }

    .login-option.primary {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.1));
      border-color: rgba(6, 182, 212, 0.3);
    }

    .login-option.primary:hover {
      border-color: var(--primary, #06b6d4);
      box-shadow: 0 4px 20px rgba(6, 182, 212, 0.2);
    }

    .option-badge {
      position: absolute;
      top: -8px;
      right: 1rem;
      padding: 0.2rem 0.6rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-radius: 0.75rem;
      font-size: 0.7rem;
      font-weight: 600;
      color: white;
    }

    .option-badge.safe {
      background: linear-gradient(135deg, #22c55e, #16a34a);
    }

    .option-icon {
      font-size: 2rem;
      width: 50px;
      text-align: center;
    }

    .option-content {
      flex: 1;
    }

    .option-content h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1.125rem;
      color: var(--text-primary, white);
    }

    .option-content p {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .option-arrow {
      font-size: 1.25rem;
      color: var(--text-muted, #64748b);
    }

    /* Advanced Section */
    .advanced-section {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .advanced-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.75rem;
      background: transparent;
      border: none;
      color: var(--text-muted, #64748b);
      font-size: 0.8rem;
      cursor: pointer;
    }

    .advanced-toggle:hover {
      color: var(--text-secondary, #94a3b8);
    }

    .toggle-icon {
      font-size: 0.6rem;
    }

    .advanced-options {
      margin-top: 0.75rem;
    }

    .login-option.tertiary {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px dashed var(--border-default, rgba(148, 163, 184, 0.2));
    }

    /* Form */
    .login-form {
      max-width: 500px;
      margin: 0 auto;
    }

    .form-header {
      margin-bottom: 1.5rem;
    }

    .back-link {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0;
      margin-bottom: 0.5rem;
    }

    .form-header h2 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--text-primary, white);
    }

    .form-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .form-input {
      width: 100%;
      padding: 0.875rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-size: 1rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary, #06b6d4);
    }

    .form-input.large {
      font-size: 1.125rem;
      padding: 1rem 1.25rem;
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .form-input.valid {
      border-color: #22c55e;
    }

    .form-input.code-input {
      text-align: center;
      font-size: 1.5rem;
      letter-spacing: 0.5rem;
    }

    .input-hint {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
    }

    .error-hint {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: #ef4444;
    }

    /* Proxy Simple */
    .proxy-simple {
      display: flex;
      gap: 0.75rem;
    }

    .radio-option {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 2px solid transparent;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .radio-option:hover {
      border-color: var(--border-default, rgba(148, 163, 184, 0.3));
    }

    .radio-option.selected {
      border-color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.1);
    }

    .radio-option input {
      display: none;
    }

    .radio-label {
      display: flex;
      flex-direction: column;
    }

    .radio-label strong {
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .radio-label small {
      font-size: 0.7rem;
      color: var(--text-muted, #64748b);
    }

    /* Buttons */
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary.full-width {
      width: 100%;
    }

    .btn-secondary {
      padding: 0.875rem 1.5rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.5rem;
      color: var(--text-secondary, #cbd5e1);
      font-size: 1rem;
      cursor: pointer;
    }

    /* Code Sent Banner */
    .code-sent-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(34, 197, 94, 0.15);
      border-radius: 0.5rem;
      margin-bottom: 1.25rem;
      color: #86efac;
      font-size: 0.875rem;
    }

    .resend-row {
      text-align: center;
      margin: 1rem 0;
    }

    .resend-countdown {
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }

    .resend-btn {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      cursor: pointer;
      font-size: 0.875rem;
    }

    .form-actions-row {
      display: flex;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .form-actions-row .btn-secondary {
      flex: 1;
    }

    .form-actions-row .btn-primary {
      flex: 2;
    }

    /* TData */
    .tdata-hint {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .tdata-hint h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .tdata-hint code {
      display: block;
      font-size: 0.75rem;
      color: var(--primary, #06b6d4);
      word-break: break-all;
      margin-bottom: 0.5rem;
    }

    .hint-actions {
      display: flex;
      gap: 0.5rem;
    }

    .hint-btn {
      padding: 0.25rem 0.5rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: none;
      border-radius: 0.25rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.7rem;
      cursor: pointer;
    }

    .drop-zone {
      border: 2px dashed var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.75rem;
      padding: 2rem;
      text-align: center;
      transition: all 0.2s;
    }

    .drop-zone:hover,
    .drop-zone.dragging {
      border-color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.05);
    }

    .drop-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }

    .drop-text {
      margin: 0;
      color: var(--text-primary, white);
    }

    .drop-hint {
      margin: 0.5rem 0 1rem 0;
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }

    .drop-buttons {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }

    .select-btn {
      padding: 0.5rem 1rem;
      background: var(--primary, #06b6d4);
      border: none;
      border-radius: 0.375rem;
      color: white;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .select-btn.outline {
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.3));
      color: var(--text-secondary, #94a3b8);
    }

    .scan-result {
      margin-top: 1rem;
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .scan-result.success {
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.2);
    }

    .scan-result.error {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .scan-result h4 {
      margin: 0 0 0.75rem 0;
      color: var(--text-primary, white);
    }

    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .account-checkbox {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .account-checkbox.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .account-info strong {
      color: var(--text-primary, white);
    }

    .account-name {
      margin-left: 0.5rem;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
    }

    .scanning {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      color: var(--text-muted, #94a3b8);
    }

    /* API Guide */
    .api-guide {
      padding: 0.75rem;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.8rem;
      color: #fcd34d;
    }

    .api-guide a {
      color: #06b6d4;
    }

    .api-guide .advanced-link {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .api-guide .link-btn {
      color: #8b5cf6;
      cursor: pointer;
      transition: color 0.2s;
    }

    .api-guide .link-btn:hover {
      color: #a78bfa;
      text-decoration: underline;
    }

    /* Success */
    .success-section {
      text-align: center;
      padding: 2rem 1rem;
    }

    .success-animation {
      font-size: 4rem;
      margin-bottom: 1rem;
      animation: success-pop 0.5s ease-out;
    }

    @keyframes success-pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .success-section h2 {
      margin: 0 0 1.5rem 0;
      color: var(--text-primary, white);
    }

    .account-card {
      display: inline-flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 2rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      margin-bottom: 1.5rem;
    }

    .account-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
    }

    .account-details {
      text-align: left;
    }

    .account-name {
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .account-phone {
      color: var(--text-secondary, #cbd5e1);
    }

    .account-username {
      font-size: 0.875rem;
      color: var(--primary, #06b6d4);
    }

    .success-actions {
      display: flex;
      justify-content: center;
      gap: 0.75rem;
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

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class AddAccountSimpleComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private membershipService = inject(MembershipService);
  private authService = inject(AuthService);

  @Output() back = new EventEmitter<void>();
  @Output() accountAdded = new EventEmitter<any>();
  @Output() switchToAdvanced = new EventEmitter<void>();

  // 狀態
  currentStep = signal<Step>(1);
  activeMethod = signal<LoginMethod | null>(null);
  showAdvanced = signal(false);

  // 手機號登入
  phoneNumber = '';
  verificationCode = '';
  twoFactorPassword = '';
  proxyMode = 'auto';
  codeStep = signal(false);
  isSending = signal(false);
  isVerifying = signal(false);
  needs2FA = signal(false);
  resendCooldown = signal(0);
  phoneError = signal('');
  phoneValid = signal(false);

  // 進階模式
  customApiId = '';
  customApiHash = '';

  // TData 導入
  isDragging = signal(false);
  isScanningTdata = signal(false);
  isImporting = signal(false);
  tdataScanResult = signal<any>(null);
  selectedTdataAccounts = signal<number[]>([]);

  // 結果
  addedAccountInfo = signal<any>(null);

  // 內部
  private phoneCodeHash = '';
  private resendTimer: any = null;
  private sendTimeout: any = null;
  private verifyTimeout: any = null;
  private ipcChannels: string[] = [];

  ngOnInit(): void {
    this.setupIpcListeners();
  }

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
    if (this.sendTimeout) clearTimeout(this.sendTimeout);
    if (this.verifyTimeout) clearTimeout(this.verifyTimeout);
    this.ipcChannels.forEach(ch => this.ipcService.cleanup(ch));
  }

  private setupIpcListeners(): void {
    // 需要驗證碼
    this.ipcService.on('login-requires-code', (result: any) => {
      this.isSending.set(false);
      if (this.sendTimeout) {
        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;
      }
      if (result.phone === this.phoneNumber || result.accountId) {
        this.phoneCodeHash = result.phoneCodeHash;
        this.codeStep.set(true);
        this.startResendCooldown();
        this.toast.success('驗證碼已發送');
      }
    });
    this.ipcChannels.push('login-requires-code');

    // 登入成功
    this.ipcService.on('login-success', (result: any) => {
      this.isVerifying.set(false);
      if (this.verifyTimeout) {
        clearTimeout(this.verifyTimeout);
        this.verifyTimeout = null;
      }
      this.addedAccountInfo.set(result.userInfo || { phone: this.phoneNumber });
      this.currentStep.set(2);
      this.accountAdded.emit(result);
      this.toast.success('登入成功！');
    });
    this.ipcChannels.push('login-success');

    // 需要 2FA
    this.ipcService.on('login-requires-2fa', () => {
      this.isVerifying.set(false);
      if (this.verifyTimeout) {
        clearTimeout(this.verifyTimeout);
        this.verifyTimeout = null;
      }
      this.needs2FA.set(true);
      this.toast.info('請輸入二步驗證密碼');
    });
    this.ipcChannels.push('login-requires-2fa');

    // 登入錯誤
    this.ipcService.on('login-error', (result: any) => {
      this.handleLoginError(result);
    });
    this.ipcChannels.push('login-error');

    this.ipcService.on('account-login-error', (result: any) => {
      this.handleLoginError(result);
    });
    this.ipcChannels.push('account-login-error');

    // 🔧 P0 修復：監聽 account-added 事件中的配額錯誤
    this.ipcService.on('account-added', (result: any) => {
      if (result && !result.success && result.code === 'QUOTA_EXCEEDED') {
        this.handleLoginError(result);
      }
    });
    this.ipcChannels.push('account-added');

    // 🔧 修復：監聽 account-validation-error 事件（重複帳號等驗證錯誤）
    this.ipcService.on('account-validation-error', (result: any) => {
      this.isSending.set(false);
      if (this.sendTimeout) {
        clearTimeout(this.sendTimeout);
        this.sendTimeout = null;
      }
      const errors = result.errors || [];
      const errorMsg = errors.length > 0 ? errors[0] : '帳號驗證失敗';
      this.toast.error(errorMsg);
    });
    this.ipcChannels.push('account-validation-error');

    // TData 掃描結果
    this.ipcService.on('tdata-scan-result', (result: any) => {
      this.isScanningTdata.set(false);
      this.tdataScanResult.set(result);
      if (result.success && result.accounts?.length > 0) {
        const importableIndices = result.accounts
          .filter((a: any) => a.can_import)
          .map((a: any) => a.index);
        this.selectedTdataAccounts.set(importableIndices);
        this.toast.success(`找到 ${result.accounts.length} 個帳號`);
      }
    });
    this.ipcChannels.push('tdata-scan-result');

    // TData 導入結果
    this.ipcService.on('tdata-import-result', (result: any) => {
      this.isImporting.set(false);
      if (result.success) {
        this.addedAccountInfo.set({
          phone: result.phone,
          firstName: result.first_name,
          lastName: result.last_name,
          username: result.username
        });
        this.currentStep.set(2);
        this.accountAdded.emit(result);
        this.toast.success('導入成功！');
      } else {
        this.toast.error(result.error || '導入失敗');
      }
    });
    this.ipcChannels.push('tdata-import-result');

    // TData 批量導入
    this.ipcService.on('tdata-batch-result', (result: any) => {
      this.isImporting.set(false);
      if (result.success_count > 0) {
        this.addedAccountInfo.set({
          batch: true,
          count: result.success_count
        });
        this.currentStep.set(2);
        this.toast.success(`成功導入 ${result.success_count} 個帳號`);
      } else {
        this.toast.error('導入失敗');
      }
    });
    this.ipcChannels.push('tdata-batch-result');

    // 文件夾選擇
    this.ipcService.on('tdata-folder-selected', (result: any) => {
      if (result.path) {
        this.scanTdata(result.path);
      }
    });
    this.ipcChannels.push('tdata-folder-selected');

    this.ipcService.on('tdata-zip-selected', (result: any) => {
      if (result.path) {
        this.scanTdata(result.path);
      }
    });
    this.ipcChannels.push('tdata-zip-selected');
  }

  // ========== 方法 ==========

  goBack(): void {
    this.back.emit();
  }

  startPhoneLogin(): void {
    this.activeMethod.set('phone');
  }

  startTdataImport(): void {
    this.activeMethod.set('tdata');
  }

  startAdvancedMode(): void {
    this.activeMethod.set('advanced');
  }

  goToAdvancedPage(): void {
    this.switchToAdvanced.emit();
  }

  // 手機號驗證
  onPhoneChange(value: string): void {
    this.phoneNumber = value;
    const result = this.validatePhone(value);
    this.phoneValid.set(result.valid);
    this.phoneError.set(result.error);
  }

  private validatePhone(phone: string): { valid: boolean; error: string } {
    if (!phone) return { valid: false, error: '' };
    const trimmed = phone.trim();
    if (!trimmed.startsWith('+')) {
      return { valid: false, error: '請以 + 開頭，例如 +86' };
    }
    const numbersOnly = trimmed.slice(1);
    if (!/^\d+$/.test(numbersOnly)) {
      return { valid: false, error: '號碼只能包含數字' };
    }
    if (numbersOnly.length < 8) {
      return { valid: false, error: '號碼長度不足' };
    }
    return { valid: true, error: '' };
  }

  // 發送驗證碼（使用平台 API 池）
  sendVerificationCode(): void {
    if (!this.phoneValid()) return;

    this.isSending.set(true);
    this.phoneError.set('');

    // 🔧 P0 修復：傳遞 ownerUserId 確保配額檢查能正確識別用戶
    const currentUser = this.authService.user();
    const ownerUserId = currentUser?.id ? String(currentUser.id) : undefined;

    // 🆕 使用平台 API 池 - 後端會自動分配 API
    this.ipcService.send('add-account', {
      phone: this.phoneNumber,
      proxy: this.proxyMode === 'auto' ? 'auto' : null,
      usePlatformApi: true,  // 🆕 標記使用平台 API
      ownerUserId  // 🔧 P0: 確保配額檢查能找到正確用戶
    });

    setTimeout(() => {
      this.ipcService.send('login-account', {
        phone: this.phoneNumber,
        proxy: this.proxyMode === 'auto' ? 'auto' : null,
        usePlatformApi: true,
        ownerUserId
      });
    }, 500);

    // 超時保護
    this.sendTimeout = setTimeout(() => {
      if (this.isSending()) {
        this.isSending.set(false);
        this.toast.error('請求超時，請重試');
      }
    }, 30000);
  }

  // 發送驗證碼（使用自定義 API）
  sendVerificationCodeWithCustomApi(): void {
    if (!this.isAdvancedFormValid()) return;

    this.isSending.set(true);

    // 🔧 P0 修復：傳遞 ownerUserId
    const currentUser = this.authService.user();
    const ownerUserId = currentUser?.id ? String(currentUser.id) : undefined;

    this.ipcService.send('add-account', {
      phone: this.phoneNumber,
      apiId: this.customApiId,
      apiHash: this.customApiHash,
      proxy: this.proxyMode === 'auto' ? 'auto' : null,
      ownerUserId
    });

    setTimeout(() => {
      this.ipcService.send('login-account', {
        phone: this.phoneNumber,
        apiId: this.customApiId,
        apiHash: this.customApiHash,
        proxy: this.proxyMode === 'auto' ? 'auto' : null,
        ownerUserId
      });
    }, 500);

    this.sendTimeout = setTimeout(() => {
      if (this.isSending()) {
        this.isSending.set(false);
        this.toast.error('請求超時，請重試');
      }
    }, 30000);
  }

  submitVerificationCode(): void {
    if (!this.verificationCode) return;
    if (this.needs2FA() && !this.twoFactorPassword) {
      this.toast.error('請輸入二步驗證密碼');
      return;
    }

    this.isVerifying.set(true);

    this.ipcService.send('login-account', {
      phone: this.phoneNumber,
      phoneCode: this.verificationCode,
      phoneCodeHash: this.phoneCodeHash,
      twoFactorPassword: this.twoFactorPassword || null,
      usePlatformApi: this.activeMethod() !== 'advanced',
      apiId: this.customApiId || undefined,
      apiHash: this.customApiHash || undefined
    });

    this.verifyTimeout = setTimeout(() => {
      if (this.isVerifying()) {
        this.isVerifying.set(false);
        this.toast.error('驗證超時，請重試');
      }
    }, 30000);
  }

  resendCode(): void {
    this.sendVerificationCode();
  }

  isAdvancedFormValid(): boolean {
    return this.phoneValid() && 
           !!this.customApiId && 
           /^\d+$/.test(this.customApiId) &&
           !!this.customApiHash && 
           /^[a-f0-9]{32}$/i.test(this.customApiHash);
  }

  private handleLoginError(result: any): void {
    this.isSending.set(false);
    this.isVerifying.set(false);
    if (this.sendTimeout) {
      clearTimeout(this.sendTimeout);
      this.sendTimeout = null;
    }
    if (this.verifyTimeout) {
      clearTimeout(this.verifyTimeout);
      this.verifyTimeout = null;
    }

    // 🔧 P0/P1 修復：配額錯誤提供詳細且友好的提示
    if (result.code === 'QUOTA_EXCEEDED') {
      const detail = result.detail || result.quota || {};
      const limit = detail.limit || '?';
      const used = detail.used || '?';
      const errorMessage = `帳號數量已達上限（${used}/${limit}）。升級會員可添加更多帳號。`;
      this.toast.error(errorMessage);
      return;
    }

    const errorMessage = result.friendlyMessage || result.error || '登入失敗';
    this.toast.error(errorMessage);
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(60);
    this.resendTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        clearInterval(this.resendTimer);
        this.resendCooldown.set(0);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  // TData
  getDefaultTdataPath(): string {
    const isWin = navigator.userAgent.includes('Windows');
    const isMac = navigator.userAgent.includes('Mac');
    if (isWin) {
      return '%APPDATA%\\Telegram Desktop\\tdata';
    } else if (isMac) {
      return '~/Library/Application Support/Telegram Desktop/tdata';
    }
    return '~/.local/share/TelegramDesktop/tdata';
  }

  copyTdataPath(): void {
    navigator.clipboard.writeText(this.getDefaultTdataPath());
    this.toast.success('路徑已複製');
  }

  openTdataFolder(): void {
    this.ipcService.send('open-default-tdata-folder', {});
  }

  selectTdataFolder(): void {
    this.ipcService.send('select-tdata-folder', {});
  }

  selectTdataZip(): void {
    this.ipcService.send('select-tdata-zip', {});
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDropTdata(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // @ts-ignore
      const path = files[0].path;
      if (path) {
        this.scanTdata(path);
      }
    }
  }

  private scanTdata(path: string): void {
    this.isScanningTdata.set(true);
    this.tdataScanResult.set(null);
    this.selectedTdataAccounts.set([]);
    this.ipcService.send('scan-tdata', { path });
  }

  toggleTdataAccount(index: number): void {
    this.selectedTdataAccounts.update(current => {
      if (current.includes(index)) {
        return current.filter(i => i !== index);
      }
      return [...current, index];
    });
  }

  importTdataAccounts(): void {
    const scanResult = this.tdataScanResult();
    if (!scanResult?.tdata_path) return;

    const indices = this.selectedTdataAccounts();
    if (indices.length === 0) return;

    this.isImporting.set(true);

    // 🔧 P0 修復：TData 導入也傳遞 ownerUserId
    const currentUser = this.authService.user();
    const ownerUserId = currentUser?.id ? String(currentUser.id) : undefined;

    if (indices.length === 1) {
      this.ipcService.send('import-tdata-account', {
        tdataPath: scanResult.tdata_path,
        accountIndex: indices[0],
        usePlatformApi: true,
        ownerUserId
      });
    } else {
      this.ipcService.send('import-tdata-batch', {
        tdataPath: scanResult.tdata_path,
        accountIndices: indices,
        usePlatformApi: true,
        ownerUserId
      });
    }
  }

  // 成功
  getAvatarLetter(): string {
    const info = this.addedAccountInfo();
    if (!info) return '?';
    if (info.firstName) return info.firstName.charAt(0).toUpperCase();
    if (info.phone) return info.phone.charAt(1) || '?';
    return '?';
  }

  addAnother(): void {
    this.currentStep.set(1);
    this.activeMethod.set(null);
    this.resetForm();
  }

  private resetForm(): void {
    this.phoneNumber = '';
    this.verificationCode = '';
    this.twoFactorPassword = '';
    this.customApiId = '';
    this.customApiHash = '';
    this.proxyMode = 'auto';
    this.phoneCodeHash = '';
    this.codeStep.set(false);
    this.needs2FA.set(false);
    this.tdataScanResult.set(null);
    this.selectedTdataAccounts.set([]);
    this.addedAccountInfo.set(null);
  }
}
