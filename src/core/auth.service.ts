/**
 * TG-Matrix 認證服務
 * 
 * 優化設計：
 * 1. 統一的認證狀態管理
 * 2. Token 自動刷新
 * 3. 設備管理
 * 4. 離線支持
 */

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

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

// Token 存儲鍵
const TOKEN_KEYS = {
  ACCESS: 'tgm_access_token',
  REFRESH: 'tgm_refresh_token',
  USER: 'tgm_user'
};

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  
  // 狀態信號
  private _user = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  
  // Token 刷新定時器
  private refreshTimer: any = null;
  
  // 公開的計算屬性
  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this._user() && !!this._accessToken());
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
  
  
  constructor() {
    // 初始化時恢復狀態
    this.restoreSession();
    
    // Token 變化時自動保存
    effect(() => {
      const token = this._accessToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, token);
      } else {
        localStorage.removeItem(TOKEN_KEYS.ACCESS);
      }
    });
    
    effect(() => {
      const token = this._refreshToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.REFRESH, token);
      } else {
        localStorage.removeItem(TOKEN_KEYS.REFRESH);
      }
    });
    
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_KEYS.USER);
      }
    });
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
          device_name: request.device_name || this.getDeviceName()
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
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
  async getTelegramConfig(): Promise<{ enabled: boolean; bot_username?: string }> {
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
      this.clearAuthState();
      this.router.navigate(['/login']);
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
   */
  async fetchCurrentUser(): Promise<User | null> {
    const token = this._accessToken();
    if (!token) {
      return null;
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        this._user.set(result.data);
        return result.data;
      }
      
      return null;
    } catch (e) {
      console.error('Fetch user error:', e);
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
  async getSessions(): Promise<any[]> {
    const token = this._accessToken();
    if (!token) return [];
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (e) {
      return [];
    }
  }
  
  /**
   * 撤銷會話
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    const token = this._accessToken();
    if (!token) return false;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/sessions/${sessionId}`, {
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
   */
  getAuthHeaders(): Record<string, string> {
    const token = this._accessToken();
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
    return {};
  }
  
  // ==================== 私有方法 ====================
  
  private setAuthState(data: any): void {
    if (data.user) {
      this._user.set(data.user);
    }
    if (data.access_token) {
      this._accessToken.set(data.access_token);
    }
    if (data.refresh_token) {
      this._refreshToken.set(data.refresh_token);
    }
  }
  
  private clearAuthState(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
  }
  
  private restoreSession(): void {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS);
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
      const userJson = localStorage.getItem(TOKEN_KEYS.USER);
      
      if (accessToken) {
        this._accessToken.set(accessToken);
      }
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
      }
      if (userJson) {
        this._user.set(JSON.parse(userJson));
      }
      
      // 驗證 token 有效性
      if (accessToken) {
        this.fetchCurrentUser().then(user => {
          if (!user && refreshToken) {
            this.refreshAccessToken();
          }
        });
      }
    } catch (e) {
      console.error('Restore session error:', e);
      this.clearAuthState();
    }
  }
  
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // 在 token 過期前 5 分鐘刷新
    const refreshIn = 55 * 60 * 1000; // 55 分鐘
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
