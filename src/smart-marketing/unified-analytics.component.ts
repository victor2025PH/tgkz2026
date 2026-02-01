/**
 * 統一分析報表組件
 * Unified Analytics Component
 * 
 * 🆕 優化 2-2: 統一報表和數據分析
 * 
 * 提供：
 * - 跨任務統一報表
 * - 趨勢分析
 * - 效果對比
 * - 導出功能
 */

import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingTaskService } from '../services/marketing-task.service';
import { SmartRecommendationService } from '../services/smart-recommendation.service';
import { GoalType, GOAL_TYPE_CONFIG, MarketingTask } from '../models/marketing-task.models';

// 時間範圍
type TimeRange = '7d' | '30d' | '90d' | 'all';

// 報表數據
interface ReportData {
  summary: {
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    totalContacted: number;
    totalConverted: number;
    conversionRate: number;
    totalCost: number;
    costPerConversion: number;
  };
  
  trends: {
    date: string;
    contacted: number;
    converted: number;
    cost: number;
  }[];
  
  byGoal: {
    goalType: GoalType;
    taskCount: number;
    contacted: number;
    converted: number;
    conversionRate: number;
    avgCost: number;
  }[];
  
  topTasks: {
    id: string;
    name: string;
    goalType: GoalType;
    conversionRate: number;
    converted: number;
  }[];
}

