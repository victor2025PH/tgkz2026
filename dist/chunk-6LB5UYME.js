import {
  WalletService
} from "./chunk-YAIK3ALD.js";
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
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-recharge.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function WalletRechargeComponent_For_18_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const pkg_r2 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", pkg_r2.bonus_display, " \u{1F381}");
  }
}
function WalletRechargeComponent_For_18_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275text(1, "\u63A8\u85A6");
    \u0275\u0275elementEnd();
  }
}
function WalletRechargeComponent_For_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34);
    \u0275\u0275listener("click", function WalletRechargeComponent_For_18_Template_div_click_0_listener() {
      const pkg_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.selectPackage(pkg_r2));
    });
    \u0275\u0275elementStart(1, "div", 35);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, WalletRechargeComponent_For_18_Conditional_3_Template, 2, 1, "div", 36);
    \u0275\u0275conditionalCreate(4, WalletRechargeComponent_For_18_Conditional_4_Template, 2, 0, "div", 37);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_10_0;
    const pkg_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("selected", ((tmp_10_0 = ctx_r2.selectedPackage()) == null ? null : tmp_10_0.id) === pkg_r2.id)("recommended", pkg_r2.is_recommended);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(pkg_r2.amount_display);
    \u0275\u0275advance();
    \u0275\u0275conditional(pkg_r2.bonus_amount > 0 ? 3 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(pkg_r2.is_recommended ? 4 : -1);
  }
}
function WalletRechargeComponent_div_75_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38)(1, "span", 6);
    \u0275\u0275text(2, "\u8D08\u9001\u91D1\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 26);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("+", ctx_r2.formatAmount(ctx_r2.bonusAmount()), " \u{1F381}");
  }
}
function WalletRechargeComponent_div_76_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25)(1, "span", 6);
    \u0275\u0275text(2, "\u624B\u7E8C\u8CBB");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 26);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("-", ctx_r2.formatAmount(ctx_r2.feeAmount()));
  }
}
function WalletRechargeComponent_div_85_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39)(1, "div", 40)(2, "div", 41)(3, "h3");
    \u0275\u0275text(4, "\u{1F48E} USDT \u5145\u503C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 42);
    \u0275\u0275listener("click", function WalletRechargeComponent_div_85_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.closeUsdtModal());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 43)(8, "div", 44)(9, "p");
    \u0275\u0275text(10, "\u8ACB\u8F49\u8CEC ");
    \u0275\u0275elementStart(11, "strong");
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275text(13, " \u5230\u4EE5\u4E0B\u5730\u5740\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 45)(15, "span");
    \u0275\u0275text(16, "\u6383\u78BC\u652F\u4ED8");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 46)(18, "div", 47);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "div", 48);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 49);
    \u0275\u0275listener("click", function WalletRechargeComponent_div_85_Template_button_click_22_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.copyAddress());
    });
    \u0275\u0275text(23, "\u8907\u88FD\u5730\u5740");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div", 50)(25, "p");
    \u0275\u0275text(26, "\u26A0\uFE0F \u6CE8\u610F\u4E8B\u9805\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "ul")(28, "li");
    \u0275\u0275text(29, "\u8ACB\u52D9\u5FC5\u9078\u64C7 TRC20 \u7DB2\u7D61");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "li");
    \u0275\u0275text(31, "\u6700\u5C0F\u8F49\u8CEC\u91D1\u984D\uFF1A5 USDT");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "li");
    \u0275\u0275text(33, "\u5230\u8CEC\u6642\u9593\uFF1A1-30 \u5206\u9418");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "li");
    \u0275\u0275text(35, "\u8A02\u55AE\u6709\u6548\u671F\uFF1A30 \u5206\u9418");
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(36, "div", 51)(37, "button", 52);
    \u0275\u0275listener("click", function WalletRechargeComponent_div_85_Template_button_click_37_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.confirmUsdtPayment());
    });
    \u0275\u0275text(38, " \u6211\u5DF2\u5B8C\u6210\u8F49\u8CEC ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(12);
    \u0275\u0275textInterpolate1("", ctx_r2.usdtAmount(), " USDT");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate2("", ctx_r2.usdtNetwork(), " ", ctx_r2.usdtNetwork() === "TRC20" ? "(TRON)" : "(Ethereum)");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.usdtAddress());
  }
}
function WalletRechargeComponent_div_86_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53);
    \u0275\u0275element(1, "div", 54);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "\u8655\u7406\u4E2D...");
    \u0275\u0275elementEnd()();
  }
}
var WalletRechargeComponent = class _WalletRechargeComponent {
  constructor(walletService, router) {
    this.walletService = walletService;
    this.router = router;
    this.packages = signal([], ...ngDevMode ? [{ debugName: "packages" }] : []);
    this.selectedPackage = signal(null, ...ngDevMode ? [{ debugName: "selectedPackage" }] : []);
    this.selectedMethod = signal("usdt_trc20", ...ngDevMode ? [{ debugName: "selectedMethod" }] : []);
    this.customAmount = 0;
    this.loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.showUsdtModal = signal(false, ...ngDevMode ? [{ debugName: "showUsdtModal" }] : []);
    this.currentOrder = signal(null, ...ngDevMode ? [{ debugName: "currentOrder" }] : []);
    this.paymentInfo = signal(null, ...ngDevMode ? [{ debugName: "paymentInfo" }] : []);
    this.pollingStatus = signal(false, ...ngDevMode ? [{ debugName: "pollingStatus" }] : []);
    this.rechargeAmount = computed(() => {
      const pkg = this.selectedPackage();
      if (pkg)
        return pkg.amount;
      return (this.customAmount || 0) * 100;
    }, ...ngDevMode ? [{ debugName: "rechargeAmount" }] : []);
    this.bonusAmount = computed(() => {
      const pkg = this.selectedPackage();
      return pkg?.bonus_amount || 0;
    }, ...ngDevMode ? [{ debugName: "bonusAmount" }] : []);
    this.feeAmount = computed(() => {
      const method = this.selectedMethod();
      const amount = this.rechargeAmount();
      const feeRates = {
        "usdt_trc20": 0,
        "alipay": 0.02,
        "wechat": 0.02,
        "bank": 0.01
      };
      return Math.round(amount * (feeRates[method] || 0));
    }, ...ngDevMode ? [{ debugName: "feeAmount" }] : []);
    this.actualAmount = computed(() => {
      return this.rechargeAmount() + this.bonusAmount() - this.feeAmount();
    }, ...ngDevMode ? [{ debugName: "actualAmount" }] : []);
    this.payAmount = computed(() => {
      return this.rechargeAmount();
    }, ...ngDevMode ? [{ debugName: "payAmount" }] : []);
    this.usdtAmount = computed(() => {
      const info = this.paymentInfo();
      if (info?.usdt_amount) {
        return info.usdt_amount.toFixed(2);
      }
      const usd = this.payAmount() / 100;
      return usd.toFixed(2);
    }, ...ngDevMode ? [{ debugName: "usdtAmount" }] : []);
    this.usdtAddress = computed(() => {
      return this.paymentInfo()?.usdt_address || "TYourTRC20WalletAddressHere";
    }, ...ngDevMode ? [{ debugName: "usdtAddress" }] : []);
    this.usdtNetwork = computed(() => {
      return this.paymentInfo()?.usdt_network || "TRC20";
    }, ...ngDevMode ? [{ debugName: "usdtNetwork" }] : []);
    this.canProceed = computed(() => {
      return this.rechargeAmount() >= 500;
    }, ...ngDevMode ? [{ debugName: "canProceed" }] : []);
  }
  ngOnInit() {
    this.loadPackages();
    this.walletService.loadWallet();
  }
  async loadPackages() {
    const packages = await this.walletService.loadRechargePackages();
    this.packages.set(packages);
    const recommended = packages.find((p) => p.is_recommended);
    if (recommended) {
      this.selectedPackage.set(recommended);
    }
  }
  selectPackage(pkg) {
    this.selectedPackage.set(pkg);
    this.customAmount = 0;
  }
  selectMethod(method) {
    this.selectedMethod.set(method);
  }
  onCustomAmountChange() {
    if (this.customAmount > 0) {
      this.selectedPackage.set(null);
    }
  }
  formatAmount(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  goBack() {
    window.dispatchEvent(new CustomEvent("changeView", { detail: "wallet" }));
  }
  async proceed() {
    if (!this.canProceed())
      return;
    this.loading.set(true);
    try {
      const result = await this.walletService.createRechargeOrder({
        amount: this.rechargeAmount(),
        paymentMethod: this.selectedMethod()
      });
      if (result.success && result.order && result.paymentInfo) {
        this.currentOrder.set(result.order);
        this.paymentInfo.set(result.paymentInfo);
        const method = this.selectedMethod();
        if (method === "usdt_trc20") {
          this.showUsdtModal.set(true);
        } else {
          alert("\u6B64\u652F\u4ED8\u65B9\u5F0F\u5373\u5C07\u4E0A\u7DDA");
        }
      } else {
        alert(result.error || "\u5275\u5EFA\u8A02\u55AE\u5931\u6557");
      }
    } catch (error) {
      console.error("Create order error:", error);
      alert("\u5275\u5EFA\u8A02\u55AE\u5931\u6557");
    } finally {
      this.loading.set(false);
    }
  }
  closeUsdtModal() {
    this.showUsdtModal.set(false);
    this.pollingStatus.set(false);
  }
  copyAddress() {
    const address = this.usdtAddress();
    navigator.clipboard.writeText(address);
    alert("\u5730\u5740\u5DF2\u8907\u88FD");
  }
  async confirmUsdtPayment() {
    const order = this.currentOrder();
    if (!order) {
      alert("\u8A02\u55AE\u4E0D\u5B58\u5728");
      return;
    }
    this.loading.set(true);
    try {
      const markResult = await this.walletService.markRechargeOrderPaid(order.order_no);
      if (!markResult.success) {
        alert(markResult.error || "\u6A19\u8A18\u652F\u4ED8\u72C0\u614B\u5931\u6557");
        this.loading.set(false);
        return;
      }
      this.pollingStatus.set(true);
      this.showUsdtModal.set(false);
      alert("\u5DF2\u6536\u5230\u60A8\u7684\u652F\u4ED8\u78BA\u8A8D\uFF0C\u7CFB\u7D71\u6B63\u5728\u8655\u7406\u4E2D...\n\u5230\u8CEC\u5F8C\u5C07\u81EA\u52D5\u66F4\u65B0\u9918\u984D\u3002");
      this.pollOrderStatus(order.order_no);
      window.dispatchEvent(new CustomEvent("changeView", { detail: "wallet" }));
    } catch (error) {
      console.error("Confirm payment error:", error);
      alert("\u78BA\u8A8D\u652F\u4ED8\u5931\u6557");
    } finally {
      this.loading.set(false);
    }
  }
  async pollOrderStatus(orderNo) {
    const result = await this.walletService.pollRechargeOrderStatus(orderNo, 1e4, 36);
    if (result.confirmed) {
      await this.walletService.loadWallet();
      console.log("Recharge confirmed:", orderNo);
    }
    this.pollingStatus.set(false);
  }
  static {
    this.\u0275fac = function WalletRechargeComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletRechargeComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletRechargeComponent, selectors: [["app-wallet-recharge"]], decls: 87, vars: 18, consts: [[1, "recharge-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "icon"], [1, "current-balance"], [1, "label"], [1, "amount"], [1, "section"], [1, "package-grid"], [1, "package-item", 3, "selected", "recommended"], [1, "custom-amount"], [1, "input-group"], [1, "currency"], ["type", "number", "placeholder", "5 - 1000", "min", "5", "max", "1000", 3, "ngModelChange", "input", "ngModel"], [1, "hint"], [1, "payment-methods"], [1, "payment-method", 3, "click"], [1, "method-icon"], [1, "method-info"], [1, "method-name"], [1, "method-desc"], [1, "method-badge", "recommended"], [1, "section", "payment-summary"], [1, "summary-rows"], [1, "summary-row"], [1, "value"], ["class", "summary-row bonus", 4, "ngIf"], ["class", "summary-row", 4, "ngIf"], [1, "summary-row", "total"], [1, "action-bar"], [1, "confirm-btn", 3, "click", "disabled"], ["class", "modal-overlay", 4, "ngIf"], ["class", "loading-overlay", 4, "ngIf"], [1, "package-item", 3, "click"], [1, "package-amount"], [1, "package-bonus"], [1, "recommended-badge"], [1, "summary-row", "bonus"], [1, "modal-overlay"], [1, "modal", "usdt-modal"], [1, "modal-header"], [1, "close-btn", 3, "click"], [1, "modal-body"], [1, "usdt-info"], [1, "qr-placeholder"], [1, "address-box"], [1, "network-badge"], [1, "address"], [1, "copy-btn", 3, "click"], [1, "usdt-notes"], [1, "modal-footer"], [1, "primary-btn", 3, "click"], [1, "loading-overlay"], [1, "loading-spinner"]], template: function WalletRechargeComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275elementStart(4, "span", 4);
        \u0275\u0275text(5, "\u2190");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "h1");
        \u0275\u0275text(7, "\u{1F4B3} \u5145\u503C");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(8, "div", 5)(9, "span", 6);
        \u0275\u0275text(10, "\u7576\u524D\u9918\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "span", 7);
        \u0275\u0275text(12);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(13, "div", 8)(14, "h2");
        \u0275\u0275text(15, "\u9078\u64C7\u5145\u503C\u91D1\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "div", 9);
        \u0275\u0275repeaterCreate(17, WalletRechargeComponent_For_18_Template, 5, 7, "div", 10, _forTrack0);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "div", 11)(20, "span", 6);
        \u0275\u0275text(21, "\u6216\u8F38\u5165\u81EA\u5B9A\u7FA9\u91D1\u984D\uFF1A");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "div", 12)(23, "span", 13);
        \u0275\u0275text(24, "$");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(25, "input", 14);
        \u0275\u0275twoWayListener("ngModelChange", function WalletRechargeComponent_Template_input_ngModelChange_25_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.customAmount, $event) || (ctx.customAmount = $event);
          return $event;
        });
        \u0275\u0275listener("input", function WalletRechargeComponent_Template_input_input_25_listener() {
          return ctx.onCustomAmountChange();
        });
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(26, "span", 15);
        \u0275\u0275text(27, "\u81EA\u5B9A\u7FA9\u91D1\u984D\u7121\u8D08\u9001");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(28, "div", 8)(29, "h2");
        \u0275\u0275text(30, "\u9078\u64C7\u652F\u4ED8\u65B9\u5F0F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "div", 16)(32, "div", 17);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_div_click_32_listener() {
          return ctx.selectMethod("usdt_trc20");
        });
        \u0275\u0275elementStart(33, "div", 18);
        \u0275\u0275text(34, "\u{1F48E}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(35, "div", 19)(36, "div", 20);
        \u0275\u0275text(37, "USDT (TRC20)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "div", 21);
        \u0275\u0275text(39, "0% \u624B\u7E8C\u8CBB \xB7 \u63A8\u85A6");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(40, "div", 22);
        \u0275\u0275text(41, "\u63A8\u85A6");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(42, "div", 17);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_div_click_42_listener() {
          return ctx.selectMethod("alipay");
        });
        \u0275\u0275elementStart(43, "div", 18);
        \u0275\u0275text(44, "\u{1F499}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "div", 19)(46, "div", 20);
        \u0275\u0275text(47, "\u652F\u4ED8\u5BF6");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "div", 21);
        \u0275\u0275text(49, "2% \u624B\u7E8C\u8CBB");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(50, "div", 17);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_div_click_50_listener() {
          return ctx.selectMethod("wechat");
        });
        \u0275\u0275elementStart(51, "div", 18);
        \u0275\u0275text(52, "\u{1F49A}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 19)(54, "div", 20);
        \u0275\u0275text(55, "\u5FAE\u4FE1\u652F\u4ED8");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "div", 21);
        \u0275\u0275text(57, "2% \u624B\u7E8C\u8CBB");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(58, "div", 17);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_div_click_58_listener() {
          return ctx.selectMethod("bank");
        });
        \u0275\u0275elementStart(59, "div", 18);
        \u0275\u0275text(60, "\u{1F3E6}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(61, "div", 19)(62, "div", 20);
        \u0275\u0275text(63, "\u9280\u884C\u5361");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(64, "div", 21);
        \u0275\u0275text(65, "1% \u624B\u7E8C\u8CBB");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(66, "div", 23)(67, "h2");
        \u0275\u0275text(68, "\u{1F4B0} \u652F\u4ED8\u660E\u7D30");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(69, "div", 24)(70, "div", 25)(71, "span", 6);
        \u0275\u0275text(72, "\u5145\u503C\u91D1\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(73, "span", 26);
        \u0275\u0275text(74);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(75, WalletRechargeComponent_div_75_Template, 5, 1, "div", 27)(76, WalletRechargeComponent_div_76_Template, 5, 1, "div", 28);
        \u0275\u0275elementStart(77, "div", 29)(78, "span", 6);
        \u0275\u0275text(79, "\u5BE6\u969B\u5230\u8CEC");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(80, "span", 26);
        \u0275\u0275text(81);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(82, "div", 30)(83, "button", 31);
        \u0275\u0275listener("click", function WalletRechargeComponent_Template_button_click_83_listener() {
          return ctx.proceed();
        });
        \u0275\u0275text(84);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(85, WalletRechargeComponent_div_85_Template, 39, 4, "div", 32)(86, WalletRechargeComponent_div_86_Template, 4, 0, "div", 33);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate(ctx.walletService.balanceDisplay());
        \u0275\u0275advance(5);
        \u0275\u0275repeater(ctx.packages());
        \u0275\u0275advance(8);
        \u0275\u0275twoWayProperty("ngModel", ctx.customAmount);
        \u0275\u0275advance(7);
        \u0275\u0275classProp("selected", ctx.selectedMethod() === "usdt_trc20");
        \u0275\u0275advance(10);
        \u0275\u0275classProp("selected", ctx.selectedMethod() === "alipay");
        \u0275\u0275advance(8);
        \u0275\u0275classProp("selected", ctx.selectedMethod() === "wechat");
        \u0275\u0275advance(8);
        \u0275\u0275classProp("selected", ctx.selectedMethod() === "bank");
        \u0275\u0275advance(16);
        \u0275\u0275textInterpolate(ctx.formatAmount(ctx.rechargeAmount()));
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.bonusAmount() > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.feeAmount() > 0);
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(ctx.formatAmount(ctx.actualAmount()));
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", !ctx.canProceed());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" \u78BA\u8A8D\u652F\u4ED8 ", ctx.formatAmount(ctx.payAmount()), " ");
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showUsdtModal());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.loading());
      }
    }, dependencies: [CommonModule, NgIf, FormsModule, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, MinValidator, MaxValidator, NgModel], styles: ["\n\n.recharge-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.current-balance[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 20px;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  margin-bottom: 24px;\n}\n.current-balance[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 14px;\n  opacity: 0.7;\n  margin-bottom: 8px;\n}\n.current-balance[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  font-size: 32px;\n  font-weight: 700;\n  color: #667eea;\n}\n.section[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 16px 0;\n}\n.package-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}\n.package-item[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 20px 12px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  text-align: center;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.package-item[_ngcontent-%COMP%]:hover {\n  border-color: rgba(102, 126, 234, 0.5);\n}\n.package-item.selected[_ngcontent-%COMP%] {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.package-item.recommended[_ngcontent-%COMP%] {\n  border-color: rgba(245, 158, 11, 0.5);\n}\n.package-amount[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  margin-bottom: 4px;\n}\n.package-bonus[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #f59e0b;\n}\n.recommended-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: -8px;\n  right: -8px;\n  background: #f59e0b;\n  color: #000;\n  font-size: 10px;\n  padding: 2px 8px;\n  border-radius: 10px;\n  font-weight: 600;\n}\n.custom-amount[_ngcontent-%COMP%] {\n  margin-top: 16px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.custom-amount[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.input-group[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 8px;\n  padding: 0 12px;\n}\n.input-group[_ngcontent-%COMP%]   .currency[_ngcontent-%COMP%] {\n  font-size: 16px;\n  opacity: 0.7;\n}\n.input-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100px;\n  padding: 10px 8px;\n  background: transparent;\n  border: none;\n  color: #fff;\n  font-size: 16px;\n}\n.custom-amount[_ngcontent-%COMP%]   .hint[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.payment-methods[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.payment-method[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.payment-method[_ngcontent-%COMP%]:hover {\n  border-color: rgba(255, 255, 255, 0.2);\n}\n.payment-method.selected[_ngcontent-%COMP%] {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.method-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.method-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.method-name[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 500;\n}\n.method-desc[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.method-badge.recommended[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  color: #fff;\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: 10px;\n}\n.payment-summary[_ngcontent-%COMP%]   .summary-rows[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.summary-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  font-size: 14px;\n}\n.summary-row[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  opacity: 0.7;\n}\n.summary-row.bonus[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.summary-row.total[_ngcontent-%COMP%] {\n  padding-top: 12px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n  font-size: 18px;\n  font-weight: 600;\n}\n.summary-row.total[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.action-bar[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 16px 20px;\n  background: rgba(26, 26, 46, 0.95);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n.confirm-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 16px;\n  border-radius: 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  color: #fff;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.confirm-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.confirm-btn[_ngcontent-%COMP%]:not(:disabled):hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.8);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n}\n.modal-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body[_ngcontent-%COMP%] {\n  padding: 20px;\n}\n.usdt-info[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin-bottom: 16px;\n}\n.qr-placeholder[_ngcontent-%COMP%] {\n  width: 180px;\n  height: 180px;\n  margin: 0 auto 20px;\n  background: #fff;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #333;\n}\n.address-box[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n  padding: 16px;\n  margin-bottom: 20px;\n}\n.network-badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  background: #22c55e;\n  color: #fff;\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: 10px;\n  margin-bottom: 8px;\n}\n.address[_ngcontent-%COMP%] {\n  font-family: monospace;\n  font-size: 12px;\n  word-break: break-all;\n  margin-bottom: 12px;\n  opacity: 0.9;\n}\n.copy-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 10px;\n  background: rgba(102, 126, 234, 0.2);\n  border: 1px solid #667eea;\n  color: #667eea;\n  border-radius: 8px;\n  cursor: pointer;\n}\n.usdt-notes[_ngcontent-%COMP%] {\n  font-size: 13px;\n  opacity: 0.7;\n}\n.usdt-notes[_ngcontent-%COMP%]   ul[_ngcontent-%COMP%] {\n  margin: 8px 0 0 16px;\n  padding: 0;\n}\n.usdt-notes[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  margin-bottom: 4px;\n}\n.modal-footer[_ngcontent-%COMP%] {\n  padding: 20px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.primary-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.loading-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 200;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-recharge.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletRechargeComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-recharge", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="recharge-view">
      <!-- \u9802\u90E8\u5C0E\u822A -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">\u2190</span>
          </button>
          <h1>\u{1F4B3} \u5145\u503C</h1>
        </div>
      </div>

      <!-- \u7576\u524D\u9918\u984D -->
      <div class="current-balance">
        <span class="label">\u7576\u524D\u9918\u984D</span>
        <span class="amount">{{ walletService.balanceDisplay() }}</span>
      </div>

      <!-- \u9078\u64C7\u5145\u503C\u91D1\u984D -->
      <div class="section">
        <h2>\u9078\u64C7\u5145\u503C\u91D1\u984D</h2>
        <div class="package-grid">
          @for (pkg of packages(); track pkg.id) {
            <div 
              class="package-item" 
              [class.selected]="selectedPackage()?.id === pkg.id"
              [class.recommended]="pkg.is_recommended"
              (click)="selectPackage(pkg)"
            >
              <div class="package-amount">{{ pkg.amount_display }}</div>
              @if (pkg.bonus_amount > 0) {
                <div class="package-bonus">{{ pkg.bonus_display }} \u{1F381}</div>
              }
              @if (pkg.is_recommended) {
                <div class="recommended-badge">\u63A8\u85A6</div>
              }
            </div>
          }
        </div>
        
        <!-- \u81EA\u5B9A\u7FA9\u91D1\u984D -->
        <div class="custom-amount">
          <span class="label">\u6216\u8F38\u5165\u81EA\u5B9A\u7FA9\u91D1\u984D\uFF1A</span>
          <div class="input-group">
            <span class="currency">$</span>
            <input 
              type="number" 
              [(ngModel)]="customAmount" 
              (input)="onCustomAmountChange()"
              placeholder="5 - 1000"
              min="5"
              max="1000"
            >
          </div>
          <span class="hint">\u81EA\u5B9A\u7FA9\u91D1\u984D\u7121\u8D08\u9001</span>
        </div>
      </div>

      <!-- \u9078\u64C7\u652F\u4ED8\u65B9\u5F0F -->
      <div class="section">
        <h2>\u9078\u64C7\u652F\u4ED8\u65B9\u5F0F</h2>
        <div class="payment-methods">
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'usdt_trc20'"
            (click)="selectMethod('usdt_trc20')"
          >
            <div class="method-icon">\u{1F48E}</div>
            <div class="method-info">
              <div class="method-name">USDT (TRC20)</div>
              <div class="method-desc">0% \u624B\u7E8C\u8CBB \xB7 \u63A8\u85A6</div>
            </div>
            <div class="method-badge recommended">\u63A8\u85A6</div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'alipay'"
            (click)="selectMethod('alipay')"
          >
            <div class="method-icon">\u{1F499}</div>
            <div class="method-info">
              <div class="method-name">\u652F\u4ED8\u5BF6</div>
              <div class="method-desc">2% \u624B\u7E8C\u8CBB</div>
            </div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'wechat'"
            (click)="selectMethod('wechat')"
          >
            <div class="method-icon">\u{1F49A}</div>
            <div class="method-info">
              <div class="method-name">\u5FAE\u4FE1\u652F\u4ED8</div>
              <div class="method-desc">2% \u624B\u7E8C\u8CBB</div>
            </div>
          </div>
          
          <div 
            class="payment-method" 
            [class.selected]="selectedMethod() === 'bank'"
            (click)="selectMethod('bank')"
          >
            <div class="method-icon">\u{1F3E6}</div>
            <div class="method-info">
              <div class="method-name">\u9280\u884C\u5361</div>
              <div class="method-desc">1% \u624B\u7E8C\u8CBB</div>
            </div>
          </div>
        </div>
      </div>

      <!-- \u652F\u4ED8\u660E\u7D30 -->
      <div class="section payment-summary">
        <h2>\u{1F4B0} \u652F\u4ED8\u660E\u7D30</h2>
        <div class="summary-rows">
          <div class="summary-row">
            <span class="label">\u5145\u503C\u91D1\u984D</span>
            <span class="value">{{ formatAmount(rechargeAmount()) }}</span>
          </div>
          <div class="summary-row bonus" *ngIf="bonusAmount() > 0">
            <span class="label">\u8D08\u9001\u91D1\u984D</span>
            <span class="value">+{{ formatAmount(bonusAmount()) }} \u{1F381}</span>
          </div>
          <div class="summary-row" *ngIf="feeAmount() > 0">
            <span class="label">\u624B\u7E8C\u8CBB</span>
            <span class="value">-{{ formatAmount(feeAmount()) }}</span>
          </div>
          <div class="summary-row total">
            <span class="label">\u5BE6\u969B\u5230\u8CEC</span>
            <span class="value">{{ formatAmount(actualAmount()) }}</span>
          </div>
        </div>
      </div>

      <!-- \u78BA\u8A8D\u6309\u9215 -->
      <div class="action-bar">
        <button 
          class="confirm-btn" 
          [disabled]="!canProceed()"
          (click)="proceed()"
        >
          \u78BA\u8A8D\u652F\u4ED8 {{ formatAmount(payAmount()) }}
        </button>
      </div>

      <!-- USDT \u652F\u4ED8\u5F48\u7A97 -->
      <div class="modal-overlay" *ngIf="showUsdtModal()">
        <div class="modal usdt-modal">
          <div class="modal-header">
            <h3>\u{1F48E} USDT \u5145\u503C</h3>
            <button class="close-btn" (click)="closeUsdtModal()">\xD7</button>
          </div>
          <div class="modal-body">
            <div class="usdt-info">
              <p>\u8ACB\u8F49\u8CEC <strong>{{ usdtAmount() }} USDT</strong> \u5230\u4EE5\u4E0B\u5730\u5740\uFF1A</p>
              
              <div class="qr-placeholder">
                <!-- TODO: \u6DFB\u52A0\u4E8C\u7DAD\u78BC -->
                <span>\u6383\u78BC\u652F\u4ED8</span>
              </div>
              
              <div class="address-box">
                <div class="network-badge">{{ usdtNetwork() }} {{ usdtNetwork() === 'TRC20' ? '(TRON)' : '(Ethereum)' }}</div>
                <div class="address">{{ usdtAddress() }}</div>
                <button class="copy-btn" (click)="copyAddress()">\u8907\u88FD\u5730\u5740</button>
              </div>
              
              <div class="usdt-notes">
                <p>\u26A0\uFE0F \u6CE8\u610F\u4E8B\u9805\uFF1A</p>
                <ul>
                  <li>\u8ACB\u52D9\u5FC5\u9078\u64C7 TRC20 \u7DB2\u7D61</li>
                  <li>\u6700\u5C0F\u8F49\u8CEC\u91D1\u984D\uFF1A5 USDT</li>
                  <li>\u5230\u8CEC\u6642\u9593\uFF1A1-30 \u5206\u9418</li>
                  <li>\u8A02\u55AE\u6709\u6548\u671F\uFF1A30 \u5206\u9418</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="primary-btn" (click)="confirmUsdtPayment()">
              \u6211\u5DF2\u5B8C\u6210\u8F49\u8CEC
            </button>
          </div>
        </div>
      </div>

      <!-- \u52A0\u8F09\u906E\u7F69 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>\u8655\u7406\u4E2D...</span>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;d1ff2f03ace3c81f68e482d8b5b79bdd0000fc7d9db2527a996f813b74468557;D:/tgkz2026/src/views/wallet-recharge.component.ts */\n.recharge-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.current-balance {\n  text-align: center;\n  padding: 20px;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  margin-bottom: 24px;\n}\n.current-balance .label {\n  display: block;\n  font-size: 14px;\n  opacity: 0.7;\n  margin-bottom: 8px;\n}\n.current-balance .amount {\n  font-size: 32px;\n  font-weight: 700;\n  color: #667eea;\n}\n.section {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 16px 0;\n}\n.package-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}\n.package-item {\n  position: relative;\n  padding: 20px 12px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  text-align: center;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.package-item:hover {\n  border-color: rgba(102, 126, 234, 0.5);\n}\n.package-item.selected {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.package-item.recommended {\n  border-color: rgba(245, 158, 11, 0.5);\n}\n.package-amount {\n  font-size: 20px;\n  font-weight: 700;\n  margin-bottom: 4px;\n}\n.package-bonus {\n  font-size: 12px;\n  color: #f59e0b;\n}\n.recommended-badge {\n  position: absolute;\n  top: -8px;\n  right: -8px;\n  background: #f59e0b;\n  color: #000;\n  font-size: 10px;\n  padding: 2px 8px;\n  border-radius: 10px;\n  font-weight: 600;\n}\n.custom-amount {\n  margin-top: 16px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.custom-amount .label {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.input-group {\n  display: flex;\n  align-items: center;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 8px;\n  padding: 0 12px;\n}\n.input-group .currency {\n  font-size: 16px;\n  opacity: 0.7;\n}\n.input-group input {\n  width: 100px;\n  padding: 10px 8px;\n  background: transparent;\n  border: none;\n  color: #fff;\n  font-size: 16px;\n}\n.custom-amount .hint {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.payment-methods {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.payment-method {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 2px solid transparent;\n  border-radius: 12px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.payment-method:hover {\n  border-color: rgba(255, 255, 255, 0.2);\n}\n.payment-method.selected {\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.method-icon {\n  font-size: 24px;\n}\n.method-info {\n  flex: 1;\n}\n.method-name {\n  font-size: 14px;\n  font-weight: 500;\n}\n.method-desc {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.method-badge.recommended {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  color: #fff;\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: 10px;\n}\n.payment-summary .summary-rows {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.summary-row {\n  display: flex;\n  justify-content: space-between;\n  font-size: 14px;\n}\n.summary-row .label {\n  opacity: 0.7;\n}\n.summary-row.bonus .value {\n  color: #f59e0b;\n}\n.summary-row.total {\n  padding-top: 12px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n  font-size: 18px;\n  font-weight: 600;\n}\n.summary-row.total .value {\n  color: #22c55e;\n}\n.action-bar {\n  position: fixed;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  padding: 16px 20px;\n  background: rgba(26, 26, 46, 0.95);\n  -webkit-backdrop-filter: blur(10px);\n  backdrop-filter: blur(10px);\n}\n.confirm-btn {\n  width: 100%;\n  padding: 16px;\n  border-radius: 12px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  color: #fff;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.confirm-btn:disabled {\n  opacity: 0.5;\n  cursor: not-allowed;\n}\n.confirm-btn:not(:disabled):hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.8);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n}\n.modal-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header h3 {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body {\n  padding: 20px;\n}\n.usdt-info p {\n  margin-bottom: 16px;\n}\n.qr-placeholder {\n  width: 180px;\n  height: 180px;\n  margin: 0 auto 20px;\n  background: #fff;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #333;\n}\n.address-box {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 12px;\n  padding: 16px;\n  margin-bottom: 20px;\n}\n.network-badge {\n  display: inline-block;\n  background: #22c55e;\n  color: #fff;\n  font-size: 11px;\n  padding: 4px 10px;\n  border-radius: 10px;\n  margin-bottom: 8px;\n}\n.address {\n  font-family: monospace;\n  font-size: 12px;\n  word-break: break-all;\n  margin-bottom: 12px;\n  opacity: 0.9;\n}\n.copy-btn {\n  width: 100%;\n  padding: 10px;\n  background: rgba(102, 126, 234, 0.2);\n  border: 1px solid #667eea;\n  color: #667eea;\n  border-radius: 8px;\n  cursor: pointer;\n}\n.usdt-notes {\n  font-size: 13px;\n  opacity: 0.7;\n}\n.usdt-notes ul {\n  margin: 8px 0 0 16px;\n  padding: 0;\n}\n.usdt-notes li {\n  margin-bottom: 4px;\n}\n.modal-footer {\n  padding: 20px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.primary-btn {\n  width: 100%;\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  font-weight: 600;\n  cursor: pointer;\n}\n.loading-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 200;\n}\n.loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-recharge.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletRechargeComponent, { className: "WalletRechargeComponent", filePath: "src/views/wallet-recharge.component.ts", lineNumber: 664 });
})();

export {
  WalletRechargeComponent
};
//# sourceMappingURL=chunk-6LB5UYME.js.map
