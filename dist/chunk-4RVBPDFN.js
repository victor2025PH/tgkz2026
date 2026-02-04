import {
  WalletService
} from "./chunk-SHLIDGEQ.js";
import {
  ApiService
} from "./chunk-ZLNZFOTQ.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MaxValidator,
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
  Component,
  computed,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-withdraw.component.ts
var _c0 = () => [];
function WalletWithdrawComponent_button_31_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 30);
    \u0275\u0275listener("click", function WalletWithdrawComponent_button_31_Template_button_click_0_listener() {
      const amt_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setAmount(amt_r2));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const amt_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.withdrawAmount === amt_r2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.formatAmount(amt_r2 * 100), " ");
  }
}
function WalletWithdrawComponent_div_38_span_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 37);
    \u0275\u0275text(1, "\u5373\u5C07\u4E0A\u7DDA");
    \u0275\u0275elementEnd();
  }
}
function WalletWithdrawComponent_div_38_span_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 38);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function WalletWithdrawComponent_div_38_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31);
    \u0275\u0275listener("click", function WalletWithdrawComponent_div_38_Template_div_click_0_listener() {
      const method_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(method_r5.enabled && ctx_r2.selectMethod(method_r5.id));
    });
    \u0275\u0275elementStart(1, "span", 32);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 33)(4, "span", 34);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275template(6, WalletWithdrawComponent_div_38_span_6_Template, 2, 0, "span", 35);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, WalletWithdrawComponent_div_38_span_7_Template, 2, 0, "span", 36);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const method_r5 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("selected", ctx_r2.selectedMethod === method_r5.id)("disabled", !method_r5.enabled);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getMethodIcon(method_r5.id));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(method_r5.name);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !method_r5.enabled);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.selectedMethod === method_r5.id);
  }
}
function WalletWithdrawComponent_div_39_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "h2");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 39);
    \u0275\u0275twoWayListener("ngModelChange", function WalletWithdrawComponent_div_39_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.withdrawAddress, $event) || (ctx_r2.withdrawAddress = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 40);
    \u0275\u0275text(5, "\u8ACB\u78BA\u4FDD\u5730\u5740\u6B63\u78BA\uFF0C\u63D0\u73FE\u5F8C\u7121\u6CD5\u64A4\u56DE");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getMethodLabel(ctx_r2.selectedMethod));
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.withdrawAddress);
    \u0275\u0275property("placeholder", ctx_r2.getAddressPlaceholder(ctx_r2.selectedMethod));
  }
}
function WalletWithdrawComponent_div_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41);
    \u0275\u0275text(1, " \u{1F389} \u672C\u6708\u514D\u8CBB\u63D0\u73FE\u6A5F\u6703\uFF0C\u624B\u7E8C\u8CBB $0 ");
    \u0275\u0275elementEnd();
  }
}
function WalletWithdrawComponent_div_62_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 50)(1, "div", 51)(2, "div", 52)(3, "div", 53);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 54);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 55)(8, "div", 56);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 57);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(12, "div", 58)(13, "span");
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const order_r8 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(order_r8.order_no);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(order_r8.created_at));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(order_r8.actual_display);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.getStatusColor(order_r8.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.getStatusName(order_r8.status), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("", order_r8.method, " \u2192 ", ctx_r2.maskAddress(order_r8.address));
  }
}
function WalletWithdrawComponent_div_62_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 59);
    \u0275\u0275text(1, " \u66AB\u7121\u63D0\u73FE\u8A18\u9304 ");
    \u0275\u0275elementEnd();
  }
}
function WalletWithdrawComponent_div_62_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275listener("click", function WalletWithdrawComponent_div_62_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.closeHistory());
    });
    \u0275\u0275elementStart(1, "div", 43);
    \u0275\u0275listener("click", function WalletWithdrawComponent_div_62_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 44)(3, "h3");
    \u0275\u0275text(4, "\u63D0\u73FE\u8A18\u9304");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 45);
    \u0275\u0275listener("click", function WalletWithdrawComponent_div_62_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.closeHistory());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 46)(8, "div", 47);
    \u0275\u0275template(9, WalletWithdrawComponent_div_62_div_9_Template, 15, 8, "div", 48)(10, WalletWithdrawComponent_div_62_div_10_Template, 2, 0, "div", 49);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275property("ngForOf", ctx_r2.withdrawOrders());
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.withdrawOrders().length === 0);
  }
}
var WalletWithdrawComponent = class _WalletWithdrawComponent {
  constructor(walletService, api, router) {
    this.walletService = walletService;
    this.api = api;
    this.router = router;
    this.withdrawAmount = 0;
    this.selectedMethod = "usdt_trc20";
    this.withdrawAddress = "";
    this.quickAmounts = [10, 50, 100, 500];
    this.config = signal(null, ...ngDevMode ? [{ debugName: "config" }] : []);
    this.loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.showHistoryModal = signal(false, ...ngDevMode ? [{ debugName: "showHistoryModal" }] : []);
    this.withdrawOrders = signal([], ...ngDevMode ? [{ debugName: "withdrawOrders" }] : []);
    this.feeAmount = computed(() => {
      const cfg = this.config();
      if (!cfg)
        return 0;
      const amount = this.withdrawAmountCents();
      if (amount <= 0)
        return 0;
      const fee = Math.round(amount * cfg.fee_rate);
      return Math.max(fee, cfg.min_fee);
    }, ...ngDevMode ? [{ debugName: "feeAmount" }] : []);
    this.actualAmount = computed(() => {
      return this.withdrawAmountCents() - this.feeAmount();
    }, ...ngDevMode ? [{ debugName: "actualAmount" }] : []);
  }
  ngOnInit() {
    this.loadConfig();
    this.walletService.loadWallet();
  }
  async loadConfig() {
    try {
      const response = await this.api.get("/api/wallet/withdraw/config");
      if (response?.success && response?.data) {
        this.config.set(response.data);
      }
    } catch (error) {
      console.error("Load withdraw config error:", error);
    }
  }
  withdrawAmountCents() {
    return (this.withdrawAmount || 0) * 100;
  }
  isFreeWithdraw() {
    return false;
  }
  canSubmit() {
    const cfg = this.config();
    if (!cfg)
      return false;
    if (this.loading())
      return false;
    const amount = this.withdrawAmountCents();
    if (amount < cfg.min_amount)
      return false;
    if (amount > cfg.max_amount)
      return false;
    if (!this.selectedMethod)
      return false;
    if (!this.withdrawAddress)
      return false;
    return true;
  }
  onAmountChange() {
  }
  setAmount(amount) {
    this.withdrawAmount = amount;
  }
  setMaxAmount() {
    const wallet = this.walletService.wallet();
    if (wallet) {
      const cfg = this.config();
      const maxWithdraw = Math.min(wallet.balance, cfg?.max_amount || 1e5);
      this.withdrawAmount = maxWithdraw / 100;
    }
  }
  selectMethod(method) {
    this.selectedMethod = method;
    this.withdrawAddress = "";
  }
  formatAmount(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  formatDate(dateStr) {
    if (!dateStr)
      return "";
    const date = new Date(dateStr);
    return date.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  getMethodIcon(method) {
    const icons = {
      "usdt_trc20": "\u{1F48E}",
      "usdt_erc20": "\u{1F48E}",
      "bank": "\u{1F3E6}"
    };
    return icons[method] || "\u{1F4B3}";
  }
  getMethodLabel(method) {
    const labels = {
      "usdt_trc20": "USDT \u6536\u6B3E\u5730\u5740 (TRC20)",
      "usdt_erc20": "USDT \u6536\u6B3E\u5730\u5740 (ERC20)",
      "bank": "\u9280\u884C\u5361\u865F"
    };
    return labels[method] || "\u6536\u6B3E\u5730\u5740";
  }
  getAddressPlaceholder(method) {
    const placeholders = {
      "usdt_trc20": "\u8ACB\u8F38\u5165 TRC20 \u5730\u5740\uFF0C\u4EE5 T \u958B\u982D",
      "usdt_erc20": "\u8ACB\u8F38\u5165 ERC20 \u5730\u5740\uFF0C\u4EE5 0x \u958B\u982D",
      "bank": "\u8ACB\u8F38\u5165\u9280\u884C\u5361\u865F"
    };
    return placeholders[method] || "\u8ACB\u8F38\u5165\u6536\u6B3E\u5730\u5740";
  }
  getStatusName(status) {
    const names = {
      "pending": "\u5F85\u5BE9\u6838",
      "approved": "\u5DF2\u6279\u51C6",
      "processing": "\u8655\u7406\u4E2D",
      "completed": "\u5DF2\u5B8C\u6210",
      "rejected": "\u5DF2\u62D2\u7D55",
      "cancelled": "\u5DF2\u53D6\u6D88"
    };
    return names[status] || status;
  }
  getStatusColor(status) {
    const colors = {
      "pending": "#f59e0b",
      "approved": "#3b82f6",
      "processing": "#8b5cf6",
      "completed": "#22c55e",
      "rejected": "#ef4444",
      "cancelled": "#9ca3af"
    };
    return colors[status] || "#666";
  }
  maskAddress(address) {
    if (!address || address.length < 10)
      return address;
    return address.slice(0, 6) + "..." + address.slice(-4);
  }
  async submit() {
    if (!this.canSubmit())
      return;
    this.loading.set(true);
    try {
      const response = await this.api.post("/api/wallet/withdraw/create", {
        amount: this.withdrawAmountCents(),
        method: this.selectedMethod,
        address: this.withdrawAddress
      });
      if (response?.success) {
        alert("\u63D0\u73FE\u7533\u8ACB\u5DF2\u63D0\u4EA4\uFF0C\u8ACB\u7B49\u5F85\u5BE9\u6838");
        await this.walletService.loadWallet();
        window.dispatchEvent(new CustomEvent("changeView", { detail: "wallet" }));
      } else {
        alert(response?.error || "\u63D0\u73FE\u5931\u6557");
      }
    } catch (error) {
      console.error("Submit withdraw error:", error);
      alert("\u63D0\u73FE\u5931\u6557");
    } finally {
      this.loading.set(false);
    }
  }
  async showHistory() {
    try {
      const response = await this.api.get("/api/wallet/withdraw/orders");
      if (response?.success && response?.data?.orders) {
        this.withdrawOrders.set(response.data.orders);
      }
    } catch (error) {
      console.error("Load withdraw orders error:", error);
    }
    this.showHistoryModal.set(true);
  }
  closeHistory() {
    this.showHistoryModal.set(false);
  }
  goBack() {
    window.dispatchEvent(new CustomEvent("changeView", { detail: "wallet" }));
  }
  static {
    this.\u0275fac = function WalletWithdrawComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletWithdrawComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletWithdrawComponent, selectors: [["app-wallet-withdraw"]], decls: 63, vars: 18, consts: [[1, "withdraw-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "history-btn", 3, "click"], [1, "balance-card"], [1, "balance-label"], [1, "balance-amount"], [1, "balance-note"], [1, "section"], [1, "amount-input"], [1, "currency"], ["type", "number", "placeholder", "\u8ACB\u8F38\u5165\u63D0\u73FE\u91D1\u984D", 3, "ngModelChange", "ngModel", "min", "max"], [1, "amount-hints"], [1, "quick-amounts"], ["class", "quick-btn", 3, "active", "click", 4, "ngFor", "ngForOf"], [1, "quick-btn", "all", 3, "click"], [1, "methods"], ["class", "method-item", 3, "selected", "disabled", "click", 4, "ngFor", "ngForOf"], ["class", "section", 4, "ngIf"], [1, "section", "summary"], [1, "summary-row"], [1, "label"], [1, "value"], [1, "value", "fee"], [1, "summary-row", "total"], ["class", "free-note", 4, "ngIf"], [1, "action-bar"], [1, "submit-btn", 3, "click", "disabled"], ["class", "modal-overlay", 3, "click", 4, "ngIf"], [1, "quick-btn", 3, "click"], [1, "method-item", 3, "click"], [1, "method-icon"], [1, "method-info"], [1, "method-name"], ["class", "method-status", 4, "ngIf"], ["class", "check", 4, "ngIf"], [1, "method-status"], [1, "check"], ["type", "text", 1, "address-input", 3, "ngModelChange", "ngModel", "placeholder"], [1, "address-hint"], [1, "free-note"], [1, "modal-overlay", 3, "click"], [1, "modal", 3, "click"], [1, "modal-header"], [1, "close-btn", 3, "click"], [1, "modal-body"], [1, "order-list"], ["class", "order-item", 4, "ngFor", "ngForOf"], ["class", "empty", 4, "ngIf"], [1, "order-item"], [1, "order-main"], [1, "order-info"], [1, "order-no"], [1, "order-time"], [1, "order-amount"], [1, "amount"], [1, "status"], [1, "order-detail"], [1, "empty"]], template: function WalletWithdrawComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletWithdrawComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275text(4, "\u2190");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "h1");
        \u0275\u0275text(6, "\u63D0\u73FE");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "button", 4);
        \u0275\u0275listener("click", function WalletWithdrawComponent_Template_button_click_7_listener() {
          return ctx.showHistory();
        });
        \u0275\u0275text(8, "\u{1F4CB} \u63D0\u73FE\u8A18\u9304");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(9, "div", 5)(10, "div", 6);
        \u0275\u0275text(11, "\u53EF\u63D0\u73FE\u9918\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "div", 7);
        \u0275\u0275text(13);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "div", 8);
        \u0275\u0275text(15, "\u8D08\u9001\u9918\u984D\u4E0D\u53EF\u63D0\u73FE");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(16, "div", 9)(17, "h2");
        \u0275\u0275text(18, "\u63D0\u73FE\u91D1\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "div", 10)(20, "span", 11);
        \u0275\u0275text(21, "$");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "input", 12);
        \u0275\u0275twoWayListener("ngModelChange", function WalletWithdrawComponent_Template_input_ngModelChange_22_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.withdrawAmount, $event) || (ctx.withdrawAmount = $event);
          return $event;
        });
        \u0275\u0275listener("ngModelChange", function WalletWithdrawComponent_Template_input_ngModelChange_22_listener() {
          return ctx.onAmountChange();
        });
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(23, "div", 13)(24, "span");
        \u0275\u0275text(25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "span");
        \u0275\u0275text(27, "|");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "span");
        \u0275\u0275text(29);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(30, "div", 14);
        \u0275\u0275template(31, WalletWithdrawComponent_button_31_Template, 2, 3, "button", 15);
        \u0275\u0275elementStart(32, "button", 16);
        \u0275\u0275listener("click", function WalletWithdrawComponent_Template_button_click_32_listener() {
          return ctx.setMaxAmount();
        });
        \u0275\u0275text(33, " \u5168\u90E8\u63D0\u73FE ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(34, "div", 9)(35, "h2");
        \u0275\u0275text(36, "\u63D0\u73FE\u65B9\u5F0F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "div", 17);
        \u0275\u0275template(38, WalletWithdrawComponent_div_38_Template, 8, 8, "div", 18);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(39, WalletWithdrawComponent_div_39_Template, 6, 3, "div", 19);
        \u0275\u0275elementStart(40, "div", 20)(41, "h2");
        \u0275\u0275text(42, "\u63D0\u73FE\u660E\u7D30");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(43, "div", 21)(44, "span", 22);
        \u0275\u0275text(45, "\u63D0\u73FE\u91D1\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(46, "span", 23);
        \u0275\u0275text(47);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(48, "div", 21)(49, "span", 22);
        \u0275\u0275text(50);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(51, "span", 24);
        \u0275\u0275text(52);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(53, "div", 25)(54, "span", 22);
        \u0275\u0275text(55, "\u5BE6\u969B\u5230\u8CEC");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "span", 23);
        \u0275\u0275text(57);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(58, WalletWithdrawComponent_div_58_Template, 2, 0, "div", 26);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(59, "div", 27)(60, "button", 28);
        \u0275\u0275listener("click", function WalletWithdrawComponent_Template_button_click_60_listener() {
          return ctx.submit();
        });
        \u0275\u0275text(61);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(62, WalletWithdrawComponent_div_62_Template, 11, 2, "div", 29);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_2_0;
        let tmp_3_0;
        let tmp_4_0;
        let tmp_5_0;
        let tmp_7_0;
        let tmp_10_0;
        \u0275\u0275advance(13);
        \u0275\u0275textInterpolate(ctx.walletService.balanceDisplay());
        \u0275\u0275advance(9);
        \u0275\u0275twoWayProperty("ngModel", ctx.withdrawAmount);
        \u0275\u0275property("min", (((tmp_2_0 = ctx.config()) == null ? null : tmp_2_0.min_amount) || 0) / 100)("max", (((tmp_3_0 = ctx.config()) == null ? null : tmp_3_0.max_amount) || 0) / 100);
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1("\u6700\u4F4E ", ctx.formatAmount(((tmp_4_0 = ctx.config()) == null ? null : tmp_4_0.min_amount) || 1e3));
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate1("\u55AE\u7B46\u4E0A\u9650 ", ctx.formatAmount(((tmp_5_0 = ctx.config()) == null ? null : tmp_5_0.max_amount) || 1e5));
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.quickAmounts);
        \u0275\u0275advance(7);
        \u0275\u0275property("ngForOf", ((tmp_7_0 = ctx.config()) == null ? null : tmp_7_0.methods) || \u0275\u0275pureFunction0(17, _c0));
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.selectedMethod);
        \u0275\u0275advance(8);
        \u0275\u0275textInterpolate(ctx.formatAmount(ctx.withdrawAmountCents()));
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1("\u624B\u7E8C\u8CBB (", (((tmp_10_0 = ctx.config()) == null ? null : tmp_10_0.fee_rate) || 0) * 100, "%)");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("-", ctx.formatAmount(ctx.feeAmount()));
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(ctx.formatAmount(ctx.actualAmount()));
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.isFreeWithdraw());
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", !ctx.canSubmit());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.loading() ? "\u8655\u7406\u4E2D..." : "\u78BA\u8A8D\u63D0\u73FE", " ");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showHistoryModal());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, MinValidator, MaxValidator, NgModel], styles: ["\n\n.withdraw-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.history-btn[_ngcontent-%COMP%] {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.balance-card[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border-radius: 20px;\n  padding: 24px;\n  text-align: center;\n  margin-bottom: 24px;\n}\n.balance-label[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.8;\n}\n.balance-amount[_ngcontent-%COMP%] {\n  font-size: 36px;\n  font-weight: 700;\n  margin: 8px 0;\n}\n.balance-note[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.section[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 16px 0;\n}\n.amount-input[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 12px;\n  padding: 0 16px;\n}\n.amount-input[_ngcontent-%COMP%]   .currency[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  opacity: 0.6;\n}\n.amount-input[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 16px 12px;\n  background: transparent;\n  border: none;\n  color: #fff;\n  font-size: 24px;\n  font-weight: 600;\n}\n.amount-input[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: rgba(255, 255, 255, 0.3);\n}\n.amount-hints[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 12px;\n  margin-top: 12px;\n  font-size: 12px;\n  opacity: 0.6;\n}\n.quick-amounts[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  margin-top: 16px;\n}\n.quick-btn[_ngcontent-%COMP%] {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.quick-btn.active[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border-color: transparent;\n}\n.quick-btn.all[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 100px;\n}\n.methods[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.method-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.method-item[_ngcontent-%COMP%]:hover:not(.disabled) {\n  border-color: rgba(255, 255, 255, 0.2);\n}\n.method-item.selected[_ngcontent-%COMP%] {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.method-item.disabled[_ngcontent-%COMP%] {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.method-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.method-info[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n}\n.method-name[_ngcontent-%COMP%] {\n  font-size: 15px;\n  font-weight: 500;\n}\n.method-status[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.check[_ngcontent-%COMP%] {\n  color: #667eea;\n  font-size: 18px;\n}\n.address-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 14px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 12px;\n  color: #fff;\n  font-size: 14px;\n  font-family: monospace;\n}\n.address-input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: #667eea;\n}\n.address-hint[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.5;\n  margin-top: 8px;\n}\n.summary[_ngcontent-%COMP%]   .summary-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.summary-row[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  opacity: 0.7;\n}\n.summary-row[_ngcontent-%COMP%]   .value.fee[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.summary-row.total[_ngcontent-%COMP%] {\n  padding-top: 16px;\n  font-size: 18px;\n  font-weight: 600;\n  border-bottom: none;\n}\n.summary-row.total[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.free-note[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 12px;\n  background: rgba(34, 197, 94, 0.1);\n  border-radius: 8px;\n  color: #22c55e;\n  font-size: 13px;\n  margin-top: 12px;\n}\n.action-bar[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 16px 20px;\n  background: rgba(26, 26, 46, 0.95);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n.submit-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 16px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  border-radius: 12px;\n  color: #fff;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n  max-height: 70vh;\n  overflow: hidden;\n}\n.modal-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body[_ngcontent-%COMP%] {\n  padding: 20px;\n  max-height: 50vh;\n  overflow-y: auto;\n}\n.order-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.order-item[_ngcontent-%COMP%] {\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n}\n.order-main[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n.order-no[_ngcontent-%COMP%] {\n  font-family: monospace;\n  font-size: 13px;\n}\n.order-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.order-amount[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  text-align: right;\n}\n.order-amount[_ngcontent-%COMP%]   .status[_ngcontent-%COMP%] {\n  font-size: 12px;\n  text-align: right;\n}\n.order-detail[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.empty[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n/*# sourceMappingURL=wallet-withdraw.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletWithdrawComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-withdraw", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="withdraw-view">
      <!-- \u982D\u90E8 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">\u2190</button>
          <h1>\u63D0\u73FE</h1>
        </div>
        <button class="history-btn" (click)="showHistory()">\u{1F4CB} \u63D0\u73FE\u8A18\u9304</button>
      </div>

      <!-- \u53EF\u63D0\u73FE\u9918\u984D -->
      <div class="balance-card">
        <div class="balance-label">\u53EF\u63D0\u73FE\u9918\u984D</div>
        <div class="balance-amount">{{ walletService.balanceDisplay() }}</div>
        <div class="balance-note">\u8D08\u9001\u9918\u984D\u4E0D\u53EF\u63D0\u73FE</div>
      </div>

      <!-- \u63D0\u73FE\u8868\u55AE -->
      <div class="section">
        <h2>\u63D0\u73FE\u91D1\u984D</h2>
        <div class="amount-input">
          <span class="currency">$</span>
          <input 
            type="number" 
            [(ngModel)]="withdrawAmount"
            [min]="(config()?.min_amount || 0) / 100"
            [max]="(config()?.max_amount || 0) / 100"
            placeholder="\u8ACB\u8F38\u5165\u63D0\u73FE\u91D1\u984D"
            (ngModelChange)="onAmountChange()"
          />
        </div>
        <div class="amount-hints">
          <span>\u6700\u4F4E {{ formatAmount(config()?.min_amount || 1000) }}</span>
          <span>|</span>
          <span>\u55AE\u7B46\u4E0A\u9650 {{ formatAmount(config()?.max_amount || 100000) }}</span>
        </div>
        <div class="quick-amounts">
          <button 
            *ngFor="let amt of quickAmounts"
            class="quick-btn"
            [class.active]="withdrawAmount === amt"
            (click)="setAmount(amt)"
          >
            {{ formatAmount(amt * 100) }}
          </button>
          <button 
            class="quick-btn all"
            (click)="setMaxAmount()"
          >
            \u5168\u90E8\u63D0\u73FE
          </button>
        </div>
      </div>

      <!-- \u63D0\u73FE\u65B9\u5F0F -->
      <div class="section">
        <h2>\u63D0\u73FE\u65B9\u5F0F</h2>
        <div class="methods">
          <div 
            *ngFor="let method of config()?.methods || []"
            class="method-item"
            [class.selected]="selectedMethod === method.id"
            [class.disabled]="!method.enabled"
            (click)="method.enabled && selectMethod(method.id)"
          >
            <span class="method-icon">{{ getMethodIcon(method.id) }}</span>
            <div class="method-info">
              <span class="method-name">{{ method.name }}</span>
              <span class="method-status" *ngIf="!method.enabled">\u5373\u5C07\u4E0A\u7DDA</span>
            </div>
            <span class="check" *ngIf="selectedMethod === method.id">\u2713</span>
          </div>
        </div>
      </div>

      <!-- \u63D0\u73FE\u5730\u5740 -->
      <div class="section" *ngIf="selectedMethod">
        <h2>{{ getMethodLabel(selectedMethod) }}</h2>
        <input 
          type="text" 
          class="address-input"
          [(ngModel)]="withdrawAddress"
          [placeholder]="getAddressPlaceholder(selectedMethod)"
        />
        <div class="address-hint">\u8ACB\u78BA\u4FDD\u5730\u5740\u6B63\u78BA\uFF0C\u63D0\u73FE\u5F8C\u7121\u6CD5\u64A4\u56DE</div>
      </div>

      <!-- \u63D0\u73FE\u660E\u7D30 -->
      <div class="section summary">
        <h2>\u63D0\u73FE\u660E\u7D30</h2>
        <div class="summary-row">
          <span class="label">\u63D0\u73FE\u91D1\u984D</span>
          <span class="value">{{ formatAmount(withdrawAmountCents()) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">\u624B\u7E8C\u8CBB ({{ (config()?.fee_rate || 0) * 100 }}%)</span>
          <span class="value fee">-{{ formatAmount(feeAmount()) }}</span>
        </div>
        <div class="summary-row total">
          <span class="label">\u5BE6\u969B\u5230\u8CEC</span>
          <span class="value">{{ formatAmount(actualAmount()) }}</span>
        </div>
        <div class="free-note" *ngIf="isFreeWithdraw()">
          \u{1F389} \u672C\u6708\u514D\u8CBB\u63D0\u73FE\u6A5F\u6703\uFF0C\u624B\u7E8C\u8CBB $0
        </div>
      </div>

      <!-- \u63D0\u4EA4\u6309\u9215 -->
      <div class="action-bar">
        <button 
          class="submit-btn"
          [disabled]="!canSubmit()"
          (click)="submit()"
        >
          {{ loading() ? '\u8655\u7406\u4E2D...' : '\u78BA\u8A8D\u63D0\u73FE' }}
        </button>
      </div>

      <!-- \u63D0\u73FE\u8A18\u9304\u5F48\u7A97 -->
      <div class="modal-overlay" *ngIf="showHistoryModal()" (click)="closeHistory()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>\u63D0\u73FE\u8A18\u9304</h3>
            <button class="close-btn" (click)="closeHistory()">\xD7</button>
          </div>
          <div class="modal-body">
            <div class="order-list">
              <div class="order-item" *ngFor="let order of withdrawOrders()">
                <div class="order-main">
                  <div class="order-info">
                    <div class="order-no">{{ order.order_no }}</div>
                    <div class="order-time">{{ formatDate(order.created_at) }}</div>
                  </div>
                  <div class="order-amount">
                    <div class="amount">{{ order.actual_display }}</div>
                    <div class="status" [style.color]="getStatusColor(order.status)">
                      {{ getStatusName(order.status) }}
                    </div>
                  </div>
                </div>
                <div class="order-detail">
                  <span>{{ order.method }} \u2192 {{ maskAddress(order.address) }}</span>
                </div>
              </div>
              <div class="empty" *ngIf="withdrawOrders().length === 0">
                \u66AB\u7121\u63D0\u73FE\u8A18\u9304
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;4383a6f4bcf185eb01ddd6ad2f3d61b9c9e6dfc6334423dd88da117e8bfb6110;D:/tgkz2026/src/views/wallet-withdraw.component.ts */\n.withdraw-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.history-btn {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.balance-card {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border-radius: 20px;\n  padding: 24px;\n  text-align: center;\n  margin-bottom: 24px;\n}\n.balance-label {\n  font-size: 14px;\n  opacity: 0.8;\n}\n.balance-amount {\n  font-size: 36px;\n  font-weight: 700;\n  margin: 8px 0;\n}\n.balance-note {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.section {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 16px 0;\n}\n.amount-input {\n  display: flex;\n  align-items: center;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 12px;\n  padding: 0 16px;\n}\n.amount-input .currency {\n  font-size: 24px;\n  font-weight: 600;\n  opacity: 0.6;\n}\n.amount-input input {\n  flex: 1;\n  padding: 16px 12px;\n  background: transparent;\n  border: none;\n  color: #fff;\n  font-size: 24px;\n  font-weight: 600;\n}\n.amount-input input::placeholder {\n  color: rgba(255, 255, 255, 0.3);\n}\n.amount-hints {\n  display: flex;\n  justify-content: center;\n  gap: 12px;\n  margin-top: 12px;\n  font-size: 12px;\n  opacity: 0.6;\n}\n.quick-amounts {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  margin-top: 16px;\n}\n.quick-btn {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.quick-btn.active {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border-color: transparent;\n}\n.quick-btn.all {\n  flex: 1;\n  min-width: 100px;\n}\n.methods {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.method-item {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.method-item:hover:not(.disabled) {\n  border-color: rgba(255, 255, 255, 0.2);\n}\n.method-item.selected {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.method-item.disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.method-icon {\n  font-size: 24px;\n}\n.method-info {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n}\n.method-name {\n  font-size: 15px;\n  font-weight: 500;\n}\n.method-status {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.check {\n  color: #667eea;\n  font-size: 18px;\n}\n.address-input {\n  width: 100%;\n  padding: 14px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 12px;\n  color: #fff;\n  font-size: 14px;\n  font-family: monospace;\n}\n.address-input:focus {\n  outline: none;\n  border-color: #667eea;\n}\n.address-hint {\n  font-size: 12px;\n  opacity: 0.5;\n  margin-top: 8px;\n}\n.summary .summary-row {\n  display: flex;\n  justify-content: space-between;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.summary-row .label {\n  opacity: 0.7;\n}\n.summary-row .value.fee {\n  color: #ef4444;\n}\n.summary-row.total {\n  padding-top: 16px;\n  font-size: 18px;\n  font-weight: 600;\n  border-bottom: none;\n}\n.summary-row.total .value {\n  color: #22c55e;\n}\n.free-note {\n  text-align: center;\n  padding: 12px;\n  background: rgba(34, 197, 94, 0.1);\n  border-radius: 8px;\n  color: #22c55e;\n  font-size: 13px;\n  margin-top: 12px;\n}\n.action-bar {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 16px 20px;\n  background: rgba(26, 26, 46, 0.95);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n.submit-btn {\n  width: 100%;\n  padding: 16px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  border-radius: 12px;\n  color: #fff;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.submit-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n  max-height: 70vh;\n  overflow: hidden;\n}\n.modal-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header h3 {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body {\n  padding: 20px;\n  max-height: 50vh;\n  overflow-y: auto;\n}\n.order-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.order-item {\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n}\n.order-main {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n}\n.order-no {\n  font-family: monospace;\n  font-size: 13px;\n}\n.order-time {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.order-amount .amount {\n  font-size: 16px;\n  font-weight: 600;\n  text-align: right;\n}\n.order-amount .status {\n  font-size: 12px;\n  text-align: right;\n}\n.order-detail {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.empty {\n  text-align: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n/*# sourceMappingURL=wallet-withdraw.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: ApiService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletWithdrawComponent, { className: "WalletWithdrawComponent", filePath: "src/views/wallet-withdraw.component.ts", lineNumber: 603 });
})();

export {
  WalletWithdrawComponent
};
//# sourceMappingURL=chunk-4RVBPDFN.js.map
