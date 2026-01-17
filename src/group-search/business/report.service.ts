/**
 * TG-AI智控王 高級報表服務
 * Advanced Report Service v1.0
 * 
 * 💡 設計思考：
 * 1. 多維度分析 - 時間/群組/成員/操作
 * 2. 可視化圖表 - 支持多種圖表類型
 * 3. 定制報表 - 用戶自定義指標和維度
 * 4. 自動生成 - 定期生成報表
 * 5. 導出格式 - PDF/Excel/PNG
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IndexedDBService } from '../performance/indexed-db.service';
import { WorkerPoolService } from '../performance/worker-pool.service';

// ============ 類型定義 ============

export type ReportType = 
  | 'overview'      // 總覽
  | 'search'        // 搜索分析
  | 'member'        // 成員分析
  | 'message'       // 消息分析
  | 'automation'    // 自動化分析
  | 'account'       // 帳號分析
  | 'custom';       // 自定義

export type ChartType = 
  | 'line'          // 折線圖
  | 'bar'           // 柱狀圖
  | 'pie'           // 餅圖
  | 'doughnut'      // 環形圖
  | 'area'          // 面積圖
  | 'scatter'       // 散點圖
  | 'radar'         // 雷達圖
  | 'funnel'        // 漏斗圖
  | 'heatmap'       // 熱力圖
  | 'table';        // 表格

export type TimeRange = 
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom';

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  type: ReportType;
  timeRange: TimeRange;
  customDateRange?: { start: Date; end: Date };
  metrics: ReportMetric[];
  dimensions: ReportDimension[];
  filters?: ReportFilter[];
  charts: ChartConfig[];
  schedule?: ReportSchedule;
}

export interface ReportMetric {
  id: string;
  name: string;
  field: string;
  aggregation: 'sum' | 'count' | 'avg' | 'max' | 'min' | 'unique';
  format?: 'number' | 'percent' | 'currency' | 'duration';
}

export interface ReportDimension {
  id: string;
  name: string;
  field: string;
  type: 'time' | 'category' | 'numeric';
  granularity?: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface ReportFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  metrics: string[];
  dimension?: string;
  options?: Record<string, any>;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  recipients?: string[];
  format: 'pdf' | 'excel' | 'email';
}

export interface ReportData {
  id: string;
  configId: string;
  generatedAt: number;
  timeRange: { start: number; end: number };
  summary: Record<string, number>;
  series: SeriesData[];
  tables: TableData[];
}

export interface SeriesData {
  metricId: string;
  dimensionId?: string;
  data: Array<{
    label: string;
    value: number;
    timestamp?: number;
  }>;
}

export interface TableData {
  columns: Array<{ key: string; label: string; type: string }>;
  rows: Array<Record<string, any>>;
  totals?: Record<string, number>;
}

// ============ 預設報表配置 ============

const PRESET_REPORTS: Partial<ReportConfig>[] = [
  {
    id: 'overview',
    name: '數據總覽',
    type: 'overview',
    timeRange: 'last7days',
    metrics: [
      { id: 'searches', name: '搜索次數', field: 'search_count', aggregation: 'count' },
      { id: 'members', name: '提取成員', field: 'member_count', aggregation: 'sum' },
      { id: 'messages', name: '發送消息', field: 'message_count', aggregation: 'sum' },
      { id: 'groups', name: '觸達群組', field: 'group_count', aggregation: 'unique' }
    ],
    dimensions: [
      { id: 'date', name: '日期', field: 'timestamp', type: 'time', granularity: 'day' }
    ],
    charts: [
      { id: 'trend', title: '趨勢圖', type: 'line', metrics: ['searches', 'members', 'messages'] },
      { id: 'distribution', title: '分佈圖', type: 'pie', metrics: ['messages'], dimension: 'source' }
    ]
  },
  {
    id: 'search-analysis',
    name: '搜索分析',
    type: 'search',
    timeRange: 'last30days',
    metrics: [
      { id: 'total_searches', name: '總搜索', field: 'search_count', aggregation: 'count' },
      { id: 'success_rate', name: '成功率', field: 'success', aggregation: 'avg', format: 'percent' },
      { id: 'avg_results', name: '平均結果', field: 'result_count', aggregation: 'avg' },
      { id: 'avg_time', name: '平均耗時', field: 'duration', aggregation: 'avg', format: 'duration' }
    ],
    dimensions: [
      { id: 'date', name: '日期', field: 'timestamp', type: 'time', granularity: 'day' },
      { id: 'source', name: '來源', field: 'source', type: 'category' },
      { id: 'keyword', name: '關鍵詞', field: 'keyword', type: 'category' }
    ],
    charts: [
      { id: 'search_trend', title: '搜索趨勢', type: 'area', metrics: ['total_searches'] },
      { id: 'source_dist', title: '來源分佈', type: 'doughnut', metrics: ['total_searches'], dimension: 'source' },
      { id: 'top_keywords', title: '熱門關鍵詞', type: 'bar', metrics: ['total_searches'], dimension: 'keyword' }
    ]
  },
  {
    id: 'member-analysis',
    name: '成員分析',
    type: 'member',
    timeRange: 'last30days',
    metrics: [
      { id: 'total_extracted', name: '總提取', field: 'extracted_count', aggregation: 'sum' },
      { id: 'active_rate', name: '活躍率', field: 'active', aggregation: 'avg', format: 'percent' },
      { id: 'premium_rate', name: '會員率', field: 'premium', aggregation: 'avg', format: 'percent' },
      { id: 'avg_score', name: '平均評分', field: 'value_score', aggregation: 'avg' }
    ],
    dimensions: [
      { id: 'date', name: '日期', field: 'timestamp', type: 'time', granularity: 'day' },
      { id: 'group', name: '群組', field: 'group_id', type: 'category' },
      { id: 'grade', name: '等級', field: 'grade', type: 'category' }
    ],
    charts: [
      { id: 'extraction_trend', title: '提取趨勢', type: 'line', metrics: ['total_extracted'] },
      { id: 'grade_dist', title: '等級分佈', type: 'pie', metrics: ['total_extracted'], dimension: 'grade' },
      { id: 'quality_radar', title: '質量雷達', type: 'radar', metrics: ['active_rate', 'premium_rate', 'avg_score'] }
    ]
  },
  {
    id: 'message-analysis',
    name: '消息分析',
    type: 'message',
    timeRange: 'last30days',
    metrics: [
      { id: 'total_sent', name: '總發送', field: 'sent_count', aggregation: 'sum' },
      { id: 'success_rate', name: '成功率', field: 'success', aggregation: 'avg', format: 'percent' },
      { id: 'reply_rate', name: '回覆率', field: 'replied', aggregation: 'avg', format: 'percent' },
      { id: 'avg_delay', name: '平均延遲', field: 'delay', aggregation: 'avg', format: 'duration' }
    ],
    dimensions: [
      { id: 'date', name: '日期', field: 'timestamp', type: 'time', granularity: 'day' },
      { id: 'account', name: '帳號', field: 'account_id', type: 'category' },
      { id: 'template', name: '模板', field: 'template_id', type: 'category' }
    ],
    charts: [
      { id: 'send_trend', title: '發送趨勢', type: 'area', metrics: ['total_sent'] },
      { id: 'account_performance', title: '帳號表現', type: 'bar', metrics: ['success_rate', 'reply_rate'], dimension: 'account' },
      { id: 'hourly_heatmap', title: '時段熱力', type: 'heatmap', metrics: ['total_sent'] }
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private db = inject(IndexedDBService);
  private workerPool = inject(WorkerPoolService);
  
  // 報表配置
  private reports = new Map<string, ReportConfig>();
  
  // 生成的報表數據
  private reportData = new Map<string, ReportData>();
  
  // 狀態
  private _isGenerating = signal(false);
  isGenerating = computed(() => this._isGenerating());
  
  private _generationProgress = signal(0);
  generationProgress = computed(() => this._generationProgress());
  
  constructor() {
    this.initializePresets();
  }
  
  // ============ 初始化 ============
  
  private initializePresets(): void {
    for (const preset of PRESET_REPORTS) {
      this.reports.set(preset.id!, preset as ReportConfig);
    }
  }
  
  // ============ 報表配置 ============
  
  /**
   * 獲取報表配置
   */
  getReportConfig(id: string): ReportConfig | undefined {
    return this.reports.get(id);
  }
  
  /**
   * 獲取所有報表配置
   */
  getAllReportConfigs(): ReportConfig[] {
    return [...this.reports.values()];
  }
  
  /**
   * 創建自定義報表
   */
  createReport(config: Omit<ReportConfig, 'id'>): ReportConfig {
    const report: ReportConfig = {
      ...config,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.reports.set(report.id, report);
    this.saveReportConfig(report);
    
    return report;
  }
  
  /**
   * 更新報表配置
   */
  updateReport(id: string, updates: Partial<ReportConfig>): ReportConfig | null {
    const report = this.reports.get(id);
    if (!report) return null;
    
    const updated = { ...report, ...updates };
    this.reports.set(id, updated);
    this.saveReportConfig(updated);
    
    return updated;
  }
  
  /**
   * 刪除報表
   */
  async deleteReport(id: string): Promise<boolean> {
    if (!this.reports.has(id)) return false;
    
    this.reports.delete(id);
    this.reportData.delete(id);
    
    await this.db.delete('reportConfigs', id);
    await this.db.delete('reportData', id);
    
    return true;
  }
  
  private async saveReportConfig(config: ReportConfig): Promise<void> {
    await this.db.put('reportConfigs', config);
  }
  
  // ============ 報表生成 ============
  
  /**
   * 生成報表
   * 
   * 💡 使用 Web Worker 處理大量數據計算
   */
  async generateReport(configId: string): Promise<ReportData> {
    const config = this.reports.get(configId);
    if (!config) {
      throw new Error(`Report config not found: ${configId}`);
    }
    
    this._isGenerating.set(true);
    this._generationProgress.set(0);
    
    try {
      // 計算時間範圍
      const timeRange = this.calculateTimeRange(config.timeRange, config.customDateRange);
      
      // 獲取原始數據
      this._generationProgress.set(10);
      const rawData = await this.fetchRawData(config, timeRange);
      
      // 應用過濾器
      this._generationProgress.set(30);
      const filteredData = this.applyFilters(rawData, config.filters);
      
      // 計算指標
      this._generationProgress.set(50);
      const summary = await this.calculateMetrics(filteredData, config.metrics);
      
      // 生成系列數據
      this._generationProgress.set(70);
      const series = await this.generateSeries(filteredData, config);
      
      // 生成表格數據
      this._generationProgress.set(90);
      const tables = this.generateTables(filteredData, config);
      
      const reportData: ReportData = {
        id: `data_${Date.now()}`,
        configId,
        generatedAt: Date.now(),
        timeRange,
        summary,
        series,
        tables
      };
      
      // 緩存結果
      this.reportData.set(configId, reportData);
      await this.db.put('reportData', reportData);
      
      this._generationProgress.set(100);
      
      return reportData;
      
    } finally {
      this._isGenerating.set(false);
    }
  }
  
  /**
   * 獲取已生成的報表數據
   */
  getReportData(configId: string): ReportData | undefined {
    return this.reportData.get(configId);
  }
  
  // ============ 數據處理 ============
  
  private calculateTimeRange(
    range: TimeRange,
    custom?: { start: Date; end: Date }
  ): { start: number; end: number } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (range) {
      case 'today':
        return { start: today.getTime(), end: now.getTime() };
        
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.getTime(), end: today.getTime() - 1 };
        
      case 'last7days':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        return { start: week.getTime(), end: now.getTime() };
        
      case 'last30days':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        return { start: month.getTime(), end: now.getTime() };
        
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart.getTime(), end: now.getTime() };
        
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: lastMonthStart.getTime(), end: lastMonthEnd.getTime() };
        
      case 'thisYear':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart.getTime(), end: now.getTime() };
        
      case 'custom':
        if (custom) {
          return { start: custom.start.getTime(), end: custom.end.getTime() };
        }
        // 默認最近 30 天
        return this.calculateTimeRange('last30days');
        
      default:
        return this.calculateTimeRange('last30days');
    }
  }
  
  /**
   * 獲取原始數據
   */
  private async fetchRawData(
    config: ReportConfig,
    timeRange: { start: number; end: number }
  ): Promise<any[]> {
    // 根據報表類型從不同存儲獲取數據
    let storeName: string;
    
    switch (config.type) {
      case 'search':
        storeName = 'searchHistory';
        break;
      case 'member':
        storeName = 'members';
        break;
      case 'message':
        storeName = 'messageHistory';
        break;
      case 'account':
        storeName = 'accounts';
        break;
      default:
        // 聚合多個數據源
        return this.fetchAggregatedData(timeRange);
    }
    
    const allData = await this.db.getAll(storeName);
    
    // 過濾時間範圍
    return allData.filter((item: any) => {
      const timestamp = item.timestamp || item.createdAt || item.date;
      return timestamp >= timeRange.start && timestamp <= timeRange.end;
    });
  }
  
  private async fetchAggregatedData(timeRange: { start: number; end: number }): Promise<any[]> {
    // 聚合多個數據源用於總覽報表
    const [searches, members, messages] = await Promise.all([
      this.db.getAll('searchHistory'),
      this.db.getAll('members'),
      this.db.getAll('messageHistory')
    ]);
    
    // 按日期聚合
    const dailyData = new Map<string, any>();
    
    const processItem = (item: any, type: string) => {
      const timestamp = item.timestamp || item.createdAt;
      if (timestamp < timeRange.start || timestamp > timeRange.end) return;
      
      const date = new Date(timestamp).toISOString().split('T')[0];
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          timestamp: new Date(date).getTime(),
          search_count: 0,
          member_count: 0,
          message_count: 0,
          group_count: new Set()
        });
      }
      
      const daily = dailyData.get(date);
      
      switch (type) {
        case 'search':
          daily.search_count++;
          break;
        case 'member':
          daily.member_count++;
          if (item.groupId) daily.group_count.add(item.groupId);
          break;
        case 'message':
          daily.message_count++;
          break;
      }
    };
    
    searches.forEach((s: any) => processItem(s, 'search'));
    members.forEach((m: any) => processItem(m, 'member'));
    messages.forEach((m: any) => processItem(m, 'message'));
    
    return [...dailyData.values()].map(d => ({
      ...d,
      group_count: d.group_count.size
    }));
  }
  
  private applyFilters(data: any[], filters?: ReportFilter[]): any[] {
    if (!filters?.length) return data;
    
    return data.filter(item => {
      for (const filter of filters) {
        const value = item[filter.field];
        
        switch (filter.operator) {
          case 'eq': if (value !== filter.value) return false; break;
          case 'ne': if (value === filter.value) return false; break;
          case 'gt': if (value <= filter.value) return false; break;
          case 'lt': if (value >= filter.value) return false; break;
          case 'gte': if (value < filter.value) return false; break;
          case 'lte': if (value > filter.value) return false; break;
          case 'in': if (!filter.value.includes(value)) return false; break;
          case 'contains': if (!String(value).includes(filter.value)) return false; break;
        }
      }
      return true;
    });
  }
  
  /**
   * 計算指標
   */
  private async calculateMetrics(
    data: any[],
    metrics: ReportMetric[]
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    
    for (const metric of metrics) {
      const values = data.map(item => item[metric.field]).filter(v => v !== undefined);
      
      switch (metric.aggregation) {
        case 'sum':
          result[metric.id] = values.reduce((a, b) => a + (Number(b) || 0), 0);
          break;
        case 'count':
          result[metric.id] = values.length;
          break;
        case 'avg':
          result[metric.id] = values.length > 0 
            ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length 
            : 0;
          break;
        case 'max':
          result[metric.id] = Math.max(...values.map(v => Number(v) || 0));
          break;
        case 'min':
          result[metric.id] = Math.min(...values.map(v => Number(v) || 0));
          break;
        case 'unique':
          result[metric.id] = new Set(values).size;
          break;
      }
    }
    
    return result;
  }
  
  /**
   * 生成系列數據
   */
  private async generateSeries(
    data: any[],
    config: ReportConfig
  ): Promise<SeriesData[]> {
    const series: SeriesData[] = [];
    
    for (const chart of config.charts) {
      if (chart.type === 'table') continue;
      
      for (const metricId of chart.metrics) {
        const metric = config.metrics.find(m => m.id === metricId);
        if (!metric) continue;
        
        const dimension = chart.dimension 
          ? config.dimensions.find(d => d.id === chart.dimension)
          : config.dimensions.find(d => d.type === 'time');
        
        const seriesData: SeriesData = {
          metricId,
          dimensionId: dimension?.id,
          data: []
        };
        
        if (dimension) {
          // 按維度分組
          const groups = this.groupByDimension(data, dimension);
          
          for (const [label, items] of groups) {
            const values = items.map(i => i[metric.field]).filter(v => v !== undefined);
            let value: number;
            
            switch (metric.aggregation) {
              case 'sum':
                value = values.reduce((a, b) => a + (Number(b) || 0), 0);
                break;
              case 'count':
                value = values.length;
                break;
              case 'avg':
                value = values.length > 0 
                  ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length 
                  : 0;
                break;
              default:
                value = values.length;
            }
            
            seriesData.data.push({
              label,
              value,
              timestamp: dimension.type === 'time' ? items[0]?.timestamp : undefined
            });
          }
        }
        
        // 按標籤排序
        if (dimension?.type === 'time') {
          seriesData.data.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        } else {
          seriesData.data.sort((a, b) => b.value - a.value);
        }
        
        series.push(seriesData);
      }
    }
    
    return series;
  }
  
  private groupByDimension(data: any[], dimension: ReportDimension): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const item of data) {
      let key: string;
      
      if (dimension.type === 'time') {
        const timestamp = item[dimension.field] || item.timestamp;
        const date = new Date(timestamp);
        
        switch (dimension.granularity) {
          case 'hour':
            key = `${date.toISOString().slice(0, 13)}:00`;
            break;
          case 'day':
            key = date.toISOString().split('T')[0];
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            key = String(date.getFullYear());
            break;
          default:
            key = date.toISOString().split('T')[0];
        }
      } else {
        key = String(item[dimension.field] || 'Unknown');
      }
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }
    
    return groups;
  }
  
  /**
   * 生成表格數據
   */
  private generateTables(data: any[], config: ReportConfig): TableData[] {
    const tableCharts = config.charts.filter(c => c.type === 'table');
    const tables: TableData[] = [];
    
    for (const chart of tableCharts) {
      const columns = config.metrics
        .filter(m => chart.metrics.includes(m.id))
        .map(m => ({
          key: m.id,
          label: m.name,
          type: m.format || 'number'
        }));
      
      // 添加維度列
      if (chart.dimension) {
        const dim = config.dimensions.find(d => d.id === chart.dimension);
        if (dim) {
          columns.unshift({
            key: dim.id,
            label: dim.name,
            type: dim.type
          });
        }
      }
      
      // TODO: 生成行數據
      const rows: Record<string, any>[] = [];
      
      tables.push({ columns, rows });
    }
    
    return tables;
  }
  
  // ============ 導出功能 ============
  
  /**
   * 導出為 JSON
   */
  exportToJSON(reportData: ReportData): string {
    return JSON.stringify(reportData, null, 2);
  }
  
  /**
   * 導出為 CSV
   */
  exportToCSV(reportData: ReportData): string {
    const rows: string[] = [];
    
    // 摘要
    rows.push('指標,數值');
    for (const [key, value] of Object.entries(reportData.summary)) {
      rows.push(`${key},${value}`);
    }
    rows.push('');
    
    // 系列數據
    for (const series of reportData.series) {
      rows.push(`${series.metricId} - ${series.dimensionId || '時間'}`);
      rows.push('標籤,數值');
      for (const point of series.data) {
        rows.push(`${point.label},${point.value}`);
      }
      rows.push('');
    }
    
    return rows.join('\n');
  }
  
  /**
   * 格式化數值
   */
  formatValue(value: number, format?: string): string {
    switch (format) {
      case 'percent':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      case 'duration':
        if (value < 1000) return `${value}ms`;
        if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
        return `${(value / 60000).toFixed(1)}m`;
      default:
        return value.toLocaleString();
    }
  }
}
