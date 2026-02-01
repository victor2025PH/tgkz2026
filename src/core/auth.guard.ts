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
import { environment } from '../environments/environment';

/**
 * 基礎認證守衛
 * 檢查用戶是否已登入
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // 本地版（Electron）不需要認證
  // 必須同時滿足：1) apiMode 為 ipc 2) 在 Electron 環境中
  const isElectron = !!(window as any).electronAPI || !!(window as any).electron;
  if (environment.apiMode === 'ipc' && isElectron) {
    return true;
  }
  
  // SaaS 模式：嚴格檢查認證狀態
  if (authService.isAuthenticated()) {
    // 額外驗證：確保有有效的 token
    const token = authService.accessToken();
    if (token && token.length > 10) {
      return true;
    }
  }
  
  // 清除可能的無效狀態
  authService.clearSession();
  
  // 保存原始 URL 用於登入後重定向
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
  
  // 嚴格檢查認證狀態
  const isAuthenticated = authService.isAuthenticated();
  const hasValidToken = authService.accessToken() && (authService.accessToken()?.length || 0) > 10;
  
  if (!isAuthenticated || !hasValidToken) {
    return true;
  }
  
  // 已登入，重定向到首頁
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
