import {
  HttpClient
} from "./chunk-T45T4QAG.js";
import {
  Injectable,
  Subject,
  __spreadProps,
  __spreadValues,
  computed,
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
  // ==================== RESTful HTTP 方法 ====================
  /**
   * HTTP GET 請求
   */
  async get(endpoint, options) {
    const config = this._config();
    const url = endpoint.startsWith("http") ? endpoint : `${config.baseUrl}${endpoint}`;
    if (options?.cache !== false) {
      const cached = this.cache.get(url);
      if (cached && Date.now() - cached.timestamp < (options?.ttl || this.cacheTimeout)) {
        return { success: true, data: cached.data };
      }
    }
    const token = localStorage.getItem("tgm_access_token");
    const headers = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    try {
      const response = await fetch(url, {
        method: "GET",
        headers
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("[ApiService] 401 Unauthorized - clearing auth and redirecting");
          this.handleUnauthorized();
          return { success: false, error: "\u767B\u9304\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u9304" };
        }
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }
      const result = await response.json();
      if (options?.cache !== false && result.success !== false) {
        this.cache.set(url, { data: result.data || result, timestamp: Date.now() });
      }
      return this.normalizeResponse(result);
    } catch (error) {
      console.error(`[ApiService] GET ${endpoint} error:`, error);
      return { success: false, error: error.message || "Network error" };
    }
  }
  /**
   * 處理 401 未授權錯誤
   * 注意：不再自動清除認證或重定向，只記錄日誌
   * 讓用戶手動重新登錄以避免意外登出
   */
  handleUnauthorized() {
    console.warn("[ApiService] 401 Unauthorized - Token may be expired or invalid");
    console.warn("[ApiService] Please try logging out and logging back in");
    window.dispatchEvent(new CustomEvent("auth:unauthorized", {
      detail: { message: "\u767B\u9304\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u9304" }
    }));
  }
  /**
   * HTTP POST 請求
   */
  async post(endpoint, body = {}) {
    const config = this._config();
    const url = endpoint.startsWith("http") ? endpoint : `${config.baseUrl}${endpoint}`;
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
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("[ApiService] 401 Unauthorized on POST - clearing auth and redirecting");
          this.handleUnauthorized();
          return { success: false, error: "\u767B\u9304\u5DF2\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u767B\u9304" };
        }
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }
      const result = await response.json();
      return this.normalizeResponse(result);
    } catch (error) {
      console.error(`[ApiService] POST ${endpoint} error:`, error);
      return { success: false, error: error.message || "Network error" };
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

export {
  ApiService
};
//# sourceMappingURL=chunk-LRT2RG6V.js.map
