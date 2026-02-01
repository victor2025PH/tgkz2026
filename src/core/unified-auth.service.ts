/**
 * 統一認證服務
 * 
 * 設計目標：
 * 1. 統一兩個 AuthService 的接口
 * 2. 根據運行環境自動選擇正確的認證方式
 * 3. 提供一致的 API 給所有組件使用
 * 4. 支持 Electron 本地模式和 SaaS 雲端模式
 */

import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';

// ==================== 統一模型定義 ====================

/**
 * 統一用戶模型
 * 兼容兩個服務的用戶結構
 */
export interface UnifiedUser {
  id: string | number;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
  
  // SaaS 訂閱信息
  subscription_tier?: string;
  max_accounts?: number;
  is_active?: boolean;
  is_verified?: boolean;
  two_factor_enabled?: boolean;
  
  // 本地版會員信息
  membershipLevel?: string;
  membershipExpires?: string;
  inviteCode?: string;
  invitedCount?: number;
  
  // 通用字段
  created_at?: string;
  last_login_at?: string;
  status?: string;
}

/**
 * 登入請求
 */
export interface UnifiedLoginRequest {
  // 郵箱登入
  email?: string;
  // 用戶名登入（本地版兼容）
  username?: string;
  password: string;
  remember?: boolean;
  device_name?: string;
}

/**
 * 註冊請求
 */
export interface UnifiedRegisterRequest {
  email: string;
  password: string;
  username?: string;
  display_name?: string;
  invite_code?: string;
}

/**
 * 認證響應
 */
export interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  user?: UnifiedUser;
  access_token?: string;
  refresh_token?: string;
}

// Token 存儲鍵
const TOKEN_KEYS = {
  ACCESS: 'tgm_access_token',
  REFRESH: 'tgm_refresh_token',
  USER: 'tgm_user',
  MODE: 'tgm_auth_mode'
};

/**
 * 運行模式
 */
