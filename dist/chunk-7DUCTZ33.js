import {
  HttpClient,
  Router
} from "./chunk-6TNMQ6CH.js";
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
} from "./chunk-Y4VZODST.js";

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
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // TODO: 添加認證 token
        },
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

// src/core/auth.service.ts
var TOKEN_KEYS = {
  ACCESS: "tgm_access_token",
  REFRESH: "tgm_refresh_token",
  USER: "tgm_user"
};
var AuthService = class _AuthService {
  constructor() {
    this.api = inject(ApiService);
    this.router = inject(Router);
    this._user = signal(null, ...ngDevMode ? [{ debugName: "_user" }] : []);
    this._isLoading = signal(false, ...ngDevMode ? [{ debugName: "_isLoading" }] : []);
    this._accessToken = signal(null, ...ngDevMode ? [{ debugName: "_accessToken" }] : []);
    this._refreshToken = signal(null, ...ngDevMode ? [{ debugName: "_refreshToken" }] : []);
    this.refreshTimer = null;
    this.user = computed(() => this._user(), ...ngDevMode ? [{ debugName: "user" }] : []);
    this.isAuthenticated = computed(() => !!this._user() && !!this._accessToken(), ...ngDevMode ? [{ debugName: "isAuthenticated" }] : []);
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
    this.restoreSession();
    effect(() => {
      const token = this._accessToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, token);
      } else {
        localStorage.removeItem(TOKEN_KEYS.ACCESS);
      }
    });
    effect(() => {
      const token = this._refreshToken();
      if (token) {
        localStorage.setItem(TOKEN_KEYS.REFRESH, token);
      } else {
        localStorage.removeItem(TOKEN_KEYS.REFRESH);
      }
    });
    effect(() => {
      const user = this._user();
      if (user) {
        localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(TOKEN_KEYS.USER);
      }
    });
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
          device_name: request.device_name || this.getDeviceName()
        })
      });
      const result = await response.json();
      if (result.success && result.data) {
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
      this.clearAuthState();
      this.router.navigate(["/login"]);
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
   */
  async fetchCurrentUser() {
    const token = this._accessToken();
    if (!token) {
      return null;
    }
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success && result.data) {
        this._user.set(result.data);
        return result.data;
      }
      return null;
    } catch (e) {
      console.error("Fetch user error:", e);
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
   */
  getAuthHeaders() {
    const token = this._accessToken();
    if (token) {
      return { "Authorization": `Bearer ${token}` };
    }
    return {};
  }
  // ==================== 私有方法 ====================
  setAuthState(data) {
    if (data.user) {
      this._user.set(data.user);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
    }
    if (data.access_token) {
      this._accessToken.set(data.access_token);
      localStorage.setItem(TOKEN_KEYS.ACCESS, data.access_token);
    }
    if (data.refresh_token) {
      this._refreshToken.set(data.refresh_token);
      localStorage.setItem(TOKEN_KEYS.REFRESH, data.refresh_token);
    }
  }
  /**
   * 清除會話（公開方法）
   * 用於認證守衛發現無效狀態時清理
   */
  clearSession() {
    this.clearAuthState();
  }
  clearAuthState() {
    this._user.set(null);
    this._accessToken.set(null);
    this._refreshToken.set(null);
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
  }
  restoreSession() {
    try {
      const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS);
      const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
      const userJson = localStorage.getItem(TOKEN_KEYS.USER);
      if (accessToken && !this.isValidTokenFormat(accessToken)) {
        console.warn("[Auth] Invalid token format, clearing session");
        this.clearAuthState();
        return;
      }
      if (accessToken) {
        this._accessToken.set(accessToken);
      }
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
      }
      if (userJson) {
        try {
          this._user.set(JSON.parse(userJson));
        } catch {
          console.warn("[Auth] Invalid user JSON, clearing");
          this.clearAuthState();
          return;
        }
      }
      if (accessToken) {
        this.fetchCurrentUser().then((user) => {
          if (!user) {
            if (refreshToken) {
              this.refreshAccessToken().catch(() => {
                console.warn("[Auth] Token refresh failed, clearing session");
                this.clearAuthState();
                if (window.location.pathname !== "/auth/login") {
                  this.router.navigate(["/auth/login"]);
                }
              });
            } else {
              console.warn("[Auth] No valid token, clearing session");
              this.clearAuthState();
              if (window.location.pathname !== "/auth/login") {
                this.router.navigate(["/auth/login"]);
              }
            }
          }
        }).catch(() => {
          console.warn("[Auth] Token validation failed");
          this.clearAuthState();
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
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && Date.now() >= payload.exp * 1e3) {
        console.warn("[Auth] Token expired");
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    const refreshIn = 55 * 60 * 1e3;
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
  AuthService
};
//# sourceMappingURL=chunk-7DUCTZ33.js.map
