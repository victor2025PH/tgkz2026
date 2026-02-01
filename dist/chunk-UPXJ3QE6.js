import {
  ElectronIpcService
} from "./chunk-355UGVEO.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable,
  ɵɵinject
} from "./chunk-Y4VZODST.js";

// src/services/quota.service.ts
var QuotaService = class _QuotaService {
  constructor(ipc) {
    this.ipc = ipc;
    this._quotaSummary = signal(null, ...ngDevMode ? [{ debugName: "_quotaSummary" }] : []);
    this.quotaSummary = this._quotaSummary.asReadonly();
    this._levels = signal([], ...ngDevMode ? [{ debugName: "_levels" }] : []);
    this.levels = this._levels.asReadonly();
    this._alerts = signal([], ...ngDevMode ? [{ debugName: "_alerts" }] : []);
    this.alerts = this._alerts.asReadonly();
    this._loading = signal(false, ...ngDevMode ? [{ debugName: "_loading" }] : []);
    this.loading = this._loading.asReadonly();
    this.currentTier = computed(() => this._quotaSummary()?.tier || "bronze", ...ngDevMode ? [{ debugName: "currentTier" }] : []);
    this.currentTierName = computed(() => this._quotaSummary()?.tier_name || "\u9752\u9285\u6230\u58EB", ...ngDevMode ? [{ debugName: "currentTierName" }] : []);
    this.hasWarnings = computed(() => this._quotaSummary()?.has_warnings || false, ...ngDevMode ? [{ debugName: "hasWarnings" }] : []);
    this.hasExceeded = computed(() => this._quotaSummary()?.has_exceeded || false, ...ngDevMode ? [{ debugName: "hasExceeded" }] : []);
    this.unacknowledgedAlerts = computed(() => this._alerts().filter((a) => !a.acknowledged).length, ...ngDevMode ? [{ debugName: "unacknowledgedAlerts" }] : []);
    this.quotaDisplayNames = {
      tg_accounts: "TG \u5E33\u865F",
      daily_messages: "\u6BCF\u65E5\u6D88\u606F",
      ai_calls: "AI \u8ABF\u7528",
      devices: "\u8A2D\u5099\u6578",
      groups: "\u7FA4\u7D44\u6578",
      keyword_sets: "\u95DC\u9375\u8A5E\u96C6",
      auto_reply_rules: "\u81EA\u52D5\u56DE\u8986",
      scheduled_tasks: "\u5B9A\u6642\u4EFB\u52D9"
    };
  }
  /**
   * 加載配額摘要
   */
  async loadQuotaSummary() {
    this._loading.set(true);
    try {
      const response = await this.ipc.invoke("get-quota-status", {});
      if (response?.success && response?.data) {
        this._quotaSummary.set(response.data);
      }
    } catch (error) {
      console.error("Failed to load quota summary:", error);
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * 檢查特定配額
   */
  async checkQuota(quotaType, amount = 1) {
    try {
      const response = await this.ipc.invoke("check-quota", { quota_type: quotaType, amount });
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to check quota:", error);
      return null;
    }
  }
  /**
   * 加載配額告警
   */
  async loadAlerts() {
    try {
      const response = await this.ipc.invoke("get-quota-alerts", {});
      if (response?.success && response?.data?.alerts) {
        this._alerts.set(response.data.alerts);
      }
    } catch (error) {
      console.error("Failed to load alerts:", error);
    }
  }
  /**
   * 確認告警
   */
  async acknowledgeAlert(alertId) {
    try {
      const response = await this.ipc.invoke("acknowledge-quota-alert", { alert_id: alertId });
      if (response?.success) {
        this._alerts.update((alerts) => alerts.map((a) => a.id === alertId ? __spreadProps(__spreadValues({}, a), { acknowledged: true }) : a));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      return false;
    }
  }
  /**
   * 加載會員等級列表
   */
  async loadMembershipLevels() {
    try {
      const response = await this.ipc.invoke("get-membership-levels", {});
      if (response?.success && response?.data?.levels) {
        this._levels.set(response.data.levels);
      }
    } catch (error) {
      console.error("Failed to load membership levels:", error);
    }
  }
  /**
   * 獲取配額信息
   */
  getQuotaInfo(quotaType) {
    const summary = this._quotaSummary();
    return summary?.quotas?.[quotaType] || null;
  }
  /**
   * 獲取配額顯示名稱
   */
  getQuotaDisplayName(quotaType) {
    return this.quotaDisplayNames[quotaType] || quotaType;
  }
  /**
   * 格式化配額值
   */
  formatQuotaValue(value) {
    if (value === -1)
      return "\u221E";
    if (value >= 1e6)
      return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3)
      return `${(value / 1e3).toFixed(1)}K`;
    return value.toString();
  }
  /**
   * 獲取狀態顏色
   */
  getStatusColor(status) {
    const colors = {
      ok: "#22c55e",
      warning: "#f59e0b",
      critical: "#ef4444",
      exceeded: "#dc2626",
      unlimited: "#8b5cf6"
    };
    return colors[status] || "#666";
  }
  /**
   * 獲取狀態圖標
   */
  getStatusIcon(status) {
    const icons = {
      ok: "\u2713",
      warning: "\u26A0\uFE0F",
      critical: "\u26A1",
      exceeded: "\u{1F6AB}",
      unlimited: "\u221E"
    };
    return icons[status] || "";
  }
  /**
   * 獲取升級選項
   */
  getUpgradeOptions() {
    const currentTier = this.currentTier();
    const levels = this._levels();
    const currentOrder = levels.find((l) => l.level === currentTier)?.order ?? 0;
    return levels.filter((l) => l.order > currentOrder);
  }
  /**
   * 是否可以執行操作（基於配額）
   */
  canPerformAction(quotaType, amount = 1) {
    const info = this.getQuotaInfo(quotaType);
    if (!info)
      return true;
    if (info.unlimited)
      return true;
    return info.remaining >= amount;
  }
  /**
   * 刷新所有配額數據
   */
  async refresh() {
    await Promise.all([
      this.loadQuotaSummary(),
      this.loadAlerts()
    ]);
  }
  /**
   * 獲取配額使用趨勢數據
   */
  async loadTrendData(period = "7d", types = ["daily_messages", "ai_calls"]) {
    try {
      const response = await this.ipc.invoke("get-quota-trend", {
        period,
        types: types.join(",")
      });
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to load trend data:", error);
      return null;
    }
  }
  /**
   * 獲取配額使用歷史
   */
  async loadHistory(limit = 50, offset = 0, type) {
    try {
      const params = { limit, offset };
      if (type)
        params.type = type;
      const response = await this.ipc.invoke("get-quota-history", params);
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Failed to load history:", error);
      return null;
    }
  }
  static {
    this.\u0275fac = function QuotaService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QuotaService)(\u0275\u0275inject(ElectronIpcService));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _QuotaService, factory: _QuotaService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuotaService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: ElectronIpcService }], null);
})();

export {
  QuotaService
};
//# sourceMappingURL=chunk-UPXJ3QE6.js.map
