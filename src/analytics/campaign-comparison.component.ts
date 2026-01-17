/**
 * 活動效果對比組件 - 第二階段數據分析
 * Campaign Comparison with A/B Testing Analysis
 * 
 * 功能:
 * 1. 多活動並排對比
 * 2. 關鍵指標可視化
 * 3. 勝出者識別
 * 4. 統計顯著性分析
 * 5. ROI 計算
 */

import { Component, signal, computed, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 活動數據
export interface CampaignData {
  id: string;
  name: string;
  type: 'ad' | 'nurturing' | 'outreach' | 'broadcast';
  status: 'active' | 'completed' | 'paused';
  startDate: Date;
  endDate?: Date;
  metrics: CampaignMetrics;
  cost?: number;
  tags?: string[];
}

// 活動指標
export interface CampaignMetrics {
  reach: number;          // 觸達人數
  impressions: number;    // 曝光次數
  clicks: number;         // 點擊次數
  responses: number;      // 回覆人數
  conversions: number;    // 轉化人數
  revenue?: number;       // 產生收入
  ctr?: number;           // 點擊率
  conversionRate?: number;// 轉化率
  responseRate?: number;  // 回覆率
  roi?: number;           // 投資回報率
}

// 對比結果
export interface ComparisonResult {
  winner: string;
  metric: string;
  improvement: number;
  confidence: number;
  isSignificant: boolean;
}

@Component({
  selector: 'app-campaign-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="campaign-comparison bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <!-- 頭部 -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span class="text-xl">📊</span>
              活動效果對比
            </h3>
            @if (selectedCampaigns().length >= 2) {
              <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
                已選 {{ selectedCampaigns().length }} 個活動
              </span>
            }
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 指標選擇 -->
            <select [(ngModel)]="primaryMetric" 
                    class="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white">
              <option value="conversionRate">轉化率</option>
              <option value="responseRate">回覆率</option>
              <option value="ctr">點擊率</option>
              <option value="roi">ROI</option>
              <option value="reach">觸達人數</option>
            </select>
          </div>
        </div>
        
        <!-- 活動選擇器 -->
        <div class="mt-4 flex flex-wrap gap-2">
          @for (campaign of campaigns(); track campaign.id) {
            <button (click)="toggleCampaign(campaign.id)"
                    class="px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-2 border"
                    [class.bg-cyan-500/20]="isSelected(campaign.id)"
                    [class.border-cyan-500/50]="isSelected(campaign.id)"
                    [class.text-cyan-300]="isSelected(campaign.id)"
                    [class.bg-slate-700/50]="!isSelected(campaign.id)"
                    [class.border-slate-600]="!isSelected(campaign.id)"
                    [class.text-slate-300]="!isSelected(campaign.id)">
              <span class="w-2 h-2 rounded-full"
                    [class.bg-green-400]="campaign.status === 'active'"
                    [class.bg-slate-400]="campaign.status === 'completed'"
                    [class.bg-yellow-400]="campaign.status === 'paused'"></span>
              <span>{{ campaign.name }}</span>
            </button>
          }
        </div>
      </div>
      
      <!-- 對比內容 -->
      @if (selectedCampaigns().length >= 2) {
        <div class="p-4">
          <!-- 勝出者顯示 -->
          @if (winner()) {
            <div class="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 
                        border border-emerald-500/30 rounded-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-3xl">🏆</span>
                  <div>
                    <div class="text-lg font-bold text-emerald-400">{{ winner()?.name }}</div>
                    <div class="text-sm text-slate-400">
                      {{ primaryMetric }} 指標表現最佳
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold text-white">
                    {{ formatMetricValue(getWinnerMetric()) }}
                  </div>
                  <div class="text-sm text-emerald-400">
                    比平均高 {{ getImprovementOverAverage().toFixed(1) }}%
                  </div>
                </div>
              </div>
            </div>
          }
          
          <!-- 指標對比表 -->
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-700">
                  <th class="text-left py-3 px-4 text-slate-400 font-medium">指標</th>
                  @for (campaign of selectedCampaigns(); track campaign.id) {
                    <th class="text-center py-3 px-4 font-medium"
                        [style.color]="getCampaignColor($index)">
                      {{ campaign.name }}
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (metric of displayMetrics; track metric.key) {
                  <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td class="py-3 px-4 text-slate-300">
                      <div class="flex items-center gap-2">
                        <span>{{ metric.icon }}</span>
                        <span>{{ metric.label }}</span>
                      </div>
                    </td>
                    @for (campaign of selectedCampaigns(); track campaign.id; let i = $index) {
                      <td class="text-center py-3 px-4">
                        <div class="flex flex-col items-center gap-1">
                          <span class="font-medium text-white">
                            {{ formatMetricValue(getMetricValue(campaign, metric.key)) }}{{ metric.suffix || '' }}
                          </span>
                          @if (isBestInMetric(campaign.id, metric.key)) {
                            <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">
                              最佳
                            </span>
                          }
                        </div>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- 可視化對比 -->
          <div class="mt-6">
            <h4 class="text-sm font-semibold text-white mb-4">視覺化對比</h4>
            <div class="space-y-4">
              @for (metric of displayMetrics; track metric.key) {
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-slate-400">{{ metric.label }}</span>
                    <span class="text-xs text-slate-500">{{ metric.icon }}</span>
                  </div>
                  <div class="space-y-1">
                    @for (campaign of selectedCampaigns(); track campaign.id; let i = $index) {
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400 w-20 truncate">{{ campaign.name }}</span>
                        <div class="flex-1 h-6 bg-slate-700/50 rounded-lg overflow-hidden">
                          <div class="h-full rounded-lg transition-all duration-500 flex items-center justify-end px-2"
                               [style.width.%]="getBarWidth(campaign, metric.key)"
                               [style.background]="getCampaignColor(i)">
                            <span class="text-xs font-medium text-white">
                              {{ formatMetricValue(getMetricValue(campaign, metric.key)) }}
                            </span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
          
          <!-- 統計分析 -->
          @if (statisticalAnalysis()) {
            <div class="mt-6 p-4 bg-slate-700/30 rounded-xl">
              <h4 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <span>📐</span> 統計分析
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <div class="text-xs text-slate-400 mb-1">置信度</div>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                           [style.width.%]="statisticalAnalysis()?.confidence || 0"></div>
                    </div>
                    <span class="text-sm font-medium text-white">
                      {{ statisticalAnalysis()?.confidence?.toFixed(0) }}%
                    </span>
                  </div>
                </div>
                <div>
                  <div class="text-xs text-slate-400 mb-1">統計顯著性</div>
                  <div class="flex items-center gap-2">
                    @if (statisticalAnalysis()?.isSignificant) {
                      <span class="text-emerald-400">✓ 顯著</span>
                    } @else {
                      <span class="text-yellow-400">⚠ 樣本量不足</span>
                    }
                  </div>
                </div>
              </div>
              @if (statisticalAnalysis()?.recommendation) {
                <div class="mt-3 p-3 bg-slate-800/50 rounded-lg text-sm text-slate-300">
                  💡 {{ statisticalAnalysis()?.recommendation }}
                </div>
              }
            </div>
          }
        </div>
      } @else {
        <!-- 空狀態 -->
        <div class="p-8 text-center">
          <div class="text-4xl mb-3">📊</div>
          <p class="text-slate-400">請選擇至少 2 個活動進行對比</p>
          <p class="text-sm text-slate-500 mt-1">點擊上方活動標籤選擇</p>
        </div>
      }
    </div>
  `
})
export class CampaignComparisonComponent implements OnInit {
  // 輸入
  campaigns = input<CampaignData[]>([]);
  
  // 輸出
  selectionChange = output<string[]>();
  
  // 狀態
  selectedIds = signal<string[]>([]);
  primaryMetric = 'conversionRate';
  
  // 顯示指標配置
  displayMetrics = [
    { key: 'reach', label: '觸達人數', icon: '👥', suffix: '' },
    { key: 'impressions', label: '曝光次數', icon: '👁️', suffix: '' },
    { key: 'clicks', label: '點擊次數', icon: '👆', suffix: '' },
    { key: 'responses', label: '回覆人數', icon: '💬', suffix: '' },
    { key: 'conversions', label: '轉化人數', icon: '✅', suffix: '' },
    { key: 'ctr', label: '點擊率', icon: '📊', suffix: '%' },
    { key: 'responseRate', label: '回覆率', icon: '💪', suffix: '%' },
    { key: 'conversionRate', label: '轉化率', icon: '🎯', suffix: '%' },
    { key: 'roi', label: 'ROI', icon: '💰', suffix: '%' }
  ];
  
  // 計算屬性
  selectedCampaigns = computed(() => {
    const ids = this.selectedIds();
    return this.campaigns().filter(c => ids.includes(c.id));
  });
  
  winner = computed(() => {
    const selected = this.selectedCampaigns();
    if (selected.length < 2) return null;
    
    const metric = this.primaryMetric as keyof CampaignMetrics;
    let best: CampaignData | null = null;
    let bestValue = -Infinity;
    
    for (const campaign of selected) {
      const value = this.getMetricValue(campaign, metric);
      if (value > bestValue) {
        bestValue = value;
        best = campaign;
      }
    }
    
    return best;
  });
  
  statisticalAnalysis = computed(() => {
    const selected = this.selectedCampaigns();
    if (selected.length < 2) return null;
    
    // 簡化的統計分析
    const totalSamples = selected.reduce((sum, c) => sum + c.metrics.reach, 0);
    const confidence = Math.min(95, totalSamples / 100);
    const isSignificant = totalSamples >= 1000;
    
    const recommendation = isSignificant 
      ? `建議採用 ${this.winner()?.name} 的策略，其表現顯著優於其他活動。`
      : `當前數據量不足以得出統計顯著結論，建議繼續收集數據。`;
    
    return {
      confidence,
      isSignificant,
      recommendation
    };
  });
  
  // 顏色配置
  campaignColors = [
    '#06b6d4', // cyan
    '#f97316', // orange
    '#8b5cf6', // violet
    '#10b981', // emerald
    '#f43f5e', // rose
    '#3b82f6'  // blue
  ];
  
  ngOnInit() {}
  
  // 切換活動選擇
  toggleCampaign(id: string) {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(i => i !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
    this.selectionChange.emit(this.selectedIds());
  }
  
  // 檢查是否選中
  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }
  
  // 獲取指標值
  getMetricValue(campaign: CampaignData, metric: string): number {
    return (campaign.metrics as any)[metric] || 0;
  }
  
  // 獲取勝出者指標
  getWinnerMetric(): number {
    const w = this.winner();
    if (!w) return 0;
    return this.getMetricValue(w, this.primaryMetric);
  }
  
  // 計算比平均值高出的百分比
  getImprovementOverAverage(): number {
    const selected = this.selectedCampaigns();
    if (selected.length < 2) return 0;
    
    const metric = this.primaryMetric;
    const values = selected.map(c => this.getMetricValue(c, metric));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const winnerValue = this.getWinnerMetric();
    
    if (avg === 0) return 0;
    return ((winnerValue - avg) / avg) * 100;
  }
  
  // 是否為該指標最佳
  isBestInMetric(campaignId: string, metric: string): boolean {
    const selected = this.selectedCampaigns();
    if (selected.length < 2) return false;
    
    const campaign = selected.find(c => c.id === campaignId);
    if (!campaign) return false;
    
    const value = this.getMetricValue(campaign, metric);
    return selected.every(c => this.getMetricValue(c, metric) <= value);
  }
  
  // 獲取柱狀圖寬度
  getBarWidth(campaign: CampaignData, metric: string): number {
    const selected = this.selectedCampaigns();
    const values = selected.map(c => this.getMetricValue(c, metric));
    const max = Math.max(...values);
    
    if (max === 0) return 0;
    return (this.getMetricValue(campaign, metric) / max) * 100;
  }
  
  // 獲取活動顏色
  getCampaignColor(index: number): string {
    return this.campaignColors[index % this.campaignColors.length];
  }
  
  // 格式化指標值
  formatMetricValue(value: number): string {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}萬`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(value < 1 ? 2 : 0);
  }
}
