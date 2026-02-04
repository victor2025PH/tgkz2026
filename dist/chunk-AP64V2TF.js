import {
  QuotaService
} from "./chunk-MLS6JMSU.js";
import {
  AuthService
} from "./chunk-SW4QBT65.js";
import "./chunk-LRT2RG6V.js";
import {
  Router,
  RouterModule
} from "./chunk-T45T4QAG.js";
import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  CommonModule,
  NgForOf,
  NgIf
} from "./chunk-BTHEVO76.js";
import {
  ChangeDetectionStrategy,
  Component,
  __spreadValues,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/views/quota-dashboard-view.component.ts
var _c0 = () => [];
var _c1 = () => [0, 1, 2, 3, 4];
function QuotaDashboardViewComponent_div_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 33)(1, "div", 34);
    \u0275\u0275text(2, "\u23F0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 35)(4, "span", 36);
    \u0275\u0275text(5, "\u6BCF\u65E5\u914D\u984D\u91CD\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 37);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r0.nextResetTime());
  }
}
function QuotaDashboardViewComponent_div_17_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "span", 52);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 53);
    \u0275\u0275text(4, "/");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 54);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const quota_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatNumber(quota_r2.used));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.formatNumber(quota_r2.limit));
  }
}
function QuotaDashboardViewComponent_div_17_div_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 55)(1, "span", 56);
    \u0275\u0275text(2, "\u221E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 57);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const quota_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u5DF2\u4F7F\u7528 ", ctx_r0.formatNumber(quota_r2.used));
  }
}
function QuotaDashboardViewComponent_div_17_div_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 58)(1, "div", 59);
    \u0275\u0275element(2, "div", 60);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 61);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const quota_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", quota_r2.percentage, "%")("background", ctx_r0.getProgressGradient(quota_r2.status));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", quota_r2.percentage.toFixed(1), "%");
  }
}
function QuotaDashboardViewComponent_div_17_span_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 62);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const quota_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u5269\u9918: ", ctx_r0.formatNumber(quota_r2.remaining), " ");
  }
}
function QuotaDashboardViewComponent_div_17_span_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 63);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const quota_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.formatResetTime(quota_r2.resetAt), " \u91CD\u7F6E ");
  }
}
function QuotaDashboardViewComponent_div_17_div_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 64);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(1, "svg", 65);
    \u0275\u0275element(2, "polyline", 66);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const trend_r3 = ctx.ngIf;
    \u0275\u0275advance(2);
    \u0275\u0275attribute("points", trend_r3);
  }
}
function QuotaDashboardViewComponent_div_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38)(1, "div", 39)(2, "div", 40);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 41)(5, "h3");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 42);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 43);
    \u0275\u0275template(10, QuotaDashboardViewComponent_div_17_div_10_Template, 7, 2, "div", 44)(11, QuotaDashboardViewComponent_div_17_div_11_Template, 5, 1, "div", 45)(12, QuotaDashboardViewComponent_div_17_div_12_Template, 5, 5, "div", 46);
    \u0275\u0275elementStart(13, "div", 47);
    \u0275\u0275template(14, QuotaDashboardViewComponent_div_17_span_14_Template, 2, 1, "span", 48)(15, QuotaDashboardViewComponent_div_17_span_15_Template, 2, 1, "span", 49);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(16, QuotaDashboardViewComponent_div_17_div_16_Template, 3, 1, "div", 50);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const quota_r2 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("warning", quota_r2.status === "warning" || quota_r2.status === "critical")("exceeded", quota_r2.status === "exceeded")("unlimited", quota_r2.unlimited);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.getQuotaIcon(quota_r2.type));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.quotaService.getQuotaDisplayName(quota_r2.type));
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.getStatusColor(quota_r2.status));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStatusText(quota_r2.status), " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", !quota_r2.unlimited);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", quota_r2.unlimited);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !quota_r2.unlimited);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngIf", !quota_r2.unlimited);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", quota_r2.resetAt);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", ctx_r0.getTrendData(quota_r2.type));
  }
}
function QuotaDashboardViewComponent_button_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 67);
    \u0275\u0275listener("click", function QuotaDashboardViewComponent_button_23_Template_button_click_0_listener() {
      const period_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.selectedPeriod.set(period_r5.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const period_r5 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r0.selectedPeriod() === period_r5.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", period_r5.label, " ");
  }
}
function QuotaDashboardViewComponent_div_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 68);
    \u0275\u0275element(1, "span", 69);
    \u0275\u0275elementStart(2, "span", 70);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const dataset_r6 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("background", dataset_r6.color);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(dataset_r6.name);
  }
}
function QuotaDashboardViewComponent__svg_line_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275element(0, "line", 71);
  }
  if (rf & 2) {
    const i_r7 = ctx.$implicit;
    \u0275\u0275attribute("y1", i_r7 * 37.5)("y2", i_r7 * 37.5);
  }
}
function QuotaDashboardViewComponent__svg_g_31__svg_circle_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275element(0, "circle", 74);
  }
  if (rf & 2) {
    const point_r8 = ctx.$implicit;
    const i_r9 = ctx.index;
    const dataset_r10 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275attribute("cx", i_r9 / (dataset_r10.data.length - 1 || 1) * 400)("cy", 150 - point_r8 / ctx_r0.maxTrendValue() * 150)("fill", dataset_r10.color);
  }
}
function QuotaDashboardViewComponent__svg_g_31_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "g");
    \u0275\u0275element(1, "polyline", 72);
    \u0275\u0275template(2, QuotaDashboardViewComponent__svg_g_31__svg_circle_2_Template, 1, 3, "circle", 73);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const dataset_r10 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275attribute("points", ctx_r0.generateChartPoints(dataset_r10.data))("stroke", dataset_r10.color);
    \u0275\u0275advance();
    \u0275\u0275property("ngForOf", dataset_r10.data);
  }
}
function QuotaDashboardViewComponent_span_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const label_r11 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(label_r11);
  }
}
function QuotaDashboardViewComponent_div_53_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 75)(1, "span", 76);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 77)(4, "span", 78);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 52);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 54);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 61);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r12 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r12.date);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.getQuotaIcon(item_r12.quota_type));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.quotaService.getQuotaDisplayName(item_r12.quota_type), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatNumber(item_r12.used));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatNumber(item_r12.limit));
    \u0275\u0275advance();
    \u0275\u0275classProp("warning", ctx_r0.getHistoryPercentage(item_r12) > 80);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getHistoryPercentage(item_r12).toFixed(1), "% ");
  }
}
function QuotaDashboardViewComponent_div_54_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 79);
    \u0275\u0275text(1, " \u66AB\u7121\u6B77\u53F2\u8A18\u9304 ");
    \u0275\u0275elementEnd();
  }
}
function QuotaDashboardViewComponent_section_55_div_7_button_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 90);
    \u0275\u0275listener("click", function QuotaDashboardViewComponent_section_55_div_7_button_8_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const alert_r15 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.acknowledgeAlert(alert_r15.id));
    });
    \u0275\u0275text(1, " \u78BA\u8A8D ");
    \u0275\u0275elementEnd();
  }
}
function QuotaDashboardViewComponent_section_55_div_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 84)(1, "div", 85);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 86)(4, "span", 87);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 88);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(8, QuotaDashboardViewComponent_section_55_div_7_button_8_Template, 2, 0, "button", 89);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const alert_r15 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("acknowledged", alert_r15.acknowledged);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.quotaService.getQuotaDisplayName(alert_r15.quota_type));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(alert_r15.message);
    \u0275\u0275advance();
    \u0275\u0275property("ngIf", !alert_r15.acknowledged);
  }
}
function QuotaDashboardViewComponent_section_55_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 80)(1, "div", 12)(2, "h2");
    \u0275\u0275text(3, "\u914D\u984D\u544A\u8B66");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 81);
    \u0275\u0275listener("click", function QuotaDashboardViewComponent_section_55_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.clearAlerts());
    });
    \u0275\u0275text(5, "\u5168\u90E8\u78BA\u8A8D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 82);
    \u0275\u0275template(7, QuotaDashboardViewComponent_section_55_div_7_Template, 9, 5, "div", 83);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275property("ngForOf", ctx_r0.quotaService.alerts());
  }
}
function QuotaDashboardViewComponent_section_56_span_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 99);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const feature_r17 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u2713 ", feature_r17, " ");
  }
}
function QuotaDashboardViewComponent_section_56_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 91)(1, "div", 92)(2, "div", 93);
    \u0275\u0275text(3, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 94)(5, "h3");
    \u0275\u0275text(6, "\u89E3\u9396\u66F4\u591A\u914D\u984D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p");
    \u0275\u0275text(8, "\u5347\u7D1A\u5230\u66F4\u9AD8\u7B49\u7D1A\uFF0C\u7372\u5F97\u66F4\u591A\u8CC7\u6E90\u914D\u984D\u548C\u9AD8\u7D1A\u529F\u80FD");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 95);
    \u0275\u0275template(10, QuotaDashboardViewComponent_section_56_span_10_Template, 2, 1, "span", 96);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "button", 97);
    \u0275\u0275listener("click", function QuotaDashboardViewComponent_section_56_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToUpgrade());
    });
    \u0275\u0275text(12, " \u67E5\u770B\u5347\u7D1A\u65B9\u6848 ");
    \u0275\u0275elementStart(13, "span", 98);
    \u0275\u0275text(14, "\u2192");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275property("ngForOf", ctx_r0.upgradeFeatures);
  }
}
var QuotaDashboardViewComponent = class _QuotaDashboardViewComponent {
  constructor() {
    this.quotaService = inject(QuotaService);
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.ipc = inject(ElectronIpcService);
    this.selectedPeriod = signal("7d", ...ngDevMode ? [{ debugName: "selectedPeriod" }] : []);
    this.showAllHistory = false;
    this._trendData = signal(null, ...ngDevMode ? [{ debugName: "_trendData" }] : []);
    this.trendData = this._trendData.asReadonly();
    this._history = signal([], ...ngDevMode ? [{ debugName: "_history" }] : []);
    this._nextResetTime = signal(null, ...ngDevMode ? [{ debugName: "_nextResetTime" }] : []);
    this.nextResetTime = this._nextResetTime.asReadonly();
    this.periods = [
      { value: "7d", label: "7\u5929" },
      { value: "30d", label: "30\u5929" },
      { value: "90d", label: "90\u5929" }
    ];
    this.upgradeFeatures = [
      "\u66F4\u591A TG \u5E33\u865F",
      "\u66F4\u9AD8\u6D88\u606F\u914D\u984D",
      "\u7121\u9650 AI \u8ABF\u7528",
      "\u9AD8\u7D1A\u529F\u80FD"
    ];
    this.quotaIcons = {
      daily_messages: "\u{1F4AC}",
      ai_calls: "\u{1F916}",
      tg_accounts: "\u{1F4F1}",
      groups: "\u{1F465}",
      devices: "\u{1F4BB}",
      keyword_sets: "\u{1F511}",
      auto_reply_rules: "\u{1F504}",
      scheduled_tasks: "\u23F0"
    };
    this.tierConfig = {
      bronze: { icon: "\u{1F949}", gradient: "linear-gradient(135deg, #CD7F32, #8B4513)", name: "\u9752\u9285\u6230\u58EB" },
      silver: { icon: "\u{1F948}", gradient: "linear-gradient(135deg, #C0C0C0, #808080)", name: "\u767D\u9280\u885B\u58EB" },
      gold: { icon: "\u{1F947}", gradient: "linear-gradient(135deg, #FFD700, #FFA500)", name: "\u9EC3\u91D1\u7375\u624B" },
      diamond: { icon: "\u{1F48E}", gradient: "linear-gradient(135deg, #00CED1, #4169E1)", name: "\u947D\u77F3\u738B\u8005" },
      star: { icon: "\u2B50", gradient: "linear-gradient(135deg, #9B59B6, #8E44AD)", name: "\u661F\u8000\u50B3\u5947" },
      king: { icon: "\u{1F451}", gradient: "linear-gradient(135deg, #FF6B6B, #EE5A24)", name: "\u738B\u8005\u81F3\u5C0A" }
    };
    this.tierIcon = computed(() => {
      const tier = this.authService.subscriptionTier() || "bronze";
      return this.tierConfig[tier]?.icon || "\u{1F949}";
    }, ...ngDevMode ? [{ debugName: "tierIcon" }] : []);
    this.tierGradient = computed(() => {
      const tier = this.authService.subscriptionTier() || "bronze";
      return this.tierConfig[tier]?.gradient || this.tierConfig.bronze.gradient;
    }, ...ngDevMode ? [{ debugName: "tierGradient" }] : []);
    this.tierName = computed(() => {
      const tier = this.authService.subscriptionTier() || "bronze";
      return this.tierConfig[tier]?.name || "\u9752\u9285\u6230\u58EB";
    }, ...ngDevMode ? [{ debugName: "tierName" }] : []);
    this.displayQuotas = computed(() => {
      const summary = this.quotaService.quotaSummary();
      if (!summary?.quotas)
        return [];
      return Object.entries(summary.quotas).map(([type, info]) => __spreadValues({
        type
      }, info));
    }, ...ngDevMode ? [{ debugName: "displayQuotas" }] : []);
    this.displayHistory = computed(() => {
      const history = this._history();
      return this.showAllHistory ? history : history.slice(0, 5);
    }, ...ngDevMode ? [{ debugName: "displayHistory" }] : []);
    this.maxTrendValue = computed(() => {
      const trend = this._trendData();
      if (!trend)
        return 100;
      let max = 0;
      trend.datasets.forEach((ds) => {
        ds.data.forEach((v) => {
          if (v > max)
            max = v;
        });
      });
      return max || 100;
    }, ...ngDevMode ? [{ debugName: "maxTrendValue" }] : []);
  }
  ngOnInit() {
    this.loadData();
    this.startRefreshInterval();
    this.startCountdown();
  }
  ngOnDestroy() {
    if (this.refreshInterval)
      clearInterval(this.refreshInterval);
    if (this.countdownInterval)
      clearInterval(this.countdownInterval);
  }
  async loadData() {
    await Promise.all([
      this.quotaService.loadQuotaSummary(),
      this.quotaService.loadAlerts(),
      this.quotaService.loadMembershipLevels(),
      this.loadTrendData(),
      this.loadHistory()
    ]);
  }
  startRefreshInterval() {
    this.refreshInterval = setInterval(() => {
      this.quotaService.loadQuotaSummary();
    }, 6e4);
  }
  startCountdown() {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1e3);
  }
  updateCountdown() {
    const now = /* @__PURE__ */ new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1e3 * 60 * 60));
    const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
    const seconds = Math.floor(diff % (1e3 * 60) / 1e3);
    this._nextResetTime.set(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
  }
  async loadTrendData() {
    const days = this.selectedPeriod() === "7d" ? 7 : this.selectedPeriod() === "30d" ? 30 : 90;
    const labels = [];
    const messagesData = [];
    const aiData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
      messagesData.push(Math.floor(Math.random() * 100) + 20);
      aiData.push(Math.floor(Math.random() * 50) + 5);
    }
    this._trendData.set({
      labels,
      datasets: [
        { name: "\u6BCF\u65E5\u6D88\u606F", data: messagesData, color: "#3b82f6" },
        { name: "AI \u8ABF\u7528", data: aiData, color: "#8b5cf6" }
      ]
    });
  }
  async loadHistory() {
    const history = [];
    for (let i = 0; i < 10; i++) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      history.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        quota_type: i % 2 === 0 ? "daily_messages" : "ai_calls",
        used: Math.floor(Math.random() * 80) + 20,
        limit: 100
      });
    }
    this._history.set(history);
  }
  // 輔助方法
  getQuotaIcon(type) {
    return this.quotaIcons[type] || "\u{1F4CA}";
  }
  getStatusColor(status) {
    const colors = {
      ok: "#22c55e",
      warning: "#f59e0b",
      critical: "#ef4444",
      exceeded: "#dc2626",
      unlimited: "#8b5cf6"
    };
    return colors[status] || "#888";
  }
  getStatusText(status) {
    const texts = {
      ok: "\u6B63\u5E38",
      warning: "\u5373\u5C07\u9054\u9650",
      critical: "\u63A5\u8FD1\u4E0A\u9650",
      exceeded: "\u5DF2\u8D85\u9650",
      unlimited: "\u7121\u9650\u5236"
    };
    return texts[status] || "";
  }
  getProgressGradient(status) {
    if (status === "exceeded")
      return "#ef4444";
    if (status === "critical" || status === "warning")
      return "linear-gradient(90deg, #f59e0b, #ef4444)";
    return "linear-gradient(90deg, #3b82f6, #8b5cf6)";
  }
  formatNumber(num) {
    if (num === -1)
      return "\u221E";
    if (num >= 1e6)
      return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3)
      return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }
  formatResetTime(isoTime) {
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }
  getTrendData(quotaType) {
    const points = [];
    for (let i = 0; i < 7; i++) {
      const x = i / 6 * 100;
      const y = 30 - Math.random() * 25;
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  }
  generateChartPoints(data) {
    if (!data || data.length === 0)
      return "";
    const max = this.maxTrendValue();
    const points = [];
    data.forEach((value, i) => {
      const x = i / (data.length - 1 || 1) * 400;
      const y = 150 - value / max * 150;
      points.push(`${x},${y}`);
    });
    return points.join(" ");
  }
  getHistoryPercentage(item) {
    if (item.limit === 0)
      return 0;
    return item.used / item.limit * 100;
  }
  showUpgradeHint() {
    const tier = this.authService.subscriptionTier();
    return tier !== "king" && tier !== "star" && tier !== "diamond";
  }
  async acknowledgeAlert(alertId) {
    await this.quotaService.acknowledgeAlert(alertId);
  }
  async clearAlerts() {
    const alerts = this.quotaService.alerts();
    for (const alert of alerts) {
      if (!alert.acknowledged) {
        await this.quotaService.acknowledgeAlert(alert.id);
      }
    }
  }
  goToUpgrade() {
    this.router.navigate(["/upgrade"]);
  }
  static {
    this.\u0275fac = function QuotaDashboardViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QuotaDashboardViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _QuotaDashboardViewComponent, selectors: [["app-quota-dashboard-view"]], decls: 57, vars: 22, consts: [[1, "quota-dashboard"], [1, "page-header"], [1, "header-left"], [1, "header-right"], [1, "tier-badge"], [1, "tier-icon"], [1, "tier-name"], [1, "upgrade-btn", 3, "click"], ["class", "reset-countdown", 4, "ngIf"], [1, "quota-grid"], ["class", "quota-card", 3, "warning", "exceeded", "unlimited", 4, "ngFor", "ngForOf"], [1, "trend-section"], [1, "section-header"], [1, "period-selector"], [3, "active", "click", 4, "ngFor", "ngForOf"], [1, "chart-container"], [1, "chart-legend"], ["class", "legend-item", 4, "ngFor", "ngForOf"], [1, "chart-area"], ["viewBox", "0 0 400 150", "preserveAspectRatio", "none", 1, "trend-chart"], [1, "grid"], ["x1", "0", "x2", "400", 4, "ngFor", "ngForOf"], [4, "ngFor", "ngForOf"], [1, "chart-labels"], [1, "history-section"], [1, "view-all-btn", 3, "click"], [1, "history-table"], [1, "table-header"], [1, "table-body"], ["class", "table-row", 4, "ngFor", "ngForOf"], ["class", "empty-history", 4, "ngIf"], ["class", "alerts-section", 4, "ngIf"], ["class", "upgrade-section", 4, "ngIf"], [1, "reset-countdown"], [1, "countdown-icon"], [1, "countdown-info"], [1, "countdown-label"], [1, "countdown-time"], [1, "quota-card"], [1, "card-header"], [1, "quota-icon"], [1, "quota-info"], [1, "quota-status"], [1, "card-body"], ["class", "quota-value", 4, "ngIf"], ["class", "quota-value unlimited", 4, "ngIf"], ["class", "progress-container", 4, "ngIf"], [1, "quota-details"], ["class", "remaining", 4, "ngIf"], ["class", "reset-hint", 4, "ngIf"], ["class", "mini-trend", 4, "ngIf"], [1, "quota-value"], [1, "used"], [1, "separator"], [1, "limit"], [1, "quota-value", "unlimited"], [1, "infinity"], [1, "used-text"], [1, "progress-container"], [1, "progress-bar"], [1, "progress-fill"], [1, "percentage"], [1, "remaining"], [1, "reset-hint"], [1, "mini-trend"], ["viewBox", "0 0 100 30", "preserveAspectRatio", "none"], ["fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linejoin", "round"], [3, "click"], [1, "legend-item"], [1, "legend-color"], [1, "legend-label"], ["x1", "0", "x2", "400"], ["fill", "none", "stroke-width", "2", "stroke-linejoin", "round"], ["r", "4", "class", "data-point", 4, "ngFor", "ngForOf"], ["r", "4", 1, "data-point"], [1, "table-row"], [1, "date"], [1, "type"], [1, "type-icon"], [1, "empty-history"], [1, "alerts-section"], [1, "clear-btn", 3, "click"], [1, "alerts-list"], ["class", "alert-item", 3, "acknowledged", 4, "ngFor", "ngForOf"], [1, "alert-item"], [1, "alert-icon"], [1, "alert-content"], [1, "alert-type"], [1, "alert-message"], ["class", "ack-btn", 3, "click", 4, "ngIf"], [1, "ack-btn", 3, "click"], [1, "upgrade-section"], [1, "upgrade-content"], [1, "upgrade-icon"], [1, "upgrade-text"], [1, "upgrade-features"], ["class", "feature", 4, "ngFor", "ngForOf"], [1, "upgrade-cta", 3, "click"], [1, "arrow"], [1, "feature"]], template: function QuotaDashboardViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "h1");
        \u0275\u0275text(4, "\u914D\u984D\u7BA1\u7406");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "p");
        \u0275\u0275text(6, "\u67E5\u770B\u548C\u7BA1\u7406\u60A8\u7684\u8CC7\u6E90\u914D\u984D");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "div", 3)(8, "div", 4)(9, "span", 5);
        \u0275\u0275text(10);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "span", 6);
        \u0275\u0275text(12);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(13, "button", 7);
        \u0275\u0275listener("click", function QuotaDashboardViewComponent_Template_button_click_13_listener() {
          return ctx.goToUpgrade();
        });
        \u0275\u0275text(14, " \u5347\u7D1A\u65B9\u6848 ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275template(15, QuotaDashboardViewComponent_div_15_Template, 8, 1, "div", 8);
        \u0275\u0275elementStart(16, "div", 9);
        \u0275\u0275template(17, QuotaDashboardViewComponent_div_17_Template, 17, 17, "div", 10);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "section", 11)(19, "div", 12)(20, "h2");
        \u0275\u0275text(21, "\u4F7F\u7528\u8DA8\u52E2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "div", 13);
        \u0275\u0275template(23, QuotaDashboardViewComponent_button_23_Template, 2, 3, "button", 14);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "div", 15)(25, "div", 16);
        \u0275\u0275template(26, QuotaDashboardViewComponent_div_26_Template, 4, 3, "div", 17);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "div", 18);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(28, "svg", 19)(29, "g", 20);
        \u0275\u0275template(30, QuotaDashboardViewComponent__svg_line_30_Template, 1, 2, "line", 21);
        \u0275\u0275elementEnd();
        \u0275\u0275template(31, QuotaDashboardViewComponent__svg_g_31_Template, 3, 3, "g", 22);
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(32, "div", 23);
        \u0275\u0275template(33, QuotaDashboardViewComponent_span_33_Template, 2, 1, "span", 22);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(34, "section", 24)(35, "div", 12)(36, "h2");
        \u0275\u0275text(37, "\u4F7F\u7528\u6B77\u53F2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "button", 25);
        \u0275\u0275listener("click", function QuotaDashboardViewComponent_Template_button_click_38_listener() {
          return ctx.showAllHistory = !ctx.showAllHistory;
        });
        \u0275\u0275text(39);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(40, "div", 26)(41, "div", 27)(42, "span");
        \u0275\u0275text(43, "\u65E5\u671F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(44, "span");
        \u0275\u0275text(45, "\u985E\u578B");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(46, "span");
        \u0275\u0275text(47, "\u4F7F\u7528\u91CF");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "span");
        \u0275\u0275text(49, "\u914D\u984D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(50, "span");
        \u0275\u0275text(51, "\u4F7F\u7528\u7387");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(52, "div", 28);
        \u0275\u0275template(53, QuotaDashboardViewComponent_div_53_Template, 13, 8, "div", 29)(54, QuotaDashboardViewComponent_div_54_Template, 2, 0, "div", 30);
        \u0275\u0275elementEnd()()();
        \u0275\u0275template(55, QuotaDashboardViewComponent_section_55_Template, 8, 1, "section", 31)(56, QuotaDashboardViewComponent_section_56_Template, 15, 1, "section", 32);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_6_0;
        let tmp_8_0;
        let tmp_9_0;
        \u0275\u0275advance(8);
        \u0275\u0275styleProp("background", ctx.tierGradient());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.tierIcon());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.tierName());
        \u0275\u0275advance(3);
        \u0275\u0275property("ngIf", ctx.nextResetTime());
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.displayQuotas());
        \u0275\u0275advance(6);
        \u0275\u0275property("ngForOf", ctx.periods);
        \u0275\u0275advance(3);
        \u0275\u0275property("ngForOf", ((tmp_6_0 = ctx.trendData()) == null ? null : tmp_6_0.datasets) || \u0275\u0275pureFunction0(16, _c0));
        \u0275\u0275advance(4);
        \u0275\u0275property("ngForOf", \u0275\u0275pureFunction0(17, _c1));
        \u0275\u0275advance();
        \u0275\u0275property("ngForOf", ((tmp_8_0 = ctx.trendData()) == null ? null : tmp_8_0.datasets) || \u0275\u0275pureFunction0(18, _c0));
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ((tmp_9_0 = ctx.trendData()) == null ? null : tmp_9_0.labels) || \u0275\u0275pureFunction0(19, _c0));
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate1(" ", ctx.showAllHistory ? "\u6536\u8D77" : "\u67E5\u770B\u5168\u90E8", " ");
        \u0275\u0275advance(14);
        \u0275\u0275property("ngForOf", ctx.displayHistory());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", (ctx.displayHistory() || \u0275\u0275pureFunction0(20, _c0)).length === 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", (ctx.quotaService.alerts() || \u0275\u0275pureFunction0(21, _c0)).length > 0);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showUpgradeHint());
      }
    }, dependencies: [CommonModule, NgForOf, NgIf, RouterModule], styles: ["\n\n.quota-dashboard[_ngcontent-%COMP%] {\n  padding: 24px;\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 700;\n  margin: 0 0 4px;\n}\n.header-left[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n}\n.header-right[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.tier-badge[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 16px;\n  border-radius: 20px;\n  color: white;\n  font-weight: 600;\n}\n.tier-icon[_ngcontent-%COMP%] {\n  font-size: 18px;\n}\n.upgrade-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  background:\n    linear-gradient(\n      135deg,\n      #8b5cf6,\n      #6366f1);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.upgrade-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);\n}\n.reset-countdown[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 20px;\n  background: rgba(59, 130, 246, 0.1);\n  border: 1px solid rgba(59, 130, 246, 0.2);\n  border-radius: 12px;\n  margin-bottom: 24px;\n}\n.countdown-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.countdown-label[_ngcontent-%COMP%] {\n  display: block;\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.countdown-time[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.quota-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 20px;\n  margin-bottom: 32px;\n}\n.quota-card[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 20px;\n  transition: all 0.3s;\n  position: relative;\n  overflow: hidden;\n}\n.quota-card[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);\n}\n.quota-card.warning[_ngcontent-%COMP%] {\n  border-color: rgba(245, 158, 11, 0.5);\n}\n.quota-card.exceeded[_ngcontent-%COMP%] {\n  border-color: rgba(239, 68, 68, 0.5);\n  background: rgba(239, 68, 68, 0.05);\n}\n.quota-card.unlimited[_ngcontent-%COMP%] {\n  border-color: rgba(139, 92, 246, 0.3);\n}\n.card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.quota-icon[_ngcontent-%COMP%] {\n  font-size: 32px;\n}\n.quota-info[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 600;\n}\n.quota-status[_ngcontent-%COMP%] {\n  font-size: 12px;\n}\n.card-body[_ngcontent-%COMP%]   .quota-value[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 12px;\n}\n.quota-value[_ngcontent-%COMP%]   .used[_ngcontent-%COMP%] {\n  font-size: 32px;\n  font-weight: 700;\n}\n.quota-value[_ngcontent-%COMP%]   .separator[_ngcontent-%COMP%] {\n  font-size: 18px;\n  color: var(--text-secondary, #888);\n}\n.quota-value[_ngcontent-%COMP%]   .limit[_ngcontent-%COMP%] {\n  font-size: 18px;\n  color: var(--text-secondary, #888);\n}\n.quota-value.unlimited[_ngcontent-%COMP%] {\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 4px;\n}\n.infinity[_ngcontent-%COMP%] {\n  font-size: 36px;\n  color: #8b5cf6;\n}\n.used-text[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.progress-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.progress-bar[_ngcontent-%COMP%] {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-fill[_ngcontent-%COMP%] {\n  height: 100%;\n  border-radius: 4px;\n  transition: width 0.3s;\n}\n.percentage[_ngcontent-%COMP%] {\n  font-size: 14px;\n  font-weight: 600;\n  min-width: 50px;\n  text-align: right;\n}\n.quota-details[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.mini-trend[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  height: 40px;\n  opacity: 0.3;\n  color: var(--primary, #3b82f6);\n}\n.mini-trend[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n}\n.trend-section[_ngcontent-%COMP%], \n.history-section[_ngcontent-%COMP%], \n.alerts-section[_ngcontent-%COMP%] {\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 16px;\n  padding: 24px;\n  margin-bottom: 24px;\n}\n.section-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.section-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  margin: 0;\n}\n.period-selector[_ngcontent-%COMP%] {\n  display: flex;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 8px;\n  padding: 4px;\n}\n.period-selector[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.period-selector[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.chart-container[_ngcontent-%COMP%] {\n  position: relative;\n}\n.chart-legend[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 20px;\n  margin-bottom: 16px;\n}\n.legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n}\n.legend-color[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  border-radius: 3px;\n}\n.chart-area[_ngcontent-%COMP%] {\n  position: relative;\n}\n.trend-chart[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 150px;\n}\n.trend-chart[_ngcontent-%COMP%]   .grid[_ngcontent-%COMP%]   line[_ngcontent-%COMP%] {\n  stroke: rgba(255, 255, 255, 0.1);\n  stroke-width: 1;\n}\n.data-point[_ngcontent-%COMP%] {\n  opacity: 0;\n  transition: opacity 0.2s;\n}\n.trend-chart[_ngcontent-%COMP%]:hover   .data-point[_ngcontent-%COMP%] {\n  opacity: 1;\n}\n.chart-labels[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-top: 8px;\n  font-size: 11px;\n  color: var(--text-muted, #666);\n}\n.view-all-btn[_ngcontent-%COMP%], \n.clear-btn[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n}\n.history-table[_ngcontent-%COMP%] {\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.table-header[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 100px 1fr 80px 80px 80px;\n  padding: 12px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--text-secondary, #888);\n}\n.table-row[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 100px 1fr 80px 80px 80px;\n  padding: 12px 16px;\n  border-top: 1px solid var(--border-color, #333);\n  font-size: 13px;\n  transition: background 0.2s;\n}\n.table-row[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n}\n.table-row[_ngcontent-%COMP%]   .type[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.table-row[_ngcontent-%COMP%]   .percentage.warning[_ngcontent-%COMP%] {\n  color: #f59e0b;\n}\n.empty-history[_ngcontent-%COMP%] {\n  padding: 32px;\n  text-align: center;\n  color: var(--text-secondary, #888);\n}\n.alerts-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.alert-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(245, 158, 11, 0.1);\n  border-radius: 12px;\n  transition: opacity 0.2s;\n}\n.alert-item.acknowledged[_ngcontent-%COMP%] {\n  opacity: 0.5;\n}\n.alert-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.alert-content[_ngcontent-%COMP%] {\n  flex: 1;\n}\n.alert-type[_ngcontent-%COMP%] {\n  display: block;\n  font-weight: 600;\n  font-size: 14px;\n}\n.alert-message[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.ack-btn[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 6px;\n  color: white;\n  font-size: 12px;\n  cursor: pointer;\n}\n.upgrade-section[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(139, 92, 246, 0.1),\n      rgba(59, 130, 246, 0.1));\n  border: 1px solid rgba(139, 92, 246, 0.3);\n  border-radius: 16px;\n  padding: 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.upgrade-content[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 20px;\n}\n.upgrade-icon[_ngcontent-%COMP%] {\n  font-size: 48px;\n}\n.upgrade-text[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 4px;\n  font-size: 18px;\n}\n.upgrade-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.upgrade-features[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n.upgrade-features[_ngcontent-%COMP%]   .feature[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #22c55e;\n}\n.upgrade-cta[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 28px;\n  background:\n    linear-gradient(\n      135deg,\n      #8b5cf6,\n      #6366f1);\n  border: none;\n  border-radius: 12px;\n  color: white;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.upgrade-cta[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);\n}\n.upgrade-cta[_ngcontent-%COMP%]   .arrow[_ngcontent-%COMP%] {\n  transition: transform 0.2s;\n}\n.upgrade-cta[_ngcontent-%COMP%]:hover   .arrow[_ngcontent-%COMP%] {\n  transform: translateX(4px);\n}\n@media (max-width: 768px) {\n  .page-header[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 16px;\n  }\n  .quota-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .table-header[_ngcontent-%COMP%], \n   .table-row[_ngcontent-%COMP%] {\n    grid-template-columns: 80px 1fr 60px 60px 60px;\n    font-size: 12px;\n  }\n  .upgrade-section[_ngcontent-%COMP%] {\n    flex-direction: column;\n    text-align: center;\n    gap: 20px;\n  }\n  .upgrade-content[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n}\n/*# sourceMappingURL=quota-dashboard-view.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuotaDashboardViewComponent, [{
    type: Component,
    args: [{ selector: "app-quota-dashboard-view", standalone: true, imports: [CommonModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="quota-dashboard">
      <!-- \u9801\u9762\u982D\u90E8 -->
      <header class="page-header">
        <div class="header-left">
          <h1>\u914D\u984D\u7BA1\u7406</h1>
          <p>\u67E5\u770B\u548C\u7BA1\u7406\u60A8\u7684\u8CC7\u6E90\u914D\u984D</p>
        </div>
        <div class="header-right">
          <div class="tier-badge" [style.background]="tierGradient()">
            <span class="tier-icon">{{ tierIcon() }}</span>
            <span class="tier-name">{{ tierName() }}</span>
          </div>
          <button class="upgrade-btn" (click)="goToUpgrade()">
            \u5347\u7D1A\u65B9\u6848
          </button>
        </div>
      </header>
      
      <!-- \u91CD\u7F6E\u5012\u8A08\u6642 -->
      <div class="reset-countdown" *ngIf="nextResetTime()">
        <div class="countdown-icon">\u23F0</div>
        <div class="countdown-info">
          <span class="countdown-label">\u6BCF\u65E5\u914D\u984D\u91CD\u7F6E</span>
          <span class="countdown-time">{{ nextResetTime() }}</span>
        </div>
      </div>
      
      <!-- \u914D\u984D\u5361\u7247\u7DB2\u683C -->
      <div class="quota-grid">
        <div class="quota-card" *ngFor="let quota of displayQuotas()"
             [class.warning]="quota.status === 'warning' || quota.status === 'critical'"
             [class.exceeded]="quota.status === 'exceeded'"
             [class.unlimited]="quota.unlimited">
          <div class="card-header">
            <div class="quota-icon">{{ getQuotaIcon(quota.type) }}</div>
            <div class="quota-info">
              <h3>{{ quotaService.getQuotaDisplayName(quota.type) }}</h3>
              <span class="quota-status" [style.color]="getStatusColor(quota.status)">
                {{ getStatusText(quota.status) }}
              </span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="quota-value" *ngIf="!quota.unlimited">
              <span class="used">{{ formatNumber(quota.used) }}</span>
              <span class="separator">/</span>
              <span class="limit">{{ formatNumber(quota.limit) }}</span>
            </div>
            <div class="quota-value unlimited" *ngIf="quota.unlimited">
              <span class="infinity">\u221E</span>
              <span class="used-text">\u5DF2\u4F7F\u7528 {{ formatNumber(quota.used) }}</span>
            </div>
            
            <div class="progress-container" *ngIf="!quota.unlimited">
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="quota.percentage"
                     [style.background]="getProgressGradient(quota.status)">
                </div>
              </div>
              <span class="percentage">{{ quota.percentage.toFixed(1) }}%</span>
            </div>
            
            <div class="quota-details">
              <span class="remaining" *ngIf="!quota.unlimited">
                \u5269\u9918: {{ formatNumber(quota.remaining) }}
              </span>
              <span class="reset-hint" *ngIf="quota.resetAt">
                {{ formatResetTime(quota.resetAt) }} \u91CD\u7F6E
              </span>
            </div>
          </div>
          
          <!-- Mini \u8DA8\u52E2\u5716 -->
          <div class="mini-trend" *ngIf="getTrendData(quota.type) as trend">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline
                [attr.points]="trend"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- \u4F7F\u7528\u8DA8\u52E2\u5716\u8868 -->
      <section class="trend-section">
        <div class="section-header">
          <h2>\u4F7F\u7528\u8DA8\u52E2</h2>
          <div class="period-selector">
            <button 
              *ngFor="let period of periods" 
              [class.active]="selectedPeriod() === period.value"
              (click)="selectedPeriod.set(period.value)">
              {{ period.label }}
            </button>
          </div>
        </div>
        
        <div class="chart-container">
          <div class="chart-legend">
            <div class="legend-item" *ngFor="let dataset of trendData()?.datasets || []">
              <span class="legend-color" [style.background]="dataset.color"></span>
              <span class="legend-label">{{ dataset.name }}</span>
            </div>
          </div>
          
          <div class="chart-area">
            <svg viewBox="0 0 400 150" preserveAspectRatio="none" class="trend-chart">
              <!-- \u80CC\u666F\u7DB2\u683C -->
              <g class="grid">
                <line *ngFor="let i of [0,1,2,3,4]" 
                      [attr.y1]="i * 37.5" [attr.y2]="i * 37.5"
                      x1="0" x2="400" />
              </g>
              
              <!-- \u8DA8\u52E2\u7DDA -->
              <g *ngFor="let dataset of trendData()?.datasets || []; let idx = index">
                <polyline
                  [attr.points]="generateChartPoints(dataset.data)"
                  fill="none"
                  [attr.stroke]="dataset.color"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <!-- \u6578\u64DA\u9EDE -->
                <circle *ngFor="let point of dataset.data; let i = index"
                        [attr.cx]="(i / (dataset.data.length - 1 || 1)) * 400"
                        [attr.cy]="150 - (point / maxTrendValue()) * 150"
                        r="4"
                        [attr.fill]="dataset.color"
                        class="data-point"
                />
              </g>
            </svg>
            
            <!-- X \u8EF8\u6A19\u7C64 -->
            <div class="chart-labels">
              <span *ngFor="let label of trendData()?.labels || []">{{ label }}</span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- \u4F7F\u7528\u6B77\u53F2 -->
      <section class="history-section">
        <div class="section-header">
          <h2>\u4F7F\u7528\u6B77\u53F2</h2>
          <button class="view-all-btn" (click)="showAllHistory = !showAllHistory">
            {{ showAllHistory ? '\u6536\u8D77' : '\u67E5\u770B\u5168\u90E8' }}
          </button>
        </div>
        
        <div class="history-table">
          <div class="table-header">
            <span>\u65E5\u671F</span>
            <span>\u985E\u578B</span>
            <span>\u4F7F\u7528\u91CF</span>
            <span>\u914D\u984D</span>
            <span>\u4F7F\u7528\u7387</span>
          </div>
          <div class="table-body">
            <div class="table-row" *ngFor="let item of displayHistory()">
              <span class="date">{{ item.date }}</span>
              <span class="type">
                <span class="type-icon">{{ getQuotaIcon(item.quota_type) }}</span>
                {{ quotaService.getQuotaDisplayName(item.quota_type) }}
              </span>
              <span class="used">{{ formatNumber(item.used) }}</span>
              <span class="limit">{{ formatNumber(item.limit) }}</span>
              <span class="percentage" [class.warning]="getHistoryPercentage(item) > 80">
                {{ getHistoryPercentage(item).toFixed(1) }}%
              </span>
            </div>
            
            <div class="empty-history" *ngIf="(displayHistory() || []).length === 0">
              \u66AB\u7121\u6B77\u53F2\u8A18\u9304
            </div>
          </div>
        </div>
      </section>
      
      <!-- \u914D\u984D\u544A\u8B66 -->
      <section class="alerts-section" *ngIf="(quotaService.alerts() || []).length > 0">
        <div class="section-header">
          <h2>\u914D\u984D\u544A\u8B66</h2>
          <button class="clear-btn" (click)="clearAlerts()">\u5168\u90E8\u78BA\u8A8D</button>
        </div>
        
        <div class="alerts-list">
          <div class="alert-item" *ngFor="let alert of quotaService.alerts()"
               [class.acknowledged]="alert.acknowledged">
            <div class="alert-icon">\u26A0\uFE0F</div>
            <div class="alert-content">
              <span class="alert-type">{{ quotaService.getQuotaDisplayName(alert.quota_type) }}</span>
              <span class="alert-message">{{ alert.message }}</span>
            </div>
            <button class="ack-btn" *ngIf="!alert.acknowledged" 
                    (click)="acknowledgeAlert(alert.id)">
              \u78BA\u8A8D
            </button>
          </div>
        </div>
      </section>
      
      <!-- \u5347\u7D1A\u5F15\u5C0E -->
      <section class="upgrade-section" *ngIf="showUpgradeHint()">
        <div class="upgrade-content">
          <div class="upgrade-icon">\u{1F680}</div>
          <div class="upgrade-text">
            <h3>\u89E3\u9396\u66F4\u591A\u914D\u984D</h3>
            <p>\u5347\u7D1A\u5230\u66F4\u9AD8\u7B49\u7D1A\uFF0C\u7372\u5F97\u66F4\u591A\u8CC7\u6E90\u914D\u984D\u548C\u9AD8\u7D1A\u529F\u80FD</p>
          </div>
          <div class="upgrade-features">
            <span class="feature" *ngFor="let feature of upgradeFeatures">
              \u2713 {{ feature }}
            </span>
          </div>
        </div>
        <button class="upgrade-cta" (click)="goToUpgrade()">
          \u67E5\u770B\u5347\u7D1A\u65B9\u6848
          <span class="arrow">\u2192</span>
        </button>
      </section>
    </div>
  `, styles: ["/* angular:styles/component:css;064d77d50c2bf50d974c5661aa0e9742b405adf38a8ed729b46130275c83bf9e;D:/tgkz2026/src/views/quota-dashboard-view.component.ts */\n.quota-dashboard {\n  padding: 24px;\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.header-left h1 {\n  font-size: 24px;\n  font-weight: 700;\n  margin: 0 0 4px;\n}\n.header-left p {\n  margin: 0;\n  color: var(--text-secondary, #888);\n  font-size: 14px;\n}\n.header-right {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.tier-badge {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 8px 16px;\n  border-radius: 20px;\n  color: white;\n  font-weight: 600;\n}\n.tier-icon {\n  font-size: 18px;\n}\n.upgrade-btn {\n  padding: 10px 20px;\n  background:\n    linear-gradient(\n      135deg,\n      #8b5cf6,\n      #6366f1);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.upgrade-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);\n}\n.reset-countdown {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 12px 20px;\n  background: rgba(59, 130, 246, 0.1);\n  border: 1px solid rgba(59, 130, 246, 0.2);\n  border-radius: 12px;\n  margin-bottom: 24px;\n}\n.countdown-icon {\n  font-size: 24px;\n}\n.countdown-label {\n  display: block;\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.countdown-time {\n  font-size: 18px;\n  font-weight: 700;\n  color: var(--primary, #3b82f6);\n}\n.quota-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\n  gap: 20px;\n  margin-bottom: 32px;\n}\n.quota-card {\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  padding: 20px;\n  transition: all 0.3s;\n  position: relative;\n  overflow: hidden;\n}\n.quota-card:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);\n}\n.quota-card.warning {\n  border-color: rgba(245, 158, 11, 0.5);\n}\n.quota-card.exceeded {\n  border-color: rgba(239, 68, 68, 0.5);\n  background: rgba(239, 68, 68, 0.05);\n}\n.quota-card.unlimited {\n  border-color: rgba(139, 92, 246, 0.3);\n}\n.card-header {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n  margin-bottom: 16px;\n}\n.quota-icon {\n  font-size: 32px;\n}\n.quota-info h3 {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 600;\n}\n.quota-status {\n  font-size: 12px;\n}\n.card-body .quota-value {\n  display: flex;\n  align-items: baseline;\n  gap: 4px;\n  margin-bottom: 12px;\n}\n.quota-value .used {\n  font-size: 32px;\n  font-weight: 700;\n}\n.quota-value .separator {\n  font-size: 18px;\n  color: var(--text-secondary, #888);\n}\n.quota-value .limit {\n  font-size: 18px;\n  color: var(--text-secondary, #888);\n}\n.quota-value.unlimited {\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 4px;\n}\n.infinity {\n  font-size: 36px;\n  color: #8b5cf6;\n}\n.used-text {\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.progress-container {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  margin-bottom: 12px;\n}\n.progress-bar {\n  flex: 1;\n  height: 8px;\n  background: rgba(255, 255, 255, 0.1);\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-fill {\n  height: 100%;\n  border-radius: 4px;\n  transition: width 0.3s;\n}\n.percentage {\n  font-size: 14px;\n  font-weight: 600;\n  min-width: 50px;\n  text-align: right;\n}\n.quota-details {\n  display: flex;\n  justify-content: space-between;\n  font-size: 12px;\n  color: var(--text-secondary, #888);\n}\n.mini-trend {\n  position: absolute;\n  bottom: 0;\n  left: 0;\n  right: 0;\n  height: 40px;\n  opacity: 0.3;\n  color: var(--primary, #3b82f6);\n}\n.mini-trend svg {\n  width: 100%;\n  height: 100%;\n}\n.trend-section,\n.history-section,\n.alerts-section {\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 16px;\n  padding: 24px;\n  margin-bottom: 24px;\n}\n.section-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 20px;\n}\n.section-header h2 {\n  font-size: 18px;\n  font-weight: 600;\n  margin: 0;\n}\n.period-selector {\n  display: flex;\n  background: rgba(255, 255, 255, 0.05);\n  border-radius: 8px;\n  padding: 4px;\n}\n.period-selector button {\n  padding: 6px 12px;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.period-selector button.active {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.chart-container {\n  position: relative;\n}\n.chart-legend {\n  display: flex;\n  gap: 20px;\n  margin-bottom: 16px;\n}\n.legend-item {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: 13px;\n}\n.legend-color {\n  width: 12px;\n  height: 12px;\n  border-radius: 3px;\n}\n.chart-area {\n  position: relative;\n}\n.trend-chart {\n  width: 100%;\n  height: 150px;\n}\n.trend-chart .grid line {\n  stroke: rgba(255, 255, 255, 0.1);\n  stroke-width: 1;\n}\n.data-point {\n  opacity: 0;\n  transition: opacity 0.2s;\n}\n.trend-chart:hover .data-point {\n  opacity: 1;\n}\n.chart-labels {\n  display: flex;\n  justify-content: space-between;\n  margin-top: 8px;\n  font-size: 11px;\n  color: var(--text-muted, #666);\n}\n.view-all-btn,\n.clear-btn {\n  padding: 6px 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 13px;\n  cursor: pointer;\n}\n.history-table {\n  border: 1px solid var(--border-color, #333);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.table-header {\n  display: grid;\n  grid-template-columns: 100px 1fr 80px 80px 80px;\n  padding: 12px 16px;\n  background: rgba(255, 255, 255, 0.05);\n  font-size: 12px;\n  font-weight: 600;\n  color: var(--text-secondary, #888);\n}\n.table-row {\n  display: grid;\n  grid-template-columns: 100px 1fr 80px 80px 80px;\n  padding: 12px 16px;\n  border-top: 1px solid var(--border-color, #333);\n  font-size: 13px;\n  transition: background 0.2s;\n}\n.table-row:hover {\n  background: rgba(255, 255, 255, 0.05);\n}\n.table-row .type {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.table-row .percentage.warning {\n  color: #f59e0b;\n}\n.empty-history {\n  padding: 32px;\n  text-align: center;\n  color: var(--text-secondary, #888);\n}\n.alerts-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.alert-item {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  padding: 16px;\n  background: rgba(245, 158, 11, 0.1);\n  border-radius: 12px;\n  transition: opacity 0.2s;\n}\n.alert-item.acknowledged {\n  opacity: 0.5;\n}\n.alert-icon {\n  font-size: 24px;\n}\n.alert-content {\n  flex: 1;\n}\n.alert-type {\n  display: block;\n  font-weight: 600;\n  font-size: 14px;\n}\n.alert-message {\n  font-size: 13px;\n  color: var(--text-secondary, #888);\n}\n.ack-btn {\n  padding: 6px 12px;\n  background: rgba(255, 255, 255, 0.1);\n  border: none;\n  border-radius: 6px;\n  color: white;\n  font-size: 12px;\n  cursor: pointer;\n}\n.upgrade-section {\n  background:\n    linear-gradient(\n      135deg,\n      rgba(139, 92, 246, 0.1),\n      rgba(59, 130, 246, 0.1));\n  border: 1px solid rgba(139, 92, 246, 0.3);\n  border-radius: 16px;\n  padding: 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.upgrade-content {\n  display: flex;\n  align-items: center;\n  gap: 20px;\n}\n.upgrade-icon {\n  font-size: 48px;\n}\n.upgrade-text h3 {\n  margin: 0 0 4px;\n  font-size: 18px;\n}\n.upgrade-text p {\n  margin: 0;\n  font-size: 14px;\n  color: var(--text-secondary, #888);\n}\n.upgrade-features {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n.upgrade-features .feature {\n  font-size: 13px;\n  color: #22c55e;\n}\n.upgrade-cta {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  padding: 14px 28px;\n  background:\n    linear-gradient(\n      135deg,\n      #8b5cf6,\n      #6366f1);\n  border: none;\n  border-radius: 12px;\n  color: white;\n  font-size: 16px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.upgrade-cta:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);\n}\n.upgrade-cta .arrow {\n  transition: transform 0.2s;\n}\n.upgrade-cta:hover .arrow {\n  transform: translateX(4px);\n}\n@media (max-width: 768px) {\n  .page-header {\n    flex-direction: column;\n    align-items: flex-start;\n    gap: 16px;\n  }\n  .quota-grid {\n    grid-template-columns: 1fr;\n  }\n  .table-header,\n  .table-row {\n    grid-template-columns: 80px 1fr 60px 60px 60px;\n    font-size: 12px;\n  }\n  .upgrade-section {\n    flex-direction: column;\n    text-align: center;\n    gap: 20px;\n  }\n  .upgrade-content {\n    flex-direction: column;\n  }\n}\n/*# sourceMappingURL=quota-dashboard-view.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(QuotaDashboardViewComponent, { className: "QuotaDashboardViewComponent", filePath: "src/views/quota-dashboard-view.component.ts", lineNumber: 810 });
})();
export {
  QuotaDashboardViewComponent
};
//# sourceMappingURL=chunk-AP64V2TF.js.map
