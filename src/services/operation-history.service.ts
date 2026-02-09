/**
 * Phase3: 操作歷史服務 (Operation History Service)
 * 
 * 追蹤用戶對群組/資源的所有關鍵操作：
 * - 加入群組 (join)
 * - 加入監控 (monitor)
 * - 提取成員 (extract)
 * - 搜索發現 (search)
 * 
 * 功能：
 * - 自動記錄操作結果（成功/失敗）
 * - 持久化到 localStorage
 * - 按資源/時間/類型篩選
 * - 最近操作統計
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

export type OperationType = 'join' | 'monitor' | 'extract' | 'search' | 'remove';
export type OperationStatus = 'pending' | 'success' | 'failed';

export interface OperationRecord {
  id: string;
  type: OperationType;
  status: OperationStatus;
  resourceId?: number | string;
  resourceTitle?: string;
  resourceUsername?: string;
  phone?: string;
  details?: string;
  errorCode?: string;
  errorMessage?: string;
  memberCount?: number;
  timestamp: number;
  duration?: number;  // milliseconds
}

const STORAGE_KEY = 'tg-operation-history';
const MAX_RECORDS = 200;

@Injectable({
  providedIn: 'root'
})
export class OperationHistoryService {
  private ipc = inject(ElectronIpcService);
  
  // 操作記錄
  private _records = signal<OperationRecord[]>([]);
  records = this._records.asReadonly();
  
  // 計算屬性
  recentRecords = computed(() => this._records().slice(0, 20));
  
  successCount = computed(() => 
    this._records().filter(r => r.status === 'success').length
  );
  
  failedCount = computed(() => 
    this._records().filter(r => r.status === 'failed').length
  );
  
  todayRecords = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    return this._records().filter(r => r.timestamp >= todayTs);
  });
  
  // 按類型統計
  statsByType = computed(() => {
    const stats: Record<OperationType, { total: number; success: number; failed: number }> = {
      join: { total: 0, success: 0, failed: 0 },
      monitor: { total: 0, success: 0, failed: 0 },
      extract: { total: 0, success: 0, failed: 0 },
      search: { total: 0, success: 0, failed: 0 },
      remove: { total: 0, success: 0, failed: 0 }
    };
    for (const r of this._records()) {
      const s = stats[r.type];
      if (s) {
        s.total++;
        if (r.status === 'success') s.success++;
        if (r.status === 'failed') s.failed++;
      }
    }
    return stats;
  });

  private pendingOps: Map<string, { record: OperationRecord; startTime: number }> = new Map();
  private cleanupFns: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  /**
   * 記錄操作開始
   */
  startOperation(type: OperationType, info: {
    resourceId?: number | string;
    resourceTitle?: string;
    resourceUsername?: string;
    phone?: string;
  }): string {
    const id = `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const record: OperationRecord = {
      id,
      type,
      status: 'pending',
      ...info,
      timestamp: Date.now()
    };
    
    this.pendingOps.set(id, { record, startTime: Date.now() });
    this._records.update(records => [record, ...records].slice(0, MAX_RECORDS));
    return id;
  }

  /**
   * 記錄操作完成
   */
  completeOperation(id: string, result: {
    success: boolean;
    details?: string;
    errorCode?: string;
    errorMessage?: string;
    memberCount?: number;
  }): void {
    const pending = this.pendingOps.get(id);
    const duration = pending ? Date.now() - pending.startTime : undefined;
    
    this._records.update(records =>
      records.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: result.success ? 'success' as const : 'failed' as const,
            details: result.details,
            errorCode: result.errorCode,
            errorMessage: result.errorMessage,
            memberCount: result.memberCount,
            duration
          };
        }
        return r;
      })
    );
    
    this.pendingOps.delete(id);
    this.saveToStorage();
  }

  /**
   * 直接添加一條完成記錄（無需 start/complete 配對）
   */
  addRecord(type: OperationType, info: {
    resourceId?: number | string;
    resourceTitle?: string;
    resourceUsername?: string;
    phone?: string;
    success: boolean;
    details?: string;
    errorCode?: string;
    errorMessage?: string;
    memberCount?: number;
  }): void {
    const record: OperationRecord = {
      id: `op-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      status: info.success ? 'success' : 'failed',
      resourceId: info.resourceId,
      resourceTitle: info.resourceTitle,
      resourceUsername: info.resourceUsername,
      phone: info.phone,
      details: info.details,
      errorCode: info.errorCode,
      errorMessage: info.errorMessage,
      memberCount: info.memberCount,
      timestamp: Date.now()
    };
    
    this._records.update(records => [record, ...records].slice(0, MAX_RECORDS));
    this.saveToStorage();
  }

  /**
   * 按資源 ID 獲取記錄
   */
  getByResource(resourceId: number | string): OperationRecord[] {
    return this._records().filter(r => String(r.resourceId) === String(resourceId));
  }

  /**
   * 清空歷史
   */
  clear(): void {
    this._records.set([]);
    this.saveToStorage();
  }

  /**
   * 獲取操作類型的中文名
   */
  getTypeLabel(type: OperationType): string {
    const labels: Record<OperationType, string> = {
      join: '加入群組',
      monitor: '加入監控',
      extract: '提取成員',
      search: '搜索發現',
      remove: '移除群組'
    };
    return labels[type] || type;
  }

  /**
   * 獲取操作狀態圖標
   */
  getStatusIcon(status: OperationStatus): string {
    const icons: Record<OperationStatus, string> = {
      pending: '⏳',
      success: '✅',
      failed: '❌'
    };
    return icons[status] || '❓';
  }

  // ==================== 私有方法 ====================

  private setupEventListeners(): void {
    // 監聽加入群組完成
    this.cleanupFns.push(
      this.ipc.on('join-and-monitor-complete', (data: any) => {
        this.addRecord(data.monitored ? 'monitor' : 'join', {
          resourceId: data.resourceId,
          resourceTitle: data.title,
          success: data.success === true,
          errorMessage: data.error,
          details: data.success 
            ? `${data.monitored ? '監控' : '加入'}成功 (${data.memberCount || 0} 成員)`
            : undefined
        });
      })
    );

    // 監聽資源狀態更新
    this.cleanupFns.push(
      this.ipc.on('resource-status-updated', (data: any) => {
        if (data.newStatus === 'monitoring') {
          this.addRecord('monitor', {
            resourceId: data.resourceId,
            resourceUsername: data.username,
            success: true,
            details: '已添加到監控列表'
          });
        }
      })
    );

    // 監聽成員提取完成
    this.cleanupFns.push(
      this.ipc.on('members-extracted', (data: any) => {
        this.addRecord('extract', {
          resourceId: data.resourceId,
          success: data.success === true,
          memberCount: data.extracted || 0,
          errorCode: data.error_code,
          errorMessage: data.error,
          details: data.success 
            ? `提取 ${data.extracted || 0} 成員 (總計 ${data.total || 0})`
            : undefined
        });
      })
    );
    
    // 🔧 Phase4: 監聽監控群組添加結果
    this.cleanupFns.push(
      this.ipc.on('monitored-group-added', (data: any) => {
        this.addRecord('monitor', {
          resourceTitle: data.name,
          resourceUsername: data.username,
          success: data.success === true,
          errorMessage: data.error,
          details: data.success
            ? `已添加「${data.name || data.username || ''}」到監控列表`
            : `添加失敗: ${data.error || '未知錯誤'}`
        });
      })
    );
    
    // 🔧 Phase4: 監聽群組移除事件
    this.cleanupFns.push(
      this.ipc.on('group-removed', (data: any) => {
        this.addRecord('remove', {
          success: data.success !== false,
          details: data.success !== false ? '已移除群組' : `移除失敗: ${data.error}`,
          errorMessage: data.error
        });
      })
    );
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const records = JSON.parse(stored) as OperationRecord[];
        this._records.set(records.slice(0, MAX_RECORDS));
      }
    } catch (e) {
      console.warn('[OperationHistory] Failed to load from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const records = this._records();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
    } catch (e) {
      console.warn('[OperationHistory] Failed to save to storage:', e);
    }
  }
}
