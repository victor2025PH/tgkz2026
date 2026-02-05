/**
 * 個人中心組件
 * 用戶信息、卡密管理、設備管理、使用統計、邀請獎勵
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, DeviceInfo, UsageStats } from './auth.service';
import { AuthEventsService } from './core/auth-events.service';  // 🆕 用於廣播用戶更新
import { MembershipService } from './membership.service';  // 🔧 P0: 使用統一會員服務
import { Router } from '@angular/router';
import { DeviceService } from './device.service';
import { I18nService } from './i18n.service';
import { ToastService } from './toast.service';
import { LicenseClientService } from './license-client.service';
import { UserLevelBadgeComponent } from './components/user-level-badge.component';

type ProfileTab = 'account' | 'license' | 'devices' | 'usage' | 'invite';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, UserLevelBadgeComponent],
  template: `
    <div class="profile-container">
      <!-- 🔧 加載中狀態 -->
      @if (isLoadingUser()) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
          <span>正在加載用戶信息...</span>
        </div>
      }
      
      <!-- 🔧 錯誤提示 -->
      @if (userLoadError()) {
        <div class="error-alert">
          <span class="error-icon">⚠️</span>
          <span>{{ userLoadError() }}</span>
          <button class="retry-btn" (click)="ensureUserLoaded()">重試</button>
        </div>
      }
      
      <!-- 用戶頭部信息 -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar">
            {{ (user()?.displayName || user()?.username)?.charAt(0).toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <h2 class="username">{{ user()?.displayName || user()?.username || (isLoadingUser() ? '載入中...' : '未登入') }}</h2>
            <p class="email">{{ user()?.email || '未設置郵箱' }}</p>
            <div class="membership-badge-wrapper flex items-center gap-2">
              <!-- 🔧 P1-2: 使用統一的會員等級徽章組件 -->
              <user-level-badge [level]="membershipLevel()" size="md" />
              @if (membershipDaysLeft() > 0) {
                <span class="expires text-xs opacity-70">· 剩餘 {{ membershipDaysLeft() }} 天</span>
              }
            </div>
          </div>
        </div>
        <button (click)="onLogout()" class="logout-btn" [disabled]="isLoggingOut()">
          @if (isLoggingOut()) {
            <span class="logout-spinner"></span> 退出中...
          } @else {
            🚪 退出
          }
        </button>
      </div>
      
      <!-- 標籤導航 -->
      <div class="tabs">
        <button 
          (click)="activeTab.set('account')"
          [class.active]="activeTab() === 'account'"
          class="tab-btn">
          👤 帳號信息
        </button>
        <button 
          (click)="activeTab.set('license')"
          [class.active]="activeTab() === 'license'"
          class="tab-btn">
          🔑 卡密管理
        </button>
        <button 
          (click)="activeTab.set('devices')"
          [class.active]="activeTab() === 'devices'"
          class="tab-btn">
          💻 設備管理
        </button>
        <button 
          (click)="activeTab.set('usage')"
          [class.active]="activeTab() === 'usage'"
          class="tab-btn">
          📊 使用統計
        </button>
        <button 
          (click)="activeTab.set('invite')"
          [class.active]="activeTab() === 'invite'"
          class="tab-btn">
          🎁 邀請獎勵
        </button>
      </div>
      
      <!-- 帳號信息 -->
      @if (activeTab() === 'account') {
        <div class="tab-content">
          <div class="section-card">
            <h3 class="section-title">📋 基本信息</h3>
            
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Telegram ID</span>
                <span class="info-value user-id">
                  <span class="id-text">{{ user()?.telegramId || '未綁定' }}</span>
                  @if (user()?.telegramId) {
                    <button class="copy-id-btn" (click)="copyTelegramId()" title="複製 Telegram ID">📋</button>
                  }
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">顯示名稱</span>
                <span class="info-value">{{ user()?.displayName || user()?.username || '未設置' }}</span>
                <button class="edit-btn" (click)="openDisplayNameEditor()">編輯</button>
              </div>
              <div class="info-item">
                <span class="info-label">用戶名</span>
                <span class="info-value username-value">{{ user()?.username }}</span>
                <span class="info-hint">登入用，不可修改</span>
              </div>
              <div class="info-item">
                <span class="info-label">郵箱</span>
                <span class="info-value">{{ user()?.email || '未設置' }}</span>
                <button class="edit-btn" (click)="openEmailEditor()">編輯</button>
              </div>
              <div class="info-item">
                <span class="info-label">註冊時間</span>
                <span class="info-value">{{ formatDate(user()?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">最後登入</span>
                <span class="info-value">{{ formatDate(user()?.lastLogin) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 🆕 郵箱編輯彈窗 -->
          @if (showEditEmail()) {
            <div class="modal-overlay" (click)="closeEmailEditor()">
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>📧 修改郵箱</h3>
                  <button class="close-btn" (click)="closeEmailEditor()">×</button>
                </div>
                <div class="modal-body">
                  <div class="form-group">
                    <label>新郵箱地址</label>
                    <input type="email" [(ngModel)]="emailForm.newEmail" class="form-input" placeholder="請輸入新郵箱">
                  </div>
                  <div class="form-group">
                    <label>當前密碼（驗證身份）</label>
                    <input type="password" [(ngModel)]="emailForm.password" class="form-input" placeholder="請輸入當前密碼">
                  </div>
                  <p class="hint-text">⚠️ 修改郵箱需要驗證當前密碼</p>
                </div>
                <div class="modal-footer">
                  <button class="cancel-btn" (click)="closeEmailEditor()">取消</button>
                  <button class="save-btn" (click)="onSaveEmail()" [disabled]="isSavingEmail()">
                    @if (isSavingEmail()) {
                      <span class="btn-spinner"></span> 保存中...
                    } @else {
                      確認修改
                    }
                  </button>
                </div>
              </div>
            </div>
          }
          
          <!-- 🆕 顯示名稱編輯彈窗 -->
          @if (showEditDisplayName()) {
            <div class="modal-overlay" (click)="closeDisplayNameEditor()">
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>✏️ 修改顯示名稱</h3>
                  <button class="close-btn" (click)="closeDisplayNameEditor()">×</button>
                </div>
                <div class="modal-body">
                  <div class="form-group">
                    <label>顯示名稱</label>
                    <input type="text" [(ngModel)]="displayNameForm.newName" class="form-input" placeholder="請輸入顯示名稱" maxlength="30">
                  </div>
                  <p class="hint-text">💡 顯示名稱會在菜單欄和個人中心顯示，最多30個字符</p>
                </div>
                <div class="modal-footer">
                  <button class="cancel-btn" (click)="closeDisplayNameEditor()">取消</button>
                  <button class="save-btn" (click)="onSaveDisplayName()" [disabled]="isSavingDisplayName()">
                    @if (isSavingDisplayName()) {
                      <span class="btn-spinner"></span> 保存中...
                    } @else {
                      確認修改
                    }
                  </button>
                </div>
              </div>
            </div>
          }
          
          <div class="section-card">
            <h3 class="section-title">🔐 安全設置</h3>
            
            <div class="security-actions">
              <button (click)="showChangePassword.set(true)" class="action-btn">
                🔑 修改密碼
              </button>
              <button class="action-btn">
                📱 兩步驗證
              </button>
            </div>
            
            @if (showChangePassword()) {
              <div class="change-password-form">
                <div class="form-group">
                  <label>當前密碼</label>
                  <input type="password" [(ngModel)]="passwordForm.oldPassword" class="form-input">
                </div>
                <div class="form-group">
                  <label>新密碼</label>
                  <input type="password" [(ngModel)]="passwordForm.newPassword" class="form-input">
                </div>
                <div class="form-group">
                  <label>確認新密碼</label>
                  <input type="password" [(ngModel)]="passwordForm.confirmPassword" class="form-input">
                </div>
                <div class="form-actions">
                  <button (click)="showChangePassword.set(false)" class="cancel-btn">取消</button>
                  <button (click)="onChangePassword()" class="submit-btn">確認修改</button>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 卡密管理 -->
      @if (activeTab() === 'license') {
        <div class="tab-content">
          <div class="section-card">
            <h3 class="section-title">🎫 激活新卡密</h3>
            
            <div class="license-input-group">
              <input 
                type="text" 
                [(ngModel)]="newLicenseKey" 
                class="form-input font-mono"
                placeholder="XXXX-XXXX-XXXX-XXXX">
              <button (click)="onActivateLicense()" [disabled]="!newLicenseKey" class="activate-btn">
                激活
              </button>
            </div>
            <p class="hint-text">輸入購買的卡密以續費或升級會員</p>
          </div>
          
          <div class="section-card">
            <h3 class="section-title">📜 激活記錄</h3>
            
            <div class="license-history">
              @if (isLoadingHistory()) {
                <div class="loading-state">載入中...</div>
              } @else if (activationHistory().length === 0) {
                <div class="empty-state">暫無激活記錄</div>
              } @else {
                @for (record of activationHistory(); track record.id) {
                  <div class="history-item">
                    <div class="history-info">
                      <span class="license-code">{{ formatLicenseKey(record.license_key) }}</span>
                      <span class="license-type">{{ record.level_icon }} {{ record.level_name }} {{ record.duration_name }}</span>
                    </div>
                    <div class="history-meta">
                      <span>{{ formatActivationDate(record.activated_at) }} 激活</span>
                      <span class="status" [class.active]="record.is_active" [class.used]="!record.is_active">
                        {{ record.is_active ? '有效' : '已過期' }}
                      </span>
                    </div>
                  </div>
                }
              }
            </div>
          </div>
          
          <div class="section-card">
            <h3 class="section-title">🛒 購買卡密（王者榮耀等級）</h3>
            
            <div class="purchase-options">
              <div class="purchase-card silver">
                <div class="plan-name">🥈 白銀精英</div>
                <div class="plan-price">4.99 USDT/月</div>
                <ul class="plan-features">
                  <li>5 個帳號</li>
                  <li>每日 100 條消息</li>
                  <li>每日 50 次 AI</li>
                  <li>10 個群組</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card gold">
                <div class="plan-name">🥇 黃金大師</div>
                <div class="plan-price">19.9 USDT/月</div>
                <div class="recommended">推薦</div>
                <ul class="plan-features">
                  <li>15 個帳號</li>
                  <li>每日 500 條消息</li>
                  <li>每日 300 次 AI</li>
                  <li>批量操作</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card diamond">
                <div class="plan-name">💎 鑽石王牌</div>
                <div class="plan-price">59.9 USDT/月</div>
                <ul class="plan-features">
                  <li>50 個帳號</li>
                  <li>每日 2000 條消息</li>
                  <li>無限 AI 調用</li>
                  <li>AI 銷售漏斗</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card star">
                <div class="plan-name">🌟 星耀傳說</div>
                <div class="plan-price">199 USDT/月</div>
                <ul class="plan-features">
                  <li>100 個帳號</li>
                  <li>無限消息</li>
                  <li>團隊管理</li>
                  <li>智能防封</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card king">
                <div class="plan-name">👑 榮耀王者</div>
                <div class="plan-price">599 USDT/月</div>
                <ul class="plan-features">
                  <li>無限帳號</li>
                  <li>無限一切</li>
                  <li>API 接口</li>
                  <li>專屬顧問</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- 設備管理 -->
      @if (activeTab() === 'devices') {
        <div class="tab-content">
          <div class="section-card">
            <h3 class="section-title">💻 已綁定設備</h3>
            <p class="section-desc">
              您的會員等級最多可綁定 {{ getMaxDevices() }} 台設備，已使用 {{ devices().length }} 台
            </p>
            
            <div class="device-list">
              @for (device of devices(); track device.id) {
                <div class="device-item" [class.current]="device.isCurrent">
                  <div class="device-icon">
                    {{ getDeviceIcon(device) }}
                  </div>
                  <div class="device-info">
                    <div class="device-name">
                      {{ device.deviceName }}
                      @if (device.isCurrent) {
                        <span class="current-badge">本機</span>
                      }
                    </div>
                    <div class="device-code">{{ device.deviceCode }}</div>
                    <div class="device-meta">
                      綁定於 {{ formatDate(device.boundAt) }} · 
                      最後活動 {{ formatDate(device.lastSeen) }}
                    </div>
                  </div>
                  @if (!device.isCurrent) {
                    <button 
                      (click)="onUnbindDevice(device.id)" 
                      class="unbind-btn"
                      [disabled]="isUnbinding()">
                      解綁
                    </button>
                  }
                </div>
              } @empty {
                <div class="empty-state">
                  暫無綁定設備記錄
                </div>
              }
            </div>
          </div>
          
          <div class="section-card">
            <h3 class="section-title">📱 當前設備</h3>
            
            <div class="current-device-info">
              <div class="info-row">
                <span class="label">設備碼</span>
                <span class="value font-mono">{{ currentDeviceCode() }}</span>
                <button (click)="copyDeviceCode()" class="copy-btn">📋</button>
              </div>
              <div class="info-row">
                <span class="label">設備名稱</span>
                <span class="value">{{ currentDeviceName() }}</span>
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- 使用統計 -->
      @if (activeTab() === 'usage') {
        <div class="tab-content">
          <div class="section-card">
            <h3 class="section-title">📊 本月使用情況</h3>
            
            @if (usageStats()) {
              <div class="usage-grid">
                <div class="usage-item">
                  <div class="usage-icon">🤖</div>
                  <div class="usage-info">
                    <div class="usage-label">AI 調用</div>
                    <div class="usage-bar">
                      <div 
                        class="usage-fill" 
                        [style.width.%]="getUsagePercent(usageStats()!.aiCalls)">
                      </div>
                    </div>
                    <div class="usage-text">
                      {{ usageStats()!.aiCalls.used }} / {{ usageStats()!.aiCalls.limit }} 次
                    </div>
                  </div>
                </div>
                
                <div class="usage-item">
                  <div class="usage-icon">📨</div>
                  <div class="usage-info">
                    <div class="usage-label">消息發送</div>
                    <div class="usage-bar">
                      <div 
                        class="usage-fill" 
                        [style.width.%]="getUsagePercent(usageStats()!.messagesSent)">
                      </div>
                    </div>
                    <div class="usage-text">
                      {{ usageStats()!.messagesSent.used }} / {{ usageStats()!.messagesSent.limit }} 條
                    </div>
                  </div>
                </div>
                
                <div class="usage-item">
                  <div class="usage-icon">👥</div>
                  <div class="usage-info">
                    <div class="usage-label">帳號數量</div>
                    <div class="usage-bar">
                      <div 
                        class="usage-fill" 
                        [style.width.%]="getUsagePercent(usageStats()!.accounts)">
                      </div>
                    </div>
                    <div class="usage-text">
                      {{ usageStats()!.accounts.used }} / {{ usageStats()!.accounts.limit }} 個
                    </div>
                  </div>
                </div>
                
                <div class="usage-item">
                  <div class="usage-icon">💾</div>
                  <div class="usage-info">
                    <div class="usage-label">存儲空間</div>
                    <div class="usage-bar">
                      <div 
                        class="usage-fill" 
                        [style.width.%]="getUsagePercent(usageStats()!.storage)">
                      </div>
                    </div>
                    <div class="usage-text">
                      {{ usageStats()!.storage.used }} / {{ usageStats()!.storage.limit }} MB
                    </div>
                  </div>
                </div>
              </div>
            } @else {
              <div class="loading-state">載入中...</div>
            }
          </div>
          
          <div class="section-card">
            <h3 class="section-title">📈 歷史趨勢</h3>
            <p class="section-desc">敬請期待...</p>
          </div>
        </div>
      }
      
      <!-- 邀請獎勵 -->
      @if (activeTab() === 'invite') {
        <div class="tab-content">
          <div class="section-card highlight">
            <h3 class="section-title">🎁 邀請好友得獎勵</h3>
            <p class="section-desc">
              每邀請 1 位好友註冊並激活，您將獲得 <strong>3 天白銀精英</strong> 獎勵！
            </p>
            
            <div class="invite-code-box">
              <span class="invite-label">我的邀請碼</span>
              <div class="invite-code">{{ inviteCode() }}</div>
              <button (click)="copyInviteCode()" class="copy-btn">
                📋 複製
              </button>
            </div>
            
            <div class="invite-link-box">
              <span class="invite-label">邀請鏈接</span>
              <input type="text" [value]="inviteLink()" readonly class="invite-link-input">
              <button (click)="copyInviteLink()" class="copy-btn">
                📋 複製
              </button>
            </div>
          </div>
          
          <div class="section-card">
            <h3 class="section-title">📊 邀請統計</h3>
            
            <div class="invite-stats">
              <div class="stat-item">
                <div class="stat-value">{{ invitedCount() }}</div>
                <div class="stat-label">已邀請人數</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ rewardDays() }}</div>
                <div class="stat-label">獲得獎勵天數</div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1));
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .avatar-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
    }
    
    .username {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary, white);
      margin: 0;
    }
    
    .email {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      margin: 0.25rem 0;
    }
    
    .membership-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .membership-badge.level-bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); color: white; }
    .membership-badge.level-silver { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #1e293b; }
    .membership-badge.level-gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: #1e293b; }
    .membership-badge.level-diamond { background: linear-gradient(135deg, #B9F2FF, #06b6d4); color: #1e293b; }
    .membership-badge.level-star { background: linear-gradient(135deg, #9B59B6, #8E44AD); color: white; }
    .membership-badge.level-king { background: linear-gradient(135deg, #FF6B6B, #ee5a5a); color: white; }
    
    .expires {
      opacity: 0.8;
    }
    
    .logout-btn {
      padding: 0.5rem 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      color: #fca5a5;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .logout-btn:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
    }
    
    .logout-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .logout-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(239, 68, 68, 0.3);
      border-top-color: #ef4444;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    
    .tab-btn {
      padding: 0.5rem 1rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.5rem;
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
    }
    
    .tab-btn:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--text-primary, white);
    }
    
    .tab-btn.active {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-color: transparent;
      color: white;
    }
    
    .section-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    
    .section-card.highlight {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(59, 130, 246, 0.1));
      border-color: rgba(6, 182, 212, 0.3);
    }
    
    .section-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary, white);
      margin: 0 0 1rem 0;
    }
    
    .section-desc {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    
    .info-grid {
      display: grid;
      gap: 1rem;
    }
    
    .info-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.5rem;
    }
    
    .info-label {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      min-width: 80px;
    }
    
    .info-value {
      color: var(--text-primary, white);
      flex: 1;
    }
    
    .edit-btn, .copy-btn {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.25rem;
      color: var(--text-muted, #94a3b8);
      cursor: pointer;
      font-size: 0.75rem;
    }
    
    .edit-btn:hover, .copy-btn:hover {
      border-color: var(--primary, #06b6d4);
      color: var(--primary, #06b6d4);
    }
    
    .form-group {
      margin-bottom: 1rem;
    }
    
    .form-group label {
      display: block;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    
    .form-input {
      width: 100%;
      padding: 0.75rem;
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
    
    .device-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .device-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.75rem;
    }
    
    .device-item.current {
      border-color: var(--primary, #06b6d4);
      background: rgba(6, 182, 212, 0.1);
    }
    
    .device-icon {
      font-size: 1.5rem;
    }
    
    .device-info {
      flex: 1;
    }
    
    .device-name {
      font-weight: 500;
      color: var(--text-primary, white);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .current-badge {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
      background: var(--primary, #06b6d4);
      border-radius: 0.25rem;
      color: white;
    }
    
    .device-code {
      font-family: monospace;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    
    .device-meta {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin-top: 0.25rem;
    }
    
    .unbind-btn {
      padding: 0.375rem 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.375rem;
      color: #fca5a5;
      cursor: pointer;
      font-size: 0.75rem;
    }
    
    .usage-grid {
      display: grid;
      gap: 1rem;
    }
    
    .usage-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
    }
    
    .usage-icon {
      font-size: 1.5rem;
    }
    
    .usage-info {
      flex: 1;
    }
    
    .usage-label {
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    
    .usage-bar {
      height: 8px;
      background: var(--bg-primary, #0f172a);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #3b82f6);
      border-radius: 4px;
      transition: width 0.3s;
    }
    
    .usage-text {
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 0.25rem;
    }
    
    .invite-code-box, .invite-link-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
      margin-bottom: 1rem;
    }
    
    .invite-label {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      min-width: 80px;
    }
    
    .invite-code {
      font-family: monospace;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary, #06b6d4);
      flex: 1;
    }
    
    .invite-link-input {
      flex: 1;
      padding: 0.5rem;
      background: transparent;
      border: none;
      color: var(--text-secondary, #cbd5e1);
      font-size: 0.875rem;
    }
    
    .invite-stats {
      display: flex;
      gap: 2rem;
      justify-content: center;
      padding: 1rem;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--primary, #06b6d4);
    }
    
    .stat-label {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
    }
    
    .purchase-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }
    
    .purchase-card {
      padding: 1.5rem;
      border-radius: 1rem;
      text-align: center;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }
    
    .purchase-card.silver { background: linear-gradient(135deg, rgba(192, 192, 192, 0.1), rgba(168, 168, 168, 0.1)); border-color: rgba(192, 192, 192, 0.3); }
    .purchase-card.gold { background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1)); border-color: rgba(255, 215, 0, 0.3); }
    .purchase-card.diamond { background: linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(185, 242, 255, 0.1)); border-color: rgba(6, 182, 212, 0.4); }
    .purchase-card.star { background: linear-gradient(135deg, rgba(155, 89, 182, 0.1), rgba(142, 68, 173, 0.1)); border-color: rgba(155, 89, 182, 0.3); }
    .purchase-card.king { background: linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(238, 90, 90, 0.1)); border-color: rgba(255, 107, 107, 0.4); }
    
    .recommended {
      position: absolute;
      top: -8px;
      right: -8px;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: white;
      font-size: 0.625rem;
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-weight: 600;
    }
    
    .purchase-card {
      position: relative;
    }
    
    .plan-name {
      font-weight: 600;
      color: var(--text-primary, white);
      margin-bottom: 0.5rem;
    }
    
    .plan-price {
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--primary, #06b6d4);
      margin-bottom: 1rem;
    }
    
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 1rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }
    
    .plan-features li {
      padding: 0.25rem 0;
    }
    
    .buy-btn {
      padding: 0.5rem 1.5rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      cursor: pointer;
      font-weight: 500;
    }
    
    .license-input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    
    .license-input-group .form-input {
      flex: 1;
      font-family: monospace;
    }
    
    .activate-btn {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }
    
    .activate-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }
    
    .activate-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .hint-text {
      color: var(--text-muted, #94a3b8);
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    
    .empty-state, .loading-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted, #94a3b8);
    }
    
    /* 🆕 加載中遮罩 */
    .loading-overlay {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 1.5rem;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.2);
      border-radius: 1rem;
      margin-bottom: 1rem;
      color: var(--primary, #06b6d4);
    }
    
    .loading-overlay .loading-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(6, 182, 212, 0.3);
      border-top-color: #06b6d4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    /* 🆕 錯誤提示 */
    .error-alert {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      color: #fca5a5;
      margin-bottom: 1rem;
    }
    
    .error-icon {
      font-size: 1.25rem;
    }
    
    .retry-btn {
      margin-left: auto;
      padding: 0.375rem 0.75rem;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 0.375rem;
      color: #fca5a5;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .retry-btn:hover {
      background: rgba(239, 68, 68, 0.3);
    }
    
    /* 🆕 用戶ID樣式 */
    .user-id {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .id-text {
      font-family: monospace;
      font-weight: 600;
      color: var(--primary, #06b6d4);
    }
    
    .copy-id-btn {
      padding: 0.25rem 0.5rem;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
    }
    
    .copy-id-btn:hover {
      background: rgba(6, 182, 212, 0.2);
      border-color: rgba(6, 182, 212, 0.5);
    }
    
    /* 🆕 用戶名樣式 */
    .username-value {
      font-family: monospace;
      color: var(--text-secondary, #94a3b8);
    }
    
    .info-hint {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin-left: 0.5rem;
    }
    
    /* 🆕 郵箱編輯彈窗樣式 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    }
    
    .modal-content {
      background: var(--bg-card, #1e293b);
      border-radius: 1rem;
      width: 100%;
      max-width: 420px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .modal-header h3 {
      margin: 0;
      font-size: 1.125rem;
      color: var(--text-primary, white);
    }
    
    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-muted, #94a3b8);
      font-size: 1.25rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .close-btn:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .modal-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      justify-content: flex-end;
    }
    
    .cancel-btn {
      padding: 0.625rem 1.25rem;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.5rem;
      color: var(--text-secondary, #cbd5e1);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .cancel-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .save-btn {
      padding: 0.625rem 1.25rem;
      background: linear-gradient(135deg, #06b6d4, #0891b2);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .save-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
    }
    
    .save-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-spinner {
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
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private authEvents = inject(AuthEventsService);  // 🆕 用於廣播用戶更新
  private membershipService = inject(MembershipService);  // 🔧 P0: 統一會員服務
  private deviceService = inject(DeviceService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private licenseClient = inject(LicenseClientService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  
  // 用於清理事件監聽
  private membershipUpdateHandler: ((event: Event) => void) | null = null;
  
  // 狀態
  activeTab = signal<ProfileTab>('account');
  showChangePassword = signal(false);
  showEditEmail = signal(false);  // 🆕 郵箱編輯彈窗
  showEditDisplayName = signal(false);  // 🆕 顯示名稱編輯彈窗
  isUnbinding = signal(false);
  isLoggingOut = signal(false);  // 🆕 登出動畫狀態
  isSavingEmail = signal(false);  // 🆕 保存郵箱狀態
  isSavingDisplayName = signal(false);  // 🆕 保存顯示名稱狀態
  
  // 表單
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  emailForm = { newEmail: '', password: '' };  // 🆕 郵箱編輯表單
  displayNameForm = { newName: '' };  // 🆕 顯示名稱編輯表單
  newLicenseKey = '';
  
  // 計算屬性
  // 🔧 P0 修復：使用 MembershipService 作為會員等級的單一數據源
  user = computed(() => this.authService.user());
  membershipLevel = computed(() => this.membershipService.level());
  membershipDaysLeft = computed(() => this.membershipService.daysRemaining());
  devices = computed(() => this.authService.devices());
  usageStats = computed(() => this.authService.usageStats());
  
  currentDeviceCode = signal('');
  currentDeviceName = signal('');
  
  inviteCode = signal('');
  invitedCount = signal(0);
  rewardDays = signal(0);
  
  // 激活記錄
  activationHistory = signal<any[]>([]);
  isLoadingHistory = signal(false);
  
  inviteLink = computed(() => {
    return `https://tg-matrix.com/invite?code=${this.inviteCode()}`;
  });
  
  // 🆕 加載狀態
  isLoadingUser = signal(false);
  userLoadError = signal<string | null>(null);
  
  async ngOnInit(): Promise<void> {
    // 🔧 修復：確保用戶信息已加載
    await this.ensureUserLoaded();
    
    this.currentDeviceCode.set(await this.deviceService.getDeviceCode());
    this.currentDeviceName.set(this.deviceService.getDeviceName());
    
    // 載入邀請獎勵信息
    const rewards = await this.authService.getInviteRewards();
    this.inviteCode.set(rewards.inviteCode);
    this.invitedCount.set(rewards.invitedCount);
    this.rewardDays.set(rewards.rewardDays);
    
    // 載入激活記錄
    await this.loadActivationHistory();
    
    // 監聽會員狀態更新事件
    this.membershipUpdateHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[ProfileComponent] 收到會員狀態更新事件:', customEvent.detail);
      // 強制觸發變更檢測以刷新 UI
      this.cdr.detectChanges();
    };
    window.addEventListener('membership-updated', this.membershipUpdateHandler);
  }
  
  ngOnDestroy(): void {
    // 清理事件監聽
    if (this.membershipUpdateHandler) {
      window.removeEventListener('membership-updated', this.membershipUpdateHandler);
    }
  }
  
  /**
   * 🔧 P0 修復：確保用戶信息已加載且是最新的
   * 總是從後端刷新，確保數據一致性
   */
  async ensureUserLoaded(): Promise<void> {
    this.isLoadingUser.set(true);
    this.userLoadError.set(null);
    
    try {
      // 🔧 P0 修復：總是從後端刷新，不使用緩存
      // 解決菜單欄和用戶信息頁數據不一致的問題
      console.log('[Profile] Fetching fresh user info from backend...');
      const user = await this.authService.fetchCurrentUser();
      
      if (user) {
        console.log('[Profile] User loaded successfully:', user.username, 'Level:', user.membershipLevel);
        // 🆕 廣播用戶更新事件，通知所有服務同步（包括 core/auth.service.ts）
        this.authEvents.emitUserUpdate(user);
      } else {
        console.warn('[Profile] No user returned from API');
        this.userLoadError.set('無法獲取用戶信息');
      }
    } catch (error: any) {
      console.error('[Profile] Failed to load user:', error);
      this.userLoadError.set(error.message || '加載失敗');
    } finally {
      this.isLoadingUser.set(false);
      this.cdr.detectChanges();
    }
  }
  
  async loadActivationHistory(): Promise<void> {
    this.isLoadingHistory.set(true);
    try {
      const result = await this.licenseClient.getActivationHistory(50, 0);
      if (result.success && result.data) {
        this.activationHistory.set(result.data);
      }
    } catch (error) {
      console.error('載入激活記錄失敗:', error);
    } finally {
      this.isLoadingHistory.set(false);
    }
  }
  
  getMembershipIcon(): string {
    const icons: Record<string, string> = {
      bronze: '⚔️',
      silver: '🥈',
      gold: '🥇',
      diamond: '💎',
      star: '🌟',
      king: '👑'
    };
    return icons[this.membershipLevel()] || '⚔️';
  }
  
  getMembershipName(): string {
    const level = this.membershipLevel();
    return this.i18n.t(`membershipLevels.${level}`) || this.i18n.t('membershipLevels.bronze');
  }
  
  getMaxDevices(): number {
    const limits: Record<string, number> = {
      bronze: 1,
      silver: 2,
      gold: 3,
      diamond: 4,
      star: 5,
      king: -1 // 無限
    };
    return limits[this.membershipLevel()] || 1;
  }
  
  getDeviceIcon(device: DeviceInfo): string {
    if (device.deviceName.includes('Windows')) return '💻';
    if (device.deviceName.includes('Mac')) return '🖥️';
    if (device.deviceName.includes('Linux')) return '🐧';
    return '📱';
  }
  
  getUsagePercent(usage: { used: number; limit: number }): number {
    return Math.min(100, (usage.used / usage.limit) * 100);
  }
  
  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  }
  
  async onLogout(): Promise<void> {
    console.log('[Profile] Logging out...');
    // 🆕 顯示登出動畫
    this.isLoggingOut.set(true);
    
    // 等待動畫顯示
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 🆕 事件驅動：只需調用 logout，事件會自動廣播到所有服務
    await this.authService.logout();
    // logout() 內部已處理跳轉
  }
  
  async onChangePassword(): Promise<void> {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.toast.error('兩次輸入的密碼不一致');
      return;
    }
    
    const result = await this.authService.changePassword(
      this.passwordForm.oldPassword,
      this.passwordForm.newPassword
    );
    
    if (result.success) {
      this.toast.success('密碼修改成功');
      this.showChangePassword.set(false);
      this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
    } else {
      this.toast.error(result.message);
    }
  }
  
  async onActivateLicense(): Promise<void> {
    const result = await this.authService.renewMembership(this.newLicenseKey);
    
    if (result.success) {
      this.toast.success(result.message || '卡密激活成功！');
      this.newLicenseKey = '';
      // 重新載入激活記錄
      await this.loadActivationHistory();
      // 強制刷新 UI
      this.cdr.detectChanges();
    } else {
      this.toast.error(result.message);
    }
  }
  
  formatLicenseKey(key: string): string {
    if (!key) return '';
    // 顯示前12個字符，後4個字符用****代替
    if (key.length > 16) {
      return key.substring(0, 12) + '-****';
    }
    return key;
  }
  
  formatActivationDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW');
  }
  
  async onUnbindDevice(deviceId: number): Promise<void> {
    this.isUnbinding.set(true);
    
    const result = await this.authService.unbindDevice(deviceId);
    
    if (result.success) {
      this.toast.success('設備已解綁');
    } else {
      this.toast.error(result.message);
    }
    
    this.isUnbinding.set(false);
  }
  
  copyDeviceCode(): void {
    navigator.clipboard.writeText(this.currentDeviceCode());
    this.toast.success('設備碼已複製');
  }
  
  copyInviteCode(): void {
    navigator.clipboard.writeText(this.inviteCode());
    this.toast.success('邀請碼已複製');
  }
  
  copyInviteLink(): void {
    navigator.clipboard.writeText(this.inviteLink());
    this.toast.success('邀請鏈接已複製');
  }
  
  // 🆕 複製 Telegram ID
  copyTelegramId(): void {
    const telegramId = this.user()?.telegramId;
    if (telegramId) {
      navigator.clipboard.writeText(telegramId);
      this.toast.success('Telegram ID 已複製');
    }
  }
  
  // 🆕 打開郵箱編輯彈窗
  openEmailEditor(): void {
    this.emailForm = { newEmail: this.user()?.email || '', password: '' };
    this.showEditEmail.set(true);
  }
  
  // 🆕 關閉郵箱編輯彈窗
  closeEmailEditor(): void {
    this.showEditEmail.set(false);
    this.emailForm = { newEmail: '', password: '' };
  }
  
  // 🆕 保存郵箱
  async onSaveEmail(): Promise<void> {
    const newEmail = this.emailForm.newEmail.trim();
    const password = this.emailForm.password;
    
    // 驗證郵箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail) {
      this.toast.error('請輸入郵箱地址');
      return;
    }
    if (!emailRegex.test(newEmail)) {
      this.toast.error('郵箱格式不正確');
      return;
    }
    if (!password) {
      this.toast.error('請輸入當前密碼以驗證身份');
      return;
    }
    
    this.isSavingEmail.set(true);
    
    try {
      const result = await this.authService.updateEmail(newEmail, password);
      
      if (result.success) {
        this.toast.success(result.message || '郵箱更新成功');
        this.closeEmailEditor();
        // 刷新用戶信息
        await this.authService.fetchCurrentUser();
        this.cdr.detectChanges();
      } else {
        this.toast.error(result.message || '郵箱更新失敗');
      }
    } catch (error: any) {
      this.toast.error(error.message || '郵箱更新失敗');
    } finally {
      this.isSavingEmail.set(false);
    }
  }
  
  // 🆕 打開顯示名稱編輯彈窗
  openDisplayNameEditor(): void {
    this.displayNameForm = { newName: this.user()?.displayName || '' };
    this.showEditDisplayName.set(true);
  }
  
  // 🆕 關閉顯示名稱編輯彈窗
  closeDisplayNameEditor(): void {
    this.showEditDisplayName.set(false);
    this.displayNameForm = { newName: '' };
  }
  
  // 🆕 保存顯示名稱
  async onSaveDisplayName(): Promise<void> {
    const newName = this.displayNameForm.newName.trim();
    
    if (!newName) {
      this.toast.error('請輸入顯示名稱');
      return;
    }
    if (newName.length > 30) {
      this.toast.error('顯示名稱最多30個字符');
      return;
    }
    
    this.isSavingDisplayName.set(true);
    
    try {
      const result = await this.authService.updateDisplayName(newName);
      
      if (result.success) {
        this.toast.success(result.message || '顯示名稱更新成功');
        this.closeDisplayNameEditor();
        // 刷新用戶信息
        await this.authService.fetchCurrentUser();
        this.cdr.detectChanges();
      } else {
        this.toast.error(result.message || '顯示名稱更新失敗');
      }
    } catch (error: any) {
      this.toast.error(error.message || '顯示名稱更新失敗');
    } finally {
      this.isSavingDisplayName.set(false);
    }
  }
}
