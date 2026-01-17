/**
 * TG-AI智控王 操作審計服務
 * Audit Service v1.0
 * 
 * 💡 設計思考：
 * 1. 全鏈路日誌 - 記錄所有敏感操作
 * 2. 不可篡改 - 使用哈希鏈確保完整性
 * 3. 可追溯 - 支持按時間/用戶/操作類型查詢
 * 4. 自動歸檔 - 定期歸檔舊日誌
 * 5. 異常檢測 - 自動檢測可疑行為
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { IndexedDBService } from '../performance/indexed-db.service';

// ============ 類型定義 ============

export type AuditAction = 
  // 認證相關
  | 'login'
  | 'logout'
  | 'password_change'
  | 'key_generate'
  // 數據操作
  | 'data_export'
  | 'data_import'
  | 'data_delete'
  | 'data_encrypt'
  // 成員操作
  | 'member_extract'
  | 'member_message'
  | 'member_add_group'
  // 搜索操作
  | 'search_perform'
  | 'search_favorite'
  // 系統操作
  | 'settings_change'
  | 'account_add'
  | 'account_remove'
  | 'task_schedule'
  // 安全事件
  | 'security_alert'
  | 'rate_limit_hit'
  | 'suspicious_activity';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLog {
  id: string;
  timestamp: number;
  action: AuditAction;
  severity: AuditSeverity;
  userId?: string;
  accountId?: string;
  details: Record<string, any>;
  metadata: {
    ip?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
  };
  previousHash?: string;  // 前一條日誌的哈希
  hash: string;           // 當前日誌的哈希
}

export interface AuditQuery {
  startTime?: number;
  endTime?: number;
  actions?: AuditAction[];
  severity?: AuditSeverity[];
  userId?: string;
  accountId?: string;
  limit?: number;
  offset?: number;
}

export interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  bySeverity: Record<AuditSeverity, number>;
  recentAlerts: AuditLog[];
}

export interface SuspiciousPattern {
  name: string;
  description: string;
  check: (logs: AuditLog[]) => boolean;
  severity: AuditSeverity;
}

// ============ 配置 ============

const AUDIT_CONFIG = {
  maxLogsInMemory: 1000,
  flushInterval: 30000,     // 30 秒刷新一次到存儲
  retentionDays: 90,        // 保留 90 天
  alertThreshold: 5,        // 5 分鐘內同類型操作超過此數觸發警告
  suspiciousThreshold: 10   // 異常行為閾值
};

// ============ 預定義的可疑模式 ============

const SUSPICIOUS_PATTERNS: SuspiciousPattern[] = [
  {
    name: 'rapid_export',
    description: '短時間內大量導出數據',
    check: (logs) => {
      const exports = logs.filter(l => 
        l.action === 'data_export' && 
        Date.now() - l.timestamp < 5 * 60 * 1000
      );
      return exports.length > 5;
    },
    severity: 'warning'
  },
  {
    name: 'failed_logins',
    description: '連續登錄失敗',
    check: (logs) => {
      const logins = logs.filter(l => 
        l.action === 'login' && 
        l.details.success === false &&
        Date.now() - l.timestamp < 15 * 60 * 1000
      );
      return logins.length >= 3;
    },
    severity: 'critical'
  },
  {
    name: 'bulk_delete',
    description: '大批量刪除操作',
    check: (logs) => {
      const deletes = logs.filter(l => 
        l.action === 'data_delete' && 
        Date.now() - l.timestamp < 10 * 60 * 1000
      );
      return deletes.length > 10;
    },
    severity: 'critical'
  },
  {
    name: 'unusual_hours',
    description: '非正常時間操作',
    check: (logs) => {
      const hour = new Date().getHours();
      return (hour >= 0 && hour < 5) && logs.some(l => 
        l.action !== 'login' && 
        Date.now() - l.timestamp < 60 * 1000
      );
    },
    severity: 'info'
  },
  {
    name: 'mass_messaging',
    description: '短時間內大量發送消息',
    check: (logs) => {
      const messages = logs.filter(l => 
        l.action === 'member_message' && 
        Date.now() - l.timestamp < 5 * 60 * 1000
      );
      return messages.length > 50;
    },
    severity: 'warning'
  }
];

@Injectable({
  providedIn: 'root'
})
export class AuditService implements OnDestroy {
  private db = inject(IndexedDBService);
  
  // 內存緩存
  private logsBuffer: AuditLog[] = [];
  private lastHash = '';
  
  // 會話信息
  private sessionId = this.generateSessionId();
  private deviceId = this.getDeviceId();
  
  // 統計
  private _stats = signal<AuditStats>({
    totalLogs: 0,
    byAction: {},
    bySeverity: { info: 0, warning: 0, critical: 0 },
    recentAlerts: []
  });
  stats = computed(() => this._stats());
  
  // 警報
  private _alerts = signal<AuditLog[]>([]);
  alerts = computed(() => this._alerts());
  
  // 定時器
  private flushTimer?: number;
  private cleanupTimer?: number;
  
  constructor() {
    this.startFlushTimer();
    this.startCleanupTimer();
    this.loadStats();
    
    // 記錄會話開始
    this.log('login', { sessionStart: true }, 'info');
  }
  
  ngOnDestroy(): void {
    // 記錄會話結束
    this.log('logout', { sessionEnd: true }, 'info');
    
    // 刷新緩存
    this.flush();
    
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
  
  // ============ 日誌記錄 ============
  
  /**
   * 記錄審計日誌
   */
  async log(
    action: AuditAction,
    details: Record<string, any> = {},
    severity: AuditSeverity = 'info',
    options?: {
      userId?: string;
      accountId?: string;
    }
  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      action,
      severity,
      userId: options?.userId,
      accountId: options?.accountId,
      details,
      metadata: {
        deviceId: this.deviceId,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent
      },
      previousHash: this.lastHash,
      hash: '' // 將在下面計算
    };
    
    // 計算哈希
    log.hash = await this.calculateHash(log);
    this.lastHash = log.hash;
    
    // 添加到緩存
    this.logsBuffer.push(log);
    
    // 更新統計
    this.updateStats(log);
    
    // 檢查可疑行為
    this.checkSuspiciousActivity();
    
    // 如果緩存過大，立即刷新
    if (this.logsBuffer.length >= AUDIT_CONFIG.maxLogsInMemory) {
      await this.flush();
    }
    
    // 如果是嚴重事件，立即持久化
    if (severity === 'critical') {
      await this.flush();
    }
    
    console.log(`[Audit] ${action}:`, details);
    
    return log;
  }
  
  /**
   * 便捷方法：記錄信息日誌
   */
  info(action: AuditAction, details: Record<string, any> = {}): Promise<AuditLog> {
    return this.log(action, details, 'info');
  }
  
  /**
   * 便捷方法：記錄警告日誌
   */
  warn(action: AuditAction, details: Record<string, any> = {}): Promise<AuditLog> {
    return this.log(action, details, 'warning');
  }
  
  /**
   * 便捷方法：記錄嚴重日誌
   */
  critical(action: AuditAction, details: Record<string, any> = {}): Promise<AuditLog> {
    return this.log(action, details, 'critical');
  }
  
  // ============ 查詢 ============
  
  /**
   * 查詢審計日誌
   */
  async query(query: AuditQuery): Promise<AuditLog[]> {
    // 先從內存緩存查詢
    let results: AuditLog[] = [...this.logsBuffer];
    
    // 從存儲查詢
    // 注意：這裡簡化處理，實際應該使用 IndexedDB 的索引查詢
    const stored = await this.db.getAll<AuditLog>('auditLogs', {
      limit: query.limit || 1000
    });
    
    results = [...stored, ...results];
    
    // 過濾
    if (query.startTime) {
      results = results.filter(l => l.timestamp >= query.startTime!);
    }
    if (query.endTime) {
      results = results.filter(l => l.timestamp <= query.endTime!);
    }
    if (query.actions?.length) {
      results = results.filter(l => query.actions!.includes(l.action));
    }
    if (query.severity?.length) {
      results = results.filter(l => query.severity!.includes(l.severity));
    }
    if (query.userId) {
      results = results.filter(l => l.userId === query.userId);
    }
    if (query.accountId) {
      results = results.filter(l => l.accountId === query.accountId);
    }
    
    // 排序
    results.sort((a, b) => b.timestamp - a.timestamp);
    
    // 分頁
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  /**
   * 獲取最近的日誌
   */
  async getRecent(limit = 50): Promise<AuditLog[]> {
    return this.query({ limit });
  }
  
  /**
   * 獲取指定操作的日誌
   */
  async getByAction(action: AuditAction, limit = 100): Promise<AuditLog[]> {
    return this.query({ actions: [action], limit });
  }
  
  /**
   * 獲取警告和嚴重日誌
   */
  async getAlerts(limit = 50): Promise<AuditLog[]> {
    return this.query({ severity: ['warning', 'critical'], limit });
  }
  
  // ============ 完整性驗證 ============
  
  /**
   * 驗證日誌鏈完整性
   * 
   * 💡 通過哈希鏈檢測日誌是否被篡改
   */
  async verifyIntegrity(logs: AuditLog[]): Promise<{
    valid: boolean;
    brokenAt?: number;
    details: string;
  }> {
    if (logs.length === 0) {
      return { valid: true, details: 'Empty log chain' };
    }
    
    // 按時間排序
    const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length; i++) {
      const log = sorted[i];
      
      // 驗證哈希
      const expectedHash = await this.calculateHash(log);
      if (log.hash !== expectedHash) {
        return {
          valid: false,
          brokenAt: i,
          details: `Hash mismatch at index ${i}: expected ${expectedHash}, got ${log.hash}`
        };
      }
      
      // 驗證鏈接（除了第一條）
      if (i > 0 && log.previousHash !== sorted[i - 1].hash) {
        return {
          valid: false,
          brokenAt: i,
          details: `Chain broken at index ${i}: previous hash mismatch`
        };
      }
    }
    
    return { valid: true, details: `Verified ${logs.length} logs` };
  }
  
  // ============ 異常檢測 ============
  
  /**
   * 檢查可疑活動
   */
  private checkSuspiciousActivity(): void {
    const recentLogs = this.logsBuffer.filter(
      l => Date.now() - l.timestamp < 15 * 60 * 1000
    );
    
    for (const pattern of SUSPICIOUS_PATTERNS) {
      if (pattern.check(recentLogs)) {
        // 避免重複警報
        const existingAlert = this._alerts().find(
          a => a.details.pattern === pattern.name && 
               Date.now() - a.timestamp < 5 * 60 * 1000
        );
        
        if (!existingAlert) {
          this.log('suspicious_activity', {
            pattern: pattern.name,
            description: pattern.description
          }, pattern.severity);
          
          // 更新警報列表
          this._alerts.update(alerts => {
            const newAlert: AuditLog = {
              id: `alert_${Date.now()}`,
              timestamp: Date.now(),
              action: 'security_alert',
              severity: pattern.severity,
              details: {
                pattern: pattern.name,
                description: pattern.description
              },
              metadata: {},
              hash: ''
            };
            return [newAlert, ...alerts.slice(0, 9)];
          });
        }
      }
    }
  }
  
  /**
   * 添加自定義可疑模式
   */
  addSuspiciousPattern(pattern: SuspiciousPattern): void {
    SUSPICIOUS_PATTERNS.push(pattern);
  }
  
  // ============ 統計 ============
  
  private updateStats(log: AuditLog): void {
    this._stats.update(stats => ({
      totalLogs: stats.totalLogs + 1,
      byAction: {
        ...stats.byAction,
        [log.action]: (stats.byAction[log.action] || 0) + 1
      },
      bySeverity: {
        ...stats.bySeverity,
        [log.severity]: stats.bySeverity[log.severity] + 1
      },
      recentAlerts: log.severity !== 'info' 
        ? [log, ...stats.recentAlerts.slice(0, 9)]
        : stats.recentAlerts
    }));
  }
  
  private async loadStats(): Promise<void> {
    try {
      const logs = await this.db.getAll<AuditLog>('auditLogs', { limit: 10000 });
      
      const byAction: Record<string, number> = {};
      const bySeverity: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 };
      const recentAlerts: AuditLog[] = [];
      
      for (const log of logs) {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
        bySeverity[log.severity]++;
        
        if (log.severity !== 'info' && recentAlerts.length < 10) {
          recentAlerts.push(log);
        }
      }
      
      this._stats.set({
        totalLogs: logs.length,
        byAction,
        bySeverity,
        recentAlerts
      });
    } catch (error) {
      console.warn('[Audit] Failed to load stats:', error);
    }
  }
  
  // ============ 存儲管理 ============
  
  /**
   * 刷新緩存到存儲
   */
  async flush(): Promise<void> {
    if (this.logsBuffer.length === 0) return;
    
    try {
      await this.db.bulkPut('auditLogs', this.logsBuffer);
      this.logsBuffer = [];
    } catch (error) {
      console.error('[Audit] Flush failed:', error);
    }
  }
  
  /**
   * 清理過期日誌
   */
  private async cleanup(): Promise<void> {
    const cutoff = Date.now() - AUDIT_CONFIG.retentionDays * 24 * 60 * 60 * 1000;
    
    try {
      await this.db.cleanupOldData('auditLogs', cutoff);
    } catch (error) {
      console.warn('[Audit] Cleanup failed:', error);
    }
  }
  
  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(
      () => this.flush(),
      AUDIT_CONFIG.flushInterval
    );
  }
  
  private startCleanupTimer(): void {
    // 每天清理一次
    this.cleanupTimer = window.setInterval(
      () => this.cleanup(),
      24 * 60 * 60 * 1000
    );
  }
  
  // ============ 工具方法 ============
  
  /**
   * 計算日誌哈希
   */
  private async calculateHash(log: AuditLog): Promise<string> {
    const data = JSON.stringify({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      severity: log.severity,
      details: log.details,
      previousHash: log.previousHash
    });
    
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('tgai-device-id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('tgai-device-id', deviceId);
    }
    return deviceId;
  }
  
  /**
   * 導出審計日誌
   */
  async exportLogs(query?: AuditQuery): Promise<string> {
    const logs = await this.query(query || {});
    return JSON.stringify(logs, null, 2);
  }
}
