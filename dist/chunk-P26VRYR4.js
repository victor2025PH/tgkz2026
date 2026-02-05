import {
  AuthEventsService
} from "./chunk-VXLC6YHT.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-K4KD4A2Z.js";

// src/toast.service.ts
var DEFAULT_ICONS = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
  progress: "\u23F3"
};
var ToastService = class _ToastService {
  constructor() {
    this.toasts = signal([], ...ngDevMode ? [{ debugName: "toasts" }] : []);
    this.toastIdCounter = 0;
  }
  /**
   * Get all active toasts
   */
  getToasts() {
    return this.toasts;
  }
  /**
   * Show a success toast
   */
  success(message, duration = 3e3) {
    return this.show("success", message, duration);
  }
  /**
   * Show an error toast
   */
  error(message, duration = 5e3) {
    return this.show("error", message, duration);
  }
  /**
   * Show a warning toast
   */
  warning(message, duration = 4e3) {
    return this.show("warning", message, duration);
  }
  /**
   * Show a warning toast with an action button
   */
  warningWithAction(message, actionLabel, actionHandler, duration = 0) {
    return this.withActions("warning", message, [
      { label: actionLabel, handler: actionHandler, variant: "primary" },
      { label: "\u7A0D\u5F8C", handler: () => {
      }, variant: "secondary" }
    ], duration);
  }
  /**
   * Show an info toast
   */
  info(message, duration = 3e3) {
    return this.show("info", message, duration);
  }
  /**
   * Show a success toast with next step hint
   */
  successWithNextStep(message, nextStepLabel, nextStepAction) {
    const id = `toast-${++this.toastIdCounter}`;
    const toast = {
      id,
      type: "success",
      message,
      icon: "\u{1F389}",
      duration: 5e3,
      timestamp: /* @__PURE__ */ new Date(),
      nextStep: { label: nextStepLabel, action: nextStepAction },
      dismissible: true
    };
    this.toasts.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(id), 5e3);
    return id;
  }
  /**
   * Show a toast with action buttons
   */
  withActions(type, message, actions, duration = 0) {
    const id = `toast-${++this.toastIdCounter}`;
    const toast = {
      id,
      type,
      message,
      icon: DEFAULT_ICONS[type],
      duration: duration > 0 ? duration : void 0,
      timestamp: /* @__PURE__ */ new Date(),
      actions,
      dismissible: true
    };
    this.toasts.update((toasts) => [...toasts, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }
  /**
   * Show a progress toast
   */
  showProgress(message, progress = 0) {
    const id = `toast-${++this.toastIdCounter}`;
    const toast = {
      id,
      type: "progress",
      message,
      icon: "\u23F3",
      progress,
      timestamp: /* @__PURE__ */ new Date(),
      dismissible: false
    };
    this.toasts.update((toasts) => [...toasts, toast]);
    return id;
  }
  /**
   * Update progress toast
   */
  updateProgress(id, progress, message) {
    this.toasts.update((toasts) => toasts.map((t) => t.id === id ? __spreadProps(__spreadValues({}, t), {
      progress,
      message: message || t.message,
      icon: progress >= 100 ? "\u2705" : "\u23F3"
    }) : t));
    if (progress >= 100) {
      setTimeout(() => this.dismiss(id), 2e3);
    }
  }
  /**
   * Show a configuration reminder toast
   */
  configReminder(stepName, action) {
    return this.withActions("warning", `\u914D\u7F6E\u672A\u5B8C\u6210\uFF1A${stepName}`, [
      { label: "\u7ACB\u5373\u8A2D\u7F6E", handler: action, variant: "primary" },
      { label: "\u7A0D\u5F8C", handler: () => {
      }, variant: "secondary" }
    ], 0);
  }
  /**
   * Show operation result with emoji
   */
  operationResult(success, successMsg, errorMsg) {
    if (success) {
      return this.success(successMsg);
    } else {
      return this.error(errorMsg);
    }
  }
  /**
   * Common operation feedback messages
   */
  // 帳號相關
  accountConnected(name) {
    return this.successWithNextStep(`\u{1F517} ${name} \u5DF2\u9023\u63A5`, "\u8A2D\u70BA\u76E3\u807D\u5E33\u865F", () => {
    });
  }
  accountDisconnected(name) {
    return this.warning(`\u{1F4F4} ${name} \u5DF2\u65B7\u958B\u9023\u63A5`);
  }
  accountRoleChanged(name, role) {
    const roleEmoji = role === "Listener" ? "\u{1F441}\uFE0F" : role === "Sender" ? "\u{1F4E4}" : "\u{1F464}";
    return this.success(`${roleEmoji} ${name} \u5DF2\u8A2D\u70BA${role === "Listener" ? "\u76E3\u807D" : role === "Sender" ? "\u767C\u9001" : "\u666E\u901A"}\u5E33\u865F`);
  }
  // 群組相關
  groupAdded(name) {
    return this.successWithNextStep(`\u{1F4AC} \u5DF2\u6DFB\u52A0\u7FA4\u7D44\u300C${name}\u300D`, "\u7D81\u5B9A\u95DC\u9375\u8A5E\u96C6", () => {
    });
  }
  groupRemoved(name) {
    return this.success(`\u{1F5D1}\uFE0F \u5DF2\u79FB\u9664\u300C${name}\u300D`);
  }
  groupKeywordBound(groupName, keywordSetName) {
    return this.success(`\u{1F517} \u5DF2\u5C07\u300C${keywordSetName}\u300D\u7D81\u5B9A\u5230\u300C${groupName}\u300D`);
  }
  // 詞集相關
  keywordSetCreated(name) {
    return this.successWithNextStep(`\u{1F511} \u8A5E\u96C6\u300C${name}\u300D\u5DF2\u5275\u5EFA`, "\u7D81\u5B9A\u5230\u7FA4\u7D44", () => {
    });
  }
  keywordSetDeleted(name) {
    return this.success(`\u{1F5D1}\uFE0F \u8A5E\u96C6\u300C${name}\u300D\u5DF2\u522A\u9664`);
  }
  // 監控相關
  monitoringStarted() {
    return this.success("\u{1F680} \u76E3\u63A7\u5DF2\u555F\u52D5\uFF0C\u7CFB\u7D71\u6B63\u5728\u5DE5\u4F5C\u4E2D...");
  }
  monitoringStopped() {
    return this.info("\u23F8\uFE0F \u76E3\u63A7\u5DF2\u66AB\u505C");
  }
  keywordMatched(keyword, groupName) {
    return this.info(`\u{1F3AF} \u5728\u300C${groupName}\u300D\u5339\u914D\u5230\u95DC\u9375\u8A5E\u300C${keyword}\u300D`);
  }
  // 提取成員
  extractMembersStarted(groupName) {
    return this.showProgress(`\u6B63\u5728\u63D0\u53D6\u300C${groupName}\u300D\u7684\u6210\u54E1...`, 0);
  }
  extractMembersCompleted(count, groupName) {
    return this.success(`\u2705 \u5DF2\u5F9E\u300C${groupName}\u300D\u63D0\u53D6 ${count} \u500B\u6210\u54E1`);
  }
  /**
   * Show a toast notification
   */
  show(type, message, duration = 3e3) {
    const id = `toast-${++this.toastIdCounter}`;
    const toast = {
      id,
      type,
      message,
      icon: DEFAULT_ICONS[type],
      duration: duration > 0 ? duration : void 0,
      timestamp: /* @__PURE__ */ new Date(),
      dismissible: true
    };
    this.toasts.update((toasts) => [...toasts, toast]);
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
    return id;
  }
  /**
   * Dismiss a toast by ID
   */
  dismiss(id) {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }
  /**
   * Dismiss all toasts
   */
  dismissAll() {
    this.toasts.set([]);
  }
  static {
    this.\u0275fac = function ToastService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ToastService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ToastService, factory: _ToastService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ToastService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/membership.service.ts
var MEMBERSHIP_CONFIG = {
  bronze: {
    name: "\u9752\u9285\u6230\u58EB",
    icon: "\u2694\uFE0F",
    rank: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
    quotas: {
      maxAccounts: 2,
      dailyMessages: 20,
      dailyAiCalls: 10,
      maxGroups: 3,
      maxKeywordSets: 1,
      dataRetentionDays: 7,
      platformApiQuota: 0,
      platformApiMaxAccounts: 0
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能
      aiAutoReply: true,
      adBroadcast: false,
      hotLeads: false,
      // 黃金功能
      smartMode: false,
      aiInsights: false,
      dataExport: false,
      batchOperations: false,
      dataInsightsBasic: false,
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  silver: {
    name: "\u767D\u9280\u7CBE\u82F1",
    icon: "\u{1F948}",
    rank: 2,
    monthlyPrice: 4.99,
    yearlyPrice: 49.9,
    quotas: {
      maxAccounts: 5,
      dailyMessages: 100,
      dailyAiCalls: 50,
      maxGroups: 10,
      maxKeywordSets: 5,
      dataRetentionDays: 30,
      platformApiQuota: 1,
      platformApiMaxAccounts: 3
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 解鎖熱門客戶
      // 黃金功能
      smartMode: false,
      aiInsights: false,
      dataExport: false,
      batchOperations: false,
      dataInsightsBasic: false,
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  gold: {
    name: "\u9EC3\u91D1\u5927\u5E2B",
    icon: "\u{1F947}",
    rank: 3,
    monthlyPrice: 19.9,
    // 主推產品
    yearlyPrice: 199,
    quotas: {
      maxAccounts: 15,
      dailyMessages: 500,
      dailyAiCalls: 300,
      maxGroups: 30,
      maxKeywordSets: 20,
      dataRetentionDays: 60,
      platformApiQuota: 3,
      platformApiMaxAccounts: 9
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      // 解鎖智能模式
      aiInsights: true,
      // 解鎖AI智能洞察
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 解鎖基礎數據洞察
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  diamond: {
    name: "\u947D\u77F3\u738B\u724C",
    icon: "\u{1F48E}",
    rank: 4,
    monthlyPrice: 59.9,
    yearlyPrice: 599,
    quotas: {
      maxAccounts: 50,
      dailyMessages: 2e3,
      dailyAiCalls: -1,
      maxGroups: 100,
      maxKeywordSets: 50,
      dataRetentionDays: 90,
      platformApiQuota: 10,
      platformApiMaxAccounts: 30
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,
      // 解鎖策略規劃
      autoExecution: true,
      // 解鎖自動執行
      dataInsightsAdvanced: true,
      // 解鎖進階數據洞察
      abTesting: true,
      // 解鎖A/B測試
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: true
      // 優先支持
    }
  },
  star: {
    name: "\u661F\u8000\u50B3\u8AAA",
    icon: "\u{1F31F}",
    rank: 5,
    monthlyPrice: 199,
    yearlyPrice: 1999,
    quotas: {
      maxAccounts: 100,
      dailyMessages: 1e4,
      dailyAiCalls: -1,
      maxGroups: 300,
      maxKeywordSets: 100,
      dataRetentionDays: 180,
      platformApiQuota: 30,
      platformApiMaxAccounts: 90
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,
      autoExecution: true,
      dataInsightsAdvanced: true,
      abTesting: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      // 星耀功能 ✓
      apiAccess: true,
      // 解鎖API接口
      teamManagement: true,
      // 解鎖團隊管理
      // 王者功能
      customBranding: false,
      prioritySupport: true
    }
  },
  king: {
    name: "\u69AE\u8000\u738B\u8005",
    icon: "\u{1F451}",
    rank: 6,
    monthlyPrice: 599,
    yearlyPrice: 5999,
    quotas: {
      maxAccounts: -1,
      // 無限
      dailyMessages: -1,
      dailyAiCalls: -1,
      maxGroups: -1,
      maxKeywordSets: -1,
      dataRetentionDays: 365,
      platformApiQuota: -1,
      platformApiMaxAccounts: -1
    },
    features: {
      // 所有功能全部解鎖
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,
      autoExecution: true,
      dataInsightsAdvanced: true,
      abTesting: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      // 星耀功能 ✓
      apiAccess: true,
      teamManagement: true,
      // 王者功能 ✓
      customBranding: true,
      // 解鎖自定義品牌
      prioritySupport: true
    }
  }
};
var MembershipService = class _MembershipService {
  static {
    this.STORAGE_KEY = "tg-matrix-membership";
  }
  static {
    this.USAGE_KEY = "tg-matrix-usage";
  }
  static {
    this.TRIAL_DAYS = 7;
  }
  // 免費試用天數
  constructor() {
    this.SKIP_LOGIN = !!window.electronAPI || !!window.electron;
    this.DEFAULT_LEVEL = "king";
    this._membership = signal(null, ...ngDevMode ? [{ debugName: "_membership" }] : []);
    this._isLoading = signal(true, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.membership = computed(() => this._membership(), ...ngDevMode ? [{ debugName: "membership" }] : []);
    this.isLoading = computed(() => this._isLoading(), ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.level = computed(() => {
      const defaultLevel = this.SKIP_LOGIN ? this.DEFAULT_LEVEL : "bronze";
      const rawLevel = this._membership()?.level || defaultLevel;
      if (rawLevel in MEMBERSHIP_CONFIG) {
        return rawLevel;
      }
      const legacyMap = {
        "free": "bronze",
        "vip": "silver",
        "svip": "diamond",
        "mvp": "king"
      };
      return legacyMap[rawLevel] || defaultLevel;
    }, ...ngDevMode ? [{ debugName: "level" }] : []);
    this.levelName = computed(() => MEMBERSHIP_CONFIG[this.level()]?.name || (this.SKIP_LOGIN ? "\u69AE\u8000\u738B\u8005" : "\u9752\u9285\u6230\u58EB"), ...ngDevMode ? [{ debugName: "levelName" }] : []);
    this.levelIcon = computed(() => MEMBERSHIP_CONFIG[this.level()]?.icon || (this.SKIP_LOGIN ? "\u{1F451}" : "\u2694\uFE0F"), ...ngDevMode ? [{ debugName: "levelIcon" }] : []);
    this.levelRank = computed(() => MEMBERSHIP_CONFIG[this.level()]?.rank || (this.SKIP_LOGIN ? 6 : 1), ...ngDevMode ? [{ debugName: "levelRank" }] : []);
    this.isActive = computed(() => {
      const m = this._membership();
      if (!m)
        return false;
      if (m.level === "bronze")
        return true;
      if (!m.expiresAt)
        return true;
      return /* @__PURE__ */ new Date() < m.expiresAt;
    }, ...ngDevMode ? [{ debugName: "isActive" }] : []);
    this.daysRemaining = computed(() => {
      const m = this._membership();
      if (!m || !m.expiresAt || m.level === "bronze")
        return -1;
      const diff = m.expiresAt.getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / (1e3 * 60 * 60 * 24)));
    }, ...ngDevMode ? [{ debugName: "daysRemaining" }] : []);
    this.quotas = computed(() => {
      const effectiveLevel = this.isActive() ? this.level() : "bronze";
      return MEMBERSHIP_CONFIG[effectiveLevel].quotas;
    }, ...ngDevMode ? [{ debugName: "quotas" }] : []);
    this.features = computed(() => {
      const effectiveLevel = this.isActive() ? this.level() : "bronze";
      return MEMBERSHIP_CONFIG[effectiveLevel].features;
    }, ...ngDevMode ? [{ debugName: "features" }] : []);
    this.usage = computed(() => {
      return this._membership()?.usage || this.getDefaultUsage();
    }, ...ngDevMode ? [{ debugName: "usage" }] : []);
    this.authEventsService = inject(AuthEventsService);
    this.eventSubscription = null;
    this.loadMembership();
    this.subscribeToAuthEvents();
  }
  /**
   * 🆕 訂閱認證事件
   * 在 SaaS 模式下，當用戶登入或數據更新時自動同步會員狀態
   */
  subscribeToAuthEvents() {
    if (this.SKIP_LOGIN) {
      return;
    }
    this.eventSubscription = this.authEventsService.authEvents$.subscribe((event) => {
      if (event.type === "login" || event.type === "user_update") {
        const user = event.payload?.user;
        if (user) {
          const tier = user.membershipLevel || user.subscription_tier || "free";
          const level = this.tierToLevel(tier);
          const expires = user.membershipExpires || user.membership_expires;
          console.log(`[MembershipService] \u{1F504} \u6536\u5230 ${event.type} \u4E8B\u4EF6\uFF0C\u540C\u6B65\u6703\u54E1: ${level}`);
          this.syncFromAuthService(level, expires);
        }
      } else if (event.type === "logout") {
        console.log("[MembershipService] \u6536\u5230 logout \u4E8B\u4EF6\uFF0C\u91CD\u7F6E\u6703\u54E1\u72C0\u614B");
        this.initializeFreeMembership();
      }
    });
  }
  /**
   * 🆕 將 subscription_tier 轉換為 MembershipLevel
   */
  tierToLevel(tier) {
    const tierMap = {
      "free": "bronze",
      "basic": "silver",
      "pro": "gold",
      "enterprise": "diamond",
      "bronze": "bronze",
      "silver": "silver",
      "gold": "gold",
      "diamond": "diamond",
      "star": "star",
      "king": "king"
    };
    return tierMap[tier] || "bronze";
  }
  /**
   * 🆕 清理訂閱
   */
  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }
  // ============ 🔧 P2: 數據同步 ============
  /**
   * 從 AuthService 同步會員數據
   * 用於 SaaS 模式下確保數據一致性
   *
   * @param authLevel 從 AuthService 獲取的會員等級
   * @param authExpires 從 AuthService 獲取的過期時間
   */
  syncFromAuthService(authLevel, authExpires) {
    if (this.SKIP_LOGIN) {
      console.log("[MembershipService] Electron \u6A21\u5F0F\uFF0C\u8DF3\u904E AuthService \u540C\u6B65");
      return;
    }
    const currentMembership = this._membership();
    const currentLevel = currentMembership?.level;
    const levelConfig = MEMBERSHIP_CONFIG[authLevel];
    const newMembership = {
      level: authLevel,
      levelName: levelConfig?.name || "\u672A\u77E5",
      levelIcon: levelConfig?.icon || "?",
      // 🔧 修復：對於付費會員，如果沒有過期時間，設置為永久（100年）
      expiresAt: authExpires ? new Date(authExpires) : authLevel !== "bronze" ? new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1e3) : void 0,
      activatedAt: currentMembership?.activatedAt || /* @__PURE__ */ new Date(),
      machineId: this.getMachineId(),
      usage: currentMembership?.usage || this.getDefaultUsage(),
      inviteCode: currentMembership?.inviteCode || this.generateInviteCode(),
      inviteCount: currentMembership?.inviteCount || 0,
      inviteRewards: currentMembership?.inviteRewards || 0
    };
    if (currentLevel !== authLevel) {
      console.log(`[MembershipService] \u{1F504} \u6703\u54E1\u7B49\u7D1A\u8B8A\u66F4: ${currentLevel} \u2192 ${authLevel}`);
    } else {
      console.log(`[MembershipService] \u2713 \u6703\u54E1\u540C\u6B65\u78BA\u8A8D: ${authLevel} (expiresAt: ${newMembership.expiresAt || "\u6C38\u4E45"})`);
    }
    this._membership.set(newMembership);
    this.saveMembership(newMembership);
  }
  /**
   * 檢查是否為 SaaS 模式（非 Electron）
   */
  isSaaSMode() {
    return !this.SKIP_LOGIN;
  }
  // ============ 會員管理 ============
  /**
   * 加載會員信息
   */
  loadMembership() {
    try {
      const stored = localStorage.getItem(_MembershipService.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : void 0;
        parsed.activatedAt = parsed.activatedAt ? new Date(parsed.activatedAt) : void 0;
        if (this.SKIP_LOGIN && parsed.level !== this.DEFAULT_LEVEL) {
          console.log(`[MembershipService] \u514D\u767B\u9304\u6A21\u5F0F\uFF1A\u5F9E ${parsed.level} \u5347\u7D1A\u5230 ${this.DEFAULT_LEVEL}`);
          parsed.level = this.DEFAULT_LEVEL;
          parsed.levelName = MEMBERSHIP_CONFIG[this.DEFAULT_LEVEL].name;
          parsed.levelIcon = MEMBERSHIP_CONFIG[this.DEFAULT_LEVEL].icon;
          parsed.expiresAt = new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1e3);
          this.saveMembership(parsed);
        }
        this.checkAndResetDailyUsage(parsed);
        this._membership.set(parsed);
      } else {
        this.initializeFreeMembership();
      }
    } catch (e) {
      console.error("Failed to load membership:", e);
      this.initializeFreeMembership();
    } finally {
      this._isLoading.set(false);
    }
  }
  /**
   * 初始化會員
   * 免登錄模式：榮耀王者（無限制）
   * 正常模式：青銅戰士（免費試用）
   */
  initializeFreeMembership() {
    const level = this.SKIP_LOGIN ? this.DEFAULT_LEVEL : "bronze";
    const config = MEMBERSHIP_CONFIG[level];
    const membership = {
      level,
      levelName: config.name,
      levelIcon: config.icon,
      activatedAt: /* @__PURE__ */ new Date(),
      // 免登錄模式：100年後過期（相當於永久）
      expiresAt: this.SKIP_LOGIN ? new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1e3) : void 0,
      machineId: this.getMachineId(),
      usage: this.getDefaultUsage(),
      inviteCode: this.generateInviteCode(),
      inviteCount: 0,
      inviteRewards: 0
    };
    console.log(`[MembershipService] \u521D\u59CB\u5316\u6703\u54E1: ${config.icon} ${config.name}`);
    this.saveMembership(membership);
  }
  /**
   * 激活會員（王者榮耀風格）
   */
  async activateMembership(licenseKey, email) {
    const newKeyRegex = /^TGAI-([BGDSK][123YL]|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const oldKeyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    let match = licenseKey.toUpperCase().match(newKeyRegex);
    if (!match) {
      match = licenseKey.toUpperCase().match(oldKeyRegex);
    }
    if (!match) {
      return { success: false, message: "\u2694\uFE0F \u5361\u5BC6\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u6AA2\u67E5\u5F8C\u91CD\u8A66" };
    }
    const typeCode = match[1];
    const levelCode = typeCode[0];
    const durationCode = typeCode[1] || "2";
    const levelMap = {
      "B": "silver",
      // 白銀精英
      "G": "gold",
      // 黃金大師
      "D": "diamond",
      // 鑽石王牌
      "S": "star",
      // 星耀傳說
      "K": "king",
      // 榮耀王者
      "E": "gold"
      // EXT 手動續費默認黃金
    };
    const durationMap = {
      "1": 7,
      // 周卡
      "2": 30,
      // 月卡
      "3": 90,
      // 季卡
      "Y": 365,
      // 年卡
      "L": 36500,
      // 終身
      "X": 30
      // EXT 默認30天
    };
    const level = levelMap[levelCode] || "silver";
    const durationDays = durationMap[durationCode] || 30;
    const currentMembership = this._membership();
    let expiresAt = /* @__PURE__ */ new Date();
    if (currentMembership?.expiresAt && currentMembership.expiresAt > /* @__PURE__ */ new Date()) {
      expiresAt = new Date(currentMembership.expiresAt);
    }
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    const config = MEMBERSHIP_CONFIG[level];
    const membership = __spreadProps(__spreadValues({}, currentMembership), {
      level,
      levelName: config.name,
      levelIcon: config.icon,
      expiresAt,
      activatedAt: /* @__PURE__ */ new Date(),
      licenseKey: licenseKey.toUpperCase(),
      email,
      machineId: this.getMachineId()
    });
    this.saveMembership(membership);
    return {
      success: true,
      message: `\u{1F389} ${config.icon} ${config.name} \u6FC0\u6D3B\u6210\u529F\uFF01\u6709\u6548\u671F\u81F3 ${expiresAt.toLocaleDateString()}`
    };
  }
  /**
   * 使用邀請碼
   */
  async applyInviteCode(code) {
    if (!code || code.length !== 8) {
      return { success: false, message: "\u9080\u8ACB\u78BC\u683C\u5F0F\u4E0D\u6B63\u78BA" };
    }
    const currentMembership = this._membership();
    if (currentMembership?.invitedBy) {
      return { success: false, message: "\u60A8\u5DF2\u7D93\u4F7F\u7528\u904E\u9080\u8ACB\u78BC" };
    }
    let expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const membership = __spreadProps(__spreadValues({}, currentMembership), {
      level: "silver",
      levelName: MEMBERSHIP_CONFIG.silver.name,
      levelIcon: MEMBERSHIP_CONFIG.silver.icon,
      expiresAt,
      invitedBy: code
    });
    this.saveMembership(membership);
    return {
      success: true,
      message: "\u{1F381} \u9080\u8ACB\u78BC\u4F7F\u7528\u6210\u529F\uFF01\u7372\u5F97 7 \u5929\u767D\u9280\u7CBE\u82F1\u9AD4\u9A57"
    };
  }
  /**
   * 添加邀請獎勵
   */
  addInviteReward(days = 3) {
    const membership = this._membership();
    if (!membership)
      return;
    let expiresAt = membership.expiresAt || /* @__PURE__ */ new Date();
    if (expiresAt < /* @__PURE__ */ new Date()) {
      expiresAt = /* @__PURE__ */ new Date();
    }
    expiresAt.setDate(expiresAt.getDate() + days);
    const updated = __spreadProps(__spreadValues({}, membership), {
      expiresAt,
      inviteCount: (membership.inviteCount || 0) + 1,
      inviteRewards: (membership.inviteRewards || 0) + days
    });
    if (updated.level === "bronze") {
      updated.level = "silver";
      updated.levelName = MEMBERSHIP_CONFIG.silver.name;
      updated.levelIcon = MEMBERSHIP_CONFIG.silver.icon;
    }
    this.saveMembership(updated);
  }
  // ============ 配額管理 ============
  /**
   * 檢查是否可以添加賬戶
   */
  canAddAccount(currentCount) {
    const maxAccounts = this.quotas().maxAccounts;
    if (maxAccounts === -1)
      return { allowed: true };
    if (currentCount >= maxAccounts) {
      return {
        allowed: false,
        message: `${this.levelIcon()} ${this.levelName()} \u6700\u591A\u652F\u6301 ${maxAccounts} \u500B\u8CEC\u6236\uFF0C\u5347\u7D1A\u89E3\u9396\u66F4\u591A`
      };
    }
    return { allowed: true };
  }
  /**
   * 檢查是否可以發送消息
   */
  canSendMessage() {
    const daily = this.quotas().dailyMessages;
    if (daily === -1)
      return { allowed: true, remaining: -1 };
    const usage = this.usage();
    const remaining = daily - usage.todayMessages;
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `\u4ECA\u65E5\u6D88\u606F\u914D\u984D\u5DF2\u7528\u5B8C (${daily}\u689D)\uFF0C\u660E\u5929\u91CD\u7F6E\u6216\u5347\u7D1A\u6703\u54E1`
      };
    }
    return { allowed: true, remaining };
  }
  /**
   * 檢查是否可以使用AI
   */
  canUseAi() {
    const daily = this.quotas().dailyAiCalls;
    if (daily === -1)
      return { allowed: true, remaining: -1 };
    const usage = this.usage();
    const remaining = daily - usage.todayAiCalls;
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `\u4ECA\u65E5AI\u914D\u984D\u5DF2\u7528\u5B8C (${daily}\u6B21)\uFF0C\u660E\u5929\u91CD\u7F6E\u6216\u5347\u7D1A\u6703\u54E1`
      };
    }
    return { allowed: true, remaining };
  }
  /**
   * 檢查功能是否可用
   */
  hasFeature(feature) {
    if (!this.isActive()) {
      return MEMBERSHIP_CONFIG.bronze.features[feature];
    }
    return this.features()[feature];
  }
  /**
   * 記錄消息發送
   */
  recordMessageSent(count = 1) {
    const membership = this._membership();
    if (!membership)
      return;
    const usage = __spreadValues({}, membership.usage);
    usage.todayMessages += count;
    usage.totalMessages += count;
    this.saveMembership(__spreadProps(__spreadValues({}, membership), { usage }));
  }
  /**
   * 記錄AI調用
   */
  recordAiCall(count = 1) {
    const membership = this._membership();
    if (!membership)
      return;
    const usage = __spreadValues({}, membership.usage);
    usage.todayAiCalls += count;
    usage.totalAiCalls += count;
    this.saveMembership(__spreadProps(__spreadValues({}, membership), { usage }));
  }
  /**
   * 記錄獲取Lead
   */
  recordLeadCaptured(count = 1) {
    const membership = this._membership();
    if (!membership)
      return;
    const usage = __spreadValues({}, membership.usage);
    usage.totalLeads += count;
    this.saveMembership(__spreadProps(__spreadValues({}, membership), { usage }));
  }
  // ============ 定價信息 ============
  /**
   * 獲取所有定價方案（王者榮耀風格）
   */
  getPricingPlans() {
    return [
      {
        level: "bronze",
        name: "\u2694\uFE0F \u9752\u9285\u6230\u58EB",
        icon: "\u2694\uFE0F",
        monthlyPrice: 0,
        yearlyPrice: 0,
        quotas: MEMBERSHIP_CONFIG.bronze.quotas,
        features: [
          "2 \u500B\u8CEC\u6236",
          "\u6BCF\u65E5 20 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 10 \u6B21 AI",
          "3 \u500B\u7FA4\u7D44 / 1 \u500B\u95DC\u9375\u8A5E\u96C6",
          "\u57FA\u790E\u76E3\u63A7\u529F\u80FD"
        ]
      },
      {
        level: "silver",
        name: "\u{1F948} \u767D\u9280\u7CBE\u82F1",
        icon: "\u{1F948}",
        monthlyPrice: 4.99,
        yearlyPrice: 49.9,
        quotas: MEMBERSHIP_CONFIG.silver.quotas,
        features: [
          "5 \u500B\u8CEC\u6236",
          "\u6BCF\u65E5 100 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 50 \u6B21 AI",
          "10 \u500B\u7FA4\u7D44 / 5 \u500B\u95DC\u9375\u8A5E\u96C6",
          "\u5EE3\u544A\u767C\u9001\u529F\u80FD",
          "\u71B1\u9580\u5BA2\u6236\u5206\u6790"
        ]
      },
      {
        level: "gold",
        name: "\u{1F947} \u9EC3\u91D1\u5927\u5E2B",
        icon: "\u{1F947}",
        monthlyPrice: 19.9,
        yearlyPrice: 199,
        quotas: MEMBERSHIP_CONFIG.gold.quotas,
        recommended: true,
        features: [
          "15 \u500B\u8CEC\u6236",
          "\u6BCF\u65E5 500 \u689D\u6D88\u606F / 300 \u6B21 AI",
          "30 \u500B\u7FA4\u7D44 / 20 \u500B\u95DC\u9375\u8A5E\u96C6",
          "\u{1F195} \u667A\u80FD\u6A21\u5F0F\u5100\u8868\u76E4",
          "\u{1F195} AI \u667A\u80FD\u6D1E\u5BDF",
          "\u6578\u64DA\u5C0E\u51FA + \u6279\u91CF\u64CD\u4F5C"
        ]
      },
      {
        level: "diamond",
        name: "\u{1F48E} \u947D\u77F3\u738B\u724C",
        icon: "\u{1F48E}",
        monthlyPrice: 59.9,
        yearlyPrice: 599,
        quotas: MEMBERSHIP_CONFIG.diamond.quotas,
        features: [
          "50 \u500B\u8CEC\u6236",
          "\u6BCF\u65E5 2000 \u689D\u6D88\u606F / \u7121\u9650 AI",
          "100 \u500B\u7FA4\u7D44 / 50 \u500B\u95DC\u9375\u8A5E\u96C6",
          "\u{1F195} AI \u7B56\u7565\u898F\u5283",
          "\u{1F195} AI \u81EA\u52D5\u57F7\u884C",
          "\u591A\u89D2\u8272\u5354\u4F5C + A/B\u6E2C\u8A66"
        ]
      },
      {
        level: "star",
        name: "\u{1F31F} \u661F\u8000\u50B3\u8AAA",
        icon: "\u{1F31F}",
        monthlyPrice: 199,
        yearlyPrice: 1999,
        quotas: MEMBERSHIP_CONFIG.star.quotas,
        features: [
          "100 \u500B\u8CEC\u6236",
          "\u6BCF\u65E5 10000 \u689D\u6D88\u606F / \u7121\u9650 AI",
          "300 \u500B\u7FA4\u7D44 / 100 \u500B\u95DC\u9375\u8A5E\u96C6",
          "API \u63A5\u53E3",
          "\u5718\u968A\u7BA1\u7406",
          "\u667A\u80FD\u9632\u5C01",
          "\u512A\u5148\u652F\u6301"
        ]
      },
      {
        level: "king",
        name: "\u{1F451} \u69AE\u8000\u738B\u8005",
        icon: "\u{1F451}",
        monthlyPrice: 599,
        yearlyPrice: 5999,
        quotas: MEMBERSHIP_CONFIG.king.quotas,
        features: [
          "\u7121\u9650\u8CEC\u6236 / \u6D88\u606F / AI",
          "\u7121\u9650\u7FA4\u7D44 / \u95DC\u9375\u8A5E\u96C6 / \u898F\u5247",
          "\u6240\u6709\u529F\u80FD\u5168\u90E8\u89E3\u9396",
          "\u81EA\u5B9A\u7FA9\u54C1\u724C",
          "1\u5C0D1 \u5C08\u5C6C\u9867\u554F",
          "\u65B0\u529F\u80FD\u5167\u6E2C\u9AD4\u9A57"
        ]
      }
    ];
  }
  /**
   * 獲取升級建議（王者榮耀風格）
   */
  getUpgradeSuggestion() {
    const current = this.level();
    const upgradeMap = {
      bronze: "silver",
      silver: "gold",
      gold: "diamond",
      diamond: "star",
      star: "king",
      king: null
    };
    const nextLevel = upgradeMap[current];
    if (!nextLevel)
      return null;
    const currentConfig = MEMBERSHIP_CONFIG[current];
    const nextConfig = MEMBERSHIP_CONFIG[nextLevel];
    const benefits = [];
    const currAccounts = currentConfig.quotas.maxAccounts === -1 ? "\u7121\u9650" : currentConfig.quotas.maxAccounts;
    const nextAccounts = nextConfig.quotas.maxAccounts === -1 ? "\u7121\u9650" : nextConfig.quotas.maxAccounts;
    if (nextAccounts !== currAccounts) {
      benefits.push(`\u8CEC\u6236\u6578\u91CF ${currAccounts} \u2192 ${nextAccounts}`);
    }
    const currMsg = currentConfig.quotas.dailyMessages === -1 ? "\u7121\u9650" : currentConfig.quotas.dailyMessages;
    const nextMsg = nextConfig.quotas.dailyMessages === -1 ? "\u7121\u9650" : nextConfig.quotas.dailyMessages;
    if (nextMsg !== currMsg) {
      benefits.push(`\u6BCF\u65E5\u6D88\u606F ${currMsg} \u2192 ${nextMsg}`);
    }
    if (nextConfig.quotas.dailyAiCalls === -1 && currentConfig.quotas.dailyAiCalls !== -1) {
      benefits.push(`AI \u8ABF\u7528 ${currentConfig.quotas.dailyAiCalls} \u2192 \u7121\u9650`);
    }
    if (nextConfig.features.adBroadcast && !currentConfig.features.adBroadcast) {
      benefits.push("\u26A1 \u89E3\u9396\u5EE3\u544A\u767C\u9001");
    }
    if (nextConfig.features.multiRole && !currentConfig.features.multiRole) {
      benefits.push("\u{1F3AD} \u89E3\u9396\u591A\u89D2\u8272\u5354\u4F5C");
    }
    if (nextConfig.features.aiSalesFunnel && !currentConfig.features.aiSalesFunnel) {
      benefits.push("\u{1F3AF} \u89E3\u9396 AI \u92B7\u552E\u6F0F\u6597");
    }
    if (nextConfig.features.smartAntiBlock && !currentConfig.features.smartAntiBlock) {
      benefits.push("\u{1F6E1}\uFE0F \u89E3\u9396\u667A\u80FD\u9632\u5C01");
    }
    if (nextConfig.features.apiAccess && !currentConfig.features.apiAccess) {
      benefits.push("\u{1F50C} \u89E3\u9396 API \u63A5\u53E3");
    }
    return {
      nextLevel,
      benefits,
      price: nextConfig.monthlyPrice
    };
  }
  // ============ 輔助方法 ============
  saveMembership(membership) {
    this._membership.set(membership);
    localStorage.setItem(_MembershipService.STORAGE_KEY, JSON.stringify(membership));
  }
  getMachineId() {
    let machineId = localStorage.getItem("tg-matrix-machine-id");
    if (!machineId) {
      machineId = "mid-" + this.generateId();
      localStorage.setItem("tg-matrix-machine-id", machineId);
    }
    return machineId;
  }
  generateId() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  generateInviteCode() {
    return this.generateId().substring(0, 8).toUpperCase();
  }
  getDefaultUsage() {
    return {
      todayMessages: 0,
      todayAiCalls: 0,
      todayDate: (/* @__PURE__ */ new Date()).toDateString(),
      totalMessages: 0,
      totalAiCalls: 0,
      totalLeads: 0
    };
  }
  checkAndResetDailyUsage(membership) {
    const today = (/* @__PURE__ */ new Date()).toDateString();
    if (membership.usage.todayDate !== today) {
      membership.usage.todayMessages = 0;
      membership.usage.todayAiCalls = 0;
      membership.usage.todayDate = today;
    }
  }
  /**
   * 獲取會員狀態顯示文字
   */
  getStatusText() {
    const m = this._membership();
    if (!m)
      return "\u672A\u77E5";
    if (m.level === "bronze") {
      return `${m.levelIcon} ${m.levelName}`;
    }
    if (!this.isActive()) {
      return `${m.levelIcon} ${m.levelName} (\u5DF2\u904E\u671F)`;
    }
    const days = this.daysRemaining();
    if (days <= 7) {
      return `${m.levelIcon} ${m.levelName} (${days}\u5929\u5F8C\u5230\u671F)`;
    }
    return `${m.levelIcon} ${m.levelName}`;
  }
  /**
   * 獲取段位顯示文字（王者榮耀風格）
   */
  getRankDisplay() {
    const level = this.level();
    const config = MEMBERSHIP_CONFIG[level];
    const colorMap = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      diamond: "#B9F2FF",
      star: "#9B59B6",
      king: "#FF6B6B"
    };
    return {
      name: config.name,
      icon: config.icon,
      rank: config.rank,
      color: colorMap[level]
    };
  }
  /**
   * 獲取使用量百分比
   */
  getUsagePercentage() {
    const quotas = this.quotas();
    const usage = this.usage();
    return {
      messages: quotas.dailyMessages === -1 ? 0 : Math.min(100, usage.todayMessages / quotas.dailyMessages * 100),
      ai: quotas.dailyAiCalls === -1 ? 0 : Math.min(100, usage.todayAiCalls / quotas.dailyAiCalls * 100)
    };
  }
  static {
    this.\u0275fac = function MembershipService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MembershipService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MembershipService, factory: _MembershipService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MembershipService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  ToastService,
  MembershipService
};
//# sourceMappingURL=chunk-P26VRYR4.js.map
