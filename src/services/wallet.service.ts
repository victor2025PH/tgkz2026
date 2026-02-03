/**
 * 錢包服務
 * Wallet Service
 * 
 * 處理用戶錢包餘額、交易記錄、消費分析等功能
 */

import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from '../core/api.service';

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  balance_display: string;
  frozen_balance: number;
  bonus_balance: number;
  bonus_display: string;
  available_balance: number;
  total_display: string;
  total_recharged: number;
  total_consumed: number;
  total_withdrawn: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  type: 'recharge' | 'consume' | 'refund' | 'withdraw' | 'bonus' | 'adjust';
  amount: number;
  amount_display: string;
  bonus_amount: number;
  balance_before: number;
  balance_after: number;
  category: string;
  description: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  payment_method: string;
  created_at: string;
  completed_at: string;
}

export interface TransactionResult {
  transactions: Transaction[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  summary: {
    total_in: number;
    total_out: number;
    total_in_display: string;
    total_out_display: string;
  };
}

export interface ConsumeAnalysis {
  period: {
    start: string;
    end: string;
  };
  total_consumed: number;
  total_display: string;
  by_category: Array<{
    category: string;
    category_name: string;
    count: number;
    amount: number;
    amount_display: string;
    percent: number;
  }>;
  by_date: Array<{
    date: string;
    amount: number;
    amount_display: string;
  }>;
}

export interface MonthlySummary {
  month: string;
  income: number;
  income_display: string;
  expense: number;
  expense_display: string;
  net: number;
  transaction_count: number;
}

export interface RechargePackage {
  id: number;
  amount: number;
  amount_display: string;
  bonus_amount: number;
  bonus_display: string;
  bonus_percent: number;
  total_display: string;
  is_recommended: boolean;
  display_order: number;
}

export interface WalletStatistics {
  balance: number;
  balance_display: string;
  total_recharged: number;
  total_consumed: number;
  this_month_consumed: number;
  transaction_count: number;
}

export interface RechargeOrder {
  id: string;
  order_no: string;
  user_id: string;
  wallet_id: string;
  amount: number;
  bonus_amount: number;
  fee: number;
  actual_amount: number;
  payment_method: string;
  payment_channel: string;
  status: 'pending' | 'paid' | 'confirmed' | 'failed' | 'expired' | 'refunded';
  usdt_network?: string;
  usdt_address?: string;
  usdt_amount?: number;
  usdt_rate?: number;
  usdt_tx_hash?: string;
  paid_at?: string;
  confirmed_at?: string;
  expired_at?: string;
  created_at: string;
}

export interface PaymentInfo {
  order_no: string;
  amount: number;
  amount_display: string;
  bonus_amount: number;
  bonus_display: string;
  fee: number;
  actual_amount: number;
  actual_display: string;
  payment_method: string;
  expired_at: string;
  usdt_network?: string;
  usdt_address?: string;
  usdt_amount?: number;
  usdt_rate?: number;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  // 狀態
  private _wallet = signal<Wallet | null>(null);
  readonly wallet = this._wallet.asReadonly();
  
  private _transactions = signal<Transaction[]>([]);
  readonly transactions = this._transactions.asReadonly();
  
  private _rechargePackages = signal<RechargePackage[]>([]);
  readonly rechargePackages = this._rechargePackages.asReadonly();
  
  private _statistics = signal<WalletStatistics | null>(null);
  readonly statistics = this._statistics.asReadonly();
  
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  
  // 計算屬性
  readonly balance = computed(() => this._wallet()?.available_balance ?? 0);
  readonly balanceDisplay = computed(() => this._wallet()?.total_display ?? '$0.00');
  readonly hasBalance = computed(() => this.balance() > 0);
  
  constructor(private api: ApiService) {}

