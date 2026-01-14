/**
 * Membership UI Components
 * 會員狀態顯示、升級提示、激活對話框
 */
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService, MembershipLevel, PricingPlan } from './membership.service';
import { ToastService } from './toast.service';

// ============ 會員狀態徽章 ============

@Component({
  selector: 'app-membership-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="membership-badge flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
         [class]="badgeClass()"
         (click)="showDetails = !showDetails">
      <span class="text-lg">{{ membershipService.levelIcon() }}</span>
      <span class="text-sm font-medium">{{ membershipService.levelName() }}</span>
      @if(membershipService.daysRemaining() > 0 && membershipService.daysRemaining() <= 7) {
        <span class="text-xs bg-red-500/50 px-1.5 py-0.5 rounded">
          {{ membershipService.daysRemaining() }}天
        </span>
      }
    </div>
    
    @if(showDetails) {
      <div class="absolute top-full right-0 mt-2 w-72 bg-slate-800 rounded-lg shadow-xl border border-slate-600 p-4 z-50">
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">{{ membershipService.levelIcon() }}</span>
          <span class="text-lg font-bold text-white">{{ membershipService.levelName() }}</span>
        </div>
        
        @if(membershipService.level() !== 'bronze') {
          <div class="text-sm text-slate-300 mb-3">
            @if(membershipService.daysRemaining() > 0) {
              <span>到期時間：{{ membershipService.membership()?.expiresAt | date:'yyyy-MM-dd' }}</span>
            } @else {
              <span class="text-red-400">會員已過期</span>
            }
          </div>
        }
        
        <!-- 使用量 -->
        <div class="space-y-2 mb-4">
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>今日消息</span>
              <span>{{ usage().todayMessages }} / {{ quotaText('messages') }}</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5">
              <div class="bg-cyan-500 h-1.5 rounded-full transition-all" 
                   [style.width.%]="usagePercent().messages"></div>
            </div>
          </div>
          <div>
            <div class="flex justify-between text-xs text-slate-400 mb-1">
              <span>今日 AI</span>
              <span>{{ usage().todayAiCalls }} / {{ quotaText('ai') }}</span>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-1.5">
              <div class="bg-purple-500 h-1.5 rounded-full transition-all" 
                   [style.width.%]="usagePercent().ai"></div>
            </div>
          </div>
        </div>
        
        <!-- 按鈕 -->
        <div class="flex gap-2">
          <button (click)="openActivate()" 
                  class="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm py-2 rounded-lg hover:opacity-90">
            {{ membershipService.level() === 'bronze' ? '激活會員' : '續費/升級' }}
          </button>
          <button (click)="showDetails = false" 
                  class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-block;
    }
    .membership-badge.bronze { background: linear-gradient(135deg, #CD7F32, #8B4513); color: white; }
    .membership-badge.silver { background: linear-gradient(135deg, #C0C0C0, #A8A8A8); color: #1f2937; }
    .membership-badge.gold { background: linear-gradient(135deg, #FFD700, #FFA500); color: #1f2937; }
    .membership-badge.diamond { background: linear-gradient(135deg, #B9F2FF, #87CEEB); color: #1f2937; }
    .membership-badge.star { background: linear-gradient(135deg, #9B59B6, #8E44AD); color: white; }
    .membership-badge.king { background: linear-gradient(135deg, #FF6B6B, #EE5A5A); color: white; }
  `]
})
export class MembershipBadgeComponent {
  membershipService = inject(MembershipService);
  showDetails = false;
  
  badgeClass = computed(() => this.membershipService.level());
  usage = computed(() => this.membershipService.usage());
  usagePercent = computed(() => this.membershipService.getUsagePercentage());
  
  quotaText(type: 'messages' | 'ai'): string {
    const quotas = this.membershipService.quotas();
    const value = type === 'messages' ? quotas.dailyMessages : quotas.dailyAiCalls;
    return value === -1 ? '∞' : value.toString();
  }
  
  openActivate(): void {
    this.showDetails = false;
    // 觸發打開激活對話框的事件
    window.dispatchEvent(new CustomEvent('open-membership-dialog'));
  }
}

// ============ 會員激活對話框 ============

@Component({
  selector: 'app-membership-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if(show()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
           (click)="close()">
        <div class="bg-slate-800 rounded-2xl shadow-2xl border border-slate-600 w-full max-w-4xl max-h-[90vh] overflow-hidden"
             (click)="$event.stopPropagation()">
          
          <!-- 標題欄 -->
          <div class="bg-gradient-to-r from-cyan-500 to-purple-600 p-6">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-2xl font-bold text-white">🚀 升級您的 TG-AI智控王</h2>
                <p class="text-white/80 mt-1">解鎖更多功能，提升營銷效率</p>
              </div>
              <button (click)="close()" class="text-white/80 hover:text-white p-2">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <!-- 標籤切換 -->
            <div class="flex gap-4 mt-4">
              <button (click)="activeTab.set('plans')"
                      [class.text-white]="activeTab() === 'plans'"
                      [class.text-white/60]="activeTab() !== 'plans'"
                      class="font-medium pb-2 border-b-2 transition-colors"
                      [class.border-white]="activeTab() === 'plans'"
                      [class.border-transparent]="activeTab() !== 'plans'">
                會員方案
              </button>
              <button (click)="activeTab.set('activate')"
                      [class.text-white]="activeTab() === 'activate'"
                      [class.text-white/60]="activeTab() !== 'activate'"
                      class="font-medium pb-2 border-b-2 transition-colors"
                      [class.border-white]="activeTab() === 'activate'"
                      [class.border-transparent]="activeTab() !== 'activate'">
                激活卡密
              </button>
              <button (click)="activeTab.set('invite')"
                      [class.text-white]="activeTab() === 'invite'"
                      [class.text-white/60]="activeTab() !== 'invite'"
                      class="font-medium pb-2 border-b-2 transition-colors"
                      [class.border-white]="activeTab() === 'invite'"
                      [class.border-transparent]="activeTab() !== 'invite'">
                邀請獎勵
              </button>
            </div>
          </div>
          
          <!-- 內容區 -->
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            
            <!-- 會員方案 -->
            @if(activeTab() === 'plans') {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                @for(plan of plans; track plan.level) {
                  <div class="relative rounded-xl border-2 p-4 transition-all"
                       [class.border-cyan-500]="plan.level === membershipService.level()"
                       [class.border-slate-600]="plan.level !== membershipService.level()"
                       [class.bg-slate-700/50]="plan.level === membershipService.level()"
                       [class.bg-slate-800]="plan.level !== membershipService.level()">
                    
                    @if(plan.recommended) {
                      <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs px-3 py-1 rounded-full">
                        推薦
                      </div>
                    }
                    
                    @if(plan.level === membershipService.level()) {
                      <div class="absolute -top-3 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        當前
                      </div>
                    }
                    
                    <div class="text-center mb-4">
                      <span class="text-3xl">{{ plan.icon }}</span>
                      <h3 class="text-lg font-bold text-white mt-2">{{ plan.name }}</h3>
                      <div class="mt-2">
                        @if(plan.monthlyPrice === 0) {
                          <span class="text-2xl font-bold text-green-400">免費</span>
                        } @else {
                          <span class="text-2xl font-bold text-white">{{ plan.monthlyPrice }} USDT</span>
                          <span class="text-slate-400">/月</span>
                        }
                      </div>
                      @if(plan.yearlyPrice > 0) {
                        <div class="text-sm text-slate-400 mt-1">
                          年付 {{ plan.yearlyPrice }} USDT (省 {{ Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) }}%)
                        </div>
                      }
                    </div>
                    
                    <ul class="space-y-2 text-sm">
                      @for(feature of plan.features; track feature) {
                        <li class="flex items-start gap-2 text-slate-300">
                          <svg class="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                          </svg>
                          {{ feature }}
                        </li>
                      }
                    </ul>
                    
                    <button class="w-full mt-4 py-2 rounded-lg font-medium transition-colors"
                            [class.bg-gradient-to-r]="plan.level !== 'bronze'"
                            [class.from-cyan-500]="plan.level !== 'bronze'"
                            [class.to-blue-500]="plan.level !== 'bronze'"
                            [class.text-white]="plan.level !== 'bronze'"
                            [class.bg-slate-700]="plan.level === 'bronze'"
                            [class.text-slate-400]="plan.level === 'bronze'"
                            [disabled]="plan.level === 'bronze'"
                            (click)="selectPlan(plan)">
                      {{ plan.level === 'bronze' ? '當前方案' : (plan.level === membershipService.level() ? '續費' : '選擇') }}
                    </button>
                  </div>
                }
              </div>
              
              <!-- 支付說明 -->
              <div class="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <h4 class="font-medium text-white mb-2">💳 購買方式</h4>
                <p class="text-sm text-slate-300">
                  請聯繫客服購買卡密，或通過官方渠道獲取。購買後在「激活卡密」標籤中輸入激活碼。
                </p>
                <div class="flex gap-4 mt-3">
                  <a href="#" class="text-sm text-cyan-400 hover:underline">📱 聯繫客服</a>
                  <a href="#" class="text-sm text-cyan-400 hover:underline">🌐 官方商城</a>
                </div>
              </div>
            }
            
            <!-- 激活卡密 -->
            @if(activeTab() === 'activate') {
              <div class="max-w-md mx-auto">
                <div class="text-center mb-6">
                  <div class="text-4xl mb-2">🔑</div>
                  <h3 class="text-xl font-bold text-white">激活會員卡密</h3>
                  <p class="text-slate-400 mt-1">輸入您購買的卡密激活會員</p>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm text-slate-300 mb-1">卡密</label>
                    <input type="text" 
                           [(ngModel)]="licenseKey"
                           placeholder="TGAI-XX-XXXX-XXXX-XXXX"
                           class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none uppercase tracking-wider font-mono">
                  </div>
                  
                  <div>
                    <label class="block text-sm text-slate-300 mb-1">郵箱 (用於接收通知)</label>
                    <input type="email" 
                           [(ngModel)]="email"
                           placeholder="your@email.com"
                           class="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none">
                  </div>
                  
                  <button (click)="activateLicense()"
                          [disabled]="isActivating()"
                          class="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                    {{ isActivating() ? '激活中...' : '激活' }}
                  </button>
                </div>
                
                <div class="mt-6 p-4 bg-slate-700/50 rounded-lg">
                  <h4 class="font-medium text-white mb-2">📋 卡密格式說明</h4>
                  <ul class="text-sm text-slate-400 space-y-1">
                    <li>• TGAI-B2-XXXX-XXXX-XXXX (🥈 白銀月卡)</li>
                    <li>• TGAI-G2-XXXX-XXXX-XXXX (🥇 黃金月卡)</li>
                    <li>• TGAI-D2-XXXX-XXXX-XXXX (💎 鑽石月卡)</li>
                    <li>• TGAI-S2-XXXX-XXXX-XXXX (🌟 星耀月卡)</li>
                    <li>• TGAI-K2-XXXX-XXXX-XXXX (👑 王者月卡)</li>
                  </ul>
                </div>
              </div>
            }
            
            <!-- 邀請獎勵 -->
            @if(activeTab() === 'invite') {
              <div class="max-w-md mx-auto">
                <div class="text-center mb-6">
                  <div class="text-4xl mb-2">🎁</div>
                  <h3 class="text-xl font-bold text-white">邀請好友，雙方獲益</h3>
                  <p class="text-slate-400 mt-1">分享您的邀請碼，邀請好友註冊</p>
                </div>
                
                <!-- 我的邀請碼 -->
                <div class="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 rounded-xl p-6 mb-6">
                  <div class="text-center">
                    <div class="text-sm text-slate-400 mb-2">我的邀請碼</div>
                    <div class="text-3xl font-mono font-bold text-white tracking-widest mb-3">
                      {{ membershipService.membership()?.inviteCode }}
                    </div>
                    <button (click)="copyInviteCode()" 
                            class="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors">
                      📋 複製邀請碼
                    </button>
                  </div>
                </div>
                
                <!-- 邀請統計 -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                  <div class="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ membershipService.membership()?.inviteCount || 0 }}</div>
                    <div class="text-sm text-slate-400">已邀請人數</div>
                  </div>
                  <div class="bg-slate-700/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-green-400">{{ membershipService.membership()?.inviteRewards || 0 }}天</div>
                    <div class="text-sm text-slate-400">獲得獎勵</div>
                  </div>
                </div>
                
                <!-- 獎勵規則 -->
                <div class="bg-slate-700/50 rounded-lg p-4">
                  <h4 class="font-medium text-white mb-3">🎯 獎勵規則</h4>
                  <ul class="space-y-2 text-sm text-slate-300">
                    <li class="flex items-center gap-2">
                      <span class="text-green-400">✓</span>
                      邀請 1 人註冊：您獲得 3 天會員
                    </li>
                    <li class="flex items-center gap-2">
                      <span class="text-green-400">✓</span>
                      被邀請人獲得：1 天會員體驗
                    </li>
                    <li class="flex items-center gap-2">
                      <span class="text-green-400">✓</span>
                      被邀請人首次付費：獲得豐厚獎勵
                    </li>
                    <li class="flex items-center gap-2">
                      <span class="text-green-400">✓</span>
                      被邀請人重複付費：10% 返傭
                    </li>
                  </ul>
                </div>
                
                <!-- 使用邀請碼 -->
                <div class="mt-6 p-4 border border-dashed border-slate-600 rounded-lg">
                  <h4 class="font-medium text-white mb-2">🎟️ 使用邀請碼</h4>
                  <div class="flex gap-2">
                    <input type="text" 
                           [(ngModel)]="inviteCodeInput"
                           placeholder="輸入好友的邀請碼"
                           class="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm uppercase">
                    <button (click)="applyInviteCode()"
                            class="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm">
                      使用
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class MembershipDialogComponent {
  membershipService = inject(MembershipService);
  toastService = inject(ToastService);
  
  show = signal(false);
  activeTab = signal<'plans' | 'activate' | 'invite'>('plans');
  isActivating = signal(false);
  
  licenseKey = '';
  email = '';
  inviteCodeInput = '';
  
  plans = this.membershipService.getPricingPlans();
  Math = Math;
  
  constructor() {
    // 監聽打開對話框事件
    window.addEventListener('open-membership-dialog', () => {
      this.show.set(true);
    });
  }
  
  close(): void {
    this.show.set(false);
  }
  
  selectPlan(plan: PricingPlan): void {
    if (plan.level === 'bronze') return;
    this.activeTab.set('activate');
    this.toastService.info(`請購買 ${plan.name} 卡密後在此激活`);
  }
  
  async activateLicense(): Promise<void> {
    if (!this.licenseKey.trim()) {
      this.toastService.warning('請輸入卡密');
      return;
    }
    
    this.isActivating.set(true);
    
    try {
      const result = await this.membershipService.activateMembership(
        this.licenseKey.trim(),
        this.email.trim()
      );
      
      if (result.success) {
        this.toastService.success(result.message, 5000);
        this.licenseKey = '';
        this.email = '';
        this.close();
      } else {
        this.toastService.error(result.message);
      }
    } catch (e) {
      this.toastService.error('激活失敗，請稍後重試');
    } finally {
      this.isActivating.set(false);
    }
  }
  
  copyInviteCode(): void {
    const code = this.membershipService.membership()?.inviteCode;
    if (code) {
      navigator.clipboard.writeText(code);
      this.toastService.success('邀請碼已複製');
    }
  }
  
  async applyInviteCode(): Promise<void> {
    if (!this.inviteCodeInput.trim()) {
      this.toastService.warning('請輸入邀請碼');
      return;
    }
    
    const result = await this.membershipService.applyInviteCode(this.inviteCodeInput.trim());
    
    if (result.success) {
      this.toastService.success(result.message, 5000);
      this.inviteCodeInput = '';
    } else {
      this.toastService.error(result.message);
    }
  }
}

// ============ 升級提示組件 ============

@Component({
  selector: 'app-upgrade-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(show && suggestion) {
      <div class="fixed bottom-4 right-4 max-w-sm bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl shadow-2xl border border-slate-600 p-4 z-40 animate-slide-up">
        <button (click)="dismiss()" class="absolute top-2 right-2 text-slate-500 hover:text-white">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div class="flex items-start gap-3">
          <div class="text-3xl">⚡</div>
          <div class="flex-1">
            <h4 class="font-bold text-white mb-1">{{ message }}</h4>
            <p class="text-sm text-slate-300 mb-3">
              升級到 {{ nextLevelName }} 獲得更多配額
            </p>
            <ul class="text-xs text-slate-400 space-y-1 mb-3">
              @for(benefit of suggestion.benefits.slice(0, 3); track benefit) {
                <li>✨ {{ benefit }}</li>
              }
            </ul>
            <button (click)="upgrade()" 
                    class="bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90">
              立即升級 {{ suggestion.price }} USDT/月
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-slide-up { animation: slide-up 0.3s ease-out; }
  `]
})
export class UpgradePromptComponent {
  membershipService = inject(MembershipService);
  
  show = false;
  message = '';
  suggestion = this.membershipService.getUpgradeSuggestion();
  
  get nextLevelName(): string {
    if (!this.suggestion?.nextLevel) return '';
    const names: Record<MembershipLevel, string> = {
      bronze: '青銅戰士', silver: '白銀精英', gold: '黃金大師', 
      diamond: '鑽石王牌', star: '星耀傳說', king: '榮耀王者'
    };
    return names[this.suggestion.nextLevel];
  }
  
  showPrompt(message: string): void {
    this.message = message;
    this.suggestion = this.membershipService.getUpgradeSuggestion();
    if (this.suggestion) {
      this.show = true;
    }
  }
  
  dismiss(): void {
    this.show = false;
  }
  
  upgrade(): void {
    this.dismiss();
    window.dispatchEvent(new CustomEvent('open-membership-dialog'));
  }
}
