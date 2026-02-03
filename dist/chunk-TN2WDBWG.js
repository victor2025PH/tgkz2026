import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgModel,
  NumberValueAccessor
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  NgForOf,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵinject,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵreference,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtemplateRefExtractor,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/services/payment.service.ts
var PaymentService = class _PaymentService {
  constructor(ipc) {
    this.ipc = ipc;
    this._currentIntent = signal(null, ...ngDevMode ? [{ debugName: "_currentIntent" }] : []);
    this.currentIntent = this._currentIntent.asReadonly();
    this._paymentHistory = signal([], ...ngDevMode ? [{ debugName: "_paymentHistory" }] : []);
    this.paymentHistory = this._paymentHistory.asReadonly();
    this._invoices = signal([], ...ngDevMode ? [{ debugName: "_invoices" }] : []);
    this.invoices = this._invoices.asReadonly();
    this._loading = signal(false, ...ngDevMode ? [{ debugName: "_loading" }] : []);
    this.loading = this._loading.asReadonly();
    this.hasActivePayment = computed(() => {
      const intent = this._currentIntent();
      return intent && ["created", "pending", "processing"].includes(intent.state);
    }, ...ngDevMode ? [{ debugName: "hasActivePayment" }] : []);
    this.completedPayments = computed(() => this._paymentHistory().filter((p) => p.state === "completed"), ...ngDevMode ? [{ debugName: "completedPayments" }] : []);
  }
  /**
   * 創建支付
   */
  async createPayment(options) {
    this._loading.set(true);
    try {
      const response = await this.ipc.invoke("create-payment", {
        amount: options.amount,
        currency: options.currency || "CNY",
        provider: options.provider || "demo",
        payment_type: options.paymentType || "one_time",
        description: options.description || "",
        metadata: options.metadata || {},
        success_url: options.successUrl,
        cancel_url: options.cancelUrl
      });
      if (response?.success && response?.data) {
        const intent = response.data;
        this._currentIntent.set(intent);
        return { success: true, intent };
      }
      return { success: false, error: response?.error || "\u5275\u5EFA\u652F\u4ED8\u5931\u6557" };
    } catch (error) {
      console.error("Create payment error:", error);
      return { success: false, error: String(error) };
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * 檢查支付狀態
   */
  async checkPaymentStatus(intentId) {
    try {
      const response = await this.ipc.invoke("get-payment-status", {
        intent_id: intentId
      });
      if (response?.success && response?.data) {
        if (response.data.intent) {
          this._currentIntent.set(response.data.intent);
        }
        return {
          success: true,
          paid: response.data.paid,
          state: response.data.state
        };
      }
      return { success: false, paid: false, state: "failed", error: response?.error };
    } catch (error) {
      console.error("Check payment status error:", error);
      return { success: false, paid: false, state: "failed", error: String(error) };
    }
  }
  /**
   * 輪詢支付狀態
   */
  async pollPaymentStatus(intentId, intervalMs = 3e3, maxAttempts = 60) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const result = await this.checkPaymentStatus(intentId);
      if (result.paid || result.state === "completed") {
        return { success: true, paid: true };
      }
      if (["failed", "cancelled", "expired", "refunded"].includes(result.state)) {
        return { success: false, paid: false };
      }
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return { success: false, paid: false };
  }
  /**
   * 加載支付歷史
   */
  async loadPaymentHistory(limit = 50) {
    try {
      const response = await this.ipc.invoke("get-payment-history", { limit });
      if (response?.success && response?.data?.payments) {
        this._paymentHistory.set(response.data.payments);
      }
    } catch (error) {
      console.error("Load payment history error:", error);
    }
  }
  /**
   * 加載發票列表
   */
  async loadInvoices(limit = 50) {
    try {
      const response = await this.ipc.invoke("get-invoices", { limit });
      if (response?.success && response?.data?.invoices) {
        this._invoices.set(response.data.invoices);
      }
    } catch (error) {
      console.error("Load invoices error:", error);
    }
  }
  /**
   * 獲取發票詳情
   */
  async getInvoiceDetail(invoiceId) {
    try {
      const response = await this.ipc.invoke("get-invoice-detail", {
        invoice_id: invoiceId
      });
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error("Get invoice detail error:", error);
      return null;
    }
  }
  /**
   * 打開支付頁面
   */
  openPaymentPage(intent) {
    if (intent.pay_url) {
      window.open(intent.pay_url, "_blank");
    }
  }
  /**
   * 格式化金額
   */
  formatAmount(cents, currency = "CNY") {
    const amount = cents / 100;
    const symbols = {
      CNY: "\xA5",
      USD: "$",
      EUR: "\u20AC",
      GBP: "\xA3"
    };
    const symbol = symbols[currency.toUpperCase()] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
  /**
   * 獲取支付提供商圖標
   */
  getProviderIcon(provider) {
    const icons = {
      stripe: "\u{1F4B3}",
      paypal: "\u{1F17F}\uFE0F",
      alipay: "\u{1F499}",
      wechat: "\u{1F49A}",
      usdt: "\u{1F4B0}",
      demo: "\u{1F3AE}"
    };
    return icons[provider] || "\u{1F4B3}";
  }
  /**
   * 獲取支付提供商名稱
   */
  getProviderName(provider) {
    const names = {
      stripe: "Stripe",
      paypal: "PayPal",
      alipay: "\u652F\u4ED8\u5BF6",
      wechat: "\u5FAE\u4FE1\u652F\u4ED8",
      usdt: "USDT",
      demo: "\u6F14\u793A\u652F\u4ED8"
    };
    return names[provider] || provider;
  }
  /**
   * 獲取支付狀態標籤
   */
  getStateLabel(state) {
    const labels = {
      created: { text: "\u5DF2\u5275\u5EFA", color: "#6b7280" },
      pending: { text: "\u5F85\u652F\u4ED8", color: "#f59e0b" },
      processing: { text: "\u8655\u7406\u4E2D", color: "#3b82f6" },
      completed: { text: "\u5DF2\u5B8C\u6210", color: "#22c55e" },
      failed: { text: "\u5931\u6557", color: "#ef4444" },
      cancelled: { text: "\u5DF2\u53D6\u6D88", color: "#6b7280" },
      refunded: { text: "\u5DF2\u9000\u6B3E", color: "#8b5cf6" },
      expired: { text: "\u5DF2\u904E\u671F", color: "#9ca3af" }
    };
    return labels[state] || { text: state, color: "#666" };
  }
  /**
   * 清除當前支付意圖
   */
  clearCurrentIntent() {
    this._currentIntent.set(null);
  }
  static {
    this.\u0275fac = function PaymentService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _PaymentService)(\u0275\u0275inject(ElectronIpcService));
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _PaymentService, factory: _PaymentService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PaymentService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{ type: ElectronIpcService }], null);
})();

