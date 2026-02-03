/**
 * 統一購買服務
 * Unified Purchase Service
 * 
 * 處理各種業務場景的購買流程：
 * 1. 會員購買
 * 2. IP 代理購買
 * 3. 配額包購買
 * 
 * 所有購買都通過錢包餘額扣款
 */

import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from './wallet.service';
import { ApiService } from '../core/api.service';

// ==================== 類型定義 ====================

export interface PurchaseItem {
  id: string;
  name: string;
  description?: string;
  amount: number;              // 價格（分）
  category: 'membership' | 'ip_proxy' | 'quota_pack';
  icon?: string;
  metadata?: any;
}

export interface MembershipPlan {
  id: string;
  name: string;
  tier: string;
  duration_days: number;
  price: number;               // 分
  original_price?: number;
  features: string[];
  is_popular?: boolean;
}

export interface ProxyPackage {
  id: string;
  name: string;
  type: 'static' | 'rotating';
  region: string;
  region_name: string;
  duration_days: number;
  price: number;               // 分
  features: string[];
  in_stock: boolean;
}

export interface QuotaPack {
  id: string;
  name: string;
  quota_amount: number;
  price: number;               // 分
  bonus_amount?: number;
  is_popular?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  message?: string;
  orderId?: string;
  transactionId?: string;
}

// ==================== 服務 ====================

@Injectable({ providedIn: 'root' })
export class PurchaseService {
  
  // 會員方案
  private _membershipPlans = signal<MembershipPlan[]>([]);
  readonly membershipPlans = this._membershipPlans.asReadonly();
  
  // 代理套餐
  private _proxyPackages = signal<ProxyPackage[]>([]);
  readonly proxyPackages = this._proxyPackages.asReadonly();
  
  // 配額包
  private _quotaPacks = signal<QuotaPack[]>([]);
  readonly quotaPacks = this._quotaPacks.asReadonly();
  
  // 加載狀態
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  
  constructor(
    private api: ApiService,
    private walletService: WalletService,
    private router: Router
  ) {}
  
  // ==================== 會員購買 ====================
  
  /**
   * 獲取會員方案列表
   */
  async loadMembershipPlans(): Promise<MembershipPlan[]> {
    try {
      const response = await this.api.get<any>('/api/membership/plans');
      
      if (response?.success && response?.data) {
        this._membershipPlans.set(response.data);
        return response.data;
      }
      
      // 默認方案
      const defaultPlans: MembershipPlan[] = [
        {
          id: 'basic_monthly',
          name: '基礎版',
          tier: 'basic',
          duration_days: 30,
          price: 999,
          features: ['3個帳號', '基礎功能', 'Email 支持']
        },
        {
          id: 'pro_monthly',
          name: '專業版',
          tier: 'pro',
          duration_days: 30,
          price: 2999,
          original_price: 3999,
          features: ['10個帳號', '進階功能', '優先支持', 'API 訪問'],
          is_popular: true
        },
        {
          id: 'enterprise_monthly',
          name: '企業版',
          tier: 'enterprise',
          duration_days: 30,
          price: 9999,
          features: ['無限帳號', '全部功能', '專屬客服', '定制開發']
        }
      ];
      
      this._membershipPlans.set(defaultPlans);
      return defaultPlans;
    } catch (error) {
      console.error('Load membership plans error:', error);
      return [];
    }
  }
  
  /**
   * 購買會員
   */
  async purchaseMembership(plan: MembershipPlan): Promise<PurchaseResult> {
    return await this.executePurchase({
      id: plan.id,
      name: `${plan.name} (${plan.duration_days}天)`,
      description: plan.features.slice(0, 2).join(', '),
      amount: plan.price,
      category: 'membership',
      icon: '👑',
      metadata: { plan }
    });
  }
  
  // ==================== IP 代理購買 ====================
  
  /**
   * 獲取代理套餐列表
   */
  async loadProxyPackages(): Promise<ProxyPackage[]> {
    try {
      const response = await this.api.get<any>('/api/proxy/packages');
      
      if (response?.success && response?.data) {
        this._proxyPackages.set(response.data);
        return response.data;
      }
      
      // 默認套餐
      const defaultPackages: ProxyPackage[] = [
        {
          id: 'hk_static_30',
          name: '香港靜態IP',
          type: 'static',
          region: 'HK',
          region_name: '香港',
          duration_days: 30,
          price: 1500,
          features: ['獨享 IP', '低延遲', '99.9% 在線率'],
          in_stock: true
        },
        {
          id: 'us_static_30',
          name: '美國靜態IP',
          type: 'static',
          region: 'US',
          region_name: '美國',
          duration_days: 30,
          price: 1200,
          features: ['獨享 IP', '多節點', '高帶寬'],
          in_stock: true
        },
        {
          id: 'jp_static_30',
          name: '日本靜態IP',
          type: 'static',
          region: 'JP',
          region_name: '日本',
          duration_days: 30,
          price: 1800,
          features: ['獨享 IP', '低延遲', '穩定性高'],
          in_stock: true
        }
      ];
      
      this._proxyPackages.set(defaultPackages);
      return defaultPackages;
    } catch (error) {
      console.error('Load proxy packages error:', error);
      return [];
    }
  }
  
