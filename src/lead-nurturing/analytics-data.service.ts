/**
 * TG-AI智控王 分析數據服務
 * Analytics Data Service v1.0
 * 
 * 功能：
 * - 收集和聚合分析數據
 * - 時間序列數據管理
 * - 關鍵指標計算
 * - 數據快照和歷史追蹤
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { Lead, FunnelStage, ConversationType } from './lead.models';

// ============ 類型定義 ============

/** 時間範圍 */
export type TimeRange = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'all';

/** 日期區間 */
export interface DateRange {
  start: Date;
  end: Date;
}

/** 基礎指標 */
export interface BaseMetrics {
  totalLeads: number;
  newLeads: number;
  activeLeads: number;
  convertedLeads: number;
  lostLeads: number;
}

/** 階段分佈 */
export interface StageDistribution {
  stage: FunnelStage;
  count: number;
  percentage: number;
  change: number; // 相比上一時段
}

/** 轉化率指標 */
export interface ConversionMetrics {
  overallRate: number;
  stageRates: {
    from: FunnelStage;
    to: FunnelStage;
    rate: number;
    count: number;
  }[];
  avgTimeToConvert: number; // 毫秒
  trend: 'up' | 'down' | 'stable';
}

/** 互動指標 */
export interface EngagementMetrics {
  totalMessages: number;
  aiMessages: number;
  manualMessages: number;
  avgResponseTime: number;
  responseRate: number;
  avgMessagesPerLead: number;
}

/** 時間序列數據點 */
export interface TimeSeriesDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

/** 時間序列 */
export interface TimeSeries {
  name: string;
  data: TimeSeriesDataPoint[];
  aggregation: 'sum' | 'avg' | 'count' | 'max' | 'min';
}

/** 分析快照 */
export interface AnalyticsSnapshot {
  id: string;
  timestamp: Date;
  timeRange: TimeRange;
  baseMetrics: BaseMetrics;
  stageDistribution: StageDistribution[];
  conversionMetrics: ConversionMetrics;
  engagementMetrics: EngagementMetrics;
}

