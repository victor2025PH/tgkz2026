/**
 * 數據分析中心組件 - 第二階段整合頁面
 * Analytics Center - Unified Dashboard
 * 
 * 整合:
 * 1. 轉化漏斗可視化
 * 2. AI 智能洞察
 * 3. 活動效果對比
 * 4. 帳號健康儀表盤
 */

import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ConversionFunnelComponent, FunnelData } from './conversion-funnel.component';
import { AIInsightsComponent, AIInsight, Prediction } from './ai-insights.component';
import { CampaignComparisonComponent, CampaignData } from './campaign-comparison.component';
import { AccountHealthDashboardComponent, AccountHealthData } from './account-health-dashboard.component';
import { AnalyticsDataService } from './analytics-data.service';
import { BusinessApiService, BusinessSummary, LeadSourceData, TemplatePerformance, DailyTrend, FunnelStageData } from '../services/business-api.service';
import { ABTestPanelComponent } from './ab-test-panel.component';
import { RetryStatusComponent } from './retry-status.component';
import { BusinessChartsComponent } from './business-charts.component';

type AnalyticsTab = 'overview' | 'funnel' | 'campaigns' | 'health' | 'business' | 'abtest' | 'retry';

@Component({
  selector: 'app-analytics-center',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    ConversionFunnelComponent,
    AIInsightsComponent,
    CampaignComparisonComponent,
    AccountHealthDashboardComponent,
    ABTestPanelComponent,
    RetryStatusComponent,
    BusinessChartsComponent
  ],
  template: `
    <div class="analytics-center h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 
                        flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span class="text-xl">📊</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">數據分析中心</h1>
              <p class="text-xs text-slate-400">Phase 2 - 數據與分析</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- 時間範圍選擇 -->
            <select [(ngModel)]="timeRange" (ngModelChange)="onTimeRangeChange($event)"
                    class="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white">
              <option value="today">今日</option>
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="quarter">本季</option>
            </select>
            
            <!-- 刷新按鈕 -->
            <button (click)="refreshAllData()"
                    [disabled]="isLoading()"
                    class="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 
                           rounded-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50">
              @if (isLoading()) {
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              }
              <span>刷新數據</span>
            </button>
          </div>
        </div>
        
        <!-- Tab 導航 -->
        <div class="flex gap-1 mt-4 bg-slate-800/50 p-1 rounded-xl w-fit">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-cyan-500]="activeTab() === tab.id"
                    [class.to-blue-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.shadow-lg]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.hover:text-white]="activeTab() !== tab.id"
                    [class.hover:bg-slate-700/50]="activeTab() !== tab.id">
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          }
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="flex-1 overflow-y-auto p-4">
        @switch (activeTab()) {
          @case ('overview') {
            <!-- 概覽視圖 -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- 左欄：漏斗 + AI洞察 -->
              <div class="space-y-4">
                <app-conversion-funnel 
                  [data]="funnelData()">
                </app-conversion-funnel>
                
                <app-ai-insights
                  [insights]="insights()"
                  [predictions]="predictions()"
                  (selectInsight)="onInsightSelect($event)"
                  (executeActionEvent)="onInsightAction($event)"
                  (refresh)="refreshInsights()">
                </app-ai-insights>
              </div>
              
              <!-- 右欄：關鍵指標 + 活動概覽 -->
              <div class="space-y-4">
                <!-- 關鍵指標摘要 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📈</span> 關鍵指標
                  </h3>
                  <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 
                                border border-emerald-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">總轉化率</div>
                      <div class="text-3xl font-bold text-emerald-400 mt-1">
                        {{ funnelData().overallConversion.toFixed(1) }}%
                      </div>
                      <div class="text-xs text-emerald-400/60 mt-1">↑ 較上週 +2.3%</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 
                                border border-blue-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">活躍活動</div>
                      <div class="text-3xl font-bold text-blue-400 mt-1">
                        {{ getActiveCampaignCount() }}
                      </div>
                      <div class="text-xs text-blue-400/60 mt-1">{{ campaigns().length }} 個總計</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 
                                border border-yellow-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">帳號健康度</div>
                      <div class="text-3xl font-bold text-yellow-400 mt-1">
                        {{ getAvgHealthScore() }}
                      </div>
                      <div class="text-xs text-yellow-400/60 mt-1">
                        {{ getHealthyAccountCount() }}/{{ accountHealth().length }} 健康
                      </div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-pink-500/10 to-red-500/10 
                                border border-pink-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">待處理洞察</div>
                      <div class="text-3xl font-bold text-pink-400 mt-1">
                        {{ getHighPriorityInsightCount() }}
                      </div>
                      <div class="text-xs text-pink-400/60 mt-1">需要關注</div>
                    </div>
                  </div>
                </div>
                
                <!-- 活動摘要 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                      <span>🎯</span> 活動表現 TOP3
                    </h3>
                    <button (click)="activeTab.set('campaigns')"
                            class="text-xs text-cyan-400 hover:text-cyan-300">
                      查看全部 →
                    </button>
                  </div>
                  <div class="space-y-3">
                    @for (campaign of getTopCampaigns(); track campaign.id; let i = $index) {
                      <div class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                        <div class="w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold"
                             [class.from-yellow-400]="i === 0"
                             [class.to-orange-500]="i === 0"
                             [class.from-slate-300]="i === 1"
                             [class.to-slate-400]="i === 1"
                             [class.from-amber-600]="i === 2"
                             [class.to-amber-700]="i === 2">
                          {{ i + 1 }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="font-medium text-white text-sm truncate">{{ campaign.name }}</div>
                          <div class="text-xs text-slate-400">轉化 {{ campaign.metrics.conversions }}</div>
                        </div>
                        <div class="text-right">
                          <div class="text-sm font-medium text-emerald-400">
                            {{ (campaign.metrics.conversionRate || 0).toFixed(1) }}%
                          </div>
                          <div class="text-xs text-slate-400">轉化率</div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 健康警告 -->
                @if (getCriticalAccounts().length > 0) {
                  <div class="bg-red-500/10 rounded-xl border border-red-500/30 p-4">
                    <h3 class="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <span>⚠️</span> 需要立即處理
                    </h3>
                    <div class="space-y-2">
                      @for (account of getCriticalAccounts().slice(0, 3); track account.accountId) {
                        <div class="flex items-center justify-between p-2 bg-red-500/10 rounded-lg">
                          <div class="flex items-center gap-2">
                            <span class="text-red-400">{{ account.username || account.phone }}</span>
                            <span class="text-xs text-red-300">健康度 {{ account.healthScore }}</span>
                          </div>
                          <button (click)="onHealAccount(account)"
                                  class="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30">
                            修復
                          </button>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          
          @case ('business') {
            <!-- 🔧 P13-2: 業務分析看板 -->
            <div class="space-y-4">
              @if (bizLoading()) {
                <div class="flex items-center justify-center py-16">
                  <svg class="w-8 h-8 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span class="ml-3 text-slate-400">正在加載業務數據...</span>
                </div>
              } @else {
                <!-- 摘要卡片 -->
                @if (bizSummary(); as summary) {
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 
                                border border-blue-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">線索總量</div>
                      <div class="text-2xl font-bold text-blue-400 mt-1">{{ summary.total_leads || 0 }}</div>
                      <div class="text-xs text-blue-400/60 mt-1">今日新增 +{{ summary.new_leads_today || 0 }}</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-emerald-500/10 to-green-500/10 
                                border border-emerald-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">平均評分</div>
                      <div class="text-2xl font-bold text-emerald-400 mt-1">{{ (summary.avg_lead_score || 0).toFixed(1) }}</div>
                      <div class="text-xs text-emerald-400/60 mt-1">轉化率 {{ (summary.conversion_rate || 0).toFixed(1) }}%</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                                border border-purple-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">消息發送</div>
                      <div class="text-2xl font-bold text-purple-400 mt-1">{{ summary.total_messages || 0 }}</div>
                      <div class="text-xs text-purple-400/60 mt-1">今日 {{ summary.messages_today || 0 }}</div>
                    </div>
                    <div class="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 
                                border border-yellow-500/20 rounded-xl">
                      <div class="text-sm text-slate-400">活躍模板</div>
                      <div class="text-2xl font-bold text-yellow-400 mt-1">{{ summary.active_templates || 0 }}</div>
                      <div class="text-xs text-yellow-400/60 mt-1">最佳來源: {{ summary.top_source || '-' }}</div>
                    </div>
                  </div>
                }

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <!-- 線索來源排行 -->
                  <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span>📡</span> 線索來源 TOP
                    </h3>
                    @if (bizLeadSources().length > 0) {
                      <div class="space-y-3">
                        @for (src of bizLeadSources().slice(0, 8); track src.source; let i = $index) {
                          <div class="flex items-center gap-3">
                            <span class="w-5 text-xs text-slate-500 text-right">{{ i + 1 }}</span>
                            <div class="flex-1">
                              <div class="flex items-center justify-between mb-1">
                                <span class="text-sm text-white truncate max-w-[180px]">{{ src.source || '未知來源' }}</span>
                                <span class="text-xs text-slate-400">{{ src.count }} 人</span>
                              </div>
                              <div class="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                                     [style.width.%]="(src.count / (bizLeadSources()[0]?.count || 1)) * 100"></div>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="text-center text-slate-500 py-8">暫無數據</div>
                    }
                  </div>

                  <!-- 模板效果對比 -->
                  <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                    <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span>📝</span> 模板效果
                    </h3>
                    @if (bizTemplatePerf().length > 0) {
                      <div class="space-y-3">
                        @for (tmpl of bizTemplatePerf().slice(0, 8); track tmpl.id) {
                          <div class="p-3 bg-slate-700/30 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                              <span class="text-sm text-white font-medium truncate max-w-[200px]">{{ tmpl.name || 'Unnamed' }}</span>
                              <span class="text-xs px-2 py-0.5 rounded-full"
                                    [class]="tmpl.success_rate >= 0.7 ? 'bg-emerald-500/20 text-emerald-400' : 
                                             tmpl.success_rate >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' : 
                                             'bg-red-500/20 text-red-400'">
                                {{ (tmpl.success_rate * 100).toFixed(0) }}%
                              </span>
                            </div>
                            <div class="flex items-center gap-4 text-xs text-slate-400">
                              <span>使用 {{ tmpl.usage_count }} 次</span>
                              <span>成功 ~{{ tmpl.estimated_successes }}</span>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="text-center text-slate-500 py-8">暫無數據</div>
                    }
                  </div>
                </div>

                <!-- P14-5: Chart.js 趨勢折線圖（替代表格） -->
                @if (bizDailyTrends().length > 0) {
                  <app-business-charts
                    mode="trends"
                    [trendData]="bizDailyTrends()">
                  </app-business-charts>
                }

                <!-- P14-5: Chart.js 漏斗柱狀圖（替代 div bars） -->
                @if (bizFunnel().length > 0) {
                  <app-business-charts
                    mode="funnel"
                    [funnelData]="bizFunnel()">
                  </app-business-charts>
                }

                <!-- P14-5: Chart.js 線索來源餅圖 -->
                @if (bizLeadSources().length > 0) {
                  <app-business-charts
                    mode="sources"
                    [sourceData]="bizLeadSources()">
                  </app-business-charts>
                }
              }
            </div>
          }
          
          @case ('funnel') {
            <!-- 漏斗詳情 -->
            <div class="max-w-4xl mx-auto">
              <app-conversion-funnel 
                [data]="funnelData()">
              </app-conversion-funnel>
            </div>
          }
          
          @case ('campaigns') {
            <!-- 活動對比 -->
            <app-campaign-comparison
              [campaigns]="campaigns()"
              (selectionChange)="onCampaignSelectionChange($event)">
            </app-campaign-comparison>
          }
          
          @case ('abtest') {
            <!-- 🔧 P13-4: A/B 測試管理 -->
            <div class="max-w-4xl mx-auto">
              <app-ab-test-panel></app-ab-test-panel>
            </div>
          }
          
          @case ('health') {
            <!-- 帳號健康 -->
            <app-account-health-dashboard
              [accounts]="accountHealth()"
              (selectAccount)="onSelectAccount($event)"
              (diagnoseAccount)="onDiagnoseAccount($event)"
              (healAccount)="onHealAccount($event)"
              (refreshAll)="refreshAccountHealth()">
            </app-account-health-dashboard>
          }
          
          @case ('retry') {
            <!-- 🔧 P13-5: 重試策略 -->
            <div class="max-w-4xl mx-auto">
              <app-retry-status></app-retry-status>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
  `]
})
export class AnalyticsCenterComponent implements OnInit {
  private analyticsService = inject(AnalyticsDataService);
  private businessApi = inject(BusinessApiService);
  
