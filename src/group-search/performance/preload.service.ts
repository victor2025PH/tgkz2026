/**
 * TG-AI智控王 預加載服務
 * Preload Service v1.0
 * 
 * 💡 設計思考：
 * 1. 智能預加載 - 預測用戶行為預先加載資源
 * 2. 優先級隊列 - 重要資源優先加載
 * 3. 網絡感知 - 根據網絡狀況調整策略
 * 4. 緩存整合 - 與 IndexedDB/內存緩存協作
 * 5. 預取提示 - 使用 link preload/prefetch
 */

import { Injectable, signal, computed, OnDestroy, inject, NgZone } from '@angular/core';

// ============ 類型定義 ============

export type ResourceType = 
  | 'component'    // 組件/模塊
  | 'data'         // 數據
  | 'image'        // 圖片
  | 'script'       // 腳本
  | 'style';       // 樣式

export type PreloadPriority = 'critical' | 'high' | 'medium' | 'low';

export type NetworkQuality = 'fast' | 'medium' | 'slow' | 'offline';

export interface PreloadTask {
  id: string;
  type: ResourceType;
  url: string;
  priority: PreloadPriority;
  loader: () => Promise<any>;
  status: 'pending' | 'loading' | 'loaded' | 'failed';
  result?: any;
  error?: Error;
  createdAt: number;
  loadedAt?: number;
}

export interface PreloadConfig {
  /** 最大並發加載數 */
  maxConcurrent: number;
  /** 是否啟用網絡感知 */
  networkAware: boolean;
  /** 是否在空閒時預加載 */
  preloadOnIdle: boolean;
  /** 空閒等待時間 */
  idleTimeout: number;
  /** 是否使用 link preload */
  useLinkPreload: boolean;
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: PreloadConfig = {
  maxConcurrent: 3,
  networkAware: true,
  preloadOnIdle: true,
  idleTimeout: 2000,
  useLinkPreload: true
};

// ============ 優先級權重 ============

const PRIORITY_WEIGHTS: Record<PreloadPriority, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25
};

@Injectable({
  providedIn: 'root'
})
export class PreloadService implements OnDestroy {
  private ngZone = inject(NgZone);
  private config: PreloadConfig;
  
  // 任務隊列
  private taskQueue: PreloadTask[] = [];
  private loadingTasks = new Set<string>();
  private completedTasks = new Map<string, PreloadTask>();
  
  // 網絡狀態
  private _networkQuality = signal<NetworkQuality>('fast');
  networkQuality = computed(() => this._networkQuality());
  
  // 統計
  private _stats = signal({
    pending: 0,
    loading: 0,
    loaded: 0,
    failed: 0,
    totalLoadTime: 0,
    avgLoadTime: 0
  });
  stats = computed(() => this._stats());
  
  // 空閒回調
  private idleCallbackId?: number;
  
