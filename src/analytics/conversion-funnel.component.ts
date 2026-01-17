/**
 * 轉化漏斗可視化組件 - 第二階段數據分析
 * Conversion Funnel Visualization with Interactive Charts
 * 
 * 功能:
 * 1. 漏斗各階段可視化
 * 2. 轉化率計算與展示
 * 3. 階段間流失分析
 * 4. 時間趨勢對比
 * 5. 瓶頸識別與建議
 */

import { Component, signal, computed, input, output, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 漏斗階段數據
export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value?: number;  // 金額價值
  color: string;
  icon: string;
  conversionRate?: number;  // 從上一階段的轉化率
  dropoffRate?: number;     // 流失率
  avgTimeInStage?: number;  // 平均停留時間（小時）
}

// 漏斗數據
export interface FunnelData {
  stages: FunnelStage[];
  totalLeads: number;
  totalValue: number;
  overallConversion: number;
  period: string;
  comparison?: {
    period: string;
    stages: FunnelStage[];
    percentChange: number;
  };
}

// 瓶頸分析
export interface BottleneckInfo {
  stageId: string;
  stageName: string;
  severity: 'critical' | 'warning' | 'info';
  dropoffRate: number;
  suggestion: string;
  potentialGain: number;  // 改善後預估增益
}

