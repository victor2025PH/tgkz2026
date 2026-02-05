import {
  AiChatService,
  DialogService
} from "./chunk-CTKGMQYJ.js";
import {
  AICenterService
} from "./chunk-S764FGAZ.js";
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
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-P26VRYR4.js";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMap,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-K4KD4A2Z.js";

// src/ai-center/ai-center.component.ts
var _c0 = () => ["short", "medium", "long"];
var _forTrack0 = ($index, $item) => $item.id;
var _forTrack1 = ($index, $item) => $item.phone;
var _forTrack2 = ($index, $item) => $item.name;
function AICenterComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 7);
    \u0275\u0275element(1, "span", 20);
    \u0275\u0275text(2, " AI \u5DF2\u9023\u63A5 ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 8);
    \u0275\u0275text(1, " \u672A\u914D\u7F6E AI ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_For_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 21);
    \u0275\u0275listener("click", function AICenterComponent_For_30_Template_button_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.activeTab.set(tab_r2.id));
    });
    \u0275\u0275elementStart(1, "span", 22);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-gradient-to-r", ctx_r2.activeTab() === tab_r2.id)("from-purple-500", ctx_r2.activeTab() === tab_r2.id)("to-pink-500", ctx_r2.activeTab() === tab_r2.id)("text-white", ctx_r2.activeTab() === tab_r2.id)("shadow-lg", ctx_r2.activeTab() === tab_r2.id)("text-slate-400", ctx_r2.activeTab() !== tab_r2.id)("hover:text-white", ctx_r2.activeTab() !== tab_r2.id)("hover:bg-slate-700/50", ctx_r2.activeTab() !== tab_r2.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tab_r2.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(tab_r2.label);
  }
}
function AICenterComponent_Case_32_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 29)(1, "div")(2, "label", 55);
    \u0275\u0275text(3, "\u804A\u5929\u6A21\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 56)(5, "button", 57);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Conditional_13_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setAutoChatMode("full"));
    });
    \u0275\u0275elementStart(6, "div", 58);
    \u0275\u0275text(7, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 59);
    \u0275\u0275text(9, "\u5168\u81EA\u52D5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 60);
    \u0275\u0275text(11, "AI \u81EA\u52D5\u767C\u9001\u56DE\u8986");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "button", 57);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Conditional_13_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setAutoChatMode("semi"));
    });
    \u0275\u0275elementStart(13, "div", 58);
    \u0275\u0275text(14, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 59);
    \u0275\u0275text(16, "\u534A\u81EA\u52D5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 60);
    \u0275\u0275text(18, "\u751F\u6210\u5EFA\u8B70\u5F8C\u78BA\u8A8D\u767C\u9001");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(19, "button", 57);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Conditional_13_Template_button_click_19_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setAutoChatMode("assist"));
    });
    \u0275\u0275elementStart(20, "div", 58);
    \u0275\u0275text(21, "\u{1F4A1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 59);
    \u0275\u0275text(23, "\u8F14\u52A9\u6A21\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 60);
    \u0275\u0275text(25, "\u50C5\u63D0\u4F9B\u5EFA\u8B70\u4E0D\u767C\u9001");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(26, "div", 61)(27, "div", 62)(28, "div", 49)(29, "span", 63);
    \u0275\u0275text(30, "\u{1F44B}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div")(32, "div", 59);
    \u0275\u0275text(33, "\u81EA\u52D5\u554F\u5019");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 60);
    \u0275\u0275text(35, "\u65B0 Lead \u81EA\u52D5\u767C\u9001\u554F\u5019");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(36, "input", 64);
    \u0275\u0275listener("change", function AICenterComponent_Case_32_Conditional_13_Template_input_change_36_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.toggleAutoGreeting());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "div", 62)(38, "div", 49)(39, "span", 63);
    \u0275\u0275text(40, "\u{1F4AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div")(42, "div", 59);
    \u0275\u0275text(43, "\u81EA\u52D5\u56DE\u8986");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(44, "div", 60);
    \u0275\u0275text(45, "\u7528\u6236\u79C1\u4FE1\u81EA\u52D5\u56DE\u8986");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(46, "input", 64);
    \u0275\u0275listener("change", function AICenterComponent_Case_32_Conditional_13_Template_input_change_46_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.toggleAutoReply());
    });
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275classProp("bg-emerald-500/20", ctx_r2.autoChatMode() === "full")("border-emerald-500", ctx_r2.autoChatMode() === "full")("bg-slate-700/50", ctx_r2.autoChatMode() !== "full")("border-slate-600", ctx_r2.autoChatMode() !== "full");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("bg-cyan-500/20", ctx_r2.autoChatMode() === "semi")("border-cyan-500", ctx_r2.autoChatMode() === "semi")("bg-slate-700/50", ctx_r2.autoChatMode() !== "semi")("border-slate-600", ctx_r2.autoChatMode() !== "semi");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("bg-amber-500/20", ctx_r2.autoChatMode() === "assist")("border-amber-500", ctx_r2.autoChatMode() === "assist")("bg-slate-700/50", ctx_r2.autoChatMode() !== "assist")("border-slate-600", ctx_r2.autoChatMode() !== "assist");
    \u0275\u0275advance(17);
    \u0275\u0275property("checked", ctx_r2.autoGreetingEnabled());
    \u0275\u0275advance(10);
    \u0275\u0275property("checked", ctx_r2.autoReplyEnabled());
  }
}
function AICenterComponent_Case_32_For_65_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 66);
  }
  if (rf & 2) {
    const account_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("src", account_r6.avatar, \u0275\u0275sanitizeUrl);
  }
}
function AICenterComponent_Case_32_For_65_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 67);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r6 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate((account_r6.username == null ? null : account_r6.username.charAt(0)) || "?");
  }
}
function AICenterComponent_Case_32_For_65_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 46)(1, "div", 49)(2, "div", 65);
    \u0275\u0275conditionalCreate(3, AICenterComponent_Case_32_For_65_Conditional_3_Template, 1, 1, "img", 66)(4, AICenterComponent_Case_32_For_65_Conditional_4_Template, 2, 1, "span", 67);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div")(6, "div", 59);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 60);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "span", 68);
    \u0275\u0275element(11, "span", 20);
    \u0275\u0275text(12, " \u5728\u7DDA ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const account_r6 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275conditional(account_r6.avatar ? 3 : 4);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(account_r6.username || account_r6.phone);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("\u4ECA\u65E5: ", account_r6.sentToday || 0, "/", account_r6.dailyLimit || 50, " \u689D");
  }
}
function AICenterComponent_Case_32_ForEmpty_66_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 47)(1, "div", 69);
    \u0275\u0275text(2, "\u{1F4E4}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "\u6C92\u6709\u53EF\u7528\u7684\u767C\u9001\u5E33\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 70);
    \u0275\u0275text(6, "\u8ACB\u5728\u5E33\u865F\u7BA1\u7406\u4E2D\u6DFB\u52A0\u4E26\u8A2D\u7F6E\u70BA\u300C\u767C\u9001\u300D\u89D2\u8272");
    \u0275\u0275elementEnd()();
  }
}
function AICenterComponent_Case_32_Conditional_79_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 51)(1, "div", 71);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 72)(4, "div", 59);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 44);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "span", 73);
    \u0275\u0275element(9, "span", 20);
    \u0275\u0275text(10, " \u5DF2\u9023\u63A5 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r2.getProviderIcon(ctx_r2.aiService.defaultModel().provider), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.aiService.defaultModel().modelName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getProviderName(ctx_r2.aiService.defaultModel().provider));
  }
}
function AICenterComponent_Case_32_Conditional_80_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 52)(1, "div", 49)(2, "span", 5);
    \u0275\u0275text(3, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div")(5, "div", 74);
    \u0275\u0275text(6, "\u672A\u914D\u7F6E AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 44);
    \u0275\u0275text(8, "\u8ACB\u5148\u6DFB\u52A0 AI \u6A21\u578B\u624D\u80FD\u4F7F\u7528\u81EA\u52D5\u804A\u5929\u529F\u80FD");
    \u0275\u0275elementEnd()()()();
  }
}
function AICenterComponent_Case_32_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 23)(2, "div", 2)(3, "div", 3)(4, "div", 24);
    \u0275\u0275text(5, " \u{1F916} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div")(7, "h3", 25);
    \u0275\u0275text(8, "AI \u81EA\u52D5\u804A\u5929");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p", 26);
    \u0275\u0275text(10, "\u958B\u555F\u5F8C\uFF0CAI \u5C07\u81EA\u52D5\u554F\u5019\u65B0 Lead \u4E26\u56DE\u8986\u79C1\u4FE1");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(11, "button", 27);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleAutoChat());
    });
    \u0275\u0275element(12, "span", 28);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(13, AICenterComponent_Case_32_Conditional_13_Template, 47, 26, "div", 29);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 30)(15, "div", 2)(16, "div", 3)(17, "div", 31);
    \u0275\u0275text(18, " \u{1F680} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div")(20, "h3", 32);
    \u0275\u0275text(21, " \u667A\u80FD\u71DF\u92B7\u4E2D\u5FC3 ");
    \u0275\u0275elementStart(22, "span", 33);
    \u0275\u0275text(23, "\u6574\u5408");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "p", 26);
    \u0275\u0275text(25, "\u4E00\u9375\u555F\u52D5\u71DF\u92B7\u4EFB\u52D9 - AI \u81EA\u52D5\u914D\u7F6E\u89D2\u8272\u548C\u7B56\u7565");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(26, "button", 34);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Template_button_click_26_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.goToSmartMarketing());
    });
    \u0275\u0275elementStart(27, "span");
    \u0275\u0275text(28, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(29, " \u524D\u5F80\u4F7F\u7528 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "div", 35)(31, "div", 36)(32, "div", 37)(33, "div", 38);
    \u0275\u0275text(34, "\u{1F4B0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "div", 39);
    \u0275\u0275text(36, "\u4FC3\u9032\u9996\u55AE");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "div", 37)(38, "div", 38);
    \u0275\u0275text(39, "\u{1F49D}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "div", 39);
    \u0275\u0275text(41, "\u633D\u56DE\u6D41\u5931");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(42, "div", 37)(43, "div", 38);
    \u0275\u0275text(44, "\u{1F389}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "div", 39);
    \u0275\u0275text(46, "\u793E\u7FA4\u6D3B\u8E8D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(47, "div", 37)(48, "div", 38);
    \u0275\u0275text(49, "\u{1F527}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "div", 39);
    \u0275\u0275text(51, "\u552E\u5F8C\u670D\u52D9");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(52, "p", 40);
    \u0275\u0275text(53, " \u{1F4A1} \u9078\u64C7\u76EE\u6A19 \u2192 AI \u81EA\u52D5\u914D\u7F6E \u2192 \u4E00\u9375\u555F\u52D5\uFF0C\u5DF2\u6574\u5408\u591A\u89D2\u8272\u5354\u4F5C\u548C AI \u81EA\u4E3B\u529F\u80FD ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(54, "div", 41)(55, "div", 42)(56, "span", 5);
    \u0275\u0275text(57, "\u{1F4E4}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "div")(59, "h3", 43);
    \u0275\u0275text(60, "\u767C\u9001\u5E33\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "p", 44);
    \u0275\u0275text(62, "\u9078\u64C7\u7528\u65BC\u767C\u9001\u6D88\u606F\u7684\u5E33\u865F");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(63, "div", 45);
    \u0275\u0275repeaterCreate(64, AICenterComponent_Case_32_For_65_Template, 13, 4, "div", 46, _forTrack1, false, AICenterComponent_Case_32_ForEmpty_66_Template, 7, 0, "div", 47);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(67, "div", 41)(68, "div", 48)(69, "div", 49)(70, "span", 5);
    \u0275\u0275text(71, "\u{1F9E0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(72, "div")(73, "h3", 43);
    \u0275\u0275text(74, "AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(75, "p", 44);
    \u0275\u0275text(76, "\u7576\u524D\u4F7F\u7528\u7684 AI \u6A21\u578B");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(77, "button", 50);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Template_button_click_77_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.activeTab.set("models"));
    });
    \u0275\u0275text(78, " \u914D\u7F6E\u6A21\u578B \u2192 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(79, AICenterComponent_Case_32_Conditional_79_Template, 11, 3, "div", 51)(80, AICenterComponent_Case_32_Conditional_80_Template, 9, 0, "div", 52);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(81, "div", 53)(82, "button", 54);
    \u0275\u0275listener("click", function AICenterComponent_Case_32_Template_button_click_82_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveQuickSettings());
    });
    \u0275\u0275text(83, " \u{1F4BE} \u4FDD\u5B58\u8A2D\u7F6E ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(11);
    \u0275\u0275classProp("bg-emerald-500", ctx_r2.autoChatEnabled())("bg-slate-600", !ctx_r2.autoChatEnabled());
    \u0275\u0275advance();
    \u0275\u0275classProp("translate-x-8", ctx_r2.autoChatEnabled());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.autoChatEnabled() ? 13 : -1);
    \u0275\u0275advance(51);
    \u0275\u0275repeater(ctx_r2.senderAccounts());
    \u0275\u0275advance(15);
    \u0275\u0275conditional(ctx_r2.aiService.defaultModel() ? 79 : 80);
  }
}
function AICenterComponent_Case_33_For_13_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 68);
    \u0275\u0275element(1, "span", 20);
    \u0275\u0275text(2, " \u5DF2\u9023\u63A5 ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_For_13_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 96);
    \u0275\u0275text(1, "\u672A\u6E2C\u8A66");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_For_13_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 100);
    \u0275\u0275text(1, " \u6E2C\u8A66\u4E2D... ");
  }
}
function AICenterComponent_Case_33_For_13_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u6E2C\u8A66 ");
  }
}
function AICenterComponent_Case_33_For_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 80)(1, "div", 3)(2, "div", 94)(3, "span", 5);
    \u0275\u0275text(4, "\u{1F999}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div")(6, "div", 59);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 95);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "div", 49);
    \u0275\u0275conditionalCreate(11, AICenterComponent_Case_33_For_13_Conditional_11_Template, 3, 0, "span", 68)(12, AICenterComponent_Case_33_For_13_Conditional_12_Template, 2, 0, "span", 96);
    \u0275\u0275elementStart(13, "button", 97);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_13_Template_button_click_13_listener() {
      const model_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.testModel(model_r10));
    });
    \u0275\u0275conditionalCreate(14, AICenterComponent_Case_33_For_13_Conditional_14_Template, 2, 0)(15, AICenterComponent_Case_33_For_13_Conditional_15_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 98);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_13_Template_button_click_16_listener() {
      const model_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setAsDefault(model_r10));
    });
    \u0275\u0275text(17);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "button", 99);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_13_Template_button_click_18_listener() {
      const model_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.deleteModel(model_r10));
    });
    \u0275\u0275text(19, " \u2715 ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_16_0;
    let tmp_17_0;
    const model_r10 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(model_r10.displayName || model_r10.modelName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(model_r10.apiEndpoint);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(model_r10.isConnected ? 11 : 12);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r2.aiService.testingModelIds().has(model_r10.id));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.aiService.testingModelIds().has(model_r10.id) ? 14 : 15);
    \u0275\u0275advance(2);
    \u0275\u0275classMap(((tmp_16_0 = ctx_r2.aiService.defaultModel()) == null ? null : tmp_16_0.id) === model_r10.id ? "bg-emerald-500 text-white" : "bg-slate-600 text-slate-300 hover:bg-slate-500");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ((tmp_17_0 = ctx_r2.aiService.defaultModel()) == null ? null : tmp_17_0.id) === model_r10.id ? "\u9ED8\u8A8D" : "\u8A2D\u70BA\u9ED8\u8A8D", " ");
  }
}
function AICenterComponent_Case_33_ForEmpty_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 81)(1, "p", 101);
    \u0275\u0275text(2, "\u4F7F\u7528\u672C\u5730 Ollama \u53EF\u514D\u8CBB\u7121\u9650\u8ABF\u7528 AI");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 102);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_ForEmpty_14_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.showAddLocalModel.set(true));
    });
    \u0275\u0275text(4, " \u{1F999} \u5FEB\u901F\u914D\u7F6E\u672C\u5730 AI ");
    \u0275\u0275elementEnd()();
  }
}
function AICenterComponent_Case_33_For_25_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 68);
    \u0275\u0275element(1, "span", 20);
    \u0275\u0275text(2, " \u5DF2\u9023\u63A5 ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_For_25_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 104);
    \u0275\u0275text(1, "\u672A\u9023\u63A5");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_For_25_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 100);
    \u0275\u0275text(1, " \u6E2C\u8A66\u4E2D... ");
  }
}
function AICenterComponent_Case_33_For_25_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u6E2C\u8A66 ");
  }
}
function AICenterComponent_Case_33_For_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 83)(1, "div", 3)(2, "div", 103)(3, "span", 5);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div")(6, "div", 59);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 44);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "div", 49);
    \u0275\u0275conditionalCreate(11, AICenterComponent_Case_33_For_25_Conditional_11_Template, 3, 0, "span", 68)(12, AICenterComponent_Case_33_For_25_Conditional_12_Template, 2, 0, "span", 104);
    \u0275\u0275elementStart(13, "button", 97);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_25_Template_button_click_13_listener() {
      const model_r13 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.testModel(model_r13));
    });
    \u0275\u0275conditionalCreate(14, AICenterComponent_Case_33_For_25_Conditional_14_Template, 2, 0)(15, AICenterComponent_Case_33_For_25_Conditional_15_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 98);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_25_Template_button_click_16_listener() {
      const model_r13 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.setAsDefault(model_r13));
    });
    \u0275\u0275text(17);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "button", 99);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_For_25_Template_button_click_18_listener() {
      const model_r13 = \u0275\u0275restoreView(_r12).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.deleteModel(model_r13));
    });
    \u0275\u0275text(19, " \u2715 ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_20_0;
    let tmp_21_0;
    const model_r13 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500/20", model_r13.provider === "openai")("bg-purple-500/20", model_r13.provider === "claude")("bg-blue-500/20", model_r13.provider === "gemini");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getProviderIcon(model_r13.provider));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(model_r13.displayName || model_r13.modelName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getProviderName(model_r13.provider));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(model_r13.isConnected ? 11 : 12);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r2.aiService.testingModelIds().has(model_r13.id));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.aiService.testingModelIds().has(model_r13.id) ? 14 : 15);
    \u0275\u0275advance(2);
    \u0275\u0275classMap(((tmp_20_0 = ctx_r2.aiService.defaultModel()) == null ? null : tmp_20_0.id) === model_r13.id ? "bg-purple-500 text-white" : "bg-slate-600 text-slate-300 hover:bg-slate-500");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ((tmp_21_0 = ctx_r2.aiService.defaultModel()) == null ? null : tmp_21_0.id) === model_r13.id ? "\u9ED8\u8A8D" : "\u8A2D\u70BA\u9ED8\u8A8D", " ");
  }
}
function AICenterComponent_Case_33_ForEmpty_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 81)(1, "p", 101);
    \u0275\u0275text(2, "\u6DFB\u52A0 OpenAI\u3001Claude \u6216 Gemini \u7B49\u96F2\u7AEF\u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 105);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_ForEmpty_26_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.showAddModel.set(true));
    });
    \u0275\u0275text(4, " + \u6DFB\u52A0\u96F2\u7AEF\u6A21\u578B ");
    \u0275\u0275elementEnd()();
  }
}
function AICenterComponent_Case_33_Conditional_27_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 107)(1, "span", 114);
    \u0275\u0275text(2, "\u27F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u4FDD\u5B58\u4E2D... ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_Conditional_27_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 107);
    \u0275\u0275text(1, " \u2713 \u5DF2\u4FDD\u5B58 ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_Conditional_27_For_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 112);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const model_r15 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275property("value", model_r15.id)("selected", model_r15.id === ctx_r2.aiService.modelUsage().intentRecognition);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", model_r15.displayName || model_r15.modelName, " ");
  }
}
function AICenterComponent_Case_33_Conditional_27_For_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 112);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const model_r16 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275property("value", model_r16.id)("selected", model_r16.id === ctx_r2.aiService.modelUsage().dailyChat);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", model_r16.displayName || model_r16.modelName, " ");
  }
}
function AICenterComponent_Case_33_Conditional_27_For_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 112);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const model_r17 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275property("value", model_r17.id)("selected", model_r17.id === ctx_r2.aiService.modelUsage().multiRoleScript);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", model_r17.displayName || model_r17.modelName, " ");
  }
}
function AICenterComponent_Case_33_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 84)(1, "div", 48)(2, "h4", 106);
    \u0275\u0275text(3, "\u6A21\u578B\u7528\u9014\u5206\u914D");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, AICenterComponent_Case_33_Conditional_27_Conditional_4_Template, 4, 0, "span", 107)(5, AICenterComponent_Case_33_Conditional_27_Conditional_5_Template, 2, 0, "span", 107);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 108)(7, "div")(8, "label", 109);
    \u0275\u0275text(9, "\u610F\u5716\u8B58\u5225");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "select", 110);
    \u0275\u0275listener("change", function AICenterComponent_Case_33_Conditional_27_Template_select_change_10_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onModelUsageChange("intentRecognition", $event));
    });
    \u0275\u0275elementStart(11, "option", 111);
    \u0275\u0275text(12, "\u9078\u64C7\u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(13, AICenterComponent_Case_33_Conditional_27_For_14_Template, 2, 3, "option", 112, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div")(16, "label", 109);
    \u0275\u0275text(17, "\u65E5\u5E38\u5C0D\u8A71");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "select", 110);
    \u0275\u0275listener("change", function AICenterComponent_Case_33_Conditional_27_Template_select_change_18_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onModelUsageChange("dailyChat", $event));
    });
    \u0275\u0275elementStart(19, "option", 111);
    \u0275\u0275text(20, "\u9078\u64C7\u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(21, AICenterComponent_Case_33_Conditional_27_For_22_Template, 2, 3, "option", 112, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div")(24, "label", 109);
    \u0275\u0275text(25, "\u591A\u89D2\u8272\u5287\u672C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "select", 110);
    \u0275\u0275listener("change", function AICenterComponent_Case_33_Conditional_27_Template_select_change_26_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.onModelUsageChange("multiRoleScript", $event));
    });
    \u0275\u0275elementStart(27, "option", 111);
    \u0275\u0275text(28, "\u9078\u64C7\u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(29, AICenterComponent_Case_33_Conditional_27_For_30_Template, 2, 3, "option", 112, _forTrack0);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(31, "p", 113);
    \u0275\u0275text(32, "\u{1F4A1} \u9078\u64C7\u5F8C\u81EA\u52D5\u4FDD\u5B58\uFF0C\u4E0D\u540C\u7528\u9014\u53EF\u4EE5\u4F7F\u7528\u4E0D\u540C\u7684 AI \u6A21\u578B");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r2.isSavingUsage() ? 4 : ctx_r2.usageSaved() ? 5 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275property("value", ctx_r2.aiService.modelUsage().intentRecognition);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r2.aiService.models());
    \u0275\u0275advance(5);
    \u0275\u0275property("value", ctx_r2.aiService.modelUsage().dailyChat);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r2.aiService.models());
    \u0275\u0275advance(5);
    \u0275\u0275property("value", ctx_r2.aiService.modelUsage().multiRoleScript);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r2.aiService.models());
  }
}
function AICenterComponent_Case_33_Conditional_43_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 121);
    \u0275\u0275text(1, " \u6E2C\u8A66\u4E2D... ");
  }
}
function AICenterComponent_Case_33_Conditional_43_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F517} \u6E2C\u8A66\u9023\u63A5 ");
  }
}
function AICenterComponent_Case_33_Conditional_43_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 122);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_Conditional_43_Conditional_11_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r2 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r2.testTtsVoice());
    });
    \u0275\u0275text(1, " \u{1F50A} \u8A66\u807D\u8A9E\u97F3 ");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_33_Conditional_43_Conditional_12_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 123);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\xB7 \u5EF6\u9072: ", ctx_r2.ttsLatency(), "ms");
  }
}
function AICenterComponent_Case_33_Conditional_43_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 120);
    \u0275\u0275element(1, "span", 20);
    \u0275\u0275text(2, " TTS \u670D\u52D9\u5DF2\u9023\u63A5 ");
    \u0275\u0275conditionalCreate(3, AICenterComponent_Case_33_Conditional_43_Conditional_12_Conditional_3_Template, 2, 1, "span", 123);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.ttsLatency() > 0 ? 3 : -1);
  }
}
function AICenterComponent_Case_33_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 92)(1, "div")(2, "label", 55);
    \u0275\u0275text(3, "TTS \u670D\u52D9\u7AEF\u9EDE");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 115);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Case_33_Conditional_43_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r2 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r2.ttsEndpoint, $event) || (ctx_r2.ttsEndpoint = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 116);
    \u0275\u0275text(6, "\u652F\u6301 GPT-SoVITS\u3001VITS \u7B49\u672C\u5730\u8A9E\u97F3\u670D\u52D9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 117)(8, "button", 118);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_Conditional_43_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r18);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.testTtsConnection());
    });
    \u0275\u0275conditionalCreate(9, AICenterComponent_Case_33_Conditional_43_Conditional_9_Template, 2, 0)(10, AICenterComponent_Case_33_Conditional_43_Conditional_10_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(11, AICenterComponent_Case_33_Conditional_43_Conditional_11_Template, 2, 0, "button", 119);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(12, AICenterComponent_Case_33_Conditional_43_Conditional_12_Template, 4, 1, "div", 120);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.ttsEndpoint);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", ctx_r2.isTestingTts());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isTestingTts() ? 9 : 10);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r2.ttsConnected() ? 11 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.ttsConnected() ? 12 : -1);
  }
}
function AICenterComponent_Case_33_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 93)(1, "p", 124);
    \u0275\u0275text(2, "\u958B\u555F\u5F8C\u53EF\u914D\u7F6E GPT-SoVITS \u7B49\u8A9E\u97F3\u670D\u52D9\uFF0C\u8B93 AI \u64C1\u6709\u8A9E\u97F3\u80FD\u529B");
    \u0275\u0275elementEnd()();
  }
}
function AICenterComponent_Case_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 75)(2, "div", 48)(3, "h3", 76)(4, "span");
    \u0275\u0275text(5, "\u{1F999}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(6, " \u672C\u5730 AI ");
    \u0275\u0275elementStart(7, "span", 77);
    \u0275\u0275text(8, "\u63A8\u85A6 - \u514D\u8CBB\u7121\u9650");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "button", 78);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showAddLocalModel.set(true));
    });
    \u0275\u0275text(10, " + \u6DFB\u52A0\u672C\u5730 AI ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 79);
    \u0275\u0275repeaterCreate(12, AICenterComponent_Case_33_For_13_Template, 20, 8, "div", 80, _forTrack0, false, AICenterComponent_Case_33_ForEmpty_14_Template, 5, 0, "div", 81);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 41)(16, "div", 48)(17, "h3", 76)(18, "span");
    \u0275\u0275text(19, "\u2601\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(20, " \u96F2\u7AEF AI ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 82);
    \u0275\u0275listener("click", function AICenterComponent_Case_33_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showAddModel.set(true));
    });
    \u0275\u0275text(22, " + \u6DFB\u52A0\u96F2\u7AEF\u6A21\u578B ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 79);
    \u0275\u0275repeaterCreate(24, AICenterComponent_Case_33_For_25_Template, 20, 15, "div", 83, _forTrack0, false, AICenterComponent_Case_33_ForEmpty_26_Template, 5, 0, "div", 81);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(27, AICenterComponent_Case_33_Conditional_27_Template, 33, 4, "div", 84);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 85)(29, "div", 48)(30, "h3", 76)(31, "span");
    \u0275\u0275text(32, "\u{1F50A}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(33, " \u8A9E\u97F3\u8F38\u51FA (TTS) ");
    \u0275\u0275elementStart(34, "span", 86);
    \u0275\u0275text(35, "\u53EF\u9078");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(36, "label", 87)(37, "input", 88);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Case_33_Template_input_ngModelChange_37_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.ttsEnabled, $event) || (ctx_r2.ttsEnabled = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("change", function AICenterComponent_Case_33_Template_input_change_37_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveTtsSettings());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(38, "div", 89);
    \u0275\u0275elementStart(39, "span", 90);
    \u0275\u0275text(40);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(41, "p", 91);
    \u0275\u0275text(42, "\u555F\u7528\u5F8C\uFF0CAI \u56DE\u8986\u5C07\u81EA\u52D5\u8F49\u63DB\u70BA\u8A9E\u97F3\u64AD\u653E");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(43, AICenterComponent_Case_33_Conditional_43_Template, 13, 5, "div", 92)(44, AICenterComponent_Case_33_Conditional_44_Template, 3, 0, "div", 93);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(12);
    \u0275\u0275repeater(ctx_r2.localModels());
    \u0275\u0275advance(12);
    \u0275\u0275repeater(ctx_r2.cloudModels());
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.aiService.models().length > 0 ? 27 : -1);
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.ttsEnabled);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r2.ttsEnabled ? "\u5DF2\u555F\u7528" : "\u5DF2\u95DC\u9589");
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r2.ttsEnabled ? 43 : 44);
  }
}
function AICenterComponent_Case_34_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 155);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_For_11_Template_button_click_0_listener() {
      const template_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.selectPersonaTemplate(template_r22.id));
    });
    \u0275\u0275elementStart(1, "div", 69);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 156);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 157);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const template_r22 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r2.selectedPersonaTemplate() === template_r22.id)("bg-purple-500/10", ctx_r2.selectedPersonaTemplate() === template_r22.id)("border-transparent", ctx_r2.selectedPersonaTemplate() !== template_r22.id)("bg-slate-700/50", ctx_r2.selectedPersonaTemplate() !== template_r22.id)("hover:bg-slate-700", ctx_r2.selectedPersonaTemplate() !== template_r22.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(template_r22.icon);
    \u0275\u0275advance();
    \u0275\u0275classProp("text-purple-400", ctx_r2.selectedPersonaTemplate() === template_r22.id)("text-white", ctx_r2.selectedPersonaTemplate() !== template_r22.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", template_r22.name, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(template_r22.description);
  }
}
function AICenterComponent_Case_34_For_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 158);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_For_21_Template_button_click_0_listener() {
      const style_r24 = \u0275\u0275restoreView(_r23).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      ctx_r2.setStyle(style_r24.id);
      return \u0275\u0275resetView(ctx_r2.markStrategyDirty());
    });
    \u0275\u0275elementStart(1, "div", 58);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 159);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const style_r24 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r2.currentStyle() === style_r24.id)("bg-purple-500/10", ctx_r2.currentStyle() === style_r24.id)("border-transparent", ctx_r2.currentStyle() !== style_r24.id)("bg-slate-700/50", ctx_r2.currentStyle() !== style_r24.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(style_r24.icon);
    \u0275\u0275advance();
    \u0275\u0275classProp("text-purple-400", ctx_r2.currentStyle() === style_r24.id)("text-white", ctx_r2.currentStyle() !== style_r24.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", style_r24.label, " ");
  }
}
function AICenterComponent_Case_34_For_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 160);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_For_27_Template_button_click_0_listener() {
      const len_r26 = \u0275\u0275restoreView(_r25).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      ctx_r2.setResponseLength(len_r26);
      return \u0275\u0275resetView(ctx_r2.markStrategyDirty());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const len_r26 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-purple-500", ctx_r2.responseLength() === len_r26)("text-white", ctx_r2.responseLength() === len_r26)("bg-slate-700", ctx_r2.responseLength() !== len_r26)("text-slate-300", ctx_r2.responseLength() !== len_r26);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", len_r26 === "short" ? "\u7C21\u77ED" : len_r26 === "medium" ? "\u9069\u4E2D" : "\u8A73\u7D30", " ");
  }
}
function AICenterComponent_Case_34_For_52_Template(rf, ctx) {
  if (rf & 1) {
    const _r27 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 141)(1, "div", 49)(2, "span", 63);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div")(5, "div", 150);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 60);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "input", 161);
    \u0275\u0275listener("change", function AICenterComponent_Case_34_For_52_Template_input_change_9_listener() {
      const rule_r28 = \u0275\u0275restoreView(_r27).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.toggleRule(rule_r28.id));
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const rule_r28 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(rule_r28.icon);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(rule_r28.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(rule_r28.description);
    \u0275\u0275advance();
    \u0275\u0275property("checked", rule_r28.isActive);
  }
}
function AICenterComponent_Case_34_Conditional_75_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F4A1} \u4FEE\u6539\u5F8C\u8ACB\u8A18\u5F97\u4FDD\u5B58 ");
  }
}
function AICenterComponent_Case_34_Conditional_76_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2713 \u6240\u6709\u66F4\u6539\u5DF2\u4FDD\u5B58 ");
  }
}
function AICenterComponent_Case_34_Conditional_81_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 114);
    \u0275\u0275text(1, "\u27F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u4FDD\u5B58\u4E2D... ");
  }
}
function AICenterComponent_Case_34_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F4BE} \u4FDD\u5B58\u4EBA\u683C\u8A2D\u5B9A ");
  }
}
function AICenterComponent_Case_34_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 41)(2, "div", 125)(3, "h3", 76)(4, "span");
    \u0275\u0275text(5, "\u{1F3AD}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(6, " \u9078\u64C7 AI \u4EBA\u683C ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 126);
    \u0275\u0275text(8, " + \u81EA\u5B9A\u7FA9\u4EBA\u683C ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 127);
    \u0275\u0275repeaterCreate(10, AICenterComponent_Case_34_For_11_Template, 7, 17, "button", 128, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 41)(13, "h3", 129)(14, "span");
    \u0275\u0275text(15, "\u{1F4AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(16, " \u5C0D\u8A71\u98A8\u683C ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 130)(18, "div", 92)(19, "div", 131);
    \u0275\u0275repeaterCreate(20, AICenterComponent_Case_34_For_21_Template, 5, 14, "button", 132, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div")(23, "label", 55);
    \u0275\u0275text(24, "\u56DE\u8986\u9577\u5EA6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 133);
    \u0275\u0275repeaterCreate(26, AICenterComponent_Case_34_For_27_Template, 2, 9, "button", 134, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "label", 135);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_Template_label_click_28_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r2 = \u0275\u0275nextContext();
      ctx_r2.toggleEmoji();
      return \u0275\u0275resetView(ctx_r2.markStrategyDirty());
    });
    \u0275\u0275elementStart(29, "div")(30, "div", 136);
    \u0275\u0275text(31, "\u4F7F\u7528 Emoji \u8868\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 60);
    \u0275\u0275text(33, "\u5728\u56DE\u8986\u4E2D\u6DFB\u52A0\u8868\u60C5");
    \u0275\u0275elementEnd()();
    \u0275\u0275element(34, "input", 137);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(35, "div")(36, "label", 55);
    \u0275\u0275text(37, "\u81EA\u5B9A\u7FA9\u4EBA\u8A2D\u63D0\u793A\u8A5E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "textarea", 138);
    \u0275\u0275listener("input", function AICenterComponent_Case_34_Template_textarea_input_38_listener($event) {
      \u0275\u0275restoreView(_r20);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.onPersonaInput($event));
    });
    \u0275\u0275text(39, "                    ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(40, "p", 139);
    \u0275\u0275text(41, "\u{1F4A1} \u63D0\u793A\uFF1A\u9078\u64C7\u4EBA\u683C\u6A21\u677F\u6703\u81EA\u52D5\u586B\u5145\u6B64\u9805");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(42, "div", 41)(43, "div", 125)(44, "h3", 76)(45, "span");
    \u0275\u0275text(46, "\u26A1");
    \u0275\u0275elementEnd();
    \u0275\u0275text(47, " \u667A\u80FD\u884C\u70BA ");
    \u0275\u0275elementStart(48, "span", 140);
    \u0275\u0275text(49, "\u6839\u64DA\u60C5\u6CC1\u81EA\u52D5\u89F8\u767C\u76F8\u61C9\u52D5\u4F5C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(50, "div", 79);
    \u0275\u0275repeaterCreate(51, AICenterComponent_Case_34_For_52_Template, 10, 4, "label", 141, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "button", 142);
    \u0275\u0275text(54, " + \u6DFB\u52A0\u81EA\u5B9A\u7FA9\u884C\u70BA\u898F\u5247 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(55, "div", 143)(56, "h3", 144)(57, "span");
    \u0275\u0275text(58, "\u{1F4AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(59, " AI \u56DE\u8986\u9810\u89BD ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(60, "div", 145)(61, "div", 146)(62, "span", 12);
    \u0275\u0275text(63, "\u7528\u6236:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(64, "p", 147);
    \u0275\u0275text(65, "\u4F60\u5011\u7684\u670D\u52D9\u591A\u5C11\u9322\uFF1F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(66, "div", 148)(67, "span", 149);
    \u0275\u0275text(68);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(69, "p", 150);
    \u0275\u0275text(70);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(71, "button", 151);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_Template_button_click_71_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.regeneratePreview());
    });
    \u0275\u0275text(72, " \u{1F504} \u91CD\u65B0\u751F\u6210\u9810\u89BD ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(73, "div", 152)(74, "div", 44);
    \u0275\u0275conditionalCreate(75, AICenterComponent_Case_34_Conditional_75_Template, 1, 0)(76, AICenterComponent_Case_34_Conditional_76_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(77, "div", 117)(78, "button", 153);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_Template_button_click_78_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.resetStrategy());
    });
    \u0275\u0275text(79, " \u91CD\u7F6E ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(80, "button", 154);
    \u0275\u0275listener("click", function AICenterComponent_Case_34_Template_button_click_80_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.savePersonaSettings());
    });
    \u0275\u0275conditionalCreate(81, AICenterComponent_Case_34_Conditional_81_Template, 3, 0)(82, AICenterComponent_Case_34_Conditional_82_Template, 1, 0);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275repeater(ctx_r2.personaTemplates);
    \u0275\u0275advance(10);
    \u0275\u0275repeater(ctx_r2.conversationStyles);
    \u0275\u0275advance(6);
    \u0275\u0275repeater(\u0275\u0275pureFunction0(7, _c0));
    \u0275\u0275advance(8);
    \u0275\u0275property("checked", ctx_r2.useEmoji());
    \u0275\u0275advance(4);
    \u0275\u0275property("value", ctx_r2.customPersona());
    \u0275\u0275advance(13);
    \u0275\u0275repeater(ctx_r2.defaultRules);
    \u0275\u0275advance(17);
    \u0275\u0275textInterpolate1("AI (", ctx_r2.getPersonaName(), "):");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.getPreviewResponse());
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r2.strategyDirty() ? 75 : 76);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", !ctx_r2.strategyDirty() || ctx_r2.isSavingStrategy());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isSavingStrategy() ? 81 : 82);
  }
}
function AICenterComponent_Case_35_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 172);
    \u0275\u0275text(1, "\u904B\u884C\u4E2D");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_35_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 173);
    \u0275\u0275text(1, "\u5DF2\u95DC\u9589");
    \u0275\u0275elementEnd();
  }
}
function AICenterComponent_Case_35_Template(rf, ctx) {
  if (rf & 1) {
    const _r29 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 127)(2, "div", 162)(3, "div", 163);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 44);
    \u0275\u0275text(6, "\u4ECA\u65E5\u5C0D\u8A71");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 162)(8, "div", 164);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 44);
    \u0275\u0275text(11, "\u610F\u5716\u8B58\u5225");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 162)(13, "div", 165);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 44);
    \u0275\u0275text(16, "\u8F49\u5316");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 162)(18, "div", 166);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "div", 44);
    \u0275\u0275text(21, "\u6210\u672C");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(22, "div", 41)(23, "h3", 167);
    \u0275\u0275text(24, "\u672C\u9031\u6982\u89BD");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "div", 130)(26, "div")(27, "div", 168);
    \u0275\u0275text(28);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "div", 169);
    \u0275\u0275text(30, "\u7E3D\u5C0D\u8A71");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(31, "div")(32, "div", 170);
    \u0275\u0275text(33);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 169);
    \u0275\u0275text(35, "\u8F49\u5316\u7387");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(36, "div", 171)(37, "div", 48)(38, "div", 49)(39, "span", 5);
    \u0275\u0275text(40, "\u{1F9E0}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "h3", 43);
    \u0275\u0275text(42, "AI \u667A\u80FD\u7CFB\u7D71\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(43, AICenterComponent_Case_35_Conditional_43_Template, 2, 0, "span", 172)(44, AICenterComponent_Case_35_Conditional_44_Template, 2, 0, "span", 173);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "button", 174);
    \u0275\u0275listener("click", function AICenterComponent_Case_35_Template_button_click_45_listener() {
      \u0275\u0275restoreView(_r29);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.goToSmartMarketing());
    });
    \u0275\u0275elementStart(46, "span");
    \u0275\u0275text(47, "\u{1F4CA}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(48, " \u67E5\u770B\u8A73\u7D30\u7D71\u8A08 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(49, "div", 108)(50, "div", 175)(51, "div", 176)(52, "span", 22);
    \u0275\u0275text(53, "\u{1F4AD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(54, "span", 106);
    \u0275\u0275text(55, "\u5C0D\u8A71\u8A18\u61B6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(56, "div", 177);
    \u0275\u0275text(57);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "div", 60);
    \u0275\u0275text(59, "\u689D\u8A18\u61B6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "div", 175)(61, "div", 176)(62, "span", 22);
    \u0275\u0275text(63, "\u{1F3F7}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(64, "span", 106);
    \u0275\u0275text(65, "\u5BA2\u6236\u6A19\u7C64");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(66, "div", 178);
    \u0275\u0275text(67);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(68, "div", 60);
    \u0275\u0275text(69, "\u500B\u6A19\u7C64");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(70, "div", 175)(71, "div", 176)(72, "span", 22);
    \u0275\u0275text(73, "\u{1F60A}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(74, "span", 106);
    \u0275\u0275text(75, "\u60C5\u7DD2\u5206\u6790");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(76, "div", 179);
    \u0275\u0275text(77);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(78, "div", 60);
    \u0275\u0275text(79, "\u6B21\u5206\u6790");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(80, "div", 175)(81, "div", 176)(82, "span", 22);
    \u0275\u0275text(83, "\u{1F504}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(84, "span", 106);
    \u0275\u0275text(85, "\u81EA\u52D5\u5316\u6D41\u7A0B");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(86, "div", 180);
    \u0275\u0275text(87);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(88, "div", 60);
    \u0275\u0275text(89, "\u6B21\u57F7\u884C");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(90, "div", 175)(91, "div", 176)(92, "span", 22);
    \u0275\u0275text(93, "\u23F0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(94, "span", 106);
    \u0275\u0275text(95, "\u5F85\u8DDF\u9032");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(96, "div", 181);
    \u0275\u0275text(97);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(98, "div", 60);
    \u0275\u0275text(99, "\u500B\u4EFB\u52D9");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(100, "div", 175)(101, "div", 176)(102, "span", 22);
    \u0275\u0275text(103, "\u{1F4DA}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(104, "span", 106);
    \u0275\u0275text(105, "\u77E5\u8B58\u5EAB");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(106, "div", 182);
    \u0275\u0275text(107);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(108, "div", 60);
    \u0275\u0275text(109, "\u689D\u5B78\u7FD2");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(110, "div", 183)(111, "button", 184);
    \u0275\u0275listener("click", function AICenterComponent_Case_35_Template_button_click_111_listener() {
      \u0275\u0275restoreView(_r29);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.refreshSmartSystemStats());
    });
    \u0275\u0275text(112, " \u{1F504} \u5237\u65B0\u7D71\u8A08 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.aiService.stats().today.conversations);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.aiService.stats().today.intentsRecognized);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.aiService.stats().today.conversions);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("\xA5", ctx_r2.aiService.stats().today.cost.toFixed(2));
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1(" ", ctx_r2.aiService.stats().weekly.conversations, " ");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", (ctx_r2.aiService.stats().weekly.conversionRate * 100).toFixed(1), "% ");
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r2.autonomousModeEnabled() ? 43 : 44);
    \u0275\u0275advance(14);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().memories);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().tags);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().emotions);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().workflows);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().followups);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.smartSystemStats().knowledge);
  }
}
function AICenterComponent_Conditional_36_For_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r31 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 196);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_36_For_10_Template_button_click_0_listener() {
      const provider_r32 = \u0275\u0275restoreView(_r31).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.newModelProvider.set(provider_r32.id));
    });
    \u0275\u0275elementStart(1, "div", 58);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 197);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const provider_r32 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-purple-500", ctx_r2.newModelProvider() === provider_r32.id)("bg-purple-500/10", ctx_r2.newModelProvider() === provider_r32.id)("border-transparent", ctx_r2.newModelProvider() !== provider_r32.id)("bg-slate-700", ctx_r2.newModelProvider() !== provider_r32.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(provider_r32.icon);
    \u0275\u0275advance();
    \u0275\u0275classProp("text-purple-400", ctx_r2.newModelProvider() === provider_r32.id)("text-slate-300", ctx_r2.newModelProvider() !== provider_r32.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", provider_r32.name, " ");
  }
}
function AICenterComponent_Conditional_36_For_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 190);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const model_r33 = ctx.$implicit;
    \u0275\u0275property("value", model_r33.name);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(model_r33.displayName);
  }
}
function AICenterComponent_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    const _r30 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 19)(1, "div", 185)(2, "h3", 186);
    \u0275\u0275text(3, "\u6DFB\u52A0\u96F2\u7AEF AI \u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 92)(5, "div")(6, "label", 55);
    \u0275\u0275text(7, "\u9078\u64C7\u4F9B\u61C9\u5546");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 187);
    \u0275\u0275repeaterCreate(9, AICenterComponent_Conditional_36_For_10_Template, 5, 14, "button", 188, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div")(12, "label", 55);
    \u0275\u0275text(13, "\u9078\u64C7\u6A21\u578B *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "select", 189);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_36_Template_select_ngModelChange_14_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.newModelName, $event) || (ctx_r2.newModelName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(15, "option", 111);
    \u0275\u0275text(16, "\u8ACB\u9078\u64C7\u6A21\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(17, AICenterComponent_Conditional_36_For_18_Template, 2, 2, "option", 190, _forTrack2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "p", 116);
    \u0275\u0275text(20, "\u{1F4A1} \u6A21\u578B\u540D\u7A31\u5C07\u81EA\u52D5\u683C\u5F0F\u5316\uFF0C\u7121\u9700\u64D4\u5FC3\u5927\u5C0F\u5BEB");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div")(22, "label", 55);
    \u0275\u0275text(23, "API Key *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "input", 191);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_36_Template_input_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.newModelApiKey, $event) || (ctx_r2.newModelApiKey = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(25, "div")(26, "label", 55);
    \u0275\u0275text(27, "\u986F\u793A\u540D\u7A31 (\u53EF\u9078)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "input", 192);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_36_Template_input_ngModelChange_28_listener($event) {
      \u0275\u0275restoreView(_r30);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.newModelDisplayName, $event) || (ctx_r2.newModelDisplayName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(29, "div", 193)(30, "button", 194);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_36_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r30);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showAddModel.set(false));
    });
    \u0275\u0275text(31, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "button", 195);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_36_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r30);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveNewModel());
    });
    \u0275\u0275text(33, " \u6DFB\u52A0 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275repeater(ctx_r2.providers);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.newModelName);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r2.currentPresetModels());
    \u0275\u0275advance(7);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.newModelApiKey);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.newModelDisplayName);
  }
}
function AICenterComponent_Conditional_37_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 114);
    \u0275\u0275text(1, "\u27F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u6B63\u5728\u6E2C\u8A66\u9023\u63A5... ");
  }
}
function AICenterComponent_Conditional_37_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F517} \u6E2C\u8A66\u9023\u63A5 ");
  }
}
function AICenterComponent_Conditional_37_Template(rf, ctx) {
  if (rf & 1) {
    const _r34 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 19)(1, "div", 198)(2, "h3", 199);
    \u0275\u0275text(3, " \u{1F999} \u6DFB\u52A0\u672C\u5730 AI ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 200);
    \u0275\u0275text(5, "\u914D\u7F6E Ollama \u6216\u5176\u4ED6\u672C\u5730 AI \u670D\u52D9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 92)(7, "div")(8, "label", 55);
    \u0275\u0275text(9, "API \u7AEF\u9EDE *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "input", 201);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_37_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.localModelEndpoint, $event) || (ctx_r2.localModelEndpoint = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "p", 116);
    \u0275\u0275text(12, " \u{1F4A1} \u4F7F\u7528 Tailscale Funnel \u53EF\u5BE6\u73FE\u9060\u7A0B\u8A2A\u554F\u672C\u5730 Ollama ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div")(14, "label", 55);
    \u0275\u0275text(15, "\u6A21\u578B\u540D\u7A31 *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "input", 202);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_37_Template_input_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.localModelName, $event) || (ctx_r2.localModelName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "p", 116);
    \u0275\u0275text(18, " \u5728 Ollama \u4E2D\u904B\u884C ");
    \u0275\u0275elementStart(19, "code", 203);
    \u0275\u0275text(20, "ollama list");
    \u0275\u0275elementEnd();
    \u0275\u0275text(21, " \u67E5\u770B\u53EF\u7528\u6A21\u578B ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "div")(23, "label", 55);
    \u0275\u0275text(24, "\u986F\u793A\u540D\u7A31 (\u53EF\u9078)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "input", 204);
    \u0275\u0275twoWayListener("ngModelChange", function AICenterComponent_Conditional_37_Template_input_ngModelChange_25_listener($event) {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.localModelDisplayName, $event) || (ctx_r2.localModelDisplayName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "button", 205);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_37_Template_button_click_26_listener() {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.testLocalConnection());
    });
    \u0275\u0275conditionalCreate(27, AICenterComponent_Conditional_37_Conditional_27_Template, 3, 0)(28, AICenterComponent_Conditional_37_Conditional_28_Template, 1, 0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 193)(30, "button", 194);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_37_Template_button_click_30_listener() {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.showAddLocalModel.set(false));
    });
    \u0275\u0275text(31, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "button", 206);
    \u0275\u0275listener("click", function AICenterComponent_Conditional_37_Template_button_click_32_listener() {
      \u0275\u0275restoreView(_r34);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveLocalModel());
    });
    \u0275\u0275text(33, " \u4FDD\u5B58 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.localModelEndpoint);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.localModelName);
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.localModelDisplayName);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r2.isTestingLocal());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.isTestingLocal() ? 27 : 28);
  }
}
var AICenterComponent = class _AICenterComponent {
  constructor() {
    this.aiService = inject(AICenterService);
    this.dialogService = inject(DialogService);
    this.toastService = inject(ToastService);
    this.ipcService = inject(ElectronIpcService);
    this.activeTab = signal("models", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.showAddModel = signal(false, ...ngDevMode ? [{ debugName: "showAddModel" }] : []);
    this.autoChatEnabled = signal(false, ...ngDevMode ? [{ debugName: "autoChatEnabled" }] : []);
    this.autoChatMode = signal("full", ...ngDevMode ? [{ debugName: "autoChatMode" }] : []);
    this.autoGreetingEnabled = signal(true, ...ngDevMode ? [{ debugName: "autoGreetingEnabled" }] : []);
    this.autoReplyEnabled = signal(true, ...ngDevMode ? [{ debugName: "autoReplyEnabled" }] : []);
    this.senderAccounts = signal([], ...ngDevMode ? [{ debugName: "senderAccounts" }] : []);
    this.autonomousModeEnabled = signal(false, ...ngDevMode ? [{ debugName: "autonomousModeEnabled" }] : []);
    this.smartSystemStats = signal({
      memories: 0,
      tags: 0,
      emotions: 0,
      workflows: 0,
      followups: 0,
      knowledge: 0
    }, ...ngDevMode ? [{ debugName: "smartSystemStats" }] : []);
    this.newModelProvider = signal("openai", ...ngDevMode ? [{ debugName: "newModelProvider" }] : []);
    this.newModelName = "";
    this.newModelApiKey = "";
    this.newModelEndpoint = "";
    this.newModelDisplayName = "";
    this.showAddLocalModel = signal(false, ...ngDevMode ? [{ debugName: "showAddLocalModel" }] : []);
    this.localModelEndpoint = "https://ms-defysomwqybz.tail05a567.ts.net/api/chat";
    this.localModelName = "huihui_ai/qwen2.5-abliterate";
    this.localModelDisplayName = "\u6211\u7684\u672C\u5730 AI";
    this.isTestingLocal = signal(false, ...ngDevMode ? [{ debugName: "isTestingLocal" }] : []);
    this.ttsEnabled = false;
    this.ttsEndpoint = "http://localhost:9881";
    this.ttsConnected = signal(false, ...ngDevMode ? [{ debugName: "ttsConnected" }] : []);
    this.isTestingTts = signal(false, ...ngDevMode ? [{ debugName: "isTestingTts" }] : []);
    this.ttsLatency = signal(0, ...ngDevMode ? [{ debugName: "ttsLatency" }] : []);
    this.isSavingUsage = signal(false, ...ngDevMode ? [{ debugName: "isSavingUsage" }] : []);
    this.usageSaved = signal(false, ...ngDevMode ? [{ debugName: "usageSaved" }] : []);
    this.usageSaveTimeout = null;
    this.strategyDirty = signal(false, ...ngDevMode ? [{ debugName: "strategyDirty" }] : []);
    this.strategySaved = signal(false, ...ngDevMode ? [{ debugName: "strategySaved" }] : []);
    this.isSavingStrategy = signal(false, ...ngDevMode ? [{ debugName: "isSavingStrategy" }] : []);
    this.customPersona = signal("", ...ngDevMode ? [{ debugName: "customPersona" }] : []);
    this.originalStrategy = null;
    this.tabs = [
      { id: "quick", icon: "\u{1F680}", label: "\u5F15\u64CE\u6982\u89BD" },
      // 引擎概覽 + 快速導航
      { id: "models", icon: "\u{1F916}", label: "\u6A21\u578B\u914D\u7F6E" },
      // AI 模型和 API 設置
      { id: "persona", icon: "\u{1F3AD}", label: "\u4EBA\u683C\u98A8\u683C" },
      // AI 說話風格和策略
      { id: "stats", icon: "\u{1F4CA}", label: "\u4F7F\u7528\u7D71\u8A08" }
      // 使用量和成本統計
    ];
    this.providers = [
      { id: "openai", name: "OpenAI", icon: "\u{1F7E2}" },
      { id: "claude", name: "Claude", icon: "\u{1F7E3}" },
      { id: "gemini", name: "Gemini", icon: "\u{1F535}" }
    ];
    this.presetModels = {
      "openai": [
        { name: "gpt-4o", displayName: "GPT-4o (\u63A8\u85A6)" },
        { name: "gpt-4o-mini", displayName: "GPT-4o Mini (\u7D93\u6FDF)" },
        { name: "gpt-4-turbo", displayName: "GPT-4 Turbo" },
        { name: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo (\u5FEB\u901F)" }
      ],
      "claude": [
        { name: "claude-3-5-sonnet-latest", displayName: "Claude 3.5 Sonnet (\u63A8\u85A6)" },
        { name: "claude-3-opus-latest", displayName: "Claude 3 Opus (\u5F37\u5927)" },
        { name: "claude-3-haiku-20240307", displayName: "Claude 3 Haiku (\u5FEB\u901F)" }
      ],
      "gemini": [
        { name: "gemini-1.5-flash-latest", displayName: "Gemini 1.5 Flash (\u63A8\u85A6)" },
        { name: "gemini-1.5-pro-latest", displayName: "Gemini 1.5 Pro (\u5F37\u5927)" },
        { name: "gemini-2.0-flash-exp", displayName: "Gemini 2.0 Flash (\u5BE6\u9A57)" }
      ]
    };
    this.currentPresetModels = computed(() => this.presetModels[this.newModelProvider()] || [], ...ngDevMode ? [{ debugName: "currentPresetModels" }] : []);
    this.localModels = this.aiService.localModels;
    this.cloudModels = this.aiService.cloudModels;
    this.conversationStyles = [
      { id: "professional", icon: "\u{1F454}", label: "\u5C08\u696D\u6B63\u5F0F" },
      { id: "friendly", icon: "\u{1F60A}", label: "\u53CB\u597D\u89AA\u5207" },
      { id: "casual", icon: "\u{1F60E}", label: "\u8F15\u9B06\u5E7D\u9ED8" },
      { id: "direct", icon: "\u{1F3AF}", label: "\u76F4\u63A5\u7C21\u6F54" }
    ];
    this.industryTemplates = [
      { id: "payment", name: "\u{1F4B3} \u8DE8\u5883\u652F\u4ED8", description: "U\u514C\u63DB\u3001\u4EE3\u6536\u4EE3\u4ED8\u3001\u532F\u6B3E\u670D\u52D9" },
      { id: "ecommerce", name: "\u{1F6D2} \u96FB\u5546\u96F6\u552E", description: "\u5546\u54C1\u92B7\u552E\u3001\u8A02\u55AE\u67E5\u8A62\u3001\u552E\u5F8C\u670D\u52D9" },
      { id: "education", name: "\u{1F4D6} \u5728\u7DDA\u6559\u80B2", description: "\u8AB2\u7A0B\u8AEE\u8A62\u3001\u5B78\u7FD2\u8F14\u5C0E\u3001\u5831\u540D\u6D41\u7A0B" },
      { id: "realestate", name: "\u{1F3E0} \u623F\u7522\u4E2D\u4ECB", description: "\u623F\u6E90\u63A8\u85A6\u3001\u770B\u623F\u9810\u7D04\u3001\u4EA4\u6613\u6D41\u7A0B" },
      { id: "finance", name: "\u{1F4B0} \u91D1\u878D\u7406\u8CA1", description: "\u6295\u8CC7\u8AEE\u8A62\u3001\u98A8\u96AA\u8A55\u4F30\u3001\u7522\u54C1\u4ECB\u7D39" },
      { id: "healthcare", name: "\u{1F3E5} \u91AB\u7642\u5065\u5EB7", description: "\u9810\u7D04\u639B\u865F\u3001\u5065\u5EB7\u8AEE\u8A62\u3001\u7528\u85E5\u6307\u5C0E" },
      { id: "travel", name: "\u2708\uFE0F \u65C5\u904A\u670D\u52D9", description: "\u884C\u7A0B\u898F\u5283\u3001\u8A02\u7968\u9152\u5E97\u3001\u5C0E\u904A\u670D\u52D9" },
      { id: "legal", name: "\u2696\uFE0F \u6CD5\u5F8B\u8AEE\u8A62", description: "\u6CD5\u5F8B\u554F\u7B54\u3001\u6848\u4EF6\u8AEE\u8A62\u3001\u6587\u66F8\u670D\u52D9" }
    ];
    this.knowledgeStats = computed(() => {
      const kbs = this.knowledgeBases();
      const totalItems = kbs.reduce((sum, kb) => sum + kb.items.length, 0);
      const categoryCount = {};
      kbs.forEach((kb) => {
        kb.items.forEach((item) => {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });
      });
      const topCategory = Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "-";
      const categoryNames = {
        product: "\u7522\u54C1",
        faq: "\u554F\u7B54",
        sales: "\u8A71\u8853",
        objection: "\u7570\u8B70",
        custom: "\u5176\u4ED6"
      };
      return {
        totalItems,
        usedCount: Math.floor(totalItems * 0.7),
        // TODO: 從後端獲取真實數據
        hitRate: totalItems > 0 ? 68 : 0,
        // TODO: 從後端獲取真實數據
        topCategory: categoryNames[topCategory] || topCategory
      };
    }, ...ngDevMode ? [{ debugName: "knowledgeStats" }] : []);
    this.defaultRules = [
      { id: "purchase", icon: "\u{1F6D2}", name: "\u8CFC\u8CB7\u610F\u5411\u660E\u78BA \u2192 \u901A\u77E5\u4EBA\u5DE5", description: "\u7576\u8B58\u5225\u5230\u8CFC\u8CB7\u610F\u5411\u6642\u7ACB\u5373\u901A\u77E5", isActive: true },
      { id: "no-response", icon: "\u23F0", name: "\u9023\u7E8C3\u6B21\u4E0D\u56DE\u8986 \u2192 \u66AB\u505C", description: "\u66AB\u505C\u5C0D\u8A71\uFF0C3\u5929\u5F8C\u518D\u8DDF\u9032", isActive: true },
      { id: "negative", icon: "\u{1F614}", name: "\u8CA0\u9762\u60C5\u7DD2 \u2192 \u8F49\u4EBA\u5DE5", description: "\u6AA2\u6E2C\u5230\u8CA0\u9762\u60C5\u7DD2\u6642\u8F49\u4EBA\u5DE5\u8655\u7406", isActive: true },
      { id: "price", icon: "\u{1F4B0}", name: "\u50F9\u683C\u654F\u611F \u2192 \u63A8\u9001\u512A\u60E0", description: "\u8A62\u554F\u50F9\u683C\u6642\u63A8\u9001\u512A\u60E0\u65B9\u6848", isActive: false }
    ];
    this.personaTemplates = [
      { id: "friendly", icon: "\u{1F60A}", name: "\u53CB\u597D\u52A9\u624B", description: "\u89AA\u5207\u3001\u8010\u5FC3\u3001\u6A02\u65BC\u52A9\u4EBA", prompt: "\u4F60\u662F\u4E00\u4F4D\u53CB\u597D\u7684\u5BA2\u670D\u52A9\u624B\uFF0C\u8AAA\u8A71\u89AA\u5207\u6EAB\u6696\uFF0C\u6A02\u65BC\u5E6B\u52A9\u5BA2\u6236\u89E3\u6C7A\u554F\u984C\u3002" },
      { id: "professional", icon: "\u{1F454}", name: "\u5C08\u696D\u9867\u554F", description: "\u5C08\u696D\u3001\u56B4\u8B39\u3001\u503C\u5F97\u4FE1\u8CF4", prompt: "\u4F60\u662F\u4E00\u4F4D\u5C08\u696D\u7684\u92B7\u552E\u9867\u554F\uFF0C\u5177\u6709\u8C50\u5BCC\u7684\u884C\u696D\u7D93\u9A57\uFF0C\u56DE\u7B54\u554F\u984C\u5C08\u696D\u56B4\u8B39\u3002" },
      { id: "enthusiastic", icon: "\u{1F389}", name: "\u71B1\u60C5\u92B7\u552E", description: "\u7A4D\u6975\u3001\u71B1\u60C5\u3001\u5584\u65BC\u63A8\u85A6", prompt: "\u4F60\u662F\u4E00\u4F4D\u5145\u6EFF\u71B1\u60C5\u7684\u92B7\u552E\u4EE3\u8868\uFF0C\u5584\u65BC\u767C\u73FE\u5BA2\u6236\u9700\u6C42\u4E26\u7A4D\u6975\u63A8\u85A6\u5408\u9069\u7684\u7522\u54C1\u3002" },
      { id: "efficient", icon: "\u26A1", name: "\u9AD8\u6548\u7C21\u6F54", description: "\u76F4\u63A5\u3001\u7C21\u6F54\u3001\u6548\u7387\u512A\u5148", prompt: "\u4F60\u662F\u4E00\u4F4D\u9AD8\u6548\u7684\u5BA2\u670D\uFF0C\u56DE\u7B54\u554F\u984C\u76F4\u63A5\u660E\u4E86\uFF0C\u4E0D\u7E5E\u5F4E\u5B50\uFF0C\u7BC0\u7701\u5BA2\u6236\u6642\u9593\u3002" }
    ];
    this.selectedPersonaTemplate = signal("friendly", ...ngDevMode ? [{ debugName: "selectedPersonaTemplate" }] : []);
    this.previewResponse = signal("\u60A8\u597D\u5440\uFF01\u611F\u8B1D\u60A8\u7684\u8AEE\u8A62 \u{1F60A} \u6211\u5011\u7684\u670D\u52D9\u50F9\u683C\u6839\u64DA\u60A8\u7684\u5177\u9AD4\u9700\u6C42\u800C\u5B9A\uFF0C\u8ACB\u554F\u60A8\u4E3B\u8981\u60F3\u4E86\u89E3\u54EA\u65B9\u9762\u7684\u670D\u52D9\u5462\uFF1F", ...ngDevMode ? [{ debugName: "previewResponse" }] : []);
    this.knowledgeBases = computed(() => this.aiService.knowledgeBases(), ...ngDevMode ? [{ debugName: "knowledgeBases" }] : []);
    this.activeKbId = computed(() => this.aiService.activeKnowledgeBaseId(), ...ngDevMode ? [{ debugName: "activeKbId" }] : []);
    this.currentStyle = computed(() => this.aiService.strategy().style, ...ngDevMode ? [{ debugName: "currentStyle" }] : []);
    this.responseLength = computed(() => this.aiService.strategy().responseLength, ...ngDevMode ? [{ debugName: "responseLength" }] : []);
    this.useEmoji = computed(() => this.aiService.strategy().useEmoji, ...ngDevMode ? [{ debugName: "useEmoji" }] : []);
  }
  getProviderIcon(provider) {
    return this.providers.find((p) => p.id === provider)?.icon || "\u{1F916}";
  }
  getProviderName(provider) {
    return this.providers.find((p) => p.id === provider)?.name || provider;
  }
  testModel(model) {
    this.aiService.testModelConnection(model.id);
  }
  editModel(model) {
  }
  saveNewModel() {
    if (!this.newModelName || !this.newModelApiKey)
      return;
    this.aiService.addModel({
      provider: this.newModelProvider(),
      modelName: this.newModelName,
      apiKey: this.newModelApiKey,
      apiEndpoint: this.newModelEndpoint || void 0,
      displayName: this.newModelDisplayName || this.newModelName
    });
    this.showAddModel.set(false);
    this.newModelName = "";
    this.newModelApiKey = "";
    this.newModelEndpoint = "";
    this.newModelDisplayName = "";
  }
  // ========== 本地 AI 方法 ==========
  saveLocalModel() {
    if (!this.localModelEndpoint || !this.localModelName) {
      alert("\u8ACB\u586B\u5BEB API \u7AEF\u9EDE\u548C\u6A21\u578B\u540D\u7A31");
      return;
    }
    this.aiService.addLocalModel({
      modelName: this.localModelName,
      displayName: this.localModelDisplayName || this.localModelName,
      apiEndpoint: this.localModelEndpoint,
      isDefault: this.aiService.models().length === 0
      // 如果是第一個模型，設為默認
    });
    this.showAddLocalModel.set(false);
    this.localModelDisplayName = "\u6211\u7684\u672C\u5730 AI";
  }
  async testLocalConnection() {
    if (!this.localModelEndpoint || !this.localModelName) {
      alert("\u8ACB\u5148\u586B\u5BEB API \u7AEF\u9EDE\u548C\u6A21\u578B\u540D\u7A31");
      return;
    }
    this.isTestingLocal.set(true);
    await this.aiService.testLocalAIConnection(this.localModelEndpoint, this.localModelName);
    setTimeout(() => this.isTestingLocal.set(false), 3e3);
  }
  // ========== 🔊 P1: TTS 語音方法 ==========
  saveTtsSettings() {
    this.ipcService.send("save-ai-settings", {
      ttsEndpoint: this.ttsEndpoint,
      ttsEnabled: this.ttsEnabled
    });
    this.toastService.success("TTS \u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
  }
  async testTtsConnection() {
    if (!this.ttsEndpoint) {
      this.toastService.error("\u8ACB\u5148\u586B\u5BEB TTS \u670D\u52D9\u7AEF\u9EDE");
      return;
    }
    this.isTestingTts.set(true);
    const startTime = Date.now();
    const listener = (data) => {
      this.isTestingTts.set(false);
      if (data.success) {
        this.ttsConnected.set(true);
        this.ttsLatency.set(Date.now() - startTime);
        this.toastService.success("\u2713 TTS \u670D\u52D9\u9023\u63A5\u6210\u529F\uFF01");
      } else {
        this.ttsConnected.set(false);
        this.toastService.error(`TTS \u9023\u63A5\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    };
    this.ipcService.once("tts-test-result", listener);
    this.ipcService.send("test-tts-service", { endpoint: this.ttsEndpoint });
    setTimeout(() => {
      if (this.isTestingTts()) {
        this.isTestingTts.set(false);
        this.toastService.error("TTS \u6E2C\u8A66\u8D85\u6642");
      }
    }, 15e3);
  }
  testTtsVoice() {
    const listener = (data) => {
      if (data.success && data.audio) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.play().catch((e) => {
          this.toastService.error(`\u64AD\u653E\u5931\u6557: ${e.message}`);
        });
      } else {
        this.toastService.error(`\u8A9E\u97F3\u751F\u6210\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    };
    this.ipcService.once("tts-result", listener);
    this.ipcService.send("text-to-speech", {
      endpoint: this.ttsEndpoint,
      text: "\u4F60\u597D\uFF0C\u9019\u662F\u4E00\u6BB5\u8A9E\u97F3\u6E2C\u8A66\u3002",
      voice: ""
    });
    this.toastService.info("\u6B63\u5728\u751F\u6210\u8A66\u807D\u8A9E\u97F3...");
  }
  // 模型用途分配變更處理（自動保存）
  onModelUsageChange(field, event) {
    const select = event.target;
    const modelId = select.value;
    this.aiService.updateModelUsage({ [field]: modelId });
    this.isSavingUsage.set(true);
    this.usageSaved.set(false);
    if (this.usageSaveTimeout) {
      clearTimeout(this.usageSaveTimeout);
    }
    this.usageSaveTimeout = setTimeout(async () => {
      await this.aiService.saveModelUsageToBackend();
      this.isSavingUsage.set(false);
      this.usageSaved.set(true);
      setTimeout(() => this.usageSaved.set(false), 3e3);
    }, 300);
  }
  deleteModel(model) {
    if (confirm(`\u78BA\u5B9A\u8981\u522A\u9664\u6A21\u578B\u300C${model.displayName || model.modelName}\u300D\u55CE\uFF1F`)) {
      this.aiService.removeModel(model.id);
    }
  }
  setAsDefault(model) {
    this.aiService.setDefaultModel(model.id);
  }
  addKnowledgeBase() {
    this.dialogService.prompt({
      title: "\u65B0\u5EFA\u77E5\u8B58\u5EAB",
      message: "\u8ACB\u8F38\u5165\u77E5\u8B58\u5EAB\u540D\u7A31\uFF0C\u7528\u65BC\u7D44\u7E54\u548C\u7BA1\u7406 AI \u56DE\u8986\u7684\u696D\u52D9\u77E5\u8B58\u3002",
      placeholder: "\u4F8B\u5982\uFF1A\u7522\u54C1\u77E5\u8B58\u5EAB\u3001\u5E38\u898B\u554F\u7B54",
      confirmText: "\u5275\u5EFA",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        if (!value.trim())
          return "\u8ACB\u8F38\u5165\u540D\u7A31";
        if (value.length > 50)
          return "\u540D\u7A31\u4E0D\u80FD\u8D85\u904E 50 \u500B\u5B57\u7B26";
        return null;
      },
      onConfirm: (name) => {
        this.aiService.addKnowledgeBase(name);
      }
    });
  }
  setActiveKb(id) {
    this.aiService.setActiveKnowledgeBase(id);
  }
  editKb(kb) {
    this.dialogService.prompt({
      title: "\u7DE8\u8F2F\u77E5\u8B58\u5EAB",
      message: "\u4FEE\u6539\u77E5\u8B58\u5EAB\u540D\u7A31",
      placeholder: "\u8ACB\u8F38\u5165\u65B0\u540D\u7A31",
      defaultValue: kb.name,
      confirmText: "\u4FDD\u5B58",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        if (!value.trim())
          return "\u540D\u7A31\u4E0D\u80FD\u70BA\u7A7A";
        if (value.length > 50)
          return "\u540D\u7A31\u4E0D\u80FD\u8D85\u904E 50 \u500B\u5B57\u7B26";
        return null;
      },
      onConfirm: (newName) => {
        this.aiService.updateKnowledgeBase(kb.id, { name: newName });
        this.toastService.success(`\u77E5\u8B58\u5EAB\u5DF2\u66F4\u65B0\u70BA\u300C${newName}\u300D`);
      }
    });
  }
  deleteKb(kb) {
    this.dialogService.confirm({
      title: "\u78BA\u8A8D\u522A\u9664",
      message: `\u78BA\u5B9A\u8981\u522A\u9664\u77E5\u8B58\u5EAB\u300C${kb.name}\u300D\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002`,
      confirmText: "\u522A\u9664",
      cancelText: "\u53D6\u6D88",
      type: "danger",
      onConfirm: () => {
        this.aiService.deleteKnowledgeBase(kb.id);
        this.toastService.success(`\u77E5\u8B58\u5EAB\u300C${kb.name}\u300D\u5DF2\u522A\u9664`);
      }
    });
  }
  deleteKnowledgeItem(kbId, itemId) {
    this.dialogService.confirm({
      title: "\u78BA\u8A8D\u522A\u9664",
      message: "\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u77E5\u8B58\u689D\u76EE\u55CE\uFF1F",
      confirmText: "\u522A\u9664",
      cancelText: "\u53D6\u6D88",
      type: "danger",
      onConfirm: () => {
        this.aiService.deleteKnowledgeItem(kbId, itemId);
        this.toastService.success("\u77E5\u8B58\u689D\u76EE\u5DF2\u522A\u9664");
      }
    });
  }
  addQuickContent(type) {
    const typeConfig = {
      product: { title: "\u6DFB\u52A0\u7522\u54C1\u77E5\u8B58", placeholder: "\u4F8B\u5982\uFF1A\u6211\u5011\u7684\u7522\u54C1\u652F\u6301 24 \u5C0F\u6642\u5BA2\u670D...", icon: "\u{1F4E6}" },
      faq: { title: "\u6DFB\u52A0\u5E38\u898B\u554F\u7B54", placeholder: "\u4F8B\u5982\uFF1AQ: \u5982\u4F55\u4ED8\u6B3E\uFF1FA: \u652F\u6301\u5FAE\u4FE1\u3001\u652F\u4ED8\u5BF6...", icon: "\u2753" },
      sales: { title: "\u6DFB\u52A0\u92B7\u552E\u8A71\u8853", placeholder: "\u4F8B\u5982\uFF1A\u7576\u5BA2\u6236\u8AAA\u592A\u8CB4\u6642\uFF0C\u53EF\u4EE5\u56DE\u8986...", icon: "\u{1F3AF}" },
      objection: { title: "\u6DFB\u52A0\u7570\u8B70\u8655\u7406", placeholder: "\u4F8B\u5982\uFF1A\u5BA2\u6236\u64D4\u5FC3\u8CEA\u91CF\u6642\uFF0C\u5F37\u8ABF\u552E\u5F8C\u4FDD\u969C...", icon: "\u{1F4AC}" }
    };
    const config = typeConfig[type];
    const activeKbId = this.activeKbId();
    if (!activeKbId) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u6216\u5275\u5EFA\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    this.dialogService.prompt({
      title: `${config.icon} ${config.title}`,
      message: "\u8F38\u5165\u77E5\u8B58\u5167\u5BB9\uFF0CAI \u5C07\u5728\u56DE\u8986\u6642\u53C3\u8003\u9019\u4E9B\u4FE1\u606F\u3002",
      placeholder: config.placeholder,
      inputType: "textarea",
      confirmText: "\u6DFB\u52A0",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        if (!value.trim())
          return "\u8ACB\u8F38\u5165\u5167\u5BB9";
        if (value.length > 2e3)
          return "\u5167\u5BB9\u4E0D\u80FD\u8D85\u904E 2000 \u500B\u5B57\u7B26";
        return null;
      },
      onConfirm: (content) => {
        this.aiService.addKnowledgeItem(activeKbId, {
          title: `${config.icon} ${type.toUpperCase()}`,
          content,
          category: type
        });
        this.toastService.success("\u77E5\u8B58\u5167\u5BB9\u5DF2\u6DFB\u52A0");
      }
    });
  }
  // 🆕 AI 自動生成知識庫
  openAIGenerateDialog() {
    const activeKbId = this.activeKbId();
    if (!activeKbId) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u6216\u5275\u5EFA\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    this.dialogService.prompt({
      title: "\u{1F916} AI \u81EA\u52D5\u751F\u6210\u77E5\u8B58\u5EAB",
      message: "\u8ACB\u7C21\u55AE\u63CF\u8FF0\u60A8\u7684\u696D\u52D9\uFF081-3 \u53E5\u8A71\uFF09\uFF0CAI \u5C07\u81EA\u52D5\u751F\u6210\u7522\u54C1\u77E5\u8B58\u3001\u5E38\u898B\u554F\u7B54\u3001\u92B7\u552E\u8A71\u8853\u7B49\u5167\u5BB9\u3002",
      placeholder: "\u4F8B\u5982\uFF1A\u6211\u5011\u662F\u505A\u8DE8\u5883\u652F\u4ED8\u7684\uFF0C\u4E3B\u8981\u670D\u52D9\u662F U \u514C\u63DB\u548C\u4EE3\u6536\u4EE3\u4ED8\uFF0C\u652F\u6301\u5FAE\u4FE1\u3001\u652F\u4ED8\u5BF6\u6536\u6B3E",
      inputType: "textarea",
      confirmText: "\u958B\u59CB\u751F\u6210",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        if (!value.trim())
          return "\u8ACB\u8F38\u5165\u696D\u52D9\u63CF\u8FF0";
        if (value.length < 10)
          return "\u63CF\u8FF0\u592A\u77ED\uFF0C\u8ACB\u63D0\u4F9B\u66F4\u591A\u4FE1\u606F";
        if (value.length > 500)
          return "\u63CF\u8FF0\u4E0D\u80FD\u8D85\u904E 500 \u500B\u5B57\u7B26";
        return null;
      },
      onConfirm: (businessDesc) => {
        this.generateKnowledgeWithAI(activeKbId, businessDesc);
      }
    });
  }
  async generateKnowledgeWithAI(kbId, businessDesc) {
    this.toastService.info("\u{1F916} AI \u6B63\u5728\u751F\u6210\u77E5\u8B58\u5EAB\uFF0C\u8ACB\u7A0D\u5019...");
    this.aiService.generateKnowledgeBase(kbId, businessDesc);
  }
  // 🆕 批量導入知識
  openBatchImportDialog() {
    const activeKbId = this.activeKbId();
    if (!activeKbId) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u6216\u5275\u5EFA\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    this.dialogService.prompt({
      title: "\u{1F4CB} \u6279\u91CF\u5C0E\u5165\u77E5\u8B58",
      message: `\u8ACB\u8CBC\u4E0A\u60A8\u7684\u77E5\u8B58\u5167\u5BB9\uFF0C\u652F\u6301\u4EE5\u4E0B\u683C\u5F0F\uFF1A
\u2022 \u6BCF\u884C\u4E00\u689D\u77E5\u8B58
\u2022 Q: \u554F\u984C / A: \u7B54\u6848 \u683C\u5F0F
\u2022 \u3010\u7522\u54C1\u77E5\u8B58\u3011\u3010\u5E38\u898B\u554F\u7B54\u3011\u7B49\u5206\u985E\u6A19\u7C64`,
      placeholder: `\u793A\u4F8B\uFF1A
\u3010\u7522\u54C1\u77E5\u8B58\u3011
\u6211\u5011\u7684\u670D\u52D9\u652F\u6301 24 \u5C0F\u6642\u5728\u7DDA\u5BA2\u670D
\u6700\u4F4E\u514C\u63DB\u91D1\u984D 100U\uFF0C\u6700\u9AD8\u7121\u9650\u5236

\u3010\u5E38\u898B\u554F\u7B54\u3011
Q: \u591A\u4E45\u5230\u8CEC\uFF1F
A: \u901A\u5E38 5-30 \u5206\u9418\u5230\u8CEC

Q: \u652F\u6301\u54EA\u4E9B\u4ED8\u6B3E\u65B9\u5F0F\uFF1F
A: \u652F\u6301\u5FAE\u4FE1\u3001\u652F\u4ED8\u5BF6\u3001\u9280\u884C\u5361`,
      inputType: "textarea",
      confirmText: "\u5C0E\u5165",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        if (!value.trim())
          return "\u8ACB\u8F38\u5165\u8981\u5C0E\u5165\u7684\u5167\u5BB9";
        if (value.length < 10)
          return "\u5167\u5BB9\u592A\u77ED";
        return null;
      },
      onConfirm: (content) => {
        this.importBatchKnowledge(activeKbId, content);
      }
    });
  }
  importBatchKnowledge(kbId, content) {
    const items = this.parseBatchContent(content);
    if (items.length === 0) {
      this.toastService.error("\u7121\u6CD5\u8B58\u5225\u77E5\u8B58\u5167\u5BB9\uFF0C\u8ACB\u6AA2\u67E5\u683C\u5F0F");
      return;
    }
    items.forEach((item) => {
      this.aiService.addKnowledgeItem(kbId, item);
    });
    this.toastService.success(`\u6210\u529F\u5C0E\u5165 ${items.length} \u689D\u77E5\u8B58`);
  }
  parseBatchContent(content) {
    const items = [];
    const lines = content.split("\n").map((l) => l.trim()).filter((l) => l);
    let currentCategory = "custom";
    let currentQ = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/【產品知識】|【产品知识】/)) {
        currentCategory = "product";
        continue;
      } else if (line.match(/【常見問答】|【常见问答】|【FAQ】/i)) {
        currentCategory = "faq";
        continue;
      } else if (line.match(/【銷售話術】|【销售话术】/)) {
        currentCategory = "sales";
        continue;
      } else if (line.match(/【異議處理】|【异议处理】/)) {
        currentCategory = "objection";
        continue;
      }
      if (line.match(/^Q[:：]/i)) {
        currentQ = line.replace(/^Q[:：]\s*/i, "");
        continue;
      } else if (line.match(/^A[:：]/i) && currentQ) {
        const answer = line.replace(/^A[:：]\s*/i, "");
        items.push({
          title: `Q: ${currentQ}`,
          content: `A: ${answer}`,
          category: "faq"
        });
        currentQ = "";
        continue;
      }
      if (line.length > 5 && !line.startsWith("#") && !line.startsWith("//")) {
        items.push({
          title: line.substring(0, 30) + (line.length > 30 ? "..." : ""),
          content: line,
          category: currentCategory
        });
      }
    }
    return items;
  }
  // 🆕 打開行業模板選擇器
  openTemplateSelector() {
    const activeKbId = this.activeKbId();
    if (!activeKbId) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u6216\u5275\u5EFA\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    const templateList = this.industryTemplates.map((t) => `${t.name}
  ${t.description}`).join("\n\n");
    this.dialogService.prompt({
      title: "\u{1F4DA} \u9078\u64C7\u884C\u696D\u6A21\u677F",
      message: `\u9078\u64C7\u4E00\u500B\u884C\u696D\u6A21\u677F\uFF0C\u7CFB\u7D71\u5C07\u81EA\u52D5\u751F\u6210\u5C0D\u61C9\u7684\u77E5\u8B58\u5EAB\u5167\u5BB9\uFF1A

\u53EF\u9078\u6A21\u677F\uFF1A
${this.industryTemplates.map((t) => t.name).join("\u3001")}`,
      placeholder: "\u8F38\u5165\u6A21\u677F\u540D\u7A31\uFF0C\u5982\uFF1A\u8DE8\u5883\u652F\u4ED8\u3001\u96FB\u5546\u96F6\u552E",
      confirmText: "\u4F7F\u7528\u6A21\u677F",
      cancelText: "\u53D6\u6D88",
      validator: (value) => {
        const template = this.industryTemplates.find((t) => t.name.includes(value) || t.id === value.toLowerCase());
        if (!template)
          return "\u8ACB\u8F38\u5165\u6709\u6548\u7684\u6A21\u677F\u540D\u7A31";
        return null;
      },
      onConfirm: (input) => {
        const template = this.industryTemplates.find((t) => t.name.includes(input) || t.id === input.toLowerCase());
        if (template) {
          this.applyIndustryTemplate(activeKbId, template.id);
        }
      }
    });
  }
  applyIndustryTemplate(kbId, templateId) {
    this.toastService.info("\u6B63\u5728\u61C9\u7528\u884C\u696D\u6A21\u677F...");
    this.aiService.applyIndustryTemplate(kbId, templateId);
  }
  // 🆕 從聊天記錄學習
  learnFromChatHistory() {
    const activeKbId = this.activeKbId();
    if (!activeKbId) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u6216\u5275\u5EFA\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    this.dialogService.confirm({
      title: "\u{1F4AC} \u5F9E\u804A\u5929\u8A18\u9304\u5B78\u7FD2",
      message: "\u7CFB\u7D71\u5C07\u5206\u6790\u8FD1 7 \u5929\u7684\u804A\u5929\u8A18\u9304\uFF0C\u81EA\u52D5\u63D0\u53D6\u512A\u8CEA\u56DE\u8986\u6DFB\u52A0\u5230\u77E5\u8B58\u5EAB\u3002\n\n\u6B64\u904E\u7A0B\u53EF\u80FD\u9700\u8981\u5E7E\u5206\u9418\uFF0C\u662F\u5426\u7E7C\u7E8C\uFF1F",
      confirmText: "\u958B\u59CB\u5B78\u7FD2",
      cancelText: "\u53D6\u6D88",
      onConfirm: () => {
        this.toastService.info("\u6B63\u5728\u5206\u6790\u804A\u5929\u8A18\u9304...");
        this.aiService.learnFromChatHistory(activeKbId);
      }
    });
  }
  // 🆕 導出知識庫
  exportKnowledgeBase() {
    const activeKb = this.knowledgeBases().find((kb) => kb.id === this.activeKbId());
    if (!activeKb) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u4E00\u500B\u77E5\u8B58\u5EAB");
      return;
    }
    if (activeKb.items.length === 0) {
      this.toastService.warning("\u77E5\u8B58\u5EAB\u70BA\u7A7A\uFF0C\u7121\u6CD5\u5C0E\u51FA");
      return;
    }
    const exportContent = this.generateExportContent(activeKb);
    navigator.clipboard.writeText(exportContent).then(() => {
      this.toastService.success(`\u5DF2\u8907\u88FD ${activeKb.items.length} \u689D\u77E5\u8B58\u5230\u526A\u8CBC\u677F`);
    }).catch(() => {
      this.dialogService.prompt({
        title: "\u{1F4E4} \u5C0E\u51FA\u77E5\u8B58\u5EAB",
        message: "\u8ACB\u8907\u88FD\u4EE5\u4E0B\u5167\u5BB9\uFF1A",
        defaultValue: exportContent,
        inputType: "textarea",
        confirmText: "\u95DC\u9589",
        cancelText: ""
      });
    });
  }
  generateExportContent(kb) {
    const lines = [
      `# \u77E5\u8B58\u5EAB: ${kb.name}`,
      `# \u5C0E\u51FA\u6642\u9593: ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
      `# \u689D\u76EE\u6578\u91CF: ${kb.items.length}`,
      ""
    ];
    const categories = ["product", "faq", "sales", "objection", "custom"];
    const categoryNames = {
      product: "\u3010\u7522\u54C1\u77E5\u8B58\u3011",
      faq: "\u3010\u5E38\u898B\u554F\u7B54\u3011",
      sales: "\u3010\u92B7\u552E\u8A71\u8853\u3011",
      objection: "\u3010\u7570\u8B70\u8655\u7406\u3011",
      custom: "\u3010\u5176\u4ED6\u3011"
    };
    categories.forEach((cat) => {
      const items = kb.items.filter((i) => i.category === cat);
      if (items.length > 0) {
        lines.push(categoryNames[cat] || `\u3010${cat}\u3011`);
        items.forEach((item) => {
          if (cat === "faq") {
            lines.push(item.title);
            lines.push(item.content);
          } else {
            lines.push(item.content);
          }
          lines.push("");
        });
      }
    });
    return lines.join("\n");
  }
  setStyle(style) {
    this.aiService.updateConversationStrategy({ style });
  }
  // 🔧 對話策略方法
  setResponseLength(length) {
    this.aiService.updateConversationStrategy({ responseLength: length });
  }
  toggleEmoji() {
    this.aiService.updateConversationStrategy({ useEmoji: !this.useEmoji() });
  }
  onPersonaInput(event) {
    const textarea = event.target;
    this.customPersona.set(textarea.value);
    this.markStrategyDirty();
  }
  markStrategyDirty() {
    this.strategyDirty.set(true);
    this.strategySaved.set(false);
    this.saveStrategyToLocalStorage();
  }
  saveStrategyToLocalStorage() {
    const strategy = {
      style: this.currentStyle(),
      responseLength: this.responseLength(),
      useEmoji: this.useEmoji(),
      customPersona: this.customPersona()
    };
    localStorage.setItem("ai_strategy_draft", JSON.stringify(strategy));
  }
  loadStrategyFromLocalStorage() {
    const draft = localStorage.getItem("ai_strategy_draft");
    if (draft) {
      try {
        const strategy = JSON.parse(draft);
        if (strategy.customPersona) {
          this.customPersona.set(strategy.customPersona);
        }
        this.strategyDirty.set(true);
      } catch (e) {
        console.error("\u8F09\u5165\u7B56\u7565\u8349\u7A3F\u5931\u6557:", e);
      }
    }
    const saved = localStorage.getItem("ai_strategy_saved");
    if (saved) {
      try {
        const strategy = JSON.parse(saved);
        this.originalStrategy = strategy;
        if (strategy.customPersona && !draft) {
          this.customPersona.set(strategy.customPersona);
        }
        this.aiService.updateConversationStrategy(strategy);
      } catch (e) {
        console.error("\u8F09\u5165\u7B56\u7565\u8A2D\u5B9A\u5931\u6557:", e);
      }
    }
  }
  async saveStrategySettings() {
    this.isSavingStrategy.set(true);
    const strategy = {
      style: this.currentStyle(),
      responseLength: this.responseLength(),
      useEmoji: this.useEmoji(),
      customPersona: this.customPersona()
    };
    try {
      await this.aiService.saveConversationStrategyToBackend(strategy);
      localStorage.setItem("ai_strategy_saved", JSON.stringify(strategy));
      localStorage.removeItem("ai_strategy_draft");
      this.strategyDirty.set(false);
      this.strategySaved.set(true);
      this.originalStrategy = strategy;
      setTimeout(() => this.strategySaved.set(false), 3e3);
    } catch (error) {
      console.error("\u4FDD\u5B58\u7B56\u7565\u5931\u6557:", error);
      alert("\u4FDD\u5B58\u5931\u6557\uFF0C\u8ACB\u91CD\u8A66");
    } finally {
      this.isSavingStrategy.set(false);
    }
  }
  resetStrategy() {
    if (this.originalStrategy) {
      this.aiService.updateConversationStrategy(this.originalStrategy);
      this.customPersona.set(this.originalStrategy.customPersona || "");
    } else {
      this.aiService.updateConversationStrategy({
        style: "friendly",
        responseLength: "medium",
        useEmoji: true
      });
      this.customPersona.set("");
    }
    localStorage.removeItem("ai_strategy_draft");
    this.strategyDirty.set(false);
  }
  // ========== 快速設置方法 ==========
  toggleAutoChat() {
    this.autoChatEnabled.update((v) => !v);
    this.saveQuickSettings(false);
  }
  // 🆕 切換 AI 自主模式
  toggleAutonomousMode() {
    const newValue = !this.autonomousModeEnabled();
    this.autonomousModeEnabled.set(newValue);
    localStorage.setItem("ai_autonomous_mode", String(newValue));
    if (window.electronAPI?.send) {
      window.electronAPI.send("set-autonomous-mode", { enabled: newValue });
    }
    this.toastService.success(newValue ? "\u{1F9E0} AI \u81EA\u4E3B\u6A21\u5F0F\u5DF2\u555F\u7528" : "AI \u81EA\u4E3B\u6A21\u5F0F\u5DF2\u95DC\u9589");
    if (newValue) {
      this.refreshSmartSystemStats();
    }
  }
  // 🆕 P1-2: 導航到智能營銷中心
  goToSmartMarketing() {
    if (window.electronAPI?.send) {
      window.electronAPI.send("navigate-to", { path: "/smart-marketing" });
    }
    window.location.hash = "#/smart-marketing";
  }
  // 🆕 刷新智能系統統計
  refreshSmartSystemStats() {
    if (window.electronAPI?.send) {
      window.electronAPI.send("get-smart-system-stats", {});
    }
    const handler = (event) => {
      const stats = event.detail || {};
      this.smartSystemStats.set({
        memories: stats.memories || 0,
        tags: stats.tags || 0,
        emotions: stats.emotions || 0,
        workflows: stats.workflows || 0,
        followups: stats.followups || 0,
        knowledge: stats.knowledge || 0
      });
    };
    window.addEventListener("smart-system-stats", handler, { once: true });
    this.toastService.success("\u6B63\u5728\u5237\u65B0\u7D71\u8A08...");
  }
  setAutoChatMode(mode) {
    this.autoChatMode.set(mode);
    this.saveQuickSettings(false);
  }
  toggleAutoGreeting() {
    this.autoGreetingEnabled.update((v) => !v);
    this.saveQuickSettings(false);
  }
  toggleAutoReply() {
    this.autoReplyEnabled.update((v) => !v);
    this.saveQuickSettings(false);
  }
  saveQuickSettings(showAlert = true) {
    const settings = {
      auto_chat_enabled: this.autoChatEnabled() ? 1 : 0,
      auto_chat_mode: this.autoChatMode(),
      auto_greeting: this.autoGreetingEnabled() ? 1 : 0,
      auto_reply: this.autoReplyEnabled() ? 1 : 0
    };
    localStorage.setItem("ai_auto_chat_enabled", String(this.autoChatEnabled()));
    localStorage.setItem("ai_auto_chat_mode", this.autoChatMode());
    localStorage.setItem("ai_auto_greeting", String(this.autoGreetingEnabled()));
    localStorage.setItem("ai_auto_reply", String(this.autoReplyEnabled()));
    window.dispatchEvent(new CustomEvent("save-ai-settings", { detail: settings }));
    if (showAlert) {
      alert("\u8A2D\u7F6E\u5DF2\u4FDD\u5B58\uFF01");
    }
  }
  loadQuickSettings() {
    const enabled = localStorage.getItem("ai_auto_chat_enabled");
    const mode = localStorage.getItem("ai_auto_chat_mode");
    const greeting = localStorage.getItem("ai_auto_greeting");
    const reply = localStorage.getItem("ai_auto_reply");
    const autonomous = localStorage.getItem("ai_autonomous_mode");
    if (enabled !== null)
      this.autoChatEnabled.set(enabled === "true");
    if (mode)
      this.autoChatMode.set(mode);
    if (greeting !== null)
      this.autoGreetingEnabled.set(greeting === "true");
    if (reply !== null)
      this.autoReplyEnabled.set(reply === "true");
    if (autonomous !== null)
      this.autonomousModeEnabled.set(autonomous === "true");
  }
  ngOnInit() {
    this.loadQuickSettings();
    this.loadSenderAccounts();
    this.loadStrategyFromLocalStorage();
  }
  loadSenderAccounts() {
    window.dispatchEvent(new CustomEvent("get-sender-accounts"));
    window.addEventListener("sender-accounts-loaded", ((event) => {
      const accounts = event.detail || [];
      this.senderAccounts.set(accounts);
    }), { once: true });
  }
  // ==================== 🆕 Phase 2: AI 人格方法 ====================
  selectPersonaTemplate(templateId) {
    this.selectedPersonaTemplate.set(templateId);
    const template = this.personaTemplates.find((t) => t.id === templateId);
    if (template) {
      this.customPersona.set(template.prompt);
      this.markStrategyDirty();
      this.updatePreviewForPersona(templateId);
    }
  }
  updatePreviewForPersona(personaId) {
    const previews = {
      "friendly": "\u60A8\u597D\u5440\uFF01\u611F\u8B1D\u60A8\u7684\u8AEE\u8A62 \u{1F60A} \u6211\u5011\u7684\u670D\u52D9\u50F9\u683C\u6839\u64DA\u60A8\u7684\u5177\u9AD4\u9700\u6C42\u800C\u5B9A\uFF0C\u8ACB\u554F\u60A8\u4E3B\u8981\u60F3\u4E86\u89E3\u54EA\u65B9\u9762\u7684\u670D\u52D9\u5462\uFF1F",
      "professional": "\u611F\u8B1D\u60A8\u7684\u5782\u8A62\u3002\u6211\u5011\u63D0\u4F9B\u591A\u7A2E\u670D\u52D9\u65B9\u6848\uFF0C\u50F9\u683C\u5340\u9593\u5F9E\u57FA\u790E\u7248\u5230\u4F01\u696D\u7248\u4E0D\u7B49\u3002\u8ACB\u554F\u60A8\u7684\u5177\u9AD4\u9700\u6C42\u662F\u4EC0\u9EBC\uFF1F\u6211\u53EF\u4EE5\u70BA\u60A8\u63A8\u85A6\u6700\u5408\u9069\u7684\u65B9\u6848\u3002",
      "enthusiastic": "\u592A\u597D\u4E86\uFF01\u611F\u8B1D\u60A8\u5C0D\u6211\u5011\u670D\u52D9\u7684\u95DC\u6CE8\uFF01\u{1F389} \u6211\u5011\u6709\u8D85\u503C\u7684\u512A\u60E0\u5957\u9910\u7B49\u8457\u60A8\uFF01\u6839\u64DA\u60A8\u7684\u9700\u6C42\uFF0C\u6211\u53EF\u4EE5\u70BA\u60A8\u91CF\u8EAB\u5B9A\u5236\u6700\u5212\u7B97\u7684\u65B9\u6848\uFF01",
      "efficient": "\u60A8\u597D\u3002\u50F9\u683C\u8996\u9700\u6C42\u800C\u5B9A\u3002\u8ACB\u8AAA\u660E\u5177\u9AD4\u9700\u6C42\uFF0C\u6211\u70BA\u60A8\u5831\u50F9\u3002"
    };
    this.previewResponse.set(previews[personaId] || previews["friendly"]);
  }
  toggleRule(ruleId) {
    const rule = this.defaultRules.find((r) => r.id === ruleId);
    if (rule) {
      rule.isActive = !rule.isActive;
      this.markStrategyDirty();
    }
  }
  getPersonaName() {
    const template = this.personaTemplates.find((t) => t.id === this.selectedPersonaTemplate());
    return template?.name || "\u53CB\u597D\u52A9\u624B";
  }
  getPreviewResponse() {
    return this.previewResponse();
  }
  regeneratePreview() {
    this.toastService.info("\u6B63\u5728\u751F\u6210\u9810\u89BD...");
    const variations = [
      "\u60A8\u597D\uFF01\u611F\u8B1D\u8AEE\u8A62\uFF0C\u6211\u5011\u7684\u50F9\u683C\u975E\u5E38\u6709\u7AF6\u722D\u529B\uFF0C\u5177\u9AD4\u8981\u770B\u60A8\u7684\u9700\u6C42\u54E6\uFF5E",
      "\u89AA\uFF0C\u6211\u5011\u7684\u670D\u52D9\u6027\u50F9\u6BD4\u8D85\u9AD8\uFF01\u60A8\u60F3\u4E86\u89E3\u54EA\u500B\u5957\u9910\u5462\uFF1F",
      "\u611F\u8B1D\u60A8\u7684\u95DC\u6CE8\uFF01\u6211\u5011\u6709\u591A\u7A2E\u50F9\u4F4D\u53EF\u9078\uFF0C\u6211\u5E6B\u60A8\u8A73\u7D30\u4ECB\u7D39\u4E00\u4E0B\uFF1F"
    ];
    const random = variations[Math.floor(Math.random() * variations.length)];
    this.previewResponse.set(random);
  }
  async savePersonaSettings() {
    await this.saveStrategySettings();
    const rulesState = this.defaultRules.map((r) => ({ id: r.id, isActive: r.isActive }));
    localStorage.setItem("ai_rules_state", JSON.stringify(rulesState));
    this.toastService.success("AI \u4EBA\u683C\u8A2D\u5B9A\u5DF2\u4FDD\u5B58");
  }
  static {
    this.\u0275fac = function AICenterComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AICenterComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AICenterComponent, selectors: [["app-ai-center"]], decls: 38, vars: 7, consts: [[1, "ai-center", "h-full", "flex", "flex-col", "bg-slate-900"], [1, "p-4", "border-b", "border-slate-700/50", "bg-slate-900/80", "backdrop-blur-sm"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-4"], [1, "text-2xl", "font-bold", "text-white", "flex", "items-center", "gap-3"], [1, "text-2xl"], [1, "flex", "items-center", "gap-2"], [1, "flex", "items-center", "gap-2", "px-3", "py-1", "bg-emerald-500/20", "text-emerald-400", "rounded-full", "text-sm"], [1, "px-3", "py-1", "bg-yellow-500/20", "text-yellow-400", "rounded-full", "text-sm"], [1, "flex", "items-center", "gap-6", "px-4", "py-2", "bg-slate-800/80", "rounded-xl", "border", "border-slate-700/50"], [1, "text-center"], [1, "text-lg", "font-bold", "text-cyan-400"], [1, "text-xs", "text-slate-500"], [1, "text-lg", "font-bold", "text-emerald-400"], [1, "text-lg", "font-bold", "text-purple-400"], [1, "flex", "gap-1", "mt-4", "bg-slate-800/50", "p-1", "rounded-xl", "w-fit"], [1, "px-5", "py-2.5", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", "text-sm", "font-medium", 3, "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "shadow-lg", "text-slate-400", "hover:text-white", "hover:bg-slate-700/50"], [1, "flex-1", "overflow-y-auto", "p-4"], [1, "max-w-4xl", "mx-auto", "space-y-6"], [1, "fixed", "inset-0", "bg-black/60", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-50"], [1, "w-2", "h-2", "bg-emerald-500", "rounded-full"], [1, "px-5", "py-2.5", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", "text-sm", "font-medium", 3, "click"], [1, "text-lg"], [1, "bg-gradient-to-br", "from-purple-500/20", "to-pink-500/20", "rounded-2xl", "border", "border-purple-500/30", "p-6"], [1, "w-14", "h-14", "rounded-xl", "bg-purple-500/30", "flex", "items-center", "justify-center", "text-3xl"], [1, "text-xl", "font-bold", "text-white"], [1, "text-slate-400", "text-sm"], [1, "relative", "w-16", "h-8", "rounded-full", "transition-all", 3, "click"], [1, "absolute", "top-1", "left-1", "w-6", "h-6", "bg-white", "rounded-full", "shadow", "transition-transform"], [1, "mt-6", "pt-6", "border-t", "border-purple-500/30", "space-y-4"], [1, "bg-gradient-to-br", "from-cyan-500/20", "to-purple-500/20", "rounded-2xl", "border", "border-cyan-500/30", "p-6"], [1, "w-14", "h-14", "rounded-xl", "bg-gradient-to-br", "from-cyan-500/30", "to-purple-500/30", "flex", "items-center", "justify-center", "text-3xl"], [1, "text-xl", "font-bold", "text-white", "flex", "items-center", "gap-2"], [1, "px-2", "py-0.5", "text-xs", "bg-purple-500/30", "text-purple-400", "rounded-full"], [1, "px-6", "py-3", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-xl", "hover:opacity-90", "transition-all", "shadow-lg", "flex", "items-center", "gap-2", 3, "click"], [1, "mt-6", "pt-6", "border-t", "border-cyan-500/30"], [1, "grid", "grid-cols-4", "gap-3", "text-center"], [1, "p-3", "bg-slate-800/50", "rounded-xl"], [1, "text-xl", "mb-1"], [1, "text-xs", "font-medium", "text-white"], [1, "text-xs", "text-cyan-400", "mt-4", "text-center"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-6"], [1, "flex", "items-center", "gap-3", "mb-4"], [1, "font-semibold", "text-white"], [1, "text-sm", "text-slate-400"], [1, "space-y-2"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-700/50", "rounded-lg"], [1, "text-center", "py-8", "text-slate-400"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "flex", "items-center", "gap-3"], [1, "px-4", "py-2", "bg-slate-700", "text-slate-300", "rounded-lg", "hover:bg-slate-600", "text-sm", 3, "click"], [1, "flex", "items-center", "gap-4", "p-4", "bg-emerald-500/10", "border", "border-emerald-500/30", "rounded-xl"], [1, "p-4", "bg-amber-500/10", "border", "border-amber-500/30", "rounded-xl"], [1, "flex", "justify-end"], [1, "px-6", "py-3", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-xl", "hover:from-purple-400", "hover:to-pink-400", "transition-all", "shadow-lg", 3, "click"], [1, "text-sm", "text-slate-400", "block", "mb-2"], [1, "grid", "grid-cols-3", "gap-3"], [1, "p-4", "rounded-xl", "border", "transition-all", "text-center", 3, "click"], [1, "text-2xl", "mb-1"], [1, "font-medium", "text-white"], [1, "text-xs", "text-slate-400"], [1, "grid", "grid-cols-2", "gap-4"], [1, "flex", "items-center", "justify-between", "p-4", "bg-slate-700/50", "rounded-xl"], [1, "text-xl"], ["type", "checkbox", 1, "w-5", "h-5", "rounded", "bg-slate-600", "border-slate-500", 3, "change", "checked"], [1, "w-10", "h-10", "rounded-full", "bg-cyan-500/20", "flex", "items-center", "justify-center", "overflow-hidden"], ["alt", "Avatar", 1, "w-full", "h-full", "object-cover", 3, "src"], [1, "text-cyan-400"], [1, "flex", "items-center", "gap-1", "text-emerald-400", "text-sm"], [1, "text-3xl", "mb-2"], [1, "text-sm", "text-slate-500"], [1, "w-12", "h-12", "rounded-xl", "bg-emerald-500/20", "flex", "items-center", "justify-center", "text-2xl"], [1, "flex-1"], [1, "flex", "items-center", "gap-1", "text-emerald-400"], [1, "font-medium", "text-amber-400"], [1, "bg-gradient-to-br", "from-emerald-500/10", "to-cyan-500/10", "rounded-xl", "border", "border-emerald-500/30", "p-6"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "px-2", "py-0.5", "bg-emerald-500/20", "text-emerald-400", "text-xs", "rounded-full"], [1, "px-4", "py-2", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "hover:bg-emerald-500/30", "transition-colors", 3, "click"], [1, "space-y-3"], [1, "flex", "items-center", "justify-between", "p-4", "bg-slate-800/50", "rounded-xl"], [1, "text-center", "py-6", "text-slate-400"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", "transition-colors", 3, "click"], [1, "flex", "items-center", "justify-between", "p-4", "bg-slate-700/50", "rounded-xl", "hover:bg-slate-700", "transition-colors"], [1, "mt-6", "pt-6", "border-t", "border-slate-700/50"], [1, "bg-gradient-to-br", "from-purple-500/10", "to-pink-500/10", "rounded-xl", "border", "border-purple-500/30", "p-6"], [1, "px-2", "py-0.5", "bg-purple-500/20", "text-purple-400", "text-xs", "rounded-full"], [1, "relative", "inline-flex", "items-center", "cursor-pointer"], ["type", "checkbox", 1, "sr-only", "peer", 3, "ngModelChange", "change", "ngModel"], [1, "w-11", "h-6", "bg-slate-600", "peer-focus:outline-none", "rounded-full", "peer", "peer-checked:after:translate-x-full", "rtl:peer-checked:after:-translate-x-full", "peer-checked:after:border-white", "after:content-['']", "after:absolute", "after:top-[2px]", "after:start-[2px]", "after:bg-white", "after:rounded-full", "after:h-5", "after:w-5", "after:transition-all", "peer-checked:bg-purple-500"], [1, "ms-3", "text-sm", "font-medium", "text-slate-300"], [1, "text-sm", "text-slate-400", "mb-4"], [1, "space-y-4"], [1, "text-center", "py-4", "text-slate-400"], [1, "w-12", "h-12", "rounded-xl", "bg-emerald-500/20", "flex", "items-center", "justify-center"], [1, "text-xs", "text-slate-400", "truncate", "max-w-xs"], [1, "text-amber-400", "text-sm"], [1, "px-3", "py-1", "bg-slate-600", "text-slate-300", "rounded-lg", "text-sm", "hover:bg-slate-500", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "gap-1", 3, "click", "disabled"], [1, "px-3", "py-1", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "text-red-400", "hover:text-red-300", "p-1", 3, "click"], [1, "inline-block", "w-3", "h-3", "border-2", "border-slate-400", "border-t-transparent", "rounded-full", "animate-spin"], [1, "text-sm", "mb-3"], [1, "px-4", "py-2", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "hover:bg-emerald-500/30", 3, "click"], [1, "w-12", "h-12", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-slate-500", "text-sm"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", 3, "click"], [1, "text-sm", "font-medium", "text-white"], [1, "text-xs", "text-emerald-400", "flex", "items-center", "gap-1"], [1, "grid", "grid-cols-3", "gap-4"], [1, "text-xs", "text-slate-400", "block", "mb-2"], [1, "w-full", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", 3, "change", "value"], ["value", ""], [3, "value", "selected"], [1, "text-xs", "text-slate-500", "mt-3"], [1, "animate-spin"], ["type", "text", "placeholder", "http://localhost:9881", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], [1, "text-xs", "text-slate-500", "mt-1"], [1, "flex", "gap-3"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", "transition-colors", "disabled:opacity-50", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "px-4", "py-2", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "hover:bg-emerald-500/30", "transition-colors", "flex", "items-center", "gap-2"], [1, "flex", "items-center", "gap-2", "text-emerald-400", "text-sm"], [1, "inline-block", "w-4", "h-4", "border-2", "border-purple-400", "border-t-transparent", "rounded-full", "animate-spin"], [1, "px-4", "py-2", "bg-emerald-500/20", "text-emerald-400", "rounded-lg", "hover:bg-emerald-500/30", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "text-slate-500"], [1, "text-sm"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", "transition-colors"], [1, "grid", "grid-cols-4", "gap-4"], [1, "p-5", "rounded-xl", "text-center", "transition-all", "border-2", 3, "border-purple-500", "bg-purple-500/10", "border-transparent", "bg-slate-700/50", "hover:bg-slate-700"], [1, "font-semibold", "text-white", "mb-6", "flex", "items-center", "gap-2"], [1, "grid", "grid-cols-2", "gap-6"], [1, "grid", "grid-cols-2", "gap-3"], [1, "p-4", "rounded-xl", "text-center", "transition-all", "border-2", 3, "border-purple-500", "bg-purple-500/10", "border-transparent", "bg-slate-700/50"], [1, "flex", "gap-2"], [1, "flex-1", "py-2", "px-4", "rounded-lg", "text-sm", "transition-colors", 3, "bg-purple-500", "text-white", "bg-slate-700", "text-slate-300"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-700/50", "rounded-lg", "cursor-pointer", 3, "click"], [1, "text-white", "text-sm"], ["type", "checkbox", 1, "w-5", "h-5", "rounded", "text-purple-500", "bg-slate-700", "border-slate-600", "pointer-events-none", 3, "checked"], ["rows", "6", "placeholder", "\u4F8B\u5982\uFF1A\u4F60\u662F\u4E00\u4F4D\u5C08\u696D\u7684\u92B7\u552E\u9867\u554F\uFF0C\u5177\u67095\u5E74\u884C\u696D\u7D93\u9A57\uFF0C\u64C5\u9577\u89E3\u7B54\u5BA2\u6236\u7591\u554F...", 1, "w-full", "px-4", "py-3", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", "resize-none", 3, "input", "value"], [1, "text-xs", "text-slate-500", "mt-2"], [1, "text-xs", "text-slate-500", "font-normal"], [1, "flex", "items-center", "justify-between", "p-4", "bg-slate-700/50", "rounded-xl", "cursor-pointer", "hover:bg-slate-700", "transition-colors"], [1, "mt-4", "w-full", "py-3", "border", "border-dashed", "border-slate-600", "rounded-xl", "text-slate-400", "hover:text-white", "hover:border-purple-500", "transition-colors"], [1, "bg-gradient-to-r", "from-purple-900/30", "to-blue-900/30", "rounded-xl", "border", "border-purple-500/30", "p-6"], [1, "font-semibold", "text-white", "mb-4", "flex", "items-center", "gap-2"], [1, "bg-slate-900/50", "rounded-xl", "p-4"], [1, "mb-3"], [1, "text-slate-300"], [1, "border-t", "border-slate-700", "pt-3"], [1, "text-xs", "text-purple-400"], [1, "text-white"], [1, "mt-3", "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", "transition-colors", 3, "click"], [1, "flex", "justify-between", "items-center", "bg-slate-800/80", "rounded-xl", "p-4", "border", "border-slate-700/50", "sticky", "bottom-4"], [1, "px-4", "py-2", "bg-slate-700", "text-slate-300", "rounded-lg", "hover:bg-slate-600", "transition-colors", 3, "click"], [1, "px-6", "py-2", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "text-white", "font-medium", "rounded-lg", "transition-all", "shadow-lg", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "p-5", "rounded-xl", "text-center", "transition-all", "border-2", 3, "click"], [1, "font-medium"], [1, "text-xs", "text-slate-400", "mt-1"], [1, "p-4", "rounded-xl", "text-center", "transition-all", "border-2", 3, "click"], [1, "text-sm", "font-medium"], [1, "flex-1", "py-2", "px-4", "rounded-lg", "text-sm", "transition-colors", 3, "click"], ["type", "checkbox", 1, "w-5", "h-5", "rounded", "text-purple-500", "bg-slate-700", "border-slate-600", "cursor-pointer", 3, "change", "checked"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "text-3xl", "font-bold", "text-cyan-400"], [1, "text-3xl", "font-bold", "text-emerald-400"], [1, "text-3xl", "font-bold", "text-purple-400"], [1, "text-3xl", "font-bold", "text-orange-400"], [1, "font-semibold", "text-white", "mb-4"], [1, "text-4xl", "font-bold", "text-white", "mb-1"], [1, "text-slate-400"], [1, "text-4xl", "font-bold", "text-emerald-400", "mb-1"], [1, "bg-gradient-to-br", "from-cyan-500/10", "to-purple-500/10", "rounded-xl", "border", "border-cyan-500/30", "p-6"], [1, "px-2", "py-0.5", "text-xs", "bg-emerald-500/30", "text-emerald-400", "rounded-full"], [1, "px-2", "py-0.5", "text-xs", "bg-slate-500/30", "text-slate-400", "rounded-full"], [1, "px-4", "py-2", "bg-purple-500/20", "text-purple-400", "rounded-lg", "hover:bg-purple-500/30", "text-sm", "flex", "items-center", "gap-2", 3, "click"], [1, "bg-slate-800/50", "rounded-lg", "p-4"], [1, "flex", "items-center", "gap-2", "mb-2"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "text-2xl", "font-bold", "text-orange-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "text-2xl", "font-bold", "text-amber-400"], [1, "text-2xl", "font-bold", "text-blue-400"], [1, "mt-4", "pt-4", "border-t", "border-slate-700/50"], [1, "px-4", "py-2", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded-lg", "text-sm", "transition-colors", 3, "click"], [1, "bg-slate-800", "rounded-2xl", "w-full", "max-w-md", "p-6", "shadow-xl", "border", "border-slate-700"], [1, "text-xl", "font-bold", "text-white", "mb-6"], [1, "grid", "grid-cols-3", "gap-2"], [1, "p-3", "rounded-lg", "text-center", "transition-all", "border-2", 3, "border-purple-500", "bg-purple-500/10", "border-transparent", "bg-slate-700"], [1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", 3, "ngModelChange", "ngModel"], [3, "value"], ["type", "password", "placeholder", "sk-...", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "\u5982 \u6211\u7684 GPT-4", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], [1, "flex", "gap-3", "mt-6"], [1, "flex-1", "py-2.5", "bg-slate-700", "text-slate-300", "rounded-lg", "hover:bg-slate-600", "transition-colors", 3, "click"], [1, "flex-1", "py-2.5", "bg-purple-500", "text-white", "rounded-lg", "hover:bg-purple-400", "transition-colors", 3, "click"], [1, "p-3", "rounded-lg", "text-center", "transition-all", "border-2", 3, "click"], [1, "text-xs"], [1, "bg-slate-800", "rounded-2xl", "w-full", "max-w-lg", "p-6", "shadow-xl", "border", "border-emerald-500/30"], [1, "text-xl", "font-bold", "text-white", "mb-2", "flex", "items-center", "gap-2"], [1, "text-slate-400", "text-sm", "mb-6"], ["type", "text", "placeholder", "https://your-ollama.ts.net/api/chat", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], ["type", "text", "placeholder", "qwen2.5, llama3.2, mistral", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], [1, "text-emerald-400"], ["type", "text", "placeholder", "\u6211\u7684\u672C\u5730 AI", 1, "w-full", "px-4", "py-2.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-500", 3, "ngModelChange", "ngModel"], [1, "w-full", "py-2.5", "bg-cyan-500/20", "text-cyan-400", "rounded-lg", "hover:bg-cyan-500/30", "transition-colors", "flex", "items-center", "justify-center", "gap-2", 3, "click", "disabled"], [1, "flex-1", "py-2.5", "bg-emerald-500", "text-white", "rounded-lg", "hover:bg-emerald-400", "transition-colors", 3, "click"]], template: function AICenterComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "h1", 4)(5, "span", 5);
        \u0275\u0275text(6, "\u2699\uFE0F");
        \u0275\u0275elementEnd();
        \u0275\u0275text(7, " \u667A\u80FD\u5F15\u64CE\u8A2D\u7F6E ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "div", 6);
        \u0275\u0275conditionalCreate(9, AICenterComponent_Conditional_9_Template, 3, 0, "span", 7)(10, AICenterComponent_Conditional_10_Template, 2, 0, "span", 8);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(11, "div", 3)(12, "div", 9)(13, "div", 10)(14, "div", 11);
        \u0275\u0275text(15);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "div", 12);
        \u0275\u0275text(17, "\u4ECA\u65E5\u5C0D\u8A71");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "div", 10)(19, "div", 13);
        \u0275\u0275text(20);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "div", 12);
        \u0275\u0275text(22, "\u8F49\u5316\u7387");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(23, "div", 10)(24, "div", 14);
        \u0275\u0275text(25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "div", 12);
        \u0275\u0275text(27, "\u4ECA\u65E5\u6210\u672C");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(28, "div", 15);
        \u0275\u0275repeaterCreate(29, AICenterComponent_For_30_Template, 5, 18, "button", 16, _forTrack0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(31, "div", 17);
        \u0275\u0275conditionalCreate(32, AICenterComponent_Case_32_Template, 84, 9, "div", 18)(33, AICenterComponent_Case_33_Template, 45, 6, "div", 18)(34, AICenterComponent_Case_34_Template, 83, 8, "div", 18)(35, AICenterComponent_Case_35_Template, 113, 13, "div", 18);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(36, AICenterComponent_Conditional_36_Template, 34, 3, "div", 19);
        \u0275\u0275conditionalCreate(37, AICenterComponent_Conditional_37_Template, 34, 5, "div", 19);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_5_0;
        \u0275\u0275advance(9);
        \u0275\u0275conditional(ctx.aiService.isConnected() ? 9 : 10);
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.aiService.stats().today.conversations);
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate1("", (ctx.aiService.stats().weekly.conversionRate * 100).toFixed(1), "%");
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate1("\xA5", ctx.aiService.stats().today.cost.toFixed(2));
        \u0275\u0275advance(4);
        \u0275\u0275repeater(ctx.tabs);
        \u0275\u0275advance(3);
        \u0275\u0275conditional((tmp_5_0 = ctx.activeTab()) === "quick" ? 32 : tmp_5_0 === "models" ? 33 : tmp_5_0 === "persona" ? 34 : tmp_5_0 === "stats" ? 35 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275conditional(ctx.showAddModel() ? 36 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showAddLocalModel() ? 37 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AICenterComponent, [{
    type: Component,
    args: [{
      selector: "app-ai-center",
      standalone: true,
      imports: [CommonModule, FormsModule],
      template: `
    <div class="ai-center h-full flex flex-col bg-slate-900">
      <!-- \u9802\u90E8\u6A19\u984C\u6B04 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">\u2699\uFE0F</span>
              \u667A\u80FD\u5F15\u64CE\u8A2D\u7F6E
            </h1>
            
            <!-- \u9023\u63A5\u72C0\u614B -->
            <div class="flex items-center gap-2">
              @if (aiService.isConnected()) {
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  AI \u5DF2\u9023\u63A5
                </span>
              } @else {
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  \u672A\u914D\u7F6E AI
                </span>
              }
            </div>
          </div>
          
          <!-- \u5FEB\u901F\u7D71\u8A08 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-6 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
              <div class="text-center">
                <div class="text-lg font-bold text-cyan-400">{{ aiService.stats().today.conversations }}</div>
                <div class="text-xs text-slate-500">\u4ECA\u65E5\u5C0D\u8A71</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-emerald-400">{{ (aiService.stats().weekly.conversionRate * 100).toFixed(1) }}%</div>
                <div class="text-xs text-slate-500">\u8F49\u5316\u7387</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-purple-400">\xA5{{ aiService.stats().today.cost.toFixed(2) }}</div>
                <div class="text-xs text-slate-500">\u4ECA\u65E5\u6210\u672C</div>
              </div>
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
      
      <!-- Tab \u5167\u5BB9\u5340 -->
      <div class="flex-1 overflow-y-auto p-4">
        @switch (activeTab()) {
          @case ('quick') {
            <!-- \u{1F195} Phase 3-1: \u5F15\u64CE\u6982\u89BD -->
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- AI \u81EA\u52D5\u804A\u5929\uFF08\u4FDD\u7559\uFF0C\u4F46\u63D0\u793A\u7528\u6236\u4F7F\u7528\u71DF\u92B7\u4EFB\u52D9\u4E2D\u5FC3\uFF09 -->
              <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-purple-500/30 flex items-center justify-center text-3xl">
                      \u{1F916}
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white">AI \u81EA\u52D5\u804A\u5929</h3>
                      <p class="text-slate-400 text-sm">\u958B\u555F\u5F8C\uFF0CAI \u5C07\u81EA\u52D5\u554F\u5019\u65B0 Lead \u4E26\u56DE\u8986\u79C1\u4FE1</p>
                    </div>
                  </div>
                  <button (click)="toggleAutoChat()"
                          class="relative w-16 h-8 rounded-full transition-all"
                          [class.bg-emerald-500]="autoChatEnabled()"
                          [class.bg-slate-600]="!autoChatEnabled()">
                    <span class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                          [class.translate-x-8]="autoChatEnabled()"></span>
                  </button>
                </div>
                
                @if (autoChatEnabled()) {
                  <div class="mt-6 pt-6 border-t border-purple-500/30 space-y-4">
                    <!-- \u6A21\u5F0F\u9078\u64C7 -->
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">\u804A\u5929\u6A21\u5F0F</label>
                      <div class="grid grid-cols-3 gap-3">
                        <button (click)="setAutoChatMode('full')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-emerald-500/20]="autoChatMode() === 'full'"
                                [class.border-emerald-500]="autoChatMode() === 'full'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'full'"
                                [class.border-slate-600]="autoChatMode() !== 'full'">
                          <div class="text-2xl mb-1">\u{1F680}</div>
                          <div class="font-medium text-white">\u5168\u81EA\u52D5</div>
                          <div class="text-xs text-slate-400">AI \u81EA\u52D5\u767C\u9001\u56DE\u8986</div>
                        </button>
                        <button (click)="setAutoChatMode('semi')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-cyan-500/20]="autoChatMode() === 'semi'"
                                [class.border-cyan-500]="autoChatMode() === 'semi'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'semi'"
                                [class.border-slate-600]="autoChatMode() !== 'semi'">
                          <div class="text-2xl mb-1">\u{1F465}</div>
                          <div class="font-medium text-white">\u534A\u81EA\u52D5</div>
                          <div class="text-xs text-slate-400">\u751F\u6210\u5EFA\u8B70\u5F8C\u78BA\u8A8D\u767C\u9001</div>
                        </button>
                        <button (click)="setAutoChatMode('assist')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-amber-500/20]="autoChatMode() === 'assist'"
                                [class.border-amber-500]="autoChatMode() === 'assist'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'assist'"
                                [class.border-slate-600]="autoChatMode() !== 'assist'">
                          <div class="text-2xl mb-1">\u{1F4A1}</div>
                          <div class="font-medium text-white">\u8F14\u52A9\u6A21\u5F0F</div>
                          <div class="text-xs text-slate-400">\u50C5\u63D0\u4F9B\u5EFA\u8B70\u4E0D\u767C\u9001</div>
                        </button>
                      </div>
                    </div>
                    
                    <!-- \u529F\u80FD\u958B\u95DC -->
                    <div class="grid grid-cols-2 gap-4">
                      <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                        <div class="flex items-center gap-3">
                          <span class="text-xl">\u{1F44B}</span>
                          <div>
                            <div class="font-medium text-white">\u81EA\u52D5\u554F\u5019</div>
                            <div class="text-xs text-slate-400">\u65B0 Lead \u81EA\u52D5\u767C\u9001\u554F\u5019</div>
                          </div>
                        </div>
                        <input type="checkbox" [checked]="autoGreetingEnabled()" 
                               (change)="toggleAutoGreeting()"
                               class="w-5 h-5 rounded bg-slate-600 border-slate-500">
                      </div>
                      <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                        <div class="flex items-center gap-3">
                          <span class="text-xl">\u{1F4AC}</span>
                          <div>
                            <div class="font-medium text-white">\u81EA\u52D5\u56DE\u8986</div>
                            <div class="text-xs text-slate-400">\u7528\u6236\u79C1\u4FE1\u81EA\u52D5\u56DE\u8986</div>
                          </div>
                        </div>
                        <input type="checkbox" [checked]="autoReplyEnabled()"
                               (change)="toggleAutoReply()"
                               class="w-5 h-5 rounded bg-slate-600 border-slate-500">
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- \u{1F195} P1-2: \u667A\u80FD\u71DF\u92B7\u4E2D\u5FC3\u5165\u53E3\uFF08\u66FF\u4EE3 AI \u81EA\u4E3B\u6A21\u5F0F\uFF09 -->
              <div class="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-3xl">
                      \u{1F680}
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        \u667A\u80FD\u71DF\u92B7\u4E2D\u5FC3
                        <span class="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-400 rounded-full">\u6574\u5408</span>
                      </h3>
                      <p class="text-slate-400 text-sm">\u4E00\u9375\u555F\u52D5\u71DF\u92B7\u4EFB\u52D9 - AI \u81EA\u52D5\u914D\u7F6E\u89D2\u8272\u548C\u7B56\u7565</p>
                    </div>
                  </div>
                  <button (click)="goToSmartMarketing()"
                          class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                    <span>\u{1F680}</span>
                    \u524D\u5F80\u4F7F\u7528
                  </button>
                </div>
                
                <div class="mt-6 pt-6 border-t border-cyan-500/30">
                  <div class="grid grid-cols-4 gap-3 text-center">
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">\u{1F4B0}</div>
                      <div class="text-xs font-medium text-white">\u4FC3\u9032\u9996\u55AE</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">\u{1F49D}</div>
                      <div class="text-xs font-medium text-white">\u633D\u56DE\u6D41\u5931</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">\u{1F389}</div>
                      <div class="text-xs font-medium text-white">\u793E\u7FA4\u6D3B\u8E8D</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">\u{1F527}</div>
                      <div class="text-xs font-medium text-white">\u552E\u5F8C\u670D\u52D9</div>
                    </div>
                  </div>
                  <p class="text-xs text-cyan-400 mt-4 text-center">
                    \u{1F4A1} \u9078\u64C7\u76EE\u6A19 \u2192 AI \u81EA\u52D5\u914D\u7F6E \u2192 \u4E00\u9375\u555F\u52D5\uFF0C\u5DF2\u6574\u5408\u591A\u89D2\u8272\u5354\u4F5C\u548C AI \u81EA\u4E3B\u529F\u80FD
                  </p>
                </div>
              </div>
              
              <!-- \u767C\u9001\u5E33\u865F\u914D\u7F6E -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-2xl">\u{1F4E4}</span>
                  <div>
                    <h3 class="font-semibold text-white">\u767C\u9001\u5E33\u865F</h3>
                    <p class="text-sm text-slate-400">\u9078\u64C7\u7528\u65BC\u767C\u9001\u6D88\u606F\u7684\u5E33\u865F</p>
                  </div>
                </div>
                
                <div class="space-y-2">
                  @for (account of senderAccounts(); track account.phone) {
                    <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden">
                          @if (account.avatar) {
                            <img [src]="account.avatar" alt="Avatar" class="w-full h-full object-cover">
                          } @else {
                            <span class="text-cyan-400">{{ account.username?.charAt(0) || '?' }}</span>
                          }
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ account.username || account.phone }}</div>
                          <div class="text-xs text-slate-400">\u4ECA\u65E5: {{ account.sentToday || 0 }}/{{ account.dailyLimit || 50 }} \u689D</div>
                        </div>
                      </div>
                      <span class="flex items-center gap-1 text-emerald-400 text-sm">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        \u5728\u7DDA
                      </span>
                    </div>
                  } @empty {
                    <div class="text-center py-8 text-slate-400">
                      <div class="text-3xl mb-2">\u{1F4E4}</div>
                      <p>\u6C92\u6709\u53EF\u7528\u7684\u767C\u9001\u5E33\u865F</p>
                      <p class="text-sm text-slate-500">\u8ACB\u5728\u5E33\u865F\u7BA1\u7406\u4E2D\u6DFB\u52A0\u4E26\u8A2D\u7F6E\u70BA\u300C\u767C\u9001\u300D\u89D2\u8272</p>
                    </div>
                  }
                </div>
              </div>
              
              <!-- AI \u6A21\u578B\u72C0\u614B -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">\u{1F9E0}</span>
                    <div>
                      <h3 class="font-semibold text-white">AI \u6A21\u578B</h3>
                      <p class="text-sm text-slate-400">\u7576\u524D\u4F7F\u7528\u7684 AI \u6A21\u578B</p>
                    </div>
                  </div>
                  <button (click)="activeTab.set('models')"
                          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
                    \u914D\u7F6E\u6A21\u578B \u2192
                  </button>
                </div>
                
                @if (aiService.defaultModel()) {
                  <div class="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">
                      {{ getProviderIcon(aiService.defaultModel()!.provider) }}
                    </div>
                    <div class="flex-1">
                      <div class="font-medium text-white">{{ aiService.defaultModel()!.modelName }}</div>
                      <div class="text-sm text-slate-400">{{ getProviderName(aiService.defaultModel()!.provider) }}</div>
                    </div>
                    <span class="flex items-center gap-1 text-emerald-400">
                      <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      \u5DF2\u9023\u63A5
                    </span>
                  </div>
                } @else {
                  <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">\u26A0\uFE0F</span>
                      <div>
                        <div class="font-medium text-amber-400">\u672A\u914D\u7F6E AI \u6A21\u578B</div>
                        <div class="text-sm text-slate-400">\u8ACB\u5148\u6DFB\u52A0 AI \u6A21\u578B\u624D\u80FD\u4F7F\u7528\u81EA\u52D5\u804A\u5929\u529F\u80FD</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- \u4FDD\u5B58\u6309\u9215 -->
              <div class="flex justify-end">
                <button (click)="saveQuickSettings()"
                        class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg">
                  \u{1F4BE} \u4FDD\u5B58\u8A2D\u7F6E
                </button>
              </div>
            </div>
          }
          @case ('models') {
            <!-- \u6A21\u578B\u914D\u7F6E -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- \u672C\u5730 AI \u5340\u57DF (\u63A8\u85A6) -->
              <div class="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u{1F999}</span> \u672C\u5730 AI
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">\u63A8\u85A6 - \u514D\u8CBB\u7121\u9650</span>
                  </h3>
                  <button (click)="showAddLocalModel.set(true)"
                          class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
                    + \u6DFB\u52A0\u672C\u5730 AI
                  </button>
                </div>
                
                <div class="space-y-3">
                  @for (model of localModels(); track model.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <span class="text-2xl">\u{1F999}</span>
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ $any(model).displayName || model.modelName }}</div>
                          <div class="text-xs text-slate-400 truncate max-w-xs">{{ model.apiEndpoint }}</div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-3">
                        @if (model.isConnected) {
                          <span class="flex items-center gap-1 text-emerald-400 text-sm">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            \u5DF2\u9023\u63A5
                          </span>
                        } @else {
                          <span class="text-amber-400 text-sm">\u672A\u6E2C\u8A66</span>
                        }
                        
                        <button (click)="testModel(model)"
                                [disabled]="aiService.testingModelIds().has(model.id)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                          @if (aiService.testingModelIds().has(model.id)) {
                            <span class="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            \u6E2C\u8A66\u4E2D...
                          } @else {
                            \u6E2C\u8A66
                          }
                        </button>
                        <button (click)="setAsDefault(model)"
                                class="px-3 py-1 text-sm rounded-lg transition-colors"
                                [class]="aiService.defaultModel()?.id === model.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'">
                          {{ aiService.defaultModel()?.id === model.id ? '\u9ED8\u8A8D' : '\u8A2D\u70BA\u9ED8\u8A8D' }}
                        </button>
                        <button (click)="deleteModel(model)"
                                class="text-red-400 hover:text-red-300 p-1">
                          \u2715
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-6 text-slate-400">
                      <p class="text-sm mb-3">\u4F7F\u7528\u672C\u5730 Ollama \u53EF\u514D\u8CBB\u7121\u9650\u8ABF\u7528 AI</p>
                      <button (click)="showAddLocalModel.set(true)"
                              class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        \u{1F999} \u5FEB\u901F\u914D\u7F6E\u672C\u5730 AI
                      </button>
                    </div>
                  }
                </div>
              </div>
              
              <!-- \u96F2\u7AEF AI \u5340\u57DF -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u2601\uFE0F</span> \u96F2\u7AEF AI
                  </h3>
                  <button (click)="showAddModel.set(true)"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + \u6DFB\u52A0\u96F2\u7AEF\u6A21\u578B
                  </button>
                </div>
                
                <div class="space-y-3">
                  @for (model of cloudModels(); track model.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                             [class.bg-emerald-500/20]="model.provider === 'openai'"
                             [class.bg-purple-500/20]="model.provider === 'claude'"
                             [class.bg-blue-500/20]="model.provider === 'gemini'">
                          <span class="text-2xl">{{ getProviderIcon(model.provider) }}</span>
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ $any(model).displayName || model.modelName }}</div>
                          <div class="text-sm text-slate-400">{{ getProviderName(model.provider) }}</div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-3">
                        @if (model.isConnected) {
                          <span class="flex items-center gap-1 text-emerald-400 text-sm">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            \u5DF2\u9023\u63A5
                          </span>
                        } @else {
                          <span class="text-slate-500 text-sm">\u672A\u9023\u63A5</span>
                        }
                        
                        <button (click)="testModel(model)"
                                [disabled]="aiService.testingModelIds().has(model.id)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                          @if (aiService.testingModelIds().has(model.id)) {
                            <span class="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            \u6E2C\u8A66\u4E2D...
                          } @else {
                            \u6E2C\u8A66
                          }
                        </button>
                        <button (click)="setAsDefault(model)"
                                class="px-3 py-1 text-sm rounded-lg transition-colors"
                                [class]="aiService.defaultModel()?.id === model.id ? 'bg-purple-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'">
                          {{ aiService.defaultModel()?.id === model.id ? '\u9ED8\u8A8D' : '\u8A2D\u70BA\u9ED8\u8A8D' }}
                        </button>
                        <button (click)="deleteModel(model)"
                                class="text-red-400 hover:text-red-300 p-1">
                          \u2715
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-6 text-slate-400">
                      <p class="text-sm mb-3">\u6DFB\u52A0 OpenAI\u3001Claude \u6216 Gemini \u7B49\u96F2\u7AEF\u6A21\u578B</p>
                      <button (click)="showAddModel.set(true)"
                              class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30">
                        + \u6DFB\u52A0\u96F2\u7AEF\u6A21\u578B
                      </button>
                    </div>
                  }
                </div>
                
                <!-- \u6A21\u578B\u7528\u9014\u5206\u914D -->
                @if (aiService.models().length > 0) {
                  <div class="mt-6 pt-6 border-t border-slate-700/50">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-sm font-medium text-white">\u6A21\u578B\u7528\u9014\u5206\u914D</h4>
                      @if (isSavingUsage()) {
                        <span class="text-xs text-emerald-400 flex items-center gap-1">
                          <span class="animate-spin">\u27F3</span> \u4FDD\u5B58\u4E2D...
                        </span>
                      } @else if (usageSaved()) {
                        <span class="text-xs text-emerald-400 flex items-center gap-1">
                          \u2713 \u5DF2\u4FDD\u5B58
                        </span>
                      }
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">\u610F\u5716\u8B58\u5225</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().intentRecognition"
                                (change)="onModelUsageChange('intentRecognition', $event)">
                          <option value="">\u9078\u64C7\u6A21\u578B</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().intentRecognition">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">\u65E5\u5E38\u5C0D\u8A71</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().dailyChat"
                                (change)="onModelUsageChange('dailyChat', $event)">
                          <option value="">\u9078\u64C7\u6A21\u578B</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().dailyChat">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">\u591A\u89D2\u8272\u5287\u672C</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().multiRoleScript"
                                (change)="onModelUsageChange('multiRoleScript', $event)">
                          <option value="">\u9078\u64C7\u6A21\u578B</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().multiRoleScript">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-3">\u{1F4A1} \u9078\u64C7\u5F8C\u81EA\u52D5\u4FDD\u5B58\uFF0C\u4E0D\u540C\u7528\u9014\u53EF\u4EE5\u4F7F\u7528\u4E0D\u540C\u7684 AI \u6A21\u578B</p>
                  </div>
                }
              </div>
              
              <!-- \u{1F50A} P1: \u8A9E\u97F3\u8F38\u51FA\u914D\u7F6E (TTS) -->
              <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u{1F50A}</span> \u8A9E\u97F3\u8F38\u51FA (TTS)
                    <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">\u53EF\u9078</span>
                  </h3>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" 
                           [(ngModel)]="ttsEnabled" 
                           (change)="saveTtsSettings()"
                           class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    <span class="ms-3 text-sm font-medium text-slate-300">{{ ttsEnabled ? '\u5DF2\u555F\u7528' : '\u5DF2\u95DC\u9589' }}</span>
                  </label>
                </div>
                
                <p class="text-sm text-slate-400 mb-4">\u555F\u7528\u5F8C\uFF0CAI \u56DE\u8986\u5C07\u81EA\u52D5\u8F49\u63DB\u70BA\u8A9E\u97F3\u64AD\u653E</p>
                
                @if (ttsEnabled) {
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">TTS \u670D\u52D9\u7AEF\u9EDE</label>
                      <input type="text" 
                             [(ngModel)]="ttsEndpoint"
                             placeholder="http://localhost:9881"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                      <p class="text-xs text-slate-500 mt-1">\u652F\u6301 GPT-SoVITS\u3001VITS \u7B49\u672C\u5730\u8A9E\u97F3\u670D\u52D9</p>
                    </div>
                    
                    <div class="flex gap-3">
                      <button (click)="testTtsConnection()"
                              [disabled]="isTestingTts()"
                              class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2">
                        @if (isTestingTts()) {
                          <span class="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                          \u6E2C\u8A66\u4E2D...
                        } @else {
                          \u{1F517} \u6E2C\u8A66\u9023\u63A5
                        }
                      </button>
                      
                      @if (ttsConnected()) {
                        <button (click)="testTtsVoice()"
                                class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2">
                          \u{1F50A} \u8A66\u807D\u8A9E\u97F3
                        </button>
                      }
                    </div>
                    
                    @if (ttsConnected()) {
                      <div class="flex items-center gap-2 text-emerald-400 text-sm">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        TTS \u670D\u52D9\u5DF2\u9023\u63A5
                        @if (ttsLatency() > 0) {
                          <span class="text-slate-500">\xB7 \u5EF6\u9072: {{ ttsLatency() }}ms</span>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="text-center py-4 text-slate-400">
                    <p class="text-sm">\u958B\u555F\u5F8C\u53EF\u914D\u7F6E GPT-SoVITS \u7B49\u8A9E\u97F3\u670D\u52D9\uFF0C\u8B93 AI \u64C1\u6709\u8A9E\u97F3\u80FD\u529B</p>
                  </div>
                }
              </div>
            </div>
          }
          
          @case ('persona') {
            <!-- \u{1F3AD} AI \u4EBA\u683C\uFF08\u878D\u5408\uFF1A\u5C0D\u8A71\u7B56\u7565 + \u667A\u80FD\u898F\u5247 + \u591A\u89D2\u8272\uFF09 -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- \u4EBA\u683C\u6A21\u677F\u9078\u64C7 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u{1F3AD}</span> \u9078\u64C7 AI \u4EBA\u683C
                  </h3>
                  <button class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + \u81EA\u5B9A\u7FA9\u4EBA\u683C
                  </button>
                </div>
                
                <div class="grid grid-cols-4 gap-4">
                  @for (template of personaTemplates; track template.id) {
                    <button (click)="selectPersonaTemplate(template.id)"
                            class="p-5 rounded-xl text-center transition-all border-2"
                            [class.border-purple-500]="selectedPersonaTemplate() === template.id"
                            [class.bg-purple-500/10]="selectedPersonaTemplate() === template.id"
                            [class.border-transparent]="selectedPersonaTemplate() !== template.id"
                            [class.bg-slate-700/50]="selectedPersonaTemplate() !== template.id"
                            [class.hover:bg-slate-700]="selectedPersonaTemplate() !== template.id">
                      <div class="text-3xl mb-2">{{ template.icon }}</div>
                      <div class="font-medium"
                           [class.text-purple-400]="selectedPersonaTemplate() === template.id"
                           [class.text-white]="selectedPersonaTemplate() !== template.id">
                        {{ template.name }}
                      </div>
                      <div class="text-xs text-slate-400 mt-1">{{ template.description }}</div>
                    </button>
                  }
                </div>
              </div>
              
              <!-- \u5C0D\u8A71\u98A8\u683C\u8A2D\u5B9A -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>\u{1F4AC}</span> \u5C0D\u8A71\u98A8\u683C
                </h3>
                
                <div class="grid grid-cols-2 gap-6">
                  <!-- \u5DE6\u5074\uFF1A\u98A8\u683C\u9078\u64C7 -->
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                      @for (style of conversationStyles; track style.id) {
                        <button (click)="setStyle(style.id); markStrategyDirty()"
                                class="p-4 rounded-xl text-center transition-all border-2"
                                [class.border-purple-500]="currentStyle() === style.id"
                                [class.bg-purple-500/10]="currentStyle() === style.id"
                                [class.border-transparent]="currentStyle() !== style.id"
                                [class.bg-slate-700/50]="currentStyle() !== style.id">
                          <div class="text-2xl mb-1">{{ style.icon }}</div>
                          <div class="text-sm font-medium"
                               [class.text-purple-400]="currentStyle() === style.id"
                               [class.text-white]="currentStyle() !== style.id">
                            {{ style.label }}
                          </div>
                        </button>
                      }
                    </div>
                    
                    <!-- \u56DE\u8986\u9577\u5EA6 -->
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">\u56DE\u8986\u9577\u5EA6</label>
                      <div class="flex gap-2">
                        @for (len of ['short', 'medium', 'long']; track len) {
                          <button (click)="setResponseLength(len); markStrategyDirty()"
                                  class="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                                  [class.bg-purple-500]="responseLength() === len"
                                  [class.text-white]="responseLength() === len"
                                  [class.bg-slate-700]="responseLength() !== len"
                                  [class.text-slate-300]="responseLength() !== len">
                            {{ len === 'short' ? '\u7C21\u77ED' : len === 'medium' ? '\u9069\u4E2D' : '\u8A73\u7D30' }}
                          </button>
                        }
                      </div>
                    </div>
                    
                    <!-- Emoji \u8A2D\u7F6E -->
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer"
                           (click)="toggleEmoji(); markStrategyDirty()">
                      <div>
                        <div class="text-white text-sm">\u4F7F\u7528 Emoji \u8868\u60C5</div>
                        <div class="text-xs text-slate-400">\u5728\u56DE\u8986\u4E2D\u6DFB\u52A0\u8868\u60C5</div>
                      </div>
                      <input type="checkbox" [checked]="useEmoji()"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600 pointer-events-none">
                    </label>
                  </div>
                  
                  <!-- \u53F3\u5074\uFF1A\u81EA\u5B9A\u7FA9\u4EBA\u8A2D -->
                  <div>
                    <label class="text-sm text-slate-400 block mb-2">\u81EA\u5B9A\u7FA9\u4EBA\u8A2D\u63D0\u793A\u8A5E</label>
                    <textarea 
                      rows="6"
                      [value]="customPersona()"
                      (input)="onPersonaInput($event)"
                      placeholder="\u4F8B\u5982\uFF1A\u4F60\u662F\u4E00\u4F4D\u5C08\u696D\u7684\u92B7\u552E\u9867\u554F\uFF0C\u5177\u67095\u5E74\u884C\u696D\u7D93\u9A57\uFF0C\u64C5\u9577\u89E3\u7B54\u5BA2\u6236\u7591\u554F..."
                      class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                    </textarea>
                    <p class="text-xs text-slate-500 mt-2">\u{1F4A1} \u63D0\u793A\uFF1A\u9078\u64C7\u4EBA\u683C\u6A21\u677F\u6703\u81EA\u52D5\u586B\u5145\u6B64\u9805</p>
                  </div>
                </div>
              </div>
              
              <!-- \u667A\u80FD\u884C\u70BA\u898F\u5247 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>\u26A1</span> \u667A\u80FD\u884C\u70BA
                    <span class="text-xs text-slate-500 font-normal">\u6839\u64DA\u60C5\u6CC1\u81EA\u52D5\u89F8\u767C\u76F8\u61C9\u52D5\u4F5C</span>
                  </h3>
                </div>
                
                <div class="space-y-3">
                  @for (rule of defaultRules; track rule.id) {
                    <label class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">{{ rule.icon }}</span>
                        <div>
                          <div class="text-white">{{ rule.name }}</div>
                          <div class="text-xs text-slate-400">{{ rule.description }}</div>
                        </div>
                      </div>
                      <input type="checkbox" [checked]="rule.isActive"
                             (change)="toggleRule(rule.id)"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600 cursor-pointer">
                    </label>
                  }
                </div>
                
                <button class="mt-4 w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-purple-500 transition-colors">
                  + \u6DFB\u52A0\u81EA\u5B9A\u7FA9\u884C\u70BA\u898F\u5247
                </button>
              </div>
              
              <!-- AI \u9810\u89BD -->
              <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>\u{1F4AC}</span> AI \u56DE\u8986\u9810\u89BD
                </h3>
                <div class="bg-slate-900/50 rounded-xl p-4">
                  <div class="mb-3">
                    <span class="text-xs text-slate-500">\u7528\u6236:</span>
                    <p class="text-slate-300">\u4F60\u5011\u7684\u670D\u52D9\u591A\u5C11\u9322\uFF1F</p>
                  </div>
                  <div class="border-t border-slate-700 pt-3">
                    <span class="text-xs text-purple-400">AI ({{ getPersonaName() }}):</span>
                    <p class="text-white">{{ getPreviewResponse() }}</p>
                  </div>
                </div>
                <button (click)="regeneratePreview()"
                        class="mt-3 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                  \u{1F504} \u91CD\u65B0\u751F\u6210\u9810\u89BD
                </button>
              </div>
              
              <!-- \u4FDD\u5B58\u6309\u9215 -->
              <div class="flex justify-between items-center bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 sticky bottom-4">
                <div class="text-sm text-slate-400">
                  @if (strategyDirty()) {
                    \u{1F4A1} \u4FEE\u6539\u5F8C\u8ACB\u8A18\u5F97\u4FDD\u5B58
                  } @else {
                    \u2713 \u6240\u6709\u66F4\u6539\u5DF2\u4FDD\u5B58
                  }
                </div>
                <div class="flex gap-3">
                  <button (click)="resetStrategy()"
                          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                    \u91CD\u7F6E
                  </button>
                  <button (click)="savePersonaSettings()"
                          [disabled]="!strategyDirty() || isSavingStrategy()"
                          class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    @if (isSavingStrategy()) {
                      <span class="animate-spin">\u27F3</span> \u4FDD\u5B58\u4E2D...
                    } @else {
                      \u{1F4BE} \u4FDD\u5B58\u4EBA\u683C\u8A2D\u5B9A
                    }
                  </button>
                </div>
              </div>
            </div>
          }
          
          @case ('stats') {
            <!-- \u4F7F\u7528\u7D71\u8A08 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- \u4ECA\u65E5\u7D71\u8A08 -->
              <div class="grid grid-cols-4 gap-4">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-cyan-400">{{ aiService.stats().today.conversations }}</div>
                  <div class="text-sm text-slate-400">\u4ECA\u65E5\u5C0D\u8A71</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-emerald-400">{{ aiService.stats().today.intentsRecognized }}</div>
                  <div class="text-sm text-slate-400">\u610F\u5716\u8B58\u5225</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-purple-400">{{ aiService.stats().today.conversions }}</div>
                  <div class="text-sm text-slate-400">\u8F49\u5316</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-orange-400">\xA5{{ aiService.stats().today.cost.toFixed(2) }}</div>
                  <div class="text-sm text-slate-400">\u6210\u672C</div>
                </div>
              </div>
              
              <!-- \u9031\u7D71\u8A08 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4">\u672C\u9031\u6982\u89BD</h3>
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <div class="text-4xl font-bold text-white mb-1">
                      {{ aiService.stats().weekly.conversations }}
                    </div>
                    <div class="text-slate-400">\u7E3D\u5C0D\u8A71</div>
                  </div>
                  <div>
                    <div class="text-4xl font-bold text-emerald-400 mb-1">
                      {{ (aiService.stats().weekly.conversionRate * 100).toFixed(1) }}%
                    </div>
                    <div class="text-slate-400">\u8F49\u5316\u7387</div>
                  </div>
                </div>
              </div>
              
              <!-- \u{1F195} \u667A\u80FD\u7CFB\u7D71\u72C0\u614B\u9762\u677F -->
              <div class="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">\u{1F9E0}</span>
                    <h3 class="font-semibold text-white">AI \u667A\u80FD\u7CFB\u7D71\u72C0\u614B</h3>
                    @if (autonomousModeEnabled()) {
                      <span class="px-2 py-0.5 text-xs bg-emerald-500/30 text-emerald-400 rounded-full">\u904B\u884C\u4E2D</span>
                    } @else {
                      <span class="px-2 py-0.5 text-xs bg-slate-500/30 text-slate-400 rounded-full">\u5DF2\u95DC\u9589</span>
                    }
                  </div>
                  <button (click)="goToSmartMarketing()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-2">
                    <span>\u{1F4CA}</span> \u67E5\u770B\u8A73\u7D30\u7D71\u8A08
                  </button>
                </div>
                
                <div class="grid grid-cols-3 gap-4">
                  <!-- \u8A18\u61B6\u7CFB\u7D71 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u{1F4AD}</span>
                      <span class="text-sm font-medium text-white">\u5C0D\u8A71\u8A18\u61B6</span>
                    </div>
                    <div class="text-2xl font-bold text-cyan-400">{{ smartSystemStats().memories }}</div>
                    <div class="text-xs text-slate-400">\u689D\u8A18\u61B6</div>
                  </div>
                  
                  <!-- \u6A19\u7C64\u7CFB\u7D71 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u{1F3F7}\uFE0F</span>
                      <span class="text-sm font-medium text-white">\u5BA2\u6236\u6A19\u7C64</span>
                    </div>
                    <div class="text-2xl font-bold text-purple-400">{{ smartSystemStats().tags }}</div>
                    <div class="text-xs text-slate-400">\u500B\u6A19\u7C64</div>
                  </div>
                  
                  <!-- \u60C5\u7DD2\u5206\u6790 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u{1F60A}</span>
                      <span class="text-sm font-medium text-white">\u60C5\u7DD2\u5206\u6790</span>
                    </div>
                    <div class="text-2xl font-bold text-orange-400">{{ smartSystemStats().emotions }}</div>
                    <div class="text-xs text-slate-400">\u6B21\u5206\u6790</div>
                  </div>
                  
                  <!-- \u5DE5\u4F5C\u6D41 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u{1F504}</span>
                      <span class="text-sm font-medium text-white">\u81EA\u52D5\u5316\u6D41\u7A0B</span>
                    </div>
                    <div class="text-2xl font-bold text-emerald-400">{{ smartSystemStats().workflows }}</div>
                    <div class="text-xs text-slate-400">\u6B21\u57F7\u884C</div>
                  </div>
                  
                  <!-- \u8DDF\u9032\u4EFB\u52D9 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u23F0</span>
                      <span class="text-sm font-medium text-white">\u5F85\u8DDF\u9032</span>
                    </div>
                    <div class="text-2xl font-bold text-amber-400">{{ smartSystemStats().followups }}</div>
                    <div class="text-xs text-slate-400">\u500B\u4EFB\u52D9</div>
                  </div>
                  
                  <!-- \u77E5\u8B58\u5B78\u7FD2 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">\u{1F4DA}</span>
                      <span class="text-sm font-medium text-white">\u77E5\u8B58\u5EAB</span>
                    </div>
                    <div class="text-2xl font-bold text-blue-400">{{ smartSystemStats().knowledge }}</div>
                    <div class="text-xs text-slate-400">\u689D\u5B78\u7FD2</div>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-slate-700/50">
                  <button (click)="refreshSmartSystemStats()" 
                          class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors">
                    \u{1F504} \u5237\u65B0\u7D71\u8A08
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- \u6DFB\u52A0\u96F2\u7AEF\u6A21\u578B\u5C0D\u8A71\u6846 -->
      @if (showAddModel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-6">\u6DFB\u52A0\u96F2\u7AEF AI \u6A21\u578B</h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">\u9078\u64C7\u4F9B\u61C9\u5546</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (provider of providers; track provider.id) {
                    <button (click)="newModelProvider.set(provider.id)"
                            class="p-3 rounded-lg text-center transition-all border-2"
                            [class.border-purple-500]="newModelProvider() === provider.id"
                            [class.bg-purple-500/10]="newModelProvider() === provider.id"
                            [class.border-transparent]="newModelProvider() !== provider.id"
                            [class.bg-slate-700]="newModelProvider() !== provider.id">
                      <div class="text-2xl mb-1">{{ provider.icon }}</div>
                      <div class="text-xs"
                           [class.text-purple-400]="newModelProvider() === provider.id"
                           [class.text-slate-300]="newModelProvider() !== provider.id">
                        {{ provider.name }}
                      </div>
                    </button>
                  }
                </div>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">\u9078\u64C7\u6A21\u578B *</label>
                <select [(ngModel)]="newModelName"
                        class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="">\u8ACB\u9078\u64C7\u6A21\u578B</option>
                  @for (model of currentPresetModels(); track model.name) {
                    <option [value]="model.name">{{ model.displayName }}</option>
                  }
                </select>
                <p class="text-xs text-slate-500 mt-1">\u{1F4A1} \u6A21\u578B\u540D\u7A31\u5C07\u81EA\u52D5\u683C\u5F0F\u5316\uFF0C\u7121\u9700\u64D4\u5FC3\u5927\u5C0F\u5BEB</p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">API Key *</label>
                <input type="password" 
                       [(ngModel)]="newModelApiKey"
                       placeholder="sk-..."
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">\u986F\u793A\u540D\u7A31 (\u53EF\u9078)</label>
                <input type="text" 
                       [(ngModel)]="newModelDisplayName"
                       placeholder="\u5982 \u6211\u7684 GPT-4"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="showAddModel.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                \u53D6\u6D88
              </button>
              <button (click)="saveNewModel()"
                      class="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                \u6DFB\u52A0
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- \u6DFB\u52A0\u672C\u5730 AI \u5C0D\u8A71\u6846 -->
      @if (showAddLocalModel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-emerald-500/30">
            <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
              \u{1F999} \u6DFB\u52A0\u672C\u5730 AI
            </h3>
            <p class="text-slate-400 text-sm mb-6">\u914D\u7F6E Ollama \u6216\u5176\u4ED6\u672C\u5730 AI \u670D\u52D9</p>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">API \u7AEF\u9EDE *</label>
                <input type="text" 
                       [(ngModel)]="localModelEndpoint"
                       placeholder="https://your-ollama.ts.net/api/chat"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                <p class="text-xs text-slate-500 mt-1">
                  \u{1F4A1} \u4F7F\u7528 Tailscale Funnel \u53EF\u5BE6\u73FE\u9060\u7A0B\u8A2A\u554F\u672C\u5730 Ollama
                </p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">\u6A21\u578B\u540D\u7A31 *</label>
                <input type="text" 
                       [(ngModel)]="localModelName"
                       placeholder="qwen2.5, llama3.2, mistral"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                <p class="text-xs text-slate-500 mt-1">
                  \u5728 Ollama \u4E2D\u904B\u884C <code class="text-emerald-400">ollama list</code> \u67E5\u770B\u53EF\u7528\u6A21\u578B
                </p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">\u986F\u793A\u540D\u7A31 (\u53EF\u9078)</label>
                <input type="text" 
                       [(ngModel)]="localModelDisplayName"
                       placeholder="\u6211\u7684\u672C\u5730 AI"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <!-- \u6E2C\u8A66\u9023\u63A5\u6309\u9215 -->
              <button (click)="testLocalConnection()"
                      [disabled]="isTestingLocal()"
                      class="w-full py-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2">
                @if (isTestingLocal()) {
                  <span class="animate-spin">\u27F3</span> \u6B63\u5728\u6E2C\u8A66\u9023\u63A5...
                } @else {
                  \u{1F517} \u6E2C\u8A66\u9023\u63A5
                }
              </button>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="showAddLocalModel.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                \u53D6\u6D88
              </button>
              <button (click)="saveLocalModel()"
                      class="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors">
                \u4FDD\u5B58
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AICenterComponent, { className: "AICenterComponent", filePath: "src/ai-center/ai-center.component.ts", lineNumber: 1077 });
})();

// src/views/ai-center-view.component.ts
var AiCenterViewComponent = class _AiCenterViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.membershipService = inject(MembershipService);
    this.aiService = inject(AiChatService);
    this.activeTab = signal("config", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
  }
  ngOnInit() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) {
      this.activeTab.set(tab);
    }
    this.aiService.loadSettings();
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 導航
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  // 設置活動標籤
  setActiveTab(tab) {
    this.activeTab.set(tab);
  }
  static {
    this.\u0275fac = function AiCenterViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AiCenterViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AiCenterViewComponent, selectors: [["app-ai-center-view"]], decls: 1, vars: 0, consts: [[3, "tabChange", "navigate"]], template: function AiCenterViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-ai-center", 0);
        \u0275\u0275listener("tabChange", function AiCenterViewComponent_Template_app_ai_center_tabChange_0_listener($event) {
          return ctx.setActiveTab($event);
        })("navigate", function AiCenterViewComponent_Template_app_ai_center_navigate_0_listener($event) {
          return ctx.navigateTo($event);
        });
        \u0275\u0275elementEnd();
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      AICenterComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AiCenterViewComponent, [{
    type: Component,
    args: [{
      selector: "app-ai-center-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        AICenterComponent
      ],
      template: `
    <app-ai-center
      (tabChange)="setActiveTab($event)"
      (navigate)="navigateTo($event)">
    </app-ai-center>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AiCenterViewComponent, { className: "AiCenterViewComponent", filePath: "src/views/ai-center-view.component.ts", lineNumber: 34 });
})();

export {
  AiCenterViewComponent
};
//# sourceMappingURL=chunk-E33ER4A4.js.map
