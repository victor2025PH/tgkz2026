import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

@Component({
  selector: 'app-analytics-charts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-charts-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .analytics-charts-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    canvas {
      max-height: 400px;
    }
  `]
})
export class AnalyticsChartsComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() chartType: 'line' | 'bar' | 'doughnut' = 'line';
  @Input() data = signal<TimeSeriesData | null>(null);
  @Input() title = signal<string>('');
  @Input() options: ChartConfiguration['options'] = {};

  private chart: Chart | null = null;

  ngOnInit() {
    // Chart will be created when data is available
  }

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnChanges() {
    if (this.chart) {
      this.updateChart();
    } else if (this.chartCanvas) {
      this.createChart();
    }
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart() {
    if (!this.chartCanvas || !this.data()) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const chartData = this.data();
    if (!chartData) {
      return;
    }

    const defaultOptions: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: !!this.title(),
          text: this.title(),
        },
      },
      scales: this.chartType !== 'doughnut' ? {
        x: {
          display: true,
        },
        y: {
          display: true,
          beginAtZero: true,
        },
      } : undefined,
    };

    const config: ChartConfiguration = {
      type: this.chartType,
      data: chartData,
      options: { ...defaultOptions, ...this.options },
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart() {
    if (!this.chart || !this.data()) {
      return;
    }

    const chartData = this.data();
    if (!chartData) {
      return;
    }

    this.chart.data = chartData;
    this.chart.update();
  }

  public updateData(newData: TimeSeriesData) {
    this.data.set(newData);
    this.updateChart();
  }
}