  // 狀態
  activeTab = signal<AnalyticsTab>('overview');
  timeRange = 'week';
  isLoading = signal(false);
  
  // Tab 配置
  tabs = [
    { id: 'overview' as const, icon: '📊', label: '概覽' },
    { id: 'business' as const, icon: '💼', label: '業務分析' },
    { id: 'funnel' as const, icon: '🎯', label: '轉化漏斗' },
    { id: 'campaigns' as const, icon: '📣', label: '活動對比' },
    { id: 'abtest' as const, icon: '🧪', label: 'A/B測試' },
    { id: 'health' as const, icon: '🏥', label: '帳號健康' },
    { id: 'retry' as const, icon: '🔄', label: '重試策略' }
  ];
  
  // 數據信號 - 原有
  funnelData = computed(() => this.analyticsService.funnelData() || this.getDefaultFunnelData());
  insights = computed(() => this.analyticsService.insights());
  predictions = computed(() => this.analyticsService.predictions());
  campaigns = computed(() => this.analyticsService.campaigns());
  accountHealth = computed(() => this.analyticsService.accountHealth());
  
  // 🔧 P13-2: 後端業務數據信號
  bizSummary = this.businessApi.summary;
  bizLeadSources = this.businessApi.leadSources;
  bizTemplatePerf = this.businessApi.templatePerf;
  bizDailyTrends = this.businessApi.dailyTrends;
  bizFunnel = this.businessApi.funnelData;
  bizLoading = this.businessApi.isAnyLoading;
  
