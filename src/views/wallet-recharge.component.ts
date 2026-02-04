/**
 * 充值中心組件
 * Wallet Recharge Component
 * 
 * 用戶充值頁面，支持：
 * - 選擇充值金額
 * - 選擇支付方式
 * - USDT 地址顯示
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService, RechargePackage, RechargeOrder, PaymentInfo } from '../services/wallet.service';

type PaymentMethod = 'usdt_trc20' | 'alipay' | 'wechat' | 'bank';

@Component({
  selector: 'app-wallet-recharge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="recharge-view">
      <!-- 頂部導航 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">←</span>
          </button>
          <h1>💳 充值</h1>
        </div>
      </div>

      <!-- 當前餘額 -->
      <div class="current-balance">
        <span class="label">當前餘額</span>
        <span class="amount">{{ walletService.balanceDisplay() }}</span>
      </div>

      <!-- 選擇充值金額 -->
      <div class="section">
        <h2>選擇充值金額</h2>
        <div class="package-grid">
          @for (pkg of packages(); track pkg.id) {
            <div 
              class="package-item" 
              [class.selected]="selectedPackage()?.id === pkg.id"
              [class.recommended]="pkg.is_recommended"
              (click)="selectPackage(pkg)"
            >
              <div class="package-amount">{{ pkg.amount_display }}</div>
              @if (pkg.bonus_amount > 0) {
                <div class="package-bonus">{{ pkg.bonus_display }} 🎁</div>
              }
              @if (pkg.is_recommended) {
                <div class="recommended-badge">推薦</div>
              }
            </div>
          }
        </div>
        
        <!-- 自定義金額 -->
        <div class="custom-amount">
          <span class="label">或輸入自定義金額：</span>
          <div class="input-group">
            <span class="currency">$</span>
            <input 
              type="number" 
              [(ngModel)]="customAmount" 
              (input)="onCustomAmountChange()"
              placeholder="5 - 1000"
              min="5"
              max="1000"
            >
          </div>
          <span class="hint">自定義金額無贈送</span>
        </div>
      </div>

      <!-- 選擇支付方式 -->
      <div class="section">
        <h2>選擇支付方式</h2>
        <div class="payment-methods">
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'usdt_trc20'"
            (click)="selectMethod('usdt_trc20')"
          >
            <div class="method-icon">💎</div>
            <div class="method-info">
              <div class="method-name">USDT (TRC20)</div>
              <div class="method-desc">0% 手續費 · 推薦</div>
            </div>
            <div class="method-badge recommended">推薦</div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'alipay'"
            (click)="selectMethod('alipay')"
          >
            <div class="method-icon">💙</div>
            <div class="method-info">
              <div class="method-name">支付寶</div>
              <div class="method-desc">2% 手續費</div>
            </div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'wechat'"
            (click)="selectMethod('wechat')"
          >
            <div class="method-icon">💚</div>
            <div class="method-info">
              <div class="method-name">微信支付</div>
              <div class="method-desc">2% 手續費</div>
            </div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'bank'"
            (click)="selectMethod('bank')"
          >
            <div class="method-icon">🏦</div>
            <div class="method-info">
              <div class="method-name">銀行卡</div>
              <div class="method-desc">1% 手續費</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 支付明細 -->
      <div class="section payment-summary">
        <h2>💰 支付明細</h2>
        <div class="summary-rows">
          <div class="summary-row">
            <span class="label">充值金額</span>
            <span class="value">{{ formatAmount(rechargeAmount()) }}</span>
          </div>
          <div class="summary-row bonus" *ngIf="bonusAmount() > 0">
            <span class="label">贈送金額</span>
            <span class="value">+{{ formatAmount(bonusAmount()) }} 🎁</span>
          </div>
          <div class="summary-row" *ngIf="feeAmount() > 0">
            <span class="label">手續費</span>
            <span class="value">-{{ formatAmount(feeAmount()) }}</span>
          </div>
          <div class="summary-row total">
            <span class="label">實際到賬</span>
            <span class="value">{{ formatAmount(actualAmount()) }}</span>
          </div>
        </div>
      </div>

      <!-- 確認按鈕 -->
      <div class="action-bar">
        <button 
          class="confirm-btn" 
          [disabled]="!canProceed()"
          (click)="proceed()"
        >
          確認支付 {{ formatAmount(payAmount()) }}
        </button>
      </div>

      <!-- USDT 支付彈窗 -->
      <div class="modal-overlay" *ngIf="showUsdtModal()">
        <div class="modal usdt-modal">
          <div class="modal-header">
            <h3>💎 USDT 充值</h3>
            <button class="close-btn" (click)="closeUsdtModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="usdt-info">
              <p>請轉賬 <strong>{{ usdtAmount() }} USDT</strong> 到以下地址：</p>
              
              <div class="qr-code-container">
                @if (qrCodeUrl()) {
                  <img [src]="qrCodeUrl()" alt="USDT Address QR Code" class="qr-code-img" />
                } @else {
                  <div class="qr-loading">
                    <span>生成中...</span>
                  </div>
                }
              </div>
              
              <div class="address-box">
                <div class="network-badge">{{ usdtNetwork() }} {{ usdtNetwork() === 'TRC20' ? '(TRON)' : '(Ethereum)' }}</div>
                <div class="address">{{ usdtAddress() }}</div>
                <button class="copy-btn" (click)="copyAddress()">複製地址</button>
              </div>
              
              <div class="usdt-notes">
                <p>⚠️ 注意事項：</p>
                <ul>
                  <li>請務必選擇 TRC20 網絡</li>
                  <li>最小轉賬金額：5 USDT</li>
                  <li>到賬時間：1-30 分鐘</li>
                  <li>訂單有效期：30 分鐘</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" (click)="confirmUsdtPayment()">
              我已完成轉賬
            </button>
          </div>
        </div>
      </div>

      <!-- 加載遮罩 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>處理中...</span>
      </div>
    </div>
  `,
  styles: [`
    .recharge-view {
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

    /* 當前餘額 */
    .current-balance {
      text-align: center;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .current-balance .label {
      display: block;
      font-size: 14px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .current-balance .amount {
      font-size: 32px;
      font-weight: 700;
      color: #667eea;
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

    /* 套餐網格 */
    .package-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .package-item {
      position: relative;
      padding: 20px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid transparent;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .package-item:hover {
      border-color: rgba(102, 126, 234, 0.5);
    }

    .package-item.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .package-item.recommended {
      border-color: rgba(245, 158, 11, 0.5);
    }

    .package-amount {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .package-bonus {
      font-size: 12px;
      color: #f59e0b;
    }

    .recommended-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #f59e0b;
      color: #000;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
    }

    /* 自定義金額 */
    .custom-amount {
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .custom-amount .label {
      font-size: 14px;
      opacity: 0.7;
    }

    .input-group {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 0 12px;
    }

    .input-group .currency {
      font-size: 16px;
      opacity: 0.7;
    }

    .input-group input {
      width: 100px;
      padding: 10px 8px;
      background: transparent;
      border: none;
      color: #fff;
      font-size: 16px;
    }

    .custom-amount .hint {
      font-size: 12px;
      opacity: 0.5;
    }

    /* 支付方式 */
    .payment-methods {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .payment-method {
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

    .payment-method:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .payment-method.selected {
      border-color: #667eea;
      background: rgba(102, 126, 234, 0.1);
    }

    .method-icon {
      font-size: 24px;
    }

    .method-info {
      flex: 1;
    }

    .method-name {
      font-size: 14px;
      font-weight: 500;
    }

    .method-desc {
      font-size: 12px;
      opacity: 0.6;
    }

    .method-badge.recommended {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 10px;
    }

    /* 支付明細 */
    .payment-summary .summary-rows {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }

    .summary-row .label {
      opacity: 0.7;
    }

    .summary-row.bonus .value {
      color: #f59e0b;
    }

    .summary-row.total {
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 18px;
      font-weight: 600;
    }

    .summary-row.total .value {
      color: #22c55e;
    }

    /* 操作欄 */
    .action-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 20px;
      background: rgba(26, 26, 46, 0.95);
      backdrop-filter: blur(10px);
    }

    .confirm-btn {
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: #fff;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .confirm-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .confirm-btn:not(:disabled):hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    /* USDT 彈窗 */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
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

    .usdt-info p {
      margin-bottom: 16px;
    }

    .qr-code-container {
      width: 180px;
      height: 180px;
      margin: 0 auto 20px;
      background: #fff;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .qr-code-img {
      width: 160px;
      height: 160px;
      object-fit: contain;
    }
    
    .qr-loading {
      color: #666;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
    }

    .address-box {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .network-badge {
      display: inline-block;
      background: #22c55e;
      color: #fff;
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 10px;
      margin-bottom: 8px;
    }

    .address {
      font-family: monospace;
      font-size: 12px;
      word-break: break-all;
      margin-bottom: 12px;
      opacity: 0.9;
    }

    .copy-btn {
      width: 100%;
      padding: 10px;
      background: rgba(102, 126, 234, 0.2);
      border: 1px solid #667eea;
      color: #667eea;
      border-radius: 8px;
      cursor: pointer;
    }

    .usdt-notes {
      font-size: 13px;
      opacity: 0.7;
    }

    .usdt-notes ul {
      margin: 8px 0 0 16px;
      padding: 0;
    }

    .usdt-notes li {
      margin-bottom: 4px;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .primary-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
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
      z-index: 200;
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
export class WalletRechargeComponent implements OnInit {
  packages = signal<RechargePackage[]>([]);
  selectedPackage = signal<RechargePackage | null>(null);
  selectedMethod = signal<PaymentMethod>('usdt_trc20');
  customAmount = 0;
  loading = signal(false);
  showUsdtModal = signal(false);
  
  // 當前訂單信息
  currentOrder = signal<RechargeOrder | null>(null);
  paymentInfo = signal<PaymentInfo | null>(null);
  pollingStatus = signal(false);
  
  // 計算屬性
  rechargeAmount = computed(() => {
    const pkg = this.selectedPackage();
    if (pkg) return pkg.amount;
    return (this.customAmount || 0) * 100;  // 轉為分
  });
  
  bonusAmount = computed(() => {
    const pkg = this.selectedPackage();
    return pkg?.bonus_amount || 0;
  });
  
  feeAmount = computed(() => {
    const method = this.selectedMethod();
    const amount = this.rechargeAmount();
    
    const feeRates: Record<PaymentMethod, number> = {
      'usdt_trc20': 0,
      'alipay': 0.02,
      'wechat': 0.02,
      'bank': 0.01
    };
    
    return Math.round(amount * (feeRates[method] || 0));
  });
  
  actualAmount = computed(() => {
    return this.rechargeAmount() + this.bonusAmount() - this.feeAmount();
  });
  
  payAmount = computed(() => {
    return this.rechargeAmount();
  });
  
  usdtAmount = computed(() => {
    const info = this.paymentInfo();
    if (info?.usdt_amount) {
      return info.usdt_amount.toFixed(2);
    }
    const usd = this.payAmount() / 100;
    return usd.toFixed(2);
  });
  
  usdtAddress = computed(() => {
    return this.paymentInfo()?.usdt_address || 'TYourTRC20WalletAddressHere';
  });
  
  usdtNetwork = computed(() => {
    return this.paymentInfo()?.usdt_network || 'TRC20';
  });
  
  // QR 碼 URL（使用 QR Server API 生成）
  qrCodeUrl = computed(() => {
    const address = this.usdtAddress();
    if (!address || address === 'TYourTRC20WalletAddressHere') {
      return '';
    }
    // 使用 QR Server API 生成 QR 碼
    // 格式：tron 協議 URI 或純地址
    const data = encodeURIComponent(address);
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${data}&bgcolor=ffffff&color=000000&margin=10`;
  });
  
  canProceed = computed(() => {
    return this.rechargeAmount() >= 500;  // 最少 $5
  });
  
  constructor(
    public walletService: WalletService,
    private router: Router
  ) {}
  
  ngOnInit() {
    this.loadPackages();
    this.walletService.loadWallet();
  }
  
  async loadPackages() {
    const packages = await this.walletService.loadRechargePackages();
    this.packages.set(packages);
    
    // 默認選中推薦套餐
    const recommended = packages.find(p => p.is_recommended);
    if (recommended) {
      this.selectedPackage.set(recommended);
    }
  }
  
  selectPackage(pkg: RechargePackage) {
    this.selectedPackage.set(pkg);
    this.customAmount = 0;
  }
  
  selectMethod(method: PaymentMethod) {
    this.selectedMethod.set(method);
  }
  
  onCustomAmountChange() {
    if (this.customAmount > 0) {
      this.selectedPackage.set(null);
    }
  }
  
  formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }
  
  goBack() {
    // 使用全局事件返回錢包頁
    window.dispatchEvent(new CustomEvent('changeView', { detail: 'wallet' }));
  }
  
  async proceed() {
    if (!this.canProceed()) return;
    
    this.loading.set(true);
    
    try {
      // 創建充值訂單
      const result = await this.walletService.createRechargeOrder({
        amount: this.rechargeAmount(),
        paymentMethod: this.selectedMethod()
      });
      
      if (result.success && result.order && result.paymentInfo) {
        this.currentOrder.set(result.order);
        this.paymentInfo.set(result.paymentInfo);
        
        const method = this.selectedMethod();
        
        if (method === 'usdt_trc20') {
          this.showUsdtModal.set(true);
        } else {
          // TODO: 其他支付方式
          alert('此支付方式即將上線');
        }
      } else {
        alert(result.error || '創建訂單失敗');
      }
    } catch (error) {
      console.error('Create order error:', error);
      alert('創建訂單失敗');
    } finally {
      this.loading.set(false);
    }
  }
  
  closeUsdtModal() {
    this.showUsdtModal.set(false);
    this.pollingStatus.set(false);
  }
  
  copyAddress() {
    const address = this.usdtAddress();
    navigator.clipboard.writeText(address);
    alert('地址已複製');
  }
  
  async confirmUsdtPayment() {
    const order = this.currentOrder();
    if (!order) {
      alert('訂單不存在');
      return;
    }
    
    this.loading.set(true);
    
    try {
      // 標記訂單為已支付
      const markResult = await this.walletService.markRechargeOrderPaid(order.order_no);
      
      if (!markResult.success) {
        alert(markResult.error || '標記支付狀態失敗');
        this.loading.set(false);
        return;
      }
      
      // 開始輪詢訂單狀態
      this.pollingStatus.set(true);
      this.showUsdtModal.set(false);
      
      alert('已收到您的支付確認，系統正在處理中...\n到賬後將自動更新餘額。');
      
      // 後台輪詢
      this.pollOrderStatus(order.order_no);
      
      // 先返回錢包頁
      window.dispatchEvent(new CustomEvent('changeView', { detail: 'wallet' }));
      
    } catch (error) {
      console.error('Confirm payment error:', error);
      alert('確認支付失敗');
    } finally {
      this.loading.set(false);
    }
  }
  
  private async pollOrderStatus(orderNo: string) {
    const result = await this.walletService.pollRechargeOrderStatus(orderNo, 10000, 36);
    
    if (result.confirmed) {
      // 充值成功，刷新錢包
      await this.walletService.loadWallet();
      console.log('Recharge confirmed:', orderNo);
    }
    
    this.pollingStatus.set(false);
  }
}
