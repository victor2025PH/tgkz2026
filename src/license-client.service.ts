/**
 * TG-AI智控王 License Client Service
 * 卡密在線驗證客戶端 v2.0
 * 
 * 與服務器端通信，進行卡密驗證、激活和心跳檢測
 * 支持六級王者榮耀風格會員系統
 * 
 * 安全加固：
 * - 請求簽名驗證
 * - Token 自動刷新
 * - 設備指紋驗證
 * - 防重放攻擊
 */
import { Injectable, signal, computed, inject, NgZone, OnDestroy } from '@angular/core';
import { MembershipService, MembershipLevel } from './membership.service';
import { ToastService } from './toast.service';
import { SecurityClientService } from './security-client.service';

export interface ServerLicenseData {
  level: string;
  levelName: string;
  levelIcon: string;
  expiresAt: string;
  durationDays: number;
  token?: string;
  status?: string;
  quotas?: Record<string, number>;
  features?: string[];
}

export interface ServerUserData {
  userId: string;
  inviteCode: string;
  level: MembershipLevel;
  levelName: string;
  levelIcon: string;
  expiresAt: string;
  isLifetime: boolean;
  totalInvites: number;
  inviteEarnings: number;
  quotas: Record<string, number>;
  features: string[];
}

export interface PaymentOrder {
  orderId: string;
  product: {
    level: string;
    levelName: string;
    duration: string;
    price: number;
  };
  amount: number;
  currency: string;
  payment_url?: string;
  usdt?: {
    amount: number;
    network: string;
    address: string;
    rate: number;
  };
}

