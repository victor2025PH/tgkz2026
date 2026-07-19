/**
 * 系统告警管理组件
 * 
 * 功能：
 * 1. 显示活跃告警列表
 * 2. 告警历史查询
 * 3. 告警规则配置
 * 4. 批量处理告警
 */

import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';
import { ToastService } from '../toast.service';

interface Alert {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'critical' | 'urgent';
  title: string;
  message: string;
  api_id: string;
  timestamp: number;
  resolved: boolean;
  resolved_at: number;
  metadata: Record<string, any>;
}

interface AlertSummary {
  total_active: number;
  info: number;
  warning: number;
  critical: number;
  urgent: number;
  total_history: number;
}

@Component({
  selector: 'app-system-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="alerts-page">
      <div class="page-header">
        <h1>🔔 系统告警</h1>
        <div class="header-actions">
          <button (click)="loadAlerts()" class="btn-refresh" [disabled]="isLoading()">
            {{ isLoading() ? '刷新中...' : '🔄 刷新' }}
          </button>
          <button (click)="clearAllAlerts()" class="btn-clear" 
                  [disabled]="activeAlerts().length === 0">
            清除全部
          </button>
        </div>
      </div>

      <!-- 告警摘要 -->
      <div class="summary-cards">
        <div class="summary-card urgent" [class.has-alerts]="summary()?.urgent > 0">
          <div class="card-icon">🚨</div>
          <div class="card-value">{{ summary()?.urgent || 0 }}</div>
          <div class="card-label">紧急</div>
        </div>
        <div class="summary-card critical" [class.has-alerts]="summary()?.critical > 0">
          <div class="card-icon">⛔</div>
          <div class="card-value">{{ summary()?.critical || 0 }}</div>
          <div class="card-label">严重</div>
        </div>
        <div class="summary-card warning" [class.has-alerts]="summary()?.warning > 0">
          <div class="card-icon">⚠️</div>
          <div class="card-value">{{ summary()?.warning || 0 }}</div>
          <div class="card-label">警告</div>
        </div>
        <div class="summary-card info">
          <div class="card-icon">ℹ️</div>
          <div class="card-value">{{ summary()?.info || 0 }}</div>
          <div class="card-label">信息</div>
        </div>
      </div>

      <!-- 筛选器 -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>级别筛选:</label>
          <select [(ngModel)]="filterLevel" (change)="applyFilter()">
            <option value="all">全部</option>
            <option value="urgent">紧急</option>
            <option value="critical">严重</option>
            <option value="warning">警告</option>
            <option value="info">信息</option>
          </select>
        </div>
        <div class="filter-group">
          <label>状态:</label>
          <select [(ngModel)]="filterStatus" (change)="applyFilter()">
            <option value="active">活跃</option>
            <option value="resolved">已解决</option>
            <option value="all">全部</option>
          </select>
        </div>
      </div>

      <!-- 告警列表 -->
      <div class="alerts-list">
        @if (filteredAlerts().length === 0) {
          <div class="empty-state">
            @if (filterStatus === 'active') {
              <div class="empty-icon">✅</div>
              <h3>系统正常</h3>
              <p>当前没有活跃的告警</p>
            } @else {
              <div class="empty-icon">📭</div>
              <h3>暂无告警</h3>
              <p>没有符合条件的告警记录</p>
            }
          </div>
        }

        @for (alert of filteredAlerts(); track alert.id) {
          <div class="alert-card" [class]="'level-' + alert.level" [class.resolved]="alert.resolved">
            <div class="alert-icon">{{ getLevelIcon(alert.level) }}</div>
            <div class="alert-content">
              <div class="alert-header">
                <span class="alert-title">{{ alert.title }}</span>
                <span class="alert-level" [class]="alert.level">{{ getLevelLabel(alert.level) }}</span>
              </div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-meta">
                <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
                @if (alert.api_id) {
                  <span class="alert-api">API: {{ alert.api_id.substring(0, 8) }}...</span>
                }
                <span class="alert-type">{{ formatType(alert.type) }}</span>
              </div>
            </div>
            <div class="alert-actions">
              @if (!alert.resolved) {
                <button (click)="resolveAlert(alert)" class="btn-resolve">解决</button>
              } @else {
                <span class="resolved-badge">已解决</span>
              }
            </div>
          </div>
        }
      </div>

      <!-- 告警历史 -->
      <div class="history-section" *ngIf="showHistory()">
        <h3>📜 告警历史</h3>
        <div class="history-stats">
          <span>共 {{ summary()?.total_history || 0 }} 条历史记录</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alerts-page {
      padding: 1.5rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 0.75rem;
    }

    .btn-refresh, .btn-clear {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-refresh {
      background: #3b82f6;
      color: white;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-clear {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .btn-clear:hover:not(:disabled) {
      background: rgba(239, 68, 68, 0.2);
    }

    .btn-refresh:disabled, .btn-clear:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* 摘要卡片 */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .summary-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s;
    }

    .summary-card.has-alerts {
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    .summary-card.urgent.has-alerts {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
    }

    .summary-card.critical.has-alerts {
      background: rgba(249, 115, 22, 0.2);
      border-color: rgba(249, 115, 22, 0.5);
    }

    .summary-card.warning.has-alerts {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.5);
    }

    .card-icon {
      font-size: 2rem;
      margin-bottom: 0.5rem;
    }

    .card-value {
      font-size: 2rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .card-label {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    /* 筛选器 */
    .filter-bar {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 0.5rem;
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-group label {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .filter-group select {
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
      color: #f1f5f9;
      font-size: 0.875rem;
    }

    /* 告警列表 */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .alert-card {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 0.75rem;
      border-left: 4px solid #6b7280;
      transition: all 0.2s;
    }

    .alert-card:hover {
      background: rgba(30, 41, 59, 0.95);
    }

    .alert-card.level-urgent {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }

    .alert-card.level-critical {
      border-left-color: #f97316;
      background: rgba(249, 115, 22, 0.1);
    }

    .alert-card.level-warning {
      border-left-color: #f59e0b;
    }

    .alert-card.level-info {
      border-left-color: #3b82f6;
    }

    .alert-card.resolved {
      opacity: 0.6;
    }

    .alert-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .alert-content {
      flex: 1;
      min-width: 0;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.375rem;
    }

    .alert-title {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .alert-level {
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.7rem;
      font-weight: 500;
      text-transform: uppercase;
    }

    .alert-level.urgent {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .alert-level.critical {
      background: rgba(249, 115, 22, 0.2);
      color: #fdba74;
    }

    .alert-level.warning {
      background: rgba(245, 158, 11, 0.2);
      color: #fcd34d;
    }

    .alert-level.info {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .alert-message {
      font-size: 0.875rem;
      color: #d1d5db;
      margin-bottom: 0.5rem;
    }

    .alert-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .alert-actions {
      flex-shrink: 0;
    }

    .btn-resolve {
      padding: 0.375rem 0.75rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-resolve:hover {
      background: rgba(34, 197, 94, 0.2);
    }

    .resolved-badge {
      padding: 0.375rem 0.75rem;
      background: rgba(34, 197, 94, 0.1);
      color: #22c55e;
      border-radius: 0.375rem;
      font-size: 0.75rem;
    }

    /* 空状态 */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 1rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      color: #f1f5f9;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: #9ca3af;
      margin: 0;
    }

    /* 历史区域 */
    .history-section {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .history-section h3 {
      font-size: 1.125rem;
      color: #f1f5f9;
      margin: 0 0 1rem 0;
    }

    .history-stats {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .filter-bar {
        flex-direction: column;
        gap: 0.75rem;
      }

      .alert-card {
        flex-direction: column;
      }

      .alert-actions {
        align-self: flex-end;
      }
    }
  `]
})
export class SystemAlertsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);

  // 状态
  isLoading = signal(false);
  summary = signal<AlertSummary | null>(null);
  activeAlerts = signal<Alert[]>([]);
  historyAlerts = signal<Alert[]>([]);
  filteredAlerts = signal<Alert[]>([]);
  showHistory = signal(false);

  // 筛选
  filterLevel = 'all';
  filterStatus = 'active';

  // 自动刷新
  private refreshInterval: any;

  ngOnInit(): void {
    this.loadAlerts();
    // 🔧 Phase2: 15s→60s 降低 CPU 開銷
    this.refreshInterval = setInterval(() => this.loadAlerts(), 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadAlerts(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);

    try {
      const result = await this.adminService.getSystemAlerts() as { success?: boolean; data?: { summary?: any; active?: any[]; recent?: any[] }; error?: string } | undefined;

      if (result?.success) {
        // 🔧 Fix: 映射 DB 原始字段，確保 timestamp 正確解析；system_alerts 表沒有
        // title/api_id 欄位，用 alert_type 反推一個可讀標題顯示
        const mapAlert = (a: any) => {
          const type = a.alert_type || a.type || 'system';
          return {
            ...a,
            timestamp: this.parseTimestamp(a.created_at || a.timestamp),
            type,
            title: a.title || this.formatType(type),
          };
        };
        // 🔧 已用真實後端驗證證實：backend/api/handlers/analytics_handlers_impl.py 的
        // handle_get_alerts 在計算 active 時比對不存在的 'status' 欄位（實際欄位是
        // 'resolved'），導致 active 恆等於全部告警（即使已解決也會出現在 active 裡）。
        // 這是後端既有邏輯問題（不在本次可修改檔案範圍內），這裡改由前端依真實的
        // resolved 欄位重新過濾，避免「已解決」的告警誤顯示在活躍列表中。
        const active = (result.data?.active || []).map(mapAlert).filter((a: Alert) => !a.resolved);
        const recent = (result.data?.recent || []).map(mapAlert);

        this.activeAlerts.set(active);
        this.historyAlerts.set(recent);
        // 後端回傳的 summary 同樣受上述問題影響，改由前端依過濾後的 active 陣列重新統計
        this.summary.set({
          total_active: active.length,
          urgent: active.filter((a: Alert) => a.level === 'urgent').length,
          critical: active.filter((a: Alert) => a.level === 'critical').length,
          warning: active.filter((a: Alert) => a.level === 'warning').length,
          info: active.filter((a: Alert) => a.level === 'info').length,
          total_history: recent.length
        });
        this.applyFilter();
      } else if (result?.error) {
        console.error('Load alerts failed:', result.error);
      }
    } catch (e) {
      console.error('Load alerts failed:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  applyFilter(): void {
    let alerts = this.filterStatus === 'active' 
      ? this.activeAlerts() 
      : this.filterStatus === 'resolved'
        ? this.historyAlerts().filter(a => a.resolved)
        : [...this.activeAlerts(), ...this.historyAlerts()];

    if (this.filterLevel !== 'all') {
      alerts = alerts.filter(a => a.level === this.filterLevel);
    }

    // 按时间倒序
    alerts.sort((a, b) => b.timestamp - a.timestamp);

    this.filteredAlerts.set(alerts);
  }

  async resolveAlert(alert: Alert): Promise<void> {
    try {
      const result = await this.adminService.resolveSystemAlert(alert.id);

      if (result?.success) {
        this.toast.success('告警已解决');
        await this.loadAlerts();
      } else {
        this.toast.error(result?.error || '解决告警失败');
      }
    } catch (e) {
      console.error('Resolve alert failed:', e);
      this.toast.error('解决告警失败');
    }
  }

  async clearAllAlerts(): Promise<void> {
    try {
      const result = await this.adminService.clearAllSystemAlerts();

      if (result?.success) {
        this.toast.success('所有告警已清除');
        await this.loadAlerts();
      } else {
        this.toast.error(result?.error || '清除告警失败');
      }
    } catch (e) {
      console.error('Clear alerts failed:', e);
      this.toast.error('清除告警失败');
    }
  }

  getLevelIcon(level: string): string {
    const icons: Record<string, string> = {
      urgent: '🚨',
      critical: '⛔',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[level] || '🔔';
  }

  getLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      urgent: '紧急',
      critical: '严重',
      warning: '警告',
      info: '信息'
    };
    return labels[level] || level;
  }

  formatType(type: string): string {
    const types: Record<string, string> = {
      pool_exhausted: 'API池耗尽',
      pool_low_capacity: '容量不足',
      api_full: 'API已满',
      api_unhealthy: 'API不健康',
      api_degraded: 'API降级',
      low_success_rate: '成功率低',
      high_error_rate: '错误率高',
      api_recovered: 'API恢复',
      service_error: '服务错误'
    };
    return types[type] || type;
  }

  /**
   * 🔧 Fix: 安全解析時間戳 — 支持 Unix timestamp、ISO 字符串、數據庫格式
   */
  private parseTimestamp(value: any): number {
    if (!value) return Date.now() / 1000;
    if (typeof value === 'number' && value > 1577836800 && value < 4102444800) return value;
    if (typeof value === 'string') {
      const parsed = new Date(value.replace(' ', 'T'));
      if (!isNaN(parsed.getTime())) return parsed.getTime() / 1000;
    }
    if (typeof value === 'number' && value > 1577836800000) return value / 1000;
    return Date.now() / 1000;
  }

  formatTime(timestamp: number): string {
    if (!timestamp || isNaN(timestamp)) return '';
    const date = new Date(timestamp * 1000);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 0) return '刚刚';
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return date.toLocaleDateString();
  }
}
