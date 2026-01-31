/**
 * 統一導航服務
 * Unified Navigation Service
 * 
 * 將 30+ 個視圖整合為 5 個核心模塊
 * 提供結構化的導航配置
 */

import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

/** 視圖 ID */
export type ViewId = 
  // 儀表板
  | 'dashboard'
  // 帳號管理
  | 'accounts' | 'add-account' | 'api-credentials' | 'monitoring-accounts'
  // 🆕 營銷任務中心（核心入口）
  | 'marketing-hub' | 'marketing-tasks' | 'marketing-monitor' | 'marketing-settings'
  // 🆕 P2: 營銷報表
  | 'marketing-report'
  // 自動化（觸發器）
  | 'automation' | 'automation-legacy' | 'monitoring-groups' | 'keyword-sets' 
  | 'chat-templates' | 'trigger-rules' | 'collected-users'
  // 客戶管理
  | 'leads' | 'lead-nurturing' | 'nurturing-analytics' | 'member-database' | 'user-tracking'
  // 🆕 角色資源庫（原多角色協作）
  | 'role-library' | 'role-store' | 'my-roles' | 'scene-templates' | 'script-editor'
  // 🆕 知識大腦（獨立模塊）
  | 'ai-brain' | 'knowledge-manage' | 'knowledge-import' | 'knowledge-gaps' | 'knowledge-settings'
  // 🆕 智能引擎（簡化）
  | 'ai-engine' | 'ai-models' | 'ai-persona' | 'ai-usage'
  // 營銷（舊）- 保留兼容
  | 'ads' | 'campaigns' | 'multi-role' | 'ai-team'
  // AI 中心（舊）- 保留兼容
  | 'ai-center' | 'ai-assistant'
  // 資源
  | 'resources' | 'resource-center' | 'search-discovery'
  // 分析
  | 'analytics' | 'analytics-center' | 'performance'
  // 系統
  | 'settings' | 'profile' | 'membership-center';

/** 模塊 ID */
export type ModuleId = 
  | 'dashboard' 
  | 'accounts' 
  | 'marketing-hub'  // 🆕 營銷任務中心（核心）
  | 'role-library'   // 🆕 角色資源庫
  | 'knowledge-hub'  // 🆕 知識大腦（獨立）
  | 'ai-engine'      // 🆕 智能引擎（簡化）
  | 'automation'     // 觸發器/監控
  | 'contacts' 
  | 'analytics' 
  | 'system'
  // 舊模塊（保留兼容）
  | 'marketing' 
  | 'ai';

/** 導航項目 */
export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  description?: string;
  shortcut?: string;
  badge?: number;
  hidden?: boolean;
}

/** 導航模塊 */
export interface NavModule {
  id: ModuleId;
  label: string;
  icon: string;
  description: string;
  color: string;
  views: NavItem[];
  defaultView: ViewId;
}

// ============ 導航配置 ============

/**
 * 🆕 重構後的導航結構
 * 
 * 核心變化：
 * 1. 營銷任務中心 - 成為核心入口，整合原有的"多角色協作"和"AI中心"的執行功能
 * 2. 角色資源庫 - 專注於角色定義和劇本管理（原"多角色協作"的資產部分）
 * 3. 智能引擎 - 專注於 AI 配置（原"AI中心"的配置部分）
 * 4. 觸發監控 - 自動化觸發器和監控規則
 */
