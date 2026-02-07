/**
 * 統一錯誤處理服務
 * Unified Error Handler Service
 * 
 * 功能：
 * 1. 統一錯誤格式
 * 2. 錯誤日誌記錄
 * 3. 用戶友好提示
 * 4. 錯誤恢復建議
 */

import { Injectable, signal, inject, ErrorHandler } from '@angular/core';
import { ToastService } from '../toast.service';

/**
 * 全局錯誤處理器 (Angular ErrorHandler)
 * 攔截所有未處理的錯誤
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorHandlerService = inject(ErrorHandlerService);
  
  handleError(error: any): void {
    console.error('Global error caught:', error);
    // 使用統一錯誤處理服務
    this.errorHandlerService.handle(error);
  }
}

// 錯誤類型
export type ErrorType = 
  | 'network'      // 網絡錯誤
  | 'auth'         // 認證錯誤
  | 'permission'   // 權限錯誤
  | 'validation'   // 驗證錯誤
  | 'telegram'     // Telegram API 錯誤
  | 'database'     // 數據庫錯誤
  | 'ai'           // AI 服務錯誤
  | 'unknown';     // 未知錯誤

// 錯誤嚴重程度
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// 統一錯誤格式
export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  message: string;
  userMessage: string;       // 用戶友好消息
  suggestion?: string;       // 解決建議
  details?: any;
  timestamp: string;
  stack?: string;
  context?: {
    component?: string;
    action?: string;
    data?: any;
  };
}

// 錯誤統計
export interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  lastHour: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private toast = inject(ToastService);
  
  // 錯誤歷史
  private _errors = signal<AppError[]>([]);
  errors = this._errors.asReadonly();
  
  // 最後一個錯誤
  private _lastError = signal<AppError | null>(null);
  lastError = this._lastError.asReadonly();
  
  // 錯誤統計
  private _stats = signal<ErrorStats>({
    total: 0,
    byType: {
      network: 0,
      auth: 0,
      permission: 0,
      validation: 0,
      telegram: 0,
      database: 0,
      ai: 0,
      unknown: 0
    },
    bySeverity: {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    },
    lastHour: 0
  });
  stats = this._stats.asReadonly();
  
  /**
   * 處理錯誤
   */
  handle(
    error: Error | string | any,
    context?: { component?: string; action?: string; data?: any },
    options?: { silent?: boolean; severity?: ErrorSeverity }
  ): AppError {
    // 解析錯誤
    const appError = this.parseError(error, context);
    
    // 設置嚴重程度
    if (options?.severity) {
      appError.severity = options.severity;
    }
    
    // 記錄錯誤
    this.logError(appError);
    
    // 更新狀態
    this._errors.update(list => [appError, ...list.slice(0, 99)]);
    this._lastError.set(appError);
    this.updateStats(appError);
    
    // 顯示提示（除非靜默模式）
    if (!options?.silent) {
      this.showToast(appError);
    }
    
    // 控制台輸出
    console.error(`[${appError.type.toUpperCase()}] ${appError.message}`, {
      error: appError,
      context
    });
    
    return appError;
  }
  
  /**
   * 解析錯誤
   */
  private parseError(error: any, context?: any): AppError {
    const id = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // 字符串錯誤
    if (typeof error === 'string') {
      return {
        id,
        type: this.detectErrorType(error),
        severity: 'error',
        message: error,
        userMessage: this.toUserMessage(error),
        suggestion: this.getSuggestion(error),
        timestamp,
        context
      };
    }
    
    // Error 對象
    if (error instanceof Error) {
      const type = this.detectErrorType(error.message);
      return {
        id,
        type,
        severity: 'error',
        message: error.message,
        userMessage: this.toUserMessage(error.message, type),
        suggestion: this.getSuggestion(error.message, type),
        stack: error.stack,
        timestamp,
        context
      };
    }
    
    // 對象格式錯誤
    if (typeof error === 'object') {
      const message = error.message || error.error || JSON.stringify(error);
      const type = error.type || this.detectErrorType(message);
      return {
        id,
        type,
        severity: error.severity || 'error',
        code: error.code,
        message,
        userMessage: error.userMessage || this.toUserMessage(message, type),
        suggestion: error.suggestion || this.getSuggestion(message, type),
        details: error.details || error,
        timestamp,
        context
      };
    }
    
    // 未知格式
    return {
      id,
      type: 'unknown',
      severity: 'error',
      message: String(error),
      userMessage: '發生未知錯誤，請稍後重試',
      timestamp,
      context
    };
  }
  
  /**
   * 檢測錯誤類型
   */
  private detectErrorType(message: string): ErrorType {
    const msg = message.toLowerCase();
    
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout') || msg.includes('connection')) {
      return 'network';
    }
    if (msg.includes('auth') || msg.includes('login') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('401')) {
      return 'auth';
    }
    if (msg.includes('permission') || msg.includes('forbidden') || msg.includes('403') || msg.includes('access denied')) {
      return 'permission';
    }
    if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required') || msg.includes('format')) {
      return 'validation';
    }
    if (msg.includes('telegram') || msg.includes('pyrogram') || msg.includes('flood') || msg.includes('peer') || msg.includes('chat')) {
      return 'telegram';
    }
    if (msg.includes('database') || msg.includes('sqlite') || msg.includes('sql') || msg.includes('query')) {
      return 'database';
    }
    if (msg.includes('ai') || msg.includes('openai') || msg.includes('gemini') || msg.includes('ollama') || msg.includes('model')) {
      return 'ai';
    }
    
    return 'unknown';
  }
  
  /**
   * 轉換為用戶友好消息
   */
  private toUserMessage(message: string, type?: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      network: '網絡連接出現問題，請檢查您的網絡連接',
      auth: '登錄狀態已過期，請重新登錄',
      permission: '您沒有權限執行此操作',
      validation: '輸入的數據格式不正確，請檢查後重試',
      telegram: 'Telegram 服務暫時不可用，請稍後重試',
      database: '數據存取出現問題，請稍後重試',
      ai: 'AI 服務暫時不可用，請稍後重試',
      unknown: '發生未知錯誤，請稍後重試'
    };
    
    if (type) {
      return messages[type];
    }
    
    // 嘗試簡化技術性消息
    if (message.includes('FLOOD_WAIT')) {
      const match = message.match(/FLOOD_WAIT_(\d+)/);
      const seconds = match ? parseInt(match[1]) : 60;
      return `發送過於頻繁，請等待 ${seconds} 秒後重試`;
    }
    
    if (message.includes('USER_PRIVACY_RESTRICTED')) {
      return '該用戶已開啟隱私保護，無法發送消息';
    }
    
    if (message.includes('PEER_ID_INVALID')) {
      return '用戶不存在或已被封禁';
    }
    
    return messages[this.detectErrorType(message)];
  }
  
  /**
   * 獲取解決建議
   */
  private getSuggestion(message: string, type?: ErrorType): string {
    const suggestions: Record<ErrorType, string> = {
      network: '1. 檢查網絡連接\n2. 嘗試刷新頁面\n3. 檢查代理設置',
      auth: '1. 重新登錄帳號\n2. 清除瀏覽器緩存\n3. 聯繫客服',
      permission: '1. 確認帳號權限\n2. 升級會員等級\n3. 聯繫管理員',
      validation: '1. 檢查輸入格式\n2. 確保必填項已填寫\n3. 參考幫助文檔',
      telegram: '1. 檢查帳號狀態\n2. 等待一段時間後重試\n3. 嘗試使用其他帳號',
      database: '1. 刷新頁面\n2. 重啟應用\n3. 聯繫技術支持',
      ai: '1. 檢查 AI 配置\n2. 確認 API 密鑰有效\n3. 嘗試切換 AI 模型',
      unknown: '1. 刷新頁面\n2. 重啟應用\n3. 聯繫客服'
    };
    
    // 特殊情況的建議
    if (message.includes('FLOOD_WAIT')) {
      return '發送頻率過高，建議：\n1. 降低發送頻率\n2. 增加發送間隔\n3. 使用多個帳號輪流發送';
    }
    
    if (message.includes('SESSION')) {
      return 'Session 問題，建議：\n1. 重新登錄帳號\n2. 刪除 session 文件後重新登錄\n3. 檢查是否在其他設備登錄';
    }
    
    return suggestions[type || this.detectErrorType(message)];
  }
  
  /**
   * 記錄錯誤日誌
   */
  private logError(error: AppError): void {
    try {
      // 獲取現有日誌
      const logsStr = localStorage.getItem('tg-matrix-error-logs') || '[]';
      const logs = JSON.parse(logsStr);
      
      // 添加新錯誤
      logs.unshift({
        ...error,
        loggedAt: new Date().toISOString()
      });
      
      // 只保留最近 500 條
      const trimmedLogs = logs.slice(0, 500);
      
      localStorage.setItem('tg-matrix-error-logs', JSON.stringify(trimmedLogs));
    } catch (e) {
      console.error('Failed to log error:', e);
    }
    
    // 🔧 P5-2: 嚴重錯誤上報到後端（error + critical）
    if (error.severity === 'error' || error.severity === 'critical') {
      this.reportToServer(error);
    }
  }
  
  /**
   * 🔧 P5-2: 將錯誤上報到後端
   */
  private async reportToServer(error: AppError): Promise<void> {
    try {
      const token = localStorage.getItem('tgm_access_token');
      const baseUrl = this.getApiBaseUrl();
      
      // 精簡上報數據（避免發送過大 payload）
      const report = {
        id: error.id,
        type: error.type,
        severity: error.severity,
        code: error.code || '',
        message: error.message?.substring(0, 500) || '',
        userMessage: error.userMessage?.substring(0, 200) || '',
        component: error.context?.component || '',
        action: error.context?.action || '',
        stack: error.stack?.substring(0, 1000) || '',
        timestamp: error.timestamp,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 200) : ''
      };
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // 使用 navigator.sendBeacon 作為首選（不阻塞頁面卸載）
      // 降級為 fetch
      const body = JSON.stringify(report);
      
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(`${baseUrl}/api/v1/errors`, blob);
      } else {
        fetch(`${baseUrl}/api/v1/errors`, {
          method: 'POST',
          headers,
          body,
          keepalive: true  // 允許在頁面卸載時完成請求
        }).catch(() => {});  // 靜默失敗，不要因為上報失敗產生新錯誤
      }
    } catch {
      // 上報失敗不應影響主流程
    }
  }
  
  private getApiBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000';
    }
    return '';
  }
  
  /**
   * 更新統計
   */
  private updateStats(error: AppError): void {
    this._stats.update(stats => ({
      total: stats.total + 1,
      byType: {
        ...stats.byType,
        [error.type]: (stats.byType[error.type] || 0) + 1
      },
      bySeverity: {
        ...stats.bySeverity,
        [error.severity]: (stats.bySeverity[error.severity] || 0) + 1
      },
      lastHour: stats.lastHour + 1
    }));
  }
  
  /**
   * 顯示 Toast 提示
   */
  private showToast(error: AppError): void {
    switch (error.severity) {
      case 'info':
        this.toast.info(error.userMessage);
        break;
      case 'warning':
        this.toast.warning(error.userMessage);
        break;
      case 'error':
      case 'critical':
        this.toast.error(error.userMessage);
        break;
    }
  }
  
  /**
   * 獲取錯誤日誌
   */
  getErrorLogs(limit = 100): AppError[] {
    try {
      const logsStr = localStorage.getItem('tg-matrix-error-logs') || '[]';
      const logs = JSON.parse(logsStr);
      return logs.slice(0, limit);
    } catch {
      return [];
    }
  }
  
  /**
   * 清除錯誤日誌
   */
  clearErrorLogs(): void {
    localStorage.removeItem('tg-matrix-error-logs');
    this._errors.set([]);
    this._stats.set({
      total: 0,
      byType: {
        network: 0, auth: 0, permission: 0, validation: 0,
        telegram: 0, database: 0, ai: 0, unknown: 0
      },
      bySeverity: { info: 0, warning: 0, error: 0, critical: 0 },
      lastHour: 0
    });
  }
  
  /**
   * 包裝異步函數，自動處理錯誤
   */
  async wrap<T>(
    fn: () => Promise<T>,
    context?: { component?: string; action?: string },
    options?: { silent?: boolean; fallback?: T }
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context, options);
      return options?.fallback;
    }
  }
  
  /**
   * 創建錯誤邊界包裝器
   */
  createBoundary(component: string) {
    return {
      handle: (error: any, action?: string, options?: { silent?: boolean }) => {
        return this.handle(error, { component, action }, options);
      },
      wrap: <T>(fn: () => Promise<T>, action?: string, fallback?: T) => {
        return this.wrap(fn, { component, action }, { fallback });
      }
    };
  }
  
  // ==================== P1.4: 增強功能 ====================
  
  /**
   * 帶自動重試的異步請求
   * 
   * @param fn 要執行的異步函數
   * @param options 重試選項
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      delay?: number;
      backoff?: number;  // 指數退避係數
      retryOn?: (error: any) => boolean;
      onRetry?: (error: any, attempt: number) => void;
      context?: { component?: string; action?: string };
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = 2,
      retryOn = (e) => this.isRetryable(e),
      onRetry,
      context
    } = options;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // 檢查是否應該重試
        if (attempt < maxRetries && retryOn(error)) {
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          
          // 通知重試
          if (onRetry) {
            onRetry(error, attempt);
          } else {
            console.warn(`Retry attempt ${attempt}/${maxRetries} in ${waitTime}ms...`, error.message);
          }
          
          // 等待後重試
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          // 不重試，拋出錯誤
          break;
        }
      }
    }
    
    // 所有重試失敗，處理錯誤
    this.handle(lastError, context);
    throw lastError;
  }
  
  /**
   * 判斷錯誤是否可重試
   */
  private isRetryable(error: any): boolean {
    const message = (error?.message || String(error)).toLowerCase();
    
    // 網絡錯誤通常可重試
    if (message.includes('network') || 
        message.includes('fetch') || 
        message.includes('timeout') ||
        message.includes('connection refused') ||
        message.includes('econnreset')) {
      return true;
    }
    
    // 服務器錯誤（5xx）可重試
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true;
    }
    
    // HTTP 狀態碼
    const status = error?.status || error?.response?.status;
    if (status && status >= 500 && status < 600) {
      return true;
    }
    
    // Telegram FloodWait 可重試（但需要等待）
    if (message.includes('flood_wait')) {
      return true;
    }
    
    return false;
  }
  
  /**
   * API 請求包裝器
   * 自動處理錯誤和重試
   */
  async apiCall<T>(
    url: string,
    options: RequestInit = {},
    config: {
      retry?: boolean;
      maxRetries?: number;
      context?: { component?: string; action?: string };
      silent?: boolean;
    } = {}
  ): Promise<T> {
    const { retry = true, maxRetries = 2, context, silent = false } = config;
    
    const fetchFn = async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
        (error as any).status = response.status;
        (error as any).data = errorData;
        throw error;
      }
      
      return response.json();
    };
    
    if (retry) {
      return this.withRetry(fetchFn, { maxRetries, context });
    } else {
      try {
        return await fetchFn();
      } catch (error) {
        if (!silent) {
          this.handle(error, context);
        }
        throw error;
      }
    }
  }
  
  /**
   * 網絡狀態監測
   */
  private _isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly isOnline = this._isOnline.asReadonly();
  
  /**
   * 初始化網絡監聽
   * 在 constructor 中調用無效，需要在 ngOnInit 或類似生命週期中調用
   */
  initNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this._isOnline.set(true);
      this.toast.success('網絡連接已恢復');
    });
    
    window.addEventListener('offline', () => {
      this._isOnline.set(false);
      this.toast.warning('網絡連接已斷開，部分功能可能不可用');
    });
  }
  
  /**
   * 檢查網絡狀態
   */
  checkNetwork(): boolean {
    return this._isOnline();
  }
  
  /**
   * 帶超時的 Promise
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = '操作超時，請重試'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
  }
}
