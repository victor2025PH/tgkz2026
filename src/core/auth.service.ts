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
import { ToastService } from '../toast.service';
import { environment } from '../environments/environment';
import { getEffectiveApiBaseUrl } from './get-effective-api-base';

// 用戶模型
export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  displayName?: string;  // 🆕 兼容別名
  avatar_url: string;
  role: string;
  subscription_tier: string;
  max_accounts: number;
  is_active: boolean;
  is_verified: boolean;
  two_factor_enabled: boolean;
  created_at: string;
  last_login_at: string;
  // 🆕 Telegram 相關字段
  telegram_id?: string;
  telegramId?: string;  // 🆕 兼容別名
  telegram_username?: string;
  // 🆕 邀請相關字段
  invite_code?: string;
  inviteCode?: string;
  invited_count?: number;
  // 🔧 P0 修復：會員到期時間
  subscription_expires?: string;
  membershipExpires?: string;  // 兼容別名
  // 🔧 P0 修復：會員等級
  membershipLevel?: string;
  // 後台標記為終身會員時為 true，前端顯示「終身」
  isLifetime?: boolean;
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

// 🔧 P4-5: 從 Legacy AuthService 遷移的接口（兼容 profile/membership 組件）
export interface DeviceInfo {
  id: number;
  deviceCode: string;
  deviceName: string;
  boundAt: string;
  lastSeen: string;
  isCurrent: boolean;
  status: 'active' | 'inactive';
}

export interface UsageStats {
  aiCalls: { used: number; limit: number };
  messagesSent: { used: number; limit: number };
  accounts: { used: number; limit: number };
  storage: { used: number; limit: number };
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
  private toast = inject(ToastService);
  
  // 事件訂閱
  private eventSubscription: Subscription | null = null;
  
