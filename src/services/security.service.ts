/**
 * 前端安全服務
 * 
 * P1.5: 安全增強
 * 1. CSRF Token 管理
 * 2. 登入嘗試限制
 * 3. 安全頭處理
 * 4. XSS 防護
 */

import { Injectable, signal, computed } from '@angular/core';

// CSRF 配置
const CSRF_CONFIG = {
  COOKIE_NAME: 'csrf_token',
  HEADER_NAME: 'X-CSRF-Token',
  STORAGE_KEY: 'tgm_csrf_token'
};

// 登入限制配置
const LOGIN_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,           // 最大嘗試次數
  LOCKOUT_DURATION: 300,     // 鎖定時長（秒）
  ATTEMPT_WINDOW: 900,       // 嘗試窗口（秒）
  STORAGE_KEY: 'tgm_login_attempts'
};

interface LoginAttempt {
  timestamp: number;
  success: boolean;
  email?: string;
}

interface LoginLockout {
  lockedUntil: number;
  attempts: LoginAttempt[];
}

@Injectable({
  providedIn: 'root'
})
export class FrontendSecurityService {
  
  // ==================== CSRF Token 管理 ====================
  
  private _csrfToken = signal<string>('');
  readonly csrfToken = computed(() => this._csrfToken());
  
  constructor() {
    // 初始化時嘗試從 Cookie 獲取 CSRF Token
    this.refreshCsrfToken();
  }
  
  /**
   * 從 Cookie 刷新 CSRF Token
   */
  refreshCsrfToken(): void {
    const token = this.getCookie(CSRF_CONFIG.COOKIE_NAME);
    if (token) {
      this._csrfToken.set(token);
    }
  }
  
  /**
   * 獲取 CSRF Token（用於請求頭）
   */
  getCsrfToken(): string {
    return this._csrfToken();
  }
  
  /**
   * 獲取包含 CSRF Token 的請求頭
   */
  getCsrfHeaders(): Record<string, string> {
    const token = this.getCsrfToken();
    if (token) {
      return { [CSRF_CONFIG.HEADER_NAME]: token };
    }
    return {};
  }
  
  /**
   * 增強的 fetch，自動添加 CSRF Token
   */
  async secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    
    // 添加 CSRF Token
    const csrfToken = this.getCsrfToken();
    if (csrfToken) {
      headers.set(CSRF_CONFIG.HEADER_NAME, csrfToken);
    }
    
