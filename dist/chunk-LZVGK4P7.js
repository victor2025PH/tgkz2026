import {
  WalletService
} from "./chunk-2RAHAZHZ.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
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
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-view.component.ts
var _c0 = () => [];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.category;
var _forTrack2 = ($index, $item) => $item.month;
function WalletViewComponent_div_43_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 35)(2, "span", 4);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 36);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 37);
    \u0275\u0275element(7, "div", 38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 39)(9, "span", 13);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 40);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const item_r1 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getCategoryIcon(item_r1.category));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r1.category_name);
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", item_r1.percent, "%");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r1.amount_display);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", item_r1.percent, "%");
  }
}
function WalletViewComponent_div_43_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "span", 4);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 41);
    \u0275\u0275text(4, "\u672C\u6708\u66AB\u7121\u6D88\u8CBB");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_div_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "div", 24)(2, "h2");
    \u0275\u0275text(3, "\u{1F4CA} \u672C\u6708\u6D88\u8CBB\u6982\u89BD");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 32);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 33);
    \u0275\u0275repeaterCreate(7, WalletViewComponent_div_43_For_8_Template, 13, 6, "div", 34, _forTrack1);
    \u0275\u0275conditionalCreate(9, WalletViewComponent_div_43_Conditional_9_Template, 5, 0, "div", 28);
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
function WalletViewComponent_For_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42)(1, "div", 43);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 44)(4, "div", 45);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 46);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 47);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tx_r3 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("income", tx_r3.amount > 0)("expense", tx_r3.amount < 0);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.getTypeIcon(tx_r3.type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(tx_r3.description || ctx_r1.getTypeName(tx_r3.type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatDate(tx_r3.created_at));
    \u0275\u0275advance();
    \u0275\u0275classProp("positive", tx_r3.amount > 0)("negative", tx_r3.amount < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tx_r3.amount_display, " ");
  }
}
function WalletViewComponent_Conditional_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "span", 4);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 41);
    \u0275\u0275text(4, "\u66AB\u7121\u4EA4\u6613\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function WalletViewComponent_div_54_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 50)(1, "div", 55);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 56)(4, "div", 57)(5, "span", 58);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 59)(8, "span", 58);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const month_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.formatMonth(month_r4.month));
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("height", ctx_r1.getBarHeight(month_r4.income), "px");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u6536\u5165: ", month_r4.income_display);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r1.getBarHeight(month_r4.expense), "px");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u652F\u51FA: ", month_r4.expense_display);
  }
}
function WalletViewComponent_div_54_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 48)(1, "div", 24)(2, "h2");
    \u0275\u0275text(3, "\u{1F4C5} \u6708\u5EA6\u7D71\u8A08");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "div", 49);
    \u0275\u0275repeaterCreate(5, WalletViewComponent_div_54_For_6_Template, 10, 7, "div", 50, _forTrack2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 51)(8, "div", 52);
    \u0275\u0275element(9, "span", 53);
    \u0275\u0275elementStart(10, "span", 16);
    \u0275\u0275text(11, "\u6536\u5165");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 54);
    \u0275\u0275element(13, "span", 53);
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
function WalletViewComponent_div_55_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 60);
    \u0275\u0275element(1, "div", 61);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "\u52A0\u8F09\u4E2D...");
    \u0275\u0275elementEnd()();
  }
}
var WalletViewComponent = class _WalletViewComponent {
  constructor(walletService, router) {
    this.walletService = walletService;
    this.router = router;
    this.wallet = signal(null, ...ngDevMode ? [{ debugName: "wallet" }] : []);
    this.recentTransactions = signal([], ...ngDevMode ? [{ debugName: "recentTransactions" }] : []);
    this.analysis = signal(null, ...ngDevMode ? [{ debugName: "analysis" }] : []);
    this.monthlySummary = signal([], ...ngDevMode ? [{ debugName: "monthlySummary" }] : []);
    this.loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.balanceDisplay = computed(() => {
      const w = this.wallet();
      if (!w)
        return "0.00";
      return (w.available_balance / 100).toFixed(2);
    }, ...ngDevMode ? [{ debugName: "balanceDisplay" }] : []);
  }
  ngOnInit() {
    this.loadData();
  }
  async loadData() {
    this.loading.set(true);
    try {
      const [wallet, transactions, analysis, monthly] = await Promise.all([
        this.walletService.loadWallet(),
        this.walletService.getRecentTransactions(5),
        this.walletService.getConsumeAnalysis(),
        this.walletService.getMonthlySummary(6)
      ]);
      if (wallet)
        this.wallet.set(wallet);
      this.recentTransactions.set(transactions);
      if (analysis)
        this.analysis.set(analysis);
      this.monthlySummary.set(monthly);
    } catch (error) {
      console.error("Load wallet data error:", error);
    } finally {
      this.loading.set(false);
    }
  }
  goBack() {
    this.router.navigate(["/"]);
  }
  goToRecharge() {
    this.router.navigate(["/wallet/recharge"]);
  }
  goToWithdraw() {
    this.router.navigate(["/wallet/withdraw"]);
  }
  showRedeemCode() {
    alert("\u514C\u63DB\u78BC\u529F\u80FD\u5373\u5C07\u4E0A\u7DDA");
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
      return new (__ngFactoryType__ || _WalletViewComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletViewComponent, selectors: [["app-wallet-view"]], decls: 56, vars: 7, consts: [[1, "wallet-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "icon"], [1, "header-actions"], [1, "action-btn", 3, "click"], [1, "balance-card"], [1, "balance-bg"], [1, "balance-content"], [1, "balance-label"], [1, "balance-amount"], [1, "currency"], [1, "amount"], [1, "balance-details"], [1, "detail-item"], [1, "label"], [1, "value"], [1, "balance-actions"], [1, "recharge-btn", 3, "click"], [1, "withdraw-btn", 3, "click"], [1, "redeem-btn", 3, "click"], ["class", "section consume-overview", 4, "ngIf"], [1, "section", "recent-transactions"], [1, "section-header"], [1, "view-all-btn", 3, "click"], [1, "transaction-list"], [1, "transaction-item", 3, "income", "expense"], [1, "empty-state"], ["class", "section monthly-stats", 4, "ngIf"], ["class", "loading-overlay", 4, "ngIf"], [1, "section", "consume-overview"], [1, "total"], [1, "consume-bars"], [1, "consume-bar"], [1, "bar-label"], [1, "name"], [1, "bar-track"], [1, "bar-fill"], [1, "bar-value"], [1, "percent"], [1, "text"], [1, "transaction-item"], [1, "tx-icon"], [1, "tx-info"], [1, "tx-desc"], [1, "tx-time"], [1, "tx-amount"], [1, "section", "monthly-stats"], [1, "monthly-chart"], [1, "month-bar"], [1, "chart-legend"], [1, "legend-item", "income"], [1, "dot"], [1, "legend-item", "expense"], [1, "month-label"], [1, "bars"], [1, "income-bar"], [1, "tooltip"], [1, "expense-bar"], [1, "loading-overlay"], [1, "loading-spinner"]], template: function WalletViewComponent_Template(rf, ctx) {
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
        \u0275\u0275elementStart(36, "div", 18)(37, "button", 19);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_37_listener() {
          return ctx.goToRecharge();
        });
        \u0275\u0275text(38, " \u{1F4B3} \u5145\u503C ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(39, "button", 20);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_39_listener() {
          return ctx.goToWithdraw();
        });
        \u0275\u0275text(40, " \u{1F4E4} \u63D0\u73FE ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(41, "button", 21);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_41_listener() {
          return ctx.showRedeemCode();
        });
        \u0275\u0275text(42, " \u{1F381} \u514C\u63DB\u78BC ");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275template(43, WalletViewComponent_div_43_Template, 10, 4, "div", 22);
        \u0275\u0275elementStart(44, "div", 23)(45, "div", 24)(46, "h2");
        \u0275\u0275text(47, "\u{1F550} \u6700\u8FD1\u4EA4\u6613");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "button", 25);
        \u0275\u0275listener("click", function WalletViewComponent_Template_button_click_48_listener() {
          return ctx.showTransactions();
        });
        \u0275\u0275text(49, " \u67E5\u770B\u5168\u90E8 \u2192 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(50, "div", 26);
        \u0275\u0275repeaterCreate(51, WalletViewComponent_For_52_Template, 10, 12, "div", 27, _forTrack0);
        \u0275\u0275conditionalCreate(53, WalletViewComponent_Conditional_53_Template, 5, 0, "div", 28);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(54, WalletViewComponent_div_54_Template, 16, 0, "div", 29)(55, WalletViewComponent_div_55_Template, 4, 0, "div", 30);
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
        \u0275\u0275advance(8);
        \u0275\u0275property("ngIf", ctx.analysis());
        \u0275\u0275advance(8);
        \u0275\u0275repeater(ctx.recentTransactions());
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.recentTransactions().length === 0 ? 53 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.monthlySummary().length > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.loading());
      }
    }, dependencies: [CommonModule, NgIf], styles: ["\n\n.wallet-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.action-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.balance-card[_ngcontent-%COMP%] {\n  position: relative;\n  border-radius: 24px;\n  overflow: hidden;\n  margin-bottom: 24px;\n}\n.balance-bg[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n}\n.balance-content[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 32px;\n  z-index: 1;\n}\n.balance-label[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.8;\n  margin-bottom: 8px;\n}\n.balance-amount[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 24px;\n}\n.balance-amount[_ngcontent-%COMP%]   .currency[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n}\n.balance-amount[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  font-size: 48px;\n  font-weight: 700;\n}\n.balance-details[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 32px;\n  margin-bottom: 24px;\n}\n.detail-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.detail-item[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.detail-item[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 500;\n}\n.balance-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n}\n.balance-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 12px 20px;\n  border-radius: 12px;\n  border: none;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.recharge-btn[_ngcontent-%COMP%] {\n  background: #fff;\n  color: #764ba2;\n}\n.withdraw-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n}\n.redeem-btn[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n}\n.balance-actions[_ngcontent-%COMP%]   button[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n}\n.section[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0;\n}\n.section-header[_ngcontent-%COMP%]   .total[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: #f59e0b;\n}\n.view-all-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: #667eea;\n  font-size: 13px;\n  cursor: pointer;\n}\n.consume-bar[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.bar-label[_ngcontent-%COMP%] {\n  width: 100px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.bar-track[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.bar-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  background:\n    linear-gradient(\n      90deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px;\n  transition: width 0.5s ease;\n}\n.bar-value[_ngcontent-%COMP%] {\n  width: 100px;\n  text-align: right;\n  font-size: 13px;\n}\n.bar-value[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  color: #f59e0b;\n  margin-right: 8px;\n}\n.bar-value[_ngcontent-%COMP%]   .percent[_ngcontent-%COMP%] {\n  opacity: 0.6;\n}\n.transaction-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.tx-icon[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 18px;\n}\n.tx-info[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.tx-desc[_ngcontent-%COMP%] {\n  font-size: 14px;\n  margin-bottom: 4px;\n}\n.tx-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-amount[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n}\n.tx-amount.positive[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.tx-amount.negative[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.monthly-chart[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  height: 120px;\n  align-items: flex-end;\n  padding-bottom: 24px;\n}\n.month-bar[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n.month-label[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.6;\n}\n.bars[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 4px;\n  align-items: flex-end;\n  height: 80px;\n}\n.income-bar[_ngcontent-%COMP%], \n.expense-bar[_ngcontent-%COMP%] {\n  width: 12px;\n  border-radius: 4px 4px 0 0;\n  position: relative;\n  min-height: 4px;\n}\n.income-bar[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      180deg,\n      #22c55e,\n      #16a34a);\n}\n.expense-bar[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      180deg,\n      #ef4444,\n      #dc2626);\n}\n.chart-legend[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  gap: 24px;\n  margin-top: 12px;\n}\n.legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  opacity: 0.7;\n}\n.legend-item[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.legend-item.income[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.legend-item.expense[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.empty-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n.empty-state[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n  margin-bottom: 8px;\n}\n.loading-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-view.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletViewComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-view", standalone: true, imports: [CommonModule], template: `
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
          <div class="balance-actions">
            <button class="recharge-btn" (click)="goToRecharge()">
              \u{1F4B3} \u5145\u503C
            </button>
            <button class="withdraw-btn" (click)="goToWithdraw()">
              \u{1F4E4} \u63D0\u73FE
            </button>
            <button class="redeem-btn" (click)="showRedeemCode()">
              \u{1F381} \u514C\u63DB\u78BC
            </button>
          </div>
        </div>
      </div>

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
    </div>
  `, styles: ["/* angular:styles/component:css;622950557e163644de9fb0e4443c20dd72623d3ec4f63c8dc653234093c5e851;D:/tgkz2026/src/views/wallet-view.component.ts */\n.wallet-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.action-btn {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.action-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.balance-card {\n  position: relative;\n  border-radius: 24px;\n  overflow: hidden;\n  margin-bottom: 24px;\n}\n.balance-bg {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea 0%,\n      #764ba2 100%);\n}\n.balance-content {\n  position: relative;\n  padding: 32px;\n  z-index: 1;\n}\n.balance-label {\n  font-size: 14px;\n  opacity: 0.8;\n  margin-bottom: 8px;\n}\n.balance-amount {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 24px;\n}\n.balance-amount .currency {\n  font-size: 24px;\n  font-weight: 600;\n}\n.balance-amount .amount {\n  font-size: 48px;\n  font-weight: 700;\n}\n.balance-details {\n  display: flex;\n  gap: 32px;\n  margin-bottom: 24px;\n}\n.detail-item {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.detail-item .label {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.detail-item .value {\n  font-size: 16px;\n  font-weight: 500;\n}\n.balance-actions {\n  display: flex;\n  gap: 12px;\n}\n.balance-actions button {\n  flex: 1;\n  padding: 12px 20px;\n  border-radius: 12px;\n  border: none;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.recharge-btn {\n  background: #fff;\n  color: #764ba2;\n}\n.withdraw-btn {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n}\n.redeem-btn {\n  background: rgba(255, 255, 255, 0.2);\n  color: #fff;\n}\n.balance-actions button:hover {\n  transform: translateY(-2px);\n}\n.section {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 16px;\n}\n.section-header h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0;\n}\n.section-header .total {\n  font-size: 20px;\n  font-weight: 700;\n  color: #f59e0b;\n}\n.view-all-btn {\n  background: none;\n  border: none;\n  color: #667eea;\n  font-size: 13px;\n  cursor: pointer;\n}\n.consume-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.bar-label {\n  width: 100px;\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 13px;\n}\n.bar-track {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.bar-fill {\n  height: 100%;\n  background:\n    linear-gradient(\n      90deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px;\n  transition: width 0.5s ease;\n}\n.bar-value {\n  width: 100px;\n  text-align: right;\n  font-size: 13px;\n}\n.bar-value .amount {\n  color: #f59e0b;\n  margin-right: 8px;\n}\n.bar-value .percent {\n  opacity: 0.6;\n}\n.transaction-item {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item:last-child {\n  border-bottom: none;\n}\n.tx-icon {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 18px;\n}\n.tx-info {\n  flex: 1;\n}\n.tx-desc {\n  font-size: 14px;\n  margin-bottom: 4px;\n}\n.tx-time {\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-amount {\n  font-size: 16px;\n  font-weight: 600;\n}\n.tx-amount.positive {\n  color: #22c55e;\n}\n.tx-amount.negative {\n  color: #ef4444;\n}\n.monthly-chart {\n  display: flex;\n  gap: 12px;\n  height: 120px;\n  align-items: flex-end;\n  padding-bottom: 24px;\n}\n.month-bar {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 8px;\n}\n.month-label {\n  font-size: 11px;\n  opacity: 0.6;\n}\n.bars {\n  display: flex;\n  gap: 4px;\n  align-items: flex-end;\n  height: 80px;\n}\n.income-bar,\n.expense-bar {\n  width: 12px;\n  border-radius: 4px 4px 0 0;\n  position: relative;\n  min-height: 4px;\n}\n.income-bar {\n  background:\n    linear-gradient(\n      180deg,\n      #22c55e,\n      #16a34a);\n}\n.expense-bar {\n  background:\n    linear-gradient(\n      180deg,\n      #ef4444,\n      #dc2626);\n}\n.chart-legend {\n  display: flex;\n  justify-content: center;\n  gap: 24px;\n  margin-top: 12px;\n}\n.legend-item {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 12px;\n  opacity: 0.7;\n}\n.legend-item .dot {\n  width: 8px;\n  height: 8px;\n  border-radius: 50%;\n}\n.legend-item.income .dot {\n  background: #22c55e;\n}\n.legend-item.expense .dot {\n  background: #ef4444;\n}\n.empty-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 40px;\n  opacity: 0.5;\n}\n.empty-state .icon {\n  font-size: 32px;\n  margin-bottom: 8px;\n}\n.loading-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-view.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletViewComponent, { className: "WalletViewComponent", filePath: "src/views/wallet-view.component.ts", lineNumber: 587 });
})();

export {
  WalletViewComponent
};
//# sourceMappingURL=chunk-LZVGK4P7.js.map
