/**
 * Conversion Funnel Component
 * 轉化漏斗分析組件
 * 
 * 功能：
 * - 客戶旅程可視化
 * - 各階段轉化率
 * - 流失分析
 * - 時間趨勢
 */
import { Component, inject, signal, computed, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

// ============ 類型定義 ============

export interface FunnelStage {
  id: string;
  name: string;
  icon: string;
  count: number;
  color: string;
}

export interface FunnelData {
  stages: FunnelStage[];
  period: string;
  totalLeads: number;
  convertedLeads: number;
  averageDays: number;
}

export interface LeadJourney {
  leadId: string;
  leadName: string;
  stages: {
    stage: string;
    timestamp: Date;
    duration?: number;  // 在此階段停留的天數
  }[];
  currentStage: string;
  isConverted: boolean;
}

// ============ 組件 ============

@Component({
  selector: 'app-conversion-funnel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="conversion-funnel bg-slate-800 rounded-xl p-6 border border-slate-700">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-bold text-white flex items-center gap-2">
            📊 轉化漏斗分析
          </h3>
          <p class="text-sm text-slate-400 mt-1">追蹤客戶從獲取到轉化的完整旅程</p>
        </div>
        <div class="flex items-center gap-2">
          <select [(ngModel)]="selectedPeriod" 
                  (change)="loadData()"
                  class="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="90d">最近 90 天</option>
            <option value="all">全部時間</option>
          </select>
        </div>
      </div>
      
      <!-- 總體指標 -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <div class="text-sm text-slate-400">總線索</div>
          <div class="text-2xl font-bold text-white mt-1">{{ funnelData().totalLeads | number }}</div>
        </div>
        <div class="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <div class="text-sm text-slate-400">已轉化</div>
          <div class="text-2xl font-bold text-green-400 mt-1">{{ funnelData().convertedLeads | number }}</div>
        </div>
        <div class="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <div class="text-sm text-slate-400">總轉化率</div>
          <div class="text-2xl font-bold text-cyan-400 mt-1">{{ overallConversionRate() | number:'1.1-1' }}%</div>
        </div>
        <div class="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
          <div class="text-sm text-slate-400">平均轉化天數</div>
          <div class="text-2xl font-bold text-purple-400 mt-1">{{ funnelData().averageDays | number:'1.0-0' }} 天</div>
        </div>
      </div>
      
      <!-- 漏斗圖 -->
      <div class="funnel-chart mb-8">
        @for(stage of funnelData().stages; track stage.id; let i = $index) {
          <div class="funnel-stage mb-2">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span>{{ stage.icon }}</span>
                <span class="text-white font-medium">{{ stage.name }}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-slate-300">{{ stage.count | number }}</span>
                @if(i > 0) {
                  <span class="text-sm" 
                        [class.text-green-400]="getStageConversion(i) >= 50"
                        [class.text-yellow-400]="getStageConversion(i) >= 30 && getStageConversion(i) < 50"
                        [class.text-red-400]="getStageConversion(i) < 30">
                    {{ getStageConversion(i) | number:'1.1-1' }}%
                  </span>
                }
              </div>
            </div>
            <div class="relative h-10 bg-slate-700 rounded-lg overflow-hidden">
              <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                   [style.width.%]="getStageWidth(i)"
                   [style.background]="'linear-gradient(90deg, ' + stage.color + ', ' + stage.color + '80)'">
              </div>
              <!-- 損失指示 -->
              @if(i > 0 && getStageLoss(i) > 0) {
                <div class="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-red-400">
                  -{{ getStageLoss(i) | number }} ({{ getStageLossPercent(i) | number:'1.0-0' }}%)
                </div>
              }
            </div>
          </div>
        }
      </div>
      
      <!-- 階段間轉化詳情 -->
      <div class="stage-details">
        <h4 class="text-lg font-semibold text-white mb-4">📈 階段轉化詳情</h4>
        <div class="grid grid-cols-2 gap-4">
          @for(transition of stageTransitions(); track transition.from + transition.to) {
            <div class="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div class="flex items-center justify-between mb-2">
                <span class="text-slate-400">{{ transition.fromName }} → {{ transition.toName }}</span>
                <span class="font-bold" 
                      [class.text-green-400]="transition.rate >= 50"
                      [class.text-yellow-400]="transition.rate >= 30 && transition.rate < 50"
                      [class.text-red-400]="transition.rate < 30">
                  {{ transition.rate | number:'1.1-1' }}%
                </span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-300"
                     [class.bg-green-500]="transition.rate >= 50"
                     [class.bg-yellow-500]="transition.rate >= 30 && transition.rate < 50"
                     [class.bg-red-500]="transition.rate < 30"
                     [style.width.%]="transition.rate">
                </div>
              </div>
              <div class="flex justify-between mt-2 text-sm text-slate-500">
                <span>{{ transition.fromCount | number }} → {{ transition.toCount | number }}</span>
                <span>流失: {{ transition.lost | number }}</span>
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- 客戶旅程列表 -->
      @if(showJourneys) {
        <div class="customer-journeys mt-8">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-lg font-semibold text-white">🚀 客戶旅程追蹤</h4>
            <button (click)="showJourneys = false" 
                    class="text-slate-400 hover:text-white">
              收起
            </button>
          </div>
          
          <div class="space-y-3 max-h-96 overflow-y-auto">
            @for(journey of sampleJourneys(); track journey.leadId) {
              <div class="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {{ journey.leadName.charAt(0) }}
                    </div>
                    <div>
                      <div class="font-medium text-white">{{ journey.leadName }}</div>
                      <div class="text-sm text-slate-400">當前階段: {{ journey.currentStage }}</div>
                    </div>
                  </div>
                  @if(journey.isConverted) {
                    <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">✓ 已轉化</span>
                  }
                </div>
                
                <!-- 旅程時間線 -->
                <div class="flex items-center gap-1">
                  @for(stage of journey.stages; track stage.stage; let i = $index; let last = $last) {
                    <div class="flex items-center">
                      <div class="flex flex-col items-center">
                        <div class="w-3 h-3 rounded-full"
                             [class.bg-green-500]="journey.isConverted || i < journey.stages.length - 1"
                             [class.bg-cyan-500]="!journey.isConverted && i === journey.stages.length - 1">
                        </div>
                        <div class="text-xs text-slate-500 mt-1 text-center" style="max-width: 60px;">
                          {{ stage.stage }}
                        </div>
                      </div>
                      @if(!last) {
                        <div class="w-8 h-0.5 bg-slate-600 mx-1"></div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      } @else {
        <button (click)="showJourneys = true"
                class="w-full mt-6 py-3 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors">
          📋 查看客戶旅程詳情
        </button>
      }
    </div>
  `
})
export class ConversionFunnelComponent implements OnInit {
  @Input() data?: FunnelData;
  
  selectedPeriod = '30d';
  showJourneys = false;
  
  // 漏斗數據
  funnelData = signal<FunnelData>({
    stages: [],
    period: '30d',
    totalLeads: 0,
    convertedLeads: 0,
    averageDays: 0
  });
  
  // 計算屬性
  overallConversionRate = computed(() => {
    const data = this.funnelData();
    return data.totalLeads > 0 ? (data.convertedLeads / data.totalLeads) * 100 : 0;
  });
  
  stageTransitions = computed(() => {
    const stages = this.funnelData().stages;
    const transitions: any[] = [];
    
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stages[i];
      const to = stages[i + 1];
      const rate = from.count > 0 ? (to.count / from.count) * 100 : 0;
      
      transitions.push({
        from: from.id,
        to: to.id,
        fromName: from.name,
        toName: to.name,
        fromCount: from.count,
        toCount: to.count,
        rate,
        lost: from.count - to.count
      });
    }
    
    return transitions;
  });
  
  sampleJourneys = signal<LeadJourney[]>([]);
  
  ngOnInit(): void {
    this.loadData();
  }
  
  loadData(): void {
    // 模擬數據（實際應從服務獲取）
    const mockData: FunnelData = {
      period: this.selectedPeriod,
      totalLeads: 1000,
      convertedLeads: 85,
      averageDays: 12,
      stages: [
        { id: 'captured', name: '捕獲', icon: '🎯', count: 1000, color: '#06b6d4' },
        { id: 'contacted', name: '已聯繫', icon: '💬', count: 680, color: '#8b5cf6' },
        { id: 'interested', name: '有意向', icon: '⭐', count: 340, color: '#f59e0b' },
        { id: 'negotiating', name: '談判中', icon: '🤝', count: 156, color: '#ec4899' },
        { id: 'converted', name: '已轉化', icon: '✅', count: 85, color: '#10b981' }
      ]
    };
    
    this.funnelData.set(mockData);
    
    // 模擬客戶旅程
    this.sampleJourneys.set([
      {
        leadId: '1',
        leadName: 'Alice Chen',
        currentStage: '已轉化',
        isConverted: true,
        stages: [
          { stage: '捕獲', timestamp: new Date('2026-01-01') },
          { stage: '已聯繫', timestamp: new Date('2026-01-02') },
          { stage: '有意向', timestamp: new Date('2026-01-05') },
          { stage: '談判中', timestamp: new Date('2026-01-08') },
          { stage: '已轉化', timestamp: new Date('2026-01-10') }
        ]
      },
      {
        leadId: '2',
        leadName: 'Bob Wang',
        currentStage: '談判中',
        isConverted: false,
        stages: [
          { stage: '捕獲', timestamp: new Date('2026-01-03') },
          { stage: '已聯繫', timestamp: new Date('2026-01-04') },
          { stage: '有意向', timestamp: new Date('2026-01-07') },
          { stage: '談判中', timestamp: new Date('2026-01-09') }
        ]
      },
      {
        leadId: '3',
        leadName: 'Carol Li',
        currentStage: '有意向',
        isConverted: false,
        stages: [
          { stage: '捕獲', timestamp: new Date('2026-01-05') },
          { stage: '已聯繫', timestamp: new Date('2026-01-06') },
          { stage: '有意向', timestamp: new Date('2026-01-10') }
        ]
      }
    ]);
  }
  
  getStageWidth(index: number): number {
    const stages = this.funnelData().stages;
    if (stages.length === 0) return 0;
    const maxCount = stages[0].count;
    return maxCount > 0 ? (stages[index].count / maxCount) * 100 : 0;
  }
  
  getStageConversion(index: number): number {
    const stages = this.funnelData().stages;
    if (index === 0 || stages.length < 2) return 100;
    const prev = stages[index - 1].count;
    const current = stages[index].count;
    return prev > 0 ? (current / prev) * 100 : 0;
  }
  
  getStageLoss(index: number): number {
    const stages = this.funnelData().stages;
    if (index === 0) return 0;
    return stages[index - 1].count - stages[index].count;
  }
  
  getStageLossPercent(index: number): number {
    const stages = this.funnelData().stages;
    if (index === 0) return 0;
    const prev = stages[index - 1].count;
    return prev > 0 ? (this.getStageLoss(index) / prev) * 100 : 0;
  }
}

// 需要 FormsModule
import { FormsModule } from '@angular/forms';

// 更新組件 imports
@Component({
  selector: 'app-conversion-funnel-enhanced',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <app-conversion-funnel></app-conversion-funnel>
  `
})
export class ConversionFunnelEnhancedComponent {}
