/**
 * 離線數據緩存服務
 * 
 * 🆕 功能：
 * 1. 使用 IndexedDB 緩存關鍵數據
 * 2. 支持離線瀏覽
 * 3. 網絡恢復後自動同步
 * 4. 請求重試隊列
 */

import { Injectable, signal, computed } from '@angular/core';

// 緩存項目接口
interface CacheItem<T = any> {
  key: string;
  data: T;
  timestamp: number;
  expiresAt: number;
  version: number;
}

// 待處理請求
interface PendingRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

// 緩存配置
const CACHE_CONFIG = {
  DB_NAME: 'tgm_offline_cache',
  DB_VERSION: 1,
  STORES: {
    DATA: 'data_cache',
    PENDING: 'pending_requests',
    USER: 'user_data'
  },
  DEFAULT_TTL: 3600000, // 1 小時
  MAX_PENDING_REQUESTS: 50,
  MAX_RETRY_COUNT: 3
};

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private dbReady = false;
  
  // 狀態
  private _pendingRequests = signal<PendingRequest[]>([]);
  private _lastSyncTime = signal<number | null>(null);
  private _isSyncing = signal(false);
  
  // 公開狀態
  readonly pendingCount = computed(() => this._pendingRequests().length);
  readonly hasPendingRequests = computed(() => this._pendingRequests().length > 0);
  readonly lastSyncTime = computed(() => this._lastSyncTime());
  readonly isSyncing = computed(() => this._isSyncing());
  
  constructor() {
    this.initDatabase();
  }
  
  /**
   * 初始化 IndexedDB
   */
  private async initDatabase(): Promise<void> {
    if (!window.indexedDB) {
      console.warn('[OfflineCache] IndexedDB not supported');
      return;
    }
    
    try {
      const request = indexedDB.open(CACHE_CONFIG.DB_NAME, CACHE_CONFIG.DB_VERSION);
      
      request.onerror = () => {
        console.error('[OfflineCache] Database open error');
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.dbReady = true;
        console.log('[OfflineCache] Database ready');
        
        // 載入待處理請求
        this.loadPendingRequests();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 創建數據緩存存儲
        if (!db.objectStoreNames.contains(CACHE_CONFIG.STORES.DATA)) {
          const dataStore = db.createObjectStore(CACHE_CONFIG.STORES.DATA, { keyPath: 'key' });
          dataStore.createIndex('timestamp', 'timestamp', { unique: false });
          dataStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }
        
        // 創建待處理請求存儲
        if (!db.objectStoreNames.contains(CACHE_CONFIG.STORES.PENDING)) {
          const pendingStore = db.createObjectStore(CACHE_CONFIG.STORES.PENDING, { keyPath: 'id' });
          pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // 創建用戶數據存儲
        if (!db.objectStoreNames.contains(CACHE_CONFIG.STORES.USER)) {
          db.createObjectStore(CACHE_CONFIG.STORES.USER, { keyPath: 'key' });
        }
        
        console.log('[OfflineCache] Database upgraded');
      };
    } catch (e) {
      console.error('[OfflineCache] Database init error:', e);
    }
  }
  
  /**
   * 緩存數據
   */
  async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.DEFAULT_TTL): Promise<boolean> {
    if (!this.dbReady || !this.db) {
      return false;
    }
    
    try {
      const item: CacheItem<T> = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
        version: 1
      };
      
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([CACHE_CONFIG.STORES.DATA], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORES.DATA);
        const request = store.put(item);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (e) {
      console.error('[OfflineCache] Set error:', e);
      return false;
    }
  }
  
  /**
   * 獲取緩存數據
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.dbReady || !this.db) {
      return null;
    }
    
    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([CACHE_CONFIG.STORES.DATA], 'readonly');
        const store = transaction.objectStore(CACHE_CONFIG.STORES.DATA);
        const request = store.get(key);
        
        request.onsuccess = () => {
          const item = request.result as CacheItem<T> | undefined;
          
          if (!item) {
            resolve(null);
            return;
          }
          
          // 檢查是否過期
          if (item.expiresAt < Date.now()) {
            this.delete(key);
            resolve(null);
            return;
          }
          
          resolve(item.data);
        };
        
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error('[OfflineCache] Get error:', e);
      return null;
    }
  }
  
  /**
   * 刪除緩存
   */
  async delete(key: string): Promise<boolean> {
    if (!this.dbReady || !this.db) {
      return false;
    }
    
    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([CACHE_CONFIG.STORES.DATA], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORES.DATA);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 清除所有緩存
   */
  async clear(): Promise<void> {
    if (!this.dbReady || !this.db) {
      return;
    }
    
    try {
      const transaction = this.db.transaction([CACHE_CONFIG.STORES.DATA], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORES.DATA);
      store.clear();
    } catch (e) {
      console.error('[OfflineCache] Clear error:', e);
    }
  }
  
  /**
   * 清除過期緩存
   */
  async clearExpired(): Promise<number> {
    if (!this.dbReady || !this.db) {
      return 0;
    }
    
    try {
      return new Promise((resolve) => {
        const transaction = this.db!.transaction([CACHE_CONFIG.STORES.DATA], 'readwrite');
        const store = transaction.objectStore(CACHE_CONFIG.STORES.DATA);
        const index = store.index('expiresAt');
        const range = IDBKeyRange.upperBound(Date.now());
        const request = index.openCursor(range);
        
        let deletedCount = 0;
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        
        request.onerror = () => resolve(0);
      });
    } catch (e) {
      return 0;
    }
  }
  
  // ==================== 請求隊列 ====================
  
  /**
   * 添加待處理請求
   */
  async addPendingRequest(url: string, method: string, body?: any, headers?: Record<string, string>): Promise<string> {
    const request: PendingRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    // 限制隊列大小
    if (this._pendingRequests().length >= CACHE_CONFIG.MAX_PENDING_REQUESTS) {
      console.warn('[OfflineCache] Pending request queue full');
      return '';
    }
    
    // 更新內存狀態
    this._pendingRequests.update(list => [...list, request]);
    
    // 持久化到 IndexedDB
    await this.savePendingRequest(request);
    
    console.log('[OfflineCache] Request queued:', request.id);
    return request.id;
  }
  
  /**
   * 處理所有待處理請求
   */
  async processPendingRequests(): Promise<{ success: number; failed: number }> {
    const pending = this._pendingRequests();
    if (pending.length === 0) {
      return { success: 0, failed: 0 };
    }
    
    this._isSyncing.set(true);
    
    let success = 0;
    let failed = 0;
    
    for (const request of pending) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json',
            ...request.headers
          },
          body: request.body ? JSON.stringify(request.body) : undefined
        });
        
        if (response.ok) {
          await this.removePendingRequest(request.id);
          success++;
        } else if (request.retryCount >= CACHE_CONFIG.MAX_RETRY_COUNT) {
          await this.removePendingRequest(request.id);
          failed++;
        } else {
          // 增加重試計數
          request.retryCount++;
          await this.savePendingRequest(request);
        }
      } catch (e) {
        if (request.retryCount >= CACHE_CONFIG.MAX_RETRY_COUNT) {
          await this.removePendingRequest(request.id);
          failed++;
        } else {
          request.retryCount++;
          await this.savePendingRequest(request);
        }
      }
    }
    
    this._lastSyncTime.set(Date.now());
    this._isSyncing.set(false);
    
    console.log(`[OfflineCache] Processed ${success + failed} requests: ${success} success, ${failed} failed`);
    
    return { success, failed };
  }
  
  /**
   * 載入待處理請求
   */
  private async loadPendingRequests(): Promise<void> {
    if (!this.dbReady || !this.db) {
      return;
    }
    
    try {
      const transaction = this.db.transaction([CACHE_CONFIG.STORES.PENDING], 'readonly');
      const store = transaction.objectStore(CACHE_CONFIG.STORES.PENDING);
      const request = store.getAll();
      
      request.onsuccess = () => {
        this._pendingRequests.set(request.result || []);
      };
    } catch (e) {
      console.error('[OfflineCache] Load pending requests error:', e);
    }
  }
  
  /**
   * 保存待處理請求
   */
  private async savePendingRequest(request: PendingRequest): Promise<void> {
    if (!this.dbReady || !this.db) {
      return;
    }
    
    try {
      const transaction = this.db.transaction([CACHE_CONFIG.STORES.PENDING], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORES.PENDING);
      store.put(request);
    } catch (e) {
      console.error('[OfflineCache] Save pending request error:', e);
    }
  }
  
  /**
   * 移除待處理請求
   */
  private async removePendingRequest(id: string): Promise<void> {
    // 更新內存狀態
    this._pendingRequests.update(list => list.filter(r => r.id !== id));
    
    if (!this.dbReady || !this.db) {
      return;
    }
    
    try {
      const transaction = this.db.transaction([CACHE_CONFIG.STORES.PENDING], 'readwrite');
      const store = transaction.objectStore(CACHE_CONFIG.STORES.PENDING);
      store.delete(id);
    } catch (e) {
      console.error('[OfflineCache] Remove pending request error:', e);
    }
  }
}
