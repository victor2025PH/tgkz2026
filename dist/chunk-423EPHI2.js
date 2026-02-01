import {
  AuthService
} from "./chunk-U7RNLJAQ.js";
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterModule
} from "./chunk-6TNMQ6CH.js";
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
} from "./chunk-G42HF5FJ.js";
import {
  I18nService
} from "./chunk-NBYDSPUQ.js";
import {
  CommonModule
} from "./chunk-7CO55ZOM.js";
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
  ɵɵconditional,
  ɵɵconditionalCreate,
  ɵɵdefineComponent,
  ɵɵdefineInjectable,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-Y4VZODST.js";

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
function LoginComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3)(1, "span", 24);
    \u0275\u0275text(2, "\u{1F512}");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 25)(4, "span", 26);
    \u0275\u0275text(5, "\u5E33\u865F\u66AB\u6642\u9396\u5B9A");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 27);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1("\u8ACB\u7B49\u5F85 ", ctx_r0.lockoutRemaining(), " \u79D2\u5F8C\u91CD\u8A66");
  }
}
function LoginComponent_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4)(1, "span", 28);
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
function LoginComponent_Conditional_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 29);
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
function LoginComponent_Conditional_33_Template(rf, ctx) {
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
function LoginComponent_Conditional_39_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 30);
    \u0275\u0275elementStart(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.loadingTelegram"));
  }
}
function LoginComponent_Conditional_40_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 31);
    \u0275\u0275text(1, "\u2708\uFE0F");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.t("auth.loginWithTelegram"));
  }
}
var LoginComponent = class _LoginComponent {
  constructor() {
    this.authService = inject(AuthService);
    this.router = inject(Router);
    this.route = inject(ActivatedRoute);
    this.i18n = inject(I18nService);
    this.security = inject(FrontendSecurityService);
    this.email = "";
    this.password = "";
    this.rememberMe = false;
    this.showPassword = signal(false, ...ngDevMode ? [{ debugName: "showPassword" }] : []);
    this.isLoading = signal(false, ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.telegramLoading = signal(false, ...ngDevMode ? [{ debugName: "telegramLoading" }] : []);
    this.telegramWidgetReady = signal(false, ...ngDevMode ? [{ debugName: "telegramWidgetReady" }] : []);
    this.error = signal(null, ...ngDevMode ? [{ debugName: "error" }] : []);
    this.isLocked = computed(() => this.security.isLocked(), ...ngDevMode ? [{ debugName: "isLocked" }] : []);
    this.lockoutRemaining = computed(() => this.security.lockoutRemaining(), ...ngDevMode ? [{ debugName: "lockoutRemaining" }] : []);
    this.attemptsLeft = computed(() => this.security.attemptsLeft(), ...ngDevMode ? [{ debugName: "attemptsLeft" }] : []);
    this.telegramBotUsername = "";
    this.telegramBotId = "";
    this.lockoutCleanup = null;
  }
  ngOnInit() {
    this.checkLoginLimit();
  }
  ngOnDestroy() {
    this.lockoutCleanup?.();
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
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginComponent, selectors: [["app-login"]], decls: 45, vars: 24, consts: [[1, "login-page"], [1, "page-title"], [1, "page-subtitle"], [1, "lockout-alert"], [1, "error-alert"], [1, "login-form", 3, "ngSubmit"], [1, "form-group"], ["for", "email"], [1, "input-wrapper"], [1, "input-icon"], ["type", "email", "id", "email", "name", "email", "required", "", "autocomplete", "email", 3, "ngModelChange", "ngModel", "placeholder", "disabled"], ["for", "password"], ["id", "password", "name", "password", "required", "", "autocomplete", "current-password", 3, "ngModelChange", "type", "ngModel", "placeholder", "disabled"], ["type", "button", 1, "toggle-password", 3, "click"], [1, "form-options"], [1, "checkbox-label"], ["type", "checkbox", "name", "rememberMe", 3, "ngModelChange", "ngModel"], ["routerLink", "/auth/forgot-password", 1, "forgot-link"], ["type", "submit", 1, "submit-btn", 3, "disabled"], [1, "divider"], [1, "social-login"], [1, "social-btn", "telegram", "full-width", 3, "click", "disabled"], [1, "register-link"], ["routerLink", "/auth/register"], [1, "lockout-icon"], [1, "lockout-content"], [1, "lockout-title"], [1, "lockout-time"], [1, "error-icon"], [1, "loading-spinner"], [1, "loading-spinner", "small"], [1, "social-icon"]], template: function LoginComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "h2", 1);
        \u0275\u0275text(2);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(3, "p", 2);
        \u0275\u0275text(4);
        \u0275\u0275elementEnd();
        \u0275\u0275conditionalCreate(5, LoginComponent_Conditional_5_Template, 8, 1, "div", 3);
        \u0275\u0275conditionalCreate(6, LoginComponent_Conditional_6_Template, 5, 1, "div", 4);
        \u0275\u0275elementStart(7, "form", 5);
        \u0275\u0275listener("ngSubmit", function LoginComponent_Template_form_ngSubmit_7_listener() {
          return ctx.onSubmit();
        });
        \u0275\u0275elementStart(8, "div", 6)(9, "label", 7);
        \u0275\u0275text(10);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "div", 8)(12, "span", 9);
        \u0275\u0275text(13, "\u{1F4E7}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "input", 10);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_14_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.email, $event) || (ctx.email = $event);
          return $event;
        });
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(15, "div", 6)(16, "label", 11);
        \u0275\u0275text(17);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "div", 8)(19, "span", 9);
        \u0275\u0275text(20, "\u{1F512}");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "input", 12);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_21_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.password, $event) || (ctx.password = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "button", 13);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_22_listener() {
          return ctx.showPassword.set(!ctx.showPassword());
        });
        \u0275\u0275text(23);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(24, "div", 14)(25, "label", 15)(26, "input", 16);
        \u0275\u0275twoWayListener("ngModelChange", function LoginComponent_Template_input_ngModelChange_26_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.rememberMe, $event) || (ctx.rememberMe = $event);
          return $event;
        });
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "span");
        \u0275\u0275text(28);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(29, "a", 17);
        \u0275\u0275text(30);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(31, "button", 18);
        \u0275\u0275conditionalCreate(32, LoginComponent_Conditional_32_Template, 3, 1)(33, LoginComponent_Conditional_33_Template, 2, 1, "span");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(34, "div", 19)(35, "span");
        \u0275\u0275text(36);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(37, "div", 20)(38, "button", 21);
        \u0275\u0275listener("click", function LoginComponent_Template_button_click_38_listener() {
          return ctx.initTelegramWidget();
        });
        \u0275\u0275conditionalCreate(39, LoginComponent_Conditional_39_Template, 3, 1)(40, LoginComponent_Conditional_40_Template, 4, 1);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(41, "p", 22);
        \u0275\u0275text(42);
        \u0275\u0275elementStart(43, "a", 23);
        \u0275\u0275text(44);
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.welcomeBack"));
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.loginSubtitle"));
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.isLocked() ? 5 : -1);
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.error() && !ctx.isLocked() ? 6 : -1);
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
        \u0275\u0275conditional(ctx.isLoading() ? 32 : 33);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.t("auth.or"));
        \u0275\u0275advance(2);
        \u0275\u0275property("disabled", ctx.telegramLoading());
        \u0275\u0275advance();
        \u0275\u0275conditional(ctx.telegramLoading() ? 39 : 40);
        \u0275\u0275advance(3);
        \u0275\u0275textInterpolate1(" ", ctx.t("auth.noAccount"), " ");
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.t("auth.registerNow"));
      }
    }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, DefaultValueAccessor, CheckboxControlValueAccessor, NgControlStatus, NgControlStatusGroup, RequiredValidator, NgModel, NgForm, RouterModule, RouterLink], styles: ['\n\n.login-page[_ngcontent-%COMP%] {\n  color: var(--text-primary, #fff);\n}\n.page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.lockout-alert[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem 1.25rem;\n  background: rgba(251, 146, 60, 0.1);\n  border: 1px solid rgba(251, 146, 60, 0.3);\n  border-radius: 8px;\n  color: #fb923c;\n  margin-bottom: 1.5rem;\n}\n.lockout-icon[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n}\n.lockout-content[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.lockout-title[_ngcontent-%COMP%] {\n  font-weight: 600;\n  font-size: 0.9rem;\n}\n.lockout-time[_ngcontent-%COMP%] {\n  font-size: 0.8rem;\n  opacity: 0.8;\n}\n.login-form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon[_ngcontent-%COMP%] {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.form-options[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 0.875rem;\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n}\n.checkbox-label[_ngcontent-%COMP%]   input[type=checkbox][_ngcontent-%COMP%] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #3b82f6);\n}\n.forgot-link[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  transition: color 0.2s;\n}\n.forgot-link[_ngcontent-%COMP%]:hover {\n  color: var(--primary-hover, #60a5fa);\n  text-decoration: underline;\n}\n.submit-btn[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn[_ngcontent-%COMP%]:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn[_ngcontent-%COMP%]:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: _ngcontent-%COMP%_spin 0.8s linear infinite;\n}\n@keyframes _ngcontent-%COMP%_spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.divider[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: var(--text-muted, #666);\n  font-size: 0.875rem;\n}\n.divider[_ngcontent-%COMP%]::before, \n.divider[_ngcontent-%COMP%]::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: var(--border-color, #333);\n}\n.divider[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  padding: 0 1rem;\n}\n.social-login[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n}\n.social-btn[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.social-btn[_ngcontent-%COMP%]:hover {\n  background: var(--bg-tertiary, #252525);\n  border-color: var(--border-hover, #444);\n}\n.social-btn.google[_ngcontent-%COMP%]   .social-icon[_ngcontent-%COMP%] {\n  color: #ea4335;\n  font-weight: bold;\n}\n.social-btn.telegram[_ngcontent-%COMP%]   .social-icon[_ngcontent-%COMP%] {\n  color: #0088cc;\n}\n.social-btn.full-width[_ngcontent-%COMP%] {\n  width: 100%;\n  flex: none;\n}\n.social-btn.telegram[_ngcontent-%COMP%] {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0077b5);\n  border-color: #0088cc;\n}\n.social-btn.telegram[_ngcontent-%COMP%]:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0088cc);\n}\n.telegram-widget-container[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 48px;\n  width: 100%;\n}\n.telegram-widget-container[_ngcontent-%COMP%]   iframe[_ngcontent-%COMP%] {\n  border-radius: 8px !important;\n}\n#telegram-login-widget[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: center;\n}\n.loading-spinner.small[_ngcontent-%COMP%] {\n  width: 14px;\n  height: 14px;\n  border-width: 2px;\n}\n.register-link[_ngcontent-%COMP%] {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.register-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.register-link[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=login.component.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LoginComponent, [{
    type: Component,
    args: [{ selector: "app-login", standalone: true, imports: [CommonModule, FormsModule, RouterModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `
    <div class="login-page">
      <h2 class="page-title">{{ t('auth.welcomeBack') }}</h2>
      <p class="page-subtitle">{{ t('auth.loginSubtitle') }}</p>
      
      <!-- \u9396\u5B9A\u63D0\u793A -->
      @if (isLocked()) {
        <div class="lockout-alert">
          <span class="lockout-icon">\u{1F512}</span>
          <div class="lockout-content">
            <span class="lockout-title">\u5E33\u865F\u66AB\u6642\u9396\u5B9A</span>
            <span class="lockout-time">\u8ACB\u7B49\u5F85 {{ lockoutRemaining() }} \u79D2\u5F8C\u91CD\u8A66</span>
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
      
      <!-- \u7B2C\u4E09\u65B9\u767B\u5165 - Telegram OAuth -->
      <div class="social-login">
        <button 
          class="social-btn telegram full-width" 
          (click)="initTelegramWidget()"
          [disabled]="telegramLoading()"
        >
          @if (telegramLoading()) {
            <span class="loading-spinner small"></span>
            <span>{{ t('auth.loadingTelegram') }}</span>
          } @else {
            <span class="social-icon">\u2708\uFE0F</span>
            <span>{{ t('auth.loginWithTelegram') }}</span>
          }
        </button>
      </div>
      
      <!-- \u8A3B\u518A\u5165\u53E3 -->
      <p class="register-link">
        {{ t('auth.noAccount') }}
        <a routerLink="/auth/register">{{ t('auth.registerNow') }}</a>
      </p>
    </div>
  `, styles: ['/* angular:styles/component:css;7fdccf2b9eca1cf024a82140bb8160200a1ffc048ab9597f05e62d4b87cf0254;D:/tgkz2026/src/auth/login.component.ts */\n.login-page {\n  color: var(--text-primary, #fff);\n}\n.page-title {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n}\n.page-subtitle {\n  color: var(--text-secondary, #888);\n  margin-bottom: 2rem;\n}\n.error-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1rem;\n  background: rgba(239, 68, 68, 0.1);\n  border: 1px solid rgba(239, 68, 68, 0.3);\n  border-radius: 8px;\n  color: #f87171;\n  margin-bottom: 1.5rem;\n  font-size: 0.875rem;\n}\n.lockout-alert {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 1rem 1.25rem;\n  background: rgba(251, 146, 60, 0.1);\n  border: 1px solid rgba(251, 146, 60, 0.3);\n  border-radius: 8px;\n  color: #fb923c;\n  margin-bottom: 1.5rem;\n}\n.lockout-icon {\n  font-size: 1.5rem;\n}\n.lockout-content {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.lockout-title {\n  font-weight: 600;\n  font-size: 0.9rem;\n}\n.lockout-time {\n  font-size: 0.8rem;\n  opacity: 0.8;\n}\n.login-form {\n  display: flex;\n  flex-direction: column;\n  gap: 1.25rem;\n}\n.form-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n}\n.form-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: var(--text-secondary, #aaa);\n}\n.input-wrapper {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-icon {\n  position: absolute;\n  left: 1rem;\n  font-size: 1rem;\n  opacity: 0.5;\n}\n.input-wrapper input {\n  width: 100%;\n  padding: 0.875rem 1rem 0.875rem 2.75rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 1rem;\n  transition: all 0.2s ease;\n}\n.input-wrapper input:focus {\n  outline: none;\n  border-color: var(--primary, #3b82f6);\n  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);\n}\n.input-wrapper input::placeholder {\n  color: var(--text-muted, #666);\n}\n.toggle-password {\n  position: absolute;\n  right: 1rem;\n  background: none;\n  border: none;\n  cursor: pointer;\n  font-size: 1rem;\n  opacity: 0.5;\n  transition: opacity 0.2s;\n}\n.toggle-password:hover {\n  opacity: 1;\n}\n.form-options {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  font-size: 0.875rem;\n}\n.checkbox-label {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  cursor: pointer;\n  color: var(--text-secondary, #aaa);\n}\n.checkbox-label input[type=checkbox] {\n  width: 16px;\n  height: 16px;\n  accent-color: var(--primary, #3b82f6);\n}\n.forgot-link {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  transition: color 0.2s;\n}\n.forgot-link:hover {\n  color: var(--primary-hover, #60a5fa);\n  text-decoration: underline;\n}\n.submit-btn {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.875rem 1.5rem;\n  background:\n    linear-gradient(\n      135deg,\n      #3b82f6,\n      #8b5cf6);\n  border: none;\n  border-radius: 8px;\n  color: white;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n  margin-top: 0.5rem;\n}\n.submit-btn:hover:not(:disabled) {\n  transform: translateY(-1px);\n  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);\n}\n.submit-btn:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n.loading-spinner {\n  width: 18px;\n  height: 18px;\n  border: 2px solid rgba(255, 255, 255, 0.3);\n  border-top-color: white;\n  border-radius: 50%;\n  animation: spin 0.8s linear infinite;\n}\n@keyframes spin {\n  to {\n    transform: rotate(360deg);\n  }\n}\n.divider {\n  display: flex;\n  align-items: center;\n  margin: 1.5rem 0;\n  color: var(--text-muted, #666);\n  font-size: 0.875rem;\n}\n.divider::before,\n.divider::after {\n  content: "";\n  flex: 1;\n  height: 1px;\n  background: var(--border-color, #333);\n}\n.divider span {\n  padding: 0 1rem;\n}\n.social-login {\n  display: flex;\n  gap: 1rem;\n}\n.social-btn {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 0.5rem;\n  padding: 0.75rem 1rem;\n  background: var(--bg-secondary, #1a1a1a);\n  border: 1px solid var(--border-color, #333);\n  border-radius: 8px;\n  color: var(--text-primary, #fff);\n  font-size: 0.875rem;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n.social-btn:hover {\n  background: var(--bg-tertiary, #252525);\n  border-color: var(--border-hover, #444);\n}\n.social-btn.google .social-icon {\n  color: #ea4335;\n  font-weight: bold;\n}\n.social-btn.telegram .social-icon {\n  color: #0088cc;\n}\n.social-btn.full-width {\n  width: 100%;\n  flex: none;\n}\n.social-btn.telegram {\n  background:\n    linear-gradient(\n      135deg,\n      #0088cc,\n      #0077b5);\n  border-color: #0088cc;\n}\n.social-btn.telegram:hover {\n  background:\n    linear-gradient(\n      135deg,\n      #0099dd,\n      #0088cc);\n}\n.telegram-widget-container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  min-height: 48px;\n  width: 100%;\n}\n.telegram-widget-container iframe {\n  border-radius: 8px !important;\n}\n#telegram-login-widget {\n  display: flex;\n  justify-content: center;\n}\n.loading-spinner.small {\n  width: 14px;\n  height: 14px;\n  border-width: 2px;\n}\n.register-link {\n  text-align: center;\n  margin-top: 1.5rem;\n  color: var(--text-secondary, #888);\n  font-size: 0.875rem;\n}\n.register-link a {\n  color: var(--primary, #3b82f6);\n  text-decoration: none;\n  font-weight: 500;\n}\n.register-link a:hover {\n  text-decoration: underline;\n}\n/*# sourceMappingURL=login.component.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginComponent, { className: "LoginComponent", filePath: "src/auth/login.component.ts", lineNumber: 463 });
})();
export {
  LoginComponent
};
//# sourceMappingURL=chunk-423EPHI2.js.map