@Component({
  selector: 'app-conversion-funnel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="conversion-funnel bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <!-- 頭部 -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span class="text-xl">🎯</span>
              轉化漏斗
            </h3>
            <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
              {{ data().period }}
            </span>
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 視圖切換 -->
            <div class="flex bg-slate-700/50 rounded-lg p-0.5">
              <button (click)="viewMode.set('funnel')"
                      class="px-3 py-1 text-xs rounded-md transition-all"
                      [class.bg-cyan-500]="viewMode() === 'funnel'"
                      [class.text-white]="viewMode() === 'funnel'"
                      [class.text-slate-400]="viewMode() !== 'funnel'">
                漏斗
              </button>
              <button (click)="viewMode.set('bar')"
                      class="px-3 py-1 text-xs rounded-md transition-all"
                      [class.bg-cyan-500]="viewMode() === 'bar'"
                      [class.text-white]="viewMode() === 'bar'"
                      [class.text-slate-400]="viewMode() !== 'bar'">
                柱狀
              </button>
              <button (click)="viewMode.set('table')"
                      class="px-3 py-1 text-xs rounded-md transition-all"
                      [class.bg-cyan-500]="viewMode() === 'table'"
                      [class.text-white]="viewMode() === 'table'"
                      [class.text-slate-400]="viewMode() !== 'table'">
                表格
              </button>
            </div>
            
            <!-- 對比開關 -->
            @if (data().comparison) {
              <label class="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" [(ngModel)]="showComparison" 
                       class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                <span>對比 {{ data().comparison?.period }}</span>
              </label>
            }
          </div>
        </div>
        
        <!-- 整體指標 -->
        <div class="grid grid-cols-4 gap-4 mt-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">{{ data().totalLeads }}</div>
            <div class="text-xs text-slate-400">總線索</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-emerald-400">
              {{ data().overallConversion.toFixed(1) }}%
            </div>
            <div class="text-xs text-slate-400">總轉化率</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-cyan-400">
              {{ formatCurrency(data().totalValue) }}
            </div>
            <div class="text-xs text-slate-400">總價值</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold" 
                 [class.text-green-400]="healthScore() >= 80"
                 [class.text-yellow-400]="healthScore() >= 60 && healthScore() < 80"
                 [class.text-red-400]="healthScore() < 60">
              {{ healthScore() }}
            </div>
            <div class="text-xs text-slate-400">健康度</div>
          </div>
        </div>
      </div>
      
      <!-- 漏斗可視化 -->
      <div class="p-4">
        @switch (viewMode()) {
          @case ('funnel') {
            <!-- 漏斗視圖 -->
            <div class="funnel-container relative">
              @for (stage of data().stages; track stage.id; let i = $index; let isLast = $last) {
                <div class="funnel-stage relative mb-2"
                     (mouseenter)="hoveredStage.set(stage.id)"
                     (mouseleave)="hoveredStage.set(null)">
                  
                  <!-- 漏斗條 -->
                  <div class="relative h-12 flex items-center transition-all duration-300"
                       [style.margin-left.%]="getStageMargin(i)"
                       [style.margin-right.%]="getStageMargin(i)">
                    
                    <!-- 背景條 -->
                    <div class="absolute inset-0 rounded-lg opacity-80"
                         [style.background]="stage.color">
                    </div>
                    
                    <!-- 對比條 -->
                    @if (showComparison && data().comparison?.stages[i]) {
                      <div class="absolute top-0 left-0 h-full rounded-lg opacity-30 border-2 border-dashed"
                           [style.width.%]="getComparisonWidth(i)"
                           [style.border-color]="stage.color">
                      </div>
                    }
                    
                    <!-- 內容 -->
                    <div class="relative z-10 flex items-center justify-between w-full px-4">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">{{ stage.icon }}</span>
                        <span class="font-medium text-white">{{ stage.name }}</span>
                      </div>
                      <div class="flex items-center gap-4">
                        <span class="text-xl font-bold text-white">{{ stage.count }}</span>
                        @if (stage.conversionRate !== undefined && i > 0) {
                          <span class="text-sm px-2 py-0.5 bg-white/20 rounded"
                                [class.text-green-300]="stage.conversionRate >= 30"
                                [class.text-yellow-300]="stage.conversionRate >= 15 && stage.conversionRate < 30"
                                [class.text-red-300]="stage.conversionRate < 15">
                            {{ stage.conversionRate.toFixed(1) }}%
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  
                  <!-- 流失箭頭 -->
                  @if (!isLast && stage.dropoffRate && stage.dropoffRate > 0) {
                    <div class="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-400 text-xs">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                      </svg>
                      <span>-{{ stage.dropoffRate.toFixed(0) }}%</span>
                    </div>
                  }
                </div>
                
                <!-- 階段間連接線 -->
                @if (!isLast) {
                  <div class="h-4 flex items-center justify-center">
                    <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                    </svg>
                  </div>
                }
              }
            </div>
          }
          
          @case ('bar') {
            <!-- 柱狀圖視圖 -->
            <div class="bar-chart flex items-end justify-around h-64 px-4">
              @for (stage of data().stages; track stage.id) {
                <div class="flex flex-col items-center gap-2 flex-1 max-w-24">
                  <!-- 柱子 -->
                  <div class="relative w-full flex justify-center">
                    <div class="w-12 rounded-t-lg transition-all duration-500"
                         [style.height.px]="getBarHeight(stage)"
                         [style.background]="stage.color">
                    </div>
                    @if (showComparison && data().comparison?.stages) {
                      <div class="absolute w-8 rounded-t-lg border-2 border-dashed opacity-50"
                           [style.height.px]="getComparisonBarHeight(stage)"
                           [style.border-color]="stage.color">
                      </div>
                    }
                  </div>
                  <!-- 數值 -->
                  <div class="text-center">
                    <div class="font-bold text-white">{{ stage.count }}</div>
                    <div class="text-xs text-slate-400 truncate w-20">{{ stage.name }}</div>
                  </div>
                </div>
              }
            </div>
          }
          
          @case ('table') {
            <!-- 表格視圖 -->
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-slate-400 border-b border-slate-700">
                    <th class="text-left py-2 px-3">階段</th>
                    <th class="text-right py-2 px-3">數量</th>
                    <th class="text-right py-2 px-3">轉化率</th>
                    <th class="text-right py-2 px-3">流失率</th>
                    <th class="text-right py-2 px-3">平均停留</th>
                    <th class="text-right py-2 px-3">價值</th>
                    @if (showComparison) {
                      <th class="text-right py-2 px-3">對比</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (stage of data().stages; track stage.id; let i = $index) {
                    <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full" [style.background]="stage.color"></span>
                          <span>{{ stage.icon }} {{ stage.name }}</span>
                        </div>
                      </td>
                      <td class="text-right py-3 px-3 font-medium text-white">{{ stage.count }}</td>
                      <td class="text-right py-3 px-3">
                        @if (stage.conversionRate !== undefined) {
                          <span [class.text-green-400]="stage.conversionRate >= 30"
                                [class.text-yellow-400]="stage.conversionRate >= 15 && stage.conversionRate < 30"
                                [class.text-red-400]="stage.conversionRate < 15">
                            {{ stage.conversionRate.toFixed(1) }}%
                          </span>
                        } @else {
                          <span class="text-slate-500">-</span>
                        }
                      </td>
                      <td class="text-right py-3 px-3">
                        @if (stage.dropoffRate !== undefined) {
                          <span class="text-red-400">{{ stage.dropoffRate.toFixed(1) }}%</span>
                        } @else {
                          <span class="text-slate-500">-</span>
                        }
                      </td>
                      <td class="text-right py-3 px-3 text-slate-300">
                        {{ stage.avgTimeInStage ? formatDuration(stage.avgTimeInStage) : '-' }}
                      </td>
                      <td class="text-right py-3 px-3 text-cyan-400">
                        {{ stage.value ? formatCurrency(stage.value) : '-' }}
                      </td>
                      @if (showComparison && data().comparison?.stages[i]) {
                        <td class="text-right py-3 px-3">
                          @let change = getStageChange(i);
                          <span [class.text-green-400]="change > 0"
                                [class.text-red-400]="change < 0"
                                [class.text-slate-400]="change === 0">
                            {{ change > 0 ? '+' : '' }}{{ change.toFixed(0) }}%
                          </span>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>
      
      <!-- 瓶頸分析 -->
      @if (bottlenecks().length > 0) {
        <div class="p-4 border-t border-slate-700/50">
          <h4 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <span>⚠️</span> 瓶頸分析
          </h4>
          <div class="space-y-2">
            @for (bottleneck of bottlenecks(); track bottleneck.stageId) {
              <div class="p-3 rounded-lg border"
                   [class.bg-red-500/10]="bottleneck.severity === 'critical'"
                   [class.border-red-500/30]="bottleneck.severity === 'critical'"
                   [class.bg-yellow-500/10]="bottleneck.severity === 'warning'"
                   [class.border-yellow-500/30]="bottleneck.severity === 'warning'"
                   [class.bg-blue-500/10]="bottleneck.severity === 'info'"
                   [class.border-blue-500/30]="bottleneck.severity === 'info'">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="font-medium text-white text-sm">
                      {{ bottleneck.stageName }} 流失率 {{ bottleneck.dropoffRate.toFixed(1) }}%
                    </div>
                    <div class="text-xs text-slate-400 mt-1">{{ bottleneck.suggestion }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-xs text-slate-400">改善潛力</div>
                    <div class="text-sm font-medium text-green-400">
                      +{{ bottleneck.potentialGain }} 轉化
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .funnel-container {
      perspective: 1000px;
    }
    .funnel-stage:hover .relative {
      transform: scale(1.02);
    }
  `]
})
export class ConversionFunnelComponent implements OnInit {
  // 輸入
  data = input<FunnelData>({
    stages: [],
    totalLeads: 0,
    totalValue: 0,
    overallConversion: 0,
    period: '本週'
  });
  
  // 狀態
  viewMode = signal<'funnel' | 'bar' | 'table'>('funnel');
  showComparison = false;
  hoveredStage = signal<string | null>(null);
  
  // 計算屬性
  healthScore = computed(() => {
    const stages = this.data().stages;
    if (stages.length === 0) return 0;
    
    // 基於轉化率計算健康度
    let score = 100;
    for (const stage of stages) {
      if (stage.dropoffRate && stage.dropoffRate > 50) {
        score -= 20;
      } else if (stage.dropoffRate && stage.dropoffRate > 30) {
        score -= 10;
      }
    }
    
    return Math.max(0, Math.min(100, score));
  });
  
  bottlenecks = computed<BottleneckInfo[]>(() => {
    const stages = this.data().stages;
    const bottlenecks: BottleneckInfo[] = [];
    
    for (let i = 1; i < stages.length; i++) {
      const stage = stages[i];
      const prevStage = stages[i - 1];
      
      if (stage.dropoffRate && stage.dropoffRate > 30) {
        const severity = stage.dropoffRate > 50 ? 'critical' : 
                        stage.dropoffRate > 40 ? 'warning' : 'info';
        
        const potentialGain = Math.round(prevStage.count * (stage.dropoffRate - 20) / 100);
        
        bottlenecks.push({
          stageId: stage.id,
          stageName: stage.name,
          severity,
          dropoffRate: stage.dropoffRate,
          suggestion: this.getSuggestion(stage.id, stage.dropoffRate),
          potentialGain
        });
      }
    }
    
    return bottlenecks.sort((a, b) => b.dropoffRate - a.dropoffRate);
  });
  
  ngOnInit() {}
  
  // 獲取階段邊距（形成漏斗形狀）
  getStageMargin(index: number): number {
    const stages = this.data().stages;
    if (stages.length === 0) return 0;
    return index * (40 / stages.length);
  }
  
  // 獲取對比寬度
  getComparisonWidth(index: number): number {
    const comparison = this.data().comparison;
    if (!comparison) return 100;
    
    const current = this.data().stages[index]?.count || 0;
    const compared = comparison.stages[index]?.count || 0;
    
    if (current === 0) return 0;
    return Math.min(100, (compared / current) * 100);
  }
  
  // 獲取柱狀圖高度
  getBarHeight(stage: FunnelStage): number {
    const maxCount = Math.max(...this.data().stages.map(s => s.count));
    if (maxCount === 0) return 0;
    return (stage.count / maxCount) * 200;
  }
  
  // 獲取對比柱狀圖高度
  getComparisonBarHeight(stage: FunnelStage): number {
    const comparison = this.data().comparison;
    if (!comparison) return 0;
    
    const compStage = comparison.stages.find(s => s.id === stage.id);
    if (!compStage) return 0;
    
    const maxCount = Math.max(...this.data().stages.map(s => s.count));
    if (maxCount === 0) return 0;
    return (compStage.count / maxCount) * 200;
  }
  
  // 獲取階段變化
  getStageChange(index: number): number {
    const comparison = this.data().comparison;
    if (!comparison) return 0;
    
    const current = this.data().stages[index]?.count || 0;
    const compared = comparison.stages[index]?.count || 0;
    
    if (compared === 0) return current > 0 ? 100 : 0;
    return ((current - compared) / compared) * 100;
  }
  
  // 格式化貨幣
  formatCurrency(value: number): string {
    if (value >= 10000) {
      return `$${(value / 10000).toFixed(1)}萬`;
    }
    return `$${value.toFixed(0)}`;
  }
  
  // 格式化時長
  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分鐘`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}小時`;
    } else {
      return `${(hours / 24).toFixed(1)}天`;
    }
  }
  
  // 獲取建議
  getSuggestion(stageId: string, dropoffRate: number): string {
    const suggestions: Record<string, string> = {
      'interested': '建議增加首次接觸的吸引力，優化開場白話術',
      'contacted': '建議縮短回復時間，提高響應率',
      'negotiating': '建議準備更多異議處理話術，增加跟進頻率',
      'committed': '建議簡化成交流程，提供更多支付選項',
      'converted': '建議優化付款體驗，提供即時支持'
    };
    
    return suggestions[stageId] || '建議分析該階段用戶行為，優化轉化流程';
  }
}
