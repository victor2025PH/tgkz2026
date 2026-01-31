/**
 * 審計日誌組件
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AuditLog } from './admin.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-logs">
      <div class="page-header">
        <h1>{{ t('admin.auditLogs') }}</h1>
        <div class="filter-bar">
          <select [(ngModel)]="filterAction" (change)="loadLogs()">
            <option value="">{{ t('admin.allActions') }}</option>
            <option value="suspend_user">{{ t('admin.suspendUser') }}</option>
            <option value="update_user">{{ t('admin.updateUser') }}</option>
            <option value="delete_user">{{ t('admin.deleteUser') }}</option>
            <option value="update_config">{{ t('admin.updateConfig') }}</option>
          </select>
          <button class="btn-refresh" (click)="loadLogs()">
            {{ t('common.refresh') }}
          </button>
        </div>
      </div>
      
      <div class="logs-container">
        <table class="logs-table" *ngIf="logs().length; else noLogs">
          <thead>
            <tr>
              <th>{{ t('admin.time') }}</th>
              <th>{{ t('admin.admin') }}</th>
              <th>{{ t('admin.action') }}</th>
              <th>{{ t('admin.targetUser') }}</th>
              <th>{{ t('admin.reason') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of logs()">
              <td class="time-cell">{{ formatDate(log.created_at) }}</td>
              <td>{{ log.admin_id || '-' }}</td>
              <td>
                <span class="action-badge" [class]="getActionClass(log.action)">
                  {{ log.action }}
                </span>
              </td>
              <td>{{ log.target_user || '-' }}</td>
              <td class="reason-cell">{{ log.reason || '-' }}</td>
            </tr>
          </tbody>
        </table>
        
        <ng-template #noLogs>
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <span class="empty-text">{{ t('admin.noLogs') }}</span>
          </div>
        </ng-template>
      </div>
      
      <!-- 分頁 -->
      <div class="pagination" *ngIf="totalPages() > 1">
        <button 
          [disabled]="currentPage() <= 1"
          (click)="goToPage(currentPage() - 1)">
          ← {{ t('common.prev') }}
        </button>
        <span class="page-info">
          {{ currentPage() }} / {{ totalPages() }}
        </span>
        <button 
          [disabled]="currentPage() >= totalPages()"
          (click)="goToPage(currentPage() + 1)">
          {{ t('common.next') }} →
        </button>
      </div>
    </div>
  `,
  styles: [`
    .audit-logs {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .page-header h1 {
      margin: 0;
      font-size: 24px;
    }
    
    .filter-bar {
      display: flex;
      gap: 12px;
    }
    
    .filter-bar select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    
    .btn-refresh {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .logs-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    
    .logs-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .logs-table th, .logs-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .logs-table th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 13px;
      color: #666;
    }
    
    .time-cell {
      white-space: nowrap;
      color: #666;
    }
    
    .reason-cell {
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .action-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }
    
    .action-badge.danger {
      background: #ffebee;
      color: #c62828;
    }
    
    .action-badge.warning {
      background: #fff3e0;
      color: #ef6c00;
    }
    
    .action-badge.info {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .action-badge.default {
      background: #f5f5f5;
      color: #666;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      color: #666;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-text {
      font-size: 16px;
    }
    
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
    }
    
    .pagination button {
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    }
    
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .page-info {
      color: #666;
    }
  `]
})
export class AuditLogsComponent implements OnInit {
  logs = signal<AuditLog[]>([]);
  currentPage = signal(1);
  totalPages = signal(1);
  
  filterAction = '';
  
  constructor(
    private adminService: AdminService,
    private i18n: I18nService
  ) {}
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    this.loadLogs();
  }
  
  async loadLogs() {
    const result = await this.adminService.getAuditLogs(
      this.currentPage(),
      this.filterAction || undefined
    );
    
    this.logs.set(result.items);
    this.totalPages.set(result.total_pages);
  }
  
  goToPage(page: number) {
    this.currentPage.set(page);
    this.loadLogs();
  }
  
  getActionClass(action: string): string {
    if (action.includes('delete') || action.includes('suspend')) return 'danger';
    if (action.includes('update')) return 'warning';
    if (action.includes('create')) return 'info';
    return 'default';
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString();
  }
}
