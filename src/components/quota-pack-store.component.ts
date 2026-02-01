/**
 * 配額包商店組件
 * 
 * 展示和購買配額包
 */

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService, QuotaPack, UserPackage } from '../services/billing.service';

@Component({
  selector: 'app-quota-pack-store',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pack-store">
      <!-- 標題 -->
      <header class="store-header">
        <h2>配額包商店</h2>
        <p>購買額外配額，突破限制</p>
      </header>
      
      <!-- 我的配額包 -->
      <section class="my-packages" *ngIf="myPackages().length > 0">
        <h3>我的配額包</h3>
        <div class="packages-list">
          <div class="package-card" *ngFor="let pkg of myPackages()">
            <div class="package-header">
              <span class="package-icon">📦</span>
              <span class="package-name">{{ pkg.pack_name }}</span>
            </div>
            <div class="package-quotas">
              <div class="quota-item" *ngFor="let quota of getQuotaItems(pkg.remaining)">
                <span class="quota-icon">{{ getQuotaIcon(quota.type) }}</span>
                <span class="quota-value">{{ quota.remaining }}/{{ quota.total }}</span>
                <span class="quota-label">{{ getQuotaLabel(quota.type) }}</span>
              </div>
            </div>
            <div class="package-footer">
              <span class="expires">
                {{ formatExpiry(pkg.expires_at) }}
              </span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 可購買的配額包 -->
      <section class="available-packs">
        <h3>可購買配額包</h3>
        
        <!-- 類型過濾 -->
        <div class="type-filter">
          <button 
            *ngFor="let type of packTypes"
            [class.active]="selectedType() === type.value"
            (click)="selectedType.set(type.value)">
            {{ type.icon }} {{ type.label }}
          </button>
        </div>
        
        <!-- 配額包網格 -->
        <div class="packs-grid">
          <div class="pack-card" 
               *ngFor="let pack of filteredPacks()"
               [class.featured]="pack.featured"
               (click)="selectPack(pack)">
            <div class="featured-badge" *ngIf="pack.featured">熱銷</div>
            
            <div class="pack-header">
              <span class="pack-icon">{{ billing.getPackTypeIcon(pack.type) }}</span>
              <h4>{{ pack.name }}</h4>
            </div>
            
            <div class="pack-quotas">
              <div class="quota-row" *ngFor="let q of getPackQuotas(pack)">
                <span class="quota-icon">{{ getQuotaIcon(q.type) }}</span>
                <span class="quota-amount">+{{ q.amount }}</span>
                <span class="quota-label">{{ getQuotaLabel(q.type) }}</span>
              </div>
            </div>
            
            <p class="pack-desc">{{ pack.description }}</p>
            
            <div class="pack-footer">
              <span class="pack-price">{{ billing.formatPrice(pack.price) }}</span>
              <span class="pack-validity">有效期 {{ pack.validity_days }} 天</span>
            </div>
            
            <button class="buy-btn" (click)="openPurchaseDialog(pack); $event.stopPropagation()">
              立即購買
            </button>
          </div>
        </div>
      </section>
      
      <!-- 購買確認對話框 -->
      <div class="dialog-overlay" *ngIf="showPurchaseDialog()" (click)="showPurchaseDialog.set(false)">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>確認購買</h3>
          
          <div class="purchase-summary" *ngIf="selectedPack()">
            <div class="pack-preview">
              <span class="icon">{{ billing.getPackTypeIcon(selectedPack()!.type) }}</span>
              <div class="info">
                <span class="name">{{ selectedPack()!.name }}</span>
                <span class="desc">{{ selectedPack()!.description }}</span>
              </div>
            </div>
            
            <div class="price-row">
              <span>價格</span>
              <span class="price">{{ billing.formatPrice(selectedPack()!.price) }}</span>
            </div>
            
            <div class="validity-row">
              <span>有效期</span>
              <span>{{ selectedPack()!.validity_days }} 天</span>
            </div>
          </div>
          
          <!-- 支付方式 -->
          <div class="payment-methods">
            <h4>選擇支付方式</h4>
            <div class="method-options">
              <label class="method-option" [class.selected]="paymentMethod() === 'balance'">
                <input type="radio" name="payment" value="balance"
                       [checked]="paymentMethod() === 'balance'"
                       (change)="paymentMethod.set('balance')">
                <span class="method-icon">💰</span>
                <span class="method-label">餘額支付</span>
              </label>
              <label class="method-option" [class.selected]="paymentMethod() === 'alipay'">
                <input type="radio" name="payment" value="alipay"
                       [checked]="paymentMethod() === 'alipay'"
                       (change)="paymentMethod.set('alipay')">
                <span class="method-icon">💙</span>
                <span class="method-label">支付寶</span>
              </label>
              <label class="method-option" [class.selected]="paymentMethod() === 'wechat'">
                <input type="radio" name="payment" value="wechat"
                       [checked]="paymentMethod() === 'wechat'"
                       (change)="paymentMethod.set('wechat')">
                <span class="method-icon">💚</span>
                <span class="method-label">微信支付</span>
              </label>
            </div>
          </div>
          
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showPurchaseDialog.set(false)">取消</button>
            <button class="btn-confirm" [disabled]="isPurchasing()" (click)="confirmPurchase()">
              {{ isPurchasing() ? '處理中...' : '確認支付' }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 購買成功提示 -->
      <div class="success-toast" *ngIf="showSuccess()">
        <span class="success-icon">✓</span>
        <span>購買成功！配額已添加</span>
      </div>
    </div>
  `,
  styles: [`
    .pack-store {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .store-header {
      text-align: center;
      margin-bottom: 32px;
    }
    
    .store-header h2 {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 8px;
    }
    
    .store-header p {
      color: var(--text-secondary, #888);
      margin: 0;
    }
    
    /* 我的配額包 */
    .my-packages {
      margin-bottom: 32px;
    }
    
    .my-packages h3, .available-packs h3 {
      font-size: 18px;
      margin-bottom: 16px;
    }
    
    .packages-list {
      display: flex;
      gap: 16px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    
    .package-card {
      min-width: 200px;
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .package-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .package-icon {
      font-size: 24px;
    }
    
    .package-name {
      font-weight: 600;
    }
    
    .package-quotas {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .quota-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    
    .package-footer {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color, #333);
    }
    
    .expires {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    /* 類型過濾 */
    .type-filter {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .type-filter button {
      padding: 8px 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 20px;
      color: var(--text-secondary, #888);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .type-filter button.active {
      background: var(--primary, #3b82f6);
      border-color: var(--primary, #3b82f6);
      color: white;
    }
    
    /* 配額包網格 */
    .packs-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 20px;
    }
    
    .pack-card {
      position: relative;
      padding: 24px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.3s;
    }
    
    .pack-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
    
    .pack-card.featured {
      border-color: var(--primary, #3b82f6);
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
    }
    
    .featured-badge {
      position: absolute;
      top: -10px;
      right: 16px;
      padding: 4px 12px;
      background: linear-gradient(135deg, #f59e0b, #ef4444);
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }
    
    .pack-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .pack-icon {
      font-size: 32px;
    }
    
    .pack-header h4 {
      margin: 0;
      font-size: 18px;
    }
    
    .pack-quotas {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .quota-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .quota-amount {
      font-weight: 600;
      color: #22c55e;
    }
    
    .quota-label {
      color: var(--text-secondary, #888);
      font-size: 13px;
    }
    
    .pack-desc {
      font-size: 13px;
      color: var(--text-secondary, #888);
      margin: 0 0 16px;
    }
    
    .pack-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .pack-price {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary, #3b82f6);
    }
    
    .pack-validity {
      font-size: 12px;
      color: var(--text-muted, #666);
    }
    
    .buy-btn {
      width: 100%;
      padding: 12px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .buy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    /* 對話框 */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .dialog-content {
      background: var(--bg-primary, #0f0f0f);
      border-radius: 16px;
      padding: 24px;
      min-width: 400px;
    }
    
    .dialog-content h3 {
      margin: 0 0 20px;
    }
    
    .purchase-summary {
      margin-bottom: 20px;
    }
    
    .pack-preview {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    
    .pack-preview .icon {
      font-size: 36px;
    }
    
    .pack-preview .name {
      display: block;
      font-weight: 600;
    }
    
    .pack-preview .desc {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .price-row, .validity-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .price {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary, #3b82f6);
    }
    
    .payment-methods h4 {
      font-size: 14px;
      margin: 0 0 12px;
      color: var(--text-secondary, #888);
    }
    
    .method-options {
      display: flex;
      gap: 12px;
    }
    
    .method-option {
      flex: 1;
      padding: 12px;
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--border-color, #333);
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
    }
    
    .method-option input {
      display: none;
    }
    
    .method-option.selected {
      border-color: var(--primary, #3b82f6);
    }
    
    .method-icon {
      display: block;
      font-size: 24px;
      margin-bottom: 4px;
    }
    
    .method-label {
      font-size: 12px;
    }
    
    .dialog-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .btn-confirm {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      color: white;
    }
    
    .btn-confirm:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* 成功提示 */
    .success-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 24px;
      background: #22c55e;
      border-radius: 12px;
      color: white;
      font-weight: 600;
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(20px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .success-icon {
      font-size: 20px;
    }
  `]
})
export class QuotaPackStoreComponent implements OnInit {
  billing = inject(BillingService);
  
  // 狀態
  selectedType = signal<string>('all');
  selectedPack = signal<QuotaPack | null>(null);
  showPurchaseDialog = signal(false);
  paymentMethod = signal<string>('balance');
  isPurchasing = signal(false);
  showSuccess = signal(false);
  
  // 類型選項
  packTypes = [
    { value: 'all', label: '全部', icon: '📦' },
    { value: 'messages', label: '消息包', icon: '💬' },
    { value: 'ai_calls', label: 'AI 包', icon: '🤖' },
    { value: 'combo', label: '組合包', icon: '🎁' },
    { value: 'accounts', label: '帳號包', icon: '📱' },
  ];
  
  // 配額圖標和標籤
  private quotaIcons: Record<string, string> = {
    daily_messages: '💬',
    ai_calls: '🤖',
    tg_accounts: '📱',
    groups: '👥',
  };
  
  private quotaLabels: Record<string, string> = {
    daily_messages: '每日消息',
    ai_calls: 'AI 調用',
    tg_accounts: 'TG 帳號',
    groups: '群組數',
  };

  ngOnInit() {
    this.billing.loadQuotaPacks();
    this.billing.loadMyPackages();
  }

  // 計算屬性
  myPackages = computed(() => this.billing.myPackages());
  
  filteredPacks = computed(() => {
    const packs = this.billing.quotaPacks();
    const type = this.selectedType();
    
    if (type === 'all') return packs;
    return packs.filter(p => p.type === type);
  });

  getQuotaIcon(type: string): string {
    return this.quotaIcons[type] || '📊';
  }

  getQuotaLabel(type: string): string {
    return this.quotaLabels[type] || type;
  }

  getQuotaItems(remaining: Record<string, number>): { type: string; remaining: number; total: number }[] {
    // 簡化：假設 total 等於 remaining（實際應該從 quotas 獲取）
    return Object.entries(remaining).map(([type, value]) => ({
      type,
      remaining: value,
      total: value // 這裡應該是原始值
    }));
  }

  getPackQuotas(pack: QuotaPack): { type: string; amount: number }[] {
    return Object.entries(pack.quotas).map(([type, amount]) => ({
      type,
      amount
    }));
  }

  formatExpiry(isoTime: string): string {
    try {
      const date = new Date(isoTime);
      const now = new Date();
      const days = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (days < 0) return '已過期';
      if (days === 0) return '今日到期';
      if (days === 1) return '明日到期';
      return `${days} 天後到期`;
    } catch {
      return '';
    }
  }

  selectPack(pack: QuotaPack) {
    this.selectedPack.set(pack);
  }

  openPurchaseDialog(pack: QuotaPack) {
    this.selectedPack.set(pack);
    this.showPurchaseDialog.set(true);
  }

  async confirmPurchase() {
    const pack = this.selectedPack();
    if (!pack) return;
    
    this.isPurchasing.set(true);
    
    const result = await this.billing.purchasePack(pack.id, this.paymentMethod());
    
    this.isPurchasing.set(false);
    
    if (result.success) {
      this.showPurchaseDialog.set(false);
      this.showSuccess.set(true);
      
      setTimeout(() => {
        this.showSuccess.set(false);
      }, 3000);
    } else {
      alert(result.error || '購買失敗');
    }
  }
}
