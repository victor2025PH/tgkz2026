/**
 * 認證事件服務
 * 
 * 🆕 統一認證事件總線
 * 解決多個 AuthService 狀態不同步的問題
 * 
 * 設計原則：
 * 1. 單一事件源 - 所有認證事件通過此服務廣播
 * 2. 解耦依賴 - 避免服務間循環依賴
 * 3. 事件驅動 - 使用 RxJS Subject 廣播事件
 */

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

// 認證事件類型
export type AuthEventType = 
  | 'login'           // 登入成功
  | 'logout'          // 登出
  | 'session_expired' // 會話過期
  | 'token_refresh'   // Token 刷新
  | 'user_update';    // 用戶信息更新

// 認證事件數據
export interface AuthEvent {
  type: AuthEventType;
  payload?: any;
  timestamp: number;
}

// Token 存儲鍵 - 集中管理
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'tgm_access_token',
  REFRESH_TOKEN: 'tgm_refresh_token',
  AUTH_TOKEN: 'tgm_auth_token',  // 舊版兼容
  USER: 'tgm_user',
  SESSION_ID: 'tgm_session_id',
  REMEMBER_ME: 'tgm_remember_me'  // 🆕 記住登入狀態
} as const;

@Injectable({
  providedIn: 'root'
})
export class AuthEventsService {
  // 認證事件主題
  private _authEvents = new Subject<AuthEvent>();
  
  // 公開的事件流
  readonly authEvents$: Observable<AuthEvent> = this._authEvents.asObservable();
  
  /**
   * 廣播登入事件
   */
  emitLogin(payload?: any): void {
    this._authEvents.next({
      type: 'login',
      payload,
      timestamp: Date.now()
    });
    console.log('[AuthEvents] Login event emitted');
  }
  
  /**
   * 廣播登出事件
   */
  emitLogout(): void {
    this._authEvents.next({
      type: 'logout',
      timestamp: Date.now()
    });
    console.log('[AuthEvents] Logout event emitted');
  }
  
  /**
   * 廣播會話過期事件
   */
  emitSessionExpired(): void {
    this._authEvents.next({
      type: 'session_expired',
      timestamp: Date.now()
    });
    console.log('[AuthEvents] Session expired event emitted');
  }
  
  /**
   * 廣播 Token 刷新事件
   */
  emitTokenRefresh(newToken: string): void {
    this._authEvents.next({
      type: 'token_refresh',
      payload: { token: newToken },
      timestamp: Date.now()
    });
  }
  
  /**
   * 廣播用戶信息更新事件
   */
  emitUserUpdate(user: any): void {
    this._authEvents.next({
      type: 'user_update',
      payload: { user },
      timestamp: Date.now()
    });
  }
  
  /**
   * 清除所有認證相關的 localStorage
   * 集中式管理，確保徹底清除
   */
  clearAllAuthStorage(): void {
    console.log('[AuthEvents] Clearing all auth storage');
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
  
  /**
   * 獲取當前 Token（從 localStorage）
   */
  getStoredToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN) 
        || localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
  }
  
  /**
   * 獲取存儲的用戶信息
   */
  getStoredUser(): any | null {
    try {
      const userJson = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  }
}
