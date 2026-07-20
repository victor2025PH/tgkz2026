/**
 * 统一运维中心组件
 * 
 * 功能：
 * 1. 运维仪表板概览
 * 2. 关键指标一览
 * 3. 快速操作入口
 * 4. 实时状态监控
 */

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ElectronIpcService } from '../electron-ipc.service';
import { RealtimeEventsService, EventType, RealtimeEvent } from '../services/realtime-events.service';
import { Subscription } from 'rxjs';

interface DashboardStats {
  pool: {
    total_apis: number;
    available_apis: number;
    full_apis: number;
    exhausted_apis: number;
    utilization: number;
  };
  health: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  alerts: {
    critical: number;
    warning: number;
    total: number;
  };
  login: {
    active_logins: number;
    success_rate: number;
    recent_failures: number;
  };
}

interface QuickAction {
  id: string;
  icon: string;
  title: string;
  description: string;
  route?: string;
  action?: () => void;
  badge?: number;
  status?: 'normal' | 'warning' | 'critical';
}

@Component({
  selector: 'app-ops-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ops-dashboard">
      <!-- 头部 -->
      <header class="dashboard-header">
        <div class="header-left">
          <h1>运维中心</h1>
          <span class="status-indicator" [class]="systemStatus()">
            {{ systemStatusText() }}
          </span>
        </div>
        <div class="header-right">
          <span class="last-update">
            更新于 {{ lastUpdateTime() }}
          </span>
          <button class="refresh-btn" (click)="refresh()" [disabled]="loading()">
            🔄
          </button>
        </div>
      </header>

      <!-- 核心指标卡片 -->
      <section class="metrics-grid">
        <!-- API 池状态 -->
        <div class="metric-card pool">
          <div class="metric-header">
            <span class="metric-icon">🌐</span>
            <span class="metric-title">API 池</span>
          </div>
          <div class="metric-value">
            {{ stats()?.pool?.available_apis || 0 }}
            <span class="metric-unit">/ {{ stats()?.pool?.total_apis || 0 }}</span>
          </div>
          <div class="metric-bar">
            <div 
              class="metric-bar-fill" 
              [style.width.%]="stats()?.pool?.utilization || 0"
              [class.warning]="(stats()?.pool?.utilization || 0) > 70"
              [class.critical]="(stats()?.pool?.utilization || 0) > 90">
            </div>
          </div>
          <div class="metric-footer">
            使用率: {{ stats()?.pool?.utilization || 0 | number:'1.0-1' }}%
          </div>
        </div>

        <!-- 健康状态 -->
        <div class="metric-card health">
          <div class="metric-header">
            <span class="metric-icon">💚</span>
            <span class="metric-title">健康状态</span>
          </div>
          <div class="metric-value health-stats">
            <span class="health-good">{{ stats()?.health?.healthy || 0 }}</span>
            <span class="health-warn">{{ stats()?.health?.degraded || 0 }}</span>
            <span class="health-bad">{{ stats()?.health?.unhealthy || 0 }}</span>
          </div>
          <div class="health-labels">
            <span>健康</span>
            <span>降级</span>
            <span>异常</span>
          </div>
        </div>

        <!-- 告警统计 -->
        <div class="metric-card alerts" [class.has-critical]="(stats()?.alerts?.critical || 0) > 0">
          <div class="metric-header">
            <span class="metric-icon">🔔</span>
            <span class="metric-title">告警</span>
          </div>
          <div class="metric-value">
            {{ stats()?.alerts?.total || 0 }}
            <span class="metric-unit">条活跃</span>
          </div>
          <div class="alert-breakdown">
            @if ((stats()?.alerts?.critical || 0) > 0) {
              <span class="alert-critical">{{ stats()?.alerts?.critical }} 紧急</span>
            }
            @if ((stats()?.alerts?.warning || 0) > 0) {
              <span class="alert-warning">{{ stats()?.alerts?.warning }} 警告</span>
            }
          </div>
        </div>

        <!-- 登录统计 -->
        <div class="metric-card login">
          <div class="metric-header">
            <span class="metric-icon">🔑</span>
            <span class="metric-title">登录</span>
          </div>
          <div class="metric-value">
            {{ stats()?.login?.success_rate || 0 | number:'1.0-1' }}%
            <span class="metric-unit">成功率</span>
          </div>
          <div class="login-info">
            活跃: {{ stats()?.login?.active_logins || 0 }}
            @if ((stats()?.login?.recent_failures || 0) > 0) {
              | 失败: {{ stats()?.login?.recent_failures }}
            }
          </div>
        </div>
      </section>

      <!-- 快速操作区 -->
      <section class="quick-actions">
        <h2>快速操作</h2>
        <div class="actions-grid">
          @for (action of quickActions(); track action.id) {
            <div 
              class="action-card" 
              [class]="'status-' + (action.status || 'normal')"
              (click)="executeAction(action)">
              <div class="action-icon">{{ action.icon }}</div>
              <div class="action-content">
                <div class="action-title">
                  {{ action.title }}
                  @if (action.badge && action.badge > 0) {
                    <span class="action-badge">{{ action.badge }}</span>
                  }
                </div>
                <div class="action-desc">{{ action.description }}</div>
              </div>
              <div class="action-arrow">→</div>
            </div>
          }
        </div>
      </section>

      <!-- 实时事件流 -->
      <section class="event-stream">
        <h2>
          实时事件
          <span class="connection-status" [class]="isConnected() ? 'connected' : 'disconnected'">
            {{ isConnected() ? '已连接' : '未连接' }}
          </span>
        </h2>
        <div class="events-list">
          @if (recentEvents().length === 0) {
            <div class="no-events">暂无事件</div>
          }
          @for (event of recentEvents(); track event.id) {
            <div class="event-item" [class]="getEventClass(event)">
              <span class="event-icon">{{ getEventIcon(event) }}</span>
              <div class="event-content">
                <div class="event-type">{{ formatEventType(event.type) }}</div>
                <div class="event-detail">{{ getEventDetail(event) }}</div>
              </div>
              <div class="event-time">{{ formatEventTime(event.timestamp) }}</div>
            </div>
          }
        </div>
      </section>

      <!-- 系统状态摘要 -->
      <section class="system-summary">
        <h2>系统摘要</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">服务状态</span>
            <span class="summary-value" [class]="serviceStatus()">
              {{ serviceStatusText() }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">今日登录</span>
            <span class="summary-value">{{ todayLogins() }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">今日告警</span>
            <span class="summary-value">{{ todayAlerts() }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">运行时间</span>
            <span class="summary-value">{{ uptime() }}</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .ops-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* 头部 */
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.75rem;
      color: #f1f5f9;
    }

    .status-indicator {
      padding: 0.25rem 0.75rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-indicator.healthy { background: #10b981; color: white; }
    .status-indicator.warning { background: #f59e0b; color: white; }
    .status-indicator.critical { background: #ef4444; color: white; }

    .header-right {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .last-update {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .refresh-btn {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: rgba(255,255,255,0.1);
    }

    .refresh-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* 指标网格 */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 1200px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .metrics-grid { grid-template-columns: 1fr; }
    }

    .metric-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.25rem;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .metric-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .metric-icon {
      font-size: 1.25rem;
    }

    .metric-title {
      font-size: 0.875rem;
      color: #94a3b8;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .metric-unit {
      font-size: 0.875rem;
      font-weight: 400;
      color: #6b7280;
    }

    .metric-bar {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      margin: 0.75rem 0 0.5rem;
      overflow: hidden;
    }

    .metric-bar-fill {
      height: 100%;
      background: #10b981;
      border-radius: 3px;
      transition: width 0.3s;
    }

    .metric-bar-fill.warning { background: #f59e0b; }
    .metric-bar-fill.critical { background: #ef4444; }

    .metric-footer {
      font-size: 0.75rem;
      color: #6b7280;
    }

    /* 健康状态 */
    .health-stats {
      display: flex;
      gap: 1.5rem;
    }

    .health-stats span {
      font-size: 1.5rem;
    }

    .health-good { color: #10b981; }
    .health-warn { color: #f59e0b; }
    .health-bad { color: #ef4444; }

    .health-labels {
      display: flex;
      gap: 1.5rem;
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }

    /* 告警 */
    .metric-card.alerts.has-critical {
      border-color: rgba(239, 68, 68, 0.5);
      animation: alertPulse 2s infinite;
    }

    @keyframes alertPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      50% { box-shadow: 0 0 20px 0 rgba(239, 68, 68, 0.3); }
    }

    .alert-breakdown {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      font-size: 0.75rem;
    }

    .alert-critical { color: #ef4444; }
    .alert-warning { color: #f59e0b; }

    .login-info {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }

    /* 快速操作 */
    .quick-actions h2,
    .event-stream h2,
    .system-summary h2 {
      font-size: 1rem;
      color: #94a3b8;
      margin-bottom: 1rem;
      font-weight: 500;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    @media (max-width: 900px) {
      .actions-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .actions-grid { grid-template-columns: 1fr; }
    }

    .action-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.6);
      border-radius: 0.75rem;
      border: 1px solid rgba(255,255,255,0.1);
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-card:hover {
      background: rgba(30, 41, 59, 0.9);
      transform: translateX(4px);
    }

    .action-card.status-warning {
      border-color: rgba(245, 158, 11, 0.5);
    }

    .action-card.status-critical {
      border-color: rgba(239, 68, 68, 0.5);
    }

    .action-icon {
      font-size: 1.5rem;
    }

    .action-content {
      flex: 1;
    }

    .action-title {
      font-size: 0.9rem;
      font-weight: 500;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .action-badge {
      background: #ef4444;
      color: white;
      font-size: 0.65rem;
      padding: 0.125rem 0.375rem;
      border-radius: 1rem;
    }

    .action-desc {
      font-size: 0.75rem;
      color: #6b7280;
      margin-top: 0.25rem;
    }

    .action-arrow {
      color: #6b7280;
      font-size: 1.25rem;
    }

    /* 事件流 */
    .event-stream h2 {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .connection-status {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
    }

    .connection-status.connected {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .connection-status.disconnected {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .events-list {
      background: rgba(30, 41, 59, 0.6);
      border-radius: 0.75rem;
      border: 1px solid rgba(255,255,255,0.1);
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 2rem;
    }

    .no-events {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
    }

    .event-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .event-item:last-child {
      border-bottom: none;
    }

    .event-item.warning { background: rgba(245, 158, 11, 0.05); }
    .event-item.critical { background: rgba(239, 68, 68, 0.05); }
    .event-item.success { background: rgba(16, 185, 129, 0.05); }

    .event-icon {
      font-size: 1rem;
    }

    .event-content {
      flex: 1;
    }

    .event-type {
      font-size: 0.8rem;
      color: #f1f5f9;
    }

    .event-detail {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .event-time {
      font-size: 0.7rem;
      color: #6b7280;
    }

    /* 系统摘要 */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
    }

    @media (max-width: 640px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .summary-item {
      background: rgba(30, 41, 59, 0.6);
      border-radius: 0.75rem;
      padding: 1rem;
      text-align: center;
    }

    .summary-label {
      display: block;
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .summary-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .summary-value.healthy { color: #10b981; }
    .summary-value.warning { color: #f59e0b; }
    .summary-value.critical { color: #ef4444; }
  `]
})
export class OpsDashboardComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private router = inject(Router);
  private realtimeService = inject(RealtimeEventsService);

  // 状态
  loading = signal(false);
  stats = signal<DashboardStats | null>(null);
  recentEvents = signal<RealtimeEvent[]>([]);
  isConnected = signal(false);
  lastUpdate = signal<Date>(new Date());

  // 计算属性
  systemStatus = computed(() => {
    const s = this.stats();
    if (!s) return 'warning';
    if (s.alerts.critical > 0 || s.health.unhealthy > 0) return 'critical';
    if (s.alerts.warning > 0 || s.health.degraded > 0) return 'warning';
    return 'healthy';
  });

  systemStatusText = computed(() => {
    const status = this.systemStatus();
    return status === 'healthy' ? '系统正常' : 
           status === 'warning' ? '需要关注' : '存在问题';
  });

  lastUpdateTime = computed(() => {
    return this.lastUpdate().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });

  // 快速操作
  quickActions = computed((): QuickAction[] => {
    const s = this.stats();
    return [
      {
        id: 'pool',
        icon: '🌐',
        title: 'API 池管理',
        description: '添加、移除、配置 API',
        route: '/admin/api-pool'
      },
      {
        id: 'alerts',
        icon: '🔔',
        title: '告警中心',
        description: '查看和处理告警',
        route: '/admin/alerts',
        badge: s?.alerts?.total || 0,
        status: (s?.alerts?.critical || 0) > 0 ? 'critical' : 
                (s?.alerts?.warning || 0) > 0 ? 'warning' : 'normal'
      },
      {
        id: 'stats',
        icon: '📊',
        title: '统计分析',
        description: '查看详细统计数据',
        route: '/admin/api-stats'
      },
      {
        id: 'audit',
        icon: '📋',
        title: '审计日志',
        description: '查询操作记录',
        route: '/admin/audit-logs'
      },
      {
        id: 'capacity',
        icon: '📈',
        title: '容量规划',
        description: '容量趋势和预测',
        route: '/admin/capacity'
      },
      {
        id: 'purchase-orders',
        icon: '🧾',
        title: '购买订单',
        description: '会员/配额购买对账',
        route: '/admin/purchase-orders'
      },
      {
        id: 'health',
        icon: '💚',
        title: '健康检查',
        description: '执行 API 健康检查',
        action: () => this.runHealthCheck()
      }
    ];
  });

  // 附加统计
  serviceStatus = signal('healthy');
  serviceStatusText = computed(() => {
    const s = this.serviceStatus();
    return s === 'healthy' ? '运行中' : s === 'warning' ? '部分异常' : '服务异常';
  });
  todayLogins = signal(0);
  todayAlerts = signal(0);
  uptime = signal('--');

  private subscriptions: Subscription[] = [];
  private refreshInterval: any;

  ngOnInit(): void {
    this.loadDashboard();
    this.setupRealtimeEvents();
    
    // 🔧 Phase2: 30s→60s 降低輪詢頻率
    this.refreshInterval = setInterval(() => this.loadDashboard(), 60000);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async loadDashboard(): Promise<void> {
    this.loading.set(true);
    
    try {
      const result = await this.ipc.invoke('dashboard:get-data');
      
      if (result?.success) {
        const data = result.data;
        
        this.stats.set({
          pool: data.pool || {},
          health: data.health || {},
          alerts: data.alerts || {},
          login: data.login || {}
        });
        
        // 更新附加统计
        this.todayLogins.set(data.stats?.today_logins || 0);
        this.todayAlerts.set(data.stats?.today_alerts || 0);
        this.uptime.set(this.formatUptime(data.uptime || 0));
        
        this.lastUpdate.set(new Date());
      }
    } catch (e) {
      console.error('Load dashboard failed:', e);
    } finally {
      this.loading.set(false);
    }
  }

  setupRealtimeEvents(): void {
    // 监听连接状态
    this.subscriptions.push(
      this.realtimeService.getConnectionState().subscribe(state => {
        this.isConnected.set(state === 'connected');
      })
    );

    // 监听所有事件
    this.subscriptions.push(
      this.realtimeService.events().subscribe(event => {
        const events = [...this.recentEvents()];
        events.unshift(event);
        this.recentEvents.set(events.slice(0, 20));
        
        // 某些事件触发刷新
        if (event.type.startsWith('alert.') || event.type.startsWith('capacity.')) {
          this.loadDashboard();
        }
      })
    );

    // 加载初始事件
    this.recentEvents.set(this.realtimeService.getRecentEvents(20));
  }

  refresh(): void {
    this.loadDashboard();
  }

  executeAction(action: QuickAction): void {
    if (action.route) {
      this.router.navigate([action.route]);
    } else if (action.action) {
      action.action();
    }
  }

  async runHealthCheck(): Promise<void> {
    try {
      await this.ipc.invoke('health:run-check');
      this.loadDashboard();
    } catch (e) {
      console.error('Health check failed:', e);
    }
  }

  getEventClass(event: RealtimeEvent): string {
    if (event.type.includes('critical') || event.type.includes('exhausted')) {
      return 'critical';
    }
    if (event.type.includes('warning') || event.type.includes('failed')) {
      return 'warning';
    }
    if (event.type.includes('success') || event.type.includes('recovered')) {
      return 'success';
    }
    return '';
  }

  getEventIcon(event: RealtimeEvent): string {
    const icons: Record<string, string> = {
      'alert.new': '🔔',
      'alert.resolved': '✅',
      'capacity.warning': '⚠️',
      'capacity.critical': '🚨',
      'api.added': '➕',
      'api.disabled': '🚫',
      'api.recovered': '💚',
      'login.success': '🔓',
      'login.failed': '🔐',
      'stats.update': '📊'
    };
    return icons[event.type] || '📌';
  }

  formatEventType(type: string): string {
    const labels: Record<string, string> = {
      'alert.new': '新告警',
      'alert.resolved': '告警解决',
      'capacity.warning': '容量警告',
      'capacity.critical': '容量危急',
      'api.added': 'API 添加',
      'api.disabled': 'API 禁用',
      'api.recovered': 'API 恢复',
      'login.success': '登录成功',
      'login.failed': '登录失败',
      'stats.update': '统计更新'
    };
    return labels[type] || type;
  }

  getEventDetail(event: RealtimeEvent): string {
    if (event.data?.message) return event.data.message;
    if (event.data?.api_id) return `API: ${event.data.api_id}`;
    if (event.data?.phone) return `账号: ${event.data.phone}`;
    return '';
  }

  formatEventTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`;
    return `${Math.floor(seconds / 86400)}天`;
  }
}
