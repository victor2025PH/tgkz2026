import { Component, Input, OnInit, OnDestroy, OnChanges, AfterViewInit, ViewChild, ElementRef, signal, computed } from '@angular/core';
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
    borderColor?: string | string[];
    backgroundColor?: string | string[];
    fill?: boolean;
    borderWidth?: number;
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
export class AnalyticsChartsComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() chartType: 'line' | 'bar' | 'doughnut' = 'line';
  @Input() data: TimeSeriesData | null = null;
  private _data = signal<TimeSeriesData | null>(null);
  @Input() title: string = '';
  private _title = signal<string>('');
  @Input() options: ChartConfiguration['options'] = {};

  private chart: Chart | null = null;

  ngOnInit() {
    // Initialize data signals
    if (this.data !== null) {
      this._data.set(this.data);
    }
    if (this.title) {
      this._title.set(this.title);
    }
  }

  ngAfterViewInit() {
    this.createChart();
  }

  ngOnChanges() {
    // Update internal signals when inputs change
    if (this.data !== null) {
      this._data.set(this.data);
    }
    if (this.title !== undefined) {
      this._title.set(this.title);
    }
    // Update chart if it exists, otherwise create it
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
    if (!this.chartCanvas || !this._data()) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const chartData = this._data();
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
          display: !!this._title(),
          text: this._title(),
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
    if (!this.chart || !this._data()) {
      return;
    }

    const chartData = this._data();
    if (!chartData) {
      return;
    }

    this.chart.data = chartData;
    this.chart.update();
  }

  public updateData(newData: TimeSeriesData) {
    this._data.set(newData);
    this.updateChart();
  }
}

