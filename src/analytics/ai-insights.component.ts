/**
 * AI 智能洞察組件 - 第二階段數據分析
 * AI-Powered Insights with Pattern Recognition
 * 
 * 功能:
 * 1. 數據模式識別
 * 2. 異常檢測
 * 3. 趨勢預測
 * 4. 優化建議生成
 * 5. 自動化行動建議
 */

import { Component, signal, computed, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// 洞察類型
export type InsightType = 'opportunity' | 'warning' | 'trend' | 'anomaly' | 'suggestion';
export type InsightPriority = 'high' | 'medium' | 'low';

// 洞察數據
export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  description: string;
  metric?: {
    name: string;
    current: number;
    previous?: number;
    change?: number;
    unit?: string;
  };
  action?: {
    label: string;
    handler: string;
    params?: Record<string, any>;
  };
  relatedData?: any[];
  timestamp: Date;
  isNew?: boolean;
}

// 預測數據
export interface Prediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  trend: 'up' | 'down' | 'stable';
  factors: string[];
}

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-insights bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <!-- 頭部 -->
      <div class="p-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 
                        flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span class="text-xl">🧠</span>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">AI 智能洞察</h3>
              <p class="text-xs text-slate-400">基於數據分析的智能建議</p>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400">
              {{ insights().length }} 條洞察
            </span>
            <button (click)="refresh.emit()"
                    class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 篩選標籤 -->
        <div class="flex gap-2 mt-4">
          @for (filter of filters; track filter.type) {
            <button (click)="activeFilter.set(filter.type)"
                    class="px-3 py-1 text-xs rounded-full transition-all flex items-center gap-1"
                    [class.bg-purple-500]="activeFilter() === filter.type"
                    [class.text-white]="activeFilter() === filter.type"
                    [class.bg-slate-700/50]="activeFilter() !== filter.type"
                    [class.text-slate-400]="activeFilter() !== filter.type">
              <span>{{ filter.icon }}</span>
              <span>{{ filter.label }}</span>
              @if (getTypeCount(filter.type) > 0) {
                <span class="px-1.5 py-0.5 rounded-full text-xs"
                      [class.bg-white/20]="activeFilter() === filter.type"
                      [class.bg-slate-600]="activeFilter() !== filter.type">
                  {{ getTypeCount(filter.type) }}
                </span>
              }
            </button>
          }
        </div>
      </div>
      
      <!-- 洞察列表 -->
      <div class="p-4 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
        @for (insight of filteredInsights(); track insight.id) {
          <div class="insight-card group p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01]"
               [class.bg-green-500/10]="insight.type === 'opportunity'"
               [class.border-green-500/30]="insight.type === 'opportunity'"
               [class.bg-red-500/10]="insight.type === 'warning'"
               [class.border-red-500/30]="insight.type === 'warning'"
               [class.bg-blue-500/10]="insight.type === 'trend'"
               [class.border-blue-500/30]="insight.type === 'trend'"
               [class.bg-yellow-500/10]="insight.type === 'anomaly'"
               [class.border-yellow-500/30]="insight.type === 'anomaly'"
               [class.bg-purple-500/10]="insight.type === 'suggestion'"
               [class.border-purple-500/30]="insight.type === 'suggestion'"
               (click)="selectInsight.emit(insight)">
            
            <!-- 新標記 -->
            @if (insight.isNew) {
              <div class="absolute -top-1 -right-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 
                          text-white text-xs font-semibold rounded-full">
                新
              </div>
            }
            
            <div class="flex items-start gap-3">
              <!-- 圖標 -->
              <div class="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                   [class.bg-green-500/20]="insight.type === 'opportunity'"
                   [class.bg-red-500/20]="insight.type === 'warning'"
                   [class.bg-blue-500/20]="insight.type === 'trend'"
                   [class.bg-yellow-500/20]="insight.type === 'anomaly'"
                   [class.bg-purple-500/20]="insight.type === 'suggestion'">
                {{ getTypeIcon(insight.type) }}
              </div>
              
              <!-- 內容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-white text-sm">{{ insight.title }}</h4>
                  <span class="px-1.5 py-0.5 text-xs rounded"
                        [class.bg-red-500/20]="insight.priority === 'high'"
                        [class.text-red-400]="insight.priority === 'high'"
                        [class.bg-yellow-500/20]="insight.priority === 'medium'"
                        [class.text-yellow-400]="insight.priority === 'medium'"
                        [class.bg-slate-500/20]="insight.priority === 'low'"
                        [class.text-slate-400]="insight.priority === 'low'">
                    {{ getPriorityLabel(insight.priority) }}
                  </span>
                </div>
                
                <p class="text-sm text-slate-400 mb-2">{{ insight.description }}</p>
                
                <!-- 指標卡片 -->
                @if (insight.metric) {
                  <div class="inline-flex items-center gap-3 px-3 py-1.5 bg-slate-700/50 rounded-lg text-sm">
                    <span class="text-slate-300">{{ insight.metric.name }}</span>
                    <span class="font-bold text-white">
                      {{ insight.metric.current }}{{ insight.metric.unit || '' }}
                    </span>
                    @if (insight.metric.change !== undefined) {
                      <span class="flex items-center gap-1"
                            [class.text-green-400]="insight.metric.change > 0"
                            [class.text-red-400]="insight.metric.change < 0"
                            [class.text-slate-400]="insight.metric.change === 0">
                        @if (insight.metric.change > 0) { ↑ }
                        @else if (insight.metric.change < 0) { ↓ }
                        @else { → }
                        {{ Math.abs(insight.metric.change).toFixed(1) }}%
                      </span>
                    }
                  </div>
                }
                
                <!-- 操作按鈕 -->
                @if (insight.action) {
                  <button (click)="executeAction(insight); $event.stopPropagation()"
                          class="mt-3 px-4 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-all"
                          [class.bg-green-500/20]="insight.type === 'opportunity'"
                          [class.text-green-400]="insight.type === 'opportunity'"
                          [class.hover:bg-green-500/30]="insight.type === 'opportunity'"
                          [class.bg-purple-500/20]="insight.type === 'suggestion'"
                          [class.text-purple-400]="insight.type === 'suggestion'"
                          [class.hover:bg-purple-500/30]="insight.type === 'suggestion'"
                          [class.bg-blue-500/20]="insight.type !== 'opportunity' && insight.type !== 'suggestion'"
                          [class.text-blue-400]="insight.type !== 'opportunity' && insight.type !== 'suggestion'"
                          [class.hover:bg-blue-500/30]="insight.type !== 'opportunity' && insight.type !== 'suggestion'">
                    <span>{{ insight.action.label }}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </button>
                }
              </div>
              
              <!-- 時間 -->
              <div class="text-xs text-slate-500">
                {{ formatTime(insight.timestamp) }}
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-8">
            <div class="text-4xl mb-3">🔍</div>
            <p class="text-slate-400">暫無洞察數據</p>
            <p class="text-sm text-slate-500 mt-1">系統正在分析中，請稍後...</p>
          </div>
        }
      </div>
      
      <!-- 預測區域 -->
      @if (predictions().length > 0) {
        <div class="p-4 border-t border-slate-700/50">
          <h4 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>🔮</span> 趨勢預測
          </h4>
          <div class="grid grid-cols-2 gap-3">
            @for (prediction of predictions(); track prediction.metric) {
              <div class="p-3 bg-slate-700/30 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs text-slate-400">{{ prediction.metric }}</span>
                  <span class="text-xs px-1.5 py-0.5 rounded"
                        [class.bg-green-500/20]="prediction.trend === 'up'"
                        [class.text-green-400]="prediction.trend === 'up'"
                        [class.bg-red-500/20]="prediction.trend === 'down'"
                        [class.text-red-400]="prediction.trend === 'down'"
                        [class.bg-slate-500/20]="prediction.trend === 'stable'"
                        [class.text-slate-400]="prediction.trend === 'stable'">
                    {{ prediction.trend === 'up' ? '↑ 上升' : prediction.trend === 'down' ? '↓ 下降' : '→ 穩定' }}
                  </span>
                </div>
                <div class="flex items-end gap-2">
                  <span class="text-lg font-bold text-white">{{ prediction.predictedValue }}</span>
                  <span class="text-xs text-slate-400 mb-0.5">
                    當前 {{ prediction.currentValue }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-2">
                  <div class="flex-1 h-1 bg-slate-600 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                         [style.width.%]="prediction.confidence"></div>
                  </div>
                  <span class="text-xs text-slate-400">{{ prediction.confidence }}% 置信度</span>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 3px; }
    .insight-card { position: relative; }
  `]
})
export class AIInsightsComponent implements OnInit {
  // 輸入
  insights = input<AIInsight[]>([]);
  predictions = input<Prediction[]>([]);
  
  // 輸出
  selectInsight = output<AIInsight>();
  executeActionEvent = output<{insight: AIInsight, action: any}>();
  refresh = output<void>();
  
  // 狀態
  activeFilter = signal<InsightType | 'all'>('all');
  
  // 篩選器配置
  filters = [
    { type: 'all' as const, icon: '📋', label: '全部' },
    { type: 'opportunity' as InsightType, icon: '💡', label: '機會' },
    { type: 'warning' as InsightType, icon: '⚠️', label: '警告' },
    { type: 'trend' as InsightType, icon: '📈', label: '趨勢' },
    { type: 'anomaly' as InsightType, icon: '🔔', label: '異常' },
    { type: 'suggestion' as InsightType, icon: '✨', label: '建議' }
  ];
  
  // 計算屬性
  filteredInsights = computed(() => {
    const filter = this.activeFilter();
    const allInsights = this.insights();
    
    if (filter === 'all') {
      return allInsights;
    }
    
    return allInsights.filter(i => i.type === filter);
  });
  
  Math = Math;
  
  ngOnInit() {}
  
  // 獲取類型數量
  getTypeCount(type: InsightType | 'all'): number {
    if (type === 'all') return this.insights().length;
    return this.insights().filter(i => i.type === type).length;
  }
  
  // 獲取類型圖標
  getTypeIcon(type: InsightType): string {
    const icons: Record<InsightType, string> = {
      opportunity: '💡',
      warning: '⚠️',
      trend: '📈',
      anomaly: '🔔',
      suggestion: '✨'
    };
    return icons[type];
  }
  
  // 獲取優先級標籤
  getPriorityLabel(priority: InsightPriority): string {
    const labels: Record<InsightPriority, string> = {
      high: '高優先',
      medium: '中優先',
      low: '低優先'
    };
    return labels[priority];
  }
  
  // 格式化時間
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${Math.floor(hours / 24)}天前`;
  }
  
  // 執行操作
  executeAction(insight: AIInsight) {
    if (insight.action) {
      this.executeActionEvent.emit({ insight, action: insight.action });
    }
  }
}
