/**
 * TG-AI智控王 多帳號管理面板
 * Account Panel Component v1.0
 */
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountManager, TelegramAccount, AccountHealth, AccountStatus } from './account-manager';
import { LoadBalancer, BalancingStrategy } from './load-balancer';

type PanelTab = 'accounts' | 'health' | 'tasks' | 'settings';

@Component({
  selector: 'app-account-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <!-- 頂部標題 -->
      <div class="px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-2xl">👥</span>
            <h2 class="text-xl font-bold">多帳號管理</h2>
            <span class="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400">
              {{ accountManager.accounts().length }} 個帳號
            </span>
          </div>
          
          <!-- Tab 切換 -->
          <div class="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            @for (tab of tabs; track tab.id) {
              <button (click)="currentTab.set(tab.id)"
                      [class]="currentTab() === tab.id 
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400' 
                        : 'text-slate-400 hover:text-white'"
                      class="px-4 py-2 rounded-lg transition-all flex items-center gap-2">
                <span>{{ tab.icon }}</span>
                <span>{{ tab.name }}</span>
              </button>
            }
          </div>
        </div>
      </div>
      
      <!-- 快速統計 -->
      <div class="px-6 py-4 grid grid-cols-5 gap-4">
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">活躍帳號</p>
              <p class="text-2xl font-bold text-green-400">{{ accountSummary().active }}</p>
            </div>
            <span class="text-2xl">🟢</span>
          </div>
        </div>
        
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">預熱中</p>
              <p class="text-2xl font-bold text-yellow-400">{{ accountSummary().warming }}</p>
            </div>
            <span class="text-2xl">🔥</span>
          </div>
        </div>
        
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">受限/封禁</p>
              <p class="text-2xl font-bold text-red-400">{{ accountSummary().limited }}</p>
            </div>
            <span class="text-2xl">⚠️</span>
          </div>
        </div>
        
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">平均健康度</p>
              <p class="text-2xl font-bold" [class]="getHealthColor(accountSummary().avgHealth)">
                {{ accountSummary().avgHealth.toFixed(0) }}%
              </p>
            </div>
            <span class="text-2xl">💚</span>
          </div>
        </div>
        
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-slate-400">待處理任務</p>
              <p class="text-2xl font-bold text-blue-400">{{ loadBalancer.getQueueLength() }}</p>
            </div>
            <span class="text-2xl">📋</span>
          </div>
        </div>
      </div>
      
      <!-- 內容區 -->
      <div class="flex-1 overflow-auto px-6 pb-6">
        <!-- 帳號列表 Tab -->
        @if (currentTab() === 'accounts') {
          <div class="space-y-4">
            <!-- 添加帳號按鈕 -->
            <div class="flex justify-between items-center">
              <h3 class="font-semibold">帳號列表</h3>
              <button (click)="showAddAccount.set(true)"
                      class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:opacity-90 transition-all">
                + 添加帳號
              </button>
            </div>
            
            <!-- 帳號卡片 -->
            @for (account of accountManager.accounts(); track account.id) {
              <div class="bg-slate-800/50 rounded-xl p-5 border transition-all"
                   [class]="account.id === accountManager.activeAccountId() 
                     ? 'border-cyan-500/50 shadow-lg shadow-cyan-500/10' 
                     : 'border-slate-700/50 hover:border-slate-600'">
                <div class="flex items-center gap-4">
                  <!-- 狀態指示器 -->
                  <div class="relative">
                    <div class="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xl font-bold">
                      {{ getInitials(account) }}
                    </div>
                    <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-800"
                         [class]="getStatusBgColor(account.status)"></div>
                  </div>
                  
                  <!-- 帳號信息 -->
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <h4 class="font-semibold">{{ account.firstName || account.phone }}</h4>
                      @if (account.role === 'primary') {
                        <span class="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-400">主帳號</span>
                      }
                      @if (account.role === 'dedicated') {
                        <span class="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">專用</span>
                      }
                      @if (account.status === 'warming') {
                        <span class="px-2 py-0.5 text-xs rounded bg-orange-500/20 text-orange-400">
                          預熱中 {{ account.warmupProgress?.day }}/{{ account.warmupProgress?.totalDays }}
                        </span>
                      }
                    </div>
                    <div class="flex items-center gap-4 mt-1 text-sm text-slate-400">
                      <span>{{ account.phone }}</span>
                      @if (account.username) {
                        <span>&#64;{{ account.username }}</span>
                      }
                      <span>{{ getStatusLabel(account.status) }}</span>
                    </div>
                  </div>
                  
                  <!-- 健康度 -->
                  <div class="text-center px-4">
                    <div class="text-2xl font-bold" [class]="getHealthColor(account.healthScore)">
                      {{ account.healthScore }}
                    </div>
                    <p class="text-xs text-slate-500">健康度</p>
                  </div>
                  
                  <!-- 配額使用 -->
                  <div class="text-center px-4">
                    <div class="space-y-1">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-500 w-12">消息</span>
                        <div class="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-cyan-500 transition-all"
                               [style.width.%]="(account.quotas.dailyMessagesUsed / account.quotas.dailyMessages) * 100">
                          </div>
                        </div>
                        <span class="text-xs">{{ account.quotas.dailyMessagesUsed }}/{{ account.quotas.dailyMessages }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-500 w-12">搜索</span>
                        <div class="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-purple-500 transition-all"
                               [style.width.%]="(account.quotas.dailySearchesUsed / account.quotas.dailySearches) * 100">
                          </div>
                        </div>
                        <span class="text-xs">{{ account.quotas.dailySearchesUsed }}/{{ account.quotas.dailySearches }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex items-center gap-2">
                    @if (account.status === 'offline') {
                      <button (click)="accountManager.connectAccount(account.id)"
                              class="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all">
                        連接
                      </button>
                    } @else if (account.status === 'active' || account.status === 'idle') {
                      <button (click)="accountManager.disconnectAccount(account.id)"
                              class="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all">
                        斷開
                      </button>
                    }
                    
                    @if (account.id !== accountManager.activeAccountId() && account.status !== 'offline') {
                      <button (click)="accountManager.switchToAccount(account.id)"
                              class="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-all">
                        切換
                      </button>
                    }
                    
                    <button (click)="confirmDelete(account)"
                            class="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all">
                      🗑️
                    </button>
                  </div>
                </div>
                
                <!-- 風險標記 -->
                @if (account.riskFlags.length > 0) {
                  <div class="mt-3 pt-3 border-t border-slate-700/50">
                    <div class="flex flex-wrap gap-2">
                      @for (flag of account.riskFlags; track flag) {
                        <span class="px-2 py-1 text-xs bg-red-500/10 text-red-400 rounded">
                          ⚠️ {{ flag }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
            
            @if (accountManager.accounts().length === 0) {
              <div class="text-center py-20 text-slate-500">
                <div class="text-4xl mb-4">👤</div>
                <p>尚未添加任何帳號</p>
                <p class="text-sm mt-1">添加 Telegram 帳號以開始使用</p>
              </div>
            }
          </div>
        }
        
        <!-- 健康度 Tab -->
        @if (currentTab() === 'health') {
          <div class="space-y-4">
            @for (account of accountManager.accounts(); track account.id) {
              @if (accountManager.accountHealth().get(account.id); as health) {
                <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <h4 class="font-semibold">{{ account.firstName || account.phone }}</h4>
                      <span class="text-sm text-slate-400">{{ account.phone }}</span>
                    </div>
                    <div class="text-2xl font-bold" [class]="getHealthColor(health.score)">
                      {{ health.score }}分
                    </div>
                  </div>
                  
                  <!-- 健康度因素 -->
                  <div class="grid grid-cols-5 gap-4 mb-4">
                    <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                      <p class="text-lg font-semibold">{{ health.factors.activity.toFixed(0) }}</p>
                      <p class="text-xs text-slate-400">活躍度</p>
                    </div>
                    <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                      <p class="text-lg font-semibold">{{ health.factors.errorRate.toFixed(0) }}</p>
                      <p class="text-xs text-slate-400">錯誤率</p>
                    </div>
                    <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                      <p class="text-lg font-semibold">{{ health.factors.quotaUsage.toFixed(0) }}</p>
                      <p class="text-xs text-slate-400">配額</p>
                    </div>
                    <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                      <p class="text-lg font-semibold">{{ health.factors.age.toFixed(0) }}</p>
                      <p class="text-xs text-slate-400">帳號年齡</p>
                    </div>
                    <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                      <p class="text-lg font-semibold">{{ health.factors.warmupStatus.toFixed(0) }}</p>
                      <p class="text-xs text-slate-400">預熱</p>
                    </div>
                  </div>
                  
                  <!-- 警告和建議 -->
                  @if (health.warnings.length > 0 || health.recommendations.length > 0) {
                    <div class="flex flex-wrap gap-2">
                      @for (warning of health.warnings; track warning) {
                        <span class="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-400 rounded">
                          ⚠️ {{ warning }}
                        </span>
                      }
                      @for (rec of health.recommendations; track rec) {
                        <span class="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded">
                          💡 {{ rec }}
                        </span>
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        }
        
        <!-- 任務 Tab -->
        @if (currentTab() === 'tasks') {
          <div class="space-y-4">
            <!-- 負載均衡設置 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h3 class="font-semibold mb-4">負載均衡策略</h3>
              <div class="grid grid-cols-4 gap-3">
                @for (strategy of strategies; track strategy.id) {
                  <button (click)="loadBalancer.setStrategy(strategy.id)"
                          [class]="loadBalancer.strategy() === strategy.id 
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                            : 'bg-slate-700/30 border-slate-600 text-slate-300 hover:border-slate-500'"
                          class="p-4 rounded-xl border transition-all text-left">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xl">{{ strategy.icon }}</span>
                      <span class="font-medium">{{ strategy.name }}</span>
                    </div>
                    <p class="text-xs text-slate-400">{{ strategy.description }}</p>
                  </button>
                }
              </div>
            </div>
            
            <!-- 任務統計 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <h3 class="font-semibold mb-4">任務統計</h3>
              <div class="grid grid-cols-4 gap-4">
                <div class="text-center p-4 bg-slate-700/30 rounded-lg">
                  <p class="text-2xl font-bold text-blue-400">{{ loadBalancer.stats().totalTasks }}</p>
                  <p class="text-sm text-slate-400">總任務數</p>
                </div>
                <div class="text-center p-4 bg-slate-700/30 rounded-lg">
                  <p class="text-2xl font-bold text-green-400">{{ loadBalancer.stats().completedTasks }}</p>
                  <p class="text-sm text-slate-400">已完成</p>
                </div>
                <div class="text-center p-4 bg-slate-700/30 rounded-lg">
                  <p class="text-2xl font-bold text-red-400">{{ loadBalancer.stats().failedTasks }}</p>
                  <p class="text-sm text-slate-400">失敗</p>
                </div>
                <div class="text-center p-4 bg-slate-700/30 rounded-lg">
                  <p class="text-2xl font-bold text-purple-400">{{ loadBalancer.stats().avgResponseTime.toFixed(0) }}ms</p>
                  <p class="text-sm text-slate-400">平均響應</p>
                </div>
              </div>
            </div>
            
            <!-- 當前隊列 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold">任務隊列</h3>
                <span class="text-sm text-slate-400">{{ loadBalancer.getQueueLength() }} 個待處理</span>
              </div>
              
              @if (loadBalancer.taskQueue().length > 0) {
                <div class="space-y-2">
                  @for (task of loadBalancer.taskQueue().slice(0, 10); track task.id) {
                    <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div class="flex items-center gap-3">
                        <span class="text-lg">{{ getTaskIcon(task.type) }}</span>
                        <div>
                          <p class="font-medium">{{ task.type }}</p>
                          <p class="text-xs text-slate-400">{{ task.id }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 text-xs rounded"
                              [class]="task.priority === 'high' ? 'bg-red-500/20 text-red-400' 
                                : task.priority === 'low' ? 'bg-slate-500/20 text-slate-400'
                                : 'bg-blue-500/20 text-blue-400'">
                          {{ task.priority }}
                        </span>
                        <button (click)="loadBalancer.cancelTask(task.id)"
                                class="p-1 text-red-400 hover:bg-red-500/20 rounded transition-all">
                          ✕
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-10 text-slate-500">
                  <p>暫無待處理任務</p>
                </div>
              }
            </div>
          </div>
        }
        
        <!-- 設置 Tab -->
        @if (currentTab() === 'settings') {
          <div class="space-y-4">
            <!-- 自動輪換 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold">自動輪換</h3>
                  <p class="text-sm text-slate-400">自動在帳號間輪換以平衡負載</p>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" 
                         [(ngModel)]="autoRotation"
                         (change)="toggleAutoRotation()"
                         class="sr-only peer">
                  <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            </div>
            
            <!-- 每日配額重置 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold">重置每日配額</h3>
                  <p class="text-sm text-slate-400">手動重置所有帳號的每日使用配額</p>
                </div>
                <button (click)="accountManager.resetDailyQuotas()"
                        class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all">
                  重置配額
                </button>
              </div>
            </div>
            
            <!-- 更新健康度 -->
            <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold">更新健康度</h3>
                  <p class="text-sm text-slate-400">立即重新計算所有帳號的健康度</p>
                </div>
                <button (click)="accountManager.updateAllHealth()"
                        class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all">
                  更新
                </button>
              </div>
            </div>
          </div>
        }
      </div>
      
      <!-- 添加帳號對話框 -->
      @if (showAddAccount()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl p-6 w-[400px] border border-slate-700">
            <h3 class="text-xl font-bold mb-4">添加帳號</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm text-slate-400 mb-1">電話號碼</label>
                <input type="text" 
                       [(ngModel)]="newAccountPhone"
                       placeholder="+86..."
                       class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-cyan-500 focus:outline-none">
              </div>
              
              <div>
                <label class="block text-sm text-slate-400 mb-1">帳號角色</label>
                <select [(ngModel)]="newAccountRole"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:border-cyan-500 focus:outline-none">
                  <option value="secondary">副帳號</option>
                  <option value="dedicated">專用帳號（高風險操作）</option>
                </select>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="showAddAccount.set(false)"
                      class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-all">
                取消
              </button>
              <button (click)="addAccount()"
                      class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-all">
                添加
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class AccountPanelComponent {
  accountManager = inject(AccountManager);
  loadBalancer = inject(LoadBalancer);
  
  // Tab 配置
  tabs = [
    { id: 'accounts' as PanelTab, name: '帳號列表', icon: '👤' },
    { id: 'health' as PanelTab, name: '健康監控', icon: '💚' },
    { id: 'tasks' as PanelTab, name: '任務隊列', icon: '📋' },
    { id: 'settings' as PanelTab, name: '設置', icon: '⚙️' }
  ];
  
  currentTab = signal<PanelTab>('accounts');
  
  // 添加帳號
  showAddAccount = signal(false);
  newAccountPhone = '';
  newAccountRole: 'secondary' | 'dedicated' = 'secondary';
  
  // 自動輪換
  autoRotation = false;
  
  // 負載均衡策略
  strategies = [
    { id: 'weighted-round-robin' as BalancingStrategy, name: '加權輪詢', icon: '🔄', description: '基於健康度和配額分配任務' },
    { id: 'least-connections' as BalancingStrategy, name: '最少連接', icon: '📊', description: '優先使用當前任務最少的帳號' },
    { id: 'response-time' as BalancingStrategy, name: '響應時間', icon: '⚡', description: '優先使用響應最快的帳號' },
    { id: 'risk-isolation' as BalancingStrategy, name: '風險隔離', icon: '🛡️', description: '高風險操作使用專用帳號' }
  ];
  
  // 計算屬性
  accountSummary = computed(() => this.accountManager.getAccountSummary());
  
  // 方法
  getInitials(account: TelegramAccount): string {
    if (account.firstName) {
      return account.firstName.charAt(0).toUpperCase();
    }
    return account.phone.slice(-2);
  }
  
  getStatusLabel(status: AccountStatus): string {
    const labels: Record<AccountStatus, string> = {
      active: '活躍',
      idle: '閒置',
      busy: '忙碌',
      limited: '受限',
      banned: '封禁',
      warming: '預熱中',
      offline: '離線'
    };
    return labels[status] || status;
  }
  
  getStatusBgColor(status: AccountStatus): string {
    const colors: Record<AccountStatus, string> = {
      active: 'bg-green-500',
      idle: 'bg-blue-500',
      busy: 'bg-yellow-500',
      limited: 'bg-orange-500',
      banned: 'bg-red-500',
      warming: 'bg-orange-400',
      offline: 'bg-slate-500'
    };
    return colors[status] || 'bg-slate-500';
  }
  
  getHealthColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  }
  
  getTaskIcon(type: string): string {
    const icons: Record<string, string> = {
      message: '💬',
      search: '🔍',
      extraction: '📥',
      join: '➕',
      other: '📝'
    };
    return icons[type] || '📝';
  }
  
  async addAccount(): Promise<void> {
    if (!this.newAccountPhone) return;
    
    await this.accountManager.addAccount(
      this.newAccountPhone,
      undefined,
      this.newAccountRole
    );
    
    this.newAccountPhone = '';
    this.newAccountRole = 'secondary';
    this.showAddAccount.set(false);
  }
  
  confirmDelete(account: TelegramAccount): void {
    if (confirm(`確定要刪除帳號 ${account.phone} 嗎？`)) {
      this.accountManager.removeAccount(account.id);
    }
  }
  
  toggleAutoRotation(): void {
    if (this.autoRotation) {
      this.accountManager.startAutoRotation();
    } else {
      this.accountManager.stopAutoRotation();
    }
  }
}
