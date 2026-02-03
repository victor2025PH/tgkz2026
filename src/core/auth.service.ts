/**
 * TG-Matrix 認證服務
 * 
 * 優化設計：
 * 1. 統一的認證狀態管理
 * 2. Token 自動刷新
 * 3. 設備管理
 * 4. 離線支持
 */

import { Injectable, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './api.service';
import { AuthEventsService, AUTH_STORAGE_KEYS } from './auth-events.service';

// 用戶模型
export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
  role: string;
  subscription_tier: string;
  max_accounts: number;
  is_active: boolean;
  is_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  last_login_at: string;
  // 🆕 邀請相關字段
  invite_code?: string;
  inviteCode?: string;
  invited_count?: number;
}

// 認證狀態
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

// 登入請求
export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
  device_name?: string;
}

// 註冊請求
export interface RegisterRequest {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
}

// Token 存儲鍵（使用集中定義）
const TOKEN_KEYS = AUTH_STORAGE_KEYS;

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private authEvents = inject(AuthEventsService);
  
  // 事件訂閱
  private eventSubscription: Subscription | null = null;
  
  // 狀態信號
  private _user = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  
  // Token 刷新定時器
  private refreshTimer: any = null;
  
  // 公開的計算屬性
  readonly user = computed(() => this._user());
  // 🔧 修復：只需要 Token 存在即可認為已認證（user 可以延遲加載）
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isLoading = computed(() => this._isLoading());
  readonly accessToken = computed(() => this._accessToken());
  
  // 訂閱信息
  readonly subscriptionTier = computed(() => this._user()?.subscription_tier || 'free');
  readonly maxAccounts = computed(() => this._user()?.max_accounts || 3);
  readonly isPro = computed(() => ['pro', 'enterprise'].includes(this.subscriptionTier()));
  
  // 會員等級（兼容舊接口）
  readonly membershipLevel = computed(() => {
    const tier = this.subscriptionTier();
    const tierMap: Record<string, string> = {
      'free': 'bronze',
      'basic': 'silver',
      'pro': 'gold',
      'enterprise': 'diamond'
    };
    return tierMap[tier] || 'bronze';
  });
  
  
  // 🔧 標記是否已完成初始化，避免 effect 在初始化時刪除 localStorage
  private _initialized = false;
  
  constructor() {
    // 初始化時恢復狀態
    this.restoreSession();
    this._initialized = true;
    
    // 🆕 訂閱認證事件（處理來自其他服務的登出通知）
    this.eventSubscription = this.authEvents.authEvents$.subscribe(event => {
      if (event.type === 'logout') {
        console.log('[CoreAuthService] Received logout event, clearing state');
        this.clearAuthStateInternal();
      }
    });
    
    // Token 變化時自動保存 - 🔧 修復：只在初始化後才執行刪除操作
    effect(() => {
      const token = this._accessToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
      } else if (this._initialized) {
        // 🔧 只有在初始化完成後，才刪除 localStorage
        // 避免在構造函數中因為初始值 null 而刪除已保存的 Token
        localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      }
    });
    
    effect(() => {
      const token = this._refreshToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
      } else if (this._initialized) {
        localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      }
    });
    
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
      } else if (this._initialized) {
        localStorage.removeItem(TOKEN_KEYS.USER);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }
  
  // ==================== 公開方法 ====================
  
  /**
   * 用戶註冊
   */
  async register(request: RegisterRequest): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    
    try {
      const result = await this.api.command<any>('user-register', request);
      
      if (result.success && result.data) {
        this.setAuthState(result.data);
        return { success: true };
      }
      
      return { success: false, error: result.error || '註冊失敗' };
    } catch (e: any) {
      return { success: false, error: e.message || '註冊失敗' };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 用戶登入
   */
  async login(request: LoginRequest): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    
    try {
      // 調用 HTTP API
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          password: request.password,
          device_name: request.device_name || this.getDeviceName(),
          remember: request.remember || false // 🆕 傳遞記住登入選項
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 🆕 保存記住狀態
        if (request.remember) {
          localStorage.setItem('tgm_remember_me', 'true');
        } else {
          localStorage.removeItem('tgm_remember_me');
        }
        
        this.setAuthState(result.data);
        this.scheduleTokenRefresh();
        return { success: true };
      }
      
      return { success: false, error: result.error || '登入失敗' };
    } catch (e: any) {
      return { success: false, error: e.message || '登入失敗' };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 獲取 Telegram OAuth 配置
   */
  async getTelegramConfig(): Promise<{ enabled: boolean; bot_username?: string; bot_id?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram/config`);
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data;
      }
      
      return { enabled: false };
    } catch (e) {
      console.error('Failed to get Telegram config:', e);
      return { enabled: false };
    }
  }
  
  /**
   * Telegram OAuth 登入
   */
  async telegramLogin(authData: any): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 設置認證狀態
        this.setAuthState({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        this.scheduleTokenRefresh();
        return { success: true };
      }
      
      return { success: false, error: result.error || 'Telegram 登入失敗' };
    } catch (e: any) {
      return { success: false, error: e.message || 'Telegram 登入失敗' };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      const token = this._accessToken();
      if (token) {
        await fetch(`${this.getApiBaseUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      // 🆕 廣播登出事件，通知所有訂閱者
      this.authEvents.emitLogout();
      // 清除本服務狀態
      this.clearAuthStateInternal();
      // 🔧 修復：使用正確的登入頁面路徑
      this.router.navigate(['/auth/login']);
    }
  }
  
  /**
   * 請求密碼重置
   */
  async forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 重置密碼
   */
  async resetPassword(token: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 驗證郵箱（通過 Token）
   */
  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 驗證郵箱（通過驗證碼）
   */
  async verifyEmailByCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 重新發送驗證郵件
   */
  async resendVerificationEmail(): Promise<{ success: boolean; error?: string }> {
    try {
      const token = this._accessToken();
      if (!token) {
        return { success: false, error: '未登入' };
      }
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 刷新 Token
   */
  async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        this._accessToken.set(result.data.access_token);
        this._refreshToken.set(result.data.refresh_token);
        this.scheduleTokenRefresh();
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Token refresh error:', e);
      return false;
    }
  }
  
  /**
   * 獲取當前用戶信息
   * 🔧 優化：同時檢查 Signal 和 localStorage，確保 Token 總能被讀取
   */
  async fetchCurrentUser(): Promise<User | null> {
    // 🔧 修復：同時檢查 Signal 和 localStorage
    const token = this._accessToken() || localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.log('[AuthService] fetchCurrentUser: No token available');
      return null;
    }
    
    // 確保 Signal 同步（防止不一致）
    if (!this._accessToken() && token) {
      this._accessToken.set(token);
    }
    
    try {
      console.log('[AuthService] fetchCurrentUser: Fetching user info...');
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // 🔧 處理非 200 響應
      if (!response.ok) {
        console.warn(`[AuthService] fetchCurrentUser: HTTP ${response.status}`);
        if (response.status === 401) {
          // Token 無效，清除認證狀態
          console.warn('[AuthService] Token invalid, clearing session');
          // 不直接清除，讓調用者決定如何處理
        }
        return null;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('[AuthService] fetchCurrentUser: Success', result.data.username);
        this._user.set(result.data);
        // 🔧 同步更新 localStorage（確保一致性）
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(result.data));
        return result.data;
      }
      
      console.warn('[AuthService] fetchCurrentUser: API returned', result);
      return null;
    } catch (e) {
      console.error('[AuthService] fetchCurrentUser error:', e);
      return null;
    }
  }
  
  /**
   * 更新用戶信息
   */
  async updateProfile(updates: Partial<User>): Promise<{ success: boolean; error?: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, error: '未登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地用戶信息
        const currentUser = this._user();
        if (currentUser) {
          this._user.set({ ...currentUser, ...updates });
        }
        return { success: true };
      }
      
      return { success: false, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 修改密碼
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, error: '未登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  /**
   * 獲取會話列表
   */
  /**
   * 🆕 Phase 4: 獲取用戶所有設備
   */
  async getSessions(): Promise<any[]> {
    const token = this._accessToken();
    if (!token) return [];
    
    try {
      // 使用新的設備管理 API
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success ? (result.data?.devices || []) : [];
    } catch (e) {
      return [];
    }
  }
  
  /**
   * 撤銷會話
   */
  /**
   * 🆕 Phase 4: 撤銷指定設備會話
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const token = this._accessToken();
    if (!token) return false;
    
    try {
      // 使用新的設備管理 API
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 🆕 Phase 4: 登出除當前設備外的所有設備
   */
  async revokeAllOtherSessions(): Promise<number> {
    const token = this._accessToken();
    if (!token) return 0;
    
    try {
      // 獲取當前會話 ID（如果有保存的話）
      const currentSessionId = localStorage.getItem('tgm_session_id') || '';
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/revoke-all`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ current_session_id: currentSessionId })
      });
      
      const result = await response.json();
      return result.success ? (result.revoked_count || 0) : 0;
    } catch (e) {
      return 0;
    }
  }
  
  /**
   * 檢查功能權限
   */
  hasFeature(feature: string): boolean {
    const tier = this.subscriptionTier();
    const featureMap: Record<string, string[]> = {
      'free': ['basic_monitoring', 'basic_ai'],
      'basic': ['basic_monitoring', 'basic_ai', 'templates'],
      'pro': ['basic_monitoring', 'basic_ai', 'templates', 'full_monitoring', 'advanced_ai', 'team', 'api_access'],
      'enterprise': ['all']
    };
    
    const allowedFeatures = featureMap[tier] || [];
    return allowedFeatures.includes('all') || allowedFeatures.includes(feature);
  }
  
  /**
   * 獲取認證 Header
   * 🔧 修復：同時檢查 Signal 和 localStorage，確保 Token 總能被讀取
   */
  getAuthHeaders(): Record<string, string> {
    const token = this._accessToken() || localStorage.getItem('tgm_access_token');
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }
  
  // ==================== 🆕 設備管理 ====================
  
  /**
   * 獲取所有綁定設備
   */
  async getDevices(): Promise<any[]> {
    const token = this._accessToken();
    if (!token) return [];
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success ? (result.data?.devices || result.devices || []) : [];
    } catch (e) {
      console.error('Failed to get devices:', e);
      return [];
    }
  }
  
  /**
   * 綁定新設備
   */
  async bindDevice(deviceCode: string, deviceName: string): Promise<{ success: boolean; message: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: '未登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ device_code: deviceCode, device_name: deviceName })
      });
      
      const result = await response.json();
      return { success: result.success, message: result.message || (result.success ? '綁定成功' : '綁定失敗') };
    } catch (e: any) {
      return { success: false, message: e.message || '綁定失敗' };
    }
  }
  
  /**
   * 解綁設備
   */
  async unbindDevice(deviceId: string | number): Promise<{ success: boolean; message: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: '未登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return { success: result.success, message: result.message || (result.success ? '解綁成功' : '解綁失敗') };
    } catch (e: any) {
      return { success: false, message: e.message || '解綁失敗' };
    }
  }
  
  // ==================== 🆕 會員管理 ====================
  
  /**
   * 獲取使用統計
   */
  async getUsageStats(): Promise<any> {
    const token = this._accessToken();
    if (!token) return null;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/usage-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (e) {
      console.error('Failed to get usage stats:', e);
      return null;
    }
  }
  
  /**
   * 激活卡密（續費/升級會員）
   */
  async activateLicense(licenseKey: string): Promise<{ success: boolean; message: string; data?: any }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: '未登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/license/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ license_key: licenseKey })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新用戶信息
        await this.fetchCurrentUser();
        // 廣播用戶更新事件
        this.authEvents.emitUserUpdate(this._user());
      }
      
      return { 
        success: result.success, 
        message: result.message || (result.success ? '激活成功' : '激活失敗'),
        data: result.data 
      };
    } catch (e: any) {
      return { success: false, message: e.message || '激活失敗' };
    }
  }
  
  /**
   * 獲取邀請獎勵信息
   */
  async getInviteRewards(): Promise<{ inviteCode: string; invitedCount: number; rewardDays: number }> {
    const token = this._accessToken();
    const user = this._user();
    
    const defaultResult = {
      inviteCode: user?.invite_code || user?.inviteCode || '',
      invitedCount: 0,
      rewardDays: 0
    };
    
    if (!token) return defaultResult;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/invite-rewards`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success ? {
        inviteCode: result.data?.invite_code || defaultResult.inviteCode,
        invitedCount: result.data?.invited_count || 0,
        rewardDays: result.data?.reward_days || 0
      } : defaultResult;
    } catch (e) {
      return defaultResult;
    }
  }
  
  // ==================== 私有方法 ====================
  
  private setAuthState(data: any): void {
    if (data.user) {
      this._user.set(data.user);
      // 🔧 同步保存到 localStorage（避免 effect 異步導致頁面刷新前未保存）
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
    }
    if (data.access_token) {
      this._accessToken.set(data.access_token);
      // 🔧 同步保存到 localStorage
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token);
    }
    if (data.refresh_token) {
      this._refreshToken.set(data.refresh_token);
      // 🔧 同步保存到 localStorage
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
  }
  
  /**
   * 設置會話（公開方法）
   * 🆕 用於登入成功後直接設置認證狀態
   */
  setSession(data: { access_token?: string; refresh_token?: string; user?: any; session_id?: string }): void {
    console.log('[AuthService] setSession called:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      hasUser: !!data.user
    });
    
    // 先直接保存到 localStorage（確保持久化）
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token);
      this._accessToken.set(data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, data.refresh_token);
      this._refreshToken.set(data.refresh_token);
    }
    if (data.user) {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
      this._user.set(data.user);
    }
    if (data.session_id) {
      localStorage.setItem(TOKEN_KEYS.SESSION_ID, data.session_id);
    }
    
    // 🆕 廣播登入事件
    this.authEvents.emitLogin(data);
    
    console.log('[AuthService] setSession complete, isAuthenticated:', this.isAuthenticated());
  }
  
  /**
   * 清除會話（公開方法）
   * 用於認證守衛發現無效狀態時清理
   * 🆕 同時廣播事件通知其他服務
   */
  clearSession(): void {
    this.authEvents.emitLogout();
    this.clearAuthStateInternal();
  }
  
  /**
   * 內部清除狀態（不發送事件，避免循環）
   */
  private clearAuthStateInternal(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    // 🆕 使用集中式清除方法
    this.authEvents.clearAllAuthStorage();
  }
  
  /**
   * @deprecated 使用 clearAuthStateInternal 代替
   */
  private clearAuthState(): void {
    this.clearAuthStateInternal();
  }
  
  private restoreSession(): void {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
      const userJson = localStorage.getItem(TOKEN_KEYS.USER);
      
      console.log('[Auth] restoreSession - accessToken:', !!accessToken, 'refreshToken:', !!refreshToken, 'user:', !!userJson);
      
      // 🆕 P0: 驗證 Token 格式有效性
      if (accessToken && !this.isValidTokenFormat(accessToken)) {
        console.warn('[Auth] Invalid token format, clearing session');
        this.clearAuthState();
        return;
      }
      
      if (accessToken) {
        console.log('[Auth] Setting accessToken signal');
        this._accessToken.set(accessToken);
      }
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
      }
      if (userJson) {
        try {
          this._user.set(JSON.parse(userJson));
          console.log('[Auth] User restored from localStorage');
        } catch {
          console.warn('[Auth] Invalid user JSON, clearing');
          this.clearAuthState();
          return;
        }
      }
      
      // 🔧 修復：Token 有效性會在實際 API 請求時由後端驗證
      console.log('[Auth] Session restored successfully');
      
      // 🔧 優化：如果有 Token 但沒有用戶信息，立即獲取（不等待）
      if (accessToken && !userJson) {
        console.log('[Auth] Token exists but no user info, fetching immediately...');
        // 使用 queueMicrotask 確保在構造函數完成後執行
        queueMicrotask(() => {
          if (this._accessToken()) {
            this.fetchCurrentUser().then(user => {
              if (user) {
                console.log('[Auth] User info fetched successfully:', user.username);
              } else {
                console.warn('[Auth] Failed to fetch user info');
              }
            }).catch(e => {
              console.warn('[Auth] Error fetching user info:', e);
            });
          }
        });
      }
    } catch (e) {
      console.error('Restore session error:', e);
      this.clearAuthState();
    }
  }
  
  /**
   * 驗證 Token 格式是否有效（JWT 格式檢查）
   */
  private isValidTokenFormat(token: string): boolean {
    if (!token || token.length < 20) return false;
    
    // JWT 應該有 3 個部分用 . 分隔
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    try {
      // 嘗試解析 payload（處理 URL-safe Base64）
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      
      // 檢查是否過期
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        console.warn('[Auth] Token expired');
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 解碼 URL-safe Base64（處理後端 JWT 編碼）
   */
  private base64UrlDecode(str: string): string {
    // 將 URL-safe 字符替換回標準 Base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // 補齊 padding
    while (base64.length % 4) {
      base64 += '=';
    }
    return atob(base64);
  }
  
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // 🆕 根據"記住我"狀態調整刷新間隔
    const rememberMe = localStorage.getItem('tgm_remember_me') === 'true';
    // 普通：55 分鐘刷新，記住我：23 小時刷新（假設後端 Token 有效期 1 小時/24 小時）
    const refreshIn = rememberMe ? 23 * 60 * 60 * 1000 : 55 * 60 * 1000;
    
    console.log(`[AuthService] Scheduling token refresh in ${refreshIn / 60000} minutes (rememberMe: ${rememberMe})`);
    
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshIn);
  }
  
  private getApiBaseUrl(): string {
    // 開發環境
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000';
    }
    // 生產環境
    return '';
  }
  
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows Browser';
    if (ua.includes('Mac')) return 'Mac Browser';
    if (ua.includes('Linux')) return 'Linux Browser';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Browser';
    if (ua.includes('Android')) return 'Android Browser';
    return 'Web Browser';
  }
}
