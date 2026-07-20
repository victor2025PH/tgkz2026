/**
 * Monitoring View Component
 * 監控中心視圖 - 三級分級殼層
 *
 * 一級：配置進度英雄區（未就緒→下一步主CTA；就緒→運行就緒條）
 * 二級：核心數據4卡（可點擊切 Tab）
 * 三級：線性圖標 Tab + 子頁內容（子頁 embedded 去重標題/重複進度條）
 *
 * 順便修復：子頁 config-progress 的 action 以前從未被殼層接收，現統一在此處理。
 */
import { Component, inject, signal, computed, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, DialogService } from '../services';
import { MonitoringStateService } from '../monitoring/monitoring-state.service';
import { OnboardingService } from '../services/onboarding.service';
import { MonitoringGroupsComponent } from '../monitoring/monitoring-groups.component';
import { KeywordSetsComponent } from '../monitoring/keyword-sets.component';
import { TriggerRulesComponent } from '../monitoring/trigger-rules.component';
import { ChatTemplatesComponent } from '../monitoring/chat-templates.component';
import { MonitoringAccountsComponent } from '../monitoring/monitoring-accounts.component';
import { CollectedUsersComponent } from '../monitoring/collected-users.component';

const VIEW_TO_TAB: Record<string, string> = {
  'monitoring': 'groups',
  'monitoring-accounts': 'accounts',
  'monitoring-groups': 'groups',
  'keyword-sets': 'keywords',
  'chat-templates': 'templates',
  'trigger-rules': 'rules',
  'collected-users': 'collected'
};

const TAB_TO_VIEW: Record<string, string> = {
  'accounts': 'monitoring-accounts',
  'groups': 'monitoring-groups',
  'keywords': 'keyword-sets',
  'templates': 'chat-templates',
  'rules': 'trigger-rules',
  'collected': 'collected-users'
};

/** config-progress action → 目標 Tab */
const ACTION_TO_TAB: Record<string, string> = {
  'add-listener': 'accounts',
  'add-sender': 'accounts',
  'add-group': 'groups',
  'bind-keywords': 'groups',
  'add-keywords': 'keywords',
  'add-template': 'templates'
};

