/**
 * 導航橋接服務
 * Navigation Bridge Service
 * 
 * 連接現有的 app.component 視圖系統和新的 UnifiedNavService
 * 提供漸進式遷移路徑
 */

import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { UnifiedNavService, ViewId, ModuleId, NAV_MODULES, NavModule } from '../components/unified-nav.service';

/**
 * 舊視圖類型（與 app.component.ts 中的 View 類型保持一致）
 */
export type LegacyView = 
  | 'home' | 'dashboard' | 'accounts' | 'add-account' | 'api-credentials' 
  | 'resources' | 'member-database' | 'resource-center' | 'search-discovery' 
  | 'ai-assistant' | 'automation' | 'automation-legacy' 
  | 'leads' | 'lead-nurturing' | 'nurturing-analytics' 
  | 'ads' | 'user-tracking' | 'campaigns' | 'multi-role' | 'ai-team' 
  | 'ai-engine' | 'ai-center' | 'knowledge-brain' | 'knowledge-manage' | 'knowledge-gaps'
  | 'settings' | 'analytics' | 'analytics-center' 
  | 'logs' | 'performance' | 'alerts' | 'profile' | 'membership-center'
  | 'monitoring-accounts' | 'monitoring-groups' | 'keyword-sets' 
  | 'chat-templates' | 'trigger-rules' | 'collected-users'
  | 'messages';

@Injectable({
  providedIn: 'root'
})
export class NavBridgeService {
  private unifiedNav = inject(UnifiedNavService);
  
  // 當前視圖（與舊系統兼容）
  private _currentView = signal<LegacyView>('dashboard');
  currentView = this._currentView.asReadonly();
  
  // 同步標誌
  private _syncing = false;
  
  constructor() {
    // 監聽 UnifiedNavService 的變化並同步到本地
    effect(() => {
      const unifiedView = this.unifiedNav.currentView();
      if (!this._syncing && this.isValidLegacyView(unifiedView)) {
        this._currentView.set(unifiedView as LegacyView);
      }
    });
  }
  
  /**
   * 設置當前視圖（供舊系統使用）
   */
  setView(view: LegacyView): void {
    this._syncing = true;
    try {
      this._currentView.set(view);
      // 同步到 UnifiedNavService
      if (this.isValidViewId(view)) {
        this.unifiedNav.navigateTo(view as ViewId);
      }
    } finally {
      this._syncing = false;
    }
  }
  
  /**
   * 導航到視圖
   */
  navigateTo(view: LegacyView): void {
    this.setView(view);
  }
  
  /**
   * 返回上一頁
   */
  goBack(): boolean {
    return this.unifiedNav.goBack();
  }
  
  /**
   * 獲取當前模塊
   */
  getCurrentModule(): NavModule {
    return this.unifiedNav.currentModule();
  }
  
  /**
   * 獲取麵包屑
   */
  getBreadcrumbs() {
    return this.unifiedNav.breadcrumbs();
  }
  
  /**
   * 獲取所有模塊
   */
  getModules(): NavModule[] {
    return NAV_MODULES;
  }
  
  /**
   * 導航到模塊
   */
  navigateToModule(moduleId: ModuleId): void {
    this.unifiedNav.navigateToModule(moduleId);
    const module = NAV_MODULES.find(m => m.id === moduleId);
    if (module && this.isValidLegacyView(module.defaultView)) {
      this._currentView.set(module.defaultView as LegacyView);
    }
  }
  
  /**
   * 檢查是否為有效的舊視圖
   */
  private isValidLegacyView(view: string): view is LegacyView {
    const validViews: LegacyView[] = [
      'home', 'dashboard', 'accounts', 'add-account', 'api-credentials',
      'resources', 'member-database', 'resource-center', 'search-discovery',
      'ai-assistant', 'automation', 'automation-legacy',
      'leads', 'lead-nurturing', 'nurturing-analytics',
      'ads', 'user-tracking', 'campaigns', 'multi-role', 'ai-team',
      'ai-engine', 'ai-center', 'knowledge-brain', 'knowledge-manage', 'knowledge-gaps',
      'settings', 'analytics', 'analytics-center',
      'logs', 'performance', 'alerts', 'profile', 'membership-center',
      'monitoring-accounts', 'monitoring-groups', 'keyword-sets',
      'chat-templates', 'trigger-rules', 'collected-users',
      'messages'
    ];
    return validViews.includes(view as LegacyView);
  }
  
  /**
   * 檢查是否為有效的 ViewId
   */
  private isValidViewId(view: string): view is ViewId {
    for (const module of NAV_MODULES) {
      if (module.views.some(v => v.id === view)) {
        return true;
      }
    }
    return false;
  }
}


/**
 * 導航快捷鍵處理器
 */
@Injectable({
  providedIn: 'root'
})
export class NavShortcutsService {
  private bridge = inject(NavBridgeService);
  private unifiedNav = inject(UnifiedNavService);
  
  private shortcuts = this.unifiedNav.getShortcuts();
  
  /**
   * 處理快捷鍵
   * 在 app.component 中調用
   */
  handleKeyboard(event: KeyboardEvent): boolean {
    // 忽略輸入框中的按鍵
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return false;
    }
    
    // Ctrl/Cmd + 字母快捷鍵
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      const view = this.shortcuts.get(key);
      
      if (view) {
        event.preventDefault();
        this.bridge.navigateTo(view as LegacyView);
        return true;
      }
    }
    
    // Backspace 返回
    if (event.key === 'Backspace') {
      event.preventDefault();
      return this.bridge.goBack();
    }
    
    return false;
  }
}
