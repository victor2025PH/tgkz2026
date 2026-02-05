import {
  Injectable,
  Subject,
  setClassMetadata,
  ɵɵdefineInjectable
} from "./chunk-K4KD4A2Z.js";

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

export {
  AUTH_STORAGE_KEYS,
  AuthEventsService
};
//# sourceMappingURL=chunk-VXLC6YHT.js.map
