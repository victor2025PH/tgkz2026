import {
  DialogService,
  ResourceService
} from "./chunk-CTKGMQYJ.js";
import {
  AccountManagementService
} from "./chunk-X2TRLAAL.js";
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
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule,
  DatePipe,
  DecimalPipe
} from "./chunk-BTHEVO76.js";
import {
  MembershipService,
  ToastService
} from "./chunk-P26VRYR4.js";
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
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
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

// src/search-discovery/search-discovery.component.ts
var _c0 = () => [1, 2, 3, 4, 5];
var _forTrack0 = ($index, $item) => $item.id;
function _forTrack1($index, $item) {
  return this.getResourceTrackId($item, $index);
}
function SearchDiscoveryComponent_Conditional_17_Conditional_7_For_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 40);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_17_Conditional_7_For_3_Template_button_click_0_listener() {
      const acc_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.selectAccount(acc_r4));
    });
    \u0275\u0275element(1, "span", 34);
    \u0275\u0275elementStart(2, "span", 41);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const acc_r4 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-green-400", acc_r4.status === "Online")("bg-slate-400", acc_r4.status !== "Online");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(acc_r4.phone);
  }
}
function SearchDiscoveryComponent_Conditional_17_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37)(1, "div", 38);
    \u0275\u0275repeaterCreate(2, SearchDiscoveryComponent_Conditional_17_Conditional_7_For_3_Template, 4, 5, "button", 39, _forTrack0);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.mergedAccounts());
  }
}
function SearchDiscoveryComponent_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 10)(1, "button", 33);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_17_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showAccountSelector.set(!ctx_r1.showAccountSelector()));
    });
    \u0275\u0275element(2, "span", 34);
    \u0275\u0275elementStart(3, "span", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 36);
    \u0275\u0275text(6, "\u25BC");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(7, SearchDiscoveryComponent_Conditional_17_Conditional_7_Template, 4, 0, "div", 37);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r5 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-green-400", account_r5.status === "Online")("bg-slate-400", account_r5.status !== "Online");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r5.phone);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.showAccountSelector() ? 7 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 11);
    \u0275\u0275text(1, "\u26A0\uFE0F \u7121\u53EF\u7528\u5E33\u865F");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 12);
    \u0275\u0275text(1, " \u{1F504} \u641C\u7D22\u4E2D... ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 13);
    \u0275\u0275text(1, " \u2705 \u5C31\u7DD2 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_27_Conditional_1_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 48);
    \u0275\u0275listener("mousedown", function SearchDiscoveryComponent_Conditional_27_Conditional_1_For_5_Template_button_mousedown_0_listener() {
      const kw_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.quickSearch(kw_r7));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const kw_r7 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", kw_r7, " ");
  }
}
function SearchDiscoveryComponent_Conditional_27_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42)(1, "div", 44);
    \u0275\u0275text(2, "\u{1F550} \u6700\u8FD1\u641C\u7D22");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 45);
    \u0275\u0275repeaterCreate(4, SearchDiscoveryComponent_Conditional_27_Conditional_1_For_5_Template, 2, 1, "button", 47, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.mergedHistoryKeywords().slice(0, 5));
  }
}
function SearchDiscoveryComponent_Conditional_27_For_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 49);
    \u0275\u0275listener("mousedown", function SearchDiscoveryComponent_Conditional_27_For_7_Template_button_mousedown_0_listener() {
      const kw_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.quickSearch(kw_r9));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const kw_r9 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", kw_r9, " ");
  }
}
function SearchDiscoveryComponent_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 19);
    \u0275\u0275conditionalCreate(1, SearchDiscoveryComponent_Conditional_27_Conditional_1_Template, 6, 0, "div", 42);
    \u0275\u0275elementStart(2, "div", 43)(3, "div", 44);
    \u0275\u0275text(4, "\u{1F525} \u71B1\u9580\u641C\u7D22");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 45);
    \u0275\u0275repeaterCreate(6, SearchDiscoveryComponent_Conditional_27_For_7_Template, 2, 1, "button", 46, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.mergedHistoryKeywords().length > 0 ? 1 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r1.hotKeywords);
  }
}
function SearchDiscoveryComponent_For_36_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 54);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const source_r11 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275classMap(source_r11.tagClass);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(source_r11.tag);
  }
}
function SearchDiscoveryComponent_For_36_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 50)(1, "input", 51);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_For_36_Template_input_change_1_listener() {
      const source_r11 = \u0275\u0275restoreView(_r10).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleSource(source_r11.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 52);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(6, SearchDiscoveryComponent_For_36_Conditional_6_Template, 2, 3, "span", 53);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const source_r11 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classMap(source_r11.disabled ? "bg-slate-800/50 border border-slate-700/30 cursor-not-allowed opacity-50" : ctx_r1.selectedSources().includes(source_r11.id) ? "bg-cyan-500/20 border border-cyan-500/50 cursor-pointer" : "bg-slate-700/30 border border-slate-700 hover:bg-slate-700/50 cursor-pointer");
    \u0275\u0275property("title", source_r11.disabled ? "\u8A72\u529F\u80FD\u6B63\u5728\u958B\u767C\u4E2D\uFF0C\u656C\u8ACB\u671F\u5F85" : "");
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r1.selectedSources().includes(source_r11.id))("disabled", source_r11.disabled);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(source_r11.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(source_r11.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(source_r11.tag ? 6 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 24)(1, "span", 69);
    \u0275\u0275text(2, "\u7576\u524D\u641C\u7D22\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 70);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" \u{1F50D} ", ctx_r1.currentKeyword(), " ");
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 71);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 72);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u{1F195} ", ctx_r1.newDiscoveredCount(), " \u500B\u65B0\u767C\u73FE");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u{1F504} ", ctx_r1.existingCount(), " \u500B\u5DF2\u77E5");
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 57)(1, "span", 73);
    \u0275\u0275text(2, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r1.searchProgress(), " ");
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 58)(1, "span", 74);
    \u0275\u0275text(2, "\u{1F4CA}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u6B63\u5728\u7372\u53D6\u6210\u54E1\u6578\u7B49\u8A73\u60C5... ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 64);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.activeFilterCount(), " ");
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 67)(1, "div")(2, "label", 75);
    \u0275\u0275text(3, "\u6210\u54E1\u6578\u7BC4\u570D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 24)(5, "input", 76);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_input_change_5_listener($event) {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.filterMemberMin.set($event.target.value ? +$event.target.value : null));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 77);
    \u0275\u0275text(7, "-");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "input", 78);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_input_change_8_listener($event) {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.filterMemberMax.set($event.target.value ? +$event.target.value : null));
    });
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div")(10, "label", 75);
    \u0275\u0275text(11, "\u4F86\u6E90\u6E20\u9053");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "select", 79);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_select_change_12_listener($event) {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.filterSource.set($event.target.value));
    });
    \u0275\u0275elementStart(13, "option", 60);
    \u0275\u0275text(14, "\u5168\u90E8\u4F86\u6E90");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "option", 80);
    \u0275\u0275text(16, "TG \u5B98\u65B9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "option", 81);
    \u0275\u0275text(18, "\u4E2D\u6587\u641C\u7D22");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 82);
    \u0275\u0275text(20, "\u672C\u5730\u7D22\u5F15");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(21, "div")(22, "label", 75);
    \u0275\u0275text(23, "\u52A0\u5165\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "select", 79);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_select_change_24_listener($event) {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.filterJoinStatus.set($event.target.value));
    });
    \u0275\u0275elementStart(25, "option", 60);
    \u0275\u0275text(26, "\u5168\u90E8\u72C0\u614B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "option", 83);
    \u0275\u0275text(28, "\u5DF2\u52A0\u5165");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "option", 84);
    \u0275\u0275text(30, "\u672A\u52A0\u5165");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(31, "div")(32, "label", 75);
    \u0275\u0275text(33, "\u5176\u4ED6\u9078\u9805");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 3)(35, "label", 85)(36, "input", 86);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_input_change_36_listener($event) {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.filterHasId.set($event.target.checked));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "span", 87);
    \u0275\u0275text(38, "\u53EA\u986F\u793A\u6709 ID");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(39, "button", 88);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_27_Template_button_click_39_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.resetFilters());
    });
    \u0275\u0275text(40, " \u91CD\u7F6E\u7BE9\u9078 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275property("value", ctx_r1.filterMemberMin() || "");
    \u0275\u0275advance(3);
    \u0275\u0275property("value", ctx_r1.filterMemberMax() || "");
    \u0275\u0275advance(4);
    \u0275\u0275property("value", ctx_r1.filterSource());
    \u0275\u0275advance(12);
    \u0275\u0275property("value", ctx_r1.filterJoinStatus());
    \u0275\u0275advance(12);
    \u0275\u0275property("checked", ctx_r1.filterHasId());
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_28_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 91)(1, "span", 92);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "div", 93);
    \u0275\u0275elementStart(4, "button", 94);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_28_Conditional_10_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.batchSaveSelected());
    });
    \u0275\u0275text(5, " \u2B50 \u6536\u85CF\u9078\u4E2D ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 95);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_28_Conditional_10_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r15);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.copySelectedIds());
    });
    \u0275\u0275text(7, " \u{1F4CB} \u8907\u88FDID ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \u2713 \u5DF2\u9078 ", ctx_r1.selectedCount(), " \u9805 ");
  }
}
function SearchDiscoveryComponent_Conditional_42_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 68)(1, "div", 89)(2, "span", 69);
    \u0275\u0275text(3, "\u6279\u91CF\u64CD\u4F5C:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "button", 90);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_28_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectAllVisible());
    });
    \u0275\u0275text(5, " \u2611\uFE0F \u5168\u9078\u672C\u9801 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 90);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_28_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.clearSelection());
    });
    \u0275\u0275text(7, " \u2610 \u53D6\u6D88\u5168\u9078 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 90);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Conditional_28_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.invertSelection());
    });
    \u0275\u0275text(9, " \u21C6 \u53CD\u9078 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(10, SearchDiscoveryComponent_Conditional_42_Conditional_28_Conditional_10_Template, 8, 1, "div", 91);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r1.selectedCount() > 0 ? 10 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_42_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27)(1, "div", 2)(2, "div", 3);
    \u0275\u0275conditionalCreate(3, SearchDiscoveryComponent_Conditional_42_Conditional_3_Template, 5, 1, "div", 24);
    \u0275\u0275elementStart(4, "span", 55);
    \u0275\u0275text(5, " \u5171 ");
    \u0275\u0275elementStart(6, "span", 56);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " \u500B\u7D50\u679C ");
    \u0275\u0275conditionalCreate(9, SearchDiscoveryComponent_Conditional_42_Conditional_9_Template, 4, 2);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, SearchDiscoveryComponent_Conditional_42_Conditional_10_Template, 4, 1, "span", 57);
    \u0275\u0275conditionalCreate(11, SearchDiscoveryComponent_Conditional_42_Conditional_11_Template, 4, 0, "span", 58);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 24)(13, "select", 59);
    \u0275\u0275twoWayListener("ngModelChange", function SearchDiscoveryComponent_Conditional_42_Template_select_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r1.filterType, $event) || (ctx_r1.filterType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(14, "option", 60);
    \u0275\u0275text(15, "\u5168\u90E8\u985E\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "option", 61);
    \u0275\u0275text(17, "\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "option", 62);
    \u0275\u0275text(19, "\u983B\u9053");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "button", 63);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.showAdvancedFilter.set(!ctx_r1.showAdvancedFilter()));
    });
    \u0275\u0275text(21, " \u{1F39B}\uFE0F \u9AD8\u7D1A\u7BE9\u9078 ");
    \u0275\u0275conditionalCreate(22, SearchDiscoveryComponent_Conditional_42_Conditional_22_Template, 2, 1, "span", 64);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "button", 65);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Template_button_click_23_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.batchSave());
    });
    \u0275\u0275text(24, " \u2B50 \u6279\u91CF\u6536\u85CF ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "button", 66);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_42_Template_button_click_25_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.exportResults());
    });
    \u0275\u0275text(26);
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(27, SearchDiscoveryComponent_Conditional_42_Conditional_27_Template, 41, 5, "div", 67);
    \u0275\u0275conditionalCreate(28, SearchDiscoveryComponent_Conditional_42_Conditional_28_Template, 11, 1, "div", 68);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r1.currentKeyword() ? 3 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.mergedResources().length);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.newDiscoveredCount() > 0 || ctx_r1.existingCount() > 0 ? 9 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.searchProgress() ? 10 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isFetchingDetails() ? 11 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.filterType);
    \u0275\u0275advance(7);
    \u0275\u0275classMap(ctx_r1.showAdvancedFilter() || ctx_r1.activeFilterCount() > 0 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50" : "bg-slate-700/50 text-slate-300 border border-slate-700 hover:border-slate-600");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.activeFilterCount() > 0 ? 22 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275classMap(ctx_r1.filteredResources().length > 0 ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-slate-600/30 text-slate-500 cursor-not-allowed");
    \u0275\u0275property("disabled", ctx_r1.filteredResources().length === 0);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F4E4} \u5C0E\u51FA\u5168\u90E8 (", ctx_r1.filteredResources().length, ") ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.showAdvancedFilter() ? 27 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.filteredResources().length > 0 ? 28 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_44_For_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 96)(1, "div", 97);
    \u0275\u0275element(2, "div", 98);
    \u0275\u0275elementStart(3, "div", 99);
    \u0275\u0275element(4, "div", 100)(5, "div", 101)(6, "div", 102);
    \u0275\u0275elementEnd()()();
  }
}
function SearchDiscoveryComponent_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275repeaterCreate(1, SearchDiscoveryComponent_Conditional_44_For_2_Template, 7, 0, "div", 96, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275repeater(\u0275\u0275pureFunction0(0, _c0));
  }
}
function SearchDiscoveryComponent_Conditional_45_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r16 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 103)(1, "div", 104);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p", 105);
    \u0275\u0275text(4, "\u641C\u7D22\u5931\u6557");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 106);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 107);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_45_Conditional_1_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r16);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.doSearch());
    });
    \u0275\u0275text(8, " \u{1F504} \u91CD\u8A66 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.mergedSearchError().message);
  }
}
function SearchDiscoveryComponent_Conditional_45_Conditional_2_For_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 113);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_45_Conditional_2_For_10_Template_button_click_0_listener() {
      const kw_r18 = \u0275\u0275restoreView(_r17).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.quickSearch(kw_r18));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const kw_r18 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", kw_r18, " ");
  }
}
function SearchDiscoveryComponent_Conditional_45_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 104);
    \u0275\u0275text(1, "\u{1F50D}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "p", 108);
    \u0275\u0275text(3, "\u958B\u59CB\u641C\u7D22\u767C\u73FE\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 109);
    \u0275\u0275text(5, "\u8F38\u5165\u95DC\u9375\u8A5E\u641C\u7D22 Telegram \u7FA4\u7D44\u548C\u983B\u9053");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 110)(7, "span", 111);
    \u0275\u0275text(8, "\u8A66\u8A66\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(9, SearchDiscoveryComponent_Conditional_45_Conditional_2_For_10_Template, 2, 1, "button", 112, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275repeater(ctx_r1.hotKeywords.slice(0, 5));
  }
}
function SearchDiscoveryComponent_Conditional_45_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 30);
    \u0275\u0275conditionalCreate(1, SearchDiscoveryComponent_Conditional_45_Conditional_1_Template, 9, 1, "div", 103)(2, SearchDiscoveryComponent_Conditional_45_Conditional_2_Template, 11, 0);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.mergedSearchError().hasError ? 1 : 2);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 118);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const size_r20 = ctx.$implicit;
    \u0275\u0275property("value", size_r20);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(size_r20);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 128);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 133);
    \u0275\u0275text(1, " \u2705 \u5DF2\u52A0\u5165 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 134);
    \u0275\u0275text(1, " \u{1F195} \u65B0\u767C\u73FE ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_15_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 135);
    \u0275\u0275text(1, " \u{1F504} \u5DF2\u77E5 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r23 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "a", 155);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_18_Template_a_click_0_listener($event) {
      \u0275\u0275restoreView(_r23);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("href", "https://t.me/" + resource_r22.username, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" @", resource_r22.username, " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_22_Template(rf, ctx) {
  if (rf & 1) {
    const _r24 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "code", 156);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 157);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_22_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r24);
      const resource_r22 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.copyId(resource_r22, $event));
    });
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(resource_r22.telegram_id);
    \u0275\u0275advance();
    \u0275\u0275classMap(ctx_r1.copiedId() === resource_r22.telegram_id ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.copiedId() === resource_r22.telegram_id ? "\u2713 \u5DF2\u8907\u88FD" : "\u{1F4CB} \u8907\u88FD", " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "code", 158);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 159);
    \u0275\u0275text(3, " \u26A0\uFE0F \u9700\u52A0\u5165\u7372\u53D6 ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", resource_r22.username);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 111);
    \u0275\u0275text(1, "\u9700\u901A\u904E\u9080\u8ACB\u93C8\u63A5\u52A0\u5165");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r25 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 160);
    \u0275\u0275text(1, "|");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 161);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_25_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r25);
      const resource_r22 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.copyLink(resource_r22, $event));
    });
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.copiedLink() === resource_r22.username ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.copiedLink() === resource_r22.username ? "\u2713 \u5DF2\u8907\u88FD" : "\u{1F517} \u8907\u88FD\u9023\u7D50", " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 139);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(resource_r22.description);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 144);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "number");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F4C8} +", \u0275\u0275pipeBind1(2, 1, resource_r22.member_change), " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 145);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "number");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F4C9} ", \u0275\u0275pipeBind1(2, 1, resource_r22.member_change), " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_38_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 162);
    \u0275\u0275text(1, "\u2B50\u2B50\u2B50");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 163);
    \u0275\u0275text(3, "\u9AD8\u5EA6\u76F8\u95DC");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 162);
    \u0275\u0275text(1, "\u2B50\u2B50");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 9);
    \u0275\u0275text(3, "\u4E2D\u5EA6\u76F8\u95DC");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 162);
    \u0275\u0275text(1, "\u2B50");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 77);
    \u0275\u0275text(3, "\u4E00\u822C\u76F8\u95DC");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 148);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.getSourceLabel(resource_r22.discovery_source), " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 149);
    \u0275\u0275text(1, "\u2713 \u5DF2\u52A0\u5165");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_46_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 165);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext(2).$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", resource_r22.joined_phone.slice(0, 7), "***");
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_46_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 151)(1, "span", 164);
    \u0275\u0275text(2, " \u2705 \u5DF2\u52A0\u5165 ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_46_Conditional_3_Template, 2, 1, "span", 165);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275conditional(resource_r22.joined_phone ? 3 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 152)(1, "span", 73);
    \u0275\u0275text(2, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3, " \u52A0\u5165\u4E2D... ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_48_Template(rf, ctx) {
  if (rf & 1) {
    const _r26 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 166);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_48_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r26);
      const resource_r22 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openJoinDialog(resource_r22));
    });
    \u0275\u0275text(1, " \u{1F680} \u52A0\u5165 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r27 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 169);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Conditional_0_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r27);
      const resource_r22 = \u0275\u0275nextContext(2).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.extractMembers(resource_r22));
    });
    \u0275\u0275text(1, " \u{1F465} \u63D0\u53D6\u6210\u54E1 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 168);
    \u0275\u0275text(1, " \u{1F465} \u6210\u54E1 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Conditional_0_Template, 2, 0, "button", 167)(1, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Conditional_1_Template, 2, 0, "button", 168);
  }
  if (rf & 2) {
    const resource_r22 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275conditional(resource_r22.status === "joined" || resource_r22.status === "monitoring" ? 0 : 1);
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "button", 154);
    \u0275\u0275text(1, " \u{1F465} \u6210\u54E1 \u{1F512} ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_46_For_20_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 122);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Template_div_click_0_listener() {
      const resource_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openDetail(resource_r22));
    });
    \u0275\u0275elementStart(1, "div", 123)(2, "div", 124)(3, "label", 125);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Template_label_click_3_listener($event) {
      \u0275\u0275restoreView(_r21);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(4, "input", 126);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_46_For_20_Template_input_change_4_listener($event) {
      const resource_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.toggleBatchSelect(resource_r22, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 127);
    \u0275\u0275conditionalCreate(6, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_6_Template, 2, 0, "span", 128);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 129);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Template_button_click_7_listener($event) {
      const resource_r22 = \u0275\u0275restoreView(_r21).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      ctx_r1.toggleSave(resource_r22);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 130)(10, "div", 131)(11, "span", 132);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(13, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_13_Template, 2, 0, "span", 133);
    \u0275\u0275conditionalCreate(14, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_14_Template, 2, 0, "span", 134)(15, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_15_Template, 2, 0, "span", 135);
    \u0275\u0275elementStart(16, "h4", 136);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(18, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_18_Template, 2, 2, "a", 137);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 138)(20, "span", 69);
    \u0275\u0275text(21, "ID:");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(22, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_22_Template, 4, 4)(23, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_23_Template, 4, 1)(24, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_24_Template, 2, 0, "span", 111);
    \u0275\u0275conditionalCreate(25, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_25_Template, 4, 3);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(26, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_26_Template, 2, 1, "p", 139);
    \u0275\u0275elementStart(27, "div", 140)(28, "span", 141)(29, "span", 142);
    \u0275\u0275text(30, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span", 143);
    \u0275\u0275text(32);
    \u0275\u0275pipe(33, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275text(34, " \u6210\u54E1 ");
    \u0275\u0275conditionalCreate(35, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_35_Template, 3, 3, "span", 144)(36, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_36_Template, 3, 3, "span", 145);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "span", 146);
    \u0275\u0275conditionalCreate(38, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_38_Template, 4, 0)(39, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_39_Template, 4, 0)(40, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_40_Template, 4, 0);
    \u0275\u0275elementStart(41, "span", 147);
    \u0275\u0275text(42);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(43, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_43_Template, 2, 1, "span", 148);
    \u0275\u0275conditionalCreate(44, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_44_Template, 2, 0, "span", 149);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "div", 150);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_For_20_Template_div_click_45_listener($event) {
      \u0275\u0275restoreView(_r21);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275conditionalCreate(46, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_46_Template, 4, 1, "div", 151)(47, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_47_Template, 4, 0, "button", 152)(48, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_48_Template, 2, 0, "button", 153);
    \u0275\u0275conditionalCreate(49, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_49_Template, 2, 1)(50, SearchDiscoveryComponent_Conditional_46_For_20_Conditional_50_Template, 2, 0, "button", 154);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const resource_r22 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classMap(ctx_r1.isSelectedForBatch(resource_r22) ? "border-cyan-500/70 shadow-lg shadow-cyan-500/10" : "border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10");
    \u0275\u0275advance(4);
    \u0275\u0275property("checked", ctx_r1.isSelectedForBatch(resource_r22));
    \u0275\u0275advance();
    \u0275\u0275classMap(ctx_r1.isSelectedForBatch(resource_r22) ? "bg-cyan-500 border-cyan-500" : "border-slate-500 hover:border-cyan-400");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSelectedForBatch(resource_r22) ? 6 : -1);
    \u0275\u0275advance();
    \u0275\u0275classMap(resource_r22.is_saved ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-700/50 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400");
    \u0275\u0275property("title", resource_r22.is_saved ? "\u53D6\u6D88\u6536\u85CF" : "\u6536\u85CF");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r22.is_saved ? "\u2B50" : "\u2606", " ");
    \u0275\u0275advance(3);
    \u0275\u0275classMap(resource_r22.resource_type === "channel" ? "bg-purple-500/30 text-purple-300" : "bg-blue-500/30 text-blue-300");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r22.resource_type === "channel" ? "\u{1F4E2} \u983B\u9053" : "\u{1F465} \u7FA4\u7D44", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.status === "joined" || resource_r22.status === "monitoring" ? 13 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.is_new ? 14 : resource_r22.is_new === false ? 15 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(resource_r22.title);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.username ? 18 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(resource_r22.telegram_id ? 22 : resource_r22.username ? 23 : 24);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(resource_r22.username ? 25 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.description ? 26 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(33, 28, resource_r22.member_count));
    \u0275\u0275advance(3);
    \u0275\u0275conditional(resource_r22.member_change && resource_r22.member_change > 0 ? 35 : resource_r22.member_change && resource_r22.member_change < 0 ? 36 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275conditional((resource_r22.overall_score || 0) >= 0.7 ? 38 : (resource_r22.overall_score || 0) >= 0.5 ? 39 : 40);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" (", ctx_r1.formatScore(resource_r22.overall_score), ") ");
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.discovery_source ? 43 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r22.status === "joined" || resource_r22.status === "monitoring" ? 44 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(resource_r22.status === "joined" || resource_r22.status === "monitoring" ? 46 : ctx_r1.isJoining(resource_r22) ? 47 : 48);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(resource_r22.resource_type !== "channel" ? 49 : 50);
  }
}
function SearchDiscoveryComponent_Conditional_46_Conditional_21_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r29 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 173);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_Conditional_21_For_6_Template_button_click_0_listener() {
      const page_r30 = \u0275\u0275restoreView(_r29).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.goToPage(page_r30));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const page_r30 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classMap(page_r30 === ctx_r1.currentPage() ? "bg-cyan-500 text-white" : "bg-slate-700/50 text-slate-300 hover:bg-slate-600");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", page_r30, " ");
  }
}
function SearchDiscoveryComponent_Conditional_46_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r28 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 121)(1, "button", 170);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_Conditional_21_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.firstPage());
    });
    \u0275\u0275text(2, " \u23EE\uFE0F \u9996\u9801 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 170);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_Conditional_21_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.prevPage());
    });
    \u0275\u0275text(4, " \u25C0\uFE0F \u4E0A\u4E00\u9801 ");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(5, SearchDiscoveryComponent_Conditional_46_Conditional_21_For_6_Template, 2, 3, "button", 171, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementStart(7, "button", 170);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_Conditional_21_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.nextPage());
    });
    \u0275\u0275text(8, " \u4E0B\u4E00\u9801 \u25B6\uFE0F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 170);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_46_Conditional_21_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r28);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.lastPage());
    });
    \u0275\u0275text(10, " \u5C3E\u9801 \u23ED\uFE0F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 172);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275classMap(ctx_r1.currentPage() === 1 ? "bg-slate-700/30 text-slate-500 cursor-not-allowed" : "bg-slate-700/50 text-slate-300 hover:bg-slate-600");
    \u0275\u0275property("disabled", ctx_r1.currentPage() === 1);
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.currentPage() === 1 ? "bg-slate-700/30 text-slate-500 cursor-not-allowed" : "bg-slate-700/50 text-slate-300 hover:bg-slate-600");
    \u0275\u0275property("disabled", ctx_r1.currentPage() === 1);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r1.pageNumbers());
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.currentPage() === ctx_r1.totalPages() ? "bg-slate-700/30 text-slate-500 cursor-not-allowed" : "bg-slate-700/50 text-slate-300 hover:bg-slate-600");
    \u0275\u0275property("disabled", ctx_r1.currentPage() === ctx_r1.totalPages());
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.currentPage() === ctx_r1.totalPages() ? "bg-slate-700/30 text-slate-500 cursor-not-allowed" : "bg-slate-700/50 text-slate-300 hover:bg-slate-600");
    \u0275\u0275property("disabled", ctx_r1.currentPage() === ctx_r1.totalPages());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" \u7B2C ", ctx_r1.currentPage(), " / ", ctx_r1.totalPages(), " \u9801 ");
  }
}
function SearchDiscoveryComponent_Conditional_46_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 114)(1, "div", 21);
    \u0275\u0275text(2, " \u5171 ");
    \u0275\u0275elementStart(3, "span", 115);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " \u500B\u7D50\u679C\uFF0C \u986F\u793A\u7B2C ");
    \u0275\u0275elementStart(6, "span", 116);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " - ");
    \u0275\u0275elementStart(9, "span", 116);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275text(11, " \u500B ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 24)(13, "span", 21);
    \u0275\u0275text(14, "\u6BCF\u9801");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "select", 117);
    \u0275\u0275listener("ngModelChange", function SearchDiscoveryComponent_Conditional_46_Template_select_ngModelChange_15_listener($event) {
      \u0275\u0275restoreView(_r19);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.changePageSize($event));
    });
    \u0275\u0275repeaterCreate(16, SearchDiscoveryComponent_Conditional_46_For_17_Template, 2, 2, "option", 118, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 119);
    \u0275\u0275repeaterCreate(19, SearchDiscoveryComponent_Conditional_46_For_20_Template, 51, 30, "div", 120, _forTrack1, true);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(21, SearchDiscoveryComponent_Conditional_46_Conditional_21_Template, 13, 14, "div", 121);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.filteredResources().length);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate((ctx_r1.currentPage() - 1) * ctx_r1.pageSize() + 1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.Math.min(ctx_r1.currentPage() * ctx_r1.pageSize(), ctx_r1.filteredResources().length));
    \u0275\u0275advance(5);
    \u0275\u0275property("ngModel", ctx_r1.pageSize());
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.pageSizeOptions);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.pagedResources());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.filteredResources().length > ctx_r1.pageSize() ? 21 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 187);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275property("href", "https://t.me/" + resource_r32.username, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" @", resource_r32.username, " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_43_Template(rf, ctx) {
  if (rf & 1) {
    const _r33 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "code", 209);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 210);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Conditional_43_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r33);
      const resource_r32 = \u0275\u0275nextContext();
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.copyId(resource_r32, $event));
    });
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(resource_r32.telegram_id);
    \u0275\u0275advance();
    \u0275\u0275classMap(ctx_r1.copiedId() === resource_r32.telegram_id ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.copiedId() === resource_r32.telegram_id ? "\u2713" : "\u{1F4CB}", " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_44_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 212);
    \u0275\u0275text(1, "\u26A0\uFE0F \u9700\u52A0\u5165\u7372\u53D6ID");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_44_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 213);
    \u0275\u0275text(1, "\u{1F504} \u540C\u6B65\u4E2D");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "code", 211);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(2, SearchDiscoveryComponent_Conditional_47_Conditional_44_Conditional_2_Template, 2, 0, "span", 212)(3, SearchDiscoveryComponent_Conditional_47_Conditional_44_Conditional_3_Template, 2, 0, "span", 213);
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", resource_r32.username);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r32.status !== "joined" && resource_r32.status !== "monitoring" ? 2 : 3);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_45_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 77);
    \u0275\u0275text(1, "\u9700\u52A0\u5165\u7372\u53D6");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_45_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 214);
    \u0275\u0275text(1, "\u{1F504} \u540C\u6B65\u4E2D");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_45_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, SearchDiscoveryComponent_Conditional_47_Conditional_45_Conditional_0_Template, 2, 0, "span", 77)(1, SearchDiscoveryComponent_Conditional_47_Conditional_45_Conditional_1_Template, 2, 0, "span", 214);
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275conditional(resource_r32.status !== "joined" && resource_r32.status !== "monitoring" ? 0 : 1);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_50_Template(rf, ctx) {
  if (rf & 1) {
    const _r34 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "span", 193);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "button", 215);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Conditional_50_Template_button_click_2_listener($event) {
      \u0275\u0275restoreView(_r34);
      const resource_r32 = \u0275\u0275nextContext();
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.copyLink(resource_r32, $event));
    });
    \u0275\u0275text(3, " \u{1F517} ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", resource_r32.username);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 77);
    \u0275\u0275text(1, "\u7121");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_55_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 194);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275property("href", "https://t.me/" + resource_r32.username, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" t.me/", resource_r32.username, " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 77);
    \u0275\u0275text(1, "\u7121\u516C\u958B\u9023\u7D50");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2B50\u2B50\u2B50 ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2B50\u2B50 ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u2B50 ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_82_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u5DF2\u52A0\u5165\xB7\u76E3\u63A7\u4E2D ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u5DF2\u52A0\u5165 ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u52A0\u5165\u4E2D... ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u672A\u52A0\u5165 ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_86_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 189)(1, "h4", 190)(2, "span");
    \u0275\u0275text(3, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, " \u7FA4\u7D44\u63CF\u8FF0 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 216);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(resource_r32.description);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_93_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 202);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u4F86\u6E90\uFF1A", ctx_r1.getSourceLabel(resource_r32.discovery_source), " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_94_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 203);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u95DC\u9375\u8A5E\uFF1A", resource_r32.discovery_keyword, " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_95_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 202);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "date");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u767C\u73FE\u6642\u9593\uFF1A", \u0275\u0275pipeBind2(2, 1, resource_r32.created_at, "yyyy-MM-dd HH:mm"), " ");
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_100_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 206);
    \u0275\u0275text(1, " \u{1F517} \u6253\u958B Telegram ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275property("href", "https://t.me/" + resource_r32.username, \u0275\u0275sanitizeUrl);
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_104_Template(rf, ctx) {
  if (rf & 1) {
    const _r35 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 217);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Conditional_104_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r35);
      const resource_r32 = \u0275\u0275nextContext();
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.openJoinDialog(resource_r32);
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(1, " \u{1F680} \u52A0\u5165\u7FA4\u7D44 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_105_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r36 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 219);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Conditional_105_Conditional_0_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r36);
      const resource_r32 = \u0275\u0275nextContext(2);
      const ctx_r1 = \u0275\u0275nextContext();
      ctx_r1.extractMembers(resource_r32);
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(1, " \u{1F465} \u63D0\u53D6\u6210\u54E1 ");
    \u0275\u0275elementEnd();
  }
}
function SearchDiscoveryComponent_Conditional_47_Conditional_105_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, SearchDiscoveryComponent_Conditional_47_Conditional_105_Conditional_0_Template, 2, 0, "button", 218);
  }
  if (rf & 2) {
    const resource_r32 = \u0275\u0275nextContext();
    \u0275\u0275conditional(resource_r32.resource_type !== "channel" ? 0 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_47_Template(rf, ctx) {
  if (rf & 1) {
    const _r31 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 174);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275elementStart(1, "div", 175);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r31);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 176)(3, "div", 89)(4, "span", 177);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "h2", 178);
    \u0275\u0275text(7, "\u7FA4\u7D44\u8A73\u60C5");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 21);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 24)(11, "button", 179);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigatePrev());
    });
    \u0275\u0275text(12, " \u2190 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 180);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateNext());
    });
    \u0275\u0275text(14, " \u2192 ");
    \u0275\u0275elementEnd();
    \u0275\u0275element(15, "div", 181);
    \u0275\u0275elementStart(16, "button", 182);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(17, " \u2715 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 183)(19, "div", 184)(20, "div", 185);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 130)(23, "h3", 186);
    \u0275\u0275text(24);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(25, SearchDiscoveryComponent_Conditional_47_Conditional_25_Template, 2, 2, "a", 187);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "button", 188);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_26_listener() {
      const resource_r32 = \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleSave(resource_r32));
    });
    \u0275\u0275text(27);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "div", 189)(29, "h4", 190)(30, "span");
    \u0275\u0275text(31, "\u{1F4CA}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(32, " \u57FA\u672C\u4FE1\u606F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(33, "div", 191)(34, "div")(35, "div", 192);
    \u0275\u0275text(36, "\u985E\u578B");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "div", 193);
    \u0275\u0275text(38);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(39, "div")(40, "div", 192);
    \u0275\u0275text(41, "Telegram ID");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "div", 24);
    \u0275\u0275conditionalCreate(43, SearchDiscoveryComponent_Conditional_47_Conditional_43_Template, 4, 4)(44, SearchDiscoveryComponent_Conditional_47_Conditional_44_Template, 4, 2)(45, SearchDiscoveryComponent_Conditional_47_Conditional_45_Template, 2, 1);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(46, "div")(47, "div", 192);
    \u0275\u0275text(48, "Username");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "div", 24);
    \u0275\u0275conditionalCreate(50, SearchDiscoveryComponent_Conditional_47_Conditional_50_Template, 4, 1)(51, SearchDiscoveryComponent_Conditional_47_Conditional_51_Template, 2, 0, "span", 77);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(52, "div")(53, "div", 192);
    \u0275\u0275text(54, "\u9023\u7D50");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(55, SearchDiscoveryComponent_Conditional_47_Conditional_55_Template, 2, 2, "a", 194)(56, SearchDiscoveryComponent_Conditional_47_Conditional_56_Template, 2, 0, "span", 77);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(57, "div", 189)(58, "h4", 190)(59, "span");
    \u0275\u0275text(60, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(61, " \u6210\u54E1\u6578\u64DA ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(62, "div", 195)(63, "div", 196)(64, "div", 197);
    \u0275\u0275text(65);
    \u0275\u0275pipe(66, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(67, "div", 111);
    \u0275\u0275text(68, "\u7E3D\u6210\u54E1");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(69, "div", 196)(70, "div", 198);
    \u0275\u0275conditionalCreate(71, SearchDiscoveryComponent_Conditional_47_Conditional_71_Template, 1, 0)(72, SearchDiscoveryComponent_Conditional_47_Conditional_72_Template, 1, 0)(73, SearchDiscoveryComponent_Conditional_47_Conditional_73_Template, 1, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(74, "div", 199);
    \u0275\u0275text(75);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(76, "div", 72);
    \u0275\u0275text(77, "\u76F8\u95DC\u5EA6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(78, "div", 196)(79, "div", 200);
    \u0275\u0275text(80);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(81, "div", 111);
    \u0275\u0275conditionalCreate(82, SearchDiscoveryComponent_Conditional_47_Conditional_82_Template, 1, 0)(83, SearchDiscoveryComponent_Conditional_47_Conditional_83_Template, 1, 0)(84, SearchDiscoveryComponent_Conditional_47_Conditional_84_Template, 1, 0)(85, SearchDiscoveryComponent_Conditional_47_Conditional_85_Template, 1, 0);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275conditionalCreate(86, SearchDiscoveryComponent_Conditional_47_Conditional_86_Template, 7, 1, "div", 189);
    \u0275\u0275elementStart(87, "div", 201)(88, "h4", 190)(89, "span");
    \u0275\u0275text(90, "\u{1F3F7}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(91, " \u4F86\u6E90\u4FE1\u606F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(92, "div", 45);
    \u0275\u0275conditionalCreate(93, SearchDiscoveryComponent_Conditional_47_Conditional_93_Template, 2, 1, "span", 202);
    \u0275\u0275conditionalCreate(94, SearchDiscoveryComponent_Conditional_47_Conditional_94_Template, 2, 1, "span", 203);
    \u0275\u0275conditionalCreate(95, SearchDiscoveryComponent_Conditional_47_Conditional_95_Template, 3, 4, "span", 202);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(96, "div", 204)(97, "div", 24)(98, "button", 205);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_98_listener() {
      const resource_r32 = \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleSave(resource_r32));
    });
    \u0275\u0275text(99);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(100, SearchDiscoveryComponent_Conditional_47_Conditional_100_Template, 2, 1, "a", 206);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(101, "div", 24)(102, "button", 207);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_47_Template_button_click_102_listener() {
      \u0275\u0275restoreView(_r31);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetail());
    });
    \u0275\u0275text(103, " \u95DC\u9589 ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(104, SearchDiscoveryComponent_Conditional_47_Conditional_104_Template, 2, 0, "button", 208)(105, SearchDiscoveryComponent_Conditional_47_Conditional_105_Template, 1, 1);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const resource_r32 = ctx;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275classMap(resource_r32.resource_type === "channel" ? "bg-purple-500/30 text-purple-300" : "bg-blue-500/30 text-blue-300");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r32.resource_type === "channel" ? "\u{1F4E2} \u983B\u9053" : "\u{1F465} \u7FA4\u7D44", " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate2(" ", ctx_r1.selectedResourceIndex() + 1, " / ", ctx_r1.filteredResources().length, " ");
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.canNavigatePrev() ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-600 cursor-not-allowed");
    \u0275\u0275property("disabled", !ctx_r1.canNavigatePrev());
    \u0275\u0275advance(2);
    \u0275\u0275classMap(ctx_r1.canNavigateNext() ? "text-slate-400 hover:text-white hover:bg-slate-700" : "text-slate-600 cursor-not-allowed");
    \u0275\u0275property("disabled", !ctx_r1.canNavigateNext());
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate1(" ", resource_r32.title[0] || "?", " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(resource_r32.title);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r32.username ? 25 : -1);
    \u0275\u0275advance();
    \u0275\u0275classMap(resource_r32.is_saved ? "bg-yellow-500/20 text-yellow-400" : "bg-slate-700 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r32.is_saved ? "\u2B50" : "\u2606", " ");
    \u0275\u0275advance(11);
    \u0275\u0275textInterpolate(resource_r32.resource_type === "channel" ? "\u983B\u9053" : "\u7FA4\u7D44");
    \u0275\u0275advance(5);
    \u0275\u0275conditional(resource_r32.telegram_id ? 43 : resource_r32.username ? 44 : 45);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(resource_r32.username ? 50 : 51);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(resource_r32.username ? 55 : 56);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(66, 37, resource_r32.member_count));
    \u0275\u0275advance(6);
    \u0275\u0275conditional((resource_r32.overall_score || 0) >= 0.7 ? 71 : (resource_r32.overall_score || 0) >= 0.5 ? 72 : 73);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.formatScore(resource_r32.overall_score));
    \u0275\u0275advance(4);
    \u0275\u0275classMap(resource_r32.status === "joined" || resource_r32.status === "monitoring" ? "text-green-400" : "text-slate-400");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r32.status === "joined" || resource_r32.status === "monitoring" ? "\u2713" : "\u2014", " ");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(resource_r32.status === "monitoring" ? 82 : resource_r32.status === "joined" ? 83 : resource_r32.status === "joining" ? 84 : 85);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(resource_r32.description ? 86 : -1);
    \u0275\u0275advance(7);
    \u0275\u0275conditional(resource_r32.discovery_source ? 93 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r32.discovery_keyword ? 94 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r32.created_at ? 95 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275classMap(resource_r32.is_saved ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" : "bg-slate-700 text-slate-300 hover:bg-slate-600");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", resource_r32.is_saved ? "\u2B50 \u5DF2\u6536\u85CF" : "\u2606 \u6536\u85CF", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r32.username ? 100 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(resource_r32.status !== "joined" && resource_r32.status !== "monitoring" ? 104 : 105);
  }
}
function SearchDiscoveryComponent_Conditional_48_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 224);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx.title);
  }
}
function SearchDiscoveryComponent_Conditional_48_Conditional_6_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 234);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const resource_r38 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", resource_r38.username);
  }
}
function SearchDiscoveryComponent_Conditional_48_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 225)(1, "div", 89)(2, "div", 232);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 130)(5, "div", 233);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(7, SearchDiscoveryComponent_Conditional_48_Conditional_6_Conditional_7_Template, 2, 1, "div", 234);
    \u0275\u0275elementStart(8, "div", 235)(9, "span");
    \u0275\u0275text(10);
    \u0275\u0275pipe(11, "number");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const resource_r38 = ctx;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", (resource_r38.title == null ? null : resource_r38.title.charAt(0)) || "G", " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(resource_r38.title);
    \u0275\u0275advance();
    \u0275\u0275conditional(resource_r38.username ? 7 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u{1F465} ", \u0275\u0275pipeBind1(11, 4, resource_r38.member_count), " \u6210\u54E1");
  }
}
function SearchDiscoveryComponent_Conditional_48_For_12_Conditional_0_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 241);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const acc_r40 = \u0275\u0275nextContext(2).$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(acc_r40.display_name);
  }
}
function SearchDiscoveryComponent_Conditional_48_For_12_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r39 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 237)(1, "input", 238);
    \u0275\u0275listener("change", function SearchDiscoveryComponent_Conditional_48_For_12_Conditional_0_Template_input_change_1_listener() {
      \u0275\u0275restoreView(_r39);
      const acc_r40 = \u0275\u0275nextContext().$implicit;
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.joinDialogSelectedPhone.set(acc_r40.phone));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 239)(3, "div", 240);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(5, SearchDiscoveryComponent_Conditional_48_For_12_Conditional_0_Conditional_5_Template, 2, 1, "div", 241);
    \u0275\u0275elementEnd();
    \u0275\u0275element(6, "span", 242);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const acc_r40 = \u0275\u0275nextContext().$implicit;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275classMap(ctx_r1.joinDialogSelectedPhone() === acc_r40.phone ? "bg-cyan-500/20 border-2 border-cyan-500" : "bg-slate-700/30 border-2 border-transparent hover:bg-slate-700/50");
    \u0275\u0275advance();
    \u0275\u0275property("value", acc_r40.phone)("checked", ctx_r1.joinDialogSelectedPhone() === acc_r40.phone);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(acc_r40.phone);
    \u0275\u0275advance();
    \u0275\u0275conditional(acc_r40.display_name ? 5 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_48_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275conditionalCreate(0, SearchDiscoveryComponent_Conditional_48_For_12_Conditional_0_Template, 7, 6, "label", 236);
  }
  if (rf & 2) {
    const acc_r40 = ctx.$implicit;
    \u0275\u0275conditional(acc_r40.status === "Online" ? 0 : -1);
  }
}
function SearchDiscoveryComponent_Conditional_48_Template(rf, ctx) {
  if (rf & 1) {
    const _r37 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 220);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_48_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelJoinDialog());
    });
    \u0275\u0275elementStart(1, "div", 221);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_48_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r37);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 222)(3, "h3", 223);
    \u0275\u0275text(4, " \u{1F680} \u9078\u64C7\u52A0\u5165\u5E33\u865F ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(5, SearchDiscoveryComponent_Conditional_48_Conditional_5_Template, 2, 1, "p", 224);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(6, SearchDiscoveryComponent_Conditional_48_Conditional_6_Template, 12, 6, "div", 225);
    \u0275\u0275elementStart(7, "div", 226)(8, "div", 227);
    \u0275\u0275text(9, "\u9078\u64C7\u8981\u4F7F\u7528\u7684\u5E33\u865F\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 228);
    \u0275\u0275repeaterCreate(11, SearchDiscoveryComponent_Conditional_48_For_12_Template, 1, 1, null, null, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div", 229)(14, "button", 230);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_48_Template_button_click_14_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.cancelJoinDialog());
    });
    \u0275\u0275text(15, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "button", 231);
    \u0275\u0275listener("click", function SearchDiscoveryComponent_Conditional_48_Template_button_click_16_listener() {
      \u0275\u0275restoreView(_r37);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.confirmJoinFromDialog());
    });
    \u0275\u0275text(17, " \u78BA\u8A8D\u52A0\u5165 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_1_0;
    let tmp_2_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275conditional((tmp_1_0 = ctx_r1.joinDialogResource()) ? 5 : -1, tmp_1_0);
    \u0275\u0275advance();
    \u0275\u0275conditional((tmp_2_0 = ctx_r1.joinDialogResource()) ? 6 : -1, tmp_2_0);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r1.mergedAccounts());
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", !ctx_r1.joinDialogSelectedPhone());
  }
}
var SearchDiscoveryComponent = class _SearchDiscoveryComponent {
  constructor() {
    this.toast = inject(ToastService);
    this.ipc = inject(ElectronIpcService);
    this.accountService = inject(AccountManagementService);
    this.dialogService = inject(DialogService);
    this.groupService = null;
    this.Math = Math;
    this._internalAccounts = signal([], ...ngDevMode ? [{ debugName: "_internalAccounts" }] : []);
    this._internalResources = signal([], ...ngDevMode ? [{ debugName: "_internalResources" }] : []);
    this._internalSearching = signal(false, ...ngDevMode ? [{ debugName: "_internalSearching" }] : []);
    this._internalSelectedAccount = signal(null, ...ngDevMode ? [{ debugName: "_internalSelectedAccount" }] : []);
    this._internalSearchError = signal({ hasError: false, message: "" }, ...ngDevMode ? [{ debugName: "_internalSearchError" }] : []);
    this._historyKeywords = signal([], ...ngDevMode ? [{ debugName: "_historyKeywords" }] : []);
    this.ipcCleanup = [];
    this.searchProgress = signal("", ...ngDevMode ? [{ debugName: "searchProgress" }] : []);
    this.isFetchingDetails = signal(false, ...ngDevMode ? [{ debugName: "isFetchingDetails" }] : []);
    this.newDiscoveredCount = signal(0, ...ngDevMode ? [{ debugName: "newDiscoveredCount" }] : []);
    this.existingCount = signal(0, ...ngDevMode ? [{ debugName: "existingCount" }] : []);
    this.currentPage = signal(1, ...ngDevMode ? [{ debugName: "currentPage" }] : []);
    this.pageSize = signal(50, ...ngDevMode ? [{ debugName: "pageSize" }] : []);
    this.pageSizeOptions = [20, 50, 100, 200];
    this.searchTimeoutId = null;
    this.SEARCH_BASE_TIMEOUT_MS = 6e4;
    this.HEARTBEAT_TIMEOUT_MS = 15e3;
    this.lastProgressTime = 0;
    this.resources = input([], ...ngDevMode ? [{ debugName: "resources" }] : []);
    this.isSearching = input(false, ...ngDevMode ? [{ debugName: "isSearching" }] : []);
    this.selectedAccount = input(null, ...ngDevMode ? [{ debugName: "selectedAccount" }] : []);
    this.availableAccounts = input([], ...ngDevMode ? [{ debugName: "availableAccounts" }] : []);
    this.historyKeywords = input([], ...ngDevMode ? [{ debugName: "historyKeywords" }] : []);
    this.currentKeyword = input("", ...ngDevMode ? [{ debugName: "currentKeyword" }] : []);
    this.searchError = input({ hasError: false, message: "" }, ...ngDevMode ? [{ debugName: "searchError" }] : []);
    this.savedResourceIds = input(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "savedResourceIds" }] : []);
    this.mergedAccounts = computed(() => {
      const internal = this._internalAccounts();
      const fromInput = this.availableAccounts();
      if (internal.length > 0)
        return internal;
      return fromInput;
    }, ...ngDevMode ? [{ debugName: "mergedAccounts" }] : []);
    this.mergedResources = computed(() => {
      const internal = this._internalResources();
      const fromInput = this.resources();
      if (internal.length > 0)
        return internal;
      return fromInput;
    }, ...ngDevMode ? [{ debugName: "mergedResources" }] : []);
    this.pagedResources = computed(() => {
      const all = this.filteredResources();
      const page = this.currentPage();
      const size = this.pageSize();
      const start = (page - 1) * size;
      const end = start + size;
      return all.slice(start, end);
    }, ...ngDevMode ? [{ debugName: "pagedResources" }] : []);
    this.totalPages = computed(() => {
      const total = this.filteredResources().length;
      const size = this.pageSize();
      return Math.ceil(total / size) || 1;
    }, ...ngDevMode ? [{ debugName: "totalPages" }] : []);
    this.pageNumbers = computed(() => {
      const total = this.totalPages();
      const current = this.currentPage();
      const pages = [];
      const start = Math.max(1, current - 2);
      const end = Math.min(total, current + 2);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    }, ...ngDevMode ? [{ debugName: "pageNumbers" }] : []);
    this.mergedSearching = computed(() => this._internalSearching() || this.isSearching(), ...ngDevMode ? [{ debugName: "mergedSearching" }] : []);
    this.mergedSelectedAccount = computed(() => this._internalSelectedAccount() || this.selectedAccount(), ...ngDevMode ? [{ debugName: "mergedSelectedAccount" }] : []);
    this.mergedSearchError = computed(() => {
      const internal = this._internalSearchError();
      if (internal.hasError)
        return internal;
      return this.searchError();
    }, ...ngDevMode ? [{ debugName: "mergedSearchError" }] : []);
    this.mergedHistoryKeywords = computed(() => {
      const internal = this._historyKeywords();
      const fromInput = this.historyKeywords();
      if (internal.length > 0)
        return internal;
      return fromInput;
    }, ...ngDevMode ? [{ debugName: "mergedHistoryKeywords" }] : []);
    this.searchEvent = output();
    this.selectAccountEvent = output();
    this.saveResourceEvent = output();
    this.unsaveResourceEvent = output();
    this.joinResourceEvent = output();
    this.extractMembersEvent = output();
    this.clearResultsEvent = output();
    this.searchQuery = "";
    this.filterType = "all";
    this.showAccountSelector = signal(false, ...ngDevMode ? [{ debugName: "showAccountSelector" }] : []);
    this.showSuggestions = signal(false, ...ngDevMode ? [{ debugName: "showSuggestions" }] : []);
    this.copiedId = signal("", ...ngDevMode ? [{ debugName: "copiedId" }] : []);
    this.copiedLink = signal("", ...ngDevMode ? [{ debugName: "copiedLink" }] : []);
    this.selectedSources = signal(["telegram", "jiso"], ...ngDevMode ? [{ debugName: "selectedSources" }] : []);
    this.showJoinAccountDialog = signal(false, ...ngDevMode ? [{ debugName: "showJoinAccountDialog" }] : []);
    this.joinDialogResource = signal(null, ...ngDevMode ? [{ debugName: "joinDialogResource" }] : []);
    this.joinDialogSelectedPhone = signal("", ...ngDevMode ? [{ debugName: "joinDialogSelectedPhone" }] : []);
    this.joiningResourceIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "joiningResourceIds" }] : []);
    this.showAdvancedFilter = signal(false, ...ngDevMode ? [{ debugName: "showAdvancedFilter" }] : []);
    this.filterMemberMin = signal(null, ...ngDevMode ? [{ debugName: "filterMemberMin" }] : []);
    this.filterMemberMax = signal(null, ...ngDevMode ? [{ debugName: "filterMemberMax" }] : []);
    this.filterSource = signal("all", ...ngDevMode ? [{ debugName: "filterSource" }] : []);
    this.filterJoinStatus = signal("all", ...ngDevMode ? [{ debugName: "filterJoinStatus" }] : []);
    this.filterHasId = signal(false, ...ngDevMode ? [{ debugName: "filterHasId" }] : []);
    this.showDetailDialog = signal(false, ...ngDevMode ? [{ debugName: "showDetailDialog" }] : []);
    this.selectedResource = signal(null, ...ngDevMode ? [{ debugName: "selectedResource" }] : []);
    this.selectedResourceIndex = signal(-1, ...ngDevMode ? [{ debugName: "selectedResourceIndex" }] : []);
    this.selectedForBatch = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "selectedForBatch" }] : []);
    this.searchSources = [
      { id: "telegram", name: "\u5B98\u65B9\u641C\u7D22", icon: "\u{1F4F1}", tag: "\u7A69\u5B9A", tagClass: "bg-green-500/20 text-green-400", disabled: false },
      { id: "jiso", name: "\u4E2D\u6587\u641C\u7D22", icon: "\u{1F50D}", tag: "\u63A8\u85A6", tagClass: "bg-yellow-500/20 text-yellow-400", disabled: false },
      { id: "tgstat", name: "TGStat", icon: "\u{1F4CA}", tag: "\u958B\u767C\u4E2D", tagClass: "bg-slate-600 text-slate-400", disabled: true },
      { id: "local", name: "\u672C\u5730\u7D22\u5F15", icon: "\u{1F4BE}", tag: null, tagClass: "", disabled: false }
    ];
    this.hotKeywords = ["\u652F\u4ED8", "USDT", "\u4EA4\u6613", "\u62DB\u8058", "\u4EE3\u8CFC", "\u52A0\u5BC6\u8CA8\u5E63", "\u96FB\u5F71", "\u8CC7\u6E90\u5206\u4EAB"];
    this.filteredResources = computed(() => {
      let result = this.mergedResources();
      if (this.filterType !== "all") {
        result = result.filter((r) => {
          if (this.filterType === "channel")
            return r.resource_type === "channel";
          return r.resource_type !== "channel";
        });
      }
      const minMember = this.filterMemberMin();
      const maxMember = this.filterMemberMax();
      if (minMember !== null && minMember > 0) {
        result = result.filter((r) => r.member_count >= minMember);
      }
      if (maxMember !== null && maxMember > 0) {
        result = result.filter((r) => r.member_count <= maxMember);
      }
      const sourceFilter = this.filterSource();
      if (sourceFilter !== "all") {
        result = result.filter((r) => r.discovery_source === sourceFilter);
      }
      const joinStatus = this.filterJoinStatus();
      if (joinStatus === "joined") {
        result = result.filter((r) => r.status === "joined" || r.status === "monitoring");
      } else if (joinStatus === "not_joined") {
        result = result.filter((r) => r.status !== "joined" && r.status !== "monitoring");
      }
      if (this.filterHasId()) {
        result = result.filter((r) => r.telegram_id && r.telegram_id.trim() !== "");
      }
      return result;
    }, ...ngDevMode ? [{ debugName: "filteredResources" }] : []);
    this.savedCount = computed(() => {
      return this.mergedResources().filter((r) => r.is_saved).length;
    }, ...ngDevMode ? [{ debugName: "savedCount" }] : []);
    this.canNavigatePrev = computed(() => this.selectedResourceIndex() > 0, ...ngDevMode ? [{ debugName: "canNavigatePrev" }] : []);
    this.canNavigateNext = computed(() => {
      const resources = this.filteredResources();
      return this.selectedResourceIndex() < resources.length - 1;
    }, ...ngDevMode ? [{ debugName: "canNavigateNext" }] : []);
    this.pendingJoinResource = null;
    this.selectedCount = computed(() => this.selectedForBatch().size, ...ngDevMode ? [{ debugName: "selectedCount" }] : []);
    this.activeFilterCount = computed(() => {
      let count = 0;
      if (this.filterType !== "all")
        count++;
      if (this.filterMemberMin() !== null && this.filterMemberMin() > 0)
        count++;
      if (this.filterMemberMax() !== null && this.filterMemberMax() > 0)
        count++;
      if (this.filterSource() !== "all")
        count++;
      if (this.filterJoinStatus() !== "all")
        count++;
      if (this.filterHasId())
        count++;
      return count;
    }, ...ngDevMode ? [{ debugName: "activeFilterCount" }] : []);
  }
  // ============ 追蹤鍵生成 ============
  /**
   * 生成資源的唯一追蹤鍵
   * 解決 NG0955 錯誤：確保每個資源有唯一鍵
   *
   * @param resource 資源對象
   * @param index 列表索引
   * @returns 唯一的追蹤鍵字串
   */
  getResourceTrackId(resource, index) {
    const parts = [`idx-${index}`];
    if (resource.id && resource.id !== 0) {
      parts.push(`id-${resource.id}`);
    }
    if (resource.telegram_id && resource.telegram_id.toString().trim() !== "") {
      parts.push(`tg-${resource.telegram_id}`);
    }
    if (resource.username && resource.username.trim() !== "") {
      parts.push(`u-${resource.username}`);
    }
    if (resource.source) {
      parts.push(`src-${resource.source}`);
    }
    return parts.join("_");
  }
  // ============ 生命週期 ============
  ngOnInit() {
    document.addEventListener("click", this.handleOutsideClick.bind(this));
    document.addEventListener("keydown", this.handleKeydown.bind(this));
    this.loadAccounts();
    this.setupIpcListeners();
    this.loadSearchHistory();
    this.restoreSearchResults();
  }
  // 🔧 P1: 保存搜索結果到 sessionStorage
  saveSearchResults() {
    try {
      const resources = this._internalResources();
      const query = this.searchQuery;
      if (resources.length > 0) {
        const data = {
          query,
          resources,
          timestamp: Date.now(),
          newCount: this.newDiscoveredCount(),
          existingCount: this.existingCount()
        };
        sessionStorage.setItem("search-discovery-results", JSON.stringify(data));
        console.log(`[SearchDiscovery] \u5DF2\u4FDD\u5B58 ${resources.length} \u500B\u641C\u7D22\u7D50\u679C\u5230 sessionStorage`);
      }
    } catch (e) {
      console.error("[SearchDiscovery] \u4FDD\u5B58\u641C\u7D22\u7D50\u679C\u5931\u6557:", e);
    }
  }
  // 🔧 P1: 從 sessionStorage 恢復搜索結果
  restoreSearchResults() {
    try {
      const saved = sessionStorage.getItem("search-discovery-results");
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - (data.timestamp || 0);
        if (age < 30 * 60 * 1e3) {
          this._internalResources.set(data.resources || []);
          this.searchQuery = data.query || "";
          this.newDiscoveredCount.set(data.newCount || 0);
          this.existingCount.set(data.existingCount || 0);
          console.log(`[SearchDiscovery] \u5DF2\u6062\u5FA9 ${data.resources?.length || 0} \u500B\u641C\u7D22\u7D50\u679C`);
        } else {
          sessionStorage.removeItem("search-discovery-results");
        }
      }
    } catch (e) {
      console.error("[SearchDiscovery] \u6062\u5FA9\u641C\u7D22\u7D50\u679C\u5931\u6557:", e);
    }
  }
  ngOnDestroy() {
    document.removeEventListener("click", this.handleOutsideClick.bind(this));
    document.removeEventListener("keydown", this.handleKeydown.bind(this));
    this.ipcCleanup.forEach((cleanup) => cleanup());
    this.clearSearchTimeout();
  }
  // 🔧 P0: 從服務獲取帳號
  loadAccounts() {
    const accounts = this.accountService.accounts();
    const onlineAccounts = accounts.filter((acc) => acc.status === "Online");
    this._internalAccounts.set(onlineAccounts.map((acc) => ({
      id: acc.id,
      phone: acc.phone,
      status: acc.status
    })));
    if (!this._internalSelectedAccount() && onlineAccounts.length > 0) {
      this._internalSelectedAccount.set({
        id: onlineAccounts[0].id,
        phone: onlineAccounts[0].phone,
        status: onlineAccounts[0].status
      });
    }
    console.log("[SearchDiscovery] \u8F09\u5165\u5E33\u865F:", onlineAccounts.length, "\u500B\u5728\u7DDA");
  }
  // 🔧 P0: 設置 IPC 監聯器
  setupIpcListeners() {
    const cleanup1 = this.ipc.on("accounts-updated", (accounts) => {
      const onlineAccounts = accounts.filter((acc) => acc.status === "Online");
      this._internalAccounts.set(onlineAccounts.map((acc) => ({
        id: acc.id,
        phone: acc.phone,
        status: acc.status
      })));
      const currentSelected = this._internalSelectedAccount();
      if (currentSelected) {
        const stillOnline = onlineAccounts.find((a) => a.id === currentSelected.id);
        if (!stillOnline && onlineAccounts.length > 0) {
          this._internalSelectedAccount.set({
            id: onlineAccounts[0].id,
            phone: onlineAccounts[0].phone,
            status: onlineAccounts[0].status
          });
        }
      } else if (onlineAccounts.length > 0) {
        this._internalSelectedAccount.set({
          id: onlineAccounts[0].id,
          phone: onlineAccounts[0].phone,
          status: onlineAccounts[0].status
        });
      }
      console.log("[SearchDiscovery] \u5E33\u865F\u66F4\u65B0:", onlineAccounts.length, "\u500B\u5728\u7DDA");
    });
    const cleanup2a = this.ipc.on("search-batch", (data) => {
      this.resetHeartbeat();
      if (data.success && data.groups) {
        const resources = data.groups.map((g, idx) => ({
          id: idx + 1,
          // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,
          // 🔧 P0: 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || g.members_count || 0,
          resource_type: g.type || "group",
          status: "discovered",
          overall_score: g.score,
          discovery_source: "search",
          discovery_keyword: this.searchQuery,
          source: g.source,
          // 保留來源標記
          link: g.link
          // 🔧 保留連結
        }));
        this._internalResources.set(resources);
        if (data.message) {
          this.searchProgress.set(data.message);
        }
        console.log(`[SearchDiscovery] \u6536\u5230\u6279\u6B21\u7D50\u679C: ${resources.length} \u500B (\u4F86\u6E90: ${data.source})`);
      }
    });
    const cleanup2 = this.ipc.on("search-results", (data) => {
      this.clearSearchTimeout();
      this._internalSearching.set(false);
      this.searchProgress.set("");
      this.isFetchingDetails.set(false);
      if (data.success && data.groups) {
        const resources = data.groups.map((g, idx) => ({
          id: idx + 1,
          // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,
          // 🔧 P0: 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || g.members_count || 0,
          resource_type: g.type || "group",
          // 🔧 P0-1: 從後端獲取狀態（已加入/未加入）
          status: g.status || "discovered",
          // 🔧 FIX: 同時檢查 joined_phone（前端）和 joined_by_phone（後端數據庫）
          joined_phone: g.joined_phone || g.joined_by_phone || null,
          overall_score: g.score,
          discovery_source: "search",
          discovery_keyword: this.searchQuery,
          source: g.source,
          // 保留來源標記
          link: g.link,
          // 🔧 保留連結
          // 🆕 搜索歷史相關
          is_new: g.is_new,
          // 是否為新發現
          member_change: g.member_change
          // 成員數變化
        }));
        this._internalResources.set(resources);
        this._internalSearchError.set({ hasError: false, message: "" });
        this.saveSearchResults();
        const newCount = data.new_count || 0;
        const existingCount = data.existing_count || 0;
        this.newDiscoveredCount.set(newCount);
        this.existingCount.set(existingCount);
        let message = `\u641C\u7D22\u5B8C\u6210\uFF01\u5171\u627E\u5230 ${resources.length} \u500B\u7D50\u679C`;
        if (newCount > 0) {
          message += `\uFF0C\u5176\u4E2D ${newCount} \u500B\u70BA\u65B0\u767C\u73FE`;
        }
        this.toast.success(message);
      } else {
        this._internalSearchError.set({
          hasError: true,
          message: data.error || "\u641C\u7D22\u5931\u6557"
        });
      }
    });
    const cleanup3 = this.ipc.on("search-error", (error) => {
      this.clearSearchTimeout();
      this._internalSearching.set(false);
      this.searchProgress.set("");
      this.isFetchingDetails.set(false);
      this._internalSearchError.set({
        hasError: true,
        message: error.message || "\u641C\u7D22\u8ACB\u6C42\u5931\u6557"
      });
      this.toast.error("\u641C\u7D22\u5931\u6557: " + (error.message || "\u672A\u77E5\u932F\u8AA4"));
    });
    const cleanup4 = this.ipc.on("jiso-search-progress", (data) => {
      this.resetHeartbeat();
      this.searchProgress.set(data.message);
      if (data.status === "basic_results" && data.data?.results) {
        const basicResources = data.data.results.map((g, idx) => ({
          id: idx + 1,
          // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,
          // 🔧 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || 0,
          // 可能為0，等待詳情更新
          resource_type: g.chat_type || g.type || "group",
          link: g.link,
          // 🔧 保留連結
          status: "discovered",
          overall_score: g.score,
          discovery_source: "search",
          discovery_keyword: this.searchQuery
        }));
        this._internalResources.set(basicResources);
        this.isFetchingDetails.set(true);
        this.toast.info(`\u5DF2\u8F09\u5165 ${basicResources.length} \u500B\u57FA\u790E\u7D50\u679C\uFF0C\u6B63\u5728\u7372\u53D6\u8A73\u60C5...`);
      } else if (data.status === "fetching_details") {
        this.isFetchingDetails.set(true);
      } else if (data.status === "completed") {
        this.isFetchingDetails.set(false);
        this.searchProgress.set("");
      }
    });
    const cleanup5 = this.ipc.on("join-and-monitor-complete", (data) => {
      if (data.resourceId) {
        this.joiningResourceIds.update((ids) => {
          const newIds = new Set(ids);
          newIds.delete(data.resourceId);
          return newIds;
        });
      }
      if (data.success) {
        const currentResources = this._internalResources();
        const updatedResources = currentResources.map((r) => {
          const isMatch = data.resourceId && r.id === data.resourceId || data.username && r.username === data.username || data.telegramId && r.telegram_id === data.telegramId;
          if (isMatch) {
            this.joiningResourceIds.update((ids) => {
              const newIds = new Set(ids);
              newIds.delete(r.id);
              return newIds;
            });
            return __spreadProps(__spreadValues({}, r), {
              status: "joined",
              member_count: data.memberCount || r.member_count,
              // 🔧 P2: 保存加入時使用的帳號
              joined_phone: data.phone || r.joined_phone
            });
          }
          return r;
        });
        this._internalResources.set(updatedResources);
        this.saveSearchResults();
        console.log(`[SearchDiscovery] \u8CC7\u6E90\u72C0\u614B\u5DF2\u66F4\u65B0: ${data.username || data.telegramId} \u2192 joined (${data.phone})`);
      } else {
        if (data.username || data.telegramId) {
          const currentResources = this._internalResources();
          currentResources.forEach((r) => {
            if (data.username && r.username === data.username || data.telegramId && r.telegram_id === data.telegramId) {
              this.joiningResourceIds.update((ids) => {
                const newIds = new Set(ids);
                newIds.delete(r.id);
                return newIds;
              });
            }
          });
        }
      }
    });
    this.ipcCleanup.push(cleanup1, cleanup2a, cleanup2, cleanup3, cleanup4, cleanup5);
  }
  // 🔧 P0: 加載搜索歷史
  loadSearchHistory() {
    try {
      const history = localStorage.getItem("search-history");
      if (history) {
        this._historyKeywords.set(JSON.parse(history));
      }
    } catch (e) {
      console.warn("[SearchDiscovery] \u52A0\u8F09\u641C\u7D22\u6B77\u53F2\u5931\u6557:", e);
    }
  }
  // 🔧 P0: 保存搜索歷史
  saveSearchHistory(keyword) {
    const history = this._historyKeywords();
    const updated = [keyword, ...history.filter((k) => k !== keyword)].slice(0, 10);
    this._historyKeywords.set(updated);
    try {
      localStorage.setItem("search-history", JSON.stringify(updated));
    } catch (e) {
      console.warn("[SearchDiscovery] \u4FDD\u5B58\u641C\u7D22\u6B77\u53F2\u5931\u6557:", e);
    }
  }
  // 🆕 鍵盤事件處理
  handleKeydown(event) {
    if (!this.showDetailDialog())
      return;
    switch (event.key) {
      case "Escape":
        this.closeDetail();
        break;
      case "ArrowLeft":
        if (this.canNavigatePrev()) {
          this.navigatePrev();
        }
        break;
      case "ArrowRight":
        if (this.canNavigateNext()) {
          this.navigateNext();
        }
        break;
    }
  }
  handleOutsideClick(event) {
    const target = event.target;
    if (!target.closest(".relative")) {
      this.showAccountSelector.set(false);
    }
  }
  // ============ 搜索操作 ============
  doSearch() {
    if (!this.searchQuery.trim()) {
      this.toast.warning("\u8ACB\u8F38\u5165\u641C\u7D22\u95DC\u9375\u8A5E");
      return;
    }
    if (this.selectedSources().length === 0) {
      this.toast.warning("\u8ACB\u81F3\u5C11\u9078\u64C7\u4E00\u500B\u641C\u7D22\u6E20\u9053");
      return;
    }
    const selectedAcc = this.mergedSelectedAccount();
    if (!selectedAcc) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u4E00\u500B\u5728\u7DDA\u5E33\u865F");
      this.loadAccounts();
      return;
    }
    const query = this.searchQuery.trim();
    const sources = this.selectedSources();
    console.log("[SearchDiscovery] \u958B\u59CB\u641C\u7D22:", { query, sources, account: selectedAcc.phone });
    this.clearSearchTimeout();
    this.resetPagination();
    this._internalSearching.set(true);
    this._internalSearchError.set({ hasError: false, message: "" });
    this.saveSearchHistory(query);
    this.lastProgressTime = Date.now();
    this.startHeartbeatCheck();
    this.ipc.send("search-groups", {
      keyword: query,
      sources,
      account_id: selectedAcc.id,
      account_phone: selectedAcc.phone,
      limit: 500
      // 🔧 增加到 500，支持更多結果（後端會分頁返回）
    });
    this.searchEvent.emit({
      query,
      sources
    });
  }
  // 🔧 P0: 清除搜索超時計時器
  clearSearchTimeout() {
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = null;
    }
  }
  // 🔧 P0: 心跳檢查機制 - 動態超時
  startHeartbeatCheck() {
    this.clearSearchTimeout();
    this.searchTimeoutId = setTimeout(() => {
      if (!this._internalSearching())
        return;
      const now = Date.now();
      const timeSinceLastProgress = now - this.lastProgressTime;
      const totalElapsed = now - (this.lastProgressTime - timeSinceLastProgress);
      if (timeSinceLastProgress > this.HEARTBEAT_TIMEOUT_MS) {
        console.warn("[SearchDiscovery] \u641C\u7D22\u8D85\u6642 - \u7121\u9032\u5EA6\u66F4\u65B0", {
          timeSinceLastProgress,
          totalElapsed
        });
        this.handleSearchTimeout();
      } else {
        this.startHeartbeatCheck();
      }
    }, 5e3);
  }
  // 🔧 P0: 處理搜索超時
  handleSearchTimeout() {
    this.clearSearchTimeout();
    this._internalSearching.set(false);
    this.searchProgress.set("");
    this.isFetchingDetails.set(false);
    this._internalSearchError.set({
      hasError: true,
      message: "\u641C\u7D22\u8D85\u6642\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66"
    });
    this.toast.warning("\u641C\u7D22\u8D85\u6642\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66");
  }
  // 🔧 P0: 重置心跳時間（收到進度事件時調用）
  resetHeartbeat() {
    this.lastProgressTime = Date.now();
  }
  quickSearch(keyword) {
    this.searchQuery = keyword;
    this.showSuggestions.set(false);
    this.doSearch();
  }
  // ============ 🔧 P0: 分頁控制方法 ============
  goToPage(page) {
    const total = this.totalPages();
    if (page >= 1 && page <= total) {
      this.currentPage.set(page);
    }
  }
  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }
  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }
  firstPage() {
    this.goToPage(1);
  }
  lastPage() {
    this.goToPage(this.totalPages());
  }
  changePageSize(size) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }
  // 🔧 P0: 搜索時重置分頁
  resetPagination() {
    this.currentPage.set(1);
  }
  toggleSource(sourceId) {
    const sourceConfig = this.searchSources.find((s) => s.id === sourceId);
    if (sourceConfig?.disabled) {
      console.log("\u26A0\uFE0F \u8A72\u641C\u7D22\u6E20\u9053\u6B63\u5728\u958B\u767C\u4E2D:", sourceId);
      return;
    }
    const current = this.selectedSources();
    if (current.includes(sourceId)) {
      this.selectedSources.set(current.filter((s) => s !== sourceId));
    } else {
      this.selectedSources.set([...current, sourceId]);
    }
  }
  hideSuggestions() {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }
  clearResults() {
    this.clearResultsEvent.emit();
  }
  // ============ 帳號操作 ============
  selectAccount(account) {
    this._internalSelectedAccount.set(account);
    this.selectAccountEvent.emit(account);
    this.showAccountSelector.set(false);
    if (this.pendingJoinResource) {
      const resource = this.pendingJoinResource;
      if (account.status !== "Online") {
        this.toast.warning(`\u5E33\u865F ${account.phone} \u672A\u9023\u63A5\uFF0C\u7121\u6CD5\u52A0\u5165\u7FA4\u7D44`);
        return;
      }
      setTimeout(() => {
        this.executeJoin(resource, account.phone);
      }, 100);
    }
  }
  // ============ 資源操作 ============
  // ============ 詳情彈窗操作 ============
  openDetail(resource) {
    const resources = this.filteredResources();
    const index = resources.findIndex((r) => r.telegram_id && r.telegram_id === resource.telegram_id || r.id && r.id === resource.id);
    this.selectedResource.set(resource);
    this.selectedResourceIndex.set(index);
    this.showDetailDialog.set(true);
  }
  closeDetail() {
    this.showDetailDialog.set(false);
    this.selectedResource.set(null);
    this.selectedResourceIndex.set(-1);
  }
  // 🆕 導航到上一個
  navigatePrev() {
    const resources = this.filteredResources();
    const currentIndex = this.selectedResourceIndex();
    if (currentIndex > 0) {
      const prevResource = resources[currentIndex - 1];
      this.selectedResource.set(prevResource);
      this.selectedResourceIndex.set(currentIndex - 1);
    }
  }
  // 🆕 導航到下一個
  navigateNext() {
    const resources = this.filteredResources();
    const currentIndex = this.selectedResourceIndex();
    if (currentIndex < resources.length - 1) {
      const nextResource = resources[currentIndex + 1];
      this.selectedResource.set(nextResource);
      this.selectedResourceIndex.set(currentIndex + 1);
    }
  }
  toggleSave(resource) {
    if (resource.is_saved) {
      this.unsaveResourceEvent.emit(resource);
    } else {
      this.saveResourceEvent.emit(resource);
    }
  }
  // 🔧 P0-2: 打開帳號選擇對話框
  openJoinDialog(resource) {
    console.log("[SearchDiscovery] \u6253\u958B\u52A0\u5165\u5C0D\u8A71\u6846:", resource.title);
    if (!resource.username && !resource.telegram_id) {
      this.toast.warning("\u7121\u6CD5\u52A0\u5165\uFF1A\u7F3A\u5C11\u7FA4\u7D44\u6A19\u8B58");
      return;
    }
    if (this.joiningResourceIds().has(resource.id)) {
      this.toast.warning("\u6B63\u5728\u52A0\u5165\u4E2D\uFF0C\u8ACB\u7A0D\u5019...");
      return;
    }
    const onlineAccounts = this.mergedAccounts().filter((acc) => acc.status === "Online");
    if (onlineAccounts.length === 0) {
      this.toast.warning("\u6C92\u6709\u5728\u7DDA\u5E33\u865F\uFF0C\u8ACB\u5148\u767B\u9304\u5E33\u865F");
      return;
    }
    if (onlineAccounts.length === 1) {
      this.executeJoin(resource, onlineAccounts[0].phone);
      return;
    }
    this.joinDialogResource.set(resource);
    this.joinDialogSelectedPhone.set("");
    this.showJoinAccountDialog.set(true);
  }
  // 🔧 P0-2: 確認加入（從對話框）
  confirmJoinFromDialog() {
    const resource = this.joinDialogResource();
    const phone = this.joinDialogSelectedPhone();
    if (!resource) {
      this.toast.warning("\u8ACB\u9078\u64C7\u8981\u52A0\u5165\u7684\u7FA4\u7D44");
      return;
    }
    if (!phone) {
      this.toast.warning("\u8ACB\u9078\u64C7\u8981\u4F7F\u7528\u7684\u5E33\u865F");
      return;
    }
    this.showJoinAccountDialog.set(false);
    this.executeJoin(resource, phone);
  }
  // 🔧 P0-2: 取消加入對話框
  cancelJoinDialog() {
    this.showJoinAccountDialog.set(false);
    this.joinDialogResource.set(null);
    this.joinDialogSelectedPhone.set("");
  }
  joinResource(resource) {
    console.log("[SearchDiscovery] \u52A0\u5165\u7FA4\u7D44:", resource.title, resource.username);
    if (!resource.username && !resource.telegram_id) {
      this.toast.warning("\u7121\u6CD5\u52A0\u5165\uFF1A\u7F3A\u5C11\u7FA4\u7D44\u6A19\u8B58");
      return;
    }
    if (this.joiningResourceIds().has(resource.id)) {
      this.toast.warning("\u6B63\u5728\u52A0\u5165\u4E2D\uFF0C\u8ACB\u7A0D\u5019...");
      return;
    }
    const selectedAcc = this.mergedSelectedAccount();
    if (!selectedAcc) {
      this.pendingJoinResource = resource;
      this.showAccountSelector.set(true);
      this.toast.warning("\u8ACB\u9078\u64C7\u4E00\u500B\u5E33\u865F\u4F86\u52A0\u5165\u7FA4\u7D44");
      return;
    }
    if (selectedAcc.status !== "Online") {
      this.toast.warning(`\u5E33\u865F ${selectedAcc.phone} \u672A\u9023\u63A5\uFF0C\u8ACB\u9078\u64C7\u5DF2\u9023\u63A5\u7684\u5E33\u865F`);
      this.pendingJoinResource = resource;
      this.showAccountSelector.set(true);
      return;
    }
    this.executeJoin(resource, selectedAcc.phone);
  }
  // 🔧 P0: 執行加入操作
  executeJoin(resource, phone) {
    this.joiningResourceIds.update((ids) => {
      const newIds = new Set(ids);
      newIds.add(resource.id);
      return newIds;
    });
    this.toast.info(`\u6B63\u5728\u4F7F\u7528 ${phone.slice(0, 4)}**** \u52A0\u5165\u7FA4\u7D44: ${resource.title || resource.username}...`);
    this.ipc.send("join-and-monitor-resource", {
      resourceId: resource.id || 0,
      username: resource.username,
      telegramId: resource.telegram_id,
      title: resource.title,
      phone
    });
    this.pendingJoinResource = null;
    this.joinResourceEvent.emit(resource);
  }
  // 🔧 P0: 檢查資源是否正在加入中
  isJoining(resource) {
    return this.joiningResourceIds().has(resource.id);
  }
  extractMembers(resource) {
    console.log("[SearchDiscovery] \u6253\u958B\u63D0\u53D6\u6210\u54E1\u5C0D\u8A71\u6846:", resource.title);
    if (!resource.telegram_id && !resource.username) {
      this.toast.warning("\u7121\u6CD5\u63D0\u53D6\uFF1A\u7F3A\u5C11\u7FA4\u7D44\u6A19\u8B58");
      return;
    }
    const joinedPhone = resource.joined_phone || this.mergedSelectedAccount()?.phone;
    const groupInfo = {
      id: String(resource.id || resource.telegram_id || ""),
      name: resource.title || "\u672A\u77E5\u7FA4\u7D44",
      url: resource.username ? `https://t.me/${resource.username}` : "",
      telegramId: resource.telegram_id || "",
      // 🔧 添加 Telegram ID
      memberCount: resource.member_count || 0,
      // 🔧 使用駝峰命名
      accountPhone: joinedPhone,
      // 🔧 添加帳號信息
      resourceType: resource.resource_type || "group"
    };
    console.log("[SearchDiscovery] \u6253\u958B\u63D0\u53D6\u6210\u54E1\u5C0D\u8A71\u6846\uFF0C\u7FA4\u7D44\u4FE1\u606F:", groupInfo);
    this.dialogService.openMemberExtraction(groupInfo);
    this.extractMembersEvent.emit(resource);
  }
  // ============ 批量選擇操作 ============
  // 切換單個選擇
  toggleBatchSelect(resource, event) {
    event.stopPropagation();
    const key = resource.telegram_id || String(resource.id);
    const current = new Set(this.selectedForBatch());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedForBatch.set(current);
  }
  // 是否被選中
  isSelectedForBatch(resource) {
    const key = resource.telegram_id || String(resource.id);
    return this.selectedForBatch().has(key);
  }
  // 全選本頁
  selectAllVisible() {
    const keys = this.filteredResources().map((r) => r.telegram_id || String(r.id));
    this.selectedForBatch.set(new Set(keys));
  }
  // 取消全選
  clearSelection() {
    this.selectedForBatch.set(/* @__PURE__ */ new Set());
  }
  // 反選
  invertSelection() {
    const current = this.selectedForBatch();
    const all = this.filteredResources().map((r) => r.telegram_id || String(r.id));
    const inverted = new Set(all.filter((key) => !current.has(key)));
    this.selectedForBatch.set(inverted);
  }
  // 批量收藏選中的
  batchSaveSelected() {
    const selected = this.filteredResources().filter((r) => this.selectedForBatch().has(r.telegram_id || String(r.id)) && !r.is_saved);
    if (selected.length === 0) {
      this.toast.info("\u672A\u9078\u4E2D\u53EF\u6536\u85CF\u7684\u8CC7\u6E90");
      return;
    }
    selected.forEach((r) => this.saveResourceEvent.emit(r));
    this.toast.success(`\u5DF2\u6536\u85CF ${selected.length} \u500B\u8CC7\u6E90`);
    this.clearSelection();
  }
  // 複製所有選中的 ID
  copySelectedIds() {
    const ids = this.filteredResources().filter((r) => this.selectedForBatch().has(r.telegram_id || String(r.id))).map((r) => r.telegram_id).filter((id) => id);
    if (ids.length === 0) {
      this.toast.warning("\u9078\u4E2D\u7684\u8CC7\u6E90\u4E2D\u6C92\u6709\u53EF\u8907\u88FD\u7684 ID");
      return;
    }
    navigator.clipboard.writeText(ids.join("\n")).then(() => {
      this.toast.success(`\u5DF2\u8907\u88FD ${ids.length} \u500B ID`);
    }).catch(() => {
      this.toast.error("\u8907\u88FD\u5931\u6557");
    });
  }
  batchSave() {
    const unsaved = this.filteredResources().filter((r) => !r.is_saved);
    if (unsaved.length === 0) {
      this.toast.info("\u6240\u6709\u7D50\u679C\u90FD\u5DF2\u6536\u85CF");
      return;
    }
    unsaved.forEach((r) => this.saveResourceEvent.emit(r));
    this.toast.success(`\u5DF2\u6536\u85CF ${unsaved.length} \u500B\u8CC7\u6E90`);
  }
  // 🔧 P0: 增強版導出功能 - 導出全部結果
  exportResults() {
    const results = this.filteredResources();
    if (results.length === 0) {
      this.toast.warning("\u6C92\u6709\u53EF\u5C0E\u51FA\u7684\u7D50\u679C");
      return;
    }
    const data = results.map((r, index) => ({
      \u5E8F\u865F: index + 1,
      ID: r.telegram_id || "",
      \u540D\u7A31: r.title || "",
      Username: r.username || "",
      \u985E\u578B: r.resource_type === "channel" ? "\u983B\u9053" : "\u7FA4\u7D44",
      \u6210\u54E1\u6578: r.member_count || 0,
      \u63CF\u8FF0: (r.description || "").replace(/"/g, '""').substring(0, 200),
      \u9023\u7D50: r.username ? `https://t.me/${r.username}` : "",
      \u4F86\u6E90: r.source || "search"
    }));
    const headers = ["\u5E8F\u865F", "ID", "\u540D\u7A31", "Username", "\u985E\u578B", "\u6210\u54E1\u6578", "\u63CF\u8FF0", "\u9023\u7D50", "\u4F86\u6E90"];
    const csv = [
      headers.join(","),
      ...data.map((d) => [
        d.\u5E8F\u865F,
        `"${d.ID}"`,
        `"${d.\u540D\u7A31}"`,
        d.Username,
        d.\u985E\u578B,
        d.\u6210\u54E1\u6578,
        `"${d.\u63CF\u8FF0}"`,
        d.\u9023\u7D50,
        d.\u4F86\u6E90
      ].join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const keyword = this.searchQuery || "all";
    link.download = `telegram-search-${keyword}-${results.length}\u689D-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
    link.click();
    this.toast.success(`\u5DF2\u5C0E\u51FA ${results.length} \u689D\u641C\u7D22\u7D50\u679C`);
  }
  // ============ 複製功能 ============
  copyId(resource, event) {
    event.stopPropagation();
    const id = resource.telegram_id || "";
    if (!id) {
      this.toast.warning("\u7121\u53EF\u8907\u88FD\u7684 ID");
      return;
    }
    navigator.clipboard.writeText(id).then(() => {
      this.copiedId.set(id);
      console.log("\u2705 ID \u5DF2\u8907\u88FD:", id);
      setTimeout(() => this.copiedId.set(""), 2e3);
    }).catch(() => {
      this.toast.error("\u8907\u88FD\u5931\u6557");
    });
  }
  copyLink(resource, event) {
    event.stopPropagation();
    if (!resource.username) {
      this.toast.warning("\u8A72\u8CC7\u6E90\u6C92\u6709\u516C\u958B\u9023\u7D50");
      return;
    }
    const link = `https://t.me/${resource.username}`;
    navigator.clipboard.writeText(link).then(() => {
      this.copiedLink.set(resource.username);
      console.log("\u2705 \u9023\u7D50\u5DF2\u8907\u88FD:", link);
      setTimeout(() => this.copiedLink.set(""), 2e3);
    }).catch(() => {
      this.toast.error("\u8907\u88FD\u5931\u6557");
    });
  }
  // ============ 輔助方法 ============
  getSourceLabel(source) {
    const labels = {
      telegram: "TG\u5B98\u65B9",
      jiso: "\u4E2D\u6587\u641C\u7D22",
      tgstat: "TGStat",
      local: "\u672C\u5730"
    };
    return labels[source] || source;
  }
  // 🆕 格式化分數顯示
  formatScore(score) {
    if (score === void 0 || score === null) {
      return "0.0/1.0";
    }
    return `${score.toFixed(1)}/1.0`;
  }
  // 🆕 重置所有篩選條件
  resetFilters() {
    this.filterType = "all";
    this.filterMemberMin.set(null);
    this.filterMemberMax.set(null);
    this.filterSource.set("all");
    this.filterJoinStatus.set("all");
    this.filterHasId.set(false);
  }
  static {
    this.\u0275fac = function SearchDiscoveryComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SearchDiscoveryComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SearchDiscoveryComponent, selectors: [["app-search-discovery"]], inputs: { resources: [1, "resources"], isSearching: [1, "isSearching"], selectedAccount: [1, "selectedAccount"], availableAccounts: [1, "availableAccounts"], historyKeywords: [1, "historyKeywords"], currentKeyword: [1, "currentKeyword"], searchError: [1, "searchError"], savedResourceIds: [1, "savedResourceIds"] }, outputs: { searchEvent: "searchEvent", selectAccountEvent: "selectAccountEvent", saveResourceEvent: "saveResourceEvent", unsaveResourceEvent: "unsaveResourceEvent", joinResourceEvent: "joinResourceEvent", extractMembersEvent: "extractMembersEvent", clearResultsEvent: "clearResultsEvent" }, decls: 49, vars: 12, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "text-white", "overflow-hidden"], [1, "flex-shrink-0", "px-6", "py-4", "border-b", "border-slate-700/50", "bg-slate-900/95", "backdrop-blur-sm"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-4"], [1, "text-2xl", "font-bold", "text-white", "flex", "items-center", "gap-3"], [1, "text-2xl"], [1, "flex", "items-center", "gap-2", "text-sm"], [1, "px-3", "py-1", "bg-cyan-500/20", "text-cyan-400", "rounded-lg"], [1, "px-3", "py-1", "bg-yellow-500/20", "text-yellow-400", "rounded-lg"], [1, "text-slate-400"], [1, "relative"], [1, "text-red-400", "text-sm", "px-3", "py-1.5", "bg-red-500/10", "rounded-lg"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "bg-blue-500/20", "text-blue-400", "animate-pulse"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "bg-green-500/20", "text-green-400"], [1, "flex-shrink-0", "px-6", "py-4", "border-b", "border-slate-700/30", "bg-slate-800/30"], [1, "flex", "gap-3", "mb-4"], [1, "flex-1", "relative"], ["type", "text", "placeholder", "\u8F38\u5165\u95DC\u9375\u8A5E\u641C\u7D22\u7FA4\u7D44\u548C\u983B\u9053...", 1, "w-full", "bg-slate-700/50", "border", "border-slate-600", "rounded-xl", "py-3", "px-4", "pl-12", "text-white", "text-lg", "focus:ring-2", "focus:ring-cyan-500/50", "focus:border-cyan-500", "transition-all", 3, "ngModelChange", "keyup.enter", "focus", "blur", "ngModel"], [1, "absolute", "left-4", "top-1/2", "-translate-y-1/2", "text-slate-400", "text-xl"], [1, "absolute", "top-full", "left-0", "right-0", "mt-2", "bg-slate-800", "border", "border-slate-700", "rounded-xl", "shadow-xl", "z-50", "overflow-hidden"], [1, "px-8", "py-3", "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "hover:from-cyan-400", "hover:to-blue-400", "text-white", "rounded-xl", "font-medium", "disabled:opacity-50", "disabled:cursor-not-allowed", "transition-all", "shadow-lg", "shadow-cyan-500/25", 3, "click", "disabled"], [1, "text-sm", "text-slate-400"], [1, "flex", "gap-2"], [1, "flex", "items-center", "gap-2", "px-3", "py-1.5", "rounded-lg", "transition-all", 3, "class", "title"], [1, "flex", "items-center", "gap-2"], [1, "text-xs", "px-2", "py-1", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded", "transition-all", 3, "click"], [1, "text-xs", "px-2", "py-1", "bg-slate-600/50", "hover:bg-slate-600", "text-slate-400", "rounded", "transition-all", 3, "click"], [1, "flex-shrink-0", "px-6", "py-3", "border-b", "border-slate-700/30", "bg-slate-800/20"], [1, "flex-1", "overflow-y-auto", "px-6", "py-4"], [1, "space-y-4"], [1, "flex", "flex-col", "items-center", "justify-center", "h-full", "text-center"], [1, "fixed", "inset-0", "bg-black/70", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-50", "p-4"], [1, "fixed", "inset-0", "bg-black/60", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-[100]"], [1, "flex", "items-center", "gap-2", "px-3", "py-1.5", "bg-slate-700/50", "hover:bg-slate-600/50", "rounded-lg", "border", "border-slate-600/50", 3, "click"], [1, "w-2", "h-2", "rounded-full"], [1, "font-mono", "text-sm"], [1, "text-slate-400", "text-xs"], [1, "absolute", "top-full", "right-0", "mt-1", "w-56", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "shadow-xl", "z-50"], [1, "max-h-48", "overflow-y-auto", "p-1"], [1, "w-full", "flex", "items-center", "gap-2", "px-3", "py-2", "hover:bg-slate-700/50", "rounded-lg", "text-left"], [1, "w-full", "flex", "items-center", "gap-2", "px-3", "py-2", "hover:bg-slate-700/50", "rounded-lg", "text-left", 3, "click"], [1, "font-mono", "text-sm", "flex-1"], [1, "p-3", "border-b", "border-slate-700"], [1, "p-3"], [1, "text-xs", "text-slate-500", "mb-2"], [1, "flex", "flex-wrap", "gap-2"], [1, "px-3", "py-1.5", "bg-orange-500/10", "hover:bg-orange-500/20", "text-orange-300", "hover:text-orange-200", "rounded-lg", "text-sm", "transition-all"], [1, "px-3", "py-1.5", "bg-slate-700/50", "hover:bg-cyan-500/20", "text-slate-300", "hover:text-cyan-400", "rounded-lg", "text-sm", "transition-all"], [1, "px-3", "py-1.5", "bg-slate-700/50", "hover:bg-cyan-500/20", "text-slate-300", "hover:text-cyan-400", "rounded-lg", "text-sm", "transition-all", 3, "mousedown"], [1, "px-3", "py-1.5", "bg-orange-500/10", "hover:bg-orange-500/20", "text-orange-300", "hover:text-orange-200", "rounded-lg", "text-sm", "transition-all", 3, "mousedown"], [1, "flex", "items-center", "gap-2", "px-3", "py-1.5", "rounded-lg", "transition-all", 3, "title"], ["type", "checkbox", 1, "hidden", 3, "change", "checked", "disabled"], [1, "text-sm"], [1, "text-[10px]", "px-1.5", "py-0.5", "rounded", 3, "class"], [1, "text-[10px]", "px-1.5", "py-0.5", "rounded"], [1, "text-slate-400", "text-sm", "flex", "items-center", "gap-3"], [1, "font-bold", "text-white"], [1, "text-cyan-400", "text-sm", "flex", "items-center", "gap-1"], [1, "text-amber-400", "text-sm", "flex", "items-center", "gap-1"], [1, "bg-slate-700/50", "border", "border-slate-600", "rounded-lg", "py-1.5", "px-3", "text-white", "text-sm", 3, "ngModelChange", "ngModel"], ["value", "all"], ["value", "group"], ["value", "channel"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "flex", "items-center", "gap-1", "transition-all", 3, "click"], [1, "ml-1", "px-1.5", "py-0.5", "bg-cyan-500", "text-white", "text-xs", "rounded-full"], [1, "px-3", "py-1.5", "bg-yellow-500/20", "text-yellow-400", "rounded-lg", "hover:bg-yellow-500/30", "text-sm", "flex", "items-center", "gap-1", 3, "click"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "flex", "items-center", "gap-1", "transition-all", 3, "click", "disabled"], [1, "mt-3", "pt-3", "border-t", "border-slate-700/30", "grid", "grid-cols-2", "md:grid-cols-4", "gap-4"], [1, "mt-3", "pt-3", "border-t", "border-slate-700/30", "flex", "items-center", "justify-between"], [1, "text-slate-400", "text-sm"], [1, "px-3", "py-1", "bg-cyan-500/20", "text-cyan-400", "rounded-full", "text-sm", "font-medium"], [1, "text-green-400", "text-xs"], [1, "text-slate-500", "text-xs"], [1, "animate-spin"], [1, "animate-pulse"], [1, "text-xs", "text-slate-400", "mb-1", "block"], ["type", "number", "placeholder", "\u6700\u5C11", 1, "w-full", "bg-slate-700/50", "border", "border-slate-600", "rounded", "py-1.5", "px-2", "text-white", "text-sm", 3, "change", "value"], [1, "text-slate-500"], ["type", "number", "placeholder", "\u6700\u591A", 1, "w-full", "bg-slate-700/50", "border", "border-slate-600", "rounded", "py-1.5", "px-2", "text-white", "text-sm", 3, "change", "value"], [1, "w-full", "bg-slate-700/50", "border", "border-slate-600", "rounded", "py-1.5", "px-2", "text-white", "text-sm", 3, "change", "value"], ["value", "telegram"], ["value", "jiso"], ["value", "local"], ["value", "joined"], ["value", "not_joined"], [1, "flex", "items-center", "gap-2", "cursor-pointer"], ["type", "checkbox", 1, "rounded", "border-slate-500", "bg-slate-700", "text-cyan-500", 3, "change", "checked"], [1, "text-sm", "text-slate-300"], [1, "text-xs", "text-slate-400", "hover:text-white", "underline", 3, "click"], [1, "flex", "items-center", "gap-3"], [1, "px-2", "py-1", "text-xs", "bg-slate-700/50", "hover:bg-slate-700", "text-slate-300", "rounded", "transition-all", 3, "click"], [1, "flex", "items-center", "gap-3", "px-3", "py-1.5", "bg-cyan-500/10", "rounded-lg", "border", "border-cyan-500/30"], [1, "text-cyan-400", "text-sm", "font-medium"], [1, "w-px", "h-4", "bg-slate-600"], [1, "px-2", "py-1", "text-xs", "bg-yellow-500/20", "hover:bg-yellow-500/30", "text-yellow-400", "rounded", "transition-all", 3, "click"], [1, "px-2", "py-1", "text-xs", "bg-cyan-500/20", "hover:bg-cyan-500/30", "text-cyan-400", "rounded", "transition-all", 3, "click"], [1, "animate-pulse", "bg-slate-800/50", "rounded-xl", "p-4", "border", "border-slate-700/50"], [1, "flex", "items-start", "gap-4"], [1, "w-12", "h-12", "bg-slate-700", "rounded-lg"], [1, "flex-1", "space-y-2"], [1, "h-5", "bg-slate-700", "rounded", "w-1/3"], [1, "h-4", "bg-slate-700", "rounded", "w-1/4"], [1, "h-3", "bg-slate-700", "rounded", "w-2/3"], [1, "max-w-md"], [1, "text-6xl", "mb-4"], [1, "text-red-400", "text-xl", "mb-2"], [1, "text-slate-400", "mb-4"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-600", "text-white", "rounded-lg", 3, "click"], [1, "text-slate-300", "text-xl", "mb-2"], [1, "text-slate-500", "mb-6"], [1, "flex", "flex-wrap", "justify-center", "gap-2", "max-w-lg"], [1, "text-slate-500", "text-sm"], [1, "px-3", "py-1.5", "bg-slate-700/50", "hover:bg-cyan-500/20", "text-slate-400", "hover:text-cyan-400", "rounded-full", "text-sm", "transition-all"], [1, "px-3", "py-1.5", "bg-slate-700/50", "hover:bg-cyan-500/20", "text-slate-400", "hover:text-cyan-400", "rounded-full", "text-sm", "transition-all", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-3", "px-1"], [1, "text-white", "font-bold"], [1, "text-cyan-400"], [1, "bg-slate-700/50", "border", "border-slate-600", "rounded", "px-2", "py-1", "text-sm", "text-white", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "space-y-3"], [1, "group", "bg-gradient-to-r", "from-slate-800/80", "to-slate-800/40", "rounded-xl", "border", "transition-all", "duration-300", "overflow-hidden", "cursor-pointer", 3, "class"], [1, "flex", "items-center", "justify-center", "gap-2", "mt-4", "py-3", "border-t", "border-slate-700/50"], [1, "group", "bg-gradient-to-r", "from-slate-800/80", "to-slate-800/40", "rounded-xl", "border", "transition-all", "duration-300", "overflow-hidden", "cursor-pointer", 3, "click"], [1, "p-4", "flex", "items-start", "gap-4"], [1, "flex-shrink-0", "flex", "flex-col", "gap-2"], [1, "relative", "cursor-pointer", 3, "click"], ["type", "checkbox", 1, "sr-only", 3, "change", "checked"], [1, "w-5", "h-5", "rounded", "border-2", "flex", "items-center", "justify-center", "transition-all"], [1, "text-white", "text-xs"], [1, "p-2", "rounded-lg", "transition-all", 3, "click", "title"], [1, "flex-1", "min-w-0"], [1, "flex", "items-center", "gap-2", "mb-2", "flex-wrap"], [1, "px-2.5", "py-1", "text-xs", "rounded-full", "font-medium", "flex-shrink-0"], [1, "px-2", "py-0.5", "text-xs", "rounded-full", "font-medium", "bg-green-500/30", "text-green-300", "flex-shrink-0"], [1, "px-2", "py-0.5", "text-xs", "rounded-full", "font-medium", "bg-cyan-500/30", "text-cyan-300", "flex-shrink-0", "animate-pulse"], [1, "px-2", "py-0.5", "text-xs", "rounded-full", "font-medium", "bg-slate-600/30", "text-slate-400", "flex-shrink-0"], [1, "font-semibold", "text-white", "truncate"], ["target", "_blank", 1, "text-cyan-400", "text-sm", "hover:underline", "flex-shrink-0", 3, "href"], [1, "flex", "items-center", "gap-3", "mb-2", "bg-slate-900/50", "rounded-lg", "px-3", "py-2"], [1, "text-slate-400", "text-sm", "mb-2", "line-clamp-2"], [1, "flex", "items-center", "gap-4", "text-sm", "flex-wrap"], [1, "flex", "items-center", "gap-1", "text-slate-400"], [1, "text-lg"], [1, "font-medium", "text-white"], ["title", "\u76F8\u6BD4\u4E0A\u6B21\u589E\u52A0", 1, "text-green-400", "text-xs", "ml-1"], ["title", "\u76F8\u6BD4\u4E0A\u6B21\u6E1B\u5C11", 1, "text-red-400", "text-xs", "ml-1"], [1, "flex", "items-center", "gap-1.5"], [1, "text-xs", "text-slate-500", "font-mono"], [1, "px-2", "py-0.5", "bg-slate-700/50", "text-slate-400", "rounded", "text-xs"], [1, "px-2", "py-0.5", "bg-green-500/20", "text-green-400", "rounded", "text-xs"], [1, "flex-shrink-0", "flex", "flex-col", "gap-2", 3, "click"], [1, "flex", "flex-col", "items-center"], ["disabled", "", 1, "px-4", "py-2", "bg-slate-600", "text-slate-300", "rounded-lg", "text-sm", "font-medium", "cursor-wait", "flex", "items-center", "gap-1"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "text-white", "rounded-lg", "text-sm", "font-medium", "transition-all", "shadow-lg", "shadow-cyan-500/20"], ["disabled", "", "title", "\u983B\u9053\u7121\u6CD5\u63D0\u53D6\u6210\u54E1", 1, "px-4", "py-2", "bg-slate-500/20", "text-slate-500", "rounded-lg", "text-sm", "cursor-not-allowed"], ["target", "_blank", 1, "text-cyan-400", "text-sm", "hover:underline", "flex-shrink-0", 3, "click", "href"], [1, "font-mono", "text-cyan-300", "text-sm", "select-all"], ["title", "\u8907\u88FD ID", 1, "px-2", "py-1", "text-xs", "rounded", "transition-all", 3, "click"], [1, "font-mono", "text-slate-400", "text-sm"], ["title", "\u52A0\u5165\u7FA4\u7D44\u5F8C\u53EF\u7372\u53D6\u5B8C\u6574\u6578\u5B57 ID", 1, "text-xs", "text-amber-400/80", "bg-amber-500/10", "px-2", "py-0.5", "rounded"], [1, "text-slate-600"], ["title", "\u8907\u88FD\u9023\u7D50", 1, "px-2", "py-1", "text-xs", "rounded", "transition-all", 3, "click"], [1, "text-yellow-400"], [1, "text-yellow-400", "font-medium"], [1, "px-4", "py-2", "bg-green-500/20", "text-green-400", "rounded-lg", "text-sm", "text-center"], [1, "text-xs", "text-slate-500", "mt-1"], [1, "px-4", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "text-white", "rounded-lg", "text-sm", "font-medium", "transition-all", "shadow-lg", "shadow-cyan-500/20", 3, "click"], [1, "px-4", "py-2", "bg-purple-500/20", "hover:bg-purple-500/30", "text-purple-400", "rounded-lg", "text-sm", "transition-all"], ["disabled", "", "title", "\u9700\u8981\u5148\u52A0\u5165\u7FA4\u7D44", 1, "px-4", "py-2", "bg-slate-500/20", "text-slate-500", "rounded-lg", "text-sm", "cursor-not-allowed"], [1, "px-4", "py-2", "bg-purple-500/20", "hover:bg-purple-500/30", "text-purple-400", "rounded-lg", "text-sm", "transition-all", 3, "click"], [1, "px-3", "py-1.5", "rounded-lg", "text-sm", "transition-all", 3, "click", "disabled"], [1, "w-8", "h-8", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "class"], [1, "ml-2", "text-sm", "text-slate-400"], [1, "w-8", "h-8", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "click"], [1, "fixed", "inset-0", "bg-black/70", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-50", "p-4", 3, "click"], [1, "bg-slate-800", "rounded-2xl", "w-full", "max-w-2xl", "max-h-[90vh]", "overflow-hidden", "shadow-2xl", "border", "border-slate-700", 3, "click"], [1, "px-6", "py-4", "border-b", "border-slate-700", "flex", "items-center", "justify-between", "bg-slate-800/95"], [1, "px-3", "py-1", "text-sm", "rounded-full", "font-medium"], [1, "text-xl", "font-bold", "text-white"], ["title", "\u4E0A\u4E00\u500B (\u2190 \u9375)", 1, "p-2", "rounded-lg", "transition-all", 3, "click", "disabled"], ["title", "\u4E0B\u4E00\u500B (\u2192 \u9375)", 1, "p-2", "rounded-lg", "transition-all", 3, "click", "disabled"], [1, "w-px", "h-6", "bg-slate-700", "mx-1"], ["title", "\u95DC\u9589 (Esc \u9375)", 1, "p-2", "text-slate-400", "hover:text-white", "hover:bg-slate-700", "rounded-lg", "transition-all", 3, "click"], [1, "p-6", "overflow-y-auto", "max-h-[calc(90vh-140px)]"], [1, "flex", "items-start", "gap-4", "mb-6"], [1, "w-16", "h-16", "rounded-xl", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "flex", "items-center", "justify-center", "text-3xl", "flex-shrink-0"], [1, "text-2xl", "font-bold", "text-white", "mb-1"], ["target", "_blank", 1, "text-cyan-400", "hover:underline", 3, "href"], [1, "p-3", "rounded-xl", "transition-all", 3, "click"], [1, "bg-slate-900/50", "rounded-xl", "p-4", "mb-4"], [1, "text-slate-300", "font-medium", "mb-3", "flex", "items-center", "gap-2"], [1, "grid", "grid-cols-2", "gap-4"], [1, "text-slate-500", "text-sm", "mb-1"], [1, "text-white"], ["target", "_blank", 1, "text-cyan-400", "hover:underline", "text-sm", 3, "href"], [1, "grid", "grid-cols-3", "gap-4"], [1, "text-center", "p-3", "bg-slate-800/50", "rounded-lg"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "text-xl", "font-bold", "text-yellow-400", "mb-1"], [1, "text-cyan-400", "font-mono", "text-lg"], [1, "text-2xl", "font-bold"], [1, "bg-slate-900/50", "rounded-xl", "p-4"], [1, "px-3", "py-1", "bg-slate-700", "text-slate-300", "rounded-full", "text-sm"], [1, "px-3", "py-1", "bg-cyan-500/20", "text-cyan-400", "rounded-full", "text-sm"], [1, "px-6", "py-4", "border-t", "border-slate-700", "bg-slate-800/95", "flex", "items-center", "justify-between"], [1, "px-4", "py-2", "rounded-lg", "transition-all", "flex", "items-center", "gap-2", 3, "click"], ["target", "_blank", 1, "px-4", "py-2", "bg-slate-700", "text-slate-300", "hover:bg-slate-600", "rounded-lg", "flex", "items-center", "gap-2", 3, "href"], [1, "px-4", "py-2", "bg-slate-700", "text-slate-300", "hover:bg-slate-600", "rounded-lg", 3, "click"], [1, "px-6", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "text-white", "rounded-lg", "font-medium", "transition-all", "shadow-lg", "shadow-cyan-500/20"], [1, "font-mono", "text-cyan-300"], [1, "px-2", "py-1", "text-xs", "rounded", "transition-all", 3, "click"], [1, "font-mono", "text-slate-400"], ["title", "\u52A0\u5165\u7FA4\u7D44\u5F8C\u53EF\u7372\u53D6\u5B8C\u6574\u6578\u5B57 ID", 1, "text-xs", "text-amber-400/80"], ["title", "\u6B63\u5728\u540C\u6B65ID...", 1, "text-xs", "text-blue-400/80"], [1, "text-blue-400"], [1, "px-2", "py-1", "text-xs", "bg-slate-700", "text-slate-400", "hover:bg-cyan-500/20", "hover:text-cyan-400", "rounded", "transition-all", 3, "click"], [1, "text-slate-400", "whitespace-pre-wrap"], [1, "px-6", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "text-white", "rounded-lg", "font-medium", "transition-all", "shadow-lg", "shadow-cyan-500/20", 3, "click"], [1, "px-6", "py-2", "bg-purple-500", "hover:bg-purple-400", "text-white", "rounded-lg", "font-medium", "transition-all"], [1, "px-6", "py-2", "bg-purple-500", "hover:bg-purple-400", "text-white", "rounded-lg", "font-medium", "transition-all", 3, "click"], [1, "fixed", "inset-0", "bg-black/60", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-[100]", 3, "click"], [1, "bg-slate-800", "rounded-2xl", "border", "border-slate-700", "shadow-2xl", "w-[420px]", "max-h-[80vh]", "overflow-hidden", 3, "click"], [1, "p-5", "border-b", "border-slate-700", "bg-gradient-to-r", "from-cyan-500/10", "to-blue-500/10"], [1, "text-lg", "font-bold", "text-white", "flex", "items-center", "gap-2"], [1, "text-sm", "text-slate-400", "mt-1", "truncate"], [1, "p-4", "border-b", "border-slate-700/50", "bg-slate-800/50"], [1, "p-4", "max-h-[300px]", "overflow-y-auto"], [1, "text-sm", "text-slate-400", "mb-3"], [1, "space-y-2"], [1, "p-4", "border-t", "border-slate-700", "flex", "justify-end", "gap-3"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "rounded-lg", "transition-colors", 3, "click"], [1, "px-6", "py-2", "bg-cyan-500", "hover:bg-cyan-400", "disabled:bg-slate-600", "disabled:text-slate-400", "disabled:cursor-not-allowed", "text-white", "rounded-lg", "font-medium", "transition-all", 3, "click", "disabled"], [1, "w-12", "h-12", "rounded-xl", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "flex", "items-center", "justify-center", "text-2xl", "font-bold", "text-white"], [1, "font-medium", "text-white", "truncate"], [1, "text-sm", "text-cyan-400"], [1, "text-xs", "text-slate-500", "flex", "items-center", "gap-2", "mt-0.5"], [1, "flex", "items-center", "gap-3", "p-3", "rounded-xl", "cursor-pointer", "transition-all", 3, "class"], [1, "flex", "items-center", "gap-3", "p-3", "rounded-xl", "cursor-pointer", "transition-all"], ["type", "radio", 1, "w-4", "h-4", "text-cyan-500", "bg-slate-700", "border-slate-600", "focus:ring-cyan-500", 3, "change", "value", "checked"], [1, "flex-1"], [1, "font-mono", "text-white"], [1, "text-xs", "text-slate-400"], [1, "w-2", "h-2", "rounded-full", "bg-green-400"]], template: function SearchDiscoveryComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "h1", 4)(5, "span", 5);
        \u0275\u0275text(6, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(7, " \u641C\u7D22\u767C\u73FE ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "div", 6)(9, "span", 7);
        \u0275\u0275text(10);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "span", 8);
        \u0275\u0275text(12);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(13, "div", 3)(14, "div", 6)(15, "span", 9);
        \u0275\u0275text(16, "\u4F7F\u7528\u5E33\u865F:");
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(17, SearchDiscoveryComponent_Conditional_17_Template, 8, 6, "div", 10)(18, SearchDiscoveryComponent_Conditional_18_Template, 2, 0, "span", 11);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(19, SearchDiscoveryComponent_Conditional_19_Template, 2, 0, "span", 12)(20, SearchDiscoveryComponent_Conditional_20_Template, 2, 0, "span", 13);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(21, "div", 14)(22, "div", 15)(23, "div", 16)(24, "input", 17);
        \u0275\u0275twoWayListener("ngModelChange", function SearchDiscoveryComponent_Template_input_ngModelChange_24_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.searchQuery, $event) || (ctx.searchQuery = $event);
          return $event;
        });
        \u0275\u0275listener("keyup.enter", function SearchDiscoveryComponent_Template_input_keyup_enter_24_listener() {
          return ctx.doSearch();
        })("focus", function SearchDiscoveryComponent_Template_input_focus_24_listener() {
          return ctx.showSuggestions.set(true);
        })("blur", function SearchDiscoveryComponent_Template_input_blur_24_listener() {
          return ctx.hideSuggestions();
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(25, "span", 18);
        \u0275\u0275text(26, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(27, SearchDiscoveryComponent_Conditional_27_Template, 8, 1, "div", 19);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "button", 20);
        \u0275\u0275listener("click", function SearchDiscoveryComponent_Template_button_click_28_listener() {
          return ctx.doSearch();
        });
        \u0275\u0275text(29);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(30, "div", 2)(31, "div", 3)(32, "span", 21);
        \u0275\u0275text(33, "\u641C\u7D22\u6E20\u9053:");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "div", 22);
        \u0275\u0275repeaterCreate(35, SearchDiscoveryComponent_For_36_Template, 7, 8, "label", 23, _forTrack0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(37, "div", 24)(38, "button", 25);
        \u0275\u0275listener("click", function SearchDiscoveryComponent_Template_button_click_38_listener() {
          return ctx.selectedSources.set(["telegram", "jiso"]);
        });
        \u0275\u0275text(39, " \u63A8\u85A6\u7D44\u5408 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "button", 26);
        \u0275\u0275listener("click", function SearchDiscoveryComponent_Template_button_click_40_listener() {
          return ctx.clearResults();
        });
        \u0275\u0275text(41, " \u6E05\u7A7A\u7D50\u679C ");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275conditionalCreate(42, SearchDiscoveryComponent_Conditional_42_Template, 29, 15, "div", 27);
        \u0275\u0275elementStart(43, "div", 28);
        \u0275\u0275conditionalCreate(44, SearchDiscoveryComponent_Conditional_44_Template, 3, 1, "div", 29)(45, SearchDiscoveryComponent_Conditional_45_Template, 3, 1, "div", 30)(46, SearchDiscoveryComponent_Conditional_46_Template, 22, 5);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(47, SearchDiscoveryComponent_Conditional_47_Template, 106, 39, "div", 31);
        \u0275\u0275conditionalCreate(48, SearchDiscoveryComponent_Conditional_48_Template, 18, 3, "div", 32);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_2_0;
        let tmp_11_0;
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate1(" ", ctx.mergedResources().length, " \u7D50\u679C ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.savedCount(), " \u5DF2\u6536\u85CF ");
        \u0275\u0275advance(5);
        \u0275\u0275conditional((tmp_2_0 = ctx.mergedSelectedAccount()) ? 17 : 18, tmp_2_0);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.mergedSearching() ? 19 : 20);
        \u0275\u0275advance(5);
        \u0275\u0275twoWayProperty("ngModel", ctx.searchQuery);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.showSuggestions() && !ctx.mergedSearching() ? 27 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("disabled", ctx.mergedSearching() || !ctx.searchQuery.trim());
        \u0275\u0275advance();
        \u0275\u0275textInterpolate1(" ", ctx.mergedSearching() ? "\u641C\u7D22\u4E2D..." : "\u641C\u7D22", " ");
        \u0275\u0275advance(6);
        \u0275\u0275repeater(ctx.searchSources);
        \u0275\u0275advance(7);
        \u0275\u0275conditional(ctx.mergedResources().length > 0 || ctx.currentKeyword() ? 42 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.mergedSearching() ? 44 : ctx.filteredResources().length === 0 ? 45 : 46);
        \u0275\u0275advance(3);
        \u0275\u0275conditional((tmp_11_0 = ctx.showDetailDialog() && ctx.selectedResource()) ? 47 : -1, tmp_11_0);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showJoinAccountDialog() ? 48 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, DecimalPipe, DatePipe], styles: ["\n\n[_nghost-%COMP%] {\n  display: block;\n  height: 100%;\n}\n.line-clamp-2[_ngcontent-%COMP%] {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n[_ngcontent-%COMP%]::-webkit-scrollbar {\n  width: 8px;\n}\n[_ngcontent-%COMP%]::-webkit-scrollbar-track {\n  background: transparent;\n}\n[_ngcontent-%COMP%]::-webkit-scrollbar-thumb {\n  background: rgba(100, 116, 139, 0.3);\n  border-radius: 4px;\n}\n[_ngcontent-%COMP%]::-webkit-scrollbar-thumb:hover {\n  background: rgba(100, 116, 139, 0.5);\n}\n/*# sourceMappingURL=search-discovery.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SearchDiscoveryComponent, [{
    type: Component,
    args: [{ selector: "app-search-discovery", standalone: true, imports: [CommonModule, FormsModule], template: `
    <div class="h-full flex flex-col bg-slate-900 text-white overflow-hidden">
      <!-- \u9802\u90E8\u6A19\u984C\u6B04 - \u7CBE\u7C21\u8A2D\u8A08 -->
      <div class="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">\u{1F50D}</span>
              \u641C\u7D22\u767C\u73FE
            </h1>
            <!-- \u5FEB\u901F\u7D71\u8A08 -->
            <div class="flex items-center gap-2 text-sm">
              <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg">
                {{ mergedResources().length }} \u7D50\u679C
              </span>
              <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                {{ savedCount() }} \u5DF2\u6536\u85CF
              </span>
            </div>
          </div>
          
          <!-- \u5E33\u865F\u9078\u64C7 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-slate-400">\u4F7F\u7528\u5E33\u865F:</span>
              @if (mergedSelectedAccount(); as account) {
                <div class="relative">
                  <button (click)="showAccountSelector.set(!showAccountSelector())"
                          class="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg border border-slate-600/50">
                    <span class="w-2 h-2 rounded-full" [class.bg-green-400]="account.status === 'Online'" [class.bg-slate-400]="account.status !== 'Online'"></span>
                    <span class="font-mono text-sm">{{ account.phone }}</span>
                    <span class="text-slate-400 text-xs">\u25BC</span>
                  </button>
                  @if (showAccountSelector()) {
                    <div class="absolute top-full right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                      <div class="max-h-48 overflow-y-auto p-1">
                        @for (acc of mergedAccounts(); track acc.id) {
                          <button (click)="selectAccount(acc)"
                                  class="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 rounded-lg text-left">
                            <span class="w-2 h-2 rounded-full" [class.bg-green-400]="acc.status === 'Online'" [class.bg-slate-400]="acc.status !== 'Online'"></span>
                            <span class="font-mono text-sm flex-1">{{ acc.phone }}</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <span class="text-red-400 text-sm px-3 py-1.5 bg-red-500/10 rounded-lg">\u26A0\uFE0F \u7121\u53EF\u7528\u5E33\u865F</span>
              }
            </div>
            
            <!-- \u7CFB\u7D71\u72C0\u614B -->
            @if (mergedSearching()) {
              <span class="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 animate-pulse">
                \u{1F504} \u641C\u7D22\u4E2D...
              </span>
            } @else {
              <span class="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400">
                \u2705 \u5C31\u7DD2
              </span>
            }
          </div>
        </div>
      </div>
      
      <!-- \u641C\u7D22\u6B04\u5340\u57DF -->
      <div class="flex-shrink-0 px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
        <!-- \u641C\u7D22\u8F38\u5165 -->
        <div class="flex gap-3 mb-4">
          <div class="flex-1 relative">
            <input type="text" 
                   [(ngModel)]="searchQuery"
                   (keyup.enter)="doSearch()"
                   (focus)="showSuggestions.set(true)"
                   (blur)="hideSuggestions()"
                   placeholder="\u8F38\u5165\u95DC\u9375\u8A5E\u641C\u7D22\u7FA4\u7D44\u548C\u983B\u9053..."
                   class="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 pl-12 text-white text-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">\u{1F50D}</span>
            
            <!-- \u641C\u7D22\u5EFA\u8B70\u4E0B\u62C9 -->
            @if (showSuggestions() && !mergedSearching()) {
              <div class="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                @if (mergedHistoryKeywords().length > 0) {
                  <div class="p-3 border-b border-slate-700">
                    <div class="text-xs text-slate-500 mb-2">\u{1F550} \u6700\u8FD1\u641C\u7D22</div>
                    <div class="flex flex-wrap gap-2">
                      @for (kw of mergedHistoryKeywords().slice(0, 5); track kw) {
                        <button (mousedown)="quickSearch(kw)" 
                                class="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg text-sm transition-all">
                          {{ kw }}
                        </button>
                      }
                    </div>
                  </div>
                }
                <div class="p-3">
                  <div class="text-xs text-slate-500 mb-2">\u{1F525} \u71B1\u9580\u641C\u7D22</div>
                  <div class="flex flex-wrap gap-2">
                    @for (kw of hotKeywords; track kw) {
                      <button (mousedown)="quickSearch(kw)" 
                              class="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 rounded-lg text-sm transition-all">
                        {{ kw }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          <button (click)="doSearch()" 
                  [disabled]="mergedSearching() || !searchQuery.trim()"
                  class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25">
            {{ mergedSearching() ? '\u641C\u7D22\u4E2D...' : '\u641C\u7D22' }}
          </button>
        </div>
        
        <!-- \u641C\u7D22\u6E20\u9053\u9078\u64C7 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-sm text-slate-400">\u641C\u7D22\u6E20\u9053:</span>
            <div class="flex gap-2">
              @for (source of searchSources; track source.id) {
                <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                       [class]="source.disabled 
                         ? 'bg-slate-800/50 border border-slate-700/30 cursor-not-allowed opacity-50' 
                         : selectedSources().includes(source.id) 
                           ? 'bg-cyan-500/20 border border-cyan-500/50 cursor-pointer' 
                           : 'bg-slate-700/30 border border-slate-700 hover:bg-slate-700/50 cursor-pointer'"
                       [title]="source.disabled ? '\u8A72\u529F\u80FD\u6B63\u5728\u958B\u767C\u4E2D\uFF0C\u656C\u8ACB\u671F\u5F85' : ''">
                  <input type="checkbox"
                         [checked]="selectedSources().includes(source.id)"
                         [disabled]="source.disabled"
                         (change)="toggleSource(source.id)"
                         class="hidden">
                  <span>{{ source.icon }}</span>
                  <span class="text-sm">{{ source.name }}</span>
                  @if (source.tag) {
                    <span class="text-[10px] px-1.5 py-0.5 rounded" [class]="source.tagClass">{{ source.tag }}</span>
                  }
                </label>
              }
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button (click)="selectedSources.set(['telegram', 'jiso'])"
                    class="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-all">
              \u63A8\u85A6\u7D44\u5408
            </button>
            <button (click)="clearResults()"
                    class="text-xs px-2 py-1 bg-slate-600/50 hover:bg-slate-600 text-slate-400 rounded transition-all">
              \u6E05\u7A7A\u7D50\u679C
            </button>
          </div>
        </div>
      </div>
      
      <!-- \u7D50\u679C\u7D71\u8A08\u548C\u64CD\u4F5C\u6B04 -->
      @if (mergedResources().length > 0 || currentKeyword()) {
        <div class="flex-shrink-0 px-6 py-3 border-b border-slate-700/30 bg-slate-800/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              @if (currentKeyword()) {
                <div class="flex items-center gap-2">
                  <span class="text-slate-400 text-sm">\u7576\u524D\u641C\u7D22\uFF1A</span>
                  <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                    \u{1F50D} {{ currentKeyword() }}
                  </span>
                </div>
              }
              <span class="text-slate-400 text-sm flex items-center gap-3">
                \u5171 <span class="font-bold text-white">{{ mergedResources().length }}</span> \u500B\u7D50\u679C
                <!-- \u{1F195} \u986F\u793A\u65B0\u767C\u73FE/\u5DF2\u77E5\u7D71\u8A08 -->
                @if (newDiscoveredCount() > 0 || existingCount() > 0) {
                  <span class="text-green-400 text-xs">\u{1F195} {{ newDiscoveredCount() }} \u500B\u65B0\u767C\u73FE</span>
                  <span class="text-slate-500 text-xs">\u{1F504} {{ existingCount() }} \u500B\u5DF2\u77E5</span>
                }
              </span>
              <!-- \u{1F195} \u641C\u7D22\u9032\u5EA6\u63D0\u793A -->
              @if (searchProgress()) {
                <span class="text-cyan-400 text-sm flex items-center gap-1">
                  <span class="animate-spin">\u23F3</span>
                  {{ searchProgress() }}
                </span>
              }
              @if (isFetchingDetails()) {
                <span class="text-amber-400 text-sm flex items-center gap-1">
                  <span class="animate-pulse">\u{1F4CA}</span>
                  \u6B63\u5728\u7372\u53D6\u6210\u54E1\u6578\u7B49\u8A73\u60C5...
                </span>
              }
            </div>
            
            <div class="flex items-center gap-2">
              <select [(ngModel)]="filterType"
                      class="bg-slate-700/50 border border-slate-600 rounded-lg py-1.5 px-3 text-white text-sm">
                <option value="all">\u5168\u90E8\u985E\u578B</option>
                <option value="group">\u7FA4\u7D44</option>
                <option value="channel">\u983B\u9053</option>
              </select>
              <!-- \u{1F195} \u9AD8\u7D1A\u7BE9\u9078\u6309\u9215 -->
              <button (click)="showAdvancedFilter.set(!showAdvancedFilter())"
                      class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all"
                      [class]="showAdvancedFilter() || activeFilterCount() > 0 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                        : 'bg-slate-700/50 text-slate-300 border border-slate-700 hover:border-slate-600'">
                \u{1F39B}\uFE0F \u9AD8\u7D1A\u7BE9\u9078
                @if (activeFilterCount() > 0) {
                  <span class="ml-1 px-1.5 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                    {{ activeFilterCount() }}
                  </span>
                }
              </button>
              <button (click)="batchSave()" 
                      class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 text-sm flex items-center gap-1">
                \u2B50 \u6279\u91CF\u6536\u85CF
              </button>
              <button (click)="exportResults()" 
                      [disabled]="filteredResources().length === 0"
                      class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all"
                      [class]="filteredResources().length > 0 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-600/30 text-slate-500 cursor-not-allowed'">
                \u{1F4E4} \u5C0E\u51FA\u5168\u90E8 ({{ filteredResources().length }})
              </button>
            </div>
          </div>
          
          <!-- \u{1F195} \u9AD8\u7D1A\u7BE9\u9078\u9762\u677F -->
          @if (showAdvancedFilter()) {
            <div class="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-2 md:grid-cols-4 gap-4">
              <!-- \u6210\u54E1\u6578\u7BC4\u570D -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u6210\u54E1\u6578\u7BC4\u570D</label>
                <div class="flex items-center gap-2">
                  <input type="number" 
                         [value]="filterMemberMin() || ''"
                         (change)="filterMemberMin.set($any($event.target).value ? +$any($event.target).value : null)"
                         placeholder="\u6700\u5C11"
                         class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <span class="text-slate-500">-</span>
                  <input type="number" 
                         [value]="filterMemberMax() || ''"
                         (change)="filterMemberMax.set($any($event.target).value ? +$any($event.target).value : null)"
                         placeholder="\u6700\u591A"
                         class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                </div>
              </div>
              
              <!-- \u4F86\u6E90\u6E20\u9053 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u4F86\u6E90\u6E20\u9053</label>
                <select [value]="filterSource()"
                        (change)="filterSource.set($any($event.target).value)"
                        class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <option value="all">\u5168\u90E8\u4F86\u6E90</option>
                  <option value="telegram">TG \u5B98\u65B9</option>
                  <option value="jiso">\u4E2D\u6587\u641C\u7D22</option>
                  <option value="local">\u672C\u5730\u7D22\u5F15</option>
                </select>
              </div>
              
              <!-- \u52A0\u5165\u72C0\u614B -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u52A0\u5165\u72C0\u614B</label>
                <select [value]="filterJoinStatus()"
                        (change)="filterJoinStatus.set($any($event.target).value)"
                        class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <option value="all">\u5168\u90E8\u72C0\u614B</option>
                  <option value="joined">\u5DF2\u52A0\u5165</option>
                  <option value="not_joined">\u672A\u52A0\u5165</option>
                </select>
              </div>
              
              <!-- \u5176\u4ED6\u9078\u9805 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">\u5176\u4ED6\u9078\u9805</label>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" 
                           [checked]="filterHasId()"
                           (change)="filterHasId.set($any($event.target).checked)"
                           class="rounded border-slate-500 bg-slate-700 text-cyan-500">
                    <span class="text-sm text-slate-300">\u53EA\u986F\u793A\u6709 ID</span>
                  </label>
                  <button (click)="resetFilters()"
                          class="text-xs text-slate-400 hover:text-white underline">
                    \u91CD\u7F6E\u7BE9\u9078
                  </button>
                </div>
              </div>
            </div>
          }
          
          <!-- \u{1F195} \u6279\u91CF\u9078\u64C7\u9762\u677F -->
          @if (filteredResources().length > 0) {
            <div class="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-slate-400 text-sm">\u6279\u91CF\u64CD\u4F5C:</span>
                <button (click)="selectAllVisible()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  \u2611\uFE0F \u5168\u9078\u672C\u9801
                </button>
                <button (click)="clearSelection()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  \u2610 \u53D6\u6D88\u5168\u9078
                </button>
                <button (click)="invertSelection()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  \u21C6 \u53CD\u9078
                </button>
              </div>
              
              @if (selectedCount() > 0) {
                <div class="flex items-center gap-3 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <span class="text-cyan-400 text-sm font-medium">
                    \u2713 \u5DF2\u9078 {{ selectedCount() }} \u9805
                  </span>
                  <div class="w-px h-4 bg-slate-600"></div>
                  <button (click)="batchSaveSelected()" 
                          class="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-all">
                    \u2B50 \u6536\u85CF\u9078\u4E2D
                  </button>
                  <button (click)="copySelectedIds()" 
                          class="px-2 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-all">
                    \u{1F4CB} \u8907\u88FDID
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
      
      <!-- \u641C\u7D22\u7D50\u679C\u5217\u8868 - \u6700\u5927\u5316\u986F\u793A\u5340\u57DF -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        @if (mergedSearching()) {
          <!-- \u641C\u7D22\u4E2D\u9AA8\u67B6\u5C4F -->
          <div class="space-y-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="animate-pulse bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 bg-slate-700 rounded-lg"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-5 bg-slate-700 rounded w-1/3"></div>
                    <div class="h-4 bg-slate-700 rounded w-1/4"></div>
                    <div class="h-3 bg-slate-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredResources().length === 0) {
          <!-- \u7A7A\u72C0\u614B -->
          <div class="flex flex-col items-center justify-center h-full text-center">
            @if (mergedSearchError().hasError) {
              <div class="max-w-md">
                <div class="text-6xl mb-4">\u26A0\uFE0F</div>
                <p class="text-red-400 text-xl mb-2">\u641C\u7D22\u5931\u6557</p>
                <p class="text-slate-400 mb-4">{{ mergedSearchError().message }}</p>
                <button (click)="doSearch()" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">
                  \u{1F504} \u91CD\u8A66
                </button>
              </div>
            } @else {
              <div class="text-6xl mb-4">\u{1F50D}</div>
              <p class="text-slate-300 text-xl mb-2">\u958B\u59CB\u641C\u7D22\u767C\u73FE\u7FA4\u7D44</p>
              <p class="text-slate-500 mb-6">\u8F38\u5165\u95DC\u9375\u8A5E\u641C\u7D22 Telegram \u7FA4\u7D44\u548C\u983B\u9053</p>
              <div class="flex flex-wrap justify-center gap-2 max-w-lg">
                <span class="text-slate-500 text-sm">\u8A66\u8A66\uFF1A</span>
                @for (kw of hotKeywords.slice(0, 5); track kw) {
                  <button (click)="quickSearch(kw)" 
                          class="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-full text-sm transition-all">
                    {{ kw }}
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <!-- \u{1F527} P0: \u5206\u9801\u4FE1\u606F -->
          <div class="flex items-center justify-between mb-3 px-1">
            <div class="text-sm text-slate-400">
              \u5171 <span class="text-white font-bold">{{ filteredResources().length }}</span> \u500B\u7D50\u679C\uFF0C
              \u986F\u793A\u7B2C <span class="text-cyan-400">{{ (currentPage() - 1) * pageSize() + 1 }}</span> - 
              <span class="text-cyan-400">{{ Math.min(currentPage() * pageSize(), filteredResources().length) }}</span> \u500B
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-400">\u6BCF\u9801</span>
              <select [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)"
                      class="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-sm text-white">
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </div>
          </div>
          
          <!-- \u7D50\u679C\u5217\u8868 -->
          <div class="space-y-3">
            @for (resource of pagedResources(); track getResourceTrackId(resource, $index)) {
              <div class="group bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer"
                   [class]="isSelectedForBatch(resource) ? 'border-cyan-500/70 shadow-lg shadow-cyan-500/10' : 'border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'"
                   (click)="openDetail(resource)">
                <div class="p-4 flex items-start gap-4">
                  <!-- \u{1F195} \u6279\u91CF\u9078\u64C7\u8907\u9078\u6846 -->
                  <div class="flex-shrink-0 flex flex-col gap-2">
                    <label class="relative cursor-pointer" (click)="$event.stopPropagation()">
                      <input type="checkbox" 
                             [checked]="isSelectedForBatch(resource)"
                             (change)="toggleBatchSelect(resource, $event)"
                             class="sr-only">
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                           [class]="isSelectedForBatch(resource) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500 hover:border-cyan-400'">
                        @if (isSelectedForBatch(resource)) {
                          <span class="text-white text-xs">\u2713</span>
                        }
                      </div>
                    </label>
                    <!-- \u6536\u85CF\u6309\u9215 -->
                    <button (click)="toggleSave(resource); $event.stopPropagation()"
                            class="p-2 rounded-lg transition-all"
                            [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700/50 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400'"
                            [title]="resource.is_saved ? '\u53D6\u6D88\u6536\u85CF' : '\u6536\u85CF'">
                      {{ resource.is_saved ? '\u2B50' : '\u2606' }}
                    </button>
                  </div>
                  
                  <!-- \u4E3B\u8981\u4FE1\u606F -->
                  <div class="flex-1 min-w-0">
                    <!-- \u7B2C\u4E00\u884C\uFF1A\u985E\u578B + \u65B0\u767C\u73FE\u6A19\u8A18 + \u6A19\u984C + Username -->
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                      <span class="px-2.5 py-1 text-xs rounded-full font-medium flex-shrink-0" 
                            [class]="resource.resource_type === 'channel' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'">
                        {{ resource.resource_type === 'channel' ? '\u{1F4E2} \u983B\u9053' : '\u{1F465} \u7FA4\u7D44' }}
                      </span>
                      
                      <!-- \u{1F527} P1: \u5DF2\u52A0\u5165\u6A19\u8A18 -->
                      @if (resource.status === 'joined' || resource.status === 'monitoring') {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-green-500/30 text-green-300 flex-shrink-0">
                          \u2705 \u5DF2\u52A0\u5165
                        </span>
                      }
                      
                      <!-- \u{1F195} \u65B0\u767C\u73FE/\u5DF2\u77E5\u6A19\u8A18 -->
                      @if (resource.is_new) {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-cyan-500/30 text-cyan-300 flex-shrink-0 animate-pulse">
                          \u{1F195} \u65B0\u767C\u73FE
                        </span>
                      } @else if (resource.is_new === false) {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-slate-600/30 text-slate-400 flex-shrink-0">
                          \u{1F504} \u5DF2\u77E5
                        </span>
                      }
                      
                      <h4 class="font-semibold text-white truncate">{{ resource.title }}</h4>
                      @if (resource.username) {
                        <a [href]="'https://t.me/' + resource.username" target="_blank" 
                           class="text-cyan-400 text-sm hover:underline flex-shrink-0"
                           (click)="$event.stopPropagation()">
                          @{{ resource.username }}
                        </a>
                      }
                    </div>
                    
                    <!-- \u{1F195} \u7B2C\u4E8C\u884C\uFF1A\u7FA4\u7D44 ID\uFF08\u91CD\u9EDE\u986F\u793A\uFF0C\u512A\u5316\u5F8C\u7684\u53CB\u597D\u63D0\u793A\uFF09 -->
                    <div class="flex items-center gap-3 mb-2 bg-slate-900/50 rounded-lg px-3 py-2">
                      <span class="text-slate-400 text-sm">ID:</span>
                      @if (resource.telegram_id) {
                        <!-- \u6709\u6578\u5B57 ID -->
                        <code class="font-mono text-cyan-300 text-sm select-all">{{ resource.telegram_id }}</code>
                        <button (click)="copyId(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedId() === resource.telegram_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'"
                                title="\u8907\u88FD ID">
                          {{ copiedId() === resource.telegram_id ? '\u2713 \u5DF2\u8907\u88FD' : '\u{1F4CB} \u8907\u88FD' }}
                        </button>
                      } @else if (resource.username) {
                        <!-- \u7121 ID \u4F46\u6709 username -->
                        <code class="font-mono text-slate-400 text-sm">@{{ resource.username }}</code>
                        <span class="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded" title="\u52A0\u5165\u7FA4\u7D44\u5F8C\u53EF\u7372\u53D6\u5B8C\u6574\u6578\u5B57 ID">
                          \u26A0\uFE0F \u9700\u52A0\u5165\u7372\u53D6
                        </span>
                      } @else {
                        <!-- \u90FD\u6C92\u6709 -->
                        <span class="text-slate-500 text-sm">\u9700\u901A\u904E\u9080\u8ACB\u93C8\u63A5\u52A0\u5165</span>
                      }
                      @if (resource.username) {
                        <span class="text-slate-600">|</span>
                        <button (click)="copyLink(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedLink() === resource.username ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'"
                                title="\u8907\u88FD\u9023\u7D50">
                          {{ copiedLink() === resource.username ? '\u2713 \u5DF2\u8907\u88FD' : '\u{1F517} \u8907\u88FD\u9023\u7D50' }}
                        </button>
                      }
                    </div>
                    
                    <!-- \u63CF\u8FF0 -->
                    @if (resource.description) {
                      <p class="text-slate-400 text-sm mb-2 line-clamp-2">{{ resource.description }}</p>
                    }
                    
                    <!-- \u7D71\u8A08\u4FE1\u606F -->
                    <div class="flex items-center gap-4 text-sm flex-wrap">
                      <span class="flex items-center gap-1 text-slate-400">
                        <span class="text-lg">\u{1F465}</span>
                        <span class="font-medium text-white">{{ resource.member_count | number }}</span>
                        \u6210\u54E1
                        <!-- \u{1F195} \u6210\u54E1\u6578\u8B8A\u5316\u6A19\u8A18 -->
                        @if (resource.member_change && resource.member_change > 0) {
                          <span class="text-green-400 text-xs ml-1" title="\u76F8\u6BD4\u4E0A\u6B21\u589E\u52A0">
                            \u{1F4C8} +{{ resource.member_change | number }}
                          </span>
                        } @else if (resource.member_change && resource.member_change < 0) {
                          <span class="text-red-400 text-xs ml-1" title="\u76F8\u6BD4\u4E0A\u6B21\u6E1B\u5C11">
                            \u{1F4C9} {{ resource.member_change | number }}
                          </span>
                        }
                      </span>
                      
                      <!-- \u76F8\u95DC\u5EA6\u8A55\u5206\uFF08\u5E36\u5206\u6578\u986F\u793A\uFF09 -->
                      <span class="flex items-center gap-1.5">
                        @if ((resource.overall_score || 0) >= 0.7) {
                          <span class="text-yellow-400">\u2B50\u2B50\u2B50</span>
                          <span class="text-yellow-400 font-medium">\u9AD8\u5EA6\u76F8\u95DC</span>
                        } @else if ((resource.overall_score || 0) >= 0.5) {
                          <span class="text-yellow-400">\u2B50\u2B50</span>
                          <span class="text-slate-400">\u4E2D\u5EA6\u76F8\u95DC</span>
                        } @else {
                          <span class="text-yellow-400">\u2B50</span>
                          <span class="text-slate-500">\u4E00\u822C\u76F8\u95DC</span>
                        }
                        <span class="text-xs text-slate-500 font-mono">
                          ({{ formatScore(resource.overall_score) }})
                        </span>
                      </span>
                      
                      <!-- \u4F86\u6E90\u6A19\u8A18 -->
                      @if (resource.discovery_source) {
                        <span class="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                          {{ getSourceLabel(resource.discovery_source) }}
                        </span>
                      }
                      
                      <!-- \u72C0\u614B\u6A19\u8A18 -->
                      @if (resource.status === 'joined' || resource.status === 'monitoring') {
                        <span class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">\u2713 \u5DF2\u52A0\u5165</span>
                      }
                    </div>
                  </div>
                  
                  <!-- \u64CD\u4F5C\u6309\u9215 -->
                  <div class="flex-shrink-0 flex flex-col gap-2" (click)="$event.stopPropagation()">
                    @if (resource.status === 'joined' || resource.status === 'monitoring') {
                      <div class="flex flex-col items-center">
                        <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                          \u2705 \u5DF2\u52A0\u5165
                        </span>
                        @if (resource.joined_phone) {
                          <span class="text-xs text-slate-500 mt-1">{{ resource.joined_phone.slice(0, 7) }}***</span>
                        }
                      </div>
                    } @else if (isJoining(resource)) {
                      <button disabled
                              class="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg text-sm font-medium cursor-wait flex items-center gap-1">
                        <span class="animate-spin">\u23F3</span> \u52A0\u5165\u4E2D...
                      </button>
                    } @else {
                      <button (click)="openJoinDialog(resource)" 
                              class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20">
                        \u{1F680} \u52A0\u5165
                      </button>
                    }
                    
                    @if (resource.resource_type !== 'channel') {
                      @if (resource.status === 'joined' || resource.status === 'monitoring') {
                        <button (click)="extractMembers(resource)" 
                                class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-all">
                          \u{1F465} \u63D0\u53D6\u6210\u54E1
                        </button>
                      } @else {
                        <button disabled
                                class="px-4 py-2 bg-slate-500/20 text-slate-500 rounded-lg text-sm cursor-not-allowed"
                                title="\u9700\u8981\u5148\u52A0\u5165\u7FA4\u7D44">
                          \u{1F465} \u6210\u54E1
                        </button>
                      }
                    } @else {
                      <button disabled
                              class="px-4 py-2 bg-slate-500/20 text-slate-500 rounded-lg text-sm cursor-not-allowed"
                              title="\u983B\u9053\u7121\u6CD5\u63D0\u53D6\u6210\u54E1">
                        \u{1F465} \u6210\u54E1 \u{1F512}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          
          <!-- \u{1F527} P0: \u5206\u9801\u63A7\u4EF6 -->
          @if (filteredResources().length > pageSize()) {
            <div class="flex items-center justify-center gap-2 mt-4 py-3 border-t border-slate-700/50">
              <button (click)="firstPage()" 
                      [disabled]="currentPage() === 1"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === 1 ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                \u23EE\uFE0F \u9996\u9801
              </button>
              <button (click)="prevPage()" 
                      [disabled]="currentPage() === 1"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === 1 ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                \u25C0\uFE0F \u4E0A\u4E00\u9801
              </button>
              
              @for (page of pageNumbers(); track page) {
                <button (click)="goToPage(page)"
                        class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                        [class]="page === currentPage() ? 'bg-cyan-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                  {{ page }}
                </button>
              }
              
              <button (click)="nextPage()" 
                      [disabled]="currentPage() === totalPages()"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === totalPages() ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                \u4E0B\u4E00\u9801 \u25B6\uFE0F
              </button>
              <button (click)="lastPage()" 
                      [disabled]="currentPage() === totalPages()"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === totalPages() ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                \u5C3E\u9801 \u23ED\uFE0F
              </button>
              
              <span class="ml-2 text-sm text-slate-400">
                \u7B2C {{ currentPage() }} / {{ totalPages() }} \u9801
              </span>
            </div>
          }
        }
      </div>
      
      <!-- \u{1F195} \u7FA4\u7D44\u8A73\u60C5\u5F48\u7A97 -->
      @if (showDetailDialog() && selectedResource(); as resource) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             (click)="closeDetail()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700"
               (click)="$event.stopPropagation()">
            <!-- \u5F48\u7A97\u6A19\u984C\u6B04 -->
            <div class="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/95">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 text-sm rounded-full font-medium" 
                      [class]="resource.resource_type === 'channel' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'">
                  {{ resource.resource_type === 'channel' ? '\u{1F4E2} \u983B\u9053' : '\u{1F465} \u7FA4\u7D44' }}
                </span>
                <h2 class="text-xl font-bold text-white">\u7FA4\u7D44\u8A73\u60C5</h2>
                <!-- \u{1F195} \u5C0E\u822A\u8A08\u6578 -->
                <span class="text-sm text-slate-400">
                  {{ selectedResourceIndex() + 1 }} / {{ filteredResources().length }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- \u{1F195} \u5C0E\u822A\u6309\u9215 -->
                <button (click)="navigatePrev()" 
                        [disabled]="!canNavigatePrev()"
                        class="p-2 rounded-lg transition-all"
                        [class]="canNavigatePrev() ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'"
                        title="\u4E0A\u4E00\u500B (\u2190 \u9375)">
                  \u2190
                </button>
                <button (click)="navigateNext()" 
                        [disabled]="!canNavigateNext()"
                        class="p-2 rounded-lg transition-all"
                        [class]="canNavigateNext() ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'"
                        title="\u4E0B\u4E00\u500B (\u2192 \u9375)">
                  \u2192
                </button>
                <div class="w-px h-6 bg-slate-700 mx-1"></div>
                <button (click)="closeDetail()" 
                        class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        title="\u95DC\u9589 (Esc \u9375)">
                  \u2715
                </button>
              </div>
            </div>
            
            <!-- \u5F48\u7A97\u5167\u5BB9 -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <!-- \u6A19\u984C\u548C\u982D\u50CF -->
              <div class="flex items-start gap-4 mb-6">
                <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl flex-shrink-0">
                  {{ resource.title[0] || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-2xl font-bold text-white mb-1">{{ resource.title }}</h3>
                  @if (resource.username) {
                    <a [href]="'https://t.me/' + resource.username" target="_blank" 
                       class="text-cyan-400 hover:underline">
                      @{{ resource.username }}
                    </a>
                  }
                </div>
                <button (click)="toggleSave(resource)"
                        class="p-3 rounded-xl transition-all"
                        [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400'">
                  {{ resource.is_saved ? '\u2B50' : '\u2606' }}
                </button>
              </div>
              
              <!-- \u{1F4CA} \u57FA\u672C\u4FE1\u606F -->
              <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>\u{1F4CA}</span> \u57FA\u672C\u4FE1\u606F
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-slate-500 text-sm mb-1">\u985E\u578B</div>
                    <div class="text-white">{{ resource.resource_type === 'channel' ? '\u983B\u9053' : '\u7FA4\u7D44' }}</div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">Telegram ID</div>
                    <div class="flex items-center gap-2">
                      @if (resource.telegram_id) {
                        <code class="font-mono text-cyan-300">{{ resource.telegram_id }}</code>
                        <button (click)="copyId(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedId() === resource.telegram_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'">
                          {{ copiedId() === resource.telegram_id ? '\u2713' : '\u{1F4CB}' }}
                        </button>
                      } @else if (resource.username) {
                        <code class="font-mono text-slate-400">@{{ resource.username }}</code>
                        <!-- \u53EA\u5728\u672A\u52A0\u5165\u6642\u986F\u793A\u300C\u9700\u52A0\u5165\u300D\u63D0\u793A\uFF0C\u907F\u514D\u72C0\u614B\u77DB\u76FE -->
                        @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                          <span class="text-xs text-amber-400/80" title="\u52A0\u5165\u7FA4\u7D44\u5F8C\u53EF\u7372\u53D6\u5B8C\u6574\u6578\u5B57 ID">\u26A0\uFE0F \u9700\u52A0\u5165\u7372\u53D6ID</span>
                        } @else {
                          <span class="text-xs text-blue-400/80" title="\u6B63\u5728\u540C\u6B65ID...">\u{1F504} \u540C\u6B65\u4E2D</span>
                        }
                      } @else {
                        @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                          <span class="text-slate-500">\u9700\u52A0\u5165\u7372\u53D6</span>
                        } @else {
                          <span class="text-blue-400">\u{1F504} \u540C\u6B65\u4E2D</span>
                        }
                      }
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">Username</div>
                    <div class="flex items-center gap-2">
                      @if (resource.username) {
                        <span class="text-white">@{{ resource.username }}</span>
                        <button (click)="copyLink(resource, $event)"
                                class="px-2 py-1 text-xs bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 rounded transition-all">
                          \u{1F517}
                        </button>
                      } @else {
                        <span class="text-slate-500">\u7121</span>
                      }
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">\u9023\u7D50</div>
                    @if (resource.username) {
                      <a [href]="'https://t.me/' + resource.username" target="_blank" 
                         class="text-cyan-400 hover:underline text-sm">
                        t.me/{{ resource.username }}
                      </a>
                    } @else {
                      <span class="text-slate-500">\u7121\u516C\u958B\u9023\u7D50</span>
                    }
                  </div>
                </div>
              </div>
              
              <!-- \u{1F465} \u6210\u54E1\u6578\u64DA -->
              <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>\u{1F465}</span> \u6210\u54E1\u6578\u64DA
                </h4>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-2xl font-bold text-cyan-400">{{ resource.member_count | number }}</div>
                    <div class="text-slate-500 text-sm">\u7E3D\u6210\u54E1</div>
                  </div>
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-xl font-bold text-yellow-400 mb-1">
                      @if ((resource.overall_score || 0) >= 0.7) {
                        \u2B50\u2B50\u2B50
                      } @else if ((resource.overall_score || 0) >= 0.5) {
                        \u2B50\u2B50
                      } @else {
                        \u2B50
                      }
                    </div>
                    <div class="text-cyan-400 font-mono text-lg">{{ formatScore(resource.overall_score) }}</div>
                    <div class="text-slate-500 text-xs">\u76F8\u95DC\u5EA6</div>
                  </div>
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-2xl font-bold" [class]="(resource.status === 'joined' || resource.status === 'monitoring') ? 'text-green-400' : 'text-slate-400'">
                      {{ (resource.status === 'joined' || resource.status === 'monitoring') ? '\u2713' : '\u2014' }}
                    </div>
                    <div class="text-slate-500 text-sm">
                      @if (resource.status === 'monitoring') {
                        \u5DF2\u52A0\u5165\xB7\u76E3\u63A7\u4E2D
                      } @else if (resource.status === 'joined') {
                        \u5DF2\u52A0\u5165
                      } @else if (resource.status === 'joining') {
                        \u52A0\u5165\u4E2D...
                      } @else {
                        \u672A\u52A0\u5165
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- \u{1F4DD} \u63CF\u8FF0 -->
              @if (resource.description) {
                <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                  <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <span>\u{1F4DD}</span> \u7FA4\u7D44\u63CF\u8FF0
                  </h4>
                  <p class="text-slate-400 whitespace-pre-wrap">{{ resource.description }}</p>
                </div>
              }
              
              <!-- \u{1F3F7}\uFE0F \u4F86\u6E90\u4FE1\u606F -->
              <div class="bg-slate-900/50 rounded-xl p-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>\u{1F3F7}\uFE0F</span> \u4F86\u6E90\u4FE1\u606F
                </h4>
                <div class="flex flex-wrap gap-2">
                  @if (resource.discovery_source) {
                    <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      \u4F86\u6E90\uFF1A{{ getSourceLabel(resource.discovery_source) }}
                    </span>
                  }
                  @if (resource.discovery_keyword) {
                    <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
                      \u95DC\u9375\u8A5E\uFF1A{{ resource.discovery_keyword }}
                    </span>
                  }
                  @if (resource.created_at) {
                    <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      \u767C\u73FE\u6642\u9593\uFF1A{{ resource.created_at | date:'yyyy-MM-dd HH:mm' }}
                    </span>
                  }
                </div>
              </div>
            </div>
            
            <!-- \u5F48\u7A97\u5E95\u90E8\u64CD\u4F5C\u6B04 -->
            <div class="px-6 py-4 border-t border-slate-700 bg-slate-800/95 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button (click)="toggleSave(resource)"
                        class="px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                        [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                  {{ resource.is_saved ? '\u2B50 \u5DF2\u6536\u85CF' : '\u2606 \u6536\u85CF' }}
                </button>
                @if (resource.username) {
                  <a [href]="'https://t.me/' + resource.username" target="_blank"
                     class="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg flex items-center gap-2">
                    \u{1F517} \u6253\u958B Telegram
                  </a>
                }
              </div>
              <div class="flex items-center gap-2">
                <button (click)="closeDetail()"
                        class="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg">
                  \u95DC\u9589
                </button>
                @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                  <button (click)="openJoinDialog(resource); closeDetail()"
                          class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20">
                    \u{1F680} \u52A0\u5165\u7FA4\u7D44
                  </button>
                } @else {
                  @if (resource.resource_type !== 'channel') {
                    <button (click)="extractMembers(resource); closeDetail()"
                            class="px-6 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-all">
                      \u{1F465} \u63D0\u53D6\u6210\u54E1
                    </button>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- \u{1F527} P0-2: \u5E33\u865F\u9078\u64C7\u5C0D\u8A71\u6846 -->
      @if (showJoinAccountDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
             (click)="cancelJoinDialog()">
          <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-[420px] max-h-[80vh] overflow-hidden"
               (click)="$event.stopPropagation()">
            <!-- \u6A19\u984C -->
            <div class="p-5 border-b border-slate-700 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                \u{1F680} \u9078\u64C7\u52A0\u5165\u5E33\u865F
              </h3>
              @if (joinDialogResource(); as resource) {
                <p class="text-sm text-slate-400 mt-1 truncate">{{ resource.title }}</p>
              }
            </div>
            
            <!-- \u7FA4\u7D44\u4FE1\u606F -->
            @if (joinDialogResource(); as resource) {
              <div class="p-4 border-b border-slate-700/50 bg-slate-800/50">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {{ resource.title?.charAt(0) || 'G' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-white truncate">{{ resource.title }}</div>
                    @if (resource.username) {
                      <div class="text-sm text-cyan-400">@{{ resource.username }}</div>
                    }
                    <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>\u{1F465} {{ resource.member_count | number }} \u6210\u54E1</span>
                    </div>
                  </div>
                </div>
              </div>
            }
            
            <!-- \u5E33\u865F\u5217\u8868 -->
            <div class="p-4 max-h-[300px] overflow-y-auto">
              <div class="text-sm text-slate-400 mb-3">\u9078\u64C7\u8981\u4F7F\u7528\u7684\u5E33\u865F\uFF1A</div>
              <div class="space-y-2">
                @for (acc of mergedAccounts(); track acc.id) {
                  @if (acc.status === 'Online') {
                    <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                           [class]="joinDialogSelectedPhone() === acc.phone 
                             ? 'bg-cyan-500/20 border-2 border-cyan-500' 
                             : 'bg-slate-700/30 border-2 border-transparent hover:bg-slate-700/50'">
                      <input type="radio" 
                             [value]="acc.phone" 
                             [checked]="joinDialogSelectedPhone() === acc.phone"
                             (change)="joinDialogSelectedPhone.set(acc.phone)"
                             class="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 focus:ring-cyan-500">
                      <div class="flex-1">
                        <div class="font-mono text-white">{{ acc.phone }}</div>
                        @if (acc.display_name) {
                          <div class="text-xs text-slate-400">{{ acc.display_name }}</div>
                        }
                      </div>
                      <span class="w-2 h-2 rounded-full bg-green-400"></span>
                    </label>
                  }
                }
              </div>
            </div>
            
            <!-- \u64CD\u4F5C\u6309\u9215 -->
            <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
              <button (click)="cancelJoinDialog()"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                \u53D6\u6D88
              </button>
              <button (click)="confirmJoinFromDialog()"
                      [disabled]="!joinDialogSelectedPhone()"
                      class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all">
                \u78BA\u8A8D\u52A0\u5165
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `, styles: ["/* angular:styles/component:css;efbb247d89ec398bcebdc46eb0729d028f9368b1270a3f362ac7cd29f4d18bdb;D:/tgkz2026/src/search-discovery/search-discovery.component.ts */\n:host {\n  display: block;\n  height: 100%;\n}\n.line-clamp-2 {\n  display: -webkit-box;\n  -webkit-line-clamp: 2;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n::-webkit-scrollbar {\n  width: 8px;\n}\n::-webkit-scrollbar-track {\n  background: transparent;\n}\n::-webkit-scrollbar-thumb {\n  background: rgba(100, 116, 139, 0.3);\n  border-radius: 4px;\n}\n::-webkit-scrollbar-thumb:hover {\n  background: rgba(100, 116, 139, 0.5);\n}\n/*# sourceMappingURL=search-discovery.component.css.map */\n"] }]
  }], null, { resources: [{ type: Input, args: [{ isSignal: true, alias: "resources", required: false }] }], isSearching: [{ type: Input, args: [{ isSignal: true, alias: "isSearching", required: false }] }], selectedAccount: [{ type: Input, args: [{ isSignal: true, alias: "selectedAccount", required: false }] }], availableAccounts: [{ type: Input, args: [{ isSignal: true, alias: "availableAccounts", required: false }] }], historyKeywords: [{ type: Input, args: [{ isSignal: true, alias: "historyKeywords", required: false }] }], currentKeyword: [{ type: Input, args: [{ isSignal: true, alias: "currentKeyword", required: false }] }], searchError: [{ type: Input, args: [{ isSignal: true, alias: "searchError", required: false }] }], savedResourceIds: [{ type: Input, args: [{ isSignal: true, alias: "savedResourceIds", required: false }] }], searchEvent: [{ type: Output, args: ["searchEvent"] }], selectAccountEvent: [{ type: Output, args: ["selectAccountEvent"] }], saveResourceEvent: [{ type: Output, args: ["saveResourceEvent"] }], unsaveResourceEvent: [{ type: Output, args: ["unsaveResourceEvent"] }], joinResourceEvent: [{ type: Output, args: ["joinResourceEvent"] }], extractMembersEvent: [{ type: Output, args: ["extractMembersEvent"] }], clearResultsEvent: [{ type: Output, args: ["clearResultsEvent"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SearchDiscoveryComponent, { className: "SearchDiscoveryComponent", filePath: "src/search-discovery/search-discovery.component.ts", lineNumber: 1059 });
})();

// src/views/resource-discovery-view.component.ts
var ResourceDiscoveryViewComponent = class _ResourceDiscoveryViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.membershipService = inject(MembershipService);
    this.accountService = inject(AccountManagementService);
    this.resourceService = inject(ResourceService);
  }
  // 導航
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  // 選擇資源
  selectResource(resource) {
    this.resourceService.toggleSelection(resource.id);
  }
  // 批量加入
  batchJoin(resources) {
    const ids = resources.map((r) => r.id).join(",");
    this.resourceService.batchJoin(ids);
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  static {
    this.\u0275fac = function ResourceDiscoveryViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ResourceDiscoveryViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ResourceDiscoveryViewComponent, selectors: [["app-resource-discovery-view"]], decls: 1, vars: 0, consts: [[3, "resourceSelected", "batchJoin", "navigateTo"]], template: function ResourceDiscoveryViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-search-discovery", 0);
        \u0275\u0275listener("resourceSelected", function ResourceDiscoveryViewComponent_Template_app_search_discovery_resourceSelected_0_listener($event) {
          return ctx.selectResource($event);
        })("batchJoin", function ResourceDiscoveryViewComponent_Template_app_search_discovery_batchJoin_0_listener($event) {
          return ctx.batchJoin($event);
        })("navigateTo", function ResourceDiscoveryViewComponent_Template_app_search_discovery_navigateTo_0_listener($event) {
          return ctx.navigateTo($event);
        });
        \u0275\u0275elementEnd();
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      SearchDiscoveryComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ResourceDiscoveryViewComponent, [{
    type: Component,
    args: [{
      selector: "app-resource-discovery-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        SearchDiscoveryComponent
      ],
      template: `
    <app-search-discovery
      (resourceSelected)="selectResource($event)"
      (batchJoin)="batchJoin($event)"
      (navigateTo)="navigateTo($event)">
    </app-search-discovery>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ResourceDiscoveryViewComponent, { className: "ResourceDiscoveryViewComponent", filePath: "src/views/resource-discovery-view.component.ts", lineNumber: 37 });
})();

export {
  SearchDiscoveryComponent,
  ResourceDiscoveryViewComponent
};
//# sourceMappingURL=chunk-T2EVRWZF.js.map
