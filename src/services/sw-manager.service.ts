/**
 * P3 優化：Service Worker 管理服務
 * 
 * 功能：
 * - 註冊/更新 Service Worker
 * - 監控緩存狀態
 * - 處理後台同步消息
 */

import { Injectable, signal, NgZone } from '@angular/core';

export interface SwStatus {
  registered: boolean;
  active: boolean;
  waiting: boolean;
  updateAvailable: boolean;
  version: string | null;
}

export interface CacheStats {
  [cacheName: string]: number;
}

@Injectable({
  providedIn: 'root'
})
export class SwManagerService {
  // Service Worker 狀態
  status = signal<SwStatus>({
    registered: false,
    active: false,
    waiting: false,
    updateAvailable: false,
    version: null
  });
  
  // 緩存統計
  cacheStats = signal<CacheStats>({});
  
  // 是否支持 Service Worker
  isSupported = 'serviceWorker' in navigator;
  
  private registration: ServiceWorkerRegistration | null = null;

  constructor(private ngZone: NgZone) {
    if (this.isSupported) {
      this.init();
    } else {
      console.log('[SwManager] Service Worker not supported');
    }
  }

  /**
   * 初始化 Service Worker
   */
  private async init(): Promise<void> {
    // 只在生產環境或 HTTPS 下註冊
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      console.log('[SwManager] Skipping SW registration (not HTTPS)');
      return;
    }
    
    try {
      // 監聯 Service Worker 消息
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleSwMessage(event);
      });
      
      // 註冊 Service Worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('[SwManager] ✅ Service Worker registered');
      
      this.ngZone.run(() => {
        this.status.update(s => ({ ...s, registered: true }));
      });
      
      // 監控狀態變化
      this.monitorRegistration();
      
      // 檢查更新
      this.checkForUpdates();
      
    } catch (error) {
      console.error('[SwManager] Registration failed:', error);
    }
  }

  /**
   * 監控 Service Worker 狀態
   */
  private monitorRegistration(): void {
    if (!this.registration) return;
    
    // 當前激活的 SW
    if (this.registration.active) {
      this.ngZone.run(() => {
        this.status.update(s => ({ ...s, active: true }));
      });
    }
    
    // 等待激活的 SW（新版本）
    if (this.registration.waiting) {
      this.ngZone.run(() => {
        this.status.update(s => ({ ...s, waiting: true, updateAvailable: true }));
      });
    }
    
    // 監聽更新
    this.registration.addEventListener('updatefound', () => {
      console.log('[SwManager] Update found');
      
      const installing = this.registration!.installing;
      if (!installing) return;
      
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // 有新版本可用
            console.log('[SwManager] New version available');
            this.ngZone.run(() => {
              this.status.update(s => ({ ...s, updateAvailable: true, waiting: true }));
            });
          }
        }
      });
    });
    
    // 監聽控制器變化
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SwManager] Controller changed');
      // 可選：自動刷新頁面
      // window.location.reload();
    });
  }

  /**
   * 處理來自 Service Worker 的消息
   */
  private handleSwMessage(event: MessageEvent): void {
    console.log('[SwManager] Message from SW:', event.data);
    
    this.ngZone.run(() => {
      switch (event.data.type) {
        case 'CACHE_STATS':
          this.cacheStats.set(event.data.stats);
          break;
          
        case 'SYNC_OFFLINE_OPERATIONS':
          // 觸發離線操作同步
          window.dispatchEvent(new CustomEvent('sync-offline-operations-from-sw'));
          break;
      }
    });
  }

  /**
   * 檢查更新
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      await this.registration.update();
      console.log('[SwManager] Update check complete');
      return this.status().updateAvailable;
    } catch (error) {
      console.error('[SwManager] Update check failed:', error);
      return false;
    }
  }

  /**
   * 應用更新（激活等待中的 Service Worker）
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration?.waiting) {
      console.log('[SwManager] No waiting SW');
      return;
    }
    
    console.log('[SwManager] Applying update...');
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // 等待控制器變化後刷新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    }, { once: true });
  }

  /**
   * 獲取緩存統計
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!navigator.serviceWorker.controller) {
      return {};
    }
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATS') {
          resolve(event.data.stats);
        }
      };
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_CACHE_STATS' },
        [channel.port2]
      );
      
      // 超時處理
      setTimeout(() => resolve({}), 3000);
    });
  }

  /**
   * 清除所有緩存
   */
  async clearCache(): Promise<void> {
    if (!navigator.serviceWorker.controller) {
      return;
    }
    
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    console.log('[SwManager] Cache clear requested');
  }

  /**
   * 觸發後台同步
   */
  async triggerSync(tag: string = 'sync-offline-operations'): Promise<void> {
    if (!this.registration) return;
    
    // 檢查是否支持後台同步
    if ('sync' in this.registration) {
      try {
        await (this.registration as any).sync.register(tag);
        console.log('[SwManager] Background sync registered:', tag);
      } catch (error) {
        console.error('[SwManager] Sync registration failed:', error);
      }
    } else {
      console.log('[SwManager] Background sync not supported');
    }
  }

  /**
   * 註銷 Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;
    
    try {
      const result = await this.registration.unregister();
      console.log('[SwManager] Unregistered:', result);
      this.ngZone.run(() => {
        this.status.set({
          registered: false,
          active: false,
          waiting: false,
          updateAvailable: false,
          version: null
        });
      });
      return result;
    } catch (error) {
      console.error('[SwManager] Unregister failed:', error);
      return false;
    }
  }
}
