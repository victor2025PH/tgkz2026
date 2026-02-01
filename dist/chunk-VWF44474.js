import {
  Injectable,
  computed,
  effect,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-Y4VZODST.js";

// src/components/unified-nav.service.ts
var NAV_MODULES = [
  {
    id: "dashboard",
    label: "\u5100\u8868\u677F",
    icon: "\u{1F4CA}",
    description: "\u7CFB\u7D71\u7E3D\u89BD\u548C\u5FEB\u901F\u64CD\u4F5C",
    color: "from-cyan-500 to-blue-500",
    defaultView: "dashboard",
    views: [
      { id: "dashboard", label: "\u7E3D\u89BD", icon: "\u{1F4CA}", shortcut: "D" }
    ]
  },
  {
    id: "accounts",
    label: "\u5E33\u865F\u7BA1\u7406",
    icon: "\u{1F464}",
    description: "\u7BA1\u7406 Telegram \u5E33\u865F\u548C API \u8A2D\u7F6E",
    color: "from-purple-500 to-pink-500",
    defaultView: "accounts",
    views: [
      { id: "accounts", label: "\u5E33\u865F\u5217\u8868", icon: "\u{1F464}", description: "\u67E5\u770B\u548C\u7BA1\u7406\u6240\u6709\u5E33\u865F", shortcut: "A" },
      { id: "add-account", label: "\u6DFB\u52A0\u5E33\u865F", icon: "\u2795", description: "\u6DFB\u52A0\u65B0\u7684 Telegram \u5E33\u865F" },
      { id: "api-credentials", label: "API \u6191\u8B49", icon: "\u{1F511}", description: "\u7BA1\u7406 API ID \u548C Hash" }
    ]
  },
  // 🆕 營銷任務中心（核心入口）
  {
    id: "marketing-hub",
    label: "\u71DF\u92B7\u4EFB\u52D9\u4E2D\u5FC3",
    icon: "\u{1F680}",
    description: "\u4E00\u9375\u555F\u52D5\u71DF\u92B7\u4EFB\u52D9\uFF0CAI \u81EA\u52D5\u57F7\u884C",
    color: "from-purple-500 to-pink-500",
    defaultView: "marketing-hub",
    views: [
      { id: "marketing-hub", label: "\u5FEB\u901F\u555F\u52D5", icon: "\u{1F680}", description: "\u9078\u64C7\u76EE\u6A19\uFF0C\u4E00\u9375\u555F\u52D5", shortcut: "M" },
      { id: "marketing-tasks", label: "\u4EFB\u52D9\u5217\u8868", icon: "\u{1F4CB}", description: "\u7BA1\u7406\u6240\u6709\u71DF\u92B7\u4EFB\u52D9" },
      { id: "marketing-monitor", label: "\u6548\u679C\u76E3\u63A7", icon: "\u{1F4C8}", description: "\u5BE6\u6642\u67E5\u770B\u8F49\u5316\u6548\u679C" }
    ]
  },
  // 🆕 角色資源庫
  {
    id: "role-library",
    label: "\u89D2\u8272\u8CC7\u6E90\u5EAB",
    icon: "\u{1F3AD}",
    description: "\u7BA1\u7406\u89D2\u8272\u5B9A\u7FA9\u548C\u5287\u672C\u6A21\u677F",
    color: "from-amber-500 to-orange-500",
    defaultView: "role-store",
    views: [
      { id: "role-store", label: "\u89D2\u8272\u5EAB", icon: "\u{1F3AD}", description: "50+ \u9810\u8A2D\u89D2\u8272" },
      { id: "my-roles", label: "\u6211\u7684\u89D2\u8272", icon: "\u{1F464}", description: "\u81EA\u5B9A\u7FA9\u89D2\u8272" },
      { id: "scene-templates", label: "\u5834\u666F\u6A21\u677F", icon: "\u{1F3AC}", description: "\u9810\u8A2D\u5834\u666F\u914D\u7F6E" },
      { id: "script-editor", label: "\u5287\u672C\u7DE8\u6392", icon: "\u{1F4DD}", description: "\u7DE8\u8F2F\u5C0D\u8A71\u5287\u672C" }
    ]
  },
  // 🆕 P1-1: 知識大腦獨立菜單
  {
    id: "knowledge-hub",
    label: "\u77E5\u8B58\u5927\u8166",
    icon: "\u{1F9E0}",
    description: "\u77E5\u8B58\u5EAB\u7BA1\u7406\u548C AI \u5B78\u7FD2",
    color: "from-pink-500 to-rose-500",
    defaultView: "ai-brain",
    views: [
      { id: "ai-brain", label: "\u77E5\u8B58\u7E3D\u89BD", icon: "\u{1F9E0}", description: "\u77E5\u8B58\u5EAB\u7D71\u8A08\u548C\u5065\u5EB7\u5EA6", shortcut: "K" },
      { id: "knowledge-manage", label: "\u77E5\u8B58\u7BA1\u7406", icon: "\u{1F4DD}", description: "\u67E5\u770B\u548C\u7DE8\u8F2F\u77E5\u8B58" },
      { id: "knowledge-import", label: "\u5C0E\u5165\u77E5\u8B58", icon: "\u{1F4E5}", description: "\u5C0D\u8A71/\u6587\u6A94/\u7DB2\u9801\u5C0E\u5165" },
      { id: "knowledge-gaps", label: "\u77E5\u8B58\u7F3A\u53E3", icon: "\u2753", description: "\u5F85\u88DC\u5145\u7684\u554F\u984C" },
      { id: "knowledge-settings", label: "\u77E5\u8B58\u8A2D\u7F6E", icon: "\u2699\uFE0F", description: "RAG \u914D\u7F6E" }
    ]
  },
  // 🆕 智能引擎（簡化版）
  {
    id: "ai-engine",
    label: "\u667A\u80FD\u5F15\u64CE",
    icon: "\u{1F916}",
    description: "AI \u6A21\u578B\u548C\u4EBA\u683C\u914D\u7F6E",
    color: "from-indigo-500 to-violet-500",
    defaultView: "ai-models",
    views: [
      { id: "ai-models", label: "\u6A21\u578B\u914D\u7F6E", icon: "\u{1F916}", description: "\u9078\u64C7\u548C\u914D\u7F6E AI \u6A21\u578B", shortcut: "I" },
      { id: "ai-persona", label: "\u4EBA\u683C\u8A2D\u7F6E", icon: "\u{1F4AC}", description: "AI \u8AAA\u8A71\u98A8\u683C\u548C\u4EBA\u683C" },
      { id: "ai-usage", label: "\u4F7F\u7528\u7D71\u8A08", icon: "\u{1F4CA}", description: "AI \u8ABF\u7528\u7D71\u8A08" }
    ]
  },
  // 觸發監控（原自動化）
  {
    id: "automation",
    label: "\u89F8\u767C\u76E3\u63A7",
    icon: "\u{1F4E1}",
    description: "\u8A2D\u7F6E\u89F8\u767C\u898F\u5247\u548C\u76E3\u63A7",
    color: "from-emerald-500 to-teal-500",
    defaultView: "monitoring-groups",
    views: [
      { id: "monitoring-groups", label: "\u76E3\u63A7\u7FA4\u7D44", icon: "\u{1F465}", description: "\u7BA1\u7406\u76E3\u63A7\u7684\u7FA4\u7D44" },
      { id: "keyword-sets", label: "\u95DC\u9375\u8A5E\u96C6", icon: "\u{1F50D}", description: "\u8A2D\u7F6E\u89F8\u767C\u95DC\u9375\u8A5E" },
      { id: "trigger-rules", label: "\u89F8\u767C\u898F\u5247", icon: "\u{1F3AF}", description: "\u914D\u7F6E\u89F8\u767C\u689D\u4EF6\u548C\u52D5\u4F5C" },
      { id: "chat-templates", label: "\u804A\u5929\u6A21\u677F", icon: "\u{1F4AC}", description: "\u9810\u8A2D\u56DE\u8986\u6A21\u677F" },
      { id: "collected-users", label: "\u6536\u96C6\u7528\u6236", icon: "\u{1F4E5}", description: "\u81EA\u52D5\u6536\u96C6\u7684\u7528\u6236" }
    ]
  },
  // 客戶管理
  {
    id: "contacts",
    label: "\u5BA2\u6236\u7BA1\u7406",
    icon: "\u{1F4CB}",
    description: "\u7BA1\u7406\u6F5B\u5728\u5BA2\u6236\u548C\u7528\u6236\u6578\u64DA",
    color: "from-sky-500 to-cyan-500",
    defaultView: "leads",
    views: [
      { id: "leads", label: "\u7DDA\u7D22\u7BA1\u7406", icon: "\u{1F4CB}", description: "\u7BA1\u7406\u6240\u6709\u6F5B\u5728\u5BA2\u6236", shortcut: "L" },
      { id: "lead-nurturing", label: "\u7DDA\u7D22\u57F9\u80B2", icon: "\u{1F331}", description: "AI \u9A45\u52D5\u7684\u5BA2\u6236\u57F9\u80B2" },
      { id: "member-database", label: "\u6210\u54E1\u6578\u64DA\u5EAB", icon: "\u{1F5C4}\uFE0F", description: "\u7FA4\u7D44\u6210\u54E1\u7BA1\u7406" },
      { id: "user-tracking", label: "\u7528\u6236\u8FFD\u8E64", icon: "\u{1F4CD}", description: "\u8FFD\u8E64\u9AD8\u50F9\u503C\u7528\u6236" }
    ]
  },
  // 數據分析
  {
    id: "analytics",
    label: "\u6578\u64DA\u5206\u6790",
    icon: "\u{1F4C8}",
    description: "\u67E5\u770B\u7D71\u8A08\u548C\u5831\u544A",
    color: "from-rose-500 to-red-500",
    defaultView: "analytics",
    views: [
      { id: "analytics", label: "\u6578\u64DA\u7E3D\u89BD", icon: "\u{1F4C8}", description: "\u95DC\u9375\u6307\u6A19\u6982\u89BD" },
      { id: "marketing-report", label: "\u71DF\u92B7\u5831\u8868", icon: "\u{1F4CA}", description: "\u89D2\u8272\u7D44\u5408\u6548\u679C\u5206\u6790", shortcut: "R" },
      { id: "analytics-center", label: "\u5206\u6790\u4E2D\u5FC3", icon: "\u{1F4CA}", description: "\u6DF1\u5EA6\u6578\u64DA\u5206\u6790" },
      { id: "performance", label: "\u6027\u80FD\u76E3\u63A7", icon: "\u26A1", description: "\u7CFB\u7D71\u6027\u80FD\u6307\u6A19" },
      { id: "search-discovery", label: "\u8CC7\u6E90\u767C\u73FE", icon: "\u{1F52D}", description: "\u767C\u73FE\u65B0\u7FA4\u7D44\u548C\u7528\u6236" }
    ]
  },
  // 系統設置
  {
    id: "system",
    label: "\u7CFB\u7D71\u8A2D\u7F6E",
    icon: "\u2699\uFE0F",
    description: "\u7CFB\u7D71\u914D\u7F6E\u548C\u65E5\u8A8C",
    color: "from-slate-500 to-gray-500",
    defaultView: "settings",
    views: [
      { id: "settings", label: "\u7CFB\u7D71\u8A2D\u7F6E", icon: "\u2699\uFE0F", description: "\u5168\u5C40\u8A2D\u7F6E", shortcut: "S" },
      { id: "profile", label: "\u500B\u4EBA\u8CC7\u6599", icon: "\u{1F464}", description: "\u7528\u6236\u8CC7\u6599" },
      { id: "membership-center", label: "\u6703\u54E1\u4E2D\u5FC3", icon: "\u{1F48E}", description: "\u8A02\u95B1\u7BA1\u7406" }
    ]
  },
  // ============ 舊模塊（保持兼容，hidden） ============
  {
    id: "marketing",
    label: "\u71DF\u92B7\u4E2D\u5FC3",
    icon: "\u{1F4E2}",
    description: "\uFF08\u5DF2\u6574\u5408\u5230\u71DF\u92B7\u4EFB\u52D9\u4E2D\u5FC3\uFF09",
    color: "from-rose-500 to-red-500",
    defaultView: "ads",
    views: [
      { id: "ads", label: "\u5EE3\u544A\u767C\u9001", icon: "\u{1F4E2}", description: "\u6279\u91CF\u767C\u9001\u5EE3\u544A", hidden: true },
      { id: "campaigns", label: "\u71DF\u92B7\u6D3B\u52D5", icon: "\u{1F3AA}", description: "\u7BA1\u7406\u71DF\u92B7\u6D3B\u52D5", hidden: true },
      { id: "multi-role", label: "\u591A\u89D2\u8272\u5354\u4F5C", icon: "\u{1F3AD}", description: "\u5DF2\u79FB\u81F3\u89D2\u8272\u8CC7\u6E90\u5EAB", hidden: true }
    ]
  },
  {
    id: "ai",
    label: "AI \u4E2D\u5FC3",
    icon: "\u{1F9E0}",
    description: "\uFF08\u5DF2\u6574\u5408\u5230\u667A\u80FD\u5F15\u64CE\uFF09",
    color: "from-indigo-500 to-violet-500",
    defaultView: "ai-center",
    views: [
      { id: "ai-center", label: "AI \u5C0D\u8A71", icon: "\u{1F9E0}", description: "\u5DF2\u79FB\u81F3\u667A\u80FD\u5F15\u64CE", hidden: true },
      { id: "ai-assistant", label: "AI \u52A9\u624B", icon: "\u2728", description: "\u71DF\u92B7\u5167\u5BB9\u52A9\u624B", hidden: true }
    ]
  }
];
var UnifiedNavService = class _UnifiedNavService {
  constructor() {
    this._currentView = signal("dashboard", ...ngDevMode ? [{ debugName: "_currentView" }] : []);
    this.currentView = this._currentView.asReadonly();
    this._history = [];
    this.MAX_HISTORY = 20;
    this.modules = NAV_MODULES;
    this.currentModule = computed(() => {
      const view = this._currentView();
      return NAV_MODULES.find((m) => m.views.some((v) => v.id === view)) || NAV_MODULES[0];
    }, ...ngDevMode ? [{ debugName: "currentModule" }] : []);
    this.currentNavItem = computed(() => {
      const view = this._currentView();
      for (const module of NAV_MODULES) {
        const item = module.views.find((v) => v.id === view);
        if (item)
          return item;
      }
      return null;
    }, ...ngDevMode ? [{ debugName: "currentNavItem" }] : []);
    this.breadcrumbs = computed(() => {
      const module = this.currentModule();
      const item = this.currentNavItem();
      if (!module || !item)
        return [];
      if (module.id === "dashboard") {
        return [{ label: "\u9996\u9801", icon: "\u{1F3E0}" }];
      }
      return [
        { label: module.label, icon: module.icon, view: module.defaultView },
        { label: item.label, icon: item.icon }
      ];
    }, ...ngDevMode ? [{ debugName: "breadcrumbs" }] : []);
  }
  /**
   * 導航到視圖
   */
  navigateTo(view) {
    const previous = this._currentView();
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
  goBack() {
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
  navigateToModule(moduleId) {
    const module = NAV_MODULES.find((m) => m.id === moduleId);
    if (module) {
      this.navigateTo(module.defaultView);
    }
  }
  /**
   * 獲取模塊的所有可見視圖
   */
  getModuleViews(moduleId) {
    const module = NAV_MODULES.find((m) => m.id === moduleId);
    if (!module)
      return [];
    return module.views.filter((v) => !v.hidden);
  }
  /**
   * 獲取視圖所屬模塊
   */
  getViewModule(viewId) {
    return NAV_MODULES.find((m) => m.views.some((v) => v.id === viewId)) || null;
  }
  /**
   * 搜索視圖
   */
  searchViews(query) {
    if (!query)
      return [];
    const lowerQuery = query.toLowerCase();
    const results = [];
    for (const module of NAV_MODULES) {
      for (const view of module.views) {
        if (view.label.toLowerCase().includes(lowerQuery) || view.description?.toLowerCase().includes(lowerQuery)) {
          results.push(view);
        }
      }
    }
    return results;
  }
  /**
   * 獲取快捷鍵映射
   */
  getShortcuts() {
    const shortcuts = /* @__PURE__ */ new Map();
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
  setBadge(viewId, count) {
    for (const module of NAV_MODULES) {
      const view = module.views.find((v) => v.id === viewId);
      if (view) {
        view.badge = count;
        break;
      }
    }
  }
  /**
   * 清除徽章
   */
  clearBadge(viewId) {
    this.setBadge(viewId, 0);
  }
  static {
    this.\u0275fac = function UnifiedNavService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UnifiedNavService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UnifiedNavService, factory: _UnifiedNavService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UnifiedNavService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/nav-bridge.service.ts
var NavBridgeService = class _NavBridgeService {
  constructor() {
    this.unifiedNav = inject(UnifiedNavService);
    this._currentView = signal("dashboard", ...ngDevMode ? [{ debugName: "_currentView" }] : []);
    this.currentView = this._currentView.asReadonly();
    this._syncing = false;
    effect(() => {
      const unifiedView = this.unifiedNav.currentView();
      if (!this._syncing && this.isValidLegacyView(unifiedView)) {
        this._currentView.set(unifiedView);
      }
    });
  }
  /**
   * 設置當前視圖（供舊系統使用）
   */
  setView(view) {
    this._syncing = true;
    try {
      this._currentView.set(view);
      if (this.isValidViewId(view)) {
        this.unifiedNav.navigateTo(view);
      }
    } finally {
      this._syncing = false;
    }
  }
  /**
   * 導航到視圖
   */
  navigateTo(view) {
    this.setView(view);
  }
  /**
   * 返回上一頁
   */
  goBack() {
    return this.unifiedNav.goBack();
  }
  /**
   * 獲取當前模塊
   */
  getCurrentModule() {
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
  getModules() {
    return NAV_MODULES;
  }
  /**
   * 導航到模塊
   */
  navigateToModule(moduleId) {
    this.unifiedNav.navigateToModule(moduleId);
    const module = NAV_MODULES.find((m) => m.id === moduleId);
    if (module && this.isValidLegacyView(module.defaultView)) {
      this._currentView.set(module.defaultView);
    }
  }
  /**
   * 檢查是否為有效的舊視圖
   */
  isValidLegacyView(view) {
    const validViews = [
      "dashboard",
      "accounts",
      "add-account",
      "api-credentials",
      "resources",
      "member-database",
      "resource-center",
      "search-discovery",
      "ai-assistant",
      "automation",
      "automation-legacy",
      "leads",
      "lead-nurturing",
      "nurturing-analytics",
      "ads",
      "user-tracking",
      "campaigns",
      "multi-role",
      "ai-team",
      "ai-center",
      "settings",
      "analytics",
      "analytics-center",
      "logs",
      "performance",
      "alerts",
      "profile",
      "membership-center",
      "monitoring-accounts",
      "monitoring-groups",
      "keyword-sets",
      "chat-templates",
      "trigger-rules",
      "collected-users"
    ];
    return validViews.includes(view);
  }
  /**
   * 檢查是否為有效的 ViewId
   */
  isValidViewId(view) {
    for (const module of NAV_MODULES) {
      if (module.views.some((v) => v.id === view)) {
        return true;
      }
    }
    return false;
  }
  static {
    this.\u0275fac = function NavBridgeService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NavBridgeService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _NavBridgeService, factory: _NavBridgeService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NavBridgeService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();
var NavShortcutsService = class _NavShortcutsService {
  constructor() {
    this.bridge = inject(NavBridgeService);
    this.unifiedNav = inject(UnifiedNavService);
    this.shortcuts = this.unifiedNav.getShortcuts();
  }
  /**
   * 處理快捷鍵
   * 在 app.component 中調用
   */
  handleKeyboard(event) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return false;
    }
    if (event.ctrlKey || event.metaKey) {
      const key = event.key.toLowerCase();
      const view = this.shortcuts.get(key);
      if (view) {
        event.preventDefault();
        this.bridge.navigateTo(view);
        return true;
      }
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      return this.bridge.goBack();
    }
    return false;
  }
  static {
    this.\u0275fac = function NavShortcutsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NavShortcutsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _NavShortcutsService, factory: _NavShortcutsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NavShortcutsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

export {
  UnifiedNavService,
  NavBridgeService,
  NavShortcutsService
};
//# sourceMappingURL=chunk-VWF44474.js.map