@Component({
  selector: 'app-monitoring-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MonitoringGroupsComponent,
    KeywordSetsComponent,
    TriggerRulesComponent,
    ChatTemplatesComponent,
    MonitoringAccountsComponent,
    CollectedUsersComponent
  ],
  template: `
    <div class="page-content">
      <!-- ═══════════ Header ═══════════ -->
      <div class="flex items-center justify-between mb-5">
        <h2 class="text-3xl font-bold" style="color: var(--text-primary);">監控中心</h2>
        <button (click)="refreshAll()"
                class="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
                style="color: var(--text-muted); border: 1px solid var(--border-default); background-color: var(--bg-card);"
                title="刷新數據">
          <svg class="w-4 h-4" [class.animate-spin]="monitoringState.isLoading()"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      <!-- ═══════════ 一級：配置進度英雄區 ═══════════ -->
      @if (!configStatus().isReady) {
        <div class="rounded-2xl p-5 mb-5"
             style="background: linear-gradient(135deg, var(--primary-bg), rgba(139, 92, 246, 0.08)); border: 1px solid var(--border-default); box-shadow: var(--shadow-md);">
          <div class="flex flex-col md:flex-row items-center gap-5">
            <!-- 進度環 -->
            <div class="relative shrink-0">
              <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" stroke-width="8"/>
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#monRingGrad)" stroke-width="8" stroke-linecap="round"
                        [attr.stroke-dasharray]="ringCircumference"
                        [attr.stroke-dashoffset]="ringOffset()"
                        style="transition: stroke-dashoffset 0.5s ease;"/>
                <defs>
                  <linearGradient id="monRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#06b6d4"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-xl font-bold" style="color: var(--text-primary);">{{ configStatus().completedCount }}<span class="text-sm font-medium" style="color: var(--text-muted);">/{{ configStatus().totalCount }}</span></span>
                <span class="text-[10px]" style="color: var(--text-muted);">{{ t('monitoringSetup.progressLabel') }}</span>
              </div>
            </div>

            <div class="flex-1 min-w-0 text-center md:text-left">
              <h3 class="text-xl font-bold mb-1" style="color: var(--text-primary);">{{ t('monitoringSetup.title') }}</h3>
              <p class="text-sm mb-4" style="color: var(--text-muted);">
                {{ t('monitoringSetup.subtitle') }}
              </p>
              @if (configStatus().nextStep; as next) {
                <button (click)="handleConfigAction(next.action || '')"
                        class="inline-flex items-center gap-2 font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:brightness-110"
                        style="background: linear-gradient(90deg, var(--primary), var(--accent)); color: #fff;">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>{{ t('monitoringSetup.next') }}：{{ next.name }}</span>
                </button>
              }
            </div>

            <!-- 步驟迷你清單 -->
            <div class="w-full md:w-56 shrink-0 space-y-1.5">
              @for (step of configStatus().steps.slice(0, 4); track step.id) {
                <button (click)="handleConfigAction(step.action || '')"
                        class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors"
                        [style.background-color]="step.isCompleted ? 'var(--success-bg)' : 'var(--bg-card)'"
                        [style.border]="'1px solid var(--border-default)'">
                  <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        [style.background]="step.isCompleted ? 'var(--success)' : 'var(--bg-tertiary)'"
                        [style.color]="step.isCompleted ? '#fff' : 'var(--text-muted)'">
                    {{ step.isCompleted ? '✓' : '○' }}
                  </span>
                  <span class="truncate" [style.color]="step.isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'">{{ step.name }}</span>
                  @if (step.count && step.count > 0) {
                    <span class="ml-auto text-xs shrink-0" style="color: var(--text-disabled);">{{ step.count }}</span>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <div class="rounded-xl p-4 mb-5 flex items-center justify-between gap-4"
             style="background: var(--success-bg); border: 1px solid var(--border-default);">
          <div class="flex items-center gap-3">
            <span class="relative flex h-3 w-3 shrink-0">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background: var(--success);"></span>
              <span class="relative inline-flex rounded-full h-3 w-3" style="background: var(--success);"></span>
            </span>
            <div>
              <div class="font-bold" style="color: var(--text-primary);">監控配置就緒</div>
              <div class="text-xs" style="color: var(--text-muted);">
                {{ monitoringState.groups().length }} 群組 · {{ monitoringState.keywordSets().length }} 詞集 · {{ triggerRulesCount() }} 規則
              </div>
            </div>
          </div>
          <button (click)="nav.navigateTo('dashboard')"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0"
                  style="background-color: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-primary);">
            回儀表板啟動
          </button>
        </div>
      }

      <!-- ═══════════ 二級：核心數據4卡 ═══════════ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        @for (card of summaryCards(); track card.tab) {
          <button (click)="switchTab(card.tab)"
                  class="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5"
                  [style.background-color]="'var(--bg-card)'"
                  [style.border]="activeTab() === card.tab ? '1px solid var(--primary)' : '1px solid var(--border-default)'"
                  [style.box-shadow]="'var(--shadow-sm)'">
            <div class="flex items-center justify-between mb-2">
              <span class="flex items-center justify-center w-8 h-8 rounded-lg"
                    [style.background]="card.bg" [style.color]="card.color">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  @switch (card.icon) {
                    @case ('user') {
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    }
                    @case ('users') {
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    }
                    @case ('key') {
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    }
                    @case ('bolt') {
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    }
                  }
                </svg>
              </span>
              @if (activeTab() === card.tab) {
                <span class="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style="background: var(--primary-bg); color: var(--primary-light);">當前</span>
              }
            </div>
            <div class="text-2xl font-bold" style="color: var(--text-primary);">{{ card.value }}</div>
            <div class="text-xs mt-0.5" style="color: var(--text-muted);">{{ card.label }}</div>
          </button>
        }
      </div>

      <!-- ═══════════ 三級：Tab 工具區 ═══════════ -->
      <div class="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        @for (tab of tabs; track tab.id) {
          <button (click)="switchTab(tab.id)"
                  class="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0"
                  [attr.data-tour]="'monitoring-tab-' + tab.id"
                  [style.background]="activeTab() === tab.id ? 'linear-gradient(90deg, var(--primary), var(--accent))' : 'var(--bg-card)'"
                  [style.color]="activeTab() === tab.id ? '#fff' : 'var(--text-secondary)'"
                  [style.border]="activeTab() === tab.id ? '1px solid transparent' : '1px solid var(--border-default)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              @switch (tab.icon) {
                @case ('user') {
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                }
                @case ('users') {
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                }
                @case ('key') {
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                }
                @case ('bolt') {
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                }
                @case ('chat') {
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                }
                @case ('inbox') {
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                }
              }
            </svg>
            {{ tab.label }}
          </button>
        }
      </div>

      <!-- 標籤頁內容（embedded：隱藏子頁重複標題+配置進度） -->
      @switch (activeTab()) {
        @case ('accounts') {
          <app-monitoring-accounts [embedded]="true" (configAction)="handleConfigAction($event)"></app-monitoring-accounts>
        }
        @case ('groups') {
          <app-monitoring-groups [embedded]="true"
            (configAction)="handleConfigAction($event)"
            (extractMembersEvent)="openMemberExtractionDialog($event)">
          </app-monitoring-groups>
        }
        @case ('keywords') {
          <app-keyword-sets [embedded]="true" (configAction)="handleConfigAction($event)"></app-keyword-sets>
        }
        @case ('rules') {
          <app-trigger-rules [embedded]="true"></app-trigger-rules>
        }
        @case ('templates') {
          <app-chat-templates></app-chat-templates>
        }
        @case ('collected') {
          <app-collected-users></app-collected-users>
        }
      }
    </div>
  `
})
export class MonitoringViewComponent implements OnInit, OnDestroy {
  private i18n = inject(I18nService);
  public nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  public monitoringState = inject(MonitoringStateService);
  private onboarding = inject(OnboardingService);

