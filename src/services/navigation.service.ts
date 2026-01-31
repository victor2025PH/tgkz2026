/**
 * Navigation Service
 * 導航服務 - 統一管理視圖切換和路由
 * 
 * 🆕 Phase 19: 為 Angular Router 遷移做準備
 * 
 * 功能：
 * - 統一的視圖切換 API
 * - 會員權限檢查
 * - 導航歷史管理
 * - 與 Angular Router 兼容
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MembershipService } from '../membership.service';
import { ToastService } from '../toast.service';

// 視圖類型定義
export type ViewType = 
  | 'dashboard' 
  | 'accounts' 
  | 'add-account' 
  | 'api-credentials'
  | 'resources' 
  | 'member-database' 
  | 'resource-center' 
  | 'search-discovery'
  | 'ai-assistant'
  | 'automation'
  | 'leads'
  | 'lead-nurturing'
  | 'nurturing-analytics'
  | 'ads'
  | 'user-tracking'
  | 'campaigns'
  | 'multi-role'
  | 'ai-team'
  | 'ai-center'
  | 'settings'
  | 'analytics'
  | 'analytics-center'
  | 'profile'
  | 'membership-center'
  | 'monitoring-accounts'
  | 'monitoring-groups'
  | 'keyword-sets'
  | 'chat-templates'
  | 'trigger-rules'
  | 'collected-users';

// 視圖配置
interface ViewConfig {
  path: string;
  title: string;
  icon: string;
  requiredFeature?: string;
  membershipLevel?: string;
  membershipMessage?: string;
}

// 視圖到路由路徑的映射
const VIEW_CONFIG: Record<ViewType, ViewConfig> = {
  'dashboard': { path: '/dashboard', title: '儀表板', icon: '🏠' },
  'accounts': { path: '/accounts', title: '帳號管理', icon: '👥' },
  'add-account': { path: '/accounts/add', title: '添加帳號', icon: '➕' },
  'api-credentials': { path: '/accounts/api', title: 'API 憑證', icon: '🔑' },
  'resources': { path: '/resources', title: '資源管理', icon: '📦' },
  'member-database': { path: '/member-database', title: '成員資料庫', icon: '📊' },
  'resource-center': { path: '/resource-center', title: '資源中心', icon: '🏢' },
  'search-discovery': { path: '/search-discovery', title: '資源發現', icon: '🔍' },
  'ai-assistant': { 
    path: '/ai-assistant', 
    title: 'AI 策略規劃', 
    icon: '🤖',
    requiredFeature: 'strategyPlanning',
    membershipLevel: 'diamond',
    membershipMessage: '💎 AI策略規劃需要 鑽石王牌 或以上會員'
  },
  'automation': { path: '/automation', title: '自動化中心', icon: '⚙️' },
  'leads': { path: '/leads', title: '潛在客戶', icon: '🎯' },
  'lead-nurturing': { path: '/lead-nurturing', title: '線索培育', icon: '🌱' },
  'nurturing-analytics': { path: '/nurturing-analytics', title: '培育分析', icon: '📈' },
  'ads': { 
    path: '/ads', 
    title: '廣告發送', 
    icon: '📢',
    requiredFeature: 'adBroadcast',
    membershipLevel: 'silver',
    membershipMessage: '🥈 廣告發送功能需要 白銀精英 或以上會員'
  },
  'user-tracking': { 
    path: '/user-tracking', 
    title: '用戶追蹤', 
    icon: '👤',
    requiredFeature: 'advancedAnalytics',
    membershipLevel: 'diamond',
    membershipMessage: '💎 用戶追蹤功能需要 鑽石王牌 或以上會員'
  },
  'campaigns': { 
    path: '/campaigns', 
    title: '營銷活動', 
    icon: '🚀',
    requiredFeature: 'aiSalesFunnel',
    membershipLevel: 'diamond',
    membershipMessage: '💎 營銷活動功能需要 鑽石王牌 或以上會員'
  },
  'multi-role': { 
    path: '/multi-role', 
    title: '多角色協作', 
    icon: '🎭',
    requiredFeature: 'multiRole',
    membershipLevel: 'diamond',
    membershipMessage: '💎 多角色協作功能需要 鑽石王牌 或以上會員'
  },
  'ai-team': { 
    path: '/ai-team', 
    title: 'AI 團隊銷售', 
    icon: '🤝',
    requiredFeature: 'autoExecution',
    membershipLevel: 'diamond',
    membershipMessage: '💎 AI團隊銷售需要 鑽石王牌 或以上會員'
  },
  'ai-center': { path: '/ai-center', title: 'AI 中心', icon: '🧠' },
  'settings': { path: '/settings', title: '設定', icon: '⚙️' },
  'analytics': { 
    path: '/analytics', 
    title: '數據洞察', 
    icon: '📊',
    requiredFeature: 'dataInsightsBasic',
    membershipLevel: 'gold',
    membershipMessage: '🥇 數據洞察功能需要 黃金大師 或以上會員'
  },
  'analytics-center': { 
    path: '/analytics-center', 
    title: '數據分析中心', 
    icon: '📉',
    requiredFeature: 'dataInsightsBasic',
    membershipLevel: 'gold',
    membershipMessage: '🥇 數據分析功能需要 黃金大師 或以上會員'
  },
  'profile': { path: '/profile', title: '個人資料', icon: '👤' },
  'membership-center': { path: '/membership', title: '會員中心', icon: '⭐' },
  'monitoring-accounts': { path: '/monitoring/accounts', title: '監控帳號', icon: '👁️' },
  'monitoring-groups': { path: '/monitoring/groups', title: '監控群組', icon: '👁️' },
  'keyword-sets': { path: '/monitoring/keywords', title: '關鍵詞集', icon: '🔤' },
  'chat-templates': { path: '/monitoring/templates', title: '聊天模板', icon: '💬' },
  'trigger-rules': { path: '/monitoring/triggers', title: '觸發規則', icon: '⚡' },
  'collected-users': { path: '/monitoring/users', title: '收集用戶', icon: '👥' }
};

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  
  // 當前視圖（保持與現有代碼兼容）
  readonly currentView = signal<ViewType>('dashboard');
  
  // 導航歷史
  private _history: ViewType[] = ['dashboard'];
  readonly history = signal<ViewType[]>(['dashboard']);
  
  // 計算屬性
  readonly currentViewConfig = computed(() => VIEW_CONFIG[this.currentView()]);
  readonly canGoBack = computed(() => this._history.length > 1);
  
  // 事件回調（用於與現有代碼集成）
  private onNavigateCallbacks: ((view: ViewType) => void)[] = [];
  
  /**
   * 導航到指定視圖
   * @param view 目標視圖
   * @param options 導航選項
   * @returns 是否成功導航
   */
  navigate(view: ViewType, options?: { skipHistory?: boolean; skipPermissionCheck?: boolean }): boolean {
    // 權限檢查
    if (!options?.skipPermissionCheck) {
      const config = VIEW_CONFIG[view];
      if (config?.requiredFeature && !this.membershipService.hasFeature(config.requiredFeature as any)) {
        this.toastService.warning(config.membershipMessage || '此功能需要升級會員');
        window.dispatchEvent(new CustomEvent('open-membership-dialog'));
        return false;
      }
    }
    
    // 更新當前視圖
    const previousView = this.currentView();
    this.currentView.set(view);
    
    // 更新歷史
    if (!options?.skipHistory && view !== previousView) {
      this._history.push(view);
      if (this._history.length > 50) {
        this._history = this._history.slice(-50);
      }
      this.history.set([...this._history]);
    }
    
    // 觸發回調
    this.onNavigateCallbacks.forEach(cb => cb(view));
    
    return true;
  }
  
  /**
   * 返回上一個視圖
   */
  goBack(): boolean {
    if (this._history.length > 1) {
      this._history.pop();
      const previousView = this._history[this._history.length - 1];
      this.currentView.set(previousView);
      this.history.set([...this._history]);
      return true;
    }
    return false;
  }
  
  /**
   * 返回首頁
   */
  goHome(): void {
    this.navigate('dashboard');
  }
  
  /**
   * 註冊導航回調
   */
  onNavigate(callback: (view: ViewType) => void): () => void {
    this.onNavigateCallbacks.push(callback);
    return () => {
      const index = this.onNavigateCallbacks.indexOf(callback);
      if (index > -1) {
        this.onNavigateCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * 獲取視圖配置
   */
  getViewConfig(view: ViewType): ViewConfig | undefined {
    return VIEW_CONFIG[view];
  }
  
  /**
   * 獲取所有視圖配置
   */
  getAllViewConfigs(): Record<ViewType, ViewConfig> {
    return VIEW_CONFIG;
  }
  
  /**
   * 檢查視圖是否可用（權限檢查）
   */
  isViewAvailable(view: ViewType): boolean {
    const config = VIEW_CONFIG[view];
    if (!config?.requiredFeature) return true;
    return this.membershipService.hasFeature(config.requiredFeature as any);
  }
  
  /**
   * 獲取視圖的路由路徑
   */
  getViewPath(view: ViewType): string {
    return VIEW_CONFIG[view]?.path || '/dashboard';
  }
  
  /**
   * 從路由路徑獲取視圖名稱
   */
  getViewFromPath(path: string): ViewType | undefined {
    for (const [view, config] of Object.entries(VIEW_CONFIG)) {
      if (config.path === path) {
        return view as ViewType;
      }
    }
    return undefined;
  }
}