  ngOnInit() {
    this.loadMockData();
    // 🔧 P13-2: 同時加載後端真實數據
    this.loadBusinessData();
  }
  
  /** 🔧 P13-2: 從後端加載業務數據 */
  async loadBusinessData() {
    const days = this.timeRange === 'today' ? 1 
               : this.timeRange === 'week' ? 7 
               : this.timeRange === 'month' ? 30 
               : 90;
    try {
      await this.businessApi.loadAllAnalytics(days);
    } catch (e) {
      console.warn('[Analytics] Backend data unavailable, using mock data:', e);
    }
  }
  
  // 載入模擬數據
  loadMockData() {
    // 模擬線索數據
    const mockLeads = [
      ...Array(50).fill(null).map((_, i) => ({ id: i, stage: 'new' })),
      ...Array(35).fill(null).map((_, i) => ({ id: 100 + i, stage: 'interested' })),
      ...Array(25).fill(null).map((_, i) => ({ id: 200 + i, stage: 'contacted' })),
      ...Array(15).fill(null).map((_, i) => ({ id: 300 + i, stage: 'negotiating' })),
      ...Array(8).fill(null).map((_, i) => ({ id: 400 + i, stage: 'committed' })),
      ...Array(5).fill(null).map((_, i) => ({ id: 500 + i, stage: 'converted' }))
    ];
    
    // 模擬活動數據
    const mockCampaigns = [
      { id: 'c1', name: '新品推廣活動', type: 'ad', status: 'active' },
      { id: 'c2', name: '老客戶回訪', type: 'nurturing', status: 'active' },
      { id: 'c3', name: '春節促銷', type: 'broadcast', status: 'completed' },
      { id: 'c4', name: '社群拓展', type: 'outreach', status: 'active' },
      { id: 'c5', name: 'VIP客戶維護', type: 'nurturing', status: 'paused' }
    ];
    
    // 模擬帳號數據
    const mockAccounts = [
      { id: 1, phone: '+86 138****1234', username: 'sales_01', healthScore: 92, status: 'active', dailySendCount: 25, dailySendLimit: 50 },
      { id: 2, phone: '+86 139****5678', username: 'marketing_01', healthScore: 78, status: 'active', dailySendCount: 45, dailySendLimit: 50 },
      { id: 3, phone: '+86 137****9012', username: 'support_01', healthScore: 45, status: 'warning', dailySendCount: 50, dailySendLimit: 50, blockCount: 1 },
      { id: 4, phone: '+86 136****3456', username: 'sales_02', healthScore: 88, status: 'active', dailySendCount: 30, dailySendLimit: 50 },
      { id: 5, phone: '+86 135****7890', username: 'admin_01', healthScore: 35, status: 'critical', dailySendCount: 10, dailySendLimit: 50, blockCount: 2, errorRate: 25 }
    ];
    
    this.analyticsService.refreshAllData({
      leads: mockLeads,
      campaigns: mockCampaigns,
      accounts: mockAccounts
    });
  }
  
