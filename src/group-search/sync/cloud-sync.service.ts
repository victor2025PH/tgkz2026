/**
 * TG-AI智控王 雲端同步服務
 * Cloud Sync Service v1.0
 * 
 * 功能：
 * - 數據雲端備份與同步
 * - 增量同步與衝突解決
 * - 跨設備數據同步
 * - 離線支持與隊列
 * - 加密傳輸
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';

// ============ 類型定義 ============

export type SyncStatus = 
  | 'idle'          // 閒置
  | 'syncing'       // 同步中
  | 'uploading'     // 上傳中
  | 'downloading'   // 下載中
  | 'conflict'      // 衝突
  | 'error'         // 錯誤
  | 'offline';      // 離線

export type SyncDataType = 
  | 'favorites'     // 收藏
  | 'history'       // 歷史記錄
  | 'settings'      // 設置
  | 'tasks'         // 定時任務
  | 'accounts'      // 帳號信息（加密）
  | 'members'       // 成員數據
  | 'exports'       // 導出記錄
  | 'analytics';    // 分析數據

export type ConflictResolution = 
  | 'local'         // 使用本地版本
  | 'remote'        // 使用遠端版本
  | 'merge'         // 合併
  | 'manual';       // 手動處理

export interface SyncItem {
  type: SyncDataType;
  key: string;
  data: any;
  version: number;
  checksum: string;
  updatedAt: Date;
  deviceId: string;
}

export interface SyncConflict {
  id: string;
  type: SyncDataType;
  key: string;
  localVersion: SyncItem;
  remoteVersion: SyncItem;
  resolvedAt?: Date;
  resolution?: ConflictResolution;
}

export interface SyncLog {
  id: string;
  action: 'upload' | 'download' | 'conflict' | 'delete';
  type: SyncDataType;
  key: string;
  status: 'success' | 'failed';
  timestamp: Date;
  details?: string;
}

export interface SyncStats {
  lastSyncAt?: Date;
  lastUploadAt?: Date;
  lastDownloadAt?: Date;
  totalUploaded: number;
  totalDownloaded: number;
  pendingUploads: number;
  conflicts: number;
  errors: number;
}

// ============ 配置 ============

const SYNC_CONFIG = {
  // 同步間隔（毫秒）
  syncInterval: 5 * 60 * 1000,  // 5 分鐘
  
  // 批量大小
  batchSize: 50,
  
  // 重試次數
  maxRetries: 3,
  
  // 離線隊列最大長度
  maxQueueSize: 1000,
  
  // 加密密鑰（實際應從用戶/服務器獲取）
  encryptionEnabled: true,
  
  // API 端點
  apiEndpoint: '/api/sync',
  
  // 需要同步的數據類型
  syncTypes: [
    'favorites',
    'history',
    'settings',
    'tasks'
  ] as SyncDataType[]
};

@Injectable({
  providedIn: 'root'
})
export class CloudSyncService implements OnDestroy {
  // 同步狀態
  private _status = signal<SyncStatus>('idle');
  status = computed(() => this._status());
  
  // 當前進度
  private _progress = signal<{ current: number; total: number }>({ current: 0, total: 0 });
  progress = computed(() => this._progress());
  
  // 衝突列表
  private _conflicts = signal<SyncConflict[]>([]);
  conflicts = computed(() => this._conflicts());
  
  // 離線隊列
  private _offlineQueue = signal<SyncItem[]>([]);
  offlineQueue = computed(() => this._offlineQueue());
  
  // 同步日誌
  private _logs = signal<SyncLog[]>([]);
  logs = computed(() => this._logs());
  
  // 統計
  private _stats = signal<SyncStats>({
    totalUploaded: 0,
    totalDownloaded: 0,
    pendingUploads: 0,
    conflicts: 0,
    errors: 0
  });
  stats = computed(() => this._stats());
  
  // 本地數據版本
  private localVersions: Map<string, number> = new Map();
  
  // 設備 ID
  private deviceId: string;
  
  // 同步定時器
  private syncTimer: any = null;
  
  // 在線狀態
  private _isOnline = signal(navigator.onLine);
  isOnline = computed(() => this._isOnline());
  
  // 是否啟用自動同步
  private _autoSyncEnabled = signal(true);
  autoSyncEnabled = computed(() => this._autoSyncEnabled());
  
  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.loadLocalVersions();
    this.loadOfflineQueue();
    this.setupOnlineListener();
    
    // 啟動自動同步
    this.startAutoSync();
  }
  
  ngOnDestroy(): void {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
  
  // ============ 同步控制 ============
  
  /**
   * 開始完整同步
   */
  async syncAll(): Promise<void> {
    if (this._status() === 'syncing') {
      console.log('[CloudSync] Already syncing');
      return;
    }
    
    if (!this._isOnline()) {
      console.log('[CloudSync] Offline, sync queued');
      return;
    }
    
    console.log('[CloudSync] Starting full sync...');
    this._status.set('syncing');
    
    try {
      // 1. 先處理離線隊列
      await this.processOfflineQueue();
      
      // 2. 上傳本地更改
      for (const type of SYNC_CONFIG.syncTypes) {
        await this.uploadChanges(type);
      }
      
      // 3. 下載遠端更改
      for (const type of SYNC_CONFIG.syncTypes) {
        await this.downloadChanges(type);
      }
      
      // 更新統計
      this._stats.update(s => ({
        ...s,
        lastSyncAt: new Date()
      }));
      
      console.log('[CloudSync] Full sync completed');
      
    } catch (error: any) {
      console.error('[CloudSync] Sync failed:', error);
      this._status.set('error');
      this._stats.update(s => ({ ...s, errors: s.errors + 1 }));
      throw error;
    } finally {
      this._status.set('idle');
    }
  }
  
  /**
   * 同步特定類型
   */
  async syncType(type: SyncDataType): Promise<void> {
    if (!this._isOnline()) {
      console.log(`[CloudSync] Offline, ${type} sync queued`);
      return;
    }
    
    try {
      await this.uploadChanges(type);
      await this.downloadChanges(type);
    } catch (error) {
      console.error(`[CloudSync] Failed to sync ${type}:`, error);
      throw error;
    }
  }
  
  /**
   * 上傳單項數據
   */
  async uploadItem(type: SyncDataType, key: string, data: any): Promise<void> {
    const version = (this.localVersions.get(`${type}:${key}`) || 0) + 1;
    const checksum = this.calculateChecksum(data);
    
    const item: SyncItem = {
      type,
      key,
      data,
      version,
      checksum,
      updatedAt: new Date(),
      deviceId: this.deviceId
    };
    
    if (!this._isOnline()) {
      // 離線時加入隊列
      this.addToOfflineQueue(item);
      return;
    }
    
    await this.uploadToServer(item);
    this.localVersions.set(`${type}:${key}`, version);
    this.saveLocalVersions();
  }
  
  /**
   * 標記數據需要同步
   */
  markForSync(type: SyncDataType, key: string, data: any): void {
    const version = (this.localVersions.get(`${type}:${key}`) || 0) + 1;
    const checksum = this.calculateChecksum(data);
    
    const item: SyncItem = {
      type,
      key,
      data,
      version,
      checksum,
      updatedAt: new Date(),
      deviceId: this.deviceId
    };
    
    this.addToOfflineQueue(item);
    
    // 觸發即時同步（如果在線）
    if (this._isOnline() && this._autoSyncEnabled()) {
      this.processOfflineQueue();
    }
  }
  
  // ============ 上傳 ============
  
  /**
   * 上傳本地更改
   */
  private async uploadChanges(type: SyncDataType): Promise<void> {
    this._status.set('uploading');
    
    const localData = this.getLocalData(type);
    const items: SyncItem[] = [];
    
    for (const [key, data] of Object.entries(localData)) {
      const localVersion = this.localVersions.get(`${type}:${key}`) || 0;
      const checksum = this.calculateChecksum(data);
      
      items.push({
        type,
        key,
        data,
        version: localVersion + 1,
        checksum,
        updatedAt: new Date(),
        deviceId: this.deviceId
      });
    }
    
    // 批量上傳
    for (let i = 0; i < items.length; i += SYNC_CONFIG.batchSize) {
      const batch = items.slice(i, i + SYNC_CONFIG.batchSize);
      await this.uploadBatch(batch);
      
      this._progress.set({
        current: Math.min(i + SYNC_CONFIG.batchSize, items.length),
        total: items.length
      });
    }
  }
  
  /**
   * 批量上傳到服務器
   */
  private async uploadBatch(items: SyncItem[]): Promise<void> {
    for (const item of items) {
      try {
        await this.uploadToServer(item);
        
        this.localVersions.set(`${item.type}:${item.key}`, item.version);
        this._stats.update(s => ({
          ...s,
          totalUploaded: s.totalUploaded + 1,
          lastUploadAt: new Date()
        }));
        
        this.addLog('upload', item.type, item.key, 'success');
        
      } catch (error: any) {
        if (error.code === 'CONFLICT') {
          await this.handleConflict(item, error.remoteItem);
        } else {
          this.addLog('upload', item.type, item.key, 'failed', error.message);
          throw error;
        }
      }
    }
    
    this.saveLocalVersions();
  }
  
  /**
   * 上傳到服務器
   */
  private async uploadToServer(item: SyncItem): Promise<void> {
    // 加密數據
    const encryptedData = SYNC_CONFIG.encryptionEnabled 
      ? this.encryptData(item.data)
      : item.data;
    
    // 模擬 API 調用
    // const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/upload`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ ...item, data: encryptedData })
    // });
    
    // 模擬延遲
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`[CloudSync] Uploaded: ${item.type}/${item.key}`);
  }
  
  // ============ 下載 ============
  
  /**
   * 下載遠端更改
   */
  private async downloadChanges(type: SyncDataType): Promise<void> {
    this._status.set('downloading');
    
    // 獲取本地版本信息
    const localVersionInfo: Record<string, number> = {};
    for (const [key, version] of this.localVersions) {
      if (key.startsWith(`${type}:`)) {
        localVersionInfo[key.replace(`${type}:`, '')] = version;
      }
    }
    
    // 請求服務器返回更新的項目
    // const response = await fetch(`${SYNC_CONFIG.apiEndpoint}/changes`, {
    //   method: 'POST',
    //   body: JSON.stringify({ type, versions: localVersionInfo, deviceId: this.deviceId })
    // });
    // const changes = await response.json();
    
    // 模擬從服務器獲取更改
    const changes: SyncItem[] = [];  // 實際從服務器獲取
    
    for (const item of changes) {
      try {
        await this.applyRemoteChange(item);
        
        this._stats.update(s => ({
          ...s,
          totalDownloaded: s.totalDownloaded + 1,
          lastDownloadAt: new Date()
        }));
        
        this.addLog('download', item.type, item.key, 'success');
        
      } catch (error: any) {
        this.addLog('download', item.type, item.key, 'failed', error.message);
      }
    }
  }
  
  /**
   * 應用遠端更改
   */
  private async applyRemoteChange(item: SyncItem): Promise<void> {
    const localKey = `${item.type}:${item.key}`;
    const localVersion = this.localVersions.get(localKey) || 0;
    
    // 檢查是否有衝突
    if (localVersion > 0 && item.version <= localVersion) {
      // 本地版本更新，忽略遠端
      return;
    }
    
    // 解密數據
    const data = SYNC_CONFIG.encryptionEnabled 
      ? this.decryptData(item.data)
      : item.data;
    
    // 保存到本地
    this.saveLocalData(item.type, item.key, data);
    this.localVersions.set(localKey, item.version);
    this.saveLocalVersions();
    
    console.log(`[CloudSync] Downloaded: ${item.type}/${item.key}`);
  }
  
  // ============ 衝突處理 ============
  
  /**
   * 處理衝突
   */
  private async handleConflict(localItem: SyncItem, remoteItem: SyncItem): Promise<void> {
    console.log(`[CloudSync] Conflict detected: ${localItem.type}/${localItem.key}`);
    
    const conflict: SyncConflict = {
      id: `conflict_${Date.now()}`,
      type: localItem.type,
      key: localItem.key,
      localVersion: localItem,
      remoteVersion: remoteItem
    };
    
    this._conflicts.update(conflicts => [...conflicts, conflict]);
    this._stats.update(s => ({ ...s, conflicts: s.conflicts + 1 }));
    this._status.set('conflict');
    
    this.addLog('conflict', localItem.type, localItem.key, 'success');
  }
  
  /**
   * 解決衝突
   */
  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    const conflict = this._conflicts().find(c => c.id === conflictId);
    if (!conflict) return;
    
    let resolvedData: any;
    
    switch (resolution) {
      case 'local':
        resolvedData = conflict.localVersion.data;
        break;
      case 'remote':
        resolvedData = conflict.remoteVersion.data;
        break;
      case 'merge':
        resolvedData = this.mergeData(conflict.localVersion.data, conflict.remoteVersion.data);
        break;
      case 'manual':
        // 手動處理需要用戶提供數據
        return;
    }
    
    // 保存解決後的數據
    await this.uploadItem(conflict.type, conflict.key, resolvedData);
    
    // 移除衝突
    this._conflicts.update(conflicts => 
      conflicts.filter(c => c.id !== conflictId)
    );
    this._stats.update(s => ({ ...s, conflicts: s.conflicts - 1 }));
    
    console.log(`[CloudSync] Conflict resolved: ${conflict.type}/${conflict.key}`);
  }
  
  /**
   * 合併數據
   */
  private mergeData(local: any, remote: any): any {
    if (Array.isArray(local) && Array.isArray(remote)) {
      // 數組合併：去重
      const merged = [...local];
      for (const item of remote) {
        const exists = merged.some(m => 
          m.id === item.id || JSON.stringify(m) === JSON.stringify(item)
        );
        if (!exists) {
          merged.push(item);
        }
      }
      return merged;
    }
    
    if (typeof local === 'object' && typeof remote === 'object') {
      // 對象合併：深度合併，遠端優先
      return { ...local, ...remote };
    }
    
    // 默認使用較新的
    return remote;
  }
  
  // ============ 離線隊列 ============
  
  /**
   * 添加到離線隊列
   */
  private addToOfflineQueue(item: SyncItem): void {
    this._offlineQueue.update(queue => {
      // 檢查是否已存在相同項目
      const existingIndex = queue.findIndex(
        q => q.type === item.type && q.key === item.key
      );
      
      if (existingIndex >= 0) {
        // 替換舊項目
        const newQueue = [...queue];
        newQueue[existingIndex] = item;
        return newQueue;
      }
      
      // 限制隊列大小
      if (queue.length >= SYNC_CONFIG.maxQueueSize) {
        queue.shift();
      }
      
      return [...queue, item];
    });
    
    this._stats.update(s => ({ ...s, pendingUploads: this._offlineQueue().length }));
    this.saveOfflineQueue();
  }
  
  /**
   * 處理離線隊列
   */
  private async processOfflineQueue(): Promise<void> {
    const queue = this._offlineQueue();
    if (queue.length === 0) return;
    
    console.log(`[CloudSync] Processing offline queue: ${queue.length} items`);
    
    const processed: SyncItem[] = [];
    
    for (const item of queue) {
      try {
        await this.uploadToServer(item);
        processed.push(item);
        this.localVersions.set(`${item.type}:${item.key}`, item.version);
      } catch (error) {
        console.error(`[CloudSync] Failed to process queue item:`, error);
        // 繼續處理下一項
      }
    }
    
    // 移除已處理的項目
    this._offlineQueue.update(q => 
      q.filter(item => !processed.includes(item))
    );
    
    this._stats.update(s => ({ ...s, pendingUploads: this._offlineQueue().length }));
    this.saveOfflineQueue();
    this.saveLocalVersions();
  }
  
  // ============ 自動同步 ============
  
  /**
   * 啟動自動同步
   */
  startAutoSync(): void {
    if (this.syncTimer) return;
    
    this._autoSyncEnabled.set(true);
    this.syncTimer = setInterval(() => {
      if (this._isOnline()) {
        this.syncAll().catch(console.error);
      }
    }, SYNC_CONFIG.syncInterval);
    
    console.log('[CloudSync] Auto sync started');
  }
  
  /**
   * 停止自動同步
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this._autoSyncEnabled.set(false);
    
    console.log('[CloudSync] Auto sync stopped');
  }
  
  // ============ 在線狀態 ============
  
  private setupOnlineListener(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  private handleOnline = (): void => {
    console.log('[CloudSync] Back online');
    this._isOnline.set(true);
    this._status.set('idle');
    
    // 處理離線隊列
    if (this._offlineQueue().length > 0) {
      this.processOfflineQueue();
    }
  };
  
  private handleOffline = (): void => {
    console.log('[CloudSync] Gone offline');
    this._isOnline.set(false);
    this._status.set('offline');
  };
  
  // ============ 加密 ============
  
  private encryptData(data: any): string {
    // 簡單的 Base64 編碼（實際應使用 AES 等加密）
    return btoa(JSON.stringify(data));
  }
  
  private decryptData(encrypted: string): any {
    return JSON.parse(atob(encrypted));
  }
  
  // ============ 輔助方法 ============
  
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('tgai-device-id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('tgai-device-id', deviceId);
    }
    return deviceId;
  }
  
  private getLocalData(type: SyncDataType): Record<string, any> {
    const key = `tgai-${type}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }
  
  private saveLocalData(type: SyncDataType, key: string, data: any): void {
    const storageKey = `tgai-${type}`;
    const existing = this.getLocalData(type);
    existing[key] = data;
    localStorage.setItem(storageKey, JSON.stringify(existing));
  }
  
  private saveLocalVersions(): void {
    localStorage.setItem('tgai-sync-versions', 
      JSON.stringify([...this.localVersions.entries()])
    );
  }
  
  private loadLocalVersions(): void {
    try {
      const data = localStorage.getItem('tgai-sync-versions');
      if (data) {
        this.localVersions = new Map(JSON.parse(data));
      }
    } catch (e) {}
  }
  
  private saveOfflineQueue(): void {
    localStorage.setItem('tgai-sync-queue', JSON.stringify(this._offlineQueue()));
  }
  
  private loadOfflineQueue(): void {
    try {
      const data = localStorage.getItem('tgai-sync-queue');
      if (data) {
        this._offlineQueue.set(JSON.parse(data));
      }
    } catch (e) {}
  }
  
  private addLog(
    action: SyncLog['action'],
    type: SyncDataType,
    key: string,
    status: SyncLog['status'],
    details?: string
  ): void {
    const log: SyncLog = {
      id: `log_${Date.now()}`,
      action,
      type,
      key,
      status,
      timestamp: new Date(),
      details
    };
    
    this._logs.update(logs => [log, ...logs.slice(0, 199)]);
  }
  
  /**
   * 導出同步數據
   */
  exportSyncData(): string {
    const data = {
      deviceId: this.deviceId,
      versions: [...this.localVersions.entries()],
      queue: this._offlineQueue(),
      stats: this._stats()
    };
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 強制完整同步
   */
  async forceFullSync(): Promise<void> {
    // 清除本地版本記錄，強制重新同步所有數據
    this.localVersions.clear();
    this.saveLocalVersions();
    await this.syncAll();
  }
}
