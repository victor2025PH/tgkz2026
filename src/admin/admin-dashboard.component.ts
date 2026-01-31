/**
 * 管理員儀表板組件
 * 
 * 優化設計：
 * 1. 響應式統計卡片
 * 2. 圖表可視化
 * 3. 即時數據刷新
 */

import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService, DashboardStats, SecurityOverview, UsageTrend } from './admin.service';
import { I18nService } from '../i18n.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-dashboard">
      <!-- 頂部標題 -->
      <div class="dashboard-header">
        <div class="header-left">
          <h1>{{ t('admin.dashboard') }}</h1>
          <span class="last-refresh" *ngIf="lastRefresh()">
            {{ t('admin.lastRefresh') }}: {{ formatTime(lastRefresh()) }}
          </span>
        </div>
        <div class="header-actions">
          <button class="btn-refresh" (click)="refresh()" [disabled]="isLoading()">
            <span class="icon" [class.spinning]="isLoading()">↻</span>
            {{ t('common.refresh') }}
          </button>
        </div>
      </div>
      
      <!-- 統計卡片 -->
      <div class="stats-grid">
        <!-- 用戶統計 -->
        <div class="stat-card users">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats()?.total_users || 0 }}</div>
            <div class="stat-label">{{ t('admin.totalUsers') }}</div>
            <div class="stat-sub">
              <span class="active">{{ stats()?.active_users || 0 }} {{ t('admin.active') }}</span>
              <span class="new">+{{ stats()?.new_users_today || 0 }} {{ t('admin.today') }}</span>
            </div>
          </div>
        </div>
        
        <!-- 帳號統計 -->
        <div class="stat-card accounts">
          <div class="stat-icon">📱</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats()?.total_accounts || 0 }}</div>
            <div class="stat-label">{{ t('admin.totalAccounts') }}</div>
            <div class="stat-sub">
              <span class="online">{{ stats()?.online_accounts || 0 }} {{ t('admin.online') }}</span>
            </div>
          </div>
        </div>
        
        <!-- 收入統計 -->
        <div class="stat-card revenue">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-value">\${{ formatRevenue(stats()?.revenue_month) }}</div>
            <div class="stat-label">{{ t('admin.monthlyRevenue') }}</div>
            <div class="stat-sub">
              <span class="today">{{ t('admin.today') }}: \${{ formatRevenue(stats()?.revenue_today) }}</span>
            </div>
          </div>
        </div>
        
        <!-- API 統計 -->
        <div class="stat-card api">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ formatNumber(stats()?.api_calls_today) }}</div>
            <div class="stat-label">{{ t('admin.apiCallsToday') }}</div>
          </div>
        </div>
      </div>
      
      <!-- 安全警告 -->
      <div class="security-section" *ngIf="security()?.unresolved_alerts">
        <div class="section-header">
          <h2>{{ t('admin.securityAlerts') }}</h2>
          <a routerLink="/admin/security" class="view-all">{{ t('common.viewAll') }} →</a>
        </div>
        <div class="alert-summary">
          <div class="alert-item critical" *ngIf="security()?.alerts_by_severity?.['critical']">
            <span class="alert-count">{{ security()?.alerts_by_severity?.['critical'] }}</span>
            <span class="alert-label">{{ t('admin.critical') }}</span>
          </div>
          <div class="alert-item high" *ngIf="security()?.alerts_by_severity?.['high']">
            <span class="alert-count">{{ security()?.alerts_by_severity?.['high'] }}</span>
            <span class="alert-label">{{ t('admin.high') }}</span>
          </div>
          <div class="alert-item medium" *ngIf="security()?.alerts_by_severity?.['medium']">
            <span class="alert-count">{{ security()?.alerts_by_severity?.['medium'] }}</span>
            <span class="alert-label">{{ t('admin.medium') }}</span>
          </div>
          <div class="alert-item locked" *ngIf="security()?.locked_accounts">
            <span class="alert-count">{{ security()?.locked_accounts }}</span>
            <span class="alert-label">{{ t('admin.lockedAccounts') }}</span>
          </div>
        </div>
      </div>
      
      <!-- 使用趨勢圖表 -->
      <div class="trends-section">
        <div class="section-header">
          <h2>{{ t('admin.usageTrends') }}</h2>
          <div class="period-selector">
            <button 
              *ngFor="let p of periods" 
              [class.active]="selectedPeriod() === p.days"
              (click)="changePeriod(p.days)">
              {{ p.label }}
            </button>
          </div>
        </div>
        <div class="trends-chart">
          <div class="chart-container">
            <!-- 簡單的 CSS 圖表 -->
            <div class="chart-bars">
              <div 
                *ngFor="let trend of visibleTrends(); let i = index"
                class="chart-bar"
                [style.height.%]="getBarHeight(trend.api_calls)"
                [title]="trend.date + ': ' + trend.api_calls + ' calls'">
              </div>
            </div>
            <div class="chart-labels">
              <span>{{ getFirstDate() }}</span>
              <span>{{ getLastDate() }}</span>
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color api"></span>
              <span>API {{ t('admin.calls') }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color users"></span>
              <span>{{ t('admin.activeUsers') }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 訂閱分布 -->
      <div class="tier-section">
        <div class="section-header">
          <h2>{{ t('admin.subscriptionDistribution') }}</h2>
        </div>
        <div class="tier-grid">
          <div 
            *ngFor="let tier of tierEntries()" 
            class="tier-card"
            [class]="tier.key">
            <div class="tier-count">{{ tier.value }}</div>
            <div class="tier-name">{{ tier.key | titlecase }}</div>
            <div class="tier-percent">{{ getTierPercent(tier.value) }}%</div>
          </div>
        </div>
      </div>
      
      <!-- 快速操作 -->
      <div class="quick-actions">
        <h2>{{ t('admin.quickActions') }}</h2>
        <div class="action-grid">
          <a routerLink="/admin/users" class="action-card">
            <span class="action-icon">👥</span>
            <span class="action-label">{{ t('admin.manageUsers') }}</span>
          </a>
          <a routerLink="/admin/security" class="action-card">
            <span class="action-icon">🔒</span>
            <span class="action-label">{{ t('admin.securityCenter') }}</span>
          </a>
          <a routerLink="/admin/logs" class="action-card">
            <span class="action-icon">📋</span>
            <span class="action-label">{{ t('admin.auditLogs') }}</span>
          </a>
          <a routerLink="/admin/settings" class="action-card">
            <span class="action-icon">⚙️</span>
            <span class="action-label">{{ t('admin.systemSettings') }}</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .dashboard-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    
    .last-refresh {
      font-size: 12px;
      color: #666;
    }
    
    .btn-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-refresh:hover:not(:disabled) {
      background: #f5f5f5;
    }
    
    .btn-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .icon.spinning {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    /* 統計卡片 */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    
    .stat-icon {
      font-size: 32px;
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: #f5f5f5;
    }
    
    .stat-card.users .stat-icon { background: #e3f2fd; }
    .stat-card.accounts .stat-icon { background: #e8f5e9; }
    .stat-card.revenue .stat-icon { background: #fff3e0; }
    .stat-card.api .stat-icon { background: #f3e5f5; }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #333;
    }
    
    .stat-label {
      font-size: 14px;
      color: #666;
      margin-top: 2px;
    }
    
    .stat-sub {
      display: flex;
      gap: 12px;
      font-size: 12px;
      margin-top: 6px;
    }
    
    .stat-sub .active { color: #4caf50; }
    .stat-sub .new { color: #2196f3; }
    .stat-sub .online { color: #4caf50; }
    .stat-sub .today { color: #ff9800; }
    
    /* 安全警告 */
    .security-section {
      background: #fff3e0;
      border: 1px solid #ffcc80;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
    
    .view-all {
      font-size: 14px;
      color: #1976d2;
      text-decoration: none;
    }
    
    .view-all:hover {
      text-decoration: underline;
    }
    
    .alert-summary {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    
    .alert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background: white;
    }
    
    .alert-item.critical { background: #ffebee; }
    .alert-item.high { background: #fff3e0; }
    .alert-item.medium { background: #fffde7; }
    .alert-item.locked { background: #f3e5f5; }
    
    .alert-item.critical .alert-count { color: #c62828; }
    .alert-item.high .alert-count { color: #ef6c00; }
    .alert-item.medium .alert-count { color: #f9a825; }
    .alert-item.locked .alert-count { color: #7b1fa2; }
    
    .alert-count {
      font-size: 20px;
      font-weight: 700;
    }
    
    .alert-label {
      font-size: 14px;
      color: #666;
    }
    
    /* 趨勢圖表 */
    .trends-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 32px;
    }
    
    .period-selector {
      display: flex;
      gap: 8px;
    }
    
    .period-selector button {
      padding: 6px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      font-size: 13px;
    }
    
    .period-selector button.active {
      background: #1976d2;
      color: white;
      border-color: #1976d2;
    }
    
    .chart-container {
      height: 200px;
      margin: 20px 0;
    }
    
    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 180px;
      gap: 2px;
    }
    
    .chart-bar {
      flex: 1;
      background: linear-gradient(180deg, #2196f3, #1976d2);
      border-radius: 3px 3px 0 0;
      min-height: 4px;
      transition: height 0.3s;
    }
    
    .chart-bar:hover {
      background: linear-gradient(180deg, #42a5f5, #2196f3);
    }
    
    .chart-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
      padding-top: 8px;
    }
    
    .chart-legend {
      display: flex;
      gap: 20px;
      justify-content: center;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
    
    .legend-color.api { background: #2196f3; }
    .legend-color.users { background: #4caf50; }
    
    /* 訂閱分布 */
    .tier-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 32px;
    }
    
    .tier-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 16px;
    }
    
    .tier-card {
      text-align: center;
      padding: 16px;
      border-radius: 8px;
      background: #f5f5f5;
    }
    
    .tier-card.free { background: #eceff1; }
    .tier-card.basic { background: #e3f2fd; }
    .tier-card.pro { background: #fff3e0; }
    .tier-card.enterprise { background: #f3e5f5; }
    
    .tier-count {
      font-size: 28px;
      font-weight: 700;
    }
    
    .tier-name {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    
    .tier-percent {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
    
    /* 快速操作 */
    .quick-actions {
      margin-bottom: 32px;
    }
    
    .quick-actions h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    
    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }
    
    .action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 24px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-decoration: none;
      color: #333;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .action-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    
    .action-icon {
      font-size: 32px;
    }
    
    .action-label {
      font-size: 14px;
      font-weight: 500;
    }
    
    @media (max-width: 768px) {
      .admin-dashboard {
        padding: 16px;
      }
      
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      
      .stats-grid {
        grid-template-columns: 1fr;
      }
      
      .alert-summary {
        flex-direction: column;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private refreshInterval: any;
  
  readonly periods = [
    { days: 7, label: '7天' },
    { days: 14, label: '14天' },
    { days: 30, label: '30天' }
  ];
  
  selectedPeriod = signal(30);
  
  constructor(
    private adminService: AdminService,
    private i18n: I18nService
  ) {}
  
  // 代理訪問
  get stats() { return this.adminService.dashboardStats; }
  get security() { return this.adminService.securityOverview; }
  get trends() { return this.adminService.usageTrends; }
  get isLoading() { return this.adminService.isLoading; }
  get lastRefresh() { return this.adminService.lastRefresh; }
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    this.refresh();
    // 每 5 分鐘自動刷新
    this.refreshInterval = setInterval(() => this.refresh(), 5 * 60 * 1000);
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  async refresh() {
    await this.adminService.refreshDashboard();
  }
  
  async changePeriod(days: number) {
    this.selectedPeriod.set(days);
    const trends = await this.adminService.fetchUsageTrends(days);
    // 更新趨勢數據
  }
  
  visibleTrends(): UsageTrend[] {
    const all = this.trends();
    return all.slice(-this.selectedPeriod());
  }
  
  getBarHeight(value: number): number {
    const trends = this.visibleTrends();
    if (!trends.length) return 0;
    const max = Math.max(...trends.map(t => t.api_calls), 1);
    return Math.min((value / max) * 100, 100);
  }
  
  getFirstDate(): string {
    const trends = this.visibleTrends();
    return trends.length > 0 ? trends[0].date.slice(5) : '';
  }
  
  getLastDate(): string {
    const trends = this.visibleTrends();
    return trends.length > 0 ? trends[trends.length - 1].date.slice(5) : '';
  }
  
  tierEntries(): Array<{ key: string; value: number }> {
    const tiers = this.stats()?.users_by_tier || {};
    return Object.entries(tiers).map(([key, value]) => ({ key, value }));
  }
  
  getTierPercent(count: number): string {
    const total = this.stats()?.total_users || 1;
    return ((count / total) * 100).toFixed(1);
  }
  
  formatRevenue(amount?: number): string {
    if (!amount) return '0';
    return (amount / 100).toFixed(2);
  }
  
  formatNumber(num?: number): string {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  }
  
  formatTime(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleTimeString();
  }
}