// src/views/payment-view.component.ts
function PaymentViewComponent_button_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 8);
    \u0275\u0275listener("click", function PaymentViewComponent_button_5_Template_button_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.activeTab.set(tab_r2.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.activeTab() === tab_r2.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", tab_r2.icon, " ", tab_r2.label, " ");
  }
}
function PaymentViewComponent_div_6_button_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 8);
    \u0275\u0275listener("click", function PaymentViewComponent_div_6_button_17_Template_button_click_0_listener() {
      const p_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.selectedProvider.set(p_r6.value));
    });
    \u0275\u0275elementStart(1, "span", 19);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 20);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const p_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("selected", ctx_r2.selectedProvider() === p_r6.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r6.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(p_r6.name);
  }
}
function PaymentViewComponent_div_6_div_20_button_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 32);
    \u0275\u0275listener("click", function PaymentViewComponent_div_6_div_20_button_14_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.payment.openPaymentPage(ctx_r2.payment.currentIntent()));
    });
    \u0275\u0275text(1, " \u6253\u958B\u652F\u4ED8\u9801\u9762 ");
    \u0275\u0275elementEnd();
  }
}
function PaymentViewComponent_div_6_div_20_button_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 33);
    \u0275\u0275listener("click", function PaymentViewComponent_div_6_div_20_button_15_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.checkStatus());
    });
    \u0275\u0275text(1, " \u6AA2\u67E5\u72C0\u614B ");
    \u0275\u0275elementEnd();
  }
}
function PaymentViewComponent_div_6_div_20_div_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "p");
    \u0275\u0275text(2, "\u6383\u78BC\u652F\u4ED8\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.payment.currentIntent().qr_code);
  }
}
function PaymentViewComponent_div_6_div_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 21)(1, "h3");
    \u0275\u0275text(2, "\u7576\u524D\u652F\u4ED8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 22)(4, "div", 23)(5, "span", 19);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 24);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 25);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 26);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 27);
    \u0275\u0275template(14, PaymentViewComponent_div_6_div_20_button_14_Template, 2, 0, "button", 28)(15, PaymentViewComponent_div_6_div_20_button_15_Template, 2, 0, "button", 29);
    \u0275\u0275elementStart(16, "button", 30);
    \u0275\u0275listener("click", function PaymentViewComponent_div_6_div_20_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.payment.clearCurrentIntent());
    });
    \u0275\u0275text(17, " \u6E05\u9664 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(18, PaymentViewComponent_div_6_div_20_div_18_Template, 5, 1, "div", 31);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r2.payment.getProviderIcon(ctx_r2.payment.currentIntent().provider));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r2.payment.currentIntent().id.slice(0, 12), "...");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.formatAmount(ctx_r2.payment.currentIntent().amount, ctx_r2.payment.currentIntent().currency), " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.payment.getStateLabel(ctx_r2.payment.currentIntent().state).color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.getStateLabel(ctx_r2.payment.currentIntent().state).text, " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", ctx_r2.payment.currentIntent().pay_url && ctx_r2.payment.currentIntent().state !== "completed");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.payment.currentIntent().state !== "completed");
    \u0275\u0275advance(3);
    \u0275\u0275property("ngIf", ctx_r2.payment.currentIntent().qr_code);
  }
}
function PaymentViewComponent_div_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 10)(2, "h2");
    \u0275\u0275text(3, "\u5FEB\u901F\u652F\u4ED8");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 11)(5, "div", 12)(6, "label");
    \u0275\u0275text(7, "\u91D1\u984D\uFF08\u5143\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 13);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentViewComponent_div_6_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payAmount, $event) || (ctx_r2.payAmount = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 12)(10, "label");
    \u0275\u0275text(11, "\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function PaymentViewComponent_div_6_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.payDescription, $event) || (ctx_r2.payDescription = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 12)(14, "label");
    \u0275\u0275text(15, "\u652F\u4ED8\u65B9\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div", 15);
    \u0275\u0275template(17, PaymentViewComponent_div_6_button_17_Template, 5, 4, "button", 16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "button", 17);
    \u0275\u0275listener("click", function PaymentViewComponent_div_6_Template_button_click_18_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.createPayment());
    });
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(20, PaymentViewComponent_div_6_div_20_Template, 19, 9, "div", 18);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payAmount);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.payDescription);
    \u0275\u0275advance(5);
    \u0275\u0275property("ngForOf", ctx_r2.providers);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r2.payAmount || ctx_r2.payment.loading());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.loading() ? "\u8655\u7406\u4E2D..." : "\u5275\u5EFA\u652F\u4ED8", " ");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.payment.currentIntent());
  }
}
function PaymentViewComponent_div_7_div_7_div_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42)(1, "div", 43);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 44)(4, "span", 45);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 46);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 47);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 48);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r11 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.payment.getProviderIcon(item_r11.provider));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r11.description || "\u652F\u4ED8");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(item_r11.created_at));
    \u0275\u0275advance();
    \u0275\u0275classProp("completed", item_r11.state === "completed");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.formatAmount(item_r11.amount, item_r11.currency), " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.payment.getStateLabel(item_r11.state).color);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.getStateLabel(item_r11.state).text, " ");
  }
}
function PaymentViewComponent_div_7_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40);
    \u0275\u0275template(1, PaymentViewComponent_div_7_div_7_div_1_Template, 12, 9, "div", 41);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r2.payment.paymentHistory());
  }
}
function PaymentViewComponent_div_7_ng_template_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 50);
    \u0275\u0275text(2, "\u{1F4B3}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "\u66AB\u7121\u652F\u4ED8\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function PaymentViewComponent_div_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "section", 36)(2, "div", 37)(3, "h2");
    \u0275\u0275text(4, "\u652F\u4ED8\u6B77\u53F2");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 38);
    \u0275\u0275listener("click", function PaymentViewComponent_div_7_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.loadHistory());
    });
    \u0275\u0275text(6, "\u{1F504} \u5237\u65B0");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(7, PaymentViewComponent_div_7_div_7_Template, 2, 1, "div", 39)(8, PaymentViewComponent_div_7_ng_template_8_Template, 5, 0, "ng-template", null, 0, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const noHistory_r12 = \u0275\u0275reference(9);
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275property("ngIf", ctx_r2.payment.paymentHistory().length > 0)("ngIfElse", noHistory_r12);
  }
}
function PaymentViewComponent_div_8_div_7_div_1_button_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 64);
    \u0275\u0275text(1, "\u4E0B\u8F09 PDF");
    \u0275\u0275elementEnd();
  }
}
function PaymentViewComponent_div_8_div_7_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 55);
    \u0275\u0275listener("click", function PaymentViewComponent_div_8_div_7_div_1_Template_div_click_0_listener() {
      const inv_r15 = \u0275\u0275restoreView(_r14).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.viewInvoice(inv_r15));
    });
    \u0275\u0275elementStart(1, "div", 56)(2, "span", 57);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 58);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 59);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 60);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 61)(11, "button", 62);
    \u0275\u0275text(12, "\u67E5\u770B\u8A73\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275template(13, PaymentViewComponent_div_8_div_7_div_1_button_13_Template, 2, 0, "button", 63);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const inv_r15 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(inv_r15.invoice_number);
    \u0275\u0275advance();
    \u0275\u0275classMap(inv_r15.status);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r2.getInvoiceStatusLabel(inv_r15.status));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.payment.formatAmount(inv_r15.total, inv_r15.currency), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.formatDate(inv_r15.issued_at), " ");
    \u0275\u0275advance(4);
    \u0275\u0275property("ngIf", inv_r15.pdf_url);
  }
}
function PaymentViewComponent_div_8_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53);
    \u0275\u0275template(1, PaymentViewComponent_div_8_div_7_div_1_Template, 14, 7, "div", 54);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r2.payment.invoices());
  }
}
function PaymentViewComponent_div_8_ng_template_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 50);
    \u0275\u0275text(2, "\u{1F4C4}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "\u66AB\u7121\u767C\u7968");
    \u0275\u0275elementEnd()();
  }
}
function PaymentViewComponent_div_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "section", 51)(2, "div", 37)(3, "h2");
    \u0275\u0275text(4, "\u6211\u7684\u767C\u7968");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 38);
    \u0275\u0275listener("click", function PaymentViewComponent_div_8_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.loadInvoices());
    });
    \u0275\u0275text(6, "\u{1F504} \u5237\u65B0");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(7, PaymentViewComponent_div_8_div_7_Template, 2, 1, "div", 52)(8, PaymentViewComponent_div_8_ng_template_8_Template, 5, 0, "ng-template", null, 1, \u0275\u0275templateRefExtractor);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const noInvoices_r16 = \u0275\u0275reference(9);
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275property("ngIf", ctx_r2.payment.invoices().length > 0)("ngIfElse", noInvoices_r16);
  }
}
function PaymentViewComponent_div_9_div_2_tr_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r18 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r18.description);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r18.quantity);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.payment.formatAmount(item_r18.unit_price));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.payment.formatAmount(item_r18.amount));
  }
}
function PaymentViewComponent_div_9_div_2_div_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 75)(1, "span");
    \u0275\u0275text(2, "\u7A05\u8CBB");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.payment.formatAmount(ctx_r2.selectedInvoice().tax));
  }
}
function PaymentViewComponent_div_9_div_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 69)(1, "h3");
    \u0275\u0275text(2, "\u767C\u7968\u8A73\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 70)(4, "div", 71)(5, "span");
    \u0275\u0275text(6, "\u767C\u7968\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 71)(10, "span");
    \u0275\u0275text(11, "\u958B\u7968\u65E5\u671F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 71)(15, "span");
    \u0275\u0275text(16, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(19, "div", 72)(20, "h4");
    \u0275\u0275text(21, "\u9805\u76EE\u660E\u7D30");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "table")(23, "thead")(24, "tr")(25, "th");
    \u0275\u0275text(26, "\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "th");
    \u0275\u0275text(28, "\u6578\u91CF");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "th");
    \u0275\u0275text(30, "\u55AE\u50F9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "th");
    \u0275\u0275text(32, "\u91D1\u984D");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(33, "tbody");
    \u0275\u0275template(34, PaymentViewComponent_div_9_div_2_tr_34_Template, 9, 4, "tr", 73);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(35, "div", 74)(36, "div", 75)(37, "span");
    \u0275\u0275text(38, "\u5C0F\u8A08");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "span");
    \u0275\u0275text(40);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(41, PaymentViewComponent_div_9_div_2_div_41_Template, 5, 1, "div", 76);
    \u0275\u0275elementStart(42, "div", 77)(43, "span");
    \u0275\u0275text(44, "\u7E3D\u8A08");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "span");
    \u0275\u0275text(46);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r2.selectedInvoice().invoice_number);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(ctx_r2.selectedInvoice().issued_at));
    \u0275\u0275advance(4);
    \u0275\u0275classMap(ctx_r2.selectedInvoice().status);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r2.getInvoiceStatusLabel(ctx_r2.selectedInvoice().status));
    \u0275\u0275advance(16);
    \u0275\u0275property("ngForOf", ctx_r2.selectedInvoice().items);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r2.payment.formatAmount(ctx_r2.selectedInvoice().subtotal));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.selectedInvoice().tax > 0);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.payment.formatAmount(ctx_r2.selectedInvoice().total));
  }
}
function PaymentViewComponent_div_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 65);
    \u0275\u0275listener("click", function PaymentViewComponent_div_9_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showInvoiceDialog.set(false));
    });
    \u0275\u0275elementStart(1, "div", 66);
    \u0275\u0275listener("click", function PaymentViewComponent_div_9_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r17);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275template(2, PaymentViewComponent_div_9_div_2_Template, 47, 9, "div", 67);
    \u0275\u0275elementStart(3, "button", 68);
    \u0275\u0275listener("click", function PaymentViewComponent_div_9_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r17);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showInvoiceDialog.set(false));
    });
    \u0275\u0275text(4, "\u95DC\u9589");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", ctx_r2.selectedInvoice());
  }
}
var PaymentViewComponent = class _PaymentViewComponent {
  constructor() {
    this.payment = inject(PaymentService);
    this.activeTab = signal("quick", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.selectedProvider = signal("demo", ...ngDevMode ? [{ debugName: "selectedProvider" }] : []);
    this.payAmount = 0;
    this.payDescription = "";
    this.showInvoiceDialog = signal(false, ...ngDevMode ? [{ debugName: "showInvoiceDialog" }] : []);
    this.selectedInvoice = signal(null, ...ngDevMode ? [{ debugName: "selectedInvoice" }] : []);
    this.tabs = [
      { value: "quick", label: "\u5FEB\u901F\u652F\u4ED8", icon: "\u{1F4B3}" },
      { value: "history", label: "\u652F\u4ED8\u6B77\u53F2", icon: "\u{1F4CB}" },
      { value: "invoices", label: "\u767C\u7968", icon: "\u{1F4C4}" }
    ];
    this.providers = [
      { value: "alipay", name: "\u652F\u4ED8\u5BF6", icon: "\u{1F499}" },
      { value: "wechat", name: "\u5FAE\u4FE1", icon: "\u{1F49A}" },
      { value: "stripe", name: "Stripe", icon: "\u{1F4B3}" },
      { value: "paypal", name: "PayPal", icon: "\u{1F17F}\uFE0F" },
      { value: "demo", name: "\u6F14\u793A", icon: "\u{1F3AE}" }
    ];
    this.PaymentProvider = "";
  }
  ngOnInit() {
    this.loadHistory();
    this.loadInvoices();
  }
  async createPayment() {
    if (!this.payAmount || this.payAmount <= 0)
      return;
    const amountInCents = Math.round(this.payAmount * 100);
    const result = await this.payment.createPayment({
      amount: amountInCents,
      provider: this.selectedProvider(),
      description: this.payDescription || "\u7528\u6236\u652F\u4ED8",
      paymentType: "one_time"
    });
    if (result.success && result.intent) {
      if (result.intent.pay_url) {
        this.payment.openPaymentPage(result.intent);
      }
    } else {
      alert(result.error || "\u5275\u5EFA\u652F\u4ED8\u5931\u6557");
    }
  }
  async checkStatus() {
    const intent = this.payment.currentIntent();
    if (intent) {
      await this.payment.checkPaymentStatus(intent.id);
    }
  }
  loadHistory() {
    this.payment.loadPaymentHistory();
  }
  loadInvoices() {
    this.payment.loadInvoices();
  }
  viewInvoice(invoice) {
    this.selectedInvoice.set(invoice);
    this.showInvoiceDialog.set(true);
  }
  formatDate(isoTime) {
    if (!isoTime)
      return "-";
    try {
      return new Date(isoTime).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoTime;
    }
  }
  getInvoiceStatusLabel(status) {
    const labels = {
      draft: "\u8349\u7A3F",
      issued: "\u5DF2\u958B\u5177",
      paid: "\u5DF2\u652F\u4ED8",
      void: "\u5DF2\u4F5C\u5EE2"
    };
    return labels[status] || status;
  }
  static {
    this.\u0275fac = function PaymentViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _PaymentViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _PaymentViewComponent, selectors: [["app-payment-view"]], decls: 10, vars: 5, consts: [["noHistory", ""], ["noInvoices", ""], [1, "payment-view"], [1, "page-header"], [1, "tabs"], [3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "tab-content", 4, "ngIf"], ["class", "dialog-overlay", 3, "click", 4, "ngIf"], [3, "click"], [1, "tab-content"], [1, "quick-pay-section"], [1, "pay-form"], [1, "form-group"], ["type", "number", "min", "1", "step", "0.01", "placeholder", "\u8F38\u5165\u91D1\u984D", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u652F\u4ED8\u63CF\u8FF0\uFF08\u53EF\u9078\uFF09", 3, "ngModelChange", "ngModel"], [1, "provider-options"], [3, "selected", "click", 4, "ngFor", "ngForOf"], [1, "pay-btn", 3, "click", "disabled"], ["class", "current-payment", 4, "ngIf"], [1, "provider-icon"], [1, "provider-name"], [1, "current-payment"], [1, "payment-card"], [1, "payment-header"], [1, "payment-id"], [1, "payment-amount"], [1, "payment-status"], [1, "payment-actions"], ["class", "open-pay-btn", 3, "click", 4, "ngIf"], ["class", "check-btn", 3, "click", 4, "ngIf"], [1, "clear-btn", 3, "click"], ["class", "qr-section", 4, "ngIf"], [1, "open-pay-btn", 3, "click"], [1, "check-btn", 3, "click"], [1, "qr-section"], [1, "qr-code"], [1, "history-section"], [1, "section-header"], [1, "refresh-btn", 3, "click"], ["class", "history-list", 4, "ngIf", "ngIfElse"], [1, "history-list"], ["class", "history-item", 4, "ngFor", "ngForOf"], [1, "history-item"], [1, "item-icon"], [1, "item-info"], [1, "item-desc"], [1, "item-time"], [1, "item-amount"], [1, "item-status"], [1, "empty-state"], [1, "empty-icon"], [1, "invoices-section"], ["class", "invoices-list", 4, "ngIf", "ngIfElse"], [1, "invoices-list"], ["class", "invoice-card", 3, "click", 4, "ngFor", "ngForOf"], [1, "invoice-card", 3, "click"], [1, "invoice-header"], [1, "invoice-number"], [1, "invoice-status"], [1, "invoice-amount"], [1, "invoice-date"], [1, "invoice-actions"], [1, "view-btn"], ["class", "download-btn", 4, "ngIf"], [1, "download-btn"], [1, "dialog-overlay", 3, "click"], [1, "dialog-content", "invoice-dialog", 3, "click"], ["class", "invoice-detail", 4, "ngIf"], [1, "close-btn", 3, "click"], [1, "invoice-detail"], [1, "invoice-meta"], [1, "meta-row"], [1, "invoice-items"], [4, "ngFor", "ngForOf"], [1, "invoice-total"], [1, "total-row"], ["class", "total-row", 4, "ngIf"], [1, "total-row", "grand"]], template: function PaymentViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 2)(1, "header", 3)(2, "h1");
        \u0275\u0275text(3, "\u652F\u4ED8\u4E2D\u5FC3");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(4, "div", 4);
        \u0275\u0275template(5, PaymentViewComponent_button_5_Template, 2, 4, "button", 5);
        \u0275\u0275elementEnd();
        \u0275\u0275template(6, PaymentViewComponent_div_6_Template, 21, 6, "div", 6)(7, PaymentViewComponent_div_7_Template, 10, 2, "div", 6)(8, PaymentViewComponent_div_8_Template, 10, 2, "div", 6)(9, PaymentViewComponent_div_9_Template, 5, 1, "div", 7);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(5);
        \u0275\u0275property("ngForOf", ctx.tabs);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "quick");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "history");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab() === "invoices");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showInvoiceDialog());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, MinValidator, NgModel], styles: ["\n\n.payment-view[_ngcontent-%COMP%] {\n  padding: 24px;\n  max-width: 900px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0 0 24px;\n  font-size: 24px;\n}\n.tabs[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 24px;\n  border-bottom: 1px solid var(--border-color, #333);\n  padding-bottom: 12px;\n}\n.tabs[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  background: transparent;\n  border: none;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n  cursor: pointer;\n  border-radius: 8px;\n  transition: all 0.2s;\n}\n.tabs[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  color: var(--text-primary, #fff);\n}\n.quick-pay-section[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 24px;\n  margin-bottom: 24px;\n}\n.quick-pay-section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 20px;\n  font-size: 18px;\n}\n.pay-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  display: block;\n  margin-bottom: 8px;\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.form-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 12px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 14px;\n}\n.provider-options[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.provider-options[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  padding: 16px 24px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 12px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.provider-options[_ngcontent-%COMP%]   button.selected[_ngcontent-%COMP%] {\n  border-color: var(--primary, #3b82f6);\n  background: rgba(59, 130, 246, 0.1);\n}\n.provider-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.provider-name[_ngcontent-%COMP%] {\n  font-size: 12px;\n}\n.pay-btn[_ngcontent-%COMP%] {\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.pay-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.current-payment[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 24px;\n}\n.current-payment[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 16px;\n  font-size: 16px;\n}\n.payment-card[_ngcontent-%COMP%] {\n  text-align: center;\n}\n.payment-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.payment-id[_ngcontent-%COMP%] {\n  font-family: monospace;\n  color: var(--text-muted, #666);\n}\n.payment-amount[_ngcontent-%COMP%] {\n  font-size: 36px;\n  font-weight: 700;\n  margin-bottom: 8px;\n}\n.payment-status[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 600;\n  margin-bottom: 20px;\n}\n.payment-actions[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.payment-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-size: 14px;\n  cursor: pointer;\n}\n.open-pay-btn[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  border: none;\n  color: white;\n}\n.check-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.clear-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-muted, #666);\n}\n.qr-section[_ngcontent-%COMP%] {\n  margin-top: 20px;\n  padding-top: 20px;\n  border-top: 1px solid var(--border-color, #333);\n}\n.qr-code[_ngcontent-%COMP%] {\n  font-family: monospace;\n  font-size: 12px;\n  word-break: break-all;\n  color: var(--text-muted, #666);\n}\n.section-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n}\n.refresh-btn[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n.history-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.history-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.item-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.item-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.item-desc[_ngcontent-%COMP%] {\n  display: block;\n  font-weight: 500;\n}\n.item-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n}\n.item-amount[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 700;\n}\n.item-amount.completed[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.item-status[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 600;\n}\n.invoices-list[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 16px;\n}\n.invoice-card[_ngcontent-%COMP%] {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.invoice-card[_ngcontent-%COMP%]:hover {\n  border-color: var(--primary, #3b82f6);\n}\n.invoice-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.invoice-number[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-family: monospace;\n}\n.invoice-status[_ngcontent-%COMP%] {\n  padding: 2px 8px;\n  border-radius: 4px;\n  font-size: 11px;\n}\n.invoice-status.issued[_ngcontent-%COMP%], \n.invoice-status.paid[_ngcontent-%COMP%] {\n  background: #22c55e;\n  color: white;\n}\n.invoice-status.draft[_ngcontent-%COMP%] {\n  background: #f59e0b;\n  color: black;\n}\n.invoice-amount[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 700;\n  margin-bottom: 8px;\n}\n.invoice-date[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  margin-bottom: 12px;\n}\n.invoice-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n}\n.invoice-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  border-radius: 6px;\n  font-size: 12px;\n  cursor: pointer;\n}\n.view-btn[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  border: none;\n  color: white;\n}\n.download-btn[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 48px;\n  color: var(--text-muted, #666);\n}\n.empty-icon[_ngcontent-%COMP%] {\n  font-size: 48px;\n  display: block;\n  margin-bottom: 12px;\n}\n.dialog-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.dialog-content[_ngcontent-%COMP%] {\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 16px;\n  padding: 24px;\n  min-width: 500px;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.invoice-detail[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 20px;\n}\n.invoice-meta[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.meta-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.invoice-items[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 12px;\n  font-size: 14px;\n}\n.invoice-items[_ngcontent-%COMP%]   table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  margin-bottom: 20px;\n}\n.invoice-items[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.invoice-items[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 10px;\n  text-align: left;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.invoice-items[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.invoice-total[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.total-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n}\n.total-row.grand[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 700;\n  border-top: 2px solid var(--border-color, #333);\n  padding-top: 12px;\n}\n.close-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 12px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n/*# sourceMappingURL=payment-view.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PaymentViewComponent, [{
    type: Component,
    args: [{ selector: "app-payment-view", standalone: true, imports: [CommonModule, FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="payment-view">
      <header class="page-header">
        <h1>\u652F\u4ED8\u4E2D\u5FC3</h1>
      </header>
      
      <!-- \u6A19\u7C64\u9801 -->
      <div class="tabs">
        <button 
          *ngFor="let tab of tabs"
          [class.active]="activeTab() === tab.value"
          (click)="activeTab.set(tab.value)">
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>
      
      <!-- \u5FEB\u901F\u652F\u4ED8 -->
      <div class="tab-content" *ngIf="activeTab() === 'quick'">
        <div class="quick-pay-section">
          <h2>\u5FEB\u901F\u652F\u4ED8</h2>
          
          <div class="pay-form">
            <div class="form-group">
              <label>\u91D1\u984D\uFF08\u5143\uFF09</label>
              <input 
                type="number" 
                [(ngModel)]="payAmount" 
                min="1" 
                step="0.01"
                placeholder="\u8F38\u5165\u91D1\u984D">
            </div>
            
            <div class="form-group">
              <label>\u63CF\u8FF0</label>
              <input 
                type="text" 
                [(ngModel)]="payDescription" 
                placeholder="\u652F\u4ED8\u63CF\u8FF0\uFF08\u53EF\u9078\uFF09">
            </div>
            
            <div class="form-group">
              <label>\u652F\u4ED8\u65B9\u5F0F</label>
              <div class="provider-options">
                <button 
                  *ngFor="let p of providers"
                  [class.selected]="selectedProvider() === p.value"
                  (click)="selectedProvider.set(p.value)">
                  <span class="provider-icon">{{ p.icon }}</span>
                  <span class="provider-name">{{ p.name }}</span>
                </button>
              </div>
            </div>
            
            <button 
              class="pay-btn" 
              [disabled]="!payAmount || payment.loading()"
              (click)="createPayment()">
              {{ payment.loading() ? '\u8655\u7406\u4E2D...' : '\u5275\u5EFA\u652F\u4ED8' }}
            </button>
          </div>
        </div>
        
        <!-- \u7576\u524D\u652F\u4ED8 -->
        <div class="current-payment" *ngIf="payment.currentIntent()">
          <h3>\u7576\u524D\u652F\u4ED8</h3>
          <div class="payment-card">
            <div class="payment-header">
              <span class="provider-icon">{{ payment.getProviderIcon(payment.currentIntent()!.provider) }}</span>
              <span class="payment-id">{{ payment.currentIntent()!.id.slice(0, 12) }}...</span>
            </div>
            <div class="payment-amount">
              {{ payment.formatAmount(payment.currentIntent()!.amount, payment.currentIntent()!.currency) }}
            </div>
            <div class="payment-status" [style.color]="payment.getStateLabel(payment.currentIntent()!.state).color">
              {{ payment.getStateLabel(payment.currentIntent()!.state).text }}
            </div>
            
            <div class="payment-actions">
              <button 
                *ngIf="payment.currentIntent()!.pay_url && payment.currentIntent()!.state !== 'completed'"
                class="open-pay-btn"
                (click)="payment.openPaymentPage(payment.currentIntent()!)">
                \u6253\u958B\u652F\u4ED8\u9801\u9762
              </button>
              <button 
                *ngIf="payment.currentIntent()!.state !== 'completed'"
                class="check-btn"
                (click)="checkStatus()">
                \u6AA2\u67E5\u72C0\u614B
              </button>
              <button class="clear-btn" (click)="payment.clearCurrentIntent()">
                \u6E05\u9664
              </button>
            </div>
            
            <!-- \u4E8C\u7DAD\u78BC -->
            <div class="qr-section" *ngIf="payment.currentIntent()!.qr_code">
              <p>\u6383\u78BC\u652F\u4ED8\uFF1A</p>
              <div class="qr-code">{{ payment.currentIntent()!.qr_code }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- \u652F\u4ED8\u6B77\u53F2 -->
      <div class="tab-content" *ngIf="activeTab() === 'history'">
        <section class="history-section">
          <div class="section-header">
            <h2>\u652F\u4ED8\u6B77\u53F2</h2>
            <button class="refresh-btn" (click)="loadHistory()">\u{1F504} \u5237\u65B0</button>
          </div>
          
          <div class="history-list" *ngIf="payment.paymentHistory().length > 0; else noHistory">
            <div class="history-item" *ngFor="let item of payment.paymentHistory()">
              <div class="item-icon">{{ payment.getProviderIcon(item.provider) }}</div>
              <div class="item-info">
                <span class="item-desc">{{ item.description || '\u652F\u4ED8' }}</span>
                <span class="item-time">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="item-amount" [class.completed]="item.state === 'completed'">
                {{ payment.formatAmount(item.amount, item.currency) }}
              </div>
              <div class="item-status" [style.color]="payment.getStateLabel(item.state).color">
                {{ payment.getStateLabel(item.state).text }}
              </div>
            </div>
          </div>
          <ng-template #noHistory>
            <div class="empty-state">
              <span class="empty-icon">\u{1F4B3}</span>
              <p>\u66AB\u7121\u652F\u4ED8\u8A18\u9304</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- \u767C\u7968 -->
      <div class="tab-content" *ngIf="activeTab() === 'invoices'">
        <section class="invoices-section">
          <div class="section-header">
            <h2>\u6211\u7684\u767C\u7968</h2>
            <button class="refresh-btn" (click)="loadInvoices()">\u{1F504} \u5237\u65B0</button>
          </div>
          
          <div class="invoices-list" *ngIf="payment.invoices().length > 0; else noInvoices">
            <div class="invoice-card" *ngFor="let inv of payment.invoices()" (click)="viewInvoice(inv)">
              <div class="invoice-header">
                <span class="invoice-number">{{ inv.invoice_number }}</span>
                <span class="invoice-status" [class]="inv.status">{{ getInvoiceStatusLabel(inv.status) }}</span>
              </div>
              <div class="invoice-amount">
                {{ payment.formatAmount(inv.total, inv.currency) }}
              </div>
              <div class="invoice-date">
                {{ formatDate(inv.issued_at) }}
              </div>
              <div class="invoice-actions">
                <button class="view-btn">\u67E5\u770B\u8A73\u60C5</button>
                <button class="download-btn" *ngIf="inv.pdf_url">\u4E0B\u8F09 PDF</button>
              </div>
            </div>
          </div>
          <ng-template #noInvoices>
            <div class="empty-state">
              <span class="empty-icon">\u{1F4C4}</span>
              <p>\u66AB\u7121\u767C\u7968</p>
            </div>
          </ng-template>
        </section>
      </div>
      
      <!-- \u767C\u7968\u8A73\u60C5\u5C0D\u8A71\u6846 -->
      <div class="dialog-overlay" *ngIf="showInvoiceDialog()" (click)="showInvoiceDialog.set(false)">
        <div class="dialog-content invoice-dialog" (click)="$event.stopPropagation()">
          <div class="invoice-detail" *ngIf="selectedInvoice()">
            <h3>\u767C\u7968\u8A73\u60C5</h3>
            
            <div class="invoice-meta">
              <div class="meta-row">
                <span>\u767C\u7968\u865F</span>
                <span>{{ selectedInvoice()!.invoice_number }}</span>
              </div>
              <div class="meta-row">
                <span>\u958B\u7968\u65E5\u671F</span>
                <span>{{ formatDate(selectedInvoice()!.issued_at) }}</span>
              </div>
              <div class="meta-row">
                <span>\u72C0\u614B</span>
                <span [class]="selectedInvoice()!.status">{{ getInvoiceStatusLabel(selectedInvoice()!.status) }}</span>
              </div>
            </div>
            
            <div class="invoice-items">
              <h4>\u9805\u76EE\u660E\u7D30</h4>
              <table>
                <thead>
                  <tr>
                    <th>\u63CF\u8FF0</th>
                    <th>\u6578\u91CF</th>
                    <th>\u55AE\u50F9</th>
                    <th>\u91D1\u984D</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of selectedInvoice()!.items">
                    <td>{{ item.description }}</td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ payment.formatAmount(item.unit_price) }}</td>
                    <td>{{ payment.formatAmount(item.amount) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="invoice-total">
              <div class="total-row">
                <span>\u5C0F\u8A08</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.subtotal) }}</span>
              </div>
              <div class="total-row" *ngIf="selectedInvoice()!.tax > 0">
                <span>\u7A05\u8CBB</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.tax) }}</span>
              </div>
              <div class="total-row grand">
                <span>\u7E3D\u8A08</span>
                <span>{{ payment.formatAmount(selectedInvoice()!.total) }}</span>
              </div>
            </div>
          </div>
          
          <button class="close-btn" (click)="showInvoiceDialog.set(false)">\u95DC\u9589</button>
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;e6f0fe50f4bb4d3d3754abe3a5370b3acaedfa21db7bbcc1e7d2a4579c1b33a9;D:/tgkz2026/src/views/payment-view.component.ts */\n.payment-view {\n  padding: 24px;\n  max-width: 900px;\n  margin: 0 auto;\n}\n.page-header h1 {\n  margin: 0 0 24px;\n  font-size: 24px;\n}\n.tabs {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 24px;\n  border-bottom: 1px solid var(--border-color, #333);\n  padding-bottom: 12px;\n}\n.tabs button {\n  padding: 10px 20px;\n  background: transparent;\n  border: none;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n  cursor: pointer;\n  border-radius: 8px;\n  transition: all 0.2s;\n}\n.tabs button.active {\n  background: var(--bg-secondary, #1a1a1a);\n  color: var(--text-primary, #fff);\n}\n.quick-pay-section {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 24px;\n  margin-bottom: 24px;\n}\n.quick-pay-section h2 {\n  margin: 0 0 20px;\n  font-size: 18px;\n}\n.pay-form {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.form-group label {\n  display: block;\n  margin-bottom: 8px;\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.form-group input {\n  width: 100%;\n  padding: 12px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 14px;\n}\n.provider-options {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.provider-options button {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n  padding: 16px 24px;\n  background: var(--bg-tertiary, #2a2a2a);\n  border: 2px solid var(--border-color, #333);\n  border-radius: 12px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.provider-options button.selected {\n  border-color: var(--primary, #3b82f6);\n  background: rgba(59, 130, 246, 0.1);\n}\n.provider-icon {\n  font-size: 24px;\n}\n.provider-name {\n  font-size: 12px;\n}\n.pay-btn {\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.pay-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.current-payment {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 24px;\n}\n.current-payment h3 {\n  margin: 0 0 16px;\n  font-size: 16px;\n}\n.payment-card {\n  text-align: center;\n}\n.payment-header {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.payment-id {\n  font-family: monospace;\n  color: var(--text-muted, #666);\n}\n.payment-amount {\n  font-size: 36px;\n  font-weight: 700;\n  margin-bottom: 8px;\n}\n.payment-status {\n  font-size: 14px;\n  font-weight: 600;\n  margin-bottom: 20px;\n}\n.payment-actions {\n  display: flex;\n  justify-content: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.payment-actions button {\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-size: 14px;\n  cursor: pointer;\n}\n.open-pay-btn {\n  background: var(--primary, #3b82f6);\n  border: none;\n  color: white;\n}\n.check-btn {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.clear-btn {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-muted, #666);\n}\n.qr-section {\n  margin-top: 20px;\n  padding-top: 20px;\n  border-top: 1px solid var(--border-color, #333);\n}\n.qr-code {\n  font-family: monospace;\n  font-size: 12px;\n  word-break: break-all;\n  color: var(--text-muted, #666);\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header h2 {\n  margin: 0;\n  font-size: 18px;\n}\n.refresh-btn {\n  padding: 8px 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n.history-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.history-item {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n}\n.item-icon {\n  font-size: 24px;\n}\n.item-info {\n  flex: 1;\n}\n.item-desc {\n  display: block;\n  font-weight: 500;\n}\n.item-time {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n}\n.item-amount {\n  font-size: 18px;\n  font-weight: 700;\n}\n.item-amount.completed {\n  color: #22c55e;\n}\n.item-status {\n  font-size: 12px;\n  font-weight: 600;\n}\n.invoices-list {\n  display: grid;\n  gap: 16px;\n}\n.invoice-card {\n  padding: 16px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.invoice-card:hover {\n  border-color: var(--primary, #3b82f6);\n}\n.invoice-header {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.invoice-number {\n  font-weight: 600;\n  font-family: monospace;\n}\n.invoice-status {\n  padding: 2px 8px;\n  border-radius: 4px;\n  font-size: 11px;\n}\n.invoice-status.issued,\n.invoice-status.paid {\n  background: #22c55e;\n  color: white;\n}\n.invoice-status.draft {\n  background: #f59e0b;\n  color: black;\n}\n.invoice-amount {\n  font-size: 24px;\n  font-weight: 700;\n  margin-bottom: 8px;\n}\n.invoice-date {\n  font-size: 12px;\n  color: var(--text-muted, #666);\n  margin-bottom: 12px;\n}\n.invoice-actions {\n  display: flex;\n  gap: 8px;\n}\n.invoice-actions button {\n  padding: 6px 12px;\n  border-radius: 6px;\n  font-size: 12px;\n  cursor: pointer;\n}\n.view-btn {\n  background: var(--primary, #3b82f6);\n  border: none;\n  color: white;\n}\n.download-btn {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.empty-state {\n  text-align: center;\n  padding: 48px;\n  color: var(--text-muted, #666);\n}\n.empty-icon {\n  font-size: 48px;\n  display: block;\n  margin-bottom: 12px;\n}\n.dialog-overlay {\n  position: fixed;\n  top: 0;\n  left: 0;\n  right: 0;\n  bottom: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 1000;\n}\n.dialog-content {\n  background: var(--bg-primary, #0f0f0f);\n  border-radius: 16px;\n  padding: 24px;\n  min-width: 500px;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.invoice-detail h3 {\n  margin: 0 0 20px;\n}\n.invoice-meta {\n  margin-bottom: 20px;\n}\n.meta-row {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.invoice-items h4 {\n  margin: 0 0 12px;\n  font-size: 14px;\n}\n.invoice-items table {\n  width: 100%;\n  border-collapse: collapse;\n  margin-bottom: 20px;\n}\n.invoice-items th,\n.invoice-items td {\n  padding: 10px;\n  text-align: left;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.invoice-items th {\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.invoice-total {\n  margin-bottom: 20px;\n}\n.total-row {\n  display: flex;\n  justify-content: space-between;\n  padding: 8px 0;\n}\n.total-row.grand {\n  font-size: 18px;\n  font-weight: 700;\n  border-top: 2px solid var(--border-color, #333);\n  padding-top: 12px;\n}\n.close-btn {\n  width: 100%;\n  padding: 12px;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  cursor: pointer;\n}\n/*# sourceMappingURL=payment-view.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(PaymentViewComponent, { className: "PaymentViewComponent", filePath: "src/views/payment-view.component.ts", lineNumber: 714 });
})();
export {
  PaymentViewComponent
};
//# sourceMappingURL=chunk-TN2WDBWG.js.map
