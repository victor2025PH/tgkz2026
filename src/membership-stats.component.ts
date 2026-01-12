/**
 * Membership Statistics Component
 * 會員數據統計面板
 * 
 * 顯示：
 * - 會員轉化率
 * - 收入統計
 * - 用戶增長趨勢
 * - 會員等級分布
 */
import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipService } from './membership.service';

export interface DailyStats {
  date: string;
  new_users: number;
  new_activations: number;
  new_payments: number;
  revenue: number;
  active_users: number;
  trial_to_paid: number;
  churn_count: number;
}

export interface StatsData {
  total_licenses: number;
  unused_licenses: number;
  used_licenses: number;
  total_users: number;
  paid_users: number;
  total_revenue: number;
  conversion_rate: number;
  daily_stats: DailyStats[];
  level_distribution: Record<string, number>;
}

@Component({
  selector: 'app-membership-stats',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- 頂部統計卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- 總用戶 -->
        <div class="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 rounded-xl p-5 border border-cyan-500/30">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-cyan-300/80">總用戶</div>
              <div class="text-3xl font-bold text-white mt-1">{{ stats().total_users | number }}</div>
              <div class="text-xs text-cyan-400 mt-1">
                <span class="text-green-400">↑ {{ todayNewUsers() }}</span> 今日新增
              </div>
            </div>
            <div class="text-4xl opacity-50">👥</div>
          </div>
        </div>
        
        <!-- 付費用戶 -->
        <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-5 border border-purple-500/30">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-purple-300/80">付費用戶</div>
              <div class="text-3xl font-bold text-white mt-1">{{ stats().paid_users | number }}</div>
              <div class="text-xs text-purple-400 mt-1">
                轉化率 <span class="text-green-400">{{ stats().conversion_rate | number:'1.1-1' }}%</span>
              </div>
            </div>
            <div class="text-4xl opacity-50">⭐</div>
          </div>
        </div>
        
        <!-- 總收入 -->
        <div class="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl p-5 border border-green-500/30">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-green-300/80">總收入</div>
              <div class="text-3xl font-bold text-white mt-1">¥{{ stats().total_revenue | number:'1.0-0' }}</div>
              <div class="text-xs text-green-400 mt-1">
                <span class="text-green-400">↑ ¥{{ todayRevenue() | number:'1.0-0' }}</span> 今日
              </div>
            </div>
            <div class="text-4xl opacity-50">💰</div>
          </div>
        </div>
        
        <!-- 卡密庫存 -->
        <div class="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-xl p-5 border border-orange-500/30">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm text-orange-300/80">卡密庫存</div>
              <div class="text-3xl font-bold text-white mt-1">{{ stats().unused_licenses | number }}</div>
              <div class="text-xs text-orange-400 mt-1">
                已使用 {{ stats().used_licenses | number }}
              </div>
            </div>
            <div class="text-4xl opacity-50">🔑</div>
          </div>
        </div>
      </div>
      
      <!-- 圖表區域 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 收入趨勢圖 -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📈 收入趨勢
            <span class="text-xs text-slate-500 font-normal">最近30天</span>
          </h3>
          <div class="h-48 flex items-end gap-1">
            @for(day of last30Days(); track day.date) {
              <div class="flex-1 flex flex-col items-center">
                <div class="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t"
                     [style.height.%]="getBarHeight(day.revenue, maxRevenue())"
                     [title]="day.date + ': ¥' + day.revenue"></div>
              </div>
            }
          </div>
          <div class="flex justify-between text-xs text-slate-500 mt-2">
            <span>{{ first30Day() }}</span>
            <span>{{ last30Day() }}</span>
          </div>
        </div>
        
        <!-- 會員等級分布 -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            📊 會員等級分布
          </h3>
          <div class="space-y-4">
            @for(level of levelDistribution(); track level.name) {
              <div>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-slate-300">{{ level.icon }} {{ level.name }}</span>
                  <span class="text-slate-400">{{ level.count }} ({{ level.percentage | number:'1.1-1' }}%)</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-3">
                  <div class="h-3 rounded-full transition-all duration-500"
                       [class]="level.colorClass"
                       [style.width.%]="level.percentage"></div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- 詳細數據表 -->
      <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            📋 每日詳細數據
          </h3>
          <div class="flex gap-2">
            <select [(ngModel)]="selectedDays" 
                    class="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white">
              <option [value]="7">最近7天</option>
              <option [value]="14">最近14天</option>
              <option [value]="30">最近30天</option>
            </select>
            <button (click)="exportStats()" 
                    class="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
              📥 導出
            </button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-slate-400 border-b border-slate-700">
                <th class="pb-3 font-medium">日期</th>
                <th class="pb-3 font-medium text-right">新用戶</th>
                <th class="pb-3 font-medium text-right">激活數</th>
                <th class="pb-3 font-medium text-right">付費數</th>
                <th class="pb-3 font-medium text-right">收入</th>
                <th class="pb-3 font-medium text-right">活躍用戶</th>
                <th class="pb-3 font-medium text-right">轉化</th>
                <th class="pb-3 font-medium text-right">流失</th>
              </tr>
            </thead>
            <tbody>
              @for(day of filteredDailyStats(); track day.date) {
                <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td class="py-3 text-slate-300">{{ day.date }}</td>
                  <td class="py-3 text-right text-cyan-400">{{ day.new_users }}</td>
                  <td class="py-3 text-right text-purple-400">{{ day.new_activations }}</td>
                  <td class="py-3 text-right text-green-400">{{ day.new_payments }}</td>
                  <td class="py-3 text-right text-green-400">¥{{ day.revenue | number:'1.0-0' }}</td>
                  <td class="py-3 text-right text-slate-300">{{ day.active_users }}</td>
                  <td class="py-3 text-right text-emerald-400">{{ day.trial_to_paid }}</td>
                  <td class="py-3 text-right text-red-400">{{ day.churn_count }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-slate-600 font-bold">
                <td class="pt-3 text-slate-300">合計</td>
                <td class="pt-3 text-right text-cyan-400">{{ totalNewUsers() }}</td>
                <td class="pt-3 text-right text-purple-400">{{ totalActivations() }}</td>
                <td class="pt-3 text-right text-green-400">{{ totalPayments() }}</td>
                <td class="pt-3 text-right text-green-400">¥{{ totalRevenueFiltered() | number:'1.0-0' }}</td>
                <td class="pt-3 text-right text-slate-300">-</td>
                <td class="pt-3 text-right text-emerald-400">{{ totalConversions() }}</td>
                <td class="pt-3 text-right text-red-400">{{ totalChurn() }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      <!-- 關鍵指標 -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- ARPU -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div class="text-sm text-slate-400 mb-1">ARPU (每用戶平均收入)</div>
          <div class="text-2xl font-bold text-white">¥{{ arpu() | number:'1.2-2' }}</div>
          <div class="text-xs text-slate-500 mt-1">總收入 / 付費用戶數</div>
        </div>
        
        <!-- LTV -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div class="text-sm text-slate-400 mb-1">預估 LTV (用戶生命週期價值)</div>
          <div class="text-2xl font-bold text-white">¥{{ ltv() | number:'1.2-2' }}</div>
          <div class="text-xs text-slate-500 mt-1">ARPU × 平均訂閱月數</div>
        </div>
        
        <!-- 月度增長率 -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div class="text-sm text-slate-400 mb-1">月度增長率 (MoM)</div>
          <div class="text-2xl font-bold" [class.text-green-400]="mom() >= 0" [class.text-red-400]="mom() < 0">
            {{ mom() >= 0 ? '+' : '' }}{{ mom() | number:'1.1-1' }}%
          </div>
          <div class="text-xs text-slate-500 mt-1">相比上月收入變化</div>
        </div>
      </div>
    </div>
  `
})
export class MembershipStatsComponent implements OnInit, OnDestroy {
  membershipService = inject(MembershipService);
  
  // 模擬數據（實際應從服務器獲取）
  stats = signal<StatsData>({
    total_licenses: 150,
    unused_licenses: 85,
    used_licenses: 65,
    total_users: 1280,
    paid_users: 256,
    total_revenue: 45680,
    conversion_rate: 20.0,
    daily_stats: [],
    level_distribution: { free: 1024, vip: 180, svip: 60, mvp: 16 }
  });
  
  selectedDays = 7;
  private refreshInterval: any = null;
  
  ngOnInit(): void {
    this.loadStats();
    this.generateMockDailyStats();
    
    // 每分鐘刷新
    this.refreshInterval = setInterval(() => this.loadStats(), 60000);
  }
  
  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  async loadStats(): Promise<void> {
    // 實際應從服務器加載
    // const response = await fetch('/api/stats');
    // const data = await response.json();
    // this.stats.set(data);
  }
  
  generateMockDailyStats(): void {
    const stats: DailyStats[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      stats.push({
        date: date.toISOString().split('T')[0],
        new_users: Math.floor(Math.random() * 50) + 10,
        new_activations: Math.floor(Math.random() * 20) + 5,
        new_payments: Math.floor(Math.random() * 10) + 1,
        revenue: Math.floor(Math.random() * 3000) + 500,
        active_users: Math.floor(Math.random() * 200) + 100,
        trial_to_paid: Math.floor(Math.random() * 5),
        churn_count: Math.floor(Math.random() * 3)
      });
    }
    
    this.stats.update(s => ({ ...s, daily_stats: stats }));
  }
  
  // ============ 計算屬性 ============
  
  todayNewUsers(): number {
    const today = this.stats().daily_stats.slice(-1)[0];
    return today?.new_users || 0;
  }
  
  todayRevenue(): number {
    const today = this.stats().daily_stats.slice(-1)[0];
    return today?.revenue || 0;
  }
  
  last30Days(): DailyStats[] {
    return this.stats().daily_stats.slice(-30);
  }
  
  first30Day(): string {
    const days = this.last30Days();
    return days[0]?.date || '';
  }
  
  last30Day(): string {
    const days = this.last30Days();
    return days[days.length - 1]?.date || '';
  }
  
  maxRevenue(): number {
    const days = this.last30Days();
    return Math.max(...days.map(d => d.revenue), 1);
  }
  
  getBarHeight(value: number, max: number): number {
    return Math.max(5, (value / max) * 100);
  }
  
  levelDistribution(): Array<{name: string; icon: string; count: number; percentage: number; colorClass: string}> {
    const dist = this.stats().level_distribution;
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    
    const levels = [
      { key: 'free', name: '新星', icon: '🌟', colorClass: 'bg-slate-500' },
      { key: 'vip', name: '銀星 VIP', icon: '⭐', colorClass: 'bg-yellow-500' },
      { key: 'svip', name: '金星 SVIP', icon: '🌙', colorClass: 'bg-purple-500' },
      { key: 'mvp', name: '星王 MVP', icon: '👑', colorClass: 'bg-gradient-to-r from-yellow-500 to-orange-500' }
    ];
    
    return levels.map(l => ({
      name: l.name,
      icon: l.icon,
      count: dist[l.key] || 0,
      percentage: ((dist[l.key] || 0) / total) * 100,
      colorClass: l.colorClass
    }));
  }
  
  filteredDailyStats(): DailyStats[] {
    return this.stats().daily_stats.slice(-this.selectedDays).reverse();
  }
  
  totalNewUsers(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.new_users, 0);
  }
  
  totalActivations(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.new_activations, 0);
  }
  
  totalPayments(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.new_payments, 0);
  }
  
  totalRevenueFiltered(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.revenue, 0);
  }
  
  totalConversions(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.trial_to_paid, 0);
  }
  
  totalChurn(): number {
    return this.filteredDailyStats().reduce((a, b) => a + b.churn_count, 0);
  }
  
  arpu(): number {
    const s = this.stats();
    return s.paid_users > 0 ? s.total_revenue / s.paid_users : 0;
  }
  
  ltv(): number {
    // 假設平均訂閱 6 個月
    return this.arpu() * 6;
  }
  
  mom(): number {
    const daily = this.stats().daily_stats;
    if (daily.length < 60) return 0;
    
    const thisMonth = daily.slice(-30).reduce((a, b) => a + b.revenue, 0);
    const lastMonth = daily.slice(-60, -30).reduce((a, b) => a + b.revenue, 0);
    
    return lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;
  }
  
  exportStats(): void {
    const data = this.filteredDailyStats();
    const csv = [
      ['日期', '新用戶', '激活數', '付費數', '收入', '活躍用戶', '轉化', '流失'].join(','),
      ...data.map(d => [
        d.date, d.new_users, d.new_activations, d.new_payments,
        d.revenue, d.active_users, d.trial_to_paid, d.churn_count
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membership-stats-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
