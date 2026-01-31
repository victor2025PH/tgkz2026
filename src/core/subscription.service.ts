/**
 * 訂閱服務
 * 
 * 優化設計：
 * 1. 訂閱狀態管理
 * 2. 結帳流程處理
 * 3. 方案比較
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: {
    max_accounts: number;
    max_api_calls: number;
    ai_enabled: boolean;
    monitoring_enabled: boolean;
  };
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'past_due' | 'expired' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: string;
  description: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private authService = inject(AuthService);
  
  // 狀態
  private _isLoading = signal(false);
  private _subscription = signal<Subscription | null>(null);
  private _plans = signal<SubscriptionPlan[]>([]);
  private _transactions = signal<Transaction[]>([]);
  
  // 公開狀態
  readonly isLoading = computed(() => this._isLoading());
  readonly subscription = computed(() => this._subscription());
  readonly plans = computed(() => this._plans());
  readonly transactions = computed(() => this._transactions());
  
  // 計算屬性
  readonly currentPlan = computed(() => {
    const sub = this._subscription();
    const plans = this._plans();
    if (!sub) return plans.find(p => p.id === 'free') || null;
    return plans.find(p => p.id === sub.plan_id) || null;
  });
  
  readonly isActive = computed(() => {
    const sub = this._subscription();
    return sub?.status === 'active' || sub?.status === 'trialing';
  });
  
  readonly daysRemaining = computed(() => {
    const sub = this._subscription();
    if (!sub?.current_period_end) return 0;
    
    const endDate = new Date(sub.current_period_end);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });
  
  /**
   * 初始化
   */
  async init(): Promise<void> {
    if (environment.apiMode === 'ipc') {
      // Electron 模式設置默認方案
      this._plans.set([{
        id: 'enterprise',
        name: 'Enterprise (Local)',
        price_monthly: 0,
        price_yearly: 0,
        features: {
          max_accounts: -1,
          max_api_calls: -1,
          ai_enabled: true,
          monitoring_enabled: true
        }
      }]);
      return;
    }
    
    await Promise.all([
      this.fetchPlans(),
      this.fetchSubscription()
    ]);
  }
  
  /**
   * 獲取訂閱方案列表
   */
  async fetchPlans(): Promise<SubscriptionPlan[]> {
    if (environment.apiMode === 'ipc') return this._plans();
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/subscription/plans`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        this._plans.set(result.data);
        return result.data;
      }
      return [];
    } catch (e) {
      console.error('Fetch plans error:', e);
      return [];
    }
  }
  
  /**
   * 獲取當前訂閱
   */
  async fetchSubscription(): Promise<Subscription | null> {
    if (environment.apiMode === 'ipc') return null;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/subscription`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        this._subscription.set(result.data);
        return result.data;
      }
      return null;
    } catch (e) {
      console.error('Fetch subscription error:', e);
      return null;
    }
  }
  
  /**
   * 創建結帳會話
   */
  async checkout(planId: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<{
    success: boolean;
    url?: string;
    error?: string;
  }> {
    if (environment.apiMode === 'ipc') {
      return { success: false, error: 'Not available in local mode' };
    }
    
    this._isLoading.set(true);
    
    try {
      const successUrl = `${window.location.origin}/upgrade?success=true`;
      const cancelUrl = `${window.location.origin}/upgrade?cancelled=true`;
      
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/subscription/checkout`, {
        method: 'POST',
        headers: {
          ...this.authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
          success_url: successUrl,
          cancel_url: cancelUrl
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.url) {
        // 重定向到支付頁面
        window.location.href = result.url;
        return { success: true, url: result.url };
      }
      
      return { success: false, error: result.error || 'Checkout failed' };
    } catch (e) {
      console.error('Checkout error:', e);
      return { success: false, error: String(e) };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 取消訂閱
   */
  async cancelSubscription(): Promise<{ success: boolean; message?: string; error?: string }> {
    if (environment.apiMode === 'ipc') {
      return { success: false, error: 'Not available in local mode' };
    }
    
    this._isLoading.set(true);
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/subscription/cancel`, {
        method: 'POST',
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      
      if (result.success) {
        await this.fetchSubscription();
        return { success: true, message: result.message };
      }
      
      return { success: false, error: result.error };
    } catch (e) {
      console.error('Cancel subscription error:', e);
      return { success: false, error: String(e) };
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 獲取交易記錄
   */
  async fetchTransactions(limit: number = 20): Promise<Transaction[]> {
    if (environment.apiMode === 'ipc') return [];
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/transactions?limit=${limit}`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      if (result.success) {
        this._transactions.set(result.data);
        return result.data;
      }
      return [];
    } catch (e) {
      console.error('Fetch transactions error:', e);
      return [];
    }
  }
  
  /**
   * 格式化價格
   */
  formatPrice(cents: number, currency: string = 'USD'): string {
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
  
  /**
   * 計算年付折扣
   */
  getYearlyDiscount(plan: SubscriptionPlan): number {
    if (plan.price_monthly === 0) return 0;
    const yearlyMonthlyEquiv = plan.price_yearly / 12;
    const discount = (plan.price_monthly - yearlyMonthlyEquiv) / plan.price_monthly * 100;
    return Math.round(discount);
  }
  
  /**
   * 比較方案
   */
  comparePlans(fromId: string, toId: string): {
    isUpgrade: boolean;
    priceDiff: number;
    featuresDiff: string[];
  } {
    const plans = this._plans();
    const fromPlan = plans.find(p => p.id === fromId);
    const toPlan = plans.find(p => p.id === toId);
    
    if (!fromPlan || !toPlan) {
      return { isUpgrade: false, priceDiff: 0, featuresDiff: [] };
    }
    
    const isUpgrade = toPlan.price_monthly > fromPlan.price_monthly;
    const priceDiff = toPlan.price_monthly - fromPlan.price_monthly;
    
    const featuresDiff: string[] = [];
    
    if (toPlan.features.max_accounts > fromPlan.features.max_accounts) {
      featuresDiff.push(`帳號數: ${fromPlan.features.max_accounts} → ${toPlan.features.max_accounts === -1 ? '無限' : toPlan.features.max_accounts}`);
    }
    
    if (toPlan.features.ai_enabled && !fromPlan.features.ai_enabled) {
      featuresDiff.push('解鎖 AI 功能');
    }
    
    if (toPlan.features.monitoring_enabled && !fromPlan.features.monitoring_enabled) {
      featuresDiff.push('解鎖監控功能');
    }
    
    return { isUpgrade, priceDiff, featuresDiff };
  }
  
  private getApiBaseUrl(): string {
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000';
    }
    return '';
  }
}
