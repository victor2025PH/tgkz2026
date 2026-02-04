import {
  WalletService
} from "./chunk-EULKY6Q3.js";
import "./chunk-HOUP2MV6.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  Component,
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

// src/views/wallet-transactions.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function WalletTransactionsComponent_div_54_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 30)(1, "div", 31)(2, "span", 32);
    \u0275\u0275text(3, "\u6536\u5165");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 33);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 34)(7, "span", 32);
    \u0275\u0275text(8, "\u652F\u51FA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 33);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 35)(12, "span", 32);
    \u0275\u0275text(13, "\u5171");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 33);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_2_0;
    let tmp_3_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(((tmp_1_0 = ctx_r0.result()) == null ? null : tmp_1_0.summary == null ? null : tmp_1_0.summary.total_in_display) || "$0.00");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(((tmp_2_0 = ctx_r0.result()) == null ? null : tmp_2_0.summary == null ? null : tmp_2_0.summary.total_out_display) || "$0.00");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ((tmp_3_0 = ctx_r0.result()) == null ? null : tmp_3_0.pagination == null ? null : tmp_3_0.pagination.total) || 0, " \u7B46");
  }
}
function WalletTransactionsComponent_For_57_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 36)(1, "div", 37)(2, "div", 38);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 39)(5, "div", 40);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 41)(8, "span", 42);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 43);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(12, "div", 44)(13, "div", 45);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 46);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const tx_r2 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("income", tx_r2.amount > 0)("expense", tx_r2.amount < 0);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.getTypeIcon(tx_r2.type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(tx_r2.description || ctx_r0.getTypeName(tx_r2.type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(tx_r2.order_id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatDate(tx_r2.created_at));
    \u0275\u0275advance(2);
    \u0275\u0275classProp("positive", tx_r2.amount > 0)("negative", tx_r2.amount < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tx_r2.amount_display, " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.getStatusColor(tx_r2.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStatusName(tx_r2.status), " ");
  }
}
function WalletTransactionsComponent_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 27)(1, "span", 4);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 47);
    \u0275\u0275text(4, "\u66AB\u7121\u4EA4\u6613\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function WalletTransactionsComponent_div_59_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 48)(1, "button", 49);
    \u0275\u0275listener("click", function WalletTransactionsComponent_div_59_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToPage(ctx_r0.currentPage() - 1));
    });
    \u0275\u0275text(2, " \u2190 \u4E0A\u4E00\u9801 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 50);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 49);
    \u0275\u0275listener("click", function WalletTransactionsComponent_div_59_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToPage(ctx_r0.currentPage() + 1));
    });
    \u0275\u0275text(6, " \u4E0B\u4E00\u9801 \u2192 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_2_0;
    let tmp_3_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !((tmp_1_0 = ctx_r0.result()) == null ? null : tmp_1_0.pagination == null ? null : tmp_1_0.pagination.has_prev));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" \u7B2C ", ctx_r0.currentPage(), " / ", (tmp_2_0 = ctx_r0.result()) == null ? null : tmp_2_0.pagination == null ? null : tmp_2_0.pagination.total_pages, " \u9801 ");
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !((tmp_3_0 = ctx_r0.result()) == null ? null : tmp_3_0.pagination == null ? null : tmp_3_0.pagination.has_next));
  }
}
function WalletTransactionsComponent_div_60_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51);
    \u0275\u0275element(1, "div", 52);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "\u52A0\u8F09\u4E2D...");
    \u0275\u0275elementEnd()();
  }
}
var WalletTransactionsComponent = class _WalletTransactionsComponent {
  constructor(walletService, router) {
    this.walletService = walletService;
    this.router = router;
    this.transactions = signal([], ...ngDevMode ? [{ debugName: "transactions" }] : []);
    this.result = signal(null, ...ngDevMode ? [{ debugName: "result" }] : []);
    this.currentPage = signal(1, ...ngDevMode ? [{ debugName: "currentPage" }] : []);
    this.loading = signal(false, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.filters = {
      type: "",
      status: "",
      range: "30"
    };
  }
  ngOnInit() {
    this.loadData();
  }
  async loadData() {
    this.loading.set(true);
    try {
      const { startDate, endDate } = this.getDateRange();
      const result = await this.walletService.loadTransactions({
        page: this.currentPage(),
        pageSize: 20,
        type: this.filters.type || void 0,
        status: this.filters.status || void 0,
        startDate,
        endDate
      });
      if (result) {
        this.result.set(result);
        this.transactions.set(result.transactions);
      }
    } catch (error) {
      console.error("Load transactions error:", error);
    } finally {
      this.loading.set(false);
    }
  }
  getDateRange() {
    if (this.filters.range === "all") {
      return {};
    }
    const days = parseInt(this.filters.range);
    const endDate = /* @__PURE__ */ new Date();
    const startDate = /* @__PURE__ */ new Date();
    startDate.setDate(startDate.getDate() - days);
    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }
  onRangeChange() {
    this.currentPage.set(1);
    this.loadData();
  }
  goToPage(page) {
    if (page < 1)
      return;
    const totalPages = this.result()?.pagination?.total_pages || 1;
    if (page > totalPages)
      return;
    this.currentPage.set(page);
    this.loadData();
  }
  goBack() {
    this.router.navigate(["/wallet"]);
  }
  exportData() {
    const { startDate, endDate } = this.getDateRange();
    this.walletService.exportTransactions(startDate, endDate);
  }
  formatDate(dateStr) {
    if (!dateStr)
      return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  getTypeIcon(type) {
    return this.walletService.getTypeIcon(type);
  }
  getTypeName(type) {
    return this.walletService.getTypeName(type);
  }
  getStatusName(status) {
    const names = {
      pending: "\u8655\u7406\u4E2D",
      success: "\u6210\u529F",
      failed: "\u5931\u6557",
      cancelled: "\u5DF2\u53D6\u6D88",
      refunded: "\u5DF2\u9000\u6B3E"
    };
    return names[status] || status;
  }
  getStatusColor(status) {
    const colors = {
      pending: "#f59e0b",
      success: "#22c55e",
      failed: "#ef4444",
      cancelled: "#6b7280",
      refunded: "#8b5cf6"
    };
    return colors[status] || "#999";
  }
  static {
    this.\u0275fac = function WalletTransactionsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletTransactionsComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletTransactionsComponent, selectors: [["app-wallet-transactions"]], decls: 61, vars: 7, consts: [[1, "transactions-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "icon"], [1, "header-actions"], [1, "export-btn", 3, "click"], [1, "filters"], [1, "filter-group"], [3, "ngModelChange", "change", "ngModel"], ["value", ""], ["value", "recharge"], ["value", "consume"], ["value", "refund"], ["value", "withdraw"], ["value", "bonus"], ["value", "success"], ["value", "pending"], ["value", "failed"], ["value", "refunded"], ["value", "7"], ["value", "30"], ["value", "90"], ["value", "all"], ["class", "summary", 4, "ngIf"], [1, "transaction-list"], [1, "transaction-item", 3, "income", "expense"], [1, "empty-state"], ["class", "pagination", 4, "ngIf"], ["class", "loading-overlay", 4, "ngIf"], [1, "summary"], [1, "summary-item", "income"], [1, "label"], [1, "value"], [1, "summary-item", "expense"], [1, "summary-item", "count"], [1, "transaction-item"], [1, "tx-left"], [1, "tx-icon"], [1, "tx-info"], [1, "tx-desc"], [1, "tx-meta"], [1, "tx-order"], [1, "tx-time"], [1, "tx-right"], [1, "tx-amount"], [1, "tx-status"], [1, "text"], [1, "pagination"], [1, "page-btn", 3, "click", "disabled"], [1, "page-info"], [1, "loading-overlay"], [1, "loading-spinner"]], template: function WalletTransactionsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletTransactionsComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275elementStart(4, "span", 4);
        \u0275\u0275text(5, "\u2190");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "h1");
        \u0275\u0275text(7, "\u{1F4DC} \u4EA4\u6613\u8A18\u9304");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "div", 5)(9, "button", 6);
        \u0275\u0275listener("click", function WalletTransactionsComponent_Template_button_click_9_listener() {
          return ctx.exportData();
        });
        \u0275\u0275text(10, " \u{1F4E5} \u5C0E\u51FA ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 7)(12, "div", 8)(13, "label");
        \u0275\u0275text(14, "\u985E\u578B");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "select", 9);
        \u0275\u0275twoWayListener("ngModelChange", function WalletTransactionsComponent_Template_select_ngModelChange_15_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filters.type, $event) || (ctx.filters.type = $event);
          return $event;
        });
        \u0275\u0275listener("change", function WalletTransactionsComponent_Template_select_change_15_listener() {
          return ctx.loadData();
        });
        \u0275\u0275elementStart(16, "option", 10);
        \u0275\u0275text(17, "\u5168\u90E8");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "option", 11);
        \u0275\u0275text(19, "\u5145\u503C");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "option", 12);
        \u0275\u0275text(21, "\u6D88\u8CBB");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "option", 13);
        \u0275\u0275text(23, "\u9000\u6B3E");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(24, "option", 14);
        \u0275\u0275text(25, "\u63D0\u73FE");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "option", 15);
        \u0275\u0275text(27, "\u8D08\u9001");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(28, "div", 8)(29, "label");
        \u0275\u0275text(30, "\u72C0\u614B");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "select", 9);
        \u0275\u0275twoWayListener("ngModelChange", function WalletTransactionsComponent_Template_select_ngModelChange_31_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filters.status, $event) || (ctx.filters.status = $event);
          return $event;
        });
        \u0275\u0275listener("change", function WalletTransactionsComponent_Template_select_change_31_listener() {
          return ctx.loadData();
        });
        \u0275\u0275elementStart(32, "option", 10);
        \u0275\u0275text(33, "\u5168\u90E8");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "option", 16);
        \u0275\u0275text(35, "\u6210\u529F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "option", 17);
        \u0275\u0275text(37, "\u8655\u7406\u4E2D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "option", 18);
        \u0275\u0275text(39, "\u5931\u6557");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "option", 19);
        \u0275\u0275text(41, "\u5DF2\u9000\u6B3E");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(42, "div", 8)(43, "label");
        \u0275\u0275text(44, "\u6642\u9593\u7BC4\u570D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "select", 9);
        \u0275\u0275twoWayListener("ngModelChange", function WalletTransactionsComponent_Template_select_ngModelChange_45_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filters.range, $event) || (ctx.filters.range = $event);
          return $event;
        });
        \u0275\u0275listener("change", function WalletTransactionsComponent_Template_select_change_45_listener() {
          return ctx.onRangeChange();
        });
        \u0275\u0275elementStart(46, "option", 20);
        \u0275\u0275text(47, "\u6700\u8FD17\u5929");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "option", 21);
        \u0275\u0275text(49, "\u6700\u8FD130\u5929");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(50, "option", 22);
        \u0275\u0275text(51, "\u6700\u8FD190\u5929");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "option", 23);
        \u0275\u0275text(53, "\u5168\u90E8");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275template(54, WalletTransactionsComponent_div_54_Template, 16, 3, "div", 24);
        \u0275\u0275elementStart(55, "div", 25);
        \u0275\u0275repeaterCreate(56, WalletTransactionsComponent_For_57_Template, 17, 16, "div", 26, _forTrack0);
        \u0275\u0275conditionalCreate(58, WalletTransactionsComponent_Conditional_58_Template, 5, 0, "div", 27);
        \u0275\u0275elementEnd();
        \u0275\u0275template(59, WalletTransactionsComponent_div_59_Template, 7, 4, "div", 28)(60, WalletTransactionsComponent_div_60_Template, 4, 0, "div", 29);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_6_0;
        \u0275\u0275advance(15);
        \u0275\u0275twoWayProperty("ngModel", ctx.filters.type);
        \u0275\u0275advance(16);
        \u0275\u0275twoWayProperty("ngModel", ctx.filters.status);
        \u0275\u0275advance(14);
        \u0275\u0275twoWayProperty("ngModel", ctx.filters.range);
        \u0275\u0275advance(9);
        \u0275\u0275property("ngIf", ctx.result());
        \u0275\u0275advance(2);
        \u0275\u0275repeater(ctx.transactions());
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.transactions().length === 0 && !ctx.loading() ? 58 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_6_0 = ctx.result()) == null ? null : tmp_6_0.pagination == null ? null : tmp_6_0.pagination.total_pages) > 1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.loading());
      }
    }, dependencies: [CommonModule, NgIf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel], styles: ["\n\n.transactions-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.export-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.export-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.filters[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  margin-bottom: 20px;\n  flex-wrap: wrap;\n}\n.filter-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.filter-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 8px 12px;\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  color: #fff;\n  font-size: 14px;\n  min-width: 120px;\n}\n.filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]   option[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n}\n.summary[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  margin-bottom: 20px;\n}\n.summary-item[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 16px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.05);\n  text-align: center;\n}\n.summary-item[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 12px;\n  opacity: 0.7;\n  margin-bottom: 4px;\n}\n.summary-item[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n}\n.summary-item.income[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.summary-item.expense[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.transaction-list[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  overflow: hidden;\n}\n.transaction-item[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.tx-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.tx-icon[_ngcontent-%COMP%] {\n  width: 44px;\n  height: 44px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 20px;\n}\n.tx-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.tx-desc[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 500;\n}\n.tx-meta[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-right[_ngcontent-%COMP%] {\n  text-align: right;\n}\n.tx-amount[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin-bottom: 4px;\n}\n.tx-amount.positive[_ngcontent-%COMP%] {\n  color: #22c55e;\n}\n.tx-amount.negative[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n.tx-status[_ngcontent-%COMP%] {\n  font-size: 12px;\n}\n.pagination[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 20px;\n  margin-top: 20px;\n}\n.page-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.page-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.3;\n  cursor: not-allowed;\n}\n.page-btn[_ngcontent-%COMP%]:not(:disabled):hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.page-info[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.empty-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 60px;\n  opacity: 0.5;\n}\n.empty-state[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  font-size: 48px;\n  margin-bottom: 12px;\n}\n.loading-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-transactions.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletTransactionsComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-transactions", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="transactions-view">
      <!-- \u9802\u90E8\u5C0E\u822A -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">
            <span class="icon">\u2190</span>
          </button>
          <h1>\u{1F4DC} \u4EA4\u6613\u8A18\u9304</h1>
        </div>
        <div class="header-actions">
          <button class="export-btn" (click)="exportData()">
            \u{1F4E5} \u5C0E\u51FA
          </button>
        </div>
      </div>

      <!-- \u7BE9\u9078\u5668 -->
      <div class="filters">
        <div class="filter-group">
          <label>\u985E\u578B</label>
          <select [(ngModel)]="filters.type" (change)="loadData()">
            <option value="">\u5168\u90E8</option>
            <option value="recharge">\u5145\u503C</option>
            <option value="consume">\u6D88\u8CBB</option>
            <option value="refund">\u9000\u6B3E</option>
            <option value="withdraw">\u63D0\u73FE</option>
            <option value="bonus">\u8D08\u9001</option>
          </select>
        </div>
        <div class="filter-group">
          <label>\u72C0\u614B</label>
          <select [(ngModel)]="filters.status" (change)="loadData()">
            <option value="">\u5168\u90E8</option>
            <option value="success">\u6210\u529F</option>
            <option value="pending">\u8655\u7406\u4E2D</option>
            <option value="failed">\u5931\u6557</option>
            <option value="refunded">\u5DF2\u9000\u6B3E</option>
          </select>
        </div>
        <div class="filter-group">
          <label>\u6642\u9593\u7BC4\u570D</label>
          <select [(ngModel)]="filters.range" (change)="onRangeChange()">
            <option value="7">\u6700\u8FD17\u5929</option>
            <option value="30">\u6700\u8FD130\u5929</option>
            <option value="90">\u6700\u8FD190\u5929</option>
            <option value="all">\u5168\u90E8</option>
          </select>
        </div>
      </div>

      <!-- \u7D71\u8A08\u6458\u8981 -->
      <div class="summary" *ngIf="result()">
        <div class="summary-item income">
          <span class="label">\u6536\u5165</span>
          <span class="value">{{ result()?.summary?.total_in_display || '$0.00' }}</span>
        </div>
        <div class="summary-item expense">
          <span class="label">\u652F\u51FA</span>
          <span class="value">{{ result()?.summary?.total_out_display || '$0.00' }}</span>
        </div>
        <div class="summary-item count">
          <span class="label">\u5171</span>
          <span class="value">{{ result()?.pagination?.total || 0 }} \u7B46</span>
        </div>
      </div>

      <!-- \u4EA4\u6613\u5217\u8868 -->
      <div class="transaction-list">
        @for (tx of transactions(); track tx.id) {
          <div class="transaction-item" [class.income]="tx.amount > 0" [class.expense]="tx.amount < 0">
            <div class="tx-left">
              <div class="tx-icon">{{ getTypeIcon(tx.type) }}</div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || getTypeName(tx.type) }}</div>
                <div class="tx-meta">
                  <span class="tx-order">{{ tx.order_id }}</span>
                  <span class="tx-time">{{ formatDate(tx.created_at) }}</span>
                </div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount" [class.positive]="tx.amount > 0" [class.negative]="tx.amount < 0">
                {{ tx.amount_display }}
              </div>
              <div class="tx-status" [style.color]="getStatusColor(tx.status)">
                {{ getStatusName(tx.status) }}
              </div>
            </div>
          </div>
        }
        @if (transactions().length === 0 && !loading()) {
          <div class="empty-state">
            <span class="icon">\u{1F4ED}</span>
            <span class="text">\u66AB\u7121\u4EA4\u6613\u8A18\u9304</span>
          </div>
        }
      </div>

      <!-- \u5206\u9801 -->
      <div class="pagination" *ngIf="result()?.pagination?.total_pages > 1">
        <button 
          class="page-btn" 
          [disabled]="!result()?.pagination?.has_prev"
          (click)="goToPage(currentPage() - 1)"
        >
          \u2190 \u4E0A\u4E00\u9801
        </button>
        <span class="page-info">
          \u7B2C {{ currentPage() }} / {{ result()?.pagination?.total_pages }} \u9801
        </span>
        <button 
          class="page-btn" 
          [disabled]="!result()?.pagination?.has_next"
          (click)="goToPage(currentPage() + 1)"
        >
          \u4E0B\u4E00\u9801 \u2192
        </button>
      </div>

      <!-- \u52A0\u8F09\u906E\u7F69 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="loading-spinner"></div>
        <span>\u52A0\u8F09\u4E2D...</span>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;45547a0343983d8515e8686f31a409f4c0e1f123f98b25f2c69382d422edaefc;D:/tgkz2026/src/views/wallet-transactions.component.ts */\n.transactions-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.back-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.export-btn {\n  padding: 10px 20px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.export-btn:hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.filters {\n  display: flex;\n  gap: 16px;\n  margin-bottom: 20px;\n  flex-wrap: wrap;\n}\n.filter-group {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.filter-group label {\n  font-size: 12px;\n  opacity: 0.7;\n}\n.filter-group select {\n  padding: 8px 12px;\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  color: #fff;\n  font-size: 14px;\n  min-width: 120px;\n}\n.filter-group select option {\n  background: #1a1a2e;\n}\n.summary {\n  display: flex;\n  gap: 16px;\n  margin-bottom: 20px;\n}\n.summary-item {\n  flex: 1;\n  padding: 16px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.05);\n  text-align: center;\n}\n.summary-item .label {\n  display: block;\n  font-size: 12px;\n  opacity: 0.7;\n  margin-bottom: 4px;\n}\n.summary-item .value {\n  font-size: 18px;\n  font-weight: 600;\n}\n.summary-item.income .value {\n  color: #22c55e;\n}\n.summary-item.expense .value {\n  color: #ef4444;\n}\n.transaction-list {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  overflow: hidden;\n}\n.transaction-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.transaction-item:last-child {\n  border-bottom: none;\n}\n.tx-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.tx-icon {\n  width: 44px;\n  height: 44px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 20px;\n}\n.tx-info {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.tx-desc {\n  font-size: 14px;\n  font-weight: 500;\n}\n.tx-meta {\n  display: flex;\n  gap: 12px;\n  font-size: 12px;\n  opacity: 0.5;\n}\n.tx-right {\n  text-align: right;\n}\n.tx-amount {\n  font-size: 16px;\n  font-weight: 600;\n  margin-bottom: 4px;\n}\n.tx-amount.positive {\n  color: #22c55e;\n}\n.tx-amount.negative {\n  color: #ef4444;\n}\n.tx-status {\n  font-size: 12px;\n}\n.pagination {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 20px;\n  margin-top: 20px;\n}\n.page-btn {\n  padding: 10px 20px;\n  border-radius: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.page-btn:disabled {\n  opacity: 0.3;\n  cursor: not-allowed;\n}\n.page-btn:not(:disabled):hover {\n  background: rgba(255, 255, 255, 0.2);\n}\n.page-info {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.empty-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 60px;\n  opacity: 0.5;\n}\n.empty-state .icon {\n  font-size: 48px;\n  margin-bottom: 12px;\n}\n.loading-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 16px;\n  z-index: 100;\n}\n.loading-spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-transactions.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletTransactionsComponent, { className: "WalletTransactionsComponent", filePath: "src/views/wallet-transactions.component.ts", lineNumber: 426 });
})();
export {
  WalletTransactionsComponent
};
//# sourceMappingURL=chunk-HS6ZQUDV.js.map
