/**
 * 添加帳戶頁面組件（重構版）
 * 
 * 兩種 API 使用模式：
 * 1. 專家模式（自建 API）：用戶填入自己申請的 API ID/Hash
 * 2. 平台 API 池：使用平台提供的 API，按會員配額分配
 * 
 * 三種登入方式：
 * 1. 驗證碼登入（推薦）
 * 2. TData 導入（最安全）
 * 3. 掃碼登入（需謹慎）
 */

import { Component, signal, computed, inject, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { MembershipService } from './membership.service';
import { ApiSelectorComponent, SelectedApi } from './api-selector.component';

type LoginMethod = 'select' | 'code' | 'tdata' | 'qr';
type Step = 1 | 2 | 3;

interface PlatformApiInfo {
  available: boolean;
  usedApis: number;
  totalApis: number;
  usedAccounts: number;
  totalAccounts: number;
  canAddMore: boolean;
  remainingSlots: number;
}

@Component({
  selector: 'app-add-account-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ApiSelectorComponent],
  template: `
    <div class="add-account-page">
      <!-- 頂部導航 -->
      <div class="page-header">
        <button (click)="goBack()" class="back-btn">
          ← 返回帳戶列表
        </button>
        <h1 class="page-title">➕ 添加新帳戶</h1>
      </div>

      <!-- 步驟指示器 -->
      <div class="step-indicator">
        <div class="step" [class.active]="currentStep() >= 1" [class.completed]="currentStep() > 1">
          <span class="step-number">1</span>
          <span class="step-label">選擇 API</span>
        </div>
        <div class="step-line" [class.active]="currentStep() > 1"></div>
        <div class="step" [class.active]="currentStep() >= 2" [class.completed]="currentStep() > 2">
          <span class="step-number">2</span>
          <span class="step-label">登入帳號</span>
        </div>
        <div class="step-line" [class.active]="currentStep() > 2"></div>
        <div class="step" [class.active]="currentStep() >= 3">
          <span class="step-number">3</span>
          <span class="step-label">完成</span>
        </div>
      </div>

      <!-- Step 1: 選擇 API -->
      @if (currentStep() === 1) {
        <div class="config-section">
          <div class="section-header">
            <h2>🔐 選擇 API 憑據</h2>
            <p>選擇或添加 API 憑據以連接 Telegram</p>
          </div>

          <app-api-selector 
            [showSelected]="true"
            (apiSelected)="onApiSelected($event)"
            (selectionCleared)="onApiCleared()">
          </app-api-selector>

          <div class="form-actions">
            <button (click)="goBack()" class="btn-secondary">← 返回</button>
            <button 
              (click)="proceedToLogin()" 
              [disabled]="!selectedApiCredential()"
              class="btn-primary">
              下一步：選擇登入方式 →
            </button>
          </div>
        </div>
      }

      <!-- Step 2: 選擇登入方式 -->
      @if (currentStep() === 2 && currentLoginMethod() === 'select') {
        <div class="login-selection">
          <div class="section-header">
            <h2>選擇登入方式</h2>
            <p>選擇最適合您的帳號登入方式</p>
          </div>

          <div class="login-cards">
            <!-- 驗證碼登入 -->
            <div class="login-card recommended" (click)="selectLoginMethod('code')">
              <div class="login-badge">✅ 推薦</div>
              <div class="login-icon">💬</div>
              <h3>驗證碼登入</h3>
              <p>輸入手機號，接收驗證碼完成登入</p>
              <ul>
                <li>🟢 標準官方登入方式</li>
                <li>🟢 風險最低</li>
                <li>🟡 需要能收到驗證碼</li>
              </ul>
              <div class="login-risk low">風險：低</div>
            </div>

            <!-- TData 導入 -->
            <div class="login-card safe" (click)="selectLoginMethod('tdata')">
              <div class="login-badge">🛡️ 最安全</div>
              <div class="login-icon">📂</div>
              <h3>TData 導入</h3>
              <p>導入已有的 Session 文件</p>
              <ul>
                <li>🟢 無需重新登入</li>
                <li>🟢 風險最低</li>
                <li>🟢 支持批量導入</li>
              </ul>
              <div class="login-risk lowest">風險：最低</div>
            </div>

            <!-- 掃碼登入 -->
            <div class="login-card warning" (click)="selectLoginMethod('qr')">
              <div class="login-badge">⚠️ 需謹慎</div>
              <div class="login-icon">📱</div>
              <h3>掃碼登入</h3>
              <p>使用 Telegram APP 掃描二維碼</p>
              <ul>
                <li>🟢 無需驗證碼</li>
                <li>🟡 需要手機在旁</li>
                <li>🔴 第三方特徵，風險較高</li>
              </ul>
              <div class="login-risk high">風險：較高</div>
            </div>
          </div>

          <div class="form-actions">
            <button (click)="currentStep.set(1)" class="btn-secondary">← 返回</button>
          </div>
        </div>
      }

      <!-- Step 2: 驗證碼登入流程 -->
      @if (currentStep() === 2 && currentLoginMethod() === 'code') {
        <div class="login-form">
          <div class="section-header">
            <h2>💬 驗證碼登入</h2>
          </div>

          <div class="form-card">
            @if (!codeStep()) {
              <!-- 輸入手機號 -->
              <div class="form-group">
                <label>手機號碼 <span class="required">*</span></label>
                <input 
                  type="tel" 
                  [(ngModel)]="phoneNumber"
                  placeholder="+639952947692"
                  class="form-input">
                <span class="hint">請包含國家代碼，例如 +63, +86, +1</span>
              </div>

              <div class="form-group">
                <label>代理設置（可選）</label>
                <input 
                  type="text" 
                  [(ngModel)]="proxyAddress"
                  placeholder="socks5://host:port 或留空"
                  class="form-input">
              </div>

              <div class="form-group">
                <label>二步驗證密碼（如有）</label>
                <input 
                  type="password" 
                  [(ngModel)]="twoFactorPassword"
                  placeholder="如果帳號開啟了二步驗證"
                  class="form-input">
              </div>

              <div class="form-actions">
                <button (click)="currentLoginMethod.set('select')" class="btn-secondary">← 返回</button>
                <button 
                  (click)="sendVerificationCode()" 
                  [disabled]="!phoneNumber || isSending()"
                  class="btn-primary">
                  @if (isSending()) {
                    <span class="spinner"></span> 發送中...
                  } @else {
                    發送驗證碼 →
                  }
                </button>
              </div>
            } @else {
              <!-- 輸入驗證碼 -->
              <div class="code-sent-info">
                <span class="info-icon">📱</span>
                驗證碼已發送至 {{ phoneNumber }}
              </div>

              <div class="form-group">
                <label>驗證碼 <span class="required">*</span></label>
                <input 
                  type="text" 
                  [(ngModel)]="verificationCode"
                  placeholder="輸入收到的驗證碼"
                  class="form-input code-input"
                  maxlength="6">
              </div>

              @if (needs2FA()) {
                <div class="form-group">
                  <label>二步驗證密碼 <span class="required">*</span></label>
                  <input 
                    type="password" 
                    [(ngModel)]="twoFactorPassword"
                    placeholder="請輸入二步驗證密碼"
                    class="form-input">
                </div>
              }

              <div class="resend-section">
                <button (click)="resendCode()" [disabled]="resendCooldown() > 0" class="resend-btn">
                  @if (resendCooldown() > 0) {
                    {{ resendCooldown() }}秒後可重發
                  } @else {
                    重新發送驗證碼
                  }
                </button>
              </div>

              <div class="form-actions">
                <button (click)="codeStep.set(false)" class="btn-secondary">← 返回</button>
                <button 
                  (click)="submitVerificationCode()" 
                  [disabled]="!verificationCode || isVerifying()"
                  class="btn-primary">
                  @if (isVerifying()) {
                    <span class="spinner"></span> 驗證中...
                  } @else {
                    驗證並登入 →
                  }
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Step 2: TData 導入流程 -->
      @if (currentStep() === 2 && currentLoginMethod() === 'tdata') {
        <div class="login-form">
          <div class="section-header">
            <h2>📂 TData / Session 導入</h2>
          </div>

          <div class="form-card">
            <!-- 導入模式選擇 -->
            <div class="import-mode-tabs">
              <button 
                [class.active]="tdataImportMode() === 'tdata'"
                (click)="tdataImportMode.set('tdata')"
                class="mode-tab">
                📂 TData 文件夾
                <span class="badge-recommend">推薦</span>
              </button>
              <button 
                [class.active]="tdataImportMode() === 'session'"
                (click)="tdataImportMode.set('session')"
                class="mode-tab">
                📄 Session 文件
              </button>
            </div>

            <!-- TData 文件夾導入 -->
            @if (tdataImportMode() === 'tdata') {
              <!-- TData 路徑提示 -->
              <div class="tdata-path-hint">
                <h4>📍 TData 位置</h4>
                <div class="path-box">
                  <code>{{ getDefaultTdataPath() }}</code>
                  <div class="path-actions">
                    <button (click)="copyTdataPath()" class="icon-btn" title="複製路徑">📋</button>
                    <button (click)="openTdataFolder()" class="icon-btn" title="打開文件夾">📂</button>
                  </div>
                </div>
              </div>

              <div 
                class="drop-zone large"
                [class.dragging]="isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDropTdata($event)">
                <div class="drop-icon">📁</div>
                <p class="drop-text">拖放 tdata 文件夾到這裡</p>
                <p class="drop-hint">支持：整個文件夾 / ZIP 壓縮包</p>
                <div class="drop-buttons">
                  <button (click)="selectTdataFolder()" class="select-btn">選擇文件夾</button>
                  <button (click)="selectTdataZip()" class="select-btn secondary">選擇 ZIP</button>
                </div>
              </div>

              <!-- 掃描結果 -->
              @if (tdataScanResult()) {
                @if (tdataScanResult()!.success) {
                  <div class="scan-result success">
                    <h4>📋 檢測到 {{ tdataScanResult()!.accounts?.length || 0 }} 個帳號</h4>
                    <div class="accounts-list">
                      @for (account of tdataScanResult()!.accounts || []; track account.index) {
                        <label class="account-item" [class.disabled]="!account.can_import">
                          <input 
                            type="checkbox" 
                            [checked]="selectedTdataAccounts().includes(account.index)"
                            [disabled]="!account.can_import"
                            (change)="toggleTdataAccount(account.index)">
                          <div class="account-info">
                            <span class="account-phone">{{ account.phone }}</span>
                            @if (account.first_name || account.username) {
                              <span class="account-name">{{ account.first_name || account.username }}</span>
                            }
                            @if (!account.can_import) {
                              <span class="account-error">{{ account.error || '無法導入' }}</span>
                            }
                          </div>
                        </label>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="scan-result error">
                    <span class="error-icon">❌</span>
                    <span>{{ tdataScanResult()!.error || '掃描失敗' }}</span>
                  </div>
                }
              }

              @if (isScanningTdata()) {
                <div class="scanning-indicator">
                  <span class="spinner"></span>
                  <span>正在掃描 TData...</span>
                </div>
              }
            }

            <!-- Session 文件導入 -->
            @if (tdataImportMode() === 'session') {
              <div class="tdata-info">
                <h4>支持的格式</h4>
                <ul>
                  <li><strong>.tgpkg</strong> - TG-Matrix 導出包（推薦）</li>
                  <li><strong>.session</strong> - Pyrogram Session 文件</li>
                  <li><strong>.telethon.session</strong> - Telethon Session 文件</li>
                </ul>
              </div>

              <div 
                class="drop-zone"
                [class.dragging]="isDragging()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onDrop($event)"
                (click)="selectSessionFile()">
                <div class="drop-icon">📄</div>
                <p class="drop-text">拖放 Session 文件到這裡</p>
                <p class="drop-hint">或點擊選擇文件</p>
              </div>

              @if (selectedFilePath()) {
                <div class="selected-file">
                  <span class="file-icon">📄</span>
                  <span class="file-path">{{ selectedFilePath() }}</span>
                  <button (click)="clearSelectedFile()" class="clear-btn">×</button>
                </div>
              }
            }

            <div class="form-actions">
              <button (click)="currentLoginMethod.set('select')" class="btn-secondary">← 返回</button>
              @if (tdataImportMode() === 'tdata') {
                <button 
                  (click)="importTdataAccounts()" 
                  [disabled]="selectedTdataAccounts().length === 0 || isImporting()"
                  class="btn-primary">
                  @if (isImporting()) {
                    <span class="spinner"></span> 導入中...
                  } @else {
                    導入 {{ selectedTdataAccounts().length }} 個帳號 →
                  }
                </button>
              } @else {
                <button 
                  (click)="importSession()" 
                  [disabled]="!selectedFilePath() || isImporting()"
                  class="btn-primary">
                  @if (isImporting()) {
                    <span class="spinner"></span> 導入中...
                  } @else {
                    導入 Session →
                  }
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- Step 2: 掃碼登入流程 -->
      @if (currentStep() === 2 && currentLoginMethod() === 'qr') {
        <div class="login-form">
          <div class="section-header">
            <h2>📱 掃碼登入</h2>
          </div>

          <div class="form-card">
            <div class="form-group">
              <label>設備模擬</label>
              <div class="device-options">
                <button 
                  (click)="deviceType.set('random')"
                  [class.active]="deviceType() === 'random'"
                  class="device-btn">🎲 隨機</button>
                <button 
                  (click)="deviceType.set('ios')"
                  [class.active]="deviceType() === 'ios'"
                  class="device-btn">📱 iOS</button>
                <button 
                  (click)="deviceType.set('android')"
                  [class.active]="deviceType() === 'android'"
                  class="device-btn">🤖 Android</button>
              </div>
            </div>

            <div class="form-group">
              <label>代理設置（可選）</label>
              <input type="text" [(ngModel)]="proxyAddress" placeholder="socks5://host:port" class="form-input">
            </div>

            @if (!qrImageBase64()) {
              <div class="form-actions">
                <button (click)="currentLoginMethod.set('select')" class="btn-secondary">← 返回</button>
                <button (click)="generateQRCode()" class="btn-primary">生成二維碼 →</button>
              </div>
            } @else {
              <div class="qr-section">
                <div class="qr-container">
                  <img [src]="'data:image/png;base64,' + qrImageBase64()" alt="QR Code" class="qr-image">
                </div>
                <div class="qr-countdown" [class.warning]="qrCountdown() <= 10">
                  ⏱️ 有效期：{{ qrCountdown() }} 秒
                </div>
                <div class="qr-instructions">
                  <p>1. 打開手機 Telegram APP</p>
                  <p>2. 前往 設置 → 設備 → 掃描二維碼</p>
                  <p>3. 掃描上方二維碼並確認授權</p>
                </div>
              </div>

              <div class="form-actions">
                <button (click)="currentLoginMethod.set('select')" class="btn-secondary">← 返回</button>
                <button (click)="refreshQRCode()" class="btn-primary">🔄 刷新二維碼</button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Step 3: 完成 -->
      @if (currentStep() === 3) {
        <div class="success-section">
          <div class="success-icon">✅</div>
          <h2>帳戶添加成功！</h2>
          
          @if (addedAccountInfo()) {
            <div class="account-card">
              <div class="account-avatar">
                {{ (addedAccountInfo()!.firstName || addedAccountInfo()!.phone || '?').charAt(0).toUpperCase() }}
              </div>
              <div class="account-details">
                <div class="account-name">
                  {{ addedAccountInfo()!.firstName || '' }} {{ addedAccountInfo()!.lastName || '' }}
                </div>
                <div class="account-phone">{{ addedAccountInfo()!.phone }}</div>
                @if (addedAccountInfo()!.username) {
                  <div class="account-username">{{ '@' + addedAccountInfo()!.username }}</div>
                }
              </div>
            </div>

            @if (selectedApiCredential()) {
              <div class="api-info">
                <span class="api-badge expert">🔐 {{ selectedApiCredential()!.name || 'API ' + selectedApiCredential()!.api_id }}</span>
              </div>
            }
          }

          <div class="form-actions center">
            <button (click)="addAnother()" class="btn-secondary">➕ 繼續添加</button>
            <button (click)="goBack()" class="btn-primary">返回帳戶列表 →</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .add-account-page {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }

    /* Header */
    .page-header {
      margin-bottom: 2rem;
    }

    .back-btn {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      cursor: pointer;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
      padding: 0;
    }

    .back-btn:hover { text-decoration: underline; }

    .page-title {
      margin: 0;
      font-size: 2rem;
      color: var(--text-primary, white);
    }

    /* Step Indicator */
    .step-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
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
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .step.active .step-label { color: var(--text-primary, white); }

    .step-line {
      width: 40px;
      height: 2px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
    }

    .step-line.active { background: var(--primary, #06b6d4); }

    /* Mode Selection */
    .mode-selection, .login-selection {
      text-align: center;
    }

    .section-header h2, .selection-header h2 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary, white);
      font-size: 1.5rem;
    }

    .section-header p, .selection-header p {
      margin: 0 0 2rem 0;
      color: var(--text-muted, #94a3b8);
    }

    .mode-cards, .login-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 700px) {
      .mode-cards, .login-cards { grid-template-columns: 1fr; }
    }

    .login-cards {
      grid-template-columns: repeat(3, 1fr);
    }

    @media (max-width: 800px) {
      .login-cards { grid-template-columns: 1fr; }
    }

    .mode-card, .login-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 2px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 1rem;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      text-align: left;
    }

    .mode-card:hover, .login-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .mode-card.expert:hover { border-color: #22c55e; }
    .mode-card.platform:hover { border-color: #06b6d4; }
    .mode-card.disabled { opacity: 0.6; cursor: not-allowed; }
    .mode-card.disabled:hover { transform: none; }

    .login-card.recommended:hover { border-color: #22c55e; }
    .login-card.safe:hover { border-color: #06b6d4; }
    .login-card.warning:hover { border-color: #f59e0b; }

    .mode-badge, .login-badge {
      position: absolute;
      top: -10px;
      right: 1rem;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .mode-card.expert .mode-badge { background: #22c55e; color: white; }
    .mode-card.platform .mode-badge { background: #06b6d4; color: white; }
    .login-card.recommended .login-badge { background: #22c55e; color: white; }
    .login-card.safe .login-badge { background: #06b6d4; color: white; }
    .login-card.warning .login-badge { background: #f59e0b; color: black; }

    .mode-icon, .login-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .mode-title, .login-card h3 {
      margin: 0 0 0.25rem 0;
      color: var(--text-primary, white);
      font-size: 1.25rem;
    }

    .mode-subtitle, .login-card p {
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: var(--text-muted, #94a3b8);
    }

    .mode-features, .login-card ul {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem 0;
      font-size: 0.8rem;
    }

    .mode-features li, .login-card li {
      margin-bottom: 0.375rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .mode-suitable {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin-bottom: 1rem;
    }

    .mode-risk, .login-risk {
      padding: 0.375rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.7rem;
      font-weight: 500;
      display: inline-block;
      margin-bottom: 1rem;
    }

    .mode-risk.safe, .login-risk.lowest { background: rgba(6, 182, 212, 0.2); color: #67e8f9; }
    .mode-risk.medium, .login-risk.low { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .login-risk.high { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }

    .quota-info {
      margin-bottom: 1rem;
    }

    .quota-bar {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 0.75rem;
      border-radius: 0.5rem;
    }

    .quota-label {
      font-size: 0.7rem;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 0.375rem;
    }

    .quota-progress {
      height: 6px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.8));
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.375rem;
    }

    .quota-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22c55e);
      border-radius: 3px;
    }

    .quota-text {
      font-size: 0.75rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .quota-locked {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 0.5rem;
      font-size: 0.75rem;
      color: #fcd34d;
    }

    .mode-btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 0.5rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-card.expert .mode-btn { background: #22c55e; color: white; }
    .mode-card.platform .mode-btn { background: #06b6d4; color: white; }
    .mode-btn.upgrade { background: linear-gradient(135deg, #f59e0b, #ef4444); }

    /* Help Section */
    .help-section {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      text-align: left;
    }

    @media (max-width: 600px) {
      .help-section { grid-template-columns: 1fr; }
    }

    .help-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.5));
      padding: 1rem;
      border-radius: 0.75rem;
    }

    .help-card h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .help-card p {
      margin: 0 0 0.5rem 0;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    /* Config Section */
    .config-section {
      max-width: 600px;
      margin: 0 auto;
    }

    .form-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
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

    .required { color: #ef4444; }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--primary, #06b6d4);
    }

    .form-input.error {
      border-color: #ef4444;
    }

    .form-input.code-input {
      text-align: center;
      font-size: 1.5rem;
      letter-spacing: 0.5rem;
    }

    .hint {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
    }

    .error-text {
      display: block;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: #ef4444;
    }

    .guide-box {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .guide-box h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .guide-box ol {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .guide-box li { margin-bottom: 0.375rem; }

    .guide-box a { color: var(--primary, #06b6d4); }

    .warning-box, .risk-warning {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 0.5rem;
    }

    .warning-icon { font-size: 1.25rem; }

    .warning-content strong {
      display: block;
      color: #fcd34d;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
    }

    .warning-content ul, .warning-content p {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .warning-content p { padding-left: 0; }

    /* Quota Card */
    .quota-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .membership-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .level-icon { font-size: 2rem; }

    .level-details {
      display: flex;
      flex-direction: column;
    }

    .level-name {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .level-label {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .quota-item {
      margin-bottom: 1rem;
    }

    .quota-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .quota-title {
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .quota-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary, white);
    }

    .quota-bar-large {
      height: 8px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 4px;
      overflow: hidden;
    }

    .quota-bar-large .quota-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #22c55e);
    }

    .quota-summary {
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      text-align: center;
    }

    .summary-good { color: #22c55e; }
    .summary-bad { color: #ef4444; }

    .upgrade-prompt {
      margin-top: 1rem;
      text-align: center;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1));
      border-radius: 0.5rem;
    }

    .upgrade-prompt p {
      margin: 0 0 0.75rem 0;
      color: #fcd34d;
    }

    .btn-upgrade {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .form-actions.center { justify-content: center; }

    .btn-primary {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.5rem;
      color: var(--text-secondary, #cbd5e1);
      cursor: pointer;
    }

    /* Device Options */
    .device-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .device-btn {
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
    }

    .device-btn:hover, .device-btn.active {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }

    /* Drop Zone */
    .drop-zone {
      border: 2px dashed var(--border-default, rgba(148, 163, 184, 0.3));
      border-radius: 0.75rem;
      padding: 3rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 1rem;
    }

    .drop-zone:hover, .drop-zone.dragging {
      border-color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.05);
    }

    .drop-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

    .drop-text {
      margin: 0;
      color: var(--text-primary, white);
    }

    .drop-hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    .selected-file {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
    }

    .file-path {
      flex: 1;
      color: var(--text-primary, white);
      font-size: 0.875rem;
      word-break: break-all;
    }

    .clear-btn {
      background: none;
      border: none;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      font-size: 1.25rem;
    }

    /* QR Section */
    .qr-section {
      text-align: center;
      margin: 1rem 0;
    }

    .qr-container {
      padding: 1rem;
      background: white;
      border-radius: 0.75rem;
      display: inline-block;
      margin-bottom: 0.75rem;
    }

    .qr-image {
      width: 180px;
      height: 180px;
      display: block;
    }

    .qr-countdown {
      font-size: 1rem;
      color: var(--primary, #06b6d4);
      margin-bottom: 0.75rem;
    }

    .qr-countdown.warning {
      color: #f59e0b;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .qr-instructions {
      text-align: left;
      display: inline-block;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 0.75rem 1.25rem;
      border-radius: 0.5rem;
    }

    .qr-instructions p {
      margin: 0.25rem 0;
      color: var(--text-muted, #94a3b8);
      font-size: 0.8rem;
    }

    /* Code Sent Info */
    .code-sent-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      color: #86efac;
    }

    .resend-section {
      text-align: center;
      margin: 1rem 0;
    }

    .resend-btn {
      background: none;
      border: none;
      color: var(--primary, #06b6d4);
      cursor: pointer;
      font-size: 0.875rem;
    }

    .resend-btn:disabled {
      color: var(--text-muted, #94a3b8);
      cursor: not-allowed;
    }

    /* TData Info */
    .tdata-info {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .tdata-info h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .tdata-info ul {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
    }

    /* Import Mode Tabs */
    .import-mode-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .mode-tab {
      flex: 1;
      padding: 0.75rem 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 2px solid transparent;
      border-radius: 0.5rem;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    }

    .mode-tab:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
      color: var(--text-primary, white);
    }

    .mode-tab.active {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
      border-color: var(--primary, #06b6d4);
      color: var(--text-primary, white);
    }

    .badge-recommend {
      position: absolute;
      top: -8px;
      right: -8px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      font-size: 0.65rem;
      padding: 2px 6px;
      border-radius: 4px;
    }

    /* TData Path Hint */
    .tdata-path-hint {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border, rgba(100, 116, 139, 0.3));
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .tdata-path-hint h4 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .path-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-primary, rgba(2, 6, 23, 0.8));
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
    }

    .path-box code {
      font-size: 0.8rem;
      color: var(--primary, #06b6d4);
      word-break: break-all;
    }

    .path-actions {
      display: flex;
      gap: 0.25rem;
    }

    .icon-btn {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .icon-btn:hover {
      opacity: 1;
    }

    /* Drop Zone Large */
    .drop-zone.large {
      padding: 2rem;
      min-height: 180px;
    }

    .drop-buttons {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .select-btn {
      padding: 0.5rem 1rem;
      background: var(--primary, #06b6d4);
      color: white;
      border: none;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .select-btn:hover {
      background: var(--primary-dark, #0891b2);
    }

    .select-btn.secondary {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border, rgba(100, 116, 139, 0.3));
    }

    .select-btn.secondary:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    /* Scan Result */
    .scan-result {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
      padding: 1rem;
      margin: 1rem 0;
    }

    .scan-result.success {
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .scan-result.error {
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #f87171;
    }

    .scan-result h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .accounts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .account-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: var(--bg-primary, rgba(2, 6, 23, 0.8));
      border-radius: 0.375rem;
      cursor: pointer;
      transition: background 0.2s;
    }

    .account-item:hover {
      background: var(--bg-secondary, rgba(30, 41, 59, 0.8));
    }

    .account-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .account-item input[type="checkbox"] {
      width: 1rem;
      height: 1rem;
    }

    .account-info {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .account-phone {
      font-size: 0.875rem;
      color: var(--text-primary, white);
    }

    .account-name {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }

    .account-error {
      font-size: 0.7rem;
      color: #f87171;
    }

    /* Scanning Indicator */
    .scanning-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      color: var(--text-muted, #94a3b8);
    }

    /* Success Section */
    .success-section {
      text-align: center;
      padding: 2rem;
    }

    .success-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
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
      border-radius: 0.75rem;
      margin-bottom: 1rem;
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

    .api-info {
      margin: 1rem 0;
    }

    .api-badge {
      display: inline-block;
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.8rem;
    }

    .api-badge.expert { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .api-badge.platform { background: rgba(6, 182, 212, 0.2); color: #67e8f9; }

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
export class AddAccountPageComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  membershipService = inject(MembershipService);

  @Output() back = new EventEmitter<void>();
  @Output() accountAdded = new EventEmitter<any>();

  // 狀態
  currentStep = signal<Step>(1);
  currentLoginMethod = signal<LoginMethod>('select');
  
  // 選擇的 API
  selectedApiCredential = signal<SelectedApi | null>(null);

  // 登入回調數據
  phoneCodeHash = '';
  loginAccountId = '';

  // 登入流程
  phoneNumber = '';
  verificationCode = '';
  twoFactorPassword = '';
  proxyAddress = '';
  codeStep = signal(false);
  isSending = signal(false);
  isVerifying = signal(false);
  needs2FA = signal(false);
  resendCooldown = signal(0);
  
  // QR 登入
  deviceType = signal<'random' | 'ios' | 'android'>('random');
  qrImageBase64 = signal('');
  qrCountdown = signal(60);
  
  // TData 導入
  isDragging = signal(false);
  selectedFilePath = signal('');
  isImporting = signal(false);
  tdataImportMode = signal<'tdata' | 'session'>('tdata');
  tdataScanResult = signal<{
    success: boolean;
    accounts?: any[];
    error?: string;
    tdata_path?: string;
  } | null>(null);
  selectedTdataAccounts = signal<number[]>([]);
  isScanningTdata = signal(false);
  defaultTdataPath = signal('');

  // 結果
  addedAccountInfo = signal<any>(null);
  
  private resendTimer: any = null;
  private qrTimer: any = null;
  private ipcChannels: string[] = [];

  ngOnInit(): void {
    this.setupIpcListeners();
  }

  ngOnDestroy(): void {
    if (this.resendTimer) clearInterval(this.resendTimer);
    if (this.qrTimer) clearInterval(this.qrTimer);
    this.ipcChannels.forEach(ch => this.ipcService.cleanup(ch));
  }

  private setupIpcListeners(): void {
    // 需要驗證碼（後端發送驗證碼後的回調）
    this.ipcService.on('login-requires-code', (result: any) => {
      this.isSending.set(false);
      if (result.phone === this.phoneNumber || result.accountId) {
        // 保存 phone_code_hash 用於後續驗證
        this.phoneCodeHash = result.phoneCodeHash;
        this.loginAccountId = result.accountId;
        this.codeStep.set(true);
        this.startResendCooldown();
        
        const sendType = result.sendType || 'app';
        if (sendType === 'sms') {
          this.toast.success('驗證碼已發送至手機短信');
        } else {
          this.toast.success('驗證碼已發送至 Telegram App');
        }
      }
    });
    this.ipcChannels.push('login-requires-code');

    // 登入成功
    this.ipcService.on('login-success', (result: any) => {
      this.isVerifying.set(false);
      this.addedAccountInfo.set(result.userInfo || { phone: this.phoneNumber });
      this.currentStep.set(3);
      this.accountAdded.emit(result);
      this.toast.success('登入成功！');
    });
    this.ipcChannels.push('login-success');

    // 需要二步驗證
    this.ipcService.on('login-requires-2fa', (result: any) => {
      this.isVerifying.set(false);
      this.needs2FA.set(true);
      this.toast.info('請輸入二步驗證密碼');
    });
    this.ipcChannels.push('login-requires-2fa');

    // 登入失敗
    this.ipcService.on('login-error', (result: any) => {
      this.isSending.set(false);
      this.isVerifying.set(false);
      this.toast.error(result.error || result.message || '登入失敗');
    });
    this.ipcChannels.push('login-error');

    // QR 登入
    this.ipcService.on('qr-login-created', (result: any) => {
      if (result.success !== false && result.qrImageBase64) {
        this.qrImageBase64.set(result.qrImageBase64);
        this.startQRCountdown();
      } else {
        this.toast.error(result.error || '生成二維碼失敗');
      }
    });
    this.ipcChannels.push('qr-login-created');

    this.ipcService.on('qr-login-success', (data: any) => {
      this.stopQRCountdown();
      this.addedAccountInfo.set(data.userInfo || data);
      this.currentStep.set(3);
      this.accountAdded.emit(data);
      this.toast.success('登入成功！');
    });
    this.ipcChannels.push('qr-login-success');

    // Session 導入
    this.ipcService.on('session-imported', (result: any) => {
      this.isImporting.set(false);
      if (result.success) {
        this.addedAccountInfo.set(result.account || { phone: result.phone });
        this.currentStep.set(3);
        this.accountAdded.emit(result);
        this.toast.success('導入成功！');
      } else {
        this.toast.error(result.error || '導入失敗');
      }
    });
    this.ipcChannels.push('session-imported');

    // 文件選擇
    this.ipcService.on('session-file-selected', (result: any) => {
      if (result.path) {
        this.selectedFilePath.set(result.path);
      }
    });
    this.ipcChannels.push('session-file-selected');

    // TData 文件夾選擇
    this.ipcService.on('tdata-folder-selected', (result: any) => {
      if (result.path) {
        this.scanTdata(result.path);
      }
    });
    this.ipcChannels.push('tdata-folder-selected');

    // TData ZIP 選擇
    this.ipcService.on('tdata-zip-selected', (result: any) => {
      if (result.path) {
        this.scanTdata(result.path);
      }
    });
    this.ipcChannels.push('tdata-zip-selected');

    // TData 掃描結果
    this.ipcService.on('tdata-scan-result', (result: any) => {
      this.isScanningTdata.set(false);
      this.tdataScanResult.set(result);
      
      if (result.success && result.accounts?.length > 0) {
        // 默認選中所有可導入的帳號
        const importableIndices = result.accounts
          .filter((a: any) => a.can_import)
          .map((a: any) => a.index);
        this.selectedTdataAccounts.set(importableIndices);
        this.toast.success(`找到 ${result.accounts.length} 個帳號`);
      } else if (result.error) {
        this.toast.error(result.error);
      }
    });
    this.ipcChannels.push('tdata-scan-result');

    // TData 導入結果
    this.ipcService.on('tdata-import-result', (result: any) => {
      this.isImporting.set(false);
      
      if (result.success) {
        this.addedAccountInfo.set({
          phone: result.phone,
          first_name: result.first_name,
          last_name: result.last_name,
          username: result.username
        });
        this.currentStep.set(3);
        this.accountAdded.emit(result);
        this.toast.success(`帳號 ${result.phone} 導入成功！`);
      } else {
        this.toast.error(result.error || '導入失敗');
      }
    });
    this.ipcChannels.push('tdata-import-result');

    // TData 批量導入結果
    this.ipcService.on('tdata-batch-result', (result: any) => {
      this.isImporting.set(false);
      
      if (result.success_count > 0) {
        this.currentStep.set(3);
        this.addedAccountInfo.set({
          batch: true,
          count: result.success_count,
          failed: result.fail_count
        });
        this.toast.success(`成功導入 ${result.success_count} 個帳號`);
        
        if (result.fail_count > 0) {
          this.toast.warning(`${result.fail_count} 個帳號導入失敗`);
        }
      } else {
        this.toast.error(result.error || '所有帳號導入失敗');
      }
    });
    this.ipcChannels.push('tdata-batch-result');

    // TData 導入進度
    this.ipcService.on('tdata-import-progress', (result: any) => {
      // 可以用於顯示進度條
      console.log(`TData import progress: ${result.current}/${result.total}`);
    });
    this.ipcChannels.push('tdata-import-progress');
  }

  // API 選擇回調
  onApiSelected(api: SelectedApi): void {
    this.selectedApiCredential.set(api);
  }

  onApiCleared(): void {
    this.selectedApiCredential.set(null);
  }

  proceedToLogin(): void {
    if (this.selectedApiCredential()) {
      this.currentStep.set(2);
    }
  }

  selectLoginMethod(method: LoginMethod): void {
    this.currentLoginMethod.set(method);
  }

  goBack(): void {
    this.back.emit();
  }

  addAnother(): void {
    this.currentStep.set(1);
    this.currentLoginMethod.set('select');
    this.selectedApiCredential.set(null);
    this.resetForm();
  }

  openUpgrade(): void {
    window.dispatchEvent(new CustomEvent('open-membership-dialog'));
  }

  private resetForm(): void {
    this.phoneNumber = '';
    this.verificationCode = '';
    this.twoFactorPassword = '';
    this.proxyAddress = '';
    this.phoneCodeHash = '';
    this.loginAccountId = '';
    this.codeStep.set(false);
    this.qrImageBase64.set('');
    this.selectedFilePath.set('');
    this.needs2FA.set(false);
    this.addedAccountInfo.set(null);
  }

  // 驗證碼登入
  sendVerificationCode(): void {
    const selectedApi = this.selectedApiCredential();
    if (!selectedApi) {
      this.toast.error('請先選擇 API');
      return;
    }
    
    if (!this.phoneNumber) {
      this.toast.error('請輸入手機號碼');
      return;
    }
    
    this.isSending.set(true);
    
    // 第一步：添加帳戶
    this.ipcService.send('add-account', {
      phone: this.phoneNumber,
      apiId: selectedApi.api_id,
      apiHash: selectedApi.api_hash,
      proxy: this.proxyAddress || null,
      twoFactorPassword: this.twoFactorPassword || null
    });
    
    // 第二步：觸發登入（會發送驗證碼）
    setTimeout(() => {
      this.ipcService.send('login-account', {
        phone: this.phoneNumber,
        apiId: selectedApi.api_id,
        apiHash: selectedApi.api_hash,
        proxy: this.proxyAddress || null,
        twoFactorPassword: this.twoFactorPassword || null
      });
    }, 500);
  }

  submitVerificationCode(): void {
    if (!this.verificationCode) {
      this.toast.error('請輸入驗證碼');
      return;
    }
    
    this.isVerifying.set(true);
    
    const selectedApi = this.selectedApiCredential();
    
    // 使用 login-account 命令提交驗證碼
    this.ipcService.send('login-account', {
      phone: this.phoneNumber,
      phoneCode: this.verificationCode,
      phoneCodeHash: this.phoneCodeHash,
      twoFactorPassword: this.twoFactorPassword || null,
      apiId: selectedApi?.api_id,
      apiHash: selectedApi?.api_hash
    });
  }

  resendCode(): void {
    this.sendVerificationCode();
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

  // QR 登入
  generateQRCode(): void {
    const selectedApi = this.selectedApiCredential();
    if (!selectedApi) {
      this.toast.error('請先選擇 API');
      return;
    }
    
    this.ipcService.send('qr-login-create', {
      proxy: this.proxyAddress || null,
      deviceType: this.deviceType() === 'random' ? null : this.deviceType(),
      customApiId: selectedApi.api_id,
      customApiHash: selectedApi.api_hash
    });
  }

  refreshQRCode(): void {
    this.qrImageBase64.set('');
    this.generateQRCode();
  }

  private startQRCountdown(): void {
    this.qrCountdown.set(60);
    this.qrTimer = setInterval(() => {
      const current = this.qrCountdown();
      if (current <= 1) {
        this.stopQRCountdown();
      } else {
        this.qrCountdown.set(current - 1);
      }
    }, 1000);
  }

  private stopQRCountdown(): void {
    if (this.qrTimer) {
      clearInterval(this.qrTimer);
      this.qrTimer = null;
    }
  }

  // TData 導入
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // @ts-ignore
      const path = files[0].path;
      if (path) {
        this.selectedFilePath.set(path);
      }
    }
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

  selectSessionFile(): void {
    this.ipcService.send('select-session-file', {});
  }

  selectTdataFolder(): void {
    this.ipcService.send('select-tdata-folder', {});
  }

  selectTdataZip(): void {
    this.ipcService.send('select-tdata-zip', {});
  }

  scanTdata(path: string): void {
    this.isScanningTdata.set(true);
    this.tdataScanResult.set(null);
    this.selectedTdataAccounts.set([]);
    this.ipcService.send('scan-tdata', { path });
  }

  toggleTdataAccount(index: number): void {
    this.selectedTdataAccounts.update(current => {
      if (current.includes(index)) {
        return current.filter(i => i !== index);
      } else {
        return [...current, index];
      }
    });
  }

  getDefaultTdataPath(): string {
    // 根據平台返回默認路徑
    const isWin = navigator.userAgent.includes('Windows');
    const isMac = navigator.userAgent.includes('Mac');
    
    if (isWin) {
      return '%APPDATA%\\Telegram Desktop\\tdata';
    } else if (isMac) {
      return '~/Library/Application Support/Telegram Desktop/tdata';
    } else {
      return '~/.local/share/TelegramDesktop/tdata';
    }
  }

  copyTdataPath(): void {
    const path = this.getDefaultTdataPath();
    navigator.clipboard.writeText(path.replace('%APPDATA%', '').replace('~', ''));
    this.toast.success('路徑已複製');
  }

  openTdataFolder(): void {
    this.ipcService.send('open-default-tdata-folder', {});
  }

  importTdataAccounts(): void {
    const selectedApi = this.selectedApiCredential();
    if (!selectedApi) {
      this.toast.error('請先選擇 API');
      return;
    }
    
    const scanResult = this.tdataScanResult();
    if (!scanResult?.tdata_path) {
      this.toast.error('請先掃描 TData');
      return;
    }
    
    const indices = this.selectedTdataAccounts();
    if (indices.length === 0) {
      this.toast.error('請選擇要導入的帳號');
      return;
    }
    
    this.isImporting.set(true);
    
    if (indices.length === 1) {
      // 單個帳號導入
      this.ipcService.send('import-tdata-account', {
        tdataPath: scanResult.tdata_path,
        accountIndex: indices[0],
        apiId: selectedApi.api_id,
        apiHash: selectedApi.api_hash
      });
    } else {
      // 批量導入
      this.ipcService.send('import-tdata-batch', {
        tdataPath: scanResult.tdata_path,
        accountIndices: indices,
        apiId: selectedApi.api_id,
        apiHash: selectedApi.api_hash
      });
    }
  }

  clearSelectedFile(): void {
    this.selectedFilePath.set('');
  }

  importSession(): void {
    const selectedApi = this.selectedApiCredential();
    if (!selectedApi) {
      this.toast.error('請先選擇 API');
      return;
    }
    
    this.isImporting.set(true);
    
    this.ipcService.send('import-session', {
      filePath: this.selectedFilePath(),
      apiId: selectedApi.api_id,
      apiHash: selectedApi.api_hash
    });
  }
}