  // 網絡監聯器
  private networkObserver?: any;
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initNetworkMonitor();
    this.setupIdlePreload();
  }
  
  ngOnDestroy(): void {
    if (this.idleCallbackId) {
      cancelIdleCallback(this.idleCallbackId);
    }
    this.networkObserver?.disconnect?.();
  }
  
  // ============ 公開 API ============
  
  /**
   * 預加載資源
   */
  preload<T>(
    url: string,
    loader: () => Promise<T>,
    options?: {
      type?: ResourceType;
      priority?: PreloadPriority;
      immediate?: boolean;
    }
  ): Promise<T> {
    const { type = 'data', priority = 'medium', immediate = false } = options || {};
    
    // 檢查是否已加載
    const existing = this.completedTasks.get(url);
    if (existing?.status === 'loaded') {
      return Promise.resolve(existing.result);
    }
    
    // 檢查是否正在加載
    const loading = this.taskQueue.find(t => t.url === url && t.status === 'loading');
    if (loading) {
      return new Promise((resolve, reject) => {
        const checkComplete = () => {
          const task = this.completedTasks.get(url);
          if (task) {
            if (task.status === 'loaded') {
              resolve(task.result);
            } else {
              reject(task.error);
            }
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
    }
    
    // 創建任務
    const task: PreloadTask = {
      id: `preload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      priority,
      loader,
      status: 'pending',
      createdAt: Date.now()
    };
    
    // 添加到隊列
    this.addToQueue(task);
    
    // 如果是立即加載或高優先級
    if (immediate || priority === 'critical') {
      return this.loadTask(task);
    }
    
    // 處理隊列
    this.processQueue();
    
    // 返回 Promise
    return new Promise((resolve, reject) => {
      const checkComplete = () => {
        const completed = this.completedTasks.get(url);
        if (completed) {
          if (completed.status === 'loaded') {
            resolve(completed.result);
          } else {
            reject(completed.error);
          }
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      
      // 等待任務完成
      if (task.status === 'loaded') {
        resolve(task.result);
      } else if (task.status === 'failed') {
        reject(task.error);
      } else {
        checkComplete();
      }
    });
  }
  
  /**
   * 預加載組件（懶加載模塊）
   * 
   * 💡 用於 Angular 路由懶加載的提前預熱
   */
  preloadComponent(componentLoader: () => Promise<any>, priority: PreloadPriority = 'medium'): void {
    const url = componentLoader.toString().slice(0, 100); // 使用函數簽名作為 key
    
    this.preload(url, componentLoader, {
      type: 'component',
      priority
    });
  }
  
  /**
   * 預加載圖片
   */
  preloadImage(url: string, priority: PreloadPriority = 'low'): Promise<HTMLImageElement> {
    return this.preload(url, () => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    }, {
      type: 'image',
      priority
    });
  }
  
  /**
   * 批量預加載圖片
   */
  preloadImages(urls: string[], priority: PreloadPriority = 'low'): Promise<HTMLImageElement[]> {
    return Promise.all(urls.map(url => this.preloadImage(url, priority)));
  }
  
  /**
   * 使用 link preload 預加載資源
   * 
   * 💡 這會讓瀏覽器提前下載資源，但不會執行
   */
  addLinkPreload(url: string, as: string, crossOrigin?: boolean): void {
    if (!this.config.useLinkPreload) return;
    
    // 檢查是否已存在
    const existing = document.querySelector(`link[rel="preload"][href="${url}"]`);
    if (existing) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    
    if (crossOrigin) {
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  }
  
  /**
   * 添加 prefetch 提示
   * 
   * 💡 比 preload 優先級低，用於可能需要的資源
   */
  addPrefetchHint(url: string): void {
    const existing = document.querySelector(`link[rel="prefetch"][href="${url}"]`);
    if (existing) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    
    document.head.appendChild(link);
  }
  
  /**
   * 取消預加載
   */
  cancel(url: string): boolean {
    const index = this.taskQueue.findIndex(t => t.url === url && t.status === 'pending');
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      this.updateStats();
      return true;
    }
    return false;
  }
  
  /**
   * 清除所有預加載任務
   */
  clearAll(): void {
    this.taskQueue = [];
    this.loadingTasks.clear();
    this.completedTasks.clear();
    this.updateStats();
  }
  
  /**
   * 檢查資源是否已預加載
   */
  isPreloaded(url: string): boolean {
    return this.completedTasks.has(url) && this.completedTasks.get(url)?.status === 'loaded';
  }
  
  /**
   * 獲取預加載的資源
   */
  getPreloaded<T>(url: string): T | undefined {
    return this.completedTasks.get(url)?.result;
  }
  
  // ============ 私有方法 ============
  
  private addToQueue(task: PreloadTask): void {
    // 按優先級插入
    const weight = PRIORITY_WEIGHTS[task.priority];
    const insertIndex = this.taskQueue.findIndex(
      t => PRIORITY_WEIGHTS[t.priority] < weight
    );
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
    
    this.updateStats();
  }
  
  private processQueue(): void {
    // 根據網絡質量調整並發數
    const maxConcurrent = this.getAdjustedConcurrency();
    
    while (
      this.loadingTasks.size < maxConcurrent && 
      this.taskQueue.some(t => t.status === 'pending')
    ) {
      const task = this.taskQueue.find(t => t.status === 'pending');
      if (task) {
        this.loadTask(task);
      } else {
        break;
      }
    }
  }
  
  private async loadTask<T>(task: PreloadTask): Promise<T> {
    task.status = 'loading';
    this.loadingTasks.add(task.id);
    this.updateStats();
    
    try {
      const result = await task.loader();
      
      task.status = 'loaded';
      task.result = result;
      task.loadedAt = Date.now();
      
      this.completedTasks.set(task.url, task);
      
      return result;
      
    } catch (error: any) {
      task.status = 'failed';
      task.error = error;
      
      this.completedTasks.set(task.url, task);
      
      throw error;
      
    } finally {
      this.loadingTasks.delete(task.id);
      
      // 從隊列移除
      const index = this.taskQueue.findIndex(t => t.id === task.id);
      if (index !== -1) {
        this.taskQueue.splice(index, 1);
      }
      
      this.updateStats();
      this.processQueue();
    }
  }
  
  private getAdjustedConcurrency(): number {
    if (!this.config.networkAware) {
      return this.config.maxConcurrent;
    }
    
    switch (this._networkQuality()) {
      case 'fast': return this.config.maxConcurrent;
      case 'medium': return Math.ceil(this.config.maxConcurrent * 0.7);
      case 'slow': return Math.ceil(this.config.maxConcurrent * 0.3);
      case 'offline': return 0;
    }
  }
  
  private initNetworkMonitor(): void {
    // 檢測網絡類型
    const connection = (navigator as any).connection;
    
    if (connection) {
      this.updateNetworkQuality(connection);
      
      connection.addEventListener('change', () => {
        this.ngZone.run(() => {
          this.updateNetworkQuality(connection);
        });
      });
    }
    
    // 監聯在線/離線狀態
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this._networkQuality.set('medium');
        this.processQueue();
      });
    });
    
    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this._networkQuality.set('offline');
      });
    });
  }
  
  private updateNetworkQuality(connection: any): void {
    const effectiveType = connection.effectiveType;
    
    switch (effectiveType) {
      case '4g':
        this._networkQuality.set('fast');
        break;
      case '3g':
        this._networkQuality.set('medium');
        break;
      case '2g':
      case 'slow-2g':
        this._networkQuality.set('slow');
        break;
      default:
        // 使用下行速度判斷
        if (connection.downlink >= 5) {
          this._networkQuality.set('fast');
        } else if (connection.downlink >= 1) {
          this._networkQuality.set('medium');
        } else {
          this._networkQuality.set('slow');
        }
    }
  }
  
  private setupIdlePreload(): void {
    if (!this.config.preloadOnIdle) return;
    
    const scheduleIdle = () => {
      if ('requestIdleCallback' in window) {
        this.idleCallbackId = requestIdleCallback(
          (deadline) => {
            // 在空閒時間處理低優先級任務
            while (
              deadline.timeRemaining() > 0 && 
              this.taskQueue.some(t => t.status === 'pending' && t.priority === 'low')
            ) {
              this.processQueue();
            }
            
            // 重新排程
            scheduleIdle();
          },
          { timeout: this.config.idleTimeout }
        );
      }
    };
    
    scheduleIdle();
  }
  
  private updateStats(): void {
    const pending = this.taskQueue.filter(t => t.status === 'pending').length;
    const loading = this.loadingTasks.size;
    const loaded = [...this.completedTasks.values()].filter(t => t.status === 'loaded').length;
    const failed = [...this.completedTasks.values()].filter(t => t.status === 'failed').length;
    
    // 計算平均加載時間
    const loadTimes = [...this.completedTasks.values()]
      .filter(t => t.status === 'loaded' && t.loadedAt)
      .map(t => (t.loadedAt! - t.createdAt));
    
    const totalLoadTime = loadTimes.reduce((a, b) => a + b, 0);
    const avgLoadTime = loadTimes.length > 0 ? totalLoadTime / loadTimes.length : 0;
    
    this._stats.set({
      pending,
      loading,
      loaded,
      failed,
      totalLoadTime,
      avgLoadTime
    });
  }
}

// ============ 全局函數擴展 ============

declare global {
  interface Window {
    requestIdleCallback: (
      callback: (deadline: IdleDeadline) => void,
      options?: { timeout: number }
    ) => number;
    cancelIdleCallback: (handle: number) => void;
  }
  
  interface IdleDeadline {
    readonly didTimeout: boolean;
    timeRemaining(): number;
  }
}
