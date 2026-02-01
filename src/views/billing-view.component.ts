/**
 * 計費管理視圖
 * 
 * 展示賬單、配額包、超額費用
 */

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillingService, BillingItem, UserPackage } from '../services/billing.service';
import { QuotaPackStoreComponent } from '../components/quota-pack-store.component';

@Component({
  selector: 'app-billing-view',
  standalone: true,
  imports: [CommonModule, QuotaPackStoreComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="billing-view">
      <!-- 凍結警告 -->
      <div class="freeze-warning" *ngIf="isFrozen()">
        <span class="warning-icon">⚠️</span>
        <div class="warning-content">
          <h4>配額已凍結</h4>
          <p>{{ freezeReason() }}</p>
          <p class="unfreeze-time" *ngIf="unfreezeTime()">預計解凍時間：{{ unfreezeTime() }}</p>
        </div>
        <button class="pay-btn" (click)="payUnpaidBills()">立即支付</button>
      </div>
      
      <!-- 標籤頁 -->
      <div class="tabs">
        <button 
          *ngFor="let tab of tabs"
          [class.active]="activeTab() === tab.value"
          (click)="activeTab.set(tab.value)">
          {{ tab.icon }} {{ tab.label }}
          <span class="badge" *ngIf="tab.badge && tab.badge() > 0">{{ tab.badge() }}</span>
        </button>
      </div>
      
      <!-- 概覽標籤頁 -->
      <div class="tab-content" *ngIf="activeTab() === 'overview'">
        <!-- 統計卡片 -->
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">📦</span>
            <div class="stat-info">
              <span class="stat-value">{{ activePackagesCount() }}</span>
              <span class="stat-label">有效配額包</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💳</span>
            <div class="stat-info">
              <span class="stat-value">{{ unpaidBillsCount() }}</span>
              <span class="stat-label">待支付賬單</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">📈</span>
            <div class="stat-info">
              <span class="stat-value">{{ billing.formatPrice(totalOverage()) }}</span>
              <span class="stat-label">本月超額費用</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💰</span>
            <div class="stat-info">
              <span class="stat-value">{{ billing.formatPrice(totalSpent()) }}</span>
              <span class="stat-label">累計消費</span>
            </div>
          </div>
        </div>
        
        <!-- 超額使用情況 -->
        <section class="overage-section" *ngIf="overageInfo()">
          <h3>超額使用情況</h3>
          <div class="overage-list">
            <div class="overage-item" *ngFor="let item of overageItems()">
              <div class="overage-header">
                <span class="quota-icon">{{ getQuotaIcon(item.type) }}</span>
                <span class="quota-name">{{ getQuotaLabel(item.type) }}</span>
              </div>
              <div class="usage-bar">
                <div class="usage-base" [style.width.%]="item.basePercent"></div>
                <div class="usage-pack" [style.width.%]="item.packPercent"></div>
                <div class="usage-overage" [style.width.%]="item.overagePercent"></div>
              </div>
              <div class="usage-legend">
                <span class="legend-item base">基礎 {{ item.base_limit }}</span>
                <span class="legend-item pack" *ngIf="item.pack_bonus > 0">+配額包 {{ item.pack_bonus }}</span>
                <span class="legend-item overage" *ngIf="item.overage > 0">超額 {{ item.overage }}</span>
              </div>
              <div class="overage-charge" *ngIf="item.charge > 0">
                預計費用：{{ billing.formatPrice(item.charge) }}
              </div>
            </div>
          </div>
        </section>
        
        <!-- 最近賬單 -->
        <section class="recent-bills">
          <h3>最近賬單</h3>
          <div class="bills-table" *ngIf="recentBills().length > 0; else noBills">
            <table>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>描述</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let bill of recentBills()">
                  <td>{{ formatDate(bill.created_at) }}</td>
                  <td>{{ bill.description }}</td>
                  <td [class.refund]="bill.amount < 0">
                    {{ bill.amount < 0 ? '' : '' }}{{ billing.formatPrice(Math.abs(bill.amount)) }}
                  </td>
                  <td>
                    <span class="status-badge" [style.background]="billing.getBillStatusLabel(bill.status).color">
                      {{ billing.getBillStatusLabel(bill.status).text }}
                    </span>
                  </td>
                  <td>
                    <button class="action-btn" *ngIf="bill.status === 'pending'" (click)="payBill(bill)">
                      支付
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ng-template #noBills>
            <div class="empty-state">
              <span class="empty-icon">📝</span>
              <p>暫無賬單記錄</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- 配額包標籤頁 -->
      <div class="tab-content" *ngIf="activeTab() === 'packages'">
        <app-quota-pack-store />
      </div>
      
      <!-- 賬單標籤頁 -->
      <div class="tab-content" *ngIf="activeTab() === 'bills'">
        <section class="all-bills">
          <div class="bills-filter">
            <select [(value)]="billFilter" (change)="loadFilteredBills()">
              <option value="">全部</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="refunded">已退款</option>
            </select>
            <button class="refresh-btn" (click)="refreshBills()">
              🔄 刷新
            </button>
          </div>
          
          <div class="bills-list">
            <div class="bill-card" *ngFor="let bill of allBills()">
              <div class="bill-header">
                <span class="bill-type">{{ getBillTypeIcon(bill.billing_type) }}</span>
                <span class="bill-id">{{ bill.id.slice(0, 12) }}...</span>
              </div>
              <div class="bill-desc">{{ bill.description }}</div>
              <div class="bill-footer">
                <span class="bill-amount" [class.refund]="bill.amount < 0">
                  {{ bill.amount >= 0 ? '+' : '' }}{{ billing.formatPrice(bill.amount) }}
                </span>
                <span class="bill-status" [style.color]="billing.getBillStatusLabel(bill.status).color">
                  {{ billing.getBillStatusLabel(bill.status).text }}
                </span>
              </div>
              <div class="bill-date">{{ formatDate(bill.created_at) }}</div>
              <button class="pay-bill-btn" *ngIf="bill.status === 'pending'" (click)="payBill(bill)">
                立即支付
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .billing-view {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    /* 凍結警告 */
    .freeze-warning {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2));
      border: 1px solid #ef4444;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    
    .warning-icon {
      font-size: 32px;
    }
    
    .warning-content {
      flex: 1;
    }
    
    .warning-content h4 {
      margin: 0 0 4px;
      color: #ef4444;
    }
    
    .warning-content p {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    .pay-btn {
      padding: 12px 24px;
      background: #ef4444;
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    
    /* 標籤頁 */
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border-color, #333);
      padding-bottom: 12px;
    }
    
    .tabs button {
      padding: 10px 20px;
      background: transparent;
      border: none;
      color: var(--text-secondary, #888);
      font-size: 14px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      position: relative;
    }
    
    .tabs button.active {
      background: var(--bg-secondary, #1a1a1a);
      color: var(--text-primary, #fff);
    }
    
    .badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 18px;
      height: 18px;
      padding: 0 6px;
      background: #ef4444;
      border-radius: 9px;
      font-size: 11px;
      font-weight: 600;
      color: white;
    }
    
    /* 統計卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .stat-icon {
      font-size: 32px;
    }
    
    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    /* 超額使用 */
    .overage-section {
      margin-bottom: 32px;
    }
    
    .overage-section h3, .recent-bills h3 {
      font-size: 18px;
      margin: 0 0 16px;
    }
    
    .overage-list {
      display: grid;
      gap: 16px;
    }
    
    .overage-item {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .overage-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .quota-icon {
      font-size: 20px;
    }
    
    .usage-bar {
      height: 8px;
      background: var(--bg-tertiary, #2a2a2a);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
    }
    
    .usage-base {
      height: 100%;
      background: #3b82f6;
    }
    
    .usage-pack {
      height: 100%;
      background: #22c55e;
    }
    
    .usage-overage {
      height: 100%;
      background: #ef4444;
    }
    
    .usage-legend {
      display: flex;
      gap: 16px;
      margin-top: 8px;
      font-size: 12px;
    }
    
    .legend-item::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 2px;
      margin-right: 4px;
    }
    
    .legend-item.base::before {
      background: #3b82f6;
    }
    
    .legend-item.pack::before {
      background: #22c55e;
    }
    
    .legend-item.overage::before {
      background: #ef4444;
    }
    
    .overage-charge {
      margin-top: 8px;
      font-size: 13px;
      color: #ef4444;
      font-weight: 600;
    }
    
    /* 賬單表格 */
    .bills-table {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    th {
      color: var(--text-secondary, #888);
      font-weight: 500;
      font-size: 13px;
    }
    
    td.refund {
      color: #22c55e;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: white;
    }
    
    .action-btn {
      padding: 6px 12px;
      background: var(--primary, #3b82f6);
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 12px;
      cursor: pointer;
    }
    
    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--text-secondary, #888);
    }
    
    .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }
    
    /* 賬單過濾 */
    .bills-filter {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .bills-filter select {
      padding: 8px 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
    }
    
    .refresh-btn {
      padding: 8px 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
    }
    
    /* 賬單卡片列表 */
    .bills-list {
      display: grid;
      gap: 16px;
    }
    
    .bill-card {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .bill-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .bill-type {
      font-size: 20px;
    }
    
    .bill-id {
      font-size: 12px;
      color: var(--text-muted, #666);
      font-family: monospace;
    }
    
    .bill-desc {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .bill-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .bill-amount {
      font-size: 20px;
      font-weight: 700;
    }
    
    .bill-amount.refund {
      color: #22c55e;
    }
    
    .bill-date {
      font-size: 12px;
      color: var(--text-muted, #666);
      margin-top: 8px;
    }
    
    .pay-bill-btn {
      width: 100%;
      margin-top: 12px;
      padding: 10px;
      background: var(--primary, #3b82f6);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
  `]
})
export class BillingViewComponent implements OnInit {
  billing = inject(BillingService);
  Math = Math;
  
  // 狀態
  activeTab = signal<string>('overview');
  billFilter = '';
  
  // 標籤頁定義
  tabs = [
    { value: 'overview', label: '概覽', icon: '📊', badge: undefined },
    { value: 'packages', label: '配額包', icon: '📦', badge: undefined },
    { value: 'bills', label: '賬單', icon: '💳', badge: () => this.unpaidBillsCount() },
  ];
  
  private quotaIcons: Record<string, string> = {
    daily_messages: '💬',
    ai_calls: '🤖',
  };
  
  private quotaLabels: Record<string, string> = {
    daily_messages: '每日消息',
    ai_calls: 'AI 調用',
  };

  ngOnInit() {
    this.billing.refresh();
  }

  // 計算屬性
  isFrozen = computed(() => this.billing.freezeStatus()?.frozen ?? false);
  freezeReason = computed(() => this.billing.freezeStatus()?.reason ?? '');
  unfreezeTime = computed(() => {
    const time = this.billing.freezeStatus()?.unfreeze_at;
    if (!time) return '';
    return this.formatDate(time);
  });
  
  activePackagesCount = computed(() => this.billing.myPackages().length);
  unpaidBillsCount = computed(() => this.billing.unpaidBills().length);
  totalOverage = computed(() => this.billing.totalOverageCharge());
  totalSpent = computed(() => {
    return this.billing.bills()
      .filter(b => b.status === 'paid' && b.amount > 0)
      .reduce((sum, b) => sum + b.amount, 0);
  });
  
  overageInfo = computed(() => this.billing.overageInfo());
  overageItems = computed(() => {
    const info = this.overageInfo();
    if (!info) return [];
    
    return Object.entries(info).map(([type, data]) => {
      const total = data.used;
      const base = Math.min(data.base_limit, total);
      const pack = Math.min(data.pack_bonus, Math.max(0, total - data.base_limit));
      const overage = data.overage;
      
      const max = Math.max(total, data.total_limit) || 1;
      
      return {
        type,
        ...data,
        basePercent: (base / max) * 100,
        packPercent: (pack / max) * 100,
        overagePercent: (overage / max) * 100,
      };
    });
  });
  
  recentBills = computed(() => this.billing.bills().slice(0, 5));
  allBills = computed(() => this.billing.bills());

  getQuotaIcon(type: string): string {
    return this.quotaIcons[type] || '📊';
  }

  getQuotaLabel(type: string): string {
    return this.quotaLabels[type] || type;
  }

  getBillTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      subscription: '📅',
      overage: '📈',
      quota_pack: '📦',
      refund: '↩️',
    };
    return icons[type] || '💳';
  }

  formatDate(isoTime: string): string {
    try {
      return new Date(isoTime).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoTime;
    }
  }

  async payBill(bill: BillingItem) {
    const result = await this.billing.payBill(bill.id);
    if (!result.success) {
      alert(result.error || '支付失敗');
    }
  }

  async payUnpaidBills() {
    const unpaid = this.billing.unpaidBills();
    for (const bill of unpaid) {
      await this.billing.payBill(bill.id);
    }
  }

  loadFilteredBills() {
    this.billing.loadBills(this.billFilter || undefined);
  }

  refreshBills() {
    this.billing.loadBills();
  }
}
