/**
 * 🔧 P8-1: 離線 HTTP 攔截器
 * 
 * 功能：
 * 1. 離線時自動將寫操作（POST/PUT/DELETE）加入隊列
 * 2. GET 請求離線時嘗試返回緩存數據
 * 3. 網絡錯誤時自動重試一次（非離線場景）
 * 4. 添加 X-Offline-Queued 頭標記排隊的請求
 * 
 * 不處理的場景：
 * - 認證相關請求（/auth/）
 * - WebSocket 升級
 * - 已有離線標記的請求
 */

import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, of } from 'rxjs';
import { HttpResponse } from '@angular/common/http';
import { OfflineCacheService } from '../services/offline-cache.service';
import { ToastService } from '../toast.service';
import { I18nService } from '../i18n.service';

// 不進入離線隊列的路徑
const SKIP_OFFLINE_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/api/v1/errors',       // 錯誤上報不排隊
  '/api/v1/performance',  // 性能上報不排隊
];

// 可以返回緩存的 GET 路徑
const CACHEABLE_GET_PATHS = [
  '/api/v1/accounts',
  '/api/v1/auth/me',
];

export const offlineInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const offlineCache = inject(OfflineCacheService);
  const toast = inject(ToastService);
  const i18n = inject(I18nService);

  // 跳過不需要離線處理的路徑
  if (SKIP_OFFLINE_PATHS.some(p => req.url.includes(p))) {
    return next(req);
  }

  // 已標記為離線重試的請求，直接通過
  if (req.headers.has('X-Offline-Retry')) {
    return next(req);
  }

  const isOnline = offlineCache.isOnline();
  const isWriteOp = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  // === 離線場景 ===
  if (!isOnline) {
    if (isWriteOp) {
      // 寫操作 → 加入隊列（addOfflineOperation 接受 command + payload）
      offlineCache.addOfflineOperation(
        `${req.method} ${req.urlWithParams}`,
        {
          method: req.method,
          url: req.urlWithParams,
          body: req.body,
          headers: extractHeaders(req)
        }
      );

      toast.info(i18n.t('offline.queuedSuccess'));

      // 返回模擬成功響應（讓 UI 繼續正常運作）
      return of(new HttpResponse({
        status: 202,
        body: {
          success: true,
          offline_queued: true,
          message: '操作已排入離線隊列'
        }
      }));
    }

    // GET 請求 → 嘗試返回緩存
    if (req.method === 'GET' && CACHEABLE_GET_PATHS.some(p => req.url.includes(p))) {
      const cached = offlineCache.cachedState();
      if (cached && offlineCache.isCacheValid()) {
        // 返回緩存的數據
        return of(new HttpResponse({
          status: 200,
          body: { success: true, data: cached, _from_cache: true }
        }));
      }
    }

    // 其他離線 GET → 直接報錯（不隊列）
    return throwError(() => new HttpErrorResponse({
      status: 0,
      statusText: '網絡離線',
      url: req.url
    }));
  }

  // === 在線場景 — 正常發送，但攔截網絡錯誤 ===
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // 網絡錯誤（status 0）且是寫操作 → 可能剛離線
      if (error.status === 0 && isWriteOp) {
        offlineCache.addOfflineOperation(
          `${req.method} ${req.urlWithParams}`,
          {
            method: req.method,
            url: req.urlWithParams,
            body: req.body,
            headers: extractHeaders(req)
          }
        );

        toast.warning(i18n.t('offline.queuedRetry'));

        return of(new HttpResponse({
          status: 202,
          body: {
            success: true,
            offline_queued: true
          }
        }));
      }

      return throwError(() => error);
    })
  );
};

/**
 * 從 HttpRequest 中提取需要保留的自定義 Headers
 */
function extractHeaders(req: HttpRequest<unknown>): Record<string, string> {
  const headers: Record<string, string> = {};
  // 只保留自定義頭，不保留 Authorization（重試時重新添加）
  const keysToKeep = ['Content-Type', 'Accept', 'X-Request-ID'];

  for (const key of keysToKeep) {
    if (req.headers.has(key)) {
      headers[key] = req.headers.get(key)!;
    }
  }

  return headers;
}
