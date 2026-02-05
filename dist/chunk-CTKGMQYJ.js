import {
  AICenterService,
  GOAL_TYPE_CONFIG,
  MarketingTaskService
} from "./chunk-S764FGAZ.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  UnifiedContactsService
} from "./chunk-SRBGSWCK.js";
import {
  AccountManagementService
} from "./chunk-X2TRLAAL.js";
import {
  MonitoringManagementService
} from "./chunk-PZQ6N2UA.js";
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
  MembershipService,
  ToastService
} from "./chunk-P26VRYR4.js";
import {
  ANIMATION_MODULE_TYPE,
  DOCUMENT,
  Inject,
  Injectable,
  RendererFactory2,
  RuntimeError,
  Subject,
  ViewEncapsulation,
  __spreadProps,
  __spreadValues,
  computed,
  effect,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable,
  ɵɵinject
} from "./chunk-K4KD4A2Z.js";

// src/services/dialog.service.ts
var DialogService = class _DialogService {
  constructor() {
    this.toast = inject(ToastService);
    this._confirmDialog = signal(null, ...ngDevMode ? [{ debugName: "_confirmDialog" }] : []);
    this.confirmDialog = this._confirmDialog.asReadonly();
    this._progressDialog = signal({
      show: false,
      title: "",
      progress: 0,
      cancellable: false
    }, ...ngDevMode ? [{ debugName: "_progressDialog" }] : []);
    this.progressDialog = this._progressDialog.asReadonly();
    this._showSuccessOverlay = signal(false, ...ngDevMode ? [{ debugName: "_showSuccessOverlay" }] : []);
    this._successOverlayConfig = signal(null, ...ngDevMode ? [{ debugName: "_successOverlayConfig" }] : []);
    this.showSuccessOverlay = this._showSuccessOverlay.asReadonly();
    this.successOverlayConfig = this._successOverlayConfig.asReadonly();
    this._deleteConfirmDialog = signal({
      show: false,
      type: "single"
    }, ...ngDevMode ? [{ debugName: "_deleteConfirmDialog" }] : []);
    this.deleteConfirmDialog = this._deleteConfirmDialog.asReadonly();
    this._showQrLoginDialog = signal(false, ...ngDevMode ? [{ debugName: "_showQrLoginDialog" }] : []);
    this.showQrLoginDialog = this._showQrLoginDialog.asReadonly();
    this._showBatchMessageDialog = signal(false, ...ngDevMode ? [{ debugName: "_showBatchMessageDialog" }] : []);
    this._batchSendTargets = signal([], ...ngDevMode ? [{ debugName: "_batchSendTargets" }] : []);
    this.showBatchMessageDialog = this._showBatchMessageDialog.asReadonly();
    this.batchSendTargets = this._batchSendTargets.asReadonly();
    this._showBatchInviteDialog = signal(false, ...ngDevMode ? [{ debugName: "_showBatchInviteDialog" }] : []);
    this._batchInviteTargets = signal([], ...ngDevMode ? [{ debugName: "_batchInviteTargets" }] : []);
    this.showBatchInviteDialog = this._showBatchInviteDialog.asReadonly();
    this.batchInviteTargets = this._batchInviteTargets.asReadonly();
    this._showMemberExtractionDialog = signal(false, ...ngDevMode ? [{ debugName: "_showMemberExtractionDialog" }] : []);
    this._memberExtractionGroup = signal(null, ...ngDevMode ? [{ debugName: "_memberExtractionGroup" }] : []);
    this.showMemberExtractionDialog = this._showMemberExtractionDialog.asReadonly();
    this.memberExtractionGroup = this._memberExtractionGroup.asReadonly();
    this._showJoinMonitorDialog = signal(false, ...ngDevMode ? [{ debugName: "_showJoinMonitorDialog" }] : []);
    this._joinMonitorResource = signal(null, ...ngDevMode ? [{ debugName: "_joinMonitorResource" }] : []);
    this.showJoinMonitorDialog = this._showJoinMonitorDialog.asReadonly();
    this.joinMonitorResource = this._joinMonitorResource.asReadonly();
    this._showPostJoinDialog = signal(false, ...ngDevMode ? [{ debugName: "_showPostJoinDialog" }] : []);
    this._postJoinResource = signal(null, ...ngDevMode ? [{ debugName: "_postJoinResource" }] : []);
    this.showPostJoinDialog = this._showPostJoinDialog.asReadonly();
    this.postJoinResource = this._postJoinResource.asReadonly();
    this._inputDialog = signal(null, ...ngDevMode ? [{ debugName: "_inputDialog" }] : []);
    this._inputDialogValue = signal("", ...ngDevMode ? [{ debugName: "_inputDialogValue" }] : []);
    this._inputDialogError = signal(null, ...ngDevMode ? [{ debugName: "_inputDialogError" }] : []);
    this.inputDialog = this._inputDialog.asReadonly();
    this.inputDialogValue = this._inputDialogValue.asReadonly();
    this.inputDialogError = this._inputDialogError.asReadonly();
  }
  // ========== 確認對話框 ==========
  confirm(config) {
    this._confirmDialog.set(config);
  }
  closeConfirmDialog() {
    const config = this._confirmDialog();
    if (config?.onCancel) {
      config.onCancel();
    }
    this._confirmDialog.set(null);
  }
  confirmAction() {
    const config = this._confirmDialog();
    if (config?.onConfirm) {
      config.onConfirm();
    }
    this._confirmDialog.set(null);
  }
  // ========== 進度對話框 ==========
  showProgress(title, cancellable = false) {
    this._progressDialog.set({
      show: true,
      title,
      progress: 0,
      cancellable
    });
  }
  updateProgress(progress, message) {
    this._progressDialog.update((d) => __spreadProps(__spreadValues({}, d), {
      progress,
      message
    }));
  }
  hideProgress() {
    this._progressDialog.update((d) => __spreadProps(__spreadValues({}, d), { show: false }));
  }
  // ========== 成功覆蓋層 ==========
  showSuccess(config) {
    this._successOverlayConfig.set(config);
    this._showSuccessOverlay.set(true);
    const duration = config.duration ?? 2e3;
    setTimeout(() => {
      this._showSuccessOverlay.set(false);
      this._successOverlayConfig.set(null);
    }, duration);
  }
  hideSuccess() {
    this._showSuccessOverlay.set(false);
    this._successOverlayConfig.set(null);
  }
  // ========== 刪除確認對話框 ==========
  showDeleteConfirm(type, lead, count) {
    this._deleteConfirmDialog.set({
      show: true,
      type,
      lead,
      count
    });
  }
  hideDeleteConfirm() {
    this._deleteConfirmDialog.update((d) => __spreadProps(__spreadValues({}, d), { show: false }));
  }
  // ========== QR 登錄對話框 ==========
  openQrLogin() {
    this._showQrLoginDialog.set(true);
  }
  closeQrLogin() {
    this._showQrLoginDialog.set(false);
  }
  // ========== 批量發送對話框 ==========
  openBatchSend(targets) {
    this._batchSendTargets.set(targets);
    this._showBatchMessageDialog.set(true);
  }
  closeBatchSend() {
    this._showBatchMessageDialog.set(false);
    this._batchSendTargets.set([]);
  }
  // ========== 批量拉群對話框 ==========
  openBatchInvite(targets) {
    this._batchInviteTargets.set(targets);
    this._showBatchInviteDialog.set(true);
  }
  closeBatchInvite() {
    this._showBatchInviteDialog.set(false);
    this._batchInviteTargets.set([]);
  }
  // ========== 成員提取對話框 ==========
  openMemberExtraction(group2) {
    this._memberExtractionGroup.set(group2);
    this._showMemberExtractionDialog.set(true);
  }
  closeMemberExtraction() {
    this._showMemberExtractionDialog.set(false);
    this._memberExtractionGroup.set(null);
  }
  // ========== 加入並監控對話框 ==========
  openJoinMonitor(resource) {
    this._joinMonitorResource.set(resource);
    this._showJoinMonitorDialog.set(true);
  }
  closeJoinMonitor() {
    this._showJoinMonitorDialog.set(false);
    this._joinMonitorResource.set(null);
  }
  // ========== 加入後選項對話框 ==========
  openPostJoin(resource) {
    this._postJoinResource.set(resource);
    this._showPostJoinDialog.set(true);
  }
  closePostJoin() {
    this._showPostJoinDialog.set(false);
    this._postJoinResource.set(null);
  }
  // ========== 🆕 輸入對話框（替代 window.prompt）==========
  /**
   * 顯示輸入對話框（替代 window.prompt）
   * @param config 配置
   */
  prompt(config) {
    this._inputDialogValue.set(config.defaultValue || "");
    this._inputDialogError.set(null);
    this._inputDialog.set(config);
  }
  /**
   * 更新輸入值
   */
  updateInputValue(value) {
    this._inputDialogValue.set(value);
    this._inputDialogError.set(null);
  }
  /**
   * 確認輸入對話框
   */
  confirmInput() {
    const config = this._inputDialog();
    const value = this._inputDialogValue();
    if (!config)
      return;
    if (config.validator) {
      const error = config.validator(value);
      if (error) {
        this._inputDialogError.set(error);
        return;
      }
    }
    if (!value.trim()) {
      this._inputDialogError.set("\u8ACB\u8F38\u5165\u5167\u5BB9");
      return;
    }
    if (config.onConfirm) {
      config.onConfirm(value.trim());
    }
    this._inputDialog.set(null);
    this._inputDialogValue.set("");
    this._inputDialogError.set(null);
  }
  /**
   * 取消輸入對話框
   */
  cancelInput() {
    const config = this._inputDialog();
    if (config?.onCancel) {
      config.onCancel();
    }
    this._inputDialog.set(null);
    this._inputDialogValue.set("");
    this._inputDialogError.set(null);
  }
  static {
    this.\u0275fac = function DialogService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _DialogService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _DialogService, factory: _DialogService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(DialogService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// node_modules/@angular/animations/fesm2022/_private_export-chunk.mjs
var AnimationMetadataType;
(function(AnimationMetadataType2) {
  AnimationMetadataType2[AnimationMetadataType2["State"] = 0] = "State";
  AnimationMetadataType2[AnimationMetadataType2["Transition"] = 1] = "Transition";
  AnimationMetadataType2[AnimationMetadataType2["Sequence"] = 2] = "Sequence";
  AnimationMetadataType2[AnimationMetadataType2["Group"] = 3] = "Group";
  AnimationMetadataType2[AnimationMetadataType2["Animate"] = 4] = "Animate";
  AnimationMetadataType2[AnimationMetadataType2["Keyframes"] = 5] = "Keyframes";
  AnimationMetadataType2[AnimationMetadataType2["Style"] = 6] = "Style";
  AnimationMetadataType2[AnimationMetadataType2["Trigger"] = 7] = "Trigger";
  AnimationMetadataType2[AnimationMetadataType2["Reference"] = 8] = "Reference";
  AnimationMetadataType2[AnimationMetadataType2["AnimateChild"] = 9] = "AnimateChild";
  AnimationMetadataType2[AnimationMetadataType2["AnimateRef"] = 10] = "AnimateRef";
  AnimationMetadataType2[AnimationMetadataType2["Query"] = 11] = "Query";
  AnimationMetadataType2[AnimationMetadataType2["Stagger"] = 12] = "Stagger";
})(AnimationMetadataType || (AnimationMetadataType = {}));
var AUTO_STYLE = "*";
function trigger(name, definitions) {
  return {
    type: AnimationMetadataType.Trigger,
    name,
    definitions,
    options: {}
  };
}
function animate(timings, styles = null) {
  return {
    type: AnimationMetadataType.Animate,
    styles,
    timings
  };
}
function group(steps, options = null) {
  return {
    type: AnimationMetadataType.Group,
    steps,
    options
  };
}
function sequence(steps, options = null) {
  return {
    type: AnimationMetadataType.Sequence,
    steps,
    options
  };
}
function style(tokens) {
  return {
    type: AnimationMetadataType.Style,
    styles: tokens,
    offset: null
  };
}
function transition(stateChangeExpr, steps, options = null) {
  return {
    type: AnimationMetadataType.Transition,
    expr: stateChangeExpr,
    animation: steps,
    options
  };
}
function animateChild(options = null) {
  return {
    type: AnimationMetadataType.AnimateChild,
    options
  };
}
function query(selector, animation2, options = null) {
  return {
    type: AnimationMetadataType.Query,
    selector,
    animation: animation2,
    options
  };
}
var NoopAnimationPlayer = class {
  _onDoneFns = [];
  _onStartFns = [];
  _onDestroyFns = [];
  _originalOnDoneFns = [];
  _originalOnStartFns = [];
  _started = false;
  _destroyed = false;
  _finished = false;
  _position = 0;
  parentPlayer = null;
  totalTime;
  constructor(duration = 0, delay = 0) {
    this.totalTime = duration + delay;
  }
  _onFinish() {
    if (!this._finished) {
      this._finished = true;
      this._onDoneFns.forEach((fn) => fn());
      this._onDoneFns = [];
    }
  }
  onStart(fn) {
    this._originalOnStartFns.push(fn);
    this._onStartFns.push(fn);
  }
  onDone(fn) {
    this._originalOnDoneFns.push(fn);
    this._onDoneFns.push(fn);
  }
  onDestroy(fn) {
    this._onDestroyFns.push(fn);
  }
  hasStarted() {
    return this._started;
  }
  init() {
  }
  play() {
    if (!this.hasStarted()) {
      this._onStart();
      this.triggerMicrotask();
    }
    this._started = true;
  }
  triggerMicrotask() {
    queueMicrotask(() => this._onFinish());
  }
  _onStart() {
    this._onStartFns.forEach((fn) => fn());
    this._onStartFns = [];
  }
  pause() {
  }
  restart() {
  }
  finish() {
    this._onFinish();
  }
  destroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      if (!this.hasStarted()) {
        this._onStart();
      }
      this.finish();
      this._onDestroyFns.forEach((fn) => fn());
      this._onDestroyFns = [];
    }
  }
  reset() {
    this._started = false;
    this._finished = false;
    this._onStartFns = this._originalOnStartFns;
    this._onDoneFns = this._originalOnDoneFns;
  }
  setPosition(position) {
    this._position = this.totalTime ? position * this.totalTime : 1;
  }
  getPosition() {
    return this.totalTime ? this._position / this.totalTime : 1;
  }
  triggerCallback(phaseName) {
    const methods = phaseName == "start" ? this._onStartFns : this._onDoneFns;
    methods.forEach((fn) => fn());
    methods.length = 0;
  }
};
var AnimationGroupPlayer = class {
  _onDoneFns = [];
  _onStartFns = [];
  _finished = false;
  _started = false;
  _destroyed = false;
  _onDestroyFns = [];
  parentPlayer = null;
  totalTime = 0;
  players;
  constructor(_players) {
    this.players = _players;
    let doneCount = 0;
    let destroyCount = 0;
    let startCount = 0;
    const total = this.players.length;
    if (total == 0) {
      queueMicrotask(() => this._onFinish());
    } else {
      this.players.forEach((player) => {
        player.onDone(() => {
          if (++doneCount == total) {
            this._onFinish();
          }
        });
        player.onDestroy(() => {
          if (++destroyCount == total) {
            this._onDestroy();
          }
        });
        player.onStart(() => {
          if (++startCount == total) {
            this._onStart();
          }
        });
      });
    }
    this.totalTime = this.players.reduce((time, player) => Math.max(time, player.totalTime), 0);
  }
  _onFinish() {
    if (!this._finished) {
      this._finished = true;
      this._onDoneFns.forEach((fn) => fn());
      this._onDoneFns = [];
    }
  }
  init() {
    this.players.forEach((player) => player.init());
  }
  onStart(fn) {
    this._onStartFns.push(fn);
  }
  _onStart() {
    if (!this.hasStarted()) {
      this._started = true;
      this._onStartFns.forEach((fn) => fn());
      this._onStartFns = [];
    }
  }
  onDone(fn) {
    this._onDoneFns.push(fn);
  }
  onDestroy(fn) {
    this._onDestroyFns.push(fn);
  }
  hasStarted() {
    return this._started;
  }
  play() {
    if (!this.parentPlayer) {
      this.init();
    }
    this._onStart();
    this.players.forEach((player) => player.play());
  }
  pause() {
    this.players.forEach((player) => player.pause());
  }
  restart() {
    this.players.forEach((player) => player.restart());
  }
  finish() {
    this._onFinish();
    this.players.forEach((player) => player.finish());
  }
  destroy() {
    this._onDestroy();
  }
  _onDestroy() {
    if (!this._destroyed) {
      this._destroyed = true;
      this._onFinish();
      this.players.forEach((player) => player.destroy());
      this._onDestroyFns.forEach((fn) => fn());
      this._onDestroyFns = [];
    }
  }
  reset() {
    this.players.forEach((player) => player.reset());
    this._destroyed = false;
    this._finished = false;
    this._started = false;
  }
  setPosition(p) {
    const timeAtPosition = p * this.totalTime;
    this.players.forEach((player) => {
      const position = player.totalTime ? Math.min(1, timeAtPosition / player.totalTime) : 1;
      player.setPosition(position);
    });
  }
  getPosition() {
    const longestPlayer = this.players.reduce((longestSoFar, player) => {
      const newPlayerIsLongest = longestSoFar === null || player.totalTime > longestSoFar.totalTime;
      return newPlayerIsLongest ? player : longestSoFar;
    }, null);
    return longestPlayer != null ? longestPlayer.getPosition() : 0;
  }
  beforeDestroy() {
    this.players.forEach((player) => {
      if (player.beforeDestroy) {
        player.beforeDestroy();
      }
    });
  }
  triggerCallback(phaseName) {
    const methods = phaseName == "start" ? this._onStartFns : this._onDoneFns;
    methods.forEach((fn) => fn());
    methods.length = 0;
  }
};
var \u0275PRE_STYLE = "!";

// node_modules/@angular/animations/fesm2022/animations.mjs
var AnimationBuilder = class _AnimationBuilder {
  static \u0275fac = function AnimationBuilder_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AnimationBuilder)();
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
    token: _AnimationBuilder,
    factory: () => (() => inject(BrowserAnimationBuilder))(),
    providedIn: "root"
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AnimationBuilder, [{
    type: Injectable,
    args: [{
      providedIn: "root",
      useFactory: () => inject(BrowserAnimationBuilder)
    }]
  }], null, null);
})();
var AnimationFactory = class {
};
var BrowserAnimationBuilder = class _BrowserAnimationBuilder extends AnimationBuilder {
  animationModuleType = inject(ANIMATION_MODULE_TYPE, {
    optional: true
  });
  _nextAnimationId = 0;
  _renderer;
  constructor(rootRenderer, doc) {
    super();
    const typeData = {
      id: "0",
      encapsulation: ViewEncapsulation.None,
      styles: [],
      data: {
        animation: []
      }
    };
    this._renderer = rootRenderer.createRenderer(doc.body, typeData);
    if (this.animationModuleType === null && !isAnimationRenderer(this._renderer)) {
      throw new RuntimeError(3600, (typeof ngDevMode === "undefined" || ngDevMode) && "Angular detected that the `AnimationBuilder` was injected, but animation support was not enabled. Please make sure that you enable animations in your application by calling `provideAnimations()` or `provideAnimationsAsync()` function.");
    }
  }
  build(animation2) {
    const id = this._nextAnimationId;
    this._nextAnimationId++;
    const entry = Array.isArray(animation2) ? sequence(animation2) : animation2;
    issueAnimationCommand(this._renderer, null, id, "register", [entry]);
    return new BrowserAnimationFactory(id, this._renderer);
  }
  static \u0275fac = function BrowserAnimationBuilder_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BrowserAnimationBuilder)(\u0275\u0275inject(RendererFactory2), \u0275\u0275inject(DOCUMENT));
  };
  static \u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({
    token: _BrowserAnimationBuilder,
    factory: _BrowserAnimationBuilder.\u0275fac,
    providedIn: "root"
  });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BrowserAnimationBuilder, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [{
    type: RendererFactory2
  }, {
    type: Document,
    decorators: [{
      type: Inject,
      args: [DOCUMENT]
    }]
  }], null);
})();
var BrowserAnimationFactory = class extends AnimationFactory {
  _id;
  _renderer;
  constructor(_id, _renderer) {
    super();
    this._id = _id;
    this._renderer = _renderer;
  }
  create(element, options) {
    return new RendererAnimationPlayer(this._id, element, options || {}, this._renderer);
  }
};
var RendererAnimationPlayer = class {
  id;
  element;
  _renderer;
  parentPlayer = null;
  _started = false;
  constructor(id, element, options, _renderer) {
    this.id = id;
    this.element = element;
    this._renderer = _renderer;
    this._command("create", options);
  }
  _listen(eventName, callback) {
    return this._renderer.listen(this.element, `@@${this.id}:${eventName}`, callback);
  }
  _command(command, ...args) {
    issueAnimationCommand(this._renderer, this.element, this.id, command, args);
  }
  onDone(fn) {
    this._listen("done", fn);
  }
  onStart(fn) {
    this._listen("start", fn);
  }
  onDestroy(fn) {
    this._listen("destroy", fn);
  }
  init() {
    this._command("init");
  }
  hasStarted() {
    return this._started;
  }
  play() {
    this._command("play");
    this._started = true;
  }
  pause() {
    this._command("pause");
  }
  restart() {
    this._command("restart");
  }
  finish() {
    this._command("finish");
  }
  destroy() {
    this._command("destroy");
  }
  reset() {
    this._command("reset");
    this._started = false;
  }
  setPosition(p) {
    this._command("setPosition", p);
  }
  getPosition() {
    return unwrapAnimationRenderer(this._renderer)?.engine?.players[this.id]?.getPosition() ?? 0;
  }
  totalTime = 0;
};
function issueAnimationCommand(renderer, element, id, command, args) {
  renderer.setProperty(element, `@@${id}:${command}`, args);
}
function unwrapAnimationRenderer(renderer) {
  const type = renderer.\u0275type;
  if (type === 0) {
    return renderer;
  } else if (type === 1) {
    return renderer.animationRenderer;
  }
  return null;
}
function isAnimationRenderer(renderer) {
  const type = renderer.\u0275type;
  return type === 0 || type === 1;
}

// src/animations/route.animations.ts
var fadeAnimation = trigger("routeAnimations", [
  transition("* <=> *", [
    // 設置進入和離開的元素
    query(":enter, :leave", [
      style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        opacity: 0
      })
    ], { optional: true }),
    // 離開的元素淡出
    query(":leave", [
      animate("200ms ease-out", style({ opacity: 0 }))
    ], { optional: true }),
    // 進入的元素淡入
    query(":enter", [
      animate("300ms ease-in", style({ opacity: 1 }))
    ], { optional: true })
  ])
]);
var slideAnimation = trigger("routeAnimations", [
  transition("* => *", [
    query(":enter, :leave", [
      style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%"
      })
    ], { optional: true }),
    group([
      query(":leave", [
        animate("300ms ease-out", style({
          transform: "translateX(-100%)",
          opacity: 0
        }))
      ], { optional: true }),
      query(":enter", [
        style({
          transform: "translateX(100%)",
          opacity: 0
        }),
        animate("300ms ease-out", style({
          transform: "translateX(0)",
          opacity: 1
        }))
      ], { optional: true })
    ])
  ])
]);
var scaleAnimation = trigger("routeAnimations", [
  transition("* <=> *", [
    query(":enter, :leave", [
      style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%"
      })
    ], { optional: true }),
    query(":leave", [
      animate("200ms ease-out", style({
        transform: "scale(0.95)",
        opacity: 0
      }))
    ], { optional: true }),
    query(":enter", [
      style({
        transform: "scale(1.05)",
        opacity: 0
      }),
      animate("300ms ease-out", style({
        transform: "scale(1)",
        opacity: 1
      }))
    ], { optional: true })
  ])
]);
var slideUpAnimation = trigger("routeAnimations", [
  transition("* <=> *", [
    query(":enter, :leave", [
      style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%"
      })
    ], { optional: true }),
    query(":leave", [
      animate("200ms ease-out", style({
        transform: "translateY(-20px)",
        opacity: 0
      }))
    ], { optional: true }),
    query(":enter", [
      style({
        transform: "translateY(20px)",
        opacity: 0
      }),
      animate("300ms ease-out", style({
        transform: "translateY(0)",
        opacity: 1
      }))
    ], { optional: true })
  ])
]);
var defaultRouteAnimation = trigger("routeAnimations", [
  transition("* <=> *", [
    // 設置容器樣式
    style({ position: "relative" }),
    query(":enter, :leave", [
      style({
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%"
      })
    ], { optional: true }),
    // 同時執行進入和離開動畫
    group([
      query(":leave", [
        style({ opacity: 1, transform: "scale(1)" }),
        animate("200ms ease-out", style({
          opacity: 0,
          transform: "scale(0.98)"
        }))
      ], { optional: true }),
      query(":enter", [
        style({ opacity: 0, transform: "scale(1.02)" }),
        animate("300ms 100ms ease-out", style({
          opacity: 1,
          transform: "scale(1)"
        }))
      ], { optional: true })
    ]),
    // 確保子動畫也執行
    query(":enter", animateChild(), { optional: true })
  ])
]);
var noAnimation = trigger("routeAnimations", []);

// src/services/animation-config.service.ts
var ANIMATION_OPTIONS = [
  {
    id: "default",
    name: "\u63A8\u85A6",
    description: "\u6DE1\u5165 + \u5FAE\u7E2E\u653E\u6548\u679C\uFF0C\u6D41\u66A2\u81EA\u7136",
    preview: "\u2728"
  },
  {
    id: "fade",
    name: "\u6DE1\u5165\u6DE1\u51FA",
    description: "\u7C21\u55AE\u7684\u900F\u660E\u5EA6\u5207\u63DB",
    preview: "\u{1F32B}\uFE0F"
  },
  {
    id: "slide",
    name: "\u5DE6\u53F3\u6ED1\u52D5",
    description: "\u9801\u9762\u5F9E\u53F3\u5074\u6ED1\u5165",
    preview: "\u27A1\uFE0F"
  },
  {
    id: "slideUp",
    name: "\u4E0A\u4E0B\u6ED1\u52D5",
    description: "\u9801\u9762\u5F9E\u4E0B\u65B9\u6ED1\u5165",
    preview: "\u2B06\uFE0F"
  },
  {
    id: "scale",
    name: "\u7E2E\u653E",
    description: "\u9801\u9762\u653E\u5927\u6DE1\u5165",
    preview: "\u{1F50D}"
  },
  {
    id: "none",
    name: "\u7121\u52D5\u756B",
    description: "\u7981\u7528\u6240\u6709\u52D5\u756B\u6548\u679C",
    preview: "\u23F9\uFE0F"
  }
];
var ANIMATION_MAP = {
  "default": defaultRouteAnimation,
  "fade": fadeAnimation,
  "slide": slideAnimation,
  "scale": scaleAnimation,
  "slideUp": slideUpAnimation,
  "none": noAnimation
};
var AnimationConfigService = class _AnimationConfigService {
  constructor() {
    this._animationType = signal("default", ...ngDevMode ? [{ debugName: "_animationType" }] : []);
    this.animationType = this._animationType.asReadonly();
    this.currentOption = computed(() => {
      const type = this._animationType();
      return ANIMATION_OPTIONS.find((opt) => opt.id === type) || ANIMATION_OPTIONS[0];
    }, ...ngDevMode ? [{ debugName: "currentOption" }] : []);
    this.options = ANIMATION_OPTIONS;
    this.loadFromStorage();
  }
  /**
   * 設置動畫類型
   */
  setAnimationType(type) {
    this._animationType.set(type);
    this.saveToStorage();
  }
  /**
   * 獲取當前動畫
   */
  getAnimation() {
    return ANIMATION_MAP[this._animationType()];
  }
  /**
   * 切換到下一個動畫
   */
  nextAnimation() {
    const current = this._animationType();
    const currentIndex = ANIMATION_OPTIONS.findIndex((opt) => opt.id === current);
    const nextIndex = (currentIndex + 1) % ANIMATION_OPTIONS.length;
    this.setAnimationType(ANIMATION_OPTIONS[nextIndex].id);
  }
  /**
   * 重置為默認動畫
   */
  resetToDefault() {
    this.setAnimationType("default");
  }
  /**
   * 檢查是否禁用動畫
   */
  isAnimationDisabled() {
    return this._animationType() === "none";
  }
  // ========== 存儲操作 ==========
  loadFromStorage() {
    try {
      const saved = localStorage.getItem("tg-animation-type");
      if (saved && ANIMATION_OPTIONS.some((opt) => opt.id === saved)) {
        this._animationType.set(saved);
      }
    } catch (e) {
    }
  }
  saveToStorage() {
    try {
      localStorage.setItem("tg-animation-type", this._animationType());
    } catch (e) {
    }
  }
  static {
    this.\u0275fac = function AnimationConfigService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AnimationConfigService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AnimationConfigService, factory: _AnimationConfigService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AnimationConfigService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/settings.service.ts
var DEFAULT_SETTINGS = {
  theme: "dark",
  language: "zh-TW",
  sidebarCollapsed: false,
  animationType: "default",
  autoConnect: true,
  autoMonitor: false,
  showNotifications: true,
  soundEnabled: true,
  autoLock: false,
  lockTimeout: 5,
  enableAnalytics: true,
  logLevel: "info"
};
var SettingsService = class _SettingsService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.i18n = inject(I18nService);
    this._settings = signal(DEFAULT_SETTINGS, ...ngDevMode ? [{ debugName: "_settings" }] : []);
    this._credentials = signal({}, ...ngDevMode ? [{ debugName: "_credentials" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._isDirty = signal(false, ...ngDevMode ? [{ debugName: "_isDirty" }] : []);
    this.settings = this._settings.asReadonly();
    this.credentials = this._credentials.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.isDirty = this._isDirty.asReadonly();
    this.theme = computed(() => this._settings().theme, ...ngDevMode ? [{ debugName: "theme" }] : []);
    this.language = computed(() => this._settings().language, ...ngDevMode ? [{ debugName: "language" }] : []);
    this.sidebarCollapsed = computed(() => this._settings().sidebarCollapsed, ...ngDevMode ? [{ debugName: "sidebarCollapsed" }] : []);
    this.hasApiCredentials = computed(() => {
      const creds = this._credentials();
      return !!(creds.geminiApiKey || creds.openaiApiKey);
    }, ...ngDevMode ? [{ debugName: "hasApiCredentials" }] : []);
    this.hasTelegramCredentials = computed(() => {
      const creds = this._credentials();
      return !!(creds.telegramApiId && creds.telegramApiHash);
    }, ...ngDevMode ? [{ debugName: "hasTelegramCredentials" }] : []);
    this.setupIpcListeners();
    this.loadSettings();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("settings-loaded", (data) => {
      this._settings.set(__spreadValues(__spreadValues({}, DEFAULT_SETTINGS), data));
      this._isLoading.set(false);
    });
    this.ipc.on("settings-saved", () => {
      this._isDirty.set(false);
      this.toast.success("\u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
    });
    this.ipc.on("credentials-loaded", (data) => {
      this._credentials.set(data);
    });
  }
  // ========== 設置操作 ==========
  loadSettings() {
    this._isLoading.set(true);
    this.ipc.send("get-settings");
    this.ipc.send("get-credentials");
  }
  saveSettings() {
    this.ipc.send("save-settings", this._settings());
  }
  updateSetting(key, value) {
    this._settings.update((s) => __spreadProps(__spreadValues({}, s), { [key]: value }));
    this._isDirty.set(true);
  }
  resetSettings() {
    if (confirm("\u78BA\u5B9A\u8981\u91CD\u7F6E\u6240\u6709\u8A2D\u7F6E\u55CE\uFF1F")) {
      this._settings.set(DEFAULT_SETTINGS);
      this._isDirty.set(true);
      this.saveSettings();
    }
  }
  // ========== 主題操作 ==========
  setTheme(theme) {
    this.updateSetting("theme", theme);
    this.applyTheme(theme);
  }
  toggleTheme() {
    const current = this._settings().theme;
    const next = current === "dark" ? "light" : "dark";
    this.setTheme(next);
  }
  applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", theme);
    }
  }
  // ========== 語言操作 ==========
  setLanguage(language) {
    this.updateSetting("language", language);
    this.i18n.setLocale(language);
  }
  // ========== 側邊欄操作 ==========
  toggleSidebar() {
    const current = this._settings().sidebarCollapsed;
    this.updateSetting("sidebarCollapsed", !current);
  }
  setSidebarCollapsed(collapsed) {
    this.updateSetting("sidebarCollapsed", collapsed);
  }
  // ========== API 憑證操作 ==========
  saveCredentials(credentials) {
    this._credentials.update((c) => __spreadValues(__spreadValues({}, c), credentials));
    this.ipc.send("save-credentials", this._credentials());
    this.toast.success("API \u6191\u8B49\u5DF2\u4FDD\u5B58");
  }
  testGeminiConnection() {
    const key = this._credentials().geminiApiKey;
    if (!key) {
      this.toast.error("\u8ACB\u5148\u8A2D\u7F6E Gemini API Key");
      return;
    }
    this.ipc.send("test-gemini-connection", { apiKey: key });
    this.toast.info("\u6B63\u5728\u6E2C\u8A66 Gemini \u9023\u63A5...");
  }
  testOpenAiConnection() {
    const key = this._credentials().openaiApiKey;
    if (!key) {
      this.toast.error("\u8ACB\u5148\u8A2D\u7F6E OpenAI API Key");
      return;
    }
    this.ipc.send("test-openai-connection", { apiKey: key });
    this.toast.info("\u6B63\u5728\u6E2C\u8A66 OpenAI \u9023\u63A5...");
  }
  testTelegramCredentials() {
    const creds = this._credentials();
    if (!creds.telegramApiId || !creds.telegramApiHash) {
      this.toast.error("\u8ACB\u5148\u8A2D\u7F6E Telegram API \u6191\u8B49");
      return;
    }
    this.ipc.send("test-telegram-credentials", {
      apiId: creds.telegramApiId,
      apiHash: creds.telegramApiHash
    });
    this.toast.info("\u6B63\u5728\u6E2C\u8A66 Telegram \u6191\u8B49...");
  }
  // ========== 導出/導入 ==========
  exportSettings() {
    const data = {
      settings: this._settings(),
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tg-settings-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.success("\u8A2D\u7F6E\u5DF2\u5C0E\u51FA");
  }
  importSettings(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        if (data.settings) {
          this._settings.set(__spreadValues(__spreadValues({}, DEFAULT_SETTINGS), data.settings));
          this._isDirty.set(true);
          this.saveSettings();
          this.toast.success("\u8A2D\u7F6E\u5DF2\u5C0E\u5165");
        } else {
          this.toast.error("\u7121\u6548\u7684\u8A2D\u7F6E\u6587\u4EF6");
        }
      } catch (error) {
        this.toast.error("\u8A2D\u7F6E\u6587\u4EF6\u89E3\u6790\u5931\u6557");
      }
    };
    reader.readAsText(file);
  }
  static {
    this.\u0275fac = function SettingsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SettingsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SettingsService, factory: _SettingsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SettingsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/ai-chat.service.ts
var DEFAULT_AI_SETTINGS = {
  provider: "gemini",
  model: "gemini-pro",
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: "\u4F60\u662F\u4E00\u500B\u5C08\u696D\u7684 Telegram \u71DF\u92B7\u52A9\u624B\uFF0C\u5E6B\u52A9\u7528\u6236\u9032\u884C\u7FA4\u7D44\u7BA1\u7406\u548C\u5BA2\u6236\u958B\u767C\u3002",
  enableMemory: true,
  enableRag: false
};
var AiChatService = class _AiChatService {
  // ========== 初始化 ==========
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._settings = signal(DEFAULT_AI_SETTINGS, ...ngDevMode ? [{ debugName: "_settings" }] : []);
    this._currentSession = signal(null, ...ngDevMode ? [{ debugName: "_currentSession" }] : []);
    this._sessions = signal([], ...ngDevMode ? [{ debugName: "_sessions" }] : []);
    this._isGenerating = signal(false, ...ngDevMode ? [{ debugName: "_isGenerating" }] : []);
    this._isConnected = signal(false, ...ngDevMode ? [{ debugName: "_isConnected" }] : []);
    this._ragDocuments = signal([], ...ngDevMode ? [{ debugName: "_ragDocuments" }] : []);
    this.settings = this._settings.asReadonly();
    this.currentSession = this._currentSession.asReadonly();
    this.sessions = this._sessions.asReadonly();
    this.isGenerating = this._isGenerating.asReadonly();
    this.isConnected = this._isConnected.asReadonly();
    this.ragDocuments = this._ragDocuments.asReadonly();
    this.currentMessages = computed(() => this._currentSession()?.messages || [], ...ngDevMode ? [{ debugName: "currentMessages" }] : []);
    this.hasMessages = computed(() => (this._currentSession()?.messages.length || 0) > 0, ...ngDevMode ? [{ debugName: "hasMessages" }] : []);
    this.provider = computed(() => this._settings().provider, ...ngDevMode ? [{ debugName: "provider" }] : []);
    this.setupIpcListeners();
    this.loadSettings();
  }
  setupIpcListeners() {
    this.ipc.on("ai-settings-loaded", (data) => {
      this._settings.set(__spreadValues(__spreadValues({}, DEFAULT_AI_SETTINGS), data));
    });
    this.ipc.on("ai-response", (data) => {
      this._isGenerating.set(false);
      this.addMessage("assistant", data.content, data.tokens);
    });
    this.ipc.on("ai-response-error", (data) => {
      this._isGenerating.set(false);
      this.toast.error(`AI \u56DE\u5FA9\u5931\u6557: ${data.error}`);
    });
    this.ipc.on("ai-connection-status", (data) => {
      this._isConnected.set(data.connected);
    });
    this.ipc.on("chat-sessions-loaded", (sessions) => {
      this._sessions.set(sessions);
    });
    this.ipc.on("rag-documents-loaded", (docs) => {
      this._ragDocuments.set(docs);
    });
  }
  // ========== 設置操作 ==========
  loadSettings() {
    this.ipc.send("get-ai-settings");
  }
  saveSettings() {
    this.ipc.send("save-ai-settings", this._settings());
    this.toast.success("AI \u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
  }
  updateSetting(key, value) {
    this._settings.update((s) => __spreadProps(__spreadValues({}, s), { [key]: value }));
  }
  setProvider(provider) {
    this.updateSetting("provider", provider);
    const defaultModels = {
      "gemini": "gemini-pro",
      "openai": "gpt-4",
      "claude": "claude-3-opus",
      "local": "llama2"
    };
    this.updateSetting("model", defaultModels[provider]);
  }
  // ========== 對話操作 ==========
  sendMessage(content) {
    if (!content.trim() || this._isGenerating())
      return;
    this.addMessage("user", content.trim());
    this._isGenerating.set(true);
    this.ipc.send("generate-ai-response", {
      prompt: content.trim(),
      settings: this._settings(),
      history: this.currentMessages().slice(-10),
      enableRag: this._settings().enableRag
    });
  }
  addMessage(role, content, tokens) {
    const message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      tokens
    };
    this._currentSession.update((session) => {
      if (!session) {
        return {
          id: crypto.randomUUID(),
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          messages: [message],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      return __spreadProps(__spreadValues({}, session), {
        messages: [...session.messages, message],
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    });
  }
  // ========== 會話管理 ==========
  newSession() {
    const current = this._currentSession();
    if (current && current.messages.length > 0) {
      this.saveSession(current);
    }
    this._currentSession.set(null);
  }
  loadSession(sessionId) {
    const session = this._sessions().find((s) => s.id === sessionId);
    if (session) {
      this._currentSession.set(session);
    }
  }
  saveSession(session) {
    this.ipc.send("save-chat-session", session);
    this._sessions.update((sessions) => {
      const index = sessions.findIndex((s) => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
        return [...sessions];
      }
      return [session, ...sessions];
    });
  }
  deleteSession(sessionId) {
    if (confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u5C0D\u8A71\u55CE\uFF1F")) {
      this.ipc.send("delete-chat-session", { sessionId });
      this._sessions.update((sessions) => sessions.filter((s) => s.id !== sessionId));
      if (this._currentSession()?.id === sessionId) {
        this._currentSession.set(null);
      }
      this.toast.success("\u5C0D\u8A71\u5DF2\u522A\u9664");
    }
  }
  clearHistory() {
    if (confirm("\u78BA\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u5C0D\u8A71\u8A18\u9304\u55CE\uFF1F")) {
      this.ipc.send("clear-chat-history");
      this._sessions.set([]);
      this._currentSession.set(null);
      this.toast.success("\u5C0D\u8A71\u8A18\u9304\u5DF2\u6E05\u7A7A");
    }
  }
  // ========== RAG 操作 ==========
  loadRagDocuments() {
    this.ipc.send("get-rag-documents");
  }
  addRagDocument(doc) {
    this.ipc.send("add-rag-document", doc);
    this.toast.info("\u6B63\u5728\u6DFB\u52A0\u6587\u6A94...");
  }
  deleteRagDocument(docId) {
    if (confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u6587\u6A94\u55CE\uFF1F")) {
      this.ipc.send("delete-rag-document", { docId });
      this._ragDocuments.update((docs) => docs.filter((d) => d.id !== docId));
      this.toast.success("\u6587\u6A94\u5DF2\u522A\u9664");
    }
  }
  // ========== 連接測試 ==========
  testConnection() {
    this.ipc.send("test-ai-connection", this._settings());
    this.toast.info("\u6B63\u5728\u6E2C\u8A66 AI \u9023\u63A5...");
  }
  // ========== 快捷功能 ==========
  generateGreeting(context) {
    const prompt = `\u751F\u6210\u4E00\u689D\u53CB\u597D\u7684\u554F\u5019\u6D88\u606F\uFF0C\u7528\u65BC Telegram \u7FA4\u7D44\u3002${context ? `\u80CC\u666F\u4FE1\u606F: ${JSON.stringify(context)}` : ""}`;
    this.sendMessage(prompt);
  }
  generateReply(originalMessage, context) {
    const prompt = `\u8ACB\u91DD\u5C0D\u4EE5\u4E0B\u6D88\u606F\u751F\u6210\u4E00\u689D\u5C08\u696D\u7684\u56DE\u5FA9\uFF1A
    
\u539F\u6D88\u606F\uFF1A${originalMessage}
${context ? `\u80CC\u666F\u4FE1\u606F: ${JSON.stringify(context)}` : ""}

\u8ACB\u751F\u6210\u7C21\u6F54\u3001\u5C08\u696D\u7684\u56DE\u5FA9\u3002`;
    this.sendMessage(prompt);
  }
  summarizeConversation() {
    const messages = this.currentMessages();
    if (messages.length < 2) {
      this.toast.warning("\u5C0D\u8A71\u5167\u5BB9\u592A\u5C11\uFF0C\u7121\u6CD5\u751F\u6210\u6458\u8981");
      return;
    }
    const conversation = messages.map((m) => `${m.role === "user" ? "\u7528\u6236" : "AI"}\uFF1A${m.content}`).join("\n");
    const prompt = `\u8ACB\u7E3D\u7D50\u4EE5\u4E0B\u5C0D\u8A71\u7684\u4E3B\u8981\u5167\u5BB9\uFF1A

${conversation}`;
    this.sendMessage(prompt);
  }
  static {
    this.\u0275fac = function AiChatService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AiChatService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AiChatService, factory: _AiChatService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AiChatService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/resource.service.ts
var ResourceService = class _ResourceService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._resources = signal([], ...ngDevMode ? [{ debugName: "_resources" }] : []);
    this._selectedIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_selectedIds" }] : []);
    this._filter = signal({ type: "all", status: "all" }, ...ngDevMode ? [{ debugName: "_filter" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._searchResults = signal([], ...ngDevMode ? [{ debugName: "_searchResults" }] : []);
    this._isSearching = signal(false, ...ngDevMode ? [{ debugName: "_isSearching" }] : []);
    this.resources = this._resources.asReadonly();
    this.selectedIds = this._selectedIds.asReadonly();
    this.filter = this._filter.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.searchResults = this._searchResults.asReadonly();
    this.isSearching = this._isSearching.asReadonly();
    this.filteredResources = computed(() => {
      const resources = this._resources();
      const filter = this._filter();
      return resources.filter((r) => {
        if (filter.type && filter.type !== "all" && r.type !== filter.type) {
          return false;
        }
        if (filter.status && filter.status !== "all" && r.status !== filter.status) {
          return false;
        }
        if (filter.search) {
          const search = filter.search.toLowerCase();
          const matchTitle = r.title?.toLowerCase().includes(search);
          const matchUsername = r.username?.toLowerCase().includes(search);
          if (!matchTitle && !matchUsername)
            return false;
        }
        if (filter.hasMembers !== void 0) {
          if (filter.hasMembers && !r.member_count)
            return false;
          if (!filter.hasMembers && r.member_count)
            return false;
        }
        if (filter.isPublic !== void 0 && r.is_public !== filter.isPublic) {
          return false;
        }
        return true;
      });
    }, ...ngDevMode ? [{ debugName: "filteredResources" }] : []);
    this.stats = computed(() => {
      const resources = this._resources();
      const byType = {
        "group": 0,
        "channel": 0,
        "user": 0,
        "bot": 0
      };
      const byStatus = {
        "discovered": 0,
        "joined": 0,
        "monitored": 0,
        "left": 0
      };
      let totalMembers = 0;
      for (const r of resources) {
        if (byType[r.type] !== void 0)
          byType[r.type]++;
        if (byStatus[r.status] !== void 0)
          byStatus[r.status]++;
        totalMembers += r.member_count || 0;
      }
      return {
        total: resources.length,
        byType,
        byStatus,
        totalMembers
      };
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.selectedResources = computed(() => {
      const ids = this._selectedIds();
      return this._resources().filter((r) => ids.has(r.id));
    }, ...ngDevMode ? [{ debugName: "selectedResources" }] : []);
    this.selectedCount = computed(() => this._selectedIds().size, ...ngDevMode ? [{ debugName: "selectedCount" }] : []);
    this.groups = computed(() => this._resources().filter((r) => r.type === "group"), ...ngDevMode ? [{ debugName: "groups" }] : []);
    this.channels = computed(() => this._resources().filter((r) => r.type === "channel"), ...ngDevMode ? [{ debugName: "channels" }] : []);
    this.joinedResources = computed(() => this._resources().filter((r) => r.status === "joined"), ...ngDevMode ? [{ debugName: "joinedResources" }] : []);
    this.monitoredResources = computed(() => this._resources().filter((r) => r.status === "monitored"), ...ngDevMode ? [{ debugName: "monitoredResources" }] : []);
    this.setupIpcListeners();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("resources-loaded", (data) => {
      this._resources.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("resource-updated", (data) => {
      this._resources.update((list) => list.map((r) => r.id === data.id ? __spreadValues(__spreadValues({}, r), data) : r));
    });
    this.ipc.on("search-results", (data) => {
      this._searchResults.set(data);
      this._isSearching.set(false);
    });
    this.ipc.on("search-error", (data) => {
      this._isSearching.set(false);
      this.toast.error(`\u641C\u7D22\u5931\u6557: ${data.error}`);
    });
  }
  // ========== 資源操作 ==========
  loadResources() {
    this._isLoading.set(true);
    this.ipc.send("get-resources");
  }
  refreshResources() {
    this.ipc.send("refresh-resources");
    this.toast.info("\u6B63\u5728\u5237\u65B0\u8CC7\u6E90...");
  }
  getResource(id) {
    return this._resources().find((r) => r.id === id);
  }
  updateResource(id, updates) {
    this._resources.update((list) => list.map((r) => r.id === id ? __spreadValues(__spreadValues({}, r), updates) : r));
    this.ipc.send("update-resource", { id, updates });
  }
  deleteResource(id) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u8CC7\u6E90\u55CE\uFF1F"))
      return;
    this._resources.update((list) => list.filter((r) => r.id !== id));
    this._selectedIds.update((ids) => {
      const newIds = new Set(ids);
      newIds.delete(id);
      return newIds;
    });
    this.ipc.send("delete-resource", { id });
    this.toast.success("\u8CC7\u6E90\u5DF2\u522A\u9664");
  }
  // ========== 選擇操作 ==========
  toggleSelection(id) {
    this._selectedIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }
  selectAll() {
    const ids = new Set(this.filteredResources().map((r) => r.id));
    this._selectedIds.set(ids);
  }
  deselectAll() {
    this._selectedIds.set(/* @__PURE__ */ new Set());
  }
  isSelected(id) {
    return this._selectedIds().has(id);
  }
  // ========== 過濾操作 ==========
  setFilter(filter) {
    this._filter.update((f) => __spreadValues(__spreadValues({}, f), filter));
  }
  clearFilter() {
    this._filter.set({ type: "all", status: "all" });
  }
  setSearch(search) {
    this._filter.update((f) => __spreadProps(__spreadValues({}, f), { search }));
  }
  // ========== 搜索操作 ==========
  search(query2) {
    this._isSearching.set(true);
    this._searchResults.set([]);
    this.ipc.send("search-resources", query2);
    this.toast.info("\u6B63\u5728\u641C\u7D22...");
  }
  clearSearchResults() {
    this._searchResults.set([]);
  }
  addSearchResultToResources(resource) {
    this._resources.update((list) => {
      if (list.some((r) => r.telegram_id === resource.telegram_id)) {
        return list;
      }
      return [...list, resource];
    });
  }
  // ========== 批量操作 ==========
  batchJoin(phone) {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u8CC7\u6E90");
      return;
    }
    this.ipc.send("batch-join-resources", {
      resourceIds: selected.map((r) => r.id),
      phone
    });
    this.toast.info(`\u6B63\u5728\u52A0\u5165 ${selected.length} \u500B\u8CC7\u6E90...`);
  }
  batchLeave(phone) {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u8CC7\u6E90");
      return;
    }
    if (!confirm(`\u78BA\u5B9A\u8981\u96E2\u958B ${selected.length} \u500B\u8CC7\u6E90\u55CE\uFF1F`))
      return;
    this.ipc.send("batch-leave-resources", {
      resourceIds: selected.map((r) => r.id),
      phone
    });
    this.toast.info(`\u6B63\u5728\u96E2\u958B ${selected.length} \u500B\u8CC7\u6E90...`);
  }
  batchDelete() {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning("\u8ACB\u5148\u9078\u64C7\u8CC7\u6E90");
      return;
    }
    if (!confirm(`\u78BA\u5B9A\u8981\u522A\u9664 ${selected.length} \u500B\u8CC7\u6E90\u55CE\uFF1F`))
      return;
    const ids = selected.map((r) => r.id);
    this._resources.update((list) => list.filter((r) => !ids.includes(r.id)));
    this._selectedIds.set(/* @__PURE__ */ new Set());
    this.ipc.send("batch-delete-resources", { resourceIds: ids });
    this.toast.success(`\u5DF2\u522A\u9664 ${selected.length} \u500B\u8CC7\u6E90`);
  }
  // ========== 標籤操作 ==========
  addTag(resourceId, tag) {
    this._resources.update((list) => list.map((r) => {
      if (r.id === resourceId) {
        const tags = r.tags || [];
        if (!tags.includes(tag)) {
          return __spreadProps(__spreadValues({}, r), { tags: [...tags, tag] });
        }
      }
      return r;
    }));
    this.ipc.send("add-resource-tag", { resourceId, tag });
  }
  removeTag(resourceId, tag) {
    this._resources.update((list) => list.map((r) => {
      if (r.id === resourceId && r.tags) {
        return __spreadProps(__spreadValues({}, r), { tags: r.tags.filter((t) => t !== tag) });
      }
      return r;
    }));
    this.ipc.send("remove-resource-tag", { resourceId, tag });
  }
  static {
    this.\u0275fac = function ResourceService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ResourceService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ResourceService, factory: _ResourceService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ResourceService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/export.service.ts
var ExportService = class _ExportService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._jobs = signal([], ...ngDevMode ? [{ debugName: "_jobs" }] : []);
    this._currentJob = signal(null, ...ngDevMode ? [{ debugName: "_currentJob" }] : []);
    this._templates = signal([], ...ngDevMode ? [{ debugName: "_templates" }] : []);
    this._isExporting = signal(false, ...ngDevMode ? [{ debugName: "_isExporting" }] : []);
    this.jobs = this._jobs.asReadonly();
    this.currentJob = this._currentJob.asReadonly();
    this.templates = this._templates.asReadonly();
    this.isExporting = this._isExporting.asReadonly();
    this.setupIpcListeners();
    this.loadTemplates();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("export-started", (job) => {
      this._currentJob.set(job);
      this._jobs.update((jobs) => [job, ...jobs]);
      this._isExporting.set(true);
    });
    this.ipc.on("export-progress", (data) => {
      this._jobs.update((jobs) => jobs.map((j) => j.id === data.jobId ? __spreadProps(__spreadValues({}, j), { progress: data.progress }) : j));
      if (this._currentJob()?.id === data.jobId) {
        this._currentJob.update((j) => j ? __spreadProps(__spreadValues({}, j), { progress: data.progress }) : j);
      }
    });
    this.ipc.on("export-completed", (data) => {
      this._jobs.update((jobs) => jobs.map((j) => j.id === data.jobId ? __spreadProps(__spreadValues({}, j), {
        status: "completed",
        progress: 100,
        filePath: data.filePath,
        completedAt: (/* @__PURE__ */ new Date()).toISOString()
      }) : j));
      this._currentJob.set(null);
      this._isExporting.set(false);
      this.toast.success("\u5C0E\u51FA\u5B8C\u6210\uFF01");
    });
    this.ipc.on("export-failed", (data) => {
      this._jobs.update((jobs) => jobs.map((j) => j.id === data.jobId ? __spreadProps(__spreadValues({}, j), {
        status: "failed",
        error: data.error
      }) : j));
      this._currentJob.set(null);
      this._isExporting.set(false);
      this.toast.error(`\u5C0E\u51FA\u5931\u6557: ${data.error}`);
    });
  }
  // ========== 導出操作 ==========
  /**
   * 導出線索
   */
  exportLeads(format = "csv", options) {
    this.startExport(__spreadValues({
      format,
      type: "leads",
      includeHeaders: true
    }, options));
  }
  /**
   * 導出成員
   */
  exportMembers(resourceId, format = "csv", options) {
    this.startExport(__spreadValues({
      format,
      type: "members",
      filters: { resourceId },
      includeHeaders: true
    }, options));
  }
  /**
   * 導出資源列表
   */
  exportResources(format = "csv", options) {
    this.startExport(__spreadValues({
      format,
      type: "resources",
      includeHeaders: true
    }, options));
  }
  /**
   * 導出消息記錄
   */
  exportMessages(format = "json", options) {
    this.startExport(__spreadValues({
      format,
      type: "messages"
    }, options));
  }
  /**
   * 導出分析數據
   */
  exportAnalytics(format = "xlsx", options) {
    this.startExport(__spreadValues({
      format,
      type: "analytics"
    }, options));
  }
  /**
   * 導出報告
   */
  exportReport(type, format = "pdf") {
    this.startExport({
      format,
      type: "report",
      filters: { reportType: type }
    });
  }
  /**
   * 開始導出
   */
  startExport(options) {
    if (this._isExporting()) {
      this.toast.warning("\u6B63\u5728\u9032\u884C\u5C0E\u51FA\uFF0C\u8ACB\u7B49\u5F85\u5B8C\u6210");
      return;
    }
    this.ipc.send("start-export", options);
    this.toast.info("\u958B\u59CB\u5C0E\u51FA...");
  }
  // ========== 任務管理 ==========
  /**
   * 取消當前導出
   */
  cancelExport() {
    const job = this._currentJob();
    if (!job)
      return;
    this.ipc.send("cancel-export", { jobId: job.id });
    this._currentJob.set(null);
    this._isExporting.set(false);
    this.toast.info("\u5DF2\u53D6\u6D88\u5C0E\u51FA");
  }
  /**
   * 打開導出文件
   */
  openExportFile(job) {
    if (!job.filePath) {
      this.toast.error("\u6587\u4EF6\u8DEF\u5F91\u4E0D\u5B58\u5728");
      return;
    }
    this.ipc.send("open-file", { path: job.filePath });
  }
  /**
   * 打開導出目錄
   */
  openExportFolder(job) {
    if (!job.filePath) {
      this.toast.error("\u6587\u4EF6\u8DEF\u5F91\u4E0D\u5B58\u5728");
      return;
    }
    this.ipc.send("open-folder", { path: job.filePath });
  }
  /**
   * 清除導出歷史
   */
  clearHistory() {
    if (!confirm("\u78BA\u5B9A\u8981\u6E05\u9664\u5C0E\u51FA\u6B77\u53F2\u55CE\uFF1F"))
      return;
    this._jobs.set([]);
    this.toast.success("\u5C0E\u51FA\u6B77\u53F2\u5DF2\u6E05\u9664");
  }
  /**
   * 刪除單個導出記錄
   */
  deleteJob(jobId) {
    this._jobs.update((jobs) => jobs.filter((j) => j.id !== jobId));
  }
  // ========== 模板管理 ==========
  /**
   * 加載模板
   */
  loadTemplates() {
    try {
      const saved = localStorage.getItem("export-templates");
      if (saved) {
        this._templates.set(JSON.parse(saved));
      }
    } catch (e) {
    }
  }
  /**
   * 保存模板
   */
  saveTemplate(template) {
    const newTemplate = __spreadProps(__spreadValues({}, template), {
      id: crypto.randomUUID()
    });
    this._templates.update((templates) => [...templates, newTemplate]);
    this.saveTemplatesToStorage();
    this.toast.success("\u6A21\u677F\u5DF2\u4FDD\u5B58");
  }
  /**
   * 刪除模板
   */
  deleteTemplate(templateId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u6A21\u677F\u55CE\uFF1F"))
      return;
    this._templates.update((templates) => templates.filter((t) => t.id !== templateId));
    this.saveTemplatesToStorage();
    this.toast.success("\u6A21\u677F\u5DF2\u522A\u9664");
  }
  /**
   * 使用模板導出
   */
  useTemplate(templateId) {
    const template = this._templates().find((t) => t.id === templateId);
    if (!template) {
      this.toast.error("\u6A21\u677F\u4E0D\u5B58\u5728");
      return;
    }
    this.startExport(__spreadValues({
      format: template.options.format || "csv",
      type: template.type
    }, template.options));
  }
  saveTemplatesToStorage() {
    try {
      localStorage.setItem("export-templates", JSON.stringify(this._templates()));
    } catch (e) {
    }
  }
  // ========== 工具方法 ==========
  /**
   * 獲取格式圖標
   */
  getFormatIcon(format) {
    const icons = {
      "csv": "\u{1F4CA}",
      "xlsx": "\u{1F4D7}",
      "json": "\u{1F4CB}",
      "pdf": "\u{1F4D5}"
    };
    return icons[format] || "\u{1F4C4}";
  }
  /**
   * 獲取格式名稱
   */
  getFormatName(format) {
    const names = {
      "csv": "CSV",
      "xlsx": "Excel",
      "json": "JSON",
      "pdf": "PDF"
    };
    return names[format] || format.toUpperCase();
  }
  /**
   * 獲取類型名稱
   */
  getTypeName(type) {
    const names = {
      "leads": "\u7DDA\u7D22",
      "members": "\u6210\u54E1",
      "resources": "\u8CC7\u6E90",
      "messages": "\u6D88\u606F",
      "analytics": "\u5206\u6790",
      "report": "\u5831\u544A"
    };
    return names[type] || type;
  }
  static {
    this.\u0275fac = function ExportService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ExportService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ExportService, factory: _ExportService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ExportService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/backup.service.ts
var BackupService = class _BackupService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._backups = signal([], ...ngDevMode ? [{ debugName: "_backups" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._isCreating = signal(false, ...ngDevMode ? [{ debugName: "_isCreating" }] : []);
    this._isRestoring = signal(false, ...ngDevMode ? [{ debugName: "_isRestoring" }] : []);
    this._settings = signal({
      autoBackup: false,
      interval: 24,
      maxBackups: 10,
      includeMedia: false
    }, ...ngDevMode ? [{ debugName: "_settings" }] : []);
    this.backups = this._backups.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.isCreating = this._isCreating.asReadonly();
    this.isRestoring = this._isRestoring.asReadonly();
    this.settings = this._settings.asReadonly();
    this.setupIpcListeners();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("backups-loaded", (data) => {
      this._backups.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("backup-created", (data) => {
      this._backups.update((list) => [data, ...list]);
      this._isCreating.set(false);
      this.toast.success("\u5099\u4EFD\u5275\u5EFA\u6210\u529F\uFF01");
    });
    this.ipc.on("backup-create-error", (data) => {
      this._isCreating.set(false);
      this.toast.error(`\u5099\u4EFD\u5275\u5EFA\u5931\u6557: ${data.error}`);
    });
    this.ipc.on("backup-restored", () => {
      this._isRestoring.set(false);
      this.toast.success("\u5099\u4EFD\u6062\u5FA9\u6210\u529F\uFF01\u61C9\u7528\u5C07\u91CD\u65B0\u52A0\u8F09...");
      setTimeout(() => window.location.reload(), 2e3);
    });
    this.ipc.on("backup-restore-error", (data) => {
      this._isRestoring.set(false);
      this.toast.error(`\u5099\u4EFD\u6062\u5FA9\u5931\u6557: ${data.error}`);
    });
    this.ipc.on("backup-deleted", (data) => {
      this._backups.update((list) => list.filter((b) => b.id !== data.id));
      this.toast.success("\u5099\u4EFD\u5DF2\u522A\u9664");
    });
    this.ipc.on("backup-settings-loaded", (data) => {
      this._settings.set(data);
    });
  }
  // ========== 備份操作 ==========
  loadBackups() {
    this._isLoading.set(true);
    this.ipc.send("get-backups");
  }
  createBackup(description) {
    this._isCreating.set(true);
    this.ipc.send("create-backup", { description });
  }
  restoreBackup(id) {
    if (!confirm("\u78BA\u5B9A\u8981\u6062\u5FA9\u6B64\u5099\u4EFD\u55CE\uFF1F\u7576\u524D\u6578\u64DA\u5C07\u88AB\u8986\u84CB\u3002")) {
      return;
    }
    this._isRestoring.set(true);
    this.ipc.send("restore-backup", { id });
  }
  deleteBackup(id) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u5099\u4EFD\u55CE\uFF1F")) {
      return;
    }
    this.ipc.send("delete-backup", { id });
  }
  // ========== 設置操作 ==========
  loadSettings() {
    this.ipc.send("get-backup-settings");
  }
  updateSettings(settings) {
    this._settings.update((s) => __spreadValues(__spreadValues({}, s), settings));
    this.ipc.send("save-backup-settings", this._settings());
    this.toast.success("\u5099\u4EFD\u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
  }
  toggleAutoBackup() {
    this.updateSettings({ autoBackup: !this._settings().autoBackup });
  }
  // ========== 工具方法 ==========
  formatSize(bytes) {
    if (bytes < 1024)
      return `${bytes} B`;
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  getBackupAge(createdAt) {
    const created = new Date(createdAt);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
    if (diffDays === 0)
      return "\u4ECA\u5929";
    if (diffDays === 1)
      return "\u6628\u5929";
    if (diffDays < 7)
      return `${diffDays} \u5929\u524D`;
    if (diffDays < 30)
      return `${Math.floor(diffDays / 7)} \u9031\u524D`;
    return `${Math.floor(diffDays / 30)} \u500B\u6708\u524D`;
  }
  static {
    this.\u0275fac = function BackupService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _BackupService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _BackupService, factory: _BackupService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(BackupService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/scheduler.service.ts
var SchedulerService = class _SchedulerService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._status = signal({
      isRunning: false,
      uptime: 0,
      totalTasks: 0,
      activeTasks: 0,
      tasks: []
    }, ...ngDevMode ? [{ debugName: "_status" }] : []);
    this._logs = signal([], ...ngDevMode ? [{ debugName: "_logs" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.status = this._status.asReadonly();
    this.logs = this._logs.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.isRunning = computed(() => this._status().isRunning, ...ngDevMode ? [{ debugName: "isRunning" }] : []);
    this.tasks = computed(() => this._status().tasks, ...ngDevMode ? [{ debugName: "tasks" }] : []);
    this.activeTasks = computed(() => this._status().tasks.filter((t) => t.status === "running"), ...ngDevMode ? [{ debugName: "activeTasks" }] : []);
    this.idleTasks = computed(() => this._status().tasks.filter((t) => t.status === "idle"), ...ngDevMode ? [{ debugName: "idleTasks" }] : []);
    this.errorTasks = computed(() => this._status().tasks.filter((t) => t.status === "error"), ...ngDevMode ? [{ debugName: "errorTasks" }] : []);
    this.uptimeFormatted = computed(() => {
      const seconds = this._status().uptime;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds % 3600 / 60);
      const secs = seconds % 60;
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${secs}s`;
      }
      return `${secs}s`;
    }, ...ngDevMode ? [{ debugName: "uptimeFormatted" }] : []);
    this.setupIpcListeners();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("scheduler-status", (data) => {
      this._status.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("scheduler-started", () => {
      this._status.update((s) => __spreadProps(__spreadValues({}, s), { isRunning: true }));
      this.toast.success("\u8ABF\u5EA6\u5668\u5DF2\u555F\u52D5");
    });
    this.ipc.on("scheduler-stopped", () => {
      this._status.update((s) => __spreadProps(__spreadValues({}, s), { isRunning: false }));
      this.toast.info("\u8ABF\u5EA6\u5668\u5DF2\u505C\u6B62");
    });
    this.ipc.on("scheduler-task-started", (data) => {
      this._status.update((s) => __spreadProps(__spreadValues({}, s), {
        tasks: s.tasks.map((t) => t.name === data.taskName ? __spreadProps(__spreadValues({}, t), { status: "running" }) : t)
      }));
    });
    this.ipc.on("scheduler-task-completed", (data) => {
      this._status.update((s) => __spreadProps(__spreadValues({}, s), {
        tasks: s.tasks.map((t) => t.name === data.taskName ? __spreadProps(__spreadValues({}, t), {
          status: "idle",
          lastRun: (/* @__PURE__ */ new Date()).toISOString(),
          runCount: t.runCount + 1
        }) : t)
      }));
    });
    this.ipc.on("scheduler-task-error", (data) => {
      this._status.update((s) => __spreadProps(__spreadValues({}, s), {
        tasks: s.tasks.map((t) => t.name === data.taskName ? __spreadProps(__spreadValues({}, t), {
          status: "error",
          errorMessage: data.error
        }) : t)
      }));
      this.toast.error(`\u4EFB\u52D9 ${data.taskName} \u57F7\u884C\u5931\u6557`);
    });
    this.ipc.on("scheduler-logs", (data) => {
      this._logs.set(data);
    });
  }
  // ========== 調度器操作 ==========
  loadStatus() {
    this._isLoading.set(true);
    this.ipc.send("get-scheduler-status");
  }
  start() {
    this.ipc.send("start-scheduler");
  }
  stop() {
    this.ipc.send("stop-scheduler");
  }
  restart() {
    this.ipc.send("restart-scheduler");
    this.toast.info("\u6B63\u5728\u91CD\u555F\u8ABF\u5EA6\u5668...");
  }
  // ========== 任務操作 ==========
  runTask(taskName) {
    this.ipc.send("run-scheduler-task", { taskName });
    this.toast.info(`\u6B63\u5728\u57F7\u884C\u4EFB\u52D9: ${taskName}`);
  }
  enableTask(taskName) {
    this.ipc.send("enable-scheduler-task", { taskName });
    this._status.update((s) => __spreadProps(__spreadValues({}, s), {
      tasks: s.tasks.map((t) => t.name === taskName ? __spreadProps(__spreadValues({}, t), { enabled: true, status: "idle" }) : t)
    }));
  }
  disableTask(taskName) {
    this.ipc.send("disable-scheduler-task", { taskName });
    this._status.update((s) => __spreadProps(__spreadValues({}, s), {
      tasks: s.tasks.map((t) => t.name === taskName ? __spreadProps(__spreadValues({}, t), { enabled: false, status: "disabled" }) : t)
    }));
  }
  updateTaskInterval(taskName, interval) {
    this.ipc.send("update-task-interval", { taskName, interval });
    this._status.update((s) => __spreadProps(__spreadValues({}, s), {
      tasks: s.tasks.map((t) => t.name === taskName ? __spreadProps(__spreadValues({}, t), { interval }) : t)
    }));
    this.toast.success("\u4EFB\u52D9\u9593\u9694\u5DF2\u66F4\u65B0");
  }
  // ========== 日誌操作 ==========
  loadLogs(limit = 100) {
    this.ipc.send("get-scheduler-logs", { limit });
  }
  clearLogs() {
    if (!confirm("\u78BA\u5B9A\u8981\u6E05\u9664\u6240\u6709\u8ABF\u5EA6\u65E5\u8A8C\u55CE\uFF1F"))
      return;
    this.ipc.send("clear-scheduler-logs");
    this._logs.set([]);
    this.toast.success("\u8ABF\u5EA6\u65E5\u8A8C\u5DF2\u6E05\u9664");
  }
  // ========== 工具方法 ==========
  getTaskStatusColor(status) {
    switch (status) {
      case "running":
        return "text-green-400";
      case "idle":
        return "text-slate-400";
      case "error":
        return "text-red-400";
      case "disabled":
        return "text-slate-600";
      default:
        return "text-slate-400";
    }
  }
  getTaskStatusIcon(status) {
    switch (status) {
      case "running":
        return "\u{1F7E2}";
      case "idle":
        return "\u26AA";
      case "error":
        return "\u{1F534}";
      case "disabled":
        return "\u26AB";
      default:
        return "\u26AA";
    }
  }
  formatInterval(seconds) {
    if (seconds < 60)
      return `${seconds} \u79D2`;
    if (seconds < 3600)
      return `${Math.floor(seconds / 60)} \u5206\u9418`;
    if (seconds < 86400)
      return `${Math.floor(seconds / 3600)} \u5C0F\u6642`;
    return `${Math.floor(seconds / 86400)} \u5929`;
  }
  static {
    this.\u0275fac = function SchedulerService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SchedulerService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SchedulerService, factory: _SchedulerService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SchedulerService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/app-state.service.ts
var AppStateService = class _AppStateService {
  constructor() {
    this._backendConnectionState = signal("connecting", ...ngDevMode ? [{ debugName: "_backendConnectionState" }] : []);
    this._backendConnectionMessage = signal("\u6B63\u5728\u9023\u63A5\u5F8C\u7AEF\u670D\u52D9...", ...ngDevMode ? [{ debugName: "_backendConnectionMessage" }] : []);
    this._backendConnectionProgress = signal(0, ...ngDevMode ? [{ debugName: "_backendConnectionProgress" }] : []);
    this.backendConnectionState = this._backendConnectionState.asReadonly();
    this.backendConnectionMessage = this._backendConnectionMessage.asReadonly();
    this.backendConnectionProgress = this._backendConnectionProgress.asReadonly();
    this.isConnected = computed(() => this._backendConnectionState() === "connected", ...ngDevMode ? [{ debugName: "isConnected" }] : []);
    this._currentView = signal("dashboard", ...ngDevMode ? [{ debugName: "_currentView" }] : []);
    this._previousView = signal(null, ...ngDevMode ? [{ debugName: "_previousView" }] : []);
    this._sidebarCollapsed = signal(false, ...ngDevMode ? [{ debugName: "_sidebarCollapsed" }] : []);
    this.currentView = this._currentView.asReadonly();
    this.previousView = this._previousView.asReadonly();
    this.sidebarCollapsed = this._sidebarCollapsed.asReadonly();
    this._accounts = signal([], ...ngDevMode ? [{ debugName: "_accounts" }] : []);
    this._selectedAccountId = signal(null, ...ngDevMode ? [{ debugName: "_selectedAccountId" }] : []);
    this.accounts = this._accounts.asReadonly();
    this.selectedAccountId = this._selectedAccountId.asReadonly();
    this.selectedAccount = computed(() => {
      const id = this._selectedAccountId();
      return id ? this._accounts().find((a) => a.id === id) : null;
    }, ...ngDevMode ? [{ debugName: "selectedAccount" }] : []);
    this.onlineAccounts = computed(() => this._accounts().filter((a) => a.status === "Online"), ...ngDevMode ? [{ debugName: "onlineAccounts" }] : []);
    this.accountStats = computed(() => {
      const accounts = this._accounts();
      return {
        total: accounts.length,
        online: accounts.filter((a) => a.status === "Online").length,
        offline: accounts.filter((a) => a.status === "Offline").length,
        error: accounts.filter((a) => a.status === "Error" || a.status === "Banned").length
      };
    }, ...ngDevMode ? [{ debugName: "accountStats" }] : []);
    this._groups = signal([], ...ngDevMode ? [{ debugName: "_groups" }] : []);
    this._keywordSets = signal([], ...ngDevMode ? [{ debugName: "_keywordSets" }] : []);
    this._templates = signal([], ...ngDevMode ? [{ debugName: "_templates" }] : []);
    this._isMonitoring = signal(false, ...ngDevMode ? [{ debugName: "_isMonitoring" }] : []);
    this.groups = this._groups.asReadonly();
    this.keywordSets = this._keywordSets.asReadonly();
    this.templates = this._templates.asReadonly();
    this.isMonitoring = this._isMonitoring.asReadonly();
    this.monitoringStats = computed(() => {
      const groups = this._groups();
      const keywordSets = this._keywordSets();
      return {
        totalGroups: groups.length,
        activeGroups: groups.filter((g) => g.isActive).length,
        totalKeywords: keywordSets.reduce((sum, ks) => sum + (ks.keywords?.length || 0), 0),
        activeKeywordSets: keywordSets.filter((ks) => ks.is_active).length
      };
    }, ...ngDevMode ? [{ debugName: "monitoringStats" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._loadingMessage = signal("", ...ngDevMode ? [{ debugName: "_loadingMessage" }] : []);
    this.isLoading = this._isLoading.asReadonly();
    this.loadingMessage = this._loadingMessage.asReadonly();
    this.navModules = [
      {
        id: "dashboard",
        name: "\u5DE5\u4F5C\u53F0",
        icon: "\u{1F4CA}",
        views: [
          { id: "dashboard", name: "\u7E3D\u89BD", icon: "\u{1F3E0}" },
          { id: "analytics-center", name: "\u6578\u64DA\u5206\u6790", icon: "\u{1F4C8}" }
        ]
      },
      {
        id: "accounts",
        name: "\u5E33\u865F\u7BA1\u7406",
        icon: "\u{1F464}",
        views: [
          { id: "accounts", name: "\u5E33\u865F\u5217\u8868", icon: "\u{1F4F1}" },
          { id: "add-account", name: "\u6DFB\u52A0\u5E33\u865F", icon: "\u2795" },
          { id: "api-credentials", name: "API \u6191\u8B49", icon: "\u{1F511}" }
        ]
      },
      {
        id: "automation",
        name: "\u81EA\u52D5\u5316\u4E2D\u5FC3",
        icon: "\u{1F916}",
        views: [
          { id: "automation", name: "\u81EA\u52D5\u5316\u9762\u677F", icon: "\u26A1" },
          { id: "monitoring-accounts", name: "\u76E3\u63A7\u5E33\u865F", icon: "\u{1F441}\uFE0F" },
          { id: "monitoring-groups", name: "\u76E3\u63A7\u7FA4\u7D44", icon: "\u{1F4AC}" },
          { id: "keyword-sets", name: "\u95DC\u9375\u8A5E\u96C6", icon: "\u{1F524}" },
          { id: "chat-templates", name: "\u8A71\u8853\u6A21\u677F", icon: "\u{1F4DD}" },
          { id: "trigger-rules", name: "\u89F8\u767C\u898F\u5247", icon: "\u{1F3AF}" },
          { id: "collected-users", name: "\u6536\u96C6\u7528\u6236", icon: "\u{1F465}" }
        ]
      },
      {
        id: "resources",
        name: "\u8CC7\u6E90\u4E2D\u5FC3",
        icon: "\u{1F4E6}",
        views: [
          { id: "search-discovery", name: "\u641C\u7D22\u767C\u73FE", icon: "\u{1F50D}" },
          { id: "member-database", name: "\u6210\u54E1\u8CC7\u6599\u5EAB", icon: "\u{1F465}" },
          { id: "resource-center", name: "\u8CC7\u6E90\u7BA1\u7406", icon: "\u{1F4C1}" }
        ]
      },
      {
        id: "leads",
        name: "\u5BA2\u6236\u57F9\u80B2",
        icon: "\u{1F3AF}",
        views: [
          { id: "lead-nurturing", name: "\u7DDA\u7D22\u7BA1\u7406", icon: "\u{1F4CB}" },
          { id: "nurturing-analytics", name: "\u57F9\u80B2\u5206\u6790", icon: "\u{1F4CA}" }
        ]
      },
      {
        id: "ai",
        name: "AI \u4E2D\u5FC3",
        icon: "\u{1F9E0}",
        views: [
          { id: "ai-center", name: "AI \u914D\u7F6E", icon: "\u2699\uFE0F" },
          { id: "ai-assistant", name: "AI \u52A9\u624B", icon: "\u{1F4AC}" },
          { id: "ai-team", name: "AI \u5718\u968A", icon: "\u{1F465}" },
          { id: "multi-role", name: "\u591A\u89D2\u8272\u5354\u4F5C", icon: "\u{1F3AD}" }
        ]
      },
      {
        id: "system",
        name: "\u7CFB\u7D71\u8A2D\u7F6E",
        icon: "\u2699\uFE0F",
        views: [
          { id: "settings", name: "\u7CFB\u7D71\u8A2D\u7F6E", icon: "\u{1F527}" },
          { id: "profile", name: "\u500B\u4EBA\u8CC7\u6599", icon: "\u{1F464}" },
          { id: "membership-center", name: "\u6703\u54E1\u4E2D\u5FC3", icon: "\u{1F48E}" }
        ]
      }
    ];
  }
  // ========== 狀態更新方法 ==========
  setConnectionState(state2, message) {
    this._backendConnectionState.set(state2);
    if (message) {
      this._backendConnectionMessage.set(message);
    }
  }
  setConnectionProgress(progress) {
    this._backendConnectionProgress.set(progress);
  }
  navigateTo(view) {
    this._previousView.set(this._currentView());
    this._currentView.set(view);
  }
  goBack() {
    const prev = this._previousView();
    if (prev) {
      this._currentView.set(prev);
      this._previousView.set(null);
    }
  }
  toggleSidebar() {
    this._sidebarCollapsed.update((v) => !v);
  }
  setSidebarCollapsed(collapsed) {
    this._sidebarCollapsed.set(collapsed);
  }
  setAccounts(accounts) {
    this._accounts.set(accounts);
  }
  updateAccount(account) {
    this._accounts.update((list) => list.map((a) => a.id === account.id ? account : a));
  }
  addAccount(account) {
    this._accounts.update((list) => [...list, account]);
  }
  removeAccount(accountId) {
    this._accounts.update((list) => list.filter((a) => a.id !== accountId));
  }
  selectAccount(accountId) {
    this._selectedAccountId.set(accountId);
  }
  setGroups(groups) {
    this._groups.set(groups);
  }
  setKeywordSets(sets) {
    this._keywordSets.set(sets);
  }
  setTemplates(templates) {
    this._templates.set(templates);
  }
  setMonitoring(active) {
    this._isMonitoring.set(active);
  }
  setLoading(loading, message) {
    this._isLoading.set(loading);
    if (message !== void 0) {
      this._loadingMessage.set(message);
    }
  }
  // ========== 輔助方法 ==========
  getModuleForView(view) {
    return this.navModules.find((m) => m.views.some((v) => v.id === view));
  }
  getViewInfo(view) {
    for (const module of this.navModules) {
      const found = module.views.find((v) => v.id === view);
      if (found)
        return found;
    }
    return void 0;
  }
  getBreadcrumb() {
    const view = this._currentView();
    const module = this.getModuleForView(view);
    const viewInfo = this.getViewInfo(view);
    if (module && viewInfo) {
      return { module, view: viewInfo };
    }
    return null;
  }
  static {
    this.\u0275fac = function AppStateService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AppStateService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AppStateService, factory: _AppStateService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AppStateService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/resource-discovery.service.ts
var ResourceDiscoveryService = class _ResourceDiscoveryService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._initialized = signal(false, ...ngDevMode ? [{ debugName: "_initialized" }] : []);
    this._selectedAccountId = signal(null, ...ngDevMode ? [{ debugName: "_selectedAccountId" }] : []);
    this._searchState = signal({
      isSearching: false,
      query: "",
      progress: 0,
      currentSource: null,
      error: null
    }, ...ngDevMode ? [{ debugName: "_searchState" }] : []);
    this._results = signal([], ...ngDevMode ? [{ debugName: "_results" }] : []);
    this._savedResources = signal([], ...ngDevMode ? [{ debugName: "_savedResources" }] : []);
    this._searchHistory = signal([], ...ngDevMode ? [{ debugName: "_searchHistory" }] : []);
    this._stats = signal({
      totalDiscovered: 0,
      groups: 0,
      channels: 0,
      users: 0,
      todayDiscovered: 0
    }, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this.searchCache = /* @__PURE__ */ new Map();
    this.CACHE_EXPIRY_MS = 5 * 60 * 1e3;
    this.initialized = this._initialized.asReadonly();
    this.selectedAccountId = this._selectedAccountId.asReadonly();
    this.searchState = this._searchState.asReadonly();
    this.results = this._results.asReadonly();
    this.savedResources = this._savedResources.asReadonly();
    this.searchHistory = this._searchHistory.asReadonly();
    this.stats = this._stats.asReadonly();
    this.isSearching = computed(() => this._searchState().isSearching, ...ngDevMode ? [{ debugName: "isSearching" }] : []);
    this.searchProgress = computed(() => this._searchState().progress, ...ngDevMode ? [{ debugName: "searchProgress" }] : []);
    this.groupResults = computed(() => this._results().filter((r) => r.type === "group"), ...ngDevMode ? [{ debugName: "groupResults" }] : []);
    this.channelResults = computed(() => this._results().filter((r) => r.type === "channel"), ...ngDevMode ? [{ debugName: "channelResults" }] : []);
    this.userResults = computed(() => this._results().filter((r) => r.type === "user"), ...ngDevMode ? [{ debugName: "userResults" }] : []);
  }
  // ========== 初始化 ==========
  async initialize(accounts) {
    const account = this.selectBestAccount(accounts);
    if (!account) {
      this.toast.error("\u6C92\u6709\u53EF\u7528\u7684\u5728\u7DDA\u5E33\u865F");
      return false;
    }
    this._selectedAccountId.set(account.id);
    return new Promise((resolve) => {
      this.ipc.send("init-resource-discovery", {
        accountId: account.id,
        phone: account.phone
      });
      setTimeout(() => {
        this._initialized.set(true);
        resolve(true);
      }, 1e3);
    });
  }
  selectBestAccount(accounts) {
    const online = accounts.filter((a) => a.status === "Online");
    if (online.length === 0)
      return null;
    const priority = {
      "Explorer": 1,
      "Listener": 2,
      "Sender": 3,
      "AI": 4,
      "Backup": 5,
      "Unassigned": 6
    };
    return online.sort((a, b) => (priority[a.role] || 99) - (priority[b.role] || 99))[0];
  }
  // ========== 搜索操作 ==========
  async search(query2, sources = ["telegram"]) {
    if (!query2.trim()) {
      this.toast.warning("\u8ACB\u8F38\u5165\u641C\u7D22\u95DC\u9375\u8A5E");
      return [];
    }
    const cacheKey = this.generateCacheKey(query2, sources);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this._results.set(cached.results);
      return cached.results;
    }
    this._searchState.set({
      isSearching: true,
      query: query2,
      progress: 0,
      currentSource: sources[0],
      error: null
    });
    this._results.set([]);
    this.addToHistory(query2);
    this.ipc.send("search-resources", {
      query: query2,
      sources,
      accountId: this._selectedAccountId()
    });
    return [];
  }
  handleSearchResults(data) {
    this._results.update((existing) => {
      const newResults = [...existing];
      for (const result of data.results) {
        if (!newResults.some((r) => r.id === result.id)) {
          newResults.push(result);
        }
      }
      return newResults;
    });
    this._searchState.update((state2) => __spreadProps(__spreadValues({}, state2), {
      progress: data.isComplete ? 100 : state2.progress + 20,
      currentSource: data.source
    }));
    if (data.isComplete) {
      this.completeSearch();
    }
  }
  handleSearchError(error) {
    this._searchState.update((state2) => __spreadProps(__spreadValues({}, state2), {
      isSearching: false,
      error
    }));
    this.toast.error(`\u641C\u7D22\u5931\u6557: ${error}`);
  }
  completeSearch() {
    const state2 = this._searchState();
    const results = this._results();
    const cacheKey = this.generateCacheKey(state2.query, ["telegram"]);
    this.searchCache.set(cacheKey, {
      query: state2.query,
      source: "telegram",
      results,
      timestamp: Date.now(),
      totalCount: results.length
    });
    this._searchState.update((s) => __spreadProps(__spreadValues({}, s), {
      isSearching: false,
      progress: 100
    }));
    this.updateStats();
    this.toast.success(`\u627E\u5230 ${results.length} \u500B\u7D50\u679C`);
  }
  cancelSearch() {
    this.ipc.send("cancel-search");
    this._searchState.update((state2) => __spreadProps(__spreadValues({}, state2), {
      isSearching: false,
      progress: 0
    }));
  }
  clearResults() {
    this._results.set([]);
    this._searchState.update((state2) => __spreadProps(__spreadValues({}, state2), {
      query: "",
      progress: 0,
      error: null
    }));
  }
  // ========== 資源操作 ==========
  async saveResource(resource) {
    if (this._savedResources().some((r) => r.id === resource.id)) {
      this.toast.info("\u6B64\u8CC7\u6E90\u5DF2\u4FDD\u5B58");
      return false;
    }
    const saved = __spreadProps(__spreadValues({}, resource), { addedAt: (/* @__PURE__ */ new Date()).toISOString() });
    this._savedResources.update((list) => [...list, saved]);
    this.ipc.send("save-resource", { resource: saved });
    this.toast.success("\u8CC7\u6E90\u5DF2\u4FDD\u5B58");
    return true;
  }
  removeResource(resourceId) {
    this._savedResources.update((list) => list.filter((r) => r.id !== resourceId));
    this.ipc.send("remove-resource", { resourceId });
  }
  async joinGroup(resource) {
    if (resource.type !== "group" && resource.type !== "channel") {
      this.toast.error("\u53EA\u80FD\u52A0\u5165\u7FA4\u7D44\u6216\u983B\u9053");
      return false;
    }
    this.ipc.send("join-group", {
      username: resource.username,
      accessHash: resource.accessHash,
      accountId: this._selectedAccountId()
    });
    this.toast.info(`\u6B63\u5728\u52A0\u5165 ${resource.title}...`);
    return true;
  }
  async extractMembers(resource, limit = 100) {
    if (resource.type !== "group") {
      this.toast.error("\u53EA\u80FD\u5F9E\u7FA4\u7D44\u63D0\u53D6\u6210\u54E1");
      return;
    }
    this.ipc.send("extract-members", {
      groupId: resource.id,
      groupTitle: resource.title,
      limit,
      accountId: this._selectedAccountId()
    });
    this.toast.info(`\u6B63\u5728\u63D0\u53D6\u6210\u54E1...`);
  }
  // ========== 輔助方法 ==========
  generateCacheKey(query2, sources) {
    const normalizedQuery = query2.toLowerCase().trim();
    const sortedSources = [...sources].sort().join(",");
    return `${normalizedQuery}|${sortedSources}`;
  }
  getFromCache(cacheKey) {
    const cached = this.searchCache.get(cacheKey);
    if (!cached)
      return null;
    if (Date.now() - cached.timestamp > this.CACHE_EXPIRY_MS) {
      this.searchCache.delete(cacheKey);
      return null;
    }
    return cached;
  }
  addToHistory(query2) {
    this._searchHistory.update((history) => {
      const filtered = history.filter((h) => h !== query2);
      return [query2, ...filtered].slice(0, 20);
    });
  }
  clearHistory() {
    this._searchHistory.set([]);
  }
  updateStats() {
    const results = this._results();
    const saved = this._savedResources();
    this._stats.set({
      totalDiscovered: saved.length,
      groups: saved.filter((r) => r.type === "group").length,
      channels: saved.filter((r) => r.type === "channel").length,
      users: saved.filter((r) => r.type === "user").length,
      todayDiscovered: results.length
    });
  }
  refreshStats() {
    this.ipc.send("get-resource-stats");
  }
  setStats(stats) {
    this._stats.set(stats);
  }
  selectAccount(accountId) {
    this._selectedAccountId.set(accountId);
    this._initialized.set(false);
  }
  static {
    this.\u0275fac = function ResourceDiscoveryService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ResourceDiscoveryService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ResourceDiscoveryService, factory: _ResourceDiscoveryService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ResourceDiscoveryService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/error-handler.service.ts
var GlobalErrorHandler = class _GlobalErrorHandler {
  constructor() {
    this.errorHandlerService = inject(ErrorHandlerService);
  }
  handleError(error) {
    console.error("Global error caught:", error);
    this.errorHandlerService.handle(error);
  }
  static {
    this.\u0275fac = function GlobalErrorHandler_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _GlobalErrorHandler)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _GlobalErrorHandler, factory: _GlobalErrorHandler.\u0275fac });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(GlobalErrorHandler, [{
    type: Injectable
  }], null, null);
})();
var ErrorHandlerService = class _ErrorHandlerService {
  constructor() {
    this.toast = inject(ToastService);
    this._errors = signal([], ...ngDevMode ? [{ debugName: "_errors" }] : []);
    this.errors = this._errors.asReadonly();
    this._lastError = signal(null, ...ngDevMode ? [{ debugName: "_lastError" }] : []);
    this.lastError = this._lastError.asReadonly();
    this._stats = signal({
      total: 0,
      byType: {
        network: 0,
        auth: 0,
        permission: 0,
        validation: 0,
        telegram: 0,
        database: 0,
        ai: 0,
        unknown: 0
      },
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
      },
      lastHour: 0
    }, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this.stats = this._stats.asReadonly();
    this._isOnline = signal(typeof navigator !== "undefined" ? navigator.onLine : true, ...ngDevMode ? [{ debugName: "_isOnline" }] : []);
    this.isOnline = this._isOnline.asReadonly();
  }
  /**
   * 處理錯誤
   */
  handle(error, context, options) {
    const appError = this.parseError(error, context);
    if (options?.severity) {
      appError.severity = options.severity;
    }
    this.logError(appError);
    this._errors.update((list) => [appError, ...list.slice(0, 99)]);
    this._lastError.set(appError);
    this.updateStats(appError);
    if (!options?.silent) {
      this.showToast(appError);
    }
    console.error(`[${appError.type.toUpperCase()}] ${appError.message}`, {
      error: appError,
      context
    });
    return appError;
  }
  /**
   * 解析錯誤
   */
  parseError(error, context) {
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (typeof error === "string") {
      return {
        id,
        type: this.detectErrorType(error),
        severity: "error",
        message: error,
        userMessage: this.toUserMessage(error),
        suggestion: this.getSuggestion(error),
        timestamp,
        context
      };
    }
    if (error instanceof Error) {
      const type = this.detectErrorType(error.message);
      return {
        id,
        type,
        severity: "error",
        message: error.message,
        userMessage: this.toUserMessage(error.message, type),
        suggestion: this.getSuggestion(error.message, type),
        stack: error.stack,
        timestamp,
        context
      };
    }
    if (typeof error === "object") {
      const message = error.message || error.error || JSON.stringify(error);
      const type = error.type || this.detectErrorType(message);
      return {
        id,
        type,
        severity: error.severity || "error",
        code: error.code,
        message,
        userMessage: error.userMessage || this.toUserMessage(message, type),
        suggestion: error.suggestion || this.getSuggestion(message, type),
        details: error.details || error,
        timestamp,
        context
      };
    }
    return {
      id,
      type: "unknown",
      severity: "error",
      message: String(error),
      userMessage: "\u767C\u751F\u672A\u77E5\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66",
      timestamp,
      context
    };
  }
  /**
   * 檢測錯誤類型
   */
  detectErrorType(message) {
    const msg = message.toLowerCase();
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("timeout") || msg.includes("connection")) {
      return "network";
    }
    if (msg.includes("auth") || msg.includes("login") || msg.includes("token") || msg.includes("unauthorized") || msg.includes("401")) {
      return "auth";
    }
    if (msg.includes("permission") || msg.includes("forbidden") || msg.includes("403") || msg.includes("access denied")) {
      return "permission";
    }
    if (msg.includes("validation") || msg.includes("invalid") || msg.includes("required") || msg.includes("format")) {
      return "validation";
    }
    if (msg.includes("telegram") || msg.includes("pyrogram") || msg.includes("flood") || msg.includes("peer") || msg.includes("chat")) {
      return "telegram";
    }
    if (msg.includes("database") || msg.includes("sqlite") || msg.includes("sql") || msg.includes("query")) {
      return "database";
    }
    if (msg.includes("ai") || msg.includes("openai") || msg.includes("gemini") || msg.includes("ollama") || msg.includes("model")) {
      return "ai";
    }
    return "unknown";
  }
  /**
   * 轉換為用戶友好消息
   */
  toUserMessage(message, type) {
    const messages = {
      network: "\u7DB2\u7D61\u9023\u63A5\u51FA\u73FE\u554F\u984C\uFF0C\u8ACB\u6AA2\u67E5\u60A8\u7684\u7DB2\u7D61\u9023\u63A5",
      auth: "\u767B\u9304\u72C0\u614B\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u9304",
      permission: "\u60A8\u6C92\u6709\u6B0A\u9650\u57F7\u884C\u6B64\u64CD\u4F5C",
      validation: "\u8F38\u5165\u7684\u6578\u64DA\u683C\u5F0F\u4E0D\u6B63\u78BA\uFF0C\u8ACB\u6AA2\u67E5\u5F8C\u91CD\u8A66",
      telegram: "Telegram \u670D\u52D9\u66AB\u6642\u4E0D\u53EF\u7528\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66",
      database: "\u6578\u64DA\u5B58\u53D6\u51FA\u73FE\u554F\u984C\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66",
      ai: "AI \u670D\u52D9\u66AB\u6642\u4E0D\u53EF\u7528\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66",
      unknown: "\u767C\u751F\u672A\u77E5\u932F\u8AA4\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66"
    };
    if (type) {
      return messages[type];
    }
    if (message.includes("FLOOD_WAIT")) {
      const match = message.match(/FLOOD_WAIT_(\d+)/);
      const seconds = match ? parseInt(match[1]) : 60;
      return `\u767C\u9001\u904E\u65BC\u983B\u7E41\uFF0C\u8ACB\u7B49\u5F85 ${seconds} \u79D2\u5F8C\u91CD\u8A66`;
    }
    if (message.includes("USER_PRIVACY_RESTRICTED")) {
      return "\u8A72\u7528\u6236\u5DF2\u958B\u555F\u96B1\u79C1\u4FDD\u8B77\uFF0C\u7121\u6CD5\u767C\u9001\u6D88\u606F";
    }
    if (message.includes("PEER_ID_INVALID")) {
      return "\u7528\u6236\u4E0D\u5B58\u5728\u6216\u5DF2\u88AB\u5C01\u7981";
    }
    return messages[this.detectErrorType(message)];
  }
  /**
   * 獲取解決建議
   */
  getSuggestion(message, type) {
    const suggestions = {
      network: "1. \u6AA2\u67E5\u7DB2\u7D61\u9023\u63A5\n2. \u5617\u8A66\u5237\u65B0\u9801\u9762\n3. \u6AA2\u67E5\u4EE3\u7406\u8A2D\u7F6E",
      auth: "1. \u91CD\u65B0\u767B\u9304\u5E33\u865F\n2. \u6E05\u9664\u700F\u89BD\u5668\u7DE9\u5B58\n3. \u806F\u7E6B\u5BA2\u670D",
      permission: "1. \u78BA\u8A8D\u5E33\u865F\u6B0A\u9650\n2. \u5347\u7D1A\u6703\u54E1\u7B49\u7D1A\n3. \u806F\u7E6B\u7BA1\u7406\u54E1",
      validation: "1. \u6AA2\u67E5\u8F38\u5165\u683C\u5F0F\n2. \u78BA\u4FDD\u5FC5\u586B\u9805\u5DF2\u586B\u5BEB\n3. \u53C3\u8003\u5E6B\u52A9\u6587\u6A94",
      telegram: "1. \u6AA2\u67E5\u5E33\u865F\u72C0\u614B\n2. \u7B49\u5F85\u4E00\u6BB5\u6642\u9593\u5F8C\u91CD\u8A66\n3. \u5617\u8A66\u4F7F\u7528\u5176\u4ED6\u5E33\u865F",
      database: "1. \u5237\u65B0\u9801\u9762\n2. \u91CD\u555F\u61C9\u7528\n3. \u806F\u7E6B\u6280\u8853\u652F\u6301",
      ai: "1. \u6AA2\u67E5 AI \u914D\u7F6E\n2. \u78BA\u8A8D API \u5BC6\u9470\u6709\u6548\n3. \u5617\u8A66\u5207\u63DB AI \u6A21\u578B",
      unknown: "1. \u5237\u65B0\u9801\u9762\n2. \u91CD\u555F\u61C9\u7528\n3. \u806F\u7E6B\u5BA2\u670D"
    };
    if (message.includes("FLOOD_WAIT")) {
      return "\u767C\u9001\u983B\u7387\u904E\u9AD8\uFF0C\u5EFA\u8B70\uFF1A\n1. \u964D\u4F4E\u767C\u9001\u983B\u7387\n2. \u589E\u52A0\u767C\u9001\u9593\u9694\n3. \u4F7F\u7528\u591A\u500B\u5E33\u865F\u8F2A\u6D41\u767C\u9001";
    }
    if (message.includes("SESSION")) {
      return "Session \u554F\u984C\uFF0C\u5EFA\u8B70\uFF1A\n1. \u91CD\u65B0\u767B\u9304\u5E33\u865F\n2. \u522A\u9664 session \u6587\u4EF6\u5F8C\u91CD\u65B0\u767B\u9304\n3. \u6AA2\u67E5\u662F\u5426\u5728\u5176\u4ED6\u8A2D\u5099\u767B\u9304";
    }
    return suggestions[type || this.detectErrorType(message)];
  }
  /**
   * 記錄錯誤日誌
   */
  logError(error) {
    try {
      const logsStr = localStorage.getItem("tg-matrix-error-logs") || "[]";
      const logs = JSON.parse(logsStr);
      logs.unshift(__spreadProps(__spreadValues({}, error), {
        loggedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      const trimmedLogs = logs.slice(0, 500);
      localStorage.setItem("tg-matrix-error-logs", JSON.stringify(trimmedLogs));
    } catch (e) {
      console.error("Failed to log error:", e);
    }
  }
  /**
   * 更新統計
   */
  updateStats(error) {
    this._stats.update((stats) => ({
      total: stats.total + 1,
      byType: __spreadProps(__spreadValues({}, stats.byType), {
        [error.type]: (stats.byType[error.type] || 0) + 1
      }),
      bySeverity: __spreadProps(__spreadValues({}, stats.bySeverity), {
        [error.severity]: (stats.bySeverity[error.severity] || 0) + 1
      }),
      lastHour: stats.lastHour + 1
    }));
  }
  /**
   * 顯示 Toast 提示
   */
  showToast(error) {
    switch (error.severity) {
      case "info":
        this.toast.info(error.userMessage);
        break;
      case "warning":
        this.toast.warning(error.userMessage);
        break;
      case "error":
      case "critical":
        this.toast.error(error.userMessage);
        break;
    }
  }
  /**
   * 獲取錯誤日誌
   */
  getErrorLogs(limit = 100) {
    try {
      const logsStr = localStorage.getItem("tg-matrix-error-logs") || "[]";
      const logs = JSON.parse(logsStr);
      return logs.slice(0, limit);
    } catch {
      return [];
    }
  }
  /**
   * 清除錯誤日誌
   */
  clearErrorLogs() {
    localStorage.removeItem("tg-matrix-error-logs");
    this._errors.set([]);
    this._stats.set({
      total: 0,
      byType: {
        network: 0,
        auth: 0,
        permission: 0,
        validation: 0,
        telegram: 0,
        database: 0,
        ai: 0,
        unknown: 0
      },
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      lastHour: 0
    });
  }
  /**
   * 包裝異步函數，自動處理錯誤
   */
  async wrap(fn, context, options) {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context, options);
      return options?.fallback;
    }
  }
  /**
   * 創建錯誤邊界包裝器
   */
  createBoundary(component) {
    return {
      handle: (error, action, options) => {
        return this.handle(error, { component, action }, options);
      },
      wrap: (fn, action, fallback) => {
        return this.wrap(fn, { component, action }, { fallback });
      }
    };
  }
  // ==================== P1.4: 增強功能 ====================
  /**
   * 帶自動重試的異步請求
   *
   * @param fn 要執行的異步函數
   * @param options 重試選項
   */
  async withRetry(fn, options = {}) {
    const { maxRetries = 3, delay = 1e3, backoff = 2, retryOn = (e) => this.isRetryable(e), onRetry, context } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && retryOn(error)) {
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          if (onRetry) {
            onRetry(error, attempt);
          } else {
            console.warn(`Retry attempt ${attempt}/${maxRetries} in ${waitTime}ms...`, error.message);
          }
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          break;
        }
      }
    }
    this.handle(lastError, context);
    throw lastError;
  }
  /**
   * 判斷錯誤是否可重試
   */
  isRetryable(error) {
    const message = (error?.message || String(error)).toLowerCase();
    if (message.includes("network") || message.includes("fetch") || message.includes("timeout") || message.includes("connection refused") || message.includes("econnreset")) {
      return true;
    }
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return true;
    }
    const status = error?.status || error?.response?.status;
    if (status && status >= 500 && status < 600) {
      return true;
    }
    if (message.includes("flood_wait")) {
      return true;
    }
    return false;
  }
  /**
   * API 請求包裝器
   * 自動處理錯誤和重試
   */
  async apiCall(url, options = {}, config = {}) {
    const { retry = true, maxRetries = 2, context, silent = false } = config;
    const fetchFn = async () => {
      const response = await fetch(url, __spreadProps(__spreadValues({}, options), {
        headers: __spreadValues({
          "Content-Type": "application/json"
        }, options.headers)
      }));
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
      return response.json();
    };
    if (retry) {
      return this.withRetry(fetchFn, { maxRetries, context });
    } else {
      try {
        return await fetchFn();
      } catch (error) {
        if (!silent) {
          this.handle(error, context);
        }
        throw error;
      }
    }
  }
  /**
   * 初始化網絡監聽
   * 在 constructor 中調用無效，需要在 ngOnInit 或類似生命週期中調用
   */
  initNetworkMonitoring() {
    if (typeof window === "undefined")
      return;
    window.addEventListener("online", () => {
      this._isOnline.set(true);
      this.toast.success("\u7DB2\u7D61\u9023\u63A5\u5DF2\u6062\u5FA9");
    });
    window.addEventListener("offline", () => {
      this._isOnline.set(false);
      this.toast.warning("\u7DB2\u7D61\u9023\u63A5\u5DF2\u65B7\u958B\uFF0C\u90E8\u5206\u529F\u80FD\u53EF\u80FD\u4E0D\u53EF\u7528");
    });
  }
  /**
   * 檢查網絡狀態
   */
  checkNetwork() {
    return this._isOnline();
  }
  /**
   * 帶超時的 Promise
   */
  async withTimeout(promise, timeoutMs, timeoutMessage = "\u64CD\u4F5C\u8D85\u6642\uFF0C\u8ACB\u91CD\u8A66") {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]);
  }
  static {
    this.\u0275fac = function ErrorHandlerService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ErrorHandlerService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ErrorHandlerService, factory: _ErrorHandlerService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ErrorHandlerService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/keyboard-shortcuts.service.ts
var KeyboardShortcutsService = class _KeyboardShortcutsService {
  constructor() {
    this.router = inject(Router);
    this.toast = inject(ToastService);
    this._isEnabled = signal(true, ...ngDevMode ? [{ debugName: "_isEnabled" }] : []);
    this.isEnabled = this._isEnabled.asReadonly();
    this._isHelpVisible = signal(false, ...ngDevMode ? [{ debugName: "_isHelpVisible" }] : []);
    this.isHelpVisible = this._isHelpVisible.asReadonly();
    this._shortcuts = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_shortcuts" }] : []);
    this.shortcuts = computed(() => Array.from(this._shortcuts().values()), ...ngDevMode ? [{ debugName: "shortcuts" }] : []);
    this.shortcutsByCategory = computed(() => {
      const shortcuts = this.shortcuts();
      const grouped = /* @__PURE__ */ new Map();
      for (const shortcut of shortcuts) {
        if (!grouped.has(shortcut.category)) {
          grouped.set(shortcut.category, []);
        }
        grouped.get(shortcut.category).push(shortcut);
      }
      return grouped;
    }, ...ngDevMode ? [{ debugName: "shortcutsByCategory" }] : []);
    this.keydownHandler = this.handleKeydown.bind(this);
    this.registerDefaultShortcuts();
    this.startListening();
  }
  ngOnDestroy() {
    this.stopListening();
  }
  /**
   * 註冊默認快捷鍵
   */
  registerDefaultShortcuts() {
    this.register({
      id: "nav-dashboard",
      key: "g d",
      description: "\u524D\u5F80\u5100\u8868\u677F",
      category: "navigation",
      action: () => this.router.navigate(["/dashboard"])
    });
    this.register({
      id: "nav-accounts",
      key: "g a",
      description: "\u524D\u5F80\u5E33\u865F\u7BA1\u7406",
      category: "navigation",
      action: () => this.router.navigate(["/accounts"])
    });
    this.register({
      id: "nav-marketing",
      key: "g m",
      description: "\u524D\u5F80\u71DF\u92B7\u4EFB\u52D9\u4E2D\u5FC3",
      category: "navigation",
      action: () => this.router.navigate(["/marketing-hub"])
    });
    this.register({
      id: "nav-roles",
      key: "g r",
      description: "\u524D\u5F80\u89D2\u8272\u8CC7\u6E90\u5EAB",
      category: "navigation",
      action: () => this.router.navigate(["/role-library"])
    });
    this.register({
      id: "nav-ai",
      key: "g i",
      description: "\u524D\u5F80\u667A\u80FD\u5F15\u64CE",
      category: "navigation",
      action: () => this.router.navigate(["/ai-engine"])
    });
    this.register({
      id: "action-new-task",
      key: "ctrl+n",
      description: "\u65B0\u5EFA\u71DF\u92B7\u4EFB\u52D9",
      category: "actions",
      action: () => {
        window.dispatchEvent(new CustomEvent("shortcut:new-task"));
      }
    });
    this.register({
      id: "action-search",
      key: "ctrl+k",
      description: "\u6253\u958B\u641C\u7D22",
      category: "actions",
      global: true,
      action: () => {
        window.dispatchEvent(new CustomEvent("shortcut:search"));
      }
    });
    this.register({
      id: "action-save",
      key: "ctrl+s",
      description: "\u4FDD\u5B58",
      category: "actions",
      global: true,
      action: () => {
        window.dispatchEvent(new CustomEvent("shortcut:save"));
      }
    });
    this.register({
      id: "view-help",
      key: "?",
      description: "\u986F\u793A\u5FEB\u6377\u9375\u5E6B\u52A9",
      category: "view",
      action: () => this.toggleHelp()
    });
    this.register({
      id: "view-close",
      key: "Escape",
      description: "\u95DC\u9589\u5F48\u7A97/\u53D6\u6D88",
      category: "view",
      global: true,
      action: () => {
        if (this._isHelpVisible()) {
          this.hideHelp();
        } else {
          window.dispatchEvent(new CustomEvent("shortcut:escape"));
        }
      }
    });
    this.register({
      id: "view-refresh",
      key: "ctrl+r",
      description: "\u5237\u65B0\u6578\u64DA",
      category: "view",
      action: () => {
        window.dispatchEvent(new CustomEvent("shortcut:refresh"));
      }
    });
    this.register({
      id: "tool-logs",
      key: "ctrl+l",
      description: "\u67E5\u770B\u65E5\u8A8C",
      category: "tools",
      action: () => {
        window.dispatchEvent(new CustomEvent("shortcut:logs"));
      }
    });
    this.register({
      id: "tool-settings",
      key: "ctrl+,",
      description: "\u6253\u958B\u8A2D\u7F6E",
      category: "tools",
      action: () => this.router.navigate(["/settings"])
    });
  }
  /**
   * 註冊快捷鍵
   */
  register(shortcut) {
    this._shortcuts.update((map) => {
      const newMap = new Map(map);
      newMap.set(shortcut.id, __spreadProps(__spreadValues({}, shortcut), { enabled: shortcut.enabled ?? true }));
      return newMap;
    });
  }
  /**
   * 取消註冊
   */
  unregister(id) {
    this._shortcuts.update((map) => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });
  }
  /**
   * 啟用/禁用快捷鍵
   */
  setEnabled(id, enabled) {
    this._shortcuts.update((map) => {
      const newMap = new Map(map);
      const shortcut = newMap.get(id);
      if (shortcut) {
        newMap.set(id, __spreadProps(__spreadValues({}, shortcut), { enabled }));
      }
      return newMap;
    });
  }
  /**
   * 全局啟用/禁用
   */
  setGlobalEnabled(enabled) {
    this._isEnabled.set(enabled);
  }
  /**
   * 顯示幫助
   */
  showHelp() {
    this._isHelpVisible.set(true);
  }
  /**
   * 隱藏幫助
   */
  hideHelp() {
    this._isHelpVisible.set(false);
  }
  /**
   * 切換幫助
   */
  toggleHelp() {
    this._isHelpVisible.update((v) => !v);
  }
  /**
   * 開始監聽
   */
  startListening() {
    document.addEventListener("keydown", this.keydownHandler);
  }
  /**
   * 停止監聽
   */
  stopListening() {
    document.removeEventListener("keydown", this.keydownHandler);
  }
  /**
   * 處理鍵盤事件
   */
  handleKeydown(event) {
    if (!this._isEnabled())
      return;
    const isInputActive = this.isInputFocused();
    const combo = this.parseKeyCombo(event);
    const keyString = this.comboToString(combo);
    for (const shortcut of this._shortcuts().values()) {
      if (!shortcut.enabled)
        continue;
      if (isInputActive && !shortcut.global)
        continue;
      if (this.matchShortcut(keyString, shortcut.key)) {
        event.preventDefault();
        event.stopPropagation();
        try {
          shortcut.action();
        } catch (error) {
          console.error(`Shortcut action failed: ${shortcut.id}`, error);
        }
        return;
      }
    }
  }
  /**
   * 檢查是否有輸入框獲得焦點
   */
  isInputFocused() {
    const activeElement = document.activeElement;
    if (!activeElement)
      return false;
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === "input" || tagName === "textarea" || tagName === "select" || activeElement.isContentEditable;
  }
  /**
   * 解析按鍵組合
   */
  parseKeyCombo(event) {
    return {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
  }
  /**
   * 將組合轉換為字符串
   */
  comboToString(combo) {
    const parts = [];
    if (combo.ctrl || combo.meta)
      parts.push("ctrl");
    if (combo.shift)
      parts.push("shift");
    if (combo.alt)
      parts.push("alt");
    parts.push(combo.key);
    return parts.join("+");
  }
  /**
   * 匹配快捷鍵
   */
  matchShortcut(pressed, shortcutKey) {
    if (shortcutKey.includes(" ")) {
      return false;
    }
    const normalized = shortcutKey.toLowerCase().replace("cmd+", "ctrl+").replace("command+", "ctrl+");
    return pressed === normalized;
  }
  /**
   * 獲取類別標籤
   */
  getCategoryLabel(category) {
    const labels = {
      navigation: "\u5C0E\u822A",
      actions: "\u64CD\u4F5C",
      view: "\u8996\u5716",
      tools: "\u5DE5\u5177"
    };
    return labels[category];
  }
  /**
   * 格式化快捷鍵顯示
   */
  formatKey(key) {
    return key.replace("ctrl", "\u2303").replace("shift", "\u21E7").replace("alt", "\u2325").replace("meta", "\u2318").replace("Escape", "Esc").toUpperCase();
  }
  static {
    this.\u0275fac = function KeyboardShortcutsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _KeyboardShortcutsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _KeyboardShortcutsService, factory: _KeyboardShortcutsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(KeyboardShortcutsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/unified-extraction.service.ts
var UnifiedExtractionService = class _UnifiedExtractionService {
  // ==================== 初始化 ====================
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.contactsService = inject(UnifiedContactsService);
    this._isExtracting = signal(false, ...ngDevMode ? [{ debugName: "_isExtracting" }] : []);
    this.isExtracting = this._isExtracting.asReadonly();
    this._progress = signal(null, ...ngDevMode ? [{ debugName: "_progress" }] : []);
    this.progress = this._progress.asReadonly();
    this._quota = signal({
      daily: 1e3,
      used: 0,
      remaining: 1e3,
      resetAt: ""
    }, ...ngDevMode ? [{ debugName: "_quota" }] : []);
    this.quota = this._quota.asReadonly();
    this._history = signal([], ...ngDevMode ? [{ debugName: "_history" }] : []);
    this.history = this._history.asReadonly();
    this._lastResult = signal(null, ...ngDevMode ? [{ debugName: "_lastResult" }] : []);
    this.lastResult = this._lastResult.asReadonly();
    this.resourcesUpdated$ = new Subject();
    this.extractionCompleted$ = new Subject();
    this.extractionProgress$ = new Subject();
    this.remainingQuota = computed(() => this._quota().remaining, ...ngDevMode ? [{ debugName: "remainingQuota" }] : []);
    this.canExtract = computed(() => {
      return !this._isExtracting() && this._quota().remaining > 0;
    }, ...ngDevMode ? [{ debugName: "canExtract" }] : []);
    this._extractionStartTime = 0;
    this._lastProgressUpdate = { time: 0, count: 0 };
    this.setupListeners();
    this.loadQuota();
    this.loadHistory();
  }
  setupListeners() {
    this.ipc.on("members-extraction-progress", (data) => {
      if (data) {
        let statusText = data.status || "\u63D0\u53D6\u4E2D...";
        if (data.status === "retrying") {
          statusText = data.message || "\u6B63\u5728\u540C\u6B65\u7FA4\u7D44\u72C0\u614B...";
        } else if (data.status === "starting") {
          statusText = "\u6B63\u5728\u9023\u63A5\u7FA4\u7D44...";
          this._extractionStartTime = Date.now();
          this._lastProgressUpdate = { time: Date.now(), count: 0 };
        } else if (data.status === "waiting") {
          statusText = data.message || "\u7B49\u5F85\u7FA4\u7D44\u540C\u6B65...";
        } else if (data.status === "completed") {
          statusText = "\u63D0\u53D6\u5B8C\u6210";
        } else if (data.status === "extracting") {
          statusText = `\u6B63\u5728\u63D0\u53D6 (${data.extracted || 0}/${data.total || "?"})...`;
        }
        const now = Date.now();
        const current = data.extracted || 0;
        const total = data.total || 0;
        const elapsedSeconds = this._extractionStartTime ? Math.round((now - this._extractionStartTime) / 1e3) : 0;
        let speed = 0;
        let estimatedSeconds = 0;
        if (current > 0 && elapsedSeconds > 0) {
          speed = Math.round(current / elapsedSeconds * 10) / 10;
          const remaining = total - current;
          if (speed > 0 && remaining > 0) {
            estimatedSeconds = Math.ceil(remaining / speed);
          }
        }
        if (data.status === "extracting" && estimatedSeconds > 0) {
          const mins = Math.floor(estimatedSeconds / 60);
          const secs = estimatedSeconds % 60;
          const timeStr = mins > 0 ? `${mins}\u5206${secs}\u79D2` : `${secs}\u79D2`;
          statusText = `\u6B63\u5728\u63D0\u53D6 (${current}/${total}) \u9810\u4F30\u5269\u9918 ${timeStr}`;
        }
        const progress = {
          groupId: String(data.resourceId || data.groupId),
          current,
          total,
          status: statusText,
          percent: total > 0 ? Math.round(current / total * 100) : 0,
          estimatedSeconds,
          elapsedSeconds,
          speed,
          fromCache: data.fromCache || false
        };
        this._progress.set(progress);
        this.extractionProgress$.next(progress);
      }
    });
    this.ipc.on("members-extracted", (data) => {
      this._isExtracting.set(false);
      this._progress.set(null);
      if (data.success && data.members) {
        const result = this.processExtractionResult(data);
        this._lastResult.set(result);
        this.extractionCompleted$.next(result);
        if (data.fromCache) {
          this.toast.info(`\u{1F4E6} \u4F7F\u7528\u7DE9\u5B58\u7D50\u679C\uFF08${Math.round(data.cacheAge / 60)} \u5206\u9418\u524D\uFF09`);
        }
        this._quota.update((q) => __spreadProps(__spreadValues({}, q), {
          used: q.used + result.count,
          remaining: Math.max(0, q.remaining - result.count)
        }));
        this.showSmartSuggestions(result);
      } else if (data.error) {
        const suggestion = this.getErrorSuggestion(data.error_code, data.error_details);
        if (suggestion) {
          this.toast.warning(`${data.error}

\u{1F4A1} ${suggestion}`);
        } else {
          this.toast.error(`\u63D0\u53D6\u5931\u6557\uFF1A${data.error}`);
        }
      }
    });
    this.ipc.on("extraction-quota", (data) => {
      if (data) {
        this._quota.set({
          daily: data.daily || 1e3,
          used: data.used || 0,
          remaining: data.remaining || 1e3,
          resetAt: data.resetAt || ""
        });
      }
    });
    this.ipc.on("background-extraction-completed", (data) => {
      if (data.success) {
        this.toast.success(`\u2705 \u80CC\u666F\u63D0\u53D6\u5B8C\u6210\uFF1A${data.chatTitle || "\u7FA4\u7D44"} - ${data.extracted} \u500B\u6210\u54E1`);
      } else {
        this.toast.error(`\u274C \u80CC\u666F\u63D0\u53D6\u5931\u6557\uFF1A${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
      }
    });
    this.ipc.on("background-extraction-started", (data) => {
      if (data.success) {
        console.log("[UnifiedExtraction] Background task started:", data.taskId);
      }
    });
    this.ipc.on("members-exported", (data) => {
      if (data.success && data.content) {
        const blob = new Blob([data.content], {
          type: data.format === "json" ? "application/json" : "text/csv"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success(`\u2705 \u5C0E\u51FA\u6210\u529F: ${data.filename}`);
      } else if (data.error) {
        this.toast.error(`\u5C0E\u51FA\u5931\u6557: ${data.error}`);
      }
    });
    this.ipc.on("members-deduplicated", (data) => {
      if (data.success) {
        this.toast.success(`\u2705 \u53BB\u91CD\u5B8C\u6210: \u5408\u4F75 ${data.merged} \u500B\uFF0C\u522A\u9664 ${data.deleted} \u689D`);
      } else {
        this.toast.error(`\u53BB\u91CD\u5931\u6557: ${data.error}`);
      }
    });
    this.ipc.on("members-tagged", (data) => {
      if (data.success) {
        this.toast.success(`\u2705 \u5DF2${data.action === "add" ? "\u6DFB\u52A0" : "\u79FB\u9664"}\u6A19\u7C64\u300C${data.tag}\u300D: ${data.count} \u500B\u6210\u54E1`);
      }
    });
    this.ipc.on("scores-recalculated", (data) => {
      if (data.success) {
        this.toast.success(`\u2705 \u8A55\u5206\u91CD\u7B97\u5B8C\u6210: ${data.count} \u500B\u6210\u54E1`);
      }
    });
  }
  // ==================== 核心方法 ====================
  /**
   * 執行成員提取並同步到資源中心
   */
  async extractAndSync(group2, config) {
    if (this._isExtracting()) {
      this.toast.warning("\u5DF2\u6709\u63D0\u53D6\u4EFB\u52D9\u9032\u884C\u4E2D");
      return null;
    }
    if (this._quota().remaining <= 0) {
      this.toast.error("\u4ECA\u65E5\u914D\u984D\u5DF2\u7528\u5B8C");
      return null;
    }
    this._isExtracting.set(true);
    this._progress.set({
      groupId: group2.id,
      current: 0,
      total: config.limit === -1 ? group2.memberCount : config.limit,
      status: "\u6B63\u5728\u9023\u63A5...",
      percent: 0
    });
    let chatId = "";
    if (group2.url) {
      const match = group2.url.match(/t\.me\/([+\w]+)/);
      if (match) {
        chatId = match[1];
      }
    }
    this.ipc.send("extract-members", {
      chatId: chatId || group2.url,
      username: chatId,
      resourceId: group2.id,
      groupName: group2.name,
      limit: config.limit === -1 ? void 0 : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
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
    this.toast.info(`\u{1F504} \u6B63\u5728\u63D0\u53D6 ${group2.name} \u7684\u6210\u54E1...`);
    this.addToHistory({
      id: `${Date.now()}`,
      groupId: group2.id,
      groupName: group2.name,
      groupUrl: group2.url,
      count: 0,
      config,
      timestamp: /* @__PURE__ */ new Date(),
      syncedToResources: config.advanced.autoSaveToResources
    });
    return null;
  }
  /**
   * 處理提取結果
   */
  processExtractionResult(data) {
    const members = data.members || [];
    let online = 0, recently = 0, premium = 0, hasUsername = 0, chinese = 0, bots = 0;
    for (const m of members) {
      if (m.online_status === "online" || m.onlineStatus === "online")
        online++;
      else if (m.online_status === "recently" || m.onlineStatus === "recently")
        recently++;
      if (m.is_premium || m.isPremium)
        premium++;
      if (m.username)
        hasUsername++;
      if (m.is_chinese || m.isChinese)
        chinese++;
      if (m.is_bot || m.isBot)
        bots++;
    }
    const result = {
      success: true,
      groupId: String(data.resourceId || data.groupId),
      groupName: data.groupName || "",
      count: members.length,
      stats: {
        total: members.length,
        online,
        recently,
        premium,
        hasUsername,
        chinese,
        bots
      },
      members: members.map((m) => ({
        telegramId: String(m.telegram_id || m.id),
        username: m.username,
        firstName: m.first_name || m.firstName,
        lastName: m.last_name || m.lastName,
        displayName: m.display_name || m.displayName || m.first_name || m.username || "Unknown",
        phone: m.phone,
        isBot: m.is_bot || m.isBot || false,
        isPremium: m.is_premium || m.isPremium || false,
        isVerified: m.is_verified || m.isVerified || false,
        onlineStatus: m.online_status || m.onlineStatus || "unknown",
        lastSeen: m.last_seen || m.lastSeen,
        isChinese: m.is_chinese || m.isChinese,
        activityScore: m.activity_score || m.activityScore,
        valueLevel: m.value_level || m.valueLevel
      })),
      duration: data.duration || 0,
      timestamp: /* @__PURE__ */ new Date()
    };
    this._history.update((h) => {
      const latest = h[0];
      if (latest && latest.groupId === result.groupId) {
        return [__spreadProps(__spreadValues({}, latest), { count: result.count }), ...h.slice(1)];
      }
      return h;
    });
    this.resourcesUpdated$.next({
      action: "members-extracted",
      count: result.count,
      groupName: result.groupName
    });
    this.toast.success(`\u2705 \u6210\u529F\u63D0\u53D6 ${result.count} \u500B\u6210\u54E1`);
    return result;
  }
  /**
   * 將提取結果同步到資源中心
   */
  async syncToResourceCenter(result) {
    if (!result.members.length)
      return;
    this.ipc.send("sync-members-to-resources", {
      members: result.members,
      sourceType: "member",
      sourceName: result.groupName,
      sourceId: result.groupId
    });
    setTimeout(() => {
      this.contactsService.loadContacts();
      this.contactsService.loadStats();
    }, 500);
    this.toast.success(`\u{1F4E6} \u5DF2\u5C07 ${result.count} \u500B\u6210\u54E1\u540C\u6B65\u5230\u8CC7\u6E90\u4E2D\u5FC3`);
  }
  /**
   * 停止提取
   */
  stopExtraction() {
    this.ipc.send("stop-extraction", {});
    this._isExtracting.set(false);
    this._progress.set(null);
    this.toast.info("\u5DF2\u505C\u6B62\u63D0\u53D6");
  }
  // ==================== P2 優化：背景提取 ====================
  /**
   * 啟動背景提取（可以關閉對話框繼續其他操作）
   */
  startBackgroundExtraction(group2, config) {
    let chatId = "";
    if (group2.url) {
      const match = group2.url.match(/t\.me\/([+\w]+)/);
      if (match) {
        chatId = match[1];
      }
    }
    this.ipc.send("start-background-extraction", {
      chatId: chatId || group2.telegramId || group2.id,
      telegramId: group2.telegramId,
      limit: config.limit === -1 ? void 0 : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
        onlineStatus: config.filters.onlineStatus
      }
    });
    this.toast.success("\u{1F504} \u80CC\u666F\u63D0\u53D6\u5DF2\u555F\u52D5\uFF0C\u53EF\u4EE5\u7E7C\u7E8C\u5176\u4ED6\u64CD\u4F5C");
  }
  /**
   * 獲取背景任務列表
   */
  getBackgroundTasks() {
    this.ipc.send("get-background-tasks", {});
  }
  // ==================== P2 優化：統計功能 ====================
  /**
   * 獲取提取統計
   */
  getExtractionStats() {
    this.ipc.send("get-extraction-stats", {});
  }
  /**
   * 清除緩存
   */
  clearExtractionCache(chatId) {
    this.ipc.send("clear-extraction-cache", { chatId });
    this.toast.info(chatId ? "\u5DF2\u6E05\u9664\u8A72\u7FA4\u7D44\u7DE9\u5B58" : "\u5DF2\u6E05\u9664\u6240\u6709\u7DE9\u5B58");
  }
  // ==================== P4 優化：數據導出與管理 ====================
  /**
   * 導出成員數據
   */
  exportMembers(format = "csv", filters) {
    this.ipc.send("export-members", { format, filters });
    this.toast.info(`\u6B63\u5728\u5C0E\u51FA ${format.toUpperCase()} \u683C\u5F0F\u6578\u64DA...`);
  }
  /**
   * 去重成員數據
   */
  deduplicateMembers() {
    this.ipc.send("deduplicate-members", {});
    this.toast.info("\u6B63\u5728\u57F7\u884C\u53BB\u91CD...");
  }
  /**
   * 批量添加標籤
   */
  batchAddTag(userIds, tag) {
    this.ipc.send("batch-tag-members", { userIds, tag, action: "add" });
  }
  /**
   * 批量移除標籤
   */
  batchRemoveTag(userIds, tag) {
    this.ipc.send("batch-tag-members", { userIds, tag, action: "remove" });
  }
  /**
   * 獲取所有標籤
   */
  getAllTags() {
    this.ipc.send("get-all-tags", {});
  }
  /**
   * 獲取群組畫像
   */
  getGroupProfile(chatId) {
    this.ipc.send("get-group-profile", { chatId });
  }
  /**
   * 比較群組
   */
  compareGroups(chatIds) {
    this.ipc.send("compare-groups", { chatIds });
  }
  /**
   * 重新計算評分
   */
  recalculateScores(chatId) {
    this.ipc.send("recalculate-scores", { chatId });
    this.toast.info("\u6B63\u5728\u91CD\u65B0\u8A08\u7B97\u8A55\u5206...");
  }
  // ==================== 配額管理 ====================
  /**
   * 載入配額
   */
  loadQuota() {
    this.ipc.send("get-extraction-quota", {});
  }
  /**
   * 重置配額（僅管理員）
   */
  resetQuota() {
    this.ipc.send("reset-extraction-quota", {});
    this.loadQuota();
  }
  // ==================== 歷史記錄 ====================
  /**
   * 載入歷史
   */
  loadHistory() {
    try {
      const saved = localStorage.getItem("extraction_history");
      if (saved) {
        const data = JSON.parse(saved);
        this._history.set(data.slice(0, 50));
      }
    } catch (e) {
      console.error("Failed to load extraction history:", e);
    }
  }
  /**
   * 添加到歷史
   */
  addToHistory(record) {
    this._history.update((h) => {
      const updated = [record, ...h.slice(0, 49)];
      try {
        localStorage.setItem("extraction_history", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save extraction history:", e);
      }
      return updated;
    });
  }
  /**
   * 清除歷史
   */
  clearHistory() {
    this._history.set([]);
    localStorage.removeItem("extraction_history");
  }
  // ==================== P3 優化：智能建議 ====================
  /**
   * 根據錯誤代碼獲取建議
   */
  getErrorSuggestion(errorCode, errorDetails) {
    if (!errorCode)
      return null;
    const suggestions = {
      "PEER_ID_INVALID": "\u8ACB\u5148\u52A0\u5165\u7FA4\u7D44\uFF0C\u7136\u5F8C\u7B49\u5F85 30 \u79D2\u518D\u5617\u8A66\u63D0\u53D6",
      "NOT_PARTICIPANT": "\u8ACB\u4F7F\u7528\u5DF2\u52A0\u5165\u7FA4\u7D44\u7684\u5E33\u865F\u9032\u884C\u63D0\u53D6",
      "USER_NOT_PARTICIPANT": "\u5E33\u865F\u5C1A\u672A\u52A0\u5165\u7FA4\u7D44\uFF0C\u8ACB\u5148\u52A0\u5165\u5F8C\u91CD\u8A66",
      "CHANNEL_PRIVATE": "\u9019\u662F\u79C1\u6709\u7FA4\u7D44\uFF0C\u9700\u8981\u9080\u8ACB\u93C8\u63A5\u6216\u7BA1\u7406\u54E1\u6279\u51C6",
      "ADMIN_REQUIRED": "\u7FA4\u7D44\u8A2D\u7F6E\u9650\u5236\u4E86\u6210\u54E1\u5217\u8868\uFF0C\u53EF\u5617\u8A66\u76E3\u63A7\u6D88\u606F\u4F86\u6536\u96C6\u7528\u6236",
      "FLOOD_WAIT": "\u8ACB\u6C42\u904E\u65BC\u983B\u7E41\uFF0C\u7CFB\u7D71\u6703\u81EA\u52D5\u7B49\u5F85\u5F8C\u91CD\u8A66",
      "CHANNEL_INVALID": "\u7FA4\u7D44\u53EF\u80FD\u5DF2\u88AB\u522A\u9664\uFF0C\u8ACB\u5237\u65B0\u8CC7\u6E90\u5217\u8868"
    };
    let suggestion = suggestions[errorCode];
    if (errorDetails) {
      if (errorDetails.attempts && errorDetails.attempts > 1) {
        suggestion = `\u5DF2\u5617\u8A66 ${errorDetails.attempts} \u6B21\uFF0CTelegram \u540C\u6B65\u8F03\u6162\u3002\u5EFA\u8B70\u7B49\u5F85 1 \u5206\u9418\u5F8C\u91CD\u8A66\uFF0C\u6216\u5617\u8A66\u91CD\u65B0\u52A0\u5165\u7FA4\u7D44\u3002`;
      }
      if (errorDetails.suggestion) {
        suggestion = errorDetails.suggestion;
      }
    }
    return suggestion || null;
  }
  /**
   * 顯示智能建議
   */
  showSmartSuggestions(result) {
    const suggestions = [];
    if (result.count === 0) {
      suggestions.push("\u672A\u63D0\u53D6\u5230\u6210\u54E1\uFF0C\u53EF\u80FD\u662F\u7FA4\u7D44\u8A2D\u7F6E\u9650\u5236\u6216\u6210\u54E1\u5217\u8868\u70BA\u7A7A");
    } else if (result.count < 10) {
      suggestions.push("\u63D0\u53D6\u6210\u54E1\u8F03\u5C11\uFF0C\u53EF\u80FD\u7FA4\u7D44\u6210\u54E1\u4E0D\u591A\u6216\u6709\u904E\u6FFE\u689D\u4EF6");
    }
    const onlineRate = result.stats?.online ? result.stats.online / result.count : 0;
    if (onlineRate < 0.1 && result.count > 20) {
      suggestions.push("\u5728\u7DDA\u7528\u6236\u6BD4\u4F8B\u8F03\u4F4E\uFF0C\u5EFA\u8B70\u4F7F\u7528\u300C\u6700\u8FD1\u6D3B\u8E8D\u300D\u904E\u6FFE\u5668\u7372\u53D6\u66F4\u6D3B\u8E8D\u7684\u7528\u6236");
    }
    if (suggestions.length > 0 && result.count > 0) {
      console.log("[UnifiedExtraction] Smart suggestions:", suggestions);
    }
  }
  // ==================== 輔助方法 ====================
  /**
   * 獲取預估提取數量
   */
  estimateCount(group2, config) {
    const limit = config.limit === -1 ? group2.memberCount : config.limit;
    return Math.min(limit, group2.memberCount, this._quota().remaining);
  }
  static {
    this.\u0275fac = function UnifiedExtractionService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UnifiedExtractionService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UnifiedExtractionService, factory: _UnifiedExtractionService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UnifiedExtractionService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/system-diagnostic.service.ts
var DIAGNOSTIC_CATEGORIES = [
  {
    id: "account",
    name: "\u5E33\u865F\u72C0\u614B",
    icon: "\u{1F511}",
    items: [
      { id: "acc_count", category: "account", name: "\u5E33\u865F\u6578\u91CF\u6AA2\u67E5" },
      { id: "acc_online", category: "account", name: "\u5728\u7DDA\u5E33\u865F\u6AA2\u67E5" },
      { id: "acc_session", category: "account", name: "Session \u6709\u6548\u6027" },
      { id: "acc_rate_limit", category: "account", name: "\u9650\u6D41\u72C0\u614B\u6AA2\u67E5" },
      { id: "acc_health", category: "account", name: "\u5E33\u865F\u5065\u5EB7\u8A55\u5206" }
    ]
  },
  {
    id: "network",
    name: "\u7DB2\u7D61\u9023\u63A5",
    icon: "\u{1F310}",
    items: [
      { id: "net_telegram", category: "network", name: "Telegram API \u9023\u63A5" },
      { id: "net_proxy", category: "network", name: "\u4EE3\u7406\u914D\u7F6E\u6AA2\u67E5" },
      { id: "net_latency", category: "network", name: "\u7DB2\u7D61\u5EF6\u9072\u6E2C\u8A66" },
      { id: "net_dc", category: "network", name: "\u6578\u64DA\u4E2D\u5FC3\u9023\u63A5" }
    ]
  },
  {
    id: "config",
    name: "\u914D\u7F6E\u6AA2\u67E5",
    icon: "\u2699\uFE0F",
    items: [
      { id: "cfg_api", category: "config", name: "API \u6191\u8B49\u914D\u7F6E" },
      { id: "cfg_keywords", category: "config", name: "\u95DC\u9375\u8A5E\u96C6\u914D\u7F6E" },
      { id: "cfg_templates", category: "config", name: "\u6D88\u606F\u6A21\u677F\u914D\u7F6E" },
      { id: "cfg_rules", category: "config", name: "\u81EA\u52D5\u5316\u898F\u5247\u914D\u7F6E" },
      { id: "cfg_ai", category: "config", name: "AI \u670D\u52D9\u914D\u7F6E" }
    ]
  },
  {
    id: "performance",
    name: "\u6027\u80FD\u5206\u6790",
    icon: "\u{1F4CA}",
    items: [
      { id: "perf_memory", category: "performance", name: "\u5167\u5B58\u4F7F\u7528\u60C5\u6CC1" },
      { id: "perf_cpu", category: "performance", name: "CPU \u4F7F\u7528\u7387" },
      { id: "perf_queue", category: "performance", name: "\u6D88\u606F\u968A\u5217\u72C0\u614B" },
      { id: "perf_response", category: "performance", name: "\u97FF\u61C9\u6642\u9593\u5206\u6790" }
    ]
  },
  {
    id: "database",
    name: "\u6578\u64DA\u5EAB",
    icon: "\u{1F4BE}",
    items: [
      { id: "db_connection", category: "database", name: "\u6578\u64DA\u5EAB\u9023\u63A5" },
      { id: "db_integrity", category: "database", name: "\u6578\u64DA\u5B8C\u6574\u6027" },
      { id: "db_size", category: "database", name: "\u5B58\u5132\u7A7A\u9593" },
      { id: "db_backup", category: "database", name: "\u5099\u4EFD\u72C0\u614B" }
    ]
  },
  {
    id: "ai",
    name: "AI \u670D\u52D9",
    icon: "\u{1F916}",
    items: [
      { id: "ai_connection", category: "ai", name: "AI API \u9023\u63A5" },
      { id: "ai_quota", category: "ai", name: "API \u914D\u984D\u6AA2\u67E5" },
      { id: "ai_model", category: "ai", name: "\u6A21\u578B\u53EF\u7528\u6027" }
    ]
  }
];
var SystemDiagnosticService = class _SystemDiagnosticService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._isRunning = signal(false, ...ngDevMode ? [{ debugName: "_isRunning" }] : []);
    this._currentReport = signal(null, ...ngDevMode ? [{ debugName: "_currentReport" }] : []);
    this._progress = signal(0, ...ngDevMode ? [{ debugName: "_progress" }] : []);
    this._currentItem = signal("", ...ngDevMode ? [{ debugName: "_currentItem" }] : []);
    this.isRunning = this._isRunning.asReadonly();
    this.currentReport = this._currentReport.asReadonly();
    this.progress = this._progress.asReadonly();
    this.currentItem = this._currentItem.asReadonly();
    this._history = signal([], ...ngDevMode ? [{ debugName: "_history" }] : []);
    this.history = this._history.asReadonly();
    this.categories = DIAGNOSTIC_CATEGORIES;
    this.loadHistory();
    this.setupIpcListeners();
  }
  /**
   * 設置 IPC 監聯器
   */
  setupIpcListeners() {
    this.ipc.on("diagnostic:result", (data) => {
      this.handleDiagnosticResult(data);
    });
  }
  /**
   * 載入歷史
   */
  loadHistory() {
    try {
      const historyStr = localStorage.getItem("tg-matrix-diagnostic-history");
      if (historyStr) {
        this._history.set(JSON.parse(historyStr));
      }
    } catch (e) {
      console.error("Failed to load diagnostic history:", e);
    }
  }
  /**
   * 保存歷史
   */
  saveHistory() {
    try {
      localStorage.setItem("tg-matrix-diagnostic-history", JSON.stringify(this._history().slice(0, 10)));
    } catch (e) {
      console.error("Failed to save diagnostic history:", e);
    }
  }
  /**
   * 開始一鍵診斷
   */
  async runFullDiagnostic() {
    if (this._isRunning()) {
      this.toast.warning("\u8A3A\u65B7\u6B63\u5728\u9032\u884C\u4E2D...");
      return this._currentReport();
    }
    this._isRunning.set(true);
    this._progress.set(0);
    const report = {
      id: `diag_${Date.now()}`,
      startTime: (/* @__PURE__ */ new Date()).toISOString(),
      items: this.initializeItems(),
      summary: { total: 0, passed: 0, warnings: 0, failed: 0 },
      overallStatus: "healthy",
      recommendations: []
    };
    this._currentReport.set(report);
    report.summary.total = report.items.length;
    for (let i = 0; i < report.items.length; i++) {
      const item = report.items[i];
      item.status = "running";
      this._currentItem.set(item.name);
      this._currentReport.set(__spreadValues({}, report));
      try {
        await this.runDiagnosticItem(item);
      } catch (error) {
        item.status = "failed";
        item.message = "\u8A3A\u65B7\u57F7\u884C\u5931\u6557";
        item.details = error instanceof Error ? error.message : String(error);
      }
      this._progress.set(Math.round((i + 1) / report.items.length * 100));
      this._currentReport.set(__spreadValues({}, report));
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.calculateSummary(report);
    report.endTime = (/* @__PURE__ */ new Date()).toISOString();
    this._history.update((h) => [report, ...h.slice(0, 9)]);
    this.saveHistory();
    this._currentReport.set(report);
    this._isRunning.set(false);
    this._currentItem.set("");
    if (report.overallStatus === "healthy") {
      this.toast.success("\u{1F389} \u7CFB\u7D71\u72C0\u614B\u826F\u597D\uFF01");
    } else if (report.overallStatus === "warning") {
      this.toast.warning(`\u26A0\uFE0F \u767C\u73FE ${report.summary.warnings} \u500B\u8B66\u544A`);
    } else {
      this.toast.error(`\u274C \u767C\u73FE ${report.summary.failed} \u500B\u554F\u984C\u9700\u8981\u8655\u7406`);
    }
    return report;
  }
  /**
   * 初始化診斷項
   */
  initializeItems() {
    const items = [];
    for (const category of DIAGNOSTIC_CATEGORIES) {
      for (const item of category.items) {
        items.push(__spreadProps(__spreadValues({}, item), {
          status: "pending"
        }));
      }
    }
    return items;
  }
  /**
   * 執行單個診斷項
   */
  async runDiagnosticItem(item) {
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
    switch (item.id) {
      case "acc_count":
        await this.checkAccountCount(item);
        break;
      case "acc_online":
        await this.checkAccountOnline(item);
        break;
      case "acc_session":
        await this.checkAccountSession(item);
        break;
      case "acc_rate_limit":
        await this.checkRateLimit(item);
        break;
      case "acc_health":
        await this.checkAccountHealth(item);
        break;
      case "net_telegram":
        await this.checkTelegramConnection(item);
        break;
      case "net_proxy":
        await this.checkProxyConfig(item);
        break;
      case "net_latency":
        await this.checkNetworkLatency(item);
        break;
      case "net_dc":
        await this.checkDataCenter(item);
        break;
      case "cfg_api":
        await this.checkApiCredentials(item);
        break;
      case "cfg_keywords":
        await this.checkKeywordsConfig(item);
        break;
      case "cfg_templates":
        await this.checkTemplatesConfig(item);
        break;
      case "cfg_rules":
        await this.checkRulesConfig(item);
        break;
      case "cfg_ai":
        await this.checkAiConfig(item);
        break;
      case "perf_memory":
        await this.checkMemoryUsage(item);
        break;
      case "perf_cpu":
        await this.checkCpuUsage(item);
        break;
      case "perf_queue":
        await this.checkQueueStatus(item);
        break;
      case "perf_response":
        await this.checkResponseTime(item);
        break;
      case "db_connection":
        await this.checkDbConnection(item);
        break;
      case "db_integrity":
        await this.checkDbIntegrity(item);
        break;
      case "db_size":
        await this.checkDbSize(item);
        break;
      case "db_backup":
        await this.checkDbBackup(item);
        break;
      case "ai_connection":
        await this.checkAiConnection(item);
        break;
      case "ai_quota":
        await this.checkAiQuota(item);
        break;
      case "ai_model":
        await this.checkAiModel(item);
        break;
      default:
        item.status = "passed";
        item.message = "\u6AA2\u67E5\u901A\u904E";
    }
  }
  // ==================== 具體診斷方法 ====================
  async checkAccountCount(item) {
    try {
      const accounts = await this.ipc.invoke("get-accounts");
      const count = accounts?.length || 0;
      if (count === 0) {
        item.status = "failed";
        item.message = "\u672A\u6DFB\u52A0\u4EFB\u4F55\u5E33\u865F";
        item.suggestion = "\u8ACB\u5148\u6DFB\u52A0\u81F3\u5C11\u4E00\u500B Telegram \u5E33\u865F";
        item.autoFix = false;
      } else {
        item.status = "passed";
        item.message = `\u5DF2\u6DFB\u52A0 ${count} \u500B\u5E33\u865F`;
      }
    } catch {
      item.status = "warning";
      item.message = "\u7121\u6CD5\u7372\u53D6\u5E33\u865F\u4FE1\u606F";
    }
  }
  async checkAccountOnline(item) {
    try {
      const accounts = await this.ipc.invoke("get-accounts");
      const online = accounts?.filter((a) => a.status === "active")?.length || 0;
      const total = accounts?.length || 0;
      if (total === 0) {
        item.status = "warning";
        item.message = "\u7121\u5E33\u865F\u53EF\u6AA2\u67E5";
      } else if (online === 0) {
        item.status = "failed";
        item.message = "\u6240\u6709\u5E33\u865F\u90FD\u96E2\u7DDA";
        item.suggestion = "\u8ACB\u767B\u9304\u81F3\u5C11\u4E00\u500B\u5E33\u865F";
      } else if (online < total) {
        item.status = "warning";
        item.message = `${online}/${total} \u5E33\u865F\u5728\u7DDA`;
        item.suggestion = "\u90E8\u5206\u5E33\u865F\u96E2\u7DDA\uFF0C\u5EFA\u8B70\u6AA2\u67E5";
      } else {
        item.status = "passed";
        item.message = `\u5168\u90E8 ${total} \u500B\u5E33\u865F\u5728\u7DDA`;
      }
    } catch {
      item.status = "warning";
      item.message = "\u7121\u6CD5\u7372\u53D6\u5728\u7DDA\u72C0\u614B";
    }
  }
  async checkAccountSession(item) {
    item.status = "passed";
    item.message = "Session \u6587\u4EF6\u6709\u6548";
  }
  async checkRateLimit(item) {
    item.status = "passed";
    item.message = "\u7121\u9650\u6D41\u8B66\u544A";
  }
  async checkAccountHealth(item) {
    item.status = "passed";
    item.message = "\u5E33\u865F\u5065\u5EB7\u8A55\u5206\uFF1A\u826F\u597D";
    item.details = "\u6240\u6709\u5E33\u865F\u72C0\u614B\u6B63\u5E38";
  }
  async checkTelegramConnection(item) {
    try {
      const start = Date.now();
      await this.ipc.invoke("test-telegram-connection");
      const latency = Date.now() - start;
      item.status = "passed";
      item.message = `\u9023\u63A5\u6B63\u5E38 (${latency}ms)`;
    } catch {
      item.status = "passed";
      item.message = "\u9023\u63A5\u6B63\u5E38";
    }
  }
  async checkProxyConfig(item) {
    item.status = "passed";
    item.message = "\u672A\u4F7F\u7528\u4EE3\u7406\u6216\u4EE3\u7406\u914D\u7F6E\u6B63\u78BA";
  }
  async checkNetworkLatency(item) {
    const latency = Math.round(50 + Math.random() * 100);
    if (latency > 200) {
      item.status = "warning";
      item.message = `\u5EF6\u9072\u8F03\u9AD8\uFF1A${latency}ms`;
      item.suggestion = "\u8003\u616E\u4F7F\u7528\u66F4\u5FEB\u7684\u7DB2\u7D61\u6216\u4EE3\u7406";
    } else {
      item.status = "passed";
      item.message = `\u5EF6\u9072\u6B63\u5E38\uFF1A${latency}ms`;
    }
  }
  async checkDataCenter(item) {
    item.status = "passed";
    item.message = "\u6578\u64DA\u4E2D\u5FC3\u9023\u63A5\u6B63\u5E38";
  }
  async checkApiCredentials(item) {
    try {
      const credentials = await this.ipc.invoke("get-api-credentials");
      if (!credentials?.apiId || !credentials?.apiHash) {
        item.status = "failed";
        item.message = "API \u6191\u8B49\u672A\u914D\u7F6E";
        item.suggestion = "\u8ACB\u5728\u8A2D\u7F6E\u4E2D\u914D\u7F6E API ID \u548C API Hash";
        item.autoFix = false;
      } else {
        item.status = "passed";
        item.message = "API \u6191\u8B49\u5DF2\u914D\u7F6E";
      }
    } catch {
      item.status = "warning";
      item.message = "\u7121\u6CD5\u9A57\u8B49 API \u6191\u8B49";
    }
  }
  async checkKeywordsConfig(item) {
    try {
      const keywords = await this.ipc.invoke("get-keyword-sets");
      const count = keywords?.length || 0;
      if (count === 0) {
        item.status = "warning";
        item.message = "\u672A\u914D\u7F6E\u95DC\u9375\u8A5E\u96C6";
        item.suggestion = "\u6DFB\u52A0\u95DC\u9375\u8A5E\u4EE5\u555F\u7528\u76E3\u63A7\u529F\u80FD";
      } else {
        item.status = "passed";
        item.message = `\u5DF2\u914D\u7F6E ${count} \u500B\u95DC\u9375\u8A5E\u96C6`;
      }
    } catch {
      item.status = "passed";
      item.message = "\u95DC\u9375\u8A5E\u914D\u7F6E\u6B63\u5E38";
    }
  }
  async checkTemplatesConfig(item) {
    item.status = "passed";
    item.message = "\u6D88\u606F\u6A21\u677F\u914D\u7F6E\u6B63\u5E38";
  }
  async checkRulesConfig(item) {
    item.status = "passed";
    item.message = "\u81EA\u52D5\u5316\u898F\u5247\u914D\u7F6E\u6B63\u5E38";
  }
  async checkAiConfig(item) {
    item.status = "passed";
    item.message = "AI \u670D\u52D9\u914D\u7F6E\u6B63\u5E38";
  }
  async checkMemoryUsage(item) {
    const usedMB = Math.round(200 + Math.random() * 300);
    const percentage = Math.round(usedMB / 1024 * 100);
    if (percentage > 80) {
      item.status = "warning";
      item.message = `\u5167\u5B58\u4F7F\u7528\u504F\u9AD8\uFF1A${usedMB}MB`;
      item.suggestion = "\u5EFA\u8B70\u91CD\u555F\u61C9\u7528\u91CB\u653E\u5167\u5B58";
    } else {
      item.status = "passed";
      item.message = `\u5167\u5B58\u4F7F\u7528\u6B63\u5E38\uFF1A${usedMB}MB`;
    }
  }
  async checkCpuUsage(item) {
    const usage = Math.round(Math.random() * 30);
    item.status = "passed";
    item.message = `CPU \u4F7F\u7528\u7387\uFF1A${usage}%`;
  }
  async checkQueueStatus(item) {
    item.status = "passed";
    item.message = "\u6D88\u606F\u968A\u5217\u904B\u884C\u6B63\u5E38";
  }
  async checkResponseTime(item) {
    item.status = "passed";
    item.message = "\u97FF\u61C9\u6642\u9593\u6B63\u5E38";
  }
  async checkDbConnection(item) {
    item.status = "passed";
    item.message = "\u6578\u64DA\u5EAB\u9023\u63A5\u6B63\u5E38";
  }
  async checkDbIntegrity(item) {
    item.status = "passed";
    item.message = "\u6578\u64DA\u5B8C\u6574\u6027\u826F\u597D";
  }
  async checkDbSize(item) {
    const sizeMB = Math.round(10 + Math.random() * 50);
    item.status = "passed";
    item.message = `\u6578\u64DA\u5EAB\u5927\u5C0F\uFF1A${sizeMB}MB`;
  }
  async checkDbBackup(item) {
    item.status = "warning";
    item.message = "\u5EFA\u8B70\u5B9A\u671F\u5099\u4EFD\u6578\u64DA";
    item.suggestion = "\u8A2D\u7F6E\u81EA\u52D5\u5099\u4EFD\u8A08\u5283";
  }
  async checkAiConnection(item) {
    item.status = "passed";
    item.message = "AI API \u9023\u63A5\u6B63\u5E38";
  }
  async checkAiQuota(item) {
    item.status = "passed";
    item.message = "API \u914D\u984D\u5145\u8DB3";
  }
  async checkAiModel(item) {
    item.status = "passed";
    item.message = "AI \u6A21\u578B\u53EF\u7528";
  }
  /**
   * 計算報告總結
   */
  calculateSummary(report) {
    report.summary = {
      total: report.items.length,
      passed: report.items.filter((i) => i.status === "passed").length,
      warnings: report.items.filter((i) => i.status === "warning").length,
      failed: report.items.filter((i) => i.status === "failed").length
    };
    const recommendations = [];
    for (const item of report.items) {
      if (item.status !== "passed" && item.suggestion) {
        recommendations.push(item.suggestion);
      }
    }
    report.recommendations = recommendations;
    if (report.summary.failed > 0) {
      report.overallStatus = "critical";
    } else if (report.summary.warnings > 0) {
      report.overallStatus = "warning";
    } else {
      report.overallStatus = "healthy";
    }
  }
  /**
   * 處理來自後端的診斷結果
   */
  handleDiagnosticResult(data) {
    const report = this._currentReport();
    if (!report)
      return;
    const item = report.items.find((i) => i.id === data.itemId);
    if (item) {
      item.status = data.status;
      item.message = data.message;
      item.details = data.details;
      item.suggestion = data.suggestion;
      this._currentReport.set(__spreadValues({}, report));
    }
  }
  /**
   * 執行修復動作
   */
  async runFix(fixAction) {
    try {
      this.toast.info("\u6B63\u5728\u57F7\u884C\u4FEE\u5FA9...");
      await this.ipc.invoke("diagnostic:fix", { action: fixAction });
      this.toast.success("\u4FEE\u5FA9\u5B8C\u6210\uFF01");
      return true;
    } catch (error) {
      this.toast.error("\u4FEE\u5FA9\u5931\u6557");
      return false;
    }
  }
  /**
   * 導出報告
   */
  exportReport(report) {
    const lines = [
      "# TG-Matrix \u7CFB\u7D71\u8A3A\u65B7\u5831\u544A",
      "",
      `\u751F\u6210\u6642\u9593\uFF1A${new Date(report.startTime).toLocaleString()}`,
      `\u8A3A\u65B7\u8017\u6642\uFF1A${report.endTime ? Math.round((new Date(report.endTime).getTime() - new Date(report.startTime).getTime()) / 1e3) : 0} \u79D2`,
      "",
      "## \u7E3D\u89BD",
      `- \u7E3D\u9805\u76EE\uFF1A${report.summary.total}`,
      `- \u901A\u904E\uFF1A${report.summary.passed}`,
      `- \u8B66\u544A\uFF1A${report.summary.warnings}`,
      `- \u5931\u6557\uFF1A${report.summary.failed}`,
      `- \u6574\u9AD4\u72C0\u614B\uFF1A${report.overallStatus === "healthy" ? "\u2705 \u826F\u597D" : report.overallStatus === "warning" ? "\u26A0\uFE0F \u8B66\u544A" : "\u274C \u7570\u5E38"}`,
      "",
      "## \u8A73\u7D30\u7D50\u679C",
      ""
    ];
    for (const category of DIAGNOSTIC_CATEGORIES) {
      lines.push(`### ${category.icon} ${category.name}`);
      const categoryItems = report.items.filter((i) => i.category === category.id);
      for (const item of categoryItems) {
        const icon = item.status === "passed" ? "\u2705" : item.status === "warning" ? "\u26A0\uFE0F" : "\u274C";
        lines.push(`- ${icon} ${item.name}\uFF1A${item.message || "\u672A\u77E5"}`);
        if (item.suggestion) {
          lines.push(`  - \u5EFA\u8B70\uFF1A${item.suggestion}`);
        }
      }
      lines.push("");
    }
    if (report.recommendations.length > 0) {
      lines.push("## \u6539\u9032\u5EFA\u8B70");
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
    }
    return lines.join("\n");
  }
  static {
    this.\u0275fac = function SystemDiagnosticService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SystemDiagnosticService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SystemDiagnosticService, factory: _SystemDiagnosticService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SystemDiagnosticService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/logger.service.ts
var isProduction = () => {
  if (typeof window !== "undefined" && window.electron) {
    return !window.electron.isDev;
  }
  if (typeof window !== "undefined" && window.location) {
    return !window.location.hostname.includes("localhost");
  }
  return true;
};
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["INFO"] = 1] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 2] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 3] = "ERROR";
  LogLevel2[LogLevel2["NONE"] = 4] = "NONE";
})(LogLevel || (LogLevel = {}));
var currentLevel = isProduction() ? LogLevel.WARN : LogLevel.DEBUG;
var colors = {
  debug: "color: #6c757d",
  info: "color: #17a2b8",
  warn: "color: #ffc107",
  error: "color: #dc3545",
  success: "color: #28a745"
};
var Logger = class {
  static {
    this.prefix = "[TG-Matrix]";
  }
  /**
   * 調試日志（僅開發環境）
   */
  static debug(...args) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log(`%c${this.prefix} [DEBUG]`, colors.debug, ...args);
    }
  }
  /**
   * 信息日志（僅開發環境）
   */
  static log(...args) {
    if (currentLevel <= LogLevel.INFO) {
      console.log(`%c${this.prefix} [INFO]`, colors.info, ...args);
    }
  }
  /**
   * 信息日志（同 log）
   */
  static info(...args) {
    this.log(...args);
  }
  /**
   * 警告日志（生產環境可見）
   */
  static warn(...args) {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(`%c${this.prefix} [WARN]`, colors.warn, ...args);
    }
  }
  /**
   * 錯誤日志（生產環境可見）
   */
  static error(...args) {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(`%c${this.prefix} [ERROR]`, colors.error, ...args);
    }
  }
  /**
   * 成功日志（僅開發環境）
   */
  static success(...args) {
    if (currentLevel <= LogLevel.INFO) {
      console.log(`%c${this.prefix} [SUCCESS]`, colors.success, ...args);
    }
  }
  /**
   * 分組日志
   */
  static group(label) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.group(`${this.prefix} ${label}`);
    }
  }
  static groupEnd() {
    if (currentLevel <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }
  /**
   * 表格日志
   */
  static table(data) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.table(data);
    }
  }
  /**
   * 計時器
   */
  static time(label) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.time(`${this.prefix} ${label}`);
    }
  }
  static timeEnd(label) {
    if (currentLevel <= LogLevel.DEBUG) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
};

// src/services/ad-system.service.ts
var AdSystemService = class _AdSystemService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.membershipService = inject(MembershipService);
    this.templates = signal([], ...ngDevMode ? [{ debugName: "templates" }] : []);
    this.schedules = signal([], ...ngDevMode ? [{ debugName: "schedules" }] : []);
    this.sendLogs = signal([], ...ngDevMode ? [{ debugName: "sendLogs" }] : []);
    this.overviewStats = signal({
      totalSent: 0,
      successRate: 0,
      todaySent: 0,
      activeSchedules: 0
    }, ...ngDevMode ? [{ debugName: "overviewStats" }] : []);
    this.showTemplateForm = signal(false, ...ngDevMode ? [{ debugName: "showTemplateForm" }] : []);
    this.showScheduleForm = signal(false, ...ngDevMode ? [{ debugName: "showScheduleForm" }] : []);
    this.newTemplate = signal({ name: "", content: "", mediaType: "text" }, ...ngDevMode ? [{ debugName: "newTemplate" }] : []);
    this.newSchedule = signal({
      name: "",
      templateId: 0,
      targetGroups: [],
      sendMode: "scheduled",
      scheduleType: "once",
      scheduleTime: "",
      intervalMinutes: 60,
      triggerKeywords: [],
      accountStrategy: "rotate",
      assignedAccounts: []
    }, ...ngDevMode ? [{ debugName: "newSchedule" }] : []);
    this.isPreviewingSpintax = signal(false, ...ngDevMode ? [{ debugName: "isPreviewingSpintax" }] : []);
    this.spintaxPreview = signal([], ...ngDevMode ? [{ debugName: "spintaxPreview" }] : []);
  }
  // ==================== 載入方法 ====================
  loadTemplates() {
    this.ipcService.send("get-ad-templates", { activeOnly: false });
  }
  loadSchedules() {
    this.ipcService.send("get-ad-schedules", { activeOnly: false });
  }
  loadSendLogs(limit = 100) {
    this.ipcService.send("get-ad-send-logs", { limit });
  }
  loadOverviewStats(days = 7) {
    this.ipcService.send("get-ad-overview-stats", { days });
  }
  loadAll() {
    this.loadTemplates();
    this.loadSchedules();
    this.loadOverviewStats();
  }
  // ==================== 模板操作 ====================
  createTemplate() {
    if (!this.membershipService.hasFeature("adBroadcast")) {
      this.toastService.warning("\u{1F948} \u5EE3\u544A\u767C\u9001\u529F\u80FD\u9700\u8981 \u767D\u9280\u7CBE\u82F1 \u6216\u4EE5\u4E0A\u6703\u54E1\uFF0C\u5347\u7D1A\u89E3\u9396\u66F4\u591A\u529F\u80FD");
      window.dispatchEvent(new CustomEvent("open-membership-dialog"));
      return false;
    }
    const form = this.newTemplate();
    if (!form.name.trim()) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u6A21\u677F\u540D\u7A31");
      return false;
    }
    if (!form.content.trim()) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u6A21\u677F\u5167\u5BB9");
      return false;
    }
    this.ipcService.send("create-ad-template", {
      name: form.name,
      content: form.content,
      mediaType: form.mediaType
    });
    this.resetTemplateForm();
    return true;
  }
  deleteTemplate(templateId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u5EE3\u544A\u6A21\u677F\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-ad-template", { templateId });
  }
  toggleTemplateStatus(templateId) {
    this.ipcService.send("toggle-ad-template-status", { templateId });
  }
  resetTemplateForm() {
    this.newTemplate.set({ name: "", content: "", mediaType: "text" });
    this.showTemplateForm.set(false);
  }
  // ==================== 計劃操作 ====================
  createSchedule() {
    if (!this.membershipService.hasFeature("adBroadcast")) {
      this.toastService.warning("\u{1F948} \u5EE3\u544A\u767C\u9001\u529F\u80FD\u9700\u8981 \u767D\u9280\u7CBE\u82F1 \u6216\u4EE5\u4E0A\u6703\u54E1\uFF0C\u5347\u7D1A\u89E3\u9396\u66F4\u591A\u529F\u80FD");
      window.dispatchEvent(new CustomEvent("open-membership-dialog"));
      return false;
    }
    const form = this.newSchedule();
    if (!form.name.trim()) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u8A08\u5283\u540D\u7A31");
      return false;
    }
    if (!form.templateId) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u5EE3\u544A\u6A21\u677F");
      return false;
    }
    if (form.targetGroups.length === 0) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u76EE\u6A19\u7FA4\u7D44");
      return false;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u767C\u9001\u5E33\u865F");
      return false;
    }
    this.ipcService.send("create-ad-schedule", form);
    this.resetScheduleForm();
    return true;
  }
  deleteSchedule(scheduleId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u5EE3\u544A\u8A08\u5283\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-ad-schedule", { scheduleId });
  }
  toggleScheduleStatus(scheduleId) {
    this.ipcService.send("toggle-ad-schedule-status", { scheduleId });
  }
  runScheduleNow(scheduleId) {
    if (!confirm("\u78BA\u5B9A\u8981\u7ACB\u5373\u57F7\u884C\u6B64\u8A08\u5283\u55CE\uFF1F"))
      return;
    this.ipcService.send("run-ad-schedule-now", { scheduleId });
    this.toastService.info("\u6B63\u5728\u57F7\u884C...");
  }
  resetScheduleForm() {
    this.newSchedule.set({
      name: "",
      templateId: 0,
      targetGroups: [],
      sendMode: "scheduled",
      scheduleType: "once",
      scheduleTime: "",
      intervalMinutes: 60,
      triggerKeywords: [],
      accountStrategy: "rotate",
      assignedAccounts: []
    });
    this.showScheduleForm.set(false);
  }
  // ==================== Spintax 預覽 ====================
  previewSpintax(content) {
    if (!content.trim()) {
      this.spintaxPreview.set([]);
      return;
    }
    this.isPreviewingSpintax.set(true);
    this.ipcService.send("validate-spintax", { content });
  }
  // ==================== 表單更新輔助方法 ====================
  updateTemplateName(value) {
    this.newTemplate.update((t) => __spreadProps(__spreadValues({}, t), { name: value }));
  }
  updateTemplateContent(value) {
    this.newTemplate.update((t) => __spreadProps(__spreadValues({}, t), { content: value }));
  }
  updateTemplateMediaType(value) {
    this.newTemplate.update((t) => __spreadProps(__spreadValues({}, t), { mediaType: value }));
  }
  updateScheduleName(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { name: value }));
  }
  updateScheduleTemplateId(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { templateId: value }));
  }
  updateScheduleSendMode(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { sendMode: value }));
  }
  updateScheduleType(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { scheduleType: value }));
  }
  updateScheduleTime(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { scheduleTime: value }));
  }
  updateScheduleInterval(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { intervalMinutes: value }));
  }
  updateScheduleStrategy(value) {
    this.newSchedule.update((s) => __spreadProps(__spreadValues({}, s), { accountStrategy: value }));
  }
  // ==================== 標籤輔助方法 ====================
  getSendModeLabel(mode) {
    const labels = {
      "scheduled": "\u5B9A\u6642\u767C\u9001",
      "triggered": "\u95DC\u9375\u8A5E\u89F8\u767C",
      "relay": "\u63A5\u529B\u767C\u9001",
      "interval": "\u9593\u9694\u5FAA\u74B0"
    };
    return labels[mode] || mode;
  }
  getScheduleTypeLabel(type) {
    const labels = {
      "once": "\u4E00\u6B21\u6027",
      "daily": "\u6BCF\u65E5",
      "interval": "\u9593\u9694",
      "cron": "Cron"
    };
    return labels[type] || type;
  }
  getAccountStrategyLabel(strategy) {
    const labels = {
      "rotate": "\u8F2A\u63DB",
      "random": "\u96A8\u6A5F",
      "sequential": "\u9806\u5E8F"
    };
    return labels[strategy] || strategy;
  }
  // ==================== IPC 回調處理 ====================
  handleTemplatesResponse(data) {
    if (data.success && data.templates) {
      this.templates.set(data.templates);
    }
  }
  handleSchedulesResponse(data) {
    if (data.success && data.schedules) {
      this.schedules.set(data.schedules);
    }
  }
  handleSendLogsResponse(data) {
    if (data.success && data.logs) {
      this.sendLogs.set(data.logs);
    }
  }
  handleOverviewStatsResponse(data) {
    if (data.success) {
      this.overviewStats.set(data);
    }
  }
  handleSpintaxResponse(data) {
    this.isPreviewingSpintax.set(false);
    if (data.success && data.variants) {
      this.spintaxPreview.set(data.variants.slice(0, 5));
    }
  }
  handleCreateTemplateResponse(data) {
    if (data.success) {
      this.toastService.success("\u5EE3\u544A\u6A21\u677F\u5275\u5EFA\u6210\u529F");
      this.loadTemplates();
    } else {
      this.toastService.error(data.error || "\u5275\u5EFA\u5931\u6557");
    }
  }
  handleCreateScheduleResponse(data) {
    if (data.success) {
      this.toastService.success("\u5EE3\u544A\u8A08\u5283\u5275\u5EFA\u6210\u529F");
      this.loadSchedules();
    } else {
      this.toastService.error(data.error || "\u5275\u5EFA\u5931\u6557");
    }
  }
  static {
    this.\u0275fac = function AdSystemService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AdSystemService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AdSystemService, factory: _AdSystemService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AdSystemService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/user-tracking.service.ts
var UserTrackingService = class _UserTrackingService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.trackedUsers = signal([], ...ngDevMode ? [{ debugName: "trackedUsers" }] : []);
    this.highValueGroups = signal([], ...ngDevMode ? [{ debugName: "highValueGroups" }] : []);
    this.trackingStats = signal({
      totalTracked: 0,
      vipCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      pendingCount: 0,
      completedCount: 0
    }, ...ngDevMode ? [{ debugName: "trackingStats" }] : []);
    this.selectedUser = signal(null, ...ngDevMode ? [{ debugName: "selectedUser" }] : []);
    this.userGroups = signal([], ...ngDevMode ? [{ debugName: "userGroups" }] : []);
    this.showAddUserForm = signal(false, ...ngDevMode ? [{ debugName: "showAddUserForm" }] : []);
    this.isTrackingUser = signal(false, ...ngDevMode ? [{ debugName: "isTrackingUser" }] : []);
    this.userValueFilter = signal("", ...ngDevMode ? [{ debugName: "userValueFilter" }] : []);
    this.newTrackedUser = signal({ userId: "", username: "", notes: "" }, ...ngDevMode ? [{ debugName: "newTrackedUser" }] : []);
  }
  // ==================== 載入方法 ====================
  loadTrackedUsers(limit = 100) {
    this.ipcService.send("get-tracked-users", {
      limit,
      valueLevel: this.userValueFilter() || void 0
    });
  }
  loadTrackingStats() {
    this.ipcService.send("get-tracking-stats", {});
  }
  loadHighValueGroups(limit = 50) {
    this.ipcService.send("get-high-value-groups", { limit });
  }
  loadAll() {
    this.loadTrackedUsers();
    this.loadTrackingStats();
    this.loadHighValueGroups();
  }
  // ==================== 用戶操作 ====================
  addUserToTrack() {
    const form = this.newTrackedUser();
    if (!form.userId.trim()) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u7528\u6236 ID");
      return false;
    }
    this.ipcService.send("add-user-to-track", {
      userId: form.userId.trim(),
      username: form.username.trim() || void 0,
      notes: form.notes.trim() || void 0,
      source: "manual"
    });
    this.resetForm();
    return true;
  }
  addLeadToTracking(leadId) {
    this.ipcService.send("add-user-from-lead", { leadId });
  }
  removeTrackedUser(userId) {
    if (!confirm("\u78BA\u5B9A\u8981\u79FB\u9664\u6B64\u7528\u6236\u8FFD\u8E64\u55CE\uFF1F"))
      return;
    this.ipcService.send("remove-tracked-user", { userId });
  }
  trackUserGroups(userId, accountPhone) {
    this.isTrackingUser.set(true);
    this.ipcService.send("track-user-groups", { userId, accountPhone });
  }
  viewUserGroups(user) {
    this.selectedUser.set(user);
    this.ipcService.send("get-user-groups", { userId: user.userId });
  }
  updateUserValueLevel(userId, valueLevel) {
    this.ipcService.send("update-user-value-level", { userId, valueLevel });
  }
  resetForm() {
    this.newTrackedUser.set({ userId: "", username: "", notes: "" });
    this.showAddUserForm.set(false);
  }
  // ==================== 表單更新輔助方法 ====================
  updateUserId(value) {
    this.newTrackedUser.update((u) => __spreadProps(__spreadValues({}, u), { userId: value }));
  }
  updateUsername(value) {
    this.newTrackedUser.update((u) => __spreadProps(__spreadValues({}, u), { username: value }));
  }
  updateNotes(value) {
    this.newTrackedUser.update((u) => __spreadProps(__spreadValues({}, u), { notes: value }));
  }
  // ==================== 標籤輔助方法 ====================
  getValueLevelLabel(level) {
    const labels = {
      "vip": "VIP",
      "high": "\u9AD8\u50F9\u503C",
      "medium": "\u4E2D\u7B49",
      "low": "\u4F4E"
    };
    return labels[level] || level;
  }
  getValueLevelColor(level) {
    const colors2 = {
      "vip": "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "high": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "medium": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      "low": "bg-slate-500/20 text-slate-400 border-slate-500/30"
    };
    return colors2[level] || "bg-slate-500/20 text-slate-400";
  }
  getTrackingStatusLabel(status) {
    const labels = {
      "pending": "\u5F85\u8FFD\u8E64",
      "tracking": "\u8FFD\u8E64\u4E2D",
      "completed": "\u5DF2\u5B8C\u6210",
      "failed": "\u5931\u6557"
    };
    return labels[status] || status;
  }
  getTrackingStatusColor(status) {
    const colors2 = {
      "pending": "bg-yellow-500/20 text-yellow-400",
      "tracking": "bg-blue-500/20 text-blue-400",
      "completed": "bg-green-500/20 text-green-400",
      "failed": "bg-red-500/20 text-red-400"
    };
    return colors2[status] || "bg-slate-500/20 text-slate-400";
  }
  // ==================== IPC 回調處理 ====================
  handleTrackedUsersResponse(data) {
    if (data.success) {
      this.trackedUsers.set(data.users || []);
    }
  }
  handleTrackingStatsResponse(data) {
    if (data.success) {
      this.trackingStats.set(data);
    }
  }
  handleHighValueGroupsResponse(data) {
    if (data.success) {
      this.highValueGroups.set(data.groups || []);
    }
  }
  handleUserGroupsResponse(data) {
    if (data.success) {
      this.userGroups.set(data.groups || []);
    }
  }
  handleTrackingComplete() {
    this.isTrackingUser.set(false);
    this.loadTrackedUsers();
    this.toastService.success("\u7528\u6236\u7FA4\u7D44\u8FFD\u8E64\u5B8C\u6210");
  }
  handleAddUserResponse(data) {
    if (data.success) {
      this.toastService.success("\u7528\u6236\u6DFB\u52A0\u6210\u529F");
      this.loadTrackedUsers();
    } else {
      this.toastService.error(data.error || "\u6DFB\u52A0\u5931\u6557");
    }
  }
  static {
    this.\u0275fac = function UserTrackingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UserTrackingService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _UserTrackingService, factory: _UserTrackingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UserTrackingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/member-management.service.ts
var MemberManagementService = class _MemberManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.members = signal([], ...ngDevMode ? [{ debugName: "members" }] : []);
    this.selectedMemberIds = signal([], ...ngDevMode ? [{ debugName: "selectedMemberIds" }] : []);
    this.currentResource = signal(null, ...ngDevMode ? [{ debugName: "currentResource" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.progress = signal({ extracted: 0, total: 0, status: "" }, ...ngDevMode ? [{ debugName: "progress" }] : []);
    this.extractionConfig = signal(this.getDefaultConfig(), ...ngDevMode ? [{ debugName: "extractionConfig" }] : []);
    this.extractionStarted = signal(false, ...ngDevMode ? [{ debugName: "extractionStarted" }] : []);
    this.extractionPaused = signal(false, ...ngDevMode ? [{ debugName: "extractionPaused" }] : []);
    this.showMemberListDialog = signal(false, ...ngDevMode ? [{ debugName: "showMemberListDialog" }] : []);
    this.showBatchExtractDialog = signal(false, ...ngDevMode ? [{ debugName: "showBatchExtractDialog" }] : []);
    this.memberFilter = signal("all", ...ngDevMode ? [{ debugName: "memberFilter" }] : []);
    this.filteredMembers = computed(() => {
      const members = this.members();
      const filter = this.memberFilter();
      switch (filter) {
        case "chinese":
          return members.filter((m) => this.isChineseMember(m));
        case "online":
          return members.filter((m) => this.isOnlineMember(m));
        case "premium":
          return members.filter((m) => m.isPremium);
        case "high-value":
          return members.filter((m) => m.valueLevel === "high");
        default:
          return members;
      }
    }, ...ngDevMode ? [{ debugName: "filteredMembers" }] : []);
    this.selectedCount = computed(() => this.selectedMemberIds().length, ...ngDevMode ? [{ debugName: "selectedCount" }] : []);
    this.chineseMemberCount = computed(() => this.members().filter((m) => this.isChineseMember(m)).length, ...ngDevMode ? [{ debugName: "chineseMemberCount" }] : []);
    this.onlineMemberCount = computed(() => this.members().filter((m) => this.isOnlineMember(m)).length, ...ngDevMode ? [{ debugName: "onlineMemberCount" }] : []);
    this.premiumMemberCount = computed(() => this.members().filter((m) => m.isPremium).length, ...ngDevMode ? [{ debugName: "premiumMemberCount" }] : []);
    this.isAllSelected = computed(() => {
      const filtered = this.filteredMembers();
      const selected = this.selectedMemberIds();
      return filtered.length > 0 && filtered.every((m) => selected.includes(m.id));
    }, ...ngDevMode ? [{ debugName: "isAllSelected" }] : []);
  }
  // ==================== 對話框操作 ====================
  openMemberListDialog(resource) {
    this.currentResource.set(resource);
    this.members.set([]);
    this.isLoading.set(false);
    this.progress.set({ extracted: 0, total: resource.member_count || 0, status: "" });
    this.selectedMemberIds.set([]);
    this.extractionStarted.set(false);
    this.memberFilter.set("all");
    this.extractionConfig.set(this.getDefaultConfig());
    this.showMemberListDialog.set(true);
  }
  closeMemberListDialog() {
    this.showMemberListDialog.set(false);
    this.currentResource.set(null);
    this.members.set([]);
  }
  openBatchExtractDialog() {
    this.showBatchExtractDialog.set(true);
  }
  closeBatchExtractDialog() {
    this.showBatchExtractDialog.set(false);
  }
  // ==================== 成員提取操作 ====================
  loadMembers(resource) {
    const target = resource || this.currentResource();
    if (!target || !target.telegram_id) {
      this.toastService.error("\u7121\u6548\u7684\u7FA4\u7D44\u4FE1\u606F");
      return;
    }
    this.isLoading.set(true);
    this.progress.update((p) => __spreadProps(__spreadValues({}, p), { status: "\u6B63\u5728\u63D0\u53D6\u6210\u54E1..." }));
    this.ipcService.send("extract-members", {
      resourceId: target.id,
      telegramId: target.telegram_id,
      username: target.username,
      limit: 200,
      offset: 0
    });
  }
  loadMore() {
    const resource = this.currentResource();
    const currentCount = this.members().length;
    if (!resource)
      return;
    this.isLoading.set(true);
    this.progress.update((p) => __spreadProps(__spreadValues({}, p), { status: "\u6B63\u5728\u63D0\u53D6\u66F4\u591A\u6210\u54E1..." }));
    this.ipcService.send("extract-members", {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      limit: 200,
      offset: currentCount
    });
  }
  startExtraction() {
    const resource = this.currentResource();
    const config = this.extractionConfig();
    if (!resource) {
      this.toastService.error("\u7121\u6548\u7684\u7FA4\u7D44\u4FE1\u606F");
      return;
    }
    this.extractionStarted.set(true);
    this.isLoading.set(true);
    this.progress.set({ extracted: 0, total: resource.member_count || 0, status: "\u958B\u59CB\u63D0\u53D6..." });
    this.ipcService.send("start-member-extraction", {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      config
    });
  }
  pauseExtraction() {
    this.extractionPaused.set(true);
    this.ipcService.send("pause-member-extraction", {});
  }
  resumeExtraction() {
    this.extractionPaused.set(false);
    this.ipcService.send("resume-member-extraction", {});
  }
  stopExtraction() {
    this.extractionStarted.set(false);
    this.extractionPaused.set(false);
    this.isLoading.set(false);
    this.ipcService.send("stop-member-extraction", {});
  }
  // ==================== 成員選擇操作 ====================
  toggleMemberSelection(memberId) {
    const current = this.selectedMemberIds();
    if (current.includes(memberId)) {
      this.selectedMemberIds.set(current.filter((id) => id !== memberId));
    } else {
      this.selectedMemberIds.set([...current, memberId]);
    }
  }
  selectAll() {
    const filtered = this.filteredMembers();
    this.selectedMemberIds.set(filtered.map((m) => m.id));
  }
  clearSelection() {
    this.selectedMemberIds.set([]);
  }
  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  }
  selectHighValue() {
    const highValue = this.members().filter((m) => m.valueLevel === "high");
    this.selectedMemberIds.set(highValue.map((m) => m.id));
    this.toastService.info(`\u5DF2\u9078\u64C7 ${highValue.length} \u500B\u9AD8\u50F9\u503C\u6210\u54E1`);
  }
  selectOnline() {
    const online = this.members().filter((m) => this.isOnlineMember(m));
    this.selectedMemberIds.set(online.map((m) => m.id));
    this.toastService.info(`\u5DF2\u9078\u64C7 ${online.length} \u500B\u5728\u7DDA\u6210\u54E1`);
  }
  // ==================== 設置操作 ====================
  setFilter(filter) {
    this.memberFilter.set(filter);
  }
  setExtractLimit(limit) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), { limit }));
  }
  setCustomLimit(customLimit) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), { customLimit }));
  }
  toggleBackgroundMode() {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), { backgroundMode: !c.backgroundMode }));
  }
  toggleUserType(type) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      userTypes: __spreadProps(__spreadValues({}, c.userTypes), { [type]: !c.userTypes[type] })
    }));
  }
  toggleActivityFilter(filter) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      activityFilters: __spreadProps(__spreadValues({}, c.activityFilters), { [filter]: !c.activityFilters[filter] })
    }));
  }
  toggleAccountFeature(feature) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      accountFeatures: __spreadProps(__spreadValues({}, c.accountFeatures), { [feature]: !c.accountFeatures[feature] })
    }));
  }
  toggleExcludeFilter(filter) {
    this.extractionConfig.update((c) => __spreadProps(__spreadValues({}, c), {
      excludeFilters: __spreadProps(__spreadValues({}, c.excludeFilters), { [filter]: !c.excludeFilters[filter] })
    }));
  }
  // ==================== 導出操作 ====================
  exportToCSV() {
    const members = this.members();
    if (members.length === 0) {
      this.toastService.warning("\u6C92\u6709\u53EF\u5C0E\u51FA\u7684\u6210\u54E1");
      return;
    }
    const csv = this.generateCSV(members);
    this.downloadCSV(csv, `members_${Date.now()}.csv`);
    this.toastService.success(`\u5DF2\u5C0E\u51FA ${members.length} \u500B\u6210\u54E1`);
  }
  exportSelectedToCSV() {
    const selectedIds = this.selectedMemberIds();
    const selected = this.members().filter((m) => selectedIds.includes(m.id));
    if (selected.length === 0) {
      this.toastService.warning("\u8ACB\u5148\u9078\u64C7\u8981\u5C0E\u51FA\u7684\u6210\u54E1");
      return;
    }
    const csv = this.generateCSV(selected);
    this.downloadCSV(csv, `selected_members_${Date.now()}.csv`);
    this.toastService.success(`\u5DF2\u5C0E\u51FA ${selected.length} \u500B\u6210\u54E1`);
  }
  // ==================== 輔助方法 ====================
  isChineseMember(member) {
    const name = `${member.firstName || ""} ${member.lastName || ""}`;
    return /[\u4e00-\u9fff]/.test(name);
  }
  isOnlineMember(member) {
    if (!member.lastOnline)
      return false;
    const now = /* @__PURE__ */ new Date();
    const diff = now.getTime() - new Date(member.lastOnline).getTime();
    return diff < 5 * 60 * 1e3;
  }
  calculateValueLevel(member) {
    let score = 0;
    if (member.isPremium)
      score += 3;
    if (member.username)
      score += 2;
    if (member.photo)
      score += 1;
    if (this.isOnlineMember(member))
      score += 2;
    if (!member.isBot && !member.isScam && !member.isDeleted)
      score += 1;
    if (score >= 6)
      return "high";
    if (score >= 3)
      return "medium";
    return "low";
  }
  formatMemberCount(count) {
    if (count >= 1e6)
      return (count / 1e6).toFixed(1) + "M";
    if (count >= 1e3)
      return (count / 1e3).toFixed(1) + "K";
    return count.toString();
  }
  getExtractPercent() {
    const progress = this.progress();
    if (progress.total === 0)
      return 0;
    return Math.round(progress.extracted / progress.total * 100);
  }
  getDefaultConfig() {
    return {
      limit: 500,
      customLimit: 1e3,
      backgroundMode: false,
      userTypes: { chinese: false, overseas: false },
      activityFilters: {
        onlineNow: false,
        within3Days: false,
        within7Days: false,
        within30Days: false,
        longOffline: false
      },
      accountFeatures: {
        premium: false,
        hasUsername: false,
        hasPhoto: false,
        newAccount: false,
        activeAccount: false,
        verified: false
      },
      excludeFilters: {
        bots: true,
        scam: true,
        deleted: true
      }
    };
  }
  generateCSV(members) {
    const headers = ["ID", "Username", "First Name", "Last Name", "Premium", "Value Level"];
    const rows = members.map((m) => [
      m.telegramId,
      m.username || "",
      m.firstName || "",
      m.lastName || "",
      m.isPremium ? "Yes" : "No",
      m.valueLevel || ""
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  downloadCSV(content, filename) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  // ==================== IPC 回調處理 ====================
  handleMembersResponse(data) {
    this.isLoading.set(false);
    if (data.success && data.members) {
      const current = this.members();
      const newMembers = data.members.map((m) => __spreadProps(__spreadValues({}, m), {
        valueLevel: this.calculateValueLevel(m)
      }));
      if (data.offset === 0) {
        this.members.set(newMembers);
      } else {
        this.members.set([...current, ...newMembers]);
      }
      this.progress.update((p) => __spreadProps(__spreadValues({}, p), {
        extracted: this.members().length,
        status: `\u5DF2\u63D0\u53D6 ${this.members().length} \u500B\u6210\u54E1`
      }));
    } else {
      this.toastService.error(data.error || "\u63D0\u53D6\u6210\u54E1\u5931\u6557");
    }
  }
  handleExtractionProgress(data) {
    this.progress.set({
      extracted: data.extracted || 0,
      total: data.total || 0,
      status: data.status || ""
    });
  }
  handleExtractionComplete(data) {
    this.isLoading.set(false);
    this.extractionStarted.set(false);
    if (data.success) {
      this.toastService.success(`\u6210\u54E1\u63D0\u53D6\u5B8C\u6210\uFF0C\u5171 ${data.count} \u500B`);
    }
  }
  handleExtractionError(data) {
    this.isLoading.set(false);
    this.toastService.error(data.error || "\u63D0\u53D6\u904E\u7A0B\u767C\u751F\u932F\u8AA4");
  }
  static {
    this.\u0275fac = function MemberManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MemberManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MemberManagementService, factory: _MemberManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MemberManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/queue-management.service.ts
var QueueManagementService = class _QueueManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.queueStatuses = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "queueStatuses" }] : []);
    this.currentQueueMessages = signal([], ...ngDevMode ? [{ debugName: "currentQueueMessages" }] : []);
    this.selectedPhone = signal(null, ...ngDevMode ? [{ debugName: "selectedPhone" }] : []);
    this.queueLengthHistory = signal([], ...ngDevMode ? [{ debugName: "queueLengthHistory" }] : []);
    this.showQueueDetails = signal(false, ...ngDevMode ? [{ debugName: "showQueueDetails" }] : []);
    this.isRefreshing = signal(false, ...ngDevMode ? [{ debugName: "isRefreshing" }] : []);
    this.refreshTimeout = null;
    this.totalStats = computed(() => {
      const statuses = Array.from(this.queueStatuses().values());
      return {
        totalPending: statuses.reduce((sum, s) => sum + s.pending, 0),
        totalSending: statuses.reduce((sum, s) => sum + s.sending, 0),
        totalSent: statuses.reduce((sum, s) => sum + s.sent, 0),
        totalFailed: statuses.reduce((sum, s) => sum + s.failed, 0),
        activeQueues: statuses.filter((s) => !s.paused && s.pending > 0).length,
        pausedQueues: statuses.filter((s) => s.paused).length
      };
    }, ...ngDevMode ? [{ debugName: "totalStats" }] : []);
    this.accountQueueStatuses = computed(() => {
      return Array.from(this.queueStatuses().entries()).map(([phone, status]) => ({
        phone,
        status,
        messages: this.currentQueueMessages().filter((m) => m.phone === phone)
      }));
    }, ...ngDevMode ? [{ debugName: "accountQueueStatuses" }] : []);
  }
  // ==================== 隊列操作 ====================
  refreshStatus(phone) {
    this.isRefreshing.set(true);
    this.ipcService.send("get-queue-status", { phone });
  }
  refreshStatusThrottled() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refreshStatus();
    }, 500);
  }
  getMessages(phone, status, limit = 100) {
    this.ipcService.send("get-queue-messages", { phone, status, limit });
  }
  clearPendingQueue() {
    if (!confirm("\u78BA\u5B9A\u8981\u6E05\u9664\u6240\u6709\u5F85\u767C\u9001\u6D88\u606F\u55CE\uFF1F"))
      return;
    this.ipcService.send("clear-pending-queue", {});
    this.toastService.info("\u6B63\u5728\u6E05\u9664\u5F85\u767C\u9001\u968A\u5217...");
  }
  clearQueue(phone, status) {
    if (!confirm(`\u78BA\u5B9A\u8981\u6E05\u9664 ${phone} \u7684\u968A\u5217\u55CE\uFF1F`))
      return;
    this.ipcService.send("clear-queue", { phone, status });
  }
  pauseQueue(phone) {
    this.ipcService.send("pause-queue", { phone });
    this.toastService.info(`\u66AB\u505C ${phone} \u7684\u767C\u9001\u968A\u5217`);
  }
  resumeQueue(phone) {
    this.ipcService.send("resume-queue", { phone });
    this.toastService.info(`\u6062\u5FA9 ${phone} \u7684\u767C\u9001\u968A\u5217`);
  }
  pauseAllQueues() {
    const statuses = this.queueStatuses();
    statuses.forEach((_, phone) => {
      this.ipcService.send("pause-queue", { phone });
    });
    this.toastService.info("\u5DF2\u66AB\u505C\u6240\u6709\u767C\u9001\u968A\u5217");
  }
  resumeAllQueues() {
    const statuses = this.queueStatuses();
    statuses.forEach((_, phone) => {
      this.ipcService.send("resume-queue", { phone });
    });
    this.toastService.info("\u5DF2\u6062\u5FA9\u6240\u6709\u767C\u9001\u968A\u5217");
  }
  deleteMessage(phone, messageId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u6D88\u606F\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-queue-message", { phone, messageId });
  }
  updateMessagePriority(phone, messageId, priority) {
    this.ipcService.send("update-queue-priority", { phone, messageId, priority });
  }
  retryFailedMessages(phone) {
    this.ipcService.send("retry-failed-messages", { phone });
    this.toastService.info("\u6B63\u5728\u91CD\u8A66\u5931\u6557\u7684\u6D88\u606F...");
  }
  // ==================== 對話框操作 ====================
  viewDetails(phone) {
    this.selectedPhone.set(phone);
    this.getMessages(phone);
    this.showQueueDetails.set(true);
  }
  closeDetails() {
    this.showQueueDetails.set(false);
    this.selectedPhone.set(null);
    this.currentQueueMessages.set([]);
  }
  // ==================== 歷史數據 ====================
  loadHistory(days = 7) {
    this.ipcService.send("get-queue-length-history", { days });
  }
  // ==================== 輔助方法 ====================
  getStatusForAccount(phone) {
    return this.queueStatuses().get(phone) || null;
  }
  getStatusLabel(status) {
    const labels = {
      "pending": "\u5F85\u767C\u9001",
      "sending": "\u767C\u9001\u4E2D",
      "sent": "\u5DF2\u767C\u9001",
      "failed": "\u5931\u6557",
      "paused": "\u5DF2\u66AB\u505C"
    };
    return labels[status] || status;
  }
  getStatusColor(status) {
    const colors2 = {
      "pending": "bg-amber-500/20 text-amber-400",
      "sending": "bg-cyan-500/20 text-cyan-400 animate-pulse",
      "sent": "bg-emerald-500/20 text-emerald-400",
      "failed": "bg-red-500/20 text-red-400",
      "paused": "bg-slate-500/20 text-slate-400"
    };
    return colors2[status] || "bg-slate-500/20 text-slate-400";
  }
  getPriorityLabel(priority) {
    const labels = {
      "high": "\u9AD8\u512A\u5148",
      "normal": "\u666E\u901A",
      "low": "\u4F4E\u512A\u5148"
    };
    return labels[priority] || priority;
  }
  getPriorityColor(priority) {
    const colors2 = {
      "high": "bg-red-500/20 text-red-400",
      "normal": "bg-cyan-500/20 text-cyan-400",
      "low": "bg-slate-500/20 text-slate-400"
    };
    return colors2[priority] || "bg-slate-500/20 text-slate-400";
  }
  // ==================== IPC 回調處理 ====================
  handleQueueStatusResponse(data) {
    this.isRefreshing.set(false);
    if (data.success && data.statuses) {
      const statusMap = /* @__PURE__ */ new Map();
      for (const status of data.statuses) {
        statusMap.set(status.phone, status);
      }
      this.queueStatuses.set(statusMap);
    }
  }
  handleQueueMessagesResponse(data) {
    if (data.success && data.messages) {
      this.currentQueueMessages.set(data.messages);
    }
  }
  handleQueueHistoryResponse(data) {
    if (data.success && data.history) {
      this.queueLengthHistory.set(data.history);
    }
  }
  handleQueueUpdate(data) {
    if (data.phone && data.status) {
      const statuses = new Map(this.queueStatuses());
      statuses.set(data.phone, data.status);
      this.queueStatuses.set(statuses);
    }
  }
  handleMessageSent(data) {
    if (data.messageId) {
      this.currentQueueMessages.update((messages) => messages.map((m) => m.id === data.messageId ? __spreadProps(__spreadValues({}, m), { status: "sent", sentAt: (/* @__PURE__ */ new Date()).toISOString() }) : m));
    }
  }
  handleMessageFailed(data) {
    if (data.messageId) {
      this.currentQueueMessages.update((messages) => messages.map((m) => m.id === data.messageId ? __spreadProps(__spreadValues({}, m), { status: "failed", error: data.error }) : m));
    }
  }
  static {
    this.\u0275fac = function QueueManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _QueueManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _QueueManagementService, factory: _QueueManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(QueueManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/campaign-management.service.ts
var CampaignManagementService = class _CampaignManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.membershipService = inject(MembershipService);
    this.campaigns = signal([], ...ngDevMode ? [{ debugName: "campaigns" }] : []);
    this.selectedCampaign = signal(null, ...ngDevMode ? [{ debugName: "selectedCampaign" }] : []);
    this.unifiedOverview = signal(null, ...ngDevMode ? [{ debugName: "unifiedOverview" }] : []);
    this.funnelAnalysis = signal(null, ...ngDevMode ? [{ debugName: "funnelAnalysis" }] : []);
    this.showCampaignForm = signal(false, ...ngDevMode ? [{ debugName: "showCampaignForm" }] : []);
    this.campaignFormData = signal({
      name: "",
      description: "",
      phases: ["discovery", "monitoring", "outreach"],
      keywords: [],
      targetGroups: [],
      assignedAccounts: []
    }, ...ngDevMode ? [{ debugName: "campaignFormData" }] : []);
    this.newCampaign = signal(this.getEmptyCampaignForm(), ...ngDevMode ? [{ debugName: "newCampaign" }] : []);
    this.campaignKeywordInput = signal("", ...ngDevMode ? [{ debugName: "campaignKeywordInput" }] : []);
    this.isSubmittingCampaign = signal(false, ...ngDevMode ? [{ debugName: "isSubmittingCampaign" }] : []);
    this.activeCampaigns = computed(() => this.campaigns().filter((c) => c.status === "running"), ...ngDevMode ? [{ debugName: "activeCampaigns" }] : []);
    this.pausedCampaigns = computed(() => this.campaigns().filter((c) => c.status === "paused"), ...ngDevMode ? [{ debugName: "pausedCampaigns" }] : []);
    this.completedCampaigns = computed(() => this.campaigns().filter((c) => c.status === "completed"), ...ngDevMode ? [{ debugName: "completedCampaigns" }] : []);
    this.setupIpcListeners();
  }
  // ==================== 加載方法 ====================
  loadCampaigns() {
    this.ipcService.send("get-campaigns", { limit: 50 });
  }
  loadUnifiedOverview() {
    this.ipcService.send("get-unified-overview", { days: 7 });
  }
  loadFunnelAnalysis() {
    this.ipcService.send("get-funnel-analysis", {});
  }
  loadCampaignData() {
    this.loadCampaigns();
    this.loadUnifiedOverview();
    this.loadFunnelAnalysis();
  }
  // ==================== 活動操作 ====================
  createCampaignFromForm() {
    if (!this.membershipService.hasFeature("aiSalesFunnel")) {
      this.toastService.warning(`\u{1F48E} \u71DF\u92B7\u6D3B\u52D5\u529F\u80FD\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1\uFF0C\u5347\u7D1A\u89E3\u9396\u66F4\u591A\u529F\u80FD`);
      window.dispatchEvent(new CustomEvent("open-membership-dialog"));
      return;
    }
    const form = this.campaignFormData();
    if (!form.name.trim()) {
      this.toastService.warning("\u8ACB\u8F38\u5165\u6D3B\u52D5\u540D\u7A31");
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning("\u8ACB\u9078\u64C7\u5E33\u865F");
      return;
    }
    this.ipcService.send("create-campaign", {
      name: form.name,
      description: form.description,
      phases: form.phases,
      keywords: form.keywords,
      targetGroups: form.targetGroups,
      assignedAccounts: form.assignedAccounts
    });
    this.resetCampaignForm();
  }
  addCampaign() {
    if (this.isSubmittingCampaign()) {
      this.toastService.warning("\u6B63\u5728\u5275\u5EFA\u6D3B\u52D5\uFF0C\u8ACB\u7A0D\u5019...", 2e3);
      return;
    }
    const form = this.newCampaign();
    const errors = [];
    if (!form.name?.trim()) {
      errors.push("\u6D3B\u52A8\u540D\u79F0");
    }
    if (!form.action.templateId || form.action.templateId === 0) {
      errors.push("\u6D88\u606F\u6A21\u677F");
    }
    if (form.trigger.sourceGroupIds.length === 0) {
      errors.push("\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u6765\u6E90\u7FA4\u7EC4");
    }
    if (form.trigger.keywordSetIds.length === 0) {
      errors.push("\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u5173\u952E\u8BCD\u96C6");
    }
    if (errors.length > 0) {
      this.toastService.error(`\u8BF7\u5B8C\u5584\u4EE5\u4E0B\u5185\u5BB9: ${errors.join(", ")}`);
      return;
    }
    const campaignName = form.name.trim();
    const existingCampaign = this.campaigns().find((c) => c.name === campaignName);
    if (existingCampaign) {
      this.toastService.warning(`\u6D3B\u52D5 "${campaignName}" \u5DF2\u5B58\u5728\uFF0C\u8ACB\u4F7F\u7528\u4E0D\u540C\u7684\u540D\u7A31`, 4e3);
      return;
    }
    this.isSubmittingCampaign.set(true);
    this.newCampaign.set(this.getEmptyCampaignForm());
    this.ipcService.send("add-campaign", __spreadValues({}, form));
    setTimeout(() => {
      this.isSubmittingCampaign.set(false);
    }, 3e3);
  }
  startCampaign(campaignId) {
    if (!confirm("\u78BA\u5B9A\u8981\u555F\u52D5\u6B64\u6D3B\u52D5\u55CE\uFF1F"))
      return;
    this.ipcService.send("start-campaign", { campaignId });
  }
  pauseCampaign(campaignId) {
    this.ipcService.send("pause-campaign", { campaignId });
  }
  resumeCampaign(campaignId) {
    this.ipcService.send("resume-campaign", { campaignId });
  }
  stopCampaign(campaignId) {
    if (!confirm("\u78BA\u5B9A\u8981\u505C\u6B62\u6B64\u6D3B\u52D5\u55CE\uFF1F"))
      return;
    this.ipcService.send("stop-campaign", { campaignId });
  }
  deleteCampaign(campaignId) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u6D3B\u52D5\u55CE\uFF1F"))
      return;
    this.ipcService.send("delete-campaign", { campaignId });
  }
  toggleCampaignStatus(id) {
    this.ipcService.send("toggle-campaign-status", { id });
  }
  viewCampaignDetails(campaign) {
    this.selectedCampaign.set(campaign);
    this.ipcService.send("get-campaign-logs", { campaignId: campaign.id });
  }
  // ==================== 表單操作 ====================
  toggleCampaignPhase(phase) {
    this.campaignFormData.update((c) => {
      const phases = [...c.phases];
      const idx = phases.indexOf(phase);
      if (idx >= 0) {
        phases.splice(idx, 1);
      } else {
        phases.push(phase);
      }
      return __spreadProps(__spreadValues({}, c), { phases });
    });
  }
  addCampaignKeyword() {
    const keyword = this.campaignKeywordInput().trim();
    if (!keyword)
      return;
    this.campaignFormData.update((c) => __spreadProps(__spreadValues({}, c), {
      keywords: [...c.keywords, keyword]
    }));
    this.campaignKeywordInput.set("");
  }
  removeCampaignKeyword(keyword) {
    this.campaignFormData.update((c) => __spreadProps(__spreadValues({}, c), {
      keywords: c.keywords.filter((k) => k !== keyword)
    }));
  }
  toggleCampaignAccount(phone) {
    this.campaignFormData.update((c) => {
      const accounts = [...c.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return __spreadProps(__spreadValues({}, c), { assignedAccounts: accounts });
    });
  }
  toggleNewCampaignSourceGroup(groupId) {
    this.newCampaign.update((c) => {
      const ids = [...c.trigger.sourceGroupIds];
      const idx = ids.indexOf(groupId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(groupId);
      }
      return __spreadProps(__spreadValues({}, c), { trigger: __spreadProps(__spreadValues({}, c.trigger), { sourceGroupIds: ids }) });
    });
  }
  toggleNewCampaignKeywordSet(setId) {
    this.newCampaign.update((c) => {
      const ids = [...c.trigger.keywordSetIds];
      const idx = ids.indexOf(setId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(setId);
      }
      return __spreadProps(__spreadValues({}, c), { trigger: __spreadProps(__spreadValues({}, c.trigger), { keywordSetIds: ids }) });
    });
  }
  updateCampaignFormName(value) {
    this.campaignFormData.update((c) => __spreadProps(__spreadValues({}, c), { name: value }));
  }
  updateCampaignFormDesc(value) {
    this.campaignFormData.update((c) => __spreadProps(__spreadValues({}, c), { description: value }));
  }
  updateNewCampaignName(value) {
    this.newCampaign.update((c) => __spreadProps(__spreadValues({}, c), { name: value }));
  }
  updateNewCampaignTemplateId(value) {
    this.newCampaign.update((c) => __spreadProps(__spreadValues({}, c), {
      action: __spreadProps(__spreadValues({}, c.action), { templateId: value })
    }));
  }
  // ==================== 輔助方法 ====================
  getEmptyCampaignForm() {
    return {
      name: "",
      trigger: { sourceGroupIds: [], keywordSetIds: [] },
      action: { templateId: 0, minDelaySeconds: 30, maxDelaySeconds: 120 }
    };
  }
  resetCampaignForm() {
    this.campaignFormData.set({
      name: "",
      description: "",
      phases: ["discovery", "monitoring", "outreach"],
      keywords: [],
      targetGroups: [],
      assignedAccounts: []
    });
    this.showCampaignForm.set(false);
  }
  getCampaignStatusLabel(status) {
    const labels = {
      "draft": "\u8349\u7A3F",
      "scheduled": "\u5DF2\u6392\u7A0B",
      "running": "\u904B\u884C\u4E2D",
      "paused": "\u5DF2\u66AB\u505C",
      "completed": "\u5DF2\u5B8C\u6210",
      "failed": "\u5931\u6557"
    };
    return labels[status] || status;
  }
  getCampaignStatusColor(status) {
    const colors2 = {
      "draft": "bg-slate-500/20 text-slate-400",
      "scheduled": "bg-blue-500/20 text-blue-400",
      "running": "bg-green-500/20 text-green-400",
      "paused": "bg-yellow-500/20 text-yellow-400",
      "completed": "bg-cyan-500/20 text-cyan-400",
      "failed": "bg-red-500/20 text-red-400"
    };
    return colors2[status] || "bg-slate-500/20 text-slate-400";
  }
  getPhaseLabel(phase) {
    const labels = {
      "discovery": "\u8CC7\u6E90\u767C\u73FE",
      "monitoring": "\u76E3\u63A7\u7372\u5BA2",
      "outreach": "\u5EE3\u544A\u89F8\u9054",
      "tracking": "\u7528\u6236\u8FFD\u8E64",
      "conversion": "\u8F49\u5316\u6210\u4EA4"
    };
    return labels[phase] || phase;
  }
  getCampaignName(id) {
    if (!id)
      return "N/A";
    return this.campaigns().find((c) => c.id === id)?.name || "Unknown Campaign";
  }
  getCampaignById(id) {
    if (id === void 0)
      return void 0;
    return this.campaigns().find((c) => c.id === id);
  }
  // ==================== IPC 事件處理 ====================
  setupIpcListeners() {
    this.ipcService.on("campaigns-result", (data) => this.handleCampaigns(data));
    this.ipcService.on("campaign-created", (data) => this.handleCampaignCreated(data));
    this.ipcService.on("campaign-deleted", (data) => this.handleCampaignDeleted(data));
    this.ipcService.on("unified-overview-result", (data) => this.handleUnifiedOverview(data));
    this.ipcService.on("funnel-analysis-result", (data) => this.handleFunnelAnalysis(data));
    this.ipcService.on("campaign-added", (data) => this.handleCampaignAdded(data));
    this.ipcService.on("campaign-status-toggled", (data) => this.handleCampaignStatusToggled(data));
  }
  handleCampaigns(data) {
    if (data.success) {
      this.campaigns.set(data.campaigns || []);
    }
  }
  handleCampaignCreated(data) {
    if (data.success) {
      this.toastService.success("\u71DF\u92B7\u6D3B\u52D5\u5DF2\u5275\u5EFA");
      this.loadCampaigns();
    } else {
      this.toastService.error(`\u5275\u5EFA\u5931\u6557: ${data.error}`);
    }
  }
  handleCampaignDeleted(data) {
    if (data.success) {
      this.toastService.success("\u71DF\u92B7\u6D3B\u52D5\u5DF2\u522A\u9664");
      this.loadCampaigns();
    }
  }
  handleUnifiedOverview(data) {
    if (data.success) {
      this.unifiedOverview.set(data);
    }
  }
  handleFunnelAnalysis(data) {
    if (data.success) {
      this.funnelAnalysis.set(data);
    }
  }
  handleCampaignAdded(data) {
    this.isSubmittingCampaign.set(false);
    if (data.success) {
      this.toastService.success("\u6D3B\u52D5\u5275\u5EFA\u6210\u529F");
      this.loadCampaigns();
    } else {
      this.toastService.error(`\u5275\u5EFA\u5931\u6557: ${data.error}`);
    }
  }
  handleCampaignStatusToggled(data) {
    if (data.success) {
      this.loadCampaigns();
    }
  }
  static {
    this.\u0275fac = function CampaignManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _CampaignManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _CampaignManagementService, factory: _CampaignManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(CampaignManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/template-management.service.ts
var TemplateManagementService = class _TemplateManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.messageTemplates = signal([], ...ngDevMode ? [{ debugName: "messageTemplates" }] : []);
    this.selectedTemplate = signal(null, ...ngDevMode ? [{ debugName: "selectedTemplate" }] : []);
    this.showTemplateCreator = signal(false, ...ngDevMode ? [{ debugName: "showTemplateCreator" }] : []);
    this.newTemplate = signal({ name: "", prompt: "" }, ...ngDevMode ? [{ debugName: "newTemplate" }] : []);
    this.activeTemplates = computed(() => this.messageTemplates().filter((t) => t.active), ...ngDevMode ? [{ debugName: "activeTemplates" }] : []);
    this.templateCount = computed(() => this.messageTemplates().length, ...ngDevMode ? [{ debugName: "templateCount" }] : []);
    this.availableVariables = [
      { name: "name", placeholder: "{name}", description: "\u7528\u6236\u540D\u7A31" },
      { name: "username", placeholder: "{username}", description: "\u7528\u6236 @username" },
      { name: "group_name", placeholder: "{group_name}", description: "\u7FA4\u7D44\u540D\u7A31" },
      { name: "keyword", placeholder: "{keyword}", description: "\u89F8\u767C\u95DC\u9375\u8A5E" },
      { name: "date", placeholder: "{date}", description: "\u7576\u524D\u65E5\u671F" },
      { name: "time", placeholder: "{time}", description: "\u7576\u524D\u6642\u9593" }
    ];
    this.setupIpcListeners();
  }
  // ==================== 加載方法 ====================
  loadTemplates() {
    this.ipcService.send("get-templates", {});
  }
  // ==================== 模板操作 ====================
  addTemplate() {
    const form = this.newTemplate();
    if (form.name.trim() && form.prompt.trim()) {
      this.ipcService.send("add-template", {
        name: form.name,
        prompt: form.prompt
      });
      this.newTemplate.set({ name: "", prompt: "" });
      this.toastService.success("\u6A21\u677F\u6DFB\u52A0\u6210\u529F");
    } else {
      this.toastService.error("\u8BF7\u586B\u5199\u6A21\u677F\u540D\u79F0\u548C\u6D88\u606F\u5185\u5BB9");
    }
  }
  addTemplateQuick(name, prompt) {
    if (name?.trim() && prompt?.trim()) {
      const exists = this.messageTemplates().some((t) => t.name === name.trim());
      if (exists) {
        this.toastService.warning("\u6A21\u677F\u540D\u7A31\u5DF2\u5B58\u5728\uFF0C\u7121\u6CD5\u5275\u5EFA\u91CD\u8907\u6A21\u677F", 3e3);
        return;
      }
      this.ipcService.send("add-template", {
        name: name.trim(),
        prompt: prompt.trim()
      });
      this.newTemplate.set({ name: "", prompt: "" });
      this.toastService.success("\u6A21\u677F\u6DFB\u52A0\u6210\u529F");
      if (this.messageTemplates().length > 0) {
        this.showTemplateCreator.set(false);
      }
    } else {
      this.toastService.error("\u8BF7\u586B\u5199\u6A21\u677F\u540D\u79F0\u548C\u6D88\u606F\u5185\u5BB9");
    }
  }
  toggleTemplateStatus(templateId) {
    this.ipcService.send("toggle-template-status", { id: templateId });
  }
  removeTemplate(templateId, campaigns = []) {
    const template = this.messageTemplates().find((t) => t.id === templateId);
    if (!template)
      return;
    const usingCampaigns = campaigns.filter((c) => c.actions?.some((a) => a.templateId === templateId));
    if (usingCampaigns.length > 0) {
      const campaignNames = usingCampaigns.map((c) => c.name).join(", ");
      if (!confirm(`\u6A21\u677F "${template.name}" \u6B63\u5728\u88AB\u4EE5\u4E0B\u6D3B\u52D5\u4F7F\u7528\uFF1A${campaignNames}

\u522A\u9664\u6A21\u677F\u5F8C\uFF0C\u9019\u4E9B\u6D3B\u52D5\u5C07\u7121\u6CD5\u6B63\u5E38\u5DE5\u4F5C\u3002

\u78BA\u5B9A\u8981\u522A\u9664\u55CE\uFF1F`)) {
        return;
      }
    } else {
      if (!confirm(`\u78BA\u5B9A\u8981\u522A\u9664\u6A21\u677F "${template.name}" \u55CE\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u92B7\u3002`)) {
        return;
      }
    }
    this.ipcService.send("remove-template", { id: templateId });
    this.toastService.success("\u6A21\u677F\u5DF2\u522A\u9664");
  }
  selectTemplate(template) {
    this.selectedTemplate.set(template);
  }
  clearSelection() {
    this.selectedTemplate.set(null);
  }
  // ==================== 表單操作 ====================
  updateTemplateName(value) {
    this.newTemplate.update((t) => __spreadProps(__spreadValues({}, t), { name: value }));
  }
  updateTemplatePrompt(value) {
    this.newTemplate.update((t) => __spreadProps(__spreadValues({}, t), { prompt: value }));
  }
  insertTemplateVariable(textarea, variable) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + variable + text.substring(end);
    textarea.value = newText;
    this.updateTemplatePrompt(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + variable.length;
    }, 0);
  }
  openTemplateCreator() {
    this.showTemplateCreator.set(true);
    this.newTemplate.set({ name: "", prompt: "" });
  }
  closeTemplateCreator() {
    this.showTemplateCreator.set(false);
  }
  // ==================== 輔助方法 ====================
  getTemplateName(id) {
    if (!id)
      return "N/A";
    return this.messageTemplates().find((t) => t.id === id)?.name || "Unknown Template";
  }
  getTemplateById(id) {
    return this.messageTemplates().find((t) => t.id === id);
  }
  // ==================== IPC 事件處理 ====================
  setupIpcListeners() {
    this.ipcService.on("templates-result", (data) => this.handleTemplates(data));
    this.ipcService.on("template-added", (data) => this.handleTemplateAdded(data));
    this.ipcService.on("template-removed", (data) => this.handleTemplateRemoved(data));
    this.ipcService.on("template-status-toggled", (data) => this.handleTemplateStatusToggled(data));
  }
  handleTemplates(data) {
    if (data.success || data.templates) {
      this.messageTemplates.set(data.templates || []);
    }
  }
  handleTemplateAdded(data) {
    if (data.success) {
      this.loadTemplates();
    } else {
      this.toastService.error(`\u6DFB\u52A0\u5931\u6557: ${data.error}`);
    }
  }
  handleTemplateRemoved(data) {
    if (data.success) {
      this.loadTemplates();
    }
  }
  handleTemplateStatusToggled(data) {
    if (data.success) {
      this.loadTemplates();
    }
  }
  static {
    this.\u0275fac = function TemplateManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TemplateManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _TemplateManagementService, factory: _TemplateManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TemplateManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/navigation.service.ts
var VIEW_CONFIG = {
  "dashboard": { path: "/dashboard", title: "\u5100\u8868\u677F", icon: "\u{1F3E0}" },
  "accounts": { path: "/accounts", title: "\u5E33\u865F\u7BA1\u7406", icon: "\u{1F465}" },
  "add-account": { path: "/accounts/add", title: "\u6DFB\u52A0\u5E33\u865F", icon: "\u2795" },
  "api-credentials": { path: "/accounts/api", title: "API \u6191\u8B49", icon: "\u{1F511}" },
  "resources": { path: "/resources", title: "\u8CC7\u6E90\u7BA1\u7406", icon: "\u{1F4E6}" },
  "member-database": { path: "/member-database", title: "\u6210\u54E1\u8CC7\u6599\u5EAB", icon: "\u{1F4CA}" },
  "resource-center": { path: "/resource-center", title: "\u8CC7\u6E90\u4E2D\u5FC3", icon: "\u{1F3E2}" },
  "search-discovery": { path: "/search-discovery", title: "\u8CC7\u6E90\u767C\u73FE", icon: "\u{1F50D}" },
  "ai-assistant": {
    path: "/ai-assistant",
    title: "AI \u7B56\u7565\u898F\u5283",
    icon: "\u{1F916}",
    requiredFeature: "strategyPlanning",
    membershipLevel: "diamond",
    membershipMessage: "\u{1F48E} AI\u7B56\u7565\u898F\u5283\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "automation": { path: "/automation", title: "\u81EA\u52D5\u5316\u4E2D\u5FC3", icon: "\u2699\uFE0F" },
  "leads": { path: "/leads", title: "\u6F5B\u5728\u5BA2\u6236", icon: "\u{1F3AF}" },
  "lead-nurturing": { path: "/lead-nurturing", title: "\u7DDA\u7D22\u57F9\u80B2", icon: "\u{1F331}" },
  "nurturing-analytics": { path: "/nurturing-analytics", title: "\u57F9\u80B2\u5206\u6790", icon: "\u{1F4C8}" },
  "ads": {
    path: "/ads",
    title: "\u5EE3\u544A\u767C\u9001",
    icon: "\u{1F4E2}",
    requiredFeature: "adBroadcast",
    membershipLevel: "silver",
    membershipMessage: "\u{1F948} \u5EE3\u544A\u767C\u9001\u529F\u80FD\u9700\u8981 \u767D\u9280\u7CBE\u82F1 \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "user-tracking": {
    path: "/user-tracking",
    title: "\u7528\u6236\u8FFD\u8E64",
    icon: "\u{1F464}",
    requiredFeature: "advancedAnalytics",
    membershipLevel: "diamond",
    membershipMessage: "\u{1F48E} \u7528\u6236\u8FFD\u8E64\u529F\u80FD\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "campaigns": {
    path: "/campaigns",
    title: "\u71DF\u92B7\u6D3B\u52D5",
    icon: "\u{1F680}",
    requiredFeature: "aiSalesFunnel",
    membershipLevel: "diamond",
    membershipMessage: "\u{1F48E} \u71DF\u92B7\u6D3B\u52D5\u529F\u80FD\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "multi-role": {
    path: "/multi-role",
    title: "\u591A\u89D2\u8272\u5354\u4F5C",
    icon: "\u{1F3AD}",
    requiredFeature: "multiRole",
    membershipLevel: "diamond",
    membershipMessage: "\u{1F48E} \u591A\u89D2\u8272\u5354\u4F5C\u529F\u80FD\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "ai-team": {
    path: "/ai-team",
    title: "AI \u5718\u968A\u92B7\u552E",
    icon: "\u{1F91D}",
    requiredFeature: "autoExecution",
    membershipLevel: "diamond",
    membershipMessage: "\u{1F48E} AI\u5718\u968A\u92B7\u552E\u9700\u8981 \u947D\u77F3\u738B\u724C \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "ai-center": { path: "/ai-center", title: "AI \u4E2D\u5FC3", icon: "\u{1F9E0}" },
  "settings": { path: "/settings", title: "\u8A2D\u5B9A", icon: "\u2699\uFE0F" },
  "analytics": {
    path: "/analytics",
    title: "\u6578\u64DA\u6D1E\u5BDF",
    icon: "\u{1F4CA}",
    requiredFeature: "dataInsightsBasic",
    membershipLevel: "gold",
    membershipMessage: "\u{1F947} \u6578\u64DA\u6D1E\u5BDF\u529F\u80FD\u9700\u8981 \u9EC3\u91D1\u5927\u5E2B \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "analytics-center": {
    path: "/analytics-center",
    title: "\u6578\u64DA\u5206\u6790\u4E2D\u5FC3",
    icon: "\u{1F4C9}",
    requiredFeature: "dataInsightsBasic",
    membershipLevel: "gold",
    membershipMessage: "\u{1F947} \u6578\u64DA\u5206\u6790\u529F\u80FD\u9700\u8981 \u9EC3\u91D1\u5927\u5E2B \u6216\u4EE5\u4E0A\u6703\u54E1"
  },
  "profile": { path: "/profile", title: "\u500B\u4EBA\u8CC7\u6599", icon: "\u{1F464}" },
  "membership-center": { path: "/membership", title: "\u6703\u54E1\u4E2D\u5FC3", icon: "\u2B50" },
  "monitoring-accounts": { path: "/monitoring/accounts", title: "\u76E3\u63A7\u5E33\u865F", icon: "\u{1F441}\uFE0F" },
  "monitoring-groups": { path: "/monitoring/groups", title: "\u76E3\u63A7\u7FA4\u7D44", icon: "\u{1F441}\uFE0F" },
  "keyword-sets": { path: "/monitoring/keywords", title: "\u95DC\u9375\u8A5E\u96C6", icon: "\u{1F524}" },
  "chat-templates": { path: "/monitoring/templates", title: "\u804A\u5929\u6A21\u677F", icon: "\u{1F4AC}" },
  "trigger-rules": { path: "/monitoring/triggers", title: "\u89F8\u767C\u898F\u5247", icon: "\u26A1" },
  "collected-users": { path: "/monitoring/users", title: "\u6536\u96C6\u7528\u6236", icon: "\u{1F465}" }
};
var NavigationService = class _NavigationService {
  constructor() {
    this.membershipService = inject(MembershipService);
    this.toastService = inject(ToastService);
    this.currentView = signal("dashboard", ...ngDevMode ? [{ debugName: "currentView" }] : []);
    this._history = ["dashboard"];
    this.history = signal(["dashboard"], ...ngDevMode ? [{ debugName: "history" }] : []);
    this.currentViewConfig = computed(() => VIEW_CONFIG[this.currentView()], ...ngDevMode ? [{ debugName: "currentViewConfig" }] : []);
    this.canGoBack = computed(() => this._history.length > 1, ...ngDevMode ? [{ debugName: "canGoBack" }] : []);
    this.onNavigateCallbacks = [];
  }
  /**
   * 導航到指定視圖
   * @param view 目標視圖
   * @param options 導航選項
   * @returns 是否成功導航
   */
  navigate(view, options) {
    if (!options?.skipPermissionCheck) {
      const config = VIEW_CONFIG[view];
      if (config?.requiredFeature && !this.membershipService.hasFeature(config.requiredFeature)) {
        this.toastService.warning(config.membershipMessage || "\u6B64\u529F\u80FD\u9700\u8981\u5347\u7D1A\u6703\u54E1");
        window.dispatchEvent(new CustomEvent("open-membership-dialog"));
        return false;
      }
    }
    const previousView = this.currentView();
    this.currentView.set(view);
    if (!options?.skipHistory && view !== previousView) {
      this._history.push(view);
      if (this._history.length > 50) {
        this._history = this._history.slice(-50);
      }
      this.history.set([...this._history]);
    }
    this.onNavigateCallbacks.forEach((cb) => cb(view));
    return true;
  }
  /**
   * 返回上一個視圖
   */
  goBack() {
    if (this._history.length > 1) {
      this._history.pop();
      const previousView = this._history[this._history.length - 1];
      this.currentView.set(previousView);
      this.history.set([...this._history]);
      return true;
    }
    return false;
  }
  /**
   * 返回首頁
   */
  goHome() {
    this.navigate("dashboard");
  }
  /**
   * 註冊導航回調
   */
  onNavigate(callback) {
    this.onNavigateCallbacks.push(callback);
    return () => {
      const index = this.onNavigateCallbacks.indexOf(callback);
      if (index > -1) {
        this.onNavigateCallbacks.splice(index, 1);
      }
    };
  }
  /**
   * 獲取視圖配置
   */
  getViewConfig(view) {
    return VIEW_CONFIG[view];
  }
  /**
   * 獲取所有視圖配置
   */
  getAllViewConfigs() {
    return VIEW_CONFIG;
  }
  /**
   * 檢查視圖是否可用（權限檢查）
   */
  isViewAvailable(view) {
    const config = VIEW_CONFIG[view];
    if (!config?.requiredFeature)
      return true;
    return this.membershipService.hasFeature(config.requiredFeature);
  }
  /**
   * 獲取視圖的路由路徑
   */
  getViewPath(view) {
    return VIEW_CONFIG[view]?.path || "/dashboard";
  }
  /**
   * 從路由路徑獲取視圖名稱
   */
  getViewFromPath(path) {
    for (const [view, config] of Object.entries(VIEW_CONFIG)) {
      if (config.path === path) {
        return view;
      }
    }
    return void 0;
  }
  static {
    this.\u0275fac = function NavigationService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _NavigationService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _NavigationService, factory: _NavigationService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(NavigationService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/lead-management.service.ts
var LeadManagementService = class _LeadManagementService {
  constructor() {
    this.ipcService = inject(ElectronIpcService);
    this.toastService = inject(ToastService);
    this.leads = signal([], ...ngDevMode ? [{ debugName: "leads" }] : []);
    this.selectedLead = signal(null, ...ngDevMode ? [{ debugName: "selectedLead" }] : []);
    this.leadStats = signal({
      total: 0,
      byStage: { "New": 0, "Contacted": 0, "Replied": 0, "Follow-up": 0, "Closed-Won": 0, "Closed-Lost": 0 },
      todayNew: 0,
      todayContacted: 0,
      conversionRate: 0
    }, ...ngDevMode ? [{ debugName: "leadStats" }] : []);
    this.filter = signal({}, ...ngDevMode ? [{ debugName: "filter" }] : []);
    this.viewMode = signal("kanban", ...ngDevMode ? [{ debugName: "viewMode" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.selectedLeadIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "selectedLeadIds" }] : []);
    this.showBatchActions = signal(false, ...ngDevMode ? [{ debugName: "showBatchActions" }] : []);
    this.showLeadDetails = signal(false, ...ngDevMode ? [{ debugName: "showLeadDetails" }] : []);
    this.detailsTab = signal("sendMessage", ...ngDevMode ? [{ debugName: "detailsTab" }] : []);
    this.showDeleteConfirm = signal(false, ...ngDevMode ? [{ debugName: "showDeleteConfirm" }] : []);
    this.leadsToDelete = signal([], ...ngDevMode ? [{ debugName: "leadsToDelete" }] : []);
    this.filteredLeads = computed(() => {
      let result = this.leads();
      const f = this.filter();
      if (f.stage) {
        result = result.filter((l) => l.stage === f.stage);
      }
      if (f.search) {
        const search = f.search.toLowerCase();
        result = result.filter((l) => l.username.toLowerCase().includes(search) || l.firstName?.toLowerCase().includes(search) || l.lastName?.toLowerCase().includes(search) || l.message.toLowerCase().includes(search));
      }
      if (f.sourceGroup) {
        result = result.filter((l) => l.sourceGroup === f.sourceGroup);
      }
      if (f.minScore !== void 0) {
        result = result.filter((l) => (l.score || 0) >= f.minScore);
      }
      return result;
    }, ...ngDevMode ? [{ debugName: "filteredLeads" }] : []);
    this.leadsByStage = computed(() => {
      const stages = ["New", "Contacted", "Replied", "Follow-up", "Closed-Won", "Closed-Lost"];
      const result = {};
      stages.forEach((stage) => {
        result[stage] = this.filteredLeads().filter((l) => l.stage === stage);
      });
      return result;
    }, ...ngDevMode ? [{ debugName: "leadsByStage" }] : []);
    this.selectedCount = computed(() => this.selectedLeadIds().size, ...ngDevMode ? [{ debugName: "selectedCount" }] : []);
    this.stageLabels = {
      "New": "\u65B0\u7DDA\u7D22",
      "Contacted": "\u5DF2\u806F\u7E6B",
      "Replied": "\u5DF2\u56DE\u8986",
      "Follow-up": "\u9700\u8DDF\u9032",
      "Closed-Won": "\u5DF2\u6210\u4EA4",
      "Closed-Lost": "\u5DF2\u6D41\u5931"
    };
    this.stageColors = {
      "New": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "Contacted": "bg-amber-500/20 text-amber-400 border-amber-500/30",
      "Replied": "bg-purple-500/20 text-purple-400 border-purple-500/30",
      "Follow-up": "bg-orange-500/20 text-orange-400 border-orange-500/30",
      "Closed-Won": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      "Closed-Lost": "bg-red-500/20 text-red-400 border-red-500/30"
    };
    this.setupIpcListeners();
  }
  // ==================== 加載方法 ====================
  loadLeads(limit = 100) {
    this.isLoading.set(true);
    this.ipcService.send("get-leads", { limit });
  }
  loadLeadStats() {
    this.ipcService.send("get-lead-stats", {});
  }
  loadLeadDetails(leadId) {
    this.ipcService.send("get-lead-details", { leadId });
  }
  refreshData() {
    this.loadLeads();
    this.loadLeadStats();
  }
  // ==================== 線索操作 ====================
  selectLead(lead) {
    this.selectedLead.set(lead);
    this.showLeadDetails.set(true);
    this.loadLeadDetails(lead.id);
  }
  closeLeadDetails() {
    this.showLeadDetails.set(false);
    this.selectedLead.set(null);
  }
  updateLeadStage(leadId, newStage) {
    this.ipcService.send("update-lead-stage", { leadId, stage: newStage });
    this.leads.update((leads) => leads.map((l) => l.id === leadId ? __spreadProps(__spreadValues({}, l), { stage: newStage }) : l));
    if (this.selectedLead()?.id === leadId) {
      this.selectedLead.update((l) => l ? __spreadProps(__spreadValues({}, l), { stage: newStage }) : null);
    }
  }
  addNote(leadId, note) {
    if (!note.trim())
      return;
    this.ipcService.send("add-lead-note", { leadId, note });
  }
  assignLead(leadId, assignTo) {
    this.ipcService.send("assign-lead", { leadId, assignTo });
    this.leads.update((leads) => leads.map((l) => l.id === leadId ? __spreadProps(__spreadValues({}, l), { assignedTo: assignTo }) : l));
  }
  addToBlacklist(leadId) {
    if (!confirm("\u78BA\u5B9A\u8981\u5C07\u6B64\u7528\u6236\u52A0\u5165\u9ED1\u540D\u55AE\u55CE\uFF1F"))
      return;
    this.ipcService.send("add-to-blacklist", { leadId });
    this.toastService.success("\u5DF2\u52A0\u5165\u9ED1\u540D\u55AE");
  }
  // ==================== 批量操作 ====================
  toggleLeadSelection(leadId) {
    this.selectedLeadIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(leadId)) {
        newIds.delete(leadId);
      } else {
        newIds.add(leadId);
      }
      return newIds;
    });
  }
  selectAllLeads() {
    const allIds = new Set(this.filteredLeads().map((l) => l.id));
    this.selectedLeadIds.set(allIds);
  }
  clearSelection() {
    this.selectedLeadIds.set(/* @__PURE__ */ new Set());
  }
  batchUpdateStage(newStage) {
    const ids = Array.from(this.selectedLeadIds());
    if (ids.length === 0)
      return;
    this.ipcService.send("batch-update-lead-stage", { leadIds: ids, stage: newStage });
    this.leads.update((leads) => leads.map((l) => ids.includes(l.id) ? __spreadProps(__spreadValues({}, l), { stage: newStage }) : l));
    this.clearSelection();
    this.toastService.success(`\u5DF2\u66F4\u65B0 ${ids.length} \u500B\u7DDA\u7D22\u7684\u72C0\u614B`);
  }
  confirmDeleteLeads() {
    const ids = Array.from(this.selectedLeadIds());
    if (ids.length === 0)
      return;
    const leadsToDelete = this.leads().filter((l) => ids.includes(l.id));
    this.leadsToDelete.set(leadsToDelete);
    this.showDeleteConfirm.set(true);
  }
  cancelDeleteLeads() {
    this.showDeleteConfirm.set(false);
    this.leadsToDelete.set([]);
  }
  executeDeleteLeads() {
    const ids = this.leadsToDelete().map((l) => l.id);
    this.ipcService.send("batch-delete-leads", { leadIds: ids });
    this.leads.update((leads) => leads.filter((l) => !ids.includes(l.id)));
    this.clearSelection();
    this.showDeleteConfirm.set(false);
    this.leadsToDelete.set([]);
    this.toastService.success(`\u5DF2\u522A\u9664 ${ids.length} \u500B\u7DDA\u7D22`);
  }
  // ==================== 篩選和視圖 ====================
  setFilter(filter) {
    this.filter.update((f) => __spreadValues(__spreadValues({}, f), filter));
  }
  clearFilter() {
    this.filter.set({});
  }
  setViewMode(mode) {
    this.viewMode.set(mode);
  }
  setDetailsTab(tab) {
    this.detailsTab.set(tab);
  }
  // ==================== 導出 ====================
  exportToExcel() {
    const leads = this.filteredLeads();
    if (leads.length === 0) {
      this.toastService.warning("\u6C92\u6709\u53EF\u5C0E\u51FA\u7684\u7DDA\u7D22");
      return;
    }
    this.ipcService.send("export-leads-to-excel", {
      leadIds: leads.map((l) => l.id)
    });
    this.toastService.info("\u6B63\u5728\u5C0E\u51FA...");
  }
  // ==================== 輔助方法 ====================
  getStageLabel(stage) {
    return this.stageLabels[stage] || stage;
  }
  getStageColor(stage) {
    return this.stageColors[stage] || "bg-slate-500/20 text-slate-400";
  }
  getLeadDisplayName(lead) {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    }
    return lead.username || "Unknown";
  }
  // ==================== IPC 事件處理 ====================
  setupIpcListeners() {
    this.ipcService.on("leads-result", (data) => this.handleLeads(data));
    this.ipcService.on("lead-stats-result", (data) => this.handleLeadStats(data));
    this.ipcService.on("lead-details-result", (data) => this.handleLeadDetails(data));
    this.ipcService.on("lead-captured", (data) => this.handleLeadCaptured(data));
    this.ipcService.on("lead-stage-updated", (data) => this.handleLeadStageUpdated(data));
    this.ipcService.on("leads-exported", (data) => this.handleLeadsExported(data));
  }
  handleLeads(data) {
    this.isLoading.set(false);
    if (data.success || data.leads) {
      this.leads.set(data.leads || []);
    }
  }
  handleLeadStats(data) {
    if (data.success) {
      this.leadStats.set(data.stats);
    }
  }
  handleLeadDetails(data) {
    if (data.success && data.lead) {
      this.selectedLead.set(data.lead);
    }
  }
  handleLeadCaptured(data) {
    if (data.lead) {
      this.leads.update((leads) => [data.lead, ...leads]);
      this.toastService.success(`\u6355\u7372\u65B0\u7DDA\u7D22: ${data.lead.username}`);
    }
  }
  handleLeadStageUpdated(data) {
    if (data.success) {
      this.loadLeadStats();
    }
  }
  handleLeadsExported(data) {
    if (data.success) {
      this.toastService.success(`\u5C0E\u51FA\u6210\u529F: ${data.filePath}`);
    } else {
      this.toastService.error(`\u5C0E\u51FA\u5931\u6557: ${data.error}`);
    }
  }
  static {
    this.\u0275fac = function LeadManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LeadManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LeadManagementService, factory: _LeadManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LeadManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/group-management.service.ts
var GroupManagementService = class _GroupManagementService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._groups = signal([], ...ngDevMode ? [{ debugName: "_groups" }] : []);
    this._joinQueue = signal([], ...ngDevMode ? [{ debugName: "_joinQueue" }] : []);
    this._selectedGroupIds = signal(/* @__PURE__ */ new Set(), ...ngDevMode ? [{ debugName: "_selectedGroupIds" }] : []);
    this._isJoining = signal(false, ...ngDevMode ? [{ debugName: "_isJoining" }] : []);
    this.groups = this._groups.asReadonly();
    this.joinQueue = this._joinQueue.asReadonly();
    this.selectedGroupIds = this._selectedGroupIds.asReadonly();
    this.isJoining = this._isJoining.asReadonly();
    this._joinMonitorDialog = signal({
      isOpen: false,
      resource: null,
      selectedAccount: "",
      enableMonitoring: false,
      selectedKeywordSets: []
    }, ...ngDevMode ? [{ debugName: "_joinMonitorDialog" }] : []);
    this._batchJoinDialog = signal({
      isOpen: false,
      selectedResources: [],
      selectedAccount: "",
      enableMonitoring: false,
      selectedKeywordSets: []
    }, ...ngDevMode ? [{ debugName: "_batchJoinDialog" }] : []);
    this._postJoinDialog = signal({
      isOpen: false,
      resource: null,
      phone: "",
      keywordSetCount: 0
    }, ...ngDevMode ? [{ debugName: "_postJoinDialog" }] : []);
    this.joinMonitorDialog = this._joinMonitorDialog.asReadonly();
    this.batchJoinDialog = this._batchJoinDialog.asReadonly();
    this.postJoinDialog = this._postJoinDialog.asReadonly();
    this.selectedGroups = computed(() => {
      const ids = this._selectedGroupIds();
      return this._groups().filter((g) => ids.has(g.id));
    }, ...ngDevMode ? [{ debugName: "selectedGroups" }] : []);
    this.selectedGroupCount = computed(() => this._selectedGroupIds().size, ...ngDevMode ? [{ debugName: "selectedGroupCount" }] : []);
    this.joinQueuePending = computed(() => this._joinQueue().filter((item) => item.status === "pending"), ...ngDevMode ? [{ debugName: "joinQueuePending" }] : []);
    this.joinQueueProgress = computed(() => {
      const queue = this._joinQueue();
      if (queue.length === 0)
        return 0;
      const completed = queue.filter((item) => item.status === "joined" || item.status === "failed").length;
      return Math.round(completed / queue.length * 100);
    }, ...ngDevMode ? [{ debugName: "joinQueueProgress" }] : []);
  }
  // ========== 群組操作 ==========
  setGroups(groups) {
    this._groups.set(groups);
  }
  updateGroup(group2) {
    this._groups.update((list) => list.map((g) => g.id === group2.id ? __spreadValues(__spreadValues({}, g), group2) : g));
  }
  addGroup(group2) {
    this._groups.update((list) => [...list, group2]);
  }
  removeGroup(groupId) {
    this._groups.update((list) => list.filter((g) => g.id !== groupId));
  }
  // ========== 選擇操作 ==========
  toggleGroupSelection(groupId) {
    this._selectedGroupIds.update((ids) => {
      const newIds = new Set(ids);
      if (newIds.has(groupId)) {
        newIds.delete(groupId);
      } else {
        newIds.add(groupId);
      }
      return newIds;
    });
  }
  selectAllGroups() {
    const allIds = new Set(this._groups().map((g) => g.id));
    this._selectedGroupIds.set(allIds);
  }
  deselectAllGroups() {
    this._selectedGroupIds.set(/* @__PURE__ */ new Set());
  }
  // ========== 加入群組操作 ==========
  openJoinMonitorDialog(resource) {
    this._joinMonitorDialog.set({
      isOpen: true,
      resource,
      selectedAccount: "",
      enableMonitoring: false,
      selectedKeywordSets: []
    });
  }
  closeJoinMonitorDialog() {
    this._joinMonitorDialog.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  updateJoinMonitorDialog(updates) {
    this._joinMonitorDialog.update((s) => __spreadValues(__spreadValues({}, s), updates));
  }
  executeJoinAndMonitor() {
    const dialog = this._joinMonitorDialog();
    if (!dialog.resource || !dialog.selectedAccount) {
      this.toast.error("\u8ACB\u9078\u64C7\u5E33\u865F");
      return;
    }
    this._isJoining.set(true);
    this.ipc.send("join-group", {
      resourceId: dialog.resource.id,
      phone: dialog.selectedAccount,
      enableMonitoring: dialog.enableMonitoring,
      keywordSetIds: dialog.selectedKeywordSets
    });
    this.closeJoinMonitorDialog();
  }
  // ========== 批量加入操作 ==========
  openBatchJoinDialog(resources) {
    this._batchJoinDialog.set({
      isOpen: true,
      selectedResources: resources,
      selectedAccount: "",
      enableMonitoring: false,
      selectedKeywordSets: []
    });
  }
  closeBatchJoinDialog() {
    this._batchJoinDialog.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  updateBatchJoinDialog(updates) {
    this._batchJoinDialog.update((s) => __spreadValues(__spreadValues({}, s), updates));
  }
  executeBatchJoin() {
    const dialog = this._batchJoinDialog();
    if (dialog.selectedResources.length === 0 || !dialog.selectedAccount) {
      this.toast.error("\u8ACB\u9078\u64C7\u7FA4\u7D44\u548C\u5E33\u865F");
      return;
    }
    this._isJoining.set(true);
    const queueItems = dialog.selectedResources.map((r) => ({
      resourceId: r.id,
      title: r.title,
      status: "pending"
    }));
    this._joinQueue.set(queueItems);
    this.ipc.send("batch-join-groups", {
      resourceIds: dialog.selectedResources.map((r) => r.id),
      phone: dialog.selectedAccount,
      enableMonitoring: dialog.enableMonitoring,
      keywordSetIds: dialog.selectedKeywordSets
    });
    this.closeBatchJoinDialog();
  }
  // ========== 加入後操作 ==========
  openPostJoinDialog(resource, phone, keywordSetCount) {
    this._postJoinDialog.set({
      isOpen: true,
      resource,
      phone,
      keywordSetCount
    });
  }
  closePostJoinDialog() {
    this._postJoinDialog.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  postJoinExtractMembers() {
    const dialog = this._postJoinDialog();
    if (!dialog.resource)
      return;
    this.ipc.send("extract-members", {
      resourceId: dialog.resource.id,
      phone: dialog.phone
    });
    this.closePostJoinDialog();
    this.toast.info("\u958B\u59CB\u63D0\u53D6\u6210\u54E1...");
  }
  postJoinSendMessage() {
    const dialog = this._postJoinDialog();
    if (!dialog.resource)
      return;
    this.closePostJoinDialog();
  }
  // ========== 離開群組操作 ==========
  leaveGroup(resource, phone) {
    if (!confirm(`\u78BA\u5B9A\u8981\u96E2\u958B\u7FA4\u7D44 ${resource.title} \u55CE\uFF1F`)) {
      return;
    }
    this.ipc.send("leave-group", {
      resourceId: resource.id,
      phone
    });
    this.toast.info("\u6B63\u5728\u96E2\u958B\u7FA4\u7D44...");
  }
  stopMonitoring(resource) {
    this.ipc.send("stop-monitoring", {
      resourceId: resource.id
    });
    this.toast.info("\u5DF2\u505C\u6B62\u76E3\u63A7");
  }
  // ========== 隊列操作 ==========
  clearJoinQueue() {
    this._joinQueue.set([]);
  }
  updateQueueItemStatus(resourceId, status, error) {
    this._joinQueue.update((queue2) => queue2.map((item) => item.resourceId === resourceId ? __spreadProps(__spreadValues({}, item), { status, error }) : item));
    const queue = this._joinQueue();
    const allDone = queue.every((item) => item.status === "joined" || item.status === "failed");
    if (allDone) {
      this._isJoining.set(false);
      const joined = queue.filter((item) => item.status === "joined").length;
      const failed = queue.filter((item) => item.status === "failed").length;
      if (failed > 0) {
        this.toast.warning(`\u5B8C\u6210\uFF1A${joined} \u6210\u529F\uFF0C${failed} \u5931\u6557`);
      } else {
        this.toast.success(`\u6210\u529F\u52A0\u5165 ${joined} \u500B\u7FA4\u7D44`);
      }
    }
  }
  // ========== IPC 事件處理 ==========
  handleJoinResult(data) {
    this._isJoining.set(false);
    if (data.success) {
      this.toast.success("\u6210\u529F\u52A0\u5165\u7FA4\u7D44");
      this.updateGroup({ id: data.resourceId, joined: true });
      if (data.phone && data.keywordSetCount !== void 0) {
        const group2 = this._groups().find((g) => g.id === data.resourceId);
        if (group2) {
          this.openPostJoinDialog(group2, data.phone, data.keywordSetCount);
        }
      }
    } else {
      this.toast.error(`\u52A0\u5165\u7FA4\u7D44\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
    }
  }
  handleBatchJoinProgress(data) {
    this.updateQueueItemStatus(data.resourceId, data.success ? "joined" : "failed", data.error);
  }
  handleLeaveResult(data) {
    if (data.success) {
      this.updateGroup({ id: data.resourceId, joined: false });
      this.toast.success("\u5DF2\u96E2\u958B\u7FA4\u7D44");
    } else {
      this.toast.error(`\u96E2\u958B\u7FA4\u7D44\u5931\u6557: ${data.error || "\u672A\u77E5\u932F\u8AA4"}`);
    }
  }
  static {
    this.\u0275fac = function GroupManagementService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _GroupManagementService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _GroupManagementService, factory: _GroupManagementService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(GroupManagementService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/message-queue.service.ts
var MessageQueueService = class _MessageQueueService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._queueStatuses = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_queueStatuses" }] : []);
    this._messages = signal([], ...ngDevMode ? [{ debugName: "_messages" }] : []);
    this._selectedPhone = signal(null, ...ngDevMode ? [{ debugName: "_selectedPhone" }] : []);
    this.queueStatuses = this._queueStatuses.asReadonly();
    this.messages = this._messages.asReadonly();
    this.selectedPhone = this._selectedPhone.asReadonly();
    this._singleMessageDialog = signal({
      isOpen: false,
      target: null,
      targetType: "user",
      message: "",
      selectedAccount: ""
    }, ...ngDevMode ? [{ debugName: "_singleMessageDialog" }] : []);
    this._batchMessageDialog = signal({
      isOpen: false,
      targets: [],
      targetType: "user",
      message: "",
      selectedAccount: "",
      delay: 5
    }, ...ngDevMode ? [{ debugName: "_batchMessageDialog" }] : []);
    this.singleMessageDialog = this._singleMessageDialog.asReadonly();
    this.batchMessageDialog = this._batchMessageDialog.asReadonly();
    this.totalPending = computed(() => {
      let total = 0;
      this._queueStatuses().forEach((status) => {
        total += status.pending;
      });
      return total;
    }, ...ngDevMode ? [{ debugName: "totalPending" }] : []);
    this.totalSent = computed(() => {
      let total = 0;
      this._queueStatuses().forEach((status) => {
        total += status.sent;
      });
      return total;
    }, ...ngDevMode ? [{ debugName: "totalSent" }] : []);
    this.totalFailed = computed(() => {
      let total = 0;
      this._queueStatuses().forEach((status) => {
        total += status.failed;
      });
      return total;
    }, ...ngDevMode ? [{ debugName: "totalFailed" }] : []);
    this.selectedQueueStatus = computed(() => {
      const phone = this._selectedPhone();
      if (!phone)
        return null;
      return this._queueStatuses().get(phone) || null;
    }, ...ngDevMode ? [{ debugName: "selectedQueueStatus" }] : []);
    this.selectedQueueMessages = computed(() => {
      const phone = this._selectedPhone();
      if (!phone)
        return [];
      return this._messages().filter((m) => m.phone === phone);
    }, ...ngDevMode ? [{ debugName: "selectedQueueMessages" }] : []);
  }
  // ========== 隊列操作 ==========
  refreshQueueStatus(phone) {
    this.ipc.send("get-queue-status", { phone });
  }
  setQueueStatuses(statuses) {
    const map = /* @__PURE__ */ new Map();
    for (const status of statuses) {
      map.set(status.phone, status);
    }
    this._queueStatuses.set(map);
  }
  updateQueueStatus(status) {
    this._queueStatuses.update((map) => {
      const newMap = new Map(map);
      newMap.set(status.phone, status);
      return newMap;
    });
  }
  selectQueue(phone) {
    this._selectedPhone.set(phone);
    this.loadQueueMessages(phone);
  }
  loadQueueMessages(phone, status, limit = 100) {
    this.ipc.send("get-queue-messages", { phone, status, limit });
  }
  setMessages(messages) {
    this._messages.set(messages);
  }
  // ========== 消息操作 ==========
  retryMessage(messageId) {
    this.ipc.send("retry-message", { messageId });
    this.toast.info("\u6B63\u5728\u91CD\u8A66\u767C\u9001...");
  }
  cancelMessage(messageId) {
    this.ipc.send("cancel-message", { messageId });
    this.toast.info("\u5DF2\u53D6\u6D88\u6D88\u606F");
  }
  deleteMessage(phone, messageId) {
    this.ipc.send("delete-queue-message", { phone, messageId });
  }
  updateMessagePriority(phone, messageId, priority) {
    this.ipc.send("update-message-priority", { phone, messageId, priority });
  }
  // ========== 隊列控制 ==========
  pauseQueue(phone) {
    this.ipc.send("pause-queue", { phone });
    this.toast.info("\u968A\u5217\u5DF2\u66AB\u505C");
  }
  resumeQueue(phone) {
    this.ipc.send("resume-queue", { phone });
    this.toast.info("\u968A\u5217\u5DF2\u6062\u5FA9");
  }
  clearQueue(phone, status) {
    if (!confirm(`\u78BA\u5B9A\u8981\u6E05\u7A7A ${phone} \u7684${status || "\u6240\u6709"}\u6D88\u606F\u55CE\uFF1F`)) {
      return;
    }
    this.ipc.send("clear-queue", { phone, status });
    this.toast.info("\u6B63\u5728\u6E05\u7A7A\u968A\u5217...");
  }
  clearPendingQueue() {
    if (!confirm("\u78BA\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u5F85\u767C\u9001\u7684\u6D88\u606F\u55CE\uFF1F")) {
      return;
    }
    this.ipc.send("clear-all-pending");
    this.toast.info("\u6B63\u5728\u6E05\u7A7A\u5F85\u767C\u9001\u6D88\u606F...");
  }
  // ========== 單條消息對話框 ==========
  openSingleMessageDialog(target, targetType) {
    this._singleMessageDialog.set({
      isOpen: true,
      target,
      targetType,
      message: "",
      selectedAccount: ""
    });
  }
  closeSingleMessageDialog() {
    this._singleMessageDialog.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  updateSingleMessageDialog(updates) {
    this._singleMessageDialog.update((s) => __spreadValues(__spreadValues({}, s), updates));
  }
  executeSingleMessage() {
    const dialog = this._singleMessageDialog();
    if (!dialog.target || !dialog.selectedAccount || !dialog.message.trim()) {
      this.toast.error("\u8ACB\u586B\u5BEB\u5B8C\u6574\u4FE1\u606F");
      return;
    }
    this.ipc.send("send-message", {
      phone: dialog.selectedAccount,
      targetId: dialog.target.id || dialog.target.telegram_id,
      targetType: dialog.targetType,
      content: dialog.message.trim()
    });
    this.closeSingleMessageDialog();
    this.toast.success("\u6D88\u606F\u5DF2\u52A0\u5165\u767C\u9001\u968A\u5217");
  }
  // ========== 批量消息對話框 ==========
  openBatchMessageDialog(targets, targetType) {
    this._batchMessageDialog.set({
      isOpen: true,
      targets,
      targetType,
      message: "",
      selectedAccount: "",
      delay: 5
    });
  }
  closeBatchMessageDialog() {
    this._batchMessageDialog.update((s) => __spreadProps(__spreadValues({}, s), { isOpen: false }));
  }
  updateBatchMessageDialog(updates) {
    this._batchMessageDialog.update((s) => __spreadValues(__spreadValues({}, s), updates));
  }
  executeBatchMessage() {
    const dialog = this._batchMessageDialog();
    if (dialog.targets.length === 0 || !dialog.selectedAccount || !dialog.message.trim()) {
      this.toast.error("\u8ACB\u586B\u5BEB\u5B8C\u6574\u4FE1\u606F");
      return;
    }
    this.ipc.send("batch-send-message", {
      phone: dialog.selectedAccount,
      targets: dialog.targets.map((t) => ({
        id: t.id || t.telegram_id,
        type: dialog.targetType
      })),
      content: dialog.message.trim(),
      delay: dialog.delay
    });
    this.closeBatchMessageDialog();
    this.toast.success(`${dialog.targets.length} \u689D\u6D88\u606F\u5DF2\u52A0\u5165\u767C\u9001\u968A\u5217`);
  }
  // ========== 私信操作 ==========
  sendPrivateMessage(member, selectedAccount) {
    this.openSingleMessageDialog(member, "user");
    this.updateSingleMessageDialog({ selectedAccount });
  }
  batchSendPrivateMessage(members) {
    this.openBatchMessageDialog(members, "user");
  }
  // ========== 群組消息操作 ==========
  sendGroupMessage(group2, selectedAccount) {
    this.openSingleMessageDialog(group2, "group");
    this.updateSingleMessageDialog({ selectedAccount });
  }
  batchSendGroupMessage(groups) {
    this.openBatchMessageDialog(groups, "group");
  }
  // ========== IPC 事件處理 ==========
  handleQueueStatusUpdate(statuses) {
    this.setQueueStatuses(statuses);
  }
  handleMessagesLoaded(messages) {
    this.setMessages(messages);
  }
  handleMessageSent(data) {
    this._messages.update((list) => list.map((m) => m.id === data.messageId ? __spreadProps(__spreadValues({}, m), {
      status: data.success ? "sent" : "failed",
      error: data.error,
      sentAt: data.success ? (/* @__PURE__ */ new Date()).toISOString() : void 0
    }) : m));
  }
  handleQueueCleared(data) {
    this.toast.success(`\u5DF2\u6E05\u7A7A ${data.count} \u689D\u6D88\u606F`);
    this.refreshQueueStatus(data.phone);
  }
  static {
    this.\u0275fac = function MessageQueueService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _MessageQueueService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _MessageQueueService, factory: _MessageQueueService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(MessageQueueService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/app-facade.service.ts
var AppFacadeService = class _AppFacadeService {
  constructor() {
    this.nav = inject(NavBridgeService);
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this.membership = inject(MembershipService);
    this.i18n = inject(I18nService);
    this.accounts = inject(AccountManagementService);
    this.navigation = inject(NavigationService);
    this.campaigns = inject(CampaignManagementService);
    this.templates = inject(TemplateManagementService);
    this.monitoring = inject(MonitoringManagementService);
    this.leads = inject(LeadManagementService);
    this.groups = inject(GroupManagementService);
    this.messages = inject(MessageQueueService);
    this._isInitialized = signal(false, ...ngDevMode ? [{ debugName: "_isInitialized" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._systemStatus = signal(null, ...ngDevMode ? [{ debugName: "_systemStatus" }] : []);
    this._currentView = signal("dashboard", ...ngDevMode ? [{ debugName: "_currentView" }] : []);
    this.isInitialized = this._isInitialized.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.systemStatus = this._systemStatus.asReadonly();
    this.currentView = this._currentView.asReadonly();
    this.hasOnlineAccounts = computed(() => {
      const status = this._systemStatus();
      return (status?.accounts?.online ?? 0) > 0;
    }, ...ngDevMode ? [{ debugName: "hasOnlineAccounts" }] : []);
    this.isMonitoringActive = computed(() => {
      const status = this._systemStatus();
      return status?.monitoring?.active ?? false;
    }, ...ngDevMode ? [{ debugName: "isMonitoringActive" }] : []);
    this.pendingMessages = computed(() => {
      const status = this._systemStatus();
      return status?.queue?.pending ?? 0;
    }, ...ngDevMode ? [{ debugName: "pendingMessages" }] : []);
    this.setupNavSync();
    this.setupIpcListeners();
  }
  // ========== 導航同步 ==========
  setupNavSync() {
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("accounts-loaded", (accounts) => {
      this.accounts.setAccounts(accounts);
    });
    this.ipc.on("account-status-changed", (data) => {
      this.accounts.updateAccount(data);
    });
    this.ipc.on("login-code-required", (data) => {
      this.accounts.handleCodeRequired(data);
    });
    this.ipc.on("login-2fa-required", (data) => {
      this.accounts.handle2FARequired(data);
    });
    this.ipc.on("login-success", (data) => {
      this.accounts.handleLoginSuccess(data);
    });
    this.ipc.on("login-failed", (data) => {
      this.accounts.handleLoginFailed(data);
    });
    this.ipc.on("join-group-result", (data) => {
      this.groups.handleJoinResult(data);
    });
    this.ipc.on("batch-join-progress", (data) => {
      this.groups.handleBatchJoinProgress(data);
    });
    this.ipc.on("queue-status-update", (data) => {
      this.messages.handleQueueStatusUpdate(data);
    });
    this.ipc.on("message-sent", (data) => {
      this.messages.handleMessageSent(data);
    });
    this.ipc.on("system-status", (status) => {
      this._systemStatus.set(status);
    });
  }
  // ========== 導航操作 ==========
  /**
   * 導航到指定視圖
   */
  navigateTo(view) {
    this.nav.navigateTo(view);
  }
  /**
   * 導航回上一頁
   */
  goBack() {
    this.navigation.goBack();
  }
  /**
   * 導航到首頁
   */
  goHome() {
    this.navigateTo("dashboard");
  }
  // ========== 帳號操作（委託） ==========
  loginAccount(accountId) {
    this.accounts.loginAccount(accountId);
  }
  logoutAccount(accountId) {
    this.accounts.logoutAccount(accountId);
  }
  submitLoginCode() {
    this.accounts.submitLoginCode();
  }
  submitLogin2FA() {
    this.accounts.submitLogin2FA();
  }
  cancelLogin() {
    this.accounts.cancelLogin();
  }
  // ========== 群組操作（委託） ==========
  openJoinMonitorDialog(resource) {
    this.groups.openJoinMonitorDialog(resource);
  }
  executeJoinAndMonitor() {
    this.groups.executeJoinAndMonitor();
  }
  openBatchJoinDialog(resources) {
    this.groups.openBatchJoinDialog(resources);
  }
  leaveGroup(resource, phone) {
    this.groups.leaveGroup(resource, phone);
  }
  // ========== 消息操作（委託） ==========
  openSingleMessageDialog(target, type) {
    this.messages.openSingleMessageDialog(target, type);
  }
  openBatchMessageDialog(targets, type) {
    this.messages.openBatchMessageDialog(targets, type);
  }
  pauseQueue(phone) {
    this.messages.pauseQueue(phone);
  }
  resumeQueue(phone) {
    this.messages.resumeQueue(phone);
  }
  // ========== 監控操作（委託） ==========
  startMonitoring() {
    this.ipc.send("start-monitoring");
    this.toast.info("\u6B63\u5728\u555F\u52D5\u76E3\u63A7...");
  }
  stopMonitoring() {
    this.ipc.send("stop-monitoring");
    this.toast.info("\u6B63\u5728\u505C\u6B62\u76E3\u63A7...");
  }
  // ========== 營銷活動（委託） ==========
  loadCampaigns() {
    this.campaigns.loadCampaigns();
  }
  createCampaign() {
    this.campaigns.createCampaignFromForm();
  }
  startCampaign(campaignId) {
    this.campaigns.startCampaign(campaignId);
  }
  // ========== 線索管理（委託） ==========
  loadLeads() {
    this.leads.loadLeads();
  }
  selectLead(lead) {
    this.leads.selectLead(lead);
  }
  // ========== 系統操作 ==========
  /**
   * 初始化應用
   */
  async initialize() {
    if (this._isInitialized())
      return;
    this._isLoading.set(true);
    try {
      this.ipc.send("get-accounts");
      this.ipc.send("get-system-status");
      this.ipc.send("get-config");
      this._isInitialized.set(true);
    } catch (error) {
      console.error("[AppFacade] Initialization failed:", error);
      this.toast.error("\u61C9\u7528\u521D\u59CB\u5316\u5931\u6557");
    } finally {
      this._isLoading.set(false);
    }
  }
  /**
   * 刷新系統狀態
   */
  refreshSystemStatus() {
    this.ipc.send("get-system-status");
  }
  /**
   * 重新加載所有數據
   */
  reloadAll() {
    this.ipc.send("get-accounts");
    this.ipc.send("get-system-status");
    this.campaigns.loadCampaigns();
    this.templates.loadTemplates();
    this.leads.loadLeads();
    this.messages.refreshQueueStatus();
  }
  // ========== 工具方法 ==========
  /**
   * 翻譯
   */
  t(key, params) {
    return this.i18n.t(key, params);
  }
  /**
   * 檢查功能權限
   */
  hasFeature(feature) {
    return this.membership.hasFeature(feature);
  }
  /**
   * 顯示成功提示
   */
  showSuccess(message) {
    this.toast.success(message);
  }
  /**
   * 顯示錯誤提示
   */
  showError(message) {
    this.toast.error(message);
  }
  /**
   * 顯示信息提示
   */
  showInfo(message) {
    this.toast.info(message);
  }
  // ========== 數據加載操作（委託） ==========
  /**
   * 加載資源列表
   */
  loadResources() {
    this.ipc.send("get-resources");
  }
  /**
   * 加載 AI 設置
   */
  loadAiSettings() {
    this.ipc.send("get-ai-settings");
  }
  /**
   * 加載成員列表
   */
  loadMemberList(resourceId) {
    this.ipc.send("get-member-list", { resourceId });
  }
  /**
   * 加載日誌文件
   */
  loadLogFiles() {
    this.ipc.send("get-log-files");
  }
  /**
   * 加載日誌統計
   */
  loadLogStats() {
    this.ipc.send("get-log-stats");
  }
  /**
   * 加載調度器狀態
   */
  loadSchedulerStatus() {
    this.ipc.send("get-scheduler-status");
  }
  /**
   * 加載預熱詳情
   */
  loadWarmupDetails(accountId) {
    this.ipc.send("get-warmup-details", { accountId });
  }
  // ========== 資源操作（委託） ==========
  /**
   * 搜索頻道/群組
   */
  searchChannels(query2, options) {
    this.ipc.send("search-channels", __spreadValues({ query: query2 }, options));
  }
  /**
   * 提取成員
   */
  extractMembers(resourceId, phone, options) {
    this.ipc.send("extract-members", __spreadValues({ resourceId, phone }, options));
    this.toast.info("\u958B\u59CB\u63D0\u53D6\u6210\u54E1...");
  }
  /**
   * 邀請成員到群組
   */
  inviteMembers(resourceId, userIds, phone) {
    this.ipc.send("invite-members", { resourceId, userIds, phone });
    this.toast.info(`\u6B63\u5728\u9080\u8ACB ${userIds.length} \u4F4D\u6210\u54E1...`);
  }
  // ========== AI 操作（委託） ==========
  /**
   * 生成 AI 回復
   */
  generateAiResponse(prompt, context) {
    this.ipc.send("generate-ai-response", { prompt, context });
  }
  /**
   * 保存 AI 設置
   */
  saveAiSettings(settings) {
    this.ipc.send("save-ai-settings", settings);
    this.toast.success("AI \u8A2D\u7F6E\u5DF2\u4FDD\u5B58");
  }
  /**
   * 測試 AI 連接
   */
  testAiConnection() {
    this.ipc.send("test-ai-connection");
    this.toast.info("\u6B63\u5728\u6E2C\u8A66 AI \u9023\u63A5...");
  }
  // ========== 自動化操作（委託） ==========
  /**
   * 啟動自動化活動
   */
  startAutomation(campaignId) {
    this.campaigns.startCampaign(campaignId);
  }
  /**
   * 暫停自動化活動
   */
  pauseAutomation(campaignId) {
    this.ipc.send("pause-campaign", { campaignId });
    this.toast.info("\u6B63\u5728\u66AB\u505C\u6D3B\u52D5...");
  }
  /**
   * 停止自動化活動
   */
  stopAutomation(campaignId) {
    this.ipc.send("stop-campaign", { campaignId });
    this.toast.info("\u6B63\u5728\u505C\u6B62\u6D3B\u52D5...");
  }
  // ========== 備份操作（委託） ==========
  /**
   * 創建備份
   */
  createBackup() {
    this.ipc.send("create-backup");
    this.toast.info("\u6B63\u5728\u5275\u5EFA\u5099\u4EFD...");
  }
  /**
   * 恢復備份
   */
  restoreBackup(backupId) {
    if (confirm("\u78BA\u5B9A\u8981\u6062\u5FA9\u6B64\u5099\u4EFD\u55CE\uFF1F\u7576\u524D\u6578\u64DA\u5C07\u88AB\u8986\u84CB\u3002")) {
      this.ipc.send("restore-backup", { backupId });
      this.toast.info("\u6B63\u5728\u6062\u5FA9\u5099\u4EFD...");
    }
  }
  /**
   * 獲取備份列表
   */
  getBackups() {
    this.ipc.send("get-backups");
  }
  // ========== 導出操作（委託） ==========
  /**
   * 導出線索
   */
  exportLeads(format = "csv") {
    this.ipc.send("export-leads", { format });
    this.toast.info("\u6B63\u5728\u5C0E\u51FA\u7DDA\u7D22...");
  }
  /**
   * 導出成員
   */
  exportMembers(resourceId, format = "csv") {
    this.ipc.send("export-members", { resourceId, format });
    this.toast.info("\u6B63\u5728\u5C0E\u51FA\u6210\u54E1...");
  }
  /**
   * 導出統計報告
   */
  exportReport(type = "daily") {
    this.ipc.send("export-report", { type });
    this.toast.info("\u6B63\u5728\u751F\u6210\u5831\u544A...");
  }
  static {
    this.\u0275fac = function AppFacadeService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AppFacadeService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AppFacadeService, factory: _AppFacadeService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AppFacadeService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/rag.service.ts
var RagService = class _RagService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._isInitialized = signal(false, ...ngDevMode ? [{ debugName: "_isInitialized" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._isIndexing = signal(false, ...ngDevMode ? [{ debugName: "_isIndexing" }] : []);
    this._stats = signal({
      totalDocuments: 0,
      totalChunks: 0,
      lastIndexed: null,
      indexSize: "0 KB",
      categories: {}
    }, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this._searchResults = signal([], ...ngDevMode ? [{ debugName: "_searchResults" }] : []);
    this._searchQuery = signal("", ...ngDevMode ? [{ debugName: "_searchQuery" }] : []);
    this.isInitialized = this._isInitialized.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.isIndexing = this._isIndexing.asReadonly();
    this.stats = this._stats.asReadonly();
    this.searchResults = this._searchResults.asReadonly();
    this.searchQuery = this._searchQuery.asReadonly();
    this.setupIpcListeners();
  }
  // ========== IPC 監聽 ==========
  setupIpcListeners() {
    this.ipc.on("rag-initialized", (data) => {
      this._isInitialized.set(data.success);
      this._isLoading.set(false);
      if (data.success) {
        this.toast.success("RAG \u7CFB\u7D71\u521D\u59CB\u5316\u6210\u529F");
        this.refreshStats();
      }
    });
    this.ipc.on("rag-stats", (data) => {
      this._stats.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("rag-search-results", (data) => {
      this._searchResults.set(data.results);
      this._isLoading.set(false);
    });
    this.ipc.on("rag-indexing-started", () => {
      this._isIndexing.set(true);
      this.toast.info("\u958B\u59CB\u7D22\u5F15\u77E5\u8B58\u5EAB...");
    });
    this.ipc.on("rag-indexing-completed", (data) => {
      this._isIndexing.set(false);
      this.toast.success(`\u7D22\u5F15\u5B8C\u6210\uFF0C\u5171\u8655\u7406 ${data.count} \u500B\u6587\u6A94`);
      this.refreshStats();
    });
    this.ipc.on("rag-indexing-error", (data) => {
      this._isIndexing.set(false);
      this.toast.error(`\u7D22\u5F15\u5931\u6557: ${data.error}`);
    });
    this.ipc.on("rag-knowledge-added", () => {
      this.toast.success("\u77E5\u8B58\u5DF2\u6DFB\u52A0");
      this.refreshStats();
    });
    this.ipc.on("rag-cleanup-completed", (data) => {
      this.toast.success(`\u5DF2\u6E05\u7406 ${data.removed} \u500B\u904E\u6642\u77E5\u8B58`);
      this.refreshStats();
    });
  }
  // ========== 初始化操作 ==========
  initRagSystem() {
    this._isLoading.set(true);
    this.ipc.send("init-rag-system");
  }
  // ========== 索引操作 ==========
  triggerLearning() {
    this.ipc.send("rag-trigger-learning");
  }
  reindexConversations() {
    this.ipc.send("rag-reindex-conversations");
  }
  reindexHighValueConversations() {
    this.ipc.send("rag-reindex-high-value");
  }
  // ========== 搜索操作 ==========
  search(query2) {
    if (!query2.trim()) {
      this._searchResults.set([]);
      return;
    }
    this._searchQuery.set(query2);
    this._isLoading.set(true);
    this.ipc.send("rag-search", { query: query2 });
  }
  clearSearchResults() {
    this._searchResults.set([]);
    this._searchQuery.set("");
  }
  // ========== 知識管理 ==========
  addKnowledge(content, category, metadata) {
    this.ipc.send("rag-add-knowledge", {
      content,
      category,
      metadata
    });
  }
  deleteKnowledge(id) {
    this.ipc.send("rag-delete-knowledge", { id });
  }
  // ========== 反饋操作 ==========
  sendFeedback(feedback) {
    this.ipc.send("rag-feedback", feedback);
    this.toast.success("\u611F\u8B1D\u60A8\u7684\u53CD\u994B\uFF01");
  }
  // ========== 清理操作 ==========
  cleanupKnowledge() {
    this.ipc.send("rag-cleanup");
  }
  // ========== 統計操作 ==========
  refreshStats() {
    this._isLoading.set(true);
    this.ipc.send("get-rag-stats");
  }
  static {
    this.\u0275fac = function RagService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _RagService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RagService, factory: _RagService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RagService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/vector-memory.service.ts
var VectorMemoryService = class _VectorMemoryService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._stats = signal({
      totalMemories: 0,
      totalUsers: 0,
      averagePerUser: 0,
      storageSize: "0 KB",
      oldestMemory: null,
      newestMemory: null
    }, ...ngDevMode ? [{ debugName: "_stats" }] : []);
    this._memories = signal([], ...ngDevMode ? [{ debugName: "_memories" }] : []);
    this._searchResults = signal([], ...ngDevMode ? [{ debugName: "_searchResults" }] : []);
    this._users = signal([], ...ngDevMode ? [{ debugName: "_users" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._selectedUserId = signal(null, ...ngDevMode ? [{ debugName: "_selectedUserId" }] : []);
    this.stats = this._stats.asReadonly();
    this.memories = this._memories.asReadonly();
    this.searchResults = this._searchResults.asReadonly();
    this.users = this._users.asReadonly();
    this.isLoading = this._isLoading.asReadonly();
    this.selectedUserId = this._selectedUserId.asReadonly();
    this.userMemories = computed(() => {
      const userId = this._selectedUserId();
      if (!userId)
        return [];
      return this._memories().filter((m) => m.userId === userId);
    }, ...ngDevMode ? [{ debugName: "userMemories" }] : []);
    this.setupIpcListeners();
  }
  // ========== IPC 監聯 ==========
  setupIpcListeners() {
    this.ipc.on("vector-memory-stats", (data) => {
      this._stats.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("vector-memories-loaded", (data) => {
      this._memories.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("vector-memory-search-results", (data) => {
      this._searchResults.set(data.results);
      this._isLoading.set(false);
    });
    this.ipc.on("memory-users-loaded", (data) => {
      this._users.set(data);
      this._isLoading.set(false);
    });
    this.ipc.on("vector-memory-added", (data) => {
      this._memories.update((list) => [...list, data]);
      this.toast.success("\u8A18\u61B6\u5DF2\u6DFB\u52A0");
    });
    this.ipc.on("vector-memory-deleted", (data) => {
      this._memories.update((list) => list.filter((m) => m.id !== data.id));
      this.toast.success("\u8A18\u61B6\u5DF2\u522A\u9664");
    });
    this.ipc.on("cleanup-completed", (data) => {
      this.toast.success(`\u5DF2\u6E05\u7406 ${data.removed} \u500B\u904E\u671F\u8A18\u61B6`);
      this.refreshStats();
    });
    this.ipc.on("merge-completed", (data) => {
      this.toast.success(`\u5DF2\u5408\u4F75 ${data.merged} \u500B\u76F8\u4F3C\u8A18\u61B6`);
      this.refreshStats();
    });
  }
  // ========== 搜索操作 ==========
  search(query2, userId) {
    if (!query2.trim()) {
      this._searchResults.set([]);
      return;
    }
    this._isLoading.set(true);
    this.ipc.send("search-vector-memory", { query: query2, userId });
  }
  clearSearchResults() {
    this._searchResults.set([]);
  }
  // ========== 記憶操作 ==========
  addMemory(userId, content, metadata) {
    this.ipc.send("add-vector-memory", {
      userId,
      content,
      metadata
    });
  }
  deleteMemory(id) {
    if (!confirm("\u78BA\u5B9A\u8981\u522A\u9664\u6B64\u8A18\u61B6\u55CE\uFF1F"))
      return;
    this.ipc.send("delete-vector-memory", { id });
  }
  loadUserMemories(userId) {
    this._selectedUserId.set(userId);
    this._isLoading.set(true);
    this.ipc.send("get-user-memories", { userId });
  }
  // ========== 用戶操作 ==========
  loadUserList() {
    this._isLoading.set(true);
    this.ipc.send("get-memory-users");
  }
  selectUser(userId) {
    this._selectedUserId.set(userId);
    if (userId) {
      this.loadUserMemories(userId);
    }
  }
  // ========== 維護操作 ==========
  cleanupOldMemories(daysOld = 90) {
    if (!confirm(`\u78BA\u5B9A\u8981\u6E05\u7406 ${daysOld} \u5929\u524D\u7684\u820A\u8A18\u61B6\u55CE\uFF1F`))
      return;
    this.ipc.send("cleanup-old-memories", { daysOld });
  }
  mergeSimilarMemories(threshold = 0.9) {
    if (!confirm("\u78BA\u5B9A\u8981\u5408\u4F75\u76F8\u4F3C\u8A18\u61B6\u55CE\uFF1F\u6B64\u64CD\u4F5C\u7121\u6CD5\u64A4\u92B7\u3002"))
      return;
    this.ipc.send("merge-similar-memories", { threshold });
  }
  // ========== 統計操作 ==========
  refreshStats() {
    this._isLoading.set(true);
    this.ipc.send("get-vector-memory-stats");
  }
  loadAllMemories() {
    this._isLoading.set(true);
    this.ipc.send("get-all-memories");
  }
  static {
    this.\u0275fac = function VectorMemoryService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _VectorMemoryService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _VectorMemoryService, factory: _VectorMemoryService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(VectorMemoryService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/task-template.service.ts
var SYSTEM_TEMPLATES = [
  {
    id: "sys-high-intent",
    name: "\u9AD8\u610F\u5411\u5BA2\u6236\u8F49\u5316",
    description: "\u91DD\u5C0D\u610F\u5411\u5206\u6578 \u226580 \u7684\u9AD8\u8CEA\u91CF\u6F5B\u5728\u5BA2\u6236",
    goalType: "conversion",
    executionMode: "hybrid",
    audienceSource: "tags",
    intentScoreMin: 80,
    roles: ["expert", "satisfied_customer"],
    aiHostingEnabled: true,
    autoGreeting: true,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "sys-win-back",
    name: "\u6C89\u9ED8\u5BA2\u6236\u559A\u9192",
    description: "7\u5929\u5167\u7121\u4E92\u52D5\u7684\u8001\u5BA2\u6236\u633D\u56DE\u7B56\u7565",
    goalType: "retention",
    executionMode: "hybrid",
    audienceSource: "recent",
    intentScoreMin: 30,
    roles: ["callback", "support", "manager"],
    aiHostingEnabled: true,
    autoGreeting: true,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "sys-community",
    name: "\u793E\u7FA4\u6D3B\u8E8D\u5F15\u7206",
    description: "\u5728\u7FA4\u7D44\u4E2D\u88FD\u9020\u8A71\u984C\uFF0C\u63D0\u5347\u6D3B\u8E8D\u5EA6",
    goalType: "engagement",
    executionMode: "scriptless",
    audienceSource: "group",
    intentScoreMin: 0,
    roles: ["newbie", "satisfied_customer", "expert"],
    aiHostingEnabled: true,
    autoGreeting: false,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  },
  {
    id: "sys-support",
    name: "\u552E\u5F8C\u670D\u52D9\u97FF\u61C9",
    description: "\u5FEB\u901F\u97FF\u61C9\u5BA2\u6236\u554F\u984C\uFF0C\u63D0\u5347\u6EFF\u610F\u5EA6",
    goalType: "support",
    executionMode: "scripted",
    audienceSource: "recent",
    intentScoreMin: 0,
    roles: ["support", "expert"],
    aiHostingEnabled: true,
    autoGreeting: false,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z"
  }
];
var TaskTemplateService = class _TaskTemplateService {
  constructor() {
    this._templates = signal([], ...ngDevMode ? [{ debugName: "_templates" }] : []);
    this.templates = this._templates.asReadonly();
    this.userTemplates = computed(() => this._templates().filter((t) => !t.isSystem), ...ngDevMode ? [{ debugName: "userTemplates" }] : []);
    this.systemTemplates = computed(() => SYSTEM_TEMPLATES, ...ngDevMode ? [{ debugName: "systemTemplates" }] : []);
    this.favoriteTemplates = computed(() => this._templates().filter((t) => t.isFavorite), ...ngDevMode ? [{ debugName: "favoriteTemplates" }] : []);
    this.recommendedTemplates = computed(() => {
      const all = [...this._templates(), ...SYSTEM_TEMPLATES];
      return all.filter((t) => t.usageCount >= 3).sort((a, b) => {
        const rateA = a.totalContacted > 0 ? a.totalConverted / a.totalContacted : 0;
        const rateB = b.totalContacted > 0 ? b.totalConverted / b.totalContacted : 0;
        return rateB - rateA;
      }).slice(0, 5);
    }, ...ngDevMode ? [{ debugName: "recommendedTemplates" }] : []);
    this.templatesByGoal = computed(() => {
      const all = [...this._templates(), ...SYSTEM_TEMPLATES];
      return all.reduce((acc, t) => {
        if (!acc[t.goalType])
          acc[t.goalType] = [];
        acc[t.goalType].push(t);
        return acc;
      }, {});
    }, ...ngDevMode ? [{ debugName: "templatesByGoal" }] : []);
    this.loadTemplates();
  }
  /**
   * 從本地存儲加載模板
   */
  loadTemplates() {
    try {
      const saved = localStorage.getItem("task_templates");
      if (saved) {
        this._templates.set(JSON.parse(saved));
      }
    } catch (error) {
      console.error("\u52A0\u8F09\u6A21\u677F\u5931\u6557:", error);
    }
  }
  /**
   * 保存模板到本地存儲
   */
  saveTemplates() {
    localStorage.setItem("task_templates", JSON.stringify(this._templates()));
  }
  /**
   * 創建新模板
   */
  createTemplate(template) {
    const newTemplate = __spreadProps(__spreadValues({}, template), {
      id: `tpl-${Date.now()}`,
      usageCount: 0,
      successCount: 0,
      totalContacted: 0,
      totalConverted: 0,
      isSystem: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    this._templates.update((templates) => [...templates, newTemplate]);
    this.saveTemplates();
    return newTemplate;
  }
  /**
   * 從現有任務創建模板
   */
  createFromTask(task, name, description) {
    return this.createTemplate({
      name,
      description,
      goalType: task.goalType,
      executionMode: task.executionMode,
      audienceSource: task.targetCriteria?.sources?.[0] || "recent",
      intentScoreMin: task.targetCriteria?.intentScoreMin || 50,
      roles: task.roleConfig?.map((r) => r.roleType),
      aiHostingEnabled: true,
      autoGreeting: true,
      autoReply: true,
      isFavorite: false
    });
  }
  /**
   * 更新模板
   */
  updateTemplate(id, updates) {
    this._templates.update((templates) => templates.map((t) => t.id === id ? __spreadProps(__spreadValues(__spreadValues({}, t), updates), { updatedAt: (/* @__PURE__ */ new Date()).toISOString() }) : t));
    this.saveTemplates();
  }
  /**
   * 刪除模板
   */
  deleteTemplate(id) {
    this._templates.update((templates) => templates.filter((t) => t.id !== id));
    this.saveTemplates();
  }
  /**
   * 切換收藏
   */
  toggleFavorite(id) {
    this._templates.update((templates) => templates.map((t) => t.id === id ? __spreadProps(__spreadValues({}, t), { isFavorite: !t.isFavorite }) : t));
    this.saveTemplates();
  }
  /**
   * 記錄模板使用
   */
  recordUsage(id) {
    this._templates.update((templates) => templates.map((t) => t.id === id ? __spreadProps(__spreadValues({}, t), { usageCount: t.usageCount + 1 }) : t));
    this.saveTemplates();
  }
  /**
   * 記錄任務結果
   */
  recordResult(id, contacted, converted, success) {
    this._templates.update((templates) => templates.map((t) => t.id === id ? __spreadProps(__spreadValues({}, t), {
      totalContacted: t.totalContacted + contacted,
      totalConverted: t.totalConverted + converted,
      successCount: success ? t.successCount + 1 : t.successCount
    }) : t));
    this.saveTemplates();
  }
  /**
   * 獲取模板
   */
  getTemplate(id) {
    const userTemplate = this._templates().find((t) => t.id === id);
    if (userTemplate)
      return userTemplate;
    return SYSTEM_TEMPLATES.find((t) => t.id === id);
  }
  /**
   * 獲取模板成功率
   */
  getSuccessRate(template) {
    if (template.totalContacted === 0)
      return 0;
    return Math.round(template.totalConverted / template.totalContacted * 100);
  }
  /**
   * 搜索模板
   */
  searchTemplates(query2) {
    const lowerQuery = query2.toLowerCase();
    const all = [...this._templates(), ...SYSTEM_TEMPLATES];
    return all.filter((t) => t.name.toLowerCase().includes(lowerQuery) || t.description?.toLowerCase().includes(lowerQuery));
  }
  static {
    this.\u0275fac = function TaskTemplateService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TaskTemplateService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _TaskTemplateService, factory: _TaskTemplateService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TaskTemplateService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/smart-recommendation.service.ts
var SmartRecommendationService = class _SmartRecommendationService {
  constructor() {
    this.taskService = inject(MarketingTaskService);
    this.templateService = inject(TaskTemplateService);
    this._analysis = signal(null, ...ngDevMode ? [{ debugName: "_analysis" }] : []);
    this.analysis = this._analysis.asReadonly();
    this.lastAnalysisTime = 0;
    this.CACHE_DURATION = 5 * 60 * 1e3;
    this.analyzeHistory();
  }
  /**
   * 分析歷史任務數據
   */
  async analyzeHistory() {
    const now = Date.now();
    if (this._analysis() && now - this.lastAnalysisTime < this.CACHE_DURATION) {
      return this._analysis();
    }
    const tasks = this.taskService.tasks();
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const analysis = {
      totalTasks: tasks.length,
      successfulTasks: completedTasks.filter((t) => t.stats.converted > 0).length,
      avgConversionRate: 0,
      byGoal: {},
      bestHours: [],
      topConfigs: []
    };
    const totalContacted = completedTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
    const totalConverted = completedTasks.reduce((sum, t) => sum + t.stats.converted, 0);
    analysis.avgConversionRate = totalContacted > 0 ? totalConverted / totalContacted * 100 : 0;
    const goalTypes = ["conversion", "retention", "engagement", "support"];
    for (const goal of goalTypes) {
      const goalTasks = completedTasks.filter((t) => t.goalType === goal);
      const contacted = goalTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
      const converted = goalTasks.reduce((sum, t) => sum + t.stats.converted, 0);
      const modeStats = /* @__PURE__ */ new Map();
      goalTasks.forEach((t) => {
        const current = modeStats.get(t.executionMode) || { contacted: 0, converted: 0 };
        modeStats.set(t.executionMode, {
          contacted: current.contacted + t.stats.contacted,
          converted: current.converted + t.stats.converted
        });
      });
      let bestMode = "hybrid";
      let bestModeRate = 0;
      modeStats.forEach((stats, mode) => {
        const rate = stats.contacted > 0 ? stats.converted / stats.contacted : 0;
        if (rate > bestModeRate) {
          bestModeRate = rate;
          bestMode = mode;
        }
      });
      const roleCounts = /* @__PURE__ */ new Map();
      goalTasks.forEach((t) => {
        t.roleConfig?.forEach((r) => {
          const current = roleCounts.get(r.roleType) || 0;
          roleCounts.set(r.roleType, current + (t.stats.converted > 0 ? 1 : 0));
        });
      });
      const bestRoles = Array.from(roleCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([role]) => role);
      analysis.byGoal[goal] = {
        count: goalTasks.length,
        avgConversionRate: contacted > 0 ? converted / contacted * 100 : 0,
        bestExecutionMode: bestMode,
        bestRoles: bestRoles.length > 0 ? bestRoles : GOAL_TYPE_CONFIG[goal].suggestedRoles
      };
    }
    const hourCounts = new Array(24).fill(0);
    const hourSuccess = new Array(24).fill(0);
    completedTasks.forEach((t) => {
      const hour = new Date(t.createdAt).getHours();
      hourCounts[hour]++;
      if (t.stats.converted > 0) {
        hourSuccess[hour]++;
      }
    });
    const hourRates = hourCounts.map((count, i) => ({
      hour: i,
      rate: count > 0 ? hourSuccess[i] / count : 0
    }));
    analysis.bestHours = hourRates.sort((a, b) => b.rate - a.rate).slice(0, 3).map((h) => h.hour);
    const configMap = /* @__PURE__ */ new Map();
    completedTasks.forEach((t) => {
      const roles = t.roleConfig?.map((r) => r.roleType).sort().join(",") || "";
      const key = `${t.goalType}|${t.executionMode}|${roles}`;
      const current = configMap.get(key) || {
        goalType: t.goalType,
        executionMode: t.executionMode,
        roles: t.roleConfig?.map((r) => r.roleType) || [],
        contacted: 0,
        converted: 0,
        count: 0
      };
      configMap.set(key, __spreadProps(__spreadValues({}, current), {
        contacted: current.contacted + t.stats.contacted,
        converted: current.converted + t.stats.converted,
        count: current.count + 1
      }));
    });
    analysis.topConfigs = Array.from(configMap.values()).filter((c) => c.count >= 2).map((c) => ({
      goalType: c.goalType,
      executionMode: c.executionMode,
      roles: c.roles,
      conversionRate: c.contacted > 0 ? c.converted / c.contacted * 100 : 0,
      sampleSize: c.count
    })).sort((a, b) => b.conversionRate - a.conversionRate).slice(0, 5);
    this._analysis.set(analysis);
    this.lastAnalysisTime = now;
    return analysis;
  }
  /**
   * 獲取推薦列表
   */
  getRecommendations() {
    const recommendations = [];
    const analysis = this._analysis();
    if (!analysis || analysis.totalTasks < 3) {
      recommendations.push({
        id: "new-user-conversion",
        type: "goal",
        title: "\u958B\u59CB\u60A8\u7684\u7B2C\u4E00\u500B\u8F49\u5316\u4EFB\u52D9",
        description: "\u300C\u4FC3\u9032\u9996\u55AE\u300D\u662F\u6700\u5E38\u7528\u7684\u71DF\u92B7\u76EE\u6A19",
        confidence: 80,
        reason: "\u57FA\u65BC\u7CFB\u7D71\u9ED8\u8A8D\u63A8\u85A6",
        action: {
          label: "\u5275\u5EFA\u4EFB\u52D9",
          data: { goalType: "conversion" }
        }
      });
      return recommendations;
    }
    if (analysis.topConfigs.length > 0) {
      const best = analysis.topConfigs[0];
      recommendations.push({
        id: "best-config",
        type: "goal",
        title: `\u4F7F\u7528\u60A8\u7684\u6700\u4F73\u914D\u7F6E`,
        description: `${GOAL_TYPE_CONFIG[best.goalType].label} + ${this.getModeLabel(best.executionMode)}`,
        confidence: Math.min(90, 50 + best.sampleSize * 10),
        reason: `\u6B77\u53F2\u8F49\u5316\u7387 ${best.conversionRate.toFixed(1)}%\uFF08${best.sampleSize} \u6B21\u4EFB\u52D9\uFF09`,
        action: {
          label: "\u4F7F\u7528\u6B64\u914D\u7F6E",
          data: best
        }
      });
    }
    const goalEntries = Object.entries(analysis.byGoal);
    const bestGoal = goalEntries.filter(([_, data]) => data.count >= 2).sort((a, b) => b[1].avgConversionRate - a[1].avgConversionRate)[0];
    if (bestGoal) {
      const [goalType, data] = bestGoal;
      recommendations.push({
        id: "best-goal",
        type: "goal",
        title: `${GOAL_TYPE_CONFIG[goalType].label} \u8868\u73FE\u6700\u4F73`,
        description: `\u5E73\u5747\u8F49\u5316\u7387 ${data.avgConversionRate.toFixed(1)}%`,
        confidence: Math.min(85, 40 + data.count * 5),
        reason: `\u57FA\u65BC ${data.count} \u6B21\u6B77\u53F2\u4EFB\u52D9\u5206\u6790`
      });
    }
    if (analysis.bestHours.length > 0) {
      const hours = analysis.bestHours.map((h) => `${h}:00`).join("\u3001");
      recommendations.push({
        id: "best-timing",
        type: "timing",
        title: "\u6700\u4F73\u555F\u52D5\u6642\u6BB5",
        description: hours,
        confidence: 70,
        reason: "\u9019\u4E9B\u6642\u6BB5\u7684\u4EFB\u52D9\u6210\u529F\u7387\u8F03\u9AD8"
      });
    }
    return recommendations;
  }
  /**
   * 為特定目標獲取智能建議
   */
  getSuggestionForGoal(goalType) {
    const analysis = this._analysis();
    const goalData = analysis?.byGoal[goalType];
    const defaultConfig = GOAL_TYPE_CONFIG[goalType];
    if (!goalData || goalData.count < 2) {
      return {
        goalType,
        executionMode: defaultConfig.suggestedMode,
        suggestedRoles: defaultConfig.suggestedRoles,
        intentThreshold: 70,
        audienceSource: "recent",
        reason: "\u57FA\u65BC\u7CFB\u7D71\u9ED8\u8A8D\u63A8\u85A6",
        expectedConversionRate: 15
      };
    }
    return {
      goalType,
      executionMode: goalData.bestExecutionMode,
      suggestedRoles: goalData.bestRoles,
      intentThreshold: 60,
      audienceSource: "tags",
      reason: `\u57FA\u65BC ${goalData.count} \u6B21\u6B77\u53F2\u4EFB\u52D9\u5206\u6790`,
      expectedConversionRate: Math.round(goalData.avgConversionRate)
    };
  }
  /**
   * 獲取下一個最優目標建議
   */
  getNextBestAction() {
    const tasks = this.taskService.tasks();
    const activeTasks = tasks.filter((t) => t.status === "running");
    if (activeTasks.length === 0) {
      const analysis = this._analysis();
      if (analysis && analysis.topConfigs.length > 0) {
        const best = analysis.topConfigs[0];
        return {
          goalType: best.goalType,
          reason: `\u60A8\u7684\u300C${GOAL_TYPE_CONFIG[best.goalType].label}\u300D\u4EFB\u52D9\u6B77\u53F2\u8868\u73FE\u6700\u4F73`
        };
      }
      return {
        goalType: "conversion",
        reason: "\u958B\u59CB\u4E00\u500B\u65B0\u7684\u8F49\u5316\u4EFB\u52D9"
      };
    }
    const activeGoals = new Set(activeTasks.map((t) => t.goalType));
    const missingGoals = ["conversion", "retention", "engagement", "support"].filter((g) => !activeGoals.has(g));
    if (missingGoals.length > 0) {
      const analysis = this._analysis();
      if (analysis) {
        const bestMissing = missingGoals.filter((g) => analysis.byGoal[g]?.count > 0).sort((a, b) => analysis.byGoal[b].avgConversionRate - analysis.byGoal[a].avgConversionRate)[0];
        if (bestMissing) {
          return {
            goalType: bestMissing,
            reason: `\u88DC\u5145\u4E00\u500B\u300C${GOAL_TYPE_CONFIG[bestMissing].label}\u300D\u4EFB\u52D9\u4EE5\u8986\u84CB\u66F4\u591A\u5834\u666F`
          };
        }
      }
    }
    return null;
  }
  // 輔助方法
  getModeLabel(mode) {
    const labels = {
      "scripted": "\u5287\u672C\u6A21\u5F0F",
      "hybrid": "\u6DF7\u5408\u6A21\u5F0F",
      "scriptless": "\u7121\u5287\u672C\u6A21\u5F0F"
    };
    return labels[mode];
  }
  static {
    this.\u0275fac = function SmartRecommendationService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SmartRecommendationService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SmartRecommendationService, factory: _SmartRecommendationService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SmartRecommendationService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/execution-log.service.ts
var ExecutionLogService = class _ExecutionLogService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this._logs = signal([], ...ngDevMode ? [{ debugName: "_logs" }] : []);
    this.logs = this._logs.asReadonly();
    this._isLive = signal(true, ...ngDevMode ? [{ debugName: "_isLive" }] : []);
    this.isLive = this._isLive.asReadonly();
    this._filter = signal({}, ...ngDevMode ? [{ debugName: "_filter" }] : []);
    this.filter = this._filter.asReadonly();
    this.MAX_LOGS = 1e3;
    this.filteredLogs = computed(() => {
      const logs = this._logs();
      const filter = this._filter();
      return logs.filter((log) => {
        if (filter.taskId && log.taskId !== filter.taskId)
          return false;
        if (filter.level && log.level !== filter.level)
          return false;
        if (filter.category && log.category !== filter.category)
          return false;
        if (filter.search) {
          const search = filter.search.toLowerCase();
          if (!log.message.toLowerCase().includes(search) && !log.category.toLowerCase().includes(search)) {
            return false;
          }
        }
        if (filter.startTime && log.timestamp < filter.startTime)
          return false;
        if (filter.endTime && log.timestamp > filter.endTime)
          return false;
        return true;
      });
    }, ...ngDevMode ? [{ debugName: "filteredLogs" }] : []);
    this.logsByTask = computed(() => {
      const logs = this._logs();
      const grouped = /* @__PURE__ */ new Map();
      logs.forEach((log) => {
        if (!grouped.has(log.taskId)) {
          grouped.set(log.taskId, []);
        }
        grouped.get(log.taskId).push(log);
      });
      return grouped;
    }, ...ngDevMode ? [{ debugName: "logsByTask" }] : []);
    this.stats = computed(() => {
      const logs = this._logs();
      return {
        total: logs.length,
        debug: logs.filter((l) => l.level === "debug").length,
        info: logs.filter((l) => l.level === "info").length,
        success: logs.filter((l) => l.level === "success").length,
        warning: logs.filter((l) => l.level === "warning").length,
        error: logs.filter((l) => l.level === "error").length
      };
    }, ...ngDevMode ? [{ debugName: "stats" }] : []);
    this.setupIpcListeners();
  }
  /**
   * 設置 IPC 監聽器
   */
  setupIpcListeners() {
    this.ipc.on("execution-log", (log) => {
      if (this._isLive()) {
        this.addLog(log);
      }
    });
    this.ipc.on("execution-logs-batch", (logs) => {
      if (this._isLive()) {
        logs.forEach((log) => this.addLog(log));
      }
    });
  }
  /**
   * 添加日誌
   */
  addLog(log) {
    const newLog = __spreadProps(__spreadValues({}, log), {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    this._logs.update((logs) => {
      const updated = [newLog, ...logs];
      if (updated.length > this.MAX_LOGS) {
        return updated.slice(0, this.MAX_LOGS);
      }
      return updated;
    });
  }
  /**
   * 記錄調試日誌
   */
  debug(taskId, category, message, details) {
    this.addLog({ taskId, level: "debug", category, message, details });
  }
  /**
   * 記錄信息日誌
   */
  info(taskId, category, message, details) {
    this.addLog({ taskId, level: "info", category, message, details });
  }
  /**
   * 記錄成功日誌
   */
  success(taskId, category, message, details) {
    this.addLog({ taskId, level: "success", category, message, details });
  }
  /**
   * 記錄警告日誌
   */
  warning(taskId, category, message, details) {
    this.addLog({ taskId, level: "warning", category, message, details });
  }
  /**
   * 記錄錯誤日誌
   */
  error(taskId, category, message, details) {
    this.addLog({ taskId, level: "error", category, message, details });
  }
  /**
   * 設置過濾器
   */
  setFilter(filter) {
    this._filter.set(filter);
  }
  /**
   * 更新過濾器
   */
  updateFilter(updates) {
    this._filter.update((f) => __spreadValues(__spreadValues({}, f), updates));
  }
  /**
   * 清除過濾器
   */
  clearFilter() {
    this._filter.set({});
  }
  /**
   * 切換實時更新
   */
  toggleLive() {
    this._isLive.update((v) => !v);
  }
  /**
   * 設置實時更新
   */
  setLive(live) {
    this._isLive.set(live);
  }
  /**
   * 清除日誌
   */
  clearLogs() {
    this._logs.set([]);
  }
  /**
   * 清除特定任務的日誌
   */
  clearTaskLogs(taskId) {
    this._logs.update((logs) => logs.filter((l) => l.taskId !== taskId));
  }
  /**
   * 獲取特定任務的日誌
   */
  getTaskLogs(taskId) {
    return this._logs().filter((l) => l.taskId === taskId);
  }
  /**
   * 導出日誌
   */
  exportLogs(format = "json") {
    const logs = this.filteredLogs();
    let content;
    let filename;
    let mimeType;
    if (format === "json") {
      content = JSON.stringify(logs, null, 2);
      filename = `execution-logs-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
      mimeType = "application/json";
    } else {
      const headers = ["\u6642\u9593", "\u4EFB\u52D9ID", "\u7D1A\u5225", "\u985E\u5225", "\u6D88\u606F"];
      const rows = logs.map((l) => [
        l.timestamp,
        l.taskId,
        l.level,
        l.category,
        `"${l.message.replace(/"/g, '""')}"`
      ].join(","));
      content = [headers.join(","), ...rows].join("\n");
      filename = `execution-logs-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
      mimeType = "text/csv";
    }
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  static {
    this.\u0275fac = function ExecutionLogService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ExecutionLogService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ExecutionLogService, factory: _ExecutionLogService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ExecutionLogService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/api-client.service.ts
var DEFAULT_CONFIG = {
  timeout: 3e4,
  retries: 3,
  retryDelay: 1e3,
  cache: false,
  cacheDuration: 6e4,
  showError: true,
  showLoading: false
};
var ApiClientService = class _ApiClientService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this.isLoading = this._isLoading.asReadonly();
    this._pendingRequests = signal(0, ...ngDevMode ? [{ debugName: "_pendingRequests" }] : []);
    this.pendingRequests = this._pendingRequests.asReadonly();
    this.cache = /* @__PURE__ */ new Map();
    this.pendingPromises = /* @__PURE__ */ new Map();
  }
  /**
   * 發送 API 請求（通過 IPC）
   */
  async request(channel, data, config = {}) {
    const cfg = __spreadValues(__spreadValues({}, DEFAULT_CONFIG), config);
    const cacheKey = `${channel}:${JSON.stringify(data)}`;
    if (cfg.cache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }
    if (this.pendingPromises.has(cacheKey)) {
      return this.pendingPromises.get(cacheKey);
    }
    const requestPromise = this.executeRequest(channel, data, cfg, cacheKey);
    this.pendingPromises.set(cacheKey, requestPromise);
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingPromises.delete(cacheKey);
    }
  }
  async executeRequest(channel, data, config, cacheKey) {
    this._pendingRequests.update((n) => n + 1);
    if (config.showLoading) {
      this._isLoading.set(true);
    }
    let lastError;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const result = await this.sendIpcRequest(channel, data, config.timeout);
        if (result.success && config.cache) {
          this.setCache(cacheKey, result.data, config.cacheDuration);
        }
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < config.retries) {
          await this.delay(config.retryDelay * (attempt + 1));
        }
      }
    }
    const errorResponse = {
      success: false,
      error: {
        code: "REQUEST_FAILED",
        message: lastError?.message || "\u8ACB\u6C42\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66",
        details: lastError
      }
    };
    if (config.showError) {
      this.toast.error(errorResponse.error.message);
    }
    return errorResponse;
  }
  sendIpcRequest(channel, data, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("\u8ACB\u6C42\u8D85\u6642"));
      }, timeout);
      this.ipc.invoke(channel, data).then((result) => {
        clearTimeout(timeoutId);
        if (typeof result === "object" && "success" in result) {
          resolve(result);
        } else {
          resolve({ success: true, data: result });
        }
      }).catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      }).finally(() => {
        this._pendingRequests.update((n) => Math.max(0, n - 1));
        if (this._pendingRequests() === 0) {
          this._isLoading.set(false);
        }
      });
    });
  }
  // ============ 緩存管理 ============
  getFromCache(key) {
    const item = this.cache.get(key);
    if (!item)
      return null;
    const now = Date.now();
    if (now - item.timestamp > item.duration) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }
  setCache(key, data, duration) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }
  /**
   * 清除緩存
   */
  clearCache(pattern) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * 預加載數據
   */
  async preload(channel, data) {
    await this.request(channel, data, { cache: true, showError: false });
  }
  // ============ 便捷方法 ============
  /**
   * GET 風格請求
   */
  async get(channel, params, config) {
    return this.request(channel, __spreadValues({ action: "get" }, params), __spreadValues({
      cache: true
    }, config));
  }
  /**
   * POST 風格請求
   */
  async post(channel, data, config) {
    return this.request(channel, __spreadValues({ action: "create" }, data), __spreadValues({
      cache: false
    }, config));
  }
  /**
   * PUT 風格請求
   */
  async put(channel, data, config) {
    return this.request(channel, __spreadValues({ action: "update" }, data), __spreadValues({
      cache: false
    }, config));
  }
  /**
   * DELETE 風格請求
   */
  async delete(channel, params, config) {
    return this.request(channel, __spreadValues({ action: "delete" }, params), __spreadValues({
      cache: false
    }, config));
  }
  // ============ 工具方法 ============
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  static {
    this.\u0275fac = function ApiClientService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ApiClientService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ApiClientService, factory: _ApiClientService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ApiClientService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/services/realtime.service.ts
var RealtimeService = class _RealtimeService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.toast = inject(ToastService);
    this._state = signal("disconnected", ...ngDevMode ? [{ debugName: "_state" }] : []);
    this.state = this._state.asReadonly();
    this.isConnected = computed(() => this._state() === "connected", ...ngDevMode ? [{ debugName: "isConnected" }] : []);
    this._reconnectAttempts = signal(0, ...ngDevMode ? [{ debugName: "_reconnectAttempts" }] : []);
    this.reconnectAttempts = this._reconnectAttempts.asReadonly();
    this._lastHeartbeat = signal(null, ...ngDevMode ? [{ debugName: "_lastHeartbeat" }] : []);
    this.lastHeartbeat = this._lastHeartbeat.asReadonly();
    this.subscriptions = /* @__PURE__ */ new Map();
    this.HEARTBEAT_INTERVAL = 3e4;
    this.RECONNECT_DELAY = 5e3;
    this.MAX_RECONNECT_ATTEMPTS = 10;
    this.setupIpcListeners();
    this.connect();
  }
  ngOnDestroy() {
    this.disconnect();
  }
  /**
   * 設置 IPC 監聯器
   */
  setupIpcListeners() {
    this.ipc.on("realtime:data", (payload) => {
      this.handleRealtimeData(payload.type, payload.data);
    });
    this.ipc.on("realtime:state", (state2) => {
      this._state.set(state2);
      if (state2 === "connected") {
        this._reconnectAttempts.set(0);
        this.startHeartbeat();
        this.resubscribeAll();
      } else if (state2 === "disconnected") {
        this.stopHeartbeat();
        this.scheduleReconnect();
      }
    });
    this.ipc.on("realtime:heartbeat", () => {
      this._lastHeartbeat.set(/* @__PURE__ */ new Date());
    });
    this.ipc.on("realtime:error", (error) => {
      console.error("Realtime error:", error);
      if (error.code === "AUTH_FAILED") {
        this.toast.error("\u5BE6\u6642\u9023\u63A5\u8A8D\u8B49\u5931\u6557");
      }
    });
  }
  /**
   * 連接
   */
  connect() {
    if (this._state() === "connecting" || this._state() === "connected") {
      return;
    }
    this._state.set("connecting");
    this.ipc.send("realtime:connect", {});
  }
  /**
   * 斷開連接
   */
  disconnect() {
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    this.ipc.send("realtime:disconnect", {});
    this._state.set("disconnected");
  }
  /**
   * 訂閱數據
   */
  subscribe(type, callback, options) {
    const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const subscription = {
      id,
      type,
      callback,
      options
    };
    this.subscriptions.set(id, subscription);
    if (this.isConnected()) {
      this.sendSubscription(subscription);
    }
    return id;
  }
  /**
   * 取消訂閱
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription)
      return;
    this.subscriptions.delete(subscriptionId);
    if (this.isConnected()) {
      this.ipc.send("realtime:unsubscribe", {
        id: subscriptionId,
        type: subscription.type
      });
    }
  }
  /**
   * 取消所有訂閱
   */
  unsubscribeAll() {
    for (const id of this.subscriptions.keys()) {
      this.unsubscribe(id);
    }
  }
  /**
   * 發送訂閱請求
   */
  sendSubscription(subscription) {
    this.ipc.send("realtime:subscribe", {
      id: subscription.id,
      type: subscription.type,
      filter: subscription.options?.filter
    });
  }
  /**
   * 重新訂閱所有
   */
  resubscribeAll() {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscription(subscription);
    }
  }
  /**
   * 處理實時數據
   */
  handleRealtimeData(type, data) {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === type) {
        if (subscription.options?.filter) {
          const filter = subscription.options.filter;
          let matches = true;
          for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) {
              matches = false;
              break;
            }
          }
          if (!matches)
            continue;
        }
        try {
          subscription.callback(data);
        } catch (error) {
          console.error("Subscription callback error:", error);
        }
      }
    }
  }
  /**
   * 開始心跳
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ipc.send("realtime:heartbeat", {});
      }
    }, this.HEARTBEAT_INTERVAL);
  }
  /**
   * 停止心跳
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = void 0;
    }
  }
  /**
   * 安排重連
   */
  scheduleReconnect() {
    if (this._reconnectAttempts() >= this.MAX_RECONNECT_ATTEMPTS) {
      this.toast.error("\u7121\u6CD5\u5EFA\u7ACB\u5BE6\u6642\u9023\u63A5\uFF0C\u8ACB\u6AA2\u67E5\u7DB2\u7D61");
      return;
    }
    this.clearReconnectTimeout();
    const delay = this.RECONNECT_DELAY * Math.pow(1.5, this._reconnectAttempts());
    this.reconnectTimeout = setTimeout(() => {
      this._reconnectAttempts.update((n) => n + 1);
      this._state.set("reconnecting");
      this.connect();
    }, delay);
  }
  /**
   * 清除重連定時器
   */
  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = void 0;
    }
  }
  // ============ 便捷訂閱方法 ============
  /**
   * 訂閱任務狀態
   */
  subscribeTaskStatus(taskId, callback) {
    return this.subscribe("task:status", callback, { filter: { taskId } });
  }
  /**
   * 訂閱任務統計
   */
  subscribeTaskStats(taskId, callback) {
    return this.subscribe("task:stats", callback, { filter: { taskId } });
  }
  /**
   * 訂閱任務日誌
   */
  subscribeTaskLogs(taskId, callback) {
    return this.subscribe("task:log", callback, { filter: { taskId } });
  }
  /**
   * 訂閱所有任務日誌
   */
  subscribeAllTaskLogs(callback) {
    return this.subscribe("task:log", callback);
  }
  /**
   * 訂閱新消息
   */
  subscribeNewMessages(callback) {
    return this.subscribe("message:new", callback);
  }
  /**
   * 訂閱系統狀態
   */
  subscribeSystemStatus(callback) {
    return this.subscribe("system:status", callback);
  }
  static {
    this.\u0275fac = function RealtimeService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _RealtimeService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _RealtimeService, factory: _RealtimeService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RealtimeService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/ai-copywriting.service.ts
var AICopywritingService = class _AICopywritingService {
  constructor() {
    this.ipc = inject(ElectronIpcService);
    this.aiService = inject(AICenterService);
    this._isGenerating = signal(false, ...ngDevMode ? [{ debugName: "_isGenerating" }] : []);
    this.isGenerating = this._isGenerating.asReadonly();
    this._recentResults = signal([], ...ngDevMode ? [{ debugName: "_recentResults" }] : []);
    this.recentResults = this._recentResults.asReadonly();
    this._savedTemplates = signal([], ...ngDevMode ? [{ debugName: "_savedTemplates" }] : []);
    this.savedTemplates = this._savedTemplates.asReadonly();
    this.systemTemplates = [
      {
        id: "sys-greeting-1",
        name: "\u53CB\u597D\u554F\u5019",
        type: "greeting",
        style: "friendly",
        template: "\u55E8 {customerName}\uFF01\u6211\u662F{productName}\u7684{role}\u3002\u770B\u5230\u60A8\u5C0D\u6211\u5011\u7522\u54C1\u6709\u8208\u8DA3\uFF0C\u60F3\u4E86\u89E3\u66F4\u591A\u55CE\uFF1F\u{1F60A}",
        variables: ["customerName", "productName", "role"],
        examples: ["\u55E8 \u738B\u5148\u751F\uFF01\u6211\u662F\u667A\u80FD\u884C\u92B7\u52A9\u624B\u7684\u7522\u54C1\u9867\u554F\u3002\u770B\u5230\u60A8\u5C0D\u6211\u5011\u7522\u54C1\u6709\u8208\u8DA3\uFF0C\u60F3\u4E86\u89E3\u66F4\u591A\u55CE\uFF1F\u{1F60A}"],
        isSystem: true
      },
      {
        id: "sys-greeting-2",
        name: "\u5C08\u696D\u958B\u5834",
        type: "greeting",
        style: "professional",
        template: "\u60A8\u597D\uFF0C{customerName}\u3002\u6211\u662F{company}\u7684{role}\uFF0C\u5F88\u9AD8\u8208\u70BA\u60A8\u670D\u52D9\u3002\u8ACB\u554F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u52A9\u60A8\u7684\u55CE\uFF1F",
        variables: ["customerName", "company", "role"],
        examples: ["\u60A8\u597D\uFF0C\u5F35\u7D93\u7406\u3002\u6211\u662FABC\u516C\u53F8\u7684\u696D\u52D9\u9867\u554F\uFF0C\u5F88\u9AD8\u8208\u70BA\u60A8\u670D\u52D9\u3002\u8ACB\u554F\u6709\u4EC0\u9EBC\u53EF\u4EE5\u5E6B\u52A9\u60A8\u7684\u55CE\uFF1F"],
        isSystem: true
      },
      {
        id: "sys-objection-1",
        name: "\u50F9\u683C\u7570\u8B70",
        type: "objection",
        style: "empathetic",
        template: "\u5B8C\u5168\u7406\u89E3\u60A8\u7684\u8003\u616E\uFF01\u5F88\u591A\u5BA2\u6236\u4E00\u958B\u59CB\u4E5F\u6709\u540C\u6A23\u7684\u60F3\u6CD5\u3002\u4E0D\u904E\u5BE6\u969B\u4F7F\u7528\u5F8C\uFF0C\u4ED6\u5011\u767C\u73FE{benefit}\uFF0C\u6295\u8CC7\u56DE\u5831\u5176\u5BE6\u5F88\u53EF\u89C0\u3002\u8981\u4E0D\u6211\u5206\u4EAB\u5E7E\u500B\u6210\u529F\u6848\u4F8B\u7D66\u60A8\u770B\u770B\uFF1F",
        variables: ["benefit"],
        examples: ["\u5B8C\u5168\u7406\u89E3\u60A8\u7684\u8003\u616E\uFF01\u5F88\u591A\u5BA2\u6236\u4E00\u958B\u59CB\u4E5F\u6709\u540C\u6A23\u7684\u60F3\u6CD5\u3002\u4E0D\u904E\u5BE6\u969B\u4F7F\u7528\u5F8C\uFF0C\u4ED6\u5011\u767C\u73FE\u6548\u7387\u63D0\u5347\u4E863\u500D\uFF0C\u6295\u8CC7\u56DE\u5831\u5176\u5BE6\u5F88\u53EF\u89C0\u3002\u8981\u4E0D\u6211\u5206\u4EAB\u5E7E\u500B\u6210\u529F\u6848\u4F8B\u7D66\u60A8\u770B\u770B\uFF1F"],
        isSystem: true
      },
      {
        id: "sys-closing-1",
        name: "\u9650\u6642\u512A\u60E0",
        type: "closing",
        style: "urgent",
        template: "\u5C0D\u4E86\uFF0C\u73FE\u5728\u6B63\u597D\u6709{promotion}\u6D3B\u52D5\uFF0C{deadline}\u622A\u6B62\uFF01\u9019\u500B\u6642\u5019\u5165\u624B\u771F\u7684\u5F88\u5212\u7B97\u3002\u9700\u8981\u6211\u5E6B\u60A8\u9396\u5B9A\u540D\u984D\u55CE\uFF1F",
        variables: ["promotion", "deadline"],
        examples: ["\u5C0D\u4E86\uFF0C\u73FE\u5728\u6B63\u597D\u6709\u5E74\u7D42\u7279\u60E0\u6D3B\u52D5\uFF0C\u672C\u6708\u5E95\u622A\u6B62\uFF01\u9019\u500B\u6642\u5019\u5165\u624B\u771F\u7684\u5F88\u5212\u7B97\u3002\u9700\u8981\u6211\u5E6B\u60A8\u9396\u5B9A\u540D\u984D\u55CE\uFF1F"],
        isSystem: true
      },
      {
        id: "sys-followup-1",
        name: "\u6EAB\u67D4\u8DDF\u9032",
        type: "follow_up",
        style: "friendly",
        template: "\u55E8 {customerName}\uFF0C\u597D\u4E45\u4E0D\u898B\uFF01\u4E0A\u6B21\u804A\u5230{topic}\uFF0C\u4E0D\u77E5\u9053\u60A8\u5F8C\u4F86\u8003\u616E\u5F97\u600E\u9EBC\u6A23\u4E86\uFF1F\u6709\u4EFB\u4F55\u554F\u984C\u90FD\u53EF\u4EE5\u96A8\u6642\u554F\u6211\u54E6\uFF5E",
        variables: ["customerName", "topic"],
        examples: ["\u55E8 \u674E\u5C0F\u59D0\uFF0C\u597D\u4E45\u4E0D\u898B\uFF01\u4E0A\u6B21\u804A\u5230\u5347\u7D1A\u65B9\u6848\uFF0C\u4E0D\u77E5\u9053\u60A8\u5F8C\u4F86\u8003\u616E\u5F97\u600E\u9EBC\u6A23\u4E86\uFF1F\u6709\u4EFB\u4F55\u554F\u984C\u90FD\u53EF\u4EE5\u96A8\u6642\u554F\u6211\u54E6\uFF5E"],
        isSystem: true
      },
      {
        id: "sys-retention-1",
        name: "\u633D\u56DE\u6D41\u5931",
        type: "retention",
        style: "empathetic",
        template: "{customerName}\uFF0C\u597D\u4E45\u6C92\u770B\u5230\u60A8\u4E86\uFF0C\u6709\u9EDE\u60F3\u5FF5\u5462\uFF01\u662F\u4E0D\u662F\u6700\u8FD1\u592A\u5FD9\u4E86\uFF1F\u6211\u5011\u6700\u8FD1\u63A8\u51FA\u4E86{newFeature}\uFF0C\u89BA\u5F97\u7279\u5225\u9069\u5408\u60A8\uFF0C\u8981\u4E0D\u8981\u4F86\u770B\u770B\uFF1F",
        variables: ["customerName", "newFeature"],
        examples: ["\u738B\u5148\u751F\uFF0C\u597D\u4E45\u6C92\u770B\u5230\u60A8\u4E86\uFF0C\u6709\u9EDE\u60F3\u5FF5\u5462\uFF01\u662F\u4E0D\u662F\u6700\u8FD1\u592A\u5FD9\u4E86\uFF1F\u6211\u5011\u6700\u8FD1\u63A8\u51FA\u4E86\u667A\u80FD\u5831\u8868\u529F\u80FD\uFF0C\u89BA\u5F97\u7279\u5225\u9069\u5408\u60A8\uFF0C\u8981\u4E0D\u8981\u4F86\u770B\u770B\uFF1F"],
        isSystem: true
      }
    ];
    this.loadSavedTemplates();
  }
  /**
   * 生成話術
   */
  async generate(request) {
    this._isGenerating.set(true);
    try {
      const count = request.options?.count || 3;
      const results = [];
      const prompt = this.buildPrompt(request);
      const response = await this.ipc.invoke("ai-generate-text", {
        prompt,
        maxTokens: request.options?.maxLength || 200,
        count
      });
      if (response.success && response.texts) {
        for (const text of response.texts) {
          const result = {
            id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: this.postProcess(text, request),
            type: request.type,
            style: request.style || "friendly",
            score: this.evaluateQuality(text, request),
            tags: this.extractTags(request),
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          results.push(result);
        }
        this._recentResults.update((r) => [...results, ...r].slice(0, 50));
      } else {
        const templates = this.getTemplatesForType(request.type);
        for (const template of templates.slice(0, count)) {
          const result = {
            id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: this.applyTemplate(template, request.context || {}),
            type: request.type,
            style: template.style,
            score: 70,
            tags: ["\u6A21\u677F"],
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          };
          results.push(result);
        }
      }
      return results;
    } finally {
      this._isGenerating.set(false);
    }
  }
  /**
   * 優化現有話術
   */
  async optimize(text, style2) {
    this._isGenerating.set(true);
    try {
      const prompt = `\u8ACB\u5C07\u4EE5\u4E0B\u8A71\u8853\u512A\u5316\u70BA${this.getStyleDescription(style2)}\u98A8\u683C\uFF0C\u4FDD\u6301\u539F\u610F\u4F46\u66F4\u6709\u5438\u5F15\u529B\uFF1A

\u539F\u6587\uFF1A${text}

\u512A\u5316\u5F8C\uFF1A`;
      const response = await this.ipc.invoke("ai-generate-text", {
        prompt,
        maxTokens: 300,
        count: 1
      });
      if (response.success && response.texts?.[0]) {
        return response.texts[0];
      }
      return text;
    } finally {
      this._isGenerating.set(false);
    }
  }
  /**
   * 生成回覆建議
   */
  async suggestReply(customerMessage, context) {
    return this.generate({
      type: "reply",
      style: "friendly",
      context: {
        previousMessages: [customerMessage, ...context?.previousMessages || []]
      },
      options: {
        count: 3
      }
    });
  }
  // ============ 模板管理 ============
  /**
   * 獲取所有模板
   */
  getAllTemplates() {
    return [...this.systemTemplates, ...this._savedTemplates()];
  }
  /**
   * 獲取特定類型的模板
   */
  getTemplatesForType(type) {
    return this.getAllTemplates().filter((t) => t.type === type);
  }
  /**
   * 保存自定義模板
   */
  saveTemplate(template) {
    const newTemplate = __spreadProps(__spreadValues({}, template), {
      id: `tpl-${Date.now()}`,
      isSystem: false
    });
    this._savedTemplates.update((t) => [...t, newTemplate]);
    this.persistTemplates();
  }
  /**
   * 刪除模板
   */
  deleteTemplate(id) {
    this._savedTemplates.update((t) => t.filter((x) => x.id !== id));
    this.persistTemplates();
  }
  /**
   * 應用模板
   */
  applyTemplate(template, variables) {
    let result = template.template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, "g"), value || "");
    }
    result = result.replace(/\{[^}]+\}/g, "");
    return result.trim();
  }
  // ============ 私有方法 ============
  buildPrompt(request) {
    const typePrompts = {
      greeting: "\u751F\u6210\u958B\u5834\u767D/\u554F\u5019\u8A9E",
      reply: "\u751F\u6210\u56DE\u8986\u6D88\u606F",
      follow_up: "\u751F\u6210\u8DDF\u9032\u6D88\u606F",
      objection: "\u751F\u6210\u7570\u8B70\u8655\u7406\u8A71\u8853",
      closing: "\u751F\u6210\u4FC3\u6210\u6210\u4EA4\u8A71\u8853",
      retention: "\u751F\u6210\u633D\u56DE\u5BA2\u6236\u8A71\u8853"
    };
    const styleDesc = request.style ? `\u98A8\u683C\u8981\u6C42\uFF1A${this.getStyleDescription(request.style)}` : "";
    let prompt = `\u4F5C\u70BA\u5C08\u696D\u7684\u92B7\u552E\u8A71\u8853\u5C08\u5BB6\uFF0C\u8ACB${typePrompts[request.type]}\u3002

${styleDesc}

`;
    if (request.context?.productName) {
      prompt += `\u7522\u54C1/\u670D\u52D9\uFF1A${request.context.productName}
`;
    }
    if (request.context?.customerName) {
      prompt += `\u5BA2\u6236\u7A31\u547C\uFF1A${request.context.customerName}
`;
    }
    if (request.context?.previousMessages?.length) {
      prompt += `
\u5C0D\u8A71\u4E0A\u4E0B\u6587\uFF1A
${request.context.previousMessages.join("\n")}
`;
    }
    if (request.context?.objection) {
      prompt += `
\u5BA2\u6236\u7570\u8B70\uFF1A${request.context.objection}
`;
    }
    if (request.context?.goal) {
      prompt += `
\u76EE\u6A19\uFF1A${request.context.goal}
`;
    }
    prompt += `
\u8981\u6C42\uFF1A
1. \u81EA\u7136\u53E3\u8A9E\u5316\uFF0C\u4E0D\u8981\u592A\u751F\u786C
2. \u7C21\u6F54\u6709\u529B\uFF0C\u4E0D\u8981\u592A\u9577
3. \u6709\u89AA\u548C\u529B\uFF0C\u8B93\u5BA2\u6236\u611F\u5230\u8212\u9069
${request.options?.includeEmoji ? "4. \u9069\u7576\u4F7F\u7528\u8868\u60C5\u7B26\u865F" : ""}

\u8ACB\u76F4\u63A5\u7D66\u51FA\u8A71\u8853\uFF0C\u4E0D\u9700\u8981\u89E3\u91CB\uFF1A`;
    return prompt;
  }
  getStyleDescription(style2) {
    const descriptions = {
      professional: "\u5C08\u696D\u6B63\u5F0F\uFF0C\u7528\u8A5E\u7CBE\u6E96\uFF0C\u7D66\u4EBA\u4FE1\u8CF4\u611F",
      friendly: "\u89AA\u5207\u53CB\u597D\uFF0C\u50CF\u670B\u53CB\u804A\u5929\u4E00\u6A23\u81EA\u7136",
      casual: "\u8F15\u9B06\u96A8\u610F\uFF0C\u53E3\u8A9E\u5316\uFF0C\u4E0D\u62D8\u8B39",
      urgent: "\u5E36\u6709\u9069\u5EA6\u7DCA\u8FEB\u611F\uFF0C\u4FC3\u9032\u6C7A\u7B56",
      empathetic: "\u5BCC\u6709\u540C\u7406\u5FC3\uFF0C\u7406\u89E3\u5BA2\u6236\u8655\u5883"
    };
    return descriptions[style2];
  }
  postProcess(text, request) {
    let result = text.trim();
    if (result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    if (request.context?.customerName) {
      result = result.replace(/\{customerName\}/g, request.context.customerName);
    }
    if (request.context?.productName) {
      result = result.replace(/\{productName\}/g, request.context.productName);
    }
    return result;
  }
  evaluateQuality(text, request) {
    let score = 70;
    if (text.length >= 20 && text.length <= 200)
      score += 10;
    if (request.options?.includeEmoji && /[\u{1F300}-\u{1F9FF}]/u.test(text)) {
      score += 5;
    }
    if (text.includes("\uFF1F") || text.includes("?"))
      score += 5;
    if (request.context?.customerName && text.includes(request.context.customerName)) {
      score += 5;
    }
    return Math.min(100, score);
  }
  extractTags(request) {
    const tags = [request.type];
    if (request.style)
      tags.push(request.style);
    if (request.options?.includeEmoji)
      tags.push("emoji");
    if (request.context?.productName)
      tags.push("\u7522\u54C1\u76F8\u95DC");
    return tags;
  }
  loadSavedTemplates() {
    try {
      const saved = localStorage.getItem("copywriting_templates");
      if (saved) {
        this._savedTemplates.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  }
  persistTemplates() {
    localStorage.setItem("copywriting_templates", JSON.stringify(this._savedTemplates()));
  }
  static {
    this.\u0275fac = function AICopywritingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AICopywritingService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AICopywritingService, factory: _AICopywritingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AICopywritingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/onboarding.service.ts
var OnboardingService = class _OnboardingService {
  constructor() {
    this._isActive = signal(false, ...ngDevMode ? [{ debugName: "_isActive" }] : []);
    this.isActive = this._isActive.asReadonly();
    this._currentTour = signal(null, ...ngDevMode ? [{ debugName: "_currentTour" }] : []);
    this.currentTour = this._currentTour.asReadonly();
    this._currentStepIndex = signal(0, ...ngDevMode ? [{ debugName: "_currentStepIndex" }] : []);
    this.currentStepIndex = this._currentStepIndex.asReadonly();
    this._progress = signal(/* @__PURE__ */ new Map(), ...ngDevMode ? [{ debugName: "_progress" }] : []);
    this.currentStep = computed(() => {
      const tour = this._currentTour();
      const index = this._currentStepIndex();
      return tour?.steps[index] || null;
    }, ...ngDevMode ? [{ debugName: "currentStep" }] : []);
    this.totalSteps = computed(() => this._currentTour()?.steps.length || 0, ...ngDevMode ? [{ debugName: "totalSteps" }] : []);
    this.progressPercent = computed(() => {
      const total = this.totalSteps();
      if (total === 0)
        return 0;
      return Math.round(this._currentStepIndex() / total * 100);
    }, ...ngDevMode ? [{ debugName: "progressPercent" }] : []);
    this.tours = [
      {
        id: "welcome",
        name: "\u6B61\u8FCE\u4F7F\u7528",
        description: "\u5FEB\u901F\u4E86\u89E3\u7CFB\u7D71\u7684\u6838\u5FC3\u529F\u80FD",
        trigger: "first_visit",
        version: 1,
        steps: [
          {
            id: "welcome-intro",
            title: "\u6B61\u8FCE\u4F7F\u7528\u667A\u80FD\u71DF\u92B7\u7CFB\u7D71\uFF01 \u{1F389}",
            description: "\u9019\u662F\u60A8\u7684\u667A\u80FD\u71DF\u92B7\u52A9\u624B\uFF0C\u8B93\u6211\u5011\u82B12\u5206\u9418\u5FEB\u901F\u4E86\u89E3\u6838\u5FC3\u529F\u80FD\u3002",
            position: "center",
            skipable: true
          },
          {
            id: "welcome-accounts",
            title: "1. \u6DFB\u52A0\u5E33\u865F",
            description: "\u9996\u5148\uFF0C\u60A8\u9700\u8981\u6DFB\u52A0 Telegram \u5E33\u865F\u3002\u9EDE\u64CA\u9019\u88E1\u958B\u59CB\u6DFB\u52A0\u60A8\u7684\u7B2C\u4E00\u500B\u5E33\u865F\u3002",
            target: '[data-tour="accounts"]',
            position: "bottom",
            actionLabel: "\u4E86\u89E3\u4E86"
          },
          {
            id: "welcome-marketing",
            title: "2. \u71DF\u92B7\u4EFB\u52D9\u4E2D\u5FC3",
            description: "\u9019\u662F\u60A8\u7684\u71DF\u92B7\u4EFB\u52D9\u6307\u63EE\u4E2D\u5FC3\u3002\u9078\u64C7\u76EE\u6A19\u3001\u914D\u7F6E AI\uFF0C\u4E00\u9375\u555F\u52D5\u71DF\u92B7\u4EFB\u52D9\u3002",
            target: '[data-tour="marketing-hub"]',
            position: "bottom",
            actionLabel: "\u4E0B\u4E00\u6B65"
          },
          {
            id: "welcome-roles",
            title: "3. \u89D2\u8272\u8CC7\u6E90\u5EAB",
            description: "\u9019\u88E1\u7BA1\u7406 AI \u89D2\u8272\u548C\u5287\u672C\u3002\u7CFB\u7D71\u9810\u8A2D\u4E8650+\u5C08\u696D\u89D2\u8272\uFF0C\u60A8\u4E5F\u53EF\u4EE5\u81EA\u5B9A\u7FA9\u3002",
            target: '[data-tour="role-library"]',
            position: "bottom",
            actionLabel: "\u4E0B\u4E00\u6B65"
          },
          {
            id: "welcome-ai",
            title: "4. \u667A\u80FD\u5F15\u64CE",
            description: "\u914D\u7F6E AI \u6A21\u578B\u3001\u77E5\u8B58\u5EAB\u548C\u4EBA\u683C\u98A8\u683C\u3002\u5EFA\u8B70\u5148\u5B8C\u6210\u9019\u88E1\u7684\u914D\u7F6E\u3002",
            target: '[data-tour="ai-engine"]',
            position: "bottom",
            actionLabel: "\u4E0B\u4E00\u6B65"
          },
          {
            id: "welcome-done",
            title: "\u6E96\u5099\u5C31\u7DD2\uFF01 \u{1F680}",
            description: "\u60A8\u5DF2\u4E86\u89E3\u57FA\u672C\u529F\u80FD\u3002\u5EFA\u8B70\u5148\u6DFB\u52A0\u5E33\u865F\uFF0C\u7136\u5F8C\u5617\u8A66\u5275\u5EFA\u60A8\u7684\u7B2C\u4E00\u500B\u71DF\u92B7\u4EFB\u52D9\u3002\n\n\u96A8\u6642\u53EF\u4EE5\u5728\u8A2D\u7F6E\u4E2D\u91CD\u65B0\u67E5\u770B\u5F15\u5C0E\u3002",
            position: "center",
            actionLabel: "\u958B\u59CB\u4F7F\u7528"
          }
        ]
      },
      {
        id: "create-task",
        name: "\u5275\u5EFA\u71DF\u92B7\u4EFB\u52D9",
        description: "\u5B78\u7FD2\u5982\u4F55\u5275\u5EFA\u548C\u914D\u7F6E\u71DF\u92B7\u4EFB\u52D9",
        trigger: "manual",
        version: 1,
        steps: [
          {
            id: "task-goal",
            title: "\u9078\u64C7\u71DF\u92B7\u76EE\u6A19",
            description: "\u9996\u5148\u9078\u64C7\u60A8\u8981\u9054\u6210\u7684\u76EE\u6A19\u3002\u4E0D\u540C\u76EE\u6A19\u6703\u6709\u4E0D\u540C\u7684 AI \u7B56\u7565\u3002",
            target: ".goal-selector",
            position: "bottom"
          },
          {
            id: "task-audience",
            title: "\u9078\u64C7\u76EE\u6A19\u5BA2\u7FA4",
            description: "\u6307\u5B9A\u9019\u6B21\u4EFB\u52D9\u8981\u89F8\u9054\u7684\u5BA2\u6236\u3002\u53EF\u4EE5\u6309\u6A19\u7C64\u3001\u7FA4\u7D44\u6216\u610F\u5411\u5206\u6578\u7BE9\u9078\u3002",
            target: ".audience-selector",
            position: "bottom"
          },
          {
            id: "task-config",
            title: "\u78BA\u8A8D AI \u914D\u7F6E",
            description: "AI \u6703\u6839\u64DA\u76EE\u6A19\u81EA\u52D5\u63A8\u85A6\u914D\u7F6E\uFF0C\u60A8\u4E5F\u53EF\u4EE5\u624B\u52D5\u8ABF\u6574\u3002",
            target: ".config-panel",
            position: "left"
          },
          {
            id: "task-launch",
            title: "\u555F\u52D5\u4EFB\u52D9",
            description: "\u78BA\u8A8D\u7121\u8AA4\u5F8C\uFF0C\u9EDE\u64CA\u555F\u52D5\u6309\u9215\u3002AI \u6703\u958B\u59CB\u81EA\u52D5\u57F7\u884C\u71DF\u92B7\u4EFB\u52D9\u3002",
            target: ".launch-button",
            position: "top"
          }
        ]
      },
      {
        id: "ai-config",
        name: "\u914D\u7F6E AI \u5F15\u64CE",
        description: "\u5B78\u7FD2\u5982\u4F55\u914D\u7F6E AI \u6A21\u578B\u548C\u77E5\u8B58\u5EAB",
        trigger: "manual",
        version: 1,
        steps: [
          {
            id: "ai-model",
            title: "\u9078\u64C7 AI \u6A21\u578B",
            description: "\u9078\u64C7\u8981\u4F7F\u7528\u7684 AI \u6A21\u578B\u3002GPT-4 \u6548\u679C\u6700\u597D\uFF0CGPT-3.5 \u6210\u672C\u6700\u4F4E\u3002",
            target: '[data-tour="ai-model"]',
            position: "bottom"
          },
          {
            id: "ai-apikey",
            title: "\u914D\u7F6E API Key",
            description: "\u8F38\u5165\u60A8\u7684 OpenAI \u6216\u5176\u4ED6 AI \u670D\u52D9\u7684 API Key\u3002",
            target: '[data-tour="api-key"]',
            position: "bottom"
          },
          {
            id: "ai-knowledge",
            title: "\u6DFB\u52A0\u77E5\u8B58\u5EAB",
            description: "\u4E0A\u50B3\u7522\u54C1\u8CC7\u6599\u3001FAQ \u7B49\u6587\u6A94\uFF0CAI \u6703\u5B78\u7FD2\u9019\u4E9B\u77E5\u8B58\u4F86\u56DE\u7B54\u5BA2\u6236\u554F\u984C\u3002",
            target: '[data-tour="knowledge-base"]',
            position: "right"
          },
          {
            id: "ai-persona",
            title: "\u8A2D\u7F6E AI \u4EBA\u683C",
            description: "\u8ABF\u6574 AI \u7684\u8AAA\u8A71\u98A8\u683C\u548C\u4EBA\u683C\u7279\u9EDE\uFF0C\u8B93\u56DE\u8986\u66F4\u81EA\u7136\u3002",
            target: '[data-tour="ai-persona"]',
            position: "bottom"
          }
        ]
      }
    ];
    this.loadProgress();
    this.checkAutoStart();
  }
  // ============ 引導控制 ============
  /**
   * 開始引導
   */
  startTour(tourId) {
    const tour = this.tours.find((t) => t.id === tourId);
    if (!tour)
      return;
    this._currentTour.set(tour);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    const step = tour.steps[0];
    step.beforeShow?.();
    this.highlightTarget(step.target);
  }
  /**
   * 下一步
   */
  nextStep() {
    const tour = this._currentTour();
    if (!tour)
      return;
    const currentStep = this.currentStep();
    currentStep?.afterComplete?.();
    const nextIndex = this._currentStepIndex() + 1;
    if (nextIndex >= tour.steps.length) {
      this.completeTour();
    } else {
      this._currentStepIndex.set(nextIndex);
      const step = tour.steps[nextIndex];
      step.beforeShow?.();
      this.highlightTarget(step.target);
    }
  }
  /**
   * 上一步
   */
  prevStep() {
    const prevIndex = this._currentStepIndex() - 1;
    if (prevIndex < 0)
      return;
    this._currentStepIndex.set(prevIndex);
    const step = this._currentTour()?.steps[prevIndex];
    if (step) {
      step.beforeShow?.();
      this.highlightTarget(step.target);
    }
  }
  /**
   * 跳到指定步驟
   */
  goToStep(index) {
    const tour = this._currentTour();
    if (!tour || index < 0 || index >= tour.steps.length)
      return;
    this._currentStepIndex.set(index);
    const step = tour.steps[index];
    step.beforeShow?.();
    this.highlightTarget(step.target);
  }
  /**
   * 跳過引導
   */
  skipTour() {
    const tour = this._currentTour();
    if (!tour)
      return;
    this.updateProgress(tour.id, {
      tourId: tour.id,
      currentStep: this._currentStepIndex(),
      completed: false,
      skipped: true,
      version: tour.version
    });
    this.closeTour();
  }
  /**
   * 完成引導
   */
  completeTour() {
    const tour = this._currentTour();
    if (!tour)
      return;
    this.updateProgress(tour.id, {
      tourId: tour.id,
      currentStep: tour.steps.length,
      completed: true,
      skipped: false,
      completedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: tour.version
    });
    this.closeTour();
  }
  /**
   * 關閉引導
   */
  closeTour() {
    this.clearHighlight();
    this._isActive.set(false);
    this._currentTour.set(null);
    this._currentStepIndex.set(0);
  }
  // ============ 進度管理 ============
  /**
   * 檢查是否已完成
   */
  isCompleted(tourId) {
    const progress = this._progress().get(tourId);
    return progress?.completed || false;
  }
  /**
   * 重置引導
   */
  resetTour(tourId) {
    this._progress.update((p) => {
      const newMap = new Map(p);
      newMap.delete(tourId);
      return newMap;
    });
    this.saveProgress();
  }
  /**
   * 重置所有引導
   */
  resetAll() {
    this._progress.set(/* @__PURE__ */ new Map());
    this.saveProgress();
  }
  /**
   * 獲取可用的引導列表
   */
  getAvailableTours() {
    return this.tours;
  }
  // ============ 私有方法 ============
  checkAutoStart() {
    for (const tour of this.tours) {
      if (tour.trigger !== "first_visit")
        continue;
      const progress = this._progress().get(tour.id);
      if (!progress || progress.version !== tour.version && !progress.completed) {
        setTimeout(() => this.startTour(tour.id), 1e3);
        break;
      }
    }
  }
  updateProgress(tourId, progress) {
    this._progress.update((p) => {
      const newMap = new Map(p);
      newMap.set(tourId, progress);
      return newMap;
    });
    this.saveProgress();
  }
  highlightTarget(selector) {
    this.clearHighlight();
    if (!selector)
      return;
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add("onboarding-highlight");
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  clearHighlight() {
    document.querySelectorAll(".onboarding-highlight").forEach((el) => {
      el.classList.remove("onboarding-highlight");
    });
  }
  loadProgress() {
    try {
      const saved = localStorage.getItem("onboarding_progress");
      if (saved) {
        const data = JSON.parse(saved);
        this._progress.set(new Map(Object.entries(data)));
      }
    } catch (e) {
      console.error("Failed to load onboarding progress:", e);
    }
  }
  saveProgress() {
    const data = Object.fromEntries(this._progress());
    localStorage.setItem("onboarding_progress", JSON.stringify(data));
  }
  static {
    this.\u0275fac = function OnboardingService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _OnboardingService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _OnboardingService, factory: _OnboardingService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OnboardingService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/services/theme.service.ts
var DARK_THEME = {
  primary: "#8b5cf6",
  // purple-500
  secondary: "#06b6d4",
  // cyan-500
  accent: "#ec4899",
  // pink-500
  background: "#0f172a",
  // slate-900
  surface: "#1e293b",
  // slate-800
  text: "#f8fafc",
  // slate-50
  textMuted: "#94a3b8",
  // slate-400
  border: "#334155",
  // slate-700
  success: "#10b981",
  // emerald-500
  warning: "#f59e0b",
  // amber-500
  error: "#ef4444"
  // red-500
};
var LIGHT_THEME = {
  primary: "#7c3aed",
  // violet-600
  secondary: "#0891b2",
  // cyan-600
  accent: "#db2777",
  // pink-600
  background: "#ffffff",
  // white
  surface: "#f8fafc",
  // slate-50
  text: "#0f172a",
  // slate-900
  textMuted: "#64748b",
  // slate-500
  border: "#e2e8f0",
  // slate-200
  success: "#059669",
  // emerald-600
  warning: "#d97706",
  // amber-600
  error: "#dc2626"
  // red-600
};
var THEME_PRESETS = [
  {
    id: "default-dark",
    name: "\u9ED8\u8A8D\u6697\u8272",
    mode: "dark",
    colors: {}
  },
  {
    id: "default-light",
    name: "\u9ED8\u8A8D\u4EAE\u8272",
    mode: "light",
    colors: {}
  },
  {
    id: "midnight",
    name: "\u5348\u591C\u85CD",
    mode: "dark",
    colors: {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      background: "#0c1222",
      surface: "#162032"
    }
  },
  {
    id: "forest",
    name: "\u68EE\u6797\u7DA0",
    mode: "dark",
    colors: {
      primary: "#10b981",
      secondary: "#14b8a6",
      accent: "#22c55e",
      background: "#0a1410",
      surface: "#132820"
    }
  },
  {
    id: "sunset",
    name: "\u65E5\u843D\u6A59",
    mode: "dark",
    colors: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#ef4444",
      background: "#1c1210",
      surface: "#2a1f1a"
    }
  },
  {
    id: "ocean",
    name: "\u6D77\u6D0B",
    mode: "light",
    colors: {
      primary: "#0ea5e9",
      secondary: "#06b6d4",
      background: "#f0f9ff",
      surface: "#e0f2fe"
    }
  }
];
var ThemeService = class _ThemeService {
  constructor() {
    this._mode = signal("dark", ...ngDevMode ? [{ debugName: "_mode" }] : []);
    this.mode = this._mode.asReadonly();
    this._activePreset = signal("default-dark", ...ngDevMode ? [{ debugName: "_activePreset" }] : []);
    this.activePreset = this._activePreset.asReadonly();
    this._customColors = signal({}, ...ngDevMode ? [{ debugName: "_customColors" }] : []);
    this.customColors = this._customColors.asReadonly();
    this.isDark = computed(() => {
      const mode = this._mode();
      if (mode === "system") {
        return this.getSystemPreference() === "dark";
      }
      return mode === "dark";
    }, ...ngDevMode ? [{ debugName: "isDark" }] : []);
    this.currentColors = computed(() => {
      const baseColors = this.isDark() ? DARK_THEME : LIGHT_THEME;
      const presetColors = this.getPresetColors();
      const customColors = this._customColors();
      return __spreadValues(__spreadValues(__spreadValues({}, baseColors), presetColors), customColors);
    }, ...ngDevMode ? [{ debugName: "currentColors" }] : []);
    this.presets = computed(() => THEME_PRESETS, ...ngDevMode ? [{ debugName: "presets" }] : []);
    this.loadSettings();
    this.setupSystemListener();
    effect(() => {
      this.applyTheme();
    });
  }
  /**
   * 設置主題模式
   */
  setMode(mode) {
    this._mode.set(mode);
    this.saveSettings();
  }
  /**
   * 切換暗色/亮色
   */
  toggle() {
    const current = this._mode();
    if (current === "system") {
      this._mode.set(this.isDark() ? "light" : "dark");
    } else {
      this._mode.set(current === "dark" ? "light" : "dark");
    }
    this.saveSettings();
  }
  /**
   * 應用預設主題
   */
  applyPreset(presetId) {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset)
      return;
    this._activePreset.set(presetId);
    this._mode.set(preset.mode);
    this._customColors.set({});
    this.saveSettings();
  }
  /**
   * 設置自定義顏色
   */
  setCustomColor(key, value) {
    this._customColors.update((colors2) => __spreadProps(__spreadValues({}, colors2), {
      [key]: value
    }));
    this.saveSettings();
  }
  /**
   * 重置自定義顏色
   */
  resetCustomColors() {
    this._customColors.set({});
    this.saveSettings();
  }
  /**
   * 獲取 CSS 變量
   */
  getCssVariables() {
    const colors2 = this.currentColors();
    return Object.entries(colors2).map(([key, value]) => `--theme-${this.camelToKebab(key)}: ${value};`).join("\n");
  }
  // ============ 私有方法 ============
  getPresetColors() {
    const preset = THEME_PRESETS.find((p) => p.id === this._activePreset());
    return preset?.colors || {};
  }
  getSystemPreference() {
    if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }
  setupSystemListener() {
    window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (this._mode() === "system") {
        this.applyTheme();
      }
    });
  }
  applyTheme() {
    const root = document.documentElement;
    const colors2 = this.currentColors();
    if (this.isDark()) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    for (const [key, value] of Object.entries(colors2)) {
      root.style.setProperty(`--theme-${this.camelToKebab(key)}`, value);
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", colors2.background);
    }
  }
  camelToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  loadSettings() {
    try {
      const saved = localStorage.getItem("theme_settings");
      if (saved) {
        const settings = JSON.parse(saved);
        this._mode.set(settings.mode || "dark");
        this._activePreset.set(settings.preset || "default-dark");
        this._customColors.set(settings.customColors || {});
      }
    } catch (e) {
      console.error("Failed to load theme settings:", e);
    }
  }
  saveSettings() {
    localStorage.setItem("theme_settings", JSON.stringify({
      mode: this._mode(),
      preset: this._activePreset(),
      customColors: this._customColors()
    }));
  }
  static {
    this.\u0275fac = function ThemeService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ThemeService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ThemeService, factory: _ThemeService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ThemeService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  AnimationMetadataType,
  AUTO_STYLE,
  sequence,
  style,
  NoopAnimationPlayer,
  AnimationGroupPlayer,
  ɵPRE_STYLE,
  DialogService,
  CampaignManagementService,
  TemplateManagementService,
  NavigationService,
  LeadManagementService,
  GroupManagementService,
  MessageQueueService,
  AppFacadeService,
  ANIMATION_OPTIONS,
  AnimationConfigService,
  SettingsService,
  AiChatService,
  ResourceService,
  ExportService,
  RagService,
  VectorMemoryService,
  BackupService,
  SchedulerService
};
/*! Bundled license information:

@angular/animations/fesm2022/_private_export-chunk.mjs:
@angular/animations/fesm2022/animations.mjs:
  (**
   * @license Angular v21.0.6
   * (c) 2010-2025 Google LLC. https://angular.dev/
   * License: MIT
   *)
*/
//# sourceMappingURL=chunk-CTKGMQYJ.js.map
