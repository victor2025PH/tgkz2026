import {
  WalletService
} from "./chunk-2RAHAZHZ.js";
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
  NgForOf,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  Component,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/views/wallet-analytics.component.ts
function WalletAnalyticsComponent_div_42__svg_circle_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275element(0, "circle", 33);
  }
  if (rf & 2) {
    const cat_r1 = ctx.$implicit;
    const i_r2 = ctx.index;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275attribute("stroke", cat_r1.color)("stroke-dasharray", ctx_r2.getStrokeDasharray(cat_r1.percent))("stroke-dashoffset", ctx_r2.getStrokeDashoffset(i_r2));
  }
}
function WalletAnalyticsComponent_div_42_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34);
    \u0275\u0275element(1, "span", 35);
    \u0275\u0275elementStart(2, "span", 36);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 37);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 38);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cat_r4 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", cat_r4.color);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(cat_r4.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", cat_r4.percent.toFixed(1), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(cat_r4.amount));
  }
}
function WalletAnalyticsComponent_div_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "div", 25);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(2, "svg", 26);
    \u0275\u0275template(3, WalletAnalyticsComponent_div_42__svg_circle_3_Template, 1, 3, "circle", 27);
    \u0275\u0275elementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(4, "div", 28)(5, "div", 29);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 30);
    \u0275\u0275text(8, "\u7E3D\u6D88\u8CBB");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 31);
    \u0275\u0275template(10, WalletAnalyticsComponent_div_42_div_10_Template, 8, 5, "div", 32);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_2_0;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275property("ngForOf", ctx_r2.categoryData());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((tmp_2_0 = ctx_r2.summary()) == null ? null : tmp_2_0.total_display);
    \u0275\u0275advance(4);
    \u0275\u0275property("ngForOf", ctx_r2.categoryData());
  }
}
function WalletAnalyticsComponent_div_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 39)(1, "span");
    \u0275\u0275text(2, "\u66AB\u7121\u6D88\u8CBB\u6578\u64DA");
    \u0275\u0275elementEnd()();
  }
}
function WalletAnalyticsComponent_div_47_div_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 43);
    \u0275\u0275element(1, "div", 44);
    \u0275\u0275elementStart(2, "div", 45);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const day_r5 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275property("title", day_r5.date + ": " + ctx_r2.formatAmount(day_r5.amount));
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r2.getBarHeight(day_r5.amount) + "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatDayLabel(day_r5.date));
  }
}
function WalletAnalyticsComponent_div_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40)(1, "div", 41);
    \u0275\u0275template(2, WalletAnalyticsComponent_div_47_div_2_Template, 4, 4, "div", 42);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275property("ngForOf", ctx_r2.dailyData());
  }
}
function WalletAnalyticsComponent_div_48_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 39)(1, "span");
    \u0275\u0275text(2, "\u66AB\u7121\u6D88\u8CBB\u8DA8\u52E2\u6578\u64DA");
    \u0275\u0275elementEnd()();
  }
}
function WalletAnalyticsComponent_div_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46)(1, "div", 47)(2, "span", 48);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 49);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 50)(7, "div", 51)(8, "span", 52);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 53);
    \u0275\u0275text(11, "\u6D88\u8CBB\u91D1\u984D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 51)(13, "span", 52);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "span", 53);
    \u0275\u0275text(16, "\u4EA4\u6613\u6B21\u6578");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 51)(18, "span", 52);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "span", 53);
    \u0275\u0275text(21, "\u5E73\u5747\u55AE\u7B46");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "div", 54);
    \u0275\u0275element(23, "div", 55);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const cat_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.getCategoryIcon(cat_r6.name));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(cat_r6.name);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(cat_r6.amount));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(cat_r6.count);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.formatAmount(cat_r6.count > 0 ? cat_r6.amount / cat_r6.count : 0));
    \u0275\u0275advance(4);
    \u0275\u0275styleProp("width", cat_r6.percent + "%")("background", cat_r6.color);
  }
}
function WalletAnalyticsComponent_div_54_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 56)(1, "span");
    \u0275\u0275text(2, "\u66AB\u7121\u6D88\u8CBB\u8A18\u9304");
    \u0275\u0275elementEnd()();
  }
}
function WalletAnalyticsComponent_div_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 57);
    \u0275\u0275element(1, "div", 58);
    \u0275\u0275elementEnd();
  }
}
var WalletAnalyticsComponent = class _WalletAnalyticsComponent {
  constructor(walletService, router) {
    this.walletService = walletService;
    this.router = router;
    this.selectedPeriod = "30";
    this.loading = signal(true, ...ngDevMode ? [{ debugName: "loading" }] : []);
    this.summary = signal(null, ...ngDevMode ? [{ debugName: "summary" }] : []);
    this.categoryData = signal([], ...ngDevMode ? [{ debugName: "categoryData" }] : []);
    this.dailyData = signal([], ...ngDevMode ? [{ debugName: "dailyData" }] : []);
    this.categoryColors = {
      "membership": "#667eea",
      "ip_proxy": "#22c55e",
      "quota_pack": "#f59e0b",
      "other": "#8b5cf6"
    };
    this.categoryNames = {
      "membership": "\u6703\u54E1\u670D\u52D9",
      "ip_proxy": "\u975C\u614B IP",
      "quota_pack": "\u914D\u984D\u5305",
      "other": "\u5176\u4ED6"
    };
  }
  ngOnInit() {
    this.loadData();
  }
  async loadData() {
    this.loading.set(true);
    try {
      const days = parseInt(this.selectedPeriod);
      const summary = await this.walletService.getConsumeSummary(days);
      if (summary) {
        this.summary.set(summary);
        const categories = [];
        const byCategory = summary.by_category || {};
        const totalAmount = summary.total_amount || 0;
        for (const [key, data] of Object.entries(byCategory)) {
          const catData = data;
          categories.push({
            name: this.categoryNames[key] || key,
            amount: catData.total || 0,
            count: catData.count || 0,
            percent: totalAmount > 0 ? catData.total / totalAmount * 100 : 0,
            color: this.categoryColors[key] || "#999"
          });
        }
        categories.sort((a, b) => b.amount - a.amount);
        this.categoryData.set(categories);
      }
      const analysis = await this.walletService.getConsumeAnalysis();
      if (analysis?.by_date) {
        const daily = analysis.by_date.map((item) => ({
          date: item.date,
          amount: item.amount
        }));
        daily.sort((a, b) => a.date.localeCompare(b.date));
        const recentDays = daily.slice(-parseInt(this.selectedPeriod));
        this.dailyData.set(recentDays);
      }
    } catch (error) {
      console.error("Load analytics error:", error);
    } finally {
      this.loading.set(false);
    }
  }
  onPeriodChange() {
    this.loadData();
  }
  formatAmount(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  formatDayLabel(date) {
    if (!date)
      return "";
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  getCategoryIcon(name) {
    const icons = {
      "\u6703\u54E1\u670D\u52D9": "\u{1F451}",
      "\u975C\u614B IP": "\u{1F310}",
      "\u914D\u984D\u5305": "\u{1F4CA}",
      "\u5176\u4ED6": "\u{1F4E6}"
    };
    return icons[name] || "\u{1F4CB}";
  }
  getBarHeight(amount) {
    const daily = this.dailyData();
    if (daily.length === 0)
      return 0;
    const maxAmount = Math.max(...daily.map((d) => d.amount));
    if (maxAmount === 0)
      return 0;
    return amount / maxAmount * 100;
  }
  // SVG 餅圖計算
  getStrokeDasharray(percent) {
    const circumference = 2 * Math.PI * 40;
    const length = percent / 100 * circumference;
    return `${length} ${circumference}`;
  }
  getStrokeDashoffset(index) {
    const circumference = 2 * Math.PI * 40;
    let offset = 0;
    const categories = this.categoryData();
    for (let i = 0; i < index; i++) {
      offset += categories[i].percent / 100 * circumference;
    }
    return -offset;
  }
  async exportData() {
    try {
      await this.walletService.exportTransactions();
    } catch (error) {
      console.error("Export error:", error);
      alert("\u5C0E\u51FA\u5931\u6557");
    }
  }
  goBack() {
    this.router.navigate(["/wallet"]);
  }
  static {
    this.\u0275fac = function WalletAnalyticsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _WalletAnalyticsComponent)(\u0275\u0275directiveInject(WalletService), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _WalletAnalyticsComponent, selectors: [["app-wallet-analytics"]], decls: 59, vars: 11, consts: [[1, "analytics-view"], [1, "view-header"], [1, "header-left"], [1, "back-btn", 3, "click"], [1, "period-select", 3, "ngModelChange", "change", "ngModel"], ["value", "7"], ["value", "30"], ["value", "90"], [1, "summary-cards"], [1, "summary-card"], [1, "card-icon"], [1, "card-content"], [1, "card-label"], [1, "card-value"], [1, "section"], ["class", "pie-chart-container", 4, "ngIf"], ["class", "empty-chart", 4, "ngIf"], ["class", "bar-chart", 4, "ngIf"], [1, "category-list"], ["class", "category-item", 4, "ngFor", "ngForOf"], ["class", "empty-list", 4, "ngIf"], [1, "export-section"], [1, "export-btn", 3, "click"], ["class", "loading-overlay", 4, "ngIf"], [1, "pie-chart-container"], [1, "pie-chart"], ["viewBox", "0 0 100 100"], ["cx", "50", "cy", "50", "r", "40", "fill", "transparent", "stroke-width", "20", "transform", "rotate(-90 50 50)", 4, "ngFor", "ngForOf"], [1, "pie-center"], [1, "pie-total"], [1, "pie-label"], [1, "pie-legend"], ["class", "legend-item", 4, "ngFor", "ngForOf"], ["cx", "50", "cy", "50", "r", "40", "fill", "transparent", "stroke-width", "20", "transform", "rotate(-90 50 50)"], [1, "legend-item"], [1, "legend-dot"], [1, "legend-name"], [1, "legend-percent"], [1, "legend-amount"], [1, "empty-chart"], [1, "bar-chart"], [1, "bar-container"], ["class", "bar-item", 3, "title", 4, "ngFor", "ngForOf"], [1, "bar-item", 3, "title"], [1, "bar"], [1, "bar-label"], [1, "category-item"], [1, "category-header"], [1, "category-icon"], [1, "category-name"], [1, "category-stats"], [1, "stat"], [1, "stat-value"], [1, "stat-label"], [1, "category-bar"], [1, "bar-fill"], [1, "empty-list"], [1, "loading-overlay"], [1, "spinner"]], template: function WalletAnalyticsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "button", 3);
        \u0275\u0275listener("click", function WalletAnalyticsComponent_Template_button_click_3_listener() {
          return ctx.goBack();
        });
        \u0275\u0275text(4, "\u2190");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "h1");
        \u0275\u0275text(6, "\u6D88\u8CBB\u5206\u6790");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "select", 4);
        \u0275\u0275twoWayListener("ngModelChange", function WalletAnalyticsComponent_Template_select_ngModelChange_7_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.selectedPeriod, $event) || (ctx.selectedPeriod = $event);
          return $event;
        });
        \u0275\u0275listener("change", function WalletAnalyticsComponent_Template_select_change_7_listener() {
          return ctx.onPeriodChange();
        });
        \u0275\u0275elementStart(8, "option", 5);
        \u0275\u0275text(9, "\u8FD1 7 \u5929");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "option", 6);
        \u0275\u0275text(11, "\u8FD1 30 \u5929");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "option", 7);
        \u0275\u0275text(13, "\u8FD1 90 \u5929");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(14, "div", 8)(15, "div", 9)(16, "div", 10);
        \u0275\u0275text(17, "\u{1F4B0}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "div", 11)(19, "div", 12);
        \u0275\u0275text(20, "\u7E3D\u6D88\u8CBB");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "div", 13);
        \u0275\u0275text(22);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(23, "div", 9)(24, "div", 10);
        \u0275\u0275text(25, "\u{1F4CA}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "div", 11)(27, "div", 12);
        \u0275\u0275text(28, "\u4EA4\u6613\u6B21\u6578");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "div", 13);
        \u0275\u0275text(30);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(31, "div", 9)(32, "div", 10);
        \u0275\u0275text(33, "\u{1F4C5}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "div", 11)(35, "div", 12);
        \u0275\u0275text(36, "\u4ECA\u65E5\u6D88\u8CBB");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "div", 13);
        \u0275\u0275text(38);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(39, "div", 14)(40, "h2");
        \u0275\u0275text(41, "\u6309\u985E\u5225\u5206\u6790");
        \u0275\u0275elementEnd();
        \u0275\u0275template(42, WalletAnalyticsComponent_div_42_Template, 11, 3, "div", 15)(43, WalletAnalyticsComponent_div_43_Template, 3, 0, "div", 16);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(44, "div", 14)(45, "h2");
        \u0275\u0275text(46, "\u6D88\u8CBB\u8DA8\u52E2");
        \u0275\u0275elementEnd();
        \u0275\u0275template(47, WalletAnalyticsComponent_div_47_Template, 3, 1, "div", 17)(48, WalletAnalyticsComponent_div_48_Template, 3, 0, "div", 16);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(49, "div", 14)(50, "h2");
        \u0275\u0275text(51, "\u6D88\u8CBB\u660E\u7D30");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "div", 18);
        \u0275\u0275template(53, WalletAnalyticsComponent_div_53_Template, 24, 9, "div", 19);
        \u0275\u0275elementEnd();
        \u0275\u0275template(54, WalletAnalyticsComponent_div_54_Template, 3, 0, "div", 20);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(55, "div", 21)(56, "button", 22);
        \u0275\u0275listener("click", function WalletAnalyticsComponent_Template_button_click_56_listener() {
          return ctx.exportData();
        });
        \u0275\u0275text(57, " \u{1F4E5} \u5C0E\u51FA\u5831\u8868 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275template(58, WalletAnalyticsComponent_div_58_Template, 2, 0, "div", 23);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_2_0;
        let tmp_3_0;
        \u0275\u0275advance(7);
        \u0275\u0275twoWayProperty("ngModel", ctx.selectedPeriod);
        \u0275\u0275advance(15);
        \u0275\u0275textInterpolate(((tmp_1_0 = ctx.summary()) == null ? null : tmp_1_0.total_display) || "$0.00");
        \u0275\u0275advance(8);
        \u0275\u0275textInterpolate(((tmp_2_0 = ctx.summary()) == null ? null : tmp_2_0.total_count) || 0);
        \u0275\u0275advance(8);
        \u0275\u0275textInterpolate(ctx.formatAmount(((tmp_3_0 = ctx.summary()) == null ? null : tmp_3_0.today_consumed) || 0));
        \u0275\u0275advance(4);
        \u0275\u0275property("ngIf", ctx.categoryData().length > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.categoryData().length === 0 && !ctx.loading());
        \u0275\u0275advance(4);
        \u0275\u0275property("ngIf", ctx.dailyData().length > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.dailyData().length === 0 && !ctx.loading());
        \u0275\u0275advance(5);
        \u0275\u0275property("ngForOf", ctx.categoryData());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.categoryData().length === 0 && !ctx.loading());
        \u0275\u0275advance(4);
        \u0275\u0275property("ngIf", ctx.loading());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel], styles: ["\n\n.analytics-view[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.period-select[_ngcontent-%COMP%] {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 10px;\n  color: #fff;\n  font-size: 14px;\n}\n.period-select[_ngcontent-%COMP%]   option[_ngcontent-%COMP%] {\n  background: #1a1a2e;\n}\n.summary-cards[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n  margin-bottom: 24px;\n}\n.summary-card[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 16px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.card-icon[_ngcontent-%COMP%] {\n  font-size: 28px;\n}\n.card-label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n  margin-bottom: 4px;\n}\n.card-value[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n}\n.section[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 20px 0;\n}\n.pie-chart-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 24px;\n}\n.pie-chart[_ngcontent-%COMP%] {\n  position: relative;\n  width: 200px;\n  height: 200px;\n}\n.pie-chart[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n}\n.pie-center[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n}\n.pie-total[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: #667eea;\n}\n.pie-label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.pie-legend[_ngcontent-%COMP%] {\n  width: 100%;\n}\n.legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.legend-dot[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n}\n.legend-name[_ngcontent-%COMP%] {\n  flex: 1;\n  font-size: 14px;\n}\n.legend-percent[_ngcontent-%COMP%] {\n  font-size: 13px;\n  opacity: 0.7;\n  width: 50px;\n  text-align: right;\n}\n.legend-amount[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 500;\n  width: 80px;\n  text-align: right;\n}\n.bar-chart[_ngcontent-%COMP%] {\n  height: 160px;\n  overflow-x: auto;\n}\n.bar-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-end;\n  height: 100%;\n  gap: 8px;\n  min-width: max-content;\n  padding: 0 4px;\n}\n.bar-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  width: 32px;\n  height: 100%;\n}\n.bar[_ngcontent-%COMP%] {\n  width: 100%;\n  background:\n    linear-gradient(\n      180deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px 4px 0 0;\n  min-height: 4px;\n  transition: height 0.3s;\n}\n.bar-label[_ngcontent-%COMP%] {\n  font-size: 10px;\n  opacity: 0.5;\n  margin-top: 6px;\n  white-space: nowrap;\n}\n.category-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.category-item[_ngcontent-%COMP%] {\n  background: rgba(255, 255, 255, 0.03);\n  border-radius: 12px;\n  padding: 16px;\n}\n.category-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 12px;\n}\n.category-icon[_ngcontent-%COMP%] {\n  font-size: 20px;\n}\n.category-name[_ngcontent-%COMP%] {\n  font-size: 15px;\n  font-weight: 500;\n}\n.category-stats[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 24px;\n  margin-bottom: 12px;\n}\n.stat[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n}\n.stat-value[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n}\n.stat-label[_ngcontent-%COMP%] {\n  font-size: 11px;\n  opacity: 0.5;\n}\n.category-bar[_ngcontent-%COMP%] {\n  height: 6px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 3px;\n  overflow: hidden;\n}\n.bar-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  border-radius: 3px;\n  transition: width 0.3s;\n}\n.empty-chart[_ngcontent-%COMP%], \n.empty-list[_ngcontent-%COMP%] {\n  text-align: center;\n  padding: 40px 20px;\n  opacity: 0.5;\n}\n.export-section[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 24px;\n}\n.export-btn[_ngcontent-%COMP%] {\n  padding: 14px 32px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 12px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.export-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.15);\n}\n.loading-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n}\n.spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-analytics.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(WalletAnalyticsComponent, [{
    type: Component,
    args: [{ selector: "app-wallet-analytics", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="analytics-view">
      <!-- \u982D\u90E8 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">\u2190</button>
          <h1>\u6D88\u8CBB\u5206\u6790</h1>
        </div>
        <select class="period-select" [(ngModel)]="selectedPeriod" (change)="onPeriodChange()">
          <option value="7">\u8FD1 7 \u5929</option>
          <option value="30">\u8FD1 30 \u5929</option>
          <option value="90">\u8FD1 90 \u5929</option>
        </select>
      </div>

      <!-- \u7E3D\u89BD\u5361\u7247 -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">\u{1F4B0}</div>
          <div class="card-content">
            <div class="card-label">\u7E3D\u6D88\u8CBB</div>
            <div class="card-value">{{ summary()?.total_display || '$0.00' }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">\u{1F4CA}</div>
          <div class="card-content">
            <div class="card-label">\u4EA4\u6613\u6B21\u6578</div>
            <div class="card-value">{{ summary()?.total_count || 0 }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">\u{1F4C5}</div>
          <div class="card-content">
            <div class="card-label">\u4ECA\u65E5\u6D88\u8CBB</div>
            <div class="card-value">{{ formatAmount(summary()?.today_consumed || 0) }}</div>
          </div>
        </div>
      </div>

      <!-- \u6309\u985E\u5225\u5206\u6790 -->
      <div class="section">
        <h2>\u6309\u985E\u5225\u5206\u6790</h2>
        
        <!-- \u7C21\u6613\u9905\u5716 -->
        <div class="pie-chart-container" *ngIf="categoryData().length > 0">
          <div class="pie-chart">
            <svg viewBox="0 0 100 100">
              <circle 
                *ngFor="let cat of categoryData(); let i = index"
                cx="50" cy="50" r="40"
                fill="transparent"
                [attr.stroke]="cat.color"
                stroke-width="20"
                [attr.stroke-dasharray]="getStrokeDasharray(cat.percent)"
                [attr.stroke-dashoffset]="getStrokeDashoffset(i)"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="pie-center">
              <div class="pie-total">{{ summary()?.total_display }}</div>
              <div class="pie-label">\u7E3D\u6D88\u8CBB</div>
            </div>
          </div>
          
          <!-- \u5716\u4F8B -->
          <div class="pie-legend">
            <div class="legend-item" *ngFor="let cat of categoryData()">
              <span class="legend-dot" [style.background]="cat.color"></span>
              <span class="legend-name">{{ cat.name }}</span>
              <span class="legend-percent">{{ cat.percent.toFixed(1) }}%</span>
              <span class="legend-amount">{{ formatAmount(cat.amount) }}</span>
            </div>
          </div>
        </div>
        
        <div class="empty-chart" *ngIf="categoryData().length === 0 && !loading()">
          <span>\u66AB\u7121\u6D88\u8CBB\u6578\u64DA</span>
        </div>
      </div>

      <!-- \u6D88\u8CBB\u8DA8\u52E2 -->
      <div class="section">
        <h2>\u6D88\u8CBB\u8DA8\u52E2</h2>
        
        <div class="bar-chart" *ngIf="dailyData().length > 0">
          <div class="bar-container">
            <div 
              class="bar-item" 
              *ngFor="let day of dailyData()"
              [title]="day.date + ': ' + formatAmount(day.amount)"
            >
              <div 
                class="bar" 
                [style.height]="getBarHeight(day.amount) + '%'"
              ></div>
              <div class="bar-label">{{ formatDayLabel(day.date) }}</div>
            </div>
          </div>
        </div>
        
        <div class="empty-chart" *ngIf="dailyData().length === 0 && !loading()">
          <span>\u66AB\u7121\u6D88\u8CBB\u8DA8\u52E2\u6578\u64DA</span>
        </div>
      </div>

      <!-- \u985E\u5225\u660E\u7D30 -->
      <div class="section">
        <h2>\u6D88\u8CBB\u660E\u7D30</h2>
        
        <div class="category-list">
          <div class="category-item" *ngFor="let cat of categoryData()">
            <div class="category-header">
              <span class="category-icon">{{ getCategoryIcon(cat.name) }}</span>
              <span class="category-name">{{ cat.name }}</span>
            </div>
            <div class="category-stats">
              <div class="stat">
                <span class="stat-value">{{ formatAmount(cat.amount) }}</span>
                <span class="stat-label">\u6D88\u8CBB\u91D1\u984D</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ cat.count }}</span>
                <span class="stat-label">\u4EA4\u6613\u6B21\u6578</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ formatAmount(cat.count > 0 ? cat.amount / cat.count : 0) }}</span>
                <span class="stat-label">\u5E73\u5747\u55AE\u7B46</span>
              </div>
            </div>
            <div class="category-bar">
              <div class="bar-fill" [style.width]="cat.percent + '%'" [style.background]="cat.color"></div>
            </div>
          </div>
        </div>
        
        <div class="empty-list" *ngIf="categoryData().length === 0 && !loading()">
          <span>\u66AB\u7121\u6D88\u8CBB\u8A18\u9304</span>
        </div>
      </div>

      <!-- \u5C0E\u51FA\u6309\u9215 -->
      <div class="export-section">
        <button class="export-btn" (click)="exportData()">
          \u{1F4E5} \u5C0E\u51FA\u5831\u8868
        </button>
      </div>

      <!-- \u52A0\u8F09\u72C0\u614B -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="spinner"></div>
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;4cd6224f6f9a93d16d726cdb3389982ad26b91ac8d748815ecd1e38a24e1b518;D:/tgkz2026/src/views/wallet-analytics.component.ts */\n.analytics-view {\n  min-height: 100vh;\n  background:\n    linear-gradient(\n      135deg,\n      #1a1a2e 0%,\n      #16213e 50%,\n      #0f3460 100%);\n  padding: 20px;\n  padding-bottom: 100px;\n  color: #fff;\n}\n.view-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.back-btn {\n  width: 40px;\n  height: 40px;\n  border-radius: 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  color: #fff;\n  font-size: 20px;\n  cursor: pointer;\n}\nh1 {\n  font-size: 24px;\n  font-weight: 600;\n  margin: 0;\n}\n.period-select {\n  padding: 10px 16px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 10px;\n  color: #fff;\n  font-size: 14px;\n}\n.period-select option {\n  background: #1a1a2e;\n}\n.summary-cards {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n  margin-bottom: 24px;\n}\n.summary-card {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 16px;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.card-icon {\n  font-size: 28px;\n}\n.card-label {\n  font-size: 12px;\n  opacity: 0.6;\n  margin-bottom: 4px;\n}\n.card-value {\n  font-size: 18px;\n  font-weight: 600;\n}\n.section {\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 16px;\n  padding: 20px;\n  margin-bottom: 20px;\n}\n.section h2 {\n  font-size: 16px;\n  font-weight: 600;\n  margin: 0 0 20px 0;\n}\n.pie-chart-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 24px;\n}\n.pie-chart {\n  position: relative;\n  width: 200px;\n  height: 200px;\n}\n.pie-chart svg {\n  width: 100%;\n  height: 100%;\n}\n.pie-center {\n  position: absolute;\n  inset: 0;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n}\n.pie-total {\n  font-size: 20px;\n  font-weight: 700;\n  color: #667eea;\n}\n.pie-label {\n  font-size: 12px;\n  opacity: 0.6;\n}\n.pie-legend {\n  width: 100%;\n}\n.legend-item {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 0;\n  border-bottom: 1px solid rgba(255, 255, 255, 0.05);\n}\n.legend-dot {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n}\n.legend-name {\n  flex: 1;\n  font-size: 14px;\n}\n.legend-percent {\n  font-size: 13px;\n  opacity: 0.7;\n  width: 50px;\n  text-align: right;\n}\n.legend-amount {\n  font-size: 14px;\n  font-weight: 500;\n  width: 80px;\n  text-align: right;\n}\n.bar-chart {\n  height: 160px;\n  overflow-x: auto;\n}\n.bar-container {\n  display: flex;\n  align-items: flex-end;\n  height: 100%;\n  gap: 8px;\n  min-width: max-content;\n  padding: 0 4px;\n}\n.bar-item {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  width: 32px;\n  height: 100%;\n}\n.bar {\n  width: 100%;\n  background:\n    linear-gradient(\n      180deg,\n      #667eea,\n      #764ba2);\n  border-radius: 4px 4px 0 0;\n  min-height: 4px;\n  transition: height 0.3s;\n}\n.bar-label {\n  font-size: 10px;\n  opacity: 0.5;\n  margin-top: 6px;\n  white-space: nowrap;\n}\n.category-list {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.category-item {\n  background: rgba(255, 255, 255, 0.03);\n  border-radius: 12px;\n  padding: 16px;\n}\n.category-header {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  margin-bottom: 12px;\n}\n.category-icon {\n  font-size: 20px;\n}\n.category-name {\n  font-size: 15px;\n  font-weight: 500;\n}\n.category-stats {\n  display: flex;\n  gap: 24px;\n  margin-bottom: 12px;\n}\n.stat {\n  display: flex;\n  flex-direction: column;\n}\n.stat-value {\n  font-size: 16px;\n  font-weight: 600;\n}\n.stat-label {\n  font-size: 11px;\n  opacity: 0.5;\n}\n.category-bar {\n  height: 6px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 3px;\n  overflow: hidden;\n}\n.bar-fill {\n  height: 100%;\n  border-radius: 3px;\n  transition: width 0.3s;\n}\n.empty-chart,\n.empty-list {\n  text-align: center;\n  padding: 40px 20px;\n  opacity: 0.5;\n}\n.export-section {\n  text-align: center;\n  margin-top: 24px;\n}\n.export-btn {\n  padding: 14px 32px;\n  background: rgba(255, 255, 255, 0.1);\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  border-radius: 12px;\n  color: #fff;\n  font-size: 15px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.export-btn:hover {\n  background: rgba(255, 255, 255, 0.15);\n}\n.loading-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 100;\n}\n.spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.2);\n  border-top-color: #667eea;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n/*# sourceMappingURL=wallet-analytics.component.css.map */\n"] }]
  }], () => [{ type: WalletService }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(WalletAnalyticsComponent, { className: "WalletAnalyticsComponent", filePath: "src/views/wallet-analytics.component.ts", lineNumber: 516 });
})();
export {
  WalletAnalyticsComponent
};
//# sourceMappingURL=chunk-XSVIHDNO.js.map