  /**
   * 獲取錢包信息
   */
  async loadWallet(): Promise<Wallet | null> {
    this._loading.set(true);
    
    try {
      const response = await this.api.get<any>('/api/wallet');
      
      if (response?.success && response?.data) {
        this._wallet.set(response.data);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Load wallet error:', error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * 獲取餘額
   */
  async getBalance(): Promise<{ balance: number; display: string } | null> {
    try {
      const response = await this.api.get<any>('/api/wallet/balance');
      
      if (response?.success && response?.data) {
        return {
          balance: response.data.available_balance,
          display: response.data.total_display
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get balance error:', error);
      return null;
    }
  }

  /**
   * 獲取統計信息
   */
  async loadStatistics(): Promise<WalletStatistics | null> {
    try {
      const response = await this.api.get<any>('/api/wallet/statistics');
      
      if (response?.success && response?.data) {
        this._statistics.set(response.data);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Load statistics error:', error);
      return null;
    }
  }

  /**
   * 獲取交易記錄
   */
  async loadTransactions(options?: {
    page?: number;
    pageSize?: number;
    type?: string;
    category?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<TransactionResult | null> {
    this._loading.set(true);
    
    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.pageSize) params.set('page_size', String(options.pageSize));
      if (options?.type) params.set('type', options.type);
      if (options?.category) params.set('category', options.category);
      if (options?.status) params.set('status', options.status);
      if (options?.startDate) params.set('start_date', options.startDate);
      if (options?.endDate) params.set('end_date', options.endDate);
      
      const url = `/api/wallet/transactions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.api.get<any>(url);
      
      if (response?.success && response?.data) {
        this._transactions.set(response.data.transactions);
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Load transactions error:', error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * 獲取最近交易
   */
  async getRecentTransactions(limit: number = 5): Promise<Transaction[]> {
    try {
      const response = await this.api.get<any>(`/api/wallet/transactions/recent?limit=${limit}`);
      
      if (response?.success && response?.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Get recent transactions error:', error);
      return [];
    }
  }

  /**
   * 獲取消費分析
   */
  async getConsumeAnalysis(startDate?: string, endDate?: string): Promise<ConsumeAnalysis | null> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      
      const url = `/api/wallet/analysis/consume${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.api.get<any>(url);
      
      if (response?.success && response?.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      console.error('Get consume analysis error:', error);
      return null;
    }
  }

  /**
   * 獲取月度摘要
   */
  async getMonthlySummary(months: number = 6): Promise<MonthlySummary[]> {
    try {
      const response = await this.api.get<any>(`/api/wallet/analysis/monthly?months=${months}`);
      
      if (response?.success && response?.data) {
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Get monthly summary error:', error);
      return [];
    }
  }

  /**
   * 獲取充值套餐
   */
  async loadRechargePackages(): Promise<RechargePackage[]> {
    try {
      const response = await this.api.get<any>('/api/wallet/packages');
      
      if (response?.success && response?.data) {
        this._rechargePackages.set(response.data);
        return response.data;
      }
      
      return [];
    } catch (error) {
      console.error('Load recharge packages error:', error);
      return [];
    }
  }

  /**
   * 消費餘額
   */
  async consume(options: {
    amount: number;
    category: string;
    description: string;
    orderId?: string;
    referenceId?: string;
    referenceType?: string;
  }): Promise<{ success: boolean; transaction?: Transaction; newBalance?: any; error?: string }> {
    try {
      const response = await this.api.post<any>('/api/wallet/consume', {
        amount: options.amount,
        category: options.category,
        description: options.description,
        order_id: options.orderId,
        reference_id: options.referenceId,
        reference_type: options.referenceType
      });
      
      if (response?.success) {
        // 刷新錢包
        await this.loadWallet();
        
        return {
          success: true,
          transaction: response.data?.transaction,
          newBalance: response.data?.new_balance
        };
      }
      
      return { success: false, error: response?.error || '消費失敗' };
    } catch (error) {
      console.error('Consume error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 檢查餘額是否足夠
   */
  async checkBalance(amount: number): Promise<{
    sufficient: boolean;
    required: number;
    available: number;
    shortfall: number;
  }> {
    try {
      const response = await this.api.post<any>('/api/wallet/check-balance', { amount });
      
      if (response?.success && response?.data) {
        return response.data;
      }
      
      return {
        sufficient: false,
        required: amount,
        available: 0,
        shortfall: amount
      };
    } catch (error) {
      console.error('Check balance error:', error);
      return {
        sufficient: false,
        required: amount,
        available: 0,
        shortfall: amount
      };
    }
  }

  /**
   * 導出交易記錄
   */
  async exportTransactions(startDate?: string, endDate?: string): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      
      const url = `/api/wallet/transactions/export${params.toString() ? '?' + params.toString() : ''}`;
      
      // 下載文件
      window.open(url, '_blank');
    } catch (error) {
      console.error('Export transactions error:', error);
    }
  }

  /**
   * 格式化金額
   */
  formatAmount(cents: number, currency: string = 'USD'): string {
    const amount = cents / 100;
    const symbols: Record<string, string> = {
      USD: '$',
      CNY: '¥',
      EUR: '€'
    };
    const symbol = symbols[currency] || '$';
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * 獲取交易類型名稱
   */
  getTypeName(type: string): string {
    const names: Record<string, string> = {
      recharge: '充值',
      consume: '消費',
      refund: '退款',
      withdraw: '提現',
      bonus: '贈送',
      adjust: '調賬'
    };
    return names[type] || type;
  }

  /**
   * 獲取交易類型圖標
   */
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      recharge: '💰',
      consume: '🛒',
      refund: '↩️',
      withdraw: '💸',
      bonus: '🎁',
      adjust: '⚙️'
    };
    return icons[type] || '📋';
  }

  /**
   * 獲取狀態標籤
   */
  getStatusLabel(status: string): { text: string; color: string } {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: '處理中', color: '#f59e0b' },
      success: { text: '成功', color: '#22c55e' },
      failed: { text: '失敗', color: '#ef4444' },
      cancelled: { text: '已取消', color: '#6b7280' },
      refunded: { text: '已退款', color: '#8b5cf6' }
    };
    return labels[status] || { text: status, color: '#666' };
  }

  /**
   * 獲取類目名稱
   */
  getCategoryName(category: string): string {
    const names: Record<string, string> = {
      membership: '會員服務',
      ip_proxy: '靜態 IP',
      quota_pack: '配額包',
      other: '其他'
    };
    return names[category] || category || '其他';
  }

  /**
   * 刷新所有數據
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadWallet(),
      this.loadStatistics(),
      this.loadRechargePackages()
    ]);
  }

  // ==================== Phase 1: 充值訂單 ====================

  /**
   * 創建充值訂單
   */
  async createRechargeOrder(options: {
    amount: number;
    paymentMethod: string;
    paymentChannel?: string;
  }): Promise<{ success: boolean; order?: RechargeOrder; paymentInfo?: PaymentInfo; error?: string }> {
    try {
      const response = await this.api.post<any>('/api/wallet/recharge/create', {
        amount: options.amount,
        payment_method: options.paymentMethod,
        payment_channel: options.paymentChannel || 'direct'
      });
      
      if (response?.success && response?.data) {
        return {
          success: true,
          order: response.data.order,
          paymentInfo: response.data.payment_info
        };
      }
      
      return { success: false, error: response?.error || '創建訂單失敗' };
    } catch (error) {
      console.error('Create recharge order error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 獲取充值訂單詳情
   */
  async getRechargeOrder(orderNo: string): Promise<{ order?: RechargeOrder; paymentInfo?: PaymentInfo } | null> {
    try {
      const response = await this.api.get<any>(`/api/wallet/recharge/${orderNo}`);
      
      if (response?.success && response?.data) {
        return {
          order: response.data.order,
          paymentInfo: response.data.payment_info
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get recharge order error:', error);
      return null;
    }
  }

  /**
   * 獲取充值訂單列表
   */
  async getRechargeOrders(options?: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<{ orders: RechargeOrder[]; pagination: any } | null> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', String(options.page));
      if (options?.pageSize) params.set('page_size', String(options.pageSize));
      if (options?.status) params.set('status', options.status);
      
      const url = `/api/wallet/recharge/orders${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.api.get<any>(url);
      
      if (response?.success && response?.data) {
        return {
          orders: response.data.orders,
          pagination: response.data.pagination
        };
      }
      
      return null;
    } catch (error) {
      console.error('Get recharge orders error:', error);
      return null;
    }
  }

  /**
   * 標記訂單已支付
   */
  async markRechargeOrderPaid(orderNo: string, txHash?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post<any>(`/api/wallet/recharge/${orderNo}/paid`, {
        tx_hash: txHash
      });
      
      if (response?.success) {
        return { success: true };
      }
      
      return { success: false, error: response?.error || '標記失敗' };
    } catch (error) {
      console.error('Mark recharge order paid error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 取消充值訂單
   */
  async cancelRechargeOrder(orderNo: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.api.post<any>(`/api/wallet/recharge/${orderNo}/cancel`, {});
      
      if (response?.success) {
        return { success: true };
      }
      
      return { success: false, error: response?.error || '取消失敗' };
    } catch (error) {
      console.error('Cancel recharge order error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * 檢查充值訂單狀態
   */
  async checkRechargeOrderStatus(orderNo: string): Promise<{
    status: string;
    isConfirmed: boolean;
    isPending: boolean;
    isExpired: boolean;
    confirmedAt?: string;
  } | null> {
    try {
      const response = await this.api.get<any>(`/api/wallet/recharge/${orderNo}/status`);
      
      if (response?.success && response?.data) {
        return {
          status: response.data.status,
          isConfirmed: response.data.is_confirmed,
          isPending: response.data.is_pending,
          isExpired: response.data.is_expired,
          confirmedAt: response.data.confirmed_at
        };
      }
      
      return null;
    } catch (error) {
      console.error('Check recharge order status error:', error);
      return null;
    }
  }

  /**
   * 輪詢充值訂單狀態
   */
  async pollRechargeOrderStatus(
    orderNo: string,
    intervalMs: number = 5000,
    maxAttempts: number = 60
  ): Promise<{ success: boolean; confirmed: boolean }> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const result = await this.checkRechargeOrderStatus(orderNo);
      
      if (!result) {
        return { success: false, confirmed: false };
      }
      
      if (result.isConfirmed) {
        // 刷新錢包餘額
        await this.loadWallet();
        return { success: true, confirmed: true };
      }
      
      if (result.isExpired) {
        return { success: false, confirmed: false };
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return { success: false, confirmed: false };
  }

  /**
   * 獲取充值訂單狀態標籤
   */
  getRechargeStatusLabel(status: string): { text: string; color: string } {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: '待支付', color: '#f59e0b' },
      paid: { text: '已支付', color: '#3b82f6' },
      confirmed: { text: '已到賬', color: '#22c55e' },
      failed: { text: '失敗', color: '#ef4444' },
      expired: { text: '已過期', color: '#9ca3af' },
      refunded: { text: '已退款', color: '#8b5cf6' }
    };
    return labels[status] || { text: status, color: '#666' };
  }
}
