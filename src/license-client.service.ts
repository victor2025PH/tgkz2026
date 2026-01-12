/**
 * License Client Service
 * 卡密在線驗證客戶端
 * 
 * 與服務器端通信，進行卡密驗證、激活和心跳檢測
 */
import { Injectable, signal, computed, inject, NgZone, OnDestroy } from '@angular/core';
import { MembershipService } from './membership.service';
import { ToastService } from './toast.service';

export interface ServerLicenseData {
  level: string;
  expires_at: string;
  duration_days: number;
  token?: string;
  status?: string;
}

export interface PaymentOrder {
  order_id: string;
  product: {
    price: number;
    level: string;
    days: number;
    name: string;
  };
  payment_url: string;
  amount: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class LicenseClientService implements OnDestroy {
  private membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  
  // 服務器配置
  private serverUrl = signal<string>('');  // 生產環境設置服務器地址
  private token = signal<string | null>(null);
  private heartbeatInterval: any = null;
  
  // 狀態
  isOnline = signal(true);  // 服務器連接狀態
  lastHeartbeat = signal<Date | null>(null);
  offlineGracePeriod = 7 * 24 * 60 * 60 * 1000;  // 7天離線寬限期
  
  // 產品列表
  readonly products = [
    { id: 'vip_week', name: '⭐ VIP 周卡', price: 49, level: 'vip', days: 7 },
    { id: 'vip_month', name: '⭐ VIP 月卡', price: 99, level: 'vip', days: 30, popular: true },
    { id: 'vip_quarter', name: '⭐ VIP 季卡', price: 249, level: 'vip', days: 90 },
    { id: 'vip_year', name: '⭐ VIP 年卡', price: 699, level: 'vip', days: 365, save: '省42%' },
    { id: 'svip_month', name: '🌙 SVIP 月卡', price: 299, level: 'svip', days: 30, recommended: true },
    { id: 'svip_year', name: '🌙 SVIP 年卡', price: 1999, level: 'svip', days: 365, save: '省44%' },
    { id: 'mvp_month', name: '👑 MVP 月卡', price: 999, level: 'mvp', days: 30 },
    { id: 'mvp_year', name: '👑 MVP 年卡', price: 6999, level: 'mvp', days: 365, save: '省42%' },
  ];
  
  constructor() {
    this.loadToken();
    this.startHeartbeat();
  }
  
  ngOnDestroy(): void {
    this.stopHeartbeat();
  }
  
  // ============ 初始化 ============
  
  private loadToken(): void {
    const stored = localStorage.getItem('tg-matrix-license-token');
    if (stored) {
      this.token.set(stored);
    }
  }
  
  private saveToken(token: string): void {
    this.token.set(token);
    localStorage.setItem('tg-matrix-license-token', token);
  }
  
  private clearToken(): void {
    this.token.set(null);
    localStorage.removeItem('tg-matrix-license-token');
  }
  
  // ============ 服務器 API ============
  
  /**
   * 設置服務器地址
   */
  setServerUrl(url: string): void {
    this.serverUrl.set(url.replace(/\/$/, ''));
    localStorage.setItem('tg-matrix-license-server', url);
  }
  
  /**
   * 檢查是否配置了服務器
   */
  isServerConfigured(): boolean {
    return !!this.serverUrl();
  }
  
  /**
   * 驗證卡密（不激活）
   */
  async validateLicense(licenseKey: string): Promise<{ success: boolean; message: string; data?: ServerLicenseData }> {
    if (!this.isServerConfigured()) {
      // 離線模式，使用本地驗證
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
  async activateLicense(licenseKey: string, email: string = ''): Promise<{ success: boolean; message: string; data?: ServerLicenseData }> {
    const machineId = this.getMachineId();
    
    if (!this.isServerConfigured()) {
      // 離線模式，使用本地激活
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
          email: email
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
      // 離線時使用本地激活
      const localResult = await this.membershipService.activateMembership(licenseKey, email);
      return { success: localResult.success, message: localResult.message + ' (離線模式)' };
    }
  }
  
  /**
   * 心跳檢測
   */
  async sendHeartbeat(): Promise<{ success: boolean; message: string }> {
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
          usage: usage
        })
      });
      
      const result = await response.json();
      
      this.ngZone.run(() => {
        this.isOnline.set(true);
        this.lastHeartbeat.set(new Date());
        
        if (result.success && result.data?.token) {
          this.saveToken(result.data.token);
        }
        
        // 如果會員已過期，更新本地狀態
        if (!result.success && result.message.includes('過期')) {
          this.toastService.warning('您的會員已過期，請續費');
        }
      });
      
      return { success: result.success, message: result.message };
    } catch (error) {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
      
      // 檢查離線寬限期
      const lastOnline = localStorage.getItem('tg-matrix-last-online');
      if (lastOnline) {
        const offlineDuration = Date.now() - parseInt(lastOnline);
        if (offlineDuration > this.offlineGracePeriod) {
          return { success: false, message: '離線時間過長，請連接網絡' };
        }
      }
      
      return { success: true, message: '離線模式' };
    }
  }
  
  // ============ 支付 ============
  
  /**
   * 創建支付訂單
   */
  async createPayment(productId: string, email: string = '', paymentMethod: string = 'alipay'): Promise<{ success: boolean; message: string; order?: PaymentOrder }> {
    if (!this.isServerConfigured()) {
      return { success: false, message: '請聯繫客服購買卡密' };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          email: email,
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
   * 檢查訂單狀態
   */
  async checkPaymentStatus(orderId: string): Promise<{ success: boolean; paid: boolean; licenseKey?: string }> {
    if (!this.isServerConfigured()) {
      return { success: false, paid: false };
    }
    
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/status?order_id=${orderId}`);
      const result = await response.json();
      
      return {
        success: true,
        paid: result.data?.status === 'paid',
        licenseKey: result.data?.license_key
      };
    } catch (error) {
      return { success: false, paid: false };
    }
  }
  
  // ============ 心跳管理 ============
  
  private startHeartbeat(): void {
    // 每 5 分鐘發送一次心跳
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5 * 60 * 1000);
    
    // 立即發送一次
    setTimeout(() => this.sendHeartbeat(), 5000);
    
    // 記錄在線時間
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      localStorage.setItem('tg-matrix-last-online', Date.now().toString());
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
    let machineId = localStorage.getItem('tg-matrix-machine-id');
    if (!machineId) {
      machineId = 'mid-' + this.generateId();
      localStorage.setItem('tg-matrix-machine-id', machineId);
    }
    return machineId;
  }
  
  private generateId(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private localValidate(licenseKey: string): { success: boolean; message: string; data?: ServerLicenseData } {
    // 簡單的本地格式驗證
    const keyRegex = /^TGM-([WMQYVSP])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const match = licenseKey.toUpperCase().match(keyRegex);
    
    if (!match) {
      return { success: false, message: '卡密格式不正確' };
    }
    
    return { 
      success: true, 
      message: '卡密格式有效 (離線驗證)',
      data: {
        level: 'vip',
        expires_at: '',
        duration_days: 30
      }
    };
  }
}