/** 趨勢數據 */
export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsDataService {
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 當前時間範圍
  private _timeRange = signal<TimeRange>('week');
  timeRange = computed(() => this._timeRange());
  
  // 歷史快照
  private _snapshots = signal<AnalyticsSnapshot[]>([]);
  snapshots = computed(() => this._snapshots());
  
  // 計算的指標
  baseMetrics = computed(() => this.calculateBaseMetrics());
  stageDistribution = computed(() => this.calculateStageDistribution());
  conversionMetrics = computed(() => this.calculateConversionMetrics());
  engagementMetrics = computed(() => this.calculateEngagementMetrics());
  
  constructor() {
    this.loadSnapshots();
  }
  
  // ============ 時間範圍 ============
  
  /**
   * 設置時間範圍
   */
  setTimeRange(range: TimeRange): void {
    this._timeRange.set(range);
  }
  
  /**
   * 獲取日期區間
   */
  getDateRange(range: TimeRange = this._timeRange()): DateRange {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    let start: Date;
    
    switch (range) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case 'all':
      default:
        start = new Date(2020, 0, 1);
        break;
    }
    
    return { start, end };
  }
  
  /**
   * 獲取上一時段的日期區間
   */
  getPreviousDateRange(range: TimeRange = this._timeRange()): DateRange {
    const current = this.getDateRange(range);
    const duration = current.end.getTime() - current.start.getTime();
    
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.start.getTime() - 1)
    };
  }
  
  // ============ 基礎指標計算 ============
  
  /**
   * 計算基礎指標
   */
  private calculateBaseMetrics(): BaseMetrics {
    const leads = this.leadService.leads();
    const range = this.getDateRange();
    
    const inRange = leads.filter(l => 
      new Date(l.createdAt) >= range.start && new Date(l.createdAt) <= range.end
    );
    
    return {
      totalLeads: leads.length,
      newLeads: inRange.length,
      activeLeads: leads.filter(l => l.isNurturing && !l.doNotContact).length,
      convertedLeads: leads.filter(l => l.stage === 'customer' || l.stage === 'advocate').length,
      lostLeads: leads.filter(l => l.doNotContact || l.stage === 'dormant').length
    };
  }
  
  /**
   * 計算階段分佈
   */
  private calculateStageDistribution(): StageDistribution[] {
    const leads = this.leadService.leads();
    const total = leads.length || 1;
    
    const stages: FunnelStage[] = ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate', 'dormant'];
    const previousRange = this.getPreviousDateRange();
    
    return stages.map(stage => {
      const count = leads.filter(l => l.stage === stage).length;
      
      // 計算上一時段的數量
      const previousCount = leads.filter(l => {
        const created = new Date(l.createdAt);
        return l.stage === stage && 
               created >= previousRange.start && 
               created <= previousRange.end;
      }).length;
      
      return {
        stage,
        count,
        percentage: Math.round((count / total) * 100),
        change: count - previousCount
      };
    });
  }
  
  /**
   * 計算轉化率指標
   */
  private calculateConversionMetrics(): ConversionMetrics {
    const leads = this.leadService.leads();
    const range = this.getDateRange();
    
    // 計算整體轉化率
    const totalLeads = leads.filter(l => l.stage !== 'stranger').length || 1;
    const converted = leads.filter(l => l.stage === 'customer' || l.stage === 'advocate').length;
    const overallRate = Math.round((converted / totalLeads) * 100);
    
    // 計算各階段轉化率
    const stageTransitions: [FunnelStage, FunnelStage][] = [
      ['stranger', 'visitor'],
      ['visitor', 'lead'],
      ['lead', 'qualified'],
      ['qualified', 'customer'],
      ['customer', 'advocate']
    ];
    
    const stageRates = stageTransitions.map(([from, to]) => {
      const fromCount = leads.filter(l => 
        l.stage === from || this.getStageIndex(l.stage) > this.getStageIndex(from)
      ).length || 1;
      
      const toCount = leads.filter(l => 
        this.getStageIndex(l.stage) >= this.getStageIndex(to)
      ).length;
      
      return {
        from,
        to,
        rate: Math.round((toCount / fromCount) * 100),
        count: toCount
      };
    });
    
    // 計算平均轉化時間
    const convertedLeads = leads.filter(l => l.stage === 'customer' || l.stage === 'advocate');
    let avgTimeToConvert = 0;
    if (convertedLeads.length > 0) {
      const totalTime = convertedLeads.reduce((sum, l) => {
        return sum + (new Date(l.updatedAt).getTime() - new Date(l.createdAt).getTime());
      }, 0);
      avgTimeToConvert = totalTime / convertedLeads.length;
    }
    
    // 計算趨勢
    const previousRange = this.getPreviousDateRange();
    const previousConverted = leads.filter(l => {
      const updated = new Date(l.updatedAt);
      return (l.stage === 'customer' || l.stage === 'advocate') &&
             updated >= previousRange.start && updated <= previousRange.end;
    }).length;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (converted > previousConverted * 1.1) trend = 'up';
    else if (converted < previousConverted * 0.9) trend = 'down';
    
    return {
      overallRate,
      stageRates,
      avgTimeToConvert,
      trend
    };
  }
  
  /**
   * 計算互動指標
   */
  private calculateEngagementMetrics(): EngagementMetrics {
    const leads = this.leadService.leads();
    const conversations = this.leadService.conversations();
    
    let totalMessages = 0;
    let aiMessages = 0;
    let manualMessages = 0;
    let totalResponseTime = 0;
    let responseCount = 0;
    
    conversations.forEach((convs, leadId) => {
      convs.forEach(conv => {
        conv.messages.forEach((msg, index) => {
          totalMessages++;
          if (msg.isAIGenerated) aiMessages++;
          else if (msg.role === 'assistant') manualMessages++;
          
          // 計算響應時間
          if (msg.role === 'assistant' && index > 0) {
            const prevMsg = conv.messages[index - 1];
            if (prevMsg.role === 'user') {
              const responseTime = new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime();
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        });
      });
    });
    
    const activeLeads = leads.filter(l => l.isNurturing && !l.doNotContact).length || 1;
    
    return {
      totalMessages,
      aiMessages,
      manualMessages,
      avgResponseTime: responseCount > 0 ? totalResponseTime / responseCount : 0,
      responseRate: Math.round((responseCount / (totalMessages / 2 || 1)) * 100),
      avgMessagesPerLead: Math.round(totalMessages / activeLeads)
    };
  }
  
  // ============ 時間序列數據 ============
  
  /**
   * 獲取新客戶時間序列
   */
  getNewLeadsTimeSeries(range: TimeRange = this._timeRange()): TimeSeries {
    const leads = this.leadService.leads();
    const dateRange = this.getDateRange(range);
    const data: TimeSeriesDataPoint[] = [];
    
    // 按天分組
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / dayMs);
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(dateRange.start.getTime() + i * dayMs);
      const dayEnd = new Date(dayStart.getTime() + dayMs);
      
      const count = leads.filter(l => {
        const created = new Date(l.createdAt);
        return created >= dayStart && created < dayEnd;
      }).length;
      
      data.push({
        timestamp: dayStart,
        value: count,
        label: dayStart.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      });
    }
    
    return {
      name: '新客戶',
      data,
      aggregation: 'count'
    };
  }
  
  /**
   * 獲取轉化時間序列
   */
  getConversionsTimeSeries(range: TimeRange = this._timeRange()): TimeSeries {
    const leads = this.leadService.leads();
    const dateRange = this.getDateRange(range);
    const data: TimeSeriesDataPoint[] = [];
    
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / dayMs);
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(dateRange.start.getTime() + i * dayMs);
      const dayEnd = new Date(dayStart.getTime() + dayMs);
      
      const count = leads.filter(l => {
        const updated = new Date(l.updatedAt);
        return (l.stage === 'customer' || l.stage === 'advocate') &&
               updated >= dayStart && updated < dayEnd;
      }).length;
      
      data.push({
        timestamp: dayStart,
        value: count,
        label: dayStart.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      });
    }
    
    return {
      name: '轉化數',
      data,
      aggregation: 'count'
    };
  }
  
  /**
   * 獲取消息時間序列
   */
  getMessagesTimeSeries(range: TimeRange = this._timeRange()): TimeSeries {
    const conversations = this.leadService.conversations();
    const dateRange = this.getDateRange(range);
    const data: TimeSeriesDataPoint[] = [];
    
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / dayMs);
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(dateRange.start.getTime() + i * dayMs);
      const dayEnd = new Date(dayStart.getTime() + dayMs);
      
      let count = 0;
      conversations.forEach(convs => {
        convs.forEach(conv => {
          conv.messages.forEach(msg => {
            const msgTime = new Date(msg.timestamp);
            if (msgTime >= dayStart && msgTime < dayEnd) {
              count++;
            }
          });
        });
      });
      
      data.push({
        timestamp: dayStart,
        value: count,
        label: dayStart.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
      });
    }
    
    return {
      name: '消息數',
      data,
      aggregation: 'sum'
    };
  }
  
  // ============ 趨勢計算 ============
  
  /**
   * 計算趨勢數據
   */
  calculateTrend(current: number, previous: number): TrendData {
    const change = current - previous;
    const changePercent = previous > 0 ? Math.round((change / previous) * 100) : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) trend = 'up';
    else if (changePercent < -5) trend = 'down';
    
    return { current, previous, change, changePercent, trend };
  }
  
  /**
   * 獲取關鍵指標趨勢
   */
  getKeyMetricsTrends(): Record<string, TrendData> {
    const currentMetrics = this.baseMetrics();
    const currentRange = this.getDateRange();
    const previousRange = this.getPreviousDateRange();
    
    const leads = this.leadService.leads();
    
    // 計算上一時段的指標
    const previousNewLeads = leads.filter(l => {
      const created = new Date(l.createdAt);
      return created >= previousRange.start && created <= previousRange.end;
    }).length;
    
    const previousConverted = leads.filter(l => {
      const updated = new Date(l.updatedAt);
      return (l.stage === 'customer' || l.stage === 'advocate') &&
             updated >= previousRange.start && updated <= previousRange.end;
    }).length;
    
    return {
      newLeads: this.calculateTrend(currentMetrics.newLeads, previousNewLeads),
      converted: this.calculateTrend(currentMetrics.convertedLeads, previousConverted),
      active: this.calculateTrend(currentMetrics.activeLeads, currentMetrics.activeLeads), // 簡化
      total: this.calculateTrend(currentMetrics.totalLeads, currentMetrics.totalLeads - currentMetrics.newLeads)
    };
  }
  
  // ============ 快照管理 ============
  
  /**
   * 創建分析快照
   */
  createSnapshot(): AnalyticsSnapshot {
    const snapshot: AnalyticsSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date(),
      timeRange: this._timeRange(),
      baseMetrics: this.baseMetrics(),
      stageDistribution: this.stageDistribution(),
      conversionMetrics: this.conversionMetrics(),
      engagementMetrics: this.engagementMetrics()
    };
    
    this._snapshots.update(snapshots => [...snapshots, snapshot].slice(-100));
    this.saveSnapshots();
    
    return snapshot;
  }
  
  /**
   * 獲取最新快照
   */
  getLatestSnapshot(): AnalyticsSnapshot | null {
    const snapshots = this._snapshots();
    return snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  }
  
  /**
   * 獲取指定日期的快照
   */
  getSnapshotByDate(date: Date): AnalyticsSnapshot | null {
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    
    return this._snapshots().find(s => {
      const snapshotDay = new Date(s.timestamp.getFullYear(), s.timestamp.getMonth(), s.timestamp.getDate()).getTime();
      return snapshotDay === targetDay;
    }) || null;
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 獲取階段索引
   */
  private getStageIndex(stage: FunnelStage): number {
    const stages: FunnelStage[] = ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate'];
    return stages.indexOf(stage);
  }
  
  /**
   * 格式化持續時間
   */
  formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}天`;
    if (hours > 0) return `${hours}小時`;
    return `${Math.floor(ms / (1000 * 60))}分鐘`;
  }
  
  // ============ 持久化 ============
  
  private saveSnapshots(): void {
    try {
      const data = this._snapshots().map(s => ({
        ...s,
        timestamp: s.timestamp.toISOString()
      }));
      localStorage.setItem('tgai-analytics-snapshots', JSON.stringify(data));
    } catch (e) {
      console.error('[AnalyticsData] Save error:', e);
    }
  }
  
  private loadSnapshots(): void {
    try {
      const data = localStorage.getItem('tgai-analytics-snapshots');
      if (data) {
        const parsed = JSON.parse(data).map((s: any) => ({
          ...s,
          timestamp: new Date(s.timestamp)
        }));
        this._snapshots.set(parsed);
      }
    } catch (e) {
      console.error('[AnalyticsData] Load error:', e);
    }
  }
}