    // 添加安全頭
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'  // 包含 Cookie
    });
    
    // 從響應更新 CSRF Token
    this.refreshCsrfToken();
    
    return response;
  }
  
  // ==================== 登入嘗試限制 ====================
  
  private _isLocked = signal<boolean>(false);
  private _lockoutRemaining = signal<number>(0);
  private _attemptCount = signal<number>(0);
  
  readonly isLocked = computed(() => this._isLocked());
  readonly lockoutRemaining = computed(() => this._lockoutRemaining());
  readonly attemptCount = computed(() => this._attemptCount());
  readonly attemptsLeft = computed(() => Math.max(0, LOGIN_LIMIT_CONFIG.MAX_ATTEMPTS - this._attemptCount()));
  
  /**
   * 檢查是否可以嘗試登入
   */
  canAttemptLogin(): { allowed: boolean; message?: string; waitSeconds?: number } {
    const lockout = this.getLockoutData();
    const now = Date.now();
    
    // 檢查是否被鎖定
    if (lockout.lockedUntil > now) {
      const waitSeconds = Math.ceil((lockout.lockedUntil - now) / 1000);
      this._isLocked.set(true);
      this._lockoutRemaining.set(waitSeconds);
      return {
        allowed: false,
        message: `登入嘗試次數過多，請 ${this.formatDuration(waitSeconds)} 後再試`,
        waitSeconds
      };
    }
    
    this._isLocked.set(false);
    this._lockoutRemaining.set(0);
    
    // 計算最近的嘗試次數
    const recentAttempts = this.getRecentAttempts(lockout.attempts);
    this._attemptCount.set(recentAttempts.length);
    
    if (recentAttempts.length >= LOGIN_LIMIT_CONFIG.MAX_ATTEMPTS) {
      // 設置鎖定
      const lockedUntil = now + LOGIN_LIMIT_CONFIG.LOCKOUT_DURATION * 1000;
      this.setLockout(lockedUntil, lockout.attempts);
      
      const waitSeconds = LOGIN_LIMIT_CONFIG.LOCKOUT_DURATION;
      this._isLocked.set(true);
      this._lockoutRemaining.set(waitSeconds);
      
      return {
        allowed: false,
        message: `登入嘗試次數過多，請 ${this.formatDuration(waitSeconds)} 後再試`,
        waitSeconds
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 記錄登入嘗試
   */
  recordLoginAttempt(success: boolean, email?: string): void {
    const lockout = this.getLockoutData();
    
    // 添加新嘗試
    lockout.attempts.push({
      timestamp: Date.now(),
      success,
      email
    });
    
    // 只保留最近的嘗試
    lockout.attempts = this.getRecentAttempts(lockout.attempts);
    
    // 如果成功，清除鎖定和嘗試記錄
    if (success) {
      lockout.lockedUntil = 0;
      lockout.attempts = [];
    }
    
    this.saveLockoutData(lockout);
    this._attemptCount.set(lockout.attempts.filter(a => !a.success).length);
  }
  
  /**
   * 清除登入限制
   */
  clearLoginLimit(): void {
    localStorage.removeItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY);
    this._isLocked.set(false);
    this._lockoutRemaining.set(0);
    this._attemptCount.set(0);
  }
  
  /**
   * 獲取最近的失敗嘗試
   */
  private getRecentAttempts(attempts: LoginAttempt[]): LoginAttempt[] {
    const windowStart = Date.now() - LOGIN_LIMIT_CONFIG.ATTEMPT_WINDOW * 1000;
    return attempts.filter(a => a.timestamp > windowStart && !a.success);
  }
  
  /**
   * 獲取鎖定數據
   */
  private getLockoutData(): LoginLockout {
    try {
      const data = localStorage.getItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to parse lockout data:', e);
    }
    return { lockedUntil: 0, attempts: [] };
  }
  
  /**
   * 保存鎖定數據
   */
  private saveLockoutData(data: LoginLockout): void {
    localStorage.setItem(LOGIN_LIMIT_CONFIG.STORAGE_KEY, JSON.stringify(data));
  }
  
  /**
   * 設置鎖定
   */
  private setLockout(lockedUntil: number, attempts: LoginAttempt[]): void {
    this.saveLockoutData({ lockedUntil, attempts });
  }
  
  // ==================== XSS 防護 ====================
  
  /**
   * 清理 HTML（防止 XSS）
   */
  sanitizeHtml(html: string): string {
    // 創建臨時元素
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
  }
  
  /**
   * 驗證 URL 安全性
   */
  isUrlSafe(url: string): boolean {
    if (!url) return false;
    
    // 禁止 javascript: 協議
    if (url.toLowerCase().startsWith('javascript:')) return false;
    
    // 禁止 data: 協議（除了圖片）
    if (url.toLowerCase().startsWith('data:') && !url.toLowerCase().startsWith('data:image/')) {
      return false;
    }
    
    // 只允許 http/https 和相對路徑
    if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 轉義 HTML 特殊字符
   */
  escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  // ==================== 輔助方法 ====================
  
  /**
   * 獲取 Cookie 值
   */
  private getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  
  /**
   * 格式化持續時間
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} 秒`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} 分鐘`;
  }
  
  /**
   * 啟動鎖定倒計時
   */
  startLockoutCountdown(callback?: (remaining: number) => void): () => void {
    const interval = setInterval(() => {
      const remaining = this._lockoutRemaining();
      if (remaining <= 0) {
        clearInterval(interval);
        this._isLocked.set(false);
        callback?.(0);
        return;
      }
      
      this._lockoutRemaining.update(r => r - 1);
      callback?.(remaining - 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }
}
