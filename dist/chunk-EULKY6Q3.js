import {
  ApiService
} from "./chunk-HOUP2MV6.js";
import {
  Injectable,
  __spreadProps,
  __spreadValues,
  computed,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable,
  ɵɵinject
} from "./chunk-K4KD4A2Z.js";

// src/services/wallet.service.ts
var WalletService = class _WalletService {
  constructor(api) {
    this.api = api;
    this._wallet = signal(null, ...ngDevMode ? [{ debugName: "_wallet" }] : []);
    this.wallet = this._wallet.asReadonly();
    this._transactions = signal([], ...ngDevMode ? [{ debugName: "_transactions" }] : []);
    this.transactions = this._transactions.asReadonly();
    this._rechargePackages = signal([], ...ngDevMode ? [{ debugName: "_rechargePackages" }] : []);
    this.rechargePackages = this._rechargePackages.asReadonly();
    this._statistics = signal(null, ...ngDevMode ? [{ debugName: "_statistics" }] : []);
    this.statistics = this._statistics.asReadonly();
    this._loading = signal(false, ...ngDevMode ? [{ debugName: "_loading" }] : []);
    this.loading = this._loading.asReadonly();
    this._lastUpdated = signal(null, ...ngDevMode ? [{ debugName: "_lastUpdated" }] : []);
    this.lastUpdated = this._lastUpdated.asReadonly();
    this.STALE_TIME = 3e4;
    this.AUTO_REFRESH_INTERVAL = 6e4;
    this.autoRefreshTimer = null;
    this.balance = computed(() => this._wallet()?.available_balance ?? 0, ...ngDevMode ? [{ debugName: "balance" }] : []);
    this.balanceDisplay = computed(() => this._wallet()?.total_display ?? "$0.00", ...ngDevMode ? [{ debugName: "balanceDisplay" }] : []);
    this.hasBalance = computed(() => this.balance() > 0, ...ngDevMode ? [{ debugName: "hasBalance" }] : []);
    this.isStale = computed(() => {
      const lastUpdate = this._lastUpdated();
      if (!lastUpdate)
        return true;
      return Date.now() - lastUpdate.getTime() > this.STALE_TIME;
    }, ...ngDevMode ? [{ debugName: "isStale" }] : []);
    this.isFrozen = computed(() => this._wallet()?.status === "frozen", ...ngDevMode ? [{ debugName: "isFrozen" }] : []);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.isStale()) {
          this.loadWallet();
        }
      });
    }
  }
  // P2: 啟動自動刷新
  startAutoRefresh() {
    if (this.autoRefreshTimer)
      return;
    this.autoRefreshTimer = setInterval(() => {
      if (!document.hidden) {
        this.loadWallet();
      }
    }, this.AUTO_REFRESH_INTERVAL);
  }
  // P2: 停止自動刷新
  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }
  // P2: 強制刷新
  async forceRefresh() {
    return this.loadWallet(true);
  }
  /**
   * 獲取錢包信息
   * @param forceRefresh 強制刷新，忽略緩存
   */
  async loadWallet(forceRefresh = false) {
    if (!forceRefresh && !this.isStale() && this._wallet()) {
      return this._wallet();
    }
    this._loading.set(true);
    try {
      const response = await this.api.get("/api/wallet", {
        cache: false
        // 確保獲取最新數據
      });
      if (response?.success && response?.data) {
        this._wallet.set(response.data);
        this._lastUpdated.set(/* @__PURE__ */ new Date());
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Load wallet error:", error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * P2: 樂觀更新餘額（用於兌換碼等操作後的即時反饋）
   * @param amountChange 餘額變化量（分）
   * @param bonusChange 贈送餘額變化量（分）
   */
  optimisticUpdateBalance(amountChange, bonusChange = 0) {
    const current = this._wallet();
    if (!current)
      return;
    const updated = __spreadProps(__spreadValues({}, current), {
      balance: current.balance + amountChange,
      bonus_balance: current.bonus_balance + bonusChange,
      available_balance: current.available_balance + amountChange + bonusChange,
      balance_display: `$${((current.balance + amountChange) / 100).toFixed(2)}`,
      bonus_display: `$${((current.bonus_balance + bonusChange) / 100).toFixed(2)}`,
      total_display: `$${((current.available_balance + amountChange + bonusChange) / 100).toFixed(2)}`,
      total_recharged: current.total_recharged + (amountChange > 0 ? amountChange : 0)
    });
    this._wallet.set(updated);
    this._lastUpdated.set(/* @__PURE__ */ new Date());
  }
  /**
   * P2: 標記數據為過期，下次訪問時強制刷新
   */
  invalidateCache() {
    this._lastUpdated.set(null);
  }
  /**
   * 獲取餘額
   */
  async getBalance() {
    try {
      const response = await this.api.get("/api/wallet/balance");
      if (response?.success && response?.data) {
        return {
          balance: response.data.available_balance,
          display: response.data.total_display
        };
      }
      return null;
    } catch (error) {
      console.error("Get balance error:", error);
      return null;
    }
  }
  /**
   * 獲取統計信息
   */
  async loadStatistics() {
    try {
      const response = await this.api.get("/api/wallet/statistics");
      if (response?.success && response?.data) {
        this._statistics.set(response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Load statistics error:", error);
      return null;
    }
  }
  /**
   * 獲取交易記錄
   */
  async loadTransactions(options) {
    this._loading.set(true);
    try {
      const params = new URLSearchParams();
      if (options?.page)
        params.set("page", String(options.page));
      if (options?.pageSize)
        params.set("page_size", String(options.pageSize));
      if (options?.type)
        params.set("type", options.type);
      if (options?.category)
        params.set("category", options.category);
      if (options?.status)
        params.set("status", options.status);
      if (options?.startDate)
        params.set("start_date", options.startDate);
      if (options?.endDate)
        params.set("end_date", options.endDate);
      const url = `/api/wallet/transactions${params.toString() ? "?" + params.toString() : ""}`;
      const response = await this.api.get(url);
      if (response?.success && response?.data) {
        this._transactions.set(response.data.transactions);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Load transactions error:", error);
      return null;
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * 獲取最近交易
   */
  async getRecentTransactions(limit = 5) {
    try {
      const response = await this.api.get(`/api/wallet/transactions/recent?limit=${limit}`);
      if (response?.success && response?.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Get recent transactions error:", error);
      return [];
    }
  }
  /**
   * 獲取消費分析
   */
  async getConsumeAnalysis(startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (startDate)
        params.set("start_date", startDate);
      if (endDate)
        params.set("end_date", endDate);
      const url = `/api/wallet/analysis/consume${params.toString() ? "?" + params.toString() : ""}`;
      const response = await this.api.get(url);
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Get consume analysis error:", error);
      return null;
    }
  }
  /**
   * 獲取月度摘要
   */
  async getMonthlySummary(months = 6) {
    try {
      const response = await this.api.get(`/api/wallet/analysis/monthly?months=${months}`);
      if (response?.success && response?.data) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Get monthly summary error:", error);
      return [];
    }
  }
  /**
   * 獲取充值套餐
   */
  async loadRechargePackages() {
    try {
      const response = await this.api.get("/api/wallet/packages");
      if (response?.success && response?.data) {
        this._rechargePackages.set(response.data);
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Load recharge packages error:", error);
      return [];
    }
  }
  /**
   * 消費餘額
   */
  async consume(options) {
    try {
      const response = await this.api.post("/api/wallet/consume", {
        amount: options.amount,
        category: options.category,
        description: options.description,
        order_id: options.orderId,
        reference_id: options.referenceId,
        reference_type: options.referenceType
      });
      if (response?.success) {
        await this.loadWallet();
        return {
          success: true,
          transaction: response.data?.transaction,
          newBalance: response.data?.new_balance
        };
      }
      return { success: false, error: response?.error || "\u6D88\u8CBB\u5931\u6557" };
    } catch (error) {
      console.error("Consume error:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 檢查餘額是否足夠
   */
  async checkBalance(amount) {
    try {
      const response = await this.api.post("/api/wallet/check-balance", { amount });
      if (response?.success && response?.data) {
        return response.data;
      }
      return {
        sufficient: false,
        required: amount,
        available: 0,
        shortfall: amount
      };
    } catch (error) {
      console.error("Check balance error:", error);
      return {
        sufficient: false,
        required: amount,
        available: 0,
        shortfall: amount
      };
    }
  }
  /**
   * 導出交易記錄
   */
  async exportTransactions(startDate, endDate) {
    try {
      const params = new URLSearchParams();
      if (startDate)
        params.set("start_date", startDate);
      if (endDate)
        params.set("end_date", endDate);
      const url = `/api/wallet/transactions/export${params.toString() ? "?" + params.toString() : ""}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error("Export transactions error:", error);
    }
  }
  /**
   * 格式化金額
   */
  formatAmount(cents, currency = "USD") {
    const amount = cents / 100;
    const symbols = {
      USD: "$",
      CNY: "\xA5",
      EUR: "\u20AC"
    };
    const symbol = symbols[currency] || "$";
    return `${symbol}${amount.toFixed(2)}`;
  }
  /**
   * 獲取交易類型名稱
   */
  getTypeName(type) {
    const names = {
      recharge: "\u5145\u503C",
      consume: "\u6D88\u8CBB",
      refund: "\u9000\u6B3E",
      withdraw: "\u63D0\u73FE",
      bonus: "\u8D08\u9001",
      adjust: "\u8ABF\u8CEC"
    };
    return names[type] || type;
  }
  /**
   * 獲取交易類型圖標
   */
  getTypeIcon(type) {
    const icons = {
      recharge: "\u{1F4B0}",
      consume: "\u{1F6D2}",
      refund: "\u21A9\uFE0F",
      withdraw: "\u{1F4B8}",
      bonus: "\u{1F381}",
      adjust: "\u2699\uFE0F"
    };
    return icons[type] || "\u{1F4CB}";
  }
  /**
   * 獲取狀態標籤
   */
  getStatusLabel(status) {
    const labels = {
      pending: { text: "\u8655\u7406\u4E2D", color: "#f59e0b" },
      success: { text: "\u6210\u529F", color: "#22c55e" },
      failed: { text: "\u5931\u6557", color: "#ef4444" },
      cancelled: { text: "\u5DF2\u53D6\u6D88", color: "#6b7280" },
      refunded: { text: "\u5DF2\u9000\u6B3E", color: "#8b5cf6" }
    };
    return labels[status] || { text: status, color: "#666" };
  }
  /**
   * 獲取類目名稱
   */
  getCategoryName(category) {
    const names = {
      membership: "\u6703\u54E1\u670D\u52D9",
      ip_proxy: "\u975C\u614B IP",
      quota_pack: "\u914D\u984D\u5305",
      other: "\u5176\u4ED6"
    };
    return names[category] || category || "\u5176\u4ED6";
  }
  /**
   * 刷新所有數據
   */
  async refresh() {
    await Promise.all([
      this.loadWallet(),
      this.loadStatistics(),
      this.loadRechargePackages()
    ]);
  }
  // ==================== Phase 1: 充值訂單 ====================
  /**
   * 創建充值訂單
   */
  async createRechargeOrder(options) {
    try {
      const response = await this.api.post("/api/wallet/recharge/create", {
        amount: options.amount,
        payment_method: options.paymentMethod,
        payment_channel: options.paymentChannel || "direct"
      });
      if (response?.success && response?.data) {
        return {
          success: true,
          order: response.data.order,
          paymentInfo: response.data.payment_info
        };
      }
      return { success: false, error: response?.error || "\u5275\u5EFA\u8A02\u55AE\u5931\u6557" };
    } catch (error) {
      console.error("Create recharge order error:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 獲取充值訂單詳情
   */
  async getRechargeOrder(orderNo) {
    try {
      const response = await this.api.get(`/api/wallet/recharge/${orderNo}`);
      if (response?.success && response?.data) {
        return {
          order: response.data.order,
          paymentInfo: response.data.payment_info
        };
      }
      return null;
    } catch (error) {
      console.error("Get recharge order error:", error);
      return null;
    }
  }
  /**
   * 獲取充值訂單列表
   */
  async getRechargeOrders(options) {
    try {
      const params = new URLSearchParams();
      if (options?.page)
        params.set("page", String(options.page));
      if (options?.pageSize)
        params.set("page_size", String(options.pageSize));
      if (options?.status)
        params.set("status", options.status);
      const url = `/api/wallet/recharge/orders${params.toString() ? "?" + params.toString() : ""}`;
      const response = await this.api.get(url);
      if (response?.success && response?.data) {
        return {
          orders: response.data.orders,
          pagination: response.data.pagination
        };
      }
      return null;
    } catch (error) {
      console.error("Get recharge orders error:", error);
      return null;
    }
  }
  /**
   * 標記訂單已支付
   */
  async markRechargeOrderPaid(orderNo, txHash) {
    try {
      const response = await this.api.post(`/api/wallet/recharge/${orderNo}/paid`, {
        tx_hash: txHash
      });
      if (response?.success) {
        return { success: true };
      }
      return { success: false, error: response?.error || "\u6A19\u8A18\u5931\u6557" };
    } catch (error) {
      console.error("Mark recharge order paid error:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 取消充值訂單
   */
  async cancelRechargeOrder(orderNo) {
    try {
      const response = await this.api.post(`/api/wallet/recharge/${orderNo}/cancel`, {});
      if (response?.success) {
        return { success: true };
      }
      return { success: false, error: response?.error || "\u53D6\u6D88\u5931\u6557" };
    } catch (error) {
      console.error("Cancel recharge order error:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 檢查充值訂單狀態
   */
  async checkRechargeOrderStatus(orderNo) {
    try {
      const response = await this.api.get(`/api/wallet/recharge/${orderNo}/status`);
      if (response?.success && response?.data) {
        return {
          status: response.data.status,
          isConfirmed: response.data.is_confirmed,
          isPending: response.data.is_pending,
          isExpired: response.data.is_expired,
          confirmedAt: response.data.confirmed_at
        };
      }
      return null;
    } catch (error) {
      console.error("Check recharge order status error:", error);
      return null;
    }
  }
  /**
   * 輪詢充值訂單狀態
   */
  async pollRechargeOrderStatus(orderNo, intervalMs = 5e3, maxAttempts = 60) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const result = await this.checkRechargeOrderStatus(orderNo);
      if (!result) {
        return { success: false, confirmed: false };
      }
      if (result.isConfirmed) {
        await this.loadWallet();
        return { success: true, confirmed: true };
      }
      if (result.isExpired) {
        return { success: false, confirmed: false };
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return { success: false, confirmed: false };
  }
  /**
   * 獲取充值訂單狀態標籤
   */
  getRechargeStatusLabel(status) {
    const labels = {
      pending: { text: "\u5F85\u652F\u4ED8", color: "#f59e0b" },
      paid: { text: "\u5DF2\u652F\u4ED8", color: "#3b82f6" },
      confirmed: { text: "\u5DF2\u5230\u8CEC", color: "#22c55e" },
      failed: { text: "\u5931\u6557", color: "#ef4444" },
      expired: { text: "\u5DF2\u904E\u671F", color: "#9ca3af" },
      refunded: { text: "\u5DF2\u9000\u6B3E", color: "#8b5cf6" }
    };
    return labels[status] || { text: status, color: "#666" };
  }
  // ==================== Phase 2: 消費接入 ====================
  /**
   * 統一消費接口
   */
  async consumeUnified(options) {
    try {
      const response = await this.api.post("/api/wallet/consume/unified", {
        amount: options.amount,
        category: options.category,
        description: options.description,
        reference_id: options.referenceId,
        reference_type: options.referenceType,
        order_id: options.orderId
      });
      if (response?.success) {
        await this.loadWallet();
        return {
          success: true,
          transactionId: response.data?.transaction_id,
          balanceBefore: response.data?.balance_before,
          balanceAfter: response.data?.balance_after
        };
      }
      return { success: false, error: response?.error || "\u6D88\u8CBB\u5931\u6557" };
    } catch (error) {
      console.error("Consume unified error:", error);
      return { success: false, error: String(error) };
    }
  }
  /**
   * 檢查消費限額
   */
  async checkConsumeLimit(amount, category) {
    try {
      const response = await this.api.get(`/api/wallet/consume/limit?amount=${amount}&category=${category}`);
      if (response?.success && response?.data) {
        return {
          canConsume: response.data.can_consume,
          limitPassed: response.data.limit_passed,
          limitError: response.data.limit_error,
          requiresPassword: response.data.requires_password,
          balanceSufficient: response.data.balance_sufficient,
          balanceInfo: response.data.balance_info
        };
      }
      return {
        canConsume: false,
        limitPassed: false,
        requiresPassword: false,
        balanceSufficient: false,
        balanceInfo: null
      };
    } catch (error) {
      console.error("Check consume limit error:", error);
      return {
        canConsume: false,
        limitPassed: false,
        requiresPassword: false,
        balanceSufficient: false,
        balanceInfo: null
      };
    }
  }
  /**
   * 獲取消費摘要
   */
  async getConsumeSummary(days = 30) {
    try {
      const response = await this.api.get(`/api/wallet/consume/summary?days=${days}`);
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Get consume summary error:", error);
      return null;
    }
  }
  /**
   * 退款
   */
  async refund(originalOrderId, amount, reason) {
    try {
      const response = await this.api.post("/api/wallet/refund", {
        original_order_id: originalOrderId,
        amount,
        reason
      });
      if (response?.success) {
        await this.loadWallet();
        return {
          success: true,
          transactionId: response.data?.transaction_id,
          refundAmount: response.data?.refund_amount
        };
      }
      return { success: false, error: response?.error || "\u9000\u6B3E\u5931\u6557" };
    } catch (error) {
      console.error("Refund error:", error);
      return { success: false, error: String(error) };
    }
  }
  static {
    this.\u0275fac = function WalletService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletService)(\u0275\u0275inject(ApiService));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _WalletService, factory: _WalletService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: ApiService }], null);
})();

export {
  WalletService
};
//# sourceMappingURL=chunk-EULKY6Q3.js.map
