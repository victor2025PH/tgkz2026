/**
 * 訂閱升級頁面
 * 
 * 優化設計：
 * 1. 清晰的方案對比
 * 2. 突出推薦方案
 * 3. 功能對比表
 * 4. 年付優惠
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';
import { QuotaService, MembershipLevel } from '../services/quota.service';
import { PurchaseService, MembershipPlan } from '../services/purchase.service';
import { ToastService } from '../toast.service';

interface PricingPlan {
  id: string;                 // 用於「當前方案」高亮比較（= tier，如 basic/pro/enterprise）
  name: string;
  price: number;              // 展示用（元/月）
  yearlyPrice: number;        // 展示用（元/月，年付月均）
  features: string[];
  maxAccounts: number;
  highlighted: boolean;
  badge?: string;
  icon?: string;
  quotas?: Record<string, number>;
  // 🔧 購買所需（後端權威）
  tier?: string;              // basic/pro/enterprise
  priceCents?: number;        // 月價（分），購買展示；實際扣款以後端權威為準
  durationDays?: number;
  isAuthoritative?: boolean;  // true=來自後端權威方案（可真實購買）
}

@Component({
  selector: 'app-upgrade-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="upgrade-page">
      <header class="page-header">
        <h1>選擇適合您的方案</h1>
        <p>靈活的定價，滿足各種規模的需求</p>
        
        <!-- 計費週期切換 -->
        <div class="billing-toggle">
          <button 
            [class.active]="billingCycle() === 'monthly'"
            (click)="billingCycle.set('monthly')"
          >
            {{ t('subscription.monthly') }}
          </button>
          <button 
            [class.active]="billingCycle() === 'yearly'"
            (click)="billingCycle.set('yearly')"
          >
            {{ t('subscription.yearly') }}
            <span class="discount-badge">省 20%</span>
          </button>
        </div>
      </header>
      
      <!-- 提示信息 -->
      @if (requiredTier()) {
        <div class="upgrade-notice">
          <span class="notice-icon">ℹ️</span>
          <span>此功能需要 <strong>{{ t('subscription.' + requiredTier()) }}</strong> 或更高方案</span>
        </div>
      }
      
      <!-- 方案卡片 -->
      <div class="plans-grid">
        @for (plan of plans(); track plan.id) {
          <div 
            class="plan-card" 
            [class.highlighted]="plan.highlighted"
            [class.current]="currentTier() === plan.id"
          >
            @if (plan.badge) {
              <div class="plan-badge">{{ plan.badge }}</div>
            }
            @if (currentTier() === plan.id) {
              <div class="current-badge">{{ t('subscription.currentPlan') }}</div>
            }
            
            <h2 class="plan-name">{{ plan.name }}</h2>
            
            <div class="plan-price">
              @if (plan.price === -1) {
                <span class="price-custom">定制價格</span>
              } @else if (plan.price === 0) {
                <span class="price-amount">免費</span>
              } @else {
                <span class="price-currency">$</span>
                <span class="price-amount">
                  {{ billingCycle() === 'yearly' ? plan.yearlyPrice : plan.price }}
                </span>
                <span class="price-period">/月</span>
              }
            </div>
            
            <p class="plan-accounts">
              最多 <strong>{{ plan.maxAccounts === 999 ? '無限' : plan.maxAccounts }}</strong> 個帳號
            </p>
            
            <ul class="plan-features">
              @for (feature of plan.features; track feature) {
                <li>
                  <span class="feature-check">✓</span>
                  {{ feature }}
                </li>
              }
            </ul>
            
            <button 
              class="plan-btn"
              [class.btn-primary]="plan.highlighted"
              [class.btn-secondary]="!plan.highlighted"
              [disabled]="currentTier() === plan.id || (plan.price > 0 && isUpgrading())"
              (click)="selectPlan(plan)"
            >
              @if (isUpgrading() && selectedPlan() === plan.id) {
                <span class="loading-spinner"></span>
              }
              @if (currentTier() === plan.id) {
                當前方案
              } @else if (plan.price === -1) {
                {{ t('subscription.contactSales') }}
              } @else if (plan.price === 0) {
                開始使用
              } @else {
                {{ t('subscription.upgradeNow') }}
              }
            </button>
          </div>
        }
      </div>
      
      <!-- 功能對比表 -->
      <section class="features-comparison">
        <h2>功能對比</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>功能</th>
              @for (plan of plans(); track plan.id) {
                <th [class.highlighted]="plan.highlighted">{{ plan.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (feature of featuresList(); track feature.key) {
              <tr>
                <td>{{ feature.name }}</td>
                @for (plan of plans(); track plan.id) {
                  <td>
                    @if (feature.values[plan.id] === true) {
                      <span class="check">✓</span>
                    } @else if (feature.values[plan.id] === false) {
                      <span class="cross">—</span>
                    } @else {
                      {{ feature.values[plan.id] }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </section>
      
      <!-- FAQ -->
      <section class="faq-section">
        <h2>常見問題</h2>
        <div class="faq-list">
          <div class="faq-item">
            <h3>可以隨時更換方案嗎？</h3>
            <p>是的，您可以隨時升級或降級方案。升級立即生效，降級將在當前計費週期結束後生效。</p>
          </div>
          <div class="faq-item">
            <h3>支持哪些付款方式？</h3>
            <p>我們支持信用卡、PayPal、銀行轉帳和加密貨幣（USDT/BTC）付款。</p>
          </div>
          <div class="faq-item">
            <h3>有退款政策嗎？</h3>
            <p>我們提供 7 天無條件退款保證。如果不滿意，可以申請全額退款。</p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .upgrade-page {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    
    .page-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    
    .page-header p {
      color: var(--text-secondary, #888);
      margin-bottom: 1.5rem;
    }
    
    /* 計費週期切換 */
    .billing-toggle {
      display: inline-flex;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 8px;
      padding: 4px;
    }
    
    .billing-toggle button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-secondary, #888);
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .billing-toggle button.active {
      background: var(--primary, #3b82f6);
      color: white;
    }
    
    .discount-badge {
      padding: 0.125rem 0.375rem;
      background: #22c55e;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 600;
    }
    
    /* 升級提示 */
    .upgrade-notice {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      margin-bottom: 2rem;
      color: var(--primary, #3b82f6);
    }
    
    /* 方案網格 */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    
    .plan-card {
      position: relative;
      padding: 2rem;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 16px;
      transition: all 0.3s ease;
    }
    
    .plan-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
    }
    
    .plan-card.highlighted {
      border-color: var(--primary, #3b82f6);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
    }
    
    .plan-card.current {
      border-color: #22c55e;
    }
    
    .plan-badge {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 1rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
    }
    
    .current-badge {
      position: absolute;
      top: -12px;
      right: 1rem;
      padding: 0.25rem 0.75rem;
      background: #22c55e;
      border-radius: 20px;
      font-size: 0.625rem;
      font-weight: 600;
      color: white;
    }
    
    .plan-name {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    
    .plan-price {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 0.5rem;
    }
    
    .price-currency {
      font-size: 1.25rem;
      color: var(--text-secondary, #888);
    }
    
    .price-amount {
      font-size: 2.5rem;
      font-weight: 700;
    }
    
    .price-period {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
    }
    
    .price-custom {
      font-size: 1.25rem;
      color: var(--primary, #3b82f6);
    }
    
    .plan-accounts {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
      margin-bottom: 1.5rem;
    }
    
    .plan-features {
      list-style: none;
      padding: 0;
      margin: 0 0 1.5rem 0;
    }
    
    .plan-features li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary, #aaa);
    }
    
    .feature-check {
      color: #22c55e;
      font-weight: bold;
    }
    
    .plan-btn {
      width: 100%;
      padding: 0.875rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    
    .plan-btn.btn-primary {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      color: white;
    }
    
    .plan-btn.btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .plan-btn.btn-secondary {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .plan-btn.btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      border-color: var(--border-hover, #444);
    }
    
    .plan-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* 功能對比表 */
    .features-comparison {
      margin-bottom: 3rem;
    }
    
    .features-comparison h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .comparison-table th,
    .comparison-table td {
      padding: 1rem;
      text-align: center;
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    .comparison-table th {
      background: var(--bg-tertiary, #151515);
      font-weight: 600;
      font-size: 0.875rem;
    }
    
    .comparison-table th.highlighted {
      background: rgba(59, 130, 246, 0.1);
      color: var(--primary, #3b82f6);
    }
    
    .comparison-table td:first-child {
      text-align: left;
      font-size: 0.875rem;
      color: var(--text-secondary, #aaa);
    }
    
    .comparison-table .check {
      color: #22c55e;
      font-weight: bold;
    }
    
    .comparison-table .cross {
      color: var(--text-muted, #666);
    }
    
    /* FAQ */
    .faq-section {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .faq-section h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    
    .faq-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .faq-item {
      padding: 1.5rem;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
    }
    
    .faq-item h3 {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .faq-item p {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
      line-height: 1.6;
    }
    
    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    @media (max-width: 768px) {
      .plans-grid {
        grid-template-columns: 1fr;
      }
      
      .comparison-table {
        font-size: 0.75rem;
      }
      
      .comparison-table th,
      .comparison-table td {
        padding: 0.5rem;
      }
    }
  `]
})
export class UpgradeViewComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  private quotaService = inject(QuotaService);
  private purchaseService = inject(PurchaseService);
  private toast = inject(ToastService);

  // 後端權威方案（用於購買；與展示用 PricingPlan 分離）
  private rawPlans = signal<MembershipPlan[]>([]);
  
  // 狀態
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  isUpgrading = signal(false);
  selectedPlan = signal<string | null>(null);
  isLoading = signal(true);
  
  // 從路由參數獲取
  requiredTier = signal<string | null>(null);
  
  currentTier = this.authService.subscriptionTier;
  
  // 動態方案配置
  private _plans = signal<PricingPlan[]>([]);
  
  // 計算屬性：顯示的方案列表
  plans = computed(() => {
    const dynamicPlans = this._plans();
    return dynamicPlans.length > 0 ? dynamicPlans : this.defaultPlans;
  });
  
  // 默認方案（回退）
  private defaultPlans: PricingPlan[] = [
    {
      id: 'bronze',
      name: '青銅戰士',
      price: 0,
      yearlyPrice: 0,
      maxAccounts: 3,
      icon: '🥉',
      features: [
        '3 個 Telegram 帳號',
        '每日 50 條消息',
        '每日 10 次 AI 調用',
        '基礎功能'
      ],
      highlighted: false
    },
    {
      id: 'silver',
      name: '白銀衛士',
      price: 99,
      yearlyPrice: 79,
      maxAccounts: 10,
      icon: '🥈',
      features: [
        '10 個 Telegram 帳號',
        '每日 200 條消息',
        '每日 50 次 AI 調用',
        '模板庫訪問'
      ],
      highlighted: false
    },
    {
      id: 'gold',
      name: '黃金獵手',
      price: 299,
      yearlyPrice: 239,
      maxAccounts: 30,
      icon: '🥇',
      features: [
        '30 個 Telegram 帳號',
        '每日 500 條消息',
        '每日 100 次 AI 調用',
        '多角色協作'
      ],
      highlighted: true,
      badge: '最受歡迎'
    },
    {
      id: 'diamond',
      name: '鑽石王者',
      price: 599,
      yearlyPrice: 479,
      maxAccounts: 100,
      icon: '💎',
      features: [
        '100 個 Telegram 帳號',
        '每日 2000 條消息',
        '每日 500 次 AI 調用',
        'API 訪問'
      ],
      highlighted: false
    },
    {
      id: 'star',
      name: '星耀傳奇',
      price: 999,
      yearlyPrice: 799,
      maxAccounts: 500,
      icon: '⭐',
      features: [
        '500 個 Telegram 帳號',
        '每日 10000 條消息',
        '每日 2000 次 AI 調用',
        '優先支持'
      ],
      highlighted: false
    },
    {
      id: 'king',
      name: '王者至尊',
      price: -1,
      yearlyPrice: -1,
      maxAccounts: 999,
      icon: '👑',
      features: [
        '無限 Telegram 帳號',
        '無限消息',
        '無限 AI 調用',
        '專屬服務'
      ],
      highlighted: false
    }
  ];

  async ngOnInit() {
    // 從路由參數獲取需要的方案
    const required = this.route.snapshot.queryParams['required'];
    if (required) {
      this.requiredTier.set(required);
    }
    
    // 加載動態方案數據
    await this.loadMembershipLevels();
  }
  
  private async loadMembershipLevels() {
    this.isLoading.set(true);
    try {
      // 🔧 優先用後端權威方案（可真實購買，價格單位分）。
      // 這些方案走 /api/membership/plans → wallet/plan_catalog（權威源）。
      const authPlans = await this.purchaseService.loadMembershipPlans();
      if (authPlans && authPlans.length > 0) {
        this.rawPlans.set(authPlans);
        const icons: Record<string, string> = { basic: '🥈', pro: '🥇', enterprise: '👑' };
        const plans: PricingPlan[] = authPlans.map((p: any) => ({
          id: p.tier,                                  // 高亮比較用 tier
          tier: p.tier,
          name: p.name,
          price: Math.round((p.price || 0) / 100),      // 分→元（月）
          yearlyPrice: p.price_yearly
            ? Math.round(p.price_yearly / 12 / 100)      // 年付月均（元）
            : Math.round((p.price || 0) / 100),
          maxAccounts: p.max_accounts === -1 ? 999 : (p.max_accounts || 0),
          icon: icons[p.tier] || '⭐',
          features: p.features || [],
          highlighted: !!p.is_popular,
          badge: p.is_popular ? '最受歡迎' : undefined,
          priceCents: p.price,
          durationDays: p.duration_days,
          isAuthoritative: true,
        }));
        this._plans.set(plans);
        return;
      }

      // 後備：舊的六級展示（僅展示，不可購買）
      await this.quotaService.loadMembershipLevels();
      const levels = this.quotaService.levels();
      if (levels.length > 0) {
        const plans: PricingPlan[] = levels.map((level, index) => ({
          id: level.level,
          name: level.name,
          price: level.prices?.month || 0,
          yearlyPrice: Math.floor((level.prices?.month || 0) * 0.8),
          maxAccounts: level.quotas?.tg_accounts || 0,
          icon: level.icon,
          features: this.generateFeatures(level),
          highlighted: level.level === 'gold',
          badge: level.level === 'gold' ? '最受歡迎' : undefined,
          quotas: level.quotas,
          isAuthoritative: false,
        }));
        this._plans.set(plans);
      }
    } catch (error) {
      console.error('Failed to load membership levels:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private generateFeatures(level: MembershipLevel): string[] {
    const features: string[] = [];
    const quotas = level.quotas || {};
    
    if (quotas.tg_accounts) {
      features.push(quotas.tg_accounts === -1 ? '無限 Telegram 帳號' : `${quotas.tg_accounts} 個 Telegram 帳號`);
    }
    if (quotas.daily_messages) {
      features.push(quotas.daily_messages === -1 ? '無限消息' : `每日 ${quotas.daily_messages} 條消息`);
    }
    if (quotas.ai_calls) {
      features.push(quotas.ai_calls === -1 ? '無限 AI 調用' : `每日 ${quotas.ai_calls} 次 AI 調用`);
    }
    
    // 添加功能特性
    if (level.features?.length) {
      features.push(...level.features.slice(0, 3));
    }
    
    return features;
  }
  
  // 功能對比列表（動態生成）
  featuresList = computed(() => {
    const levels = this.plans();
    const levelIds = levels.map(l => l.id);
    
    return [
      { 
        key: 'accounts', 
        name: '帳號數量', 
        values: Object.fromEntries(levels.map(l => [l.id, l.maxAccounts === 999 ? '無限' : l.maxAccounts.toString()]))
      },
      { 
        key: 'messages', 
        name: '每日消息', 
        values: Object.fromEntries(levels.map(l => {
          const quota = l.quotas?.daily_messages;
          return [l.id, quota === -1 ? '無限' : quota?.toString() || '-'];
        }))
      },
      { 
        key: 'ai', 
        name: 'AI 調用', 
        values: Object.fromEntries(levels.map(l => {
          const quota = l.quotas?.ai_calls;
          return [l.id, quota === -1 ? '無限' : quota?.toString() || '-'];
        }))
      },
      { 
        key: 'groups', 
        name: '群組數量', 
        values: Object.fromEntries(levels.map(l => {
          const quota = l.quotas?.groups;
          return [l.id, quota === -1 ? '無限' : quota?.toString() || '-'];
        }))
      },
      { 
        key: 'support', 
        name: '技術支持', 
        values: Object.fromEntries(levels.map((l, i) => {
          const supports = ['社區', '郵件', '優先', '專屬', 'VIP', '至尊'];
          return [l.id, supports[Math.min(i, supports.length - 1)]];
        }))
      }
    ];
  });
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  async selectPlan(plan: PricingPlan) {
    // 非權威方案（舊六級後備展示）尚不可直接購買 → 引導聯繫/說明
    if (!plan.isAuthoritative || !plan.tier) {
      if (plan.price === -1) {
        window.open('mailto:sales@tg-matrix.com?subject=Enterprise Plan Inquiry', '_blank');
      } else if (plan.price === 0) {
        this.router.navigate(['/dashboard']);
      } else {
        this.toast.info('該方案暫不支持在線購買，請聯繫客服');
      }
      return;
    }

    // 已是當前方案
    if (this.currentTier() === plan.id) {
      return;
    }

    // 🔴 真實購買：用錢包餘額經後端原子端點（扣款+履約+失敗退款）。
    // plan_id 依計費週期組合為 {tier}_{monthly|yearly}；價格/時長以後端權威為準，
    // 前端傳值僅供展示，即使被改也不影響實際扣款（見上一階段權威定價）。
    const cycle = this.billingCycle() === 'yearly' ? 'yearly' : 'monthly';
    const planId = `${plan.tier}_${cycle}`;
    const membershipPlan: MembershipPlan = {
      id: planId,
      name: plan.name,
      tier: plan.tier,
      duration_days: plan.durationDays || (cycle === 'yearly' ? 365 : 30),
      price: plan.priceCents || 0,
      features: plan.features || [],
    };

    this.selectedPlan.set(plan.id);
    this.isUpgrading.set(true);
    try {
      const result = await this.purchaseService.purchaseMembership(membershipPlan);

      if (result.success) {
        this.toast.success(`已開通${plan.name}，正在刷新會員狀態…`);
        // 刷新用戶會員等級顯示（MembershipService 會經 user_update 同步）
        await this.authService.fetchCurrentUser();
      } else {
        const msg = result.message || '購買失敗';
        // 餘額不足 → 引導去充值（帶回跳與所需金額）
        if (msg.includes('餘額不足') || msg.includes('余额不足')) {
          this.toast.warning(msg);
          this.router.navigate(['/wallet/recharge'], {
            queryParams: { returnUrl: '/upgrade', amount: plan.priceCents || 0 }
          });
        } else {
          this.toast.error(msg);
        }
      }
    } catch (e: any) {
      this.toast.error(e?.message || '購買失敗，請稍後重試');
    } finally {
      this.isUpgrading.set(false);
    }
  }
}
