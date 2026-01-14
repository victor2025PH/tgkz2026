/**
 * Payment Component
 * 支付集成組件
 * 
 * 支持：
 * - 支付寶
 * - 微信支付
 * - Stripe (國際卡)
 */
import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LicenseClientService, PaymentOrder } from './license-client.service';
import { MembershipService } from './membership.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if(show()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
           (click)="close()">
        <div class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-hidden"
             (click)="$event.stopPropagation()">
          
          <!-- 標題 -->
          <div class="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 p-6">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold text-white flex items-center gap-2">
                  💳 升級會員
                </h2>
                <p class="text-white/80 mt-1">選擇適合您的方案</p>
              </div>
              <button (click)="close()" class="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div class="p-6 overflow-y-auto max-h-[70vh]">
            
            <!-- 步驟 1: 選擇產品 -->
            @if(step() === 'select') {
              <div class="grid grid-cols-2 gap-4">
                @for(product of products; track product.id) {
                  <div class="relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:scale-[1.02]"
                       [class.border-cyan-500]="selectedProduct()?.id === product.id"
                       [class.bg-cyan-500/10]="selectedProduct()?.id === product.id"
                       [class.border-slate-600]="selectedProduct()?.id !== product.id"
                       (click)="selectProduct(product)">
                    
                    @if(product.recommended) {
                      <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        推薦
                      </div>
                    }
                    
                    @if(product.popular) {
                      <div class="absolute -top-3 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                        熱門
                      </div>
                    }
                    
                    <div class="text-center">
                      <div class="text-lg font-bold text-white">{{ product.levelName }}</div>
                      <div class="text-xs text-slate-400">{{ product.durationName }}</div>
                      <div class="mt-2">
                        <span class="text-3xl font-bold text-emerald-400">{{ product.price }} USDT</span>
                      </div>
                      <div class="text-xs text-slate-500 mt-1">TRC20 網絡</div>
                    </div>
                  </div>
                }
              </div>
              
              <div class="mt-6 flex gap-4">
                <button (click)="close()"
                        class="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                  取消
                </button>
                <button (click)="proceedToPayment()"
                        [disabled]="!selectedProduct()"
                        class="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                  下一步
                </button>
              </div>
            }
            
            <!-- 步驟 2: 選擇支付方式 -->
            @if(step() === 'payment') {
              <div class="text-center mb-6">
                <div class="text-lg text-slate-300">{{ selectedProduct()?.levelName }} - {{ selectedProduct()?.durationName }}</div>
                <div class="text-4xl font-bold text-emerald-400 mt-2">{{ selectedProduct()?.price }} USDT</div>
                <div class="text-sm text-slate-500 mt-1">TRC20 網絡</div>
              </div>
              
              <div class="mb-4">
                <label class="block text-sm text-slate-400 mb-2">郵箱 (用於接收訂單通知)</label>
                <input type="email" 
                       [(ngModel)]="email"
                       placeholder="your@email.com"
                       class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none">
              </div>
              
              <div class="space-y-3 mb-6">
                <label class="block text-sm text-slate-400 mb-2">選擇支付方式</label>
                
                <div class="grid grid-cols-2 gap-3">
                  <button (click)="paymentMethod.set('alipay')"
                          class="flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all"
                          [class.border-cyan-500]="paymentMethod() === 'alipay'"
                          [class.bg-cyan-500/10]="paymentMethod() === 'alipay'"
                          [class.border-slate-600]="paymentMethod() !== 'alipay'">
                    <span class="text-2xl">💙</span>
                    <span class="text-white font-medium">支付寶</span>
                  </button>
                  
                  <button (click)="paymentMethod.set('wechat')"
                          class="flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all"
                          [class.border-cyan-500]="paymentMethod() === 'wechat'"
                          [class.bg-cyan-500/10]="paymentMethod() === 'wechat'"
                          [class.border-slate-600]="paymentMethod() !== 'wechat'">
                    <span class="text-2xl">💚</span>
                    <span class="text-white font-medium">微信支付</span>
                  </button>
                  
                  <button (click)="paymentMethod.set('stripe')"
                          class="flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all"
                          [class.border-cyan-500]="paymentMethod() === 'stripe'"
                          [class.bg-cyan-500/10]="paymentMethod() === 'stripe'"
                          [class.border-slate-600]="paymentMethod() !== 'stripe'">
                    <span class="text-2xl">💳</span>
                    <span class="text-white font-medium">國際卡</span>
                  </button>
                  
                  <button (click)="paymentMethod.set('usdt')"
                          class="flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all"
                          [class.border-cyan-500]="paymentMethod() === 'usdt'"
                          [class.bg-cyan-500/10]="paymentMethod() === 'usdt'"
                          [class.border-slate-600]="paymentMethod() !== 'usdt'">
                    <span class="text-2xl">💎</span>
                    <span class="text-white font-medium">USDT</span>
                  </button>
                </div>
                
                @if(paymentMethod() === 'usdt') {
                  <div class="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div class="flex items-center gap-2 text-emerald-400 text-sm mb-3">
                      <span>💎</span>
                      <span class="font-medium">USDT-TRC20 支付（推薦）</span>
                    </div>
                    <div class="flex items-center gap-3 mb-3">
                      <div class="flex-1 p-2 bg-slate-800 rounded-lg">
                        <div class="text-xs text-slate-500 mb-1">支付金額</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ selectedProduct()?.price }} USDT</div>
                      </div>
                      <div class="flex-1 p-2 bg-slate-800 rounded-lg">
                        <div class="text-xs text-slate-500 mb-1">網絡</div>
                        <div class="text-lg font-bold text-cyan-400">TRC20</div>
                      </div>
                    </div>
                    <div class="text-xs text-orange-400 bg-orange-500/10 rounded-lg p-2">
                      ⚠️ 僅支持 TRC20 網絡，其他網絡轉賬將無法到賬
                    </div>
                  </div>
                }
              </div>
              
              <div class="flex gap-4">
                <button (click)="step.set('select')"
                        class="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                  返回
                </button>
                <button (click)="createOrder()"
                        [disabled]="isProcessing()"
                        class="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {{ isProcessing() ? '處理中...' : '立即支付' }}
                </button>
              </div>
            }
            
            <!-- 步驟 3: 等待支付 -->
            @if(step() === 'pending') {
              <div class="text-center py-8">
                <div class="text-6xl mb-4">{{ paymentMethod() === 'usdt' ? '💎' : '⏳' }}</div>
                <h3 class="text-xl font-bold text-white mb-2">等待支付</h3>
                <p class="text-slate-400 mb-4">
                  {{ paymentMethod() === 'usdt' ? '請向以下地址轉賬 USDT' : '請在新窗口完成支付' }}
                </p>
                
                <div class="bg-slate-700/50 rounded-xl p-4 mb-4">
                  <div class="text-sm text-slate-400">訂單號</div>
                  <div class="text-lg font-mono text-cyan-400">{{ currentOrder()?.order_id }}</div>
                </div>
                
                @if(paymentMethod() === 'usdt') {
                  <!-- USDT TRC20 支付信息 -->
                  <div class="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 mb-4 text-left">
                    <div class="text-center mb-4">
                      <div class="text-3xl font-bold text-emerald-400">{{ selectedProduct()?.price }} USDT</div>
                      <div class="text-sm text-slate-400 mt-1">TRC20 網絡（TRON）</div>
                    </div>
                    
                    <div class="mb-4">
                      <div class="text-xs text-slate-400 mb-2">收款地址（TRC20）</div>
                      <div class="bg-slate-800 rounded-lg p-3">
                        <div class="flex items-center justify-between gap-2">
                          <code class="text-sm text-emerald-400 break-all font-mono">{{ USDT_CONFIG.walletAddress }}</code>
                          <button (click)="copyUsdtAddress()" 
                                  class="flex-shrink-0 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-sm transition-colors">
                            📋 複製
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div class="bg-slate-800/50 rounded-lg p-3 mb-4">
                      <div class="flex items-start gap-3">
                        <div class="text-2xl">📝</div>
                        <div>
                          <div class="text-sm text-white font-medium mb-1">轉賬步驟</div>
                          <ol class="text-xs text-slate-400 space-y-1">
                            <li>1. 打開您的加密貨幣錢包（如 Trust Wallet、TokenPocket）</li>
                            <li>2. 選擇 USDT 資產，點擊「發送」</li>
                            <li>3. 粘貼上方地址，選擇 <span class="text-emerald-400 font-medium">TRC20</span> 網絡</li>
                            <li>4. 輸入金額 <span class="text-emerald-400 font-medium">{{ selectedProduct()?.price }} USDT</span></li>
                            <li>5. 確認轉賬，等待區塊確認</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                    
                    <div class="text-xs text-orange-400 bg-orange-500/10 rounded-lg p-3 flex items-start gap-2">
                      <span>⚠️</span>
                      <div>
                        <strong>重要提醒：</strong>
                        <ul class="mt-1 space-y-0.5">
                          <li>• 僅支持 <strong>TRC20</strong> 網絡，其他網絡轉賬將無法到賬</li>
                          <li>• 請確保轉賬金額正確：<strong>{{ selectedProduct()?.price }} USDT</strong></li>
                          <li>• 轉賬後通常 1-5 分鐘內到賬</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                }
                
                <div class="text-sm text-slate-500 mb-6">
                  {{ paymentMethod() === 'usdt' ? '轉賬成功後點擊「我已支付」' : '支付完成後將自動激活會員' }}
                </div>
                
                <div class="flex gap-4">
                  <button (click)="cancelPayment()"
                          class="flex-1 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors">
                    取消支付
                  </button>
                  <button (click)="checkPaymentStatus()"
                          [disabled]="isChecking()"
                          class="flex-1 py-3 rounded-xl bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-colors disabled:opacity-50">
                    {{ isChecking() ? '檢查中...' : '我已支付' }}
                  </button>
                </div>
              </div>
            }
            
            <!-- 步驟 4: 支付成功 -->
            @if(step() === 'success') {
              <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-xl font-bold text-white mb-2">支付成功！</h3>
                <p class="text-slate-400 mb-4">您的會員已激活</p>
                
                @if(activatedLicenseKey()) {
                  <div class="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-4 mb-6">
                    <div class="text-sm text-slate-400">您的卡密</div>
                    <div class="text-lg font-mono text-cyan-400">{{ activatedLicenseKey() }}</div>
                    <button (click)="copyLicenseKey()"
                            class="mt-2 text-sm text-cyan-400 hover:underline">
                      📋 複製卡密
                    </button>
                  </div>
                }
                
                <button (click)="close()"
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold hover:opacity-90 transition-opacity">
                  開始使用
                </button>
              </div>
            }
            
            <!-- 聯繫客服 -->
            <div class="mt-6 pt-4 border-t border-slate-700 text-center">
              <p class="text-sm text-slate-500">
                遇到問題？
                <a href="#" class="text-cyan-400 hover:underline">聯繫客服</a>
                或
                <a href="#" class="text-cyan-400 hover:underline">查看幫助</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class PaymentComponent implements OnDestroy {
  licenseClient = inject(LicenseClientService);
  membershipService = inject(MembershipService);
  toastService = inject(ToastService);
  
  show = signal(false);
  step = signal<'select' | 'payment' | 'pending' | 'success'>('select');
  
  products = this.licenseClient.products;
  selectedProduct = signal<typeof this.products[0] | null>(null);
  paymentMethod = signal<'alipay' | 'wechat' | 'stripe' | 'usdt'>('usdt');  // 默認 USDT
  
  // USDT TRC20 配置
  readonly USDT_CONFIG = {
    network: 'TRC20',
    // TODO: 替換為您的實際 USDT 收款地址
    walletAddress: 'TYourTRC20WalletAddressHere',
    minAmount: 1,  // 最低支付金額
  };
  email = '';
  
  isProcessing = signal(false);
  isChecking = signal(false);
  
  currentOrder = signal<PaymentOrder | null>(null);
  activatedLicenseKey = signal<string | null>(null);
  
  private checkInterval: any = null;
  
  constructor() {
    // 監聽打開支付對話框的事件
    window.addEventListener('open-payment-dialog', () => {
      this.open();
    });
  }
  
  ngOnDestroy(): void {
    this.stopCheckInterval();
  }
  
  open(): void {
    this.show.set(true);
    this.step.set('select');
    this.selectedProduct.set(null);
    this.currentOrder.set(null);
    this.activatedLicenseKey.set(null);
  }
  
  close(): void {
    this.show.set(false);
    this.stopCheckInterval();
  }
  
  selectProduct(product: typeof this.products[0]): void {
    this.selectedProduct.set(product);
  }
  
  proceedToPayment(): void {
    if (this.selectedProduct()) {
      this.step.set('payment');
    }
  }
  
  // 價格已經是 USDT，不需要轉換
  
  async createOrder(): Promise<void> {
    const product = this.selectedProduct();
    if (!product) return;
    
    this.isProcessing.set(true);
    
    try {
      const result = await this.licenseClient.createPayment(product.id, this.paymentMethod());
      
      if (result.success && result.order) {
        this.currentOrder.set(result.order);
        this.step.set('pending');
        
        // 打開支付頁面
        window.open(result.order.payment_url, '_blank');
        
        // 開始輪詢檢查支付狀態
        this.startCheckInterval();
      } else {
        this.toastService.error(result.message);
      }
    } catch (error) {
      this.toastService.error('創建訂單失敗');
    } finally {
      this.isProcessing.set(false);
    }
  }
  
  async checkPaymentStatus(): Promise<void> {
    const order = this.currentOrder();
    if (!order) return;
    
    this.isChecking.set(true);
    
    try {
      const result = await this.licenseClient.checkPaymentStatus(order.orderId);
      
      if (result.paid) {
        this.stopCheckInterval();
        this.activatedLicenseKey.set(result.licenseKey || null);
        this.step.set('success');
        this.toastService.success('🎉 支付成功，會員已激活！');
        
        // 刷新會員狀態
        if (result.licenseKey) {
          await this.membershipService.activateMembership(result.licenseKey, this.email);
        }
      } else {
        this.toastService.info('支付尚未完成，請繼續支付');
      }
    } catch (error) {
      this.toastService.error('檢查支付狀態失敗');
    } finally {
      this.isChecking.set(false);
    }
  }
  
  cancelPayment(): void {
    this.stopCheckInterval();
    this.step.set('select');
    this.currentOrder.set(null);
  }
  
  copyLicenseKey(): void {
    const key = this.activatedLicenseKey();
    if (key) {
      navigator.clipboard.writeText(key);
      this.toastService.success('卡密已複製');
    }
  }
  
  copyUsdtAddress(): void {
    navigator.clipboard.writeText(this.USDT_CONFIG.walletAddress);
    this.toastService.success('USDT TRC20 地址已複製');
  }
  
  private startCheckInterval(): void {
    // 每 5 秒檢查一次支付狀態
    this.checkInterval = setInterval(() => {
      this.checkPaymentStatus();
    }, 5000);
  }
  
  private stopCheckInterval(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
