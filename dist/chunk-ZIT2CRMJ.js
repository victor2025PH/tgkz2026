import {
  MembershipService,
  ToastService
} from "./chunk-FPLBFLUX.js";
import {
  Injectable,
  NgZone,
  __spreadProps,
  __spreadValues,
  inject,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-Y4VZODST.js";

// src/security-client.service.ts
var JWT_SECRET = "tgai-license-secret-2026";
var SecurityClientService = class _SecurityClientService {
  constructor() {
    this.ngZone = inject(NgZone);
    this._machineId = signal("", ...ngDevMode ? [{ debugName: "_machineId" }] : []);
    this._deviceFingerprint = signal("", ...ngDevMode ? [{ debugName: "_deviceFingerprint" }] : []);
    this.tokenRefreshInterval = null;
    this.lastTokenRefresh = signal(null, ...ngDevMode ? [{ debugName: "lastTokenRefresh" }] : []);
    this.initializeDeviceInfo();
    this.startTokenRefreshTimer();
  }
  ngOnDestroy() {
    this.stopTokenRefreshTimer();
  }
  // ============ 初始化 ============
  initializeDeviceInfo() {
    this._machineId.set(this.getMachineId());
    this._deviceFingerprint.set(this.generateDeviceFingerprint());
  }
  // ============ 設備標識 ============
  /**
   * 獲取機器碼
   */
  getMachineId() {
    let machineId = localStorage.getItem("tgai-machine-id");
    if (!machineId) {
      machineId = this.generateMachineId();
      localStorage.setItem("tgai-machine-id", machineId);
    }
    return machineId;
  }
  generateMachineId() {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      (/* @__PURE__ */ new Date()).getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0
    ];
    const hash = this.hashString(components.join("|"));
    return `M-${hash.substring(0, 16).toUpperCase()}`;
  }
  /**
   * 生成設備指紋
   */
  generateDeviceFingerprint() {
    const components = [
      navigator.userAgent,
      navigator.platform,
      navigator.language,
      screen.width + "x" + screen.height,
      screen.colorDepth,
      (/* @__PURE__ */ new Date()).getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      navigator.deviceMemory || 0,
      navigator.maxTouchPoints || 0,
      // Canvas 指紋
      this.getCanvasFingerprint(),
      // WebGL 指紋
      this.getWebGLFingerprint()
    ];
    return this.hashString(components.join("::"));
  }
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx)
        return "";
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("TG-AI\u667A\u63A7\u738B", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("TG-AI\u667A\u63A7\u738B", 4, 17);
      return canvas.toDataURL().substring(0, 100);
    } catch {
      return "";
    }
  }
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl)
        return "";
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${vendor}|${renderer}`;
      }
      return "";
    } catch {
      return "";
    }
  }
  // ============ 請求簽名 ============
  /**
   * 生成請求簽名
   */
  generateRequestSignature(timestamp, nonce, machineId) {
    const signString = `${timestamp}:${nonce}:${machineId}:${JWT_SECRET}`;
    return this.hashString(signString);
  }
  /**
   * 生成 nonce
   */
  generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  /**
   * 創建安全請求頭
   */
  createSecureHeaders() {
    const timestamp = Math.floor(Date.now() / 1e3);
    const nonce = this.generateNonce();
    const machineId = this._machineId();
    const signature = this.generateRequestSignature(timestamp, nonce, machineId);
    return {
      "X-Signature": signature,
      "X-Timestamp": timestamp.toString(),
      "X-Nonce": nonce,
      "X-Machine-Id": machineId
    };
  }
  /**
   * 創建帶簽名的請求體
   */
  createSignedRequestBody(data) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const nonce = this.generateNonce();
    return __spreadProps(__spreadValues({}, data), {
      timestamp,
      nonce,
      machine_id: this._machineId(),
      device_fingerprint: this._deviceFingerprint()
    });
  }
  // ============ Token 刷新 ============
  startTokenRefreshTimer() {
    this.tokenRefreshInterval = setInterval(() => {
      this.ngZone.run(() => {
        window.dispatchEvent(new CustomEvent("refresh-token"));
      });
    }, 20 * 60 * 60 * 1e3);
  }
  stopTokenRefreshTimer() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
  /**
   * 檢查是否需要刷新 Token
   */
  shouldRefreshToken(tokenExpiry) {
    if (!tokenExpiry)
      return false;
    const hoursUntilExpiry = (tokenExpiry.getTime() - Date.now()) / (1e3 * 60 * 60);
    return hoursUntilExpiry < 4;
  }
  // ============ 工具方法 ============
  hashString(str) {
    return this.sha256(str);
  }
  sha256(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hashStr = Math.abs(hash).toString(16).padStart(8, "0");
    return (hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr).substring(0, 64);
  }
  /**
   * 使用 Web Crypto API 的 SHA-256（異步）
   */
  async sha256Async(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // ============ 公開屬性 ============
  get machineId() {
    return this._machineId();
  }
  get deviceFingerprint() {
    return this._deviceFingerprint();
  }
  static {
    this.\u0275fac = function SecurityClientService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SecurityClientService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _SecurityClientService, factory: _SecurityClientService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SecurityClientService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

// src/license-client.service.ts
var LicenseClientService = class _LicenseClientService {
  constructor() {
    this.membershipService = inject(MembershipService);
    this.toastService = inject(ToastService);
    this.securityService = inject(SecurityClientService);
    this.ngZone = inject(NgZone);
    this.serverUrl = signal("", ...ngDevMode ? [{ debugName: "serverUrl" }] : []);
    this.token = signal(null, ...ngDevMode ? [{ debugName: "token" }] : []);
    this.heartbeatInterval = null;
    this.tokenRefreshInterval = null;
    this.isOnline = signal(true, ...ngDevMode ? [{ debugName: "isOnline" }] : []);
    this.lastHeartbeat = signal(null, ...ngDevMode ? [{ debugName: "lastHeartbeat" }] : []);
    this.offlineGracePeriod = 7 * 24 * 60 * 60 * 1e3;
    this.products = [
      // 白銀精英 - 入門級（低門檻）
      { id: "silver_week", level: "silver", levelName: "\u767D\u9280\u7CBE\u82F1", levelIcon: "\u{1F948}", duration: "week", durationName: "\u5468\u5361", price: 1.99 },
      { id: "silver_month", level: "silver", levelName: "\u767D\u9280\u7CBE\u82F1", levelIcon: "\u{1F948}", duration: "month", durationName: "\u6708\u5361", price: 4.99 },
      { id: "silver_quarter", level: "silver", levelName: "\u767D\u9280\u7CBE\u82F1", levelIcon: "\u{1F948}", duration: "quarter", durationName: "\u5B63\u5361", price: 12.99 },
      { id: "silver_year", level: "silver", levelName: "\u767D\u9280\u7CBE\u82F1", levelIcon: "\u{1F948}", duration: "year", durationName: "\u5E74\u5361", price: 49.9 },
      // 黃金大師 - 主力產品（性價比最高）
      { id: "gold_week", level: "gold", levelName: "\u9EC3\u91D1\u5927\u5E2B", levelIcon: "\u{1F947}", duration: "week", durationName: "\u5468\u5361", price: 6.99 },
      { id: "gold_month", level: "gold", levelName: "\u9EC3\u91D1\u5927\u5E2B", levelIcon: "\u{1F947}", duration: "month", durationName: "\u6708\u5361", price: 19.9 },
      { id: "gold_quarter", level: "gold", levelName: "\u9EC3\u91D1\u5927\u5E2B", levelIcon: "\u{1F947}", duration: "quarter", durationName: "\u5B63\u5361", price: 49.9 },
      { id: "gold_year", level: "gold", levelName: "\u9EC3\u91D1\u5927\u5E2B", levelIcon: "\u{1F947}", duration: "year", durationName: "\u5E74\u5361", price: 199 },
      // 鑽石王牌 - 專業級
      { id: "diamond_week", level: "diamond", levelName: "\u947D\u77F3\u738B\u724C", levelIcon: "\u{1F48E}", duration: "week", durationName: "\u5468\u5361", price: 19.9 },
      { id: "diamond_month", level: "diamond", levelName: "\u947D\u77F3\u738B\u724C", levelIcon: "\u{1F48E}", duration: "month", durationName: "\u6708\u5361", price: 59.9 },
      { id: "diamond_quarter", level: "diamond", levelName: "\u947D\u77F3\u738B\u724C", levelIcon: "\u{1F48E}", duration: "quarter", durationName: "\u5B63\u5361", price: 149 },
      { id: "diamond_year", level: "diamond", levelName: "\u947D\u77F3\u738B\u724C", levelIcon: "\u{1F48E}", duration: "year", durationName: "\u5E74\u5361", price: 599 },
      // 星耀傳說 - 團隊級
      { id: "star_week", level: "star", levelName: "\u661F\u8000\u50B3\u8AAA", levelIcon: "\u{1F31F}", duration: "week", durationName: "\u5468\u5361", price: 59.9 },
      { id: "star_month", level: "star", levelName: "\u661F\u8000\u50B3\u8AAA", levelIcon: "\u{1F31F}", duration: "month", durationName: "\u6708\u5361", price: 199 },
      { id: "star_quarter", level: "star", levelName: "\u661F\u8000\u50B3\u8AAA", levelIcon: "\u{1F31F}", duration: "quarter", durationName: "\u5B63\u5361", price: 499 },
      { id: "star_year", level: "star", levelName: "\u661F\u8000\u50B3\u8AAA", levelIcon: "\u{1F31F}", duration: "year", durationName: "\u5E74\u5361", price: 1999 },
      // 榮耀王者 - 企業級（無限尊享）
      { id: "king_week", level: "king", levelName: "\u69AE\u8000\u738B\u8005", levelIcon: "\u{1F451}", duration: "week", durationName: "\u5468\u5361", price: 199 },
      { id: "king_month", level: "king", levelName: "\u69AE\u8000\u738B\u8005", levelIcon: "\u{1F451}", duration: "month", durationName: "\u6708\u5361", price: 599 },
      { id: "king_quarter", level: "king", levelName: "\u69AE\u8000\u738B\u8005", levelIcon: "\u{1F451}", duration: "quarter", durationName: "\u5B63\u5361", price: 1499 },
      { id: "king_year", level: "king", levelName: "\u69AE\u8000\u738B\u8005", levelIcon: "\u{1F451}", duration: "year", durationName: "\u5E74\u5361", price: 5999 },
      { id: "king_lifetime", level: "king", levelName: "\u69AE\u8000\u738B\u8005", levelIcon: "\u{1F451}", duration: "lifetime", durationName: "\u7D42\u8EAB", price: 14999 }
    ];
    this.loadToken();
    this.loadServerUrl();
    this.startHeartbeat();
    this.startTokenRefresh();
    this.listenForTokenRefresh();
  }
  ngOnDestroy() {
    this.stopHeartbeat();
    this.stopTokenRefresh();
  }
  // ============ 初始化 ============
  loadToken() {
    const stored = localStorage.getItem("tgai-license-token");
    if (stored) {
      this.token.set(stored);
    }
  }
  loadServerUrl() {
    const stored = localStorage.getItem("tgai-license-server");
    if (stored) {
      this.serverUrl.set(stored);
    }
  }
  saveToken(token) {
    this.token.set(token);
    localStorage.setItem("tgai-license-token", token);
  }
  clearToken() {
    this.token.set(null);
    localStorage.removeItem("tgai-license-token");
  }
  // ============ Token 刷新（安全加固）============
  startTokenRefresh() {
    this.tokenRefreshInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.refreshToken();
      });
    }, 20 * 60 * 60 * 1e3);
  }
  stopTokenRefresh() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
  listenForTokenRefresh() {
    window.addEventListener("refresh-token", () => {
      this.refreshToken();
    });
  }
  /**
   * 刷新 Token（安全加固）
   */
  async refreshToken() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false, message: "\u672A\u914D\u7F6E\u670D\u52D9\u5668\u6216\u7121 Token" };
    }
    try {
      const body = this.securityService.createSignedRequestBody({
        token: this.token(),
        machine_id: this.securityService.machineId,
        device_fingerprint: this.securityService.deviceFingerprint
      });
      const headers = this.securityService.createSecureHeaders();
      const response = await fetch(`${this.serverUrl()}/api/token/refresh`, {
        method: "POST",
        headers: __spreadValues({
          "Content-Type": "application/json"
        }, headers),
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (result.success && result.data?.token) {
        this.saveToken(result.data.token);
        return { success: true, message: "Token \u5237\u65B0\u6210\u529F" };
      }
      return { success: false, message: result.message || "Token \u5237\u65B0\u5931\u6557" };
    } catch (error) {
      return { success: false, message: "\u7DB2\u7D61\u932F\u8AA4" };
    }
  }
  // ============ 服務器配置 ============
  /**
   * 設置服務器地址
   */
  setServerUrl(url) {
    this.serverUrl.set(url.replace(/\/$/, ""));
    localStorage.setItem("tgai-license-server", url);
  }
  /**
   * 獲取服務器地址
   */
  getServerUrl() {
    return this.serverUrl();
  }
  /**
   * 檢查是否配置了服務器
   */
  isServerConfigured() {
    return !!this.serverUrl();
  }
  // ============ 卡密 API ============
  /**
   * 驗證卡密（不激活）
   */
  async validateLicense(licenseKey) {
    if (!this.isServerConfigured()) {
      return this.localValidate(licenseKey);
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/license/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_key: licenseKey })
      });
      const result = await response.json();
      this.isOnline.set(true);
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      this.isOnline.set(false);
      return this.localValidate(licenseKey);
    }
  }
  /**
   * 激活卡密
   */
  async activateLicense(licenseKey, email = "", inviteCode = "") {
    const machineId = this.getMachineId();
    const deviceId = this.getDeviceId();
    if (!this.isServerConfigured()) {
      const result = await this.membershipService.activateMembership(licenseKey, email);
      return { success: result.success, message: result.message };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/license/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenseKey,
          machine_id: machineId,
          device_id: deviceId,
          email,
          invite_code: inviteCode
        })
      });
      const result = await response.json();
      this.isOnline.set(true);
      if (result.success) {
        if (result.data?.token) {
          this.saveToken(result.data.token);
        }
        const localResult = await this.membershipService.activateMembership(licenseKey, email);
        if (!result.data?.level || !result.data?.expiresAt) {
          const currentMembership = this.membershipService.membership();
          if (currentMembership) {
            result.data = __spreadProps(__spreadValues({}, result.data), {
              level: currentMembership.level,
              levelName: currentMembership.levelName,
              levelIcon: currentMembership.levelIcon,
              expiresAt: currentMembership.expiresAt?.toISOString() || "",
              durationDays: 30
            });
          }
        }
      }
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      this.isOnline.set(false);
      const localResult = await this.membershipService.activateMembership(licenseKey, email);
      return { success: localResult.success, message: localResult.message + " (\u96E2\u7DDA\u6A21\u5F0F)" };
    }
  }
  /**
   * 心跳檢測
   */
  async sendHeartbeat() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: true, message: "\u96E2\u7DDA\u6A21\u5F0F" };
    }
    try {
      const usage = this.membershipService.usage();
      const response = await fetch(`${this.serverUrl()}/api/license/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: this.token(),
          machine_id: this.getMachineId(),
          usage
        })
      });
      const result = await response.json();
      this.ngZone.run(() => {
        this.isOnline.set(true);
        this.lastHeartbeat.set(/* @__PURE__ */ new Date());
        localStorage.setItem("tgai-last-online", Date.now().toString());
        if (result.success && result.data?.token) {
          this.saveToken(result.data.token);
        }
        if (result.data?.isExpired) {
          this.toastService.warning("\u60A8\u7684\u6703\u54E1\u5DF2\u904E\u671F\uFF0C\u8ACB\u7E8C\u8CBB\u7E7C\u7E8C\u4F7F\u7528");
        }
      });
      return {
        success: result.success,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
      const lastOnline = localStorage.getItem("tgai-last-online");
      if (lastOnline) {
        const offlineDuration = Date.now() - parseInt(lastOnline);
        if (offlineDuration > this.offlineGracePeriod) {
          return { success: false, message: "\u96E2\u7DDA\u6642\u9593\u904E\u9577\uFF0C\u8ACB\u9023\u63A5\u7DB2\u7D61\u9A57\u8B49" };
        }
      }
      return { success: true, message: "\u96E2\u7DDA\u6A21\u5F0F" };
    }
  }
  // ============ 用戶 API ============
  /**
   * 獲取用戶資料
   */
  async getUserProfile() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/user/profile`, {
        headers: {
          "Authorization": `Bearer ${this.token()}`,
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  /**
   * 獲取激活記錄
   */
  async getActivationHistory(limit = 50, offset = 0) {
    if (!this.isServerConfigured()) {
      return { success: false };
    }
    try {
      const machineId = this.getMachineId();
      const url = `${this.serverUrl()}/api/user/activation-history?machine_id=${machineId}&limit=${limit}&offset=${offset}`;
      const headers = { "Content-Type": "application/json" };
      if (this.token()) {
        headers["Authorization"] = `Bearer ${this.token()}`;
      }
      const response = await fetch(url, { headers });
      const result = await response.json();
      return { success: result.success, data: result.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }
  /**
   * 獲取配額信息
   */
  async getUserQuota() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/user/quota`, {
        headers: {
          "Authorization": `Bearer ${this.token()}`,
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  /**
   * 獲取使用統計（前端格式）
   */
  async getUsageStats() {
    if (!this.isServerConfigured()) {
      return { success: false };
    }
    try {
      const machineId = this.getMachineId();
      const url = `${this.serverUrl()}/api/user/usage-stats?machine_id=${machineId}`;
      const headers = { "Content-Type": "application/json" };
      if (this.token()) {
        headers["Authorization"] = `Bearer ${this.token()}`;
      }
      const response = await fetch(url, { headers });
      const result = await response.json();
      return { success: result.success, stats: result.stats };
    } catch (error) {
      return { success: false };
    }
  }
  // ============ 邀請 API ============
  /**
   * 獲取邀請信息
   */
  async getInviteInfo() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/invite/info`, {
        headers: {
          "Authorization": `Bearer ${this.token()}`,
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  /**
   * 獲取邀請列表
   */
  async getInviteList() {
    if (!this.isServerConfigured() || !this.token()) {
      return { success: false };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/invite/list`, {
        headers: {
          "Authorization": `Bearer ${this.token()}`,
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: false };
    }
  }
  // ============ 支付 API ============
  /**
   * 獲取產品列表
   */
  async fetchProducts() {
    if (!this.isServerConfigured()) {
      return { success: true, data: this.products };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/products`);
      const result = await response.json();
      return { success: result.success, data: result.data };
    } catch (error) {
      return { success: true, data: this.products };
    }
  }
  /**
   * 創建支付訂單
   */
  async createPayment(productId, paymentMethod = "usdt") {
    if (!this.isServerConfigured()) {
      return { success: false, message: "\u8ACB\u806F\u7E6B\u5BA2\u670D\u8CFC\u8CB7\u5361\u5BC6" };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          machine_id: this.getMachineId(),
          payment_method: paymentMethod
        })
      });
      const result = await response.json();
      if (result.success) {
        return {
          success: true,
          message: "\u8A02\u55AE\u5275\u5EFA\u6210\u529F",
          order: result.data
        };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: "\u5275\u5EFA\u8A02\u55AE\u5931\u6557\uFF0C\u8ACB\u7A0D\u5F8C\u91CD\u8A66" };
    }
  }
  /**
   * 檢查支付狀態
   */
  async checkPaymentStatus(orderId) {
    if (!this.isServerConfigured()) {
      return { success: false, paid: false, message: "\u670D\u52D9\u5668\u672A\u914D\u7F6E" };
    }
    try {
      const response = await fetch(`${this.serverUrl()}/api/payment/status/${orderId}`);
      const result = await response.json();
      return {
        success: result.success,
        paid: result.data?.status === "paid",
        licenseKey: result.data?.license_key,
        message: result.message
      };
    } catch (error) {
      return { success: false, paid: false, message: "\u67E5\u8A62\u652F\u4ED8\u72C0\u614B\u5931\u6557" };
    }
  }
  // ============ 心跳管理 ============
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 5 * 60 * 1e3);
    setTimeout(() => this.sendHeartbeat(), 5e3);
    window.addEventListener("online", () => {
      this.isOnline.set(true);
      localStorage.setItem("tgai-last-online", Date.now().toString());
      this.sendHeartbeat();
    });
    window.addEventListener("offline", () => {
      this.isOnline.set(false);
    });
  }
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  // ============ 輔助方法 ============
  getMachineId() {
    let machineId = localStorage.getItem("tgai-machine-id");
    if (!machineId) {
      machineId = "mid-" + this.generateId();
      localStorage.setItem("tgai-machine-id", machineId);
    }
    return machineId;
  }
  getDeviceId() {
    let deviceId = localStorage.getItem("tgai-device-id");
    if (!deviceId) {
      deviceId = "dev-" + this.generateId().substring(0, 12);
      localStorage.setItem("tgai-device-id", deviceId);
    }
    return deviceId;
  }
  generateId() {
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  localValidate(licenseKey) {
    const keyRegex = /^TGAI-([BGDSK][123YL]|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const match = licenseKey.toUpperCase().match(keyRegex);
    if (!match) {
      const oldKeyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      const oldMatch = licenseKey.toUpperCase().match(oldKeyRegex);
      if (!oldMatch) {
        return { success: false, message: "\u5361\u5BC6\u683C\u5F0F\u4E0D\u6B63\u78BA" };
      }
    }
    return {
      success: true,
      message: "\u5361\u5BC6\u683C\u5F0F\u6709\u6548 (\u96E2\u7DDA\u9A57\u8B49)",
      data: {
        level: "gold",
        levelName: "\u9EC3\u91D1\u5927\u5E2B",
        levelIcon: "\u{1F947}",
        expiresAt: "",
        durationDays: 30
      }
    };
  }
  /**
   * 獲取產品按等級分組
   */
  getProductsByLevel() {
    const grouped = {
      bronze: [],
      silver: [],
      gold: [],
      diamond: [],
      star: [],
      king: []
    };
    for (const product of this.products) {
      if (grouped[product.level]) {
        grouped[product.level].push(product);
      }
    }
    return grouped;
  }
  /**
   * 獲取推薦產品
   */
  getRecommendedProducts() {
    return [
      this.products.find((p) => p.id === "gold_month"),
      this.products.find((p) => p.id === "diamond_month"),
      this.products.find((p) => p.id === "star_year")
    ].filter(Boolean);
  }
  static {
    this.\u0275fac = function LicenseClientService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LicenseClientService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _LicenseClientService, factory: _LicenseClientService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LicenseClientService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  LicenseClientService
};
//# sourceMappingURL=chunk-ZIT2CRMJ.js.map
