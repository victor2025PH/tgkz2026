/**
 * 容量趋势图表组件
 * 
 * 功能：
 * 1. 容量使用率趋势图
 * 2. 预测耗尽时间
 * 3. 扩容建议展示
 * 4. 历史数据对比
 */

import { Component, signal, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from './admin.service';

interface CapacitySnapshot {
  timestamp: number;
  usage_percent: number;
  available_capacity: number;
  available_apis: number;
}

interface CapacityPrediction {
  trend: 'increasing' | 'stable' | 'decreasing';
  rate_per_hour: number;
  estimated_full_hours: number | null;
  confidence: number;
}

interface ExpansionRecommendation {
  action: string;
  urgency: string;
  suggested_apis: number;
  message: string;
}

interface CapacityStatus {
  snapshot: {
    timestamp: number;
    total_capacity: number;
    used_capacity: number;
    available_capacity: number;
    usage_percent: number;
    available_apis: number;
    full_apis: number;
  };
  prediction: CapacityPrediction;
  recommendation: ExpansionRecommendation;
}

@Component({
  selector: 'app-capacity-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="capacity-chart-container">
      <!-- 當前狀態卡片 -->
      <div class="status-section">
        <div class="status-card main">
          <div class="gauge-container">
            <svg class="gauge" viewBox="0 0 100 50">
              <!-- 背景弧 -->
              <path 
                d="M 10 45 A 35 35 0 0 1 90 45" 
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                stroke-width="8"
                stroke-linecap="round"/>
              <!-- 使用率弧 -->
              <path 
                [attr.d]="getGaugeArc(currentUsage())"
                fill="none" 
                [attr.stroke]="getUsageColor(currentUsage())" 
                stroke-width="8"
                stroke-linecap="round"
                class="gauge-fill"/>
            </svg>
            <div class="gauge-value">
              <span class="value">{{ currentUsage().toFixed(1) }}</span>
              <span class="unit">%</span>
            </div>
            <div class="gauge-label">容量使用率</div>
          </div>
        </div>

        <div class="status-cards-grid">
          <div class="status-card small">
            <div class="card-icon">📦</div>
            <div class="card-content">
              <div class="card-value">{{ status()?.snapshot?.total_capacity || 0 }}</div>
              <div class="card-label">总容量</div>
            </div>
          </div>
          <div class="status-card small">
            <div class="card-icon">✅</div>
            <div class="card-content">
              <div class="card-value">{{ status()?.snapshot?.available_capacity || 0 }}</div>
              <div class="card-label">剩余容量</div>
            </div>
          </div>
          <div class="status-card small">
            <div class="card-icon">🔌</div>
            <div class="card-content">
              <div class="card-value">{{ status()?.snapshot?.available_apis || 0 }}</div>
              <div class="card-label">可用 API</div>
            </div>
          </div>
          <div class="status-card small">
            <div class="card-icon">🔒</div>
            <div class="card-content">
              <div class="card-value">{{ status()?.snapshot?.full_apis || 0 }}</div>
              <div class="card-label">已满 API</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 趋势图表 -->
      <div class="chart-section">
        <div class="chart-header">
          <h3>📈 容量趋势（24小时）</h3>
          <div class="trend-indicator" [class]="prediction()?.trend || ''">
            {{ getTrendIcon(prediction()?.trend) }}
            {{ getTrendLabel(prediction()?.trend) }}
            @if (prediction()?.rate_per_hour) {
              <span class="rate">{{ prediction()!.rate_per_hour > 0 ? '+' : '' }}{{ prediction()!.rate_per_hour }}%/h</span>
            }
          </div>
        </div>

        <div class="chart-container">
          <div class="chart-y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>
          <div class="chart-area">
            <!-- 阈值线 -->
            <div class="threshold-line warning" style="bottom: 75%">
              <span class="threshold-label">警告</span>
            </div>
            <div class="threshold-line critical" style="bottom: 90%">
              <span class="threshold-label">严重</span>
            </div>

            <!-- 数据点和折线 -->
            <svg class="chart-svg" preserveAspectRatio="none">
              <!-- 区域填充 -->
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
                  <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
                </linearGradient>
              </defs>
              <path [attr.d]="getAreaPath()" fill="url(#areaGradient)"/>
              <path [attr.d]="getLinePath()" fill="none" stroke="#3b82f6" stroke-width="2"/>
              
              <!-- 数据点 -->
              @for (point of chartPoints(); track point.x; let i = $index) {
                <circle 
                  [attr.cx]="point.x" 
                  [attr.cy]="point.y" 
                  r="3" 
                  fill="#3b82f6"
                  class="data-point"
                  (mouseenter)="showTooltip($event, i)"
                  (mouseleave)="hideTooltip()"/>
              }
            </svg>
          </div>
          <div class="chart-x-axis">
            <span>24h前</span>
            <span>18h前</span>
            <span>12h前</span>
            <span>6h前</span>
            <span>现在</span>
          </div>
        </div>
      </div>

      <!-- 预测和建议 -->
      <div class="prediction-section">
        @if (prediction()?.estimated_full_hours !== null && prediction()?.estimated_full_hours !== undefined) {
          <div class="prediction-card" [class]="getPredictionUrgency()">
            <div class="prediction-icon">⏱️</div>
            <div class="prediction-content">
              <div class="prediction-title">预计容量耗尽时间</div>
              <div class="prediction-value">
                @if (prediction()!.estimated_full_hours! <= 24) {
                  <span class="urgent">{{ prediction()!.estimated_full_hours!.toFixed(1) }} 小时</span>
                } @else {
                  {{ (prediction()!.estimated_full_hours! / 24).toFixed(1) }} 天
                }
              </div>
              <div class="prediction-confidence">
                置信度: {{ (prediction()!.confidence * 100).toFixed(0) }}%
              </div>
            </div>
          </div>
        }

        @if (recommendation()) {
          <div class="recommendation-card" [class]="recommendation()!.urgency">
            <div class="recommendation-header">
              <span class="recommendation-icon">{{ getRecommendationIcon(recommendation()!.urgency) }}</span>
              <span class="recommendation-title">扩容建议</span>
            </div>
            <div class="recommendation-message">{{ recommendation()!.message }}</div>
            @if (recommendation()!.suggested_apis > 0) {
              <div class="recommendation-action">
                建议添加 <strong>{{ recommendation()!.suggested_apis }}</strong> 个 API
              </div>
            }
          </div>
        }
      </div>

      <!-- 工具提示 -->
      @if (tooltip()) {
        <div class="tooltip" [style.left.px]="tooltip()!.x" [style.top.px]="tooltip()!.y">
          <div class="tooltip-time">{{ tooltip()!.time }}</div>
          <div class="tooltip-value">{{ tooltip()!.value.toFixed(1) }}%</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .capacity-chart-container {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 1rem;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
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

    /* 状态区域 */
    .status-section {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .status-card.main {
      flex: 0 0 200px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gauge-container {
      text-align: center;
    }

    .gauge {
      width: 160px;
      height: 80px;
    }

    .gauge-fill {
      transition: stroke-dasharray 0.5s ease;
    }

    .gauge-value {
      margin-top: -1.5rem;
      display: flex;
      align-items: baseline;
      justify-content: center;
    }

    .gauge-value .value {
      font-size: 2rem;
      font-weight: 700;
      color: #f1f5f9;
    }

    .gauge-value .unit {
      font-size: 1rem;
      color: #9ca3af;
      margin-left: 0.25rem;
    }

    .gauge-label {
      font-size: 0.75rem;
      color: #9ca3af;
      margin-top: 0.25rem;
    }

    .status-cards-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
    }

    .status-card.small {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      padding: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-card.small .card-icon {
      font-size: 1.5rem;
    }

    .status-card.small .card-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .status-card.small .card-label {
      font-size: 0.7rem;
      color: #9ca3af;
    }

    /* 图表区域 */
    .chart-section {
      margin-bottom: 1.5rem;
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .chart-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .trend-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.8rem;
      background: rgba(255, 255, 255, 0.05);
      color: #9ca3af;
    }

    .trend-indicator.increasing {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
    }

    .trend-indicator.decreasing {
      background: rgba(34, 197, 94, 0.1);
      color: #4ade80;
    }

    .trend-indicator .rate {
      font-weight: 600;
    }

    .chart-container {
      display: flex;
      height: 200px;
    }

    .chart-y-axis {
      width: 40px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding-right: 0.5rem;
      font-size: 0.7rem;
      color: #6b7280;
      text-align: right;
    }

    .chart-area {
      flex: 1;
      position: relative;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .chart-svg {
      width: 100%;
      height: 100%;
    }

    .threshold-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      border-top: 1px dashed;
    }

    .threshold-line.warning {
      border-color: rgba(245, 158, 11, 0.5);
    }

    .threshold-line.critical {
      border-color: rgba(239, 68, 68, 0.5);
    }

    .threshold-label {
      position: absolute;
      right: 0.5rem;
      top: -0.5rem;
      font-size: 0.6rem;
      color: #6b7280;
    }

    .data-point {
      cursor: pointer;
      transition: r 0.2s;
    }

    .data-point:hover {
      r: 5;
    }

    .chart-x-axis {
      display: flex;
      justify-content: space-between;
      padding-top: 0.5rem;
      padding-left: 40px;
      font-size: 0.7rem;
      color: #6b7280;
    }

    /* 预测区域 */
    .prediction-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }

    .prediction-card, .recommendation-card {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .prediction-card {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .prediction-card.high, .prediction-card.critical {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .prediction-icon {
      font-size: 2rem;
    }

    .prediction-title {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .prediction-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .prediction-value .urgent {
      color: #f87171;
    }

    .prediction-confidence {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .recommendation-card.low {
      border: 1px solid rgba(34, 197, 94, 0.3);
    }

    .recommendation-card.medium {
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .recommendation-card.high, .recommendation-card.critical {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .recommendation-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .recommendation-icon {
      font-size: 1.25rem;
    }

    .recommendation-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    .recommendation-message {
      font-size: 0.8rem;
      color: #d1d5db;
      margin-bottom: 0.5rem;
    }

    .recommendation-action {
      font-size: 0.8rem;
      color: #9ca3af;
    }

    .recommendation-action strong {
      color: #3b82f6;
      font-size: 1rem;
    }

    /* 工具提示 */
    .tooltip {
      position: absolute;
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 0.375rem;
      padding: 0.5rem 0.75rem;
      pointer-events: none;
      z-index: 1000;
      transform: translate(-50%, -100%);
      margin-top: -0.5rem;
    }

    .tooltip-time {
      font-size: 0.7rem;
      color: #9ca3af;
    }

    .tooltip-value {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
    }

    @media (max-width: 768px) {
      .status-section {
        flex-direction: column;
      }

      .status-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class CapacityChartComponent implements OnInit, OnDestroy {
  @Input() refreshInterval = 60000; // 刷新間隔

  private adminService = inject(AdminService);

  // 狀態
  status = signal<CapacityStatus | null>(null);
  history = signal<CapacitySnapshot[]>([]);
  chartPoints = signal<Array<{ x: number; y: number; value: number; time: string }>>([]);
  tooltip = signal<{ x: number; y: number; time: string; value: number } | null>(null);

  // 刷新定時器
  private refreshTimer: any;

  ngOnInit(): void {
    this.loadData();
    this.refreshTimer = setInterval(() => this.loadData(), this.refreshInterval);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  async loadData(): Promise<void> {
    try {
      const [result, historyResult] = await Promise.all([
        this.adminService.getCapacityStatus(),
        this.adminService.getCapacityHistory(24),
      ]);

      if (result?.success && result.data) {
        this.status.set(result.data as CapacityStatus);
      }

      if (historyResult?.success && Array.isArray(historyResult.data)) {
        this.history.set(historyResult.data as CapacitySnapshot[]);
        this.calculateChartPoints();
      }
    } catch (e) {
      console.error('Load capacity data failed:', e);
    }
  }

  private calculateChartPoints(): void {
    const data = this.history();
    if (data.length === 0) return;

    const width = 100; // SVG 视图宽度百分比
    const height = 100; // SVG 视图高度百分比

    const points = data.map((snapshot, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - (snapshot.usage_percent / 100) * height;
      
      return {
        x: x + '%',
        y: y + '%',
        value: snapshot.usage_percent,
        time: new Date(snapshot.timestamp * 1000).toLocaleTimeString()
      };
    });

    // 转换为像素坐标（假设 SVG 大小）
    this.chartPoints.set(points.map((p, i) => ({
      x: (i / (points.length - 1)) * 100,
      y: 100 - p.value,
      value: p.value,
      time: p.time
    })));
  }

  currentUsage(): number {
    return this.status()?.snapshot?.usage_percent || 0;
  }

  prediction(): CapacityPrediction | null {
    return this.status()?.prediction || null;
  }

  recommendation(): ExpansionRecommendation | null {
    return this.status()?.recommendation || null;
  }

  // 仪表盘弧线
  getGaugeArc(percent: number): string {
    const clampedPercent = Math.min(100, Math.max(0, percent));
    const angle = (clampedPercent / 100) * 180;
    const radians = (angle - 180) * (Math.PI / 180);
    
    const centerX = 50;
    const centerY = 45;
    const radius = 35;
    
    const endX = centerX + radius * Math.cos(radians);
    const endY = centerY + radius * Math.sin(radians);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return `M 10 45 A 35 35 0 ${largeArc} 1 ${endX} ${endY}`;
  }

  getUsageColor(percent: number): string {
    if (percent >= 90) return '#ef4444';
    if (percent >= 75) return '#f59e0b';
    return '#22c55e';
  }

  getLinePath(): string {
    const points = this.chartPoints();
    if (points.length === 0) return '';

    return points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
    ).join(' ');
  }

  getAreaPath(): string {
    const points = this.chartPoints();
    if (points.length === 0) return '';

    const linePath = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`
    ).join(' ');

    return `${linePath} L 100% 100% L 0% 100% Z`;
  }

  getTrendIcon(trend: string | undefined): string {
    if (trend === 'increasing') return '📈';
    if (trend === 'decreasing') return '📉';
    return '➡️';
  }

  getTrendLabel(trend: string | undefined): string {
    if (trend === 'increasing') return '上升中';
    if (trend === 'decreasing') return '下降中';
    return '稳定';
  }

  getPredictionUrgency(): string {
    const hours = this.prediction()?.estimated_full_hours;
    if (hours === null || hours === undefined) return '';
    if (hours <= 6) return 'critical';
    if (hours <= 24) return 'high';
    return '';
  }

  getRecommendationIcon(urgency: string): string {
    if (urgency === 'critical') return '🚨';
    if (urgency === 'high') return '⚠️';
    if (urgency === 'medium') return 'ℹ️';
    return '✅';
  }

  showTooltip(event: MouseEvent, index: number): void {
    const point = this.chartPoints()[index];
    if (point) {
      this.tooltip.set({
        x: event.pageX,
        y: event.pageY,
        time: point.time,
        value: point.value
      });
    }
  }

  hideTooltip(): void {
    this.tooltip.set(null);
  }
}
