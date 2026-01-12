/**
 * TG-AI智控王 License Client Service
 * 卡密在線驗證客戶端 v2.0
 * 
 * 與服務器端通信，進行卡密驗證、激活和心跳檢測
 * 支持六級王者榮耀風格會員系統
 */
import { Injectable, signal, computed, inject, NgZone, OnDestroy } from '@angular/core';
import { MembershipService, MembershipLevel } from './membership.service';
import { ToastService } from './toast.service';

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
  private ngZone = inject(NgZone);
  
  // 服務器配置
  private serverUrl = signal<string>('');
  private token = signal<string | null>(null);
  private heartbeatInterval: any = null;
  
  // 狀態
  isOnline = signal(true);
  lastHeartbeat = signal<Date | null>(null);
  offlineGracePeriod = 7 * 24 * 60 * 60 * 1000;  // 7天離線寬限期
  
  // 產品列表（王者榮耀風格）
  readonly products: ProductInfo[] = [
    // 白銀精英
    { id: 'silver_week', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'week', durationName: '周卡', price: 15 },
    { id: 'silver_month', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'month', durationName: '月卡', price: 49 },
    { id: 'silver_quarter', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'quarter', durationName: '季卡', price: 129 },
    { id: 'silver_year', level: 'silver', levelName: '白銀精英', levelIcon: '🥈', duration: 'year', durationName: '年卡', price: 399 },
    
    // 黃金大師
    { id: 'gold_week', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'week', durationName: '周卡', price: 29 },
    { id: 'gold_month', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'month', durationName: '月卡', price: 99 },
    { id: 'gold_quarter', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'quarter', durationName: '季卡', price: 249 },
    { id: 'gold_year', level: 'gold', levelName: '黃金大師', levelIcon: '🥇', duration: 'year', durationName: '年卡', price: 799 },
    
    // 鑽石王牌
    { id: 'diamond_week', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'week', durationName: '周卡', price: 59 },
    { id: 'diamond_month', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'month', durationName: '月卡', price: 199 },
    { id: 'diamond_quarter', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'quarter', durationName: '季卡', price: 499 },
    { id: 'diamond_year', level: 'diamond', levelName: '鑽石王牌', levelIcon: '💎', duration: 'year', durationName: '年卡', price: 1599 },
    
    // 星耀傳說
    { id: 'star_week', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'week', durationName: '周卡', price: 119 },
    { id: 'star_month', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'month', durationName: '月卡', price: 399 },
    { id: 'star_quarter', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'quarter', durationName: '季卡', price: 999 },
    { id: 'star_year', level: 'star', levelName: '星耀傳說', levelIcon: '🌟', duration: 'year', durationName: '年卡', price: 2999 },
    
    // 榮耀王者
    { id: 'king_week', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'week', durationName: '周卡', price: 299 },
    { id: 'king_month', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'month', durationName: '月卡', price: 999 },
    { id: 'king_quarter', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'quarter', durationName: '季卡', price: 2499 },
    { id: 'king_year', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'year', durationName: '年卡', price: 6999 },
    { id: 'king_lifetime', level: 'king', levelName: '榮耀王者', levelIcon: '👑', duration: 'lifetime', durationName: '終身', price: 19999 },
  ];
  
  constructor() {
    this.loadToken();
    this.loadServerUrl();
    this.startHeartbeat();
  }
  
  ngOnDestroy(): void {
    this.stopHeartbeat();
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
      
      if (result.success && result.data?.token) {
        this.saveToken(result.data.token);
        
        // 同步到本地會員服務
        await this.membershipService.activateMembership(licenseKey, email);
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
