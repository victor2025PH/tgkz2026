/**
 * 認證守衛
 * 
 * 優化設計：
 * 1. 支持多種路由保護策略
 * 2. 訂閱級別檢查
 * 3. 功能權限檢查
 * 4. 重定向到登入頁
 */

import { inject } from '@angular/core';
import { Router, CanActivateFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthEventsService } from './auth-events.service';
import { environment } from '../environments/environment';
import { isElectronRuntime } from '../utils/runtime-env.util';

/**
 * 🔧 輔助函數：本地解析 JWT Payload，檢查是否已過期
 * 不需要訪問後端，完全在前端完成
 * 返回: true = Token 未過期且格式有效, false = Token 已過期或格式無效
 */
function isTokenAlive(token: string | null): boolean {
  if (!token || token.length < 20) return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // URL-safe Base64 解碼
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(atob(base64));
    
    // 檢查 exp（過期時間）
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.warn('[AuthGuard] Access token expired at', new Date(payload.exp * 1000).toISOString());
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 基礎認證守衛
 * 🔧 修復：檢查 JWT 是否真的未過期，而非僅檢查長度
 * 
 * 邏輯：
 * 1. Electron 模式 → 放行
 * 2. Access Token 未過期 → 放行
 * 3. Access Token 過期但 Refresh Token 未過期 → 放行（背景會自動刷新）
 * 4. 兩個都過期/不存在 → 清除殘留 Token 並重定向到登入頁
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const authEvents = inject(AuthEventsService);
  const router = inject(Router);
  
  // 本地版（Electron）不需要認證
  // 🔧 用統一偵測（含 window.require）：本專案 renderer 靠 window.require 取 ipcRenderer，
  // 舊條件漏判導致桌面版免登入例外失效、被踹回登入頁。
  const isElectron = isElectronRuntime();
  if (environment.apiMode === 'ipc' && isElectron) {
    return true;
  }
  
  // 🔧 取得 Access Token 和 Refresh Token
  const accessToken = authService.accessToken() || localStorage.getItem('tgm_access_token');
  const refreshToken = localStorage.getItem('tgm_refresh_token');
  
  console.log('[AuthGuard] Checking auth:', {
    hasAccessToken: !!accessToken,
    accessTokenAlive: isTokenAlive(accessToken),
    hasRefreshToken: !!refreshToken,
    refreshTokenAlive: isTokenAlive(refreshToken)
  });
  
  // ✅ Access Token 存在且未過期 → 放行
  if (isTokenAlive(accessToken)) {
    return true;
  }
  
  // ⚠️ Access Token 過期，但 Refresh Token 未過期 → 放行（背景自動刷新）
  if (isTokenAlive(refreshToken)) {
    console.log('[AuthGuard] Access token expired but refresh token valid, allowing with background refresh');
    return true;
  }
  
  // ❌ 兩個都過期/不存在 → 清除殘留 Token，重定向登入頁
  console.warn('[AuthGuard] All tokens expired or missing, clearing and redirecting to login');
  authEvents.clearAllAuthStorage();
  
  const returnUrl = state.url;
  router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  return false;
};

/**
 * 訪客守衛
 * 已登入用戶無法訪問（如登入頁）
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // 🔧 修復：使用 JWT 過期檢測判斷是否真的已登入
  const token = authService.accessToken();
  const refreshToken = localStorage.getItem('tgm_refresh_token');
  
  if (!isTokenAlive(token) && !isTokenAlive(refreshToken)) {
    // Token 不存在或已過期 → 允許訪問登入頁
    return true;
  }
  
  // 確實已登入且 Token 有效，重定向到首頁
  router.navigate(['/dashboard']);
  return false;
};

/**
 * 訂閱級別守衛工廠
 * 檢查用戶訂閱級別
 */
export function subscriptionGuard(requiredTier: string): CanActivateFn {
  const tierLevels: Record<string, number> = {
    'free': 0,
    'basic': 1,
    'pro': 2,
    'enterprise': 3
  };
  
  return (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // 本地版不限制
    if (environment.apiMode === 'ipc') {
      return true;
    }
    
    if (!authService.isAuthenticated()) {
      router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    
    const userTier = authService.subscriptionTier();
    const userLevel = tierLevels[userTier] || 0;
    const requiredLevel = tierLevels[requiredTier] || 0;
    
    if (userLevel >= requiredLevel) {
      return true;
    }
    
    // 訂閱級別不足，重定向到升級頁面
    router.navigate(['/upgrade'], { 
      queryParams: { 
        required: requiredTier,
        feature: route.data?.['feature'] || 'this feature'
      } 
    });
    return false;
  };
}

/**
 * 功能權限守衛工廠
 */
export function featureGuard(feature: string): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // 本地版不限制
    if (environment.apiMode === 'ipc') {
      return true;
    }
    
    if (authService.hasFeature(feature)) {
      return true;
    }
    
    router.navigate(['/upgrade'], { queryParams: { feature } });
    return false;
  };
}

/**
 * 管理員守衛
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const user = authService.user();
  if (user?.role === 'admin') {
    return true;
  }
  
  router.navigate(['/']);
  return false;
};

/**
 * 帳號數量守衛
 * 檢查用戶是否可以添加更多帳號
 */
export const accountLimitGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // 本地版不限制
  if (environment.apiMode === 'ipc') {
    return true;
  }
  
  // TODO: 獲取當前帳號數量並與 maxAccounts 比較
  const maxAccounts = authService.maxAccounts();
  
  // 暫時允許
  return true;
};
