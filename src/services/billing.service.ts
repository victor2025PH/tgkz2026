/**
 * 計費服務
 * 
 * 處理配額包購買、賬單管理、超額計費
 */

import { Injectable, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

export interface QuotaPack {
  id: string;
  name: string;
  type: string;
  quotas: Record<string, number>;
  price: number;
  validity_days: number;
  featured: boolean;
  description: string;
}

export interface UserPackage {
  id: string;
  user_id: string;
  pack_id: string;
  pack_name: string;
  quotas: Record<string, number>;
  remaining: Record<string, number>;
  purchased_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface BillingItem {
  id: string;
  user_id: string;
  billing_type: string;
  amount: number;
  currency: string;
  description: string;
  quota_type: string;
  quantity: number;
  unit_price: number;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  paid_at: string;
}

export interface OverageInfo {
  [quotaType: string]: {
    used: number;
    base_limit: number;
    pack_bonus: number;
    total_limit: number;
    overage: number;
    charge: number;
    rate: {
      unit_price: number;
      unit_size: number;
    };
  };
}

export interface FreezeStatus {
  frozen: boolean;
  freeze_type?: string;
  reason?: string;
  frozen_at?: string;
  unfreeze_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillingService {
  // 狀態
  private _quotaPacks = signal<QuotaPack[]>([]);
  readonly quotaPacks = this._quotaPacks.asReadonly();
  
  private _myPackages = signal<UserPackage[]>([]);
  readonly myPackages = this._myPackages.asReadonly();
  
  private _bills = signal<BillingItem[]>([]);
  readonly bills = this._bills.asReadonly();
  
  private _overageInfo = signal<OverageInfo | null>(null);
  readonly overageInfo = this._overageInfo.asReadonly();
  
  private _freezeStatus = signal<FreezeStatus | null>(null);
  readonly freezeStatus = this._freezeStatus.asReadonly();
  
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  
  // 計算屬性
  readonly hasActivePackages = computed(() => this._myPackages().length > 0);
  readonly isFrozen = computed(() => this._freezeStatus()?.frozen ?? false);
  readonly unpaidBills = computed(() => 
    this._bills().filter(b => b.status === 'pending')
  );
  readonly totalOverageCharge = computed(() => {
    const info = this._overageInfo();
    if (!info) return 0;
    return Object.values(info).reduce((sum, i) => sum + (i.charge || 0), 0);
  });

  constructor(private ipc: ElectronIpcService) {}

  /**
   * 加載可購買的配額包
   */
  async loadQuotaPacks(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await this.ipc.invoke('get-quota-packs', {});
      if (response?.success && response?.data?.packs) {
        this._quotaPacks.set(response.data.packs);
      }
    } catch (error) {
      console.error('Failed to load quota packs:', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * 購買配額包
   */
  async purchasePack(packId: string, paymentMethod: string = 'balance'): Promise<{ 
    success: boolean; 
    error?: string;
    package_id?: string;
  }> {
    try {
      const response = await this.ipc.invoke('purchase-quota-pack', {
        pack_id: packId,
        payment_method: paymentMethod
      });
      
      if (response?.success) {
        // 刷新我的配額包
        await this.loadMyPackages();
      }
      
      return response || { success: false, error: '未知錯誤' };
    } catch (error) {
      console.error('Failed to purchase pack:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 加載我的配額包
   */
  async loadMyPackages(activeOnly: boolean = true): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-my-packages', { 
        active_only: activeOnly 
      });
      if (response?.success && response?.data?.packages) {
        this._myPackages.set(response.data.packages);
      }
    } catch (error) {
      console.error('Failed to load my packages:', error);
    }
  }

  /**
   * 加載賬單
   */
  async loadBills(status?: string, type?: string, limit: number = 50): Promise<void> {
    try {
      const params: any = { limit };
      if (status) params.status = status;
      if (type) params.type = type;
      
      const response = await this.ipc.invoke('get-user-bills', params);
      if (response?.success && response?.data?.bills) {
        this._bills.set(response.data.bills);
      }
    } catch (error) {
      console.error('Failed to load bills:', error);
    }
  }

  /**
   * 支付賬單
   */
  async payBill(billId: string, paymentMethod: string = 'balance'): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.ipc.invoke('pay-bill', {
        bill_id: billId,
        payment_method: paymentMethod
      });
      
      if (response?.success) {
        await this.loadBills();
        await this.loadFreezeStatus();
      }
      
      return response || { success: false, error: '未知錯誤' };
    } catch (error) {
      console.error('Failed to pay bill:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 加載超額信息
   */
  async loadOverageInfo(): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-overage-info', {});
      if (response?.success && response?.data) {
        this._overageInfo.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load overage info:', error);
    }
  }

  /**
   * 加載凍結狀態
   */
  async loadFreezeStatus(): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-freeze-status', {});
      if (response?.success && response?.data) {
        this._freezeStatus.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load freeze status:', error);
    }
  }

  /**
   * 格式化價格
   */
  formatPrice(cents: number): string {
    return `¥${(cents / 100).toFixed(2)}`;
  }

  /**
   * 獲取配額包類型圖標
   */
  getPackTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      messages: '💬',
      ai_calls: '🤖',
      accounts: '📱',
      combo: '🎁'
    };
    return icons[type] || '📦';
  }

  /**
   * 獲取賬單狀態標籤
   */
  getBillStatusLabel(status: string): { text: string; color: string } {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: '#f59e0b' },
      paid: { text: '已支付', color: '#22c55e' },
      failed: { text: '支付失敗', color: '#ef4444' },
      cancelled: { text: '已取消', color: '#6b7280' },
      refunded: { text: '已退款', color: '#8b5cf6' }
    };
    return labels[status] || { text: status, color: '#666' };
  }

  /**
   * 刷新所有計費數據
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadQuotaPacks(),
      this.loadMyPackages(),
      this.loadBills(),
      this.loadOverageInfo(),
      this.loadFreezeStatus()
    ]);
  }
}
