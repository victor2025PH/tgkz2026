import {
  DynamicScriptEngineService,
  MultiRoleService
} from "./chunk-3JGWPW2T.js";
import {
  AICenterService,
  GOAL_TYPE_CONFIG,
  MarketingStateService,
  MarketingTaskService
} from "./chunk-PLTL6UL3.js";
import "./chunk-MYE5TICQ.js";
import {
  NavBridgeService
} from "./chunk-VWF44474.js";
import {
  ElectronIpcService
} from "./chunk-355UGVEO.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-G42HF5FJ.js";
import {
  I18nService
} from "./chunk-NBYDSPUQ.js";
import {
  CommonModule,
  DecimalPipe
} from "./chunk-7CO55ZOM.js";
import {
  MembershipService,
  ToastService
} from "./chunk-FPLBFLUX.js";
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
  ɵɵdomElement,
  ɵɵdomElementEnd,
  ɵɵdomElementStart,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-Y4VZODST.js";

// src/smart-marketing/task-wizard.component.ts
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.type;
function TaskWizardComponent_For_12_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2713 ");
  }
}
function TaskWizardComponent_For_12_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const \u0275$index_20_r1 = \u0275\u0275nextContext().$index;
    \u0275\u0275textInterpolate1(" ", \u0275$index_20_r1 + 1, " ");
  }
}
function TaskWizardComponent_For_12_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 22);
  }
  if (rf & 2) {
    const step_r2 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-purple-500", ctx_r2.isStepCompleted(step_r2.id))("bg-slate-700", !ctx_r2.isStepCompleted(step_r2.id));
  }
}
function TaskWizardComponent_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8)(1, "div", 18)(2, "span", 19);
    \u0275\u0275conditionalCreate(3, TaskWizardComponent_For_12_Conditional_3_Template, 1, 0)(4, TaskWizardComponent_For_12_Conditional_4_Template, 1, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 20);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(7, TaskWizardComponent_For_12_Conditional_7_Template, 1, 4, "div", 21);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const step_r2 = ctx.$implicit;
    const \u0275$index_20_r1 = ctx.$index;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-purple-500", ctx_r2.currentStep() === step_r2.id)("text-white", ctx_r2.currentStep() === step_r2.id)("bg-slate-700", ctx_r2.currentStep() !== step_r2.id && ctx_r2.isStepCompleted(step_r2.id))("text-slate-300", ctx_r2.currentStep() !== step_r2.id && ctx_r2.isStepCompleted(step_r2.id))("bg-slate-800", ctx_r2.currentStep() !== step_r2.id && !ctx_r2.isStepCompleted(step_r2.id))("text-slate-500", ctx_r2.currentStep() !== step_r2.id && !ctx_r2.isStepCompleted(step_r2.id));
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-white", ctx_r2.currentStep() === step_r2.id)("text-purple-500", ctx_r2.currentStep() === step_r2.id)("bg-emerald-500", ctx_r2.currentStep() !== step_r2.id && ctx_r2.isStepCompleted(step_r2.id))("text-white", ctx_r2.currentStep() !== step_r2.id && ctx_r2.isStepCompleted(step_r2.id))("bg-slate-600", ctx_r2.currentStep() !== step_r2.id && !ctx_r2.isStepCompleted(step_r2.id));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isStepCompleted(step_r2.id) && ctx_r2.currentStep() !== step_r2.id ? 3 : 4);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(step_r2.label);
    \u0275\u0275advance();
    \u0275\u0275conditional(\u0275$index_20_r1 < ctx_r2.steps.length - 1 ? 7 : -1);
  }
}
function TaskWizardComponent_Case_14_For_8_For_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const role_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r2.getRoleLabel(role_r6), " ");
  }
}
function TaskWizardComponent_Case_14_For_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 28);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_14_For_8_Template_button_click_0_listener() {
      const goal_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.selectGoal(goal_r5.type));
    });
    \u0275\u0275elementStart(1, "div", 29)(2, "div", 30);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 31)(5, "div", 32);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 33);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 34);
    \u0275\u0275repeaterCreate(10, TaskWizardComponent_Case_14_For_8_For_11_Template, 2, 1, "span", 35, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const goal_r5 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r2.selectedGoal() === goal_r5.type)("bg-purple-500/20", ctx_r2.selectedGoal() === goal_r5.type)("ring-2", ctx_r2.selectedGoal() === goal_r5.type)("ring-purple-500/50", ctx_r2.selectedGoal() === goal_r5.type)("border-slate-600", ctx_r2.selectedGoal() !== goal_r5.type)("bg-slate-800/50", ctx_r2.selectedGoal() !== goal_r5.type);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(goal_r5.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(goal_r5.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(goal_r5.description);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(goal_r5.suggestedRoles);
  }
}
function TaskWizardComponent_Case_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 10)(1, "div", 23)(2, "h3", 24);
    \u0275\u0275text(3, "\u60A8\u60F3\u9054\u6210\u4EC0\u9EBC\u76EE\u6A19\uFF1F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 25);
    \u0275\u0275text(5, "\u9078\u64C7\u76EE\u6A19\u5F8C\uFF0CAI \u5C07\u81EA\u52D5\u63A8\u85A6\u6700\u4F73\u914D\u7F6E");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 26);
    \u0275\u0275repeaterCreate(7, TaskWizardComponent_Case_14_For_8_Template, 12, 15, "button", 27, _forTrack1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275repeater(ctx_r2.goalTypes);
  }
}
function TaskWizardComponent_Case_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "div", 23)(2, "h3", 24);
    \u0275\u0275text(3, "\u9078\u64C7\u76EE\u6A19\u5BA2\u7FA4");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 25);
    \u0275\u0275text(5, "\u6307\u5B9A\u9019\u6B21\u4EFB\u52D9\u8981\u89F8\u9054\u7684\u5BA2\u6236\u7FA4\u9AD4");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 26)(7, "button", 36);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_15_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setAudienceSource("recent"));
    });
    \u0275\u0275elementStart(8, "div", 37);
    \u0275\u0275text(9, "\u{1F550}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 38);
    \u0275\u0275text(11, "\u6700\u8FD1\u4E92\u52D5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 39);
    \u0275\u0275text(13, "7\u5929\u5167\u6709\u4E92\u52D5\u7684\u5BA2\u6236");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "button", 36);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_15_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setAudienceSource("tags"));
    });
    \u0275\u0275elementStart(15, "div", 37);
    \u0275\u0275text(16, "\u{1F3F7}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 38);
    \u0275\u0275text(18, "\u6309\u6A19\u7C64\u7BE9\u9078");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 39);
    \u0275\u0275text(20, "\u9078\u64C7\u7279\u5B9A\u6A19\u7C64\u7684\u5BA2\u6236");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "button", 36);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_15_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setAudienceSource("group"));
    });
    \u0275\u0275elementStart(22, "div", 37);
    \u0275\u0275text(23, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 38);
    \u0275\u0275text(25, "\u5F9E\u7FA4\u7D44\u9078\u64C7");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 39);
    \u0275\u0275text(27, "\u9078\u64C7\u7279\u5B9A\u7FA4\u7D44\u7684\u6210\u54E1");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "button", 36);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_15_Template_button_click_28_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setAudienceSource("import"));
    });
    \u0275\u0275elementStart(29, "div", 37);
    \u0275\u0275text(30, "\u{1F4E5}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 38);
    \u0275\u0275text(32, "\u5C0E\u5165\u5BA2\u6236");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 39);
    \u0275\u0275text(34, "\u4E0A\u50B3\u5BA2\u6236\u5217\u8868\u6216\u624B\u52D5\u6DFB\u52A0");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(35, "div", 40)(36, "div", 41)(37, "span", 42);
    \u0275\u0275text(38, "\u610F\u5411\u5206\u6578\u9580\u6ABB");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "span", 43);
    \u0275\u0275text(40);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(41, "input", 44);
    \u0275\u0275listener("input", function TaskWizardComponent_Case_15_Template_input_input_41_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setIntentScoreMin($event.target.valueAsNumber));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "div", 45)(43, "span");
    \u0275\u0275text(44, "\u4F4E\u610F\u5411");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "span");
    \u0275\u0275text(46, "\u9AD8\u610F\u5411");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(47, "div", 46)(48, "div", 47)(49, "span", 5);
    \u0275\u0275text(50, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div")(52, "div", 38);
    \u0275\u0275text(53, "\u9810\u4F30\u89F8\u9054\u4EBA\u6578");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(54, "div", 48);
    \u0275\u0275text(55, "\u7B26\u5408\u689D\u4EF6\u7684\u6F5B\u5728\u5BA2\u6236");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(56, "div", 49);
    \u0275\u0275text(57);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r2.audienceSource() === "recent")("bg-cyan-500/20", ctx_r2.audienceSource() === "recent")("border-slate-600", ctx_r2.audienceSource() !== "recent")("bg-slate-800/50", ctx_r2.audienceSource() !== "recent");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r2.audienceSource() === "tags")("bg-cyan-500/20", ctx_r2.audienceSource() === "tags")("border-slate-600", ctx_r2.audienceSource() !== "tags")("bg-slate-800/50", ctx_r2.audienceSource() !== "tags");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r2.audienceSource() === "group")("bg-cyan-500/20", ctx_r2.audienceSource() === "group")("border-slate-600", ctx_r2.audienceSource() !== "group")("bg-slate-800/50", ctx_r2.audienceSource() !== "group");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-cyan-500", ctx_r2.audienceSource() === "import")("bg-cyan-500/20", ctx_r2.audienceSource() === "import")("border-slate-600", ctx_r2.audienceSource() !== "import")("bg-slate-800/50", ctx_r2.audienceSource() !== "import");
    \u0275\u0275advance(12);
    \u0275\u0275textInterpolate1("\u2265 ", ctx_r2.intentScoreMin(), "\u5206");
    \u0275\u0275advance();
    \u0275\u0275property("value", ctx_r2.intentScoreMin());
    \u0275\u0275advance(16);
    \u0275\u0275textInterpolate(ctx_r2.estimatedAudience());
  }
}
function TaskWizardComponent_Case_16_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_16_For_11_Template_button_click_0_listener() {
      const mode_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setExecutionMode(mode_r10.id));
    });
    \u0275\u0275elementStart(1, "div", 63);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 64);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 39);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const mode_r10 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r2.selectedMode() === mode_r10.id)("bg-purple-500/20", ctx_r2.selectedMode() === mode_r10.id)("border-slate-600", ctx_r2.selectedMode() !== mode_r10.id)("bg-slate-700/50", ctx_r2.selectedMode() !== mode_r10.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r10.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r10.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r10.description);
  }
}
function TaskWizardComponent_Case_16_For_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 54)(1, "span", 65);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 66);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const role_r11 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getRoleIcon(role_r11));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getRoleLabel(role_r11));
  }
}
function TaskWizardComponent_Case_16_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 5);
    \u0275\u0275text(1, "\u2705");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div")(3, "div", 67);
    \u0275\u0275text(4, "AI \u6A21\u578B\u5DF2\u5C31\u7DD2");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 48);
    \u0275\u0275text(6, "\u4F7F\u7528\u667A\u80FD\u5F15\u64CE\u4E2D\u914D\u7F6E\u7684\u9ED8\u8A8D\u6A21\u578B");
    \u0275\u0275elementEnd()();
  }
}
function TaskWizardComponent_Case_16_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 5);
    \u0275\u0275text(1, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div")(3, "div", 68);
    \u0275\u0275text(4, "\u672A\u914D\u7F6E AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 48);
    \u0275\u0275text(6, "\u8ACB\u5148\u5728\u667A\u80FD\u5F15\u64CE\u4E2D\u914D\u7F6E AI \u6A21\u578B");
    \u0275\u0275elementEnd()();
  }
}
function TaskWizardComponent_Case_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "div", 23)(2, "h3", 24);
    \u0275\u0275text(3, "\u78BA\u8A8D AI \u914D\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 25);
    \u0275\u0275text(5, "\u6839\u64DA\u76EE\u6A19\u81EA\u52D5\u63A8\u85A6\uFF0C\u60A8\u53EF\u4EE5\u8ABF\u6574");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 40)(7, "div", 33);
    \u0275\u0275text(8, "\u57F7\u884C\u6A21\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 50);
    \u0275\u0275repeaterCreate(10, TaskWizardComponent_Case_16_For_11_Template, 7, 11, "button", 51, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 40)(13, "div", 41)(14, "span", 48);
    \u0275\u0275text(15, "AI \u63A8\u85A6\u89D2\u8272\u7D44\u5408");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 52);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 53);
    \u0275\u0275repeaterCreate(19, TaskWizardComponent_Case_16_For_20_Template, 5, 2, "div", 54, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 55)(22, "div", 47);
    \u0275\u0275conditionalCreate(23, TaskWizardComponent_Case_16_Conditional_23_Template, 7, 0)(24, TaskWizardComponent_Case_16_Conditional_24_Template, 7, 0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "details", 56)(26, "summary", 57);
    \u0275\u0275text(27, " \u2699\uFE0F \u9AD8\u7D1A\u9078\u9805 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 58)(29, "div", 12)(30, "span", 48);
    \u0275\u0275text(31, "\u555F\u7528 AI \u6258\u7BA1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "button", 59);
    \u0275\u0275listener("click", function TaskWizardComponent_Case_16_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleAiHosting());
    });
    \u0275\u0275element(33, "span", 60);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 12)(35, "span", 48);
    \u0275\u0275text(36, "\u81EA\u52D5\u554F\u5019\u65B0\u5BA2\u6236");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "input", 61);
    \u0275\u0275twoWayListener("ngModelChange", function TaskWizardComponent_Case_16_Template_input_ngModelChange_37_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.autoGreeting, $event) || (ctx_r2.autoGreeting = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(38, "div", 12)(39, "span", 48);
    \u0275\u0275text(40, "\u81EA\u52D5\u56DE\u8986\u79C1\u4FE1");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "input", 61);
    \u0275\u0275twoWayListener("ngModelChange", function TaskWizardComponent_Case_16_Template_input_ngModelChange_41_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.autoReply, $event) || (ctx_r2.autoReply = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275repeater(ctx_r2.executionModes);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("\u57FA\u65BC\u300C", ctx_r2.getGoalLabel(ctx_r2.selectedGoal()), "\u300D\u76EE\u6A19");
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r2.suggestedRoles());
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500/10", ctx_r2.aiConnected())("border-emerald-500/30", ctx_r2.aiConnected())("bg-amber-500/10", !ctx_r2.aiConnected())("border-amber-500/30", !ctx_r2.aiConnected())("border", true);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.aiConnected() ? 23 : 24);
    \u0275\u0275advance(9);
    \u0275\u0275classProp("bg-cyan-500", ctx_r2.aiHostingEnabled())("bg-slate-600", !ctx_r2.aiHostingEnabled());
    \u0275\u0275advance();
    \u0275\u0275classProp("translate-x-6", ctx_r2.aiHostingEnabled());
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.autoGreeting);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.autoReply);
  }
}
function TaskWizardComponent_Case_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "div", 23)(2, "h3", 24);
    \u0275\u0275text(3, "\u78BA\u8A8D\u4EFB\u52D9\u914D\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 25);
    \u0275\u0275text(5, "\u6AA2\u67E5\u914D\u7F6E\u5F8C\u9EDE\u64CA\u555F\u52D5");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 69)(7, "div", 70)(8, "div")(9, "div", 71);
    \u0275\u0275text(10, "\u71DF\u92B7\u76EE\u6A19");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 7)(12, "span", 5);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 72);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "div")(17, "div", 71);
    \u0275\u0275text(18, "\u76EE\u6A19\u4EBA\u6578");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 73);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div")(22, "div", 71);
    \u0275\u0275text(23, "\u57F7\u884C\u6A21\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 74);
    \u0275\u0275text(25);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "div")(27, "div", 71);
    \u0275\u0275text(28, "\u89D2\u8272\u6578\u91CF");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 74);
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(31, "div", 40)(32, "label", 75);
    \u0275\u0275text(33, "\u4EFB\u52D9\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "input", 76);
    \u0275\u0275twoWayListener("ngModelChange", function TaskWizardComponent_Case_17_Template_input_ngModelChange_34_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.taskName, $event) || (ctx_r2.taskName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div", 77)(36, "div", 78)(37, "div", 79);
    \u0275\u0275text(38);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "div", 39);
    \u0275\u0275text(40, "\u9810\u4F30\u63A5\u89F8");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(41, "div", 78)(42, "div", 73);
    \u0275\u0275text(43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(44, "div", 39);
    \u0275\u0275text(45, "\u9810\u4F30\u56DE\u8986");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(46, "div", 78)(47, "div", 80);
    \u0275\u0275text(48);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "div", 39);
    \u0275\u0275text(50, "\u9810\u4F30\u8F49\u5316");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(51, "div", 81)(52, "input", 82);
    \u0275\u0275twoWayListener("ngModelChange", function TaskWizardComponent_Case_17_Template_input_ngModelChange_52_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.saveAsTemplate, $event) || (ctx_r2.saveAsTemplate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "label", 83);
    \u0275\u0275text(54, "\u4FDD\u5B58\u6B64\u914D\u7F6E\u70BA\u6A21\u677F\uFF0C\u65B9\u4FBF\u4E0B\u6B21\u5FEB\u901F\u4F7F\u7528");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(13);
    \u0275\u0275textInterpolate(ctx_r2.getGoalIcon(ctx_r2.selectedGoal()));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getGoalLabel(ctx_r2.selectedGoal()));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r2.estimatedAudience(), " \u4EBA");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.getModeLabel(ctx_r2.selectedMode()));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r2.suggestedRoles().length, " \u500B\u89D2\u8272");
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.taskName);
    \u0275\u0275property("placeholder", ctx_r2.defaultTaskName());
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.estimatedContacts());
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.estimatedReplies());
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.estimatedConversions());
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.saveAsTemplate);
  }
}
function TaskWizardComponent_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 84);
    \u0275\u0275listener("click", function TaskWizardComponent_Conditional_25_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.nextStep());
    });
    \u0275\u0275text(1, " \u4E0B\u4E00\u6B65 \u2192 ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("disabled", !ctx_r2.canProceed());
  }
}
function TaskWizardComponent_Conditional_26_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 86);
    \u0275\u0275text(1, "\u27F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u555F\u52D5\u4E2D... ");
  }
}
function TaskWizardComponent_Conditional_26_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u7ACB\u5373\u555F\u52D5 ");
  }
}
function TaskWizardComponent_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 85);
    \u0275\u0275listener("click", function TaskWizardComponent_Conditional_26_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.launchTask());
    });
    \u0275\u0275conditionalCreate(1, TaskWizardComponent_Conditional_26_Conditional_1_Template, 3, 0)(2, TaskWizardComponent_Conditional_26_Conditional_2_Template, 3, 0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275property("disabled", ctx_r2.isLaunching());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isLaunching() ? 1 : 2);
  }
}
var TaskWizardComponent = class _TaskWizardComponent {
  constructor() {
    this.taskService = inject(MarketingTaskService);
    this.stateService = inject(MarketingStateService);
    this.aiService = inject(AICenterService);
    this.toast = inject(ToastService);
    this.initialGoal = input(null, ...ngDevMode ? [{ debugName: "initialGoal" }] : []);
    this.close = output();
    this.taskCreated = output();
    this.currentStep = signal("goal", ...ngDevMode ? [{ debugName: "currentStep" }] : []);
    this.selectedGoal = signal(null, ...ngDevMode ? [{ debugName: "selectedGoal" }] : []);
    this.audienceSource = signal("recent", ...ngDevMode ? [{ debugName: "audienceSource" }] : []);
    this.intentScoreMin = signal(50, ...ngDevMode ? [{ debugName: "intentScoreMin" }] : []);
    this.selectedMode = signal("hybrid", ...ngDevMode ? [{ debugName: "selectedMode" }] : []);
    this.isLaunching = signal(false, ...ngDevMode ? [{ debugName: "isLaunching" }] : []);
    this.taskName = "";
    this.autoGreeting = true;
    this.autoReply = true;
    this.saveAsTemplate = false;
    this.steps = [
      { id: "goal", label: "\u9078\u64C7\u76EE\u6A19" },
      { id: "audience", label: "\u9078\u64C7\u5BA2\u7FA4" },
      { id: "config", label: "AI \u914D\u7F6E" },
      { id: "preview", label: "\u78BA\u8A8D\u555F\u52D5" }
    ];
    this.goalTypes = Object.entries(GOAL_TYPE_CONFIG).map(([type, config]) => __spreadValues({
      type
    }, config));
    this.executionModes = [
      { id: "scripted", icon: "\u{1F4DC}", label: "\u5287\u672C\u6A21\u5F0F", description: "\u6309\u9810\u8A2D\u6D41\u7A0B" },
      { id: "hybrid", icon: "\u{1F504}", label: "\u6DF7\u5408\u6A21\u5F0F", description: "\u63A8\u85A6" },
      { id: "scriptless", icon: "\u{1F916}", label: "\u7121\u5287\u672C", description: "AI \u5373\u8208" }
    ];
    this.aiConnected = computed(() => this.aiService.isConnected(), ...ngDevMode ? [{ debugName: "aiConnected" }] : []);
    this.aiHostingEnabled = computed(() => this.stateService.aiHostingEnabled(), ...ngDevMode ? [{ debugName: "aiHostingEnabled" }] : []);
    this.suggestedRoles = computed(() => {
      const goal = this.selectedGoal();
      if (!goal)
        return [];
      return GOAL_TYPE_CONFIG[goal].suggestedRoles;
    }, ...ngDevMode ? [{ debugName: "suggestedRoles" }] : []);
    this.estimatedAudience = computed(() => {
      const base = this.audienceSource() === "recent" ? 150 : this.audienceSource() === "tags" ? 80 : this.audienceSource() === "group" ? 200 : 50;
      const multiplier = (100 - this.intentScoreMin()) / 100;
      return Math.floor(base * multiplier) + 10;
    }, ...ngDevMode ? [{ debugName: "estimatedAudience" }] : []);
    this.estimatedContacts = computed(() => Math.floor(this.estimatedAudience() * 0.8), ...ngDevMode ? [{ debugName: "estimatedContacts" }] : []);
    this.estimatedReplies = computed(() => Math.floor(this.estimatedContacts() * 0.35), ...ngDevMode ? [{ debugName: "estimatedReplies" }] : []);
    this.estimatedConversions = computed(() => Math.floor(this.estimatedReplies() * 0.25), ...ngDevMode ? [{ debugName: "estimatedConversions" }] : []);
    this.defaultTaskName = computed(() => {
      const goal = this.selectedGoal();
      if (!goal)
        return "\u65B0\u71DF\u92B7\u4EFB\u52D9";
      const date = (/* @__PURE__ */ new Date()).toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
      return `${GOAL_TYPE_CONFIG[goal].label} - ${date}`;
    }, ...ngDevMode ? [{ debugName: "defaultTaskName" }] : []);
    const initial = this.initialGoal();
    if (initial) {
      this.selectedGoal.set(initial);
    }
  }
  // 步驟控制
  isStepCompleted(step) {
    const stepOrder = ["goal", "audience", "config", "preview"];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    const stepIndex = stepOrder.indexOf(step);
    return stepIndex < currentIndex;
  }
  canProceed() {
    switch (this.currentStep()) {
      case "goal":
        return this.selectedGoal() !== null;
      case "audience":
        return this.audienceSource() !== null;
      case "config":
        return true;
      // 配置步驟總是可以繼續
      case "preview":
        return true;
      default:
        return false;
    }
  }
  nextStep() {
    const stepOrder = ["goal", "audience", "config", "preview"];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    if (currentIndex < stepOrder.length - 1) {
      this.currentStep.set(stepOrder[currentIndex + 1]);
    }
  }
  previousStep() {
    const stepOrder = ["goal", "audience", "config", "preview"];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    if (currentIndex > 0) {
      this.currentStep.set(stepOrder[currentIndex - 1]);
    }
  }
  // 選擇操作
  selectGoal(goal) {
    this.selectedGoal.set(goal);
    this.selectedMode.set(GOAL_TYPE_CONFIG[goal].suggestedMode);
  }
  setAudienceSource(source) {
    this.audienceSource.set(source);
  }
  setIntentScoreMin(score) {
    this.intentScoreMin.set(score);
  }
  setExecutionMode(mode) {
    this.selectedMode.set(mode);
  }
  toggleAiHosting() {
    const newValue = !this.stateService.aiHostingEnabled();
    this.stateService.setAiHostingEnabled(newValue);
  }
  // 輔助方法
  getRoleLabel(role) {
    const labels = {
      "expert": "\u7522\u54C1\u5C08\u5BB6",
      "satisfied_customer": "\u6EFF\u610F\u8001\u5BA2\u6236",
      "support": "\u5BA2\u670D\u52A9\u7406",
      "manager": "\u7D93\u7406",
      "newbie": "\u597D\u5947\u65B0\u4EBA",
      "hesitant": "\u7336\u8C6B\u8005",
      "sales": "\u92B7\u552E",
      "callback": "\u56DE\u8A2A\u5C08\u54E1"
    };
    return labels[role] || role;
  }
  getRoleIcon(role) {
    const icons = {
      "expert": "\u{1F468}\u200D\u{1F4BC}",
      "satisfied_customer": "\u{1F60A}",
      "support": "\u{1F469}\u200D\u{1F4BB}",
      "manager": "\u{1F454}",
      "newbie": "\u{1F64B}",
      "hesitant": "\u{1F914}",
      "sales": "\u{1F4BC}",
      "callback": "\u{1F4DE}"
    };
    return icons[role] || "\u{1F3AD}";
  }
  getGoalLabel(goal) {
    return GOAL_TYPE_CONFIG[goal]?.label || goal;
  }
  getGoalIcon(goal) {
    return GOAL_TYPE_CONFIG[goal]?.icon || "\u{1F3AF}";
  }
  getModeLabel(mode) {
    const labels = {
      "scripted": "\u5287\u672C\u6A21\u5F0F",
      "hybrid": "\u6DF7\u5408\u6A21\u5F0F",
      "scriptless": "\u7121\u5287\u672C\u6A21\u5F0F"
    };
    return labels[mode];
  }
  // 啟動任務
  async launchTask() {
    this.isLaunching.set(true);
    try {
      const goal = this.selectedGoal();
      if (!goal)
        return;
      const name = this.taskName || this.defaultTaskName();
      const taskId = await this.taskService.createTask({
        name,
        goalType: goal,
        executionMode: this.selectedMode(),
        targetCriteria: {
          intentScoreMin: this.intentScoreMin(),
          sources: [this.audienceSource()]
        }
      });
      if (taskId) {
        this.taskService.startTask(taskId);
        if (this.saveAsTemplate) {
          this.saveTaskTemplate(name, goal);
        }
        this.toast.success(`\u{1F680} \u4EFB\u52D9\u300C${name}\u300D\u5DF2\u555F\u52D5\uFF01`);
        this.taskCreated.emit(taskId);
        this.close.emit();
      } else {
        this.toast.error("\u5275\u5EFA\u4EFB\u52D9\u5931\u6557");
      }
    } catch (error) {
      this.toast.error("\u555F\u52D5\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66");
    } finally {
      this.isLaunching.set(false);
    }
  }
  saveTaskTemplate(name, goal) {
    const templates = JSON.parse(localStorage.getItem("task_templates") || "[]");
    templates.push({
      id: Date.now().toString(),
      name: `${name} \u6A21\u677F`,
      goalType: goal,
      executionMode: this.selectedMode(),
      audienceSource: this.audienceSource(),
      intentScoreMin: this.intentScoreMin(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    localStorage.setItem("task_templates", JSON.stringify(templates));
  }
  onBackdropClick(event) {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
  static {
    this.\u0275fac = function TaskWizardComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TaskWizardComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _TaskWizardComponent, selectors: [["app-task-wizard"]], inputs: { initialGoal: [1, "initialGoal"] }, outputs: { close: "close", taskCreated: "taskCreated" }, decls: 27, vars: 3, consts: [[1, "task-wizard", "fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "bg-black/60", "backdrop-blur-sm", 3, "click"], [1, "wizard-content", "w-full", "max-w-3xl", "bg-slate-900", "rounded-2xl", "border", "border-slate-700/50", "shadow-2xl", "overflow-hidden", 3, "click"], [1, "wizard-header", "p-6", "border-b", "border-slate-700/50", "bg-gradient-to-r", "from-purple-500/10", "to-pink-500/10"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "text-xl", "font-bold", "text-white", "flex", "items-center", "gap-3"], [1, "text-2xl"], [1, "text-slate-400", "hover:text-white", "transition-colors", 3, "click"], [1, "flex", "items-center", "gap-2"], [1, "flex", "items-center"], [1, "wizard-body", "p-6", "max-h-[60vh]", "overflow-y-auto"], [1, "space-y-6"], [1, "wizard-footer", "p-6", "border-t", "border-slate-700/50", "bg-slate-800/50"], [1, "flex", "items-center", "justify-between"], [1, "px-6", "py-3", "text-slate-400", "hover:text-white", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "click", "disabled"], [1, "flex", "gap-3"], [1, "px-6", "py-3", "bg-slate-700", "text-slate-300", "rounded-xl", "hover:bg-slate-600", "transition-colors", 3, "click"], [1, "px-8", "py-3", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-all", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "disabled"], [1, "px-8", "py-3", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-all", "disabled:opacity-50", "flex", "items-center", "gap-2", 3, "disabled"], [1, "flex", "items-center", "gap-2", "px-3", "py-1.5", "rounded-full", "transition-all"], [1, "w-6", "h-6", "rounded-full", "flex", "items-center", "justify-center", "text-sm", "font-medium"], [1, "text-sm", "font-medium"], [1, "w-8", "h-0.5", "mx-2", 3, "bg-purple-500", "bg-slate-700"], [1, "w-8", "h-0.5", "mx-2"], [1, "text-center", "mb-6"], [1, "text-lg", "font-semibold", "text-white", "mb-2"], [1, "text-slate-400", "text-sm"], [1, "grid", "grid-cols-2", "gap-4"], [1, "p-6", "rounded-xl", "border-2", "transition-all", "text-left", "hover:scale-[1.02]", 3, "border-purple-500", "bg-purple-500/20", "ring-2", "ring-purple-500/50", "border-slate-600", "bg-slate-800/50"], [1, "p-6", "rounded-xl", "border-2", "transition-all", "text-left", "hover:scale-[1.02]", 3, "click"], [1, "flex", "items-start", "gap-4"], [1, "text-4xl"], [1, "flex-1"], [1, "font-semibold", "text-white", "text-lg", "mb-1"], [1, "text-sm", "text-slate-400", "mb-3"], [1, "flex", "flex-wrap", "gap-1"], [1, "px-2", "py-0.5", "text-xs", "bg-slate-700", "text-slate-300", "rounded"], [1, "p-4", "rounded-xl", "border", "transition-all", "text-left", 3, "click"], [1, "text-2xl", "mb-2"], [1, "font-medium", "text-white"], [1, "text-xs", "text-slate-400"], [1, "bg-slate-800/50", "rounded-xl", "p-4", "border", "border-slate-700/50"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-sm", "text-white", "font-medium"], [1, "text-cyan-400", "font-bold"], ["type", "range", "min", "0", "max", "100", "step", "10", 1, "w-full", 3, "input", "value"], [1, "flex", "justify-between", "text-xs", "text-slate-500", "mt-1"], [1, "flex", "items-center", "justify-between", "p-4", "bg-emerald-500/10", "border", "border-emerald-500/30", "rounded-xl"], [1, "flex", "items-center", "gap-3"], [1, "text-sm", "text-slate-400"], [1, "text-3xl", "font-bold", "text-emerald-400"], [1, "grid", "grid-cols-3", "gap-3"], [1, "p-3", "rounded-lg", "border", "transition-all", "text-center", 3, "border-purple-500", "bg-purple-500/20", "border-slate-600", "bg-slate-700/50"], [1, "text-xs", "text-purple-400"], [1, "flex", "flex-wrap", "gap-2"], [1, "flex", "items-center", "gap-2", "px-3", "py-2", "bg-purple-500/20", "border", "border-purple-500/30", "rounded-lg"], [1, "p-4", "rounded-xl"], [1, "bg-slate-800/30", "rounded-xl", "border", "border-slate-700/50"], [1, "p-4", "cursor-pointer", "text-slate-400", "hover:text-white", "transition-colors"], [1, "p-4", "pt-0", "space-y-4"], [1, "relative", "w-12", "h-6", "rounded-full", "transition-all", 3, "click"], [1, "absolute", "top-0.5", "left-0.5", "w-5", "h-5", "bg-white", "rounded-full", "shadow", "transition-transform"], ["type", "checkbox", 1, "w-5", "h-5", "rounded", 3, "ngModelChange", "ngModel"], [1, "p-3", "rounded-lg", "border", "transition-all", "text-center", 3, "click"], [1, "text-xl", "mb-1"], [1, "text-sm", "font-medium", "text-white"], [1, "text-lg"], [1, "text-sm", "text-white"], [1, "font-medium", "text-emerald-400"], [1, "font-medium", "text-amber-400"], [1, "bg-gradient-to-r", "from-purple-500/20", "to-pink-500/20", "rounded-xl", "p-6", "border", "border-purple-500/30"], [1, "grid", "grid-cols-2", "gap-6"], [1, "text-sm", "text-slate-400", "mb-1"], [1, "text-lg", "font-semibold", "text-white"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "text-white"], [1, "text-sm", "text-slate-400", "block", "mb-2"], ["type", "text", 1, "w-full", "px-4", "py-3", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-400", 3, "ngModelChange", "ngModel", "placeholder"], [1, "grid", "grid-cols-3", "gap-4"], [1, "bg-slate-800/50", "rounded-xl", "p-4", "border", "border-slate-700/50", "text-center"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "flex", "items-center", "gap-3", "p-4", "bg-slate-800/30", "rounded-xl", "border", "border-slate-700/50"], ["type", "checkbox", "id", "saveTemplate", 1, "w-5", "h-5", "rounded", 3, "ngModelChange", "ngModel"], ["for", "saveTemplate", 1, "text-sm", "text-slate-300"], [1, "px-8", "py-3", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-all", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "click", "disabled"], [1, "px-8", "py-3", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-all", "disabled:opacity-50", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "animate-spin"]], template: function TaskWizardComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0);
        \u0275\u0275listener("click", function TaskWizardComponent_Template_div_click_0_listener($event) {
          return ctx.onBackdropClick($event);
        });
        \u0275\u0275elementStart(1, "div", 1);
        \u0275\u0275listener("click", function TaskWizardComponent_Template_div_click_1_listener($event) {
          return $event.stopPropagation();
        });
        \u0275\u0275elementStart(2, "div", 2)(3, "div", 3)(4, "h2", 4)(5, "span", 5);
        \u0275\u0275text(6, "\u2728");
        \u0275\u0275elementEnd();
        \u0275\u0275text(7, " \u5275\u5EFA\u71DF\u92B7\u4EFB\u52D9 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "button", 6);
        \u0275\u0275listener("click", function TaskWizardComponent_Template_button_click_8_listener() {
          return ctx.close.emit();
        });
        \u0275\u0275text(9, " \u2715 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(10, "div", 7);
        \u0275\u0275repeaterCreate(11, TaskWizardComponent_For_12_Template, 8, 25, "div", 8, _forTrack0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(13, "div", 9);
        \u0275\u0275conditionalCreate(14, TaskWizardComponent_Case_14_Template, 9, 0, "div", 10)(15, TaskWizardComponent_Case_15_Template, 58, 35, "div", 10)(16, TaskWizardComponent_Case_16_Template, 42, 20, "div", 10)(17, TaskWizardComponent_Case_17_Template, 55, 11, "div", 10);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "div", 11)(19, "div", 12)(20, "button", 13);
        \u0275\u0275listener("click", function TaskWizardComponent_Template_button_click_20_listener() {
          return ctx.previousStep();
        });
        \u0275\u0275text(21, " \u2190 \u4E0A\u4E00\u6B65 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "div", 14)(23, "button", 15);
        \u0275\u0275listener("click", function TaskWizardComponent_Template_button_click_23_listener() {
          return ctx.close.emit();
        });
        \u0275\u0275text(24, " \u53D6\u6D88 ");
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(25, TaskWizardComponent_Conditional_25_Template, 2, 1, "button", 16)(26, TaskWizardComponent_Conditional_26_Template, 3, 2, "button", 17);
        \u0275\u0275elementEnd()()()()();
      }
      if (rf & 2) {
        let tmp_1_0;
        \u0275\u0275advance(11);
        \u0275\u0275repeater(ctx.steps);
        \u0275\u0275advance(3);
        \u0275\u0275conditional((tmp_1_0 = ctx.currentStep()) === "goal" ? 14 : tmp_1_0 === "audience" ? 15 : tmp_1_0 === "config" ? 16 : tmp_1_0 === "preview" ? 17 : -1);
        \u0275\u0275advance(6);
        \u0275\u0275property("disabled", ctx.currentStep() === "goal");
        \u0275\u0275advance(5);
        \u0275\u0275conditional(ctx.currentStep() !== "preview" ? 25 : 26);
      }
    }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TaskWizardComponent, [{
    type: Component,
    args: [{
      selector: "app-task-wizard",
      standalone: true,
      imports: [CommonModule, FormsModule],
      template: `
    <div class="task-wizard fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
         (click)="onBackdropClick($event)">
      <div class="wizard-content w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
           (click)="$event.stopPropagation()">
        
        <!-- \u9802\u90E8\u9032\u5EA6\u689D -->
        <div class="wizard-header p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">\u2728</span>
              \u5275\u5EFA\u71DF\u92B7\u4EFB\u52D9
            </h2>
            <button (click)="close.emit()" 
                    class="text-slate-400 hover:text-white transition-colors">
              \u2715
            </button>
          </div>
          
          <!-- \u6B65\u9A5F\u6307\u793A\u5668 -->
          <div class="flex items-center gap-2">
            @for (step of steps; track step.id; let i = $index) {
              <div class="flex items-center">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
                     [class.bg-purple-500]="currentStep() === step.id"
                     [class.text-white]="currentStep() === step.id"
                     [class.bg-slate-700]="currentStep() !== step.id && isStepCompleted(step.id)"
                     [class.text-slate-300]="currentStep() !== step.id && isStepCompleted(step.id)"
                     [class.bg-slate-800]="currentStep() !== step.id && !isStepCompleted(step.id)"
                     [class.text-slate-500]="currentStep() !== step.id && !isStepCompleted(step.id)">
                  <span class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                        [class.bg-white]="currentStep() === step.id"
                        [class.text-purple-500]="currentStep() === step.id"
                        [class.bg-emerald-500]="currentStep() !== step.id && isStepCompleted(step.id)"
                        [class.text-white]="currentStep() !== step.id && isStepCompleted(step.id)"
                        [class.bg-slate-600]="currentStep() !== step.id && !isStepCompleted(step.id)">
                    @if (isStepCompleted(step.id) && currentStep() !== step.id) {
                      \u2713
                    } @else {
                      {{ i + 1 }}
                    }
                  </span>
                  <span class="text-sm font-medium">{{ step.label }}</span>
                </div>
                @if (i < steps.length - 1) {
                  <div class="w-8 h-0.5 mx-2"
                       [class.bg-purple-500]="isStepCompleted(step.id)"
                       [class.bg-slate-700]="!isStepCompleted(step.id)"></div>
                }
              </div>
            }
          </div>
        </div>
        
        <!-- \u5167\u5BB9\u5340\u57DF -->
        <div class="wizard-body p-6 max-h-[60vh] overflow-y-auto">
          @switch (currentStep()) {
            <!-- \u6B65\u9A5F 1: \u9078\u64C7\u76EE\u6A19 -->
            @case ('goal') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">\u60A8\u60F3\u9054\u6210\u4EC0\u9EBC\u76EE\u6A19\uFF1F</h3>
                  <p class="text-slate-400 text-sm">\u9078\u64C7\u76EE\u6A19\u5F8C\uFF0CAI \u5C07\u81EA\u52D5\u63A8\u85A6\u6700\u4F73\u914D\u7F6E</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  @for (goal of goalTypes; track goal.type) {
                    <button (click)="selectGoal(goal.type)"
                            class="p-6 rounded-xl border-2 transition-all text-left hover:scale-[1.02]"
                            [class.border-purple-500]="selectedGoal() === goal.type"
                            [class.bg-purple-500/20]="selectedGoal() === goal.type"
                            [class.ring-2]="selectedGoal() === goal.type"
                            [class.ring-purple-500/50]="selectedGoal() === goal.type"
                            [class.border-slate-600]="selectedGoal() !== goal.type"
                            [class.bg-slate-800/50]="selectedGoal() !== goal.type">
                      <div class="flex items-start gap-4">
                        <div class="text-4xl">{{ goal.icon }}</div>
                        <div class="flex-1">
                          <div class="font-semibold text-white text-lg mb-1">{{ goal.label }}</div>
                          <div class="text-sm text-slate-400 mb-3">{{ goal.description }}</div>
                          <div class="flex flex-wrap gap-1">
                            @for (role of goal.suggestedRoles; track role) {
                              <span class="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                                {{ getRoleLabel(role) }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
            
            <!-- \u6B65\u9A5F 2: \u9078\u64C7\u5BA2\u7FA4 -->
            @case ('audience') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">\u9078\u64C7\u76EE\u6A19\u5BA2\u7FA4</h3>
                  <p class="text-slate-400 text-sm">\u6307\u5B9A\u9019\u6B21\u4EFB\u52D9\u8981\u89F8\u9054\u7684\u5BA2\u6236\u7FA4\u9AD4</p>
                </div>
                
                <!-- \u5BA2\u7FA4\u4F86\u6E90\u9078\u64C7 -->
                <div class="grid grid-cols-2 gap-4">
                  <button (click)="setAudienceSource('recent')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'recent'"
                          [class.bg-cyan-500/20]="audienceSource() === 'recent'"
                          [class.border-slate-600]="audienceSource() !== 'recent'"
                          [class.bg-slate-800/50]="audienceSource() !== 'recent'">
                    <div class="text-2xl mb-2">\u{1F550}</div>
                    <div class="font-medium text-white">\u6700\u8FD1\u4E92\u52D5</div>
                    <div class="text-xs text-slate-400">7\u5929\u5167\u6709\u4E92\u52D5\u7684\u5BA2\u6236</div>
                  </button>
                  
                  <button (click)="setAudienceSource('tags')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'tags'"
                          [class.bg-cyan-500/20]="audienceSource() === 'tags'"
                          [class.border-slate-600]="audienceSource() !== 'tags'"
                          [class.bg-slate-800/50]="audienceSource() !== 'tags'">
                    <div class="text-2xl mb-2">\u{1F3F7}\uFE0F</div>
                    <div class="font-medium text-white">\u6309\u6A19\u7C64\u7BE9\u9078</div>
                    <div class="text-xs text-slate-400">\u9078\u64C7\u7279\u5B9A\u6A19\u7C64\u7684\u5BA2\u6236</div>
                  </button>
                  
                  <button (click)="setAudienceSource('group')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'group'"
                          [class.bg-cyan-500/20]="audienceSource() === 'group'"
                          [class.border-slate-600]="audienceSource() !== 'group'"
                          [class.bg-slate-800/50]="audienceSource() !== 'group'">
                    <div class="text-2xl mb-2">\u{1F465}</div>
                    <div class="font-medium text-white">\u5F9E\u7FA4\u7D44\u9078\u64C7</div>
                    <div class="text-xs text-slate-400">\u9078\u64C7\u7279\u5B9A\u7FA4\u7D44\u7684\u6210\u54E1</div>
                  </button>
                  
                  <button (click)="setAudienceSource('import')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'import'"
                          [class.bg-cyan-500/20]="audienceSource() === 'import'"
                          [class.border-slate-600]="audienceSource() !== 'import'"
                          [class.bg-slate-800/50]="audienceSource() !== 'import'">
                    <div class="text-2xl mb-2">\u{1F4E5}</div>
                    <div class="font-medium text-white">\u5C0E\u5165\u5BA2\u6236</div>
                    <div class="text-xs text-slate-400">\u4E0A\u50B3\u5BA2\u6236\u5217\u8868\u6216\u624B\u52D5\u6DFB\u52A0</div>
                  </button>
                </div>
                
                <!-- \u610F\u5411\u5206\u6578\u7BE9\u9078 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-white font-medium">\u610F\u5411\u5206\u6578\u9580\u6ABB</span>
                    <span class="text-cyan-400 font-bold">\u2265 {{ intentScoreMin() }}\u5206</span>
                  </div>
                  <input type="range" 
                         [value]="intentScoreMin()" 
                         (input)="setIntentScoreMin($any($event.target).valueAsNumber)"
                         min="0" max="100" step="10"
                         class="w-full">
                  <div class="flex justify-between text-xs text-slate-500 mt-1">
                    <span>\u4F4E\u610F\u5411</span>
                    <span>\u9AD8\u610F\u5411</span>
                  </div>
                </div>
                
                <!-- \u9810\u4F30\u6578\u91CF -->
                <div class="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">\u{1F465}</span>
                    <div>
                      <div class="font-medium text-white">\u9810\u4F30\u89F8\u9054\u4EBA\u6578</div>
                      <div class="text-sm text-slate-400">\u7B26\u5408\u689D\u4EF6\u7684\u6F5B\u5728\u5BA2\u6236</div>
                    </div>
                  </div>
                  <div class="text-3xl font-bold text-emerald-400">{{ estimatedAudience() }}</div>
                </div>
              </div>
            }
            
            <!-- \u6B65\u9A5F 3: AI \u914D\u7F6E -->
            @case ('config') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">\u78BA\u8A8D AI \u914D\u7F6E</h3>
                  <p class="text-slate-400 text-sm">\u6839\u64DA\u76EE\u6A19\u81EA\u52D5\u63A8\u85A6\uFF0C\u60A8\u53EF\u4EE5\u8ABF\u6574</p>
                </div>
                
                <!-- \u57F7\u884C\u6A21\u5F0F -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="text-sm text-slate-400 mb-3">\u57F7\u884C\u6A21\u5F0F</div>
                  <div class="grid grid-cols-3 gap-3">
                    @for (mode of executionModes; track mode.id) {
                      <button (click)="setExecutionMode(mode.id)"
                              class="p-3 rounded-lg border transition-all text-center"
                              [class.border-purple-500]="selectedMode() === mode.id"
                              [class.bg-purple-500/20]="selectedMode() === mode.id"
                              [class.border-slate-600]="selectedMode() !== mode.id"
                              [class.bg-slate-700/50]="selectedMode() !== mode.id">
                        <div class="text-xl mb-1">{{ mode.icon }}</div>
                        <div class="text-sm font-medium text-white">{{ mode.label }}</div>
                        <div class="text-xs text-slate-400">{{ mode.description }}</div>
                      </button>
                    }
                  </div>
                </div>
                
                <!-- \u63A8\u85A6\u89D2\u8272\u914D\u7F6E -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-slate-400">AI \u63A8\u85A6\u89D2\u8272\u7D44\u5408</span>
                    <span class="text-xs text-purple-400">\u57FA\u65BC\u300C{{ getGoalLabel(selectedGoal()!) }}\u300D\u76EE\u6A19</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (role of suggestedRoles(); track role) {
                      <div class="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <span class="text-lg">{{ getRoleIcon(role) }}</span>
                        <span class="text-sm text-white">{{ getRoleLabel(role) }}</span>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- AI \u6A21\u578B\u72C0\u614B -->
                <div class="p-4 rounded-xl"
                     [class.bg-emerald-500/10]="aiConnected()"
                     [class.border-emerald-500/30]="aiConnected()"
                     [class.bg-amber-500/10]="!aiConnected()"
                     [class.border-amber-500/30]="!aiConnected()"
                     [class.border]="true">
                  <div class="flex items-center gap-3">
                    @if (aiConnected()) {
                      <span class="text-2xl">\u2705</span>
                      <div>
                        <div class="font-medium text-emerald-400">AI \u6A21\u578B\u5DF2\u5C31\u7DD2</div>
                        <div class="text-sm text-slate-400">\u4F7F\u7528\u667A\u80FD\u5F15\u64CE\u4E2D\u914D\u7F6E\u7684\u9ED8\u8A8D\u6A21\u578B</div>
                      </div>
                    } @else {
                      <span class="text-2xl">\u26A0\uFE0F</span>
                      <div>
                        <div class="font-medium text-amber-400">\u672A\u914D\u7F6E AI \u6A21\u578B</div>
                        <div class="text-sm text-slate-400">\u8ACB\u5148\u5728\u667A\u80FD\u5F15\u64CE\u4E2D\u914D\u7F6E AI \u6A21\u578B</div>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- \u9AD8\u7D1A\u9078\u9805 -->
                <details class="bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <summary class="p-4 cursor-pointer text-slate-400 hover:text-white transition-colors">
                    \u2699\uFE0F \u9AD8\u7D1A\u9078\u9805
                  </summary>
                  <div class="p-4 pt-0 space-y-4">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">\u555F\u7528 AI \u6258\u7BA1</span>
                      <button (click)="toggleAiHosting()"
                              class="relative w-12 h-6 rounded-full transition-all"
                              [class.bg-cyan-500]="aiHostingEnabled()"
                              [class.bg-slate-600]="!aiHostingEnabled()">
                        <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                              [class.translate-x-6]="aiHostingEnabled()"></span>
                      </button>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">\u81EA\u52D5\u554F\u5019\u65B0\u5BA2\u6236</span>
                      <input type="checkbox" [(ngModel)]="autoGreeting" class="w-5 h-5 rounded">
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">\u81EA\u52D5\u56DE\u8986\u79C1\u4FE1</span>
                      <input type="checkbox" [(ngModel)]="autoReply" class="w-5 h-5 rounded">
                    </div>
                  </div>
                </details>
              </div>
            }
            
            <!-- \u6B65\u9A5F 4: \u9810\u89BD\u78BA\u8A8D -->
            @case ('preview') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">\u78BA\u8A8D\u4EFB\u52D9\u914D\u7F6E</h3>
                  <p class="text-slate-400 text-sm">\u6AA2\u67E5\u914D\u7F6E\u5F8C\u9EDE\u64CA\u555F\u52D5</p>
                </div>
                
                <!-- \u4EFB\u52D9\u6458\u8981 -->
                <div class="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                  <div class="grid grid-cols-2 gap-6">
                    <div>
                      <div class="text-sm text-slate-400 mb-1">\u71DF\u92B7\u76EE\u6A19</div>
                      <div class="flex items-center gap-2">
                        <span class="text-2xl">{{ getGoalIcon(selectedGoal()!) }}</span>
                        <span class="text-lg font-semibold text-white">{{ getGoalLabel(selectedGoal()!) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">\u76EE\u6A19\u4EBA\u6578</div>
                      <div class="text-2xl font-bold text-cyan-400">{{ estimatedAudience() }} \u4EBA</div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">\u57F7\u884C\u6A21\u5F0F</div>
                      <div class="text-white">{{ getModeLabel(selectedMode()) }}</div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">\u89D2\u8272\u6578\u91CF</div>
                      <div class="text-white">{{ suggestedRoles().length }} \u500B\u89D2\u8272</div>
                    </div>
                  </div>
                </div>
                
                <!-- \u4EFB\u52D9\u540D\u7A31 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <label class="text-sm text-slate-400 block mb-2">\u4EFB\u52D9\u540D\u7A31</label>
                  <input type="text" 
                         [(ngModel)]="taskName"
                         [placeholder]="defaultTaskName()"
                         class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400">
                </div>
                
                <!-- \u9810\u4F30\u6548\u679C -->
                <div class="grid grid-cols-3 gap-4">
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-emerald-400">{{ estimatedContacts() }}</div>
                    <div class="text-xs text-slate-400">\u9810\u4F30\u63A5\u89F8</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ estimatedReplies() }}</div>
                    <div class="text-xs text-slate-400">\u9810\u4F30\u56DE\u8986</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-purple-400">{{ estimatedConversions() }}</div>
                    <div class="text-xs text-slate-400">\u9810\u4F30\u8F49\u5316</div>
                  </div>
                </div>
                
                <!-- \u4FDD\u5B58\u70BA\u6A21\u677F\u9078\u9805 -->
                <div class="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <input type="checkbox" [(ngModel)]="saveAsTemplate" id="saveTemplate" class="w-5 h-5 rounded">
                  <label for="saveTemplate" class="text-sm text-slate-300">\u4FDD\u5B58\u6B64\u914D\u7F6E\u70BA\u6A21\u677F\uFF0C\u65B9\u4FBF\u4E0B\u6B21\u5FEB\u901F\u4F7F\u7528</label>
                </div>
              </div>
            }
          }
        </div>
        
        <!-- \u5E95\u90E8\u6309\u9215 -->
        <div class="wizard-footer p-6 border-t border-slate-700/50 bg-slate-800/50">
          <div class="flex items-center justify-between">
            <button (click)="previousStep()"
                    [disabled]="currentStep() === 'goal'"
                    class="px-6 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              \u2190 \u4E0A\u4E00\u6B65
            </button>
            
            <div class="flex gap-3">
              <button (click)="close.emit()"
                      class="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                \u53D6\u6D88
              </button>
              
              @if (currentStep() !== 'preview') {
                <button (click)="nextStep()"
                        [disabled]="!canProceed()"
                        class="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  \u4E0B\u4E00\u6B65 \u2192
                </button>
              } @else {
                <button (click)="launchTask()"
                        [disabled]="isLaunching()"
                        class="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  @if (isLaunching()) {
                    <span class="animate-spin">\u27F3</span>
                    \u555F\u52D5\u4E2D...
                  } @else {
                    <span>\u{1F680}</span>
                    \u7ACB\u5373\u555F\u52D5
                  }
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    }]
  }], () => [], { initialGoal: [{ type: Input, args: [{ isSignal: true, alias: "initialGoal", required: false }] }], close: [{ type: Output, args: ["close"] }], taskCreated: [{ type: Output, args: ["taskCreated"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(TaskWizardComponent, { className: "TaskWizardComponent", filePath: "src/smart-marketing/task-wizard.component.ts", lineNumber: 424 });
})();

// src/smart-marketing/conversion-funnel.component.ts
var _forTrack02 = ($index, $item) => $item.label;
var _forTrack12 = ($index, $item) => $item.stage;
function ConversionFunnelComponent_Conditional_1_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 13);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.period());
  }
}
function ConversionFunnelComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 1)(1, "h3", 12)(2, "span");
    \u0275\u0275text(3, "\u{1F4CA}");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(4, " \u8F49\u5316\u6F0F\u6597 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(5, ConversionFunnelComponent_Conditional_1_Conditional_5_Template, 2, 1, "span", 13);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r0.period() ? 5 : -1);
  }
}
function ConversionFunnelComponent_For_4_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 22)(1, "div", 25);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 26);
    \u0275\u0275text(4, "\u8F49\u5316\u7387");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const \u0275$index_18_r2 = \u0275\u0275nextContext().$index;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.getConversionRateColor(ctx_r0.getStageConversionRate(\u0275$index_18_r2)));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStageConversionRate(\u0275$index_18_r2), "% ");
  }
}
function ConversionFunnelComponent_For_4_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElement(0, "div", 23);
  }
}
function ConversionFunnelComponent_For_4_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 24);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(1, "svg", 27);
    \u0275\u0275domElement(2, "path", 28);
    \u0275\u0275domElementEnd()();
  }
}
function ConversionFunnelComponent_For_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 3)(1, "div", 14)(2, "div", 15);
    \u0275\u0275domElement(3, "div", 16);
    \u0275\u0275domElementStart(4, "div", 17)(5, "div", 18)(6, "span", 19);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "span", 20);
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(10, "span", 21);
    \u0275\u0275text(11);
    \u0275\u0275pipe(12, "number");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275conditionalCreate(13, ConversionFunnelComponent_For_4_Conditional_13_Template, 5, 3, "div", 22)(14, ConversionFunnelComponent_For_4_Conditional_14_Template, 1, 0, "div", 23);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(15, ConversionFunnelComponent_For_4_Conditional_15_Template, 3, 0, "div", 24);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const stage_r3 = ctx.$implicit;
    const \u0275$index_18_r2 = ctx.$index;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("background", "linear-gradient(to right, " + stage_r3.color + "20, " + stage_r3.color + "40)");
    \u0275\u0275advance();
    \u0275\u0275styleProp("width", ctx_r0.getBarWidth(stage_r3.value), "%")("background", "linear-gradient(to right, " + stage_r3.color + ", " + stage_r3.color + "cc)");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(stage_r3.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stage_r3.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(12, 11, stage_r3.value));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(\u0275$index_18_r2 > 0 ? 13 : 14);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(\u0275$index_18_r2 < ctx_r0.funnelStages().length - 1 ? 15 : -1);
  }
}
function ConversionFunnelComponent_Conditional_22_For_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 31)(1, "span", 32);
    \u0275\u0275text(2);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div")(4, "div", 33);
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "div", 8);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd()()();
  }
  if (rf & 2) {
    const insight_r4 = ctx.$implicit;
    \u0275\u0275classProp("bg-emerald-500/10", insight_r4.type === "positive")("border-emerald-500/30", insight_r4.type === "positive")("bg-amber-500/10", insight_r4.type === "warning")("border-amber-500/30", insight_r4.type === "warning")("bg-red-500/10", insight_r4.type === "negative")("border-red-500/30", insight_r4.type === "negative")("border", true);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(insight_r4.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(insight_r4.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(insight_r4.description);
  }
}
function ConversionFunnelComponent_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 11)(1, "h4", 29);
    \u0275\u0275text(2, "\u968E\u6BB5\u5206\u6790");
    \u0275\u0275domElementEnd();
    \u0275\u0275repeaterCreate(3, ConversionFunnelComponent_Conditional_22_For_4_Template, 8, 17, "div", 30, _forTrack12);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.stageInsights());
  }
}
var ConversionFunnelComponent = class _ConversionFunnelComponent {
  constructor() {
    this.targets = input(0, ...ngDevMode ? [{ debugName: "targets" }] : []);
    this.contacted = input(0, ...ngDevMode ? [{ debugName: "contacted" }] : []);
    this.replied = input(0, ...ngDevMode ? [{ debugName: "replied" }] : []);
    this.converted = input(0, ...ngDevMode ? [{ debugName: "converted" }] : []);
    this.showTitle = input(true, ...ngDevMode ? [{ debugName: "showTitle" }] : []);
    this.showAnalysis = input(true, ...ngDevMode ? [{ debugName: "showAnalysis" }] : []);
    this.period = input("", ...ngDevMode ? [{ debugName: "period" }] : []);
    this.previousConversionRate = input(0, ...ngDevMode ? [{ debugName: "previousConversionRate" }] : []);
    this.avgConvertTime = input("2.3 \u5929", ...ngDevMode ? [{ debugName: "avgConvertTime" }] : []);
    this.funnelStages = computed(() => [
      { label: "\u76EE\u6A19\u5BA2\u6236", value: this.targets(), color: "#8b5cf6", icon: "\u{1F3AF}" },
      { label: "\u5DF2\u63A5\u89F8", value: this.contacted(), color: "#06b6d4", icon: "\u{1F44B}" },
      { label: "\u5DF2\u56DE\u8986", value: this.replied(), color: "#10b981", icon: "\u{1F4AC}" },
      { label: "\u5DF2\u8F49\u5316", value: this.converted(), color: "#f59e0b", icon: "\u2728" }
    ], ...ngDevMode ? [{ debugName: "funnelStages" }] : []);
    this.maxValue = computed(() => Math.max(this.targets(), 1), ...ngDevMode ? [{ debugName: "maxValue" }] : []);
    this.overallConversionRate = computed(() => {
      if (this.contacted() === 0)
        return 0;
      return Math.round(this.converted() / this.contacted() * 100);
    }, ...ngDevMode ? [{ debugName: "overallConversionRate" }] : []);
    this.avgTimeToConvert = computed(() => this.avgConvertTime(), ...ngDevMode ? [{ debugName: "avgTimeToConvert" }] : []);
    this.conversionTrend = computed(() => {
      const current = this.overallConversionRate();
      const previous = this.previousConversionRate();
      if (previous === 0)
        return 0;
      return Math.round((current - previous) / previous * 100);
    }, ...ngDevMode ? [{ debugName: "conversionTrend" }] : []);
    this.stageInsights = computed(() => {
      const insights = [];
      const contactRate = this.targets() > 0 ? this.contacted() / this.targets() * 100 : 0;
      if (contactRate >= 80) {
        insights.push({
          stage: "contact",
          type: "positive",
          icon: "\u2705",
          title: "\u63A5\u89F8\u7387\u512A\u79C0",
          description: `${contactRate.toFixed(0)}% \u7684\u76EE\u6A19\u5BA2\u6236\u5DF2\u88AB\u63A5\u89F8`
        });
      } else if (contactRate < 50) {
        insights.push({
          stage: "contact",
          type: "warning",
          icon: "\u26A0\uFE0F",
          title: "\u63A5\u89F8\u7387\u504F\u4F4E",
          description: "\u5EFA\u8B70\u589E\u52A0\u767C\u9001\u5E33\u865F\u6216\u5EF6\u9577\u57F7\u884C\u6642\u9593"
        });
      }
      const replyRate = this.contacted() > 0 ? this.replied() / this.contacted() * 100 : 0;
      if (replyRate >= 30) {
        insights.push({
          stage: "reply",
          type: "positive",
          icon: "\u{1F4AC}",
          title: "\u56DE\u8986\u7387\u826F\u597D",
          description: "\u5BA2\u6236\u4E92\u52D5\u7A4D\u6975\uFF0C\u7E7C\u7E8C\u4FDD\u6301"
        });
      } else if (replyRate < 15) {
        insights.push({
          stage: "reply",
          type: "negative",
          icon: "\u{1F4C9}",
          title: "\u56DE\u8986\u7387\u9700\u63D0\u5347",
          description: "\u5EFA\u8B70\u512A\u5316\u958B\u5834\u767D\u6216\u8ABF\u6574 AI \u4EBA\u683C"
        });
      }
      const conversionRate = this.replied() > 0 ? this.converted() / this.replied() * 100 : 0;
      if (conversionRate >= 25) {
        insights.push({
          stage: "conversion",
          type: "positive",
          icon: "\u{1F389}",
          title: "\u8F49\u5316\u7387\u51FA\u8272",
          description: "\u7576\u524D\u7B56\u7565\u975E\u5E38\u6709\u6548"
        });
      } else if (conversionRate < 10) {
        insights.push({
          stage: "conversion",
          type: "warning",
          icon: "\u{1F527}",
          title: "\u8F49\u5316\u7387\u6709\u63D0\u5347\u7A7A\u9593",
          description: "\u8003\u616E\u5F15\u5165\u66F4\u591A\u89D2\u8272\u6216\u8ABF\u6574\u5287\u672C"
        });
      }
      return insights;
    }, ...ngDevMode ? [{ debugName: "stageInsights" }] : []);
  }
  // 方法
  getBarWidth(value) {
    return Math.max(10, value / this.maxValue() * 100);
  }
  getStageConversionRate(stageIndex) {
    const stages = this.funnelStages();
    if (stageIndex === 0 || stages[stageIndex - 1].value === 0)
      return 0;
    return Math.round(stages[stageIndex].value / stages[stageIndex - 1].value * 100);
  }
  getConversionRateColor(rate) {
    if (rate >= 50)
      return "#10b981";
    if (rate >= 30)
      return "#06b6d4";
    if (rate >= 15)
      return "#f59e0b";
    return "#ef4444";
  }
  static {
    this.\u0275fac = function ConversionFunnelComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ConversionFunnelComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ConversionFunnelComponent, selectors: [["app-conversion-funnel"]], inputs: { targets: [1, "targets"], contacted: [1, "contacted"], replied: [1, "replied"], converted: [1, "converted"], showTitle: [1, "showTitle"], showAnalysis: [1, "showAnalysis"], period: [1, "period"], previousConversionRate: [1, "previousConversionRate"], avgConvertTime: [1, "avgConvertTime"] }, decls: 23, vars: 12, consts: [[1, "conversion-funnel"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "funnel-chart", "relative"], [1, "funnel-stage", "mb-3"], [1, "mt-6", "pt-6", "border-t", "border-slate-700/50"], [1, "grid", "grid-cols-3", "gap-4"], [1, "text-center"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "text-xs", "text-slate-400"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "text-2xl", "font-bold"], [1, "mt-6", "space-y-3"], [1, "text-lg", "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-sm", "text-slate-400"], [1, "flex", "items-center", "gap-4"], [1, "funnel-bar", "flex-1", "relative", "h-14", "rounded-lg", "overflow-hidden"], [1, "absolute", "inset-y-0", "left-0", "rounded-lg", "transition-all", "duration-500"], [1, "absolute", "inset-0", "flex", "items-center", "justify-between", "px-4"], [1, "flex", "items-center", "gap-3", "z-10"], [1, "text-xl"], [1, "font-medium", "text-white"], [1, "text-lg", "font-bold", "text-white", "z-10"], [1, "w-20", "text-right"], [1, "w-20"], [1, "flex", "items-center", "justify-center", "h-6", "text-slate-600"], [1, "text-lg", "font-bold"], [1, "text-xs", "text-slate-500"], ["width", "24", "height", "24", "viewBox", "0 0 24 24", "fill", "none"], ["d", "M12 4L12 20M12 20L6 14M12 20L18 14", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round"], [1, "text-sm", "font-medium", "text-slate-400"], [1, "flex", "items-start", "gap-3", "p-3", "rounded-lg", 3, "bg-emerald-500/10", "border-emerald-500/30", "bg-amber-500/10", "border-amber-500/30", "bg-red-500/10", "border-red-500/30", "border"], [1, "flex", "items-start", "gap-3", "p-3", "rounded-lg"], [1, "text-lg"], [1, "font-medium", "text-white", "text-sm"]], template: function ConversionFunnelComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0);
        \u0275\u0275conditionalCreate(1, ConversionFunnelComponent_Conditional_1_Template, 6, 1, "div", 1);
        \u0275\u0275domElementStart(2, "div", 2);
        \u0275\u0275repeaterCreate(3, ConversionFunnelComponent_For_4_Template, 16, 13, "div", 3, _forTrack02);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(5, "div", 4)(6, "div", 5)(7, "div", 6)(8, "div", 7);
        \u0275\u0275text(9);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(10, "div", 8);
        \u0275\u0275text(11, "\u7E3D\u9AD4\u8F49\u5316\u7387");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(12, "div", 6)(13, "div", 9);
        \u0275\u0275text(14);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(15, "div", 8);
        \u0275\u0275text(16, "\u5E73\u5747\u8F49\u5316\u6642\u9593");
        \u0275\u0275domElementEnd()();
        \u0275\u0275domElementStart(17, "div", 6)(18, "div", 10);
        \u0275\u0275text(19);
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(20, "div", 8);
        \u0275\u0275text(21, "\u8F03\u4E0A\u671F");
        \u0275\u0275domElementEnd()()()();
        \u0275\u0275conditionalCreate(22, ConversionFunnelComponent_Conditional_22_Template, 5, 0, "div", 11);
        \u0275\u0275domElementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showTitle() ? 1 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275repeater(ctx.funnelStages());
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate1("", ctx.overallConversionRate(), "%");
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(ctx.avgTimeToConvert());
        \u0275\u0275advance(4);
        \u0275\u0275classProp("text-emerald-400", ctx.conversionTrend() > 0)("text-red-400", ctx.conversionTrend() < 0)("text-slate-400", ctx.conversionTrend() === 0);
        \u0275\u0275advance();
        \u0275\u0275textInterpolate2(" ", ctx.conversionTrend() > 0 ? "+" : "", "", ctx.conversionTrend(), "% ");
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.showAnalysis() ? 22 : -1);
      }
    }, dependencies: [CommonModule, DecimalPipe], styles: ["\n\n.funnel-bar[_ngcontent-%COMP%] {\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);\n}\n.funnel-stage[_ngcontent-%COMP%]:first-child   .funnel-bar[_ngcontent-%COMP%] {\n  clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);\n}\n.funnel-stage[_ngcontent-%COMP%]:last-child   .funnel-bar[_ngcontent-%COMP%] {\n  clip-path: polygon(5% 0, 95% 0, 100% 100%, 0 100%);\n}\n.funnel-stage[_ngcontent-%COMP%]:not(:first-child):not(:last-child)   .funnel-bar[_ngcontent-%COMP%] {\n  clip-path: polygon(2% 0, 98% 0, 96% 100%, 4% 100%);\n}\n/*# sourceMappingURL=conversion-funnel.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConversionFunnelComponent, [{
    type: Component,
    args: [{ selector: "app-conversion-funnel", standalone: true, imports: [CommonModule], template: `
    <div class="conversion-funnel">
      <!-- \u6A19\u984C -->
      @if (showTitle()) {
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>\u{1F4CA}</span> \u8F49\u5316\u6F0F\u6597
          </h3>
          @if (period()) {
            <span class="text-sm text-slate-400">{{ period() }}</span>
          }
        </div>
      }
      
      <!-- \u6F0F\u6597\u5716 -->
      <div class="funnel-chart relative">
        @for (stage of funnelStages(); track stage.label; let i = $index) {
          <div class="funnel-stage mb-3">
            <div class="flex items-center gap-4">
              <!-- \u6F0F\u6597\u689D -->
              <div class="funnel-bar flex-1 relative h-14 rounded-lg overflow-hidden"
                   [style.background]="'linear-gradient(to right, ' + stage.color + '20, ' + stage.color + '40)'">
                <!-- \u586B\u5145 -->
                <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                     [style.width.%]="getBarWidth(stage.value)"
                     [style.background]="'linear-gradient(to right, ' + stage.color + ', ' + stage.color + 'cc)'">
                </div>
                
                <!-- \u5167\u5BB9 -->
                <div class="absolute inset-0 flex items-center justify-between px-4">
                  <div class="flex items-center gap-3 z-10">
                    <span class="text-xl">{{ stage.icon }}</span>
                    <span class="font-medium text-white">{{ stage.label }}</span>
                  </div>
                  <span class="text-lg font-bold text-white z-10">{{ stage.value | number }}</span>
                </div>
              </div>
              
              <!-- \u8F49\u5316\u7387 -->
              @if (i > 0) {
                <div class="w-20 text-right">
                  <div class="text-lg font-bold"
                       [style.color]="getConversionRateColor(getStageConversionRate(i))">
                    {{ getStageConversionRate(i) }}%
                  </div>
                  <div class="text-xs text-slate-500">\u8F49\u5316\u7387</div>
                </div>
              } @else {
                <div class="w-20"></div>
              }
            </div>
            
            <!-- \u9023\u63A5\u7BAD\u982D -->
            @if (i < funnelStages().length - 1) {
              <div class="flex items-center justify-center h-6 text-slate-600">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4L12 20M12 20L6 14M12 20L18 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
            }
          </div>
        }
      </div>
      
      <!-- \u7E3D\u9AD4\u7D71\u8A08 -->
      <div class="mt-6 pt-6 border-t border-slate-700/50">
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-400">{{ overallConversionRate() }}%</div>
            <div class="text-xs text-slate-400">\u7E3D\u9AD4\u8F49\u5316\u7387</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-cyan-400">{{ avgTimeToConvert() }}</div>
            <div class="text-xs text-slate-400">\u5E73\u5747\u8F49\u5316\u6642\u9593</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold"
                 [class.text-emerald-400]="conversionTrend() > 0"
                 [class.text-red-400]="conversionTrend() < 0"
                 [class.text-slate-400]="conversionTrend() === 0">
              {{ conversionTrend() > 0 ? '+' : '' }}{{ conversionTrend() }}%
            </div>
            <div class="text-xs text-slate-400">\u8F03\u4E0A\u671F</div>
          </div>
        </div>
      </div>
      
      <!-- \u968E\u6BB5\u5206\u6790 -->
      @if (showAnalysis()) {
        <div class="mt-6 space-y-3">
          <h4 class="text-sm font-medium text-slate-400">\u968E\u6BB5\u5206\u6790</h4>
          
          @for (insight of stageInsights(); track insight.stage) {
            <div class="flex items-start gap-3 p-3 rounded-lg"
                 [class.bg-emerald-500/10]="insight.type === 'positive'"
                 [class.border-emerald-500/30]="insight.type === 'positive'"
                 [class.bg-amber-500/10]="insight.type === 'warning'"
                 [class.border-amber-500/30]="insight.type === 'warning'"
                 [class.bg-red-500/10]="insight.type === 'negative'"
                 [class.border-red-500/30]="insight.type === 'negative'"
                 [class.border]="true">
              <span class="text-lg">{{ insight.icon }}</span>
              <div>
                <div class="font-medium text-white text-sm">{{ insight.title }}</div>
                <div class="text-xs text-slate-400">{{ insight.description }}</div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;2fe1adf824cc91c403f36a03a326f236a41dfcf343b9d686a650ba220782fa8f;D:/tgkz2026/src/smart-marketing/conversion-funnel.component.ts */\n.funnel-bar {\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);\n}\n.funnel-stage:first-child .funnel-bar {\n  clip-path: polygon(0 0, 100% 0, 98% 100%, 2% 100%);\n}\n.funnel-stage:last-child .funnel-bar {\n  clip-path: polygon(5% 0, 95% 0, 100% 100%, 0 100%);\n}\n.funnel-stage:not(:first-child):not(:last-child) .funnel-bar {\n  clip-path: polygon(2% 0, 98% 0, 96% 100%, 4% 100%);\n}\n/*# sourceMappingURL=conversion-funnel.component.css.map */\n"] }]
  }], null, { targets: [{ type: Input, args: [{ isSignal: true, alias: "targets", required: false }] }], contacted: [{ type: Input, args: [{ isSignal: true, alias: "contacted", required: false }] }], replied: [{ type: Input, args: [{ isSignal: true, alias: "replied", required: false }] }], converted: [{ type: Input, args: [{ isSignal: true, alias: "converted", required: false }] }], showTitle: [{ type: Input, args: [{ isSignal: true, alias: "showTitle", required: false }] }], showAnalysis: [{ type: Input, args: [{ isSignal: true, alias: "showAnalysis", required: false }] }], period: [{ type: Input, args: [{ isSignal: true, alias: "period", required: false }] }], previousConversionRate: [{ type: Input, args: [{ isSignal: true, alias: "previousConversionRate", required: false }] }], avgConvertTime: [{ type: Input, args: [{ isSignal: true, alias: "avgConvertTime", required: false }] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ConversionFunnelComponent, { className: "ConversionFunnelComponent", filePath: "src/smart-marketing/conversion-funnel.component.ts", lineNumber: 154 });
})();

// src/smart-marketing/smart-marketing-hub.component.ts
var _forTrack03 = ($index, $item) => $item.id;
var _forTrack13 = ($index, $item) => $item.type;
var _forTrack2 = ($index, $item) => $item.label;
function SmartMarketingHubComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 7);
    \u0275\u0275element(1, "span", 25);
    \u0275\u0275text(2, " AI \u5C31\u7DD2 ");
    \u0275\u0275elementEnd();
  }
}
function SmartMarketingHubComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 8);
    \u0275\u0275text(1, " \u672A\u914D\u7F6E AI ");
    \u0275\u0275elementEnd();
  }
}
function SmartMarketingHubComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 9);
    \u0275\u0275element(1, "span", 26);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.activeTasks().length, " \u4EFB\u52D9\u57F7\u884C\u4E2D ");
  }
}
function SmartMarketingHubComponent_For_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 27);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_For_32_Template_button_click_0_listener() {
      const tab_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.activeTab.set(tab_r3.id));
    });
    \u0275\u0275elementStart(1, "span", 28);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tab_r3 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-gradient-to-r", ctx_r0.activeTab() === tab_r3.id)("from-purple-500", ctx_r0.activeTab() === tab_r3.id)("to-pink-500", ctx_r0.activeTab() === tab_r3.id)("text-white", ctx_r0.activeTab() === tab_r3.id)("shadow-lg", ctx_r0.activeTab() === tab_r3.id)("text-slate-400", ctx_r0.activeTab() !== tab_r3.id)("hover:text-white", ctx_r0.activeTab() !== tab_r3.id)("hover:bg-slate-700/50", ctx_r0.activeTab() !== tab_r3.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tab_r3.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tab_r3.label);
  }
}
function SmartMarketingHubComponent_Case_34_For_9_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 48);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_34_For_9_Template_button_click_0_listener() {
      const goal_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.quickStartTask(goal_r6.type));
    });
    \u0275\u0275elementStart(1, "div", 49);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 50);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 51);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const goal_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r0.selectedGoal() === goal_r6.type)("bg-purple-500/20", ctx_r0.selectedGoal() === goal_r6.type)("border-slate-600", ctx_r0.selectedGoal() !== goal_r6.type)("bg-slate-800/50", ctx_r0.selectedGoal() !== goal_r6.type)("hover:border-purple-400", ctx_r0.selectedGoal() !== goal_r6.type);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(goal_r6.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(goal_r6.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(goal_r6.description);
  }
}
function SmartMarketingHubComponent_Case_34_Conditional_10_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "\u27F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " AI \u6B63\u5728\u914D\u7F6E... ");
  }
}
function SmartMarketingHubComponent_Case_34_Conditional_10_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u4E00\u9375\u555F\u52D5 ");
  }
}
function SmartMarketingHubComponent_Case_34_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 35)(1, "button", 52);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_34_Conditional_10_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.launchQuickTask());
    });
    \u0275\u0275conditionalCreate(2, SmartMarketingHubComponent_Case_34_Conditional_10_Conditional_2_Template, 3, 0)(3, SmartMarketingHubComponent_Case_34_Conditional_10_Conditional_3_Template, 3, 0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.isLaunching());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isLaunching() ? 2 : 3);
  }
}
function SmartMarketingHubComponent_Case_34_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 43)(1, "div", 54)(2, "div", 55)(3, "div", 56);
    \u0275\u0275text(4, "\u{1F3AF}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 57);
    \u0275\u0275text(6, "\u610F\u5411\u8A55\u4F30");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 51);
    \u0275\u0275text(8, "\u5BE6\u6642\u5206\u6790");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 55)(10, "div", 56);
    \u0275\u0275text(11, "\u{1F3AD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 57);
    \u0275\u0275text(13, "\u52D5\u614B\u4EBA\u683C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 51);
    \u0275\u0275text(15, "\u81EA\u52D5\u5339\u914D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 55)(17, "div", 56);
    \u0275\u0275text(18, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 57);
    \u0275\u0275text(20, "\u667A\u80FD\u5354\u4F5C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 51);
    \u0275\u0275text(22, "\u81EA\u52D5\u5F15\u5165");
    \u0275\u0275elementEnd()()()();
  }
}
function SmartMarketingHubComponent_Case_34_For_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 58);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_34_For_33_Template_button_click_0_listener() {
      const mode_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.setPreferredMode(mode_r9.id));
    });
    \u0275\u0275elementStart(1, "div", 59);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 60);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 61);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const mode_r9 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r0.preferredMode() === mode_r9.id)("bg-purple-500/20", ctx_r0.preferredMode() === mode_r9.id)("border-slate-600", ctx_r0.preferredMode() !== mode_r9.id)("bg-slate-700/50", ctx_r0.preferredMode() !== mode_r9.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r9.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r9.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(mode_r9.description);
  }
}
function SmartMarketingHubComponent_Case_34_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 20)(1, "div", 29)(2, "div", 30)(3, "h2", 31);
    \u0275\u0275text(4, "\u{1F3AF} \u9078\u64C7\u60A8\u7684\u71DF\u92B7\u76EE\u6A19");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 32);
    \u0275\u0275text(6, "AI \u5C07\u81EA\u52D5\u914D\u7F6E\u89D2\u8272\u3001\u9078\u64C7\u7B56\u7565\u4E26\u958B\u59CB\u57F7\u884C");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 33);
    \u0275\u0275repeaterCreate(8, SmartMarketingHubComponent_Case_34_For_9_Template, 7, 13, "button", 34, _forTrack13);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, SmartMarketingHubComponent_Case_34_Conditional_10_Template, 4, 2, "div", 35);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 36)(12, "div", 2)(13, "div", 3)(14, "div", 37);
    \u0275\u0275text(15, " \u{1F9E0} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "div")(17, "h3", 38);
    \u0275\u0275text(18, " AI \u667A\u80FD\u6258\u7BA1 ");
    \u0275\u0275elementStart(19, "span", 39);
    \u0275\u0275text(20, "\u6574\u5408");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "p", 40);
    \u0275\u0275text(22, "AI \u81EA\u52D5\u8655\u7406\u65B0 Lead\u3001\u56DE\u8986\u79C1\u4FE1\u3001\u8ABF\u6574\u7B56\u7565");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "button", 41);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_34_Template_button_click_23_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggleAIHosting());
    });
    \u0275\u0275element(24, "span", 42);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(25, SmartMarketingHubComponent_Case_34_Conditional_25_Template, 23, 0, "div", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 44)(27, "h3", 45)(28, "span");
    \u0275\u0275text(29, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(30, " \u57F7\u884C\u6A21\u5F0F\u504F\u597D ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 46);
    \u0275\u0275repeaterCreate(32, SmartMarketingHubComponent_Case_34_For_33_Template, 7, 11, "button", 47, _forTrack03);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r0.goalTypes);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.selectedGoal() ? 10 : -1);
    \u0275\u0275advance(13);
    \u0275\u0275classProp("bg-cyan-500", ctx_r0.aiHostingEnabled())("bg-slate-600", !ctx_r0.aiHostingEnabled());
    \u0275\u0275advance();
    \u0275\u0275classProp("translate-x-8", ctx_r0.aiHostingEnabled());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.aiHostingEnabled() ? 25 : -1);
    \u0275\u0275advance(7);
    \u0275\u0275repeater(ctx_r0.executionModes);
  }
}
function SmartMarketingHubComponent_Case_35_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 71)(1, "div", 73);
    \u0275\u0275text(2, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 74);
    \u0275\u0275text(4, "\u66AB\u7121\u71DF\u92B7\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 75);
    \u0275\u0275text(6, "\u4F7F\u7528\u4E0A\u65B9\u300C\u5FEB\u901F\u555F\u52D5\u300D\u5275\u5EFA\u60A8\u7684\u7B2C\u4E00\u500B\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 76);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_35_Conditional_16_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.activeTab.set("quick-start"));
    });
    \u0275\u0275text(8, " \u{1F680} \u958B\u59CB\u5275\u5EFA ");
    \u0275\u0275elementEnd()();
  }
}
function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 87);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_22_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r13);
      const task_r14 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.pauseTask(task_r14.id));
    });
    \u0275\u0275text(1, " \u66AB\u505C ");
    \u0275\u0275elementEnd();
  }
}
function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 88);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_23_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r15);
      const task_r14 = \u0275\u0275nextContext().$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.startTask(task_r14.id));
    });
    \u0275\u0275text(1, " \u555F\u52D5 ");
    \u0275\u0275elementEnd();
  }
}
function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 77)(1, "div", 3)(2, "div", 78);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div")(5, "div", 79);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 80)(8, "span");
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 81);
    \u0275\u0275text(11, "\xB7");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span", 81);
    \u0275\u0275text(15, "\xB7");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 82);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(18, "div", 3)(19, "span", 83);
    \u0275\u0275text(20);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 64);
    \u0275\u0275conditionalCreate(22, SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_22_Template, 2, 0, "button", 84)(23, SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Conditional_23_Template, 2, 0, "button", 85);
    \u0275\u0275elementStart(24, "button", 86);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Template_button_click_24_listener() {
      const task_r14 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.viewTaskDetails(task_r14));
    });
    \u0275\u0275text(25, " \u8A73\u60C5 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const task_r14 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500/20", task_r14.status === "running")("bg-purple-500/20", task_r14.status === "completed")("bg-slate-700", task_r14.status === "draft" || task_r14.status === "paused");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getGoalIcon(task_r14.goalType), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(task_r14.name);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.getGoalLabel(task_r14.goalType));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("", task_r14.stats.totalContacts, " \u76EE\u6A19");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("", task_r14.stats.converted, " \u8F49\u5316");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500/20", task_r14.status === "running")("text-emerald-400", task_r14.status === "running")("bg-purple-500/20", task_r14.status === "completed")("text-purple-400", task_r14.status === "completed")("bg-yellow-500/20", task_r14.status === "paused")("text-yellow-400", task_r14.status === "paused")("bg-slate-600", task_r14.status === "draft")("text-slate-300", task_r14.status === "draft");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getStatusLabel(task_r14.status), " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(task_r14.status === "running" ? 22 : task_r14.status === "paused" || task_r14.status === "draft" ? 23 : -1);
  }
}
function SmartMarketingHubComponent_Case_35_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 72);
    \u0275\u0275repeaterCreate(1, SmartMarketingHubComponent_Case_35_Conditional_17_For_2_Template, 26, 29, "div", 77, _forTrack03);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.filteredTasks());
  }
}
function SmartMarketingHubComponent_Case_35_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 21)(1, "div", 62)(2, "h2", 63);
    \u0275\u0275text(3, "\u71DF\u92B7\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 64)(5, "select", 65);
    \u0275\u0275twoWayListener("ngModelChange", function SmartMarketingHubComponent_Case_35_Template_select_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.taskFilter, $event) || (ctx_r0.taskFilter = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(6, "option", 66);
    \u0275\u0275text(7, "\u5168\u90E8\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "option", 67);
    \u0275\u0275text(9, "\u57F7\u884C\u4E2D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "option", 68);
    \u0275\u0275text(11, "\u5DF2\u5B8C\u6210");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "option", 69);
    \u0275\u0275text(13, "\u8349\u7A3F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "button", 70);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_35_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.createNewTask());
    });
    \u0275\u0275text(15, " + \u65B0\u5EFA\u4EFB\u52D9 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(16, SmartMarketingHubComponent_Case_35_Conditional_16_Template, 9, 0, "div", 71)(17, SmartMarketingHubComponent_Case_35_Conditional_17_Template, 3, 0, "div", 72);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.taskFilter);
    \u0275\u0275advance(11);
    \u0275\u0275conditional(ctx_r0.filteredTasks().length === 0 ? 16 : 17);
  }
}
function SmartMarketingHubComponent_Case_36_For_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 100);
    \u0275\u0275element(1, "div", 109);
    \u0275\u0275elementStart(2, "span", 51);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const day_r16 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", day_r16.converted * 15 + 20, "px");
    \u0275\u0275classProp("bg-purple-500", true);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(day_r16.label);
  }
}
function SmartMarketingHubComponent_Case_36_For_45_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 101)(1, "span", 110);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 111)(4, "div", 112)(5, "span", 113);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 32);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 114);
    \u0275\u0275element(10, "div", 115);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const goal_r17 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(goal_r17.icon);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(goal_r17.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", goal_r17.count, " \u4EFB\u52D9");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", goal_r17.percentage, "%");
  }
}
function SmartMarketingHubComponent_Case_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 22)(1, "div", 89)(2, "div", 90)(3, "div", 91);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 92);
    \u0275\u0275text(6, "\u7E3D\u4EFB\u52D9\u6578");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 90)(8, "div", 93);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 92);
    \u0275\u0275text(11, "\u6D3B\u8E8D\u4EFB\u52D9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 90)(13, "div", 94);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 92);
    \u0275\u0275text(16, "\u7E3D\u8F49\u5316");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 90)(18, "div", 95);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "div", 92);
    \u0275\u0275text(21, "\u8F49\u5316\u7387");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div", 90)(23, "div", 96);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 92);
    \u0275\u0275text(26, "\u6D88\u606F\u767C\u9001");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(27, "div", 44);
    \u0275\u0275element(28, "app-conversion-funnel", 97);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 98)(30, "div", 44)(31, "h3", 45)(32, "span");
    \u0275\u0275text(33, "\u{1F4C8}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(34, " \u8F49\u5316\u8DA8\u52E2 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "div", 99);
    \u0275\u0275repeaterCreate(36, SmartMarketingHubComponent_Case_36_For_37_Template, 4, 5, "div", 100, _forTrack2);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(38, "div", 44)(39, "h3", 45)(40, "span");
    \u0275\u0275text(41, "\u{1F3AF}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(42, " \u76EE\u6A19\u985E\u578B\u5206\u5E03 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "div", 72);
    \u0275\u0275repeaterCreate(44, SmartMarketingHubComponent_Case_36_For_45_Template, 11, 5, "div", 101, _forTrack13);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(46, "div", 102)(47, "h3", 45)(48, "span");
    \u0275\u0275text(49, "\u{1F9E0}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(50, " AI \u7CFB\u7D71\u72C0\u614B ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div", 103)(52, "div", 104)(53, "div", 105);
    \u0275\u0275text(54);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(55, "div", 51);
    \u0275\u0275text(56, "\u4ECA\u65E5\u5C0D\u8A71");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(57, "div", 104)(58, "div", 106);
    \u0275\u0275text(59);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "div", 51);
    \u0275\u0275text(61, "\u610F\u5716\u8B58\u5225");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(62, "div", 104)(63, "div", 107);
    \u0275\u0275text(64);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "div", 51);
    \u0275\u0275text(66, "\u5E73\u5747\u97FF\u61C9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(67, "div", 104)(68, "div", 108);
    \u0275\u0275text(69);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(70, "div", 51);
    \u0275\u0275text(71, "\u4ECA\u65E5\u6210\u672C");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.overallStats().totalTasks);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.overallStats().activeTasks);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.overallStats().totalConverted);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r0.overallConversionRate(), "%");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.overallStats().totalMessagesSent);
    \u0275\u0275advance(4);
    \u0275\u0275property("targets", ctx_r0.funnelTargets())("contacted", ctx_r0.overallStats().totalContacted)("replied", ctx_r0.funnelReplied())("converted", ctx_r0.overallStats().totalConverted)("period", "\u672C\u9031\u6578\u64DA")("showAnalysis", true);
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r0.last7DaysData());
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r0.goalDistribution());
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r0.aiStats().conversations);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.aiStats().intentsRecognized);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r0.aiStats().avgResponseTime, "ms");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("\xA5", ctx_r0.aiStats().cost.toFixed(2));
  }
}
function SmartMarketingHubComponent_Case_37_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 23)(1, "div", 44)(2, "h3", 45)(3, "span");
    \u0275\u0275text(4, "\u{1F916}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " AI \u5F15\u64CE\u914D\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 116);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_37_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToAICenter());
    });
    \u0275\u0275elementStart(7, "div")(8, "div", 79);
    \u0275\u0275text(9, "\u6A21\u578B\u914D\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 92);
    \u0275\u0275text(11, "\u914D\u7F6E AI \u6A21\u578B\u3001API Key \u7B49");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "span", 32);
    \u0275\u0275text(13, "\u2192");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "div", 44)(15, "h3", 45)(16, "span");
    \u0275\u0275text(17, "\u{1F3AD}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(18, " \u89D2\u8272\u7BA1\u7406 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "button", 116);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_37_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToRoleLibrary());
    });
    \u0275\u0275elementStart(20, "div")(21, "div", 79);
    \u0275\u0275text(22, "\u89D2\u8272\u5EAB\u8207\u5287\u672C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 92);
    \u0275\u0275text(24, "\u7BA1\u7406\u89D2\u8272\u5B9A\u7FA9\u3001\u5287\u672C\u6A21\u677F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "span", 32);
    \u0275\u0275text(26, "\u2192");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(27, "div", 44)(28, "h3", 117)(29, "span");
    \u0275\u0275text(30, "\u2699\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(31, " \u9ED8\u8A8D\u8A2D\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 118)(33, "div", 119)(34, "div")(35, "label", 120);
    \u0275\u0275text(36, "\u610F\u5411\u95BE\u503C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "div", 6)(38, "input", 121);
    \u0275\u0275listener("input", function SmartMarketingHubComponent_Case_37_Template_input_input_38_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.updateIntentThreshold($event.target.valueAsNumber));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(39, "span", 122);
    \u0275\u0275text(40);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(41, "div")(42, "label", 120);
    \u0275\u0275text(43, "\u6700\u5927\u540C\u6642\u4EFB\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(44, "input", 123);
    \u0275\u0275listener("input", function SmartMarketingHubComponent_Case_37_Template_input_input_44_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.updateMaxConcurrentTasks($event.target.valueAsNumber));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(45, "button", 124);
    \u0275\u0275listener("click", function SmartMarketingHubComponent_Case_37_Template_button_click_45_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.saveSettings());
    });
    \u0275\u0275text(46, " \u{1F4BE} \u4FDD\u5B58\u8A2D\u7F6E ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(38);
    \u0275\u0275property("value", ctx_r0.intentThreshold());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r0.intentThreshold(), "%");
    \u0275\u0275advance(4);
    \u0275\u0275property("value", ctx_r0.maxConcurrentTasks());
  }
}
function SmartMarketingHubComponent_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-task-wizard", 125);
    \u0275\u0275listener("close", function SmartMarketingHubComponent_Conditional_38_Template_app_task_wizard_close_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeWizard());
    })("taskCreated", function SmartMarketingHubComponent_Conditional_38_Template_app_task_wizard_taskCreated_0_listener($event) {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.onTaskCreated($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("initialGoal", ctx_r0.wizardInitialGoal());
  }
}
var SmartMarketingHubComponent = class _SmartMarketingHubComponent {
  constructor() {
    this.taskService = inject(MarketingTaskService);
    this.stateService = inject(MarketingStateService);
    this.aiService = inject(AICenterService);
    this.multiRoleService = inject(MultiRoleService);
    this.dynamicEngine = inject(DynamicScriptEngineService);
    this.toast = inject(ToastService);
    this.ipc = inject(ElectronIpcService);
    this.activeTab = signal("quick-start", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.selectedGoal = signal(null, ...ngDevMode ? [{ debugName: "selectedGoal" }] : []);
    this.isLaunching = signal(false, ...ngDevMode ? [{ debugName: "isLaunching" }] : []);
    this.preferredMode = signal("hybrid", ...ngDevMode ? [{ debugName: "preferredMode" }] : []);
    this.showWizard = signal(false, ...ngDevMode ? [{ debugName: "showWizard" }] : []);
    this.wizardInitialGoal = signal(null, ...ngDevMode ? [{ debugName: "wizardInitialGoal" }] : []);
    this.aiHostingEnabled = computed(() => this.stateService.aiHostingEnabled(), ...ngDevMode ? [{ debugName: "aiHostingEnabled" }] : []);
    this.intentThreshold = computed(() => this.stateService.intentThreshold(), ...ngDevMode ? [{ debugName: "intentThreshold" }] : []);
    this.maxConcurrentTasks = computed(() => this.stateService.maxConcurrentTasks(), ...ngDevMode ? [{ debugName: "maxConcurrentTasks" }] : []);
    this.taskFilter = "all";
    this.tabs = [
      { id: "quick-start", icon: "\u{1F680}", label: "\u5FEB\u901F\u555F\u52D5" },
      { id: "tasks", icon: "\u{1F4CB}", label: "\u4EFB\u52D9\u5217\u8868" },
      { id: "monitor", icon: "\u{1F4CA}", label: "\u6548\u679C\u76E3\u63A7" },
      { id: "settings", icon: "\u2699\uFE0F", label: "\u8A2D\u7F6E" }
    ];
    this.goalTypes = [
      { type: "conversion", icon: "\u{1F4B0}", label: "\u4FC3\u9032\u9996\u55AE", description: "\u8F49\u5316\u6F5B\u5728\u5BA2\u6236" },
      { type: "retention", icon: "\u{1F49D}", label: "\u633D\u56DE\u6D41\u5931", description: "\u53EC\u56DE\u8001\u5BA2\u6236" },
      { type: "engagement", icon: "\u{1F389}", label: "\u793E\u7FA4\u6D3B\u8E8D", description: "\u63D0\u5347\u4E92\u52D5" },
      { type: "support", icon: "\u{1F527}", label: "\u552E\u5F8C\u670D\u52D9", description: "\u89E3\u6C7A\u554F\u984C" }
    ];
    this.executionModes = [
      { id: "scripted", icon: "\u{1F4DC}", label: "\u5287\u672C\u6A21\u5F0F", description: "\u6309\u9810\u8A2D\u6D41\u7A0B" },
      { id: "hybrid", icon: "\u{1F504}", label: "\u6DF7\u5408\u6A21\u5F0F", description: "\u63A8\u85A6" },
      { id: "scriptless", icon: "\u{1F916}", label: "\u7121\u5287\u672C", description: "AI \u5373\u8208" }
    ];
    this.aiConnected = computed(() => this.aiService.isConnected(), ...ngDevMode ? [{ debugName: "aiConnected" }] : []);
    this.activeTasks = computed(() => this.taskService.activeTasks(), ...ngDevMode ? [{ debugName: "activeTasks" }] : []);
    this.todayStats = computed(() => this.taskService.todayStats(), ...ngDevMode ? [{ debugName: "todayStats" }] : []);
    this.overallStats = computed(() => this.taskService.getOverallStats(), ...ngDevMode ? [{ debugName: "overallStats" }] : []);
    this.overallConversionRate = computed(() => this.taskService.overallConversionRate(), ...ngDevMode ? [{ debugName: "overallConversionRate" }] : []);
    this.filteredTasks = computed(() => {
      const tasks = this.taskService.tasks();
      if (this.taskFilter === "all")
        return tasks;
      return tasks.filter((t) => t.status === this.taskFilter);
    }, ...ngDevMode ? [{ debugName: "filteredTasks" }] : []);
    this.aiStats = computed(() => this.aiService.stats().today, ...ngDevMode ? [{ debugName: "aiStats" }] : []);
    this.funnelTargets = computed(() => this.overallStats().totalContacted + 50, ...ngDevMode ? [{ debugName: "funnelTargets" }] : []);
    this.funnelReplied = computed(() => Math.floor(this.overallStats().totalContacted * 0.35), ...ngDevMode ? [{ debugName: "funnelReplied" }] : []);
    this.last7DaysData = computed(() => {
      const days = ["\u9031\u4E00", "\u9031\u4E8C", "\u9031\u4E09", "\u9031\u56DB", "\u9031\u4E94", "\u9031\u516D", "\u9031\u65E5"];
      return days.map((label, i) => ({
        label,
        converted: Math.floor(Math.random() * 10) + 1
      }));
    }, ...ngDevMode ? [{ debugName: "last7DaysData" }] : []);
    this.goalDistribution = computed(() => {
      const tasksByGoal = this.taskService.tasksByGoal();
      const total = this.taskService.tasks().length || 1;
      return this.goalTypes.map((goal) => __spreadProps(__spreadValues({}, goal), {
        count: tasksByGoal[goal.type]?.length || 0,
        percentage: (tasksByGoal[goal.type]?.length || 0) / total * 100
      }));
    }, ...ngDevMode ? [{ debugName: "goalDistribution" }] : []);
  }
  // ============ 生命週期 ============
  ngOnInit() {
    this.loadSettings();
  }
  // ============ 快速啟動 ============
  quickStartTask(goalType) {
    this.wizardInitialGoal.set(goalType);
    this.showWizard.set(true);
  }
  // 🆕 優化 1-1: 向導操作方法
  openWizard() {
    this.wizardInitialGoal.set(null);
    this.showWizard.set(true);
  }
  closeWizard() {
    this.showWizard.set(false);
    this.wizardInitialGoal.set(null);
  }
  onTaskCreated(taskId) {
    this.activeTab.set("tasks");
    this.taskService.loadTasks();
  }
  async launchQuickTask() {
    const goal = this.selectedGoal();
    if (!goal)
      return;
    this.isLaunching.set(true);
    try {
      const taskId = await this.taskService.quickCreate(goal);
      if (taskId) {
        this.taskService.startTask(taskId);
        this.toast.success(`\u{1F680} ${GOAL_TYPE_CONFIG[goal].label} \u4EFB\u52D9\u5DF2\u555F\u52D5\uFF01`);
        this.selectedGoal.set(null);
        this.activeTab.set("tasks");
      } else {
        this.toast.error("\u4EFB\u52D9\u5275\u5EFA\u5931\u6557");
      }
    } catch (error) {
      this.toast.error("\u555F\u52D5\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66");
    } finally {
      this.isLaunching.set(false);
    }
  }
  // ============ AI 托管 ============
  toggleAIHosting() {
    const newValue = !this.stateService.aiHostingEnabled();
    this.stateService.setAiHostingEnabled(newValue);
    this.toast.success(newValue ? "\u{1F9E0} AI \u667A\u80FD\u6258\u7BA1\u5DF2\u555F\u7528" : "AI \u667A\u80FD\u6258\u7BA1\u5DF2\u95DC\u9589");
  }
  setPreferredMode(mode) {
    this.preferredMode.set(mode);
    localStorage.setItem("preferred_execution_mode", mode);
  }
  // ============ 任務操作 ============
  createNewTask() {
    this.openWizard();
  }
  startTask(taskId) {
    this.taskService.startTask(taskId);
    this.toast.success("\u4EFB\u52D9\u5DF2\u555F\u52D5");
  }
  pauseTask(taskId) {
    this.taskService.pauseTask(taskId);
    this.toast.info("\u4EFB\u52D9\u5DF2\u66AB\u505C");
  }
  viewTaskDetails(task) {
    this.taskService.setCurrentTask(task);
    this.toast.info(`\u67E5\u770B\u4EFB\u52D9: ${task.name}`);
  }
  // ============ 導航 ============
  goToAICenter() {
    this.ipc.send("navigate-to", { path: "/ai-center" });
  }
  goToRoleLibrary() {
    this.ipc.send("navigate-to", { path: "/multi-role" });
  }
  // ============ 設置 ============
  loadSettings() {
    const mode = localStorage.getItem("preferred_execution_mode");
    if (mode)
      this.preferredMode.set(mode);
  }
  saveSettings() {
    this.stateService.saveSettingsToBackend();
    this.toast.success("\u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
  }
  // 🆕 Phase 4-1: 設置更新方法
  updateIntentThreshold(value) {
    this.stateService.setIntentThreshold(value);
  }
  updateMaxConcurrentTasks(value) {
    this.stateService.setMaxConcurrentTasks(value);
  }
  // ============ 輔助方法 ============
  getGoalIcon(goalType) {
    return GOAL_TYPE_CONFIG[goalType]?.icon || "\u{1F3AF}";
  }
  getGoalLabel(goalType) {
    return GOAL_TYPE_CONFIG[goalType]?.label || goalType;
  }
  getStatusLabel(status) {
    const labels = {
      draft: "\u8349\u7A3F",
      scheduled: "\u5DF2\u8A08\u5283",
      running: "\u57F7\u884C\u4E2D",
      paused: "\u5DF2\u66AB\u505C",
      completed: "\u5DF2\u5B8C\u6210",
      failed: "\u5931\u6557"
    };
    return labels[status] || status;
  }
  static {
    this.\u0275fac = function SmartMarketingHubComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartMarketingHubComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SmartMarketingHubComponent, selectors: [["app-smart-marketing-hub"]], decls: 39, vars: 7, consts: [[1, "smart-marketing-hub", "h-full", "flex", "flex-col", "bg-slate-900"], [1, "p-4", "border-b", "border-slate-700/50", "bg-slate-900/80", "backdrop-blur-sm"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-4"], [1, "text-2xl", "font-bold", "text-white", "flex", "items-center", "gap-3"], [1, "text-2xl"], [1, "flex", "items-center", "gap-2"], [1, "flex", "items-center", "gap-2", "px-3", "py-1", "bg-emerald-500/20", "text-emerald-400", "rounded-full", "text-sm"], [1, "px-3", "py-1", "bg-yellow-500/20", "text-yellow-400", "rounded-full", "text-sm"], [1, "flex", "items-center", "gap-2", "px-3", "py-1", "bg-purple-500/20", "text-purple-400", "rounded-full", "text-sm"], [1, "flex", "items-center", "gap-4", "px-4", "py-2", "bg-slate-800/80", "rounded-xl", "border", "border-slate-700/50"], [1, "text-center"], [1, "text-lg", "font-bold", "text-cyan-400"], [1, "text-xs", "text-slate-500"], [1, "w-px", "h-8", "bg-slate-700"], [1, "text-lg", "font-bold", "text-emerald-400"], [1, "text-lg", "font-bold", "text-purple-400"], [1, "flex", "gap-1", "mt-4", "bg-slate-800/50", "p-1", "rounded-xl", "w-fit"], [1, "px-5", "py-2.5", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", "text-sm", "font-medium", 3, "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "shadow-lg", "text-slate-400", "hover:text-white", "hover:bg-slate-700/50"], [1, "flex-1", "overflow-y-auto", "p-4"], [1, "max-w-4xl", "mx-auto", "space-y-6"], [1, "max-w-5xl", "mx-auto", "space-y-4"], [1, "max-w-6xl", "mx-auto", "space-y-6"], [1, "max-w-3xl", "mx-auto", "space-y-6"], [3, "initialGoal"], [1, "w-2", "h-2", "bg-emerald-500", "rounded-full"], [1, "w-2", "h-2", "bg-purple-500", "rounded-full", "animate-pulse"], [1, "px-5", "py-2.5", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", "text-sm", "font-medium", 3, "click"], [1, "text-lg"], [1, "bg-gradient-to-r", "from-purple-500/20", "via-pink-500/20", "to-cyan-500/20", "rounded-2xl", "border", "border-purple-500/30", "p-6"], [1, "text-center", "mb-6"], [1, "text-2xl", "font-bold", "text-white", "mb-2"], [1, "text-slate-400"], [1, "grid", "grid-cols-2", "md:grid-cols-4", "gap-4"], [1, "p-6", "rounded-xl", "transition-all", "text-center", "border-2", "hover:scale-105", 3, "border-purple-500", "bg-purple-500/20", "border-slate-600", "bg-slate-800/50", "hover:border-purple-400"], [1, "mt-6", "flex", "justify-center"], [1, "bg-gradient-to-br", "from-cyan-500/20", "to-blue-500/20", "rounded-2xl", "border", "border-cyan-500/30", "p-6"], [1, "w-14", "h-14", "rounded-xl", "bg-cyan-500/30", "flex", "items-center", "justify-center", "text-3xl"], [1, "text-xl", "font-bold", "text-white", "flex", "items-center", "gap-2"], [1, "px-2", "py-0.5", "text-xs", "bg-cyan-500/30", "text-cyan-400", "rounded-full"], [1, "text-slate-400", "text-sm"], [1, "relative", "w-16", "h-8", "rounded-full", "transition-all", 3, "click"], [1, "absolute", "top-1", "left-1", "w-6", "h-6", "bg-white", "rounded-full", "shadow", "transition-transform"], [1, "mt-6", "pt-6", "border-t", "border-cyan-500/30"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-6"], [1, "font-semibold", "text-white", "mb-4", "flex", "items-center", "gap-2"], [1, "grid", "grid-cols-3", "gap-4"], [1, "p-4", "rounded-xl", "border-2", "transition-all", "text-center", 3, "border-purple-500", "bg-purple-500/20", "border-slate-600", "bg-slate-700/50"], [1, "p-6", "rounded-xl", "transition-all", "text-center", "border-2", "hover:scale-105", 3, "click"], [1, "text-4xl", "mb-3"], [1, "font-semibold", "text-white", "mb-1"], [1, "text-xs", "text-slate-400"], [1, "px-8", "py-4", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-bold", "text-lg", "rounded-xl", "hover:opacity-90", "transition-all", "shadow-lg", "disabled:opacity-50", "flex", "items-center", "gap-3", 3, "click", "disabled"], [1, "animate-spin"], [1, "grid", "grid-cols-3", "gap-4", "text-center"], [1, "p-3", "bg-slate-800/50", "rounded-xl"], [1, "text-2xl", "mb-1"], [1, "text-sm", "font-medium", "text-white"], [1, "p-4", "rounded-xl", "border-2", "transition-all", "text-center", 3, "click"], [1, "text-2xl", "mb-2"], [1, "font-medium", "text-white", "text-sm"], [1, "text-xs", "text-slate-400", "mt-1"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "text-xl", "font-bold", "text-white"], [1, "flex", "gap-2"], [1, "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "text-sm", 3, "ngModelChange", "ngModel"], ["value", "all"], ["value", "running"], ["value", "completed"], ["value", "draft"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", 3, "click"], [1, "text-center", "py-16", "text-slate-400"], [1, "space-y-3"], [1, "text-6xl", "mb-4"], [1, "text-lg", "mb-2"], [1, "text-sm", "mb-4"], [1, "px-6", "py-3", "bg-purple-500", "text-white", "rounded-lg", "hover:bg-purple-400", 3, "click"], [1, "flex", "items-center", "justify-between", "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "hover:border-slate-600", "transition-colors"], [1, "w-12", "h-12", "rounded-xl", "flex", "items-center", "justify-center", "text-2xl"], [1, "font-medium", "text-white"], [1, "text-sm", "text-slate-400", "flex", "items-center", "gap-2"], [1, "text-slate-600"], [1, "text-emerald-400"], [1, "px-3", "py-1", "rounded-full", "text-xs", "font-medium"], [1, "px-3", "py-1.5", "bg-yellow-500/20", "text-yellow-400", "rounded-lg", "text-sm"], [1, "px-3", "py-1.5", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "text-sm"], [1, "px-3", "py-1.5", "bg-slate-700", "text-slate-300", "rounded-lg", "text-sm", 3, "click"], [1, "px-3", "py-1.5", "bg-yellow-500/20", "text-yellow-400", "rounded-lg", "text-sm", 3, "click"], [1, "px-3", "py-1.5", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "text-sm", 3, "click"], [1, "grid", "grid-cols-5", "gap-4"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "text-3xl", "font-bold", "text-purple-400"], [1, "text-sm", "text-slate-400"], [1, "text-3xl", "font-bold", "text-cyan-400"], [1, "text-3xl", "font-bold", "text-emerald-400"], [1, "text-3xl", "font-bold", "text-amber-400"], [1, "text-3xl", "font-bold", "text-pink-400"], [3, "targets", "contacted", "replied", "converted", "period", "showAnalysis"], [1, "grid", "grid-cols-2", "gap-6"], [1, "h-48", "flex", "items-end", "justify-around", "gap-2"], [1, "flex", "flex-col", "items-center", "gap-2"], [1, "flex", "items-center", "gap-3"], [1, "bg-gradient-to-br", "from-cyan-500/10", "to-purple-500/10", "rounded-xl", "border", "border-cyan-500/30", "p-6"], [1, "grid", "grid-cols-4", "gap-4"], [1, "bg-slate-800/50", "rounded-lg", "p-4", "text-center"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "text-2xl", "font-bold", "text-amber-400"], [1, "w-12", "rounded-t", "transition-all"], [1, "text-xl"], [1, "flex-1"], [1, "flex", "justify-between", "text-sm", "mb-1"], [1, "text-white"], [1, "h-2", "bg-slate-700", "rounded-full", "overflow-hidden"], [1, "h-full", "bg-purple-500", "rounded-full", "transition-all"], [1, "w-full", "p-4", "bg-slate-700/50", "rounded-xl", "text-left", "hover:bg-slate-700", "transition-colors", "flex", "items-center", "justify-between", 3, "click"], [1, "font-semibold", "text-white", "mb-6", "flex", "items-center", "gap-2"], [1, "space-y-4"], [1, "grid", "grid-cols-2", "gap-4"], [1, "text-sm", "text-slate-400", "block", "mb-2"], ["type", "range", "min", "50", "max", "100", "step", "5", 1, "flex-1", 3, "input", "value"], [1, "text-white", "w-12", "text-right"], ["type", "number", "min", "1", "max", "10", 1, "w-full", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", 3, "input", "value"], [1, "w-full", "py-3", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-opacity", 3, "click"], [3, "close", "taskCreated", "initialGoal"]], template: function SmartMarketingHubComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "h1", 4)(5, "span", 5);
        \u0275\u0275text(6, "\u{1F680}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(7, " \u667A\u80FD\u71DF\u92B7\u4E2D\u5FC3 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "div", 6);
        \u0275\u0275conditionalCreate(9, SmartMarketingHubComponent_Conditional_9_Template, 3, 0, "span", 7)(10, SmartMarketingHubComponent_Conditional_10_Template, 2, 0, "span", 8);
        \u0275\u0275conditionalCreate(11, SmartMarketingHubComponent_Conditional_11_Template, 3, 1, "span", 9);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(12, "div", 10)(13, "div", 11)(14, "div", 12);
        \u0275\u0275text(15);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "div", 13);
        \u0275\u0275text(17, "\u4ECA\u65E5\u63A5\u89F8");
        \u0275\u0275elementEnd()();
        \u0275\u0275element(18, "div", 14);
        \u0275\u0275elementStart(19, "div", 11)(20, "div", 15);
        \u0275\u0275text(21);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "div", 13);
        \u0275\u0275text(23, "\u4ECA\u65E5\u8F49\u5316");
        \u0275\u0275elementEnd()();
        \u0275\u0275element(24, "div", 14);
        \u0275\u0275elementStart(25, "div", 11)(26, "div", 16);
        \u0275\u0275text(27);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "div", 13);
        \u0275\u0275text(29, "\u8F49\u5316\u7387");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(30, "div", 17);
        \u0275\u0275repeaterCreate(31, SmartMarketingHubComponent_For_32_Template, 5, 18, "button", 18, _forTrack03);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(33, "div", 19);
        \u0275\u0275conditionalCreate(34, SmartMarketingHubComponent_Case_34_Template, 34, 8, "div", 20)(35, SmartMarketingHubComponent_Case_35_Template, 18, 2, "div", 21)(36, SmartMarketingHubComponent_Case_36_Template, 72, 15, "div", 22)(37, SmartMarketingHubComponent_Case_37_Template, 47, 3, "div", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(38, SmartMarketingHubComponent_Conditional_38_Template, 1, 1, "app-task-wizard", 24);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_6_0;
        \u0275\u0275advance(9);
        \u0275\u0275conditional(ctx.aiConnected() ? 9 : 10);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.activeTasks().length > 0 ? 11 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.todayStats().contacted);
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.todayStats().converted);
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate1("", ctx.overallConversionRate(), "%");
        \u0275\u0275advance(4);
        \u0275\u0275repeater(ctx.tabs);
        \u0275\u0275advance(3);
        \u0275\u0275conditional((tmp_6_0 = ctx.activeTab()) === "quick-start" ? 34 : tmp_6_0 === "tasks" ? 35 : tmp_6_0 === "monitor" ? 36 : tmp_6_0 === "settings" ? 37 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275conditional(ctx.showWizard() ? 38 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel, TaskWizardComponent, ConversionFunnelComponent], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartMarketingHubComponent, [{
    type: Component,
    args: [{
      selector: "app-smart-marketing-hub",
      standalone: true,
      imports: [CommonModule, FormsModule, TaskWizardComponent, ConversionFunnelComponent],
      template: `
    <div class="smart-marketing-hub h-full flex flex-col bg-slate-900">
      <!-- \u9802\u90E8\u6A19\u984C\u6B04 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">\u{1F680}</span>
              \u667A\u80FD\u71DF\u92B7\u4E2D\u5FC3
            </h1>
            
            <!-- AI \u72C0\u614B -->
            <div class="flex items-center gap-2">
              @if (aiConnected()) {
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  AI \u5C31\u7DD2
                </span>
              } @else {
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  \u672A\u914D\u7F6E AI
                </span>
              }
              
              @if (activeTasks().length > 0) {
                <span class="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                  {{ activeTasks().length }} \u4EFB\u52D9\u57F7\u884C\u4E2D
                </span>
              }
            </div>
          </div>
          
          <!-- \u5FEB\u901F\u7D71\u8A08 -->
          <div class="flex items-center gap-4 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <div class="text-center">
              <div class="text-lg font-bold text-cyan-400">{{ todayStats().contacted }}</div>
              <div class="text-xs text-slate-500">\u4ECA\u65E5\u63A5\u89F8</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-emerald-400">{{ todayStats().converted }}</div>
              <div class="text-xs text-slate-500">\u4ECA\u65E5\u8F49\u5316</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-purple-400">{{ overallConversionRate() }}%</div>
              <div class="text-xs text-slate-500">\u8F49\u5316\u7387</div>
            </div>
          </div>
        </div>
        
        <!-- Tab \u5C0E\u822A -->
        <div class="flex gap-1 mt-4 bg-slate-800/50 p-1 rounded-xl w-fit">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-purple-500]="activeTab() === tab.id"
                    [class.to-pink-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.shadow-lg]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.hover:text-white]="activeTab() !== tab.id"
                    [class.hover:bg-slate-700/50]="activeTab() !== tab.id">
              <span class="text-lg">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          }
        </div>
      </div>
      
      <!-- \u5167\u5BB9\u5340 -->
      <div class="flex-1 overflow-y-auto p-4">
        @switch (activeTab()) {
          @case ('quick-start') {
            <!-- \u5FEB\u901F\u555F\u52D5\u5340 -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- \u4E00\u9375\u555F\u52D5\u5361\u7247 -->
              <div class="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="text-center mb-6">
                  <h2 class="text-2xl font-bold text-white mb-2">\u{1F3AF} \u9078\u64C7\u60A8\u7684\u71DF\u92B7\u76EE\u6A19</h2>
                  <p class="text-slate-400">AI \u5C07\u81EA\u52D5\u914D\u7F6E\u89D2\u8272\u3001\u9078\u64C7\u7B56\u7565\u4E26\u958B\u59CB\u57F7\u884C</p>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  @for (goal of goalTypes; track goal.type) {
                    <button (click)="quickStartTask(goal.type)"
                            class="p-6 rounded-xl transition-all text-center border-2 hover:scale-105"
                            [class.border-purple-500]="selectedGoal() === goal.type"
                            [class.bg-purple-500/20]="selectedGoal() === goal.type"
                            [class.border-slate-600]="selectedGoal() !== goal.type"
                            [class.bg-slate-800/50]="selectedGoal() !== goal.type"
                            [class.hover:border-purple-400]="selectedGoal() !== goal.type">
                      <div class="text-4xl mb-3">{{ goal.icon }}</div>
                      <div class="font-semibold text-white mb-1">{{ goal.label }}</div>
                      <div class="text-xs text-slate-400">{{ goal.description }}</div>
                    </button>
                  }
                </div>
                
                @if (selectedGoal()) {
                  <div class="mt-6 flex justify-center">
                    <button (click)="launchQuickTask()"
                            [disabled]="isLaunching()"
                            class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center gap-3">
                      @if (isLaunching()) {
                        <span class="animate-spin">\u27F3</span>
                        AI \u6B63\u5728\u914D\u7F6E...
                      } @else {
                        <span>\u{1F680}</span>
                        \u4E00\u9375\u555F\u52D5
                      }
                    </button>
                  </div>
                }
              </div>
              
              <!-- AI \u81EA\u52D5\u5316\u958B\u95DC\uFF08\u6574\u5408\u81EA AI \u4E2D\u5FC3\uFF09 -->
              <div class="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-cyan-500/30 flex items-center justify-center text-3xl">
                      \u{1F9E0}
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        AI \u667A\u80FD\u6258\u7BA1
                        <span class="px-2 py-0.5 text-xs bg-cyan-500/30 text-cyan-400 rounded-full">\u6574\u5408</span>
                      </h3>
                      <p class="text-slate-400 text-sm">AI \u81EA\u52D5\u8655\u7406\u65B0 Lead\u3001\u56DE\u8986\u79C1\u4FE1\u3001\u8ABF\u6574\u7B56\u7565</p>
                    </div>
                  </div>
                  <button (click)="toggleAIHosting()"
                          class="relative w-16 h-8 rounded-full transition-all"
                          [class.bg-cyan-500]="aiHostingEnabled()"
                          [class.bg-slate-600]="!aiHostingEnabled()">
                    <span class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                          [class.translate-x-8]="aiHostingEnabled()"></span>
                  </button>
                </div>
                
                @if (aiHostingEnabled()) {
                  <div class="mt-6 pt-6 border-t border-cyan-500/30">
                    <div class="grid grid-cols-3 gap-4 text-center">
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">\u{1F3AF}</div>
                        <div class="text-sm font-medium text-white">\u610F\u5411\u8A55\u4F30</div>
                        <div class="text-xs text-slate-400">\u5BE6\u6642\u5206\u6790</div>
                      </div>
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">\u{1F3AD}</div>
                        <div class="text-sm font-medium text-white">\u52D5\u614B\u4EBA\u683C</div>
                        <div class="text-xs text-slate-400">\u81EA\u52D5\u5339\u914D</div>
                      </div>
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">\u{1F465}</div>
                        <div class="text-sm font-medium text-white">\u667A\u80FD\u5354\u4F5C</div>
                        <div class="text-xs text-slate-400">\u81EA\u52D5\u5F15\u5165</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- \u57F7\u884C\u6A21\u5F0F\u9078\u64C7 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>\u2699\uFE0F</span> \u57F7\u884C\u6A21\u5F0F\u504F\u597D
                </h3>
                <div class="grid grid-cols-3 gap-4">
                  @for (mode of executionModes; track mode.id) {
                    <button (click)="setPreferredMode(mode.id)"
                            class="p-4 rounded-xl border-2 transition-all text-center"
                            [class.border-purple-500]="preferredMode() === mode.id"
                            [class.bg-purple-500/20]="preferredMode() === mode.id"
                            [class.border-slate-600]="preferredMode() !== mode.id"
                            [class.bg-slate-700/50]="preferredMode() !== mode.id">
                      <div class="text-2xl mb-2">{{ mode.icon }}</div>
                      <div class="font-medium text-white text-sm">{{ mode.label }}</div>
                      <div class="text-xs text-slate-400 mt-1">{{ mode.description }}</div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
          
          @case ('tasks') {
            <!-- \u4EFB\u52D9\u5217\u8868 -->
            <div class="max-w-5xl mx-auto space-y-4">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-white">\u71DF\u92B7\u4EFB\u52D9</h2>
                <div class="flex gap-2">
                  <select [(ngModel)]="taskFilter"
                          class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="all">\u5168\u90E8\u4EFB\u52D9</option>
                    <option value="running">\u57F7\u884C\u4E2D</option>
                    <option value="completed">\u5DF2\u5B8C\u6210</option>
                    <option value="draft">\u8349\u7A3F</option>
                  </select>
                  <button (click)="createNewTask()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30">
                    + \u65B0\u5EFA\u4EFB\u52D9
                  </button>
                </div>
              </div>
              
              @if (filteredTasks().length === 0) {
                <div class="text-center py-16 text-slate-400">
                  <div class="text-6xl mb-4">\u{1F4CB}</div>
                  <p class="text-lg mb-2">\u66AB\u7121\u71DF\u92B7\u4EFB\u52D9</p>
                  <p class="text-sm mb-4">\u4F7F\u7528\u4E0A\u65B9\u300C\u5FEB\u901F\u555F\u52D5\u300D\u5275\u5EFA\u60A8\u7684\u7B2C\u4E00\u500B\u4EFB\u52D9</p>
                  <button (click)="activeTab.set('quick-start')"
                          class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400">
                    \u{1F680} \u958B\u59CB\u5275\u5EFA
                  </button>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (task of filteredTasks(); track task.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                             [class.bg-emerald-500/20]="task.status === 'running'"
                             [class.bg-purple-500/20]="task.status === 'completed'"
                             [class.bg-slate-700]="task.status === 'draft' || task.status === 'paused'">
                          {{ getGoalIcon(task.goalType) }}
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ task.name }}</div>
                          <div class="text-sm text-slate-400 flex items-center gap-2">
                            <span>{{ getGoalLabel(task.goalType) }}</span>
                            <span class="text-slate-600">\xB7</span>
                            <span>{{ task.stats.totalContacts }} \u76EE\u6A19</span>
                            <span class="text-slate-600">\xB7</span>
                            <span class="text-emerald-400">{{ task.stats.converted }} \u8F49\u5316</span>
                          </div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-4">
                        <!-- \u72C0\u614B\u6A19\u7C64 -->
                        <span class="px-3 py-1 rounded-full text-xs font-medium"
                              [class.bg-emerald-500/20]="task.status === 'running'"
                              [class.text-emerald-400]="task.status === 'running'"
                              [class.bg-purple-500/20]="task.status === 'completed'"
                              [class.text-purple-400]="task.status === 'completed'"
                              [class.bg-yellow-500/20]="task.status === 'paused'"
                              [class.text-yellow-400]="task.status === 'paused'"
                              [class.bg-slate-600]="task.status === 'draft'"
                              [class.text-slate-300]="task.status === 'draft'">
                          {{ getStatusLabel(task.status) }}
                        </span>
                        
                        <!-- \u64CD\u4F5C\u6309\u9215 -->
                        <div class="flex gap-2">
                          @if (task.status === 'running') {
                            <button (click)="pauseTask(task.id)"
                                    class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                              \u66AB\u505C
                            </button>
                          } @else if (task.status === 'paused' || task.status === 'draft') {
                            <button (click)="startTask(task.id)"
                                    class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                              \u555F\u52D5
                            </button>
                          }
                          <button (click)="viewTaskDetails(task)"
                                  class="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm">
                            \u8A73\u60C5
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
          
          @case ('monitor') {
            <!-- \u7D71\u4E00\u76E3\u63A7\u9762\u677F -->
            <div class="max-w-6xl mx-auto space-y-6">
              <!-- \u7E3D\u9AD4\u6307\u6A19 -->
              <div class="grid grid-cols-5 gap-4">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-purple-400">{{ overallStats().totalTasks }}</div>
                  <div class="text-sm text-slate-400">\u7E3D\u4EFB\u52D9\u6578</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-cyan-400">{{ overallStats().activeTasks }}</div>
                  <div class="text-sm text-slate-400">\u6D3B\u8E8D\u4EFB\u52D9</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-emerald-400">{{ overallStats().totalConverted }}</div>
                  <div class="text-sm text-slate-400">\u7E3D\u8F49\u5316</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-amber-400">{{ overallConversionRate() }}%</div>
                  <div class="text-sm text-slate-400">\u8F49\u5316\u7387</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-pink-400">{{ overallStats().totalMessagesSent }}</div>
                  <div class="text-sm text-slate-400">\u6D88\u606F\u767C\u9001</div>
                </div>
              </div>
              
              <!-- \u{1F195} \u512A\u5316 2-1: \u8F49\u5316\u6F0F\u6597 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <app-conversion-funnel
                  [targets]="funnelTargets()"
                  [contacted]="overallStats().totalContacted"
                  [replied]="funnelReplied()"
                  [converted]="overallStats().totalConverted"
                  [period]="'\u672C\u9031\u6578\u64DA'"
                  [showAnalysis]="true" />
              </div>
              
              <!-- \u8DA8\u52E2\u5716\u8868\u5340\u57DF -->
              <div class="grid grid-cols-2 gap-6">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>\u{1F4C8}</span> \u8F49\u5316\u8DA8\u52E2
                  </h3>
                  <div class="h-48 flex items-end justify-around gap-2">
                    @for (day of last7DaysData(); track day.label) {
                      <div class="flex flex-col items-center gap-2">
                        <div class="w-12 rounded-t transition-all"
                             [style.height.px]="day.converted * 15 + 20"
                             [class.bg-purple-500]="true"></div>
                        <span class="text-xs text-slate-400">{{ day.label }}</span>
                      </div>
                    }
                  </div>
                </div>
                
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>\u{1F3AF}</span> \u76EE\u6A19\u985E\u578B\u5206\u5E03
                  </h3>
                  <div class="space-y-3">
                    @for (goal of goalDistribution(); track goal.type) {
                      <div class="flex items-center gap-3">
                        <span class="text-xl">{{ goal.icon }}</span>
                        <div class="flex-1">
                          <div class="flex justify-between text-sm mb-1">
                            <span class="text-white">{{ goal.label }}</span>
                            <span class="text-slate-400">{{ goal.count }} \u4EFB\u52D9</span>
                          </div>
                          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-purple-500 rounded-full transition-all"
                                 [style.width.%]="goal.percentage"></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
              
              <!-- AI \u7CFB\u7D71\u72C0\u614B -->
              <div class="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>\u{1F9E0}</span> AI \u7CFB\u7D71\u72C0\u614B
                </h3>
                <div class="grid grid-cols-4 gap-4">
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ aiStats().conversations }}</div>
                    <div class="text-xs text-slate-400">\u4ECA\u65E5\u5C0D\u8A71</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-purple-400">{{ aiStats().intentsRecognized }}</div>
                    <div class="text-xs text-slate-400">\u610F\u5716\u8B58\u5225</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-emerald-400">{{ aiStats().avgResponseTime }}ms</div>
                    <div class="text-xs text-slate-400">\u5E73\u5747\u97FF\u61C9</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-amber-400">\xA5{{ aiStats().cost.toFixed(2) }}</div>
                    <div class="text-xs text-slate-400">\u4ECA\u65E5\u6210\u672C</div>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @case ('settings') {
            <!-- \u8A2D\u7F6E\u9801\u9762 -->
            <div class="max-w-3xl mx-auto space-y-6">
              <!-- AI \u5F15\u64CE\u8A2D\u7F6E -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>\u{1F916}</span> AI \u5F15\u64CE\u914D\u7F6E
                </h3>
                <button (click)="goToAICenter()"
                        class="w-full p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">\u6A21\u578B\u914D\u7F6E</div>
                    <div class="text-sm text-slate-400">\u914D\u7F6E AI \u6A21\u578B\u3001API Key \u7B49</div>
                  </div>
                  <span class="text-slate-400">\u2192</span>
                </button>
              </div>
              
              <!-- \u89D2\u8272\u5EAB\u5165\u53E3 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>\u{1F3AD}</span> \u89D2\u8272\u7BA1\u7406
                </h3>
                <button (click)="goToRoleLibrary()"
                        class="w-full p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">\u89D2\u8272\u5EAB\u8207\u5287\u672C</div>
                    <div class="text-sm text-slate-400">\u7BA1\u7406\u89D2\u8272\u5B9A\u7FA9\u3001\u5287\u672C\u6A21\u677F</div>
                  </div>
                  <span class="text-slate-400">\u2192</span>
                </button>
              </div>
              
              <!-- \u9ED8\u8A8D\u8A2D\u7F6E -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>\u2699\uFE0F</span> \u9ED8\u8A8D\u8A2D\u7F6E
                </h3>
                
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-sm text-slate-400 block mb-2">\u610F\u5411\u95BE\u503C</label>
                        <div class="flex items-center gap-2">
                          <input type="range" 
                                 [value]="intentThreshold()"
                                 (input)="updateIntentThreshold($any($event.target).valueAsNumber)"
                                 min="50" max="100" step="5"
                                 class="flex-1">
                          <span class="text-white w-12 text-right">{{ intentThreshold() }}%</span>
                        </div>
                      </div>
                      <div>
                        <label class="text-sm text-slate-400 block mb-2">\u6700\u5927\u540C\u6642\u4EFB\u52D9</label>
                        <input type="number"
                               [value]="maxConcurrentTasks()"
                               (input)="updateMaxConcurrentTasks($any($event.target).valueAsNumber)"
                               min="1" max="10"
                               class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                      </div>
                    </div>
                  
                  <button (click)="saveSettings()"
                          class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity">
                    \u{1F4BE} \u4FDD\u5B58\u8A2D\u7F6E
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- \u{1F195} \u512A\u5316 1-1: \u4EFB\u52D9\u5275\u5EFA\u5411\u5C0E -->
      @if (showWizard()) {
        <app-task-wizard 
          [initialGoal]="wizardInitialGoal()"
          (close)="closeWizard()"
          (taskCreated)="onTaskCreated($event)" />
      }
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SmartMarketingHubComponent, { className: "SmartMarketingHubComponent", filePath: "src/smart-marketing/smart-marketing-hub.component.ts", lineNumber: 509 });
})();

// src/views/smart-marketing-view.component.ts
var SmartMarketingViewComponent = class _SmartMarketingViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.membershipService = inject(MembershipService);
  }
  ngOnInit() {
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 導航
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  static {
    this.\u0275fac = function SmartMarketingViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartMarketingViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SmartMarketingViewComponent, selectors: [["app-smart-marketing-view"]], decls: 1, vars: 0, template: function SmartMarketingViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275element(0, "app-smart-marketing-hub");
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      SmartMarketingHubComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartMarketingViewComponent, [{
    type: Component,
    args: [{
      selector: "app-smart-marketing-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        SmartMarketingHubComponent
      ],
      template: `
    <app-smart-marketing-hub></app-smart-marketing-hub>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SmartMarketingViewComponent, { className: "SmartMarketingViewComponent", filePath: "src/views/smart-marketing-view.component.ts", lineNumber: 30 });
})();
export {
  SmartMarketingViewComponent
};
//# sourceMappingURL=chunk-EEVPBJYI.js.map