type AuthMode = 'electron' | 'saas' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class UnifiedAuthService {
  private router = inject(Router);
  
  // ==================== 狀態信號 ====================
  private _user = signal<UnifiedUser | null>(null);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  private _isLoading = signal<boolean>(false);
  private _authMode = signal<AuthMode>('auto');
  
  // Token 刷新定時器
  private refreshTimer: any = null;
  
  // ==================== 公開計算屬性 ====================
  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => {
    // Electron 模式：始終已認證
    if (this.isElectronMode()) {
      return true;
    }
    // SaaS 模式：需要有效的用戶和 Token
    return !!this._user() && !!this._accessToken();
  });
  readonly isLoading = computed(() => this._isLoading());
  readonly accessToken = computed(() => this._accessToken());
  readonly authMode = computed(() => this._authMode());
  
  // 訂閱/會員信息（統一接口）
  readonly subscriptionTier = computed(() => {
    const user = this._user();
    return user?.subscription_tier || user?.membershipLevel || 'free';
  });
  readonly membershipLevel = computed(() => this.subscriptionTier());
  readonly maxAccounts = computed(() => this._user()?.max_accounts || 3);
  readonly isVerified = computed(() => this._user()?.is_verified ?? true);
  
  // 會員等級檢查
  readonly isPro = computed(() => {
    const tier = this.subscriptionTier();
    return ['pro', 'enterprise', 'gold', 'diamond', 'star', 'king'].includes(tier);
  });
  readonly isPremium = computed(() => {
    const tier = this.subscriptionTier();
    return ['enterprise', 'diamond', 'star', 'king'].includes(tier);
  });
  
  constructor() {
    // 初始化時恢復狀態
    this.initializeAuth();
    
    // 監聽狀態變化並持久化
    effect(() => {
      const token = this._accessToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, token);
      } else {
        localStorage.removeItem(TOKEN_KEYS.ACCESS);
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
  
  // ==================== 環境檢測 ====================
  
  /**
   * 檢測是否在 Electron 環境
   */
  isElectronMode(): boolean {
    return !!(window as any).electronAPI || !!(window as any).electron;
  }
  
  /**
   * 獲取 API 基礎 URL
   */
  private getApiBaseUrl(): string {
    if (this.isElectronMode()) {
      return 'http://localhost:8000';
    }
    return environment.apiBaseUrl || '';
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化認證狀態
   */
  private initializeAuth(): void {
    // Electron 模式：自動登入為本地管理員
    if (this.isElectronMode()) {
      this._authMode.set('electron');
      this.setElectronDefaultUser();
      return;
    }
    
    // SaaS 模式：嘗試恢復 Session
    this._authMode.set('saas');
    this.restoreSession();
  }
  
  /**
   * 設置 Electron 默認用戶
   */
  private setElectronDefaultUser(): void {
    const defaultUser: UnifiedUser = {
      id: 'local_user',
      email: 'admin@local.tgmatrix',
      username: 'Admin',
      display_name: '本地管理員',
      role: 'admin',
      subscription_tier: 'enterprise',
      membershipLevel: 'king',
      max_accounts: 9999,
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString()
    };
    
    this._user.set(defaultUser);
    this._accessToken.set('electron-local-token');
  }
  
  /**
   * 恢復 Session
   */
  private restoreSession(): void {
    try {
      const token = localStorage.getItem(TOKEN_KEYS.ACCESS);
      const userJson = localStorage.getItem(TOKEN_KEYS.USER);
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        
        // 驗證 Token 有效性（簡單檢查）
        if (this.isTokenValid(token)) {
          this._accessToken.set(token);
          this._user.set(user);
          
          // 設置 Token 刷新
          this.scheduleTokenRefresh();
          
          // 後台驗證 Token
          this.validateTokenAsync();
        } else {
          this.clearSession();
        }
      }
    } catch (e) {
      console.error('Failed to restore session:', e);
      this.clearSession();
    }
  }
  
  /**
   * 簡單的 Token 有效性檢查
   */
  private isTokenValid(token: string): boolean {
    if (!token || token.length < 10) return false;
    
    try {
      // 嘗試解析 JWT
      const parts = token.split('.');
      if (parts.length !== 3) return true; // 非 JWT，假設有效
      
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      
      if (exp && Date.now() >= exp * 1000) {
        return false; // Token 已過期
      }
      
      return true;
    } catch (e) {
      return true; // 解析失敗，假設有效
    }
  }
  
  /**
   * 異步驗證 Token
   */
  private async validateTokenAsync(): Promise<void> {
    try {
      const token = this._accessToken();
      if (!token) return;
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Token 無效，嘗試刷新
        await this.refreshTokens();
      } else {
        // 更新用戶信息
        const result = await response.json();
        if (result.success && result.data) {
          this._user.set(this.normalizeUser(result.data));
        }
      }
    } catch (e) {
      console.error('Token validation failed:', e);
    }
  }
  
  // ==================== 認證操作 ====================
  
  /**
   * 用戶登入
   */
  async login(request: UnifiedLoginRequest): Promise<AuthResponse> {
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email || request.username,
          password: request.password,
          device_name: request.device_name || this.getDeviceName()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setAuthState({
          user: result.user || result.data?.user,
          access_token: result.access_token || result.data?.access_token,
          refresh_token: result.refresh_token || result.data?.refresh_token
        });
        this.scheduleTokenRefresh();
        return { success: true, user: this._user()! };
      }
      
      return { 
        success: false, 
        error: result.error || result.message || '登入失敗' 
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: e.message || '網絡錯誤，請檢查連接' 
      };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 用戶註冊
   */
  async register(request: UnifiedRegisterRequest): Promise<AuthResponse> {
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: request.email,
          password: request.password,
          username: request.username,
          display_name: request.display_name,
          invite_code: request.invite_code
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 註冊成功，設置認證狀態
        if (result.access_token || result.data?.access_token) {
          this.setAuthState({
            user: result.user || result.data?.user,
            access_token: result.access_token || result.data?.access_token,
            refresh_token: result.refresh_token || result.data?.refresh_token
          });
        }
        return { success: true, user: result.user || result.data?.user };
      }
      
      return { 
        success: false, 
        error: result.error || result.message || '註冊失敗' 
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: e.message || '網絡錯誤，請檢查連接' 
      };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Telegram OAuth 登入
   */
  async telegramLogin(authData: any): Promise<AuthResponse> {
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setAuthState({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        this.scheduleTokenRefresh();
        return { success: true, user: this._user()! };
      }
      
      return { 
        success: false, 
        error: result.error || 'Telegram 登入失敗' 
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: e.message || 'Telegram 登入失敗' 
      };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * Google OAuth 登入
   */
  async googleLogin(authData: any): Promise<AuthResponse> {
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setAuthState({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        this.scheduleTokenRefresh();
        return { success: true, user: this._user()! };
      }
      
      return { 
        success: false, 
        error: result.error || 'Google 登入失敗' 
      };
    } catch (e: any) {
      return { 
        success: false, 
        error: e.message || 'Google 登入失敗' 
      };
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
   * 登出
   */
  async logout(): Promise<void> {
    try {
      const token = this._accessToken();
      if (token && !this.isElectronMode()) {
        await fetch(`${this.getApiBaseUrl()}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } finally {
      this.clearSession();
      
      // 導航到登入頁
      if (!this.isElectronMode()) {
        this.router.navigate(['/auth/login']);
      }
    }
  }
  
  /**
   * 發送密碼重置郵件
   */
  async forgotPassword(email: string): Promise<AuthResponse> {
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
  async resetPassword(token: string, password: string): Promise<AuthResponse> {
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
   * 驗證郵箱
   */
  async verifyEmail(token: string): Promise<AuthResponse> {
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
   * 發送驗證郵件
   */
  async sendVerificationEmail(): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this._accessToken()}`
        }
      });
      
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
  
  // ==================== 權限檢查 ====================
  
  /**
   * 檢查是否有特定功能權限
   */
  hasFeature(feature: string): boolean {
    // Electron 模式：所有功能開放
    if (this.isElectronMode()) {
      return true;
    }
    
    const tier = this.subscriptionTier();
    const featureMap: Record<string, string[]> = {
      'free': ['basic_search', 'basic_automation'],
      'basic': ['free', 'advanced_search', 'bulk_operations'],
      'pro': ['basic', 'ai_features', 'analytics', 'api_access'],
      'enterprise': ['pro', 'white_label', 'priority_support', 'custom_integration'],
      // 本地版會員等級
      'bronze': ['basic_search'],
      'silver': ['bronze', 'advanced_search', 'automation'],
      'gold': ['silver', 'ai_features', 'analytics'],
      'diamond': ['gold', 'api_access', 'bulk_operations'],
      'star': ['diamond', 'priority_support'],
      'king': ['star', 'all_features']
    };
    
    // 遞歸檢查權限
    const checkFeatures = (tierFeatures: string[]): boolean => {
      for (const f of tierFeatures) {
        if (f === feature) return true;
        if (featureMap[f]) {
          if (checkFeatures(featureMap[f])) return true;
        }
      }
      return false;
    };
    
    return tier === 'king' || checkFeatures(featureMap[tier] || []);
  }
  
  /**
   * 檢查是否是管理員
   */
  isAdmin(): boolean {
    return this._user()?.role === 'admin';
  }
  
  // ==================== 內部方法 ====================
  
  /**
   * 設置認證狀態
   */
  private setAuthState(data: {
    user?: any;
    access_token?: string;
    refresh_token?: string;
  }): void {
    if (data.user) {
      this._user.set(this.normalizeUser(data.user));
    }
    if (data.access_token) {
      this._accessToken.set(data.access_token);
    }
    if (data.refresh_token) {
      this._refreshToken.set(data.refresh_token);
      localStorage.setItem(TOKEN_KEYS.REFRESH, data.refresh_token);
    }
  }
  
  /**
   * 標準化用戶對象
   */
  private normalizeUser(user: any): UnifiedUser {
    return {
      id: user.id,
      email: user.email || '',
      username: user.username || user.display_name || '',
      display_name: user.display_name || user.username || '',
      avatar_url: user.avatar_url || user.avatar || '',
      role: user.role || 'user',
      subscription_tier: user.subscription_tier || user.membershipLevel || 'free',
      membershipLevel: user.membershipLevel || user.subscription_tier || 'free',
      max_accounts: user.max_accounts || 3,
      is_active: user.is_active ?? true,
      is_verified: user.is_verified ?? false,
      two_factor_enabled: user.two_factor_enabled ?? false,
      membershipExpires: user.membershipExpires || user.membership_expires,
      inviteCode: user.inviteCode || user.invite_code,
      invitedCount: user.invitedCount || user.invited_count || 0,
      created_at: user.created_at || user.createdAt,
      last_login_at: user.last_login_at || user.lastLogin,
      status: user.status || 'active'
    };
  }
  
  /**
   * 清除 Session
   */
  clearSession(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  
  /**
   * 設置 Token 刷新定時器
   */
  private scheduleTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // 25 分鐘後刷新（Token 有效期通常 30 分鐘）
    this.refreshTimer = setTimeout(() => {
      this.refreshTokens();
    }, 25 * 60 * 1000);
  }
  
  /**
   * 刷新 Token
   */
  private async refreshTokens(): Promise<boolean> {
    const refreshToken = this._refreshToken() || localStorage.getItem(TOKEN_KEYS.REFRESH);
    
    if (!refreshToken) {
      this.clearSession();
      return false;
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      
      const result = await response.json();
      
      if (result.success) {
        this.setAuthState({
          access_token: result.access_token || result.data?.access_token,
          refresh_token: result.refresh_token || result.data?.refresh_token
        });
        this.scheduleTokenRefresh();
        return true;
      }
      
      this.clearSession();
      return false;
    } catch (e) {
      console.error('Token refresh failed:', e);
      return false;
    }
  }
  
  /**
   * 獲取設備名稱
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux PC';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS Device';
    return 'Unknown Device';
  }
}
