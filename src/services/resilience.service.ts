/**
 * 彈性服務 - 統一錯誤處理和重試機制
 * Resilience Service
 * 
 * 🆕 P4 階段：用戶體驗優化
 * 
 * 功能：
 * - 統一錯誤處理
 * - 自動重試機制
 * - 優雅降級
 * - 錯誤上報
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

/** 錯誤類型 */
export type ErrorType = 
  | 'network'      // 網絡錯誤
  | 'auth'         // 認證錯誤
  | 'validation'   // 驗證錯誤
  | 'rate_limit'   // 頻率限制
  | 'server'       // 服務器錯誤
  | 'timeout'      // 超時
  | 'unknown';     // 未知錯誤

/** 錯誤記錄 */
export interface ErrorRecord {
  id: string;
  type: ErrorType;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: Date;
  retryCount: number;
  resolved: boolean;
}

/** 重試配置 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;      // 毫秒
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

/** 操作結果 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: ErrorRecord;
}

// ============ 默認配置 ============

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['network', 'timeout', 'server', 'rate_limit']
};

// ============ 錯誤消息映射 ============

const ERROR_MESSAGES: Record<ErrorType, { title: string; suggestion: string }> = {
  network: {
    title: '網絡連接失敗',
    suggestion: '請檢查網絡連接後重試'
  },
  auth: {
    title: '認證失敗',
    suggestion: '請重新登錄或檢查帳號狀態'
  },
  validation: {
    title: '輸入驗證失敗',
    suggestion: '請檢查輸入內容是否正確'
  },
  rate_limit: {
    title: '操作過於頻繁',
    suggestion: '請稍後再試，系統正在自動重試'
  },
  server: {
    title: '服務器錯誤',
    suggestion: '服務暫時不可用，正在重試'
  },
  timeout: {
    title: '請求超時',
    suggestion: '網絡較慢，正在重試'
  },
  unknown: {
    title: '發生錯誤',
    suggestion: '請稍後重試或聯繫支持'
  }
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ResilienceService {
  private toast = inject(ToastService);
  
  // 錯誤記錄
  private _errors = signal<ErrorRecord[]>([]);
  errors = this._errors.asReadonly();
  
  // 未解決錯誤數
  unresolvedCount = computed(() => 
    this._errors().filter(e => !e.resolved).length
  );
  
  // 最近錯誤
  recentErrors = computed(() => 
    this._errors().slice(0, 10)
  );
  
  // 重試配置
  private retryConfig = signal<RetryConfig>(DEFAULT_RETRY_CONFIG);
  
  // 全局錯誤處理器
  private globalHandlers: ((error: ErrorRecord) => void)[] = [];
  
  constructor() {
    this.setupGlobalErrorHandler();
  }
  
  // ============ 核心方法 ============
  
  /**
   * 執行帶重試的操作
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options?: {
      name?: string;
      config?: Partial<RetryConfig>;
      onRetry?: (attempt: number, error: any) => void;
      fallback?: () => T;
    }
  ): Promise<OperationResult<T>> {
    const config = { ...this.retryConfig(), ...options?.config };
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error: any) {
        lastError = error;
        const errorType = this.classifyError(error);
        
        // 記錄錯誤
        const errorRecord = this.recordError(errorType, error.message || '操作失敗', {
          attempt,
          operationName: options?.name,
          details: error.stack
        });
        
        // 判斷是否可重試
        if (!config.retryableErrors.includes(errorType)) {
          console.log(`[Resilience] 錯誤不可重試: ${errorType}`);
          break;
        }
        
        // 最後一次嘗試不再重試
        if (attempt === config.maxAttempts) {
          console.log(`[Resilience] 已達最大重試次數: ${config.maxAttempts}`);
          break;
        }
        
        // 計算延遲
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.log(`[Resilience] 第 ${attempt} 次嘗試失敗，${delay}ms 後重試...`);
        options?.onRetry?.(attempt, error);
        
        await this.sleep(delay);
      }
    }
    
    // 嘗試降級
    if (options?.fallback) {
      console.log('[Resilience] 使用降級方案');
      try {
        const fallbackResult = options.fallback();
        return { success: true, data: fallbackResult };
      } catch (fallbackError) {
        console.error('[Resilience] 降級方案也失敗:', fallbackError);
      }
    }
    
    const finalError = this.recordError(
      this.classifyError(lastError),
      lastError?.message || '操作失敗',
      { operationName: options?.name, final: true }
    );
    
    return { success: false, error: finalError };
  }
  
  /**
   * 包裝 Promise，添加超時
   */
  async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage = '操作超時'
  ): Promise<T> {
    let timeoutId: any;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);
    });
    
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
  
  /**
   * 批量操作，部分成功也返回結果
   */
  async batchWithPartialSuccess<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options?: {
      concurrency?: number;
      continueOnError?: boolean;
    }
  ): Promise<{ 
    successful: { item: T; result: R }[];
    failed: { item: T; error: any }[];
  }> {
    const successful: { item: T; result: R }[] = [];
    const failed: { item: T; error: any }[] = [];
    const concurrency = options?.concurrency ?? 3;
    
    // 分批處理
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(item => operation(item).then(result => ({ item, result })))
      );
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          const item = batch[results.indexOf(result)];
          failed.push({ item, error: result.reason });
          
          if (!options?.continueOnError) {
            return { successful, failed };
          }
        }
      }
    }
    
    return { successful, failed };
  }
  
  // ============ 錯誤處理 ============
  
  /**
   * 記錄錯誤
   */
  recordError(
    type: ErrorType,
    message: string,
    context?: Record<string, any>
  ): ErrorRecord {
    const error: ErrorRecord = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      context,
      timestamp: new Date(),
      retryCount: context?.attempt ?? 0,
      resolved: false
    };
    
    this._errors.update(errors => [error, ...errors].slice(0, 100));
    
    // 通知全局處理器
    this.globalHandlers.forEach(handler => handler(error));
    
    // 顯示用戶友好提示
    if (!context?.silent) {
      this.showUserFriendlyError(error);
    }
    
    console.error(`[Resilience] 錯誤記錄:`, error);
    return error;
  }
  
  /**
   * 分類錯誤
   */
  classifyError(error: any): ErrorType {
    const message = (error?.message || '').toLowerCase();
    const code = error?.code || error?.status;
    
    // 網絡錯誤
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    
    // 超時
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    
    // 認證錯誤
    if (code === 401 || code === 403 || message.includes('auth') || message.includes('unauthorized')) {
      return 'auth';
    }
    
    // 頻率限制
    if (code === 429 || message.includes('rate limit') || message.includes('too many')) {
      return 'rate_limit';
    }
    
    // 驗證錯誤
    if (code === 400 || message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    
    // 服務器錯誤
    if (code >= 500 || message.includes('server')) {
      return 'server';
    }
    
    return 'unknown';
  }
  
  /**
   * 顯示用戶友好的錯誤提示
   */
  private showUserFriendlyError(error: ErrorRecord) {
    const messages = ERROR_MESSAGES[error.type];
    
    // 只在首次錯誤或最終失敗時顯示
    if (error.retryCount === 0 || error.context?.final) {
      if (error.type === 'rate_limit' || error.type === 'timeout') {
        this.toast.warning(`⏳ ${messages.title}: ${messages.suggestion}`);
      } else if (error.type === 'auth') {
        this.toast.error(`🔐 ${messages.title}: ${messages.suggestion}`);
      } else if (error.context?.final) {
        this.toast.error(`❌ ${messages.title}: ${messages.suggestion}`);
      }
    }
  }
  
  /**
   * 標記錯誤已解決
   */
  resolveError(errorId: string) {
    this._errors.update(errors => 
      errors.map(e => e.id === errorId ? { ...e, resolved: true } : e)
    );
  }
  
  /**
   * 清除所有錯誤
   */
  clearErrors() {
    this._errors.set([]);
  }
  
  // ============ 全局處理 ============
  
  /**
   * 設置全局錯誤處理器
   */
  private setupGlobalErrorHandler() {
    // 捕獲未處理的 Promise 錯誤
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Resilience] 未處理的 Promise 錯誤:', event.reason);
      this.recordError(
        this.classifyError(event.reason),
        event.reason?.message || '未處理的異步錯誤',
        { source: 'unhandledrejection', silent: true }
      );
    });
    
    // 捕獲全局錯誤
    window.addEventListener('error', (event) => {
      console.error('[Resilience] 全局錯誤:', event.error);
      this.recordError(
        'unknown',
        event.message || '發生未知錯誤',
        { source: 'global', silent: true }
      );
    });
  }
  
  /**
   * 註冊全局錯誤處理器
   */
  onError(handler: (error: ErrorRecord) => void) {
    this.globalHandlers.push(handler);
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) this.globalHandlers.splice(index, 1);
    };
  }
  
  // ============ 工具方法 ============
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 更新重試配置
   */
  updateRetryConfig(config: Partial<RetryConfig>) {
    this.retryConfig.update(c => ({ ...c, ...config }));
  }
}
