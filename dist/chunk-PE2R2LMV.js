import {
  WalletService
} from "./chunk-EULKY6Q3.js";
import {
  ApiService
} from "./chunk-HOUP2MV6.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MaxLengthValidator,
  NgControlStatus,
  NgModel
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
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-view.component.ts
var _c0 = () => [];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.category;
var _forTrack2 = ($index, $item) => $item.month;
function WalletViewComponent_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 18);
    \u0275\u0275text(1, " \u{1F512} \u9322\u5305\u5DF2\u88AB\u51CD\u7D50\uFF0C\u8ACB\u806F\u7E6B\u5BA2\u670D\u89E3\u51CD\u5F8C\u64CD\u4F5C ");
    \u0275\u0275elementEnd();
  }
}
function WalletViewComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 23)(1, "span", 35);
    \u0275\u0275text(2, "\u{1F4E1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 36);
    \u0275\u0275text(4, "\u60A8\u76EE\u524D\u8655\u65BC\u96E2\u7DDA\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 37);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_44_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.retryConnection());
    });
    \u0275\u0275text(6, "\u91CD\u8A66\u9023\u63A5");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_Conditional_45_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 38);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_45_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.dismissError());
    });
    \u0275\u0275elementStart(1, "span", 39);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 40);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 41);
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.globalError());
  }
}
function WalletViewComponent_div_46_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 45)(1, "div", 46)(2, "span", 4);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 47);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 48);
    \u0275\u0275element(7, "div", 49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 50)(9, "span", 13);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 51);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getCategoryIcon(item_r4.category));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r4.category_name);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", item_r4.percent, "%");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r4.amount_display);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", item_r4.percent, "%");
  }
}
function WalletViewComponent_div_46_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "span", 4);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 52);
    \u0275\u0275text(4, "\u672C\u6708\u66AB\u7121\u6D88\u8CBB");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_div_46_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42)(1, "div", 27)(2, "h2");
    \u0275\u0275text(3, "\u{1F4CA} \u672C\u6708\u6D88\u8CBB\u6982\u89BD");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 43);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 44);
    \u0275\u0275repeaterCreate(7, WalletViewComponent_div_46_For_8_Template, 13, 6, "div", 45, _forTrack1);
    \u0275\u0275conditionalCreate(9, WalletViewComponent_div_46_Conditional_9_Template, 5, 0, "div", 31);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_2_0;
    let tmp_3_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate((tmp_1_0 = ctx_r1.analysis()) == null ? null : tmp_1_0.total_display);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(((tmp_2_0 = ctx_r1.analysis()) == null ? null : tmp_2_0.by_category) || \u0275\u0275pureFunction0(2, _c0));
    \u0275\u0275advance(2);
    \u0275\u0275conditional((((tmp_3_0 = ctx_r1.analysis()) == null ? null : tmp_3_0.by_category) || \u0275\u0275pureFunction0(3, _c0)).length === 0 ? 9 : -1);
  }
}
function WalletViewComponent_For_55_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53)(1, "div", 54);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 55)(4, "div", 56);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 57);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 58);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tx_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("income", tx_r5.amount > 0)("expense", tx_r5.amount < 0);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getTypeIcon(tx_r5.type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(tx_r5.description || ctx_r1.getTypeName(tx_r5.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(tx_r5.created_at));
    \u0275\u0275advance();
    \u0275\u0275classProp("positive", tx_r5.amount > 0)("negative", tx_r5.amount < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tx_r5.amount_display, " ");
  }
}
function WalletViewComponent_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "span", 4);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 52);
    \u0275\u0275text(4, "\u66AB\u7121\u4EA4\u6613\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_div_57_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 61)(1, "div", 66);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 67)(4, "div", 68)(5, "span", 69);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 70)(8, "span", 69);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const month_r6 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatMonth(month_r6.month));
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("height", ctx_r1.getBarHeight(month_r6.income), "px");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u6536\u5165: ", month_r6.income_display);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r1.getBarHeight(month_r6.expense), "px");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u652F\u51FA: ", month_r6.expense_display);
  }
}
function WalletViewComponent_div_57_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 59)(1, "div", 27)(2, "h2");
    \u0275\u0275text(3, "\u{1F4C5} \u6708\u5EA6\u7D71\u8A08");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 60);
    \u0275\u0275repeaterCreate(5, WalletViewComponent_div_57_For_6_Template, 10, 7, "div", 61, _forTrack2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 62)(8, "div", 63);
    \u0275\u0275element(9, "span", 64);
    \u0275\u0275elementStart(10, "span", 16);
    \u0275\u0275text(11, "\u6536\u5165");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 65);
    \u0275\u0275element(13, "span", 64);
    \u0275\u0275elementStart(14, "span", 16);
    \u0275\u0275text(15, "\u652F\u51FA");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r1.monthlySummary());
  }
}
function WalletViewComponent_div_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275element(1, "div", 72);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "\u52A0\u8F09\u4E2D...");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_Conditional_59_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 81);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.redeemError());
  }
}
function WalletViewComponent_Conditional_59_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 82);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r1.redeemSuccess());
  }
}
function WalletViewComponent_Conditional_59_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 86);
    \u0275\u0275text(1, " \u514C\u63DB\u4E2D... ");
  }
}
function WalletViewComponent_Conditional_59_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u78BA\u8A8D\u514C\u63DB ");
  }
}
function WalletViewComponent_Conditional_59_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 73);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_59_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRedeemModal());
    });
    \u0275\u0275elementStart(1, "div", 74);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_59_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r7);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 75)(3, "h3");
    \u0275\u0275text(4, "\u{1F381} \u514C\u63DB\u78BC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 76);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_59_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRedeemModal());
    });
    \u0275\u0275text(6, "\u2715");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 77)(8, "p", 78);
    \u0275\u0275text(9, "\u8F38\u5165\u514C\u63DB\u78BC\u4EE5\u7372\u5F97\u9918\u984D\u6216\u512A\u60E0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 79)(11, "input", 80);
    \u0275\u0275twoWayListener("ngModelChange", function WalletViewComponent_Conditional_59_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.redeemCode, $event) || (ctx_r1.redeemCode = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("keyup.enter", function WalletViewComponent_Conditional_59_Template_input_keyup_enter_11_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitRedeemCode());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(12, WalletViewComponent_Conditional_59_Conditional_12_Template, 2, 1, "div", 81);
    \u0275\u0275conditionalCreate(13, WalletViewComponent_Conditional_59_Conditional_13_Template, 2, 1, "div", 82);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 83)(15, "button", 84);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_59_Template_button_click_15_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeRedeemModal());
    });
    \u0275\u0275text(16, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "button", 85);
    \u0275\u0275listener("click", function WalletViewComponent_Conditional_59_Template_button_click_17_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.submitRedeemCode());
    });
    \u0275\u0275conditionalCreate(18, WalletViewComponent_Conditional_59_Conditional_18_Template, 2, 0)(19, WalletViewComponent_Conditional_59_Conditional_19_Template, 1, 0);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.redeemCode);
    \u0275\u0275property("disabled", ctx_r1.isRedeeming());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.redeemError() ? 12 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.redeemSuccess() ? 13 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.isRedeeming());
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", !ctx_r1.redeemCode.trim() || ctx_r1.isRedeeming());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isRedeeming() ? 18 : 19);
  }
}
var WalletViewComponent = class _WalletViewComponent {
  constructor(walletService, router, apiService) {
    this.walletService = walletService;
    this.router = router;
    this.apiService = apiService;
    this.wallet = signal(null, ...ngDevMode ? [{ debugName: "wallet" }] : []);
    this.recentTransactions = signal([], ...ngDevMode ? [{ debugName: "recentTransactions" }] : []);
    this.analysis = signal(null, ...ngDevMode ? [{ debugName: "analysis" }] : []);
    this.monthlySummary = signal([], ...ngDevMode ? [{ debugName: "monthlySummary" }] : []);
    this.loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.showRedeemModal = signal(false, ...ngDevMode ? [{ debugName: "showRedeemModal" }] : []);
    this.redeemCode = "";
    this.isRedeeming = signal(false, ...ngDevMode ? [{ debugName: "isRedeeming" }] : []);
    this.redeemError = signal("", ...ngDevMode ? [{ debugName: "redeemError" }] : []);
    this.redeemSuccess = signal("", ...ngDevMode ? [{ debugName: "redeemSuccess" }] : []);
    this.isOnline = signal(true, ...ngDevMode ? [{ debugName: "isOnline" }] : []);
    this.globalError = signal("", ...ngDevMode ? [{ debugName: "globalError" }] : []);
    this.isNavigating = signal(false, ...ngDevMode ? [{ debugName: "isNavigating" }] : []);
    this.balanceDisplay = computed(() => {
      const w = this.wallet();
      if (!w)
        return "0.00";
      return (w.available_balance / 100).toFixed(2);
    }, ...ngDevMode ? [{ debugName: "balanceDisplay" }] : []);
    this.isFrozen = computed(() => {
      const w = this.wallet();
      return w?.status === "frozen";
    }, ...ngDevMode ? [{ debugName: "isFrozen" }] : []);
    this.canOperate = computed(() => {
      return this.isOnline() && !this.isFrozen() && !this.loading() && !this.isNavigating();
    }, ...ngDevMode ? [{ debugName: "canOperate" }] : []);
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.isOnline.set(true);
        this.globalError.set("");
        this.loadData();
      });
      window.addEventListener("offline", () => {
        this.isOnline.set(false);
        this.globalError.set("\u7DB2\u7D61\u9023\u63A5\u5DF2\u65B7\u958B\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u7D61\u8A2D\u7F6E");
      });
      this.isOnline.set(navigator.onLine);
    }
  }
  ngOnInit() {
    this.loadData();
    this.walletService.startAutoRefresh();
  }
  ngOnDestroy() {
    this.walletService.stopAutoRefresh();
  }
  async loadData() {
    if (!this.isOnline()) {
      return;
    }
    this.loading.set(true);
    this.globalError.set("");
    try {
      const [wallet, transactions, analysis, monthly] = await Promise.all([
        this.walletService.loadWallet(),
        this.walletService.getRecentTransactions(5),
        this.walletService.getConsumeAnalysis(),
        this.walletService.getMonthlySummary(6)
      ]);
      if (wallet) {
        this.wallet.set(wallet);
        if (wallet.status === "frozen") {
          this.globalError.set("\u60A8\u7684\u9322\u5305\u5DF2\u88AB\u51CD\u7D50\uFF0C\u8ACB\u806F\u7E6B\u5BA2\u670D");
        }
      }
      this.recentTransactions.set(transactions);
      if (analysis)
        this.analysis.set(analysis);
      this.monthlySummary.set(monthly);
    } catch (error) {
      console.error("Load wallet data error:", error);
      if (error.message?.includes("Network") || error.name === "TypeError") {
        this.globalError.set("\u7DB2\u7D61\u8ACB\u6C42\u5931\u6557\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u7D61\u9023\u63A5");
      } else if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
        this.globalError.set("\u767B\u9304\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u9304");
        setTimeout(() => this.router.navigate(["/login"]), 2e3);
      } else {
        this.globalError.set("\u8F09\u5165\u6578\u64DA\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66");
      }
    } finally {
      this.loading.set(false);
    }
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  goToRecharge() {
    console.log("[Wallet] goToRecharge called, isFrozen:", this.isFrozen());
    if (this.isFrozen()) {
      this.globalError.set("\u9322\u5305\u5DF2\u51CD\u7D50\uFF0C\u7121\u6CD5\u9032\u884C\u5145\u503C\u64CD\u4F5C");
      return;
    }
    console.log("[Wallet] Navigating to /wallet/recharge");
    this.router.navigate(["/wallet/recharge"]).then((success) => console.log("[Wallet] Navigation result:", success), (error) => console.error("[Wallet] Navigation error:", error));
  }
  goToWithdraw() {
    console.log("[Wallet] goToWithdraw called, isFrozen:", this.isFrozen());
    if (this.isFrozen()) {
      this.globalError.set("\u9322\u5305\u5DF2\u51CD\u7D50\uFF0C\u7121\u6CD5\u9032\u884C\u63D0\u73FE\u64CD\u4F5C");
      return;
    }
    console.log("[Wallet] Navigating to /wallet/withdraw");
    this.router.navigate(["/wallet/withdraw"]).then((success) => console.log("[Wallet] Navigation result:", success), (error) => console.error("[Wallet] Navigation error:", error));
  }
  // P2: 重試連接
  retryConnection() {
    if (navigator.onLine) {
      this.isOnline.set(true);
      this.globalError.set("");
      this.loadData();
    } else {
      this.globalError.set("\u7DB2\u7D61\u4ECD\u672A\u9023\u63A5\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u7D61\u8A2D\u7F6E");
    }
  }
  // P2: 關閉錯誤提示
  dismissError() {
    this.globalError.set("");
  }
  showRedeemCode() {
    if (this.isFrozen()) {
      this.globalError.set("\u9322\u5305\u5DF2\u51CD\u7D50\uFF0C\u7121\u6CD5\u4F7F\u7528\u514C\u63DB\u78BC");
      return;
    }
    this.redeemCode = "";
    this.redeemError.set("");
    this.redeemSuccess.set("");
    this.showRedeemModal.set(true);
  }
  closeRedeemModal() {
    if (this.isRedeeming())
      return;
    this.showRedeemModal.set(false);
    this.redeemCode = "";
    this.redeemError.set("");
    this.redeemSuccess.set("");
  }
  async submitRedeemCode() {
    const code = this.redeemCode.trim().toUpperCase();
    if (!code) {
      this.redeemError.set("\u8ACB\u8F38\u5165\u514C\u63DB\u78BC");
      return;
    }
    this.isRedeeming.set(true);
    this.redeemError.set("");
    this.redeemSuccess.set("");
    try {
      const response = await this.apiService.post("/api/wallet/redeem", { code });
      if (response.success) {
        const amount = response.data?.amount || 0;
        const bonusAmount = response.data?.bonus_amount || 0;
        const totalAmount = amount + bonusAmount;
        this.redeemSuccess.set(`\u{1F389} \u514C\u63DB\u6210\u529F\uFF01\u7372\u5F97 $${(totalAmount / 100).toFixed(2)}` + (bonusAmount > 0 ? ` (\u542B\u8D08\u9001 $${(bonusAmount / 100).toFixed(2)})` : ""));
        this.walletService.optimisticUpdateBalance(amount, bonusAmount);
        const updatedWallet = this.walletService.wallet();
        if (updatedWallet) {
          this.wallet.set(updatedWallet);
        }
        this.loadData();
        setTimeout(() => {
          this.closeRedeemModal();
        }, 2e3);
      } else {
        const errorMessages = {
          "CODE_NOT_FOUND": "\u514C\u63DB\u78BC\u4E0D\u5B58\u5728",
          "CODE_USED": "\u6B64\u514C\u63DB\u78BC\u5DF2\u88AB\u4F7F\u7528",
          "CODE_EXPIRED": "\u6B64\u514C\u63DB\u78BC\u5DF2\u904E\u671F",
          "CODE_DISABLED": "\u6B64\u514C\u63DB\u78BC\u5DF2\u88AB\u7981\u7528",
          "ALREADY_REDEEMED": "\u60A8\u5DF2\u4F7F\u7528\u904E\u6B64\u514C\u63DB\u78BC",
          "LIMIT_EXCEEDED": "\u8D85\u51FA\u514C\u63DB\u6B21\u6578\u9650\u5236"
        };
        const errorCode = response.code || "";
        this.redeemError.set(errorMessages[errorCode] || response.error || "\u514C\u63DB\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66");
      }
    } catch (error) {
      console.error("Redeem code error:", error);
      this.redeemError.set("\u7DB2\u7D61\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u518D\u8A66");
    } finally {
      this.isRedeeming.set(false);
    }
  }
  showTransactions() {
    this.router.navigate(["/wallet/transactions"]);
  }
  showOrders() {
    this.router.navigate(["/wallet/orders"]);
  }
  showAnalytics() {
    this.router.navigate(["/wallet/analytics"]);
  }
  formatCents(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  formatDate(dateStr) {
    if (!dateStr)
      return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  formatMonth(monthStr) {
    if (!monthStr)
      return "";
    const [year, month] = monthStr.split("-");
    return `${month}\u6708`;
  }
  getCategoryIcon(category) {
    const icons = {
      membership: "\u{1F451}",
      ip_proxy: "\u{1F310}",
      quota_pack: "\u{1F4E6}",
      other: "\u{1F4CB}"
    };
    return icons[category] || "\u{1F4CB}";
  }
  getTypeIcon(type) {
    return this.walletService.getTypeIcon(type);
  }
  getTypeName(type) {
    return this.walletService.getTypeName(type);
  }
  getBarHeight(amount) {
    const maxAmount = Math.max(...this.monthlySummary().flatMap((m) => [m.income, m.expense]));
    if (maxAmount === 0)
      return 4;
    return Math.max(4, amount / maxAmount * 60);
  }
  static {
    this.\u0275fac = function WalletViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletViewComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router), \u0275\u0275directiveInject(ApiService));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletViewComponent, selectors: [["app-wallet-view"]], decls: 60, vars: 14, consts: [[1, "wallet-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "icon"], [1, "header-actions"], [1, "action-btn", 3, "click"], [1, "balance-card"], [1, "balance-bg"], [1, "balance-content"], [1, "balance-label"], [1, "balance-amount"], [1, "currency"], [1, "amount"], [1, "balance-details"], [1, "detail-item"], [1, "label"], [1, "value"], [1, "frozen-warning"], [1, "balance-actions"], [1, "recharge-btn", 3, "click", "disabled"], [1, "withdraw-btn", 3, "click", "disabled"], [1, "redeem-btn", 3, "click", "disabled"], [1, "offline-banner"], [1, "global-error-toast"], ["class", "section consume-overview", 4, "ngIf"], [1, "section", "recent-transactions"], [1, "section-header"], [1, "view-all-btn", 3, "click"], [1, "transaction-list"], [1, "transaction-item", 3, "income", "expense"], [1, "empty-state"], ["class", "section monthly-stats", 4, "ngIf"], ["class", "loading-overlay", 4, "ngIf"], [1, "modal-overlay"], [1, "offline-icon"], [1, "offline-text"], [1, "retry-btn", 3, "click"], [1, "global-error-toast", 3, "click"], [1, "error-icon"], [1, "error-text"], [1, "dismiss-btn"], [1, "section", "consume-overview"], [1, "total"], [1, "consume-bars"], [1, "consume-bar"], [1, "bar-label"], [1, "name"], [1, "bar-track"], [1, "bar-fill"], [1, "bar-value"], [1, "percent"], [1, "text"], [1, "transaction-item"], [1, "tx-icon"], [1, "tx-info"], [1, "tx-desc"], [1, "tx-time"], [1, "tx-amount"], [1, "section", "monthly-stats"], [1, "monthly-chart"], [1, "month-bar"], [1, "chart-legend"], [1, "legend-item", "income"], [1, "dot"], [1, "legend-item", "expense"], [1, "month-label"], [1, "bars"], [1, "income-bar"], [1, "tooltip"], [1, "expense-bar"], [1, "loading-overlay"], [1, "loading-spinner"], [1, "modal-overlay", 3, "click"], [1, "modal-content", "redeem-modal", 3, "click"], [1, "modal-header"], [1, "close-btn", 3, "click"], [1, "modal-body"], [1, "modal-desc"], [1, "input-group"], ["type", "text", "placeholder", "\u8ACB\u8F38\u5165\u514C\u63DB\u78BC", "maxlength", "32", 1, "redeem-input", 3, "ngModelChange", "keyup.enter", "ngModel", "disabled"], [1, "error-message"], [1, "success-message"], [1, "modal-footer"], [1, "cancel-btn", 3, "click", "disabled"], [1, "submit-btn", 3, "click", "disabled"], [1, "btn-spinner"]], template: function WalletViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275elementStart(4, "span", 4);
        \u0275\u0275text(5, "\u2190");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "h1");
        \u0275\u0275text(7, "\u{1F4B0} \u6211\u7684\u9322\u5305");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "div", 5)(9, "button", 6);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_9_listener() {
          return ctx.showTransactions();
        });
        \u0275\u0275text(10, " \u{1F4DC} \u4EA4\u6613\u8A18\u9304 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "button", 6);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_11_listener() {
          return ctx.showOrders();
        });
        \u0275\u0275text(12, " \u{1F4CB} \u5145\u503C\u8A02\u55AE ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 6);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_13_listener() {
          return ctx.showAnalytics();
        });
        \u0275\u0275text(14, " \u{1F4CA} \u6D88\u8CBB\u5206\u6790 ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(15, "div", 7);
        \u0275\u0275element(16, "div", 8);
        \u0275\u0275elementStart(17, "div", 9)(18, "div", 10);
        \u0275\u0275text(19, "\u53EF\u7528\u9918\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "div", 11)(21, "span", 12);
        \u0275\u0275text(22, "$");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(23, "span", 13);
        \u0275\u0275text(24);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(25, "div", 14)(26, "div", 15)(27, "span", 16);
        \u0275\u0275text(28, "\u51CD\u7D50\u4E2D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "span", 17);
        \u0275\u0275text(30);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(31, "div", 15)(32, "span", 16);
        \u0275\u0275text(33, "\u8D08\u9001\u9918\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "span", 17);
        \u0275\u0275text(35);
        \u0275\u0275elementEnd()()();
        \u0275\u0275conditionalCreate(36, WalletViewComponent_Conditional_36_Template, 2, 0, "div", 18);
        \u0275\u0275elementStart(37, "div", 19)(38, "button", 20);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_38_listener() {
          return ctx.goToRecharge();
        });
        \u0275\u0275text(39, " \u{1F4B3} \u5145\u503C ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "button", 21);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_40_listener() {
          return ctx.goToWithdraw();
        });
        \u0275\u0275text(41, " \u{1F4E4} \u63D0\u73FE ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "button", 22);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_42_listener() {
          return ctx.showRedeemCode();
        });
        \u0275\u0275text(43, " \u{1F381} \u514C\u63DB\u78BC ");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275conditionalCreate(44, WalletViewComponent_Conditional_44_Template, 7, 0, "div", 23);
        \u0275\u0275conditionalCreate(45, WalletViewComponent_Conditional_45_Template, 7, 1, "div", 24);
        \u0275\u0275template(46, WalletViewComponent_div_46_Template, 10, 4, "div", 25);
        \u0275\u0275elementStart(47, "div", 26)(48, "div", 27)(49, "h2");
        \u0275\u0275text(50, "\u{1F550} \u6700\u8FD1\u4EA4\u6613");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(51, "button", 28);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_51_listener() {
          return ctx.showTransactions();
        });
        \u0275\u0275text(52, " \u67E5\u770B\u5168\u90E8 \u2192 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(53, "div", 29);
        \u0275\u0275repeaterCreate(54, WalletViewComponent_For_55_Template, 10, 12, "div", 30, _forTrack0);
        \u0275\u0275conditionalCreate(56, WalletViewComponent_Conditional_56_Template, 5, 0, "div", 31);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(57, WalletViewComponent_div_57_Template, 16, 0, "div", 32)(58, WalletViewComponent_div_58_Template, 4, 0, "div", 33);
        \u0275\u0275conditionalCreate(59, WalletViewComponent_Conditional_59_Template, 20, 7, "div", 34);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_2_0;
        \u0275\u0275advance(24);
        \u0275\u0275textInterpolate(ctx.balanceDisplay());
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.formatCents(((tmp_1_0 = ctx.wallet()) == null ? null : tmp_1_0.frozen_balance) || 0));
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(((tmp_2_0 = ctx.wallet()) == null ? null : tmp_2_0.bonus_display) || "$0.00");
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isFrozen() ? 36 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", ctx.isFrozen());
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", ctx.isFrozen());
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", ctx.isFrozen());
        \u0275\u0275advance(2);
        \u0275\u0275conditional(!ctx.isOnline() ? 44 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.globalError() ? 45 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.analysis());
        \u0275\u0275advance(8);
        \u0275\u0275repeater(ctx.recentTransactions());
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.recentTransactions().length === 0 ? 56 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.monthlySummary().length > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.loading());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showRedeemModal() ? 59 : -1);
      }
    }, dependencies: [CommonModule, NgIf, FormsModule, DefaultValueAccessor, NgControlStatus, MaxLengthValidator, NgModel], styles: ["\n\n.wallet-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.action-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.balance-card[_ngcontent-%COMP%] {\n  position: relative;\n  border-radius: 24px;\n  overflow: hidden;\n  margin-bottom: 24px;\n}\n.balance-bg[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  pointer-events: none;\n}\n.balance-content[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 32px;\n  z-index: 1;\n}\n.balance-label[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.8;\n  margin-bottom: 8px;\n}\n.balance-amount[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 24px;\n}\n.balance-amount[_ngcontent-%COMP%]   .currency[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n}\n.balance-amount[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  font-size: 48px;\n  font-weight: 700;\n}\n.balance-details[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 32px;\n  margin-bottom: 24px;\n}\n.detail-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.detail-item[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.detail-item[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 500;\n}\n.balance-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n}\n.balance-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 12px 20px;\n  border-radius: 12px;\n  border: none;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.recharge-btn[_ngcontent-%COMP%] {\n  background: #fff;\n  color: #764ba2;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n.recharge-btn[_ngcontent-%COMP%]:hover {\n  background: #f8f8ff;\n  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);\n}\n.recharge-btn[_ngcontent-%COMP%]:active {\n  transform: scale(0.98);\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n.withdraw-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.withdraw-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.withdraw-btn[_ngcontent-%COMP%]:active {\n  transform: scale(0.98);\n  background: rgba(255, 255, 255, 0.25);\n}\n.redeem-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.redeem-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.redeem-btn[_ngcontent-%COMP%]:active {\n  transform: scale(0.98);\n  background: rgba(255, 255, 255, 0.25);\n}\n.balance-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n}\n.balance-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n  transform: none !important;\n}\n.balance-actions[_ngcontent-%COMP%]   button.loading[_ngcontent-%COMP%] {\n  position: relative;\n}\n.frozen-warning[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.2) 0%,\n      rgba(185, 28, 28, 0.2) 100%);\n  border: 1px solid rgba(239, 68, 68, 0.4);\n  border-radius: 12px;\n  padding: 12px 16px;\n  margin-bottom: 16px;\n  font-size: 14px;\n  color: #fca5a5;\n  text-align: center;\n  animation: _ngcontent-%COMP%_pulse 2s infinite;\n}\n@keyframes _ngcontent-%COMP%_pulse {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.7;\n  }\n}\n.offline-banner[_ngcontent-%COMP%] {\n  position: fixed;\n  top: 60px;\n  left: 50%;\n  transform: translateX(-50%);\n  background:\n    linear-gradient(\n      135deg,\n      #f59e0b 0%,\n      #d97706 100%);\n  color: #fff;\n  padding: 12px 20px;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n  animation: _ngcontent-%COMP%_slideDown 0.3s ease;\n}\n@keyframes _ngcontent-%COMP%_slideDown {\n  from {\n    transform: translateX(-50%) translateY(-100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.offline-icon[_ngcontent-%COMP%] {\n  font-size: 20px;\n}\n.offline-text[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 500;\n}\n.retry-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.2);\n  border: none;\n  color: #fff;\n  padding: 6px 12px;\n  border-radius: 6px;\n  font-size: 13px;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.retry-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.global-error-toast[_ngcontent-%COMP%] {\n  position: fixed;\n  bottom: 20px;\n  left: 50%;\n  transform: translateX(-50%);\n  background:\n    linear-gradient(\n      135deg,\n      #dc2626 0%,\n      #b91c1c 100%);\n  color: #fff;\n  padding: 12px 20px;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n  cursor: pointer;\n  animation: _ngcontent-%COMP%_slideUp 0.3s ease;\n}\n@keyframes _ngcontent-%COMP%_slideUp {\n  from {\n    transform: translateX(-50%) translateY(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.error-icon[_ngcontent-%COMP%] {\n  font-size: 18px;\n}\n.error-text[_ngcontent-%COMP%] {\n  font-size: 14px;\n  max-width: 280px;\n}\n.dismiss-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: rgba(255, 255, 255, 0.7);\n  font-size: 18px;\n  cursor: pointer;\n  padding: 0 4px;\n}\n.dismiss-btn[_ngcontent-%COMP%]:hover {\n  color: #fff;\n}\n.section[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0;\n}\n.section-header[_ngcontent-%COMP%]   .total[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: #f59e0b;\n}\n.view-all-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: #667eea;\n  font-size: 13px;\n  cursor: pointer;\n}\n.consume-bar[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.bar-label[_ngcontent-%COMP%] {\n  width: 100px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.bar-track[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.bar-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  background:\n    linear-gradient(\n      90deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px;\n  transition: width 0.5s ease;\n}\n.bar-value[_ngcontent-%COMP%] {\n  width: 100px;\n  text-align: right;\n  font-size: 13px;\n}\n.bar-value[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  color: #f59e0b;\n  margin-right: 8px;\n}\n.bar-value[_ngcontent-%COMP%]   .percent[_ngcontent-%COMP%] {\n  opacity: 0.6;\n}\n.transaction-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.tx-icon[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 18px;\n}\n.tx-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.tx-desc[_ngcontent-%COMP%] {\n  font-size: 14px;\n  margin-bottom: 4px;\n}\n.tx-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-amount[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n}\n.tx-amount.positive[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.tx-amount.negative[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.monthly-chart[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  height: 120px;\n  align-items: flex-end;\n  padding-bottom: 24px;\n}\n.month-bar[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n.month-label[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.6;\n}\n.bars[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 4px;\n  align-items: flex-end;\n  height: 80px;\n}\n.income-bar[_ngcontent-%COMP%], \n.expense-bar[_ngcontent-%COMP%] {\n  width: 12px;\n  border-radius: 4px 4px 0 0;\n  position: relative;\n  min-height: 4px;\n}\n.income-bar[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      180deg,\n      #22c55e,\n      #16a34a);\n}\n.expense-bar[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      180deg,\n      #ef4444,\n      #dc2626);\n}\n.chart-legend[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 24px;\n  margin-top: 12px;\n}\n.legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  opacity: 0.7;\n}\n.legend-item[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.legend-item.income[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.legend-item.expense[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.empty-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n.empty-state[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n  margin-bottom: 8px;\n}\n.loading-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.75);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 200;\n  animation: _ngcontent-%COMP%_fadeIn 0.2s ease;\n}\n@keyframes _ngcontent-%COMP%_fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n.modal-content[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #1e293b 0%,\n      #0f172a 100%);\n  border-radius: 20px;\n  width: 90%;\n  max-width: 400px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);\n  animation: _ngcontent-%COMP%_slideUp 0.3s ease;\n}\n@keyframes _ngcontent-%COMP%_slideUp {\n  from {\n    transform: translateY(20px);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.modal-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px 24px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n}\n.close-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: #94a3b8;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 4px 8px;\n  border-radius: 6px;\n  transition: all 0.2s;\n}\n.close-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n  color: #fff;\n}\n.modal-body[_ngcontent-%COMP%] {\n  padding: 24px;\n}\n.modal-desc[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  font-size: 14px;\n  margin: 0 0 16px 0;\n}\n.input-group[_ngcontent-%COMP%] {\n  margin-bottom: 16px;\n}\n.redeem-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 14px 16px;\n  border-radius: 12px;\n  border: 2px solid rgba(255, 255, 255, 0.1);\n  background: rgba(255, 255, 255, 0.05);\n  color: #fff;\n  font-size: 16px;\n  text-align: center;\n  letter-spacing: 2px;\n  text-transform: uppercase;\n  transition: all 0.2s;\n}\n.redeem-input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.redeem-input[_ngcontent-%COMP%]:disabled {\n  opacity: 0.5;\n}\n.redeem-input[_ngcontent-%COMP%]::placeholder {\n  color: #64748b;\n  letter-spacing: normal;\n  text-transform: none;\n}\n.error-message[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  background: rgba(239, 68, 68, 0.15);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 10px;\n  color: #fca5a5;\n  font-size: 14px;\n  margin-top: 12px;\n}\n.success-message[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  background: rgba(34, 197, 94, 0.15);\n  border: 1px solid rgba(34, 197, 94, 0.3);\n  border-radius: 10px;\n  color: #86efac;\n  font-size: 14px;\n  margin-top: 12px;\n}\n.modal-footer[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  padding: 20px 24px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-footer[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 14px 20px;\n  border-radius: 12px;\n  font-size: 15px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n  border: none;\n}\n.cancel-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.1);\n  color: #94a3b8;\n}\n.cancel-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(255, 255, 255, 0.15);\n  color: #fff;\n}\n.submit-btn[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-spinner[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: #fff;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n/*# sourceMappingURL=wallet-view.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletViewComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-view", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="wallet-view">
      <!-- \u9802\u90E8\u5C0E\u822A -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">\u2190</span>
          </button>
          <h1>\u{1F4B0} \u6211\u7684\u9322\u5305</h1>
        </div>
        <div class="header-actions">
          <button class="action-btn" (click)="showTransactions()">
            \u{1F4DC} \u4EA4\u6613\u8A18\u9304
          </button>
          <button class="action-btn" (click)="showOrders()">
            \u{1F4CB} \u5145\u503C\u8A02\u55AE
          </button>
          <button class="action-btn" (click)="showAnalytics()">
            \u{1F4CA} \u6D88\u8CBB\u5206\u6790
          </button>
        </div>
      </div>

      <!-- \u9918\u984D\u5361\u7247 -->
      <div class="balance-card">
        <div class="balance-bg"></div>
        <div class="balance-content">
          <div class="balance-label">\u53EF\u7528\u9918\u984D</div>
          <div class="balance-amount">
            <span class="currency">$</span>
            <span class="amount">{{ balanceDisplay() }}</span>
          </div>
          <div class="balance-details">
            <div class="detail-item">
              <span class="label">\u51CD\u7D50\u4E2D</span>
              <span class="value">{{ formatCents(wallet()?.frozen_balance || 0) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">\u8D08\u9001\u9918\u984D</span>
              <span class="value">{{ wallet()?.bonus_display || '$0.00' }}</span>
            </div>
          </div>
          <!-- P2: \u51CD\u7D50\u72C0\u614B\u8B66\u544A -->
          @if (isFrozen()) {
            <div class="frozen-warning">
              \u{1F512} \u9322\u5305\u5DF2\u88AB\u51CD\u7D50\uFF0C\u8ACB\u806F\u7E6B\u5BA2\u670D\u89E3\u51CD\u5F8C\u64CD\u4F5C
            </div>
          }
          
          <div class="balance-actions">
            <button 
              class="recharge-btn" 
              (click)="goToRecharge()"
              [disabled]="isFrozen()"
            >
              \u{1F4B3} \u5145\u503C
            </button>
            <button 
              class="withdraw-btn" 
              (click)="goToWithdraw()"
              [disabled]="isFrozen()"
            >
              \u{1F4E4} \u63D0\u73FE
            </button>
            <button 
              class="redeem-btn" 
              (click)="showRedeemCode()"
              [disabled]="isFrozen()"
            >
              \u{1F381} \u514C\u63DB\u78BC
            </button>
          </div>
        </div>
      </div>
      
      <!-- P2: \u96E2\u7DDA\u63D0\u793A\u689D -->
      @if (!isOnline()) {
        <div class="offline-banner">
          <span class="offline-icon">\u{1F4E1}</span>
          <span class="offline-text">\u60A8\u76EE\u524D\u8655\u65BC\u96E2\u7DDA\u72C0\u614B</span>
          <button class="retry-btn" (click)="retryConnection()">\u91CD\u8A66\u9023\u63A5</button>
        </div>
      }
      
      <!-- P2: \u5168\u5C40\u932F\u8AA4\u63D0\u793A -->
      @if (globalError()) {
        <div class="global-error-toast" (click)="dismissError()">
          <span class="error-icon">\u26A0\uFE0F</span>
          <span class="error-text">{{ globalError() }}</span>
          <button class="dismiss-btn">\xD7</button>
        </div>
      }

      <!-- \u672C\u6708\u6D88\u8CBB\u6982\u89BD -->
      <div class="section consume-overview" *ngIf="analysis()">
        <div class="section-header">
          <h2>\u{1F4CA} \u672C\u6708\u6D88\u8CBB\u6982\u89BD</h2>
          <span class="total">{{ analysis()?.total_display }}</span>
        </div>
        <div class="consume-bars">
          @for (item of analysis()?.by_category || []; track item.category) {
            <div class="consume-bar">
              <div class="bar-label">
                <span class="icon">{{ getCategoryIcon(item.category) }}</span>
                <span class="name">{{ item.category_name }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="item.percent"></div>
              </div>
              <div class="bar-value">
                <span class="amount">{{ item.amount_display }}</span>
                <span class="percent">{{ item.percent }}%</span>
              </div>
            </div>
          }
          @if ((analysis()?.by_category || []).length === 0) {
            <div class="empty-state">
              <span class="icon">\u{1F4ED}</span>
              <span class="text">\u672C\u6708\u66AB\u7121\u6D88\u8CBB</span>
            </div>
          }
        </div>
      </div>

      <!-- \u6700\u8FD1\u4EA4\u6613 -->
      <div class="section recent-transactions">
        <div class="section-header">
          <h2>\u{1F550} \u6700\u8FD1\u4EA4\u6613</h2>
          <button class="view-all-btn" (click)="showTransactions()">
            \u67E5\u770B\u5168\u90E8 \u2192
          </button>
        </div>
        <div class="transaction-list">
          @for (tx of recentTransactions(); track tx.id) {
            <div class="transaction-item" [class.income]="tx.amount > 0" [class.expense]="tx.amount < 0">
              <div class="tx-icon">{{ getTypeIcon(tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || getTypeName(tx.type) }}</div>
                <div class="tx-time">{{ formatDate(tx.created_at) }}</div>
              </div>
              <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                {{ tx.amount_display }}
              </div>
            </div>
          }
          @if (recentTransactions().length === 0) {
            <div class="empty-state">
              <span class="icon">\u{1F4ED}</span>
              <span class="text">\u66AB\u7121\u4EA4\u6613\u8A18\u9304</span>
            </div>
          }
        </div>
      </div>

      <!-- \u6708\u5EA6\u7D71\u8A08 -->
      <div class="section monthly-stats" *ngIf="monthlySummary().length > 0">
        <div class="section-header">
          <h2>\u{1F4C5} \u6708\u5EA6\u7D71\u8A08</h2>
        </div>
        <div class="monthly-chart">
          @for (month of monthlySummary(); track month.month) {
            <div class="month-bar">
              <div class="month-label">{{ formatMonth(month.month) }}</div>
              <div class="bars">
                <div class="income-bar" [style.height.px]="getBarHeight(month.income)">
                  <span class="tooltip">\u6536\u5165: {{ month.income_display }}</span>
                </div>
                <div class="expense-bar" [style.height.px]="getBarHeight(month.expense)">
                  <span class="tooltip">\u652F\u51FA: {{ month.expense_display }}</span>
                </div>
              </div>
            </div>
          }
        </div>
        <div class="chart-legend">
          <div class="legend-item income">
            <span class="dot"></span>
            <span class="label">\u6536\u5165</span>
          </div>
          <div class="legend-item expense">
            <span class="dot"></span>
            <span class="label">\u652F\u51FA</span>
          </div>
        </div>
      </div>

      <!-- \u52A0\u8F09\u906E\u7F69 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>\u52A0\u8F09\u4E2D...</span>
      </div>

      <!-- \u514C\u63DB\u78BC\u5F48\u7A97 -->
      @if (showRedeemModal()) {
        <div class="modal-overlay" (click)="closeRedeemModal()">
          <div class="modal-content redeem-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>\u{1F381} \u514C\u63DB\u78BC</h3>
              <button class="close-btn" (click)="closeRedeemModal()">\u2715</button>
            </div>
            <div class="modal-body">
              <p class="modal-desc">\u8F38\u5165\u514C\u63DB\u78BC\u4EE5\u7372\u5F97\u9918\u984D\u6216\u512A\u60E0</p>
              <div class="input-group">
                <input 
                  type="text" 
                  class="redeem-input"
                  [(ngModel)]="redeemCode"
                  placeholder="\u8ACB\u8F38\u5165\u514C\u63DB\u78BC"
                  [disabled]="isRedeeming()"
                  (keyup.enter)="submitRedeemCode()"
                  maxlength="32"
                />
              </div>
              @if (redeemError()) {
                <div class="error-message">{{ redeemError() }}</div>
              }
              @if (redeemSuccess()) {
                <div class="success-message">{{ redeemSuccess() }}</div>
              }
            </div>
            <div class="modal-footer">
              <button 
                class="cancel-btn" 
                (click)="closeRedeemModal()"
                [disabled]="isRedeeming()"
              >
                \u53D6\u6D88
              </button>
              <button 
                class="submit-btn" 
                (click)="submitRedeemCode()"
                [disabled]="!redeemCode.trim() || isRedeeming()"
              >
                @if (isRedeeming()) {
                  <span class="btn-spinner"></span> \u514C\u63DB\u4E2D...
                } @else {
                  \u78BA\u8A8D\u514C\u63DB
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;6b77e5748135997ff90931806a7381dea5561d5d0fbb5cc233add35697023607;D:/tgkz2026/src/views/wallet-view.component.ts */\n.wallet-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.action-btn {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.balance-card {\n  position: relative;\n  border-radius: 24px;\n  overflow: hidden;\n  margin-bottom: 24px;\n}\n.balance-bg {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  pointer-events: none;\n}\n.balance-content {\n  position: relative;\n  padding: 32px;\n  z-index: 1;\n}\n.balance-label {\n  font-size: 14px;\n  opacity: 0.8;\n  margin-bottom: 8px;\n}\n.balance-amount {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 24px;\n}\n.balance-amount .currency {\n  font-size: 24px;\n  font-weight: 600;\n}\n.balance-amount .amount {\n  font-size: 48px;\n  font-weight: 700;\n}\n.balance-details {\n  display: flex;\n  gap: 32px;\n  margin-bottom: 24px;\n}\n.detail-item {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.detail-item .label {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.detail-item .value {\n  font-size: 16px;\n  font-weight: 500;\n}\n.balance-actions {\n  display: flex;\n  gap: 12px;\n}\n.balance-actions button {\n  flex: 1;\n  padding: 12px 20px;\n  border-radius: 12px;\n  border: none;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.recharge-btn {\n  background: #fff;\n  color: #764ba2;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);\n}\n.recharge-btn:hover {\n  background: #f8f8ff;\n  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);\n}\n.recharge-btn:active {\n  transform: scale(0.98);\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);\n}\n.withdraw-btn {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.withdraw-btn:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.withdraw-btn:active {\n  transform: scale(0.98);\n  background: rgba(255, 255, 255, 0.25);\n}\n.redeem-btn {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n  -webkit-backdrop-filter: blur(4px);\n  backdrop-filter: blur(4px);\n}\n.redeem-btn:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.redeem-btn:active {\n  transform: scale(0.98);\n  background: rgba(255, 255, 255, 0.25);\n}\n.balance-actions button:hover {\n  transform: translateY(-2px);\n}\n.balance-actions button:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n  transform: none !important;\n}\n.balance-actions button.loading {\n  position: relative;\n}\n.frozen-warning {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(239, 68, 68, 0.2) 0%,\n      rgba(185, 28, 28, 0.2) 100%);\n  border: 1px solid rgba(239, 68, 68, 0.4);\n  border-radius: 12px;\n  padding: 12px 16px;\n  margin-bottom: 16px;\n  font-size: 14px;\n  color: #fca5a5;\n  text-align: center;\n  animation: pulse 2s infinite;\n}\n@keyframes pulse {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.7;\n  }\n}\n.offline-banner {\n  position: fixed;\n  top: 60px;\n  left: 50%;\n  transform: translateX(-50%);\n  background:\n    linear-gradient(\n      135deg,\n      #f59e0b 0%,\n      #d97706 100%);\n  color: #fff;\n  padding: 12px 20px;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n  animation: slideDown 0.3s ease;\n}\n@keyframes slideDown {\n  from {\n    transform: translateX(-50%) translateY(-100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.offline-icon {\n  font-size: 20px;\n}\n.offline-text {\n  font-size: 14px;\n  font-weight: 500;\n}\n.retry-btn {\n  background: rgba(255, 255, 255, 0.2);\n  border: none;\n  color: #fff;\n  padding: 6px 12px;\n  border-radius: 6px;\n  font-size: 13px;\n  cursor: pointer;\n  transition: background 0.2s;\n}\n.retry-btn:hover {\n  background: rgba(255, 255, 255, 0.3);\n}\n.global-error-toast {\n  position: fixed;\n  bottom: 20px;\n  left: 50%;\n  transform: translateX(-50%);\n  background:\n    linear-gradient(\n      135deg,\n      #dc2626 0%,\n      #b91c1c 100%);\n  color: #fff;\n  padding: 12px 20px;\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);\n  z-index: 1000;\n  cursor: pointer;\n  animation: slideUp 0.3s ease;\n}\n@keyframes slideUp {\n  from {\n    transform: translateX(-50%) translateY(100%);\n    opacity: 0;\n  }\n  to {\n    transform: translateX(-50%) translateY(0);\n    opacity: 1;\n  }\n}\n.error-icon {\n  font-size: 18px;\n}\n.error-text {\n  font-size: 14px;\n  max-width: 280px;\n}\n.dismiss-btn {\n  background: none;\n  border: none;\n  color: rgba(255, 255, 255, 0.7);\n  font-size: 18px;\n  cursor: pointer;\n  padding: 0 4px;\n}\n.dismiss-btn:hover {\n  color: #fff;\n}\n.section {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0;\n}\n.section-header .total {\n  font-size: 20px;\n  font-weight: 700;\n  color: #f59e0b;\n}\n.view-all-btn {\n  background: none;\n  border: none;\n  color: #667eea;\n  font-size: 13px;\n  cursor: pointer;\n}\n.consume-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.bar-label {\n  width: 100px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.bar-track {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.bar-fill {\n  height: 100%;\n  background:\n    linear-gradient(\n      90deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px;\n  transition: width 0.5s ease;\n}\n.bar-value {\n  width: 100px;\n  text-align: right;\n  font-size: 13px;\n}\n.bar-value .amount {\n  color: #f59e0b;\n  margin-right: 8px;\n}\n.bar-value .percent {\n  opacity: 0.6;\n}\n.transaction-item {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item:last-child {\n  border-bottom: none;\n}\n.tx-icon {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 18px;\n}\n.tx-info {\n  flex: 1;\n}\n.tx-desc {\n  font-size: 14px;\n  margin-bottom: 4px;\n}\n.tx-time {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-amount {\n  font-size: 16px;\n  font-weight: 600;\n}\n.tx-amount.positive {\n  color: #22c55e;\n}\n.tx-amount.negative {\n  color: #ef4444;\n}\n.monthly-chart {\n  display: flex;\n  gap: 12px;\n  height: 120px;\n  align-items: flex-end;\n  padding-bottom: 24px;\n}\n.month-bar {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n.month-label {\n  font-size: 11px;\n  opacity: 0.6;\n}\n.bars {\n  display: flex;\n  gap: 4px;\n  align-items: flex-end;\n  height: 80px;\n}\n.income-bar,\n.expense-bar {\n  width: 12px;\n  border-radius: 4px 4px 0 0;\n  position: relative;\n  min-height: 4px;\n}\n.income-bar {\n  background:\n    linear-gradient(\n      180deg,\n      #22c55e,\n      #16a34a);\n}\n.expense-bar {\n  background:\n    linear-gradient(\n      180deg,\n      #ef4444,\n      #dc2626);\n}\n.chart-legend {\n  display: flex;\n  justify-content: center;\n  gap: 24px;\n  margin-top: 12px;\n}\n.legend-item {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  opacity: 0.7;\n}\n.legend-item .dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.legend-item.income .dot {\n  background: #22c55e;\n}\n.legend-item.expense .dot {\n  background: #ef4444;\n}\n.empty-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n.empty-state .icon {\n  font-size: 32px;\n  margin-bottom: 8px;\n}\n.loading-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.75);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 200;\n  animation: fadeIn 0.2s ease;\n}\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n.modal-content {\n  background:\n    linear-gradient(\n      135deg,\n      #1e293b 0%,\n      #0f172a 100%);\n  border-radius: 20px;\n  width: 90%;\n  max-width: 400px;\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);\n  animation: slideUp 0.3s ease;\n}\n@keyframes slideUp {\n  from {\n    transform: translateY(20px);\n    opacity: 0;\n  }\n  to {\n    transform: translateY(0);\n    opacity: 1;\n  }\n}\n.modal-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px 24px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header h3 {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n}\n.close-btn {\n  background: none;\n  border: none;\n  color: #94a3b8;\n  font-size: 18px;\n  cursor: pointer;\n  padding: 4px 8px;\n  border-radius: 6px;\n  transition: all 0.2s;\n}\n.close-btn:hover {\n  background: rgba(255, 255, 255, 0.1);\n  color: #fff;\n}\n.modal-body {\n  padding: 24px;\n}\n.modal-desc {\n  color: #94a3b8;\n  font-size: 14px;\n  margin: 0 0 16px 0;\n}\n.input-group {\n  margin-bottom: 16px;\n}\n.redeem-input {\n  width: 100%;\n  padding: 14px 16px;\n  border-radius: 12px;\n  border: 2px solid rgba(255, 255, 255, 0.1);\n  background: rgba(255, 255, 255, 0.05);\n  color: #fff;\n  font-size: 16px;\n  text-align: center;\n  letter-spacing: 2px;\n  text-transform: uppercase;\n  transition: all 0.2s;\n}\n.redeem-input:focus {\n  outline: none;\n  border-color: #667eea;\n  background: rgba(102, 126, 234, 0.1);\n}\n.redeem-input:disabled {\n  opacity: 0.5;\n}\n.redeem-input::placeholder {\n  color: #64748b;\n  letter-spacing: normal;\n  text-transform: none;\n}\n.error-message {\n  padding: 12px 16px;\n  background: rgba(239, 68, 68, 0.15);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 10px;\n  color: #fca5a5;\n  font-size: 14px;\n  margin-top: 12px;\n}\n.success-message {\n  padding: 12px 16px;\n  background: rgba(34, 197, 94, 0.15);\n  border: 1px solid rgba(34, 197, 94, 0.3);\n  border-radius: 10px;\n  color: #86efac;\n  font-size: 14px;\n  margin-top: 12px;\n}\n.modal-footer {\n  display: flex;\n  gap: 12px;\n  padding: 20px 24px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-footer button {\n  flex: 1;\n  padding: 14px 20px;\n  border-radius: 12px;\n  font-size: 15px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n  border: none;\n}\n.cancel-btn {\n  background: rgba(255, 255, 255, 0.1);\n  color: #94a3b8;\n}\n.cancel-btn:hover:not(:disabled) {\n  background: rgba(255, 255, 255, 0.15);\n  color: #fff;\n}\n.submit-btn {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n  color: #fff;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n}\n.submit-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.btn-spinner {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: #fff;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n/*# sourceMappingURL=wallet-view.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }, { type: ApiService }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletViewComponent, { className: "WalletViewComponent", filePath: "src/views/wallet-view.component.ts", lineNumber: 1013 });
})();

export {
  WalletViewComponent
};
//# sourceMappingURL=chunk-PE2R2LMV.js.map
