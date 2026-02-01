/**
 * 管理員配額監控組件
 * 
 * 功能：
 * 1. 配額使用總覽
 * 2. 用戶排行
 * 3. 告警管理
 * 4. 配額調整
 * 5. 報表導出
 */

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from './admin.service';

interface QuotaOverview {
  total_users: number;
  active_today: number;
  by_tier: Record<string, number>;
  quotas: Record<string, {
    total_used: number;
    today_used: number;
    avg_per_user: number;
    max_used: number;
    users_exceeded: number;
  }>;
  alerts: {
    total: number;
    critical: number;
    warning: number;
    exceeded: number;
  };
  trends: Record<string, { date: string; value: number }[]>;
}

interface RankingUser {
  rank: number;
  user_id: string;
  email: string;
  username: string;
  tier: string;
  total_used: number;
  active_days: number;
  daily_avg: number;
}

interface QuotaAlert {
  id: number;
  user_id: string;
  email: string;
  username: string;
  tier: string;
  alert_type: string;
  quota_type: string;
  message: string;
  percentage: number;
  acknowledged: boolean;
  created_at: string;
}

@Component({
  selector: 'app-quota-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quota-management">
      <header class="page-header">
        <h1>配額監控</h1>
        <div class="header-actions">
          <button class="btn-refresh" (click)="refresh()" [disabled]="isLoading()">
            {{ isLoading() ? '加載中...' : '刷新' }}
          </button>
          <button class="btn-export" (click)="exportReport()">
            導出報表
          </button>
        </div>
      </header>
      
      <!-- 總覽卡片 -->
      <div class="overview-cards" *ngIf="overview()">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-content">
            <span class="stat-value">{{ overview()!.total_users }}</span>
            <span class="stat-label">總用戶數</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">📊</div>
          <div class="stat-content">
            <span class="stat-value">{{ overview()!.active_today }}</span>
            <span class="stat-label">今日活躍</span>
          </div>
        </div>
        
        <div class="stat-card warning" *ngIf="overview()!.alerts.warning > 0">
          <div class="stat-icon">⚠️</div>
          <div class="stat-content">
            <span class="stat-value">{{ overview()!.alerts.warning }}</span>
            <span class="stat-label">警告告警</span>
          </div>
        </div>
        
        <div class="stat-card critical" *ngIf="overview()!.alerts.exceeded > 0">
          <div class="stat-icon">🚫</div>
          <div class="stat-content">
            <span class="stat-value">{{ overview()!.alerts.exceeded }}</span>
            <span class="stat-label">超限用戶</span>
          </div>
        </div>
      </div>
      
      <!-- 配額使用統計 -->
      <section class="quota-stats">
        <h2>今日配額使用</h2>
        <div class="stats-grid">
          <div class="quota-stat-card" *ngFor="let stat of quotaStats()">
            <div class="stat-header">
              <span class="stat-type-icon">{{ stat.icon }}</span>
              <span class="stat-type-name">{{ stat.name }}</span>
            </div>
            <div class="stat-value-large">{{ formatNumber(stat.today_used) }}</div>
            <div class="stat-details">
              <span>平均: {{ stat.avg_per_user }}</span>
              <span>最高: {{ stat.max_used }}</span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 用戶排行 & 告警 -->
      <div class="content-grid">
        <!-- 使用排行 -->
        <section class="rankings-section">
          <div class="section-header">
            <h2>使用排行</h2>
            <div class="filter-group">
              <select [(ngModel)]="selectedQuotaType" (change)="loadRankings()">
                <option value="daily_messages">每日消息</option>
                <option value="ai_calls">AI 調用</option>
              </select>
              <select [(ngModel)]="selectedPeriod" (change)="loadRankings()">
                <option value="today">今天</option>
                <option value="week">本週</option>
                <option value="month">本月</option>
              </select>
            </div>
          </div>
          
          <div class="rankings-table">
            <div class="table-header">
              <span>排名</span>
              <span>用戶</span>
              <span>等級</span>
              <span>使用量</span>
              <span>日均</span>
              <span>操作</span>
            </div>
            <div class="table-body">
              <div class="table-row" *ngFor="let user of rankings()">
                <span class="rank">
                  <span class="rank-badge" [class]="'rank-' + user.rank">{{ user.rank }}</span>
                </span>
                <span class="user-info">
                  <span class="email">{{ user.email }}</span>
                  <span class="user-id">{{ user.user_id }}</span>
                </span>
                <span class="tier">
                  <span class="tier-badge" [class]="'tier-' + user.tier">{{ user.tier }}</span>
                </span>
                <span class="usage">{{ formatNumber(user.total_used) }}</span>
                <span class="avg">{{ user.daily_avg }}</span>
                <span class="actions">
                  <button class="btn-small" (click)="openAdjustDialog(user)">調整</button>
                </span>
              </div>
              <div class="empty-state" *ngIf="rankings().length === 0">
                暫無數據
              </div>
            </div>
          </div>
        </section>
        
        <!-- 告警列表 -->
        <section class="alerts-section">
          <div class="section-header">
            <h2>配額告警</h2>
            <div class="filter-group">
              <select [(ngModel)]="alertFilter" (change)="loadAlerts()">
                <option value="">全部</option>
                <option value="exceeded">超限</option>
                <option value="critical">臨界</option>
                <option value="warning">警告</option>
              </select>
            </div>
          </div>
          
          <div class="alerts-list">
            <div class="alert-item" *ngFor="let alert of alerts()" 
                 [class]="'alert-' + alert.alert_type"
                 [class.acknowledged]="alert.acknowledged">
              <div class="alert-icon">
                {{ getAlertIcon(alert.alert_type) }}
              </div>
              <div class="alert-content">
                <div class="alert-header">
                  <span class="alert-user">{{ alert.email }}</span>
                  <span class="alert-time">{{ formatTime(alert.created_at) }}</span>
                </div>
                <div class="alert-message">
                  {{ alert.quota_type }}: {{ alert.message }}
                </div>
              </div>
              <button class="btn-ack" *ngIf="!alert.acknowledged" (click)="acknowledgeAlert(alert.id)">
                確認
              </button>
            </div>
            <div class="empty-state" *ngIf="alerts().length === 0">
              暫無告警
            </div>
          </div>
        </section>
      </div>
      
      <!-- 配額調整對話框 -->
      <div class="dialog-overlay" *ngIf="showAdjustDialog()" (click)="showAdjustDialog.set(false)">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <h3>調整用戶配額</h3>
          <div class="form-group">
            <label>用戶</label>
            <input type="text" [value]="adjustTarget()?.email" disabled>
          </div>
          <div class="form-group">
            <label>配額類型</label>
            <select [(ngModel)]="adjustQuotaType">
              <option value="daily_messages">每日消息</option>
              <option value="ai_calls">AI 調用</option>
              <option value="tg_accounts">TG 帳號</option>
              <option value="groups">群組數</option>
            </select>
          </div>
          <div class="form-group">
            <label>新配額值</label>
            <input type="number" [(ngModel)]="adjustValue" min="0">
          </div>
          <div class="form-group">
            <label>調整原因</label>
            <input type="text" [(ngModel)]="adjustReason" placeholder="可選">
          </div>
          <div class="dialog-actions">
            <button class="btn-cancel" (click)="showAdjustDialog.set(false)">取消</button>
            <button class="btn-confirm" (click)="confirmAdjust()">確認調整</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quota-management {
      padding: 24px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .page-header h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
    
    .btn-refresh, .btn-export {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-refresh {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .btn-export {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      color: white;
    }
    
    /* 總覽卡片 */
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      border: 1px solid var(--border-color, #333);
    }
    
    .stat-card.warning {
      border-color: rgba(245, 158, 11, 0.5);
      background: rgba(245, 158, 11, 0.1);
    }
    
    .stat-card.critical {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.1);
    }
    
    .stat-icon {
      font-size: 32px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      display: block;
    }
    
    .stat-label {
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    /* 配額統計 */
    .quota-stats {
      margin-bottom: 24px;
    }
    
    .quota-stats h2 {
      font-size: 18px;
      margin-bottom: 16px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .quota-stat-card {
      padding: 20px;
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
    }
    
    .stat-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .stat-type-icon {
      font-size: 20px;
    }
    
    .stat-type-name {
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    .stat-value-large {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    
    .stat-details {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    /* 內容網格 */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h2 {
      font-size: 18px;
      margin: 0;
    }
    
    .filter-group {
      display: flex;
      gap: 8px;
    }
    
    .filter-group select {
      padding: 6px 12px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 13px;
    }
    
    /* 排行表格 */
    .rankings-table {
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .table-header {
      display: grid;
      grid-template-columns: 60px 1fr 80px 80px 60px 60px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary, #888);
    }
    
    .table-row {
      display: grid;
      grid-template-columns: 60px 1fr 80px 80px 60px 60px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color, #333);
      align-items: center;
      font-size: 13px;
    }
    
    .rank-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-primary, #0f0f0f);
      font-weight: 700;
    }
    
    .rank-badge.rank-1 { background: #FFD700; color: #000; }
    .rank-badge.rank-2 { background: #C0C0C0; color: #000; }
    .rank-badge.rank-3 { background: #CD7F32; color: #fff; }
    
    .user-info {
      display: flex;
      flex-direction: column;
    }
    
    .user-id {
      font-size: 11px;
      color: var(--text-muted, #666);
    }
    
    .tier-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    
    .tier-badge.tier-bronze { background: #CD7F32; }
    .tier-badge.tier-silver { background: #C0C0C0; color: #000; }
    .tier-badge.tier-gold { background: #FFD700; color: #000; }
    .tier-badge.tier-diamond { background: #00CED1; }
    
    .btn-small {
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 4px;
      color: var(--text-primary, #fff);
      font-size: 11px;
      cursor: pointer;
    }
    
    /* 告警列表 */
    .alerts-section {
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      padding: 20px;
    }
    
    .alerts-list {
      max-height: 400px;
      overflow-y: auto;
    }
    
    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .alert-item.alert-exceeded { border-left: 3px solid #ef4444; }
    .alert-item.alert-critical { border-left: 3px solid #f59e0b; }
    .alert-item.alert-warning { border-left: 3px solid #eab308; }
    .alert-item.acknowledged { opacity: 0.5; }
    
    .alert-icon {
      font-size: 20px;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    
    .alert-user {
      font-weight: 600;
      font-size: 13px;
    }
    
    .alert-time {
      font-size: 11px;
      color: var(--text-muted, #666);
    }
    
    .alert-message {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .btn-ack {
      padding: 4px 12px;
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 4px;
      color: #22c55e;
      font-size: 12px;
      cursor: pointer;
    }
    
    .empty-state {
      text-align: center;
      padding: 32px;
      color: var(--text-secondary, #888);
    }
    
    /* 對話框 */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    
    .dialog-content {
      background: var(--bg-primary, #0f0f0f);
      border-radius: 12px;
      padding: 24px;
      min-width: 400px;
    }
    
    .dialog-content h3 {
      margin: 0 0 20px;
    }
    
    .form-group {
      margin-bottom: 16px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    .form-group input, .form-group select {
      width: 100%;
      padding: 10px;
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 6px;
      color: var(--text-primary, #fff);
      font-size: 14px;
    }
    
    .dialog-actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    
    .btn-cancel, .btn-confirm {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .btn-confirm {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      color: white;
    }
  `]
})
export class QuotaManagementComponent implements OnInit {
  private adminService = inject(AdminService);
  
  // 狀態
  isLoading = signal(false);
  overview = signal<QuotaOverview | null>(null);
  rankings = signal<RankingUser[]>([]);
  alerts = signal<QuotaAlert[]>([]);
  
  // 過濾器
  selectedQuotaType = 'daily_messages';
  selectedPeriod = 'today';
  alertFilter = '';
  
  // 配額調整對話框
  showAdjustDialog = signal(false);
  adjustTarget = signal<RankingUser | null>(null);
  adjustQuotaType = 'daily_messages';
  adjustValue = 0;
  adjustReason = '';
  
  // 配額圖標
  private quotaIcons: Record<string, string> = {
    daily_messages: '💬',
    ai_calls: '🤖',
    tg_accounts: '📱',
    groups: '👥',
  };
  
  // 配額名稱
  private quotaNames: Record<string, string> = {
    daily_messages: '每日消息',
    ai_calls: 'AI 調用',
    tg_accounts: 'TG 帳號',
    groups: '群組數',
  };

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.loadOverview(),
        this.loadRankings(),
        this.loadAlerts()
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadOverview() {
    const result = await this.adminService.getQuotaOverview();
    if (result?.success) {
      this.overview.set(result.data);
    }
  }

  async loadRankings() {
    const result = await this.adminService.getQuotaRankings(
      this.selectedQuotaType,
      this.selectedPeriod
    );
    if (result?.success) {
      this.rankings.set(result.data?.rankings || []);
    }
  }

  async loadAlerts() {
    const result = await this.adminService.getQuotaAlerts(this.alertFilter || undefined);
    if (result?.success) {
      this.alerts.set(result.data?.alerts || []);
    }
  }

  quotaStats = computed(() => {
    const ov = this.overview();
    if (!ov?.quotas) return [];
    
    return Object.entries(ov.quotas).map(([type, stats]) => ({
      type,
      name: this.quotaNames[type] || type,
      icon: this.quotaIcons[type] || '📊',
      ...stats
    }));
  });

  formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  formatTime(isoTime: string): string {
    try {
      const date = new Date(isoTime);
      return date.toLocaleString('zh-TW', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }

  getAlertIcon(type: string): string {
    const icons: Record<string, string> = {
      exceeded: '🚫',
      critical: '⚡',
      warning: '⚠️'
    };
    return icons[type] || '❗';
  }

  openAdjustDialog(user: RankingUser) {
    this.adjustTarget.set(user);
    this.adjustQuotaType = this.selectedQuotaType;
    this.adjustValue = 0;
    this.adjustReason = '';
    this.showAdjustDialog.set(true);
  }

  async confirmAdjust() {
    const target = this.adjustTarget();
    if (!target) return;
    
    const result = await this.adminService.adjustUserQuota(
      target.user_id,
      this.adjustQuotaType,
      this.adjustValue,
      this.adjustReason
    );
    
    if (result?.success) {
      this.showAdjustDialog.set(false);
      this.refresh();
    } else {
      alert(result?.error || '調整失敗');
    }
  }

  async acknowledgeAlert(alertId: number) {
    // TODO: 實現確認告警
    console.log('Acknowledge alert:', alertId);
  }

  async exportReport() {
    const result = await this.adminService.exportQuotaReport();
    if (result?.success) {
      // 下載 JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quota_report_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
}
