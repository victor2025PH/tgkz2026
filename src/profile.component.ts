/**
 * 個人中心組件
 * 用戶信息、卡密管理、設備管理、使用統計、邀請獎勵
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, DeviceInfo, UsageStats } from './auth.service';
import { DeviceService } from './device.service';
import { I18nService } from './i18n.service';
import { ToastService } from './toast.service';
import { LicenseClientService } from './license-client.service';

type ProfileTab = 'account' | 'license' | 'devices' | 'usage' | 'invite';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="profile-container">
      <!-- 用戶頭部信息 -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar">
            {{ user()?.username?.charAt(0).toUpperCase() || '?' }}
          </div>
          <div class="user-info">
            <h2 class="username">{{ user()?.username || '未登入' }}</h2>
            <p class="email">{{ user()?.email || '未設置郵箱' }}</p>
            <div class="membership-badge" [class]="'level-' + membershipLevel()">
              {{ getMembershipIcon() }} {{ getMembershipName() }}
              @if (membershipDaysLeft() > 0) {
                <span class="expires">· 剩餘 {{ membershipDaysLeft() }} 天</span>
              }
            </div>
          </div>
        </div>
        <button (click)="onLogout()" class="logout-btn">
          🚪 登出
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
                <span class="info-label">用戶名</span>
                <span class="info-value">{{ user()?.username }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">郵箱</span>
                <span class="info-value">{{ user()?.email || '未設置' }}</span>
                <button class="edit-btn">編輯</button>
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
                <div class="plan-price">9.9 USDT/月</div>
                <ul class="plan-features">
                  <li>5 個帳號</li>
                  <li>每日 50 條消息</li>
                  <li>每日 50 次 AI</li>
                  <li>10 個群組</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card gold">
                <div class="plan-name">🥇 黃金大師</div>
                <div class="plan-price">29.9 USDT/月</div>
                <ul class="plan-features">
                  <li>15 個帳號</li>
                  <li>每日 200 條消息</li>
                  <li>每日 200 次 AI</li>
                  <li>批量操作</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card diamond">
                <div class="plan-name">💎 鑽石王牌</div>
                <div class="plan-price">99.9 USDT/月</div>
                <div class="recommended">推薦</div>
                <ul class="plan-features">
                  <li>50 個帳號</li>
                  <li>每日 1000 條消息</li>
                  <li>無限 AI 調用</li>
                  <li>AI 銷售漏斗</li>
                </ul>
                <button class="buy-btn">購買</button>
              </div>
              
              <div class="purchase-card star">
                <div class="plan-name">🌟 星耀傳說</div>
                <div class="plan-price">299 USDT/月</div>
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
                <div class="plan-price">999 USDT/月</div>
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
    
    .logout-btn:hover {
      background: rgba(239, 68, 68, 0.2);
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
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private deviceService = inject(DeviceService);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);
  private licenseClient = inject(LicenseClientService);
  private cdr = inject(ChangeDetectorRef);
  
  // 用於清理事件監聽
  private membershipUpdateHandler: ((event: Event) => void) | null = null;
  
  // 狀態
  activeTab = signal<ProfileTab>('account');
  showChangePassword = signal(false);
  isUnbinding = signal(false);
  
  // 表單
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  newLicenseKey = '';
  
  // 計算屬性
  user = computed(() => this.authService.user());
  membershipLevel = computed(() => this.authService.membershipLevel());
  membershipDaysLeft = computed(() => this.authService.membershipDaysLeft());
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
  
  async ngOnInit(): Promise<void> {
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
    const names: Record<string, string> = {
      bronze: '青銅戰士',
      silver: '白銀精英',
      gold: '黃金大師',
      diamond: '鑽石王牌',
      star: '星耀傳說',
      king: '榮耀王者'
    };
    return names[this.membershipLevel()] || '青銅戰士';
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
    await this.authService.logout();
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
}
