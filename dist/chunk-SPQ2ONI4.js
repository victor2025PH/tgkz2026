import {
  AutomationWorkflowService,
  MarketingAnalyticsService
} from "./chunk-UNP75L76.js";
import {
  ABTestingService,
  LeadScoringService
} from "./chunk-UTR72ISQ.js";
import {
  AccountManagementService
} from "./chunk-5TVIREIP.js";
import {
  MonitoringManagementService
} from "./chunk-AWDF3A3Y.js";
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
  EventEmitter,
  Injectable,
  Output,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵdomListener,
  ɵɵdomProperty,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/components/smart-dashboard.component.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.contactId;
function SmartDashboardComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(0, "svg", 6);
    \u0275\u0275domElement(1, "circle", 30)(2, "path", 31);
    \u0275\u0275domElementEnd();
  }
}
function SmartDashboardComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F504} ");
  }
}
function SmartDashboardComponent_For_14_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 38);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const card_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-green-500/20", card_r2.change >= 0)("text-green-400", card_r2.change >= 0)("bg-red-500/20", card_r2.change < 0)("text-red-400", card_r2.change < 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", card_r2.change >= 0 ? "\u2191" : "\u2193", " ", ctx_r2.Math.abs(card_r2.change).toFixed(1), "% ");
  }
}
function SmartDashboardComponent_For_14_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 37);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const card_r2 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(card_r2.changeLabel);
  }
}
function SmartDashboardComponent_For_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 32);
    \u0275\u0275domListener("click", function SmartDashboardComponent_For_14_Template_div_click_0_listener() {
      const card_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onMetricClick(card_r2));
    });
    \u0275\u0275domElementStart(1, "div", 33)(2, "span", 34);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(4, SmartDashboardComponent_For_14_Conditional_4_Template, 2, 10, "span", 35);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 3);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div", 36);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(9, SmartDashboardComponent_For_14_Conditional_9_Template, 2, 1, "div", 37);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const card_r2 = ctx.$implicit;
    \u0275\u0275styleProp("background", card_r2.bgGradient)("border-color", card_r2.color + "30");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(card_r2.icon);
    \u0275\u0275advance();
    \u0275\u0275conditional(card_r2.change !== void 0 ? 4 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(card_r2.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(card_r2.label);
    \u0275\u0275advance();
    \u0275\u0275conditional(card_r2.changeLabel ? 9 : -1);
  }
}
function SmartDashboardComponent_For_25_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 45);
    \u0275\u0275domListener("click", function SmartDashboardComponent_For_25_Conditional_9_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const insight_r5 = \u0275\u0275nextContext().$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onInsightAction(insight_r5));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const insight_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", insight_r5.actionLabel, " \u2192 ");
  }
}
function SmartDashboardComponent_For_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 39)(1, "div", 40)(2, "span", 34);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 41)(5, "div", 42);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div", 43);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(9, SmartDashboardComponent_For_25_Conditional_9_Template, 2, 1, "button", 44);
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const insight_r5 = ctx.$implicit;
    \u0275\u0275classProp("border-green-500/30", insight_r5.type === "success")("border-yellow-500/30", insight_r5.type === "warning")("border-blue-500/30", insight_r5.type === "info")("border-purple-500/30", insight_r5.type === "tip");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(insight_r5.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(insight_r5.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(insight_r5.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(insight_r5.actionLabel ? 9 : -1);
  }
}
function SmartDashboardComponent_For_34_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 46);
    \u0275\u0275domListener("click", function SmartDashboardComponent_For_34_Template_div_click_0_listener() {
      const lead_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onLeadClick(lead_r7));
    });
    \u0275\u0275domElementStart(1, "div", 47);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 48);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 49)(6, "div", 50);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "div", 36);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(10, "div", 51)(11, "div", 52);
    \u0275\u0275text(12);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(13, "div", 53);
    \u0275\u0275text(14);
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const lead_r7 = ctx.$implicit;
    const \u0275$index_99_r8 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-amber-500/20", \u0275$index_99_r8 === 0)("text-amber-400", \u0275$index_99_r8 === 0)("bg-slate-700", \u0275$index_99_r8 !== 0)("text-slate-400", \u0275$index_99_r8 !== 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", \u0275$index_99_r8 + 1, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.getInitial(lead_r7.contactId), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u5BA2\u6236 ", lead_r7.contactId.slice(-6));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", lead_r7.activityCount, " \u6B21\u4E92\u52D5 \xB7 ", ctx_r2.formatDate(lead_r7.lastActivity), " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("color", ctx_r2.getHeatColor(lead_r7.heatLevel));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", lead_r7.totalScore, " ");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r2.getHeatColor(lead_r7.heatLevel));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r2.getHeatIcon(lead_r7.heatLevel), " ", ctx_r2.getHeatLabel(lead_r7.heatLevel), " ");
  }
}
function SmartDashboardComponent_ForEmpty_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 21)(1, "div", 54);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "p");
    \u0275\u0275text(4, "\u66AB\u7121\u71B1\u9580\u5BA2\u6236\u6578\u64DA");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p", 55);
    \u0275\u0275text(6, "\u958B\u59CB\u767C\u9001\u6D88\u606F\u4EE5\u751F\u6210\u8A55\u5206");
    \u0275\u0275domElementEnd()();
  }
}
function SmartDashboardComponent_For_42_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 56);
    \u0275\u0275domListener("click", function SmartDashboardComponent_For_42_Template_button_click_0_listener() {
      const action_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.navigateTo.emit(action_r10.view));
    });
    \u0275\u0275domElementStart(1, "div", 57);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 58);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 59);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const action_r10 = ctx.$implicit;
    \u0275\u0275styleProp("background", action_r10.color + "15")("border", "1px solid " + action_r10.color + "30");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r10.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r10.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r10.description);
  }
}
function SmartDashboardComponent_For_48_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 27)(1, "div", 60);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 49)(4, "div", 61);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "div", 62);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(8, "div", 63);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const activity_r11 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-blue-500/20", activity_r11.type === "message")("bg-green-500/20", activity_r11.type === "reply")("bg-purple-500/20", activity_r11.type === "conversion")("bg-amber-500/20", activity_r11.type === "lead")("bg-slate-700", activity_r11.type === "system");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", activity_r11.icon, " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(activity_r11.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(activity_r11.description);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(activity_r11.time);
  }
}
function SmartDashboardComponent_ForEmpty_49_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 28);
    \u0275\u0275text(1, " \u66AB\u7121\u6D3B\u52D5\u8A18\u9304 ");
    \u0275\u0275domElementEnd();
  }
}
function SmartDashboardComponent_Conditional_50_For_8_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 41)(1, "div", 68)(2, "span", 4);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 69);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "div", 70);
    \u0275\u0275domElement(7, "div", 71);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const variant_r12 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(variant_r12.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", variant_r12.stats.conversionRate.toFixed(1), "%");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", variant_r12.stats.conversionRate * 2, "%");
  }
}
function SmartDashboardComponent_Conditional_50_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 65)(1, "div", 66);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 67);
    \u0275\u0275repeaterCreate(4, SmartDashboardComponent_Conditional_50_For_8_For_5_Template, 8, 4, "div", 41, _forTrack0);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const test_r13 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(test_r13.name);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(test_r13.variants);
  }
}
function SmartDashboardComponent_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 29)(1, "div", 12)(2, "h2", 13);
    \u0275\u0275text(3, " \u{1F9EA} \u904B\u884C\u4E2D\u7684 A/B \u6E2C\u8A66 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 64);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "div", 15);
    \u0275\u0275repeaterCreate(7, SmartDashboardComponent_Conditional_50_For_8_Template, 6, 1, "div", 65, _forTrack0);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", ctx_r2.abTestingService.activeTests().length, " \u500B\u6E2C\u8A66 ");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.abTestingService.activeTests().slice(0, 2));
  }
}
var SmartDashboardComponent = class _SmartDashboardComponent {
  constructor() {
    this.scoringService = inject(LeadScoringService);
    this.abTestingService = inject(ABTestingService);
    this.navigateTo = output();
    this.isRefreshing = signal(false, ...ngDevMode ? [{ debugName: "isRefreshing" }] : []);
    this.Math = Math;
    this.quickActions = [
      { id: "q1", icon: "\u{1F3AF}", label: "\u7B56\u7565\u898F\u5283", description: "AI \u71DF\u92B7\u52A9\u624B", color: "#f97316", view: "ai-assistant" },
      { id: "q2", icon: "\u{1F916}", label: "\u81EA\u52D5\u57F7\u884C", description: "AI \u5718\u968A\u92B7\u552E", color: "#a855f7", view: "ai-team" },
      { id: "q3", icon: "\u{1F4C7}", label: "\u8CC7\u6E90\u4E2D\u5FC3", description: "\u7BA1\u7406\u806F\u7E6B\u4EBA", color: "#22c55e", view: "resource-center" },
      { id: "q4", icon: "\u{1F4CA}", label: "\u6578\u64DA\u5206\u6790", description: "\u67E5\u770B\u5831\u544A", color: "#06b6d4", view: "analytics" }
    ];
    this.metricCards = computed(() => {
      const stats = this.scoringService.stats();
      return [
        {
          id: "m1",
          icon: "\u{1F465}",
          label: "\u7E3D\u806F\u7E6B\u4EBA",
          value: stats.total,
          change: 12.5,
          changeLabel: "\u8F03\u4E0A\u9031",
          color: "#3b82f6",
          bgGradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05))"
        },
        {
          id: "m2",
          icon: "\u{1F525}",
          label: "\u71B1\u9580\u5BA2\u6236",
          value: stats.byLevel.hot + stats.byLevel.burning,
          change: 8.3,
          changeLabel: "\u9AD8\u8CFC\u8CB7\u610F\u5411",
          color: "#f97316",
          bgGradient: "linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 88, 12, 0.05))"
        },
        {
          id: "m3",
          icon: "\u{1F4CA}",
          label: "\u5E73\u5747\u8A55\u5206",
          value: stats.avgScore.toFixed(0),
          change: stats.avgScore > 30 ? 5.2 : -2.1,
          changeLabel: "\u4E92\u52D5\u71B1\u5EA6",
          color: "#22c55e",
          bgGradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))"
        },
        {
          id: "m4",
          icon: "\u{1F9EA}",
          label: "A/B \u6E2C\u8A66",
          value: this.abTestingService.stats().running,
          changeLabel: "\u904B\u884C\u4E2D",
          color: "#a855f7",
          bgGradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(139, 92, 246, 0.05))"
        }
      ];
    }, ...ngDevMode ? [{ debugName: "metricCards" }] : []);
    this.aiInsights = signal([], ...ngDevMode ? [{ debugName: "aiInsights" }] : []);
    this.hotLeads = computed(() => this.scoringService.getHotLeads(5), ...ngDevMode ? [{ debugName: "hotLeads" }] : []);
    this.recentActivities = signal([], ...ngDevMode ? [{ debugName: "recentActivities" }] : []);
  }
  ngOnInit() {
    this.generateInsights();
    this.loadRecentActivities();
  }
  ngOnDestroy() {
  }
  /**
   * 獲取問候語
   */
  getGreeting() {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    if (hour < 12)
      return "\u65E9\u5B89 \u2600\uFE0F";
    if (hour < 18)
      return "\u5348\u5B89 \u{1F324}\uFE0F";
    return "\u665A\u5B89 \u{1F319}";
  }
  /**
   * 獲取今日日期
   */
  getTodayDate() {
    return (/* @__PURE__ */ new Date()).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    });
  }
  /**
   * 刷新數據
   */
  async refresh() {
    this.isRefreshing.set(true);
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    this.generateInsights();
    this.loadRecentActivities();
    this.isRefreshing.set(false);
  }
  /**
   * 生成 AI 洞察
   */
  generateInsights() {
    const stats = this.scoringService.stats();
    const insights = [];
    if (stats.byLevel.burning > 0) {
      insights.push({
        id: "i1",
        icon: "\u{1F3AF}",
        type: "success",
        title: `${stats.byLevel.burning} \u500B\u7206\u71B1\u5BA2\u6236`,
        description: "\u9019\u4E9B\u5BA2\u6236\u8CFC\u8CB7\u610F\u5411\u6975\u9AD8\uFF0C\u5EFA\u8B70\u7ACB\u5373\u8DDF\u9032\uFF01",
        action: "hot-leads",
        actionLabel: "\u7ACB\u5373\u67E5\u770B"
      });
    }
    if (stats.byLevel.cold > stats.total * 0.5) {
      insights.push({
        id: "i2",
        icon: "\u26A0\uFE0F",
        type: "warning",
        title: "\u8D85\u904E\u534A\u6578\u5BA2\u6236\u8655\u65BC\u51B7\u6DE1\u72C0\u614B",
        description: "\u5EFA\u8B70\u91CD\u65B0\u555F\u52D5\u71DF\u92B7\u6D3B\u52D5\uFF0C\u63D0\u5347\u5BA2\u6236\u4E92\u52D5",
        action: "ai-assistant",
        actionLabel: "\u5275\u5EFA\u71DF\u92B7\u6D3B\u52D5"
      });
    }
    const abStats = this.abTestingService.stats();
    if (abStats.completed > 0 && abStats.avgConversionLift > 10) {
      insights.push({
        id: "i3",
        icon: "\u{1F4C8}",
        type: "success",
        title: `A/B \u6E2C\u8A66\u63D0\u5347\u8F49\u5316 ${abStats.avgConversionLift.toFixed(1)}%`,
        description: "\u60A8\u7684\u6E2C\u8A66\u7B56\u7565\u6548\u679C\u986F\u8457\uFF0C\u5EFA\u8B70\u7E7C\u7E8C\u512A\u5316",
        action: "analytics",
        actionLabel: "\u67E5\u770B\u8A73\u60C5"
      });
    }
    if (insights.length < 2) {
      insights.push({
        id: "i4",
        icon: "\u{1F4A1}",
        type: "tip",
        title: "\u4F7F\u7528 AI \u7B56\u7565\u898F\u5283",
        description: "\u8B93 AI \u5E6B\u60A8\u751F\u6210\u9AD8\u8F49\u5316\u7684\u71DF\u92B7\u7B56\u7565",
        action: "ai-assistant",
        actionLabel: "\u958B\u59CB\u898F\u5283"
      });
    }
    if (insights.length < 4) {
      insights.push({
        id: "i5",
        icon: "\u{1F916}",
        type: "info",
        title: "\u5617\u8A66 AI \u5718\u968A\u92B7\u552E",
        description: "\u4E00\u53E5\u8A71\u555F\u52D5 AI \u81EA\u52D5\u5316\u92B7\u552E\u6D41\u7A0B",
        action: "ai-team",
        actionLabel: "\u4E86\u89E3\u66F4\u591A"
      });
    }
    this.aiInsights.set(insights.slice(0, 4));
  }
  /**
   * 重新生成洞察
   */
  regenerateInsights() {
    this.generateInsights();
  }
  /**
   * 載入最近活動
   */
  loadRecentActivities() {
    const history = this.scoringService.globalHistory();
    const activities = history.slice(0, 10).map((h) => ({
      id: h.id,
      icon: this.getActivityIcon(h.action),
      title: h.reason,
      description: `\u5BA2\u6236 ${h.contactId.slice(-6)} \xB7 ${h.points > 0 ? "+" : ""}${h.points} \u5206`,
      time: this.formatTime(h.timestamp),
      type: this.getActivityType(h.action)
    }));
    this.recentActivities.set(activities);
  }
  /**
   * 獲取活動圖標
   */
  getActivityIcon(action) {
    const icons = {
      message_sent: "\u{1F4E4}",
      message_replied: "\u{1F4AC}",
      positive_reply: "\u{1F60A}",
      negative_reply: "\u{1F61E}",
      price_inquiry: "\u{1F4B0}",
      demo_requested: "\u{1F3AC}",
      meeting_scheduled: "\u{1F4C5}",
      referral_made: "\u{1F91D}"
    };
    return icons[action] || "\u{1F4CC}";
  }
  /**
   * 獲取活動類型
   */
  getActivityType(action) {
    if (action.includes("reply"))
      return "reply";
    if (action.includes("message"))
      return "message";
    if (action.includes("meeting") || action.includes("demo"))
      return "conversion";
    return "lead";
  }
  /**
   * 格式化時間
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    if (diffMins < 1)
      return "\u525B\u525B";
    if (diffMins < 60)
      return `${diffMins} \u5206\u9418\u524D`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `${diffHours} \u5C0F\u6642\u524D`;
    return date.toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
  }
  /**
   * 獲取首字母
   */
  getInitial(id) {
    return id.charAt(0).toUpperCase();
  }
  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date)
      return "\u7121\u8A18\u9304";
    return this.formatTime(date);
  }
  /**
   * 獲取熱度顏色
   */
  getHeatColor(level) {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.color;
  }
  /**
   * 獲取熱度圖標
   */
  getHeatIcon(level) {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.icon;
  }
  /**
   * 獲取熱度標籤
   */
  getHeatLabel(level) {
    const config = this.scoringService.getHeatLevelConfig(level);
    return config.label;
  }
  /**
   * 指標卡片點擊
   */
  onMetricClick(card) {
    switch (card.id) {
      case "m1":
        this.navigateTo.emit("resource-center");
        break;
      case "m2":
        this.navigateTo.emit("leads");
        break;
      case "m3":
        this.navigateTo.emit("analytics");
        break;
      case "m4":
        break;
    }
  }
  /**
   * 洞察操作
   */
  onInsightAction(insight) {
    if (insight.action) {
      this.navigateTo.emit(insight.action);
    }
  }
  /**
   * 客戶點擊
   */
  onLeadClick(lead) {
    this.navigateTo.emit("leads");
  }
  static {
    this.\u0275fac = function SmartDashboardComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartDashboardComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SmartDashboardComponent, selectors: [["app-smart-dashboard"]], outputs: { navigateTo: "navigateTo" }, decls: 51, vars: 7, consts: [[1, "smart-dashboard", "h-full", "overflow-y-auto", "bg-gradient-to-br", "from-slate-900", "via-slate-800", "to-slate-900"], [1, "p-6", "space-y-6"], [1, "flex", "items-center", "justify-between"], [1, "text-3xl", "font-bold", "text-white", "mb-1"], [1, "text-slate-400"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-xl", "transition-colors", "flex", "items-center", "gap-2", "disabled:opacity-50", 3, "click", "disabled"], ["fill", "none", "viewBox", "0 0 24 24", 1, "w-4", "h-4", "animate-spin"], [1, "grid", "grid-cols-4", "gap-4"], [1, "p-5", "rounded-2xl", "border", "transition-all", "hover:scale-[1.02]", "cursor-pointer", 3, "background", "border-color"], [1, "grid", "grid-cols-3", "gap-6"], [1, "col-span-2", "space-y-6"], [1, "p-5", "bg-gradient-to-r", "from-purple-500/10", "via-cyan-500/10", "to-blue-500/10", "rounded-2xl", "border", "border-purple-500/20"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "text-lg", "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-sm", "text-cyan-400", "hover:text-cyan-300", "transition-colors", 3, "click"], [1, "grid", "grid-cols-2", "gap-4"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/30", "hover:border-slate-600/50", "transition-colors", 3, "border-green-500/30", "border-yellow-500/30", "border-blue-500/30", "border-purple-500/30"], [1, "p-5", "bg-slate-800/30", "rounded-2xl", "border", "border-slate-700/50"], [1, "text-sm", "text-slate-400", "hover:text-white", "transition-colors", 3, "click"], [1, "space-y-3"], [1, "flex", "items-center", "gap-4", "p-3", "bg-slate-800/50", "rounded-xl", "hover:bg-slate-700/50", "transition-colors", "cursor-pointer"], [1, "text-center", "py-8", "text-slate-500"], [1, "space-y-6"], [1, "text-lg", "font-semibold", "text-white", "mb-4", "flex", "items-center", "gap-2"], [1, "grid", "grid-cols-2", "gap-3"], [1, "p-4", "rounded-xl", "text-left", "transition-all", "hover:scale-[1.03]", "group", 3, "background", "border"], [1, "space-y-3", "max-h-80", "overflow-y-auto"], [1, "flex", "items-start", "gap-3", "p-2", "rounded-lg", "hover:bg-slate-700/30", "transition-colors"], [1, "text-center", "py-6", "text-slate-500", "text-sm"], [1, "p-5", "bg-gradient-to-r", "from-amber-500/10", "to-orange-500/10", "rounded-2xl", "border", "border-amber-500/20"], ["cx", "12", "cy", "12", "r", "10", "stroke", "currentColor", "stroke-width", "4", 1, "opacity-25"], ["fill", "currentColor", "d", "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z", 1, "opacity-75"], [1, "p-5", "rounded-2xl", "border", "transition-all", "hover:scale-[1.02]", "cursor-pointer", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-2xl"], [1, "text-xs", "px-2", "py-1", "rounded-full", 3, "bg-green-500/20", "text-green-400", "bg-red-500/20", "text-red-400"], [1, "text-sm", "text-slate-400"], [1, "text-xs", "text-slate-500", "mt-1"], [1, "text-xs", "px-2", "py-1", "rounded-full"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/30", "hover:border-slate-600/50", "transition-colors"], [1, "flex", "items-start", "gap-3"], [1, "flex-1"], [1, "font-medium", "text-white", "mb-1"], [1, "text-sm", "text-slate-400", "mb-2"], [1, "text-xs", "text-cyan-400", "hover:text-cyan-300", "transition-colors"], [1, "text-xs", "text-cyan-400", "hover:text-cyan-300", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-4", "p-3", "bg-slate-800/50", "rounded-xl", "hover:bg-slate-700/50", "transition-colors", "cursor-pointer", 3, "click"], [1, "w-8", "h-8", "rounded-lg", "flex", "items-center", "justify-center", "font-bold", "text-sm"], [1, "w-10", "h-10", "rounded-full", "bg-gradient-to-br", "from-purple-500", "to-pink-500", "flex", "items-center", "justify-center", "text-white", "font-bold"], [1, "flex-1", "min-w-0"], [1, "text-white", "font-medium", "truncate"], [1, "text-right"], [1, "text-lg", "font-bold"], [1, "text-xs", "flex", "items-center", "gap-1"], [1, "text-4xl", "mb-2"], [1, "text-sm", "mt-1"], [1, "p-4", "rounded-xl", "text-left", "transition-all", "hover:scale-[1.03]", "group", 3, "click"], [1, "text-2xl", "mb-2"], [1, "text-sm", "font-medium", "text-white"], [1, "text-xs", "text-slate-400", "mt-0.5"], [1, "w-8", "h-8", "rounded-lg", "flex", "items-center", "justify-center", "text-sm"], [1, "text-sm", "text-white"], [1, "text-xs", "text-slate-500", "truncate"], [1, "text-xs", "text-slate-500", "whitespace-nowrap"], [1, "px-2", "py-1", "bg-amber-500/20", "text-amber-400", "text-xs", "rounded-full"], [1, "p-4", "bg-slate-800/50", "rounded-xl"], [1, "font-medium", "text-white", "mb-2"], [1, "flex", "items-center", "gap-4", "text-sm"], [1, "flex", "items-center", "justify-between", "mb-1"], [1, "text-white"], [1, "h-2", "bg-slate-700", "rounded-full", "overflow-hidden"], [1, "h-full", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "transition-all"]], template: function SmartDashboardComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div")(4, "h1", 3);
        \u0275\u0275text(5);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(6, "p", 4);
        \u0275\u0275text(7);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(8, "button", 5);
        \u0275\u0275domListener("click", function SmartDashboardComponent_Template_button_click_8_listener() {
          return ctx.refresh();
        });
        \u0275\u0275conditionalCreate(9, SmartDashboardComponent_Conditional_9_Template, 3, 0, ":svg:svg", 6)(10, SmartDashboardComponent_Conditional_10_Template, 1, 0);
        \u0275\u0275text(11, " \u5237\u65B0 ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(12, "div", 7);
        \u0275\u0275repeaterCreate(13, SmartDashboardComponent_For_14_Template, 10, 9, "div", 8, _forTrack0);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(15, "div", 9)(16, "div", 10)(17, "div", 11)(18, "div", 12)(19, "h2", 13);
        \u0275\u0275text(20, " \u{1F916} AI \u667A\u80FD\u6D1E\u5BDF ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(21, "button", 14);
        \u0275\u0275domListener("click", function SmartDashboardComponent_Template_button_click_21_listener() {
          return ctx.regenerateInsights();
        });
        \u0275\u0275text(22, " \u2728 \u91CD\u65B0\u5206\u6790 ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(23, "div", 15);
        \u0275\u0275repeaterCreate(24, SmartDashboardComponent_For_25_Template, 10, 12, "div", 16, _forTrack0);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(26, "div", 17)(27, "div", 12)(28, "h2", 13);
        \u0275\u0275text(29, " \u{1F525} \u71B1\u9580\u5BA2\u6236 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(30, "button", 18);
        \u0275\u0275domListener("click", function SmartDashboardComponent_Template_button_click_30_listener() {
          return ctx.navigateTo.emit("leads");
        });
        \u0275\u0275text(31, " \u67E5\u770B\u5168\u90E8 \u2192 ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(32, "div", 19);
        \u0275\u0275repeaterCreate(33, SmartDashboardComponent_For_34_Template, 15, 20, "div", 20, _forTrack1, false, SmartDashboardComponent_ForEmpty_35_Template, 7, 0, "div", 21);
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(36, "div", 22)(37, "div", 17)(38, "h2", 23);
        \u0275\u0275text(39, " \u26A1 \u5FEB\u901F\u64CD\u4F5C ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(40, "div", 24);
        \u0275\u0275repeaterCreate(41, SmartDashboardComponent_For_42_Template, 7, 7, "button", 25, _forTrack0);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(43, "div", 17)(44, "h2", 23);
        \u0275\u0275text(45, " \u{1F4E1} \u5BE6\u6642\u52D5\u614B ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(46, "div", 26);
        \u0275\u0275repeaterCreate(47, SmartDashboardComponent_For_48_Template, 10, 14, "div", 27, _forTrack0, false, SmartDashboardComponent_ForEmpty_49_Template, 2, 0, "div", 28);
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275conditionalCreate(50, SmartDashboardComponent_Conditional_50_Template, 9, 1, "div", 29);
        \u0275\u0275domElementEnd()();
      }
      if (rf & 2) {
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate1(" ", ctx.getGreeting(), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.getTodayDate(), " \xB7 \u8B93 AI \u52A9\u60A8\u9AD8\u6548\u71DF\u92B7 ");
        \u0275\u0275advance();
        \u0275\u0275domProperty("disabled", ctx.isRefreshing());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isRefreshing() ? 9 : 10);
        \u0275\u0275advance(4);
        \u0275\u0275repeater(ctx.metricCards());
        \u0275\u0275advance(11);
        \u0275\u0275repeater(ctx.aiInsights());
        \u0275\u0275advance(9);
        \u0275\u0275repeater(ctx.hotLeads());
        \u0275\u0275advance(8);
        \u0275\u0275repeater(ctx.quickActions);
        \u0275\u0275advance(6);
        \u0275\u0275repeater(ctx.recentActivities());
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.abTestingService.activeTests().length > 0 ? 50 : -1);
      }
    }, dependencies: [CommonModule], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  height: 100%;\n}\n.smart-dashboard[_ngcontent-%COMP%]   [_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 6px;\n}\n.smart-dashboard[_ngcontent-%COMP%]   [_ngcontent-%COMP%]::-webkit-scrollbar-track {\n  background: transparent;\n}\n.smart-dashboard[_ngcontent-%COMP%]   [_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: rgb(71, 85, 105);\n  border-radius: 3px;\n}\n/*# sourceMappingURL=smart-dashboard.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartDashboardComponent, [{
    type: Component,
    args: [{ selector: "app-smart-dashboard", standalone: true, imports: [CommonModule], template: `
    <div class="smart-dashboard h-full overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div class="p-6 space-y-6">
        
        <!-- \u6B61\u8FCE\u5340\u57DF -->
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white mb-1">
              {{ getGreeting() }}
            </h1>
            <p class="text-slate-400">
              {{ getTodayDate() }} \xB7 \u8B93 AI \u52A9\u60A8\u9AD8\u6548\u71DF\u92B7
            </p>
          </div>
          
          <button (click)="refresh()"
                  [disabled]="isRefreshing()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50">
            @if (isRefreshing()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            } @else {
              \u{1F504}
            }
            \u5237\u65B0
          </button>
        </div>
        
        <!-- \u95DC\u9375\u6307\u6A19\u5361\u7247 -->
        <div class="grid grid-cols-4 gap-4">
          @for (card of metricCards(); track card.id) {
            <div class="p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer"
                 [style.background]="card.bgGradient"
                 [style.border-color]="card.color + '30'"
                 (click)="onMetricClick(card)">
              <div class="flex items-center justify-between mb-3">
                <span class="text-2xl">{{ card.icon }}</span>
                @if (card.change !== undefined) {
                  <span class="text-xs px-2 py-1 rounded-full"
                        [class.bg-green-500/20]="card.change >= 0"
                        [class.text-green-400]="card.change >= 0"
                        [class.bg-red-500/20]="card.change < 0"
                        [class.text-red-400]="card.change < 0">
                    {{ card.change >= 0 ? '\u2191' : '\u2193' }} {{ Math.abs(card.change).toFixed(1) }}%
                  </span>
                }
              </div>
              <div class="text-3xl font-bold text-white mb-1">{{ card.value }}</div>
              <div class="text-sm text-slate-400">{{ card.label }}</div>
              @if (card.changeLabel) {
                <div class="text-xs text-slate-500 mt-1">{{ card.changeLabel }}</div>
              }
            </div>
          }
        </div>
        
        <!-- \u4E3B\u5167\u5BB9\u5340 -->
        <div class="grid grid-cols-3 gap-6">
          
          <!-- \u5DE6\u5074\uFF1AAI \u6D1E\u5BDF + \u71B1\u9580\u5BA2\u6236 -->
          <div class="col-span-2 space-y-6">
            
            <!-- AI \u667A\u80FD\u6D1E\u5BDF -->
            <div class="p-5 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-blue-500/10 rounded-2xl border border-purple-500/20">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                  \u{1F916} AI \u667A\u80FD\u6D1E\u5BDF
                </h2>
                <button (click)="regenerateInsights()"
                        class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                  \u2728 \u91CD\u65B0\u5206\u6790
                </button>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                @for (insight of aiInsights(); track insight.id) {
                  <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                       [class.border-green-500/30]="insight.type === 'success'"
                       [class.border-yellow-500/30]="insight.type === 'warning'"
                       [class.border-blue-500/30]="insight.type === 'info'"
                       [class.border-purple-500/30]="insight.type === 'tip'">
                    <div class="flex items-start gap-3">
                      <span class="text-2xl">{{ insight.icon }}</span>
                      <div class="flex-1">
                        <div class="font-medium text-white mb-1">{{ insight.title }}</div>
                        <div class="text-sm text-slate-400 mb-2">{{ insight.description }}</div>
                        @if (insight.actionLabel) {
                          <button (click)="onInsightAction(insight)"
                                  class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                            {{ insight.actionLabel }} \u2192
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- \u71B1\u9580\u5BA2\u6236\u63A8\u85A6 -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                  \u{1F525} \u71B1\u9580\u5BA2\u6236
                </h2>
                <button (click)="navigateTo.emit('leads')"
                        class="text-sm text-slate-400 hover:text-white transition-colors">
                  \u67E5\u770B\u5168\u90E8 \u2192
                </button>
              </div>
              
              <div class="space-y-3">
                @for (lead of hotLeads(); track lead.contactId; let i = $index) {
                  <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-xl hover:bg-slate-700/50 transition-colors cursor-pointer"
                       (click)="onLeadClick(lead)">
                    <!-- \u6392\u540D -->
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                         [class.bg-amber-500/20]="i === 0"
                         [class.text-amber-400]="i === 0"
                         [class.bg-slate-700]="i !== 0"
                         [class.text-slate-400]="i !== 0">
                      {{ i + 1 }}
                    </div>
                    
                    <!-- \u982D\u50CF -->
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                      {{ getInitial(lead.contactId) }}
                    </div>
                    
                    <!-- \u4FE1\u606F -->
                    <div class="flex-1 min-w-0">
                      <div class="text-white font-medium truncate">\u5BA2\u6236 {{ lead.contactId.slice(-6) }}</div>
                      <div class="text-sm text-slate-400">
                        {{ lead.activityCount }} \u6B21\u4E92\u52D5 \xB7 {{ formatDate(lead.lastActivity) }}
                      </div>
                    </div>
                    
                    <!-- \u8A55\u5206 -->
                    <div class="text-right">
                      <div class="text-lg font-bold"
                           [style.color]="getHeatColor(lead.heatLevel)">
                        {{ lead.totalScore }}
                      </div>
                      <div class="text-xs flex items-center gap-1"
                           [style.color]="getHeatColor(lead.heatLevel)">
                        {{ getHeatIcon(lead.heatLevel) }}
                        {{ getHeatLabel(lead.heatLevel) }}
                      </div>
                    </div>
                  </div>
                } @empty {
                  <div class="text-center py-8 text-slate-500">
                    <div class="text-4xl mb-2">\u{1F4ED}</div>
                    <p>\u66AB\u7121\u71B1\u9580\u5BA2\u6236\u6578\u64DA</p>
                    <p class="text-sm mt-1">\u958B\u59CB\u767C\u9001\u6D88\u606F\u4EE5\u751F\u6210\u8A55\u5206</p>
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- \u53F3\u5074\uFF1A\u5FEB\u901F\u64CD\u4F5C + \u6D3B\u52D5\u6D41 -->
          <div class="space-y-6">
            
            <!-- \u5FEB\u901F\u64CD\u4F5C -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                \u26A1 \u5FEB\u901F\u64CD\u4F5C
              </h2>
              
              <div class="grid grid-cols-2 gap-3">
                @for (action of quickActions; track action.id) {
                  <button (click)="navigateTo.emit(action.view)"
                          class="p-4 rounded-xl text-left transition-all hover:scale-[1.03] group"
                          [style.background]="action.color + '15'"
                          [style.border]="'1px solid ' + action.color + '30'">
                    <div class="text-2xl mb-2">{{ action.icon }}</div>
                    <div class="text-sm font-medium text-white">{{ action.label }}</div>
                    <div class="text-xs text-slate-400 mt-0.5">{{ action.description }}</div>
                  </button>
                }
              </div>
            </div>
            
            <!-- \u5BE6\u6642\u6D3B\u52D5 -->
            <div class="p-5 bg-slate-800/30 rounded-2xl border border-slate-700/50">
              <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                \u{1F4E1} \u5BE6\u6642\u52D5\u614B
              </h2>
              
              <div class="space-y-3 max-h-80 overflow-y-auto">
                @for (activity of recentActivities(); track activity.id) {
                  <div class="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                         [class.bg-blue-500/20]="activity.type === 'message'"
                         [class.bg-green-500/20]="activity.type === 'reply'"
                         [class.bg-purple-500/20]="activity.type === 'conversion'"
                         [class.bg-amber-500/20]="activity.type === 'lead'"
                         [class.bg-slate-700]="activity.type === 'system'">
                      {{ activity.icon }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-white">{{ activity.title }}</div>
                      <div class="text-xs text-slate-500 truncate">{{ activity.description }}</div>
                    </div>
                    <div class="text-xs text-slate-500 whitespace-nowrap">{{ activity.time }}</div>
                  </div>
                } @empty {
                  <div class="text-center py-6 text-slate-500 text-sm">
                    \u66AB\u7121\u6D3B\u52D5\u8A18\u9304
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        
        <!-- A/B \u6E2C\u8A66\u6458\u8981\uFF08\u5982\u679C\u6709\u904B\u884C\u4E2D\u7684\u6E2C\u8A66\uFF09 -->
        @if (abTestingService.activeTests().length > 0) {
          <div class="p-5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-white flex items-center gap-2">
                \u{1F9EA} \u904B\u884C\u4E2D\u7684 A/B \u6E2C\u8A66
              </h2>
              <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                {{ abTestingService.activeTests().length }} \u500B\u6E2C\u8A66
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              @for (test of abTestingService.activeTests().slice(0, 2); track test.id) {
                <div class="p-4 bg-slate-800/50 rounded-xl">
                  <div class="font-medium text-white mb-2">{{ test.name }}</div>
                  <div class="flex items-center gap-4 text-sm">
                    @for (variant of test.variants; track variant.id) {
                      <div class="flex-1">
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-slate-400">{{ variant.name }}</span>
                          <span class="text-white">{{ variant.stats.conversionRate.toFixed(1) }}%</span>
                        </div>
                        <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                               [style.width.%]="variant.stats.conversionRate * 2">
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        }
        
      </div>
    </div>
  `, styles: ["/* angular:styles/component:css;52e183525ab7d5485cdd6c302fa0767b2ebe62b4ecfcb5d97e6211df3bbebc5a;D:/tgkz2026/src/components/smart-dashboard.component.ts */\n:host {\n  display: block;\n  height: 100%;\n}\n.smart-dashboard ::-webkit-scrollbar {\n  width: 6px;\n}\n.smart-dashboard ::-webkit-scrollbar-track {\n  background: transparent;\n}\n.smart-dashboard ::-webkit-scrollbar-thumb {\n  background: rgb(71, 85, 105);\n  border-radius: 3px;\n}\n/*# sourceMappingURL=smart-dashboard.component.css.map */\n"] }]
  }], null, { navigateTo: [{ type: Output, args: ["navigateTo"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SmartDashboardComponent, { className: "SmartDashboardComponent", filePath: "src/components/smart-dashboard.component.ts", lineNumber: 345 });
})();

// src/quick-workflow.component.ts
var _forTrack02 = ($index, $item) => $item.id;
function QuickWorkflowComponent_Conditional_12_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 7)(1, "div", 10)(2, "span", 11);
    \u0275\u0275text(3, "\u{1F4A1}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 12);
    \u0275\u0275text(5, "AI \u63A8\u85A6");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(6, "h3", 13);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "p", 14);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "button", 15);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_12_Conditional_1_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startWorkflow(ctx_r1.recommendedWorkflow()));
    });
    \u0275\u0275text(11, " \u958B\u59CB\u6B64\u6D41\u7A0B ");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r1.recommendedWorkflow().title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.recommendedWorkflow().description);
  }
}
function QuickWorkflowComponent_Conditional_12_For_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 16);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_12_For_4_Template_div_click_0_listener() {
      const workflow_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startWorkflow(workflow_r4));
    });
    \u0275\u0275domElementStart(1, "div", 17)(2, "span", 18);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 19)(5, "div", 20)(6, "h4", 21);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "span", 22);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(10, "p", 23);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(12, "div", 24)(13, "span");
    \u0275\u0275text(14);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275domElementEnd()()()()();
  }
  if (rf & 2) {
    const workflow_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(workflow_r4.icon);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", workflow_r4.title, " ");
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-green-500/20", workflow_r4.difficulty === "easy")("text-green-400", workflow_r4.difficulty === "easy")("bg-yellow-500/20", workflow_r4.difficulty === "medium")("text-yellow-400", workflow_r4.difficulty === "medium")("bg-red-500/20", workflow_r4.difficulty === "advanced")("text-red-400", workflow_r4.difficulty === "advanced");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getDifficultyLabel(workflow_r4.difficulty), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(workflow_r4.description);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("", workflow_r4.steps.length, " \u6B65\u9A5F");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u7D04 ", workflow_r4.estimatedTime);
  }
}
function QuickWorkflowComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 5);
    \u0275\u0275conditionalCreate(1, QuickWorkflowComponent_Conditional_12_Conditional_1_Template, 12, 2, "div", 7);
    \u0275\u0275domElementStart(2, "div", 8);
    \u0275\u0275repeaterCreate(3, QuickWorkflowComponent_Conditional_12_For_4_Template, 17, 18, "div", 9, _forTrack02);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.recommendedWorkflow() ? 1 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.workflows());
  }
}
function QuickWorkflowComponent_Conditional_13_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 29);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_13_For_3_Template_button_click_0_listener() {
      const category_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.activeCategory.set(category_r6.id));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const category_r6 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-purple-500", ctx_r1.activeCategory() === category_r6.id)("text-white", ctx_r1.activeCategory() === category_r6.id)("bg-slate-700/50", ctx_r1.activeCategory() !== category_r6.id)("text-slate-400", ctx_r1.activeCategory() !== category_r6.id)("hover:bg-slate-600/50", ctx_r1.activeCategory() !== category_r6.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", category_r6.icon, " ", category_r6.label, " ");
  }
}
function QuickWorkflowComponent_Conditional_13_For_6_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 31);
    \u0275\u0275text(1, " \u2B50 ");
    \u0275\u0275domElementEnd();
  }
}
function QuickWorkflowComponent_Conditional_13_For_6_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 32);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const action_r8 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", action_r8.badge, " ");
  }
}
function QuickWorkflowComponent_Conditional_13_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 30);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_13_For_6_Template_div_click_0_listener() {
      const action_r8 = \u0275\u0275restoreView(_r7).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.executeAction(action_r8));
    });
    \u0275\u0275conditionalCreate(1, QuickWorkflowComponent_Conditional_13_For_6_Conditional_1_Template, 2, 0, "div", 31);
    \u0275\u0275conditionalCreate(2, QuickWorkflowComponent_Conditional_13_For_6_Conditional_2_Template, 2, 1, "div", 32);
    \u0275\u0275domElementStart(3, "div", 33);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "h4", 34);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "p", 35);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const action_r8 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275conditional(action_r8.isRecommended ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(action_r8.badge ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r8.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", action_r8.title, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r8.description);
  }
}
function QuickWorkflowComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 5)(1, "div", 25);
    \u0275\u0275repeaterCreate(2, QuickWorkflowComponent_Conditional_13_For_3_Template, 2, 12, "button", 26, _forTrack02);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 27);
    \u0275\u0275repeaterCreate(5, QuickWorkflowComponent_Conditional_13_For_6_Template, 9, 5, "div", 28, _forTrack02);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.categories);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.filteredActions());
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Case_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2713 ");
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const \u0275$index_145_r10 = \u0275\u0275nextContext().$index;
    \u0275\u0275textInterpolate1(" ", \u0275$index_145_r10 + 1, " ");
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2717 ");
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Case_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const \u0275$index_145_r10 = \u0275\u0275nextContext().$index;
    \u0275\u0275textInterpolate1(" ", \u0275$index_145_r10 + 1, " ");
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 58);
    \u0275\u0275text(1, "\u53EF\u9078");
    \u0275\u0275domElementEnd();
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 61);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const step_r12 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.skipStep(step_r12));
    });
    \u0275\u0275text(1, " \u8DF3\u904E ");
    \u0275\u0275domElementEnd();
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 59)(1, "button", 15);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r11);
      const step_r12 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.executeStep(step_r12));
    });
    \u0275\u0275text(2, " \u57F7\u884C\u6B64\u6B65\u9A5F ");
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(3, QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Conditional_3_Template, 2, 0, "button", 60);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const step_r12 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275conditional(step_r12.isOptional ? 3 : -1);
  }
}
function QuickWorkflowComponent_Conditional_14_For_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 51)(1, "div", 55);
    \u0275\u0275conditionalCreate(2, QuickWorkflowComponent_Conditional_14_For_22_Case_2_Template, 1, 0)(3, QuickWorkflowComponent_Conditional_14_For_22_Case_3_Template, 1, 1)(4, QuickWorkflowComponent_Conditional_14_For_22_Case_4_Template, 1, 0)(5, QuickWorkflowComponent_Conditional_14_For_22_Case_5_Template, 1, 1);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "div", 56)(7, "div", 20)(8, "span", 11);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "h4", 57);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(12, QuickWorkflowComponent_Conditional_14_For_22_Conditional_12_Template, 2, 0, "span", 58);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(13, "p", 14);
    \u0275\u0275text(14);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(15, QuickWorkflowComponent_Conditional_14_For_22_Conditional_15_Template, 4, 1, "div", 59);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    let tmp_23_0;
    const step_r12 = ctx.$implicit;
    const \u0275$index_145_r10 = ctx.$index;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-green-500", step_r12.status === "completed")("text-white", step_r12.status === "completed")("bg-cyan-500", step_r12.status === "active")("text-white", step_r12.status === "active")("animate-pulse", step_r12.status === "active")("bg-slate-600", step_r12.status === "pending")("text-slate-400", step_r12.status === "pending")("bg-slate-700", step_r12.status === "skipped")("text-slate-500", step_r12.status === "skipped")("bg-red-500", step_r12.status === "error")("text-white", step_r12.status === "error");
    \u0275\u0275advance();
    \u0275\u0275conditional((tmp_23_0 = step_r12.status) === "completed" ? 2 : tmp_23_0 === "active" ? 3 : tmp_23_0 === "error" ? 4 : 5);
    \u0275\u0275advance(4);
    \u0275\u0275classProp("border-l-2", \u0275$index_145_r10 < ctx_r1.activeWorkflow().steps.length - 1)("border-green-500", step_r12.status === "completed")("border-cyan-500", step_r12.status === "active")("border-slate-600", step_r12.status === "pending" || step_r12.status === "skipped")("ml-5", \u0275$index_145_r10 < ctx_r1.activeWorkflow().steps.length - 1)("pl-8", \u0275$index_145_r10 < ctx_r1.activeWorkflow().steps.length - 1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(step_r12.icon);
    \u0275\u0275advance();
    \u0275\u0275classProp("text-white", step_r12.status === "active")("text-green-400", step_r12.status === "completed")("text-slate-400", step_r12.status === "pending")("text-slate-500", step_r12.status === "skipped");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r12.title, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r12.isOptional ? 12 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(step_r12.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r12.status === "active" ? 15 : -1);
  }
}
function QuickWorkflowComponent_Conditional_14_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 62);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_Conditional_26_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.finishWorkflow());
    });
    \u0275\u0275text(1, " \u{1F389} \u5B8C\u6210\u5DE5\u4F5C\u6D41 ");
    \u0275\u0275domElementEnd();
  }
}
function QuickWorkflowComponent_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 36);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeWorkflow());
    });
    \u0275\u0275domElementStart(1, "div", 37);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275domElementStart(2, "div", 38)(3, "div", 39)(4, "div", 40)(5, "span", 41);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div")(8, "h2", 42);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "p", 43);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(12, "button", 44);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeWorkflow());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(13, "svg", 45);
    \u0275\u0275domElement(14, "path", 46);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(15, "div", 47);
    \u0275\u0275domElement(16, "div", 48);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(17, "div", 49);
    \u0275\u0275text(18);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(19, "div", 50)(20, "div", 5);
    \u0275\u0275repeaterCreate(21, QuickWorkflowComponent_Conditional_14_For_22_Template, 16, 48, "div", 51, _forTrack02);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(23, "div", 52)(24, "button", 53);
    \u0275\u0275domListener("click", function QuickWorkflowComponent_Conditional_14_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeWorkflow());
    });
    \u0275\u0275text(25, " \u7A0D\u5F8C\u7E7C\u7E8C ");
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(26, QuickWorkflowComponent_Conditional_14_Conditional_26_Template, 2, 0, "button", 54);
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.activeWorkflow().icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.activeWorkflow().title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.activeWorkflow().description);
    \u0275\u0275advance(5);
    \u0275\u0275styleProp("width", ctx_r1.workflowProgress(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", ctx_r1.completedStepsCount(), "/", ctx_r1.activeWorkflow().steps.length, " \u6B65\u9A5F\u5B8C\u6210 ");
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.activeWorkflow().steps);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.isWorkflowComplete() ? 26 : -1);
  }
}
var QuickWorkflowComponent = class _QuickWorkflowComponent {
  constructor() {
    this.navigateTo = output();
    this.workflowCompleted = output();
    this.mode = signal("actions", ...ngDevMode ? [{ debugName: "mode" }] : []);
    this.activeCategory = signal("all", ...ngDevMode ? [{ debugName: "activeCategory" }] : []);
    this.activeWorkflow = signal(null, ...ngDevMode ? [{ debugName: "activeWorkflow" }] : []);
    this.categories = [
      { id: "all", icon: "\u{1F4CB}", label: "\u5168\u90E8" },
      { id: "account", icon: "\u{1F464}", label: "\u5E33\u865F" },
      { id: "resource", icon: "\u{1F50D}", label: "\u8CC7\u6E90" },
      { id: "automation", icon: "\u26A1", label: "\u81EA\u52D5\u5316" },
      { id: "message", icon: "\u{1F4AC}", label: "\u6D88\u606F" },
      { id: "analysis", icon: "\u{1F4CA}", label: "\u5206\u6790" }
    ];
    this.workflows = signal([
      {
        id: "quick-start",
        title: "\u5FEB\u901F\u958B\u59CB\u76E3\u63A7",
        description: "\u5F9E\u6DFB\u52A0\u5E33\u865F\u5230\u958B\u59CB\u76E3\u63A7\u7684\u5B8C\u6574\u6D41\u7A0B",
        icon: "\u{1F680}",
        category: "automation",
        estimatedTime: "10\u5206\u9418",
        difficulty: "easy",
        steps: [
          { id: "s1", title: "\u6DFB\u52A0\u76E3\u63A7\u5E33\u865F", description: "\u6DFB\u52A0\u4E26\u767B\u9304\u4E00\u500B Telegram \u5E33\u865F", icon: "\u{1F464}", status: "pending", isOptional: false, actionView: "add-account" },
          { id: "s2", title: "\u767C\u73FE\u76EE\u6A19\u7FA4\u7D44", description: "\u641C\u7D22\u4E26\u6DFB\u52A0\u8981\u76E3\u63A7\u7684\u7FA4\u7D44", icon: "\u{1F50D}", status: "pending", isOptional: false, actionView: "resources" },
          { id: "s3", title: "\u8A2D\u7F6E\u95DC\u9375\u8A5E", description: "\u914D\u7F6E\u89F8\u767C\u6D88\u606F\u7684\u95DC\u9375\u8A5E", icon: "\u{1F511}", status: "pending", isOptional: false, actionView: "automation" },
          { id: "s4", title: "\u958B\u59CB\u76E3\u63A7", description: "\u555F\u52D5\u76E3\u63A7\u7CFB\u7D71", icon: "\u25B6\uFE0F", status: "pending", isOptional: false, actionHandler: "start-monitoring" }
        ]
      },
      {
        id: "full-automation",
        title: "\u5B8C\u6574\u81EA\u52D5\u5316\u71DF\u92B7",
        description: "\u8A2D\u7F6E\u5F9E\u76E3\u63A7\u5230\u81EA\u52D5\u8DDF\u9032\u7684\u5168\u6D41\u7A0B",
        icon: "\u{1F3AF}",
        category: "automation",
        estimatedTime: "20\u5206\u9418",
        difficulty: "medium",
        steps: [
          { id: "s1", title: "\u914D\u7F6E\u5E33\u865F\u89D2\u8272", description: "\u8A2D\u7F6E\u76E3\u63A7\u865F\u548C\u767C\u9001\u865F", icon: "\u{1F465}", status: "pending", isOptional: false, actionView: "accounts" },
          { id: "s2", title: "\u6DFB\u52A0\u76E3\u63A7\u7FA4\u7D44", description: "\u6DFB\u52A0\u76EE\u6A19\u7FA4\u7D44", icon: "\u{1F4AC}", status: "pending", isOptional: false, actionView: "resources" },
          { id: "s3", title: "\u8A2D\u7F6E\u95DC\u9375\u8A5E", description: "\u914D\u7F6E\u89F8\u767C\u95DC\u9375\u8A5E", icon: "\u{1F511}", status: "pending", isOptional: false, actionView: "automation" },
          { id: "s4", title: "\u5275\u5EFA\u6D3B\u52D5", description: "\u8A2D\u7F6E\u81EA\u52D5\u56DE\u8986\u6D3B\u52D5", icon: "\u26A1", status: "pending", isOptional: false, actionView: "automation" },
          { id: "s5", title: "\u914D\u7F6E AI \u56DE\u8986", description: "\u8A2D\u7F6E AI \u81EA\u52D5\u554F\u5019", icon: "\u{1F916}", status: "pending", isOptional: true, actionView: "ai-center" },
          { id: "s6", title: "\u958B\u59CB\u76E3\u63A7", description: "\u555F\u52D5\u81EA\u52D5\u5316\u7CFB\u7D71", icon: "\u25B6\uFE0F", status: "pending", isOptional: false, actionHandler: "start-monitoring" }
        ]
      },
      {
        id: "multi-role",
        title: "\u591A\u89D2\u8272\u5354\u4F5C\u8A2D\u7F6E",
        description: "\u914D\u7F6E\u591A\u5E33\u865F\u5287\u672C\u5F0F\u5354\u4F5C",
        icon: "\u{1F3AD}",
        category: "conversion",
        estimatedTime: "30\u5206\u9418",
        difficulty: "advanced",
        steps: [
          { id: "s1", title: "\u6E96\u5099\u591A\u500B\u5E33\u865F", description: "\u6DFB\u52A0\u81F3\u5C113\u500B\u5E33\u865F", icon: "\u{1F465}", status: "pending", isOptional: false, actionView: "accounts" },
          { id: "s2", title: "\u5206\u914D\u89D2\u8272", description: "\u70BA\u5E33\u865F\u5206\u914D\u92B7\u552E\u3001\u5C08\u5BB6\u7B49\u89D2\u8272", icon: "\u{1F3AD}", status: "pending", isOptional: false, actionView: "multi-role" },
          { id: "s3", title: "\u9078\u64C7\u5287\u672C", description: "\u9078\u64C7\u6216\u5275\u5EFA\u5354\u4F5C\u5287\u672C", icon: "\u{1F4DC}", status: "pending", isOptional: false, actionView: "multi-role" },
          { id: "s4", title: "\u5275\u5EFA\u5354\u4F5C\u7FA4\u7D44", description: "\u8A2D\u7F6E\u5354\u4F5C\u76EE\u6A19\u7FA4\u7D44", icon: "\u{1F4AC}", status: "pending", isOptional: false, actionView: "multi-role" },
          { id: "s5", title: "\u57F7\u884C\u5287\u672C", description: "\u555F\u52D5\u591A\u89D2\u8272\u5354\u4F5C", icon: "\u{1F3AC}", status: "pending", isOptional: false, actionHandler: "run-script" }
        ]
      }
    ], ...ngDevMode ? [{ debugName: "workflows" }] : []);
    this.quickActions = signal([
      { id: "add-account", title: "\u6DFB\u52A0\u5E33\u865F", description: "\u6DFB\u52A0 Telegram \u5E33\u865F", icon: "\u2795", category: "account", actionView: "add-account", isRecommended: true },
      { id: "scan-session", title: "\u6062\u5FA9\u5E33\u865F", description: "\u6383\u63CF\u4E26\u6062\u5FA9 Session", icon: "\u{1F504}", category: "account", actionView: "accounts", actionHandler: "scan-sessions" },
      { id: "discover-groups", title: "\u767C\u73FE\u7FA4\u7D44", description: "\u641C\u7D22\u65B0\u7FA4\u7D44\u8CC7\u6E90", icon: "\u{1F50D}", category: "resource", actionView: "resources" },
      { id: "add-group", title: "\u6DFB\u52A0\u7FA4\u7D44", description: "\u624B\u52D5\u6DFB\u52A0\u76E3\u63A7\u7FA4\u7D44", icon: "\u{1F4AC}", category: "resource", actionView: "automation" },
      { id: "add-keyword", title: "\u6DFB\u52A0\u95DC\u9375\u8A5E", description: "\u8A2D\u7F6E\u89F8\u767C\u95DC\u9375\u8A5E", icon: "\u{1F511}", category: "automation", actionView: "automation" },
      { id: "create-campaign", title: "\u5275\u5EFA\u6D3B\u52D5", description: "\u65B0\u5EFA\u81EA\u52D5\u5316\u6D3B\u52D5", icon: "\u26A1", category: "automation", actionView: "automation", actionHandler: "new-campaign" },
      { id: "send-batch", title: "\u6279\u91CF\u767C\u9001", description: "\u767C\u9001\u6279\u91CF\u6D88\u606F", icon: "\u{1F4E4}", category: "message", actionView: "ads" },
      { id: "view-leads", title: "\u67E5\u770B\u7DDA\u7D22", description: "\u7BA1\u7406\u6F5B\u5728\u5BA2\u6236", icon: "\u{1F465}", category: "message", actionView: "leads" },
      { id: "view-stats", title: "\u6578\u64DA\u5206\u6790", description: "\u67E5\u770B\u7D71\u8A08\u5831\u8868", icon: "\u{1F4CA}", category: "analysis", actionView: "nurturing-analytics" },
      { id: "export-data", title: "\u5C0E\u51FA\u6578\u64DA", description: "\u5C0E\u51FA\u5BA2\u6236\u6578\u64DA", icon: "\u{1F4E5}", category: "analysis", actionView: "leads", actionHandler: "export-leads" },
      { id: "start-monitoring", title: "\u958B\u59CB\u76E3\u63A7", description: "\u555F\u52D5\u81EA\u52D5\u76E3\u63A7", icon: "\u25B6\uFE0F", category: "automation", actionView: "automation", actionHandler: "start-monitoring", isRecommended: true },
      { id: "ai-settings", title: "AI \u8A2D\u7F6E", description: "\u914D\u7F6E AI \u56DE\u8986", icon: "\u{1F916}", category: "automation", actionView: "ai-center" }
    ], ...ngDevMode ? [{ debugName: "quickActions" }] : []);
    this.recommendedWorkflow = computed(() => {
      return this.workflows().find((w) => w.id === "quick-start");
    }, ...ngDevMode ? [{ debugName: "recommendedWorkflow" }] : []);
    this.filteredActions = computed(() => {
      const category = this.activeCategory();
      if (category === "all")
        return this.quickActions();
      return this.quickActions().filter((a) => a.category === category);
    }, ...ngDevMode ? [{ debugName: "filteredActions" }] : []);
    this.workflowProgress = computed(() => {
      const workflow = this.activeWorkflow();
      if (!workflow)
        return 0;
      const completed = workflow.steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
      return completed / workflow.steps.length * 100;
    }, ...ngDevMode ? [{ debugName: "workflowProgress" }] : []);
    this.completedStepsCount = computed(() => {
      const workflow = this.activeWorkflow();
      if (!workflow)
        return 0;
      return workflow.steps.filter((s) => s.status === "completed" || s.status === "skipped").length;
    }, ...ngDevMode ? [{ debugName: "completedStepsCount" }] : []);
    this.isWorkflowComplete = computed(() => {
      const workflow = this.activeWorkflow();
      if (!workflow)
        return false;
      return workflow.steps.every((s) => s.status === "completed" || s.status === "skipped");
    }, ...ngDevMode ? [{ debugName: "isWorkflowComplete" }] : []);
  }
  ngOnInit() {
  }
  // 獲取難度標籤
  getDifficultyLabel(difficulty) {
    const labels = {
      easy: "\u7C21\u55AE",
      medium: "\u4E2D\u7B49",
      advanced: "\u9032\u968E"
    };
    return labels[difficulty] || difficulty;
  }
  // 開始工作流
  startWorkflow(workflow) {
    const resetWorkflow = __spreadProps(__spreadValues({}, workflow), {
      steps: workflow.steps.map((s, i) => __spreadProps(__spreadValues({}, s), {
        status: i === 0 ? "active" : "pending"
      }))
    });
    this.activeWorkflow.set(resetWorkflow);
  }
  // 關閉工作流
  closeWorkflow() {
    this.activeWorkflow.set(null);
  }
  // 執行步驟
  executeStep(step) {
    if (step.actionView) {
      this.navigateTo.emit({ view: step.actionView, handler: step.actionHandler });
    }
    this.activeWorkflow.update((workflow) => {
      if (!workflow)
        return null;
      const stepIndex = workflow.steps.findIndex((s) => s.id === step.id);
      return __spreadProps(__spreadValues({}, workflow), {
        steps: workflow.steps.map((s, i) => {
          if (i === stepIndex)
            return __spreadProps(__spreadValues({}, s), { status: "completed" });
          if (i === stepIndex + 1)
            return __spreadProps(__spreadValues({}, s), { status: "active" });
          return s;
        })
      });
    });
  }
  // 跳過步驟
  skipStep(step) {
    this.activeWorkflow.update((workflow) => {
      if (!workflow)
        return null;
      const stepIndex = workflow.steps.findIndex((s) => s.id === step.id);
      return __spreadProps(__spreadValues({}, workflow), {
        steps: workflow.steps.map((s, i) => {
          if (i === stepIndex)
            return __spreadProps(__spreadValues({}, s), { status: "skipped" });
          if (i === stepIndex + 1)
            return __spreadProps(__spreadValues({}, s), { status: "active" });
          return s;
        })
      });
    });
  }
  // 完成工作流
  finishWorkflow() {
    const workflow = this.activeWorkflow();
    if (workflow) {
      this.workflowCompleted.emit(workflow);
    }
    this.closeWorkflow();
  }
  // 執行快速操作
  executeAction(action) {
    this.navigateTo.emit({ view: action.actionView, handler: action.actionHandler });
  }
  static {
    this.\u0275fac = function QuickWorkflowComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QuickWorkflowComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _QuickWorkflowComponent, selectors: [["app-quick-workflow"]], outputs: { navigateTo: "navigateTo", workflowCompleted: "workflowCompleted" }, decls: 15, vars: 35, consts: [[1, "quick-workflow"], [1, "flex", "items-center", "gap-3", "mb-6"], [1, "flex-1", "py-3", "rounded-xl", "border", "transition-all", "text-center", 3, "click"], [1, "text-xl", "block", "mb-1"], [1, "text-sm", "font-medium"], [1, "space-y-4"], [1, "fixed", "inset-0", "bg-black/60", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-50"], [1, "p-4", "bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "border", "border-cyan-500/30", "rounded-xl"], [1, "grid", "grid-cols-1", "md:grid-cols-2", "gap-3"], [1, "group", "p-4", "bg-slate-800/50", "hover:bg-slate-700/50", "border", "border-slate-600/50", "hover:border-cyan-500/30", "rounded-xl", "cursor-pointer", "transition-all"], [1, "flex", "items-center", "gap-2", "mb-2"], [1, "text-lg"], [1, "text-sm", "font-semibold", "text-cyan-400"], [1, "text-white", "font-semibold", "mb-1"], [1, "text-sm", "text-slate-400", "mb-3"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "text-white", "text-sm", "font-medium", "rounded-lg", "transition-all", 3, "click"], [1, "group", "p-4", "bg-slate-800/50", "hover:bg-slate-700/50", "border", "border-slate-600/50", "hover:border-cyan-500/30", "rounded-xl", "cursor-pointer", "transition-all", 3, "click"], [1, "flex", "items-start", "gap-3"], [1, "text-2xl"], [1, "flex-1"], [1, "flex", "items-center", "gap-2", "mb-1"], [1, "font-medium", "text-white", "group-hover:text-cyan-400", "transition-colors"], [1, "text-xs", "px-1.5", "py-0.5", "rounded"], [1, "text-xs", "text-slate-400", "mb-2"], [1, "flex", "items-center", "gap-3", "text-xs", "text-slate-500"], [1, "flex", "gap-2", "overflow-x-auto", "pb-2"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "whitespace-nowrap", "transition-all", 3, "bg-purple-500", "text-white", "bg-slate-700/50", "text-slate-400", "hover:bg-slate-600/50"], [1, "grid", "grid-cols-2", "md:grid-cols-3", "lg:grid-cols-4", "gap-3"], [1, "group", "relative", "p-4", "bg-slate-800/50", "hover:bg-slate-700/50", "border", "border-slate-600/50", "hover:border-purple-500/30", "rounded-xl", "cursor-pointer", "transition-all", "text-center"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "whitespace-nowrap", "transition-all", 3, "click"], [1, "group", "relative", "p-4", "bg-slate-800/50", "hover:bg-slate-700/50", "border", "border-slate-600/50", "hover:border-purple-500/30", "rounded-xl", "cursor-pointer", "transition-all", "text-center", 3, "click"], [1, "absolute", "-top-2", "-right-2", "px-1.5", "py-0.5", "bg-gradient-to-r", "from-yellow-500", "to-orange-500", "text-white", "text-xs", "font-semibold", "rounded-full"], [1, "absolute", "-top-2", "-left-2", "px-1.5", "py-0.5", "bg-red-500", "text-white", "text-xs", "font-bold", "rounded-full"], [1, "text-3xl", "mb-2"], [1, "text-sm", "font-medium", "text-white", "group-hover:text-purple-400", "transition-colors", "mb-1"], [1, "text-xs", "text-slate-500"], [1, "fixed", "inset-0", "bg-black/60", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-50", 3, "click"], [1, "bg-slate-800", "rounded-2xl", "shadow-2xl", "w-full", "max-w-2xl", "mx-4", "overflow-hidden", 3, "click"], [1, "p-6", "bg-gradient-to-r", "from-cyan-500/20", "to-blue-500/20", "border-b", "border-slate-700/50"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-3"], [1, "text-3xl"], [1, "text-xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], [1, "p-2", "text-slate-400", "hover:text-white", "hover:bg-slate-700/50", "rounded-lg", "transition-all", 3, "click"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", 1, "w-5", "h-5"], ["d", "M6 18L18 6M6 6l12 12"], [1, "mt-4", "h-2", "bg-slate-700", "rounded-full", "overflow-hidden"], [1, "h-full", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "transition-all", "duration-500"], [1, "mt-2", "text-xs", "text-slate-400", "text-right"], [1, "p-6", "max-h-[400px]", "overflow-y-auto"], [1, "flex", "items-start", "gap-4"], [1, "p-4", "border-t", "border-slate-700/50", "flex", "justify-between"], [1, "px-4", "py-2", "text-slate-400", "hover:text-white", "transition-all", 3, "click"], [1, "px-6", "py-2", "bg-gradient-to-r", "from-green-500", "to-emerald-500", "hover:from-green-400", "hover:to-emerald-400", "text-white", "font-medium", "rounded-lg", "transition-all"], [1, "flex-shrink-0", "w-10", "h-10", "rounded-full", "flex", "items-center", "justify-center", "font-bold", "text-sm", "transition-all"], [1, "flex-1", "pb-4"], [1, "font-medium"], [1, "text-xs", "px-1.5", "py-0.5", "bg-slate-700", "text-slate-400", "rounded"], [1, "flex", "gap-2"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "text-sm", "rounded-lg", "transition-all"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "text-sm", "rounded-lg", "transition-all", 3, "click"], [1, "px-6", "py-2", "bg-gradient-to-r", "from-green-500", "to-emerald-500", "hover:from-green-400", "hover:to-emerald-400", "text-white", "font-medium", "rounded-lg", "transition-all", 3, "click"]], template: function QuickWorkflowComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "button", 2);
        \u0275\u0275domListener("click", function QuickWorkflowComponent_Template_button_click_2_listener() {
          return ctx.mode.set("workflows");
        });
        \u0275\u0275domElementStart(3, "span", 3);
        \u0275\u0275text(4, "\u{1F3AF}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(5, "span", 4);
        \u0275\u0275text(6, "\u5F15\u5C0E\u5F0F\u5DE5\u4F5C\u6D41");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(7, "button", 2);
        \u0275\u0275domListener("click", function QuickWorkflowComponent_Template_button_click_7_listener() {
          return ctx.mode.set("actions");
        });
        \u0275\u0275domElementStart(8, "span", 3);
        \u0275\u0275text(9, "\u26A1");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(10, "span", 4);
        \u0275\u0275text(11, "\u5FEB\u901F\u64CD\u4F5C");
        \u0275\u0275domElementEnd()()();
        \u0275\u0275conditionalCreate(12, QuickWorkflowComponent_Conditional_12_Template, 5, 1, "div", 5);
        \u0275\u0275conditionalCreate(13, QuickWorkflowComponent_Conditional_13_Template, 7, 0, "div", 5);
        \u0275\u0275conditionalCreate(14, QuickWorkflowComponent_Conditional_14_Template, 27, 8, "div", 6);
        \u0275\u0275domElementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-gradient-to-r", ctx.mode() === "workflows")("from-cyan-500/20", ctx.mode() === "workflows")("to-blue-500/20", ctx.mode() === "workflows")("border-cyan-500/50", ctx.mode() === "workflows")("text-white", ctx.mode() === "workflows")("bg-slate-800/50", ctx.mode() !== "workflows")("border-slate-600/50", ctx.mode() !== "workflows")("text-slate-400", ctx.mode() !== "workflows");
        \u0275\u0275advance(5);
        \u0275\u0275classProp("bg-gradient-to-r", ctx.mode() === "actions")("from-purple-500/20", ctx.mode() === "actions")("to-pink-500/20", ctx.mode() === "actions")("border-purple-500/50", ctx.mode() === "actions")("text-white", ctx.mode() === "actions")("bg-slate-800/50", ctx.mode() !== "actions")("border-slate-600/50", ctx.mode() !== "actions")("text-slate-400", ctx.mode() !== "actions");
        \u0275\u0275advance(5);
        \u0275\u0275conditional(ctx.mode() === "workflows" ? 12 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.mode() === "actions" ? 13 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.activeWorkflow() ? 14 : -1);
      }
    }, dependencies: [CommonModule], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuickWorkflowComponent, [{
    type: Component,
    args: [{
      selector: "app-quick-workflow",
      standalone: true,
      imports: [CommonModule],
      template: `
    <div class="quick-workflow">
      <!-- \u6A21\u5F0F\u5207\u63DB -->
      <div class="flex items-center gap-3 mb-6">
        <button (click)="mode.set('workflows')"
                class="flex-1 py-3 rounded-xl border transition-all text-center"
                [class.bg-gradient-to-r]="mode() === 'workflows'"
                [class.from-cyan-500/20]="mode() === 'workflows'"
                [class.to-blue-500/20]="mode() === 'workflows'"
                [class.border-cyan-500/50]="mode() === 'workflows'"
                [class.text-white]="mode() === 'workflows'"
                [class.bg-slate-800/50]="mode() !== 'workflows'"
                [class.border-slate-600/50]="mode() !== 'workflows'"
                [class.text-slate-400]="mode() !== 'workflows'">
          <span class="text-xl block mb-1">\u{1F3AF}</span>
          <span class="text-sm font-medium">\u5F15\u5C0E\u5F0F\u5DE5\u4F5C\u6D41</span>
        </button>
        
        <button (click)="mode.set('actions')"
                class="flex-1 py-3 rounded-xl border transition-all text-center"
                [class.bg-gradient-to-r]="mode() === 'actions'"
                [class.from-purple-500/20]="mode() === 'actions'"
                [class.to-pink-500/20]="mode() === 'actions'"
                [class.border-purple-500/50]="mode() === 'actions'"
                [class.text-white]="mode() === 'actions'"
                [class.bg-slate-800/50]="mode() !== 'actions'"
                [class.border-slate-600/50]="mode() !== 'actions'"
                [class.text-slate-400]="mode() !== 'actions'">
          <span class="text-xl block mb-1">\u26A1</span>
          <span class="text-sm font-medium">\u5FEB\u901F\u64CD\u4F5C</span>
        </button>
      </div>
      
      <!-- \u5DE5\u4F5C\u6D41\u6A21\u5F0F -->
      @if (mode() === 'workflows') {
        <div class="space-y-4">
          <!-- \u63A8\u85A6\u5DE5\u4F5C\u6D41 -->
          @if (recommendedWorkflow()) {
            <div class="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
                        border border-cyan-500/30 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">\u{1F4A1}</span>
                <span class="text-sm font-semibold text-cyan-400">AI \u63A8\u85A6</span>
              </div>
              <h3 class="text-white font-semibold mb-1">{{ recommendedWorkflow()!.title }}</h3>
              <p class="text-sm text-slate-400 mb-3">{{ recommendedWorkflow()!.description }}</p>
              <button (click)="startWorkflow(recommendedWorkflow()!)"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white 
                             text-sm font-medium rounded-lg transition-all">
                \u958B\u59CB\u6B64\u6D41\u7A0B
              </button>
            </div>
          }
          
          <!-- \u5DE5\u4F5C\u6D41\u5217\u8868 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (workflow of workflows(); track workflow.id) {
              <div (click)="startWorkflow(workflow)"
                   class="group p-4 bg-slate-800/50 hover:bg-slate-700/50 
                          border border-slate-600/50 hover:border-cyan-500/30
                          rounded-xl cursor-pointer transition-all">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ workflow.icon }}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {{ workflow.title }}
                      </h4>
                      <span class="text-xs px-1.5 py-0.5 rounded"
                            [class.bg-green-500/20]="workflow.difficulty === 'easy'"
                            [class.text-green-400]="workflow.difficulty === 'easy'"
                            [class.bg-yellow-500/20]="workflow.difficulty === 'medium'"
                            [class.text-yellow-400]="workflow.difficulty === 'medium'"
                            [class.bg-red-500/20]="workflow.difficulty === 'advanced'"
                            [class.text-red-400]="workflow.difficulty === 'advanced'">
                        {{ getDifficultyLabel(workflow.difficulty) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mb-2">{{ workflow.description }}</p>
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                      <span>{{ workflow.steps.length }} \u6B65\u9A5F</span>
                      <span>\u7D04 {{ workflow.estimatedTime }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- \u5FEB\u901F\u64CD\u4F5C\u6A21\u5F0F -->
      @if (mode() === 'actions') {
        <div class="space-y-4">
          <!-- \u5206\u985E\u6A19\u7C64 -->
          <div class="flex gap-2 overflow-x-auto pb-2">
            @for (category of categories; track category.id) {
              <button (click)="activeCategory.set(category.id)"
                      class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all"
                      [class.bg-purple-500]="activeCategory() === category.id"
                      [class.text-white]="activeCategory() === category.id"
                      [class.bg-slate-700/50]="activeCategory() !== category.id"
                      [class.text-slate-400]="activeCategory() !== category.id"
                      [class.hover:bg-slate-600/50]="activeCategory() !== category.id">
                {{ category.icon }} {{ category.label }}
              </button>
            }
          </div>
          
          <!-- \u64CD\u4F5C\u7DB2\u683C -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            @for (action of filteredActions(); track action.id) {
              <div (click)="executeAction(action)"
                   class="group relative p-4 bg-slate-800/50 hover:bg-slate-700/50 
                          border border-slate-600/50 hover:border-purple-500/30
                          rounded-xl cursor-pointer transition-all text-center">
                
                <!-- \u63A8\u85A6\u6A19\u7C64 -->
                @if (action.isRecommended) {
                  <div class="absolute -top-2 -right-2 px-1.5 py-0.5 bg-gradient-to-r 
                              from-yellow-500 to-orange-500 text-white text-xs 
                              font-semibold rounded-full">
                    \u2B50
                  </div>
                }
                
                <!-- \u5FBD\u7AE0 -->
                @if (action.badge) {
                  <div class="absolute -top-2 -left-2 px-1.5 py-0.5 bg-red-500 
                              text-white text-xs font-bold rounded-full">
                    {{ action.badge }}
                  </div>
                }
                
                <div class="text-3xl mb-2">{{ action.icon }}</div>
                <h4 class="text-sm font-medium text-white group-hover:text-purple-400 
                           transition-colors mb-1">
                  {{ action.title }}
                </h4>
                <p class="text-xs text-slate-500">{{ action.description }}</p>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- \u6D3B\u8E8D\u5DE5\u4F5C\u6D41\u9032\u5EA6 -->
      @if (activeWorkflow()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
             (click)="closeWorkflow()">
          <div class="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
               (click)="$event.stopPropagation()">
            
            <!-- \u5DE5\u4F5C\u6D41\u982D\u90E8 -->
            <div class="p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                        border-b border-slate-700/50">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-3xl">{{ activeWorkflow()!.icon }}</span>
                  <div>
                    <h2 class="text-xl font-bold text-white">{{ activeWorkflow()!.title }}</h2>
                    <p class="text-sm text-slate-400">{{ activeWorkflow()!.description }}</p>
                  </div>
                </div>
                <button (click)="closeWorkflow()"
                        class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 
                               rounded-lg transition-all">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <!-- \u9032\u5EA6\u689D -->
              <div class="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                     [style.width.%]="workflowProgress()"></div>
              </div>
              <div class="mt-2 text-xs text-slate-400 text-right">
                {{ completedStepsCount() }}/{{ activeWorkflow()!.steps.length }} \u6B65\u9A5F\u5B8C\u6210
              </div>
            </div>
            
            <!-- \u6B65\u9A5F\u5217\u8868 -->
            <div class="p-6 max-h-[400px] overflow-y-auto">
              <div class="space-y-4">
                @for (step of activeWorkflow()!.steps; track step.id; let i = $index) {
                  <div class="flex items-start gap-4">
                    <!-- \u6B65\u9A5F\u7DE8\u865F -->
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                                font-bold text-sm transition-all"
                         [class.bg-green-500]="step.status === 'completed'"
                         [class.text-white]="step.status === 'completed'"
                         [class.bg-cyan-500]="step.status === 'active'"
                         [class.text-white]="step.status === 'active'"
                         [class.animate-pulse]="step.status === 'active'"
                         [class.bg-slate-600]="step.status === 'pending'"
                         [class.text-slate-400]="step.status === 'pending'"
                         [class.bg-slate-700]="step.status === 'skipped'"
                         [class.text-slate-500]="step.status === 'skipped'"
                         [class.bg-red-500]="step.status === 'error'"
                         [class.text-white]="step.status === 'error'">
                      @switch (step.status) {
                        @case ('completed') { \u2713 }
                        @case ('active') { {{ i + 1 }} }
                        @case ('error') { \u2717 }
                        @default { {{ i + 1 }} }
                      }
                    </div>
                    
                    <!-- \u6B65\u9A5F\u5167\u5BB9 -->
                    <div class="flex-1 pb-4"
                         [class.border-l-2]="i < activeWorkflow()!.steps.length - 1"
                         [class.border-green-500]="step.status === 'completed'"
                         [class.border-cyan-500]="step.status === 'active'"
                         [class.border-slate-600]="step.status === 'pending' || step.status === 'skipped'"
                         [class.ml-5]="i < activeWorkflow()!.steps.length - 1"
                         [class.pl-8]="i < activeWorkflow()!.steps.length - 1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">{{ step.icon }}</span>
                        <h4 class="font-medium"
                            [class.text-white]="step.status === 'active'"
                            [class.text-green-400]="step.status === 'completed'"
                            [class.text-slate-400]="step.status === 'pending'"
                            [class.text-slate-500]="step.status === 'skipped'">
                          {{ step.title }}
                        </h4>
                        @if (step.isOptional) {
                          <span class="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">\u53EF\u9078</span>
                        }
                      </div>
                      <p class="text-sm text-slate-400 mb-3">{{ step.description }}</p>
                      
                      <!-- \u6D3B\u8E8D\u6B65\u9A5F\u7684\u64CD\u4F5C\u6309\u9215 -->
                      @if (step.status === 'active') {
                        <div class="flex gap-2">
                          <button (click)="executeStep(step)"
                                  class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white 
                                         text-sm font-medium rounded-lg transition-all">
                            \u57F7\u884C\u6B64\u6B65\u9A5F
                          </button>
                          @if (step.isOptional) {
                            <button (click)="skipStep(step)"
                                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 
                                           text-sm rounded-lg transition-all">
                              \u8DF3\u904E
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- \u5E95\u90E8\u64CD\u4F5C -->
            <div class="p-4 border-t border-slate-700/50 flex justify-between">
              <button (click)="closeWorkflow()"
                      class="px-4 py-2 text-slate-400 hover:text-white transition-all">
                \u7A0D\u5F8C\u7E7C\u7E8C
              </button>
              
              @if (isWorkflowComplete()) {
                <button (click)="finishWorkflow()"
                        class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 
                               hover:from-green-400 hover:to-emerald-400 text-white 
                               font-medium rounded-lg transition-all">
                  \u{1F389} \u5B8C\u6210\u5DE5\u4F5C\u6D41
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
    }]
  }], null, { navigateTo: [{ type: Output, args: ["navigateTo"] }], workflowCompleted: [{ type: Output, args: ["workflowCompleted"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(QuickWorkflowComponent, { className: "QuickWorkflowComponent", filePath: "src/quick-workflow.component.ts", lineNumber: 334 });
})();

// src/services/smart-timing.service.ts
var SmartTimingService = class _SmartTimingService {
  constructor() {
    this.analytics = inject(MarketingAnalyticsService);
    this._timeSlotStats = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_timeSlotStats" }] : []);
    this._userPatterns = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_userPatterns" }] : []);
    this._scheduledTasks = signal([], ...ngDevMode ? [{ debugName: "_scheduledTasks" }] : []);
    this.timeSlotStats = computed(() => Array.from(this._timeSlotStats().values()), ...ngDevMode ? [{ debugName: "timeSlotStats" }] : []);
    this.scheduledTasks = this._scheduledTasks.asReadonly();
    this.topTimeSlots = computed(() => {
      return this.timeSlotStats().sort((a, b) => b.score - a.score).slice(0, 10);
    }, ...ngDevMode ? [{ debugName: "topTimeSlots" }] : []);
    this.currentSlotScore = computed(() => {
      const now = /* @__PURE__ */ new Date();
      const key = this.getSlotKey(now.getHours(), now.getDay());
      const stats = this._timeSlotStats().get(key);
      return stats?.score ?? 50;
    }, ...ngDevMode ? [{ debugName: "currentSlotScore" }] : []);
    this.STORAGE_KEY = "smartTiming";
    this.schedulerInterval = null;
    this.loadFromStorage();
    this.startScheduler();
  }
  // ============ 時段分析 ============
  /**
   * 記錄用戶活動
   */
  recordUserActivity(userId, timestamp = /* @__PURE__ */ new Date()) {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    const existing = this._userPatterns().get(userId);
    if (existing) {
      const activeHours = [.../* @__PURE__ */ new Set([...existing.activeHours, hour])].slice(-24);
      const preferredDays = [.../* @__PURE__ */ new Set([...existing.preferredDays, dayOfWeek])].slice(-7);
      this._userPatterns.update((m) => {
        const newMap = new Map(m);
        newMap.set(userId, __spreadProps(__spreadValues({}, existing), {
          activeHours,
          preferredDays,
          lastActiveTime: timestamp,
          reliability: Math.min(existing.reliability + 0.1, 1)
        }));
        return newMap;
      });
    } else {
      this._userPatterns.update((m) => {
        const newMap = new Map(m);
        newMap.set(userId, {
          userId,
          activeHours: [hour],
          preferredDays: [dayOfWeek],
          avgResponseDelay: 30,
          lastActiveTime: timestamp,
          reliability: 0.3
        });
        return newMap;
      });
    }
    this.saveToStorage();
  }
  /**
   * 記錄會話結果（用於更新時段統計）
   */
  recordSessionResult(data) {
    const hour = data.timestamp.getHours();
    const dayOfWeek = data.timestamp.getDay();
    const key = this.getSlotKey(hour, dayOfWeek);
    const existing = this._timeSlotStats().get(key);
    if (existing) {
      const newTotal = existing.totalSessions + 1;
      const responded = data.responded ? 1 : 0;
      const converted = data.converted ? 1 : 0;
      const updated = __spreadProps(__spreadValues({}, existing), {
        totalSessions: newTotal,
        responseRate: (existing.responseRate * existing.totalSessions + responded) / newTotal,
        conversionRate: (existing.conversionRate * existing.totalSessions + converted) / newTotal,
        avgResponseTime: data.responseTime ? (existing.avgResponseTime * existing.totalSessions + data.responseTime) / newTotal : existing.avgResponseTime,
        score: 0
        // 稍後重新計算
      });
      updated.score = this.calculateSlotScore(updated);
      this._timeSlotStats.update((m) => {
        const newMap = new Map(m);
        newMap.set(key, updated);
        return newMap;
      });
    } else {
      const newStats = {
        hour,
        dayOfWeek,
        totalSessions: 1,
        responseRate: data.responded ? 1 : 0,
        avgResponseTime: data.responseTime ?? 30,
        conversionRate: data.converted ? 1 : 0,
        score: 0
      };
      newStats.score = this.calculateSlotScore(newStats);
      this._timeSlotStats.update((m) => {
        const newMap = new Map(m);
        newMap.set(key, newStats);
        return newMap;
      });
    }
    this.saveToStorage();
  }
  /**
   * 計算時段評分
   */
  calculateSlotScore(stats) {
    if (stats.totalSessions < 2) {
      return 50;
    }
    let score = 0;
    score += stats.responseRate * 40;
    score += stats.conversionRate * 40;
    const speedScore = Math.max(0, 1 - stats.avgResponseTime / 120);
    score += speedScore * 20;
    if (stats.hour >= 9 && stats.hour <= 21) {
      score *= 1.1;
    }
    if (stats.dayOfWeek === 0 || stats.dayOfWeek === 6) {
      score *= 0.9;
    }
    return Math.min(100, Math.round(score));
  }
  // ============ 推薦功能 ============
  /**
   * 獲取最佳發送時間
   */
  getBestTimeToSend(targetUserId) {
    const recommendations = [];
    const now = /* @__PURE__ */ new Date();
    if (targetUserId) {
      const userPattern = this._userPatterns().get(targetUserId);
      if (userPattern && userPattern.reliability > 0.5) {
        for (const hour of userPattern.activeHours) {
          recommendations.push({
            hour,
            dayOfWeek: now.getDay(),
            score: 85 + Math.random() * 10,
            reason: "\u57FA\u65BC\u8A72\u7528\u6236\u7684\u6B77\u53F2\u6D3B\u8E8D\u6642\u6BB5",
            predictedResponseRate: 0.7 + Math.random() * 0.2
          });
        }
      }
    }
    const topSlots = this.topTimeSlots();
    for (const slot of topSlots.slice(0, 5)) {
      const existingIdx = recommendations.findIndex((r) => r.hour === slot.hour);
      if (existingIdx === -1) {
        recommendations.push({
          hour: slot.hour,
          dayOfWeek: slot.dayOfWeek,
          score: slot.score,
          reason: `\u6B77\u53F2\u6578\u64DA\u986F\u793A\u8A72\u6642\u6BB5\u56DE\u8986\u7387 ${(slot.responseRate * 100).toFixed(0)}%`,
          predictedResponseRate: slot.responseRate
        });
      }
    }
    if (recommendations.length < 3) {
      const defaultHours = [10, 14, 19, 20];
      for (const hour of defaultHours) {
        if (!recommendations.some((r) => r.hour === hour)) {
          recommendations.push({
            hour,
            dayOfWeek: now.getDay(),
            score: 60,
            reason: "\u57FA\u65BC\u4E00\u822C\u7528\u6236\u7FD2\u6163\u7684\u63A8\u85A6\u6642\u6BB5",
            predictedResponseRate: 0.5
          });
        }
      }
    }
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  /**
   * 獲取下一個最佳發送時間
   */
  getNextBestTime(targetUserId) {
    const recommendations = this.getBestTimeToSend(targetUserId);
    const now = /* @__PURE__ */ new Date();
    const currentHour = now.getHours();
    for (const rec of recommendations) {
      if (rec.hour > currentHour) {
        const result = new Date(now);
        result.setHours(rec.hour, 0, 0, 0);
        return result;
      }
    }
    const bestHour = recommendations[0]?.hour ?? 10;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(bestHour, 0, 0, 0);
    return tomorrow;
  }
  /**
   * 判斷當前是否是好時機
   */
  isGoodTimeNow() {
    const score = this.currentSlotScore();
    if (score >= 75) {
      return { isGood: true, score, suggestion: "\u2705 \u7576\u524D\u662F\u7D55\u4F73\u6642\u6A5F\uFF0C\u5EFA\u8B70\u7ACB\u5373\u767C\u9001" };
    } else if (score >= 50) {
      return { isGood: true, score, suggestion: "\u{1F44C} \u7576\u524D\u6642\u6A5F\u5C1A\u53EF\uFF0C\u53EF\u4EE5\u767C\u9001" };
    } else {
      const nextBest = this.getNextBestTime();
      const hours = Math.round((nextBest.getTime() - Date.now()) / (1e3 * 60 * 60));
      return {
        isGood: false,
        score,
        suggestion: `\u23F0 \u5EFA\u8B70\u7B49\u5F85 ${hours} \u5C0F\u6642\u5F8C\u767C\u9001\uFF0C\u6548\u679C\u66F4\u4F73`
      };
    }
  }
  // ============ 調度功能 ============
  /**
   * 創建調度任務
   */
  scheduleTask(task) {
    const newTask = __spreadProps(__spreadValues({}, task), {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      createdAt: /* @__PURE__ */ new Date()
    });
    this._scheduledTasks.update((tasks) => [...tasks, newTask]);
    this.saveToStorage();
    console.log(`[SmartTiming] \u5DF2\u5275\u5EFA\u8ABF\u5EA6\u4EFB\u52D9: ${newTask.id}, \u9810\u8A08\u57F7\u884C\u6642\u9593: ${newTask.scheduledTime}`);
    return newTask;
  }
  /**
   * 智能調度 - 自動選擇最佳時間
   */
  smartSchedule(task) {
    const bestTime = this.getNextBestTime(task.targetUserId);
    return this.scheduleTask(__spreadProps(__spreadValues({}, task), {
      scheduledTime: bestTime
    }));
  }
  /**
   * 取消調度任務
   */
  cancelTask(taskId) {
    this._scheduledTasks.update((tasks) => tasks.map((t) => t.id === taskId ? __spreadProps(__spreadValues({}, t), { status: "cancelled" }) : t));
    this.saveToStorage();
  }
  /**
   * 啟動調度器
   */
  startScheduler() {
    if (this.schedulerInterval)
      return;
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, 6e4);
    console.log("[SmartTiming] \u8ABF\u5EA6\u5668\u5DF2\u555F\u52D5");
  }
  /**
   * 檢查並執行到期任務
   */
  checkAndExecuteTasks() {
    const now = /* @__PURE__ */ new Date();
    const pendingTasks = this._scheduledTasks().filter((t) => t.status === "pending" && new Date(t.scheduledTime) <= now);
    for (const task of pendingTasks) {
      this.executeTask(task);
    }
  }
  /**
   * 執行任務
   */
  executeTask(task) {
    console.log(`[SmartTiming] \u57F7\u884C\u8ABF\u5EA6\u4EFB\u52D9: ${task.id}`);
    this._scheduledTasks.update((tasks) => tasks.map((t) => t.id === task.id ? __spreadProps(__spreadValues({}, t), { status: "executed" }) : t));
    window.dispatchEvent(new CustomEvent("scheduled-task-execute", {
      detail: task
    }));
    this.saveToStorage();
  }
  // ============ 時段可視化數據 ============
  /**
   * 獲取熱力圖數據
   */
  getHeatmapData() {
    const data = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = this.getSlotKey(hour, day);
        const stats = this._timeSlotStats().get(key);
        data.push({
          hour,
          day,
          score: stats?.score ?? 50
        });
      }
    }
    return data;
  }
  /**
   * 獲取今日各時段統計
   */
  getTodaySlots() {
    const today = (/* @__PURE__ */ new Date()).getDay();
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      const key = this.getSlotKey(hour, today);
      const stats = this._timeSlotStats().get(key);
      slots.push(stats ?? {
        hour,
        dayOfWeek: today,
        totalSessions: 0,
        responseRate: 0,
        avgResponseTime: 0,
        conversionRate: 0,
        score: 50
      });
    }
    return slots;
  }
  // ============ 輔助方法 ============
  getSlotKey(hour, dayOfWeek) {
    return `${dayOfWeek}_${hour}`;
  }
  saveToStorage() {
    const data = {
      timeSlotStats: Array.from(this._timeSlotStats().entries()),
      userPatterns: Array.from(this._userPatterns().entries()),
      scheduledTasks: this._scheduledTasks(),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored)
        return;
      const data = JSON.parse(stored);
      if (data.timeSlotStats) {
        this._timeSlotStats.set(new Map(data.timeSlotStats));
      }
      if (data.userPatterns) {
        const patterns = /* @__PURE__ */ new Map();
        for (const [k, v] of data.userPatterns) {
          patterns.set(k, __spreadProps(__spreadValues({}, v), {
            lastActiveTime: v.lastActiveTime ? new Date(v.lastActiveTime) : void 0
          }));
        }
        this._userPatterns.set(patterns);
      }
      if (data.scheduledTasks) {
        this._scheduledTasks.set(data.scheduledTasks.map((t) => __spreadProps(__spreadValues({}, t), {
          scheduledTime: new Date(t.scheduledTime),
          createdAt: new Date(t.createdAt)
        })));
      }
      console.log("[SmartTiming] \u5DF2\u5F9E\u5B58\u5132\u6062\u5FA9\u6578\u64DA");
    } catch (e) {
      console.error("[SmartTiming] \u6062\u5FA9\u6578\u64DA\u5931\u6557:", e);
    }
  }
  static {
    this.\u0275fac = function SmartTimingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartTimingService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SmartTimingService, factory: _SmartTimingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartTimingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/smart-automation.service.ts
var DEFAULT_RULES = [
  {
    id: "rule_low_conversion",
    name: "\u4F4E\u8F49\u5316\u7387\u544A\u8B66",
    enabled: true,
    type: "alert",
    condition: { metric: "conversion_rate", operator: "lt", value: 10, timeWindow: 60 },
    action: { type: "send_alert", params: { level: "warning", message: "\u8FD11\u5C0F\u6642\u8F49\u5316\u7387\u4F4E\u65BC10%" } },
    priority: 1,
    triggerCount: 0
  },
  {
    id: "rule_no_response",
    name: "\u9023\u7E8C\u7121\u56DE\u8986\u5207\u63DB\u89D2\u8272",
    enabled: true,
    type: "role_switch",
    condition: { metric: "no_response_count", operator: "gte", value: 3 },
    action: { type: "switch_role", params: { strategy: "next_best" } },
    priority: 2,
    triggerCount: 0
  },
  {
    id: "rule_slow_response",
    name: "\u7528\u6236\u56DE\u8986\u6162\u6642\u6E1B\u7DE9\u7BC0\u594F",
    enabled: true,
    type: "rhythm_adjust",
    condition: { metric: "response_rate", operator: "lt", value: 0.3 },
    action: { type: "adjust_delay", params: { multiplier: 1.5 } },
    priority: 3,
    triggerCount: 0
  },
  {
    id: "rule_high_interest",
    name: "\u9AD8\u8208\u8DA3\u5EA6\u52A0\u5FEB\u7BC0\u594F",
    enabled: true,
    type: "rhythm_adjust",
    condition: { metric: "interest_score", operator: "gt", value: 80 },
    action: { type: "adjust_delay", params: { multiplier: 0.7 } },
    priority: 4,
    triggerCount: 0
  }
];
var SmartAutomationService = class _SmartAutomationService {
  constructor() {
    this.analytics = inject(MarketingAnalyticsService);
    this.timing = inject(SmartTimingService);
    this.toast = inject(ToastService);
    this._rules = signal(DEFAULT_RULES, ...ngDevMode ? [{ debugName: "_rules" }] : []);
    this.rules = this._rules.asReadonly();
    this._rhythmConfig = signal({
      baseDelay: 5,
      varianceRatio: 0.3,
      minDelay: 2,
      maxDelay: 30,
      adaptiveMode: true
    }, ...ngDevMode ? [{ debugName: "_rhythmConfig" }] : []);
    this.rhythmConfig = this._rhythmConfig.asReadonly();
    this._alerts = signal([], ...ngDevMode ? [{ debugName: "_alerts" }] : []);
    this.alerts = this._alerts.asReadonly();
    this.unacknowledgedCount = computed(() => this._alerts().filter((a) => !a.acknowledged).length, ...ngDevMode ? [{ debugName: "unacknowledgedCount" }] : []);
    this.sessionContext = signal({
      noResponseCount: 0,
      userResponseTimes: [],
      interestScores: []
    }, ...ngDevMode ? [{ debugName: "sessionContext" }] : []);
    this.STORAGE_KEY = "smartAutomation";
    this.lastRuleCheck = 0;
    this.RULE_CHECK_COOLDOWN = 6e4;
    this.ruleCheckTimeout = null;
    this.loadFromStorage();
    setInterval(() => {
      const stats = this.analytics.totalStats();
      this.checkRulesWithCooldown(stats);
    }, this.RULE_CHECK_COOLDOWN);
  }
  /**
   * 帶冷卻的規則檢查
   */
  checkRulesWithCooldown(stats) {
    const now = Date.now();
    if (now - this.lastRuleCheck < this.RULE_CHECK_COOLDOWN) {
      return;
    }
    this.lastRuleCheck = now;
    this.checkRules(stats);
  }
  // ============ 規則管理 ============
  /**
   * 添加規則
   */
  addRule(rule) {
    const newRule = __spreadProps(__spreadValues({}, rule), {
      id: `rule_${Date.now()}`,
      triggerCount: 0
    });
    this._rules.update((rules) => [...rules, newRule]);
    this.saveToStorage();
  }
  /**
   * 更新規則
   */
  updateRule(ruleId, updates) {
    this._rules.update((rules) => rules.map((r) => r.id === ruleId ? __spreadValues(__spreadValues({}, r), updates) : r));
    this.saveToStorage();
  }
  /**
   * 啟用/禁用規則
   */
  toggleRule(ruleId) {
    this._rules.update((rules) => rules.map((r) => r.id === ruleId ? __spreadProps(__spreadValues({}, r), { enabled: !r.enabled }) : r));
    this.saveToStorage();
  }
  /**
   * 檢查規則
   */
  checkRules(stats) {
    const enabledRules = this._rules().filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
    for (const rule of enabledRules) {
      if (this.evaluateCondition(rule.condition, stats)) {
        this.executeAction(rule);
      }
    }
  }
  /**
   * 評估條件
   */
  evaluateCondition(condition, stats) {
    let value;
    switch (condition.metric) {
      case "conversion_rate":
        value = stats.conversionRate;
        break;
      case "response_rate":
        value = stats.avgEngagementScore / 100;
        break;
      case "interest_score":
        value = stats.avgInterestScore;
        break;
      case "no_response_count":
        value = this.sessionContext().noResponseCount;
        break;
      case "message_count":
        value = stats.totalSessions;
        break;
      default:
        return false;
    }
    switch (condition.operator) {
      case "lt":
        return value < condition.value;
      case "gt":
        return value > condition.value;
      case "eq":
        return value === condition.value;
      case "lte":
        return value <= condition.value;
      case "gte":
        return value >= condition.value;
      default:
        return false;
    }
  }
  /**
   * 執行動作
   */
  executeAction(rule) {
    console.log(`[SmartAutomation] \u89F8\u767C\u898F\u5247: ${rule.name}`);
    this._rules.update((rules) => rules.map((r) => r.id === rule.id ? __spreadProps(__spreadValues({}, r), {
      triggerCount: r.triggerCount + 1,
      lastTriggered: /* @__PURE__ */ new Date()
    }) : r));
    switch (rule.action.type) {
      case "send_alert":
        this.createAlert({
          type: rule.action.params.level || "warning",
          title: rule.name,
          message: rule.action.params.message
        });
        break;
      case "switch_role":
        this.triggerRoleSwitch(rule.action.params.strategy);
        break;
      case "adjust_delay":
        this.adjustRhythm(rule.action.params.multiplier);
        break;
      case "pause":
        window.dispatchEvent(new CustomEvent("automation:pause", { detail: rule }));
        break;
      case "escalate":
        this.createAlert({
          type: "error",
          title: "\u9700\u8981\u4EBA\u5DE5\u4ECB\u5165",
          message: `\u898F\u5247\u300C${rule.name}\u300D\u5EFA\u8B70\u66AB\u505C\u81EA\u52D5\u5316\uFF0C\u8ACB\u4EBA\u5DE5\u8655\u7406`
        });
        break;
    }
    this.saveToStorage();
  }
  // ============ 角色自動調整 ============
  /**
   * 獲取角色推薦
   */
  getRecommendedRoles() {
    const allCombos = this.analytics.roleComboStats();
    const topCombos = this.analytics.topRoleCombos();
    if (topCombos.length === 0) {
      return [];
    }
    const currentAvg = allCombos.length > 0 ? allCombos.reduce((sum, c) => sum + c.conversionRate, 0) / allCombos.length : 10;
    return topCombos.slice(0, 3).map((combo, idx) => ({
      roleCombo: combo,
      confidence: Math.min(0.9 - idx * 0.1, combo.totalSessions / 20),
      reason: this.getRecommendationReason(combo, idx),
      expectedImprovement: Math.max(0, combo.conversionRate - currentAvg)
    }));
  }
  /**
   * 獲取推薦原因
   */
  getRecommendationReason(combo, rank) {
    if (rank === 0) {
      return `\u8F49\u5316\u7387\u6700\u9AD8 (${combo.conversionRate.toFixed(1)}%)\uFF0C\u57FA\u65BC ${combo.totalSessions} \u6B21\u4F7F\u7528`;
    }
    if (combo.trend === "up") {
      return `\u6548\u679C\u6301\u7E8C\u4E0A\u5347\uFF0C\u8FD1\u671F\u8868\u73FE\u512A\u79C0`;
    }
    return `\u7A69\u5B9A\u8868\u73FE\uFF0C\u8F49\u5316\u7387 ${combo.conversionRate.toFixed(1)}%`;
  }
  /**
   * 觸發角色切換
   */
  triggerRoleSwitch(strategy) {
    const recommendations = this.getRecommendedRoles();
    if (recommendations.length > 0) {
      window.dispatchEvent(new CustomEvent("automation:role-switch", {
        detail: {
          strategy,
          recommended: recommendations[0].roleCombo
        }
      }));
      this.toast.info(`\u{1F4A1} \u5EFA\u8B70\u5207\u63DB\u81F3\u89D2\u8272\u7D44\u5408: ${recommendations[0].roleCombo.comboName}`);
    }
  }
  // ============ 節奏自適應 ============
  /**
   * 更新節奏配置
   */
  updateRhythmConfig(config) {
    this._rhythmConfig.update((c) => __spreadValues(__spreadValues({}, c), config));
    this.saveToStorage();
  }
  /**
   * 調整節奏
   */
  adjustRhythm(multiplier) {
    const current = this._rhythmConfig();
    const newDelay = Math.max(current.minDelay, Math.min(current.maxDelay, current.baseDelay * multiplier));
    this._rhythmConfig.update((c) => __spreadProps(__spreadValues({}, c), { baseDelay: newDelay }));
    console.log(`[SmartAutomation] \u7BC0\u594F\u8ABF\u6574: ${current.baseDelay}s \u2192 ${newDelay}s`);
  }
  /**
   * 計算自適應延遲
   */
  getAdaptiveDelay(context) {
    const config = this._rhythmConfig();
    if (!config.adaptiveMode) {
      return config.baseDelay;
    }
    let delay = config.baseDelay;
    if (context?.userResponseTime !== void 0) {
      if (context.userResponseTime < 30) {
        delay *= 0.8;
      } else if (context.userResponseTime > 120) {
        delay *= 1.3;
      }
    }
    if (context?.interestScore !== void 0) {
      if (context.interestScore > 80) {
        delay *= 0.7;
      } else if (context.interestScore < 30) {
        delay *= 1.2;
      }
    }
    const variance = delay * config.varianceRatio * (Math.random() - 0.5);
    delay += variance;
    return Math.max(config.minDelay, Math.min(config.maxDelay, delay));
  }
  /**
   * 記錄用戶回覆（用於自適應）
   */
  recordUserResponse(responded, responseTime, interestScore) {
    this.sessionContext.update((ctx) => ({
      noResponseCount: responded ? 0 : ctx.noResponseCount + 1,
      userResponseTimes: responseTime ? [...ctx.userResponseTimes.slice(-9), responseTime] : ctx.userResponseTimes,
      interestScores: interestScore ? [...ctx.interestScores.slice(-9), interestScore] : ctx.interestScores
    }));
  }
  /**
   * 重置會話上下文
   */
  resetSessionContext() {
    this.sessionContext.set({
      noResponseCount: 0,
      userResponseTimes: [],
      interestScores: []
    });
  }
  // ============ 告警管理 ============
  /**
   * 創建告警
   */
  createAlert(data) {
    const alert = __spreadProps(__spreadValues({
      id: `alert_${Date.now()}`
    }, data), {
      timestamp: /* @__PURE__ */ new Date(),
      acknowledged: false
    });
    this._alerts.update((alerts) => [alert, ...alerts].slice(0, 50));
    this.saveToStorage();
    if (data.type === "error") {
      this.toast.error(`\u{1F6A8} ${data.title}: ${data.message}`);
    } else if (data.type === "warning") {
      this.toast.warning(`\u26A0\uFE0F ${data.title}: ${data.message}`);
    }
    console.log(`[SmartAutomation] \u65B0\u544A\u8B66: ${data.title}`);
    return alert;
  }
  /**
   * 確認告警
   */
  acknowledgeAlert(alertId, actionTaken) {
    this._alerts.update((alerts) => alerts.map((a) => a.id === alertId ? __spreadProps(__spreadValues({}, a), { acknowledged: true, actionTaken }) : a));
    this.saveToStorage();
  }
  /**
   * 確認所有告警
   */
  acknowledgeAllAlerts() {
    this._alerts.update((alerts) => alerts.map((a) => __spreadProps(__spreadValues({}, a), { acknowledged: true })));
    this.saveToStorage();
  }
  /**
   * 清除已確認的告警
   */
  clearAcknowledgedAlerts() {
    this._alerts.update((alerts) => alerts.filter((a) => !a.acknowledged));
    this.saveToStorage();
  }
  // ============ 持久化 ============
  saveToStorage() {
    const data = {
      rules: this._rules(),
      rhythmConfig: this._rhythmConfig(),
      alerts: this._alerts().slice(0, 20),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored)
        return;
      const data = JSON.parse(stored);
      if (data.rules) {
        const storedIds = new Set(data.rules.map((r) => r.id));
        const mergedRules = [
          ...data.rules.map((r) => __spreadProps(__spreadValues({}, r), {
            lastTriggered: r.lastTriggered ? new Date(r.lastTriggered) : void 0
          })),
          ...DEFAULT_RULES.filter((r) => !storedIds.has(r.id))
        ];
        this._rules.set(mergedRules);
      }
      if (data.rhythmConfig) {
        this._rhythmConfig.set(data.rhythmConfig);
      }
      if (data.alerts) {
        this._alerts.set(data.alerts.map((a) => __spreadProps(__spreadValues({}, a), {
          timestamp: new Date(a.timestamp)
        })));
      }
      console.log("[SmartAutomation] \u5DF2\u5F9E\u5B58\u5132\u6062\u5FA9\u6578\u64DA");
    } catch (e) {
      console.error("[SmartAutomation] \u6062\u5FA9\u6578\u64DA\u5931\u6557:", e);
    }
  }
  static {
    this.\u0275fac = function SmartAutomationService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartAutomationService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SmartAutomationService, factory: _SmartAutomationService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartAutomationService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/components/quick-actions-panel.component.ts
var _forTrack03 = ($index, $item) => $item.id;
var _forTrack12 = ($index, $item) => $item.roleCombo.comboId;
function QuickActionsPanelComponent_For_26_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 30);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const action_r2 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", action_r2.badge, " ");
  }
}
function QuickActionsPanelComponent_For_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 26);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_For_26_Template_button_click_0_listener() {
      const action_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.executeAction(action_r2));
    });
    \u0275\u0275domElementStart(1, "div", 27);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 28);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 29);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(7, QuickActionsPanelComponent_For_26_Conditional_7_Template, 2, 1, "span", 30);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const action_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classMap(ctx_r2.getActionButtonClass(action_r2));
    \u0275\u0275domProperty("disabled", action_r2.disabled);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r2.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r2.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(action_r2.description);
    \u0275\u0275advance();
    \u0275\u0275conditional(action_r2.badge ? 7 : -1);
  }
}
function QuickActionsPanelComponent_For_37_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 33);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const preset_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\xD7", preset_r5.usageCount);
  }
}
function QuickActionsPanelComponent_For_37_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 31);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_For_37_Template_button_click_0_listener() {
      const preset_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.launchPreset(preset_r5));
    });
    \u0275\u0275domElementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span", 32);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(5, QuickActionsPanelComponent_For_37_Conditional_5_Template, 2, 1, "span", 33);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const preset_r5 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(preset_r5.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(preset_r5.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(preset_r5.usageCount > 0 ? 5 : -1);
  }
}
function QuickActionsPanelComponent_Conditional_43_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 35)(1, "div", 2)(2, "div", 36)(3, "span", 37);
    \u0275\u0275text(4, "\u{1F3AD}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 38);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "div", 36)(8, "span", 39);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "button", 40);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_43_For_6_Template_button_click_10_listener() {
      const rec_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.applyRecommendation(rec_r7));
    });
    \u0275\u0275text(11, " \u4F7F\u7528 ");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(12, "div", 29);
    \u0275\u0275text(13);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const rec_r7 = ctx.$implicit;
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(rec_r7.roleCombo.comboName);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("+", rec_r7.expectedImprovement.toFixed(1), "%");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(rec_r7.reason);
  }
}
function QuickActionsPanelComponent_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 23)(1, "h4", 34)(2, "span");
    \u0275\u0275text(3, "\u{1F4A1}");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(4, " AI \u63A8\u85A6 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275repeaterCreate(5, QuickActionsPanelComponent_Conditional_43_For_6_Template, 14, 3, "div", 35, _forTrack12);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r2.recommendations());
  }
}
function QuickActionsPanelComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 24)(1, "div", 2)(2, "div", 36)(3, "span", 41);
    \u0275\u0275text(4, "\u{1F514}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "span", 32);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "button", 42);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_44_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.viewAlerts.emit());
    });
    \u0275\u0275text(8, " \u67E5\u770B\u5168\u90E8 ");
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate1("", ctx_r2.alertCount(), " \u500B\u672A\u8655\u7406\u544A\u8B66");
  }
}
function QuickActionsPanelComponent_Conditional_45_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 47)(1, "div", 5)(2, "span", 50);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div")(5, "div", 38);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div", 7);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(9, "button", 51);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_45_For_6_Template_button_click_9_listener() {
      const preset_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.deletePreset(preset_r11.id));
    });
    \u0275\u0275text(10, " \u{1F5D1}\uFE0F ");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const preset_r11 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(preset_r11.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(preset_r11.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(preset_r11.description);
  }
}
function QuickActionsPanelComponent_Conditional_45_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 43);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_45_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showPresetManager.set(false));
    });
    \u0275\u0275domElementStart(1, "div", 44);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_45_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r9);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275domElementStart(2, "h3", 45);
    \u0275\u0275text(3, "\u7BA1\u7406\u5E38\u7528\u914D\u7F6E");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 46);
    \u0275\u0275repeaterCreate(5, QuickActionsPanelComponent_Conditional_45_For_6_Template, 11, 3, "div", 47, _forTrack03);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div", 48)(8, "button", 49);
    \u0275\u0275domListener("click", function QuickActionsPanelComponent_Conditional_45_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showPresetManager.set(false));
    });
    \u0275\u0275text(9, " \u95DC\u9589 ");
    \u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r2.presets());
  }
}
var QuickActionsPanelComponent = class _QuickActionsPanelComponent {
  constructor() {
    this.timing = inject(SmartTimingService);
    this.automation = inject(SmartAutomationService);
    this.analytics = inject(MarketingAnalyticsService);
    this.startMarketing = new EventEmitter();
    this.viewAlerts = new EventEmitter();
    this.navigateTo = new EventEmitter();
    this.showPresetManager = signal(false, ...ngDevMode ? [{ debugName: "showPresetManager" }] : []);
    this.presets = signal([
      {
        id: "preset_quick_group",
        name: "\u7FA4\u7D44\u5FEB\u653B",
        icon: "\u{1F680}",
        description: "\u9867\u554F+\u5C08\u5BB6\u7D44\u5408\u5FEB\u901F\u5165\u7FA4",
        roleCombo: ["consultant", "expert"],
        targetType: "group",
        timing: "now",
        usageCount: 12
      },
      {
        id: "preset_private_nurture",
        name: "\u79C1\u804A\u57F9\u80B2",
        icon: "\u{1F4AC}",
        description: "\u55AE\u89D2\u8272\u7CBE\u7D30\u5316\u79C1\u804A",
        roleCombo: ["consultant"],
        targetType: "private",
        timing: "smart",
        usageCount: 8
      },
      {
        id: "preset_scheduled",
        name: "\u5B9A\u6642\u71DF\u92B7",
        icon: "\u23F0",
        description: "\u667A\u80FD\u9078\u6642\u5B9A\u6642\u767C\u9001",
        targetType: "both",
        timing: "scheduled",
        usageCount: 5
      }
    ], ...ngDevMode ? [{ debugName: "presets" }] : []);
    this.timingStatus = computed(() => this.timing.isGoodTimeNow(), ...ngDevMode ? [{ debugName: "timingStatus" }] : []);
    this.alertCount = computed(() => this.automation.unacknowledgedCount(), ...ngDevMode ? [{ debugName: "alertCount" }] : []);
    this.recommendations = computed(() => this.automation.getRecommendedRoles(), ...ngDevMode ? [{ debugName: "recommendations" }] : []);
    this.quickActions = [];
  }
  ngOnInit() {
    this.initQuickActions();
  }
  initQuickActions() {
    this.quickActions = [
      {
        id: "action_start_now",
        name: "\u7ACB\u5373\u958B\u59CB",
        icon: "\u{1F680}",
        description: "\u73FE\u5728\u958B\u59CB\u71DF\u92B7",
        color: "purple",
        category: "marketing",
        action: () => this.startMarketing.emit({ type: "immediate", config: {} })
      },
      {
        id: "action_smart_schedule",
        name: "\u667A\u80FD\u5B9A\u6642",
        icon: "\u23F1\uFE0F",
        description: "\u9078\u64C7\u6700\u4F73\u6642\u6A5F",
        color: "blue",
        category: "marketing",
        action: () => this.startMarketing.emit({ type: "smart_schedule", config: {} })
      },
      {
        id: "action_view_report",
        name: "\u67E5\u770B\u5831\u8868",
        icon: "\u{1F4CA}",
        description: "\u71DF\u92B7\u6548\u679C\u5206\u6790",
        color: "green",
        category: "analysis",
        action: () => this.navigateTo.emit("marketing-report"),
        badge: this.analytics.todayStats().conversions > 0 ? `+${this.analytics.todayStats().conversions}` : void 0
      },
      {
        id: "action_automation",
        name: "\u81EA\u52D5\u5316\u8A2D\u7F6E",
        icon: "\u2699\uFE0F",
        description: "\u914D\u7F6E\u81EA\u52D5\u898F\u5247",
        color: "slate",
        category: "automation",
        action: () => this.navigateTo.emit("automation")
      }
    ];
  }
  timingScoreClass() {
    const score = this.timingStatus().score;
    if (score >= 75)
      return "text-green-400";
    if (score >= 50)
      return "text-amber-400";
    return "text-red-400";
  }
  timingBgClass() {
    const score = this.timingStatus().score;
    if (score >= 75)
      return "bg-green-500/20 text-green-400";
    if (score >= 50)
      return "bg-amber-500/20 text-amber-400";
    return "bg-red-500/20 text-red-400";
  }
  getActionButtonClass(action) {
    const base = "border-slate-700 bg-slate-800 hover:bg-slate-700";
    if (action.disabled)
      return base + " opacity-50 cursor-not-allowed";
    switch (action.color) {
      case "purple":
        return "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20";
      case "blue":
        return "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20";
      case "green":
        return "border-green-500/30 bg-green-500/10 hover:bg-green-500/20";
      default:
        return base;
    }
  }
  executeAction(action) {
    if (!action.disabled) {
      action.action();
    }
  }
  launchPreset(preset) {
    this.presets.update((presets) => presets.map((p) => p.id === preset.id ? __spreadProps(__spreadValues({}, p), { usageCount: p.usageCount + 1, lastUsed: /* @__PURE__ */ new Date() }) : p));
    this.startMarketing.emit({
      type: "preset",
      config: {
        presetId: preset.id,
        roleCombo: preset.roleCombo,
        targetType: preset.targetType,
        timing: preset.timing
      }
    });
  }
  createNewPreset() {
    console.log("\u5275\u5EFA\u65B0\u9810\u8A2D");
  }
  deletePreset(presetId) {
    this.presets.update((presets) => presets.filter((p) => p.id !== presetId));
  }
  applyRecommendation(rec) {
    this.startMarketing.emit({
      type: "recommended",
      config: {
        roleCombo: rec.roleCombo,
        confidence: rec.confidence
      }
    });
  }
  static {
    this.\u0275fac = function QuickActionsPanelComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QuickActionsPanelComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _QuickActionsPanelComponent, selectors: [["app-quick-actions-panel"]], outputs: { startMarketing: "startMarketing", viewAlerts: "viewAlerts", navigateTo: "navigateTo" }, decls: 46, vars: 14, consts: [[1, "quick-actions-panel", "bg-slate-900", "border", "border-slate-700", "rounded-xl", "overflow-hidden"], [1, "p-4", "bg-gradient-to-r", "from-purple-500/20", "to-pink-500/20", "border-b", "border-slate-700"], [1, "flex", "items-center", "justify-between"], [1, "text-lg", "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-sm", "text-slate-400", "mt-1"], [1, "flex", "items-center", "gap-3"], [1, "text-right"], [1, "text-xs", "text-slate-400"], [1, "flex", "items-center", "gap-1"], [1, "text-lg", "font-bold"], [1, "w-12", "h-12", "rounded-full", "flex", "items-center", "justify-center", "text-2xl"], [1, "mt-3", "p-2", "bg-slate-800/50", "rounded-lg", "text-sm"], [1, "p-4"], [1, "grid", "grid-cols-2", "md:grid-cols-4", "gap-3"], [1, "p-4", "rounded-xl", "border", "transition-all", "hover:scale-105", "relative", 3, "disabled", "class"], [1, "p-4", "border-t", "border-slate-700"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-sm", "font-medium", "text-white", "flex", "items-center", "gap-2"], [1, "text-xs", "text-purple-400", "hover:text-purple-300", 3, "click"], [1, "flex", "gap-2", "flex-wrap"], [1, "px-3", "py-2", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "hover:bg-slate-700", "transition-all", "flex", "items-center", "gap-2"], [1, "px-3", "py-2", "border", "border-dashed", "border-slate-600", "rounded-lg", "hover:border-purple-500", "transition-all", "flex", "items-center", "gap-2", "text-slate-500", "hover:text-purple-400", 3, "click"], [1, "text-sm"], [1, "p-4", "border-t", "border-slate-700", "bg-gradient-to-r", "from-indigo-500/10", "to-violet-500/10"], [1, "p-4", "border-t", "border-slate-700", "bg-red-500/10"], [1, "fixed", "inset-0", "bg-black/50", "z-50", "flex", "items-center", "justify-center"], [1, "p-4", "rounded-xl", "border", "transition-all", "hover:scale-105", "relative", 3, "click", "disabled"], [1, "text-3xl", "mb-2"], [1, "text-sm", "font-medium", "text-white"], [1, "text-xs", "text-slate-400", "mt-1"], [1, "absolute", "top-2", "right-2", "px-1.5", "py-0.5", "text-xs", "rounded-full", "bg-red-500", "text-white"], [1, "px-3", "py-2", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "hover:bg-slate-700", "transition-all", "flex", "items-center", "gap-2", 3, "click"], [1, "text-sm", "text-white"], [1, "text-xs", "text-slate-500"], [1, "text-sm", "font-medium", "text-white", "flex", "items-center", "gap-2", "mb-3"], [1, "p-3", "bg-slate-800/50", "rounded-lg", "mb-2", "last:mb-0"], [1, "flex", "items-center", "gap-2"], [1, "text-purple-400"], [1, "text-white", "font-medium"], [1, "text-xs", "text-green-400"], [1, "px-2", "py-1", "text-xs", "bg-purple-500", "text-white", "rounded", "hover:bg-purple-600", 3, "click"], [1, "text-red-400"], [1, "text-xs", "text-red-400", "hover:text-red-300", 3, "click"], [1, "fixed", "inset-0", "bg-black/50", "z-50", "flex", "items-center", "justify-center", 3, "click"], [1, "bg-slate-900", "border", "border-slate-700", "rounded-xl", "w-full", "max-w-md", "p-6", 3, "click"], [1, "text-lg", "font-semibold", "text-white", "mb-4"], [1, "space-y-3", "max-h-96", "overflow-y-auto"], [1, "p-3", "bg-slate-800", "rounded-lg", "flex", "items-center", "justify-between"], [1, "flex", "justify-end", "gap-3", "mt-4"], [1, "px-4", "py-2", "text-slate-400", "hover:text-white", 3, "click"], [1, "text-xl"], [1, "text-red-400", "hover:text-red-300", 3, "click"]], template: function QuickActionsPanelComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div")(4, "h3", 3)(5, "span");
        \u0275\u0275text(6, "\u26A1");
        \u0275\u0275domElementEnd();
        \u0275\u0275text(7, " \u5FEB\u901F\u555F\u52D5 ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(8, "p", 4);
        \u0275\u0275text(9, "\u4E00\u9375\u958B\u59CB\u71DF\u92B7\u4EFB\u52D9");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(10, "div", 5)(11, "div", 6)(12, "div", 7);
        \u0275\u0275text(13, "\u7576\u524D\u6642\u6A5F");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(14, "div", 8)(15, "span", 9);
        \u0275\u0275text(16);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(17, "span", 7);
        \u0275\u0275text(18, "\u5206");
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(19, "div", 10);
        \u0275\u0275text(20);
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(21, "div", 11);
        \u0275\u0275text(22);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(23, "div", 12)(24, "div", 13);
        \u0275\u0275repeaterCreate(25, QuickActionsPanelComponent_For_26_Template, 8, 7, "button", 14, _forTrack03);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(27, "div", 15)(28, "div", 16)(29, "h4", 17)(30, "span");
        \u0275\u0275text(31, "\u{1F4CC}");
        \u0275\u0275domElementEnd();
        \u0275\u0275text(32, " \u5E38\u7528\u914D\u7F6E ");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(33, "button", 18);
        \u0275\u0275domListener("click", function QuickActionsPanelComponent_Template_button_click_33_listener() {
          return ctx.showPresetManager.set(true);
        });
        \u0275\u0275text(34, " \u7BA1\u7406\u914D\u7F6E ");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(35, "div", 19);
        \u0275\u0275repeaterCreate(36, QuickActionsPanelComponent_For_37_Template, 6, 3, "button", 20, _forTrack03);
        \u0275\u0275domElementStart(38, "button", 21);
        \u0275\u0275domListener("click", function QuickActionsPanelComponent_Template_button_click_38_listener() {
          return ctx.createNewPreset();
        });
        \u0275\u0275domElementStart(39, "span");
        \u0275\u0275text(40, "\u2795");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(41, "span", 22);
        \u0275\u0275text(42, "\u65B0\u589E");
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275conditionalCreate(43, QuickActionsPanelComponent_Conditional_43_Template, 7, 0, "div", 23);
        \u0275\u0275conditionalCreate(44, QuickActionsPanelComponent_Conditional_44_Template, 9, 1, "div", 24);
        \u0275\u0275domElementEnd();
        \u0275\u0275conditionalCreate(45, QuickActionsPanelComponent_Conditional_45_Template, 10, 0, "div", 25);
      }
      if (rf & 2) {
        \u0275\u0275advance(15);
        \u0275\u0275classMap(ctx.timingScoreClass());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.timingStatus().score, " ");
        \u0275\u0275advance(3);
        \u0275\u0275classMap(ctx.timingBgClass());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.timingStatus().isGood ? "\u2713" : "\u23F0", " ");
        \u0275\u0275advance();
        \u0275\u0275classProp("text-green-400", ctx.timingStatus().isGood)("text-amber-400", !ctx.timingStatus().isGood);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.timingStatus().suggestion, " ");
        \u0275\u0275advance(3);
        \u0275\u0275repeater(ctx.quickActions);
        \u0275\u0275advance(11);
        \u0275\u0275repeater(ctx.presets());
        \u0275\u0275advance(7);
        \u0275\u0275conditional(ctx.recommendations().length > 0 ? 43 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.alertCount() > 0 ? 44 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showPresetManager() ? 45 : -1);
      }
    }, dependencies: [CommonModule, FormsModule], styles: ["\n\n.quick-actions-panel[_ngcontent-%COMP%] {\n  max-width: 100%;\n}\n/*# sourceMappingURL=quick-actions-panel.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QuickActionsPanelComponent, [{
    type: Component,
    args: [{ selector: "app-quick-actions-panel", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="quick-actions-panel bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <!-- \u9802\u90E8\u72C0\u614B\u6B04 -->
      <div class="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-slate-700">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>\u26A1</span> \u5FEB\u901F\u555F\u52D5
            </h3>
            <p class="text-sm text-slate-400 mt-1">\u4E00\u9375\u958B\u59CB\u71DF\u92B7\u4EFB\u52D9</p>
          </div>
          
          <!-- \u6642\u6A5F\u6307\u793A\u5668 -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs text-slate-400">\u7576\u524D\u6642\u6A5F</div>
              <div class="flex items-center gap-1">
                <span class="text-lg font-bold" [class]="timingScoreClass()">
                  {{ timingStatus().score }}
                </span>
                <span class="text-xs text-slate-400">\u5206</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                 [class]="timingBgClass()">
              {{ timingStatus().isGood ? '\u2713' : '\u23F0' }}
            </div>
          </div>
        </div>
        
        <!-- \u6642\u6A5F\u5EFA\u8B70 -->
        <div class="mt-3 p-2 bg-slate-800/50 rounded-lg text-sm" [class.text-green-400]="timingStatus().isGood" [class.text-amber-400]="!timingStatus().isGood">
          {{ timingStatus().suggestion }}
        </div>
      </div>
      
      <!-- \u5FEB\u6377\u64CD\u4F5C\u7DB2\u683C -->
      <div class="p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          @for (action of quickActions; track action.id) {
            <button (click)="executeAction(action)"
                    [disabled]="action.disabled"
                    class="p-4 rounded-xl border transition-all hover:scale-105 relative"
                    [class]="getActionButtonClass(action)">
              <div class="text-3xl mb-2">{{ action.icon }}</div>
              <div class="text-sm font-medium text-white">{{ action.name }}</div>
              <div class="text-xs text-slate-400 mt-1">{{ action.description }}</div>
              @if (action.badge) {
                <span class="absolute top-2 right-2 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {{ action.badge }}
                </span>
              }
            </button>
          }
        </div>
      </div>
      
      <!-- \u9810\u8A2D\u914D\u7F6E -->
      <div class="p-4 border-t border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-white flex items-center gap-2">
            <span>\u{1F4CC}</span> \u5E38\u7528\u914D\u7F6E
          </h4>
          <button (click)="showPresetManager.set(true)" 
                  class="text-xs text-purple-400 hover:text-purple-300">
            \u7BA1\u7406\u914D\u7F6E
          </button>
        </div>
        
        <div class="flex gap-2 flex-wrap">
          @for (preset of presets(); track preset.id) {
            <button (click)="launchPreset(preset)"
                    class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-all flex items-center gap-2">
              <span>{{ preset.icon }}</span>
              <span class="text-sm text-white">{{ preset.name }}</span>
              @if (preset.usageCount > 0) {
                <span class="text-xs text-slate-500">\xD7{{ preset.usageCount }}</span>
              }
            </button>
          }
          
          <button (click)="createNewPreset()"
                  class="px-3 py-2 border border-dashed border-slate-600 rounded-lg hover:border-purple-500 transition-all flex items-center gap-2 text-slate-500 hover:text-purple-400">
            <span>\u2795</span>
            <span class="text-sm">\u65B0\u589E</span>
          </button>
        </div>
      </div>
      
      <!-- \u667A\u80FD\u63A8\u85A6 -->
      @if (recommendations().length > 0) {
        <div class="p-4 border-t border-slate-700 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
          <h4 class="text-sm font-medium text-white flex items-center gap-2 mb-3">
            <span>\u{1F4A1}</span> AI \u63A8\u85A6
          </h4>
          
          @for (rec of recommendations(); track rec.roleCombo.comboId) {
            <div class="p-3 bg-slate-800/50 rounded-lg mb-2 last:mb-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-purple-400">\u{1F3AD}</span>
                  <span class="text-white font-medium">{{ rec.roleCombo.comboName }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-green-400">+{{ rec.expectedImprovement.toFixed(1) }}%</span>
                  <button (click)="applyRecommendation(rec)"
                          class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">
                    \u4F7F\u7528
                  </button>
                </div>
              </div>
              <div class="text-xs text-slate-400 mt-1">{{ rec.reason }}</div>
            </div>
          }
        </div>
      }
      
      <!-- \u544A\u8B66\u63D0\u793A -->
      @if (alertCount() > 0) {
        <div class="p-4 border-t border-slate-700 bg-red-500/10">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-red-400">\u{1F514}</span>
              <span class="text-sm text-white">{{ alertCount() }} \u500B\u672A\u8655\u7406\u544A\u8B66</span>
            </div>
            <button (click)="viewAlerts.emit()"
                    class="text-xs text-red-400 hover:text-red-300">
              \u67E5\u770B\u5168\u90E8
            </button>
          </div>
        </div>
      }
    </div>
    
    <!-- \u9810\u8A2D\u7BA1\u7406\u5F48\u7A97 -->
    @if (showPresetManager()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showPresetManager.set(false)">
        <div class="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-white mb-4">\u7BA1\u7406\u5E38\u7528\u914D\u7F6E</h3>
          
          <div class="space-y-3 max-h-96 overflow-y-auto">
            @for (preset of presets(); track preset.id) {
              <div class="p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-xl">{{ preset.icon }}</span>
                  <div>
                    <div class="text-white font-medium">{{ preset.name }}</div>
                    <div class="text-xs text-slate-400">{{ preset.description }}</div>
                  </div>
                </div>
                <button (click)="deletePreset(preset.id)" class="text-red-400 hover:text-red-300">
                  \u{1F5D1}\uFE0F
                </button>
              </div>
            }
          </div>
          
          <div class="flex justify-end gap-3 mt-4">
            <button (click)="showPresetManager.set(false)"
                    class="px-4 py-2 text-slate-400 hover:text-white">
              \u95DC\u9589
            </button>
          </div>
        </div>
      </div>
    }
  `, styles: ["/* angular:styles/component:css;aa6a4b688016bc15ad791478e6a7f42a462cb4125e6b48653eb75e706a4793c3;D:/tgkz2026/src/components/quick-actions-panel.component.ts */\n.quick-actions-panel {\n  max-width: 100%;\n}\n/*# sourceMappingURL=quick-actions-panel.component.css.map */\n"] }]
  }], null, { startMarketing: [{
    type: Output
  }], viewAlerts: [{
    type: Output
  }], navigateTo: [{
    type: Output
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(QuickActionsPanelComponent, { className: "QuickActionsPanelComponent", filePath: "src/components/quick-actions-panel.component.ts", lineNumber: 223 });
})();

// src/views/dashboard-view.component.ts
var _forTrack04 = ($index, $item) => $item.id;
function DashboardViewComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 6);
    \u0275\u0275text(1, "\u{1F512}");
    \u0275\u0275elementEnd();
  }
}
function DashboardViewComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-smart-dashboard", 9);
    \u0275\u0275listener("navigateTo", function DashboardViewComponent_Conditional_12_Template_app_smart_dashboard_navigateTo_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo($event));
    });
    \u0275\u0275elementEnd();
  }
}
function DashboardViewComponent_Conditional_13_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 21);
  }
}
function DashboardViewComponent_Conditional_13_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 26);
  }
}
function DashboardViewComponent_Conditional_13_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 28);
  }
}
function DashboardViewComponent_Conditional_13_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 29);
  }
}
function DashboardViewComponent_Conditional_13_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 30);
  }
}
function DashboardViewComponent_Conditional_13_Conditional_49_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 53);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Conditional_49_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.navigateTo("trigger-rules"));
    });
    \u0275\u0275text(1, " \u26A0\uFE0F \u9700\u914D\u7F6E\u898F\u5247 ");
    \u0275\u0275elementEnd();
  }
}
function DashboardViewComponent_Conditional_13_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 54)(2, "div", 13);
    \u0275\u0275element(3, "div", 55);
    \u0275\u0275elementStart(4, "span", 56);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "button", 57);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Conditional_50_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.cancelAndRefresh());
    });
    \u0275\u0275elementStart(7, "span");
    \u0275\u0275text(8, "\u2715");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span");
    \u0275\u0275text(10, "\u53D6\u6D88");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(11, "div", 58);
    \u0275\u0275element(12, "div", 59);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "div", 60)(14, "div", 61)(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18, "\u5E33\u865F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "div", 61)(20, "span");
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "span");
    \u0275\u0275text(23, "\u7FA4\u7D44");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div", 61)(25, "span");
    \u0275\u0275text(26);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "span");
    \u0275\u0275text(28, "\u76E3\u63A7");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 61)(30, "span");
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "span");
    \u0275\u0275text(33, "AI");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 61)(35, "span");
    \u0275\u0275text(36);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "span");
    \u0275\u0275text(38, "\u5B8C\u6210");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.startMessage());
    \u0275\u0275advance(7);
    \u0275\u0275styleProp("width", ctx_r1.startProgress(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("text-emerald-400", ctx_r1.startProgress() >= 10)("text-slate-500", ctx_r1.startProgress() < 10);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.startProgress() >= 10 ? "\u2713" : "\u25CB");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-emerald-400", ctx_r1.startProgress() >= 40)("text-slate-500", ctx_r1.startProgress() < 40);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.startProgress() >= 40 ? "\u2713" : "\u25CB");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-emerald-400", ctx_r1.startProgress() >= 60)("text-slate-500", ctx_r1.startProgress() < 60);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.startProgress() >= 60 ? "\u2713" : "\u25CB");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-emerald-400", ctx_r1.startProgress() >= 80)("text-slate-500", ctx_r1.startProgress() < 80);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.startProgress() >= 80 ? "\u2713" : "\u25CB");
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-emerald-400", ctx_r1.startProgress() >= 100)("text-slate-500", ctx_r1.startProgress() < 100);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.startProgress() >= 100 ? "\u2713" : "\u25CB");
  }
}
function DashboardViewComponent_Conditional_13_Conditional_52_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Conditional_52_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.oneClickStart());
    });
    \u0275\u0275elementStart(1, "span", 63);
    \u0275\u0275text(2, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4, "\u4E00\u9375\u5168\u90E8\u555F\u52D5");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r1.starting());
  }
}
function DashboardViewComponent_Conditional_13_Conditional_53_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 64);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Conditional_53_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.oneClickStop());
    });
    \u0275\u0275elementStart(1, "span", 63);
    \u0275\u0275text(2, "\u{1F6D1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4, "\u4E00\u9375\u505C\u6B62\u6240\u6709");
    \u0275\u0275elementEnd()();
  }
}
function DashboardViewComponent_Conditional_13_For_65_For_18_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 73);
    \u0275\u0275text(1, "\u2192");
    \u0275\u0275elementEnd();
  }
}
function DashboardViewComponent_Conditional_13_For_65_For_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 71)(1, "span", 72);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, DashboardViewComponent_Conditional_13_For_65_For_18_Conditional_3_Template, 2, 0, "span", 73);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const step_r10 = ctx.$implicit;
    const \u0275$index_252_r11 = ctx.$index;
    const workflow_r9 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2(" ", ctx_r1.getStepIcon(step_r10.type), " ", step_r10.name, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(\u0275$index_252_r11 < workflow_r9.steps.length - 1 ? 3 : -1);
  }
}
function DashboardViewComponent_Conditional_13_For_65_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 41)(1, "div", 65)(2, "div", 66)(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 67);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 68);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_For_65_Template_button_click_7_listener() {
      const workflow_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.automationWorkflow.toggleWorkflow(workflow_r9.id, !workflow_r9.enabled));
    });
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 69)(10, "span");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span");
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 70);
    \u0275\u0275repeaterCreate(17, DashboardViewComponent_Conditional_13_For_65_For_18_Template, 4, 3, "div", 71, _forTrack04);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const workflow_r9 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275classProp("text-emerald-400", workflow_r9.enabled)("text-slate-500", !workflow_r9.enabled);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", workflow_r9.enabled ? "\u{1F7E2}" : "\u26AA", " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(workflow_r9.name);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-emerald-500", workflow_r9.enabled)("hover:bg-emerald-600", workflow_r9.enabled)("text-white", workflow_r9.enabled)("bg-slate-600", !workflow_r9.enabled)("hover:bg-slate-500", !workflow_r9.enabled)("text-slate-300", !workflow_r9.enabled);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", workflow_r9.enabled ? "\u904B\u884C\u4E2D" : "\u5DF2\u66AB\u505C", " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u4ECA\u65E5\u89F8\u767C: ", workflow_r9.stats.todayTriggers);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u9032\u884C\u4E2D: ", ctx_r1.automationWorkflow.activeExecutionCount());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u8F49\u5316: ", workflow_r9.stats.conversions);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(workflow_r9.steps);
  }
}
function DashboardViewComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-quick-actions-panel", 10);
    \u0275\u0275listener("startMarketing", function DashboardViewComponent_Conditional_13_Template_app_quick_actions_panel_startMarketing_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.handleQuickStart($event));
    })("navigateTo", function DashboardViewComponent_Conditional_13_Template_app_quick_actions_panel_navigateTo_0_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo($event));
    })("viewAlerts", function DashboardViewComponent_Conditional_13_Template_app_quick_actions_panel_viewAlerts_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo("monitoring"));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(1, "div", 11)(2, "div", 12)(3, "div", 13)(4, "span", 14);
    \u0275\u0275text(5, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "h3", 15);
    \u0275\u0275text(7, "\u4E00\u9375\u904B\u884C\u4E2D\u5FC3");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "button", 16);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.refreshStatus());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(9, "svg", 17);
    \u0275\u0275element(10, "path", 18);
    \u0275\u0275elementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(11, "div", 19)(12, "div", 20);
    \u0275\u0275conditionalCreate(13, DashboardViewComponent_Conditional_13_Conditional_13_Template, 1, 0, "div", 21);
    \u0275\u0275elementStart(14, "div", 22)(15, "div", 23);
    \u0275\u0275text(16, "\u{1F511}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 24);
    \u0275\u0275text(18, "\u5E33\u865F\u5728\u7DDA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 25);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(21, "div", 20);
    \u0275\u0275conditionalCreate(22, DashboardViewComponent_Conditional_13_Conditional_22_Template, 1, 0, "div", 26);
    \u0275\u0275elementStart(23, "div", 22)(24, "div", 23);
    \u0275\u0275text(25, "\u{1F4E1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 24);
    \u0275\u0275text(27, "\u76E3\u63A7\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 27);
    \u0275\u0275conditionalCreate(29, DashboardViewComponent_Conditional_13_Conditional_29_Template, 1, 0, "span", 28);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(31, "div", 20);
    \u0275\u0275conditionalCreate(32, DashboardViewComponent_Conditional_13_Conditional_32_Template, 1, 0, "div", 29);
    \u0275\u0275elementStart(33, "div", 22)(34, "div", 23);
    \u0275\u0275text(35, "\u{1F916}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(36, "div", 24);
    \u0275\u0275text(37, "AI \u804A\u5929");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "div", 25);
    \u0275\u0275text(39);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(40, "div", 20);
    \u0275\u0275conditionalCreate(41, DashboardViewComponent_Conditional_13_Conditional_41_Template, 1, 0, "div", 30);
    \u0275\u0275elementStart(42, "div", 22)(43, "div", 23);
    \u0275\u0275text(44, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "div", 24);
    \u0275\u0275text(46, "\u89F8\u767C\u898F\u5247");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "div", 25);
    \u0275\u0275text(48);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(49, DashboardViewComponent_Conditional_13_Conditional_49_Template, 2, 0, "div", 31);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(50, DashboardViewComponent_Conditional_13_Conditional_50_Template, 39, 28, "div", 32);
    \u0275\u0275elementStart(51, "div", 33);
    \u0275\u0275conditionalCreate(52, DashboardViewComponent_Conditional_13_Conditional_52_Template, 5, 1, "button", 34)(53, DashboardViewComponent_Conditional_13_Conditional_53_Template, 5, 0, "button", 35);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "div", 36)(55, "div", 37)(56, "div", 12)(57, "div", 13)(58, "span", 38);
    \u0275\u0275text(59, "\u{1F3AF}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "h3", 39);
    \u0275\u0275text(61, "\u5F15\u5C0E\u5F0F\u5DE5\u4F5C\u6D41");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(62, "p", 40);
    \u0275\u0275text(63, " \u95DC\u9375\u8A5E\u89F8\u767C \u2192 AI \u7B56\u5283 \u2192 \u79C1\u804A\u57F9\u80B2 \u2192 \u8208\u8DA3\u5EFA\u7FA4 \u2192 \u7D44\u7FA4\u6210\u4EA4 ");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(64, DashboardViewComponent_Conditional_13_For_65_Template, 19, 22, "div", 41, _forTrack04);
    \u0275\u0275elementStart(66, "div", 42);
    \u0275\u0275text(67, " \u{1F4A1} \u555F\u7528\u5F8C\uFF0C\u7576\u76E3\u63A7\u7FA4\u7D44\u89F8\u767C\u95DC\u9375\u8A5E\u6642\uFF0C\u5C07\u81EA\u52D5\u57F7\u884C AI \u7B56\u5283\u4E26\u958B\u59CB\u591A\u89D2\u8272\u5354\u4F5C ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(68, "div", 37)(69, "div", 43)(70, "span", 38);
    \u0275\u0275text(71, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(72, "h3", 39);
    \u0275\u0275text(73, "\u5FEB\u901F\u64CD\u4F5C");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(74, "div", 44)(75, "button", 45);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Template_button_click_75_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo("multi-role"));
    });
    \u0275\u0275elementStart(76, "div", 46);
    \u0275\u0275text(77, "\u{1F3AD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(78, "div", 47);
    \u0275\u0275text(79, "\u624B\u52D5\u7B56\u5283");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(80, "div", 48);
    \u0275\u0275text(81, "\u958B\u59CB AI \u591A\u89D2\u8272\u5354\u4F5C");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(82, "button", 49);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Template_button_click_82_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo("monitoring-groups"));
    });
    \u0275\u0275elementStart(83, "div", 46);
    \u0275\u0275text(84, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(85, "div", 47);
    \u0275\u0275text(86, "\u76E3\u63A7\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(87, "div", 48);
    \u0275\u0275text(88, "\u914D\u7F6E\u76E3\u63A7\u4F86\u6E90");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(89, "button", 50);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Template_button_click_89_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo("keyword-sets"));
    });
    \u0275\u0275elementStart(90, "div", 46);
    \u0275\u0275text(91, "\u{1F511}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(92, "div", 47);
    \u0275\u0275text(93, "\u95DC\u9375\u8A5E\u96C6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(94, "div", 48);
    \u0275\u0275text(95, "\u8A2D\u7F6E\u89F8\u767C\u8A5E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(96, "button", 51);
    \u0275\u0275listener("click", function DashboardViewComponent_Conditional_13_Template_button_click_96_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo("leads"));
    });
    \u0275\u0275elementStart(97, "div", 46);
    \u0275\u0275text(98, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(99, "div", 47);
    \u0275\u0275text(100, "\u67E5\u770B\u7DDA\u7D22");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(101, "div", 48);
    \u0275\u0275text(102, "\u7BA1\u7406\u6F5B\u5728\u5BA2\u6236");
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(103, "app-quick-workflow", 52);
    \u0275\u0275listener("navigateTo", function DashboardViewComponent_Conditional_13_Template_app_quick_workflow_navigateTo_103_listener($event) {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateTo($event));
    })("startMonitoring", function DashboardViewComponent_Conditional_13_Template_app_quick_workflow_startMonitoring_103_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.startMonitoring());
    })("stopMonitoring", function DashboardViewComponent_Conditional_13_Template_app_quick_workflow_stopMonitoring_103_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.stopMonitoring());
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_8_0;
    let tmp_9_0;
    let tmp_10_0;
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_16_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(13);
    \u0275\u0275conditional(ctx_r1.onlineAccountsCount() > 0 ? 13 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275styleProp("color", ctx_r1.onlineAccountsCount() > 0 ? "var(--success)" : "var(--error)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r1.onlineAccountsCount(), "/", ctx_r1.totalAccountsCount(), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isMonitoring() ? 22 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275styleProp("color", ctx_r1.isMonitoring() ? "var(--success)" : "var(--error)");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isMonitoring() ? 29 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.isMonitoring() ? "\u904B\u884C\u4E2D" : "\u672A\u555F\u52D5", " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(((tmp_8_0 = ctx_r1.status().ai) == null ? null : tmp_8_0.enabled) ? 32 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275styleProp("color", ((tmp_9_0 = ctx_r1.status().ai) == null ? null : tmp_9_0.enabled) ? "var(--success)" : "var(--error)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ((tmp_10_0 = ctx_r1.status().ai) == null ? null : tmp_10_0.enabled) ? ((tmp_10_0 = ctx_r1.status().ai) == null ? null : tmp_10_0.mode) === "full" ? "\u5168\u81EA\u52D5" : "\u534A\u81EA\u52D5" : "\u672A\u555F\u7528", " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional((((tmp_11_0 = ctx_r1.status().campaigns) == null ? null : tmp_11_0.active) || 0) > 0 ? 41 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275styleProp("color", (((tmp_12_0 = ctx_r1.status().campaigns) == null ? null : tmp_12_0.active) || 0) > 0 ? "var(--success)" : "var(--warning)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ((tmp_13_0 = ctx_r1.status().campaigns) == null ? null : tmp_13_0.active) || 0, "/", ((tmp_13_0 = ctx_r1.status().campaigns) == null ? null : tmp_13_0.total) || 0, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional((((tmp_14_0 = ctx_r1.status().campaigns) == null ? null : tmp_14_0.active) || 0) === 0 ? 49 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.starting() ? 50 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r1.isMonitoring() || !((tmp_16_0 = ctx_r1.status().ai) == null ? null : tmp_16_0.enabled) ? 52 : 53);
    \u0275\u0275advance(12);
    \u0275\u0275repeater(ctx_r1.automationWorkflow.workflows());
    \u0275\u0275advance(39);
    \u0275\u0275property("systemStatus", ctx_r1.status())("isMonitoring", ctx_r1.isMonitoring());
  }
}
var DashboardViewComponent = class _DashboardViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.accountService = inject(AccountManagementService);
    this.membershipService = inject(MembershipService);
    this.automationWorkflow = inject(AutomationWorkflowService);
    this.mode = signal("classic", ...ngDevMode ? [{ debugName: "mode" }] : []);
    this.starting = signal(false, ...ngDevMode ? [{ debugName: "starting" }] : []);
    this.startProgress = signal(0, ...ngDevMode ? [{ debugName: "startProgress" }] : []);
    this.startMessage = signal("", ...ngDevMode ? [{ debugName: "startMessage" }] : []);
    this.monitoringService = inject(MonitoringManagementService);
    this.isMonitoring = computed(() => this.monitoringService.monitoringActive(), ...ngDevMode ? [{ debugName: "isMonitoring" }] : []);
    this.startTimeoutId = null;
    this.START_TIMEOUT_MS = 12e4;
    this.heartbeatIntervalId = null;
    this.HEARTBEAT_INTERVAL_MS = 3e4;
    this._status = signal({}, ...ngDevMode ? [{ debugName: "_status" }] : []);
    this.status = this._status.asReadonly();
    this.onlineAccountsCount = computed(() => {
      const accounts = this.accountService.accounts();
      return accounts.filter((a) => a.status === "Online" || a.is_connected).length;
    }, ...ngDevMode ? [{ debugName: "onlineAccountsCount" }] : []);
    this.totalAccountsCount = computed(() => this.accountService.accounts().length, ...ngDevMode ? [{ debugName: "totalAccountsCount" }] : []);
    this.ipcCleanup = [];
  }
  ngOnInit() {
    console.log("[DashboardView] Component initialized");
    this.loadInitialData();
    this.setupIpcListeners();
    this.startHeartbeat();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
    this.clearStartTimeout();
    this.stopHeartbeat();
  }
  // 🔧 P2: 啟動狀態心跳
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatIntervalId = setInterval(() => {
      console.log("[DashboardView] \u5FC3\u8DF3\uFF1A\u5237\u65B0\u72C0\u614B");
      this.refreshStatus();
    }, this.HEARTBEAT_INTERVAL_MS);
  }
  // 🔧 P2: 停止狀態心跳
  stopHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }
  loadInitialData() {
    this.refreshStatus();
  }
  setupIpcListeners() {
    const cleanup1 = this.ipc.on("system-status", (data) => {
      this._status.set(data);
    });
    const cleanup2c = this.ipc.on("monitoring-started", (data) => {
      console.log("[DashboardView] \u76E3\u63A7\u5DF2\u555F\u52D5:", data);
      this.toast.success(data.message || "\u76E3\u63A7\u5DF2\u6210\u529F\u555F\u52D5");
    });
    const cleanup2d = this.ipc.on("monitoring-start-failed", (data) => {
      console.log("[DashboardView] \u76E3\u63A7\u555F\u52D5\u5931\u6557:", data);
      let errorMsg = data.message || "\u76E3\u63A7\u555F\u52D5\u5931\u6557";
      if (data.reason === "config_check_failed" && data.issues?.length) {
        errorMsg = `\u914D\u7F6E\u932F\u8AA4: ${data.issues[0]?.message || errorMsg}`;
      } else if (data.reason === "no_accessible_groups") {
        errorMsg = "\u7121\u6CD5\u8A2A\u554F\u76E3\u63A7\u7FA4\u7D44\uFF0C\u8ACB\u78BA\u4FDD\u5E33\u865F\u5DF2\u52A0\u5165\u7FA4\u7D44";
      } else if (data.reason === "all_accounts_failed") {
        errorMsg = "\u6240\u6709\u76E3\u63A7\u5E33\u865F\u90FD\u7121\u6CD5\u555F\u52D5";
      }
      this.toast.error(errorMsg, 5e3);
    });
    const cleanup2e = this.ipc.on("monitoring-stopped", () => {
      console.log("[DashboardView] \u76E3\u63A7\u5DF2\u505C\u6B62");
      this.toast.info("\u76E3\u63A7\u5DF2\u505C\u6B62");
    });
    const cleanup3 = this.ipc.on("one-click-start-progress", (data) => {
      console.log("[DashboardView] \u6536\u5230\u4E00\u9375\u555F\u52D5\u9032\u5EA6:", data);
      this.startProgress.set(data.progress);
      this.startMessage.set(data.message);
      if (data.step === "complete" || data.step === "error" || data.progress >= 100) {
        setTimeout(() => {
          this.starting.set(false);
          this.refreshStatus();
        }, 500);
      }
    });
    const cleanup4 = this.ipc.on("one-click-start-result", (data) => {
      console.log("[DashboardView] \u6536\u5230\u4E00\u9375\u555F\u52D5\u7D50\u679C:", data);
      this.clearStartTimeout();
      this.starting.set(false);
      this.startProgress.set(100);
      this.startMessage.set(data.overall_success ? "\u2705 \u555F\u52D5\u5B8C\u6210" : "\u26A0\uFE0F \u90E8\u5206\u555F\u52D5\u5931\u6557");
      if (data.monitoring?.success !== void 0) {
        console.log("[DashboardView] \u4E00\u9375\u555F\u52D5\u7D50\u679C\u76E3\u63A7\u72C0\u614B:", data.monitoring.success);
      }
      this.refreshStatus();
      setTimeout(() => {
        this.startMessage.set("");
      }, 3e3);
    });
    this.ipcCleanup.push(cleanup1, cleanup2c, cleanup2d, cleanup2e, cleanup3, cleanup4);
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 切換模式
  switchMode(mode) {
    if (mode === "smart" && !this.membershipService.hasFeature("smartMode")) {
      this.toast.warning("\u9700\u8981\u9EC3\u91D1\u5927\u5E2B\u6216\u4EE5\u4E0A\u6703\u54E1");
      return;
    }
    this.mode.set(mode);
  }
  // 🔧 P0: 修復導航方法，支持對象類型 { view, handler }
  navigateTo(event) {
    const rawView = typeof event === "string" ? event : event.view;
    const handler = typeof event === "string" ? void 0 : event.handler;
    const viewMap = {
      "resources": "resource-center",
      "accounts": "accounts",
      "add-account": "add-account",
      // 🔧 P0: 現在有對應的 @case 分支
      "automation": "automation",
      "ads": "leads",
      // 批量發送導向發送控制台
      "leads": "leads",
      "nurturing-analytics": "nurturing-analytics",
      "ai-center": "aiCenter",
      "multi-role": "multi-role"
    };
    const view = viewMap[rawView] || rawView;
    console.log("[DashboardView] navigateTo:", { rawView, view, handler });
    if (handler) {
      this.executeHandler(handler);
    }
    if (view) {
      this.nav.navigateTo(view);
    }
  }
  // 🔧 P0: 執行 handler 操作
  executeHandler(handler) {
    console.log("[DashboardView] executeHandler:", handler);
    switch (handler) {
      // QuickWorkflowComponent 定義的 handler
      case "scan-sessions":
        this.ipc.send("scan-orphan-sessions");
        this.toast.info("\u{1F50D} \u6B63\u5728\u6383\u63CF\u53EF\u6062\u5FA9\u7684 Session...");
        break;
      case "new-campaign":
        this.ipc.send("open-add-campaign-dialog");
        this.toast.info("\u26A1 \u6B63\u5728\u6253\u958B\u5275\u5EFA\u6D3B\u52D5\u5C0D\u8A71\u6846...");
        break;
      case "export-leads":
        this.ipc.send("open-export-dialog");
        this.toast.info("\u{1F4E5} \u6B63\u5728\u6253\u958B\u5C0E\u51FA\u5C0D\u8A71\u6846...");
        break;
      case "start-monitoring":
        this.startMonitoring();
        break;
      case "run-script":
        this.toast.info("\u{1F3AC} \u6B63\u5728\u555F\u52D5\u5287\u672C\u57F7\u884C...");
        this.ipc.send("run-multi-role-script");
        break;
      // 兼容其他可能的 handler
      case "openAddAccountDialog":
        this.ipc.send("open-add-account-dialog");
        break;
      case "stopMonitoring":
        this.stopMonitoring();
        break;
      default:
        console.warn("[DashboardView] Unknown handler:", handler);
        this.toast.info(`\u6B63\u5728\u8655\u7406: ${handler}...`);
    }
  }
  // 刷新狀態
  refreshStatus() {
    this.ipc.send("get-system-status");
    this.ipc.send("get-monitoring-status");
  }
  // 🔧 P0 v2: 一鍵啟動（不在前端阻止，讓後端處理帳號連接）
  oneClickStart() {
    if (this.starting()) {
      this.toast.warning("\u6B63\u5728\u555F\u52D5\u4E2D\uFF0C\u8ACB\u7A0D\u5019...", 2e3);
      return;
    }
    const totalAccounts = this.totalAccountsCount();
    if (totalAccounts === 0) {
      this.toast.error("\u274C \u6C92\u6709\u914D\u7F6E\u4EFB\u4F55\u5E33\u865F\uFF0C\u8ACB\u5148\u6DFB\u52A0\u5E33\u865F", 4e3);
      return;
    }
    this.starting.set(true);
    this.startProgress.set(0);
    this.startMessage.set(`\u{1F680} \u958B\u59CB\u555F\u52D5 (${totalAccounts} \u500B\u5E33\u865F)...`);
    this.clearStartTimeout();
    this.startTimeoutId = setTimeout(() => {
      if (this.starting()) {
        console.warn("[DashboardView] \u4E00\u9375\u555F\u52D5\u8D85\u6642\uFF0C\u81EA\u52D5\u6062\u5FA9");
        this.starting.set(false);
        this.startMessage.set("\u26A0\uFE0F \u555F\u52D5\u8D85\u6642\uFF0C\u8ACB\u6AA2\u67E5\u5F8C\u7AEF\u72C0\u614B");
        this.toast.warning("\u555F\u52D5\u8D85\u6642\uFF0C\u6B63\u5728\u5237\u65B0\u72C0\u614B...", 3e3);
        this.refreshStatus();
      }
    }, this.START_TIMEOUT_MS);
    this.ipc.send("one-click-start", { forceRefresh: true });
    this.toast.info(`\u{1F680} \u958B\u59CB\u4E00\u9375\u555F\u52D5\uFF0C\u5F8C\u7AEF\u5C07\u81EA\u52D5\u9023\u63A5 ${totalAccounts} \u500B\u5E33\u865F`, 3e3);
  }
  // 🔧 P1: 清除超時計時器
  clearStartTimeout() {
    if (this.startTimeoutId) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }
  // 🔧 P1: 取消啟動並刷新狀態
  cancelAndRefresh() {
    console.log("[DashboardView] \u7528\u6236\u53D6\u6D88\u555F\u52D5");
    this.clearStartTimeout();
    this.starting.set(false);
    this.startProgress.set(0);
    this.startMessage.set("");
    this.toast.info("\u5DF2\u53D6\u6D88\uFF0C\u6B63\u5728\u5237\u65B0\u72C0\u614B...", 2e3);
    this.refreshStatus();
  }
  // 一鍵停止
  oneClickStop() {
    this.ipc.send("one-click-stop");
    this.toast.info("\u6B63\u5728\u505C\u6B62\u6240\u6709\u670D\u52D9...");
  }
  // 啟動監控
  startMonitoring() {
    this.ipc.send("start-monitoring");
  }
  // 停止監控
  stopMonitoring() {
    this.ipc.send("stop-monitoring");
  }
  // 🆕 P3: 處理快捷啟動
  handleQuickStart(event) {
    console.log("[Dashboard] \u5FEB\u6377\u555F\u52D5:", event);
    switch (event.type) {
      case "immediate":
        this.toast.info("\u{1F680} \u6B63\u5728\u555F\u52D5\u5373\u6642\u71DF\u92B7...");
        this.navigateTo("multi-role");
        break;
      case "smart_schedule":
        this.toast.info("\u23F1\uFE0F \u6B63\u5728\u914D\u7F6E\u667A\u80FD\u5B9A\u6642...");
        this.navigateTo("multi-role");
        break;
      case "preset":
        this.toast.success(`\u{1F4CC} \u4F7F\u7528\u9810\u8A2D\u914D\u7F6E: ${event.config.presetId}`);
        this.navigateTo("multi-role");
        break;
      case "recommended":
        this.toast.success(`\u{1F4A1} \u4F7F\u7528\u63A8\u85A6\u7D44\u5408: ${event.config.roleCombo?.comboName}`);
        this.navigateTo("multi-role");
        break;
      default:
        this.navigateTo("multi-role");
    }
  }
  // 🆕 Phase1: 獲取步驟圖標
  getStepIcon(stepType) {
    const icons = {
      "evaluate": "\u{1F4CA}",
      "plan": "\u{1F3AF}",
      "private_chat": "\u{1F4AC}",
      "detect_interest": "\u{1F50D}",
      "create_group": "\u{1F465}",
      "group_marketing": "\u{1F680}",
      "record": "\u{1F4DD}"
    };
    return icons[stepType] || "\u25B6\uFE0F";
  }
  static {
    this.\u0275fac = function DashboardViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _DashboardViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardViewComponent, selectors: [["app-dashboard-view"]], decls: 14, vars: 22, consts: [[1, "page-content"], [1, "bg-green-500", "text-white", "p-4", "rounded-lg", "mb-4", "text-center", "font-bold"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "text-4xl", "font-bold", 2, "color", "var(--text-primary)"], [1, "flex", "items-center", "gap-2", "bg-slate-800/50", "rounded-xl", "p-1"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", "flex", "items-center", "gap-1", 3, "click", "title"], [1, "text-xs"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "click"], [1, "block", "-mx-8", "-mb-8", 2, "height", "calc(100vh - 140px)"], [1, "block", "-mx-8", "-mb-8", 2, "height", "calc(100vh - 140px)", 3, "navigateTo"], [1, "mb-6", 3, "startMarketing", "navigateTo", "viewAlerts"], [1, "rounded-xl", "p-6", "mb-8", 2, "background", "linear-gradient(to right, var(--primary-bg), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))", "border", "1px solid var(--primary)", "box-shadow", "var(--shadow-lg)"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "flex", "items-center", "gap-3"], [1, "text-3xl"], [1, "text-xl", "font-bold", 2, "color", "var(--text-primary)"], ["title", "\u5237\u65B0\u72C0\u614B", 1, "transition-colors", 2, "color", "var(--text-muted)", 3, "click"], ["fill", "none", "viewBox", "0 0 24 24", "stroke", "currentColor", 1, "h-5", "w-5"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"], [1, "grid", "grid-cols-2", "md:grid-cols-4", "gap-4", "mb-6"], [1, "rounded-lg", "p-4", "text-center", "relative", "overflow-hidden", 2, "background-color", "var(--bg-card)"], [1, "absolute", "inset-0", "bg-gradient-to-t", "from-emerald-500/10", "to-transparent"], [1, "relative"], [1, "text-2xl", "mb-1"], [1, "text-sm", 2, "color", "var(--text-muted)"], [1, "text-xl", "font-bold"], [1, "absolute", "inset-0", "bg-gradient-to-t", "from-cyan-500/10", "to-transparent"], [1, "text-xl", "font-bold", "flex", "items-center", "justify-center", "gap-2"], [1, "w-2.5", "h-2.5", "rounded-full", "bg-emerald-400", "animate-pulse"], [1, "absolute", "inset-0", "bg-gradient-to-t", "from-purple-500/10", "to-transparent"], [1, "absolute", "inset-0", "bg-gradient-to-t", "from-orange-500/10", "to-transparent"], [1, "text-xs", "text-yellow-400", "mt-1", "cursor-pointer", "hover:underline"], [1, "bg-slate-800/50", "rounded-lg", "p-4", "mb-4", "border", "border-cyan-500/30"], [1, "flex", "gap-4"], [1, "flex-1", "bg-gradient-to-r", "from-cyan-500", "to-purple-500", "hover:from-cyan-600", "hover:to-purple-600", "disabled:opacity-50", "disabled:cursor-not-allowed", "text-white", "font-bold", "py-3", "px-6", "rounded-lg", "transition", "duration-200", "shadow-lg", "flex", "items-center", "justify-center", "gap-2", 3, "disabled"], [1, "flex-1", "bg-gradient-to-r", "from-red-500", "to-orange-500", "hover:from-red-600", "hover:to-orange-600", "text-white", "font-bold", "py-3", "px-6", "rounded-lg", "transition", "duration-200", "shadow-lg", "flex", "items-center", "justify-center", "gap-2"], [1, "grid", "grid-cols-1", "lg:grid-cols-2", "gap-6", "mb-8"], [1, "rounded-xl", "p-6", 2, "background-color", "var(--bg-card)", "border", "1px solid var(--border-color)"], [1, "text-2xl"], [1, "text-lg", "font-bold", 2, "color", "var(--text-primary)"], [1, "text-sm", "mb-4", 2, "color", "var(--text-muted)"], [1, "p-4", "rounded-lg", "mb-3", 2, "background-color", "var(--bg-secondary)"], [1, "text-xs", "p-3", "rounded-lg", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-muted)"], [1, "flex", "items-center", "gap-3", "mb-4"], [1, "grid", "grid-cols-2", "gap-3"], [1, "p-4", "rounded-lg", "text-left", "transition-colors", "hover:bg-purple-500/10", "border", "border-transparent", "hover:border-purple-500/30", 2, "background-color", "var(--bg-secondary)", 3, "click"], [1, "text-xl", "mb-1"], [1, "font-medium", "text-sm", 2, "color", "var(--text-primary)"], [1, "text-xs", 2, "color", "var(--text-muted)"], [1, "p-4", "rounded-lg", "text-left", "transition-colors", "hover:bg-cyan-500/10", "border", "border-transparent", "hover:border-cyan-500/30", 2, "background-color", "var(--bg-secondary)", 3, "click"], [1, "p-4", "rounded-lg", "text-left", "transition-colors", "hover:bg-amber-500/10", "border", "border-transparent", "hover:border-amber-500/30", 2, "background-color", "var(--bg-secondary)", 3, "click"], [1, "p-4", "rounded-lg", "text-left", "transition-colors", "hover:bg-emerald-500/10", "border", "border-transparent", "hover:border-emerald-500/30", 2, "background-color", "var(--bg-secondary)", 3, "click"], [3, "navigateTo", "startMonitoring", "stopMonitoring", "systemStatus", "isMonitoring"], [1, "text-xs", "text-yellow-400", "mt-1", "cursor-pointer", "hover:underline", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "animate-spin", "h-5", "w-5", "border-2", "border-cyan-500", "border-t-transparent", "rounded-full"], [1, "text-cyan-300", "font-medium"], ["title", "\u53D6\u6D88\u4E26\u5237\u65B0\u72C0\u614B", 1, "px-3", "py-1", "text-xs", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "rounded-lg", "transition-colors", "flex", "items-center", "gap-1", 3, "click"], [1, "w-full", "bg-slate-700", "rounded-full", "h-2.5", "mb-3"], [1, "bg-gradient-to-r", "from-cyan-500", "to-purple-500", "h-2.5", "rounded-full", "transition-all", "duration-300"], [1, "flex", "justify-between", "text-xs"], [1, "flex", "items-center", "gap-1"], [1, "flex-1", "bg-gradient-to-r", "from-cyan-500", "to-purple-500", "hover:from-cyan-600", "hover:to-purple-600", "disabled:opacity-50", "disabled:cursor-not-allowed", "text-white", "font-bold", "py-3", "px-6", "rounded-lg", "transition", "duration-200", "shadow-lg", "flex", "items-center", "justify-center", "gap-2", 3, "click", "disabled"], [1, "text-xl"], [1, "flex-1", "bg-gradient-to-r", "from-red-500", "to-orange-500", "hover:from-red-600", "hover:to-orange-600", "text-white", "font-bold", "py-3", "px-6", "rounded-lg", "transition", "duration-200", "shadow-lg", "flex", "items-center", "justify-center", "gap-2", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-2"], [1, "flex", "items-center", "gap-2"], [1, "font-medium", 2, "color", "var(--text-primary)"], [1, "px-3", "py-1", "rounded-lg", "text-sm", "font-medium", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-4", "text-xs", 2, "color", "var(--text-muted)"], [1, "flex", "items-center", "gap-1", "mt-3", "overflow-x-auto", "pb-1"], [1, "flex", "items-center"], [1, "px-2", "py-1", "text-xs", "rounded", "whitespace-nowrap", 2, "background-color", "var(--bg-tertiary)", "color", "var(--text-secondary)"], [1, "mx-1", 2, "color", "var(--text-muted)"]], template: function DashboardViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
        \u0275\u0275text(2, " \u2705 Dashboard \u8DEF\u7531\u5DF2\u52A0\u8F09\uFF01\u5982\u679C\u60A8\u770B\u5230\u9019\u500B\uFF0C\u8AAA\u660E\u8DEF\u7531\u6B63\u5E38\u5DE5\u4F5C\u3002 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "div", 2)(4, "h2", 3);
        \u0275\u0275text(5);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "div", 4)(7, "button", 5);
        \u0275\u0275listener("click", function DashboardViewComponent_Template_button_click_7_listener() {
          return ctx.switchMode("smart");
        });
        \u0275\u0275text(8, " \u{1F916} \u667A\u80FD\u6A21\u5F0F ");
        \u0275\u0275conditionalCreate(9, DashboardViewComponent_Conditional_9_Template, 2, 0, "span", 6);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "button", 7);
        \u0275\u0275listener("click", function DashboardViewComponent_Template_button_click_10_listener() {
          return ctx.switchMode("classic");
        });
        \u0275\u0275text(11, " \u{1F4CA} \u7D93\u5178\u6A21\u5F0F ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275conditionalCreate(12, DashboardViewComponent_Conditional_12_Template, 1, 0, "app-smart-dashboard", 8)(13, DashboardViewComponent_Conditional_13_Template, 104, 24);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(ctx.t("dashboard"));
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-gradient-to-r", ctx.mode() === "smart")("from-cyan-500", ctx.mode() === "smart")("to-blue-500", ctx.mode() === "smart")("text-white", ctx.mode() === "smart")("text-slate-400", ctx.mode() !== "smart")("opacity-60", !ctx.membershipService.hasFeature("smartMode"));
        \u0275\u0275property("title", !ctx.membershipService.hasFeature("smartMode") ? "\u9700\u8981 \u9EC3\u91D1\u5927\u5E2B \u6216\u4EE5\u4E0A\u6703\u54E1" : "");
        \u0275\u0275advance(2);
        \u0275\u0275conditional(!ctx.membershipService.hasFeature("smartMode") ? 9 : -1);
        \u0275\u0275advance();
        \u0275\u0275classProp("bg-slate-700", ctx.mode() === "classic")("text-white", ctx.mode() === "classic")("text-slate-400", ctx.mode() !== "classic");
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.mode() === "smart" ? 12 : 13);
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      SmartDashboardComponent,
      QuickWorkflowComponent,
      QuickActionsPanelComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardViewComponent, [{
    type: Component,
    args: [{
      selector: "app-dashboard-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        SmartDashboardComponent,
        QuickWorkflowComponent,
        QuickActionsPanelComponent
      ],
      template: `
    <div class="page-content">
      <!-- \u{1F50D} \u8DEF\u7531\u6E2C\u8A66\u6A19\u8A18 -->
      <div class="bg-green-500 text-white p-4 rounded-lg mb-4 text-center font-bold">
        \u2705 Dashboard \u8DEF\u7531\u5DF2\u52A0\u8F09\uFF01\u5982\u679C\u60A8\u770B\u5230\u9019\u500B\uFF0C\u8AAA\u660E\u8DEF\u7531\u6B63\u5E38\u5DE5\u4F5C\u3002
      </div>
      <!-- \u5100\u8868\u677F\u6A21\u5F0F\u5207\u63DB -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-4xl font-bold" style="color: var(--text-primary);">{{ t('dashboard') }}</h2>
        <div class="flex items-center gap-2 bg-slate-800/50 rounded-xl p-1">
          <button (click)="switchMode('smart')"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                  [class.bg-gradient-to-r]="mode() === 'smart'"
                  [class.from-cyan-500]="mode() === 'smart'"
                  [class.to-blue-500]="mode() === 'smart'"
                  [class.text-white]="mode() === 'smart'"
                  [class.text-slate-400]="mode() !== 'smart'"
                  [class.opacity-60]="!membershipService.hasFeature('smartMode')"
                  [title]="!membershipService.hasFeature('smartMode') ? '\u9700\u8981 \u9EC3\u91D1\u5927\u5E2B \u6216\u4EE5\u4E0A\u6703\u54E1' : ''">
            \u{1F916} \u667A\u80FD\u6A21\u5F0F
            @if (!membershipService.hasFeature('smartMode')) {
              <span class="text-xs">\u{1F512}</span>
            }
          </button>
          <button (click)="switchMode('classic')"
                  class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  [class.bg-slate-700]="mode() === 'classic'"
                  [class.text-white]="mode() === 'classic'"
                  [class.text-slate-400]="mode() !== 'classic'">
            \u{1F4CA} \u7D93\u5178\u6A21\u5F0F
          </button>
        </div>
      </div>
      
      @if (mode() === 'smart') {
        <app-smart-dashboard 
          class="block -mx-8 -mb-8" 
          style="height: calc(100vh - 140px);"
          (navigateTo)="navigateTo($event)">
        </app-smart-dashboard>
      } @else {
        <!-- \u{1F195} P3: \u5FEB\u6377\u64CD\u4F5C\u9762\u677F -->
        <app-quick-actions-panel
          class="mb-6"
          (startMarketing)="handleQuickStart($event)"
          (navigateTo)="navigateTo($event)"
          (viewAlerts)="navigateTo('monitoring')">
        </app-quick-actions-panel>
        
        <!-- \u{1F680} \u4E00\u9375\u904B\u884C\u4E2D\u5FC3 -->
        <div class="rounded-xl p-6 mb-8" style="background: linear-gradient(to right, var(--primary-bg), rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1)); border: 1px solid var(--primary); box-shadow: var(--shadow-lg);">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-3xl">\u{1F680}</span>
              <h3 class="text-xl font-bold" style="color: var(--text-primary);">\u4E00\u9375\u904B\u884C\u4E2D\u5FC3</h3>
            </div>
            <button (click)="refreshStatus()" class="transition-colors" style="color: var(--text-muted);" title="\u5237\u65B0\u72C0\u614B">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
          
          <!-- \u5FEB\u901F\u72C0\u614B\u6307\u793A\u5668 -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <!-- \u5E33\u865F\u72C0\u614B -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden" style="background-color: var(--bg-card);">
              @if (onlineAccountsCount() > 0) {
                <div class="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">\u{1F511}</div>
                <div class="text-sm" style="color: var(--text-muted);">\u5E33\u865F\u5728\u7DDA</div>
                <div class="text-xl font-bold" [style.color]="onlineAccountsCount() > 0 ? 'var(--success)' : 'var(--error)'">
                  {{ onlineAccountsCount() }}/{{ totalAccountsCount() }}
                </div>
              </div>
            </div>
            
            <!-- \u76E3\u63A7\u72C0\u614B -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden" style="background-color: var(--bg-card);">
              @if (isMonitoring()) {
                <div class="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">\u{1F4E1}</div>
                <div class="text-sm" style="color: var(--text-muted);">\u76E3\u63A7\u72C0\u614B</div>
                <div class="text-xl font-bold flex items-center justify-center gap-2" [style.color]="isMonitoring() ? 'var(--success)' : 'var(--error)'">
                  @if (isMonitoring()) {
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  }
                  {{ isMonitoring() ? '\u904B\u884C\u4E2D' : '\u672A\u555F\u52D5' }}
                </div>
              </div>
            </div>
            
            <!-- AI \u804A\u5929\u72C0\u614B -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden" style="background-color: var(--bg-card);">
              @if (status().ai?.enabled) {
                <div class="absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">\u{1F916}</div>
                <div class="text-sm" style="color: var(--text-muted);">AI \u804A\u5929</div>
                <div class="text-xl font-bold" [style.color]="status().ai?.enabled ? 'var(--success)' : 'var(--error)'">
                  {{ status().ai?.enabled ? (status().ai?.mode === 'full' ? '\u5168\u81EA\u52D5' : '\u534A\u81EA\u52D5') : '\u672A\u555F\u7528' }}
                </div>
              </div>
            </div>
            
            <!-- \u89F8\u767C\u898F\u5247\u72C0\u614B -->
            <div class="rounded-lg p-4 text-center relative overflow-hidden" style="background-color: var(--bg-card);">
              @if ((status().campaigns?.active || 0) > 0) {
                <div class="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent"></div>
              }
              <div class="relative">
                <div class="text-2xl mb-1">\u26A1</div>
                <div class="text-sm" style="color: var(--text-muted);">\u89F8\u767C\u898F\u5247</div>
                <div class="text-xl font-bold" [style.color]="(status().campaigns?.active || 0) > 0 ? 'var(--success)' : 'var(--warning)'">
                  {{ status().campaigns?.active || 0 }}/{{ status().campaigns?.total || 0 }}
                </div>
                @if ((status().campaigns?.active || 0) === 0) {
                  <div class="text-xs text-yellow-400 mt-1 cursor-pointer hover:underline" (click)="navigateTo('trigger-rules')">
                    \u26A0\uFE0F \u9700\u914D\u7F6E\u898F\u5247
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- \u{1F527} P1: \u589E\u5F37\u7248\u4E00\u9375\u555F\u52D5\u9032\u5EA6 -->
          @if (starting()) {
            <div class="bg-slate-800/50 rounded-lg p-4 mb-4 border border-cyan-500/30">
              <!-- \u7576\u524D\u6B65\u9A5F -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="animate-spin h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                  <span class="text-cyan-300 font-medium">{{ startMessage() }}</span>
                </div>
                <!-- \u{1F527} P1: \u624B\u52D5\u5237\u65B0/\u53D6\u6D88\u6309\u9215 -->
                <button (click)="cancelAndRefresh()" 
                        class="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-1"
                        title="\u53D6\u6D88\u4E26\u5237\u65B0\u72C0\u614B">
                  <span>\u2715</span>
                  <span>\u53D6\u6D88</span>
                </button>
              </div>
              
              <!-- \u9032\u5EA6\u689D -->
              <div class="w-full bg-slate-700 rounded-full h-2.5 mb-3">
                <div class="bg-gradient-to-r from-cyan-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" [style.width.%]="startProgress()"></div>
              </div>
              
              <!-- \u5206\u6B65\u6307\u793A\u5668 -->
              <div class="flex justify-between text-xs">
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 10" [class.text-slate-500]="startProgress() < 10">
                  <span>{{ startProgress() >= 10 ? '\u2713' : '\u25CB' }}</span>
                  <span>\u5E33\u865F</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 40" [class.text-slate-500]="startProgress() < 40">
                  <span>{{ startProgress() >= 40 ? '\u2713' : '\u25CB' }}</span>
                  <span>\u7FA4\u7D44</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 60" [class.text-slate-500]="startProgress() < 60">
                  <span>{{ startProgress() >= 60 ? '\u2713' : '\u25CB' }}</span>
                  <span>\u76E3\u63A7</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 80" [class.text-slate-500]="startProgress() < 80">
                  <span>{{ startProgress() >= 80 ? '\u2713' : '\u25CB' }}</span>
                  <span>AI</span>
                </div>
                <div class="flex items-center gap-1" [class.text-emerald-400]="startProgress() >= 100" [class.text-slate-500]="startProgress() < 100">
                  <span>{{ startProgress() >= 100 ? '\u2713' : '\u25CB' }}</span>
                  <span>\u5B8C\u6210</span>
                </div>
              </div>
            </div>
          }
          
          <!-- \u4E00\u9375\u555F\u52D5\u6309\u9215 -->
          <div class="flex gap-4">
            @if (!isMonitoring() || !status().ai?.enabled) {
              <button 
                (click)="oneClickStart()" 
                [disabled]="starting()"
                class="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg flex items-center justify-center gap-2">
                <span class="text-xl">\u26A1</span>
                <span>\u4E00\u9375\u5168\u90E8\u555F\u52D5</span>
              </button>
            } @else {
              <button 
                (click)="oneClickStop()" 
                class="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition duration-200 shadow-lg flex items-center justify-center gap-2">
                <span class="text-xl">\u{1F6D1}</span>
                <span>\u4E00\u9375\u505C\u6B62\u6240\u6709</span>
              </button>
            }
          </div>
        </div>
        
        <!-- \u{1F195} Phase1: \u81EA\u52D5\u5316\u5DE5\u4F5C\u6D41\u63A7\u5236 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <!-- \u{1F3AF} \u5F15\u5C0E\u5F0F\u5DE5\u4F5C\u6D41 -->
          <div class="rounded-xl p-6" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="text-2xl">\u{1F3AF}</span>
                <h3 class="text-lg font-bold" style="color: var(--text-primary);">\u5F15\u5C0E\u5F0F\u5DE5\u4F5C\u6D41</h3>
              </div>
            </div>
            <p class="text-sm mb-4" style="color: var(--text-muted);">
              \u95DC\u9375\u8A5E\u89F8\u767C \u2192 AI \u7B56\u5283 \u2192 \u79C1\u804A\u57F9\u80B2 \u2192 \u8208\u8DA3\u5EFA\u7FA4 \u2192 \u7D44\u7FA4\u6210\u4EA4
            </p>
            
            <!-- \u5DE5\u4F5C\u6D41\u72C0\u614B -->
            @for (workflow of automationWorkflow.workflows(); track workflow.id) {
              <div class="p-4 rounded-lg mb-3" style="background-color: var(--bg-secondary);">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span [class.text-emerald-400]="workflow.enabled" [class.text-slate-500]="!workflow.enabled">
                      {{ workflow.enabled ? '\u{1F7E2}' : '\u26AA' }}
                    </span>
                    <span class="font-medium" style="color: var(--text-primary);">{{ workflow.name }}</span>
                  </div>
                  <button (click)="automationWorkflow.toggleWorkflow(workflow.id, !workflow.enabled)"
                          class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                          [class.bg-emerald-500]="workflow.enabled"
                          [class.hover:bg-emerald-600]="workflow.enabled"
                          [class.text-white]="workflow.enabled"
                          [class.bg-slate-600]="!workflow.enabled"
                          [class.hover:bg-slate-500]="!workflow.enabled"
                          [class.text-slate-300]="!workflow.enabled">
                    {{ workflow.enabled ? '\u904B\u884C\u4E2D' : '\u5DF2\u66AB\u505C' }}
                  </button>
                </div>
                
                <!-- \u7D71\u8A08 -->
                <div class="flex items-center gap-4 text-xs" style="color: var(--text-muted);">
                  <span>\u4ECA\u65E5\u89F8\u767C: {{ workflow.stats.todayTriggers }}</span>
                  <span>\u9032\u884C\u4E2D: {{ automationWorkflow.activeExecutionCount() }}</span>
                  <span>\u8F49\u5316: {{ workflow.stats.conversions }}</span>
                </div>
                
                <!-- \u5DE5\u4F5C\u6D41\u6B65\u9A5F\u9810\u89BD -->
                <div class="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                  @for (step of workflow.steps; track step.id; let i = $index) {
                    <div class="flex items-center">
                      <span class="px-2 py-1 text-xs rounded whitespace-nowrap"
                            style="background-color: var(--bg-tertiary); color: var(--text-secondary);">
                        {{ getStepIcon(step.type) }} {{ step.name }}
                      </span>
                      @if (i < workflow.steps.length - 1) {
                        <span class="mx-1" style="color: var(--text-muted);">\u2192</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- \u8AAA\u660E -->
            <div class="text-xs p-3 rounded-lg" style="background-color: var(--bg-tertiary); color: var(--text-muted);">
              \u{1F4A1} \u555F\u7528\u5F8C\uFF0C\u7576\u76E3\u63A7\u7FA4\u7D44\u89F8\u767C\u95DC\u9375\u8A5E\u6642\uFF0C\u5C07\u81EA\u52D5\u57F7\u884C AI \u7B56\u5283\u4E26\u958B\u59CB\u591A\u89D2\u8272\u5354\u4F5C
            </div>
          </div>
          
          <!-- \u26A1 \u5FEB\u901F\u64CD\u4F5C -->
          <div class="rounded-xl p-6" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-2xl">\u26A1</span>
              <h3 class="text-lg font-bold" style="color: var(--text-primary);">\u5FEB\u901F\u64CD\u4F5C</h3>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <button (click)="navigateTo('multi-role')" 
                      class="p-4 rounded-lg text-left transition-colors hover:bg-purple-500/10 border border-transparent hover:border-purple-500/30"
                      style="background-color: var(--bg-secondary);">
                <div class="text-xl mb-1">\u{1F3AD}</div>
                <div class="font-medium text-sm" style="color: var(--text-primary);">\u624B\u52D5\u7B56\u5283</div>
                <div class="text-xs" style="color: var(--text-muted);">\u958B\u59CB AI \u591A\u89D2\u8272\u5354\u4F5C</div>
              </button>
              
              <button (click)="navigateTo('monitoring-groups')" 
                      class="p-4 rounded-lg text-left transition-colors hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30"
                      style="background-color: var(--bg-secondary);">
                <div class="text-xl mb-1">\u{1F465}</div>
                <div class="font-medium text-sm" style="color: var(--text-primary);">\u76E3\u63A7\u7FA4\u7D44</div>
                <div class="text-xs" style="color: var(--text-muted);">\u914D\u7F6E\u76E3\u63A7\u4F86\u6E90</div>
              </button>
              
              <button (click)="navigateTo('keyword-sets')" 
                      class="p-4 rounded-lg text-left transition-colors hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30"
                      style="background-color: var(--bg-secondary);">
                <div class="text-xl mb-1">\u{1F511}</div>
                <div class="font-medium text-sm" style="color: var(--text-primary);">\u95DC\u9375\u8A5E\u96C6</div>
                <div class="text-xs" style="color: var(--text-muted);">\u8A2D\u7F6E\u89F8\u767C\u8A5E</div>
              </button>
              
              <button (click)="navigateTo('leads')" 
                      class="p-4 rounded-lg text-left transition-colors hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30"
                      style="background-color: var(--bg-secondary);">
                <div class="text-xl mb-1">\u{1F4CB}</div>
                <div class="font-medium text-sm" style="color: var(--text-primary);">\u67E5\u770B\u7DDA\u7D22</div>
                <div class="text-xs" style="color: var(--text-muted);">\u7BA1\u7406\u6F5B\u5728\u5BA2\u6236</div>
              </button>
            </div>
          </div>
        </div>
        
        <!-- \u5FEB\u901F\u5DE5\u4F5C\u6D41 -->
        <app-quick-workflow
          [systemStatus]="status()"
          [isMonitoring]="isMonitoring()"
          (navigateTo)="navigateTo($event)"
          (startMonitoring)="startMonitoring()"
          (stopMonitoring)="stopMonitoring()">
        </app-quick-workflow>
      }
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardViewComponent, { className: "DashboardViewComponent", filePath: "src/views/dashboard-view.component.ts", lineNumber: 363 });
})();

export {
  DashboardViewComponent
};
//# sourceMappingURL=chunk-SPQ2ONI4.js.map
