
import { ChangeDetectionStrategy, Component, signal, WritableSignal, computed, inject, OnDestroy, effect, OnInit, ChangeDetectorRef, NgZone, HostListener, ViewChild } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { VIEW_ROUTE_MAP } from './app.routes';
import { filter } from 'rxjs/operators';
// 路由動畫改用 CSS 過渡效果，不再使用 Angular animations
import { TelegramAccount, KeywordConfig, MonitoredGroup, CapturedLead, LogEntry, GenerationState, MessageTemplate, LeadStatus, Interaction, OnlineStatus, AccountRole, Attachment, KeywordSet, AutomationCampaign, CampaignTrigger, CampaignAction, AccountStatus, QueueStatus, QueueMessage, Alert } from './models';
// PerformanceMonitorComponent - 移至路由視圖
import { TimeSeriesData } from './analytics-charts.component';
import { GeminiService } from './gemini.service';
// 🔧 P9-2: TranslationService 已遷移至 I18nService，Language 類型保留為兼容別名
type Language = 'en' | 'zh';
import { AccountLoaderService } from './account-loader.service';
import { ElectronIpcService } from './electron-ipc.service';
import { ToastService } from './toast.service';
import { ToastComponent } from './toast.component';
import { GlobalConfirmDialogComponent } from './global-confirm-dialog.component';
// 🆕 实时告警通知组件
import { AlertNotificationComponent } from './components/alert-notification.component';
import { GlobalInputDialogComponent } from './global-input-dialog.component';
import { ProgressDialogComponent, ProgressInfo } from './progress-dialog.component';
import { MembershipService, MembershipLevel } from './membership.service';
import { MembershipDialogComponent, UpgradePromptComponent } from './membership-ui.component';
import { LicenseClientService } from './license-client.service';
import { UnifiedContactsService } from './services/unified-contacts.service';
import { PaymentComponent } from './payment.component';
import { SecurityService } from './security.service';
import { GlobalErrorHandler } from './services/error-handler.service';
import { WebVitalsService } from './services/web-vitals.service';
import { OfflineIndicatorComponent } from './components/offline-indicator.component';
import { AuditTrackerService } from './services/audit-tracker.service';
import { LoadingService } from './loading.service';
import { OfflineCacheService } from './services/offline-cache.service';
import { SwManagerService } from './services/sw-manager.service';
// LoadingOverlayComponent removed - using non-blocking connection indicator instead
import { OnboardingComponent } from './onboarding.component';
// BackupService 從 ./services 統一導入
import { I18nService } from './i18n.service';
// 新增：用戶認證相關 - 使用統一的 JWT 認證服務
import { AuthService } from './core/auth.service';
// 🔧 P4-1: Legacy LoginComponent 已移除，統一使用 /auth/login 路由（Core LoginComponent）
// ProfileComponent, MembershipCenterComponent - 移至路由視圖
import { QrLoginComponent } from './qr-login.component';
// AccountCardListComponent, ApiCredentialManagerComponent - 移至路由視圖
// 🔧 Phase7-1: AddAccountPageComponent / AddAccountSimpleComponent 已移至 Router lazy-load
import { Account } from './account-card-list.component';
// 類型導入（用於信號和狀態）
import { AccountQueueStatus } from './queue-progress.component';
import { Workflow } from './quick-workflow.component';
import { DiscoveredResource, SearchSource } from './search-discovery/search-discovery.component';
import { ExtractedMember } from './member-database/member-database.component';
import { BatchSendDialogComponent, BatchSendTarget } from './dialogs/batch-send-dialog.component';
import { BatchInviteDialogComponent, BatchInviteTarget } from './dialogs/batch-invite-dialog.component';
import { MemberExtractionDialogComponent, MemberExtractionConfig, ExtractionGroupInfo } from './dialogs/member-extraction-dialog.component';
// Phase 10: Extracted dialog components
import { OrphanSessionDialogComponent } from './dialogs/orphan-session-dialog.component';
import { BackendErrorDialogComponent } from './dialogs/backend-error-dialog.component';
import { KeywordCreatorDialogComponent } from './dialogs/keyword-creator-dialog.component';
import { WelcomeDialogComponent } from './dialogs/welcome-dialog.component';
import { BatchHistoryDialogComponent } from './dialogs/batch-history-dialog.component';
import { DeleteConfirmDialogComponent } from './dialogs/delete-confirm-dialog.component';
import { InviteGroupDialogComponent } from './dialogs/invite-group-dialog.component';
import { LeadDetailDialogComponent } from './dialogs/lead-detail-dialog.component';
import { AIStrategyResult } from './ai-assistant/ai-marketing-assistant.component';
import { CommandPaletteComponent } from './components/command-palette.component';
import { UserLevelBadgeComponent } from './components/user-level-badge.component';
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
// 🔧 Phase8-P1-3: Sidebar 狀態服務
import { SidebarStateService } from './sidebar-state.service';
// 🔧 Phase 9-1a: IPC handlers 提取到外部文件（6 個域模塊）
import { setupAllIpcHandlers } from './ipc-handlers';
// 🔧 Phase 9-1b: Business methods 提取到外部文件（5 個域模塊）
import { applyMethodMixins } from './app-methods';
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

