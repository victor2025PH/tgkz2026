/**
 * 訂閱升級頁面
 * 
 * 優化設計：
 * 1. 清晰的方案對比
 * 2. 突出推薦方案
 * 3. 功能對比表
 * 4. 年付優惠
 */

import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  maxAccounts: number;
  highlighted: boolean;
  badge?: string;
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
        @for (plan of plans; track plan.id) {
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
              @for (plan of plans; track plan.id) {
                <th [class.highlighted]="plan.highlighted">{{ plan.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (feature of featuresList; track feature.key) {
              <tr>
                <td>{{ feature.name }}</td>
                @for (plan of plans; track plan.id) {
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
export class UpgradeViewComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private i18n = inject(I18nService);
  
  // 狀態
  billingCycle = signal<'monthly' | 'yearly'>('monthly');
  isUpgrading = signal(false);
  selectedPlan = signal<string | null>(null);
  
  // 從路由參數獲取
  requiredTier = signal<string | null>(null);
  
  currentTier = this.authService.subscriptionTier;
  
  // 方案配置
  plans: PricingPlan[] = [
    {
      id: 'free',
      name: '免費版',
      price: 0,
      yearlyPrice: 0,
      maxAccounts: 3,
      features: [
        '3 個 Telegram 帳號',
        '基礎監控功能',
        '基礎 AI 回覆',
        '社區支持'
      ],
      highlighted: false
    },
    {
      id: 'basic',
      name: '基礎版',
      price: 29,
      yearlyPrice: 23,
      maxAccounts: 10,
      features: [
        '10 個 Telegram 帳號',
        '完整監控功能',
        '模板庫訪問',
        '郵件支持',
        '數據導出'
      ],
      highlighted: false
    },
    {
      id: 'pro',
      name: '專業版',
      price: 99,
      yearlyPrice: 79,
      maxAccounts: 50,
      features: [
        '50 個 Telegram 帳號',
        '高級 AI 引擎',
        '多角色協作',
        'API 訪問',
        '優先支持',
        '團隊協作'
      ],
      highlighted: true,
      badge: '最受歡迎'
    },
    {
      id: 'enterprise',
      name: '企業版',
      price: -1,
      yearlyPrice: -1,
      maxAccounts: 999,
      features: [
        '無限 Telegram 帳號',
        '定制 AI 模型',
        '專屬客戶經理',
        'SLA 保障',
        '私有部署選項',
        '培訓服務'
      ],
      highlighted: false
    }
  ];
  
  // 功能對比列表
  featuresList = [
    { key: 'accounts', name: '帳號數量', values: { free: '3', basic: '10', pro: '50', enterprise: '無限' } },
    { key: 'monitoring', name: '群組監控', values: { free: '基礎', basic: '完整', pro: '完整', enterprise: '完整' } },
    { key: 'ai', name: 'AI 回覆', values: { free: '基礎', basic: '標準', pro: '高級', enterprise: '定制' } },
    { key: 'templates', name: '模板庫', values: { free: false, basic: true, pro: true, enterprise: true } },
    { key: 'multiRole', name: '多角色協作', values: { free: false, basic: false, pro: true, enterprise: true } },
    { key: 'api', name: 'API 訪問', values: { free: false, basic: false, pro: true, enterprise: true } },
    { key: 'team', name: '團隊協作', values: { free: false, basic: false, pro: true, enterprise: true } },
    { key: 'support', name: '支持', values: { free: '社區', basic: '郵件', pro: '優先', enterprise: '專屬' } }
  ];
  
  constructor() {
    // 從路由參數獲取需要的方案
    const required = this.route.snapshot.queryParams['required'];
    if (required) {
      this.requiredTier.set(required);
    }
  }
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  selectPlan(plan: PricingPlan) {
    if (plan.price === -1) {
      // 企業版 - 聯繫銷售
      window.open('mailto:sales@tg-matrix.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    
    if (plan.price === 0) {
      // 免費版 - 直接開始
      this.router.navigate(['/dashboard']);
      return;
    }
    
    // 付費方案 - 跳轉到支付頁面
    this.selectedPlan.set(plan.id);
    this.isUpgrading.set(true);
    
    // TODO: 實現支付流程
    setTimeout(() => {
      this.isUpgrading.set(false);
      alert('支付功能即將推出！');
    }, 1500);
  }
}
