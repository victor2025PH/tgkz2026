/**
 * 錢包視圖組件
 * Wallet View Component
 * 
 * 用戶錢包主頁面，包含：
 * - 餘額概覽
 * - 交易記錄
 * - 消費分析
 * - 充值入口
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  WalletService, 
  Wallet, 
  Transaction, 
  ConsumeAnalysis,
  MonthlySummary 
} from '../services/wallet.service';

@Component({
  selector: 'app-wallet-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wallet-view">
      <!-- 頂部導航 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">←</span>
          </button>
          <h1>💰 我的錢包</h1>
        </div>
        <div class="header-actions">
          <button class="action-btn" (click)="showTransactions()">
            📜 交易記錄
          </button>
        </div>
      </div>

      <!-- 餘額卡片 -->
      <div class="balance-card">
        <div class="balance-bg"></div>
        <div class="balance-content">
          <div class="balance-label">可用餘額</div>
          <div class="balance-amount">
            <span class="currency">$</span>
            <span class="amount">{{ balanceDisplay() }}</span>
          </div>
          <div class="balance-details">
            <div class="detail-item">
              <span class="label">凍結中</span>
              <span class="value">{{ formatCents(wallet()?.frozen_balance || 0) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">贈送餘額</span>
              <span class="value">{{ wallet()?.bonus_display || '$0.00' }}</span>
            </div>
          </div>
          <div class="balance-actions">
            <button class="recharge-btn" (click)="goToRecharge()">
              💳 充值
            </button>
            <button class="withdraw-btn" (click)="goToWithdraw()">
              📤 提現
            </button>
            <button class="redeem-btn" (click)="showRedeemCode()">
              🎁 兌換碼
            </button>
          </div>
        </div>
      </div>

      <!-- 本月消費概覽 -->
      <div class="section consume-overview" *ngIf="analysis()">
        <div class="section-header">
          <h2>📊 本月消費概覽</h2>
          <span class="total">{{ analysis()?.total_display }}</span>
        </div>
        <div class="consume-bars">
          @for (item of analysis()?.by_category || []; track item.category) {
            <div class="consume-bar">
              <div class="bar-label">
                <span class="icon">{{ getCategoryIcon(item.category) }}</span>
                <span class="name">{{ item.category_name }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="item.percent"></div>
              </div>
              <div class="bar-value">
                <span class="amount">{{ item.amount_display }}</span>
                <span class="percent">{{ item.percent }}%</span>
              </div>
            </div>
          }
          @if ((analysis()?.by_category || []).length === 0) {
            <div class="empty-state">
              <span class="icon">📭</span>
              <span class="text">本月暫無消費</span>
            </div>
          }
        </div>
      </div>

      <!-- 最近交易 -->
      <div class="section recent-transactions">
        <div class="section-header">
          <h2>🕐 最近交易</h2>
          <button class="view-all-btn" (click)="showTransactions()">
            查看全部 →
          </button>
        </div>
        <div class="transaction-list">
          @for (tx of recentTransactions(); track tx.id) {
            <div class="transaction-item" [class.income]="tx.amount > 0" [class.expense]="tx.amount < 0">
              <div class="tx-icon">{{ getTypeIcon(tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || getTypeName(tx.type) }}</div>
                <div class="tx-time">{{ formatDate(tx.created_at) }}</div>
              </div>
              <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                {{ tx.amount_display }}
              </div>
            </div>
          }
          @if (recentTransactions().length === 0) {
            <div class="empty-state">
              <span class="icon">📭</span>
              <span class="text">暫無交易記錄</span>
            </div>
          }
        </div>
      </div>

      <!-- 月度統計 -->
      <div class="section monthly-stats" *ngIf="monthlySummary().length > 0">
        <div class="section-header">
          <h2>📅 月度統計</h2>
        </div>
        <div class="monthly-chart">
          @for (month of monthlySummary(); track month.month) {
            <div class="month-bar">
              <div class="month-label">{{ formatMonth(month.month) }}</div>
              <div class="bars">
                <div class="income-bar" [style.height.px]="getBarHeight(month.income)">
                  <span class="tooltip">收入: {{ month.income_display }}</span>
                </div>
                <div class="expense-bar" [style.height.px]="getBarHeight(month.expense)">
                  <span class="tooltip">支出: {{ month.expense_display }}</span>
                </div>
              </div>
            </div>
          }
        </div>
        <div class="chart-legend">
          <div class="legend-item income">
            <span class="dot"></span>
            <span class="label">收入</span>
          </div>
          <div class="legend-item expense">
            <span class="dot"></span>
            <span class="label">支出</span>
          </div>
        </div>
      </div>

      <!-- 加載遮罩 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>加載中...</span>
      </div>
    </div>
  `,
  styles: [`
    .wallet-view {
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

    .action-btn {
      padding: 10px 20px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* 餘額卡片 */
    .balance-card {
      position: relative;
      border-radius: 24px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .balance-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .balance-content {
      position: relative;
      padding: 32px;
      z-index: 1;
    }

    .balance-label {
      font-size: 14px;
      opacity: 0.8;
      margin-bottom: 8px;
    }

    .balance-amount {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 24px;
    }

    .balance-amount .currency {
      font-size: 24px;
      font-weight: 600;
    }

    .balance-amount .amount {
      font-size: 48px;
      font-weight: 700;
    }

    .balance-details {
      display: flex;
      gap: 32px;
      margin-bottom: 24px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .detail-item .label {
      font-size: 12px;
      opacity: 0.7;
    }

    .detail-item .value {
      font-size: 16px;
      font-weight: 500;
    }

    .balance-actions {
      display: flex;
      gap: 12px;
    }

    .balance-actions button {
      flex: 1;
      padding: 12px 20px;
      border-radius: 12px;
      border: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .recharge-btn {
      background: #fff;
      color: #764ba2;
    }

    .withdraw-btn {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .redeem-btn {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .balance-actions button:hover {
      transform: translateY(-2px);
    }

    /* 區塊通用樣式 */
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .section-header h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
    }

    .section-header .total {
      font-size: 20px;
      font-weight: 700;
      color: #f59e0b;
    }

    .view-all-btn {
      background: none;
      border: none;
      color: #667eea;
      font-size: 13px;
      cursor: pointer;
    }

    /* 消費概覽 */
    .consume-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .bar-label {
      width: 100px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .bar-track {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.5s ease;
    }

    .bar-value {
      width: 100px;
      text-align: right;
      font-size: 13px;
    }

    .bar-value .amount {
      color: #f59e0b;
      margin-right: 8px;
    }

    .bar-value .percent {
      opacity: 0.6;
    }

    /* 交易列表 */
    .transaction-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .transaction-item:last-child {
      border-bottom: none;
    }

    .tx-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .tx-info {
      flex: 1;
    }

    .tx-desc {
      font-size: 14px;
      margin-bottom: 4px;
    }

    .tx-time {
      font-size: 12px;
      opacity: 0.5;
    }

    .tx-amount {
      font-size: 16px;
      font-weight: 600;
    }

    .tx-amount.positive {
      color: #22c55e;
    }

    .tx-amount.negative {
      color: #ef4444;
    }

    /* 月度統計 */
    .monthly-chart {
      display: flex;
      gap: 12px;
      height: 120px;
      align-items: flex-end;
      padding-bottom: 24px;
    }

    .month-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .month-label {
      font-size: 11px;
      opacity: 0.6;
    }

    .bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 80px;
    }

    .income-bar, .expense-bar {
      width: 12px;
      border-radius: 4px 4px 0 0;
      position: relative;
      min-height: 4px;
    }

    .income-bar {
      background: linear-gradient(180deg, #22c55e, #16a34a);
    }

    .expense-bar {
      background: linear-gradient(180deg, #ef4444, #dc2626);
    }

    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-top: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      opacity: 0.7;
    }

    .legend-item .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .legend-item.income .dot {
      background: #22c55e;
    }

    .legend-item.expense .dot {
      background: #ef4444;
    }

    /* 空狀態 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
      opacity: 0.5;
    }

    .empty-state .icon {
      font-size: 32px;
      margin-bottom: 8px;
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
export class WalletViewComponent implements OnInit {
  wallet = signal<Wallet | null>(null);
  recentTransactions = signal<Transaction[]>([]);
  analysis = signal<ConsumeAnalysis | null>(null);
  monthlySummary = signal<MonthlySummary[]>([]);
  loading = signal(false);
  
  balanceDisplay = computed(() => {
    const w = this.wallet();
    if (!w) return '0.00';
    return (w.available_balance / 100).toFixed(2);
  });
  
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
      const [wallet, transactions, analysis, monthly] = await Promise.all([
        this.walletService.loadWallet(),
        this.walletService.getRecentTransactions(5),
        this.walletService.getConsumeAnalysis(),
        this.walletService.getMonthlySummary(6)
      ]);
      
      if (wallet) this.wallet.set(wallet);
      this.recentTransactions.set(transactions);
      if (analysis) this.analysis.set(analysis);
      this.monthlySummary.set(monthly);
      
    } catch (error) {
      console.error('Load wallet data error:', error);
    } finally {
      this.loading.set(false);
    }
  }
  
  goBack() {
    this.router.navigate(['/']);
  }
  
  goToRecharge() {
    this.router.navigate(['/wallet/recharge']);
  }
  
  goToWithdraw() {
    this.router.navigate(['/wallet/withdraw']);
  }
  
  showRedeemCode() {
    // TODO: 實現兌換碼彈窗
    alert('兌換碼功能即將上線');
  }
  
  showTransactions() {
    this.router.navigate(['/wallet/transactions']);
  }
  
  formatCents(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatMonth(monthStr: string): string {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    return `${month}月`;
  }
  
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      membership: '👑',
      ip_proxy: '🌐',
      quota_pack: '📦',
      other: '📋'
    };
    return icons[category] || '📋';
  }
  
  getTypeIcon(type: string): string {
    return this.walletService.getTypeIcon(type);
  }
  
  getTypeName(type: string): string {
    return this.walletService.getTypeName(type);
  }
  
  getBarHeight(amount: number): number {
    // 基於最大值計算高度
    const maxAmount = Math.max(
      ...this.monthlySummary().flatMap(m => [m.income, m.expense])
    );
    if (maxAmount === 0) return 4;
    return Math.max(4, (amount / maxAmount) * 60);
  }
}
