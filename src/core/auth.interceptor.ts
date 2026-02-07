/**
 * 認證攔截器
 * 
 * 🆕 增強功能：
 * 1. 自動為所有 HTTP 請求添加認證 Header
 * 2. 處理 401 響應並嘗試刷新 Token
 * 3. 刷新失敗則登出用戶
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthEventsService, AUTH_STORAGE_KEYS } from './auth-events.service';

// 正在刷新 Token 的標記（避免重複刷新）
let isRefreshing = false;

// 刷新 Token 的 Promise（用於等待刷新完成）
let refreshPromise: Promise<boolean> | null = null;

/**
 * 刷新 Token
 */
async function refreshToken(): Promise<boolean> {
  const refreshTokenValue = localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshTokenValue) {
    return false;
  }
  
  try {
    const baseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : '';
    const response = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshTokenValue })
    });
    
    const text = await response.text();
    let result: any;
    try {
      result = text.trim().startsWith('<') ? null : JSON.parse(text);
    } catch {
      result = null;
    }
    if (!result) return false;
    
    if (result.success && result.data) {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, result.data.access_token);
      if (result.data.refresh_token) {
        localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, result.data.refresh_token);
      }
      console.log('[AuthInterceptor] Token refreshed successfully');
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('[AuthInterceptor] Token refresh failed:', e);
    return false;
  }
}

/**
 * 處理 401 錯誤
 */
async function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authEvents: AuthEventsService,
  router: Router
): Promise<any> {
  // 如果已經在刷新，等待刷新完成
  if (isRefreshing && refreshPromise) {
    const success = await refreshPromise;
    if (success) {
      // 重試原始請求
      const newToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      if (newToken) {
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });
        return next(clonedReq).toPromise();
      }
    }
    throw new Error('Token refresh failed');
  }
  
  // 開始刷新
  isRefreshing = true;
  refreshPromise = refreshToken();
  
  try {
    const success = await refreshPromise;
    
    if (success) {
      // 重試原始請求
      const newToken = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      if (newToken) {
        const clonedReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });
        return next(clonedReq).toPromise();
      }
    }
    
    // 刷新失敗，登出用戶
    console.log('[AuthInterceptor] Token refresh failed, logging out');
    authEvents.emitSessionExpired();
    authEvents.clearAllAuthStorage();
    router.navigate(['/auth/login']);
    throw new Error('Session expired');
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authEvents = inject(AuthEventsService);
  const router = inject(Router);
  
  // 從 localStorage 讀取 Token
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  
  // 如果有 Token 且請求沒有 Authorization Header，則添加
  let clonedReq = req;
  if (token && !req.headers.has('Authorization')) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }
  
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 處理 401 未授權錯誤
      if (error.status === 401 && !req.url.includes('/auth/refresh') && !req.url.includes('/auth/login')) {
        // 嘗試刷新 Token
        return from(handle401Error(req, next, authEvents, router));
      }
      
      return throwError(() => error);
    })
  );
};
