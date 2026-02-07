/**
 * 🔧 P8-5: 全局操作審計追蹤服務
 * 
 * 職責：
 * - 追蹤關鍵用戶操作（帳號增刪、配額使用、設定變更等）
 * - 記錄到 localStorage + 定期上報後端
 * - 提供查詢/導出 API
 * 
 * 與 group-search/audit.service 的關係：
 * - 那個服務專注於群組搜索模塊的細粒度審計
 * - 本服務覆蓋全局應用層面的關鍵操作
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// ============ 類型定義 ============

export type AuditAction =
  // 認證
  | 'auth.login'
  | 'auth.logout'
  | 'auth.token_refresh'
  // 帳號管理
  | 'account.add'
  | 'account.remove'
  | 'account.login'
  | 'account.logout'
  | 'account.batch_operation'
  // 配額
  | 'quota.check'
  | 'quota.exceeded'
  | 'quota.purchase'
  // 設定
  | 'settings.language_change'
  | 'settings.theme_change'
  | 'settings.profile_update'
  // 導航
  | 'nav.view_change'
  // 數據操作
  | 'data.export'
  | 'data.import'
  | 'data.backup'
  // 系統
  | 'system.error'
  | 'system.offline_queue'
  | 'system.notification_action';

export type AuditSeverity = 'info' | 'warning' | 'error';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  severity: AuditSeverity;
  timestamp: number;
  details: Record<string, any>;
  userId?: string;
}

const STORAGE_KEY = 'tg-matrix-audit-log';
const MAX_LOCAL_ENTRIES = 500;
const REPORT_INTERVAL_MS = 5 * 60 * 1000; // 5 分鐘上報一次

@Injectable({
  providedIn: 'root'
})
export class AuditTrackerService implements OnDestroy {
  private ipc = inject(ElectronIpcService);

  private _entries = signal<AuditEntry[]>([]);
  readonly entries = this._entries.asReadonly();
  readonly entryCount = computed(() => this._entries().length);

  private reportTimer: ReturnType<typeof setInterval> | null = null;
  private pendingReport: AuditEntry[] = [];

  constructor() {
    this.loadFromStorage();
    this.startPeriodicReport();
  }

  ngOnDestroy(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    // 退出前上報
    this.flushReport();
  }

  /**
   * 記錄操作
   */
  track(action: AuditAction, details: Record<string, any> = {}, severity: AuditSeverity = 'info'): void {
    const entry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      action,
      severity,
      timestamp: Date.now(),
      details,
      userId: this.getCurrentUserId()
    };

    this._entries.update(list => {
      const updated = [entry, ...list];
      // 保持最大數量限制
      return updated.length > MAX_LOCAL_ENTRIES ? updated.slice(0, MAX_LOCAL_ENTRIES) : updated;
    });

    this.pendingReport.push(entry);
    this.saveToStorage();
  }

  /**
   * 便捷方法
   */
  trackLogin(username: string): void {
    this.track('auth.login', { username });
  }

  trackLogout(): void {
    this.track('auth.logout', {});
  }

  trackAccountAdd(accountId: string, phone?: string): void {
    this.track('account.add', { accountId, phone });
  }

  trackAccountRemove(accountId: string): void {
    this.track('account.remove', { accountId });
  }

  trackViewChange(from: string, to: string): void {
    this.track('nav.view_change', { from, to }, 'info');
  }

  trackSettingsChange(setting: string, oldValue: any, newValue: any): void {
    this.track('settings.profile_update', { setting, oldValue, newValue });
  }

  trackError(error: string, context?: Record<string, any>): void {
    this.track('system.error', { error, ...context }, 'error');
  }

  trackQuotaExceeded(quotaType: string, current: number, limit: number): void {
    this.track('quota.exceeded', { quotaType, current, limit }, 'warning');
  }

  /**
   * 查詢日誌
   */
  query(opts: {
    action?: AuditAction;
    severity?: AuditSeverity;
    startTime?: number;
    endTime?: number;
    limit?: number;
  } = {}): AuditEntry[] {
    let result = this._entries();

    if (opts.action) {
      result = result.filter(e => e.action === opts.action);
    }
    if (opts.severity) {
      result = result.filter(e => e.severity === opts.severity);
    }
    if (opts.startTime) {
      result = result.filter(e => e.timestamp >= opts.startTime!);
    }
    if (opts.endTime) {
      result = result.filter(e => e.timestamp <= opts.endTime!);
    }
    if (opts.limit) {
      result = result.slice(0, opts.limit);
    }

    return result;
  }

  /**
   * 導出為 JSON
   */
  exportAsJson(): string {
    return JSON.stringify(this._entries(), null, 2);
  }

  /**
   * 清空本地日誌
   */
  clearLocal(): void {
    this._entries.set([]);
    this.saveToStorage();
  }

  // ============ 內部方法 ============

  private getCurrentUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('tg-matrix-user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id?.toString() || user.username;
      }
    } catch { /* ignore */ }
    return undefined;
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const entries = JSON.parse(stored) as AuditEntry[];
        this._entries.set(entries.slice(0, MAX_LOCAL_ENTRIES));
      }
    } catch (e) {
      console.warn('[AuditTracker] Failed to load from storage:', e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
    } catch (e) {
      console.warn('[AuditTracker] Failed to save to storage:', e);
    }
  }

  private startPeriodicReport(): void {
    this.reportTimer = setInterval(() => this.flushReport(), REPORT_INTERVAL_MS);
  }

  private flushReport(): void {
    if (this.pendingReport.length === 0) return;

    const batch = [...this.pendingReport];
    this.pendingReport = [];

    // 通過 IPC 上報到後端
    try {
      this.ipc.send('audit-log-batch', { entries: batch });
    } catch (e) {
      // 上報失敗，放回隊列下次重試
      this.pendingReport.push(...batch);
    }
  }
}