export interface ProductInfo {
  id: string;
  level: MembershipLevel;
  levelName: string;
  levelIcon: string;
  duration: string;
  durationName: string;
  price: number;
  quotas?: Record<string, number>;
  features?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LicenseClientService implements OnDestroy {
  private membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  private securityService = inject(SecurityClientService);
  private ngZone = inject(NgZone);
  
  // 服務器配置
  private serverUrl = signal<string>('');
  private token = signal<string | null>(null);
  private heartbeatInterval: any = null;
  private tokenRefreshInterval: any = null;
  
  // 狀態
  isOnline = signal(true);
  lastHeartbeat = signal<Date | null>(null);
  offlineGracePeriod = 7 * 24 * 60 * 60 * 1000;  // 7天離線寬限期
  
  // 產品列表（USDT 定價）
  // 所有價格均為 USDT (TRC20)
  readonly products: ProductInfo[] = [
    // 白銀精英 - 入門級
    { id: 'silver_month', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'month', durationName: '月卡', price: 9.9 },
    { id: 'silver_quarter', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'quarter', durationName: '季卡', price: 24.9 },
    { id: 'silver_year', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'year', durationName: '年卡', price: 79 },
    
    // 黃金大師 - 專業級
    { id: 'gold_month', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'month', durationName: '月卡', price: 29.9 },
    { id: 'gold_quarter', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'quarter', durationName: '季卡', price: 74.9 },
    { id: 'gold_year', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'year', durationName: '年卡', price: 249 },
    
    // 鑽石王牌 - 企業級
    { id: 'diamond_month', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'month', durationName: '月卡', price: 99.9 },
    { id: 'diamond_quarter', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'quarter', durationName: '季卡', price: 249 },
    { id: 'diamond_year', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'year', durationName: '年卡', price: 899 },
    
    // 星耀傳說 - 團隊級
    { id: 'star_month', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'month', durationName: '月卡', price: 299 },
    { id: 'star_quarter', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'quarter', durationName: '季卡', price: 749 },
    { id: 'star_year', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'year', durationName: '年卡', price: 2499 },
    
    // 榮耀王者 - 無限尊享
    { id: 'king_month', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'month', durationName: '月卡', price: 999 },
    { id: 'king_year', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'year', durationName: '年卡', price: 7999 },
    { id: 'king_lifetime', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'lifetime', durationName: '終身', price: 19999 },
  ];
  
  constructor() {
    this.loadToken();
    this.loadServerUrl();
    this.startHeartbeat();
    this.startTokenRefresh();
    this.listenForTokenRefresh();
  }
  
  ngOnDestroy(): void {
    this.stopHeartbeat();
    this.stopTokenRefresh();
  }
  
  // ============ 初始化 ============
  
  private loadToken(): void {
    const stored = localStorage.getItem('tgai-license-token');
    if (stored) {
      this.token.set(stored);
    }
  }
  
  private loadServerUrl(): void {
    const stored = localStorage.getItem('tgai-license-server');
    if (stored) {
      this.serverUrl.set(stored);
    }
  }
  
  private saveToken(token: string): void {
    this.token.set(token);
    localStorage.setItem('tgai-license-token', token);
  }
  
  private clearToken(): void {
    this.token.set(null);
    localStorage.removeItem('tgai-license-token');
  }
  
  // ============ Token 刷新（安全加固）============
  
  private startTokenRefresh(): void {
    // 每 20 小時刷新一次 Token
    this.tokenRefreshInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.refreshToken();
      });
    }, 20 * 60 * 60 * 1000);
  }
  
  private stopTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
  
  private listenForTokenRefresh(): void {
    window.addEventListener('refresh-token', () => {
      this.refreshToken();
    });
  }
  
  /**
   * 刷新 Token（安全加固）
   */
  async refreshToken(): Promise<{ success: boolean; message: string }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false, message: '未配置服務器或無 Token' };
    }
    
    try {
      const body = this.securityService.createSignedRequestBody({
        token: this.token(),
        machine_id: this.securityService.machineId,
        device_fingerprint: this.securityService.deviceFingerprint
      });
      
      const headers = this.securityService.createSecureHeaders();
      
      const response = await fetch(`${this.serverUrl()}/api/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.token) {
        this.saveToken(result.data.token);
        return { success: true, message: 'Token 刷新成功' };
      }
      
      return { success: false, message: result.message || 'Token 刷新失敗' };
    } catch (error) {
      return { success: false, message: '網絡錯誤' };
    }
  }
  
  // ============ 服務器配置 ============
  
  /**
   * 設置服務器地址
   */
  setServerUrl(url: string): void {
    this.serverUrl.set(url.replace(/\/$/, ''));
    localStorage.setItem('tgai-license-server', url);
  }
  
  /**
   * 獲取服務器地址
   */
  getServerUrl(): string {
    return this.serverUrl();
  }
  
  /**
   * 檢查是否配置了服務器
   */
  isServerConfigured(): boolean {
    return !!this.serverUrl();
  }
  
  // ============ 卡密 API ============
  
  /**
   * 驗證卡密（不激活）
   */
  async validateLicense(licenseKey: string): Promise<{ success: boolean; message: string; data?: ServerLicenseData }> {
    if (!this.isServerConfigured()) {
      return this.localValidate(licenseKey);
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKey })
      });
      
      const result = await response.json();
      this.isOnline.set(true);
      
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      this.isOnline.set(false);
      return this.localValidate(licenseKey);
    }
  }
  
  /**
   * 激活卡密
   */
  async activateLicense(
    licenseKey: string, 
    email: string = '',
    inviteCode: string = ''
  ): Promise<{ success: boolean; message: string; data?: ServerLicenseData }> {
    const machineId = this.getMachineId();
    const deviceId = this.getDeviceId();
    
    if (!this.isServerConfigured()) {
      const result = await this.membershipService.activateMembership(licenseKey, email);
      return { success: result.success, message: result.message };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          machine_id: machineId,
          device_id: deviceId,
          email: email,
          invite_code: inviteCode
        })
      });
      
      const result = await response.json();
      this.isOnline.set(true);
      
      if (result.success) {
        // 保存 Token（如果有）
        if (result.data?.token) {
          this.saveToken(result.data.token);
        }
        
        // 無論是否有 token，都同步到本地會員服務
        const localResult = await this.membershipService.activateMembership(licenseKey, email);
        
        // 如果後端沒有返回完整數據，從本地會員服務獲取
        if (!result.data?.level || !result.data?.expiresAt) {
          const currentMembership = this.membershipService.membership();
          if (currentMembership) {
            result.data = {
              ...result.data,
              level: currentMembership.level,
              levelName: currentMembership.levelName,
              levelIcon: currentMembership.levelIcon,
              expiresAt: currentMembership.expiresAt?.toISOString() || '',
              durationDays: 30
            };
          }
        }
      }
      
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      this.isOnline.set(false);
      const localResult = await this.membershipService.activateMembership(licenseKey, email);
      return { success: localResult.success, message: localResult.message + ' (離線模式)' };
    }
  }
  
  /**
   * 心跳檢測
   */
  async sendHeartbeat(): Promise<{ success: boolean; message: string; data?: ServerUserData }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: true, message: '離線模式' };
    }
    
    try {
      const usage = this.membershipService.usage();
      
      const response = await fetch(`${this.serverUrl()}/api/license/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token(),
          machine_id: this.getMachineId(),
          usage: usage
        })
      });
      
      const result = await response.json();
      
      this.ngZone.run(() => {
        this.isOnline.set(true);
        this.lastHeartbeat.set(new Date());
        localStorage.setItem('tgai-last-online', Date.now().toString());
        
        if (result.success && result.data?.token) {
          this.saveToken(result.data.token);
        }
        
        // 處理過期
        if (result.data?.isExpired) {
          this.toastService.warning('您的會員已過期，請續費繼續使用');
        }
      });
      
      return { 
        success: result.success, 
        message: result.message,
        data: result.data 
      };
    } catch (error) {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
      
      // 檢查離線寬限期
      const lastOnline = localStorage.getItem('tgai-last-online');
      if (lastOnline) {
        const offlineDuration = Date.now() - parseInt(lastOnline);
        if (offlineDuration > this.offlineGracePeriod) {
          return { success: false, message: '離線時間過長，請連接網絡驗證' };
        }
      }
      
      return { success: true, message: '離線模式' };
    }
  }
  
  // ============ 用戶 API ============
  
  /**
   * 獲取用戶資料
   */
  async getUserProfile(): Promise<{ success: boolean; data?: ServerUserData }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/user/profile`, {
        headers: { 
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json' 
        }
      });
      
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * 獲取激活記錄
   */
  async getActivationHistory(limit: number = 50, offset: number = 0): Promise<{ success: boolean; data?: any[] }> {
    if (!this.isServerConfigured()) {
      return { success: false };
    }
    
    try {
      const machineId = this.getMachineId();
      const url = `${this.serverUrl()}/api/user/activation-history?machine_id=${machineId}&limit=${limit}&offset=${offset}`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (this.token()) {
        headers['Authorization'] = `Bearer ${this.token()}`;
      }
      
      const response = await fetch(url, { headers });
      const result = await response.json();
      return { success: result.success, data: result.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }
  
  /**
   * 獲取配額信息
   */
  async getUserQuota(): Promise<{ success: boolean; data?: any }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/user/quota`, {
        headers: { 
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json' 
        }
      });
      
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * 獲取使用統計（前端格式）
   */
  async getUsageStats(): Promise<{ success: boolean; stats?: any }> {
    if (!this.isServerConfigured()) {
      return { success: false };
    }
    
    try {
      const machineId = this.getMachineId();
      const url = `${this.serverUrl()}/api/user/usage-stats?machine_id=${machineId}`;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      
      if (this.token()) {
        headers['Authorization'] = `Bearer ${this.token()}`;
      }
      
      const response = await fetch(url, { headers });
      const result = await response.json();
      return { success: result.success, stats: result.stats };
    } catch (error) {
      return { success: false };
    }
  }
  
  // ============ 邀請 API ============
  
  /**
   * 獲取邀請信息
   */
  async getInviteInfo(): Promise<{ success: boolean; data?: any }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/invite/info`, {
        headers: { 
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json' 
        }
      });
      
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  
  /**
   * 獲取邀請列表
   */
  async getInviteList(): Promise<{ success: boolean; data?: any[] }> {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/invite/list`, {
        headers: { 
          'Authorization': `Bearer ${this.token()}`,
          'Content-Type': 'application/json' 
        }
      });
      
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  
  // ============ 支付 API ============
  
  /**
   * 獲取產品列表
   */
  async fetchProducts(): Promise<{ success: boolean; data?: ProductInfo[] }> {
    if (!this.isServerConfigured()) {
      return { success: true, data: this.products };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/products`);
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: true, data: this.products };
    }
  }
  
  /**
   * 創建支付訂單
   */
  async createPayment(
    productId: string, 
    paymentMethod: string = 'usdt'
  ): Promise<{ success: boolean; message: string; order?: PaymentOrder }> {
    if (!this.isServerConfigured()) {
      return { success: false, message: '請聯繫客服購買卡密' };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          machine_id: this.getMachineId(),
          payment_method: paymentMethod
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        return {
          success: true,
          message: '訂單創建成功',
          order: result.data
        };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: '創建訂單失敗，請稍後重試' };
    }
  }
  
  /**
   * 檢查支付狀態
   */
  async checkPaymentStatus(orderId: string): Promise<{ success: boolean; paid: boolean; licenseKey?: string; message?: string }> {
    if (!this.isServerConfigured()) {
      return { success: false, paid: false, message: '服務器未配置' };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/status/${orderId}`);
      const result = await response.json();
      
      return {
        success: result.success,
        paid: result.data?.status === 'paid',
        licenseKey: result.data?.license_key,
        message: result.message
      };
    } catch (error) {
      return { success: false, paid: false, message: '查詢支付狀態失敗' };
    }
  }
  
  // ============ 心跳管理 ============
  
  private startHeartbeat(): void {
    // 每 5 分鐘發送一次心跳
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5 * 60 * 1000);
    
    // 啟動後 5 秒發送一次
    setTimeout(() => this.sendHeartbeat(), 5000);
    
    // 監聯網絡狀態
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      localStorage.setItem('tgai-last-online', Date.now().toString());
      this.sendHeartbeat();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  // ============ 輔助方法 ============
  
  private getMachineId(): string {
    let machineId = localStorage.getItem('tgai-machine-id');
    if (!machineId) {
      machineId = 'mid-' + this.generateId();
      localStorage.setItem('tgai-machine-id', machineId);
    }
    return machineId;
  }
  
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('tgai-device-id');
    if (!deviceId) {
      deviceId = 'dev-' + this.generateId().substring(0, 12);
      localStorage.setItem('tgai-device-id', deviceId);
    }
    return deviceId;
  }
  
  private generateId(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private localValidate(licenseKey: string): { success: boolean; message: string; data?: ServerLicenseData } {
    // 新版卡密格式驗證
    // 格式: TGAI-[等級時長]-[XXXX]-[XXXX]-[XXXX]
    // 等級: B=白銀/G=黃金/D=鑽石/S=星耀/K=王者
    // 時長: 1=周/2=月/3=季/Y=年/L=終身
    const keyRegex = /^TGAI-([BGDSK][123YL]|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const match = licenseKey.toUpperCase().match(keyRegex);
    
    if (!match) {
      // 兼容舊版格式
      const oldKeyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      const oldMatch = licenseKey.toUpperCase().match(oldKeyRegex);
      
      if (!oldMatch) {
        return { success: false, message: '卡密格式不正確' };
      }
    }
    
    return { 
      success: true, 
      message: '卡密格式有效 (離線驗證)',
      data: {
        level: 'gold',
        levelName: '黃金大師',
        levelIcon: '🥇',
        expiresAt: '',
        durationDays: 30
      }
    };
  }
  
  /**
   * 獲取產品按等級分組
   */
  getProductsByLevel(): Record<MembershipLevel, ProductInfo[]> {
    const grouped: Record<MembershipLevel, ProductInfo[]> = {
      bronze: [],
      silver: [],
      gold: [],
      diamond: [],
      star: [],
      king: []
    };
    
    for (const product of this.products) {
      if (grouped[product.level]) {
        grouped[product.level].push(product);
      }
    }
    
    return grouped;
  }
  
  /**
   * 獲取推薦產品
   */
  getRecommendedProducts(): ProductInfo[] {
    return [
      this.products.find(p => p.id === 'gold_month')!,
      this.products.find(p => p.id === 'diamond_month')!,
      this.products.find(p => p.id === 'star_year')!,
    ].filter(Boolean);
  }
}
