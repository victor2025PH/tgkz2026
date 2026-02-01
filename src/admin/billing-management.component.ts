/**
 * 管理員計費管理組件
 * 
 * 賬單管理、退款處理、配額凍結
 */

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';

@Component({
  selector: 'app-billing-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="billing-management">
      <header class="page-header">
        <h1>計費管理</h1>
        <button class="refresh-btn" (click)="refresh()">
          🔄 刷新
        </button>
      </header>
      
      <!-- 統計卡片 -->
      <div class="overview-cards" *ngIf="overview()">
        <div class="stat-card revenue">
          <span class="stat-icon">💰</span>
          <div class="stat-info">
            <span class="stat-value">{{ formatPrice(overview()!.total_revenue) }}</span>
            <span class="stat-label">總收入</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📅</span>
          <div class="stat-info">
            <span class="stat-value">{{ formatPrice(overview()!.monthly_revenue) }}</span>
            <span class="stat-label">本月收入</span>
          </div>
        </div>
        <div class="stat-card warning" *ngIf="overview()!.pending_bills?.count > 0">
          <span class="stat-icon">⏳</span>
          <div class="stat-info">
            <span class="stat-value">{{ overview()!.pending_bills.count }}</span>
            <span class="stat-label">待支付賬單</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📦</span>
          <div class="stat-info">
            <span class="stat-value">{{ overview()!.active_packs }}</span>
            <span class="stat-label">活躍配額包</span>
          </div>
        </div>
        <div class="stat-card refund">
          <span class="stat-icon">↩️</span>
          <div class="stat-info">
            <span class="stat-value">{{ formatPrice(overview()!.refunds?.total || 0) }}</span>
            <span class="stat-label">退款總額</span>
          </div>
        </div>
      </div>
      
      <!-- 收入分佈圖 -->
      <section class="revenue-chart" *ngIf="overview()?.revenue_by_type">
        <h3>收入來源分佈</h3>
        <div class="chart-bars">
          <div class="chart-bar" *ngFor="let item of revenueByType()">
            <div class="bar-label">{{ item.label }}</div>
            <div class="bar-track">
              <div class="bar-fill" [style.width.%]="item.percent" [style.background]="item.color"></div>
            </div>
            <div class="bar-value">{{ formatPrice(item.value) }} ({{ item.percent | number:'1.1-1' }}%)</div>
          </div>
        </div>
      </section>
      
      <div class="content-grid">
        <!-- 賬單列表 -->
        <section class="bills-section">
          <div class="section-header">
            <h3>賬單列表</h3>
            <div class="filters">
              <select [(ngModel)]="billFilter.status" (change)="loadBills()">
                <option value="">全部狀態</option>
                <option value="pending">待支付</option>
                <option value="paid">已支付</option>
                <option value="refunded">已退款</option>
              </select>
              <select [(ngModel)]="billFilter.type" (change)="loadBills()">
                <option value="">全部類型</option>
                <option value="subscription">訂閱</option>
                <option value="overage">超額</option>
                <option value="quota_pack">配額包</option>
              </select>
            </div>
          </div>
          
          <div class="bills-table" *ngIf="bills().length > 0; else noBills">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用戶</th>
                  <th>類型</th>
                  <th>金額</th>
                  <th>狀態</th>
                  <th>創建時間</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let bill of bills()">
                  <td class="bill-id">{{ bill.id.slice(0, 12) }}...</td>
                  <td>{{ bill.user_email || bill.user_id.slice(0, 8) }}</td>
                  <td>
                    <span class="type-badge" [class]="bill.billing_type">
                      {{ getTypeLabel(bill.billing_type) }}
                    </span>
                  </td>
                  <td [class.refund]="bill.amount < 0">
                    {{ formatPrice(bill.amount) }}
                  </td>
                  <td>
                    <span class="status-badge" [class]="bill.status">
                      {{ getStatusLabel(bill.status) }}
                    </span>
                  </td>
                  <td>{{ formatDate(bill.created_at) }}</td>
                  <td>
                    <button 
                      class="action-btn" 
                      *ngIf="bill.status === 'paid' && bill.billing_type !== 'refund'"
                      (click)="openRefundDialog(bill)">
                      退款
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <!-- 分頁 -->
            <div class="pagination">
              <button [disabled]="billPage === 1" (click)="billPage = billPage - 1; loadBills()">上一頁</button>
              <span>第 {{ billPage }} 頁 / 共 {{ totalBillPages() }} 頁</span>
              <button [disabled]="billPage >= totalBillPages()" (click)="billPage = billPage + 1; loadBills()">下一頁</button>
            </div>
          </div>
          <ng-template #noBills>
            <div class="empty-state">暫無賬單</div>
          </ng-template>
        </section>
        
        <!-- 凍結用戶 -->
        <section class="frozen-section">
          <h3>配額凍結用戶</h3>
          <div class="frozen-list" *ngIf="frozenUsers().length > 0; else noFrozen">
            <div class="frozen-card" *ngFor="let user of frozenUsers()">
              <div class="user-info">
                <span class="user-email">{{ user.user_email || user.user_id.slice(0, 12) }}</span>
                <span class="freeze-type">{{ user.freeze_type }}</span>
              </div>
              <div class="freeze-reason">{{ user.reason }}</div>
              <div class="freeze-time">
                凍結於 {{ formatDate(user.frozen_at) }}
                <br>
                解凍於 {{ formatDate(user.unfreeze_at) }}
              </div>
              <button class="unfreeze-btn" (click)="unfreezeUser(user.user_id)">
                解凍
              </button>
            </div>
          </div>
          <ng-template #noFrozen>
            <div class="empty-state">無凍結用戶</div>
          </ng-template>
          
          <!-- 手動凍結 -->
          <div class="freeze-form">
            <h4>手動凍結用戶</h4>
            <input type="text" [(ngModel)]="freezeForm.userId" placeholder="用戶 ID">
            <input type="text" [(ngModel)]="freezeForm.reason" placeholder="凍結原因">
            <input type="number" [(ngModel)]="freezeForm.hours" placeholder="時長（小時）">
            <button (click)="freezeUser()">凍結</button>
          </div>
        </section>
      </div>
      
      <!-- 退款對話框 -->
      <div class="dialog-overlay" *ngIf="showRefundDialog()" (click)="showRefundDialog.set(false)">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>處理退款</h3>
          <div class="refund-info" *ngIf="selectedBill()">
            <p>原賬單：{{ selectedBill()!.description }}</p>
            <p>原金額：{{ formatPrice(selectedBill()!.amount) }}</p>
          </div>
          <div class="form-group">
            <label>退款金額（分）</label>
            <input type="number" [(ngModel)]="refundAmount" [max]="selectedBill()?.amount">
          </div>
          <div class="form-group">
            <label>退款原因</label>
            <textarea [(ngModel)]="refundReason" rows="3"></textarea>
          </div>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showRefundDialog.set(false)">取消</button>
            <button class="btn-confirm" (click)="confirmRefund()">確認退款</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .billing-management {
      padding: 24px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 24px;
    }
    
    .refresh-btn {
      padding: 8px 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
    }
    
    /* 統計卡片 */
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .stat-card.revenue {
      border-color: #22c55e;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), transparent);
    }
    
    .stat-card.warning {
      border-color: #f59e0b;
    }
    
    .stat-card.refund {
      border-color: #ef4444;
    }
    
    .stat-icon {
      font-size: 28px;
    }
    
    .stat-value {
      display: block;
      font-size: 20px;
      font-weight: 700;
    }
    
    .stat-label {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    /* 收入分佈 */
    .revenue-chart {
      margin-bottom: 24px;
      padding: 20px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .revenue-chart h3 {
      margin: 0 0 16px;
      font-size: 16px;
    }
    
    .chart-bars {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .chart-bar {
      display: grid;
      grid-template-columns: 80px 1fr 120px;
      align-items: center;
      gap: 12px;
    }
    
    .bar-label {
      font-size: 13px;
    }
    
    .bar-track {
      height: 20px;
      background: var(--bg-tertiary, #2a2a2a);
      border-radius: 10px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s;
    }
    
    .bar-value {
      font-size: 12px;
      color: var(--text-secondary, #888);
      text-align: right;
    }
    
    /* 內容網格 */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 16px;
    }
    
    .filters {
      display: flex;
      gap: 8px;
    }
    
    .filters select {
      padding: 6px 12px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 12px;
    }
    
    /* 賬單表格 */
    .bills-section {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      padding: 20px;
    }
    
    .bills-table {
      overflow-x: auto;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #333);
      font-size: 13px;
    }
    
    th {
      color: var(--text-secondary, #888);
      font-weight: 500;
    }
    
    .bill-id {
      font-family: monospace;
      font-size: 11px;
    }
    
    .type-badge, .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .type-badge.subscription { background: #3b82f6; color: white; }
    .type-badge.overage { background: #f59e0b; color: black; }
    .type-badge.quota_pack { background: #22c55e; color: white; }
    .type-badge.refund { background: #ef4444; color: white; }
    
    .status-badge.pending { background: #f59e0b; color: black; }
    .status-badge.paid { background: #22c55e; color: white; }
    .status-badge.refunded { background: #8b5cf6; color: white; }
    .status-badge.failed { background: #ef4444; color: white; }
    
    td.refund {
      color: #22c55e;
    }
    
    .action-btn {
      padding: 4px 10px;
      background: #8b5cf6;
      border: none;
      border-radius: 4px;
      color: white;
      font-size: 11px;
      cursor: pointer;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 16px;
      font-size: 13px;
    }
    
    .pagination button {
      padding: 6px 12px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      cursor: pointer;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    /* 凍結用戶 */
    .frozen-section {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      padding: 20px;
    }
    
    .frozen-section h3 {
      margin: 0 0 16px;
      font-size: 16px;
    }
    
    .frozen-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .frozen-card {
      padding: 12px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid #ef4444;
      border-radius: 8px;
    }
    
    .user-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .user-email {
      font-weight: 600;
    }
    
    .freeze-type {
      font-size: 11px;
      padding: 2px 6px;
      background: #ef4444;
      border-radius: 4px;
      color: white;
    }
    
    .freeze-reason {
      font-size: 12px;
      color: var(--text-secondary, #888);
      margin-bottom: 8px;
    }
    
    .freeze-time {
      font-size: 11px;
      color: var(--text-muted, #666);
      margin-bottom: 8px;
    }
    
    .unfreeze-btn {
      width: 100%;
      padding: 8px;
      background: #22c55e;
      border: none;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    
    .freeze-form {
      padding-top: 16px;
      border-top: 1px solid var(--border-color, #333);
    }
    
    .freeze-form h4 {
      margin: 0 0 12px;
      font-size: 14px;
    }
    
    .freeze-form input {
      width: 100%;
      padding: 8px 12px;
      margin-bottom: 8px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 13px;
    }
    
    .freeze-form button {
      width: 100%;
      padding: 10px;
      background: #ef4444;
      border: none;
      border-radius: 6px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--text-muted, #666);
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
      margin: 0 0 16px;
    }
    
    .refund-info {
      margin-bottom: 16px;
      padding: 12px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 8px;
    }
    
    .refund-info p {
      margin: 4px 0;
      font-size: 13px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    .form-group input,
    .form-group textarea {
      width: 100%;
      padding: 10px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
    }
    
    .dialog-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .btn-confirm {
      background: #8b5cf6;
      border: none;
      color: white;
    }
  `]
})
export class BillingManagementComponent implements OnInit {
  private admin = inject(AdminService);
  
  // 狀態
  overview = signal<any>(null);
  bills = signal<any[]>([]);
  frozenUsers = signal<any[]>([]);
  totalBills = signal(0);
  billPage = 1;
  billFilter = { status: '', type: '' };
  
  showRefundDialog = signal(false);
  selectedBill = signal<any>(null);
  refundAmount = 0;
  refundReason = '';
  
  freezeForm = {
    userId: '',
    reason: '',
    hours: 24
  };
  
  // 類型標籤
  private typeLabels: Record<string, string> = {
    subscription: '訂閱',
    overage: '超額',
    quota_pack: '配額包',
    refund: '退款'
  };
  
  private statusLabels: Record<string, string> = {
    pending: '待支付',
    paid: '已支付',
    failed: '失敗',
    cancelled: '取消',
    refunded: '已退款'
  };
  
  private typeColors: Record<string, string> = {
    subscription: '#3b82f6',
    overage: '#f59e0b',
    quota_pack: '#22c55e',
    refund: '#ef4444'
  };

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    await Promise.all([
      this.loadOverview(),
      this.loadBills(),
      this.loadFrozenUsers()
    ]);
  }

  async loadOverview() {
    const res = await this.admin.getBillingOverview();
    if (res.success) {
      this.overview.set(res.data);
    }
  }

  async loadBills() {
    const res = await this.admin.getAllBills(
      this.billPage, 20,
      this.billFilter.status || undefined,
      this.billFilter.type || undefined
    );
    if (res.success) {
      this.bills.set(res.data.bills);
      this.totalBills.set(res.data.total);
    }
  }

  async loadFrozenUsers() {
    const res = await this.admin.getFrozenUsers();
    if (res.success) {
      this.frozenUsers.set(res.data);
    }
  }

  totalBillPages = computed(() => Math.ceil(this.totalBills() / 20) || 1);
  
  revenueByType = computed(() => {
    const data = this.overview()?.revenue_by_type || {};
    const total = Object.values(data).reduce((sum: number, val: any) => sum + (val || 0), 0) as number;
    
    return Object.entries(data).map(([type, value]) => ({
      type,
      label: this.typeLabels[type] || type,
      value: value as number,
      percent: total > 0 ? ((value as number) / total) * 100 : 0,
      color: this.typeColors[type] || '#666'
    }));
  });

  formatPrice(cents: number): string {
    if (cents === undefined || cents === null) return '¥0.00';
    return `¥${(cents / 100).toFixed(2)}`;
  }

  formatDate(iso: string): string {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  getTypeLabel(type: string): string {
    return this.typeLabels[type] || type;
  }

  getStatusLabel(status: string): string {
    return this.statusLabels[status] || status;
  }

  openRefundDialog(bill: any) {
    this.selectedBill.set(bill);
    this.refundAmount = bill.amount;
    this.refundReason = '';
    this.showRefundDialog.set(true);
  }

  async confirmRefund() {
    const bill = this.selectedBill();
    if (!bill) return;
    
    const res = await this.admin.processRefund(bill.id, this.refundAmount, this.refundReason);
    if (res.success) {
      this.showRefundDialog.set(false);
      await this.refresh();
    } else {
      alert(res.error || '退款失敗');
    }
  }

  async freezeUser() {
    if (!this.freezeForm.userId) {
      alert('請輸入用戶 ID');
      return;
    }
    
    const res = await this.admin.freezeUserQuota(
      this.freezeForm.userId,
      this.freezeForm.reason || '管理員操作',
      this.freezeForm.hours
    );
    
    if (res.success) {
      this.freezeForm = { userId: '', reason: '', hours: 24 };
      await this.loadFrozenUsers();
    } else {
      alert(res.error || '凍結失敗');
    }
  }

  async unfreezeUser(userId: string) {
    const res = await this.admin.unfreezeUserQuota(userId);
    if (res.success) {
      await this.loadFrozenUsers();
    } else {
      alert(res.error || '解凍失敗');
    }
  }
}
