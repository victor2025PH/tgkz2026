/**
 * TG-AI智控王 Application Routes
 * 應用程式路由配置 - 支援懶加載、守衛和 Resolver
 * 
 * 🆕 Phase 22: 添加路由 Resolver 預加載數據
 * 🆕 P2: 添加認證路由和 SaaS 守衛
 */
import { Routes } from '@angular/router';
import { membershipGuard, aiFeatureGuard } from './guards';
import { authGuard } from './core/auth.guard';
// Resolvers 暫時禁用 - 事件不匹配問題待修復
// import { 
//   dashboardResolver, 
//   accountsResolver, 
//   leadsResolver,
//   monitoringResolver,
//   analyticsResolver,
//   automationResolver,
//   resourceDiscoveryResolver
// } from './resolvers';

export const routes: Routes = [
  // 認證路由（公開）
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  // 簡化路由
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  // ============ 🆕 精簡獲客模式 Shell（Stage 2C） ============
  // 獨立輕量導航外殼，僅承載 6 個核心獲客功能，不依賴巨型 AppComponent 側邊欄
  // 子路由導航皆停留在 /lean/* 之下，重用既有的懶加載視圖組件，不重複實現業務邏輯
  {
    path: 'lean',
    canActivate: [authGuard],
    loadComponent: () => import('./views/lean-shell.component').then(m => m.LeanShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./views/dashboard-view.component').then(m => m.DashboardViewComponent),
        title: '儀表板'
      },
      {
        path: 'accounts',
        loadComponent: () => import('./views/accounts-view.component').then(m => m.AccountsViewComponent),
        title: '帳號管理'
      },
      {
        path: 'search-discovery',
        loadComponent: () => import('./views/resource-discovery-view.component').then(m => m.ResourceDiscoveryViewComponent),
        data: { discoveryMode: 'search-discovery' },
        title: '搜索發現',
        canActivate: [membershipGuard]
      },
      {
        path: 'monitoring',
        loadComponent: () => import('./views/monitoring-view.component').then(m => m.MonitoringViewComponent),
        title: '監控中心'
      },
      {
        path: 'leads',
        loadComponent: () => import('./views/leads-view.component').then(m => m.LeadsViewComponent),
        title: '潛在客戶',
        canActivate: [membershipGuard]
      },
      {
        path: 'settings',
        loadComponent: () => import('./views/settings-view.component').then(m => m.SettingsViewComponent),
        title: '設定'
      }
    ]
  },
  // 核心功能 - SaaS 模式需要登入
  {
    path: 'dashboard',
    loadComponent: () => import('./views/dashboard-view.component').then(m => m.DashboardViewComponent),
    title: '儀表板',
    canActivate: [authGuard]
  },
  {
    path: 'accounts',
    loadComponent: () => import('./views/accounts-view.component').then(m => m.AccountsViewComponent),
    title: '帳號管理',
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./views/settings-view.component').then(m => m.SettingsViewComponent),
    title: '設定',
    canActivate: [authGuard]
  },
  // 用戶設置頁面
  {
    path: 'user-settings',
    loadComponent: () => import('./views/user-settings-view.component').then(m => m.UserSettingsViewComponent),
    title: '用戶設置',
    canActivate: [authGuard]
  },
  // 訂閱升級頁面
  {
    path: 'upgrade',
    loadComponent: () => import('./views/upgrade-view.component').then(m => m.UpgradeViewComponent),
    title: '升級方案',
    canActivate: [authGuard]
  },
  // 配額管理儀表板
  {
    path: 'quota',
    loadComponent: () => import('./views/quota-dashboard-view.component').then(m => m.QuotaDashboardViewComponent),
    title: '配額管理',
    canActivate: [authGuard]
  },
  // 計費管理
  {
    path: 'billing',
    loadComponent: () => import('./views/billing-view.component').then(m => m.BillingViewComponent),
    title: '計費管理',
    canActivate: [authGuard]
  },
  // 支付中心
  {
    path: 'payment',
    loadComponent: () => import('./views/payment-view.component').then(m => m.PaymentViewComponent),
    title: '支付中心',
    canActivate: [authGuard]
  },
  // 🆕 Phase 0: 錢包系統 - 具體路由必須在通用路由之前
  {
    path: 'wallet/recharge',
    loadComponent: () => import('./views/wallet-recharge.component').then(m => m.WalletRechargeComponent),
    title: '充值中心',
    canActivate: [authGuard]
  },
  {
    path: 'wallet/withdraw',
    loadComponent: () => import('./views/wallet-withdraw.component').then(m => m.WalletWithdrawComponent),
    title: '提現',
    canActivate: [authGuard]
  },
  {
    path: 'wallet/transactions',
    loadComponent: () => import('./views/wallet-transactions.component').then(m => m.WalletTransactionsComponent),
    title: '交易記錄',
    canActivate: [authGuard]
  },
  {
    path: 'wallet/orders',
    loadComponent: () => import('./views/wallet-orders.component').then(m => m.WalletOrdersComponent),
    title: '充值訂單',
    canActivate: [authGuard]
  },
  {
    path: 'wallet/analytics',
    loadComponent: () => import('./views/wallet-analytics.component').then(m => m.WalletAnalyticsComponent),
    title: '消費分析',
    canActivate: [authGuard]
  },
  // 錢包主頁放在所有 wallet/* 路由之後
  {
    path: 'wallet',
    pathMatch: 'full',
    loadComponent: () => import('./views/wallet-view.component').then(m => m.WalletViewComponent),
    title: '我的錢包',
    canActivate: [authGuard]
  },
  // 營銷功能 - 需要會員權限
  {
    path: 'leads',
    loadComponent: () => import('./views/leads-view.component').then(m => m.LeadsViewComponent),
    title: '潛在客戶',
    canActivate: [membershipGuard]
  },
  {
    path: 'automation',
    loadComponent: () => import('./views/automation-view.component').then(m => m.AutomationViewComponent),
    title: '自動化中心',
    canActivate: [membershipGuard]
  },
  {
    path: 'resource-discovery',
    loadComponent: () => import('./views/resource-discovery-view.component').then(m => m.ResourceDiscoveryViewComponent),
    title: '資源中心',
    data: { discoveryMode: 'resource-center' },
    canActivate: [membershipGuard]
  },
  {
    path: 'search-discovery',
    loadComponent: () => import('./views/resource-discovery-view.component').then(m => m.ResourceDiscoveryViewComponent),
    title: '搜索發現',
    data: { discoveryMode: 'search-discovery' },
    canActivate: [membershipGuard]
  },
  // ============ 🆕 重構後的核心模塊 ============
  
  // 營銷任務中心（策略規劃 = 快速啟動）
  {
    path: 'marketing-hub',
    loadComponent: () => import('./views/smart-marketing-view.component').then(m => m.SmartMarketingViewComponent),
    title: '策略規劃',
    data: { hubMode: 'strategy' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  // 營銷任務中心 - 自動執行（任務列表）
  {
    path: 'marketing-hub/execution',
    loadComponent: () => import('./views/smart-marketing-view.component').then(m => m.SmartMarketingViewComponent),
    title: '自動執行',
    data: { hubMode: 'execution' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  // 角色資源庫（原多角色協作的資產部分）
  {
    path: 'role-library',
    loadComponent: () => import('./views/multi-role-view.component').then(m => m.MultiRoleViewComponent),
    title: '角色資源庫',
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  // 智能引擎（原 AI 中心的配置部分）
  {
    path: 'ai-engine',
    loadComponent: () => import('./views/ai-center-view.component').then(m => m.AiCenterViewComponent),
    title: '智能引擎',
    data: { enginePanel: 'default' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  // 知识大脑 - 总览 / 知识管理 / 知识缺口（独立 URL 以正确高亮与切 Tab）
  {
    path: 'ai-engine/overview',
    loadComponent: () => import('./views/ai-center-view.component').then(m => m.AiCenterViewComponent),
    title: '知识大脑总览',
    data: { enginePanel: 'overview' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  {
    path: 'ai-engine/knowledge',
    loadComponent: () => import('./views/ai-center-view.component').then(m => m.AiCenterViewComponent),
    title: '知识管理',
    data: { enginePanel: 'knowledge' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  {
    path: 'ai-engine/gaps',
    loadComponent: () => import('./views/ai-center-view.component').then(m => m.AiCenterViewComponent),
    title: '知识缺口',
    data: { enginePanel: 'gaps' },
    canActivate: [membershipGuard, aiFeatureGuard]
  },
  
  // ============ 舊路由（保持兼容，重定向到新模塊） ============
  {
    path: 'ai-center',
    redirectTo: 'ai-engine',
    pathMatch: 'full'
  },
  {
    path: 'multi-role',
    redirectTo: 'role-library',
    pathMatch: 'full'
  },
  {
    path: 'smart-marketing',
    redirectTo: 'marketing-hub',
    pathMatch: 'full'
  },
  // 數據分析 - 需要高級會員
  {
    path: 'analytics',
    loadComponent: () => import('./views/analytics-view.component').then(m => m.AnalyticsViewComponent),
    title: '數據分析',
    canActivate: [membershipGuard]
  },
  // 系統功能 - 無權限限制
  {
    path: 'monitoring',
    loadComponent: () => import('./views/monitoring-view.component').then(m => m.MonitoringViewComponent),
    title: '監控中心'
  },
  // 向下兼容舊路由（重定向到設置頁）
  {
    path: 'performance',
    redirectTo: 'settings',
    pathMatch: 'full'
  },
  {
    path: 'alerts',
    redirectTo: 'settings',
    pathMatch: 'full'
  },
  // 404 fallback
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

/**
 * 視圖名稱到路由路徑的映射
 * 用於與現有 currentView signal 兼容
 */
/**
 * 視圖名稱到路由路徑的映射
 * 🆕 重構：添加新模塊路由，保持舊路由兼容
 */
/**
 * 🔧 Phase7-1: 完整的視圖→路由映射表
 * changeView() 使用此表進行 Router 導航
 * NavBridgeService 負責子標籤切換
 */
export const VIEW_ROUTE_MAP: Record<string, string> = {
  // ============ 核心 ============
  'dashboard': '/dashboard',
  'accounts': '/accounts',
  'add-account': '/accounts',
  'add-account-advanced': '/accounts',
  'api-credentials': '/accounts',
  'settings': '/settings',
  'user-settings': '/user-settings',
  'profile': '/user-settings',
  'membership-center': '/upgrade',
  
  // ============ 錢包系統 ============
  'wallet': '/wallet',
  'wallet-transactions': '/wallet/transactions',
  'wallet-recharge': '/wallet/recharge',
  'wallet-orders': '/wallet/orders',
  'wallet-analytics': '/wallet/analytics',
  'wallet-withdraw': '/wallet/withdraw',
  
  // ============ 營銷任務中心 ============
  'marketing-hub': '/marketing-hub',
  'marketing-tasks': '/marketing-hub',
  'marketing-monitor': '/marketing-hub',
  'marketing-report': '/marketing-hub',
  'ai-assistant': '/marketing-hub',
  'ai-team': '/marketing-hub/execution',
  'ads': '/automation',
  'campaigns': '/automation',
  
  // ============ 角色資源庫 ============
  'role-library': '/role-library',
  'role-store': '/role-library',
  'my-roles': '/role-library',
  'scene-templates': '/role-library',
  'script-editor': '/role-library',
  'multi-role': '/role-library',
  
  // ============ 智能引擎 ============
  'ai-engine': '/ai-engine',
  'ai-center': '/ai-engine',
  'ai-models': '/ai-engine',
  'ai-brain': '/ai-engine',
  'ai-persona': '/ai-engine',
  'knowledge-brain': '/ai-engine/overview',
  'knowledge-gaps': '/ai-engine/gaps',
  'knowledge-manage': '/ai-engine/knowledge',
  
  // ============ 觸發監控 ============
  'automation': '/automation',
  'monitoring': '/monitoring',
  'monitoring-accounts': '/monitoring',
  'monitoring-groups': '/monitoring',
  'keyword-sets': '/monitoring',
  'trigger-rules': '/monitoring',
  'chat-templates': '/monitoring',
  'collected-users': '/monitoring',
  
  // ============ 資源發現 ============
  'resource-discovery': '/resource-discovery',
  'resources': '/resource-discovery',
  'resource-center': '/resource-discovery',
  'search-discovery': '/search-discovery',
  
  // ============ 客戶管理 ============
  'leads': '/leads',
  'lead-nurturing': '/leads',
  'member-database': '/leads',
  'user-tracking': '/leads',
  'nurturing-analytics': '/analytics',
  
  // ============ 數據分析 ============
  'analytics': '/analytics',
  'analytics-center': '/analytics',
  
  // ============ 系統/兼容 ============
  'performance': '/settings',
  'alerts': '/settings',
  'runtime-logs': '/settings',
  'logs': '/settings',
  'smart-marketing': '/marketing-hub',
  'billing': '/billing',
  'upgrade': '/upgrade',
  'quota': '/quota',
  'payment': '/payment',
};

/**
 * 路由路徑到視圖名稱的映射
 */
export const ROUTE_VIEW_MAP: Record<string, string> = Object.entries(VIEW_ROUTE_MAP)
  .reduce((acc, [view, route]) => {
    acc[route] = view;
    return acc;
  }, {} as Record<string, string>);