export const NAV_MODULES: NavModule[] = [
  {
    id: 'dashboard',
    label: '儀表板',
    icon: '📊',
    description: '系統總覽和快速操作',
    color: 'from-cyan-500 to-blue-500',
    defaultView: 'dashboard',
    views: [
      { id: 'dashboard', label: '總覽', icon: '📊', shortcut: 'D' }
    ]
  },
  {
    id: 'accounts',
    label: '帳號管理',
    icon: '👤',
    description: '管理 Telegram 帳號和 API 設置',
    color: 'from-purple-500 to-pink-500',
    defaultView: 'accounts',
    views: [
      { id: 'accounts', label: '帳號列表', icon: '👤', description: '查看和管理所有帳號', shortcut: 'A' },
      { id: 'add-account', label: '添加帳號', icon: '➕', description: '添加新的 Telegram 帳號' },
      { id: 'api-credentials', label: 'API 憑證', icon: '🔑', description: '管理 API ID 和 Hash' },
    ]
  },
  // 🆕 營銷任務中心（核心入口）
  {
    id: 'marketing-hub',
    label: '營銷任務中心',
    icon: '🚀',
    description: '一鍵啟動營銷任務，AI 自動執行',
    color: 'from-purple-500 to-pink-500',
    defaultView: 'marketing-hub',
    views: [
      { id: 'marketing-hub', label: '快速啟動', icon: '🚀', description: '選擇目標，一鍵啟動', shortcut: 'M' },
      { id: 'marketing-tasks', label: '任務列表', icon: '📋', description: '管理所有營銷任務' },
      { id: 'marketing-monitor', label: '效果監控', icon: '📈', description: '實時查看轉化效果' },
    ]
  },
  // 🆕 角色資源庫
  {
    id: 'role-library',
    label: '角色資源庫',
    icon: '🎭',
    description: '管理角色定義和劇本模板',
    color: 'from-amber-500 to-orange-500',
    defaultView: 'role-store',
    views: [
      { id: 'role-store', label: '角色庫', icon: '🎭', description: '50+ 預設角色' },
      { id: 'my-roles', label: '我的角色', icon: '👤', description: '自定義角色' },
      { id: 'scene-templates', label: '場景模板', icon: '🎬', description: '預設場景配置' },
      { id: 'script-editor', label: '劇本編排', icon: '📝', description: '編輯對話劇本' },
    ]
  },
  // 🆕 P1-1: 知識大腦獨立菜單
  {
    id: 'knowledge-hub' as ModuleId,
    label: '知識大腦',
    icon: '🧠',
    description: '知識庫管理和 AI 學習',
    color: 'from-pink-500 to-rose-500',
    defaultView: 'ai-brain',
    views: [
      { id: 'ai-brain', label: '知識總覽', icon: '🧠', description: '知識庫統計和健康度', shortcut: 'K' },
      { id: 'knowledge-manage' as ViewId, label: '知識管理', icon: '📝', description: '查看和編輯知識' },
      { id: 'knowledge-import' as ViewId, label: '導入知識', icon: '📥', description: '對話/文檔/網頁導入' },
      { id: 'knowledge-gaps' as ViewId, label: '知識缺口', icon: '❓', description: '待補充的問題' },
      { id: 'knowledge-settings' as ViewId, label: '知識設置', icon: '⚙️', description: 'RAG 配置' },
    ]
  },
  // 🆕 智能引擎（簡化版）
  {
    id: 'ai-engine',
    label: '智能引擎',
    icon: '🤖',
    description: 'AI 模型和人格配置',
    color: 'from-indigo-500 to-violet-500',
    defaultView: 'ai-models',
    views: [
      { id: 'ai-models', label: '模型配置', icon: '🤖', description: '選擇和配置 AI 模型', shortcut: 'I' },
      { id: 'ai-persona', label: '人格設置', icon: '💬', description: 'AI 說話風格和人格' },
      { id: 'ai-usage' as ViewId, label: '使用統計', icon: '📊', description: 'AI 調用統計' },
    ]
  },
  // 觸發監控（原自動化）
  {
    id: 'automation',
    label: '觸發監控',
    icon: '📡',
    description: '設置觸發規則和監控',
    color: 'from-emerald-500 to-teal-500',
    defaultView: 'monitoring-groups',
    views: [
      { id: 'monitoring-groups', label: '監控群組', icon: '👥', description: '管理監控的群組' },
      { id: 'keyword-sets', label: '關鍵詞集', icon: '🔍', description: '設置觸發關鍵詞' },
      { id: 'trigger-rules', label: '觸發規則', icon: '🎯', description: '配置觸發條件和動作' },
      { id: 'chat-templates', label: '聊天模板', icon: '💬', description: '預設回覆模板' },
      { id: 'collected-users', label: '收集用戶', icon: '📥', description: '自動收集的用戶' },
    ]
  },
  // 客戶管理
  {
    id: 'contacts',
    label: '客戶管理',
    icon: '📋',
    description: '管理潛在客戶和用戶數據',
    color: 'from-sky-500 to-cyan-500',
    defaultView: 'leads',
    views: [
      { id: 'leads', label: '線索管理', icon: '📋', description: '管理所有潛在客戶', shortcut: 'L' },
      { id: 'lead-nurturing', label: '線索培育', icon: '🌱', description: 'AI 驅動的客戶培育' },
      { id: 'member-database', label: '成員數據庫', icon: '🗄️', description: '群組成員管理' },
      { id: 'user-tracking', label: '用戶追蹤', icon: '📍', description: '追蹤高價值用戶' },
    ]
  },
  // 數據分析
  {
    id: 'analytics',
    label: '數據分析',
    icon: '📈',
    description: '查看統計和報告',
    color: 'from-rose-500 to-red-500',
    defaultView: 'analytics',
    views: [
      { id: 'analytics', label: '數據總覽', icon: '📈', description: '關鍵指標概覽' },
      { id: 'marketing-report' as ViewId, label: '營銷報表', icon: '📊', description: '角色組合效果分析', shortcut: 'R' },
      { id: 'analytics-center', label: '分析中心', icon: '📊', description: '深度數據分析' },
      { id: 'performance', label: '性能監控', icon: '⚡', description: '系統性能指標' },
      { id: 'search-discovery', label: '資源發現', icon: '🔭', description: '發現新群組和用戶' },
    ]
  },
  // 系統設置
  {
    id: 'system',
    label: '系統設置',
    icon: '⚙️',
    description: '系統配置和日誌',
    color: 'from-slate-500 to-gray-500',
    defaultView: 'settings',
    views: [
      { id: 'settings', label: '系統設置', icon: '⚙️', description: '全局設置', shortcut: 'S' },
      { id: 'profile', label: '個人資料', icon: '👤', description: '用戶資料' },
      { id: 'membership-center', label: '會員中心', icon: '💎', description: '訂閱管理' },
    ]
  },
  // ============ 舊模塊（保持兼容，hidden） ============
  {
    id: 'marketing',
    label: '營銷中心',
    icon: '📢',
    description: '（已整合到營銷任務中心）',
    color: 'from-rose-500 to-red-500',
    defaultView: 'ads',
    views: [
      { id: 'ads', label: '廣告發送', icon: '📢', description: '批量發送廣告', hidden: true },
      { id: 'campaigns', label: '營銷活動', icon: '🎪', description: '管理營銷活動', hidden: true },
      { id: 'multi-role', label: '多角色協作', icon: '🎭', description: '已移至角色資源庫', hidden: true },
    ]
  },
  {
    id: 'ai',
    label: 'AI 中心',
    icon: '🧠',
    description: '（已整合到智能引擎）',
    color: 'from-indigo-500 to-violet-500',
    defaultView: 'ai-center',
    views: [
      { id: 'ai-center', label: 'AI 對話', icon: '🧠', description: '已移至智能引擎', hidden: true },
      { id: 'ai-assistant', label: 'AI 助手', icon: '✨', description: '營銷內容助手', hidden: true },
    ]
  },
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class UnifiedNavService {
  
  // 當前活躍視圖
  private _currentView = signal<ViewId>('dashboard');
  currentView = this._currentView.asReadonly();
  
  // 導航歷史
  private _history: ViewId[] = [];
  private readonly MAX_HISTORY = 20;
  
  // 計算屬性
  modules = NAV_MODULES;
  
  currentModule = computed(() => {
    const view = this._currentView();
    return NAV_MODULES.find(m => m.views.some(v => v.id === view)) || NAV_MODULES[0];
  });
  
  currentNavItem = computed(() => {
    const view = this._currentView();
    for (const module of NAV_MODULES) {
      const item = module.views.find(v => v.id === view);
      if (item) return item;
    }
    return null;
  });
  
  // 麵包屑
  breadcrumbs = computed(() => {
    const module = this.currentModule();
    const item = this.currentNavItem();
    
    if (!module || !item) return [];
    
    if (module.id === 'dashboard') {
      return [{ label: '首頁', icon: '🏠' }];
    }
    
    return [
      { label: module.label, icon: module.icon, view: module.defaultView },
      { label: item.label, icon: item.icon }
    ];
  });
  
  /**
   * 導航到視圖
   */
  navigateTo(view: ViewId): void {
    const previous = this._currentView();
    
    // 添加到歷史
    if (previous !== view) {
      this._history.push(previous);
      if (this._history.length > this.MAX_HISTORY) {
        this._history.shift();
      }
    }
    
    this._currentView.set(view);
  }
  
  /**
   * 返回上一個視圖
   */
  goBack(): boolean {
    if (this._history.length === 0) {
      return false;
    }
    
    const previous = this._history.pop();
    if (previous) {
      this._currentView.set(previous);
      return true;
    }
    return false;
  }
  
  /**
   * 導航到模塊默認視圖
   */
  navigateToModule(moduleId: ModuleId): void {
    const module = NAV_MODULES.find(m => m.id === moduleId);
    if (module) {
      this.navigateTo(module.defaultView);
    }
  }
  
  /**
   * 獲取模塊的所有可見視圖
   */
  getModuleViews(moduleId: ModuleId): NavItem[] {
    const module = NAV_MODULES.find(m => m.id === moduleId);
    if (!module) return [];
    return module.views.filter(v => !v.hidden);
  }
  
  /**
   * 獲取視圖所屬模塊
   */
  getViewModule(viewId: ViewId): NavModule | null {
    return NAV_MODULES.find(m => m.views.some(v => v.id === viewId)) || null;
  }
  
  /**
   * 搜索視圖
   */
  searchViews(query: string): NavItem[] {
    if (!query) return [];
    
    const lowerQuery = query.toLowerCase();
    const results: NavItem[] = [];
    
    for (const module of NAV_MODULES) {
      for (const view of module.views) {
        if (
          view.label.toLowerCase().includes(lowerQuery) ||
          view.description?.toLowerCase().includes(lowerQuery)
        ) {
          results.push(view);
        }
      }
    }
    
    return results;
  }
  
  /**
   * 獲取快捷鍵映射
   */
  getShortcuts(): Map<string, ViewId> {
    const shortcuts = new Map<string, ViewId>();
    
    for (const module of NAV_MODULES) {
      for (const view of module.views) {
        if (view.shortcut) {
          shortcuts.set(view.shortcut.toLowerCase(), view.id);
        }
      }
    }
    
    return shortcuts;
  }
  
  /**
   * 設置視圖徽章
   */
  setBadge(viewId: ViewId, count: number): void {
    for (const module of NAV_MODULES) {
      const view = module.views.find(v => v.id === viewId);
      if (view) {
        view.badge = count;
        break;
      }
    }
  }
  
  /**
   * 清除徽章
   */
  clearBadge(viewId: ViewId): void {
    this.setBadge(viewId, 0);
  }
}
