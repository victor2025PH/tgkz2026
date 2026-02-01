/**
 * P2 優化：離線緩存服務
 * 
 * 功能：
 * - IndexedDB 本地狀態緩存
 * - 網絡狀態監聽
 * - 頁面可見性處理
 * - 離線操作隊列
 */

import { Injectable, signal, computed, NgZone } from '@angular/core';

// 緩存數據結構
export interface CachedState {
  accounts: any[];
  keywordSets: any[];
  monitoredGroups: any[];
  campaigns: any[];
  leads: any[];
  settings: any;
  lastUpdated: number;
  version: string;
}

// 離線操作
export interface OfflineOperation {
  id: string;
  command: string;
  payload: any;
  timestamp: number;
  retryCount: number;
}

// 網絡狀態
export type NetworkStatus = 'online' | 'offline' | 'slow';

const DB_NAME = 'TgMatrixCache';
const DB_VERSION = 1;
const STORE_STATE = 'appState';
const STORE_OPERATIONS = 'offlineOperations';
const CACHE_VERSION = '2.1.1';
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 小時

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private dbReady = false;
  
  // 🆕 P2-2: 網絡狀態
  networkStatus = signal<NetworkStatus>('online');
  isOnline = computed(() => this.networkStatus() !== 'offline');
  
  // 🆕 P2-3: 頁面可見性
  isPageVisible = signal(true);
  
  // 🆕 P2-4: 離線操作隊列
  pendingOperations = signal<OfflineOperation[]>([]);
  hasPendingOperations = computed(() => this.pendingOperations().length > 0);
  
  // 緩存狀態
  cachedState = signal<CachedState | null>(null);
  isCacheValid = computed(() => {
    const cache = this.cachedState();
    if (!cache) return false;
    if (cache.version !== CACHE_VERSION) return false;
    if (Date.now() - cache.lastUpdated > CACHE_MAX_AGE_MS) return false;
    return true;
  });

  constructor(private ngZone: NgZone) {
    this.initDatabase();
    this.setupNetworkListener();
    this.setupVisibilityListener();
  }

  /**
   * 初始化 IndexedDB
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('[OfflineCache] Failed to open IndexedDB:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        this.dbReady = true;
        console.log('[OfflineCache] ✅ IndexedDB initialized');
        
        // 載入緩存狀態
        this.loadCachedState();
        this.loadPendingOperations();
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 創建狀態存儲
        if (!db.objectStoreNames.contains(STORE_STATE)) {
          db.createObjectStore(STORE_STATE, { keyPath: 'id' });
          console.log('[OfflineCache] Created state store');
        }
        
        // 創建離線操作存儲
        if (!db.objectStoreNames.contains(STORE_OPERATIONS)) {
          const opStore = db.createObjectStore(STORE_OPERATIONS, { keyPath: 'id' });
          opStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[OfflineCache] Created operations store');
        }
      };
    });
  }

  /**
   * 🆕 P2-2: 設置網絡狀態監聽
   */
  private setupNetworkListener(): void {
    // 監聽 online/offline 事件
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        console.log('[OfflineCache] 🌐 Network online');
        this.networkStatus.set('online');
        // 網絡恢復，嘗試同步離線操作
        this.syncPendingOperations();
      });
    });
    
    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        console.log('[OfflineCache] 📴 Network offline');
        this.networkStatus.set('offline');
      });
    });
    
    // 初始狀態
    this.networkStatus.set(navigator.onLine ? 'online' : 'offline');
    
    // 🆕 可選：監測網絡速度（通過 Connection API）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => {
          this.ngZone.run(() => {
            const effectiveType = connection.effectiveType;
            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
              this.networkStatus.set('slow');
            } else if (navigator.onLine) {
              this.networkStatus.set('online');
            }
          });
        });
      }
    }
  }

  /**
   * 🆕 P2-3: 設置頁面可見性監聽
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      this.ngZone.run(() => {
        const visible = document.visibilityState === 'visible';
        console.log(`[OfflineCache] 👁️ Page visibility: ${visible ? 'visible' : 'hidden'}`);
        this.isPageVisible.set(visible);
        
        // 頁面重新可見時刷新數據
        if (visible && this.isOnline()) {
          window.dispatchEvent(new CustomEvent('page-became-visible'));
        }
      });
    });
  }

  /**
   * 🆕 P2-1: 緩存應用狀態
   */
  async cacheState(state: Partial<CachedState>): Promise<void> {
    if (!this.dbReady || !this.db) {
      console.warn('[OfflineCache] Database not ready');
      return;
    }
    
    const cachedData: CachedState = {
      accounts: state.accounts || [],
      keywordSets: state.keywordSets || [],
      monitoredGroups: state.monitoredGroups || [],
      campaigns: state.campaigns || [],
      leads: state.leads || [],
      settings: state.settings || {},
      lastUpdated: Date.now(),
      version: CACHE_VERSION
    };
    
    try {
      const transaction = this.db.transaction([STORE_STATE], 'readwrite');
      const store = transaction.objectStore(STORE_STATE);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id: 'main', ...cachedData });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.cachedState.set(cachedData);
      console.log('[OfflineCache] ✅ State cached');
    } catch (error) {
      console.error('[OfflineCache] Failed to cache state:', error);
    }
  }

  /**
   * 🆕 P2-1: 載入緩存狀態
   */
  async loadCachedState(): Promise<CachedState | null> {
    if (!this.dbReady || !this.db) {
      return null;
    }
    
    try {
      const transaction = this.db.transaction([STORE_STATE], 'readonly');
      const store = transaction.objectStore(STORE_STATE);
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get('main');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (result) {
        const { id, ...state } = result;
        this.cachedState.set(state as CachedState);
        console.log('[OfflineCache] ✅ Loaded cached state from', new Date(state.lastUpdated).toLocaleString());
        return state as CachedState;
      }
      
      return null;
    } catch (error) {
      console.error('[OfflineCache] Failed to load cached state:', error);
      return null;
    }
  }

  /**
   * 🆕 P2-4: 添加離線操作
   */
  async addOfflineOperation(command: string, payload: any): Promise<void> {
    if (!this.dbReady || !this.db) {
      console.warn('[OfflineCache] Database not ready, operation not queued');
      return;
    }
    
    const operation: OfflineOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      command,
      payload,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    try {
      const transaction = this.db.transaction([STORE_OPERATIONS], 'readwrite');
      const store = transaction.objectStore(STORE_OPERATIONS);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put(operation);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.pendingOperations.update(ops => [...ops, operation]);
      console.log('[OfflineCache] ➕ Queued offline operation:', command);
    } catch (error) {
      console.error('[OfflineCache] Failed to queue operation:', error);
    }
  }

  /**
   * 🆕 P2-4: 載入待處理操作
   */
  private async loadPendingOperations(): Promise<void> {
    if (!this.dbReady || !this.db) return;
    
    try {
      const transaction = this.db.transaction([STORE_OPERATIONS], 'readonly');
      const store = transaction.objectStore(STORE_OPERATIONS);
      
      const result = await new Promise<OfflineOperation[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      
      this.pendingOperations.set(result);
      if (result.length > 0) {
        console.log('[OfflineCache] 📋 Loaded', result.length, 'pending operations');
      }
    } catch (error) {
      console.error('[OfflineCache] Failed to load pending operations:', error);
    }
  }

  /**
   * 🆕 P2-4: 同步離線操作
   */
  async syncPendingOperations(): Promise<void> {
    const operations = this.pendingOperations();
    if (operations.length === 0) return;
    
    console.log('[OfflineCache] 🔄 Syncing', operations.length, 'pending operations');
    
    // 通知應用層處理
    window.dispatchEvent(new CustomEvent('sync-offline-operations', {
      detail: { operations }
    }));
  }

  /**
   * 🆕 P2-4: 移除已完成的操作
   */
  async removeOperation(operationId: string): Promise<void> {
    if (!this.dbReady || !this.db) return;
    
    try {
      const transaction = this.db.transaction([STORE_OPERATIONS], 'readwrite');
      const store = transaction.objectStore(STORE_OPERATIONS);
      
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(operationId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      this.pendingOperations.update(ops => ops.filter(op => op.id !== operationId));
      console.log('[OfflineCache] ✅ Removed operation:', operationId);
    } catch (error) {
      console.error('[OfflineCache] Failed to remove operation:', error);
    }
  }

  /**
   * 清除所有緩存
   */
  async clearCache(): Promise<void> {
    if (!this.dbReady || !this.db) return;
    
    try {
      const transaction = this.db.transaction([STORE_STATE, STORE_OPERATIONS], 'readwrite');
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(STORE_STATE).clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        }),
        new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(STORE_OPERATIONS).clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
      ]);
      
      this.cachedState.set(null);
      this.pendingOperations.set([]);
      console.log('[OfflineCache] 🗑️ Cache cleared');
    } catch (error) {
      console.error('[OfflineCache] Failed to clear cache:', error);
    }
  }

  /**
   * 獲取緩存統計
   */
  getCacheStats(): { stateAge: number; pendingCount: number; isValid: boolean } {
    const cache = this.cachedState();
    return {
      stateAge: cache ? Date.now() - cache.lastUpdated : -1,
      pendingCount: this.pendingOperations().length,
      isValid: this.isCacheValid()
    };
  }
}
