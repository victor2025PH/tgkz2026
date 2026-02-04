import {
  WalletService
} from "./chunk-2RAHAZHZ.js";
import "./chunk-HOUP2MV6.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  FormsModule
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  NgForOf,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  Component,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-orders.component.ts
function WalletOrdersComponent_button_8_span_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 12);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(tab_r2.count);
  }
}
function WalletOrdersComponent_button_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 10);
    \u0275\u0275listener("click", function WalletOrdersComponent_button_8_Template_button_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.filterByStatus(tab_r2.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275template(2, WalletOrdersComponent_button_8_span_2_Template, 2, 1, "span", 11);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.currentStatus() === tab_r2.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tab_r2.label, " ");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", tab_r2.count > 0);
  }
}
function WalletOrdersComponent_div_9_div_1_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const order_r5 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" +", ctx_r2.formatAmount(order_r5.bonus_amount), " ");
  }
}
function WalletOrdersComponent_div_9_div_1_div_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 30);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_9_div_1_div_19_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(1, "button", 31);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_9_div_1_div_19_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r6);
      const order_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.cancelOrder(order_r5));
    });
    \u0275\u0275text(2, "\u53D6\u6D88");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 32);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_9_div_1_div_19_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r6);
      const order_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.continuePayment(order_r5));
    });
    \u0275\u0275text(4, "\u7E7C\u7E8C\u652F\u4ED8");
    \u0275\u0275elementEnd()();
  }
}
function WalletOrdersComponent_div_9_div_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 16);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_9_div_1_Template_div_click_0_listener() {
      const order_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.viewOrder(order_r5));
    });
    \u0275\u0275elementStart(1, "div", 17)(2, "div", 18)(3, "div", 19);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 20);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 21)(8, "div", 22);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275template(10, WalletOrdersComponent_div_9_div_1_div_10_Template, 2, 1, "div", 23);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 24)(12, "div", 25)(13, "span", 26);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 27);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(19, WalletOrdersComponent_div_9_div_1_div_19_Template, 5, 0, "div", 28);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const order_r5 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(order_r5.order_no);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(order_r5.created_at));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(order_r5.amount));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", order_r5.bonus_amount > 0);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.getMethodIcon(order_r5.payment_method));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getMethodName(order_r5.payment_method));
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.getStatusColor(order_r5.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.getStatusName(order_r5.status), " ");
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", order_r5.status === "pending");
  }
}
function WalletOrdersComponent_div_9_div_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 33)(1, "div", 34);
    \u0275\u0275text(2, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 35);
    \u0275\u0275text(4, "\u66AB\u7121\u8A02\u55AE\u8A18\u9304");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 36);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_9_div_2_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.goToRecharge());
    });
    \u0275\u0275text(6, "\u7ACB\u5373\u5145\u503C");
    \u0275\u0275elementEnd()();
  }
}
function WalletOrdersComponent_div_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 13);
    \u0275\u0275template(1, WalletOrdersComponent_div_9_div_1_Template, 20, 10, "div", 14)(2, WalletOrdersComponent_div_9_div_2_Template, 7, 0, "div", 15);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", ctx_r2.orders());
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r2.orders().length === 0);
  }
}
function WalletOrdersComponent_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275element(1, "div", 38);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3, "\u52A0\u8F09\u4E2D...");
    \u0275\u0275elementEnd()();
  }
}
function WalletOrdersComponent_div_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 39)(1, "button", 40);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_11_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.goToPage(ctx_r2.currentPage() - 1));
    });
    \u0275\u0275text(2, "\u4E0A\u4E00\u9801");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 41);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 40);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_11_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.goToPage(ctx_r2.currentPage() + 1));
    });
    \u0275\u0275text(6, "\u4E0B\u4E00\u9801");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.currentPage() <= 1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2("", ctx_r2.currentPage(), " / ", ctx_r2.totalPages());
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.currentPage() >= ctx_r2.totalPages());
  }
}
function WalletOrdersComponent_div_12_div_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "span", 48);
    \u0275\u0275text(2, "\u8D08\u9001\u91D1\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 54);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("+", ctx_r2.formatAmount(((tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.bonus_amount) || 0));
  }
}
function WalletOrdersComponent_div_12_div_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "span", 48);
    \u0275\u0275text(2, "\u624B\u7E8C\u8CBB");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 50);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(((tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.fee) || 0));
  }
}
function WalletOrdersComponent_div_12_div_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "span", 48);
    \u0275\u0275text(2, "USDT \u91D1\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 50);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("", (tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.usdt_amount, " USDT");
  }
}
function WalletOrdersComponent_div_12_div_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "span", 48);
    \u0275\u0275text(2, "\u4EA4\u6613\u54C8\u5E0C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 55);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate((tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.usdt_tx_hash);
  }
}
function WalletOrdersComponent_div_12_div_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "span", 48);
    \u0275\u0275text(2, "\u5230\u8CEC\u6642\u9593");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 50);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(((tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.confirmed_at) || ""));
  }
}
function WalletOrdersComponent_div_12_div_43_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 56)(1, "button", 57);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_12_div_43_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.cancelOrder(ctx_r2.selectedOrder()));
    });
    \u0275\u0275text(2, "\u53D6\u6D88\u8A02\u55AE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 58);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_12_div_43_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.continuePayment(ctx_r2.selectedOrder()));
    });
    \u0275\u0275text(4, "\u7E7C\u7E8C\u652F\u4ED8");
    \u0275\u0275elementEnd()();
  }
}
function WalletOrdersComponent_div_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_12_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.closeOrderDetail());
    });
    \u0275\u0275elementStart(1, "div", 43);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_12_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 44)(3, "h3");
    \u0275\u0275text(4, "\u8A02\u55AE\u8A73\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 45);
    \u0275\u0275listener("click", function WalletOrdersComponent_div_12_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.closeOrderDetail());
    });
    \u0275\u0275text(6, "\xD7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 46)(8, "div", 47)(9, "span", 48);
    \u0275\u0275text(10, "\u8A02\u55AE\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 49);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 47)(14, "span", 48);
    \u0275\u0275text(15, "\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 50);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 47)(19, "span", 48);
    \u0275\u0275text(20, "\u5145\u503C\u91D1\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "span", 50);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(23, WalletOrdersComponent_div_12_div_23_Template, 5, 1, "div", 51)(24, WalletOrdersComponent_div_12_div_24_Template, 5, 1, "div", 51);
    \u0275\u0275elementStart(25, "div", 52)(26, "span", 48);
    \u0275\u0275text(27, "\u5BE6\u969B\u5230\u8CEC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "span", 50);
    \u0275\u0275text(29);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 47)(31, "span", 48);
    \u0275\u0275text(32, "\u652F\u4ED8\u65B9\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "span", 50);
    \u0275\u0275text(34);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(35, WalletOrdersComponent_div_12_div_35_Template, 5, 1, "div", 51)(36, WalletOrdersComponent_div_12_div_36_Template, 5, 1, "div", 51);
    \u0275\u0275elementStart(37, "div", 47)(38, "span", 48);
    \u0275\u0275text(39, "\u5275\u5EFA\u6642\u9593");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "span", 50);
    \u0275\u0275text(41);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(42, WalletOrdersComponent_div_12_div_42_Template, 5, 1, "div", 51);
    \u0275\u0275elementEnd();
    \u0275\u0275template(43, WalletOrdersComponent_div_12_div_43_Template, 5, 0, "div", 53);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_2_0;
    let tmp_3_0;
    let tmp_4_0;
    let tmp_5_0;
    let tmp_6_0;
    let tmp_7_0;
    let tmp_8_0;
    let tmp_9_0;
    let tmp_10_0;
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(12);
    \u0275\u0275textInterpolate((tmp_1_0 = ctx_r2.selectedOrder()) == null ? null : tmp_1_0.order_no);
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("color", ctx_r2.getStatusColor(((tmp_2_0 = ctx_r2.selectedOrder()) == null ? null : tmp_2_0.status) || ""));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.getStatusName(((tmp_3_0 = ctx_r2.selectedOrder()) == null ? null : tmp_3_0.status) || ""), " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(((tmp_4_0 = ctx_r2.selectedOrder()) == null ? null : tmp_4_0.amount) || 0));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", (tmp_5_0 = ctx_r2.selectedOrder()) == null ? null : tmp_5_0.bonus_amount);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", (tmp_6_0 = ctx_r2.selectedOrder()) == null ? null : tmp_6_0.fee);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(((tmp_7_0 = ctx_r2.selectedOrder()) == null ? null : tmp_7_0.actual_amount) || 0));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.getMethodName(((tmp_8_0 = ctx_r2.selectedOrder()) == null ? null : tmp_8_0.payment_method) || ""));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", (tmp_9_0 = ctx_r2.selectedOrder()) == null ? null : tmp_9_0.usdt_amount);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", (tmp_10_0 = ctx_r2.selectedOrder()) == null ? null : tmp_10_0.usdt_tx_hash);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.formatDate(((tmp_11_0 = ctx_r2.selectedOrder()) == null ? null : tmp_11_0.created_at) || ""));
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", (tmp_12_0 = ctx_r2.selectedOrder()) == null ? null : tmp_12_0.confirmed_at);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ((tmp_13_0 = ctx_r2.selectedOrder()) == null ? null : tmp_13_0.status) === "pending");
  }
}
var WalletOrdersComponent = class _WalletOrdersComponent {
  constructor(walletService, router) {
    this.walletService = walletService;
    this.router = router;
    this.orders = signal([], ...ngDevMode ? [{ debugName: "orders" }] : []);
    this.loading = signal(true, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.currentPage = signal(1, ...ngDevMode ? [{ debugName: "currentPage" }] : []);
    this.totalPages = signal(1, ...ngDevMode ? [{ debugName: "totalPages" }] : []);
    this.currentStatus = signal("", ...ngDevMode ? [{ debugName: "currentStatus" }] : []);
    this.selectedOrder = signal(null, ...ngDevMode ? [{ debugName: "selectedOrder" }] : []);
    this.statusTabs = [
      { label: "\u5168\u90E8", value: "", count: 0 },
      { label: "\u5F85\u652F\u4ED8", value: "pending", count: 0 },
      { label: "\u5DF2\u652F\u4ED8", value: "paid", count: 0 },
      { label: "\u5DF2\u5230\u8CEC", value: "confirmed", count: 0 },
      { label: "\u5DF2\u904E\u671F", value: "expired", count: 0 }
    ];
  }
  ngOnInit() {
    this.loadOrders();
  }
  async loadOrders() {
    this.loading.set(true);
    try {
      const result = await this.walletService.getRechargeOrders({
        page: this.currentPage(),
        pageSize: 20,
        status: this.currentStatus() || void 0
      });
      if (result) {
        this.orders.set(result.orders);
        this.totalPages.set(result.pagination.total_pages);
        const pendingCount = result.orders.filter((o) => o.status === "pending").length;
        this.statusTabs[1].count = pendingCount;
      }
    } catch (error) {
      console.error("Load orders error:", error);
    } finally {
      this.loading.set(false);
    }
  }
  filterByStatus(status) {
    this.currentStatus.set(status);
    this.currentPage.set(1);
    this.loadOrders();
  }
  goToPage(page) {
    if (page < 1 || page > this.totalPages())
      return;
    this.currentPage.set(page);
    this.loadOrders();
  }
  viewOrder(order) {
    this.selectedOrder.set(order);
  }
  closeOrderDetail() {
    this.selectedOrder.set(null);
  }
  async continuePayment(order) {
    this.router.navigate(["/wallet/recharge"], {
      queryParams: { orderNo: order.order_no }
    });
  }
  async cancelOrder(order) {
    if (!confirm("\u78BA\u5B9A\u8981\u53D6\u6D88\u6B64\u8A02\u55AE\u55CE\uFF1F"))
      return;
    const result = await this.walletService.cancelRechargeOrder(order.order_no);
    if (result.success) {
      await this.loadOrders();
      this.closeOrderDetail();
    } else {
      alert(result.error || "\u53D6\u6D88\u5931\u6557");
    }
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
      "alipay": "\u{1F499}",
      "wechat": "\u{1F49A}",
      "bank": "\u{1F3E6}"
    };
    return icons[method] || "\u{1F4B3}";
  }
  getMethodName(method) {
    const names = {
      "usdt_trc20": "USDT (TRC20)",
      "usdt_erc20": "USDT (ERC20)",
      "alipay": "\u652F\u4ED8\u5BF6",
      "wechat": "\u5FAE\u4FE1\u652F\u4ED8",
      "bank": "\u9280\u884C\u5361"
    };
    return names[method] || method;
  }
  getStatusName(status) {
    const names = {
      "pending": "\u5F85\u652F\u4ED8",
      "paid": "\u5DF2\u652F\u4ED8",
      "confirmed": "\u5DF2\u5230\u8CEC",
      "failed": "\u5931\u6557",
      "expired": "\u5DF2\u904E\u671F",
      "refunded": "\u5DF2\u9000\u6B3E"
    };
    return names[status] || status;
  }
  getStatusColor(status) {
    const colors = {
      "pending": "#f59e0b",
      "paid": "#3b82f6",
      "confirmed": "#22c55e",
      "failed": "#ef4444",
      "expired": "#9ca3af",
      "refunded": "#8b5cf6"
    };
    return colors[status] || "#666";
  }
  goBack() {
    this.router.navigate(["/wallet"]);
  }
  goToRecharge() {
    this.router.navigate(["/wallet/recharge"]);
  }
  static {
    this.\u0275fac = function WalletOrdersComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletOrdersComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletOrdersComponent, selectors: [["app-wallet-orders"]], decls: 13, vars: 5, consts: [[1, "orders-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "filters"], ["class", "filter-tab", 3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "orders-list", 4, "ngIf"], ["class", "loading-state", 4, "ngIf"], ["class", "pagination", 4, "ngIf"], ["class", "modal-overlay", 3, "click", 4, "ngIf"], [1, "filter-tab", 3, "click"], ["class", "count", 4, "ngIf"], [1, "count"], [1, "orders-list"], ["class", "order-item", 3, "click", 4, "ngFor", "ngForOf"], ["class", "empty-state", 4, "ngIf"], [1, "order-item", 3, "click"], [1, "order-main"], [1, "order-info"], [1, "order-no"], [1, "order-time"], [1, "order-amount"], [1, "amount"], ["class", "bonus", 4, "ngIf"], [1, "order-footer"], [1, "payment-method"], [1, "method-icon"], [1, "order-status"], ["class", "order-actions", 3, "click", 4, "ngIf"], [1, "bonus"], [1, "order-actions", 3, "click"], [1, "cancel-btn", 3, "click"], [1, "pay-btn", 3, "click"], [1, "empty-state"], [1, "empty-icon"], [1, "empty-text"], [1, "recharge-btn", 3, "click"], [1, "loading-state"], [1, "spinner"], [1, "pagination"], [1, "page-btn", 3, "click", "disabled"], [1, "page-info"], [1, "modal-overlay", 3, "click"], [1, "modal", 3, "click"], [1, "modal-header"], [1, "close-btn", 3, "click"], [1, "modal-body"], [1, "detail-row"], [1, "label"], [1, "value", "mono"], [1, "value"], ["class", "detail-row", 4, "ngIf"], [1, "detail-row", "highlight"], ["class", "modal-footer", 4, "ngIf"], [1, "value", "bonus"], [1, "value", "mono", "small"], [1, "modal-footer"], [1, "secondary-btn", 3, "click"], [1, "primary-btn", 3, "click"]], template: function WalletOrdersComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletOrdersComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275text(4, "\u2190");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "h1");
        \u0275\u0275text(6, "\u5145\u503C\u8A02\u55AE");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(7, "div", 4);
        \u0275\u0275template(8, WalletOrdersComponent_button_8_Template, 3, 4, "button", 5);
        \u0275\u0275elementEnd();
        \u0275\u0275template(9, WalletOrdersComponent_div_9_Template, 3, 2, "div", 6)(10, WalletOrdersComponent_div_10_Template, 4, 0, "div", 7)(11, WalletOrdersComponent_div_11_Template, 7, 4, "div", 8)(12, WalletOrdersComponent_div_12_Template, 44, 14, "div", 9);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(8);
        \u0275\u0275property("ngForOf", ctx.statusTabs);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", !ctx.loading());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.loading());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.totalPages() > 1);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.selectedOrder());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule], styles: ["\n\n.orders-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.filters[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 20px;\n  overflow-x: auto;\n  padding-bottom: 8px;\n}\n.filter-tab[_ngcontent-%COMP%] {\n  flex-shrink: 0;\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 20px;\n  color: rgba(255, 255, 255, 0.7);\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.filter-tab[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n}\n.filter-tab.active[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border-color: transparent;\n  color: #fff;\n}\n.filter-tab[_ngcontent-%COMP%]   .count[_ngcontent-%COMP%] {\n  display: inline-block;\n  min-width: 18px;\n  height: 18px;\n  line-height: 18px;\n  text-align: center;\n  background: rgba(255, 255, 255, 0.2);\n  border-radius: 10px;\n  font-size: 11px;\n  margin-left: 6px;\n}\n.orders-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.order-item[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 16px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.order-item[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.08);\n}\n.order-main[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.order-no[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 500;\n  font-family: monospace;\n}\n.order-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n  margin-top: 4px;\n}\n.order-amount[_ngcontent-%COMP%] {\n  text-align: right;\n}\n.order-amount[_ngcontent-%COMP%]   .amount[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  color: #667eea;\n}\n.order-amount[_ngcontent-%COMP%]   .bonus[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #f59e0b;\n}\n.order-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding-top: 12px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.payment-method[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n  opacity: 0.7;\n}\n.method-icon[_ngcontent-%COMP%] {\n  font-size: 16px;\n}\n.order-status[_ngcontent-%COMP%] {\n  font-size: 13px;\n  font-weight: 500;\n}\n.order-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  margin-top: 12px;\n  padding-top: 12px;\n  border-top: 1px dashed rgba(255, 255, 255, 0.1);\n}\n.cancel-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 10px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.pay-btn[_ngcontent-%COMP%] {\n  flex: 2;\n  padding: 10px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n}\n.empty-state[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 60px 20px;\n}\n.empty-icon[_ngcontent-%COMP%] {\n  font-size: 48px;\n  margin-bottom: 16px;\n}\n.empty-text[_ngcontent-%COMP%] {\n  font-size: 16px;\n  opacity: 0.6;\n  margin-bottom: 24px;\n}\n.recharge-btn[_ngcontent-%COMP%] {\n  padding: 12px 32px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n}\n.loading-state[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 60px 20px;\n  gap: 12px;\n}\n.spinner[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.pagination[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n  margin-top: 24px;\n  padding: 16px;\n}\n.page-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.page-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.3;\n  cursor: not-allowed;\n}\n.page-info[_ngcontent-%COMP%] {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.modal-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.modal-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body[_ngcontent-%COMP%] {\n  padding: 20px;\n}\n.detail-row[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.detail-row[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  opacity: 0.6;\n  font-size: 14px;\n}\n.detail-row[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 14px;\n  text-align: right;\n}\n.detail-row[_ngcontent-%COMP%]   .value.mono[_ngcontent-%COMP%] {\n  font-family: monospace;\n}\n.detail-row[_ngcontent-%COMP%]   .value.small[_ngcontent-%COMP%] {\n  font-size: 11px;\n  word-break: break-all;\n  max-width: 200px;\n}\n.detail-row[_ngcontent-%COMP%]   .value.bonus[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.detail-row.highlight[_ngcontent-%COMP%] {\n  background: rgba(102, 126, 234, 0.1);\n  margin: 0 -20px;\n  padding: 12px 20px;\n  border-radius: 8px;\n}\n.detail-row.highlight[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: #667eea;\n}\n.modal-footer[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  padding: 20px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.secondary-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 14px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n}\n.primary-btn[_ngcontent-%COMP%] {\n  flex: 2;\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  font-weight: 500;\n  cursor: pointer;\n}\n/*# sourceMappingURL=wallet-orders.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletOrdersComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-orders", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="orders-view">
      <!-- \u982D\u90E8 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">\u2190</button>
          <h1>\u5145\u503C\u8A02\u55AE</h1>
        </div>
      </div>

      <!-- \u7BE9\u9078\u5668 -->
      <div class="filters">
        <button 
          *ngFor="let tab of statusTabs"
          class="filter-tab"
          [class.active]="currentStatus() === tab.value"
          (click)="filterByStatus(tab.value)"
        >
          {{ tab.label }}
          <span class="count" *ngIf="tab.count > 0">{{ tab.count }}</span>
        </button>
      </div>

      <!-- \u8A02\u55AE\u5217\u8868 -->
      <div class="orders-list" *ngIf="!loading()">
        <div 
          class="order-item" 
          *ngFor="let order of orders()"
          (click)="viewOrder(order)"
        >
          <div class="order-main">
            <div class="order-info">
              <div class="order-no">{{ order.order_no }}</div>
              <div class="order-time">{{ formatDate(order.created_at) }}</div>
            </div>
            <div class="order-amount">
              <div class="amount">{{ formatAmount(order.amount) }}</div>
              <div class="bonus" *ngIf="order.bonus_amount > 0">
                +{{ formatAmount(order.bonus_amount) }}
              </div>
            </div>
          </div>
          
          <div class="order-footer">
            <div class="payment-method">
              <span class="method-icon">{{ getMethodIcon(order.payment_method) }}</span>
              <span>{{ getMethodName(order.payment_method) }}</span>
            </div>
            <div class="order-status" [style.color]="getStatusColor(order.status)">
              {{ getStatusName(order.status) }}
            </div>
          </div>

          <!-- \u5F85\u652F\u4ED8\u8A02\u55AE\u64CD\u4F5C -->
          <div class="order-actions" *ngIf="order.status === 'pending'" (click)="$event.stopPropagation()">
            <button class="cancel-btn" (click)="cancelOrder(order)">\u53D6\u6D88</button>
            <button class="pay-btn" (click)="continuePayment(order)">\u7E7C\u7E8C\u652F\u4ED8</button>
          </div>
        </div>

        <!-- \u7A7A\u72C0\u614B -->
        <div class="empty-state" *ngIf="orders().length === 0">
          <div class="empty-icon">\u{1F4CB}</div>
          <div class="empty-text">\u66AB\u7121\u8A02\u55AE\u8A18\u9304</div>
          <button class="recharge-btn" (click)="goToRecharge()">\u7ACB\u5373\u5145\u503C</button>
        </div>
      </div>

      <!-- \u52A0\u8F09\u72C0\u614B -->
      <div class="loading-state" *ngIf="loading()">
        <div class="spinner"></div>
        <span>\u52A0\u8F09\u4E2D...</span>
      </div>

      <!-- \u5206\u9801 -->
      <div class="pagination" *ngIf="totalPages() > 1">
        <button 
          class="page-btn" 
          [disabled]="currentPage() <= 1"
          (click)="goToPage(currentPage() - 1)"
        >\u4E0A\u4E00\u9801</button>
        <span class="page-info">{{ currentPage() }} / {{ totalPages() }}</span>
        <button 
          class="page-btn" 
          [disabled]="currentPage() >= totalPages()"
          (click)="goToPage(currentPage() + 1)"
        >\u4E0B\u4E00\u9801</button>
      </div>

      <!-- \u8A02\u55AE\u8A73\u60C5\u5F48\u7A97 -->
      <div class="modal-overlay" *ngIf="selectedOrder()" (click)="closeOrderDetail()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>\u8A02\u55AE\u8A73\u60C5</h3>
            <button class="close-btn" (click)="closeOrderDetail()">\xD7</button>
          </div>
          <div class="modal-body">
            <div class="detail-row">
              <span class="label">\u8A02\u55AE\u865F</span>
              <span class="value mono">{{ selectedOrder()?.order_no }}</span>
            </div>
            <div class="detail-row">
              <span class="label">\u72C0\u614B</span>
              <span class="value" [style.color]="getStatusColor(selectedOrder()?.status || '')">
                {{ getStatusName(selectedOrder()?.status || '') }}
              </span>
            </div>
            <div class="detail-row">
              <span class="label">\u5145\u503C\u91D1\u984D</span>
              <span class="value">{{ formatAmount(selectedOrder()?.amount || 0) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.bonus_amount">
              <span class="label">\u8D08\u9001\u91D1\u984D</span>
              <span class="value bonus">+{{ formatAmount(selectedOrder()?.bonus_amount || 0) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.fee">
              <span class="label">\u624B\u7E8C\u8CBB</span>
              <span class="value">{{ formatAmount(selectedOrder()?.fee || 0) }}</span>
            </div>
            <div class="detail-row highlight">
              <span class="label">\u5BE6\u969B\u5230\u8CEC</span>
              <span class="value">{{ formatAmount(selectedOrder()?.actual_amount || 0) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">\u652F\u4ED8\u65B9\u5F0F</span>
              <span class="value">{{ getMethodName(selectedOrder()?.payment_method || '') }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.usdt_amount">
              <span class="label">USDT \u91D1\u984D</span>
              <span class="value">{{ selectedOrder()?.usdt_amount }} USDT</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.usdt_tx_hash">
              <span class="label">\u4EA4\u6613\u54C8\u5E0C</span>
              <span class="value mono small">{{ selectedOrder()?.usdt_tx_hash }}</span>
            </div>
            <div class="detail-row">
              <span class="label">\u5275\u5EFA\u6642\u9593</span>
              <span class="value">{{ formatDate(selectedOrder()?.created_at || '') }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedOrder()?.confirmed_at">
              <span class="label">\u5230\u8CEC\u6642\u9593</span>
              <span class="value">{{ formatDate(selectedOrder()?.confirmed_at || '') }}</span>
            </div>
          </div>
          <div class="modal-footer" *ngIf="selectedOrder()?.status === 'pending'">
            <button class="secondary-btn" (click)="cancelOrder(selectedOrder()!)">\u53D6\u6D88\u8A02\u55AE</button>
            <button class="primary-btn" (click)="continuePayment(selectedOrder()!)">\u7E7C\u7E8C\u652F\u4ED8</button>
          </div>
        </div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;99215b6b5f12f0e5a48692ea2b8d68283ab6d108af092b74c29f427fc09452a4;D:/tgkz2026/src/views/wallet-orders.component.ts */\n.orders-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.filters {\n  display: flex;\n  gap: 8px;\n  margin-bottom: 20px;\n  overflow-x: auto;\n  padding-bottom: 8px;\n}\n.filter-tab {\n  flex-shrink: 0;\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n  border-radius: 20px;\n  color: rgba(255, 255, 255, 0.7);\n  font-size: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.filter-tab:hover {\n  background: rgba(255, 255, 255, 0.1);\n}\n.filter-tab.active {\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border-color: transparent;\n  color: #fff;\n}\n.filter-tab .count {\n  display: inline-block;\n  min-width: 18px;\n  height: 18px;\n  line-height: 18px;\n  text-align: center;\n  background: rgba(255, 255, 255, 0.2);\n  border-radius: 10px;\n  font-size: 11px;\n  margin-left: 6px;\n}\n.orders-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.order-item {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 16px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.order-item:hover {\n  background: rgba(255, 255, 255, 0.08);\n}\n.order-main {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 12px;\n}\n.order-no {\n  font-size: 14px;\n  font-weight: 500;\n  font-family: monospace;\n}\n.order-time {\n  font-size: 12px;\n  opacity: 0.6;\n  margin-top: 4px;\n}\n.order-amount {\n  text-align: right;\n}\n.order-amount .amount {\n  font-size: 18px;\n  font-weight: 600;\n  color: #667eea;\n}\n.order-amount .bonus {\n  font-size: 12px;\n  color: #f59e0b;\n}\n.order-footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding-top: 12px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.payment-method {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n  opacity: 0.7;\n}\n.method-icon {\n  font-size: 16px;\n}\n.order-status {\n  font-size: 13px;\n  font-weight: 500;\n}\n.order-actions {\n  display: flex;\n  gap: 12px;\n  margin-top: 12px;\n  padding-top: 12px;\n  border-top: 1px dashed rgba(255, 255, 255, 0.1);\n}\n.cancel-btn {\n  flex: 1;\n  padding: 10px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.pay-btn {\n  flex: 2;\n  padding: 10px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n}\n.empty-state {\n  text-align: center;\n  padding: 60px 20px;\n}\n.empty-icon {\n  font-size: 48px;\n  margin-bottom: 16px;\n}\n.empty-text {\n  font-size: 16px;\n  opacity: 0.6;\n  margin-bottom: 24px;\n}\n.recharge-btn {\n  padding: 12px 32px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n}\n.loading-state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 60px 20px;\n  gap: 12px;\n}\n.spinner {\n  width: 32px;\n  height: 32px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.pagination {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  gap: 16px;\n  margin-top: 24px;\n  padding: 16px;\n}\n.page-btn {\n  padding: 10px 20px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 14px;\n  cursor: pointer;\n}\n.page-btn:disabled {\n  opacity: 0.3;\n  cursor: not-allowed;\n}\n.page-info {\n  font-size: 14px;\n  opacity: 0.7;\n}\n.modal-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.7);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n  padding: 20px;\n}\n.modal {\n  background: #1a1a2e;\n  border-radius: 20px;\n  max-width: 400px;\n  width: 100%;\n  max-height: 80vh;\n  overflow-y: auto;\n}\n.modal-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 20px;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.1);\n}\n.modal-header h3 {\n  margin: 0;\n  font-size: 18px;\n}\n.close-btn {\n  width: 32px;\n  height: 32px;\n  border-radius: 50%;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\n.modal-body {\n  padding: 20px;\n}\n.detail-row {\n  display: flex;\n  justify-content: space-between;\n  padding: 12px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.detail-row .label {\n  opacity: 0.6;\n  font-size: 14px;\n}\n.detail-row .value {\n  font-size: 14px;\n  text-align: right;\n}\n.detail-row .value.mono {\n  font-family: monospace;\n}\n.detail-row .value.small {\n  font-size: 11px;\n  word-break: break-all;\n  max-width: 200px;\n}\n.detail-row .value.bonus {\n  color: #f59e0b;\n}\n.detail-row.highlight {\n  background: rgba(102, 126, 234, 0.1);\n  margin: 0 -20px;\n  padding: 12px 20px;\n  border-radius: 8px;\n}\n.detail-row.highlight .value {\n  font-weight: 600;\n  color: #667eea;\n}\n.modal-footer {\n  display: flex;\n  gap: 12px;\n  padding: 20px;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.secondary-btn {\n  flex: 1;\n  padding: 14px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n}\n.primary-btn {\n  flex: 2;\n  padding: 14px;\n  background:\n    linear-gradient(\n      135deg,\n      #667eea,\n      #764ba2);\n  border: none;\n  border-radius: 10px;\n  color: #fff;\n  font-size: 15px;\n  font-weight: 500;\n  cursor: pointer;\n}\n/*# sourceMappingURL=wallet-orders.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletOrdersComponent, { className: "WalletOrdersComponent", filePath: "src/views/wallet-orders.component.ts", lineNumber: 564 });
})();
export {
  WalletOrdersComponent
};
//# sourceMappingURL=chunk-6KFBTQIS.js.map