  tabs = [
    { id: 'accounts', icon: 'user', label: '監控帳號' },
    { id: 'groups', icon: 'users', label: '監控群組' },
    { id: 'keywords', icon: 'key', label: '關鍵詞集' },
    { id: 'rules', icon: 'bolt', label: '觸發規則' },
    { id: 'templates', icon: 'chat', label: '消息模板' },
    { id: 'collected', icon: 'inbox', label: '收集用戶' }
  ];

  activeTab = signal<string>('groups');
  private ipcCleanup: (() => void)[] = [];

  readonly ringCircumference = 2 * Math.PI * 40;
  configStatus = computed(() => this.monitoringState.configStatus());
  ringOffset = computed(() => this.ringCircumference * (1 - this.configStatus().percentage / 100));

  triggerRulesCount = computed(() => this.monitoringState.triggerRules().length);

  summaryCards = computed(() => [
    {
      tab: 'accounts',
      label: '監控帳號',
      value: this.monitoringState.listenerAccounts().length,
      icon: 'user',
      bg: 'var(--primary-bg)',
      color: 'var(--primary-light)'
    },
    {
      tab: 'groups',
      label: '監控群組',
      value: this.monitoringState.groups().length,
      icon: 'users',
      bg: 'rgba(139, 92, 246, 0.15)',
      color: 'var(--accent-light)'
    },
    {
      tab: 'keywords',
      label: '關鍵詞集',
      value: this.monitoringState.keywordSets().length,
      icon: 'key',
      bg: 'var(--warning-bg)',
      color: 'var(--warning)'
    },
    {
      tab: 'rules',
      label: '觸發規則',
      value: this.triggerRulesCount(),
      icon: 'bolt',
      bg: 'var(--success-bg)',
      color: 'var(--success)'
    }
  ]);

  private viewSyncEffect = effect(() => {
    const currentView = this.nav.currentView();
    const targetTab = VIEW_TO_TAB[currentView];
    if (targetTab && targetTab !== this.activeTab()) {
      this.activeTab.set(targetTab);
    }
  });

  private tourChecked = false;
  private firstVisitTourEffect = effect(() => {
    if (this.tourChecked || !this.monitoringState.lastUpdated()) return;
    this.tourChecked = true;
    const unconfigured = this.monitoringState.groups().length === 0
      && this.monitoringState.keywordSets().length === 0
      && this.monitoringState.triggerRules().length === 0;
    console.log('[MonitoringView] 首訪導覽檢查: unconfigured =', unconfigured);
    if (unconfigured) {
      setTimeout(() => this.onboarding.startTourIfFirstVisit('monitoring-flow'), 600);
    }
  });

  ngOnInit(): void {
    this.monitoringState.loadAll(true);
    this.setupIpcListeners();
  }

  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }

  private setupIpcListeners(): void {
    const cleanup1 = this.ipc.on('monitoring-group-added', () => {
      this.toast.success('群組已添加');
    });
    const cleanup2 = this.ipc.on('keyword-set-added', () => {
      this.toast.success('關鍵詞集已添加');
    });
    this.ipcCleanup.push(cleanup1, cleanup2);
  }

  switchTab(tabId: string): void {
    this.activeTab.set(tabId);
    const targetView = TAB_TO_VIEW[tabId];
    if (targetView && this.nav.currentView() !== targetView) {
      this.nav.navigateTo(targetView as any);
    }
  }

  /** 統一處理配置進度動作（修復子頁 action 無人接收的問題） */
  handleConfigAction(action: string): void {
    if (!action) return;
    console.log('[MonitoringView] handleConfigAction:', action);

    const tab = ACTION_TO_TAB[action];
    if (tab) {
      this.switchTab(tab);
    }

    switch (action) {
      case 'add-listener':
      case 'add-sender':
        // 監聽/發送帳號在帳號管理配置角色
        this.toast.info('請在帳號詳情中設置監聽/發送角色，或前往帳號管理添加');
        break;
      case 'add-group':
        this.dialog.openJoinMonitor({});
        break;
      case 'add-keywords':
        // 切到關鍵詞 Tab 後用戶可點創建；也可直接提示
        break;
      case 'bind-keywords':
        this.toast.info('請選擇群組後，在詳情中綁定關鍵詞集');
        break;
      case 'add-template':
        break;
      case 'goto-search-discovery':
        this.nav.navigateTo('search-discovery');
        break;
      default:
        break;
    }
  }

  refreshAll(): void {
    this.monitoringState.loadAll(true);
    this.toast.info('正在刷新監控數據...');
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }

  openMemberExtractionDialog(group: any): void {
    this.dialog.openMemberExtraction(group);
  }
}
