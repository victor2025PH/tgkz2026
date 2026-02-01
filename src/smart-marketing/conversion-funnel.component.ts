/**
 * 轉化漏斗組件
 * Conversion Funnel Component
 * 
 * 🆕 優化 2-1: 漏斗可視化
 * 
 * 展示：目標 → 接觸 → 回覆 → 轉化
 */

import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FunnelData {
  label: string;
  value: number;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-conversion-funnel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="conversion-funnel">
      <!-- 標題 -->
      @if (showTitle()) {
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📊</span> 轉化漏斗
          </h3>
          @if (period()) {
            <span class="text-sm text-slate-400">{{ period() }}</span>
          }
        </div>
      }
      
      <!-- 漏斗圖 -->
      <div class="funnel-chart relative">
        @for (stage of funnelStages(); track stage.label; let i = $index) {
          <div class="funnel-stage mb-3">
            <div class="flex items-center gap-4">
              <!-- 漏斗條 -->
              <div class="funnel-bar flex-1 relative h-14 rounded-lg overflow-hidden"
                   [style.background]="'linear-gradient(to right, ' + stage.color + '20, ' + stage.color + '40)'">
                <!-- 填充 -->
                <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                     [style.width.%]="getBarWidth(stage.value)"
                     [style.background]="'linear-gradient(to right, ' + stage.color + ', ' + stage.color + 'cc)'">
                </div>
                
                <!-- 內容 -->
                <div class="absolute inset-0 flex items-center justify-between px-4">
                  <div class="flex items-center gap-3 z-10">
                    <span class="text-xl">{{ stage.icon }}</span>
                    <span class="font-medium text-white">{{ stage.label }}</span>
                  </div>
                  <span class="text-lg font-bold text-white z-10">{{ stage.value | number }}</span>
                </div>
              </div>
              
              <!-- 轉化率 -->
              @if (i > 0) {
                <div class="w-20 text-right">
                  <div class="text-lg font-bold"
                       [style.color]="getConversionRateColor(getStageConversionRate(i))">
                    {{ getStageConversionRate(i) }}%
                  </div>
                  <div class="text-xs text-slate-500">轉化率</div>
                </div>
              } @else {
                <div class="w-20"></div>
              }
            </div>
            
            <!-- 連接箭頭 -->
            @if (i < funnelStages().length - 1) {
              <div class="flex items-center justify-center h-6 text-slate-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4L12 20M12 20L6 14M12 20L18 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            }
          </div>
        }
      </div>
      
      <!-- 總體統計 -->
      <div class="mt-6 pt-6 border-t border-slate-700/50">
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-400">{{ overallConversionRate() }}%</div>
            <div class="text-xs text-slate-400">總體轉化率</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-cyan-400">{{ avgTimeToConvert() }}</div>
            <div class="text-xs text-slate-400">平均轉化時間</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold"
                 [class.text-emerald-400]="conversionTrend() > 0"
                 [class.text-red-400]="conversionTrend() < 0"
                 [class.text-slate-400]="conversionTrend() === 0">
              {{ conversionTrend() > 0 ? '+' : '' }}{{ conversionTrend() }}%
            </div>
            <div class="text-xs text-slate-400">較上期</div>
          </div>
        </div>
      </div>
      
      <!-- 階段分析 -->
      @if (showAnalysis()) {
        <div class="mt-6 space-y-3">
          <h4 class="text-sm font-medium text-slate-400">階段分析</h4>
          
          @for (insight of stageInsights(); track insight.stage) {
            <div class="flex items-start gap-3 p-3 rounded-lg"
                 [class.bg-emerald-500/10]="insight.type === 'positive'"
                 [class.border-emerald-500/30]="insight.type === 'positive'"
                 [class.bg-amber-500/10]="insight.type === 'warning'"
                 [class.border-amber-500/30]="insight.type === 'warning'"
                 [class.bg-red-500/10]="insight.type === 'negative'"
                 [class.border-red-500/30]="insight.type === 'negative'"
                 [class.border]="true">
              <span class="text-lg">{{ insight.icon }}</span>
              <div>
                <div class="font-medium text-white text-sm">{{ insight.title }}</div>
                <div class="text-xs text-slate-400">{{ insight.description }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .funnel-bar {
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    
    .funnel-stage:first-child .funnel-bar {
      clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);
    }
    
    .funnel-stage:last-child .funnel-bar {
      clip-path: polygon(5% 0, 95% 0, 100% 100%, 0 100%);
    }
    
    .funnel-stage:not(:first-child):not(:last-child) .funnel-bar {
      clip-path: polygon(2% 0, 98% 0, 96% 100%, 4% 100%);
    }
  `]
})
export class ConversionFunnelComponent {
  // 輸入
  targets = input(0);
  contacted = input(0);
  replied = input(0);
  converted = input(0);
  
  showTitle = input(true);
  showAnalysis = input(true);
  period = input<string>('');
  
  // 趨勢數據（上期對比）
  previousConversionRate = input(0);
  avgConvertTime = input('2.3 天');
  
  // 計算屬性
  funnelStages = computed<FunnelData[]>(() => [
    { label: '目標客戶', value: this.targets(), color: '#8b5cf6', icon: '🎯' },
    { label: '已接觸', value: this.contacted(), color: '#06b6d4', icon: '👋' },
    { label: '已回覆', value: this.replied(), color: '#10b981', icon: '💬' },
    { label: '已轉化', value: this.converted(), color: '#f59e0b', icon: '✨' }
  ]);
  
  maxValue = computed(() => Math.max(this.targets(), 1));
  
  overallConversionRate = computed(() => {
    if (this.contacted() === 0) return 0;
    return Math.round((this.converted() / this.contacted()) * 100);
  });
  
  avgTimeToConvert = computed(() => this.avgConvertTime());
  
  conversionTrend = computed(() => {
    const current = this.overallConversionRate();
    const previous = this.previousConversionRate();
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  });
  
  stageInsights = computed(() => {
    const insights: { stage: string; type: 'positive' | 'warning' | 'negative'; icon: string; title: string; description: string }[] = [];
    
    // 接觸率分析
    const contactRate = this.targets() > 0 ? (this.contacted() / this.targets()) * 100 : 0;
    if (contactRate >= 80) {
      insights.push({
        stage: 'contact',
        type: 'positive',
        icon: '✅',
        title: '接觸率優秀',
        description: `${contactRate.toFixed(0)}% 的目標客戶已被接觸`
      });
    } else if (contactRate < 50) {
      insights.push({
        stage: 'contact',
        type: 'warning',
        icon: '⚠️',
        title: '接觸率偏低',
        description: '建議增加發送帳號或延長執行時間'
      });
    }
    
    // 回覆率分析
    const replyRate = this.contacted() > 0 ? (this.replied() / this.contacted()) * 100 : 0;
    if (replyRate >= 30) {
      insights.push({
        stage: 'reply',
        type: 'positive',
        icon: '💬',
        title: '回覆率良好',
        description: '客戶互動積極，繼續保持'
      });
    } else if (replyRate < 15) {
      insights.push({
        stage: 'reply',
        type: 'negative',
        icon: '📉',
        title: '回覆率需提升',
        description: '建議優化開場白或調整 AI 人格'
      });
    }
    
    // 轉化率分析
    const conversionRate = this.replied() > 0 ? (this.converted() / this.replied()) * 100 : 0;
    if (conversionRate >= 25) {
      insights.push({
        stage: 'conversion',
        type: 'positive',
        icon: '🎉',
        title: '轉化率出色',
        description: '當前策略非常有效'
      });
    } else if (conversionRate < 10) {
      insights.push({
        stage: 'conversion',
        type: 'warning',
        icon: '🔧',
        title: '轉化率有提升空間',
        description: '考慮引入更多角色或調整劇本'
      });
    }
    
    return insights;
  });
  
  // 方法
  getBarWidth(value: number): number {
    return Math.max(10, (value / this.maxValue()) * 100);
  }
  
  getStageConversionRate(stageIndex: number): number {
    const stages = this.funnelStages();
    if (stageIndex === 0 || stages[stageIndex - 1].value === 0) return 0;
    return Math.round((stages[stageIndex].value / stages[stageIndex - 1].value) * 100);
  }
  
  getConversionRateColor(rate: number): string {
    if (rate >= 50) return '#10b981'; // emerald
    if (rate >= 30) return '#06b6d4'; // cyan
    if (rate >= 15) return '#f59e0b'; // amber
    return '#ef4444'; // red
  }
}