@Component({
  selector: 'app-unified-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="unified-analytics">
      <!-- 標題和篩選 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-white flex items-center gap-3">
          <span>📊</span> 數據分析報表
        </h2>
        
        <div class="flex items-center gap-3">
          <!-- 時間範圍選擇 -->
          <div class="flex bg-slate-800 rounded-lg p-1">
            @for (range of timeRanges; track range.value) {
              <button (click)="setTimeRange(range.value)"
                      class="px-4 py-2 rounded-md text-sm transition-all"
                      [class.bg-purple-500]="selectedRange() === range.value"
                      [class.text-white]="selectedRange() === range.value"
                      [class.text-slate-400]="selectedRange() !== range.value"
                      [class.hover:text-white]="selectedRange() !== range.value">
                {{ range.label }}
              </button>
            }
          </div>
          
          <!-- 導出按鈕 -->
          <button (click)="exportReport()"
                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2 text-sm">
            <span>📥</span> 導出報表
          </button>
        </div>
      </div>
      
      <!-- 摘要卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 p-4">
          <div class="text-sm text-slate-400 mb-1">總任務數</div>
          <div class="text-3xl font-bold text-purple-400">{{ report().summary.totalTasks }}</div>
          <div class="text-xs text-slate-500 mt-1">
            {{ report().summary.completedTasks }} 已完成
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 p-4">
          <div class="text-sm text-slate-400 mb-1">總接觸</div>
          <div class="text-3xl font-bold text-cyan-400">{{ report().summary.totalContacted | number }}</div>
          <div class="text-xs text-slate-500 mt-1">
            {{ getAvgContactedPerTask() }} 人/任務
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30 p-4">
          <div class="text-sm text-slate-400 mb-1">總轉化</div>
          <div class="text-3xl font-bold text-emerald-400">{{ report().summary.totalConverted | number }}</div>
          <div class="text-xs mt-1"
               [class.text-emerald-400]="report().summary.conversionRate >= 20"
               [class.text-amber-400]="report().summary.conversionRate < 20 && report().summary.conversionRate >= 10"
               [class.text-red-400]="report().summary.conversionRate < 10">
            {{ report().summary.conversionRate }}% 轉化率
          </div>
        </div>
        
        <div class="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30 p-4">
          <div class="text-sm text-slate-400 mb-1">總成本</div>
          <div class="text-3xl font-bold text-amber-400">¥{{ report().summary.totalCost.toFixed(2) }}</div>
          <div class="text-xs text-slate-500 mt-1">
            ¥{{ report().summary.costPerConversion.toFixed(2) }}/轉化
          </div>
        </div>
      </div>
      
      <!-- 趨勢圖表 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 mb-6">
        <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
          <span>📈</span> 趨勢分析
        </h3>
        
        <div class="h-64 flex items-end gap-1">
          @for (day of report().trends; track day.date) {
            <div class="flex-1 flex flex-col items-center gap-1">
              <!-- 轉化數 -->
              <div class="w-full bg-emerald-500 rounded-t transition-all"
                   [style.height.px]="getBarHeight(day.converted, maxConverted())"
                   [title]="day.converted + ' 轉化'"></div>
              <!-- 接觸數 -->
              <div class="w-full bg-cyan-500/50 rounded-t transition-all"
                   [style.height.px]="getBarHeight(day.contacted, maxContacted()) * 0.5"
                   [title]="day.contacted + ' 接觸'"></div>
              <span class="text-[10px] text-slate-500 mt-1">{{ formatDate(day.date) }}</span>
            </div>
          }
        </div>
        
        <div class="flex items-center justify-center gap-6 mt-4">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-emerald-500 rounded"></div>
            <span class="text-xs text-slate-400">轉化</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 bg-cyan-500/50 rounded"></div>
            <span class="text-xs text-slate-400">接觸</span>
          </div>
        </div>
      </div>
      
      <!-- 目標類型對比 -->
      <div class="grid grid-cols-2 gap-6 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎯</span> 目標類型表現
          </h3>
          
          <div class="space-y-4">
            @for (goal of report().byGoal; track goal.goalType) {
              <div class="flex items-center gap-4">
                <span class="text-2xl">{{ getGoalIcon(goal.goalType) }}</span>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-white">{{ getGoalLabel(goal.goalType) }}</span>
                    <span class="text-sm font-medium"
                          [class.text-emerald-400]="goal.conversionRate >= 20"
                          [class.text-amber-400]="goal.conversionRate < 20 && goal.conversionRate >= 10"
                          [class.text-red-400]="goal.conversionRate < 10">
                      {{ goal.conversionRate }}%
                    </span>
                  </div>
                  <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all"
                         [style.width.%]="goal.conversionRate * 3"
                         [class.bg-emerald-500]="goal.conversionRate >= 20"
                         [class.bg-amber-500]="goal.conversionRate < 20 && goal.conversionRate >= 10"
                         [class.bg-red-500]="goal.conversionRate < 10"></div>
                  </div>
                  <div class="text-xs text-slate-500 mt-1">
                    {{ goal.taskCount }} 任務 · {{ goal.converted }} 轉化
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- 最佳任務 -->
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏆</span> 最佳表現任務
          </h3>
          
          <div class="space-y-3">
            @for (task of report().topTasks; track task.id; let i = $index) {
              <div class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold"
                     [class.bg-amber-500]="i === 0"
                     [class.text-amber-900]="i === 0"
                     [class.bg-slate-500]="i === 1"
                     [class.text-slate-900]="i === 1"
                     [class.bg-orange-700]="i === 2"
                     [class.text-orange-100]="i === 2"
                     [class.bg-slate-600]="i > 2"
                     [class.text-slate-300]="i > 2">
                  {{ i + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-white text-sm truncate">{{ task.name }}</div>
                  <div class="text-xs text-slate-400">{{ getGoalLabel(task.goalType) }}</div>
                </div>
                <div class="text-right">
                  <div class="font-bold text-emerald-400">{{ task.conversionRate }}%</div>
                  <div class="text-xs text-slate-500">{{ task.converted }} 轉化</div>
                </div>
              </div>
            }
            
            @if (report().topTasks.length === 0) {
              <div class="text-center py-8 text-slate-400">
                <div class="text-3xl mb-2">📊</div>
                <p class="text-sm">暫無數據</p>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- 智能洞察 -->
      <div class="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30 p-6">
        <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
          <span>💡</span> 智能洞察
        </h3>
        
        <div class="grid grid-cols-3 gap-4">
          @for (insight of insights(); track insight.id) {
            <div class="p-4 bg-slate-800/50 rounded-lg">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">{{ insight.icon }}</span>
                <span class="font-medium text-white text-sm">{{ insight.title }}</span>
              </div>
              <p class="text-xs text-slate-400">{{ insight.description }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class UnifiedAnalyticsComponent implements OnInit {
  private taskService = inject(MarketingTaskService);
  private recommendationService = inject(SmartRecommendationService);
  
  // 狀態
  selectedRange = signal<TimeRange>('7d');
  
  // 時間範圍選項
  timeRanges = [
    { value: '7d' as TimeRange, label: '7天' },
    { value: '30d' as TimeRange, label: '30天' },
    { value: '90d' as TimeRange, label: '90天' },
    { value: 'all' as TimeRange, label: '全部' }
  ];
  
  // 報表數據
  report = computed<ReportData>(() => {
    const tasks = this.getFilteredTasks();
    return this.generateReport(tasks);
  });
  
  maxContacted = computed(() => {
    return Math.max(...this.report().trends.map(t => t.contacted), 1);
  });
  
  maxConverted = computed(() => {
    return Math.max(...this.report().trends.map(t => t.converted), 1);
  });
  
  insights = computed(() => {
    const recommendations = this.recommendationService.getRecommendations();
    return recommendations.slice(0, 3).map((r, i) => ({
      id: r.id,
      icon: i === 0 ? '🎯' : i === 1 ? '📈' : '💡',
      title: r.title,
      description: r.description
    }));
  });
  
  ngOnInit(): void {
    this.recommendationService.analyzeHistory();
  }
  
  setTimeRange(range: TimeRange): void {
    this.selectedRange.set(range);
  }
  
  private getFilteredTasks(): MarketingTask[] {
    const tasks = this.taskService.tasks();
    const range = this.selectedRange();
    
    if (range === 'all') return tasks;
    
    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return tasks.filter(t => new Date(t.createdAt) >= cutoff);
  }
  
  private generateReport(tasks: MarketingTask[]): ReportData {
    // 摘要
    const totalContacted = tasks.reduce((sum, t) => sum + t.stats.contacted, 0);
    const totalConverted = tasks.reduce((sum, t) => sum + t.stats.converted, 0);
    const totalCost = tasks.reduce((sum, t) => sum + t.stats.aiCost, 0);
    
    const summary = {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      totalContacted,
      totalConverted,
      conversionRate: totalContacted > 0 ? Math.round((totalConverted / totalContacted) * 100) : 0,
      totalCost,
      costPerConversion: totalConverted > 0 ? totalCost / totalConverted : 0
    };
    
    // 趨勢數據
    const trends = this.generateTrends(tasks);
    
    // 按目標類型
    const byGoal = this.generateByGoal(tasks);
    
    // 最佳任務
    const topTasks = tasks
      .filter(t => t.stats.contacted > 0)
      .map(t => ({
        id: t.id,
        name: t.name,
        goalType: t.goalType,
        conversionRate: Math.round((t.stats.converted / t.stats.contacted) * 100),
        converted: t.stats.converted
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);
    
    return { summary, trends, byGoal, topTasks };
  }
  
  private generateTrends(tasks: MarketingTask[]): ReportData['trends'] {
    const range = this.selectedRange();
    const days = range === 'all' ? 30 : parseInt(range);
    const trends: ReportData['trends'] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(t => t.createdAt.startsWith(dateStr));
      
      trends.push({
        date: dateStr,
        contacted: dayTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
        converted: dayTasks.reduce((sum, t) => sum + t.stats.converted, 0),
        cost: dayTasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
      });
    }
    
    return trends;
  }
  
  private generateByGoal(tasks: MarketingTask[]): ReportData['byGoal'] {
    const goalTypes: GoalType[] = ['conversion', 'retention', 'engagement', 'support'];
    
    return goalTypes.map(goalType => {
      const goalTasks = tasks.filter(t => t.goalType === goalType);
      const contacted = goalTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
      const converted = goalTasks.reduce((sum, t) => sum + t.stats.converted, 0);
      const totalCost = goalTasks.reduce((sum, t) => sum + t.stats.aiCost, 0);
      
      return {
        goalType,
        taskCount: goalTasks.length,
        contacted,
        converted,
        conversionRate: contacted > 0 ? Math.round((converted / contacted) * 100) : 0,
        avgCost: goalTasks.length > 0 ? totalCost / goalTasks.length : 0
      };
    });
  }
  
  // 輔助方法
  getGoalIcon(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.icon || '🎯';
  }
  
  getGoalLabel(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.label || goalType;
  }
  
  getAvgContactedPerTask(): number {
    const summary = this.report().summary;
    if (summary.totalTasks === 0) return 0;
    return Math.round(summary.totalContacted / summary.totalTasks);
  }
  
  getBarHeight(value: number, max: number): number {
    if (max === 0) return 0;
    return Math.max(4, (value / max) * 180);
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  
  exportReport(): void {
    const report = this.report();
    const data = JSON.stringify(report, null, 2);
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}
