/**
 * API 统计仪表板组件
 * 
 * 功能：
 * 1. 显示 API 使用概览
 * 2. 成功率趋势图
 * 3. 每小时活动图表
 * 4. API 排名列表
 * 5. 实时告警面板
 */

import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../toast.service';

interface DailyStats {
  date: string;
  attempts: number;
  success: number;
  failed: number;
  errors: number;
  success_rate: number;
}

interface HourlyStats {
  hour: string;
  attempts: number;
  success: number;
  failed: number;
  errors: number;
  success_rate: number;
}

interface ApiRanking {
  api_id: string;
  attempts: number;
  success: number;
  failed: number;
  errors: number;
  success_rate: number;
}

interface Alert {
  type: string;
  api_id: string;
  message: string;
  timestamp: number;
  current_rate?: number;
  error_count?: number;
}

interface OverallStats {
  days: number;
  daily: DailyStats[];
  total: {
    attempts: number;
    success: number;
    failed: number;
    errors: number;
    success_rate: number;
  };
  realtime: Record<string, Record<string, number>>;
}

interface DashboardData {
  overall: OverallStats;
  hourly: HourlyStats[];
  ranking: ApiRanking[];
  alerts: Alert[];
  last_updated: number;
}

@Component({
  selector: 'app-api-stats-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-dashboard">
      <div class="dashboard-header">
        <h1>📊 API 统计仪表板</h1>
        <div class="header-actions">
          <span class="last-updated" *ngIf="lastUpdated()">
            更新于 {{ formatTime(lastUpdated()) }}
          </span>
          <button (click)="loadDashboard()" class="btn-refresh" [disabled]="isLoading()">
            {{ isLoading() ? '刷新中...' : '🔄 刷新' }}
          </button>
        </div>
      </div>

      @if (backendUnavailable) {
        <div class="dev-notice">
          <div class="dev-notice-icon">🚧</div>
          <div class="dev-notice-content">
            <strong>API 统计仪表板功能开发中</strong>
            <p>此页面原本使用的 Electron IPC 命令 <code>api-stats:command</code> 在后端从未被
              注册为真实可调用的命令（<code>backend/api/api_stats_routes.py</code> 是未被任何路由
              引用的孤立模块），因此没有对应的 REST API 可供串接。目前显示为预览版面，
              待后端补上 <code>/api/v1/admin/api-stats/*</code> 一类端点后即可启用真实数据。</p>
          </div>
        </div>
      } @else {

      @if (error()) {
        <div class="error-banner">
          ⚠️ {{ error() }}
        </div>
      }

      <!-- 概览卡片 -->
      <div class="overview-cards">
        <div class="stat-card primary">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-value">{{ totalStats()?.attempts || 0 }}</div>
            <div class="card-label">总登录尝试</div>
          </div>
        </div>
        
        <div class="stat-card success">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <div class="card-value">{{ totalStats()?.success || 0 }}</div>
            <div class="card-label">成功登录</div>
          </div>
        </div>
        
        <div class="stat-card warning">
          <div class="card-icon">❌</div>
          <div class="card-content">
            <div class="card-value">{{ totalStats()?.failed || 0 }}</div>
            <div class="card-label">失败登录</div>
          </div>
        </div>
        
        <div class="stat-card" [class.danger]="(totalStats()?.success_rate || 0) < 80">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-value">{{ (totalStats()?.success_rate || 0).toFixed(1) }}%</div>
            <div class="card-label">成功率</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <!-- 每日趋势 -->
        <div class="chart-card">
          <h3>📅 每日趋势（近7天）</h3>
          <div class="bar-chart">
            @for (day of dailyStats(); track day.date) {
              <div class="bar-group">
                <div class="bar-container">
                  <div 
                    class="bar success" 
                    [style.height.%]="getBarHeight(day.success, 'success')"
                    [title]="'成功: ' + day.success">
                  </div>
                  <div 
                    class="bar failed" 
                    [style.height.%]="getBarHeight(day.failed, 'failed')"
                    [title]="'失败: ' + day.failed">
                  </div>
                </div>
                <div class="bar-label">{{ formatDate(day.date) }}</div>
                <div class="bar-rate" [class.low]="day.success_rate < 80">
                  {{ day.success_rate.toFixed(0) }}%
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 每小时活动 -->
        <div class="chart-card">
          <h3>⏰ 每小时活动（近24h）</h3>
          <div class="hourly-chart">
            @for (hour of hourlyStats(); track hour.hour) {
              <div class="hour-bar" [title]="hour.hour + ': ' + hour.attempts + ' 次'">
                <div 
                  class="hour-fill" 
                  [style.height.%]="getHourlyHeight(hour.attempts)"
                  [class.active]="hour.attempts > 0">
                </div>
              </div>
            }
          </div>
          <div class="hourly-labels">
            <span>0:00</span>
            <span>6:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>

      <!-- API 排名和告警 -->
      <div class="panels-section">
        <!-- API 排名 -->
        <div class="panel-card">
          <h3>🏆 API 排名（按成功率）</h3>
          <div class="ranking-list">
            @if (apiRanking().length === 0) {
              <div class="empty-state">暂无数据</div>
            }
            @for (api of apiRanking(); track api.api_id; let i = $index) {
              <div class="ranking-item">
                <div class="rank-badge" [class]="getRankClass(i)">{{ i + 1 }}</div>
                <div class="api-info">
                  <div class="api-id">{{ api.api_id.substring(0, 8) }}...</div>
                  <div class="api-stats">
                    {{ api.success }}/{{ api.attempts }} 次
                  </div>
                </div>
                <div class="success-rate" [class.low]="api.success_rate < 80">
                  {{ api.success_rate.toFixed(1) }}%
                </div>
              </div>
            }
          </div>
        </div>

        <!-- 告警面板 -->
        <div class="panel-card alerts-panel">
          <div class="panel-header">
            <h3>🔔 系统告警</h3>
            @if (alerts().length > 0) {
              <button (click)="clearAlerts()" class="btn-clear">清除</button>
            }
          </div>
          <div class="alerts-list">
            @if (alerts().length === 0) {
              <div class="empty-state success">✅ 系统正常，无告警</div>
            }
            @for (alert of alerts(); track alert.timestamp) {
              <div class="alert-item" [class]="getAlertClass(alert)">
                <div class="alert-icon">{{ getAlertIcon(alert) }}</div>
                <div class="alert-content">
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-time">{{ formatTimestamp(alert.timestamp) }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- 实时数据 -->
      <div class="realtime-section" *ngIf="hasRealtimeData()">
        <h3>📡 实时数据</h3>
        <div class="realtime-grid">
          @for (item of getRealtimeItems(); track item.api_id) {
            <div class="realtime-card">
              <div class="realtime-api">{{ item.api_id.substring(0, 10) }}</div>
              <div class="realtime-stats">
                <span class="stat success">✓ {{ item.success }}</span>
                <span class="stat failed">✗ {{ item.failed }}</span>
                <span class="stat errors">⚠ {{ item.errors }}</span>
              </div>
            </div>
          }
        </div>
      </div>
      }
    </div>
  `,
  styles: [`
    .stats-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* 🚧 功能开发中提示 */
    .dev-notice {
      display: flex;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 0.75rem;
    }

    .dev-notice-icon {
      font-size: 1.75rem;
    }

    .dev-notice-content strong {
      color: #93c5fd;
      font-size: 1rem;
    }

    .dev-notice-content p {
      margin: 0.5rem 0 0 0;
      font-size: 0.8rem;
      color: #9ca3af;
      line-height: 1.6;
    }

    .dev-notice-content code {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.08);
      padding: 0.1rem 0.3rem;
      border-radius: 0.25rem;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .dashboard-header h1 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .last-updated {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .btn-refresh {
      padding: 0.5rem 1rem;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-refresh:hover:not(:disabled) {
      background: #2563eb;
    }

    .btn-refresh:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-banner {
      padding: 1rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      color: #fca5a5;
      margin-bottom: 1rem;
    }

    /* 概览卡片 */
    .overview-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .stat-card.primary {
      border-color: rgba(59, 130, 246, 0.3);
    }

    .stat-card.success {
      border-color: rgba(34, 197, 94, 0.3);
    }

    .stat-card.warning {
      border-color: rgba(245, 158, 11, 0.3);
    }

    .stat-card.danger {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
    }

    .card-icon {
      font-size: 2rem;
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

    /* 图表区域 */
    .charts-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .chart-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .chart-card h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 1rem 0;
    }

    /* 柱状图 */
    .bar-chart {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 200px;
      padding: 0 0.5rem;
    }

    .bar-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 80px;
    }

    .bar-container {
      width: 30px;
      height: 150px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 2px;
    }

    .bar {
      width: 100%;
      border-radius: 3px 3px 0 0;
      transition: height 0.3s;
    }

    .bar.success {
      background: linear-gradient(to top, #22c55e, #4ade80);
    }

    .bar.failed {
      background: linear-gradient(to top, #ef4444, #f87171);
    }

    .bar-label {
      font-size: 0.7rem;
      color: #9ca3af;
      margin-top: 0.5rem;
    }

    .bar-rate {
      font-size: 0.75rem;
      font-weight: 600;
      color: #22c55e;
    }

    .bar-rate.low {
      color: #ef4444;
    }

    /* 每小时图表 */
    .hourly-chart {
      display: flex;
      height: 100px;
      gap: 2px;
      padding: 0 0.5rem;
    }

    .hour-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .hour-fill {
      background: rgba(59, 130, 246, 0.3);
      border-radius: 2px 2px 0 0;
      transition: height 0.3s;
    }

    .hour-fill.active {
      background: linear-gradient(to top, #3b82f6, #60a5fa);
    }

    .hourly-labels {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.5rem 0;
      font-size: 0.7rem;
      color: #9ca3af;
    }

    /* 面板区域 */
    .panels-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .panel-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-card h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 1rem 0;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn-clear {
      padding: 0.25rem 0.75rem;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #9ca3af;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-clear:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    /* 排名列表 */
    .ranking-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .ranking-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
    }

    .rank-badge {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
      color: #9ca3af;
    }

    .rank-badge.gold {
      background: linear-gradient(135deg, #fcd34d, #f59e0b);
      color: #451a03;
    }

    .rank-badge.silver {
      background: linear-gradient(135deg, #d1d5db, #9ca3af);
      color: #1f2937;
    }

    .rank-badge.bronze {
      background: linear-gradient(135deg, #d97706, #92400e);
      color: #fff;
    }

    .api-info {
      flex: 1;
    }

    .api-id {
      font-size: 0.875rem;
      color: #f1f5f9;
      font-family: monospace;
    }

    .api-stats {
      font-size: 0.7rem;
      color: #9ca3af;
    }

    .success-rate {
      font-size: 1rem;
      font-weight: 600;
      color: #22c55e;
    }

    .success-rate.low {
      color: #ef4444;
    }

    /* 告警列表 */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .alert-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
    }

    .alert-item.warning {
      background: rgba(245, 158, 11, 0.1);
      border-left-color: #f59e0b;
    }

    .alert-icon {
      font-size: 1.25rem;
    }

    .alert-message {
      font-size: 0.875rem;
      color: #f1f5f9;
    }

    .alert-time {
      font-size: 0.7rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #9ca3af;
      font-size: 0.875rem;
    }

    .empty-state.success {
      color: #22c55e;
    }

    /* 实时数据 */
    .realtime-section {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .realtime-section h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 1rem 0;
    }

    .realtime-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .realtime-card {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    .realtime-api {
      font-size: 0.75rem;
      color: #9ca3af;
      font-family: monospace;
      margin-bottom: 0.5rem;
    }

    .realtime-stats {
      display: flex;
      gap: 0.75rem;
      font-size: 0.875rem;
    }

    .realtime-stats .stat {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .realtime-stats .stat.success { color: #22c55e; }
    .realtime-stats .stat.failed { color: #ef4444; }
    .realtime-stats .stat.errors { color: #f59e0b; }
  `]
})
export class ApiStatsDashboardComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);

  /**
   * 🔧 此页面需要的登录尝试统计（按 API 池 api_id 排名/每日每小时趋势/告警）
   * 唯一对应的后端逻辑是 backend/core/api_stats.py，但暴露它的
   * backend/api/api_stats_routes.py 从未被任何路由或命令注册引用
   * （既不在 backend/main.py 的 COMMAND_ALIAS_REGISTRY，也没有对应的
   * /api/v1/* REST 路由），是一个孤立、从未被真正接上的模块。
   * 因此这里做优雅降级，不假造资料，保留完整版面结构供未来串接。
   */
  readonly backendUnavailable = true;

  // 状态
  isLoading = signal(false);
  error = signal('');
  lastUpdated = signal<number | null>(null);

  // 数据
  dashboardData = signal<DashboardData | null>(null);
  totalStats = signal<OverallStats['total'] | null>(null);
  dailyStats = signal<DailyStats[]>([]);
  hourlyStats = signal<HourlyStats[]>([]);
  apiRanking = signal<ApiRanking[]>([]);
  alerts = signal<Alert[]>([]);
  realtimeData = signal<Record<string, Record<string, number>>>({});

  // 刷新定时器
  private refreshInterval: any;

  ngOnInit(): void {
    if (this.backendUnavailable) {
      return;
    }
    this.loadDashboard();
    // 🔧 Phase2: 30s→60s 降低輪詢頻率
    this.refreshInterval = setInterval(() => this.loadDashboard(), 60000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadDashboard(): Promise<void> {
    if (this.isLoading() || this.backendUnavailable) return;

    this.isLoading.set(true);
    this.error.set('');

    try {
      // 目前无真实后端端点可用，保留方法签名供未来串接使用
      const result: { success?: boolean; data?: DashboardData; error?: string } = { success: false, error: '后端尚未提供此功能' };

      if (result?.success && result.data) {
        const data = result.data;
        this.dashboardData.set(data);
        this.totalStats.set(data.overall?.total || null);
        this.dailyStats.set(data.overall?.daily || []);
        this.hourlyStats.set(data.hourly || []);
        this.apiRanking.set(data.ranking || []);
        this.alerts.set(data.alerts || []);
        this.realtimeData.set(data.overall?.realtime || {});
        this.lastUpdated.set(data.last_updated);
      } else {
        this.error.set(result?.error || '加载失败');
      }
    } catch (e: any) {
      this.error.set(e.message || '网络错误');
    } finally {
      this.isLoading.set(false);
    }
  }

  async clearAlerts(): Promise<void> {
    if (this.backendUnavailable) {
      this.toast.info('此功能开发中，暂无法清除告警');
      return;
    }
    this.alerts.set([]);
    this.toast.success('告警已清除');
  }

  // 辅助方法
  getBarHeight(value: number, type: string): number {
    const maxValue = Math.max(
      ...this.dailyStats().map(d => d.success + d.failed),
      1
    );
    return (value / maxValue) * 100;
  }

  getHourlyHeight(value: number): number {
    const maxValue = Math.max(...this.hourlyStats().map(h => h.attempts), 1);
    return (value / maxValue) * 100;
  }

  getRankClass(index: number): string {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
  }

  getAlertClass(alert: Alert): string {
    if (alert.type === 'high_errors') return 'warning';
    return '';
  }

  getAlertIcon(alert: Alert): string {
    if (alert.type === 'low_success_rate') return '📉';
    if (alert.type === 'high_errors') return '⚠️';
    return '🔔';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleTimeString();
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }

  hasRealtimeData(): boolean {
    return Object.keys(this.realtimeData()).length > 0;
  }

  getRealtimeItems(): Array<{ api_id: string; success: number; failed: number; errors: number }> {
    const data = this.realtimeData();
    return Object.entries(data).map(([api_id, stats]) => ({
      api_id,
      success: stats['success'] || 0,
      failed: stats['failed'] || 0,
      errors: stats['errors'] || 0
    }));
  }
}
