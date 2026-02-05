/**
 * 审计日志查询组件
 * 
 * 功能：
 * 1. 高级筛选和搜索
 * 2. 操作类型分类
 * 3. 时间线视图
 * 4. 异常检测展示
 * 5. 导出功能
 */

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { I18nService } from '../i18n.service';

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  user_name: string;
  ip_address: string;
  old_value: any;
  new_value: any;
  details: string;
  success: boolean;
  error: string;
  timestamp: number;
}

interface AuditSummary {
  period_hours: number;
  total_entries: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  by_action: Record<string, number>;
  by_resource: Record<string, number>;
  active_users: number;
  top_actions: Array<[string, number]>;
}

interface Anomaly {
  type: string;
  message: string;
  severity: string;
  count?: number;
  user_id?: string;
}

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-logs-page">
      <div class="page-header">
        <h1>📋 审计日志</h1>
        <div class="header-actions">
          <button (click)="loadData()" class="btn-refresh" [disabled]="isLoading()">
            {{ isLoading() ? '加载中...' : '🔄 刷新' }}
          </button>
          <button (click)="exportLogs()" class="btn-export">
            📥 导出
          </button>
        </div>
      </div>

      <!-- 统计摘要 -->
      <div class="summary-section">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-value">{{ summary()?.total_entries || 0 }}</div>
            <div class="card-label">总操作数</div>
          </div>
          <div class="summary-card success">
            <div class="card-value">{{ summary()?.success_count || 0 }}</div>
            <div class="card-label">成功操作</div>
          </div>
          <div class="summary-card danger">
            <div class="card-value">{{ summary()?.failure_count || 0 }}</div>
            <div class="card-label">失败操作</div>
          </div>
          <div class="summary-card">
            <div class="card-value">{{ summary()?.active_users || 0 }}</div>
            <div class="card-label">活跃用户</div>
          </div>
        </div>

        <!-- 异常检测 -->
        @if (anomalies().length > 0) {
          <div class="anomalies-banner">
            <div class="anomaly-icon">⚠️</div>
            <div class="anomaly-content">
              <strong>检测到异常操作模式</strong>
              <ul>
                @for (anomaly of anomalies(); track anomaly.type) {
                  <li [class]="anomaly.severity">{{ anomaly.message }}</li>
                }
              </ul>
            </div>
          </div>
        }
      </div>

      <!-- 筛选器 -->
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-group">
            <label>操作类型</label>
            <select [(ngModel)]="filterAction" (change)="applyFilter()">
              <option value="">全部操作</option>
              <optgroup label="API 操作">
                <option value="api.add">添加 API</option>
                <option value="api.remove">移除 API</option>
                <option value="api.enable">启用 API</option>
                <option value="api.disable">禁用 API</option>
              </optgroup>
              <optgroup label="账号操作">
                <option value="account.login">账号登录</option>
                <option value="account.add">添加账号</option>
                <option value="account.remove">移除账号</option>
              </optgroup>
              <optgroup label="告警操作">
                <option value="alert.resolve">解决告警</option>
                <option value="alert.clear">清除告警</option>
              </optgroup>
              <optgroup label="系统操作">
                <option value="system.config">系统配置</option>
                <option value="user.login">用户登录</option>
              </optgroup>
            </select>
          </div>

          <div class="filter-group">
            <label>资源类型</label>
            <select [(ngModel)]="filterResource" (change)="applyFilter()">
              <option value="">全部资源</option>
              <option value="api">API</option>
              <option value="account">账号</option>
              <option value="alert">告警</option>
              <option value="user">用户</option>
              <option value="system">系统</option>
            </select>
          </div>

          <div class="filter-group">
            <label>状态</label>
            <select [(ngModel)]="filterStatus" (change)="applyFilter()">
              <option value="">全部</option>
              <option value="success">成功</option>
              <option value="failure">失败</option>
            </select>
          </div>

          <div class="filter-group">
            <label>时间范围</label>
            <select [(ngModel)]="filterTime" (change)="applyFilter()">
              <option value="1h">最近1小时</option>
              <option value="24h">最近24小时</option>
              <option value="7d">最近7天</option>
              <option value="30d">最近30天</option>
            </select>
          </div>

          <div class="filter-group search">
            <label>搜索</label>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              (input)="onSearch()"
              placeholder="搜索资源ID、用户...">
          </div>
        </div>
      </div>

      <!-- 日志列表 -->
      <div class="logs-section">
        @if (filteredLogs().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>暂无日志</h3>
            <p>没有符合条件的审计日志</p>
          </div>
        } @else {
          <div class="logs-table-container">
            <table class="logs-table">
              <thead>
                <tr>
                  <th class="col-time">时间</th>
                  <th class="col-action">操作</th>
                  <th class="col-resource">资源</th>
                  <th class="col-user">操作者</th>
                  <th class="col-ip">IP 地址</th>
                  <th class="col-status">状态</th>
                  <th class="col-details">详情</th>
                </tr>
              </thead>
              <tbody>
                @for (log of filteredLogs(); track log.id) {
                  <tr [class.failure]="!log.success">
                    <td class="col-time">{{ formatTime(log.timestamp) }}</td>
                    <td class="col-action">
                      <span class="action-badge" [class]="getActionClass(log.action)">
                        {{ getActionIcon(log.action) }} {{ formatAction(log.action) }}
                      </span>
                    </td>
                    <td class="col-resource">
                      <span class="resource-type">{{ log.resource_type }}</span>
                      @if (log.resource_id) {
                        <span class="resource-id">{{ log.resource_id | slice:0:12 }}...</span>
                      }
                    </td>
                    <td class="col-user">
                      {{ log.user_name || log.user_id || 'System' }}
                    </td>
                    <td class="col-ip">
                      <code>{{ log.ip_address || '-' }}</code>
                    </td>
                    <td class="col-status">
                      @if (log.success) {
                        <span class="status-badge success">✓ 成功</span>
                      } @else {
                        <span class="status-badge failure">✗ 失败</span>
                      }
                    </td>
                    <td class="col-details">
                      <button class="btn-details" (click)="showDetails(log)">
                        查看
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- 分页 -->
          <div class="pagination">
            <span class="page-info">
              显示 {{ filteredLogs().length }} 条记录
            </span>
            <button 
              (click)="loadMore()" 
              class="btn-load-more"
              [disabled]="!hasMore()">
              加载更多
            </button>
          </div>
        }
      </div>

      <!-- 详情弹窗 -->
      @if (selectedLog()) {
        <div class="modal-overlay" (click)="closeDetails()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>操作详情</h3>
              <button class="modal-close" (click)="closeDetails()">×</button>
            </div>
            <div class="modal-body">
              <div class="detail-row">
                <label>操作类型</label>
                <span class="action-badge" [class]="getActionClass(selectedLog()!.action)">
                  {{ formatAction(selectedLog()!.action) }}
                </span>
              </div>
              <div class="detail-row">
                <label>时间</label>
                <span>{{ formatFullTime(selectedLog()!.timestamp) }}</span>
              </div>
              <div class="detail-row">
                <label>资源</label>
                <span>{{ selectedLog()!.resource_type }} / {{ selectedLog()!.resource_id || '-' }}</span>
              </div>
              <div class="detail-row">
                <label>操作者</label>
                <span>{{ selectedLog()!.user_name || selectedLog()!.user_id || 'System' }}</span>
              </div>
              <div class="detail-row">
                <label>IP 地址</label>
                <code>{{ selectedLog()!.ip_address || '-' }}</code>
              </div>
              <div class="detail-row">
                <label>状态</label>
                <span [class]="selectedLog()!.success ? 'success' : 'failure'">
                  {{ selectedLog()!.success ? '成功' : '失败' }}
                </span>
              </div>
              @if (selectedLog()!.error) {
                <div class="detail-row">
                  <label>错误信息</label>
                  <span class="error-text">{{ selectedLog()!.error }}</span>
                </div>
              }
              @if (selectedLog()!.details) {
                <div class="detail-row">
                  <label>操作描述</label>
                  <span>{{ selectedLog()!.details }}</span>
                </div>
              }
              @if (selectedLog()!.old_value || selectedLog()!.new_value) {
                <div class="detail-row full">
                  <label>变更内容</label>
                  <div class="change-diff">
                    @if (selectedLog()!.old_value) {
                      <div class="diff-old">
                        <strong>变更前:</strong>
                        <pre>{{ formatValue(selectedLog()!.old_value) }}</pre>
                      </div>
                    }
                    @if (selectedLog()!.new_value) {
                      <div class="diff-new">
                        <strong>变更后:</strong>
                        <pre>{{ formatValue(selectedLog()!.new_value) }}</pre>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .audit-logs-page {
      padding: 1.5rem;
      max-width: 1400px;
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

    .btn-refresh, .btn-export {
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

    .btn-export {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    /* 统计摘要 */
    .summary-section {
      margin-bottom: 1.5rem;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .summary-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 0.75rem;
      padding: 1rem;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .summary-card.success {
      border-color: rgba(34, 197, 94, 0.3);
    }

    .summary-card.danger {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .card-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .card-label {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    /* 异常检测 */
    .anomalies-banner {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 0.5rem;
    }

    .anomaly-icon {
      font-size: 1.5rem;
    }

    .anomaly-content strong {
      color: #fcd34d;
    }

    .anomaly-content ul {
      margin: 0.5rem 0 0 0;
      padding-left: 1.25rem;
    }

    .anomaly-content li {
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .anomaly-content li.critical {
      color: #f87171;
    }

    /* 筛选器 */
    .filter-section {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .filter-row {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .filter-group.search {
      flex: 1;
      min-width: 200px;
    }

    .filter-group label {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .filter-group select, .filter-group input {
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.375rem;
      color: #f1f5f9;
      font-size: 0.875rem;
      min-width: 140px;
    }

    .filter-group input {
      min-width: 200px;
    }

    /* 日志表格 */
    .logs-table-container {
      overflow-x: auto;
    }

    .logs-table {
      width: 100%;
      border-collapse: collapse;
    }

    .logs-table th, .logs-table td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .logs-table th {
      font-size: 0.75rem;
      font-weight: 500;
      color: #9ca3af;
      text-transform: uppercase;
      background: rgba(30, 41, 59, 0.5);
    }

    .logs-table td {
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .logs-table tr:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .logs-table tr.failure {
      background: rgba(239, 68, 68, 0.05);
    }

    .col-time { width: 140px; }
    .col-action { width: 160px; }
    .col-resource { width: 180px; }
    .col-user { width: 120px; }
    .col-ip { width: 120px; }
    .col-status { width: 80px; }
    .col-details { width: 60px; }

    /* 徽章 */
    .action-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .action-badge.api {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .action-badge.account {
      background: rgba(168, 85, 247, 0.2);
      color: #c4b5fd;
    }

    .action-badge.alert {
      background: rgba(245, 158, 11, 0.2);
      color: #fcd34d;
    }

    .action-badge.system {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
    }

    .action-badge.user {
      background: rgba(236, 72, 153, 0.2);
      color: #f9a8d4;
    }

    .resource-type {
      font-size: 0.7rem;
      padding: 0.125rem 0.375rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 0.25rem;
      margin-right: 0.375rem;
    }

    .resource-id {
      font-family: monospace;
      font-size: 0.8rem;
      color: #9ca3af;
    }

    .status-badge {
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.success { color: #4ade80; }
    .status-badge.failure { color: #f87171; }

    .btn-details {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #9ca3af;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-details:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
    }

    /* 分页 */
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 0;
    }

    .page-info {
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .btn-load-more {
      padding: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #d1d5db;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    .btn-load-more:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }

    .btn-load-more:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

    /* 模态框 */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .modal-content {
      background: #1e293b;
      border-radius: 1rem;
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.125rem;
      color: #f1f5f9;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #9ca3af;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .detail-row {
      display: flex;
      margin-bottom: 1rem;
    }

    .detail-row.full {
      flex-direction: column;
    }

    .detail-row label {
      width: 100px;
      flex-shrink: 0;
      font-size: 0.875rem;
      color: #9ca3af;
    }

    .detail-row span, .detail-row code {
      font-size: 0.875rem;
      color: #f1f5f9;
    }

    .detail-row .success { color: #4ade80; }
    .detail-row .failure { color: #f87171; }
    .error-text { color: #f87171; }

    .change-diff {
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .diff-old, .diff-new {
      padding: 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.8rem;
    }

    .diff-old {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
    }

    .diff-new {
      background: rgba(34, 197, 94, 0.1);
      border-left: 3px solid #22c55e;
    }

    .diff-old pre, .diff-new pre {
      margin: 0.25rem 0 0 0;
      font-size: 0.75rem;
      color: #d1d5db;
      white-space: pre-wrap;
    }

    @media (max-width: 768px) {
      .summary-cards {
        grid-template-columns: repeat(2, 1fr);
      }

      .filter-row {
        flex-direction: column;
      }

      .filter-group {
        width: 100%;
      }
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);

  // 状态
  isLoading = signal(false);
  logs = signal<AuditLog[]>([]);
  filteredLogs = signal<AuditLog[]>([]);
  summary = signal<AuditSummary | null>(null);
  anomalies = signal<Anomaly[]>([]);
  selectedLog = signal<AuditLog | null>(null);
  hasMore = signal(true);

  // 筛选
  filterAction = '';
  filterResource = '';
  filterStatus = '';
  filterTime = '24h';
  searchQuery = '';

  // 分页
  private pageSize = 50;
  private currentOffset = 0;

  ngOnInit(): void {
    this.loadData();
  }

  t(key: string): string {
    return this.i18n.t(key);
  }

  async loadData(): Promise<void> {
    if (this.isLoading()) return;

    this.isLoading.set(true);
    this.currentOffset = 0;

    try {
      const result = await this.ipcService.send('audit:get', {
        action: this.filterAction || undefined,
        resource_type: this.filterResource || undefined,
        success: this.filterStatus === 'success' ? true : 
                 this.filterStatus === 'failure' ? false : undefined,
        time_range: this.filterTime,
        limit: this.pageSize
      });

      if (result?.success) {
        this.logs.set(result.data?.logs || []);
        this.summary.set(result.data?.summary || null);
        this.anomalies.set(result.data?.anomalies || []);
        this.applyFilter();
        this.hasMore.set((result.data?.logs?.length || 0) >= this.pageSize);
      }
    } catch (e) {
      console.error('Load audit logs failed:', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore(): Promise<void> {
    this.currentOffset += this.pageSize;

    try {
      const result = await this.ipcService.send('audit:get', {
        action: this.filterAction || undefined,
        resource_type: this.filterResource || undefined,
        time_range: this.filterTime,
        limit: this.pageSize,
        offset: this.currentOffset
      });

      if (result?.success && result.data?.logs) {
        const newLogs = result.data.logs;
        this.logs.set([...this.logs(), ...newLogs]);
        this.applyFilter();
        this.hasMore.set(newLogs.length >= this.pageSize);
      }
    } catch (e) {
      console.error('Load more failed:', e);
    }
  }

  applyFilter(): void {
    let filtered = this.logs();

    // 搜索
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.resource_id?.toLowerCase().includes(query) ||
        log.user_id?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query)
      );
    }

    this.filteredLogs.set(filtered);
  }

  onSearch(): void {
    this.applyFilter();
  }

  showDetails(log: AuditLog): void {
    this.selectedLog.set(log);
  }

  closeDetails(): void {
    this.selectedLog.set(null);
  }

  async exportLogs(): Promise<void> {
    try {
      const data = this.filteredLogs().map(log => ({
        time: new Date(log.timestamp * 1000).toISOString(),
        action: log.action,
        resource: `${log.resource_type}/${log.resource_id}`,
        user: log.user_name || log.user_id,
        ip: log.ip_address,
        status: log.success ? 'Success' : 'Failed',
        details: log.details
      }));

      const csv = this.generateCSV(data);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.toast.show({ message: '导出成功', type: 'success' });
    } catch (e) {
      console.error('Export failed:', e);
      this.toast.show({ message: '导出失败', type: 'error' });
    }
  }

  private generateCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
      headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  // 格式化方法
  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatFullTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
  }

  formatAction(action: string): string {
    const actions: Record<string, string> = {
      'api.add': '添加 API',
      'api.remove': '移除 API',
      'api.enable': '启用 API',
      'api.disable': '禁用 API',
      'account.login': '账号登录',
      'account.add': '添加账号',
      'account.remove': '移除账号',
      'alert.resolve': '解决告警',
      'alert.clear': '清除告警',
      'system.config': '系统配置',
      'user.login': '用户登录',
      'user.create': '创建用户',
      'data.export': '数据导出'
    };
    return actions[action] || action;
  }

  getActionIcon(action: string): string {
    if (action.startsWith('api')) return '🔌';
    if (action.startsWith('account')) return '👤';
    if (action.startsWith('alert')) return '🔔';
    if (action.startsWith('system')) return '⚙️';
    if (action.startsWith('user')) return '👥';
    if (action.startsWith('data')) return '📊';
    return '📋';
  }

  getActionClass(action: string): string {
    if (action.startsWith('api')) return 'api';
    if (action.startsWith('account')) return 'account';
    if (action.startsWith('alert')) return 'alert';
    if (action.startsWith('system')) return 'system';
    if (action.startsWith('user')) return 'user';
    return '';
  }

  formatValue(value: any): string {
    if (!value) return '-';
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  }
}
