/**
 * 用戶認證服務
 * 處理登入、退出、Token 管理、用戶狀態
 */

import { Injectable, signal, computed, inject, Injector, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DeviceService } from './device.service';
import { MembershipLevel } from './membership.service';
import { LicenseClientService } from './license-client.service';
import { AuthEventsService, AUTH_STORAGE_KEYS } from './core/auth-events.service';

// 用戶信息接口
export interface User {
  id: number;
  username: string;
  displayName?: string;  // 用戶暱稱/顯示名稱
  telegramId?: string;   // 🆕 Telegram ID
  telegramUsername?: string;  // 🆕 Telegram 用戶名
  email?: string;
  phone?: string;
  avatar?: string;
  membershipLevel: MembershipLevel;
  membershipExpires?: string;
  inviteCode: string;
  invitedCount: number;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'suspended' | 'banned';
}

// 登入響應
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  expiresAt?: string;
}

// 登入請求
export interface LoginRequest {
  username: string;
  password: string;
  deviceCode: string;
}

// 卡密激活請求
export interface ActivateRequest {
  licenseKey: string;
  username: string;
  password: string;
  deviceCode: string;
}

// 邀請碼註冊請求
export interface RegisterRequest {
  inviteCode: string;
  username: string;
  password: string;
  email?: string;
  deviceCode: string;
}

// 設備信息
export interface DeviceInfo {
  id: number;
  deviceCode: string;
  deviceName: string;
  boundAt: string;
  lastSeen: string;
  isCurrent: boolean;
  status: 'active' | 'inactive';
}

// 使用統計
export interface UsageStats {
  aiCalls: { used: number; limit: number };
  messagesSent: { used: number; limit: number };
  accounts: { used: number; limit: number };
  storage: { used: number; limit: number }; // MB
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private deviceService = inject(DeviceService);
  private injector = inject(Injector);
  private licenseClient = inject(LicenseClientService);
  private router = inject(Router);
  private authEvents = inject(AuthEventsService);
  
  // 事件訂閱
  private eventSubscription: Subscription | null = null;
  
  // ========== 免登錄完整版配置 ==========
  // 僅在 Electron/IPC 模式下啟用，SaaS 模式必須登入
  // 檢測方式：window.electronAPI 存在表示在 Electron 環境
  private readonly SKIP_LOGIN = !!(window as any).electronAPI || !!(window as any).electron;
  
