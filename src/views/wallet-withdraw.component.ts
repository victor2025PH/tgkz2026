/**
 * 提現頁面
 * Wallet Withdraw View
 * 
 * 用戶提現功能：
 * - 提現申請
 * - 提現記錄
 * - 手續費計算
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';
import { ApiService } from '../core/api.service';

interface WithdrawConfig {
  min_amount: number;
  max_amount: number;
  daily_max: number;
  fee_rate: number;
  min_fee: number;
  free_monthly_count: number;
  methods: { id: string; name: string; enabled: boolean }[];
}

interface WithdrawOrder {
  order_no: string;
  amount: number;
  amount_display: string;
  fee: number;
  fee_display: string;
  actual_amount: number;
  actual_display: string;
  method: string;
  address: string;
  status: string;
  tx_hash?: string;
  created_at: string;
  completed_at?: string;
}

@Component({
  selector: 'app-wallet-withdraw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="withdraw-view">
      <!-- 頭部 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">←</button>
          <h1>提現</h1>
        </div>
        <button class="history-btn" (click)="showHistory()">📋 提現記錄</button>
      </div>

      <!-- 可提現餘額 -->
      <div class="balance-card">
        <div class="balance-label">可提現餘額</div>
        <div class="balance-amount">{{ walletService.balanceDisplay() }}</div>
        <div class="balance-note">贈送餘額不可提現</div>
      </div>

      <!-- 提現表單 -->
      <div class="section">
        <h2>提現金額</h2>
        <div class="amount-input">
          <span class="currency">$</span>
          <input 
            type="number" 
            [(ngModel)]="withdrawAmount"
            [min]="(config()?.min_amount || 0) / 100"
            [max]="(config()?.max_amount || 0) / 100"
            placeholder="請輸入提現金額"
            (ngModelChange)="onAmountChange()"
          />
        </div>
        <div class="amount-hints">
          <span>最低 {{ formatAmount(config()?.min_amount || 1000) }}</span>
          <span>|</span>
          <span>單筆上限 {{ formatAmount(config()?.max_amount || 100000) }}</span>
        </div>
        <div class="quick-amounts">
          <button 
            *ngFor="let amt of quickAmounts"
            class="quick-btn"
            [class.active]="withdrawAmount === amt"
            (click)="setAmount(amt)"
          >
            {{ formatAmount(amt * 100) }}
          </button>
          <button 
            class="quick-btn all"
            (click)="setMaxAmount()"
          >
            全部提現
          </button>
        </div>
      </div>

      <!-- 提現方式 -->
      <div class="section">
        <h2>提現方式</h2>
        <div class="methods">
          <div 
            *ngFor="let method of config()?.methods || []"
            class="method-item"
            [class.selected]="selectedMethod === method.id"
            [class.disabled]="!method.enabled"
            (click)="method.enabled && selectMethod(method.id)"
          >
            <span class="method-icon">{{ getMethodIcon(method.id) }}</span>
            <div class="method-info">
              <span class="method-name">{{ method.name }}</span>
              <span class="method-status" *ngIf="!method.enabled">即將上線</span>
            </div>
            <span class="check" *ngIf="selectedMethod === method.id">✓</span>
          </div>
        </div>
      </div>

      <!-- 提現地址 -->
      <div class="section" *ngIf="selectedMethod">
        <h2>{{ getMethodLabel(selectedMethod) }}</h2>
        <input 
          type="text" 
          class="address-input"
          [(ngModel)]="withdrawAddress"
          [placeholder]="getAddressPlaceholder(selectedMethod)"
        />
        <div class="address-hint">請確保地址正確，提現後無法撤回</div>
      </div>

      <!-- 提現明細 -->
      <div class="section summary">
        <h2>提現明細</h2>
        <div class="summary-row">
          <span class="label">提現金額</span>
          <span class="value">{{ formatAmount(withdrawAmountCents()) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">手續費 ({{ (config()?.fee_rate || 0) * 100 }}%)</span>
          <span class="value fee">-{{ formatAmount(feeAmount()) }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">實際到賬</span>
          <span class="value">{{ formatAmount(actualAmount()) }}</span>
        </div>
        <div class="free-note" *ngIf="isFreeWithdraw()">
          🎉 本月免費提現機會，手續費 $0
        </div>
      </div>

      <!-- 提交按鈕 -->
      <div class="action-bar">
        <button 
          class="submit-btn"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          {{ loading() ? '處理中...' : '確認提現' }}
        </button>
      </div>

      <!-- 提現記錄彈窗 -->
      <div class="modal-overlay" *ngIf="showHistoryModal()" (click)="closeHistory()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>提現記錄</h3>
            <button class="close-btn" (click)="closeHistory()">×</button>
          </div>
          <div class="modal-body">
            <div class="order-list">
              <div class="order-item" *ngFor="let order of withdrawOrders()">
                <div class="order-main">
                  <div class="order-info">
                    <div class="order-no">{{ order.order_no }}</div>
                    <div class="order-time">{{ formatDate(order.created_at) }}</div>
                  </div>
                  <div class="order-amount">
                    <div class="amount">{{ order.actual_display }}</div>
                    <div class="status" [style.color]="getStatusColor(order.status)">
                      {{ getStatusName(order.status) }}
                    </div>
                  </div>
                </div>
                <div class="order-detail">
                  <span>{{ order.method }} → {{ maskAddress(order.address) }}</span>
                </div>
              </div>
              <div class="empty" *ngIf="withdrawOrders().length === 0">
                暫無提現記錄
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .withdraw-view {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
      padding-bottom: 100px;
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

    .history-btn {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    /* 餘額卡片 */
    .balance-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      margin-bottom: 24px;
    }

    .balance-label {
      font-size: 14px;
      opacity: 0.8;
    }

    .balance-amount {
      font-size: 36px;
      font-weight: 700;
      margin: 8px 0;
    }

    .balance-note {
      font-size: 12px;
      opacity: 0.6;
    }

    /* 區塊 */
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }

    /* 金額輸入 */
    .amount-input {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0 16px;
    }

    .amount-input .currency {
      font-size: 24px;
      font-weight: 600;
      opacity: 0.6;
    }

    .amount-input input {
      flex: 1;
      padding: 16px 12px;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 24px;
      font-weight: 600;
    }

    .amount-input input::placeholder {
      color: rgba(255, 255, 255, 0.3);
    }

    .amount-hints {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 12px;
      font-size: 12px;
      opacity: 0.6;
    }

    .quick-amounts {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .quick-btn {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .quick-btn.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-color: transparent;
    }

    .quick-btn.all {
      flex: 1;
      min-width: 100px;
    }

    /* 提現方式 */
    .methods {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .method-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .method-item:hover:not(.disabled) {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .method-item.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .method-item.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .method-icon {
      font-size: 24px;
    }

    .method-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .method-name {
      font-size: 15px;
      font-weight: 500;
    }

    .method-status {
      font-size: 12px;
      opacity: 0.6;
    }

    .check {
      color: #667eea;
      font-size: 18px;
    }

    /* 地址輸入 */
    .address-input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-size: 14px;
      font-family: monospace;
    }

    .address-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .address-hint {
      font-size: 12px;
      opacity: 0.5;
      margin-top: 8px;
    }

    /* 提現明細 */
    .summary .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .summary-row .label {
      opacity: 0.7;
    }

    .summary-row .value.fee {
      color: #ef4444;
    }

    .summary-row.total {
      padding-top: 16px;
      font-size: 18px;
      font-weight: 600;
      border-bottom: none;
    }

    .summary-row.total .value {
      color: #22c55e;
    }

    .free-note {
      text-align: center;
      padding: 12px;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 8px;
      color: #22c55e;
      font-size: 13px;
      margin-top: 12px;
    }

    /* 提交按鈕 */
    .action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 20px;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(10px);
    }

    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 12px;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
      max-height: 70vh;
      overflow: hidden;
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
      max-height: 50vh;
      overflow-y: auto;
    }

    .order-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .order-item {
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .order-main {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .order-no {
      font-family: monospace;
      font-size: 13px;
    }

    .order-time {
      font-size: 12px;
      opacity: 0.5;
    }

    .order-amount .amount {
      font-size: 16px;
      font-weight: 600;
      text-align: right;
    }

    .order-amount .status {
      font-size: 12px;
      text-align: right;
    }

    .order-detail {
      font-size: 12px;
      opacity: 0.6;
    }

    .empty {
      text-align: center;
      padding: 40px;
      opacity: 0.5;
    }
  `]
})
export class WalletWithdrawComponent implements OnInit {
  withdrawAmount = 0;
  selectedMethod = 'usdt_trc20';
  withdrawAddress = '';
  
  quickAmounts = [10, 50, 100, 500];
  
  config = signal<WithdrawConfig | null>(null);
  loading = signal(false);
  showHistoryModal = signal(false);
  withdrawOrders = signal<WithdrawOrder[]>([]);
  
  constructor(
    public walletService: WalletService,
    private api: ApiService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadConfig();
    this.walletService.loadWallet();
  }
  
  async loadConfig() {
    try {
      const response = await this.api.get<any>('/api/wallet/withdraw/config');
      if (response?.success && response?.data) {
        this.config.set(response.data);
      }
    } catch (error) {
      console.error('Load withdraw config error:', error);
    }
  }
  
  withdrawAmountCents(): number {
    return (this.withdrawAmount || 0) * 100;
  }
  
  feeAmount = computed(() => {
    const cfg = this.config();
    if (!cfg) return 0;
    
    const amount = this.withdrawAmountCents();
    if (amount <= 0) return 0;
    
    // TODO: 檢查是否還有免費次數
    const fee = Math.round(amount * cfg.fee_rate);
    return Math.max(fee, cfg.min_fee);
  });
  
  actualAmount = computed(() => {
    return this.withdrawAmountCents() - this.feeAmount();
  });
  
  isFreeWithdraw(): boolean {
    // TODO: 從服務器獲取本月免費次數
    return false;
  }
  
  canSubmit(): boolean {
    const cfg = this.config();
    if (!cfg) return false;
    if (this.loading()) return false;
    
    const amount = this.withdrawAmountCents();
    if (amount < cfg.min_amount) return false;
    if (amount > cfg.max_amount) return false;
    if (!this.selectedMethod) return false;
    if (!this.withdrawAddress) return false;
    
    return true;
  }
  
  onAmountChange() {
    // 觸發計算更新
  }
  
  setAmount(amount: number) {
    this.withdrawAmount = amount;
  }
  
  setMaxAmount() {
    const wallet = this.walletService.wallet();
    if (wallet) {
      const cfg = this.config();
      const maxWithdraw = Math.min(wallet.balance, cfg?.max_amount || 100000);
      this.withdrawAmount = maxWithdraw / 100;
    }
  }
  
  selectMethod(method: string) {
    this.selectedMethod = method;
    this.withdrawAddress = '';
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
      'bank': '🏦'
    };
    return icons[method] || '💳';
  }
  
  getMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      'usdt_trc20': 'USDT 收款地址 (TRC20)',
      'usdt_erc20': 'USDT 收款地址 (ERC20)',
      'bank': '銀行卡號'
    };
    return labels[method] || '收款地址';
  }
  
  getAddressPlaceholder(method: string): string {
    const placeholders: Record<string, string> = {
      'usdt_trc20': '請輸入 TRC20 地址，以 T 開頭',
      'usdt_erc20': '請輸入 ERC20 地址，以 0x 開頭',
      'bank': '請輸入銀行卡號'
    };
    return placeholders[method] || '請輸入收款地址';
  }
  
  getStatusName(status: string): string {
    const names: Record<string, string> = {
      'pending': '待審核',
      'approved': '已批准',
      'processing': '處理中',
      'completed': '已完成',
      'rejected': '已拒絕',
      'cancelled': '已取消'
    };
    return names[status] || status;
  }
  
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': '#f59e0b',
      'approved': '#3b82f6',
      'processing': '#8b5cf6',
      'completed': '#22c55e',
      'rejected': '#ef4444',
      'cancelled': '#9ca3af'
    };
    return colors[status] || '#666';
  }
  
  maskAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return address.slice(0, 6) + '...' + address.slice(-4);
  }
  
  async submit() {
    if (!this.canSubmit()) return;
    
    this.loading.set(true);
    
    try {
      const response = await this.api.post<any>('/api/wallet/withdraw/create', {
        amount: this.withdrawAmountCents(),
        method: this.selectedMethod,
        address: this.withdrawAddress
      });
      
      if (response?.success) {
        alert('提現申請已提交，請等待審核');
        await this.walletService.loadWallet();
        // 使用全局事件返回錢包頁
        window.dispatchEvent(new CustomEvent('changeView', { detail: 'wallet' }));
      } else {
        alert(response?.error || '提現失敗');
      }
    } catch (error) {
      console.error('Submit withdraw error:', error);
      alert('提現失敗');
    } finally {
      this.loading.set(false);
    }
  }
  
  async showHistory() {
    try {
      const response = await this.api.get<any>('/api/wallet/withdraw/orders');
      if (response?.success && response?.data?.orders) {
        this.withdrawOrders.set(response.data.orders);
      }
    } catch (error) {
      console.error('Load withdraw orders error:', error);
    }
    
    this.showHistoryModal.set(true);
  }
  
  closeHistory() {
    this.showHistoryModal.set(false);
  }
  
  goBack() {
    // 使用全局事件返回錢包頁
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'wallet' }));
  }
}
