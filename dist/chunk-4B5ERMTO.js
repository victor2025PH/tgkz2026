import {
  ConfigProgressComponent,
  MonitoringStateService
} from "./chunk-VPZYGYND.js";
import {
  DialogService
} from "./chunk-6VGJ7XKC.js";
import {
  AccountManagementService
} from "./chunk-MYE5TICQ.js";
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
  MaxValidator,
  MinValidator,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  RadioControlValueAccessor,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-G42HF5FJ.js";
import {
  I18nService
} from "./chunk-NBYDSPUQ.js";
import {
  CommonModule,
  DatePipe,
  DecimalPipe
} from "./chunk-7CO55ZOM.js";
import {
  MembershipService,
  ToastService
} from "./chunk-FPLBFLUX.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  Input,
  Output,
  __spreadProps,
  __spreadValues,
  computed,
  effect,
  inject,
  input,
  output,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵattribute,
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
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵpipeBind2,
  ɵɵproperty,
  ɵɵpureFunction0,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵstyleProp,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-Y4VZODST.js";

// src/confirm-dialog.service.ts
var ConfirmDialogService = class _ConfirmDialogService {
  constructor() {
    this.state = signal({
      isOpen: false,
      type: "info",
      title: "",
      message: "",
      confirmText: "\u78BA\u5B9A",
      cancelText: "\u53D6\u6D88",
      affectedItems: [],
      requireConfirmText: false,
      confirmTextRequired: ""
    }, ...ngDevMode ? [{ debugName: "state" }] : []);
  }
  /**
   * 顯示確認對話框
   * @returns Promise<boolean> - 用戶點擊確定返回 true，取消返回 false
   */
  confirm(config) {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        type: config.type || "info",
        title: config.title,
        message: config.message,
        confirmText: config.confirmText || "\u78BA\u5B9A",
        cancelText: config.cancelText || "\u53D6\u6D88",
        affectedItems: config.affectedItems || [],
        requireConfirmText: config.requireConfirmText || false,
        confirmTextRequired: config.confirmTextRequired || "DELETE",
        resolve
      });
    });
  }
  /**
   * 危險操作確認（紅色樣式）
   */
  danger(title, message, affectedItems) {
    return this.confirm({
      type: "danger",
      title,
      message,
      confirmText: "\u522A\u9664",
      affectedItems
    });
  }
  /**
   * 警告確認（黃色樣式）
   */
  warning(title, message) {
    return this.confirm({
      type: "warning",
      title,
      message,
      confirmText: "\u78BA\u5B9A"
    });
  }
  /**
   * 普通確認（藍色樣式）
   */
  info(title, message) {
    return this.confirm({
      type: "info",
      title,
      message
    });
  }
  /**
   * 處理確定
   */
  onConfirm() {
    const currentState = this.state();
    if (currentState.resolve) {
      currentState.resolve(true);
    }
    this.close();
  }
  /**
   * 處理取消
   */
  onCancel() {
    const currentState = this.state();
    if (currentState.resolve) {
      currentState.resolve(false);
    }
    this.close();
  }
  /**
   * 關閉對話框
   */
  close() {
    this.state.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  static {
    this.\u0275fac = function ConfirmDialogService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ConfirmDialogService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ConfirmDialogService, factory: _ConfirmDialogService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ConfirmDialogService, [{
    type: Injectable,
    args: [{ providedIn: "root" }]
  }], null, null);
})();

// src/dialogs/history-collection-dialog.component.ts
var _forTrack0 = ($index, $item) => $item.value;
function HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 27)(1, "span", 29);
    \u0275\u0275text(2, "\u23F3");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span", 30);
    \u0275\u0275text(4, "\u52A0\u8F09\u7D71\u8A08\u6578\u64DA...");
    \u0275\u0275domElementEnd()();
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_10_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 37);
    \u0275\u0275text(1);
    \u0275\u0275pipe(2, "date");
    \u0275\u0275pipe(3, "date");
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" \u{1F4C5} \u6D88\u606F\u7BC4\u570D\uFF1A", \u0275\u0275pipeBind2(2, 2, ctx_r1.stats().dateRange.first, "yyyy-MM-dd"), " ~ ", \u0275\u0275pipeBind2(3, 5, ctx_r1.stats().dateRange.last, "yyyy-MM-dd"), " ");
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 31)(1, "div", 32)(2, "div", 33);
    \u0275\u0275text(3);
    \u0275\u0275pipe(4, "number");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "div", 34);
    \u0275\u0275text(6, "\u76E3\u63A7\u6D88\u606F");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(7, "div", 32)(8, "div", 35);
    \u0275\u0275text(9);
    \u0275\u0275pipe(10, "number");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(11, "div", 34);
    \u0275\u0275text(12, "\u552F\u4E00\u767C\u8A00\u8005");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(13, "div", 32)(14, "div", 36);
    \u0275\u0275text(15);
    \u0275\u0275pipe(16, "number");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(17, "div", 34);
    \u0275\u0275text(18, "\u5DF2\u6536\u96C6");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275conditionalCreate(19, HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_10_Conditional_19_Template, 4, 8, "div", 37);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(4, 4, ctx_r1.stats().totalMessages));
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(10, 6, ctx_r1.stats().uniqueSenders));
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(16, 8, ctx_r1.stats().collectedUsers));
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.stats().dateRange.first ? 19 : -1);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 28)(1, "p", 38);
    \u0275\u0275text(2, "\u26A0\uFE0F \u66AB\u7121\u76E3\u63A7\u6578\u64DA");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "p", 39);
    \u0275\u0275text(4, "\u8ACB\u5148\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u4E00\u6BB5\u6642\u9593");
    \u0275\u0275domElementEnd()();
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 13)(1, "div", 22)(2, "div", 23);
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div", 24)(5, "h3", 25);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "p", 26);
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275conditionalCreate(9, HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_9_Template, 5, 0, "div", 27)(10, HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_10_Template, 20, 10)(11, HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Conditional_11_Template, 5, 0, "div", 28);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r1.group().name[0], " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.group().name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.group().url || "\u79C1\u5BC6\u7FA4\u7D44");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isLoadingStats() ? 9 : ctx_r1.stats() ? 10 : 11);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 54);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_30_Template_button_click_0_listener() {
      const option_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.setLimit(option_r5.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const option_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("border-orange-500", ctx_r1.config().limit === option_r5.value)("bg-orange-500/20", ctx_r1.config().limit === option_r5.value)("text-orange-400", ctx_r1.config().limit === option_r5.value)("border-slate-700", ctx_r1.config().limit !== option_r5.value)("bg-slate-800/50", ctx_r1.config().limit !== option_r5.value)("text-slate-400", ctx_r1.config().limit !== option_r5.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", option_r5.label, " ");
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_36_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 54);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_36_Template_button_click_0_listener() {
      const option_r7 = \u0275\u0275restoreView(_r6).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.setTimeRange(option_r7.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const option_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("border-cyan-500", ctx_r1.config().timeRange === option_r7.value)("bg-cyan-500/20", ctx_r1.config().timeRange === option_r7.value)("text-cyan-400", ctx_r1.config().timeRange === option_r7.value)("border-slate-700", ctx_r1.config().timeRange !== option_r7.value)("bg-slate-800/50", ctx_r1.config().timeRange !== option_r7.value)("text-slate-400", ctx_r1.config().timeRange !== option_r7.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", option_r7.label, " ");
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_42_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 54);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_42_Template_button_click_0_listener() {
      const option_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.setMinMessages(option_r9.value));
    });
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const option_r9 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275classProp("border-purple-500", ctx_r1.config().minMessages === option_r9.value)("bg-purple-500/20", ctx_r1.config().minMessages === option_r9.value)("text-purple-400", ctx_r1.config().minMessages === option_r9.value)("border-slate-700", ctx_r1.config().minMessages !== option_r9.value)("bg-slate-800/50", ctx_r1.config().minMessages !== option_r9.value)("text-slate-400", ctx_r1.config().minMessages !== option_r9.value);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", option_r9.label, " ");
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 53)(1, "div", 55)(2, "label", 56)(3, "input", 57);
    \u0275\u0275domListener("change", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template_input_change_3_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.toggleOption("skipDuplicates"));
    });
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "div")(5, "p", 58);
    \u0275\u0275text(6, "\u53BB\u91CD");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "p", 34);
    \u0275\u0275text(8, "\u8DF3\u904E\u5DF2\u6536\u96C6\u7528\u6236");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(9, "label", 56)(10, "input", 57);
    \u0275\u0275domListener("change", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template_input_change_10_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.toggleOption("excludeBots"));
    });
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(11, "div")(12, "p", 58);
    \u0275\u0275text(13, "\u6392\u9664\u6A5F\u5668\u4EBA");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(14, "p", 34);
    \u0275\u0275text(15, "\u904E\u6FFE Bot \u5E33\u865F");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(16, "label", 56)(17, "input", 57);
    \u0275\u0275domListener("change", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template_input_change_17_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.toggleOption("requireUsername"));
    });
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(18, "div")(19, "p", 58);
    \u0275\u0275text(20, "\u9700\u6709\u7528\u6236\u540D");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(21, "p", 34);
    \u0275\u0275text(22, "\u50C5\u6536\u96C6\u6709 @username");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(23, "label", 56)(24, "input", 57);
    \u0275\u0275domListener("change", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template_input_change_24_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.toggleOption("autoSync"));
    });
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(25, "div")(26, "p", 58);
    \u0275\u0275text(27, "\u81EA\u52D5\u540C\u6B65");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(28, "p", 34);
    \u0275\u0275text(29, "\u540C\u6B65\u5230\u8CC7\u6E90\u4E2D\u5FC3");
    \u0275\u0275domElementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275domProperty("checked", ctx_r1.config().options.skipDuplicates);
    \u0275\u0275advance(7);
    \u0275\u0275domProperty("checked", ctx_r1.config().options.excludeBots);
    \u0275\u0275advance(7);
    \u0275\u0275domProperty("checked", ctx_r1.config().options.requireUsername);
    \u0275\u0275advance(7);
    \u0275\u0275domProperty("checked", ctx_r1.config().options.autoSync);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div")(1, "label", 40);
    \u0275\u0275text(2, " \u26A1 \u5FEB\u901F\u6A21\u677F ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "div", 31)(4, "button", 41);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template_button_click_4_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectTemplate("quick"));
    });
    \u0275\u0275domElementStart(5, "div", 42);
    \u0275\u0275text(6, "\u26A1");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "p", 43);
    \u0275\u0275text(8, "\u5FEB\u901F\u6536\u96C6");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(9, "p", 39);
    \u0275\u0275text(10, "100\u4EBA \xB7 7\u5929\u5167");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(11, "button", 41);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectTemplate("precise"));
    });
    \u0275\u0275domElementStart(12, "div", 42);
    \u0275\u0275text(13, "\u{1F3AF}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(14, "p", 43);
    \u0275\u0275text(15, "\u7CBE\u6E96\u6536\u96C6");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(16, "p", 39);
    \u0275\u0275text(17, "\u767C\u8A00\u22653\u6B21");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(18, "button", 41);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template_button_click_18_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.selectTemplate("deep"));
    });
    \u0275\u0275domElementStart(19, "div", 42);
    \u0275\u0275text(20, "\u{1F50D}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(21, "p", 43);
    \u0275\u0275text(22, "\u6DF1\u5EA6\u6536\u96C6");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(23, "p", 39);
    \u0275\u0275text(24, "\u5168\u90E8\u6B77\u53F2");
    \u0275\u0275domElementEnd()()()();
    \u0275\u0275domElementStart(25, "div")(26, "label", 40);
    \u0275\u0275text(27, " \u{1F522} \u6536\u96C6\u6578\u91CF ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(28, "div", 44);
    \u0275\u0275repeaterCreate(29, HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_30_Template, 2, 13, "button", 45, _forTrack0);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(31, "div")(32, "label", 40);
    \u0275\u0275text(33, " \u{1F4C5} \u6642\u9593\u7BC4\u570D ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(34, "div", 44);
    \u0275\u0275repeaterCreate(35, HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_36_Template, 2, 13, "button", 46, _forTrack0);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(37, "div")(38, "label", 40);
    \u0275\u0275text(39, " \u{1F525} \u6D3B\u8E8D\u5EA6\u7BE9\u9078\uFF08\u6700\u5C11\u767C\u8A00\u6B21\u6578\uFF09 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(40, "div", 44);
    \u0275\u0275repeaterCreate(41, HistoryCollectionDialogComponent_Conditional_0_Conditional_17_For_42_Template, 2, 13, "button", 47, _forTrack0);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(43, "div", 48)(44, "button", 49);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template_button_click_44_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.showAdvanced.set(!ctx_r1.showAdvanced()));
    });
    \u0275\u0275domElementStart(45, "span", 50);
    \u0275\u0275text(46, "\u2699\uFE0F \u9032\u968E\u9078\u9805");
    \u0275\u0275domElementEnd();
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(47, "svg", 51);
    \u0275\u0275domElement(48, "path", 52);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(49, HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Conditional_49_Template, 30, 4, "div", 53);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275classProp("border-orange-500", ctx_r1.selectedTemplate() === "quick")("bg-orange-500/20", ctx_r1.selectedTemplate() === "quick")("border-slate-700", ctx_r1.selectedTemplate() !== "quick")("bg-slate-800/50", ctx_r1.selectedTemplate() !== "quick");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-emerald-500", ctx_r1.selectedTemplate() === "precise")("bg-emerald-500/20", ctx_r1.selectedTemplate() === "precise")("border-slate-700", ctx_r1.selectedTemplate() !== "precise")("bg-slate-800/50", ctx_r1.selectedTemplate() !== "precise");
    \u0275\u0275advance(7);
    \u0275\u0275classProp("border-blue-500", ctx_r1.selectedTemplate() === "deep")("bg-blue-500/20", ctx_r1.selectedTemplate() === "deep")("border-slate-700", ctx_r1.selectedTemplate() !== "deep")("bg-slate-800/50", ctx_r1.selectedTemplate() !== "deep");
    \u0275\u0275advance(11);
    \u0275\u0275repeater(ctx_r1.limitOptions);
    \u0275\u0275advance(6);
    \u0275\u0275repeater(ctx_r1.timeRangeOptions);
    \u0275\u0275advance(6);
    \u0275\u0275repeater(ctx_r1.activityOptions);
    \u0275\u0275advance(6);
    \u0275\u0275classProp("rotate-180", ctx_r1.showAdvanced());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.showAdvanced() ? 49 : -1);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 14)(1, "div", 59)(2, "span", 60)(3, "span", 61);
    \u0275\u0275text(4, "\u23F3");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(5, " \u6B63\u5728\u6536\u96C6\u7528\u6236... ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "span", 62);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(8, "div", 63);
    \u0275\u0275domElement(9, "div", 64);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "div", 65);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate2(" ", ctx_r1.collectionProgress().current, " / ", ctx_r1.collectionProgress().total, " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r1.getProgressPercent(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.collectionProgress().status);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 15)(1, "div", 59)(2, "span", 66)(3, "span");
    \u0275\u0275text(4, "\u2705");
    \u0275\u0275domElementEnd();
    \u0275\u0275text(5, " \u6536\u96C6\u5B8C\u6210\uFF01 ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(6, "span", 67);
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(8, "div", 68)(9, "div", 69)(10, "div", 70);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(12, "div", 34);
    \u0275\u0275text(13, "\u65B0\u589E");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(14, "div", 69)(15, "div", 71);
    \u0275\u0275text(16);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(17, "div", 34);
    \u0275\u0275text(18, "\u66F4\u65B0");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(19, "div", 69)(20, "div", 72);
    \u0275\u0275text(21);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(22, "div", 34);
    \u0275\u0275text(23, "\u8DF3\u904E");
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(24, "div", 69)(25, "div", 73);
    \u0275\u0275text(26);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(27, "div", 34);
    \u0275\u0275text(28, "\u9AD8\u6D3B\u8E8D");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(29, "div", 62)(30, "div", 74)(31, "span", 75);
    \u0275\u0275text(32, "\u{1F525}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(33, "span");
    \u0275\u0275text(34);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(35, "div", 74)(36, "span", 76);
    \u0275\u0275text(37, "\u2713");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(38, "span");
    \u0275\u0275text(39);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(40, "div", 77)(41, "span", 78);
    \u0275\u0275text(42, "\u25CB");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(43, "span");
    \u0275\u0275text(44);
    \u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" ", ctx_r1.collectionResult().collected, " \u4EBA ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.collectionResult().newUsers);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.collectionResult().updated);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.collectionResult().skipped);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.collectionResult().quality.highActivity);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate1("\u9AD8\u6D3B\u8E8D (\u226510\u6B21)\uFF1A", ctx_r1.collectionResult().quality.highActivity, " \u4EBA");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("\u4E2D\u6D3B\u8E8D (3-9\u6B21)\uFF1A", ctx_r1.collectionResult().quality.mediumActivity, " \u4EBA");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("\u4F4E\u6D3B\u8E8D (<3\u6B21)\uFF1A", ctx_r1.collectionResult().quality.lowActivity, " \u4EBA");
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 17)(1, "span", 30);
    \u0275\u0275text(2, " \u{1F4A1} \u9810\u8A08\u6536\u96C6\uFF1A ");
    \u0275\u0275domElementStart(3, "span", 79);
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275text(5, " \u4EBA ");
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r1.estimatedCount());
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span", 61);
    \u0275\u0275text(1, "\u23F3");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(2, "span");
    \u0275\u0275text(3, "\u6536\u96C6\u4E2D...");
    \u0275\u0275domElementEnd();
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "span");
    \u0275\u0275text(1, "\u{1F504}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(2, "span");
    \u0275\u0275text(3, "\u958B\u59CB\u6536\u96C6");
    \u0275\u0275domElementEnd();
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 80);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.startCollection());
    });
    \u0275\u0275conditionalCreate(1, HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Conditional_1_Template, 4, 0)(2, HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Conditional_2_Template, 4, 0);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275domProperty("disabled", !ctx_r1.canStart());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isCollecting() ? 1 : 2);
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "button", 81);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Conditional_26_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.viewCollectedUsers());
    });
    \u0275\u0275domElementStart(1, "span");
    \u0275\u0275text(2, "\u{1F465}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "span");
    \u0275\u0275text(4, "\u67E5\u770B\u5DF2\u6536\u96C6\u7528\u6236");
    \u0275\u0275domElementEnd()();
  }
}
function HistoryCollectionDialogComponent_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 1);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Template_div_click_0_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.onBackdropClick($event));
    });
    \u0275\u0275domElementStart(1, "div", 2);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r1);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275domElementStart(2, "div", 3)(3, "div", 4)(4, "div", 5)(5, "div", 6);
    \u0275\u0275text(6, " \u{1F504} ");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "div")(8, "h2", 7);
    \u0275\u0275text(9, "\u5F9E\u6B77\u53F2\u6D88\u606F\u6536\u96C6\u7528\u6236");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "p", 8);
    \u0275\u0275text(11, "\u6536\u96C6\u76E3\u63A7\u671F\u9593\u7684\u767C\u8A00\u7528\u6236");
    \u0275\u0275domElementEnd()()();
    \u0275\u0275domElementStart(12, "button", 9);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.close());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(13, "svg", 10);
    \u0275\u0275domElement(14, "path", 11);
    \u0275\u0275domElementEnd()()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(15, "div", 12);
    \u0275\u0275conditionalCreate(16, HistoryCollectionDialogComponent_Conditional_0_Conditional_16_Template, 12, 4, "div", 13);
    \u0275\u0275conditionalCreate(17, HistoryCollectionDialogComponent_Conditional_0_Conditional_17_Template, 50, 27);
    \u0275\u0275conditionalCreate(18, HistoryCollectionDialogComponent_Conditional_0_Conditional_18_Template, 12, 5, "div", 14);
    \u0275\u0275conditionalCreate(19, HistoryCollectionDialogComponent_Conditional_0_Conditional_19_Template, 45, 8, "div", 15);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(20, "div", 16);
    \u0275\u0275conditionalCreate(21, HistoryCollectionDialogComponent_Conditional_0_Conditional_21_Template, 6, 1, "div", 17);
    \u0275\u0275domElementStart(22, "div", 18)(23, "button", 19);
    \u0275\u0275domListener("click", function HistoryCollectionDialogComponent_Conditional_0_Template_button_click_23_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.close());
    });
    \u0275\u0275text(24);
    \u0275\u0275domElementEnd();
    \u0275\u0275conditionalCreate(25, HistoryCollectionDialogComponent_Conditional_0_Conditional_25_Template, 3, 2, "button", 20)(26, HistoryCollectionDialogComponent_Conditional_0_Conditional_26_Template, 5, 0, "button", 21);
    \u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(16);
    \u0275\u0275conditional(ctx_r1.group() ? 16 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.stats() && ctx_r1.stats().totalMessages > 0 ? 17 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isCollecting() ? 18 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.collectionResult() ? 19 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.stats() && ctx_r1.stats().totalMessages > 0 && !ctx_r1.isCollecting() && !ctx_r1.collectionResult() ? 21 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r1.collectionResult() ? "\u95DC\u9589" : "\u53D6\u6D88", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r1.collectionResult() ? 25 : 26);
  }
}
var HistoryCollectionDialogComponent = class _HistoryCollectionDialogComponent {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.isOpen = input(false, ...ngDevMode ? [{ debugName: "isOpen" }] : []);
    this.group = input(null, ...ngDevMode ? [{ debugName: "group" }] : []);
    this.closeDialog = output();
    this.collectionComplete = output();
    this.viewUsersEvent = output();
    this.isLoadingStats = signal(false, ...ngDevMode ? [{ debugName: "isLoadingStats" }] : []);
    this.openEffect = effect(() => {
      if (this.isOpen() && this.group()) {
        this.loadStats();
      }
    }, ...ngDevMode ? [{ debugName: "openEffect" }] : []);
    this.stats = signal(null, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.selectedTemplate = signal("precise", ...ngDevMode ? [{ debugName: "selectedTemplate" }] : []);
    this.showAdvanced = signal(false, ...ngDevMode ? [{ debugName: "showAdvanced" }] : []);
    this.isCollecting = signal(false, ...ngDevMode ? [{ debugName: "isCollecting" }] : []);
    this.collectionProgress = signal({ current: 0, total: 0, status: "" }, ...ngDevMode ? [{ debugName: "collectionProgress" }] : []);
    this.collectionResult = signal(null, ...ngDevMode ? [{ debugName: "collectionResult" }] : []);
    this.config = signal({
      limit: 200,
      timeRange: "30d",
      minMessages: 1,
      options: {
        skipDuplicates: true,
        excludeBots: true,
        requireUsername: false,
        excludeAdmins: false,
        autoSync: true
      }
    }, ...ngDevMode ? [{ debugName: "config" }] : []);
    this.limitOptions = [
      { value: 50, label: "50 \u4EBA" },
      { value: 100, label: "100 \u4EBA" },
      { value: 200, label: "200 \u4EBA" },
      { value: 500, label: "500 \u4EBA" },
      { value: -1, label: "\u5168\u90E8" }
    ];
    this.timeRangeOptions = [
      { value: "7d", label: "\u6700\u8FD1 7 \u5929" },
      { value: "30d", label: "\u6700\u8FD1 30 \u5929" },
      { value: "90d", label: "\u6700\u8FD1 90 \u5929" },
      { value: "all", label: "\u5168\u90E8\u6B77\u53F2" }
    ];
    this.activityOptions = [
      { value: 1, label: "\u5168\u90E8" },
      { value: 3, label: "\u2265 3 \u6B21" },
      { value: 5, label: "\u2265 5 \u6B21" },
      { value: 10, label: "\u2265 10 \u6B21" }
    ];
    this.listeners = [];
    this.estimatedCount = computed(() => {
      const s = this.stats();
      const c = this.config();
      if (!s)
        return 0;
      let estimate = s.uniqueSenders;
      if (c.minMessages >= 10) {
        estimate = Math.round(estimate * 0.15);
      } else if (c.minMessages >= 5) {
        estimate = Math.round(estimate * 0.3);
      } else if (c.minMessages >= 3) {
        estimate = Math.round(estimate * 0.5);
      }
      if (c.timeRange === "7d") {
        estimate = Math.round(estimate * 0.3);
      } else if (c.timeRange === "30d") {
        estimate = Math.round(estimate * 0.6);
      } else if (c.timeRange === "90d") {
        estimate = Math.round(estimate * 0.85);
      }
      if (c.limit > 0) {
        estimate = Math.min(estimate, c.limit);
      }
      return Math.max(1, estimate);
    }, ...ngDevMode ? [{ debugName: "estimatedCount" }] : []);
    this.canStart = computed(() => {
      const s = this.stats();
      return s && s.totalMessages > 0 && !this.isCollecting();
    }, ...ngDevMode ? [{ debugName: "canStart" }] : []);
  }
  ngOnInit() {
    this.setupListeners();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("history-collection-stats", (data) => {
      this.isLoadingStats.set(false);
      if (data.success && data.stats) {
        this.stats.set(data.stats);
      } else {
        this.stats.set(null);
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("history-collection-progress", (data) => {
      this.collectionProgress.set({
        current: data.current,
        total: data.total,
        status: data.status
      });
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("history-collection-result", (data) => {
      this.isCollecting.set(false);
      if (data.success && data.result) {
        this.collectionResult.set(data.result);
        this.collectionComplete.emit(data.result);
        this.toastService.success(`\u2705 \u6536\u96C6\u5B8C\u6210\uFF01\u5171 ${data.result.collected} \u4F4D\u7528\u6236`);
      } else {
        this.toastService.error(data.error || "\u6536\u96C6\u5931\u6557");
      }
    });
    this.listeners.push(cleanup3);
  }
  // 當對話框打開時加載統計
  loadStats() {
    const g = this.group();
    if (!g)
      return;
    this.isLoadingStats.set(true);
    this.stats.set(null);
    this.collectionResult.set(null);
    this.ipcService.send("get-history-collection-stats", {
      groupId: g.id,
      telegramId: g.telegramId
    });
  }
  // 選擇模板
  selectTemplate(template) {
    this.selectedTemplate.set(template);
    switch (template) {
      case "quick":
        this.config.update((c) => __spreadProps(__spreadValues({}, c), {
          limit: 100,
          timeRange: "7d",
          minMessages: 1
        }));
        break;
      case "precise":
        this.config.update((c) => __spreadProps(__spreadValues({}, c), {
          limit: 200,
          timeRange: "30d",
          minMessages: 3
        }));
        break;
      case "deep":
        this.config.update((c) => __spreadProps(__spreadValues({}, c), {
          limit: -1,
          timeRange: "all",
          minMessages: 1
        }));
        break;
    }
  }
  setLimit(value) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), { limit: value }));
  }
  setTimeRange(value) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), { timeRange: value }));
  }
  setMinMessages(value) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), { minMessages: value }));
  }
  toggleOption(key) {
    this.config.update((c) => __spreadProps(__spreadValues({}, c), {
      options: __spreadProps(__spreadValues({}, c.options), {
        [key]: !c.options[key]
      })
    }));
  }
  getProgressPercent() {
    const p = this.collectionProgress();
    if (p.total === 0)
      return 0;
    return Math.min(100, Math.round(p.current / p.total * 100));
  }
  startCollection() {
    const g = this.group();
    if (!g || !this.canStart())
      return;
    this.isCollecting.set(true);
    this.collectionResult.set(null);
    this.collectionProgress.set({ current: 0, total: 0, status: "\u6B63\u5728\u521D\u59CB\u5316..." });
    const c = this.config();
    this.ipcService.send("collect-users-from-history-advanced", {
      groupId: g.id,
      telegramId: g.telegramId,
      config: {
        limit: c.limit,
        timeRange: c.timeRange,
        minMessages: c.minMessages,
        skipDuplicates: c.options.skipDuplicates,
        excludeBots: c.options.excludeBots,
        requireUsername: c.options.requireUsername,
        excludeAdmins: c.options.excludeAdmins,
        autoSync: c.options.autoSync
      }
    });
  }
  viewCollectedUsers() {
    this.viewUsersEvent.emit();
    this.close();
  }
  close() {
    this.closeDialog.emit();
  }
  onBackdropClick(event) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
  static {
    this.\u0275fac = function HistoryCollectionDialogComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _HistoryCollectionDialogComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _HistoryCollectionDialogComponent, selectors: [["app-history-collection-dialog"]], inputs: { isOpen: [1, "isOpen"], group: [1, "group"] }, outputs: { closeDialog: "closeDialog", collectionComplete: "collectionComplete", viewUsersEvent: "viewUsersEvent" }, decls: 1, vars: 1, consts: [[1, "fixed", "inset-0", "bg-black/70", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-[70]", "p-4"], [1, "fixed", "inset-0", "bg-black/70", "backdrop-blur-sm", "flex", "items-center", "justify-center", "z-[70]", "p-4", 3, "click"], [1, "bg-slate-900", "rounded-2xl", "w-full", "max-w-xl", "shadow-2xl", "border", "border-slate-700/50", "overflow-hidden", "max-h-[90vh]", "flex", "flex-col", 3, "click"], [1, "p-5", "border-b", "border-slate-700/50", "bg-gradient-to-r", "from-orange-500/10", "to-amber-500/10"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center", "gap-3"], [1, "w-10", "h-10", "rounded-xl", "bg-gradient-to-br", "from-orange-500", "to-amber-500", "flex", "items-center", "justify-center", "text-xl"], [1, "text-lg", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], [1, "p-2", "hover:bg-slate-800", "rounded-lg", "transition-colors", "text-slate-400", "hover:text-white", 3, "click"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-5", "h-5"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M6 18L18 6M6 6l12 12"], [1, "flex-1", "overflow-y-auto", "p-5", "space-y-5"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50"], [1, "p-4", "bg-orange-500/10", "rounded-xl", "border", "border-orange-500/30"], [1, "p-4", "bg-emerald-500/10", "rounded-xl", "border", "border-emerald-500/30"], [1, "p-5", "border-t", "border-slate-700/50", "bg-slate-800/30"], [1, "flex", "items-center", "justify-between", "mb-4", "text-sm"], [1, "flex", "gap-3"], [1, "flex-1", "py-3", "bg-slate-700", "hover:bg-slate-600", "text-slate-300", "rounded-xl", "transition-colors", "font-medium", 3, "click"], [1, "flex-1", "py-3", "bg-gradient-to-r", "from-orange-500", "to-amber-500", "hover:from-orange-600", "hover:to-amber-600", "text-white", "rounded-xl", "transition-all", "font-medium", "shadow-lg", "shadow-orange-500/20", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "justify-center", "gap-2", 3, "disabled"], [1, "flex-1", "py-3", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "hover:from-emerald-600", "hover:to-cyan-600", "text-white", "rounded-xl", "transition-all", "font-medium", "shadow-lg", "shadow-emerald-500/20", "flex", "items-center", "justify-center", "gap-2"], [1, "flex", "items-center", "gap-3", "mb-4"], [1, "w-12", "h-12", "rounded-xl", "bg-gradient-to-br", "from-orange-500/20", "to-amber-500/20", "flex", "items-center", "justify-center", "text-2xl"], [1, "flex-1", "min-w-0"], [1, "font-medium", "text-white", "truncate"], [1, "text-sm", "text-slate-400", "truncate"], [1, "flex", "items-center", "justify-center", "py-4"], [1, "p-4", "bg-amber-500/10", "border", "border-amber-500/30", "rounded-lg", "text-center"], [1, "animate-spin", "text-xl", "mr-2"], [1, "text-slate-400"], [1, "grid", "grid-cols-3", "gap-3"], [1, "p-3", "bg-slate-700/30", "rounded-lg", "text-center"], [1, "text-xl", "font-bold", "text-cyan-400"], [1, "text-xs", "text-slate-500"], [1, "text-xl", "font-bold", "text-emerald-400"], [1, "text-xl", "font-bold", "text-purple-400"], [1, "mt-3", "text-xs", "text-slate-500", "text-center"], [1, "text-sm", "text-amber-400"], [1, "text-xs", "text-slate-400", "mt-1"], [1, "block", "text-sm", "font-medium", "text-slate-300", "mb-3"], [1, "p-4", "rounded-xl", "border", "transition-all", "text-center", 3, "click"], [1, "text-2xl", "mb-1"], [1, "font-medium", "text-white", "text-sm"], [1, "flex", "flex-wrap", "gap-2"], [1, "px-4", "py-2", "rounded-lg", "border", "transition-all", "text-sm", 3, "border-orange-500", "bg-orange-500/20", "text-orange-400", "border-slate-700", "bg-slate-800/50", "text-slate-400"], [1, "px-4", "py-2", "rounded-lg", "border", "transition-all", "text-sm", 3, "border-cyan-500", "bg-cyan-500/20", "text-cyan-400", "border-slate-700", "bg-slate-800/50", "text-slate-400"], [1, "px-4", "py-2", "rounded-lg", "border", "transition-all", "text-sm", 3, "border-purple-500", "bg-purple-500/20", "text-purple-400", "border-slate-700", "bg-slate-800/50", "text-slate-400"], [1, "border", "border-slate-700/50", "rounded-xl", "overflow-hidden"], [1, "w-full", "p-4", "bg-slate-800/30", "flex", "items-center", "justify-between", "hover:bg-slate-800/50", "transition-colors", 3, "click"], [1, "text-sm", "font-medium", "text-slate-300"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-4", "h-4", "text-slate-400", "transition-transform"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M19 9l-7 7-7-7"], [1, "p-4", "space-y-3", "border-t", "border-slate-700/50"], [1, "px-4", "py-2", "rounded-lg", "border", "transition-all", "text-sm", 3, "click"], [1, "grid", "grid-cols-2", "gap-3"], [1, "flex", "items-center", "gap-3", "p-3", "bg-slate-700/30", "rounded-lg", "cursor-pointer", "hover:bg-slate-700/50"], ["type", "checkbox", 1, "rounded", "bg-slate-700", "border-slate-600", "text-orange-500", "focus:ring-orange-500", 3, "change", "checked"], [1, "text-sm", "text-white"], [1, "flex", "items-center", "justify-between", "mb-3"], [1, "text-sm", "text-orange-400", "flex", "items-center", "gap-2"], [1, "animate-spin"], [1, "text-xs", "text-slate-400"], [1, "w-full", "bg-slate-700", "rounded-full", "h-2", "overflow-hidden"], [1, "h-full", "bg-gradient-to-r", "from-orange-500", "to-amber-500", "rounded-full", "transition-all", "duration-300"], [1, "text-xs", "text-slate-500", "mt-2"], [1, "text-sm", "text-emerald-400", "flex", "items-center", "gap-2"], [1, "text-lg", "font-bold", "text-emerald-400"], [1, "grid", "grid-cols-4", "gap-2", "mb-3"], [1, "p-2", "bg-slate-700/30", "rounded-lg", "text-center"], [1, "text-sm", "font-bold", "text-green-400"], [1, "text-sm", "font-bold", "text-blue-400"], [1, "text-sm", "font-bold", "text-slate-400"], [1, "text-sm", "font-bold", "text-orange-400"], [1, "flex", "items-center", "gap-2", "mb-1"], [1, "text-orange-400"], [1, "text-emerald-400"], [1, "flex", "items-center", "gap-2"], [1, "text-slate-500"], [1, "text-orange-400", "font-medium"], [1, "flex-1", "py-3", "bg-gradient-to-r", "from-orange-500", "to-amber-500", "hover:from-orange-600", "hover:to-amber-600", "text-white", "rounded-xl", "transition-all", "font-medium", "shadow-lg", "shadow-orange-500/20", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "justify-center", "gap-2", 3, "click", "disabled"], [1, "flex-1", "py-3", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "hover:from-emerald-600", "hover:to-cyan-600", "text-white", "rounded-xl", "transition-all", "font-medium", "shadow-lg", "shadow-emerald-500/20", "flex", "items-center", "justify-center", "gap-2", 3, "click"]], template: function HistoryCollectionDialogComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275conditionalCreate(0, HistoryCollectionDialogComponent_Conditional_0_Template, 27, 7, "div", 0);
      }
      if (rf & 2) {
        \u0275\u0275conditional(ctx.isOpen() ? 0 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, DecimalPipe, DatePipe], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(HistoryCollectionDialogComponent, [{
    type: Component,
    args: [{
      selector: "app-history-collection-dialog",
      standalone: true,
      imports: [CommonModule, FormsModule],
      template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
           (click)="onBackdropClick($event)">
        <div class="bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col"
             (click)="$event.stopPropagation()">
          
          <!-- \u982D\u90E8 -->
          <div class="p-5 border-b border-slate-700/50 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xl">
                  \u{1F504}
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">\u5F9E\u6B77\u53F2\u6D88\u606F\u6536\u96C6\u7528\u6236</h2>
                  <p class="text-sm text-slate-400">\u6536\u96C6\u76E3\u63A7\u671F\u9593\u7684\u767C\u8A00\u7528\u6236</p>
                </div>
              </div>
              <button (click)="close()" 
                      class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- \u5167\u5BB9\u5340\u57DF -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            
            <!-- \u7FA4\u7D44\u4FE1\u606F & \u7D71\u8A08 -->
            @if (group()) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-2xl">
                    {{ group()!.name[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-white truncate">{{ group()!.name }}</h3>
                    <p class="text-sm text-slate-400 truncate">{{ group()!.url || '\u79C1\u5BC6\u7FA4\u7D44' }}</p>
                  </div>
                </div>
                
                <!-- \u6578\u64DA\u7D71\u8A08 -->
                @if (isLoadingStats()) {
                  <div class="flex items-center justify-center py-4">
                    <span class="animate-spin text-xl mr-2">\u23F3</span>
                    <span class="text-slate-400">\u52A0\u8F09\u7D71\u8A08\u6578\u64DA...</span>
                  </div>
                } @else if (stats()) {
                  <div class="grid grid-cols-3 gap-3">
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-cyan-400">{{ stats()!.totalMessages | number }}</div>
                      <div class="text-xs text-slate-500">\u76E3\u63A7\u6D88\u606F</div>
                    </div>
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-emerald-400">{{ stats()!.uniqueSenders | number }}</div>
                      <div class="text-xs text-slate-500">\u552F\u4E00\u767C\u8A00\u8005</div>
                    </div>
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-purple-400">{{ stats()!.collectedUsers | number }}</div>
                      <div class="text-xs text-slate-500">\u5DF2\u6536\u96C6</div>
                    </div>
                  </div>
                  @if (stats()!.dateRange.first) {
                    <div class="mt-3 text-xs text-slate-500 text-center">
                      \u{1F4C5} \u6D88\u606F\u7BC4\u570D\uFF1A{{ stats()!.dateRange.first | date:'yyyy-MM-dd' }} ~ {{ stats()!.dateRange.last | date:'yyyy-MM-dd' }}
                    </div>
                  }
                } @else {
                  <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <p class="text-sm text-amber-400">\u26A0\uFE0F \u66AB\u7121\u76E3\u63A7\u6578\u64DA</p>
                    <p class="text-xs text-slate-400 mt-1">\u8ACB\u5148\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u4E00\u6BB5\u6642\u9593</p>
                  </div>
                }
              </div>
            }
            
            <!-- \u7121\u6578\u64DA\u6642\u7981\u7528\u5F8C\u7E8C\u5167\u5BB9 -->
            @if (stats() && stats()!.totalMessages > 0) {
            
            <!-- \u5FEB\u901F\u6A21\u677F -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                \u26A1 \u5FEB\u901F\u6A21\u677F
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button (click)="selectTemplate('quick')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-orange-500]="selectedTemplate() === 'quick'"
                        [class.bg-orange-500/20]="selectedTemplate() === 'quick'"
                        [class.border-slate-700]="selectedTemplate() !== 'quick'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'quick'">
                  <div class="text-2xl mb-1">\u26A1</div>
                  <p class="font-medium text-white text-sm">\u5FEB\u901F\u6536\u96C6</p>
                  <p class="text-xs text-slate-400 mt-1">100\u4EBA \xB7 7\u5929\u5167</p>
                </button>
                <button (click)="selectTemplate('precise')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-emerald-500]="selectedTemplate() === 'precise'"
                        [class.bg-emerald-500/20]="selectedTemplate() === 'precise'"
                        [class.border-slate-700]="selectedTemplate() !== 'precise'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'precise'">
                  <div class="text-2xl mb-1">\u{1F3AF}</div>
                  <p class="font-medium text-white text-sm">\u7CBE\u6E96\u6536\u96C6</p>
                  <p class="text-xs text-slate-400 mt-1">\u767C\u8A00\u22653\u6B21</p>
                </button>
                <button (click)="selectTemplate('deep')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-blue-500]="selectedTemplate() === 'deep'"
                        [class.bg-blue-500/20]="selectedTemplate() === 'deep'"
                        [class.border-slate-700]="selectedTemplate() !== 'deep'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'deep'">
                  <div class="text-2xl mb-1">\u{1F50D}</div>
                  <p class="font-medium text-white text-sm">\u6DF1\u5EA6\u6536\u96C6</p>
                  <p class="text-xs text-slate-400 mt-1">\u5168\u90E8\u6B77\u53F2</p>
                </button>
              </div>
            </div>
            
            <!-- \u6536\u96C6\u6578\u91CF -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                \u{1F522} \u6536\u96C6\u6578\u91CF
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of limitOptions; track option.value) {
                  <button (click)="setLimit(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-orange-500]="config().limit === option.value"
                          [class.bg-orange-500/20]="config().limit === option.value"
                          [class.text-orange-400]="config().limit === option.value"
                          [class.border-slate-700]="config().limit !== option.value"
                          [class.bg-slate-800/50]="config().limit !== option.value"
                          [class.text-slate-400]="config().limit !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- \u6642\u9593\u7BC4\u570D -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                \u{1F4C5} \u6642\u9593\u7BC4\u570D
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of timeRangeOptions; track option.value) {
                  <button (click)="setTimeRange(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-cyan-500]="config().timeRange === option.value"
                          [class.bg-cyan-500/20]="config().timeRange === option.value"
                          [class.text-cyan-400]="config().timeRange === option.value"
                          [class.border-slate-700]="config().timeRange !== option.value"
                          [class.bg-slate-800/50]="config().timeRange !== option.value"
                          [class.text-slate-400]="config().timeRange !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- \u6D3B\u8E8D\u5EA6\u7BE9\u9078 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                \u{1F525} \u6D3B\u8E8D\u5EA6\u7BE9\u9078\uFF08\u6700\u5C11\u767C\u8A00\u6B21\u6578\uFF09
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of activityOptions; track option.value) {
                  <button (click)="setMinMessages(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-purple-500]="config().minMessages === option.value"
                          [class.bg-purple-500/20]="config().minMessages === option.value"
                          [class.text-purple-400]="config().minMessages === option.value"
                          [class.border-slate-700]="config().minMessages !== option.value"
                          [class.bg-slate-800/50]="config().minMessages !== option.value"
                          [class.text-slate-400]="config().minMessages !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- \u9032\u968E\u9078\u9805 -->
            <div class="border border-slate-700/50 rounded-xl overflow-hidden">
              <button (click)="showAdvanced.set(!showAdvanced())"
                      class="w-full p-4 bg-slate-800/30 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <span class="text-sm font-medium text-slate-300">\u2699\uFE0F \u9032\u968E\u9078\u9805</span>
                <svg class="w-4 h-4 text-slate-400 transition-transform"
                     [class.rotate-180]="showAdvanced()"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              @if (showAdvanced()) {
                <div class="p-4 space-y-3 border-t border-slate-700/50">
                  <div class="grid grid-cols-2 gap-3">
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.skipDuplicates"
                             (change)="toggleOption('skipDuplicates')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">\u53BB\u91CD</p>
                        <p class="text-xs text-slate-500">\u8DF3\u904E\u5DF2\u6536\u96C6\u7528\u6236</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.excludeBots"
                             (change)="toggleOption('excludeBots')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">\u6392\u9664\u6A5F\u5668\u4EBA</p>
                        <p class="text-xs text-slate-500">\u904E\u6FFE Bot \u5E33\u865F</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.requireUsername"
                             (change)="toggleOption('requireUsername')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">\u9700\u6709\u7528\u6236\u540D</p>
                        <p class="text-xs text-slate-500">\u50C5\u6536\u96C6\u6709 &#64;username</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.autoSync"
                             (change)="toggleOption('autoSync')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">\u81EA\u52D5\u540C\u6B65</p>
                        <p class="text-xs text-slate-500">\u540C\u6B65\u5230\u8CC7\u6E90\u4E2D\u5FC3</p>
                      </div>
                    </label>
                  </div>
                </div>
              }
            </div>
            
            }
            
            <!-- \u9032\u5EA6\u986F\u793A -->
            @if (isCollecting()) {
              <div class="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm text-orange-400 flex items-center gap-2">
                    <span class="animate-spin">\u23F3</span> \u6B63\u5728\u6536\u96C6\u7528\u6236...
                  </span>
                  <span class="text-xs text-slate-400">
                    {{ collectionProgress().current }} / {{ collectionProgress().total }}
                  </span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                       [style.width.%]="getProgressPercent()">
                  </div>
                </div>
                <div class="text-xs text-slate-500 mt-2">{{ collectionProgress().status }}</div>
              </div>
            }
            
            <!-- \u7D50\u679C\u986F\u793A -->
            @if (collectionResult()) {
              <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm text-emerald-400 flex items-center gap-2">
                    <span>\u2705</span> \u6536\u96C6\u5B8C\u6210\uFF01
                  </span>
                  <span class="text-lg font-bold text-emerald-400">
                    {{ collectionResult()!.collected }} \u4EBA
                  </span>
                </div>
                
                <div class="grid grid-cols-4 gap-2 mb-3">
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-green-400">{{ collectionResult()!.newUsers }}</div>
                    <div class="text-xs text-slate-500">\u65B0\u589E</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-blue-400">{{ collectionResult()!.updated }}</div>
                    <div class="text-xs text-slate-500">\u66F4\u65B0</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-slate-400">{{ collectionResult()!.skipped }}</div>
                    <div class="text-xs text-slate-500">\u8DF3\u904E</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-orange-400">{{ collectionResult()!.quality.highActivity }}</div>
                    <div class="text-xs text-slate-500">\u9AD8\u6D3B\u8E8D</div>
                  </div>
                </div>
                
                <!-- \u7528\u6236\u8CEA\u91CF\u5206\u4F48 -->
                <div class="text-xs text-slate-400">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-orange-400">\u{1F525}</span>
                    <span>\u9AD8\u6D3B\u8E8D (\u226510\u6B21)\uFF1A{{ collectionResult()!.quality.highActivity }} \u4EBA</span>
                  </div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-emerald-400">\u2713</span>
                    <span>\u4E2D\u6D3B\u8E8D (3-9\u6B21)\uFF1A{{ collectionResult()!.quality.mediumActivity }} \u4EBA</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500">\u25CB</span>
                    <span>\u4F4E\u6D3B\u8E8D (&lt;3\u6B21)\uFF1A{{ collectionResult()!.quality.lowActivity }} \u4EBA</span>
                  </div>
                </div>
              </div>
            }
            
          </div>
          
          <!-- \u5E95\u90E8\u6309\u9215 -->
          <div class="p-5 border-t border-slate-700/50 bg-slate-800/30">
            <!-- \u9810\u4F30\u4FE1\u606F -->
            @if (stats() && stats()!.totalMessages > 0 && !isCollecting() && !collectionResult()) {
              <div class="flex items-center justify-between mb-4 text-sm">
                <span class="text-slate-400">
                  \u{1F4A1} \u9810\u8A08\u6536\u96C6\uFF1A
                  <span class="text-orange-400 font-medium">{{ estimatedCount() }}</span> \u4EBA
                </span>
              </div>
            }
            
            <div class="flex gap-3">
              <button (click)="close()"
                      class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors font-medium">
                {{ collectionResult() ? '\u95DC\u9589' : '\u53D6\u6D88' }}
              </button>
              
              @if (!collectionResult()) {
                <button (click)="startCollection()"
                        [disabled]="!canStart()"
                        class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  @if (isCollecting()) {
                    <span class="animate-spin">\u23F3</span>
                    <span>\u6536\u96C6\u4E2D...</span>
                  } @else {
                    <span>\u{1F504}</span>
                    <span>\u958B\u59CB\u6536\u96C6</span>
                  }
                </button>
              } @else {
                <button (click)="viewCollectedUsers()"
                        class="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                  <span>\u{1F465}</span>
                  <span>\u67E5\u770B\u5DF2\u6536\u96C6\u7528\u6236</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
    }]
  }], null, { isOpen: [{ type: Input, args: [{ isSignal: true, alias: "isOpen", required: false }] }], group: [{ type: Input, args: [{ isSignal: true, alias: "group", required: false }] }], closeDialog: [{ type: Output, args: ["closeDialog"] }], collectionComplete: [{ type: Output, args: ["collectionComplete"] }], viewUsersEvent: [{ type: Output, args: ["viewUsersEvent"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(HistoryCollectionDialogComponent, { className: "HistoryCollectionDialogComponent", filePath: "src/dialogs/history-collection-dialog.component.ts", lineNumber: 448 });
})();

// src/monitoring/monitoring-groups.component.ts
var _forTrack02 = ($index, $item) => $item.id;
function MonitoringGroupsComponent_For_79_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 42);
    \u0275\u0275text(1, " \u983B\u9053 ");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_For_79_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 43);
    \u0275\u0275text(1, " \u8D85\u7D1A\u7FA4 ");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_For_79_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 49)(1, "span");
    \u0275\u0275text(2, "\u{1F525}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const group_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(group_r4.stats.matchesToday);
  }
}
function MonitoringGroupsComponent_For_79_Conditional_24_For_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const setId_r5 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275property("title", ctx_r1.stateService.getKeywordSetName(setId_r5));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F511} ", ctx_r1.stateService.getKeywordSetName(setId_r5), " ");
  }
}
function MonitoringGroupsComponent_For_79_Conditional_24_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 54);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const group_r4 = \u0275\u0275nextContext(2).$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" +", group_r4.linkedKeywordSets.length - 2, " ");
  }
}
function MonitoringGroupsComponent_For_79_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, MonitoringGroupsComponent_For_79_Conditional_24_For_1_Template, 2, 2, "span", 53, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275conditionalCreate(2, MonitoringGroupsComponent_For_79_Conditional_24_Conditional_2_Template, 2, 1, "span", 54);
  }
  if (rf & 2) {
    const group_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275repeater(group_r4.linkedKeywordSets.slice(0, 2));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(group_r4.linkedKeywordSets.length > 2 ? 2 : -1);
  }
}
function MonitoringGroupsComponent_For_79_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 52);
    \u0275\u0275text(1, " \u26A0\uFE0F \u672A\u7D81\u5B9A\u8A5E\u96C6 ");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_For_79_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_For_79_Template_div_click_0_listener() {
      const group_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.openGroupDetail(group_r4));
    });
    \u0275\u0275elementStart(1, "div", 37)(2, "div", 38);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 39)(5, "div", 40)(6, "span", 41);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(8, MonitoringGroupsComponent_For_79_Conditional_8_Template, 2, 0, "span", 42)(9, MonitoringGroupsComponent_For_79_Conditional_9_Template, 2, 0, "span", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 44);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(12, "div", 45)(13, "div", 40)(14, "span", 46)(15, "span", 47);
    \u0275\u0275text(16, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span", 48);
    \u0275\u0275text(18);
    \u0275\u0275pipe(19, "number");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(20, MonitoringGroupsComponent_For_79_Conditional_20_Template, 5, 1, "span", 49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "span", 50);
    \u0275\u0275text(22, " \u67E5\u770B\u8A73\u60C5 \u2192 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 51);
    \u0275\u0275conditionalCreate(24, MonitoringGroupsComponent_For_79_Conditional_24_Template, 3, 1)(25, MonitoringGroupsComponent_For_79_Conditional_25_Template, 2, 0, "span", 52);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const group_r4 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-gradient-to-br", true)("from-emerald-500/30", group_r4.resourceType !== "channel")("to-teal-500/30", group_r4.resourceType !== "channel")("text-emerald-400", group_r4.resourceType !== "channel")("border-emerald-500/20", group_r4.resourceType !== "channel")("from-blue-500/30", group_r4.resourceType === "channel")("to-indigo-500/30", group_r4.resourceType === "channel")("text-blue-400", group_r4.resourceType === "channel")("border-blue-500/20", group_r4.resourceType === "channel");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", group_r4.resourceType === "channel" ? "\u{1F4E2}" : group_r4.name[0], " ");
    \u0275\u0275advance(3);
    \u0275\u0275property("title", group_r4.name);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", group_r4.name, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(group_r4.resourceType === "channel" ? 8 : group_r4.resourceType === "supergroup" ? 9 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275property("title", group_r4.url);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", group_r4.url, " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(19, 27, group_r4.memberCount));
    \u0275\u0275advance(2);
    \u0275\u0275conditional((group_r4.stats == null ? null : group_r4.stats.matchesToday) && group_r4.stats.matchesToday > 0 ? 20 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(group_r4.linkedKeywordSets.length > 0 ? 24 : 25);
  }
}
function MonitoringGroupsComponent_ForEmpty_80_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 33)(1, "div", 55)(2, "span", 56);
    \u0275\u0275text(3, "\u{1F465}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "h3", 57);
    \u0275\u0275text(5, "\u9084\u6C92\u6709\u76E3\u63A7\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "p", 58);
    \u0275\u0275text(7, "\u8ACB\u5728\u8CC7\u6E90\u4E2D\u5FC3\u641C\u7D22\u4E26\u6DFB\u52A0\u7FA4\u7D44");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 59);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_ForEmpty_80_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateToResourceCenter());
    });
    \u0275\u0275text(9, " + \u6DFB\u52A0\u7B2C\u4E00\u500B\u7FA4\u7D44 ");
    \u0275\u0275elementEnd()();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 103);
    \u0275\u0275text(1, "\u76E3\u807D");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 104);
    \u0275\u0275text(1, "\u767C\u9001");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 76)(1, "div", 99);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 100)(4, "div", 101);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "div", 28);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 102);
    \u0275\u0275conditionalCreate(9, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Conditional_9_Template, 2, 0, "span", 103);
    \u0275\u0275conditionalCreate(10, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Conditional_10_Template, 2, 0, "span", 104);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r1.getAccountInitial(ctx_r1.selectedGroup().accountPhone), " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.getAccountName(ctx_r1.selectedGroup().accountPhone));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.selectedGroup().accountPhone);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.isListenerAccount(ctx_r1.selectedGroup().accountPhone) ? 9 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.isSenderAccount(ctx_r1.selectedGroup().accountPhone) ? 10 : -1);
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 77)(1, "p");
    \u0275\u0275text(2, "\u5C1A\u672A\u5206\u914D\u76E3\u63A7\u5E33\u865F");
    \u0275\u0275elementEnd()();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_58_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 87);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u53EF\u6536\u96C6 ~", ctx_r1.estimatedNewUsers(), " \u4EBA ");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_60_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 105);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_60_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.viewCollectedUsers());
    });
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u{1F441}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u67E5\u770B\u5DF2\u6536\u96C6 (", ctx_r1.collectedUsersCount(), ")");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_66_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 91)(1, "p", 106)(2, "span", 107);
    \u0275\u0275text(3, "\u{1F4A1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u5F8C\uFF0C\u7CFB\u7D71\u6703\u81EA\u52D5\u8A18\u9304\u6D88\u606F\u3002\u7D2F\u7A4D\u4E00\u5B9A\u6D88\u606F\u5F8C\u5373\u53EF\u6536\u96C6\u767C\u8A00\u7528\u6236\u3002");
    \u0275\u0275elementEnd()()();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 92)(1, "p", 108);
    \u0275\u0275text(2);
    \u0275\u0275pipe(3, "number");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" \u5F9E ", \u0275\u0275pipeBind1(3, 1, ctx_r1.monitoredMessagesCount()), " \u689D\u6D88\u606F\u4E2D\u63D0\u53D6\u6D3B\u8E8D\u7528\u6236\uFF0C\u7121\u9700\u7BA1\u7406\u54E1\u6B0A\u9650 ");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_68_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 93)(1, "p", 109)(2, "span");
    \u0275\u0275text(3, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "\u9700\u8981\u5206\u914D\u76E3\u63A7\u5E33\u865F\u624D\u80FD\u6536\u96C6\u7528\u6236");
    \u0275\u0275elementEnd()()();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_74_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 110)(1, "span", 111);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 112);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_74_For_2_Template_button_click_3_listener() {
      const setId_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r1.unbindKeywordSet(setId_r10));
    });
    \u0275\u0275text(4, " \u89E3\u7D81 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const setId_r10 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.stateService.getKeywordSetName(setId_r10));
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_74_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 94);
    \u0275\u0275repeaterCreate(1, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_74_For_2_Template, 5, 1, "div", 110, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.selectedGroup().linkedKeywordSets);
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_75_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 95);
    \u0275\u0275text(1, "\u5C1A\u672A\u7D81\u5B9A\u95DC\u9375\u8A5E\u96C6");
    \u0275\u0275elementEnd();
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_76_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 116);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_76_For_5_Template_button_click_0_listener() {
      const set_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r1 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r1.bindKeywordSet(set_r12.id));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const set_r12 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" + ", set_r12.name, " ");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_76_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 96)(1, "p", 113);
    \u0275\u0275text(2, "\u9EDE\u64CA\u7D81\u5B9A\u8A5E\u96C6\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 114);
    \u0275\u0275repeaterCreate(4, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_76_For_5_Template, 2, 1, "button", 115, _forTrack02);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r1.availableKeywordSets());
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_77_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 97)(1, "div", 117)(2, "span", 118)(3, "span", 119);
    \u0275\u0275text(4, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " \u6B63\u5728\u63D0\u53D6\u6210\u54E1... ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 14);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 120);
    \u0275\u0275element(9, "div", 121);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "div", 122);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate2(" ", ctx_r1.extractionProgress().extracted, " / ", ctx_r1.extractionProgress().total, " ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r1.getExtractionPercent(), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.extractionProgress().status);
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_78_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 98)(1, "div", 123)(2, "span", 118)(3, "span");
    \u0275\u0275text(4, "\u2705");
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " \u63D0\u53D6\u5B8C\u6210 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 124);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 125)(9, "span", 126);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 126);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "span", 126);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r1.extractionResult().count, " \u4EBA");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u{1F7E2} ", ctx_r1.extractionResult().online, " \u5728\u7DDA");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u23F0 ", ctx_r1.extractionResult().recently, " \u6700\u8FD1");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u{1F48E} ", ctx_r1.extractionResult().premium, " Premium");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 67)(1, "div", 68)(2, "div", 69);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 70)(5, "h4", 71);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p", 72);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "div", 73)(10, "div", 74)(11, "div", 17);
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 28);
    \u0275\u0275text(15, "\u6210\u54E1\u6578");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 74)(17, "div", 20);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 28);
    \u0275\u0275text(20, "\u4ECA\u65E5\u5339\u914D");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(21, "div", 67)(22, "h4", 75)(23, "span");
    \u0275\u0275text(24, "\u{1F4F1}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(25, " \u76E3\u63A7\u5E33\u865F ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(26, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_26_Template, 11, 5, "div", 76)(27, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_27_Template, 3, 0, "div", 77);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 78)(29, "h4", 79)(30, "span", 40)(31, "span");
    \u0275\u0275text(32, "\u{1F504}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(33, " \u5F9E\u6B77\u53F2\u6D88\u606F\u6536\u96C6\u7528\u6236 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "span", 28);
    \u0275\u0275text(35, "\u66FF\u4EE3\u6210\u54E1\u63D0\u53D6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(36, "div", 80)(37, "div", 81)(38, "div", 82);
    \u0275\u0275text(39);
    \u0275\u0275pipe(40, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div", 83);
    \u0275\u0275text(42, "\u76E3\u63A7\u6D88\u606F");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(43, "div", 81)(44, "div", 84);
    \u0275\u0275text(45);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(46, "div", 83);
    \u0275\u0275text(47, "\u5DF2\u6536\u96C6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(48, "div", 81)(49, "div", 85);
    \u0275\u0275text(50);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div", 83);
    \u0275\u0275text(52, "\u53EF\u6536\u96C6");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(53, "button", 86);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_11_Template_button_click_53_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openHistoryCollectionDialog());
    });
    \u0275\u0275elementStart(54, "span", 47);
    \u0275\u0275text(55, "\u{1F504}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(56, "span");
    \u0275\u0275text(57, "\u958B\u59CB\u6536\u96C6\u7528\u6236");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(58, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_58_Template, 2, 1, "span", 87);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(59, "div", 88);
    \u0275\u0275conditionalCreate(60, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_60_Template, 5, 1, "button", 89);
    \u0275\u0275elementStart(61, "button", 90);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_11_Template_button_click_61_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.refreshCollectedStats());
    });
    \u0275\u0275elementStart(62, "span");
    \u0275\u0275text(63, "\u{1F504}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(64, "span");
    \u0275\u0275text(65, "\u5237\u65B0");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(66, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_66_Template, 6, 0, "div", 91)(67, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_67_Template, 4, 3, "div", 92);
    \u0275\u0275conditionalCreate(68, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_68_Template, 6, 0, "div", 93);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(69, "div", 67)(70, "h4", 75)(71, "span");
    \u0275\u0275text(72, "\u{1F511}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(73, " \u7D81\u5B9A\u7684\u95DC\u9375\u8A5E\u96C6 ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(74, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_74_Template, 3, 0, "div", 94)(75, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_75_Template, 2, 0, "p", 95);
    \u0275\u0275conditionalCreate(76, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_76_Template, 6, 0, "div", 96);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(77, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_77_Template, 12, 5, "div", 97);
    \u0275\u0275conditionalCreate(78, MonitoringGroupsComponent_Conditional_81_Conditional_11_Conditional_78_Template, 15, 4, "div", 98);
  }
  if (rf & 2) {
    let tmp_6_0;
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectedGroup().name[0], " ");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectedGroup().name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.selectedGroup().url);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(13, 21, ctx_r1.selectedGroup().memberCount));
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(((tmp_6_0 = ctx_r1.selectedGroup().stats) == null ? null : tmp_6_0.matchesToday) || 0);
    \u0275\u0275advance(8);
    \u0275\u0275conditional(ctx_r1.selectedGroup().accountPhone ? 26 : 27);
    \u0275\u0275advance(13);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(40, 23, ctx_r1.monitoredMessagesCount()));
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r1.collectedUsersCount());
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r1.estimatedNewUsers());
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", ctx_r1.monitoredMessagesCount() === 0);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r1.monitoredMessagesCount() > 0 ? 58 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.collectedUsersCount() > 0 ? 60 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r1.isLoadingStats());
    \u0275\u0275advance();
    \u0275\u0275classProp("animate-spin", ctx_r1.isLoadingStats());
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r1.monitoredMessagesCount() === 0 ? 66 : 67);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r1.selectedGroup().accountPhone ? 68 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275conditional(ctx_r1.selectedGroup().linkedKeywordSets.length > 0 ? 74 : 75);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r1.availableKeywordSets().length > 0 ? 76 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.extractionProgress().isExtracting && ctx_r1.extractionProgress().groupId === ctx_r1.selectedGroup().id ? 77 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.extractionResult().completed && ctx_r1.extractionResult().groupId === ctx_r1.selectedGroup().id ? 78 : -1);
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_12_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 132);
    \u0275\u0275text(1, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u63D0\u53D6\u4E2D... ");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_12_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u{1F465}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u63D0\u53D6\u6210\u54E1 ");
  }
}
function MonitoringGroupsComponent_Conditional_81_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 66)(1, "div", 127)(2, "button", 128);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_12_Template_button_click_2_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.extractMembers());
    });
    \u0275\u0275conditionalCreate(3, MonitoringGroupsComponent_Conditional_81_Conditional_12_Conditional_3_Template, 3, 0)(4, MonitoringGroupsComponent_Conditional_81_Conditional_12_Conditional_4_Template, 3, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 129);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_12_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.copyGroupLink());
    });
    \u0275\u0275elementStart(6, "span");
    \u0275\u0275text(7, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(8, " \u8907\u88FD\u93C8\u63A5 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 130);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_12_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.openInTelegram());
    });
    \u0275\u0275elementStart(10, "span");
    \u0275\u0275text(11, "\u{1F517}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(12, " \u5728 Telegram \u6253\u958B ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 131);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Conditional_12_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.removeGroup());
    });
    \u0275\u0275elementStart(14, "span");
    \u0275\u0275text(15, "\u{1F5D1}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(16, " \u79FB\u9664\u76E3\u63A7 ");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("disabled", ctx_r1.extractionProgress().isExtracting);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.extractionProgress().isExtracting && ctx_r1.extractionProgress().groupId === ctx_r1.selectedGroup().id ? 3 : 4);
  }
}
function MonitoringGroupsComponent_Conditional_81_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 60);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Template_div_click_1_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetailDialog());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "div", 61)(3, "div", 62)(4, "h3", 63)(5, "span");
    \u0275\u0275text(6, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(7, " \u7FA4\u7D44\u8A73\u60C5 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "button", 64);
    \u0275\u0275listener("click", function MonitoringGroupsComponent_Conditional_81_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.closeDetailDialog());
    });
    \u0275\u0275text(9, " \u2715 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 65);
    \u0275\u0275conditionalCreate(11, MonitoringGroupsComponent_Conditional_81_Conditional_11_Template, 79, 25);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(12, MonitoringGroupsComponent_Conditional_81_Conditional_12_Template, 17, 2, "div", 66);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(11);
    \u0275\u0275conditional(ctx_r1.selectedGroup() ? 11 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r1.selectedGroup() ? 12 : -1);
  }
}
var MonitoringGroupsComponent = class _MonitoringGroupsComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.confirmDialog = inject(ConfirmDialogService);
    this.configAction = output();
    this.extractMembersEvent = output();
    this.selectedGroup = signal(null, ...ngDevMode ? [{ debugName: "selectedGroup" }] : []);
    this.showDetailDialog = signal(false, ...ngDevMode ? [{ debugName: "showDetailDialog" }] : []);
    this.isRefreshingMemberCounts = signal(false, ...ngDevMode ? [{ debugName: "isRefreshingMemberCounts" }] : []);
    this.refreshMemberCountProgress = signal({ current: 0, total: 0 }, ...ngDevMode ? [{ debugName: "refreshMemberCountProgress" }] : []);
    this.extractionProgress = signal({
      isExtracting: false,
      groupId: "",
      extracted: 0,
      total: 0,
      status: ""
    }, ...ngDevMode ? [{ debugName: "extractionProgress" }] : []);
    this.extractionResult = signal({
      completed: false,
      groupId: "",
      count: 0,
      online: 0,
      recently: 0,
      premium: 0
    }, ...ngDevMode ? [{ debugName: "extractionResult" }] : []);
    this.collectedUsersCount = signal(0, ...ngDevMode ? [{ debugName: "collectedUsersCount" }] : []);
    this.monitoredMessagesCount = signal(0, ...ngDevMode ? [{ debugName: "monitoredMessagesCount" }] : []);
    this.isCollectingFromHistory = signal(false, ...ngDevMode ? [{ debugName: "isCollectingFromHistory" }] : []);
    this.showHistoryCollectionDialog = signal(false, ...ngDevMode ? [{ debugName: "showHistoryCollectionDialog" }] : []);
    this.historyCollectionGroup = signal(null, ...ngDevMode ? [{ debugName: "historyCollectionGroup" }] : []);
    this.isLoadingStats = signal(false, ...ngDevMode ? [{ debugName: "isLoadingStats" }] : []);
    this.estimatedNewUsers = computed(() => {
      const messages = this.monitoredMessagesCount();
      const collected = this.collectedUsersCount();
      const estimated = Math.max(0, Math.round(messages / 5) - collected);
      return estimated;
    }, ...ngDevMode ? [{ debugName: "estimatedNewUsers" }] : []);
    this.availableKeywordSets = computed(() => {
      const selected = this.selectedGroup();
      if (!selected)
        return [];
      return this.stateService.keywordSets().filter((s) => !selected.linkedKeywordSets.includes(s.id));
    }, ...ngDevMode ? [{ debugName: "availableKeywordSets" }] : []);
    this.listeners = [];
  }
  ngOnInit() {
    this.stateService.loadAll();
    this.setupListeners();
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("bind-keyword-set-result", (data) => {
      if (data.success && data.currentKeywordSetIds) {
        this.stateService.updateGroupKeywordSets(String(data.groupId), data.currentKeywordSetIds.map((id) => String(id)));
        const selected = this.selectedGroup();
        if (selected && String(selected.id) === String(data.groupId)) {
          this.selectedGroup.update((g) => g ? __spreadProps(__spreadValues({}, g), { linkedKeywordSets: data.currentKeywordSetIds.map((id) => String(id)) }) : null);
        }
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("unbind-keyword-set-result", (data) => {
      if (data.success && data.currentKeywordSetIds) {
        this.stateService.updateGroupKeywordSets(String(data.groupId), data.currentKeywordSetIds.map((id) => String(id)));
        const selected = this.selectedGroup();
        if (selected && String(selected.id) === String(data.groupId)) {
          this.selectedGroup.update((g) => g ? __spreadProps(__spreadValues({}, g), { linkedKeywordSets: data.currentKeywordSetIds.map((id) => String(id)) }) : null);
        }
      }
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("members-extraction-progress", (data) => {
      const selected = this.selectedGroup();
      if (selected && String(selected.id) === String(data.resourceId)) {
        this.extractionProgress.set({
          isExtracting: true,
          groupId: String(data.resourceId),
          extracted: data.extracted,
          total: data.total,
          status: data.status
        });
      }
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("members-extracted", (data) => {
      const selected = this.selectedGroup();
      if (data.success && data.members && selected && String(selected.id) === String(data.resourceId)) {
        let online = 0, recently = 0, premium = 0;
        for (const m of data.members) {
          if (m.online_status === "online")
            online++;
          else if (m.online_status === "recently")
            recently++;
          if (m.is_premium)
            premium++;
        }
        this.extractionProgress.set({
          isExtracting: false,
          groupId: "",
          extracted: 0,
          total: 0,
          status: ""
        });
        this.extractionResult.set({
          completed: true,
          groupId: String(data.resourceId),
          count: data.members.length,
          online,
          recently,
          premium
        });
        setTimeout(() => {
          if (this.extractionResult().groupId === String(data.resourceId)) {
            this.clearExtractionResult();
          }
        }, 1e4);
      } else if (data.error) {
        this.extractionProgress.set({
          isExtracting: false,
          groupId: "",
          extracted: 0,
          total: 0,
          status: ""
        });
      }
    });
    this.listeners.push(cleanup4);
    const cleanup4b = this.ipcService.on("group-collected-stats", (data) => {
      const selected = this.selectedGroup();
      if (selected && String(selected.id) === String(data.groupId)) {
        this.collectedUsersCount.set(data.collectedUsers || 0);
        this.monitoredMessagesCount.set(data.monitoredMessages || 0);
      }
    });
    this.listeners.push(cleanup4b);
    const cleanup5 = this.ipcService.on("batch-refresh-member-counts-progress", (data) => {
      this.refreshMemberCountProgress.set({ current: data.current, total: data.total });
      if (data.memberCount > 0) {
        this.stateService.updateGroupMemberCount(data.groupId, data.memberCount);
      }
    });
    this.listeners.push(cleanup5);
    const cleanup6 = this.ipcService.on("batch-refresh-member-counts-complete", (data) => {
      this.isRefreshingMemberCounts.set(false);
      this.refreshMemberCountProgress.set({ current: 0, total: 0 });
      if (data.success) {
        this.toastService.success(`\u2705 \u6210\u54E1\u6578\u5237\u65B0\u5B8C\u6210\uFF1A${data.updated} \u500B\u6210\u529F\uFF0C${data.failed} \u500B\u5931\u6557`);
        this.stateService.refresh();
      } else {
        this.toastService.error("\u6210\u54E1\u6578\u5237\u65B0\u5931\u6557");
      }
    });
    this.listeners.push(cleanup6);
  }
  // 帳號相關方法
  getAccountInitial(phone) {
    const account = this.stateService.accounts().find((a) => a.phone === phone);
    if (account?.username) {
      return account.username[0].toUpperCase();
    }
    return phone ? phone.slice(-2) : "?";
  }
  getAccountName(phone) {
    const account = this.stateService.accounts().find((a) => a.phone === phone);
    return account?.username || account?.firstName || phone || "\u672A\u77E5\u5E33\u865F";
  }
  isListenerAccount(phone) {
    const account = this.stateService.accounts().find((a) => a.phone === phone);
    return account?.isListener ?? false;
  }
  isSenderAccount(phone) {
    const account = this.stateService.accounts().find((a) => a.phone === phone);
    return account?.isSender ?? false;
  }
  refreshData() {
    this.stateService.refresh();
    this.toastService.info("\u6B63\u5728\u5237\u65B0\u7FA4\u7D44\u5217\u8868...");
  }
  // 🆕 批量刷新所有群組的成員數
  refreshAllMemberCounts() {
    const groups = this.stateService.groups();
    if (groups.length === 0) {
      this.toastService.warning("\u6C92\u6709\u7FA4\u7D44\u9700\u8981\u5237\u65B0");
      return;
    }
    this.isRefreshingMemberCounts.set(true);
    this.refreshMemberCountProgress.set({ current: 0, total: groups.length });
    this.ipcService.send("batch-refresh-member-counts", {
      groups: groups.map((g) => ({
        id: g.id,
        url: g.url,
        accountPhone: g.accountPhone
      }))
    });
    this.toastService.info(`\u{1F504} \u958B\u59CB\u5237\u65B0 ${groups.length} \u500B\u7FA4\u7D44\u7684\u6210\u54E1\u6578...`);
  }
  selectGroup(group) {
    this.selectedGroup.set(group);
  }
  // 🆕 打開群組詳情彈窗
  openGroupDetail(group) {
    this.selectedGroup.set(group);
    this.showDetailDialog.set(true);
    this.loadCollectedStats(group);
  }
  // 🆕 關閉群組詳情彈窗
  closeDetailDialog() {
    this.showDetailDialog.set(false);
  }
  // 🆕 加載已收集用戶和消息統計
  loadCollectedStats(group) {
    this.collectedUsersCount.set(0);
    this.monitoredMessagesCount.set(0);
    this.ipcService.send("get-group-collected-stats", {
      groupId: group.id,
      telegramId: group.telegramId
    });
  }
  // 🆕 查看已收集用戶
  viewCollectedUsers() {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.closeDetailDialog();
    this.toastService.info(`\u{1F4CB} \u8DF3\u8F49\u5230\u300C${group.name}\u300D\u7684\u5DF2\u6536\u96C6\u7528\u6236...`);
    this.ipcService.send("navigate-to-collected-users", {
      groupId: group.id,
      groupName: group.name,
      telegramId: group.telegramId
    });
  }
  // 🆕 從歷史消息收集用戶
  collectFromHistory() {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.isCollectingFromHistory.set(true);
    this.toastService.info("\u{1F504} \u6B63\u5728\u5F9E\u6B77\u53F2\u6D88\u606F\u4E2D\u6536\u96C6\u7528\u6236...");
    this.ipcService.send("collect-users-from-history", {
      groupId: group.id,
      telegramId: group.telegramId,
      limit: 500
    });
    const cleanup = this.ipcService.on("collect-from-history-result", (data) => {
      if (String(data.groupId) === String(group.id)) {
        this.isCollectingFromHistory.set(false);
        cleanup();
        if (data.success) {
          this.toastService.success(`\u2705 \u6536\u96C6\u5B8C\u6210\uFF01\u5171 ${data.collected} \u4F4D\u7528\u6236\uFF0C\u65B0\u589E ${data.newUsers || 0} \u4F4D`);
          this.loadCollectedStats(group);
        } else {
          this.toastService.error(data.error || "\u6536\u96C6\u5931\u6557");
        }
      }
    });
    this.listeners.push(cleanup);
  }
  // 🆕 打開歷史收集對話框
  openHistoryCollectionDialog() {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.historyCollectionGroup.set({
      id: group.id,
      name: group.name,
      telegramId: group.telegramId,
      url: group.url,
      accountPhone: group.accountPhone
    });
    this.showHistoryCollectionDialog.set(true);
    setTimeout(() => {
      this.ipcService.send("get-history-collection-stats", {
        groupId: group.id,
        telegramId: group.telegramId
      });
    }, 100);
  }
  // 🆕 關閉歷史收集對話框
  closeHistoryCollectionDialog() {
    this.showHistoryCollectionDialog.set(false);
  }
  // 🆕 歷史收集完成回調
  onHistoryCollectionComplete(result) {
    const group = this.selectedGroup();
    if (group) {
      this.loadCollectedStats(group);
    }
  }
  // 🆕 刷新已收集統計
  refreshCollectedStats() {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.isLoadingStats.set(true);
    this.loadCollectedStats(group);
    setTimeout(() => {
      this.isLoadingStats.set(false);
    }, 5e3);
  }
  navigateToResourceCenter() {
    this.configAction.emit("goto-resource-center");
    this.toastService.info("\u8ACB\u5728\u300C\u8CC7\u6E90\u4E2D\u5FC3\u300D\u641C\u7D22\u4E26\u6DFB\u52A0\u7FA4\u7D44");
  }
  handleConfigAction(action) {
    this.configAction.emit(action);
  }
  bindKeywordSet(setId) {
    const group = this.selectedGroup();
    if (!group) {
      console.log("[Groups] bindKeywordSet: No group selected");
      return;
    }
    const payload = {
      groupId: parseInt(group.id),
      keywordSetId: parseInt(setId)
    };
    console.log("[Groups] ========== bindKeywordSet ==========");
    console.log("[Groups] Sending bind-keyword-set with payload:", payload);
    this.ipcService.send("bind-keyword-set", payload);
    const updatedLinkedSets = [...group.linkedKeywordSets, setId];
    this.selectedGroup.update((g) => g ? __spreadProps(__spreadValues({}, g), { linkedKeywordSets: updatedLinkedSets }) : null);
    this.stateService.updateGroupKeywordSets(group.id, updatedLinkedSets);
    console.log("[Groups] Updated linkedKeywordSets:", updatedLinkedSets);
    this.toastService.success(`\u2705 \u8A5E\u96C6\u5DF2\u7D81\u5B9A\u5230 ${group.name}`);
  }
  unbindKeywordSet(setId) {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.ipcService.send("unbind-keyword-set", {
      groupId: parseInt(group.id),
      keywordSetId: parseInt(setId)
    });
    const updatedLinkedSets = group.linkedKeywordSets.filter((id) => id !== setId);
    this.selectedGroup.update((g) => g ? __spreadProps(__spreadValues({}, g), { linkedKeywordSets: updatedLinkedSets }) : null);
    this.stateService.updateGroupKeywordSets(group.id, updatedLinkedSets);
    this.toastService.info(`\u5DF2\u5F9E ${group.name} \u89E3\u7D81\u8A5E\u96C6`);
  }
  /**
   * 打開提取成員配置對話框
   * 不再直接提取，而是先讓用戶配置篩選條件
   */
  extractMembers() {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.extractMembersEvent.emit(group);
  }
  /**
   * 執行成員提取（帶配置）
   * 由父組件在用戶確認配置後調用
   */
  executeExtraction(config) {
    const group = this.selectedGroup();
    if (!group)
      return;
    this.extractionProgress.set({
      isExtracting: true,
      groupId: group.id,
      extracted: 0,
      total: config.limit === -1 ? group.memberCount || 0 : config.limit,
      status: "\u6B63\u5728\u9023\u63A5..."
    });
    this.clearExtractionResult();
    let chatId = "";
    let username = "";
    if (group.telegramId) {
      chatId = group.telegramId;
      console.log("[Groups] Using telegramId for extraction:", chatId);
    } else if (group.url) {
      const match = group.url.match(/t\.me\/([^+/][^/]*?)(?:\?|$)/);
      if (match) {
        username = match[1];
        chatId = username;
        console.log("[Groups] Using username for extraction:", username);
      } else {
        console.log("[Groups] URL is invite link, need telegramId:", group.url);
      }
    }
    if (!chatId) {
      this.toastService.error("\u7121\u6CD5\u63D0\u53D6\u6210\u54E1\uFF1A\u8A72\u7FA4\u7D44\u7F3A\u5C11\u6709\u6548\u7684 ID\u3002\u8ACB\u5148\u624B\u52D5\u6253\u958B\u7FA4\u7D44\u4EE5\u7372\u53D6\u5176 ID\u3002");
      this.extractionProgress.set({
        isExtracting: false,
        groupId: "",
        extracted: 0,
        total: 0,
        status: ""
      });
      return;
    }
    this.ipcService.send("extract-members", {
      chatId,
      telegramId: group.telegramId,
      // 🔧 FIX: 額外傳遞 telegramId
      username,
      resourceId: group.id,
      groupName: group.name,
      // 🆕 傳遞篩選配置
      limit: config.limit === -1 ? void 0 : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
        // 🔧 FIX: 傳遞 onlineStatus 字符串，確保後端正確解析
        onlineStatus: config.filters.onlineStatus || "all",
        offline: config.filters.onlineStatus === "offline",
        online: config.filters.onlineStatus === "online",
        chinese: config.filters.hasChinese,
        hasUsername: config.filters.hasUsername,
        isPremium: config.filters.isPremium,
        excludeAdmins: config.filters.excludeAdmins
      },
      autoSave: config.advanced.autoSaveToResources,
      skipDuplicates: config.advanced.skipDuplicates
    });
    this.toastService.info(`\u{1F504} \u6B63\u5728\u63D0\u53D6 ${group.name} \u7684\u6210\u54E1...`);
  }
  // 🆕 計算提取進度百分比
  getExtractionPercent() {
    const progress = this.extractionProgress();
    if (progress.total === 0)
      return 0;
    return Math.min(100, Math.round(progress.extracted / progress.total * 100));
  }
  // 🆕 清除提取結果顯示
  clearExtractionResult() {
    this.extractionResult.set({
      completed: false,
      groupId: "",
      count: 0,
      online: 0,
      recently: 0,
      premium: 0
    });
  }
  copyGroupLink() {
    const group = this.selectedGroup();
    if (!group)
      return;
    navigator.clipboard.writeText(group.url || "");
    this.toastService.success("\u{1F4CB} \u5DF2\u8907\u88FD\u7FA4\u7D44\u93C8\u63A5");
  }
  openInTelegram() {
    const group = this.selectedGroup();
    if (!group?.url)
      return;
    window.open(group.url, "_blank");
  }
  async removeGroup() {
    const group = this.selectedGroup();
    if (!group)
      return;
    const confirmed = await this.confirmDialog.danger("\u79FB\u9664\u76E3\u63A7\u7FA4\u7D44", `\u78BA\u5B9A\u8981\u79FB\u9664\u76E3\u63A7\u7FA4\u7D44\u300C${group.name}\u300D\u55CE\uFF1F
\u79FB\u9664\u5F8C\u5C07\u505C\u6B62\u76E3\u63A7\u6B64\u7FA4\u7D44\u7684\u6D88\u606F\u3002`, [group.name || group.url || ""]);
    if (confirmed) {
      this.ipcService.send("remove-group", { id: parseInt(group.id) });
      this.selectedGroup.set(null);
      this.showDetailDialog.set(false);
      this.toastService.success(`\u{1F5D1}\uFE0F \u5DF2\u79FB\u9664 ${group.name}`);
      setTimeout(() => this.stateService.refresh(), 500);
    }
  }
  static {
    this.\u0275fac = function MonitoringGroupsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MonitoringGroupsComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MonitoringGroupsComponent, selectors: [["app-monitoring-groups"]], outputs: { configAction: "configAction", extractMembersEvent: "extractMembersEvent" }, decls: 83, vars: 17, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "p-6"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "w-12", "h-12", "bg-gradient-to-br", "from-emerald-500", "to-teal-600", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], ["mode", "compact", 3, "action"], [1, "px-4", "py-2", "bg-purple-500/20", "hover:bg-purple-500/30", "text-purple-400", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", "border", "border-purple-500/30", "disabled:opacity-50", 3, "click", "disabled"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "grid", "grid-cols-2", "md:grid-cols-4", "gap-4", "mb-6"], [1, "bg-gradient-to-br", "from-emerald-500/10", "to-teal-500/5", "rounded-xl", "border", "border-emerald-500/20", "p-4", "hover:border-emerald-500/40", "transition-colors"], [1, "w-12", "h-12", "bg-emerald-500/20", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "text-xs", "text-slate-400"], [1, "bg-gradient-to-br", "from-cyan-500/10", "to-blue-500/5", "rounded-xl", "border", "border-cyan-500/20", "p-4", "hover:border-cyan-500/40", "transition-colors"], [1, "w-12", "h-12", "bg-cyan-500/20", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "bg-gradient-to-br", "from-orange-500/10", "to-amber-500/5", "rounded-xl", "border", "border-orange-500/20", "p-4", "hover:border-orange-500/40", "transition-colors"], [1, "w-12", "h-12", "bg-orange-500/20", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl", "font-bold", "text-orange-400"], [1, "bg-gradient-to-br", "from-purple-500/10", "to-pink-500/5", "rounded-xl", "border", "border-purple-500/20", "p-4", "hover:border-purple-500/40", "transition-colors"], [1, "w-12", "h-12", "bg-purple-500/20", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "flex-1", "overflow-hidden"], [1, "h-full", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden", "flex", "flex-col"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-xs", "text-slate-500"], [1, "text-sm", "text-cyan-400", "hover:text-cyan-300", 3, "click"], [1, "flex-1", "overflow-y-auto", "p-4"], [1, "grid", "grid-cols-1", "md:grid-cols-2", "lg:grid-cols-3", "gap-4"], [1, "p-4", "bg-slate-800/60", "rounded-xl", "hover:bg-slate-700/80", "transition-all", "cursor-pointer", "group", "border", "border-slate-700/50", "hover:border-cyan-500/40", "hover:shadow-lg", "hover:shadow-cyan-500/10", "overflow-hidden"], [1, "col-span-full", "text-center", "py-16", "text-slate-400"], [1, "fixed", "inset-0", "z-50", "flex", "items-center", "justify-center", "p-4"], [3, "closeDialog", "collectionComplete", "viewUsersEvent", "isOpen", "group"], [1, "p-4", "bg-slate-800/60", "rounded-xl", "hover:bg-slate-700/80", "transition-all", "cursor-pointer", "group", "border", "border-slate-700/50", "hover:border-cyan-500/40", "hover:shadow-lg", "hover:shadow-cyan-500/10", "overflow-hidden", 3, "click"], [1, "flex", "items-start", "gap-3", "mb-3"], [1, "w-11", "h-11", "rounded-xl", "flex", "items-center", "justify-center", "text-xl", "font-bold", "flex-shrink-0", "border"], [1, "flex-1", "min-w-0", "overflow-hidden"], [1, "flex", "items-center", "gap-2"], [1, "font-medium", "text-white", "truncate", "text-sm", "leading-tight", 3, "title"], [1, "px-1.5", "py-0.5", "bg-blue-500/20", "text-blue-400", "text-[10px]", "rounded", "flex-shrink-0"], [1, "px-1.5", "py-0.5", "bg-purple-500/20", "text-purple-400", "text-[10px]", "rounded", "flex-shrink-0"], [1, "text-xs", "text-slate-500", "truncate", "mt-0.5", 3, "title"], [1, "flex", "items-center", "justify-between", "text-xs", "mb-3", "px-1"], [1, "text-slate-400", "flex", "items-center", "gap-1"], [1, "text-base"], [1, "font-medium"], [1, "text-orange-400", "flex", "items-center", "gap-1"], [1, "text-cyan-400", "text-xs", "opacity-0", "group-hover:opacity-100", "transition-opacity", "whitespace-nowrap"], [1, "flex", "flex-wrap", "gap-1.5", "overflow-hidden", "max-h-[52px]"], [1, "px-2", "py-1", "bg-amber-500/20", "text-amber-400", "text-xs", "rounded-md"], [1, "px-2", "py-1", "bg-purple-500/20", "text-purple-400", "text-xs", "rounded-md", "truncate", "max-w-[120px]", 3, "title"], [1, "px-2", "py-1", "bg-slate-600/50", "text-slate-400", "text-xs", "rounded-md"], [1, "w-20", "h-20", "mx-auto", "mb-4", "rounded-2xl", "bg-slate-800/50", "flex", "items-center", "justify-center"], [1, "text-4xl"], [1, "text-lg", "font-medium", "text-white", "mb-2"], [1, "text-sm", "mb-6", "text-slate-500"], [1, "px-5", "py-2.5", "bg-cyan-500/20", "text-cyan-400", "rounded-xl", "hover:bg-cyan-500/30", "transition-colors", "border", "border-cyan-500/30", 3, "click"], [1, "absolute", "inset-0", "bg-black/60", "backdrop-blur-sm", 3, "click"], [1, "relative", "w-full", "max-w-lg", "max-h-[85vh]", "bg-slate-900", "rounded-2xl", "border", "border-slate-700/50", "shadow-2xl", "shadow-black/50", "overflow-hidden", "flex", "flex-col", "animate-in", "fade-in", "zoom-in-95", "duration-200"], [1, "flex", "items-center", "justify-between", "p-5", "border-b", "border-slate-700/50"], [1, "text-lg", "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "w-8", "h-8", "flex", "items-center", "justify-center", "rounded-lg", "hover:bg-slate-700/50", "text-slate-400", "hover:text-white", "transition-colors", 3, "click"], [1, "flex-1", "overflow-y-auto", "p-5", "space-y-4"], [1, "p-5", "border-t", "border-slate-700/50", "bg-slate-800/30"], [1, "bg-slate-800/50", "rounded-xl", "p-4", "border", "border-slate-700/50"], [1, "flex", "items-center", "gap-4", "mb-4"], [1, "w-16", "h-16", "rounded-xl", "bg-gradient-to-br", "from-emerald-500/20", "to-teal-500/20", "flex", "items-center", "justify-center", "text-3xl", "font-bold", "text-emerald-400"], [1, "flex-1", "min-w-0"], [1, "text-xl", "font-medium", "text-white", "truncate"], [1, "text-sm", "text-slate-400", "truncate"], [1, "grid", "grid-cols-2", "gap-4"], [1, "text-center", "p-3", "bg-slate-700/30", "rounded-lg"], [1, "text-sm", "font-medium", "text-slate-300", "mb-3", "flex", "items-center", "gap-2"], [1, "flex", "items-center", "gap-3", "p-3", "bg-slate-700/30", "rounded-lg"], [1, "text-center", "py-4", "text-slate-500", "text-sm", "bg-slate-700/30", "rounded-lg"], [1, "bg-gradient-to-br", "from-orange-500/10", "to-amber-500/5", "rounded-xl", "p-4", "border", "border-orange-500/30"], [1, "text-sm", "font-medium", "text-orange-400", "mb-3", "flex", "items-center", "justify-between"], [1, "grid", "grid-cols-3", "gap-2", "mb-4"], [1, "p-2", "bg-slate-800/50", "rounded-lg", "text-center"], [1, "text-lg", "font-bold", "text-cyan-400"], [1, "text-[10px]", "text-slate-500"], [1, "text-lg", "font-bold", "text-emerald-400"], [1, "text-lg", "font-bold", "text-purple-400"], [1, "w-full", "px-4", "py-3", "bg-gradient-to-r", "from-orange-500", "to-amber-500", "hover:from-orange-600", "hover:to-amber-600", "text-white", "rounded-xl", "text-sm", "font-medium", "transition-all", "flex", "items-center", "justify-center", "gap-2", "shadow-lg", "shadow-orange-500/20", "disabled:opacity-50", "disabled:cursor-not-allowed", "disabled:from-slate-600", "disabled:to-slate-700", 3, "click", "disabled"], [1, "px-2", "py-0.5", "bg-white/20", "rounded-full", "text-xs"], [1, "flex", "gap-2", "mt-3"], [1, "flex-1", "px-3", "py-2", "bg-emerald-500/20", "hover:bg-emerald-500/30", "text-emerald-400", "rounded-lg", "text-xs", "transition-colors", "flex", "items-center", "justify-center", "gap-1.5"], [1, "px-3", "py-2", "bg-slate-700/50", "hover:bg-slate-700", "text-slate-400", "rounded-lg", "text-xs", "transition-colors", "flex", "items-center", "justify-center", "gap-1.5", "disabled:opacity-50", 3, "click", "disabled"], [1, "mt-3", "p-3", "bg-slate-800/50", "rounded-lg"], [1, "mt-3", "p-2", "bg-slate-800/30", "rounded-lg"], [1, "mt-3", "p-3", "bg-amber-500/10", "rounded-lg", "border", "border-amber-500/20"], [1, "space-y-2"], [1, "text-sm", "text-slate-500", "text-center", "py-2"], [1, "mt-3", "pt-3", "border-t", "border-slate-600/50"], [1, "p-4", "bg-emerald-500/10", "rounded-xl", "border", "border-emerald-500/30"], [1, "p-4", "bg-emerald-500/20", "rounded-xl", "border", "border-emerald-500/30"], [1, "w-10", "h-10", "rounded-full", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "flex", "items-center", "justify-center", "text-white", "font-bold"], [1, "flex-1"], [1, "text-sm", "text-white", "font-medium"], [1, "flex", "gap-1"], [1, "px-2", "py-1", "bg-blue-500/20", "text-blue-400", "rounded", "text-xs"], [1, "px-2", "py-1", "bg-green-500/20", "text-green-400", "rounded", "text-xs"], [1, "flex-1", "px-3", "py-2", "bg-emerald-500/20", "hover:bg-emerald-500/30", "text-emerald-400", "rounded-lg", "text-xs", "transition-colors", "flex", "items-center", "justify-center", "gap-1.5", 3, "click"], [1, "text-xs", "text-slate-400", "flex", "items-start", "gap-2"], [1, "text-amber-400"], [1, "text-[10px]", "text-slate-500", "text-center"], [1, "text-xs", "text-amber-400", "flex", "items-center", "gap-2"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-700/30", "rounded-lg"], [1, "text-sm", "text-white"], [1, "px-2", "py-1", "hover:bg-red-500/20", "rounded", "text-red-400", "text-xs", "transition-colors", 3, "click"], [1, "text-xs", "text-slate-500", "mb-2"], [1, "flex", "flex-wrap", "gap-2"], [1, "px-3", "py-1.5", "bg-purple-500/10", "hover:bg-purple-500/20", "text-purple-400", "rounded-lg", "text-xs", "transition-colors"], [1, "px-3", "py-1.5", "bg-purple-500/10", "hover:bg-purple-500/20", "text-purple-400", "rounded-lg", "text-xs", "transition-colors", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-2"], [1, "text-sm", "text-emerald-400", "flex", "items-center", "gap-2"], [1, "animate-pulse"], [1, "w-full", "bg-slate-700", "rounded-full", "h-2", "overflow-hidden"], [1, "h-full", "bg-gradient-to-r", "from-emerald-500", "to-teal-500", "rounded-full", "transition-all", "duration-300"], [1, "text-xs", "text-slate-500", "mt-2"], [1, "flex", "items-center", "justify-between"], [1, "text-emerald-300", "font-medium", "text-lg"], [1, "flex", "items-center", "gap-3", "mt-2", "text-sm"], [1, "text-slate-400"], [1, "grid", "grid-cols-2", "gap-3"], [1, "px-4", "py-3", "bg-emerald-500/20", "hover:bg-emerald-500/30", "text-emerald-400", "rounded-xl", "transition-colors", "flex", "items-center", "justify-center", "gap-2", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "click", "disabled"], [1, "px-4", "py-3", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-xl", "transition-colors", "flex", "items-center", "justify-center", "gap-2", 3, "click"], [1, "px-4", "py-3", "bg-blue-500/20", "hover:bg-blue-500/30", "text-blue-400", "rounded-xl", "transition-colors", "flex", "items-center", "justify-center", "gap-2", 3, "click"], [1, "px-4", "py-3", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-xl", "transition-colors", "flex", "items-center", "justify-center", "gap-2", 3, "click"], [1, "animate-spin"]], template: function MonitoringGroupsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u{1F465}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u76E3\u63A7\u7FA4\u7D44\u7BA1\u7406");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "p", 6);
        \u0275\u0275text(10, "\u7BA1\u7406\u6B63\u5728\u76E3\u63A7\u7684 Telegram \u7FA4\u7D44");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 2)(12, "app-config-progress", 7);
        \u0275\u0275listener("action", function MonitoringGroupsComponent_Template_app_config_progress_action_12_listener($event) {
          return ctx.handleConfigAction($event);
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 8);
        \u0275\u0275listener("click", function MonitoringGroupsComponent_Template_button_click_13_listener() {
          return ctx.refreshAllMemberCounts();
        });
        \u0275\u0275elementStart(14, "span");
        \u0275\u0275text(15, "\u{1F465}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "span");
        \u0275\u0275text(17);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "button", 9);
        \u0275\u0275listener("click", function MonitoringGroupsComponent_Template_button_click_18_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275elementStart(19, "span");
        \u0275\u0275text(20, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "span");
        \u0275\u0275text(22, "\u5237\u65B0");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(23, "div", 10)(24, "div", 11)(25, "div", 2)(26, "div", 12)(27, "span", 4);
        \u0275\u0275text(28, "\u{1F4AC}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(29, "div")(30, "div", 13);
        \u0275\u0275text(31);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(32, "div", 14);
        \u0275\u0275text(33, "\u76E3\u63A7\u7FA4\u7D44");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(34, "div", 15)(35, "div", 2)(36, "div", 16)(37, "span", 4);
        \u0275\u0275text(38, "\u{1F465}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(39, "div")(40, "div", 17);
        \u0275\u0275text(41);
        \u0275\u0275pipe(42, "number");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(43, "div", 14);
        \u0275\u0275text(44, "\u7E3D\u6210\u54E1");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(45, "div", 18)(46, "div", 2)(47, "div", 19)(48, "span", 4);
        \u0275\u0275text(49, "\u{1F525}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(50, "div")(51, "div", 20);
        \u0275\u0275text(52);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 14);
        \u0275\u0275text(54, "\u4ECA\u65E5\u5339\u914D");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(55, "div", 21)(56, "div", 2)(57, "div", 22)(58, "span", 4);
        \u0275\u0275text(59, "\u{1F517}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(60, "div")(61, "div", 23);
        \u0275\u0275text(62);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(63, "div", 14);
        \u0275\u0275text(64, "\u5DF2\u7D81\u5B9A\u8A5E\u96C6");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(65, "div", 24)(66, "div", 25)(67, "div", 26)(68, "h3", 27)(69, "span");
        \u0275\u0275text(70, "\u{1F465}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(71, " \u76E3\u63A7\u7FA4\u7D44 ");
        \u0275\u0275elementStart(72, "span", 28);
        \u0275\u0275text(73);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(74, "button", 29);
        \u0275\u0275listener("click", function MonitoringGroupsComponent_Template_button_click_74_listener() {
          return ctx.navigateToResourceCenter();
        });
        \u0275\u0275text(75, " + \u6DFB\u52A0\u7FA4\u7D44 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(76, "div", 30)(77, "div", 31);
        \u0275\u0275repeaterCreate(78, MonitoringGroupsComponent_For_79_Template, 26, 29, "div", 32, _forTrack02, false, MonitoringGroupsComponent_ForEmpty_80_Template, 10, 0, "div", 33);
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275conditionalCreate(81, MonitoringGroupsComponent_Conditional_81_Template, 13, 2, "div", 34);
        \u0275\u0275elementStart(82, "app-history-collection-dialog", 35);
        \u0275\u0275listener("closeDialog", function MonitoringGroupsComponent_Template_app_history_collection_dialog_closeDialog_82_listener() {
          return ctx.closeHistoryCollectionDialog();
        })("collectionComplete", function MonitoringGroupsComponent_Template_app_history_collection_dialog_collectionComplete_82_listener($event) {
          return ctx.onHistoryCollectionComplete($event);
        })("viewUsersEvent", function MonitoringGroupsComponent_Template_app_history_collection_dialog_viewUsersEvent_82_listener() {
          return ctx.viewCollectedUsers();
        });
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(13);
        \u0275\u0275property("disabled", ctx.isRefreshingMemberCounts());
        \u0275\u0275advance();
        \u0275\u0275classProp("animate-spin", ctx.isRefreshingMemberCounts());
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate(ctx.isRefreshingMemberCounts() ? "\u5237\u65B0\u4E2D..." : "\u5237\u65B0\u6210\u54E1\u6578");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("animate-spin", ctx.stateService.isLoading());
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate(ctx.stateService.groups().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(42, 15, ctx.stateService.totalMembers()));
        \u0275\u0275advance(11);
        \u0275\u0275textInterpolate(ctx.stateService.todayMatches());
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.groupsWithKeywords().length);
        \u0275\u0275advance(11);
        \u0275\u0275textInterpolate1("(", ctx.stateService.groups().length, ")");
        \u0275\u0275advance(5);
        \u0275\u0275repeater(ctx.stateService.groups());
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.showDetailDialog() ? 81 : -1);
        \u0275\u0275advance();
        \u0275\u0275property("isOpen", ctx.showHistoryCollectionDialog())("group", ctx.historyCollectionGroup());
      }
    }, dependencies: [CommonModule, FormsModule, ConfigProgressComponent, HistoryCollectionDialogComponent, DecimalPipe], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonitoringGroupsComponent, [{
    type: Component,
    args: [{
      selector: "app-monitoring-groups",
      standalone: true,
      imports: [CommonModule, FormsModule, ConfigProgressComponent, HistoryCollectionDialogComponent],
      template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">\u{1F465}</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">\u76E3\u63A7\u7FA4\u7D44\u7BA1\u7406</h1>
            <p class="text-sm text-slate-400">\u7BA1\u7406\u6B63\u5728\u76E3\u63A7\u7684 Telegram \u7FA4\u7D44</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- \u914D\u7F6E\u9032\u5EA6\uFF08\u7DCA\u6E4A\u6A21\u5F0F\uFF09 -->
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <!-- \u{1F195} \u6279\u91CF\u5237\u65B0\u6210\u54E1\u6578\u6309\u9215 -->
          <button (click)="refreshAllMemberCounts()"
                  [disabled]="isRefreshingMemberCounts()"
                  class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-2 border border-purple-500/30 disabled:opacity-50">
            <span [class.animate-spin]="isRefreshingMemberCounts()">\u{1F465}</span>
            <span>{{ isRefreshingMemberCounts() ? '\u5237\u65B0\u4E2D...' : '\u5237\u65B0\u6210\u54E1\u6578' }}</span>
          </button>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">\u{1F504}</span>
            <span>\u5237\u65B0</span>
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u5361\u7247 - \u{1F527} \u7F8E\u5316\u512A\u5316 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl border border-emerald-500/20 p-4 hover:border-emerald-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">\u{1F4AC}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.groups().length }}</div>
              <div class="text-xs text-slate-400">\u76E3\u63A7\u7FA4\u7D44</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl border border-cyan-500/20 p-4 hover:border-cyan-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">\u{1F465}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stateService.totalMembers() | number }}</div>
              <div class="text-xs text-slate-400">\u7E3D\u6210\u54E1</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">\u{1F525}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-400">{{ stateService.todayMatches() }}</div>
              <div class="text-xs text-slate-400">\u4ECA\u65E5\u5339\u914D</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">\u{1F517}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.groupsWithKeywords().length }}</div>
              <div class="text-xs text-slate-400">\u5DF2\u7D81\u5B9A\u8A5E\u96C6</div>
            </div>
          </div>
        </div>
      </div>

      <!-- \u7FA4\u7D44\u5217\u8868 - \u{1F527} \u6539\u70BA\u5168\u5BEC\u5EA6 -->
      <div class="flex-1 overflow-hidden">
        <div class="h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>\u{1F465}</span> \u76E3\u63A7\u7FA4\u7D44
              <span class="text-xs text-slate-500">({{ stateService.groups().length }})</span>
            </h3>
            <button (click)="navigateToResourceCenter()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + \u6DFB\u52A0\u7FA4\u7D44
            </button>
          </div>
          <!-- \u{1F527} \u7DB2\u683C\u4F48\u5C40 - \u4FEE\u5FA9\u6EA2\u51FA\u554F\u984C -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (group of stateService.groups(); track group.id) {
                <!-- \u{1F527} \u6DFB\u52A0 overflow-hidden \u9632\u6B62\u5167\u5BB9\u6EA2\u51FA -->
                <div (click)="openGroupDetail(group)"
                     class="p-4 bg-slate-800/60 rounded-xl hover:bg-slate-700/80 transition-all cursor-pointer group border border-slate-700/50 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 overflow-hidden">
                  
                  <!-- \u982D\u90E8\uFF1A\u982D\u50CF + \u540D\u7A31 + \u985E\u578B\u6A19\u7C64 -->
                  <div class="flex items-start gap-3 mb-3">
                    <!-- \u982D\u50CF - \u56FA\u5B9A\u5C3A\u5BF8 -->
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 border"
                         [class.bg-gradient-to-br]="true"
                         [class.from-emerald-500/30]="group.resourceType !== 'channel'"
                         [class.to-teal-500/30]="group.resourceType !== 'channel'"
                         [class.text-emerald-400]="group.resourceType !== 'channel'"
                         [class.border-emerald-500/20]="group.resourceType !== 'channel'"
                         [class.from-blue-500/30]="group.resourceType === 'channel'"
                         [class.to-indigo-500/30]="group.resourceType === 'channel'"
                         [class.text-blue-400]="group.resourceType === 'channel'"
                         [class.border-blue-500/20]="group.resourceType === 'channel'">
                      {{ group.resourceType === 'channel' ? '\u{1F4E2}' : group.name[0] }}
                    </div>
                    <!-- \u6587\u5B57\u5340 - \u9650\u5236\u5BEC\u5EA6\u9632\u6B62\u6EA2\u51FA -->
                    <div class="flex-1 min-w-0 overflow-hidden">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-white truncate text-sm leading-tight" [title]="group.name">
                          {{ group.name }}
                        </span>
                        <!-- \u{1F195} \u7FA4\u7D44\u985E\u578B\u6A19\u7C64 -->
                        @if (group.resourceType === 'channel') {
                          <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded flex-shrink-0">
                            \u983B\u9053
                          </span>
                        } @else if (group.resourceType === 'supergroup') {
                          <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded flex-shrink-0">
                            \u8D85\u7D1A\u7FA4
                          </span>
                        }
                      </div>
                      <div class="text-xs text-slate-500 truncate mt-0.5" [title]="group.url">
                        {{ group.url }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- \u7D71\u8A08\u884C -->
                  <div class="flex items-center justify-between text-xs mb-3 px-1">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-400 flex items-center gap-1">
                        <span class="text-base">\u{1F465}</span>
                        <span class="font-medium">{{ group.memberCount | number }}</span>
                      </span>
                      @if (group.stats?.matchesToday && group.stats.matchesToday > 0) {
                        <span class="text-orange-400 flex items-center gap-1">
                          <span>\u{1F525}</span>
                          <span>{{ group.stats.matchesToday }}</span>
                        </span>
                      }
                    </div>
                    <span class="text-cyan-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      \u67E5\u770B\u8A73\u60C5 \u2192
                    </span>
                  </div>
                  
                  <!-- \u7D81\u5B9A\u7684\u8A5E\u96C6\u6A19\u7C64 - \u9650\u5236\u9AD8\u5EA6\u9632\u6B62\u6EA2\u51FA -->
                  <div class="flex flex-wrap gap-1.5 overflow-hidden max-h-[52px]">
                    @if (group.linkedKeywordSets.length > 0) {
                      @for (setId of group.linkedKeywordSets.slice(0, 2); track setId) {
                        <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-md truncate max-w-[120px]" 
                              [title]="stateService.getKeywordSetName(setId)">
                          \u{1F511} {{ stateService.getKeywordSetName(setId) }}
                        </span>
                      }
                      @if (group.linkedKeywordSets.length > 2) {
                        <span class="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded-md">
                          +{{ group.linkedKeywordSets.length - 2 }}
                        </span>
                      }
                    } @else {
                      <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md">
                        \u26A0\uFE0F \u672A\u7D81\u5B9A\u8A5E\u96C6
                      </span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="col-span-full text-center py-16 text-slate-400">
                  <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                    <span class="text-4xl">\u{1F465}</span>
                  </div>
                  <h3 class="text-lg font-medium text-white mb-2">\u9084\u6C92\u6709\u76E3\u63A7\u7FA4\u7D44</h3>
                  <p class="text-sm mb-6 text-slate-500">\u8ACB\u5728\u8CC7\u6E90\u4E2D\u5FC3\u641C\u7D22\u4E26\u6DFB\u52A0\u7FA4\u7D44</p>
                  <button (click)="navigateToResourceCenter()"
                          class="px-5 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
                    + \u6DFB\u52A0\u7B2C\u4E00\u500B\u7FA4\u7D44
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- \u{1F195} \u7FA4\u7D44\u8A73\u60C5\u5F48\u7A97 -->
    @if (showDetailDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- \u906E\u7F69\u5C64 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" 
             (click)="closeDetailDialog()"></div>
        
        <!-- \u5F48\u7A97\u5167\u5BB9 -->
        <div class="relative w-full max-w-lg max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <!-- \u5F48\u7A97\u982D\u90E8 -->
          <div class="flex items-center justify-between p-5 border-b border-slate-700/50">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>\u{1F4CB}</span> \u7FA4\u7D44\u8A73\u60C5
            </h3>
            <button (click)="closeDetailDialog()" 
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
              \u2715
            </button>
          </div>
          
          <!-- \u5F48\u7A97\u5167\u5BB9\u5340 -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            @if (selectedGroup()) {
              <!-- \u57FA\u672C\u4FE1\u606F -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-3xl font-bold text-emerald-400">
                    {{ selectedGroup()!.name[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-xl font-medium text-white truncate">{{ selectedGroup()!.name }}</h4>
                    <p class="text-sm text-slate-400 truncate">{{ selectedGroup()!.url }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div class="text-2xl font-bold text-cyan-400">{{ selectedGroup()!.memberCount | number }}</div>
                    <div class="text-xs text-slate-500">\u6210\u54E1\u6578</div>
                  </div>
                  <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div class="text-2xl font-bold text-orange-400">{{ selectedGroup()!.stats?.matchesToday || 0 }}</div>
                    <div class="text-xs text-slate-500">\u4ECA\u65E5\u5339\u914D</div>
                  </div>
                </div>
              </div>

              <!-- \u5E33\u865F\u4FE1\u606F -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>\u{1F4F1}</span> \u76E3\u63A7\u5E33\u865F
                </h4>
                @if (selectedGroup()!.accountPhone) {
                  <div class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {{ getAccountInitial(selectedGroup()!.accountPhone) }}
                    </div>
                    <div class="flex-1">
                      <div class="text-sm text-white font-medium">{{ getAccountName(selectedGroup()!.accountPhone) }}</div>
                      <div class="text-xs text-slate-500">{{ selectedGroup()!.accountPhone }}</div>
                    </div>
                    <div class="flex gap-1">
                      @if (isListenerAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">\u76E3\u807D</span>
                      }
                      @if (isSenderAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">\u767C\u9001</span>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-4 text-slate-500 text-sm bg-slate-700/30 rounded-lg">
                    <p>\u5C1A\u672A\u5206\u914D\u76E3\u63A7\u5E33\u865F</p>
                  </div>
                }
              </div>
              
              <!-- \u{1F195} \u7528\u6236\u6536\u96C6 - \u7A81\u51FA\u7684\u529F\u80FD\u5340\u584A -->
              <div class="bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl p-4 border border-orange-500/30">
                <h4 class="text-sm font-medium text-orange-400 mb-3 flex items-center justify-between">
                  <span class="flex items-center gap-2">
                    <span>\u{1F504}</span> \u5F9E\u6B77\u53F2\u6D88\u606F\u6536\u96C6\u7528\u6236
                  </span>
                  <span class="text-xs text-slate-500">\u66FF\u4EE3\u6210\u54E1\u63D0\u53D6</span>
                </h4>
                
                <!-- \u7D71\u8A08\u5361\u7247 -->
                <div class="grid grid-cols-3 gap-2 mb-4">
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-cyan-400">{{ monitoredMessagesCount() | number }}</div>
                    <div class="text-[10px] text-slate-500">\u76E3\u63A7\u6D88\u606F</div>
                  </div>
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-emerald-400">{{ collectedUsersCount() }}</div>
                    <div class="text-[10px] text-slate-500">\u5DF2\u6536\u96C6</div>
                  </div>
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-purple-400">{{ estimatedNewUsers() }}</div>
                    <div class="text-[10px] text-slate-500">\u53EF\u6536\u96C6</div>
                  </div>
                </div>
                
                <!-- \u4E3B\u8981\u64CD\u4F5C\u6309\u9215 - \u7A81\u51FA\u986F\u793A -->
                <button (click)="openHistoryCollectionDialog()"
                        [disabled]="monitoredMessagesCount() === 0"
                        class="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700">
                  <span class="text-base">\u{1F504}</span>
                  <span>\u958B\u59CB\u6536\u96C6\u7528\u6236</span>
                  @if (monitoredMessagesCount() > 0) {
                    <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      \u53EF\u6536\u96C6 ~{{ estimatedNewUsers() }} \u4EBA
                    </span>
                  }
                </button>
                
                <!-- \u6B21\u8981\u64CD\u4F5C -->
                <div class="flex gap-2 mt-3">
                  @if (collectedUsersCount() > 0) {
                    <button (click)="viewCollectedUsers()"
                            class="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5">
                      <span>\u{1F441}\uFE0F</span>
                      <span>\u67E5\u770B\u5DF2\u6536\u96C6 ({{ collectedUsersCount() }})</span>
                    </button>
                  }
                  <button (click)="refreshCollectedStats()"
                          [disabled]="isLoadingStats()"
                          class="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <span [class.animate-spin]="isLoadingStats()">\u{1F504}</span>
                    <span>\u5237\u65B0</span>
                  </button>
                </div>
                
                <!-- \u63D0\u793A\u4FE1\u606F -->
                @if (monitoredMessagesCount() === 0) {
                  <div class="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <p class="text-xs text-slate-400 flex items-start gap-2">
                      <span class="text-amber-400">\u{1F4A1}</span>
                      <span>\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u5F8C\uFF0C\u7CFB\u7D71\u6703\u81EA\u52D5\u8A18\u9304\u6D88\u606F\u3002\u7D2F\u7A4D\u4E00\u5B9A\u6D88\u606F\u5F8C\u5373\u53EF\u6536\u96C6\u767C\u8A00\u7528\u6236\u3002</span>
                    </p>
                  </div>
                } @else {
                  <div class="mt-3 p-2 bg-slate-800/30 rounded-lg">
                    <p class="text-[10px] text-slate-500 text-center">
                      \u5F9E {{ monitoredMessagesCount() | number }} \u689D\u6D88\u606F\u4E2D\u63D0\u53D6\u6D3B\u8E8D\u7528\u6236\uFF0C\u7121\u9700\u7BA1\u7406\u54E1\u6B0A\u9650
                    </p>
                  </div>
                }
                
                @if (!selectedGroup()!.accountPhone) {
                  <div class="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p class="text-xs text-amber-400 flex items-center gap-2">
                      <span>\u26A0\uFE0F</span>
                      <span>\u9700\u8981\u5206\u914D\u76E3\u63A7\u5E33\u865F\u624D\u80FD\u6536\u96C6\u7528\u6236</span>
                    </p>
                  </div>
                }
              </div>

              <!-- \u7D81\u5B9A\u7684\u8A5E\u96C6 -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>\u{1F511}</span> \u7D81\u5B9A\u7684\u95DC\u9375\u8A5E\u96C6
                </h4>
                @if (selectedGroup()!.linkedKeywordSets.length > 0) {
                  <div class="space-y-2">
                    @for (setId of selectedGroup()!.linkedKeywordSets; track setId) {
                      <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <span class="text-sm text-white">{{ stateService.getKeywordSetName(setId) }}</span>
                        <button (click)="unbindKeywordSet(setId)"
                                class="px-2 py-1 hover:bg-red-500/20 rounded text-red-400 text-xs transition-colors">
                          \u89E3\u7D81
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-slate-500 text-center py-2">\u5C1A\u672A\u7D81\u5B9A\u95DC\u9375\u8A5E\u96C6</p>
                }
                
                <!-- \u53EF\u7D81\u5B9A\u7684\u8A5E\u96C6 -->
                @if (availableKeywordSets().length > 0) {
                  <div class="mt-3 pt-3 border-t border-slate-600/50">
                    <p class="text-xs text-slate-500 mb-2">\u9EDE\u64CA\u7D81\u5B9A\u8A5E\u96C6\uFF1A</p>
                    <div class="flex flex-wrap gap-2">
                      @for (set of availableKeywordSets(); track set.id) {
                        <button (click)="bindKeywordSet(set.id)"
                                class="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs transition-colors">
                          + {{ set.name }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- \u63D0\u53D6\u9032\u5EA6/\u7D50\u679C -->
              @if (extractionProgress().isExtracting && extractionProgress().groupId === selectedGroup()!.id) {
                <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-emerald-400 flex items-center gap-2">
                      <span class="animate-pulse">\u23F3</span> \u6B63\u5728\u63D0\u53D6\u6210\u54E1...
                    </span>
                    <span class="text-xs text-slate-400">
                      {{ extractionProgress().extracted }} / {{ extractionProgress().total }}
                    </span>
                  </div>
                  <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                         [style.width.%]="getExtractionPercent()">
                    </div>
                  </div>
                  <div class="text-xs text-slate-500 mt-2">{{ extractionProgress().status }}</div>
                </div>
              }
              
              @if (extractionResult().completed && extractionResult().groupId === selectedGroup()!.id) {
                <div class="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-emerald-400 flex items-center gap-2">
                      <span>\u2705</span> \u63D0\u53D6\u5B8C\u6210
                    </span>
                    <span class="text-emerald-300 font-medium text-lg">{{ extractionResult().count }} \u4EBA</span>
                  </div>
                  <div class="flex items-center gap-3 mt-2 text-sm">
                    <span class="text-slate-400">\u{1F7E2} {{ extractionResult().online }} \u5728\u7DDA</span>
                    <span class="text-slate-400">\u23F0 {{ extractionResult().recently }} \u6700\u8FD1</span>
                    <span class="text-slate-400">\u{1F48E} {{ extractionResult().premium }} Premium</span>
                  </div>
                </div>
              }
            }
          </div>
          
          <!-- \u5F48\u7A97\u5E95\u90E8\u64CD\u4F5C\u6309\u9215 -->
          @if (selectedGroup()) {
            <div class="p-5 border-t border-slate-700/50 bg-slate-800/30">
              <div class="grid grid-cols-2 gap-3">
                <button (click)="extractMembers()"
                        [disabled]="extractionProgress().isExtracting"
                        class="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (extractionProgress().isExtracting && extractionProgress().groupId === selectedGroup()!.id) {
                    <span class="animate-spin">\u23F3</span> \u63D0\u53D6\u4E2D...
                  } @else {
                    <span>\u{1F465}</span> \u63D0\u53D6\u6210\u54E1
                  }
                </button>
                <button (click)="copyGroupLink()"
                        class="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>\u{1F4CB}</span> \u8907\u88FD\u93C8\u63A5
                </button>
                <button (click)="openInTelegram()"
                        class="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>\u{1F517}</span> \u5728 Telegram \u6253\u958B
                </button>
                <button (click)="removeGroup()"
                        class="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>\u{1F5D1}\uFE0F</span> \u79FB\u9664\u76E3\u63A7
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
    
    <!-- \u{1F195} \u6B77\u53F2\u6D88\u606F\u6536\u96C6\u5C0D\u8A71\u6846 -->
    <app-history-collection-dialog
      [isOpen]="showHistoryCollectionDialog()"
      [group]="historyCollectionGroup()"
      (closeDialog)="closeHistoryCollectionDialog()"
      (collectionComplete)="onHistoryCollectionComplete($event)"
      (viewUsersEvent)="viewCollectedUsers()">
    </app-history-collection-dialog>
  `
    }]
  }], null, { configAction: [{ type: Output, args: ["configAction"] }], extractMembersEvent: [{ type: Output, args: ["extractMembersEvent"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MonitoringGroupsComponent, { className: "MonitoringGroupsComponent", filePath: "src/monitoring/monitoring-groups.component.ts", lineNumber: 495 });
})();

// src/monitoring/keyword-sets.component.ts
var _forTrack03 = ($index, $item) => $item.id;
function KeywordSetsComponent_Conditional_68_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 28);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F525} \u7E3D\u5339\u914D ", ctx_r0.stateService.totalKeywordMatches(), " ");
  }
}
function KeywordSetsComponent_Conditional_71_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40)(1, "span");
    \u0275\u0275text(2, "\u{1F511}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 41);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const set_r2 = ctx.$implicit;
    \u0275\u0275classProp("bg-purple-500/20", set_r2.isActive)("text-purple-400", set_r2.isActive)("border-purple-500/30", set_r2.isActive)("bg-slate-700/50", !set_r2.isActive)("text-slate-400", !set_r2.isActive)("border-slate-600/30", !set_r2.isActive);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(set_r2.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("(", set_r2.keywords.length, ")");
  }
}
function KeywordSetsComponent_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 30)(1, "div", 36)(2, "span", 14);
    \u0275\u0275text(3, "\u{1F3AF} \u62D6\u62FD\u7D81\u5B9A\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 37);
    \u0275\u0275text(5, "\u{1F4A1} \u62D6\u62FD\u8A5E\u96C6\u5230\u7FA4\u7D44\u53EF\u5FEB\u901F\u7D81\u5B9A");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 38);
    \u0275\u0275repeaterCreate(7, KeywordSetsComponent_Conditional_71_For_8_Template, 7, 14, "div", 39, _forTrack03);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275repeater(ctx_r0.stateService.keywordSets());
  }
}
function KeywordSetsComponent_For_75_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 47);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const set_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" \u{1F525} ", set_r4.totalMatches, " ");
  }
}
function KeywordSetsComponent_For_75_For_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 49);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const kw_r5 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", kw_r5.text, " ");
  }
}
function KeywordSetsComponent_For_75_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const set_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" +", set_r4.keywords.length - 3, " ");
  }
}
function KeywordSetsComponent_For_75_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275listener("click", function KeywordSetsComponent_For_75_Template_div_click_0_listener() {
      const set_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.selectSet(set_r4));
    });
    \u0275\u0275elementStart(1, "div", 43);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 44)(4, "div", 45)(5, "span", 46);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(7, KeywordSetsComponent_For_75_Conditional_7_Template, 2, 1, "span", 47);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 48);
    \u0275\u0275repeaterCreate(9, KeywordSetsComponent_For_75_For_10_Template, 2, 1, "span", 49, _forTrack03);
    \u0275\u0275conditionalCreate(11, KeywordSetsComponent_For_75_Conditional_11_Template, 2, 1, "span", 50);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 51)(13, "label", 52);
    \u0275\u0275listener("click", function KeywordSetsComponent_For_75_Template_label_click_13_listener($event) {
      \u0275\u0275restoreView(_r3);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(14, "input", 53);
    \u0275\u0275listener("change", function KeywordSetsComponent_For_75_Template_input_change_14_listener() {
      const set_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.toggleSetActive(set_r4));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 54);
    \u0275\u0275element(16, "div", 55);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(17, "svg", 56);
    \u0275\u0275element(18, "path", 57);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_10_0;
    let tmp_11_0;
    const set_r4 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("border-cyan-500/50", ((tmp_10_0 = ctx_r0.selectedSet()) == null ? null : tmp_10_0.id) === set_r4.id)("bg-slate-700", ((tmp_11_0 = ctx_r0.selectedSet()) == null ? null : tmp_11_0.id) === set_r4.id);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-orange-500/20", set_r4.isActive)("text-orange-400", set_r4.isActive)("bg-slate-600", !set_r4.isActive)("text-slate-500", !set_r4.isActive);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", set_r4.name.substring(0, 3), " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(set_r4.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(set_r4.totalMatches && set_r4.totalMatches > 0 ? 7 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(set_r4.keywords.slice(0, 3));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(set_r4.keywords.length > 3 ? 11 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275property("checked", set_r4.isActive);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-emerald-500", set_r4.isActive)("bg-slate-600", !set_r4.isActive);
    \u0275\u0275advance();
    \u0275\u0275classProp("left-4", set_r4.isActive)("left-0", !set_r4.isActive);
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 62);
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 83);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Conditional_34_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.clearAllKeywords());
    });
    \u0275\u0275text(1, " \u6E05\u7A7A\u5168\u90E8 ");
    \u0275\u0275elementEnd();
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_35_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 77)(1, "p");
    \u0275\u0275text(2, "\u9084\u6C92\u6709\u95DC\u9375\u8A5E");
    \u0275\u0275elementEnd()();
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_36_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 87);
    \u0275\u0275text(1, "\u65B0");
    \u0275\u0275elementEnd();
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_36_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 84)(1, "div", 85)(2, "span", 86);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, KeywordSetsComponent_Conditional_81_Conditional_36_For_2_Conditional_4_Template, 2, 0, "span", 87);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 88);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Conditional_36_For_2_Template_button_click_5_listener() {
      const keyword_r9 = \u0275\u0275restoreView(_r8).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.removeKeyword(keyword_r9));
    });
    \u0275\u0275text(6, " \u2715 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const keyword_r9 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(keyword_r9.text);
    \u0275\u0275advance();
    \u0275\u0275conditional(keyword_r9.isNew ? 4 : -1);
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_36_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 78);
    \u0275\u0275repeaterCreate(1, KeywordSetsComponent_Conditional_81_Conditional_36_For_2_Template, 7, 2, "div", 84, _forTrack03);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.editingSet.keywords);
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 89);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u4FDD\u5B58\u4E2D...");
    \u0275\u0275elementEnd();
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.isCreating() ? "\u5275\u5EFA" : "\u4FDD\u5B58");
  }
}
function KeywordSetsComponent_Conditional_81_Conditional_41_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 90);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Conditional_41_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.deleteSet());
    });
    \u0275\u0275text(1, " \u522A\u9664 ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", ctx_r0.isSaving());
  }
}
function KeywordSetsComponent_Conditional_81_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 58);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeEditor());
    });
    \u0275\u0275elementStart(1, "div", 59);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r6);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 60)(3, "h3", 61);
    \u0275\u0275text(4);
    \u0275\u0275conditionalCreate(5, KeywordSetsComponent_Conditional_81_Conditional_5_Template, 1, 0, "span", 62);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "button", 63);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_button_click_6_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeEditor());
    });
    \u0275\u0275text(7, " \u2715 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "div", 64)(9, "div")(10, "label", 65);
    \u0275\u0275text(11, "\u8A5E\u96C6\u540D\u7A31");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "input", 66);
    \u0275\u0275twoWayListener("ngModelChange", function KeywordSetsComponent_Conditional_81_Template_input_ngModelChange_12_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.editingSet.name, $event) || (ctx_r0.editingSet.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function KeywordSetsComponent_Conditional_81_Template_input_ngModelChange_12_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.markAsChanged());
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "div")(14, "label", 65);
    \u0275\u0275text(15, "\u5339\u914D\u6A21\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 67);
    \u0275\u0275twoWayListener("ngModelChange", function KeywordSetsComponent_Conditional_81_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.editingSet.matchMode, $event) || (ctx_r0.editingSet.matchMode = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function KeywordSetsComponent_Conditional_81_Template_select_ngModelChange_16_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.markAsChanged());
    });
    \u0275\u0275elementStart(17, "option", 68);
    \u0275\u0275text(18, "\u6A21\u7CCA\u5339\u914D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "option", 69);
    \u0275\u0275text(20, "\u7CBE\u78BA\u5339\u914D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "option", 70);
    \u0275\u0275text(22, "\u6B63\u5247\u8868\u9054\u5F0F");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(23, "div")(24, "label", 65);
    \u0275\u0275text(25, "\u6DFB\u52A0\u95DC\u9375\u8A5E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 71)(27, "input", 72);
    \u0275\u0275twoWayListener("ngModelChange", function KeywordSetsComponent_Conditional_81_Template_input_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.newKeyword, $event) || (ctx_r0.newKeyword = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("keyup.enter", function KeywordSetsComponent_Conditional_81_Template_input_keyup_enter_27_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.addKeyword());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "button", 73);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_button_click_28_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.addKeyword());
    });
    \u0275\u0275text(29, " + \u6DFB\u52A0 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(30, "div")(31, "div", 74)(32, "span", 75);
    \u0275\u0275text(33);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(34, KeywordSetsComponent_Conditional_81_Conditional_34_Template, 2, 0, "button", 76);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(35, KeywordSetsComponent_Conditional_81_Conditional_35_Template, 3, 0, "div", 77)(36, KeywordSetsComponent_Conditional_81_Conditional_36_Template, 3, 0, "div", 78);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "div", 79)(38, "button", 80);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_button_click_38_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.saveSet());
    });
    \u0275\u0275conditionalCreate(39, KeywordSetsComponent_Conditional_81_Conditional_39_Template, 3, 0)(40, KeywordSetsComponent_Conditional_81_Conditional_40_Template, 2, 1, "span");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(41, KeywordSetsComponent_Conditional_81_Conditional_41_Template, 2, 1, "button", 81);
    \u0275\u0275elementStart(42, "button", 82);
    \u0275\u0275listener("click", function KeywordSetsComponent_Conditional_81_Template_button_click_42_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeEditor());
    });
    \u0275\u0275text(43, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.isCreating() ? "\u65B0\u5EFA\u95DC\u9375\u8A5E\u96C6" : "\u7DE8\u8F2F\u95DC\u9375\u8A5E\u96C6", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.hasUnsavedChanges() ? 5 : -1);
    \u0275\u0275advance(7);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.editingSet.name);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.editingSet.matchMode);
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.newKeyword);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", !ctx_r0.newKeyword.trim());
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" \u95DC\u9375\u8A5E\u5217\u8868 (", ctx_r0.editingSet.keywords.length, ") ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.editingSet.keywords.length > 0 ? 34 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.editingSet.keywords.length === 0 ? 35 : 36);
    \u0275\u0275advance(3);
    \u0275\u0275property("disabled", ctx_r0.isSaving());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isSaving() ? 39 : 40);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r0.isCreating() ? 41 : -1);
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.isSaving());
  }
}
var KeywordSetsComponent = class _KeywordSetsComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.confirmDialog = inject(ConfirmDialogService);
    this.configAction = output();
    this.selectedSet = signal(null, ...ngDevMode ? [{ debugName: "selectedSet" }] : []);
    this.isEditing = signal(false, ...ngDevMode ? [{ debugName: "isEditing" }] : []);
    this.isCreating = signal(false, ...ngDevMode ? [{ debugName: "isCreating" }] : []);
    this.isSaving = signal(false, ...ngDevMode ? [{ debugName: "isSaving" }] : []);
    this.hasUnsavedChanges = signal(false, ...ngDevMode ? [{ debugName: "hasUnsavedChanges" }] : []);
    this.editingSet = this.createEmptySet();
    this.originalSet = null;
    this.newKeyword = "";
    this.listeners = [];
  }
  ngOnInit() {
    this.stateService.loadAll();
    this.setupListeners();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("save-keyword-set-result", (data) => {
      this.isSaving.set(false);
      if (data.success) {
        this.toastService.success(this.isCreating() ? "\u2705 \u8A5E\u96C6\u5275\u5EFA\u6210\u529F" : "\u2705 \u8A5E\u96C6\u4FDD\u5B58\u6210\u529F");
        this.hasUnsavedChanges.set(false);
        this.stateService.refresh();
        this.isEditing.set(false);
        this.newKeyword = "";
      } else {
        this.toastService.error(`\u274C \u4FDD\u5B58\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("delete-keyword-set-result", (data) => {
      if (data.success) {
        this.toastService.success("\u{1F5D1}\uFE0F \u8A5E\u96C6\u5DF2\u522A\u9664");
        this.selectedSet.set(null);
        this.hasUnsavedChanges.set(false);
        this.stateService.refresh();
        this.isEditing.set(false);
        this.newKeyword = "";
      } else {
        this.toastService.error(`\u274C \u522A\u9664\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.listeners.push(cleanup2);
  }
  refreshData() {
    this.stateService.refresh();
    this.toastService.info("\u6B63\u5728\u5237\u65B0\u95DC\u9375\u8A5E\u96C6...");
  }
  handleConfigAction(action) {
    this.configAction.emit(action);
  }
  createEmptySet() {
    return {
      id: "",
      name: "",
      keywords: [],
      matchMode: "fuzzy",
      isActive: true,
      totalMatches: 0
    };
  }
  selectSet(set) {
    this.selectedSet.set(set);
    this.editingSet = __spreadProps(__spreadValues({}, set), { keywords: [...set.keywords] });
    this.originalSet = JSON.parse(JSON.stringify(set));
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.hasUnsavedChanges.set(false);
  }
  createNewSet() {
    this.selectedSet.set(null);
    this.editingSet = this.createEmptySet();
    this.originalSet = null;
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.hasUnsavedChanges.set(false);
  }
  async closeEditor() {
    if (this.hasUnsavedChanges()) {
      const confirmed = await this.confirmDialog.warning("\u672A\u4FDD\u5B58\u7684\u8B8A\u66F4", "\u60A8\u6709\u672A\u4FDD\u5B58\u7684\u8B8A\u66F4\uFF0C\u78BA\u5B9A\u8981\u95DC\u9589\u55CE\uFF1F");
      if (!confirmed)
        return;
    }
    this.isEditing.set(false);
    this.newKeyword = "";
    this.hasUnsavedChanges.set(false);
  }
  // 🔧 新增：標記有變更
  markAsChanged() {
    this.hasUnsavedChanges.set(true);
  }
  toggleSetActive(set) {
    const newActive = !set.isActive;
    this.ipcService.send("save-keyword-set", {
      id: parseInt(set.id),
      name: set.name,
      keywords: set.keywords.map((k) => ({ text: k.text })),
      isActive: newActive,
      matchMode: set.matchMode
    });
    this.toastService.success(newActive ? `\u2705 \u5DF2\u555F\u7528 ${set.name}` : `\u23F8\uFE0F \u5DF2\u505C\u7528 ${set.name}`);
  }
  addKeyword() {
    const text = this.newKeyword.trim();
    if (!text)
      return;
    if (this.editingSet.keywords.some((k) => k.text === text)) {
      this.toastService.error("\u95DC\u9375\u8A5E\u5DF2\u5B58\u5728");
      return;
    }
    this.editingSet.keywords = [...this.editingSet.keywords, {
      id: `new-${Date.now()}`,
      text,
      matchCount: 0,
      isNew: true
    }];
    this.newKeyword = "";
    this.markAsChanged();
  }
  removeKeyword(keyword) {
    this.editingSet.keywords = this.editingSet.keywords.filter((k) => k.id !== keyword.id);
    this.markAsChanged();
  }
  async clearAllKeywords() {
    const confirmed = await this.confirmDialog.warning("\u6E05\u7A7A\u95DC\u9375\u8A5E", "\u78BA\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u95DC\u9375\u8A5E\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002");
    if (confirmed) {
      this.editingSet.keywords = [];
      this.markAsChanged();
    }
  }
  saveSet() {
    console.log("[KeywordSets] saveSet called, isCreating:", this.isCreating());
    console.log("[KeywordSets] editingSet:", this.editingSet);
    if (!this.editingSet.name.trim()) {
      this.toastService.error("\u8ACB\u8F38\u5165\u8A5E\u96C6\u540D\u7A31");
      return;
    }
    if (this.isSaving()) {
      return;
    }
    const payload = {
      id: this.isCreating() ? null : parseInt(this.editingSet.id),
      name: this.editingSet.name.trim(),
      keywords: this.editingSet.keywords.map((k) => ({ text: k.text })),
      isActive: this.editingSet.isActive,
      matchMode: this.editingSet.matchMode
    };
    console.log("[KeywordSets] Sending save-keyword-set:", payload);
    this.isSaving.set(true);
    this.ipcService.send("save-keyword-set", payload);
    this.toastService.info("\u23F3 \u6B63\u5728\u4FDD\u5B58...");
  }
  async deleteSet() {
    if (!this.selectedSet())
      return;
    const set = this.selectedSet();
    const confirmed = await this.confirmDialog.danger("\u522A\u9664\u95DC\u9375\u8A5E\u96C6", `\u78BA\u5B9A\u8981\u522A\u9664\u8A5E\u96C6\u300C${set.name}\u300D\u55CE\uFF1F
\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002`, [`${set.name} (${set.keywords.length} \u500B\u95DC\u9375\u8A5E)`]);
    if (confirmed) {
      this.ipcService.send("delete-keyword-set", { id: parseInt(set.id) });
    }
  }
  static {
    this.\u0275fac = function KeywordSetsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _KeywordSetsComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _KeywordSetsComponent, selectors: [["app-keyword-sets"]], outputs: { configAction: "configAction" }, decls: 82, vars: 10, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "p-6"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "w-12", "h-12", "bg-gradient-to-br", "from-purple-500", "to-pink-600", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], ["mode", "compact", 3, "action"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "grid", "grid-cols-4", "gap-4", "mb-6"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "w-10", "h-10", "bg-purple-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-purple-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "text-xs", "text-slate-500"], [1, "w-10", "h-10", "bg-cyan-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-cyan-400"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "w-10", "h-10", "bg-orange-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-orange-400"], [1, "text-2xl", "font-bold", "text-orange-400"], [1, "w-10", "h-10", "bg-emerald-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-emerald-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "flex-1", "overflow-hidden"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden", "h-full", "flex", "flex-col"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "px-2", "py-0.5", "bg-red-500/20", "text-red-400", "text-xs", "rounded-full"], [1, "text-sm", "text-cyan-400", "hover:text-cyan-300", 3, "click"], [1, "px-4", "pt-3", "pb-2", "border-b", "border-slate-700/30"], [1, "flex-1", "overflow-y-auto", "p-4"], [1, "grid", "grid-cols-1", "md:grid-cols-2", "xl:grid-cols-3", "gap-4"], [1, "flex", "items-start", "gap-3", "p-4", "bg-slate-700/50", "rounded-xl", "hover:bg-slate-700", "transition-colors", "cursor-pointer", "group", "border", "border-transparent", "hover:border-cyan-500/30", 3, "border-cyan-500/50", "bg-slate-700"], [1, "flex", "items-center", "justify-center", "gap-2", "p-6", "bg-slate-700/30", "hover:bg-slate-700/50", "border-2", "border-dashed", "border-slate-600", "rounded-xl", "text-slate-400", "hover:text-white", "transition-all", "min-h-[100px]", 3, "click"], [1, "fixed", "inset-0", "bg-black/50", "z-50", "flex", "justify-end"], [1, "flex", "items-center", "gap-2", "mb-2"], [1, "text-xs", "text-slate-400"], [1, "flex", "flex-wrap", "gap-2"], ["draggable", "true", 1, "px-3", "py-1.5", "rounded-lg", "text-sm", "cursor-grab", "active:cursor-grabbing", "transition-all", "flex", "items-center", "gap-2", 2, "border-width", "1px", 3, "bg-purple-500/20", "text-purple-400", "border-purple-500/30", "bg-slate-700/50", "text-slate-400", "border-slate-600/30"], ["draggable", "true", 1, "px-3", "py-1.5", "rounded-lg", "text-sm", "cursor-grab", "active:cursor-grabbing", "transition-all", "flex", "items-center", "gap-2", 2, "border-width", "1px"], [1, "text-xs", "opacity-70"], [1, "flex", "items-start", "gap-3", "p-4", "bg-slate-700/50", "rounded-xl", "hover:bg-slate-700", "transition-colors", "cursor-pointer", "group", "border", "border-transparent", "hover:border-cyan-500/30", 3, "click"], [1, "w-12", "h-12", "rounded-xl", "flex", "items-center", "justify-center", "font-bold", "shrink-0"], [1, "flex-1", "min-w-0"], [1, "flex", "items-center", "gap-2", "mb-1"], [1, "font-medium", "text-white", "truncate"], [1, "px-1.5", "py-0.5", "bg-red-500/20", "text-red-400", "text-xs", "rounded-full", "shrink-0"], [1, "flex", "flex-wrap", "gap-1"], [1, "px-1.5", "py-0.5", "bg-slate-600", "text-slate-300", "text-xs", "rounded"], [1, "px-1.5", "py-0.5", "bg-slate-600/50", "text-slate-400", "text-xs", "rounded"], [1, "flex", "items-center", "gap-2", "shrink-0"], [1, "relative", "inline-flex", "cursor-pointer", 3, "click"], ["type", "checkbox", 1, "sr-only", 3, "change", "checked"], [1, "w-9", "h-5", "rounded-full", "transition-all"], [1, "absolute", "w-4", "h-4", "bg-white", "rounded-full", "top-0.5", "transition-all"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-4", "h-4", "text-slate-500", "group-hover:text-cyan-400", "transition-colors"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M9 5l7 7-7 7"], [1, "fixed", "inset-0", "bg-black/50", "z-50", "flex", "justify-end", 3, "click"], [1, "w-[500px]", "bg-slate-900", "h-full", "flex", "flex-col", 3, "click"], [1, "p-4", "border-b", "border-slate-700", "flex", "items-center", "justify-between"], [1, "text-lg", "font-bold", "text-white", "flex", "items-center", "gap-2"], ["title", "\u6709\u672A\u4FDD\u5B58\u7684\u8B8A\u66F4", 1, "w-2", "h-2", "bg-orange-500", "rounded-full"], [1, "p-2", "hover:bg-slate-700", "rounded-lg", "text-slate-400", 3, "click"], [1, "flex-1", "overflow-y-auto", "p-4", "space-y-4"], [1, "block", "text-sm", "font-medium", "text-slate-300", "mb-2"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1A\u652F\u4ED8\u76F8\u95DC", 1, "w-full", "px-4", "py-2.5", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-white", "placeholder-slate-500", "focus:border-purple-500", 3, "ngModelChange", "ngModel"], [1, "w-full", "px-4", "py-2.5", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-white", "focus:border-purple-500", 3, "ngModelChange", "ngModel"], ["value", "fuzzy"], ["value", "exact"], ["value", "regex"], [1, "flex", "gap-2"], ["type", "text", "placeholder", "\u8F38\u5165\u95DC\u9375\u8A5E\uFF0C\u6309 Enter \u6DFB\u52A0", 1, "flex-1", "px-4", "py-2.5", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-white", "placeholder-slate-500", "focus:border-purple-500", 3, "ngModelChange", "keyup.enter", "ngModel"], [1, "px-4", "py-2.5", "bg-purple-500/20", "hover:bg-purple-500/30", "text-purple-400", "rounded-lg", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"], [1, "flex", "items-center", "justify-between", "mb-2"], [1, "text-sm", "font-medium", "text-slate-300"], [1, "text-xs", "text-red-400", "hover:underline"], [1, "p-6", "text-center", "text-slate-500", "bg-slate-800/30", "rounded-xl", "border", "border-dashed", "border-slate-700"], [1, "space-y-2", "max-h-64", "overflow-y-auto"], [1, "p-4", "border-t", "border-slate-700", "flex", "items-center", "gap-3"], [1, "flex-1", "px-4", "py-2.5", "bg-gradient-to-r", "from-purple-500", "to-pink-500", "hover:from-purple-600", "hover:to-pink-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "justify-center", "gap-2", 3, "click", "disabled"], [1, "px-4", "py-2.5", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors", "disabled:opacity-50", 3, "disabled"], [1, "px-4", "py-2.5", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"], [1, "text-xs", "text-red-400", "hover:underline", 3, "click"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-800/50", "rounded-lg", "border", "border-slate-700/50", "group", "hover:border-purple-500/30"], [1, "flex", "items-center", "gap-2"], [1, "text-white"], [1, "text-xs", "bg-emerald-500/20", "text-emerald-400", "px-2", "py-0.5", "rounded"], [1, "opacity-0", "group-hover:opacity-100", "p-1", "hover:bg-red-500/20", "rounded", "text-red-400", "transition-all", 3, "click"], [1, "w-4", "h-4", "border-2", "border-white/30", "border-t-white", "rounded-full", "animate-spin"], [1, "px-4", "py-2.5", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors", "disabled:opacity-50", 3, "click", "disabled"]], template: function KeywordSetsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u{1F511}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u95DC\u9375\u8A5E\u96C6\u7BA1\u7406");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "p", 6);
        \u0275\u0275text(10, "\u7BA1\u7406\u7528\u65BC\u76E3\u63A7\u5339\u914D\u7684\u95DC\u9375\u8A5E\u96C6");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 2)(12, "app-config-progress", 7);
        \u0275\u0275listener("action", function KeywordSetsComponent_Template_app_config_progress_action_12_listener($event) {
          return ctx.handleConfigAction($event);
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 8);
        \u0275\u0275listener("click", function KeywordSetsComponent_Template_button_click_13_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275elementStart(14, "span");
        \u0275\u0275text(15, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "span");
        \u0275\u0275text(17, "\u5237\u65B0");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(18, "div", 9)(19, "div", 10)(20, "div", 2)(21, "div", 11)(22, "span", 12);
        \u0275\u0275text(23, "\u{1F511}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "div")(25, "div", 13);
        \u0275\u0275text(26);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "div", 14);
        \u0275\u0275text(28, "\u8A5E\u96C6\u6578");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(29, "div", 10)(30, "div", 2)(31, "div", 15)(32, "span", 16);
        \u0275\u0275text(33, "\u{1F524}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(34, "div")(35, "div", 17);
        \u0275\u0275text(36);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "div", 14);
        \u0275\u0275text(38, "\u7E3D\u95DC\u9375\u8A5E");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(39, "div", 10)(40, "div", 2)(41, "div", 18)(42, "span", 19);
        \u0275\u0275text(43, "\u{1F525}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(44, "div")(45, "div", 20);
        \u0275\u0275text(46);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "div", 14);
        \u0275\u0275text(48, "\u7E3D\u5339\u914D");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(49, "div", 10)(50, "div", 2)(51, "div", 21)(52, "span", 22);
        \u0275\u0275text(53, "\u2713");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(54, "div")(55, "div", 23);
        \u0275\u0275text(56);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(57, "div", 14);
        \u0275\u0275text(58, "\u5DF2\u555F\u7528");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(59, "div", 24)(60, "div", 25)(61, "div", 26)(62, "h3", 27)(63, "span");
        \u0275\u0275text(64, "\u{1F511}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(65, " \u95DC\u9375\u8A5E\u96C6 ");
        \u0275\u0275elementStart(66, "span", 14);
        \u0275\u0275text(67);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(68, KeywordSetsComponent_Conditional_68_Template, 2, 1, "span", 28);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(69, "button", 29);
        \u0275\u0275listener("click", function KeywordSetsComponent_Template_button_click_69_listener() {
          return ctx.createNewSet();
        });
        \u0275\u0275text(70, " + \u65B0\u5EFA\u8A5E\u96C6 ");
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(71, KeywordSetsComponent_Conditional_71_Template, 9, 0, "div", 30);
        \u0275\u0275elementStart(72, "div", 31)(73, "div", 32);
        \u0275\u0275repeaterCreate(74, KeywordSetsComponent_For_75_Template, 19, 25, "div", 33, _forTrack03);
        \u0275\u0275elementStart(76, "button", 34);
        \u0275\u0275listener("click", function KeywordSetsComponent_Template_button_click_76_listener() {
          return ctx.createNewSet();
        });
        \u0275\u0275elementStart(77, "span", 4);
        \u0275\u0275text(78, "+");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(79, "span");
        \u0275\u0275text(80, "\u65B0\u5EFA\u8A5E\u96C6");
        \u0275\u0275elementEnd()()()()()();
        \u0275\u0275conditionalCreate(81, KeywordSetsComponent_Conditional_81_Template, 44, 13, "div", 35);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(14);
        \u0275\u0275classProp("animate-spin", ctx.stateService.isLoading());
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate(ctx.stateService.keywordSets().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.totalKeywords());
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.totalKeywordMatches());
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.activeKeywordSets().length);
        \u0275\u0275advance(11);
        \u0275\u0275textInterpolate1("(", ctx.stateService.keywordSets().length, ")");
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.stateService.totalKeywordMatches() > 0 ? 68 : -1);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.stateService.keywordSets().length > 0 ? 71 : -1);
        \u0275\u0275advance(3);
        \u0275\u0275repeater(ctx.stateService.keywordSets());
        \u0275\u0275advance(7);
        \u0275\u0275conditional(ctx.isEditing() ? 81 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, ConfigProgressComponent], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(KeywordSetsComponent, [{
    type: Component,
    args: [{
      selector: "app-keyword-sets",
      standalone: true,
      imports: [CommonModule, FormsModule, ConfigProgressComponent],
      template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">\u{1F511}</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">\u95DC\u9375\u8A5E\u96C6\u7BA1\u7406</h1>
            <p class="text-sm text-slate-400">\u7BA1\u7406\u7528\u65BC\u76E3\u63A7\u5339\u914D\u7684\u95DC\u9375\u8A5E\u96C6</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- \u914D\u7F6E\u9032\u5EA6\uFF08\u7DCA\u6E4A\u6A21\u5F0F\uFF09 -->
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">\u{1F504}</span>
            <span>\u5237\u65B0</span>
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u5361\u7247 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">\u{1F511}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.keywordSets().length }}</div>
              <div class="text-xs text-slate-500">\u8A5E\u96C6\u6578</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">\u{1F524}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stateService.totalKeywords() }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u95DC\u9375\u8A5E</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span class="text-orange-400">\u{1F525}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-400">{{ stateService.totalKeywordMatches() }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u5339\u914D</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">\u2713</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.activeKeywordSets().length }}</div>
              <div class="text-xs text-slate-500">\u5DF2\u555F\u7528</div>
            </div>
          </div>
        </div>
      </div>

      <!-- \u4E3B\u5167\u5BB9\u5340 -->
      <div class="flex-1 overflow-hidden">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden h-full flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>\u{1F511}</span> \u95DC\u9375\u8A5E\u96C6
              <span class="text-xs text-slate-500">({{ stateService.keywordSets().length }})</span>
              @if (stateService.totalKeywordMatches() > 0) {
                <span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  \u{1F525} \u7E3D\u5339\u914D {{ stateService.totalKeywordMatches() }}
                </span>
              }
            </h3>
            <button (click)="createNewSet()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + \u65B0\u5EFA\u8A5E\u96C6
            </button>
          </div>
          
          <!-- \u53EF\u62D6\u62FD\u7684\u8A5E\u96C6\u82AF\u7247\u5340 -->
          @if (stateService.keywordSets().length > 0) {
            <div class="px-4 pt-3 pb-2 border-b border-slate-700/30">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs text-slate-500">\u{1F3AF} \u62D6\u62FD\u7D81\u5B9A\uFF1A</span>
                <span class="text-xs text-slate-400">\u{1F4A1} \u62D6\u62FD\u8A5E\u96C6\u5230\u7FA4\u7D44\u53EF\u5FEB\u901F\u7D81\u5B9A</span>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (set of stateService.keywordSets(); track set.id) {
                  <div draggable="true"
                       class="px-3 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-all flex items-center gap-2"
                       [class.bg-purple-500/20]="set.isActive"
                       [class.text-purple-400]="set.isActive"
                       [class.border-purple-500/30]="set.isActive"
                       [class.bg-slate-700/50]="!set.isActive"
                       [class.text-slate-400]="!set.isActive"
                       [class.border-slate-600/30]="!set.isActive"
                       style="border-width: 1px;">
                    <span>\u{1F511}</span>
                    <span>{{ set.name }}</span>
                    <span class="text-xs opacity-70">({{ set.keywords.length }})</span>
                  </div>
                }
              </div>
            </div>
          }
          
          <!-- \u8A5E\u96C6\u5217\u8868 -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              @for (set of stateService.keywordSets(); track set.id) {
                <div (click)="selectSet(set)"
                     class="flex items-start gap-3 p-4 bg-slate-700/50 rounded-xl 
                            hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                            hover:border-cyan-500/30"
                     [class.border-cyan-500/50]="selectedSet()?.id === set.id"
                     [class.bg-slate-700]="selectedSet()?.id === set.id">
                  <!-- \u5716\u6A19 -->
                  <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0"
                       [class.bg-orange-500/20]="set.isActive"
                       [class.text-orange-400]="set.isActive"
                       [class.bg-slate-600]="!set.isActive"
                       [class.text-slate-500]="!set.isActive">
                    {{ set.name.substring(0, 3) }}
                  </div>
                  
                  <!-- \u5167\u5BB9 -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium text-white truncate">{{ set.name }}</span>
                      @if (set.totalMatches && set.totalMatches > 0) {
                        <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full shrink-0">
                          \u{1F525} {{ set.totalMatches }}
                        </span>
                      }
                    </div>
                    
                    <!-- \u95DC\u9375\u8A5E\u9810\u89BD -->
                    <div class="flex flex-wrap gap-1">
                      @for (kw of set.keywords.slice(0, 3); track kw.id) {
                        <span class="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                          {{ kw.text }}
                        </span>
                      }
                      @if (set.keywords.length > 3) {
                        <span class="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">
                          +{{ set.keywords.length - 3 }}
                        </span>
                      }
                    </div>
                  </div>
                  
                  <!-- \u958B\u95DC -->
                  <div class="flex items-center gap-2 shrink-0">
                    <label class="relative inline-flex cursor-pointer" (click)="$event.stopPropagation()">
                      <input type="checkbox" 
                             [checked]="set.isActive"
                             (change)="toggleSetActive(set)"
                             class="sr-only">
                      <div class="w-9 h-5 rounded-full transition-all"
                           [class.bg-emerald-500]="set.isActive"
                           [class.bg-slate-600]="!set.isActive">
                        <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                             [class.left-4]="set.isActive"
                             [class.left-0.5]="!set.isActive">
                        </div>
                      </div>
                    </label>
                    <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              }
              
              <!-- \u6DFB\u52A0\u6309\u9215 -->
              <button (click)="createNewSet()"
                      class="flex items-center justify-center gap-2 p-6 bg-slate-700/30 hover:bg-slate-700/50 
                             border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white 
                             transition-all min-h-[100px]">
                <span class="text-2xl">+</span>
                <span>\u65B0\u5EFA\u8A5E\u96C6</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- \u7DE8\u8F2F\u62BD\u5C5C -->
      @if (isEditing()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex justify-end" (click)="closeEditor()">
          <div class="w-[500px] bg-slate-900 h-full flex flex-col" (click)="$event.stopPropagation()">
            <!-- \u6A19\u984C -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                {{ isCreating() ? '\u65B0\u5EFA\u95DC\u9375\u8A5E\u96C6' : '\u7DE8\u8F2F\u95DC\u9375\u8A5E\u96C6' }}
                @if (hasUnsavedChanges()) {
                  <span class="w-2 h-2 bg-orange-500 rounded-full" title="\u6709\u672A\u4FDD\u5B58\u7684\u8B8A\u66F4"></span>
                }
              </h3>
              <button (click)="closeEditor()" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                \u2715
              </button>
            </div>
            
            <!-- \u5167\u5BB9 -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- \u540D\u7A31 -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">\u8A5E\u96C6\u540D\u7A31</label>
                <input type="text"
                       [(ngModel)]="editingSet.name"
                       (ngModelChange)="markAsChanged()"
                       placeholder="\u4F8B\u5982\uFF1A\u652F\u4ED8\u76F8\u95DC"
                       class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500">
              </div>
              
              <!-- \u5339\u914D\u6A21\u5F0F -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">\u5339\u914D\u6A21\u5F0F</label>
                <select [(ngModel)]="editingSet.matchMode"
                        (ngModelChange)="markAsChanged()"
                        class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500">
                  <option value="fuzzy">\u6A21\u7CCA\u5339\u914D</option>
                  <option value="exact">\u7CBE\u78BA\u5339\u914D</option>
                  <option value="regex">\u6B63\u5247\u8868\u9054\u5F0F</option>
                </select>
              </div>
              
              <!-- \u6DFB\u52A0\u95DC\u9375\u8A5E -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">\u6DFB\u52A0\u95DC\u9375\u8A5E</label>
                <div class="flex gap-2">
                  <input type="text"
                         [(ngModel)]="newKeyword"
                         (keyup.enter)="addKeyword()"
                         placeholder="\u8F38\u5165\u95DC\u9375\u8A5E\uFF0C\u6309 Enter \u6DFB\u52A0"
                         class="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500">
                  <button (click)="addKeyword()"
                          [disabled]="!newKeyword.trim()"
                          class="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50">
                    + \u6DFB\u52A0
                  </button>
                </div>
              </div>
              
              <!-- \u95DC\u9375\u8A5E\u5217\u8868 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-slate-300">
                    \u95DC\u9375\u8A5E\u5217\u8868 ({{ editingSet.keywords.length }})
                  </span>
                  @if (editingSet.keywords.length > 0) {
                    <button (click)="clearAllKeywords()"
                            class="text-xs text-red-400 hover:underline">
                      \u6E05\u7A7A\u5168\u90E8
                    </button>
                  }
                </div>
                
                @if (editingSet.keywords.length === 0) {
                  <div class="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                    <p>\u9084\u6C92\u6709\u95DC\u9375\u8A5E</p>
                  </div>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (keyword of editingSet.keywords; track keyword.id) {
                      <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group hover:border-purple-500/30">
                        <div class="flex items-center gap-2">
                          <span class="text-white">{{ keyword.text }}</span>
                          @if (keyword.isNew) {
                            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">\u65B0</span>
                          }
                        </div>
                        <button (click)="removeKeyword(keyword)"
                                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all">
                          \u2715
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            
            <!-- \u5E95\u90E8\u6309\u9215 -->
            <div class="p-4 border-t border-slate-700 flex items-center gap-3">
              <button (click)="saveSet()"
                      [disabled]="isSaving()"
                      class="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                @if (isSaving()) {
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>\u4FDD\u5B58\u4E2D...</span>
                } @else {
                  <span>{{ isCreating() ? '\u5275\u5EFA' : '\u4FDD\u5B58' }}</span>
                }
              </button>
              @if (!isCreating()) {
                <button (click)="deleteSet()"
                        [disabled]="isSaving()"
                        class="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50">
                  \u522A\u9664
                </button>
              }
              <button (click)="closeEditor()"
                      [disabled]="isSaving()"
                      class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50">
                \u53D6\u6D88
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
    }]
  }], null, { configAction: [{ type: Output, args: ["configAction"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(KeywordSetsComponent, { className: "KeywordSetsComponent", filePath: "src/monitoring/keyword-sets.component.ts", lineNumber: 350 });
})();

// src/monitoring/trigger-rules.component.ts
var _c0 = () => [1, 2, 3, 4];
var _forTrack04 = ($index, $item) => $item.id;
function TriggerRulesComponent_Conditional_64_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25)(1, "div", 39)(2, "span", 4);
    \u0275\u0275text(3, "\u{1F916}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 40)(5, "p", 41);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p", 42);
    \u0275\u0275text(8, " \u672A\u5339\u914D\u7279\u5B9A\u898F\u5247\u7684\u95DC\u9375\u8A5E\u5C07\u4F7F\u7528 AI \u81EA\u52D5\u56DE\u8986\u3002 \u5982\u9700\u91DD\u5C0D\u7279\u5B9A\u95DC\u9375\u8A5E\u4F7F\u7528\u4E0D\u540C\u97FF\u61C9\u65B9\u5F0F\uFF0C\u8ACB\u5275\u5EFA\u89F8\u767C\u898F\u5247\u3002 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate1("AI \u81EA\u52D5\u804A\u5929\u5DF2\u555F\u7528\uFF08", ctx_r0.aiChatMode() === "full" ? "\u5168\u81EA\u52D5" : "\u534A\u81EA\u52D5", "\u6A21\u5F0F\uFF09");
  }
}
function TriggerRulesComponent_Conditional_83_For_2_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 49);
    \u0275\u0275text(1, "\u6D3B\u8E8D");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_83_For_2_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 50);
    \u0275\u0275text(1, "\u5DF2\u505C\u7528");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_83_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 44)(1, "div", 45)(2, "div", 2)(3, "div", 46)(4, "span", 47);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div")(7, "div", 30)(8, "span", 48);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, TriggerRulesComponent_Conditional_83_For_2_Conditional_10_Template, 2, 0, "span", 49)(11, TriggerRulesComponent_Conditional_83_For_2_Conditional_11_Template, 2, 0, "span", 50);
    \u0275\u0275elementStart(12, "span", 51);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "p", 52);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "div", 30)(17, "button", 53);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_83_For_2_Template_button_click_17_listener() {
      const rule_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.openTestDialog(rule_r3));
    });
    \u0275\u0275text(18, " \u{1F9EA} \u6E2C\u8A66 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "button", 54);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_83_For_2_Template_button_click_19_listener() {
      const rule_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.editRule(rule_r3));
    });
    \u0275\u0275text(20, " \u7DE8\u8F2F ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "button", 55);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_83_For_2_Template_button_click_21_listener() {
      const rule_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.toggleRule(rule_r3));
    });
    \u0275\u0275text(22);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "button", 56);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_83_For_2_Template_button_click_23_listener() {
      const rule_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.deleteRule(rule_r3));
    });
    \u0275\u0275text(24, " \u522A\u9664 ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(25, "div", 57)(26, "div", 58)(27, "div", 59)(28, "div", 60);
    \u0275\u0275text(29, "\u76E3\u63A7\u4F86\u6E90");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(30, "div", 61);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(32, "div", 62);
    \u0275\u0275text(33, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 59)(35, "div", 60);
    \u0275\u0275text(36, "\u95DC\u9375\u8A5E\u96C6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "div", 61);
    \u0275\u0275text(38);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(39, "div", 62);
    \u0275\u0275text(40, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(41, "div", 59)(42, "div", 60);
    \u0275\u0275text(43, "\u97FF\u61C9\u65B9\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(44, "div", 61);
    \u0275\u0275text(45);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(46, "div", 63)(47, "div", 64)(48, "span");
    \u0275\u0275text(49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(50, "span");
    \u0275\u0275text(51);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(52, "span");
    \u0275\u0275text(53);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "span");
    \u0275\u0275text(55);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const rule_r3 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("border-slate-600/50", rule_r3.isActive)("border-slate-700/50", !rule_r3.isActive)("opacity-60", !rule_r3.isActive);
    \u0275\u0275advance(3);
    \u0275\u0275classProp("bg-emerald-500/20", rule_r3.isActive)("bg-slate-600/50", !rule_r3.isActive);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.getResponseIcon(rule_r3.responseType));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(rule_r3.name);
    \u0275\u0275advance();
    \u0275\u0275conditional(rule_r3.isActive ? 10 : 11);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-red-500/20", rule_r3.priority === 3)("text-red-400", rule_r3.priority === 3)("bg-amber-500/20", rule_r3.priority === 2)("text-amber-400", rule_r3.priority === 2)("bg-slate-500/20", rule_r3.priority === 1)("text-slate-400", rule_r3.priority === 1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.getPriorityLabel(rule_r3.priority), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(rule_r3.description || "\u7121\u63CF\u8FF0");
    \u0275\u0275advance(6);
    \u0275\u0275classProp("bg-amber-500/20", rule_r3.isActive)("text-amber-400", rule_r3.isActive)("hover:bg-amber-500/30", rule_r3.isActive)("bg-emerald-500/20", !rule_r3.isActive)("text-emerald-400", !rule_r3.isActive)("hover:bg-emerald-500/30", !rule_r3.isActive);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", rule_r3.isActive ? "\u66AB\u505C" : "\u555F\u7528", " ");
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1(" ", rule_r3.sourceType === "all" ? "\u5168\u90E8\u7FA4\u7D44" : rule_r3.sourceGroupIds.length + " \u500B\u7FA4\u7D44", " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" ", ctx_r0.getKeywordSetNames(rule_r3.keywordSetIds), " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" ", ctx_r0.getResponseDetail(rule_r3), " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("\u89F8\u767C: ", rule_r3.triggerCount || 0, " \u6B21");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u6210\u529F: ", rule_r3.successCount || 0, " \u6B21");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u6210\u529F\u7387: ", ctx_r0.getSuccessRate(rule_r3), "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(rule_r3.lastTriggered ? "\u6700\u8FD1: " + ctx_r0.formatTime(rule_r3.lastTriggered) : "\u5C1A\u672A\u89F8\u767C");
  }
}
function TriggerRulesComponent_Conditional_83_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275repeaterCreate(1, TriggerRulesComponent_Conditional_83_For_2_Template, 56, 47, "div", 43, _forTrack04);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.filteredRules());
  }
}
function TriggerRulesComponent_Conditional_84_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 69);
    \u0275\u0275text(1, " \u{1F4A1} AI \u81EA\u52D5\u804A\u5929\u5DF2\u958B\u555F\uFF0C\u5C07\u4F5C\u70BA\u9ED8\u8A8D\u97FF\u61C9\u65B9\u5F0F ");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_84_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 37)(1, "div", 65)(2, "span", 66);
    \u0275\u0275text(3, "\u26A1");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(4, "h3", 67);
    \u0275\u0275text(5, "\u9084\u6C92\u6709\u89F8\u767C\u898F\u5247");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "p", 68);
    \u0275\u0275text(7, " \u89F8\u767C\u898F\u5247\u5B9A\u7FA9\u4E86\u7576\u95DC\u9375\u8A5E\u5339\u914D\u5F8C\u7CFB\u7D71\u7684\u97FF\u61C9\u65B9\u5F0F\u3002");
    \u0275\u0275element(8, "br");
    \u0275\u0275text(9, " \u60A8\u53EF\u4EE5\u70BA\u4E0D\u540C\u7684\u95DC\u9375\u8A5E\u8A2D\u7F6E\u4E0D\u540C\u7684\u97FF\u61C9\u52D5\u4F5C\u3002 ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, TriggerRulesComponent_Conditional_84_Conditional_10_Template, 2, 0, "p", 69);
    \u0275\u0275elementStart(11, "button", 70);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_84_Template_button_click_11_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.openCreateWizard());
    });
    \u0275\u0275elementStart(12, "span");
    \u0275\u0275text(13, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(14, " \u5275\u5EFA\u7B2C\u4E00\u500B\u898F\u5247 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275conditional(ctx_r0.aiChatEnabled() ? 10 : -1);
  }
}
function TriggerRulesComponent_Conditional_85_For_14_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "div", 91);
  }
  if (rf & 2) {
    const step_r6 = \u0275\u0275nextContext().$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-amber-500", ctx_r0.wizardStep() > step_r6)("bg-slate-700", ctx_r0.wizardStep() <= step_r6);
  }
}
function TriggerRulesComponent_Conditional_85_For_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 81)(1, "div", 89);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(3, TriggerRulesComponent_Conditional_85_For_14_Conditional_3_Template, 1, 4, "div", 90);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const step_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-amber-500", ctx_r0.wizardStep() >= step_r6)("text-white", ctx_r0.wizardStep() >= step_r6)("bg-slate-700", ctx_r0.wizardStep() < step_r6)("text-slate-400", ctx_r0.wizardStep() < step_r6);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", step_r6, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(step_r6 < 4 ? 3 : -1);
  }
}
function TriggerRulesComponent_Conditional_85_Case_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36)(1, "div")(2, "label", 92);
    \u0275\u0275text(3, "\u898F\u5247\u540D\u7A31 *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "input", 93);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_16_Template_input_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.name, $event) || (ctx_r0.formData.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div")(6, "label", 92);
    \u0275\u0275text(7, "\u898F\u5247\u63CF\u8FF0");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "textarea", 94);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_16_Template_textarea_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.description, $event) || (ctx_r0.formData.description = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div")(10, "label", 92);
    \u0275\u0275text(11, "\u512A\u5148\u7D1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 85)(13, "button", 95);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_16_Template_button_click_13_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.priority = 3);
    });
    \u0275\u0275text(14, " \u9AD8\u512A\u5148 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "button", 95);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_16_Template_button_click_15_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.priority = 2);
    });
    \u0275\u0275text(16, " \u4E2D\u512A\u5148 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "button", 95);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_16_Template_button_click_17_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.priority = 1);
    });
    \u0275\u0275text(18, " \u4F4E\u512A\u5148 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.name);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.description);
    \u0275\u0275advance(5);
    \u0275\u0275classProp("bg-red-500/20", ctx_r0.formData.priority === 3)("border-red-500/50", ctx_r0.formData.priority === 3)("text-red-400", ctx_r0.formData.priority === 3)("bg-slate-700", ctx_r0.formData.priority !== 3)("border-slate-600", ctx_r0.formData.priority !== 3)("text-slate-300", ctx_r0.formData.priority !== 3);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-amber-500/20", ctx_r0.formData.priority === 2)("border-amber-500/50", ctx_r0.formData.priority === 2)("text-amber-400", ctx_r0.formData.priority === 2)("bg-slate-700", ctx_r0.formData.priority !== 2)("border-slate-600", ctx_r0.formData.priority !== 2)("text-slate-300", ctx_r0.formData.priority !== 2);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-slate-500/20", ctx_r0.formData.priority === 1)("border-slate-500/50", ctx_r0.formData.priority === 1)("text-slate-400", ctx_r0.formData.priority === 1)("bg-slate-700", ctx_r0.formData.priority !== 1)("border-slate-600", ctx_r0.formData.priority !== 1)("text-slate-300", ctx_r0.formData.priority !== 1);
  }
}
function TriggerRulesComponent_Conditional_85_Case_17_Conditional_13_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 103)(1, "input", 107);
    \u0275\u0275listener("change", function TriggerRulesComponent_Conditional_85_Case_17_Conditional_13_For_2_Template_input_change_1_listener() {
      const group_r10 = \u0275\u0275restoreView(_r9).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(4);
      return \u0275\u0275resetView(ctx_r0.toggleGroupSelection(group_r10.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 106);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const group_r10 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r0.isGroupSelected(group_r10.id));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(group_r10.name);
  }
}
function TriggerRulesComponent_Conditional_85_Case_17_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 101);
    \u0275\u0275repeaterCreate(1, TriggerRulesComponent_Conditional_85_Case_17_Conditional_13_For_2_Template, 4, 2, "label", 103, _forTrack04);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.stateService.groups());
  }
}
function TriggerRulesComponent_Conditional_85_Case_17_For_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "label", 103)(1, "input", 107);
    \u0275\u0275listener("change", function TriggerRulesComponent_Conditional_85_Case_17_For_19_Template_input_change_1_listener() {
      const set_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.toggleKeywordSetSelection(set_r12.id));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span", 106);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 108);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const set_r12 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275property("checked", ctx_r0.isKeywordSetSelected(set_r12.id));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(set_r12.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("(", (set_r12.keywords == null ? null : set_r12.keywords.length) || 0, " \u500B\u95DC\u9375\u8A5E)");
  }
}
function TriggerRulesComponent_Conditional_85_Case_17_Conditional_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "p", 104);
    \u0275\u0275text(1, " \u66AB\u7121\u95DC\u9375\u8A5E\u96C6\uFF0C\u8ACB\u5148\u5275\u5EFA ");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_85_Case_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36)(1, "div")(2, "label", 92);
    \u0275\u0275text(3, "\u76E3\u63A7\u4F86\u6E90");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 96)(5, "label", 97)(6, "input", 98);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_17_Template_input_ngModelChange_6_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.sourceType, $event) || (ctx_r0.formData.sourceType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 99);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "label", 97)(10, "input", 100);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_17_Template_input_ngModelChange_10_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.sourceType, $event) || (ctx_r0.formData.sourceType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "span", 99);
    \u0275\u0275text(12, "\u6307\u5B9A\u7FA4\u7D44");
    \u0275\u0275elementEnd()()();
    \u0275\u0275conditionalCreate(13, TriggerRulesComponent_Conditional_85_Case_17_Conditional_13_Template, 3, 0, "div", 101);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div")(15, "label", 92);
    \u0275\u0275text(16, "\u95DC\u9375\u8A5E\u96C6 *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "div", 102);
    \u0275\u0275repeaterCreate(18, TriggerRulesComponent_Conditional_85_Case_17_For_19_Template, 6, 3, "label", 103, _forTrack04);
    \u0275\u0275conditionalCreate(20, TriggerRulesComponent_Conditional_85_Case_17_Conditional_20_Template, 2, 0, "p", 104);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div")(22, "label", 92);
    \u0275\u0275text(23, "\u9644\u52A0\u689D\u4EF6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "div", 96)(25, "label", 97)(26, "input", 105);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_17_Template_input_ngModelChange_26_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.conditions.oncePerUser, $event) || (ctx_r0.formData.conditions.oncePerUser = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "span", 106);
    \u0275\u0275text(28, "\u6BCF\u7528\u6236\u53EA\u89F8\u767C\u4E00\u6B21");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "label", 97)(30, "input", 105);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_17_Template_input_ngModelChange_30_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.conditions.excludeAdmin, $event) || (ctx_r0.formData.conditions.excludeAdmin = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span", 106);
    \u0275\u0275text(32, "\u6392\u9664\u7FA4\u7BA1\u7406\u54E1");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.sourceType);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u5168\u90E8\u76E3\u63A7\u7FA4\u7D44\uFF08", ctx_r0.stateService.groups().length, " \u500B\uFF09");
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.sourceType);
    \u0275\u0275advance(3);
    \u0275\u0275conditional(ctx_r0.formData.sourceType === "specific" ? 13 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275repeater(ctx_r0.stateService.keywordSets());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.stateService.keywordSets().length === 0 ? 20 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.conditions.oncePerUser);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.conditions.excludeAdmin);
  }
}
function TriggerRulesComponent_Conditional_85_Case_18_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 111)(1, "button", 113);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Conditional_13_Template_button_click_1_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r0 = \u0275\u0275nextContext(3);
      ctx_r0.formData.responseConfig.aiMode = "full";
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(2, " \u5168\u81EA\u52D5 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 113);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Conditional_13_Template_button_click_3_listener($event) {
      \u0275\u0275restoreView(_r14);
      const ctx_r0 = \u0275\u0275nextContext(3);
      ctx_r0.formData.responseConfig.aiMode = "semi";
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275text(4, " \u534A\u81EA\u52D5\uFF08\u9700\u78BA\u8A8D\uFF09 ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-emerald-500/20", ctx_r0.formData.responseConfig.aiMode === "full")("text-emerald-400", ctx_r0.formData.responseConfig.aiMode === "full")("bg-slate-600", ctx_r0.formData.responseConfig.aiMode !== "full")("text-slate-300", ctx_r0.formData.responseConfig.aiMode !== "full");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-amber-500/20", ctx_r0.formData.responseConfig.aiMode === "semi")("text-amber-400", ctx_r0.formData.responseConfig.aiMode === "semi")("bg-slate-600", ctx_r0.formData.responseConfig.aiMode !== "semi")("text-slate-300", ctx_r0.formData.responseConfig.aiMode !== "semi");
  }
}
function TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 115);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const template_r16 = ctx.$implicit;
    \u0275\u0275property("ngValue", template_r16.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(template_r16.name);
  }
}
function TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 112)(1, "select", 114);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_Template_select_ngModelChange_1_listener($event) {
      \u0275\u0275restoreView(_r15);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.responseConfig.templateId, $event) || (ctx_r0.formData.responseConfig.templateId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_Template_select_click_1_listener($event) {
      \u0275\u0275restoreView(_r15);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "option", 115);
    \u0275\u0275text(3, "\u9078\u64C7\u6A21\u677F...");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(4, TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_For_5_Template, 2, 2, "option", 115, _forTrack04);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.responseConfig.templateId);
    \u0275\u0275advance();
    \u0275\u0275property("ngValue", void 0);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.stateService.chatTemplates());
  }
}
function TriggerRulesComponent_Conditional_85_Case_18_Template(rf, ctx) {
  if (rf & 1) {
    const _r13 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36)(1, "label", 92);
    \u0275\u0275text(2, "\u97FF\u61C9\u65B9\u5F0F *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 109)(4, "div", 110);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Template_div_click_4_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.responseType = "ai_chat");
    });
    \u0275\u0275elementStart(5, "div", 39)(6, "span", 4);
    \u0275\u0275text(7, "\u{1F916}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 40)(9, "div", 48);
    \u0275\u0275text(10, "AI \u667A\u80FD\u5C0D\u8A71");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "p", 75);
    \u0275\u0275text(12, "\u8B93 AI \u6839\u64DA\u4E0A\u4E0B\u6587\u667A\u80FD\u56DE\u8986\uFF0C\u66F4\u81EA\u7136\u66F4\u500B\u6027\u5316");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(13, TriggerRulesComponent_Conditional_85_Case_18_Conditional_13_Template, 5, 16, "div", 111);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "div", 110);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Template_div_click_14_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.responseType = "template");
    });
    \u0275\u0275elementStart(15, "div", 39)(16, "span", 4);
    \u0275\u0275text(17, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "div", 40)(19, "div", 48);
    \u0275\u0275text(20, "\u4F7F\u7528\u56FA\u5B9A\u6A21\u677F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "p", 75);
    \u0275\u0275text(22, "\u767C\u9001\u9810\u8A2D\u7684\u804A\u5929\u6A21\u677F\uFF0C\u6548\u679C\u7A69\u5B9A\u53EF\u63A7");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(23, TriggerRulesComponent_Conditional_85_Case_18_Conditional_23_Template, 6, 2, "div", 112);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(24, "div", 110);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Case_18_Template_div_click_24_listener() {
      \u0275\u0275restoreView(_r13);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.formData.responseType = "record_only");
    });
    \u0275\u0275elementStart(25, "div", 39)(26, "span", 4);
    \u0275\u0275text(27, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 40)(29, "div", 48);
    \u0275\u0275text(30, "\u50C5\u8A18\u9304");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "p", 75);
    \u0275\u0275text(32, "\u53EA\u5C07\u7528\u6236\u52A0\u5165 Lead \u5EAB\uFF0C\u4E0D\u81EA\u52D5\u767C\u9001\u4EFB\u4F55\u6D88\u606F");
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275classProp("bg-amber-500/10", ctx_r0.formData.responseType === "ai_chat")("border-amber-500/50", ctx_r0.formData.responseType === "ai_chat")("bg-slate-700", ctx_r0.formData.responseType !== "ai_chat")("border-slate-600", ctx_r0.formData.responseType !== "ai_chat");
    \u0275\u0275advance(9);
    \u0275\u0275conditional(ctx_r0.formData.responseType === "ai_chat" ? 13 : -1);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-amber-500/10", ctx_r0.formData.responseType === "template")("border-amber-500/50", ctx_r0.formData.responseType === "template")("bg-slate-700", ctx_r0.formData.responseType !== "template")("border-slate-600", ctx_r0.formData.responseType !== "template");
    \u0275\u0275advance(9);
    \u0275\u0275conditional(ctx_r0.formData.responseType === "template" ? 23 : -1);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-amber-500/10", ctx_r0.formData.responseType === "record_only")("border-amber-500/50", ctx_r0.formData.responseType === "record_only")("bg-slate-700", ctx_r0.formData.responseType !== "record_only")("border-slate-600", ctx_r0.formData.responseType !== "record_only");
  }
}
function TriggerRulesComponent_Conditional_85_Case_19_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r18 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div")(1, "h4", 117);
    \u0275\u0275text(2, "\u2699\uFE0F \u767C\u9001\u8A2D\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 109)(4, "div")(5, "label", 121);
    \u0275\u0275text(6, "\u767C\u9001\u5EF6\u9072\uFF08\u79D2\uFF09");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 2)(8, "input", 122);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_19_Conditional_24_Template_input_ngModelChange_8_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.delayMin, $event) || (ctx_r0.formData.delayMin = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 123);
    \u0275\u0275text(10, "-");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 124);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_19_Conditional_24_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.delayMax, $event) || (ctx_r0.formData.delayMax = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "span", 125);
    \u0275\u0275text(13, "\u79D2");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(14, "div")(15, "label", 121);
    \u0275\u0275text(16, "\u6BCF\u5E33\u865F\u6BCF\u65E5\u9650\u5236");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 126);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_19_Conditional_24_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r18);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.dailyLimit, $event) || (ctx_r0.formData.dailyLimit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "span", 127);
    \u0275\u0275text(19, "\u689D\u6D88\u606F");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.delayMin);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.delayMax);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.dailyLimit);
  }
}
function TriggerRulesComponent_Conditional_85_Case_19_Template(rf, ctx) {
  if (rf & 1) {
    const _r17 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 36)(1, "div", 116)(2, "h4", 117);
    \u0275\u0275text(3, "\u{1F4CB} \u898F\u5247\u6458\u8981");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 118)(5, "div", 119)(6, "div", 15);
    \u0275\u0275text(7, "\u76E3\u63A7\u4F86\u6E90");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 120);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 62);
    \u0275\u0275text(11, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "div", 119)(13, "div", 15);
    \u0275\u0275text(14, "\u95DC\u9375\u8A5E\u96C6");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "div", 120);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(17, "div", 62);
    \u0275\u0275text(18, "\u2192");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 119)(20, "div", 15);
    \u0275\u0275text(21, "\u97FF\u61C9\u65B9\u5F0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 120);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275conditionalCreate(24, TriggerRulesComponent_Conditional_85_Case_19_Conditional_24_Template, 20, 3, "div");
    \u0275\u0275elementStart(25, "div")(26, "h4", 117);
    \u0275\u0275text(27, "\u{1F4CC} \u9644\u52A0\u52D5\u4F5C");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(28, "div", 96)(29, "label", 97)(30, "input", 105);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_19_Template_input_ngModelChange_30_listener($event) {
      \u0275\u0275restoreView(_r17);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.autoAddLead, $event) || (ctx_r0.formData.autoAddLead = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "span", 106);
    \u0275\u0275text(32, "\u81EA\u52D5\u52A0\u5165 Lead \u5EAB");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(33, "label", 97)(34, "input", 105);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_85_Case_19_Template_input_ngModelChange_34_listener($event) {
      \u0275\u0275restoreView(_r17);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.formData.notifyMe, $event) || (ctx_r0.formData.notifyMe = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "span", 106);
    \u0275\u0275text(36, "\u767C\u9001\u901A\u77E5\u7D66\u6211");
    \u0275\u0275elementEnd()()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1(" ", ctx_r0.formData.sourceType === "all" ? "\u5168\u90E8\u7FA4\u7D44" : ctx_r0.formData.sourceGroupIds.length + " \u500B\u7FA4\u7D44", " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("", ctx_r0.formData.keywordSetIds.length, " \u500B\u8A5E\u96C6");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r0.getResponseLabel(ctx_r0.formData.responseType));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.formData.responseType !== "record_only" ? 24 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.autoAddLead);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.formData.notifyMe);
  }
}
function TriggerRulesComponent_Conditional_85_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 128);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Conditional_26_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.nextStep());
    });
    \u0275\u0275text(1, " \u4E0B\u4E00\u6B65 \u2192 ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r0.canProceed());
  }
}
function TriggerRulesComponent_Conditional_85_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r20 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 129);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Conditional_27_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r20);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.saveRule());
    });
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275property("disabled", !ctx_r0.canSave());
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" ", ctx_r0.editingRule() ? "\u4FDD\u5B58\u4FEE\u6539" : "\u7ACB\u5373\u555F\u7528", " ");
  }
}
function TriggerRulesComponent_Conditional_85_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeWizard());
    });
    \u0275\u0275elementStart(1, "div", 72);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r5);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 73)(3, "div")(4, "h2", 74);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "p", 75);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(8, "button", 76);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Template_button_click_8_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeWizard());
    });
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(9, "svg", 77);
    \u0275\u0275element(10, "path", 78);
    \u0275\u0275elementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(11, "div", 79)(12, "div", 80);
    \u0275\u0275repeaterCreate(13, TriggerRulesComponent_Conditional_85_For_14_Template, 4, 10, "div", 81, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "div", 82);
    \u0275\u0275conditionalCreate(16, TriggerRulesComponent_Conditional_85_Case_16_Template, 19, 38, "div", 36)(17, TriggerRulesComponent_Conditional_85_Case_17_Template, 33, 7, "div", 36)(18, TriggerRulesComponent_Conditional_85_Case_18_Template, 33, 26, "div", 36)(19, TriggerRulesComponent_Conditional_85_Case_19_Template, 37, 6, "div", 36);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(20, "div", 83)(21, "button", 84);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Template_button_click_21_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.prevStep());
    });
    \u0275\u0275text(22, " \u2190 \u4E0A\u4E00\u6B65 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(23, "div", 85)(24, "button", 86);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_85_Template_button_click_24_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeWizard());
    });
    \u0275\u0275text(25, " \u53D6\u6D88 ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(26, TriggerRulesComponent_Conditional_85_Conditional_26_Template, 2, 1, "button", 87)(27, TriggerRulesComponent_Conditional_85_Conditional_27_Template, 4, 2, "button", 88);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_4_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.editingRule() ? "\u7DE8\u8F2F\u898F\u5247" : "\u5275\u5EFA\u89F8\u767C\u898F\u5247");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("Step ", ctx_r0.wizardStep(), "/4: ", ctx_r0.getStepTitle());
    \u0275\u0275advance(6);
    \u0275\u0275repeater(\u0275\u0275pureFunction0(6, _c0));
    \u0275\u0275advance(3);
    \u0275\u0275conditional((tmp_4_0 = ctx_r0.wizardStep()) === 1 ? 16 : tmp_4_0 === 2 ? 17 : tmp_4_0 === 3 ? 18 : tmp_4_0 === 4 ? 19 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275property("disabled", ctx_r0.wizardStep() === 1);
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r0.wizardStep() < 4 ? 26 : 27);
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 140)(1, "span", 17);
    \u0275\u0275text(2, "\u2713");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "span", 41);
    \u0275\u0275text(4, "\u95DC\u9375\u8A5E\u5339\u914D\u6210\u529F");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 141)(1, "span", 142);
    \u0275\u0275text(2, "\u2717");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "span", 143);
    \u0275\u0275text(4, "\u672A\u5339\u914D\u4EFB\u4F55\u95DC\u9375\u8A5E");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 17);
    \u0275\u0275text(1, "\u5168\u90E8\u6EFF\u8DB3 \u2713");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 13);
    \u0275\u0275text(1, "\u90E8\u5206\u689D\u4EF6\u53EF\u80FD\u4E0D\u6EFF\u8DB3");
    \u0275\u0275elementEnd();
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 146)(1, "div", 60);
    \u0275\u0275text(2, "\u97FF\u61C9\u9810\u89BD");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 147);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(4);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.testResult().responsePreview);
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 144)(1, "span", 145);
    \u0275\u0275text(2, "\u5339\u914D\u7684\u95DC\u9375\u8A5E\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 13);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 144)(6, "span", 145);
    \u0275\u0275text(7, "\u984D\u5916\u689D\u4EF6\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(8, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_8_Template, 2, 0, "span", 17)(9, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_9_Template, 2, 0, "span", 13);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(10, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Conditional_10_Template, 5, 1, "div", 146);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.testResult().matchedKeywords.join(", "));
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r0.testResult().conditionsMet ? 8 : 9);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.testResult().responsePreview ? 10 : -1);
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 137)(1, "div", 30);
    \u0275\u0275conditionalCreate(2, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_2_Template, 5, 0)(3, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_3_Template, 5, 0);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, TriggerRulesComponent_Conditional_86_Conditional_18_Conditional_4_Template, 11, 3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.testResult().matched ? 2 : 3);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.testResult().matched ? 4 : -1);
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 148);
    \u0275\u0275text(1, "\u23F3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u6E2C\u8A66\u4E2D... ");
  }
}
function TriggerRulesComponent_Conditional_86_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1, "\u{1F680}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(2, " \u57F7\u884C\u6E2C\u8A66 ");
  }
}
function TriggerRulesComponent_Conditional_86_Template(rf, ctx) {
  if (rf & 1) {
    const _r21 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 71);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_86_Template_div_click_0_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeTestDialog());
    });
    \u0275\u0275elementStart(1, "div", 130);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_86_Template_div_click_1_listener($event) {
      \u0275\u0275restoreView(_r21);
      return \u0275\u0275resetView($event.stopPropagation());
    });
    \u0275\u0275elementStart(2, "div", 131)(3, "div", 2)(4, "div", 132)(5, "span", 133);
    \u0275\u0275text(6, "\u{1F9EA}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div")(8, "h3", 134);
    \u0275\u0275text(9, "\u6E2C\u8A66\u898F\u5247");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "p", 6);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(12, "div", 135)(13, "div")(14, "label", 92);
    \u0275\u0275text(15, "\u6A21\u64EC\u6D88\u606F\u5167\u5BB9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "textarea", 136);
    \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Conditional_86_Template_textarea_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r21);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.testMessage, $event) || (ctx_r0.testMessage = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275text(17, "              ");
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(18, TriggerRulesComponent_Conditional_86_Conditional_18_Template, 5, 2, "div", 137);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 138)(20, "button", 86);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_86_Template_button_click_20_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.closeTestDialog());
    });
    \u0275\u0275text(21, " \u95DC\u9589 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 139);
    \u0275\u0275listener("click", function TriggerRulesComponent_Conditional_86_Template_button_click_22_listener() {
      \u0275\u0275restoreView(_r21);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.runTest());
    });
    \u0275\u0275conditionalCreate(23, TriggerRulesComponent_Conditional_86_Conditional_23_Template, 3, 0)(24, TriggerRulesComponent_Conditional_86_Conditional_24_Template, 3, 0);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(11);
    \u0275\u0275textInterpolate((tmp_1_0 = ctx_r0.testingRule()) == null ? null : tmp_1_0.name);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.testMessage);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.testResult() ? 18 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275property("disabled", !ctx_r0.testMessage.trim() || ctx_r0.isTestingRule());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isTestingRule() ? 23 : 24);
  }
}
var TriggerRulesComponent = class _TriggerRulesComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.confirmService = inject(ConfirmDialogService);
    this.rules = signal([], ...ngDevMode ? [{ debugName: "rules" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.filterStatus = "all";
    this.stateEffect = effect(() => {
      const stateRules = this.stateService.triggerRules();
      if (stateRules.length > 0 && this.rules().length === 0) {
        console.log("[TriggerRules] Syncing from StateService:", stateRules.length, "rules");
        this.rules.set(stateRules);
        this.isLoading.set(false);
      }
    }, ...ngDevMode ? [{ debugName: "stateEffect" }] : []);
    this.showWizard = signal(false, ...ngDevMode ? [{ debugName: "showWizard" }] : []);
    this.wizardStep = signal(1, ...ngDevMode ? [{ debugName: "wizardStep" }] : []);
    this.editingRule = signal(null, ...ngDevMode ? [{ debugName: "editingRule" }] : []);
    this.formData = this.getEmptyFormData();
    this.aiChatEnabled = signal(false, ...ngDevMode ? [{ debugName: "aiChatEnabled" }] : []);
    this.aiChatMode = signal("semi", ...ngDevMode ? [{ debugName: "aiChatMode" }] : []);
    this.showTestDialog = signal(false, ...ngDevMode ? [{ debugName: "showTestDialog" }] : []);
    this.testingRule = signal(null, ...ngDevMode ? [{ debugName: "testingRule" }] : []);
    this.testMessage = "";
    this.testResult = signal(null, ...ngDevMode ? [{ debugName: "testResult" }] : []);
    this.isTestingRule = signal(false, ...ngDevMode ? [{ debugName: "isTestingRule" }] : []);
    this.activeRules = computed(() => this.rules().filter((r) => r.isActive), ...ngDevMode ? [{ debugName: "activeRules" }] : []);
    this.totalTriggerCount = computed(() => this.rules().reduce((sum, r) => sum + (r.triggerCount || 0), 0), ...ngDevMode ? [{ debugName: "totalTriggerCount" }] : []);
    this.averageSuccessRate = computed(() => {
      const rules = this.rules().filter((r) => (r.triggerCount || 0) > 0);
      if (rules.length === 0)
        return 0;
      const total = rules.reduce((sum, r) => {
        const rate = r.triggerCount ? (r.successCount || 0) / r.triggerCount * 100 : 0;
        return sum + rate;
      }, 0);
      return Math.round(total / rules.length);
    }, ...ngDevMode ? [{ debugName: "averageSuccessRate" }] : []);
    this.filteredRules = computed(() => {
      const all = this.rules();
      if (this.filterStatus === "active")
        return all.filter((r) => r.isActive);
      if (this.filterStatus === "inactive")
        return all.filter((r) => !r.isActive);
      return all;
    }, ...ngDevMode ? [{ debugName: "filteredRules" }] : []);
    this.listeners = [];
    this.retryCount = 0;
    this.MAX_RETRIES = 3;
  }
  ngOnInit() {
    this.setupListeners();
    const stateRules = this.stateService.triggerRules();
    if (stateRules.length > 0) {
      console.log("[TriggerRules] Using existing StateService data:", stateRules.length, "rules");
      this.rules.set(stateRules);
    } else {
      this.stateService.loadAll();
    }
    this.loadRules();
    this.loadAISettings();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("trigger-rules-result", (data) => {
      console.log("[TriggerRules] Received trigger-rules-result:", data);
      this.isLoading.set(false);
      this.retryCount = 0;
      if (data.success) {
        this.rules.set(data.rules || []);
      } else if (data.error) {
        console.error("[TriggerRules] Error loading rules:", data.error);
        this.toastService.error("\u52A0\u8F09\u898F\u5247\u5931\u6557: " + data.error);
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("save-trigger-rule-result", (data) => {
      console.log("[TriggerRules] Received save-trigger-rule-result:", data);
      if (data.success) {
        this.toastService.success(data.message || "\u898F\u5247\u5DF2\u4FDD\u5B58");
        this.closeWizard();
      } else {
        this.toastService.error(data.error || "\u4FDD\u5B58\u5931\u6557");
      }
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("delete-trigger-rule-result", (data) => {
      if (data.success) {
        this.toastService.success("\u898F\u5247\u5DF2\u522A\u9664");
      }
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("toggle-trigger-rule-result", (data) => {
      if (data.success) {
      }
    });
    this.listeners.push(cleanup4);
    const cleanup5 = this.ipcService.on("ai-settings-loaded", (data) => {
      if (data) {
        const autoEnabled = data.auto_chat_enabled === 1 || data.autoChatEnabled === true;
        this.aiChatEnabled.set(autoEnabled);
        this.aiChatMode.set(data.auto_chat_mode || data.autoChatMode || "semi");
      }
    });
    this.listeners.push(cleanup5);
  }
  loadRules() {
    this.isLoading.set(true);
    console.log("[TriggerRules] Sending get-trigger-rules request");
    this.ipcService.send("get-trigger-rules", {});
    setTimeout(() => {
      if (this.isLoading() && this.rules().length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`[TriggerRules] Retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
        this.ipcService.send("get-trigger-rules", {});
      } else if (this.isLoading()) {
        this.isLoading.set(false);
      }
    }, 3e3);
  }
  loadAISettings() {
    this.ipcService.send("get-ai-settings", {});
  }
  refreshData() {
    this.retryCount = 0;
    this.loadRules();
    this.stateService.loadAll();
  }
  handleConfigAction(action) {
  }
  // 向導相關
  openCreateWizard() {
    this.editingRule.set(null);
    this.formData = this.getEmptyFormData();
    this.wizardStep.set(1);
    this.showWizard.set(true);
  }
  editRule(rule) {
    this.editingRule.set(rule);
    this.formData = __spreadValues({}, rule);
    this.wizardStep.set(1);
    this.showWizard.set(true);
  }
  closeWizard() {
    this.showWizard.set(false);
    this.editingRule.set(null);
    this.formData = this.getEmptyFormData();
  }
  getEmptyFormData() {
    return {
      name: "",
      description: "",
      priority: 2,
      isActive: true,
      sourceType: "all",
      sourceGroupIds: [],
      keywordSetIds: [],
      conditions: {
        oncePerUser: false,
        excludeAdmin: false
      },
      responseType: "ai_chat",
      responseConfig: {
        aiMode: "full"
      },
      senderType: "auto",
      senderAccountIds: [],
      delayMin: 30,
      delayMax: 120,
      dailyLimit: 50,
      autoAddLead: true,
      notifyMe: false
    };
  }
  getStepTitle() {
    const titles = {
      1: "\u57FA\u672C\u4FE1\u606F",
      2: "\u89F8\u767C\u689D\u4EF6",
      3: "\u97FF\u61C9\u52D5\u4F5C",
      4: "\u78BA\u8A8D\u8A2D\u7F6E"
    };
    return titles[this.wizardStep()] || "";
  }
  prevStep() {
    if (this.wizardStep() > 1) {
      this.wizardStep.update((s) => s - 1);
    }
  }
  nextStep() {
    if (this.wizardStep() < 4 && this.canProceed()) {
      this.wizardStep.update((s) => s + 1);
    }
  }
  canProceed() {
    switch (this.wizardStep()) {
      case 1:
        return this.formData.name.trim().length > 0;
      case 2:
        return this.formData.keywordSetIds.length > 0;
      case 3:
        if (this.formData.responseType === "template") {
          return !!this.formData.responseConfig.templateId;
        }
        return true;
      default:
        return true;
    }
  }
  canSave() {
    return this.formData.name.trim().length > 0 && this.formData.keywordSetIds.length > 0;
  }
  isGroupSelected(groupId) {
    return this.formData.sourceGroupIds.some((id) => String(id) === String(groupId));
  }
  isKeywordSetSelected(setId) {
    return this.formData.keywordSetIds.some((id) => String(id) === String(setId));
  }
  toggleGroupSelection(groupId) {
    const idx = this.formData.sourceGroupIds.findIndex((id) => String(id) === String(groupId));
    if (idx === -1) {
      this.formData.sourceGroupIds.push(groupId);
    } else {
      this.formData.sourceGroupIds.splice(idx, 1);
    }
  }
  toggleKeywordSetSelection(setId) {
    const idx = this.formData.keywordSetIds.findIndex((id) => String(id) === String(setId));
    if (idx === -1) {
      this.formData.keywordSetIds.push(setId);
    } else {
      this.formData.keywordSetIds.splice(idx, 1);
    }
  }
  saveRule() {
    const payload = __spreadProps(__spreadValues({}, this.formData), {
      id: this.editingRule()?.id
    });
    this.ipcService.send("save-trigger-rule", payload);
  }
  async toggleRule(rule) {
    this.ipcService.send("toggle-trigger-rule", {
      id: rule.id,
      isActive: !rule.isActive
    });
  }
  async deleteRule(rule) {
    const confirmed = await this.confirmService.confirm({
      title: "\u522A\u9664\u898F\u5247",
      message: `\u78BA\u5B9A\u8981\u522A\u9664\u898F\u5247\u300C${rule.name}\u300D\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002`,
      confirmText: "\u522A\u9664",
      cancelText: "\u53D6\u6D88",
      type: "danger"
    });
    if (confirmed) {
      this.ipcService.send("delete-trigger-rule", { id: rule.id });
    }
  }
  // 輔助方法
  getResponseIcon(type) {
    const icons = {
      "ai_chat": "\u{1F916}",
      "template": "\u{1F4DD}",
      "script": "\u{1F4D6}",
      "record_only": "\u{1F4CB}"
    };
    return icons[type] || "\u26A1";
  }
  getResponseLabel(type) {
    const labels = {
      "ai_chat": "AI \u667A\u80FD\u5C0D\u8A71",
      "template": "\u56FA\u5B9A\u6A21\u677F",
      "script": "\u57F7\u884C\u5287\u672C",
      "record_only": "\u50C5\u8A18\u9304"
    };
    return labels[type] || type;
  }
  getResponseDetail(rule) {
    const baseLabel = this.getResponseLabel(rule.responseType);
    if (rule.responseType === "template" && rule.responseConfig?.templateId) {
      const templateName = this.getTemplateName(rule.responseConfig.templateId);
      return `${baseLabel}: ${templateName}`;
    }
    if (rule.responseType === "ai_chat" && rule.responseConfig?.aiMode) {
      const modeLabel = rule.responseConfig.aiMode === "full" ? "\u5168\u81EA\u52D5" : "\u534A\u81EA\u52D5";
      return `${baseLabel} (${modeLabel})`;
    }
    return baseLabel;
  }
  getTemplateName(templateId) {
    if (!templateId)
      return "\u672A\u9078\u64C7";
    const templates = this.stateService.chatTemplates();
    const template = templates.find((t) => String(t.id) === String(templateId));
    return template?.name || `\u6A21\u677F #${templateId}`;
  }
  getPriorityLabel(priority) {
    const labels = {
      3: "\u9AD8\u512A\u5148",
      2: "\u4E2D\u512A\u5148",
      1: "\u4F4E\u512A\u5148"
    };
    return labels[priority] || "\u4E2D\u512A\u5148";
  }
  getKeywordSetNames(ids) {
    if (!ids || ids.length === 0)
      return "\u672A\u9078\u64C7";
    const sets = this.stateService.keywordSets();
    const names = ids.map((id) => {
      const idStr = String(id);
      const set = sets.find((s) => String(s.id) === idStr);
      return set?.name || `#${id}`;
    });
    if (names.length > 2) {
      return `${names.slice(0, 2).join(", ")} \u7B49 ${names.length} \u500B`;
    }
    return names.join(", ");
  }
  getSuccessRate(rule) {
    if (!rule.triggerCount || rule.triggerCount === 0)
      return 0;
    return Math.round((rule.successCount || 0) / rule.triggerCount * 100);
  }
  formatTime(dateStr) {
    if (!dateStr)
      return "";
    const date = new Date(dateStr);
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
  // ============ 測試功能 ============
  openTestDialog(rule) {
    this.testingRule.set(rule);
    this.testMessage = "";
    this.testResult.set(null);
    this.showTestDialog.set(true);
  }
  closeTestDialog() {
    this.showTestDialog.set(false);
    this.testingRule.set(null);
    this.testMessage = "";
    this.testResult.set(null);
  }
  runTest() {
    const rule = this.testingRule();
    if (!rule || !this.testMessage.trim())
      return;
    this.isTestingRule.set(true);
    const keywordSets = this.stateService.keywordSets();
    const ruleKeywordSets = keywordSets.filter((ks) => rule.keywordSetIds.includes(ks.id) || rule.keywordSetIds.includes(String(ks.id)));
    const matchedKeywords = [];
    const messageText = this.testMessage.toLowerCase();
    for (const ks of ruleKeywordSets) {
      for (const kw of ks.keywords || []) {
        const keywordText = kw.keyword?.toLowerCase() || kw.text?.toLowerCase() || "";
        if (!keywordText)
          continue;
        let matched = false;
        const isRegex = kw.isRegex || false;
        if (isRegex) {
          try {
            const regex = new RegExp(keywordText, "i");
            matched = regex.test(this.testMessage);
          } catch {
            matched = messageText.includes(keywordText);
          }
        } else {
          matched = messageText.includes(keywordText);
        }
        if (matched) {
          matchedKeywords.push(kw.keyword || kw.text);
        }
      }
    }
    const conditionsMet = this.checkConditions(rule);
    let responsePreview = "";
    if (matchedKeywords.length > 0) {
      if (rule.responseType === "template" && rule.responseConfig?.templateId) {
        const templates = this.stateService.chatTemplates();
        const template = templates.find((t) => String(t.id) === String(rule.responseConfig.templateId));
        if (template) {
          responsePreview = this.generatePreview(template.content || "", matchedKeywords[0]);
        }
      } else if (rule.responseType === "ai_chat") {
        responsePreview = "[AI \u5C07\u6839\u64DA\u6D88\u606F\u5167\u5BB9\u667A\u80FD\u751F\u6210\u56DE\u5FA9]";
      } else if (rule.responseType === "record_only") {
        responsePreview = "[\u50C5\u8A18\u9304\uFF0C\u4E0D\u767C\u9001\u4EFB\u4F55\u6D88\u606F]";
      } else if (rule.responseType === "script") {
        responsePreview = "[\u5C07\u57F7\u884C\u914D\u7F6E\u7684\u5287\u672C\u8173\u672C]";
      }
    }
    setTimeout(() => {
      this.testResult.set({
        matched: matchedKeywords.length > 0,
        matchedKeywords: [...new Set(matchedKeywords)],
        conditionsMet,
        responsePreview
      });
      this.isTestingRule.set(false);
    }, 500);
  }
  checkConditions(rule) {
    const conditions = rule.conditions || {};
    if (conditions.timeRange) {
      const now = /* @__PURE__ */ new Date();
      const hour = now.getHours();
      const [startHour, endHour] = [
        parseInt(conditions.timeRange.start?.split(":")[0] || "0"),
        parseInt(conditions.timeRange.end?.split(":")[0] || "24")
      ];
      if (hour < startHour || hour >= endHour) {
        return false;
      }
    }
    return true;
  }
  generatePreview(template, keyword) {
    let preview = template;
    preview = preview.replace(/\{\{?username\}?\}/g, "@TestUser");
    preview = preview.replace(/\{\{?firstName\}?\}/g, "Test");
    preview = preview.replace(/\{\{?keyword\}?\}/g, keyword);
    preview = preview.replace(/\{\{?groupName\}?\}/g, "\u6E2C\u8A66\u7FA4\u7D44");
    preview = preview.replace(/\{\{?[^}]+\}?\}/g, "");
    return preview.trim();
  }
  static {
    this.\u0275fac = function TriggerRulesComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TriggerRulesComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _TriggerRulesComponent, selectors: [["app-trigger-rules"]], decls: 87, vars: 12, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "p-6"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "w-12", "h-12", "bg-gradient-to-br", "from-amber-500", "to-orange-600", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], ["mode", "compact", 3, "action"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "hover:from-amber-600", "hover:to-orange-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "grid", "grid-cols-4", "gap-4", "mb-6"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "w-10", "h-10", "bg-amber-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-amber-400"], [1, "text-2xl", "font-bold", "text-amber-400"], [1, "text-xs", "text-slate-500"], [1, "w-10", "h-10", "bg-emerald-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-emerald-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "w-10", "h-10", "bg-cyan-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-cyan-400"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "w-10", "h-10", "bg-purple-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-purple-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "mb-4", "p-4", "bg-gradient-to-r", "from-emerald-500/10", "to-cyan-500/10", "rounded-xl", "border", "border-emerald-500/30"], [1, "flex-1", "overflow-hidden"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden", "h-full", "flex", "flex-col"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "flex", "items-center", "gap-2"], [1, "px-3", "py-1.5", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-sm", "text-white", 3, "ngModelChange", "ngModel"], ["value", "all"], ["value", "active"], ["value", "inactive"], [1, "flex-1", "overflow-y-auto", "p-4"], [1, "space-y-4"], [1, "flex", "flex-col", "items-center", "justify-center", "h-full", "text-center", "py-12"], [1, "fixed", "inset-0", "bg-black/50", "flex", "items-center", "justify-center", "z-50"], [1, "flex", "items-start", "gap-3"], [1, "flex-1"], [1, "text-emerald-400", "font-medium"], [1, "text-slate-400", "text-sm", "mt-1"], [1, "bg-slate-700/50", "rounded-xl", "border", "transition-all", "hover:border-amber-500/30", 3, "border-slate-600/50", "border-slate-700/50", "opacity-60"], [1, "bg-slate-700/50", "rounded-xl", "border", "transition-all", "hover:border-amber-500/30"], [1, "p-4", "flex", "items-center", "justify-between"], [1, "w-10", "h-10", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-lg"], [1, "font-medium", "text-white"], [1, "px-2", "py-0.5", "bg-emerald-500/20", "text-emerald-400", "text-xs", "rounded-full"], [1, "px-2", "py-0.5", "bg-slate-600", "text-slate-400", "text-xs", "rounded-full"], [1, "px-2", "py-0.5", "text-xs", "rounded-full"], [1, "text-sm", "text-slate-400", "mt-0.5"], ["title", "\u6E2C\u8A66\u898F\u5247", 1, "px-3", "py-1.5", "bg-blue-500/20", "hover:bg-blue-500/30", "text-blue-400", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "px-3", "py-1.5", "bg-slate-600", "hover:bg-slate-500", "text-white", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "px-3", "py-1.5", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "px-3", "py-1.5", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "text-sm", "rounded-lg", "transition-colors", 3, "click"], [1, "px-4", "pb-4"], [1, "flex", "items-center", "gap-4", "p-3", "bg-slate-800/50", "rounded-lg"], [1, "flex-1", "text-center"], [1, "text-xs", "text-slate-500", "mb-1"], [1, "text-sm", "text-slate-300"], [1, "text-slate-600"], [1, "flex", "items-center", "justify-between", "mt-3", "text-xs", "text-slate-500"], [1, "flex", "items-center", "gap-4"], [1, "w-20", "h-20", "bg-slate-700/50", "rounded-full", "flex", "items-center", "justify-center", "mb-4"], [1, "text-4xl"], [1, "text-lg", "font-medium", "text-white", "mb-2"], [1, "text-slate-400", "mb-6", "max-w-md"], [1, "text-emerald-400", "text-sm", "mb-4"], [1, "px-6", "py-3", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "hover:from-amber-600", "hover:to-orange-600", "text-white", "rounded-xl", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "fixed", "inset-0", "bg-black/50", "flex", "items-center", "justify-center", "z-50", 3, "click"], [1, "bg-slate-800", "rounded-2xl", "w-full", "max-w-2xl", "max-h-[90vh]", "overflow-hidden", "shadow-2xl", 3, "click"], [1, "p-6", "border-b", "border-slate-700", "flex", "items-center", "justify-between"], [1, "text-xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400", "mt-1"], [1, "text-slate-400", "hover:text-white", 3, "click"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-6", "h-6"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M6 18L18 6M6 6l12 12"], [1, "px-6", "py-4", "border-b", "border-slate-700/50"], [1, "flex", "items-center", "justify-between"], [1, "flex", "items-center"], [1, "p-6", "overflow-y-auto", 2, "max-height", "calc(90vh - 250px)"], [1, "p-6", "border-t", "border-slate-700", "flex", "items-center", "justify-between"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "click", "disabled"], [1, "flex", "gap-3"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", 3, "click"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "hover:from-amber-600", "hover:to-orange-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "disabled"], [1, "px-6", "py-2", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "hover:from-emerald-600", "hover:to-cyan-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "gap-2", 3, "disabled"], [1, "w-8", "h-8", "rounded-full", "flex", "items-center", "justify-center", "text-sm", "font-medium", "transition-colors"], [1, "w-16", "h-0.5", "mx-2", 3, "bg-amber-500", "bg-slate-700"], [1, "w-16", "h-0.5", "mx-2"], [1, "block", "text-sm", "font-medium", "text-slate-300", "mb-2"], ["type", "text", "placeholder", "\u4F8B\u5982\uFF1AUSDT \u4EA4\u6613\u8AEE\u8A62", 1, "w-full", "px-4", "py-3", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "focus:border-amber-500", "focus:outline-none", 3, "ngModelChange", "ngModel"], ["rows", "3", "placeholder", "\u63CF\u8FF0\u9019\u500B\u898F\u5247\u7684\u7528\u9014...", 1, "w-full", "px-4", "py-3", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "focus:border-amber-500", "focus:outline-none", "resize-none", 3, "ngModelChange", "ngModel"], [1, "flex-1", "px-4", "py-3", "rounded-lg", "border", "transition-colors", 3, "click"], [1, "space-y-2"], [1, "flex", "items-center", "gap-3", "p-3", "bg-slate-700", "rounded-lg", "cursor-pointer", "hover:bg-slate-600", "transition-colors"], ["type", "radio", "name", "sourceType", "value", "all", 1, "w-4", "h-4", "text-amber-500", 3, "ngModelChange", "ngModel"], [1, "text-slate-300"], ["type", "radio", "name", "sourceType", "value", "specific", 1, "w-4", "h-4", "text-amber-500", 3, "ngModelChange", "ngModel"], [1, "mt-3", "p-3", "bg-slate-700/50", "rounded-lg", "max-h-40", "overflow-y-auto"], [1, "p-3", "bg-slate-700/50", "rounded-lg", "max-h-48", "overflow-y-auto"], [1, "flex", "items-center", "gap-2", "p-2", "hover:bg-slate-600/50", "rounded", "cursor-pointer"], [1, "text-slate-500", "text-sm", "text-center", "py-4"], ["type", "checkbox", 1, "w-4", "h-4", "text-amber-500", 3, "ngModelChange", "ngModel"], [1, "text-slate-300", "text-sm"], ["type", "checkbox", 1, "w-4", "h-4", "text-amber-500", 3, "change", "checked"], [1, "text-slate-500", "text-xs"], [1, "space-y-3"], [1, "p-4", "rounded-lg", "border", "cursor-pointer", "transition-colors", 3, "click"], [1, "mt-3", "flex", "gap-2"], [1, "mt-3"], [1, "px-3", "py-1.5", "rounded", "text-sm", 3, "click"], [1, "w-full", "px-3", "py-2", "bg-slate-600", "border", "border-slate-500", "rounded", "text-sm", "text-white", 3, "ngModelChange", "click", "ngModel"], [3, "ngValue"], [1, "p-4", "bg-slate-700/50", "rounded-lg"], [1, "font-medium", "text-white", "mb-3"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-800/50", "rounded-lg"], [1, "text-center", "flex-1"], [1, "text-sm", "text-slate-300", "mt-1"], [1, "block", "text-sm", "text-slate-400", "mb-2"], ["type", "number", "min", "0", "max", "300", 1, "w-24", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded", "text-white", "text-center", 3, "ngModelChange", "ngModel"], [1, "text-slate-500"], ["type", "number", "min", "0", "max", "600", 1, "w-24", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded", "text-white", "text-center", 3, "ngModelChange", "ngModel"], [1, "text-slate-500", "text-sm"], ["type", "number", "min", "1", "max", "500", 1, "w-32", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded", "text-white", 3, "ngModelChange", "ngModel"], [1, "text-slate-500", "text-sm", "ml-2"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-amber-500", "to-orange-500", "hover:from-amber-600", "hover:to-orange-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", 3, "click", "disabled"], [1, "px-6", "py-2", "bg-gradient-to-r", "from-emerald-500", "to-cyan-500", "hover:from-emerald-600", "hover:to-cyan-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "bg-slate-800", "rounded-2xl", "w-full", "max-w-lg", "shadow-2xl", "border", "border-slate-700/50", 3, "click"], [1, "p-6", "border-b", "border-slate-700/50"], [1, "w-10", "h-10", "bg-blue-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-xl"], [1, "text-lg", "font-bold", "text-white"], [1, "p-6", "space-y-4"], ["rows", "3", "placeholder", "\u8F38\u5165\u8981\u6E2C\u8A66\u7684\u6D88\u606F\u5167\u5BB9\uFF0C\u4F8B\u5982\uFF1A\u6211\u60F3\u4E86\u89E3\u66F4\u591A\u95DC\u65BC\u6295\u8CC7\u7684\u4FE1\u606F...", 1, "w-full", "px-3", "py-2", "bg-slate-700", "border", "border-slate-600", "rounded-lg", "text-white", "placeholder-slate-400", "focus:border-blue-500", 3, "ngModelChange", "ngModel"], [1, "bg-slate-700/50", "rounded-lg", "p-4", "space-y-3"], [1, "p-6", "border-t", "border-slate-700/50", "flex", "justify-end", "gap-3"], [1, "px-4", "py-2", "bg-blue-500", "hover:bg-blue-600", "text-white", "rounded-lg", "transition-colors", "disabled:opacity-50", "disabled:cursor-not-allowed", "flex", "items-center", "gap-2", 3, "click", "disabled"], [1, "w-6", "h-6", "bg-emerald-500/20", "rounded-full", "flex", "items-center", "justify-center"], [1, "w-6", "h-6", "bg-red-500/20", "rounded-full", "flex", "items-center", "justify-center"], [1, "text-red-400"], [1, "text-red-400", "font-medium"], [1, "text-sm"], [1, "text-slate-400"], [1, "mt-3", "p-3", "bg-slate-800", "rounded-lg"], [1, "text-sm", "text-slate-300", "whitespace-pre-wrap"], [1, "animate-spin"]], template: function TriggerRulesComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u26A1");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u89F8\u767C\u898F\u5247");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "p", 6);
        \u0275\u0275text(10, "\u5B9A\u7FA9\u95DC\u9375\u8A5E\u5339\u914D\u5F8C\u7684\u97FF\u61C9\u52D5\u4F5C");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 2)(12, "app-config-progress", 7);
        \u0275\u0275listener("action", function TriggerRulesComponent_Template_app_config_progress_action_12_listener($event) {
          return ctx.handleConfigAction($event);
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 8);
        \u0275\u0275listener("click", function TriggerRulesComponent_Template_button_click_13_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275elementStart(14, "span");
        \u0275\u0275text(15, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "span");
        \u0275\u0275text(17, "\u5237\u65B0");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "button", 9);
        \u0275\u0275listener("click", function TriggerRulesComponent_Template_button_click_18_listener() {
          return ctx.openCreateWizard();
        });
        \u0275\u0275elementStart(19, "span");
        \u0275\u0275text(20, "+");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "span");
        \u0275\u0275text(22, "\u5275\u5EFA\u898F\u5247");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(23, "div", 10)(24, "div", 11)(25, "div", 2)(26, "div", 12)(27, "span", 13);
        \u0275\u0275text(28, "\u26A1");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(29, "div")(30, "div", 14);
        \u0275\u0275text(31);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(32, "div", 15);
        \u0275\u0275text(33, "\u7E3D\u898F\u5247\u6578");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(34, "div", 11)(35, "div", 2)(36, "div", 16)(37, "span", 17);
        \u0275\u0275text(38, "\u2713");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(39, "div")(40, "div", 18);
        \u0275\u0275text(41);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "div", 15);
        \u0275\u0275text(43, "\u6D3B\u8E8D\u898F\u5247");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(44, "div", 11)(45, "div", 2)(46, "div", 19)(47, "span", 20);
        \u0275\u0275text(48, "\u{1F3AF}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(49, "div")(50, "div", 21);
        \u0275\u0275text(51);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "div", 15);
        \u0275\u0275text(53, "\u7E3D\u89F8\u767C\u6B21\u6578");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(54, "div", 11)(55, "div", 2)(56, "div", 22)(57, "span", 23);
        \u0275\u0275text(58, "\u{1F4CA}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(59, "div")(60, "div", 24);
        \u0275\u0275text(61);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(62, "div", 15);
        \u0275\u0275text(63, "\u5E73\u5747\u6210\u529F\u7387");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275conditionalCreate(64, TriggerRulesComponent_Conditional_64_Template, 9, 1, "div", 25);
        \u0275\u0275elementStart(65, "div", 26)(66, "div", 27)(67, "div", 28)(68, "h3", 29)(69, "span");
        \u0275\u0275text(70, "\u26A1");
        \u0275\u0275elementEnd();
        \u0275\u0275text(71, " \u89F8\u767C\u898F\u5247\u5217\u8868 ");
        \u0275\u0275elementStart(72, "span", 15);
        \u0275\u0275text(73);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(74, "div", 30)(75, "select", 31);
        \u0275\u0275twoWayListener("ngModelChange", function TriggerRulesComponent_Template_select_ngModelChange_75_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filterStatus, $event) || (ctx.filterStatus = $event);
          return $event;
        });
        \u0275\u0275elementStart(76, "option", 32);
        \u0275\u0275text(77, "\u5168\u90E8\u72C0\u614B");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(78, "option", 33);
        \u0275\u0275text(79, "\u6D3B\u8E8D\u4E2D");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(80, "option", 34);
        \u0275\u0275text(81, "\u5DF2\u505C\u7528");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(82, "div", 35);
        \u0275\u0275conditionalCreate(83, TriggerRulesComponent_Conditional_83_Template, 3, 0, "div", 36)(84, TriggerRulesComponent_Conditional_84_Template, 15, 1, "div", 37);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275conditionalCreate(85, TriggerRulesComponent_Conditional_85_Template, 28, 7, "div", 38);
        \u0275\u0275conditionalCreate(86, TriggerRulesComponent_Conditional_86_Template, 25, 5, "div", 38);
      }
      if (rf & 2) {
        \u0275\u0275advance(14);
        \u0275\u0275classProp("animate-spin", ctx.isLoading());
        \u0275\u0275advance(17);
        \u0275\u0275textInterpolate(ctx.rules().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.activeRules().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.totalTriggerCount());
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate1("", ctx.averageSuccessRate(), "%");
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.aiChatEnabled() ? 64 : -1);
        \u0275\u0275advance(9);
        \u0275\u0275textInterpolate1("(", ctx.rules().length, ")");
        \u0275\u0275advance(2);
        \u0275\u0275twoWayProperty("ngModel", ctx.filterStatus);
        \u0275\u0275advance(8);
        \u0275\u0275conditional(ctx.filteredRules().length > 0 ? 83 : 84);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.showWizard() ? 85 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.showTestDialog() ? 86 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, RadioControlValueAccessor, NgControlStatus, MinValidator, MaxValidator, NgModel, ConfigProgressComponent], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TriggerRulesComponent, [{
    type: Component,
    args: [{
      selector: "app-trigger-rules",
      standalone: true,
      imports: [CommonModule, FormsModule, ConfigProgressComponent],
      template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">\u26A1</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">\u89F8\u767C\u898F\u5247</h1>
            <p class="text-sm text-slate-400">\u5B9A\u7FA9\u95DC\u9375\u8A5E\u5339\u914D\u5F8C\u7684\u97FF\u61C9\u52D5\u4F5C</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="isLoading()">\u{1F504}</span>
            <span>\u5237\u65B0</span>
          </button>
          
          <button (click)="openCreateWizard()"
                  class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span>+</span>
            <span>\u5275\u5EFA\u898F\u5247</span>
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u5361\u7247 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span class="text-amber-400">\u26A1</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-amber-400">{{ rules().length }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u898F\u5247\u6578</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">\u2713</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ activeRules().length }}</div>
              <div class="text-xs text-slate-500">\u6D3B\u8E8D\u898F\u5247</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">\u{1F3AF}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ totalTriggerCount() }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u89F8\u767C\u6B21\u6578</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">\u{1F4CA}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ averageSuccessRate() }}%</div>
              <div class="text-xs text-slate-500">\u5E73\u5747\u6210\u529F\u7387</div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI \u81EA\u52D5\u804A\u5929\u63D0\u793A -->
      @if (aiChatEnabled()) {
        <div class="mb-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
          <div class="flex items-start gap-3">
            <span class="text-2xl">\u{1F916}</span>
            <div class="flex-1">
              <p class="text-emerald-400 font-medium">AI \u81EA\u52D5\u804A\u5929\u5DF2\u555F\u7528\uFF08{{ aiChatMode() === 'full' ? '\u5168\u81EA\u52D5' : '\u534A\u81EA\u52D5' }}\u6A21\u5F0F\uFF09</p>
              <p class="text-slate-400 text-sm mt-1">
                \u672A\u5339\u914D\u7279\u5B9A\u898F\u5247\u7684\u95DC\u9375\u8A5E\u5C07\u4F7F\u7528 AI \u81EA\u52D5\u56DE\u8986\u3002
                \u5982\u9700\u91DD\u5C0D\u7279\u5B9A\u95DC\u9375\u8A5E\u4F7F\u7528\u4E0D\u540C\u97FF\u61C9\u65B9\u5F0F\uFF0C\u8ACB\u5275\u5EFA\u89F8\u767C\u898F\u5247\u3002
              </p>
            </div>
          </div>
        </div>
      }

      <!-- \u4E3B\u5167\u5BB9\u5340 -->
      <div class="flex-1 overflow-hidden">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden h-full flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>\u26A1</span> \u89F8\u767C\u898F\u5247\u5217\u8868
              <span class="text-xs text-slate-500">({{ rules().length }})</span>
            </h3>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="filterStatus" 
                      class="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white">
                <option value="all">\u5168\u90E8\u72C0\u614B</option>
                <option value="active">\u6D3B\u8E8D\u4E2D</option>
                <option value="inactive">\u5DF2\u505C\u7528</option>
              </select>
            </div>
          </div>
          
          <!-- \u898F\u5247\u5217\u8868 -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (filteredRules().length > 0) {
              <div class="space-y-4">
                @for (rule of filteredRules(); track rule.id) {
                  <div class="bg-slate-700/50 rounded-xl border transition-all hover:border-amber-500/30"
                       [class.border-slate-600/50]="rule.isActive"
                       [class.border-slate-700/50]="!rule.isActive"
                       [class.opacity-60]="!rule.isActive">
                    <!-- \u898F\u5247\u982D\u90E8 -->
                    <div class="p-4 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                             [class.bg-emerald-500/20]="rule.isActive"
                             [class.bg-slate-600/50]="!rule.isActive">
                          <span class="text-lg">{{ getResponseIcon(rule.responseType) }}</span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-white">{{ rule.name }}</span>
                            @if (rule.isActive) {
                              <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">\u6D3B\u8E8D</span>
                            } @else {
                              <span class="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded-full">\u5DF2\u505C\u7528</span>
                            }
                            <span class="px-2 py-0.5 text-xs rounded-full"
                                  [class.bg-red-500/20]="rule.priority === 3"
                                  [class.text-red-400]="rule.priority === 3"
                                  [class.bg-amber-500/20]="rule.priority === 2"
                                  [class.text-amber-400]="rule.priority === 2"
                                  [class.bg-slate-500/20]="rule.priority === 1"
                                  [class.text-slate-400]="rule.priority === 1">
                              {{ getPriorityLabel(rule.priority) }}
                            </span>
                          </div>
                          <p class="text-sm text-slate-400 mt-0.5">{{ rule.description || '\u7121\u63CF\u8FF0' }}</p>
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button (click)="openTestDialog(rule)"
                                class="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors"
                                title="\u6E2C\u8A66\u898F\u5247">
                          \u{1F9EA} \u6E2C\u8A66
                        </button>
                        <button (click)="editRule(rule)"
                                class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors">
                          \u7DE8\u8F2F
                        </button>
                        <button (click)="toggleRule(rule)"
                                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                                [class.bg-amber-500/20]="rule.isActive"
                                [class.text-amber-400]="rule.isActive"
                                [class.hover:bg-amber-500/30]="rule.isActive"
                                [class.bg-emerald-500/20]="!rule.isActive"
                                [class.text-emerald-400]="!rule.isActive"
                                [class.hover:bg-emerald-500/30]="!rule.isActive">
                          {{ rule.isActive ? '\u66AB\u505C' : '\u555F\u7528' }}
                        </button>
                        <button (click)="deleteRule(rule)"
                                class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors">
                          \u522A\u9664
                        </button>
                      </div>
                    </div>
                    
                    <!-- \u898F\u5247\u6D41\u7A0B\u53EF\u8996\u5316 -->
                    <div class="px-4 pb-4">
                      <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                        <!-- \u76E3\u63A7\u4F86\u6E90 -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">\u76E3\u63A7\u4F86\u6E90</div>
                          <div class="text-sm text-slate-300">
                            {{ rule.sourceType === 'all' ? '\u5168\u90E8\u7FA4\u7D44' : (rule.sourceGroupIds.length + ' \u500B\u7FA4\u7D44') }}
                          </div>
                        </div>
                        <div class="text-slate-600">\u2192</div>
                        <!-- \u89F8\u767C\u689D\u4EF6 -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">\u95DC\u9375\u8A5E\u96C6</div>
                          <div class="text-sm text-slate-300">
                            {{ getKeywordSetNames(rule.keywordSetIds) }}
                          </div>
                        </div>
                        <div class="text-slate-600">\u2192</div>
                        <!-- \u97FF\u61C9\u52D5\u4F5C -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">\u97FF\u61C9\u65B9\u5F0F</div>
                          <div class="text-sm text-slate-300">
                            {{ getResponseDetail(rule) }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- \u7D71\u8A08\u4FE1\u606F -->
                      <div class="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <div class="flex items-center gap-4">
                          <span>\u89F8\u767C: {{ rule.triggerCount || 0 }} \u6B21</span>
                          <span>\u6210\u529F: {{ rule.successCount || 0 }} \u6B21</span>
                          <span>\u6210\u529F\u7387: {{ getSuccessRate(rule) }}%</span>
                        </div>
                        <span>{{ rule.lastTriggered ? '\u6700\u8FD1: ' + formatTime(rule.lastTriggered) : '\u5C1A\u672A\u89F8\u767C' }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- \u7A7A\u72C0\u614B -->
              <div class="flex flex-col items-center justify-center h-full text-center py-12">
                <div class="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                  <span class="text-4xl">\u26A1</span>
                </div>
                <h3 class="text-lg font-medium text-white mb-2">\u9084\u6C92\u6709\u89F8\u767C\u898F\u5247</h3>
                <p class="text-slate-400 mb-6 max-w-md">
                  \u89F8\u767C\u898F\u5247\u5B9A\u7FA9\u4E86\u7576\u95DC\u9375\u8A5E\u5339\u914D\u5F8C\u7CFB\u7D71\u7684\u97FF\u61C9\u65B9\u5F0F\u3002<br>
                  \u60A8\u53EF\u4EE5\u70BA\u4E0D\u540C\u7684\u95DC\u9375\u8A5E\u8A2D\u7F6E\u4E0D\u540C\u7684\u97FF\u61C9\u52D5\u4F5C\u3002
                </p>
                @if (aiChatEnabled()) {
                  <p class="text-emerald-400 text-sm mb-4">
                    \u{1F4A1} AI \u81EA\u52D5\u804A\u5929\u5DF2\u958B\u555F\uFF0C\u5C07\u4F5C\u70BA\u9ED8\u8A8D\u97FF\u61C9\u65B9\u5F0F
                  </p>
                }
                <button (click)="openCreateWizard()"
                        class="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-colors flex items-center gap-2">
                  <span>\u{1F680}</span> \u5275\u5EFA\u7B2C\u4E00\u500B\u898F\u5247
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
    
    <!-- \u5275\u5EFA/\u7DE8\u8F2F\u898F\u5247\u5C0D\u8A71\u6846 -->
    @if (showWizard()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="closeWizard()">
        <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" 
             (click)="$event.stopPropagation()">
          <!-- \u6A19\u984C -->
          <div class="p-6 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-white">{{ editingRule() ? '\u7DE8\u8F2F\u898F\u5247' : '\u5275\u5EFA\u89F8\u767C\u898F\u5247' }}</h2>
              <p class="text-sm text-slate-400 mt-1">Step {{ wizardStep() }}/4: {{ getStepTitle() }}</p>
            </div>
            <button (click)="closeWizard()" class="text-slate-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- \u6B65\u9A5F\u6307\u793A\u5668 -->
          <div class="px-6 py-4 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              @for (step of [1,2,3,4]; track step) {
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                       [class.bg-amber-500]="wizardStep() >= step"
                       [class.text-white]="wizardStep() >= step"
                       [class.bg-slate-700]="wizardStep() < step"
                       [class.text-slate-400]="wizardStep() < step">
                    {{ step }}
                  </div>
                  @if (step < 4) {
                    <div class="w-16 h-0.5 mx-2"
                         [class.bg-amber-500]="wizardStep() > step"
                         [class.bg-slate-700]="wizardStep() <= step">
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          
          <!-- \u6B65\u9A5F\u5167\u5BB9 -->
          <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 250px);">
            @switch (wizardStep()) {
              @case (1) {
                <!-- Step 1: \u57FA\u672C\u4FE1\u606F -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u898F\u5247\u540D\u7A31 *</label>
                    <input type="text" [(ngModel)]="formData.name"
                           class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                           placeholder="\u4F8B\u5982\uFF1AUSDT \u4EA4\u6613\u8AEE\u8A62">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u898F\u5247\u63CF\u8FF0</label>
                    <textarea [(ngModel)]="formData.description" rows="3"
                              class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none resize-none"
                              placeholder="\u63CF\u8FF0\u9019\u500B\u898F\u5247\u7684\u7528\u9014..."></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u512A\u5148\u7D1A</label>
                    <div class="flex gap-3">
                      <button (click)="formData.priority = 3"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-red-500/20]="formData.priority === 3"
                              [class.border-red-500/50]="formData.priority === 3"
                              [class.text-red-400]="formData.priority === 3"
                              [class.bg-slate-700]="formData.priority !== 3"
                              [class.border-slate-600]="formData.priority !== 3"
                              [class.text-slate-300]="formData.priority !== 3">
                        \u9AD8\u512A\u5148
                      </button>
                      <button (click)="formData.priority = 2"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-amber-500/20]="formData.priority === 2"
                              [class.border-amber-500/50]="formData.priority === 2"
                              [class.text-amber-400]="formData.priority === 2"
                              [class.bg-slate-700]="formData.priority !== 2"
                              [class.border-slate-600]="formData.priority !== 2"
                              [class.text-slate-300]="formData.priority !== 2">
                        \u4E2D\u512A\u5148
                      </button>
                      <button (click)="formData.priority = 1"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-slate-500/20]="formData.priority === 1"
                              [class.border-slate-500/50]="formData.priority === 1"
                              [class.text-slate-400]="formData.priority === 1"
                              [class.bg-slate-700]="formData.priority !== 1"
                              [class.border-slate-600]="formData.priority !== 1"
                              [class.text-slate-300]="formData.priority !== 1">
                        \u4F4E\u512A\u5148
                      </button>
                    </div>
                  </div>
                </div>
              }
              
              @case (2) {
                <!-- Step 2: \u89F8\u767C\u689D\u4EF6 -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u76E3\u63A7\u4F86\u6E90</label>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="radio" name="sourceType" value="all" 
                               [(ngModel)]="formData.sourceType"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300">\u5168\u90E8\u76E3\u63A7\u7FA4\u7D44\uFF08{{ stateService.groups().length }} \u500B\uFF09</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="radio" name="sourceType" value="specific"
                               [(ngModel)]="formData.sourceType"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300">\u6307\u5B9A\u7FA4\u7D44</span>
                      </label>
                    </div>
                    @if (formData.sourceType === 'specific') {
                      <div class="mt-3 p-3 bg-slate-700/50 rounded-lg max-h-40 overflow-y-auto">
                        @for (group of stateService.groups(); track group.id) {
                          <label class="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" 
                                   [checked]="isGroupSelected(group.id)"
                                   (change)="toggleGroupSelection(group.id)"
                                   class="w-4 h-4 text-amber-500">
                            <span class="text-slate-300 text-sm">{{ group.name }}</span>
                          </label>
                        }
                      </div>
                    }
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u95DC\u9375\u8A5E\u96C6 *</label>
                    <div class="p-3 bg-slate-700/50 rounded-lg max-h-48 overflow-y-auto">
                      @for (set of stateService.keywordSets(); track set.id) {
                        <label class="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                          <input type="checkbox"
                                 [checked]="isKeywordSetSelected(set.id)"
                                 (change)="toggleKeywordSetSelection(set.id)"
                                 class="w-4 h-4 text-amber-500">
                          <span class="text-slate-300 text-sm">{{ set.name }}</span>
                          <span class="text-slate-500 text-xs">({{ set.keywords?.length || 0 }} \u500B\u95DC\u9375\u8A5E)</span>
                        </label>
                      }
                      @if (stateService.keywordSets().length === 0) {
                        <p class="text-slate-500 text-sm text-center py-4">
                          \u66AB\u7121\u95DC\u9375\u8A5E\u96C6\uFF0C\u8ACB\u5148\u5275\u5EFA
                        </p>
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">\u9644\u52A0\u689D\u4EF6</label>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.conditions.oncePerUser"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">\u6BCF\u7528\u6236\u53EA\u89F8\u767C\u4E00\u6B21</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.conditions.excludeAdmin"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">\u6392\u9664\u7FA4\u7BA1\u7406\u54E1</span>
                      </label>
                    </div>
                  </div>
                </div>
              }
              
              @case (3) {
                <!-- Step 3: \u97FF\u61C9\u52D5\u4F5C -->
                <div class="space-y-4">
                  <label class="block text-sm font-medium text-slate-300 mb-2">\u97FF\u61C9\u65B9\u5F0F *</label>
                  
                  <div class="space-y-3">
                    <!-- AI \u667A\u80FD\u5C0D\u8A71 -->
                    <div (click)="formData.responseType = 'ai_chat'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'ai_chat'"
                         [class.border-amber-500/50]="formData.responseType === 'ai_chat'"
                         [class.bg-slate-700]="formData.responseType !== 'ai_chat'"
                         [class.border-slate-600]="formData.responseType !== 'ai_chat'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">\u{1F916}</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">AI \u667A\u80FD\u5C0D\u8A71</div>
                          <p class="text-sm text-slate-400 mt-1">\u8B93 AI \u6839\u64DA\u4E0A\u4E0B\u6587\u667A\u80FD\u56DE\u8986\uFF0C\u66F4\u81EA\u7136\u66F4\u500B\u6027\u5316</p>
                          @if (formData.responseType === 'ai_chat') {
                            <div class="mt-3 flex gap-2">
                              <button (click)="formData.responseConfig.aiMode = 'full'; $event.stopPropagation()"
                                      class="px-3 py-1.5 rounded text-sm"
                                      [class.bg-emerald-500/20]="formData.responseConfig.aiMode === 'full'"
                                      [class.text-emerald-400]="formData.responseConfig.aiMode === 'full'"
                                      [class.bg-slate-600]="formData.responseConfig.aiMode !== 'full'"
                                      [class.text-slate-300]="formData.responseConfig.aiMode !== 'full'">
                                \u5168\u81EA\u52D5
                              </button>
                              <button (click)="formData.responseConfig.aiMode = 'semi'; $event.stopPropagation()"
                                      class="px-3 py-1.5 rounded text-sm"
                                      [class.bg-amber-500/20]="formData.responseConfig.aiMode === 'semi'"
                                      [class.text-amber-400]="formData.responseConfig.aiMode === 'semi'"
                                      [class.bg-slate-600]="formData.responseConfig.aiMode !== 'semi'"
                                      [class.text-slate-300]="formData.responseConfig.aiMode !== 'semi'">
                                \u534A\u81EA\u52D5\uFF08\u9700\u78BA\u8A8D\uFF09
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- \u4F7F\u7528\u56FA\u5B9A\u6A21\u677F -->
                    <div (click)="formData.responseType = 'template'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'template'"
                         [class.border-amber-500/50]="formData.responseType === 'template'"
                         [class.bg-slate-700]="formData.responseType !== 'template'"
                         [class.border-slate-600]="formData.responseType !== 'template'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">\u{1F4DD}</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">\u4F7F\u7528\u56FA\u5B9A\u6A21\u677F</div>
                          <p class="text-sm text-slate-400 mt-1">\u767C\u9001\u9810\u8A2D\u7684\u804A\u5929\u6A21\u677F\uFF0C\u6548\u679C\u7A69\u5B9A\u53EF\u63A7</p>
                          @if (formData.responseType === 'template') {
                            <div class="mt-3">
                              <select [(ngModel)]="formData.responseConfig.templateId"
                                      (click)="$event.stopPropagation()"
                                      class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white">
                                <option [ngValue]="undefined">\u9078\u64C7\u6A21\u677F...</option>
                                @for (template of stateService.chatTemplates(); track template.id) {
                                  <option [ngValue]="template.id">{{ template.name }}</option>
                                }
                              </select>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- \u50C5\u8A18\u9304 -->
                    <div (click)="formData.responseType = 'record_only'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'record_only'"
                         [class.border-amber-500/50]="formData.responseType === 'record_only'"
                         [class.bg-slate-700]="formData.responseType !== 'record_only'"
                         [class.border-slate-600]="formData.responseType !== 'record_only'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">\u{1F4CB}</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">\u50C5\u8A18\u9304</div>
                          <p class="text-sm text-slate-400 mt-1">\u53EA\u5C07\u7528\u6236\u52A0\u5165 Lead \u5EAB\uFF0C\u4E0D\u81EA\u52D5\u767C\u9001\u4EFB\u4F55\u6D88\u606F</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
              
              @case (4) {
                <!-- Step 4: \u78BA\u8A8D\u548C\u767C\u9001\u8A2D\u7F6E -->
                <div class="space-y-4">
                  <!-- \u898F\u5247\u6458\u8981 -->
                  <div class="p-4 bg-slate-700/50 rounded-lg">
                    <h4 class="font-medium text-white mb-3">\u{1F4CB} \u898F\u5247\u6458\u8981</h4>
                    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">\u76E3\u63A7\u4F86\u6E90</div>
                        <div class="text-sm text-slate-300 mt-1">
                          {{ formData.sourceType === 'all' ? '\u5168\u90E8\u7FA4\u7D44' : (formData.sourceGroupIds.length + ' \u500B\u7FA4\u7D44') }}
                        </div>
                      </div>
                      <div class="text-slate-600">\u2192</div>
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">\u95DC\u9375\u8A5E\u96C6</div>
                        <div class="text-sm text-slate-300 mt-1">{{ formData.keywordSetIds.length }} \u500B\u8A5E\u96C6</div>
                      </div>
                      <div class="text-slate-600">\u2192</div>
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">\u97FF\u61C9\u65B9\u5F0F</div>
                        <div class="text-sm text-slate-300 mt-1">{{ getResponseLabel(formData.responseType) }}</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- \u767C\u9001\u8A2D\u7F6E -->
                  @if (formData.responseType !== 'record_only') {
                    <div>
                      <h4 class="font-medium text-white mb-3">\u2699\uFE0F \u767C\u9001\u8A2D\u7F6E</h4>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-sm text-slate-400 mb-2">\u767C\u9001\u5EF6\u9072\uFF08\u79D2\uFF09</label>
                          <div class="flex items-center gap-3">
                            <input type="number" [(ngModel)]="formData.delayMin" min="0" max="300"
                                   class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center">
                            <span class="text-slate-500">-</span>
                            <input type="number" [(ngModel)]="formData.delayMax" min="0" max="600"
                                   class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center">
                            <span class="text-slate-500 text-sm">\u79D2</span>
                          </div>
                        </div>
                        <div>
                          <label class="block text-sm text-slate-400 mb-2">\u6BCF\u5E33\u865F\u6BCF\u65E5\u9650\u5236</label>
                          <input type="number" [(ngModel)]="formData.dailyLimit" min="1" max="500"
                                 class="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white">
                          <span class="text-slate-500 text-sm ml-2">\u689D\u6D88\u606F</span>
                        </div>
                      </div>
                    </div>
                  }
                  
                  <!-- \u9644\u52A0\u52D5\u4F5C -->
                  <div>
                    <h4 class="font-medium text-white mb-3">\u{1F4CC} \u9644\u52A0\u52D5\u4F5C</h4>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.autoAddLead"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">\u81EA\u52D5\u52A0\u5165 Lead \u5EAB</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.notifyMe"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">\u767C\u9001\u901A\u77E5\u7D66\u6211</span>
                      </label>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
          
          <!-- \u5E95\u90E8\u6309\u9215 -->
          <div class="p-6 border-t border-slate-700 flex items-center justify-between">
            <button (click)="prevStep()" 
                    [disabled]="wizardStep() === 1"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              \u2190 \u4E0A\u4E00\u6B65
            </button>
            <div class="flex gap-3">
              <button (click)="closeWizard()"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                \u53D6\u6D88
              </button>
              @if (wizardStep() < 4) {
                <button (click)="nextStep()"
                        [disabled]="!canProceed()"
                        class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  \u4E0B\u4E00\u6B65 \u2192
                </button>
              } @else {
                <button (click)="saveRule()"
                        [disabled]="!canSave()"
                        class="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <span>\u{1F680}</span> {{ editingRule() ? '\u4FDD\u5B58\u4FEE\u6539' : '\u7ACB\u5373\u555F\u7528' }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- \u6E2C\u8A66\u898F\u5247\u5C0D\u8A71\u6846 -->
    @if (showTestDialog()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="closeTestDialog()">
        <div class="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700/50" (click)="$event.stopPropagation()">
          <!-- \u6A19\u984C -->
          <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span class="text-xl">\u{1F9EA}</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">\u6E2C\u8A66\u898F\u5247</h3>
                <p class="text-sm text-slate-400">{{ testingRule()?.name }}</p>
              </div>
            </div>
          </div>
          
          <!-- \u5167\u5BB9 -->
          <div class="p-6 space-y-4">
            <!-- \u6E2C\u8A66\u6D88\u606F\u8F38\u5165 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">\u6A21\u64EC\u6D88\u606F\u5167\u5BB9</label>
              <textarea [(ngModel)]="testMessage"
                        rows="3"
                        placeholder="\u8F38\u5165\u8981\u6E2C\u8A66\u7684\u6D88\u606F\u5167\u5BB9\uFF0C\u4F8B\u5982\uFF1A\u6211\u60F3\u4E86\u89E3\u66F4\u591A\u95DC\u65BC\u6295\u8CC7\u7684\u4FE1\u606F..."
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500">
              </textarea>
            </div>
            
            <!-- \u6E2C\u8A66\u7D50\u679C -->
            @if (testResult()) {
              <div class="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div class="flex items-center gap-2">
                  @if (testResult()!.matched) {
                    <span class="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <span class="text-emerald-400">\u2713</span>
                    </span>
                    <span class="text-emerald-400 font-medium">\u95DC\u9375\u8A5E\u5339\u914D\u6210\u529F</span>
                  } @else {
                    <span class="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span class="text-red-400">\u2717</span>
                    </span>
                    <span class="text-red-400 font-medium">\u672A\u5339\u914D\u4EFB\u4F55\u95DC\u9375\u8A5E</span>
                  }
                </div>
                
                @if (testResult()!.matched) {
                  <!-- \u5339\u914D\u7684\u95DC\u9375\u8A5E -->
                  <div class="text-sm">
                    <span class="text-slate-400">\u5339\u914D\u7684\u95DC\u9375\u8A5E\uFF1A</span>
                    <span class="text-amber-400">{{ testResult()!.matchedKeywords.join(', ') }}</span>
                  </div>
                  
                  <!-- \u689D\u4EF6\u6AA2\u67E5 -->
                  <div class="text-sm">
                    <span class="text-slate-400">\u984D\u5916\u689D\u4EF6\uFF1A</span>
                    @if (testResult()!.conditionsMet) {
                      <span class="text-emerald-400">\u5168\u90E8\u6EFF\u8DB3 \u2713</span>
                    } @else {
                      <span class="text-amber-400">\u90E8\u5206\u689D\u4EF6\u53EF\u80FD\u4E0D\u6EFF\u8DB3</span>
                    }
                  </div>
                  
                  <!-- \u97FF\u61C9\u9810\u89BD -->
                  @if (testResult()!.responsePreview) {
                    <div class="mt-3 p-3 bg-slate-800 rounded-lg">
                      <div class="text-xs text-slate-500 mb-1">\u97FF\u61C9\u9810\u89BD</div>
                      <div class="text-sm text-slate-300 whitespace-pre-wrap">{{ testResult()!.responsePreview }}</div>
                    </div>
                  }
                }
              </div>
            }
          </div>
          
          <!-- \u6309\u9215 -->
          <div class="p-6 border-t border-slate-700/50 flex justify-end gap-3">
            <button (click)="closeTestDialog()"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              \u95DC\u9589
            </button>
            <button (click)="runTest()"
                    [disabled]="!testMessage.trim() || isTestingRule()"
                    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (isTestingRule()) {
                <span class="animate-spin">\u23F3</span> \u6E2C\u8A66\u4E2D...
              } @else {
                <span>\u{1F680}</span> \u57F7\u884C\u6E2C\u8A66
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(TriggerRulesComponent, { className: "TriggerRulesComponent", filePath: "src/monitoring/trigger-rules.component.ts", lineNumber: 761 });
})();

// src/monitoring/chat-templates.component.ts
var _forTrack05 = ($index, $item) => $item.key;
var _forTrack1 = ($index, $item) => $item.id;
var _forTrack2 = ($index, $item) => $item.name;
function ChatTemplatesComponent_For_17_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 19);
    \u0275\u0275listener("click", function ChatTemplatesComponent_For_17_Template_button_click_0_listener() {
      const entry_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.filterType = entry_r2.key);
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-pink-500/20", ctx_r2.filterType === entry_r2.key)("text-pink-400", ctx_r2.filterType === entry_r2.key)("bg-slate-700/50", ctx_r2.filterType !== entry_r2.key)("text-slate-400", ctx_r2.filterType !== entry_r2.key);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", entry_r2.value.icon, " ", entry_r2.value.label, " ");
  }
}
function ChatTemplatesComponent_Conditional_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 16)(1, "p");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 20);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_23_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.createNewTemplate());
    });
    \u0275\u0275text(4, " + \u5275\u5EFA\u7B2C\u4E00\u500B\u6A21\u677F ");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r2.searchQuery || ctx_r2.filterType !== "all" ? "\u6C92\u6709\u7B26\u5408\u7684\u6A21\u677F" : "\u9084\u6C92\u6709\u6A21\u677F");
  }
}
function ChatTemplatesComponent_Conditional_24_For_1_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const template_r6 = \u0275\u0275nextContext().$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("\u23F0 ", ctx_r2.formatDate(template_r6.lastUsed));
  }
}
function ChatTemplatesComponent_Conditional_24_For_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 22);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_24_For_1_Template_div_click_0_listener() {
      const template_r6 = \u0275\u0275restoreView(_r5).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.selectTemplate(template_r6));
    });
    \u0275\u0275elementStart(1, "div", 23)(2, "div", 4)(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 24);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "span", 25);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "p", 26);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 27)(12, "span");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(14, ChatTemplatesComponent_Conditional_24_For_1_Conditional_14_Template, 2, 1, "span");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_16_0;
    const template_r6 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-pink-500/20", ((tmp_11_0 = ctx_r2.selectedTemplate()) == null ? null : tmp_11_0.id) === template_r6.id)("border-pink-500/50", ((tmp_12_0 = ctx_r2.selectedTemplate()) == null ? null : tmp_12_0.id) === template_r6.id)("bg-slate-800/50", ((tmp_13_0 = ctx_r2.selectedTemplate()) == null ? null : tmp_13_0.id) !== template_r6.id)("hover:bg-slate-700/50", ((tmp_14_0 = ctx_r2.selectedTemplate()) == null ? null : tmp_14_0.id) !== template_r6.id)("border", true)("border-slate-700/50", ((tmp_16_0 = ctx_r2.selectedTemplate()) == null ? null : tmp_16_0.id) !== template_r6.id);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r2.getTypeConfig(template_r6.templateType).icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(template_r6.name);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-emerald-500/20", template_r6.isActive)("text-emerald-400", template_r6.isActive)("bg-slate-600/50", !template_r6.isActive)("text-slate-400", !template_r6.isActive);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", template_r6.isActive ? "\u555F\u7528" : "\u505C\u7528", " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(template_r6.content);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u{1F4CA} ", template_r6.usageCount, " \u6B21\u4F7F\u7528");
    \u0275\u0275advance();
    \u0275\u0275conditional(template_r6.lastUsed ? 14 : -1);
  }
}
function ChatTemplatesComponent_Conditional_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275repeaterCreate(0, ChatTemplatesComponent_Conditional_24_For_1_Template, 15, 26, "div", 21, _forTrack1);
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275repeater(ctx_r2.filteredTemplates());
  }
}
function ChatTemplatesComponent_Conditional_26_Template(rf, ctx) {
  if (rf & 1) {
    const _r7 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 28)(2, "div", 29)(3, "span", 30);
    \u0275\u0275text(4, "\u{1F4AC}");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "h3", 31);
    \u0275\u0275text(6, "\u9078\u64C7\u6216\u5275\u5EFA\u804A\u5929\u6A21\u677F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p", 32);
    \u0275\u0275text(8, "\u5F9E\u5DE6\u5074\u9078\u64C7\u4E00\u500B\u6A21\u677F\u67E5\u770B\u8A73\u60C5\uFF0C\u6216\u5275\u5EFA\u65B0\u6A21\u677F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 33);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_26_Template_button_click_9_listener() {
      \u0275\u0275restoreView(_r7);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.createNewTemplate());
    });
    \u0275\u0275text(10, " + \u5275\u5EFA\u65B0\u6A21\u677F ");
    \u0275\u0275elementEnd()()();
  }
}
function ChatTemplatesComponent_Conditional_27_For_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 39);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const entry_r9 = ctx.$implicit;
    \u0275\u0275property("value", entry_r9.key);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", entry_r9.value.icon, " ", entry_r9.value.label);
  }
}
function ChatTemplatesComponent_Conditional_27_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 62);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_27_Conditional_14_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.deleteTemplate());
    });
    \u0275\u0275text(1, " \u522A\u9664 ");
    \u0275\u0275elementEnd();
  }
}
function ChatTemplatesComponent_Conditional_27_For_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 63);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_27_For_28_Template_div_click_0_listener() {
      const variable_r12 = \u0275\u0275restoreView(_r11).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.insertVariable(variable_r12.name));
    });
    \u0275\u0275elementStart(1, "div", 35)(2, "code", 64);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 65);
    \u0275\u0275text(5, "\u9EDE\u64CA\u63D2\u5165");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "p", 66);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const variable_r12 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate("{{" + variable_r12.name + "}}");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(variable_r12.description);
  }
}
function ChatTemplatesComponent_Conditional_27_Conditional_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 55)(1, "h4", 51)(2, "span");
    \u0275\u0275text(3, "\u{1F4CA}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, " \u4F7F\u7528\u7D71\u8A08 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 67)(6, "div", 28)(7, "div", 68);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 7);
    \u0275\u0275text(10, "\u7E3D\u4F7F\u7528\u6B21\u6578");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "div", 28)(12, "div", 69);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 7);
    \u0275\u0275text(15, "\u8B8A\u91CF\u6578\u91CF");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "div", 28)(17, "div", 70);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "div", 7);
    \u0275\u0275text(20, "\u6700\u5F8C\u4F7F\u7528");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(8);
    \u0275\u0275textInterpolate(ctx_r2.editingTemplate.usageCount);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.editingTemplate.variables.length);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", ctx_r2.editingTemplate.lastUsed ? ctx_r2.formatDate(ctx_r2.editingTemplate.lastUsed) : "\u5F9E\u672A\u4F7F\u7528", " ");
  }
}
function ChatTemplatesComponent_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 35)(2, "div", 36)(3, "input", 37);
    \u0275\u0275twoWayListener("ngModelChange", function ChatTemplatesComponent_Conditional_27_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.editingTemplate.name, $event) || (ctx_r2.editingTemplate.name = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "select", 38);
    \u0275\u0275twoWayListener("ngModelChange", function ChatTemplatesComponent_Conditional_27_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.editingTemplate.templateType, $event) || (ctx_r2.editingTemplate.templateType = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(5, ChatTemplatesComponent_Conditional_27_For_6_Template, 2, 3, "option", 39, _forTrack05);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "div", 40)(8, "label", 41)(9, "input", 42);
    \u0275\u0275twoWayListener("ngModelChange", function ChatTemplatesComponent_Conditional_27_Template_input_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.editingTemplate.isActive, $event) || (ctx_r2.editingTemplate.isActive = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "span", 43);
    \u0275\u0275text(11, "\u555F\u7528");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "button", 44);
    \u0275\u0275listener("click", function ChatTemplatesComponent_Conditional_27_Template_button_click_12_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.saveTemplate());
    });
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(14, ChatTemplatesComponent_Conditional_27_Conditional_14_Template, 2, 0, "button", 45);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(15, "div", 46)(16, "div", 47)(17, "label", 48);
    \u0275\u0275text(18, "\u6A21\u677F\u5167\u5BB9");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "textarea", 49);
    \u0275\u0275twoWayListener("ngModelChange", function ChatTemplatesComponent_Conditional_27_Template_textarea_ngModelChange_19_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r2.editingTemplate.content, $event) || (ctx_r2.editingTemplate.content = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275text(20, "              ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "div", 50)(22, "h4", 51)(23, "span");
    \u0275\u0275text(24, "\u{1F4DD}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(25, " \u53EF\u7528\u8B8A\u91CF ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "div", 52);
    \u0275\u0275repeaterCreate(27, ChatTemplatesComponent_Conditional_27_For_28_Template, 8, 2, "div", 53, _forTrack2);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 47)(30, "h4", 54)(31, "span");
    \u0275\u0275text(32, "\u{1F441}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275text(33, " \u9810\u89BD ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "div", 55)(35, "div", 56)(36, "div", 57);
    \u0275\u0275text(37, " \u{1F916} ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "div", 58)(39, "div", 59)(40, "p", 60);
    \u0275\u0275text(41);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(42, "div", 61);
    \u0275\u0275text(43, "\u525B\u525B");
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275conditionalCreate(44, ChatTemplatesComponent_Conditional_27_Conditional_44_Template, 21, 3, "div", 55);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.editingTemplate.name);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.editingTemplate.templateType);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.templateTypeEntries);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.editingTemplate.isActive);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r2.isCreating() ? "\u5275\u5EFA" : "\u4FDD\u5B58", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r2.isCreating() ? 14 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r2.editingTemplate.content);
    \u0275\u0275attribute("placeholder", "\u8F38\u5165\u6A21\u677F\u5167\u5BB9\uFF0C\u4F7F\u7528 {{\u8B8A\u91CF\u540D}} \u63D2\u5165\u8B8A\u91CF");
    \u0275\u0275advance(8);
    \u0275\u0275repeater(ctx_r2.availableVariables);
    \u0275\u0275advance(14);
    \u0275\u0275textInterpolate(ctx_r2.previewContent());
    \u0275\u0275advance(3);
    \u0275\u0275conditional(!ctx_r2.isCreating() ? 44 : -1);
  }
}
var TEMPLATE_TYPES = {
  greeting: { label: "\u554F\u5019\u8A9E", icon: "\u{1F44B}", color: "emerald" },
  follow_up: { label: "\u8DDF\u9032\u6D88\u606F", icon: "\u{1F4E9}", color: "blue" },
  promotion: { label: "\u63A8\u5EE3\u6D88\u606F", icon: "\u{1F4E2}", color: "amber" },
  custom: { label: "\u81EA\u5B9A\u7FA9", icon: "\u270F\uFE0F", color: "purple" }
};
var ChatTemplatesComponent = class _ChatTemplatesComponent {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.confirmDialog = inject(ConfirmDialogService);
    this.stateService = inject(MonitoringStateService);
    this.templates = signal([], ...ngDevMode ? [{ debugName: "templates" }] : []);
    this.selectedTemplate = signal(null, ...ngDevMode ? [{ debugName: "selectedTemplate" }] : []);
    this.isCreating = signal(false, ...ngDevMode ? [{ debugName: "isCreating" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.stateEffect = effect(() => {
      const stateTemplates = this.stateService.chatTemplates();
      if (stateTemplates.length > 0 && this.templates().length === 0) {
        console.log("[ChatTemplates] Syncing from StateService:", stateTemplates.length, "templates");
        this.updateTemplates(stateTemplates);
      }
    }, ...ngDevMode ? [{ debugName: "stateEffect" }] : []);
    this.editingTemplate = this.createEmptyTemplate();
    this.searchQuery = "";
    this.filterType = "all";
    this.templateTypeEntries = Object.entries(TEMPLATE_TYPES).map(([key, value]) => ({ key, value }));
    this.availableVariables = [
      { name: "username", description: "\u5C0D\u65B9\u7528\u6236\u540D" },
      { name: "firstName", description: "\u5C0D\u65B9\u540D\u5B57" },
      { name: "groupName", description: "\u7FA4\u7D44\u540D\u7A31" },
      { name: "keyword", description: "\u5339\u914D\u7684\u95DC\u9375\u8A5E" },
      { name: "date", description: "\u7576\u524D\u65E5\u671F" },
      { name: "time", description: "\u7576\u524D\u6642\u9593" }
    ];
    this.filteredTemplates = computed(() => {
      let result = this.templates();
      if (this.filterType !== "all") {
        result = result.filter((t) => t.templateType === this.filterType);
      }
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter((t) => t.name.toLowerCase().includes(query) || t.content.toLowerCase().includes(query));
      }
      return result;
    }, ...ngDevMode ? [{ debugName: "filteredTemplates" }] : []);
    this.previewContent = computed(() => {
      let content = this.editingTemplate.content || "\u5728\u9019\u88E1\u8F38\u5165\u6A21\u677F\u5167\u5BB9...";
      content = content.replace(/\{\{username\}\}/g, "John_Doe");
      content = content.replace(/\{\{firstName\}\}/g, "John");
      content = content.replace(/\{\{groupName\}\}/g, "\u52A0\u5BC6\u8CA8\u5E63\u4EA4\u6D41\u7FA4");
      content = content.replace(/\{\{keyword\}\}/g, "\u6295\u8CC7");
      content = content.replace(/\{\{date\}\}/g, (/* @__PURE__ */ new Date()).toLocaleDateString());
      content = content.replace(/\{\{time\}\}/g, (/* @__PURE__ */ new Date()).toLocaleTimeString());
      return content;
    }, ...ngDevMode ? [{ debugName: "previewContent" }] : []);
    this.listeners = [];
    this.retryCount = 0;
    this.MAX_RETRIES = 3;
  }
  ngOnInit() {
    this.setupListeners();
    const stateTemplates = this.stateService.chatTemplates();
    if (stateTemplates.length > 0) {
      console.log("[ChatTemplates] Using existing StateService data:", stateTemplates.length, "templates");
      this.updateTemplates(stateTemplates);
    } else {
      this.stateService.loadAll();
    }
    this.loadTemplates();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("get-chat-templates-result", (data) => {
      console.log("[ChatTemplates] Received get-chat-templates-result:", data);
      this.isLoading.set(false);
      this.retryCount = 0;
      if (data.templates) {
        this.updateTemplates(data.templates);
      } else if (data.error) {
        console.error("[ChatTemplates] Error loading templates:", data.error);
        this.toastService.error("\u52A0\u8F09\u6A21\u677F\u5931\u6557: " + data.error);
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("initial-state", (data) => {
      if (data.chatTemplates) {
        console.log("[ChatTemplates] Received from initial-state:", data.chatTemplates.length, "templates");
        this.updateTemplates(data.chatTemplates);
      }
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("initial-state-config", (data) => {
      if (data.chatTemplates) {
        console.log("[ChatTemplates] Received from initial-state-config:", data.chatTemplates.length, "templates");
        this.updateTemplates(data.chatTemplates);
      }
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("save-chat-template-result", (data) => {
      if (data.success) {
        this.toastService.success(this.isCreating() ? "\u6A21\u677F\u5275\u5EFA\u6210\u529F" : "\u6A21\u677F\u4FDD\u5B58\u6210\u529F");
        this.loadTemplates();
        this.isCreating.set(false);
      } else {
        this.toastService.error(data.error || "\u4FDD\u5B58\u5931\u6557");
      }
    });
    this.listeners.push(cleanup4);
    const cleanup5 = this.ipcService.on("delete-chat-template-result", (data) => {
      if (data.success) {
        this.toastService.success("\u6A21\u677F\u5DF2\u522A\u9664");
        this.selectedTemplate.set(null);
        this.loadTemplates();
      }
    });
    this.listeners.push(cleanup5);
  }
  loadTemplates() {
    this.isLoading.set(true);
    console.log("[ChatTemplates] Sending get-chat-templates request");
    this.ipcService.send("get-chat-templates");
    setTimeout(() => {
      if (this.isLoading() && this.templates().length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`[ChatTemplates] Retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
        this.ipcService.send("get-chat-templates");
      } else if (this.isLoading()) {
        this.isLoading.set(false);
      }
    }, 3e3);
  }
  // 轉換後端數據為本地格式
  updateTemplates(rawTemplates) {
    const templates = rawTemplates.map((t) => {
      let variables = [];
      if (t.variables) {
        if (typeof t.variables === "string") {
          try {
            variables = JSON.parse(t.variables);
          } catch {
            variables = [];
          }
        } else if (Array.isArray(t.variables)) {
          variables = t.variables;
        }
      }
      return {
        id: String(t.id),
        name: t.name,
        content: t.content || "",
        templateType: t.template_type || t.templateType || "custom",
        variables,
        usageCount: t.usage_count || t.usageCount || 0,
        lastUsed: t.last_used || t.lastUsed,
        isActive: t.is_active !== false && t.isActive !== false,
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt
      };
    });
    this.templates.set(templates);
    this.isLoading.set(false);
    const current = this.selectedTemplate();
    if (current) {
      const updated = templates.find((t) => t.id === current.id);
      if (updated) {
        this.selectedTemplate.set(updated);
        this.editingTemplate = __spreadValues({}, updated);
      }
    }
  }
  createEmptyTemplate() {
    return {
      id: "",
      name: "",
      content: "",
      templateType: "custom",
      variables: [],
      usageCount: 0,
      isActive: true
    };
  }
  getTypeConfig(type) {
    return TEMPLATE_TYPES[type] || TEMPLATE_TYPES.custom;
  }
  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }
  createNewTemplate() {
    this.selectedTemplate.set(null);
    this.isCreating.set(true);
    this.editingTemplate = this.createEmptyTemplate();
  }
  selectTemplate(template) {
    this.selectedTemplate.set(template);
    this.isCreating.set(false);
    this.editingTemplate = __spreadValues({}, template);
  }
  insertVariable(variableName) {
    this.editingTemplate.content += `{{${variableName}}}`;
  }
  saveTemplate() {
    console.log("[ChatTemplates] saveTemplate called, isCreating:", this.isCreating());
    console.log("[ChatTemplates] editingTemplate:", this.editingTemplate);
    if (!this.editingTemplate.name.trim()) {
      this.toastService.error("\u8ACB\u8F38\u5165\u6A21\u677F\u540D\u7A31");
      return;
    }
    if (!this.editingTemplate.content.trim()) {
      this.toastService.error("\u8ACB\u8F38\u5165\u6A21\u677F\u5167\u5BB9");
      return;
    }
    const usedVariables = [];
    const regex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = regex.exec(this.editingTemplate.content)) !== null) {
      if (!usedVariables.includes(match[1])) {
        usedVariables.push(match[1]);
      }
    }
    const payload = {
      id: this.isCreating() ? null : parseInt(this.editingTemplate.id),
      name: this.editingTemplate.name,
      content: this.editingTemplate.content,
      category: this.editingTemplate.templateType,
      // 後端使用 category 字段
      variables: usedVariables,
      isActive: this.editingTemplate.isActive
    };
    console.log("[ChatTemplates] Sending save-chat-template:", payload);
    this.ipcService.send("save-chat-template", payload);
    this.toastService.info("\u6B63\u5728\u4FDD\u5B58...");
  }
  async deleteTemplate() {
    if (!this.selectedTemplate())
      return;
    const template = this.selectedTemplate();
    const confirmed = await this.confirmDialog.danger("\u522A\u9664\u804A\u5929\u6A21\u677F", `\u78BA\u5B9A\u8981\u522A\u9664\u6A21\u677F\u300C${template.name}\u300D\u55CE\uFF1F
\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002`, [template.name]);
    if (confirmed) {
      this.ipcService.send("delete-chat-template", { id: parseInt(template.id) });
    }
  }
  static {
    this.\u0275fac = function ChatTemplatesComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ChatTemplatesComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ChatTemplatesComponent, selectors: [["app-chat-templates"]], decls: 28, vars: 12, consts: [[1, "h-full", "flex", "bg-slate-900"], [1, "w-80", "flex-shrink-0", "border-r", "border-slate-700/50", "flex", "flex-col"], [1, "p-4", "border-b", "border-slate-700/50"], [1, "flex", "items-center", "justify-between", "mb-4"], [1, "flex", "items-center", "gap-2"], [1, "text-xl"], [1, "font-bold", "text-white"], [1, "text-xs", "text-slate-500"], [1, "w-8", "h-8", "bg-pink-500/20", "hover:bg-pink-500/30", "text-pink-400", "rounded-lg", "flex", "items-center", "justify-center", "transition-colors", 3, "click"], [1, "flex", "flex-wrap", "gap-2", "mb-3"], [1, "px-2", "py-1", "rounded-lg", "text-xs", "transition-colors", 3, "click"], [1, "px-2", "py-1", "rounded-lg", "text-xs", "transition-colors", "flex", "items-center", "gap-1", 3, "bg-pink-500/20", "text-pink-400", "bg-slate-700/50", "text-slate-400"], [1, "relative"], [1, "absolute", "left-3", "top-1/2", "-translate-y-1/2", "text-slate-500"], ["type", "text", "placeholder", "\u641C\u7D22\u6A21\u677F...", 1, "w-full", "pl-10", "pr-4", "py-2", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-white", "placeholder-slate-500", "focus:border-pink-500", "text-sm", 3, "ngModelChange", "ngModel"], [1, "flex-1", "overflow-y-auto", "p-2"], [1, "p-4", "text-center", "text-slate-500"], [1, "flex-1", "flex", "flex-col"], [1, "flex-1", "flex", "items-center", "justify-center"], [1, "px-2", "py-1", "rounded-lg", "text-xs", "transition-colors", "flex", "items-center", "gap-1", 3, "click"], [1, "mt-2", "text-pink-400", "hover:underline", "text-sm", 3, "click"], [1, "p-3", "rounded-xl", "mb-2", "cursor-pointer", "transition-all", 3, "bg-pink-500/20", "border-pink-500/50", "bg-slate-800/50", "hover:bg-slate-700/50", "border", "border-slate-700/50"], [1, "p-3", "rounded-xl", "mb-2", "cursor-pointer", "transition-all", 3, "click"], [1, "flex", "items-center", "justify-between", "mb-2"], [1, "font-medium", "text-white"], [1, "text-xs", "px-2", "py-0.5", "rounded-full"], [1, "text-xs", "text-slate-400", "line-clamp-2", "mb-2"], [1, "flex", "items-center", "gap-3", "text-xs", "text-slate-500"], [1, "text-center"], [1, "w-24", "h-24", "bg-slate-800", "rounded-full", "flex", "items-center", "justify-center", "mx-auto", "mb-4"], [1, "text-5xl"], [1, "text-lg", "font-medium", "text-white", "mb-2"], [1, "text-slate-400", "mb-4"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-pink-500", "to-rose-500", "text-white", "rounded-lg", 3, "click"], [1, "p-6", "border-b", "border-slate-700/50"], [1, "flex", "items-center", "justify-between"], [1, "flex-1", "flex", "items-center", "gap-4"], ["type", "text", "placeholder", "\u6A21\u677F\u540D\u7A31", 1, "text-xl", "font-bold", "text-white", "bg-transparent", "border-none", "focus:ring-0", "p-0", 3, "ngModelChange", "ngModel"], [1, "px-3", "py-1.5", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-sm", "text-white", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "flex", "items-center", "gap-3"], [1, "flex", "items-center", "gap-2", "cursor-pointer"], ["type", "checkbox", 1, "w-4", "h-4", "rounded", "border-slate-600", "bg-slate-700", "text-pink-500", "focus:ring-pink-500", 3, "ngModelChange", "ngModel"], [1, "text-sm", "text-slate-400"], [1, "px-4", "py-2", "bg-gradient-to-r", "from-pink-500", "to-rose-500", "hover:from-pink-600", "hover:to-rose-600", "text-white", "rounded-lg", "transition-colors", 3, "click"], [1, "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors"], [1, "flex-1", "overflow-y-auto", "p-6"], [1, "mb-6"], [1, "block", "text-sm", "font-medium", "text-slate-300", "mb-2"], ["rows", "8", 1, "w-full", "px-4", "py-3", "bg-slate-800", "border", "border-slate-700", "rounded-xl", "text-white", "placeholder-slate-500", "focus:border-pink-500", "resize-none", 3, "ngModelChange", "ngModel"], [1, "mb-6", "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50"], [1, "text-sm", "font-medium", "text-slate-300", "mb-3", "flex", "items-center", "gap-2"], [1, "grid", "grid-cols-2", "lg:grid-cols-3", "gap-2"], [1, "p-2", "bg-slate-700/50", "hover:bg-slate-600/50", "rounded-lg", "cursor-pointer", "transition-colors", "group"], [1, "text-sm", "font-medium", "text-slate-300", "mb-2", "flex", "items-center", "gap-2"], [1, "p-4", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50"], [1, "flex", "gap-3"], [1, "w-10", "h-10", "rounded-full", "bg-gradient-to-br", "from-pink-500", "to-rose-500", "flex", "items-center", "justify-center", "text-white"], [1, "flex-1"], [1, "bg-slate-700/50", "rounded-2xl", "rounded-tl-md", "p-3", "max-w-md"], [1, "text-white", "whitespace-pre-wrap"], [1, "text-xs", "text-slate-500", "mt-1"], [1, "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors", 3, "click"], [1, "p-2", "bg-slate-700/50", "hover:bg-slate-600/50", "rounded-lg", "cursor-pointer", "transition-colors", "group", 3, "click"], [1, "text-pink-400", "text-sm"], [1, "text-xs", "text-slate-500", "opacity-0", "group-hover:opacity-100"], [1, "text-xs", "text-slate-400", "mt-1"], [1, "grid", "grid-cols-3", "gap-4"], [1, "text-2xl", "font-bold", "text-pink-400"], [1, "text-2xl", "font-bold", "text-blue-400"], [1, "text-sm", "font-medium", "text-slate-300"]], template: function ChatTemplatesComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "div", 4)(5, "span", 5);
        \u0275\u0275text(6, "\u{1F4AC}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(7, "h2", 6);
        \u0275\u0275text(8, "\u804A\u5929\u6A21\u677F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "span", 7);
        \u0275\u0275text(10);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(11, "button", 8);
        \u0275\u0275listener("click", function ChatTemplatesComponent_Template_button_click_11_listener() {
          return ctx.createNewTemplate();
        });
        \u0275\u0275text(12, " + ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(13, "div", 9)(14, "button", 10);
        \u0275\u0275listener("click", function ChatTemplatesComponent_Template_button_click_14_listener() {
          return ctx.filterType = "all";
        });
        \u0275\u0275text(15, " \u5168\u90E8 ");
        \u0275\u0275elementEnd();
        \u0275\u0275repeaterCreate(16, ChatTemplatesComponent_For_17_Template, 2, 10, "button", 11, _forTrack05);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "div", 12)(19, "span", 13);
        \u0275\u0275text(20, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "input", 14);
        \u0275\u0275twoWayListener("ngModelChange", function ChatTemplatesComponent_Template_input_ngModelChange_21_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.searchQuery, $event) || (ctx.searchQuery = $event);
          return $event;
        });
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(22, "div", 15);
        \u0275\u0275conditionalCreate(23, ChatTemplatesComponent_Conditional_23_Template, 5, 1, "div", 16)(24, ChatTemplatesComponent_Conditional_24_Template, 2, 0);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(25, "div", 17);
        \u0275\u0275conditionalCreate(26, ChatTemplatesComponent_Conditional_26_Template, 11, 0, "div", 18)(27, ChatTemplatesComponent_Conditional_27_Template, 45, 9);
        \u0275\u0275elementEnd()();
      }
      if (rf & 2) {
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate1("(", ctx.templates().length, ")");
        \u0275\u0275advance(4);
        \u0275\u0275classProp("bg-pink-500/20", ctx.filterType === "all")("text-pink-400", ctx.filterType === "all")("bg-slate-700/50", ctx.filterType !== "all")("text-slate-400", ctx.filterType !== "all");
        \u0275\u0275advance(2);
        \u0275\u0275repeater(ctx.templateTypeEntries);
        \u0275\u0275advance(5);
        \u0275\u0275twoWayProperty("ngModel", ctx.searchQuery);
        \u0275\u0275advance(2);
        \u0275\u0275conditional(ctx.filteredTemplates().length === 0 ? 23 : 24);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(!ctx.selectedTemplate() && !ctx.isCreating() ? 26 : 27);
      }
    }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ChatTemplatesComponent, [{
    type: Component,
    args: [{
      selector: "app-chat-templates",
      standalone: true,
      imports: [CommonModule, FormsModule],
      template: `
    <div class="h-full flex bg-slate-900">
      <!-- \u5DE6\u5074\u6A21\u677F\u5217\u8868 -->
      <div class="w-80 flex-shrink-0 border-r border-slate-700/50 flex flex-col">
        <!-- \u6A19\u984C -->
        <div class="p-4 border-b border-slate-700/50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">\u{1F4AC}</span>
              <h2 class="font-bold text-white">\u804A\u5929\u6A21\u677F</h2>
              <span class="text-xs text-slate-500">({{ templates().length }})</span>
            </div>
            <button (click)="createNewTemplate()"
                    class="w-8 h-8 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg flex items-center justify-center transition-colors">
              +
            </button>
          </div>
          
          <!-- \u985E\u578B\u7BE9\u9078 -->
          <div class="flex flex-wrap gap-2 mb-3">
            <button (click)="filterType = 'all'"
                    class="px-2 py-1 rounded-lg text-xs transition-colors"
                    [class.bg-pink-500/20]="filterType === 'all'"
                    [class.text-pink-400]="filterType === 'all'"
                    [class.bg-slate-700/50]="filterType !== 'all'"
                    [class.text-slate-400]="filterType !== 'all'">
              \u5168\u90E8
            </button>
            @for (entry of templateTypeEntries; track entry.key) {
              <button (click)="filterType = entry.key"
                      class="px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                      [class.bg-pink-500/20]="filterType === entry.key"
                      [class.text-pink-400]="filterType === entry.key"
                      [class.bg-slate-700/50]="filterType !== entry.key"
                      [class.text-slate-400]="filterType !== entry.key">
                {{ entry.value.icon }} {{ entry.value.label }}
              </button>
            }
          </div>
          
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">\u{1F50D}</span>
            <input type="text"
                   [(ngModel)]="searchQuery"
                   placeholder="\u641C\u7D22\u6A21\u677F..."
                   class="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-pink-500 text-sm">
          </div>
        </div>

        <!-- \u6A21\u677F\u5217\u8868 -->
        <div class="flex-1 overflow-y-auto p-2">
          @if (filteredTemplates().length === 0) {
            <div class="p-4 text-center text-slate-500">
              <p>{{ searchQuery || filterType !== 'all' ? '\u6C92\u6709\u7B26\u5408\u7684\u6A21\u677F' : '\u9084\u6C92\u6709\u6A21\u677F' }}</p>
              <button (click)="createNewTemplate()" class="mt-2 text-pink-400 hover:underline text-sm">
                + \u5275\u5EFA\u7B2C\u4E00\u500B\u6A21\u677F
              </button>
            </div>
          } @else {
            @for (template of filteredTemplates(); track template.id) {
              <div (click)="selectTemplate(template)"
                   class="p-3 rounded-xl mb-2 cursor-pointer transition-all"
                   [class.bg-pink-500/20]="selectedTemplate()?.id === template.id"
                   [class.border-pink-500/50]="selectedTemplate()?.id === template.id"
                   [class.bg-slate-800/50]="selectedTemplate()?.id !== template.id"
                   [class.hover:bg-slate-700/50]="selectedTemplate()?.id !== template.id"
                   [class.border]="true"
                   [class.border-slate-700/50]="selectedTemplate()?.id !== template.id">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span>{{ getTypeConfig(template.templateType).icon }}</span>
                    <span class="font-medium text-white">{{ template.name }}</span>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class.bg-emerald-500/20]="template.isActive"
                        [class.text-emerald-400]="template.isActive"
                        [class.bg-slate-600/50]="!template.isActive"
                        [class.text-slate-400]="!template.isActive">
                    {{ template.isActive ? '\u555F\u7528' : '\u505C\u7528' }}
                  </span>
                </div>
                <p class="text-xs text-slate-400 line-clamp-2 mb-2">{{ template.content }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span>\u{1F4CA} {{ template.usageCount }} \u6B21\u4F7F\u7528</span>
                  @if (template.lastUsed) {
                    <span>\u23F0 {{ formatDate(template.lastUsed) }}</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- \u53F3\u5074\u8A73\u60C5/\u7DE8\u8F2F\u5340 -->
      <div class="flex-1 flex flex-col">
        @if (!selectedTemplate() && !isCreating()) {
          <!-- \u7A7A\u72C0\u614B -->
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-5xl">\u{1F4AC}</span>
              </div>
              <h3 class="text-lg font-medium text-white mb-2">\u9078\u64C7\u6216\u5275\u5EFA\u804A\u5929\u6A21\u677F</h3>
              <p class="text-slate-400 mb-4">\u5F9E\u5DE6\u5074\u9078\u64C7\u4E00\u500B\u6A21\u677F\u67E5\u770B\u8A73\u60C5\uFF0C\u6216\u5275\u5EFA\u65B0\u6A21\u677F</p>
              <button (click)="createNewTemplate()"
                      class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg">
                + \u5275\u5EFA\u65B0\u6A21\u677F
              </button>
            </div>
          </div>
        } @else {
          <!-- \u7DE8\u8F2F\u5340\u9802\u90E8 -->
          <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              <div class="flex-1 flex items-center gap-4">
                <input type="text"
                       [(ngModel)]="editingTemplate.name"
                       placeholder="\u6A21\u677F\u540D\u7A31"
                       class="text-xl font-bold text-white bg-transparent border-none focus:ring-0 p-0">
                <select [(ngModel)]="editingTemplate.templateType"
                        class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
                  @for (entry of templateTypeEntries; track entry.key) {
                    <option [value]="entry.key">{{ entry.value.icon }} {{ entry.value.label }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         [(ngModel)]="editingTemplate.isActive"
                         class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-pink-500 focus:ring-pink-500">
                  <span class="text-sm text-slate-400">\u555F\u7528</span>
                </label>
                <button (click)="saveTemplate()"
                        class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg transition-colors">
                  {{ isCreating() ? '\u5275\u5EFA' : '\u4FDD\u5B58' }}
                </button>
                @if (!isCreating()) {
                  <button (click)="deleteTemplate()"
                          class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                    \u522A\u9664
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- \u6A21\u677F\u7DE8\u8F2F\u5340 -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- \u6A21\u677F\u5167\u5BB9 -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-slate-300 mb-2">\u6A21\u677F\u5167\u5BB9</label>
              <textarea [(ngModel)]="editingTemplate.content"
                        rows="8"
                        [attr.placeholder]="'\u8F38\u5165\u6A21\u677F\u5167\u5BB9\uFF0C\u4F7F\u7528 {{\u8B8A\u91CF\u540D}} \u63D2\u5165\u8B8A\u91CF'"
                        class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-pink-500 resize-none">
              </textarea>
            </div>

            <!-- \u8B8A\u91CF\u8AAA\u660E -->
            <div class="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <span>\u{1F4DD}</span> \u53EF\u7528\u8B8A\u91CF
              </h4>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                @for (variable of availableVariables; track variable.name) {
                  <div (click)="insertVariable(variable.name)"
                       class="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors group">
                    <div class="flex items-center justify-between">
                      <code class="text-pink-400 text-sm">{{ '{{' + variable.name + '}}' }}</code>
                      <span class="text-xs text-slate-500 opacity-0 group-hover:opacity-100">\u9EDE\u64CA\u63D2\u5165</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">{{ variable.description }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- \u9810\u89BD -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <span>\u{1F441}\uFE0F</span> \u9810\u89BD
              </h4>
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="flex gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                    \u{1F916}
                  </div>
                  <div class="flex-1">
                    <div class="bg-slate-700/50 rounded-2xl rounded-tl-md p-3 max-w-md">
                      <p class="text-white whitespace-pre-wrap">{{ previewContent() }}</p>
                    </div>
                    <div class="text-xs text-slate-500 mt-1">\u525B\u525B</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- \u4F7F\u7528\u7D71\u8A08 -->
            @if (!isCreating()) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>\u{1F4CA}</span> \u4F7F\u7528\u7D71\u8A08
                </h4>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-pink-400">{{ editingTemplate.usageCount }}</div>
                    <div class="text-xs text-slate-500">\u7E3D\u4F7F\u7528\u6B21\u6578</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">{{ editingTemplate.variables.length }}</div>
                    <div class="text-xs text-slate-500">\u8B8A\u91CF\u6578\u91CF</div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm font-medium text-slate-300">
                      {{ editingTemplate.lastUsed ? formatDate(editingTemplate.lastUsed) : '\u5F9E\u672A\u4F7F\u7528' }}
                    </div>
                    <div class="text-xs text-slate-500">\u6700\u5F8C\u4F7F\u7528</div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ChatTemplatesComponent, { className: "ChatTemplatesComponent", filePath: "src/monitoring/chat-templates.component.ts", lineNumber: 269 });
})();

// src/monitoring/monitoring-accounts.component.ts
var _forTrack06 = ($index, $item) => $item.id;
function MonitoringAccountsComponent_For_72_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 34);
  }
  if (rf & 2) {
    const account_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275property("src", account_r4.avatar, \u0275\u0275sanitizeUrl)("alt", account_r4.username);
  }
}
function MonitoringAccountsComponent_For_72_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const account_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (account_r4.username || account_r4.phone || "?")[0].toUpperCase(), " ");
  }
}
function MonitoringAccountsComponent_For_72_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 38);
    \u0275\u0275text(1, "\u76E3\u807D");
    \u0275\u0275elementEnd();
  }
}
function MonitoringAccountsComponent_For_72_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275text(1, "\u767C\u9001");
    \u0275\u0275elementEnd();
  }
}
function MonitoringAccountsComponent_For_72_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 33);
    \u0275\u0275listener("click", function MonitoringAccountsComponent_For_72_Template_div_click_0_listener() {
      const account_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.selectAccount(account_r4));
    });
    \u0275\u0275elementStart(1, "div", 2);
    \u0275\u0275conditionalCreate(2, MonitoringAccountsComponent_For_72_Conditional_2_Template, 1, 2, "img", 34)(3, MonitoringAccountsComponent_For_72_Conditional_3_Template, 2, 1, "div", 35);
    \u0275\u0275elementStart(4, "div")(5, "div", 36);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 14);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 37);
    \u0275\u0275conditionalCreate(10, MonitoringAccountsComponent_For_72_Conditional_10_Template, 2, 0, "span", 38);
    \u0275\u0275conditionalCreate(11, MonitoringAccountsComponent_For_72_Conditional_11_Template, 2, 0, "span", 39);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(12, "div", 2)(13, "div", 40);
    \u0275\u0275element(14, "span", 41);
    \u0275\u0275elementStart(15, "span", 42);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(17, "svg", 43);
    \u0275\u0275element(18, "path", 44);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    let tmp_10_0;
    let tmp_11_0;
    const account_r4 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275classProp("border-cyan-500/50", ((tmp_10_0 = ctx_r1.selectedAccount()) == null ? null : tmp_10_0.id) === account_r4.id)("bg-slate-700", ((tmp_11_0 = ctx_r1.selectedAccount()) == null ? null : tmp_11_0.id) === account_r4.id);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(account_r4.avatar ? 2 : 3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", account_r4.username || account_r4.phone, " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(account_r4.phone);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(account_r4.isListener ? 10 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(account_r4.isSender ? 11 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275classProp("bg-emerald-500", account_r4.status === "connected")("bg-red-500", account_r4.status === "error")("bg-slate-500", account_r4.status === "disconnected");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", account_r4.status === "connected" ? "\u5DF2\u9023\u63A5" : account_r4.status === "error" ? "\u932F\u8AA4" : "\u672A\u9023\u63A5", " ");
  }
}
function MonitoringAccountsComponent_ForEmpty_73_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 31)(1, "div", 45);
    \u0275\u0275text(2, "\u{1F464}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "h3", 46);
    \u0275\u0275text(4, "\u66AB\u7121\u76E3\u63A7\u5E33\u865F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 47);
    \u0275\u0275text(6, "\u8ACB\u5728\u5E33\u6236\u7BA1\u7406\u4E2D\u6DFB\u52A0\u5E33\u865F\u4E26\u8A2D\u70BA\u76E3\u807D\u89D2\u8272");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "button", 48);
    \u0275\u0275listener("click", function MonitoringAccountsComponent_ForEmpty_73_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.navigateToAccountManagement());
    });
    \u0275\u0275text(8, " + \u6DFB\u52A0\u5E33\u865F ");
    \u0275\u0275elementEnd()();
  }
}
function MonitoringAccountsComponent_Conditional_74_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "img", 52);
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275property("src", ctx_r1.selectedAccount().avatar, \u0275\u0275sanitizeUrl);
  }
}
function MonitoringAccountsComponent_Conditional_74_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (ctx_r1.selectedAccount().username || ctx_r1.selectedAccount().phone || "?")[0].toUpperCase(), " ");
  }
}
function MonitoringAccountsComponent_Conditional_74_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 32)(1, "div", 49)(2, "h3", 27)(3, "span");
    \u0275\u0275text(4, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(5, " \u5E33\u865F\u8A73\u60C5 ");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 50)(7, "div", 51);
    \u0275\u0275conditionalCreate(8, MonitoringAccountsComponent_Conditional_74_Conditional_8_Template, 1, 1, "img", 52)(9, MonitoringAccountsComponent_Conditional_74_Conditional_9_Template, 2, 1, "div", 53);
    \u0275\u0275elementStart(10, "h4", 54);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "p", 6);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 55);
    \u0275\u0275element(15, "span", 41);
    \u0275\u0275elementStart(16, "span", 56);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(18, "div", 57)(19, "div", 58)(20, "div", 59);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 14);
    \u0275\u0275text(23, "\u4ECA\u65E5\u767C\u9001");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(24, "div", 58)(25, "div", 60);
    \u0275\u0275text(26);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "div", 14);
    \u0275\u0275text(28, "\u767C\u9001\u914D\u984D");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(29, "div", 58)(30, "div", 61);
    \u0275\u0275text(31);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(32, "div", 14);
    \u0275\u0275text(33, "\u5065\u5EB7\u5EA6");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "div", 58)(35, "div", 62);
    \u0275\u0275text(36);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(37, "div", 14);
    \u0275\u0275text(38, "\u672C\u9031\u56DE\u8986");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(39, "div", 63)(40, "h4", 64);
    \u0275\u0275text(41, "\u89D2\u8272\u8A2D\u7F6E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(42, "div", 65)(43, "div", 66)(44, "div", 40)(45, "span", 16);
    \u0275\u0275text(46, "\u{1F441}\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "span", 67);
    \u0275\u0275text(48, "\u76E3\u807D\u89D2\u8272");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(49, "label", 68)(50, "input", 69);
    \u0275\u0275listener("change", function MonitoringAccountsComponent_Conditional_74_Template_input_change_50_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleListener());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "div", 70);
    \u0275\u0275element(52, "div", 71);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(53, "div", 66)(54, "div", 40)(55, "span", 19);
    \u0275\u0275text(56, "\u{1F4E4}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(57, "span", 67);
    \u0275\u0275text(58, "\u767C\u9001\u89D2\u8272");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(59, "label", 68)(60, "input", 69);
    \u0275\u0275listener("change", function MonitoringAccountsComponent_Conditional_74_Template_input_change_60_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.toggleSender());
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "div", 70);
    \u0275\u0275element(62, "div", 71);
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(63, "div", 72)(64, "button", 73);
    \u0275\u0275listener("click", function MonitoringAccountsComponent_Conditional_74_Template_button_click_64_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r1.viewAccountDetails());
    });
    \u0275\u0275elementStart(65, "span");
    \u0275\u0275text(66, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(67, " \u67E5\u770B\u5B8C\u6574\u8A73\u60C5 ");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_11_0;
    let tmp_14_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275advance(8);
    \u0275\u0275conditional(ctx_r1.selectedAccount().avatar ? 8 : 9);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().username || ctx_r1.selectedAccount().phone);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r1.selectedAccount().phone);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500", ctx_r1.selectedAccount().status === "connected")("bg-red-500", ctx_r1.selectedAccount().status === "error")("bg-slate-500", ctx_r1.selectedAccount().status === "disconnected");
    \u0275\u0275advance();
    \u0275\u0275classProp("text-emerald-400", ctx_r1.selectedAccount().status === "connected")("text-red-400", ctx_r1.selectedAccount().status === "error")("text-slate-400", ctx_r1.selectedAccount().status === "disconnected");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r1.selectedAccount().status === "connected" ? "\u5DF2\u9023\u63A5" : ctx_r1.selectedAccount().status === "error" ? "\u9023\u63A5\u932F\u8AA4" : "\u672A\u9023\u63A5", " ");
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(((tmp_11_0 = ctx_r1.selectedAccount().stats) == null ? null : tmp_11_0.sentToday) || 0);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2("", ctx_r1.selectedAccount().dailySendCount || 0, "/", ctx_r1.selectedAccount().dailySendLimit || 50);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("", ctx_r1.selectedAccount().healthScore || 100, "%");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(((tmp_14_0 = ctx_r1.selectedAccount().stats) == null ? null : tmp_14_0.repliesWeek) || 0);
    \u0275\u0275advance(14);
    \u0275\u0275property("checked", ctx_r1.selectedAccount().isListener);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-blue-500", ctx_r1.selectedAccount().isListener)("bg-slate-600", !ctx_r1.selectedAccount().isListener);
    \u0275\u0275advance();
    \u0275\u0275classProp("left-4", ctx_r1.selectedAccount().isListener)("left-0", !ctx_r1.selectedAccount().isListener);
    \u0275\u0275advance(8);
    \u0275\u0275property("checked", ctx_r1.selectedAccount().isSender);
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-green-500", ctx_r1.selectedAccount().isSender)("bg-slate-600", !ctx_r1.selectedAccount().isSender);
    \u0275\u0275advance();
    \u0275\u0275classProp("left-4", ctx_r1.selectedAccount().isSender)("left-0", !ctx_r1.selectedAccount().isSender);
  }
}
var MonitoringAccountsComponent = class _MonitoringAccountsComponent {
  constructor() {
    this.stateService = inject(MonitoringStateService);
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.configAction = output();
    this.selectedAccount = signal(null, ...ngDevMode ? [{ debugName: "selectedAccount" }] : []);
  }
  ngOnInit() {
    this.stateService.loadAll();
  }
  refreshData() {
    this.stateService.refresh();
    this.toastService.info("\u6B63\u5728\u5237\u65B0\u5E33\u865F\u5217\u8868...");
  }
  selectAccount(account) {
    this.selectedAccount.set(account);
  }
  navigateToAccountManagement() {
    this.configAction.emit("goto-account-management");
    this.toastService.info("\u8ACB\u5728\u300C\u5E33\u6236\u7BA1\u7406\u300D\u4E2D\u6DFB\u52A0\u5E33\u865F");
  }
  handleConfigAction(action) {
    this.configAction.emit(action);
  }
  toggleListener() {
    const account = this.selectedAccount();
    if (!account)
      return;
    const newRole = !account.isListener ? "Listener" : account.isSender ? "Sender" : "";
    this.ipcService.send("update-account", {
      accountId: account.id,
      phone: account.phone,
      role: newRole
    });
    this.selectedAccount.update((a) => a ? __spreadProps(__spreadValues({}, a), { isListener: !a.isListener }) : null);
    this.toastService.success(!account.isListener ? `\u5DF2\u5C07 ${account.username || account.phone} \u8A2D\u70BA\u76E3\u807D\u5E33\u865F` : `\u5DF2\u53D6\u6D88 ${account.username || account.phone} \u7684\u76E3\u807D\u89D2\u8272`);
  }
  toggleSender() {
    const account = this.selectedAccount();
    if (!account)
      return;
    const newRole = !account.isSender ? "Sender" : account.isListener ? "Listener" : "";
    this.ipcService.send("update-account", {
      accountId: account.id,
      phone: account.phone,
      role: newRole
    });
    this.selectedAccount.update((a) => a ? __spreadProps(__spreadValues({}, a), { isSender: !a.isSender }) : null);
    this.toastService.success(!account.isSender ? `\u5DF2\u5C07 ${account.username || account.phone} \u8A2D\u70BA\u767C\u9001\u5E33\u865F` : `\u5DF2\u53D6\u6D88 ${account.username || account.phone} \u7684\u767C\u9001\u89D2\u8272`);
  }
  viewAccountDetails() {
    this.configAction.emit("goto-account-management");
  }
  static {
    this.\u0275fac = function MonitoringAccountsComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MonitoringAccountsComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MonitoringAccountsComponent, selectors: [["app-monitoring-accounts"]], outputs: { configAction: "configAction" }, decls: 75, vars: 9, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "p-6"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "w-12", "h-12", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], ["mode", "compact", 3, "action"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "grid", "grid-cols-4", "gap-4", "mb-6"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "w-10", "h-10", "bg-emerald-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-emerald-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "text-xs", "text-slate-500"], [1, "w-10", "h-10", "bg-blue-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-blue-400"], [1, "text-2xl", "font-bold", "text-blue-400"], [1, "w-10", "h-10", "bg-green-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-green-400"], [1, "text-2xl", "font-bold", "text-green-400"], [1, "w-10", "h-10", "bg-purple-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-purple-400"], [1, "text-2xl", "font-bold", "text-purple-400"], [1, "flex-1", "overflow-hidden", "flex", "gap-6"], [1, "flex-1", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden", "flex", "flex-col"], [1, "p-4", "border-b", "border-slate-700/50", "flex", "items-center", "justify-between"], [1, "font-semibold", "text-white", "flex", "items-center", "gap-2"], [1, "text-sm", "text-cyan-400", "hover:text-cyan-300", 3, "click"], [1, "flex-1", "overflow-y-auto", "p-4", "space-y-3"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-700/50", "rounded-lg", "hover:bg-slate-700", "transition-colors", "cursor-pointer", "group", "border", "border-transparent", "hover:border-cyan-500/30", 3, "border-cyan-500/50", "bg-slate-700"], [1, "text-center", "py-12", "text-slate-400"], [1, "w-96", "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "overflow-hidden", "flex", "flex-col"], [1, "flex", "items-center", "justify-between", "p-3", "bg-slate-700/50", "rounded-lg", "hover:bg-slate-700", "transition-colors", "cursor-pointer", "group", "border", "border-transparent", "hover:border-cyan-500/30", 3, "click"], [1, "w-10", "h-10", "rounded-full", "object-cover", 3, "src", "alt"], [1, "w-10", "h-10", "rounded-full", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "flex", "items-center", "justify-center", "text-white", "font-bold"], [1, "text-sm", "font-medium", "text-white"], [1, "flex", "items-center", "gap-2", "text-xs", "mt-1"], [1, "px-1.5", "py-0.5", "bg-blue-500/20", "text-blue-400", "rounded"], [1, "px-1.5", "py-0.5", "bg-green-500/20", "text-green-400", "rounded"], [1, "flex", "items-center", "gap-2"], [1, "w-2", "h-2", "rounded-full"], [1, "text-xs", "text-slate-400"], ["fill", "none", "stroke", "currentColor", "viewBox", "0 0 24 24", 1, "w-4", "h-4", "text-slate-500", "group-hover:text-cyan-400", "transition-colors"], ["stroke-linecap", "round", "stroke-linejoin", "round", "stroke-width", "2", "d", "M9 5l7 7-7 7"], [1, "text-5xl", "mb-4"], [1, "text-lg", "font-medium", "text-white", "mb-2"], [1, "text-sm", "mb-4"], [1, "px-4", "py-2", "bg-cyan-500/20", "text-cyan-400", "rounded-lg", "hover:bg-cyan-500/30", "transition-colors", 3, "click"], [1, "p-4", "border-b", "border-slate-700/50"], [1, "flex-1", "overflow-y-auto", "p-4", "space-y-4"], [1, "bg-slate-700/30", "rounded-xl", "p-4", "text-center"], [1, "w-20", "h-20", "rounded-full", "mx-auto", "mb-3", "object-cover", 3, "src"], [1, "w-20", "h-20", "rounded-full", "bg-gradient-to-br", "from-cyan-500", "to-blue-600", "flex", "items-center", "justify-center", "text-white", "text-2xl", "font-bold", "mx-auto", "mb-3"], [1, "text-lg", "font-medium", "text-white"], [1, "flex", "items-center", "justify-center", "gap-2", "mt-2"], [1, "text-sm"], [1, "grid", "grid-cols-2", "gap-3"], [1, "bg-slate-700/30", "rounded-lg", "p-3", "text-center"], [1, "text-xl", "font-bold", "text-cyan-400"], [1, "text-xl", "font-bold", "text-white"], [1, "text-xl", "font-bold", "text-emerald-400"], [1, "text-xl", "font-bold", "text-purple-400"], [1, "bg-slate-700/30", "rounded-xl", "p-4"], [1, "text-sm", "font-medium", "text-slate-300", "mb-3"], [1, "space-y-3"], [1, "flex", "items-center", "justify-between"], [1, "text-sm", "text-white"], [1, "relative", "inline-flex", "cursor-pointer"], ["type", "checkbox", 1, "sr-only", 3, "change", "checked"], [1, "w-9", "h-5", "rounded-full", "transition-all"], [1, "absolute", "w-4", "h-4", "bg-white", "rounded-full", "top-0.5", "transition-all"], [1, "space-y-2"], [1, "w-full", "px-4", "py-2.5", "bg-slate-600", "hover:bg-slate-500", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "justify-center", "gap-2", 3, "click"]], template: function MonitoringAccountsComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u{1F916}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u76E3\u63A7\u5E33\u865F\u7BA1\u7406");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "p", 6);
        \u0275\u0275text(10, "\u7BA1\u7406\u7528\u65BC\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F\u7684 Telegram \u5E33\u865F");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 2)(12, "app-config-progress", 7);
        \u0275\u0275listener("action", function MonitoringAccountsComponent_Template_app_config_progress_action_12_listener($event) {
          return ctx.handleConfigAction($event);
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 8);
        \u0275\u0275listener("click", function MonitoringAccountsComponent_Template_button_click_13_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275elementStart(14, "span");
        \u0275\u0275text(15, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "span");
        \u0275\u0275text(17, "\u5237\u65B0");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(18, "div", 9)(19, "div", 10)(20, "div", 2)(21, "div", 11)(22, "span", 12);
        \u0275\u0275text(23, "\u2713");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "div")(25, "div", 13);
        \u0275\u0275text(26);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "div", 14);
        \u0275\u0275text(28, "\u5DF2\u9023\u63A5");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(29, "div", 10)(30, "div", 2)(31, "div", 15)(32, "span", 16);
        \u0275\u0275text(33, "\u{1F441}\uFE0F");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(34, "div")(35, "div", 17);
        \u0275\u0275text(36);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "div", 14);
        \u0275\u0275text(38, "\u76E3\u807D\u5E33\u865F");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(39, "div", 10)(40, "div", 2)(41, "div", 18)(42, "span", 19);
        \u0275\u0275text(43, "\u{1F4E4}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(44, "div")(45, "div", 20);
        \u0275\u0275text(46);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "div", 14);
        \u0275\u0275text(48, "\u767C\u9001\u5E33\u865F");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(49, "div", 10)(50, "div", 2)(51, "div", 21)(52, "span", 22);
        \u0275\u0275text(53, "\u{1F4CA}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(54, "div")(55, "div", 23);
        \u0275\u0275text(56);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(57, "div", 14);
        \u0275\u0275text(58, "\u7E3D\u5E33\u865F");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(59, "div", 24)(60, "div", 25)(61, "div", 26)(62, "h3", 27)(63, "span");
        \u0275\u0275text(64, "\u{1F916}");
        \u0275\u0275elementEnd();
        \u0275\u0275text(65, " \u76E3\u63A7\u5E33\u865F ");
        \u0275\u0275elementStart(66, "span", 14);
        \u0275\u0275text(67);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(68, "button", 28);
        \u0275\u0275listener("click", function MonitoringAccountsComponent_Template_button_click_68_listener() {
          return ctx.navigateToAccountManagement();
        });
        \u0275\u0275text(69, " + \u6DFB\u52A0\u5E33\u865F ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(70, "div", 29);
        \u0275\u0275repeaterCreate(71, MonitoringAccountsComponent_For_72_Template, 19, 16, "div", 30, _forTrack06, false, MonitoringAccountsComponent_ForEmpty_73_Template, 9, 0, "div", 31);
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(74, MonitoringAccountsComponent_Conditional_74_Template, 68, 39, "div", 32);
        \u0275\u0275elementEnd()();
      }
      if (rf & 2) {
        \u0275\u0275advance(14);
        \u0275\u0275classProp("animate-spin", ctx.stateService.isLoading());
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate(ctx.stateService.connectedAccounts().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.listenerAccounts().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.senderAccounts().length);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(ctx.stateService.accounts().length);
        \u0275\u0275advance(11);
        \u0275\u0275textInterpolate1("(", ctx.stateService.accounts().length, ")");
        \u0275\u0275advance(4);
        \u0275\u0275repeater(ctx.stateService.accounts());
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.selectedAccount() ? 74 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, ConfigProgressComponent], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonitoringAccountsComponent, [{
    type: Component,
    args: [{
      selector: "app-monitoring-accounts",
      standalone: true,
      imports: [CommonModule, FormsModule, ConfigProgressComponent],
      template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">\u{1F916}</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">\u76E3\u63A7\u5E33\u865F\u7BA1\u7406</h1>
            <p class="text-sm text-slate-400">\u7BA1\u7406\u7528\u65BC\u76E3\u63A7\u7FA4\u7D44\u6D88\u606F\u7684 Telegram \u5E33\u865F</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- \u914D\u7F6E\u9032\u5EA6\uFF08\u7DCA\u6E4A\u6A21\u5F0F\uFF09 -->
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">\u{1F504}</span>
            <span>\u5237\u65B0</span>
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u5361\u7247 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">\u2713</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.connectedAccounts().length }}</div>
              <div class="text-xs text-slate-500">\u5DF2\u9023\u63A5</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span class="text-blue-400">\u{1F441}\uFE0F</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-blue-400">{{ stateService.listenerAccounts().length }}</div>
              <div class="text-xs text-slate-500">\u76E3\u807D\u5E33\u865F</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span class="text-green-400">\u{1F4E4}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-400">{{ stateService.senderAccounts().length }}</div>
              <div class="text-xs text-slate-500">\u767C\u9001\u5E33\u865F</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">\u{1F4CA}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.accounts().length }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u5E33\u865F</div>
            </div>
          </div>
        </div>
      </div>

      <!-- \u5E33\u865F\u9762\u677F -->
      <div class="flex-1 overflow-hidden flex gap-6">
        <!-- \u5DE6\u5074\uFF1A\u5E33\u865F\u5217\u8868 -->
        <div class="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>\u{1F916}</span> \u76E3\u63A7\u5E33\u865F
              <span class="text-xs text-slate-500">({{ stateService.accounts().length }})</span>
            </h3>
            <button (click)="navigateToAccountManagement()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + \u6DFB\u52A0\u5E33\u865F
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            @for (account of stateService.accounts(); track account.id) {
              <div (click)="selectAccount(account)"
                   class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg 
                          hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                          hover:border-cyan-500/30"
                   [class.border-cyan-500/50]="selectedAccount()?.id === account.id"
                   [class.bg-slate-700]="selectedAccount()?.id === account.id">
                <div class="flex items-center gap-3">
                  @if (account.avatar) {
                    <img [src]="account.avatar" 
                         class="w-10 h-10 rounded-full object-cover"
                         [alt]="account.username">
                  } @else {
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {{ (account.username || account.phone || '?')[0].toUpperCase() }}
                    </div>
                  }
                  <div>
                    <div class="text-sm font-medium text-white">
                      {{ account.username || account.phone }}
                    </div>
                    <div class="text-xs text-slate-500">{{ account.phone }}</div>
                    <div class="flex items-center gap-2 text-xs mt-1">
                      @if (account.isListener) {
                        <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">\u76E3\u807D</span>
                      }
                      @if (account.isSender) {
                        <span class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">\u767C\u9001</span>
                      }
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full"
                          [class.bg-emerald-500]="account.status === 'connected'"
                          [class.bg-red-500]="account.status === 'error'"
                          [class.bg-slate-500]="account.status === 'disconnected'">
                    </span>
                    <span class="text-xs text-slate-400">
                      {{ account.status === 'connected' ? '\u5DF2\u9023\u63A5' : account.status === 'error' ? '\u932F\u8AA4' : '\u672A\u9023\u63A5' }}
                    </span>
                  </div>
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            } @empty {
              <div class="text-center py-12 text-slate-400">
                <div class="text-5xl mb-4">\u{1F464}</div>
                <h3 class="text-lg font-medium text-white mb-2">\u66AB\u7121\u76E3\u63A7\u5E33\u865F</h3>
                <p class="text-sm mb-4">\u8ACB\u5728\u5E33\u6236\u7BA1\u7406\u4E2D\u6DFB\u52A0\u5E33\u865F\u4E26\u8A2D\u70BA\u76E3\u807D\u89D2\u8272</p>
                <button (click)="navigateToAccountManagement()"
                        class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  + \u6DFB\u52A0\u5E33\u865F
                </button>
              </div>
            }
          </div>
        </div>

        <!-- \u53F3\u5074\uFF1A\u5E33\u865F\u8A73\u60C5 -->
        @if (selectedAccount()) {
          <div class="w-96 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-700/50">
              <h3 class="font-semibold text-white flex items-center gap-2">
                <span>\u{1F4CB}</span> \u5E33\u865F\u8A73\u60C5
              </h3>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- \u5E33\u865F\u4FE1\u606F -->
              <div class="bg-slate-700/30 rounded-xl p-4 text-center">
                @if (selectedAccount()!.avatar) {
                  <img [src]="selectedAccount()!.avatar" 
                       class="w-20 h-20 rounded-full mx-auto mb-3 object-cover">
                } @else {
                  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                    {{ (selectedAccount()!.username || selectedAccount()!.phone || '?')[0].toUpperCase() }}
                  </div>
                }
                <h4 class="text-lg font-medium text-white">{{ selectedAccount()!.username || selectedAccount()!.phone }}</h4>
                <p class="text-sm text-slate-400">{{ selectedAccount()!.phone }}</p>
                <div class="flex items-center justify-center gap-2 mt-2">
                  <span class="w-2 h-2 rounded-full"
                        [class.bg-emerald-500]="selectedAccount()!.status === 'connected'"
                        [class.bg-red-500]="selectedAccount()!.status === 'error'"
                        [class.bg-slate-500]="selectedAccount()!.status === 'disconnected'">
                  </span>
                  <span class="text-sm"
                        [class.text-emerald-400]="selectedAccount()!.status === 'connected'"
                        [class.text-red-400]="selectedAccount()!.status === 'error'"
                        [class.text-slate-400]="selectedAccount()!.status === 'disconnected'">
                    {{ selectedAccount()!.status === 'connected' ? '\u5DF2\u9023\u63A5' : selectedAccount()!.status === 'error' ? '\u9023\u63A5\u932F\u8AA4' : '\u672A\u9023\u63A5' }}
                  </span>
                </div>
              </div>

              <!-- \u7D71\u8A08\u6578\u64DA -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-cyan-400">{{ selectedAccount()!.stats?.sentToday || 0 }}</div>
                  <div class="text-xs text-slate-500">\u4ECA\u65E5\u767C\u9001</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-white">{{ selectedAccount()!.dailySendCount || 0 }}/{{ selectedAccount()!.dailySendLimit || 50 }}</div>
                  <div class="text-xs text-slate-500">\u767C\u9001\u914D\u984D</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-emerald-400">{{ selectedAccount()!.healthScore || 100 }}%</div>
                  <div class="text-xs text-slate-500">\u5065\u5EB7\u5EA6</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-purple-400">{{ selectedAccount()!.stats?.repliesWeek || 0 }}</div>
                  <div class="text-xs text-slate-500">\u672C\u9031\u56DE\u8986</div>
                </div>
              </div>

              <!-- \u89D2\u8272\u8A2D\u7F6E -->
              <div class="bg-slate-700/30 rounded-xl p-4">
                <h4 class="text-sm font-medium text-slate-300 mb-3">\u89D2\u8272\u8A2D\u7F6E</h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-blue-400">\u{1F441}\uFE0F</span>
                      <span class="text-sm text-white">\u76E3\u807D\u89D2\u8272</span>
                    </div>
                    <label class="relative inline-flex cursor-pointer">
                      <input type="checkbox" 
                             [checked]="selectedAccount()!.isListener"
                             (change)="toggleListener()"
                             class="sr-only">
                      <div class="w-9 h-5 rounded-full transition-all"
                           [class.bg-blue-500]="selectedAccount()!.isListener"
                           [class.bg-slate-600]="!selectedAccount()!.isListener">
                        <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                             [class.left-4]="selectedAccount()!.isListener"
                             [class.left-0.5]="!selectedAccount()!.isListener">
                        </div>
                      </div>
                    </label>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-green-400">\u{1F4E4}</span>
                      <span class="text-sm text-white">\u767C\u9001\u89D2\u8272</span>
                    </div>
                    <label class="relative inline-flex cursor-pointer">
                      <input type="checkbox" 
                             [checked]="selectedAccount()!.isSender"
                             (change)="toggleSender()"
                             class="sr-only">
                      <div class="w-9 h-5 rounded-full transition-all"
                           [class.bg-green-500]="selectedAccount()!.isSender"
                           [class.bg-slate-600]="!selectedAccount()!.isSender">
                        <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                             [class.left-4]="selectedAccount()!.isSender"
                             [class.left-0.5]="!selectedAccount()!.isSender">
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <!-- \u5FEB\u6377\u64CD\u4F5C -->
              <div class="space-y-2">
                <button (click)="viewAccountDetails()"
                        class="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>\u{1F4CB}</span> \u67E5\u770B\u5B8C\u6574\u8A73\u60C5
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
    }]
  }], null, { configAction: [{ type: Output, args: ["configAction"] }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MonitoringAccountsComponent, { className: "MonitoringAccountsComponent", filePath: "src/monitoring/monitoring-accounts.component.ts", lineNumber: 288 });
})();

// src/monitoring/collected-users.component.ts
var _c02 = () => ["S", "A", "B", "C", "D"];
var _forTrack07 = ($index, $item) => $item.telegram_id;
function CollectedUsersComponent_For_87_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 44);
    \u0275\u0275listener("click", function CollectedUsersComponent_For_87_Template_button_click_0_listener() {
      const level_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.toggleValueLevel(level_r2));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const level_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-violet-500/20", ctx_r2.selectedValueLevels.includes(level_r2))("text-violet-400", ctx_r2.selectedValueLevels.includes(level_r2))("bg-slate-700", !ctx_r2.selectedValueLevels.includes(level_r2))("text-slate-400", !ctx_r2.selectedValueLevels.includes(level_r2));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", level_r2, " ");
  }
}
function CollectedUsersComponent_Conditional_103_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40);
    \u0275\u0275element(1, "div", 45);
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_104_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41)(1, "span", 46);
    \u0275\u0275text(2, "\u{1F4ED}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "p");
    \u0275\u0275text(4, "\u66AB\u7121\u6536\u96C6\u7684\u7528\u6236");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "p", 47);
    \u0275\u0275text(6, "\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u5F8C\uFF0C\u7CFB\u7D71\u6703\u81EA\u52D5\u6536\u96C6\u767C\u8A00\u8005");
    \u0275\u0275elementEnd()();
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F6AB} ");
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u26D4 ");
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " \u{1F464} ");
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const user_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275textInterpolate1(" ", (user_r5.first_name || user_r5.username || "?")[0].toUpperCase(), " ");
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 13);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const user_r5 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("@", user_r5.username);
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "\u{1F48E}");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 53);
    \u0275\u0275text(1, "\u2713");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_105_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_105_For_2_Template_div_click_0_listener() {
      const user_r5 = \u0275\u0275restoreView(_r4).$implicit;
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.selectUser(user_r5));
    });
    \u0275\u0275elementStart(1, "div", 2)(2, "div", 50);
    \u0275\u0275conditionalCreate(3, CollectedUsersComponent_Conditional_105_For_2_Conditional_3_Template, 1, 0)(4, CollectedUsersComponent_Conditional_105_For_2_Conditional_4_Template, 1, 0)(5, CollectedUsersComponent_Conditional_105_For_2_Conditional_5_Template, 1, 0)(6, CollectedUsersComponent_Conditional_105_For_2_Conditional_6_Template, 1, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 51)(8, "div", 28)(9, "span", 52);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(11, CollectedUsersComponent_Conditional_105_For_2_Conditional_11_Template, 2, 1, "span", 13);
    \u0275\u0275conditionalCreate(12, CollectedUsersComponent_Conditional_105_For_2_Conditional_12_Template, 2, 0, "span", 53);
    \u0275\u0275conditionalCreate(13, CollectedUsersComponent_Conditional_105_For_2_Conditional_13_Template, 2, 0, "span", 53);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 54)(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "span");
    \u0275\u0275text(18);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(19, "div", 55)(20, "div", 56);
    \u0275\u0275text(21);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "div", 57);
    \u0275\u0275text(23);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_15_0;
    const user_r5 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275classProp("bg-violet-500/10", ((tmp_11_0 = ctx_r2.selectedUser()) == null ? null : tmp_11_0.telegram_id) === user_r5.telegram_id)("border-violet-500/50", ((tmp_12_0 = ctx_r2.selectedUser()) == null ? null : tmp_12_0.telegram_id) === user_r5.telegram_id)("bg-slate-800/50", ((tmp_13_0 = ctx_r2.selectedUser()) == null ? null : tmp_13_0.telegram_id) !== user_r5.telegram_id)("border-slate-700/50", ((tmp_14_0 = ctx_r2.selectedUser()) == null ? null : tmp_14_0.telegram_id) !== user_r5.telegram_id)("hover:bg-slate-700/50", ((tmp_15_0 = ctx_r2.selectedUser()) == null ? null : tmp_15_0.telegram_id) !== user_r5.telegram_id);
    \u0275\u0275advance(2);
    \u0275\u0275classProp("bg-emerald-500/20", user_r5.ad_risk_score < 0.4)("bg-amber-500/20", user_r5.ad_risk_score >= 0.4 && user_r5.ad_risk_score < 0.7)("bg-red-500/20", user_r5.ad_risk_score >= 0.7);
    \u0275\u0275advance();
    \u0275\u0275conditional(user_r5.is_ad_account ? 3 : user_r5.is_blacklisted ? 4 : !user_r5.has_photo ? 5 : 6);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" ", user_r5.first_name || user_r5.username || "ID:" + user_r5.telegram_id, " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(user_r5.username ? 11 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(user_r5.is_premium ? 12 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(user_r5.is_verified ? 13 : -1);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1("\u{1F4CA} ", user_r5.message_count, " \u689D\u6D88\u606F");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u{1F465} ", user_r5.groups_count, " \u500B\u7FA4");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("text-emerald-400", user_r5.ad_risk_score < 0.4)("text-amber-400", user_r5.ad_risk_score >= 0.4 && user_r5.ad_risk_score < 0.7)("text-red-400", user_r5.ad_risk_score >= 0.7);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (user_r5.ad_risk_score * 100).toFixed(0), "% ");
    \u0275\u0275advance();
    \u0275\u0275classProp("bg-violet-500/20", user_r5.value_level === "S")("text-violet-400", user_r5.value_level === "S")("bg-blue-500/20", user_r5.value_level === "A")("text-blue-400", user_r5.value_level === "A")("bg-emerald-500/20", user_r5.value_level === "B")("text-emerald-400", user_r5.value_level === "B")("bg-slate-500/20", user_r5.value_level === "C" || user_r5.value_level === "D")("text-slate-400", user_r5.value_level === "C" || user_r5.value_level === "D");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", user_r5.value_level, "\u7D1A ");
  }
}
function CollectedUsersComponent_Conditional_105_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275repeaterCreate(1, CollectedUsersComponent_Conditional_105_For_2_Template, 24, 47, "div", 48, _forTrack07);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r2.filteredUsers());
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 60)(1, "span", 61);
    \u0275\u0275text(2, "\u7528\u6236\u540D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 24);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1("@", ctx_r2.selectedUser().username);
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_25_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 77)(1, "span", 18);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 78);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const factor_r7 = ctx.$implicit;
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(factor_r7.description);
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 68)(1, "h4", 75);
    \u0275\u0275text(2, "\u98A8\u96AA\u56E0\u7D20");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 76);
    \u0275\u0275repeaterCreate(4, CollectedUsersComponent_Conditional_106_Conditional_25_For_5_Template, 5, 1, "div", 77, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275repeater(ctx_r2.selectedUser().risk_factors.factors);
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_27_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 79);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Conditional_27_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r8);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.markAsAd(true));
    });
    \u0275\u0275text(1, " \u{1F6AB} \u6A19\u8A18\u70BA\u5EE3\u544A\u865F ");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_28_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 80);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Conditional_28_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.markAsAd(false));
    });
    \u0275\u0275text(1, " \u2713 \u53D6\u6D88\u5EE3\u544A\u6A19\u8A18 ");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 81);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Conditional_29_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r10);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.blacklistUser(true));
    });
    \u0275\u0275text(1, " \u26D4 \u52A0\u5165\u9ED1\u540D\u55AE ");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 81);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Conditional_30_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.blacklistUser(false));
    });
    \u0275\u0275text(1, " \u21A9\uFE0F \u79FB\u51FA\u9ED1\u540D\u55AE ");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_106_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 82);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Conditional_33_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r12);
      const ctx_r2 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r2.openInTelegram());
    });
    \u0275\u0275text(1, " \u{1F4AC} \u5728 Telegram \u67E5\u770B ");
    \u0275\u0275elementEnd();
  }
}
function CollectedUsersComponent_Conditional_106_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 43)(1, "h3", 58)(2, "span");
    \u0275\u0275text(3, "\u{1F4CB}");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, " \u7528\u6236\u8A73\u60C5 ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 59)(6, "div", 60)(7, "span", 61);
    \u0275\u0275text(8, "Telegram ID");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span", 62);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(11, CollectedUsersComponent_Conditional_106_Conditional_11_Template, 5, 1, "div", 60);
    \u0275\u0275elementStart(12, "div", 60)(13, "span", 61);
    \u0275\u0275text(14, "\u59D3\u540D");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "span", 63);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(17, "div", 64)(18, "div", 65)(19, "span", 6);
    \u0275\u0275text(20, "\u5EE3\u544A\u98A8\u96AA");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "span", 56);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 66);
    \u0275\u0275element(24, "div", 67);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(25, CollectedUsersComponent_Conditional_106_Conditional_25_Template, 6, 0, "div", 68);
    \u0275\u0275elementStart(26, "div", 69);
    \u0275\u0275conditionalCreate(27, CollectedUsersComponent_Conditional_106_Conditional_27_Template, 2, 0, "button", 70)(28, CollectedUsersComponent_Conditional_106_Conditional_28_Template, 2, 0, "button", 71);
    \u0275\u0275conditionalCreate(29, CollectedUsersComponent_Conditional_106_Conditional_29_Template, 2, 0, "button", 72)(30, CollectedUsersComponent_Conditional_106_Conditional_30_Template, 2, 0, "button", 72);
    \u0275\u0275elementStart(31, "button", 73);
    \u0275\u0275listener("click", function CollectedUsersComponent_Conditional_106_Template_button_click_31_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.recalculateRisk());
    });
    \u0275\u0275text(32, " \u{1F504} \u91CD\u65B0\u8A08\u7B97\u98A8\u96AA ");
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(33, CollectedUsersComponent_Conditional_106_Conditional_33_Template, 2, 0, "button", 74);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_12_0;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.selectedUser().telegram_id);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r2.selectedUser().username ? 11 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate2("", ctx_r2.selectedUser().first_name, " ", ctx_r2.selectedUser().last_name);
    \u0275\u0275advance(5);
    \u0275\u0275classProp("text-emerald-400", ctx_r2.selectedUser().ad_risk_score < 0.4)("text-amber-400", ctx_r2.selectedUser().ad_risk_score >= 0.4 && ctx_r2.selectedUser().ad_risk_score < 0.7)("text-red-400", ctx_r2.selectedUser().ad_risk_score >= 0.7);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", (ctx_r2.selectedUser().ad_risk_score * 100).toFixed(1), "% ");
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("width", ctx_r2.selectedUser().ad_risk_score * 100, "%");
    \u0275\u0275classProp("bg-emerald-500", ctx_r2.selectedUser().ad_risk_score < 0.4)("bg-amber-500", ctx_r2.selectedUser().ad_risk_score >= 0.4 && ctx_r2.selectedUser().ad_risk_score < 0.7)("bg-red-500", ctx_r2.selectedUser().ad_risk_score >= 0.7);
    \u0275\u0275advance();
    \u0275\u0275conditional(((tmp_12_0 = ctx_r2.selectedUser().risk_factors) == null ? null : tmp_12_0.factors == null ? null : tmp_12_0.factors.length) ? 25 : -1);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r2.selectedUser().is_ad_account ? 27 : 28);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(!ctx_r2.selectedUser().is_blacklisted ? 29 : 30);
    \u0275\u0275advance(4);
    \u0275\u0275conditional(ctx_r2.selectedUser().username ? 33 : -1);
  }
}
var CollectedUsersComponent = class _CollectedUsersComponent {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.confirmDialog = inject(ConfirmDialogService);
    this.users = signal([], ...ngDevMode ? [{ debugName: "users" }] : []);
    this.stats = signal(null, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.selectedUser = signal(null, ...ngDevMode ? [{ debugName: "selectedUser" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.filterRisk = "all";
    this.selectedValueLevels = [];
    this.filterHasUsername = false;
    this.filterExcludeAds = true;
    this.searchQuery = "";
    this.listeners = [];
    this.filteredUsers = computed(() => {
      let result = this.users();
      if (this.filterRisk === "low") {
        result = result.filter((u) => u.ad_risk_score < 0.4);
      } else if (this.filterRisk === "medium") {
        result = result.filter((u) => u.ad_risk_score >= 0.4 && u.ad_risk_score < 0.7);
      } else if (this.filterRisk === "high") {
        result = result.filter((u) => u.ad_risk_score >= 0.7);
      }
      if (this.selectedValueLevels.length > 0) {
        result = result.filter((u) => this.selectedValueLevels.includes(u.value_level));
      }
      if (this.filterHasUsername) {
        result = result.filter((u) => u.username);
      }
      if (this.filterExcludeAds) {
        result = result.filter((u) => !u.is_ad_account);
      }
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        result = result.filter((u) => u.username?.toLowerCase().includes(query) || u.first_name?.toLowerCase().includes(query) || u.telegram_id.includes(query));
      }
      return result;
    }, ...ngDevMode ? [{ debugName: "filteredUsers" }] : []);
  }
  ngOnInit() {
    this.setupListeners();
    this.loadData();
  }
  ngOnDestroy() {
    this.listeners.forEach((cleanup) => cleanup());
  }
  setupListeners() {
    const cleanup1 = this.ipcService.on("collected-users-result", (data) => {
      this.isLoading.set(false);
      if (data.success) {
        this.users.set(data.users || []);
      }
    });
    this.listeners.push(cleanup1);
    const cleanup2 = this.ipcService.on("collected-users-stats-result", (data) => {
      if (data.success) {
        this.stats.set(data.stats);
      }
    });
    this.listeners.push(cleanup2);
    const cleanup3 = this.ipcService.on("mark-user-as-ad-result", (data) => {
      if (data.success) {
        this.toastService.success(data.isAd ? "\u5DF2\u6A19\u8A18\u70BA\u5EE3\u544A\u865F" : "\u5DF2\u53D6\u6D88\u5EE3\u544A\u6A19\u8A18");
        this.loadData();
      }
    });
    this.listeners.push(cleanup3);
    const cleanup4 = this.ipcService.on("blacklist-user-result", (data) => {
      if (data.success) {
        this.toastService.success(data.blacklisted ? "\u5DF2\u52A0\u5165\u9ED1\u540D\u55AE" : "\u5DF2\u79FB\u51FA\u9ED1\u540D\u55AE");
        this.loadData();
      }
    });
    this.listeners.push(cleanup4);
    const cleanup5 = this.ipcService.on("recalculate-risk-result", (data) => {
      if (data.success) {
        this.toastService.success(`\u98A8\u96AA\u8A55\u5206\u5DF2\u66F4\u65B0: ${(data.riskScore * 100).toFixed(1)}%`);
        this.loadData();
      }
    });
    this.listeners.push(cleanup5);
  }
  loadData() {
    this.isLoading.set(true);
    this.ipcService.send("get-collected-users", {
      filters: {
        exclude_blacklist: false,
        order_by: "last_seen_at DESC"
      },
      limit: 500
    });
    this.ipcService.send("get-collected-users-stats", {});
  }
  refreshData() {
    this.loadData();
  }
  onSearchChange() {
  }
  toggleValueLevel(level) {
    const index = this.selectedValueLevels.indexOf(level);
    if (index >= 0) {
      this.selectedValueLevels.splice(index, 1);
    } else {
      this.selectedValueLevels.push(level);
    }
  }
  selectUser(user) {
    this.selectedUser.set(user);
  }
  markAsAd(isAd) {
    const user = this.selectedUser();
    if (!user)
      return;
    this.ipcService.send("mark-user-as-ad", {
      telegramId: user.telegram_id,
      isAd
    });
  }
  blacklistUser(blacklist) {
    const user = this.selectedUser();
    if (!user)
      return;
    this.ipcService.send("blacklist-user", {
      telegramId: user.telegram_id,
      blacklist
    });
  }
  recalculateRisk() {
    const user = this.selectedUser();
    if (!user)
      return;
    this.ipcService.send("recalculate-user-risk", {
      telegramId: user.telegram_id
    });
  }
  openInTelegram() {
    const user = this.selectedUser();
    if (!user?.username)
      return;
    window.open(`https://t.me/${user.username}`, "_blank");
  }
  static {
    this.\u0275fac = function CollectedUsersComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _CollectedUsersComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _CollectedUsersComponent, selectors: [["app-collected-users"]], decls: 107, vars: 45, consts: [[1, "h-full", "flex", "flex-col", "bg-slate-900", "p-6"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "flex", "items-center", "gap-3"], [1, "w-12", "h-12", "bg-gradient-to-br", "from-violet-500", "to-purple-600", "rounded-xl", "flex", "items-center", "justify-center"], [1, "text-2xl"], [1, "text-2xl", "font-bold", "text-white"], [1, "text-sm", "text-slate-400"], [1, "px-4", "py-2", "bg-slate-700", "hover:bg-slate-600", "text-white", "rounded-lg", "transition-colors", "flex", "items-center", "gap-2", 3, "click"], [1, "grid", "grid-cols-5", "gap-4", "mb-6"], [1, "bg-slate-800/50", "rounded-xl", "border", "border-slate-700/50", "p-4"], [1, "w-10", "h-10", "bg-violet-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-violet-400"], [1, "text-2xl", "font-bold", "text-violet-400"], [1, "text-xs", "text-slate-500"], [1, "w-10", "h-10", "bg-emerald-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-emerald-400"], [1, "text-2xl", "font-bold", "text-emerald-400"], [1, "w-10", "h-10", "bg-amber-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-amber-400"], [1, "text-2xl", "font-bold", "text-amber-400"], [1, "w-10", "h-10", "bg-red-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-red-400"], [1, "text-2xl", "font-bold", "text-red-400"], [1, "w-10", "h-10", "bg-cyan-500/20", "rounded-lg", "flex", "items-center", "justify-center"], [1, "text-cyan-400"], [1, "text-2xl", "font-bold", "text-cyan-400"], [1, "bg-slate-800/30", "rounded-xl", "border", "border-slate-700/50", "p-4", "mb-4"], [1, "flex", "flex-wrap", "items-center", "gap-4"], [1, "flex", "items-center", "gap-2"], [1, "flex", "gap-1"], [1, "px-3", "py-1", "rounded", "text-xs", "transition-colors", 3, "click"], [1, "w-7", "h-7", "rounded", "text-xs", "font-bold", "transition-colors", 3, "bg-violet-500/20", "text-violet-400", "bg-slate-700", "text-slate-400"], [1, "flex", "items-center", "gap-2", "cursor-pointer"], ["type", "checkbox", 1, "w-4", "h-4", "rounded", "border-slate-600", "bg-slate-700", "text-violet-500", 3, "ngModelChange", "ngModel"], [1, "flex-1"], [1, "relative"], [1, "absolute", "left-3", "top-1/2", "-translate-y-1/2", "text-slate-500"], ["type", "text", "placeholder", "\u641C\u7D22\u7528\u6236\u540D...", 1, "pl-10", "pr-4", "py-2", "bg-slate-800", "border", "border-slate-700", "rounded-lg", "text-white", "placeholder-slate-500", "text-sm", "w-48", 3, "ngModelChange", "ngModel"], [1, "flex-1", "overflow-hidden", "flex", "gap-4"], [1, "flex-1", "overflow-y-auto"], [1, "flex", "items-center", "justify-center", "h-40"], [1, "flex", "flex-col", "items-center", "justify-center", "h-40", "text-slate-500"], [1, "grid", "gap-2"], [1, "w-96", "bg-slate-800/30", "rounded-xl", "border", "border-slate-700/50", "p-4", "overflow-y-auto"], [1, "w-7", "h-7", "rounded", "text-xs", "font-bold", "transition-colors", 3, "click"], [1, "animate-spin", "w-8", "h-8", "border-4", "border-violet-500", "border-t-transparent", "rounded-full"], [1, "text-4xl", "mb-2"], [1, "text-sm"], [1, "p-4", "rounded-xl", "cursor-pointer", "transition-all", "border", 3, "bg-violet-500/10", "border-violet-500/50", "bg-slate-800/50", "border-slate-700/50", "hover:bg-slate-700/50"], [1, "p-4", "rounded-xl", "cursor-pointer", "transition-all", "border", 3, "click"], [1, "w-12", "h-12", "rounded-full", "flex", "items-center", "justify-center", "text-lg"], [1, "flex-1", "min-w-0"], [1, "font-medium", "text-white", "truncate"], [1, "text-xs"], [1, "flex", "items-center", "gap-3", "text-xs", "text-slate-400", "mt-1"], [1, "text-right"], [1, "text-lg", "font-bold"], [1, "text-xs", "px-2", "py-0.5", "rounded"], [1, "text-lg", "font-bold", "text-white", "mb-4", "flex", "items-center", "gap-2"], [1, "space-y-3", "mb-6"], [1, "flex", "justify-between"], [1, "text-slate-400"], [1, "text-white", "font-mono"], [1, "text-white"], [1, "bg-slate-700/30", "rounded-lg", "p-3", "mb-4"], [1, "flex", "items-center", "justify-between", "mb-2"], [1, "w-full", "h-2", "bg-slate-600", "rounded-full", "overflow-hidden"], [1, "h-full", "transition-all"], [1, "mb-4"], [1, "space-y-2"], [1, "w-full", "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors"], [1, "w-full", "px-4", "py-2", "bg-emerald-500/20", "hover:bg-emerald-500/30", "text-emerald-400", "rounded-lg", "transition-colors"], [1, "w-full", "px-4", "py-2", "bg-slate-600", "hover:bg-slate-500", "text-white", "rounded-lg", "transition-colors"], [1, "w-full", "px-4", "py-2", "bg-violet-500/20", "hover:bg-violet-500/30", "text-violet-400", "rounded-lg", "transition-colors", 3, "click"], [1, "w-full", "px-4", "py-2", "bg-blue-500/20", "hover:bg-blue-500/30", "text-blue-400", "rounded-lg", "transition-colors"], [1, "text-sm", "font-medium", "text-slate-300", "mb-2"], [1, "space-y-1"], [1, "flex", "items-center", "gap-2", "text-xs"], [1, "text-slate-300"], [1, "w-full", "px-4", "py-2", "bg-red-500/20", "hover:bg-red-500/30", "text-red-400", "rounded-lg", "transition-colors", 3, "click"], [1, "w-full", "px-4", "py-2", "bg-emerald-500/20", "hover:bg-emerald-500/30", "text-emerald-400", "rounded-lg", "transition-colors", 3, "click"], [1, "w-full", "px-4", "py-2", "bg-slate-600", "hover:bg-slate-500", "text-white", "rounded-lg", "transition-colors", 3, "click"], [1, "w-full", "px-4", "py-2", "bg-blue-500/20", "hover:bg-blue-500/30", "text-blue-400", "rounded-lg", "transition-colors", 3, "click"]], template: function CollectedUsersComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3)(4, "span", 4);
        \u0275\u0275text(5, "\u{1F465}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div")(7, "h1", 5);
        \u0275\u0275text(8, "\u6536\u96C6\u7528\u6236");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "p", 6);
        \u0275\u0275text(10, "\u5F9E\u7FA4\u7D44\u81EA\u52D5\u6536\u96C6\u7684\u6D3B\u8E8D\u7528\u6236\uFF0C\u667A\u80FD\u8B58\u5225\u5EE3\u544A\u865F");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(11, "div", 2)(12, "button", 7);
        \u0275\u0275listener("click", function CollectedUsersComponent_Template_button_click_12_listener() {
          return ctx.refreshData();
        });
        \u0275\u0275elementStart(13, "span");
        \u0275\u0275text(14, "\u{1F504}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "span");
        \u0275\u0275text(16, "\u5237\u65B0");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(17, "div", 8)(18, "div", 9)(19, "div", 2)(20, "div", 10)(21, "span", 11);
        \u0275\u0275text(22, "\u{1F465}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(23, "div")(24, "div", 12);
        \u0275\u0275text(25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "div", 13);
        \u0275\u0275text(27, "\u7E3D\u6536\u96C6");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(28, "div", 9)(29, "div", 2)(30, "div", 14)(31, "span", 15);
        \u0275\u0275text(32, "\u2713");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(33, "div")(34, "div", 16);
        \u0275\u0275text(35);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "div", 13);
        \u0275\u0275text(37, "\u4F4E\u98A8\u96AA");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(38, "div", 9)(39, "div", 2)(40, "div", 17)(41, "span", 18);
        \u0275\u0275text(42, "\u26A0");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(43, "div")(44, "div", 19);
        \u0275\u0275text(45);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(46, "div", 13);
        \u0275\u0275text(47, "\u4E2D\u98A8\u96AA");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(48, "div", 9)(49, "div", 2)(50, "div", 20)(51, "span", 21);
        \u0275\u0275text(52, "\u{1F6AB}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(53, "div")(54, "div", 22);
        \u0275\u0275text(55);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "div", 13);
        \u0275\u0275text(57, "\u5EE3\u544A\u865F");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(58, "div", 9)(59, "div", 2)(60, "div", 23)(61, "span", 24);
        \u0275\u0275text(62, "\u{1F48E}");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(63, "div")(64, "div", 25);
        \u0275\u0275text(65);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(66, "div", 13);
        \u0275\u0275text(67, "Premium");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(68, "div", 26)(69, "div", 27)(70, "div", 28)(71, "span", 6);
        \u0275\u0275text(72, "\u98A8\u96AA\u7B49\u7D1A:");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(73, "div", 29)(74, "button", 30);
        \u0275\u0275listener("click", function CollectedUsersComponent_Template_button_click_74_listener() {
          return ctx.filterRisk = "all";
        });
        \u0275\u0275text(75, " \u5168\u90E8 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(76, "button", 30);
        \u0275\u0275listener("click", function CollectedUsersComponent_Template_button_click_76_listener() {
          return ctx.filterRisk = "low";
        });
        \u0275\u0275text(77, " \u{1F7E2} \u5B89\u5168 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(78, "button", 30);
        \u0275\u0275listener("click", function CollectedUsersComponent_Template_button_click_78_listener() {
          return ctx.filterRisk = "medium";
        });
        \u0275\u0275text(79, " \u{1F7E1} \u53EF\u7591 ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(80, "button", 30);
        \u0275\u0275listener("click", function CollectedUsersComponent_Template_button_click_80_listener() {
          return ctx.filterRisk = "high";
        });
        \u0275\u0275text(81, " \u{1F534} \u9AD8\u5371 ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(82, "div", 28)(83, "span", 6);
        \u0275\u0275text(84, "\u50F9\u503C:");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(85, "div", 29);
        \u0275\u0275repeaterCreate(86, CollectedUsersComponent_For_87_Template, 2, 9, "button", 31, \u0275\u0275repeaterTrackByIdentity);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(88, "label", 32)(89, "input", 33);
        \u0275\u0275twoWayListener("ngModelChange", function CollectedUsersComponent_Template_input_ngModelChange_89_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filterHasUsername, $event) || (ctx.filterHasUsername = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(90, "span", 6);
        \u0275\u0275text(91, "\u6709\u7528\u6236\u540D");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(92, "label", 32)(93, "input", 33);
        \u0275\u0275twoWayListener("ngModelChange", function CollectedUsersComponent_Template_input_ngModelChange_93_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.filterExcludeAds, $event) || (ctx.filterExcludeAds = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(94, "span", 6);
        \u0275\u0275text(95, "\u6392\u9664\u5EE3\u544A\u865F");
        \u0275\u0275elementEnd()();
        \u0275\u0275element(96, "div", 34);
        \u0275\u0275elementStart(97, "div", 35)(98, "span", 36);
        \u0275\u0275text(99, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(100, "input", 37);
        \u0275\u0275twoWayListener("ngModelChange", function CollectedUsersComponent_Template_input_ngModelChange_100_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.searchQuery, $event) || (ctx.searchQuery = $event);
          return $event;
        });
        \u0275\u0275listener("ngModelChange", function CollectedUsersComponent_Template_input_ngModelChange_100_listener() {
          return ctx.onSearchChange();
        });
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(101, "div", 38)(102, "div", 39);
        \u0275\u0275conditionalCreate(103, CollectedUsersComponent_Conditional_103_Template, 2, 0, "div", 40)(104, CollectedUsersComponent_Conditional_104_Template, 7, 0, "div", 41)(105, CollectedUsersComponent_Conditional_105_Template, 3, 0, "div", 42);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(106, CollectedUsersComponent_Conditional_106_Template, 34, 23, "div", 43);
        \u0275\u0275elementEnd()();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_2_0;
        let tmp_3_0;
        let tmp_4_0;
        let tmp_5_0;
        \u0275\u0275advance(13);
        \u0275\u0275classProp("animate-spin", ctx.isLoading());
        \u0275\u0275advance(12);
        \u0275\u0275textInterpolate(((tmp_1_0 = ctx.stats()) == null ? null : tmp_1_0.total) || 0);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(((tmp_2_0 = ctx.stats()) == null ? null : tmp_2_0.by_risk == null ? null : tmp_2_0.by_risk.low) || 0);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(((tmp_3_0 = ctx.stats()) == null ? null : tmp_3_0.by_risk == null ? null : tmp_3_0.by_risk.medium) || 0);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(((tmp_4_0 = ctx.stats()) == null ? null : tmp_4_0.ad_accounts) || 0);
        \u0275\u0275advance(10);
        \u0275\u0275textInterpolate(((tmp_5_0 = ctx.stats()) == null ? null : tmp_5_0.premium) || 0);
        \u0275\u0275advance(9);
        \u0275\u0275classProp("bg-violet-500/20", ctx.filterRisk === "all")("text-violet-400", ctx.filterRisk === "all")("bg-slate-700", ctx.filterRisk !== "all")("text-slate-400", ctx.filterRisk !== "all");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-emerald-500/20", ctx.filterRisk === "low")("text-emerald-400", ctx.filterRisk === "low")("bg-slate-700", ctx.filterRisk !== "low")("text-slate-400", ctx.filterRisk !== "low");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-amber-500/20", ctx.filterRisk === "medium")("text-amber-400", ctx.filterRisk === "medium")("bg-slate-700", ctx.filterRisk !== "medium")("text-slate-400", ctx.filterRisk !== "medium");
        \u0275\u0275advance(2);
        \u0275\u0275classProp("bg-red-500/20", ctx.filterRisk === "high")("text-red-400", ctx.filterRisk === "high")("bg-slate-700", ctx.filterRisk !== "high")("text-slate-400", ctx.filterRisk !== "high");
        \u0275\u0275advance(6);
        \u0275\u0275repeater(\u0275\u0275pureFunction0(44, _c02));
        \u0275\u0275advance(3);
        \u0275\u0275twoWayProperty("ngModel", ctx.filterHasUsername);
        \u0275\u0275advance(4);
        \u0275\u0275twoWayProperty("ngModel", ctx.filterExcludeAds);
        \u0275\u0275advance(7);
        \u0275\u0275twoWayProperty("ngModel", ctx.searchQuery);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.isLoading() ? 103 : ctx.filteredUsers().length === 0 ? 104 : 105);
        \u0275\u0275advance(3);
        \u0275\u0275conditional(ctx.selectedUser() ? 106 : -1);
      }
    }, dependencies: [CommonModule, FormsModule, DefaultValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgModel], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CollectedUsersComponent, [{
    type: Component,
    args: [{
      selector: "app-collected-users",
      standalone: true,
      imports: [CommonModule, FormsModule],
      template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- \u9802\u90E8\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">\u{1F465}</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">\u6536\u96C6\u7528\u6236</h1>
            <p class="text-sm text-slate-400">\u5F9E\u7FA4\u7D44\u81EA\u52D5\u6536\u96C6\u7684\u6D3B\u8E8D\u7528\u6236\uFF0C\u667A\u80FD\u8B58\u5225\u5EE3\u544A\u865F</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="isLoading()">\u{1F504}</span>
            <span>\u5237\u65B0</span>
          </button>
        </div>
      </div>

      <!-- \u7D71\u8A08\u5361\u7247 -->
      <div class="grid grid-cols-5 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <span class="text-violet-400">\u{1F465}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-violet-400">{{ stats()?.total || 0 }}</div>
              <div class="text-xs text-slate-500">\u7E3D\u6536\u96C6</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">\u2713</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stats()?.by_risk?.low || 0 }}</div>
              <div class="text-xs text-slate-500">\u4F4E\u98A8\u96AA</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span class="text-amber-400">\u26A0</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-amber-400">{{ stats()?.by_risk?.medium || 0 }}</div>
              <div class="text-xs text-slate-500">\u4E2D\u98A8\u96AA</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <span class="text-red-400">\u{1F6AB}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-400">{{ stats()?.ad_accounts || 0 }}</div>
              <div class="text-xs text-slate-500">\u5EE3\u544A\u865F</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">\u{1F48E}</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stats()?.premium || 0 }}</div>
              <div class="text-xs text-slate-500">Premium</div>
            </div>
          </div>
        </div>
      </div>

      <!-- \u7BE9\u9078\u6B04 -->
      <div class="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- \u98A8\u96AA\u7BE9\u9078 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-400">\u98A8\u96AA\u7B49\u7D1A:</span>
            <div class="flex gap-1">
              <button (click)="filterRisk = 'all'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-violet-500/20]="filterRisk === 'all'"
                      [class.text-violet-400]="filterRisk === 'all'"
                      [class.bg-slate-700]="filterRisk !== 'all'"
                      [class.text-slate-400]="filterRisk !== 'all'">
                \u5168\u90E8
              </button>
              <button (click)="filterRisk = 'low'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-emerald-500/20]="filterRisk === 'low'"
                      [class.text-emerald-400]="filterRisk === 'low'"
                      [class.bg-slate-700]="filterRisk !== 'low'"
                      [class.text-slate-400]="filterRisk !== 'low'">
                \u{1F7E2} \u5B89\u5168
              </button>
              <button (click)="filterRisk = 'medium'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-amber-500/20]="filterRisk === 'medium'"
                      [class.text-amber-400]="filterRisk === 'medium'"
                      [class.bg-slate-700]="filterRisk !== 'medium'"
                      [class.text-slate-400]="filterRisk !== 'medium'">
                \u{1F7E1} \u53EF\u7591
              </button>
              <button (click)="filterRisk = 'high'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-red-500/20]="filterRisk === 'high'"
                      [class.text-red-400]="filterRisk === 'high'"
                      [class.bg-slate-700]="filterRisk !== 'high'"
                      [class.text-slate-400]="filterRisk !== 'high'">
                \u{1F534} \u9AD8\u5371
              </button>
            </div>
          </div>

          <!-- \u50F9\u503C\u7B49\u7D1A\u7BE9\u9078 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-400">\u50F9\u503C:</span>
            <div class="flex gap-1">
              @for (level of ['S', 'A', 'B', 'C', 'D']; track level) {
                <button (click)="toggleValueLevel(level)"
                        class="w-7 h-7 rounded text-xs font-bold transition-colors"
                        [class.bg-violet-500/20]="selectedValueLevels.includes(level)"
                        [class.text-violet-400]="selectedValueLevels.includes(level)"
                        [class.bg-slate-700]="!selectedValueLevels.includes(level)"
                        [class.text-slate-400]="!selectedValueLevels.includes(level)">
                  {{ level }}
                </button>
              }
            </div>
          </div>

          <!-- \u5176\u4ED6\u7BE9\u9078 -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="filterHasUsername"
                   class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500">
            <span class="text-sm text-slate-400">\u6709\u7528\u6236\u540D</span>
          </label>
          
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="filterExcludeAds"
                   class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500">
            <span class="text-sm text-slate-400">\u6392\u9664\u5EE3\u544A\u865F</span>
          </label>

          <div class="flex-1"></div>

          <!-- \u641C\u7D22 -->
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">\u{1F50D}</span>
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()"
                   placeholder="\u641C\u7D22\u7528\u6236\u540D..."
                   class="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm w-48">
          </div>
        </div>
      </div>

      <!-- \u7528\u6236\u5217\u8868 -->
      <div class="flex-1 overflow-hidden flex gap-4">
        <!-- \u5DE6\u5074\u5217\u8868 -->
        <div class="flex-1 overflow-y-auto">
          @if (isLoading()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
            </div>
          } @else if (filteredUsers().length === 0) {
            <div class="flex flex-col items-center justify-center h-40 text-slate-500">
              <span class="text-4xl mb-2">\u{1F4ED}</span>
              <p>\u66AB\u7121\u6536\u96C6\u7684\u7528\u6236</p>
              <p class="text-sm">\u958B\u555F\u7FA4\u7D44\u76E3\u63A7\u5F8C\uFF0C\u7CFB\u7D71\u6703\u81EA\u52D5\u6536\u96C6\u767C\u8A00\u8005</p>
            </div>
          } @else {
            <div class="grid gap-2">
              @for (user of filteredUsers(); track user.telegram_id) {
                <div (click)="selectUser(user)"
                     class="p-4 rounded-xl cursor-pointer transition-all border"
                     [class.bg-violet-500/10]="selectedUser()?.telegram_id === user.telegram_id"
                     [class.border-violet-500/50]="selectedUser()?.telegram_id === user.telegram_id"
                     [class.bg-slate-800/50]="selectedUser()?.telegram_id !== user.telegram_id"
                     [class.border-slate-700/50]="selectedUser()?.telegram_id !== user.telegram_id"
                     [class.hover:bg-slate-700/50]="selectedUser()?.telegram_id !== user.telegram_id">
                  <div class="flex items-center gap-3">
                    <!-- \u982D\u50CF/\u98A8\u96AA\u6307\u793A -->
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                         [class.bg-emerald-500/20]="user.ad_risk_score < 0.4"
                         [class.bg-amber-500/20]="user.ad_risk_score >= 0.4 && user.ad_risk_score < 0.7"
                         [class.bg-red-500/20]="user.ad_risk_score >= 0.7">
                      @if (user.is_ad_account) {
                        \u{1F6AB}
                      } @else if (user.is_blacklisted) {
                        \u26D4
                      } @else if (!user.has_photo) {
                        \u{1F464}
                      } @else {
                        {{ (user.first_name || user.username || '?')[0].toUpperCase() }}
                      }
                    </div>
                    
                    <!-- \u7528\u6236\u4FE1\u606F -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-white truncate">
                          {{ user.first_name || user.username || 'ID:' + user.telegram_id }}
                        </span>
                        @if (user.username) {
                          <span class="text-xs text-slate-500">@{{ user.username }}</span>
                        }
                        @if (user.is_premium) {
                          <span class="text-xs">\u{1F48E}</span>
                        }
                        @if (user.is_verified) {
                          <span class="text-xs">\u2713</span>
                        }
                      </div>
                      <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>\u{1F4CA} {{ user.message_count }} \u689D\u6D88\u606F</span>
                        <span>\u{1F465} {{ user.groups_count }} \u500B\u7FA4</span>
                      </div>
                    </div>
                    
                    <!-- \u98A8\u96AA\u8A55\u5206 -->
                    <div class="text-right">
                      <div class="text-lg font-bold"
                           [class.text-emerald-400]="user.ad_risk_score < 0.4"
                           [class.text-amber-400]="user.ad_risk_score >= 0.4 && user.ad_risk_score < 0.7"
                           [class.text-red-400]="user.ad_risk_score >= 0.7">
                        {{ (user.ad_risk_score * 100).toFixed(0) }}%
                      </div>
                      <div class="text-xs px-2 py-0.5 rounded"
                           [class.bg-violet-500/20]="user.value_level === 'S'"
                           [class.text-violet-400]="user.value_level === 'S'"
                           [class.bg-blue-500/20]="user.value_level === 'A'"
                           [class.text-blue-400]="user.value_level === 'A'"
                           [class.bg-emerald-500/20]="user.value_level === 'B'"
                           [class.text-emerald-400]="user.value_level === 'B'"
                           [class.bg-slate-500/20]="user.value_level === 'C' || user.value_level === 'D'"
                           [class.text-slate-400]="user.value_level === 'C' || user.value_level === 'D'">
                        {{ user.value_level }}\u7D1A
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- \u53F3\u5074\u8A73\u60C5 -->
        @if (selectedUser()) {
          <div class="w-96 bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 overflow-y-auto">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>\u{1F4CB}</span> \u7528\u6236\u8A73\u60C5
            </h3>

            <!-- \u57FA\u672C\u4FE1\u606F -->
            <div class="space-y-3 mb-6">
              <div class="flex justify-between">
                <span class="text-slate-400">Telegram ID</span>
                <span class="text-white font-mono">{{ selectedUser()!.telegram_id }}</span>
              </div>
              @if (selectedUser()!.username) {
                <div class="flex justify-between">
                  <span class="text-slate-400">\u7528\u6236\u540D</span>
                  <span class="text-cyan-400">@{{ selectedUser()!.username }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-slate-400">\u59D3\u540D</span>
                <span class="text-white">{{ selectedUser()!.first_name }} {{ selectedUser()!.last_name }}</span>
              </div>
            </div>

            <!-- \u98A8\u96AA\u8A55\u4F30 -->
            <div class="bg-slate-700/30 rounded-lg p-3 mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-slate-400">\u5EE3\u544A\u98A8\u96AA</span>
                <span class="text-lg font-bold"
                      [class.text-emerald-400]="selectedUser()!.ad_risk_score < 0.4"
                      [class.text-amber-400]="selectedUser()!.ad_risk_score >= 0.4 && selectedUser()!.ad_risk_score < 0.7"
                      [class.text-red-400]="selectedUser()!.ad_risk_score >= 0.7">
                  {{ (selectedUser()!.ad_risk_score * 100).toFixed(1) }}%
                </span>
              </div>
              <div class="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                <div class="h-full transition-all"
                     [style.width.%]="selectedUser()!.ad_risk_score * 100"
                     [class.bg-emerald-500]="selectedUser()!.ad_risk_score < 0.4"
                     [class.bg-amber-500]="selectedUser()!.ad_risk_score >= 0.4 && selectedUser()!.ad_risk_score < 0.7"
                     [class.bg-red-500]="selectedUser()!.ad_risk_score >= 0.7">
                </div>
              </div>
            </div>

            <!-- \u98A8\u96AA\u56E0\u7D20 -->
            @if (selectedUser()!.risk_factors?.factors?.length) {
              <div class="mb-4">
                <h4 class="text-sm font-medium text-slate-300 mb-2">\u98A8\u96AA\u56E0\u7D20</h4>
                <div class="space-y-1">
                  @for (factor of selectedUser()!.risk_factors.factors; track $index) {
                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-amber-400">\u26A0\uFE0F</span>
                      <span class="text-slate-300">{{ factor.description }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- \u64CD\u4F5C\u6309\u9215 -->
            <div class="space-y-2">
              @if (!selectedUser()!.is_ad_account) {
                <button (click)="markAsAd(true)"
                        class="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                  \u{1F6AB} \u6A19\u8A18\u70BA\u5EE3\u544A\u865F
                </button>
              } @else {
                <button (click)="markAsAd(false)"
                        class="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors">
                  \u2713 \u53D6\u6D88\u5EE3\u544A\u6A19\u8A18
                </button>
              }
              
              @if (!selectedUser()!.is_blacklisted) {
                <button (click)="blacklistUser(true)"
                        class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                  \u26D4 \u52A0\u5165\u9ED1\u540D\u55AE
                </button>
              } @else {
                <button (click)="blacklistUser(false)"
                        class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                  \u21A9\uFE0F \u79FB\u51FA\u9ED1\u540D\u55AE
                </button>
              }
              
              <button (click)="recalculateRisk()"
                      class="w-full px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg transition-colors">
                \u{1F504} \u91CD\u65B0\u8A08\u7B97\u98A8\u96AA
              </button>
              
              @if (selectedUser()!.username) {
                <button (click)="openInTelegram()"
                        class="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                  \u{1F4AC} \u5728 Telegram \u67E5\u770B
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(CollectedUsersComponent, { className: "CollectedUsersComponent", filePath: "src/monitoring/collected-users.component.ts", lineNumber: 416 });
})();

// src/views/monitoring-view.component.ts
var _forTrack08 = ($index, $item) => $item.id;
function MonitoringViewComponent_For_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 5);
    \u0275\u0275listener("click", function MonitoringViewComponent_For_6_Template_button_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.switchTab(tab_r2.id));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("bg-gradient-to-r", ctx_r2.activeTab() === tab_r2.id)("from-cyan-500", ctx_r2.activeTab() === tab_r2.id)("to-blue-500", ctx_r2.activeTab() === tab_r2.id)("text-white", ctx_r2.activeTab() === tab_r2.id)("text-slate-400", ctx_r2.activeTab() !== tab_r2.id)("bg-slate-800/50", ctx_r2.activeTab() !== tab_r2.id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", tab_r2.icon, " ", tab_r2.label, " ");
  }
}
function MonitoringViewComponent_Case_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-monitoring-accounts");
  }
}
function MonitoringViewComponent_Case_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "app-monitoring-groups", 6);
    \u0275\u0275listener("extractMembersEvent", function MonitoringViewComponent_Case_8_Template_app_monitoring_groups_extractMembersEvent_0_listener($event) {
      \u0275\u0275restoreView(_r4);
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.openMemberExtractionDialog($event));
    });
    \u0275\u0275elementEnd();
  }
}
function MonitoringViewComponent_Case_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-keyword-sets");
  }
}
function MonitoringViewComponent_Case_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-trigger-rules");
  }
}
function MonitoringViewComponent_Case_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-chat-templates");
  }
}
function MonitoringViewComponent_Case_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-collected-users");
  }
}
var VIEW_TO_TAB = {
  "monitoring": "groups",
  "monitoring-accounts": "accounts",
  "monitoring-groups": "groups",
  "keyword-sets": "keywords",
  "chat-templates": "templates",
  "trigger-rules": "rules",
  "collected-users": "collected"
};
var TAB_TO_VIEW = {
  "accounts": "monitoring-accounts",
  "groups": "monitoring-groups",
  "keywords": "keyword-sets",
  "templates": "chat-templates",
  "rules": "trigger-rules",
  "collected": "collected-users"
};
var MonitoringViewComponent = class _MonitoringViewComponent {
  constructor() {
    this.i18n = inject(I18nService);
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.dialog = inject(DialogService);
    this.membershipService = inject(MembershipService);
    this.accountService = inject(AccountManagementService);
    this.monitoringState = inject(MonitoringStateService);
    this.tabs = [
      { id: "accounts", icon: "\u{1F464}", label: "\u76E3\u63A7\u5E33\u865F" },
      { id: "groups", icon: "\u{1F465}", label: "\u76E3\u63A7\u7FA4\u7D44" },
      { id: "keywords", icon: "\u{1F511}", label: "\u95DC\u9375\u8A5E\u96C6" },
      { id: "rules", icon: "\u26A1", label: "\u89F8\u767C\u898F\u5247" },
      { id: "templates", icon: "\u{1F4AC}", label: "\u6D88\u606F\u6A21\u677F" },
      { id: "collected", icon: "\u{1F4E5}", label: "\u6536\u96C6\u7528\u6236" }
    ];
    this.activeTab = signal("groups", ...ngDevMode ? [{ debugName: "activeTab" }] : []);
    this.ipcCleanup = [];
    this.viewSyncEffect = effect(() => {
      const currentView = this.nav.currentView();
      const targetTab = VIEW_TO_TAB[currentView];
      if (targetTab && targetTab !== this.activeTab()) {
        console.log(`[MonitoringView] \u8996\u5716\u5207\u63DB: ${currentView} \u2192 Tab: ${targetTab}`);
        this.activeTab.set(targetTab);
      }
    }, ...ngDevMode ? [{ debugName: "viewSyncEffect" }] : []);
  }
  ngOnInit() {
    this.setupIpcListeners();
  }
  ngOnDestroy() {
    this.ipcCleanup.forEach((fn) => fn());
  }
  setupIpcListeners() {
    const cleanup1 = this.ipc.on("monitoring-group-added", () => {
      this.toast.success("\u7FA4\u7D44\u5DF2\u6DFB\u52A0");
    });
    const cleanup2 = this.ipc.on("keyword-set-added", () => {
      this.toast.success("\u95DC\u9375\u8A5E\u96C6\u5DF2\u6DFB\u52A0");
    });
    this.ipcCleanup.push(cleanup1, cleanup2);
  }
  // 選擇帳號
  selectAccount(account) {
    console.log("Selected account:", account);
  }
  // 選擇群組
  selectGroup(group) {
    console.log("Selected group:", group);
  }
  // 選擇關鍵詞集
  selectKeywordSet(keywordSet) {
    console.log("Selected keyword set:", keywordSet);
  }
  // 選擇規則
  selectRule(rule) {
    console.log("Selected rule:", rule);
  }
  // 選擇模板
  selectTemplate(template) {
    console.log("Selected template:", template);
  }
  // 添加群組
  addGroup() {
    this.dialog.openJoinMonitor({});
  }
  // 添加關鍵詞集
  addKeywordSet() {
    this.ipc.send("open-add-keyword-set-dialog");
  }
  // 添加規則
  addRule() {
    this.ipc.send("open-add-rule-dialog");
  }
  // 添加模板
  addTemplate() {
    this.ipc.send("open-add-template-dialog");
  }
  // 🔧 P0: Tab 切換方法（雙向同步）
  switchTab(tabId) {
    this.activeTab.set(tabId);
    const targetView = TAB_TO_VIEW[tabId];
    if (targetView && this.nav.currentView() !== targetView) {
      this.nav.navigateTo(targetView);
    }
  }
  // 翻譯方法
  t(key, params) {
    return this.i18n.t(key, params);
  }
  // 🔧 P0: 打開成員提取對話框
  openMemberExtractionDialog(group) {
    console.log("[MonitoringView] Opening member extraction dialog for:", group);
    this.dialog.openMemberExtraction(group);
  }
  static {
    this.\u0275fac = function MonitoringViewComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MonitoringViewComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _MonitoringViewComponent, selectors: [["app-monitoring-view"]], decls: 13, vars: 1, consts: [[1, "page-content"], [1, "flex", "items-center", "justify-between", "mb-6"], [1, "text-4xl", "font-bold", 2, "color", "var(--text-primary)"], [1, "flex", "items-center", "gap-2"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "bg-gradient-to-r", "from-cyan-500", "to-blue-500", "text-white", "text-slate-400", "bg-slate-800/50"], [1, "px-4", "py-2", "rounded-lg", "text-sm", "font-medium", "transition-all", 3, "click"], [3, "extractMembersEvent"]], template: function MonitoringViewComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "h2", 2);
        \u0275\u0275text(3, "\u76E3\u63A7\u4E2D\u5FC3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "div", 3);
        \u0275\u0275repeaterCreate(5, MonitoringViewComponent_For_6_Template, 2, 14, "button", 4, _forTrack08);
        \u0275\u0275elementEnd()();
        \u0275\u0275conditionalCreate(7, MonitoringViewComponent_Case_7_Template, 1, 0, "app-monitoring-accounts")(8, MonitoringViewComponent_Case_8_Template, 1, 0, "app-monitoring-groups")(9, MonitoringViewComponent_Case_9_Template, 1, 0, "app-keyword-sets")(10, MonitoringViewComponent_Case_10_Template, 1, 0, "app-trigger-rules")(11, MonitoringViewComponent_Case_11_Template, 1, 0, "app-chat-templates")(12, MonitoringViewComponent_Case_12_Template, 1, 0, "app-collected-users");
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        let tmp_1_0;
        \u0275\u0275advance(5);
        \u0275\u0275repeater(ctx.tabs);
        \u0275\u0275advance(2);
        \u0275\u0275conditional((tmp_1_0 = ctx.activeTab()) === "accounts" ? 7 : tmp_1_0 === "groups" ? 8 : tmp_1_0 === "keywords" ? 9 : tmp_1_0 === "rules" ? 10 : tmp_1_0 === "templates" ? 11 : tmp_1_0 === "collected" ? 12 : -1);
      }
    }, dependencies: [
      CommonModule,
      FormsModule,
      MonitoringGroupsComponent,
      KeywordSetsComponent,
      TriggerRulesComponent,
      ChatTemplatesComponent,
      MonitoringAccountsComponent,
      CollectedUsersComponent
    ], encapsulation: 2, changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MonitoringViewComponent, [{
    type: Component,
    args: [{
      selector: "app-monitoring-view",
      standalone: true,
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [
        CommonModule,
        FormsModule,
        MonitoringGroupsComponent,
        KeywordSetsComponent,
        TriggerRulesComponent,
        ChatTemplatesComponent,
        MonitoringAccountsComponent,
        CollectedUsersComponent
      ],
      template: `
    <div class="page-content">
      <!-- \u9801\u9762\u6A19\u984C -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-4xl font-bold" style="color: var(--text-primary);">\u76E3\u63A7\u4E2D\u5FC3</h2>
        <div class="flex items-center gap-2">
          @for (tab of tabs; track tab.id) {
            <button (click)="switchTab(tab.id)"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-cyan-500]="activeTab() === tab.id"
                    [class.to-blue-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.bg-slate-800/50]="activeTab() !== tab.id">
              {{ tab.icon }} {{ tab.label }}
            </button>
          }
        </div>
      </div>
      
      <!-- \u6A19\u7C64\u9801\u5167\u5BB9\uFF08\u5B50\u7D44\u4EF6\u81EA\u884C\u5F9E MonitoringStateService \u7372\u53D6\u6578\u64DA\uFF09 -->
      @switch (activeTab()) {
        @case ('accounts') {
          <app-monitoring-accounts></app-monitoring-accounts>
        }
        @case ('groups') {
          <app-monitoring-groups 
            (extractMembersEvent)="openMemberExtractionDialog($event)">
          </app-monitoring-groups>
        }
        @case ('keywords') {
          <app-keyword-sets></app-keyword-sets>
        }
        @case ('rules') {
          <app-trigger-rules></app-trigger-rules>
        }
        @case ('templates') {
          <app-chat-templates></app-chat-templates>
        }
        @case ('collected') {
          <app-collected-users></app-collected-users>
        }
      }
    </div>
  `
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(MonitoringViewComponent, { className: "MonitoringViewComponent", filePath: "src/views/monitoring-view.component.ts", lineNumber: 108 });
})();

export {
  ConfirmDialogService,
  MonitoringViewComponent
};
//# sourceMappingURL=chunk-4B5ERMTO.js.map
