import {
  QuotaService
} from "./chunk-MLS6JMSU.js";
import {
  AuthService
} from "./chunk-X53HRSO4.js";
import "./chunk-LRT2RG6V.js";
import {
  ActivatedRoute,
  Router
} from "./chunk-T45T4QAG.js";
import "./chunk-RRYKY32A.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  ɵɵgetCurrentView,
  ɵɵnextContext,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/views/upgrade-view.component.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.key;
function UpgradeViewComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 5)(1, "span", 14);
    \u0275\u0275text(2, "\u2139\uFE0F");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span");
    \u0275\u0275text(4, "\u6B64\u529F\u80FD\u9700\u8981 ");
    \u0275\u0275domElementStart(5, "strong");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275text(7, " \u6216\u66F4\u9AD8\u65B9\u6848");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.t("subscription." + ctx_r0.requiredTier()));
  }
}
function UpgradeViewComponent_For_16_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 16);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(plan_r3.badge);
  }
}
function UpgradeViewComponent_For_16_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 17);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.t("subscription.currentPlan"));
  }
}
function UpgradeViewComponent_For_16_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 20);
    \u0275\u0275text(1, "\u5B9A\u5236\u50F9\u683C");
    \u0275\u0275domElementEnd();
  }
}
function UpgradeViewComponent_For_16_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 21);
    \u0275\u0275text(1, "\u514D\u8CBB");
    \u0275\u0275domElementEnd();
  }
}
function UpgradeViewComponent_For_16_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 26);
    \u0275\u0275text(1, "$");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(2, "span", 21);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "span", 27);
    \u0275\u0275text(5, "/\u6708");
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const plan_r3 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r0.billingCycle() === "yearly" ? plan_r3.yearlyPrice : plan_r3.price, " ");
  }
}
function UpgradeViewComponent_For_16_For_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "li")(1, "span", 28);
    \u0275\u0275text(2, "\u2713");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const feature_r4 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", feature_r4, " ");
  }
}
function UpgradeViewComponent_For_16_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElement(0, "span", 25);
  }
}
function UpgradeViewComponent_For_16_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u7576\u524D\u65B9\u6848 ");
  }
}
function UpgradeViewComponent_For_16_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("subscription.contactSales"), " ");
  }
}
function UpgradeViewComponent_For_16_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u958B\u59CB\u4F7F\u7528 ");
  }
}
function UpgradeViewComponent_For_16_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("subscription.upgradeNow"), " ");
  }
}
function UpgradeViewComponent_For_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 15);
    \u0275\u0275conditionalCreate(1, UpgradeViewComponent_For_16_Conditional_1_Template, 2, 1, "div", 16);
    \u0275\u0275conditionalCreate(2, UpgradeViewComponent_For_16_Conditional_2_Template, 2, 1, "div", 17);
    \u0275\u0275domElementStart(3, "h2", 18);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 19);
    \u0275\u0275conditionalCreate(6, UpgradeViewComponent_For_16_Conditional_6_Template, 2, 0, "span", 20)(7, UpgradeViewComponent_For_16_Conditional_7_Template, 2, 0, "span", 21)(8, UpgradeViewComponent_For_16_Conditional_8_Template, 6, 1);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(9, "p", 22);
    \u0275\u0275text(10, " \u6700\u591A ");
    \u0275\u0275domElementStart(11, "strong");
    \u0275\u0275text(12);
    \u0275\u0275domElementEnd();
    \u0275\u0275text(13, " \u500B\u5E33\u865F ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(14, "ul", 23);
    \u0275\u0275repeaterCreate(15, UpgradeViewComponent_For_16_For_16_Template, 4, 1, "li", null, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(17, "button", 24);
    \u0275\u0275domListener("click", function UpgradeViewComponent_For_16_Template_button_click_17_listener() {
      const plan_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.selectPlan(plan_r3));
    });
    \u0275\u0275conditionalCreate(18, UpgradeViewComponent_For_16_Conditional_18_Template, 1, 0, "span", 25);
    \u0275\u0275conditionalCreate(19, UpgradeViewComponent_For_16_Conditional_19_Template, 1, 0)(20, UpgradeViewComponent_For_16_Conditional_20_Template, 1, 1)(21, UpgradeViewComponent_For_16_Conditional_21_Template, 1, 0)(22, UpgradeViewComponent_For_16_Conditional_22_Template, 1, 1);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const plan_r3 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("highlighted", plan_r3.highlighted)("current", ctx_r0.currentTier() === plan_r3.id);
    \u0275\u0275advance();
    \u0275\u0275conditional(plan_r3.badge ? 1 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.currentTier() === plan_r3.id ? 2 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(plan_r3.name);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(plan_r3.price === -1 ? 6 : plan_r3.price === 0 ? 7 : 8);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(plan_r3.maxAccounts === 999 ? "\u7121\u9650" : plan_r3.maxAccounts);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(plan_r3.features);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("btn-primary", plan_r3.highlighted)("btn-secondary", !plan_r3.highlighted);
    \u0275\u0275domProperty("disabled", ctx_r0.currentTier() === plan_r3.id || plan_r3.price > 0 && ctx_r0.isUpgrading());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isUpgrading() && ctx_r0.selectedPlan() === plan_r3.id ? 18 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.currentTier() === plan_r3.id ? 19 : plan_r3.price === -1 ? 20 : plan_r3.price === 0 ? 21 : 22);
  }
}
function UpgradeViewComponent_For_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "th");
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const plan_r5 = ctx.$implicit;
    \u0275\u0275classProp("highlighted", plan_r5.highlighted);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(plan_r5.name);
  }
}
function UpgradeViewComponent_For_29_For_4_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 29);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275domElementEnd();
  }
}
function UpgradeViewComponent_For_29_For_4_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 30);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275domElementEnd();
  }
}
function UpgradeViewComponent_For_29_For_4_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const plan_r6 = \u0275\u0275nextContext().$implicit;
    const feature_r7 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", feature_r7.values[plan_r6.id], " ");
  }
}
function UpgradeViewComponent_For_29_For_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "td");
    \u0275\u0275conditionalCreate(1, UpgradeViewComponent_For_29_For_4_Conditional_1_Template, 2, 0, "span", 29)(2, UpgradeViewComponent_For_29_For_4_Conditional_2_Template, 2, 0, "span", 30)(3, UpgradeViewComponent_For_29_For_4_Conditional_3_Template, 1, 1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const plan_r6 = ctx.$implicit;
    const feature_r7 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275conditional(feature_r7.values[plan_r6.id] === true ? 1 : feature_r7.values[plan_r6.id] === false ? 2 : 3);
  }
}
function UpgradeViewComponent_For_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275repeaterCreate(3, UpgradeViewComponent_For_29_For_4_Template, 4, 1, "td", null, _forTrack0);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const feature_r7 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(feature_r7.name);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.plans());
  }
}
var UpgradeViewComponent = class _UpgradeViewComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.i18n = inject(I18nService);
    this.quotaService = inject(QuotaService);
    this.billingCycle = signal("monthly", ...ngDevMode ? [{ debugName: "billingCycle" }] : []);
    this.isUpgrading = signal(false, ...ngDevMode ? [{ debugName: "isUpgrading" }] : []);
    this.selectedPlan = signal(null, ...ngDevMode ? [{ debugName: "selectedPlan" }] : []);
    this.isLoading = signal(true, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.requiredTier = signal(null, ...ngDevMode ? [{ debugName: "requiredTier" }] : []);
    this.currentTier = this.authService.subscriptionTier;
    this._plans = signal([], ...ngDevMode ? [{ debugName: "_plans" }] : []);
    this.plans = computed(() => {
      const dynamicPlans = this._plans();
      return dynamicPlans.length > 0 ? dynamicPlans : this.defaultPlans;
    }, ...ngDevMode ? [{ debugName: "plans" }] : []);
    this.defaultPlans = [
      {
        id: "bronze",
        name: "\u9752\u9285\u6230\u58EB",
        price: 0,
        yearlyPrice: 0,
        maxAccounts: 3,
        icon: "\u{1F949}",
        features: [
          "3 \u500B Telegram \u5E33\u865F",
          "\u6BCF\u65E5 50 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 10 \u6B21 AI \u8ABF\u7528",
          "\u57FA\u790E\u529F\u80FD"
        ],
        highlighted: false
      },
      {
        id: "silver",
        name: "\u767D\u9280\u885B\u58EB",
        price: 99,
        yearlyPrice: 79,
        maxAccounts: 10,
        icon: "\u{1F948}",
        features: [
          "10 \u500B Telegram \u5E33\u865F",
          "\u6BCF\u65E5 200 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 50 \u6B21 AI \u8ABF\u7528",
          "\u6A21\u677F\u5EAB\u8A2A\u554F"
        ],
        highlighted: false
      },
      {
        id: "gold",
        name: "\u9EC3\u91D1\u7375\u624B",
        price: 299,
        yearlyPrice: 239,
        maxAccounts: 30,
        icon: "\u{1F947}",
        features: [
          "30 \u500B Telegram \u5E33\u865F",
          "\u6BCF\u65E5 500 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 100 \u6B21 AI \u8ABF\u7528",
          "\u591A\u89D2\u8272\u5354\u4F5C"
        ],
        highlighted: true,
        badge: "\u6700\u53D7\u6B61\u8FCE"
      },
      {
        id: "diamond",
        name: "\u947D\u77F3\u738B\u8005",
        price: 599,
        yearlyPrice: 479,
        maxAccounts: 100,
        icon: "\u{1F48E}",
        features: [
          "100 \u500B Telegram \u5E33\u865F",
          "\u6BCF\u65E5 2000 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 500 \u6B21 AI \u8ABF\u7528",
          "API \u8A2A\u554F"
        ],
        highlighted: false
      },
      {
        id: "star",
        name: "\u661F\u8000\u50B3\u5947",
        price: 999,
        yearlyPrice: 799,
        maxAccounts: 500,
        icon: "\u2B50",
        features: [
          "500 \u500B Telegram \u5E33\u865F",
          "\u6BCF\u65E5 10000 \u689D\u6D88\u606F",
          "\u6BCF\u65E5 2000 \u6B21 AI \u8ABF\u7528",
          "\u512A\u5148\u652F\u6301"
        ],
        highlighted: false
      },
      {
        id: "king",
        name: "\u738B\u8005\u81F3\u5C0A",
        price: -1,
        yearlyPrice: -1,
        maxAccounts: 999,
        icon: "\u{1F451}",
        features: [
          "\u7121\u9650 Telegram \u5E33\u865F",
          "\u7121\u9650\u6D88\u606F",
          "\u7121\u9650 AI \u8ABF\u7528",
          "\u5C08\u5C6C\u670D\u52D9"
        ],
        highlighted: false
      }
    ];
    this.featuresList = computed(() => {
      const levels = this.plans();
      const levelIds = levels.map((l) => l.id);
      return [
        {
          key: "accounts",
          name: "\u5E33\u865F\u6578\u91CF",
          values: Object.fromEntries(levels.map((l) => [l.id, l.maxAccounts === 999 ? "\u7121\u9650" : l.maxAccounts.toString()]))
        },
        {
          key: "messages",
          name: "\u6BCF\u65E5\u6D88\u606F",
          values: Object.fromEntries(levels.map((l) => {
            const quota = l.quotas?.daily_messages;
            return [l.id, quota === -1 ? "\u7121\u9650" : quota?.toString() || "-"];
          }))
        },
        {
          key: "ai",
          name: "AI \u8ABF\u7528",
          values: Object.fromEntries(levels.map((l) => {
            const quota = l.quotas?.ai_calls;
            return [l.id, quota === -1 ? "\u7121\u9650" : quota?.toString() || "-"];
          }))
        },
        {
          key: "groups",
          name: "\u7FA4\u7D44\u6578\u91CF",
          values: Object.fromEntries(levels.map((l) => {
            const quota = l.quotas?.groups;
            return [l.id, quota === -1 ? "\u7121\u9650" : quota?.toString() || "-"];
          }))
        },
        {
          key: "support",
          name: "\u6280\u8853\u652F\u6301",
          values: Object.fromEntries(levels.map((l, i) => {
            const supports = ["\u793E\u5340", "\u90F5\u4EF6", "\u512A\u5148", "\u5C08\u5C6C", "VIP", "\u81F3\u5C0A"];
            return [l.id, supports[Math.min(i, supports.length - 1)]];
          }))
        }
      ];
    }, ...ngDevMode ? [{ debugName: "featuresList" }] : []);
  }
  async ngOnInit() {
    const required = this.route.snapshot.queryParams["required"];
    if (required) {
      this.requiredTier.set(required);
    }
    await this.loadMembershipLevels();
  }
  async loadMembershipLevels() {
    this.isLoading.set(true);
    try {
      await this.quotaService.loadMembershipLevels();
      const levels = this.quotaService.levels();
      if (levels.length > 0) {
        const plans = levels.map((level, index) => ({
          id: level.level,
          name: level.name,
          price: level.prices?.month || 0,
          yearlyPrice: Math.floor((level.prices?.month || 0) * 0.8),
          maxAccounts: level.quotas?.tg_accounts || 0,
          icon: level.icon,
          features: this.generateFeatures(level),
          highlighted: level.level === "gold",
          badge: level.level === "gold" ? "\u6700\u53D7\u6B61\u8FCE" : void 0,
          quotas: level.quotas
        }));
        this._plans.set(plans);
      }
    } catch (error) {
      console.error("Failed to load membership levels:", error);
    } finally {
      this.isLoading.set(false);
    }
  }
  generateFeatures(level) {
    const features = [];
    const quotas = level.quotas || {};
    if (quotas.tg_accounts) {
      features.push(quotas.tg_accounts === -1 ? "\u7121\u9650 Telegram \u5E33\u865F" : `${quotas.tg_accounts} \u500B Telegram \u5E33\u865F`);
    }
    if (quotas.daily_messages) {
      features.push(quotas.daily_messages === -1 ? "\u7121\u9650\u6D88\u606F" : `\u6BCF\u65E5 ${quotas.daily_messages} \u689D\u6D88\u606F`);
    }
    if (quotas.ai_calls) {
      features.push(quotas.ai_calls === -1 ? "\u7121\u9650 AI \u8ABF\u7528" : `\u6BCF\u65E5 ${quotas.ai_calls} \u6B21 AI \u8ABF\u7528`);
    }
    if (level.features?.length) {
      features.push(...level.features.slice(0, 3));
    }
    return features;
  }
  t(key) {
    return this.i18n.t(key);
  }
  selectPlan(plan) {
    if (plan.price === -1) {
      window.open("mailto:sales@tg-matrix.com?subject=Enterprise Plan Inquiry", "_blank");
      return;
    }
    if (plan.price === 0) {
      this.router.navigate(["/dashboard"]);
      return;
    }
    this.selectedPlan.set(plan.id);
    this.isUpgrading.set(true);
    setTimeout(() => {
      this.isUpgrading.set(false);
      alert("\u652F\u4ED8\u529F\u80FD\u5373\u5C07\u63A8\u51FA\uFF01");
    }, 1500);
  }
  static {
    this.\u0275fac = function UpgradeViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UpgradeViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _UpgradeViewComponent, selectors: [["app-upgrade-view"]], decls: 49, vars: 7, consts: [[1, "upgrade-page"], [1, "page-header"], [1, "billing-toggle"], [3, "click"], [1, "discount-badge"], [1, "upgrade-notice"], [1, "plans-grid"], [1, "plan-card", 3, "highlighted", "current"], [1, "features-comparison"], [1, "comparison-table"], [3, "highlighted"], [1, "faq-section"], [1, "faq-list"], [1, "faq-item"], [1, "notice-icon"], [1, "plan-card"], [1, "plan-badge"], [1, "current-badge"], [1, "plan-name"], [1, "plan-price"], [1, "price-custom"], [1, "price-amount"], [1, "plan-accounts"], [1, "plan-features"], [1, "plan-btn", 3, "click", "disabled"], [1, "loading-spinner"], [1, "price-currency"], [1, "price-period"], [1, "feature-check"], [1, "check"], [1, "cross"]], template: function UpgradeViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "header", 1)(2, "h1");
        \u0275\u0275text(3, "\u9078\u64C7\u9069\u5408\u60A8\u7684\u65B9\u6848");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(4, "p");
        \u0275\u0275text(5, "\u9748\u6D3B\u7684\u5B9A\u50F9\uFF0C\u6EFF\u8DB3\u5404\u7A2E\u898F\u6A21\u7684\u9700\u6C42");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(6, "div", 2)(7, "button", 3);
        \u0275\u0275domListener("click", function UpgradeViewComponent_Template_button_click_7_listener() {
          return ctx.billingCycle.set("monthly");
        });
        \u0275\u0275text(8);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(9, "button", 3);
        \u0275\u0275domListener("click", function UpgradeViewComponent_Template_button_click_9_listener() {
          return ctx.billingCycle.set("yearly");
        });
        \u0275\u0275text(10);
        \u0275\u0275domElementStart(11, "span", 4);
        \u0275\u0275text(12, "\u7701 20%");
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275conditionalCreate(13, UpgradeViewComponent_Conditional_13_Template, 8, 1, "div", 5);
        \u0275\u0275domElementStart(14, "div", 6);
        \u0275\u0275repeaterCreate(15, UpgradeViewComponent_For_16_Template, 23, 16, "div", 7, _forTrack0);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(17, "section", 8)(18, "h2");
        \u0275\u0275text(19, "\u529F\u80FD\u5C0D\u6BD4");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(20, "table", 9)(21, "thead")(22, "tr")(23, "th");
        \u0275\u0275text(24, "\u529F\u80FD");
        \u0275\u0275domElementEnd();
        \u0275\u0275repeaterCreate(25, UpgradeViewComponent_For_26_Template, 2, 3, "th", 10, _forTrack0);
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(27, "tbody");
        \u0275\u0275repeaterCreate(28, UpgradeViewComponent_For_29_Template, 5, 1, "tr", null, _forTrack1);
        \u0275\u0275domElementEnd()()();
        \u0275\u0275domElementStart(30, "section", 11)(31, "h2");
        \u0275\u0275text(32, "\u5E38\u898B\u554F\u984C");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(33, "div", 12)(34, "div", 13)(35, "h3");
        \u0275\u0275text(36, "\u53EF\u4EE5\u96A8\u6642\u66F4\u63DB\u65B9\u6848\u55CE\uFF1F");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(37, "p");
        \u0275\u0275text(38, "\u662F\u7684\uFF0C\u60A8\u53EF\u4EE5\u96A8\u6642\u5347\u7D1A\u6216\u964D\u7D1A\u65B9\u6848\u3002\u5347\u7D1A\u7ACB\u5373\u751F\u6548\uFF0C\u964D\u7D1A\u5C07\u5728\u7576\u524D\u8A08\u8CBB\u9031\u671F\u7D50\u675F\u5F8C\u751F\u6548\u3002");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(39, "div", 13)(40, "h3");
        \u0275\u0275text(41, "\u652F\u6301\u54EA\u4E9B\u4ED8\u6B3E\u65B9\u5F0F\uFF1F");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(42, "p");
        \u0275\u0275text(43, "\u6211\u5011\u652F\u6301\u4FE1\u7528\u5361\u3001PayPal\u3001\u9280\u884C\u8F49\u5E33\u548C\u52A0\u5BC6\u8CA8\u5E63\uFF08USDT/BTC\uFF09\u4ED8\u6B3E\u3002");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(44, "div", 13)(45, "h3");
        \u0275\u0275text(46, "\u6709\u9000\u6B3E\u653F\u7B56\u55CE\uFF1F");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(47, "p");
        \u0275\u0275text(48, "\u6211\u5011\u63D0\u4F9B 7 \u5929\u7121\u689D\u4EF6\u9000\u6B3E\u4FDD\u8B49\u3002\u5982\u679C\u4E0D\u6EFF\u610F\uFF0C\u53EF\u4EE5\u7533\u8ACB\u5168\u984D\u9000\u6B3E\u3002");
        \u0275\u0275domElementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(7);
        \u0275\u0275classProp("active", ctx.billingCycle() === "monthly");
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.t("subscription.monthly"), " ");
        \u0275\u0275advance();
        \u0275\u0275classProp("active", ctx.billingCycle() === "yearly");
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.t("subscription.yearly"), " ");
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.requiredTier() ? 13 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275repeater(ctx.plans());
        \u0275\u0275advance(10);
        \u0275\u0275repeater(ctx.plans());
        \u0275\u0275advance(3);
        \u0275\u0275repeater(ctx.featuresList());
      }
    }, dependencies: [CommonModule], styles: ["\n\n.upgrade-page[_ngcontent-%COMP%] {\n  padding: 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-bottom: 2rem;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 2rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.billing-toggle[_ngcontent-%COMP%] {\n  display: inline-flex;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 8px;\n  padding: 4px;\n}\n.billing-toggle[_ngcontent-%COMP%]   button[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 1.25rem;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.billing-toggle[_ngcontent-%COMP%]   button.active[_ngcontent-%COMP%] {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.discount-badge[_ngcontent-%COMP%] {\n  padding: 0.125rem 0.375rem;\n  background: #22c55e;\n  border-radius: 4px;\n  font-size: 0.625rem;\n  font-weight: 600;\n}\n.upgrade-notice[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: rgba(59, 130, 246, 0.1);\n  border: 1px solid rgba(59, 130, 246, 0.3);\n  border-radius: 8px;\n  margin-bottom: 2rem;\n  color: var(--primary, #3b82f6);\n}\n.plans-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\n  gap: 1.5rem;\n  margin-bottom: 3rem;\n}\n.plan-card[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  transition: all 0.3s ease;\n}\n.plan-card[_ngcontent-%COMP%]:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);\n}\n.plan-card.highlighted[_ngcontent-%COMP%] {\n  border-color: var(--primary, #3b82f6);\n  background:\n    linear-gradient(\n      135deg,\n      rgba(59, 130, 246, 0.05),\n      rgba(139, 92, 246, 0.05));\n}\n.plan-card.current[_ngcontent-%COMP%] {\n  border-color: #22c55e;\n}\n.plan-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: -12px;\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 0.25rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border-radius: 20px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: white;\n}\n.current-badge[_ngcontent-%COMP%] {\n  position: absolute;\n  top: -12px;\n  right: 1rem;\n  padding: 0.25rem 0.75rem;\n  background: #22c55e;\n  border-radius: 20px;\n  font-size: 0.625rem;\n  font-weight: 600;\n  color: white;\n}\n.plan-name[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin-bottom: 1rem;\n}\n.plan-price[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: baseline;\n  gap: 0.25rem;\n  margin-bottom: 0.5rem;\n}\n.price-currency[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  color: var(--text-secondary, #888);\n}\n.price-amount[_ngcontent-%COMP%] {\n  font-size: 2.5rem;\n  font-weight: 700;\n}\n.price-period[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.price-custom[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  color: var(--primary, #3b82f6);\n}\n.plan-accounts[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.plan-features[_ngcontent-%COMP%] {\n  list-style: none;\n  padding: 0;\n  margin: 0 0 1.5rem 0;\n}\n.plan-features[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #aaa);\n}\n.feature-check[_ngcontent-%COMP%] {\n  color: #22c55e;\n  font-weight: bold;\n}\n.plan-btn[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem;\n  border-radius: 8px;\n  font-size: 0.875rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n}\n.plan-btn.btn-primary[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  color: white;\n}\n.plan-btn.btn-primary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.plan-btn.btn-secondary[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.plan-btn.btn-secondary[_ngcontent-%COMP%]:hover:not(:disabled) {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: var(--border-hover, #444);\n}\n.plan-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.features-comparison[_ngcontent-%COMP%] {\n  margin-bottom: 3rem;\n}\n.features-comparison[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n  text-align: center;\n}\n.comparison-table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.comparison-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.comparison-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 1rem;\n  text-align: center;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.comparison-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  background: var(--bg-tertiary, #151515);\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.comparison-table[_ngcontent-%COMP%]   th.highlighted[_ngcontent-%COMP%] {\n  background: rgba(59, 130, 246, 0.1);\n  color: var(--primary, #3b82f6);\n}\n.comparison-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%]:first-child {\n  text-align: left;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #aaa);\n}\n.comparison-table[_ngcontent-%COMP%]   .check[_ngcontent-%COMP%] {\n  color: #22c55e;\n  font-weight: bold;\n}\n.comparison-table[_ngcontent-%COMP%]   .cross[_ngcontent-%COMP%] {\n  color: var(--text-muted, #666);\n}\n.faq-section[_ngcontent-%COMP%] {\n  max-width: 800px;\n  margin: 0 auto;\n}\n.faq-section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n  text-align: center;\n}\n.faq-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.faq-item[_ngcontent-%COMP%] {\n  padding: 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n}\n.faq-item[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 1rem;\n  font-weight: 600;\n  margin-bottom: 0.5rem;\n}\n.faq-item[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n  line-height: 1.6;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n@media (max-width: 768px) {\n  .plans-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n  .comparison-table[_ngcontent-%COMP%] {\n    font-size: 0.75rem;\n  }\n  .comparison-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n   .comparison-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n    padding: 0.5rem;\n  }\n}\n/*# sourceMappingURL=upgrade-view.component.css.map */"], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UpgradeViewComponent, [{
    type: Component,
    args: [{ selector: "app-upgrade-view", standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="upgrade-page">
      <header class="page-header">
        <h1>\u9078\u64C7\u9069\u5408\u60A8\u7684\u65B9\u6848</h1>
        <p>\u9748\u6D3B\u7684\u5B9A\u50F9\uFF0C\u6EFF\u8DB3\u5404\u7A2E\u898F\u6A21\u7684\u9700\u6C42</p>
        
        <!-- \u8A08\u8CBB\u9031\u671F\u5207\u63DB -->
        <div class="billing-toggle">
          <button 
            [class.active]="billingCycle() === 'monthly'"
            (click)="billingCycle.set('monthly')"
          >
            {{ t('subscription.monthly') }}
          </button>
          <button 
            [class.active]="billingCycle() === 'yearly'"
            (click)="billingCycle.set('yearly')"
          >
            {{ t('subscription.yearly') }}
            <span class="discount-badge">\u7701 20%</span>
          </button>
        </div>
      </header>
      
      <!-- \u63D0\u793A\u4FE1\u606F -->
      @if (requiredTier()) {
        <div class="upgrade-notice">
          <span class="notice-icon">\u2139\uFE0F</span>
          <span>\u6B64\u529F\u80FD\u9700\u8981 <strong>{{ t('subscription.' + requiredTier()) }}</strong> \u6216\u66F4\u9AD8\u65B9\u6848</span>
        </div>
      }
      
      <!-- \u65B9\u6848\u5361\u7247 -->
      <div class="plans-grid">
        @for (plan of plans(); track plan.id) {
          <div 
            class="plan-card" 
            [class.highlighted]="plan.highlighted"
            [class.current]="currentTier() === plan.id"
          >
            @if (plan.badge) {
              <div class="plan-badge">{{ plan.badge }}</div>
            }
            @if (currentTier() === plan.id) {
              <div class="current-badge">{{ t('subscription.currentPlan') }}</div>
            }
            
            <h2 class="plan-name">{{ plan.name }}</h2>
            
            <div class="plan-price">
              @if (plan.price === -1) {
                <span class="price-custom">\u5B9A\u5236\u50F9\u683C</span>
              } @else if (plan.price === 0) {
                <span class="price-amount">\u514D\u8CBB</span>
              } @else {
                <span class="price-currency">$</span>
                <span class="price-amount">
                  {{ billingCycle() === 'yearly' ? plan.yearlyPrice : plan.price }}
                </span>
                <span class="price-period">/\u6708</span>
              }
            </div>
            
            <p class="plan-accounts">
              \u6700\u591A <strong>{{ plan.maxAccounts === 999 ? '\u7121\u9650' : plan.maxAccounts }}</strong> \u500B\u5E33\u865F
            </p>
            
            <ul class="plan-features">
              @for (feature of plan.features; track feature) {
                <li>
                  <span class="feature-check">\u2713</span>
                  {{ feature }}
                </li>
              }
            </ul>
            
            <button 
              class="plan-btn"
              [class.btn-primary]="plan.highlighted"
              [class.btn-secondary]="!plan.highlighted"
              [disabled]="currentTier() === plan.id || (plan.price > 0 && isUpgrading())"
              (click)="selectPlan(plan)"
            >
              @if (isUpgrading() && selectedPlan() === plan.id) {
                <span class="loading-spinner"></span>
              }
              @if (currentTier() === plan.id) {
                \u7576\u524D\u65B9\u6848
              } @else if (plan.price === -1) {
                {{ t('subscription.contactSales') }}
              } @else if (plan.price === 0) {
                \u958B\u59CB\u4F7F\u7528
              } @else {
                {{ t('subscription.upgradeNow') }}
              }
            </button>
          </div>
        }
      </div>
      
      <!-- \u529F\u80FD\u5C0D\u6BD4\u8868 -->
      <section class="features-comparison">
        <h2>\u529F\u80FD\u5C0D\u6BD4</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>\u529F\u80FD</th>
              @for (plan of plans(); track plan.id) {
                <th [class.highlighted]="plan.highlighted">{{ plan.name }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (feature of featuresList(); track feature.key) {
              <tr>
                <td>{{ feature.name }}</td>
                @for (plan of plans(); track plan.id) {
                  <td>
                    @if (feature.values[plan.id] === true) {
                      <span class="check">\u2713</span>
                    } @else if (feature.values[plan.id] === false) {
                      <span class="cross">\u2014</span>
                    } @else {
                      {{ feature.values[plan.id] }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </section>
      
      <!-- FAQ -->
      <section class="faq-section">
        <h2>\u5E38\u898B\u554F\u984C</h2>
        <div class="faq-list">
          <div class="faq-item">
            <h3>\u53EF\u4EE5\u96A8\u6642\u66F4\u63DB\u65B9\u6848\u55CE\uFF1F</h3>
            <p>\u662F\u7684\uFF0C\u60A8\u53EF\u4EE5\u96A8\u6642\u5347\u7D1A\u6216\u964D\u7D1A\u65B9\u6848\u3002\u5347\u7D1A\u7ACB\u5373\u751F\u6548\uFF0C\u964D\u7D1A\u5C07\u5728\u7576\u524D\u8A08\u8CBB\u9031\u671F\u7D50\u675F\u5F8C\u751F\u6548\u3002</p>
          </div>
          <div class="faq-item">
            <h3>\u652F\u6301\u54EA\u4E9B\u4ED8\u6B3E\u65B9\u5F0F\uFF1F</h3>
            <p>\u6211\u5011\u652F\u6301\u4FE1\u7528\u5361\u3001PayPal\u3001\u9280\u884C\u8F49\u5E33\u548C\u52A0\u5BC6\u8CA8\u5E63\uFF08USDT/BTC\uFF09\u4ED8\u6B3E\u3002</p>
          </div>
          <div class="faq-item">
            <h3>\u6709\u9000\u6B3E\u653F\u7B56\u55CE\uFF1F</h3>
            <p>\u6211\u5011\u63D0\u4F9B 7 \u5929\u7121\u689D\u4EF6\u9000\u6B3E\u4FDD\u8B49\u3002\u5982\u679C\u4E0D\u6EFF\u610F\uFF0C\u53EF\u4EE5\u7533\u8ACB\u5168\u984D\u9000\u6B3E\u3002</p>
          </div>
        </div>
      </section>
    </div>
  `, styles: ["/* angular:styles/component:css;5f7aadcbd83d7040746d15b9055d1c6fdfe5ec5fc32ed67c5174c27f359eb3f9;D:/tgkz2026/src/views/upgrade-view.component.ts */\n.upgrade-page {\n  padding: 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.page-header {\n  text-align: center;\n  margin-bottom: 2rem;\n}\n.page-header h1 {\n  font-size: 2rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-header p {\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.billing-toggle {\n  display: inline-flex;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 8px;\n  padding: 4px;\n}\n.billing-toggle button {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 1.25rem;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.billing-toggle button.active {\n  background: var(--primary, #3b82f6);\n  color: white;\n}\n.discount-badge {\n  padding: 0.125rem 0.375rem;\n  background: #22c55e;\n  border-radius: 4px;\n  font-size: 0.625rem;\n  font-weight: 600;\n}\n.upgrade-notice {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem;\n  background: rgba(59, 130, 246, 0.1);\n  border: 1px solid rgba(59, 130, 246, 0.3);\n  border-radius: 8px;\n  margin-bottom: 2rem;\n  color: var(--primary, #3b82f6);\n}\n.plans-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));\n  gap: 1.5rem;\n  margin-bottom: 3rem;\n}\n.plan-card {\n  position: relative;\n  padding: 2rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 16px;\n  transition: all 0.3s ease;\n}\n.plan-card:hover {\n  transform: translateY(-4px);\n  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);\n}\n.plan-card.highlighted {\n  border-color: var(--primary, #3b82f6);\n  background:\n    linear-gradient(\n      135deg,\n      rgba(59, 130, 246, 0.05),\n      rgba(139, 92, 246, 0.05));\n}\n.plan-card.current {\n  border-color: #22c55e;\n}\n.plan-badge {\n  position: absolute;\n  top: -12px;\n  left: 50%;\n  transform: translateX(-50%);\n  padding: 0.25rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border-radius: 20px;\n  font-size: 0.75rem;\n  font-weight: 600;\n  color: white;\n}\n.current-badge {\n  position: absolute;\n  top: -12px;\n  right: 1rem;\n  padding: 0.25rem 0.75rem;\n  background: #22c55e;\n  border-radius: 20px;\n  font-size: 0.625rem;\n  font-weight: 600;\n  color: white;\n}\n.plan-name {\n  font-size: 1.25rem;\n  font-weight: 600;\n  margin-bottom: 1rem;\n}\n.plan-price {\n  display: flex;\n  align-items: baseline;\n  gap: 0.25rem;\n  margin-bottom: 0.5rem;\n}\n.price-currency {\n  font-size: 1.25rem;\n  color: var(--text-secondary, #888);\n}\n.price-amount {\n  font-size: 2.5rem;\n  font-weight: 700;\n}\n.price-period {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.price-custom {\n  font-size: 1.25rem;\n  color: var(--primary, #3b82f6);\n}\n.plan-accounts {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n  margin-bottom: 1.5rem;\n}\n.plan-features {\n  list-style: none;\n  padding: 0;\n  margin: 0 0 1.5rem 0;\n}\n.plan-features li {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.5rem 0;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #aaa);\n}\n.feature-check {\n  color: #22c55e;\n  font-weight: bold;\n}\n.plan-btn {\n  width: 100%;\n  padding: 0.875rem;\n  border-radius: 8px;\n  font-size: 0.875rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n}\n.plan-btn.btn-primary {\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  color: white;\n}\n.plan-btn.btn-primary:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.plan-btn.btn-secondary {\n  background: transparent;\n  border: 1px solid var(--border-color, #333);\n  color: var(--text-primary, #fff);\n}\n.plan-btn.btn-secondary:hover:not(:disabled) {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: var(--border-hover, #444);\n}\n.plan-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.features-comparison {\n  margin-bottom: 3rem;\n}\n.features-comparison h2 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n  text-align: center;\n}\n.comparison-table {\n  width: 100%;\n  border-collapse: collapse;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  overflow: hidden;\n}\n.comparison-table th,\n.comparison-table td {\n  padding: 1rem;\n  text-align: center;\n  border-bottom: 1px solid var(--border-color, #333);\n}\n.comparison-table th {\n  background: var(--bg-tertiary, #151515);\n  font-weight: 600;\n  font-size: 0.875rem;\n}\n.comparison-table th.highlighted {\n  background: rgba(59, 130, 246, 0.1);\n  color: var(--primary, #3b82f6);\n}\n.comparison-table td:first-child {\n  text-align: left;\n  font-size: 0.875rem;\n  color: var(--text-secondary, #aaa);\n}\n.comparison-table .check {\n  color: #22c55e;\n  font-weight: bold;\n}\n.comparison-table .cross {\n  color: var(--text-muted, #666);\n}\n.faq-section {\n  max-width: 800px;\n  margin: 0 auto;\n}\n.faq-section h2 {\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin-bottom: 1.5rem;\n  text-align: center;\n}\n.faq-list {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.faq-item {\n  padding: 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n}\n.faq-item h3 {\n  font-size: 1rem;\n  font-weight: 600;\n  margin-bottom: 0.5rem;\n}\n.faq-item p {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n  line-height: 1.6;\n}\n.loading-spinner {\n  width: 16px;\n  height: 16px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n@media (max-width: 768px) {\n  .plans-grid {\n    grid-template-columns: 1fr;\n  }\n  .comparison-table {\n    font-size: 0.75rem;\n  }\n  .comparison-table th,\n  .comparison-table td {\n    padding: 0.5rem;\n  }\n}\n/*# sourceMappingURL=upgrade-view.component.css.map */\n"] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(UpgradeViewComponent, { className: "UpgradeViewComponent", filePath: "src/views/upgrade-view.component.ts", lineNumber: 536 });
})();
export {
  UpgradeViewComponent
};
//# sourceMappingURL=chunk-GH7DZR4S.js.map
