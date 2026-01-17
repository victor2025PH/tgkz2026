/**
 * 帳號健康儀表盤組件 - 第二階段數據分析
 * Account Health Dashboard with Real-time Monitoring
 * 
 * 功能:
 * 1. 帳號健康評分可視化
 * 2. 風險等級分類
 * 3. 異常行為偵測
 * 4. 恢復建議
 * 5. 歷史趨勢追蹤
 */

import { Component, signal, computed, input, output, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 帳號健康數據
export interface AccountHealthData {
  accountId: number;
  phone: string;
  username?: string;
  healthScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  metrics: HealthMetrics;
  issues: HealthIssue[];
  recommendations: string[];
  lastCheck: Date;
  trendData?: number[];  // 過去7天健康分數趨勢
}

// 健康指標
export interface HealthMetrics {
  messagesSentToday: number;
  dailyLimit: number;
  responseRate: number;
  errorRate: number;
  avgResponseTime: number;
  blockCount: number;
  warmupProgress?: number;
  lastActivity?: Date;
  accountAge?: number;  // 天數
}

// 健康問題
export interface HealthIssue {
  type: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  timestamp: Date;
  resolved?: boolean;
}

// 儀表盤統計
export interface DashboardStats {
  totalAccounts: number;
  healthyAccounts: number;
  atRiskAccounts: number;
  criticalAccounts: number;
  avgHealthScore: number;
}

@Component({
  selector: 'app-account-health-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="account-health-dashboard h-full flex flex-col bg-slate-900">
      <!-- 頂部統計 -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">🏥</span>
            帳號健康儀表盤
          </h2>
          <button (click)="refreshAll.emit()"
                  class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg 
                         transition-all flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            刷新狀態
          </button>
        </div>
        
        <!-- 統計卡片 -->
        <div class="grid grid-cols-5 gap-4">
          <!-- 總體健康度 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-slate-400">平均健康度</div>
                <div class="text-3xl font-bold mt-1"
                     [class.text-emerald-400]="stats().avgHealthScore >= 80"
                     [class.text-yellow-400]="stats().avgHealthScore >= 60 && stats().avgHealthScore < 80"
                     [class.text-orange-400]="stats().avgHealthScore >= 40 && stats().avgHealthScore < 60"
                     [class.text-red-400]="stats().avgHealthScore < 40">
                  {{ stats().avgHealthScore.toFixed(0) }}
                </div>
              </div>
              <div class="relative w-14 h-14">
                <svg class="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" 
                          class="text-slate-700" stroke-width="3"/>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor"
                          [class.text-emerald-500]="stats().avgHealthScore >= 80"
                          [class.text-yellow-500]="stats().avgHealthScore >= 60 && stats().avgHealthScore < 80"
                          [class.text-orange-500]="stats().avgHealthScore >= 40 && stats().avgHealthScore < 60"
                          [class.text-red-500]="stats().avgHealthScore < 40"
                          stroke-width="3" stroke-linecap="round"
                          [attr.stroke-dasharray]="stats().avgHealthScore + ',100'"/>
                </svg>
              </div>
            </div>
          </div>
          
          <!-- 健康帳號 -->
          <div class="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
            <div class="text-sm text-emerald-400">健康</div>
            <div class="text-3xl font-bold text-emerald-400 mt-1">{{ stats().healthyAccounts }}</div>
            <div class="text-xs text-slate-400 mt-1">
              {{ getPercentage(stats().healthyAccounts) }}% 帳號
            </div>
          </div>
          
          <!-- 風險帳號 -->
          <div class="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
            <div class="text-sm text-yellow-400">需關注</div>
            <div class="text-3xl font-bold text-yellow-400 mt-1">{{ stats().atRiskAccounts }}</div>
            <div class="text-xs text-slate-400 mt-1">
              {{ getPercentage(stats().atRiskAccounts) }}% 帳號
            </div>
          </div>
          
          <!-- 危急帳號 -->
          <div class="bg-red-500/10 rounded-xl p-4 border border-red-500/30">
            <div class="text-sm text-red-400">危急</div>
            <div class="text-3xl font-bold text-red-400 mt-1">{{ stats().criticalAccounts }}</div>
            <div class="text-xs text-slate-400 mt-1">
              {{ getPercentage(stats().criticalAccounts) }}% 帳號
            </div>
          </div>
          
          <!-- 總帳號 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-sm text-slate-400">總帳號</div>
            <div class="text-3xl font-bold text-white mt-1">{{ stats().totalAccounts }}</div>
            <div class="text-xs text-slate-400 mt-1">
              活躍監控中
            </div>
          </div>
        </div>
      </div>
      
      <!-- 篩選和排序 -->
      <div class="px-4 py-3 border-b border-slate-700/50 flex items-center gap-4">
        <div class="flex bg-slate-800/50 rounded-lg p-0.5">
          @for (filter of riskFilters; track filter.value) {
            <button (click)="activeFilter.set(filter.value)"
                    class="px-3 py-1.5 text-xs rounded-md transition-all flex items-center gap-1"
                    [class.bg-cyan-500]="activeFilter() === filter.value"
                    [class.text-white]="activeFilter() === filter.value"
                    [class.text-slate-400]="activeFilter() !== filter.value">
              <span>{{ filter.icon }}</span>
              <span>{{ filter.label }}</span>
            </button>
          }
        </div>
        
        <div class="flex-1"></div>
        
        <select [(ngModel)]="sortBy" 
                class="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
          <option value="health">按健康度</option>
          <option value="risk">按風險等級</option>
          <option value="activity">按活躍度</option>
          <option value="name">按名稱</option>
        </select>
      </div>
      
      <!-- 帳號列表 -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        @for (account of filteredAccounts(); track account.accountId) {
          <div class="account-card bg-slate-800/50 rounded-xl border transition-all cursor-pointer hover:border-cyan-500/50"
               [class.border-emerald-500/30]="account.riskLevel === 'low'"
               [class.border-yellow-500/30]="account.riskLevel === 'medium'"
               [class.border-orange-500/30]="account.riskLevel === 'high'"
               [class.border-red-500/30]="account.riskLevel === 'critical'"
               (click)="selectAccount.emit(account)">
            
            <div class="p-4">
              <div class="flex items-start gap-4">
                <!-- 健康分數圓環 -->
                <div class="relative flex-shrink-0">
                  <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" 
                            class="text-slate-700" stroke-width="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                            [class.text-emerald-500]="account.healthScore >= 80"
                            [class.text-yellow-500]="account.healthScore >= 60 && account.healthScore < 80"
                            [class.text-orange-500]="account.healthScore >= 40 && account.healthScore < 60"
                            [class.text-red-500]="account.healthScore < 40"
                            stroke-width="3" stroke-linecap="round"
                            [attr.stroke-dasharray]="(account.healthScore * 88 / 100) + ',88'"/>
                  </svg>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-lg font-bold text-white">{{ account.healthScore }}</span>
                  </div>
                </div>
                
                <!-- 帳號信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-white">{{ account.username || account.phone }}</span>
                    <span class="px-2 py-0.5 text-xs rounded-full"
                          [class.bg-emerald-500/20]="account.riskLevel === 'low'"
                          [class.text-emerald-400]="account.riskLevel === 'low'"
                          [class.bg-yellow-500/20]="account.riskLevel === 'medium'"
                          [class.text-yellow-400]="account.riskLevel === 'medium'"
                          [class.bg-orange-500/20]="account.riskLevel === 'high'"
                          [class.text-orange-400]="account.riskLevel === 'high'"
                          [class.bg-red-500/20]="account.riskLevel === 'critical'"
                          [class.text-red-400]="account.riskLevel === 'critical'">
                      {{ getRiskLabel(account.riskLevel) }}
                    </span>
                    <span class="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
                      {{ account.status }}
                    </span>
                  </div>
                  
                  <!-- 指標條 -->
                  <div class="grid grid-cols-4 gap-3 mt-3">
                    <div>
                      <div class="text-xs text-slate-400 mb-1">今日發送</div>
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-cyan-500"
                               [style.width.%]="getSendProgress(account)"></div>
                        </div>
                        <span class="text-xs text-slate-300">
                          {{ account.metrics.messagesSentToday }}/{{ account.metrics.dailyLimit }}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-400 mb-1">回覆率</div>
                      <div class="text-sm font-medium"
                           [class.text-emerald-400]="account.metrics.responseRate >= 20"
                           [class.text-yellow-400]="account.metrics.responseRate >= 10 && account.metrics.responseRate < 20"
                           [class.text-red-400]="account.metrics.responseRate < 10">
                        {{ account.metrics.responseRate.toFixed(1) }}%
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-400 mb-1">錯誤率</div>
                      <div class="text-sm font-medium"
                           [class.text-emerald-400]="account.metrics.errorRate <= 5"
                           [class.text-yellow-400]="account.metrics.errorRate > 5 && account.metrics.errorRate <= 15"
                           [class.text-red-400]="account.metrics.errorRate > 15">
                        {{ account.metrics.errorRate.toFixed(1) }}%
                      </div>
                    </div>
                    <div>
                      <div class="text-xs text-slate-400 mb-1">封禁次數</div>
                      <div class="text-sm font-medium"
                           [class.text-emerald-400]="account.metrics.blockCount === 0"
                           [class.text-yellow-400]="account.metrics.blockCount === 1"
                           [class.text-red-400]="account.metrics.blockCount > 1">
                        {{ account.metrics.blockCount }}
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 趨勢圖 -->
                @if (account.trendData && account.trendData.length > 0) {
                  <div class="flex-shrink-0 w-24">
                    <div class="text-xs text-slate-400 mb-1 text-center">7日趨勢</div>
                    <div class="h-12 flex items-end justify-between gap-0.5">
                      @for (value of account.trendData; track $index) {
                        <div class="flex-1 rounded-t transition-all"
                             [style.height.%]="value"
                             [class.bg-emerald-500]="value >= 80"
                             [class.bg-yellow-500]="value >= 60 && value < 80"
                             [class.bg-orange-500]="value >= 40 && value < 60"
                             [class.bg-red-500]="value < 40">
                        </div>
                      }
                    </div>
                  </div>
                }
                
                <!-- 操作按鈕 -->
                <div class="flex-shrink-0 flex flex-col gap-2">
                  <button (click)="diagnoseAccount.emit(account); $event.stopPropagation()"
                          class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 
                                 rounded-lg transition-all text-xs">
                    🔍 診斷
                  </button>
                  @if (account.riskLevel === 'high' || account.riskLevel === 'critical') {
                    <button (click)="healAccount.emit(account); $event.stopPropagation()"
                            class="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 
                                   rounded-lg transition-all text-xs">
                      🩹 修復
                    </button>
                  }
                </div>
              </div>
              
              <!-- 問題列表 -->
              @if (account.issues.length > 0) {
                <div class="mt-3 pt-3 border-t border-slate-700/50">
                  <div class="flex flex-wrap gap-2">
                    @for (issue of account.issues.slice(0, 3); track issue.code) {
                      <span class="px-2 py-1 text-xs rounded-lg flex items-center gap-1"
                            [class.bg-red-500/20]="issue.type === 'error'"
                            [class.text-red-400]="issue.type === 'error'"
                            [class.bg-yellow-500/20]="issue.type === 'warning'"
                            [class.text-yellow-400]="issue.type === 'warning'"
                            [class.bg-blue-500/20]="issue.type === 'info'"
                            [class.text-blue-400]="issue.type === 'info'">
                        @if (issue.type === 'error') { ⛔ }
                        @else if (issue.type === 'warning') { ⚠️ }
                        @else { ℹ️ }
                        {{ issue.message }}
                      </span>
                    }
                    @if (account.issues.length > 3) {
                      <span class="px-2 py-1 text-xs bg-slate-700 text-slate-400 rounded-lg">
                        +{{ account.issues.length - 3 }} 更多
                      </span>
                    }
                  </div>
                </div>
              }
              
              <!-- 建議 -->
              @if (account.recommendations.length > 0 && (account.riskLevel === 'high' || account.riskLevel === 'critical')) {
                <div class="mt-3 p-3 bg-slate-700/30 rounded-lg">
                  <div class="text-xs text-slate-400 mb-1">💡 建議</div>
                  <div class="text-sm text-slate-300">{{ account.recommendations[0] }}</div>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="text-center py-12">
            <div class="text-4xl mb-3">🏥</div>
            <p class="text-slate-400">暫無帳號數據</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 3px; }
    .account-card:hover { transform: translateY(-2px); }
  `]
})
export class AccountHealthDashboardComponent implements OnInit {
  // 輸入
  accounts = input<AccountHealthData[]>([]);
  
  // 輸出
  selectAccount = output<AccountHealthData>();
  diagnoseAccount = output<AccountHealthData>();
  healAccount = output<AccountHealthData>();
  refreshAll = output<void>();
  
  // 狀態
  activeFilter = signal<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  sortBy = 'health';
  
  // 篩選器配置
  riskFilters = [
    { value: 'all' as const, icon: '📋', label: '全部' },
    { value: 'low' as const, icon: '✅', label: '健康' },
    { value: 'medium' as const, icon: '⚠️', label: '關注' },
    { value: 'high' as const, icon: '🔶', label: '風險' },
    { value: 'critical' as const, icon: '🔴', label: '危急' }
  ];
  
  // 計算屬性
  stats = computed<DashboardStats>(() => {
    const all = this.accounts();
    const totalAccounts = all.length;
    const healthyAccounts = all.filter(a => a.riskLevel === 'low').length;
    const atRiskAccounts = all.filter(a => a.riskLevel === 'medium' || a.riskLevel === 'high').length;
    const criticalAccounts = all.filter(a => a.riskLevel === 'critical').length;
    const avgHealthScore = totalAccounts > 0 
      ? all.reduce((sum, a) => sum + a.healthScore, 0) / totalAccounts 
      : 0;
    
    return {
      totalAccounts,
      healthyAccounts,
      atRiskAccounts,
      criticalAccounts,
      avgHealthScore
    };
  });
  
  filteredAccounts = computed(() => {
    const filter = this.activeFilter();
    let accounts = this.accounts();
    
    if (filter !== 'all') {
      accounts = accounts.filter(a => a.riskLevel === filter);
    }
    
    // 排序
    switch (this.sortBy) {
      case 'health':
        return [...accounts].sort((a, b) => a.healthScore - b.healthScore);
      case 'risk':
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return [...accounts].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);
      case 'activity':
        return [...accounts].sort((a, b) => b.metrics.messagesSentToday - a.metrics.messagesSentToday);
      case 'name':
        return [...accounts].sort((a, b) => (a.username || a.phone).localeCompare(b.username || b.phone));
      default:
        return accounts;
    }
  });
  
  ngOnInit() {}
  
  // 獲取百分比
  getPercentage(count: number): string {
    const total = this.stats().totalAccounts;
    if (total === 0) return '0';
    return ((count / total) * 100).toFixed(0);
  }
  
  // 獲取風險標籤
  getRiskLabel(level: string): string {
    const labels: Record<string, string> = {
      low: '健康',
      medium: '需關注',
      high: '高風險',
      critical: '危急'
    };
    return labels[level] || level;
  }
  
  // 獲取發送進度
  getSendProgress(account: AccountHealthData): number {
    if (account.metrics.dailyLimit === 0) return 0;
    return (account.metrics.messagesSentToday / account.metrics.dailyLimit) * 100;
  }
}
