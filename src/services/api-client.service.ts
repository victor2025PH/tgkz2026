/**
 * API 客戶端服務
 * API Client Service
 * 
 * 🆕 數據優化: 後端 API 對接層完善
 * 
 * 功能：
 * - 統一 HTTP 請求處理
 * - 請求攔截和響應處理
 * - 錯誤統一處理
 * - 請求緩存
 * - 重試機制
 */

import { Injectable, inject, signal } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// API 響應類型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    timestamp?: string;
  };
}

// 請求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheDuration?: number;
  showError?: boolean;
  showLoading?: boolean;
}

// 緩存項
interface CacheItem<T> {
  data: T;
  timestamp: number;
  duration: number;
}

// 默認配置
const DEFAULT_CONFIG: RequestConfig = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  cache: false,
  cacheDuration: 60000,
  showError: true,
  showLoading: false
};

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  private _pendingRequests = signal(0);
  pendingRequests = this._pendingRequests.asReadonly();
  
  // 緩存
  private cache = new Map<string, CacheItem<any>>();
  
  // 請求隊列（用於去重）
  private pendingPromises = new Map<string, Promise<any>>();
  
  /**
   * 發送 API 請求（通過 IPC）
   */
  async request<T>(
    channel: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const cacheKey = `${channel}:${JSON.stringify(data)}`;
    
    // 檢查緩存
    if (cfg.cache) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }
    
    // 去重：如果有相同的請求正在進行，返回同一個 Promise
    if (this.pendingPromises.has(cacheKey)) {
      return this.pendingPromises.get(cacheKey)!;
    }
    
    // 創建請求
    const requestPromise = this.executeRequest<T>(channel, data, cfg, cacheKey);
    this.pendingPromises.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingPromises.delete(cacheKey);
    }
  }
  
  private async executeRequest<T>(
    channel: string,
    data: any,
    config: RequestConfig,
    cacheKey: string
  ): Promise<ApiResponse<T>> {
    this._pendingRequests.update(n => n + 1);
    if (config.showLoading) {
      this._isLoading.set(true);
    }
    
    let lastError: any;
    
    for (let attempt = 0; attempt <= config.retries!; attempt++) {
      try {
        const result = await this.sendIpcRequest<T>(channel, data, config.timeout!);
        
        // 成功時緩存結果
        if (result.success && config.cache) {
          this.setCache(cacheKey, result.data, config.cacheDuration!);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // 最後一次嘗試不等待
        if (attempt < config.retries!) {
          await this.delay(config.retryDelay! * (attempt + 1));
        }
      }
    }
    
    // 所有重試都失敗
    const errorResponse: ApiResponse<T> = {
      success: false,
      error: {
        code: 'REQUEST_FAILED',
        message: lastError?.message || '請求失敗，請稍後重試',
        details: lastError
      }
    };
    
    if (config.showError) {
      this.toast.error(errorResponse.error!.message);
    }
    
    return errorResponse;
  }
  
  private sendIpcRequest<T>(
    channel: string,
    data: any,
    timeout: number
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('請求超時'));
      }, timeout);
      
      this.ipc.invoke(channel, data)
        .then((result: any) => {
          clearTimeout(timeoutId);
          
          // 標準化響應
          if (typeof result === 'object' && 'success' in result) {
            resolve(result as ApiResponse<T>);
          } else {
            resolve({ success: true, data: result as T });
          }
        })
        .catch((error: any) => {
          clearTimeout(timeoutId);
          reject(error);
        })
        .finally(() => {
          this._pendingRequests.update(n => Math.max(0, n - 1));
          if (this._pendingRequests() === 0) {
            this._isLoading.set(false);
          }
        });
    });
  }
  
  // ============ 緩存管理 ============
  
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    const now = Date.now();
    if (now - item.timestamp > item.duration) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }
  
  private setCache<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration
    });
  }
  
  /**
   * 清除緩存
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 預加載數據
   */
  async preload<T>(channel: string, data?: any): Promise<void> {
    await this.request<T>(channel, data, { cache: true, showError: false });
  }
  
  // ============ 便捷方法 ============
  
  /**
   * GET 風格請求
   */
  async get<T>(channel: string, params?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(channel, { action: 'get', ...params }, {
      cache: true,
      ...config
    });
  }
  
  /**
   * POST 風格請求
   */
  async post<T>(channel: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(channel, { action: 'create', ...data }, {
      cache: false,
      ...config
    });
  }
  
  /**
   * PUT 風格請求
   */
  async put<T>(channel: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(channel, { action: 'update', ...data }, {
      cache: false,
      ...config
    });
  }
  
  /**
   * DELETE 風格請求
   */
  async delete<T>(channel: string, params?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(channel, { action: 'delete', ...params }, {
      cache: false,
      ...config
    });
  }
  
  // ============ 工具方法 ============
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
