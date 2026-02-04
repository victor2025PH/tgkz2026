import {
  AuthService
} from "./chunk-SW4QBT65.js";
import {
  Router
} from "./chunk-T45T4QAG.js";
import {
  inject
} from "./chunk-K4KD4A2Z.js";

// src/environments/environment.ts
var environment = {
  production: false,
  // API 模式: 'auto' | 'ipc' | 'http'
  // auto: 自動檢測（Electron 用 IPC，瀏覽器用 HTTP）
  apiMode: "auto",
  // HTTP API 配置（僅 http 模式使用）
  apiBaseUrl: "http://localhost:8000",
  wsUrl: "ws://localhost:8000/ws",
  // 功能開關
  features: {
    maxAccounts: 999,
    aiEnabled: true,
    teamFeatures: true,
    apiAccess: true,
    debug: true
  },
  // 版本信息
  version: "2.1.1",
  buildDate: (/* @__PURE__ */ new Date()).toISOString()
};

// src/core/auth.guard.ts
var authGuard = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isElectron = !!window.electronAPI || !!window.electron;
  if (environment.apiMode === "ipc" && isElectron) {
    return true;
  }
  const token = authService.accessToken();
  const localToken = localStorage.getItem("tgm_access_token");
  console.log("[AuthGuard] Checking auth:", {
    isAuthenticated: authService.isAuthenticated(),
    hasServiceToken: !!token,
    hasLocalToken: !!localToken
  });
  if (token && token.length > 10) {
    return true;
  }
  if (localToken && localToken.length > 10) {
    console.log("[AuthGuard] Using localStorage token fallback");
    return true;
  }
  const returnUrl = state.url;
  router.navigate(["/auth/login"], { queryParams: { returnUrl } });
  return false;
};
var guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isAuthenticated = authService.isAuthenticated();
  const hasValidToken = authService.accessToken() && (authService.accessToken()?.length || 0) > 10;
  if (!isAuthenticated || !hasValidToken) {
    return true;
  }
  router.navigate(["/dashboard"]);
  return false;
};

export {
  authGuard,
  guestGuard
};
//# sourceMappingURL=chunk-NBA6WUCF.js.map
