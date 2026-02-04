import {
  ConfigProgressComponent,
  MonitoringStateService
} from "./chunk-XBRFXE36.js";
import {
  MonitoringManagementService
} from "./chunk-JYDDS6LH.js";
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
  CommonModule,
  DecimalPipe
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-Z2LRLAVM.js";
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  __spreadProps,
  __spreadValues,
  computed,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-K4KD4A2Z.js";

// src/automation/dashboard-overview.component.ts
var _forTrack0 = ($index, $item) => $item.id;
function DashboardOverviewComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 60);
    \u0275\u0275text(1, "\u25CF \u76E3\u63A7\u904B\u884C\u4E2D");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \xB7 \u5DF2\u904B\u884C ", ctx_r0.runningTime(), " ");
  }
}
function DashboardOverviewComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 61);
    \u0275\u0275text(1, "\u25CF \u76E3\u63A7\u5DF2\u505C\u6B62");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \xB7 \u5B8C\u6210\u914D\u7F6E\u5F8C\u5373\u53EF\u958B\u59CB ");
  }
}
function DashboardOverviewComponent_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u23F9\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u505C\u6B62\u76E3\u63A7 ");
  }
}
function DashboardOverviewComponent_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u25B6\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u958B\u59CB\u76E3\u63A7 ");
  }
}
function DashboardOverviewComponent_Conditional_16_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 71);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_16_Conditional_10_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.navigateTo("chat-templates"));
    });
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u5275\u5EFA\u6D88\u606F\u6A21\u677F ");
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_16_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 71);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_16_Conditional_11_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.navigateTo("automation-rules"));
    });
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u914D\u7F6E\u89F8\u767C\u898F\u5247 ");
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 9)(1, "div", 62)(2, "span", 13);
    \u0275\u0275text(3, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 63)(5, "p", 64);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p", 65);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 66);
    \u0275\u0275conditionalCreate(10, DashboardOverviewComponent_Conditional_16_Conditional_10_Template, 4, 0, "button", 67);
    \u0275\u0275conditionalCreate(11, DashboardOverviewComponent_Conditional_16_Conditional_11_Template, 4, 0, "button", 67);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "button", 68);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_16_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.dismissWarning());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(13, "svg", 69);
    \u0275\u0275element(14, "path", 70);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.monitoringWarningMessage());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.monitoringWarningDetail());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.stateService.chatTemplates().length === 0 ? 10 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r0.hasActiveRules() ? 11 : -1);
  }
}
function DashboardOverviewComponent_Conditional_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 29);
  }
}
function DashboardOverviewComponent_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 72);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_73_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.clearActivities());
    });
    \u0275\u0275text(1, " \u6E05\u7A7A ");
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_75_For_1_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 76);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const activity_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(activity_r6.detail);
  }
}
function DashboardOverviewComponent_Conditional_75_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 73)(1, "span", 42);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 74)(4, "p", 75);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(6, DashboardOverviewComponent_Conditional_75_For_1_Conditional_6_Template, 2, 1, "p", 76);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 77);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const activity_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(activity_r6.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(activity_r6.message);
    \u0275\u0275advance();
    \u0275\u0275conditional(activity_r6.detail ? 6 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.formatTime(activity_r6.timestamp));
  }
}
function DashboardOverviewComponent_Conditional_75_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, DashboardOverviewComponent_Conditional_75_For_1_Template, 9, 4, "div", 73, _forTrack0);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275repeater(ctx_r0.activities());
  }
}
function DashboardOverviewComponent_Conditional_76_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 88);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_76_Conditional_15_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.startMonitoringClick.emit());
    });
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u25B6\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u958B\u59CB\u76E3\u63A7 ");
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_76_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 78);
    \u0275\u0275text(2, "\u{1F4E1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 79);
    \u0275\u0275text(4, "\u66AB\u7121\u4E8B\u4EF6\u8A18\u9304");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 80);
    \u0275\u0275text(6, " \u958B\u59CB\u76E3\u63A7\u5F8C\uFF0C\u4EE5\u4E0B\u4E8B\u4EF6\u5C07\u986F\u793A\u5728\u9019\u88E1\uFF1A ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 81)(8, "span", 82);
    \u0275\u0275text(9, "\u{1F511} \u95DC\u9375\u8A5E\u5339\u914D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 83);
    \u0275\u0275text(11, "\u{1F4E8} \u81EA\u52D5\u56DE\u8986");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 84);
    \u0275\u0275text(13, "\u2728 \u65B0 Lead \u6355\u7372");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 85);
    \u0275\u0275conditionalCreate(15, DashboardOverviewComponent_Conditional_76_Conditional_15_Template, 4, 0, "button", 86);
    \u0275\u0275elementStart(16, "button", 87);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_76_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.navigateTo("automation-rules"));
    });
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(19, " \u914D\u7F6E\u89F8\u767C\u898F\u5247 ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(15);
    \u0275\u0275conditional(!ctx_r0.isMonitoring() ? 15 : -1);
  }
}
function DashboardOverviewComponent_Conditional_77_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-config-progress", 89);
    \u0275\u0275listener("action", function DashboardOverviewComponent_Conditional_77_Template_app_config_progress_action_0_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.handleConfigAction($event));
    });
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_131_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 54);
    \u0275\u0275text(1, "\u5F85\u8A2D\u7F6E");
    \u0275\u0275elementEnd();
  }
}
function DashboardOverviewComponent_Conditional_163_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 59)(1, "div", 3)(2, "div", 90)(3, "span", 13);
    \u0275\u0275text(4, "\u{1F4A1}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 63)(6, "h4", 44);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "p", 16);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "button", 91);
    \u0275\u0275listener("click", function DashboardOverviewComponent_Conditional_163_Template_button_click_10_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.handleConfigAction(ctx_r0.nextStepSuggestion().action));
    });
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r0.nextStepSuggestion().title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.nextStepSuggestion().description);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.nextStepSuggestion().buttonText, " \u2192 ");
  }
}
var DashboardOverviewComponent = class _DashboardOverviewComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.ipcService = inject(ElectronIpcService);
    this.isMonitoring = input(false, ...ngDevMode ? [{ debugName: "isMonitoring" }] : []);
    this.todayStats = input({
      matchCount: 0,
      matchTrend: 0,
      newLeads: 0,
      leadsTrend: 0,
      messagesSent: 0,
      replySuccessRate: 100,
      timeSaved: 0,
      conversions: 0
    }, ...ngDevMode ? [{ debugName: "todayStats" }] : []);
    this.realtimeMatches = input([], ...ngDevMode ? [{ debugName: "realtimeMatches" }] : []);
    this.startMonitoringClick = output();
    this.stopMonitoringClick = output();
    this.navigateToPage = output();
    this.configActionEvent = output();
    this.activities = signal([], ...ngDevMode ? [{ debugName: "activities" }] : []);
    this.runningTime = signal("0:00", ...ngDevMode ? [{ debugName: "runningTime" }] : []);
    this.warningDismissed = signal(false, ...ngDevMode ? [{ debugName: "warningDismissed" }] : []);
    this.startTime = null;
    this.Math = Math;
    this.hasActiveRules = computed(() => {
      return this.stateService.hasActiveTriggerRules();
    }, ...ngDevMode ? [{ debugName: "hasActiveRules" }] : []);
    this.showMonitoringWarning = computed(() => {
      if (this.warningDismissed())
        return false;
      const noTemplates = this.stateService.chatTemplates().length === 0;
      const noRules = !this.hasActiveRules();
      return noTemplates || noRules;
    }, ...ngDevMode ? [{ debugName: "showMonitoringWarning" }] : []);
    this.monitoringWarningMessage = computed(() => {
      const noTemplates = this.stateService.chatTemplates().length === 0;
      const noRules = !this.hasActiveRules();
      if (noTemplates && noRules) {
        return "\u76E3\u63A7\u4E2D\uFF0C\u4F46\u5C1A\u672A\u914D\u7F6E\u81EA\u52D5\u56DE\u8986\u529F\u80FD";
      } else if (noTemplates) {
        return "\u76E3\u63A7\u4E2D\uFF0C\u4F46\u7F3A\u5C11\u6D88\u606F\u6A21\u677F";
      } else if (noRules) {
        return "\u76E3\u63A7\u4E2D\uFF0C\u4F46\u7F3A\u5C11\u89F8\u767C\u898F\u5247";
      }
      return "";
    }, ...ngDevMode ? [{ debugName: "monitoringWarningMessage" }] : []);
    this.monitoringWarningDetail = computed(() => {
      const noTemplates = this.stateService.chatTemplates().length === 0;
      const noRules = !this.hasActiveRules();
      if (noTemplates && noRules) {
        return "\u5339\u914D\u5230\u7684\u6D88\u606F\u4E0D\u6703\u81EA\u52D5\u56DE\u8986\u3002\u8ACB\u5275\u5EFA\u6D88\u606F\u6A21\u677F\u548C\u89F8\u767C\u898F\u5247\u3002";
      } else if (noTemplates) {
        return "\u7121\u6CD5\u767C\u9001\u81EA\u52D5\u56DE\u8986\uFF0C\u56E0\u70BA\u6C92\u6709\u53EF\u7528\u7684\u6D88\u606F\u6A21\u677F\u3002";
      } else if (noRules) {
        return "\u5339\u914D\u5230\u7684\u6D88\u606F\u4E0D\u6703\u89F8\u767C\u4EFB\u4F55\u52D5\u4F5C\uFF0C\u8ACB\u524D\u5F80\u300C\u89F8\u767C\u898F\u5247\u300D\u914D\u7F6E\u3002";
      }
      return "";
    }, ...ngDevMode ? [{ debugName: "monitoringWarningDetail" }] : []);
    this.canStartMonitoring = computed(() => {
      const status = this.stateService.configStatus();
      return status.completedCount >= 4;
    }, ...ngDevMode ? [{ debugName: "canStartMonitoring" }] : []);
    this.nextStepSuggestion = computed(() => {
      const status = this.stateService.configStatus();
      if (status.isReady)
        return null;
      const nextStep = status.nextStep;
      if (!nextStep)
        return null;
      const suggestions = {
        "add-listener": {
          title: "\u6DFB\u52A0\u76E3\u63A7\u5E33\u865F",
          description: "\u9700\u8981\u6DFB\u52A0\u4E00\u500B\u7528\u65BC\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F\u7684 Telegram \u5E33\u865F",
          buttonText: "\u53BB\u6DFB\u52A0",
          action: "monitoring-accounts"
        },
        "add-group": {
          title: "\u6DFB\u52A0\u76E3\u63A7\u7FA4\u7D44",
          description: "\u6DFB\u52A0\u9700\u8981\u76E3\u63A7\u7684 Telegram \u7FA4\u7D44",
          buttonText: "\u53BB\u6DFB\u52A0",
          action: "monitoring-groups"
        },
        "add-keywords": {
          title: "\u5275\u5EFA\u95DC\u9375\u8A5E\u96C6",
          description: "\u8A2D\u7F6E\u7528\u65BC\u5339\u914D\u6D88\u606F\u7684\u95DC\u9375\u8A5E",
          buttonText: "\u53BB\u5275\u5EFA",
          action: "keyword-sets"
        },
        "bind-keywords": {
          title: "\u7D81\u5B9A\u95DC\u9375\u8A5E\u96C6",
          description: "\u5C07\u95DC\u9375\u8A5E\u96C6\u7D81\u5B9A\u5230\u76E3\u63A7\u7FA4\u7D44",
          buttonText: "\u53BB\u7D81\u5B9A",
          action: "monitoring-groups"
        },
        "add-template": {
          title: "\u8A2D\u7F6E\u804A\u5929\u6A21\u677F",
          description: "\u914D\u7F6E\u81EA\u52D5\u56DE\u8986\u4F7F\u7528\u7684\u6D88\u606F\u6A21\u677F",
          buttonText: "\u53BB\u8A2D\u7F6E",
          action: "chat-templates"
        },
        "add-sender": {
          title: "\u914D\u7F6E\u767C\u9001\u5E33\u865F",
          description: "\u8A2D\u7F6E\u7528\u65BC\u767C\u9001\u81EA\u52D5\u56DE\u8986\u7684\u5E33\u865F",
          buttonText: "\u53BB\u914D\u7F6E",
          action: "monitoring-accounts"
        }
      };
      return suggestions[nextStep.action || ""] || null;
    }, ...ngDevMode ? [{ debugName: "nextStepSuggestion" }] : []);
    this.listeners = [];
  }
  ngOnInit() {
    this.stateService.loadAll();
    this.setupActivityListeners();
  }
  ngOnDestroy() {
    if (this.runningInterval) {
      clearInterval(this.runningInterval);
    }
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupActivityListeners() {
    const cleanup1 = this.ipcService.on("keyword-matched", (data) => {
      this.addActivity({
        type: "match",
        message: `\u5728\u300C${data.groupName}\u300D\u5339\u914D\u5230\u95DC\u9375\u8A5E\u300C${data.keyword}\u300D`,
        detail: data.messagePreview,
        icon: "\u{1F3AF}"
      });
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("message-sent", (data) => {
      this.addActivity({
        type: "reply",
        message: `\u81EA\u52D5\u56DE\u8986\u4E86 ${data.username || "\u7528\u6236"}`,
        icon: "\u{1F4E8}"
      });
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("lead-added", (data) => {
      this.addActivity({
        type: "lead",
        message: `\u65B0\u589E Lead: ${data.username || data.name}`,
        icon: "\u2728"
      });
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("new-lead-captured", (data) => {
      this.addActivity({
        type: "lead",
        message: `\u6355\u7372\u65B0 Lead: @${data.username || data.user_id}`,
        detail: `\u4F86\u81EA\u7FA4\u7D44: ${data.sourceGroup || data.source_group}`,
        icon: "\u2728"
      });
    });
    this.listeners.push(cleanup4);
    const cleanup5 = this.ipcService.on("log-entry", (data) => {
      if (data.message.includes("\u5339\u914D") || data.message.includes("\u76E3\u63A7") || data.message.includes("Lead") || data.message.includes("\u56DE\u8986")) {
        const icon = data.level === "success" ? "\u2705" : data.level === "warning" ? "\u26A0\uFE0F" : data.level === "error" ? "\u274C" : "\u2139\uFE0F";
        this.addActivity({
          type: "system",
          message: data.message,
          icon
        });
      }
    });
    this.listeners.push(cleanup5);
    const cleanup6 = this.ipcService.on("monitoring-started", (data) => {
      this.addActivity({
        type: "system",
        message: data?.message || "\u76E3\u63A7\u5DF2\u555F\u52D5",
        icon: "\u{1F680}"
      });
    });
    this.listeners.push(cleanup6);
    const cleanup7 = this.ipcService.on("monitoring-stopped", () => {
      this.addActivity({
        type: "system",
        message: "\u76E3\u63A7\u5DF2\u505C\u6B62",
        icon: "\u23F9\uFE0F"
      });
    });
    this.listeners.push(cleanup7);
    const cleanup8 = this.ipcService.on("private-message-received", (data) => {
      this.addActivity({
        type: "message",
        message: `\u6536\u5230\u79C1\u4FE1: @${data.from_username || data.user_id}`,
        detail: data.text?.substring(0, 50) + (data.text?.length > 50 ? "..." : ""),
        icon: "\u{1F4AC}"
      });
    });
    this.listeners.push(cleanup8);
  }
  addActivity(activity) {
    const newActivity = __spreadProps(__spreadValues({}, activity), {
      id: `activity-${Date.now()}`,
      timestamp: /* @__PURE__ */ new Date()
    });
    this.activities.update((list) => [newActivity, ...list].slice(0, 50));
  }
  clearActivities() {
    this.activities.set([]);
  }
  toggleMonitoring() {
    if (this.isMonitoring()) {
      this.stopMonitoringClick.emit();
      this.stopRunningTimer();
    } else {
      this.startMonitoringClick.emit();
      this.startRunningTimer();
    }
  }
  startRunningTimer() {
    this.startTime = /* @__PURE__ */ new Date();
    this.runningInterval = setInterval(() => {
      if (this.startTime) {
        const diff = Date.now() - this.startTime.getTime();
        const hours = Math.floor(diff / 36e5);
        const minutes = Math.floor(diff % 36e5 / 6e4);
        this.runningTime.set(`${hours}:${minutes.toString().padStart(2, "0")}`);
      }
    }, 1e3);
  }
  stopRunningTimer() {
    if (this.runningInterval) {
      clearInterval(this.runningInterval);
      this.runningInterval = null;
    }
    this.runningTime.set("0:00");
    this.startTime = null;
  }
  navigateTo(page) {
    this.navigateToPage.emit(page);
  }
  handleConfigAction(action) {
    this.configActionEvent.emit(action);
  }
  formatTime(date) {
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 6e4)
      return "\u525B\u525B";
    if (diff < 36e5)
      return `${Math.floor(diff / 6e4)} \u5206\u9418\u524D`;
    if (diff < 864e5)
      return `${Math.floor(diff / 36e5)} \u5C0F\u6642\u524D`;
    return date.toLocaleDateString();
  }
  dismissWarning() {
    this.warningDismissed.set(true);
  }
  static {
    this.\u0275fac = function DashboardOverviewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _DashboardOverviewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _DashboardOverviewComponent, selectors: [["app-dashboard-overview"]], inputs: { isMonitoring: [1, "isMonitoring"], todayStats: [1, "todayStats"], realtimeMatches: [1, "realtimeMatches"] }, outputs: { startMonitoringClick: "startMonitoringClick", stopMonitoringClick: "stopMonitoringClick", navigateToPage: "navigateToPage", configActionEvent: "configActionEvent" }, decls: 164, vars: 61, consts: [[1, "h-full", "overflow-y-auto"], [1, "p-6", "space-y-6"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-4"], [1, "w-14", "h-14", "rounded-2xl", "flex", "items-center", "justify-center"], [1, "text-3xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-slate-400"], [1, "px-6", "py-3", "rounded-xl", "font-medium", "transition-all", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "mt-4", "p-4", "bg-gradient-to-r", "from-amber-500/10", "to-orange-500/10", "rounded-xl", "border", "border-amber-500/30"], [1, "grid", "grid-cols-2", "lg:grid-cols-4", "gap-4"], [1, "bg-gradient-to-br", "from-orange-500/20", "to-amber-500/10", "rounded-xl", "border", "border-orange-500/20", "p-5"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-2xl"], [1, "text-xs", "px-2", "py-1", "bg-orange-500/20", "text-orange-400", "rounded-full"], [1, "text-3xl", "font-bold", "text-white", "mb-1"], [1, "text-sm", "text-slate-400"], [1, "bg-gradient-to-br", "from-emerald-500/20", "to-teal-500/10", "rounded-xl", "border", "border-emerald-500/20", "p-5"], [1, "text-xs", "px-2", "py-1", "bg-emerald-500/20", "text-emerald-400", "rounded-full"], [1, "bg-gradient-to-br", "from-blue-500/20", "to-cyan-500/10", "rounded-xl", "border", "border-blue-500/20", "p-5"], [1, "text-xs", "px-2", "py-1", "bg-blue-500/20", "text-blue-400", "rounded-full"], [1, "bg-gradient-to-br", "from-purple-500/20", "to-pink-500/10", "rounded-xl", "border", "border-purple-500/20", "p-5"], [1, "text-xs", "px-2", "py-1", "bg-purple-500/20", "text-purple-400", "rounded-full"], [1, "grid", "grid-cols-1", "lg:grid-cols-3", "gap-6"], [1, "lg:col-span-2", "space-y-6"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-2"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "w-2", "h-2", "bg-emerald-500", "rounded-full", "animate-pulse"], ["title", "\u986F\u793A\u95DC\u9375\u8A5E\u5339\u914D\u3001\u81EA\u52D5\u56DE\u8986\u7B49\u4E8B\u4EF6\u8A18\u9304", 1, "text-xs", "text-slate-500"], [1, "text-xs", "px-2", "py-1", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded", "transition-colors", 3, "click"], [1, "text-xs", "text-slate-500", "hover:text-slate-400"], [1, "p-4", "space-y-3", "max-h-80", "overflow-y-auto"], [1, "text-center", "py-8"], ["mode", "detailed"], [1, "space-y-6"], [1, "p-4", "border-b", "border-slate-700/50"], [1, "p-4", "space-y-3"], [1, "w-full", "flex", "items-center", "justify-between", "p-4", "bg-slate-700/30", "hover:bg-slate-700/50", "rounded-xl", "transition-colors", "group", 3, "click"], [1, "flex", "items-center", "gap-3"], [1, "w-10", "h-10", "rounded-lg", "bg-cyan-500/20", "flex", "items-center", "justify-center"], [1, "text-xl"], [1, "text-left"], [1, "font-medium", "text-white"], [1, "text-xs", "text-slate-500"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5", "text-slate-500", "group-hover:text-cyan-400", "transition-colors"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M9 5l7 7-7 7"], [1, "w-10", "h-10", "rounded-lg", "bg-emerald-500/20", "flex", "items-center", "justify-center"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5", "text-slate-500", "group-hover:text-emerald-400", "transition-colors"], [1, "w-10", "h-10", "rounded-lg", "bg-purple-500/20", "flex", "items-center", "justify-center"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5", "text-slate-500", "group-hover:text-purple-400", "transition-colors"], [1, "w-10", "h-10", "rounded-lg", "bg-pink-500/20", "flex", "items-center", "justify-center"], [1, "font-medium", "text-white", "flex", "items-center", "gap-2"], [1, "text-xs", "bg-amber-500/20", "text-amber-400", "px-1.5", "py-0.5", "rounded"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5", "text-slate-500", "group-hover:text-pink-400", "transition-colors"], [1, "p-4", "grid", "grid-cols-2", "gap-3"], [1, "flex", "flex-col", "items-center", "gap-2", "p-4", "bg-slate-700/30", "hover:bg-slate-700/50", "rounded-xl", "transition-colors", 3, "click"], [1, "text-sm", "text-slate-300"], [1, "bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10", "rounded-xl", "border", "border-cyan-500/20", "p-5"], [1, "text-emerald-400"], [1, "text-slate-500"], [1, "flex", "items-start", "gap-3"], [1, "flex-1"], [1, "text-amber-400", "font-medium", "mb-1"], [1, "text-slate-400", "text-sm", "mb-3"], [1, "flex", "flex-wrap", "gap-2"], [1, "px-3", "py-1.5", "bg-amber-500/20", "hover:bg-amber-500/30", "text-amber-400", "text-sm", "rounded-lg", "transition-colors", "flex", "items-center", "gap-1"], [1, "text-slate-500", "hover:text-slate-400", 3, "click"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M6 18L18 6M6 6l12 12"], [1, "px-3", "py-1.5", "bg-amber-500/20", "hover:bg-amber-500/30", "text-amber-400", "text-sm", "rounded-lg", "transition-colors", "flex", "items-center", "gap-1", 3, "click"], [1, "text-xs", "text-slate-500", "hover:text-slate-400", 3, "click"], [1, "flex", "items-start", "gap-3", "p-3", "bg-slate-700/30", "rounded-lg", "hover:bg-slate-700/50", "transition-colors"], [1, "flex-1", "min-w-0"], [1, "text-sm", "text-white"], [1, "text-xs", "text-slate-500", "truncate"], [1, "text-xs", "text-slate-500", "whitespace-nowrap"], [1, "text-4xl", "mb-3"], [1, "text-slate-400", "font-medium", "mb-2"], [1, "text-xs", "text-slate-500", "mb-4"], [1, "flex", "flex-wrap", "justify-center", "gap-2", "mb-4"], [1, "text-xs", "px-2", "py-1", "bg-yellow-500/10", "text-yellow-400", "rounded"], [1, "text-xs", "px-2", "py-1", "bg-blue-500/10", "text-blue-400", "rounded"], [1, "text-xs", "px-2", "py-1", "bg-emerald-500/10", "text-emerald-400", "rounded"], [1, "flex", "justify-center", "gap-3"], [1, "text-sm", "px-4", "py-2", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "text-white", "rounded-lg", "hover:opacity-90", "transition-opacity", "flex", "items-center", "gap-2"], [1, "text-sm", "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "text-sm", "px-4", "py-2", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "text-white", "rounded-lg", "hover:opacity-90", "transition-opacity", "flex", "items-center", "gap-2", 3, "click"], ["mode", "detailed", 3, "action"], [1, "w-12", "h-12", "bg-cyan-500/20", "rounded-xl", "flex", "items-center", "justify-center"], [1, "px-4", "py-2", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded-lg", "transition-colors", 3, "click"]], template: function DashboardOverviewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "div", 4)(5, "span", 5);
        \u0275\u0275text(6);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(7, "div")(8, "h1", 6);
        \u0275\u0275text(9, "\u81EA\u52D5\u5316\u76E3\u63A7\u4E2D\u5FC3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "p", 7);
        \u0275\u0275conditionalCreate(11, DashboardOverviewComponent_Conditional_11_Template, 3, 1)(12, DashboardOverviewComponent_Conditional_12_Template, 3, 0);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(13, "button", 8);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_13_listener() {
          return ctx.toggleMonitoring();
        });
        \u0275\u0275conditionalCreate(14, DashboardOverviewComponent_Conditional_14_Template, 3, 0)(15, DashboardOverviewComponent_Conditional_15_Template, 3, 0);
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(16, DashboardOverviewComponent_Conditional_16_Template, 15, 4, "div", 9);
        \u0275\u0275elementStart(17, "div", 10)(18, "div", 11)(19, "div", 12)(20, "span", 13);
        \u0275\u0275text(21, "\u{1F525}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "span", 14);
        \u0275\u0275text(23);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "div", 15);
        \u0275\u0275text(25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "div", 16);
        \u0275\u0275text(27, "\u4ECA\u65E5\u5339\u914D");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(28, "div", 17)(29, "div", 12)(30, "span", 13);
        \u0275\u0275text(31, "\u2728");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(32, "span", 18);
        \u0275\u0275text(33);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(34, "div", 15);
        \u0275\u0275text(35);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "div", 16);
        \u0275\u0275text(37, "\u65B0\u589E Leads");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(38, "div", 19)(39, "div", 12)(40, "span", 13);
        \u0275\u0275text(41, "\u{1F4E8}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "span", 20);
        \u0275\u0275text(43);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(44, "div", 15);
        \u0275\u0275text(45);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(46, "div", 16);
        \u0275\u0275text(47, "\u81EA\u52D5\u56DE\u8986");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(48, "div", 21)(49, "div", 12)(50, "span", 13);
        \u0275\u0275text(51, "\u23F0");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "span", 22);
        \u0275\u0275text(53, " vs \u624B\u52D5 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(54, "div", 15);
        \u0275\u0275text(55);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "div", 16);
        \u0275\u0275text(57, "\u7BC0\u7701\u6642\u9593");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(58, "div", 23)(59, "div", 24)(60, "div", 25)(61, "div", 26)(62, "div", 27)(63, "h3", 28)(64, "span");
        \u0275\u0275text(65, "\u{1F4E1}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(66, " \u76E3\u63A7\u4E8B\u4EF6\u6D41 ");
        \u0275\u0275conditionalCreate(67, DashboardOverviewComponent_Conditional_67_Template, 1, 0, "span", 29);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(68, "span", 30);
        \u0275\u0275text(69, " \u24D8 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(70, "div", 27)(71, "button", 31);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_71_listener() {
          return ctx.navigateTo("automation-rules");
        });
        \u0275\u0275text(72, " \u2699\uFE0F \u914D\u7F6E\u898F\u5247 ");
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(73, DashboardOverviewComponent_Conditional_73_Template, 2, 0, "button", 32);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(74, "div", 33);
        \u0275\u0275conditionalCreate(75, DashboardOverviewComponent_Conditional_75_Template, 2, 0)(76, DashboardOverviewComponent_Conditional_76_Template, 20, 1, "div", 34);
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(77, DashboardOverviewComponent_Conditional_77_Template, 1, 0, "app-config-progress", 35);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(78, "div", 36)(79, "div", 25)(80, "div", 37)(81, "h3", 28)(82, "span");
        \u0275\u0275text(83, "\u2699\uFE0F");
        \u0275\u0275elementEnd();
        \u0275\u0275text(84, " \u5FEB\u901F\u914D\u7F6E ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(85, "div", 38)(86, "button", 39);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_86_listener() {
          return ctx.navigateTo("monitoring-accounts");
        });
        \u0275\u0275elementStart(87, "div", 40)(88, "div", 41)(89, "span", 42);
        \u0275\u0275text(90, "\u{1F4F1}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(91, "div", 43)(92, "div", 44);
        \u0275\u0275text(93, "\u76E3\u63A7\u5E33\u865F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(94, "div", 45);
        \u0275\u0275text(95);
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(96, "svg", 46);
        \u0275\u0275element(97, "path", 47);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(98, "button", 39);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_98_listener() {
          return ctx.navigateTo("monitoring-groups");
        });
        \u0275\u0275elementStart(99, "div", 40)(100, "div", 48)(101, "span", 42);
        \u0275\u0275text(102, "\u{1F4AC}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(103, "div", 43)(104, "div", 44);
        \u0275\u0275text(105, "\u76E3\u63A7\u7FA4\u7D44");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(106, "div", 45);
        \u0275\u0275text(107);
        \u0275\u0275pipe(108, "number");
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(109, "svg", 49);
        \u0275\u0275element(110, "path", 47);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(111, "button", 39);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_111_listener() {
          return ctx.navigateTo("keyword-sets");
        });
        \u0275\u0275elementStart(112, "div", 40)(113, "div", 50)(114, "span", 42);
        \u0275\u0275text(115, "\u{1F511}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(116, "div", 43)(117, "div", 44);
        \u0275\u0275text(118, "\u95DC\u9375\u8A5E\u96C6");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(119, "div", 45);
        \u0275\u0275text(120);
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(121, "svg", 51);
        \u0275\u0275element(122, "path", 47);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(123, "button", 39);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_123_listener() {
          return ctx.navigateTo("chat-templates");
        });
        \u0275\u0275elementStart(124, "div", 40)(125, "div", 52)(126, "span", 42);
        \u0275\u0275text(127, "\u{1F4DD}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(128, "div", 43)(129, "div", 53);
        \u0275\u0275text(130, " \u804A\u5929\u6A21\u677F ");
        \u0275\u0275conditionalCreate(131, DashboardOverviewComponent_Conditional_131_Template, 2, 0, "span", 54);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(132, "div", 45);
        \u0275\u0275text(133);
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(134, "svg", 55);
        \u0275\u0275element(135, "path", 47);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(136, "div", 25)(137, "div", 37)(138, "h3", 28)(139, "span");
        \u0275\u0275text(140, "\u{1F4E6}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(141, " \u66F4\u591A\u529F\u80FD ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(142, "div", 56)(143, "button", 57);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_143_listener() {
          return ctx.navigateTo("resources");
        });
        \u0275\u0275elementStart(144, "span", 13);
        \u0275\u0275text(145, "\u{1F4DA}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(146, "span", 58);
        \u0275\u0275text(147, "\u8CC7\u6599\u5EAB");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(148, "button", 57);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_148_listener() {
          return ctx.navigateTo("rules");
        });
        \u0275\u0275elementStart(149, "span", 13);
        \u0275\u0275text(150, "\u26A1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(151, "span", 58);
        \u0275\u0275text(152, "\u81EA\u52D5\u898F\u5247");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(153, "button", 57);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_153_listener() {
          return ctx.navigateTo("send-settings");
        });
        \u0275\u0275elementStart(154, "span", 13);
        \u0275\u0275text(155, "\u{1F4E4}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(156, "span", 58);
        \u0275\u0275text(157, "\u767C\u9001\u8A2D\u7F6E");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(158, "button", 57);
        \u0275\u0275listener("click", function DashboardOverviewComponent_Template_button_click_158_listener() {
          return ctx.navigateTo("analytics");
        });
        \u0275\u0275elementStart(159, "span", 13);
        \u0275\u0275text(160, "\u{1F4CA}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(161, "span", 58);
        \u0275\u0275text(162, "\u6578\u64DA\u5206\u6790");
        \u0275\u0275elementEnd()()()()()();
        \u0275\u0275conditionalCreate(163, DashboardOverviewComponent_Conditional_163_Template, 12, 3, "div", 59);
        \u0275\u0275elementEnd()();
      }
      if (rf & 2) {
        \u0275\u0275advance(4);
        \u0275\u0275classProp("bg-gradient-to-br", ctx.isMonitoring())("from-emerald-500", ctx.isMonitoring())("to-cyan-500", ctx.isMonitoring())("bg-slate-700", !ctx.isMonitoring());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.isMonitoring() ? "\u{1F680}" : "\u23F8\uFE0F");
        \u0275\u0275advance(5);
        \u0275\u0275conditional(ctx.isMonitoring() ? 11 : 12);
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-gradient-to-r", !ctx.isMonitoring())("from-emerald-500", !ctx.isMonitoring())("to-cyan-500", !ctx.isMonitoring())("text-white", !ctx.isMonitoring())("hover:shadow-lg", !ctx.isMonitoring())("hover:shadow-emerald-500/25", !ctx.isMonitoring())("bg-red-500/20", ctx.isMonitoring())("text-red-400", ctx.isMonitoring())("hover:bg-red-500/30", ctx.isMonitoring());
        \u0275\u0275property("disabled", !ctx.canStartMonitoring() && !ctx.isMonitoring());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isMonitoring() ? 14 : 15);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.isMonitoring() && ctx.showMonitoringWarning() ? 16 : -1);
        \u0275\u0275advance(7);
        \u0275\u0275textInterpolate2(" ", ctx.todayStats().matchTrend >= 0 ? "\u2191" : "\u2193", " ", ctx.Math.abs(ctx.todayStats().matchTrend), "% ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.todayStats().matchCount);
        \u0275\u0275advance(8);
        \u0275\u0275textInterpolate2(" ", ctx.todayStats().leadsTrend >= 0 ? "\u2191" : "\u2193", " ", ctx.Math.abs(ctx.todayStats().leadsTrend), "% ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.todayStats().newLeads);
        \u0275\u0275advance(8);
        \u0275\u0275textInterpolate1(" \u6210\u529F\u7387 ", ctx.todayStats().replySuccessRate, "% ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.todayStats().messagesSent);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate1("", ctx.todayStats().timeSaved, "h");
        \u0275\u0275advance(12);
        \u0275\u0275conditional(ctx.isMonitoring() ? 67 : -1);
        \u0275\u0275advance(6);
        \u0275\u0275conditional(ctx.activities().length > 0 ? 73 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.activities().length > 0 ? 75 : 76);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(!ctx.stateService.configStatus().isReady ? 77 : -1);
        \u0275\u0275advance(18);
        \u0275\u0275textInterpolate2("", ctx.stateService.listenerAccounts().length, " \u76E3\u807D \xB7 ", ctx.stateService.senderAccounts().length, " \u767C\u9001");
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate2("", ctx.stateService.groups().length, " \u500B\u7FA4\u7D44 \xB7 ", \u0275\u0275pipeBind1(108, 59, ctx.stateService.totalMembers()), " \u6210\u54E1");
        \u0275\u0275advance(13);
        \u0275\u0275textInterpolate2("", ctx.stateService.keywordSets().length, " \u8A5E\u96C6 \xB7 ", ctx.stateService.totalKeywords(), " \u95DC\u9375\u8A5E");
        \u0275\u0275advance(3);
        \u0275\u0275classProp("border-2", ctx.stateService.chatTemplates().length === 0)("border-dashed", ctx.stateService.chatTemplates().length === 0)("border-amber-500/50", ctx.stateService.chatTemplates().length === 0);
        \u0275\u0275advance(8);
        \u0275\u0275conditional(ctx.stateService.chatTemplates().length === 0 ? 131 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1("", ctx.stateService.chatTemplates().length, " \u500B\u6A21\u677F");
        \u0275\u0275advance(30);
        \u0275\u0275conditional(ctx.nextStepSuggestion() ? 163 : -1);
      }
    }, dependencies: [CommonModule, ConfigProgressComponent, DecimalPipe], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DashboardOverviewComponent, [{
    type: Component,
    args: [{
      selector: "app-dashboard-overview",
      standalone: true,
      imports: [CommonModule, ConfigProgressComponent],
      template: `
    <div class="h-full overflow-y-auto">
      <div class="p-6 space-y-6">
        
        <!-- \u9802\u90E8\uFF1A\u76E3\u63A7\u72C0\u614B\u548C\u63A7\u5236 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                 [class.bg-gradient-to-br]="isMonitoring()"
                 [class.from-emerald-500]="isMonitoring()"
                 [class.to-cyan-500]="isMonitoring()"
                 [class.bg-slate-700]="!isMonitoring()">
              <span class="text-3xl">{{ isMonitoring() ? '\u{1F680}' : '\u23F8\uFE0F' }}</span>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-white">\u81EA\u52D5\u5316\u76E3\u63A7\u4E2D\u5FC3</h1>
              <p class="text-slate-400">
                @if (isMonitoring()) {
                  <span class="text-emerald-400">\u25CF \u76E3\u63A7\u904B\u884C\u4E2D</span> \xB7 \u5DF2\u904B\u884C {{ runningTime() }}
                } @else {
                  <span class="text-slate-500">\u25CF \u76E3\u63A7\u5DF2\u505C\u6B62</span> \xB7 \u5B8C\u6210\u914D\u7F6E\u5F8C\u5373\u53EF\u958B\u59CB
                }
              </p>
            </div>
          </div>
          
          <button (click)="toggleMonitoring()"
                  class="px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2"
                  [class.bg-gradient-to-r]="!isMonitoring()"
                  [class.from-emerald-500]="!isMonitoring()"
                  [class.to-cyan-500]="!isMonitoring()"
                  [class.text-white]="!isMonitoring()"
                  [class.hover:shadow-lg]="!isMonitoring()"
                  [class.hover:shadow-emerald-500/25]="!isMonitoring()"
                  [class.bg-red-500/20]="isMonitoring()"
                  [class.text-red-400]="isMonitoring()"
                  [class.hover:bg-red-500/30]="isMonitoring()"
                  [disabled]="!canStartMonitoring() && !isMonitoring()">
            @if (isMonitoring()) {
              <span>\u23F9\uFE0F</span> \u505C\u6B62\u76E3\u63A7
            } @else {
              <span>\u25B6\uFE0F</span> \u958B\u59CB\u76E3\u63A7
            }
          </button>
        </div>
        
        <!-- \u667A\u80FD\u5F15\u5C0E\u63D0\u793A -->
        @if (isMonitoring() && showMonitoringWarning()) {
          <div class="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30">
            <div class="flex items-start gap-3">
              <span class="text-2xl">\u26A0\uFE0F</span>
              <div class="flex-1">
                <p class="text-amber-400 font-medium mb-1">{{ monitoringWarningMessage() }}</p>
                <p class="text-slate-400 text-sm mb-3">{{ monitoringWarningDetail() }}</p>
                <div class="flex flex-wrap gap-2">
                  @if (stateService.chatTemplates().length === 0) {
                    <button (click)="navigateTo('chat-templates')"
                            class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors flex items-center gap-1">
                      <span>\u{1F4DD}</span> \u5275\u5EFA\u6D88\u606F\u6A21\u677F
                    </button>
                  }
                  @if (!hasActiveRules()) {
                    <button (click)="navigateTo('automation-rules')"
                            class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors flex items-center gap-1">
                      <span>\u26A1</span> \u914D\u7F6E\u89F8\u767C\u898F\u5247
                    </button>
                  }
                </div>
              </div>
              <button (click)="dismissWarning()" class="text-slate-500 hover:text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        }

        <!-- \u4ECA\u65E5\u95DC\u9375\u6307\u6A19 -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- \u4ECA\u65E5\u5339\u914D -->
          <div class="bg-gradient-to-br from-orange-500/20 to-amber-500/10 rounded-xl border border-orange-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">\u{1F525}</span>
              <span class="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
                {{ todayStats().matchTrend >= 0 ? '\u2191' : '\u2193' }} {{ Math.abs(todayStats().matchTrend) }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().matchCount }}</div>
            <div class="text-sm text-slate-400">\u4ECA\u65E5\u5339\u914D</div>
          </div>
          
          <!-- \u65B0\u589E Leads -->
          <div class="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-xl border border-emerald-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">\u2728</span>
              <span class="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
                {{ todayStats().leadsTrend >= 0 ? '\u2191' : '\u2193' }} {{ Math.abs(todayStats().leadsTrend) }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().newLeads }}</div>
            <div class="text-sm text-slate-400">\u65B0\u589E Leads</div>
          </div>
          
          <!-- \u81EA\u52D5\u56DE\u8986 -->
          <div class="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl border border-blue-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">\u{1F4E8}</span>
              <span class="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                \u6210\u529F\u7387 {{ todayStats().replySuccessRate }}%
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().messagesSent }}</div>
            <div class="text-sm text-slate-400">\u81EA\u52D5\u56DE\u8986</div>
          </div>
          
          <!-- \u7BC0\u7701\u6642\u9593 -->
          <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl border border-purple-500/20 p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-2xl">\u23F0</span>
              <span class="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                vs \u624B\u52D5
              </span>
            </div>
            <div class="text-3xl font-bold text-white mb-1">{{ todayStats().timeSaved }}h</div>
            <div class="text-sm text-slate-400">\u7BC0\u7701\u6642\u9593</div>
          </div>
        </div>

        <!-- \u4E3B\u5167\u5BB9\u5340\uFF1A\u5DE6\u53F3\u4F48\u5C40 -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- \u5DE6\u5074\uFF1A\u5373\u6642\u6D3B\u52D5 + \u914D\u7F6E\u9032\u5EA6 -->
          <div class="lg:col-span-2 space-y-6">
            <!-- \u76E3\u63A7\u4E8B\u4EF6\u6D41 -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u{1F4E1}</span> \u76E3\u63A7\u4E8B\u4EF6\u6D41
                    @if (isMonitoring()) {
                      <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    }
                  </h3>
                  <span class="text-xs text-slate-500" title="\u986F\u793A\u95DC\u9375\u8A5E\u5339\u914D\u3001\u81EA\u52D5\u56DE\u8986\u7B49\u4E8B\u4EF6\u8A18\u9304">
                    \u24D8
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button (click)="navigateTo('automation-rules')" 
                          class="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-colors">
                    \u2699\uFE0F \u914D\u7F6E\u898F\u5247
                  </button>
                  @if (activities().length > 0) {
                    <button (click)="clearActivities()" 
                            class="text-xs text-slate-500 hover:text-slate-400">
                      \u6E05\u7A7A
                    </button>
                  }
                </div>
              </div>
              <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
                @if (activities().length > 0) {
                  @for (activity of activities(); track activity.id) {
                    <div class="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                      <span class="text-xl">{{ activity.icon }}</span>
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-white">{{ activity.message }}</p>
                        @if (activity.detail) {
                          <p class="text-xs text-slate-500 truncate">{{ activity.detail }}</p>
                        }
                      </div>
                      <span class="text-xs text-slate-500 whitespace-nowrap">{{ formatTime(activity.timestamp) }}</span>
                    </div>
                  }
                } @else {
                  <div class="text-center py-8">
                    <div class="text-4xl mb-3">\u{1F4E1}</div>
                    <p class="text-slate-400 font-medium mb-2">\u66AB\u7121\u4E8B\u4EF6\u8A18\u9304</p>
                    <p class="text-xs text-slate-500 mb-4">
                      \u958B\u59CB\u76E3\u63A7\u5F8C\uFF0C\u4EE5\u4E0B\u4E8B\u4EF6\u5C07\u986F\u793A\u5728\u9019\u88E1\uFF1A
                    </p>
                    <div class="flex flex-wrap justify-center gap-2 mb-4">
                      <span class="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded">\u{1F511} \u95DC\u9375\u8A5E\u5339\u914D</span>
                      <span class="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">\u{1F4E8} \u81EA\u52D5\u56DE\u8986</span>
                      <span class="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">\u2728 \u65B0 Lead \u6355\u7372</span>
                    </div>
                    <div class="flex justify-center gap-3">
                      @if (!isMonitoring()) {
                        <button (click)="startMonitoringClick.emit()"
                                class="text-sm px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                          <span>\u25B6\uFE0F</span> \u958B\u59CB\u76E3\u63A7
                        </button>
                      }
                      <button (click)="navigateTo('automation-rules')"
                              class="text-sm px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2">
                        <span>\u2699\uFE0F</span> \u914D\u7F6E\u89F8\u767C\u898F\u5247
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- \u914D\u7F6E\u9032\u5EA6\uFF08\u672A\u5B8C\u6210\u6642\u986F\u793A\uFF09 -->
            @if (!stateService.configStatus().isReady) {
              <app-config-progress 
                mode="detailed" 
                (action)="handleConfigAction($event)">
              </app-config-progress>
            }
          </div>

          <!-- \u53F3\u5074\uFF1A\u5FEB\u6377\u5165\u53E3 -->
          <div class="space-y-6">
            <!-- \u5FEB\u901F\u914D\u7F6E\u5165\u53E3 -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50">
                <h3 class="font-semibold text-white flex items-center gap-2">
                  <span>\u2699\uFE0F</span> \u5FEB\u901F\u914D\u7F6E
                </h3>
              </div>
              <div class="p-4 space-y-3">
                <!-- \u76E3\u63A7\u5E33\u865F -->
                <button (click)="navigateTo('monitoring-accounts')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                      <span class="text-xl">\u{1F4F1}</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">\u76E3\u63A7\u5E33\u865F</div>
                      <div class="text-xs text-slate-500">{{ stateService.listenerAccounts().length }} \u76E3\u807D \xB7 {{ stateService.senderAccounts().length }} \u767C\u9001</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- \u76E3\u63A7\u7FA4\u7D44 -->
                <button (click)="navigateTo('monitoring-groups')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span class="text-xl">\u{1F4AC}</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">\u76E3\u63A7\u7FA4\u7D44</div>
                      <div class="text-xs text-slate-500">{{ stateService.groups().length }} \u500B\u7FA4\u7D44 \xB7 {{ stateService.totalMembers() | number }} \u6210\u54E1</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- \u95DC\u9375\u8A5E\u96C6 -->
                <button (click)="navigateTo('keyword-sets')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <span class="text-xl">\u{1F511}</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white">\u95DC\u9375\u8A5E\u96C6</div>
                      <div class="text-xs text-slate-500">{{ stateService.keywordSets().length }} \u8A5E\u96C6 \xB7 {{ stateService.totalKeywords() }} \u95DC\u9375\u8A5E</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>

                <!-- \u804A\u5929\u6A21\u677F -->
                <button (click)="navigateTo('chat-templates')"
                        class="w-full flex items-center justify-between p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors group"
                        [class.border-2]="stateService.chatTemplates().length === 0"
                        [class.border-dashed]="stateService.chatTemplates().length === 0"
                        [class.border-amber-500/50]="stateService.chatTemplates().length === 0">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <span class="text-xl">\u{1F4DD}</span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-white flex items-center gap-2">
                        \u804A\u5929\u6A21\u677F
                        @if (stateService.chatTemplates().length === 0) {
                          <span class="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">\u5F85\u8A2D\u7F6E</span>
                        }
                      </div>
                      <div class="text-xs text-slate-500">{{ stateService.chatTemplates().length }} \u500B\u6A21\u677F</div>
                    </div>
                  </div>
                  <svg class="w-5 h-5 text-slate-500 group-hover:text-pink-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- \u66F4\u591A\u529F\u80FD -->
            <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div class="p-4 border-b border-slate-700/50">
                <h3 class="font-semibold text-white flex items-center gap-2">
                  <span>\u{1F4E6}</span> \u66F4\u591A\u529F\u80FD
                </h3>
              </div>
              <div class="p-4 grid grid-cols-2 gap-3">
                <button (click)="navigateTo('resources')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">\u{1F4DA}</span>
                  <span class="text-sm text-slate-300">\u8CC7\u6599\u5EAB</span>
                </button>
                <button (click)="navigateTo('rules')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">\u26A1</span>
                  <span class="text-sm text-slate-300">\u81EA\u52D5\u898F\u5247</span>
                </button>
                <button (click)="navigateTo('send-settings')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">\u{1F4E4}</span>
                  <span class="text-sm text-slate-300">\u767C\u9001\u8A2D\u7F6E</span>
                </button>
                <button (click)="navigateTo('analytics')"
                        class="flex flex-col items-center gap-2 p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl transition-colors">
                  <span class="text-2xl">\u{1F4CA}</span>
                  <span class="text-sm text-slate-300">\u6578\u64DA\u5206\u6790</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- \u4E0B\u4E00\u6B65\u5EFA\u8B70\uFF08\u914D\u7F6E\u672A\u5B8C\u6210\u6642\u986F\u793A\uFF09 -->
        @if (nextStepSuggestion()) {
          <div class="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20 p-5">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <span class="text-2xl">\u{1F4A1}</span>
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-white">{{ nextStepSuggestion()!.title }}</h4>
                <p class="text-sm text-slate-400">{{ nextStepSuggestion()!.description }}</p>
              </div>
              <button (click)="handleConfigAction(nextStepSuggestion()!.action)"
                      class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors">
                {{ nextStepSuggestion()!.buttonText }} \u2192
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `
    }]
  }], null, { isMonitoring: [{ type: Input, args: [{ isSignal: true, alias: "isMonitoring", required: false }] }], todayStats: [{ type: Input, args: [{ isSignal: true, alias: "todayStats", required: false }] }], realtimeMatches: [{ type: Input, args: [{ isSignal: true, alias: "realtimeMatches", required: false }] }], startMonitoringClick: [{ type: Output, args: ["startMonitoringClick"] }], stopMonitoringClick: [{ type: Output, args: ["stopMonitoringClick"] }], navigateToPage: [{ type: Output, args: ["navigateToPage"] }], configActionEvent: [{ type: Output, args: ["configActionEvent"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(DashboardOverviewComponent, { className: "DashboardOverviewComponent", filePath: "src/automation/dashboard-overview.component.ts", lineNumber: 385 });
})();

// src/views/automation-view.component.ts
var AutomationViewComponent = class _AutomationViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.membershipService = inject(MembershipService);
    this.monitoringMgmt = inject(MonitoringManagementService);
    this.isMonitoring = computed(() => this.monitoringMgmt.monitoringActive(), ...ngDevMode ? [{ debugName: "isMonitoring" }] : []);
    this.monitoringStats = signal({
      groups: 0,
      keywords: 0,
      messages: 0,
      triggered: 0
    }, ...ngDevMode ? [{ debugName: "monitoringStats" }] : []);
    this.ipcCleanup = [];
  }
  ngOnInit() {
    this.loadStatus();
    this.setupIpcListeners();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
  }
  loadStatus() {
    this.ipc.send("get-monitoring-status");
    this.ipc.send("get-monitoring-stats");
  }
  setupIpcListeners() {
    const cleanup2 = this.ipc.on("monitoring-stats", (data) => {
      this.monitoringStats.set(data);
    });
    const cleanup3 = this.ipc.on("monitoring-started", (data) => {
      const msg = typeof data === "object" && data?.message ? data.message : "\u76E3\u63A7\u5DF2\u555F\u52D5";
      this.toast.success(msg);
    });
    const cleanup4 = this.ipc.on("monitoring-stopped", () => {
      this.toast.info("\u76E3\u63A7\u5DF2\u505C\u6B62");
    });
    const cleanup6 = this.ipc.on("monitoring-start-failed", (data) => {
      console.log("[AutomationView] \u76E3\u63A7\u555F\u52D5\u5931\u6557:", data);
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
    this.ipcCleanup.push(cleanup2, cleanup3, cleanup4, cleanup6);
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 導航
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  // 啟動監控
  startMonitoring() {
    this.ipc.send("start-monitoring");
  }
  // 停止監控
  stopMonitoring() {
    this.ipc.send("stop-monitoring");
  }
  static {
    this.\u0275fac = function AutomationViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AutomationViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AutomationViewComponent, selectors: [["app-automation-view"]], decls: 1, vars: 1, consts: [[3, "startMonitoringClick", "stopMonitoringClick", "navigateToPage", "isMonitoring"]], template: function AutomationViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-dashboard-overview", 0);
        \u0275\u0275listener("startMonitoringClick", function AutomationViewComponent_Template_app_dashboard_overview_startMonitoringClick_0_listener() {
          return ctx.startMonitoring();
        })("stopMonitoringClick", function AutomationViewComponent_Template_app_dashboard_overview_stopMonitoringClick_0_listener() {
          return ctx.stopMonitoring();
        })("navigateToPage", function AutomationViewComponent_Template_app_dashboard_overview_navigateToPage_0_listener($event) {
          return ctx.navigateTo($event);
        });
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275property("isMonitoring", ctx.isMonitoring());
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      DashboardOverviewComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AutomationViewComponent, [{
    type: Component,
    args: [{
      selector: "app-automation-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        DashboardOverviewComponent
      ],
      template: `
    <app-dashboard-overview
      [isMonitoring]="isMonitoring()"
      (startMonitoringClick)="startMonitoring()"
      (stopMonitoringClick)="stopMonitoring()"
      (navigateToPage)="navigateTo($event)">
    </app-dashboard-overview>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AutomationViewComponent, { className: "AutomationViewComponent", filePath: "src/views/automation-view.component.ts", lineNumber: 45 });
})();

export {
  AutomationViewComponent
};
//# sourceMappingURL=chunk-MSP4NM5P.js.map
