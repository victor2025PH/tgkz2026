import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronIpcService } from './electron-ipc.service';

interface PerformanceMetric {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_mb: number;
  disk_usage_percent: number;
  active_connections: number;
  queue_length: number;
  avg_query_time_ms: number;
  avg_send_delay_ms: number;
}

interface PerformanceSummary {
  status: string;
  collection_period: {
    start: string;
    end: string;
    duration_seconds: number;
  };
  cpu: {
    current: number;
    average: number;
    max: number;
    min: number;
  };
  memory: {
    current_percent: number;
    average_percent: number;
    max_percent: number;
    min_percent: number;
  };
  query_performance: {
    average_time_ms: number;
    max_time_ms: number;
    min_time_ms: number;
    sample_count: number;
  };
  send_performance: {
    average_delay_ms: number;
    max_delay_ms: number;
    min_delay_ms: number;
    sample_count: number;
  };
  connections: {
    active: number;
    total_registered: number;
  };
  queue: {
    current_length: number;
    average_length: number;
    max_length: number;
  };
}

interface PerformanceAlert {
  timestamp: string;
  alerts: string[];
  metrics: PerformanceMetric;
}

@Component({
  selector: 'app-performance-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold">性能监控</h2>
        <div class="flex gap-2">
          <button 
            (click)="refreshSummary()"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            刷新
          </button>
          <button 
            (click)="toggleAutoRefresh()"
            [class]="autoRefreshEnabled() ? 'px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600' : 'px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600'"
          >
            {{ autoRefreshEnabled() ? '停止自动刷新' : '开始自动刷新' }}
          </button>
        </div>
      </div>

      <!-- Alerts -->
      <div *ngIf="alerts().length > 0" class="space-y-2">
        <div 
          *ngFor="let alert of alerts()"
          class="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded"
        >
          <div class="flex justify-between">
            <div>
              <p class="font-semibold text-yellow-800">性能告警</p>
              <p class="text-sm text-yellow-700">{{ alert.timestamp | date:'short' }}</p>
            </div>
          </div>
          <ul class="mt-2 list-disc list-inside">
            <li *ngFor="let msg of alert.alerts" class="text-yellow-800">{{ msg }}</li>
          </ul>
        </div>
      </div>

      <!-- Summary Cards -->
      <div *ngIf="summary()" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- CPU Usage -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">CPU 使用率</h3>
            <span class="text-2xl font-bold" [class]="getCpuColorClass(summary()!.cpu.current)">
              {{ summary()!.cpu.current.toFixed(1) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all"
              [class]="getCpuColorClass(summary()!.cpu.current, true)"
              [style.width.%]="summary()!.cpu.current"
            ></div>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            平均: {{ summary()!.cpu.average.toFixed(1) }}% | 
            最大: {{ summary()!.cpu.max.toFixed(1) }}%
          </div>
        </div>

        <!-- Memory Usage -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">内存使用率</h3>
            <span class="text-2xl font-bold" [class]="getMemoryColorClass(summary()!.memory.current_percent)">
              {{ summary()!.memory.current_percent.toFixed(1) }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div 
              class="h-2 rounded-full transition-all"
              [class]="getMemoryColorClass(summary()!.memory.current_percent, true)"
              [style.width.%]="summary()!.memory.current_percent"
            ></div>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            平均: {{ summary()!.memory.average_percent.toFixed(1) }}% | 
            最大: {{ summary()!.memory.max_percent.toFixed(1) }}%
          </div>
        </div>

        <!-- Active Connections -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">活跃连接</h3>
            <span class="text-2xl font-bold text-blue-600">
              {{ summary()!.connections.active }}
            </span>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            已注册: {{ summary()!.connections.total_registered }}
          </div>
        </div>

        <!-- Queue Length -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="flex justify-between items-center mb-2">
            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400">消息队列</h3>
            <span class="text-2xl font-bold text-purple-600">
              {{ summary()!.queue.current_length }}
            </span>
          </div>
          <div class="mt-2 text-xs text-gray-500">
            平均: {{ summary()!.queue.average_length.toFixed(0) }} | 
            最大: {{ summary()!.queue.max_length }}
          </div>
        </div>
      </div>

      <!-- Performance Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- CPU Chart -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold mb-4">CPU 使用率趋势</h3>
          <div class="h-64 flex items-end justify-between gap-1">
            <div 
              *ngFor="let metric of recentMetrics(); let i = index"
              class="flex-1 bg-blue-500 rounded-t transition-all"
              [style.height.%]="metric.cpu_percent"
              [title]="metric.cpu_percent.toFixed(1) + '% - ' + (metric.timestamp | date:'short')"
            ></div>
          </div>
        </div>

        <!-- Memory Chart -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold mb-4">内存使用率趋势</h3>
          <div class="h-64 flex items-end justify-between gap-1">
            <div 
              *ngFor="let metric of recentMetrics(); let i = index"
              class="flex-1 bg-green-500 rounded-t transition-all"
              [style.height.%]="metric.memory_percent"
              [title]="metric.memory_percent.toFixed(1) + '% - ' + (metric.timestamp | date:'short')"
            ></div>
          </div>
        </div>
      </div>

      <!-- Performance Details -->
      <div *ngIf="summary()" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Query Performance -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold mb-4">查询性能</h3>
          <div *ngIf="summary() && summary()!.query_performance.sample_count > 0" class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">平均时间</span>
              <span class="font-semibold">{{ summary()!.query_performance.average_time_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">最大时间</span>
              <span class="font-semibold">{{ summary()!.query_performance.max_time_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">最小时间</span>
              <span class="font-semibold">{{ summary()!.query_performance.min_time_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">采样数</span>
              <span class="font-semibold">{{ summary()!.query_performance.sample_count }}</span>
            </div>
          </div>
          <div *ngIf="!summary() || summary()!.query_performance.sample_count === 0" class="text-gray-500 text-center py-4">
            暂无数据
          </div>
        </div>

        <!-- Send Performance -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 class="text-lg font-semibold mb-4">发送性能</h3>
          <div *ngIf="summary() && summary()!.send_performance.sample_count > 0" class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">平均延迟</span>
              <span class="font-semibold">{{ summary()!.send_performance.average_delay_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">最大延迟</span>
              <span class="font-semibold">{{ summary()!.send_performance.max_delay_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">最小延迟</span>
              <span class="font-semibold">{{ summary()!.send_performance.min_delay_ms.toFixed(2) }} ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">采样数</span>
              <span class="font-semibold">{{ summary()!.send_performance.sample_count }}</span>
            </div>
          </div>
          <div *ngIf="!summary() || summary()!.send_performance.sample_count === 0" class="text-gray-500 text-center py-4">
            暂无数据
          </div>
        </div>
      </div>

      <!-- Recent Metrics Table -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div class="p-4 border-b">
          <h3 class="text-lg font-semibold">最近性能指标</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">时间</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">CPU</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">内存</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">连接</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">队列</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">查询时间</th>
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">发送延迟</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr *ngFor="let metric of recentMetrics()" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-4 py-2 text-sm">{{ metric.timestamp | date:'short' }}</td>
                <td class="px-4 py-2 text-sm">{{ metric.cpu_percent.toFixed(1) }}%</td>
                <td class="px-4 py-2 text-sm">{{ metric.memory_percent.toFixed(1) }}%</td>
                <td class="px-4 py-2 text-sm">{{ metric.active_connections }}</td>
                <td class="px-4 py-2 text-sm">{{ metric.queue_length }}</td>
                <td class="px-4 py-2 text-sm">{{ metric.avg_query_time_ms.toFixed(2) }} ms</td>
                <td class="px-4 py-2 text-sm">{{ metric.avg_send_delay_ms.toFixed(2) }} ms</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class PerformanceMonitorComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  
  summary = signal<PerformanceSummary | null>(null);
  metrics = signal<PerformanceMetric[]>([]);
  alerts = signal<PerformanceAlert[]>([]);
  autoRefreshEnabled = signal<boolean>(false);
  
  recentMetrics = computed(() => {
    return this.metrics().slice(-20).reverse(); // Last 20 metrics, newest first
  });

  private refreshInterval: any = null;

  ngOnInit() {
    this.setupEventListeners();
    this.refreshSummary();
    this.loadMetrics();
  }

  ngOnDestroy() {
    this.removeEventListeners();
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  setupEventListeners() {
    // Listen for performance summary response
    this.ipcService.on('performance-summary', (data: PerformanceSummary) => {
      this.summary.set(data);
    });

    // Listen for performance metrics response
    this.ipcService.on('performance-metrics', (response: any) => {
      if (response && response.metrics) {
        this.metrics.set(response.metrics);
      }
    });

    // Listen for real-time performance metrics
    this.ipcService.on('performance-metric', (data: PerformanceMetric) => {
      this.metrics.update(metrics => {
        const newMetrics = [...metrics, data];
        // Keep only last 100 metrics
        return newMetrics.slice(-100);
      });
    });

    // Listen for performance alerts
    this.ipcService.on('performance-alert', (data: PerformanceAlert) => {
      this.alerts.update(alerts => {
        const newAlerts = [data, ...alerts];
        // Keep only last 10 alerts
        return newAlerts.slice(0, 10);
      });
    });
  }

  removeEventListeners() {
    this.ipcService.cleanup('performance-metric');
    this.ipcService.cleanup('performance-alert');
  }

  refreshSummary() {
    // Send request and listen for response
    this.ipcService.send('get-performance-summary');
  }

  loadMetrics() {
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 3600000).toISOString(); // Last hour

    // Send request and listen for response
    this.ipcService.send('get-performance-metrics', {
      startTime,
      endTime,
      limit: 100
    });
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled.update(enabled => !enabled);
    
    if (this.autoRefreshEnabled()) {
      this.refreshInterval = setInterval(() => {
        this.refreshSummary();
        this.loadMetrics();
      }, 30000); // Refresh every 30 seconds to reduce load
    } else {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
        this.refreshInterval = null;
      }
    }
  }

  getCpuColorClass(value: number, isBar: boolean = false): string {
    if (isBar) {
      if (value >= 80) return 'bg-red-500';
      if (value >= 60) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (value >= 80) return 'text-red-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-green-600';
    }
  }

  getMemoryColorClass(value: number, isBar: boolean = false): string {
    if (isBar) {
      if (value >= 85) return 'bg-red-500';
      if (value >= 70) return 'bg-yellow-500';
      return 'bg-green-500';
    } else {
      if (value >= 85) return 'text-red-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-green-600';
    }
  }
}

