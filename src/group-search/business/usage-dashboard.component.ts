/**
 * TG-AI智控王 使用統計儀表板組件
 * Usage Dashboard Component v1.0
 * 
 * 💡 設計思考：
 * 1. 實時數據 - 展示即時統計
 * 2. 趨勢分析 - 歷史數據可視化
 * 3. 預警系統 - 配額接近上限時提醒
 * 4. 成本追蹤 - API 調用成本分析
 * 5. 導出報告 - 一鍵導出統計報告
 */

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// ============ 類型定義 ============

export interface UsageMetric {
  id: string;
  name: string;
  value: number;
  limit?: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  icon: string;
  color: string;
}

export interface UsageAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  timestamp: number;
  dismissed?: boolean;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
  label: string;
}

export interface UsageCategory {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-usage-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="usage-dashboard">
      <!-- 頂部概覽卡片 -->
      <div class="metrics-grid">
        <div 
          *ngFor="let metric of metrics()"
          class="metric-card"
          [style.--accent-color]="metric.color">
          
          <div class="metric-icon">{{ metric.icon }}</div>
          
          <div class="metric-content">
            <div class="metric-name">{{ metric.name }}</div>
            <div class="metric-value">
              {{ formatValue(metric.value) }}
              <span class="metric-unit">{{ metric.unit }}</span>
            </div>
            
            <!-- 進度條（如果有限制） -->
            <div class="metric-progress" *ngIf="metric.limit">
              <div 
                class="progress-bar"
                [style.width.%]="(metric.value / metric.limit) * 100"
                [class.warning]="metric.value / metric.limit > 0.7"
                [class.danger]="metric.value / metric.limit > 0.9">
              </div>
              <span class="progress-text">
                {{ formatValue(metric.limit - metric.value) }} 剩餘
              </span>
            </div>
            
