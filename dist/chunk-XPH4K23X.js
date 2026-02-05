import {
  AuthService
} from "./chunk-FIY3KE23.js";
import "./chunk-LRT2RG6V.js";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterModule
} from "./chunk-T45T4QAG.js";
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
  NgControlStatusGroup,
  NgForm,
  NgModel,
  RequiredValidator,
  ɵNgNoValidate
} from "./chunk-AF6KAQ3H.js";
import {
  CommonModule
} from "./chunk-BTHEVO76.js";
import "./chunk-VXLC6YHT.js";
import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  __spreadProps,
  __spreadValues,
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
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
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

// src/services/security.service.ts
var CSRF_CONFIG = {
  COOKIE_NAME: "csrf_token",
  HEADER_NAME: "X-CSRF-Token",
  STORAGE_KEY: "tgm_csrf_token"
};
var LOGIN_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  // 最大嘗試次數
  LOCKOUT_DURATION: 300,
  // 鎖定時長（秒）
  ATTEMPT_WINDOW: 900,
  // 嘗試窗口（秒）
  STORAGE_KEY: "tgm_login_attempts"
};
var FrontendSecurityService = class _FrontendSecurityService {
  constructor() {
    this._csrfToken = signal("", ...ngDevMode ? [{ debugName: "_csrfToken" }] : []);
    this.csrfToken = computed(() => this._csrfToken(), ...ngDevMode ? [{ debugName: "csrfToken" }] : []);
    this._isLocked = signal(false, ...ngDevMode ? [{ debugName: "_isLocked" }] : []);
    this._lockoutRemaining = signal(0, ...ngDevMode ? [{ debugName: "_lockoutRemaining" }] : []);
    this._attemptCount = signal(0, ...ngDevMode ? [{ debugName: "_attemptCount" }] : []);
    this.isLocked = computed(() => this._isLocked(), ...ngDevMode ? [{ debugName: "isLocked" }] : []);
    this.lockoutRemaining = computed(() => this._lockoutRemaining(), ...ngDevMode ? [{ debugName: "lockoutRemaining" }] : []);
    this.attemptCount = computed(() => this._attemptCount(), ...ngDevMode ? [{ debugName: "attemptCount" }] : []);
    this.attemptsLeft = computed(() => Math.max(0, LOGIN_LIMIT_CONFIG.MAX_ATTEMPTS - this._attemptCount()), ...ngDevMode ? [{ debugName: "attemptsLeft" }] : []);
    this.refreshCsrfToken();
  }
  /**
   * 從 Cookie 刷新 CSRF Token
   */
  refreshCsrfToken() {
    const token = this.getCookie(CSRF_CONFIG.COOKIE_NAME);
    if (token) {
      this._csrfToken.set(token);
    }
  }
  /**
   * 獲取 CSRF Token（用於請求頭）
   */
  getCsrfToken() {
    return this._csrfToken();
  }
  /**
   * 獲取包含 CSRF Token 的請求頭
   */
  getCsrfHeaders() {
    const token = this.getCsrfToken();
    if (token) {
      return { [CSRF_CONFIG.HEADER_NAME]: token };
    }
    return {};
  }
  /**
   * 增強的 fetch，自動添加 CSRF Token
   */
  async secureFetch(url, options = {}) {
    const headers = new Headers(options.headers);
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers.set(CSRF_CONFIG.HEADER_NAME, csrfToken);
    }
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(url, __spreadProps(__spreadValues({}, options), {
      headers,
      credentials: "include"
      // 包含 Cookie
    }));
    this.refreshCsrfToken();
    return response;
  }
  /**
   * 檢查是否可以嘗試登入
   */
  canAttemptLogin() {
    const lockout = this.getLockoutData();
    const now = Date.now();
    if (lockout.lockedUntil > now) {
      const waitSeconds = Math.ceil((lockout.lockedUntil - now) / 1e3);
      this._isLocked.set(true);
      this._lockoutRemaining.set(waitSeconds);
      return {
        allowed: false,
        message: `\u767B\u5165\u5617\u8A66\u6B21\u6578\u904E\u591A\uFF0C\u8ACB ${this.formatDuration(waitSeconds)} \u5F8C\u518D\u8A66`,
        waitSeconds
      };
    }
    this._isLocked.set(false);
    this._lockoutRemaining.set(0);
    const recentAttempts = this.getRecentAttempts(lockout.attempts);
    this._attemptCount.set(recentAttempts.length);
    if (recentAttempts.length >= LOGIN_LIMIT_CONFIG.MAX_ATTEMPTS) {
      const lockedUntil = now + LOGIN_LIMIT_CONFIG.LOCKOUT_DURATION * 1e3;
      this.setLockout(lockedUntil, lockout.attempts);
      const waitSeconds = LOGIN_LIMIT_CONFIG.LOCKOUT_DURATION;
      this._isLocked.set(true);
      this._lockoutRemaining.set(waitSeconds);
      return {
        allowed: false,
        message: `\u767B\u5165\u5617\u8A66\u6B21\u6578\u904E\u591A\uFF0C\u8ACB ${this.formatDuration(waitSeconds)} \u5F8C\u518D\u8A66`,
        waitSeconds
      };
    }
    return { allowed: true };
  }
  /**
   * 記錄登入嘗試
   */
  recordLoginAttempt(success, email) {
    const lockout = this.getLockoutData();
    lockout.attempts.push({
      timestamp: Date.now(),
      success,
      email
    });
    lockout.attempts = this.getRecentAttempts(lockout.attempts);
    if (success) {
      lockout.lockedUntil = 0;
      lockout.attempts = [];
    }
    this.saveLockoutData(lockout);
    this._attemptCount.set(lockout.attempts.filter((a) => !a.success).length);
  }
  /**
   * 清除登入限制
   */
  clearLoginLimit() {
    localStorage.removeItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY);
    this._isLocked.set(false);
    this._lockoutRemaining.set(0);
    this._attemptCount.set(0);
  }
  /**
   * 獲取最近的失敗嘗試
   */
  getRecentAttempts(attempts) {
    const windowStart = Date.now() - LOGIN_LIMIT_CONFIG.ATTEMPT_WINDOW * 1e3;
    return attempts.filter((a) => a.timestamp > windowStart && !a.success);
  }
  /**
   * 獲取鎖定數據
   */
  getLockoutData() {
    try {
      const data = localStorage.getItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse lockout data:", e);
    }
    return { lockedUntil: 0, attempts: [] };
  }
  /**
   * 保存鎖定數據
   */
  saveLockoutData(data) {
    localStorage.setItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY, JSON.stringify(data));
  }
  /**
   * 設置鎖定
   */
  setLockout(lockedUntil, attempts) {
    this.saveLockoutData({ lockedUntil, attempts });
  }
  // ==================== XSS 防護 ====================
  /**
   * 清理 HTML（防止 XSS）
   */
  sanitizeHtml(html) {
    const temp = document.createElement("div");
    temp.textContent = html;
    return temp.innerHTML;
  }
  /**
   * 驗證 URL 安全性
   */
  isUrlSafe(url) {
    if (!url)
      return false;
    if (url.toLowerCase().startsWith("javascript:"))
      return false;
    if (url.toLowerCase().startsWith("data:") && !url.toLowerCase().startsWith("data:image/")) {
      return false;
    }
    if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
      return true;
    }
    return false;
  }
  /**
   * 轉義 HTML 特殊字符
   */
  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
  // ==================== 輔助方法 ====================
  /**
   * 獲取 Cookie 值
   */
  getCookie(name) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }
  /**
   * 格式化持續時間
   */
  formatDuration(seconds) {
    if (seconds < 60) {
      return `${seconds} \u79D2`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} \u5206\u9418`;
  }
  /**
   * 啟動鎖定倒計時
   */
  startLockoutCountdown(callback) {
    const interval = setInterval(() => {
      const remaining = this._lockoutRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
        this._isLocked.set(false);
        callback?.(0);
        return;
      }
      this._lockoutRemaining.update((r) => r - 1);
      callback?.(remaining - 1);
    }, 1e3);
    return () => clearInterval(interval);
  }
  static {
    this.\u0275fac = function FrontendSecurityService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _FrontendSecurityService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _FrontendSecurityService, factory: _FrontendSecurityService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FrontendSecurityService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/auth/login.component.ts
var _c0 = (a0) => ({ seconds: a0 });
function LoginComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 1)(1, "div", 30)(2, "div", 31);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(3, "svg", 32);
    \u0275\u0275element(4, "circle", 33)(5, "path", 34);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(6, "h3", 35);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "p", 36);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "p", 37);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.loginSuccess"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", ctx_r0.t("auth.welcomeBackUser"), "\uFF0C", ctx_r0.successUserName());
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.redirecting"));
  }
}
function LoginComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4)(1, "span", 38);
    \u0275\u0275text(2, "\u{1F512}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 39)(4, "span", 40);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 41);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.accountLocked"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.waitSeconds", \u0275\u0275pureFunction1(2, _c0, ctx_r0.lockoutRemaining())));
  }
}
function LoginComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 5)(1, "span", 42);
    \u0275\u0275text(2, "\u26A0\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.error());
  }
}
function LoginComponent_Conditional_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 43);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.loggingIn"));
  }
}
function LoginComponent_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.t("auth.login"));
  }
}
function LoginComponent_Conditional_55_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44);
    \u0275\u0275element(1, "span", 43);
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.generatingQR"));
  }
}
function LoginComponent_Conditional_55_Conditional_2_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 49)(1, "span", 55);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "button", 56);
    \u0275\u0275listener("click", function LoginComponent_Conditional_55_Conditional_2_Conditional_3_Template_button_click_3_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r0.refreshQRCode());
    });
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.qrExpired"));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.clickToRefresh"));
  }
}
function LoginComponent_Conditional_55_Conditional_2_Conditional_17_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 53)(1, "p", 57);
    \u0275\u0275text(2, "\u6383\u78BC\u7121\u6548\uFF1F\u5728 Bot \u4E2D\u8F38\u5165\u9A57\u8B49\u78BC\uFF1A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 58);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.verifyCode());
  }
}
function LoginComponent_Conditional_55_Conditional_2_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 54)(1, "span", 59);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 60);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance();
    \u0275\u0275classProp("connected", ctx_r0.wsConnected());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", ctx_r0.wsConnected() ? "\u{1F7E2} " + ctx_r0.t("auth.realtimeConnected") : "\u{1F534} " + ctx_r0.t("auth.reconnecting"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r0.qrCountdown(), "s");
  }
}
function LoginComponent_Conditional_55_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 45)(1, "div", 47);
    \u0275\u0275element(2, "img", 48);
    \u0275\u0275conditionalCreate(3, LoginComponent_Conditional_55_Conditional_2_Conditional_3_Template, 5, 2, "div", 49);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 50)(5, "p", 51)(6, "span", 52);
    \u0275\u0275text(7, "1");
    \u0275\u0275elementEnd();
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p", 51)(10, "span", 52);
    \u0275\u0275text(11, "2");
    \u0275\u0275elementEnd();
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "p", 51)(14, "span", 52);
    \u0275\u0275text(15, "3");
    \u0275\u0275elementEnd();
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()();
    \u0275\u0275conditionalCreate(17, LoginComponent_Conditional_55_Conditional_2_Conditional_17_Template, 5, 1, "div", 53);
    \u0275\u0275conditionalCreate(18, LoginComponent_Conditional_55_Conditional_2_Conditional_18_Template, 5, 4, "div", 54);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("src", ctx_r0.qrCodeUrl(), \u0275\u0275sanitizeUrl)("alt", ctx_r0.t("auth.telegramLoginQR"));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.qrCodeExpired() ? 3 : -1);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("auth.openTelegram"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("auth.scanQRCode"));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("auth.confirmLogin"));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.verifyCode() ? 17 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(!ctx_r0.qrCodeExpired() ? 18 : -1);
  }
}
function LoginComponent_Conditional_55_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 61);
    \u0275\u0275listener("click", function LoginComponent_Conditional_55_Conditional_3_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r3);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.generateQRCode());
    });
    \u0275\u0275elementStart(1, "span", 62);
    \u0275\u0275text(2, "\u{1F4F7}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.generateQRCode"));
  }
}
function LoginComponent_Conditional_55_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 25);
    \u0275\u0275conditionalCreate(1, LoginComponent_Conditional_55_Conditional_1_Template, 4, 1, "div", 44)(2, LoginComponent_Conditional_55_Conditional_2_Template, 19, 8, "div", 45)(3, LoginComponent_Conditional_55_Conditional_3_Template, 5, 1, "button", 46);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.qrCodeLoading() ? 1 : ctx_r0.qrCodeUrl() ? 2 : 3);
  }
}
function LoginComponent_Conditional_56_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 65);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.waitingConfirm"));
  }
}
function LoginComponent_Conditional_56_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 66);
    \u0275\u0275text(1, "\u{1F4F1}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.openTelegramApp"));
  }
}
function LoginComponent_Conditional_56_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 64)(1, "div", 67);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 68);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "button", 69);
    \u0275\u0275listener("click", function LoginComponent_Conditional_56_Conditional_4_Template_button_click_5_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.cancelDeepLink());
    });
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("auth.clickConfirmInTelegram"), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1(" ", ctx_r0.t("auth.remainingTime", \u0275\u0275pureFunction1(3, _c0, ctx_r0.deepLinkCountdown())), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.cancel"));
  }
}
function LoginComponent_Conditional_56_Template(rf, ctx) {
  if (rf & 1) {
    const _r4 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 26)(1, "button", 63);
    \u0275\u0275listener("click", function LoginComponent_Conditional_56_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r4);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.openDeepLink());
    });
    \u0275\u0275conditionalCreate(2, LoginComponent_Conditional_56_Conditional_2_Template, 3, 1)(3, LoginComponent_Conditional_56_Conditional_3_Template, 4, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275conditionalCreate(4, LoginComponent_Conditional_56_Conditional_4_Template, 7, 5, "div", 64);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.telegramLoading());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.deepLinkLoading() ? 2 : 3);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.deepLinkLoading() ? 4 : -1);
  }
}
function LoginComponent_Conditional_57_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 65);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.loadingTelegram"));
  }
}
function LoginComponent_Conditional_57_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 66);
    \u0275\u0275text(1, "\u{1F4AC}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.useTelegramWidget"));
  }
}
function LoginComponent_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 27)(1, "button", 70);
    \u0275\u0275listener("click", function LoginComponent_Conditional_57_Template_button_click_1_listener() {
      \u0275\u0275restoreView(_r6);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.initTelegramWidget());
    });
    \u0275\u0275conditionalCreate(2, LoginComponent_Conditional_57_Conditional_2_Template, 3, 1)(3, LoginComponent_Conditional_57_Conditional_3_Template, 4, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "p", 71);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("disabled", ctx_r0.telegramLoading());
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.telegramLoading() && !ctx_r0.deepLinkLoading() ? 2 : 3);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.widgetHint"));
  }
}
var LoginComponent = class _LoginComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.i18n = inject(I18nService);
    this.security = inject(FrontendSecurityService);
    this.ipcService = inject(ElectronIpcService);
    this.email = "";
    this.password = "";
    this.rememberMe = false;
    this.showPassword = signal(false, ...ngDevMode ? [{ debugName: "showPassword" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.telegramLoading = signal(false, ...ngDevMode ? [{ debugName: "telegramLoading" }] : []);
    this.telegramWidgetReady = signal(false, ...ngDevMode ? [{ debugName: "telegramWidgetReady" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
    this.deepLinkLoading = signal(false, ...ngDevMode ? [{ debugName: "deepLinkLoading" }] : []);
    this.deepLinkCountdown = signal(300, ...ngDevMode ? [{ debugName: "deepLinkCountdown" }] : []);
    this.deepLinkToken = "";
    this.deepLinkPollInterval = null;
    this.deepLinkCountdownInterval = null;
    this.loginMethod = signal("qrcode", ...ngDevMode ? [{ debugName: "loginMethod" }] : []);
    this.qrCodeLoading = signal(false, ...ngDevMode ? [{ debugName: "qrCodeLoading" }] : []);
    this.qrCodeUrl = signal(null, ...ngDevMode ? [{ debugName: "qrCodeUrl" }] : []);
    this.qrCodeExpired = signal(false, ...ngDevMode ? [{ debugName: "qrCodeExpired" }] : []);
    this.qrCountdown = signal(300, ...ngDevMode ? [{ debugName: "qrCountdown" }] : []);
    this.wsConnected = signal(false, ...ngDevMode ? [{ debugName: "wsConnected" }] : []);
    this.verifyCode = signal(null, ...ngDevMode ? [{ debugName: "verifyCode" }] : []);
    this.qrToken = "";
    this.qrWebSocket = null;
    this.qrCountdownInterval = null;
    this.loginSuccess = signal(false, ...ngDevMode ? [{ debugName: "loginSuccess" }] : []);
    this.successUserName = signal("", ...ngDevMode ? [{ debugName: "successUserName" }] : []);
    this.isLocked = computed(() => this.security.isLocked(), ...ngDevMode ? [{ debugName: "isLocked" }] : []);
    this.lockoutRemaining = computed(() => this.security.lockoutRemaining(), ...ngDevMode ? [{ debugName: "lockoutRemaining" }] : []);
    this.attemptsLeft = computed(() => this.security.attemptsLeft(), ...ngDevMode ? [{ debugName: "attemptsLeft" }] : []);
    this.telegramBotUsername = "";
    this.telegramBotId = "";
    this.lockoutCleanup = null;
    this.deepLinkWebSocket = null;
  }
  ngOnInit() {
    this.checkLoginLimit();
    const savedPreference = this.loadLoginPreference();
    if (savedPreference) {
      this.loginMethod.set(savedPreference);
      if (savedPreference === "qrcode") {
        this.generateQRCode();
      }
    } else if (this.isMobileDevice()) {
      this.loginMethod.set("deeplink");
    } else {
      this.generateQRCode();
    }
  }
  /**
   * 檢測是否為移動設備
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  ngOnDestroy() {
    this.lockoutCleanup?.();
    this.cancelDeepLink();
    this.cleanupQRCode();
  }
  checkLoginLimit() {
    const result = this.security.canAttemptLogin();
    if (!result.allowed) {
      this.error.set(result.message || "");
      this.lockoutCleanup = this.security.startLockoutCountdown((remaining) => {
        if (remaining <= 0) {
          this.error.set(null);
        }
      });
    }
  }
  t(key) {
    return this.i18n.t(key);
  }
  async onSubmit() {
    if (!this.email || !this.password)
      return;
    const canLogin = this.security.canAttemptLogin();
    if (!canLogin.allowed) {
      this.error.set(canLogin.message || "");
      return;
    }
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const result = await this.authService.login({
        email: this.email,
        password: this.password,
        remember: this.rememberMe
      });
      if (result.success) {
        this.security.recordLoginAttempt(true, this.email);
        const returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/";
        this.router.navigateByUrl(returnUrl);
      } else {
        this.security.recordLoginAttempt(false, this.email);
        const attemptsLeft = this.security.attemptsLeft();
        let errorMsg = result.error || this.t("auth.loginFailed");
        if (attemptsLeft > 0 && attemptsLeft <= 3) {
          errorMsg += ` (\u5269\u9918 ${attemptsLeft} \u6B21\u5617\u8A66\u6A5F\u6703)`;
        }
        this.error.set(errorMsg);
        this.checkLoginLimit();
      }
    } catch (e) {
      this.security.recordLoginAttempt(false, this.email);
      this.error.set(e.message || this.t("auth.loginFailed"));
      this.checkLoginLimit();
    } finally {
      this.isLoading.set(false);
    }
  }
  async socialLogin(provider) {
    if (provider === "telegram") {
      await this.initTelegramWidget();
    } else if (provider === "google") {
      await this.googleLogin();
    }
  }
  async googleLogin() {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await fetch("/api/v1/oauth/google/config");
      const config = await response.json();
      if (!config.success || !config.data?.enabled) {
        this.error.set(this.t("auth.googleNotAvailable"));
        return;
      }
      this.openGoogleLoginPopup();
    } catch (e) {
      console.error("Google login error:", e);
      this.error.set(this.t("auth.googleNotAvailable"));
    } finally {
      this.isLoading.set(false);
    }
  }
  openGoogleLoginPopup() {
    const origin = window.location.origin;
    const callbackUrl = `${origin}/api/v1/oauth/google/callback`;
    const authUrl = `/api/v1/oauth/google/authorize?callback=${encodeURIComponent(callbackUrl)}`;
    const width = 550;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(authUrl, "GoogleAuth", `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);
    const handleMessage = async (event) => {
      if (event.data && event.data.type === "google_auth") {
        window.removeEventListener("message", handleMessage);
        popup?.close();
        await this.handleGoogleAuth(event.data.auth);
      } else if (event.data && event.data.type === "google_auth_error") {
        window.removeEventListener("message", handleMessage);
        popup?.close();
        this.error.set(event.data.error || "Google \u767B\u5165\u5931\u6557");
        this.isLoading.set(false);
      }
    };
    window.addEventListener("message", handleMessage);
    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        this.isLoading.set(false);
      }
    }, 500);
  }
  async handleGoogleAuth(authData) {
    this.isLoading.set(true);
    try {
      if (authData.access_token && authData.user) {
        localStorage.setItem("tgm_access_token", authData.access_token);
        if (authData.refresh_token) {
          localStorage.setItem("tgm_refresh_token", authData.refresh_token);
        }
        localStorage.setItem("tgm_user", JSON.stringify(authData.user));
        this.ipcService.setAuthToken(authData.access_token);
        const returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/";
        window.location.href = returnUrl;
      } else {
        this.error.set("Google \u767B\u5165\u5931\u6557\uFF1A\u7121\u6548\u7684\u8A8D\u8B49\u6578\u64DA");
      }
    } catch (e) {
      this.error.set(e.message || "Google \u767B\u5165\u5931\u6557");
    } finally {
      this.isLoading.set(false);
    }
  }
  /**
   * 打開 Telegram Deep Link 登入
   * 🔧 修復：使用 WebSocket 替代輪詢，確保實時接收登錄確認
   * 流程：生成 Token → 建立 WebSocket → 打開 Telegram App → 用戶確認 → WebSocket 接收通知
   */
  async openDeepLink() {
    this.error.set(null);
    this.deepLinkLoading.set(true);
    this.telegramLoading.set(true);
    try {
      const response = await fetch("/api/v1/auth/login-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "deep_link" })
      });
      const result = await response.json();
      if (!result.success || !result.data) {
        this.error.set(result.error || "\u7121\u6CD5\u751F\u6210\u767B\u5165\u9023\u7D50");
        this.deepLinkLoading.set(false);
        this.telegramLoading.set(false);
        return;
      }
      const { token, deep_link_url, expires_in } = result.data;
      this.deepLinkToken = token;
      this.deepLinkCountdown.set(expires_in || 300);
      console.log("[DeepLink] Token generated:", token.substring(0, 8) + "...");
      this.connectDeepLinkWebSocket(token);
      console.log("[DeepLink] Opening:", deep_link_url);
      window.open(deep_link_url, "_blank");
      this.deepLinkCountdownInterval = setInterval(() => {
        const current = this.deepLinkCountdown();
        if (current <= 0) {
          this.cancelDeepLink();
          this.error.set("\u767B\u5165\u8D85\u6642\uFF0C\u8ACB\u91CD\u8A66");
        } else {
          this.deepLinkCountdown.set(current - 1);
        }
      }, 1e3);
      this.startPollingLoginStatus();
    } catch (e) {
      console.error("[DeepLink] Error:", e);
      this.error.set(e.message || "\u767B\u5165\u5931\u6557");
      this.deepLinkLoading.set(false);
      this.telegramLoading.set(false);
    }
  }
  /**
   * 🆕 建立 Deep Link WebSocket 連接
   */
  connectDeepLinkWebSocket(token) {
    if (this.deepLinkWebSocket) {
      this.deepLinkWebSocket.close();
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/login-token/${token}`;
    console.log("[DeepLink WS] Connecting to:", wsUrl);
    try {
      this.deepLinkWebSocket = new WebSocket(wsUrl);
      this.deepLinkWebSocket.onopen = () => {
        console.log("[DeepLink WS] \u2705 Connected");
      };
      this.deepLinkWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[DeepLink WS] Message received:", data);
          if (data.type === "login_success" || data.event === "login_confirmed") {
            console.log("[DeepLink WS] \u{1F389} Login confirmed via WebSocket!");
            this.handleLoginSuccess(data.data);
          } else if (data.status === "confirmed" && data.data?.access_token) {
            console.log("[DeepLink WS] \u{1F389} Login confirmed (direct)!");
            this.handleLoginSuccess(data.data);
          }
        } catch (e) {
          console.error("[DeepLink WS] Parse error:", e);
        }
      };
      this.deepLinkWebSocket.onclose = () => {
        console.log("[DeepLink WS] Disconnected");
      };
      this.deepLinkWebSocket.onerror = (error) => {
        console.warn("[DeepLink WS] Error (will fallback to polling):", error);
      };
    } catch (e) {
      console.warn("[DeepLink WS] Failed to create WebSocket:", e);
    }
  }
  /**
   * 取消 Deep Link 登入
   */
  cancelDeepLink() {
    if (this.deepLinkWebSocket) {
      this.deepLinkWebSocket.close();
      this.deepLinkWebSocket = null;
    }
    if (this.deepLinkPollInterval) {
      clearInterval(this.deepLinkPollInterval);
      this.deepLinkPollInterval = null;
    }
    if (this.deepLinkCountdownInterval) {
      clearInterval(this.deepLinkCountdownInterval);
      this.deepLinkCountdownInterval = null;
    }
    this.deepLinkLoading.set(false);
    this.telegramLoading.set(false);
    this.deepLinkToken = "";
  }
  /**
   * 輪詢登入狀態（備用方案，WebSocket 失敗時使用）
   */
  startPollingLoginStatus() {
    if (this.deepLinkPollInterval) {
      clearInterval(this.deepLinkPollInterval);
    }
    const pollStatus = async () => {
      if (!this.deepLinkToken)
        return;
      try {
        console.log("[DeepLink Poll] Checking status...");
        const response = await fetch(`/api/v1/auth/login-token/${this.deepLinkToken}`);
        const result = await response.json();
        console.log("[DeepLink Poll] Response:", result);
        if (!result.success) {
          console.warn("[DeepLink Poll] Error:", result.error);
          return;
        }
        const { status, access_token, refresh_token, user } = result.data || {};
        console.log("[DeepLink Poll] Status:", status, "Has Token:", !!access_token);
        if (status === "confirmed" && access_token) {
          console.log("[DeepLink Poll] \u{1F389} Login confirmed via polling!");
          this.handleLoginSuccess({
            access_token,
            refresh_token,
            user
          });
        } else if (status === "expired") {
          this.cancelDeepLink();
          this.error.set("\u767B\u5165\u9023\u7D50\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u8A66");
        }
      } catch (e) {
        console.error("[DeepLink Poll] Error:", e);
      }
    };
    setTimeout(() => {
      if (this.deepLinkToken) {
        pollStatus();
        this.deepLinkPollInterval = setInterval(pollStatus, 2e3);
      }
    }, 3e3);
  }
  // ==================== 🆕 Phase 2: QR Code + WebSocket 登入 ====================
  /**
   * 切換登入方式
   */
  switchLoginMethod(method) {
    if (this.loginMethod() === "qrcode" && method !== "qrcode") {
      this.cleanupQRCode();
    }
    if (this.loginMethod() === "deeplink" && method !== "deeplink") {
      this.cancelDeepLink();
    }
    this.loginMethod.set(method);
    this.error.set(null);
    if (method === "qrcode" && !this.qrCodeUrl()) {
      this.generateQRCode();
    }
  }
  /**
   * 生成 QR Code
   */
  async generateQRCode() {
    this.qrCodeLoading.set(true);
    this.qrCodeExpired.set(false);
    this.error.set(null);
    try {
      const response = await fetch("/api/v1/auth/login-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "qr_code" })
      });
      const result = await response.json();
      if (!result.success || !result.data) {
        this.error.set(result.error || "\u7121\u6CD5\u751F\u6210\u4E8C\u7DAD\u78BC");
        this.qrCodeLoading.set(false);
        return;
      }
      const { token, deep_link_url, expires_in, qr_image, qr_fallback_url, verify_code } = result.data;
      this.qrToken = token;
      this.qrCountdown.set(expires_in || 300);
      this.verifyCode.set(verify_code || null);
      const qrDataUrl = qr_image || qr_fallback_url || this.generateQRCodeImage(deep_link_url);
      this.qrCodeUrl.set(qrDataUrl);
      this.connectWebSocket(token);
      this.startQRCountdown();
    } catch (e) {
      console.error("[QRCode] Error:", e);
      this.error.set(e.message || "\u751F\u6210\u4E8C\u7DAD\u78BC\u5931\u6557");
    } finally {
      this.qrCodeLoading.set(false);
    }
  }
  /**
   * 生成 QR Code 圖片 URL
   * 使用 Google Chart API（簡單可靠）
   */
  generateQRCodeImage(data) {
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&bgcolor=ffffff&color=000000&margin=10`;
  }
  /**
   * 刷新 QR Code
   */
  refreshQRCode() {
    this.cleanupQRCode();
    this.generateQRCode();
  }
  /**
   * 清理 QR Code 資源
   */
  cleanupQRCode() {
    if (this.qrWebSocket) {
      this.qrWebSocket.close();
      this.qrWebSocket = null;
    }
    if (this.qrCountdownInterval) {
      clearInterval(this.qrCountdownInterval);
      this.qrCountdownInterval = null;
    }
    this.qrToken = "";
    this.qrCodeUrl.set(null);
    this.qrCodeExpired.set(false);
    this.wsConnected.set(false);
  }
  /**
   * 開始 QR Code 倒計時
   */
  startQRCountdown() {
    if (this.qrCountdownInterval) {
      clearInterval(this.qrCountdownInterval);
    }
    this.qrCountdownInterval = setInterval(() => {
      const current = this.qrCountdown();
      if (current <= 0) {
        this.qrCodeExpired.set(true);
        clearInterval(this.qrCountdownInterval);
        this.qrCountdownInterval = null;
      } else {
        this.qrCountdown.set(current - 1);
      }
    }, 1e3);
  }
  /**
   * 建立 WebSocket 連接
   */
  connectWebSocket(token) {
    if (this.qrWebSocket) {
      this.qrWebSocket.close();
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/login-token/${token}`;
    console.log("[WebSocket] Connecting to:", wsUrl);
    try {
      this.qrWebSocket = new WebSocket(wsUrl);
      this.qrWebSocket.onopen = () => {
        console.log("[WebSocket] Connected");
        this.wsConnected.set(true);
      };
      this.qrWebSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WebSocket] Message:", data);
          if (data.type === "login_success" || data.event === "login_confirmed") {
            this.handleLoginSuccess(data.data);
          } else if (data.type === "login_token_update") {
            if (data.status === "confirmed") {
              this.qrWebSocket?.send(JSON.stringify({ type: "check_status" }));
            }
          } else if (data.status === "confirmed" && data.data?.access_token) {
            this.handleLoginSuccess(data.data);
          }
        } catch (e) {
          console.error("[WebSocket] Parse error:", e);
        }
      };
      this.qrWebSocket.onclose = () => {
        console.log("[WebSocket] Disconnected");
        this.wsConnected.set(false);
        if (!this.qrCodeExpired() && this.qrToken) {
          setTimeout(() => {
            if (this.qrToken && !this.qrCodeExpired()) {
              console.log("[WebSocket] Reconnecting...");
              this.connectWebSocket(this.qrToken);
            }
          }, 3e3);
        }
      };
      this.qrWebSocket.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
        this.wsConnected.set(false);
      };
      const heartbeat = setInterval(() => {
        if (this.qrWebSocket?.readyState === WebSocket.OPEN) {
          this.qrWebSocket.send(JSON.stringify({ type: "ping" }));
        } else {
          clearInterval(heartbeat);
        }
      }, 15e3);
    } catch (e) {
      console.error("[WebSocket] Create error:", e);
      this.wsConnected.set(false);
    }
  }
  /**
   * 處理登入成功
   *
   * 🆕 Phase 3: 添加成功動畫
   */
  handleLoginSuccess(data) {
    console.log("[Login] Success - Full data:", JSON.stringify(data));
    console.log("[Login] access_token exists:", !!data?.access_token);
    if (!data?.access_token) {
      console.error("[Login] \u274C No access_token in data!");
      this.error.set("\u767B\u5165\u5931\u6557\uFF1A\u672A\u6536\u5230\u8A8D\u8B49\u4EE4\u724C");
      return;
    }
    this.cleanupQRCode();
    this.cancelDeepLink();
    this.authService.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: data.user,
      session_id: data.session_id
    });
    this.ipcService.setAuthToken(data.access_token);
    console.log("[Login] \u2705 Session set via AuthService");
    console.log("[Login] isAuthenticated:", this.authService.isAuthenticated());
    this.successUserName.set(data?.user?.display_name || data?.user?.username || "User");
    this.loginSuccess.set(true);
    this.saveLoginPreference();
    const returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/dashboard";
    console.log("[Login] Will navigate to:", returnUrl, "in 1.5 seconds");
    setTimeout(() => {
      console.log("[Login] Navigating now...");
      console.log("[Login] Final check - isAuthenticated:", this.authService.isAuthenticated());
      console.log("[Login] Final check - accessToken:", !!this.authService.accessToken());
      this.router.navigateByUrl(returnUrl).then(() => {
        console.log("[Login] \u2705 Navigation complete");
      }).catch((err) => {
        console.error("[Login] Navigation error:", err);
        window.location.href = returnUrl;
      });
    }, 1500);
  }
  /**
   * 🆕 Phase 3: 保存登入方式偏好
   */
  saveLoginPreference() {
    try {
      localStorage.setItem("tgm_login_method", this.loginMethod());
    } catch (e) {
      console.debug("Could not save login preference");
    }
  }
  /**
   * 🆕 Phase 3: 讀取登入方式偏好
   */
  loadLoginPreference() {
    try {
      const saved = localStorage.getItem("tgm_login_method");
      if (saved === "qrcode" || saved === "deeplink" || saved === "widget") {
        return saved;
      }
    } catch (e) {
      console.debug("Could not load login preference");
    }
    return null;
  }
  // ==================== Telegram Widget 登入 ====================
  /**
   * 🆕 初始化嵌入式 Telegram Login Widget
   * 優點：自動檢測已登入的 Telegram 帳號，一鍵確認登入
   */
  async initTelegramWidget() {
    this.telegramLoading.set(true);
    this.error.set(null);
    try {
      const config = await this.authService.getTelegramConfig();
      if (!config.enabled || !config.bot_id) {
        this.error.set(this.t("auth.telegramNotConfigured"));
        return;
      }
      this.telegramBotUsername = config.bot_username || "";
      this.telegramBotId = config.bot_id;
      window.onTelegramAuth = (user) => {
        console.log("Telegram auth callback:", user);
        this.handleTelegramAuth(user);
      };
      try {
        await this.loadTelegramWidget();
      } catch (widgetError) {
        console.warn("Widget failed, falling back to OAuth:", widgetError);
        this.openTelegramOAuth();
      }
    } catch (e) {
      console.error("Telegram login error:", e);
      this.error.set(e.message || "Telegram \u767B\u5165\u5931\u6557");
    } finally {
      this.telegramLoading.set(false);
    }
  }
  /**
   * 🆕 載入 Telegram Login Widget（支持一鍵登入）
   */
  loadTelegramWidget() {
    return new Promise((resolve, reject) => {
      const popup = window.open("", "telegram-widget", "width=550,height=470,scrollbars=yes");
      if (!popup) {
        reject(new Error("Popup blocked"));
        return;
      }
      popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Telegram \u767B\u5165</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              flex-direction: column;
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              background: linear-gradient(135deg, #0f172a, #1e293b);
              color: white;
            }
            h2 { margin-bottom: 30px; }
            #telegram-login { min-height: 50px; }
            .hint { color: #94a3b8; font-size: 14px; margin-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <h2>\u4F7F\u7528 Telegram \u767B\u5165</h2>
          <div id="telegram-login"></div>
          <p class="hint">\u5982\u679C\u60A8\u5DF2\u5728\u700F\u89BD\u5668\u767B\u5165 Telegram\uFF0C\u5C07\u986F\u793A\u4E00\u9375\u767B\u5165\u6309\u9215</p>
          <script>
            window.onTelegramAuth = function(user) {
              window.opener.onTelegramAuth(user);
              window.close();
            };
          <\/script>
          <script async src="https://telegram.org/js/telegram-widget.js?22"
            data-telegram-login="${this.telegramBotUsername}"
            data-size="large"
            data-radius="8"
            data-onauth="onTelegramAuth(user)"
            data-request-access="write">
          <\/script>
        </body>
        </html>
      `);
      popup.document.close();
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve();
        }
      }, 500);
      setTimeout(() => {
        clearInterval(checkClosed);
        resolve();
      }, 3e4);
    });
  }
  /**
   * 🔧 改用 OAuth URL 重定向方式（更可靠）
   * 不依賴外部腳本加載，直接跳轉到 Telegram 授權頁面
   */
  openTelegramOAuth() {
    const callbackUrl = `${window.location.origin}/auth/telegram-callback`;
    const authUrl = `https://oauth.telegram.org/auth?bot_id=${this.telegramBotId}&origin=${encodeURIComponent(window.location.origin)}&request_access=write&return_to=${encodeURIComponent(callbackUrl)}`;
    console.log("Opening Telegram OAuth:", authUrl);
    const width = 550;
    const height = 470;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    const popup = window.open(authUrl, "telegram-oauth", `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    if (popup) {
      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            this.telegramLoading.set(false);
          }
        } catch (e) {
        }
      }, 500);
    }
  }
  async handleTelegramAuth(authData) {
    this.telegramLoading.set(true);
    this.error.set(null);
    console.log("[TelegramAuth] Processing auth data:", authData);
    try {
      let result = { success: false };
      let retries = 0;
      const maxRetries = 3;
      while (retries < maxRetries) {
        try {
          result = await this.authService.telegramLogin(authData);
          break;
        } catch (e) {
          retries++;
          console.warn(`[TelegramAuth] Retry ${retries}/${maxRetries}:`, e.message);
          if (retries >= maxRetries)
            throw e;
          await new Promise((r) => setTimeout(r, 1e3 * retries));
        }
      }
      if (result.success) {
        console.log("[TelegramAuth] Login successful, redirecting...");
        const returnUrl = this.route.snapshot.queryParams["returnUrl"] || "/dashboard";
        window.location.href = returnUrl;
      } else {
        console.error("[TelegramAuth] Login failed:", result.error);
        this.error.set(result.error || this.t("auth.telegramLoginFailed"));
      }
    } catch (e) {
      console.error("[TelegramAuth] Exception:", e);
      this.error.set(e.message || this.t("auth.telegramLoginFailed"));
    } finally {
      this.telegramLoading.set(false);
    }
  }
  static {
    this.\u0275fac = function LoginComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LoginComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginComponent, selectors: [["app-login"]], decls: 62, vars: 35, consts: [[1, "login-page"], [1, "success-overlay"], [1, "page-title"], [1, "page-subtitle"], [1, "lockout-alert"], [1, "error-alert"], [1, "login-form", 3, "ngSubmit"], [1, "form-group"], ["for", "email"], [1, "input-wrapper"], [1, "input-icon"], ["type", "email", "id", "email", "name", "email", "required", "", "autocomplete", "email", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], ["for", "password"], ["id", "password", "name", "password", "required", "", "autocomplete", "current-password", 3, "ngModelChange", "type", "ngModel", "placeholder", "disabled"], ["type", "button", 1, "toggle-password", 3, "click"], [1, "form-options"], [1, "checkbox-label"], ["type", "checkbox", "name", "rememberMe", 3, "ngModelChange", "ngModel"], ["routerLink", "/auth/forgot-password", 1, "forgot-link"], ["type", "submit", 1, "submit-btn", 3, "disabled"], [1, "divider"], [1, "telegram-login-section"], [1, "login-method-tabs"], [1, "method-tab", 3, "click"], [1, "tab-icon"], [1, "qr-login-panel"], [1, "deeplink-panel"], [1, "widget-panel"], [1, "register-link"], ["routerLink", "/auth/register"], [1, "success-content"], [1, "success-icon"], ["viewBox", "0 0 52 52", 1, "checkmark"], ["cx", "26", "cy", "26", "r", "25", "fill", "none", 1, "checkmark-circle"], ["fill", "none", "d", "M14.1 27.2l7.1 7.2 16.7-16.8", 1, "checkmark-check"], [1, "success-title"], [1, "success-user"], [1, "success-hint"], [1, "lockout-icon"], [1, "lockout-content"], [1, "lockout-title"], [1, "lockout-time"], [1, "error-icon"], [1, "loading-spinner"], [1, "qr-loading"], [1, "qr-container"], [1, "generate-qr-btn"], [1, "qr-code-wrapper"], [1, "qr-code-img", 3, "src", "alt"], [1, "qr-expired-overlay"], [1, "qr-instructions"], [1, "step"], [1, "step-num"], [1, "verify-code-section"], [1, "qr-countdown"], [1, "expired-text"], [1, "refresh-btn", 3, "click"], [1, "verify-hint"], [1, "verify-code"], [1, "ws-status"], [1, "countdown-text"], [1, "generate-qr-btn", 3, "click"], [1, "btn-icon"], [1, "social-btn", "telegram", "full-width", "primary-telegram", 3, "click", "disabled"], [1, "deep-link-status"], [1, "loading-spinner", "small"], [1, "social-icon"], [1, "status-text"], [1, "countdown"], [1, "cancel-btn", 3, "click"], [1, "social-btn", "telegram", "full-width", "secondary-telegram", 3, "click", "disabled"], [1, "widget-hint"]], template: function LoginComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0);
        \u0275\u0275conditionalCreate(1, LoginComponent_Conditional_1_Template, 12, 4, "div", 1);
        \u0275\u0275elementStart(2, "h2", 2);
        \u0275\u0275text(3);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "p", 3);
        \u0275\u0275text(5);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(6, LoginComponent_Conditional_6_Template, 8, 4, "div", 4);
        \u0275\u0275conditionalCreate(7, LoginComponent_Conditional_7_Template, 5, 1, "div", 5);
        \u0275\u0275elementStart(8, "form", 6);
        \u0275\u0275listener("ngSubmit", function LoginComponent_Template_form_ngSubmit_8_listener() {
          return ctx.onSubmit();
        });
        \u0275\u0275elementStart(9, "div", 7)(10, "label", 8);
        \u0275\u0275text(11);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "div", 9)(13, "span", 10);
        \u0275\u0275text(14, "\u{1F4E7}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "input", 11);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_15_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
          return $event;
        });
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(16, "div", 7)(17, "label", 12);
        \u0275\u0275text(18);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "div", 9)(20, "span", 10);
        \u0275\u0275text(21, "\u{1F512}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "input", 13);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_22_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(23, "button", 14);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_23_listener() {
          return ctx.showPassword.set(!ctx.showPassword());
        });
        \u0275\u0275text(24);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(25, "div", 15)(26, "label", 16)(27, "input", 17);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_27_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.rememberMe, $event) || (ctx.rememberMe = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "span");
        \u0275\u0275text(29);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(30, "a", 18);
        \u0275\u0275text(31);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(32, "button", 19);
        \u0275\u0275conditionalCreate(33, LoginComponent_Conditional_33_Template, 3, 1)(34, LoginComponent_Conditional_34_Template, 2, 1, "span");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(35, "div", 20)(36, "span");
        \u0275\u0275text(37);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(38, "div", 21)(39, "div", 22)(40, "button", 23);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_40_listener() {
          return ctx.switchLoginMethod("qrcode");
        });
        \u0275\u0275elementStart(41, "span", 24);
        \u0275\u0275text(42, "\u{1F4F7}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(43, "span");
        \u0275\u0275text(44);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(45, "button", 23);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_45_listener() {
          return ctx.switchLoginMethod("deeplink");
        });
        \u0275\u0275elementStart(46, "span", 24);
        \u0275\u0275text(47, "\u{1F4F1}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "span");
        \u0275\u0275text(49);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(50, "button", 23);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_50_listener() {
          return ctx.switchLoginMethod("widget");
        });
        \u0275\u0275elementStart(51, "span", 24);
        \u0275\u0275text(52, "\u{1F4AC}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "span");
        \u0275\u0275text(54);
        \u0275\u0275elementEnd()()();
        \u0275\u0275conditionalCreate(55, LoginComponent_Conditional_55_Template, 4, 1, "div", 25);
        \u0275\u0275conditionalCreate(56, LoginComponent_Conditional_56_Template, 5, 3, "div", 26);
        \u0275\u0275conditionalCreate(57, LoginComponent_Conditional_57_Template, 6, 3, "div", 27);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(58, "p", 28);
        \u0275\u0275text(59);
        \u0275\u0275elementStart(60, "a", 29);
        \u0275\u0275text(61);
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.loginSuccess() ? 1 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.welcomeBack"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.loginSubtitle"));
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLocked() ? 6 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.error() && !ctx.isLocked() ? 7 : -1);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.email"));
        \u0275\u0275advance(4);
        \u0275\u0275twoWayProperty("ngModel", ctx.email);
        \u0275\u0275property("placeholder", ctx.t("auth.emailPlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate(ctx.t("auth.password"));
        \u0275\u0275advance(4);
        \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
        \u0275\u0275twoWayProperty("ngModel", ctx.password);
        \u0275\u0275property("placeholder", ctx.t("auth.passwordPlaceholder"))("disabled", ctx.isLoading());
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.showPassword() ? "\u{1F648}" : "\u{1F441}\uFE0F", " ");
        \u0275\u0275advance(3);
        \u0275\u0275twoWayProperty("ngModel", ctx.rememberMe);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.rememberMe"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.forgotPassword"), " ");
        \u0275\u0275advance();
        \u0275\u0275property("disabled", ctx.isLoading() || !ctx.email || !ctx.password || ctx.isLocked());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLoading() ? 33 : 34);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.or"));
        \u0275\u0275advance(3);
        \u0275\u0275classProp("active", ctx.loginMethod() === "qrcode");
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.qrCodeLogin"));
        \u0275\u0275advance();
        \u0275\u0275classProp("active", ctx.loginMethod() === "deeplink");
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.appLogin"));
        \u0275\u0275advance();
        \u0275\u0275classProp("active", ctx.loginMethod() === "widget");
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.webLogin"));
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.loginMethod() === "qrcode" ? 55 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.loginMethod() === "deeplink" ? 56 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.loginMethod() === "widget" ? 57 : -1);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.noAccount"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.registerNow"));
      }
    }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, DefaultValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterModule, RouterLink], styles: ['\n\n.login-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.lockout-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem 1.25rem;\n  background: rgba(251, 146, 60, 0.1);\n  border: 1px solid rgba(251, 146, 60, 0.3);\n  border-radius: 8px;\n  color: #fb923c;\n  margin-bottom: 1.5rem;\n}\n.lockout-icon[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n}\n.lockout-content[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.lockout-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 0.9rem;\n}\n.lockout-time[_ngcontent-%COMP%] {\n  font-size: 0.8rem;\n  opacity: 0.8;\n}\n.login-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.form-options[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 0.875rem;\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n}\n.checkbox-label[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #3b82f6);\n}\n.forgot-link[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  transition: color 0.2s;\n}\n.forgot-link[_ngcontent-%COMP%]:hover {\n  color: var(--primary-hover, #60a5fa);\n  text-decoration: underline;\n}\n.submit-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.divider[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: var(--text-muted, #666);\n  font-size: 0.875rem;\n}\n.divider[_ngcontent-%COMP%]::before, \n.divider[_ngcontent-%COMP%]::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: var(--border-color, #333);\n}\n.divider[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  padding: 0 1rem;\n}\n.social-login[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n}\n.social-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.social-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, #252525);\n  border-color: var(--border-hover, #444);\n}\n.social-btn.google[_ngcontent-%COMP%]   .social-icon[_ngcontent-%COMP%] {\n  color: #ea4335;\n  font-weight: bold;\n}\n.social-btn.telegram[_ngcontent-%COMP%]   .social-icon[_ngcontent-%COMP%] {\n  color: #0088cc;\n}\n.social-btn.full-width[_ngcontent-%COMP%] {\n  width: 100%;\n  flex: none;\n}\n.social-btn.telegram[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0077b5);\n  border-color: #0088cc;\n}\n.social-btn.telegram[_ngcontent-%COMP%]:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0088cc);\n}\n.social-btn.primary-telegram[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border-color: #0088cc;\n  font-weight: 600;\n}\n.social-btn.primary-telegram[_ngcontent-%COMP%]:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0077bb);\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);\n}\n.social-btn.secondary-telegram[_ngcontent-%COMP%] {\n  background: transparent;\n  border: 1px solid #0088cc;\n  color: #0088cc;\n}\n.social-btn.secondary-telegram[_ngcontent-%COMP%]:hover {\n  background: rgba(0, 136, 204, 0.1);\n}\n.deep-link-status[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem;\n  background: rgba(0, 136, 204, 0.1);\n  border: 1px solid rgba(0, 136, 204, 0.3);\n  border-radius: 8px;\n  margin: 0.75rem 0;\n}\n.deep-link-status[_ngcontent-%COMP%]   .status-text[_ngcontent-%COMP%] {\n  color: #0088cc;\n  font-size: 0.875rem;\n  text-align: center;\n}\n.deep-link-status[_ngcontent-%COMP%]   .countdown[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.deep-link-status[_ngcontent-%COMP%]   .cancel-btn[_ngcontent-%COMP%] {\n  padding: 0.375rem 1rem;\n  background: transparent;\n  border: 1px solid #888;\n  border-radius: 4px;\n  color: #888;\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.deep-link-status[_ngcontent-%COMP%]   .cancel-btn[_ngcontent-%COMP%]:hover {\n  background: rgba(255, 255, 255, 0.1);\n  border-color: #fff;\n  color: #fff;\n}\n.social-login[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.telegram-widget-container[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 48px;\n  width: 100%;\n}\n.telegram-widget-container[_ngcontent-%COMP%]   iframe[_ngcontent-%COMP%] {\n  border-radius: 8px !important;\n}\n#telegram-login-widget[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n}\n.loading-spinner.small[_ngcontent-%COMP%] {\n  width: 14px;\n  height: 14px;\n  border-width: 2px;\n}\n.register-link[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.register-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.register-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n.telegram-login-section[_ngcontent-%COMP%] {\n  margin-top: 0.5rem;\n}\n.login-method-tabs[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.25rem;\n  background: var(--bg-secondary, #1a1a1a);\n  padding: 0.25rem;\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.method-tab[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.5rem;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.method-tab[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, #252525);\n  color: var(--text-primary, #fff);\n}\n.method-tab.active[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  color: #fff;\n}\n.tab-icon[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n}\n.qr-login-panel[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  border: 1px solid var(--border-color, #333);\n}\n.qr-loading[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n.qr-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n  width: 100%;\n}\n.qr-code-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  padding: 1rem;\n  background: #fff;\n  border-radius: 12px;\n  box-shadow: 0 4px 20px rgba(0, 136, 204, 0.2);\n}\n.qr-code-img[_ngcontent-%COMP%] {\n  width: 180px;\n  height: 180px;\n  display: block;\n}\n.qr-expired-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.85);\n  border-radius: 12px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n}\n.expired-text[_ngcontent-%COMP%] {\n  color: #f87171;\n  font-size: 0.875rem;\n}\n.refresh-btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 6px;\n  color: #fff;\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: transform 0.2s ease;\n}\n.refresh-btn[_ngcontent-%COMP%]:hover {\n  transform: scale(1.05);\n}\n.qr-instructions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  width: 100%;\n}\n.qr-instructions[_ngcontent-%COMP%]   .step[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  margin: 0;\n}\n.step-num[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.5rem;\n  height: 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n}\n.verify-code-section[_ngcontent-%COMP%] {\n  margin-top: 1.25rem;\n  padding-top: 1.25rem;\n  border-top: 1px dashed var(--border-color, #333);\n  text-align: center;\n}\n.verify-hint[_ngcontent-%COMP%] {\n  font-size: 0.8rem;\n  color: var(--text-muted, #666);\n  margin-bottom: 0.75rem;\n}\n.verify-code[_ngcontent-%COMP%] {\n  font-family: "Courier New", monospace;\n  font-size: 2rem;\n  font-weight: 700;\n  letter-spacing: 0.5rem;\n  padding: 0.75rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(14, 165, 233, 0.15),\n      rgba(139, 92, 246, 0.15));\n  border: 2px solid rgba(14, 165, 233, 0.3);\n  border-radius: 12px;\n  color: #0ea5e9;\n  display: inline-block;\n  border-radius: 50%;\n  color: #fff;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.qr-countdown[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n  padding: 0.5rem 0;\n  border-top: 1px solid var(--border-color, #333);\n  margin-top: 0.5rem;\n}\n.ws-status[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: #f87171;\n}\n.ws-status.connected[_ngcontent-%COMP%] {\n  color: #4ade80;\n}\n.countdown-text[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.generate-qr-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 1rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.generate-qr-btn[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);\n}\n.btn-icon[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n}\n.deeplink-panel[_ngcontent-%COMP%], \n.widget-panel[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.widget-hint[_ngcontent-%COMP%] {\n  text-align: center;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n  margin: 0;\n}\n.success-overlay[_ngcontent-%COMP%] {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.9);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 9999;\n  animation: _ngcontent-%COMP%_fadeIn 0.3s ease-out;\n}\n@keyframes _ngcontent-%COMP%_fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n.success-content[_ngcontent-%COMP%] {\n  text-align: center;\n  animation: _ngcontent-%COMP%_scaleIn 0.4s ease-out;\n}\n@keyframes _ngcontent-%COMP%_scaleIn {\n  from {\n    transform: scale(0.8);\n    opacity: 0;\n  }\n  to {\n    transform: scale(1);\n    opacity: 1;\n  }\n}\n.success-icon[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  margin: 0 auto 1.5rem;\n}\n.checkmark[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  display: block;\n  stroke-width: 2;\n  stroke: #4ade80;\n  stroke-miterlimit: 10;\n  animation: _ngcontent-%COMP%_fill 0.4s ease-in-out 0.4s forwards, _ngcontent-%COMP%_scale 0.3s ease-in-out 0.9s both;\n}\n.checkmark-circle[_ngcontent-%COMP%] {\n  stroke-dasharray: 166;\n  stroke-dashoffset: 166;\n  stroke-width: 2;\n  stroke-miterlimit: 10;\n  stroke: #4ade80;\n  fill: none;\n  animation: _ngcontent-%COMP%_stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;\n}\n.checkmark-check[_ngcontent-%COMP%] {\n  transform-origin: 50% 50%;\n  stroke-dasharray: 48;\n  stroke-dashoffset: 48;\n  animation: _ngcontent-%COMP%_stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;\n}\n@keyframes _ngcontent-%COMP%_stroke {\n  100% {\n    stroke-dashoffset: 0;\n  }\n}\n@keyframes _ngcontent-%COMP%_scale {\n  0%, 100% {\n    transform: none;\n  }\n  50% {\n    transform: scale3d(1.1, 1.1, 1);\n  }\n}\n@keyframes _ngcontent-%COMP%_fill {\n  100% {\n    box-shadow: inset 0px 0px 0px 40px rgba(74, 222, 128, 0.1);\n  }\n}\n.success-title[_ngcontent-%COMP%] {\n  color: #4ade80;\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0 0 0.5rem;\n}\n.success-user[_ngcontent-%COMP%] {\n  color: #fff;\n  font-size: 1rem;\n  margin: 0 0 0.5rem;\n}\n.success-hint[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  margin: 0;\n  animation: _ngcontent-%COMP%_pulse 1s infinite;\n}\n@keyframes _ngcontent-%COMP%_pulse {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n/*# sourceMappingURL=login.component.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LoginComponent, [{
    type: Component,
    args: [{ selector: "app-login", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="login-page">
      <!-- \u{1F195} Phase 3: \u767B\u5165\u6210\u529F\u52D5\u756B\u906E\u7F69 -->
      @if (loginSuccess()) {
        <div class="success-overlay">
          <div class="success-content">
            <div class="success-icon">
              <svg viewBox="0 0 52 52" class="checkmark">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <h3 class="success-title">{{ t('auth.loginSuccess') }}</h3>
            <p class="success-user">{{ t('auth.welcomeBackUser') }}\uFF0C{{ successUserName() }}</p>
            <p class="success-hint">{{ t('auth.redirecting') }}</p>
          </div>
        </div>
      }
      
      <h2 class="page-title">{{ t('auth.welcomeBack') }}</h2>
      <p class="page-subtitle">{{ t('auth.loginSubtitle') }}</p>
      
      <!-- \u9396\u5B9A\u63D0\u793A -->
      @if (isLocked()) {
        <div class="lockout-alert">
          <span class="lockout-icon">\u{1F512}</span>
          <div class="lockout-content">
            <span class="lockout-title">{{ t('auth.accountLocked') }}</span>
            <span class="lockout-time">{{ t('auth.waitSeconds', {seconds: lockoutRemaining()}) }}</span>
          </div>
        </div>
      }
      
      <!-- \u932F\u8AA4\u63D0\u793A -->
      @if (error() && !isLocked()) {
        <div class="error-alert">
          <span class="error-icon">\u26A0\uFE0F</span>
          <span>{{ error() }}</span>
        </div>
      }
      
      <form class="login-form" (ngSubmit)="onSubmit()">
        <!-- \u90F5\u7BB1 -->
        <div class="form-group">
          <label for="email">{{ t('auth.email') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F4E7}</span>
            <input
              type="email"
              id="email"
              [(ngModel)]="email"
              name="email"
              [placeholder]="t('auth.emailPlaceholder')"
              required
              autocomplete="email"
              [disabled]="isLoading()"
            />
          </div>
        </div>
        
        <!-- \u5BC6\u78BC -->
        <div class="form-group">
          <label for="password">{{ t('auth.password') }}</label>
          <div class="input-wrapper">
            <span class="input-icon">\u{1F512}</span>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              id="password"
              [(ngModel)]="password"
              name="password"
              [placeholder]="t('auth.passwordPlaceholder')"
              required
              autocomplete="current-password"
              [disabled]="isLoading()"
            />
            <button 
              type="button" 
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
            >
              {{ showPassword() ? '\u{1F648}' : '\u{1F441}\uFE0F' }}
            </button>
          </div>
        </div>
        
        <!-- \u8A18\u4F4F\u6211 & \u5FD8\u8A18\u5BC6\u78BC -->
        <div class="form-options">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              [(ngModel)]="rememberMe" 
              name="rememberMe"
            />
            <span>{{ t('auth.rememberMe') }}</span>
          </label>
          <a routerLink="/auth/forgot-password" class="forgot-link">
            {{ t('auth.forgotPassword') }}
          </a>
        </div>
        
        <!-- \u767B\u5165\u6309\u9215 -->
        <button 
          type="submit" 
          class="submit-btn"
          [disabled]="isLoading() || !email || !password || isLocked()"
        >
          @if (isLoading()) {
            <span class="loading-spinner"></span>
            <span>{{ t('auth.loggingIn') }}</span>
          } @else {
            <span>{{ t('auth.login') }}</span>
          }
        </button>
      </form>
      
      <!-- \u5206\u9694\u7DDA -->
      <div class="divider">
        <span>{{ t('auth.or') }}</span>
      </div>
      
      <!-- \u{1F195} Phase 2: \u591A\u7A2E Telegram \u767B\u5165\u65B9\u5F0F\uFF08\u542B QR Code\uFF09 -->
      <div class="telegram-login-section">
        <!-- \u767B\u5165\u65B9\u5F0F\u9078\u64C7\u5668 -->
        <div class="login-method-tabs">
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'qrcode'"
            (click)="switchLoginMethod('qrcode')"
          >
            <span class="tab-icon">\u{1F4F7}</span>
            <span>{{ t('auth.qrCodeLogin') }}</span>
          </button>
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'deeplink'"
            (click)="switchLoginMethod('deeplink')"
          >
            <span class="tab-icon">\u{1F4F1}</span>
            <span>{{ t('auth.appLogin') }}</span>
          </button>
          <button 
            class="method-tab" 
            [class.active]="loginMethod() === 'widget'"
            (click)="switchLoginMethod('widget')"
          >
            <span class="tab-icon">\u{1F4AC}</span>
            <span>{{ t('auth.webLogin') }}</span>
          </button>
        </div>
        
        <!-- QR Code \u767B\u5165\uFF08\u9ED8\u8A8D\uFF09 -->
        @if (loginMethod() === 'qrcode') {
          <div class="qr-login-panel">
            @if (qrCodeLoading()) {
              <div class="qr-loading">
                <span class="loading-spinner"></span>
                <span>{{ t('auth.generatingQR') }}</span>
              </div>
            } @else if (qrCodeUrl()) {
              <div class="qr-container">
                <div class="qr-code-wrapper">
                  <img [src]="qrCodeUrl()" [alt]="t('auth.telegramLoginQR')" class="qr-code-img" />
                  @if (qrCodeExpired()) {
                    <div class="qr-expired-overlay">
                      <span class="expired-text">{{ t('auth.qrExpired') }}</span>
                      <button class="refresh-btn" (click)="refreshQRCode()">{{ t('auth.clickToRefresh') }}</button>
                    </div>
                  }
                </div>
                <div class="qr-instructions">
                  <p class="step"><span class="step-num">1</span> {{ t('auth.openTelegram') }}</p>
                  <p class="step"><span class="step-num">2</span> {{ t('auth.scanQRCode') }}</p>
                  <p class="step"><span class="step-num">3</span> {{ t('auth.confirmLogin') }}</p>
                </div>
                
                <!-- \u{1F195} \u9A57\u8B49\u78BC\uFF08\u8001\u7528\u6236\u5099\u7528\uFF09 -->
                @if (verifyCode()) {
                  <div class="verify-code-section">
                    <p class="verify-hint">\u6383\u78BC\u7121\u6548\uFF1F\u5728 Bot \u4E2D\u8F38\u5165\u9A57\u8B49\u78BC\uFF1A</p>
                    <div class="verify-code">{{ verifyCode() }}</div>
                  </div>
                }
                @if (!qrCodeExpired()) {
                  <div class="qr-countdown">
                    <span class="ws-status" [class.connected]="wsConnected()">
                      {{ wsConnected() ? ('\u{1F7E2} ' + t('auth.realtimeConnected')) : ('\u{1F534} ' + t('auth.reconnecting')) }}
                    </span>
                    <span class="countdown-text">{{ qrCountdown() }}s</span>
                  </div>
                }
              </div>
            } @else {
              <button class="generate-qr-btn" (click)="generateQRCode()">
                <span class="btn-icon">\u{1F4F7}</span>
                <span>{{ t('auth.generateQRCode') }}</span>
              </button>
            }
          </div>
        }
        
        <!-- Deep Link \u767B\u5165 -->
        @if (loginMethod() === 'deeplink') {
          <div class="deeplink-panel">
            <button 
              class="social-btn telegram full-width primary-telegram" 
              (click)="openDeepLink()"
              [disabled]="telegramLoading()"
            >
              @if (deepLinkLoading()) {
                <span class="loading-spinner small"></span>
                <span>{{ t('auth.waitingConfirm') }}</span>
              } @else {
                <span class="social-icon">\u{1F4F1}</span>
                <span>{{ t('auth.openTelegramApp') }}</span>
              }
            </button>
            
            @if (deepLinkLoading()) {
              <div class="deep-link-status">
                <div class="status-text">
                  {{ t('auth.clickConfirmInTelegram') }}
                </div>
                <div class="countdown">
                  {{ t('auth.remainingTime', {seconds: deepLinkCountdown()}) }}
                </div>
                <button class="cancel-btn" (click)="cancelDeepLink()">{{ t('auth.cancel') }}</button>
              </div>
            }
          </div>
        }
        
        <!-- Widget \u767B\u5165\uFF08\u5099\u7528\uFF09 -->
        @if (loginMethod() === 'widget') {
          <div class="widget-panel">
            <button 
              class="social-btn telegram full-width secondary-telegram" 
              (click)="initTelegramWidget()"
              [disabled]="telegramLoading()"
            >
              @if (telegramLoading() && !deepLinkLoading()) {
                <span class="loading-spinner small"></span>
                <span>{{ t('auth.loadingTelegram') }}</span>
              } @else {
                <span class="social-icon">\u{1F4AC}</span>
                <span>{{ t('auth.useTelegramWidget') }}</span>
              }
            </button>
            <p class="widget-hint">{{ t('auth.widgetHint') }}</p>
          </div>
        }
      </div>
      
      <!-- \u8A3B\u518A\u5165\u53E3 -->
      <p class="register-link">
        {{ t('auth.noAccount') }}
        <a routerLink="/auth/register">{{ t('auth.registerNow') }}</a>
      </p>
    </div>
  `, styles: ['/* angular:styles/component:css;ba697e53023b395bc91bdfe075fb995da26d71c6e934c2036ff9455516962569;D:/tgkz2026/src/auth/login.component.ts */\n.login-page {\n  color: var(--text-primary, #fff);\n}\n.page-title {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.lockout-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem 1.25rem;\n  background: rgba(251, 146, 60, 0.1);\n  border: 1px solid rgba(251, 146, 60, 0.3);\n  border-radius: 8px;\n  color: #fb923c;\n  margin-bottom: 1.5rem;\n}\n.lockout-icon {\n  font-size: 1.5rem;\n}\n.lockout-content {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.lockout-title {\n  font-weight: 600;\n  font-size: 0.9rem;\n}\n.lockout-time {\n  font-size: 0.8rem;\n  opacity: 0.8;\n}\n.login-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper input {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper input::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password:hover {\n  opacity: 1;\n}\n.form-options {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 0.875rem;\n}\n.checkbox-label {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n}\n.checkbox-label input[type=checkbox] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #3b82f6);\n}\n.forgot-link {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  transition: color 0.2s;\n}\n.forgot-link:hover {\n  color: var(--primary-hover, #60a5fa);\n  text-decoration: underline;\n}\n.submit-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.divider {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: var(--text-muted, #666);\n  font-size: 0.875rem;\n}\n.divider::before,\n.divider::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: var(--border-color, #333);\n}\n.divider span {\n  padding: 0 1rem;\n}\n.social-login {\n  display: flex;\n  gap: 1rem;\n}\n.social-btn {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.social-btn:hover {\n  background: var(--bg-tertiary, #252525);\n  border-color: var(--border-hover, #444);\n}\n.social-btn.google .social-icon {\n  color: #ea4335;\n  font-weight: bold;\n}\n.social-btn.telegram .social-icon {\n  color: #0088cc;\n}\n.social-btn.full-width {\n  width: 100%;\n  flex: none;\n}\n.social-btn.telegram {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0077b5);\n  border-color: #0088cc;\n}\n.social-btn.telegram:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0088cc);\n}\n.social-btn.primary-telegram {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border-color: #0088cc;\n  font-weight: 600;\n}\n.social-btn.primary-telegram:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0077bb);\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);\n}\n.social-btn.secondary-telegram {\n  background: transparent;\n  border: 1px solid #0088cc;\n  color: #0088cc;\n}\n.social-btn.secondary-telegram:hover {\n  background: rgba(0, 136, 204, 0.1);\n}\n.deep-link-status {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem;\n  background: rgba(0, 136, 204, 0.1);\n  border: 1px solid rgba(0, 136, 204, 0.3);\n  border-radius: 8px;\n  margin: 0.75rem 0;\n}\n.deep-link-status .status-text {\n  color: #0088cc;\n  font-size: 0.875rem;\n  text-align: center;\n}\n.deep-link-status .countdown {\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n}\n.deep-link-status .cancel-btn {\n  padding: 0.375rem 1rem;\n  background: transparent;\n  border: 1px solid #888;\n  border-radius: 4px;\n  color: #888;\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.deep-link-status .cancel-btn:hover {\n  background: rgba(255, 255, 255, 0.1);\n  border-color: #fff;\n  color: #fff;\n}\n.social-login {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.telegram-widget-container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 48px;\n  width: 100%;\n}\n.telegram-widget-container iframe {\n  border-radius: 8px !important;\n}\n#telegram-login-widget {\n  display: flex;\n  justify-content: center;\n}\n.loading-spinner.small {\n  width: 14px;\n  height: 14px;\n  border-width: 2px;\n}\n.register-link {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.register-link a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.register-link a:hover {\n  text-decoration: underline;\n}\n.telegram-login-section {\n  margin-top: 0.5rem;\n}\n.login-method-tabs {\n  display: flex;\n  gap: 0.25rem;\n  background: var(--bg-secondary, #1a1a1a);\n  padding: 0.25rem;\n  border-radius: 8px;\n  margin-bottom: 1rem;\n}\n.method-tab {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.25rem;\n  padding: 0.5rem;\n  background: transparent;\n  border: none;\n  border-radius: 6px;\n  color: var(--text-secondary, #888);\n  font-size: 0.75rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.method-tab:hover {\n  background: var(--bg-tertiary, #252525);\n  color: var(--text-primary, #fff);\n}\n.method-tab.active {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  color: #fff;\n}\n.tab-icon {\n  font-size: 1.25rem;\n}\n.qr-login-panel {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  padding: 1.5rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border-radius: 12px;\n  border: 1px solid var(--border-color, #333);\n}\n.qr-loading {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n  padding: 2rem;\n  color: var(--text-secondary, #888);\n}\n.qr-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 1rem;\n  width: 100%;\n}\n.qr-code-wrapper {\n  position: relative;\n  padding: 1rem;\n  background: #fff;\n  border-radius: 12px;\n  box-shadow: 0 4px 20px rgba(0, 136, 204, 0.2);\n}\n.qr-code-img {\n  width: 180px;\n  height: 180px;\n  display: block;\n}\n.qr-expired-overlay {\n  position: absolute;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.85);\n  border-radius: 12px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  gap: 0.75rem;\n}\n.expired-text {\n  color: #f87171;\n  font-size: 0.875rem;\n}\n.refresh-btn {\n  padding: 0.5rem 1rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 6px;\n  color: #fff;\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: transform 0.2s ease;\n}\n.refresh-btn:hover {\n  transform: scale(1.05);\n}\n.qr-instructions {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  width: 100%;\n}\n.qr-instructions .step {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  margin: 0;\n}\n.step-num {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 1.5rem;\n  height: 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n}\n.verify-code-section {\n  margin-top: 1.25rem;\n  padding-top: 1.25rem;\n  border-top: 1px dashed var(--border-color, #333);\n  text-align: center;\n}\n.verify-hint {\n  font-size: 0.8rem;\n  color: var(--text-muted, #666);\n  margin-bottom: 0.75rem;\n}\n.verify-code {\n  font-family: "Courier New", monospace;\n  font-size: 2rem;\n  font-weight: 700;\n  letter-spacing: 0.5rem;\n  padding: 0.75rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(14, 165, 233, 0.15),\n      rgba(139, 92, 246, 0.15));\n  border: 2px solid rgba(14, 165, 233, 0.3);\n  border-radius: 12px;\n  color: #0ea5e9;\n  display: inline-block;\n  border-radius: 50%;\n  color: #fff;\n  font-size: 0.75rem;\n  font-weight: 600;\n}\n.qr-countdown {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  width: 100%;\n  padding: 0.5rem 0;\n  border-top: 1px solid var(--border-color, #333);\n  margin-top: 0.5rem;\n}\n.ws-status {\n  font-size: 0.75rem;\n  color: #f87171;\n}\n.ws-status.connected {\n  color: #4ade80;\n}\n.countdown-text {\n  font-size: 0.875rem;\n  color: var(--text-secondary, #888);\n}\n.generate-qr-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 1rem 2rem;\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0066aa);\n  border: none;\n  border-radius: 8px;\n  color: #fff;\n  font-size: 1rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.generate-qr-btn:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);\n}\n.btn-icon {\n  font-size: 1.25rem;\n}\n.deeplink-panel,\n.widget-panel {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.widget-hint {\n  text-align: center;\n  font-size: 0.75rem;\n  color: var(--text-secondary, #888);\n  margin: 0;\n}\n.success-overlay {\n  position: fixed;\n  inset: 0;\n  background: rgba(0, 0, 0, 0.9);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  z-index: 9999;\n  animation: fadeIn 0.3s ease-out;\n}\n@keyframes fadeIn {\n  from {\n    opacity: 0;\n  }\n  to {\n    opacity: 1;\n  }\n}\n.success-content {\n  text-align: center;\n  animation: scaleIn 0.4s ease-out;\n}\n@keyframes scaleIn {\n  from {\n    transform: scale(0.8);\n    opacity: 0;\n  }\n  to {\n    transform: scale(1);\n    opacity: 1;\n  }\n}\n.success-icon {\n  width: 80px;\n  height: 80px;\n  margin: 0 auto 1.5rem;\n}\n.checkmark {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  display: block;\n  stroke-width: 2;\n  stroke: #4ade80;\n  stroke-miterlimit: 10;\n  animation: fill 0.4s ease-in-out 0.4s forwards, scale 0.3s ease-in-out 0.9s both;\n}\n.checkmark-circle {\n  stroke-dasharray: 166;\n  stroke-dashoffset: 166;\n  stroke-width: 2;\n  stroke-miterlimit: 10;\n  stroke: #4ade80;\n  fill: none;\n  animation: stroke 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;\n}\n.checkmark-check {\n  transform-origin: 50% 50%;\n  stroke-dasharray: 48;\n  stroke-dashoffset: 48;\n  animation: stroke 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.8s forwards;\n}\n@keyframes stroke {\n  100% {\n    stroke-dashoffset: 0;\n  }\n}\n@keyframes scale {\n  0%, 100% {\n    transform: none;\n  }\n  50% {\n    transform: scale3d(1.1, 1.1, 1);\n  }\n}\n@keyframes fill {\n  100% {\n    box-shadow: inset 0px 0px 0px 40px rgba(74, 222, 128, 0.1);\n  }\n}\n.success-title {\n  color: #4ade80;\n  font-size: 1.5rem;\n  font-weight: 600;\n  margin: 0 0 0.5rem;\n}\n.success-user {\n  color: #fff;\n  font-size: 1rem;\n  margin: 0 0 0.5rem;\n}\n.success-hint {\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n  margin: 0;\n  animation: pulse 1s infinite;\n}\n@keyframes pulse {\n  0%, 100% {\n    opacity: 1;\n  }\n  50% {\n    opacity: 0.5;\n  }\n}\n/*# sourceMappingURL=login.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "src/auth/login.component.ts", lineNumber: 1002 });
})();
export {
  LoginComponent
};
//# sourceMappingURL=chunk-XPH4K23X.js.map
