/**
 * 用戶設置頁面
 * 
 * 優化設計：
 * 1. 標籤頁組織（個人資料、安全、會話、API）
 * 2. 即時驗證和保存
 * 3. 會話管理
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../core/auth.service';
import { I18nService } from '../i18n.service';

type TabId = 'profile' | 'security' | 'sessions' | 'apiKeys';

@Component({
  selector: 'app-user-settings-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="user-settings-page">
      <header class="page-header">
        <h1>{{ t('userSettings.title') }}</h1>
      </header>
      
      <div class="settings-container">
        <!-- 側邊標籤 -->
        <nav class="settings-nav">
          @for (tab of tabs; track tab.id) {
            <button 
              class="nav-item" 
              [class.active]="activeTab() === tab.id"
              (click)="activeTab.set(tab.id)"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <span class="nav-label">{{ t(tab.label) }}</span>
            </button>
          }
        </nav>
        
        <!-- 內容區域 -->
        <div class="settings-content">
          <!-- 個人資料 -->
          @if (activeTab() === 'profile') {
            <div class="settings-section">
              <h2>{{ t('userSettings.profile') }}</h2>
              
              <div class="form-group">
                <label>{{ t('auth.email') }}</label>
                <input 
                  type="email" 
                  [value]="user()?.email || ''" 
                  disabled 
                  class="input-disabled"
                />
                <span class="hint">郵箱無法更改</span>
              </div>
              
              <div class="form-group">
                <label>{{ t('auth.username') }}</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileForm.username"
                  [placeholder]="t('auth.usernamePlaceholder')"
                />
              </div>
              
              <div class="form-group">
                <label>{{ t('userSettings.displayName') }}</label>
                <input 
                  type="text" 
                  [(ngModel)]="profileForm.display_name"
                  placeholder="您的顯示名稱"
                />
              </div>
              
              <div class="form-group">
                <label>{{ t('userSettings.avatarUrl') }}</label>
                <input 
                  type="url" 
                  [(ngModel)]="profileForm.avatar_url"
                  placeholder="https://..."
                />
              </div>
              
              <button 
                class="btn-primary" 
                (click)="saveProfile()"
                [disabled]="isSaving()"
              >
                @if (isSaving()) {
                  <span class="loading-spinner"></span>
                }
                {{ t('userSettings.updateProfile') }}
              </button>
              
              @if (saveSuccess()) {
                <span class="success-message">✅ 已保存</span>
              }
            </div>
          }
          
          <!-- 安全設置 -->
          @if (activeTab() === 'security') {
            <div class="settings-section">
              <h2>{{ t('userSettings.security') }}</h2>
              
              <div class="security-item">
                <div class="item-info">
                  <h3>{{ t('auth.changePassword') }}</h3>
                  <p>定期更換密碼以保護帳戶安全</p>
                </div>
                <button 
                  class="btn-secondary"
                  (click)="showPasswordForm.set(!showPasswordForm())"
                >
                  {{ showPasswordForm() ? '取消' : '修改' }}
                </button>
              </div>
              
              @if (showPasswordForm()) {
                <div class="password-form">
                  <div class="form-group">
                    <label>{{ t('auth.currentPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.currentPassword"
                      autocomplete="current-password"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>{{ t('auth.newPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.newPassword"
                      autocomplete="new-password"
                    />
                  </div>
                  
                  <div class="form-group">
                    <label>{{ t('auth.confirmNewPassword') }}</label>
                    <input 
                      type="password" 
                      [(ngModel)]="passwordForm.confirmPassword"
                      autocomplete="new-password"
                    />
                  </div>
                  
                  @if (passwordError()) {
                    <div class="error-message">{{ passwordError() }}</div>
                  }
                  
                  <button 
                    class="btn-primary"
                    (click)="changePassword()"
                    [disabled]="isChangingPassword()"
                  >
                    @if (isChangingPassword()) {
                      <span class="loading-spinner"></span>
                    }
                    確認修改
                  </button>
                </div>
              }
              
              <div class="security-item">
                <div class="item-info">
                  <h3>兩步驗證</h3>
                  <p>增加帳戶安全性</p>
                </div>
                <span class="badge">即將推出</span>
              </div>
            </div>
          }
          
          <!-- 登入設備 -->
          @if (activeTab() === 'sessions') {
            <div class="settings-section">
              <div class="section-header">
                <div>
                  <h2>{{ t('auth.sessions') }}</h2>
                  <p class="section-desc">管理您在各設備上的登入狀態</p>
                </div>
                <button class="btn-refresh" (click)="loadSessions()" [disabled]="isLoadingSessions()">
                  <span [class.spinning]="isLoadingSessions()">🔄</span>
                </button>
              </div>
              
              <!-- 🆕 設備統計 -->
              <div class="device-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ sessions().length }}</span>
                  <span class="stat-label">已登入設備</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ getActiveDevicesCount() }}</span>
                  <span class="stat-label">最近活躍</span>
                </div>
              </div>
              
              @if (isLoadingSessions()) {
                <div class="loading-state">
                  <div class="loading-spinner"></div>
                  <span>載入設備列表...</span>
                </div>
              } @else {
                <div class="sessions-list">
                  @for (session of sessions(); track session.id) {
                    <div class="session-item" [class.current]="session.is_current">
                      <div class="session-icon" [class]="'device-' + (session.device_type || 'unknown')">
                        {{ getDeviceIcon(session.device_type) }}
                      </div>
                      <div class="session-info">
                        <div class="session-header">
                          <strong>{{ session.device_name || '未知設備' }}</strong>
                          @if (session.is_current) {
                            <span class="current-badge">✓ 當前設備</span>
                          }
                        </div>
                        <div class="session-details">
                          <span class="detail-item">
                            <span class="detail-icon">🌐</span>
                            {{ session.browser || '未知瀏覽器' }}
                          </span>
                          <span class="detail-item">
                            <span class="detail-icon">📍</span>
                            {{ session.location || formatIpAddress(session.ip_address) }}
                          </span>
                        </div>
                        <span class="session-time">
                          @if (session.is_current) {
                            目前在線
                          } @else {
                            最後活動: {{ formatRelativeTime(session.last_activity_at) }}
                          }
                        </span>
                      </div>
                      @if (!session.is_current) {
                        <button 
                          class="btn-revoke"
                          (click)="confirmRevokeSession(session)"
                          [disabled]="revokingSessionId() === session.id"
                        >
                          @if (revokingSessionId() === session.id) {
                            <span class="btn-spinner"></span>
                          } @else {
                            登出
                          }
                        </button>
                      }
                    </div>
                  } @empty {
                    <div class="empty-state">
                      <span class="empty-icon">📱</span>
                      <p>沒有找到登入設備</p>
                    </div>
                  }
                </div>
                
                @if (sessions().length > 1) {
                  <div class="session-actions">
                    <button 
                      class="btn-danger-outline"
                      (click)="confirmRevokeAllSessions()"
                    >
                      🚫 {{ t('userSettings.revokeAllSessions') }}
                    </button>
                    <p class="action-hint">這將登出除當前設備外的所有其他設備</p>
                  </div>
                }
              }
            </div>
          }
          
          <!-- API 金鑰 -->
          @if (activeTab() === 'apiKeys') {
            <div class="settings-section">
              <h2>{{ t('userSettings.apiKeys') }}</h2>
              <p class="section-desc">用於程序化訪問 TG-Matrix API</p>
              
              <div class="api-keys-list">
                @for (key of apiKeys(); track key.id) {
                  <div class="api-key-item">
                    <div class="key-info">
                      <strong>{{ key.name }}</strong>
                      <code>{{ key.prefix }}...****</code>
                      <span class="key-meta">
                        {{ t('userSettings.lastUsed') }}: 
                        {{ key.last_used_at ? formatDate(key.last_used_at) : t('userSettings.neverUsed') }}
                      </span>
                    </div>
                    <button 
                      class="btn-danger-small"
                      (click)="deleteApiKey(key.id)"
                    >
                      {{ t('userSettings.deleteApiKey') }}
                    </button>
                  </div>
                } @empty {
                  <p class="empty-state">暫無 API 金鑰</p>
                }
              </div>
              
              <button class="btn-secondary" (click)="createApiKey()">
                + {{ t('userSettings.createApiKey') }}
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-settings-page {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
    }
    
    .settings-container {
      display: flex;
      gap: 2rem;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      overflow: hidden;
    }
    
    /* 側邊導航 */
    .settings-nav {
      width: 240px;
      padding: 1rem;
      background: var(--bg-tertiary, #151515);
      border-right: 1px solid var(--border-color, #333);
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
      padding: 0.75rem 1rem;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: left;
    }
    
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary, #fff);
    }
    
    .nav-item.active {
      background: var(--primary, #3b82f6);
      color: white;
    }
    
    .nav-icon {
      font-size: 1.25rem;
    }
    
    /* 內容區域 */
    .settings-content {
      flex: 1;
      padding: 2rem;
    }
    
    .settings-section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .section-desc {
      color: var(--text-secondary, #888);
      margin-bottom: 1.5rem;
    }
    
    /* 表單 */
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary, #aaa);
      margin-bottom: 0.5rem;
    }
    
    .form-group input {
      width: 100%;
      max-width: 400px;
      padding: 0.75rem 1rem;
      background: var(--bg-primary, #0f0f0f);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      font-size: 0.875rem;
    }
    
    .form-group input:focus {
      outline: none;
      border-color: var(--primary, #3b82f6);
    }
    
    .input-disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .hint {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted, #666);
      margin-top: 0.25rem;
    }
    
    /* 按鈕 */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: var(--primary, #3b82f6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: var(--primary-hover, #2563eb);
    }
    
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      padding: 0.5rem 1rem;
      background: transparent;
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-hover, #444);
    }
    
    .btn-danger-small {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.5);
      border-radius: 6px;
      color: #f87171;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn-danger-small:hover {
      background: rgba(239, 68, 68, 0.1);
    }
    
    .btn-danger {
      padding: 0.75rem 1.5rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #f87171;
      font-size: 0.875rem;
      cursor: pointer;
      margin-top: 1rem;
    }
    
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }
    
    /* 安全設置 */
    .security-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: var(--bg-primary, #0f0f0f);
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    .item-info h3 {
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }
    
    .item-info p {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    .password-form {
      padding: 1rem;
      background: var(--bg-primary, #0f0f0f);
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    
    /* 會話列表 */
    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    
    .session-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-primary, #0f0f0f);
      border-radius: 8px;
      border: 1px solid transparent;
    }
    
    .session-item.current {
      border-color: var(--primary, #3b82f6);
    }
    
    .session-icon {
      font-size: 1.5rem;
    }
    
    .session-info {
      flex: 1;
    }
    
    .session-info strong {
      display: block;
      font-size: 0.875rem;
    }
    
    .session-meta {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    .current-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 4px;
      font-size: 0.625rem;
      color: white;
      margin-left: 0.5rem;
    }

    /* 🆕 增強的設備管理樣式 */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
    }

    .btn-refresh {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      padding: 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: var(--bg-primary, #0f0f0f);
      border-color: var(--primary, #3b82f6);
    }

    .btn-refresh .spinning {
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .device-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-item {
      background: var(--bg-primary, #0f0f0f);
      border-radius: 12px;
      padding: 1rem;
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }

    .session-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: var(--bg-primary, #0f0f0f);
      border-radius: 12px;
      border: 1px solid transparent;
      transition: all 0.2s;
    }

    .session-item:hover {
      border-color: var(--border-color, #333);
    }

    .session-item.current {
      border-color: #10b981;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent);
    }

    .session-icon {
      font-size: 2rem;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
    }

    .session-icon.device-desktop { background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1)); }
    .session-icon.device-mobile { background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1)); }
    .session-icon.device-web { background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1)); }

    .session-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .session-info strong {
      font-size: 0.95rem;
    }

    .session-details {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      color: var(--text-secondary, #888);
    }

    .detail-icon {
      font-size: 0.9rem;
    }

    .session-time {
      font-size: 0.75rem;
      color: var(--text-muted, #666);
    }

    .btn-revoke {
      background: transparent;
      border: 1px solid #f87171;
      color: #f87171;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      min-width: 60px;
    }

    .btn-revoke:hover {
      background: rgba(248, 113, 113, 0.1);
    }

    .btn-revoke:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(248, 113, 113, 0.3);
      border-top-color: #f87171;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .session-actions {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-color, #333);
      text-align: center;
    }

    .btn-danger-outline {
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .btn-danger-outline:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    .action-hint {
      font-size: 0.75rem;
      color: var(--text-muted, #666);
      margin-top: 0.5rem;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: var(--text-secondary, #888);
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem;
      color: var(--text-secondary, #888);
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--border-color, #333);
      border-top-color: var(--primary, #3b82f6);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    /* API 金鑰 */
    .api-keys-list {
      margin-bottom: 1rem;
    }
    
    .api-key-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: var(--bg-primary, #0f0f0f);
      border-radius: 8px;
      margin-bottom: 0.75rem;
    }
    
    .key-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .key-info code {
      font-family: monospace;
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
    }
    
    .key-meta {
      font-size: 0.75rem;
      color: var(--text-muted, #666);
    }
    
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary, #888);
    }
    
    /* 狀態 */
    .loading-spinner {
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
    
    .success-message {
      margin-left: 1rem;
      color: #4ade80;
      font-size: 0.875rem;
    }
    
    .error-message {
      padding: 0.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 4px;
      color: #f87171;
      font-size: 0.875rem;
      margin-bottom: 1rem;
    }
    
    .badge {
      padding: 0.25rem 0.75rem;
      background: var(--bg-tertiary, #252525);
      border-radius: 4px;
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    .loading-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary, #888);
    }
    
    @media (max-width: 768px) {
      .settings-container {
        flex-direction: column;
      }
      
      .settings-nav {
        width: 100%;
        flex-direction: row;
        overflow-x: auto;
        border-right: none;
        border-bottom: 1px solid var(--border-color, #333);
      }
    }
  `]
})
export class UserSettingsViewComponent implements OnInit {
  private authService = inject(AuthService);
  private i18n = inject(I18nService);
  
  // 標籤配置
  tabs: { id: TabId; icon: string; label: string }[] = [
    { id: 'profile', icon: '👤', label: 'userSettings.profile' },
    { id: 'security', icon: '🔒', label: 'userSettings.security' },
    { id: 'sessions', icon: '📱', label: 'auth.sessions' },
    { id: 'apiKeys', icon: '🔑', label: 'userSettings.apiKeys' }
  ];
  
  // 狀態
  activeTab = signal<TabId>('profile');
  user = this.authService.user;
  
  // 個人資料表單
  profileForm = {
    username: '',
    display_name: '',
    avatar_url: ''
  };
  isSaving = signal(false);
  saveSuccess = signal(false);
  
  // 密碼表單
  showPasswordForm = signal(false);
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = signal(false);
  passwordError = signal<string | null>(null);
  
  // 會話
  sessions = signal<any[]>([]);
  isLoadingSessions = signal(false);
  revokingSessionId = signal<string | null>(null);
  
  // API 金鑰
  apiKeys = signal<any[]>([]);
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    // 初始化表單
    const user = this.user();
    if (user) {
      this.profileForm = {
        username: user.username || '',
        display_name: user.display_name || '',
        avatar_url: user.avatar_url || ''
      };
    }
    
    // 加載會話
    this.loadSessions();
  }
  
  async saveProfile() {
    this.isSaving.set(true);
    this.saveSuccess.set(false);
    
    try {
      const result = await this.authService.updateProfile(this.profileForm);
      if (result.success) {
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
      }
    } finally {
      this.isSaving.set(false);
    }
  }
  
  async changePassword() {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError.set('新密碼不匹配');
      return;
    }
    
    this.isChangingPassword.set(true);
    this.passwordError.set(null);
    
    try {
      const result = await this.authService.changePassword(
        this.passwordForm.currentPassword,
        this.passwordForm.newPassword
      );
      
      if (result.success) {
        this.showPasswordForm.set(false);
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
      } else {
        this.passwordError.set(result.error || '修改失敗');
      }
    } finally {
      this.isChangingPassword.set(false);
    }
  }
  
  async loadSessions() {
    this.isLoadingSessions.set(true);
    try {
      const sessions = await this.authService.getSessions();
      this.sessions.set(sessions);
    } finally {
      this.isLoadingSessions.set(false);
    }
  }
  
  async revokeSession(sessionId: string) {
    const success = await this.authService.revokeSession(sessionId);
    if (success) {
      this.sessions.update(sessions => sessions.filter(s => s.id !== sessionId));
    }
  }
  
  /**
   * 🆕 確認登出單個設備
   */
  async confirmRevokeSession(session: any) {
    const deviceName = session.device_name || '未知設備';
    if (!confirm(`確定要登出「${deviceName}」嗎？\n\n該設備將需要重新登入才能使用。`)) {
      return;
    }
    
    this.revokingSessionId.set(session.id);
    try {
      await this.revokeSession(session.id);
    } finally {
      this.revokingSessionId.set(null);
    }
  }
  
  /**
   * 🆕 確認登出所有設備
   */
  async confirmRevokeAllSessions() {
    const otherDevices = this.sessions().filter(s => !s.is_current);
    if (otherDevices.length === 0) {
      alert('沒有其他設備需要登出');
      return;
    }
    
    if (!confirm(`確定要登出所有其他 ${otherDevices.length} 個設備嗎？\n\n這些設備將需要重新登入才能使用。`)) {
      return;
    }
    
    await this.revokeAllSessions();
  }
  
  /**
   * 🆕 Phase 4: 登出除當前設備外的所有設備
   */
  async revokeAllSessions() {
    const count = await this.authService.revokeAllOtherSessions();
    if (count > 0) {
      // 刷新設備列表
      await this.loadSessions();
      alert(`已成功登出 ${count} 個設備`);
    }
  }
  
  /**
   * 🆕 獲取最近活躍設備數量（24小時內）
   */
  getActiveDevicesCount(): number {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return this.sessions().filter(s => {
      if (s.is_current) return true;
      if (!s.last_activity_at) return false;
      return new Date(s.last_activity_at).getTime() > oneDayAgo;
    }).length;
  }
  
  /**
   * 🆕 格式化 IP 地址（隱藏最後一段）
   */
  formatIpAddress(ip: string): string {
    if (!ip) return '未知位置';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
    }
    return ip;
  }
  
  /**
   * 🆕 格式化相對時間
   */
  formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '未知';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    
    return this.formatDate(dateStr);
  }
  
  createApiKey() {
    // TODO: 實現創建 API 金鑰
  }
  
  deleteApiKey(keyId: string) {
    // TODO: 實現刪除 API 金鑰
  }
  
  getDeviceIcon(deviceType: string): string {
    const icons: Record<string, string> = {
      'desktop': '💻',
      'web': '🌐',
      'mobile': '📱',
      'tablet': '📱'
    };
    return icons[deviceType] || '💻';
  }
  
  formatDate(date: string): string {
    if (!date) return '未知';
    return new Date(date).toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
