/**
 * 升級結算對話框
 * 
 * 處理方案升級的支付流程
 */

import { Component, Input, Output, EventEmitter, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { AuthService } from '../core/auth.service';

export interface UpgradeCheckoutData {
  planId: string;
  planName: string;
  planIcon: string;
  price: number;
  yearlyPrice: number;
  billingCycle: 'monthly' | 'yearly';
  quotas: Record<string, number>;
}

type PaymentMethod = 'alipay' | 'wechat' | 'card' | 'crypto';

@Component({
  selector: 'app-upgrade-checkout-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" (click)="close.emit()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <!-- 步驟指示器 -->
        <div class="steps">
          <div class="step" [class.active]="step() >= 1" [class.completed]="step() > 1">
            <span class="step-num">1</span>
            <span class="step-label">確認方案</span>
          </div>
          <div class="step-line" [class.active]="step() >= 2"></div>
          <div class="step" [class.active]="step() >= 2" [class.completed]="step() > 2">
            <span class="step-num">2</span>
            <span class="step-label">選擇付款</span>
          </div>
          <div class="step-line" [class.active]="step() >= 3"></div>
          <div class="step" [class.active]="step() >= 3">
            <span class="step-num">3</span>
            <span class="step-label">完成</span>
          </div>
        </div>
        
        <!-- 步驟 1: 確認方案 -->
        <div class="step-content" *ngIf="step() === 1">
          <div class="plan-summary">
            <div class="plan-icon">{{ data.planIcon }}</div>
            <div class="plan-info">
              <h2>{{ data.planName }}</h2>
              <div class="plan-price">
                <span class="currency">¥</span>
                <span class="amount">{{ displayPrice() }}</span>
                <span class="period">/{{ data.billingCycle === 'yearly' ? '年' : '月' }}</span>
              </div>
            </div>
          </div>
          
          <!-- 計費週期選擇 -->
          <div class="billing-options">
            <label class="billing-option" [class.selected]="selectedBilling() === 'monthly'">
              <input type="radio" name="billing" value="monthly" 
                     [checked]="selectedBilling() === 'monthly'"
                     (change)="selectedBilling.set('monthly')">
              <span class="option-content">
                <span class="option-label">月付</span>
                <span class="option-price">¥{{ data.price }}/月</span>
              </span>
            </label>
            <label class="billing-option" [class.selected]="selectedBilling() === 'yearly'">
              <input type="radio" name="billing" value="yearly"
                     [checked]="selectedBilling() === 'yearly'"
                     (change)="selectedBilling.set('yearly')">
              <span class="option-content">
                <span class="option-label">
                  年付
                  <span class="save-badge">省 20%</span>
                </span>
                <span class="option-price">¥{{ data.yearlyPrice * 12 }}/年</span>
              </span>
            </label>
          </div>
          
          <!-- 配額詳情 -->
          <div class="quota-preview">
            <h3>升級後配額</h3>
            <div class="quota-list">
              <div class="quota-item" *ngFor="let quota of quotaList">
                <span class="quota-icon">{{ quota.icon }}</span>
                <span class="quota-name">{{ quota.name }}</span>
                <span class="quota-value">{{ quota.value }}</span>
              </div>
            </div>
          </div>
          
          <button class="btn-primary" (click)="step.set(2)">
            繼續選擇付款方式
          </button>
        </div>
        
        <!-- 步驟 2: 選擇付款方式 -->
        <div class="step-content" *ngIf="step() === 2">
          <h2>選擇付款方式</h2>
          
          <div class="payment-methods">
            <label class="payment-option" [class.selected]="paymentMethod() === 'alipay'">
              <input type="radio" name="payment" value="alipay"
                     [checked]="paymentMethod() === 'alipay'"
                     (change)="paymentMethod.set('alipay')">
              <span class="method-icon">💙</span>
              <span class="method-name">支付寶</span>
            </label>
            
            <label class="payment-option" [class.selected]="paymentMethod() === 'wechat'">
              <input type="radio" name="payment" value="wechat"
                     [checked]="paymentMethod() === 'wechat'"
                     (change)="paymentMethod.set('wechat')">
              <span class="method-icon">💚</span>
              <span class="method-name">微信支付</span>
            </label>
            
            <label class="payment-option" [class.selected]="paymentMethod() === 'card'">
              <input type="radio" name="payment" value="card"
                     [checked]="paymentMethod() === 'card'"
                     (change)="paymentMethod.set('card')">
              <span class="method-icon">💳</span>
              <span class="method-name">信用卡</span>
            </label>
            
            <label class="payment-option" [class.selected]="paymentMethod() === 'crypto'">
              <input type="radio" name="payment" value="crypto"
                     [checked]="paymentMethod() === 'crypto'"
                     (change)="paymentMethod.set('crypto')">
              <span class="method-icon">₿</span>
              <span class="method-name">加密貨幣</span>
            </label>
          </div>
          
          <!-- 訂單摘要 -->
          <div class="order-summary">
            <div class="summary-row">
              <span>{{ data.planName }}</span>
              <span>¥{{ displayPrice() }}</span>
            </div>
            <div class="summary-row discount" *ngIf="selectedBilling() === 'yearly'">
              <span>年付優惠</span>
              <span>-¥{{ yearlySaving() }}</span>
            </div>
            <div class="summary-row total">
              <span>總計</span>
              <span>¥{{ totalPrice() }}</span>
            </div>
          </div>
          
          <div class="step-actions">
            <button class="btn-secondary" (click)="step.set(1)">返回</button>
            <button class="btn-primary" [disabled]="isProcessing()" (click)="processPayment()">
              <span class="spinner" *ngIf="isProcessing()"></span>
              {{ isProcessing() ? '處理中...' : '確認支付' }}
            </button>
          </div>
        </div>
        
        <!-- 步驟 3: 完成 -->
        <div class="step-content success" *ngIf="step() === 3">
          <div class="success-icon">✓</div>
          <h2>升級成功！</h2>
          <p>您已成功升級到 {{ data.planName }}</p>
          
          <div class="success-details">
            <p>新配額已生效，請刷新頁面查看</p>
          </div>
          
          <button class="btn-primary" (click)="onSuccess()">
            開始使用
          </button>
        </div>
        
        <!-- 關閉按鈕 -->
        <button class="close-btn" (click)="close.emit()">×</button>
      </div>
    </div>
  `,
  styles: [`
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
      z-index: 10000;
    }
    
    .dialog-content {
      background: var(--bg-primary, #0f0f0f);
      border-radius: 16px;
      padding: 32px;
      max-width: 480px;
      width: 90%;
      position: relative;
    }
    
    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      background: none;
      border: none;
      color: var(--text-secondary, #888);
      font-size: 24px;
      cursor: pointer;
    }
    
    /* 步驟指示器 */
    .steps {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 32px;
    }
    
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    
    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--border-color, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      transition: all 0.3s;
    }
    
    .step.active .step-num {
      border-color: var(--primary, #3b82f6);
      color: var(--primary, #3b82f6);
    }
    
    .step.completed .step-num {
      background: var(--primary, #3b82f6);
      border-color: var(--primary, #3b82f6);
      color: white;
    }
    
    .step-label {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .step.active .step-label {
      color: var(--text-primary, #fff);
    }
    
    .step-line {
      width: 60px;
      height: 2px;
      background: var(--border-color, #333);
      margin: 0 8px 20px;
      transition: background 0.3s;
    }
    
    .step-line.active {
      background: var(--primary, #3b82f6);
    }
    
    /* 方案摘要 */
    .plan-summary {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      margin-bottom: 24px;
    }
    
    .plan-icon {
      font-size: 48px;
    }
    
    .plan-info h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }
    
    .plan-price {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    
    .currency {
      font-size: 16px;
      color: var(--text-secondary, #888);
    }
    
    .amount {
      font-size: 28px;
      font-weight: 700;
      color: var(--primary, #3b82f6);
    }
    
    .period {
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    /* 計費選項 */
    .billing-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .billing-option {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--border-color, #333);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .billing-option input {
      display: none;
    }
    
    .billing-option.selected {
      border-color: var(--primary, #3b82f6);
      background: rgba(59, 130, 246, 0.1);
    }
    
    .option-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .option-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
    }
    
    .save-badge {
      padding: 2px 6px;
      background: #22c55e;
      border-radius: 4px;
      font-size: 10px;
      color: white;
    }
    
    .option-price {
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    /* 配額預覽 */
    .quota-preview {
      margin-bottom: 24px;
    }
    
    .quota-preview h3 {
      font-size: 14px;
      color: var(--text-secondary, #888);
      margin: 0 0 12px;
    }
    
    .quota-list {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .quota-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 8px;
      font-size: 13px;
    }
    
    .quota-icon {
      font-size: 16px;
    }
    
    .quota-value {
      margin-left: auto;
      font-weight: 600;
      color: #22c55e;
    }
    
    /* 付款方式 */
    .payment-methods {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .payment-option {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border: 2px solid var(--border-color, #333);
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.2s;
    }
    
    .payment-option input {
      display: none;
    }
    
    .payment-option.selected {
      border-color: var(--primary, #3b82f6);
    }
    
    .method-icon {
      font-size: 24px;
    }
    
    .method-name {
      font-weight: 600;
    }
    
    /* 訂單摘要 */
    .order-summary {
      padding: 16px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      margin-bottom: 24px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    
    .summary-row.discount {
      color: #22c55e;
    }
    
    .summary-row.total {
      border-top: 1px solid var(--border-color, #333);
      margin-top: 8px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
    }
    
    /* 按鈕 */
    .step-actions {
      display: flex;
      gap: 12px;
    }
    
    .btn-primary, .btn-secondary {
      flex: 1;
      padding: 14px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .spinner {
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
    
    /* 成功狀態 */
    .step-content.success {
      text-align: center;
      padding: 20px 0;
    }
    
    .success-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: white;
      margin: 0 auto 20px;
    }
    
    .success-details {
      padding: 16px;
      background: rgba(34, 197, 94, 0.1);
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .success-details p {
      margin: 0;
      color: var(--text-secondary, #888);
    }
  `]
})
export class UpgradeCheckoutDialogComponent implements OnInit {
  @Input() data!: UpgradeCheckoutData;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();
  
  private ipc = inject(ElectronIpcService);
  private authService = inject(AuthService);
  
  step = signal(1);
  selectedBilling = signal<'monthly' | 'yearly'>('monthly');
  paymentMethod = signal<PaymentMethod>('alipay');
  isProcessing = signal(false);
  
  quotaList: { icon: string; name: string; value: string }[] = [];

  ngOnInit() {
    this.selectedBilling.set(this.data.billingCycle);
    this.generateQuotaList();
  }

  private generateQuotaList() {
    const icons: Record<string, string> = {
      tg_accounts: '📱',
      daily_messages: '💬',
      ai_calls: '🤖',
      groups: '👥',
      devices: '💻',
    };
    
    const names: Record<string, string> = {
      tg_accounts: 'TG 帳號',
      daily_messages: '每日消息',
      ai_calls: 'AI 調用',
      groups: '群組數',
      devices: '設備數',
    };
    
    this.quotaList = Object.entries(this.data.quotas || {})
      .filter(([key]) => ['tg_accounts', 'daily_messages', 'ai_calls', 'groups'].includes(key))
      .map(([key, value]) => ({
        icon: icons[key] || '📊',
        name: names[key] || key,
        value: value === -1 ? '無限' : value.toString()
      }));
  }

  displayPrice = computed(() => {
    return this.selectedBilling() === 'yearly' 
      ? this.data.yearlyPrice * 12 
      : this.data.price;
  });

  yearlySaving = computed(() => {
    return (this.data.price * 12) - (this.data.yearlyPrice * 12);
  });

  totalPrice = computed(() => {
    return this.displayPrice();
  });

  async processPayment() {
    this.isProcessing.set(true);
    
    try {
      // TODO: 實際支付流程
      // const response = await this.ipc.invoke('process-payment', {
      //   planId: this.data.planId,
      //   billingCycle: this.selectedBilling(),
      //   paymentMethod: this.paymentMethod(),
      //   amount: this.totalPrice()
      // });
      
      // 模擬支付
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.step.set(3);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('支付失敗，請稍後重試');
    } finally {
      this.isProcessing.set(false);
    }
  }

  onSuccess() {
    this.success.emit();
    this.close.emit();
  }
}
