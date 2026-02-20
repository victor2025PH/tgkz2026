/**
 * Dashboard View Component
 * 儀表板視圖組件 - 完整版
 * 
 * 🆕 Phase 28: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService } from '../services/account-management.service';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { MonitoringManagementService } from '../services/monitoring-management.service';
import { AutomationWorkflowService } from '../services/automation-workflow.service';

// 子組件導入
import { QuickWorkflowComponent } from '../quick-workflow.component';

export interface SystemStatus {
  accounts?: { online: number; total: number; senders_online?: number; senders_total?: number };
  monitoring?: { groups: number; active: boolean };
  ai?: { enabled: boolean; mode?: string; canReply?: boolean };
  campaigns?: { active: number; total: number };
  triggerRules?: { active: number; total: number };
  keywords?: { sets: number };
  templates?: { active: number; total: number };
  warnings?: { code: string; message: string; fix?: string }[];
}

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    QuickWorkflowComponent,
  ],
  template: `
    <div class="page-content">
      <!-- 🆕 簡化標題列 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-4xl font-bold" style="color: var(--text-primary);">運控中心</h2>
        <button (click)="refreshStatus()"
                class="flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-700
                       border border-slate-600/50 rounded-xl text-sm text-slate-300
                       hover:text-white transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          刷新狀態
        </button>
      </div>

      <!-- 🆕 新手引導橫幅（無帳號時顯示，帶 3 步走引導） -->
      @if (totalAccountsCount() === 0) {
        <div class="mb-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-5">
          <div class="flex items-start gap-4">
            <div class="text-3xl flex-shrink-0">🚦</div>
            <div class="flex-1">
              <div class="font-semibold text-white text-base mb-1">開始前，先完成 3 個準備步驟</div>
              <div class="flex items-center gap-6 mt-3 flex-wrap">
                <button (click)="navigateTo('accounts')"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/40
                               border border-amber-500/30 text-amber-300 text-sm font-medium transition-all">
                  <span class="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">1</span>
                  新增帳號
                </button>
                <span class="text-slate-600 text-sm">→</span>
                <button (click)="navigateTo('monitoring-groups')"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700
                               border border-slate-600/30 text-slate-300 text-sm font-medium transition-all">
                  <span class="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  添加監控群組
                </button>
                <span class="text-slate-600 text-sm">→</span>
                <button (click)="navigateTo('trigger-rules')"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-700
                               border border-slate-600/30 text-slate-300 text-sm font-medium transition-all">
                  <span class="w-5 h-5 rounded-full bg-slate-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  設置觸發規則
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- 快速新建（3 個核心場景，直接可操作） -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <button (click)="navigateTo('campaigns')"
                class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                       bg-gradient-to-br from-purple-500/10 to-slate-800/60 border-purple-500/20
                       hover:from-purple-500/20 hover:border-purple-500/40 group">
          <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">📢</div>
          <div>
            <div class="font-semibold text-white group-hover:text-purple-300 transition-colors">群廣播</div>
            <div class="text-xs text-slate-400 mt-0.5">向監控群組批量發送</div>
          </div>
        </button>
        <button (click)="navigateTo('lead-nurturing')"
                class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                       bg-gradient-to-br from-pink-500/10 to-slate-800/60 border-pink-500/20
                       hover:from-pink-500/20 hover:border-pink-500/40 group">
          <div class="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">💌</div>
          <div>
            <div class="font-semibold text-white group-hover:text-pink-300 transition-colors">私信跟進</div>
            <div class="text-xs text-slate-400 mt-0.5">跟進線索，推進轉化</div>
          </div>
        </button>
        <button (click)="navigateTo('trigger-rules')"
                class="flex items-center gap-4 p-4 rounded-2xl border transition-all text-left
                       bg-gradient-to-br from-amber-500/10 to-slate-800/60 border-amber-500/20
                       hover:from-amber-500/20 hover:border-amber-500/40 group">
          <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">⚡</div>
          <div>
            <div class="font-semibold text-white group-hover:text-amber-300 transition-colors">設置規則</div>
            <div class="text-xs text-slate-400 mt-0.5">關鍵詞觸發自動回覆</div>
          </div>
        </button>
      </div>
        
        <!-- 🚀 一鍵運行中心 -->
        <div class="rounded-xl p-6 mb-8" style="background: linear-gradient(to right, var(--primary-bg), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid var(--primary); box-shadow: var(--shadow-lg);">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">🚀</span>
              <h3 class="text-xl font-bold" style="color: var(--text-primary);">一鍵運行中心</h3>
            </div>
            <button (click)="refreshStatus()" class="transition-colors" style="color: var(--text-muted);" title="刷新狀態">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
          
          <!-- 快速狀態指示器（點擊跳轉） -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <!-- 帳號狀態 -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden cursor-pointer group transition-all hover:scale-[1.03] hover:shadow-lg"
                 style="background-color: var(--bg-card);"
                 (click)="navigateTo('accounts')"
                 title="點擊管理帳號">
              @if (onlineAccountsCount() > 0) {
                <div class="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">🔑</div>
                <div class="text-sm" style="color: var(--text-muted);">帳號在線</div>
                <div class="text-xl font-bold" [style.color]="onlineAccountsCount() > 0 ? 'var(--success)' : 'var(--error)'">
                  {{ onlineAccountsCount() }}/{{ totalAccountsCount() }}
                </div>
                <div class="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  點擊管理 →
                </div>
              </div>
            </div>
            
            <!-- 監控狀態 -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden cursor-pointer group transition-all hover:scale-[1.03] hover:shadow-lg"
                 style="background-color: var(--bg-card);"
                 (click)="navigateTo('monitoring-groups')"
                 title="點擊設置監控群組">
              @if (isMonitoring()) {
                <div class="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">📡</div>
                <div class="text-sm" style="color: var(--text-muted);">監控狀態</div>
                <div class="text-xl font-bold flex items-center justify-center gap-2" [style.color]="isMonitoring() ? 'var(--success)' : 'var(--error)'">
                  @if (isMonitoring()) {
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  }
                  {{ isMonitoring() ? '運行中' : '未啟動' }}
                </div>
                <div class="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  點擊設置 →
                </div>
              </div>
            </div>
            
            <!-- AI 聊天狀態 -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden cursor-pointer group transition-all hover:scale-[1.03] hover:shadow-lg"
                 style="background-color: var(--bg-card);"
                 (click)="navigateTo('ai-engine')"
                 title="點擊配置 AI">
              @if (status().ai?.enabled) {
                <div class="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">🤖</div>
                <div class="text-sm" style="color: var(--text-muted);">AI 聊天</div>
                <div class="text-xl font-bold" [style.color]="status().ai?.enabled ? 'var(--success)' : 'var(--error)'">
                  {{ status().ai?.enabled ? (status().ai?.mode === 'full' ? '全自動' : '半自動') : '未啟用' }}
                </div>
                <div class="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  點擊配置 →
                </div>
              </div>
            </div>
            
            <!-- 觸發規則狀態 -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden cursor-pointer group transition-all hover:scale-[1.03] hover:shadow-lg"
                 style="background-color: var(--bg-card);"
                 (click)="navigateTo('trigger-rules')"
                 title="點擊管理觸發規則">
              @if (triggerRulesActiveCount() > 0) {
                <div class="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">⚡</div>
                <div class="text-sm" style="color: var(--text-muted);">觸發規則</div>
                <div class="text-xl font-bold" [style.color]="triggerRulesActiveCount() > 0 ? 'var(--success)' : 'var(--warning)'">
                  @if (triggerRulesTotalCount() === 0) {
                    <span class="text-yellow-400 text-base">待設置</span>
                  } @else {
                    {{ triggerRulesActiveCount() }}/{{ triggerRulesTotalCount() }}
                  }
                </div>
                <div class="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                  點擊管理 →
                </div>
              </div>
            </div>
          </div>
          
          <!-- P1: AI 已啟用但無發送帳號時提示 -->
          @if (noSenderAccountWarning()) {
            <div class="rounded-lg p-3 mb-4 flex items-center justify-between gap-3" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.5);">
              <span class="text-amber-200 text-sm">⚠️ {{ noSenderAccountWarning()?.message }}</span>
              <button (click)="navigateTo('accounts')" class="px-3 py-1.5 text-sm rounded-lg transition-colors" style="background: rgba(245, 158, 11, 0.3); color: var(--text-primary);">
                前往帳號管理
              </button>
            </div>
          }
          @if (aiFullButNoModelWarning()) {
            <div class="rounded-lg p-3 mb-4 flex items-center justify-between gap-3" style="background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.5);">
              <span class="text-amber-200 text-sm">⚠️ {{ aiFullButNoModelWarning()?.message }}</span>
              <button (click)="navigateTo('ai-engine')" class="px-3 py-1.5 text-sm rounded-lg transition-colors" style="background: rgba(245, 158, 11, 0.3); color: var(--text-primary);">
                前往智能引擎
              </button>
            </div>
          }
          
          <!-- 🔧 P1: 增強版一鍵啟動進度 -->
          @if (starting()) {
            <div class="bg-slate-800/50 rounded-lg p-4 mb-4 border border-cyan-500/30">
              <!-- 當前步驟 -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="animate-spin h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                  <span class="text-cyan-300 font-medium">{{ startMessage() }}</span>
                </div>
                <!-- 🔧 P1: 手動刷新/取消按鈕 -->
                <button (click)="cancelAndRefresh()" 
                        class="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1"
                        title="取消並刷新狀態">
                  <span>✕</span>
                  <span>取消</span>
                </button>
              </div>
              
              <!-- 進度條 -->
              <div class="w-full bg-slate-700 rounded-full h-2.5 mb-3">
                <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" [style.width.%]="startProgress()"></div>
              </div>
              
              <!-- 分步指示器 -->
              <div class="flex justify-between text-xs">
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 10" [class.text-slate-500]="startProgress() < 10">
                  <span>{{ startProgress() >= 10 ? '✓' : '○' }}</span>
                  <span>帳號</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 40" [class.text-slate-500]="startProgress() < 40">
                  <span>{{ startProgress() >= 40 ? '✓' : '○' }}</span>
                  <span>群組</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 60" [class.text-slate-500]="startProgress() < 60">
                  <span>{{ startProgress() >= 60 ? '✓' : '○' }}</span>
                  <span>監控</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 80" [class.text-slate-500]="startProgress() < 80">
                  <span>{{ startProgress() >= 80 ? '✓' : '○' }}</span>
                  <span>AI</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 100" [class.text-slate-500]="startProgress() < 100">
                  <span>{{ startProgress() >= 100 ? '✓' : '○' }}</span>
                  <span>完成</span>
                </div>
              </div>
            </div>
          }
          
          <!-- 一鍵啟動按鈕 -->
          <div class="flex gap-4">
            @if (!isMonitoring() || !status().ai?.enabled) {
              <button 
                (click)="oneClickStart()" 
                [disabled]="starting()"
                class="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg flex items-center justify-center gap-2">
                <span class="text-xl">⚡</span>
                <span>一鍵全部啟動</span>
              </button>
            } @else {
              <button 
                (click)="oneClickStop()" 
                class="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg flex items-center justify-center gap-2">
                <span class="text-xl">🛑</span>
                <span>一鍵停止所有</span>
              </button>
            }
          </div>
        </div>
        
        <!-- 🆕 Phase1: 自動化工作流控制 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- 🎯 引導式工作流 -->
          <div class="rounded-xl p-6" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🎯</span>
                <h3 class="text-lg font-bold" style="color: var(--text-primary);">引導式工作流</h3>
              </div>
            </div>
            <p class="text-sm mb-4" style="color: var(--text-muted);">
              關鍵詞觸發 → AI 策劃 → 私聊培育 → 興趣建群 → 組群成交
            </p>
            
            <!-- 工作流狀態 -->
            @for (workflow of automationWorkflow.workflows(); track workflow.id) {
              <div class="p-4 rounded-lg mb-3" style="background-color: var(--bg-secondary);">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span [class.text-emerald-400]="workflow.enabled" [class.text-slate-500]="!workflow.enabled">
                      {{ workflow.enabled ? '🟢' : '⚪' }}
                    </span>
                    <span class="font-medium" style="color: var(--text-primary);">{{ workflow.name }}</span>
                  </div>
                  <button (click)="automationWorkflow.toggleWorkflow(workflow.id, !workflow.enabled)"
                          class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          [class.bg-emerald-500]="workflow.enabled"
                          [class.hover:bg-emerald-600]="workflow.enabled"
                          [class.text-white]="workflow.enabled"
                          [class.bg-slate-600]="!workflow.enabled"
                          [class.hover:bg-slate-500]="!workflow.enabled"
                          [class.text-slate-300]="!workflow.enabled">
                    {{ workflow.enabled ? '運行中' : '已暫停' }}
                  </button>
                </div>
                
                <!-- 統計 -->
                <div class="flex items-center gap-4 text-xs" style="color: var(--text-muted);">
                  <span>今日觸發: {{ workflow.stats.todayTriggers }}</span>
                  <span>進行中: {{ automationWorkflow.activeExecutionCount() }}</span>
                  <span>轉化: {{ workflow.stats.conversions }}</span>
                </div>
                
                <!-- 工作流步驟預覽 -->
                <div class="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                  @for (step of workflow.steps; track step.id; let i = $index) {
                    <div class="flex items-center">
                      <span class="px-2 py-1 text-xs rounded whitespace-nowrap"
                            style="background-color: var(--bg-tertiary); color: var(--text-secondary);">
                        {{ getStepIcon(step.type) }} {{ step.name }}
                      </span>
                      @if (i < workflow.steps.length - 1) {
                        <span class="mx-1" style="color: var(--text-muted);">→</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- 說明 -->
            <div class="text-xs p-3 rounded-lg" style="background-color: var(--bg-tertiary); color: var(--text-muted);">
              💡 啟用後，當監控群組觸發關鍵詞時，將自動執行 AI 策劃並開始多角色協作
            </div>
          </div>
          
        </div>
        
        <!-- 快速工作流 -->
        <app-quick-workflow
          [systemStatus]="status()"
          [isMonitoring]="isMonitoring()"
          (navigateTo)="navigateTo($event)"
          (startMonitoring)="startMonitoring()"
          (stopMonitoring)="stopMonitoring()">
        </app-quick-workflow>
    </div>
  `
})
export class DashboardViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private accountService = inject(AccountManagementService);
  public membershipService = inject(MembershipService);
  public automationWorkflow = inject(AutomationWorkflowService);
  
  // 內部狀態
  mode = signal<'smart' | 'classic'>('classic');
  starting = signal(false);
  startProgress = signal(0);
  startMessage = signal('');
  // 🔧 P0修復: 使用共享服務的監控狀態，而不是本地 signal
  private monitoringService = inject(MonitoringManagementService);
  isMonitoring = computed(() => this.monitoringService.monitoringActive());
  
  // 🔧 P1: 啟動超時控制
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly START_TIMEOUT_MS = 120000; // 120秒超時
  
  // 🔧 P2: 狀態心跳機制
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30秒心跳
  
  private _status = signal<SystemStatus>({});
  status = this._status.asReadonly();
  
  // 🔧 P0: 計算屬性（同時檢查 is_connected 和 status）
  onlineAccountsCount = computed(() => {
    const accounts = this.accountService.accounts();
    // 優先使用 status === 'Online'，其次使用 is_connected
    return accounts.filter(a => a.status === 'Online' || a.is_connected).length;
  });
  
  totalAccountsCount = computed(() => this.accountService.accounts().length);
  
  /** 觸發規則數量：優先使用 triggerRules，與後端/觸發規則頁一致 */
  triggerRulesActiveCount = computed(() => {
    const tr = this.status().triggerRules;
    if (tr && typeof tr.active === 'number') return tr.active;
    return this.status().campaigns?.active ?? 0;
  });
  triggerRulesTotalCount = computed(() => {
    const tr = this.status().triggerRules;
    if (tr && typeof tr.total === 'number') return tr.total;
    return this.status().campaigns?.total ?? 0;
  });

  /** P1: 無發送帳號警告（模板不可用箭頭函數，故用 computed） */
  noSenderAccountWarning = computed(() => {
    const w = this.status().warnings;
    if (!w?.length) return null;
    return w.find((x: { code: string }) => x.code === 'NO_SENDER_ACCOUNT') ?? null;
  });

  aiFullButNoModelWarning = computed(() => {
    const w = this.status().warnings;
    if (!w?.length) return null;
    return w.find((x: { code: string }) => x.code === 'AI_FULL_BUT_NO_MODEL') ?? null;
  });
  
  private ipcCleanup: (() => void)[] = [];
  
  ngOnInit(): void {
    console.log('[DashboardView] Component initialized');
    this.loadInitialData();
    this.setupIpcListeners();
    this.startHeartbeat(); // 🔧 P2: 啟動心跳
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
    this.clearStartTimeout(); // 🔧 P1: 清理超時計時器
    this.stopHeartbeat(); // 🔧 P2: 停止心跳
  }
  
  // 🔧 P2: 啟動狀態心跳
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 確保不重複
    this.heartbeatIntervalId = setInterval(() => {
      console.log('[DashboardView] 心跳：刷新狀態');
      this.refreshStatus();
    }, this.HEARTBEAT_INTERVAL_MS);
  }
  
  // 🔧 P2: 停止狀態心跳
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
  
  private loadInitialData(): void {
    this.refreshStatus();
  }
  
  private setupIpcListeners(): void {
    const cleanup1 = this.ipc.on('system-status', (data: SystemStatus) => {
      this._status.set(data);
    });
    
    // 🔧 P0修復: 狀態由 MonitoringManagementService 統一管理
    // 這裡只保留 toast 通知
    
    // 🔧 P0修復: 監聽 monitoring-started 事件（只顯示 toast）
    const cleanup2c = this.ipc.on('monitoring-started', (data: { success: boolean; message: string }) => {
      console.log('[DashboardView] 監控已啟動:', data);
      this.toast.success(data.message || '監控已成功啟動');
    });
    
    // 🔧 P0修復: 監聽 monitoring-start-failed 事件
    const cleanup2d = this.ipc.on('monitoring-start-failed', (data: { reason: string; message: string; issues?: any[] }) => {
      console.log('[DashboardView] 監控啟動失敗:', data);
      
      // 根據失敗原因顯示不同的提示
      let errorMsg = data.message || '監控啟動失敗';
      if (data.reason === 'config_check_failed' && data.issues?.length) {
        errorMsg = `配置錯誤: ${data.issues[0]?.message || errorMsg}`;
      } else if (data.reason === 'no_accessible_groups') {
        errorMsg = '無法訪問監控群組，請確保帳號已加入群組';
      } else if (data.reason === 'all_accounts_failed') {
        errorMsg = '所有監控帳號都無法啟動';
      }
      
      this.toast.error(errorMsg, 5000);
    });
    
    // 🔧 P0修復: 監聽 monitoring-stopped 事件（只顯示 toast）
    const cleanup2e = this.ipc.on('monitoring-stopped', () => {
      console.log('[DashboardView] 監控已停止');
      this.toast.info('監控已停止');
    });
    
    // 🔧 P0: 修正事件名稱為 one-click-start-progress（與後端一致）
    const cleanup3 = this.ipc.on('one-click-start-progress', (data: { step: string; progress: number; message: string }) => {
      console.log('[DashboardView] 收到一鍵啟動進度:', data);
      this.startProgress.set(data.progress);
      this.startMessage.set(data.message);
      
      // 如果是完成或錯誤狀態，重置 starting
      if (data.step === 'complete' || data.step === 'error' || data.progress >= 100) {
        setTimeout(() => {
          this.starting.set(false);
          this.refreshStatus(); // 刷新狀態確保 UI 同步
        }, 500);
      }
    });
    
    // 🔧 P0: 監聽一鍵啟動結果事件（確保狀態重置）
    const cleanup4 = this.ipc.on('one-click-start-result', (data: any) => {
      console.log('[DashboardView] 收到一鍵啟動結果:', data);
      this.clearStartTimeout(); // 🔧 P1: 清除超時計時器
      this.starting.set(false);
      this.startProgress.set(100);
      this.startMessage.set(data.overall_success ? '✅ 啟動完成' : '⚠️ 部分啟動失敗');
      
      // 🔧 P0修復: 監控狀態由 MonitoringManagementService 統一管理
      if (data.monitoring?.success !== undefined) {
        console.log('[DashboardView] 一鍵啟動結果監控狀態:', data.monitoring.success);
      }
      
      // 🔧 P0: 立即刷新狀態（不等待）
      this.refreshStatus();
      
      // 延遲清除消息
      setTimeout(() => {
        this.startMessage.set('');
      }, 3000);
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2c, cleanup2d, cleanup2e, cleanup3, cleanup4);
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 切換模式
  switchMode(mode: 'smart' | 'classic'): void {
    if (mode === 'smart' && !this.membershipService.hasFeature('smartMode')) {
      this.toast.warning('需要黃金大師或以上會員');
      return;
    }
    this.mode.set(mode);
  }
  
  // 🔧 P0: 修復導航方法，支持對象類型 { view, handler }
  navigateTo(event: string | { view: string; handler?: string }): void {
    // 兼容字符串和對象類型
    const rawView = typeof event === 'string' ? event : event.view;
    const handler = typeof event === 'string' ? undefined : event.handler;
    
    // 視圖名稱映射（QuickWorkflow 使用的名稱 → LegacyView）
    const viewMap: Record<string, string> = {
      'resources': 'resource-center',
      'accounts': 'accounts',
      'add-account': 'add-account',  // 🔧 P0: 現在有對應的 @case 分支
      'automation': 'automation',
      'ads': 'leads',  // 批量發送導向發送控制台
      'leads': 'leads',
      'nurturing-analytics': 'nurturing-analytics',
      'ai-center': 'ai-engine',
      'ai-engine': 'ai-engine',
      'multi-role': 'multi-role'
    };
    const view = viewMap[rawView] || rawView;
    
    console.log('[DashboardView] navigateTo:', { rawView, view, handler });
    
    // 先處理 handler（如果有）
    if (handler) {
      this.executeHandler(handler);
    }
    
    // 然後導航到視圖（由 AppComponent 的 effect 處理同步）
    if (view) {
      this.nav.navigateTo(view as LegacyView);
    }
  }
  
  // 🔧 P0: 執行 handler 操作
  private executeHandler(handler: string): void {
    console.log('[DashboardView] executeHandler:', handler);
    switch (handler) {
      // QuickWorkflowComponent 定義的 handler
      case 'scan-sessions':
        this.ipc.send('scan-orphan-sessions');
        this.toast.info('🔍 正在掃描可恢復的 Session...');
        break;
      case 'new-campaign':
        this.ipc.send('open-add-campaign-dialog');
        this.toast.info('⚡ 正在打開創建活動對話框...');
        break;
      case 'export-leads':
        this.ipc.send('open-export-dialog');
        this.toast.info('📥 正在打開導出對話框...');
        break;
      case 'start-monitoring':
        this.startMonitoring();
        break;
      case 'run-script':
        this.toast.info('🎬 正在啟動劇本執行...');
        this.ipc.send('run-multi-role-script');
        break;
      // 兼容其他可能的 handler
      case 'openAddAccountDialog':
        this.ipc.send('open-add-account-dialog');
        break;
      case 'stopMonitoring':
        this.stopMonitoring();
        break;
      default:
        console.warn('[DashboardView] Unknown handler:', handler);
        this.toast.info(`正在處理: ${handler}...`);
    }
  }
  
  // 刷新狀態
  refreshStatus(): void {
    this.ipc.send('get-system-status');
    this.ipc.send('get-monitoring-status');
  }
  
  // 🔧 P0 v2: 一鍵啟動（不在前端阻止，讓後端處理帳號連接）
  oneClickStart(): void {
    if (this.starting()) {
      this.toast.warning('正在啟動中，請稍候...', 2000);
      return;
    }
    
    // 檢查是否有任何帳號配置
    const totalAccounts = this.totalAccountsCount();
    if (totalAccounts === 0) {
      this.toast.error('❌ 沒有配置任何帳號，請先添加帳號', 4000);
      return;
    }
    
    this.starting.set(true);
    this.startProgress.set(0);
    this.startMessage.set(`🚀 開始啟動 (${totalAccounts} 個帳號)...`);
    
    // 🔧 P1: 設置超時自動恢復
    this.clearStartTimeout();
    this.startTimeoutId = setTimeout(() => {
      if (this.starting()) {
        console.warn('[DashboardView] 一鍵啟動超時，自動恢復');
        this.starting.set(false);
        this.startMessage.set('⚠️ 啟動超時，請檢查後端狀態');
        this.toast.warning('啟動超時，正在刷新狀態...', 3000);
        this.refreshStatus();
      }
    }, this.START_TIMEOUT_MS);
    
    // 直接發送啟動命令，後端會嘗試連接所有帳號
    this.ipc.send('one-click-start', { forceRefresh: true });
    this.toast.info(`🚀 開始一鍵啟動，後端將自動連接 ${totalAccounts} 個帳號`, 3000);
  }
  
  // 🔧 P1: 清除超時計時器
  private clearStartTimeout(): void {
    if (this.startTimeoutId) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }
  
  // 🔧 P1: 取消啟動並刷新狀態
  cancelAndRefresh(): void {
    console.log('[DashboardView] 用戶取消啟動');
    this.clearStartTimeout();
    this.starting.set(false);
    this.startProgress.set(0);
    this.startMessage.set('');
    this.toast.info('已取消，正在刷新狀態...', 2000);
    this.refreshStatus();
  }
  
  // 一鍵停止
  oneClickStop(): void {
    this.ipc.send('one-click-stop');
    this.toast.info('正在停止所有服務...');
  }
  
  // 啟動監控
  startMonitoring(): void {
    this.ipc.send('start-monitoring');
  }
  
  // 停止監控
  stopMonitoring(): void {
    this.ipc.send('stop-monitoring');
  }
  
  // 🆕 P3: 處理快捷啟動
  handleQuickStart(event: { type: string; config: any }): void {
    console.log('[Dashboard] 快捷啟動:', event);
    
    switch (event.type) {
      case 'immediate':
        this.toast.info('🚀 正在啟動即時營銷...');
        this.navigateTo('multi-role');
        break;
      case 'smart_schedule':
        this.toast.info('⏱️ 正在配置智能定時...');
        this.navigateTo('multi-role');
        break;
      case 'preset':
        this.toast.success(`📌 使用預設配置: ${event.config.presetId}`);
        this.navigateTo('multi-role');
        break;
      case 'recommended':
        this.toast.success(`💡 使用推薦組合: ${event.config.roleCombo?.comboName}`);
        this.navigateTo('multi-role');
        break;
      default:
        this.navigateTo('multi-role');
    }
  }
  
  // 🆕 Phase1: 獲取步驟圖標
  getStepIcon(stepType: string): string {
    const icons: Record<string, string> = {
      'evaluate': '📊',
      'plan': '🎯',
      'private_chat': '💬',
      'detect_interest': '🔍',
      'create_group': '👥',
      'group_marketing': '🚀',
      'record': '📝'
    };
    return icons[stepType] || '▶️';
  }
}