  // 獲取默認漏斗數據
  getDefaultFunnelData(): FunnelData {
    return {
      stages: [],
      totalLeads: 0,
      totalValue: 0,
      overallConversion: 0,
      period: '本週'
    };
  }
  
  // 時間範圍變更
  onTimeRangeChange(range: string) {
    this.refreshAllData();
  }
  
  // 刷新所有數據
  refreshAllData() {
    this.isLoading.set(true);
    this.loadMockData();
    this.loadBusinessData().finally(() => {
      this.isLoading.set(false);
    });
  }
  
  // 刷新洞察
  refreshInsights() {
    this.analyticsService.generateInsights({
      leads: [],
      campaigns: this.campaigns(),
      accounts: []
    });
  }
  
  // 刷新帳號健康
  refreshAccountHealth() {
    // 重新評估帳號健康
    this.refreshAllData();
  }
  
  // 洞察選擇
  onInsightSelect(insight: AIInsight) {
    console.log('Selected insight:', insight);
  }
  
  // 洞察操作
  onInsightAction(event: { insight: AIInsight; action: any }) {
    console.log('Execute action:', event);
    // 根據 action.handler 執行相應操作
  }
  
  // 活動選擇變更
  onCampaignSelectionChange(ids: string[]) {
    console.log('Selected campaigns:', ids);
  }
  