  // 狀態信號
  private _user = signal<User | null>(null);
  private _isLoading = signal<boolean>(false);
  private _accessToken = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);
  
  // Token 刷新定時器
  private refreshTimer: any = null;
  
  // 🔧 P2: fetchCurrentUser 請求去重 —— 防止多處同時調用導致重複網絡請求
  private _pendingFetchUser: Promise<User | null> | null = null;
  
  // 🔧 P4-5: 設備和使用統計信號（從 Legacy AuthService 遷移）
  private _devices = signal<DeviceInfo[]>([]);
  private _usageStats = signal<UsageStats | null>(null);
  
  // 公開的計算屬性
  readonly user = computed(() => this._user());
  // 🔧 修復：只需要 Token 存在即可認為已認證（user 可延遲加載）
  // 安裝版（Electron）也需會員登入驗證，有 Token 才視為已認證
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly isLoading = computed(() => this._isLoading());
  readonly accessToken = computed(() => this._accessToken());
  // 🔧 P4-5: 設備和使用統計（兼容 Legacy 接口）
  readonly devices = computed(() => this._devices());
  readonly usageStats = computed(() => this._usageStats());
  
  // 訂閱信息
  // 🔧 P0 修復：同時檢查 subscription_tier 和 membershipLevel（兼容兩種數據格式）
  readonly subscriptionTier = computed(() => 
    this._user()?.subscription_tier || this._user()?.membershipLevel || 'free'
  );
  readonly maxAccounts = computed(() => this._user()?.max_accounts || 3);
  readonly isPro = computed(() => ['pro', 'enterprise', 'gold', 'diamond', 'star', 'king'].includes(this.subscriptionTier()));
  
  // 會員等級（兼容舊接口）
  // 🔧 P0 修復：完整的等級映射，支持 subscription_tier 和直接的等級名稱
  readonly membershipLevel = computed(() => {
    const user = this._user();
    // 🔧 優先使用 membershipLevel（已轉換的格式），然後是 subscription_tier
    const tier = user?.membershipLevel || user?.subscription_tier || 'free';
    const tierMap: Record<string, string> = {
      // 從 subscription_tier 轉換
      'free': 'bronze',
      'basic': 'silver',
      'pro': 'gold',
      'enterprise': 'king',  // 🔧 对齐后端 level_config.from_string(enterprise)→king
      // 🔧 直接映射（數據庫可能直接存儲等級名稱）
      'bronze': 'bronze',
      'silver': 'silver',
      'gold': 'gold',
      'diamond': 'diamond',
      'star': 'star',
      'king': 'king'
    };
    return tierMap[tier] || 'bronze';
  });
  
  
  // 🔧 標記是否已完成初始化，避免 effect 在初始化時刪除 localStorage
  private _initialized = false;
  
  constructor() {
    // 初始化時恢復狀態
    this.restoreSession();
    this._initialized = true;
    
    // 🆕 訂閱認證事件（處理來自其他服務的登出通知和用戶更新）
    this.eventSubscription = this.authEvents.authEvents$.subscribe(event => {
      if (event.type === 'logout') {
        console.log('[CoreAuthService] Received logout event, clearing state');
        this.clearAuthStateInternal();
      } else if (event.type === 'user_update' && event.payload?.user) {
        console.log('[CoreAuthService] Received user_update event, syncing user data');
        this._user.set(event.payload.user);
        // 同步更新 localStorage
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(event.payload.user));
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
   * 安裝版（Electron）走 IPC auth-login，與後端本地 auth 服務一致；Web 版走 HTTP API
   */
  async login(request: LoginRequest): Promise<{ success: boolean; error?: string }> {
    this._isLoading.set(true);
    
    try {
      let result: { success?: boolean; data?: any; error?: string } | null = null;
      const baseUrl = this.getApiBaseUrl();
      const payload = {
        email: request.email,
        password: request.password,
        device_name: request.device_name || this.getDeviceName(),
        remember: request.remember ?? false
      };

      // 桌面版與網頁版同一套：優先走 HTTP API（localhost:8000），失敗時桌面版回退 IPC
      try {
        const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        result = await this.parseJsonResponse(response);
      } catch (httpErr: any) {
        if (this.isElectronEnv()) {
          const invoke = this.getIpcInvoke();
          if (invoke) {
            result = await invoke('auth-login', {
              email: payload.email,
              password: payload.password,
              device_name: payload.device_name
            });
          }
        }
        if (!result) {
          return { success: false, error: baseUrl ? '網絡錯誤，請稍後重試' : '無法連接後端，請確認應用已正常啟動' };
        }
      }
      
      if (!result) {
        return { success: false, error: '網絡錯誤，請稍後重試' };
      }
      
      if (result.success && result.data) {
        if (request.remember) {
          localStorage.setItem('tgm_remember_me', 'true');
        } else {
          localStorage.removeItem('tgm_remember_me');
        }
        this.setAuthState(result.data);
        this.scheduleTokenRefresh();
        return { success: true };
      }
      
      return { success: false, error: String(result?.error || '登入失敗') };
    } catch (e: any) {
      const msg = e?.message || '';
      const isNetwork = msg.includes('JSON') || msg.includes('fetch') || msg.includes('network');
      return { success: false, error: isNetwork ? '網絡錯誤，請稍後重試' : (e.message || '登入失敗') };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 獲取 Telegram OAuth 配置
   * 桌面版與網頁版同一套：均請求 getApiBaseUrl()（桌面版為 http://127.0.0.1:8000）
   */
  async getTelegramConfig(): Promise<{ enabled: boolean; bot_username?: string; bot_id?: string }> {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram/config`);
      const result = await this.parseJsonResponse(response);
      if (result?.success && result?.data) {
        return result.data as { enabled: boolean; bot_username?: string; bot_id?: string };
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
      
      const result = await this.parseJsonResponse(response);
      if (!result) {
        return { success: false, error: '網絡錯誤，請稍後重試' };
      }
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
      
      return { success: false, error: String(result?.error || 'Telegram 登入失敗') };
    } catch (e: any) {
      const msg = e?.message || '';
      const isNetwork = /json|fetch|network|unexpected token/i.test(msg);
      return { success: false, error: isNetwork ? '網絡錯誤，請稍後重試' : (e.message || 'Telegram 登入失敗') };
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
      // 先顯示 Toast，再延遲跳轉以便用戶看到反饋
      this.toast.success('已退出登錄');
      setTimeout(() => {
        this.authEvents.emitLogout();
        this.clearAuthStateInternal();
        this.router.navigate(['/auth/login']);
      }, 400);
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
    // 🔧 P2 修復：請求去重 —— 如果已有進行中的請求，直接複用
    if (this._pendingFetchUser) {
      console.log('[AuthService] fetchCurrentUser: Reusing pending request');
      return this._pendingFetchUser;
    }
    
    const promise = this._fetchCurrentUserInternal();
    this._pendingFetchUser = promise;
    
    try {
      return await promise;
    } finally {
      this._pendingFetchUser = null;
    }
  }
  
  private async _fetchCurrentUserInternal(): Promise<User | null> {
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
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || '60';
          throw new Error(`RATE_LIMITED:${retryAfter}`);
        }
        if (response.status === 401) {
          // Token 無效，清除認證狀態
          console.warn('[AuthService] Token invalid, clearing session');
          // 不直接清除，讓調用者決定如何處理
        }
        return null;
      }
      
      const result = await this.parseJsonResponse(response);
      if (!result || !result.success || !result.data) {
        if (!result) {
          console.warn('[AuthService] fetchCurrentUser: Invalid response (e.g. HTML/502)');
        } else {
          console.warn('[AuthService] fetchCurrentUser: API returned', result);
        }
        return null;
      }
      const data = result.data as Record<string, unknown>;
      // 🔧 P0 修復：統一字段命名 —— 後端返回 display_name（snake_case），
      // 但模板使用 displayName（camelCase）。此處做雙向映射，確保兩種命名都可用。
      const userData: Record<string, unknown> = { ...data };
      
      // 確保 displayName (camelCase) 別名存在
      if (!userData.displayName && userData.display_name) {
        userData.displayName = userData.display_name;
      }
      // 確保 display_name 永不為空（降級鏈：display_name → telegram_first_name → username）
      const rawDisplayName = (userData.display_name as string)?.trim();
      if (!rawDisplayName) {
        userData.display_name = (userData.telegram_first_name as string) || (userData.username as string) || '用戶';
        userData.displayName = userData.display_name;
      }
      
      // 其他常用別名映射
      if (!userData.telegramId && userData.telegram_id) {
        userData.telegramId = userData.telegram_id;
      }
      
      console.log('[AuthService] fetchCurrentUser: Success', userData.username, 'displayName:', userData.displayName);
      this._user.set(userData as unknown as User);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(userData));
      this.authEvents.emitUserUpdate(userData as unknown as User);
      
      return userData as unknown as User;
    } catch (e) {
      console.error('[AuthService] fetchCurrentUser error:', e);
      return null;
    }
  }
  
  /**
   * 🔧 P0 修復：強制刷新用戶數據
   * 供組件在關鍵時機（如頁面可見、會員頁面進入）調用
   */
  async forceRefreshUser(): Promise<User | null> {
    console.log('[AuthService] forceRefreshUser: 強制刷新用戶數據');
    return this.fetchCurrentUser();
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
   * API 密鑰：列出當前用戶的 API 密鑰
   */
  async getApiKeys(): Promise<{ id: string; name: string; prefix: string; last_used_at?: string }[]> {
    const token = this._accessToken();
    if (!token) return [];
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/api-keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) return [];
      return result.data.map((k: any) => ({
        id: k.id,
        name: k.name || 'Unnamed',
        prefix: k.key_prefix || k.prefix || '',
        last_used_at: k.last_used || k.last_used_at
      }));
    } catch (e) {
      return [];
    }
  }
  
  /**
   * API 密鑰：創建新密鑰（返回 { success, key?, api_key?, error? }，key 為完整密鑰僅返回一次）
   */
  async createApiKey(name: string = 'Unnamed Key'): Promise<{ success: boolean; key?: string; api_key?: any; error?: string }> {
    const token = this._accessToken();
    if (!token) return { success: false, error: '未登入' };
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, scopes: ['read'] })
      });
      const result = await response.json();
      if (result.success) {
        const rawKey = result.key ?? result.data?.key;
        const keyInfo = result.api_key ?? result.data?.api_key;
        return { success: true, key: rawKey, api_key: keyInfo };
      }
      return { success: false, error: result.error || '創建失敗' };
    } catch (e: any) {
      return { success: false, error: e?.message || '網絡錯誤' };
    }
  }
  
  /**
   * API 密鑰：刪除指定密鑰
   */
  async deleteApiKey(keyId: string): Promise<boolean> {
    const token = this._accessToken();
    if (!token) return false;
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success === true;
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
  
  // ==================== 🔧 P4-5: 從 Legacy AuthService 遷移的方法 ====================
  
  /**
   * 🔧 P4-5: 更新用戶郵箱
   */
  async updateEmail(newEmail: string, password: string): Promise<{ success: boolean; message: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: '請先登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail,
          password: password
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const currentUser = this._user();
        if (currentUser) {
          const updated = { ...currentUser, email: newEmail };
          this._user.set(updated);
          localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(updated));
          this.authEvents.emitUserUpdate(updated);
        }
        return { success: true, message: '郵箱更新成功' };
      }
      
      return { success: false, message: result.error || result.message || '郵箱更新失敗' };
    } catch (error: any) {
      return { success: false, message: error.message || '修改郵箱失敗' };
    }
  }
  
  /**
   * 🔧 P4-5: 更新顯示名稱
   */
  async updateDisplayName(newDisplayName: string): Promise<{ success: boolean; message: string }> {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: '請先登入' };
    }
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          display_name: newDisplayName
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const currentUser = this._user();
        if (currentUser) {
          const updated = {
            ...currentUser,
            display_name: newDisplayName,
            displayName: newDisplayName
          };
          this._user.set(updated);
          localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(updated));
          this.authEvents.emitUserUpdate(updated);
        }
        return { success: true, message: '顯示名稱更新成功' };
      }
      
      return { success: false, message: result.error || result.message || '顯示名稱更新失敗' };
    } catch (error: any) {
      return { success: false, message: error.message || '修改顯示名稱失敗' };
    }
  }
  
  /**
   * 🔧 P4-5: 續費/升級會員（使用卡密）
   * 兼容 Legacy AuthService 的 renewMembership 簽名
   */
  async renewMembership(licenseKey: string): Promise<{ success: boolean; message: string; newExpires?: string }> {
    const result = await this.activateLicense(licenseKey);
    return {
      success: result.success,
      message: result.message,
      newExpires: result.data?.expiresAt
    };
  }
  
  // ==================== 🆕 會員管理 ====================
  
  /**
   * 獲取使用統計（並同步到信號）
   */
  async getUsageStats(): Promise<UsageStats | null> {
    const token = this._accessToken();
    if (!token) return null;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/usage-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        this._usageStats.set(result.data);
        return result.data;
      }
      if (result.success && result.stats) {
        this._usageStats.set(result.stats);
        return result.stats;
      }
      return null;
    } catch (e) {
      console.error('Failed to get usage stats:', e);
      return null;
    }
  }
  
  /**
   * 🔧 P4-5: 載入使用統計到信號（兼容 Legacy loadUsageStats）
   */
  async loadUsageStats(): Promise<void> {
    await this.getUsageStats();
  }
  
  /**
   * 🔧 P4-5: 載入設備列表到信號
   */
  async loadDevices(): Promise<DeviceInfo[]> {
    const devices = await this.getDevices();
    this._devices.set(devices);
    return devices;
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
      
      // 🔧 修復：檢查 Token 是否真的未過期，而非僅檢查長度
      // 如果 Access Token 過期但 Refresh Token 有效 → 設置 refreshToken，由背景刷新機制更新
      // 如果兩個都過期 → 清除所有 Token，讓用戶重新登入
      const accessAlive = accessToken ? this.isValidTokenFormat(accessToken) : false;
      const refreshAlive = refreshToken ? this.isValidTokenFormat(refreshToken) : false;
      
      console.log('[Auth] Token status - accessAlive:', accessAlive, 'refreshAlive:', refreshAlive);
      
      if (accessAlive) {
        // ✅ Access Token 有效，正常恢復
        this._accessToken.set(accessToken!);
      } else if (refreshAlive) {
        // ⚠️ Access Token 過期但 Refresh Token 有效，觸發背景刷新
        console.warn('[Auth] Access token expired, will attempt background refresh');
        // 暫時設置過期的 access token（讓 isAuthenticated 為 true，避免閃爍）
        if (accessToken) this._accessToken.set(accessToken);
      } else if (accessToken || refreshToken) {
        // ❌ 兩個都過期，清除殘留 Token
        console.warn('[Auth] All tokens expired, clearing stale session');
        localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(TOKEN_KEYS.USER);
        localStorage.removeItem(TOKEN_KEYS.SESSION_ID);
        // 不設置 signal，保持未認證狀態
        return;
      }
      
      if (refreshToken && refreshAlive) {
        this._refreshToken.set(refreshToken);
      }
      if (userJson) {
        try {
          const userData = JSON.parse(userJson);
          // 🔧 P0 修復：恢復時也做字段名映射，確保 displayName 別名可用
          if (!userData.displayName && userData.display_name) {
            userData.displayName = userData.display_name;
          }
          if (!userData.display_name || (userData.display_name || '').trim() === '') {
            userData.display_name = userData.telegram_first_name || userData.username || '用戶';
            userData.displayName = userData.display_name;
          }
          if (!userData.telegramId && userData.telegram_id) {
            userData.telegramId = userData.telegram_id;
          }
          this._user.set(userData);
          console.log('[Auth] User restored from localStorage, displayName:', userData.displayName || userData.display_name);
        } catch {
          // 用戶 JSON 解析失敗時僅不恢復 user，不清除 token，避免秒回登入頁
          console.warn('[Auth] Invalid user JSON, skipping user restore only');
        }
      }
      
      // 🔧 修復：Token 有效性會在實際 API 請求時由後端驗證
      console.log('[Auth] Session restored successfully');
      
      // 🔧 修復：恢復 Token 後，立即向後端驗證有效性
      // 如果後端返回 401，說明 Token 真的無效，清除並跳轉登入頁
      if (this._accessToken()) {
        queueMicrotask(() => {
          if (this._accessToken()) {
            this.fetchCurrentUser().then(user => {
              if (user) {
                console.log('[Auth] Token validated, user:', user.username);
              } else {
                // 🔧 關鍵修復：fetchCurrentUser 返回 null 說明 Token 無效
                console.warn('[Auth] Token validation failed, clearing session');
                this.clearAuthStateInternal();
                this.router.navigate(['/auth/login']);
              }
            }).catch(e => {
              console.warn('[Auth] Token validation error:', e);
            });
          }
        });
      }
    } catch (e) {
      // 🔧 恢復出錯時只記日誌，不清除 session，避免任何意外導致秒回登入頁
      console.error('[Auth] Restore session error (not clearing):', e);
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
  
  /** 安全解析 JSON：若後端返回 HTML（如 502/404 頁）則返回 null，避免拋出 "Unexpected token" */
  private async parseJsonResponse(response: Response): Promise<Record<string, unknown> | null> {
    const text = await response.text();
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || !trimmed) {
      return null;
    }
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /** 與 ElectronIpcService 一致：安裝版通過 window.require('electron').ipcRenderer 判斷 */
  private isElectronEnv(): boolean {
    try {
      return !!(window as any).electronAPI || !!(window as any).electron ||
        !!((window as any).require && (window as any).require('electron')?.ipcRenderer);
    } catch {
      return false;
    }
  }

  /** 安裝版 IPC invoke，用於 auth-login 等需返回值的調用 */
  private getIpcInvoke(): ((channel: string, ...args: any[]) => Promise<any>) | null {
    try {
      const w = window as any;
      if (w.electron?.ipcRenderer?.invoke) return w.electron.ipcRenderer.invoke.bind(w.electron.ipcRenderer);
      if (w.require?.('electron')?.ipcRenderer?.invoke) return w.require('electron').ipcRenderer.invoke.bind(w.require('electron').ipcRenderer);
      return null;
    } catch {
      return null;
    }
  }

  private getApiBaseUrl(): string {
    return getEffectiveApiBaseUrl();
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
