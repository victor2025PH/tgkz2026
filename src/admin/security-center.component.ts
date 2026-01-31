/**
 * 安全中心組件
 * 
 * 優化設計：
 * 1. 安全告警管理
 * 2. IP 規則管理
 * 3. 登入歷史查看
 */

import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, SecurityAlert, SecurityOverview } from './admin.service';
import { I18nService } from '../i18n.service';

interface IpRule {
  id: string;
  ip_pattern: string;
  rule_type: 'whitelist' | 'blacklist';
  description: string;
  created_at: string;
  expires_at?: string;
}

interface LoginHistory {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

@Component({
  selector: 'app-security-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="security-center">
      <!-- 頂部概覽 -->
      <div class="security-header">
        <h1>{{ t('admin.securityCenter') }}</h1>
        <div class="overview-cards">
          <div class="overview-card" [class.alert]="overview()?.unresolved_alerts">
            <div class="overview-value">{{ overview()?.unresolved_alerts || 0 }}</div>
            <div class="overview-label">{{ t('admin.unresolvedAlerts') }}</div>
          </div>
          <div class="overview-card">
            <div class="overview-value">{{ overview()?.locked_accounts || 0 }}</div>
            <div class="overview-label">{{ t('admin.lockedAccounts') }}</div>
          </div>
          <div class="overview-card">
            <div class="overview-value">{{ overview()?.failed_logins_today || 0 }}</div>
            <div class="overview-label">{{ t('admin.failedLoginsToday') }}</div>
          </div>
          <div class="overview-card">
            <div class="overview-value">{{ overview()?.active_ip_rules || 0 }}</div>
            <div class="overview-label">{{ t('admin.activeIpRules') }}</div>
          </div>
        </div>
      </div>
      
      <!-- 標籤頁切換 -->
      <div class="tab-bar">
        <button 
          *ngFor="let tab of tabs" 
          [class.active]="activeTab() === tab.id"
          (click)="switchTab(tab.id)">
          {{ tab.label }}
        </button>
      </div>
      
      <!-- 安全告警 -->
      <div class="tab-content" *ngIf="activeTab() === 'alerts'">
        <div class="content-header">
          <h2>{{ t('admin.securityAlerts') }}</h2>
          <div class="filter-bar">
            <label>
              <input 
                type="checkbox" 
                [(ngModel)]="showResolved"
                (change)="loadAlerts()">
              {{ t('admin.showResolved') }}
            </label>
          </div>
        </div>
        
        <div class="alerts-list" *ngIf="alerts().length; else noAlerts">
          <div 
            *ngFor="let alert of alerts()" 
            class="alert-item"
            [class]="alert.severity"
            [class.resolved]="alert.resolved">
            <div class="alert-icon">
              {{ getSeverityIcon(alert.severity) }}
            </div>
            <div class="alert-content">
              <div class="alert-header">
                <span class="alert-type">{{ alert.alert_type }}</span>
                <span class="alert-time">{{ formatDate(alert.created_at) }}</span>
              </div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-meta">
                <span *ngIf="alert.ip_address">IP: {{ alert.ip_address }}</span>
                <span>User: {{ alert.user_id }}</span>
              </div>
            </div>
            <div class="alert-actions" *ngIf="!alert.resolved">
              <button class="btn-resolve" (click)="resolveAlert(alert.id)">
                {{ t('admin.resolve') }}
              </button>
            </div>
            <div class="resolved-badge" *ngIf="alert.resolved">
              ✓ {{ t('admin.resolved') }}
            </div>
          </div>
        </div>
        
        <ng-template #noAlerts>
          <div class="empty-state">
            <span class="empty-icon">✓</span>
            <span class="empty-text">{{ t('admin.noAlerts') }}</span>
          </div>
        </ng-template>
      </div>
      
      <!-- IP 規則 -->
      <div class="tab-content" *ngIf="activeTab() === 'ip-rules'">
        <div class="content-header">
          <h2>{{ t('admin.ipRules') }}</h2>
          <button class="btn-add" (click)="showAddIpRule = true">
            + {{ t('admin.addRule') }}
          </button>
        </div>
        
        <!-- 添加規則表單 -->
        <div class="add-rule-form" *ngIf="showAddIpRule">
          <div class="form-group">
            <label>IP {{ t('admin.orCidr') }}</label>
            <input type="text" [(ngModel)]="newRule.ip_pattern" placeholder="192.168.1.1 或 192.168.1.0/24">
          </div>
          <div class="form-group">
            <label>{{ t('admin.ruleType') }}</label>
            <select [(ngModel)]="newRule.rule_type">
              <option value="whitelist">{{ t('admin.whitelist') }}</option>
              <option value="blacklist">{{ t('admin.blacklist') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('admin.description') }}</label>
            <input type="text" [(ngModel)]="newRule.description">
          </div>
          <div class="form-actions">
            <button class="btn-cancel" (click)="showAddIpRule = false">{{ t('common.cancel') }}</button>
            <button class="btn-save" (click)="addIpRule()">{{ t('common.save') }}</button>
          </div>
        </div>
        
        <div class="rules-list" *ngIf="ipRules().length; else noRules">
          <table class="data-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>{{ t('admin.type') }}</th>
                <th>{{ t('admin.description') }}</th>
                <th>{{ t('admin.createdAt') }}</th>
                <th>{{ t('admin.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let rule of ipRules()" [class]="rule.rule_type">
                <td class="ip-cell">{{ rule.ip_pattern }}</td>
                <td>
                  <span class="rule-badge" [class]="rule.rule_type">
                    {{ rule.rule_type === 'whitelist' ? '✓' : '✗' }} 
                    {{ rule.rule_type }}
                  </span>
                </td>
                <td>{{ rule.description }}</td>
                <td>{{ formatDate(rule.created_at) }}</td>
                <td>
                  <button class="btn-delete" (click)="deleteIpRule(rule.id)">
                    {{ t('common.delete') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <ng-template #noRules>
          <div class="empty-state">
            <span class="empty-icon">🔓</span>
            <span class="empty-text">{{ t('admin.noIpRules') }}</span>
          </div>
        </ng-template>
      </div>
      
      <!-- 登入歷史 -->
      <div class="tab-content" *ngIf="activeTab() === 'login-history'">
        <div class="content-header">
          <h2>{{ t('admin.loginHistory') }}</h2>
          <div class="filter-bar">
            <input 
              type="text" 
              [(ngModel)]="searchUserId" 
              placeholder="User ID"
              (keyup.enter)="loadLoginHistory()">
            <button class="btn-search" (click)="loadLoginHistory()">
              {{ t('common.search') }}
            </button>
          </div>
        </div>
        
        <div class="history-list" *ngIf="loginHistory().length; else noHistory">
          <table class="data-table">
            <thead>
              <tr>
                <th>{{ t('admin.user') }}</th>
                <th>IP</th>
                <th>{{ t('admin.status') }}</th>
                <th>{{ t('admin.time') }}</th>
                <th>{{ t('admin.userAgent') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of loginHistory()" [class.failed]="!log.success">
                <td>{{ log.user_id }}</td>
                <td>{{ log.ip_address }}</td>
                <td>
                  <span class="status-badge" [class.success]="log.success" [class.failed]="!log.success">
                    {{ log.success ? '✓' : '✗' }}
                    {{ log.success ? t('admin.success') : log.failure_reason || t('admin.failed') }}
                  </span>
                </td>
                <td>{{ formatDate(log.created_at) }}</td>
                <td class="ua-cell" [title]="log.user_agent">
                  {{ truncate(log.user_agent, 30) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <ng-template #noHistory>
          <div class="empty-state">
            <span class="empty-icon">📋</span>
            <span class="empty-text">{{ t('admin.noLoginHistory') }}</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .security-center {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .security-header h1 {
      margin: 0 0 20px 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .overview-card {
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-align: center;
    }
    
    .overview-card.alert {
      background: #fff3e0;
      border: 1px solid #ffcc80;
    }
    
    .overview-value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }
    
    .overview-label {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    
    /* 標籤頁 */
    .tab-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 24px;
      border-bottom: 1px solid #eee;
    }
    
    .tab-bar button {
      padding: 12px 20px;
      border: none;
      background: none;
      font-size: 14px;
      color: #666;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
    }
    
    .tab-bar button:hover {
      color: #333;
    }
    
    .tab-bar button.active {
      color: #1976d2;
      border-bottom-color: #1976d2;
      font-weight: 500;
    }
    
    /* 內容區 */
    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .content-header h2 {
      margin: 0;
      font-size: 18px;
    }
    
    .filter-bar {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    
    .filter-bar input[type="text"] {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      width: 200px;
    }
    
    .btn-add, .btn-search {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .btn-add:hover, .btn-search:hover {
      background: #1565c0;
    }
    
    /* 告警列表 */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .alert-item {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: white;
      border-radius: 8px;
      border-left: 4px solid #999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    .alert-item.critical { border-left-color: #c62828; }
    .alert-item.high { border-left-color: #ef6c00; }
    .alert-item.medium { border-left-color: #f9a825; }
    .alert-item.low { border-left-color: #2e7d32; }
    .alert-item.resolved { opacity: 0.6; }
    
    .alert-icon {
      font-size: 24px;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    
    .alert-type {
      font-weight: 600;
      text-transform: capitalize;
    }
    
    .alert-time {
      font-size: 12px;
      color: #666;
    }
    
    .alert-message {
      color: #333;
      margin-bottom: 8px;
    }
    
    .alert-meta {
      font-size: 12px;
      color: #666;
      display: flex;
      gap: 16px;
    }
    
    .btn-resolve {
      padding: 6px 12px;
      background: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .resolved-badge {
      color: #4caf50;
      font-size: 14px;
    }
    
    /* 添加規則表單 */
    .add-rule-form {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
    }
    
    .form-group input, .form-group select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
    }
    
    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    
    .btn-cancel {
      padding: 8px 16px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .btn-save {
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    
    /* 數據表格 */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    
    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    .data-table th {
      background: #f5f5f5;
      font-weight: 600;
      font-size: 13px;
      color: #666;
    }
    
    .data-table tr:last-child td {
      border-bottom: none;
    }
    
    .data-table tr.failed {
      background: #ffebee;
    }
    
    .ip-cell {
      font-family: monospace;
    }
    
    .ua-cell {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .rule-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .rule-badge.whitelist {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .rule-badge.blacklist {
      background: #ffebee;
      color: #c62828;
    }
    
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }
    
    .status-badge.success {
      background: #e8f5e9;
      color: #2e7d32;
    }
    
    .status-badge.failed {
      background: #ffebee;
      color: #c62828;
    }
    
    .btn-delete {
      padding: 4px 8px;
      background: #ffebee;
      color: #c62828;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .btn-delete:hover {
      background: #ffcdd2;
    }
    
    /* 空狀態 */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 20px;
      background: white;
      border-radius: 8px;
      color: #666;
    }
    
    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    
    .empty-text {
      font-size: 16px;
    }
  `]
})
export class SecurityCenterComponent implements OnInit {
  readonly tabs = [
    { id: 'alerts', label: '安全告警' },
    { id: 'ip-rules', label: 'IP 規則' },
    { id: 'login-history', label: '登入歷史' }
  ];
  
  activeTab = signal<string>('alerts');
  overview = signal<SecurityOverview | null>(null);
  alerts = signal<SecurityAlert[]>([]);
  ipRules = signal<IpRule[]>([]);
  loginHistory = signal<LoginHistory[]>([]);
  
  showResolved = false;
  showAddIpRule = false;
  searchUserId = '';
  
  newRule = {
    ip_pattern: '',
    rule_type: 'blacklist' as 'whitelist' | 'blacklist',
    description: ''
  };
  
  constructor(
    private adminService: AdminService,
    private i18n: I18nService
  ) {}
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    this.loadOverview();
    this.loadAlerts();
  }
  
  async loadOverview() {
    const data = await this.adminService.fetchSecurityOverview();
    this.overview.set(data);
  }
  
  async loadAlerts() {
    const result = await this.adminService.getSecurityAlerts(1, this.showResolved ? undefined : false);
    this.alerts.set(result.items);
  }
  
  async loadIpRules() {
    // 實現 IP 規則加載
  }
  
  async loadLoginHistory() {
    // 實現登入歷史加載
  }
  
  switchTab(tabId: string) {
    this.activeTab.set(tabId);
    
    if (tabId === 'alerts') this.loadAlerts();
    else if (tabId === 'ip-rules') this.loadIpRules();
    else if (tabId === 'login-history') this.loadLoginHistory();
  }
  
  async resolveAlert(alertId: string) {
    const success = await this.adminService.resolveAlert(alertId);
    if (success) {
      this.loadAlerts();
      this.loadOverview();
    }
  }
  
  async addIpRule() {
    // 實現添加 IP 規則
    this.showAddIpRule = false;
    this.newRule = { ip_pattern: '', rule_type: 'blacklist', description: '' };
    this.loadIpRules();
  }
  
  async deleteIpRule(ruleId: string) {
    // 實現刪除 IP 規則
    this.loadIpRules();
  }
  
  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }
  
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }
  
  truncate(str: string, len: number): string {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '...' : str;
  }
}
