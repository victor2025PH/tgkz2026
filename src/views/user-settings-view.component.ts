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
              <h2>{{ t('auth.sessions') }}</h2>
              <p class="section-desc">管理您在各設備上的登入狀態</p>
              
              @if (isLoadingSessions()) {
                <div class="loading-state">載入中...</div>
              } @else {
                <div class="sessions-list">
                  @for (session of sessions(); track session.id) {
                    <div class="session-item" [class.current]="session.is_current">
                      <div class="session-icon">
                        {{ getDeviceIcon(session.device_type) }}
                      </div>
                      <div class="session-info">
                        <strong>{{ session.device_name || '未知設備' }}</strong>
                        <span class="session-meta">
                          {{ session.ip_address }} · 
                          最後活動: {{ formatDate(session.last_activity_at) }}
                        </span>
                        @if (session.is_current) {
                          <span class="current-badge">當前設備</span>
                        }
                      </div>
                      @if (!session.is_current) {
                        <button 
                          class="btn-danger-small"
                          (click)="revokeSession(session.id)"
                        >
                          {{ t('userSettings.revokeSession') }}
                        </button>
                      }
                    </div>
                  }
                </div>
                
                @if (sessions().length > 1) {
                  <button 
                    class="btn-danger"
                    (click)="revokeAllSessions()"
                  >
                    {{ t('userSettings.revokeAllSessions') }}
                  </button>
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
      background: var(--primary, #3b82f6);
      border-radius: 4px;
      font-size: 0.625rem;
      color: white;
      margin-left: 0.5rem;
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
   * 🆕 Phase 4: 登出除當前設備外的所有設備
   */
  async revokeAllSessions() {
    if (!confirm('確定要登出所有其他設備嗎？這將要求在這些設備上重新登入。')) {
      return;
    }
    
    const count = await this.authService.revokeAllOtherSessions();
    if (count > 0) {
      // 刷新設備列表
      await this.loadSessions();
      alert(`已成功登出 ${count} 個設備`);
    }
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
