/**
 * 充值訂單歷史頁面
 * Recharge Orders History View
 * 
 * 顯示用戶的充值訂單列表，支持：
 * - 按狀態篩選
 * - 待支付訂單繼續支付
 * - 訂單詳情查看
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService, RechargeOrder } from '../services/wallet.service';

@Component({
  selector: 'app-wallet-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="orders-view">
      <!-- 頭部 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">←</button>
          <h1>充值訂單</h1>
        </div>
      </div>

      <!-- 篩選器 -->
      <div class="filters">
        <button 
          *ngFor="let tab of statusTabs"
          class="filter-tab"
          [class.active]="currentStatus() === tab.value"
          (click)="filterByStatus(tab.value)"
        >
          {{ tab.label }}
          <span class="count" *ngIf="tab.count > 0">{{ tab.count }}</span>
        </button>
      </div>

      <!-- 訂單列表 -->
      <div class="orders-list" *ngIf="!loading()">
        <div 
          class="order-item" 
          *ngFor="let order of orders()"
          (click)="viewOrder(order)"
        >
          <div class="order-main">
            <div class="order-info">
              <div class="order-no">{{ order.order_no }}</div>
              <div class="order-time">{{ formatDate(order.created_at) }}</div>
            </div>
            <div class="order-amount">
              <div class="amount">{{ formatAmount(order.amount) }}</div>
              <div class="bonus" *ngIf="order.bonus_amount > 0">
                +{{ formatAmount(order.bonus_amount) }}
              </div>
            </div>
          </div>
          
          <div class="order-footer">
            <div class="payment-method">
              <span class="method-icon">{{ getMethodIcon(order.payment_method) }}</span>
              <span>{{ getMethodName(order.payment_method) }}</span>
            </div>
            <div class="order-status" [style.color]="getStatusColor(order.status)">
              {{ getStatusName(order.status) }}
            </div>
          </div>

          <!-- 待支付訂單操作 -->
          <div class="order-actions" *ngIf="order.status === 'pending'" (click)="$event.stopPropagation()">
            <button class="cancel-btn" (click)="cancelOrder(order)">取消</button>
            <button class="pay-btn" (click)="continuePayment(order)">繼續支付</button>
          </div>
        </div>

        <!-- 空狀態 -->
        <div class="empty-state" *ngIf="orders().length === 0">
          <div class="empty-icon">📋</div>
          <div class="empty-text">暫無訂單記錄</div>
          <button class="recharge-btn" (click)="goToRecharge()">立即充值</button>
        </div>
      </div>

      <!-- 加載狀態 -->
      <div class="loading-state" *ngIf="loading()">
        <div class="spinner"></div>
        <span>加載中...</span>
      </div>

      <!-- 分頁 -->
      <div class="pagination" *ngIf="totalPages() > 1">
        <button 
          class="page-btn" 
          [disabled]="currentPage() <= 1"
          (click)="goToPage(currentPage() - 1)"
        >上一頁</button>
        <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
        <button 
          class="page-btn" 
          [disabled]="currentPage() >= totalPages()"
          (click)="goToPage(currentPage() + 1)"
        >下一頁</button>
      </div>

      <!-- 訂單詳情彈窗 -->
      <div class="modal-overlay" *ngIf="selectedOrder()" (click)="closeOrderDetail()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>訂單詳情</h3>
            <button class="close-btn" (click)="closeOrderDetail()">×</button>
          </div>
          <div class="modal-body">
            <div class="detail-row">
              <span class="label">訂單號</span>
              <span class="value mono">{{ selectedOrder()?.order_no }}</span>
            </div>
            <div class="detail-row">
              <span class="label">狀態</span>
              <span class="value" [style.color]="getStatusColor(selectedOrder()?.status || '')">
                {{ getStatusName(selectedOrder()?.status || '') }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">充值金額</span>
              <span class="value">{{ formatAmount(selectedOrder()?.amount || 0) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.bonus_amount">
              <span class="label">贈送金額</span>
              <span class="value bonus">+{{ formatAmount(selectedOrder()?.bonus_amount || 0) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.fee">
              <span class="label">手續費</span>
              <span class="value">{{ formatAmount(selectedOrder()?.fee || 0) }}</span>
            </div>
            <div class="detail-row highlight">
              <span class="label">實際到賬</span>
              <span class="value">{{ formatAmount(selectedOrder()?.actual_amount || 0) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">支付方式</span>
              <span class="value">{{ getMethodName(selectedOrder()?.payment_method || '') }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.usdt_amount">
              <span class="label">USDT 金額</span>
              <span class="value">{{ selectedOrder()?.usdt_amount }} USDT</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.usdt_tx_hash">
              <span class="label">交易哈希</span>
              <span class="value mono small">{{ selectedOrder()?.usdt_tx_hash }}</span>
            </div>
            <div class="detail-row">
              <span class="label">創建時間</span>
              <span class="value">{{ formatDate(selectedOrder()?.created_at || '') }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.confirmed_at">
              <span class="label">到賬時間</span>
              <span class="value">{{ formatDate(selectedOrder()?.confirmed_at || '') }}</span>
            </div>
          </div>
          <div class="modal-footer" *ngIf="selectedOrder()?.status === 'pending'">
            <button class="secondary-btn" (click)="cancelOrder(selectedOrder()!)">取消訂單</button>
            <button class="primary-btn" (click)="continuePayment(selectedOrder()!)">繼續支付</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .orders-view {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
      color: #fff;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    /* 篩選器 */
    .filters {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      overflow-x: auto;
      padding-bottom: 8px;
    }

    .filter-tab {
      flex-shrink: 0;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-tab:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .filter-tab.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-color: transparent;
      color: #fff;
    }

    .filter-tab .count {
      display: inline-block;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      font-size: 11px;
      margin-left: 6px;
    }

    /* 訂單列表 */
    .orders-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-item {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .order-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .order-main {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .order-no {
      font-size: 14px;
      font-weight: 500;
      font-family: monospace;
    }

    .order-time {
      font-size: 12px;
      opacity: 0.6;
      margin-top: 4px;
    }

    .order-amount {
      text-align: right;
    }

    .order-amount .amount {
      font-size: 18px;
      font-weight: 600;
      color: #667eea;
    }

    .order-amount .bonus {
      font-size: 12px;
      color: #f59e0b;
    }

    .order-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      opacity: 0.7;
    }

    .method-icon {
      font-size: 16px;
    }

    .order-status {
      font-size: 13px;
      font-weight: 500;
    }

    .order-actions {
      display: flex;
      gap: 12px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
    }

    .cancel-btn {
      flex: 1;
      padding: 10px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .pay-btn {
      flex: 2;
      padding: 10px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }

    /* 空狀態 */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .empty-text {
      font-size: 16px;
      opacity: 0.6;
      margin-bottom: 24px;
    }

    .recharge-btn {
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      cursor: pointer;
    }

    /* 加載狀態 */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      gap: 12px;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* 分頁 */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding: 16px;
    }

    .page-btn {
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 14px;
      opacity: 0.7;
    }

    /* 彈窗 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: 20px;
    }

    .modal {
      background: #1a1a2e;
      border-radius: 20px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    .modal-body {
      padding: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .detail-row .label {
      opacity: 0.6;
      font-size: 14px;
    }

    .detail-row .value {
      font-size: 14px;
      text-align: right;
    }

    .detail-row .value.mono {
      font-family: monospace;
    }

    .detail-row .value.small {
      font-size: 11px;
      word-break: break-all;
      max-width: 200px;
    }

    .detail-row .value.bonus {
      color: #f59e0b;
    }

    .detail-row.highlight {
      background: rgba(102, 126, 234, 0.1);
      margin: 0 -20px;
      padding: 12px 20px;
      border-radius: 8px;
    }

    .detail-row.highlight .value {
      font-weight: 600;
      color: #667eea;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .secondary-btn {
      flex: 1;
      padding: 14px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      cursor: pointer;
    }

    .primary-btn {
      flex: 2;
      padding: 14px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
    }
  `]
})
export class WalletOrdersComponent implements OnInit {
  orders = signal<RechargeOrder[]>([]);
  loading = signal(true);
  currentPage = signal(1);
  totalPages = signal(1);
  currentStatus = signal<string>('');
  selectedOrder = signal<RechargeOrder | null>(null);

  statusTabs = [
    { label: '全部', value: '', count: 0 },
    { label: '待支付', value: 'pending', count: 0 },
    { label: '已支付', value: 'paid', count: 0 },
    { label: '已到賬', value: 'confirmed', count: 0 },
    { label: '已過期', value: 'expired', count: 0 }
  ];

  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.loading.set(true);
    
    try {
      const result = await this.walletService.getRechargeOrders({
        page: this.currentPage(),
        pageSize: 20,
        status: this.currentStatus() || undefined
      });
      
      if (result) {
        this.orders.set(result.orders);
        this.totalPages.set(result.pagination.total_pages);
        
        // 更新待支付數量
        const pendingCount = result.orders.filter(o => o.status === 'pending').length;
        this.statusTabs[1].count = pendingCount;
      }
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  filterByStatus(status: string) {
    this.currentStatus.set(status);
    this.currentPage.set(1);
    this.loadOrders();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.loadOrders();
  }

  viewOrder(order: RechargeOrder) {
    this.selectedOrder.set(order);
  }

  closeOrderDetail() {
    this.selectedOrder.set(null);
  }

  async continuePayment(order: RechargeOrder) {
    // 跳轉到支付頁面，攜帶訂單信息
    this.router.navigate(['/wallet/recharge'], {
      queryParams: { orderNo: order.order_no }
    });
  }

  async cancelOrder(order: RechargeOrder) {
    if (!confirm('確定要取消此訂單嗎？')) return;
    
    const result = await this.walletService.cancelRechargeOrder(order.order_no);
    
    if (result.success) {
      await this.loadOrders();
      this.closeOrderDetail();
    } else {
      alert(result.error || '取消失敗');
    }
  }

  formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      'usdt_trc20': '💎',
      'usdt_erc20': '💎',
      'alipay': '💙',
      'wechat': '💚',
      'bank': '🏦'
    };
    return icons[method] || '💳';
  }

  getMethodName(method: string): string {
    const names: Record<string, string> = {
      'usdt_trc20': 'USDT (TRC20)',
      'usdt_erc20': 'USDT (ERC20)',
      'alipay': '支付寶',
      'wechat': '微信支付',
      'bank': '銀行卡'
    };
    return names[method] || method;
  }

  getStatusName(status: string): string {
    const names: Record<string, string> = {
      'pending': '待支付',
      'paid': '已支付',
      'confirmed': '已到賬',
      'failed': '失敗',
      'expired': '已過期',
      'refunded': '已退款'
    };
    return names[status] || status;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': '#f59e0b',
      'paid': '#3b82f6',
      'confirmed': '#22c55e',
      'failed': '#ef4444',
      'expired': '#9ca3af',
      'refunded': '#8b5cf6'
    };
    return colors[status] || '#666';
  }

  goBack() {
    this.router.navigate(['/wallet']);
  }

  goToRecharge() {
    this.router.navigate(['/wallet/recharge']);
  }
}
