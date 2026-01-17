/**
 * TG-AI智控王 IndexedDB 優化服務
 * Optimized IndexedDB Service v1.0
 * 
 * 💡 設計思考：
 * 1. 連接池 - 復用數據庫連接
 * 2. 批量操作 - 使用事務批量處理
 * 3. 內存緩存 - 減少讀取次數
 * 4. 自動索引 - 根據查詢模式優化
 * 5. 空間管理 - 自動清理過期數據
 * 6. 遷移支持 - 平滑的版本升級
 */

import { Injectable, signal, computed, OnDestroy } from '@angular/core';

// ============ 類型定義 ============

export interface StoreSchema {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indexes?: IndexSchema[];
}

export interface IndexSchema {
  name: string;
  keyPath: string | string[];
  unique?: boolean;
  multiEntry?: boolean;
}

export interface QueryOptions {
  index?: string;
  range?: IDBKeyRange;
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface DBStats {
  stores: Record<string, {
    count: number;
    size: number;
  }>;
  totalSize: number;
  cacheHits: number;
  cacheMisses: number;
}

// ============ 配置 ============

const DB_CONFIG = {
  name: 'tgai-database',
  version: 1,
  stores: [
    {
      name: 'groups',
      keyPath: 'id',
      indexes: [
        { name: 'title', keyPath: 'title' },
        { name: 'source', keyPath: 'source' },
        { name: 'membersCount', keyPath: 'membersCount' },
        { name: 'updatedAt', keyPath: 'updatedAt' }
      ]
    },
    {
      name: 'members',
      keyPath: 'id',
      indexes: [
        { name: 'groupId', keyPath: 'groupId' },
        { name: 'username', keyPath: 'username' },
        { name: 'status', keyPath: 'status' },
        { name: 'valueScore', keyPath: 'valueScore' }
      ]
    },
    {
      name: 'searchHistory',
      keyPath: 'id',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'keyword', keyPath: 'query.keyword' }
      ]
    },
    {
      name: 'favorites',
      keyPath: 'id',
      indexes: [
        { name: 'addedAt', keyPath: 'addedAt' }
      ]
    },
    {
      name: 'cache',
      keyPath: 'key',
      indexes: [
        { name: 'expiresAt', keyPath: 'expiresAt' }
      ]
    }
  ] as StoreSchema[]
};

