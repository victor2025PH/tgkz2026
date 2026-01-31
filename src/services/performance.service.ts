/**
 * 性能優化服務
 * Performance Service
 * 
 * 🆕 P4 階段：用戶體驗優化
 * 
 * 功能：
 * - 防抖和節流
 * - 虛擬化助手
 * - 懶加載管理
 * - 內存監控
 */

import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

/** 性能指標 */
export interface PerformanceMetrics {
  memoryUsage?: number;      // MB
  renderTime?: number;       // ms
  networkLatency?: number;   // ms
  fps?: number;
}

/** 虛擬化配置 */
export interface VirtualizeConfig {
  itemHeight: number;
  containerHeight: number;
  buffer: number;  // 額外渲染的項數
}

/** 虛擬化結果 */
export interface VirtualizeResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  visibleCount: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {
  
  // 性能指標
  private _metrics = signal<PerformanceMetrics>({});
  metrics = this._metrics.asReadonly();
  
  // 活躍的防抖/節流計時器
  private debounceTimers = new Map<string, any>();
  private throttleFlags = new Map<string, boolean>();
  
  // 觀察者
  private intersectionObservers = new Map<string, IntersectionObserver>();
  
  constructor() {
    this.startMetricsCollection();
  }
  
  // ============ 防抖 ============
  
  /**
   * 創建防抖函數
   */
  debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
    key?: string
  ): (...args: Parameters<T>) => void {
    const timerKey = key || fn.toString().slice(0, 50);
    
    return (...args: Parameters<T>) => {
      // 清除現有計時器
      if (this.debounceTimers.has(timerKey)) {
        clearTimeout(this.debounceTimers.get(timerKey));
      }
      
      // 設置新計時器
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(timerKey);
      }, delay);
      
      this.debounceTimers.set(timerKey, timer);
    };
  }
  
  /**
   * 取消防抖
   */
  cancelDebounce(key: string): void {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
      this.debounceTimers.delete(key);
    }
  }
  
  // ============ 節流 ============
  
  /**
   * 創建節流函數
   */
  throttle<T extends (...args: any[]) => any>(
    fn: T,
    limit: number,
    key?: string
  ): (...args: Parameters<T>) => void {
    const timerKey = key || fn.toString().slice(0, 50);
    
    return (...args: Parameters<T>) => {
      if (!this.throttleFlags.get(timerKey)) {
        fn(...args);
        this.throttleFlags.set(timerKey, true);
        
        setTimeout(() => {
          this.throttleFlags.delete(timerKey);
        }, limit);
      }
    };
  }
  
  /**
   * 重置節流
   */
  resetThrottle(key: string): void {
    this.throttleFlags.delete(key);
  }
  
  // ============ 虛擬化 ============
  
  /**
   * 計算虛擬化參數
   */
  virtualize<T>(
    items: T[],
    scrollTop: number,
    config: VirtualizeConfig
  ): VirtualizeResult & { visibleItems: T[] } {
    const { itemHeight, containerHeight, buffer } = config;
    
    const totalHeight = items.length * itemHeight;
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    let startIndex = Math.floor(scrollTop / itemHeight) - buffer;
    startIndex = Math.max(0, startIndex);
    
    let endIndex = startIndex + visibleCount + buffer * 2;
    endIndex = Math.min(items.length, endIndex);
    
    const offsetY = startIndex * itemHeight;
    const visibleItems = items.slice(startIndex, endIndex);
    
    return {
      startIndex,
      endIndex,
      offsetY,
      totalHeight,
      visibleCount,
      visibleItems
    };
  }
  
  // ============ 懶加載 ============
  
  /**
   * 創建 Intersection Observer
   */
  createLazyLoader(
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ): IntersectionObserver {
    return new IntersectionObserver(callback, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
      ...options
    });
  }
  
  /**
   * 註冊懶加載元素
   */
  registerLazyElement(
    id: string,
    element: Element,
    onVisible: () => void
  ): () => void {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onVisible();
        observer.unobserve(element);
        this.intersectionObservers.delete(id);
      }
    }, { rootMargin: '50px' });
    
    observer.observe(element);
    this.intersectionObservers.set(id, observer);
    
    // 返回清理函數
    return () => {
      observer.disconnect();
      this.intersectionObservers.delete(id);
    };
  }
  
  // ============ 批量處理 ============
  
  /**
   * 分批處理大量數據
   */
  async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R> | R,
    options?: {
      batchSize?: number;
      delayBetweenBatches?: number;
      onProgress?: (completed: number, total: number) => void;
    }
  ): Promise<R[]> {
    const batchSize = options?.batchSize ?? 50;
    const delay = options?.delayBetweenBatches ?? 0;
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
      
      options?.onProgress?.(Math.min(i + batchSize, items.length), items.length);
      
      // 讓出主線程
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }
    
    return results;
  }
  
  /**
   * 使用 requestIdleCallback 處理
   */
  processWhenIdle<T>(
    task: () => T,
    timeout = 1000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const idleCallback = (window as any).requestIdleCallback || 
        ((cb: () => void) => setTimeout(cb, 1));
      
      idleCallback(() => {
        try {
          resolve(task());
        } catch (error) {
          reject(error);
        }
      }, { timeout });
    });
  }
  
  // ============ 記憶體優化 ============
  
  /**
   * 創建 WeakMap 緩存
   */
  createWeakCache<K extends object, V>(): {
    get: (key: K) => V | undefined;
    set: (key: K, value: V) => void;
    has: (key: K) => boolean;
  } {
    const cache = new WeakMap<K, V>();
    
    return {
      get: (key: K) => cache.get(key),
      set: (key: K, value: V) => cache.set(key, value),
      has: (key: K) => cache.has(key)
    };
  }
  
  /**
   * 創建 LRU 緩存
   */
  createLRUCache<T>(maxSize: number): {
    get: (key: string) => T | undefined;
    set: (key: string, value: T) => void;
    clear: () => void;
  } {
    const cache = new Map<string, T>();
    
    return {
      get: (key: string) => {
        const value = cache.get(key);
        if (value !== undefined) {
          // 移到最後（最近使用）
          cache.delete(key);
          cache.set(key, value);
        }
        return value;
      },
      set: (key: string, value: T) => {
        if (cache.has(key)) {
          cache.delete(key);
        } else if (cache.size >= maxSize) {
          // 刪除最舊的
          const firstKey = cache.keys().next().value;
          if (firstKey) cache.delete(firstKey);
        }
        cache.set(key, value);
      },
      clear: () => cache.clear()
    };
  }
  
  // ============ 性能監控 ============
  
  /**
   * 開始收集性能指標
   */
  private startMetricsCollection(): void {
    // 每 5 秒更新一次指標
    setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }
  
  /**
   * 收集性能指標
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {};
    
    // 內存使用（如果可用）
    if ((performance as any).memory) {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    
    // 獲取導航計時
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      metrics.renderTime = navTiming.domContentLoadedEventEnd - navTiming.startTime;
    }
    
    this._metrics.set(metrics);
  }
  
  /**
   * 測量函數執行時間
   */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
  
  /**
   * 異步測量
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    return result;
  }
  
  // ============ 清理 ============
  
  /**
   * 清理所有計時器和觀察者
   */
  cleanup(): void {
    // 清理防抖計時器
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // 清理節流標記
    this.throttleFlags.clear();
    
    // 清理觀察者
    this.intersectionObservers.forEach(observer => observer.disconnect());
    this.intersectionObservers.clear();
  }
}
