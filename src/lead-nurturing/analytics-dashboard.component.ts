/**
 * TG-AI智控王 分析儀表板組件
 * Analytics Dashboard Component v1.0
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsDataService, TimeRange, TrendData } from './analytics-data.service';
import { FunnelAnalyticsService, FunnelStageData, BottleneckAnalysis } from './funnel-analytics.service';
import { AIPerformanceService } from './ai-performance.service';
import { ReportGeneratorService, ComprehensiveReport, ExportFormat } from './report-generator.service';
import { LeadService } from './lead.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analytics-dashboard h-full flex flex-col bg-slate-900 overflow-auto">
      <!-- 頂部標題欄 -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
        <div class="flex items-center gap-3">
          <h1 class="text-xl font-bold text-white">📊 數據分析中心</h1>
          <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-sm rounded-full">
            Phase 4
          </span>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- 時間範圍選擇 -->
          <select [(ngModel)]="selectedTimeRange"
                  (ngModelChange)="onTimeRangeChange($event)"
                  class="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
            <option value="today">今日</option>
            <option value="week">本週</option>
            <option value="month">本月</option>
            <option value="quarter">本季</option>
            <option value="year">本年</option>
            <option value="all">全部</option>
          </select>
          
          <!-- 生成報表 -->
          <button (click)="generateReport()"
                  [disabled]="reportGenerator.isGenerating()"
                  class="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-all">
            @if (reportGenerator.isGenerating()) {
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>生成中...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>生成報表</span>
            }
          </button>
        </div>
      </div>
      
      <!-- 主要內容區 -->
      <div class="flex-1 p-4 space-y-4">
        <!-- 關鍵指標卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (metric of keyMetrics(); track metric.label) {
            <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400 text-sm">{{ metric.label }}</span>
                <span class="text-2xl">{{ metric.icon }}</span>
              </div>
              <div class="flex items-end gap-2">
                <span class="text-2xl font-bold" [style.color]="metric.color">{{ metric.value }}</span>
                @if (metric.trend) {
                  <span class="text-sm mb-1"
                        [class]="metric.trend.trend === 'up' ? 'text-green-400' : metric.trend.trend === 'down' ? 'text-red-400' : 'text-slate-400'">
                    {{ metric.trend.trend === 'up' ? '↑' : metric.trend.trend === 'down' ? '↓' : '→' }}
                    {{ Math.abs(metric.trend.changePercent) }}%
                  </span>
                }
              </div>
            </div>
          }
        </div>
        
        <!-- 雙欄布局 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- 銷售漏斗 -->
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                <span>📈</span> 銷售漏斗
              </h2>
              <div class="flex items-center gap-2">
                <span class="text-sm text-slate-400">健康度</span>
                <span class="px-2 py-0.5 rounded text-sm font-medium"
                      [class]="getHealthClass(funnelHealth().grade)">
                  {{ funnelHealth().grade }} ({{ funnelHealth().score }})
                </span>
              </div>
            </div>
            
            <!-- 漏斗可視化 -->
            <div class="space-y-2">
              @for (stage of funnelData().stages; track stage.stage; let i = $index) {
                <div class="relative">
                  <div class="flex items-center gap-3">
                    <div class="w-20 text-xs text-slate-400 text-right">{{ stage.name }}</div>
                    <div class="flex-1 h-8 bg-slate-700 rounded-lg overflow-hidden relative">
                      <div class="h-full rounded-lg transition-all duration-500"
                           [style.width]="stage.percentage + '%'"
                           [style.background-color]="stage.color">
                      </div>
                      <span class="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                        {{ stage.count }} ({{ stage.percentage }}%)
                      </span>
                    </div>
                    <div class="w-16 text-xs text-right"
                         [class]="stage.conversionRate >= 50 ? 'text-green-400' : stage.conversionRate >= 30 ? 'text-yellow-400' : 'text-red-400'">
                      {{ stage.conversionRate }}%
                    </div>
                  </div>
                  @if (i < funnelData().stages.length - 1) {
                    <div class="ml-20 pl-3 py-1">
                      <svg class="w-4 h-4 text-slate-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                      </svg>
                    </div>
                  }
                </div>
              }
            </div>
            
            <!-- 漏斗摘要 -->
            <div class="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-cyan-400">{{ funnelData().overallConversionRate }}%</div>
                <div class="text-xs text-slate-400">總轉化率</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-purple-400">{{ formatDuration(funnelData().avgCycleTime) }}</div>
                <div class="text-xs text-slate-400">平均週期</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-green-400">\${{ formatNumber(funnelData().totalValue) }}</div>
                <div class="text-xs text-slate-400">管線價值</div>
              </div>
            </div>
          </div>
          
          <!-- AI效果 -->
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <span>🤖</span> AI效果分析
            </h2>
            
            <div class="space-y-4">
              <!-- AI指標 -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-cyan-400">{{ aiSummary().totalAIMessages }}</div>
                  <div class="text-xs text-slate-400">AI消息數</div>
                </div>
                <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-green-400">{{ aiSummary().responseRate }}%</div>
                  <div class="text-xs text-slate-400">響應率</div>
                </div>
                <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-purple-400">{{ aiSummary().positiveResponseRate }}%</div>
                  <div class="text-xs text-slate-400">正面響應</div>
                </div>
                <div class="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div class="text-2xl font-bold text-yellow-400">{{ aiSummary().avgEffectivenessScore }}</div>
                  <div class="text-xs text-slate-400">效果評分</div>
                </div>
              </div>
              
              <!-- AI vs 人工對比 -->
              <div>
                <h3 class="text-sm text-slate-400 mb-2">AI vs 人工</h3>
                <div class="space-y-2">
                  @for (item of aiComparison(); track item.metric) {
                    <div class="flex items-center gap-2 text-sm">
                      <span class="w-24 text-slate-400">{{ item.metric }}</span>
                      <div class="flex-1 flex items-center gap-1">
                        <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-cyan-500 rounded-full"
                               [style.width]="getComparisonWidth(item, 'ai')"></div>
                        </div>
                        <span class="w-12 text-right text-cyan-400">{{ item.aiValue }}</span>
                      </div>
                      <span class="text-slate-500">vs</span>
                      <div class="flex-1 flex items-center gap-1">
                        <span class="w-12 text-orange-400">{{ item.manualValue }}</span>
                        <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-orange-500 rounded-full"
                               [style.width]="getComparisonWidth(item, 'manual')"></div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 最佳時段 -->
              <div>
                <h3 class="text-sm text-slate-400 mb-2">最佳發送時段</h3>
                <div class="flex gap-2 flex-wrap">
                  @for (slot of bestTimeSlots(); track slot.hour) {
                    <span class="px-2 py-1 bg-slate-700 rounded text-sm text-white">
                      {{ slot.hour }}:00 
                      <span class="text-green-400">({{ slot.responseRate }}%)</span>
                    </span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 瓶頸與建議 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- 瓶頸分析 -->
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <span>⚠️</span> 瓶頸分析
            </h2>
            
            @if (bottlenecks().length === 0) {
              <div class="text-center py-8 text-slate-400">
                <div class="text-4xl mb-2">✅</div>
                <p>目前沒有發現瓶頸問題</p>
              </div>
            } @else {
              <div class="space-y-3">
                @for (bottleneck of bottlenecks().slice(0, 5); track bottleneck.stage) {
                  <div class="bg-slate-700/50 rounded-lg p-3">
                    <div class="flex items-start gap-2">
                      <span class="text-lg">{{ getSeverityIcon(bottleneck.severity) }}</span>
                      <div class="flex-1">
                        <div class="text-sm font-medium text-white">{{ bottleneck.issue }}</div>
                        <div class="text-xs text-slate-400 mt-1">{{ bottleneck.impact }}</div>
                        <div class="text-xs text-cyan-400 mt-1">💡 {{ bottleneck.suggestion }}</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
          
          <!-- 重點客戶 -->
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <span>🎯</span> 重點跟進客戶
            </h2>
            
            @if (topLeads().length === 0) {
              <div class="text-center py-8 text-slate-400">
                <div class="text-4xl mb-2">📭</div>
                <p>暫無高優先級客戶</p>
              </div>
            } @else {
              <div class="space-y-2">
                @for (item of topLeads().slice(0, 5); track item.lead.id) {
                  <div class="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2.5 hover:bg-slate-700 transition cursor-pointer">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {{ item.lead.displayName.charAt(0) }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-white truncate">{{ item.lead.displayName }}</div>
                      <div class="text-xs text-slate-400">{{ item.reason }}</div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                             [style.width]="item.score + '%'"></div>
                      </div>
                      <span class="text-xs text-cyan-400 w-8">{{ item.score }}</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
        
        <!-- 報表區域 -->
        @if (currentReport()) {
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                <span>📋</span> {{ currentReport()?.title }}
              </h2>
              <div class="flex items-center gap-2">
                <button (click)="downloadReport('markdown')"
                        class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition">
                  📄 Markdown
                </button>
                <button (click)="downloadReport('csv')"
                        class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition">
                  📊 CSV
                </button>
                <button (click)="downloadReport('json')"
                        class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition">
                  🔧 JSON
                </button>
              </div>
            </div>
            
            @if (currentReport()?.summary) {
              <div class="bg-slate-700/50 rounded-lg p-4">
                <pre class="text-sm text-slate-300 whitespace-pre-wrap">{{ currentReport()?.summary }}</pre>
              </div>
            }
            
            @if (currentReport()?.recommendations && currentReport()!.recommendations!.length > 0) {
              <div class="mt-4">
                <h3 class="text-sm text-slate-400 mb-2">優化建議</h3>
                <div class="space-y-2">
                  @for (rec of currentReport()!.recommendations!; track rec) {
                    <div class="flex items-start gap-2 text-sm text-slate-300">
                      <span class="text-cyan-400">•</span>
                      <span>{{ rec }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .analytics-dashboard {
      scrollbar-width: thin;
      scrollbar-color: #475569 transparent;
    }
    .analytics-dashboard::-webkit-scrollbar {
      width: 6px;
    }
    .analytics-dashboard::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 3px;
    }
  `]
})
export class AnalyticsDashboardComponent implements OnInit {
  // 服務注入
  analyticsData = inject(AnalyticsDataService);
  funnelAnalytics = inject(FunnelAnalyticsService);
  aiPerformance = inject(AIPerformanceService);
  reportGenerator = inject(ReportGeneratorService);
  leadService = inject(LeadService);
  
  // 狀態
  selectedTimeRange: TimeRange = 'month';
  
  // 計算屬性
  funnelData = computed(() => this.funnelAnalytics.funnelData());
  funnelHealth = computed(() => this.funnelAnalytics.calculateFunnelHealth());
  bottlenecks = computed(() => this.funnelAnalytics.bottlenecks());
  aiSummary = computed(() => this.aiPerformance.summary());
  aiComparison = computed(() => this.aiPerformance.comparison());
  bestTimeSlots = computed(() => this.aiPerformance.getBestTimeSlots(5));
  currentReport = computed(() => this.reportGenerator.currentReport());
  
  // 關鍵指標
  keyMetrics = computed(() => {
    const base = this.analyticsData.baseMetrics();
    const conversion = this.analyticsData.conversionMetrics();
    const engagement = this.analyticsData.engagementMetrics();
    const trends = this.analyticsData.getKeyMetricsTrends();
    
    return [
      {
        label: '總客戶',
        value: base.totalLeads,
        icon: '👥',
        color: '#22d3ee',
        trend: trends.total
      },
      {
        label: '新增客戶',
        value: base.newLeads,
        icon: '✨',
        color: '#a78bfa',
        trend: trends.newLeads
      },
      {
        label: '轉化數',
        value: base.convertedLeads,
        icon: '🎯',
        color: '#4ade80',
        trend: trends.converted
      },
      {
        label: '轉化率',
        value: conversion.overallRate + '%',
        icon: '📈',
        color: '#f472b6',
        trend: null
      }
    ];
  });
  
  // 頂部客戶
  topLeads = computed(() => {
    const report = this.currentReport();
    if (report?.topLeads) {
      return report.topLeads;
    }
    
    // 簡化計算
    return this.leadService.leads()
      .filter(l => l.stage === 'qualified' || l.stage === 'lead')
      .slice(0, 5)
      .map(lead => ({
        lead,
        score: lead.scores.intent,
        reason: lead.stage === 'qualified' ? '合格客戶' : '潛在客戶'
      }));
  });
  
  // Math 引用供模板使用
  Math = Math;
  
  ngOnInit(): void {
    this.analyticsData.setTimeRange(this.selectedTimeRange);
  }
  
  // ============ 事件處理 ============
  
  onTimeRangeChange(range: TimeRange): void {
    this.analyticsData.setTimeRange(range);
  }
  
  async generateReport(): Promise<void> {
    try {
      await this.reportGenerator.generateReport({
        type: 'full',
        timeRange: this.selectedTimeRange
      });
    } catch (e) {
      console.error('Failed to generate report:', e);
    }
  }
  
  downloadReport(format: ExportFormat): void {
    const report = this.currentReport();
    if (report) {
      this.reportGenerator.downloadReport(report, format);
    }
  }
  
  // ============ 輔助方法 ============
  
  getHealthClass(grade: string): string {
    const classes: Record<string, string> = {
      'A': 'bg-green-500/20 text-green-400',
      'B': 'bg-cyan-500/20 text-cyan-400',
      'C': 'bg-yellow-500/20 text-yellow-400',
      'D': 'bg-orange-500/20 text-orange-400',
      'F': 'bg-red-500/20 text-red-400'
    };
    return classes[grade] || 'bg-slate-500/20 text-slate-400';
  }
  
  getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      warning: '🟡',
      info: '🔵'
    };
    return icons[severity] || '⚪';
  }
  
  getComparisonWidth(item: any, type: 'ai' | 'manual'): string {
    const max = Math.max(item.aiValue, item.manualValue) || 1;
    const value = type === 'ai' ? item.aiValue : item.manualValue;
    return Math.round((value / max) * 100) + '%';
  }
  
  formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return days + '天';
    if (hours > 0) return hours + '小時';
    return Math.floor(ms / (1000 * 60)) + '分';
  }
  
  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
}
