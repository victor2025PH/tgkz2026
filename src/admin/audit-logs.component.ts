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
import { AdminService, OperationAuditLog } from './admin.service';
import { ToastService } from '../toast.service';
import { I18nService } from '../i18n.service';

/**
 * 🔧 對接後端 core/audit_service.py（/api/v1/admin/audit/logs）後的真實欄位。
 * 後端只回傳 {id, action, category, user_id, details, timestamp}，
 * 以下 resource_id / user_name / ip_address / old_value / new_value / success / error
 * 目前後端不提供，保留欄位是為了盡量不更動既有模板結構，
 * 載入時一律填入安全預設值，且模板已移除會誤導的狀態顯示（見 loadData/mapLogs 註釋）。
 */
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

/** 🔧 後端 /api/v1/admin/audit/stats 缺少 get_stats() 實作（呼叫必錯），
 * 這裡改為前端依實際載入的日誌批次自行統計，欄位也對應調整 */
interface AuditSummary {
  total_entries: number;
  active_users: number;
  category_count: number;
  top_action: string;
  top_action_count: number;
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
          <div class="summary-card">
            <div class="card-value">{{ summary()?.active_users || 0 }}</div>
            <div class="card-label">活跃用户</div>
          </div>
          <div class="summary-card">
            <div class="card-value">{{ summary()?.category_count || 0 }}</div>
            <div class="card-label">涉及分类数</div>
          </div>
          <div class="summary-card">
            <div class="card-value">{{ summary()?.top_action_count || 0 }}</div>
            <div class="card-label">{{ summary()?.top_action ? formatAction(summary()!.top_action) : '最常见操作' }}</div>
          </div>
        </div>

        <!-- 异常检测：后端暂未提供异常操作侦测的 REST API，先做优雅降级提示 -->
        <div class="anomalies-banner dev-notice">
          <div class="anomaly-icon">🚧</div>
          <div class="anomaly-content">
            <strong>异常操作侦测功能开发中</strong>
            <p class="dev-notice-desc">后端尚未提供对应的异常侦测 API，此区块将于后端支援后启用。</p>
          </div>
        </div>
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
                  <th class="col-details">详情</th>
                </tr>
              </thead>
              <tbody>
                @for (log of filteredLogs(); track log.id) {
                  <tr>
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

    /* 🚧 功能开发中提示（异常侦测暂无后端支援） */
    .anomalies-banner.dev-notice {
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
    }

    .anomalies-banner.dev-notice .anomaly-content strong {
      color: #93c5fd;
    }

    .dev-notice-desc {
      margin: 0.375rem 0 0 0;
      font-size: 0.8rem;
      color: #9ca3af;
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
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);

  // 状态
  isLoading = signal(false);
  logs = signal<AuditLog[]>([]);
  filteredLogs = signal<AuditLog[]>([]);
  summary = signal<AuditSummary | null>(null);
  selectedLog = signal<AuditLog | null>(null);
  hasMore = signal(true);

  // 筛选（操作类型/资源分类/时间范围/搜索皆由前端在拿到日志批次后处理，
  // 因为后端 /api/v1/admin/audit/logs 目前不支援这些筛选参数）
  filterAction = '';
  filterResource = '';
  filterTime = '24h';
  searchQuery = '';

  // 分页（后端 offset/limit 参数可正常使用）
  private pageSize = 100;
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
      const result = await this.adminService.getOperationAuditLogs(this.pageSize, 0);

      if (result.success) {
        const mapped = this.mapLogs(result.data);
        this.logs.set(mapped);
        this.summary.set(this.computeSummary(mapped));
        this.applyFilter();
        this.hasMore.set(mapped.length >= this.pageSize);
      } else if (result.error) {
        console.error('Load audit logs failed:', result.error);
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
      const result = await this.adminService.getOperationAuditLogs(this.pageSize, this.currentOffset);

      if (result.success) {
        const newLogs = this.mapLogs(result.data);
        const combined = [...this.logs(), ...newLogs];
        this.logs.set(combined);
        this.summary.set(this.computeSummary(combined));
        this.applyFilter();
        this.hasMore.set(newLogs.length >= this.pageSize);
      }
    } catch (e) {
      console.error('Load more failed:', e);
    }
  }

  /**
   * 将后端 core.audit_service 回传的原始记录（{id, action, category, user_id,
   * details, timestamp}）映射成组件用的 AuditLog；resource_id/user_name/
   * ip_address/old_value/new_value/error 后端未提供，填入安全预设值，
   * success 固定为 true（模板已移除会误导的成功/失败显示，不受此值影响）。
   */
  private mapLogs(raw: OperationAuditLog[] | any[]): AuditLog[] {
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((r: any) => ({
      id: String(r?.id ?? ''),
      action: r?.action || '',
      resource_type: r?.category || '',
      resource_id: '',
      user_id: r?.user_id || '',
      user_name: r?.user_id || '',
      ip_address: '',
      old_value: null,
      new_value: null,
      details: r?.details || '',
      success: true,
      error: '',
      timestamp: this.normalizeTimestamp(r?.timestamp)
    }));
  }

  private normalizeTimestamp(value: any): number {
    const parsed = Number(value);
    return isNaN(parsed) || parsed <= 0 ? Date.now() / 1000 : parsed;
  }

  /** 前端依当前已载入的日志批次统计摘要（后端 /audit/stats 端点无法使用，见文件顶部注释） */
  private computeSummary(logs: AuditLog[]): AuditSummary {
    const categories = new Set<string>();
    const users = new Set<string>();
    const actionCounts: Record<string, number> = {};

    for (const log of logs) {
      if (log.resource_type) categories.add(log.resource_type);
      if (log.user_id) users.add(log.user_id);
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    const top = Object.entries(actionCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      total_entries: logs.length,
      active_users: users.size,
      category_count: categories.size,
      top_action: top ? top[0] : '',
      top_action_count: top ? top[1] : 0
    };
  }

  applyFilter(): void {
    let filtered = this.logs();

    if (this.filterAction) {
      filtered = filtered.filter(log => log.action === this.filterAction);
    }

    if (this.filterResource) {
      filtered = filtered.filter(log => log.resource_type === this.filterResource);
    }

    const cutoff = this.getTimeCutoff(this.filterTime);
    if (cutoff !== null) {
      filtered = filtered.filter(log => log.timestamp >= cutoff);
    }

    // 搜索
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_id?.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query)
      );
    }

    this.filteredLogs.set(filtered);
  }

  private getTimeCutoff(range: string): number | null {
    const now = Date.now() / 1000;
    switch (range) {
      case '1h': return now - 3600;
      case '24h': return now - 86400;
      case '7d': return now - 7 * 86400;
      case '30d': return now - 30 * 86400;
      default: return null;
    }
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
        category: log.resource_type,
        user: log.user_name || log.user_id,
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
      this.toast.success('导出成功');
    } catch (e) {
      console.error('Export failed:', e);
      this.toast.error('导出失败');
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
