import {
  HttpClient,
  Router
} from "./chunk-T45T4QAG.js";
import {
  Injectable,
  Subject,
  __spreadProps,
  __spreadValues,
  computed,
  effect,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-K4KD4A2Z.js";

// src/core/api.service.ts
var ApiService = class _ApiService {
  constructor() {
    this.http = inject(HttpClient);
    this._isElectron = signal(this.detectElectron(), ...ngDevMode ? [{ debugName: "_isElectron" }] : []);
    this._isConnected = signal(false, ...ngDevMode ? [{ debugName: "_isConnected" }] : []);
    this._config = signal(this.getDefaultConfig(), ...ngDevMode ? [{ debugName: "_config" }] : []);
    this.ws = null;
    this.wsReconnectTimer = null;
    this.wsMessageSubject = new Subject();
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.cache = /* @__PURE__ */ new Map();
    this.cacheTimeout = 3e4;
    this.inflightRequests = /* @__PURE__ */ new Map();
    this.isElectron = computed(() => this._isElectron(), ...ngDevMode ? [{ debugName: "isElectron" }] : []);
    this.isConnected = computed(() => this._isConnected(), ...ngDevMode ? [{ debugName: "isConnected" }] : []);
    this.mode = computed(() => this._config().mode, ...ngDevMode ? [{ debugName: "mode" }] : []);
    this.events$ = this.wsMessageSubject.asObservable();
    this.init();
  }
  // ==================== 初始化 ====================
  init() {
    console.log(`[ApiService] Initializing in ${this._config().mode} mode`);
    if (this._config().mode === "http") {
      this.connectWebSocket();
    }
    this.healthCheck().then((ok) => {
      this._isConnected.set(ok);
      console.log(`[ApiService] Connection status: ${ok ? "connected" : "disconnected"}`);
    });
  }
  detectElectron() {
    return !!window.electron || !!window.require;
  }
  getDefaultConfig() {
    const envMode = window.__API_MODE__ || "auto";
    const envBaseUrl = window.__API_BASE_URL__;
    if (envMode === "http" || envBaseUrl) {
      return {
        mode: "http",
        baseUrl: envBaseUrl || this.detectApiUrl(),
        wsUrl: this.detectWsUrl(),
        timeout: 3e4,
        retries: 2
      };
    }
    if (this.detectElectron()) {
      return {
        mode: "ipc",
        timeout: 3e4,
        retries: 2
      };
    }
    return {
      mode: "http",
      baseUrl: this.detectApiUrl(),
      wsUrl: this.detectWsUrl(),
      timeout: 3e4,
      retries: 2
    };
  }
  detectApiUrl() {
    if (window.location.hostname === "localhost" && window.location.port === "4200") {
      return "http://localhost:8000";
    }
    return `${window.location.protocol}//${window.location.host}`;
  }
  detectWsUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    if (window.location.hostname === "localhost" && window.location.port === "4200") {
      return "ws://localhost:8000/ws";
    }
    return `${protocol}//${window.location.host}/ws`;
  }
  // ==================== 核心請求方法 ====================
  /**
   * 執行命令 - 核心方法
   * 自動選擇 IPC 或 HTTP
   */
  async command(cmd, payload = {}) {
    const requestKey = `${cmd}:${JSON.stringify(payload)}`;
    if (this.inflightRequests.has(requestKey)) {
      return this.inflightRequests.get(requestKey);
    }
    const promise = this._executeCommand(cmd, payload);
    this.inflightRequests.set(requestKey, promise);
    try {
      const result = await promise;
      return result;
    } finally {
      this.inflightRequests.delete(requestKey);
    }
  }
  async _executeCommand(cmd, payload) {
    if (this._config().mode === "ipc") {
      return this.ipcCommand(cmd, payload);
    } else {
      return this.httpCommand(cmd, payload);
    }
  }
  // ==================== IPC 模式 ====================
  async ipcCommand(cmd, payload) {
    const electron = window.electron;
    if (!electron?.ipcRenderer) {
      throw new Error("Electron IPC not available");
    }
    try {
      const result = await electron.ipcRenderer.invoke(cmd, payload);
      return this.normalizeResponse(result);
    } catch (error) {
      return { success: false, error: error.message || "IPC error" };
    }
  }
  // ==================== HTTP 模式 ====================
  async httpCommand(cmd, payload) {
    const config = this._config();
    const url = `${config.baseUrl}/api/command`;
    const token = localStorage.getItem("tgm_access_token");
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ command: cmd, payload })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      return this.normalizeResponse(result);
    } catch (error) {
      if (config.retries && config.retries > 0) {
        console.warn(`[ApiService] Retrying command: ${cmd}`);
        const newConfig = __spreadProps(__spreadValues({}, config), { retries: config.retries - 1 });
        this._config.set(newConfig);
        return this.httpCommand(cmd, payload);
      }
      return { success: false, error: error.message || "HTTP error" };
    }
  }
  normalizeResponse(result) {
    if (typeof result === "object" && result !== null) {
      if ("success" in result) {
        return result;
      }
      return { success: true, data: result };
    }
    return { success: true, data: result };
  }
  // ==================== WebSocket ====================
  connectWebSocket() {
    const wsUrl = this._config().wsUrl;
    if (!wsUrl)
      return;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => {
        console.log("[ApiService] WebSocket connected");
        this._isConnected.set(true);
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.request_id && this.pendingRequests.has(message.request_id)) {
            const { resolve } = this.pendingRequests.get(message.request_id);
            this.pendingRequests.delete(message.request_id);
            resolve(message);
          }
          this.wsMessageSubject.next(message);
        } catch (e) {
          console.error("[ApiService] WebSocket message parse error", e);
        }
      };
      this.ws.onclose = () => {
        console.log("[ApiService] WebSocket disconnected");
        this._isConnected.set(false);
        this.scheduleReconnect();
      };
      this.ws.onerror = (error) => {
        console.error("[ApiService] WebSocket error", error);
      };
    } catch (e) {
      console.error("[ApiService] WebSocket connection failed", e);
      this.scheduleReconnect();
    }
  }
  scheduleReconnect() {
    if (this.wsReconnectTimer)
      return;
    this.wsReconnectTimer = setTimeout(() => {
      console.log("[ApiService] Attempting WebSocket reconnection...");
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, 5e3);
  }
  /**
   * 通過 WebSocket 發送命令
   */
  async wsCommand(cmd, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return this.httpCommand(cmd, payload);
    }
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("WebSocket request timeout"));
        }
      }, this._config().timeout || 3e4);
      this.ws.send(JSON.stringify({
        command: cmd,
        payload,
        request_id: requestId
      }));
    });
  }
  // ==================== 便捷方法 ====================
  /**
   * 健康檢查
   */
  async healthCheck() {
    try {
      const result = await this.command("get-initial-state");
      return result.success;
    } catch {
      return false;
    }
  }
  /**
   * 帶緩存的請求
   */
  async cachedCommand(cmd, payload = {}, ttl = this.cacheTimeout) {
    const cacheKey = `${cmd}:${JSON.stringify(payload)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return { success: true, data: cached.data };
    }
    const result = await this.command(cmd, payload);
    if (result.success && result.data) {
      this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() });
    }
    return result;
  }
  /**
   * 清除緩存
   */
  clearCache(pattern) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  // ==================== 常用 API 快捷方法 ====================
  // 帳號
  getAccounts() {
    return this.cachedCommand("get-accounts");
  }
  addAccount(data) {
    return this.command("add-account", data);
  }
  loginAccount(id) {
    return this.command("login-account", { id });
  }
  logoutAccount(id) {
    return this.command("logout-account", { id });
  }
  // 認證
  sendCode(phone, apiId, apiHash) {
    return this.command("send-code", { phone, apiId, apiHash });
  }
  verifyCode(phone, code, phoneCodeHash) {
    return this.command("verify-code", { phone, code, phoneCodeHash });
  }
  // API 憑證
  getCredentials() {
    return this.cachedCommand("get-api-credentials");
  }
  addCredential(data) {
    return this.command("add-api-credential", data);
  }
  getRecommendedCredential() {
    return this.cachedCommand("get-api-recommendation");
  }
  // 監控
  getMonitoringStatus() {
    return this.command("get-monitoring-status");
  }
  startMonitoring(config) {
    return this.command("start-monitoring", config);
  }
  stopMonitoring() {
    return this.command("stop-monitoring");
  }
  // 初始狀態
  getInitialState() {
    return this.cachedCommand("get-initial-state", {}, 5e3);
  }
  // 設置
  getSettings() {
    return this.cachedCommand("get-settings");
  }
  saveSettings(settings) {
    this.clearCache("get-settings");
    return this.command("save-settings", settings);
  }
  static {
    this.\u0275fac = function ApiService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ApiService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _ApiService, factory: _ApiService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ApiService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/core/auth-events.service.ts
var AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "tgm_access_token",
  REFRESH_TOKEN: "tgm_refresh_token",
  AUTH_TOKEN: "tgm_auth_token",
  // 舊版兼容
  USER: "tgm_user",
  SESSION_ID: "tgm_session_id",
  REMEMBER_ME: "tgm_remember_me"
  // 🆕 記住登入狀態
};
var AuthEventsService = class _AuthEventsService {
  constructor() {
    this._authEvents = new Subject();
    this.authEvents$ = this._authEvents.asObservable();
  }
  /**
   * 廣播登入事件
   */
  emitLogin(payload) {
    this._authEvents.next({
      type: "login",
      payload,
      timestamp: Date.now()
    });
    console.log("[AuthEvents] Login event emitted");
  }
  /**
   * 廣播登出事件
   */
  emitLogout() {
    this._authEvents.next({
      type: "logout",
      timestamp: Date.now()
    });
    console.log("[AuthEvents] Logout event emitted");
  }
  /**
   * 廣播會話過期事件
   */
  emitSessionExpired() {
    this._authEvents.next({
      type: "session_expired",
      timestamp: Date.now()
    });
    console.log("[AuthEvents] Session expired event emitted");
  }
  /**
   * 廣播 Token 刷新事件
   */
  emitTokenRefresh(newToken) {
    this._authEvents.next({
      type: "token_refresh",
      payload: { token: newToken },
      timestamp: Date.now()
    });
  }
  /**
   * 廣播用戶信息更新事件
   */
  emitUserUpdate(user) {
    this._authEvents.next({
      type: "user_update",
      payload: { user },
      timestamp: Date.now()
    });
  }
  /**
   * 清除所有認證相關的 localStorage
   * 集中式管理，確保徹底清除
   */
  clearAllAuthStorage() {
    console.log("[AuthEvents] Clearing all auth storage");
    Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  }
  /**
   * 獲取當前 Token（從 localStorage）
   */
  getStoredToken() {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) || localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
  }
  /**
   * 獲取存儲的用戶信息
   */
  getStoredUser() {
    try {
      const userJson = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }
  static {
    this.\u0275fac = function AuthEventsService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AuthEventsService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AuthEventsService, factory: _AuthEventsService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthEventsService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], null, null);
})();

// src/core/auth.service.ts
var TOKEN_KEYS = AUTH_STORAGE_KEYS;
var AuthService = class _AuthService {
  constructor() {
    this.api = inject(ApiService);
    this.router = inject(Router);
    this.authEvents = inject(AuthEventsService);
    this.eventSubscription = null;
    this._user = signal(null, ...ngDevMode ? [{ debugName: "_user" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._accessToken = signal(null, ...ngDevMode ? [{ debugName: "_accessToken" }] : []);
    this._refreshToken = signal(null, ...ngDevMode ? [{ debugName: "_refreshToken" }] : []);
    this.refreshTimer = null;
    this.user = computed(() => this._user(), ...ngDevMode ? [{ debugName: "user" }] : []);
    this.isAuthenticated = computed(() => !!this._accessToken(), ...ngDevMode ? [{ debugName: "isAuthenticated" }] : []);
    this.isLoading = computed(() => this._isLoading(), ...ngDevMode ? [{ debugName: "isLoading" }] : []);
    this.accessToken = computed(() => this._accessToken(), ...ngDevMode ? [{ debugName: "accessToken" }] : []);
    this.subscriptionTier = computed(() => this._user()?.subscription_tier || "free", ...ngDevMode ? [{ debugName: "subscriptionTier" }] : []);
    this.maxAccounts = computed(() => this._user()?.max_accounts || 3, ...ngDevMode ? [{ debugName: "maxAccounts" }] : []);
    this.isPro = computed(() => ["pro", "enterprise"].includes(this.subscriptionTier()), ...ngDevMode ? [{ debugName: "isPro" }] : []);
    this.membershipLevel = computed(() => {
      const tier = this.subscriptionTier();
      const tierMap = {
        "free": "bronze",
        "basic": "silver",
        "pro": "gold",
        "enterprise": "diamond"
      };
      return tierMap[tier] || "bronze";
    }, ...ngDevMode ? [{ debugName: "membershipLevel" }] : []);
    this._initialized = false;
    this.restoreSession();
    this._initialized = true;
    this.eventSubscription = this.authEvents.authEvents$.subscribe((event) => {
      if (event.type === "logout") {
        console.log("[CoreAuthService] Received logout event, clearing state");
        this.clearAuthStateInternal();
      }
    });
    effect(() => {
      const token = this._accessToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
      } else if (this._initialized) {
        localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      }
    });
    effect(() => {
      const token = this._refreshToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
      } else if (this._initialized) {
        localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      }
    });
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
      } else if (this._initialized) {
        localStorage.removeItem(TOKEN_KEYS.USER);
      }
    });
  }
  ngOnDestroy() {
    this.eventSubscription?.unsubscribe();
  }
  // ==================== 公開方法 ====================
  /**
   * 用戶註冊
   */
  async register(request) {
    this._isLoading.set(true);
    try {
      const result = await this.api.command("user-register", request);
      if (result.success && result.data) {
        this.setAuthState(result.data);
        return { success: true };
      }
      return { success: false, error: result.error || "\u8A3B\u518A\u5931\u6557" };
    } catch (e) {
      return { success: false, error: e.message || "\u8A3B\u518A\u5931\u6557" };
    } finally {
      this._isLoading.set(false);
    }
  }
  /**
   * 用戶登入
   */
  async login(request) {
    this._isLoading.set(true);
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: request.email,
          password: request.password,
          device_name: request.device_name || this.getDeviceName(),
          remember: request.remember || false
          // 🆕 傳遞記住登入選項
        })
      });
      const result = await response.json();
      if (result.success && result.data) {
        if (request.remember) {
          localStorage.setItem("tgm_remember_me", "true");
        } else {
          localStorage.removeItem("tgm_remember_me");
        }
        this.setAuthState(result.data);
        this.scheduleTokenRefresh();
        return { success: true };
      }
      return { success: false, error: result.error || "\u767B\u5165\u5931\u6557" };
    } catch (e) {
      return { success: false, error: e.message || "\u767B\u5165\u5931\u6557" };
    } finally {
      this._isLoading.set(false);
    }
  }
  /**
   * 獲取 Telegram OAuth 配置
   */
  async getTelegramConfig() {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram/config`);
      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return { enabled: false };
    } catch (e) {
      console.error("Failed to get Telegram config:", e);
      return { enabled: false };
    }
  }
  /**
   * Telegram OAuth 登入
   */
  async telegramLogin(authData) {
    this._isLoading.set(true);
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/oauth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authData)
      });
      const result = await response.json();
      if (result.success) {
        this.setAuthState({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token
        });
        this.scheduleTokenRefresh();
        return { success: true };
      }
      return { success: false, error: result.error || "Telegram \u767B\u5165\u5931\u6557" };
    } catch (e) {
      return { success: false, error: e.message || "Telegram \u767B\u5165\u5931\u6557" };
    } finally {
      this._isLoading.set(false);
    }
  }
  /**
   * 登出
   */
  async logout() {
    try {
      const token = this._accessToken();
      if (token) {
        await fetch(`${this.getApiBaseUrl()}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      this.authEvents.emitLogout();
      this.clearAuthStateInternal();
      this.router.navigate(["/auth/login"]);
    }
  }
  /**
   * 請求密碼重置
   */
  async forgotPassword(email) {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 重置密碼
   */
  async resetPassword(token, password) {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 驗證郵箱（通過 Token）
   */
  async verifyEmail(token) {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 驗證郵箱（通過驗證碼）
   */
  async verifyEmailByCode(email, code) {
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 重新發送驗證郵件
   */
  async resendVerificationEmail() {
    try {
      const token = this._accessToken();
      if (!token) {
        return { success: false, error: "\u672A\u767B\u5165" };
      }
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/send-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 刷新 Token
   */
  async refreshAccessToken() {
    const refreshToken = this._refreshToken();
    if (!refreshToken) {
      return false;
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const result = await response.json();
      if (result.success && result.data) {
        this._accessToken.set(result.data.access_token);
        this._refreshToken.set(result.data.refresh_token);
        this.scheduleTokenRefresh();
        return true;
      }
      return false;
    } catch (e) {
      console.error("Token refresh error:", e);
      return false;
    }
  }
  /**
   * 獲取當前用戶信息
   * 🔧 優化：同時檢查 Signal 和 localStorage，確保 Token 總能被讀取
   */
  async fetchCurrentUser() {
    const token = this._accessToken() || localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (!token) {
      console.log("[AuthService] fetchCurrentUser: No token available");
      return null;
    }
    if (!this._accessToken() && token) {
      this._accessToken.set(token);
    }
    try {
      console.log("[AuthService] fetchCurrentUser: Fetching user info...");
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) {
        console.warn(`[AuthService] fetchCurrentUser: HTTP ${response.status}`);
        if (response.status === 401) {
          console.warn("[AuthService] Token invalid, clearing session");
        }
        return null;
      }
      const result = await response.json();
      if (result.success && result.data) {
        console.log("[AuthService] fetchCurrentUser: Success", result.data.username);
        this._user.set(result.data);
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(result.data));
        return result.data;
      }
      console.warn("[AuthService] fetchCurrentUser: API returned", result);
      return null;
    } catch (e) {
      console.error("[AuthService] fetchCurrentUser error:", e);
      return null;
    }
  }
  /**
   * 更新用戶信息
   */
  async updateProfile(updates) {
    const token = this._accessToken();
    if (!token) {
      return { success: false, error: "\u672A\u767B\u5165" };
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (result.success) {
        const currentUser = this._user();
        if (currentUser) {
          this._user.set(__spreadValues(__spreadValues({}, currentUser), updates));
        }
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 修改密碼
   */
  async changePassword(oldPassword, newPassword) {
    const token = this._accessToken();
    if (!token) {
      return { success: false, error: "\u672A\u767B\u5165" };
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  /**
   * 獲取會話列表
   */
  /**
   * 🆕 Phase 4: 獲取用戶所有設備
   */
  async getSessions() {
    const token = this._accessToken();
    if (!token)
      return [];
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success ? result.data?.devices || [] : [];
    } catch (e) {
      return [];
    }
  }
  /**
   * 撤銷會話
   */
  /**
   * 🆕 Phase 4: 撤銷指定設備會話
   */
  async revokeSession(sessionId) {
    const token = this._accessToken();
    if (!token)
      return false;
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/${sessionId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success;
    } catch (e) {
      return false;
    }
  }
  /**
   * 🆕 Phase 4: 登出除當前設備外的所有設備
   */
  async revokeAllOtherSessions() {
    const token = this._accessToken();
    if (!token)
      return 0;
    try {
      const currentSessionId = localStorage.getItem("tgm_session_id") || "";
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/revoke-all`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ current_session_id: currentSessionId })
      });
      const result = await response.json();
      return result.success ? result.revoked_count || 0 : 0;
    } catch (e) {
      return 0;
    }
  }
  /**
   * 檢查功能權限
   */
  hasFeature(feature) {
    const tier = this.subscriptionTier();
    const featureMap = {
      "free": ["basic_monitoring", "basic_ai"],
      "basic": ["basic_monitoring", "basic_ai", "templates"],
      "pro": ["basic_monitoring", "basic_ai", "templates", "full_monitoring", "advanced_ai", "team", "api_access"],
      "enterprise": ["all"]
    };
    const allowedFeatures = featureMap[tier] || [];
    return allowedFeatures.includes("all") || allowedFeatures.includes(feature);
  }
  /**
   * 獲取認證 Header
   * 🔧 修復：同時檢查 Signal 和 localStorage，確保 Token 總能被讀取
   */
  getAuthHeaders() {
    const token = this._accessToken() || localStorage.getItem("tgm_access_token");
    if (token) {
      return { "Authorization": `Bearer ${token}` };
    }
    return {};
  }
  // ==================== 🆕 設備管理 ====================
  /**
   * 獲取所有綁定設備
   */
  async getDevices() {
    const token = this._accessToken();
    if (!token)
      return [];
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success ? result.data?.devices || result.devices || [] : [];
    } catch (e) {
      console.error("Failed to get devices:", e);
      return [];
    }
  }
  /**
   * 綁定新設備
   */
  async bindDevice(deviceCode, deviceName) {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: "\u672A\u767B\u5165" };
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ device_code: deviceCode, device_name: deviceName })
      });
      const result = await response.json();
      return { success: result.success, message: result.message || (result.success ? "\u7D81\u5B9A\u6210\u529F" : "\u7D81\u5B9A\u5931\u6557") };
    } catch (e) {
      return { success: false, message: e.message || "\u7D81\u5B9A\u5931\u6557" };
    }
  }
  /**
   * 解綁設備
   */
  async unbindDevice(deviceId) {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: "\u672A\u767B\u5165" };
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/devices/${deviceId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return { success: result.success, message: result.message || (result.success ? "\u89E3\u7D81\u6210\u529F" : "\u89E3\u7D81\u5931\u6557") };
    } catch (e) {
      return { success: false, message: e.message || "\u89E3\u7D81\u5931\u6557" };
    }
  }
  // ==================== 🆕 會員管理 ====================
  /**
   * 獲取使用統計
   */
  async getUsageStats() {
    const token = this._accessToken();
    if (!token)
      return null;
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/usage-stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (e) {
      console.error("Failed to get usage stats:", e);
      return null;
    }
  }
  /**
   * 激活卡密（續費/升級會員）
   */
  async activateLicense(licenseKey) {
    const token = this._accessToken();
    if (!token) {
      return { success: false, message: "\u672A\u767B\u5165" };
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/license/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ license_key: licenseKey })
      });
      const result = await response.json();
      if (result.success) {
        await this.fetchCurrentUser();
        this.authEvents.emitUserUpdate(this._user());
      }
      return {
        success: result.success,
        message: result.message || (result.success ? "\u6FC0\u6D3B\u6210\u529F" : "\u6FC0\u6D3B\u5931\u6557"),
        data: result.data
      };
    } catch (e) {
      return { success: false, message: e.message || "\u6FC0\u6D3B\u5931\u6557" };
    }
  }
  /**
   * 獲取邀請獎勵信息
   */
  async getInviteRewards() {
    const token = this._accessToken();
    const user = this._user();
    const defaultResult = {
      inviteCode: user?.invite_code || user?.inviteCode || "",
      invitedCount: 0,
      rewardDays: 0
    };
    if (!token)
      return defaultResult;
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/invite-rewards`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      return result.success ? {
        inviteCode: result.data?.invite_code || defaultResult.inviteCode,
        invitedCount: result.data?.invited_count || 0,
        rewardDays: result.data?.reward_days || 0
      } : defaultResult;
    } catch (e) {
      return defaultResult;
    }
  }
  // ==================== 私有方法 ====================
  setAuthState(data) {
    if (data.user) {
      this._user.set(data.user);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
    }
    if (data.access_token) {
      this._accessToken.set(data.access_token);
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token);
    }
    if (data.refresh_token) {
      this._refreshToken.set(data.refresh_token);
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
  }
  /**
   * 設置會話（公開方法）
   * 🆕 用於登入成功後直接設置認證狀態
   */
  setSession(data) {
    console.log("[AuthService] setSession called:", {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      hasUser: !!data.user
    });
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, data.access_token);
      this._accessToken.set(data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, data.refresh_token);
      this._refreshToken.set(data.refresh_token);
    }
    if (data.user) {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
      this._user.set(data.user);
    }
    if (data.session_id) {
      localStorage.setItem(TOKEN_KEYS.SESSION_ID, data.session_id);
    }
    this.authEvents.emitLogin(data);
    console.log("[AuthService] setSession complete, isAuthenticated:", this.isAuthenticated());
  }
  /**
   * 清除會話（公開方法）
   * 用於認證守衛發現無效狀態時清理
   * 🆕 同時廣播事件通知其他服務
   */
  clearSession() {
    this.authEvents.emitLogout();
    this.clearAuthStateInternal();
  }
  /**
   * 內部清除狀態（不發送事件，避免循環）
   */
  clearAuthStateInternal() {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.authEvents.clearAllAuthStorage();
  }
  /**
   * @deprecated 使用 clearAuthStateInternal 代替
   */
  clearAuthState() {
    this.clearAuthStateInternal();
  }
  restoreSession() {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
      const userJson = localStorage.getItem(TOKEN_KEYS.USER);
      console.log("[Auth] restoreSession - accessToken:", !!accessToken, "refreshToken:", !!refreshToken, "user:", !!userJson);
      if (accessToken && !this.isValidTokenFormat(accessToken)) {
        console.warn("[Auth] Invalid token format, clearing session");
        this.clearAuthState();
        return;
      }
      if (accessToken) {
        console.log("[Auth] Setting accessToken signal");
        this._accessToken.set(accessToken);
      }
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
      }
      if (userJson) {
        try {
          this._user.set(JSON.parse(userJson));
          console.log("[Auth] User restored from localStorage");
        } catch {
          console.warn("[Auth] Invalid user JSON, clearing");
          this.clearAuthState();
          return;
        }
      }
      console.log("[Auth] Session restored successfully");
      if (accessToken && !userJson) {
        console.log("[Auth] Token exists but no user info, fetching immediately...");
        queueMicrotask(() => {
          if (this._accessToken()) {
            this.fetchCurrentUser().then((user) => {
              if (user) {
                console.log("[Auth] User info fetched successfully:", user.username);
              } else {
                console.warn("[Auth] Failed to fetch user info");
              }
            }).catch((e) => {
              console.warn("[Auth] Error fetching user info:", e);
            });
          }
        });
      }
    } catch (e) {
      console.error("Restore session error:", e);
      this.clearAuthState();
    }
  }
  /**
   * 驗證 Token 格式是否有效（JWT 格式檢查）
   */
  isValidTokenFormat(token) {
    if (!token || token.length < 20)
      return false;
    const parts = token.split(".");
    if (parts.length !== 3)
      return false;
    try {
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1e3) {
        console.warn("[Auth] Token expired");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * 解碼 URL-safe Base64（處理後端 JWT 編碼）
   */
  base64UrlDecode(str) {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return atob(base64);
  }
  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    const rememberMe = localStorage.getItem("tgm_remember_me") === "true";
    const refreshIn = rememberMe ? 23 * 60 * 60 * 1e3 : 55 * 60 * 1e3;
    console.log(`[AuthService] Scheduling token refresh in ${refreshIn / 6e4} minutes (rememberMe: ${rememberMe})`);
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken();
    }, refreshIn);
  }
  getApiBaseUrl() {
    if (window.location.hostname === "localhost" && window.location.port === "4200") {
      return "http://localhost:8000";
    }
    return "";
  }
  getDeviceName() {
    const ua = navigator.userAgent;
    if (ua.includes("Windows"))
      return "Windows Browser";
    if (ua.includes("Mac"))
      return "Mac Browser";
    if (ua.includes("Linux"))
      return "Linux Browser";
    if (ua.includes("iPhone") || ua.includes("iPad"))
      return "iOS Browser";
    if (ua.includes("Android"))
      return "Android Browser";
    return "Web Browser";
  }
  static {
    this.\u0275fac = function AuthService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AuthService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _AuthService, factory: _AuthService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  AuthEventsService,
  AuthService
};
//# sourceMappingURL=chunk-LSAEK5E6.js.map
