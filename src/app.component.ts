
import { ChangeDetectionStrategy, Component, signal, WritableSignal, computed, inject, OnDestroy, effect, OnInit, ChangeDetectorRef, NgZone, HostListener, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
// 路由動畫改用 CSS 過渡效果，不再使用 Angular animations
import { TelegramAccount, KeywordConfig, MonitoredGroup, CapturedLead, LogEntry, GenerationState, MessageTemplate, LeadStatus, Interaction, OnlineStatus, AccountRole, Attachment, KeywordSet, AutomationCampaign, CampaignTrigger, CampaignAction, AccountStatus, QueueStatus, QueueMessage, Alert } from './models';
// PerformanceMonitorComponent - 移至路由視圖
import { TimeSeriesData } from './analytics-charts.component';
import { GeminiService } from './gemini.service';
import { TranslationService, Language } from './translation.service';
import { AccountLoaderService } from './account-loader.service';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { ToastComponent } from './toast.component';
import { GlobalConfirmDialogComponent } from './global-confirm-dialog.component';
import { GlobalInputDialogComponent } from './global-input-dialog.component';
import { ProgressDialogComponent, ProgressInfo } from './progress-dialog.component';
import { MembershipService } from './membership.service';
import { MembershipDialogComponent, UpgradePromptComponent } from './membership-ui.component';
import { LicenseClientService } from './license-client.service';
import { UnifiedContactsService } from './services/unified-contacts.service';
import { PaymentComponent } from './payment.component';
import { SecurityService } from './security.service';
import { GlobalErrorHandler } from './services/error-handler.service';
import { LoadingService } from './loading.service';
import { OfflineCacheService } from './services/offline-cache.service';
import { SwManagerService } from './services/sw-manager.service';
// LoadingOverlayComponent removed - using non-blocking connection indicator instead
import { OnboardingComponent } from './onboarding.component';
// BackupService 從 ./services 統一導入
import { I18nService } from './i18n.service';
import { LanguageSwitcherCompactComponent } from './language-switcher.component';
// 新增：用戶認證相關 - 使用統一的 JWT 認證服務
import { AuthService } from './core/auth.service';
import { LoginComponent } from './login.component';
// ProfileComponent, MembershipCenterComponent - 移至路由視圖
import { QrLoginComponent } from './qr-login.component';
// AccountCardListComponent, ApiCredentialManagerComponent - 移至路由視圖
// 🔧 P0: 恢復 AddAccountPageComponent 導入，用於 @switch 視圖切換
import { AddAccountPageComponent } from './add-account-page.component';
import { Account } from './account-card-list.component';
// 類型導入（用於信號和狀態）
import { AccountQueueStatus } from './queue-progress.component';
import { Workflow } from './quick-workflow.component';
import { DiscoveredResource, SearchSource } from './search-discovery/search-discovery.component';
import { ExtractedMember } from './member-database/member-database.component';
import { BatchSendDialogComponent, BatchSendTarget } from './dialogs/batch-send-dialog.component';
import { BatchInviteDialogComponent, BatchInviteTarget } from './dialogs/batch-invite-dialog.component';
import { MemberExtractionDialogComponent, MemberExtractionConfig, ExtractionGroupInfo } from './dialogs/member-extraction-dialog.component';
import { AIStrategyResult } from './ai-assistant/ai-marketing-assistant.component';
import { CommandPaletteComponent } from './components/command-palette.component';
import { NetworkStatusComponent } from './core/network-status.component';
import { AuthTransitionComponent } from './core/auth-transition.component';
// EmptyStateComponent 暫時未使用
import { FeedbackService } from './components/feedback-animation.component';
import { ErrorHandlerService } from './services/error-handler.service';
// SmartDashboardComponent, AnimationSelectorComponent - 移至路由視圖
import { LeadScoringService } from './services/lead-scoring.service';
import { ABTestingService } from './services/ab-testing.service';
// 監控管理（組件用於 ViewChild 類型引用）
import { MonitoringGroupsComponent, ConfigProgressComponent, MonitoringStateService } from './monitoring';
// 🆕 Phase 3: 統一導航服務
import { NavBridgeService, NavShortcutsService } from './services/nav-bridge.service';
import { UnifiedNavService } from './components/unified-nav.service';
// 🆕 Phase 4: 統一導航組件
// 注意：UnifiedNavComponent 和 UnifiedSidebarComponent 暫時未使用
// 未來將用於替代現有導航
// import { UnifiedNavComponent, UnifiedSidebarComponent } from './components/unified-nav.component';

// 視圖組件透過路由懶加載，不需要在此導入

// 🆕 Phase 19-26: 專用服務（從 app.component.ts 提取的方法）
import { 
  NavigationService,
  MonitoringManagementService,
  LeadManagementService,
  CampaignManagementService,
  TemplateManagementService,
  GroupManagementService,
  MessageQueueService,
  AppFacadeService,
  AnimationConfigService,
  SettingsService,
  AiChatService,
  ResourceService,
  ExportService,
  RagService,
  VectorMemoryService,
  BackupService,
  SchedulerService,
  DialogService
} from './services';

// 🆕 視圖組件導入（用於 @switch 視圖切換）
import { DashboardViewComponent } from './views/dashboard-view.component';
import { AccountsViewComponent } from './views/accounts-view.component';
import { SettingsViewComponent } from './views/settings-view.component';
import { LeadsViewComponent } from './views/leads-view.component';
import { AutomationViewComponent } from './views/automation-view.component';
import { ResourceDiscoveryViewComponent } from './views/resource-discovery-view.component';
import { AiCenterViewComponent } from './views/ai-center-view.component';
import { MultiRoleViewComponent } from './views/multi-role-view.component';
import { AnalyticsViewComponent } from './views/analytics-view.component';
import { MonitoringViewComponent } from './views/monitoring-view.component';
// RuntimeLogsViewComponent 已移除
import { ApiCredentialsViewComponent } from './views/api-credentials-view.component';

// 🆕 Phase P0: 補全缺失的視圖組件
import { MembershipCenterComponent } from './membership-center.component';
import { ProfileComponent } from './profile.component';
import { ResourceCenterComponent } from './manual-mode/resource-center.component';
import { SearchDiscoveryComponent } from './search-discovery/search-discovery.component';
import { AiMarketingAssistantComponent } from './ai-assistant/ai-marketing-assistant.component';
import { AiTeamHubComponent } from './multi-role/ai-team-hub.component';
import { MemberDatabaseComponent } from './member-database/member-database.component';
// 🆕 知識大腦獨立組件
import { AIBrainComponent } from './ai-center/ai-brain.component';
import { KnowledgeGapsComponent } from './ai-center/knowledge-gaps.component';
import { KnowledgeManageComponent } from './ai-center/knowledge-manage.component';
import { RAGBrainService } from './services/rag-brain.service';
// 🆕 P2: 營銷報表組件
import { MarketingReportComponent } from './components/marketing-report.component';
// 🆕 錢包視圖組件
import { WalletViewComponent } from './views/wallet-view.component';
import { WalletRechargeComponent } from './views/wallet-recharge.component';
import { WalletWithdrawComponent } from './views/wallet-withdraw.component';
import { WalletTransactionsComponent } from './views/wallet-transactions.component';
import { WalletOrdersComponent } from './views/wallet-orders.component';
import { WalletAnalyticsComponent } from './views/wallet-analytics.component';

// 視圖類型定義
type View = 'dashboard' | 'accounts' | 'add-account' | 'api-credentials' | 'resources' | 'resource-discovery' | 'member-database' | 'resource-center' | 'search-discovery' | 'ai-assistant' | 'automation' | 'automation-legacy' | 'leads' | 'lead-nurturing' | 'nurturing-analytics' | 'ads' | 'user-tracking' | 'campaigns' | 'multi-role' | 'ai-team' | 'ai-center' | 'knowledge-brain' | 'knowledge-manage' | 'knowledge-gaps' | 'settings' | 'analytics' | 'analytics-center' | 'marketing-report' | 'profile' | 'membership-center' | 'wallet' | 'wallet-recharge' | 'wallet-withdraw' | 'wallet-transactions' | 'wallet-orders' | 'wallet-analytics' | 'monitoring' | 'monitoring-accounts' | 'monitoring-groups' | 'keyword-sets' | 'chat-templates' | 'trigger-rules' | 'collected-users';
type LeadDetailView = 'sendMessage' | 'history';
type LeadsViewMode = 'kanban' | 'list';

// 🆕 成功動畫配置接口
interface SuccessOverlayConfig {
  icon: string;
  title: string;
  subtitle?: string;
  duration?: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    // 核心模組
    CommonModule, FormsModule, RouterOutlet,
    // 🆕 視圖組件（用於 @switch 視圖切換）
    DashboardViewComponent, AccountsViewComponent, SettingsViewComponent,
    LeadsViewComponent, AutomationViewComponent, ResourceDiscoveryViewComponent,
    AiCenterViewComponent, MultiRoleViewComponent, AnalyticsViewComponent,
    MonitoringViewComponent,
    // 🔧 P0: 添加帳號頁面組件
    AddAccountPageComponent,
    // 🆕 Phase P0: 補全缺失的視圖組件
    MembershipCenterComponent, ProfileComponent, ResourceCenterComponent,
    SearchDiscoveryComponent, AiMarketingAssistantComponent, AiTeamHubComponent,
    MemberDatabaseComponent, ApiCredentialsViewComponent,
    // 🆕 錢包視圖
    WalletViewComponent, WalletRechargeComponent, WalletWithdrawComponent,
    WalletTransactionsComponent, WalletOrdersComponent, WalletAnalyticsComponent,
    // 🆕 知識大腦獨立組件
    AIBrainComponent, KnowledgeGapsComponent, KnowledgeManageComponent, KnowledgeManageComponent,
    // 🆕 P2: 營銷報表
    MarketingReportComponent,
    // 通用組件（模板中使用）
    ToastComponent, GlobalConfirmDialogComponent, GlobalInputDialogComponent, ProgressDialogComponent,
    // 會員相關（模板中使用）
    MembershipDialogComponent, UpgradePromptComponent, PaymentComponent,
    // 導航和佈局（模板中使用）
    OnboardingComponent, LanguageSwitcherCompactComponent, LoginComponent,
    // 帳號管理（模板中使用）
    QrLoginComponent,
    // 對話框（模板中使用）
    BatchSendDialogComponent, BatchInviteDialogComponent, MemberExtractionDialogComponent,
    // 命令面板（模板中使用）
    CommandPaletteComponent,
    // 🆕 網絡狀態和認證過渡動畫
    NetworkStatusComponent, AuthTransitionComponent,
  ],
  providers: [AccountLoaderService, ToastService],
  // 路由動畫改用 CSS 過渡效果
  styles: [`
    /* 錯誤引導高亮動畫 */
    :host ::ng-deep .highlight-pulse {
      animation: highlight-pulse 1.5s ease-in-out 2;
    }
    
    @keyframes highlight-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
        border-color: inherit;
      }
      50% {
        box-shadow: 0 0 20px 5px rgba(6, 182, 212, 0.5);
        border-color: rgb(6, 182, 212);
      }
    }
    
    /* 🆕 成功動畫效果 */
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes success-pop {
      0% {
        transform: scale(0.5);
        opacity: 0;
      }
      50% {
        transform: scale(1.1);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
    
    .animate-fade-in {
      animation: fade-in 0.3s ease-out forwards;
    }
    
    .animate-success-pop {
      animation: success-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    }
    
    /* 頁面切換動畫 */
    :host ::ng-deep .page-content {
      animation: page-fade-in 0.3s ease-out;
    }
    
    @keyframes page-fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* 卡片懸停效果 */
    :host ::ng-deep .card-hover {
      transition: all 0.2s ease;
    }
    
    :host ::ng-deep .card-hover:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.3);
    }
    
    /* 側邊欄項目懸停效果 */
    :host ::ng-deep .sidebar-item {
      position: relative;
      overflow: hidden;
    }
    
    :host ::ng-deep .sidebar-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 3px;
      height: 0;
      background: linear-gradient(to bottom, #06b6d4, #8b5cf6);
      transition: height 0.2s ease;
      transform: translateY(-50%);
      border-radius: 0 2px 2px 0;
    }
    
    :host ::ng-deep .sidebar-item:hover::before,
    :host ::ng-deep .sidebar-item.active::before {
      height: 60%;
    }
    
    /* 按鈕波紋效果 */
    :host ::ng-deep .btn-ripple {
      position: relative;
      overflow: hidden;
    }
    
    :host ::ng-deep .btn-ripple::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
      background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
      background-repeat: no-repeat;
      background-position: 50%;
      transform: scale(10, 10);
      opacity: 0;
      transition: transform 0.5s, opacity 0.5s;
    }
    
    :host ::ng-deep .btn-ripple:active::after {
      transform: scale(0, 0);
      opacity: 0.3;
      transition: 0s;
    }
    
    /* 數字動畫 */
    :host ::ng-deep .animate-number {
      animation: number-pop 0.3s ease-out;
    }
    
    @keyframes number-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    
    /* 漸變邊框效果 */
    :host ::ng-deep .gradient-border {
      position: relative;
      background: linear-gradient(var(--card-bg), var(--card-bg)) padding-box,
                  linear-gradient(135deg, #06b6d4, #8b5cf6) border-box;
      border: 1px solid transparent;
    }
  `]
})
export class AppComponent implements OnDestroy, OnInit {
  private router = inject(Router);  // 🆕 Angular Router 導航
  geminiService = inject(GeminiService);
  translationService = inject(TranslationService);
  accountLoaderService = inject(AccountLoaderService);
  ipcService = inject(ElectronIpcService);
  offlineCache = inject(OfflineCacheService); // 🆕 P2: 離線緩存服務
  swManager = inject(SwManagerService); // 🆕 P3: Service Worker 管理
  toastService = inject(ToastService);
  membershipService = inject(MembershipService);
  securityService = inject(SecurityService);
  loadingService = inject(LoadingService);
  contactsService = inject(UnifiedContactsService);
  backupService = inject(BackupService);
  i18n = inject(I18nService);
  authService = inject(AuthService);  // 新增：認證服務
  // 🆕 Phase 3: 統一導航服務
  navBridge = inject(NavBridgeService);
  navShortcuts = inject(NavShortcutsService);
  unifiedNav = inject(UnifiedNavService);
  
  // 🆕 Phase 19-22: 專用服務
  navigationService = inject(NavigationService);
  monitoringMgmt = inject(MonitoringManagementService);
  leadMgmt = inject(LeadManagementService);
  campaignMgmt = inject(CampaignManagementService);
  templateMgmt = inject(TemplateManagementService);
  groupMgmt = inject(GroupManagementService);
  messageMgmt = inject(MessageQueueService);
  
  // 🆕 Phase 22: 應用外觀服務（統一委託入口）
  facade = inject(AppFacadeService);
  
  // 🆕 Phase 23: 路由動畫上下文（已禁用，使用 @switch 視圖切換）
  // private contexts = inject(ChildrenOutletContexts);
  
  // 🆕 Phase 24-26: 新增服務
  animationConfig = inject(AnimationConfigService);
  settingsService = inject(SettingsService);
  aiChatService = inject(AiChatService);
  resourceService = inject(ResourceService);
  exportService = inject(ExportService);
  ragService = inject(RagService);
  ragBrainService = inject(RAGBrainService);  // 🆕 用於側邊欄顯示知識缺口數量
  vectorMemoryService = inject(VectorMemoryService);
  // backupService 已在上面聲明
  schedulerService = inject(SchedulerService);
  dialogService = inject(DialogService);
  
  private document = inject(DOCUMENT);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  
  // 🆕 引导组件引用
  @ViewChild('onboardingRef') onboardingComponent?: OnboardingComponent;
  
  // 用於清理事件監聯
  private membershipUpdateHandler: ((event: Event) => void) | null = null;
  
  // Math 對象供模板使用
  Math = Math;

  // --- 認證狀態 ---
  isAuthenticated = computed(() => this.authService.isAuthenticated());
  currentUser = computed(() => this.authService.user());
  userMembershipLevel = computed(() => this.authService.membershipLevel());
  
  // --- UI State ---
  // 使用 I18nService 進行翻譯（支持多語言切換）
  t = (key: string, params?: Record<string, string | number>) => this.i18n.t(key, params);
  theme = signal<'light' | 'dark'>('dark');
  currentView: WritableSignal<View> = signal('dashboard');
  dashboardMode = signal<'smart' | 'classic'>('smart');  // 儀表板模式：智能/經典
  
  // 🆕 用於調試的路由 URL
  get routerUrl(): string {
    return this.router?.url || 'N/A';
  }
  
  // 🆕 Phase 22-29: Angular Router 模式
  // Phase 29: 完全移除 @switch，所有視圖使用 Router
  // 此信號現在永遠為 true，保留僅為向後兼容
  useRouterMode = signal(true);
  
  // 🆕 Phase 23: 路由動畫數據（已禁用，使用 @switch 視圖切換）
  // getRouteAnimationData() {
  //   return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  // }
  
  // 🆕 Phase 4: 導航模式（classic: 經典側邊欄, unified: 統一導航）
  navMode = signal<'classic' | 'unified'>('classic');
  leadDetailView: WritableSignal<LeadDetailView> = signal('sendMessage');
  leadsViewMode: WritableSignal<LeadsViewMode> = signal('kanban');
  leadStatusFilter = signal<string>('all');  // 當前篩選的 Lead 狀態
  leadSourceFilter = signal<string>('all');  // 數據來源篩選
  leadSortBy = signal<'intent' | 'time' | 'name'>('time');  // 排序方式
  showLeadsViewMenu = signal(false);  // 視圖下拉菜單
  showLeadsActionMenu = signal(false);  // 操作下拉菜單
  
  // --- 子視圖狀態 ---
  aiCenterTab = signal<'config' | 'chat' | 'rag' | 'voice' | 'memory'>('config');
  automationTab = signal<'targets' | 'keywords' | 'templates' | 'campaigns'>('targets');  // 自動化中心標籤頁
  
  // --- 🆕 知識大腦菜單狀態 ---
  knowledgeMenuExpanded = signal(true);  // 默認展開
  
  // --- 🆕 側邊欄分組折疊狀態 ---
  sidebarGroups = signal<Record<string, boolean>>({
    manual: true,      // 手動操作 - 默認展開
    monitoring: true,  // 監控中心 - 默認展開
    marketing: true,   // 智能營銷 - 默認展開
    analytics: false,  // 數據分析 - 默認折疊
    advanced: false,   // 進階設置 - 默認折疊
    ai: true,          // AI 智能 - 默認展開
    system: false      // 系統監控 - 默認折疊
  });
  
  // 切換側邊欄分組展開狀態
  toggleSidebarGroup(group: string): void {
    const current = this.sidebarGroups();
    this.sidebarGroups.set({
      ...current,
      [group]: !current[group]
    });
    // 保存到本地存儲
    localStorage.setItem('sidebar_groups', JSON.stringify(this.sidebarGroups()));
  }
  
  // 檢查分組是否展開
  isSidebarGroupExpanded(group: string): boolean {
    return this.sidebarGroups()[group] ?? true;
  }
  
  // 從本地存儲加載側邊欄分組狀態
  loadSidebarGroupsState(): void {
    try {
      const saved = localStorage.getItem('sidebar_groups');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.sidebarGroups.set({
          ...this.sidebarGroups(),
          ...parsed
        });
      }
      // 加載側邊欄收縮狀態
      const collapsed = localStorage.getItem('sidebar_collapsed');
      if (collapsed === 'true') {
        this.sidebarCollapsed.set(true);
      }
    } catch (e) {
      console.warn('[Sidebar] Failed to load sidebar groups state:', e);
    }
  }
  
  // --- 🆕 側邊欄收縮模式 ---
  sidebarCollapsed = signal(false);
  
  // 切換側邊欄收縮狀態
  toggleSidebarCollapse(): void {
    const newState = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  }
  
  // --- AI 模組銜接狀態 ---
  aiTeamIncomingStrategy = signal<AIStrategyResult | null>(null);  // 從 AI 營銷助手傳入的策略
  
  // --- 批量發送狀態 ---
  showBatchMessageDialogState = signal(false);
  batchSelectedLeads = signal<CapturedLead[]>([]);
  batchSendTargets = signal<BatchSendTarget[]>([]);
  
  // --- 批量拉群狀態 ---
  showBatchInviteDialogState = signal(false);
  batchInviteTargets = signal<BatchInviteTarget[]>([]);
  
  // --- Phase 5: System Management State ---
  // Database Migration
  migrationStatus = signal<{
    currentVersion: number;
    latestVersion: number;
    appliedCount: number;
    pendingCount: number;
    appliedMigrations: Array<{version: number; description: string; appliedAt: string}>;
    pendingMigrations: Array<{version: number; description: string}>;
  }>({
    currentVersion: 0,
    latestVersion: 0,
    appliedCount: 0,
    pendingCount: 0,
    appliedMigrations: [],
    pendingMigrations: []
  });
  isLoadingMigration = signal(false);
  isRunningMigration = signal(false);
  
  // Task Scheduler
  schedulerStatus = signal<{
    isRunning: boolean;
    tasks: Array<{
      name: string;
      interval: number;
      lastRun: string | null;
      nextRun: string | null;
      runCount: number;
      status: 'running' | 'idle' | 'error';
    }>;
  }>({
    isRunning: false,
    tasks: []
  });
  schedulerTab = signal<'tasks' | 'history' | 'config'>('tasks');
  
  // Log File Management
  logFiles = signal<Array<{
    name: string;
    size: number;
    sizeFormatted: string;
    modifiedAt: string;
    isCompressed: boolean;
  }>>([]);
  logStats = signal<{
    totalFiles: number;
    totalSize: number;
    totalSizeFormatted: string;
    compressedFiles: number;
    oldestFile: string | null;
    newestFile: string | null;
  }>({
    totalFiles: 0,
    totalSize: 0,
    totalSizeFormatted: '0 B',
    compressedFiles: 0,
    oldestFile: null,
    newestFile: null
  });
  isLoadingLogs = signal(false);
  isRotatingLogs = signal(false);
  selectedLogFile = signal<string | null>(null);
  logFileContent = signal<string>('');
  
  // Resource Discovery Batch
  showResourceBatchMenu = signal(false);
  resourceBatchAction = signal<'approve' | 'reject' | 'priority' | 'delete' | null>(null);
  
  // Membership Dialog
  showMembershipDialog = signal(false);
  
  // Settings Tab（🆕 Phase 26: 添加外觀標籤）
  settingsTab = signal<'backup' | 'migration' | 'scheduler' | 'appearance'>('backup');
  
  // --- Vector Memory State ---
  vectorMemoryStats = signal<{
    totalMemories: number;
    byType: {[key: string]: number};
    totalUsers: number;
    avgImportance: number;
  }>({ totalMemories: 0, byType: {}, totalUsers: 0, avgImportance: 0 });
  vectorMemorySearchQuery = '';
  vectorMemorySearchResults = signal<Array<{
    id: number;
    userId: string;
    content: string;
    memoryType: string;
    importance: number;
    similarity: number;
    createdAt: string;
  }>>([]);
  isSearchingMemory = signal(false);
  isAddingMemory = signal(false);
  showAddMemoryDialog = signal(false);
  newMemory = { userId: '', content: '', type: 'conversation', importance: 0.5 };
  selectedMemoryUserId = signal('');
  memoryUserList = signal<string[]>([]);
  
  // --- Voice Clone State (Enhanced) ---
  showVoiceRecordingDialog = signal(false);
  voiceCloneTab = signal<'upload' | 'record' | 'manage'>('manage');
  
  // --- Message Sending State ---
  messageMode = signal<'manual' | 'ai' | 'template'>('manual');
  editableMessage = signal('');
  selectedSenderId = signal<number | null>(null);
  
  // --- AI API Configuration ---
  aiApiKey = signal('');
  aiApiType = signal<'gemini' | 'openai' | 'custom' | 'local'>('gemini');
  customApiEndpoint = signal('');
  showApiKey = signal(false);
  isTestingAi = signal(false);
  aiConnectionStatus = signal<'success' | 'error' | null>(null);
  aiConnectionError = signal('');
  
  // --- Local AI Service Configuration ---
  localAiEndpoint = signal('http://localhost:11434');  // Ollama 默認地址
  localAiModel = signal('qwen2:7b');  // 推薦模型
  localAiProvider = signal<'ollama' | 'lmstudio' | 'custom'>('ollama');  // 本地AI提供者
  isTestingLocalAi = signal(false);
  localAiStatus = signal<'success' | 'error' | null>(null);
  localAiError = signal('');
  availableOllamaModels = signal<string[]>([]);  // 可用的Ollama模型列表
  
  // AI 服務自動降級
  aiAutoFallback = signal(true);  // 本地不可用時自動切換到雲端
  aiBackupProvider = signal<'gemini' | 'openai'>('gemini');  // 備用雲端服務
  aiShowProviderLabel = signal(true);  // 顯示AI來源標記
  
  // --- 首次啟動向導 ---
  isFirstRun = signal(false);
  showWelcomeDialog = signal(false);
  welcomeStep = signal(1);  // 1=歡迎, 2=AI設置, 3=完成
  isDetectingOllama = signal(false);
  
  // --- QR 掃碼登入 ---
  // 使用 DialogService 的狀態，實現統一管理
  get showQrLoginDialog() { return this.dialogService.showQrLoginDialog; }
  ollamaDetected = signal(false);
  detectedOllamaModels = signal<string[]>([]);
  autoSelectedModel = signal('');
  
  // --- 後端狀態 ---
  backendRunning = signal(true);  // 默認假設運行中
  backendError = signal('');
  showBackendErrorDialog = signal(false);
  
  // --- 孤立 Session 恢復 ---
  showOrphanSessionDialog = signal(false);
  orphanSessions = signal<{phone: string, hasMetadata: boolean, metadata?: any}[]>([]);
  isRecoveringOrphanSessions = signal(false);
  
  // --- 會員統計面板 ---
  showMembershipStats = signal(false);
  
  // --- Voice Service Configuration (TTS/STT) ---
  ttsEndpoint = signal('');  // 遠程部署的 GPT-SoVITS 服務地址
  ttsEnabled = signal(false);
  ttsVoice = signal('');
  isTestingTts = signal(false);
  ttsStatus = signal<'success' | 'error' | null>(null);
  ttsError = signal('');
  
  sttEndpoint = signal('');  // 遠程部署的 Whisper 服務地址
  sttEnabled = signal(false);
  isTestingStt = signal(false);
  sttStatus = signal<'success' | 'error' | null>(null);
  sttError = signal('');
  
  // --- AI Auto Chat Configuration ---
  aiAutoChatEnabled = signal(false);           // 是否啟用 AI 自動聊天
  aiAutoChatMode = signal<'full' | 'semi' | 'assist' | 'keyword'>('semi');  // 自動聊天模式
  aiTypingSpeed = signal(50);                  // 模擬打字速度（字/分鐘）
  aiReplyDelay = signal<[number, number]>([2, 8]);  // 回覆延遲範圍（秒）
  aiSystemPrompt = signal('');                 // AI 系統提示詞
  aiMaxContextMessages = signal(20);           // 最大上下文消息數
  aiEnableMemory = signal(true);               // 啟用 AI 記憶
  aiAutoGreeting = signal(false);              // 自動問候新用戶
  aiGreetingMessage = signal('');              // 問候語模板
  ragEnabled = signal(true);                   // 是否啟用 RAG
  
  // --- AI Greeting Suggestion State ---
  aiGreetingSuggestion = signal<{
    leadId: number;
    userId: string;
    username: string;
    firstName: string;
    sourceGroup: string;
    suggestedGreeting: string;
    accountPhone: string;
  } | null>(null);
  showAiGreetingDialog = signal(false);
  
  // --- Knowledge Base State ---
  knowledgeStats = signal<{documents: number; images: number; videos: number; qa_pairs: number}>({
    documents: 0, images: 0, videos: 0, qa_pairs: 0
  });
  knowledgeDocuments = signal<any[]>([]);
  knowledgeImages = signal<any[]>([]);
  knowledgeVideos = signal<any[]>([]);
  knowledgeQaPairs = signal<any[]>([]);
  knowledgeTab = signal<'documents' | 'images' | 'videos' | 'qa'>('documents');
  isLoadingKnowledge = signal(false);
  showAddDocumentDialog = signal(false);
  showAddMediaDialog = signal(false);
  showAddQaDialog = signal(false);
  newDocument = signal({title: '', category: 'general', tags: '', content: ''});
  newMedia = signal({name: '', category: 'general', description: '', mediaType: 'image'});
  newQaPair = signal({question: '', answer: '', category: 'general', keywords: ''});
  
  // --- Telegram RAG System State ---
  ragSystemInitialized = signal(false);
  isInitializingRag = signal(false);
  isRagLearning = signal(false);
  isReindexing = signal(false);
  isCleaningRag = signal(false);
  isSearchingRag = signal(false);
  ragSearchQuery = '';
  ragSearchResults = signal<Array<{id: number; type: string; question: string; answer: string; successScore: number; similarity: number; useCount: number; source: string}>>([]);
  ragStats = signal<{
    total_knowledge: number;
    qa_count: number;
    scripts_count: number;
    total_uses: number;
    avg_score: number;
    chromadb_enabled: boolean;
    neural_embedding: boolean;
    by_type: {[key: string]: {count: number; avg_score: number; uses: number}};
  }>({
    total_knowledge: 0, qa_count: 0, scripts_count: 0, total_uses: 0, avg_score: 0,
    chromadb_enabled: false, neural_embedding: false, by_type: {}
  });
  showAddRagKnowledgeDialog = signal(false);
  newRagKnowledge = {type: 'qa', question: '', answer: '', context: ''};
  
  // Computed for RAG type keys
  ragTypeKeys = computed(() => Object.keys(this.ragStats().by_type));
  
  // --- Resource Discovery State ---
  resourceDiscoveryInitialized = signal(false);
  isSearchingResources = signal(false);
  isProcessingJoinQueue = signal(false);
  resourceSearchQuery = '';
  pendingSearchQuery = '';  // 待搜索的關鍵詞（初始化後自動執行）
  resourceSearchType = signal<'all' | 'group' | 'channel' | 'supergroup'>('all');
  
  // 🆕 搜索錯誤狀態
  searchError = signal<{
    hasError: boolean;
    message: string;
    details: string;
    suggestions: string[];
  }>({ hasError: false, message: '', details: '', suggestions: [] });
  
  // 🆕 搜索會話管理（D方案）
  currentSearchSessionId = signal<string>('');  // 當前搜索會話 ID
  currentSearchKeyword = signal<string>('');    // 當前搜索關鍵詞
  showSearchHistory = signal(false);            // 是否顯示歷史記錄
  searchHistoryKeywords = signal<string[]>([]);  // 歷史搜索關鍵詞列表
  
  // 🆕 C方案：收藏管理
  savedResources = signal<Set<string>>(new Set());  // 已收藏的資源 ID（telegram_id）
  
  // 🆕 C方案：搜索建議
  showSearchSuggestions = signal(false);
  hotSearchKeywords = signal<string[]>(['支付', 'USDT', '交易', '招聘', '代購', '加密貨幣', '電影', '音樂', '資源分享', '交流群']);
  
  hideSearchSuggestions() {
    setTimeout(() => this.showSearchSuggestions.set(false), 200);
  }
  
  // 🆕 C方案：檢查是否處於搜索結果模式（有當前搜索關鍵詞）
  isInSearchResultMode(): boolean {
    return this.currentSearchKeyword().length > 0;
  }
  
  // 🆕 C方案：退出搜索結果模式，顯示歷史數據
  exitSearchResultMode() {
    this.currentSearchKeyword.set('');
    this.loadResources(); // 加載數據庫中的歷史數據
  }
  
  // 資源發現使用的帳號
  resourceAccountId = signal<number | null>(null);
  showResourceAccountSelector = signal(false);
  resourceMinMembers = signal(0);
  showSearchOptions = signal(false);
  searchReplaceMode = signal(true);  // 搜索替換模式（默認開啟）
  isRefreshing = signal(false);  // 刷新狀態
  linkAnalysisInput = '';  // 鏈接分析輸入
  isAnalyzingLink = signal(false);  // 鏈接分析中
  discoveredResources = signal<Array<{
    id: number;
    resource_type: string;
    telegram_id: string;
    username: string;
    title: string;
    description: string;
    member_count: number;
    activity_score: number;
    relevance_score: number;
    overall_score: number;
    status: string;
    discovery_source: string;
    discovery_keyword: string;
    created_at: string;
    invite_link?: string;
  }>>([]);
  resourceStats = signal<{
    total_resources: number;
    by_status: {[key: string]: number};
    by_type: {[key: string]: number};
    today_discovered: number;
    pending_joins: number;
    joined_count: number;
    avg_score: number;
  }>({
    total_resources: 0,
    by_status: {},
    by_type: {},
    today_discovered: 0,
    pending_joins: 0,
    joined_count: 0,
    avg_score: 0
  });
  discoveryKeywords = signal<Array<{id: number; keyword: string; category: string; priority: number; total_found: number}>>([]);
  showAddResourceDialog = signal(false);
  showAddKeywordDialog = signal(false);
  showChannelManageDialog = signal(false);
  showAddChannelDialog = signal(false);
  newResourceKeyword = '';
  
  // 搜索渠道管理
  systemChannels = signal<Array<{id: number; bot_username: string; display_name: string; priority: string; status: string; is_system: boolean; enabled: boolean; notes?: string}>>([]);
  customChannels = signal<Array<{id: number; bot_username: string; display_name: string; priority: string; status: string; is_system: boolean; enabled: boolean; notes?: string; query_format?: string}>>([]);
  newChannelUsername = '';
  newChannelDisplayName = '';
  newChannelQueryFormat = '{keyword}';
  newChannelPriority: 'primary' | 'backup' = 'backup';

  // 加入並監控對話框
  showJoinMonitorDialog = signal(false);
  joinMonitorResource = signal<any>(null);
  joinMonitorSelectedPhone = signal<string>('');
  joinMonitorSelectedPhones = signal<string[]>([]); // 多帳號選擇
  joinMonitorKeywords = signal<string[]>([]); // 舊版散列關鍵詞 (保留向後兼容)
  joinMonitorSelectedKeywordSetIds = signal<number[]>([]); // 新版：選中的關鍵詞集 IDs
  joinMonitorNewKeyword = '';
  joinMonitorAutoEnable = signal(true);
  joinMonitorBatchMode = signal(true); // 分批加入模式
  joinMonitorBatchInterval = signal(45); // 分批間隔秒數
  isJoiningResource = signal(false);
  showQuickCreateKeywordSet = signal(false); // 快速創建關鍵詞集子對話框
  quickCreateKeywordSetName = '';
  showChangeMonitorAccount = signal(false); // 是否顯示更換監控帳號選擇器
  openResourceMenuId = signal<number | null>(null); // 當前打開的資源菜單 ID
  quickCreateKeywordSetKeywords = signal<string[]>([]);
  quickCreateKeywordSetNewKeyword = '';
  
  // 批量加入並監控對話框
  showBatchJoinMonitorDialog = signal(false);
  batchJoinResources = signal<any[]>([]);
  batchJoinProgress = signal({ current: 0, total: 0, status: '' });
  
  // 成員列表對話框
  showMemberListDialog = signal(false);
  memberListResource = signal<any>(null);
  memberListData = signal<Array<{
    id?: number;
    user_id: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name?: string;
    phone: string;
    
    // 擴展信息
    bio?: string;
    language_code?: string;
    dc_id?: number;
    photo_id?: string;
    has_photo?: boolean;
    
    // 帳號狀態
    is_bot: boolean;
    is_premium: boolean;
    is_verified?: boolean;
    is_scam?: boolean;
    is_fake?: boolean;
    is_restricted?: boolean;
    restriction_reason?: string;
    is_support?: boolean;
    is_deleted?: boolean;
    is_contact?: boolean;
    is_mutual_contact?: boolean;
    
    // 群組內角色
    chat_member_status?: string;
    joined_date?: string;
    
    // 在線狀態
    online_status: string;
    last_online?: string;
    last_seen?: string;
    
    // 來源信息
    source_chat_id?: string;
    source_chat_title?: string;
    extracted_at?: string;
    
    // 評分
    activity_score?: number;
    value_level?: string;
  }>>([]);
  memberListLoading = signal(false);
  memberListProgress = signal({ extracted: 0, total: 0, status: '' });
  selectedMemberIds = signal<string[]>([]);
  memberExtractStarted = signal(false);
  memberListFilter = signal<string>('all'); // 'all', 'chinese', 'online', 'premium', 'hasUsername'
  
  // 🆕 增強的提取篩選配置
  memberExtractConfig = signal({
    limit: 500,
    customLimit: 1000,
    backgroundMode: false,
    
    // 用戶類型
    userTypes: {
      chinese: false,      // 華人用戶
      overseas: false,     // 海外用戶
    },
    
    // 活躍度篩選
    activityFilters: {
      onlineNow: false,    // 現在在線
      within3Days: false,  // 3天內上線
      within7Days: false,  // 7天內上線
      within30Days: false, // 30天內上線
      longOffline: false,  // 長期離線（>30天）
    },
    
    // 帳號特徵
    accountFeatures: {
      premium: false,      // Premium 用戶
      hasUsername: false,  // 有用戶名
      hasPhoto: false,     // 有頭像
      newAccount: false,   // 新號
      activeAccount: false,// 活躍號
      verified: false,     // 已認證
    },
    
    // 排除項
    excludeFilters: {
      bots: true,          // 排除 Bot
      scam: true,          // 排除詐騙標記
      deleted: true,       // 排除已刪除
    }
  });
  
  // 🆕 快捷預設類型
  extractPresets = [
    { 
      id: 'precise', 
      name: '🎯 精準活躍', 
      desc: '現在在線+有用戶名', 
      config: { 
        activityFilters: { onlineNow: true, within3Days: true },
        accountFeatures: { hasUsername: true }
      }
    },
    { 
      id: 'chinese', 
      name: '🇨🇳 華人優先', 
      desc: '華人+7天內活躍', 
      config: { 
        userTypes: { chinese: true },
        activityFilters: { within7Days: true }
      }
    },
    { 
      id: 'premium', 
      name: '💎 高價值', 
      desc: 'Premium+活躍用戶', 
      config: { 
        accountFeatures: { premium: true },
        activityFilters: { within7Days: true }
      }
    },
    { 
      id: 'all', 
      name: '📦 全部提取', 
      desc: '不篩選，提取所有', 
      config: {}
    }
  ];
  selectedPreset = signal<string>('');
  
  // 🆕 提取結果摘要對話框
  showExtractionSummaryDialog = signal(false);
  extractionSummary = signal<{
    groupName: string;
    groupUrl: string;
    totalExtracted: number;
    totalInGroup: number;
    onlineCount: number;
    recentlyCount: number;
    premiumCount: number;
    chineseCount: number;
    hasUsernameCount: number;
    botCount: number;
    valueLevelDistribution: { S: number; A: number; B: number; C: number; D: number };
    extractedAt: string;
    duration: number; // 提取耗時（秒）
  }>({
    groupName: '',
    groupUrl: '',
    totalExtracted: 0,
    totalInGroup: 0,
    onlineCount: 0,
    recentlyCount: 0,
    premiumCount: 0,
    chineseCount: 0,
    hasUsernameCount: 0,
    botCount: 0,
    valueLevelDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
    extractedAt: '',
    duration: 0
  });
  extractionStartTime = signal<number>(0);
  
  // 🆕 成員提取配置對話框（監控群組頁面用）
  showMemberExtractionDialog = signal(false);
  memberExtractionGroup = signal<ExtractionGroupInfo | null>(null);
  @ViewChild('monitoringGroupsRef') monitoringGroupsRef!: MonitoringGroupsComponent;
  
  // 單個群組發消息對話框
  showSingleMessageDialog = signal(false);
  singleMessageResource = signal<any>(null);
  singleMessageContent = '';
  singleMessageScheduled = signal(false);
  singleMessageScheduleTime = '';
  singleMessageAccountId = signal<string>('');
  
  // 帳號配額信息
  accountQuotas = signal<Array<{
    phone: string;
    nickname: string;
    joinedGroups: number;
    dailyLimit: number;
    dailyUsed: number;
    isRecommended: boolean;
  }>>([]);
  newChannelNotes = '';
  isTestingChannel = signal(false);
  selectedResourceIds = signal<number[]>([]);
  resourceFilterStatus = signal<string>('');
  resourceFilterType = signal<string>('');
  resourceFilterLink = signal<string>(''); // 鏈接狀態篩選：'', 'has_link', 'no_link'
  
  // 🔍 多渠道選擇（新增）
  selectedSearchSources = signal<string[]>(['telegram', 'jiso']); // 默認選擇 Telegram 和 極搜
  showBatchJoinMenu = signal(false);
  
  // 🆕 搜索結果緩存（相同關鍵詞+渠道直接返回）
  private searchResultsCache = new Map<string, { results: any[], timestamp: number }>();
  private readonly CACHE_EXPIRY_MS = 5 * 60 * 1000; // 緩存有效期 5 分鐘
  
  // 📨 批量操作（新增）
  showBatchMessageDialog = signal(false);
  showBatchInviteDialog = signal(false);
  batchMessageContent = '';
  batchMessageTargets: { userId: string; username: string; firstName?: string; lastName?: string; displayName: string }[] = [];
  batchMessageConfig = {
    delayMin: 60,
    delayMax: 120,
    dailyLimit: 50,
    smartAntiBlock: true,
    accountMode: 'rotate' as string, // 'rotate' 或特定帳號 phone
    scheduled: false,
    scheduleTime: ''
  };
  batchInviteConfig = {
    selectedMemberIds: [] as string[],
    selectAll: false,
    delayMin: 120,
    delayMax: 300,
    perGroupLimit: 10,
    smartAntiBlock: true
  };
  availableMembersForInvite = signal<Array<{id: string; name?: string; username?: string}>>([]);
  
  // --- Discussion Watcher State ---
  discussionWatcherInitialized = signal(false);
  channelDiscussions = signal<Array<{
    id: number;
    channel_id: string;
    channel_title: string;
    discussion_id: string;
    discussion_title: string;
    is_monitoring: number;
    message_count: number;
    lead_count: number;
    last_message_at: string;
  }>>([]);
  discussionMessages = signal<Array<{
    id: number;
    discussion_id: string;
    message_id: number;
    user_id: string;
    username: string;
    first_name: string;
    message_text: string;
    is_matched: number;
    matched_keywords: string[];
    is_replied: number;
    created_at: string;
  }>>([]);
  discussionStats = signal<{
    total_discussions: number;
    monitoring_count: number;
    total_messages: number;
    matched_messages: number;
    leads_from_discussions: number;
    today_messages: number;
    today_leads: number;
  }>({
    total_discussions: 0,
    monitoring_count: 0,
    total_messages: 0,
    matched_messages: 0,
    leads_from_discussions: 0,
    today_messages: 0,
    today_leads: 0
  });
  selectedDiscussionId = signal<string>('');
  discoverChannelId = '';
  resourcesTab = signal<'resources' | 'discussions'>('resources');
  resourceCenterTab = signal<'manage' | 'stats'>('manage');  // 資源中心 Tab（移除了搜索發現，獨立頁面）
  isLoadingDiscussionMessages = signal(false);
  discussionReplyText = signal('');
  
  // --- Voice Clone Configuration ---
  clonedVoices = signal<Array<{id: string; name: string; audioPath: string; promptText: string; createdAt: Date}>>([]);
  selectedClonedVoice = signal<string>('');
  isUploadingVoice = signal(false);
  voiceUploadProgress = signal(0);
  voiceCloneError = signal('');
  
  // --- Voice Recording ---
  isRecording = signal(false);
  recordingTime = signal(0);
  recordingTimer: any = null;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  voicePromptText = signal('');  // 錄音時的提示詞/參考文本
  voiceName = signal('');        // 聲音名稱
  showRecordingDialog = signal(false);
  recordedAudioBlob = signal<Blob | null>(null);
  recordedAudioUrl = signal<string>('');
  
  // --- Core State Signals ---
  accounts: WritableSignal<TelegramAccount[]> = signal([]);
  keywordSets: WritableSignal<KeywordSet[]> = signal([]);
  monitoredGroups: WritableSignal<MonitoredGroup[]> = signal([]);
  leads: WritableSignal<CapturedLead[]> = signal([]);
  leadsTotal: WritableSignal<number> = signal(0);  // 數據庫中的實際總數
  leadsHasMore: WritableSignal<boolean> = signal(false);  // 🆕 是否有更多 leads 需要加載
  leadsLoading: WritableSignal<boolean> = signal(false);  // 🆕 是否正在加載更多 leads
  logs: WritableSignal<LogEntry[]> = signal([]);
  
  // 邀請進群相關
  selectedLeadForInvite: WritableSignal<CapturedLead | null> = signal(null);
  showInviteGroupDialog = signal(false);
  
  // 實時匹配數據
  realtimeMatches: WritableSignal<{
    keyword: string;
    groupUrl: string;
    groupName: string;
    userId: string;
    username: string;
    firstName: string;
    messagePreview: string;
    timestamp: string;
  }[]> = signal([]);
  
  // 今日統計
  todayStats = signal({
    matchCount: 0,
    newLeads: 0,
    messagesSent: 0,
    conversions: 0
  });
  
  // --- Chat History State ---
  chatList: WritableSignal<any[]> = signal([]);
  chatHistory: WritableSignal<any[]> = signal([]);
  selectedChatUserId: WritableSignal<string | null> = signal(null);
  isLoadingChatHistory = signal(false);
  chatListSearch = signal('');
  chatListFunnelFilter = signal<string>('');
  
  // --- Virtual Scroll State (分頁加載) ---
  chatHistoryPage = signal(0);
  chatHistoryPageSize = signal(50);
  chatHistoryHasMore = signal(false);
  chatHistoryLoadingMore = signal(false);
  chatHistoryAllMessages: WritableSignal<any[]> = signal([]);  // 所有已加載的消息
  
  // --- Debounce/Throttle Timers ---
  private chatListSearchDebounceTimer?: any;
  private logFilterDebounceTimer?: any;
  private queueStatusRefreshThrottleTimer?: any;
  private lastQueueStatusRefresh = 0;
  
  // Queue status
  queueStatuses: WritableSignal<Record<string, QueueStatus>> = signal({});
  queueMessages: WritableSignal<QueueMessage[]> = signal([]);
  selectedQueuePhone: WritableSignal<string | null> = signal(null);
  
  // 隊列統計（用於廣告發送頁面）
  queueStats = signal({
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    totalToday: 0,
    successRate: 0,
    avgSendTime: 0
  });
  
  // Analytics charts data
  sendingStatsData = signal<TimeSeriesData | null>(null);
  queueLengthHistoryData = signal<TimeSeriesData | null>(null);
  accountComparisonData = signal<TimeSeriesData | null>(null);
  campaignPerformanceData = signal<TimeSeriesData | null>(null);
  
  // Alerts
  alerts: WritableSignal<Alert[]> = signal([]);
  unacknowledgedAlertsCount = computed(() => 
    this.alerts().filter(a => !a.acknowledged && !a.resolved).length
  );
  
  // Batch Operations State (批量操作)
  selectedLeadIds: WritableSignal<Set<number>> = signal(new Set());
  isSelectAllLeads = signal(false);
  showBatchOperationMenu = signal(false);
  showFloatingMoreMenu = signal(false); // 浮動欄更多操作下拉菜單
  batchOperationInProgress = signal(false);
  batchOperationHistory: WritableSignal<any[]> = signal([]);
  showBatchOperationHistory = signal(false);
  allTags: WritableSignal<{id: number, name: string, color: string, usageCount: number}[]> = signal([]);
  newTagName = signal('');
  newTagColor = signal('#3B82F6');
  showAddTagDialog = signal(false);
  batchTagInput = signal('');
  showBatchTagSelector = signal(false);
  showBatchRemoveTagSelector = signal(false);
  
  // Full-text search state
  leadSearchQuery = signal('');
  leadSearchResults: WritableSignal<CapturedLead[]> = signal([]);
  isSearchingLeads = signal(false);
  leadSearchTimeout: any = null;
  
  // Backup management state
  backups: WritableSignal<any[]> = signal([]);
  isCreatingBackup = signal(false);
  isRestoringBackup = signal(false);
  
  // Computed: Selected leads count
  selectedLeadsCount = computed(() => this.selectedLeadIds().size);
  
  // Computed: Whether any leads are selected
  hasSelectedLeads = computed(() => this.selectedLeadIds().size > 0);
  
  // Ad System State (廣告發送系統)
  adTemplates: WritableSignal<any[]> = signal([]);
  adSchedules: WritableSignal<any[]> = signal([]);
  adSendLogs: WritableSignal<any[]> = signal([]);
  adOverviewStats: WritableSignal<any> = signal(null);
  showAdTemplateForm = signal(false);
  showAdScheduleForm = signal(false);
  editingAdTemplate: WritableSignal<any> = signal(null);
  editingAdSchedule: WritableSignal<any> = signal(null);
  newAdTemplate = signal({ name: '', content: '', mediaType: 'text' as const });
  newAdSchedule = signal({
    name: '',
    templateId: 0,
    targetGroups: [] as string[],
    sendMode: 'scheduled' as const,
    scheduleType: 'once' as const,
    scheduleTime: '',
    intervalMinutes: 60,
    triggerKeywords: [] as string[],
    accountStrategy: 'rotate' as const,
    assignedAccounts: [] as string[]
  });
  spintaxPreview: WritableSignal<string[]> = signal([]);
  isPreviewingSpintax = signal(false);
  adSystemTab = signal<'templates' | 'schedules' | 'logs' | 'analytics'>('templates');
  
  // User Tracking State (用戶追蹤系統)
  trackedUsers: WritableSignal<any[]> = signal([]);
  userGroups: WritableSignal<any[]> = signal([]);
  highValueGroups: WritableSignal<any[]> = signal([]);
  trackingStats: WritableSignal<any> = signal(null);
  showAddUserForm = signal(false);
  newTrackedUser = signal({ userId: '', username: '', notes: '' });
  selectedTrackedUser: WritableSignal<any> = signal(null);
  isTrackingUser = signal(false);
  userTrackingTab = signal<'users' | 'groups' | 'analytics'>('users');
  userValueFilter = signal<string>('');
  
  // Campaign & Stats State (營銷活動協調器)
  // Note: campaigns is already defined in automation section
  selectedCampaign: WritableSignal<any> = signal(null);
  unifiedOverview: WritableSignal<any> = signal(null);
  funnelAnalysis: WritableSignal<any> = signal(null);
  showCampaignForm = signal(false);
  campaignKeywordInput = signal('');
  campaignFormData = signal({
    name: '',
    description: '',
    phases: ['discovery', 'monitoring', 'outreach'] as string[],
    keywords: [] as string[],
    targetGroups: [] as string[],
    assignedAccounts: [] as string[]
  });
  
  // Multi-Role Collaboration State (多角色協作)
  roleTemplates: WritableSignal<Record<string, any>> = signal({});
  allRoles: WritableSignal<any[]> = signal([]);
  scriptTemplates: WritableSignal<any[]> = signal([]);
  collabGroups: WritableSignal<any[]> = signal([]);
  collabStats: WritableSignal<any> = signal(null);
  roleStats: WritableSignal<any> = signal(null);
  showRoleAssignForm = signal(false);
  multiRoleTab = signal<'roles' | 'scripts' | 'collab' | 'stats'>('roles');
  newRoleAssign = signal({
    accountPhone: '',
    roleType: 'seller' as string,
    roleName: ''
  });
  
  // Validation errors
  validationErrors: WritableSignal<Record<string, string[]>> = signal({});
  
  // Progress dialog
  progressDialog: WritableSignal<{
    show: boolean;
    title: string;
    progress: ProgressInfo;
    cancellable: boolean;
  }> = signal({
    show: false,
    title: '处理中...',
    progress: { current: 0, total: 0 },
    cancellable: false
  });
  
  // Log filtering state
  logFilterType = signal<'' | 'info' | 'success' | 'warning' | 'error'>('');
  logFilterStartDate = signal('');
  logFilterEndDate = signal('');
  logFilterSearch = signal('');
  filteredLogs = computed(() => {
    const allLogs = this.logs();
    const type = this.logFilterType();
    const startDate = this.logFilterStartDate();
    const endDate = this.logFilterEndDate();
    const search = this.logFilterSearch();
    
    return allLogs.filter(log => {
      // Type filter
      if (type && log.type !== type) {
        return false;
      }
      
      // Date range filter
      if (startDate) {
        const start = new Date(startDate);
        if (log.timestamp < start) {
          return false;
        }
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        if (log.timestamp > end) {
          return false;
        }
      }
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!log.message.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  });
  generationState: WritableSignal<GenerationState> = signal({ status: 'idle', lead: null, generatedMessage: '', error: null, customPrompt: '', attachment: null, attachments: [] });
  messageTemplates: WritableSignal<MessageTemplate[]> = signal([]);
  doNotContactList = signal<Set<string>>(new Set());
  campaigns = signal<AutomationCampaign[]>([]);
  
  // --- Settings & Automation ---
  spintaxEnabled = signal(true);
  autoReplyEnabled = signal(false);
  autoReplyMessage = signal("Thanks for getting back to me! I'll read your message and respond shortly.");
  smartSendingEnabled = signal(true);
  
  // Debounce timer for settings
  private saveSettingsTimer: any = null;
  
  saveSettings() {
    // Debounce settings save - wait 500ms before sending
    if (this.saveSettingsTimer) {
      clearTimeout(this.saveSettingsTimer);
    }
    this.saveSettingsTimer = setTimeout(() => {
      this.ipcService.send('save-settings', {
        settings: {
          spintaxEnabled: this.spintaxEnabled(),
          autoReplyEnabled: this.autoReplyEnabled(),
          autoReplyMessage: this.autoReplyMessage(),
          smartSendingEnabled: this.smartSendingEnabled()
        }
      });
      this.saveSettingsTimer = null;
    }, 500);
  }

  showSettingsSavedToast() {
    this.toastService.success(this.t('settingsSaved'), 2000);
  }

  async testAiConnection() {
    // 對於本地 AI，使用不同的測試邏輯
    if (this.aiApiType() === 'local') {
      await this.testLocalAiConnection();
      return;
    }
    
    if (!this.aiApiKey()) return;
    
    this.isTestingAi.set(true);
    this.aiConnectionStatus.set(null);
    
    try {
      // Send test request to backend
      this.ipcService.send('test-ai-connection', {
        apiType: this.aiApiType(),
        apiKey: this.aiApiKey(),
        endpoint: this.customApiEndpoint()
      });
      
      // Wait for response (handled by IPC listener)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simple validation
      const key = this.aiApiKey();
      if (this.aiApiType() === 'gemini' && key.startsWith('AIza')) {
        this.aiConnectionStatus.set('success');
      } else if (this.aiApiType() === 'openai' && key.startsWith('sk-')) {
        this.aiConnectionStatus.set('success');
      } else if (this.aiApiType() === 'custom' && key.length > 10) {
        this.aiConnectionStatus.set('success');
      } else {
        this.aiConnectionStatus.set('error');
        this.aiConnectionError.set(this.t('invalidApiKeyFormat'));
      }
    } catch (error: any) {
      this.aiConnectionStatus.set('error');
      this.aiConnectionError.set(error.message);
    } finally {
      this.isTestingAi.set(false);
    }
  }

  // 測試本地 AI 服務連接
  async testLocalAiConnection() {
    const endpoint = this.localAiEndpoint();
    if (!endpoint) return;
    
    this.isTestingLocalAi.set(true);
    this.localAiStatus.set(null);
    
    try {
      // 發送測試請求到後端
      this.ipcService.send('test-local-ai', { 
        endpoint,
        provider: this.localAiProvider(),
        model: this.localAiModel()
      });
      
      // 如果是 Ollama，嘗試獲取模型列表
      if (this.localAiProvider() === 'ollama') {
        this.ipcService.send('get-ollama-models', { endpoint });
      }
      
      // 等待後端響應
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 簡單驗證端點格式
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        this.localAiStatus.set('success');
        this.aiConnectionStatus.set('success');
        this.toastService.success('本地 AI 服務連接成功');
      } else {
        this.localAiStatus.set('error');
        this.localAiError.set(this.t('invalidEndpointFormat'));
      }
    } catch (error: any) {
      this.localAiStatus.set('error');
      this.localAiError.set(error.message);
    } finally {
      this.isTestingLocalAi.set(false);
    }
  }
  
  // 刷新 Ollama 模型列表
  refreshOllamaModels() {
    const endpoint = this.localAiEndpoint();
    if (!endpoint) return;
    
    this.toastService.info('正在獲取模型列表...');
    this.ipcService.send('get-ollama-models', { endpoint });
  }
  
  // 設置本地 AI 提供者預設值
  setLocalAiPresets(provider: 'ollama' | 'lmstudio' | 'custom') {
    this.localAiProvider.set(provider);
    
    switch (provider) {
      case 'ollama':
        this.localAiEndpoint.set('http://localhost:11434');
        this.localAiModel.set('qwen2:7b');
        break;
      case 'lmstudio':
        this.localAiEndpoint.set('http://localhost:1234');
        this.localAiModel.set('');
        break;
      case 'custom':
        this.localAiEndpoint.set('');
        this.localAiModel.set('');
        break;
    }
  }

  // 測試 TTS 服務連接
  async testTtsConnection() {
    const endpoint = this.ttsEndpoint();
    if (!endpoint) return;
    
    this.isTestingTts.set(true);
    this.ttsStatus.set(null);
    
    try {
      this.ipcService.send('test-tts-service', { endpoint });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        this.ttsStatus.set('success');
      } else {
        this.ttsStatus.set('error');
        this.ttsError.set(this.t('invalidEndpointFormat'));
      }
    } catch (error: any) {
      this.ttsStatus.set('error');
      this.ttsError.set(error.message);
    } finally {
      this.isTestingTts.set(false);
    }
  }

  // 測試 STT 服務連接
  async testSttConnection() {
    const endpoint = this.sttEndpoint();
    if (!endpoint) return;
    
    this.isTestingStt.set(true);
    this.sttStatus.set(null);
    
    try {
      this.ipcService.send('test-stt-service', { endpoint });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        this.sttStatus.set('success');
      } else {
        this.sttStatus.set('error');
        this.sttError.set(this.t('invalidEndpointFormat'));
      }
    } catch (error: any) {
      this.sttStatus.set('error');
      this.sttError.set(error.message);
    } finally {
      this.isTestingStt.set(false);
    }
  }

  saveAiSettings() {
    // Save to localStorage
    localStorage.setItem('ai_api_key', this.aiApiKey());
    localStorage.setItem('ai_api_type', this.aiApiType());
    localStorage.setItem('ai_custom_endpoint', this.customApiEndpoint());
    
    // 保存本地 AI 設置
    localStorage.setItem('local_ai_endpoint', this.localAiEndpoint());
    localStorage.setItem('local_ai_model', this.localAiModel());
    
    // 保存語音服務設置
    localStorage.setItem('tts_endpoint', this.ttsEndpoint());
    localStorage.setItem('tts_enabled', String(this.ttsEnabled()));
    localStorage.setItem('tts_voice', this.ttsVoice());
    localStorage.setItem('stt_endpoint', this.sttEndpoint());
    localStorage.setItem('stt_enabled', String(this.sttEnabled()));
    
    this.ipcService.send('save-ai-settings', {
      apiType: this.aiApiType(),
      apiKey: this.aiApiKey(),
      endpoint: this.customApiEndpoint(),
      localAiEndpoint: this.localAiEndpoint(),
      localAiModel: this.localAiModel(),
      ttsEndpoint: this.ttsEndpoint(),
      ttsEnabled: this.ttsEnabled(),
      ttsVoice: this.ttsVoice(),
      sttEndpoint: this.sttEndpoint(),
      sttEnabled: this.sttEnabled()
    });
    
    // Update gemini service with new key (if using Gemini)
    if (this.aiApiType() === 'gemini' && this.aiApiKey()) {
      this.geminiService.setApiKey(this.aiApiKey());
    }
    
    this.toastService.success(this.t('aiSettingsSaved'), 2000);
  }

  // 切換 AI 自動聊天開關（自動保存）
  toggleAiAutoChat() {
    this.aiAutoChatEnabled.set(!this.aiAutoChatEnabled());
    // 自動保存到後端
    this.saveAiChatSettings();
    this.toastService.success(
      this.aiAutoChatEnabled() ? 'AI 自動聊天已開啟' : 'AI 自動聊天已關閉', 
      2000
    );
  }
  
  // 切換自動問候開關（自動保存）
  toggleAiAutoGreeting() {
    this.aiAutoGreeting.set(!this.aiAutoGreeting());
    // 自動保存到後端
    this.saveAiChatSettings();
    this.toastService.success(
      this.aiAutoGreeting() ? '自動問候已開啟' : '自動問候已關閉', 
      2000
    );
  }

  // 保存 AI 自動聊天設置
  saveAiChatSettings() {
    // Save to localStorage
    localStorage.setItem('ai_auto_chat_enabled', String(this.aiAutoChatEnabled()));
    localStorage.setItem('ai_auto_chat_mode', this.aiAutoChatMode());
    localStorage.setItem('ai_typing_speed', String(this.aiTypingSpeed()));
    localStorage.setItem('ai_reply_delay', JSON.stringify(this.aiReplyDelay()));
    localStorage.setItem('ai_system_prompt', this.aiSystemPrompt());
    localStorage.setItem('ai_max_context_messages', String(this.aiMaxContextMessages()));
    localStorage.setItem('ai_enable_memory', String(this.aiEnableMemory()));
    localStorage.setItem('ai_auto_greeting', String(this.aiAutoGreeting()));
    localStorage.setItem('ai_greeting_message', this.aiGreetingMessage());
    
    // Send to backend
    this.ipcService.send('update-ai-chat-settings', {
      settings: {
        auto_chat_enabled: this.aiAutoChatEnabled() ? 1 : 0,
        auto_chat_mode: this.aiAutoChatMode(),
        typing_speed: this.aiTypingSpeed(),
        reply_delay_min: this.aiReplyDelay()[0],
        reply_delay_max: this.aiReplyDelay()[1],
        system_prompt: this.aiSystemPrompt(),
        max_context_messages: this.aiMaxContextMessages(),
        enable_memory: this.aiEnableMemory() ? 1 : 0,
        auto_greeting: this.aiAutoGreeting() ? 1 : 0,
        greeting_message: this.aiGreetingMessage()
      },
      localAiEndpoint: this.localAiEndpoint(),
      localAiModel: this.localAiModel()
    });
    
    this.toastService.success(this.t('aiSettingsSaved'), 2000);
  }
  
  // 加載 AI 自動聊天設置
  loadAiChatSettings() {
    const enabled = localStorage.getItem('ai_auto_chat_enabled');
    const mode = localStorage.getItem('ai_auto_chat_mode') as 'full' | 'semi' | 'assist' | 'keyword' | null;
    const speed = localStorage.getItem('ai_typing_speed');
    const delay = localStorage.getItem('ai_reply_delay');
    const prompt = localStorage.getItem('ai_system_prompt');
    const maxContext = localStorage.getItem('ai_max_context_messages');
    const memory = localStorage.getItem('ai_enable_memory');
    const greeting = localStorage.getItem('ai_auto_greeting');
    const greetingMsg = localStorage.getItem('ai_greeting_message');
    
    if (enabled) this.aiAutoChatEnabled.set(enabled === 'true');
    if (mode) this.aiAutoChatMode.set(mode);
    if (speed) this.aiTypingSpeed.set(parseInt(speed));
    if (delay) {
      try {
        this.aiReplyDelay.set(JSON.parse(delay));
      } catch (e) {}
    }
    if (prompt) this.aiSystemPrompt.set(prompt);
    if (maxContext) this.aiMaxContextMessages.set(parseInt(maxContext));
    if (memory) this.aiEnableMemory.set(memory === 'true');
    if (greeting) this.aiAutoGreeting.set(greeting === 'true');
    if (greetingMsg) this.aiGreetingMessage.set(greetingMsg);
  }

  // ==================== Telegram RAG System Methods ====================
  
  // 初始化 RAG 系統
  initRagSystem() {
    this.isInitializingRag.set(true);
    this.ipcService.send('init-rag-system', {});
  }
  
  // 觸發 RAG 學習
  triggerRagLearning() {
    this.isRagLearning.set(true);
    this.ipcService.send('trigger-rag-learning', {});
  }
  
  // 重新索引高價值對話
  reindexHighValueConversations() {
    this.isReindexing.set(true);
    this.ipcService.send('reindex-conversations', {
      highValueOnly: true,
      days: 30
    });
  }
  
  // 清理 RAG 知識庫
  cleanupRagKnowledge() {
    this.isCleaningRag.set(true);
    this.ipcService.send('cleanup-rag-knowledge', {
      minScore: 0.2,
      daysOld: 30,
      mergeSimilar: true
    });
  }
  
  // 重新索引對話
  reindexConversations() {
    this.isReindexing.set(true);
    this.ipcService.send('reindex-conversations', {
      highValueOnly: true,
      days: 30
    });
    this.toastService.info('開始重建索引...');
  }
  
  // 刷新 RAG 統計
  refreshRagStats() {
    this.ipcService.send('get-rag-stats', {});
  }
  
  // 搜索 RAG 知識庫
  searchRagKnowledge() {
    if (!this.ragSearchQuery.trim()) return;
    this.isSearchingRag.set(true);
    this.ipcService.send('search-rag', {
      query: this.ragSearchQuery,
      limit: 10
    });
  }
  
  // 發送 RAG 反饋
  sendRagFeedback(knowledgeId: number, isPositive: boolean) {
    this.ipcService.send('rag-feedback', {
      knowledgeId,
      isPositive
    });
    this.toastService.info(isPositive ? '👍 感謝反饋！' : '👎 已記錄反饋');
  }
  
  // 添加手動知識
  addRagKnowledge() {
    if (!this.newRagKnowledge.answer.trim()) {
      this.toastService.error('請填寫回答內容');
      return;
    }
    
    this.ipcService.send('add-rag-knowledge', {
      type: this.newRagKnowledge.type,
      question: this.newRagKnowledge.question,
      answer: this.newRagKnowledge.answer,
      context: this.newRagKnowledge.context
    });
    
    // 重置表單
    this.newRagKnowledge = {type: 'qa', question: '', answer: '', context: ''};
    this.showAddRagKnowledgeDialog.set(false);
  }
  
  // ==================== Vector Memory Methods ====================
  
  // 搜索向量記憶
  searchVectorMemory() {
    if (!this.vectorMemorySearchQuery.trim()) return;
    this.isSearchingMemory.set(true);
    this.ipcService.send('search-vector-memories', {
      userId: this.selectedMemoryUserId() || '',
      query: this.vectorMemorySearchQuery,
      limit: 10
    });
  }
  
  // 添加向量記憶
  addVectorMemory() {
    if (!this.newMemory.content.trim()) {
      this.toastService.error('請填寫記憶內容');
      return;
    }
    
    this.isAddingMemory.set(true);
    this.ipcService.send('add-vector-memory', {
      userId: this.newMemory.userId || 'manual',
      content: this.newMemory.content,
      type: this.newMemory.type,
      importance: this.newMemory.importance
    });
  }
  
  // 獲取記憶統計
  refreshMemoryStats() {
    this.ipcService.send('get-memory-stats', { userId: '' });
  }
  
  // 刪除向量記憶
  deleteVectorMemory(memoryId: number) {
    this.ipcService.send('delete-vector-memory', { memoryId });
  }
  
  // 獲取用戶列表
  loadMemoryUserList() {
    this.ipcService.send('get-memory-user-list', {});
  }
  
  // 清理舊記憶
  cleanupOldMemories() {
    this.ipcService.send('cleanup-old-memories', { daysOld: 90 });
  }
  
  // 合併相似記憶
  mergeSimilarMemories() {
    const userId = this.selectedMemoryUserId();
    if (!userId) {
      this.toastService.error('請先選擇用戶');
      return;
    }
    this.ipcService.send('merge-similar-memories', { userId, threshold: 0.85 });
  }
  
  // ==================== Resource Discovery Methods ====================
  
  // 獲取資源發現可用的帳號列表（優先探索號，其次監控號，最後任意在線帳號）
  getResourceDiscoveryAccounts(): TelegramAccount[] {
    const onlineAccounts = this.accounts().filter(a => a.status === 'Online');
    // 優先級排序：Explorer > Listener > Sender > 其他
    return onlineAccounts.sort((a, b) => {
      const priority: Record<string, number> = {
        'Explorer': 1,
        'Listener': 2,
        'Sender': 3,
        'AI': 4,
        'Backup': 5,
        'Unassigned': 6
      };
      return (priority[a.role] || 99) - (priority[b.role] || 99);
    });
  }
  
  // 獲取當前資源發現使用的帳號
  getSelectedResourceAccount(): TelegramAccount | null {
    const accountId = this.resourceAccountId();
    if (accountId) {
      return this.accounts().find(a => a.id === accountId) || null;
    }
    // 自動選擇優先級最高的在線帳號
    const accounts = this.getResourceDiscoveryAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  }
  
  // 選擇資源發現帳號
  selectResourceAccount(accountId: number): void {
    this.resourceAccountId.set(accountId);
    const account = this.accounts().find(a => a.id === accountId);
    if (account) {
      this.toastService.success(`資源發現將使用: ${account.phone}`);
    }
    this.showResourceAccountSelector.set(false);
  }

  // 獲取角色名稱
  getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      'Explorer': '🔍 探索號',
      'Listener': '👁️ 監控號',
      'Sender': '📤 發送號',
      'AI': '🤖 AI號',
      'Backup': '⚡ 備用號',
      'Unassigned': '⭕ 未分配'
    };
    return roleNames[role] || '⭕ 未分配';
  }

  // 初始化資源發現系統
  initResourceDiscovery() {
    // 確保有選中的帳號
    const account = this.getSelectedResourceAccount();
    if (!account) {
      this.toastService.error('沒有可用的在線帳號，請先登入帳號');
      return;
    }
    
    this.toastService.info(`正在使用 ${account.phone} 初始化資源發現系統...`);
    this.ipcService.send('init-resource-discovery', { 
      accountId: account.id,
      phone: account.phone
    });
  }
  
  // 自動初始化（進入頁面時調用）
  autoInitResourceDiscovery() {
    if (!this.resourceDiscoveryInitialized()) {
      this.initResourceDiscovery();
    }
    this.refreshResourceStats();
    this.loadDiscoveryKeywords();
  }
  
  private searchTimeout: any = null;
  
  // 生成搜索會話 ID
  private generateSearchSessionId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  
  // 🆕 生成搜索緩存鍵
  private generateSearchCacheKey(query: string, sources: string[]): string {
    const normalizedQuery = query.toLowerCase().trim();
    const sortedSources = [...sources].sort().join(',');
    return `${normalizedQuery}|${sortedSources}`;
  }
  
  // 🆕 獲取緩存的搜索結果
  private getSearchCache(cacheKey: string): any[] | null {
    const cached = this.searchResultsCache.get(cacheKey);
    if (!cached) return null;
    
    // 檢查是否過期
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.searchResultsCache.delete(cacheKey);
      return null;
    }
    
    return cached.results;
  }
  
  // 🆕 設置搜索結果緩存
  private setSearchCache(cacheKey: string, results: any[]): void {
    // 清理過期緩存（最多保留 20 個）
    if (this.searchResultsCache.size > 20) {
      const entries = Array.from(this.searchResultsCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - 20);
      toDelete.forEach(([key]) => this.searchResultsCache.delete(key));
    }
    
    this.searchResultsCache.set(cacheKey, {
      results: [...results],
      timestamp: Date.now()
    });
    console.log(`[Search Cache] 已緩存搜索結果: "${cacheKey}" (${results.length} 條)`);
  }
  
  // 🆕 清除搜索緩存
  clearSearchCache(): void {
    this.searchResultsCache.clear();
    console.log('[Search Cache] 已清除所有緩存');
  }
  
  // 搜索资源（支持多渠道和多关键词）
  searchResources() {
    if (!this.resourceSearchQuery.trim()) {
      this.toastService.error(this.t('searchPlaceholder'));
      return;
    }
    
    // 检查是否选择了搜索源
    if (this.selectedSearchSources().length === 0) {
      this.toastService.error('请至少选择一个搜索渠道');
      return;
    }
    
    // 🆕 檢查是否有帳號在線（不再需要手動初始化，系統會自動初始化）
    if (this.getOnlineAccountsCount() === 0) {
      this.toastService.error('請先登錄帳號');
      return;
    }
    
    const query = this.resourceSearchQuery.trim();
    const sources = this.selectedSearchSources();
    
    // 🆕 生成緩存鍵（關鍵詞 + 排序後的渠道）
    const cacheKey = this.generateSearchCacheKey(query, sources);
    
    // 🆕 檢查緩存
    const cachedResult = this.getSearchCache(cacheKey);
    if (cachedResult) {
      console.log(`[Search Cache] 使用緩存結果: "${query}" (${cachedResult.length} 條)`);
      this.currentSearchKeyword.set(query);
      this.discoveredResources.set(cachedResult);
      this.showSearchHistory.set(false);
      
      // 更新歷史關鍵詞
      const history = this.searchHistoryKeywords();
      const newHistory = [query, ...history.filter(k => k !== query)].slice(0, 10);
      this.searchHistoryKeywords.set(newHistory);
      return;
    }
    
    // 🆕 生成新的搜索會話 ID
    const sessionId = this.generateSearchSessionId();
    this.currentSearchSessionId.set(sessionId);
    this.currentSearchKeyword.set(query);
    this.showSearchHistory.set(false);  // 切換到當前搜索模式
    
    // 🆕 更新歷史關鍵詞列表（去重，最多保留 10 個）
    const history = this.searchHistoryKeywords();
    const newHistory = [query, ...history.filter(k => k !== query)].slice(0, 10);
    this.searchHistoryKeywords.set(newHistory);
    
    // 清空之前的搜索结果（始終替換，不累加）
    this.discoveredResources.set([]);
    
    // 检查是否是多关键词搜索（用逗号或分号分隔）
    const keywords = query.split(/[,;，；]/).map(k => k.trim()).filter(k => k.length > 0);
    
    if (keywords.length > 1) {
      // 多关键词搜索
      console.log(`[Search] 正在搜索 ${keywords.length} 个关键词...`);
      this.searchMultipleKeywords(keywords);
    } else {
      // 单关键词搜索
      this.isSearchingResources.set(true);
      // 🆕 清除之前的錯誤狀態
      this.searchError.set({ hasError: false, message: '', details: '', suggestions: [] });
      // 🔧 移除搜索中提示，改用 UI 狀態指示
      console.log(`[Search] 正在搜索 "${query}"...`);
      
      // 设置前端超时保护（70秒）
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        if (this.isSearchingResources()) {
          this.isSearchingResources.set(false);
          this.toastService.error('搜索超时，请检查网络或稍后再试');
        }
      }, 70000);
      
      // 根据选择的渠道调用不同的搜索API
      this.executeMultiSourceSearch(query, sources);
    }
  }
  
  // 执行多渠道搜索
  private executeMultiSourceSearch(query: string, sources: string[]) {
    const phone = this.getSelectedResourceAccount()?.phone;
    const sessionId = this.currentSearchSessionId();  // 🆕 當前搜索會話 ID
    
    // Telegram 官方搜索
    if (sources.includes('telegram') || sources.includes('local')) {
      this.ipcService.send('search-resources', {
        query: query,
        phone: phone,
        sources: sources.filter(s => s !== 'jiso'), // 排除 jiso，单独处理
        limit: 50,
        searchType: this.resourceSearchType(),
        minMembers: this.resourceMinMembers(),
        replaceMode: true,  // 🆕 始終替換模式
        searchSessionId: sessionId,  // 🆕 傳遞會話 ID
        searchKeyword: query  // 🆕 傳遞搜索關鍵詞
      });
    }
    
    // 极搜 Bot 搜索
    if (sources.includes('jiso')) {
      // 🔧 移除搜索中提示，改用 UI 狀態指示
      console.log('[Search] 正在通过极搜 Bot 搜索...');
      this.ipcService.send('search-jiso', {
        keyword: query,
        phone: phone,
        limit: 50,
        searchSessionId: sessionId,  // 🆕 傳遞會話 ID
        searchKeyword: query  // 🆕 傳遞搜索關鍵詞
      });
    }
    
    // TGStat 搜索（如果选中且有API key）
    if (sources.includes('tgstat')) {
      // TGStat 目前通过 search-resources 处理
      // 后续可以单独对接 TGStat API
    }
  }
  
  // 多关键词搜索
  private searchMultipleKeywords(keywords: string[]) {
    this.isSearchingResources.set(true);
    const sources = this.selectedSearchSources();
    
    // 设置前端超时保护
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      if (this.isSearchingResources()) {
        this.isSearchingResources.set(false);
        this.toastService.error('搜索超时');
      }
    }, keywords.length * 10000 + 30000);
    
    // 逐个搜索
    keywords.forEach((keyword, index) => {
      setTimeout(() => {
        this.executeMultiSourceSearch(keyword, sources);
      }, index * 5000); // 每5秒搜索一个，避免频率限制
    });
  }
  
  // 打開群組鏈接
  openTelegramLink(resource: any) {
    const link = resource.username 
      ? `https://t.me/${resource.username}`
      : resource.invite_link;
    if (link) {
      this.ipcService.send('open-external-link', { url: link });
    } else {
      this.toastService.warning('此群組沒有公開鏈接');
    }
  }
  
  // 複製群組鏈接
  copyTelegramLink(resource: any) {
    const link = resource.username
      ? `https://t.me/${resource.username}`
      : resource.invite_link || '';
    if (link) {
      navigator.clipboard.writeText(link);
      this.toastService.success('鏈接已複製');
    } else {
      // 沒有公開鏈接時，複製群組名稱供用戶搜索
      navigator.clipboard.writeText(resource.title);
      this.toastService.warning('此群組無公開鏈接，已複製群組名稱，請在 Telegram 中手動搜索');
    }
  }

  // 複製用戶名
  copyUsername(username: string) {
    const text = `@${username}`;
    navigator.clipboard.writeText(text);
    this.toastService.success('已複製 ' + text);
  }

  // 獲取資源類型圖標
  getResourceTypeIcon(type: string): string {
    switch(type) {
      case 'channel': return '📢';
      case 'supergroup': return '👥';
      case 'group': return '💬';
      default: return '📌';
    }
  }
  
  // 獲取資源類型標籤
  getResourceTypeLabel(type: string): string {
    switch(type) {
      case 'channel': return '頻道';
      case 'supergroup': return '超級群組';
      case 'group': return '群組';
      default: return '未知';
    }
  }
  
  // 格式化成員數
  formatMemberCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
  
  // 快速加入單個資源
  quickJoinResource(resourceId: number) {
    this.ipcService.send('batch-join-resources', {
      resourceIds: [resourceId]
    });
    this.toastService.info('正在嘗試加入...');
  }
  
  // 加載資源列表
  loadResources() {
    this.ipcService.send('get-resources', {
      status: this.resourceFilterStatus() || undefined,
      type: this.resourceFilterType() || undefined,
      limit: 100,
      offset: 0
    });
  }
  
  // 根據鏈接狀態篩選資源（前端過濾）
  filterResourcesByLink() {
    const filterValue = this.resourceFilterLink();
    if (!filterValue) {
      // 重新加載所有資源
      this.loadResources();
      return;
    }
    
    // 前端過濾
    const allResources = this.discoveredResources();
    const filtered = allResources.filter(r => {
      const hasLink = !!(r.username || r.invite_link);
      if (filterValue === 'has_link') {
        return hasLink;
      } else if (filterValue === 'no_link') {
        return !hasLink;
      }
      return true;
    });
    
    this.discoveredResources.set(filtered);
  }

  // 刷新資源統計
  refreshResourceStats() {
    this.ipcService.send('get-resource-stats', {});
  }

  // ==================== 搜索渠道管理 ====================

  // 打開渠道管理對話框
  openChannelManageDialog() {
    this.loadSearchChannels();
    this.showChannelManageDialog.set(true);
  }

  // 關閉渠道管理對話框
  closeChannelManageDialog() {
    this.showChannelManageDialog.set(false);
  }

  // 加載搜索渠道列表
  loadSearchChannels() {
    this.ipcService.send('get-search-channels', {});
  }

  // 打開添加渠道對話框
  openAddChannelDialog() {
    this.newChannelUsername = '';
    this.newChannelDisplayName = '';
    this.newChannelQueryFormat = '{keyword}';
    this.newChannelPriority = 'backup';
    this.newChannelNotes = '';
    this.showAddChannelDialog.set(true);
  }

  // 關閉添加渠道對話框
  closeAddChannelDialog() {
    this.showAddChannelDialog.set(false);
  }

  // 添加自定義渠道
  addSearchChannel() {
    if (!this.newChannelUsername.trim()) {
      this.toastService.error('請輸入 Bot 用戶名');
      return;
    }

    this.ipcService.send('add-search-channel', {
      botUsername: this.newChannelUsername.trim(),
      displayName: this.newChannelDisplayName.trim() || this.newChannelUsername.trim(),
      queryFormat: this.newChannelQueryFormat,
      priority: this.newChannelPriority,
      notes: this.newChannelNotes
    });
  }

  // 刪除自定義渠道
  deleteSearchChannel(channelId: number) {
    if (channelId < 0) {
      this.toastService.warning('無法刪除系統渠道');
      return;
    }
    if (confirm('確定要刪除這個搜索渠道嗎？')) {
      this.ipcService.send('delete-search-channel', { channelId });
    }
  }

  // 測試渠道
  testSearchChannel(botUsername: string) {
    this.isTestingChannel.set(true);
    this.toastService.info(`正在測試 @${botUsername}...`);
    this.ipcService.send('test-search-channel', { botUsername });
  }

  // 切換渠道啟用狀態
  toggleChannelEnabled(channelId: number, currentEnabled: boolean) {
    if (channelId < 0) {
      this.toastService.warning('無法修改系統渠道');
      return;
    }
    this.ipcService.send('update-search-channel', {
      channelId,
      enabled: !currentEnabled
    });
  }

  // 獲取渠道狀態顏色
  getChannelStatusColor(status: string): string {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-red-400';
      case 'captcha': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }

  // 獲取渠道狀態圖標
  getChannelStatusIcon(status: string): string {
    switch (status) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'captcha': return '🟡';
      default: return '⚪';
    }
  }

  // ==================== 加入並監控 ====================

  // 打開加入並監控對話框
  openJoinAndMonitorDialog(resource: any) {
    this.joinMonitorResource.set(resource);
    this.joinMonitorKeywords.set([]); // 清空舊版散列關鍵詞
    this.joinMonitorNewKeyword = '';
    this.joinMonitorAutoEnable.set(true);
    
    // 加載帳號配額信息
    this.loadAccountQuotas();
    
    // 如果資源已加入，預選已加入的帳號
    if (resource.joined_by_phone) {
      this.joinMonitorSelectedPhone.set(resource.joined_by_phone);
    } else {
      this.joinMonitorSelectedPhone.set('');
    }
    
    // 🔑 加載已綁定的關鍵詞集 IDs (從 monitoredGroups 中查找)
    const monitoredGroup = this.monitoredGroups().find(g => 
      g.url === resource.username || 
      g.url === `@${resource.username}` ||
      g.url === resource.telegram_id ||
      g.id === resource.id
    );
    if (monitoredGroup && monitoredGroup.keywordSetIds) {
      this.joinMonitorSelectedKeywordSetIds.set([...monitoredGroup.keywordSetIds]);
    } else {
      this.joinMonitorSelectedKeywordSetIds.set([]);
    }
    
    // 重置快速創建詞集對話框
    this.showQuickCreateKeywordSet.set(false);
    this.quickCreateKeywordSetName = '';
    this.quickCreateKeywordSetKeywords.set([]);
    this.quickCreateKeywordSetNewKeyword = '';
    
    this.showJoinMonitorDialog.set(true);
  }

  // 關閉加入並監控對話框
  closeJoinMonitorDialog() {
    this.showJoinMonitorDialog.set(false);
    this.joinMonitorResource.set(null);
    this.showChangeMonitorAccount.set(false);
  }

  // 獲取可用於監控的帳號列表
  getAvailableAccountsForMonitor(): any[] {
    return this.accounts().filter(acc => acc.status === 'Online');
  }

  // 選擇監控帳號
  selectMonitorAccount(phone: string) {
    this.joinMonitorSelectedPhone.set(phone);
    this.showChangeMonitorAccount.set(false);
  }

  // 停止監控群組（但不退出）
  stopMonitoringGroup(resource: any) {
    if (!resource) return;
    
    // 🆕 使用多種標識符
    const groupId = resource.telegram_id || resource.id || resource.username;
    if (!groupId) {
      this.toastService.error('無法識別群組');
      return;
    }
    
    // 發送停止監控請求（包含更多信息以便後端識別）
    this.ipcService.send('remove-group', { 
      groupId,
      id: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      link: resource.link || resource.invite_link
    });
    
    // 樂觀更新本地狀態
    this.updateResourceStatusLocally(resource, 'joined');
    this.closeJoinMonitorDialog();
    this.closeResourceMenu();
    this.toastService.info('正在停止監控...');
    
    // 刷新數據（延遲執行以確保後端完成）
    setTimeout(() => {
      this.loadResources();
      this.refreshResourceStats();
      this.ipcService.send('get-monitored-groups');
    }, 500);
  }

  // 確認退出群組
  confirmLeaveGroup(resource: any) {
    if (!resource) return;
    
    const title = resource.title || resource.username || '此群組';
    if (confirm(`確定要退出「${title}」嗎？\n\n此操作將：\n• 從 Telegram 退出群組\n• 停止所有監控\n• 刪除相關數據`)) {
      this.leaveGroup(resource);
    }
  }

  // 退出群組
  leaveGroup(resource: any) {
    if (!resource) return;
    
    const phone = resource.joined_by_phone || this.joinMonitorSelectedPhone();
    const groupId = resource.telegram_id || resource.username;
    
    if (!phone) {
      this.toastService.error('無法確定使用的帳號');
      return;
    }
    
    // 發送退出群組請求
    this.ipcService.send('leave-group', { 
      phone,
      groupId,
      resourceId: resource.id
    });
    
    // 更新本地狀態
    this.updateResourceStatusLocally(resource, 'discovered');
    this.closeJoinMonitorDialog();
    this.toastService.info('正在退出群組...');
    
    // 刷新數據
    setTimeout(() => {
      this.loadResources();
      this.refreshResourceStats();
      this.ipcService.send('get-monitored-groups');
    }, 1000);
  }

  // 在 Telegram 中打開資源
  openInTelegram(resource: any) {
    const link = resource.username 
      ? `https://t.me/${resource.username}`
      : resource.invite_link || resource.link;
    
    if (link) {
      window.open(link, '_blank');
    } else {
      this.toastService.warning('沒有可用的鏈接');
    }
  }

  // 刪除資源記錄
  deleteResource(resource: any) {
    if (!resource?.id) return;
    
    if (confirm(`確定要刪除「${resource.title || '此資源'}」的記錄嗎？`)) {
      this.ipcService.send('delete-resource', { resourceId: resource.id });
      
      // 從本地列表移除
      const resources = this.discoveredResources();
      this.discoveredResources.set(resources.filter(r => r.id !== resource.id));
      
      this.toastService.success('已刪除資源記錄');
      this.refreshResourceStats();
    }
  }

  // 🆕 即時更新本地資源狀態（樂觀更新）
  updateResourceStatusLocally(resource: any, newStatus: string, phone?: string, memberCount?: number) {
    if (!resource) return;
    
    const resources = this.discoveredResources();
    const identifier = resource.telegram_id || resource.username || resource.title;
    
    const updated = resources.map(r => {
      const rIdentifier = r.telegram_id || r.username || r.title;
      if (rIdentifier === identifier) {
        // 使用類型斷言來添加額外屬性
        const updatedResource: any = { 
          ...r, 
          status: newStatus,
          joined_at: new Date().toISOString()
        };
        if (phone) {
          updatedResource.joined_by_phone = phone;
        }
        // 🆕 更新成員數
        if (memberCount && memberCount > 0) {
          updatedResource.member_count = memberCount;
        }
        return updatedResource;
      }
      return r;
    });
    
    this.discoveredResources.set(updated);
    console.log(`[Frontend] Updated resource status: ${identifier} -> ${newStatus}`);
  }

  // 🆕 加入成功後的「下一步」選項 Signal
  showPostJoinDialog = signal(false);
  postJoinResource = signal<any>(null);
  postJoinPhone = signal('');

  // 🆕 成功動畫覆蓋層
  showSuccessOverlay = signal(false);
  successOverlayConfig = signal<SuccessOverlayConfig | null>(null);

  // 🆕 顯示加入成功後的「下一步」選項
  showPostJoinOptions(resource: any, phone: string, keywordSetCount: number) {
    // 關閉加入對話框
    this.showJoinMonitorDialog.set(false);
    
    // 🆕 先顯示成功動畫
    this.showSuccessAnimation({
      icon: '🚀',
      title: '加入成功！',
      subtitle: resource?.title || '群組已添加到監控',
      duration: 1200
    });
    
    // 動畫結束後顯示「下一步」對話框
    setTimeout(() => {
      // 保存資源信息以供「下一步」操作使用
      this.postJoinResource.set(resource);
      this.postJoinPhone.set(phone);
      
      // 顯示「下一步」選項對話框
      this.showPostJoinDialog.set(true);
    }, 1200);
  }

  // 🆕 關閉「下一步」對話框
  closePostJoinDialog() {
    this.showPostJoinDialog.set(false);
    this.postJoinResource.set(null);
    this.postJoinPhone.set('');
  }

  // 🆕 顯示成功動畫覆蓋層
  showSuccessAnimation(config: SuccessOverlayConfig) {
    this.successOverlayConfig.set(config);
    this.showSuccessOverlay.set(true);
    
    // 自動隱藏
    const duration = config.duration || 1500;
    setTimeout(() => {
      this.hideSuccessAnimation();
    }, duration);
  }

  // 🆕 隱藏成功動畫
  hideSuccessAnimation() {
    this.showSuccessOverlay.set(false);
    this.successOverlayConfig.set(null);
  }

  // 🆕 執行「下一步」操作：提取成員
  postJoinExtractMembers() {
    const resource = this.postJoinResource();
    if (resource) {
      this.closePostJoinDialog();
      this.openMemberListDialog(resource);
    }
  }

  // 🆕 執行「下一步」操作：發送消息
  postJoinSendMessage() {
    const resource = this.postJoinResource();
    if (resource) {
      this.closePostJoinDialog();
      this.openSingleMessageDialog(resource);
    }
  }

  // 🆕 執行「下一步」操作：繼續加入其他群組
  postJoinContinue() {
    this.closePostJoinDialog();
    this.toastService.info('繼續瀏覽其他群組', 2000);
  }

  // 加載帳號配額信息
  loadAccountQuotas() {
    const accounts = this.accounts();
    const quotasRaw = accounts
      .filter(acc => acc.status === 'Online')
      .map(acc => {
        // 計算已加入群組數（從 dailySendCount 估算）
        const joinedGroups = Math.floor(acc.dailySendCount / 10) || 0;
        const dailyLimit = 20; // 每天加群上限
        const dailyUsed = Math.floor(acc.dailySendCount / 5) || 0;
        
        // 🆕 計算綜合推薦分數（0-100）
        // 權重：健康分 50% + 配額剩餘率 50%
        const healthScore = acc.healthScore || 0;
        const quotaRemaining = dailyLimit > 0 ? ((dailyLimit - dailyUsed) / dailyLimit) * 100 : 0;
        const recommendScore = healthScore * 0.5 + quotaRemaining * 0.5;
        
        return {
          phone: acc.phone,
          nickname: acc.group || acc.phone,
          joinedGroups,
          dailyLimit,
          dailyUsed: Math.min(dailyUsed, dailyLimit),
          isRecommended: false, // 稍後設置
          recommendScore,
          healthScore
        };
      })
      .sort((a, b) => b.recommendScore - a.recommendScore); // 按推薦分數排序
    
    // 🆕 智能推薦：只推薦最佳帳號（最多 2 個，且必須滿足基本條件）
    const quotas = quotasRaw.map((q, index) => {
      // 只有前 2 名且滿足條件才顯示推薦
      const meetsBasicCriteria = q.healthScore >= 70 && q.dailyUsed < q.dailyLimit * 0.8;
      const isTopAccount = index < 2 && meetsBasicCriteria;
      return {
        ...q,
        isRecommended: isTopAccount
      };
    });
    
    this.accountQuotas.set(quotas);
    
    // 自動選擇推薦帳號
    if (!this.joinMonitorSelectedPhone()) {
      const recommended = quotas.find(q => q.isRecommended);
      if (recommended) {
        this.joinMonitorSelectedPhone.set(recommended.phone);
      } else if (quotas.length > 0) {
        this.joinMonitorSelectedPhone.set(quotas[0].phone);
      }
    }
  }

  // ==================== 關鍵詞集選擇（新版） ====================
  
  // 切換關鍵詞集選擇
  toggleKeywordSetSelection(setId: number) {
    const current = this.joinMonitorSelectedKeywordSetIds();
    
    if (current.includes(setId)) {
      // 取消選擇
      this.joinMonitorSelectedKeywordSetIds.set(current.filter(id => id !== setId));
    } else {
      // 🆕 驗證關鍵詞集是否為空
      const keywordSet = this.keywordSets().find(s => s.id === setId);
      if (keywordSet && (!keywordSet.keywords || keywordSet.keywords.length === 0)) {
        // 空關鍵詞集警告
        this.toastService.warning(`⚠️ 「${keywordSet.name}」沒有關鍵詞，請先添加關鍵詞再使用`);
        return; // 不允許選擇空關鍵詞集
      }
      this.joinMonitorSelectedKeywordSetIds.set([...current, setId]);
    }
  }
  
  // 檢查關鍵詞集是否被選中
  isKeywordSetSelected(setId: number): boolean {
    return this.joinMonitorSelectedKeywordSetIds().includes(setId);
  }
  
  // 打開快速創建關鍵詞集對話框
  openQuickCreateKeywordSet() {
    this.showQuickCreateKeywordSet.set(true);
    this.quickCreateKeywordSetName = '';
    this.quickCreateKeywordSetKeywords.set([]);
    this.quickCreateKeywordSetNewKeyword = '';
  }
  
  // 關閉快速創建關鍵詞集對話框
  closeQuickCreateKeywordSet() {
    this.showQuickCreateKeywordSet.set(false);
  }
  
  // 快速創建詞集：添加關鍵詞
  addQuickKeyword() {
    const keyword = this.quickCreateKeywordSetNewKeyword.trim();
    if (keyword && !this.quickCreateKeywordSetKeywords().includes(keyword)) {
      this.quickCreateKeywordSetKeywords.update(kws => [...kws, keyword]);
      this.quickCreateKeywordSetNewKeyword = '';
    }
  }
  
  // 快速創建詞集：移除關鍵詞
  removeQuickKeyword(keyword: string) {
    this.quickCreateKeywordSetKeywords.update(kws => kws.filter(k => k !== keyword));
  }
  
  // 快速創建詞集：添加推薦關鍵詞
  addQuickRecommendedKeyword(keyword: string) {
    if (!this.quickCreateKeywordSetKeywords().includes(keyword)) {
      this.quickCreateKeywordSetKeywords.update(kws => [...kws, keyword]);
    }
  }
  
  // 執行快速創建關鍵詞集並綁定
  executeQuickCreateKeywordSet() {
    const name = this.quickCreateKeywordSetName.trim();
    const keywords = this.quickCreateKeywordSetKeywords();
    
    if (!name) {
      this.toastService.warning('請輸入詞集名稱');
      return;
    }
    if (keywords.length === 0) {
      this.toastService.warning('請至少添加一個關鍵詞');
      return;
    }
    
    // 發送創建請求到後端
    this.ipcService.send('add-keyword-set', { name });
    
    // 監聯創建完成事件，然後添加關鍵詞並綁定
    const handler = (data: any) => {
      if (data.success && data.setId) {
        // 添加關鍵詞
        for (const keyword of keywords) {
          this.ipcService.send('add-keyword', { setId: data.setId, keyword, isRegex: false });
        }
        // 自動選中新創建的詞集
        this.joinMonitorSelectedKeywordSetIds.update(ids => [...ids, data.setId]);
        this.toastService.success(`已創建並綁定關鍵詞集「${name}」`);
        this.closeQuickCreateKeywordSet();
        
        // 刷新關鍵詞集列表
        this.ipcService.send('get-keyword-sets');
      }
      // 移除監聽器
      this.ipcService.off('keyword-set-added', handler);
    };
    this.ipcService.on('keyword-set-added', handler);
  }
  
  // ==================== 舊版散列關鍵詞（向後兼容） ====================
  
  // 添加監控關鍵詞
  addMonitorKeyword() {
    const keyword = this.joinMonitorNewKeyword.trim();
    if (keyword && !this.joinMonitorKeywords().includes(keyword)) {
      this.joinMonitorKeywords.update(kws => [...kws, keyword]);
      this.joinMonitorNewKeyword = '';
    }
  }

  // 移除監控關鍵詞
  removeMonitorKeyword(keyword: string) {
    this.joinMonitorKeywords.update(kws => kws.filter(k => k !== keyword));
  }

  // 添加推薦關鍵詞
  addRecommendedKeyword(keyword: string) {
    if (!this.joinMonitorKeywords().includes(keyword)) {
      this.joinMonitorKeywords.update(kws => [...kws, keyword]);
    }
  }

  // 獲取推薦關鍵詞（基於群組標題）
  getRecommendedKeywords(): string[] {
    const resource = this.joinMonitorResource();
    if (!resource) return [];
    
    const title = resource.title || '';
    const recommendations: string[] = [];
    
    // 基於標題的關鍵詞推薦
    if (title.includes('二手') || title.includes('交易')) {
      recommendations.push('求購', '出售', '轉讓');
    }
    if (title.includes('招聘') || title.includes('求職')) {
      recommendations.push('招人', '求職', '兼職');
    }
    if (title.includes('華人') || title.includes('海外')) {
      recommendations.push('合作', '資源', '求助');
    }
    
    // 通用推薦
    if (recommendations.length === 0) {
      recommendations.push('求購', '合作', '諮詢');
    }
    
    return recommendations.filter(r => !this.joinMonitorKeywords().includes(r));
  }

  // 獲取關鍵詞預覽文本（用於模板顯示）
  getKeywordPreview(keywords: any[]): string {
    if (!keywords || keywords.length === 0) return '';
    const preview = keywords.slice(0, 3).map(k => k.keyword || k.text || k).join(', ');
    return keywords.length > 3 ? preview + '...' : preview;
  }

  // 執行加入並監控
  executeJoinAndMonitor() {
    const resource = this.joinMonitorResource();
    const phone = this.joinMonitorSelectedPhone();
    
    if (!resource) {
      this.toastService.error('請選擇要加入的群組');
      return;
    }
    
    // 如果是未加入的群組，需要選擇帳號
    if (resource.status !== 'joined' && resource.status !== 'monitoring' && !phone) {
      this.toastService.error('請選擇加入帳號');
      return;
    }
    
    this.isJoiningResource.set(true);
    
    // 使用新版 keywordSetIds 替代舊版 keywords
    const keywordSetIds = this.joinMonitorSelectedKeywordSetIds();
    
    // 🆕 如果 resource.id === 0（搜索結果未保存），傳遞 resourceInfo
    const payload: any = {
      resourceId: resource.id || 0,
      phone: phone,
      keywordSetIds: keywordSetIds, // 新版：關鍵詞集 IDs
      keywords: this.joinMonitorKeywords(), // 保留向後兼容
      autoEnableMonitor: this.joinMonitorAutoEnable()
    };
    
    // 🆕 如果資源 ID 為 0，傳遞資源信息供後端創建
    if (!resource.id || resource.id === 0) {
      // 🔑 獲取並驗證加入方式
      let link = resource.link || resource.invite_link || '';
      let username = resource.username || '';
      
      // 🔑 過濾無效的 username（搜索機器人）
      if (username && username.toLowerCase().endsWith('bot')) {
        console.log(`[Frontend] 過濾 bot username: ${username}`);
        username = '';
      }
      
      // 🔑 過濾消息鏈接（t.me/username/messageId）
      if (link && /t\.me\/[^/]+\/\d+/.test(link)) {
        console.log(`[Frontend] 過濾消息鏈接: ${link}`);
        link = '';
      }
      
      // 🔑 驗證是否有足夠的信息加入群組
      if (!link && !username) {
        const title = resource.title || '此群組';
        this.toastService.error(
          `無法加入「${title}」：\n` +
          '• 此搜索結果沒有提供群組的邀請鏈接\n' +
          '• 請在 Telegram 中點擊搜索機器人的結果\n' +
          '• 手動獲取群組鏈接後再試'
        );
        this.isJoiningResource.set(false);
        return;
      }
      
      // 🔑 生成有效的 telegram_id（不使用 title 或 bot username）
      let validTelegramId = '';
      if (resource.telegram_id && 
          resource.telegram_id !== resource.title &&
          !resource.telegram_id.toLowerCase().endsWith('bot')) {
        validTelegramId = resource.telegram_id;
      } else if (username) {
        validTelegramId = username;
      }
      
      payload.resourceInfo = {
        username: username,
        telegram_id: validTelegramId,
        title: resource.title || username || '未命名群組',
        description: resource.description || '',
        member_count: resource.member_count || 0,
        resource_type: resource.resource_type || 'supergroup',
        // 🔑 確保 link 正確傳遞
        link: link || (username ? `https://t.me/${username}` : '')
      };
      
      console.log('[Frontend] Sending resourceInfo:', payload.resourceInfo);
    }
    
    this.ipcService.send('join-and-monitor-with-account', payload);
    
    // 如果資源已加入（只是更新監控設置），直接同步群組配置
    if (resource.status === 'joined' || resource.status === 'monitoring') {
      // 使用 add-group 更新群組的關鍵詞集綁定
      const url = resource.username ? `@${resource.username}` : resource.telegram_id;
      this.ipcService.send('add-group', { 
        url: url, 
        keywordSetIds: keywordSetIds 
      });
    }
  }

  // 打開監控設置（已加入的群組）
  openMonitorSettings(resource: any) {
    this.openJoinAndMonitorDialog(resource);
  }

  // ==================== 批量加入並監控 ====================

  // 打開批量加入並監控對話框
  openBatchJoinMonitorDialog() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇要加入的群組');
      return;
    }

    const resources = this.discoveredResources().filter(r => selectedIds.includes(r.id));
    this.batchJoinResources.set(resources);
    this.joinMonitorSelectedPhones.set([]);
    this.joinMonitorKeywords.set([]);
    this.joinMonitorSelectedKeywordSetIds.set([]); // 重置關鍵詞集選擇
    this.joinMonitorBatchMode.set(true);
    this.joinMonitorBatchInterval.set(45);
    this.loadAccountQuotas();
    this.showBatchJoinMonitorDialog.set(true);
  }

  // 計算批量加入群組的總成員數
  getBatchJoinTotalMembers(): number {
    return this.batchJoinResources().reduce((sum, r) => sum + (r.member_count || 0), 0);
  }

  // 關閉批量加入對話框
  closeBatchJoinMonitorDialog() {
    this.showBatchJoinMonitorDialog.set(false);
    this.batchJoinResources.set([]);
  }

  // 切換帳號選擇（多選）
  toggleAccountSelection(phone: string) {
    const current = this.joinMonitorSelectedPhones();
    if (current.includes(phone)) {
      this.joinMonitorSelectedPhones.set(current.filter(p => p !== phone));
    } else {
      this.joinMonitorSelectedPhones.set([...current, phone]);
    }
  }

  // 全選帳號
  selectAllAccounts() {
    const allPhones = this.accountQuotas().map(a => a.phone);
    this.joinMonitorSelectedPhones.set(allPhones);
  }

  // 執行批量加入並監控
  executeBatchJoinMonitor() {
    const resources = this.batchJoinResources();
    const phones = this.joinMonitorSelectedPhones();
    
    if (resources.length === 0) {
      this.toastService.error('沒有選擇群組');
      return;
    }
    
    if (phones.length === 0) {
      this.toastService.error('請選擇至少一個帳號');
      return;
    }
    
    this.isJoiningResource.set(true);
    this.batchJoinProgress.set({ current: 0, total: resources.length, status: '準備中...' });
    
    // 使用新版 keywordSetIds
    const keywordSetIds = this.joinMonitorSelectedKeywordSetIds();
    
    // 發送批量加入請求
    this.ipcService.send('batch-join-and-monitor', {
      resourceIds: resources.map(r => r.id),
      phones: phones,
      keywordSetIds: keywordSetIds, // 新版：關鍵詞集 IDs
      keywords: this.joinMonitorKeywords(), // 保留向後兼容
      autoEnableMonitor: this.joinMonitorAutoEnable(),
      batchMode: this.joinMonitorBatchMode(),
      batchInterval: this.joinMonitorBatchInterval()
    });
    
    this.toastService.info(`🚀 開始批量加入 ${resources.length} 個群組，使用 ${phones.length} 個帳號`);
  }

  // ==================== 成員列表對話框 ====================

  // 打開成員列表對話框
  openMemberListDialog(resource: any) {
    this.memberListResource.set(resource);
    this.memberListData.set([]);
    this.memberListLoading.set(false);
    this.memberListProgress.set({ extracted: 0, total: resource.member_count || 0, status: '' });
    this.selectedMemberIds.set([]);
    this.memberExtractStarted.set(false); // 重置提取狀態，顯示設置面板
    this.memberListFilter.set('all');
    this.memberExtractConfig.set({
      limit: 500,
      customLimit: 1000,
      backgroundMode: false,
      userTypes: {
        chinese: false,
        overseas: false,
      },
      activityFilters: {
        onlineNow: false,
        within3Days: false,
        within7Days: false,
        within30Days: false,
        longOffline: false,
      },
      accountFeatures: {
        premium: false,
        hasUsername: false,
        hasPhoto: false,
        newAccount: false,
        activeAccount: false,
        verified: false,
      },
      excludeFilters: {
        bots: true,
        scam: true,
        deleted: true,
      }
    });
    this.showMemberListDialog.set(true);
  }

  // 關閉成員列表對話框
  closeMemberListDialog() {
    this.showMemberListDialog.set(false);
    this.memberListResource.set(null);
    this.memberListData.set([]);
  }

  // 加載成員列表
  loadMemberList(resource: any) {
    if (!resource || !resource.telegram_id) {
      this.toastService.error('無效的群組信息');
      return;
    }
    
    this.memberListLoading.set(true);
    this.memberListProgress.update(p => ({ ...p, status: '正在提取成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: 200, // 首次加載 200 個
      offset: 0
    });
  }

  // 繼續提取更多成員
  extractMoreMembers() {
    const resource = this.memberListResource();
    const currentCount = this.memberListData().length;
    
    if (!resource) return;
    
    this.memberListLoading.set(true);
    this.memberListProgress.update(p => ({ ...p, status: '正在提取更多成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: 200,
      offset: currentCount
    });
  }

  // 切換成員選擇
  toggleMemberIdSelection(memberId: string) {
    const current = this.selectedMemberIds();
    if (current.includes(memberId)) {
      this.selectedMemberIds.set(current.filter(id => id !== memberId));
    } else {
      this.selectedMemberIds.set([...current, memberId]);
    }
  }

  // 全選成員
  selectAllMembers() {
    const allIds = this.memberListData().map(m => m.user_id);
    this.selectedMemberIds.set(allIds);
  }

  // 導出成員為 CSV（包含所有欄位）
  exportMembersToCSV() {
    const members = this.getFilteredMembers();
    if (members.length === 0) {
      this.toastService.warning('沒有可導出的成員');
      return;
    }

    const resource = this.memberListResource();
    const filename = `members_${resource?.username || resource?.telegram_id}_${new Date().toISOString().slice(0,10)}.csv`;

    // CSV 內容（完整欄位）
    const headers = [
      '用戶ID', '用戶名', '名字', '姓氏', '全名', '電話號碼',
      '個人簡介', '語言', 'DC', '在線狀態', '最後上線',
      '角色', '加入日期', 'Premium', '已認證', 'Bot', 
      '有頭像', '詐騙', '假帳號', '受限制', '已刪除',
      '華人', '活躍度', '價值等級', '來源群組', '提取時間'
    ];
    
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const rows = members.map(m => [
      m.user_id,
      m.username || '',
      m.first_name || '',
      m.last_name || '',
      m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim(),
      m.phone || '',
      escapeCSV(m.bio || ''),
      m.language_code || '',
      m.dc_id || '',
      m.online_status || '',
      m.last_online || '',
      m.chat_member_status || 'member',
      m.joined_date || '',
      m.is_premium ? '是' : '否',
      m.is_verified ? '是' : '否',
      m.is_bot ? '是' : '否',
      m.has_photo ? '是' : '否',
      m.is_scam ? '是' : '否',
      m.is_fake ? '是' : '否',
      m.is_restricted ? '是' : '否',
      m.is_deleted ? '是' : '否',
      this.isChineseMember(m) ? '是' : '否',
      m.activity_score ? (m.activity_score * 100).toFixed(0) + '%' : '',
      m.value_level || '',
      m.source_chat_title || '',
      m.extracted_at || ''
    ]);

    const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    this.toastService.success(`✅ 已導出 ${members.length} 個成員`);
  }

  // 設置提取數量限制
  setMemberExtractLimit(limit: number) {
    this.memberExtractConfig.update(c => ({ ...c, limit }));
  }
  
  // 🆕 應用快捷預設
  applyExtractPreset(presetId: string) {
    this.selectedPreset.set(presetId);
    const preset = this.extractPresets.find(p => p.id === presetId);
    if (!preset) return;
    
    // 重置所有篩選器
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { chinese: false, overseas: false },
      activityFilters: { onlineNow: false, within3Days: false, within7Days: false, within30Days: false, longOffline: false },
      accountFeatures: { premium: false, hasUsername: false, hasPhoto: false, newAccount: false, activeAccount: false, verified: false },
    }));
    
    // 應用預設配置
    if (preset.config.userTypes) {
      this.memberExtractConfig.update(c => ({
        ...c,
        userTypes: { ...c.userTypes, ...preset.config.userTypes }
      }));
    }
    if (preset.config.activityFilters) {
      this.memberExtractConfig.update(c => ({
        ...c,
        activityFilters: { ...c.activityFilters, ...preset.config.activityFilters }
      }));
    }
    if (preset.config.accountFeatures) {
      this.memberExtractConfig.update(c => ({
        ...c,
        accountFeatures: { ...c.accountFeatures, ...preset.config.accountFeatures }
      }));
    }
    
    this.toastService.info(`已應用「${preset.name}」預設`);
  }
  
  // 🆕 切換用戶類型篩選
  toggleUserType(type: 'chinese' | 'overseas') {
    this.selectedPreset.set(''); // 清除預設選擇
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { ...c.userTypes, [type]: !c.userTypes[type] }
    }));
  }
  
  // 🆕 切換活躍度篩選
  toggleActivityFilter(filter: 'onlineNow' | 'within3Days' | 'within7Days' | 'within30Days' | 'longOffline') {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      activityFilters: { ...c.activityFilters, [filter]: !c.activityFilters[filter] }
    }));
  }
  
  // 🆕 切換帳號特徵篩選
  toggleAccountFeature(feature: 'premium' | 'hasUsername' | 'hasPhoto' | 'newAccount' | 'activeAccount' | 'verified') {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      accountFeatures: { ...c.accountFeatures, [feature]: !c.accountFeatures[feature] }
    }));
  }
  
  // 🆕 切換排除項
  toggleExcludeFilter(filter: 'bots' | 'scam' | 'deleted') {
    this.memberExtractConfig.update(c => ({
      ...c,
      excludeFilters: { ...c.excludeFilters, [filter]: !c.excludeFilters[filter] }
    }));
  }
  
  // 🆕 獲取當前篩選條件數量
  getActiveFilterCount(): number {
    const config = this.memberExtractConfig();
    let count = 0;
    
    Object.values(config.userTypes).forEach(v => v && count++);
    Object.values(config.activityFilters).forEach(v => v && count++);
    Object.values(config.accountFeatures).forEach(v => v && count++);
    
    return count;
  }
  
  // 🆕 清除所有篩選
  clearAllFilters() {
    this.selectedPreset.set('');
    this.memberExtractConfig.update(c => ({
      ...c,
      userTypes: { chinese: false, overseas: false },
      activityFilters: { onlineNow: false, within3Days: false, within7Days: false, within30Days: false, longOffline: false },
      accountFeatures: { premium: false, hasUsername: false, hasPhoto: false, newAccount: false, activeAccount: false, verified: false },
    }));
    this.toastService.info('已清除所有篩選條件');
  }

  // 開始成員提取
  startMemberExtraction() {
    console.log('[Frontend] startMemberExtraction called');
    const resource = this.memberListResource();
    console.log('[Frontend] Resource:', resource);
    
    if (!resource) {
      console.error('[Frontend] No resource selected');
      this.toastService.error('請先選擇一個群組');
      return;
    }

    this.memberExtractStarted.set(true);
    this.memberListLoading.set(true);
    this.memberListData.set([]);
    this.extractionStartTime.set(Date.now()); // 🆕 記錄提取開始時間

    const config = this.memberExtractConfig();
    const limit = config.limit === -1 ? config.customLimit : (config.limit === 0 ? 99999 : config.limit);
    
    console.log('[Frontend] Extraction config:', { limit, config });

    this.memberListProgress.set({
      extracted: 0,
      total: resource.member_count || 0,
      status: '正在提取成員...'
    });

    const payload = {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      // 🔧 FIX: 傳遞已加入群組的帳號
      phone: resource.joined_phone || resource.joined_by_phone || null,
      limit: limit,
      offset: 0,
      filters: {
        onlineOnly: config.activityFilters.onlineNow,
        chineseOnly: config.userTypes.chinese,
        premiumOnly: config.accountFeatures.premium,
        hasUsername: config.accountFeatures.hasUsername,
        excludeBots: config.excludeFilters.bots
      }
    };
    
    console.log('[Frontend] Sending extract-members IPC:', payload);
    this.toastService.info('📤 正在發送提取請求...');
    this.ipcService.send('extract-members', payload);
    
    if (config.backgroundMode) {
      this.toastService.info('📤 成員提取已轉為後台運行');
      this.closeMemberListDialog();
    }
  }

  // 暫停成員提取
  pauseMemberExtraction() {
    this.memberListLoading.set(false);
    this.memberListProgress.update(p => ({ ...p, status: '已暫停' }));
    this.toastService.info('⏸️ 成員提取已暫停');
  }

  // 停止成員提取
  stopMemberExtraction() {
    this.memberListLoading.set(false);
    this.memberListProgress.update(p => ({ ...p, status: '已停止' }));
    this.toastService.info('⏹️ 成員提取已停止');
  }

  // 切換後台運行
  toggleMemberExtractBackground() {
    this.toastService.info('📤 成員提取已轉為後台運行，完成後會通知您');
    this.closeMemberListDialog();
  }

  // 處理成員提取錯誤
  handleMemberExtractionError(data: { 
    error?: string, 
    error_code?: string, 
    error_details?: { reason?: string, suggestion?: string, can_auto_join?: boolean, alternative?: string, attempts?: number }
  }) {
    const errorCode = data.error_code || 'UNKNOWN';
    const details = data.error_details || {};
    
    // 更新進度狀態
    this.memberListProgress.update(p => ({ ...p, status: '提取失敗' }));
    
    // 根據錯誤類型顯示不同的提示
    switch (errorCode) {
      case 'PEER_ID_INVALID':
      case 'NOT_PARTICIPANT':
      case 'CHANNEL_PRIVATE':
        // 🆕 P0 修復：區分是否已重試過
        const attempts = details.attempts || 0;
        const hasRetried = attempts > 1;
        
        if (hasRetried) {
          // 已重試多次仍失敗，可能是 Telegram 同步問題
          this.showExtractionErrorWithAction(
            '⚠️ 群組同步未完成',
            details.reason || `已嘗試 ${attempts} 次，Telegram 服務器尚未同步`,
            details.suggestion || '請等待 30 秒後再試，或重新加入群組',
            undefined  // 不提供自動加入，因為可能已經加入了
          );
        } else {
          // 首次失敗，需要先加入群組
          this.showExtractionErrorWithAction(
            '⚠️ 無法提取成員',
            details.reason || '帳號尚未加入此群組',
            details.suggestion || '請先加入群組再嘗試提取',
            details.can_auto_join ? 'join' : undefined
          );
        }
        break;
        
      case 'ADMIN_REQUIRED':
        // 需要管理員權限
        this.showExtractionErrorWithAction(
          '🔒 成員列表受限',
          details.reason || '群組設置限制了成員列表訪問',
          details.suggestion || '可嘗試監控群組消息收集活躍用戶',
          details.alternative === 'monitor_messages' ? 'monitor' : undefined
        );
        break;
        
      case 'FLOOD_WAIT':
        // 頻率限制
        this.toastService.warning(`⏳ ${data.error}\n\n${details.suggestion || '請稍後重試'}`);
        break;
        
      case 'CHANNEL_INVALID':
        // 無效群組
        this.toastService.error(`❌ ${data.error}\n\n${details.suggestion || '請刷新資源列表'}`);
        break;
        
      default:
        // 其他錯誤
        this.toastService.error(`❌ 提取失敗: ${data.error}`);
    }
  }

  // 顯示帶有操作按鈕的錯誤提示
  showExtractionErrorWithAction(title: string, reason: string, suggestion: string, action?: 'join' | 'monitor') {
    const resource = this.memberListResource();
    
    // 構建提示消息
    let message = `${title}\n\n原因：${reason}\n\n💡 ${suggestion}`;
    
    if (action === 'join' && resource) {
      // 提示用戶可以加入群組
      message += '\n\n點擊「加入群組」按鈕後重試';
      this.toastService.warning(message);
      
      // 更新狀態提示用戶操作
      this.memberListProgress.update(p => ({ 
        ...p, 
        status: '需要先加入群組' 
      }));
    } else if (action === 'monitor' && resource) {
      message += '\n\n建議：啟動消息監控來收集活躍用戶';
      this.toastService.warning(message);
      
      this.memberListProgress.update(p => ({ 
        ...p, 
        status: '建議使用消息監控' 
      }));
    } else {
      this.toastService.error(message);
    }
  }

  // 嘗試自動加入群組並重新提取
  async autoJoinAndExtract() {
    const resource = this.memberListResource();
    if (!resource) return;
    
    this.toastService.info('🚀 正在嘗試加入群組...');
    
    // 發送加入群組請求
    const firstAccount = this.accounts().find(a => a.status === 'Online');
    if (firstAccount) {
      this.ipcService.send('join-group', {
        phone: firstAccount.phone,
        groupUrl: resource.username ? `https://t.me/${resource.username}` : resource.invite_link
      });
      
      // 監聯加入結果
      this.ipcService.once('group-join-result', (result: any) => {
        if (result.success) {
          this.toastService.success('✅ 成功加入群組，正在重新提取...');
          // 延遲後重新提取
          setTimeout(() => {
            this.startMemberExtraction();
          }, 2000);
        } else {
          this.toastService.error(`❌ 加入群組失敗: ${result.error}`);
        }
      });
    } else {
      this.toastService.error('沒有可用的在線帳號');
    }
  }

  // 獲取第一個在線帳號
  getFirstOnlineAccount(): any {
    return this.accounts().find(a => a.status === 'Online');
  }

  // 🆕 計算並顯示提取結果摘要
  calculateAndShowExtractionSummary(members: any[]) {
    const resource = this.memberListResource();
    const startTime = this.extractionStartTime();
    const duration = startTime > 0 ? Math.round((Date.now() - startTime) / 1000) : 0;
    
    // 計算各類統計
    let onlineCount = 0;
    let recentlyCount = 0;
    let premiumCount = 0;
    let chineseCount = 0;
    let hasUsernameCount = 0;
    let botCount = 0;
    const valueLevelDistribution = { S: 0, A: 0, B: 0, C: 0, D: 0 };
    
    for (const member of members) {
      // 在線狀態
      if (member.online_status === 'online') {
        onlineCount++;
      } else if (member.online_status === 'recently') {
        recentlyCount++;
      }
      
      // Premium
      if (member.is_premium) {
        premiumCount++;
      }
      
      // 華人判斷
      if (this.isChineseMember(member)) {
        chineseCount++;
      }
      
      // 有用戶名
      if (member.username) {
        hasUsernameCount++;
      }
      
      // Bot
      if (member.is_bot) {
        botCount++;
      }
      
      // 價值評級分布
      const level = member.value_level || this.calculateMemberValueLevel(member);
      if (level && valueLevelDistribution.hasOwnProperty(level)) {
        valueLevelDistribution[level as keyof typeof valueLevelDistribution]++;
      }
    }
    
    // 設置摘要數據
    this.extractionSummary.set({
      groupName: resource?.title || resource?.name || '未知群組',
      groupUrl: resource?.username ? `t.me/${resource.username}` : (resource?.url || ''),
      totalExtracted: members.length,
      totalInGroup: resource?.member_count || 0,
      onlineCount,
      recentlyCount,
      premiumCount,
      chineseCount,
      hasUsernameCount,
      botCount,
      valueLevelDistribution,
      extractedAt: new Date().toLocaleString('zh-TW'),
      duration
    });
    
    // 顯示摘要對話框
    this.showExtractionSummaryDialog.set(true);
    
    // 同時顯示 toast 通知
    this.toastService.success(`✅ 成功提取 ${members.length} 個成員`);
  }
  
  // 🆕 計算成員價值評級
  calculateMemberValueLevel(member: any): string {
    let score = 0;
    
    // Premium 用戶加分
    if (member.is_premium) score += 30;
    
    // 活躍度加分
    if (member.online_status === 'online') score += 25;
    else if (member.online_status === 'recently') score += 20;
    else if (member.online_status === 'last_week') score += 10;
    
    // 有用戶名加分
    if (member.username) score += 15;
    
    // 華人用戶加分（本地化營銷更有效）
    if (this.isChineseMember(member)) score += 10;
    
    // Bot 減分
    if (member.is_bot) score -= 50;
    
    // 活躍分數加成
    if (member.activity_score) {
      score += Math.min(member.activity_score, 20);
    }
    
    // 評級
    if (score >= 70) return 'S';
    if (score >= 50) return 'A';
    if (score >= 30) return 'B';
    if (score >= 10) return 'C';
    return 'D';
  }
  
  // 🆕 關閉提取結果摘要對話框
  closeExtractionSummaryDialog() {
    this.showExtractionSummaryDialog.set(false);
  }
  
  // 🆕 從摘要頁面跳轉到成員資料庫
  goToMemberDatabaseFromSummary() {
    this.closeExtractionSummaryDialog();
    this.closeMemberListDialog();
    this.currentView.set('member-database');
  }
  
  // 🆕 從摘要頁面發起批量營銷
  startBatchMarketingFromSummary() {
    this.closeExtractionSummaryDialog();
    // 保持成員列表對話框開啟，用戶可以選擇成員
    this.toastService.info('💡 請在成員列表中選擇要營銷的用戶，然後點擊「批量發送」');
  }
  
  // 🆕 獲取價值等級的百分比
  getValueLevelPercent(level: string): number {
    const summary = this.extractionSummary();
    const total = summary.totalExtracted;
    if (total === 0) return 0;
    const count = summary.valueLevelDistribution[level as keyof typeof summary.valueLevelDistribution] || 0;
    return Math.round((count / total) * 100);
  }

  // 設置成員列表篩選
  setMemberFilter(filter: string) {
    this.memberListFilter.set(filter);
  }

  // 獲取篩選後的成員列表
  getFilteredMembers() {
    const members = this.memberListData();
    const filter = this.memberListFilter();
    
    switch (filter) {
      case 'chinese':
        return members.filter(m => this.isChineseMember(m));
      case 'online':
        return members.filter(m => m.online_status === 'online' || m.online_status === 'recently');
      case 'premium':
        return members.filter(m => m.is_premium);
      case 'hasUsername':
        return members.filter(m => !!m.username);
      default:
        return members;
    }
  }

  // 判斷是否為華人用戶（中文字符檢測）
  isChineseMember(member: any): boolean {
    const chineseRegex = /[\u4e00-\u9fa5]/;
    const name = (member.first_name || '') + (member.last_name || '');
    return chineseRegex.test(name);
  }

  // 獲取華人成員數量
  getChineseMemberCount(): number {
    return this.memberListData().filter(m => this.isChineseMember(m)).length;
  }

  // 獲取在線成員數量
  getOnlineMemberCount(): number {
    return this.memberListData().filter(m => m.online_status === 'online' || m.online_status === 'recently').length;
  }

  // 獲取 Premium 成員數量
  getPremiumMemberCount(): number {
    return this.memberListData().filter(m => m.is_premium).length;
  }

  // 獲取提取進度百分比
  getMemberExtractPercent(): number {
    const progress = this.memberListProgress();
    if (progress.total === 0) return 0;
    return Math.min(100, Math.round((this.memberListData().length / progress.total) * 100));
  }

  // 是否全選成員
  isAllMembersSelected(): boolean {
    const filtered = this.getFilteredMembers();
    return filtered.length > 0 && filtered.every(m => this.selectedMemberIds().includes(m.user_id));
  }

  // 切換全選成員（成員列表對話框用）
  toggleSelectAllMembersList() {
    const filtered = this.getFilteredMembers();
    if (this.isAllMembersSelected()) {
      this.selectedMemberIds.set([]);
    } else {
      this.selectedMemberIds.set(filtered.map(m => m.user_id));
    }
  }

  // 發送私信
  sendPrivateMessage(member: any) {
    if (!member.username) {
      this.toastService.warning('該用戶沒有用戶名，無法發送私信');
      return;
    }
    this.toastService.info(`📨 準備發送私信給 @${member.username}`);
    // TODO: 打開私信對話框
  }

  // 批量發送私信
  batchSendPrivateMessage() {
    const count = this.selectedMemberIds().length;
    this.toastService.info(`📨 準備批量發送私信給 ${count} 個成員`);
    // TODO: 打開批量私信對話框
  }

  // 批量添加好友
  batchAddFriend() {
    const count = this.selectedMemberIds().length;
    this.toastService.info(`➕ 準備批量添加 ${count} 個好友`);
    // TODO: 實現批量加好友邏輯
  }
  
  // 🆕 將成員加入營銷漏斗
  addMemberToFunnel(member: any) {
    // 創建 Lead 數據
    const leadData = {
      userId: member.user_id,
      username: member.username || '',
      firstName: member.first_name || '',
      lastName: member.last_name || '',
      sourceGroup: this.memberListResource()?.title || '',
      triggeredKeyword: '手動添加',
      onlineStatus: member.online_status || 'unknown'
    };
    
    // 發送創建 Lead 請求
    this.ipcService.send('add-lead', leadData);
    this.toastService.success(`🎯 已將 ${member.first_name || member.username || 'ID:' + member.user_id} 加入營銷漏斗`);
  }
  
  // 🆕 批量加入漏斗
  batchAddToFunnel() {
    const selectedIds = this.selectedMemberIds();
    const members = this.memberListData().filter(m => selectedIds.includes(m.user_id));
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    let count = 0;
    for (const member of members) {
      const leadData = {
        userId: member.user_id,
        username: member.username || '',
        firstName: member.first_name || '',
        lastName: member.last_name || '',
        sourceGroup: this.memberListResource()?.title || '',
        triggeredKeyword: '批量添加',
        onlineStatus: member.online_status || 'unknown'
      };
      this.ipcService.send('add-lead', leadData);
      count++;
    }
    
    this.toastService.success(`🎯 已將 ${count} 個成員加入營銷漏斗`);
    this.clearMemberSelection();
  }
  
  // 🆕 清除成員選擇
  clearMemberSelection() {
    this.selectedMemberIds.set([]);
  }
  
  // 🆕 導出選中的成員
  exportSelectedMembersToCSV() {
    const selectedIds = this.selectedMemberIds();
    const members = this.memberListData().filter(m => selectedIds.includes(m.user_id));
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    const headers = ['用戶ID', '用戶名', '名字', '姓氏', '評級', '在線狀態', 'Premium', '來源群組'];
    const rows = members.map(m => [
      m.user_id,
      m.username || '',
      m.first_name || '',
      m.last_name || '',
      this.calculateMemberValueLevel(m),
      m.online_status || 'unknown',
      m.is_premium ? '是' : '否',
      this.memberListResource()?.title || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `selected-members-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.toastService.success(`📥 已導出 ${members.length} 個成員`);
  }
  
  // 🆕 選擇高價值成員（S/A 級）
  selectHighValueMembers() {
    const members = this.memberListData();
    const highValueIds = members
      .filter(m => {
        const level = this.calculateMemberValueLevel(m);
        return level === 'S' || level === 'A';
      })
      .map(m => m.user_id);
    
    this.selectedMemberIds.set(highValueIds);
    this.toastService.info(`✓ 已選擇 ${highValueIds.length} 個 S/A 級成員`);
  }
  
  // 🆕 選擇在線成員
  selectOnlineMembers() {
    const members = this.memberListData();
    const onlineIds = members
      .filter(m => m.online_status === 'online' || m.online_status === 'recently')
      .map(m => m.user_id);
    
    this.selectedMemberIds.set(onlineIds);
    this.toastService.info(`✓ 已選擇 ${onlineIds.length} 個在線/最近活躍成員`);
  }
  
  // 🆕 選擇所有成員
  selectAllMembersInList() {
    const filtered = this.getFilteredMembers();
    this.selectedMemberIds.set(filtered.map(m => m.user_id));
    this.toastService.info(`✓ 已選擇 ${filtered.length} 個成員`);
  }

  // 批量提取成員（多個群組）
  openBatchMemberExtractDialog() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇群組');
      return;
    }
    
    this.toastService.info(`🚀 開始批量提取 ${selectedIds.length} 個群組的成員`);
    
    // 發送批量提取請求
    this.ipcService.send('batch-extract-members', {
      resourceIds: selectedIds,
      limit: 100, // 每個群組提取 100 個
      safeMode: true // 安全模式：分批分時提取
    });
  }

  // ==================== 單個群組發消息 ====================

  // 打開單個群組發消息對話框
  openSingleMessageDialog(resource: any) {
    this.singleMessageResource.set(resource);
    this.singleMessageContent = '';
    this.singleMessageScheduled.set(false);
    this.singleMessageScheduleTime = '';
    this.singleMessageAccountId.set('');
    this.loadAccountQuotas();
    this.showSingleMessageDialog.set(true);
  }

  // 關閉單個群組發消息對話框
  closeSingleMessageDialog() {
    this.showSingleMessageDialog.set(false);
    this.singleMessageResource.set(null);
  }

  // 發送單個群組消息
  executeSingleMessage() {
    const resource = this.singleMessageResource();
    const content = this.singleMessageContent.trim();
    
    if (!resource) {
      this.toastService.error('無效的群組');
      return;
    }
    
    if (!content) {
      this.toastService.error('請輸入消息內容');
      return;
    }
    
    const accountId = this.singleMessageAccountId();
    if (!accountId) {
      this.toastService.error('請選擇發送帳號');
      return;
    }
    
    if (this.singleMessageScheduled() && this.singleMessageScheduleTime) {
      // 定時發送
      this.ipcService.send('schedule-message', {
        resourceId: resource.id,
        telegramId: resource.telegram_id,
        content: content,
        accountPhone: accountId,
        scheduledTime: this.singleMessageScheduleTime
      });
      this.toastService.success(`⏰ 消息已排程，將於 ${this.singleMessageScheduleTime} 發送`);
    } else {
      // 立即發送
      this.ipcService.send('send-group-message', {
        resourceId: resource.id,
        telegramId: resource.telegram_id,
        content: content,
        accountPhone: accountId
      });
      this.toastService.info('📨 正在發送消息...');
    }
    
    this.closeSingleMessageDialog();
  }

  // 刷新全部資源數據
  refreshAllResources() {
    this.isRefreshing.set(true);
    this.toastService.info('正在刷新資源數據...');
    
    // 刷新統計和列表
    this.refreshResourceStats();
    this.loadResources();
    this.loadDiscoveryKeywords();
    
    // 2秒後重置刷新狀態
    setTimeout(() => {
      this.isRefreshing.set(false);
      this.toastService.success('刷新完成');
    }, 2000);
  }
  
  // 清空搜索結果（清空前端顯示 + 刪除數據庫中的所有資源）
  clearSearchResults() {
    const resourceCount = this.discoveredResources().length;
    if (resourceCount === 0) {
      this.toastService.warning('沒有可清空的資源');
      return;
    }
    
    // 確認刪除
    if (!confirm(`確定要清空所有 ${resourceCount} 條搜索結果嗎？\n\n此操作將刪除數據庫中的所有資源記錄，不可恢復。`)) {
      return;
    }
    
    // 🔧 修復：使用 NgZone.run 確保在 Angular zone 內執行更新
    // confirm() 對話框會阻斷 Angular zone，導致後續更新無法觸發變更檢測
    this.ngZone.run(() => {
      // 調用後端清空所有資源
      this.ipcService.send('clear-all-resources', {});
      
      // 清空前端顯示
      this.discoveredResources.set([]);
      this.selectedResourceIds.set([]);
      
      // 更新統計
      this.refreshResourceStats();
      
      // 強制觸發變更檢測，確保輸入框可用
      this.cdr.detectChanges();
    });
  }
  
  // 刪除所有未處理的資源（從數據庫）
  deleteAllDiscoveredResources() {
    const discoveredIds = this.discoveredResources()
      .filter(r => r.status === 'discovered')
      .map(r => r.id);
    
    if (discoveredIds.length === 0) {
      this.toastService.info('沒有可刪除的未處理資源');
      return;
    }
    
    if (confirm('確定要刪除所有未處理的資源嗎？此操作不可恢復。')) {
      this.ipcService.send('delete-resources-batch', { resourceIds: discoveredIds });
      this.toastService.success(`🗑️ 已刪除 ${discoveredIds.length} 個資源`);
      setTimeout(() => this.loadResources(), 500);
    }
  }
  
  /**
   * 清空當前搜索結果（僅前端）
   */
  clearDiscoveredResources() {
    this.discoveredResources.set([]);
    this.selectedResourceIds.set([]);
    this.currentSearchSessionId.set('');
    this.currentSearchKeyword.set('');
    this.toastService.info('已清空當前搜索結果');
  }
  
  /**
   * 🆕 一鍵清理歷史數據
   */
  clearHistoryData(type: 'all' | 'old_data' | 'search_history' = 'all') {
    const typeNames = {
      'all': '所有資源數據',
      'old_data': '舊數據',
      'search_history': '搜索歷史（保留收藏）'
    };
    
    if (confirm(`確定要清理 ${typeNames[type]} 嗎？此操作不可恢復。`)) {
      this.toastService.info('🧹 正在清理...');
      this.ipcService.send('clear-resources', { 
        type,
        daysToKeep: type === 'old_data' ? 7 : 0
      });
    }
  }
  
  /**
   * 清空所有搜索歷史（前端 + 數據庫）
   */
  clearAllSearchHistory() {
    if (confirm('確定要清空所有搜索歷史嗎？此操作會刪除數據庫中的所有搜索結果。')) {
      this.ipcService.send('clear-all-resources', {});
      this.discoveredResources.set([]);
      this.selectedResourceIds.set([]);
      this.searchHistoryKeywords.set([]);
      this.currentSearchSessionId.set('');
      this.currentSearchKeyword.set('');
      this.showSearchHistory.set(false);
      this.toastService.success('已清空所有搜索歷史');
    }
  }
  
  /**
   * 切換顯示模式（當前搜索 / 歷史記錄）
   */
  toggleSearchHistoryMode() {
    const showHistory = !this.showSearchHistory();
    this.showSearchHistory.set(showHistory);
    
    if (showHistory) {
      // 顯示歷史：從數據庫載入所有資源
      this.loadResources();
      this.toastService.info('正在載入歷史搜索結果...');
    } else {
      // 顯示當前：清空列表（需要重新搜索）
      if (!this.currentSearchKeyword()) {
        this.discoveredResources.set([]);
      }
    }
  }
  
  /**
   * 從歷史記錄中搜索
   */
  searchFromHistory(keyword: string) {
    this.resourceSearchQuery = keyword;
    this.showSearchHistory.set(false);
    this.searchResources();
  }
  
  /**
   * 🆕 處理搜索發現組件的搜索事件
   */
  handleSearchDiscoverySearch(event: { query: string; sources: string[] }) {
    this.resourceSearchQuery = event.query;
    this.selectedSearchSources.set(event.sources);
    this.searchResources();
  }
  
  /**
   * 🆕 處理搜索發現組件的帳號選擇事件
   */
  handleSearchDiscoverySelectAccount(account: { id: number; phone: string; status: string }) {
    this.selectResourceAccount(account.id);
  }
  
  /**
   * 🆕 处理引导组件的导航事件
   */
  handleOnboardingNavigate(target: string): void {
    console.log('[Onboarding] 导航到:', target);
    this.changeView(target as any);
  }
  
  /**
   * 🆕 打开新手引导
   */
  openOnboarding(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.open();
    }
  }
  
  /**
   * 🆕 重置新手引导（清除历史记录）
   */
  resetOnboarding(): void {
    if (this.onboardingComponent) {
      this.onboardingComponent.reset();
      this.onboardingComponent.open();
    }
  }
  
  /**
   * 🆕 C方案：收藏資源（保存到數據庫）
   */
  saveResource(resource: any) {
    if (!resource.telegram_id) {
      this.toastService.error('無法收藏：缺少資源 ID');
      return;
    }
    
    // 發送保存請求到後端
    this.ipcService.send('save-resource', {
      telegram_id: resource.telegram_id,
      username: resource.username,
      title: resource.title,
      description: resource.description,
      member_count: resource.member_count,
      resource_type: resource.resource_type,
      overall_score: resource.overall_score,
      discovery_keyword: this.currentSearchKeyword()
    });
    
    // 更新本地狀態
    const saved = new Set(this.savedResources());
    saved.add(resource.telegram_id);
    this.savedResources.set(saved);
    
    // 更新資源的 is_saved 標記
    const resources = this.discoveredResources();
    const updated = resources.map(r => 
      r.telegram_id === resource.telegram_id ? { ...r, is_saved: true } : r
    );
    this.discoveredResources.set(updated);
    
    this.toastService.success(`⭐ 已收藏「${resource.title}」`);
  }
  
  /**
   * 🆕 C方案：取消收藏
   */
  unsaveResource(resource: any) {
    if (!resource.telegram_id) return;
    
    // 發送刪除請求到後端
    this.ipcService.send('unsave-resource', {
      telegram_id: resource.telegram_id
    });
    
    // 更新本地狀態
    const saved = new Set(this.savedResources());
    saved.delete(resource.telegram_id);
    this.savedResources.set(saved);
    
    // 更新資源的 is_saved 標記
    const resources = this.discoveredResources();
    const updated = resources.map(r => 
      r.telegram_id === resource.telegram_id ? { ...r, is_saved: false } : r
    );
    this.discoveredResources.set(updated);
    
    this.toastService.info(`已取消收藏「${resource.title}」`);
  }
  
  /**
   * 🆕 C方案：批量收藏選中的資源
   */
  batchSaveResources() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.warning('請先選擇要收藏的資源');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => 
      selectedIds.includes(r.id) || selectedIds.some(id => String(id) === r.telegram_id)
    );
    
    resources.forEach(r => this.saveResource(r));
    this.toastService.success(`⭐ 已收藏 ${resources.length} 個資源`);
  }
  
  /**
   * 🆕 C方案：檢查資源是否已收藏
   */
  isResourceSaved(resource: any): boolean {
    return resource.is_saved || this.savedResources().has(resource.telegram_id);
  }
  
  /**
   * 同步聯繫人數據
   */
  syncContactsData() {
    this.contactsService.syncFromSources();
    this.toastService.info('正在同步數據...', 2000);
  }
  
  // 加入群組並添加到監控
  joinAndMonitor(resourceId: number) {
    const resource = this.discoveredResources().find(r => r.id === resourceId);
    if (!resource) {
      this.toastService.error('找不到該資源');
      return;
    }
    
    this.toastService.info(`正在加入並監控: ${resource.title}`);
    
    // 發送加入並監控的請求
    this.ipcService.send('join-and-monitor-resource', {
      resourceId: resourceId,
      username: resource.username,
      telegramId: resource.telegram_id,
      title: resource.title
    });
  }
  
  // 批量加入並監控
  batchJoinAndMonitor() {
    const selectedIds = this.selectedResourceIds();
    if (selectedIds.length === 0) {
      this.toastService.error('請先選擇要加入的群組');
      return;
    }
    
    this.toastService.info(`正在批量加入並監控 ${selectedIds.length} 個群組...`);
    
    this.ipcService.send('batch-join-and-monitor', {
      resourceIds: selectedIds
    });
  }
  
  // 加載搜索關鍵詞
  loadDiscoveryKeywords() {
    this.ipcService.send('get-discovery-keywords', {});
  }
  
  // 添加搜索關鍵詞
  addDiscoveryKeyword() {
    if (!this.newResourceKeyword.trim()) {
      this.toastService.error('請輸入關鍵詞');
      return;
    }
    
    this.ipcService.send('add-discovery-keyword', {
      keyword: this.newResourceKeyword.trim(),
      category: 'general',
      priority: 5
    });
  }
  
  // 使用關鍵詞搜索
  searchWithKeyword(keyword: string) {
    this.resourceSearchQuery = keyword;
    this.searchResources();
  }
  
  // 切換資源選擇
  toggleResourceSelection(resourceId: number) {
    const current = this.selectedResourceIds();
    if (current.includes(resourceId)) {
      this.selectedResourceIds.set(current.filter(id => id !== resourceId));
    } else {
      this.selectedResourceIds.set([...current, resourceId]);
    }
  }
  
  // 全選/取消全選
  toggleSelectAllResources() {
    const resources = this.discoveredResources();
    const currentSelected = this.selectedResourceIds();
    
    if (currentSelected.length === resources.length) {
      this.selectedResourceIds.set([]);
    } else {
      this.selectedResourceIds.set(resources.map(r => r.id));
    }
  }
  
  // 添加選中資源到加入隊列
  addSelectedToJoinQueue() {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇資源');
      return;
    }
    
    this.ipcService.send('add-to-join-queue', {
      resourceIds: ids,
      priority: 5
    });
  }
  
  // 處理加入隊列
  processJoinQueue() {
    this.isProcessingJoinQueue.set(true);
    this.ipcService.send('process-join-queue', {
      limit: 5
    });
  }
  
  // 批量加入選中資源
  // 🔍 多渠道選擇方法（新增）
  toggleSearchSource(source: string): void {
    const current = this.selectedSearchSources();
    if (current.includes(source)) {
      this.selectedSearchSources.set(current.filter(s => s !== source));
    } else {
      this.selectedSearchSources.set([...current, source]);
    }
  }
  
  selectAllSearchSources(): void {
    this.selectedSearchSources.set(['telegram', 'jiso', 'tgstat', 'local']);
  }
  
  // 👥 進入群組（新增）
  enterGroup(resource: any): void {
    // 跳轉到成員提取頁面，使用群組搜索組件
    this.changeView('resources');
    // TODO: 觸發成員提取服務
    this.toastService.info(`準備進入群組：${resource.title}`);
  }
  
  batchEnterGroups(): void {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇群組');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => ids.includes(r.id));
    this.toastService.info(`準備進入 ${resources.length} 個群組查看成員`);
    // TODO: 實現批量進入群組邏輯
  }
  
  // 📨 批量群發（新增）
  sendGroupMessage(resource: any): void {
    this.selectedResourceIds.set([resource.id]);
    this.showBatchMessageDialog.set(true);
  }
  
  executeBatchMessage(): void {
    const ids = this.selectedResourceIds();
    if (ids.length === 0 || !this.batchMessageContent.trim()) {
      this.toastService.error('請選擇群組並輸入消息內容');
      return;
    }
    
    const resources = this.discoveredResources().filter(r => ids.includes(r.id));
    this.toastService.success(`開始向 ${resources.length} 個群組發送消息`);
    this.showBatchMessageDialog.set(false);
    // TODO: 調用批量發送 API
  }
  
  // ➕ 批量拉群（新增）
  inviteMembersToGroup(resource: any): void {
    this.selectedResourceIds.set([resource.id]);
    this.loadAvailableMembers();
    this.showBatchInviteDialog.set(true);
  }
  
  executeBatchInvite(): void {
    const groupIds = this.selectedResourceIds();
    const memberIds = this.batchInviteConfig.selectedMemberIds;
    
    if (groupIds.length === 0 || memberIds.length === 0) {
      this.toastService.error('請選擇群組和成員');
      return;
    }
    
    this.toastService.success(`開始邀請 ${memberIds.length} 位成員加入 ${groupIds.length} 個群組`);
    this.showBatchInviteDialog.set(false);
    // TODO: 調用批量邀請 API
  }
  
  loadAvailableMembers(): void {
    // 從成員提取服務或數據庫加載可用成員
    this.availableMembersForInvite.set([
      { id: '1', name: '示例成員1', username: 'member1' },
      { id: '2', name: '示例成員2', username: 'member2' }
    ]);
  }
  
  toggleSelectAllMembers(event: any): void {
    const checked = event.target.checked;
    if (checked) {
      this.batchInviteConfig.selectedMemberIds = this.availableMembersForInvite().map(m => m.id);
      this.batchInviteConfig.selectAll = true;
    } else {
      this.batchInviteConfig.selectedMemberIds = [];
      this.batchInviteConfig.selectAll = false;
    }
  }
  
  toggleMemberSelection(memberId: string, event: any): void {
    const checked = event.target.checked;
    const current = this.batchInviteConfig.selectedMemberIds;
    if (checked) {
      this.batchInviteConfig.selectedMemberIds = [...current, memberId];
    } else {
      this.batchInviteConfig.selectedMemberIds = current.filter(id => id !== memberId);
    }
    this.batchInviteConfig.selectAll = 
      this.batchInviteConfig.selectedMemberIds.length === this.availableMembersForInvite().length;
  }
  
  batchJoinSelected() {
    const ids = this.selectedResourceIds();
    if (ids.length === 0) {
      this.toastService.error('請先選擇資源');
      return;
    }
    
    this.ipcService.send('batch-join-resources', {
      resourceIds: ids,
      delayMin: 30,
      delayMax: 60
    });
  }
  
  // 📋 資源操作菜單控制
  toggleResourceMenu(resourceId: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (this.openResourceMenuId() === resourceId) {
      this.openResourceMenuId.set(null);
    } else {
      this.openResourceMenuId.set(resourceId);
    }
  }

  closeResourceMenu() {
    this.openResourceMenuId.set(null);
  }
  
  // 獲取狀態顏色
  getResourceStatusColor(status: string): string {
    const colors: {[key: string]: string} = {
      'discovered': 'bg-blue-500',
      'queued': 'bg-yellow-500',
      'joining': 'bg-orange-500',
      'joined': 'bg-green-500',
      'monitoring': 'bg-emerald-500',
      'left': 'bg-gray-500',
      'blocked': 'bg-red-500',
      'invalid': 'bg-slate-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  // 基於成員數獲取規模等級 (S/A/B/C/D)
  getSizeGrade(memberCount: number): { grade: string; color: string; bgColor: string; label: string } {
    if (memberCount >= 100000) {
      return { grade: 'S', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/50', label: '超大型' };
    } else if (memberCount >= 10000) {
      return { grade: 'A', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50', label: '大型' };
    } else if (memberCount >= 1000) {
      return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50', label: '中型' };
    } else if (memberCount >= 100) {
      return { grade: 'C', color: 'text-slate-400', bgColor: 'bg-slate-500/20 border-slate-500/50', label: '小型' };
    } else {
      return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50', label: '微型' };
    }
  }

  // 舊方法保留相容性
  getScoreGrade(score: number): { grade: string; color: string; bgColor: string; icon: string } {
    const percent = score * 100;
    if (percent >= 90) {
      return { grade: 'S', color: 'text-amber-400', bgColor: 'bg-amber-500/20 border-amber-500/50', icon: '🏆' };
    } else if (percent >= 75) {
      return { grade: 'A', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/50', icon: '⭐' };
    } else if (percent >= 60) {
      return { grade: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/50', icon: '👍' };
    } else if (percent >= 40) {
      return { grade: 'C', color: 'text-slate-400', bgColor: 'bg-slate-500/20 border-slate-500/50', icon: '👌' };
    } else {
      return { grade: 'D', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/50', icon: '⚠️' };
    }
  }

  // 獲取評分進度條顏色
  getScoreBarColor(score: number): string {
    const percent = score * 100;
    if (percent >= 90) return 'bg-amber-400';
    if (percent >= 75) return 'bg-green-400';
    if (percent >= 60) return 'bg-blue-400';
    if (percent >= 40) return 'bg-slate-400';
    return 'bg-red-400';
  }
  
  // 獲取狀態顯示名稱
  getResourceStatusName(status: string): string {
    const names: {[key: string]: string} = {
      'discovered': '已發現',
      'queued': '隊列中',
      'joining': '加入中',
      'joined': '已加入',
      'monitoring': '監控中',
      'left': '已退出',
      'blocked': '被封禁',
      'invalid': '無效'
    };
    return names[status] || status;
  }
  
  // 獲取類型顯示名稱
  getResourceTypeName(type: string): string {
    const names: {[key: string]: string} = {
      'group': '群組',
      'supergroup': '超級群組',
      'channel': '頻道',
      'bot': '機器人'
    };
    return names[type] || type;
  }
  
  // 獲取資源類型圖標和樣式
  getResourceTypeStyle(type: string): { icon: string; label: string; bgClass: string; textClass: string; canMessage: boolean; canExtract: boolean } {
    const styles: {[key: string]: { icon: string; label: string; bgClass: string; textClass: string; canMessage: boolean; canExtract: boolean }} = {
      'channel': { icon: '📢', label: '頻道', bgClass: 'bg-purple-500/20', textClass: 'text-purple-400', canMessage: false, canExtract: false },
      'supergroup': { icon: '👥', label: '超級群組', bgClass: 'bg-blue-500/20', textClass: 'text-blue-400', canMessage: true, canExtract: true },
      'group': { icon: '💬', label: '群組', bgClass: 'bg-green-500/20', textClass: 'text-green-400', canMessage: true, canExtract: true },
      'bot': { icon: '🤖', label: '機器人', bgClass: 'bg-orange-500/20', textClass: 'text-orange-400', canMessage: true, canExtract: false }
    };
    return styles[type] || { icon: '📌', label: '未知', bgClass: 'bg-slate-500/20', textClass: 'text-slate-400', canMessage: false, canExtract: false };
  }

  // 判斷資源是否為頻道
  isChannel(resource: any): boolean {
    return resource?.resource_type === 'channel';
  }

  // 判斷資源是否可以發送消息（用於資源發現頁面）
  canSendMessageToResource(resource: any): boolean {
    // 頻道不能發送消息
    if (this.isChannel(resource)) return false;
    // TODO: 後續可添加禁言群組檢測
    return true;
  }

  // 判斷資源是否可以提取成員
  canExtractMembers(resource: any): boolean {
    // 頻道不能提取成員
    if (this.isChannel(resource)) return false;
    return true;
  }

  // 顯示頻道無法提取成員的警告
  showChannelMemberWarning() {
    this.toastService.warning('📢 頻道無法提取成員列表\n\nTelegram 不允許查看頻道的訂閱者列表。\n\n💡 建議：尋找該頻道的關聯討論群組');
  }

  // 顯示頻道無法發送消息的警告
  showChannelMessageWarning() {
    this.toastService.warning('📢 頻道無法發送消息\n\n只有頻道管理員可以發布內容。\n\n💡 建議：關注頻道獲取資訊，或尋找討論群組');
  }

  // 驗證資源類型（通過 Telegram API）
  verifyResourceType(resource: any) {
    if (!resource?.id) {
      this.toastService.error('無效的資源');
      return;
    }
    this.toastService.info(`🔍 正在驗證: ${resource.title || resource.username}...`);
    this.ipcService.send('verify-resource-type', { resourceId: resource.id });
  }

  // 獲取資源的權限狀態描述
  getResourcePermissionStatus(resource: any): { icon: string; text: string; class: string } {
    if (this.isChannel(resource)) {
      return { icon: '📢', text: '僅訂閱', class: 'text-purple-400' };
    }
    // TODO: 檢測禁言群組
    return { icon: '✅', text: '可互動', class: 'text-green-400' };
  }

  // 獲取選中的頻道數量
  getSelectedChannelCount(): number {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type === 'channel').length;
  }

  // 獲取選中的群組數量（非頻道）
  getSelectedGroupCount(): number {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel').length;
  }

  // 獲取可發消息的選中資源
  getSelectedMessageableResources(): any[] {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel');
  }

  // 獲取可提取成員的選中資源
  getSelectedExtractableResources(): any[] {
    const selectedIds = this.selectedResourceIds();
    const resources = this.discoveredResources();
    return resources.filter(r => selectedIds.includes(r.id) && r.resource_type !== 'channel');
  }

  // 打開批量群發（自動過濾頻道）
  openBatchMessageWithFilter() {
    const channels = this.getSelectedChannelCount();
    if (channels > 0) {
      this.toastService.info(`📢 已自動排除 ${channels} 個頻道，將對 ${this.getSelectedGroupCount()} 個群組發送消息`);
    }
    this.showBatchMessageDialog.set(true);
  }

  // ==================== Discussion Watcher Methods ====================
  
  // 初始化討論組監控
  initDiscussionWatcher() {
    this.ipcService.send('init-discussion-watcher', {});
  }
  
  // 發現頻道的討論組
  discoverDiscussion() {
    if (!this.discoverChannelId.trim()) {
      this.toastService.error('請輸入頻道 ID 或 username');
      return;
    }
    this.ipcService.send('discover-discussion', {
      channelId: this.discoverChannelId.trim()
    });
    this.discoverChannelId = '';
  }
  
  // 從已發現的資源中發現討論組
  discoverDiscussionsFromResources() {
    this.ipcService.send('discover-discussions-from-resources', {});
  }
  
  // 加載頻道-討論組列表
  loadChannelDiscussions() {
    this.ipcService.send('get-channel-discussions', { activeOnly: true });
  }
  
  // 刷新討論組統計
  refreshDiscussionStats() {
    this.ipcService.send('get-discussion-stats', {});
  }
  
  // 開始監控討論組
  startDiscussionMonitoring(discussionId: string) {
    this.ipcService.send('start-discussion-monitoring', {
      discussionId: discussionId
    });
  }
  
  // 停止監控討論組
  stopDiscussionMonitoring(discussionId: string) {
    this.ipcService.send('stop-discussion-monitoring', {
      discussionId: discussionId
    });
  }
  
  // 加載討論組消息
  loadDiscussionMessages(discussionId: string) {
    this.selectedDiscussionId.set(discussionId);
    this.isLoadingDiscussionMessages.set(true);
    this.ipcService.send('get-discussion-messages', {
      discussionId: discussionId,
      limit: 50,
      matchedOnly: false
    });
  }
  
  // 回復討論組消息
  replyToDiscussion(messageId: number, discussionId: string, replyText: string) {
    if (!replyText || !replyText.trim()) {
      this.toastService.error('請輸入回復內容');
      return;
    }
    this.ipcService.send('reply-to-discussion', {
      discussionId: discussionId,
      messageId: messageId,
      replyText: replyText.trim()
    });
    this.discussionReplyText.set('');
  }
  
  // ==================== Knowledge Base Methods ====================
  
  // 初始化知識庫
  initKnowledgeBase() {
    this.ipcService.send('init-knowledge-base', {});
  }
  
  // 加載知識庫數據
  loadKnowledgeData() {
    this.isLoadingKnowledge.set(true);
    
    // 獲取統計
    this.ipcService.send('get-knowledge-stats', {});
    
    // 根據當前標籤加載數據
    this.refreshCurrentKnowledgeTab();
  }
  
  // 刷新當前知識庫標籤
  refreshCurrentKnowledgeTab() {
    const tab = this.knowledgeTab();
    
    switch (tab) {
      case 'documents':
        this.ipcService.send('get-documents', {});
        break;
      case 'images':
        this.ipcService.send('get-media', { mediaType: 'image' });
        break;
      case 'videos':
        this.ipcService.send('get-media', { mediaType: 'video' });
        break;
      case 'qa':
        this.ipcService.send('get-qa-pairs', {});
        break;
    }
  }
  
  // 切換知識庫標籤
  switchKnowledgeTab(tab: 'documents' | 'images' | 'videos' | 'qa') {
    this.knowledgeTab.set(tab);
    this.refreshCurrentKnowledgeTab();
  }
  
  // 添加文檔
  addDocument() {
    const doc = this.newDocument();
    if (!doc.title && !doc.content) {
      this.toastService.error(this.t('documentTitle') + ' required', 2000);
      return;
    }
    
    this.ipcService.send('add-document', {
      title: doc.title,
      content: doc.content,
      category: doc.category,
      tags: doc.tags.split(',').map(t => t.trim()).filter(t => t)
    });
    
    this.showAddDocumentDialog.set(false);
    this.newDocument.set({title: '', category: 'general', tags: '', content: ''});
  }
  
  // 上傳文檔文件
  async uploadDocumentFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const doc = this.newDocument();
    
    // 讀取文件內容
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      this.ipcService.send('add-document', {
        title: doc.title || file.name.replace(/\.[^/.]+$/, ''),
        content: content,
        category: doc.category,
        tags: doc.tags.split(',').map(t => t.trim()).filter(t => t)
      });
      
      this.showAddDocumentDialog.set(false);
      this.newDocument.set({title: '', category: 'general', tags: '', content: ''});
    };
    
    if (file.type === 'application/pdf') {
      // PDF 需要後端處理
      this.toastService.info('PDF 文件將由後端處理', 2000);
    } else {
      reader.readAsText(file);
    }
    
    input.value = '';
  }
  
  // 刪除文檔
  deleteDocument(id: number) {
    this.ipcService.send('delete-document', { id });
    this.knowledgeDocuments.update(docs => docs.filter(d => d.id !== id));
  }
  
  // 上傳媒體文件
  async uploadMediaFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const media = this.newMedia();
    
    // 確定媒體類型
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'image';
    
    // 讀取為 base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      
      this.ipcService.send('add-media', {
        base64Data: base64,
        name: media.name || file.name.replace(/\.[^/.]+$/, ''),
        category: media.category,
        description: media.description,
        mediaType: mediaType
      });
      
      this.showAddMediaDialog.set(false);
      this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'image'});
    };
    
    reader.readAsDataURL(file);
    input.value = '';
  }
  
  // 刪除媒體
  deleteMedia(id: number, mediaType: string) {
    this.ipcService.send('delete-media', { id });
    if (mediaType === 'image') {
      this.knowledgeImages.update(imgs => imgs.filter(i => i.id !== id));
    } else {
      this.knowledgeVideos.update(vids => vids.filter(v => v.id !== id));
    }
  }
  
  // 添加問答對
  addQaPair() {
    const qa = this.newQaPair();
    if (!qa.question || !qa.answer) {
      this.toastService.error(this.t('question') + ' & ' + this.t('answer') + ' required', 2000);
      return;
    }
    
    this.ipcService.send('add-qa-pair', {
      question: qa.question,
      answer: qa.answer,
      category: qa.category,
      keywords: qa.keywords.split(',').map(k => k.trim()).filter(k => k)
    });
    
    this.showAddQaDialog.set(false);
    this.newQaPair.set({question: '', answer: '', category: 'general', keywords: ''});
  }
  
  // 刪除問答對
  deleteQaPair(id: number) {
    // 需要後端支持
    this.knowledgeQaPairs.update(qas => qas.filter(q => q.id !== id));
  }
  
  // 打開添加圖片對話框
  openAddImageDialog() {
    this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'image'});
    this.showAddMediaDialog.set(true);
  }
  
  // 打開添加視頻對話框
  openAddVideoDialog() {
    this.newMedia.set({name: '', category: 'general', description: '', mediaType: 'video'});
    this.showAddMediaDialog.set(true);
  }
  
  // 更新新文檔字段
  updateNewDocumentField(field: 'title' | 'category' | 'tags' | 'content', value: string) {
    const current = this.newDocument();
    this.newDocument.set({...current, [field]: value});
  }
  
  // 更新新媒體字段
  updateNewMediaField(field: 'name' | 'category' | 'description', value: string) {
    const current = this.newMedia();
    this.newMedia.set({...current, [field]: value});
  }
  
  // 更新新問答對字段
  updateNewQaPairField(field: 'question' | 'answer' | 'category' | 'keywords', value: string) {
    const current = this.newQaPair();
    this.newQaPair.set({...current, [field]: value});
  }
  
  // 搜索知識庫
  searchKnowledge(query: string) {
    if (!query.trim()) return;
    
    this.ipcService.send('search-knowledge', {
      query: query,
      includeDocs: true,
      includeImages: true,
      includeVideos: true,
      limit: 20
    });
  }
  
  // 發送 AI 問候建議
  sendAiGreeting() {
    const suggestion = this.aiGreetingSuggestion();
    if (!suggestion) return;
    
    this.ipcService.send('send-message', {
      phone: suggestion.accountPhone,
      recipientId: suggestion.userId,
      text: suggestion.suggestedGreeting,
      leadId: suggestion.leadId
    });
    
    this.showAiGreetingDialog.set(false);
    this.aiGreetingSuggestion.set(null);
    this.toastService.success(`✓ 問候消息已發送給 @${suggestion.username || suggestion.firstName}`);
  }
  
  // 編輯 AI 問候
  editAiGreeting(newText: string) {
    const suggestion = this.aiGreetingSuggestion();
    if (suggestion) {
      this.aiGreetingSuggestion.set({...suggestion, suggestedGreeting: newText});
    }
  }
  
  // 拒絕 AI 問候
  dismissAiGreeting() {
    this.showAiGreetingDialog.set(false);
    this.aiGreetingSuggestion.set(null);
  }
  
  // 格式化文件大小
  formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==================== Voice Clone Methods ====================
  
  // 上傳聲音樣本用於克隆
  async uploadVoiceSample(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    
    // 驗證文件類型
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/flac'];
    if (!allowedTypes.includes(file.type)) {
      this.voiceCloneError.set(this.t('invalidAudioFormat'));
      return;
    }
    
    // 驗證文件大小 (最大 50MB)
    if (file.size > 50 * 1024 * 1024) {
      this.voiceCloneError.set(this.t('audioFileTooLarge'));
      return;
    }
    
    this.isUploadingVoice.set(true);
    this.voiceUploadProgress.set(0);
    this.voiceCloneError.set('');
    
    try {
      // 讀取文件為 Base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.voiceUploadProgress.set(Math.round((e.loaded / e.total) * 50));
        }
      };
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const voiceName = file.name.replace(/\.[^/.]+$/, '');
        
        // 發送到後端保存
        this.ipcService.send('upload-voice-sample', {
          name: voiceName,
          audioData: base64Data,
          fileName: file.name,
          fileType: file.type
        });
        
        this.voiceUploadProgress.set(100);
        
        // 模擬完成（實際應該等待後端響應）
        setTimeout(() => {
          const newVoice = {
            id: Date.now().toString(),
            name: voiceName,
            audioPath: file.name,
            promptText: '',  // 文件上傳沒有提示詞
            createdAt: new Date()
          };
          
          this.clonedVoices.update(voices => [...voices, newVoice]);
          this.saveClonedVoicesToStorage();
          this.isUploadingVoice.set(false);
          this.toastService.success(this.t('voiceUploadSuccess'), 2000);
        }, 500);
      };
      
      reader.onerror = () => {
        this.voiceCloneError.set(this.t('voiceUploadFailed'));
        this.isUploadingVoice.set(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (error: any) {
      this.voiceCloneError.set(error.message);
      this.isUploadingVoice.set(false);
    }
    
    // 重置 input
    input.value = '';
  }
  
  // 選擇克隆的聲音
  selectClonedVoice(voiceId: string) {
    this.selectedClonedVoice.set(voiceId);
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (voice) {
      this.ttsVoice.set(voice.audioPath);
    }
  }
  
  // 刪除克隆的聲音
  deleteClonedVoice(voiceId: string) {
    this.clonedVoices.update(voices => voices.filter(v => v.id !== voiceId));
    if (this.selectedClonedVoice() === voiceId) {
      this.selectedClonedVoice.set('');
      this.ttsVoice.set('');
    }
    this.saveClonedVoicesToStorage();
    
    // 通知後端刪除文件
    this.ipcService.send('delete-voice-sample', { voiceId });
    this.toastService.success(this.t('voiceDeleted'), 2000);
  }
  
  // 預覽克隆的聲音
  async previewClonedVoice(voiceId: string) {
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (!voice) return;
    
    this.ipcService.send('preview-voice-sample', { 
      voiceId,
      audioPath: voice.audioPath 
    });
  }
  
  // 使用克隆聲音生成語音
  async generateWithClonedVoice(text: string) {
    const endpoint = this.ttsEndpoint();
    const voiceId = this.selectedClonedVoice();
    
    if (!endpoint) {
      this.toastService.error(this.t('ttsEndpointRequired'), 2000);
      return;
    }
    
    if (!voiceId) {
      this.toastService.error(this.t('selectVoiceFirst'), 2000);
      return;
    }
    
    const voice = this.clonedVoices().find(v => v.id === voiceId);
    if (!voice) return;
    
    this.ipcService.send('generate-cloned-voice', {
      endpoint,
      text,
      voiceId,
      audioPath: voice.audioPath
    });
  }
  
  // 保存克隆聲音列表到 localStorage
  private saveClonedVoicesToStorage() {
    const voices = this.clonedVoices().map(v => ({
      ...v,
      createdAt: v.createdAt.toISOString()
    }));
    localStorage.setItem('cloned_voices', JSON.stringify(voices));
  }
  
  // 從 localStorage 加載克隆聲音列表
  private loadClonedVoicesFromStorage() {
    const saved = localStorage.getItem('cloned_voices');
    if (saved) {
      try {
        const voices = JSON.parse(saved).map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt)
        }));
        this.clonedVoices.set(voices);
      } catch (e) {
        console.error('Failed to load cloned voices:', e);
      }
    }
  }

  // ==================== Voice Recording Methods ====================
  
  // 打開錄音對話框
  openRecordingDialog() {
    this.showRecordingDialog.set(true);
    this.voiceName.set('');
    this.voicePromptText.set('');
    this.recordedAudioBlob.set(null);
    this.recordedAudioUrl.set('');
    this.voiceCloneError.set('');
    this.recordingTime.set(0);
  }
  
  // 關閉錄音對話框
  closeRecordingDialog() {
    this.stopRecording();
    this.showRecordingDialog.set(false);
    if (this.recordedAudioUrl()) {
      URL.revokeObjectURL(this.recordedAudioUrl());
    }
  }
  
  // 開始錄音
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.recordedAudioBlob.set(audioBlob);
        
        // 創建預覽 URL
        if (this.recordedAudioUrl()) {
          URL.revokeObjectURL(this.recordedAudioUrl());
        }
        this.recordedAudioUrl.set(URL.createObjectURL(audioBlob));
        
        // 停止所有音軌
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start(100);
      this.isRecording.set(true);
      this.recordingTime.set(0);
      
      // 開始計時
      this.recordingTimer = setInterval(() => {
        this.recordingTime.update(t => t + 1);
        
        // 自動停止（最長 10 秒）
        if (this.recordingTime() >= 10) {
          this.stopRecording();
        }
      }, 1000);
      
    } catch (error: any) {
      console.error('Recording error:', error);
      this.voiceCloneError.set(this.t('microphoneAccessDenied'));
    }
  }
  
  // 停止錄音
  stopRecording() {
    if (this.mediaRecorder && this.isRecording()) {
      this.mediaRecorder.stop();
      this.isRecording.set(false);
      
      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }
    }
  }
  
  // 確認並上傳錄音
  async confirmAndUploadRecording() {
    const audioBlob = this.recordedAudioBlob();
    const name = this.voiceName().trim();
    const promptText = this.voicePromptText().trim();
    
    // 驗證
    if (!name) {
      this.voiceCloneError.set(this.t('voiceNameRequired'));
      return;
    }
    
    if (!audioBlob) {
      this.voiceCloneError.set(this.t('noRecordingToUpload'));
      return;
    }
    
    const duration = this.recordingTime();
    if (duration < 3) {
      this.voiceCloneError.set(this.t('recordingTooShort'));
      return;
    }
    
    this.isUploadingVoice.set(true);
    this.voiceUploadProgress.set(0);
    
    try {
      // 將 Blob 轉換為 Base64
      const reader = new FileReader();
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          this.voiceUploadProgress.set(Math.round((e.loaded / e.total) * 50));
        }
      };
      
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        // 發送到後端保存
        this.ipcService.send('upload-voice-sample', {
          name: name,
          audioData: base64Data,
          fileName: `${name}.webm`,
          fileType: 'audio/webm',
          promptText: promptText,
          duration: duration
        });
        
        this.voiceUploadProgress.set(100);
        
        // 添加到列表
        const newVoice = {
          id: Date.now().toString(),
          name: name,
          audioPath: `${name}.webm`,
          promptText: promptText,
          createdAt: new Date()
        };
        
        this.clonedVoices.update(voices => [...voices, newVoice]);
        this.saveClonedVoicesToStorage();
        
        this.isUploadingVoice.set(false);
        this.toastService.success(this.t('voiceUploadSuccess'), 2000);
        this.closeRecordingDialog();
      };
      
      reader.onerror = () => {
        this.voiceCloneError.set(this.t('voiceUploadFailed'));
        this.isUploadingVoice.set(false);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error: any) {
      this.voiceCloneError.set(error.message);
      this.isUploadingVoice.set(false);
    }
  }
  
  // 重新錄音
  resetRecording() {
    if (this.recordedAudioUrl()) {
      URL.revokeObjectURL(this.recordedAudioUrl());
    }
    this.recordedAudioBlob.set(null);
    this.recordedAudioUrl.set('');
    this.recordingTime.set(0);
    this.voiceCloneError.set('');
  }

  loadAiSettings() {
    const savedKey = localStorage.getItem('ai_api_key');
    const savedType = localStorage.getItem('ai_api_type') as 'gemini' | 'openai' | 'custom' | 'local' | null;
    const savedEndpoint = localStorage.getItem('ai_custom_endpoint');
    
    if (savedKey) {
      this.aiApiKey.set(savedKey);
    }
    if (savedType) {
      this.aiApiType.set(savedType);
    }
    if (savedEndpoint) {
      this.customApiEndpoint.set(savedEndpoint);
    }
    
    // 加載本地 AI 設置
    const localAiEndpoint = localStorage.getItem('local_ai_endpoint');
    const localAiModel = localStorage.getItem('local_ai_model');
    if (localAiEndpoint) {
      this.localAiEndpoint.set(localAiEndpoint);
    }
    if (localAiModel) {
      this.localAiModel.set(localAiModel);
    }
    
    // 加載語音服務設置
    const ttsEndpoint = localStorage.getItem('tts_endpoint');
    const ttsEnabled = localStorage.getItem('tts_enabled');
    const ttsVoice = localStorage.getItem('tts_voice');
    const sttEndpoint = localStorage.getItem('stt_endpoint');
    const sttEnabled = localStorage.getItem('stt_enabled');
    
    if (ttsEndpoint) this.ttsEndpoint.set(ttsEndpoint);
    if (ttsEnabled) this.ttsEnabled.set(ttsEnabled === 'true');
    if (ttsVoice) this.ttsVoice.set(ttsVoice);
    if (sttEndpoint) this.sttEndpoint.set(sttEndpoint);
    if (sttEnabled) this.sttEnabled.set(sttEnabled === 'true');
    
    // 加載克隆聲音列表
    this.loadClonedVoicesFromStorage();
    
    // 加載 AI 自動聊天設置
    this.loadAiChatSettings();
  }

  // --- Input Forms ---
  newAccount = signal({ phone: '', proxy: '', apiId: '', apiHash: '', enableWarmup: true, twoFactorPassword: '', group: '' });
  newKeyword = signal<{setId: number | null, keyword: string, isRegex: boolean}>({setId: null, keyword: '', isRegex: false });
  testKeywordText = signal(''); // 用於測試關鍵詞的文本
  keywordTestResult = signal<{matches: boolean, error?: string} | null>(null);
  
  // 檢查正則表達式是否有效
  isRegexValid(keyword: string): boolean {
    if (!keyword) return true;
    try {
      new RegExp(keyword);
      return true;
    } catch {
      return false;
    }
  }
  
  // 獲取正則表達式錯誤信息
  getRegexError(keyword: string): string | null {
    if (!keyword) return null;
    try {
      new RegExp(keyword);
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }
  newKeywordSet = signal({ name: '' });
  newGroup = signal({ url: '', keywordSetIds: [] as number[] });
  newTemplate = signal({ name: '', prompt: ''});
  showTemplateCreator = signal(false); // 控制創建模板面板的顯示
  showKeywordSetCreator = signal(false); // 控制創建關鍵詞集對話框的顯示
  newCampaign = signal(this.getEmptyCampaignForm());
  
  // --- Login State ---
  loginState = signal<{accountId: number | null, phone: string, requiresCode: boolean, requires2FA: boolean, phoneCodeHash: string | null, isSubmittingCode: boolean, canRetrySMS?: boolean, waitSeconds?: number}>({
    accountId: null,
    phone: '',
    requiresCode: false,
    requires2FA: false,
    phoneCodeHash: null,
    isSubmittingCode: false
  });
  loginCode = signal('');
  login2FAPassword = signal('');
  
  // --- Account Grouping & Bulk Actions State ---
  accountRoles: AccountRole[] = ['Listener', 'Sender', 'Unassigned'];
  selectedAccountGroup = signal<string> ('All');
  accountGroups = computed(() => ['All', ...new Set(this.accounts().map(a => a.group).filter(Boolean)) as Set<string>]);
  
  filteredAccounts = computed(() => {
    const accounts = this.accounts();
    const selectedGroup = this.selectedAccountGroup();
    if (selectedGroup === 'All') {
        return accounts;
    }
    return accounts.filter(a => a.group === selectedGroup);
  });
  selectedAccounts = computed(() => this.accounts().filter(a => a.selected));
  isAllAccountsSelected = computed(() => {
      const filtered = this.filteredAccounts();
      return filtered.length > 0 && filtered.every(a => a.selected);
  });

  listenerAccounts = computed(() => this.accounts().filter(a => a.role === 'Listener' && a.status === 'Online'));
  senderAccounts = computed(() => this.accounts().filter(a => a.role === 'Sender' && (a.status === 'Online' || a.status === 'Warming Up')));
  
  // 獲取監控號列表（用於快速引導面板）
  getListenerAccounts(): TelegramAccount[] {
    return this.accounts().filter(a => a.role === 'Listener' && a.status === 'Online');
  }
  
  // 獲取發送號列表（用於快速引導面板）
  getSenderAccounts(): TelegramAccount[] {
    return this.accounts().filter(a => a.role === 'Sender' && (a.status === 'Online' || a.status === 'Warming Up'));
  }

  // 獲取在線帳號數量（用於模板，避免在模板中使用箭頭函數）
  getOnlineAccountsCount(): number {
    return this.accounts().filter(a => a.status === 'Online').length;
  }

  // 導航到指定視圖（用於模板，避免在 @if 區塊中直接賦值）
  navigateToView(viewName: string): void {
    this.changeView(viewName as View);
  }

  // 導航到自動化中心的指定標籤頁
  navigateToAutomationTab(tab: string): void {
    this.currentView.set('automation');
    this.automationTab.set(tab as 'targets' | 'keywords' | 'templates' | 'campaigns');
  }

  // 🆕 知識大腦菜單方法
  toggleKnowledgeMenu(): void {
    this.knowledgeMenuExpanded.set(!this.knowledgeMenuExpanded());
  }
  
  isKnowledgeView(): boolean {
    const view = this.currentView();
    return view === 'knowledge-brain' || view === 'knowledge-manage' || view === 'knowledge-gaps';
  }

  // --- Kanban State ---
  leadStatuses: LeadStatus[] = ['New', 'Contacted', 'Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost'];
  openLeadMenuId = signal<number | null>(null);
  // Get leads to display (filtered by search if active)
  displayLeads = computed(() => {
    const searchQuery = this.leadSearchQuery().trim();
    if (searchQuery && this.leadSearchResults().length > 0) {
      return this.leadSearchResults();
    }
    return this.leads();
  });
  
  leadsByStatusMap = computed(() => {
    const leads = this.displayLeads();
    const statusMap = new Map<LeadStatus, CapturedLead[]>();
    this.leadStatuses.forEach(status => statusMap.set(status, []));
    leads.forEach(lead => {
        if (statusMap.has(lead.status)) {
        statusMap.get(lead.status)!.push(lead);
        }
    });
    return statusMap;
  });
  
  // 根據狀態獲取 Lead 列表（用於模板）
  leadsByStatus(status: LeadStatus): CapturedLead[] {
    return this.leadsByStatusMap().get(status) || [];
  }
  
  // 今日新 Lead 數量
  todayNewLeads(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.leads().filter(lead => {
      const leadDate = new Date(lead.timestamp);
      return leadDate >= today;
    }).length;
  }
  
  // 計算轉化率
  getConversionRate(): string {
    const total = this.leads().length;
    if (total === 0) return '0.0';
    const converted = this.leadsByStatus('Closed-Won').length;
    return ((converted / total) * 100).toFixed(1);
  }
  
  // 🆕 計算聯繫率（已聯繫 / 總數）
  getContactRate(): string {
    const total = this.leads().length;
    if (total === 0) return '0.0';
    const newLeads = this.leadsByStatus('New').length;
    const contacted = total - newLeads;  // 非 New 狀態的都算已聯繫
    return ((contacted / total) * 100).toFixed(1);
  }
  
  // 🆕 計算回覆率（已回覆 / 已聯繫）
  getReplyRate(): string {
    const contacted = this.leads().length - this.leadsByStatus('New').length;
    if (contacted === 0) return '0.0';
    const replied = this.leadsByStatus('Replied').length + 
                   this.leadsByStatus('Follow-up').length +
                   this.leadsByStatus('Closed-Won').length +
                   this.leadsByStatus('Closed-Lost').length;
    return ((replied / contacted) * 100).toFixed(1);
  }
  
  // 過濾和排序後的 Leads
  filteredLeads = computed(() => {
    const statusFilter = this.leadStatusFilter();
    const sourceFilter = this.leadSourceFilter();
    const sortBy = this.leadSortBy();
    
    let result = this.displayLeads();
    
    // 按狀態篩選
    if (statusFilter !== 'all') {
      result = result.filter(lead => lead.status === statusFilter);
    }
    
    // 按來源類型篩選
    if (sourceFilter !== 'all') {
      result = result.filter(lead => lead.sourceType === sourceFilter);
    }
    
    // 排序
    return result.sort((a, b) => {
      if (sortBy === 'intent') {
        return (b.intentScore || 0) - (a.intentScore || 0);
      } else if (sortBy === 'time') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else {
        return (a.username || '').localeCompare(b.username || '');
      }
    });
  });
  
  // 各來源類型的計數
  leadsBySource = computed(() => {
    const leads = this.leads();
    return {
      group_extract: leads.filter(l => l.sourceType === 'group_extract').length,
      keyword_trigger: leads.filter(l => l.sourceType === 'keyword_trigger').length,
      import: leads.filter(l => l.sourceType === 'import').length,
      unknown: leads.filter(l => !l.sourceType || l.sourceType === 'unknown').length
    };
  });

  // --- Funnel Stats & User Management ---
  funnelStats = signal<{
    stages: {[key: string]: {count: number, avg_interest: number, avg_sentiment: number}},
    tags: [string, number][],
    interest_distribution: {[key: number]: number},
    today_new: number,
    week_converted: number
  }>({
    stages: {},
    tags: [],
    interest_distribution: {},
    today_new: 0,
    week_converted: 0
  });
  
  // --- Funnel Visualization (Phase 4) ---
  funnelOverview = signal<{
    stages: Array<{stage: string; name: string; count: number; color: string}>;
    totalLeads: number;
    convertedLeads: number;
    averageConversionDays: number;
    conversionRate: number;
  }>({
    stages: [],
    totalLeads: 0,
    convertedLeads: 0,
    averageConversionDays: 0,
    conversionRate: 0
  });
  showFunnelVisualization = signal(false);
  isLoadingFunnel = signal(false);
  selectedJourneyUserId = signal('');
  userJourneyData = signal<{
    userId: string;
    stages: Array<{stage: string; timestamp: string; reason: string}>;
    currentStage: string;
    totalDays: number;
    isConverted: boolean;
  } | null>(null);
  isLoadingJourney = signal(false);
  leadsTab = signal<'kanban' | 'funnel' | 'journey'>('kanban');
  
  // --- Marketing Campaign (Phase 4) ---
  marketingCampaigns = signal<Array<{
    id: number;
    name: string;
    type: string;
    status: string;
    totalTargets: number;
    successCount: number;
    failedCount: number;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
  }>>([]);
  marketingStats = signal<{
    totalCampaigns: number;
    running: number;
    completed: number;
    totalMessages: number;
    totalInvites: number;
    successRate: number;
  }>({
    totalCampaigns: 0,
    running: 0,
    completed: 0,
    totalMessages: 0,
    totalInvites: 0,
    successRate: 0
  });
  showCreateCampaignDialog = signal(false);
  newMarketingCampaign = { name: '', type: 'pm', targetGroup: '', messageTemplate: '' };
  isLoadingMarketing = signal(false);
  
  // --- Account Warmup (Phase 4) ---
  warmupDetails = signal<{[accountId: number]: {
    enabled: boolean;
    startDate: string | null;
    stage: number;
    stageName: string;
    daysCompleted: number;
    totalDays: number;
    progressPercent: number;
    dailyLimit: number;
    allowedActions: string[];
  }}>({});
  showWarmupConfig = signal(false);
  selectedWarmupAccountId = signal<number | null>(null);
  
  usersWithProfiles = signal<{
    users: any[],
    total: number,
    limit: number,
    offset: number
  }>({users: [], total: 0, limit: 50, offset: 0});
  
  userFilterStage = signal<string>('');
  userFilterTags = signal<string>('');
  userFilterSearch = signal<string>('');
  selectedUserIds = signal<string[]>([]);
  
  // 漏斗階段定義
  funnelStages = [
    {key: 'new', name: '新客戶', color: 'bg-blue-500'},
    {key: 'contacted', name: '已聯繫', color: 'bg-cyan-500'},
    {key: 'replied', name: '已回復', color: 'bg-green-500'},
    {key: 'interested', name: '有興趣', color: 'bg-yellow-500'},
    {key: 'negotiating', name: '洽談中', color: 'bg-orange-500'},
    {key: 'follow_up', name: '需跟進', color: 'bg-purple-500'},
    {key: 'converted', name: '已成交', color: 'bg-emerald-500'},
    {key: 'churned', name: '已流失', color: 'bg-red-500'}
  ];
  
  loadFunnelStats() {
    this.ipcService.send('get-funnel-stats', {});
  }
  
  // ==================== Funnel Visualization Methods (Phase 4) ====================
  
  loadFunnelOverview() {
    this.isLoadingFunnel.set(true);
    this.ipcService.send('get-funnel-overview', {});
  }
  
  loadUserJourney(userId: string) {
    if (!userId) return;
    this.isLoadingJourney.set(true);
    this.selectedJourneyUserId.set(userId);
    this.ipcService.send('get-user-journey', { userId });
  }
  
  transitionFunnelStage(userId: string, newStage: string, reason?: string) {
    this.ipcService.send('transition-funnel-stage', {
      userId,
      stage: newStage,
      reason: reason || '手動轉換'
    });
  }
  
  // ==================== Marketing Campaign Methods (Phase 4) ====================
  
  loadMarketingStats() {
    this.isLoadingMarketing.set(true);
    this.ipcService.send('get-marketing-stats', {});
  }
  
  loadMarketingCampaigns() {
    this.ipcService.send('get-marketing-campaigns', {});
  }
  
  createMarketingCampaign() {
    if (!this.newMarketingCampaign.name.trim()) {
      this.toastService.error('請輸入活動名稱');
      return;
    }
    
    this.ipcService.send('create-marketing-campaign', {
      name: this.newMarketingCampaign.name,
      type: this.newMarketingCampaign.type,
      targetGroup: this.newMarketingCampaign.targetGroup,
      messageTemplate: this.newMarketingCampaign.messageTemplate
    });
  }
  
  startMarketingCampaign(campaignId: number) {
    this.ipcService.send('start-marketing-campaign', { campaignId });
  }
  
  // ==================== Account Warmup Methods (Phase 4) ====================
  
  loadWarmupDetails(accountId: number) {
    this.ipcService.send('get-warmup-progress', { accountId });
  }
  
  loadAllWarmupDetails() {
    const accounts = this.accounts();
    accounts.forEach(account => {
      if (account.id) {
        this.loadWarmupDetails(account.id);
      }
    });
  }
  
  toggleWarmup(accountId: number, enabled: boolean) {
    this.ipcService.send('update-account', {
      id: accountId,
      warmupEnabled: enabled
    });
    this.toastService.info(enabled ? '已啟用預熱' : '已停用預熱');
  }
  
  getWarmupStageColor(stage: number): string {
    const colors: {[key: number]: string} = {
      1: 'text-blue-400',
      2: 'text-cyan-400',
      3: 'text-yellow-400',
      4: 'text-green-400'
    };
    return colors[stage] || 'text-slate-400';
  }
  
  getWarmupStageIcon(stage: number): string {
    const icons: {[key: number]: string} = {
      1: '🔇',
      2: '💬',
      3: '📈',
      4: '✅'
    };
    return icons[stage] || '❓';
  }
  
  // ==================== Phase 5: System Management Methods ====================
  
  // --- Database Migration Methods ---
  loadMigrationStatus() {
    this.isLoadingMigration.set(true);
    this.ipcService.send('migration-status', {});
  }
  
  runMigration(targetVersion?: number) {
    this.isRunningMigration.set(true);
    this.ipcService.send('migrate', { targetVersion });
  }
  
  rollbackMigration(targetVersion: number) {
    if (!confirm(`確定要回滾到版本 ${targetVersion} 嗎？這可能會導致數據丟失！`)) return;
    this.isRunningMigration.set(true);
    this.ipcService.send('rollback-migration', { targetVersion });
  }
  
  // --- Task Scheduler Methods ---
  loadSchedulerStatus() {
    this.ipcService.send('get-scheduler-status', {});
  }
  
  startScheduler() {
    this.ipcService.send('start-scheduler', {});
  }
  
  stopScheduler() {
    this.ipcService.send('stop-scheduler', {});
  }
  
  runSchedulerTask(taskName: string) {
    this.ipcService.send('run-scheduler-task', { taskName });
  }
  
  updateSchedulerInterval(taskName: string, interval: number) {
    this.ipcService.send('update-scheduler-interval', { taskName, interval });
  }
  
  // --- Log File Management Methods ---
  loadLogFiles() {
    this.isLoadingLogs.set(true);
    this.ipcService.send('list-log-files', {});
  }
  
  loadLogStats() {
    this.ipcService.send('get-log-stats', {});
  }
  
  rotateLogs() {
    this.isRotatingLogs.set(true);
    this.ipcService.send('rotate-logs', {});
  }
  
  viewLogFile(filename: string) {
    this.selectedLogFile.set(filename);
    this.ipcService.send('read-log-file', { filename });
  }
  
  downloadLogFile(filename: string) {
    this.ipcService.send('download-log-file', { filename });
  }
  
  deleteLogFile(filename: string) {
    if (!confirm(`確定要刪除日誌文件 ${filename} 嗎？`)) return;
    this.ipcService.send('delete-log-file', { filename });
  }
  
  // --- Resource Discovery Batch Methods (Phase 5 Enhanced) ---
  hasSelectedResources(): boolean {
    return this.selectedResourceIds().length > 0;
  }
  
  selectedResourceCount(): number {
    return this.selectedResourceIds().length;
  }
  
  batchApproveResources() {
    const ids = this.selectedResourceIds();
    this.ipcService.send('batch-update-resources', { 
      resourceIds: ids, 
      status: 'approved' 
    });
    this.selectedResourceIds.set([]);
    this.showResourceBatchMenu.set(false);
  }
  
  batchRejectResources() {
    const ids = this.selectedResourceIds();
    this.ipcService.send('batch-update-resources', { 
      resourceIds: ids, 
      status: 'rejected' 
    });
    this.selectedResourceIds.set([]);
    this.showResourceBatchMenu.set(false);
  }
  
  batchSetResourcePriority(priority: 'high' | 'medium' | 'low') {
    const ids = this.selectedResourceIds();
    this.ipcService.send('batch-update-resources', { 
      resourceIds: ids, 
      priority 
    });
    this.selectedResourceIds.set([]);
    this.showResourceBatchMenu.set(false);
  }
  
  batchDeleteResources() {
    if (!confirm(`確定要刪除 ${this.selectedResourceCount()} 個資源嗎？`)) return;
    const ids = this.selectedResourceIds();
    this.ipcService.send('batch-delete-resources', { resourceIds: ids });
    this.selectedResourceIds.set([]);
    this.showResourceBatchMenu.set(false);
  }
  
  loadUsersWithProfiles() {
    this.ipcService.send('get-users-with-profiles', {
      stage: this.userFilterStage() || undefined,
      tags: this.userFilterTags() || undefined,
      search: this.userFilterSearch() || undefined,
      limit: 50,
      offset: 0
    });
  }
  
  toggleUserSelection(userId: string) {
    const current = this.selectedUserIds();
    if (current.includes(userId)) {
      this.selectedUserIds.set(current.filter(id => id !== userId));
    } else {
      this.selectedUserIds.set([...current, userId]);
    }
  }
  
  selectAllUsers() {
    const allIds = this.usersWithProfiles().users.map(u => u.user_id);
    this.selectedUserIds.set(allIds);
  }
  
  deselectAllUsers() {
    this.selectedUserIds.set([]);
  }
  
  bulkUpdateTags(tags: string, action: 'add' | 'remove' | 'set') {
    const userIds = this.selectedUserIds();
    if (userIds.length === 0) {
      this.toastService.warning('請先選擇用戶');
      return;
    }
    this.ipcService.send('bulk-update-user-tags', {userIds, tags, action});
  }
  
  bulkUpdateStage(stage: string) {
    const userIds = this.selectedUserIds();
    if (userIds.length === 0) {
      this.toastService.warning('請先選擇用戶');
      return;
    }
    this.ipcService.send('bulk-update-user-stage', {userIds, stage});
  }
  
  getStageName(stage: string): string {
    const found = this.funnelStages.find(s => s.key === stage);
    return found ? found.name : stage;
  }
  
  getStageColor(stage: string): string {
    const found = this.funnelStages.find(s => s.key === stage);
    return found ? found.color : 'bg-gray-500';
  }

  // --- Analytics & Dashboard State ---
  dashboardStats = computed(() => {
    const accounts = this.accounts();
    const leads = this.leads();
    
    const onlineAccounts = accounts.filter(a => a.status === 'Online').length;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leadsToday = leads.filter(l => new Date(l.timestamp) >= today).length;
    
    const messagesSentToday = accounts.reduce((sum, acc) => sum + acc.dailySendCount, 0);

    return {
      totalAccounts: accounts.length,
      onlineAccounts,
      totalLeads: leads.length,
      leadsToday,
      messagesSentToday
    };
  });
  
  selectedAnalyticsCampaignId = signal<number | 'all'>('all');
  
  filteredAnalyticsLeads = computed(() => {
      const leads = this.leads();
      const selectedId = this.selectedAnalyticsCampaignId();
      if (selectedId === 'all') {
          return leads;
      }
      return leads.filter(l => l.campaignId === selectedId);
  });

  analyticsData = computed(() => {
    const leads = this.filteredAnalyticsLeads();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leadsByDay: { date: Date, count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const count = leads.filter(l => {
            const leadDate = new Date(l.timestamp);
            leadDate.setHours(0,0,0,0);
            return leadDate.getTime() === date.getTime();
        }).length;
        leadsByDay.push({ date, count });
    }
    const maxLeadsInPeriod = Math.max(...leadsByDay.map(d => d.count), 1);
    const funnel = {
        new: leads.length,
        contacted: leads.filter(l => l.status !== 'New').length,
        replied: leads.filter(l => ['Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost'].includes(l.status)).length
    };

    return { leadsByDay, maxLeadsInPeriod, funnel };
  });

  campaignPerformance = computed(() => {
      const leads = this.leads();
      return this.campaigns().map(campaign => {
          const campaignLeads = leads.filter(l => l.campaignId === campaign.id);
          const contactedCount = campaignLeads.filter(l => l.status !== 'New').length;
          const repliedCount = campaignLeads.filter(l => ['Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost'].includes(l.status)).length;
          const replyRate = contactedCount > 0 ? (repliedCount / contactedCount) * 100 : 0;
          return {
              id: campaign.id,
              name: campaign.name,
              isActive: campaign.isActive,
              leads: campaignLeads.length,
              contacted: contactedCount,
              replied: repliedCount,
              replyRate: replyRate,
          };
      });
  });

  // --- System State ---
  isMonitoring = signal(false);
  coreDataLoaded = signal(false);  // 🆕 核心數據是否已載入（用於骨架屏判斷）
  private senderRoundRobinIndex = signal(0);
  
  // --- One-Click Start State ---
  oneClickStarting = signal(false);
  oneClickProgress = signal(0);
  oneClickMessage = signal('');
  oneClickStartReport = signal<any>(null);  // 啟動報告
  showStartReport = signal(false);  // 是否顯示報告面板
  systemStatus = signal<any>({
    accounts: { total: 0, online: 0, offline: 0 },
    monitoring: { active: false, groups: 0 },
    ai: { enabled: false, mode: 'semi', endpoint: '' },
    keywords: { sets: 0, total: 0 },
    campaigns: { total: 0, active: 0 },
    templates: { total: 0, active: 0 },
    poller: { running: false }
  });

  constructor() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.theme.set(prefersDark ? 'dark' : 'light');
    effect(() => { this.document.documentElement.className = this.theme(); });
    
    // 🔧 P0: 監聽 NavBridgeService.currentView() 變化並同步到本地
    // 這樣子組件調用 nav.navigateTo() 時，AppComponent 的視圖也會切換
    effect(() => {
      const navView = this.navBridge.currentView();
      const localView = this.currentView();
      
      // 只有當 NavBridge 視圖與本地視圖不同時才同步
      if (navView && navView !== localView) {
        console.log('[AppComponent] 同步導航:', navView, '← from NavBridge');
        this.currentView.set(navView as View);
      }
    });
  }

  private queueRefreshInterval?: any;
  private viewCheckInterval?: any;
  private initialStateDebounceTimer?: any;
  private keywordSetsUpdateDebounceTimer?: any;
  private lastInitialStateTime = 0;
  
  // 🆕 性能優化：頁面可見性狀態
  private isPageVisible = true;
  private visibilityChangeHandler?: () => void;

  // 點擊頁面其他地方時關閉資源菜單
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // 關閉資源快捷菜單
    if (this.openResourceMenuId() !== null) {
      this.openResourceMenuId.set(null);
    }
  }

  // 🆕 非阻塞式連接狀態（取代全屏遮罩）
  backendConnectionState = signal<'connecting' | 'connected' | 'error' | 'timeout'>('connecting');
  backendConnectionMessage = signal<string>('正在連接後端服務...');
  backendConnectionProgress = signal<number>(0);
  private connectionStartTime: number = 0;
  private connectionTimeoutId: any = null;
  
  ngOnInit() {
    console.log('[App] ngOnInit called, coreDataLoaded:', this.coreDataLoaded());
    console.log('[App] Current URL:', window.location.href);
    console.log('[App] Router URL:', this.router.url);
    
    // 🆕 P0: 通知加載畫面 Angular 已就緒
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('angular-ready'));
      console.log('[App] Angular ready event dispatched');
    }, 100);
    
    // 设置默认语言为中文
    this.translationService.setLanguage('zh');
    
    // Load saved AI settings from localStorage
    this.loadAiSettings();
    
    // 🆕 加載保存的側邊欄分組狀態
    this.loadSidebarGroupsState();
    
    // 🆕 監聽視圖切換事件（從子組件觸發）
    window.addEventListener('changeView', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        this.changeView(customEvent.detail as View);
      }
    });
    
    // 🆕 性能優化：設置頁面可見性監聯（Tab 不活躍時暫停刷新）
    this.setupVisibilityListener();
    
    this.setupIpcListeners();
    
    // 檢查是否首次運行
    this.checkFirstRun();
    
    // 🆕 非阻塞式啟動：不再使用全屏遮罩
    this.connectionStartTime = Date.now();
    this.startConnectionTimeout();
    
    // 🆕 P2 優化：嘗試載入緩存狀態（快速啟動）
    this.loadCachedStateIfAvailable();
    
    // 🆕 P2-3: 監聽頁面可見性變更
    window.addEventListener('page-became-visible', () => {
      console.log('[App] Page became visible, refreshing data...');
      this.ipcService.send('get-initial-state');
    });
    
    // 🆕 P2-4: 監聽離線操作同步
    window.addEventListener('sync-offline-operations', ((event: CustomEvent) => {
      this.syncOfflineOperations(event.detail.operations);
    }) as EventListener);
    
    // 路由調試
    console.log('[App] Current URL:', window.location.href);
    
    // Request initial state from the backend once the app is ready
    this.ipcService.send('get-initial-state');
    
    // Refresh queue status periodically (every 60 seconds to reduce load)
    this.queueRefreshInterval = setInterval(() => {
      this.refreshQueueStatusThrottled();
    }, 60000);
    
    // Initial queue status refresh (after 2 seconds)
    setTimeout(() => {
      this.refreshQueueStatusThrottled();
    }, 2000);
    
    // Watch for view changes to load data
    this.watchViewChanges();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // 監聽會員狀態更新事件
    this.membershipUpdateHandler = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[AppComponent] 收到會員狀態更新事件:', customEvent.detail);
      // 強制觸發變更檢測以刷新側邊欄等 UI
      this.cdr.detectChanges();
    };
    window.addEventListener('membership-updated', this.membershipUpdateHandler);
    
    // 監聽 AI 設置保存事件（從 AI 中心組件發出）
    window.addEventListener('save-ai-settings', ((event: CustomEvent) => {
      const settings = event.detail;
      console.log('[AppComponent] 收到 AI 設置保存事件:', settings);
      
      // 更新本地狀態
      if (settings.auto_chat_enabled !== undefined) {
        this.aiAutoChatEnabled.set(settings.auto_chat_enabled === 1);
      }
      if (settings.auto_chat_mode) {
        this.aiAutoChatMode.set(settings.auto_chat_mode);
      }
      if (settings.auto_greeting !== undefined) {
        this.aiAutoGreeting.set(settings.auto_greeting === 1);
      }
      
      // 發送到後端
      this.ipcService.send('update-ai-chat-settings', { settings });
      this.toastService.success('AI 設置已保存', 2000);
    }) as EventListener);
    
    // 監聯發送帳號請求事件
    window.addEventListener('get-sender-accounts', (() => {
      // 獲取發送帳號並回傳
      const accounts = this.accounts() as any[];
      const senderAccounts = accounts
        .filter(a => a.role === 'Sender' && a.status === 'Online')
        .map(a => ({
          phone: a.phone,
          username: a.username || a.first_name || a.phone,
          avatar: a.avatar,
          sentToday: a.sentToday || a.dailySendCount || 0,
          dailyLimit: a.dailySendLimit || 50
        }));
      
      window.dispatchEvent(new CustomEvent('sender-accounts-loaded', { detail: senderAccounts }));
    }) as EventListener);
  }
  
  // 檢查是否首次運行
  checkFirstRun() {
    this.ipcService.send('check-first-run', {});
  }
  
  // 檢測 Ollama
  detectOllama() {
    this.isDetectingOllama.set(true);
    this.ipcService.send('detect-ollama', {});
  }
  
  // 完成首次設置
  completeFirstRunSetup() {
    const settings = {
      aiConfig: {
        primaryProvider: this.ollamaDetected() ? 'local' : 'cloud',
        localAi: {
          provider: 'ollama',
          endpoint: this.localAiEndpoint(),
          model: this.autoSelectedModel() || this.localAiModel(),
          autoDetect: true
        },
        cloudAi: {
          enabled: !this.ollamaDetected(),
          provider: this.aiApiType(),
          apiKey: this.aiApiKey()
        },
        autoFallback: {
          enabled: this.aiAutoFallback(),
          fallbackProvider: this.aiBackupProvider()
        }
      },
      settings: {
        language: 'zh',
        theme: this.theme(),
        firstRun: {
          completed: true,
          completedAt: new Date().toISOString()
        }
      }
    };
    
    this.ipcService.send('save-first-run-settings', settings);
    this.showWelcomeDialog.set(false);
    this.isFirstRun.set(false);
    this.toastService.success('🎉 設置完成！歡迎使用 TG-Matrix');
  }
  
  // 跳過首次設置
  skipFirstRunSetup() {
    this.showWelcomeDialog.set(false);
    this.isFirstRun.set(false);
    this.toastService.info('您可以稍後在設置中配置 AI');
  }
  
  private watchViewChanges() {
    // Check view changes periodically since effect() can't be used in ngOnInit
    let lastView: View | null = null;
    
    const checkView = () => {
      const currentView = this.currentView();
      if (currentView !== lastView) {
        lastView = currentView;
        
        if (currentView === 'leads') {
          // 加載漏斗統計和用戶列表
          this.loadFunnelStats();
          this.loadUsersWithProfiles();
        } else if (currentView === 'resources') {
          // 加載資源發現數據
          this.refreshResourceStats();
          // 🆕 C方案：只有在非搜索模式時才從數據庫加載
          if (!this.isInSearchResultMode()) {
            this.loadResources();
          }
          this.loadDiscoveryKeywords();
        } else if (currentView === 'ai-center') {
          // 刷新 RAG 統計
          this.refreshRagStats();
        }
      }
    };
    
    // Check immediately
    checkView();
    
    // 🆕 性能優化：將視圖檢查間隔從 500ms 增加到 2000ms
    // 視圖切換不需要如此頻繁的檢查
    this.viewCheckInterval = setInterval(checkView, 2000);
  }
  
  /**
   * 🆕 性能優化：設置頁面可見性監聽
   * 當用戶切換到其他 Tab 時暫停定時刷新，減少 CPU 消耗
   */
  private setupVisibilityListener() {
    this.visibilityChangeHandler = () => {
      this.isPageVisible = !document.hidden;
      
      if (this.isPageVisible) {
        console.log('[Performance] 頁面變為可見，恢復刷新');
        // 頁面可見時，重新啟動定時器
        this.resumeRefreshIntervals();
      } else {
        console.log('[Performance] 頁面變為隱藏，暫停刷新');
        // 頁面隱藏時，暫停定時器
        this.pauseRefreshIntervals();
      }
    };
    
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);
  }
  
  /**
   * 🆕 暫停所有定時刷新
   */
  private pauseRefreshIntervals() {
    if (this.viewCheckInterval) {
      clearInterval(this.viewCheckInterval);
      this.viewCheckInterval = undefined;
    }
    if (this.queueRefreshInterval) {
      clearInterval(this.queueRefreshInterval);
      this.queueRefreshInterval = undefined;
    }
  }
  
  /**
   * 🆕 恢復定時刷新
   */
  private resumeRefreshIntervals() {
    // 重新設置視圖檢查（只有在沒有運行時才啟動）
    if (!this.viewCheckInterval) {
      let lastView = '';
      const checkView = () => {
        const currentView = this.currentView();
        if (currentView !== lastView) {
          lastView = currentView;
          // 視圖變化時的刷新邏輯
        }
      };
      this.viewCheckInterval = setInterval(checkView, 2000);
    }
    
    // 重新設置隊列刷新
    if (!this.queueRefreshInterval) {
      this.queueRefreshInterval = setInterval(() => {
        this.refreshQueueStatusThrottled();
      }, 60000);
    }
  }
  
  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K: Focus search (if available)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Could add search focus here
      }
      
      // Ctrl/Cmd + N: Add new account (when on accounts view)
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        if (this.currentView() === 'accounts') {
          event.preventDefault();
          // Scroll to add account form
          setTimeout(() => {
            const form = document.querySelector('[name="phone"]') as HTMLElement;
            if (form) {
              form.focus();
            }
          }, 100);
        }
      }
      
      // Escape: Close modals/dialogs
      if (event.key === 'Escape') {
        // Close any open modals
        if (this.selectedQueuePhone()) {
          this.closeQueueDetails();
        }
        // Close progress dialog if cancellable
        if (this.progressDialog().show && this.progressDialog().cancellable) {
          this.progressDialog.set({ ...this.progressDialog(), show: false });
        }
      }
      
      // Number keys for navigation (when not in input)
      if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        if (event.key === '1' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('dashboard');
        } else if (event.key === '2' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('accounts');
        } else if (event.key === '3' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('automation');
        } else if (event.key === '4' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('leads');
        } else if (event.key === '5' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('ads');
        } else if (event.key === '6' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('campaigns');
        } else if (event.key === '7' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.changeView('settings');
        }
      }
    });
  }

  ngOnDestroy() {
    // 🆕 清理頁面可見性監聽器
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
    }
    
    // 清理會員狀態更新事件監聯
    if (this.membershipUpdateHandler) {
      window.removeEventListener('membership-updated', this.membershipUpdateHandler);
    }
    
    // Clean up listeners to prevent memory leaks
    this.ipcService.cleanup('log-entry');
    this.ipcService.cleanup('monitoring-status-changed');
    this.ipcService.cleanup('monitoring-status-report');
    this.ipcService.cleanup('monitoring-start-failed');
    this.ipcService.cleanup('monitoring-config-check');
    this.ipcService.cleanup('initial-state');
    this.ipcService.cleanup('accounts-updated');
    this.ipcService.cleanup('new-lead-captured');
    this.ipcService.cleanup('queue-status');
    this.ipcService.cleanup('queue-messages');
    this.ipcService.cleanup('sending-stats');
    this.ipcService.cleanup('queue-length-history');
    this.ipcService.cleanup('account-sending-comparison');
    this.ipcService.cleanup('campaign-performance-stats');
    this.ipcService.cleanup('alert-triggered');
    this.ipcService.cleanup('alerts-loaded');
    this.ipcService.cleanup('account-validation-error');
    this.ipcService.cleanup('keyword-set-validation-error');
    this.ipcService.cleanup('keyword-validation-error');
    this.ipcService.cleanup('group-validation-error');
    this.ipcService.cleanup('group-membership-status');
    this.ipcService.cleanup('group-join-result');
    this.ipcService.cleanup('template-validation-error');
    this.ipcService.cleanup('campaign-validation-error');
    // Partial update events
    this.ipcService.cleanup('keyword-sets-updated');
    this.ipcService.cleanup('groups-updated');
    this.ipcService.cleanup('templates-updated');
    this.ipcService.cleanup('campaigns-updated');
    this.ipcService.cleanup('leads-updated');
    this.ipcService.cleanup('funnel-stats');
    this.ipcService.cleanup('users-with-profiles');
    this.ipcService.cleanup('bulk-update-complete');
    this.ipcService.cleanup('login-requires-code');
    this.ipcService.cleanup('login-requires-2fa');
    this.ipcService.cleanup('account-login-error');
    this.ipcService.cleanup('session-files-cleaned');
    this.ipcService.cleanup('session-files-cleanup-error');
    this.ipcService.cleanup('session-import-result');
    this.ipcService.cleanup('session-import-needs-credentials');
    this.ipcService.cleanup('orphan-sessions-detected');
    this.ipcService.cleanup('orphan-sessions-scanned');
    this.ipcService.cleanup('orphan-sessions-recovered');

    // Clear intervals and timers
    if (this.queueRefreshInterval) {
      clearInterval(this.queueRefreshInterval);
      this.queueRefreshInterval = undefined;
    }
    if (this.viewCheckInterval) {
      clearInterval(this.viewCheckInterval);
      this.viewCheckInterval = undefined;
    }
    if (this.initialStateDebounceTimer) {
      clearTimeout(this.initialStateDebounceTimer);
      this.initialStateDebounceTimer = undefined;
    }
    if (this.keywordSetsUpdateDebounceTimer) {
      clearTimeout(this.keywordSetsUpdateDebounceTimer);
      this.keywordSetsUpdateDebounceTimer = undefined;
    }
    if (this.saveSettingsTimer) {
      clearTimeout(this.saveSettingsTimer);
      this.saveSettingsTimer = null;
    }
    if (this.queueStatusRefreshThrottleTimer) {
      clearTimeout(this.queueStatusRefreshThrottleTimer);
      this.queueStatusRefreshThrottleTimer = undefined;
    }
    if (this.chatListSearchDebounceTimer) {
      clearTimeout(this.chatListSearchDebounceTimer);
      this.chatListSearchDebounceTimer = undefined;
    }
    if (this.logFilterDebounceTimer) {
      clearTimeout(this.logFilterDebounceTimer);
      this.logFilterDebounceTimer = undefined;
    }
  }

  // 🆕 P0 優化：簡化連接檢測（移除硬超時）
  private startConnectionTimeout(): void {
    // P0: 只在 10 秒後顯示輕微提示，不再有硬超時
    // 連接成功由 HTTP 響應決定，不是時間
    setTimeout(() => {
      if (this.backendConnectionState() === 'connecting') {
        this.backendConnectionMessage.set('正在連接...');
        this.backendConnectionProgress.set(50);
      }
    }, 3000);
  }
  
  // 🆕 P0: 連接成功後自動隱藏提示
  private hideConnectionIndicator(): void {
    // 2 秒後隱藏
    setTimeout(() => {
      if (this.backendConnectionState() === 'connected') {
        // 保持 connected 狀態，UI 會自動隱藏
      }
    }, 2000);
  }
  
  // 🆕 P2-1: 載入緩存狀態（快速啟動）
  private async loadCachedStateIfAvailable(): Promise<void> {
    try {
      const cached = await this.offlineCache.loadCachedState();
      if (cached && this.offlineCache.isCacheValid()) {
        console.log('[App] 🚀 Loading cached state for fast startup');
        
        // 應用緩存數據（不觸發連接確認）
        if (cached.accounts?.length > 0) {
          this.accounts.set(cached.accounts);
        }
        if (cached.keywordSets?.length > 0) {
          this.keywordSets.set(cached.keywordSets);
        }
        if (cached.leads?.length > 0) {
          this.leads.set(cached.leads.map((l: any) => this.mapLeadFromBackend(l)));
        }
        if (cached.settings) {
          this.spintaxEnabled.set(cached.settings.spintaxEnabled ?? true);
        }
        
        console.log('[App] ✅ Cached state applied, waiting for fresh data...');
      }
    } catch (error) {
      console.warn('[App] Failed to load cached state:', error);
    }
  }
  
  // 🆕 P2-4: 同步離線操作
  private async syncOfflineOperations(operations: any[]): Promise<void> {
    if (!this.offlineCache.isOnline()) {
      console.log('[App] Still offline, skipping sync');
      return;
    }
    
    console.log('[App] 🔄 Syncing', operations.length, 'offline operations');
    
    for (const op of operations) {
      try {
        // 重新發送操作
        this.ipcService.send(op.command, op.payload);
        
        // 標記為已完成
        await this.offlineCache.removeOperation(op.id);
        console.log('[App] ✅ Synced operation:', op.command);
      } catch (error) {
        console.error('[App] Failed to sync operation:', op.command, error);
      }
    }
    
    if (operations.length > 0) {
      this.toastService.success(`✅ 已同步 ${operations.length} 個離線操作`);
    }
  }
  
  // 🆕 P2 優化：重試連接
  retryConnection(): void {
    this.backendConnectionState.set('connecting');
    this.backendConnectionMessage.set('正在重新連接...');
    this.backendConnectionProgress.set(0);
    this.connectionStartTime = Date.now();
    this.startConnectionTimeout();
    // 發送任何命令都會觸發連接確認
    this.ipcService.send('get-initial-state');
  }
  
  private setupIpcListeners(): void {
    // 🆕 P0 優化：監聽連接確認事件（HTTP 成功即連接成功）
    this.ipcService.on('connection-confirmed', (data: { mode: string; timestamp: number }) => {
      console.log('[Frontend] ✅ Connection confirmed:', data);
      this.backendConnectionState.set('connected');
      this.backendConnectionProgress.set(100);
      this.backendConnectionMessage.set('連接成功');
      if (this.connectionTimeoutId) {
        clearTimeout(this.connectionTimeoutId);
        this.connectionTimeoutId = null;
      }
      this.hideConnectionIndicator();
    });
    
    // 🆕 P0 優化：監聯連接錯誤事件
    this.ipcService.on('connection-error', (data: { error: string; message: string }) => {
      console.log('[Frontend] ❌ Connection error:', data);
      // 只有在連接中狀態才更新為錯誤
      if (this.backendConnectionState() === 'connecting') {
        this.backendConnectionState.set('error');
        this.backendConnectionMessage.set(data.message || '連接失敗');
      }
    });
    
    // 🆕 P1 優化：監聽連接模式變更（WebSocket ↔ HTTP 輪詢）
    this.ipcService.on('connection-mode-changed', (data: { mode: 'websocket' | 'polling' }) => {
      console.log('[Frontend] Connection mode changed:', data.mode);
      if (data.mode === 'polling') {
        // 降級模式：顯示黃色指示但不阻擋操作
        // 保持 connected 狀態，因為 HTTP 仍然可用
        console.log('[Frontend] ⚠️ Running in degraded mode (HTTP polling)');
      } else if (data.mode === 'websocket') {
        // WebSocket 恢復
        console.log('[Frontend] ✅ WebSocket connection restored');
      }
    });
    
    // 🆕 監聽載入進度事件（非阻塞式更新狀態指示器）
    this.ipcService.on('loading-progress', (data: { step: string; message: string; progress: number; duration?: number }) => {
      console.log('[Frontend] Loading progress:', data);
      
      // 更新連接狀態指示器
      this.backendConnectionProgress.set(data.progress);
      this.backendConnectionMessage.set(data.message);
      
      // 載入完成時更新狀態
      if (data.step === 'complete') {
        this.backendConnectionState.set('connected');
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }
        this.hideConnectionIndicator();
      }
    });
    
    this.ipcService.on('log-entry', (log: LogEntry) => {
        // Ensure timestamp is a Date object
        log.timestamp = new Date(log.timestamp);
        this.logs.update(logs => [log, ...logs].slice(0, 100));
    });
    
    // 🆕 批量日誌事件處理（減少 IPC 調用次數）
    this.ipcService.on('log-entries-batch', (data: {entries: LogEntry[]}) => {
        if (data.entries && data.entries.length > 0) {
            const processedEntries = data.entries.map(log => ({
                ...log,
                timestamp: new Date(log.timestamp)
            }));
            this.logs.update(logs => [...processedEntries.reverse(), ...logs].slice(0, 100));
        }
    });

    this.ipcService.on('monitoring-status-changed', (status: boolean) => {
        this.isMonitoring.set(status);
        // 重置啟動狀態
        this.isStartingMonitoring.set(false);
    });
    
    this.ipcService.on('monitoring-start-failed', (data: {reason: string, message: string, failed_accounts?: string[], issues?: any[], warnings?: any[]}) => {
        console.log('[Frontend] Monitoring start failed:', data);
        // 重置啟動狀態
        this.isStartingMonitoring.set(false);
        
        if (data.reason === 'config_check_failed') {
            // 🔧 P1: 優化配置檢查失敗提示，添加操作按鈕
            const issues = data.issues || [];
            const warnings = data.warnings || [];
            
            // 檢查是否是帳號離線問題
            const hasOfflineIssue = issues.some((i: any) => 
                i.message?.includes('離線') || i.message?.includes('offline') || i.code === 'no_online_accounts'
            );
            
            // 顯示嚴重問題（帶操作按鈕）
            if (issues.length > 0) {
                const issueMessages = issues.map((i: any) => `• ${i.message}`).join('\n');
                
                if (hasOfflineIssue) {
                    // 帳號離線問題，提供導航到帳號管理的按鈕
                    this.toastService.withActions('error', `配置檢查失敗：\n${issueMessages}`, [
                        { 
                            label: '📱 前往帳號管理', 
                            variant: 'primary', 
                            handler: () => this.navigateToView('manageAccounts') 
                        },
                        { 
                            label: '關閉', 
                            variant: 'secondary', 
                            handler: () => {} 
                        }
                    ], 15000);
                } else {
                    this.toastService.error(`配置檢查失敗：\n${issueMessages}`, 10000);
                }
            }
            
            // 顯示警告（作為單獨的提示）
            if (warnings.length > 0) {
                setTimeout(() => {
                    const warnMessages = warnings.slice(0, 3).map((w: any) => w.message).join('；');
                    this.toastService.warning(`⚠ 其他問題：${warnMessages}`, 8000);
                }, 1000);
            }
        } else if (data.reason === 'no_online_listeners') {
            // 🔧 P1: 優化提示，添加操作按鈕
            this.toastService.withActions('error', '無法啟動監控：沒有在線的監聽賬戶', [
                { 
                    label: '📱 前往帳號管理', 
                    variant: 'primary', 
                    handler: () => this.navigateToView('manageAccounts') 
                },
                { 
                    label: '關閉', 
                    variant: 'secondary', 
                    handler: () => {} 
                }
            ], 10000);
        } else if (data.reason === 'no_groups') {
            this.toastService.error('無法啟動監控：沒有監控群組。請先添加要監控的群組。', 5000);
        } else if (data.reason === 'no_accessible_groups') {
            // 顯示詳細的無法加入原因
            const cannotJoinList = (data as any).cannot_join_list || [];
            if (cannotJoinList.length > 0) {
                const details = cannotJoinList.map((g: any) => `• ${g.url}: ${g.reason || '未知原因'}`).join('\n');
                this.toastService.error(`無法啟動監控：監控號無法訪問任何群組。\n${details}`, 12000);
            } else {
                this.toastService.error('無法啟動監控：監控號無法訪問任何群組。請確保監控號已加入要監控的群組。', 8000);
            }
        } else if (data.reason === 'exception') {
            this.toastService.error(data.message || '啟動監控時發生錯誤', 8000);
        } else {
            this.toastService.error(data.message || '啟動監控失敗', 5000);
        }
    });
    
    // 監控配置檢查報告事件
    this.ipcService.on('monitoring-config-check', (data: {
        passed: boolean,
        critical_issues: Array<{code: string, message: string, fix: string}>,
        warnings: Array<{code: string, message: string, fix: string}>,
        info: string[],
        summary: {can_monitor: boolean, can_send_messages: boolean, critical_count: number, warning_count: number}
    }) => {
        console.log('[Frontend] Monitoring config check:', data);
        
        // 存儲配置檢查結果供顯示
        this.lastConfigCheck.set(data);
        
        // 如果檢查通過但有警告
        if (data.passed && data.warnings.length > 0) {
            // 顯示主要警告 - 使用帶操作按鈕的 Toast
            const mainWarnings = data.warnings.slice(0, 2);
            for (const warning of mainWarnings) {
                const warningCode = warning.code || '';
                const nav = this.errorNavigationMap[warningCode];
                
                if (nav) {
                    // 使用帶操作按鈕的警告 Toast
                    this.toastService.warningWithAction(
                        `⚠ ${warning.message}`,
                        '去設置',
                        () => this.navigateToError(warningCode)
                    );
                } else {
                    // 沒有導航映射時使用普通警告
                    this.toastService.warning(`⚠ ${warning.message}\n修復: ${warning.fix}`, 8000);
                }
            }
            
            // 如果無法發送消息
            if (!data.summary.can_send_messages) {
                setTimeout(() => {
                    this.toastService.warningWithAction(
                        '監控將運行，但 Lead 不會自動發送消息。',
                        '配置規則',
                        () => this.navigateToError('NO_CAMPAIGN')
                    );
                }, 2000);
            }
        }
    });
    
    // 監控狀態報告事件
    this.ipcService.on('monitoring-status-report', (data: {
        total_groups: number,
        accessible_groups: number,
        groups_needing_join: number,
        accessible_list: Array<{url: string, chat_id?: number, title?: string}>,
        needing_join_list: Array<{url: string, is_private?: boolean, reason?: string}>,
        accounts_checked: number
    }) => {
        console.log('[Frontend] Monitoring status report:', data);
        
        // 顯示狀態報告
        if (data.accessible_groups > 0) {
            const accessibleNames = data.accessible_list.slice(0, 3).map(g => g.title || g.url).join(', ');
            const moreText = data.accessible_groups > 3 ? `等 ${data.accessible_groups} 個群組` : '';
            this.toastService.success(`✓ 可監控群組: ${accessibleNames}${moreText}`, 4000);
        }
        
        if (data.groups_needing_join > 0) {
            const needingNames = data.needing_join_list.slice(0, 2).map(g => g.url).join(', ');
            const moreText = data.groups_needing_join > 2 ? `等 ${data.groups_needing_join} 個` : '';
            this.toastService.warning(`⚠ 監控號未加入群組: ${needingNames}${moreText}。正在嘗試自動加入...`, 6000);
        }
        
        // 如果全部群組都需要加入（監控號未入群）
        if (data.accessible_groups === 0 && data.groups_needing_join > 0) {
            this.toastService.warning(`監控號尚未加入任何監控群組。系統將嘗試自動加入公開群組。`, 5000);
        }
    });
    
    this.ipcService.on('template-already-exists', (data: {templateId: number, name: string, message: string}) => {
        console.log('[Frontend] Template already exists:', data);
        this.toastService.warning(data.message || `模板 "${data.name}" 已存在`, 3000);
    });
    
    this.ipcService.on('accounts-updated', (accounts: TelegramAccount[]) => {
        console.log('[Frontend] Received accounts-updated event:', accounts.length, 'accounts');
        const previousCount = this.accounts().length;
        const oldAccounts = this.accounts();
        this.accounts.set(accounts);
        
        // Check for status changes (especially login status)
        accounts.forEach(newAccount => {
            const oldAccount = oldAccounts.find(a => a.id === newAccount.id);
            if (oldAccount && oldAccount.status !== newAccount.status) {
                console.log(`[Frontend] Account ${newAccount.phone} status changed: ${oldAccount.status} -> ${newAccount.status}`);
                if (newAccount.status === 'Online') {
                    this.toastService.success(`账户 ${newAccount.phone} 登录成功`);
                    // Close login dialogs on success
                    this.cancelLogin();
                } else if (newAccount.status === 'Logging in...') {
                    this.toastService.info(`账户 ${newAccount.phone} 正在登录...`);
                } else if (newAccount.status === 'Waiting Code') {
                    // If we have a login state for this account, show code dialog
                    const currentState = this.loginState();
                    if (currentState.accountId === newAccount.id && !currentState.requiresCode) {
                        // Status changed to Waiting Code but we don't have phone_code_hash yet
                        // Wait for login-requires-code event which will have the hash
                        this.toastService.info(`账户 ${newAccount.phone} 等待验证码`);
                    }
                } else if (newAccount.status === 'Waiting 2FA') {
                    // If we have a login state for this account, show 2FA dialog
                    const currentState = this.loginState();
                    if (currentState.accountId === newAccount.id && !currentState.requires2FA) {
                        // Status changed to Waiting 2FA, show dialog
                        this.loginState.set({
                            accountId: newAccount.id,
                            phone: newAccount.phone,
                            requiresCode: false,
                            requires2FA: true,
                            phoneCodeHash: null,
                            isSubmittingCode: false
                        });
                        this.login2FAPassword.set('');
                        this.toastService.info(`账户 ${newAccount.phone} 等待 2FA 密码`);
                    }
                } else if (newAccount.status.includes('Error') || newAccount.status === 'Error') {
                    this.toastService.error(`账户 ${newAccount.phone} 登录失败`);
                    // Close login dialogs on error
                    this.cancelLogin();
                }
            }
        });
        
        // Show success toast if accounts were added/updated
        if (accounts.length > previousCount) {
          this.toastService.success(`账户列表已更新（${accounts.length} 个账户）`);
        }
    });

    this.ipcService.on('account-validation-error', (data: { errors: string[], field?: string, account_data?: any, error_type?: string }) => {
        console.error('Account validation error:', data);
        const errorMessages = Array.isArray(data.errors) ? data.errors : [data.errors || '验证失败'];
        const errorType = data.error_type || 'validation';
        
        // Check if this is a duplicate error
        const isDuplicateError = errorType === 'duplicate' || errorMessages.some(msg => msg.includes('已存在') || msg.includes('already exists'));
        
        // Always show duplicate errors, as they indicate a real issue
        if (isDuplicateError) {
            this.validationErrors.set({ 'account': errorMessages });
            this.toastService.error(errorMessages.join('; '));
            return;
        }
        
        // For other errors, only show if we don't already have accounts (to avoid showing error after successful add)
        const currentAccountCount = this.accounts().length;
        if (currentAccountCount === 0) {
            this.validationErrors.set({ 'account': errorMessages });
            this.toastService.error(`添加账户失败: ${errorMessages.join('; ')}`);
        } else {
            // If accounts exist, this might be a late error event, log it but don't show to user
            console.warn('Validation error received but accounts already exist, ignoring:', errorMessages);
        }
    });

    this.ipcService.on('new-lead-captured', (lead: CapturedLead) => {
        lead.timestamp = new Date(lead.timestamp);
        lead.interactionHistory.forEach(h => h.timestamp = new Date(h.timestamp));
        this.leads.update(leads => [lead, ...leads]);
    });
    
    // 關鍵詞匹配事件 - 實時更新匹配面板
    this.ipcService.on('keyword-matched', (data: {
      keyword: string;
      groupUrl: string;
      groupName: string;
      userId: string;
      username: string;
      firstName: string;
      messagePreview: string;
      timestamp: string;
    }) => {
      console.log('[Frontend] Keyword matched event:', data);
      
      // 添加到實時匹配列表（最多保留 50 條）
      this.realtimeMatches.update(matches => {
        const newMatches = [data, ...matches];
        return newMatches.slice(0, 50);
      });
      
      // 更新今日統計
      this.todayStats.update(s => ({
        ...s,
        matchCount: s.matchCount + 1
      }));
    });
    
    this.ipcService.on('lead-captured', (lead: CapturedLead) => {
        console.log('[Frontend] Lead captured event received:', lead);
        
        // 更新今日統計
        this.todayStats.update(s => ({
          ...s,
          newLeads: s.newLeads + 1
        }));
        
        // 顯示桌面通知
        this.showNotification(
            '新潛在客戶已捕獲',
            `@${lead.username || lead.firstName || '用戶'} 已捕獲`,
            { requireInteraction: true }
        );
        
        // Ensure required fields have defaults
        if (!lead.interactionHistory) {
            lead.interactionHistory = [];
        }
        if (!lead.status) {
            lead.status = 'New';
        }
        if (lead.doNotContact === undefined) {
            lead.doNotContact = false;
        }
        
        lead.timestamp = new Date(lead.timestamp || new Date());
        if (lead.interactionHistory) {
            lead.interactionHistory.forEach(h => h.timestamp = new Date(h.timestamp));
        }
        
        this.leads.update(leads => {
            // Check if lead already exists
            const existingIndex = leads.findIndex(l => l.userId === lead.userId);
            if (existingIndex >= 0) {
                leads[existingIndex] = lead;
                return [...leads];
            }
            return [lead, ...leads];
        });
        
        // Show toast notification
        const displayName = lead.username ? `@${lead.username}` : (lead.firstName || lead.userId);
        this.toastService.success(`🎯 ${this.t('newLeadCaptured')}: ${displayName}`, 4000);
    });
    
    this.ipcService.on('session-files-cleaned', (data: {deleted_count: number, kept_count: number, deleted_files: string[]}) => {
        this.toastService.success(`清理完成：删除了 ${data.deleted_count} 个孤立文件，保留了 ${data.kept_count} 个有效文件`);
        console.log('[Frontend] Session files cleaned:', data);
    });
    
    this.ipcService.on('session-files-cleanup-error', (data: {error: string}) => {
        this.toastService.error(`清理失败：${data.error}`);
        console.error('[Frontend] Session files cleanup error:', data);
    });

    // === Session 導入事件 ===
    this.ipcService.on('session-import-result', (data: {success: boolean, message: string, phone?: string, count?: number}) => {
        console.log('[Frontend] Session import result:', data);
        if (data.success) {
            this.toastService.success(data.phone ? `✅ Session 導入成功: ${data.phone}` : `✅ 導入完成: ${data.count || 1} 個帳號`, 3000);
            // 刷新帳號列表
            this.ipcService.send('get-initial-state');
        } else {
            this.toastService.error(`導入失敗: ${data.message}`, 4000);
        }
    });

    this.ipcService.on('session-import-needs-credentials', (data: {filePath: string, phoneNumber: string, message: string}) => {
        console.log('[Frontend] Session import needs credentials:', data);
        this.toastService.warning(`⚠️ 導入 ${data.phoneNumber} 需要 API 憑據`, 4000);
        // 可以在這裡打開一個對話框讓用戶輸入 API 憑據
        // 暫時提示用戶去 API 憑據池頁面獲取
        this.toastService.info('請先在「API 憑據池」頁面添加 API 憑據，然後重試導入', 5000);
    });

    // === 孤立 Session 檢測事件 ===
    this.ipcService.on('orphan-sessions-detected', (data: {count: number, sessions: any[], message: string}) => {
        console.log('[Frontend] Orphan sessions detected:', data);
        if (data.count > 0) {
            this.orphanSessions.set(data.sessions);
            this.showOrphanSessionDialog.set(true);
            this.toastService.warning(`發現 ${data.count} 個需要手動恢復的 Session 文件`, 5000);
        }
    });

    this.ipcService.on('orphan-sessions-scanned', (data: {success: boolean, orphan_sessions: any[], message: string}) => {
        console.log('[Frontend] Orphan sessions scanned:', data);
        if (data.success && data.orphan_sessions.length > 0) {
            this.orphanSessions.set(data.orphan_sessions);
        }
    });

    this.ipcService.on('orphan-sessions-recovered', (data: {success: boolean, recovered_count: number, failed_count: number, message: string}) => {
        console.log('[Frontend] Orphan sessions recovered:', data);
        this.isRecoveringOrphanSessions.set(false);
        if (data.success) {
            this.toastService.success(`成功恢復 ${data.recovered_count} 個帳號`, 3000);
            this.showOrphanSessionDialog.set(false);
            this.orphanSessions.set([]);
            // 刷新帳號列表
            this.ipcService.send('get-accounts');
        } else {
            this.toastService.error(`恢復失敗: ${data.message}`, 4000);
        }
    });

    // Validation error handlers for automation center
    this.ipcService.on('keyword-set-validation-error', (data: {errors: string[], name?: string}) => {
        console.error('[Frontend] Keyword set validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加关键词集失败';
        this.toastService.error(`关键词集错误: ${errorMsg}`);
    });
    
    this.ipcService.on('keyword-set-error', (data: {success: boolean, error?: string, message?: string, keywordSetId?: number, name?: string, details?: string}) => {
        console.log('[Frontend] Keyword set error event:', data);
        if (data.success) {
            if (data.message) {
                this.toastService.success(data.message);
            }
            // Clear the input field on success
            this.newKeywordSet.set({ name: '' });
        } else {
            const errorMsg = data.error || '添加关键词集失败';
            console.warn('[Frontend] Keyword set error:', errorMsg, data.details);
            
            // Check if it's a duplicate error - show as warning, not error
            if (errorMsg.includes('已存在') || errorMsg.includes('already exists')) {
                this.toastService.warning(`关键词集已存在`, 3000);
            } else if (errorMsg.includes('不存在') || errorMsg.includes('not found')) {
                // Already deleted - this is fine, don't show error
                console.log('[Frontend] Keyword set already deleted, ignoring');
            } else if (errorMsg.includes('数据庫') || errorMsg.includes('数据库') || errorMsg.includes('損壞') || errorMsg.includes('损坏')) {
                // Database corruption - show prominent warning
                this.toastService.error(`数据库错误: ${errorMsg}。请使用 rebuild_database.py 重建数据库。`, 10000);
            } else {
                // Other errors
                this.toastService.error(`关键词集错误: ${errorMsg}`);
            }
        }
    });
    
    this.ipcService.on('keyword-validation-error', (data: {errors: string[], keyword?: string, is_regex?: boolean}) => {
        console.error('[Frontend] Keyword validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加关键词失败';
        this.toastService.error(`关键词错误: ${errorMsg}`);
    });
    
    this.ipcService.on('group-validation-error', (data: {errors: string[], url?: string, name?: string}) => {
        console.error('[Frontend] Group validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加群组失败';
        this.toastService.error(`群组错误: ${errorMsg}`);
    });
    
    // 群組成員狀態檢查結果
    this.ipcService.on('group-membership-status', (data: {
        url: string,
        status: {
            is_member?: boolean,
            can_join?: boolean,
            is_private?: boolean,
            account?: string,
            chat_title?: string,
            reason?: string
        }
    }) => {
        console.log('[Frontend] Group membership status:', data);
        
        if (data.status.is_member) {
            this.toastService.success(`✓ 監控號已在群組中: ${data.status.chat_title || data.url}`, 3000);
        } else if (data.status.can_join) {
            if (data.status.is_private) {
                this.toastService.warning(`⚠ 監控號未加入此私有群組，需要手動將監控號加入群組`, 5000);
            } else {
                this.toastService.info(`ℹ 監控號未加入此群組，啟動監控時將自動加入`, 4000);
            }
        }
    });
    
    // 群組加入結果
    this.ipcService.on('group-join-result', (data: {
        success: boolean,
        phone: string,
        groupUrl: string,
        chatTitle?: string,
        chatId?: number,
        alreadyMember?: boolean,
        error?: string
    }) => {
        console.log('[Frontend] Group join result:', data);
        
        if (data.success) {
            if (data.alreadyMember) {
                this.toastService.success(`${data.phone} 已經在群組 ${data.chatTitle || data.groupUrl} 中`, 3000);
            } else {
                this.toastService.success(`${data.phone} 成功加入群組 ${data.chatTitle || data.groupUrl}`, 4000);
            }
        } else {
            this.toastService.error(`加入群組失敗: ${data.error}`, 5000);
        }
    });
    
    this.ipcService.on('template-validation-error', (data: {errors: string[], template_data?: any}) => {
        console.error('[Frontend] Template validation error:', data);
        const errorMsg = data.errors?.join('; ') || '添加模板失败';
        this.toastService.error(`模板错误: ${errorMsg}`);
    });
    
    this.ipcService.on('campaign-validation-error', (data: {errors: string[], campaign_data?: any}) => {
        console.error('[Frontend] Campaign validation error:', data);
        const errorMsg = data.errors?.join('; ') || '创建活动失败';
        this.toastService.error(`活动错误: ${errorMsg}`);
    });
    
    this.ipcService.on('login-requires-code', (data: {accountId: number, phone: string, phoneCodeHash: string, sendType?: string, message?: string, canRetrySMS?: boolean, waitSeconds?: number}) => {
        console.log('[Frontend] Received login-requires-code event:', data);
        console.log('[Frontend] Current loginState before update:', this.loginState());
        this.loginState.set({
            accountId: data.accountId,
            phone: data.phone,
            requiresCode: true,
            requires2FA: false,
            phoneCodeHash: data.phoneCodeHash,
            isSubmittingCode: false,  // Reset submitting state
            canRetrySMS: data.canRetrySMS || false,
            waitSeconds: data.waitSeconds
        } as any);
        console.log('[Frontend] Updated loginState:', this.loginState());
        console.log('[Frontend] requiresCode value:', this.loginState().requiresCode);
        this.loginCode.set('');
        
        // Show message based on send type
        if (data.message) {
            // Use the message from backend (which is optimized for APP-only)
            if (data.sendType === 'app') {
                this.toastService.info(data.message, 8000);
            } else {
                this.toastService.info(data.message);
            }
        } else if (data.sendType === 'app') {
            this.toastService.info('验证码已发送到您的 Telegram 应用。请检查您手机上已登录的 Telegram 应用，查看验证码消息。', 8000);
        } else if (data.sendType === 'sms') {
            this.toastService.info(`验证码已发送到 ${data.phone} 的短信，请输入验证码`);
        } else {
            this.toastService.info(`验证码已发送到 ${data.phone}，请输入验证码`);
        }
    });
    
    this.ipcService.on('login-requires-2fa', (data: {accountId: number, phone: string}) => {
        console.log('[Frontend] Received login-requires-2fa event:', data);
        this.loginState.set({
            accountId: data.accountId,
            phone: data.phone,
            requiresCode: false,
            requires2FA: true,
            phoneCodeHash: null,
            isSubmittingCode: false  // Reset submitting state
        });
        this.login2FAPassword.set('');
        this.toastService.info('请输入 2FA 密码');
    });
    
    this.ipcService.on('account-login-error', (data: {accountId: number, phone: string, status: string, message: string, friendlyMessage: string, codeExpired?: boolean, floodWait?: number}) => {
        console.error('[Frontend] Account login error:', data);
        
        // Handle FloodWait error with friendly time format
        if (data.floodWait) {
            const waitSeconds = data.floodWait;
            const hours = Math.floor(waitSeconds / 3600);
            const minutes = Math.floor((waitSeconds % 3600) / 60);
            const seconds = waitSeconds % 60;
            
            let timeStr = '';
            if (hours > 0) {
                timeStr = `${hours} 小时`;
                if (minutes > 0) {
                    timeStr += ` ${minutes} 分钟`;
                }
            } else if (minutes > 0) {
                timeStr = `${minutes} 分钟`;
                if (seconds > 0) {
                    timeStr += ` ${seconds} 秒`;
                }
            } else {
                timeStr = `${seconds} 秒`;
            }
            
            const floodWaitMsg = `请求过于频繁，请等待 ${timeStr} 后再试。验证码未发送。`;
            this.toastService.error(floodWaitMsg);
            console.error('FloodWait error:', { waitSeconds, timeStr });
        } else {
            this.toastService.error(data.friendlyMessage || data.message);
        }
        
        // Show detailed error in console for debugging
        console.error('Login error details:', {
            accountId: data.accountId,
            phone: data.phone,
            status: data.status,
            message: data.message,
            codeExpired: data.codeExpired,
            floodWait: data.floodWait
        });
        
        // Reset submitting state
        const state = this.loginState();
        this.loginState.set({
            accountId: state.accountId,
            phone: state.phone,
            requiresCode: state.requiresCode,
            requires2FA: state.requires2FA,
            phoneCodeHash: state.phoneCodeHash,
            isSubmittingCode: false
        });
        
        // If FloodWait, close dialog and reset state
        if (data.floodWait) {
            this.cancelLogin();
            return;
        }
        
        // If code expired, reset login state to allow resending
        if (data.codeExpired) {
            this.loginState.set({
                accountId: state.accountId,
                phone: state.phone,
                requiresCode: false,  // Reset to allow resending
                requires2FA: false,
                phoneCodeHash: null,
                isSubmittingCode: false
            });
            this.loginCode.set('');
        } else {
            // For other errors, keep dialog open if it's a temporary error
            // (don't close for invalid code, but close for permanent errors like banned)
            if (data.message && (data.message.includes('banned') || data.message.includes('invalid phone'))) {
                // Close dialog for permanent errors
                this.cancelLogin();
            } else if (data.message && data.message.includes('Invalid verification code')) {
                // For invalid code, show dialog again to allow retry
                this.loginState.set({
                    accountId: state.accountId,
                    phone: state.phone,
                    requiresCode: true,  // Show code dialog again
                    requires2FA: false,
                    phoneCodeHash: state.phoneCodeHash,
                    isSubmittingCode: false
                });
            }
        }
    });
    
    this.ipcService.on('account-status-updated', (data: any) => {
        // Account status was updated, refresh accounts list
        // The accounts-updated event will be sent separately
    });

    // 🆕 漸進式載入：分階段接收數據，讓 UI 盡快顯示
    this.ipcService.on('initial-state-core', (state: any) => {
        console.log('[Frontend] 🚀 Received initial-state-core (accounts + settings)');
        if (state?.accounts) {
            this.accounts.set(state.accounts);
            console.log('[Frontend] Accounts loaded:', state.accounts.length);
        }
        if (state?.settings) {
            // 設置分散的 settings signals
            this.spintaxEnabled.set(state.settings.spintaxEnabled ?? true);
            this.autoReplyEnabled.set(state.settings.autoReplyEnabled ?? false);
            this.autoReplyMessage.set(state.settings.autoReplyMessage || "Thanks for getting back to me! I'll read your message and respond shortly.");
            this.smartSendingEnabled.set(state.settings.smartSendingEnabled ?? true);
        }
        if (state?.isMonitoring !== undefined) {
            this.isMonitoring.set(state.isMonitoring);
        }
        // 標記核心數據已載入，UI 可以開始渲染
        console.log('[App] Setting coreDataLoaded to true');
        this.coreDataLoaded.set(true);
        console.log('[App] coreDataLoaded is now:', this.coreDataLoaded());
    });
    
    this.ipcService.on('initial-state-config', (state: any) => {
        console.log('[Frontend] 📋 Received initial-state-config');
        if (state?.keywordSets) {
            this.keywordSets.set(state.keywordSets);
        }
        if (state?.monitoredGroups) {
            this.monitoredGroups.set(state.monitoredGroups);
        }
        if (state?.campaigns) {
            this.campaigns.set(state.campaigns);
        }
        if (state?.messageTemplates) {
            this.messageTemplates.set(state.messageTemplates);
        }
    });
    
    this.ipcService.on('initial-state-data', (state: any) => {
        console.log('[Frontend] 📊 Received initial-state-data (leads + logs)');
        console.log('[Frontend] leads count:', state?.leads?.length, 'total:', state?.leadsTotal, 'hasMore:', state?.leadsHasMore);
        
        if (state?.leads) {
            const mappedLeads = (state.leads || []).map((l: any) => this.mapLeadFromBackend(l));
            this.leads.set(mappedLeads);
            // 同步到資源中心
            this.contactsService.importLeadsDirectly(mappedLeads);
            console.log('[Frontend] Initial leads synced to resource center:', mappedLeads.length);
        }
        if (state?.leadsTotal !== undefined) {
            this.leadsTotal.set(state.leadsTotal);
        }
        if (state?.leadsHasMore !== undefined) {
            this.leadsHasMore.set(state.leadsHasMore);
        }
        // 🆕 如果初始數據少於總數，自動加載全部
        if (state?.leads && state?.leadsTotal && state.leads.length < state.leadsTotal) {
            console.log('[Frontend] 🔄 Auto-loading remaining leads...');
            this.leadsHasMore.set(true);
            this.leadsLoading.set(false);  // 🆕 確保 loading 狀態為 false
            setTimeout(() => this.loadRemainingLeads(), 500);
        }
        if (state?.logs) {
            this.logs.set(state.logs);
        }
    });
    
    this.ipcService.on('initial-state', (state: any) => {
        console.log('[Frontend] ★★★ Received initial-state event ★★★');
        console.log('[Frontend] initial-state payload:', state);
        console.log('[Frontend] accounts in payload:', state?.accounts?.length || 0);
        
        // Debounce rapid initial-state updates (min 500ms between updates to reduce memory pressure)
        const now = Date.now();
        if (now - this.lastInitialStateTime < 500) {
            // Clear existing timer and set a new one
            if (this.initialStateDebounceTimer) {
                clearTimeout(this.initialStateDebounceTimer);
            }
            this.initialStateDebounceTimer = setTimeout(() => {
                try {
                    this.applyInitialState(state);
                } catch (error) {
                    console.error('[Frontend] Error applying initial state:', error);
                } finally {
                    this.initialStateDebounceTimer = undefined;
                }
            }, 500);
            return;
        }
        this.lastInitialStateTime = now;
        try {
            this.applyInitialState(state);
        } catch (error) {
            console.error('[Frontend] Error applying initial state:', error);
        }
    });
    
    // Partial update event listeners - more efficient than full state refresh
    // 添加防抖機制，防止頻繁更新
    this.ipcService.on('keyword-sets-updated', (data: {keywordSets: any[]}) => {
        // 只在開發模式下記錄詳細日誌，減少生產環境的內存開銷
        if (typeof console !== 'undefined' && console.log) {
            console.log('[Frontend] Received keyword-sets-updated:', data.keywordSets?.length || 0);
        }
        
        // 清除之前的防抖計時器
        if (this.keywordSetsUpdateDebounceTimer) {
            clearTimeout(this.keywordSetsUpdateDebounceTimer);
            this.keywordSetsUpdateDebounceTimer = undefined;
        }
        
        // 使用後端返回的數據同步狀態（這會覆蓋樂觀更新，確保數據一致性）
        if (data.keywordSets && Array.isArray(data.keywordSets)) {
            // 防抖處理：延遲 150ms 更新，如果 150ms 內收到新的更新，則取消之前的更新
            // 增加延遲時間以減少更新頻率
            this.keywordSetsUpdateDebounceTimer = setTimeout(() => {
                try {
                    // 去重處理：確保每個關鍵詞集和關鍵詞都是唯一的
                    const seenSetIds = new Set<number>();
                    const deduplicatedSets = data.keywordSets
                        .filter(set => {
                            // 驗證 set 對象的有效性
                            if (!set || typeof set.id !== 'number') {
                                return false;
                            }
                            // 基於 ID 去重關鍵詞集
                            if (seenSetIds.has(set.id)) {
                                return false;
                            }
                            seenSetIds.add(set.id);
                            return true;
                        })
                        .map(set => {
                            // 確保 keywords 是數組
                            const keywords = Array.isArray(set.keywords) ? set.keywords : [];
                            // 對關鍵詞進行去重（基於 keyword + isRegex 組合）
                            const seenKeywords = new Set<string>();
                            const uniqueKeywords = keywords
                                .filter((k: KeywordConfig) => {
                                    if (!k || typeof k.keyword !== 'string') {
                                        return false;
                                    }
                                    const key = `${k.keyword}_${k.isRegex}`;
                                    if (seenKeywords.has(key)) {
                                        return false;
                                    }
                                    seenKeywords.add(key);
                                    return true;
                                });
                            return {
                                ...set,
                                keywords: uniqueKeywords
                            };
                        });
                    
                    // 只在狀態實際改變時更新，避免不必要的重渲染
                    const currentSets = this.keywordSets();
                    const hasChanged = JSON.stringify(currentSets) !== JSON.stringify(deduplicatedSets);
                    if (hasChanged) {
                        this.keywordSets.set(deduplicatedSets);
                    }
                } catch (error) {
                    // 捕獲任何錯誤，避免崩潰
                    console.error('[Frontend] Error processing keyword-sets-updated:', error);
                } finally {
                    this.keywordSetsUpdateDebounceTimer = undefined;
                }
            }, 150);
        } else {
            // 如果數據無效，設置為空數組（但只在當前不是空數組時更新）
            const currentSets = this.keywordSets();
            if (currentSets.length > 0) {
                this.keywordSets.set([]);
            }
        }
    });
    
    // 監聽關鍵詞驗證錯誤事件
    this.ipcService.on('keyword-validation-error', (data: {errors: string[], keyword?: string}) => {
        console.log('[Frontend] Keyword validation error:', data);
        if (data.errors && data.errors.length > 0) {
            this.toastService.error(`關鍵詞驗證失敗: ${data.errors.join(', ')}`, 4000);
            // 如果驗證失敗，需要恢復狀態（撤銷樂觀更新）
            // 但不要立即請求初始狀態，而是等待後端發送更新事件
            // 後端應該在驗證錯誤後發送 keyword-sets-updated 事件來同步狀態
            // 如果 1 秒後還沒有收到更新，再請求初始狀態
            setTimeout(() => {
                // 檢查是否已經收到了更新（通過檢查 keywordSets 是否已更新）
                // 這裡我們依賴後端發送的更新事件，而不是主動請求
            }, 1000);
        }
    });
    
    this.ipcService.on('groups-updated', (data: {monitoredGroups: any[]}) => {
        console.log('[Frontend] Received groups-updated:', data.monitoredGroups?.length || 0);
        this.monitoredGroups.set(data.monitoredGroups || []);
    });
    
    this.ipcService.on('templates-updated', (data: {messageTemplates: any[]}) => {
        console.log('[Frontend] Received templates-updated:', data.messageTemplates?.length || 0);
        this.messageTemplates.set(data.messageTemplates || []);
    });
    
    this.ipcService.on('campaigns-updated', (data: {campaigns: any[]}) => {
        console.log('[Frontend] Received campaigns-updated:', data.campaigns?.length || 0);
        this.campaigns.set(data.campaigns || []);
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // 監聽活動已存在事件
    this.ipcService.on('campaign-already-exists', (data: {campaignId: number, name: string, message: string}) => {
        console.log('[Frontend] Campaign already exists:', data);
        this.toastService.warning(data.message || `活動 "${data.name}" 已存在`, 4000);
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // 監聽活動驗證錯誤事件
    this.ipcService.on('campaign-validation-error', (data: {errors: string[], campaign_data?: any}) => {
        console.log('[Frontend] Campaign validation error:', data);
        if (data.errors && data.errors.length > 0) {
            this.toastService.error(`活動驗證失敗: ${data.errors.join(', ')}`, 4000);
        }
        // 重置提交狀態
        this.isSubmittingCampaign.set(false);
    });
    
    // Search leads result
    this.ipcService.on('search-leads-result', (data: { success: boolean, results?: any[], error?: string }) => {
      this.isSearchingLeads.set(false);
      if (data.success && data.results) {
        this.leadSearchResults.set(data.results);
        if (data.results.length === 0) {
          this.toastService.info('未找到匹配的潜在客户');
        }
      } else {
        this.toastService.error(data.error || '搜索失败');
        this.leadSearchResults.set([]);
      }
    });
    
    // Backup management events
    this.ipcService.on('backup-created', (data: { success: boolean, backupId?: string, error?: string }) => {
      this.isCreatingBackup.set(false);
      if (data.success) {
        this.toastService.success('备份创建成功');
        this.loadBackups();
      } else {
        this.toastService.error(data.error || '备份创建失败');
      }
    });
    
    this.ipcService.on('backups-list', (data: { success: boolean, backups?: any[], error?: string }) => {
      if (data.success && data.backups) {
        this.backups.set(data.backups);
      }
    });
    
    this.ipcService.on('backup-restored', (data: { success: boolean, error?: string }) => {
      this.isRestoringBackup.set(false);
      if (data.success) {
        this.toastService.success('备份恢复成功，请刷新页面');
      } else {
        this.toastService.error(data.error || '备份恢复失败');
      }
    });
    
    this.ipcService.on('backup-deleted', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.toastService.success('备份已删除');
        this.loadBackups();
      } else {
        this.toastService.error(data.error || '删除备份失败');
      }
    });
    
    this.ipcService.on('leads-updated', (data: {leads: any[], total?: number}) => {
        const total = data.total ?? data.leads?.length ?? 0;
        console.log('[Frontend] Received leads-updated:', data.leads?.length || 0, 'total:', total);
        const mappedLeads = (data.leads || []).map((l: any) => this.mapLeadFromBackend(l));
        this.leads.set(mappedLeads);
        this.leadsTotal.set(total);
        
        // 🆕 同時更新資源中心，使用同一份數據
        this.contactsService.importLeadsDirectly(mappedLeads);
    });
    
    // 🆕 處理分頁加載的 leads 數據
    this.ipcService.on('leads-paginated', (data: {leads: any[], total: number, hasMore: boolean}) => {
        console.log('[Frontend] Received leads-paginated:', data.leads?.length || 0, 'total:', data.total);
        this.leadsLoading.set(false);
        
        if (data.leads && data.leads.length > 0) {
            const mappedLeads = data.leads.map((l: any) => this.mapLeadFromBackend(l));
            this.leads.set(mappedLeads);
            this.leadsTotal.set(data.total);
            this.leadsHasMore.set(data.hasMore);
            
            // 🆕 強制同步到資源中心（使用已映射的數據）
            this.contactsService.importLeadsDirectly(mappedLeads);
            console.log('[Frontend] ✅ Synced to resource center:', mappedLeads.length, 'leads');
            
            // 🆕 顯示提示
            if (!data.hasMore) {
                this.toastService.success(`數據加載完成：共 ${mappedLeads.length} 條`);
            }
        }
    });
    
    // 漏斗統計事件
    this.ipcService.on('funnel-stats', (data: any) => {
        console.log('[Frontend] Received funnel-stats:', data);
        if (!data.error) {
            this.funnelStats.set(data);
        }
    });
    
    // Funnel Overview 事件 (Phase 4)
    this.ipcService.on('funnel-overview', (data: any) => {
      this.isLoadingFunnel.set(false);
      if (data.success) {
        this.funnelOverview.set({
          stages: data.stages || [],
          totalLeads: data.total_leads || 0,
          convertedLeads: data.converted_leads || 0,
          averageConversionDays: data.average_days || 0,
          conversionRate: data.conversion_rate || 0
        });
      }
    });
    
    // User Journey 事件 (Phase 4)
    this.ipcService.on('user-journey', (data: any) => {
      this.isLoadingJourney.set(false);
      if (data.success && data.journey) {
        this.userJourneyData.set({
          userId: data.userId,
          stages: data.journey.transitions || [],
          currentStage: data.journey.current_stage || 'new',
          totalDays: data.journey.total_days || 0,
          isConverted: data.journey.is_converted || false
        });
      }
    });
    
    // Funnel Stage Transitioned 事件 (Phase 4)
    this.ipcService.on('funnel-stage-transitioned', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 漏斗階段已更新: ${data.stage}`);
        this.loadFunnelOverview();
        this.loadFunnelStats();
      } else {
        this.toastService.error(`更新失敗: ${data.error}`);
      }
    });
    
    // Marketing Stats 事件 (Phase 4)
    this.ipcService.on('marketing-stats', (data: any) => {
      this.isLoadingMarketing.set(false);
      if (data.success !== false) {
        this.marketingStats.set({
          totalCampaigns: data.total_campaigns || 0,
          running: data.running || 0,
          completed: data.completed || 0,
          totalMessages: data.total_messages || 0,
          totalInvites: data.total_invites || 0,
          successRate: data.success_rate || 0
        });
      }
    });
    
    // Marketing Campaigns 事件 (Phase 4)
    this.ipcService.on('marketing-campaigns', (data: any) => {
      if (data.success && data.campaigns) {
        this.marketingCampaigns.set(data.campaigns);
      }
    });
    
    // Campaign Created 事件 (Phase 4)
    this.ipcService.on('campaign-created', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 營銷活動已創建');
        this.showCreateCampaignDialog.set(false);
        this.newMarketingCampaign = { name: '', type: 'pm', targetGroup: '', messageTemplate: '' };
        this.loadMarketingCampaigns();
      } else {
        this.toastService.error(`創建失敗: ${data.error}`);
      }
    });
    
    // Campaign Started/Complete 事件 (Phase 4)
    this.ipcService.on('campaign-started', (data: any) => {
      if (data.success) {
        this.toastService.info('🚀 營銷活動已啟動');
        this.loadMarketingCampaigns();
      }
    });
    
    this.ipcService.on('campaign-complete', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 活動完成！成功: ${data.stats?.success || 0}, 失敗: ${data.stats?.failed || 0}`);
        this.loadMarketingStats();
        this.loadMarketingCampaigns();
      }
    });
    
    // Warmup Progress 事件 (Phase 4)
    this.ipcService.on('warmup-progress', (data: any) => {
      if (data.success && data.accountId) {
        this.warmupDetails.update(details => ({
          ...details,
          [data.accountId]: {
            enabled: data.enabled || false,
            startDate: data.start_date || null,
            stage: data.stage?.stage || 0,
            stageName: data.stage?.stage_name || '',
            daysCompleted: data.days_completed || 0,
            totalDays: data.total_days || 14,
            progressPercent: data.progress_percentage || 0,
            dailyLimit: data.stage?.daily_limit || 0,
            allowedActions: data.stage?.allowed_actions || []
          }
        }));
      }
    });
    
    // ==================== Phase 5: System Management Events ====================
    
    // Migration Events
    this.ipcService.on('migration-status', (data: any) => {
      this.isLoadingMigration.set(false);
      if (!data.error) {
        this.migrationStatus.set({
          currentVersion: data.current_version || 0,
          latestVersion: data.latest_version || 0,
          appliedCount: data.applied_count || 0,
          pendingCount: data.pending_count || 0,
          appliedMigrations: data.applied_migrations || [],
          pendingMigrations: data.pending_migrations || []
        });
      }
    });
    
    this.ipcService.on('migration-completed', (data: any) => {
      this.isRunningMigration.set(false);
      if (data.error) {
        this.toastService.error(`遷移失敗: ${data.error}`);
      } else {
        this.toastService.success('✅ 數據庫遷移完成');
        this.loadMigrationStatus();
      }
    });
    
    this.ipcService.on('rollback-completed', (data: any) => {
      this.isRunningMigration.set(false);
      if (data.error) {
        this.toastService.error(`回滾失敗: ${data.error}`);
      } else {
        this.toastService.success('✅ 數據庫回滾完成');
        this.loadMigrationStatus();
      }
    });
    
    // Scheduler Events
    this.ipcService.on('scheduler-status', (data: any) => {
      if (data.success !== false) {
        this.schedulerStatus.set({
          isRunning: data.is_running || false,
          tasks: data.tasks || []
        });
      }
    });
    
    this.ipcService.on('scheduler-started', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 調度器已啟動');
        this.loadSchedulerStatus();
      }
    });
    
    this.ipcService.on('scheduler-stopped', (data: any) => {
      if (data.success) {
        this.toastService.info('調度器已停止');
        this.loadSchedulerStatus();
      }
    });
    
    this.ipcService.on('scheduler-task-result', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 任務 ${data.taskName} 執行完成`);
      } else {
        this.toastService.error(`任務執行失敗: ${data.error}`);
      }
      this.loadSchedulerStatus();
    });
    
    // Log File Events
    this.ipcService.on('log-files', (data: any) => {
      this.isLoadingLogs.set(false);
      if (data.files) {
        this.logFiles.set(data.files.map((f: any) => ({
          name: f.name,
          size: f.size,
          sizeFormatted: this.formatFileSize(f.size),
          modifiedAt: f.modified_at,
          isCompressed: f.name.endsWith('.gz')
        })));
      }
    });
    
    this.ipcService.on('log-stats', (data: any) => {
      if (!data.error) {
        this.logStats.set({
          totalFiles: data.total_files || 0,
          totalSize: data.total_size || 0,
          totalSizeFormatted: this.formatFileSize(data.total_size || 0),
          compressedFiles: data.compressed_files || 0,
          oldestFile: data.oldest_file,
          newestFile: data.newest_file
        });
      }
    });
    
    this.ipcService.on('logs-rotated', (data: any) => {
      this.isRotatingLogs.set(false);
      if (data.success) {
        this.toastService.success(`✅ 日誌輪轉完成，輪轉了 ${data.rotated_count || 0} 個文件`);
        this.loadLogFiles();
        this.loadLogStats();
      } else {
        this.toastService.error(`日誌輪轉失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('log-file-content', (data: any) => {
      if (data.content) {
        this.logFileContent.set(data.content);
      }
    });
    
    this.ipcService.on('log-file-deleted', (data: any) => {
      if (data.success) {
        this.toastService.success('✅ 日誌文件已刪除');
        this.loadLogFiles();
        this.loadLogStats();
      }
    });
    
    // Resource Batch Events
    this.ipcService.on('resources-batch-updated', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 已更新 ${data.count || 0} 個資源`);
        this.loadResources();
      }
    });
    
    this.ipcService.on('resources-batch-deleted', (data: any) => {
      if (data.success) {
        this.toastService.success(`✅ 已刪除 ${data.count || 0} 個資源`);
        this.loadResources();
      }
    });

    this.ipcService.on('resources-cleared', (data: any) => {
      if (data.success) {
        this.toastService.success(`🗑️ 已清空所有資源，共 ${data.deletedCount || 0} 條`);
        this.refreshResourceStats();
      } else {
        this.toastService.error(`清空失敗: ${data.error}`);
      }
    });
    
    // 🆕 清理資源完成
    this.ipcService.on('clear-resources-complete', (data: { success: boolean, deleted_count?: number, type?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`🧹 清理完成，已刪除 ${data.deleted_count || 0} 條記錄`);
        this.discoveredResources.set([]);
        this.refreshResourceStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });

    // 用戶列表事件
    this.ipcService.on('users-with-profiles', (data: any) => {
        console.log('[Frontend] Received users-with-profiles:', data.users?.length || 0);
        if (!data.error) {
            this.usersWithProfiles.set(data);
        }
    });
    
    // === 一鍵啟動事件 ===
    this.ipcService.on('one-click-start-progress', (data: {step: string, message: string, progress: number}) => {
        console.log('[Frontend] One-click progress:', data);
        this.oneClickProgress.set(data.progress);
        this.oneClickMessage.set(data.message);
    });
    
    // 🆕 群組加入進度事件（漸進式更新）
    this.ipcService.on('group-join-progress', (data: {current: number, total: number, url: string}) => {
        const progressMsg = `👥 正在檢查群組 ${data.current}/${data.total}...`;
        this.oneClickMessage.set(progressMsg);
        // 計算進度：群組階段佔 42-48%
        const groupProgress = 42 + (data.current / data.total) * 6;
        this.oneClickProgress.set(Math.round(groupProgress));
    });
    
    // 🆕 群組加入完成事件
    this.ipcService.on('group-join-complete', (data: {success_count: number, pending_count: number, failed_count: number, total: number, skipped_cached?: number}) => {
        console.log('[Frontend] Group join complete:', data);
        const cachedInfo = data.skipped_cached ? ` (${data.skipped_cached} 個緩存命中)` : '';
        this.oneClickMessage.set(`✅ 群組加入完成: ${data.success_count}/${data.total} 成功${cachedInfo}`);
    });
    
    this.ipcService.on('one-click-start-result', (data: any) => {
        console.log('[Frontend] One-click result:', data);
        this.oneClickStarting.set(false);
        this.oneClickStartReport.set(data);  // 保存報告
        this.showStartReport.set(true);  // 顯示報告面板
        if (data.overall_success) {
            this.toastService.success('🎉 一鍵啟動成功！系統已就緒', 5000);
        } else {
            this.toastService.warning('⚠️ 部分功能啟動失敗，請檢查日誌', 5000);
        }
        // 刷新系統狀態
        this.loadSystemStatus();
    });
    
    this.ipcService.on('one-click-stop-result', (data: {success: boolean, error?: string}) => {
        console.log('[Frontend] One-click stop result:', data);
        if (data.success) {
            this.toastService.info('🛑 所有服務已停止', 3000);
        }
        this.loadSystemStatus();
    });
    
    this.ipcService.on('system-status', (data: any) => {
        console.log('[Frontend] System status:', data);
        if (!data.error) {
            this.systemStatus.set(data);
        }
    });
    
    // 觸發規則變更後刷新系統狀態
    this.ipcService.on('trigger-rules-result', (data: any) => {
        if (data.success) {
            // 延遲刷新以確保後端數據已更新
            setTimeout(() => this.loadSystemStatus(), 100);
        }
    });
    
    this.ipcService.on('ai-settings-updated', (data: any) => {
        console.log('[Frontend] AI settings updated:', data);
        if (data.auto_chat_enabled !== undefined) {
            this.aiAutoChatEnabled.set(data.auto_chat_enabled);
        }
        if (data.auto_chat_mode) {
            this.aiAutoChatMode.set(data.auto_chat_mode);
        }
    });
    
    // 批量更新完成事件
    this.ipcService.on('bulk-update-complete', (data: {success: boolean, type?: string, count?: number, error?: string}) => {
        console.log('[Frontend] Bulk update complete:', data);
        if (data.success) {
            this.toastService.success(`已更新 ${data.count} 個用戶`);
            this.selectedUserIds.set([]);
            this.loadUsersWithProfiles();
            this.loadFunnelStats();
        } else {
            this.toastService.error(`更新失敗: ${data.error}`);
        }
    });
    
    this.ipcService.on('settings-updated', (settings: any) => {
        if (settings) {
            this.spintaxEnabled.set(settings.spintaxEnabled ?? true);
            this.autoReplyEnabled.set(settings.autoReplyEnabled ?? false);
            this.autoReplyMessage.set(settings.autoReplyMessage || "Thanks for getting back to me! I'll read your message and respond shortly.");
            this.smartSendingEnabled.set(settings.smartSendingEnabled ?? true);
        }
    });
    
    this.ipcService.on('queue-status', (status: QueueStatus | Record<string, QueueStatus>) => {
        if (typeof status === 'object' && 'phone' in status) {
            // Single account status
            const singleStatus = status as QueueStatus;
            this.queueStatuses.update(statuses => ({
                ...statuses,
                [singleStatus.phone]: singleStatus
            }));
        } else {
            // Multiple account statuses
            const statuses = status as Record<string, QueueStatus>;
            this.queueStatuses.set(statuses);
        }
        
        // 更新整體隊列統計
        const allStatuses = Object.values(this.queueStatuses());
        const totalPending = allStatuses.reduce((sum, s) => sum + (s.pending || 0), 0);
        const totalSending = allStatuses.reduce((sum, s) => sum + (s.processing || 0), 0);
        const totalSent = allStatuses.reduce((sum, s) => sum + (s.stats?.completed || 0), 0);
        const totalFailed = allStatuses.reduce((sum, s) => sum + (s.failed || 0), 0);
        const total = totalSent + totalFailed;
        
        this.queueStats.set({
          pending: totalPending,
          sending: totalSending,
          sent: totalSent,
          failed: totalFailed,
          retrying: allStatuses.reduce((sum, s) => sum + (s.retrying || 0), 0),
          totalToday: total,
          successRate: total > 0 ? totalSent / total : 0,
          avgSendTime: allStatuses.reduce((sum, s) => sum + (s.stats?.avg_time || 0), 0) / (allStatuses.length || 1)
        });
    });
    
    this.ipcService.on('queue-messages', (data: { phone?: string, messages: QueueMessage[], count: number }) => {
        this.queueMessages.set(data.messages);
    });
    
    this.ipcService.on('sending-stats', (data: { stats: any[], days: number, phone?: string }) => {
        const chartData: TimeSeriesData = {
            labels: data.stats.map(s => s.date),
            datasets: [{
                label: '成功发送',
                data: data.stats.map(s => s.successful || 0),
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                fill: true
            }, {
                label: '失败',
                data: data.stats.map(s => s.failed || 0),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true
            }]
        };
        this.sendingStatsData.set(chartData);
    });
    
    this.ipcService.on('queue-length-history', (data: { history: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.history.map(h => h.date),
            datasets: [{
                label: '队列长度',
                data: data.history.map(h => h.queue_length || 0),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true
            }]
        };
        this.queueLengthHistoryData.set(chartData);
    });
    
    this.ipcService.on('account-sending-comparison', (data: { comparison: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.comparison.map(c => c.phone),
            datasets: [{
                label: '总发送',
                data: data.comparison.map(c => c.total_sent || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
            }, {
                label: '成功',
                data: data.comparison.map(c => c.successful || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.8)'
            }, {
                label: '失败',
                data: data.comparison.map(c => c.failed || 0),
                backgroundColor: 'rgba(239, 68, 68, 0.8)'
            }]
        };
        this.accountComparisonData.set(chartData);
    });
    
    this.ipcService.on('campaign-performance-stats', (data: { stats: any[], days: number }) => {
        const chartData: TimeSeriesData = {
            labels: data.stats.map(s => s.campaign_name || 'Unknown'),
            datasets: [{
                label: '捕获潜在客户',
                data: data.stats.map(s => s.leads_captured || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.8)'
            }, {
                label: '已联系',
                data: data.stats.map(s => s.leads_contacted || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.8)'
            }, {
                label: '已回复',
                data: data.stats.map(s => s.leads_replied || 0),
                backgroundColor: 'rgba(168, 85, 247, 0.8)'
            }]
        };
        this.campaignPerformanceData.set(chartData);
    });
    
    // AI Greeting Suggestion
    this.ipcService.on('ai-greeting-suggestion', (data: any) => {
        console.log('[AI] Received greeting suggestion:', data);
        this.aiGreetingSuggestion.set(data);
        this.showAiGreetingDialog.set(true);
        this.toastService.info(`🤖 AI 已為 @${data.username || data.firstName} 生成問候建議`, 5000);
    });
    
    this.ipcService.on('alert-triggered', (alert: Alert) => {
        alert.timestamp = new Date(alert.timestamp).toISOString();
        this.alerts.update(alerts => {
            // Check if alert already exists (avoid duplicates)
            const exists = alerts.some(a => 
                a.alert_type === alert.alert_type && 
                a.message === alert.message &&
                Math.abs(new Date(a.timestamp).getTime() - new Date(alert.timestamp).getTime()) < 60000 // Within 1 minute
            );
            if (!exists) {
                return [alert, ...alerts].slice(0, 100); // Keep last 100 alerts
            }
            return alerts;
        });
        // Show browser notification if available
        this.showBrowserNotification(alert);
        // 也顯示通用通知
        this.showNotification(
            `告警: ${alert.level.toUpperCase()}`,
            alert.message,
            { requireInteraction: alert.level === 'critical' }
        );
    });
    
    // Alert rules events
    this.ipcService.on('alert-rules-loaded', (data: { success: boolean, rules?: any[], error?: string }) => {
      if (data.success && data.rules) {
        this.alertRules.set(data.rules);
      }
    });
    
    this.ipcService.on('alert-rule-updated', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.toastService.success('告警规则已更新');
        this.loadAlertRules();
      } else {
        this.toastService.error(data.error || '更新失败');
      }
    });
    
    // Alert history events
    this.ipcService.on('alert-history-loaded', (data: { success: boolean, history?: any[], error?: string }) => {
      if (data.success && data.history) {
        this.alertHistory.set(data.history);
      }
    });
    
    this.ipcService.on('alerts-loaded', (data: { alerts: Alert[], count: number }) => {
      this.alerts.set(data.alerts);
    });
    
    // ==================== Telegram RAG System Events ====================
    this.ipcService.on('rag-initialized', (data: { success: boolean, error?: string }) => {
      this.isInitializingRag.set(false);
      if (data.success) {
        this.ragSystemInitialized.set(true);
        this.toastService.success('✅ RAG 系統初始化完成');
        this.refreshRagStats();
      } else {
        this.toastService.error(`RAG 初始化失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-stats', (data: { success: boolean, rag?: any, indexer?: any, error?: string }) => {
      if (data.success && data.rag) {
        const rag = data.rag;
        const byType = rag.by_type || {};
        
        // 計算 QA 和 Script 數量
        let qaCount = 0;
        let scriptsCount = 0;
        for (const key of Object.keys(byType)) {
          if (key.toLowerCase().includes('qa') || key.toLowerCase().includes('問答')) {
            qaCount += byType[key].count || 0;
          }
          if (key.toLowerCase().includes('script') || key.toLowerCase().includes('話術')) {
            scriptsCount += byType[key].count || 0;
          }
        }
        
        this.ragStats.set({
          total_knowledge: rag.total_knowledge || 0,
          qa_count: qaCount,
          scripts_count: scriptsCount,
          total_uses: rag.total_uses || 0,
          avg_score: rag.avg_score || 0,
          chromadb_enabled: rag.chromadb_enabled || false,
          neural_embedding: rag.neural_embedding || false,
          by_type: byType
        });
        
        // 如果有數據，標記系統已初始化
        if (rag.total_knowledge > 0) {
          this.ragSystemInitialized.set(true);
        }
      }
    });
    
    this.ipcService.on('rag-search-result', (data: { success: boolean, query: string, results?: any[], error?: string }) => {
      this.isSearchingRag.set(false);
      if (data.success && data.results) {
        this.ragSearchResults.set(data.results);
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-learning-triggered', (data: { success: boolean, conversationsProcessed?: number, knowledgeExtracted?: number, error?: string }) => {
      this.isRagLearning.set(false);
      if (data.success) {
        this.toastService.success(`🎓 學習完成！處理 ${data.conversationsProcessed || 0} 個對話，提取 ${data.knowledgeExtracted || 0} 條知識`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`學習失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-reindex-complete', (data: { success: boolean, conversations_processed?: number, knowledge_extracted?: number, error?: string }) => {
      this.isReindexing.set(false);
      if (data.success) {
        this.toastService.success(`🔄 重新索引完成！處理 ${data.conversations_processed || 0} 個對話`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`重新索引失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-cleanup-complete', (data: { success: boolean, deleted?: number, merged?: number, error?: string }) => {
      this.isCleaningRag.set(false);
      if (data.success) {
        this.toastService.success(`🧹 清理完成！刪除 ${data.deleted || 0} 條，合併 ${data.merged || 0} 條`);
        this.refreshRagStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-knowledge-added', (data: { success: boolean, knowledgeId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 知識已添加');
        this.refreshRagStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('rag-feedback-recorded', (data: { success: boolean, knowledgeId?: number, error?: string }) => {
      if (!data.success) {
        this.toastService.error(`反饋記錄失敗: ${data.error}`);
      }
    });
    
    // Vector Memory Events (向量記憶事件)
    this.ipcService.on('memories-searched', (data: { success: boolean, memories?: any[], error?: string }) => {
      this.isSearchingMemory.set(false);
      if (data.success && data.memories) {
        this.vectorMemorySearchResults.set(data.memories.map(m => ({
          id: m.id,
          userId: m.user_id,
          content: m.content,
          memoryType: m.memory_type,
          importance: m.importance,
          similarity: m.similarity || 0,
          createdAt: m.created_at
        })));
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memory-added', (data: { success: boolean, memoryId?: number, error?: string }) => {
      this.isAddingMemory.set(false);
      if (data.success) {
        this.toastService.success('✅ 記憶已添加');
        this.newMemory = { userId: '', content: '', type: 'conversation', importance: 0.5 };
        this.showAddMemoryDialog.set(false);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memory-stats', (data: { success: boolean, totalMemories?: number, byType?: any, totalUsers?: number, avgImportance?: number, error?: string }) => {
      if (data.success) {
        this.vectorMemoryStats.set({
          totalMemories: data.totalMemories || 0,
          byType: data.byType || {},
          totalUsers: data.totalUsers || 0,
          avgImportance: data.avgImportance || 0
        });
      }
    });
    
    this.ipcService.on('memory-user-list', (data: { success: boolean, users?: string[], error?: string }) => {
      if (data.success && data.users) {
        this.memoryUserList.set(data.users);
      }
    });
    
    this.ipcService.on('memory-deleted', (data: { success: boolean, memoryId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 記憶已刪除');
        this.vectorMemorySearchResults.update(results => 
          results.filter(r => r.id !== data.memoryId)
        );
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('memories-merged', (data: { success: boolean, mergedCount?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 合併完成！合併了 ${data.mergedCount || 0} 條記憶`);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`合併失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('old-memories-cleaned', (data: { success: boolean, deletedCount?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 清理完成！刪除了 ${data.deletedCount || 0} 條舊記憶`);
        this.refreshMemoryStats();
      } else {
        this.toastService.error(`清理失敗: ${data.error}`);
      }
    });
    
    // Batch Operations Events (批量操作事件)
    this.ipcService.on('batch-operation-result', (data: any) => {
      this.handleBatchOperationResult(data);
    });
    
    this.ipcService.on('batch-operation-progress', (data: any) => {
      this.handleBatchOperationProgress(data);
    });
    
    this.ipcService.on('batch-undo-result', (data: any) => {
      this.handleBatchUndoResult(data);
    });
    
    this.ipcService.on('batch-operation-history', (data: any) => {
      this.handleBatchOperationHistory(data);
    });
    
    this.ipcService.on('all-tags', (data: any) => {
      this.handleAllTags(data);
    });
    
    this.ipcService.on('tag-created', (data: any) => {
      this.handleTagCreated(data);
    });
    
    this.ipcService.on('tag-deleted', (data: any) => {
      this.handleTagDeleted(data);
    });
    
    // Ad System Events (廣告發送系統)
    this.ipcService.on('ad-templates', (data: any) => {
      this.handleAdTemplates(data);
    });
    
    this.ipcService.on('ad-schedules', (data: any) => {
      this.handleAdSchedules(data);
    });
    
    this.ipcService.on('ad-send-logs', (data: any) => {
      this.handleAdSendLogs(data);
    });
    
    this.ipcService.on('ad-overview-stats', (data: any) => {
      this.handleAdOverviewStats(data);
    });
    
    this.ipcService.on('ad-template-created', (data: any) => {
      this.handleAdTemplateCreated(data);
    });
    
    this.ipcService.on('ad-template-deleted', (data: any) => {
      this.handleAdTemplateDeleted(data);
    });
    
    this.ipcService.on('ad-template-toggled', (data: any) => {
      if (data.success) {
        this.loadAdTemplates();
      }
    });
    
    this.ipcService.on('ad-schedule-created', (data: any) => {
      this.handleAdScheduleCreated(data);
    });
    
    this.ipcService.on('ad-schedule-deleted', (data: any) => {
      this.handleAdScheduleDeleted(data);
    });
    
    this.ipcService.on('ad-schedule-toggled', (data: any) => {
      if (data.success) {
        this.loadAdSchedules();
      }
    });
    
    this.ipcService.on('ad-schedule-run-result', (data: any) => {
      this.handleAdScheduleRunResult(data);
    });
    
    this.ipcService.on('spintax-validated', (data: any) => {
      this.handleSpintaxValidated(data);
    });
    
    this.ipcService.on('ad-sent', (data: any) => {
      this.toastService.success(`廣告已發送到 ${data.groupTitle || data.groupId}`);
    });
    
    this.ipcService.on('ad-send-failed', (data: any) => {
      this.toastService.error(`發送失敗: ${data.error}`);
    });
    
    this.ipcService.on('broadcast-progress', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '廣告發送中...',
        progress: {
          current: data.current,
          total: data.total,
          message: `已發送 ${data.sent}，失敗 ${data.failed}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('broadcast-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
      this.toastService.success(`廣告發送完成: ${data.sent} 成功, ${data.failed} 失敗`);
      this.loadAdSendLogs();
      this.loadAdOverviewStats();
    });
    
    // User Tracking Events (用戶追蹤系統)
    this.ipcService.on('tracked-users', (data: any) => {
      this.handleTrackedUsers(data);
    });
    
    this.ipcService.on('user-groups', (data: any) => {
      this.handleUserGroups(data);
    });
    
    this.ipcService.on('high-value-groups', (data: any) => {
      this.handleHighValueGroups(data);
    });
    
    this.ipcService.on('tracking-stats', (data: any) => {
      this.handleTrackingStats(data);
    });
    
    this.ipcService.on('user-added-to-track', (data: any) => {
      this.handleUserAddedToTrack(data);
    });
    
    this.ipcService.on('user-added-from-lead', (data: any) => {
      if (data.success) {
        this.toastService.success('Lead 已添加到追蹤列表');
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('user-removed', (data: any) => {
      this.handleUserRemoved(data);
    });
    
    this.ipcService.on('user-tracking-started', (data: any) => {
      this.isTrackingUser.set(true);
    });
    
    this.ipcService.on('user-tracking-completed', (data: any) => {
      this.handleUserTrackingCompleted(data);
    });
    
    this.ipcService.on('user-tracking-failed', (data: any) => {
      this.handleUserTrackingFailed(data);
    });
    
    this.ipcService.on('user-value-updated', (data: any) => {
      if (data.success) {
        this.loadTrackedUsers();
      }
    });
    
    this.ipcService.on('batch-tracking-progress', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '批量追蹤中...',
        progress: {
          current: data.current,
          total: data.total,
          message: `正在追蹤用戶 ${data.userId}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('batch-tracking-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
      this.toastService.success(`批量追蹤完成: ${data.completed} 成功, ${data.failed} 失敗`);
      this.loadTrackedUsers();
      this.loadTrackingStats();
    });
    
    // Campaign Events (營銷活動協調器)
    this.ipcService.on('campaigns', (data: any) => {
      this.handleCampaigns(data);
    });
    
    this.ipcService.on('campaign-created', (data: any) => {
      this.handleCampaignCreated(data);
    });
    
    this.ipcService.on('campaign-deleted', (data: any) => {
      this.handleCampaignDeleted(data);
    });
    
    this.ipcService.on('campaign-started', (data: any) => {
      if (data.success !== false) {
        this.toastService.success('營銷活動已啟動');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-paused', (data: any) => {
      if (data.success) {
        this.toastService.info('營銷活動已暫停');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-stopped', (data: any) => {
      if (data.success !== false) {
        this.toastService.info('營銷活動已停止');
        this.loadCampaigns();
      }
    });
    
    this.ipcService.on('campaign-completed', (data: any) => {
      this.toastService.success('營銷活動執行完成');
      this.loadCampaigns();
      this.loadUnifiedOverview();
    });
    
    this.ipcService.on('campaign-step-started', (data: any) => {
      this.progressDialog.set({
        show: true,
        title: '執行營銷活動...',
        progress: {
          current: 0,
          total: 0,
          message: `執行步驟: ${data.actionType}`
        },
        cancellable: false
      });
    });
    
    this.ipcService.on('campaign-step-completed', (data: any) => {
      this.progressDialog.update(p => ({ ...p, show: false }));
    });
    
    this.ipcService.on('unified-overview', (data: any) => {
      this.handleUnifiedOverview(data);
    });
    
    this.ipcService.on('funnel-analysis', (data: any) => {
      this.handleFunnelAnalysis(data);
    });
    
    // Multi-Role Events (多角色協作)
    this.ipcService.on('role-templates', (data: any) => {
      this.handleRoleTemplates(data);
    });
    
    this.ipcService.on('all-roles', (data: any) => {
      this.handleAllRoles(data);
    });
    
    this.ipcService.on('role-assigned', (data: any) => {
      if (data.success) {
        this.toastService.success('角色已分配');
        this.loadAllRoles();
        this.loadRoleStats();
      } else {
        this.toastService.error(`分配失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('role-removed', (data: any) => {
      if (data.success) {
        this.toastService.success('角色已移除');
        this.loadAllRoles();
        this.loadRoleStats();
      }
    });
    
    this.ipcService.on('role-stats', (data: any) => {
      this.handleRoleStats(data);
    });
    
    this.ipcService.on('script-templates', (data: any) => {
      this.handleScriptTemplates(data);
    });
    
    this.ipcService.on('collab-groups', (data: any) => {
      this.handleCollabGroups(data);
    });
    
    this.ipcService.on('collab-stats', (data: any) => {
      this.handleCollabStats(data);
    });
    
    this.ipcService.on('collab-group-created', (data: any) => {
      if (data.success !== false) {
        this.toastService.success('協作群組已創建');
        this.loadCollabGroups();
      }
    });
    
    // Resource Discovery Events
    this.ipcService.on('resource-discovery-initialized', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.resourceDiscoveryInitialized.set(true);
        this.toastService.success('✅ 資源發現系統已初始化');
        this.refreshResourceStats();
        this.loadDiscoveryKeywords();
        
        // 如果有待搜索的關鍵詞，自動執行搜索
        if (this.pendingSearchQuery) {
          const query = this.pendingSearchQuery;
          this.pendingSearchQuery = '';
          this.toastService.info(`正在搜索 "${query}"...`);
          setTimeout(() => this.searchResources(), 500);
        }
      } else {
        this.toastService.error(`初始化失敗: ${data.error}`);
      }
    });
    
    // 🆕 C方案：搜索結果直接顯示（不存數據庫）
    this.ipcService.on('search-results-direct', (data: { success: boolean, query?: string, results?: any[], error?: string }) => {
      // 清除超时计时器
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      this.isSearchingResources.set(false);
      if (data.success && data.results) {
        // 直接使用搜索結果，不從數據庫加載
        const results = data.results;
        
        // 按相關度排序（標題包含關鍵詞優先）
        const query = data.query?.toLowerCase() || '';
        const sortedResults = results.sort((a: any, b: any) => {
          const aTitle = (a.title || '').toLowerCase();
          const bTitle = (b.title || '').toLowerCase();
          const aContains = aTitle.includes(query) ? 1 : 0;
          const bContains = bTitle.includes(query) ? 1 : 0;
          if (aContains !== bContains) return bContains - aContains;
          return (b.overall_score || 0) - (a.overall_score || 0);
        });
        
        // 去重（基於 telegram_id）
        const seen = new Set<string>();
        const uniqueResults = sortedResults.filter((r: any) => {
          if (seen.has(r.telegram_id)) return false;
          seen.add(r.telegram_id);
          return true;
        });
        
        this.discoveredResources.set(uniqueResults);
        this.currentSearchKeyword.set(query);
        
        // 🆕 更新搜索緩存
        if (uniqueResults.length > 0) {
          const cacheKey = this.generateSearchCacheKey(data.query || '', this.selectedSearchSources());
          this.setSearchCache(cacheKey, uniqueResults);
        }
        
        // 🔧 移除搜索完成 Toast，結果直接顯示在 UI 中
        if (uniqueResults.length === 0) {
          console.log(`[Search] 未找到與「${data.query}」相關的結果`);
        } else {
          console.log(`[Search] 找到 ${uniqueResults.length} 個與「${data.query}」相關的結果`);
        }
      } else if (data.error) {
        this.toastService.error(`搜索失敗: ${data.error}`);
      }
    });
    
    // 舊版兼容（保存到數據庫的模式）
    this.ipcService.on('search-resources-complete', (data: { success: boolean, query?: string, found?: number, new?: number, updated?: number, error?: string }) => {
      // 清除超时计时器
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = null;
      }

      this.isSearchingResources.set(false);
      if (data.success) {
        // 🔧 移除搜索完成 Toast，結果直接顯示在 UI 中
        if (data.found === 0) {
          console.log(`[Search] 搜索完成：没有找到相关结果`);
        } else {
          console.log(`[Search] 搜索完成：找到 ${data.found} 个`);
        }
        // 🆕 C方案：不再調用 loadResources()，搜索結果已經直接設置
        // this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`搜索失败: ${data.error}`);
      }
    });

    // 极搜搜索完成事件
    this.ipcService.on('search-jiso-complete', (data: { success: boolean, results?: any[], total?: number, cached?: boolean, error?: string, bot?: string }) => {
      if (data.success && data.results) {
        const resultCount = data.results.length;
        // 🔧 移除极搜完成 Toast，結果直接顯示在 UI 中
        if (resultCount === 0) {
          console.log('[Search] 极搜：没有找到相关结果');
        } else {
          const cacheTag = data.cached ? '（缓存）' : '';
          const botTag = data.bot ? `（來自 @${data.bot}）` : '';
          console.log(`[Search] 极搜完成${cacheTag}：找到 ${resultCount} 个群组${botTag}`);
          
          // 🆕 合併极搜結果到 discoveredResources
          const existingResources = this.discoveredResources();
          const existingIds = new Set(existingResources.map(r => r.telegram_id || r.username));
          
          const newResults = data.results
            .filter((r: any) => !existingIds.has(r.telegram_id) && !existingIds.has(r.username))
            .map((r: any) => {
              // 🔑 驗證 username 是否有效（不是搜索機器人）
              let validUsername = r.username || '';
              if (validUsername && validUsername.toLowerCase().endsWith('bot')) {
                validUsername = '';  // 清空 bot username
              }
              
              // 🔑 驗證 link 是否為有效的群組鏈接（不是消息鏈接）
              let validLink = r.link || '';
              if (validLink && /t\.me\/[^/]+\/\d+/.test(validLink)) {
                // 這是消息鏈接（t.me/username/messageId），不是群組鏈接
                validLink = '';
              }
              
              // 🔧 修復：telegram_id 只存儲真正的數字 ID，不用 username/title 作為回退
              const numericId = r.telegram_id && /^-?\d+$/.test(String(r.telegram_id)) 
                ? String(r.telegram_id) 
                : '';
              
              return {
                id: 0,  // 未保存到數據庫
                telegram_id: numericId,  // 只保存真正的數字 ID
                username: validUsername,
                title: r.title || '',
                description: r.description || '',
                member_count: r.member_count || 0,
                // 🔧 修復：使用後端傳來的類型，而不是硬編碼
                resource_type: r.chat_type || r.resource_type || 'group',
                activity_score: 0.5,
                relevance_score: 0.6,
                overall_score: 0.6,  // 極搜結果默認評分
                status: 'discovered',
                discovery_source: 'jiso',
                discovery_keyword: this.currentSearchKeyword(),
                created_at: new Date().toISOString(),
                invite_link: validLink,
                // 🆕 只有有效的 username 才生成鏈接
                link: validLink || (validUsername ? `https://t.me/${validUsername}` : ''),
                is_saved: false,
                // 🆕 標記是否可直接加入
                can_join: !!(validLink || validUsername)
              };
            });
          
          if (newResults.length > 0) {
            const mergedResults = [...existingResources, ...newResults];
            this.discoveredResources.set(mergedResults);
            // 🔧 移除合并提示，結果數量直接顯示在 UI 中
            console.log(`[Search] 已合併 ${newResults.length} 個新結果`);
            
            // 🆕 更新搜索緩存（含合併結果）
            const currentKeyword = this.currentSearchKeyword();
            if (currentKeyword && mergedResults.length > 0) {
              const cacheKey = this.generateSearchCacheKey(currentKeyword, this.selectedSearchSources());
              this.setSearchCache(cacheKey, mergedResults);
            }
          }
        }
        this.refreshResourceStats();
      } else if (data.error) {
        // 🆕 優化錯誤提示
        const errorMsg = data.error;
        let suggestions: string[] = [];
        let details = '';
        
        if (errorMsg.includes('Username not found') || errorMsg.includes('不可用')) {
          suggestions = [
            '搜索機器人首次使用需要激活',
            '請在 Telegram 中打開 @smss 並發送 /start',
            '或者打開 @jisou3 並發送 /start',
            '激活後重新搜索'
          ];
          details = '搜索機器人尚未激活';
        } else if (errorMsg.includes('FloodWait') || errorMsg.includes('限制')) {
          suggestions = [
            '等待幾分鐘後重試',
            '減少搜索頻率',
            '使用其他帳號搜索'
          ];
          details = 'Telegram 請求頻率限制';
        } else if (errorMsg.includes('没有可用')) {
          suggestions = [
            '檢查帳號是否已登錄',
            '確保至少有一個帳號在線'
          ];
          details = '沒有可用帳號';
        } else {
          suggestions = ['重試搜索', '使用不同關鍵詞'];
        }
        
        this.searchError.set({
          hasError: true,
          message: errorMsg,
          details,
          suggestions
        });
        this.toastService.error(`极搜失敗: ${details || errorMsg}`);
      }
      
      // 如果只选择了极搜渠道，则停止搜索状态
      const sources = this.selectedSearchSources();
      if (sources.length === 1 && sources[0] === 'jiso') {
        this.isSearchingResources.set(false);
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = null;
        }
      }
    });

    // 极搜进度事件
    this.ipcService.on('jiso-search-progress', (data: { status: string, message: string }) => {
      // 🔧 移除搜索進度 Toast，改用 UI 狀態指示
      if (data.status === 'searching') {
        console.log(`[Search] 极搜：${data.message}`);
      } else if (data.status === 'waiting') {
        console.log(`[Search] 极搜等待：${data.message}`);
      }
    });

    // 搜索渠道管理事件
    this.ipcService.on('search-channels-list', (data: { success: boolean, system_channels?: any[], custom_channels?: any[], error?: string }) => {
      if (data.success) {
        this.systemChannels.set(data.system_channels || []);
        this.customChannels.set(data.custom_channels || []);
      }
    });

    this.ipcService.on('search-channel-added', (data: { success: boolean, channelId?: number, botUsername?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 已添加渠道 @${data.botUsername}`);
        this.showAddChannelDialog.set(false);
        this.loadSearchChannels();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-updated', (data: { success: boolean, channelId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 渠道已更新');
        this.loadSearchChannels();
      } else {
        this.toastService.error(`更新失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-deleted', (data: { success: boolean, channelId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('🗑️ 渠道已刪除');
        this.loadSearchChannels();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });

    this.ipcService.on('search-channel-tested', (data: { success: boolean, botUsername?: string, status?: string, responseTime?: number, error?: string }) => {
      this.isTestingChannel.set(false);
      if (data.success) {
        this.toastService.success(`✅ @${data.botUsername} 測試成功 (${data.responseTime?.toFixed(1)}s)`);
        this.loadSearchChannels();
      } else {
        this.toastService.warning(`❌ @${data.botUsername} 測試失敗: ${data.error}`);
        this.loadSearchChannels();
      }
    });

    this.ipcService.on('resources-list', (data: { success: boolean, resources?: any[], total?: number, error?: string }) => {
      // 🆕 C方案：如果正在搜索模式，忽略數據庫加載的結果
      if (this.isInSearchResultMode()) {
        console.log('[資源中心] 忽略 resources-list，當前處於搜索結果模式');
        return;
      }
      
      if (data.success && data.resources) {
        this.discoveredResources.set(data.resources);
        
        // 自動驗證尚未驗證類型的資源（批量處理，避免 FloodWait）
        const unverifiedResources = data.resources.filter(r => !r.type_verified && r.username);
        if (unverifiedResources.length > 0) {
          // 限制每次最多驗證 10 個資源
          const toVerify = unverifiedResources.slice(0, 10);
          const resourceIds = toVerify.map(r => r.id);
          this.ipcService.send('batch-verify-resource-types', { resourceIds });
        }
      }
    });
    
    this.ipcService.on('resource-stats', (data: { success: boolean, total_resources?: number, by_status?: any, by_type?: any, today_discovered?: number, pending_joins?: number, joined_count?: number, avg_score?: number, error?: string }) => {
      if (data.success) {
        this.resourceStats.set({
          total_resources: data.total_resources || 0,
          by_status: data.by_status || {},
          by_type: data.by_type || {},
          today_discovered: data.today_discovered || 0,
          pending_joins: data.pending_joins || 0,
          joined_count: data.joined_count || 0,
          avg_score: data.avg_score || 0
        });
        if (data.total_resources && data.total_resources > 0) {
          this.resourceDiscoveryInitialized.set(true);
        }
      }
    });
    
    this.ipcService.on('resource-added', (data: { success: boolean, resourceId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 資源已添加');
        this.showAddResourceDialog.set(false);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });

    // 資源類型驗證結果
    this.ipcService.on('resource-type-verified', (data: { success: boolean, resourceId?: number, oldType?: string, newType?: string, title?: string, error?: string }) => {
      if (data.success) {
        if (data.oldType !== data.newType) {
          this.toastService.success(`✅ 類型已更新: ${data.oldType} → ${data.newType}`);
        } else {
          this.toastService.info(`📋 類型確認: ${data.newType}`);
        }
        this.loadResources();
      } else {
        this.toastService.error(`驗證失敗: ${data.error}`);
      }
    });
    
    // 批量類型驗證完成
    this.ipcService.on('resources-types-verified', (data: { success: boolean, count?: number }) => {
      if (data.success && data.count && data.count > 0) {
        this.loadResources();
      }
    });
    
    this.ipcService.on('resource-deleted', (data: { success: boolean, resourceId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('🗑️ 資源已刪除');
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`刪除失敗: ${data.error}`);
      }
    });
    
    // 退出群組完成事件
    this.ipcService.on('leave-group-complete', (data: { success: boolean, groupId?: string, phone?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`🚪 已退出群組`);
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`退出群組失敗: ${data.error}`);
      }
    });
    
    // 🆕 移除監控群組結果
    this.ipcService.on('remove-group-result', (data: { success: boolean, groupId?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 已停止監控群組`);
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`停止監控失敗: ${data.error || '未知錯誤'}`);
        // 回滾樂觀更新
        this.loadResources();
      }
    });
    
    this.ipcService.on('join-queue-updated', (data: { success: boolean, added?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`📋 已添加 ${data.added} 個資源到加入隊列`);
        this.refreshResourceStats();
        this.selectedResourceIds.set([]);
      } else {
        this.toastService.error(`添加到隊列失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('join-queue-processed', (data: { success: boolean, processed?: number, successCount?: number, failed?: number, error?: string }) => {
      this.isProcessingJoinQueue.set(false);
      if (data.success) {
        this.toastService.success(`🚀 處理完成：成功 ${data.successCount}，失敗 ${data.failed}`);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`處理失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('batch-join-started', (data: { success: boolean, count?: number, error?: string }) => {
      if (data.success) {
        this.toastService.info(`🚀 開始批量加入 ${data.count} 個資源`);
      }
    });
    
    this.ipcService.on('batch-join-complete', (data: { success: boolean, total?: number, successCount?: number, failed?: number, skipped?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 批量加入完成：成功 ${data.successCount}，失敗 ${data.failed}，跳過 ${data.skipped}`);
        this.loadResources();
        this.refreshResourceStats();
      }
    });
    
    // 加入並監控事件
    this.ipcService.on('join-and-monitor-complete', (data: { success: boolean, resourceId?: number, error?: string }) => {
      this.isJoiningResource.set(false);
      if (data.success) {
        this.toastService.success('✅ 已加入並添加到監控');
        this.showJoinMonitorDialog.set(false);
        this.loadResources();
        this.refreshResourceStats();
      } else {
        this.toastService.error(`加入失敗: ${data.error}`);
      }
    });

    // 帶帳號選擇的加入並監控事件
    this.ipcService.on('join-and-monitor-with-account-complete', (data: { success: boolean, resourceId?: number, phone?: string, error?: string, status?: string, message?: string, memberCount?: number }) => {
      this.isJoiningResource.set(false);
      
      if (data.success) {
        const keywordSetCount = this.joinMonitorSelectedKeywordSetIds().length;
        const currentResource = this.joinMonitorResource();
        
        // 🆕 即時更新本地資源狀態（樂觀更新）+ 成員數
        const newStatus = data.status === 'pending_approval' ? 'pending_approval' : 'joined';
        this.updateResourceStatusLocally(currentResource, newStatus, data.phone, data.memberCount);
        
        // 🆕 根據加入狀態顯示不同的提示
        if (data.status === 'pending_approval') {
          // 等待管理員批准
          this.toastService.info(`📨 加入請求已發送，等待管理員批准\n帳號: ${data.phone}`, 5000);
          this.showJoinMonitorDialog.set(false);
        } else {
          // 成功加入 - 顯示「下一步」選項
          this.showPostJoinOptions(currentResource, data.phone, keywordSetCount);
        }
        
        // 刷新數據
        this.loadResources();
        this.refreshResourceStats();
        this.ipcService.send('get-monitored-groups');
      } else {
        // 🆕 更詳細的錯誤提示
        const errorMsg = data.error || '未知錯誤';
        if (errorMsg.includes('缺少加入方式') || errorMsg.includes('username')) {
          this.toastService.error(`❌ 無法加入：此群組沒有提供有效的加入鏈接\n請在 Telegram 中手動獲取群組鏈接`, 6000);
        } else {
          this.toastService.error(`❌ 加入失敗: ${errorMsg}`, 5000);
        }
      }
    });
    
    // 批量加入並監控事件
    this.ipcService.on('batch-join-and-monitor-complete', (data: { success: boolean, total?: number, successCount?: number, failed?: number, error?: string }) => {
      this.isJoiningResource.set(false);
      this.closeBatchJoinMonitorDialog();
      if (data.success) {
        const keywordSetCount = this.joinMonitorSelectedKeywordSetIds().length;
        const message = keywordSetCount > 0 
          ? `✅ 批量加入監控完成：成功 ${data.successCount}，失敗 ${data.failed}，已綁定 ${keywordSetCount} 個關鍵詞集`
          : `✅ 批量加入監控完成：成功 ${data.successCount}，失敗 ${data.failed}`;
        this.toastService.success(message);
        this.loadResources();
        this.refreshResourceStats();
        this.selectedResourceIds.set([]);
        // 刷新監控群組列表以同步關鍵詞集綁定
        this.ipcService.send('get-monitored-groups');
      } else {
        this.toastService.error(`批量操作失敗: ${data.error}`);
      }
    });

    // 成員提取進度事件
    this.ipcService.on('members-extraction-progress', (data: { resourceId: number, extracted: number, total: number, status: string }) => {
      this.memberListProgress.set({
        extracted: data.extracted,
        total: data.total,
        status: data.status
      });
    });

    // 成員提取完成事件
    this.ipcService.on('members-extracted', (data: { 
      success: boolean, 
      resourceId?: number, 
      members?: any[], 
      total?: number, 
      error?: string,
      error_code?: string,
      error_details?: { reason?: string, suggestion?: string, can_auto_join?: boolean, alternative?: string, attempts?: number }
    }) => {
      this.memberListLoading.set(false);
      if (data.success && data.members) {
        // 追加成員數據
        const existingIds = new Set(this.memberListData().map(m => m.user_id));
        const newMembers = data.members.filter(m => !existingIds.has(m.user_id));
        this.memberListData.update(current => [...current, ...newMembers]);
        this.memberListProgress.update(p => ({
          ...p,
          extracted: this.memberListData().length,
          status: `已提取 ${this.memberListData().length} 個成員`
        }));
        
        // 🆕 計算並顯示提取結果摘要
        if (newMembers.length > 0) {
          this.calculateAndShowExtractionSummary(newMembers);
        } else {
          this.toastService.info('沒有更多新成員');
        }
      } else if (data.error) {
        // 顯示結構化錯誤信息
        this.handleMemberExtractionError(data);
      }
    });

    // 批量成員提取完成事件
    this.ipcService.on('batch-members-extracted', (data: { success: boolean, totalGroups?: number, totalMembers?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 批量提取完成：${data.totalGroups} 個群組，共 ${data.totalMembers} 個成員`);
      } else {
        this.toastService.error(`批量提取失敗: ${data.error}`);
      }
    });
    
    // 群組消息發送結果事件
    this.ipcService.on('group-message-sent', (data: { success: boolean, resourceId?: number, messageId?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 消息已成功發送到群組');
      } else {
        this.toastService.error(`❌ 發送失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 私信消息進入隊列事件
    this.ipcService.on('message-queued', (data: { messageId: string, leadId: number, accountPhone: string, userId: string }) => {
      console.log('[Frontend] Message queued:', data);
      this.toastService.info(`📤 消息已加入發送隊列`);
    });

    // 私信消息發送結果事件
    this.ipcService.on('message-sent', (data: { leadId: number, accountPhone: string, userId: string, success: boolean, error?: string, messageId?: string }) => {
      console.log('[Frontend] Message sent result:', data);
      if (data.success) {
        this.toastService.success(`✅ 消息已成功發送`);
        // 關閉發消息對話框
        this.closeLeadDetailModal();
        // 重新加載 leads 數據以更新狀態
        this.ipcService.send('get-leads', {});
      } else {
        this.toastService.error(`❌ 發送失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 鏈接分析事件
    this.ipcService.on('link-analysis-complete', (data: any) => {
      this.isAnalyzingLink.set(false);
      if (data.success) {
        if (data.isPrivate) {
          this.toastService.warning(data.message || '這是私有鏈接');
        } else {
          this.toastService.success('✅ 分析完成');
          // TODO: 顯示分析結果
          console.log('Link analysis result:', data);
        }
      } else {
        this.toastService.error(`分析失敗: ${data.error}`);
      }
    });
    
    // Ollama 模型列表事件
    this.ipcService.on('ollama-models', (data: { success: boolean, models?: string[], error?: string }) => {
      if (data.success && data.models) {
        this.availableOllamaModels.set(data.models);
        this.toastService.success(`找到 ${data.models.length} 個模型`);
      } else if (data.error) {
        this.toastService.error(`獲取模型列表失敗: ${data.error}`);
      }
    });
    
    // 本地 AI 測試結果
    this.ipcService.on('local-ai-test-result', (data: { success: boolean, message?: string, error?: string }) => {
      this.isTestingLocalAi.set(false);
      if (data.success) {
        this.localAiStatus.set('success');
        this.aiConnectionStatus.set('success');
        this.toastService.success(data.message || '連接成功');
      } else {
        this.localAiStatus.set('error');
        this.localAiError.set(data.error || '連接失敗');
        this.toastService.error(data.error || '連接失敗');
      }
    });
    
    // 首次運行狀態
    this.ipcService.on('first-run-status', (data: { isFirstRun: boolean, userDataPath?: string }) => {
      this.isFirstRun.set(data.isFirstRun);
      if (data.isFirstRun) {
        console.log('[App] 首次運行，後台靜默配置 AI（不強制顯示向導）');
        // 不強制顯示向導，用戶可以直接使用程序
        // this.showWelcomeDialog.set(true);
        // 後台靜默檢測 Ollama
        setTimeout(() => this.detectOllama(), 1000);
      }
    });
    
    // 後端狀態監聽
    this.ipcService.on('backend-status', (data: { running: boolean, error?: string, suggestion?: string }) => {
      console.log('[App] Backend status:', data);
      this.backendRunning.set(data.running);
      if (!data.running && data.error) {
        this.backendError.set(data.error);
        this.showBackendErrorDialog.set(true);
        this.toastService.error('❌ Python 後端未運行，部分功能無法使用');
      }
    });
    
    // Ollama 檢測結果
    this.ipcService.on('ollama-detected', (data: { success: boolean, available?: boolean, models?: string[], error?: string }) => {
      this.isDetectingOllama.set(false);
      if (data.success) {
        this.ollamaDetected.set(data.available || false);
        if (data.models && data.models.length > 0) {
          this.detectedOllamaModels.set(data.models);
          // 自動選擇最佳模型
          const preferredModels = ['qwen2:7b', 'qwen:7b', 'llama3:8b', 'mistral:7b'];
          const bestModel = preferredModels.find(m => data.models!.some(dm => dm.includes(m.split(':')[0]))) || data.models[0];
          this.autoSelectedModel.set(bestModel);
          this.localAiModel.set(bestModel);
        }
      }
    });
    
    // 首次設置保存結果
    this.ipcService.on('first-run-settings-saved', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        console.log('[App] 首次設置已保存');
      } else {
        console.error('[App] 首次設置保存失敗:', data.error);
      }
    });
    
    this.ipcService.on('discovery-keywords', (data: { success: boolean, keywords?: any[], error?: string }) => {
      if (data.success && data.keywords) {
        this.discoveryKeywords.set(data.keywords);
      }
    });
    
    this.ipcService.on('discovery-keyword-added', (data: { success: boolean, keywordId?: number, keyword?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`➕ 關鍵詞已添加: ${data.keyword}`);
        this.showAddKeywordDialog.set(false);
        this.newResourceKeyword = '';
        this.loadDiscoveryKeywords();
      } else {
        this.toastService.error(`添加失敗: ${data.error}`);
      }
    });
    
    // Discussion Watcher Events
    this.ipcService.on('discussion-watcher-initialized', (data: { success: boolean, error?: string }) => {
      if (data.success) {
        this.discussionWatcherInitialized.set(true);
        this.toastService.success('✅ 討論組監控服務已初始化');
        this.loadChannelDiscussions();
        this.refreshDiscussionStats();
      } else {
        this.toastService.error(`初始化失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-discovered', (data: { success: boolean, discussion?: any, error?: string }) => {
      if (data.success && data.discussion) {
        this.toastService.success(`✅ 發現討論組: ${data.discussion.discussion_title}`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(data.error || '未找到討論組');
      }
    });
    
    this.ipcService.on('discussions-batch-discovered', (data: { success: boolean, count?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success(`✅ 發現了 ${data.count} 個討論組`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(`發現失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('channel-discussions-list', (data: { success: boolean, discussions?: any[], error?: string }) => {
      if (data.success && data.discussions) {
        this.channelDiscussions.set(data.discussions);
      }
    });
    
    this.ipcService.on('discussion-monitoring-status', (data: { success: boolean, discussion_id?: string, status?: string, error?: string }) => {
      if (data.success) {
        this.toastService.success(`${data.status === 'monitoring' ? '🟢 開始' : '🔴 停止'}監控討論組`);
        this.loadChannelDiscussions();
      } else {
        this.toastService.error(`操作失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-messages', (data: { success: boolean, discussion_id?: string, messages?: any[], error?: string }) => {
      this.isLoadingDiscussionMessages.set(false);
      if (data.success && data.messages) {
        this.discussionMessages.set(data.messages);
      } else {
        this.toastService.error(data.error || '加载消息失败');
        this.discussionMessages.set([]);
      }
    });
    
    this.ipcService.on('discussion-message', (data: { discussion_id: string, message_id: number, username: string, text: string, is_matched: boolean, keywords: string[] }) => {
      // 實時消息 - 可以添加到列表或顯示通知
      if (data.is_matched) {
        this.toastService.info(`🎯 關鍵詞匹配: @${data.username} - ${data.keywords.join(', ')}`);
      }
    });
    
    this.ipcService.on('discussion-lead-captured', (data: { discussion_id: string, username: string, keywords: string[] }) => {
      this.toastService.success(`👤 新潛在客戶: @${data.username}`);
      this.refreshDiscussionStats();
    });
    
    this.ipcService.on('discussion-reply-result', (data: { success: boolean, reply_message_id?: number, error?: string }) => {
      if (data.success) {
        this.toastService.success('✅ 回復已發送');
        if (this.selectedDiscussionId()) {
          this.loadDiscussionMessages(this.selectedDiscussionId());
        }
      } else {
        this.toastService.error(`回復失敗: ${data.error}`);
      }
    });
    
    this.ipcService.on('discussion-stats', (data: any) => {
      if (data.success) {
        this.discussionStats.set({
          total_discussions: data.total_discussions || 0,
          monitoring_count: data.monitoring_count || 0,
          total_messages: data.total_messages || 0,
          matched_messages: data.matched_messages || 0,
          leads_from_discussions: data.leads_from_discussions || 0,
          today_messages: data.today_messages || 0,
          today_leads: data.today_leads || 0
        });
        if (data.total_discussions > 0) {
          this.discussionWatcherInitialized.set(true);
        }
      }
    });

    // Chat History Events
    this.ipcService.on('chat-list', (data: { success: boolean, chats?: any[], total?: number, error?: string }) => {
      if (data.success && data.chats) {
        this.chatList.set(data.chats);
      } else {
        console.error('[Frontend] Chat list error:', data.error);
      }
    });
    
    this.ipcService.on('chat-history-full', (data: { success: boolean, messages?: any[], profile?: any, tags?: any[], hasMore?: boolean, total?: number, error?: string }) => {
      console.log('[Frontend] Received chat-history-full event:', data);
      if (data.success && data.messages) {
        const page = this.chatHistoryPage();
        
        if (page === 0) {
          // 第一頁，重置
          this.chatHistoryAllMessages.set(data.messages);
          this.chatHistory.set(data.messages);
          console.log('[Frontend] Loaded first page:', data.messages.length, 'messages');
        } else {
          // 追加新頁
          const existing = this.chatHistoryAllMessages();
          const combined = [...existing, ...data.messages];
          this.chatHistoryAllMessages.set(combined);
          this.chatHistory.set(combined);
          console.log('[Frontend] Loaded page', page, ':', data.messages.length, 'messages, total:', combined.length);
        }
        
        this.chatHistoryHasMore.set(data.hasMore || false);
        this.isLoadingChatHistory.set(false);
        this.chatHistoryLoadingMore.set(false);
        console.log('[Frontend] Chat history loaded. Has more:', data.hasMore, 'Total:', data.total);
      } else {
        console.error('[Frontend] Chat history error:', data.error);
        this.isLoadingChatHistory.set(false);
        this.chatHistoryLoadingMore.set(false);
      }
    });
    
    this.ipcService.on('chat-message-received', (data: { userId: string, message: string, timestamp: string }) => {
      // 實時更新聊天記錄
      if (this.selectedChatUserId() === data.userId) {
        this.loadChatHistory(data.userId);
      }
      // 更新聊天列表
      this.loadChatList();
    });
    
    this.ipcService.on('ai-response-generated', (data: { userId: string, aiResponse: string, mode: string, autoSent: boolean }) => {
      // AI 回復生成後，更新聊天記錄
      if (this.selectedChatUserId() === data.userId) {
        this.loadChatHistory(data.userId);
      }
    });
    
    this.ipcService.on('monitoring-status', (data: { success: boolean, isMonitoring?: boolean, listenerAccounts?: any[], senderAccounts?: any[] }) => {
      if (data.success) {
        console.log('[Frontend] Monitoring status:', data);
      }
    });
    
    this.ipcService.on('monitoring-health', (data: { success: boolean, isHealthy?: boolean, issues?: string[], warnings?: string[] }) => {
      if (data.success) {
        if (data.issues && data.issues.length > 0) {
          console.warn('[Frontend] Monitoring issues:', data.issues);
        }
        if (data.warnings && data.warnings.length > 0) {
          console.warn('[Frontend] Monitoring warnings:', data.warnings);
        }
      }
    });
    
    this.ipcService.on('alerts-loaded', (data: { alerts: Alert[], count: number }) => {
        const alerts = data.alerts.map(a => ({
            ...a,
            timestamp: new Date(a.timestamp).toISOString(),
            acknowledged_at: a.acknowledged_at ? new Date(a.acknowledged_at).toISOString() : undefined,
            resolved_at: a.resolved_at ? new Date(a.resolved_at).toISOString() : undefined
        }));
        this.alerts.set(alerts);
    });
  }
  
  private applyInitialState(state: any) {
        console.log('Received initial state from backend:', state);
        
        // 🆕 更新連接狀態為已連接
        this.backendConnectionState.set('connected');
        this.backendConnectionProgress.set(100);
        this.backendConnectionMessage.set('連接成功');
        if (this.connectionTimeoutId) {
          clearTimeout(this.connectionTimeoutId);
          this.connectionTimeoutId = null;
        }
        
        this.accounts.set(state.accounts || []);
        this.keywordSets.set(state.keywordSets || []);
        this.monitoredGroups.set(state.monitoredGroups || []);
        this.campaigns.set(state.campaigns || []);
        this.messageTemplates.set(state.messageTemplates || []);
        
        // Restore monitoring state if provided
        if (state.isMonitoring !== undefined) {
            this.isMonitoring.set(state.isMonitoring);
        }
        const mappedLeads = (state.leads || []).map((l: any) => this.mapLeadFromBackend(l));
        this.leads.set(mappedLeads);
        // 設置 leads 總數（如果後端提供了 total，則使用；否則使用 leads 數組長度）
        this.leadsTotal.set(state.leadsTotal ?? state.leads?.length ?? 0);
        
        // 🆕 同時更新資源中心，使用同一份 leads 數據
        this.contactsService.importLeadsDirectly(mappedLeads);
        
        this.logs.set((state.logs || []).map((l: LogEntry) => ({...l, timestamp: new Date(l.timestamp)})));
        
        // Load settings
        if (state.settings) {
            this.spintaxEnabled.set(state.settings.spintaxEnabled ?? true);
            this.autoReplyEnabled.set(state.settings.autoReplyEnabled ?? false);
            this.autoReplyMessage.set(state.settings.autoReplyMessage || "Thanks for getting back to me! I'll read your message and respond shortly.");
            this.smartSendingEnabled.set(state.settings.smartSendingEnabled ?? true);
        }
        
        // 🆕 P2-1: 緩存狀態到 IndexedDB（用於快速啟動）
        this.offlineCache.cacheState({
          accounts: state.accounts || [],
          keywordSets: state.keywordSets || [],
          monitoredGroups: state.monitoredGroups || [],
          campaigns: state.campaigns || [],
          leads: state.leads || [],
          settings: state.settings || {}
        });
  }

  // --- View & Language ---
  setLanguage(lang: Language) { this.translationService.setLanguage(lang); }
  changeView(view: View) { 
    // ========== 會員等級功能權限檢查 ==========
    
    // 白銀功能：廣告發送
    if (view === 'ads' && !this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning(`🥈 廣告發送功能需要 白銀精英 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：多角色協作
    if (view === 'multi-role' && !this.membershipService.hasFeature('multiRole')) {
      this.toastService.warning(`💎 多角色協作功能需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：用戶追蹤
    if (view === 'user-tracking' && !this.membershipService.hasFeature('advancedAnalytics')) {
      this.toastService.warning(`💎 用戶追蹤功能需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：AI營銷活動
    if (view === 'campaigns' && !this.membershipService.hasFeature('aiSalesFunnel')) {
      this.toastService.warning(`💎 營銷活動功能需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：AI團隊銷售 (自動執行)
    if (view === 'ai-team' && !this.membershipService.hasFeature('autoExecution')) {
      this.toastService.warning(`💎 AI團隊銷售需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：AI 策略規劃
    if (view === 'ai-assistant' && !this.membershipService.hasFeature('strategyPlanning')) {
      this.toastService.warning(`💎 AI策略規劃需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 黃金功能：數據洞察
    if (view === 'analytics' && !this.membershipService.hasFeature('dataInsightsBasic')) {
      this.toastService.warning(`🥇 數據洞察功能需要 黃金大師 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 黃金功能：數據分析中心
    if (view === 'analytics-center' && !this.membershipService.hasFeature('dataInsightsBasic')) {
      this.toastService.warning(`🥇 數據分析功能需要 黃金大師 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 🆕 Phase P1: 補充缺失的權限檢查
    // 黃金功能：客戶培育
    if (view === 'lead-nurturing' && !this.membershipService.hasFeature('dataInsightsBasic')) {
      this.toastService.warning(`🥇 客戶培育功能需要 黃金大師 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 鑽石功能：培育分析
    if (view === 'nurturing-analytics' && !this.membershipService.hasFeature('advancedAnalytics')) {
      this.toastService.warning(`💎 培育分析功能需要 鑽石王牌 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    // 🔧 P0: 先同步到 NavBridgeService，讓子組件的 effect 能捕獲變化
    this.navBridge.navigateTo(view as any);
    
    // 然後更新本地視圖（觸發 @switch 重新渲染）
    this.currentView.set(view);
    
    // 🆕 切換到資源中心時自動同步 leads 數據
    if (view === 'resources') {
      const currentLeads = this.leads();
      if (currentLeads.length > 0) {
        this.syncLeadsToResourceCenter(currentLeads);
        console.log('[changeView] Synced leads to resource center:', currentLeads.length);
      }
    }
  }
  
  // 智能模式切換權限檢查
  switchDashboardMode(mode: 'smart' | 'classic') {
    if (mode === 'smart' && !this.membershipService.hasFeature('smartMode')) {
      this.toastService.warning(`🥇 智能模式需要 黃金大師 或以上會員`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    this.dashboardMode.set(mode);
  }

  // Dashboard 導航處理
  handleDashboardNavigation(page: string) {
    const viewMap: Record<string, View> = {
      'monitoring-accounts': 'monitoring-accounts',
      'monitoring-groups': 'monitoring-groups',
      'keyword-sets': 'keyword-sets',
      'chat-templates': 'chat-templates',
      'trigger-rules': 'trigger-rules', // 觸發規則頁面
      'collected-users': 'collected-users', // 收集用戶頁面（廣告識別）
      'automation-rules': 'trigger-rules', // 觸發規則配置（新入口）
      'resources': 'resources',
      'rules': 'trigger-rules', // 自動化規則指向新的觸發規則頁面
      'send-settings': 'leads', // 發送設置在發送控制台
      'analytics': 'analytics'
    };
    const targetView = viewMap[page];
    if (targetView) {
      this.changeView(targetView);
    }
  }

  // Dashboard 配置動作處理
  handleDashboardConfigAction(action: string) {
    // 跳轉到對應的配置頁面
    this.handleDashboardNavigation(action);
  }
  
  // 统一的批量操作权限检查辅助函数
  private checkBatchOperationPermission(): boolean {
    if (!this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning(`🥇 批量操作功能需要 黃金大師 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return false;
    }
    return true;
  }

  // --- CORE LOGIC via IPC ---
  
  addAccount() {
    // 會員配額檢查
    const accountCheck = this.membershipService.canAddAccount(this.accounts().length);
    if (!accountCheck.allowed) {
      this.toastService.warning(accountCheck.message || '已達到賬戶數量上限');
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newAccount();
    
    // Clear previous errors
    this.validationErrors.set({});
    
    // Frontend validation
    const errors: string[] = [];
    
    // Validate phone - remove spaces, dashes, and parentheses before validation
    const cleanedPhone = form.phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!cleanedPhone) {
      errors.push('Phone number is required');
    } else if (!/^\+\d{1,15}$/.test(cleanedPhone)) {
      errors.push('Phone number must be in format +1234567890 (with country code)');
    }
    
    // Validate API ID
    if (form.apiId && !/^\d+$/.test(form.apiId.trim())) {
      errors.push('API ID must be a positive integer');
    }
    
    // Validate API Hash
    if (form.apiHash && !/^[a-fA-F0-9]{32}$/.test(form.apiHash.trim())) {
      errors.push('API Hash must be a 32-character hexadecimal string');
    }
    
    // Validate proxy (optional)
    if (form.proxy && !/^(socks5|http|https):\/\/([^:]+(:[^@]+)?@)?[^:]+(:\d+)?$/.test(form.proxy.trim())) {
      errors.push('Proxy must be in format: socks5://host:port or http://host:port');
    }
    
    if (errors.length > 0) {
      this.validationErrors.set({ 'account': errors });
      this.toastService.error(`验证失败: ${errors.join('; ')}`);
      console.error('Account validation errors:', errors);
      return;
    }
    
    // Prepare account data - use cleaned phone number
    const cleanedPhoneForSubmit = form.phone.trim().replace(/[\s\-\(\)]/g, '');
    const accountData = {
      phone: cleanedPhoneForSubmit,
      apiId: form.apiId.trim(),
      apiHash: form.apiHash.trim(),
      proxy: form.proxy.trim() || '',
      group: form.group.trim() || '',
      twoFactorPassword: form.twoFactorPassword.trim() || '',
      role: 'Unassigned', // Default role
      enableWarmup: form.enableWarmup || false
    };
    
    console.log('Sending add-account command:', accountData);
    
    // Send to backend
    this.ipcService.send('add-account', accountData);
    
    // Clear form
    this.newAccount.set({ phone: '', proxy: '', apiId: '', apiHash: '', enableWarmup: true, twoFactorPassword: '', group: '' });
    
    // Show loading toast
    this.toastService.info('正在添加账户，请稍候...');
  }

  /**
   * 處理從添加帳戶頁面添加的帳戶
   */
  onAccountAdded(event: any): void {
    console.log('[Frontend] Account added from add-account page:', event);
    // 帳戶已經在後端添加並通過 accounts-updated 事件更新
    // 這裡可以執行額外的操作，如切換回帳戶列表
    this.toastService.success('帳戶添加成功！');
    // 自動切換到帳戶列表視圖
    this.changeView('accounts');
  }

  /**
   * 導航到添加帳戶頁面
   */
  goToAddAccount(): void {
    this.changeView('add-account');
  }

  loginAccount(accountId: number) {
    console.log('[Frontend] loginAccount called with accountId:', accountId);
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) {
      console.error('[Frontend] Account not found:', accountId);
      this.toastService.error('账户未找到');
      return;
    }
    console.log('[Frontend] Found account:', account.phone, 'Status:', account.status);
    this.toastService.info('正在登录账户...');
    
    // Reset login state
    this.loginState.set({
      accountId: accountId,
      phone: account.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this.loginCode.set('');
    this.login2FAPassword.set('');
    
    console.log('[Frontend] Sending login-account command to IPC');
    this.ipcService.send('login-account', accountId);
  }

  /**
   * 退出账户（断开连接但保留账户）
   */
  logoutAccount(accountId: number): void {
    const account = this.accounts().find(a => a.id === accountId);
    if (!account) {
      this.toastService.error('账户未找到');
      return;
    }
    
    if (confirm(`确定要退出账户 ${account.phone} 吗？`)) {
      this.toastService.info('正在退出账户...');
      this.ipcService.send('logout-account', accountId);
      
      // 监听退出结果
      this.ipcService.once('logout-account-result', (result: any) => {
        if (result.success) {
          this.toastService.success(`账户 ${account.phone} 已退出`);
        } else {
          this.toastService.error(`退出失败: ${result.error || '未知错误'}`);
        }
      });
    }
  }

  /**
   * 編輯帳戶
   */
  editAccount(account: TelegramAccount): void {
    // 可以打開編輯對話框或導航到編輯頁面
    this.toastService.info(`編輯帳戶: ${account.phone}`);
    // TODO: 實現編輯功能
  }
  
  submitLoginCode() {
    const state = this.loginState();
    if (!state.accountId || !state.phoneCodeHash || !this.loginCode().trim()) {
      return;
    }
    
    // Immediately close dialog and show loading state
    this.loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,  // Close the code input dialog
      requires2FA: false,
      phoneCodeHash: state.phoneCodeHash,
      isSubmittingCode: true  // Show loading state
    });
    
    // Show loading feedback
    this.toastService.info('正在验证验证码...');
    
    // Send login command with verification code
    this.ipcService.send('login-account', {
      accountId: state.accountId,
      phoneCode: this.loginCode().trim(),
      phoneCodeHash: state.phoneCodeHash
    });
    
    // Reset code input
    this.loginCode.set('');
  }
  
  submitLogin2FA() {
    const state = this.loginState();
    if (!state.accountId || !this.login2FAPassword().trim()) {
      return;
    }
    
    this.ipcService.send('login-account', {
      accountId: state.accountId,
      twoFactorPassword: this.login2FAPassword().trim()
    });
    
    // Reset 2FA input
    this.login2FAPassword.set('');
  }
  
  cancelLogin() {
    this.loginState.set({
      accountId: null,
      phone: '',
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this.loginCode.set('');
    this.login2FAPassword.set('');
  }
  
  resendVerificationCode() {
    const state = this.loginState();
    if (!state.accountId) {
      return;
    }
    
    // Reset state and resend login request (only for Telegram APP, no SMS)
    this.loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this.loginCode.set('');
    
    // Show message for resending (only Telegram APP)
    this.toastService.info('正在重新发送验证码到您的 Telegram 应用...', 5000);
    
    // Resend login request (will trigger code sending again to Telegram APP)
    this.ipcService.send('login-account', state.accountId);
  }
  
  checkAccountStatus(accountId: number) { this.ipcService.send('check-account-status', accountId); }
  private isStartingMonitoring = signal(false);
  
  // 監控配置檢查結果
  lastConfigCheck = signal<{
    passed: boolean,
    critical_issues: Array<{code: string, message: string, fix: string}>,
    warnings: Array<{code: string, message: string, fix: string}>,
    info: string[],
    summary: {can_monitor: boolean, can_send_messages: boolean, critical_count: number, warning_count: number}
  } | null>(null);
  
  // 錯誤代碼到頁面/元素的映射
  errorNavigationMap: {[key: string]: {view: string, elementId?: string, action?: () => void}} = {
    'NO_LISTENER': {view: 'accounts', elementId: 'accounts-section'},
    'LISTENER_OFFLINE': {view: 'accounts', elementId: 'accounts-section'},
    'NO_SENDER': {view: 'accounts', elementId: 'accounts-section'},
    'SENDER_OFFLINE': {view: 'accounts', elementId: 'accounts-section'},
    'SENDER_LIMIT_REACHED': {view: 'accounts', elementId: 'accounts-section'},
    'NO_GROUPS': {view: 'automation', elementId: 'monitored-groups-section'},
    'NO_KEYWORDS': {view: 'automation', elementId: 'keyword-sets-section'},
    'EMPTY_KEYWORDS': {view: 'automation', elementId: 'keyword-sets-section'},
    'GROUP_NO_KEYWORD': {view: 'automation', elementId: 'monitored-groups-section'},
    'NO_CAMPAIGN': {view: 'trigger-rules', elementId: 'trigger-rules-section'},
    'NO_ACTIVE_CAMPAIGN': {view: 'trigger-rules', elementId: 'trigger-rules-section'},
    'CAMPAIGN_INCOMPLETE': {view: 'trigger-rules', elementId: 'trigger-rules-section'},
    'NO_TEMPLATE': {view: 'automation', elementId: 'templates-section'},
    'AI_NOT_ENABLED': {view: 'ai-center', elementId: 'ai-settings-section'}
  };
  
  // 導航到錯誤位置
  navigateToError(errorCode: string) {
    const nav = this.errorNavigationMap[errorCode];
    if (!nav) {
      console.log('[Frontend] No navigation defined for error:', errorCode);
      return;
    }
    
    // 切換到目標頁面
    this.changeView(nav.view as any);
    
    // 延遲後滾動到目標元素並高亮
    setTimeout(() => {
      if (nav.elementId) {
        const element = document.getElementById(nav.elementId);
        if (element) {
          // 滾動到元素
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // 添加高亮動畫
          element.classList.add('highlight-pulse');
          setTimeout(() => {
            element.classList.remove('highlight-pulse');
          }, 3000);
        }
      }
      
      // 執行自定義動作
      if (nav.action) {
        nav.action();
      }
    }, 300);
    
    this.toastService.info(`已跳轉到相關設置區域`, 2000);
  }
  
  startMonitoring() {
    // 防止重複點擊
    if (this.isStartingMonitoring()) {
      this.toastService.warning('正在啟動監控，請稍候...', 2000);
      return;
    }
    
    // 檢查是否有在線的監聽賬戶
    const listeners = this.listenerAccounts();
    if (listeners.length === 0) {
      // 檢查是否有監聽賬戶但未在線
      const allListeners = this.accounts().filter(a => a.role === 'Listener');
      if (allListeners.length > 0) {
        const offlineListeners = allListeners.filter(a => a.status !== 'Online');
        if (offlineListeners.length > 0) {
          this.toastService.error(
            `無法啟動監控：有 ${allListeners.length} 個監聽賬戶，但沒有在線的賬戶。\n\n` +
            `請先登錄以下賬戶使其在線：\n` +
            offlineListeners.map(a => `- ${a.phone} (${a.status})`).join('\n'),
            8000
          );
        } else {
          this.toastService.error('無法啟動監控：監聽賬戶狀態異常，請檢查賬戶狀態。', 5000);
        }
      } else {
        this.toastService.error(
          '無法啟動監控：沒有監聽賬戶。\n\n請先：\n1. 在"賬戶管理"中添加賬戶\n2. 將賬戶角色設置為"監聽"\n3. 登錄賬戶使其在線',
          6000
        );
      }
      return;
    }
    
    // 檢查是否有監控群組
    if (this.monitoredGroups().length === 0) {
      this.toastService.warning('沒有配置監控群組。請先添加監控群組。', 4000);
      return;
    }
    
    // 檢查是否有關鍵詞集
    if (this.keywordSets().length === 0) {
      this.toastService.warning('沒有配置關鍵詞集。請先添加關鍵詞集。', 4000);
      return;
    }
    
    // 檢查監聽賬戶的穩定性（如果賬戶剛上線，等待一下）
    const recentlyOnline = listeners.filter(a => {
      // 這裡可以添加更複雜的穩定性檢查邏輯
      // 目前簡單檢查：如果賬戶狀態是 Online 就認為穩定
      return a.status === 'Online';
    });
    
    if (recentlyOnline.length === 0) {
      this.toastService.warning('監聽賬戶狀態不穩定，請等待賬戶完全上線後再試。', 4000);
      return;
    }
    
    // 設置啟動狀態
    this.isStartingMonitoring.set(true);
    
    // 發送啟動監控命令
    this.ipcService.send('start-monitoring');
    
    // 5 秒後重置狀態（如果後端沒有響應）
    setTimeout(() => {
      this.isStartingMonitoring.set(false);
    }, 5000);
  }
  stopMonitoring() { this.ipcService.send('stop-monitoring'); }
  
  // === 一鍵啟動控制 ===
  // 🔧 P0 v2: 不在前端阻止，讓後端處理帳號連接
  oneClickStart() {
    if (this.oneClickStarting()) {
      this.toastService.warning('正在啟動中，請稍候...', 2000);
      return;
    }
    
    // 檢查是否有任何帳號配置
    const totalAccounts = this.accounts().length;
    if (totalAccounts === 0) {
      this.toastService.error('❌ 沒有配置任何帳號，請先添加帳號', 4000);
      return;
    }
    
    this.oneClickStarting.set(true);
    this.oneClickProgress.set(0);
    this.oneClickMessage.set(`🚀 開始啟動 (${totalAccounts} 個帳號)...`);
    
    // 直接發送啟動命令，後端會嘗試連接所有帳號
    this.ipcService.send('one-click-start', { forceRefresh: true });
    this.toastService.info(`🚀 開始一鍵啟動，後端將自動連接 ${totalAccounts} 個帳號`, 3000);
  }
  
  oneClickStop() {
    if (confirm('確定要停止所有服務嗎？這將停止監控和 AI 自動聊天。')) {
      this.ipcService.send('one-click-stop');
    }
  }
  
  loadSystemStatus() {
    this.ipcService.send('get-system-status');
  }
  
  clearLogs() { 
    if (confirm('确定要清除所有日志吗？此操作不可撤销。')) {
      this.ipcService.send('clear-logs'); 
      this.logs.set([]);
      this.toastService.success('日志已清除');
    }
  }
  
  // Queue management
  refreshQueueStatus(phone?: string) {
    this.ipcService.send('get-queue-status', phone ? { phone } : {});
  }
  
  clearPendingQueue() {
    if (confirm('確定要清空所有待發送消息嗎？此操作不可撤銷。')) {
      this.ipcService.send('clear-queue', { status: 'pending' });
      this.toastService.success('待發送隊列已清空');
    }
  }
  
  retryMessage(messageId: string) {
    this.ipcService.send('retry-message', { messageId });
    this.toastService.info('正在重試發送...');
  }
  
  cancelMessage(messageId: string) {
    this.ipcService.send('cancel-message', { messageId });
    this.toastService.success('消息已取消');
    this.refreshQueueStatus();
  }
  
  clearQueue(phone: string, status?: string) {
    if (confirm('确定要清空队列吗？此操作不可撤销。')) {
      this.ipcService.send('clear-queue', { phone, status });
      this.toastService.info('正在清空队列...');
    }
  }
  
  pauseQueue(phone: string) {
    this.ipcService.send('pause-queue', { phone });
    this.toastService.info('正在暂停队列...');
  }
  
  resumeQueue(phone: string) {
    this.ipcService.send('resume-queue', { phone });
    this.toastService.info('正在恢复队列...');
  }
  
  deleteQueueMessage(phone: string, messageId: string) {
    if (confirm('确定要删除这条消息吗？')) {
      this.ipcService.send('delete-queue-message', { phone, messageId });
      this.toastService.info('正在删除消息...');
    }
  }
  
  updateQueueMessagePriority(phone: string, messageId: string, priority: string) {
    // Validate and cast priority
    const validPriority = (priority === 'HIGH' || priority === 'NORMAL' || priority === 'LOW') 
      ? priority as 'HIGH' | 'NORMAL' | 'LOW' 
      : 'NORMAL';
    this.ipcService.send('update-queue-message-priority', { phone, messageId, priority: validPriority });
  }
  
  getQueueMessages(phone?: string, status?: string, limit: number = 100) {
    this.ipcService.send('get-queue-messages', { phone, status, limit });
  }
  
  viewQueueDetails(phone: string) {
    this.selectedQueuePhone.set(phone);
    this.getQueueMessages(phone);
  }
  
  closeQueueDetails() {
    this.selectedQueuePhone.set(null);
    this.queueMessages.set([]);
  }
  
  // Analytics methods
  loadSendingStats(days: number = 7, phone?: string) {
    this.ipcService.send('get-sending-stats', { days, phone });
  }
  
  loadQueueLengthHistory(days: number = 7) {
    this.ipcService.send('get-queue-length-history', { days });
  }
  
  loadAccountSendingComparison(days: number = 7) {
    this.ipcService.send('get-account-sending-comparison', { days });
  }
  
  loadCampaignPerformanceStats(days: number = 7) {
    this.ipcService.send('get-campaign-performance-stats', { days });
  }
  
  selectedDays = signal(7);
  
  onDaysChange(days: number) {
    this.selectedDays.set(days);
    this.loadAllAnalytics(days);
  }
  
  loadAllAnalytics(days: number = 7) {
    this.loadSendingStats(days);
    this.loadQueueLengthHistory(days);
    this.loadAccountSendingComparison(days);
    this.loadCampaignPerformanceStats(days);
  }
  
  // Chart data functions for analytics page
  capturesChartData(): TimeSeriesData | null {
    const leads = this.filteredAnalyticsLeads();
    const days = this.selectedDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const labels: string[] = [];
    const data: number[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      labels.push(dateStr);
      
      const count = leads.filter(l => {
        const leadDate = new Date(l.timestamp);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === date.getTime();
      }).length;
      data.push(count);
    }
    
    return {
      labels,
      datasets: [{
        label: '捕获潜在客户',
        data,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true
      }]
    };
  }
  
  conversionsChartData(): TimeSeriesData | null {
    const leads = this.filteredAnalyticsLeads();
    const days = this.selectedDays();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const labels: string[] = [];
    const contactedData: number[] = [];
    const repliedData: number[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      labels.push(dateStr);
      
      const dayLeads = leads.filter(l => {
        const leadDate = new Date(l.timestamp);
        leadDate.setHours(0, 0, 0, 0);
        return leadDate.getTime() === date.getTime();
      });
      
      contactedData.push(dayLeads.filter(l => l.status !== 'New').length);
      repliedData.push(dayLeads.filter(l => ['Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost'].includes(l.status)).length);
    }
    
    return {
      labels,
      datasets: [{
        label: '已联系',
        data: contactedData,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      }, {
        label: '已回复',
        data: repliedData,
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true
      }]
    };
  }
  
  messagesChartData(): TimeSeriesData | null {
    // Use sending stats data if available
    return this.sendingStatsData();
  }
  
  funnelChartData(): TimeSeriesData | null {
    const funnel = this.funnelStats();
    if (!funnel || !funnel.stages || Object.keys(funnel.stages).length === 0) {
      return null;
    }
    
    const stages = this.funnelStages;
    const labels = stages.map(s => s.name);
    const data = stages.map(s => {
      const stageData = funnel.stages[s.key];
      return stageData ? stageData.count : 0;
    });
    
    return {
      labels,
      datasets: [{
        label: '漏斗数据',
        data,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(168, 85, 247)',
          'rgb(239, 68, 68)',
          'rgb(245, 158, 11)',
          'rgb(236, 72, 153)',
          'rgb(16, 185, 129)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }]
    };
  }
  
  // Alert management state
  alertManagementTab = signal<'alerts' | 'rules' | 'history'>('alerts');
  alertRules: WritableSignal<Array<{
    id: number;
    name: string;
    alert_type: string;
    condition: string;
    level: string;
    enabled: boolean;
  }>> = signal([]);
  alertHistory: WritableSignal<Array<{
    id: number;
    level: string;
    message: string;
    alert_type: string;
    timestamp: string;
    acknowledged: boolean;
    resolved: boolean;
    resolved_at?: string;
  }>> = signal([]);
  showAddAlertRuleDialog = signal(false);
  
  // Alert methods
  loadAlerts(unresolvedOnly: boolean = false, level?: string) {
    this.ipcService.send('get-alerts', { limit: 50, unresolvedOnly, level });
  }
  
  acknowledgeAlert(alertId: number) {
    this.ipcService.send('acknowledge-alert', { alertId });
  }
  
  resolveAlert(alertId: number) {
    this.ipcService.send('resolve-alert', { alertId });
  }
  
  loadAlertHistory(days: number = 30) {
    this.ipcService.send('get-alert-history', { days });
  }
  
  loadAlertRules() {
    this.ipcService.send('get-alert-rules', {});
  }
  
  toggleAlertRule(ruleId: number) {
    this.ipcService.send('toggle-alert-rule', { ruleId });
  }
  
  editAlertRule(rule: any) {
    // TODO: Open edit dialog
    this.showAddAlertRuleDialog.set(true);
  }
  
  deleteAlertRule(ruleId: number) {
    if (confirm('确定要删除此告警规则吗？')) {
      this.ipcService.send('delete-alert-rule', { ruleId });
    }
  }
  
  async showNotification(title: string, body: string, options?: NotificationOptions) {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/assets/icon.png',
          badge: '/assets/badge.png',
          tag: 'tg-matrix-notification',
          requireInteraction: false,
          ...options
        });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          this.showNotification(title, body, options);
        }
      }
    }
  }
  
  showBrowserNotification(alert: Alert) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`告警: ${alert.level.toUpperCase()}`, {
        body: alert.message,
        icon: '/assets/icon.ico',
        tag: `alert-${alert.id}`,
        requireInteraction: alert.level === 'critical' || alert.level === 'error'
      });
    }
  }
  
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }
  
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
  
  // 將後端數據映射為前端 Lead 格式（蛇形 -> 駝峰）
  mapLeadFromBackend(l: any): CapturedLead {
    // 判斷數據來源類型
    let sourceType: 'group_extract' | 'keyword_trigger' | 'import' | 'unknown' = 'unknown';
    const notes = l.notes || '';
    const triggeredKeyword = l.triggered_keyword || l.triggeredKeyword || '';
    
    if (notes.includes('觸發詞') || triggeredKeyword) {
      sourceType = 'keyword_trigger';
    } else if (l.extracted_by_phone || l.source_chat_id) {
      sourceType = 'group_extract';
    } else if (notes.includes('導入') || notes.includes('import')) {
      sourceType = 'import';
    }
    
    return {
      id: l.id,
      userId: l.user_id || l.userId || '',
      username: l.username || '',
      firstName: l.first_name || l.firstName || '',
      lastName: l.last_name || l.lastName || '',
      sourceGroup: l.source_chat_title || l.sourceGroup || l.source_group || '',
      triggeredKeyword: notes || triggeredKeyword || '',
      timestamp: new Date(l.created_at || l.timestamp || l.extracted_at || Date.now()),
      status: (l.status || l.response_status || 'New') as LeadStatus,
      onlineStatus: (l.online_status || l.onlineStatus || 'hidden') as OnlineStatus,
      assignedTemplateId: l.assignedTemplateId || l.assigned_template_id,
      interactionHistory: l.interactionHistory || l.interaction_history || [],
      doNotContact: !!l.doNotContact || !!l.do_not_contact,
      campaignId: l.campaignId || l.campaign_id,
      intentScore: l.intent_score || l.intentScore || 0,
      intentLevel: l.intent_level || l.intentLevel || 'none',
      sourceType: l.source_type || l.sourceType || sourceType
    };
  }
  
  // 🆕 同步 leads 到資源中心
  syncLeadsToResourceCenter(leads: any[]): void {
    const mappedLeads = (leads || []).map((l: any) => this.mapLeadFromBackend(l));
    this.contactsService.importLeadsDirectly(mappedLeads);
    console.log('[Frontend] Synced', mappedLeads.length, 'leads to resource center');
  }
  
  // 🆕 延遲加載剩餘的 leads 數據（後台靜默加載）
  loadRemainingLeads(): void {
    console.log('[Frontend] loadRemainingLeads called, loading:', this.leadsLoading(), 'hasMore:', this.leadsHasMore());
    
    if (this.leadsLoading()) {
      console.log('[Frontend] ⏳ Already loading, skipping...');
      return;
    }
    
    // 🆕 允許強制加載（即使 hasMore 為 false，只要當前數據少於總數）
    const currentCount = this.leads().length;
    const total = this.leadsTotal();
    if (currentCount >= total && total > 0) {
      console.log('[Frontend] ✅ All data already loaded:', currentCount, '/', total);
      return;
    }
    
    console.log('[Frontend] 📥 Loading remaining leads:', currentCount, '/', total);
    this.leadsLoading.set(true);
    
    // 請求所有剩餘的 leads
    this.ipcService.send('get-leads-paginated', {
      page: 1,
      pageSize: 500,  // 加載全部
      status: null,
      search: null
    });
  }
  
  // 安全的日期格式化，處理 Invalid Date
  safeFormatDate(date: any, format: string = 'MM/dd HH:mm'): string {
    if (!date) return '-';
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return '-';
      
      // 簡單格式化
      const pad = (n: number) => n.toString().padStart(2, '0');
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      const year = d.getFullYear();
      
      if (format === 'MM/dd HH:mm') return `${month}/${day} ${hours}:${mins}`;
      if (format === 'yyyy-MM-dd HH:mm') return `${year}-${month}-${day} ${hours}:${mins}`;
      if (format === 'HH:mm:ss') return `${hours}:${mins}:${pad(d.getSeconds())}`;
      return `${month}/${day} ${hours}:${mins}`;
    } catch {
      return '-';
    }
  }
  
  getQueueStatusForAccount(phone: string): QueueStatus | null {
    return this.queueStatuses()[phone] || null;
  }
  
  getTotalQueueStats() {
    const statuses = this.queueStatuses();
    let totalPending = 0;
    let totalProcessing = 0;
    let totalRetrying = 0;
    let totalFailed = 0;
    let totalCompleted = 0;
    let totalFailedCount = 0;
    
    Object.values(statuses).forEach(status => {
      totalPending += status.pending;
      totalProcessing += status.processing;
      totalRetrying += status.retrying;
      totalFailed += status.failed;
      totalCompleted += status.stats.completed;
      totalFailedCount += status.stats.failed;
    });
    
    return {
      pending: totalPending,
      processing: totalProcessing,
      retrying: totalRetrying,
      failed: totalFailed,
      completed: totalCompleted,
      failedCount: totalFailedCount,
      totalAccounts: Object.keys(statuses).length
    };
  }
  
  // Log filtering
  applyLogFilter() {
    this.ipcService.send('get-logs', {
      limit: 1000,
      type: this.logFilterType() || undefined,
      startDate: this.logFilterStartDate() || undefined,
      endDate: this.logFilterEndDate() || undefined,
      search: this.logFilterSearch() || undefined
    });
  }
  
  resetLogFilter() {
    this.logFilterType.set('');
    this.logFilterStartDate.set('');
    this.logFilterEndDate.set('');
    this.logFilterSearch.set('');
    this.ipcService.send('get-logs', { limit: 100 });
  }
  
  exportLogs() {
    this.ipcService.send('export-logs', {
      type: this.logFilterType() || undefined,
      startDate: this.logFilterStartDate() || undefined,
      endDate: this.logFilterEndDate() || undefined,
      search: this.logFilterSearch() || undefined
    });
  }
  
  // File operations are now handled by AccountLoaderService which uses IPC
  onExcelFileSelected() { this.accountLoaderService.loadAccountsFromExcel(); }
  onDownloadTemplate() { this.accountLoaderService.downloadExcelTemplate(); }
  reloadSessionsAndAccounts() { this.accountLoaderService.reloadSessionsAndAccounts(); }
  
  // QR 掃碼登入 - 使用 DialogService 統一管理
  openQrLogin() {
    this.dialogService.openQrLogin();
  }
  
  closeQrLogin() {
    this.dialogService.closeQrLogin();
  }
  
  onQrLoginSuccess(data: any) {
    this.dialogService.closeQrLogin();
    this.toastService.success(`帳號 ${data.phone || ''} 已成功添加！`);
    // 重新載入帳號列表
    this.reloadSessionsAndAccounts();
  }
  exportLeads() { 
    // 检查数据导出权限
    if (!this.membershipService.hasFeature('dataExport')) {
      this.toastService.warning(`🥇 數據導出功能需要 黃金大師 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    this.accountLoaderService.exportLeadsToExcel(this.leads()); 
  }
  
  // Session file management
  importSession() { this.ipcService.send('import-session'); }
  exportSession(phoneNumber: string) { this.ipcService.send('export-session', phoneNumber); }
  cleanupSessionFiles() {
    if (confirm('确定要清理所有孤立的 session 文件吗？这将删除所有带时间戳的 session 文件和不在数据库中的 session 文件。')) {
      this.ipcService.send('cleanup-session-files');
      this.toastService.info('正在清理孤立的 session 文件...');
    }
  }

  // === 孤立 Session 恢復 ===
  scanOrphanSessions() {
    this.toastService.info('正在掃描孤立的 Session 文件...', 2000);
    this.ipcService.send('scan-orphan-sessions', {});
  }

  recoverOrphanSessions() {
    const sessions = this.orphanSessions();
    if (sessions.length === 0) {
      this.toastService.warning('沒有需要恢復的 Session 文件');
      return;
    }
    
    this.isRecoveringOrphanSessions.set(true);
    this.toastService.info(`正在恢復 ${sessions.length} 個帳號...`, 2000);
    this.ipcService.send('recover-orphan-sessions', { sessions });
  }

  dismissOrphanSessionDialog() {
    this.showOrphanSessionDialog.set(false);
    this.orphanSessions.set([]);
  }

  toggleAllAccountSelection(event: Event) {
      const isChecked = (event.target as HTMLInputElement).checked;
      const filteredIds = new Set(this.filteredAccounts().map(a => a.id));
      this.accounts.update(accs => accs.map(a => filteredIds.has(a.id) ? {...a, selected: isChecked} : a));
  }

  bulkAssignRole(role: AccountRole) {
      const selectedIds = this.selectedAccounts().map(a => a.id);
      if (selectedIds.length === 0) {
        this.toastService.warning('请先选择要操作的账户');
        return;
      }
      
      // Show progress dialog
      this.progressDialog.set({
        show: true,
        title: '正在批量分配角色...',
        progress: { current: 0, total: selectedIds.length },
        cancellable: false
      });
      
      // Simulate progress (in real scenario, backend would send progress updates)
      this.simulateBulkOperationProgress(selectedIds.length, () => {
        this.ipcService.send('bulk-assign-role', { accountIds: selectedIds, role });
        this.toastService.success(`已为 ${selectedIds.length} 个账户分配角色`);
      });
  }
  
  bulkAssignGroup(group: string | null) {
      const groupName = group || window.prompt(this.t('enterGroupName'));
      if(groupName) {
         const selectedIds = this.selectedAccounts().map(a => a.id);
         if (selectedIds.length === 0) {
           this.toastService.warning('请先选择要操作的账户');
           return;
         }
         
         // Show progress dialog
         this.progressDialog.set({
           show: true,
           title: '正在批量分配分组...',
           progress: { current: 0, total: selectedIds.length },
           cancellable: false
         });
         
         this.simulateBulkOperationProgress(selectedIds.length, () => {
           this.ipcService.send('bulk-assign-group', { accountIds: selectedIds, group: groupName });
           this.toastService.success(`已为 ${selectedIds.length} 个账户分配分组`);
         });
      }
  }
  
  bulkDelete() {
      const selectedIds = this.selectedAccounts().map(a => a.id);
      if (selectedIds.length === 0) {
        this.toastService.warning('请先选择要删除的账户');
        return;
      }
      
      if(window.confirm(`确定要删除 ${selectedIds.length} 个账户吗？此操作不可撤销。`)) {
          // Show progress dialog
          this.progressDialog.set({
            show: true,
            title: '正在批量删除账户...',
            progress: { current: 0, total: selectedIds.length },
            cancellable: false
          });
          
          this.simulateBulkOperationProgress(selectedIds.length, () => {
            this.ipcService.send('bulk-delete-accounts', { accountIds: selectedIds });
            this.toastService.success(`已删除 ${selectedIds.length} 个账户`);
          });
      }
  }
  
  private simulateBulkOperationProgress(total: number, onComplete: () => void) {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.max(1, Math.floor(total / 20)); // Update 20 times
      if (current >= total) {
        current = total;
        clearInterval(interval);
        setTimeout(() => {
          this.progressDialog.set({ ...this.progressDialog(), show: false });
          onComplete();
        }, 300);
      }
      this.progressDialog.set({
        ...this.progressDialog(),
        progress: { 
          current, 
          total,
          message: `处理中 ${current}/${total}`
        }
      });
    }, 50); // Update every 50ms
  }

  updateAccountRole(accountId: number, role: AccountRole) {
      this.ipcService.send('update-account-data', { id: accountId, updates: { role }});
  }

  // 顯示添加群組對話框
  showAddGroupDialog() {
      // 提示用戶添加群組
      this.toastService.info('請在監控群組區塊中點擊「+ 添加群組」');
  }
  
  // 顯示添加關鍵詞集對話框
  showAddKeywordSetDialog() {
      // 會員配額檢查 - 關鍵詞集數量限制
      const quotas = this.membershipService.quotas();
      if (quotas.maxKeywordSets !== -1 && this.keywordSets().length >= quotas.maxKeywordSets) {
          this.toastService.warning(`${this.membershipService.levelIcon()} ${this.membershipService.levelName()} 最多支持 ${quotas.maxKeywordSets} 個關鍵詞集，升級解鎖更多`);
          window.dispatchEvent(new CustomEvent('open-membership-dialog'));
          return;
      }
      // 顯示創建對話框
      this.newKeywordSet.set({ name: '' });
      this.showKeywordSetCreator.set(true);
  }
  
  submitNewKeywordSet() {
      const form = this.newKeywordSet();
      const name = form.name.trim();
      if (name) {
          console.log('[Frontend] Sending add-keyword-set command:', name);
          this.ipcService.send('add-keyword-set', { name: name });
          this.toastService.success('正在創建關鍵詞集...', 2000);
          this.showKeywordSetCreator.set(false);
          this.newKeywordSet.set({ name: '' });
      } else {
          this.toastService.warning('請輸入關鍵詞集名稱', 3000);
      }
  }
  
  cancelNewKeywordSet() {
      this.showKeywordSetCreator.set(false);
      this.newKeywordSet.set({ name: '' });
  }

  addKeywordSet() {
      // 會員配額檢查 - 關鍵詞集數量限制
      const quotas = this.membershipService.quotas();
      if (quotas.maxKeywordSets !== -1 && this.keywordSets().length >= quotas.maxKeywordSets) {
          this.toastService.warning(`${this.membershipService.levelIcon()} ${this.membershipService.levelName()} 最多支持 ${quotas.maxKeywordSets} 個關鍵詞集，升級解鎖更多`);
          window.dispatchEvent(new CustomEvent('open-membership-dialog'));
          return;
      }
      
      const form = this.newKeywordSet();
      const name = form.name.trim();
      if (name) {
          // 驗證名稱不能為空
          if (!name) {
              this.toastService.warning('關鍵詞集名稱不能為空', 3000);
              return;
          }
          
          console.log('[Frontend] Sending add-keyword-set command:', name);
          this.ipcService.send('add-keyword-set', { name: name });
          // 不要立即清空輸入框，等成功後再清空（由事件監聯器處理）
      } else {
          this.toastService.warning('請輸入關鍵詞集名稱', 3000);
      }
  }
  
  // 處理群組配置保存（從自動化中心發送）
  handleSaveGroupConfig(event: { groupId: number; keywordSetIds: number[] }) {
      console.log('[Frontend] Saving group config:', event);
      
      // 找到群組並獲取其 URL
      const group = this.monitoredGroups().find(g => g.id === event.groupId);
      if (group) {
          // 使用 add-group IPC 更新群組的關鍵詞集綁定
          // 後端的 add_group 會檢測 URL 是否已存在，並更新而非創建
          this.ipcService.send('add-group', { 
              url: group.url, 
              keywordSetIds: event.keywordSetIds 
          });
          this.toastService.success('群組配置已保存', 2000);
      } else {
          console.error('[Frontend] Group not found for config save:', event.groupId);
          this.toastService.error('找不到群組，無法保存配置');
      }
  }
  
  // 處理關鍵詞集配置保存（從自動化中心發送）
  handleSaveKeywordSetConfig(event: { setId: number; keywords: string[] }) {
      console.log('[Frontend] Saving keyword set config:', event);
      
      // 獲取當前詞集的關鍵詞列表
      const currentSet = this.keywordSets().find(s => s.id === event.setId);
      const currentKeywords = currentSet?.keywords?.map(k => k.keyword) || [];
      
      // 計算需要添加的新關鍵詞
      const newKeywords = event.keywords.filter(k => !currentKeywords.includes(k));
      
      // 為每個新關鍵詞調用 add-keyword
      for (const keyword of newKeywords) {
          console.log('[Frontend] Adding keyword:', keyword, 'to set:', event.setId);
          this.ipcService.send('add-keyword', { 
              setId: event.setId, 
              keyword: keyword,
              isRegex: false 
          });
      }
      
      if (newKeywords.length > 0) {
          this.toastService.success(`已添加 ${newKeywords.length} 個關鍵詞`, 2000);
      } else {
          this.toastService.info('沒有新關鍵詞需要添加', 2000);
      }
  }

  // 處理從自動化中心發起的成員提取請求
  handleExtractMembersFromAutomation(event: { groupId: string; groupName: string; groupUrl?: string; memberCount: number }) {
      console.log('[Frontend] Extract members from automation center:', event);
      
      try {
        // 從 groupUrl 提取 username
        let username = '';
        if (event.groupUrl) {
          username = event.groupUrl
            .replace('@', '')
            .replace('https://t.me/', '')
            .replace('http://t.me/', '')
            .replace('t.me/', '')
            .split('/')[0]; // 處理 https://t.me/xxx/123 的情況
        }
        
        // 從 monitoredGroups 中查找完整的群組信息
        const monitoredGroup = this.monitoredGroups().find(g => 
          g.id === parseInt(event.groupId, 10) || 
          g.url === event.groupUrl ||
          g.url === `@${username}` ||
          g.url === username
        );
        
        // 從 discoveredResources 中查找對應的資源（有完整的 telegram_id）
        const discoveredResource = this.discoveredResources().find(r => 
          r.username === username || 
          r.id === parseInt(event.groupId, 10)
        );
        
        // 構造一個 resource 對象，與 openMemberListDialog 兼容
        const resource = {
            id: discoveredResource?.id || parseInt(event.groupId, 10) || 0,
            title: event.groupName,
            username: username,
            telegram_id: discoveredResource?.telegram_id || monitoredGroup?.telegram_id || username || event.groupId,
            member_count: event.memberCount || monitoredGroup?.member_count || 0,
            resource_type: 'group'
        };
        
        console.log('[Frontend] Opening member list dialog with resource:', resource);
        
        // 檢查是否有有效的標識符
        if (!resource.telegram_id && !resource.username) {
          this.toastService.error('無法獲取群組信息，請從資源發現頁面提取成員');
          return;
        }
        
        // 切換到資源發現頁面（因為成員列表對話框在該視圖中）
        this.currentView.set('resources');
        
        // 使用 setTimeout 確保視圖切換完成後再打開對話框
        setTimeout(() => {
          this.openMemberListDialog(resource);
        }, 100);
      } catch (error) {
        console.error('[Frontend] Error opening member list dialog:', error);
        this.toastService.error('打開成員提取對話框失敗');
      }
  }

  addKeyword() {
    const form = this.newKeyword();
    
    // 驗證關鍵詞
    if (!form.setId) {
        this.toastService.warning(this.t('selectKeywordSetFirst'), 3000);
        return;
    }
    
    if (!form.keyword.trim()) {
        this.toastService.warning(this.t('keywordEmpty'), 3000);
        return;
    }
    
    // 如果是正則表達式，驗證語法
    if (form.isRegex) {
        try {
            new RegExp(form.keyword);
        } catch (e) {
            this.toastService.error(`${this.t('invalidRegex')}: ${(e as Error).message}`, 4000);
            return;
        }
    }
    
    const trimmedKeyword = form.keyword.trim();
    
    // 檢查關鍵詞是否已存在於該關鍵詞集中
    const keywordSet = this.keywordSets().find(s => s.id === form.setId);
    if (!keywordSet) {
        this.toastService.error('關鍵詞集不存在', 3000);
        return;
    }
    
    const exists = keywordSet.keywords.some(k => 
        k.keyword === trimmedKeyword && k.isRegex === form.isRegex
    );
    if (exists) {
        this.toastService.warning('該關鍵詞已存在於此關鍵詞集中', 3000);
        return;
    }
    
    // 樂觀更新：立即更新本地狀態（提供即時反饋）
    const tempId = Date.now(); // 臨時 ID，後端會返回真實 ID
    const newKeyword: KeywordConfig = {
        id: tempId,
        keyword: trimmedKeyword,
        isRegex: form.isRegex
    };
    
    // 立即更新 UI
    this.keywordSets.update(sets => 
        sets.map(set => 
            set.id === form.setId 
                ? { ...set, keywords: [...set.keywords, newKeyword] }
                : set
        )
    );
    
    // 清空輸入框和測試結果
    this.newKeyword.set({setId: form.setId, keyword: '', isRegex: false });
    this.testKeywordText.set('');
    this.keywordTestResult.set(null);
    
    // 發送添加請求到後端（後端會發送更新事件來同步真實 ID）
    this.ipcService.send('add-keyword', { setId: form.setId, keyword: trimmedKeyword, isRegex: form.isRegex });
    this.toastService.success(this.t('keywordAdded'), 2000);
  }
  
  onTestTextInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    // 如果測試文本為空，清除測試結果
    if (!value) {
        this.keywordTestResult.set(null);
    }
  }
  
  testKeyword() {
    const form = this.newKeyword();
    const testText = this.testKeywordText().trim();
    
    if (!form.keyword.trim()) {
        this.toastService.warning('請先輸入關鍵詞', 2000);
        this.keywordTestResult.set(null); // 清除之前的測試結果
        return;
    }
    
    if (!testText) {
        // 如果測試文本為空，清除測試結果但不顯示警告（因為這可能是用戶正在輸入）
        this.keywordTestResult.set(null);
        return;
    }
    
    try {
        let matches = false;
        
        if (form.isRegex) {
            // 測試正則表達式
            try {
                const regex = new RegExp(form.keyword, 'i'); // 不區分大小寫
                matches = regex.test(testText);
            } catch (e) {
                this.keywordTestResult.set({ matches: false, error: (e as Error).message });
                this.toastService.error(`${this.t('invalidRegex')}: ${(e as Error).message}`, 4000);
                return;
            }
        } else {
            // 測試普通關鍵詞（不區分大小寫）
            matches = testText.toLowerCase().includes(form.keyword.toLowerCase());
        }
        
        // 設置測試結果
        this.keywordTestResult.set({ matches });
        
        // 不顯示 toast，因為結果已經在 UI 中顯示了
    } catch (e) {
        this.keywordTestResult.set({ matches: false, error: (e as Error).message });
        this.toastService.error(`測試失敗: ${(e as Error).message}`, 3000);
    }
  }

  removeKeywordFromSet(setId: number, keywordId: number) {
      // 樂觀更新：立即從本地狀態中移除
      const keywordSet = this.keywordSets().find(s => s.id === setId);
      const keywordToRemove = keywordSet?.keywords.find(k => k.id === keywordId);
      
      if (keywordSet && keywordToRemove) {
          // 立即更新本地狀態
          this.keywordSets.update(sets => 
              sets.map(set => 
                  set.id === setId 
                      ? { ...set, keywords: set.keywords.filter(k => k.id !== keywordId) }
                      : set
              )
          );
          
          // 發送刪除請求到後端
          this.ipcService.send('remove-keyword', { setId, keywordId });
          this.toastService.success('關鍵詞已刪除', 2000);
      } else {
          this.toastService.warning('關鍵詞不存在', 2000);
      }
  }
  
  addGroup() {
    // 會員配額檢查
    const quotas = this.membershipService.quotas();
    if (quotas.maxGroups !== -1 && this.monitoredGroups().length >= quotas.maxGroups) {
      this.toastService.warning(`${this.membershipService.levelIcon()} ${this.membershipService.levelName()} 最多支持 ${quotas.maxGroups} 個群組`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newGroup();
    if (form.url.trim()) {
        // Check if group already exists
        const exists = this.monitoredGroups().some(g => g.url === form.url.trim());
        if (exists) {
            this.toastService.warning('該群組已存在，將更新關鍵詞集配置', 3000);
        }
        this.ipcService.send('add-group', { url: form.url.trim(), keywordSetIds: form.keywordSetIds });
        this.newGroup.set({ url: '', keywordSetIds: [] });
    }
  }
  
  // 讓監控號手動加入群組
  joinGroup(groupUrl: string) {
    console.log('[Frontend] joinGroup called with:', groupUrl);
    console.log('[Frontend] All accounts:', this.accounts());
    
    // 找到在線的監控賬號（Listener）或任意在線帳號
    const allAccounts = this.accounts();
    let listenerAccounts = allAccounts.filter(a => a.role === 'Listener' && a.status === 'Online');
    
    console.log('[Frontend] Listener accounts:', listenerAccounts);
    
    // 如果沒有 Listener 帳號，嘗試使用任意在線帳號
    if (listenerAccounts.length === 0) {
        const onlineAccounts = allAccounts.filter(a => a.status === 'Online');
        console.log('[Frontend] Online accounts (any role):', onlineAccounts);
        
        if (onlineAccounts.length === 0) {
            this.toastService.error('沒有在線的帳號，無法加入群組', 3000);
            return;
        }
        
        // 使用任意在線帳號
        listenerAccounts = onlineAccounts;
        this.toastService.warning('沒有監控帳號，使用其他在線帳號加入', 3000);
    }
    
    // 使用第一個在線帳號加入群組
    const phone = listenerAccounts[0].phone;
    console.log('[Frontend] Using phone to join:', phone);
    this.toastService.info(`正在嘗試讓 ${phone} 加入群組...`, 3000);
    this.ipcService.send('join-group', { phone, groupUrl });
  }

  toggleArrayItem(array: number[], item: number): number[] {
      const newArray = [...array];
      const index = newArray.indexOf(item);
      if (index > -1) { 
          newArray.splice(index, 1); 
      } else { 
          newArray.push(item); 
      }
      return newArray;
  }

  toggleKeywordSetForNewGroup(setId: number): void {
    this.newGroup.update(group => {
      if (!group) {
        return { url: '', keywordSetIds: [setId] };
      }
      return { ...group, keywordSetIds: this.toggleArrayItem(group.keywordSetIds || [], setId) };
    });
  }

   toggleTriggerGroup(campaignId: number, groupId: number) {
        this.campaigns.update(campaigns => campaigns.map(c => c.id === campaignId ? { ...c, trigger: { ...c.trigger, sourceGroupIds: this.toggleArrayItem(c.trigger.sourceGroupIds, groupId) } } : c));
    }

    toggleTriggerKeywordSet(campaignId: number, setId: number) {
        this.campaigns.update(campaigns => campaigns.map(c => c.id === campaignId ? { ...c, trigger: { ...c.trigger, keywordSetIds: this.toggleArrayItem(c.trigger.keywordSetIds, setId) } } : c));
    }
    
    toggleNewCampaignSourceGroup(groupId: number) {
        this.newCampaign.update(c => ({
            ...c,
            trigger: {
                ...c.trigger,
                sourceGroupIds: this.toggleArrayItem(c.trigger.sourceGroupIds, groupId)
            }
        }));
    }

    toggleNewCampaignKeywordSet(setId: number) {
        this.newCampaign.update(c => ({
            ...c,
            trigger: {
                ...c.trigger,
                keywordSetIds: this.toggleArrayItem(c.trigger.keywordSetIds, setId)
            }
        }));
    }

  removeById<T extends {id: number}>(list: WritableSignal<T[]>, id: number, typeName: string) {
    console.log(`[Frontend] Removing ${typeName} with id: ${id}`);
    
    // Optimistic update: remove from local list immediately
    const currentList = list();
    const itemToRemove = currentList.find(item => item.id === id);
    if (itemToRemove) {
      list.set(currentList.filter(item => item.id !== id));
      console.log(`[Frontend] Optimistically removed ${typeName} ${id} from local list`);
      this.toastService.success(`${typeName === 'keyword-set' ? '關鍵詞集' : typeName} 刪除成功`, 2000);
    } else {
      console.warn(`[Frontend] ${typeName} ${id} not found in local list`);
    }
    
    // Send command to backend
    this.ipcService.send(`remove-${typeName.replace(' ', '-')}`, { id });
  }

  openLeadDetailModal(lead: CapturedLead) {
    const template = this.messageTemplates().find(t => t.id === lead.assignedTemplateId);
    this.generationState.set({ 
      status: 'idle', lead, generatedMessage: '', error: null, 
      customPrompt: template?.prompt || '', attachment: null, attachments: []
    });
    this.leadDetailView.set('sendMessage');
    this.messageMode.set('manual');
    this.editableMessage.set('');
    
    // Auto-select first sender account if available
    const senders = this.senderAccounts();
    if (senders.length > 0 && !this.selectedSenderId()) {
      this.selectedSenderId.set(senders[0].id);
    }
  }

  closeLeadDetailModal() { 
    this.generationState.set({ status: 'idle', lead: null, generatedMessage: '', error: null, customPrompt: '', attachment: null, attachments: [] }); 
    this.editableMessage.set('');
    this.messageMode.set('manual');
  }
  
  // 啟動 AI 聊天
  startAiChat(lead: CapturedLead) {
    // 打開詳情面板並自動選擇 AI 模式
    this.openLeadDetailModal(lead);
    this.messageMode.set('ai');
    this.toastService.info(`🤖 已開啟 AI 聊天模式，為 @${lead.username || lead.userId} 生成智能回覆`);
  }
  
  // 邀請進群（整合多角色協作）
  inviteToGroup(lead: CapturedLead) {
    // 檢查是否有可用的協作群組
    const collabGroups = this.collabGroups();
    if (collabGroups.length === 0) {
      this.toastService.warning('⚠️ 請先在「多角色協作」中創建協作群組');
      this.currentView.set('multi-role');
      return;
    }
    
    // 顯示群組選擇對話框
    this.selectedLeadForInvite.set(lead);
    this.showInviteGroupDialog.set(true);
    this.toastService.info(`👥 選擇要邀請 @${lead.username || lead.userId} 的群組`);
  }
  
  // 執行邀請進群
  executeInviteToGroup(groupId: string) {
    const lead = this.selectedLeadForInvite();
    if (!lead) return;
    
    // 發送邀請命令到後端
    this.ipcService.send('invite-lead-to-collab-group', {
      leadId: lead.id,
      userId: lead.userId,
      username: lead.username,
      groupId: groupId
    });
    
    this.showInviteGroupDialog.set(false);
    this.selectedLeadForInvite.set(null);
    this.toastService.success(`✓ 已發送邀請請求`);
  }
  
  // 添加到黑名單
  addToDnc(lead: CapturedLead) {
    this.ipcService.send('add-to-dnc', { leadId: lead.id, userId: lead.userId });
    this.toastService.success(`🚫 已將 @${lead.username || lead.userId} 加入黑名單`);
  }

  async generateMessage() {
    // 會員 AI 配額檢查
    const aiCheck = this.membershipService.canUseAi();
    if (!aiCheck.allowed) {
      this.toastService.warning(aiCheck.message || '今日 AI 配額已用完');
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const state = this.generationState();
    if (!state.lead) return;
    this.generationState.update(s => ({ ...s, status: 'loading', error: null }));
    
    try {
      let prompt = state.customPrompt;
      if (this.spintaxEnabled()) { prompt = this.parseSpintax(prompt); }
      
      const apiType = this.aiApiType();
      let message = '';
      
      if (apiType === 'local' || apiType === 'custom') {
        // 使用本地 AI 或自定義 API
        message = await this.generateWithLocalAI(state.lead, prompt);
      } else if (apiType === 'openai') {
        // 使用 OpenAI API
        message = await this.generateWithOpenAI(state.lead, prompt);
      } else {
        // 使用 Gemini API (默認)
        message = await this.geminiService.generateOutreachMessage(state.lead, prompt);
      }
      
      // 記錄 AI 調用
      this.membershipService.recordAiCall(1);
      
      this.generationState.update(s => ({ ...s, status: 'success', generatedMessage: message }));
      this.editableMessage.set(message);
    } catch (error: any) { 
      this.generationState.update(s => ({ ...s, status: 'error', error: error.message })); 
    }
  }
  
  // 使用本地 AI 生成消息
  private async generateWithLocalAI(lead: any, customPrompt: string): Promise<string> {
    const endpoint = this.aiApiType() === 'local' ? this.localAiEndpoint() : this.customApiEndpoint();
    const model = this.localAiModel() || 'default';
    
    if (!endpoint) {
      throw new Error('本地 AI 端點未配置');
    }
    
    const systemPrompt = `你是一個友善的聊天助手。生成簡短自然的對話消息。
規則：
1. 消息必須簡短（15-40字以內）
2. 像朋友聊天一樣自然，不要太正式
3. 不要使用"您好"等過於正式的開頭
4. 可以用"嗨"、"哈囉"、"hi"等輕鬆問候
5. 直接切入話題，不要囉嗦
6. 語氣輕鬆友好，像是在微信聊天`;
    
    const userPrompt = customPrompt || `用戶 @${lead.username || '朋友'} 對「${lead.triggerKeyword || '這個話題'}」感興趣。
用一句話打個招呼，簡短自然就好。`;

    return new Promise((resolve, reject) => {
      // 設置超時
      const timeout = setTimeout(() => {
        reject(new Error('AI 生成超時，請檢查服務連接'));
      }, 60000); // 增加到 60 秒
      
      // 使用一次性監聽器
      this.ipcService.once('ai-response', (data: any) => {
        clearTimeout(timeout);
        console.log('[AI] Received ai-response:', data);
        if (data?.success && data?.response) {
          resolve(data.response);
        } else {
          reject(new Error(data?.error || 'AI 生成失敗'));
        }
      });
      
      // 發送請求
      console.log('[AI] Sending generate-ai-response with endpoint:', endpoint);
      this.ipcService.send('generate-ai-response', {
        userId: lead.id || lead.username,
        message: userPrompt,
        systemPrompt: systemPrompt,
        localAiEndpoint: endpoint,
        localAiModel: model
      });
    });
  }
  
  // 使用 OpenAI 生成消息
  private async generateWithOpenAI(lead: any, customPrompt: string): Promise<string> {
    const apiKey = this.aiApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API Key 未配置');
    }
    
    const systemPrompt = `你是友善的聊天助手。生成簡短自然的對話（15-40字），像朋友聊天，不要正式。`;
    
    const userPrompt = customPrompt || `用戶 @${lead.username || '朋友'} 對「${lead.triggerKeyword || '這個話題'}」感興趣，用一句話打招呼。`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API 錯誤: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '生成失敗';
  }

  updateCustomPrompt(value: string) {
    this.generationState.update(s => ({ ...s, customPrompt: value }));
  }

  applyTemplate(event: Event) {
    const select = event.target as HTMLSelectElement;
    const templateId = parseInt(select.value, 10);
    if (!templateId) return;
    
    const template = this.messageTemplates().find(t => t.id === templateId);
    if (template) {
      let message = template.prompt;
      if (this.spintaxEnabled()) {
        message = this.parseSpintax(message);
      }
      this.editableMessage.set(message);
    }
  }

  isAiConfigured(): boolean {
    const apiType = this.aiApiType();
    
    // 本地 AI：檢查端點是否配置
    if (apiType === 'local') {
      return !!this.localAiEndpoint();
    }
    
    // 自定義 API：檢查端點和密鑰
    if (apiType === 'custom') {
      return !!this.customApiEndpoint() && !!this.aiApiKey();
    }
    
    // Gemini/OpenAI：檢查 API 密鑰
    return this.geminiService.isConfigured() || !!this.aiApiKey();
  }

  canSendMessage(): boolean {
    const hasMessage = this.editableMessage().trim().length > 0;
    const state = this.generationState();
    const hasAttachment = state.attachment !== null || state.attachments.length > 0;
    const hasSender = this.selectedSenderId() !== null && this.senderAccounts().length > 0;
    // 有消息內容或有附件，且有發送帳號
    return (hasMessage || hasAttachment) && hasSender;
  }

  sendMessageToLead() {
    // 會員配額檢查
    const msgCheck = this.membershipService.canSendMessage();
    if (!msgCheck.allowed) {
      this.toastService.warning(msgCheck.message || '今日消息配額已用完');
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const state = this.generationState();
    const lead = state.lead;
    if (!lead) return;
    
    const message = this.editableMessage().trim();
    const hasAttachment = state.attachment !== null;
    
    // 必須有消息內容或附件
    if (!message && !hasAttachment) {
      this.toastService.error(this.t('messageRequired'), 3000);
      return;
    }

    const senderId = this.selectedSenderId();
    if (!senderId) {
      this.toastService.error(this.t('selectSenderFirst'), 3000);
      return;
    }

    // Find the sender account to get the phone number
    const senderAccount = this.accounts().find(a => a.id === senderId);
    if (!senderAccount) {
      this.toastService.error(this.t('senderAccountNotFound'), 3000);
      return;
    }
    
    // Send with correct parameters
    // 如果有多個附件，發送多條消息（Telegram 每條消息只能有一個附件）
    const attachments = state.attachments.length > 0 ? state.attachments : (state.attachment ? [state.attachment] : []);
    
    if (attachments.length === 0) {
        // 無附件，只發送文字
        this.ipcService.send('send-message', {
            leadId: lead.id,
            accountPhone: senderAccount.phone,
            userId: lead.userId,
            username: lead.username,
            sourceGroup: lead.sourceGroup,
            message: message,
            attachment: null
        });
    } else if (attachments.length === 1) {
        // 單個附件
        this.ipcService.send('send-message', {
            leadId: lead.id,
            accountPhone: senderAccount.phone,
            userId: lead.userId,
            username: lead.username,
            sourceGroup: lead.sourceGroup,
            message: message,
            attachment: attachments[0]
        });
    } else {
        // 多個附件：第一個帶文字，後面的不帶文字
        attachments.forEach((attachment, index) => {
            this.ipcService.send('send-message', {
                leadId: lead.id,
                accountPhone: senderAccount.phone,
                userId: lead.userId,
                username: lead.username,
                sourceGroup: lead.sourceGroup,
                message: index === 0 ? message : '', // 只有第一個帶文字
                attachment: attachment
            });
        });
    }
    
    // 記錄消息發送
    this.membershipService.recordMessageSent(1);
    
    this.toastService.success(this.t('messageQueued'), 2000);
    this.closeLeadDetailModal();
  }

  // Keep old method for backward compatibility
  sendMessage() {
    this.sendMessageToLead();
  }
  
  // 舊方法：使用 HTML input 選擇文件（用於小文件，會轉成 base64）
  onFileAttached(event: Event, type: 'image' | 'file') {
      const input = event.target as HTMLInputElement;
      if (!input.files?.length) return;
      const file = input.files[0];
      
      // 如果文件大於 10MB，提示使用新方法
      if (file.size > 10 * 1024 * 1024) {
          this.toastService.warning('大文件建議使用「選擇文件」按鈕上傳', 3000);
      }
      
      const reader = new FileReader();
      reader.onload = () => {
          const attachment: Attachment = { 
              name: file.name, 
              type: type, 
              dataUrl: reader.result as string,
              fileSize: file.size
          };
          this.generationState.update(s => ({ ...s, attachment }));
      };
      reader.readAsDataURL(file);
      input.value = '';
  }
  
  // 新方法：使用 Electron 原生對話框選擇文件（支持大文件，直接傳路徑）
  // 支持多文件選擇
  async selectAttachment(type: 'image' | 'file', multiple: boolean = false) {
      const result = await this.ipcService.selectFileForAttachment(type, multiple);
      
      if (!result.success) {
          if (!result.canceled) {
              this.toastService.error('選擇文件失敗', 2000);
          }
          return;
      }
      
      if (multiple && result.files) {
          // 多文件模式：添加到 attachments 數組
          const newAttachments: Attachment[] = result.files.map(f => ({
              name: f.fileName,
              type: f.fileType as 'image' | 'file',
              filePath: f.filePath,
              fileSize: f.fileSize
          }));
          
          this.generationState.update(s => ({
              ...s,
              attachments: [...s.attachments, ...newAttachments],
              attachment: newAttachments[0] // 保持向後兼容
          }));
          
          const totalSize = newAttachments.reduce((sum, a) => sum + (a.fileSize || 0), 0);
          const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
          this.toastService.success(`已選擇 ${newAttachments.length} 個文件 (共 ${sizeMB} MB)`, 2000);
      } else {
          // 單文件模式
          const attachment: Attachment = {
              name: result.fileName!,
              type: result.fileType as 'image' | 'file',
              filePath: result.filePath,
              fileSize: result.fileSize
          };
          
          this.generationState.update(s => ({
              ...s,
              attachment,
              attachments: [attachment] // 同時更新 attachments
          }));
          
          const sizeMB = (result.fileSize! / (1024 * 1024)).toFixed(2);
          this.toastService.success(`已選擇: ${result.fileName} (${sizeMB} MB)`, 2000);
      }
  }
  
  // 添加更多附件（多文件模式）
  async addMoreAttachments(type: 'image' | 'file') {
      const result = await this.ipcService.selectFileForAttachment(type, true);
      
      if (!result.success || !result.files) {
          if (!result.canceled) {
              this.toastService.error('選擇文件失敗', 2000);
          }
          return;
      }
      
      const newAttachments: Attachment[] = result.files.map(f => ({
          name: f.fileName,
          type: f.fileType as 'image' | 'file',
          filePath: f.filePath,
          fileSize: f.fileSize
      }));
      
      this.generationState.update(s => ({
          ...s,
          attachments: [...s.attachments, ...newAttachments],
          attachment: s.attachment || newAttachments[0]
      }));
      
      this.toastService.success(`已添加 ${newAttachments.length} 個文件`, 2000);
  }
  
  // 移除單個附件
  removeAttachmentByIndex(index: number) {
      this.generationState.update(s => {
          const newAttachments = s.attachments.filter((_, i) => i !== index);
          return {
              ...s,
              attachments: newAttachments,
              attachment: newAttachments.length > 0 ? newAttachments[0] : null
          };
      });
  }
  
  // 清空所有附件
  clearAllAttachments() {
      this.generationState.update(s => ({
          ...s,
          attachments: [],
          attachment: null
      }));
  }
  
  // 獲取附件總大小（MB）
  getTotalAttachmentSize(): string {
      const attachments = this.generationState().attachments;
      const totalBytes = attachments.reduce((sum, a) => sum + (a.fileSize || 0), 0);
      return (totalBytes / 1024 / 1024).toFixed(2);
  }
  
  removeAttachment() {
      this.clearAllAttachments();
  }
  
  private parseSpintax(text: string): string {
    const spintaxRegex = /\{([^{}]+)\}/g;
    while (spintaxRegex.test(text)) {
      text = text.replace(spintaxRegex, (match, choices) => {
        const options = choices.split('|');
        return options[Math.floor(Math.random() * options.length)];
      });
    }
    return text;
  }
  
  addInteractionHistory(leadId: number, type: Interaction['type'], content: string, leadInstance?: CapturedLead) {
      const interaction: Interaction = { id: Date.now(), timestamp: new Date(), type, content };
      if (leadInstance && leadInstance.id === leadId) { leadInstance.interactionHistory.unshift(interaction); return; }
      this.leads.update(leads => leads.map(l => l.id === leadId ? { ...l, interactionHistory: [interaction, ...l.interactionHistory] } : l ));
  }

  updateLeadStatus(leadId: number, newStatus: LeadStatus, addHistory = true) {
      this.ipcService.send('update-lead-status', { leadId, newStatus });
  }

  toggleLeadMenu(leadId: number) {
      if (this.openLeadMenuId() === leadId) {
          this.openLeadMenuId.set(null);
      } else {
          this.openLeadMenuId.set(leadId);
      }
  }

  closeLeadMenu() {
      this.openLeadMenuId.set(null);
  }
  
  addToDoNotContact(leadId: number) {
      const lead = this.leads().find(l => l.id === leadId);
      if(lead) {
          this.ipcService.send('add-to-dnc', { userId: lead.userId });
          this.closeLeadDetailModal();
      }
  }

  // ==================== Batch Operations (批量操作) ====================
  
  toggleLeadSelection(leadId: number) {
    this.selectedLeadIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(leadId)) {
        newIds.delete(leadId);
      } else {
        newIds.add(leadId);
      }
      return newIds;
    });
    // Update select all state
    this.isSelectAllLeads.set(this.selectedLeadIds().size === this.leads().length);
  }
  
  toggleSelectAllLeads() {
    if (this.isSelectAllLeads()) {
      // 取消全選
      this.selectedLeadIds.set(new Set());
      this.isSelectAllLeads.set(false);
    } else {
      // 全選當前已加載的數據
      const currentLeads = this.leads();
      const allIds = new Set(currentLeads.map(l => l.id));
      this.selectedLeadIds.set(allIds);
      this.isSelectAllLeads.set(true);
      
      if (allIds.size > 0) {
        this.toastService.success(`已選擇 ${allIds.size} 個客戶`);
      }
    }
  }
  
  clearLeadSelection() {
    this.selectedLeadIds.set(new Set());
    this.isSelectAllLeads.set(false);
    this.showBatchOperationMenu.set(false);
  }
  
  isLeadSelected(leadId: number): boolean {
    return this.selectedLeadIds().has(leadId);
  }
  
  // 全選當前篩選的 leads
  selectAllFilteredLeads() {
    const currentLeads = this.filteredLeads();
    const allIds = new Set(currentLeads.map(l => l.id));
    this.selectedLeadIds.set(allIds);
    
    if (allIds.size > 0) {
      this.toastService.success(`已選擇 ${allIds.size} 個客戶`);
    }
  }
  
  // 刪除確認狀態
  deleteConfirmDialog = signal<{
    show: boolean;
    type: 'single' | 'batch';
    lead?: CapturedLead;
    count?: number;
  }>({ show: false, type: 'single' });
  
  // 確認刪除單個 lead
  confirmDeleteLead(lead: CapturedLead) {
    this.deleteConfirmDialog.set({
      show: true,
      type: 'single',
      lead
    });
  }
  
  // 確認批量刪除
  confirmBatchDeleteLeads() {
    const count = this.selectedLeadsCount();
    if (count === 0) {
      this.toastService.warning('請先選擇要刪除的客戶');
      return;
    }
    this.deleteConfirmDialog.set({
      show: true,
      type: 'batch',
      count
    });
  }
  
  // 執行刪除
  executeDeleteLeads() {
    const dialog = this.deleteConfirmDialog();
    
    // 先關閉對話框
    this.deleteConfirmDialog.set({ show: false, type: 'single' });
    
    if (dialog.type === 'single' && dialog.lead) {
      // 單個刪除
      this.ipcService.send('delete-lead', { leadId: dialog.lead.id });
      this.leads.update(leads => leads.filter(l => l.id !== dialog.lead!.id));
      this.toastService.success(`已刪除客戶 @${dialog.lead.username || dialog.lead.userId}`);
    } else if (dialog.type === 'batch') {
      // 批量刪除
      const leadIds = Array.from(this.selectedLeadIds());
      
      if (leadIds.length === 0) {
        this.toastService.warning('沒有選中的客戶');
        return;
      }
      
      // 設置進度狀態
      this.batchOperationInProgress.set(true);
      this.showBatchOperationMenu.set(false);
      
      // 發送刪除請求
      this.ipcService.send('batch-delete-leads', { leadIds });
      
      // 立即更新本地狀態
      this.leads.update(leads => leads.filter(l => !this.selectedLeadIds().has(l.id)));
      this.toastService.success(`正在刪除 ${leadIds.length} 個客戶...`);
      this.clearLeadSelection();
    }
  }
  
  // 取消刪除
  cancelDeleteLeads() {
    this.deleteConfirmDialog.set({ show: false, type: 'single' });
  }
  
  // 導出選中的 leads
  exportSelectedLeads() {
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇要導出的客戶');
      return;
    }
    const selectedLeads = this.leads().filter(l => leadIds.includes(l.id));
    // 生成 CSV
    const headers = ['ID', '用戶名', '姓名', '狀態', '來源', '關鍵詞', '時間'];
    const rows = selectedLeads.map(l => [
      l.userId,
      l.username || '',
      `${l.firstName || ''} ${l.lastName || ''}`.trim(),
      l.status,
      l.sourceGroup,
      l.triggeredKeyword,
      new Date(l.timestamp).toLocaleString()
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.success(`已導出 ${selectedLeads.length} 個客戶`);
  }
  
  // Batch update status
  batchUpdateLeadStatus(newStatus: LeadStatus) {
    // 检查批量操作权限
    if (!this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning(`🥇 批量操作功能需要 黃金大師 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-update-lead-status', {
      leadIds,
      newStatus
    });
  }
  
  // Batch add tag
  batchAddTag(tag: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    if (!tag || !tag.trim()) {
      this.toastService.warning('請輸入標籤名稱');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchTagSelector.set(false);
    
    this.ipcService.send('batch-add-tag', {
      leadIds,
      tag: tag.trim()
    });
  }
  
  // Batch remove tag
  batchRemoveTag(tag: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    
    this.ipcService.send('batch-remove-tag', {
      leadIds,
      tag
    });
  }
  
  // Batch add to DNC
  batchAddToDnc() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    if (!confirm(`確定要將 ${leadIds.length} 個 Lead 添加到 DNC 列表嗎？`)) {
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-add-to-dnc', { leadIds });
  }
  
  // Batch remove from DNC
  batchRemoveFromDnc() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-remove-from-dnc', { leadIds });
  }
  
  // Batch update funnel stage
  batchUpdateFunnelStage(newStage: string) {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    this.batchOperationInProgress.set(true);
    this.showBatchOperationMenu.set(false);
    
    this.ipcService.send('batch-update-funnel-stage', {
      leadIds,
      newStage
    });
  }
  
  // Batch delete leads - 使用統一的確認對話框
  batchDeleteLeads() {
    if (!this.checkBatchOperationPermission()) return;
    
    const leadIds = Array.from(this.selectedLeadIds());
    if (leadIds.length === 0) {
      this.toastService.warning('請先選擇 Lead');
      return;
    }
    
    // 使用統一的確認對話框
    this.confirmBatchDeleteLeads();
  }
  
  // Undo batch operation
  undoBatchOperation(operationId: string) {
    if (!confirm('確定要撤銷此操作嗎？')) {
      return;
    }
    
    this.ipcService.send('undo-batch-operation', { operationId });
  }
  
  // Load batch operation history
  loadBatchOperationHistory() {
    this.ipcService.send('get-batch-operation-history', {
      limit: 50,
      offset: 0
    });
    this.showBatchOperationHistory.set(true);
  }
  
  // 打開批量操作菜單（帶權限檢查）
  openBatchOperationMenu() {
    // 檢查批量操作權限
    if (!this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning(`🥇 批量操作功能需要 黃金大師 或以上會員，點擊升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      this.showLeadsActionMenu.set(false);
      return;
    }
    
    // 有權限則打開批量操作工具欄
    this.showBatchOperationMenu.set(!this.showBatchOperationMenu());
    this.loadAllTags();
    this.showLeadsActionMenu.set(false);
  }
  
  // Load all tags
  loadAllTags() {
    this.ipcService.send('get-all-tags', {});
  }
  
  // Create new tag
  createTag() {
    const name = this.newTagName().trim();
    if (!name) {
      this.toastService.warning('請輸入標籤名稱');
      return;
    }
    
    this.ipcService.send('create-tag', {
      name,
      color: this.newTagColor()
    });
    
    this.newTagName.set('');
    this.showAddTagDialog.set(false);
  }
  
  // Delete tag
  deleteTag(tagName: string) {
    if (!confirm(`確定要刪除標籤 "${tagName}" 嗎？此標籤將從所有 Lead 中移除。`)) {
      return;
    }
    
    this.ipcService.send('delete-tag', { name: tagName });
  }
  
  // Full-text search for leads
  onLeadSearchInput() {
    // Debounce search
    if (this.leadSearchTimeout) {
      clearTimeout(this.leadSearchTimeout);
    }
    
    const query = this.leadSearchQuery().trim();
    if (!query || query.length < 2) {
      this.leadSearchResults.set([]);
      return;
    }
    
    this.leadSearchTimeout = setTimeout(() => {
      this.searchLeads();
    }, 500);
  }
  
  searchLeads() {
    const query = this.leadSearchQuery().trim();
    if (!query || query.length < 2) {
      this.leadSearchResults.set([]);
      return;
    }
    
    this.isSearchingLeads.set(true);
    this.ipcService.send('search-leads', {
      query,
      limit: 100
    });
  }
  
  clearLeadSearch() {
    this.leadSearchQuery.set('');
    this.leadSearchResults.set([]);
    if (this.leadSearchTimeout) {
      clearTimeout(this.leadSearchTimeout);
      this.leadSearchTimeout = null;
    }
  }
  
  // Backup management functions
  createBackup() {
    this.isCreatingBackup.set(true);
    this.ipcService.send('create-backup', {
      name: `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`,
      description: 'Manual backup'
    });
  }
  
  loadBackups() {
    this.ipcService.send('list-backups', {});
  }
  
  restoreBackup(backupId: string) {
    if (!confirm('确定要恢复此备份吗？当前数据将被覆盖！')) {
      return;
    }
    
    this.isRestoringBackup.set(true);
    this.ipcService.send('restore-backup', {
      backupId
    });
  }
  
  deleteBackup(backupId: string) {
    if (!confirm('确定要删除此备份吗？此操作无法撤销！')) {
      return;
    }
    
    this.ipcService.send('delete-backup', {
      backupId
    });
  }
  
  // Handle batch operation result
  private handleBatchOperationResult(data: any) {
    this.batchOperationInProgress.set(false);
    
    if (data.success) {
      const successCount = data.successCount || 0;
      const failureCount = data.failureCount || 0;
      
      if (failureCount > 0) {
        this.toastService.warning(`批量操作完成: ${successCount} 成功, ${failureCount} 失敗`);
      } else {
        this.toastService.success(`批量操作完成: ${successCount} 項已處理`);
      }
      
      // Clear selection after successful operation
      this.clearLeadSelection();
      
      // Refresh leads data
      this.ipcService.send('get-initial-state', {});
    } else {
      this.toastService.error(`批量操作失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle batch operation progress
  private handleBatchOperationProgress(data: any) {
    // Update progress dialog
    this.progressDialog.set({
      show: true,
      title: '批量操作進行中...',
      progress: {
        current: data.current,
        total: data.total,
        message: data.message
      },
      cancellable: false
    });
    
    // Hide progress dialog when complete
    if (data.current >= data.total) {
      setTimeout(() => {
        this.progressDialog.update(p => ({ ...p, show: false }));
      }, 500);
    }
  }
  
  // Handle batch undo result
  private handleBatchUndoResult(data: any) {
    if (data.success) {
      this.toastService.success('操作已撤銷');
      // Refresh leads and history
      this.ipcService.send('get-initial-state', {});
      this.loadBatchOperationHistory();
    } else {
      this.toastService.error(`撤銷失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle batch operation history
  private handleBatchOperationHistory(data: any) {
    if (data.success) {
      this.batchOperationHistory.set(data.operations || []);
    }
  }
  
  // Handle all tags response
  private handleAllTags(data: any) {
    if (data.success) {
      this.allTags.set(data.tags || []);
    }
  }
  
  // Handle tag created
  private handleTagCreated(data: any) {
    if (data.success) {
      this.toastService.success('標籤創建成功');
      this.loadAllTags();
    } else {
      this.toastService.error(`創建標籤失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Handle tag deleted
  private handleTagDeleted(data: any) {
    if (data.success) {
      this.toastService.success('標籤已刪除');
      this.loadAllTags();
    } else {
      this.toastService.error(`刪除標籤失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  // Get operation type display name
  getOperationTypeName(type: string): string {
    const names: Record<string, string> = {
      'update_status': '更新狀態',
      'add_tag': '添加標籤',
      'remove_tag': '移除標籤',
      'add_to_dnc': '添加到 DNC',
      'remove_from_dnc': '從 DNC 移除',
      'update_funnel_stage': '更新漏斗階段',
      'delete': '刪除'
    };
    return names[type] || type;
  }
  
  // Format date for display
  formatBatchOperationDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // ==================== Ad System Methods (廣告發送系統) ====================
  
  loadAdTemplates() {
    this.ipcService.send('get-ad-templates', { activeOnly: false });
  }
  
  loadAdSchedules() {
    this.ipcService.send('get-ad-schedules', { activeOnly: false });
  }
  
  loadAdSendLogs() {
    this.ipcService.send('get-ad-send-logs', { limit: 100 });
  }
  
  loadAdOverviewStats() {
    this.ipcService.send('get-ad-overview-stats', { days: 7 });
  }
  
  loadAdSystemData() {
    this.loadAdTemplates();
    this.loadAdSchedules();
    this.loadAdOverviewStats();
  }
  
  createAdTemplate() {
    // 检查广告发送权限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning(`🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newAdTemplate();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入模板名稱');
      return;
    }
    if (!form.content.trim()) {
      this.toastService.warning('請輸入模板內容');
      return;
    }
    
    this.ipcService.send('create-ad-template', {
      name: form.name,
      content: form.content,
      mediaType: form.mediaType
    });
    
    this.newAdTemplate.set({ name: '', content: '', mediaType: 'text' });
    this.showAdTemplateForm.set(false);
  }
  
  deleteAdTemplate(templateId: number) {
    if (!confirm('確定要刪除此廣告模板嗎？')) return;
    this.ipcService.send('delete-ad-template', { templateId });
  }
  
  toggleAdTemplateStatus(templateId: number) {
    this.ipcService.send('toggle-ad-template-status', { templateId });
  }
  
  previewSpintax(content: string) {
    if (!content.trim()) {
      this.spintaxPreview.set([]);
      return;
    }
    this.isPreviewingSpintax.set(true);
    this.ipcService.send('validate-spintax', { content });
  }
  
  createAdSchedule() {
    // 检查广告发送权限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning(`🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.newAdSchedule();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入計劃名稱');
      return;
    }
    if (!form.templateId) {
      this.toastService.warning('請選擇廣告模板');
      return;
    }
    if (form.targetGroups.length === 0) {
      this.toastService.warning('請選擇目標群組');
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇發送帳號');
      return;
    }
    
    this.ipcService.send('create-ad-schedule', form);
    
    this.newAdSchedule.set({
      name: '',
      templateId: 0,
      targetGroups: [],
      sendMode: 'scheduled',
      scheduleType: 'once',
      scheduleTime: '',
      intervalMinutes: 60,
      triggerKeywords: [],
      accountStrategy: 'rotate',
      assignedAccounts: []
    });
    this.showAdScheduleForm.set(false);
  }
  
  deleteAdSchedule(scheduleId: number) {
    if (!confirm('確定要刪除此廣告計劃嗎？')) return;
    this.ipcService.send('delete-ad-schedule', { scheduleId });
  }
  
  toggleAdScheduleStatus(scheduleId: number) {
    this.ipcService.send('toggle-ad-schedule-status', { scheduleId });
  }
  
  runAdScheduleNow(scheduleId: number) {
    if (!confirm('確定要立即執行此計劃嗎？')) return;
    this.ipcService.send('run-ad-schedule-now', { scheduleId });
    this.toastService.info('正在執行...');
  }
  
  getSendModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'scheduled': '定時發送',
      'triggered': '關鍵詞觸發',
      'relay': '接力發送',
      'interval': '間隔循環'
    };
    return labels[mode] || mode;
  }
  
  getScheduleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'once': '一次性',
      'daily': '每日',
      'interval': '間隔',
      'cron': 'Cron'
    };
    return labels[type] || type;
  }
  
  getAccountStrategyLabel(strategy: string): string {
    const labels: Record<string, string> = {
      'single': '單一帳號',
      'rotate': '輪換帳號',
      'relay': '接力發送',
      'random': '隨機選擇'
    };
    return labels[strategy] || strategy;
  }
  
  getAdStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'sent': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400',
      'deleted': 'bg-yellow-500/20 text-yellow-400',
      'banned': 'bg-red-600/20 text-red-500'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  toggleAccountForSchedule(phone: string) {
    this.newAdSchedule.update(s => {
      const accounts = [...s.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return { ...s, assignedAccounts: accounts };
    });
  }
  
  updateScheduleTargetGroups(value: string) {
    const groups = value.split('\n')
      .map(g => g.trim())
      .filter(g => g.length > 0);
    this.newAdSchedule.update(s => ({ ...s, targetGroups: groups }));
  }
  
  // Handle ad system events
  private handleAdTemplates(data: any) {
    if (data.success) {
      this.adTemplates.set(data.templates || []);
    }
  }
  
  private handleAdSchedules(data: any) {
    if (data.success) {
      this.adSchedules.set(data.schedules || []);
    }
  }
  
  private handleAdSendLogs(data: any) {
    if (data.success) {
      this.adSendLogs.set(data.logs || []);
    }
  }
  
  private handleAdOverviewStats(data: any) {
    if (data.success) {
      this.adOverviewStats.set(data.overview || null);
    }
  }
  
  private handleAdTemplateCreated(data: any) {
    if (data.success) {
      this.toastService.success('廣告模板已創建');
      this.loadAdTemplates();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleAdTemplateDeleted(data: any) {
    if (data.success) {
      this.toastService.success('廣告模板已刪除');
      this.loadAdTemplates();
    }
  }
  
  private handleAdScheduleCreated(data: any) {
    if (data.success) {
      this.toastService.success('廣告計劃已創建');
      this.loadAdSchedules();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleAdScheduleDeleted(data: any) {
    if (data.success) {
      this.toastService.success('廣告計劃已刪除');
      this.loadAdSchedules();
    }
  }
  
  private handleSpintaxValidated(data: any) {
    this.isPreviewingSpintax.set(false);
    if (data.success || data.valid) {
      this.spintaxPreview.set(data.variants || []);
    } else {
      this.toastService.error(`Spintax 語法錯誤: ${data.error}`);
      this.spintaxPreview.set([]);
    }
  }
  
  private handleAdScheduleRunResult(data: any) {
    if (data.success) {
      this.toastService.success(`計劃執行完成: ${data.sent || 0} 成功, ${data.failed || 0} 失敗`);
      this.loadAdSendLogs();
      this.loadAdOverviewStats();
    } else {
      this.toastService.error(`執行失敗: ${data.error}`);
    }
  }

  // ==================== User Tracking Methods (用戶追蹤系統) ====================
  
  loadTrackedUsers() {
    this.ipcService.send('get-tracked-users', { 
      limit: 100,
      valueLevel: this.userValueFilter() || undefined
    });
  }
  
  loadTrackingStats() {
    this.ipcService.send('get-tracking-stats', {});
  }
  
  loadHighValueGroups() {
    this.ipcService.send('get-high-value-groups', { limit: 50 });
  }
  
  loadUserTrackingData() {
    this.loadTrackedUsers();
    this.loadTrackingStats();
    this.loadHighValueGroups();
  }
  
  addUserToTrack() {
    const form = this.newTrackedUser();
    if (!form.userId.trim()) {
      this.toastService.warning('請輸入用戶 ID');
      return;
    }
    
    this.ipcService.send('add-user-to-track', {
      userId: form.userId.trim(),
      username: form.username.trim() || undefined,
      notes: form.notes.trim() || undefined,
      source: 'manual'
    });
    
    this.newTrackedUser.set({ userId: '', username: '', notes: '' });
    this.showAddUserForm.set(false);
  }
  
  addLeadToTracking(leadId: number) {
    this.ipcService.send('add-user-from-lead', { leadId });
  }
  
  removeTrackedUser(userId: string) {
    if (!confirm('確定要移除此用戶追蹤嗎？')) return;
    this.ipcService.send('remove-tracked-user', { userId });
  }
  
  trackUserGroups(userId: string) {
    const onlineAccounts = this.accounts().filter(a => a.status === 'Online');
    if (onlineAccounts.length === 0) {
      this.toastService.warning('沒有在線帳號可用於追蹤');
      return;
    }
    
    this.isTrackingUser.set(true);
    this.ipcService.send('track-user-groups', {
      userId,
      accountPhone: onlineAccounts[0].phone
    });
  }
  
  viewUserGroups(user: any) {
    this.selectedTrackedUser.set(user);
    this.ipcService.send('get-user-groups', { userId: user.userId });
  }
  
  updateUserValueLevel(userId: string, valueLevel: string) {
    this.ipcService.send('update-user-value-level', { userId, valueLevel });
  }
  
  getValueLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      'vip': 'VIP',
      'high': '高價值',
      'medium': '中等',
      'low': '低'
    };
    return labels[level] || level;
  }
  
  getValueLevelColor(level: string): string {
    const colors: Record<string, string> = {
      'vip': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'high': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'medium': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'low': 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[level] || 'bg-slate-500/20 text-slate-400';
  }
  
  getTrackingStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待追蹤',
      'tracking': '追蹤中',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getTrackingStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400',
      'tracking': 'bg-blue-500/20 text-blue-400',
      'completed': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // Handle user tracking events
  private handleTrackedUsers(data: any) {
    if (data.success) {
      this.trackedUsers.set(data.users || []);
    }
  }
  
  private handleUserGroups(data: any) {
    if (data.success) {
      this.userGroups.set(data.groups || []);
    }
  }
  
  private handleHighValueGroups(data: any) {
    if (data.success) {
      this.highValueGroups.set(data.groups || []);
    }
  }
  
  private handleTrackingStats(data: any) {
    if (data.success) {
      this.trackingStats.set(data.stats || null);
    }
  }
  
  private handleUserAddedToTrack(data: any) {
    if (data.success) {
      this.toastService.success('用戶已添加到追蹤列表');
      this.loadTrackedUsers();
    } else {
      this.toastService.error(`添加失敗: ${data.error}`);
    }
  }
  
  private handleUserRemoved(data: any) {
    if (data.success) {
      this.toastService.success('用戶已移除');
      this.loadTrackedUsers();
    }
  }
  
  private handleUserTrackingCompleted(data: any) {
    this.isTrackingUser.set(false);
    if (data.success) {
      this.toastService.success(`追蹤完成: 發現 ${data.groupsFound} 個群組, ${data.highValueGroups} 個高價值`);
      this.loadTrackedUsers();
      this.loadTrackingStats();
      this.loadHighValueGroups();
    }
  }
  
  private handleUserTrackingFailed(data: any) {
    this.isTrackingUser.set(false);
    this.toastService.error(`追蹤失敗: ${data.error}`);
    this.loadTrackedUsers();
  }

  // ==================== Campaign Methods (營銷活動協調器) ====================
  
  loadCampaigns() {
    this.ipcService.send('get-campaigns', { limit: 50 });
  }
  
  loadUnifiedOverview() {
    this.ipcService.send('get-unified-overview', { days: 7 });
  }
  
  loadFunnelAnalysis() {
    this.ipcService.send('get-funnel-analysis', {});
  }
  
  loadCampaignData() {
    this.loadCampaigns();
    this.loadUnifiedOverview();
    this.loadFunnelAnalysis();
  }
  
  createCampaignFromForm() {
    // 检查营销活动权限
    if (!this.membershipService.hasFeature('aiSalesFunnel')) {
      this.toastService.warning(`💎 營銷活動功能需要 鑽石王牌 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.campaignFormData();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入活動名稱');
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇帳號');
      return;
    }
    
    this.ipcService.send('create-campaign', {
      name: form.name,
      description: form.description,
      phases: form.phases,
      keywords: form.keywords,
      targetGroups: form.targetGroups,
      assignedAccounts: form.assignedAccounts
    });
    
    this.campaignFormData.set({
      name: '',
      description: '',
      phases: ['discovery', 'monitoring', 'outreach'],
      keywords: [],
      targetGroups: [],
      assignedAccounts: []
    });
    this.showCampaignForm.set(false);
  }
  
  startCampaign(campaignId: string) {
    if (!confirm('確定要啟動此活動嗎？')) return;
    this.ipcService.send('start-campaign', { campaignId });
  }
  
  pauseCampaign(campaignId: string) {
    this.ipcService.send('pause-campaign', { campaignId });
  }
  
  resumeCampaign(campaignId: string) {
    this.ipcService.send('resume-campaign', { campaignId });
  }
  
  stopCampaign(campaignId: string) {
    if (!confirm('確定要停止此活動嗎？')) return;
    this.ipcService.send('stop-campaign', { campaignId });
  }
  
  deleteCampaign(campaignId: string) {
    if (!confirm('確定要刪除此活動嗎？')) return;
    this.ipcService.send('delete-campaign', { campaignId });
  }
  
  viewCampaignDetails(campaign: any) {
    this.selectedCampaign.set(campaign);
    this.ipcService.send('get-campaign-logs', { campaignId: campaign.id });
  }
  
  getCampaignStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': '草稿',
      'scheduled': '已排程',
      'running': '運行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getCampaignStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'draft': 'bg-slate-500/20 text-slate-400',
      'scheduled': 'bg-blue-500/20 text-blue-400',
      'running': 'bg-green-500/20 text-green-400',
      'paused': 'bg-yellow-500/20 text-yellow-400',
      'completed': 'bg-cyan-500/20 text-cyan-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      'discovery': '資源發現',
      'monitoring': '監控獲客',
      'outreach': '廣告觸達',
      'tracking': '用戶追蹤',
      'conversion': '轉化成交'
    };
    return labels[phase] || phase;
  }
  
  toggleCampaignPhase(phase: string) {
    this.campaignFormData.update(c => {
      const phases = [...c.phases];
      const idx = phases.indexOf(phase);
      if (idx >= 0) {
        phases.splice(idx, 1);
      } else {
        phases.push(phase);
      }
      return { ...c, phases };
    });
  }
  
  addCampaignKeyword() {
    const keyword = this.campaignKeywordInput().trim();
    if (!keyword) return;
    
    this.campaignFormData.update(c => ({
      ...c,
      keywords: [...c.keywords, keyword]
    }));
    this.campaignKeywordInput.set('');
  }
  
  removeCampaignKeyword(keyword: string) {
    this.campaignFormData.update(c => ({
      ...c,
      keywords: c.keywords.filter(k => k !== keyword)
    }));
  }
  
  toggleCampaignAccount(phone: string) {
    this.campaignFormData.update(c => {
      const accounts = [...c.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return { ...c, assignedAccounts: accounts };
    });
  }
  
  // Handle campaign events
  private handleCampaigns(data: any) {
    if (data.success) {
      this.campaigns.set(data.campaigns || []);
    }
  }
  
  private handleCampaignCreated(data: any) {
    if (data.success) {
      this.toastService.success('營銷活動已創建');
      this.loadCampaigns();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleCampaignDeleted(data: any) {
    if (data.success) {
      this.toastService.success('營銷活動已刪除');
      this.loadCampaigns();
    }
  }
  
  private handleUnifiedOverview(data: any) {
    if (data.success) {
      this.unifiedOverview.set(data);
    }
  }
  
  private handleFunnelAnalysis(data: any) {
    if (data.success) {
      this.funnelAnalysis.set(data);
    }
  }

  // ==================== Multi-Role Methods (多角色協作) ====================
  
  loadRoleTemplates() {
    this.ipcService.send('get-role-templates', {});
  }
  
  loadAllRoles() {
    this.ipcService.send('get-all-roles', { activeOnly: true });
  }
  
  loadScriptTemplates() {
    this.ipcService.send('get-script-templates', { activeOnly: true });
  }
  
  loadCollabGroups() {
    this.ipcService.send('get-collab-groups', { limit: 50 });
  }
  
  loadCollabStats() {
    this.ipcService.send('get-collab-stats', {});
  }
  
  loadRoleStats() {
    this.ipcService.send('get-role-stats', {});
  }
  
  loadMultiRoleData() {
    this.loadRoleTemplates();
    this.loadAllRoles();
    this.loadScriptTemplates();
    this.loadCollabGroups();
    this.loadCollabStats();
    this.loadRoleStats();
  }
  
  assignRole() {
    const form = this.newRoleAssign();
    if (!form.accountPhone) {
      this.toastService.warning('請選擇帳號');
      return;
    }
    if (!form.roleName.trim()) {
      this.toastService.warning('請輸入角色名稱');
      return;
    }
    
    this.ipcService.send('assign-role', {
      accountPhone: form.accountPhone,
      roleType: form.roleType,
      roleName: form.roleName
    });
    
    this.newRoleAssign.set({ accountPhone: '', roleType: 'seller', roleName: '' });
    this.showRoleAssignForm.set(false);
  }
  
  removeRole(roleId: number) {
    if (!confirm('確定要移除此角色嗎？')) return;
    this.ipcService.send('remove-role', { roleId });
  }
  
  getRoleIcon(roleType: string): string {
    const icons: Record<string, string> = {
      'seller': '🧑‍💼',
      'expert': '👨‍🔬',
      'satisfied': '😊',
      'hesitant': '🤔',
      'converted': '🎉',
      'curious': '❓',
      'manager': '👔',
      'support': '🛠️'
    };
    return icons[roleType] || '👤';
  }
  
  getRoleLabel(roleType: string): string {
    const labels: Record<string, string> = {
      'seller': '銷售顧問',
      'expert': '專業顧問',
      'satisfied': '滿意客戶',
      'hesitant': '猶豫客戶',
      'converted': '成交客戶',
      'curious': '好奇者',
      'manager': '經理主管',
      'support': '售後客服'
    };
    return labels[roleType] || roleType;
  }
  
  getScenarioLabel(scenario: string): string {
    const labels: Record<string, string> = {
      'group_conversion': '群聊轉化',
      'private_followup': '私聊跟進',
      'objection_handling': '異議處理',
      'product_intro': '產品介紹',
      'trust_building': '建立信任',
      'urgency_creation': '製造緊迫感',
      'custom': '自定義'
    };
    return labels[scenario] || scenario;
  }
  
  getCollabStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'warming': '預熱中',
      'active': '活躍中',
      'completed': '已完成',
      'archived': '已歸檔'
    };
    return labels[status] || status;
  }
  
  getCollabStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'warming': 'bg-yellow-500/20 text-yellow-400',
      'active': 'bg-green-500/20 text-green-400',
      'completed': 'bg-blue-500/20 text-blue-400',
      'archived': 'bg-slate-500/20 text-slate-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // Handle multi-role events
  private handleRoleTemplates(data: any) {
    if (data.success) {
      this.roleTemplates.set(data.templates || {});
    }
  }
  
  private handleAllRoles(data: any) {
    if (data.success) {
      this.allRoles.set(data.roles || []);
    }
  }
  
  private handleScriptTemplates(data: any) {
    if (data.success) {
      this.scriptTemplates.set(data.templates || []);
    }
  }
  
  private handleCollabGroups(data: any) {
    if (data.success) {
      this.collabGroups.set(data.groups || []);
    }
  }
  
  private handleCollabStats(data: any) {
    if (data.success) {
      this.collabStats.set(data);
    }
  }
  
  private handleRoleStats(data: any) {
    if (data.success) {
      this.roleStats.set(data);
    }
  }

  // ==================== Form Update Helpers ====================
  
  updateAdTemplateName(value: string) {
    this.newAdTemplate.update(t => ({...t, name: value}));
  }
  
  updateAdTemplateContent(value: string) {
    this.newAdTemplate.update(t => ({...t, content: value}));
  }
  
  updateAdTemplateMediaType(value: string) {
    this.newAdTemplate.update(t => ({...t, mediaType: value as any}));
  }
  
  updateAdScheduleName(value: string) {
    this.newAdSchedule.update(s => ({...s, name: value}));
  }
  
  updateAdScheduleTemplateId(value: number) {
    this.newAdSchedule.update(s => ({...s, templateId: value}));
  }
  
  updateAdScheduleSendMode(value: string) {
    this.newAdSchedule.update(s => ({...s, sendMode: value as any}));
  }
  
  updateAdScheduleType(value: string) {
    this.newAdSchedule.update(s => ({...s, scheduleType: value as any}));
  }
  
  updateAdScheduleTime(value: string) {
    this.newAdSchedule.update(s => ({...s, scheduleTime: value}));
  }
  
  updateAdScheduleInterval(value: number) {
    this.newAdSchedule.update(s => ({...s, intervalMinutes: value}));
  }
  
  updateAdScheduleStrategy(value: string) {
    this.newAdSchedule.update(s => ({...s, accountStrategy: value as any}));
  }
  
  updateTrackedUserId(value: string) {
    this.newTrackedUser.update(u => ({...u, userId: value}));
  }
  
  updateTrackedUserName(value: string) {
    this.newTrackedUser.update(u => ({...u, username: value}));
  }
  
  updateTrackedUserNotes(value: string) {
    this.newTrackedUser.update(u => ({...u, notes: value}));
  }
  
  updateCampaignFormName(value: string) {
    this.campaignFormData.update(c => ({...c, name: value}));
  }
  
  updateCampaignFormDesc(value: string) {
    this.campaignFormData.update(c => ({...c, description: value}));
  }
  
  updateRoleAssignPhone(value: string) {
    this.newRoleAssign.update(r => ({...r, accountPhone: value}));
  }
  
  updateRoleAssignType(value: string) {
    this.newRoleAssign.update(r => ({...r, roleType: value}));
  }
  
  updateRoleAssignName(value: string) {
    this.newRoleAssign.update(r => ({...r, roleName: value}));
  }
  
  getRolesOfType(roleType: string): any[] {
    return this.allRoles().filter(r => r.roleType === roleType);
  }

  addTemplate() {
    const form = this.newTemplate();
    if (form.name.trim() && form.prompt.trim()) {
        this.ipcService.send('add-template', { name: form.name, prompt: form.prompt });
        this.newTemplate.set({ name: '', prompt: '' });
        this.toastService.success('模板添加成功');
    } else {
        this.toastService.error('请填写模板名称和消息内容');
    }
  }
  
  addTemplateQuick(name: string, prompt: string) {
    if (name?.trim() && prompt?.trim()) {
        // Check if template with same name already exists
        const exists = this.messageTemplates().some(t => t.name === name.trim());
        if (exists) {
            this.toastService.warning('模板名稱已存在，無法創建重複模板', 3000);
            return;
        }
        this.ipcService.send('add-template', { name: name.trim(), prompt: prompt.trim() });
        this.newTemplate.set({ name: '', prompt: '' });
        this.toastService.success('模板添加成功');
        // 自動關閉創建面板（如果已有模板）
        if (this.messageTemplates().length > 0) {
            this.showTemplateCreator.set(false);
        }
    } else {
        this.toastService.error('请填写模板名称和消息内容');
    }
  }
  
  updateTemplateName(value: string) {
    this.newTemplate.update(t => ({ ...t, name: value }));
  }
  
  updateTemplatePrompt(value: string) {
    this.newTemplate.update(t => ({ ...t, prompt: value }));
  }
  
  insertTemplateVariable(textarea: HTMLTextAreaElement, variable: string) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);
    textarea.value = newText;
    this.updateTemplatePrompt(newText);
    // Set cursor position after the inserted variable
    setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }
  toggleTemplateStatus(templateId: number) {
    this.ipcService.send('toggle-template-status', { id: templateId });
  }
  
  removeTemplate(templateId: number) {
    const template = this.messageTemplates().find(t => t.id === templateId);
    if (!template) return;
    
    // 檢查是否有活動正在使用此模板
    const usingCampaigns = this.campaigns().filter(c => 
      c.actions.some(a => a.templateId === templateId)
    );
    
    if (usingCampaigns.length > 0) {
      const campaignNames = usingCampaigns.map(c => c.name).join(', ');
      if (!confirm(`模板 "${template.name}" 正在被以下活動使用：${campaignNames}\n\n刪除模板後，這些活動將無法正常工作。\n\n確定要刪除嗎？`)) {
        return;
      }
    } else {
      if (!confirm(`確定要刪除模板 "${template.name}" 嗎？此操作不可撤銷。`)) {
        return;
      }
    }
    
    this.ipcService.send('remove-template', { id: templateId });
    this.toastService.success('模板已刪除');
  }
  getTemplateName(id?: number): string {
    if (!id) return 'N/A';
    return this.messageTemplates().find(t => t.id === id)?.name || 'Unknown Template';
  }
  getKeywordSetName(id: number): string {
    return this.keywordSets().find(s => s.id === id)?.name || 'Unknown Set';
  }
  getGroupName(id: number): string {
    return this.monitoredGroups().find(g => g.id === id)?.name || 'Unknown Group';
  }
  getCampaignName(id?: number): string {
    if(!id) return 'N/A';
    return this.campaigns().find(c => c.id === id)?.name || 'Unknown Campaign';
  }

  getCampaignById(id: number | undefined): AutomationCampaign | undefined {
    if (id === undefined) {
      return undefined;
    }
    return this.campaigns().find(c => c.id === id);
  }
  
  // --- Campaign Methods ---
  getEmptyCampaignForm() {
    return {
        name: '',
        trigger: { sourceGroupIds: [], keywordSetIds: [] },
        action: { templateId: 0, minDelaySeconds: 30, maxDelaySeconds: 120 }
    };
  }
  private isSubmittingCampaign = signal(false);
  
  addCampaign() {
      // 防止重複提交
      if (this.isSubmittingCampaign()) {
          this.toastService.warning('正在創建活動，請稍候...', 2000);
          return;
      }
      
      const form = this.newCampaign();
      const errors: string[] = [];
      
      if (!form.name?.trim()) {
          errors.push('活动名称');
      }
      if (!form.action.templateId || form.action.templateId === 0) {
          errors.push('消息模板');
      }
      if (form.trigger.sourceGroupIds.length === 0) {
          errors.push('至少选择一个来源群组');
      }
      if (form.trigger.keywordSetIds.length === 0) {
          errors.push('至少选择一个关键词集');
      }
      
      if (errors.length > 0) {
          this.toastService.error(`请完善以下内容: ${errors.join(', ')}`);
          return;
      }
      
      // 檢查本地是否已有同名活動
      const campaignName = form.name.trim();
      const existingCampaign = this.campaigns().find(c => c.name === campaignName);
      if (existingCampaign) {
          this.toastService.warning(`活動 "${campaignName}" 已存在，請使用不同的名稱`, 4000);
          return;
      }
      
      // 設置提交狀態
      this.isSubmittingCampaign.set(true);
      
      // 立即清空表單，防止重複提交
      this.newCampaign.set(this.getEmptyCampaignForm());
      
      // 發送創建請求
      this.ipcService.send('add-campaign', { ...form });
      
      // 3 秒後重置提交狀態（如果後端沒有響應）
      setTimeout(() => {
          this.isSubmittingCampaign.set(false);
      }, 3000);
  }

  toggleCampaignStatus(id: number) {
    this.ipcService.send('toggle-campaign-status', { id });
  }

  getLogColor(type: LogEntry['type']): string {
    switch (type) {
      case 'info': return 'text-cyan-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  }

  formatTimestamp(timestamp: Date | string | null | undefined): string {
    if (!timestamp) return '';
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
      return '';
    }
  }
  
  // ==================== Chat History Methods ====================
  
  async loadChatList() {
    try {
      const search = this.chatListSearch();
      const funnelStage = this.chatListFunnelFilter();
      
      this.ipcService.send('get-chat-list', {
        limit: 50,
        offset: 0,
        search: search || undefined,
        funnelStage: funnelStage || undefined
      });
    } catch (error: any) {
      console.error('[Frontend] Error loading chat list:', error);
    }
  }
  
  // 防抖版本的聊天列表搜索
  onChatListSearchChange(value: string) {
    this.chatListSearch.set(value);
    
    // 清除之前的定時器
    if (this.chatListSearchDebounceTimer) {
      clearTimeout(this.chatListSearchDebounceTimer);
    }
    
    // 300ms 後執行搜索
    this.chatListSearchDebounceTimer = setTimeout(() => {
      this.loadChatList();
      this.chatListSearchDebounceTimer = undefined;
    }, 300);
  }
  
  // 防抖版本的日誌過濾
  onLogFilterChange() {
    // 清除之前的定時器
    if (this.logFilterDebounceTimer) {
      clearTimeout(this.logFilterDebounceTimer);
    }
    
    // 500ms 後應用過濾
    this.logFilterDebounceTimer = setTimeout(() => {
      this.applyLogFilter();
      this.logFilterDebounceTimer = undefined;
    }, 500);
  }
  
  // 節流版本的隊列狀態刷新（最多每2秒刷新一次）
  refreshQueueStatusThrottled() {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastQueueStatusRefresh;
    
    if (timeSinceLastRefresh >= 2000) {
      // 立即刷新
      this.lastQueueStatusRefresh = now;
      this.refreshQueueStatus();
    } else {
      // 延遲到2秒後刷新
      if (this.queueStatusRefreshThrottleTimer) {
        clearTimeout(this.queueStatusRefreshThrottleTimer);
      }
      
      this.queueStatusRefreshThrottleTimer = setTimeout(() => {
        this.lastQueueStatusRefresh = Date.now();
        this.queueStatusRefreshThrottleTimer = undefined;
        this.refreshQueueStatus();
      }, 2000 - timeSinceLastRefresh);
    }
  }
  
  // === Phase 1 優化：隊列進度組件支持方法 ===
  
  // 獲取帳號隊列狀態（轉換為組件需要的格式）
  getAccountQueueStatuses(): AccountQueueStatus[] {
    const statuses = this.queueStatuses();
    return Object.entries(statuses).map(([phone, status]) => {
      const account = this.accounts().find(a => a.phone === phone);
      return {
        phone,
        displayName: phone,  // 使用電話號碼作為顯示名稱
        status: status.processing > 0 ? 'active' as const : 
                status.pending > 0 ? 'idle' as const : 'idle' as const,
        pending: status.pending,
        processing: status.processing,
        completed: status.stats.completed,
        failed: status.stats.failed,
        retrying: status.retrying,
        sendRate: status.processing > 0 ? 1.5 : 0,  // 估算值
        avgResponseTime: 500,  // 預設值
        dailyLimit: account?.dailySendLimit ?? 100,
        dailyUsed: account?.dailySendCount ?? 0,
        estimatedMinutes: status.pending > 0 ? Math.ceil(status.pending / 1.5) : 0,
        lastError: status.failed > 0 ? '部分消息發送失敗' : undefined
      };
    });
  }
  
  // 暫停所有隊列
  pauseAllQueues() {
    this.ipcService.send('pause-all-queues', {});
    this.toastService.info('正在暫停所有發送隊列...', 2000);
  }
  
  // 恢復所有隊列
  resumeAllQueues() {
    this.ipcService.send('resume-all-queues', {});
    this.toastService.info('正在恢復所有發送隊列...', 2000);
  }
  
  // 重試所有失敗項
  retryAllFailed() {
    this.ipcService.send('retry-all-failed', {});
    this.toastService.info('正在重試所有失敗的消息...', 2000);
  }
  
  // === Phase 1 優化：配置診斷方法 ===
  
  // 運行配置診斷
  checkAutomationConfig() {
    this.toastService.info('正在檢查配置...', 2000);
    
    // 發送診斷請求到後端
    this.ipcService.send('check-automation-config', {
      accounts: this.accounts().map(a => ({ phone: a.phone, role: a.role, status: a.status })),
      groups: this.monitoredGroups(),
      keywords: this.keywordSets(),
      campaigns: this.campaigns()
    });
  }
  
  // === Phase 1 優化：快速工作流支持方法 ===
  
  // 處理工作流導航
  handleWorkflowNavigation(event: {view: string, handler?: string}) {
    // 切換到目標視圖
    this.changeView(event.view as any);
    
    // 如果有特殊操作處理
    if (event.handler) {
      setTimeout(() => {
        switch (event.handler) {
          case 'start-monitoring':
            this.startMonitoring();
            break;
          case 'scan-sessions':
            this.scanOrphanSessions();
            break;
          case 'new-campaign':
            // 觸發創建新活動的邏輯
            break;
          case 'export-leads':
            this.exportLeads();
            break;
          default:
            console.log('[Workflow] Unknown handler:', event.handler);
        }
      }, 300);
    }
  }
  
  // 工作流完成回調
  onWorkflowCompleted(workflow: Workflow) {
    this.toastService.success(`🎉 工作流「${workflow.title}」已完成！`, 4000);
    
    // 記錄完成的工作流（可用於統計）
    console.log('[Workflow] Completed:', workflow.id);
  }
  
  async loadChatHistory(userId: string, reset: boolean = true) {
    try {
      console.log('[Frontend] Loading chat history for user:', userId, 'reset:', reset);
      if (reset) {
        this.isLoadingChatHistory.set(true);
        this.chatHistoryPage.set(0);
        this.chatHistoryAllMessages.set([]);
      } else {
        this.chatHistoryLoadingMore.set(true);
      }
      
      this.selectedChatUserId.set(userId);
      
      const page = this.chatHistoryPage();
      const pageSize = this.chatHistoryPageSize();
      const offset = page * pageSize;
      
      console.log('[Frontend] Sending get-chat-history-full:', { userId, limit: pageSize, offset });
      this.ipcService.send('get-chat-history-full', {
        userId: userId,
        limit: pageSize,
        offset: offset
      });
    } catch (error: any) {
      console.error('[Frontend] Error loading chat history:', error);
      this.isLoadingChatHistory.set(false);
      this.chatHistoryLoadingMore.set(false);
    }
  }
  
  async loadMoreChatHistory() {
    const userId = this.selectedChatUserId();
    if (!userId || this.chatHistoryLoadingMore() || !this.chatHistoryHasMore()) {
      return;
    }
    
    // 加載下一頁
    this.chatHistoryPage.update(page => page + 1);
    await this.loadChatHistory(userId, false);
  }
  
  onChatHistoryScroll(event: Event) {
    const element = event.target as HTMLElement;
    if (!element) return;
    
    // 檢查是否接近底部（距離底部 200px 以內）
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    if (distanceFromBottom < 200 && this.chatHistoryHasMore() && !this.chatHistoryLoadingMore()) {
      this.loadMoreChatHistory();
    }
  }
  
  async sendAiResponse(userId: string, message: string) {
    try {
      const lead = this.generationState().lead;
      if (!lead) return;
      
      this.ipcService.send('send-ai-response', {
        userId: userId,
        message: message,
        accountPhone: this.senderAccounts().find(a => a.id === this.selectedSenderId())?.phone,
        sourceGroup: lead.sourceGroup,
        username: lead.username
      });
      
      // 重新加載聊天記錄
      setTimeout(() => {
        this.loadChatHistory(userId);
      }, 1000);
    } catch (error: any) {
      console.error('[Frontend] Error sending AI response:', error);
    }
  }
  
  async checkMonitoringStatus() {
    try {
      this.ipcService.send('get-monitoring-status', {});
    } catch (error: any) {
      console.error('[Frontend] Error checking monitoring status:', error);
    }
  }
  
  async checkMonitoringHealth() {
    try {
      this.ipcService.send('check-monitoring-health', {});
    } catch (error: any) {
      console.error('[Frontend] Error checking monitoring health:', error);
    }
  }
  
  // TrackBy function for chat messages (fixes NG0955 error)
  trackByChatMessageId(index: number, message: any): any {
    return message.id || index;
  }
  
  trackByChatId(index: number, chat: any): any {
    return chat.userId || index;
  }
  
  trackByLogId(index: number, log: LogEntry): any {
    // 🔧 使用 id 和 timestamp 的組合確保唯一性（安全處理不同類型的 timestamp）
    let timeValue = 0;
    if (log.timestamp) {
      if (log.timestamp instanceof Date) {
        timeValue = log.timestamp.getTime();
      } else if (typeof log.timestamp === 'number') {
        timeValue = log.timestamp;
      } else if (typeof log.timestamp === 'string') {
        timeValue = new Date(log.timestamp).getTime() || 0;
      }
    }
    return `${log.id}-${timeValue}-${index}`;
  }

  // 檢查 alert.details 是否為有效的可顯示對象
  isValidAlertDetails(details: any): boolean {
    if (!details) return false;
    if (typeof details !== 'object') return false;
    if (details === null) return false;
    if (Array.isArray(details)) return false;
    try {
      return Object.keys(details).length > 0;
    } catch {
      return false;
    }
  }

  // 安全地將對象轉換為 JSON 字符串
  safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '無法顯示詳情';
    }
  }

  getStatusColor(status: AccountStatus | CapturedLead['status']): string {
    switch (status) {
      case 'Online': return 'bg-green-500/10 text-green-400';
      case 'Offline': return 'bg-slate-500/10 text-slate-400';
      case 'Banned': return 'bg-red-500/10 text-red-400';
      case 'Proxy Error': return 'bg-orange-500/10 text-orange-400';
      case 'Logging in...': return 'bg-blue-500/10 text-blue-400 animate-pulse';
      case 'Resting (Cooldown)': return 'bg-yellow-500/10 text-yellow-400';
      case 'Warming Up': return 'bg-indigo-500/10 text-indigo-400 animate-pulse';
      case 'New': return 'bg-blue-500/10 text-blue-400';
      case 'Contacted': return 'bg-yellow-500/10 text-yellow-400';
      case 'Replied': return 'bg-green-500/10 text-green-400';
      case 'Follow-up': return 'bg-purple-500/10 text-purple-400';
      case 'Closed-Won': return 'bg-teal-500/10 text-teal-400';
      case 'Closed-Lost': return 'bg-red-500/10 text-red-400';
      default: return 'bg-slate-700/20 text-slate-300';
    }
  }
  
  // 狀態頂部條顏色
  getStatusBarColor(status: string): string {
    switch (status) {
      case 'New': return 'bg-amber-500';
      case 'Contacted': return 'bg-cyan-500';
      case 'Replied': return 'bg-purple-500';
      case 'Follow-up': return 'bg-orange-500';
      case 'Closed-Won': return 'bg-emerald-500';
      case 'Closed-Lost': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  }
  
  getHealthColor(score: number): string {
    if (score > 80) return 'bg-green-500';
    if (score > 50) return 'bg-yellow-500';
    return 'bg-red-500';
  }
  getOnlineStatusColor(status: OnlineStatus | string | undefined): string {
    switch (status) {
      case 'Online': return 'bg-green-500';
      case 'Recently': return 'bg-yellow-500';
      case 'Offline': return 'bg-slate-500';
      default: return 'bg-slate-400';
    }
  }

  // 意向等級顏色
  getIntentLevelColor(level: string | undefined): string {
    switch (level) {
      case 'HOT': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'WARM': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'NEUTRAL': return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'COLD': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'NONE': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    }
  }

  // 意向等級 Emoji
  getIntentLevelEmoji(level: string | undefined): string {
    switch (level) {
      case 'HOT': return '🔥';
      case 'WARM': return '🌡️';
      case 'NEUTRAL': return '😐';
      case 'COLD': return '❄️';
      case 'NONE': return '⚪';
      default: return '⚪';
    }
  }

  // ==================== 成員資料庫事件處理 ====================
  
  /**
   * 處理從成員資料庫發送消息事件
   * 將 ExtractedMember 轉換為 CapturedLead 格式，並打開統一的發消息對話框
   */
  handleMemberSendMessage(member: ExtractedMember): void {
    // 將成員轉換為 CapturedLead 格式
    const lead = this.convertMemberToLead(member);
    
    // 使用統一的發消息對話框
    this.openLeadDetailModal(lead);
    this.toastService.info(`💬 準備發送消息給 ${member.first_name || member.username || member.user_id}`);
  }
  
  /**
   * 處理從成員資料庫加入漏斗事件
   * 創建新的 Lead 並加入潛在客戶列表
   */
  handleMemberAddToFunnel(member: ExtractedMember): void {
    // 檢查是否已存在該 Lead
    const existingLead = this.leads().find(l => l.userId === member.user_id);
    if (existingLead) {
      this.toastService.warning(`⚠️ ${member.first_name || member.username || member.user_id} 已在銷售漏斗中`);
      // 直接跳轉到潛在客戶頁面並選中該 Lead
      this.currentView.set('leads');
      setTimeout(() => this.openLeadDetailModal(existingLead), 100);
      return;
    }
    
    // 創建新的 Lead
    const newLead: CapturedLead = this.convertMemberToLead(member);
    
    // 發送到後端保存
    this.ipcService.send('add-lead', {
      user_id: member.user_id,
      username: member.username,
      first_name: member.first_name,
      last_name: member.last_name,
      source_chat_title: member.source_chat_title,
      source_chat_id: member.source_chat_id,
      notes: `從成員資料庫添加 (${member.value_level}級)`
    });
    
    // 樂觀更新本地數據
    this.leads.update(leads => [newLead, ...leads]);
    
    this.toastService.success(`✅ 已將 ${member.first_name || member.username || member.user_id} 加入銷售漏斗`);
    
    // 跳轉到潛在客戶頁面
    this.currentView.set('leads');
  }
  
  /**
   * 處理從資源中心發送消息事件
   */
  handleResourceSendMessage(contact: any): void {
    // 將統一聯繫人轉換為 CapturedLead 格式
    const lead: CapturedLead = {
      id: 0,
      userId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      sourceGroup: contact.source_name || '',
      triggeredKeyword: '',
      timestamp: new Date(contact.created_at),
      status: 'New',
      onlineStatus: 'Unknown',
      interactionHistory: [],
      doNotContact: false
    };
    
    this.openLeadDetailModal(lead);
    this.toastService.info(`💬 準備發送消息給 ${contact.display_name || contact.username || contact.telegram_id}`);
  }
  
  /**
   * 處理從資源中心查看詳情事件
   */
  handleResourceViewDetail(contact: any): void {
    // 狀態映射
    let leadStatus: LeadStatus = 'New';
    if (contact.status === 'converted') leadStatus = 'Closed-Won';
    else if (contact.status === 'contacted') leadStatus = 'Contacted';
    else if (contact.status === 'interested') leadStatus = 'Replied';
    
    // 轉換為 Lead 格式並打開詳情
    const lead: CapturedLead = {
      id: 0,
      userId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      sourceGroup: contact.source_name || '',
      triggeredKeyword: '',
      timestamp: new Date(contact.created_at),
      status: leadStatus,
      onlineStatus: 'Unknown',
      interactionHistory: [],
      doNotContact: false
    };
    
    this.openLeadDetailModal(lead);
  }
  
  /**
   * 處理從資源中心批量發送事件
   */
  handleResourceBatchSend(contacts: any[]): void {
    if (contacts.length === 0) return;
    
    // 轉換為批量發送目標格式（包含來源信息用於變量替換）
    const targets: BatchSendTarget[] = contacts.map(contact => ({
      telegramId: contact.telegram_id,
      username: contact.username || '',
      firstName: contact.first_name,
      lastName: contact.last_name,
      displayName: contact.display_name || contact.first_name || contact.username || contact.telegram_id,
      // 來源信息
      groupName: contact.source_name || contact.source_chat_title || '',
      keyword: contact.triggered_keyword || '',
      source: contact.source_type || ''
    }));
    
    this.batchSendTargets.set(targets);
    this.showBatchMessageDialogState.set(true);
    this.toastService.info(`📨 準備向 ${contacts.length} 個用戶發送批量消息`);
  }
  
  /**
   * 處理批量發送完成
   */
  handleBatchSendComplete(result: { success: number; failed: number }): void {
    this.showBatchMessageDialogState.set(false);
    this.batchSendTargets.set([]);
    this.toastService.success(`✅ 批量發送完成：成功 ${result.success}，失敗 ${result.failed}`);
  }
  
  /**
   * 關閉批量發送對話框
   */
  closeBatchSendDialog(): void {
    this.showBatchMessageDialogState.set(false);
    this.batchSendTargets.set([]);
  }
  
  /**
   * 為選中的 Leads 打開批量發送對話框
   */
  openBatchSendForLeads(): void {
    const selectedLeads = this.leads().filter(l => this.selectedLeadIds().has(l.id));
    if (selectedLeads.length === 0) {
      this.toastService.warning('請先選擇要發送消息的客戶');
      return;
    }
    
    const targets: BatchSendTarget[] = selectedLeads.map(lead => ({
      telegramId: lead.userId || String(lead.id),
      username: lead.username,
      firstName: lead.firstName,
      lastName: lead.lastName,
      displayName: lead.firstName || lead.username || '未知',
      // 添加來源信息，用於變量替換
      groupName: lead.sourceGroup || '',
      keyword: lead.triggeredKeyword || '',
      source: lead.sourceType || ''
    }));
    
    this.batchSendTargets.set(targets);
    this.showBatchMessageDialogState.set(true);
    this.toastService.info(`📨 準備向 ${selectedLeads.length} 個客戶發送批量消息`);
  }
  
  /**
   * 為選中的 Leads 打開批量拉群對話框
   */
  openBatchInviteForLeads(): void {
    const selectedLeads = this.leads().filter(l => this.selectedLeadIds().has(l.id));
    if (selectedLeads.length === 0) {
      this.toastService.warning('請先選擇要拉群的客戶');
      return;
    }
    
    const targets: BatchInviteTarget[] = selectedLeads.map(lead => ({
      telegramId: lead.userId || String(lead.id),
      username: lead.username,
      firstName: lead.firstName,
      displayName: lead.firstName || lead.username || '未知'
    }));
    
    this.batchInviteTargets.set(targets);
    this.showBatchInviteDialogState.set(true);
    this.toastService.info(`👥 準備將 ${selectedLeads.length} 個客戶拉入群組`);
  }
  
  /**
   * 關閉批量拉群對話框
   */
  closeBatchInviteDialog(): void {
    this.showBatchInviteDialogState.set(false);
    this.batchInviteTargets.set([]);
  }
  
  /**
   * 處理批量拉群完成
   */
  handleBatchInviteComplete(result: { success: number; failed: number; skipped: number }): void {
    this.showBatchInviteDialogState.set(false);
    this.batchInviteTargets.set([]);
    this.toastService.success(`✅ 批量拉群完成：成功 ${result.success}，跳過 ${result.skipped}，失敗 ${result.failed}`);
  }
  
  // ==================== 成員提取配置對話框 ====================
  
  /**
   * 打開成員提取配置對話框
   * 由監控群組頁面調用
   */
  openMemberExtractionDialog(group: any): void {
    // 構造群組信息
    const groupInfo: ExtractionGroupInfo = {
      id: String(group.id),
      name: group.name || group.title || '未知群組',
      url: group.url || '',
      telegramId: group.telegramId || group.telegram_id || '',  // 🔧 添加 Telegram ID
      memberCount: group.memberCount || group.member_count || 0,
      accountPhone: group.accountPhone,
      resourceType: group.resourceType || group.resource_type || 'group'  // 🆕 資源類型
    };
    
    this.memberExtractionGroup.set(groupInfo);
    this.showMemberExtractionDialog.set(true);
  }
  
  /**
   * 關閉成員提取配置對話框
   */
  closeMemberExtractionDialog(): void {
    this.showMemberExtractionDialog.set(false);
    this.memberExtractionGroup.set(null);
  }
  
  /**
   * 🔧 P0: 統一關閉成員提取對話框（同時關閉 DialogService 和本地狀態）
   */
  closeMemberExtractionDialogUnified(): void {
    // 關閉本地狀態
    this.showMemberExtractionDialog.set(false);
    this.memberExtractionGroup.set(null);
    // 關閉 DialogService 狀態
    this.dialogService.closeMemberExtraction();
  }
  
  /**
   * 🆕 處理成員數刷新結果
   * 更新對話框和群組列表中的成員數
   */
  handleMemberCountRefreshed(event: { groupId: string; memberCount: number }): void {
    console.log('[Frontend] Member count refreshed:', event);
    
    // 更新對話框中的群組信息
    const currentGroup = this.memberExtractionGroup();
    if (currentGroup && currentGroup.id === event.groupId) {
      this.memberExtractionGroup.set({
        ...currentGroup,
        memberCount: event.memberCount
      });
    }
    
    // 同時更新 monitoredGroups 中的數據
    this.monitoredGroups.update(groups => 
      groups.map(g => 
        String(g.id) === event.groupId 
          ? { ...g, memberCount: event.memberCount, member_count: event.memberCount }
          : g
      )
    );
  }
  
  /**
   * 處理成員提取開始
   * 從對話框接收配置並執行提取
   */
  handleMemberExtractionStart(event: { group: ExtractionGroupInfo; config: MemberExtractionConfig }): void {
    // 關閉對話框
    this.showMemberExtractionDialog.set(false);
    
    // 調用 MonitoringGroupsComponent 的提取方法（如果存在）
    if (this.monitoringGroupsRef) {
      this.monitoringGroupsRef.executeExtraction({
        limit: event.config.limit,
        filters: event.config.filters,
        advanced: event.config.advanced
      });
    } else {
      // 直接發送 IPC 命令
      const group = event.group;
      let chatId = '';
      if (group.url) {
        const match = group.url.match(/t\.me\/([+\w]+)/);
        if (match) {
          chatId = match[1];
        }
      }
      
      this.ipcService.send('extract-members', {
        chatId: chatId || group.url,
        username: chatId,
        telegramId: group.telegramId,  // 🔧 添加 telegramId
        resourceId: group.id,
        groupName: group.name,
        // 🔧 P0 修復：傳遞已加入群組的帳號
        phone: event.config.accountPhone || group.accountPhone || null,
        limit: event.config.limit === -1 ? undefined : event.config.limit,
        filters: {
          bots: !event.config.filters.excludeBots,
          // 🔧 修復：直接傳遞 onlineStatus 字符串，而不是布爾值
          onlineStatus: event.config.filters.onlineStatus,  // 'all', 'online', 'recently', 'offline'
          offline: event.config.filters.onlineStatus === 'offline',
          online: event.config.filters.onlineStatus === 'online',
          chinese: event.config.filters.hasChinese,
          hasUsername: event.config.filters.hasUsername,
          isPremium: event.config.filters.isPremium,
          excludeAdmins: event.config.filters.excludeAdmins
        },
        autoSave: event.config.advanced.autoSaveToResources,
        skipDuplicates: event.config.advanced.skipDuplicates
      });
      
      this.toastService.info(`🔄 正在提取 ${group.name} 的成員...`);
    }
  }
  
  /**
   * 處理監控群組配置動作
   */
  handleMonitoringConfigAction(action: string): void {
    switch (action) {
      case 'goto-resource-center':
        this.currentView.set('resource-center');
        break;
      case 'goto-accounts':
        this.currentView.set('monitoring-accounts');
        break;
      case 'goto-keywords':
        this.currentView.set('keyword-sets');
        break;
      case 'goto-templates':
        this.currentView.set('chat-templates');
        break;
      case 'goto-triggers':
        this.currentView.set('trigger-rules');
        break;
      default:
        console.log('[Frontend] Unknown config action:', action);
    }
  }
  
  /**
   * 處理從資源中心發送到 AI 銷售事件
   */
  handleResourceSendToAISales(contacts: any[]): void {
    if (contacts.length === 0) return;
    
    // 將聯繫人加入 AI 銷售隊列
    this.ipcService.send('ai-team:add-targets', {
      targets: contacts.map(c => ({
        telegramId: c.telegram_id,
        username: c.username,
        displayName: c.display_name,
        sourceType: c.source_type
      }))
    });
    
    // 切換到 AI 團隊銷售頁面
    this.currentView.set('ai-team');
    this.toastService.success(`🤖 已將 ${contacts.length} 個聯繫人加入 AI 銷售隊列`);
  }
  
  /**
   * 處理資源中心狀態變更事件
   * 同步狀態變更到發送控制台 (leads)
   */
  handleResourceStatusChanged(event: { contacts: any[]; status: string }): void {
    if (!event.contacts.length) return;
    
    console.log('[Frontend] Syncing status change to leads:', event.contacts.length, 'contacts, status:', event.status);
    
    // 找到對應的 leads 並更新狀態
    const contactTelegramIds = new Set(event.contacts.map((c: any) => c.telegram_id));
    
    // 將資源中心狀態映射到 lead 狀態
    const statusMapping: Record<string, string> = {
      'new': 'New',
      'contacted': 'Contacted',
      'interested': 'Interested',
      'negotiating': 'Negotiating',
      'converted': 'Closed-Won',
      'lost': 'Closed-Lost',
      'blocked': 'Unsubscribed'
    };
    
    const leadStatus = statusMapping[event.status] || event.status;
    
    // 更新 leads 中匹配的記錄
    this.leads.update(leads => leads.map(lead => {
      if (contactTelegramIds.has(String(lead.userId))) {
        return { ...lead, status: leadStatus as LeadStatus };
      }
      return lead;
    }));
    
    // 通知後端同步
    this.ipcService.send('sync-resource-status-to-leads', {
      telegramIds: Array.from(contactTelegramIds),
      status: leadStatus
    });
    
    console.log('[Frontend] Status synced for', event.contacts.length, 'contacts');
  }
  
  /**
   * 🆕 刷新 Leads 數據（資源中心請求刷新時調用）
   */
  refreshLeadsData(): void {
    console.log('[Frontend] Refreshing leads data for resource center...');
    
    // 🆕 先用當前已加載的 leads 同步到資源中心
    const currentLeads = this.leads();
    if (currentLeads.length > 0) {
      this.syncLeadsToResourceCenter(currentLeads);
      console.log('[Frontend] Synced current leads to resource center:', currentLeads.length);
    }
    
    // 如果還有更多數據未加載，觸發加載
    if (this.leadsHasMore() && !this.leadsLoading()) {
      this.loadRemainingLeads();
      this.toastService.info(`正在加載更多數據... (當前 ${currentLeads.length} / ${this.leadsTotal()} 條)`, 2000);
    } else if (this.leadsLoading()) {
      this.toastService.info(`正在加載中... (當前 ${currentLeads.length} / ${this.leadsTotal()} 條)`, 2000);
    } else {
      this.toastService.success(`數據已同步 (共 ${currentLeads.length} 條)`);
    }
  }
  
  /**
   * 處理命令面板導航
   */
  handleCommandNavigation(target: string): void {
    // 處理頁面導航
    if (!target.startsWith('action:') && !target.startsWith('contact:')) {
      this.currentView.set(target as any);
      return;
    }
    
    // 處理動作命令
    if (target.startsWith('action:')) {
      const action = target.replace('action:', '');
      switch (action) {
        case 'send-message':
          // 打開發送消息對話框
          this.toastService.info('請先選擇聯繫人');
          this.currentView.set('resource-center');
          break;
        case 'extract-members':
          this.currentView.set('resource-center');
          break;
        case 'search-groups':
          this.currentView.set('resource-center');
          break;
        case 'start-monitor':
          this.startMonitoring();
          break;
        case 'refresh':
          this.ipcService.send('get-initial-state');
          this.toastService.success('數據已刷新');
          break;
        case 'open-docs':
          window.open('https://docs.tg-matrix.com', '_blank');
          break;
        case 'show-shortcuts':
          this.toastService.info('⌘K 打開命令面板\n⌘R 刷新數據\n⌘N 添加帳號');
          break;
        case 'open-feedback':
          this.toastService.info('請發送郵件至 support@tg-matrix.com');
          break;
      }
      return;
    }
    
    // 處理聯繫人導航
    if (target.startsWith('contact:')) {
      const contactId = target.replace('contact:', '');
      // TODO: 打開聯繫人詳情
      this.toastService.info(`正在查看聯繫人 ${contactId}`);
    }
  }
  
  /**
   * 處理批量發送消息事件
   */
  handleMemberBatchSendMessage(members: ExtractedMember[]): void {
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    // 過濾出有用戶名的成員
    const validMembers = members.filter(m => m.username);
    if (validMembers.length === 0) {
      this.toastService.warning('所選成員都沒有用戶名，無法發送消息');
      return;
    }
    
    if (validMembers.length < members.length) {
      this.toastService.warning(`${members.length - validMembers.length} 個成員沒有用戶名，將被跳過`);
    }
    
    // 打開批量發送對話框
    this.batchMessageTargets = validMembers.map(m => ({
      userId: m.user_id,
      username: m.username,
      firstName: m.first_name,
      lastName: m.last_name,
      displayName: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username
    }));
    this.showBatchMessageDialog.set(true);
    this.toastService.info(`📨 準備向 ${validMembers.length} 個成員發送消息`);
  }
  
  /**
   * 處理導航請求
   */
  handleNavigate(viewName: string): void {
    console.log('[Frontend] Navigate to:', viewName);
    this.currentView.set(viewName as View);
  }
  
  /**
   * 處理 AI 策略啟動
   */
  handleAIStrategyStart(strategy: AIStrategyResult): void {
    console.log('[Frontend] AI Strategy started:', strategy);
    
    // 發送策略到後端執行
    this.ipcService.send('execute-ai-strategy', { strategy });
    
    // 切換到自動化中心查看執行狀態
    this.currentView.set('automation');
    this.toastService.success(`🚀 AI 策略已啟動: ${strategy.industry}`);
  }
  
  /**
   * 處理 AI 營銷助手交給 AI 團隊的事件
   * 將策略傳遞給 AI 團隊銷售組件
   */
  handleAIStrategyHandover(strategy: AIStrategyResult): void {
    console.log('[Frontend] Handover strategy to AI Team:', strategy);
    
    // 保存策略到 signal，供 AI 團隊銷售組件使用
    this.aiTeamIncomingStrategy.set(strategy);
    
    // 切換到 AI 團隊銷售頁面
    this.currentView.set('ai-team');
    this.toastService.success(`🤖 已將策略交給 AI 團隊: ${strategy.industry}`);
  }
  
  /**
   * 將 ExtractedMember 轉換為 CapturedLead 格式
   */
  private convertMemberToLead(member: ExtractedMember): CapturedLead {
    return {
      id: parseInt(member.user_id) || Date.now(),
      userId: member.user_id,
      username: member.username,
      firstName: member.first_name,
      lastName: member.last_name,
      sourceGroup: member.source_chat_title,
      triggeredKeyword: '',
      timestamp: new Date(member.extracted_at || new Date()),
      status: member.contacted ? 'Contacted' : 'New',
      onlineStatus: this.mapOnlineStatus(member.online_status),
      interactionHistory: [],
      doNotContact: false,
      intentScore: this.mapValueLevelToScore(member.value_level),
      intentLevel: this.mapValueLevelToIntent(member.value_level),
      sourceType: 'group_extract'
    };
  }
  
  /**
   * 將成員在線狀態映射到 Lead 在線狀態
   */
  private mapOnlineStatus(status: string): OnlineStatus {
    switch (status) {
      case 'online': return 'Online';
      case 'recently': return 'Recently';
      default: return 'Offline';
    }
  }
  
  /**
   * 將價值等級映射到意圖分數
   */
  private mapValueLevelToScore(level: string): number {
    switch (level) {
      case 'S': return 90;
      case 'A': return 75;
      case 'B': return 55;
      case 'C': return 35;
      case 'D': return 15;
      default: return 30;
    }
  }
  
  /**
   * 將價值等級映射到意圖等級
   */
  private mapValueLevelToIntent(level: string): string {
    switch (level) {
      case 'S': return 'HOT';
      case 'A': return 'WARM';
      case 'B': return 'NEUTRAL';
      case 'C': return 'COLD';
      case 'D': return 'NONE';
      default: return 'NEUTRAL';
    }
  }
  
    // Dummy log method for UI feedback until backend sends log event
    log(message: string, type: 'info' | 'success' | 'warning' | 'error') {
        const newLog: LogEntry = { id: Date.now(), timestamp: new Date(), message, type };
        this.logs.update(logs => [newLog, ...logs].slice(0, 100));
    }
}
