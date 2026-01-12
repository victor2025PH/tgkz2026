/**
 * 用戶認證服務
 * 處理登入、登出、Token 管理、用戶狀態
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { DeviceService } from './device.service';

// 用戶信息接口
export interface User {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  membershipLevel: 'free' | 'vip' | 'svip' | 'mvp';
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
export class AuthService {
  private deviceService = inject(DeviceService);
  
  // 響應式狀態
  private _isAuthenticated = signal(false);
  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);
  private _isLoading = signal(false);
  private _devices = signal<DeviceInfo[]>([]);
  private _usageStats = signal<UsageStats | null>(null);
  
  // 公開的計算屬性
  isAuthenticated = computed(() => this._isAuthenticated());
  user = computed(() => this._user());
  isLoading = computed(() => this._isLoading());
  devices = computed(() => this._devices());
  usageStats = computed(() => this._usageStats());
  
  // 會員等級相關計算屬性
  membershipLevel = computed(() => this._user()?.membershipLevel || 'free');
  isVip = computed(() => ['vip', 'svip', 'mvp'].includes(this.membershipLevel()));
  isSvip = computed(() => ['svip', 'mvp'].includes(this.membershipLevel()));
  isMvp = computed(() => this.membershipLevel() === 'mvp');
  
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

  /**
   * 檢查本地存儲的認證狀態
   */
  private async checkLocalAuth(): Promise<void> {
    try {
      // 如果 localStorage 不可用（如 SSR），直接返回
      if (typeof localStorage === 'undefined') {
        return;
      }

      const storedToken = localStorage.getItem('tgm_auth_token');
      const storedUser = localStorage.getItem('tgm_user');
      
      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        const deviceCode = await this.deviceService.getDeviceCode();
        
        // 驗證 Token 和設備碼
        const isValid = await this.verifyToken(storedToken, deviceCode);
        
        if (isValid) {
          this._token.set(storedToken);
          this._user.set(user);
          this._isAuthenticated.set(true);
          
          // 載入設備列表和使用統計（異步，不阻塞）
          this.loadDevices().catch(err => console.error('載入設備列表失敗:', err));
          this.loadUsageStats().catch(err => console.error('載入使用統計失敗:', err));
        } else {
          // Token 無效，清除本地存儲
          this.clearLocalAuth();
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
   * 登出
   */
  async logout(): Promise<void> {
    try {
      const token = this._token();
      if (token) {
        await this.callAuthApi('/api/auth/logout', { token });
      }
    } catch (error) {
      console.error('登出 API 調用失敗:', error);
    } finally {
      this.clearLocalAuth();
      this._isAuthenticated.set(false);
      this._user.set(null);
      this._token.set(null);
      this._devices.set([]);
      this._usageStats.set(null);
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
   * 續費/升級會員（使用卡密）
   */
  async renewMembership(licenseKey: string): Promise<{ success: boolean; message: string; newExpires?: string }> {
    try {
      const response = await this.callAuthApi('/api/auth/renew', {
        licenseKey,
        token: this._token()
      });
      
      if (response.success && response.user) {
        this._user.set(response.user);
        localStorage.setItem('tgm_user', JSON.stringify(response.user));
      }
      
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '續費失敗'
      };
    }
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
   * 清除本地認證數據
   */
  private clearLocalAuth(): void {
    localStorage.removeItem('tgm_auth_token');
    localStorage.removeItem('tgm_user');
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
                user: this.getMockUser(data.username, 'vip'),
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
            
          default:
            resolve({ success: true, message: 'OK' });
        }
      }, 500); // 模擬網絡延遲
    });
  }

  /**
   * 生成模擬用戶數據
   */
  private getMockUser(username: string, level: 'free' | 'vip' | 'svip' | 'mvp' = 'vip'): User {
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
}
