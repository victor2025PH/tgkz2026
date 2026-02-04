import {
  NavBridgeService
} from "./chunk-6KLKCFSW.js";
import {
  ElectronIpcService
} from "./chunk-RRYKY32A.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  FormsModule
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-ORLIRJMO.js";
import {
  ChangeDetectionStrategy,
  Component,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵdomProperty,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/analytics/smart-analytics.component.ts
var _forTrack0 = ($index, $item) => $item.value;
var _forTrack1 = ($index, $item) => $item.date;
var _forTrack2 = ($index, $item) => $item.source;
var _forTrack3 = ($index, $item) => $item.title;
function SmartAnalyticsComponent_For_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 56);
    \u0275\u0275domListener("click", function SmartAnalyticsComponent_For_14_Template_button_click_0_listener() {
      const period_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.changePeriod(period_r2.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const period_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-cyan-500", ctx_r2.selectedPeriod() === period_r2.value)("text-white", ctx_r2.selectedPeriod() === period_r2.value)("text-slate-400", ctx_r2.selectedPeriod() !== period_r2.value)("hover:text-white", ctx_r2.selectedPeriod() !== period_r2.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", period_r2.label, " ");
  }
}
function SmartAnalyticsComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(0, "svg", 12);
    \u0275\u0275domElement(1, "circle", 57)(2, "path", 58);
    \u0275\u0275domElementEnd();
  }
}
function SmartAnalyticsComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F504} ");
  }
}
function SmartAnalyticsComponent_For_68_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 31)(1, "div", 59);
    \u0275\u0275domElement(2, "div", 60)(3, "div", 61)(4, "div", 62);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 49);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const point_r4 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("height", ctx_r2.getBarHeight(point_r4.sent, "sent"), "%");
    \u0275\u0275domProperty("title", "\u767C\u9001: " + point_r4.sent);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r2.getBarHeight(point_r4.replies, "replies"), "%");
    \u0275\u0275domProperty("title", "\u56DE\u8986: " + point_r4.replies);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", ctx_r2.getBarHeight(point_r4.conversions, "conversions"), "%");
    \u0275\u0275domProperty("title", "\u6210\u4EA4: " + point_r4.conversions);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.formatDateLabel(point_r4.date));
  }
}
function SmartAnalyticsComponent_For_87_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div")(1, "div", 63)(2, "span", 64);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 20);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "div", 65);
    \u0275\u0275domElement(7, "div", 66);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const source_r5 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(source_r5.source);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", source_r5.count, " (", source_r5.percentage.toFixed(1), "%)");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", source_r5.percentage, "%")("background-color", source_r5.color);
  }
}
function SmartAnalyticsComponent_Conditional_93_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 43);
    \u0275\u0275text(1, "\u23F3");
    \u0275\u0275domElementEnd();
  }
}
function SmartAnalyticsComponent_Conditional_94_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2728 ");
  }
}
function SmartAnalyticsComponent_For_98_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 67)(1, "div", 68)(2, "span", 69);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div")(5, "div", 70);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div", 20);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const insight_r6 = ctx.$implicit;
    \u0275\u0275classProp("border-green-500/30", insight_r6.type === "success")("border-yellow-500/30", insight_r6.type === "warning")("border-blue-500/30", insight_r6.type === "info")("border-purple-500/30", insight_r6.type === "tip");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(insight_r6.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(insight_r6.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(insight_r6.description);
  }
}
function SmartAnalyticsComponent_For_104_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 47);
    \u0275\u0275domElement(1, "div", 71);
    \u0275\u0275domElementStart(2, "span", 72);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const hour_r7 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("background-color", ctx_r2.getHeatmapColor(ctx_r2.hourlyData()[hour_r7] || 0));
    \u0275\u0275domProperty("title", hour_r7 + ":00 - \u56DE\u8986\u7387: " + (ctx_r2.hourlyData()[hour_r7] || 0) + "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(hour_r7);
  }
}
var SmartAnalyticsComponent = class _SmartAnalyticsComponent {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.periods = [
      { value: "today", label: "\u4ECA\u65E5" },
      { value: "week", label: "\u672C\u9031" },
      { value: "month", label: "\u672C\u6708" },
      { value: "quarter", label: "\u5B63\u5EA6" }
    ];
    this.selectedPeriod = signal("week", ...ngDevMode ? [{ debugName: "selectedPeriod" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.isGeneratingInsights = signal(false, ...ngDevMode ? [{ debugName: "isGeneratingInsights" }] : []);
    this.hours = Array.from({ length: 24 }, (_, i) => i);
    this.stats = signal({
      totalSent: 0,
      totalReplies: 0,
      totalConversions: 0,
      conversionRate: 0,
      sentChange: 0,
      repliesChange: 0,
      conversionsChange: 0,
      rateChange: 0
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.trendData = signal([], ...ngDevMode ? [{ debugName: "trendData" }] : []);
    this.sourceDistribution = signal([], ...ngDevMode ? [{ debugName: "sourceDistribution" }] : []);
    this.aiInsights = signal([], ...ngDevMode ? [{ debugName: "aiInsights" }] : []);
    this.hourlyData = signal({}, ...ngDevMode ? [{ debugName: "hourlyData" }] : []);
  }
  ngOnInit() {
    this.setupIpcListeners();
    this.loadData();
  }
  ngOnDestroy() {
  }
  setupIpcListeners() {
    this.ipc.on("analytics:stats", (data) => {
      if (data.success) {
        this.stats.set(data.stats);
      }
      this.isLoading.set(false);
    });
    this.ipc.on("analytics:trend", (data) => {
      if (data.success) {
        this.trendData.set(data.trend);
      }
    });
    this.ipc.on("analytics:sources", (data) => {
      if (data.success) {
        this.sourceDistribution.set(data.sources);
      }
    });
    this.ipc.on("analytics:hourly", (data) => {
      if (data.success) {
        this.hourlyData.set(data.hourly);
      }
    });
    this.ipc.on("analytics:insights", (data) => {
      if (data.success) {
        this.aiInsights.set(data.insights);
      }
      this.isGeneratingInsights.set(false);
    });
  }
  loadData() {
    this.isLoading.set(true);
    this.ipc.send("analytics:get-stats", { period: this.selectedPeriod() });
    this.ipc.send("analytics:get-trend", { period: this.selectedPeriod() });
    this.ipc.send("analytics:get-sources", { period: this.selectedPeriod() });
    this.ipc.send("analytics:get-hourly", { period: this.selectedPeriod() });
    setTimeout(() => {
      if (this.isLoading()) {
        this.generateMockData();
        this.isLoading.set(false);
      }
    }, 1e3);
  }
  generateMockData() {
    const sent = Math.floor(Math.random() * 1e3) + 500;
    const replies = Math.floor(sent * (0.2 + Math.random() * 0.2));
    const conversions = Math.floor(replies * (0.1 + Math.random() * 0.15));
    this.stats.set({
      totalSent: sent,
      totalReplies: replies,
      totalConversions: conversions,
      conversionRate: conversions / sent * 100,
      sentChange: (Math.random() - 0.3) * 30,
      repliesChange: (Math.random() - 0.3) * 30,
      conversionsChange: (Math.random() - 0.3) * 30,
      rateChange: (Math.random() - 0.3) * 5
    });
    const trend = [];
    const days = this.selectedPeriod() === "today" ? 24 : this.selectedPeriod() === "week" ? 7 : this.selectedPeriod() === "month" ? 30 : 90;
    for (let i = 0; i < Math.min(days, 14); i++) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      trend.unshift({
        date: date.toISOString().split("T")[0],
        sent: Math.floor(Math.random() * 100) + 20,
        replies: Math.floor(Math.random() * 30) + 5,
        conversions: Math.floor(Math.random() * 10) + 1
      });
    }
    this.trendData.set(trend);
    const sources = [
      { source: "\u7FA4\u7D44\u63D0\u53D6", count: Math.floor(Math.random() * 500) + 200, color: "#3b82f6" },
      { source: "\u95DC\u9375\u8A5E\u5339\u914D", count: Math.floor(Math.random() * 300) + 100, color: "#10b981" },
      { source: "\u624B\u52D5\u6DFB\u52A0", count: Math.floor(Math.random() * 200) + 50, color: "#f59e0b" },
      { source: "AI \u63A8\u85A6", count: Math.floor(Math.random() * 150) + 30, color: "#8b5cf6" }
    ];
    const total = sources.reduce((sum, s) => sum + s.count, 0);
    this.sourceDistribution.set(sources.map((s) => __spreadProps(__spreadValues({}, s), {
      percentage: s.count / total * 100
    })));
    const hourly = {};
    for (let h = 0; h < 24; h++) {
      const baseRate = h >= 9 && h <= 18 ? 30 : 10;
      hourly[h] = Math.floor(Math.random() * 20) + baseRate;
    }
    this.hourlyData.set(hourly);
    this.generateInsights();
  }
  generateInsights() {
    const stats = this.stats();
    const insights = [];
    if (stats.conversionRate > 5) {
      insights.push({
        icon: "\u{1F389}",
        type: "success",
        title: "\u8F49\u5316\u7387\u8868\u73FE\u512A\u79C0",
        description: `\u7576\u524D\u8F49\u5316\u7387 ${stats.conversionRate.toFixed(1)}% \u9AD8\u65BC\u884C\u696D\u5E73\u5747\u6C34\u5E73\uFF0C\u7E7C\u7E8C\u4FDD\u6301\uFF01`
      });
    }
    if (stats.sentChange > 10) {
      insights.push({
        icon: "\u{1F4C8}",
        type: "info",
        title: "\u767C\u9001\u91CF\u986F\u8457\u589E\u9577",
        description: `\u767C\u9001\u91CF\u8F03\u4E0A\u671F\u589E\u9577 ${stats.sentChange.toFixed(1)}%\uFF0C\u89F8\u9054\u66F4\u591A\u6F5B\u5728\u5BA2\u6236\u3002`
      });
    }
    const hourly = this.hourlyData();
    let bestHour = 0;
    let bestRate = 0;
    for (const [hour, rate] of Object.entries(hourly)) {
      if (rate > bestRate) {
        bestRate = rate;
        bestHour = parseInt(hour);
      }
    }
    insights.push({
      icon: "\u23F0",
      type: "tip",
      title: `\u6700\u4F73\u767C\u9001\u6642\u6BB5\uFF1A${bestHour}:00-${bestHour + 1}:00`,
      description: `\u8A72\u6642\u6BB5\u56DE\u8986\u7387\u9AD8\u9054 ${bestRate}%\uFF0C\u5EFA\u8B70\u91CD\u9EDE\u5B89\u6392\u767C\u9001\u3002`
    });
    const sources = this.sourceDistribution();
    if (sources.length > 0) {
      const topSource = sources[0];
      insights.push({
        icon: "\u{1F3AF}",
        type: "info",
        title: `\u4E3B\u8981\u7528\u6236\u4F86\u6E90\uFF1A${topSource.source}`,
        description: `\u4F54\u6BD4 ${topSource.percentage.toFixed(1)}%\uFF0C\u53EF\u8003\u616E\u52A0\u5F37\u8A72\u6E20\u9053\u6295\u5165\u3002`
      });
    }
    this.aiInsights.set(insights);
  }
  changePeriod(period) {
    this.selectedPeriod.set(period);
    this.loadData();
  }
  refreshData() {
    this.loadData();
  }
  regenerateInsights() {
    this.isGeneratingInsights.set(true);
    this.ipc.send("analytics:generate-insights", {
      period: this.selectedPeriod(),
      stats: this.stats()
    });
    setTimeout(() => {
      if (this.isGeneratingInsights()) {
        this.generateInsights();
        this.isGeneratingInsights.set(false);
      }
    }, 1500);
  }
  exportReport() {
    this.toast.info("\u6B63\u5728\u751F\u6210\u5831\u544A...");
    this.ipc.send("analytics:export", {
      period: this.selectedPeriod(),
      stats: this.stats(),
      trend: this.trendData(),
      sources: this.sourceDistribution(),
      insights: this.aiInsights()
    });
    setTimeout(() => {
      this.toast.success("\u5831\u544A\u5DF2\u751F\u6210\uFF0C\u8ACB\u9078\u64C7\u4FDD\u5B58\u4F4D\u7F6E");
    }, 1e3);
  }
  // 格式化方法
  formatNumber(num) {
    if (num >= 1e6)
      return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3)
      return (num / 1e3).toFixed(1) + "K";
    return num.toString();
  }
  formatPercent(value) {
    return Math.abs(value).toFixed(1) + "%";
  }
  formatDateLabel(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }
  getBarHeight(value, type) {
    const trend = this.trendData();
    if (trend.length === 0)
      return 0;
    let max = 1;
    trend.forEach((point) => {
      if (type === "sent" && point.sent > max)
        max = point.sent;
      if (type === "replies" && point.replies > max)
        max = point.replies;
      if (type === "conversions" && point.conversions > max)
        max = point.conversions;
    });
    return Math.max(5, value / max * 100);
  }
  getHeatmapColor(rate) {
    if (rate < 15)
      return "rgb(51, 65, 85)";
    if (rate < 25)
      return "rgb(20, 83, 45)";
    if (rate < 35)
      return "rgb(21, 128, 61)";
    if (rate < 45)
      return "rgb(34, 197, 94)";
    return "rgb(74, 222, 128)";
  }
  static {
    this.\u0275fac = function SmartAnalyticsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartAnalyticsComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SmartAnalyticsComponent, selectors: [["app-smart-analytics"]], decls: 116, vars: 48, consts: [[1, "smart-analytics", "h-full", "flex", "flex-col", "bg-gradient-to-br", "from-slate-900", "via-slate-800", "to-slate-900", "overflow-hidden"], [1, "flex-shrink-0", "p-6", "border-b", "border-slate-700/50"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-4"], [1, "w-12", "h-12", "rounded-2xl", "bg-gradient-to-br", "from-cyan-500", "to-blue-500", "flex", "items-center", "justify-center", "text-2xl", "shadow-lg", "shadow-cyan-500/20"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-slate-400", "text-sm"], [1, "flex", "items-center", "gap-3"], [1, "flex", "bg-slate-800/50", "rounded-xl", "p-1"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "bg-cyan-500", "text-white", "text-slate-400", "hover:text-white"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-xl", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "p-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-xl", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"], ["fill", "none", "viewBox", "0 0 24 24", 1, "w-5", "h-5", "animate-spin"], [1, "flex-1", "overflow-y-auto", "p-6", "space-y-6"], [1, "grid", "grid-cols-4", "gap-4"], [1, "p-5", "bg-gradient-to-br", "from-blue-500/10", "to-blue-600/5", "rounded-2xl", "border", "border-blue-500/20"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-blue-400", "text-2xl"], [1, "text-xs", "px-2", "py-1", "rounded-full"], [1, "text-3xl", "font-bold", "text-white", "mb-1"], [1, "text-sm", "text-slate-400"], [1, "p-5", "bg-gradient-to-br", "from-green-500/10", "to-green-600/5", "rounded-2xl", "border", "border-green-500/20"], [1, "text-green-400", "text-2xl"], [1, "p-5", "bg-gradient-to-br", "from-purple-500/10", "to-purple-600/5", "rounded-2xl", "border", "border-purple-500/20"], [1, "text-purple-400", "text-2xl"], [1, "p-5", "bg-gradient-to-br", "from-amber-500/10", "to-amber-600/5", "rounded-2xl", "border", "border-amber-500/20"], [1, "text-amber-400", "text-2xl"], [1, "grid", "grid-cols-3", "gap-6"], [1, "col-span-2", "p-5", "bg-slate-800/30", "rounded-2xl", "border", "border-slate-700/50"], [1, "text-lg", "font-semibold", "text-white", "mb-4", "flex", "items-center", "gap-2"], [1, "h-64", "flex", "items-end", "gap-1"], [1, "flex-1", "flex", "flex-col", "items-center", "gap-1"], [1, "flex", "items-center", "justify-center", "gap-6", "mt-4"], [1, "flex", "items-center", "gap-2"], [1, "w-3", "h-3", "bg-blue-500", "rounded"], [1, "w-3", "h-3", "bg-green-500", "rounded"], [1, "w-3", "h-3", "bg-purple-500", "rounded"], [1, "p-5", "bg-slate-800/30", "rounded-2xl", "border", "border-slate-700/50"], [1, "space-y-3"], [1, "p-5", "bg-gradient-to-r", "from-cyan-500/10", "via-blue-500/10", "to-purple-500/10", "rounded-2xl", "border", "border-cyan-500/20"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "text-lg", "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "px-3", "py-1.5", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded-lg", "text-sm", "transition-colors", "disabled:opacity-50", "flex", "items-center", "gap-1", 3, "click", "disabled"], [1, "animate-spin"], [1, "grid", "grid-cols-2", "gap-4"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/30", 3, "border-green-500/30", "border-yellow-500/30", "border-blue-500/30", "border-purple-500/30"], [1, "flex", "gap-1"], [1, "flex-1", "flex", "flex-col", "items-center"], [1, "flex", "items-center", "justify-end", "gap-4", "mt-3"], [1, "text-xs", "text-slate-500"], [1, "flex", "gap-0.5"], [1, "w-4", "h-3", "rounded", "bg-slate-700"], [1, "w-4", "h-3", "rounded", "bg-green-900"], [1, "w-4", "h-3", "rounded", "bg-green-700"], [1, "w-4", "h-3", "rounded", "bg-green-500"], [1, "w-4", "h-3", "rounded", "bg-green-400"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "click"], ["cx", "12", "cy", "12", "r", "10", "stroke", "currentColor", "stroke-width", "4", 1, "opacity-25"], ["fill", "currentColor", "d", "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z", 1, "opacity-75"], [1, "w-full", "flex", "gap-0.5", "items-end", "h-48"], [1, "flex-1", "bg-blue-500/60", "rounded-t", "transition-all", "hover:bg-blue-500", 3, "title"], [1, "flex-1", "bg-green-500/60", "rounded-t", "transition-all", "hover:bg-green-500", 3, "title"], [1, "flex-1", "bg-purple-500/60", "rounded-t", "transition-all", "hover:bg-purple-500", 3, "title"], [1, "flex", "items-center", "justify-between", "mb-1"], [1, "text-sm", "text-slate-300"], [1, "h-2", "bg-slate-700", "rounded-full", "overflow-hidden"], [1, "h-full", "rounded-full", "transition-all"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/30"], [1, "flex", "items-start", "gap-3"], [1, "text-2xl"], [1, "font-medium", "text-white", "mb-1"], [1, "w-full", "h-8", "rounded", "transition-all", 3, "title"], [1, "text-xs", "text-slate-500", "mt-1"]], template: function SmartAnalyticsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "div", 4);
        \u0275\u0275text(5, " \u{1F4CA} ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u667A\u80FD\u5206\u6790\u5831\u544A");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(9, "p", 6);
        \u0275\u0275text(10, "AI \u9A45\u52D5\u7684\u6578\u64DA\u6D1E\u5BDF");
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(11, "div", 7)(12, "div", 8);
        \u0275\u0275repeaterCreate(13, SmartAnalyticsComponent_For_14_Template, 2, 9, "button", 9, _forTrack0);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(15, "button", 10);
        \u0275\u0275domListener("click", function SmartAnalyticsComponent_Template_button_click_15_listener() {
          return ctx.exportReport();
        });
        \u0275\u0275text(16, " \u{1F4E5} \u5C0E\u51FA\u5831\u544A ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(17, "button", 11);
        \u0275\u0275domListener("click", function SmartAnalyticsComponent_Template_button_click_17_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275conditionalCreate(18, SmartAnalyticsComponent_Conditional_18_Template, 3, 0, ":svg:svg", 12)(19, SmartAnalyticsComponent_Conditional_19_Template, 1, 0);
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275domElementStart(20, "div", 13)(21, "div", 14)(22, "div", 15)(23, "div", 16)(24, "span", 17);
        \u0275\u0275text(25, "\u{1F4E4}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(26, "span", 18);
        \u0275\u0275text(27);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(28, "div", 19);
        \u0275\u0275text(29);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(30, "div", 20);
        \u0275\u0275text(31, "\u7E3D\u767C\u9001\u6578");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(32, "div", 21)(33, "div", 16)(34, "span", 22);
        \u0275\u0275text(35, "\u{1F4AC}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(36, "span", 18);
        \u0275\u0275text(37);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(38, "div", 19);
        \u0275\u0275text(39);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(40, "div", 20);
        \u0275\u0275text(41, "\u7E3D\u56DE\u8986\u6578");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(42, "div", 23)(43, "div", 16)(44, "span", 24);
        \u0275\u0275text(45, "\u2705");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(46, "span", 18);
        \u0275\u0275text(47);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(48, "div", 19);
        \u0275\u0275text(49);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(50, "div", 20);
        \u0275\u0275text(51, "\u7E3D\u6210\u4EA4\u6578");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(52, "div", 25)(53, "div", 16)(54, "span", 26);
        \u0275\u0275text(55, "\u{1F4C8}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(56, "span", 18);
        \u0275\u0275text(57);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(58, "div", 19);
        \u0275\u0275text(59);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(60, "div", 20);
        \u0275\u0275text(61, "\u8F49\u5316\u7387");
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(62, "div", 27)(63, "div", 28)(64, "h3", 29);
        \u0275\u0275text(65, " \u{1F4C8} \u767C\u9001\u8207\u56DE\u8986\u8DA8\u52E2 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(66, "div", 30);
        \u0275\u0275repeaterCreate(67, SmartAnalyticsComponent_For_68_Template, 7, 10, "div", 31, _forTrack1);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(69, "div", 32)(70, "div", 33);
        \u0275\u0275domElement(71, "div", 34);
        \u0275\u0275domElementStart(72, "span", 20);
        \u0275\u0275text(73, "\u767C\u9001");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(74, "div", 33);
        \u0275\u0275domElement(75, "div", 35);
        \u0275\u0275domElementStart(76, "span", 20);
        \u0275\u0275text(77, "\u56DE\u8986");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(78, "div", 33);
        \u0275\u0275domElement(79, "div", 36);
        \u0275\u0275domElementStart(80, "span", 20);
        \u0275\u0275text(81, "\u6210\u4EA4");
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275domElementStart(82, "div", 37)(83, "h3", 29);
        \u0275\u0275text(84, " \u{1F967} \u7528\u6236\u4F86\u6E90\u5206\u5E03 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(85, "div", 38);
        \u0275\u0275repeaterCreate(86, SmartAnalyticsComponent_For_87_Template, 8, 7, "div", null, _forTrack2);
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(88, "div", 39)(89, "div", 40)(90, "h3", 41);
        \u0275\u0275text(91, " \u{1F916} AI \u667A\u80FD\u6D1E\u5BDF ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(92, "button", 42);
        \u0275\u0275domListener("click", function SmartAnalyticsComponent_Template_button_click_92_listener() {
          return ctx.regenerateInsights();
        });
        \u0275\u0275conditionalCreate(93, SmartAnalyticsComponent_Conditional_93_Template, 2, 0, "span", 43)(94, SmartAnalyticsComponent_Conditional_94_Template, 1, 0);
        \u0275\u0275text(95, " \u91CD\u65B0\u751F\u6210 ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(96, "div", 44);
        \u0275\u0275repeaterCreate(97, SmartAnalyticsComponent_For_98_Template, 9, 11, "div", 45, _forTrack3);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(99, "div", 37)(100, "h3", 29);
        \u0275\u0275text(101, " \u{1F550} \u6700\u4F73\u767C\u9001\u6642\u6BB5 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(102, "div", 46);
        \u0275\u0275repeaterCreate(103, SmartAnalyticsComponent_For_104_Template, 4, 4, "div", 47, \u0275\u0275repeaterTrackByIdentity);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(105, "div", 48)(106, "span", 49);
        \u0275\u0275text(107, "\u4F4E");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(108, "div", 50);
        \u0275\u0275domElement(109, "div", 51)(110, "div", 52)(111, "div", 53)(112, "div", 54)(113, "div", 55);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(114, "span", 49);
        \u0275\u0275text(115, "\u9AD8");
        \u0275\u0275domElementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(13);
        \u0275\u0275repeater(ctx.periods);
        \u0275\u0275advance(4);
        \u0275\u0275domProperty("disabled", ctx.isLoading());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLoading() ? 18 : 19);
        \u0275\u0275advance(8);
        \u0275\u0275classProp("bg-green-500/20", ctx.stats().sentChange >= 0)("text-green-400", ctx.stats().sentChange >= 0)("bg-red-500/20", ctx.stats().sentChange < 0)("text-red-400", ctx.stats().sentChange < 0);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.stats().sentChange >= 0 ? "\u2191" : "\u2193", " ", ctx.formatPercent(ctx.stats().sentChange), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.formatNumber(ctx.stats().totalSent));
        \u0275\u0275advance(7);
        \u0275\u0275classProp("bg-green-500/20", ctx.stats().repliesChange >= 0)("text-green-400", ctx.stats().repliesChange >= 0)("bg-red-500/20", ctx.stats().repliesChange < 0)("text-red-400", ctx.stats().repliesChange < 0);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.stats().repliesChange >= 0 ? "\u2191" : "\u2193", " ", ctx.formatPercent(ctx.stats().repliesChange), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.formatNumber(ctx.stats().totalReplies));
        \u0275\u0275advance(7);
        \u0275\u0275classProp("bg-green-500/20", ctx.stats().conversionsChange >= 0)("text-green-400", ctx.stats().conversionsChange >= 0)("bg-red-500/20", ctx.stats().conversionsChange < 0)("text-red-400", ctx.stats().conversionsChange < 0);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.stats().conversionsChange >= 0 ? "\u2191" : "\u2193", " ", ctx.formatPercent(ctx.stats().conversionsChange), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.formatNumber(ctx.stats().totalConversions));
        \u0275\u0275advance(7);
        \u0275\u0275classProp("bg-green-500/20", ctx.stats().rateChange >= 0)("text-green-400", ctx.stats().rateChange >= 0)("bg-red-500/20", ctx.stats().rateChange < 0)("text-red-400", ctx.stats().rateChange < 0);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.stats().rateChange >= 0 ? "\u2191" : "\u2193", " ", ctx.formatPercent(ctx.stats().rateChange), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("", ctx.stats().conversionRate.toFixed(1), "%");
        \u0275\u0275advance(8);
        \u0275\u0275repeater(ctx.trendData());
        \u0275\u0275advance(19);
        \u0275\u0275repeater(ctx.sourceDistribution());
        \u0275\u0275advance(6);
        \u0275\u0275domProperty("disabled", ctx.isGeneratingInsights());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isGeneratingInsights() ? 93 : 94);
        \u0275\u0275advance(4);
        \u0275\u0275repeater(ctx.aiInsights());
        \u0275\u0275advance(6);
        \u0275\u0275repeater(ctx.hours);
      }
    }, dependencies: [CommonModule, FormsModule], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  height: 100%;\n}\n/*# sourceMappingURL=smart-analytics.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartAnalyticsComponent, [{
    type: Component,
    args: [{ selector: "app-smart-analytics", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="smart-analytics h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex-shrink-0 p-6 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/20">
              \u{1F4CA}
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">\u667A\u80FD\u5206\u6790\u5831\u544A</h1>
              <p class="text-slate-400 text-sm">AI \u9A45\u52D5\u7684\u6578\u64DA\u6D1E\u5BDF</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- \u6642\u9593\u9031\u671F\u9078\u64C7 -->
            <div class="flex bg-slate-800/50 rounded-xl p-1">
              @for (period of periods; track period.value) {
                <button 
                  (click)="changePeriod(period.value)"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  [class.bg-cyan-500]="selectedPeriod() === period.value"
                  [class.text-white]="selectedPeriod() === period.value"
                  [class.text-slate-400]="selectedPeriod() !== period.value"
                  [class.hover:text-white]="selectedPeriod() !== period.value">
                  {{ period.label }}
                </button>
              }
            </div>
            
            <!-- \u5C0E\u51FA\u6309\u9215 -->
            <button 
              (click)="exportReport()"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2">
              \u{1F4E5} \u5C0E\u51FA\u5831\u544A
            </button>
            
            <!-- \u5237\u65B0\u6309\u9215 -->
            <button 
              (click)="refreshData()"
              [disabled]="isLoading()"
              class="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors disabled:opacity-50">
              @if (isLoading()) {
                <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              } @else {
                \u{1F504}
              }
            </button>
          </div>
        </div>
      </div>
      
      <!-- \u4E3B\u5167\u5BB9\u5340 -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        
        <!-- \u7D71\u8A08\u5361\u7247 -->
        <div class="grid grid-cols-4 gap-4">
          <!-- \u767C\u9001\u6578 -->
          <div class="p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl border border-blue-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-blue-400 text-2xl">\u{1F4E4}</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().sentChange >= 0"
                    [class.text-green-400]="stats().sentChange >= 0"
                    [class.bg-red-500/20]="stats().sentChange < 0"
                    [class.text-red-400]="stats().sentChange < 0">
                {{ stats().sentChange >= 0 ? '\u2191' : '\u2193' }} {{ formatPercent(stats().sentChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalSent) }}</div>
            <div class="text-sm text-slate-400">\u7E3D\u767C\u9001\u6578</div>
          </div>
          
          <!-- \u56DE\u8986\u6578 -->
          <div class="p-5 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-2xl border border-green-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-green-400 text-2xl">\u{1F4AC}</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().repliesChange >= 0"
                    [class.text-green-400]="stats().repliesChange >= 0"
                    [class.bg-red-500/20]="stats().repliesChange < 0"
                    [class.text-red-400]="stats().repliesChange < 0">
                {{ stats().repliesChange >= 0 ? '\u2191' : '\u2193' }} {{ formatPercent(stats().repliesChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalReplies) }}</div>
            <div class="text-sm text-slate-400">\u7E3D\u56DE\u8986\u6578</div>
          </div>
          
          <!-- \u6210\u4EA4\u6578 -->
          <div class="p-5 bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-2xl border border-purple-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-purple-400 text-2xl">\u2705</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().conversionsChange >= 0"
                    [class.text-green-400]="stats().conversionsChange >= 0"
                    [class.bg-red-500/20]="stats().conversionsChange < 0"
                    [class.text-red-400]="stats().conversionsChange < 0">
                {{ stats().conversionsChange >= 0 ? '\u2191' : '\u2193' }} {{ formatPercent(stats().conversionsChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ formatNumber(stats().totalConversions) }}</div>
            <div class="text-sm text-slate-400">\u7E3D\u6210\u4EA4\u6578</div>
          </div>
          
          <!-- \u8F49\u5316\u7387 -->
          <div class="p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-500/20">
            <div class="flex items-center justify-between mb-3">
              <span class="text-amber-400 text-2xl">\u{1F4C8}</span>
              <span class="text-xs px-2 py-1 rounded-full"
                    [class.bg-green-500/20]="stats().rateChange >= 0"
                    [class.text-green-400]="stats().rateChange >= 0"
                    [class.bg-red-500/20]="stats().rateChange < 0"
                    [class.text-red-400]="stats().rateChange < 0">
                {{ stats().rateChange >= 0 ? '\u2191' : '\u2193' }} {{ formatPercent(stats().rateChange) }}
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ stats().conversionRate.toFixed(1) }}%</div>
            <div class="text-sm text-slate-400">\u8F49\u5316\u7387</div>
          </div>
        </div>
        
        <!-- \u5716\u8868\u5340\u57DF -->
        <div class="grid grid-cols-3 gap-6">
          
          <!-- \u8DA8\u52E2\u5716 -->
          <div class="col-span-2 p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              \u{1F4C8} \u767C\u9001\u8207\u56DE\u8986\u8DA8\u52E2
            </h3>
            <div class="h-64 flex items-end gap-1">
              @for (point of trendData(); track point.date; let i = $index) {
                <div class="flex-1 flex flex-col items-center gap-1">
                  <!-- \u67F1\u72C0\u5716 -->
                  <div class="w-full flex gap-0.5 items-end h-48">
                    <div 
                      class="flex-1 bg-blue-500/60 rounded-t transition-all hover:bg-blue-500"
                      [style.height.%]="getBarHeight(point.sent, 'sent')"
                      [title]="'\u767C\u9001: ' + point.sent">
                    </div>
                    <div 
                      class="flex-1 bg-green-500/60 rounded-t transition-all hover:bg-green-500"
                      [style.height.%]="getBarHeight(point.replies, 'replies')"
                      [title]="'\u56DE\u8986: ' + point.replies">
                    </div>
                    <div 
                      class="flex-1 bg-purple-500/60 rounded-t transition-all hover:bg-purple-500"
                      [style.height.%]="getBarHeight(point.conversions, 'conversions')"
                      [title]="'\u6210\u4EA4: ' + point.conversions">
                    </div>
                  </div>
                  <!-- \u65E5\u671F\u6A19\u7C64 -->
                  <span class="text-xs text-slate-500">{{ formatDateLabel(point.date) }}</span>
                </div>
              }
            </div>
            <!-- \u5716\u4F8B -->
            <div class="flex items-center justify-center gap-6 mt-4">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-blue-500 rounded"></div>
                <span class="text-sm text-slate-400">\u767C\u9001</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span class="text-sm text-slate-400">\u56DE\u8986</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-purple-500 rounded"></div>
                <span class="text-sm text-slate-400">\u6210\u4EA4</span>
              </div>
            </div>
          </div>
          
          <!-- \u4F86\u6E90\u5206\u5E03 -->
          <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              \u{1F967} \u7528\u6236\u4F86\u6E90\u5206\u5E03
            </h3>
            <div class="space-y-3">
              @for (source of sourceDistribution(); track source.source) {
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-slate-300">{{ source.source }}</span>
                    <span class="text-sm text-slate-400">{{ source.count }} ({{ source.percentage.toFixed(1) }}%)</span>
                  </div>
                  <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all"
                      [style.width.%]="source.percentage"
                      [style.backgroundColor]="source.color">
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- AI \u6D1E\u5BDF -->
        <div class="p-5 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/20">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              \u{1F916} AI \u667A\u80FD\u6D1E\u5BDF
            </h3>
            <button 
              (click)="regenerateInsights()"
              [disabled]="isGeneratingInsights()"
              class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-1">
              @if (isGeneratingInsights()) {
                <span class="animate-spin">\u23F3</span>
              } @else {
                \u2728
              }
              \u91CD\u65B0\u751F\u6210
            </button>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            @for (insight of aiInsights(); track insight.title) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/30"
                   [class.border-green-500/30]="insight.type === 'success'"
                   [class.border-yellow-500/30]="insight.type === 'warning'"
                   [class.border-blue-500/30]="insight.type === 'info'"
                   [class.border-purple-500/30]="insight.type === 'tip'">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ insight.icon }}</span>
                  <div>
                    <div class="font-medium text-white mb-1">{{ insight.title }}</div>
                    <div class="text-sm text-slate-400">{{ insight.description }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- \u6642\u6BB5\u71B1\u529B\u5716 -->
        <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            \u{1F550} \u6700\u4F73\u767C\u9001\u6642\u6BB5
          </h3>
          <div class="flex gap-1">
            @for (hour of hours; track hour) {
              <div class="flex-1 flex flex-col items-center">
                <div 
                  class="w-full h-8 rounded transition-all"
                  [style.backgroundColor]="getHeatmapColor(hourlyData()[hour] || 0)"
                  [title]="hour + ':00 - \u56DE\u8986\u7387: ' + (hourlyData()[hour] || 0) + '%'">
                </div>
                <span class="text-xs text-slate-500 mt-1">{{ hour }}</span>
              </div>
            }
          </div>
          <div class="flex items-center justify-end gap-4 mt-3">
            <span class="text-xs text-slate-500">\u4F4E</span>
            <div class="flex gap-0.5">
              <div class="w-4 h-3 rounded bg-slate-700"></div>
              <div class="w-4 h-3 rounded bg-green-900"></div>
              <div class="w-4 h-3 rounded bg-green-700"></div>
              <div class="w-4 h-3 rounded bg-green-500"></div>
              <div class="w-4 h-3 rounded bg-green-400"></div>
            </div>
            <span class="text-xs text-slate-500">\u9AD8</span>
          </div>
        </div>
        
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;c63aac4e1d1ce1074d0fb61b93c3d082a38ddfc40b5cc09fdd9a596f2e08e21b;D:/tgkz2026/src/analytics/smart-analytics.component.ts */\n:host {\n  display: block;\n  height: 100%;\n}\n/*# sourceMappingURL=smart-analytics.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SmartAnalyticsComponent, { className: "SmartAnalyticsComponent", filePath: "src/analytics/smart-analytics.component.ts", lineNumber: 341 });
})();

// src/views/analytics-view.component.ts
var AnalyticsViewComponent = class _AnalyticsViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.membershipService = inject(MembershipService);
    this.dateRange = signal(null, ...ngDevMode ? [{ debugName: "dateRange" }] : []);
    this.ipcCleanup = [];
  }
  ngOnInit() {
    const end = /* @__PURE__ */ new Date();
    const start = /* @__PURE__ */ new Date();
    start.setDate(start.getDate() - 30);
    this.dateRange.set({ start, end });
    this.loadAnalyticsData();
    this.setupIpcListeners();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
  }
  loadAnalyticsData() {
    const range = this.dateRange();
    if (range) {
      this.ipc.send("get-analytics-data", {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      });
    }
  }
  setupIpcListeners() {
    const cleanup = this.ipc.on("analytics-data-loaded", () => {
    });
    this.ipcCleanup.push(cleanup);
  }
  // 導航
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  // 設置日期範圍
  setDateRange(range) {
    this.dateRange.set(range);
    this.loadAnalyticsData();
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  static {
    this.\u0275fac = function AnalyticsViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AnalyticsViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AnalyticsViewComponent, selectors: [["app-analytics-view"]], decls: 1, vars: 0, consts: [[3, "dateRangeChange", "navigateTo"]], template: function AnalyticsViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-smart-analytics", 0);
        \u0275\u0275listener("dateRangeChange", function AnalyticsViewComponent_Template_app_smart_analytics_dateRangeChange_0_listener($event) {
          return ctx.setDateRange($event);
        })("navigateTo", function AnalyticsViewComponent_Template_app_smart_analytics_navigateTo_0_listener($event) {
          return ctx.navigateTo($event);
        });
        \u0275\u0275elementEnd();
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      SmartAnalyticsComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AnalyticsViewComponent, [{
    type: Component,
    args: [{
      selector: "app-analytics-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        SmartAnalyticsComponent
      ],
      template: `
    <app-smart-analytics
      (dateRangeChange)="setDateRange($event)"
      (navigateTo)="navigateTo($event)">
    </app-smart-analytics>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AnalyticsViewComponent, { className: "AnalyticsViewComponent", filePath: "src/views/analytics-view.component.ts", lineNumber: 35 });
})();

export {
  AnalyticsViewComponent
};
//# sourceMappingURL=chunk-5F6KNM7V.js.map
