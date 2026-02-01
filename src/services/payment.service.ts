/**
 * 統一支付服務
 * 
 * 處理支付創建、狀態查詢、發票管理
 */

import { Injectable, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

export type PaymentProvider = 'stripe' | 'paypal' | 'alipay' | 'wechat' | 'usdt' | 'demo';
export type PaymentType = 'subscription' | 'one_time' | 'quota_pack' | 'overage';
export type PaymentState = 'created' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'expired';

export interface PaymentIntent {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
  payment_type: PaymentType;
  state: PaymentState;
  description: string;
  metadata: Record<string, any>;
  provider_session_id: string;
  pay_url: string;
  qr_code: string;
  created_at: string;
  expires_at: string;
  completed_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  payment_id: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  buyer_name: string;
  buyer_email: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    amount: number;
  }>;
  status: string;
  issued_at: string;
  paid_at: string;
  pdf_url: string;
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  provider: string;
  state: string;
  description: string;
  created_at: string;
  completed_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // 狀態
  private _currentIntent = signal<PaymentIntent | null>(null);
  readonly currentIntent = this._currentIntent.asReadonly();
  
  private _paymentHistory = signal<PaymentHistoryItem[]>([]);
  readonly paymentHistory = this._paymentHistory.asReadonly();
  
  private _invoices = signal<Invoice[]>([]);
  readonly invoices = this._invoices.asReadonly();
  
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  
  // 計算屬性
  readonly hasActivePayment = computed(() => {
    const intent = this._currentIntent();
    return intent && ['created', 'pending', 'processing'].includes(intent.state);
  });
  
  readonly completedPayments = computed(() => 
    this._paymentHistory().filter(p => p.state === 'completed')
  );

  constructor(private ipc: ElectronIpcService) {}

  /**
   * 創建支付
   */
  async createPayment(options: {
    amount: number;
    currency?: string;
    provider?: PaymentProvider;
    paymentType?: PaymentType;
    description?: string;
    metadata?: Record<string, any>;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ success: boolean; intent?: PaymentIntent; error?: string }> {
    this._loading.set(true);
    
    try {
      const response = await this.ipc.invoke('create-payment', {
        amount: options.amount,
        currency: options.currency || 'CNY',
        provider: options.provider || 'demo',
        payment_type: options.paymentType || 'one_time',
        description: options.description || '',
        metadata: options.metadata || {},
        success_url: options.successUrl,
        cancel_url: options.cancelUrl
      });
      
      if (response?.success && response?.data) {
        const intent = response.data as PaymentIntent;
        this._currentIntent.set(intent);
        return { success: true, intent };
      }
      
      return { success: false, error: response?.error || '創建支付失敗' };
      
    } catch (error) {
      console.error('Create payment error:', error);
      return { success: false, error: String(error) };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * 檢查支付狀態
   */
  async checkPaymentStatus(intentId: string): Promise<{ 
    success: boolean; 
    paid: boolean; 
    state: PaymentState;
    error?: string 
  }> {
    try {
      const response = await this.ipc.invoke('get-payment-status', {
        intent_id: intentId
      });
      
      if (response?.success && response?.data) {
        if (response.data.intent) {
          this._currentIntent.set(response.data.intent);
        }
        return {
          success: true,
          paid: response.data.paid,
          state: response.data.state
        };
      }
      
      return { success: false, paid: false, state: 'failed', error: response?.error };
      
    } catch (error) {
      console.error('Check payment status error:', error);
      return { success: false, paid: false, state: 'failed', error: String(error) };
    }
  }

  /**
   * 輪詢支付狀態
   */
  async pollPaymentStatus(
    intentId: string,
    intervalMs: number = 3000,
    maxAttempts: number = 60
  ): Promise<{ success: boolean; paid: boolean }> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const result = await this.checkPaymentStatus(intentId);
      
      if (result.paid || result.state === 'completed') {
        return { success: true, paid: true };
      }
      
      if (['failed', 'cancelled', 'expired', 'refunded'].includes(result.state)) {
        return { success: false, paid: false };
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return { success: false, paid: false };
  }

  /**
   * 加載支付歷史
   */
  async loadPaymentHistory(limit: number = 50): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-payment-history', { limit });
      if (response?.success && response?.data?.payments) {
        this._paymentHistory.set(response.data.payments);
      }
    } catch (error) {
      console.error('Load payment history error:', error);
    }
  }

  /**
   * 加載發票列表
   */
  async loadInvoices(limit: number = 50): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-invoices', { limit });
      if (response?.success && response?.data?.invoices) {
        this._invoices.set(response.data.invoices);
      }
    } catch (error) {
      console.error('Load invoices error:', error);
    }
  }

  /**
   * 獲取發票詳情
   */
  async getInvoiceDetail(invoiceId: string): Promise<Invoice | null> {
    try {
      const response = await this.ipc.invoke('get-invoice-detail', {
        invoice_id: invoiceId
      });
      if (response?.success && response?.data) {
        return response.data as Invoice;
      }
      return null;
    } catch (error) {
      console.error('Get invoice detail error:', error);
      return null;
    }
  }

  /**
   * 打開支付頁面
   */
  openPaymentPage(intent: PaymentIntent): void {
    if (intent.pay_url) {
      window.open(intent.pay_url, '_blank');
    }
  }

  /**
   * 格式化金額
   */
  formatAmount(cents: number, currency: string = 'CNY'): string {
    const amount = cents / 100;
    const symbols: Record<string, string> = {
      CNY: '¥',
      USD: '$',
      EUR: '€',
      GBP: '£'
    };
    const symbol = symbols[currency.toUpperCase()] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }

  /**
   * 獲取支付提供商圖標
   */
  getProviderIcon(provider: PaymentProvider): string {
    const icons: Record<string, string> = {
      stripe: '💳',
      paypal: '🅿️',
      alipay: '💙',
      wechat: '💚',
      usdt: '💰',
      demo: '🎮'
    };
    return icons[provider] || '💳';
  }

  /**
   * 獲取支付提供商名稱
   */
  getProviderName(provider: PaymentProvider): string {
    const names: Record<string, string> = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      alipay: '支付寶',
      wechat: '微信支付',
      usdt: 'USDT',
      demo: '演示支付'
    };
    return names[provider] || provider;
  }

  /**
   * 獲取支付狀態標籤
   */
  getStateLabel(state: PaymentState): { text: string; color: string } {
    const labels: Record<string, { text: string; color: string }> = {
      created: { text: '已創建', color: '#6b7280' },
      pending: { text: '待支付', color: '#f59e0b' },
      processing: { text: '處理中', color: '#3b82f6' },
      completed: { text: '已完成', color: '#22c55e' },
      failed: { text: '失敗', color: '#ef4444' },
      cancelled: { text: '已取消', color: '#6b7280' },
      refunded: { text: '已退款', color: '#8b5cf6' },
      expired: { text: '已過期', color: '#9ca3af' }
    };
    return labels[state] || { text: state, color: '#666' };
  }

  /**
   * 清除當前支付意圖
   */
  clearCurrentIntent(): void {
    this._currentIntent.set(null);
  }
}
