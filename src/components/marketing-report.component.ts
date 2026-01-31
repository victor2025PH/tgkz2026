/**
 * 營銷報表組件
 * Marketing Report Component
 * 
 * 🆕 P2 階段：數據驅動優化
 * 
 * 功能：
 * - 總體統計卡片
 * - 轉化漏斗可視化
 * - 角色組合效果排行
 * - 趨勢對比
 */

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingAnalyticsService, DailyReport, RoleComboStats, PeriodComparison } from '../services/marketing-analytics.service';

@Component({
  selector: 'app-marketing-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="marketing-report p-6 space-y-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span>📊</span>
            營銷數據報表
          </h2>
          <p class="text-slate-400 mt-1">追蹤營銷效果，優化角色組合</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- 時間範圍選擇 -->
          <select [(ngModel)]="selectedPeriod" 
                  (change)="onPeriodChange()"
                  class="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
            <option value="today">今日</option>
            <option value="week">本週</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
          </select>
          <button (click)="refreshData()" 
                  class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2">
            <span>🔄</span> 刷新
          </button>
        </div>
      </div>
      
      <!-- 總體統計卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <!-- 總會話數 -->
        <div class="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-blue-400 text-2xl">📬</span>
            @if (comparison().changes.sessions !== 0) {
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="comparison().changes.sessions > 0"
                    [class.text-green-400]="comparison().changes.sessions > 0"
                    [class.bg-red-500/20]="comparison().changes.sessions < 0"
                    [class.text-red-400]="comparison().changes.sessions < 0">
                {{ comparison().changes.sessions > 0 ? '+' : '' }}{{ comparison().changes.sessions.toFixed(1) }}%
              </span>
            }
          </div>
          <div class="text-3xl font-bold text-white">{{ totalStats().totalSessions }}</div>
          <div class="text-sm text-slate-400">總會話數</div>
        </div>
        
        <!-- 轉化數 -->
        <div class="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-green-400 text-2xl">✅</span>
            @if (comparison().changes.conversions !== 0) {
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="comparison().changes.conversions > 0"
                    [class.text-green-400]="comparison().changes.conversions > 0"
                    [class.bg-red-500/20]="comparison().changes.conversions < 0"
                    [class.text-red-400]="comparison().changes.conversions < 0">
                {{ comparison().changes.conversions > 0 ? '+' : '' }}{{ comparison().changes.conversions.toFixed(1) }}%
              </span>
            }
          </div>
          <div class="text-3xl font-bold text-white">{{ totalStats().conversions }}</div>
          <div class="text-sm text-slate-400">成功轉化</div>
        </div>
        
        <!-- 轉化率 -->
        <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-purple-400 text-2xl">📈</span>
          </div>
          <div class="text-3xl font-bold text-white">{{ totalStats().conversionRate.toFixed(1) }}%</div>
          <div class="text-sm text-slate-400">轉化率</div>
        </div>
        
        <!-- 總收入 -->
        <div class="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-amber-400 text-2xl">💰</span>
            @if (comparison().changes.revenue !== 0) {
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="comparison().changes.revenue > 0"
                    [class.text-green-400]="comparison().changes.revenue > 0"
                    [class.bg-red-500/20]="comparison().changes.revenue < 0"
                    [class.text-red-400]="comparison().changes.revenue < 0">
                {{ comparison().changes.revenue > 0 ? '+' : '' }}{{ comparison().changes.revenue.toFixed(1) }}%
              </span>
            }
          </div>
          <div class="text-3xl font-bold text-white">¥{{ formatNumber(totalStats().totalRevenue) }}</div>
          <div class="text-sm text-slate-400">總收入</div>
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 轉化漏斗 -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔻</span> 轉化漏斗
          </h3>
          <div class="space-y-3">
            @for (stage of funnelData(); track stage.stage; let i = $index) {
              <div class="relative">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm text-slate-300">{{ getStageName(stage.stage) }}</span>
                  <span class="text-sm text-slate-400">{{ stage.count }} ({{ stage.rate.toFixed(1) }}%)</span>
                </div>
                <div class="h-8 bg-slate-700 rounded-lg overflow-hidden">
                  <div class="h-full transition-all duration-500"
                       [style.width.%]="stage.rate"
                       [class]="getFunnelColor(i)">
                  </div>
                </div>
              </div>
            }
          </div>
          @if (funnelData().length === 0) {
            <div class="text-center py-8 text-slate-500">
              暫無數據
            </div>
          }
        </div>
        
        <!-- 最佳角色組合 -->
        <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span> 最佳角色組合
          </h3>
          <div class="space-y-3">
            @for (combo of topCombos(); track combo.comboId; let i = $index) {
              <div class="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ getMedalEmoji(i) }}</span>
                    <span class="text-white font-medium">{{ combo.comboName }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-green-400 font-bold">{{ combo.conversionRate.toFixed(1) }}%</span>
                    @if (combo.trend === 'up') {
                      <span class="text-green-400">↑</span>
                    } @else if (combo.trend === 'down') {
                      <span class="text-red-400">↓</span>
                    }
                  </div>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-400">
                    {{ combo.totalSessions }} 次使用 · {{ combo.conversions }} 次轉化
                  </span>
                  <span class="text-slate-500">
                    平均 {{ combo.avgMessageCount.toFixed(0) }} 條消息
                  </span>
                </div>
                <!-- 進度條 -->
                <div class="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                       [style.width.%]="combo.conversionRate"></div>
                </div>
              </div>
            }
            @if (topCombos().length === 0) {
              <div class="text-center py-8 text-slate-500">
                <div class="text-3xl mb-2">📊</div>
                <div>開始營銷後將顯示角色組合效果</div>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- 用戶互動統計 -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>👥</span> 用戶互動分析
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-slate-900/50 rounded-lg">
            <div class="text-2xl font-bold text-cyan-400">{{ totalStats().avgInterestScore.toFixed(0) }}</div>
            <div class="text-sm text-slate-400 mt-1">平均興趣度</div>
          </div>
          <div class="text-center p-4 bg-slate-900/50 rounded-lg">
            <div class="text-2xl font-bold text-pink-400">{{ totalStats().avgEngagementScore.toFixed(0) }}</div>
            <div class="text-sm text-slate-400 mt-1">平均參與度</div>
          </div>
          <div class="text-center p-4 bg-slate-900/50 rounded-lg">
            <div class="text-2xl font-bold text-orange-400">{{ userProfiles().length }}</div>
            <div class="text-sm text-slate-400 mt-1">用戶畫像數</div>
          </div>
          <div class="text-center p-4 bg-slate-900/50 rounded-lg">
            <div class="text-2xl font-bold text-indigo-400">{{ roleCombos().length }}</div>
            <div class="text-sm text-slate-400 mt-1">角色組合數</div>
          </div>
        </div>
      </div>
      
      <!-- 今日詳情 -->
      <div class="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📅</span> 今日詳情
          </h3>
          <span class="text-sm text-slate-400">{{ todayDate }}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="text-center">
            <div class="text-xl font-bold text-white">{{ todayReport().totalSessions }}</div>
            <div class="text-xs text-slate-400">會話</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-green-400">{{ todayReport().conversions }}</div>
            <div class="text-xs text-slate-400">轉化</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-purple-400">{{ todayReport().conversionRate.toFixed(1) }}%</div>
            <div class="text-xs text-slate-400">轉化率</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-cyan-400">{{ todayReport().totalMessages }}</div>
            <div class="text-xs text-slate-400">消息數</div>
          </div>
          <div class="text-center">
            <div class="text-xl font-bold text-amber-400">¥{{ formatNumber(todayReport().totalRevenue) }}</div>
            <div class="text-xs text-slate-400">收入</div>
          </div>
        </div>
      </div>
      
      <!-- 推薦提示 -->
      @if (recommendedCombo()) {
        <div class="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-5">
          <div class="flex items-center gap-4">
            <div class="text-4xl">💡</div>
            <div class="flex-1">
              <h4 class="text-white font-semibold">推薦使用角色組合</h4>
              <p class="text-slate-300 mt-1">
                根據歷史數據，「<span class="text-purple-400 font-medium">{{ recommendedCombo()!.comboName }}</span>」
                組合表現最佳，轉化率達 <span class="text-green-400 font-bold">{{ recommendedCombo()!.conversionRate.toFixed(1) }}%</span>
              </p>
            </div>
            <button class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              使用此組合
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .marketing-report {
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class MarketingReportComponent implements OnInit {
  private analytics = inject(MarketingAnalyticsService);
  
  selectedPeriod = 'week';
  todayDate = new Date().toLocaleDateString('zh-TW');
  
  // 從服務獲取數據
  totalStats = this.analytics.totalStats;
  todayStats = this.analytics.todayStats;
  topCombos = this.analytics.topRoleCombos;
  userProfiles = this.analytics.userProfiles;
  roleCombos = this.analytics.roleComboStats;
  
  // 今日報表
  todayReport = signal<DailyReport>(this.getEmptyReport());
  
  // 漏斗數據
  funnelData = signal<{ stage: string; count: number; rate: number }[]>([]);
  
  // 週期對比
  comparison = signal<PeriodComparison>({
    current: { sessions: 0, conversions: 0, revenue: 0 },
    previous: { sessions: 0, conversions: 0, revenue: 0 },
    changes: { sessions: 0, conversions: 0, revenue: 0 }
  });
  
  // 推薦組合
  recommendedCombo = signal<RoleComboStats | null>(null);
  
  ngOnInit() {
    this.refreshData();
  }
  
  refreshData() {
    // 生成今日報表
    const report = this.analytics.generateDailyReport();
    this.todayReport.set(report);
    this.funnelData.set(report.funnel);
    
    // 生成週期對比
    const comparison = this.analytics.generatePeriodComparison(7);
    this.comparison.set(comparison);
    
    // 獲取推薦組合
    const recommended = this.analytics.recommendRoleCombo();
    this.recommendedCombo.set(recommended);
  }
  
  onPeriodChange() {
    this.refreshData();
  }
  
  getStageName(stage: string): string {
    const names: Record<string, string> = {
      'opening': '開場階段',
      'building_trust': '建立信任',
      'discovering_needs': '發現需求',
      'presenting_value': '展示價值',
      'handling_objections': '處理異議',
      'closing': '促成成交',
      'follow_up': '跟進服務'
    };
    return names[stage] || stage;
  }
  
  getFunnelColor(index: number): string {
    const colors = [
      'bg-blue-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-lime-500',
      'bg-amber-500',
      'bg-orange-500'
    ];
    return colors[index % colors.length];
  }
  
  getMedalEmoji(index: number): string {
    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    return medals[index] || '🏅';
  }
  
  formatNumber(value: number): string {
    if (value >= 10000) {
      return (value / 10000).toFixed(1) + '萬';
    }
    return value.toLocaleString();
  }
  
  private getEmptyReport(): DailyReport {
    return {
      date: new Date().toISOString().split('T')[0],
      totalSessions: 0,
      newUsers: 0,
      activeUsers: 0,
      conversions: 0,
      conversionRate: 0,
      totalRevenue: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      accountUsage: [],
      topRoleCombos: [],
      funnel: []
    };
  }
}
