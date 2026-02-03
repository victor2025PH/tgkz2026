/**
 * 支付確認彈窗組件
 * Payment Confirm Dialog Component
 * 
 * 統一處理所有消費場景的確認流程：
 * 1. 顯示消費詳情
 * 2. 餘額不足引導充值
 * 3. 大額消費密碼確認
 */

import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';

export interface PaymentItem {
  name: string;
  amount: number;           // 分
  description?: string;
  icon?: string;
  category: string;         // 消費類別
  referenceId?: string;     // 業務關聯ID
  referenceType?: string;   // 業務類型
}

export interface PaymentConfirmResult {
  confirmed: boolean;
  password?: string;
  transactionId?: string;
}

@Component({
  selector: 'app-payment-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dialog-overlay" *ngIf="visible" (click)="onBackdropClick($event)">
      <div class="dialog" (click)="$event.stopPropagation()">
        <!-- 頭部 -->
        <div class="dialog-header">
          <h3>{{ title || '確認支付' }}</h3>
          <button class="close-btn" (click)="cancel()">×</button>
        </div>
        
        <!-- 內容 -->
        <div class="dialog-body">
          <!-- 商品信息 -->
          <div class="item-info" *ngIf="item">
            <div class="item-icon">{{ item.icon || '🛒' }}</div>
            <div class="item-details">
              <div class="item-name">{{ item.name }}</div>
              <div class="item-desc" *ngIf="item.description">{{ item.description }}</div>
            </div>
            <div class="item-price">{{ formatAmount(item.amount) }}</div>
          </div>
          
          <!-- 餘額信息 -->
          <div class="balance-section">
            <div class="balance-row">
              <span class="label">當前餘額</span>
              <span class="value" [class.insufficient]="!balanceInfo()?.sufficient">
                {{ balanceInfo()?.available_display || '$0.00' }}
              </span>
            </div>
            <div class="balance-row">
              <span class="label">需支付</span>
              <span class="value price">{{ formatAmount(item?.amount || 0) }}</span>
            </div>
            <div class="balance-row after" *ngIf="balanceInfo()?.sufficient">
              <span class="label">支付後餘額</span>
              <span class="value">{{ getAfterBalance() }}</span>
            </div>
          </div>
          
          <!-- 餘額不足提示 -->
          <div class="insufficient-section" *ngIf="!balanceInfo()?.sufficient">
            <div class="insufficient-alert">
              <span class="alert-icon">⚠️</span>
              <div class="alert-content">
                <div class="alert-title">餘額不足</div>
                <div class="alert-desc">
                  還需 <span class="highlight">{{ balanceInfo()?.shortfall_display }}</span>
                </div>
              </div>
            </div>
            
            <div class="recharge-suggestion">
              <span>建議充值</span>
              <button class="recharge-btn" (click)="goToRecharge()">
                立即充值 {{ balanceInfo()?.recommended_display }}
              </button>
            </div>
          </div>
          
          <!-- 密碼確認（大額消費）-->
          <div class="password-section" *ngIf="requiresPassword && balanceInfo()?.sufficient">
            <div class="password-notice">
              <span class="notice-icon">🔒</span>
              <span>大額消費需要密碼確認</span>
            </div>
            <div class="password-input">
              <input 
                type="password" 
                [(ngModel)]="password"
                placeholder="請輸入支付密碼"
                (keyup.enter)="confirm()"
              />
            </div>
          </div>
        </div>
        
        <!-- 底部按鈕 -->
        <div class="dialog-footer">
          <button class="cancel-btn" (click)="cancel()">取消</button>
          <button 
            class="confirm-btn" 
            [disabled]="!canConfirm()"
            (click)="confirm()"
          >
            <span *ngIf="processing()">處理中...</span>
            <span *ngIf="!processing()">
              {{ balanceInfo()?.sufficient ? '確認支付' : '餘額不足' }}
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    
    .dialog {
      background: #1a1a2e;
      border-radius: 20px;
      max-width: 400px;
      width: 100%;
      overflow: hidden;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .dialog-header h3 {
      margin: 0;
      font-size: 18px;
      color: #fff;
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
    
    .dialog-body {
      padding: 20px;
    }
    
    /* 商品信息 */
    .item-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .item-icon {
      font-size: 32px;
    }
    
    .item-details {
      flex: 1;
    }
    
    .item-name {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
    
    .item-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 4px;
    }
    
    .item-price {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }
    
    /* 餘額信息 */
    .balance-section {
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .balance-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      color: rgba(255, 255, 255, 0.8);
    }
    
    .balance-row .label {
      opacity: 0.7;
    }
    
    .balance-row .value.insufficient {
      color: #ef4444;
    }
    
    .balance-row .value.price {
      color: #667eea;
      font-weight: 600;
    }
    
    .balance-row.after {
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      margin-top: 8px;
      padding-top: 12px;
    }
    
    /* 餘額不足 */
    .insufficient-section {
      padding: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 12px;
      margin-bottom: 20px;
    }
    
    .insufficient-alert {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .alert-icon {
      font-size: 24px;
    }
    
    .alert-title {
      font-size: 15px;
      font-weight: 600;
      color: #ef4444;
    }
    
    .alert-desc {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 4px;
    }
    
    .alert-desc .highlight {
      color: #ef4444;
      font-weight: 600;
    }
    
    .recharge-suggestion {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .recharge-suggestion span {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .recharge-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    
    /* 密碼確認 */
    .password-section {
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
    }
    
    .password-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }
    
    .password-input input {
      width: 100%;
      padding: 14px 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #fff;
      font-size: 16px;
    }
    
    .password-input input:focus {
      outline: none;
      border-color: #667eea;
    }
    
    /* 底部按鈕 */
    .dialog-footer {
      display: flex;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .cancel-btn {
      flex: 1;
      padding: 14px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      cursor: pointer;
    }
    
    .confirm-btn {
      flex: 2;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .confirm-btn:not(:disabled):hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  `]
})
export class PaymentConfirmDialogComponent {
  @Input() visible = false;
  @Input() item: PaymentItem | null = null;
  @Input() title: string = '';
  @Input() requiresPassword = false;
  
  @Output() confirmed = new EventEmitter<PaymentConfirmResult>();
  @Output() cancelled = new EventEmitter<void>();
  
  password = '';
  processing = signal(false);
  balanceInfo = signal<any>(null);
  
  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}
  
  ngOnChanges() {
    if (this.visible && this.item) {
      this.loadBalanceInfo();
    }
  }
  
  async loadBalanceInfo() {
    if (!this.item) return;
    
    const result = await this.walletService.checkBalance(this.item.amount);
    this.balanceInfo.set(result);
  }
  
  formatAmount(cents: number): string {
    return this.walletService.formatAmount(cents);
  }
  
  getAfterBalance(): string {
    const info = this.balanceInfo();
    if (!info || !this.item) return '$0.00';
    
    const after = info.available - this.item.amount;
    return `$${(after / 100).toFixed(2)}`;
  }
  
  canConfirm(): boolean {
    const info = this.balanceInfo();
    if (!info?.sufficient) return false;
    if (this.processing()) return false;
    if (this.requiresPassword && !this.password) return false;
    return true;
  }
  
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.cancel();
    }
  }
  
  cancel() {
    this.password = '';
    this.cancelled.emit();
  }
  
  async confirm() {
    if (!this.canConfirm() || !this.item) return;
    
    this.processing.set(true);
    
    try {
      // 調用消費接口
      const result = await this.walletService.consume({
        amount: this.item.amount,
        category: this.item.category,
        description: this.item.name,
        referenceId: this.item.referenceId,
        referenceType: this.item.referenceType
      });
      
      if (result.success) {
        this.confirmed.emit({
          confirmed: true,
          password: this.password || undefined,
          transactionId: result.transaction?.id
        });
      } else {
        // 如果餘額不足，刷新餘額信息
        if (result.error?.includes('餘額不足')) {
          await this.loadBalanceInfo();
        }
        alert(result.error || '支付失敗');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('支付失敗');
    } finally {
      this.processing.set(false);
    }
  }
  
  goToRecharge() {
    this.cancel();
    this.router.navigate(['/wallet/recharge']);
  }
}