  // 選擇帳號
  onSelectAccount(account: AccountHealthData) {
    console.log('Selected account:', account);
  }
  
  // 診斷帳號
  onDiagnoseAccount(account: AccountHealthData) {
    console.log('Diagnose account:', account);
  }
  
  // 修復帳號
  onHealAccount(account: AccountHealthData) {
    console.log('Heal account:', account);
  }
  
  // 輔助方法
  getActiveCampaignCount(): number {
    return this.campaigns().filter(c => c.status === 'active').length;
  }
  
  getAvgHealthScore(): number {
    const accounts = this.accountHealth();
    if (accounts.length === 0) return 0;
    return Math.round(accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length);
  }
  
  getHealthyAccountCount(): number {
    return this.accountHealth().filter(a => a.healthScore >= 80).length;
  }
  
  getHighPriorityInsightCount(): number {
    return this.insights().filter(i => i.priority === 'high').length;
  }
  
  getTopCampaigns(): CampaignData[] {
    return [...this.campaigns()]
      .sort((a, b) => (b.metrics.conversionRate || 0) - (a.metrics.conversionRate || 0))
      .slice(0, 3);
  }
  
  getCriticalAccounts(): AccountHealthData[] {
    return this.accountHealth().filter(a => a.riskLevel === 'critical' || a.riskLevel === 'high');
  }
}