  /**
   * 購買代理
   */
  async purchaseProxy(pkg: ProxyPackage): Promise<PurchaseResult> {
    return await this.executePurchase({
      id: pkg.id,
      name: `${pkg.region_name} ${pkg.type === 'static' ? '靜態IP' : '動態IP'}`,
      description: `${pkg.duration_days}天`,
      amount: pkg.price,
      category: 'ip_proxy',
      icon: '🌐',
      metadata: { proxy: pkg }
    });
  }
  
  // ==================== 配額包購買 ====================
  
  /**
   * 獲取配額包列表
   */
  async loadQuotaPacks(): Promise<QuotaPack[]> {
    try {
      const response = await this.api.get<any>('/api/quota/packs');
      
      if (response?.success && response?.data) {
        this._quotaPacks.set(response.data);
        return response.data;
      }
      
      // 默認配額包
      const defaultPacks: QuotaPack[] = [
        {
          id: 'quota_1000',
          name: '1000 配額',
          quota_amount: 1000,
          price: 500
        },
        {
          id: 'quota_5000',
          name: '5000 配額',
          quota_amount: 5000,
          price: 2000,
          bonus_amount: 500,
          is_popular: true
        },
        {
          id: 'quota_10000',
          name: '10000 配額',
          quota_amount: 10000,
          price: 3500,
          bonus_amount: 1500
        }
      ];
      
      this._quotaPacks.set(defaultPacks);
      return defaultPacks;
    } catch (error) {
      console.error('Load quota packs error:', error);
      return [];
    }
  }
  
  /**
   * 購買配額包
   */
  async purchaseQuotaPack(pack: QuotaPack): Promise<PurchaseResult> {
    const bonus = pack.bonus_amount ? `+${pack.bonus_amount}` : '';
    return await this.executePurchase({
      id: pack.id,
      name: `${pack.name}${bonus}`,
      description: `${pack.quota_amount} 配額`,
      amount: pack.price,
      category: 'quota_pack',
      icon: '📊',
      metadata: { pack }
    });
  }
  
  // ==================== 統一購買執行 ====================
  
  /**
   * 執行購買
   */
  async executePurchase(item: PurchaseItem): Promise<PurchaseResult> {
    this._loading.set(true);
    
    try {
      // 1. 檢查餘額
      const balanceCheck = await this.walletService.checkBalance(item.amount);
      
      if (!balanceCheck.sufficient) {
        // 餘額不足，返回需要充值的信息
        return {
          success: false,
          message: `餘額不足，還需 $${(balanceCheck.shortfall / 100).toFixed(2)}`
        };
      }
      
      // 2. 執行消費
      const consumeResult = await this.walletService.consume({
        amount: item.amount,
        category: item.category,
        description: item.name,
        referenceId: item.id,
        referenceType: item.category
      });
      
      if (!consumeResult.success) {
        return {
          success: false,
          message: consumeResult.error || '支付失敗'
        };
      }
      
      // 3. 調用業務 API 完成購買
      const businessResult = await this.completeBusinessPurchase(item, consumeResult.transaction?.id);
      
      if (!businessResult.success) {
        // 業務失敗，需要退款（由後端處理）
        console.error('Business purchase failed, refund needed:', businessResult.message);
      }
      
      return businessResult;
      
    } catch (error) {
      console.error('Purchase error:', error);
      return {
        success: false,
        message: String(error)
      };
    } finally {
      this._loading.set(false);
    }
  }
  
  /**
   * 完成業務購買
   */
  private async completeBusinessPurchase(
    item: PurchaseItem,
    transactionId?: string
  ): Promise<PurchaseResult> {
    try {
      let endpoint = '';
      let payload: any = {
        item_id: item.id,
        transaction_id: transactionId
      };
      
      switch (item.category) {
        case 'membership':
          endpoint = '/api/membership/activate';
          payload.plan_id = item.id;
          break;
          
        case 'ip_proxy':
          endpoint = '/api/proxy/assign';
          payload.package_id = item.id;
          break;
          
        case 'quota_pack':
          endpoint = '/api/quota/add';
          payload.pack_id = item.id;
          break;
          
        default:
          return { success: false, message: '未知的購買類型' };
      }
      
      const response = await this.api.post<any>(endpoint, payload);
      
      if (response?.success) {
        // 刷新錢包
        await this.walletService.loadWallet();
        
        return {
          success: true,
          message: '購買成功',
          orderId: response.data?.order_id,
          transactionId
        };
      }
      
      return {
        success: false,
        message: response?.error || '購買失敗'
      };
      
    } catch (error) {
      console.error('Complete business purchase error:', error);
      return {
        success: false,
        message: String(error)
      };
    }
  }
  
  // ==================== 工具方法 ====================
  
  /**
   * 格式化價格
   */
  formatPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
  }
  
  /**
   * 導航到充值
   */
  goToRecharge() {
    this.router.navigate(['/wallet/recharge']);
  }
}
