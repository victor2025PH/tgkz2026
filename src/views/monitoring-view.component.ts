/**
 * Monitoring View Component
 * 監控中心視圖組件 - 完整版
 * 
 * 🆕 Phase 30: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, effect, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, DialogService } from '../services';
import { MonitoringStateService } from '../monitoring/monitoring-state.service';
import { OnboardingService } from '../services/onboarding.service';

// 子組件導入
import { MonitoringGroupsComponent } from '../monitoring/monitoring-groups.component';
import { KeywordSetsComponent } from '../monitoring/keyword-sets.component';
import { TriggerRulesComponent } from '../monitoring/trigger-rules.component';
import { ChatTemplatesComponent } from '../monitoring/chat-templates.component';
import { MonitoringAccountsComponent } from '../monitoring/monitoring-accounts.component';
import { CollectedUsersComponent } from '../monitoring/collected-users.component';

// 🔧 P0: 視圖到 Tab 的雙向映射
const VIEW_TO_TAB: Record<string, string> = {
  'monitoring': 'groups',
  'monitoring-accounts': 'accounts',
  'monitoring-groups': 'groups',
  'keyword-sets': 'keywords',
  'chat-templates': 'templates',
  'trigger-rules': 'rules',
  'collected-users': 'collected'
};

// Tab 到視圖的反向映射（用於 Tab 點擊時同步菜單）
const TAB_TO_VIEW: Record<string, string> = {
  'accounts': 'monitoring-accounts',
  'groups': 'monitoring-groups',
  'keywords': 'keyword-sets',
  'templates': 'chat-templates',
  'rules': 'trigger-rules',
  'collected': 'collected-users'
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
      <!-- 頁面標題 -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-4xl font-bold" style="color: var(--text-primary);">監控中心</h2>
        <div class="flex items-center gap-2">
          @for (tab of tabs; track tab.id) {
            <button (click)="switchTab(tab.id)"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    [attr.data-tour]="'monitoring-tab-' + tab.id"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-cyan-500]="activeTab() === tab.id"
                    [class.to-blue-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.bg-slate-800/50]="activeTab() !== tab.id">
              {{ tab.icon }} {{ tab.label }}
            </button>
          }
        </div>
      </div>
      
      <!-- 標籤頁內容（子組件自行從 MonitoringStateService 獲取數據） -->
      @switch (activeTab()) {
        @case ('accounts') {
          <app-monitoring-accounts></app-monitoring-accounts>
        }
        @case ('groups') {
          <app-monitoring-groups 
            (extractMembersEvent)="openMemberExtractionDialog($event)">
          </app-monitoring-groups>
        }
        @case ('keywords') {
          <app-keyword-sets></app-keyword-sets>
        }
        @case ('rules') {
          <app-trigger-rules></app-trigger-rules>
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
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  public monitoringState = inject(MonitoringStateService);
  private onboarding = inject(OnboardingService);
  
  // 標籤頁配置
  tabs = [
    { id: 'accounts', icon: '👤', label: '監控帳號' },
    { id: 'groups', icon: '👥', label: '監控群組' },
    { id: 'keywords', icon: '🔑', label: '關鍵詞集' },
    { id: 'rules', icon: '⚡', label: '觸發規則' },
    { id: 'templates', icon: '💬', label: '消息模板' },
    { id: 'collected', icon: '📥', label: '收集用戶' }
  ];
  
  // 狀態
  activeTab = signal<string>('groups');
  
  private ipcCleanup: (() => void)[] = [];
  
  // 🔧 P0: 響應式監聽視圖變化，自動切換 Tab
  private viewSyncEffect = effect(() => {
    const currentView = this.nav.currentView();
    const targetTab = VIEW_TO_TAB[currentView];
    if (targetTab && targetTab !== this.activeTab()) {
      console.log(`[MonitoringView] 視圖切換: ${currentView} → Tab: ${targetTab}`);
      this.activeTab.set(targetTab);
    }
  });
  
  // 🆕 首訪 spotlight：等數據載入完成後，僅在「完全未配置」時觸發一次導覽
  // （已配置的老用戶不打擾；已完成/跳過的進度持久化在 localStorage）
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
    this.setupIpcListeners();
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }
  
  private setupIpcListeners(): void {
    // 監聽數據更新事件
    const cleanup1 = this.ipc.on('monitoring-group-added', () => {
      this.toast.success('群組已添加');
    });
    
    const cleanup2 = this.ipc.on('keyword-set-added', () => {
      this.toast.success('關鍵詞集已添加');
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2);
  }
  
  // 選擇帳號
  selectAccount(account: any): void {
    // 處理帳號選擇
    console.log('Selected account:', account);
  }
  
  // 選擇群組
  selectGroup(group: any): void {
    // 處理群組選擇
    console.log('Selected group:', group);
  }
  
  // 選擇關鍵詞集
  selectKeywordSet(keywordSet: any): void {
    // 處理關鍵詞集選擇
    console.log('Selected keyword set:', keywordSet);
  }
  
  // 選擇規則
  selectRule(rule: any): void {
    // 處理規則選擇
    console.log('Selected rule:', rule);
  }
  
  // 選擇模板
  selectTemplate(template: any): void {
    // 處理模板選擇
    console.log('Selected template:', template);
  }
  
  // 添加群組
  addGroup(): void {
    this.dialog.openJoinMonitor({});
  }
  
  // 添加關鍵詞集
  addKeywordSet(): void {
    this.ipc.send('open-add-keyword-set-dialog');
  }
  
  // 添加規則
  addRule(): void {
    this.ipc.send('open-add-rule-dialog');
  }
  
  // 添加模板
  addTemplate(): void {
    this.ipc.send('open-add-template-dialog');
  }
  
  // 🔧 P0: Tab 切換方法（雙向同步）
  switchTab(tabId: string): void {
    this.activeTab.set(tabId);
    // 同步更新菜單狀態（避免觸發 effect 造成循環）
    const targetView = TAB_TO_VIEW[tabId];
    if (targetView && this.nav.currentView() !== targetView) {
      this.nav.navigateTo(targetView as any);
    }
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 🔧 P0: 打開成員提取對話框
  openMemberExtractionDialog(group: any): void {
    console.log('[MonitoringView] Opening member extraction dialog for:', group);
    this.dialog.openMemberExtraction(group);
  }
}