            <!-- 趨勢 -->
            <div class="metric-trend" [class]="metric.trend">
              <span class="trend-icon">
                {{ metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→' }}
              </span>
              <span>{{ metric.trendPercent }}%</span>
              <span class="trend-label">vs 昨日</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 警告提示 -->
      <div class="alerts-section" *ngIf="activeAlerts().length > 0">
        <div 
          *ngFor="let alert of activeAlerts()"
          class="alert-item"
          [class]="alert.type">
          <span class="alert-icon">
            {{ alert.type === 'danger' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️' }}
          </span>
          <div class="alert-content">
            <div class="alert-title">{{ alert.title }}</div>
            <div class="alert-message">{{ alert.message }}</div>
          </div>
          <button class="alert-dismiss" (click)="dismissAlert(alert.id)">×</button>
        </div>
      </div>
      
      <!-- 圖表區域 -->
      <div class="charts-section">
        <!-- 趨勢圖 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>使用趨勢</h3>
            <div class="chart-controls">
              <button 
                *ngFor="let range of timeRanges"
                [class.active]="selectedRange() === range.value"
                (click)="selectTimeRange(range.value)">
                {{ range.label }}
              </button>
            </div>
          </div>
          
          <div class="chart-container">
            <svg viewBox="0 0 800 300" class="trend-chart">
              <!-- 網格線 -->
              <g class="grid-lines">
                <line *ngFor="let y of [0, 1, 2, 3, 4]" 
                      [attr.x1]="50" 
                      [attr.y1]="50 + y * 50" 
                      [attr.x2]="750" 
                      [attr.y2]="50 + y * 50" />
              </g>
              
              <!-- 數據線 -->
              <path 
                class="data-line"
                [attr.d]="chartPath()"
                fill="none"
                stroke="var(--primary-color)"
                stroke-width="2" />
              
              <!-- 數據點 -->
              <g class="data-points">
                <circle 
                  *ngFor="let point of chartData(); let i = index"
                  [attr.cx]="50 + (i / (chartData().length - 1)) * 700"
                  [attr.cy]="250 - (point.value / maxChartValue()) * 200"
                  r="4"
                  fill="var(--primary-color)" />
              </g>
              
              <!-- X 軸標籤 -->
              <g class="x-labels">
                <text 
                  *ngFor="let point of chartData(); let i = index"
                  [attr.x]="50 + (i / (chartData().length - 1)) * 700"
                  y="280"
                  text-anchor="middle"
                  font-size="12"
                  fill="#666">
                  {{ point.label }}
                </text>
              </g>
            </svg>
          </div>
        </div>
        
        <!-- 分類統計 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>功能使用分佈</h3>
          </div>
          
          <div class="distribution-chart">
            <!-- 環形圖 -->
            <div class="donut-chart">
              <svg viewBox="0 0 200 200">
                <circle 
                  *ngFor="let category of categories(); let i = index"
                  class="donut-segment"
                  cx="100" cy="100" r="80"
                  [style.stroke]="category.color"
                  [style.stroke-dasharray]="getStrokeDasharray(category, i)"
                  [style.stroke-dashoffset]="getStrokeDashoffset(i)"
                  fill="none"
                  stroke-width="30" />
              </svg>
              <div class="donut-center">
                <div class="total-value">{{ totalUsage() }}</div>
                <div class="total-label">總計</div>
              </div>
            </div>
            
            <!-- 圖例 -->
            <div class="chart-legend">
              <div 
                *ngFor="let category of categories()"
                class="legend-item">
                <span class="legend-color" [style.background]="category.color"></span>
                <span class="legend-name">{{ category.name }}</span>
                <span class="legend-value">{{ category.value }}</span>
                <span class="legend-percent">{{ category.percentage.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 詳細統計表格 -->
      <div class="stats-table-section">
        <div class="section-header">
          <h3>詳細統計</h3>
          <button class="export-btn" (click)="exportReport()">
            📊 導出報告
          </button>
        </div>
        
        <table class="stats-table">
          <thead>
            <tr>
              <th>指標</th>
              <th>今日</th>
              <th>昨日</th>
              <th>本週</th>
              <th>本月</th>
              <th>變化</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of tableData()">
              <td class="metric-cell">
                <span class="metric-icon-small">{{ row.icon }}</span>
                {{ row.name }}
              </td>
              <td>{{ formatValue(row.today) }}</td>
              <td>{{ formatValue(row.yesterday) }}</td>
              <td>{{ formatValue(row.week) }}</td>
              <td>{{ formatValue(row.month) }}</td>
              <td [class]="row.change >= 0 ? 'positive' : 'negative'">
                {{ row.change >= 0 ? '+' : '' }}{{ row.change.toFixed(1) }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- AI 成本追蹤 -->
      <div class="cost-tracking-section">
        <div class="section-header">
          <h3>💰 AI 成本追蹤</h3>
        </div>
        
        <div class="cost-cards">
          <div class="cost-card">
            <div class="cost-label">今日成本</div>
            <div class="cost-value">\${{ costStats().today.toFixed(4) }}</div>
          </div>
          <div class="cost-card">
            <div class="cost-label">本月成本</div>
            <div class="cost-value">\${{ costStats().month.toFixed(2) }}</div>
          </div>
          <div class="cost-card">
            <div class="cost-label">預計月費</div>
            <div class="cost-value">\${{ costStats().projected.toFixed(2) }}</div>
          </div>
          <div class="cost-card">
            <div class="cost-label">Token 使用</div>
            <div class="cost-value">{{ formatValue(costStats().tokens) }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .usage-dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    /* 指標卡片網格 */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .metric-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      gap: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-left: 4px solid var(--accent-color, #6366f1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }
    
    .metric-icon {
      font-size: 32px;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(99, 102, 241, 0.1);
      border-radius: 10px;
    }
    
    .metric-content {
      flex: 1;
    }
    
    .metric-name {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 4px;
    }
    
    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .metric-unit {
      font-size: 14px;
      color: #94a3b8;
      font-weight: 400;
    }
    
    .metric-progress {
      margin-top: 12px;
      position: relative;
    }
    
    .progress-bar {
      height: 6px;
      background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 3px;
      transition: width 0.3s;
    }
    
    .progress-bar.warning {
      background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }
    
    .progress-bar.danger {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }
    
    .progress-text {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
      display: block;
    }
    
    .metric-trend {
      margin-top: 8px;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .metric-trend.up {
      color: #10b981;
    }
    
    .metric-trend.down {
      color: #ef4444;
    }
    
    .metric-trend.stable {
      color: #64748b;
    }
    
    .trend-label {
      color: #94a3b8;
    }
    
    /* 警告提示 */
    .alerts-section {
      margin-bottom: 24px;
    }
    
    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    
    .alert-item.warning {
      background: #fef3c7;
      border: 1px solid #f59e0b;
    }
    
    .alert-item.danger {
      background: #fee2e2;
      border: 1px solid #ef4444;
    }
    
    .alert-item.info {
      background: #dbeafe;
      border: 1px solid #3b82f6;
    }
    
    .alert-icon {
      font-size: 20px;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .alert-message {
      font-size: 13px;
      color: #64748b;
    }
    
    .alert-dismiss {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #94a3b8;
    }
    
    /* 圖表區域 */
    .charts-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    
    @media (max-width: 1024px) {
      .charts-section {
        grid-template-columns: 1fr;
      }
    }
    
    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .chart-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .chart-controls {
      display: flex;
      gap: 8px;
    }
    
    .chart-controls button {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .chart-controls button.active {
      background: #6366f1;
      color: white;
      border-color: #6366f1;
    }
    
    .chart-container {
      height: 300px;
    }
    
    .trend-chart {
      width: 100%;
      height: 100%;
    }
    
    .grid-lines line {
      stroke: #e2e8f0;
      stroke-dasharray: 4;
    }
    
    .data-line {
      stroke: #6366f1;
      stroke-width: 2;
      fill: none;
    }
    
    .data-points circle {
      fill: #6366f1;
    }
    
    /* 環形圖 */
    .distribution-chart {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    
    .donut-chart {
      position: relative;
      width: 200px;
      height: 200px;
    }
    
    .donut-segment {
      transform: rotate(-90deg);
      transform-origin: center;
      transition: stroke-dasharray 0.3s;
    }
    
    .donut-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    
    .total-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .total-label {
      font-size: 13px;
      color: #64748b;
    }
    
    .chart-legend {
      flex: 1;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    
    .legend-name {
      flex: 1;
      font-size: 14px;
    }
    
    .legend-value {
      font-weight: 600;
      font-size: 14px;
    }
    
    .legend-percent {
      color: #64748b;
      font-size: 13px;
      width: 50px;
      text-align: right;
    }
    
    /* 統計表格 */
    .stats-table-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      margin-bottom: 24px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .export-btn {
      padding: 8px 16px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    
    .export-btn:hover {
      background: #4f46e5;
    }
    
    .stats-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .stats-table th,
    .stats-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .stats-table th {
      font-weight: 600;
      color: #64748b;
      font-size: 13px;
      text-transform: uppercase;
    }
    
    .metric-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .metric-icon-small {
      font-size: 18px;
    }
    
    .positive {
      color: #10b981;
    }
    
    .negative {
      color: #ef4444;
    }
    
    /* 成本追蹤 */
    .cost-tracking-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    
    .cost-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .cost-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 20px;
      color: white;
    }
    
    .cost-label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    
    .cost-value {
      font-size: 24px;
      font-weight: 700;
    }
  `]
})
export class UsageDashboardComponent implements OnInit, OnDestroy {
  // 時間範圍選項
  timeRanges = [
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
    { label: '90天', value: '90d' }
  ];
  
  // 狀態
  selectedRange = signal('7d');
  
  // 模擬數據
  metrics = signal<UsageMetric[]>([
    { id: 'searches', name: '搜索次數', value: 1247, limit: 5000, unit: '次', trend: 'up', trendPercent: 12.5, icon: '🔍', color: '#6366f1' },
    { id: 'members', name: '提取成員', value: 8934, limit: 50000, unit: '人', trend: 'up', trendPercent: 23.1, icon: '👥', color: '#10b981' },
    { id: 'messages', name: '發送消息', value: 456, limit: 1000, unit: '條', trend: 'down', trendPercent: 5.2, icon: '💬', color: '#f59e0b' },
    { id: 'ai_calls', name: 'AI 調用', value: 234, limit: 500, unit: '次', trend: 'stable', trendPercent: 0.8, icon: '🤖', color: '#8b5cf6' }
  ]);
  
  alerts = signal<UsageAlert[]>([
    { id: '1', type: 'warning', title: '配額提醒', message: '消息發送配額已使用 45%，請注意控制使用量', timestamp: Date.now() },
    { id: '2', type: 'info', title: '新功能上線', message: 'AI 知識庫功能已上線，快來試試！', timestamp: Date.now() }
  ]);
  
  activeAlerts = computed(() => this.alerts().filter(a => !a.dismissed));
  
  categories = signal<UsageCategory[]>([
    { name: '群組搜索', value: 450, percentage: 36, color: '#6366f1' },
    { name: '成員提取', value: 320, percentage: 26, color: '#10b981' },
    { name: '批量消息', value: 180, percentage: 14, color: '#f59e0b' },
    { name: 'AI 回覆', value: 150, percentage: 12, color: '#8b5cf6' },
    { name: '數據導出', value: 100, percentage: 8, color: '#ec4899' },
    { name: '其他', value: 50, percentage: 4, color: '#94a3b8' }
  ]);
  
  totalUsage = computed(() => 
    this.categories().reduce((sum, c) => sum + c.value, 0)
  );
  
  chartData = signal<TimeSeriesPoint[]>([
    { timestamp: Date.now() - 6 * 86400000, value: 120, label: '週一' },
    { timestamp: Date.now() - 5 * 86400000, value: 180, label: '週二' },
    { timestamp: Date.now() - 4 * 86400000, value: 150, label: '週三' },
    { timestamp: Date.now() - 3 * 86400000, value: 220, label: '週四' },
    { timestamp: Date.now() - 2 * 86400000, value: 190, label: '週五' },
    { timestamp: Date.now() - 1 * 86400000, value: 280, label: '週六' },
    { timestamp: Date.now(), value: 240, label: '週日' }
  ]);
  
  maxChartValue = computed(() => 
    Math.max(...this.chartData().map(p => p.value)) * 1.1
  );
  
  chartPath = computed(() => {
    const data = this.chartData();
    const max = this.maxChartValue();
    
    return data.map((point, i) => {
      const x = 50 + (i / (data.length - 1)) * 700;
      const y = 250 - (point.value / max) * 200;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  });
  
  tableData = signal([
    { name: '群組搜索', icon: '🔍', today: 89, yesterday: 76, week: 520, month: 1890, change: 17.1 },
    { name: '成員提取', icon: '👥', today: 1234, yesterday: 987, week: 6543, month: 23456, change: 25.0 },
    { name: '消息發送', icon: '💬', today: 45, yesterday: 52, week: 310, month: 1120, change: -13.5 },
    { name: 'AI 調用', icon: '🤖', today: 23, yesterday: 21, week: 145, month: 567, change: 9.5 },
    { name: '數據導出', icon: '📊', today: 5, yesterday: 3, week: 28, month: 89, change: 66.7 }
  ]);
  
  costStats = signal({
    today: 0.0234,
    month: 1.87,
    projected: 5.62,
    tokens: 234567
  });
  
  private refreshInterval?: number;
  
  ngOnInit(): void {
    // 定時刷新數據
    this.refreshInterval = window.setInterval(() => {
      this.refreshData();
    }, 30000);
  }
  
  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  selectTimeRange(range: string): void {
    this.selectedRange.set(range);
    this.refreshData();
  }
  
  dismissAlert(id: string): void {
    this.alerts.update(alerts => 
      alerts.map(a => a.id === id ? { ...a, dismissed: true } : a)
    );
  }
  
  formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toLocaleString();
  }
  
  getStrokeDasharray(category: UsageCategory, index: number): string {
    const circumference = 2 * Math.PI * 80;
    const segmentLength = (category.percentage / 100) * circumference;
    return `${segmentLength} ${circumference}`;
  }
  
  getStrokeDashoffset(index: number): number {
    const circumference = 2 * Math.PI * 80;
    let offset = 0;
    
    for (let i = 0; i < index; i++) {
      offset += (this.categories()[i].percentage / 100) * circumference;
    }
    
    return -offset;
  }
  
  refreshData(): void {
    // 模擬數據刷新
    console.log('[UsageDashboard] Refreshing data...');
  }
  
  exportReport(): void {
    // 導出報告
    const report = {
      generatedAt: new Date().toISOString(),
      metrics: this.metrics(),
      categories: this.categories(),
      tableData: this.tableData(),
      costStats: this.costStats()
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}
