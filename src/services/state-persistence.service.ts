/**
 * 狀態持久化服務
 * State Persistence Service
 * 
 * 🆕 P4 階段：用戶體驗優化
 * 
 * 功能：
 * - 統一存儲管理
 * - 自動序列化/反序列化
 * - 版本遷移
 * - 存儲清理
 */

import { Injectable, signal, effect } from '@angular/core';

// ============ 類型定義 ============

/** 存儲鍵定義 */
export const STORAGE_KEYS = {
  // 用戶偏好
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  LANGUAGE: 'language',
  
  // 會話狀態
  CURRENT_VIEW: 'current_view',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  
  // 功能數據
  MARKETING_ANALYTICS: 'marketingAnalytics',
  SMART_TIMING: 'smartTiming',
  SMART_AUTOMATION: 'smartAutomation',
  PLANNER_DRAFT: 'plannerDraft',
  
  // 帳號相關
  ACCOUNTS_CACHE: 'accounts_cache',
  SESSION_PATHS: 'session_paths',
  
  // 搜索歷史
  SEARCH_HISTORY: 'search_history',
  RECENT_CONTACTS: 'recent_contacts',
  
  // 版本信息
  STORAGE_VERSION: 'storage_version'
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

/** 存儲項元數據 */
interface StorageMetadata {
  key: string;
  version: number;
  savedAt: number;
  expiresAt?: number;
}

/** 存儲統計 */
interface StorageStats {
  totalKeys: number;
  totalSize: number;  // 字節
  byKey: { key: string; size: number }[];
}

// ============ 版本定義 ============

const CURRENT_VERSION = 1;

// 版本遷移函數
const MIGRATIONS: Record<number, (data: any) => any> = {
  // 版本 0 -> 1
  1: (data) => {
    // 示例遷移：添加新字段
    return {
      ...data,
      migratedAt: Date.now()
    };
  }
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class StatePersistenceService {
  
  // 存儲統計
  private _stats = signal<StorageStats | null>(null);
  stats = this._stats.asReadonly();
  
  // 存儲是否可用
  private _available = signal(true);
  available = this._available.asReadonly();
  
  constructor() {
    this.checkStorageAvailability();
    this.runMigrations();
    this.updateStats();
  }
  
  // ============ 核心方法 ============
  
  /**
   * 保存數據
   */
  save<T>(key: StorageKey, data: T, options?: {
    ttl?: number;  // 過期時間（毫秒）
    version?: number;
  }): boolean {
    if (!this._available()) return false;
    
    try {
      const metadata: StorageMetadata = {
        key,
        version: options?.version ?? CURRENT_VERSION,
        savedAt: Date.now(),
        expiresAt: options?.ttl ? Date.now() + options.ttl : undefined
      };
      
      const wrapper = {
        _meta: metadata,
        data
      };
      
      localStorage.setItem(key, JSON.stringify(wrapper));
      this.updateStats();
      return true;
    } catch (error: any) {
      console.error(`[StatePersistence] 保存失敗 (${key}):`, error);
      
      // 存儲滿時嘗試清理
      if (error.name === 'QuotaExceededError') {
        this.cleanup();
        // 重試一次
        try {
          localStorage.setItem(key, JSON.stringify({ data, _meta: { key, version: CURRENT_VERSION, savedAt: Date.now() } }));
          return true;
        } catch {
          return false;
        }
      }
      
      return false;
    }
  }
  
  /**
   * 讀取數據
   */
  load<T>(key: StorageKey, defaultValue?: T): T | undefined {
    if (!this._available()) return defaultValue;
    
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return defaultValue;
      
      const wrapper = JSON.parse(stored);
      
      // 檢查是否有元數據
      if (wrapper._meta) {
        // 檢查過期
        if (wrapper._meta.expiresAt && Date.now() > wrapper._meta.expiresAt) {
          this.remove(key);
          return defaultValue;
        }
        
        // 版本遷移
        if (wrapper._meta.version < CURRENT_VERSION) {
          const migrated = this.migrate(wrapper.data, wrapper._meta.version);
          this.save(key, migrated);
          return migrated as T;
        }
        
        return wrapper.data as T;
      }
      
      // 舊格式數據（無元數據）
      return wrapper as T;
    } catch (error) {
      console.error(`[StatePersistence] 讀取失敗 (${key}):`, error);
      return defaultValue;
    }
  }
  
  /**
   * 刪除數據
   */
  remove(key: StorageKey): boolean {
    try {
      localStorage.removeItem(key);
      this.updateStats();
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 檢查數據是否存在
   */
  has(key: StorageKey): boolean {
    return localStorage.getItem(key) !== null;
  }
  
  // ============ 批量操作 ============
  
  /**
   * 批量保存
   */
  saveMultiple(items: { key: StorageKey; data: any }[]): boolean {
    let allSuccess = true;
    for (const item of items) {
      if (!this.save(item.key, item.data)) {
        allSuccess = false;
      }
    }
    return allSuccess;
  }
  
  /**
   * 批量讀取
   */
  loadMultiple<T extends Record<string, any>>(keys: StorageKey[]): Partial<T> {
    const result: Partial<T> = {};
    for (const key of keys) {
      (result as any)[key] = this.load(key);
    }
    return result;
  }
  
  // ============ 用戶偏好 ============
  
  /**
   * 保存用戶偏好
   */
  savePreference<T>(prefKey: string, value: T) {
    const prefs = this.load<Record<string, any>>(STORAGE_KEYS.USER_PREFERENCES, {});
    prefs[prefKey] = value;
    this.save(STORAGE_KEYS.USER_PREFERENCES, prefs);
  }
  
  /**
   * 讀取用戶偏好
   */
  loadPreference<T>(prefKey: string, defaultValue?: T): T | undefined {
    const prefs = this.load<Record<string, any>>(STORAGE_KEYS.USER_PREFERENCES, {});
    return (prefs[prefKey] as T) ?? defaultValue;
  }
  
  // ============ 會話狀態 ============
  
  /**
   * 保存會話狀態（使用 sessionStorage）
   */
  saveSession<T>(key: string, data: T): boolean {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 讀取會話狀態
   */
  loadSession<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const stored = sessionStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  /**
   * 清除會話狀態
   */
  clearSession(): void {
    sessionStorage.clear();
  }
  
  // ============ 清理和維護 ============
  
  /**
   * 清理過期數據
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        
        const wrapper = JSON.parse(stored);
        
        // 清理過期數據
        if (wrapper._meta?.expiresAt && now > wrapper._meta.expiresAt) {
          localStorage.removeItem(key);
          cleaned++;
          i--;  // 調整索引
        }
      } catch {
        // 無法解析的數據，跳過
      }
    }
    
    this.updateStats();
    console.log(`[StatePersistence] 清理了 ${cleaned} 個過期項`);
    return cleaned;
  }
  
  /**
   * 清理舊數據（按時間）
   */
  cleanupOld(maxAge: number = 30 * 24 * 60 * 60 * 1000): number {
    let cleaned = 0;
    const cutoff = Date.now() - maxAge;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        
        const wrapper = JSON.parse(stored);
        
        if (wrapper._meta?.savedAt && wrapper._meta.savedAt < cutoff) {
          localStorage.removeItem(key);
          cleaned++;
          i--;
        }
      } catch {
        // 跳過
      }
    }
    
    this.updateStats();
    return cleaned;
  }
  
  /**
   * 清除所有存儲
   */
  clearAll(): void {
    localStorage.clear();
    this.updateStats();
  }
  
  // ============ 導入/導出 ============
  
  /**
   * 導出所有數據
   */
  exportAll(): string {
    const data: Record<string, any> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || 'null');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
    
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
      data
    }, null, 2);
  }
  
  /**
   * 導入數據
   */
  importAll(jsonString: string): boolean {
    try {
      const imported = JSON.parse(jsonString);
      
      if (!imported.data) {
        console.error('[StatePersistence] 無效的導入格式');
        return false;
      }
      
      for (const [key, value] of Object.entries(imported.data)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      
      this.updateStats();
      return true;
    } catch (error) {
      console.error('[StatePersistence] 導入失敗:', error);
      return false;
    }
  }
  
  // ============ 內部方法 ============
  
  /**
   * 檢查存儲可用性
   */
  private checkStorageAvailability(): void {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this._available.set(true);
    } catch {
      this._available.set(false);
      console.warn('[StatePersistence] localStorage 不可用');
    }
  }
  
  /**
   * 運行版本遷移
   */
  private runMigrations(): void {
    const storedVersion = this.load<number>(STORAGE_KEYS.STORAGE_VERSION as StorageKey, 0);
    
    if (storedVersion !== undefined && storedVersion < CURRENT_VERSION) {
      console.log(`[StatePersistence] 運行遷移: ${storedVersion} -> ${CURRENT_VERSION}`);
      
      // 遷移每個存儲項
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        try {
          const data = this.load(key as StorageKey);
          if (data) {
            const migrated = this.migrate(data, storedVersion);
            this.save(key as StorageKey, migrated);
          }
        } catch {
          // 跳過無法遷移的項
        }
      }
      
      this.save(STORAGE_KEYS.STORAGE_VERSION as StorageKey, CURRENT_VERSION);
    }
  }
  
  /**
   * 遷移數據
   */
  private migrate(data: any, fromVersion: number): any {
    let result = data;
    
    for (let v = fromVersion + 1; v <= CURRENT_VERSION; v++) {
      if (MIGRATIONS[v]) {
        result = MIGRATIONS[v](result);
      }
    }
    
    return result;
  }
  
  /**
   * 更新存儲統計
   */
  private updateStats(): void {
    let totalSize = 0;
    const byKey: { key: string; size: number }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      const value = localStorage.getItem(key);
      const size = new Blob([value || '']).size;
      totalSize += size;
      byKey.push({ key, size });
    }
    
    byKey.sort((a, b) => b.size - a.size);
    
    this._stats.set({
      totalKeys: localStorage.length,
      totalSize,
      byKey
    });
  }
  
  /**
   * 獲取存儲使用情況
   */
  getUsageInfo(): { used: string; available: string; percentage: number } {
    const stats = this._stats();
    if (!stats) {
      return { used: '0 KB', available: '5 MB', percentage: 0 };
    }
    
    const usedMB = stats.totalSize / (1024 * 1024);
    const availableMB = 5; // 假設 5MB 限制
    const percentage = (usedMB / availableMB) * 100;
    
    return {
      used: usedMB < 1 ? `${(stats.totalSize / 1024).toFixed(1)} KB` : `${usedMB.toFixed(2)} MB`,
      available: `${availableMB} MB`,
      percentage: Math.min(100, percentage)
    };
  }
}
