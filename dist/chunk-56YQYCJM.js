import {
  ActivatedRoute,
  Router
} from "./chunk-T45T4QAG.js";
import {
  I18nService
} from "./chunk-ZTUGHWSQ.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import {
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
  ɵɵgetCurrentView,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵpureFunction1,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵsanitizeUrl,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-K4KD4A2Z.js";

// src/auth/scan-login.component.ts
var _c0 = (a0) => ({ seconds: a0 });
function ScanLoginComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 4);
    \u0275\u0275domElement(1, "div", 13);
    \u0275\u0275domElementStart(2, "p");
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.verifying"));
  }
}
function ScanLoginComponent_Conditional_8_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "p", 22);
    \u0275\u0275text(1);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("scanLogin.expiresIn", \u0275\u0275pureFunction1(1, _c0, ctx_r0.countdown())), " ");
  }
}
function ScanLoginComponent_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 5)(1, "div", 14);
    \u0275\u0275text(2, "\u{1F4F1}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p", 15);
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElement(7, "div", 16);
    \u0275\u0275domElementStart(8, "div", 17)(9, "span");
    \u0275\u0275text(10);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(11, "a", 18);
    \u0275\u0275domListener("click", function ScanLoginComponent_Conditional_8_Template_a_click_11_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.onTelegramClick());
    });
    \u0275\u0275domElementStart(12, "span", 19);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(13, "svg", 20);
    \u0275\u0275domElement(14, "path", 21);
    \u0275\u0275domElementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(15, "span");
    \u0275\u0275text(16);
    \u0275\u0275domElementEnd()();
    \u0275\u0275conditionalCreate(17, ScanLoginComponent_Conditional_8_Conditional_17_Template, 2, 3, "p", 22);
    \u0275\u0275domElementStart(18, "div", 23)(19, "div", 24)(20, "span", 25);
    \u0275\u0275text(21, "1");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(22, "span");
    \u0275\u0275text(23);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(24, "div", 24)(25, "span", 25);
    \u0275\u0275text(26, "2");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(27, "span");
    \u0275\u0275text(28);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(29, "div", 24)(30, "span", 25);
    \u0275\u0275text(31, "3");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(32, "span");
    \u0275\u0275text(33);
    \u0275\u0275domElementEnd()()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.confirmTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.authDesc"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.or"));
    \u0275\u0275advance();
    \u0275\u0275domProperty("href", ctx_r0.tokenStatus().deepLinkUrl, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.openTelegramManual"));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.countdown() > 0 ? 17 : -1);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.stepAuth"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.stepConfirm"));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.stepDone"));
  }
}
function ScanLoginComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 6);
    \u0275\u0275domElement(1, "div", 13);
    \u0275\u0275domElementStart(2, "h2");
    \u0275\u0275text(3);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(4, "p");
    \u0275\u0275text(5);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.sendingTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.sendingDesc"));
  }
}
function ScanLoginComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 7)(1, "div", 26);
    \u0275\u0275text(2, "\u23F3");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElement(7, "div", 27);
    \u0275\u0275domElementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.waitingTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.waitingDesc"));
  }
}
function ScanLoginComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 8)(1, "div", 28);
    \u0275\u0275text(2, "\u{1F916}");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "a", 29)(8, "span", 19);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(9, "svg", 20);
    \u0275\u0275domElement(10, "path", 21);
    \u0275\u0275domElementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(11, "span");
    \u0275\u0275text(12);
    \u0275\u0275domElementEnd()();
    \u0275\u0275domElementStart(13, "p", 30);
    \u0275\u0275text(14);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(15, "button", 31);
    \u0275\u0275domListener("click", function ScanLoginComponent_Conditional_11_Template_button_click_15_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.retryAfterUnblock());
    });
    \u0275\u0275text(16);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.botBlockedTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.botBlockedDesc"));
    \u0275\u0275advance();
    \u0275\u0275domProperty("href", ctx_r0.tokenStatus().botLink, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.openBotFirst"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.botBlockedHint"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("scanLogin.retryAfterUnblock"), " ");
  }
}
function ScanLoginComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275domElementStart(0, "div", 32)(1, "div", 33)(2, "div", 34);
    \u0275\u0275namespaceSVG();
    \u0275\u0275domElementStart(3, "svg", 35);
    \u0275\u0275domElement(4, "circle", 36)(5, "path", 37);
    \u0275\u0275domElementEnd()()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275domElementStart(6, "h2");
    \u0275\u0275text(7);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(8, "p");
    \u0275\u0275text(9);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(10, "p", 38);
    \u0275\u0275text(11);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275classProp("animate", ctx_r0.showSuccessAnimation());
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.successTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.successDesc"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.redirecting"));
  }
}
function ScanLoginComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 10)(1, "div", 39);
    \u0275\u0275text(2, "\u23F0");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "button", 31);
    \u0275\u0275domListener("click", function ScanLoginComponent_Conditional_13_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToLogin());
    });
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.expiredTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.expiredDesc"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("scanLogin.backToLogin"), " ");
  }
}
function ScanLoginComponent_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275domElementStart(0, "div", 11)(1, "div", 39);
    \u0275\u0275text(2, "\u274C");
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(3, "h2");
    \u0275\u0275text(4);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(5, "p");
    \u0275\u0275text(6);
    \u0275\u0275domElementEnd();
    \u0275\u0275domElementStart(7, "button", 31);
    \u0275\u0275domListener("click", function ScanLoginComponent_Conditional_14_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.goToLogin());
    });
    \u0275\u0275text(8);
    \u0275\u0275domElementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("scanLogin.errorTitle"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.tokenStatus().message || ctx_r0.t("scanLogin.errorDesc"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("scanLogin.backToLogin"), " ");
  }
}
function detectDevice() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua))
    return "ios";
  if (/android/.test(ua))
    return "android";
  if (/windows|macintosh|linux/.test(ua) && !/mobile/.test(ua))
    return "desktop";
  return "unknown";
}
function isMobile() {
  const device = detectDevice();
  return device === "ios" || device === "android";
}
var ScanLoginComponent = class _ScanLoginComponent {
  constructor() {
    this.route = inject(ActivatedRoute);
    this.router = inject(Router);
    this.i18n = inject(I18nService);
    this.tokenStatus = signal({ status: "loading" }, ...ngDevMode ? [{ debugName: "tokenStatus" }] : []);
    this.countdown = signal(0, ...ngDevMode ? [{ debugName: "countdown" }] : []);
    this.waitingConfirm = signal(false, ...ngDevMode ? [{ debugName: "waitingConfirm" }] : []);
    this.telegramUser = signal(null, ...ngDevMode ? [{ debugName: "telegramUser" }] : []);
    this.showSuccessAnimation = signal(false, ...ngDevMode ? [{ debugName: "showSuccessAnimation" }] : []);
    this.deviceType = signal("unknown", ...ngDevMode ? [{ debugName: "deviceType" }] : []);
    this.token = "";
    this.botUsername = "";
    this.countdownInterval = null;
    this.pollInterval = null;
    this.widgetLoaded = false;
    this.SAVED_TG_USER_KEY = "tg_matrix_saved_user";
  }
  ngOnInit() {
    this.deviceType.set(detectDevice());
    console.log("Device type:", this.deviceType());
    this.token = this.route.snapshot.queryParams["token"] || "";
    if (!this.token) {
      this.tokenStatus.set({
        status: "error",
        message: this.t("scanLogin.noToken")
      });
      return;
    }
    window.onTelegramAuth = this.handleTelegramAuth.bind(this);
    this.verifyToken();
    this.checkSavedUser();
  }
  /**
   * 🆕 檢查是否有保存的 Telegram 用戶
   */
  checkSavedUser() {
    try {
      const savedUserStr = localStorage.getItem(this.SAVED_TG_USER_KEY);
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const authTime = savedUser.auth_date * 1e3;
        const now = Date.now();
        const hoursSinceAuth = (now - authTime) / (1e3 * 60 * 60);
        if (hoursSinceAuth < 24) {
          console.log("Found saved user, auto-sending confirmation...");
          this.telegramUser.set(savedUser);
          setTimeout(() => {
            if (this.tokenStatus().status === "valid") {
              this.sendConfirmationToUser(savedUser);
            }
          }, 500);
        } else {
          localStorage.removeItem(this.SAVED_TG_USER_KEY);
        }
      }
    } catch (e) {
      console.error("Error checking saved user:", e);
    }
  }
  ngAfterViewInit() {
  }
  /**
   * 🆕 處理 Telegram Login Widget 授權回調
   */
  handleTelegramAuth(user) {
    console.log("Telegram auth received:", user);
    this.telegramUser.set(user);
    this.tokenStatus.update((s) => __spreadProps(__spreadValues({}, s), { status: "sending" }));
    this.sendConfirmationToUser(user);
  }
  /**
   * 🆕 調用後端 API，讓 Bot 主動發送確認消息給用戶
   */
  async sendConfirmationToUser(user) {
    try {
      const response = await fetch(`/api/v1/auth/login-token/${this.token}/send-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          telegram_id: user.id,
          telegram_username: user.username,
          telegram_first_name: user.first_name,
          telegram_last_name: user.last_name,
          auth_date: user.auth_date,
          hash: user.hash
        })
      });
      const result = await response.json();
      if (result.success) {
        this.saveUser(user);
        this.tokenStatus.update((s) => __spreadProps(__spreadValues({}, s), { status: "valid" }));
        this.waitingConfirm.set(true);
        this.startPolling();
        if (isMobile()) {
          setTimeout(() => {
            window.location.href = `tg://resolve?domain=${this.botUsername}`;
          }, 1e3);
        }
      } else {
        if (result.need_start_bot) {
          this.tokenStatus.set({
            status: "bot_blocked",
            message: result.error,
            botLink: result.bot_link || `https://t.me/${this.botUsername}`
          });
        } else {
          this.tokenStatus.set({
            status: "error",
            message: result.error || this.t("scanLogin.sendFailed")
          });
        }
      }
    } catch (e) {
      console.error("Send confirmation error:", e);
      this.tokenStatus.set({
        status: "error",
        message: this.t("scanLogin.networkError")
      });
    }
  }
  /**
   * 🆕 保存用戶信息到 LocalStorage
   */
  saveUser(user) {
    try {
      localStorage.setItem(this.SAVED_TG_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error("Error saving user:", e);
    }
  }
  /**
   * 🆕 Bot 解封後重試
   */
  retryAfterUnblock() {
    const user = this.telegramUser();
    if (user) {
      this.tokenStatus.set({ status: "sending" });
      this.sendConfirmationToUser(user);
    } else {
      window.location.reload();
    }
  }
  /**
   * 🆕 加載 Telegram Login Widget
   */
  loadTelegramWidget() {
    if (this.widgetLoaded || !this.botUsername)
      return;
    const container = document.getElementById("telegram-login-widget");
    if (!container)
      return;
    container.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", this.botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
    this.widgetLoaded = true;
  }
  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
  t(key, params) {
    return this.i18n.t(key, params);
  }
  async verifyToken() {
    try {
      const response = await fetch(`/api/v1/auth/login-token/${this.token}`);
      const result = await response.json();
      if (!result.success) {
        this.tokenStatus.set({
          status: "error",
          message: result.error || this.t("scanLogin.tokenInvalid")
        });
        return;
      }
      const { status, expires_in, deep_link_url, bot_username } = result.data;
      if (status === "expired") {
        this.tokenStatus.set({ status: "expired" });
        return;
      }
      if (status === "confirmed") {
        this.tokenStatus.set({ status: "confirmed" });
        return;
      }
      this.botUsername = bot_username || "tgzkw_bot";
      this.tokenStatus.set({
        status: "valid",
        deepLinkUrl: deep_link_url,
        botUsername: bot_username,
        expiresIn: expires_in || 300
      });
      this.countdown.set(expires_in || 300);
      this.startCountdown();
      setTimeout(() => {
        this.loadTelegramWidget();
      }, 100);
    } catch (e) {
      console.error("Token verification error:", e);
      this.tokenStatus.set({
        status: "error",
        message: this.t("scanLogin.networkError")
      });
    }
  }
  onTelegramClick() {
    this.waitingConfirm.set(true);
    this.startPolling();
  }
  startCountdown() {
    this.countdownInterval = setInterval(() => {
      const current = this.countdown();
      if (current <= 0) {
        clearInterval(this.countdownInterval);
        this.tokenStatus.set({ status: "expired" });
      } else {
        this.countdown.set(current - 1);
      }
    }, 1e3);
  }
  startPolling() {
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/auth/login-token/${this.token}`);
        const result = await response.json();
        if (result.success && result.data) {
          if (result.data.status === "confirmed") {
            clearInterval(this.pollInterval);
            this.waitingConfirm.set(false);
            this.showSuccessAnimation.set(true);
            this.tokenStatus.set({ status: "confirmed" });
            setTimeout(() => {
            }, 2e3);
          } else if (result.data.status === "expired") {
            clearInterval(this.pollInterval);
            this.waitingConfirm.set(false);
            this.tokenStatus.set({ status: "expired" });
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2e3);
  }
  goToLogin() {
    window.location.href = "https://tgw.usdt2026.cc/auth/login";
  }
  static {
    this.\u0275fac = function ScanLoginComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ScanLoginComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ScanLoginComponent, selectors: [["app-scan-login"]], decls: 18, vars: 8, consts: [[1, "scan-login-page"], [1, "scan-card"], [1, "logo"], [1, "logo-icon"], [1, "status-section", "loading"], [1, "status-section", "valid"], [1, "status-section", "sending"], [1, "status-section", "waiting"], [1, "status-section", "bot-blocked"], [1, "status-section", "confirmed", 3, "animate"], [1, "status-section", "expired"], [1, "status-section", "error"], [1, "footer"], [1, "spinner"], [1, "info-icon"], [1, "description"], ["id", "telegram-login-widget", 1, "telegram-widget-container"], [1, "divider"], [1, "telegram-btn", "secondary", 3, "click", "href"], [1, "btn-icon"], ["viewBox", "0 0 24 24", "fill", "currentColor", "width", "24", "height", "24"], ["d", "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"], [1, "countdown"], [1, "steps"], [1, "step"], [1, "step-num"], [1, "pulse-icon"], [1, "spinner", "small"], [1, "warning-icon"], ["target", "_blank", 1, "telegram-btn", "primary", 3, "href"], [1, "hint"], [1, "retry-btn", 3, "click"], [1, "status-section", "confirmed"], [1, "success-animation"], [1, "checkmark-circle"], ["viewBox", "0 0 52 52", 1, "checkmark"], ["cx", "26", "cy", "26", "r", "25", "fill", "none", 1, "checkmark-circle-bg"], ["fill", "none", "d", "M14.1 27.2l7.1 7.2 16.7-16.8", 1, "checkmark-check"], [1, "redirect-hint"], [1, "error-icon"]], template: function ScanLoginComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275domElementStart(0, "div", 0)(1, "div", 1)(2, "div", 2)(3, "div", 3);
        \u0275\u0275text(4, "\u{1F510}");
        \u0275\u0275domElementEnd();
        \u0275\u0275domElementStart(5, "h1");
        \u0275\u0275text(6, "TG-Matrix");
        \u0275\u0275domElementEnd()();
        \u0275\u0275conditionalCreate(7, ScanLoginComponent_Conditional_7_Template, 4, 1, "div", 4);
        \u0275\u0275conditionalCreate(8, ScanLoginComponent_Conditional_8_Template, 34, 9, "div", 5);
        \u0275\u0275conditionalCreate(9, ScanLoginComponent_Conditional_9_Template, 6, 2, "div", 6);
        \u0275\u0275conditionalCreate(10, ScanLoginComponent_Conditional_10_Template, 8, 2, "div", 7);
        \u0275\u0275conditionalCreate(11, ScanLoginComponent_Conditional_11_Template, 17, 6, "div", 8);
        \u0275\u0275conditionalCreate(12, ScanLoginComponent_Conditional_12_Template, 12, 5, "div", 9);
        \u0275\u0275conditionalCreate(13, ScanLoginComponent_Conditional_13_Template, 9, 3, "div", 10);
        \u0275\u0275conditionalCreate(14, ScanLoginComponent_Conditional_14_Template, 9, 3, "div", 11);
        \u0275\u0275domElementStart(15, "div", 12)(16, "p");
        \u0275\u0275text(17, "\xA9 2026 TG-Matrix. All rights reserved.");
        \u0275\u0275domElementEnd()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(7);
        \u0275\u0275conditional(ctx.tokenStatus().status === "loading" ? 7 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "valid" ? 8 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "sending" ? 9 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.waitingConfirm() ? 10 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "bot_blocked" ? 11 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "confirmed" ? 12 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "expired" ? 13 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.tokenStatus().status === "error" ? 14 : -1);
      }
    }, dependencies: [CommonModule], styles: ['\n\n.scan-login-page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background:\n    linear-gradient(\n      135deg,\n      #0f172a 0%,\n      #1e293b 100%);\n  padding: 1rem;\n}\n.scan-card[_ngcontent-%COMP%] {\n  background: rgba(30, 41, 59, 0.9);\n  border-radius: 20px;\n  padding: 2rem;\n  max-width: 400px;\n  width: 100%;\n  text-align: center;\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n}\n.logo[_ngcontent-%COMP%] {\n  margin-bottom: 2rem;\n}\n.logo-icon[_ngcontent-%COMP%] {\n  font-size: 3rem;\n  margin-bottom: 0.5rem;\n}\n.logo[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: #fff;\n  margin: 0;\n}\n.status-section[_ngcontent-%COMP%] {\n  padding: 1rem 0;\n}\n.info-icon[_ngcontent-%COMP%], \n.success-icon[_ngcontent-%COMP%], \n.error-icon[_ngcontent-%COMP%], \n.pulse-icon[_ngcontent-%COMP%] {\n  font-size: 3rem;\n  margin-bottom: 1rem;\n}\n.pulse-icon[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_pulse 1.5s infinite;\n}\n@keyframes _ngcontent-%COMP%_pulse {\n  0%, 100% {\n    opacity: 1;\n    transform: scale(1);\n  }\n  50% {\n    opacity: 0.7;\n    transform: scale(1.1);\n  }\n}\nh2[_ngcontent-%COMP%] {\n  color: #fff;\n  font-size: 1.25rem;\n  margin: 0 0 0.5rem;\n}\n.description[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  font-size: 0.9rem;\n  margin: 0 0 1.5rem;\n}\n.telegram-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  padding: 1rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 12px;\n  color: #fff;\n  font-size: 1.1rem;\n  font-weight: 600;\n  text-decoration: none;\n  cursor: pointer;\n  transition: all 0.3s ease;\n  width: 100%;\n  box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);\n}\n.telegram-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 20px rgba(0, 136, 204, 0.5);\n}\n.telegram-btn[_ngcontent-%COMP%]:active {\n  transform: translateY(0);\n}\n.telegram-btn.secondary[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid #0088cc;\n  box-shadow: none;\n}\n.telegram-btn.secondary[_ngcontent-%COMP%]:hover {\n  background: rgba(0, 136, 204, 0.1);\n  box-shadow: none;\n}\n.telegram-widget-container[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  margin: 1.5rem 0;\n  min-height: 48px;\n}\n.divider[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: #64748b;\n  font-size: 0.85rem;\n}\n.divider[_ngcontent-%COMP%]::before, \n.divider[_ngcontent-%COMP%]::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: rgba(255, 255, 255, 0.1);\n}\n.divider[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  padding: 0 1rem;\n}\n.status-section.sending[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  color: #60a5fa;\n}\n.btn-icon[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n}\n.btn-icon[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n}\n.countdown[_ngcontent-%COMP%] {\n  color: #64748b;\n  font-size: 0.85rem;\n  margin: 1rem 0 0;\n}\n.steps[_ngcontent-%COMP%] {\n  margin-top: 2rem;\n  padding-top: 1.5rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.step[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.5rem 0;\n  color: #94a3b8;\n  font-size: 0.9rem;\n}\n.step-num[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.5rem;\n  height: 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border-radius: 50%;\n  color: #fff;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.spinner[_ngcontent-%COMP%] {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: #0088cc;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 1s linear infinite;\n  margin: 1rem auto;\n}\n.spinner.small[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  border-width: 2px;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.retry-btn[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75rem 1.5rem;\n  background: transparent;\n  border: 1px solid #64748b;\n  border-radius: 8px;\n  color: #94a3b8;\n  font-size: 0.9rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 1rem;\n}\n.retry-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: #fff;\n  color: #fff;\n}\n.footer[_ngcontent-%COMP%] {\n  margin-top: 2rem;\n  padding-top: 1rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.05);\n}\n.footer[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #475569;\n  font-size: 0.75rem;\n  margin: 0;\n}\n.status-section.loading[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #94a3b8;\n}\n.status-section.waiting[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  color: #fbbf24;\n}\n.status-section.confirmed[_ngcontent-%COMP%]   .success-icon[_ngcontent-%COMP%] {\n  color: #4ade80;\n}\n.status-section.confirmed[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  color: #4ade80;\n}\n.status-section.expired[_ngcontent-%COMP%]   .error-icon[_ngcontent-%COMP%], \n.status-section.error[_ngcontent-%COMP%]   .error-icon[_ngcontent-%COMP%] {\n  color: #f87171;\n}\n.status-section.expired[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%], \n.status-section.error[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  color: #f87171;\n}\n.status-section.bot-blocked[_ngcontent-%COMP%]   .warning-icon[_ngcontent-%COMP%] {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.status-section.bot-blocked[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  color: #fbbf24;\n}\n.telegram-btn.primary[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);\n}\n.hint[_ngcontent-%COMP%] {\n  color: #64748b;\n  font-size: 0.8rem;\n  margin: 1rem 0;\n}\n.success-animation[_ngcontent-%COMP%] {\n  margin: 1rem 0 2rem;\n}\n.checkmark-circle[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  margin: 0 auto;\n}\n.checkmark[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n}\n.checkmark-circle-bg[_ngcontent-%COMP%] {\n  stroke: #4ade80;\n  stroke-width: 2;\n  stroke-dasharray: 157;\n  stroke-dashoffset: 157;\n  animation: _ngcontent-%COMP%_circle-draw 0.6s ease-out forwards;\n}\n.checkmark-check[_ngcontent-%COMP%] {\n  stroke: #4ade80;\n  stroke-width: 3;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n  stroke-dasharray: 48;\n  stroke-dashoffset: 48;\n  animation: _ngcontent-%COMP%_check-draw 0.4s 0.4s ease-out forwards;\n}\n@keyframes _ngcontent-%COMP%_circle-draw {\n  to {\n    stroke-dashoffset: 0;\n  }\n}\n@keyframes _ngcontent-%COMP%_check-draw {\n  to {\n    stroke-dashoffset: 0;\n  }\n}\n.status-section.confirmed.animate[_ngcontent-%COMP%] {\n  animation: _ngcontent-%COMP%_success-scale 0.5s ease-out;\n}\n@keyframes _ngcontent-%COMP%_success-scale {\n  0% {\n    transform: scale(0.8);\n    opacity: 0;\n  }\n  50% {\n    transform: scale(1.05);\n  }\n  100% {\n    transform: scale(1);\n    opacity: 1;\n  }\n}\n.redirect-hint[_ngcontent-%COMP%] {\n  color: #64748b;\n  font-size: 0.85rem;\n  margin-top: 1rem;\n  animation: _ngcontent-%COMP%_blink 1.5s infinite;\n}\n@keyframes _ngcontent-%COMP%_blink {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n.device-hint[_ngcontent-%COMP%] {\n  background: rgba(0, 136, 204, 0.1);\n  border: 1px solid rgba(0, 136, 204, 0.3);\n  border-radius: 8px;\n  padding: 0.75rem;\n  margin: 1rem 0;\n  color: #60a5fa;\n  font-size: 0.85rem;\n}\n.device-hint[_ngcontent-%COMP%]   .icon[_ngcontent-%COMP%] {\n  margin-right: 0.5rem;\n}\n/*# sourceMappingURL=scan-login.component.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ScanLoginComponent, [{
    type: Component,
    args: [{ selector: "app-scan-login", standalone: true, imports: [CommonModule], template: `
    <div class="scan-login-page">
      <div class="scan-card">
        <!-- Logo -->
        <div class="logo">
          <div class="logo-icon">\u{1F510}</div>
          <h1>TG-Matrix</h1>
        </div>

        <!-- Loading -->
        @if (tokenStatus().status === 'loading') {
          <div class="status-section loading">
            <div class="spinner"></div>
            <p>{{ t('scanLogin.verifying') }}</p>
          </div>
        }

        <!-- Valid Token - \u986F\u793A Telegram \u6388\u6B0A\u6309\u9215 -->
        @if (tokenStatus().status === 'valid') {
          <div class="status-section valid">
            <div class="info-icon">\u{1F4F1}</div>
            <h2>{{ t('scanLogin.confirmTitle') }}</h2>
            <p class="description">{{ t('scanLogin.authDesc') }}</p>
            
            <!-- \u{1F195} Telegram Login Widget \u5BB9\u5668 -->
            <div class="telegram-widget-container" id="telegram-login-widget"></div>
            
            <!-- \u5099\u7528\u65B9\u6848\uFF1A\u624B\u52D5\u6253\u958B Telegram -->
            <div class="divider">
              <span>{{ t('scanLogin.or') }}</span>
            </div>
            
            <a 
              [href]="tokenStatus().deepLinkUrl" 
              class="telegram-btn secondary"
              (click)="onTelegramClick()"
            >
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              <span>{{ t('scanLogin.openTelegramManual') }}</span>
            </a>

            @if (countdown() > 0) {
              <p class="countdown">
                {{ t('scanLogin.expiresIn', {seconds: countdown()}) }}
              </p>
            }

            <div class="steps">
              <div class="step">
                <span class="step-num">1</span>
                <span>{{ t('scanLogin.stepAuth') }}</span>
              </div>
              <div class="step">
                <span class="step-num">2</span>
                <span>{{ t('scanLogin.stepConfirm') }}</span>
              </div>
              <div class="step">
                <span class="step-num">3</span>
                <span>{{ t('scanLogin.stepDone') }}</span>
              </div>
            </div>
          </div>
        }
        
        <!-- \u{1F195} \u6B63\u5728\u767C\u9001\u78BA\u8A8D\u6D88\u606F -->
        @if (tokenStatus().status === 'sending') {
          <div class="status-section sending">
            <div class="spinner"></div>
            <h2>{{ t('scanLogin.sendingTitle') }}</h2>
            <p>{{ t('scanLogin.sendingDesc') }}</p>
          </div>
        }

        <!-- Waiting for confirmation (after clicking button) -->
        @if (waitingConfirm()) {
          <div class="status-section waiting">
            <div class="pulse-icon">\u23F3</div>
            <h2>{{ t('scanLogin.waitingTitle') }}</h2>
            <p>{{ t('scanLogin.waitingDesc') }}</p>
            <div class="spinner small"></div>
          </div>
        }

        <!-- \u{1F195} Bot \u88AB\u5C01\u9396\u63D0\u793A -->
        @if (tokenStatus().status === 'bot_blocked') {
          <div class="status-section bot-blocked">
            <div class="warning-icon">\u{1F916}</div>
            <h2>{{ t('scanLogin.botBlockedTitle') }}</h2>
            <p>{{ t('scanLogin.botBlockedDesc') }}</p>
            
            <a 
              [href]="tokenStatus().botLink" 
              class="telegram-btn primary"
              target="_blank"
            >
              <span class="btn-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </span>
              <span>{{ t('scanLogin.openBotFirst') }}</span>
            </a>
            
            <p class="hint">{{ t('scanLogin.botBlockedHint') }}</p>
            
            <button class="retry-btn" (click)="retryAfterUnblock()">
              {{ t('scanLogin.retryAfterUnblock') }}
            </button>
          </div>
        }

        <!-- Confirmed - \u{1F195} \u589E\u5F37\u52D5\u756B\u6548\u679C -->
        @if (tokenStatus().status === 'confirmed') {
          <div class="status-section confirmed" [class.animate]="showSuccessAnimation()">
            <div class="success-animation">
              <div class="checkmark-circle">
                <svg class="checkmark" viewBox="0 0 52 52">
                  <circle class="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                  <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
              </div>
            </div>
            <h2>{{ t('scanLogin.successTitle') }}</h2>
            <p>{{ t('scanLogin.successDesc') }}</p>
            <p class="redirect-hint">{{ t('scanLogin.redirecting') }}</p>
          </div>
        }

        <!-- Expired -->
        @if (tokenStatus().status === 'expired') {
          <div class="status-section expired">
            <div class="error-icon">\u23F0</div>
            <h2>{{ t('scanLogin.expiredTitle') }}</h2>
            <p>{{ t('scanLogin.expiredDesc') }}</p>
            <button class="retry-btn" (click)="goToLogin()">
              {{ t('scanLogin.backToLogin') }}
            </button>
          </div>
        }

        <!-- Error -->
        @if (tokenStatus().status === 'error') {
          <div class="status-section error">
            <div class="error-icon">\u274C</div>
            <h2>{{ t('scanLogin.errorTitle') }}</h2>
            <p>{{ tokenStatus().message || t('scanLogin.errorDesc') }}</p>
            <button class="retry-btn" (click)="goToLogin()">
              {{ t('scanLogin.backToLogin') }}
            </button>
          </div>
        }

        <!-- Footer -->
        <div class="footer">
          <p>\xA9 2026 TG-Matrix. All rights reserved.</p>
        </div>
      </div>
    </div>
  `, styles: ['/* angular:styles/component:css;1d121a12ed6ac8448e58dfab6ba4472210b8011dcba4590b3da69bb27838af41;D:/tgkz2026/src/auth/scan-login.component.ts */\n.scan-login-page {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background:\n    linear-gradient(\n      135deg,\n      #0f172a 0%,\n      #1e293b 100%);\n  padding: 1rem;\n}\n.scan-card {\n  background: rgba(30, 41, 59, 0.9);\n  border-radius: 20px;\n  padding: 2rem;\n  max-width: 400px;\n  width: 100%;\n  text-align: center;\n  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);\n  border: 1px solid rgba(255, 255, 255, 0.1);\n}\n.logo {\n  margin-bottom: 2rem;\n}\n.logo-icon {\n  font-size: 3rem;\n  margin-bottom: 0.5rem;\n}\n.logo h1 {\n  font-size: 1.5rem;\n  font-weight: 700;\n  color: #fff;\n  margin: 0;\n}\n.status-section {\n  padding: 1rem 0;\n}\n.info-icon,\n.success-icon,\n.error-icon,\n.pulse-icon {\n  font-size: 3rem;\n  margin-bottom: 1rem;\n}\n.pulse-icon {\n  animation: pulse 1.5s infinite;\n}\n@keyframes pulse {\n  0%, 100% {\n    opacity: 1;\n    transform: scale(1);\n  }\n  50% {\n    opacity: 0.7;\n    transform: scale(1.1);\n  }\n}\nh2 {\n  color: #fff;\n  font-size: 1.25rem;\n  margin: 0 0 0.5rem;\n}\n.description {\n  color: #94a3b8;\n  font-size: 0.9rem;\n  margin: 0 0 1.5rem;\n}\n.telegram-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n  padding: 1rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 12px;\n  color: #fff;\n  font-size: 1.1rem;\n  font-weight: 600;\n  text-decoration: none;\n  cursor: pointer;\n  transition: all 0.3s ease;\n  width: 100%;\n  box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);\n}\n.telegram-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 20px rgba(0, 136, 204, 0.5);\n}\n.telegram-btn:active {\n  transform: translateY(0);\n}\n.telegram-btn.secondary {\n  background: transparent;\n  border: 1px solid #0088cc;\n  box-shadow: none;\n}\n.telegram-btn.secondary:hover {\n  background: rgba(0, 136, 204, 0.1);\n  box-shadow: none;\n}\n.telegram-widget-container {\n  display: flex;\n  justify-content: center;\n  margin: 1.5rem 0;\n  min-height: 48px;\n}\n.divider {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: #64748b;\n  font-size: 0.85rem;\n}\n.divider::before,\n.divider::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: rgba(255, 255, 255, 0.1);\n}\n.divider span {\n  padding: 0 1rem;\n}\n.status-section.sending h2 {\n  color: #60a5fa;\n}\n.btn-icon {\n  display: flex;\n  align-items: center;\n}\n.btn-icon svg {\n  width: 24px;\n  height: 24px;\n}\n.countdown {\n  color: #64748b;\n  font-size: 0.85rem;\n  margin: 1rem 0 0;\n}\n.steps {\n  margin-top: 2rem;\n  padding-top: 1.5rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.1);\n}\n.step {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.5rem 0;\n  color: #94a3b8;\n  font-size: 0.9rem;\n}\n.step-num {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.5rem;\n  height: 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border-radius: 50%;\n  color: #fff;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.spinner {\n  width: 40px;\n  height: 40px;\n  border: 3px solid rgba(255, 255, 255, 0.1);\n  border-top-color: #0088cc;\n  border-radius: 50%;\n  animation: spin 1s linear infinite;\n  margin: 1rem auto;\n}\n.spinner.small {\n  width: 24px;\n  height: 24px;\n  border-width: 2px;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.retry-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 0.75rem 1.5rem;\n  background: transparent;\n  border: 1px solid #64748b;\n  border-radius: 8px;\n  color: #94a3b8;\n  font-size: 0.9rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 1rem;\n}\n.retry-btn:hover {\n  background: rgba(255, 255, 255, 0.05);\n  border-color: #fff;\n  color: #fff;\n}\n.footer {\n  margin-top: 2rem;\n  padding-top: 1rem;\n  border-top: 1px solid rgba(255, 255, 255, 0.05);\n}\n.footer p {\n  color: #475569;\n  font-size: 0.75rem;\n  margin: 0;\n}\n.status-section.loading p {\n  color: #94a3b8;\n}\n.status-section.waiting h2 {\n  color: #fbbf24;\n}\n.status-section.confirmed .success-icon {\n  color: #4ade80;\n}\n.status-section.confirmed h2 {\n  color: #4ade80;\n}\n.status-section.expired .error-icon,\n.status-section.error .error-icon {\n  color: #f87171;\n}\n.status-section.expired h2,\n.status-section.error h2 {\n  color: #f87171;\n}\n.status-section.bot-blocked .warning-icon {\n  font-size: 4rem;\n  margin-bottom: 1rem;\n}\n.status-section.bot-blocked h2 {\n  color: #fbbf24;\n}\n.telegram-btn.primary {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  box-shadow: 0 4px 15px rgba(0, 136, 204, 0.4);\n}\n.hint {\n  color: #64748b;\n  font-size: 0.8rem;\n  margin: 1rem 0;\n}\n.success-animation {\n  margin: 1rem 0 2rem;\n}\n.checkmark-circle {\n  width: 80px;\n  height: 80px;\n  margin: 0 auto;\n}\n.checkmark {\n  width: 100%;\n  height: 100%;\n}\n.checkmark-circle-bg {\n  stroke: #4ade80;\n  stroke-width: 2;\n  stroke-dasharray: 157;\n  stroke-dashoffset: 157;\n  animation: circle-draw 0.6s ease-out forwards;\n}\n.checkmark-check {\n  stroke: #4ade80;\n  stroke-width: 3;\n  stroke-linecap: round;\n  stroke-linejoin: round;\n  stroke-dasharray: 48;\n  stroke-dashoffset: 48;\n  animation: check-draw 0.4s 0.4s ease-out forwards;\n}\n@keyframes circle-draw {\n  to {\n    stroke-dashoffset: 0;\n  }\n}\n@keyframes check-draw {\n  to {\n    stroke-dashoffset: 0;\n  }\n}\n.status-section.confirmed.animate {\n  animation: success-scale 0.5s ease-out;\n}\n@keyframes success-scale {\n  0% {\n    transform: scale(0.8);\n    opacity: 0;\n  }\n  50% {\n    transform: scale(1.05);\n  }\n  100% {\n    transform: scale(1);\n    opacity: 1;\n  }\n}\n.redirect-hint {\n  color: #64748b;\n  font-size: 0.85rem;\n  margin-top: 1rem;\n  animation: blink 1.5s infinite;\n}\n@keyframes blink {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n.device-hint {\n  background: rgba(0, 136, 204, 0.1);\n  border: 1px solid rgba(0, 136, 204, 0.3);\n  border-radius: 8px;\n  padding: 0.75rem;\n  margin: 1rem 0;\n  color: #60a5fa;\n  font-size: 0.85rem;\n}\n.device-hint .icon {\n  margin-right: 0.5rem;\n}\n/*# sourceMappingURL=scan-login.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ScanLoginComponent, { className: "ScanLoginComponent", filePath: "src/auth/scan-login.component.ts", lineNumber: 592 });
})();
export {
  ScanLoginComponent
};
//# sourceMappingURL=chunk-56YQYCJM.js.map