const CACHE_CONFIG = {
  maxSize: 100, // 最大緩存條目
  defaultTTL: 5 * 60 * 1000, // 5 分鐘
  cleanupInterval: 60 * 1000 // 1 分鐘清理一次
};

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService implements OnDestroy {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  
  // 內存緩存
  private memoryCache = new Map<string, CacheEntry<any>>();
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // 清理定時器
  private cleanupTimer?: number;
  
  // 狀態
  private _isReady = signal(false);
  isReady = computed(() => this._isReady());
  
  private _stats = signal<DBStats>({
    stores: {},
    totalSize: 0,
    cacheHits: 0,
    cacheMisses: 0
  });
  stats = computed(() => this._stats());
  
  constructor() {
    this.initialize();
    this.startCleanupTimer();
  }
  
  ngOnDestroy(): void {
    this.close();
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
  
  // ============ 初始化 ============
  
  private async initialize(): Promise<void> {
    try {
      await this.openDatabase();
      this._isReady.set(true);
      console.log('[IndexedDB] Database initialized');
    } catch (error) {
      console.error('[IndexedDB] Initialization failed:', error);
    }
  }
  
  private openDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }
    
    if (this.dbPromise) {
      return this.dbPromise;
    }
    
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
      
      request.onerror = () => {
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        
        // 監聯版本變化
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          this.dbPromise = null;
          console.log('[IndexedDB] Database version changed, reopening...');
        };
        
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.handleUpgrade(db, event.oldVersion, event.newVersion);
      };
    });
    
    return this.dbPromise;
  }
  
  /**
   * 處理數據庫升級
   * 
   * 💡 思考：支持增量遷移
   */
  private handleUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number | null): void {
    console.log(`[IndexedDB] Upgrading from v${oldVersion} to v${newVersion}`);
    
    // 創建新的 Object Stores
    for (const schema of DB_CONFIG.stores) {
      if (!db.objectStoreNames.contains(schema.name)) {
        const store = db.createObjectStore(schema.name, {
          keyPath: schema.keyPath,
          autoIncrement: schema.autoIncrement
        });
        
        // 創建索引
        if (schema.indexes) {
          for (const index of schema.indexes) {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique,
              multiEntry: index.multiEntry
            });
          }
        }
      }
    }
  }
  
  // ============ CRUD 操作 ============
  
  /**
   * 獲取單個項目
   */
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    // 檢查內存緩存
    const cacheKey = `${storeName}:${key}`;
    const cached = this.getFromCache<T>(cacheKey);
    if (cached !== undefined) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;
    
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result as T | undefined;
        if (result) {
          this.setCache(cacheKey, result);
        }
        resolve(result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 獲取所有項目
   */
  async getAll<T>(storeName: string, options?: QueryOptions): Promise<T[]> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      // 使用索引或直接查詢
      const source = options?.index 
        ? store.index(options.index) 
        : store;
      
      const results: T[] = [];
      let count = 0;
      let skipped = 0;
      
      const request = source.openCursor(options?.range, options?.direction);
      
      request.onsuccess = () => {
        const cursor = request.result;
        
        if (cursor) {
          // 處理 offset
          if (options?.offset && skipped < options.offset) {
            skipped++;
            cursor.continue();
            return;
          }
          
          // 處理 limit
          if (options?.limit && count >= options.limit) {
            resolve(results);
            return;
          }
          
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 添加項目
   */
  async add<T>(storeName: string, data: T): Promise<IDBValidKey> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => {
        // 清除相關緩存
        this.invalidateStoreCache(storeName);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 更新項目
   */
  async put<T>(storeName: string, data: T): Promise<IDBValidKey> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      
      request.onsuccess = () => {
        this.invalidateStoreCache(storeName);
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 刪除項目
   */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => {
        this.invalidateStoreCache(storeName);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 清空存儲
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        this.invalidateStoreCache(storeName);
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  // ============ 批量操作 ============
  
  /**
   * 批量添加
   * 
   * 💡 優化：使用單個事務處理所有操作
   */
  async bulkAdd<T>(storeName: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => {
        this.invalidateStoreCache(storeName);
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const item of items) {
        store.add(item);
      }
    });
  }
  
  /**
   * 批量更新
   */
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => {
        this.invalidateStoreCache(storeName);
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const item of items) {
        store.put(item);
      }
    });
  }
  
  /**
   * 批量刪除
   */
  async bulkDelete(storeName: string, keys: IDBValidKey[]): Promise<void> {
    if (keys.length === 0) return;
    
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      transaction.oncomplete = () => {
        this.invalidateStoreCache(storeName);
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
      
      for (const key of keys) {
        store.delete(key);
      }
    });
  }
  
  // ============ 查詢優化 ============
  
  /**
   * 使用索引查詢
   */
  async queryByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  /**
   * 範圍查詢
   */
  async queryRange<T>(
    storeName: string,
    indexName: string,
    lower: IDBValidKey,
    upper: IDBValidKey,
    options?: { lowerOpen?: boolean; upperOpen?: boolean; limit?: number }
  ): Promise<T[]> {
    const range = IDBKeyRange.bound(
      lower, 
      upper, 
      options?.lowerOpen, 
      options?.upperOpen
    );
    
    return this.getAll<T>(storeName, {
      index: indexName,
      range,
      limit: options?.limit
    });
  }
  
  /**
   * 計數
   */
  async count(storeName: string, indexName?: string, range?: IDBKeyRange): Promise<number> {
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const request = source.count(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  // ============ 緩存管理 ============
  
  private getFromCache<T>(key: string): T | undefined {
    const entry = this.memoryCache.get(key);
    
    if (!entry) return undefined;
    
    // 檢查是否過期
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return undefined;
    }
    
    return entry.data;
  }
  
  private setCache<T>(key: string, data: T, ttl: number = CACHE_CONFIG.defaultTTL): void {
    // 檢查緩存大小
    if (this.memoryCache.size >= CACHE_CONFIG.maxSize) {
      this.evictOldestCache();
    }
    
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }
  
  private invalidateStoreCache(storeName: string): void {
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${storeName}:`)) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  private evictOldestCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
  
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanupExpiredCache();
      this.cleanupExpiredDBCache();
    }, CACHE_CONFIG.cleanupInterval);
  }
  
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }
  
  private async cleanupExpiredDBCache(): Promise<void> {
    try {
      const db = await this.openDatabase();
      const now = Date.now();
      
      const transaction = db.transaction('cache', 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const range = IDBKeyRange.upperBound(now);
      
      const request = index.openCursor(range);
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      // 緩存清理失敗不影響正常運行
      console.warn('[IndexedDB] Cache cleanup failed:', error);
    }
  }
  
  // ============ 存儲管理 ============
  
  /**
   * 獲取存儲統計
   */
  async getStorageStats(): Promise<DBStats> {
    const stores: Record<string, { count: number; size: number }> = {};
    
    for (const schema of DB_CONFIG.stores) {
      const count = await this.count(schema.name);
      stores[schema.name] = { count, size: 0 };
    }
    
    // 估算存儲空間
    let totalSize = 0;
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      totalSize = estimate.usage || 0;
    }
    
    const stats: DBStats = {
      stores,
      totalSize,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses
    };
    
    this._stats.set(stats);
    return stats;
  }
  
  /**
   * 清理舊數據
   */
  async cleanupOldData(storeName: string, maxAge: number): Promise<number> {
    const cutoff = Date.now() - maxAge;
    let deletedCount = 0;
    
    const db = await this.openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // 嘗試使用時間戳索引
      let source: IDBObjectStore | IDBIndex = store;
      try {
        source = store.index('timestamp') || store.index('updatedAt') || store.index('createdAt');
      } catch {
        // 沒有時間索引，掃描所有記錄
      }
      
      const range = IDBKeyRange.upperBound(cutoff);
      const request = source.openCursor(range);
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => {
        this.invalidateStoreCache(storeName);
        resolve(deletedCount);
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }
  
  /**
   * 關閉數據庫連接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.dbPromise = null;
    }
    
    this.memoryCache.clear();
    this._isReady.set(false);
  }
  
  /**
   * 刪除整個數據庫
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_CONFIG.name);
      
      request.onsuccess = () => {
        console.log('[IndexedDB] Database deleted');
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }
}