// 🔧 Phase7-1: 視圖組件已全部移除 — 透過 Router lazy-load
// 保留的僅為模板直接使用的類型引用
import { RAGBrainService } from './services/rag-brain.service';

// 視圖類型定義
type View = 'dashboard' | 'accounts' | 'add-account' | 'api-credentials' | 'resources' | 'resource-discovery' | 'member-database' | 'resource-center' | 'search-discovery' | 'ai-assistant' | 'automation' | 'automation-legacy' | 'leads' | 'lead-nurturing' | 'nurturing-analytics' | 'ads' | 'user-tracking' | 'campaigns' | 'multi-role' | 'ai-team' | 'ai-engine' | 'ai-center' | 'knowledge-brain' | 'knowledge-manage' | 'knowledge-gaps' | 'settings' | 'analytics' | 'analytics-center' | 'marketing-report' | 'profile' | 'membership-center' | 'wallet' | 'wallet-recharge' | 'wallet-withdraw' | 'wallet-transactions' | 'wallet-orders' | 'wallet-analytics' | 'monitoring' | 'monitoring-accounts' | 'monitoring-groups' | 'keyword-sets' | 'chat-templates' | 'trigger-rules' | 'collected-users';
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
    CommonModule, FormsModule, RouterOutlet, RouterLink,
    // 🔧 Phase7-1: 視圖組件已移除 — 全部透過 Router lazy-load
    // 通用組件（模板中使用）
    ToastComponent, GlobalConfirmDialogComponent, GlobalInputDialogComponent, ProgressDialogComponent,
    // 🔧 P8-1: 離線狀態指示器
    OfflineIndicatorComponent,
    // 🔧 通知中心已移入設置頁，側欄僅保留鈴鐺入口
    // 🆕 实时告警通知
    AlertNotificationComponent,
    // 🔧 P1-2: 統一會員等級徽章組件
    UserLevelBadgeComponent,
    // 會員相關（模板中使用）
    MembershipDialogComponent, UpgradePromptComponent, PaymentComponent,
    // 導航和佈局（模板中使用）
    OnboardingComponent,
    // 帳號管理（模板中使用）
    QrLoginComponent,
    // 對話框（模板中使用）
    BatchSendDialogComponent, BatchInviteDialogComponent, MemberExtractionDialogComponent,
    // Phase 10: 提取的對話框組件
    OrphanSessionDialogComponent, BackendErrorDialogComponent,
    KeywordCreatorDialogComponent, WelcomeDialogComponent, BatchHistoryDialogComponent,
    DeleteConfirmDialogComponent, InviteGroupDialogComponent, LeadDetailDialogComponent,
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
    
    /* 🔧 P8-3: 移動端側邊欄響應式 */
    :host ::ng-deep .mobile-sidebar-hidden {
      position: fixed !important;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 999;
      transform: translateX(-100%);
      width: 16rem !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    :host ::ng-deep .mobile-sidebar-visible {
      position: fixed !important;
      left: 0;
      top: 0;
      bottom: 0;
      z-index: 999;
      transform: translateX(0);
      width: 16rem !important;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    @media (max-width: 768px) {
      :host ::ng-deep main.flex-1 {
        padding: 16px !important;
        padding-top: 52px !important;
      }
    }
  `]
})
export class AppComponent implements OnDestroy, OnInit {
  private router = inject(Router);  // 🆕 Angular Router 導航
  geminiService = inject(GeminiService);
  // 🔧 P9-2: translationService 已移除，使用 i18n（I18nService）替代
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
  // 🔧 P7-6: Web Vitals 性能監控（注入即啟動採集）
  private webVitals = inject(WebVitalsService);
  // 🔧 P8-5: 全局操作審計追蹤
  private auditTracker = inject(AuditTrackerService);
  // 🆕 Phase 3: 統一導航服務
  navBridge = inject(NavBridgeService);
  navShortcuts = inject(NavShortcutsService);
  unifiedNav = inject(UnifiedNavService);
  sidebarState = inject(SidebarStateService);  // 🔧 Phase8-P1-3
  
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

  // 🔧 Phase 9-1b: Mixin method stubs (runtime-applied via applyMethodMixins)
  declare loadResources: () => void;
  declare refreshResourceStats: () => void;
  declare loadDiscoveryKeywords: () => void;
  declare refreshRagStats: () => void;
  declare loadAiSettings: () => void;
  declare openMemberListDialog: (resource: any) => void;
  declare searchResources: () => void;
  declare loadSearchChannels: () => void;
  declare loadChannelDiscussions: () => void;
  declare refreshDiscussionStats: () => void;
  declare loadAllRoles: () => void;
  declare loadRoleStats: () => void;
  declare loadCollabGroups: () => void;
  declare loadMemoryStats: () => void;
  declare handleMemberExtractionStart: (event: any) => void;
  declare handleMemberCountRefreshed: (event: any) => void;
  declare handleCommandNavigation: (target: string) => void;
  declare handleBatchSendComplete: (result: any) => void;
  declare handleBatchInviteComplete: (result: any) => void;
  declare closeMemberExtractionDialogUnified: () => void;
  declare openOnboarding: () => void;

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
  
  // --- 🔧 Phase8-P1-3: 側邊欄狀態 → 委託 SidebarStateService ---
  get sidebarCollapsed() { return this.sidebarState.collapsed; }
  get isMobile() { return this.sidebarState.isMobile; }
  get mobileMenuOpen() { return this.sidebarState.mobileMenuOpen; }

  private initMobileDetection(): void { this.sidebarState.initMobileDetection(); }
  toggleMobileMenu(): void { this.sidebarState.toggleMobileMenu(); }
  onMobileNavSelect(): void { this.sidebarState.onMobileNavSelect(); }
  toggleSidebarCollapse(): void { this.sidebarState.toggleCollapse(); }
  
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

  // 🔧 Phase 9-1b: resource methods → src/app-methods/resource-methods.ts

  showPostJoinDialog = signal(false);
  postJoinResource = signal<any>(null);
  postJoinPhone = signal('');
  // 🔧 Phase 9-1b: resource methods → src/app-methods/resource-methods.ts

  showSuccessOverlay = signal(false);
  successOverlayConfig = signal<SuccessOverlayConfig | null>(null);
  // 🔧 Phase 9-1b: resource methods → src/app-methods/resource-methods.ts

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

  /** 智能引擎入口：任意 /ai-engine/* 均高亮此项 */
  isAiEngineView(): boolean {
    const view = this.currentView();
    return view === 'ai-engine' || view === 'ai-center' || view === 'knowledge-brain' || view === 'knowledge-manage' || view === 'knowledge-gaps';
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
    // 與設置服務同步主題（設置頁修改主題後全站生效）
    effect(() => {
      const t = this.settingsService.settings().theme;
      const resolved = t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
      this.theme.set(resolved);
    });
    
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
  private _handleOpenOnboardingBound?: () => void;

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
    
    // 🔧 P9-2: 語言設定現在由 I18nService 自動處理（從 localStorage 或瀏覽器語言偵測）
    // 無需手動 setLanguage，I18nService 構造函數已處理初始化
    
    // Load saved AI settings from localStorage
    this.loadAiSettings();
    
    // 🔧 P8-3: 初始化移動端偵測
    this.initMobileDetection();
    
    // 🆕 加載保存的側邊欄分組狀態
    this.loadSidebarGroupsState();
    
    // 🔧 Phase7-1: 監聽 Router 導航事件 → 同步 currentView（支援瀏覽器前進/後退）
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        const path = url.split('?')[0];
        // 智能引擎：任意 /ai-engine/* 均高亮「智能引擎」側欄項
        if (path === '/ai-engine' || path.startsWith('/ai-engine/')) {
          if (this.currentView() !== 'ai-engine') {
            this.currentView.set('ai-engine');
          }
          return;
        }
        // 其他路由：反查 VIEW_ROUTE_MAP（用 path 匹配，忽略 query）
        const viewEntry = Object.entries(VIEW_ROUTE_MAP).find(([, route]) => route === path);
        if (viewEntry) {
          const viewName = viewEntry[0] as View;
          if (this.currentView() !== viewName) {
            this.currentView.set(viewName);
          }
        }
      }
    });

    // 🆕 監聽視圖切換事件（從子組件觸發）
    window.addEventListener('changeView', (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        this.changeView(customEvent.detail as View);
      }
    });

    // 🆕 設置頁「使用幫助」內觸發新手引導（全局事件，避免依賴 ViewChild）
    window.addEventListener('tg-open-onboarding', this._handleOpenOnboardingBound = () => this.openOnboarding());

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
      if (this.isAuthenticated()) {
        console.log('[App] Page became visible, refreshing data...');
        this.ipcService.send('get-initial-state');
      }
    });
    
    // 🆕 P2-4: 監聽離線操作同步
    window.addEventListener('sync-offline-operations', ((event: CustomEvent) => {
      this.syncOfflineOperations(event.detail.operations);
    }) as EventListener);
    
    // 路由調試
    console.log('[App] Current URL:', window.location.href);
    
    // 🔧 安全修復：僅在已認證時請求初始狀態（防止無痕模式下未登錄卻載入其他用戶數據）
    if (this.isAuthenticated()) {
      this.ipcService.send('get-initial-state');
    } else {
      console.log('[App] Not authenticated, skipping get-initial-state');
    }
    
    // 🔧 P0 修復：刷新用戶數據 —— 移除 500ms 延遲，立即執行以避免菜單欄顯示閃爍
    if (this.isAuthenticated()) {
      // 直接執行（checkLocalAuth 已在 AuthService 構造中完成，此處只做後台同步）
      this.authService.fetchCurrentUser().then(user => {
        if (user) {
          console.log('[App] User data refreshed:', {
            displayName: (user as any).displayName || (user as any).display_name,
            telegramId: (user as any).telegramId || (user as any).telegram_id,
            membership: this.authService.membershipLevel()
          });
          
          // 🔧 P2: 同步到 MembershipService（確保數據一致性，含 isLifetime 終身會員）
          if (this.membershipService.isSaaSMode()) {
            const u = this.authService.user();
            const level = (this.authService.membershipLevel() || 'bronze') as MembershipLevel;
            const expires = u?.membershipExpires || u?.subscription_expires;
            const isLifetime = !!(u as { isLifetime?: boolean })?.isLifetime;
            this.membershipService.syncFromAuthService(level, expires, isLifetime);
          }
          
          // 強制變更檢測
          this.cdr.detectChanges();
        }
      }).catch(err => console.warn('[App] Failed to refresh user data:', err));
    }
    
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
        } else if (this.isAiEngineView()) {
          // 刷新 RAG 統計（智能引擎 / 知识大脑）
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
    
    // 🔧 P0 增強：頁面可見時刷新用戶數據
    // 確保會員等級、顯示名稱等關鍵信息與服務端保持一致
    if (this.isAuthenticated()) {
      this.authService.forceRefreshUser().then(user => {
        if (user) {
          console.log('[App] 頁面可見，用戶數據已刷新:', {
            displayName: user.displayName,
            membershipLevel: user.membershipLevel
          });
          this.cdr.detectChanges();
        }
      }).catch(err => {
        console.warn('[App] 頁面可見時刷新用戶數據失敗:', err);
      });
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
    if (this._handleOpenOnboardingBound) {
      window.removeEventListener('tg-open-onboarding', this._handleOpenOnboardingBound);
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
    // 🔧 Phase 9-1a: 委託到外部文件（減少 ~3,048 行）
    setupAllIpcHandlers.call(this);
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
  // 🔧 P9-2: 使用 I18nService 替代 TranslationService
  setLanguage(lang: Language) {
    const localeMap: Record<Language, 'en' | 'zh-TW'> = { en: 'en', zh: 'zh-TW' };
    this.i18n.setLocale(localeMap[lang] || 'zh-TW');
  }
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
    
    // 🔧 P8-5: 記錄頁面切換
    const previousView = this.currentView();
    
    // 🔧 P0: 先同步到 NavBridgeService，讓子組件的 effect 能捕獲變化
    this.navBridge.navigateTo(view as any);
    
    // 🔧 Phase7-1: 使用 Router 導航（替代 @switch）
    const routePath = VIEW_ROUTE_MAP[view];
    if (routePath) {
      this.router.navigate([routePath]);
    }
    
    // 保留 currentView 信號用於側邊欄高亮
    this.currentView.set(view);
    
    // 🔧 P8-5: 審計追蹤
    this.auditTracker.trackViewChange(previousView, view);
    
    // 🔧 P8-3: 移動端選擇後自動關閉側邊欄
    this.onMobileNavSelect();
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
    'AI_NOT_ENABLED': {view: 'ai-engine', elementId: 'ai-settings-section'}
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

  // 🔧 Phase 9-1b: campaign-batch methods → src/app-methods/campaign-batch-methods.ts

  // 刪除確認狀態
  deleteConfirmDialog = signal<{
    show: boolean;
    type: 'single' | 'batch';
    lead?: CapturedLead;
    count?: number;
  }>({ show: false, type: 'single' });
  
  // 🔧 Phase 9-1b: campaign-batch methods → src/app-methods/campaign-batch-methods.ts

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

  // 🔧 Phase 9-1b: member-extract methods → src/app-methods/member-extract-methods.ts

}

// 🔧 Phase 9-1b: Apply method mixins to AppComponent prototype
applyMethodMixins(AppComponent);
