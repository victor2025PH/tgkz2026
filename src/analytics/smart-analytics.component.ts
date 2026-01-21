/**
 * 智能分析報告組件
 * Smart Analytics Component
 * 
 * 功能：
 * 1. 數據統計卡片
 * 2. 發送/回覆/成交趨勢圖
 * 3. 用戶來源分布
 * 4. AI 洞察和建議
 */

import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 統計數據
interface AnalyticsStats {
  totalSent: number;
  totalReplies: number;
  totalConversions: number;
  conversionRate: number;
  sentChange: number;      // 與上期對比變化率
  repliesChange: number;
  conversionsChange: number;
  rateChange: number;
}

// 趨勢數據點
interface TrendDataPoint {
  date: string;
  sent: number;
  replies: number;
  conversions: number;
}

// 來源分布
interface SourceDistribution {
  source: string;
  count: number;
  percentage: number;
  color: string;
}

// AI 洞察
interface AIInsight {
  icon: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter';

@Component({
  selector: 'app-smart-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="smart-analytics h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      
      <!-- 頂部標題 -->
      <div class="flex-shrink-0 p-6 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/20">
              📊
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">智能分析報告</h1>
              <p class="text-slate-400 text-sm">AI 驅動的數據洞察</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- 時間週期選擇 -->
            <div class="flex bg-slate-800/50 rounded-xl p-1">
              @for (period of periods; track period.value) {
                <button 
                  (click)="changePeriod(period.value)"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  [class.bg-cyan-500]="selectedPeriod() === period.value"
                  [class.text-white]="selectedPeriod() === period.value"
                  [class.text-slate-400]="selectedPeriod() !== period.value"
                  [class.hover:text-white]="selectedPeriod() !== period.value">
                  {{ period.label }}
                </button>
              }
            </div>
            
            <!-- 導出按鈕 -->
            <button 
              (click)="exportReport()"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2">
              📥 導出報告
            </button>
            
            <!-- 刷新按鈕 -->
            <button 
              (click)="refreshData()"
              [disabled]="isLoading()"
              class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors disabled:opacity-50">
              @if (isLoading()) {
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              } @else {
                🔄
              }
            </button>
          </div>
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        
        <!-- 統計卡片 -->
        <div class="grid grid-cols-4 gap-4">
          <!-- 發送數 -->
          <div class="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl border border-blue-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-blue-400 text-2xl">📤</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().sentChange >= 0"
                    [class.text-green-400]="stats().sentChange >= 0"
                    [class.bg-red-500/20]="stats().sentChange < 0"
                    [class.text-red-400]="stats().sentChange < 0">
                {{ stats().sentChange >= 0 ? '↑' : '↓' }} {{ formatPercent(stats().sentChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalSent) }}</div>
            <div class="text-sm text-slate-400">總發送數</div>
          </div>
          
          <!-- 回覆數 -->
          <div class="p-5 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-2xl border border-green-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-green-400 text-2xl">💬</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().repliesChange >= 0"
                    [class.text-green-400]="stats().repliesChange >= 0"
                    [class.bg-red-500/20]="stats().repliesChange < 0"
                    [class.text-red-400]="stats().repliesChange < 0">
                {{ stats().repliesChange >= 0 ? '↑' : '↓' }} {{ formatPercent(stats().repliesChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalReplies) }}</div>
            <div class="text-sm text-slate-400">總回覆數</div>
          </div>
          
          <!-- 成交數 -->
          <div class="p-5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-purple-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-purple-400 text-2xl">✅</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().conversionsChange >= 0"
                    [class.text-green-400]="stats().conversionsChange >= 0"
                    [class.bg-red-500/20]="stats().conversionsChange < 0"
                    [class.text-red-400]="stats().conversionsChange < 0">
                {{ stats().conversionsChange >= 0 ? '↑' : '↓' }} {{ formatPercent(stats().conversionsChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalConversions) }}</div>
            <div class="text-sm text-slate-400">總成交數</div>
          </div>
          
          <!-- 轉化率 -->
          <div class="p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-amber-400 text-2xl">📈</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().rateChange >= 0"
                    [class.text-green-400]="stats().rateChange >= 0"
                    [class.bg-red-500/20]="stats().rateChange < 0"
                    [class.text-red-400]="stats().rateChange < 0">
                {{ stats().rateChange >= 0 ? '↑' : '↓' }} {{ formatPercent(stats().rateChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ stats().conversionRate.toFixed(1) }}%</div>
            <div class="text-sm text-slate-400">轉化率</div>
          </div>
        </div>
        
        <!-- 圖表區域 -->
        <div class="grid grid-cols-3 gap-6">
          
          <!-- 趨勢圖 -->
          <div class="col-span-2 p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📈 發送與回覆趨勢
            </h3>
            <div class="h-64 flex items-end gap-1">
              @for (point of trendData(); track point.date; let i = $index) {
                <div class="flex-1 flex flex-col items-center gap-1">
                  <!-- 柱狀圖 -->
                  <div class="w-full flex gap-0.5 items-end h-48">
                    <div 
                      class="flex-1 bg-blue-500/60 rounded-t transition-all hover:bg-blue-500"
                      [style.height.%]="getBarHeight(point.sent, 'sent')"
                      [title]="'發送: ' + point.sent">
                    </div>
                    <div 
                      class="flex-1 bg-green-500/60 rounded-t transition-all hover:bg-green-500"
                      [style.height.%]="getBarHeight(point.replies, 'replies')"
                      [title]="'回覆: ' + point.replies">
                    </div>
                    <div 
                      class="flex-1 bg-purple-500/60 rounded-t transition-all hover:bg-purple-500"
                      [style.height.%]="getBarHeight(point.conversions, 'conversions')"
                      [title]="'成交: ' + point.conversions">
                    </div>
                  </div>
                  <!-- 日期標籤 -->
                  <span class="text-xs text-slate-500">{{ formatDateLabel(point.date) }}</span>
                </div>
              }
            </div>
            <!-- 圖例 -->
            <div class="flex items-center justify-center gap-6 mt-4">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-blue-500 rounded"></div>
                <span class="text-sm text-slate-400">發送</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span class="text-sm text-slate-400">回覆</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-purple-500 rounded"></div>
                <span class="text-sm text-slate-400">成交</span>
              </div>
            </div>
          </div>
          
          <!-- 來源分布 -->
          <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🥧 用戶來源分布
            </h3>
            <div class="space-y-3">
              @for (source of sourceDistribution(); track source.source) {
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-slate-300">{{ source.source }}</span>
                    <span class="text-sm text-slate-400">{{ source.count }} ({{ source.percentage.toFixed(1) }}%)</span>
                  </div>
                  <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all"
                      [style.width.%]="source.percentage"
                      [style.backgroundColor]="source.color">
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- AI 洞察 -->
        <div class="p-5 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/20">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              🤖 AI 智能洞察
            </h3>
            <button 
              (click)="regenerateInsights()"
              [disabled]="isGeneratingInsights()"
              class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1">
              @if (isGeneratingInsights()) {
                <span class="animate-spin">⏳</span>
              } @else {
                ✨
              }
              重新生成
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            @for (insight of aiInsights(); track insight.title) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/30"
                   [class.border-green-500/30]="insight.type === 'success'"
                   [class.border-yellow-500/30]="insight.type === 'warning'"
                   [class.border-blue-500/30]="insight.type === 'info'"
                   [class.border-purple-500/30]="insight.type === 'tip'">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ insight.icon }}</span>
                  <div>
                    <div class="font-medium text-white mb-1">{{ insight.title }}</div>
                    <div class="text-sm text-slate-400">{{ insight.description }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- 時段熱力圖 -->
        <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            🕐 最佳發送時段
          </h3>
          <div class="flex gap-1">
            @for (hour of hours; track hour) {
              <div class="flex-1 flex flex-col items-center">
                <div 
                  class="w-full h-8 rounded transition-all"
                  [style.backgroundColor]="getHeatmapColor(hourlyData()[hour] || 0)"
                  [title]="hour + ':00 - 回覆率: ' + (hourlyData()[hour] || 0) + '%'">
                </div>
                <span class="text-xs text-slate-500 mt-1">{{ hour }}</span>
              </div>
            }
          </div>
          <div class="flex items-center justify-end gap-4 mt-3">
            <span class="text-xs text-slate-500">低</span>
            <div class="flex gap-0.5">
              <div class="w-4 h-3 rounded bg-slate-700"></div>
              <div class="w-4 h-3 rounded bg-green-900"></div>
              <div class="w-4 h-3 rounded bg-green-700"></div>
              <div class="w-4 h-3 rounded bg-green-500"></div>
              <div class="w-4 h-3 rounded bg-green-400"></div>
            </div>
            <span class="text-xs text-slate-500">高</span>
          </div>
        </div>
        
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class SmartAnalyticsComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 週期選項
  periods = [
    { value: 'today' as TimePeriod, label: '今日' },
    { value: 'week' as TimePeriod, label: '本週' },
    { value: 'month' as TimePeriod, label: '本月' },
    { value: 'quarter' as TimePeriod, label: '季度' }
  ];
  
  selectedPeriod = signal<TimePeriod>('week');
  isLoading = signal(false);
  isGeneratingInsights = signal(false);
  
  // 小時數組（0-23）
  hours = Array.from({ length: 24 }, (_, i) => i);
  
  // 統計數據
  stats = signal<AnalyticsStats>({
    totalSent: 0,
    totalReplies: 0,
    totalConversions: 0,
    conversionRate: 0,
    sentChange: 0,
    repliesChange: 0,
    conversionsChange: 0,
    rateChange: 0
  });
  
  // 趨勢數據
  trendData = signal<TrendDataPoint[]>([]);
  
  // 來源分布
  sourceDistribution = signal<SourceDistribution[]>([]);
  
  // AI 洞察
  aiInsights = signal<AIInsight[]>([]);
  
  // 時段數據
  hourlyData = signal<{ [hour: number]: number }>({});
  
  ngOnInit() {
    this.setupIpcListeners();
    this.loadData();
  }
  
  ngOnDestroy() {
    // IPC 監聽器會在組件銷毀時自動清理
  }
  
  private setupIpcListeners() {
    this.ipc.on('analytics:stats', (data: any) => {
      if (data.success) {
        this.stats.set(data.stats);
      }
      this.isLoading.set(false);
    });
    
    this.ipc.on('analytics:trend', (data: any) => {
      if (data.success) {
        this.trendData.set(data.trend);
      }
    });
    
    this.ipc.on('analytics:sources', (data: any) => {
      if (data.success) {
        this.sourceDistribution.set(data.sources);
      }
    });
    
    this.ipc.on('analytics:hourly', (data: any) => {
      if (data.success) {
        this.hourlyData.set(data.hourly);
      }
    });
    
    this.ipc.on('analytics:insights', (data: any) => {
      if (data.success) {
        this.aiInsights.set(data.insights);
      }
      this.isGeneratingInsights.set(false);
    });
  }
  
  loadData() {
    this.isLoading.set(true);
    
    // 請求後端數據
    this.ipc.send('analytics:get-stats', { period: this.selectedPeriod() });
    this.ipc.send('analytics:get-trend', { period: this.selectedPeriod() });
    this.ipc.send('analytics:get-sources', { period: this.selectedPeriod() });
    this.ipc.send('analytics:get-hourly', { period: this.selectedPeriod() });
    
    // 生成模擬數據（後端未實現時使用）
    setTimeout(() => {
      if (this.isLoading()) {
        this.generateMockData();
        this.isLoading.set(false);
      }
    }, 1000);
  }
  
  private generateMockData() {
    // 模擬統計數據
    const sent = Math.floor(Math.random() * 1000) + 500;
    const replies = Math.floor(sent * (0.2 + Math.random() * 0.2));
    const conversions = Math.floor(replies * (0.1 + Math.random() * 0.15));
    
    this.stats.set({
      totalSent: sent,
      totalReplies: replies,
      totalConversions: conversions,
      conversionRate: (conversions / sent) * 100,
      sentChange: (Math.random() - 0.3) * 30,
      repliesChange: (Math.random() - 0.3) * 30,
      conversionsChange: (Math.random() - 0.3) * 30,
      rateChange: (Math.random() - 0.3) * 5
    });
    
    // 模擬趨勢數據
    const trend: TrendDataPoint[] = [];
    const days = this.selectedPeriod() === 'today' ? 24 : 
                 this.selectedPeriod() === 'week' ? 7 : 
                 this.selectedPeriod() === 'month' ? 30 : 90;
    
    for (let i = 0; i < Math.min(days, 14); i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trend.unshift({
        date: date.toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 100) + 20,
        replies: Math.floor(Math.random() * 30) + 5,
        conversions: Math.floor(Math.random() * 10) + 1
      });
    }
    this.trendData.set(trend);
    
    // 模擬來源分布
    const sources = [
      { source: '群組提取', count: Math.floor(Math.random() * 500) + 200, color: '#3b82f6' },
      { source: '關鍵詞匹配', count: Math.floor(Math.random() * 300) + 100, color: '#10b981' },
      { source: '手動添加', count: Math.floor(Math.random() * 200) + 50, color: '#f59e0b' },
      { source: 'AI 推薦', count: Math.floor(Math.random() * 150) + 30, color: '#8b5cf6' }
    ];
    const total = sources.reduce((sum, s) => sum + s.count, 0);
    this.sourceDistribution.set(sources.map(s => ({
      ...s,
      percentage: (s.count / total) * 100
    })));
    
    // 模擬時段數據
    const hourly: { [hour: number]: number } = {};
    for (let h = 0; h < 24; h++) {
      // 模擬工作時間回覆率更高
      const baseRate = h >= 9 && h <= 18 ? 30 : 10;
      hourly[h] = Math.floor(Math.random() * 20) + baseRate;
    }
    this.hourlyData.set(hourly);
    
    // 生成 AI 洞察
    this.generateInsights();
  }
  
  private generateInsights() {
    const stats = this.stats();
    const insights: AIInsight[] = [];
    
    // 基於數據生成洞察
    if (stats.conversionRate > 5) {
      insights.push({
        icon: '🎉',
        type: 'success',
        title: '轉化率表現優秀',
        description: `當前轉化率 ${stats.conversionRate.toFixed(1)}% 高於行業平均水平，繼續保持！`
      });
    }
    
    if (stats.sentChange > 10) {
      insights.push({
        icon: '📈',
        type: 'info',
        title: '發送量顯著增長',
        description: `發送量較上期增長 ${stats.sentChange.toFixed(1)}%，觸達更多潛在客戶。`
      });
    }
    
    // 最佳時段建議
    const hourly = this.hourlyData();
    let bestHour = 0;
    let bestRate = 0;
    for (const [hour, rate] of Object.entries(hourly)) {
      if (rate > bestRate) {
        bestRate = rate;
        bestHour = parseInt(hour);
      }
    }
    insights.push({
      icon: '⏰',
      type: 'tip',
      title: `最佳發送時段：${bestHour}:00-${bestHour + 1}:00`,
      description: `該時段回覆率高達 ${bestRate}%，建議重點安排發送。`
    });
    
    // 來源建議
    const sources = this.sourceDistribution();
    if (sources.length > 0) {
      const topSource = sources[0];
      insights.push({
        icon: '🎯',
        type: 'info',
        title: `主要用戶來源：${topSource.source}`,
        description: `佔比 ${topSource.percentage.toFixed(1)}%，可考慮加強該渠道投入。`
      });
    }
    
    this.aiInsights.set(insights);
  }
  
  changePeriod(period: TimePeriod) {
    this.selectedPeriod.set(period);
    this.loadData();
  }
  
  refreshData() {
    this.loadData();
  }
  
  regenerateInsights() {
    this.isGeneratingInsights.set(true);
    this.ipc.send('analytics:generate-insights', { 
      period: this.selectedPeriod(),
      stats: this.stats()
    });
    
    // 模擬生成
    setTimeout(() => {
      if (this.isGeneratingInsights()) {
        this.generateInsights();
        this.isGeneratingInsights.set(false);
      }
    }, 1500);
  }
  
  exportReport() {
    this.toast.info('正在生成報告...');
    this.ipc.send('analytics:export', { 
      period: this.selectedPeriod(),
      stats: this.stats(),
      trend: this.trendData(),
      sources: this.sourceDistribution(),
      insights: this.aiInsights()
    });
    
    // 模擬導出
    setTimeout(() => {
      this.toast.success('報告已生成，請選擇保存位置');
    }, 1000);
  }
  
  // 格式化方法
  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  formatPercent(value: number): string {
    return Math.abs(value).toFixed(1) + '%';
  }
  
  formatDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  
  getBarHeight(value: number, type: string): number {
    const trend = this.trendData();
    if (trend.length === 0) return 0;
    
    let max = 1;
    trend.forEach(point => {
      if (type === 'sent' && point.sent > max) max = point.sent;
      if (type === 'replies' && point.replies > max) max = point.replies;
      if (type === 'conversions' && point.conversions > max) max = point.conversions;
    });
    
    return Math.max(5, (value / max) * 100);
  }
  
  getHeatmapColor(rate: number): string {
    if (rate < 15) return 'rgb(51, 65, 85)';      // slate-700
    if (rate < 25) return 'rgb(20, 83, 45)';      // green-900
    if (rate < 35) return 'rgb(21, 128, 61)';     // green-700
    if (rate < 45) return 'rgb(34, 197, 94)';     // green-500
    return 'rgb(74, 222, 128)';                    // green-400
  }
}
