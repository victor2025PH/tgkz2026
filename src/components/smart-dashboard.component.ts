/**
 * 智能儀表板組件
 * Smart Dashboard Component
 * 
 * 功能：
 * 1. 關鍵指標卡片
 * 2. AI 智能洞察
 * 3. 快速操作入口
 * 4. 實時活動流
 * 5. 熱門客戶推薦
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeadScoringService, LeadScore, HeatLevel } from '../services/lead-scoring.service';
import { ABTestingService } from '../services/ab-testing.service';

// 指標卡片
interface MetricCard {
  id: string;
  icon: string;
  label: string;
  value: string | number;
  change?: number;         // 變化率
  changeLabel?: string;    // 變化描述
  color: string;
  bgGradient: string;
}

// AI 洞察
interface AIInsight {
  id: string;
  icon: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
}

// 活動項
interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
  type: 'message' | 'reply' | 'conversion' | 'lead' | 'system';
}

// 快速操作
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  view: string;
}

@Component({
  selector: 'app-smart-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smart-dashboard h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div class="p-6 space-y-6">
        
        <!-- 歡迎區域 -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white mb-1">
              {{ getGreeting() }}
            </h1>
            <p class="text-slate-400">
              {{ getTodayDate() }} · 讓 AI 助您高效營銷
            </p>
          </div>
          
          <button (click)="refresh()"
                  [disabled]="isRefreshing()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
            @if (isRefreshing()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            } @else {
              🔄
            }
            刷新
          </button>
        </div>
        
        <!-- 關鍵指標卡片 -->
        <div class="grid grid-cols-4 gap-4">
          @for (card of metricCards(); track card.id) {
            <div class="p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer"
                 [style.background]="card.bgGradient"
                 [style.border-color]="card.color + '30'"
                 (click)="onMetricClick(card)">
              <div class="flex items-center justify-between mb-3">
                <span class="text-2xl">{{ card.icon }}</span>
                @if (card.change !== undefined) {
                  <span class="text-xs px-2 py-1 rounded-full"
                        [class.bg-green-500/20]="card.change >= 0"
                        [class.text-green-400]="card.change >= 0"
                        [class.bg-red-500/20]="card.change < 0"
                        [class.text-red-400]="card.change < 0">
                    {{ card.change >= 0 ? '↑' : '↓' }} {{ Math.abs(card.change).toFixed(1) }}%
                  </span>
                }
              </div>
              <div class="text-3xl font-bold text-white mb-1">{{ card.value }}</div>
              <div class="text-sm text-slate-400">{{ card.label }}</div>
              @if (card.changeLabel) {
                <div class="text-xs text-slate-500 mt-1">{{ card.changeLabel }}</div>
              }
            </div>
          }
        </div>
        
        <!-- 主內容區 -->
        <div class="grid grid-cols-3 gap-6">
          
          <!-- 左側：AI 洞察 + 熱門客戶 -->
          <div class="col-span-2 space-y-6">
            
            <!-- AI 智能洞察 -->
            <div class="p-5 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                  🤖 AI 智能洞察
                </h2>
                <button (click)="regenerateInsights()"
                        class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  ✨ 重新分析
                </button>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                @for (insight of aiInsights(); track insight.id) {
                  <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                       [class.border-green-500/30]="insight.type === 'success'"
                       [class.border-yellow-500/30]="insight.type === 'warning'"
                       [class.border-blue-500/30]="insight.type === 'info'"
                       [class.border-purple-500/30]="insight.type === 'tip'">
                    <div class="flex items-start gap-3">
                      <span class="text-2xl">{{ insight.icon }}</span>
                      <div class="flex-1">
                        <div class="font-medium text-white mb-1">{{ insight.title }}</div>
                        <div class="text-sm text-slate-400 mb-2">{{ insight.description }}</div>
                        @if (insight.actionLabel) {
                          <button (click)="onInsightAction(insight)"
                                  class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                            {{ insight.actionLabel }} →
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- 熱門客戶推薦 -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                  🔥 熱門客戶
                </h2>
                <button (click)="navigateTo.emit('leads')"
                        class="text-sm text-slate-400 hover:text-white transition-colors">
                  查看全部 →
                </button>
              </div>
              
              <div class="space-y-3">
                @for (lead of hotLeads(); track lead.contactId; let i = $index) {
                  <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
                       (click)="onLeadClick(lead)">
                    <!-- 排名 -->
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                         [class.bg-amber-500/20]="i === 0"
                         [class.text-amber-400]="i === 0"
                         [class.bg-slate-700]="i !== 0"
                         [class.text-slate-400]="i !== 0">
                      {{ i + 1 }}
                    </div>
                    
                    <!-- 頭像 -->
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {{ getInitial(lead.contactId) }}
                    </div>
                    
                    <!-- 信息 -->
                    <div class="flex-1 min-w-0">
                      <div class="text-white font-medium truncate">客戶 {{ lead.contactId.slice(-6) }}</div>
                      <div class="text-sm text-slate-400">
                        {{ lead.activityCount }} 次互動 · {{ formatDate(lead.lastActivity) }}
                      </div>
                    </div>
                    
                    <!-- 評分 -->
                    <div class="text-right">
                      <div class="text-lg font-bold"
                           [style.color]="getHeatColor(lead.heatLevel)">
                        {{ lead.totalScore }}
                      </div>
                      <div class="text-xs flex items-center gap-1"
                           [style.color]="getHeatColor(lead.heatLevel)">
                        {{ getHeatIcon(lead.heatLevel) }}
                        {{ getHeatLabel(lead.heatLevel) }}
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-slate-500">
                    <div class="text-4xl mb-2">📭</div>
                    <p>暫無熱門客戶數據</p>
                    <p class="text-sm mt-1">開始發送消息以生成評分</p>
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- 右側：快速操作 + 活動流 -->
          <div class="space-y-6">
            
            <!-- 快速操作 -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                ⚡ 快速操作
              </h2>
              
              <div class="grid grid-cols-2 gap-3">
                @for (action of quickActions; track action.id) {
                  <button (click)="navigateTo.emit(action.view)"
                          class="p-4 rounded-xl text-left transition-all hover:scale-[1.03] group"
                          [style.background]="action.color + '15'"
                          [style.border]="'1px solid ' + action.color + '30'">
                    <div class="text-2xl mb-2">{{ action.icon }}</div>
                    <div class="text-sm font-medium text-white">{{ action.label }}</div>
                    <div class="text-xs text-slate-400 mt-0.5">{{ action.description }}</div>
                  </button>
                }
              </div>
            </div>
            
            <!-- 實時活動 -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                📡 實時動態
              </h2>
              
              <div class="space-y-3 max-h-80 overflow-y-auto">
                @for (activity of recentActivities(); track activity.id) {
                  <div class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                         [class.bg-blue-500/20]="activity.type === 'message'"
                         [class.bg-green-500/20]="activity.type === 'reply'"
                         [class.bg-purple-500/20]="activity.type === 'conversion'"
                         [class.bg-amber-500/20]="activity.type === 'lead'"
                         [class.bg-slate-700]="activity.type === 'system'">
                      {{ activity.icon }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-white">{{ activity.title }}</div>
                      <div class="text-xs text-slate-500 truncate">{{ activity.description }}</div>
                    </div>
                    <div class="text-xs text-slate-500 whitespace-nowrap">{{ activity.time }}</div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-slate-500 text-sm">
                    暫無活動記錄
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        
        <!-- A/B 測試摘要（如果有運行中的測試） -->
        @if (abTestingService.activeTests().length > 0) {
          <div class="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                🧪 運行中的 A/B 測試
              </h2>
              <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {{ abTestingService.activeTests().length }} 個測試
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              @for (test of abTestingService.activeTests().slice(0, 2); track test.id) {
                <div class="p-4 bg-slate-800/50 rounded-xl">
                  <div class="font-medium text-white mb-2">{{ test.name }}</div>
                  <div class="flex items-center gap-4 text-sm">
                    @for (variant of test.variants; track variant.id) {
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-slate-400">{{ variant.name }}</span>
                          <span class="text-white">{{ variant.stats.conversionRate.toFixed(1) }}%</span>
                        </div>
                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                               [style.width.%]="variant.stats.conversionRate * 2">
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
        
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    
    /* 自定義滾動條 */
    .smart-dashboard ::-webkit-scrollbar {
      width: 6px;
    }
    
    .smart-dashboard ::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .smart-dashboard ::-webkit-scrollbar-thumb {
      background: rgb(71, 85, 105);
      border-radius: 3px;
    }
  `]
})
export class SmartDashboardComponent implements OnInit, OnDestroy {
  protected scoringService = inject(LeadScoringService);
  protected abTestingService = inject(ABTestingService);
  
  // 輸出事件
  navigateTo = output<string>();
  
  // 狀態
  isRefreshing = signal(false);
  
  // Math 供模板使用
  protected Math = Math;
  
  // 快速操作配置
  quickActions: QuickAction[] = [
    { id: 'q1', icon: '🎯', label: '策略規劃', description: 'AI 營銷助手', color: '#f97316', view: 'ai-assistant' },
    { id: 'q2', icon: '🤖', label: '自動執行', description: 'AI 團隊銷售', color: '#a855f7', view: 'ai-team' },
    { id: 'q3', icon: '📇', label: '資源中心', description: '管理聯繫人', color: '#22c55e', view: 'resource-center' },
    { id: 'q4', icon: '📊', label: '數據分析', description: '查看報告', color: '#06b6d4', view: 'analytics' },
  ];
  
  // 計算指標卡片
  metricCards = computed((): MetricCard[] => {
    const stats = this.scoringService.stats();
    
    return [
      {
        id: 'm1',
        icon: '👥',
        label: '總聯繫人',
        value: stats.total,
        change: 12.5,
        changeLabel: '較上週',
        color: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))'
      },
      {
        id: 'm2',
        icon: '🔥',
        label: '熱門客戶',
        value: stats.byLevel.hot + stats.byLevel.burning,
        change: 8.3,
        changeLabel: '高購買意向',
        color: '#f97316',
        bgGradient: 'linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.05))'
      },
      {
        id: 'm3',
        icon: '📊',
        label: '平均評分',
        value: stats.avgScore.toFixed(0),
        change: stats.avgScore > 30 ? 5.2 : -2.1,
        changeLabel: '互動熱度',
        color: '#22c55e',
        bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))'
      },
      {
        id: 'm4',
        icon: '🧪',
        label: 'A/B 測試',
        value: this.abTestingService.stats().running,
        changeLabel: '運行中',
        color: '#a855f7',
        bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))'
      },
    ];
  });
  
  // AI 洞察
  aiInsights = signal<AIInsight[]>([]);
  
  // 熱門客戶
  hotLeads = computed(() => this.scoringService.getHotLeads(5));
  
  // 最近活動
  recentActivities = signal<ActivityItem[]>([]);
  
  ngOnInit() {
    this.generateInsights();
    this.loadRecentActivities();
  }
  
  ngOnDestroy() {
    // 清理
  }
  
  /**
   * 獲取問候語
   */
  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return '早安 ☀️';
    if (hour < 18) return '午安 🌤️';
    return '晚安 🌙';
  }
  
  /**
   * 獲取今日日期
   */
  getTodayDate(): string {
    return new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
  
  /**
   * 刷新數據
   */
  async refresh() {
    this.isRefreshing.set(true);
    
    // 模擬刷新
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.generateInsights();
    this.loadRecentActivities();
    
    this.isRefreshing.set(false);
  }
  
  /**
   * 生成 AI 洞察
   */
  generateInsights() {
    const stats = this.scoringService.stats();
    const insights: AIInsight[] = [];
    
    // 基於數據生成洞察
    if (stats.byLevel.burning > 0) {
      insights.push({
        id: 'i1',
        icon: '🎯',
        type: 'success',
        title: `${stats.byLevel.burning} 個爆熱客戶`,
        description: '這些客戶購買意向極高，建議立即跟進！',
        action: 'hot-leads',
        actionLabel: '立即查看'
      });
    }
    
    if (stats.byLevel.cold > stats.total * 0.5) {
      insights.push({
        id: 'i2',
        icon: '⚠️',
        type: 'warning',
        title: '超過半數客戶處於冷淡狀態',
        description: '建議重新啟動營銷活動，提升客戶互動',
        action: 'ai-assistant',
        actionLabel: '創建營銷活動'
      });
    }
    
    const abStats = this.abTestingService.stats();
    if (abStats.completed > 0 && abStats.avgConversionLift > 10) {
      insights.push({
        id: 'i3',
        icon: '📈',
        type: 'success',
        title: `A/B 測試提升轉化 ${abStats.avgConversionLift.toFixed(1)}%`,
        description: '您的測試策略效果顯著，建議繼續優化',
        action: 'analytics',
        actionLabel: '查看詳情'
      });
    }
    
    // 默認洞察
    if (insights.length < 2) {
      insights.push({
        id: 'i4',
        icon: '💡',
        type: 'tip',
        title: '使用 AI 策略規劃',
        description: '讓 AI 幫您生成高轉化的營銷策略',
        action: 'ai-assistant',
        actionLabel: '開始規劃'
      });
    }
    
    if (insights.length < 4) {
      insights.push({
        id: 'i5',
        icon: '🤖',
        type: 'info',
        title: '嘗試 AI 團隊銷售',
        description: '一句話啟動 AI 自動化銷售流程',
        action: 'ai-team',
        actionLabel: '了解更多'
      });
    }
    
    this.aiInsights.set(insights.slice(0, 4));
  }
  
  /**
   * 重新生成洞察
   */
  regenerateInsights() {
    this.generateInsights();
  }
  
  /**
   * 載入最近活動
   */
  loadRecentActivities() {
    const history = this.scoringService.globalHistory();
    
    const activities: ActivityItem[] = history.slice(0, 10).map(h => ({
      id: h.id,
      icon: this.getActivityIcon(h.action),
      title: h.reason,
      description: `客戶 ${h.contactId.slice(-6)} · ${h.points > 0 ? '+' : ''}${h.points} 分`,
      time: this.formatTime(h.timestamp),
      type: this.getActivityType(h.action)
    }));
    
    this.recentActivities.set(activities);
  }
  
  /**
   * 獲取活動圖標
   */
  private getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      message_sent: '📤',
      message_replied: '💬',
      positive_reply: '😊',
      negative_reply: '😞',
      price_inquiry: '💰',
      demo_requested: '🎬',
      meeting_scheduled: '📅',
      referral_made: '🤝'
    };
    return icons[action] || '📌';
  }
  
  /**
   * 獲取活動類型
   */
  private getActivityType(action: string): ActivityItem['type'] {
    if (action.includes('reply')) return 'reply';
    if (action.includes('message')) return 'message';
    if (action.includes('meeting') || action.includes('demo')) return 'conversion';
    return 'lead';
  }
  
  /**
   * 格式化時間
   */
  private formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時前`;
    
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }
  
  /**
   * 獲取首字母
   */
  getInitial(id: string): string {
    return id.charAt(0).toUpperCase();
  }
  
  /**
   * 格式化日期
   */
  formatDate(date?: string): string {
    if (!date) return '無記錄';
    return this.formatTime(date);
  }
  
  /**
   * 獲取熱度顏色
   */
  getHeatColor(level: HeatLevel): string {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.color;
  }
  
  /**
   * 獲取熱度圖標
   */
  getHeatIcon(level: HeatLevel): string {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.icon;
  }
  
  /**
   * 獲取熱度標籤
   */
  getHeatLabel(level: HeatLevel): string {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.label;
  }
  
  /**
   * 指標卡片點擊
   */
  onMetricClick(card: MetricCard) {
    switch (card.id) {
      case 'm1':
        this.navigateTo.emit('resource-center');
        break;
      case 'm2':
        this.navigateTo.emit('leads');
        break;
      case 'm3':
        this.navigateTo.emit('analytics');
        break;
      case 'm4':
        // TODO: 導航到 A/B 測試頁面
        break;
    }
  }
  
  /**
   * 洞察操作
   */
  onInsightAction(insight: AIInsight) {
    if (insight.action) {
      this.navigateTo.emit(insight.action);
    }
  }
  
  /**
   * 客戶點擊
   */
  onLeadClick(lead: LeadScore) {
    // TODO: 打開客戶詳情
    this.navigateTo.emit('leads');
  }
}
