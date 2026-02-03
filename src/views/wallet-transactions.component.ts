/**
 * 交易記錄組件
 * Wallet Transactions Component
 * 
 * 顯示完整的交易記錄列表，支持篩選、分頁、導出
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  WalletService, 
  Transaction, 
  TransactionResult 
} from '../services/wallet.service';

@Component({
  selector: 'app-wallet-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="transactions-view">
      <!-- 頂部導航 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">←</span>
          </button>
          <h1>📜 交易記錄</h1>
        </div>
        <div class="header-actions">
          <button class="export-btn" (click)="exportData()">
            📥 導出
          </button>
        </div>
      </div>

      <!-- 篩選器 -->
      <div class="filters">
        <div class="filter-group">
          <label>類型</label>
          <select [(ngModel)]="filters.type" (change)="loadData()">
            <option value="">全部</option>
            <option value="recharge">充值</option>
            <option value="consume">消費</option>
            <option value="refund">退款</option>
            <option value="withdraw">提現</option>
            <option value="bonus">贈送</option>
          </select>
        </div>
        <div class="filter-group">
          <label>狀態</label>
          <select [(ngModel)]="filters.status" (change)="loadData()">
            <option value="">全部</option>
            <option value="success">成功</option>
            <option value="pending">處理中</option>
            <option value="failed">失敗</option>
            <option value="refunded">已退款</option>
          </select>
        </div>
        <div class="filter-group">
          <label>時間範圍</label>
          <select [(ngModel)]="filters.range" (change)="onRangeChange()">
            <option value="7">最近7天</option>
            <option value="30">最近30天</option>
            <option value="90">最近90天</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      <!-- 統計摘要 -->
      <div class="summary" *ngIf="result()">
        <div class="summary-item income">
          <span class="label">收入</span>
          <span class="value">{{ result()?.summary?.total_in_display || '$0.00' }}</span>
        </div>
        <div class="summary-item expense">
          <span class="label">支出</span>
          <span class="value">{{ result()?.summary?.total_out_display || '$0.00' }}</span>
        </div>
        <div class="summary-item count">
          <span class="label">共</span>
          <span class="value">{{ result()?.pagination?.total || 0 }} 筆</span>
        </div>
      </div>

      <!-- 交易列表 -->
      <div class="transaction-list">
        @for (tx of transactions(); track tx.id) {
          <div class="transaction-item" [class.income]="tx.amount > 0" [class.expense]="tx.amount < 0">
            <div class="tx-left">
              <div class="tx-icon">{{ getTypeIcon(tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || getTypeName(tx.type) }}</div>
                <div class="tx-meta">
                  <span class="tx-order">{{ tx.order_id }}</span>
                  <span class="tx-time">{{ formatDate(tx.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                {{ tx.amount_display }}
              </div>
              <div class="tx-status" [style.color]="getStatusColor(tx.status)">
                {{ getStatusName(tx.status) }}
              </div>
            </div>
          </div>
        }
        @if (transactions().length === 0 && !loading()) {
          <div class="empty-state">
            <span class="icon">📭</span>
            <span class="text">暫無交易記錄</span>
          </div>
        }
      </div>

      <!-- 分頁 -->
      <div class="pagination" *ngIf="result()?.pagination?.total_pages > 1">
        <button 
          class="page-btn" 
          [disabled]="!result()?.pagination?.has_prev"
          (click)="goToPage(currentPage() - 1)"
        >
          ← 上一頁
        </button>
        <span class="page-info">
          第 {{ currentPage() }} / {{ result()?.pagination?.total_pages }} 頁
        </span>
        <button 
          class="page-btn" 
          [disabled]="!result()?.pagination?.has_next"
          (click)="goToPage(currentPage() + 1)"
        >
          下一頁 →
        </button>
      </div>

      <!-- 加載遮罩 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>加載中...</span>
      </div>
    </div>
  `,
  styles: [`
    .transactions-view {
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
      transition: all 0.2s;
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .export-btn {
      padding: 10px 20px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .export-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* 篩選器 */
    .filters {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .filter-group label {
      font-size: 12px;
      opacity: 0.7;
    }

    .filter-group select {
      padding: 8px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 14px;
      min-width: 120px;
    }

    .filter-group select option {
      background: #1a1a2e;
    }

    /* 統計摘要 */
    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }

    .summary-item {
      flex: 1;
      padding: 16px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      text-align: center;
    }

    .summary-item .label {
      display: block;
      font-size: 12px;
      opacity: 0.7;
      margin-bottom: 4px;
    }

    .summary-item .value {
      font-size: 18px;
      font-weight: 600;
    }

    .summary-item.income .value {
      color: #22c55e;
    }

    .summary-item.expense .value {
      color: #ef4444;
    }

    /* 交易列表 */
    .transaction-list {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      overflow: hidden;
    }

    .transaction-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    .tx-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .tx-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .tx-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .tx-desc {
      font-size: 14px;
      font-weight: 500;
    }

    .tx-meta {
      display: flex;
      gap: 12px;
      font-size: 12px;
      opacity: 0.5;
    }

    .tx-right {
      text-align: right;
    }

    .tx-amount {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .tx-amount.positive {
      color: #22c55e;
    }

    .tx-amount.negative {
      color: #ef4444;
    }

    .tx-status {
      font-size: 12px;
    }

    /* 分頁 */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 20px;
    }

    .page-btn {
      padding: 10px 20px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .page-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-btn:not(:disabled):hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .page-info {
      font-size: 14px;
      opacity: 0.7;
    }

    /* 空狀態 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
      opacity: 0.5;
    }

    .empty-state .icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    /* 加載遮罩 */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 100;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class WalletTransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  result = signal<TransactionResult | null>(null);
  currentPage = signal(1);
  loading = signal(false);
  
  filters = {
    type: '',
    status: '',
    range: '30'
  };
  
  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadData();
  }
  
  async loadData() {
    this.loading.set(true);
    
    try {
      const { startDate, endDate } = this.getDateRange();
      
      const result = await this.walletService.loadTransactions({
        page: this.currentPage(),
        pageSize: 20,
        type: this.filters.type || undefined,
        status: this.filters.status || undefined,
        startDate,
        endDate
      });
      
      if (result) {
        this.result.set(result);
        this.transactions.set(result.transactions);
      }
      
    } catch (error) {
      console.error('Load transactions error:', error);
    } finally {
      this.loading.set(false);
    }
  }
  
  getDateRange(): { startDate?: string; endDate?: string } {
    if (this.filters.range === 'all') {
      return {};
    }
    
    const days = parseInt(this.filters.range);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
  
  onRangeChange() {
    this.currentPage.set(1);
    this.loadData();
  }
  
  goToPage(page: number) {
    if (page < 1) return;
    const totalPages = this.result()?.pagination?.total_pages || 1;
    if (page > totalPages) return;
    
    this.currentPage.set(page);
    this.loadData();
  }
  
  goBack() {
    this.router.navigate(['/wallet']);
  }
  
  exportData() {
    const { startDate, endDate } = this.getDateRange();
    this.walletService.exportTransactions(startDate, endDate);
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getTypeIcon(type: string): string {
    return this.walletService.getTypeIcon(type);
  }
  
  getTypeName(type: string): string {
    return this.walletService.getTypeName(type);
  }
  
  getStatusName(status: string): string {
    const names: Record<string, string> = {
      pending: '處理中',
      success: '成功',
      failed: '失敗',
      cancelled: '已取消',
      refunded: '已退款'
    };
    return names[status] || status;
  }
  
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#f59e0b',
      success: '#22c55e',
      failed: '#ef4444',
      cancelled: '#6b7280',
      refunded: '#8b5cf6'
    };
    return colors[status] || '#999';
  }
}
