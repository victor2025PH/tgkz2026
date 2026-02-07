/**
 * 🔧 P14-5: 業務分析 Chart.js 圖表組件
 * 
 * 將業務數據轉換為 Chart.js 可視化：
 * 1. 每日趨勢折線圖（雙 Y 軸：線索 + 消息）
 * 2. 轉化漏斗水平柱狀圖
 * 3. 線索來源餅圖
 * 
 * 使用既有的 AnalyticsChartsComponent 作為渲染基礎。
 */

import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, ElementRef, AfterViewInit, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

// 複用 BusinessApiService 中的類型
export interface DailyTrendInput {
  date: string;
  leads: number;
  messages: number;
}

export interface FunnelStageInput {
  stage: string;
  count: number;
  percentage: number;
}

export interface LeadSourceInput {
  source: string;
  count: number;
  avg_score: number;
  high_quality_count: number;
}

@Component({
  selector: 'app-business-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="business-charts-wrapper space-y-6">
      <!-- 每日趨勢折線圖 -->
      @if (mode === 'trends' && trendData.length > 0) {
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📈</span> 每日趨勢（近 {{ trendData.length }} 天）
          </h3>
          <div class="relative" style="height: 280px;">
            <canvas #trendCanvas></canvas>
          </div>
        </div>
      }

      <!-- 轉化漏斗柱狀圖 -->
      @if (mode === 'funnel' && funnelData.length > 0) {
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔻</span> 轉化漏斗
          </h3>
          <div class="relative" style="height: 240px;">
            <canvas #funnelCanvas></canvas>
          </div>
        </div>
      }

      <!-- 線索來源餅圖 -->
      @if (mode === 'sources' && sourceData.length > 0) {
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🏷️</span> 線索來源分佈
          </h3>
          <div class="relative" style="height: 260px;">
            <canvas #sourceCanvas></canvas>
          </div>
        </div>
      }

      <!-- 混合模式：趨勢 + 漏斗 -->
      @if (mode === 'all') {
        @if (trendData.length > 0) {
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📈</span> 每日趨勢
            </h3>
            <div class="relative" style="height: 260px;">
              <canvas #trendCanvas></canvas>
            </div>
          </div>
        }
        @if (funnelData.length > 0) {
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔻</span> 轉化漏斗
            </h3>
            <div class="relative" style="height: 220px;">
              <canvas #funnelCanvas></canvas>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    canvas { max-width: 100%; }
  `]
})
export class BusinessChartsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() mode: 'trends' | 'funnel' | 'sources' | 'all' = 'all';
  @Input() trendData: DailyTrendInput[] = [];
  @Input() funnelData: FunnelStageInput[] = [];
  @Input() sourceData: LeadSourceInput[] = [];

  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('funnelCanvas') funnelCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sourceCanvas') sourceCanvas?: ElementRef<HTMLCanvasElement>;

  private trendChart: Chart | null = null;
  private funnelChart: Chart | null = null;
  private sourceChart: Chart | null = null;

  // 深色主題全局配置
  private readonly chartColors = {
    gridColor: 'rgba(148, 163, 184, 0.1)',
    textColor: 'rgba(203, 213, 225, 0.8)',
    blue: 'rgb(59, 130, 246)',
    blueAlpha: 'rgba(59, 130, 246, 0.15)',
    purple: 'rgb(168, 85, 247)',
    purpleAlpha: 'rgba(168, 85, 247, 0.15)',
    cyan: 'rgb(6, 182, 212)',
    cyanAlpha: 'rgba(6, 182, 212, 0.15)',
    green: 'rgb(34, 197, 94)',
    amber: 'rgb(245, 158, 11)',
    red: 'rgb(239, 68, 68)',
    funnelGradient: [
      'rgba(59, 130, 246, 0.8)',    // 藍
      'rgba(6, 182, 212, 0.8)',     // 青
      'rgba(34, 197, 94, 0.8)',     // 綠
      'rgba(245, 158, 11, 0.8)',    // 橙
      'rgba(168, 85, 247, 0.8)',    // 紫
    ],
    piePalette: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(6, 182, 212, 0.8)',
      'rgba(34, 197, 94, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(168, 85, 247, 0.8)',
      'rgba(239, 68, 68, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(99, 102, 241, 0.8)',
    ]
  };

  ngAfterViewInit() {
    // 延遲渲染確保 canvas 已掛載
    setTimeout(() => this.renderAll(), 50);
  }

  ngOnChanges(changes: SimpleChanges) {
    // 數據變更時重新渲染
    if (changes['trendData'] || changes['funnelData'] || changes['sourceData']) {
      setTimeout(() => this.renderAll(), 50);
    }
  }

  ngOnDestroy() {
    this.destroyAll();
  }

  private renderAll() {
    if (this.trendData.length > 0 && this.trendCanvas) {
      this.renderTrendChart();
    }
    if (this.funnelData.length > 0 && this.funnelCanvas) {
      this.renderFunnelChart();
    }
    if (this.sourceData.length > 0 && this.sourceCanvas) {
      this.renderSourceChart();
    }
  }

  private destroyAll() {
    this.trendChart?.destroy();
    this.funnelChart?.destroy();
    this.sourceChart?.destroy();
    this.trendChart = null;
    this.funnelChart = null;
    this.sourceChart = null;
  }

  // ==================== 趨勢折線圖 ====================

  private renderTrendChart() {
    if (!this.trendCanvas) return;
    this.trendChart?.destroy();

    const ctx = this.trendCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.trendData.map(d => {
      // 簡化日期顯示 (2024-01-15 → 01/15)
      const parts = d.date.split('-');
      return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : d.date;
    });

    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '新線索',
            data: this.trendData.map(d => d.leads),
            borderColor: this.chartColors.blue,
            backgroundColor: this.chartColors.blueAlpha,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: this.trendData.length > 20 ? 0 : 3,
            pointHoverRadius: 5,
            yAxisID: 'y',
          },
          {
            label: '消息數',
            data: this.trendData.map(d => d.messages),
            borderColor: this.chartColors.purple,
            backgroundColor: this.chartColors.purpleAlpha,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: this.trendData.length > 20 ? 0 : 3,
            pointHoverRadius: 5,
            yAxisID: 'y1',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: this.chartColors.textColor, boxWidth: 12, padding: 16 },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(203, 213, 225, 0.9)',
            borderColor: 'rgba(100, 116, 139, 0.3)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { color: this.chartColors.gridColor },
            ticks: { color: this.chartColors.textColor, maxRotation: 45, maxTicksLimit: 15 },
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: this.chartColors.gridColor },
            ticks: { color: this.chartColors.blue },
            title: { display: true, text: '線索', color: this.chartColors.blue },
            beginAtZero: true,
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: this.chartColors.purple },
            title: { display: true, text: '消息', color: this.chartColors.purple },
            beginAtZero: true,
          },
        },
      },
    });
  }

  // ==================== 漏斗柱狀圖 ====================

  private renderFunnelChart() {
    if (!this.funnelCanvas) return;
    this.funnelChart?.destroy();

    const ctx = this.funnelCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.funnelData.map(d => d.stage);
    const data = this.funnelData.map(d => d.count);
    const bgColors = this.funnelData.map((_, i) =>
      this.chartColors.funnelGradient[i % this.chartColors.funnelGradient.length]
    );

    this.funnelChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '數量',
          data,
          backgroundColor: bgColors,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 36,
        }],
      },
      options: {
        indexAxis: 'y',  // 水平柱狀圖 — 漏斗效果
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(203, 213, 225, 0.9)',
            borderColor: 'rgba(100, 116, 139, 0.3)',
            borderWidth: 1,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const pct = this.funnelData[idx]?.percentage || 0;
                return `${ctx.formattedValue} (${pct}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: this.chartColors.gridColor },
            ticks: { color: this.chartColors.textColor },
            beginAtZero: true,
          },
          y: {
            grid: { display: false },
            ticks: { color: this.chartColors.textColor, font: { size: 13 } },
          },
        },
      },
    });
  }

  // ==================== 來源餅圖 ====================

  private renderSourceChart() {
    if (!this.sourceCanvas) return;
    this.sourceChart?.destroy();

    const ctx = this.sourceCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const top8 = this.sourceData.slice(0, 8);
    const labels = top8.map(d => d.source || '未知');
    const data = top8.map(d => d.count);

    this.sourceChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: this.chartColors.piePalette.slice(0, top8.length),
          borderWidth: 2,
          borderColor: 'rgba(15, 23, 42, 0.8)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: this.chartColors.textColor,
              boxWidth: 12,
              padding: 10,
              font: { size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#fff',
            bodyColor: 'rgba(203, 213, 225, 0.9)',
            borderColor: 'rgba(100, 116, 139, 0.3)',
            borderWidth: 1,
            cornerRadius: 8,
          },
        },
      },
    });
  }
}
