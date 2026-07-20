/**
 * 自動化總覽 Dashboard 組件
 * 精簡版 - 只顯示概覽和快捷入口，不重複獨立頁面的詳細列表
 * 
 * 職責：
 * 1. 監控狀態顯示和控制
 * 2. 今日關鍵指標展示
 * 3. 即時活動流
 * 4. 配置快捷入口（跳轉到獨立頁面）
 * 5. 配置進度指引
 */
import { Component, signal, computed, inject, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringStateService } from '../monitoring/monitoring-state.service';
import { ConfigProgressComponent } from '../monitoring/config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';

// 即時活動項
interface ActivityItem {
  id: string;
  type: 'match' | 'reply' | 'lead' | 'join' | 'error' | 'system' | 'message';
  message: string;
  detail?: string;
  timestamp: Date;
  icon: string;
}

@Component({
  selector: 'app-dashboard-overview',
  standalone: true,
  imports: [CommonModule, ConfigProgressComponent],
  template: `
    <div class="h-full overflow-y-auto">
      <div class="p-6 space-y-6">
        
        <!-- 頂部：監控狀態和控制 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                 [class.bg-gradient-to-br]="isMonitoring()"
                 [class.from-emerald-500]="isMonitoring()"
                 [class.to-cyan-500]="isMonitoring()"
                 [class.bg-slate-700]="!isMonitoring()">
              <span class="text-3xl">{{ isMonitoring() ? '🚀' : '⏸️' }}</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">自動化監控中心</h1>
              <p class="text-slate-400">
                @if (isMonitoring()) {
                  <span class="text-emerald-400">● 監控運行中</span> · 已運行 {{ runningTime() }}
                } @else {
                  <span class="text-slate-500">● 監控已停止</span> · 完成配置後即可開始
                }
              </p>
            </div>
          </div>
          
          <button (click)="toggleMonitoring()"
                  class="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                  [class.bg-gradient-to-r]="!isMonitoring()"
                  [class.from-emerald-500]="!isMonitoring()"
                  [class.to-cyan-500]="!isMonitoring()"
                  [class.text-white]="!isMonitoring()"
                  [class.hover:shadow-lg]="!isMonitoring()"
                  [class.hover:shadow-emerald-500/25]="!isMonitoring()"
                  [class.bg-red-500/20]="isMonitoring()"
                  [class.text-red-400]="isMonitoring()"
                  [class.hover:bg-red-500/30]="isMonitoring()"
                  [disabled]="!canStartMonitoring() && !isMonitoring()">
            @if (isMonitoring()) {
              <span>⏹️</span> 停止監控
            } @else {
              <span>▶️</span> 開始監控
            }
          </button>
        </div>
        
        <!-- 智能引導提示 -->
        @if (isMonitoring() && showMonitoringWarning()) {
          <div class="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30">
            <div class="flex items-start gap-3">
              <span class="text-2xl">⚠️</span>
              <div class="flex-1">
                <p class="text-amber-400 font-medium mb-1">{{ monitoringWarningMessage() }}</p>
                <p class="text-slate-400 text-sm mb-3">{{ monitoringWarningDetail() }}</p>
                <div class="flex flex-wrap gap-2">
                  @if (stateService.chatTemplates().length === 0) {
                    <button (click)="navigateTo('chat-templates')"
                            class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors flex items-center gap-1">
                      <span>📝</span> 創建消息模板
                    </button>
                  }
                  @if (!hasActiveRules()) {
                    <button (click)="navigateTo('trigger-rules')"
                            class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors flex items-center gap-1">
                      <span>⚡</span> 配置觸發規則
                    </button>
                  }
                </div>
              </div>
              <button (click)="dismissWarning()" class="text-slate-500 hover:text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        }

        <!-- 今日關鍵指標 -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- 今日匹配 -->
          <div class="bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-xl border border-orange-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">🔥</span>
              <span class="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
                {{ todayStats().matchTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(todayStats().matchTrend) }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().matchCount }}</div>
            <div class="text-sm text-slate-400">今日匹配</div>
          </div>
          
          <!-- 新增 Leads -->
          <div class="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl border border-emerald-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">✨</span>
              <span class="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                {{ todayStats().leadsTrend >= 0 ? '↑' : '↓' }} {{ Math.abs(todayStats().leadsTrend) }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().newLeads }}</div>
            <div class="text-sm text-slate-400">新增 Leads</div>
          </div>
          
          <!-- 自動回覆 -->
          <div class="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl border border-blue-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">📨</span>
              <span class="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                成功率 {{ todayStats().replySuccessRate }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().messagesSent }}</div>
            <div class="text-sm text-slate-400">自動回覆</div>
          </div>
          
          <!-- 節省時間 -->
          <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl border border-purple-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">⏰</span>
              <span class="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                vs 手動
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().timeSaved }}h</div>
            <div class="text-sm text-slate-400">節省時間</div>
          </div>
        </div>

        <!-- 主內容區：左右佈局 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- 左側：即時活動 + 配置進度 -->
          <div class="lg:col-span-2 space-y-6">
            <!-- 監控事件流 -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>📡</span> 監控事件流
                    @if (isMonitoring()) {
                      <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    }
                  </h3>
                  <span class="text-xs text-slate-500" title="顯示關鍵詞匹配、自動回覆等事件記錄">
                    ⓘ
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="navigateTo('trigger-rules')" 
                          class="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors">
                    ⚙️ 配置規則
                  </button>
                  @if (activities().length > 0) {
                    <button (click)="clearActivities()" 
                            class="text-xs text-slate-500 hover:text-slate-400">
                      清空
                    </button>
                  }
                </div>
              </div>
              <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
                @if (activities().length > 0) {
                  @for (activity of activities(); track activity.id) {
                    <div class="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <span class="text-xl">{{ activity.icon }}</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-white">{{ activity.message }}</p>
                        @if (activity.detail) {
                          <p class="text-xs text-slate-500 truncate">{{ activity.detail }}</p>
                        }
                      </div>
                      <span class="text-xs text-slate-500 whitespace-nowrap">{{ formatTime(activity.timestamp) }}</span>
                    </div>
                  }
                } @else {
                  <div class="text-center py-8">
                    <div class="text-4xl mb-3">📡</div>
                    <p class="text-slate-400 font-medium mb-2">暫無事件記錄</p>
                    <p class="text-xs text-slate-500 mb-4">
                      開始監控後，以下事件將顯示在這裡：
                    </p>
                    <div class="flex flex-wrap justify-center gap-2 mb-4">
                      <span class="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">🔑 關鍵詞匹配</span>
                      <span class="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">📨 自動回覆</span>
                      <span class="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">✨ 新 Lead 捕獲</span>
                    </div>
                    <div class="flex justify-center gap-3">
                      @if (!isMonitoring()) {
                        <button (click)="startMonitoringClick.emit()"
                                class="text-sm px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                          <span>▶️</span> 開始監控
                        </button>
                      }
                      <button (click)="navigateTo('trigger-rules')"
                              class="text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2">
                        <span>⚙️</span> 配置觸發規則
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- 配置進度（未完成時顯示） -->
            @if (!stateService.configStatus().isReady) {
              <app-config-progress 
                mode="detailed" 
                (action)="handleConfigAction($event)">
              </app-config-progress>
            }
          </div>

          <!-- 右側：快捷入口 -->
          <div class="space-y-6">
            <!-- 快速配置入口 -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50">
                <h3 class="font-semibold text-white flex items-center gap-2">
                  <span>⚙️</span> 快速配置
                </h3>
              </div>
              <div class="p-4 space-y-3">
                <!-- 監控帳號 -->
                <button (click)="navigateTo('monitoring-accounts')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span class="text-xl">📱</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">監控帳號</div>
                      <div class="text-xs text-slate-500">{{ stateService.listenerAccounts().length }} 監聽 · {{ stateService.senderAccounts().length }} 發送</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- 監控群組 -->
                <button (click)="navigateTo('monitoring-groups')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span class="text-xl">💬</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">監控群組</div>
                      <div class="text-xs text-slate-500">{{ stateService.groups().length }} 個群組 · {{ stateService.totalMembers() | number }} 成員</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- 關鍵詞集 -->
                <button (click)="navigateTo('keyword-sets')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span class="text-xl">🔑</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">關鍵詞集</div>
                      <div class="text-xs text-slate-500">{{ stateService.keywordSets().length }} 詞集 · {{ stateService.totalKeywords() }} 關鍵詞</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- 聊天模板 -->
                <button (click)="navigateTo('chat-templates')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group"
                        [class.border-2]="stateService.chatTemplates().length === 0"
                        [class.border-dashed]="stateService.chatTemplates().length === 0"
                        [class.border-amber-500/50]="stateService.chatTemplates().length === 0">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <span class="text-xl">📝</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white flex items-center gap-2">
                        聊天模板
                        @if (stateService.chatTemplates().length === 0) {
                          <span class="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">待設置</span>
                        }
                      </div>
                      <div class="text-xs text-slate-500">{{ stateService.chatTemplates().length }} 個模板</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 更多功能 -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50">
                <h3 class="font-semibold text-white flex items-center gap-2">
                  <span>📦</span> 更多功能
                </h3>
              </div>
              <div class="p-4 grid grid-cols-2 gap-3">
                <button (click)="navigateTo('resources')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">📚</span>
                  <span class="text-sm text-slate-300">資料庫</span>
                </button>
                <button (click)="navigateTo('trigger-rules')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">⚡</span>
                  <span class="text-sm text-slate-300">觸發規則</span>
                </button>
                <button (click)="navigateTo('leads')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">📤</span>
                  <span class="text-sm text-slate-300">群發管理</span>
                </button>
                <button (click)="navigateTo('analytics')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">📊</span>
                  <span class="text-sm text-slate-300">數據分析</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 下一步建議（配置未完成時顯示） -->
        @if (nextStepSuggestion()) {
          <div class="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <span class="text-2xl">💡</span>
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-white">{{ nextStepSuggestion()!.title }}</h4>
                <p class="text-sm text-slate-400">{{ nextStepSuggestion()!.description }}</p>
              </div>
              <button (click)="handleConfigAction(nextStepSuggestion()!.action)"
                      class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors">
                {{ nextStepSuggestion()!.buttonText }} →
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardOverviewComponent implements OnInit, OnDestroy {
  stateService = inject(MonitoringStateService);
  private ipcService = inject(ElectronIpcService);

  // 輸入
  isMonitoring = input<boolean>(false);
  todayStats = input<{
    matchCount: number;
    matchTrend: number;
    newLeads: number;
    leadsTrend: number;
    messagesSent: number;
    replySuccessRate: number;
    timeSaved: number;
    conversions: number;
  }>({
    matchCount: 0,
    matchTrend: 0,
    newLeads: 0,
    leadsTrend: 0,
    messagesSent: 0,
    replySuccessRate: 100,
    timeSaved: 0,
    conversions: 0
  });
  realtimeMatches = input<any[]>([]);

  // 輸出
  startMonitoringClick = output<void>();
  stopMonitoringClick = output<void>();
  navigateToPage = output<string>();
  configActionEvent = output<string>();

  // 本地狀態
  activities = signal<ActivityItem[]>([]);
  runningTime = signal('0:00');
  warningDismissed = signal(false);
  private runningInterval: any;
  private startTime: Date | null = null;

  // 計算屬性
  Math = Math;
  
  // 是否有活躍的觸發規則（從 StateService 獲取）
  hasActiveRules = computed(() => {
    return this.stateService.hasActiveTriggerRules();
  });
  
  // 監控警告狀態
  showMonitoringWarning = computed(() => {
    if (this.warningDismissed()) return false;
    const noTemplates = this.stateService.chatTemplates().length === 0;
    const noRules = !this.hasActiveRules();
    return noTemplates || noRules;
  });
  
  // 警告消息
  monitoringWarningMessage = computed(() => {
    const noTemplates = this.stateService.chatTemplates().length === 0;
    const noRules = !this.hasActiveRules();
    
    if (noTemplates && noRules) {
      return '監控中，但尚未配置自動回覆功能';
    } else if (noTemplates) {
      return '監控中，但缺少消息模板';
    } else if (noRules) {
      return '監控中，但缺少觸發規則';
    }
    return '';
  });
  
  // 警告詳情
  monitoringWarningDetail = computed(() => {
    const noTemplates = this.stateService.chatTemplates().length === 0;
    const noRules = !this.hasActiveRules();
    
    if (noTemplates && noRules) {
      return '匹配到的消息不會自動回覆。請創建消息模板和觸發規則。';
    } else if (noTemplates) {
      return '無法發送自動回覆，因為沒有可用的消息模板。';
    } else if (noRules) {
      return '匹配到的消息不會觸發任何動作，請前往「觸發規則」配置。';
    }
    return '';
  });

  canStartMonitoring = computed(() => {
    const status = this.stateService.configStatus();
    return status.completedCount >= 4; // 至少完成前4步
  });

  nextStepSuggestion = computed(() => {
    const status = this.stateService.configStatus();
    if (status.isReady) return null;

    const nextStep = status.nextStep;
    if (!nextStep) return null;

    const suggestions: Record<string, { title: string; description: string; buttonText: string; action: string }> = {
      'add-listener': {
        title: '添加監控帳號',
        description: '需要添加一個用於監控群組消息的 Telegram 帳號',
        buttonText: '去添加',
        action: 'monitoring-accounts'
      },
      'add-group': {
        title: '添加監控群組',
        description: '添加需要監控的 Telegram 群組',
        buttonText: '去添加',
        action: 'monitoring-groups'
      },
      'add-keywords': {
        title: '創建關鍵詞集',
        description: '設置用於匹配消息的關鍵詞',
        buttonText: '去創建',
        action: 'keyword-sets'
      },
      'bind-keywords': {
        title: '綁定關鍵詞集',
        description: '將關鍵詞集綁定到監控群組',
        buttonText: '去綁定',
        action: 'monitoring-groups'
      },
      'add-template': {
        title: '設置聊天模板',
        description: '配置自動回覆使用的消息模板',
        buttonText: '去設置',
        action: 'chat-templates'
      },
      'add-sender': {
        title: '配置發送帳號',
        description: '設置用於發送自動回覆的帳號',
        buttonText: '去配置',
        action: 'monitoring-accounts'
      }
    };

    return suggestions[nextStep.action || ''] || null;
  });

  private listeners: (() => void)[] = [];

  ngOnInit() {
    this.stateService.loadAll();
    this.setupActivityListeners();
  }

  ngOnDestroy() {
    if (this.runningInterval) {
      clearInterval(this.runningInterval);
    }
    this.listeners.forEach(cleanup => cleanup());
  }

  setupActivityListeners() {
    // 監聽匹配事件
    const cleanup1 = this.ipcService.on('keyword-matched', (data: any) => {
      this.addActivity({
        type: 'match',
        message: `在「${data.groupName}」匹配到關鍵詞「${data.keyword}」`,
        detail: data.messagePreview,
        icon: '🎯'
      });
    });
    this.listeners.push(cleanup1);

    // 監聽回覆事件
    const cleanup2 = this.ipcService.on('message-sent', (data: any) => {
      this.addActivity({
        type: 'reply',
        message: `自動回覆了 ${data.username || '用戶'}`,
        icon: '📨'
      });
    });
    this.listeners.push(cleanup2);

    // 監聽新 Lead 事件
    const cleanup3 = this.ipcService.on('lead-added', (data: any) => {
      this.addActivity({
        type: 'lead',
        message: `新增 Lead: ${data.username || data.name}`,
        icon: '✨'
      });
    });
    this.listeners.push(cleanup3);
    
    // 🔧 P1修復: 監聽 new-lead-captured 事件（後端實際發送的事件名）
    const cleanup4 = this.ipcService.on('new-lead-captured', (data: any) => {
      this.addActivity({
        type: 'lead',
        message: `捕獲新 Lead: @${data.username || data.user_id}`,
        detail: `來自群組: ${data.sourceGroup || data.source_group}`,
        icon: '✨'
      });
    });
    this.listeners.push(cleanup4);
    
    // 🔧 P1修復: 監聽監控相關的 log-entry 事件
    const cleanup5 = this.ipcService.on('log-entry', (data: { message: string; level: string }) => {
      // 只顯示重要的監控相關日誌
      if (data.message.includes('匹配') || data.message.includes('監控') || 
          data.message.includes('Lead') || data.message.includes('回覆')) {
        const icon = data.level === 'success' ? '✅' : 
                     data.level === 'warning' ? '⚠️' : 
                     data.level === 'error' ? '❌' : 'ℹ️';
        this.addActivity({
          type: 'system',
          message: data.message,
          icon
        });
      }
    });
    this.listeners.push(cleanup5);
    
    // 🔧 P1修復: 監聽監控啟動/停止事件
    const cleanup6 = this.ipcService.on('monitoring-started', (data: any) => {
      this.addActivity({
        type: 'system',
        message: data?.message || '監控已啟動',
        icon: '🚀'
      });
    });
    this.listeners.push(cleanup6);
    
    const cleanup7 = this.ipcService.on('monitoring-stopped', () => {
      this.addActivity({
        type: 'system',
        message: '監控已停止',
        icon: '⏹️'
      });
    });
    this.listeners.push(cleanup7);
    
    // 🔧 P1修復: 監聽私信事件
    const cleanup8 = this.ipcService.on('private-message-received', (data: any) => {
      this.addActivity({
        type: 'message',
        message: `收到私信: @${data.from_username || data.user_id}`,
        detail: data.text?.substring(0, 50) + (data.text?.length > 50 ? '...' : ''),
        icon: '💬'
      });
    });
    this.listeners.push(cleanup8);
  }

  addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>) {
    const newActivity: ActivityItem = {
      ...activity,
      id: `activity-${Date.now()}`,
      timestamp: new Date()
    };
    
    this.activities.update(list => [newActivity, ...list].slice(0, 50)); // 保留最近50條
  }

  clearActivities() {
    this.activities.set([]);
  }

  toggleMonitoring() {
    if (this.isMonitoring()) {
      this.stopMonitoringClick.emit();
      this.stopRunningTimer();
    } else {
      this.startMonitoringClick.emit();
      this.startRunningTimer();
    }
  }

  startRunningTimer() {
    this.startTime = new Date();
    this.runningInterval = setInterval(() => {
      if (this.startTime) {
        const diff = Date.now() - this.startTime.getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        this.runningTime.set(`${hours}:${minutes.toString().padStart(2, '0')}`);
      }
    }, 1000);
  }

  stopRunningTimer() {
    if (this.runningInterval) {
      clearInterval(this.runningInterval);
      this.runningInterval = null;
    }
    this.runningTime.set('0:00');
    this.startTime = null;
  }

  navigateTo(page: string) {
    this.navigateToPage.emit(page);
  }

  handleConfigAction(action: string) {
    this.configActionEvent.emit(action);
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return date.toLocaleDateString();
  }
  
  dismissWarning() {
    this.warningDismissed.set(true);
  }
}
