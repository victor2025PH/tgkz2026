/**
 * API 池状态卡片组件
 * 
 * 可复用的小部件，显示 API 池的关键状态
 * 
 * 功能：
 * 1. 实时显示容量状态
 * 2. 健康状态指示
 * 3. 点击可展开详情
 * 4. 支持多种尺寸
 */

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronIpcService } from '../electron-ipc.service';

interface PoolStatus {
  total_apis: number;
  available_apis: number;
  full_apis: number;
  exhausted_apis: number;
  disabled_apis: number;
  utilization: number;
  health: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

type CardSize = 'small' | 'medium' | 'large';

@Component({
  selector: 'app-api-pool-status-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="status-card" 
      [class]="'size-' + size"
      [class.expanded]="expanded()"
      [class.clickable]="clickable"
      (click)="handleClick()">
      
      <!-- 紧凑视图 -->
      @if (size === 'small') {
        <div class="compact-view">
          <div class="status-indicator" [class]="overallStatus()">
            <span class="indicator-dot"></span>
          </div>
          <div class="compact-info">
            <span class="compact-value">{{ status()?.available_apis || 0 }}/{{ status()?.total_apis || 0 }}</span>
            <span class="compact-label">API 可用</span>
          </div>
        </div>
      }
      
      <!-- 标准视图 -->
      @if (size === 'medium') {
        <div class="standard-view">
          <div class="card-header">
            <span class="card-icon">🌐</span>
            <span class="card-title">API 池状态</span>
            <span class="status-badge" [class]="overallStatus()">
              {{ statusText() }}
            </span>
          </div>
          
          <div class="capacity-bar">
            <div class="capacity-segments">
              <div 
                class="segment available" 
                [style.width.%]="availablePercent()">
              </div>
              <div 
                class="segment full" 
                [style.width.%]="fullPercent()">
              </div>
              <div 
                class="segment exhausted" 
                [style.width.%]="exhaustedPercent()">
              </div>
            </div>
          </div>
          
          <div class="stats-row">
            <div class="stat">
              <span class="stat-value available">{{ status()?.available_apis || 0 }}</span>
              <span class="stat-label">可用</span>
            </div>
            <div class="stat">
              <span class="stat-value full">{{ status()?.full_apis || 0 }}</span>
              <span class="stat-label">已满</span>
            </div>
            <div class="stat">
              <span class="stat-value exhausted">{{ (status()?.exhausted_apis || 0) + (status()?.disabled_apis || 0) }}</span>
              <span class="stat-label">不可用</span>
            </div>
          </div>
        </div>
      }
      
      <!-- 详细视图 -->
      @if (size === 'large') {
        <div class="detailed-view">
          <div class="card-header">
            <div class="header-left">
              <span class="card-icon">🌐</span>
              <div>
                <div class="card-title">API 池状态</div>
                <div class="card-subtitle">实时监控</div>
              </div>
            </div>
            <span class="status-badge large" [class]="overallStatus()">
              {{ statusText() }}
            </span>
          </div>
          
          <!-- 主要指标 -->
          <div class="main-metric">
            <div class="metric-value">
              {{ status()?.utilization || 0 | number:'1.0-1' }}%
            </div>
            <div class="metric-label">使用率</div>
          </div>
          
          <!-- 容量条 -->
          <div class="capacity-section">
            <div class="capacity-labels">
              <span>容量分布</span>
              <span>{{ status()?.total_apis || 0 }} 个 API</span>
            </div>
            <div class="capacity-bar large">
              <div class="capacity-segments">
                <div class="segment available" [style.width.%]="availablePercent()"></div>
                <div class="segment full" [style.width.%]="fullPercent()"></div>
                <div class="segment exhausted" [style.width.%]="exhaustedPercent()"></div>
              </div>
            </div>
            <div class="capacity-legend">
              <span class="legend-item">
                <span class="legend-dot available"></span>
                可用 {{ status()?.available_apis || 0 }}
              </span>
              <span class="legend-item">
                <span class="legend-dot full"></span>
                已满 {{ status()?.full_apis || 0 }}
              </span>
              <span class="legend-item">
                <span class="legend-dot exhausted"></span>
                不可用 {{ (status()?.exhausted_apis || 0) + (status()?.disabled_apis || 0) }}
              </span>
            </div>
          </div>
          
          <!-- 健康状态 -->
          <div class="health-section">
            <div class="section-title">健康状态</div>
            <div class="health-grid">
              <div class="health-item healthy">
                <span class="health-icon">💚</span>
                <span class="health-value">{{ status()?.health?.healthy || 0 }}</span>
                <span class="health-label">健康</span>
              </div>
              <div class="health-item degraded">
                <span class="health-icon">💛</span>
                <span class="health-value">{{ status()?.health?.degraded || 0 }}</span>
                <span class="health-label">降级</span>
              </div>
              <div class="health-item unhealthy">
                <span class="health-icon">❤️</span>
                <span class="health-value">{{ status()?.health?.unhealthy || 0 }}</span>
                <span class="health-label">异常</span>
              </div>
            </div>
          </div>
          
          <!-- 展开详情按钮 -->
          @if (clickable) {
            <div class="card-footer">
              <button class="details-btn" (click)="handleClick(); $event.stopPropagation()">
                查看详情 →
              </button>
            </div>
          }
        </div>
      }
      
      <!-- 加载状态 -->
      @if (loading()) {
        <div class="loading-overlay">
          <div class="loading-spinner"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .status-card {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 0.75rem;
      border: 1px solid rgba(255,255,255,0.1);
      position: relative;
      overflow: hidden;
      transition: all 0.2s;
    }

    .status-card.clickable {
      cursor: pointer;
    }

    .status-card.clickable:hover {
      border-color: rgba(59, 130, 246, 0.5);
      transform: translateY(-2px);
    }

    /* 尺寸变体 */
    .size-small {
      padding: 0.5rem 0.75rem;
    }

    .size-medium {
      padding: 1rem;
    }

    .size-large {
      padding: 1.25rem;
    }

    /* 紧凑视图 */
    .compact-view {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-indicator.healthy { background: #10b981; }
    .status-indicator.warning { background: #f59e0b; }
    .status-indicator.critical { background: #ef4444; }

    .indicator-dot {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .compact-info {
      display: flex;
      flex-direction: column;
    }

    .compact-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .compact-label {
      font-size: 0.65rem;
      color: #6b7280;
    }

    /* 标准视图 */
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .card-icon {
      font-size: 1.25rem;
    }

    .card-title {
      flex: 1;
      font-size: 0.875rem;
      font-weight: 500;
      color: #f1f5f9;
    }

    .status-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 1rem;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .status-badge.healthy {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-badge.warning {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .status-badge.critical {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .status-badge.large {
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
    }

    /* 容量条 */
    .capacity-bar {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .capacity-bar.large {
      height: 10px;
      border-radius: 5px;
    }

    .capacity-segments {
      display: flex;
      height: 100%;
    }

    .segment {
      height: 100%;
      transition: width 0.3s;
    }

    .segment.available { background: #10b981; }
    .segment.full { background: #f59e0b; }
    .segment.exhausted { background: #ef4444; }

    /* 统计行 */
    .stats-row {
      display: flex;
      justify-content: space-between;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .stat-value.available { color: #10b981; }
    .stat-value.full { color: #f59e0b; }
    .stat-value.exhausted { color: #ef4444; }

    .stat-label {
      font-size: 0.65rem;
      color: #6b7280;
    }

    /* 详细视图 */
    .detailed-view .card-header {
      margin-bottom: 1rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
    }

    .card-subtitle {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .main-metric {
      text-align: center;
      padding: 1rem 0;
      margin-bottom: 1rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.5rem;
    }

    .main-metric .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .main-metric .metric-label {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .capacity-section,
    .health-section {
      margin-bottom: 1rem;
    }

    .capacity-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }

    .capacity-legend {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.7rem;
      color: #94a3b8;
    }

    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .legend-dot.available { background: #10b981; }
    .legend-dot.full { background: #f59e0b; }
    .legend-dot.exhausted { background: #ef4444; }

    .section-title {
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }

    .health-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }

    .health-item {
      text-align: center;
      padding: 0.5rem;
      background: rgba(255,255,255,0.03);
      border-radius: 0.5rem;
    }

    .health-icon {
      display: block;
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }

    .health-value {
      display: block;
      font-size: 1.25rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .health-label {
      font-size: 0.65rem;
      color: #6b7280;
    }

    .card-footer {
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      text-align: center;
    }

    .details-btn {
      background: transparent;
      border: 1px solid rgba(59, 130, 246, 0.5);
      color: #3b82f6;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .details-btn:hover {
      background: rgba(59, 130, 246, 0.1);
    }

    /* 加载状态 */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(30, 41, 59, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 2px solid rgba(255,255,255,0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ApiPoolStatusCardComponent implements OnInit, OnDestroy {
  @Input() size: CardSize = 'medium';
  @Input() clickable = true;
  @Input() autoRefresh = true;
  @Input() refreshInterval = 10000;
  
  @Output() clicked = new EventEmitter<void>();
  @Output() statusChange = new EventEmitter<PoolStatus>();

  private ipc: ElectronIpcService;
  private refreshTimer: any;

  status = signal<PoolStatus | null>(null);
  loading = signal(false);
  expanded = signal(false);

  // 计算属性
  overallStatus = computed(() => {
    const s = this.status();
    if (!s) return 'warning';
    
    const unhealthyCount = (s.exhausted_apis || 0) + (s.disabled_apis || 0);
    if (unhealthyCount > 0 || s.utilization > 90) return 'critical';
    if (s.full_apis > 0 || s.utilization > 70) return 'warning';
    return 'healthy';
  });

  statusText = computed(() => {
    const status = this.overallStatus();
    return status === 'healthy' ? '正常' : 
           status === 'warning' ? '警告' : '异常';
  });

  availablePercent = computed(() => {
    const s = this.status();
    if (!s || !s.total_apis) return 0;
    return (s.available_apis / s.total_apis) * 100;
  });

  fullPercent = computed(() => {
    const s = this.status();
    if (!s || !s.total_apis) return 0;
    return (s.full_apis / s.total_apis) * 100;
  });

  exhaustedPercent = computed(() => {
    const s = this.status();
    if (!s || !s.total_apis) return 0;
    return ((s.exhausted_apis + (s.disabled_apis || 0)) / s.total_apis) * 100;
  });

  constructor(ipc: ElectronIpcService) {
    this.ipc = ipc;
  }

  ngOnInit(): void {
    this.loadStatus();
    
    if (this.autoRefresh) {
      this.refreshTimer = setInterval(() => this.loadStatus(), this.refreshInterval);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async loadStatus(): Promise<void> {
    this.loading.set(true);
    
    try {
      const result = await this.ipc.invoke('api-pool:status');
      
      if (result?.success) {
        const newStatus = result.data;
        this.status.set(newStatus);
        this.statusChange.emit(newStatus);
      }
    } catch (e) {
      console.error('Load pool status failed:', e);
    } finally {
      this.loading.set(false);
    }
  }

  handleClick(): void {
    if (this.clickable) {
      this.clicked.emit();
    }
  }

  toggleExpanded(): void {
    this.expanded.update(v => !v);
  }
}