  // 默認用戶配置（免登錄模式使用）
  private readonly DEFAULT_USER: User = {
    id: 1,
    username: 'Admin',
    email: 'admin@tgai.local',
    membershipLevel: 'king',  // 最高等級：榮耀王者
    membershipExpires: new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000).toISOString(), // 100年後過期
    inviteCode: 'ADMIN-VIP',
    invitedCount: 0,
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    status: 'active'
  };
  // ========== 免登錄配置結束 ==========
  
  // 響應式狀態
  private _isAuthenticated = signal(this.SKIP_LOGIN);  // 免登錄模式默認為 true
  private _user = signal<User | null>(this.SKIP_LOGIN ? this.DEFAULT_USER : null);
  private _token = signal<string | null>(this.SKIP_LOGIN ? 'skip-login-token' : null);
  private _isLoading = signal(false);
  private _devices = signal<DeviceInfo[]>([]);
  private _usageStats = signal<UsageStats | null>(null);
  
  // 公開的計算屬性
  isAuthenticated = computed(() => this._isAuthenticated());
  user = computed(() => this._user());
  isLoading = computed(() => this._isLoading());
  devices = computed(() => this._devices());
  usageStats = computed(() => this._usageStats());
  
  // 會員等級相關計算屬性（新版命名：bronze/silver/gold/diamond/star/king）
  membershipLevel = computed(() => this._user()?.membershipLevel || 'bronze');
  // 付費會員（白銀及以上）
  isPaid = computed(() => ['silver', 'gold', 'diamond', 'star', 'king'].includes(this.membershipLevel()));
  // 高級會員（鑽石及以上）
  isPremium = computed(() => ['diamond', 'star', 'king'].includes(this.membershipLevel()));
  // 頂級會員（星耀及以上）
  isElite = computed(() => ['star', 'king'].includes(this.membershipLevel()));
  // 王者會員
  isKing = computed(() => this.membershipLevel() === 'king');
  
  // 會員到期信息
  membershipExpiresSoon = computed(() => {
    const expires = this._user()?.membershipExpires;
    if (!expires) return false;
    const daysLeft = Math.floor((new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  });
  
  membershipDaysLeft = computed(() => {
    const expires = this._user()?.membershipExpires;
    if (!expires) return 0;
    return Math.max(0, Math.floor((new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  });

  constructor() {
    // 免登錄模式：跳過所有認證檢查
    if (this.SKIP_LOGIN) {
      console.log('[AuthService] 免登錄模式已啟用，默認為王者會員');
      return;
    }
    
    // 🆕 訂閱認證事件（處理來自核心服務的登入/登出通知）
    this.eventSubscription = this.authEvents.authEvents$.subscribe(event => {
      if (event.type === 'logout') {
        console.log('[LegacyAuthService] Received logout event, clearing state');
        this.clearLocalAuthInternal();
        this._isAuthenticated.set(false);
        this._user.set(null);
        this._token.set(null);
        this._devices.set([]);
        this._usageStats.set(null);
      } else if (event.type === 'login') {
        // 🔧 P0 修復：同步登入狀態到老版服務
        console.log('[LegacyAuthService] Received login event, syncing state');
        this.syncFromStorage();
      } else if (event.type === 'user_update') {
        // 🔧 同步用戶信息更新
        console.log('[LegacyAuthService] Received user_update event');
        this.syncFromStorage();
      }
    });
    
    // 應用啟動時檢查本地存儲的登入狀態（異步執行，不阻塞渲染）
    // 使用 setTimeout 確保不阻塞 Angular 初始化
    setTimeout(() => {
      this.checkLocalAuth().catch(err => {
        console.error('認證初始化錯誤:', err);
        // 確保即使失敗也顯示登入頁面
        this._isAuthenticated.set(false);
      });
    }, 0);
  }
  
  ngOnDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }

  /**
   * 檢查本地存儲的認證狀態
   * 
   * 🔧 修復：同時支持新版 (tgm_access_token) 和舊版 (tgm_auth_token) Token 格式
   */
  private async checkLocalAuth(): Promise<void> {
    try {
      // 如果 localStorage 不可用（如 SSR），直接返回
      if (typeof localStorage === 'undefined') {
        return;
      }

      // 🔧 優先使用新版 Token（來自 Telegram 登入）
      const storedToken = localStorage.getItem('tgm_access_token') || localStorage.getItem('tgm_auth_token');
      const storedUser = localStorage.getItem('tgm_user');
      
      if (storedToken && storedUser) {
        try {
          const rawUser = JSON.parse(storedUser);
          
          // 🔧 轉換用戶對象格式（新版 API 返回的格式可能不同）
          const user: User = {
            id: rawUser.id || 0,
            username: rawUser.username || 'User',
            displayName: rawUser.display_name || rawUser.displayName || rawUser.nickname || rawUser.telegram_first_name || undefined,
            telegramId: rawUser.telegram_id || rawUser.telegramId || undefined,  // 🆕 Telegram ID
            telegramUsername: rawUser.telegram_username || rawUser.telegramUsername || undefined,  // 🆕 Telegram 用戶名
            email: rawUser.email || undefined,
            phone: rawUser.phone || undefined,
            avatar: rawUser.avatar_url || rawUser.avatar || undefined,
            // 🔧 從 subscription_tier 轉換到 membershipLevel
            membershipLevel: this.tierToLevel(rawUser.subscription_tier || rawUser.membershipLevel || 'free'),
            membershipExpires: rawUser.membershipExpires || rawUser.subscription_expires || undefined,
            inviteCode: rawUser.inviteCode || rawUser.invite_code || '',
            invitedCount: rawUser.invitedCount || rawUser.invited_count || 0,
            createdAt: rawUser.createdAt || rawUser.created_at || new Date().toISOString(),
            lastLogin: rawUser.lastLogin || rawUser.last_login_at || new Date().toISOString(),
            status: rawUser.status || (rawUser.is_active ? 'active' : 'suspended')
          };
          
          // 設置用戶狀態
          this._token.set(storedToken);
          this._user.set(user);
          this._isAuthenticated.set(true);
          
          console.log('[AuthService] 已從本地存儲恢復用戶:', user.username);
          
          // 載入設備列表和使用統計（異步，不阻塞）
          this.loadDevices().catch(err => console.error('載入設備列表失敗:', err));
          this.loadUsageStats().catch(err => console.error('載入使用統計失敗:', err));
        } catch (parseError) {
          console.error('解析用戶數據失敗:', parseError);
          this.clearLocalAuth();
          this._isAuthenticated.set(false);
        }
      } else {
        // 沒有存儲的認證信息，確保狀態為未認證
        this._isAuthenticated.set(false);
      }
    } catch (error) {
      console.error('檢查本地認證失敗:', error);
      this.clearLocalAuth();
      // 確保錯誤時也顯示登入頁面
      this._isAuthenticated.set(false);
    }
  }
  
  /**
   * 🆕 從後端獲取當前用戶信息
   * 用於刷新用戶狀態或驗證 Token 有效性
   */
  async fetchCurrentUser(): Promise<User | null> {
    try {
      const token = this._token() || localStorage.getItem('tgm_access_token');
      if (!token) {
        console.log('[AuthService] fetchCurrentUser: No token available');
        return null;
      }
      
      // 獲取 API 基礎 URL
      const apiBaseUrl = this.getApiBaseUrl();
      
      console.log('[AuthService] fetchCurrentUser: Fetching from', apiBaseUrl);
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.warn(`[AuthService] fetchCurrentUser: HTTP ${response.status}`);
        return null;
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 轉換為本地 User 格式
        const rawUser = result.data;
        const user: User = {
          id: rawUser.id || 0,
          username: rawUser.username || 'User',
          displayName: rawUser.display_name || rawUser.displayName || rawUser.nickname || rawUser.telegram_first_name || undefined,
          telegramId: rawUser.telegram_id || rawUser.telegramId || undefined,  // 🆕 Telegram ID
          telegramUsername: rawUser.telegram_username || rawUser.telegramUsername || undefined,  // 🆕 Telegram 用戶名
          email: rawUser.email || undefined,
          phone: rawUser.phone || undefined,
          avatar: rawUser.avatar_url || rawUser.avatar || undefined,
          membershipLevel: this.tierToLevel(rawUser.subscription_tier || rawUser.membershipLevel || 'free'),
          membershipExpires: rawUser.membershipExpires || rawUser.subscription_expires || undefined,
          inviteCode: rawUser.inviteCode || rawUser.invite_code || '',
          invitedCount: rawUser.invitedCount || rawUser.invited_count || 0,
          createdAt: rawUser.createdAt || rawUser.created_at || new Date().toISOString(),
          lastLogin: rawUser.lastLogin || rawUser.last_login_at || new Date().toISOString(),
          status: rawUser.status || (rawUser.is_active ? 'active' : 'suspended')
        };
        
        console.log('[AuthService] fetchCurrentUser: Success', user.username);
        this._user.set(user);
        // 更新 localStorage
        localStorage.setItem('tgm_user', JSON.stringify(result.data));
        return user;
      }
      
      console.warn('[AuthService] fetchCurrentUser: API returned', result);
      return null;
    } catch (e) {
      console.error('[AuthService] fetchCurrentUser error:', e);
      return null;
    }
  }
  
  /**
   * 獲取 API 基礎 URL
   */
  private getApiBaseUrl(): string {
    // 開發環境
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' && window.location.port === '4200') {
        return 'http://localhost:8000';
      }
    }
    // 生產環境
    return '';
  }
  
  /**
   * 🔧 將 subscription_tier 轉換為 membershipLevel
   */
  private tierToLevel(tier: string): MembershipLevel {
    const tierMap: Record<string, MembershipLevel> = {
      'free': 'bronze',
      'basic': 'silver',
      'pro': 'gold',
      'enterprise': 'diamond',
      // 直接映射
      'bronze': 'bronze',
      'silver': 'silver',
      'gold': 'gold',
      'diamond': 'diamond',
      'star': 'star',
      'king': 'king'
    };
    return tierMap[tier] || 'bronze';
  }

  /**
   * 帳號密碼登入
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    this._isLoading.set(true);
    
    try {
      const deviceCode = await this.deviceService.getDeviceCode();
      
      const response = await this.callAuthApi('/api/auth/login', {
        username,
        password,
        deviceCode
      });
      
      if (response.success && response.user && response.token) {
        await this.handleLoginSuccess(response.user, response.token);
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '登入失敗，請稍後重試'
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * 卡密激活（新用戶首次使用）
   */
  async activateLicense(licenseKey: string, username: string, password: string): Promise<LoginResponse> {
    this._isLoading.set(true);
    
    try {
      const deviceCode = await this.deviceService.getDeviceCode();
      
      const response = await this.callAuthApi('/api/auth/activate', {
        licenseKey,
        username,
        password,
        deviceCode
      });
      
      if (response.success && response.user && response.token) {
        await this.handleLoginSuccess(response.user, response.token);
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '激活失敗，請檢查卡密是否正確'
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * 邀請碼註冊
   */
  async registerWithInvite(inviteCode: string, username: string, password: string, email?: string): Promise<LoginResponse> {
    this._isLoading.set(true);
    
    try {
      const deviceCode = await this.deviceService.getDeviceCode();
      
      const response = await this.callAuthApi('/api/auth/register', {
        inviteCode,
        username,
        password,
        email,
        deviceCode
      });
      
      if (response.success && response.user && response.token) {
        await this.handleLoginSuccess(response.user, response.token);
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '註冊失敗，請稍後重試'
      };
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * 退出
   */
  async logout(): Promise<void> {
    try {
      const token = this._token();
      if (token) {
        await this.callAuthApi('/api/auth/logout', { token });
      }
    } catch (error) {
      console.error('退出 API 調用失敗:', error);
    } finally {
      // 🆕 廣播登出事件，通知所有訂閱者（包括核心服務）
      this.authEvents.emitLogout();
      
      // 清除本服務狀態
      this.clearLocalAuthInternal();
      this._isAuthenticated.set(false);
      this._user.set(null);
      this._token.set(null);
      this._devices.set([]);
      this._usageStats.set(null);
      
      // 🔧 修復：退出後跳轉到登入頁面
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * 修改密碼
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      return await this.callAuthApi('/api/auth/change-password', {
        oldPassword,
        newPassword,
        token: this._token()
      });
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '修改密碼失敗'
      };
    }
  }

  /**
   * 🆕 修改郵箱
   * 使用 PUT /api/v1/auth/me 接口更新用戶信息
   */
  async updateEmail(newEmail: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // 先驗證密碼（通過嘗試登入）
      const token = this._token();
      if (!token) {
        return { success: false, message: '請先登入' };
      }
      
      // 調用 PUT /api/v1/auth/me 更新用戶信息
      const baseUrl = localStorage.getItem('api_base_url') || 'https://tg.dairoot.cn';
      const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newEmail,
          password: password  // 傳遞密碼用於驗證
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地用戶信息
        const currentUser = this._user();
        if (currentUser) {
          this._user.set({
            ...currentUser,
            email: newEmail
          });
          // 更新本地存儲
          localStorage.setItem('user', JSON.stringify(this._user()));
        }
        return { success: true, message: '郵箱更新成功' };
      }
      
      return { success: false, message: result.error || result.message || '郵箱更新失敗' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '修改郵箱失敗'
      };
    }
  }

  /**
   * 🆕 修改顯示名稱
   */
  async updateDisplayName(newDisplayName: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = this._token();
      if (!token) {
        return { success: false, message: '請先登入' };
      }
      
      // 調用 PUT /api/v1/auth/me 更新用戶信息
      const baseUrl = localStorage.getItem('api_base_url') || 'https://tg.dairoot.cn';
      const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
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
        // 更新本地用戶信息
        const currentUser = this._user();
        if (currentUser) {
          this._user.set({
            ...currentUser,
            displayName: newDisplayName
          });
          // 更新本地存儲
          const storedUser = JSON.parse(localStorage.getItem('tgm_user') || '{}');
          storedUser.display_name = newDisplayName;
          storedUser.displayName = newDisplayName;
          localStorage.setItem('tgm_user', JSON.stringify(storedUser));
        }
        return { success: true, message: '顯示名稱更新成功' };
      }
      
      return { success: false, message: result.error || result.message || '顯示名稱更新失敗' };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '修改顯示名稱失敗'
      };
    }
  }

  /**
   * 續費/升級會員（使用卡密）
   * 調用後端 API 激活卡密，並同步更新所有相關狀態
   */
  async renewMembership(licenseKey: string): Promise<{ success: boolean; message: string; newExpires?: string }> {
    try {
      const currentUser = this._user();
      const email = currentUser?.email || '';
      
      // 使用 LicenseClientService 調用後端 API
      const result = await this.licenseClient.activateLicense(licenseKey, email);
      
      if (result.success) {
        // 獲取會員等級信息：優先使用 API 返回的數據，否則從卡密解析
        let newLevel: MembershipLevel = 'silver';
        let newExpires = '';
        let levelName = '白銀精英';
        let levelIcon = '🥈';
        
        if (result.data?.level) {
          newLevel = result.data.level as MembershipLevel;
          newExpires = result.data.expiresAt || '';
          levelName = result.data.levelName || this.getLevelName(newLevel);
          levelIcon = result.data.levelIcon || this.getLevelIcon(newLevel);
        } else {
          // 從卡密解析等級信息（後備方案）
          const parsedKey = this.parseLicenseKey(licenseKey);
          if (parsedKey.valid) {
            newLevel = parsedKey.level;
            newExpires = parsedKey.expiresAt;
            levelName = parsedKey.levelName;
            levelIcon = parsedKey.levelIcon;
          }
        }
        
        // 更新 AuthService 中的用戶狀態
        if (currentUser) {
          const updatedUser: User = {
            ...currentUser,
            membershipLevel: newLevel,
            membershipExpires: newExpires
          };
          this._user.set(updatedUser);
          localStorage.setItem('tgm_user', JSON.stringify(updatedUser));
          console.log('[AuthService] 用戶狀態已更新:', { level: newLevel, expires: newExpires });
        } else {
          // 如果沒有當前用戶，創建一個新用戶
          const newUser: User = {
            id: 1,
            username: email.split('@')[0] || 'User',
            email: email,
            membershipLevel: newLevel,
            membershipExpires: newExpires,
            inviteCode: '',
            invitedCount: 0,
            createdAt: new Date().toISOString(),
            status: 'active'
          };
          this._user.set(newUser);
          localStorage.setItem('tgm_user', JSON.stringify(newUser));
          console.log('[AuthService] 新用戶已創建:', { level: newLevel, expires: newExpires });
        }
        
        // 刷新使用統計
        await this.loadUsageStats();
        
        // 觸發狀態更新事件，讓其他組件知道會員狀態已更新
        window.dispatchEvent(new CustomEvent('membership-updated', {
          detail: {
            level: newLevel,
            levelName: levelName,
            levelIcon: levelIcon,
            expiresAt: newExpires
          }
        }));
        
        const successMessage = result.message || `🎉 ${levelIcon} ${levelName} 激活成功！`;
        
        return {
          success: true,
          message: successMessage,
          newExpires: newExpires
        };
      }
      
      return {
        success: false,
        message: result.message || '激活失敗'
      };
    } catch (error: any) {
      console.error('激活卡密失敗:', error);
      return {
        success: false,
        message: error.message || '激活失敗，請稍後重試'
      };
    }
  }

  /**
   * 獲取會員等級名稱
   */
  private getLevelName(level: MembershipLevel): string {
    const names: Record<MembershipLevel, string> = {
      bronze: '青銅戰士',
      silver: '白銀精英',
      gold: '黃金大師',
      diamond: '鑽石王牌',
      star: '星耀傳說',
      king: '榮耀王者'
    };
    return names[level] || '青銅戰士';
  }

  /**
   * 獲取會員等級圖標
   */
  private getLevelIcon(level: MembershipLevel): string {
    const icons: Record<MembershipLevel, string> = {
      bronze: '⚔️',
      silver: '🥈',
      gold: '🥇',
      diamond: '💎',
      star: '🌟',
      king: '👑'
    };
    return icons[level] || '⚔️';
  }

  /**
   * 綁定新設備
   */
  async bindDevice(deviceCode: string, deviceName: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.callAuthApi('/api/auth/bind-device', {
        deviceCode,
        deviceName,
        token: this._token()
      });
      
      if (response.success) {
        await this.loadDevices();
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '綁定設備失敗'
      };
    }
  }

  /**
   * 解綁設備
   */
  async unbindDevice(deviceId: number): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.callAuthApi('/api/auth/unbind-device', {
        deviceId,
        token: this._token()
      });
      
      if (response.success) {
        await this.loadDevices();
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '解綁設備失敗'
      };
    }
  }

  /**
   * 載入設備列表
   */
  async loadDevices(): Promise<void> {
    try {
      const response = await this.callAuthApi('/api/auth/devices', {
        token: this._token()
      });
      
      if (response.success && response.devices) {
        const currentDeviceCode = await this.deviceService.getDeviceCode();
        const devices = response.devices.map((d: any) => ({
          ...d,
          isCurrent: d.deviceCode === currentDeviceCode
        }));
        this._devices.set(devices);
      }
    } catch (error) {
      console.error('載入設備列表失敗:', error);
    }
  }

  /**
   * 載入使用統計
   */
  async loadUsageStats(): Promise<void> {
    try {
      // 優先使用 LicenseClientService 調用真實後端 API
      try {
        const { LicenseClientService } = await import('./license-client.service');
        const licenseClient = this.injector.get(LicenseClientService);
        const result = await licenseClient.getUsageStats();
        if (result.success && result.stats) {
          this._usageStats.set(result.stats);
          return;
        }
      } catch (e) {
        console.warn('使用 LicenseClientService 載入統計失敗，嘗試使用 mock API:', e);
      }
      
      // 降級到 mock API（開發模式）
      const response = await this.callAuthApi('/api/auth/usage-stats', {
        token: this._token()
      });
      
      if (response.success && response.stats) {
        this._usageStats.set(response.stats);
      }
    } catch (error) {
      console.error('載入使用統計失敗:', error);
    }
  }

  /**
   * 獲取邀請獎勵信息
   */
  async getInviteRewards(): Promise<{ inviteCode: string; invitedCount: number; rewardDays: number }> {
    try {
      const response = await this.callAuthApi('/api/auth/invite-rewards', {
        token: this._token()
      });
      
      return response.success ? response : {
        inviteCode: this._user()?.inviteCode || '',
        invitedCount: 0,
        rewardDays: 0
      };
    } catch (error) {
      return {
        inviteCode: this._user()?.inviteCode || '',
        invitedCount: 0,
        rewardDays: 0
      };
    }
  }

  /**
   * 處理登入成功
   */
  private async handleLoginSuccess(user: User, token: string): Promise<void> {
    this._user.set(user);
    this._token.set(token);
    this._isAuthenticated.set(true);
    
    // 存儲到本地
    localStorage.setItem('tgm_auth_token', token);
    localStorage.setItem('tgm_user', JSON.stringify(user));
    
    // 載入設備和使用統計
    await this.loadDevices();
    await this.loadUsageStats();
  }

  /**
   * 驗證 Token
   */
  private async verifyToken(token: string, deviceCode: string): Promise<boolean> {
    try {
      const response = await this.callAuthApi('/api/auth/verify', {
        token,
        deviceCode
      });
      return response.success === true;
    } catch {
      return false;
    }
  }

  /**
   * 清除本地認證數據（公開，會發送事件）
   */
  private clearLocalAuth(): void {
    this.authEvents.emitLogout();
    this.clearLocalAuthInternal();
  }
  
  /**
   * 內部清除方法（不發送事件，避免循環）
   */
  private clearLocalAuthInternal(): void {
    // 🆕 使用集中式清除方法
    this.authEvents.clearAllAuthStorage();
  }

  /**
   * 🔧 P0 修復：從 localStorage 同步狀態
   * 當收到 login 事件時調用，確保老版服務狀態與核心服務同步
   */
  private syncFromStorage(): void {
    try {
      const storedToken = this.authEvents.getStoredToken();
      const storedUser = this.authEvents.getStoredUser();
      
      if (storedToken && storedUser) {
        // 標準化用戶數據格式
        const user: User = {
          id: storedUser.id || 0,
          username: storedUser.username || 'User',
          displayName: storedUser.display_name || storedUser.displayName || storedUser.nickname || storedUser.telegram_first_name || undefined,
          telegramId: storedUser.telegram_id || storedUser.telegramId || undefined,  // 🆕 Telegram ID
          telegramUsername: storedUser.telegram_username || storedUser.telegramUsername || undefined,  // 🆕 Telegram 用戶名
          email: storedUser.email || undefined,
          phone: storedUser.phone || undefined,
          avatar: storedUser.avatar_url || storedUser.avatar || undefined,
          membershipLevel: this.tierToLevel(storedUser.subscription_tier || storedUser.membershipLevel || 'free'),
          membershipExpires: storedUser.membershipExpires || storedUser.subscription_expires || undefined,
          inviteCode: storedUser.inviteCode || storedUser.invite_code || '',
          invitedCount: storedUser.invitedCount || storedUser.invited_count || 0,
          createdAt: storedUser.createdAt || storedUser.created_at || new Date().toISOString(),
          lastLogin: storedUser.lastLogin || storedUser.last_login_at || new Date().toISOString(),
          status: storedUser.status || (storedUser.is_active ? 'active' : 'suspended')
        };
        
        // 更新 Signal 狀態
        this._token.set(storedToken);
        this._user.set(user);
        this._isAuthenticated.set(true);
        
        console.log('[LegacyAuthService] State synced from storage:', user.username);
        
        // 異步載入設備和使用統計
        this.loadDevices().catch(err => console.error('載入設備列表失敗:', err));
        this.loadUsageStats().catch(err => console.error('載入使用統計失敗:', err));
      } else {
        console.warn('[LegacyAuthService] No valid auth data in storage');
      }
    } catch (error) {
      console.error('[LegacyAuthService] Error syncing from storage:', error);
    }
  }

  /**
   * 調用認證 API（開發模式使用模擬數據）
   */
  private async callAuthApi(endpoint: string, data: any): Promise<any> {
    // 開發模式：模擬 API 響應
    if (this.isDevMode()) {
      return this.mockApiResponse(endpoint, data);
    }
    
    // 生產模式：調用實際 API
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': data.token ? `Bearer ${data.token}` : ''
        },
        body: JSON.stringify(data)
      });
      
      return await response.json();
    } catch (error) {
      throw new Error('網絡連接失敗');
    }
  }

  /**
   * 開發模式檢測
   */
  private isDevMode(): boolean {
    return typeof window !== 'undefined' && 
           (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1');
  }

  /**
   * 模擬 API 響應（開發測試用）
   */
  private mockApiResponse(endpoint: string, data: any): Promise<any> {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (endpoint) {
          case '/api/auth/login':
            if (data.username && data.password) {
              resolve({
                success: true,
                message: '登入成功',
                user: this.getMockUser(data.username),
                token: 'mock_token_' + Date.now(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
              });
            } else {
              resolve({ success: false, message: '用戶名或密碼錯誤' });
            }
            break;
            
          case '/api/auth/activate':
            if (data.licenseKey && data.licenseKey.length >= 16) {
              resolve({
                success: true,
                message: '激活成功',
                user: this.getMockUser(data.username, 'silver'),
                token: 'mock_token_' + Date.now()
              });
            } else {
              resolve({ success: false, message: '卡密無效或已使用' });
            }
            break;
            
          case '/api/auth/register':
            if (data.inviteCode && data.username && data.password) {
              resolve({
                success: true,
                message: '註冊成功',
                user: this.getMockUser(data.username),
                token: 'mock_token_' + Date.now()
              });
            } else {
              resolve({ success: false, message: '邀請碼無效' });
            }
            break;
            
          case '/api/auth/verify':
            resolve({ success: true });
            break;
            
          case '/api/auth/devices':
            resolve({
              success: true,
              devices: [
                {
                  id: 1,
                  deviceCode: data.deviceCode || 'TGM-MOCK-001',
                  deviceName: '當前設備',
                  boundAt: new Date().toISOString(),
                  lastSeen: new Date().toISOString(),
                  status: 'active'
                }
              ]
            });
            break;
            
          case '/api/auth/usage-stats':
            resolve({
              success: true,
              stats: {
                aiCalls: { used: 150, limit: 500 },
                messagesSent: { used: 2340, limit: 10000 },
                accounts: { used: 5, limit: 10 },
                storage: { used: 45, limit: 100 }
              }
            });
            break;
            
          case '/api/auth/invite-rewards':
            resolve({
              success: true,
              inviteCode: 'INVITE-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
              invitedCount: 3,
              rewardDays: 9
            });
            break;
            
          case '/api/auth/renew':
            // 解析卡密並更新會員等級
            const renewResult = this.parseLicenseKey(data.licenseKey);
            if (renewResult.valid) {
              const currentUser = this._user();
              if (currentUser) {
                const updatedUser: User = {
                  ...currentUser,
                  membershipLevel: renewResult.level,
                  membershipExpires: renewResult.expiresAt
                };
                resolve({
                  success: true,
                  message: `🎉 ${renewResult.levelIcon} ${renewResult.levelName} 激活成功！有效期至 ${new Date(renewResult.expiresAt).toLocaleDateString()}`,
                  user: updatedUser,
                  newExpires: renewResult.expiresAt
                });
              } else {
                resolve({ success: false, message: '請先登入' });
              }
            } else {
              resolve({ success: false, message: renewResult.message });
            }
            break;
            
          default:
            resolve({ success: true, message: 'OK' });
        }
      }, 500); // 模擬網絡延遲
    });
  }

  /**
   * 生成模擬用戶數據
   */
  private getMockUser(username: string, level: MembershipLevel = 'silver'): User {
    return {
      id: 1,
      username: username,
      email: `${username}@example.com`,
      membershipLevel: level,
      membershipExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      inviteCode: 'INVITE-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      invitedCount: 3,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      status: 'active'
    };
  }

  /**
   * 解析卡密格式
   * 新格式: TGAI-[等級時長]-[XXXX]-[XXXX]-[XXXX]
   * 舊格式: TGM-[等級時長]-[XXXX]-[XXXX]-[XXXX]
   * 等級: B=白銀/G=黃金/D=鑽石/S=星耀/K=王者
   * 時長: 1=周/2=月/3=季/Y=年/L=終身
   */
  private parseLicenseKey(licenseKey: string): {
    valid: boolean;
    message: string;
    level: MembershipLevel;
    levelName: string;
    levelIcon: string;
    durationDays: number;
    expiresAt: string;
  } {
    if (!licenseKey) {
      return { valid: false, message: '請輸入卡密', level: 'bronze', levelName: '', levelIcon: '', durationDays: 0, expiresAt: '' };
    }

    // 新版卡密格式驗證
    const newKeyRegex = /^TGAI-([BGDSK][123YL]|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const oldKeyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    
    let match = licenseKey.toUpperCase().match(newKeyRegex);
    if (!match) {
      match = licenseKey.toUpperCase().match(oldKeyRegex);
    }
    
    if (!match) {
      return { valid: false, message: '⚔️ 卡密格式不正確，請檢查後重試', level: 'bronze', levelName: '', levelIcon: '', durationDays: 0, expiresAt: '' };
    }
    
    const typeCode = match[1];
    const levelCode = typeCode[0];
    const durationCode = typeCode[1] || '2';
    
    // 等級映射
    const levelMap: Record<string, { level: MembershipLevel; name: string; icon: string }> = {
      'B': { level: 'silver', name: '白銀精英', icon: '🥈' },
      'G': { level: 'gold', name: '黃金大師', icon: '🥇' },
      'D': { level: 'diamond', name: '鑽石王牌', icon: '💎' },
      'S': { level: 'star', name: '星耀傳說', icon: '🌟' },
      'K': { level: 'king', name: '榮耀王者', icon: '👑' },
      'E': { level: 'gold', name: '黃金大師', icon: '🥇' },
    };
    
    // 時長映射（天數）
    const durationMap: Record<string, number> = {
      '1': 7,      // 周卡
      '2': 30,     // 月卡
      '3': 90,     // 季卡
      'Y': 365,    // 年卡
      'L': 36500,  // 終身（100年）
      'X': 30,     // EXT 默認30天
    };
    
    const levelInfo = levelMap[levelCode] || { level: 'silver' as MembershipLevel, name: '白銀精英', icon: '🥈' };
    const durationDays = durationMap[durationCode] || 30;
    
    // 計算到期時間：基於當前會員到期時間延長，或從現在開始
    const currentUser = this._user();
    let baseDate = new Date();
    if (currentUser?.membershipExpires) {
      const currentExpires = new Date(currentUser.membershipExpires);
      if (currentExpires > baseDate) {
        baseDate = currentExpires;
      }
    }
    baseDate.setDate(baseDate.getDate() + durationDays);
    
    return {
      valid: true,
      message: '卡密有效',
      level: levelInfo.level,
      levelName: levelInfo.name,
      levelIcon: levelInfo.icon,
      durationDays,
      expiresAt: baseDate.toISOString()
    };
  }
}
