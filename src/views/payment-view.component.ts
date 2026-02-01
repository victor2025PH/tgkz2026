/**
 * 支付視圖組件
 * 
 * 支付創建、歷史、發票管理
 */

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService, PaymentIntent, Invoice, PaymentProvider, PaymentHistoryItem } from '../services/payment.service';

@Component({
  selector: 'app-payment-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="payment-view">
      <header class="page-header">
        <h1>支付中心</h1>
      </header>
      
      <!-- 標籤頁 -->
      <div class="tabs">
        <button 
          *ngFor="let tab of tabs"
          [class.active]="activeTab() === tab.value"
          (click)="activeTab.set(tab.value)">
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
      
      <!-- 快速支付 -->
      <div class="tab-content" *ngIf="activeTab() === 'quick'">
        <div class="quick-pay-section">
          <h2>快速支付</h2>
          
          <div class="pay-form">
            <div class="form-group">
              <label>金額（元）</label>
              <input 
                type="number" 
                [(ngModel)]="payAmount" 
                min="1" 
                step="0.01"
                placeholder="輸入金額">
            </div>
            
            <div class="form-group">
              <label>描述</label>
              <input 
                type="text" 
                [(ngModel)]="payDescription" 
                placeholder="支付描述（可選）">
            </div>
            
            <div class="form-group">
              <label>支付方式</label>
              <div class="provider-options">
                <button 
                  *ngFor="let p of providers"
                  [class.selected]="selectedProvider() === p.value"
                  (click)="selectedProvider.set(p.value)">
                  <span class="provider-icon">{{ p.icon }}</span>
                  <span class="provider-name">{{ p.name }}</span>
                </button>
              </div>
            </div>
            
            <button 
              class="pay-btn" 
              [disabled]="!payAmount || payment.loading()"
              (click)="createPayment()">
              {{ payment.loading() ? '處理中...' : '創建支付' }}
            </button>
          </div>
        </div>
        
        <!-- 當前支付 -->
        <div class="current-payment" *ngIf="payment.currentIntent()">
          <h3>當前支付</h3>
          <div class="payment-card">
            <div class="payment-header">
              <span class="provider-icon">{{ payment.getProviderIcon(payment.currentIntent()!.provider) }}</span>
              <span class="payment-id">{{ payment.currentIntent()!.id.slice(0, 12) }}...</span>
            </div>
            <div class="payment-amount">
              {{ payment.formatAmount(payment.currentIntent()!.amount, payment.currentIntent()!.currency) }}
            </div>
            <div class="payment-status" [style.color]="payment.getStateLabel(payment.currentIntent()!.state).color">
              {{ payment.getStateLabel(payment.currentIntent()!.state).text }}
            </div>
            
            <div class="payment-actions">
              <button 
                *ngIf="payment.currentIntent()!.pay_url && payment.currentIntent()!.state !== 'completed'"
                class="open-pay-btn"
                (click)="payment.openPaymentPage(payment.currentIntent()!)">
                打開支付頁面
              </button>
              <button 
                *ngIf="payment.currentIntent()!.state !== 'completed'"
                class="check-btn"
                (click)="checkStatus()">
                檢查狀態
              </button>
              <button class="clear-btn" (click)="payment.clearCurrentIntent()">
                清除
              </button>
            </div>
            
            <!-- 二維碼 -->
            <div class="qr-section" *ngIf="payment.currentIntent()!.qr_code">
              <p>掃碼支付：</p>
              <div class="qr-code">{{ payment.currentIntent()!.qr_code }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 支付歷史 -->
      <div class="tab-content" *ngIf="activeTab() === 'history'">
        <section class="history-section">
          <div class="section-header">
            <h2>支付歷史</h2>
            <button class="refresh-btn" (click)="loadHistory()">🔄 刷新</button>
          </div>
          
          <div class="history-list" *ngIf="payment.paymentHistory().length > 0; else noHistory">
            <div class="history-item" *ngFor="let item of payment.paymentHistory()">
              <div class="item-icon">{{ payment.getProviderIcon(item.provider as PaymentProvider) }}</div>
              <div class="item-info">
                <span class="item-desc">{{ item.description || '支付' }}</span>
                <span class="item-time">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="item-amount" [class.completed]="item.state === 'completed'">
                {{ payment.formatAmount(item.amount, item.currency) }}
              </div>
              <div class="item-status" [style.color]="payment.getStateLabel(item.state as any).color">
                {{ payment.getStateLabel(item.state as any).text }}
              </div>
            </div>
          </div>
          <ng-template #noHistory>
            <div class="empty-state">
              <span class="empty-icon">💳</span>
              <p>暫無支付記錄</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- 發票 -->
      <div class="tab-content" *ngIf="activeTab() === 'invoices'">
        <section class="invoices-section">
          <div class="section-header">
            <h2>我的發票</h2>
            <button class="refresh-btn" (click)="loadInvoices()">🔄 刷新</button>
          </div>
          
          <div class="invoices-list" *ngIf="payment.invoices().length > 0; else noInvoices">
            <div class="invoice-card" *ngFor="let inv of payment.invoices()" (click)="viewInvoice(inv)">
              <div class="invoice-header">
                <span class="invoice-number">{{ inv.invoice_number }}</span>
                <span class="invoice-status" [class]="inv.status">{{ getInvoiceStatusLabel(inv.status) }}</span>
              </div>
              <div class="invoice-amount">
                {{ payment.formatAmount(inv.total, inv.currency) }}
              </div>
              <div class="invoice-date">
                {{ formatDate(inv.issued_at) }}
              </div>
              <div class="invoice-actions">
                <button class="view-btn">查看詳情</button>
                <button class="download-btn" *ngIf="inv.pdf_url">下載 PDF</button>
              </div>
            </div>
          </div>
          <ng-template #noInvoices>
            <div class="empty-state">
              <span class="empty-icon">📄</span>
              <p>暫無發票</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- 發票詳情對話框 -->
      <div class="dialog-overlay" *ngIf="showInvoiceDialog()" (click)="showInvoiceDialog.set(false)">
        <div class="dialog-content invoice-dialog" (click)="$event.stopPropagation()">
          <div class="invoice-detail" *ngIf="selectedInvoice()">
            <h3>發票詳情</h3>
            
            <div class="invoice-meta">
              <div class="meta-row">
                <span>發票號</span>
                <span>{{ selectedInvoice()!.invoice_number }}</span>
              </div>
              <div class="meta-row">
                <span>開票日期</span>
                <span>{{ formatDate(selectedInvoice()!.issued_at) }}</span>
              </div>
              <div class="meta-row">
                <span>狀態</span>
                <span [class]="selectedInvoice()!.status">{{ getInvoiceStatusLabel(selectedInvoice()!.status) }}</span>
              </div>
            </div>
            
            <div class="invoice-items">
              <h4>項目明細</h4>
              <table>
                <thead>
                  <tr>
                    <th>描述</th>
                    <th>數量</th>
                    <th>單價</th>
                    <th>金額</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of selectedInvoice()!.items">
                    <td>{{ item.description }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ payment.formatAmount(item.unit_price) }}</td>
                    <td>{{ payment.formatAmount(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="invoice-total">
              <div class="total-row">
                <span>小計</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.subtotal) }}</span>
              </div>
              <div class="total-row" *ngIf="selectedInvoice()!.tax > 0">
                <span>稅費</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.tax) }}</span>
              </div>
              <div class="total-row grand">
                <span>總計</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.total) }}</span>
              </div>
            </div>
          </div>
          
          <button class="close-btn" (click)="showInvoiceDialog.set(false)">關閉</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-view {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .page-header h1 {
      margin: 0 0 24px;
      font-size: 24px;
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
    }
    
    .tabs button.active {
      background: var(--bg-secondary, #1a1a1a);
      color: var(--text-primary, #fff);
    }
    
    /* 快速支付 */
    .quick-pay-section {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .quick-pay-section h2 {
      margin: 0 0 20px;
      font-size: 18px;
    }
    
    .pay-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    .form-group input {
      width: 100%;
      padding: 12px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      font-size: 14px;
    }
    
    .provider-options {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .provider-options button {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 24px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 2px solid var(--border-color, #333);
      border-radius: 12px;
      color: var(--text-primary, #fff);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .provider-options button.selected {
      border-color: var(--primary, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
    }
    
    .provider-icon {
      font-size: 24px;
    }
    
    .provider-name {
      font-size: 12px;
    }
    
    .pay-btn {
      padding: 14px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .pay-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    /* 當前支付 */
    .current-payment {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 16px;
      padding: 24px;
    }
    
    .current-payment h3 {
      margin: 0 0 16px;
      font-size: 16px;
    }
    
    .payment-card {
      text-align: center;
    }
    
    .payment-header {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .payment-id {
      font-family: monospace;
      color: var(--text-muted, #666);
    }
    
    .payment-amount {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .payment-status {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    
    .payment-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .payment-actions button {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
    }
    
    .open-pay-btn {
      background: var(--primary, #3b82f6);
      border: none;
      color: white;
    }
    
    .check-btn {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .clear-btn {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-muted, #666);
    }
    
    .qr-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--border-color, #333);
    }
    
    .qr-code {
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      color: var(--text-muted, #666);
    }
    
    /* 歷史 */
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 18px;
    }
    
    .refresh-btn {
      padding: 8px 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
    }
    
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .history-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
    }
    
    .item-icon {
      font-size: 24px;
    }
    
    .item-info {
      flex: 1;
    }
    
    .item-desc {
      display: block;
      font-weight: 500;
    }
    
    .item-time {
      font-size: 12px;
      color: var(--text-muted, #666);
    }
    
    .item-amount {
      font-size: 18px;
      font-weight: 700;
    }
    
    .item-amount.completed {
      color: #22c55e;
    }
    
    .item-status {
      font-size: 12px;
      font-weight: 600;
    }
    
    /* 發票 */
    .invoices-list {
      display: grid;
      gap: 16px;
    }
    
    .invoice-card {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .invoice-card:hover {
      border-color: var(--primary, #3b82f6);
    }
    
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .invoice-number {
      font-weight: 600;
      font-family: monospace;
    }
    
    .invoice-status {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
    }
    
    .invoice-status.issued, .invoice-status.paid {
      background: #22c55e;
      color: white;
    }
    
    .invoice-status.draft {
      background: #f59e0b;
      color: black;
    }
    
    .invoice-amount {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .invoice-date {
      font-size: 12px;
      color: var(--text-muted, #666);
      margin-bottom: 12px;
    }
    
    .invoice-actions {
      display: flex;
      gap: 8px;
    }
    
    .invoice-actions button {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    }
    
    .view-btn {
      background: var(--primary, #3b82f6);
      border: none;
      color: white;
    }
    
    .download-btn {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .empty-state {
      text-align: center;
      padding: 48px;
      color: var(--text-muted, #666);
    }
    
    .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
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
      min-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .invoice-detail h3 {
      margin: 0 0 20px;
    }
    
    .invoice-meta {
      margin-bottom: 20px;
    }
    
    .meta-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    .invoice-items h4 {
      margin: 0 0 12px;
      font-size: 14px;
    }
    
    .invoice-items table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    .invoice-items th, .invoice-items td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid var(--border-color, #333);
    }
    
    .invoice-items th {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .invoice-total {
      margin-bottom: 20px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .total-row.grand {
      font-size: 18px;
      font-weight: 700;
      border-top: 2px solid var(--border-color, #333);
      padding-top: 12px;
    }
    
    .close-btn {
      width: 100%;
      padding: 12px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 8px;
      color: var(--text-primary, #fff);
      cursor: pointer;
    }
  `]
})
export class PaymentViewComponent implements OnInit {
  payment = inject(PaymentService);
  
  // 狀態
  activeTab = signal<string>('quick');
  selectedProvider = signal<PaymentProvider>('demo');
  payAmount = 0;
  payDescription = '';
  
  showInvoiceDialog = signal(false);
  selectedInvoice = signal<Invoice | null>(null);
  
  // 標籤頁
  tabs = [
    { value: 'quick', label: '快速支付', icon: '💳' },
    { value: 'history', label: '支付歷史', icon: '📋' },
    { value: 'invoices', label: '發票', icon: '📄' }
  ];
  
  // 支付提供商
  providers: { value: PaymentProvider; name: string; icon: string }[] = [
    { value: 'alipay', name: '支付寶', icon: '💙' },
    { value: 'wechat', name: '微信', icon: '💚' },
    { value: 'stripe', name: 'Stripe', icon: '💳' },
    { value: 'paypal', name: 'PayPal', icon: '🅿️' },
    { value: 'demo', name: '演示', icon: '🎮' }
  ];
  
  PaymentProvider = '' as PaymentProvider;

  ngOnInit() {
    this.loadHistory();
    this.loadInvoices();
  }

  async createPayment() {
    if (!this.payAmount || this.payAmount <= 0) return;
    
    const amountInCents = Math.round(this.payAmount * 100);
    
    const result = await this.payment.createPayment({
      amount: amountInCents,
      provider: this.selectedProvider(),
      description: this.payDescription || '用戶支付',
      paymentType: 'one_time'
    });
    
    if (result.success && result.intent) {
      // 如果有支付 URL，打開它
      if (result.intent.pay_url) {
        this.payment.openPaymentPage(result.intent);
      }
    } else {
      alert(result.error || '創建支付失敗');
    }
  }

  async checkStatus() {
    const intent = this.payment.currentIntent();
    if (intent) {
      await this.payment.checkPaymentStatus(intent.id);
    }
  }

  loadHistory() {
    this.payment.loadPaymentHistory();
  }

  loadInvoices() {
    this.payment.loadInvoices();
  }

  viewInvoice(invoice: Invoice) {
    this.selectedInvoice.set(invoice);
    this.showInvoiceDialog.set(true);
  }

  formatDate(isoTime: string): string {
    if (!isoTime) return '-';
    try {
      return new Date(isoTime).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoTime;
    }
  }

  getInvoiceStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: '草稿',
      issued: '已開具',
      paid: '已支付',
      void: '已作廢'
    };
    return labels[status] || status;
  }
}
