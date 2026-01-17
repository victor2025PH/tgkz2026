/**
 * TG-AI智控王 報表生成服務
 * Report Generator Service v1.0
 * 
 * 功能：
 * - 綜合報表生成
 * - 報表模板管理
 * - 導出功能 (JSON/CSV)
 * - 定時報表
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AnalyticsDataService, TimeRange, AnalyticsSnapshot } from './analytics-data.service';
import { FunnelAnalyticsService, FunnelData, BottleneckAnalysis } from './funnel-analytics.service';
import { AIPerformanceService, AIPerformanceReport, AIEffectSummary } from './ai-performance.service';
import { LeadService } from './lead.service';
import { Lead, FunnelStage } from './lead.models';

// ============ 類型定義 ============

/** 報表類型 */
export type ReportType = 'summary' | 'funnel' | 'ai_performance' | 'leads' | 'full';

/** 報表格式 */
export type ExportFormat = 'json' | 'csv' | 'markdown';

/** 報表狀態 */
export type ReportStatus = 'draft' | 'generating' | 'ready' | 'error';

/** 報表配置 */
export interface ReportConfig {
  type: ReportType;
  timeRange: TimeRange;
  includeSections: {
    overview: boolean;
    funnel: boolean;
    aiPerformance: boolean;
    topLeads: boolean;
    recommendations: boolean;
  };
  maxTopLeads: number;
}

/** 綜合報表 */
export interface ComprehensiveReport {
  id: string;
  title: string;
  type: ReportType;
  timeRange: TimeRange;
  generatedAt: Date;
  status: ReportStatus;
  
  // 概覽
  overview?: {
    totalLeads: number;
    newLeads: number;
    conversions: number;
    conversionRate: number;
    totalMessages: number;
    aiMessages: number;
  };
  
  // 漏斗數據
  funnel?: FunnelData;
  bottlenecks?: BottleneckAnalysis[];
  funnelHealth?: { score: number; grade: string; summary: string };
  
  // AI效果
  aiPerformance?: AIEffectSummary;
  aiRecommendations?: string[];
  
  // 頂部客戶
  topLeads?: {
    lead: Lead;
    score: number;
    reason: string;
  }[];
  
  // 總結與建議
  summary?: string;
  recommendations?: string[];
}

/** 報表歷史記錄 */
export interface ReportHistory {
  id: string;
  title: string;
  type: ReportType;
  generatedAt: Date;
  timeRange: TimeRange;
}

/** 默認報表配置 */
const DEFAULT_REPORT_CONFIG: ReportConfig = {
  type: 'full',
  timeRange: 'month',
  includeSections: {
    overview: true,
    funnel: true,
    aiPerformance: true,
    topLeads: true,
    recommendations: true
  },
  maxTopLeads: 10
};

@Injectable({
  providedIn: 'root'
})
export class ReportGeneratorService {
  private analyticsData = inject(AnalyticsDataService);
  private funnelAnalytics = inject(FunnelAnalyticsService);
  private aiPerformance = inject(AIPerformanceService);
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 當前報表
  private _currentReport = signal<ComprehensiveReport | null>(null);
  currentReport = computed(() => this._currentReport());
  
  // 報表歷史
  private _reportHistory = signal<ReportHistory[]>([]);
  reportHistory = computed(() => this._reportHistory());
  
  // 生成狀態
  private _isGenerating = signal(false);
  isGenerating = computed(() => this._isGenerating());
  
  constructor() {
    this.loadHistory();
  }
  
  // ============ 報表生成 ============
  
  /**
   * 生成綜合報表
   */
  async generateReport(config: Partial<ReportConfig> = {}): Promise<ComprehensiveReport> {
    const fullConfig: ReportConfig = { ...DEFAULT_REPORT_CONFIG, ...config };
    
    this._isGenerating.set(true);
    
    try {
      const report: ComprehensiveReport = {
        id: `report_${Date.now()}`,
        title: this.generateTitle(fullConfig),
        type: fullConfig.type,
        timeRange: fullConfig.timeRange,
        generatedAt: new Date(),
        status: 'generating'
      };
      
      // 設置時間範圍
      this.analyticsData.setTimeRange(fullConfig.timeRange);
      
      // 生成各部分
      if (fullConfig.includeSections.overview) {
        report.overview = this.generateOverview();
      }
      
      if (fullConfig.includeSections.funnel) {
        report.funnel = this.funnelAnalytics.funnelData();
        report.bottlenecks = this.funnelAnalytics.bottlenecks();
        report.funnelHealth = this.funnelAnalytics.calculateFunnelHealth();
      }
      
      if (fullConfig.includeSections.aiPerformance) {
        report.aiPerformance = this.aiPerformance.summary();
        const aiReport = this.aiPerformance.generateReport(fullConfig.timeRange);
        report.aiRecommendations = aiReport.recommendations;
      }
      
      if (fullConfig.includeSections.topLeads) {
        report.topLeads = this.getTopLeads(fullConfig.maxTopLeads);
      }
      
      if (fullConfig.includeSections.recommendations) {
        report.recommendations = this.generateRecommendations(report);
        report.summary = this.generateSummary(report);
      }
      
      report.status = 'ready';
      
      // 保存到當前報表
      this._currentReport.set(report);
      
      // 添加到歷史
      this.addToHistory(report);
      
      return report;
      
    } catch (error) {
      console.error('[ReportGenerator] Error:', error);
      throw error;
    } finally {
      this._isGenerating.set(false);
    }
  }
  
  /**
   * 生成報表標題
   */
  private generateTitle(config: ReportConfig): string {
    const typeNames: Record<ReportType, string> = {
      summary: '摘要報表',
      funnel: '銷售漏斗報表',
      ai_performance: 'AI效果報表',
      leads: '客戶分析報表',
      full: '綜合分析報表'
    };
    
    const rangeNames: Record<TimeRange, string> = {
      today: '今日',
      yesterday: '昨日',
      week: '本週',
      month: '本月',
      quarter: '本季',
      year: '本年',
      all: '全部'
    };
    
    return `${rangeNames[config.timeRange]}${typeNames[config.type]}`;
  }
  
  /**
   * 生成概覽數據
   */
  private generateOverview(): ComprehensiveReport['overview'] {
    const baseMetrics = this.analyticsData.baseMetrics();
    const engagementMetrics = this.analyticsData.engagementMetrics();
    const conversionMetrics = this.analyticsData.conversionMetrics();
    
    return {
      totalLeads: baseMetrics.totalLeads,
      newLeads: baseMetrics.newLeads,
      conversions: baseMetrics.convertedLeads,
      conversionRate: conversionMetrics.overallRate,
      totalMessages: engagementMetrics.totalMessages,
      aiMessages: engagementMetrics.aiMessages
    };
  }
  
  /**
   * 獲取頂部客戶
   */
  private getTopLeads(limit: number): ComprehensiveReport['topLeads'] {
    const leads = this.leadService.leads();
    
    // 計算綜合分數
    const scoredLeads = leads.map(lead => {
      let score = 0;
      let reasons: string[] = [];
      
      // 購買意向
      if (lead.scores.intent >= 80) {
        score += 30;
        reasons.push('高購買意向');
      } else if (lead.scores.intent >= 60) {
        score += 20;
      }
      
      // 互動度
      if (lead.scores.engagement >= 70) {
        score += 25;
        reasons.push('活躍互動');
      } else if (lead.scores.engagement >= 50) {
        score += 15;
      }
      
      // 階段
      if (lead.stage === 'qualified') {
        score += 25;
        reasons.push('合格客戶');
      } else if (lead.stage === 'lead') {
        score += 15;
      }
      
      // 最近活動
      const daysSinceActivity = (Date.now() - new Date(lead.updatedAt).getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceActivity < 3) {
        score += 20;
        reasons.push('近期活躍');
      } else if (daysSinceActivity < 7) {
        score += 10;
      }
      
      return {
        lead,
        score,
        reason: reasons.join('、') || '潛在機會'
      };
    });
    
    return scoredLeads
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  /**
   * 生成總結
   */
  private generateSummary(report: ComprehensiveReport): string {
    const parts: string[] = [];
    
    if (report.overview) {
      parts.push(`本期共有 ${report.overview.totalLeads} 位客戶，新增 ${report.overview.newLeads} 位，` +
                 `成功轉化 ${report.overview.conversions} 位，轉化率 ${report.overview.conversionRate}%。`);
    }
    
    if (report.funnelHealth) {
      parts.push(`漏斗健康度評分 ${report.funnelHealth.score} 分（${report.funnelHealth.grade}級），${report.funnelHealth.summary}。`);
    }
    
    if (report.aiPerformance) {
      parts.push(`AI共發送 ${report.aiPerformance.totalAIMessages} 條消息，響應率 ${report.aiPerformance.responseRate}%，` +
                 `效果評分 ${report.aiPerformance.avgEffectivenessScore} 分。`);
    }
    
    return parts.join('\n');
  }
  
  /**
   * 生成建議
   */
  private generateRecommendations(report: ComprehensiveReport): string[] {
    const recommendations: string[] = [];
    
    // 基於瓶頸的建議
    if (report.bottlenecks && report.bottlenecks.length > 0) {
      const critical = report.bottlenecks.filter(b => b.severity === 'critical');
      if (critical.length > 0) {
        recommendations.push(`🚨 緊急：${critical[0].suggestion}`);
      }
    }
    
    // 基於轉化率的建議
    if (report.overview && report.overview.conversionRate < 20) {
      recommendations.push('💡 轉化率偏低，建議優化跟進策略和價值主張');
    }
    
    // 基於AI效果的建議
    if (report.aiRecommendations) {
      recommendations.push(...report.aiRecommendations.slice(0, 2));
    }
    
    // 基於頂部客戶的建議
    if (report.topLeads && report.topLeads.length > 0) {
      const highPotential = report.topLeads.filter(t => t.score >= 60);
      if (highPotential.length > 0) {
        recommendations.push(`🎯 有 ${highPotential.length} 位高潛力客戶待跟進，建議優先處理`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ 整體表現良好，繼續保持當前策略');
    }
    
    return recommendations;
  }
  
  // ============ 快速報表 ============
  
  /**
   * 生成每日摘要
   */
  async generateDailySummary(): Promise<ComprehensiveReport> {
    return this.generateReport({
      type: 'summary',
      timeRange: 'today',
      includeSections: {
        overview: true,
        funnel: false,
        aiPerformance: true,
        topLeads: true,
        recommendations: true
      },
      maxTopLeads: 5
    });
  }
  
  /**
   * 生成週報
   */
  async generateWeeklyReport(): Promise<ComprehensiveReport> {
    return this.generateReport({
      type: 'full',
      timeRange: 'week',
      includeSections: {
        overview: true,
        funnel: true,
        aiPerformance: true,
        topLeads: true,
        recommendations: true
      },
      maxTopLeads: 10
    });
  }
  
  /**
   * 生成月報
   */
  async generateMonthlyReport(): Promise<ComprehensiveReport> {
    return this.generateReport({
      type: 'full',
      timeRange: 'month',
      includeSections: {
        overview: true,
        funnel: true,
        aiPerformance: true,
        topLeads: true,
        recommendations: true
      },
      maxTopLeads: 20
    });
  }
  
  // ============ 導出功能 ============
  
  /**
   * 導出報表
   */
  exportReport(report: ComprehensiveReport, format: ExportFormat): string {
    switch (format) {
      case 'json':
        return this.exportAsJSON(report);
      case 'csv':
        return this.exportAsCSV(report);
      case 'markdown':
        return this.exportAsMarkdown(report);
      default:
        return this.exportAsJSON(report);
    }
  }
  
  /**
   * 導出為JSON
   */
  private exportAsJSON(report: ComprehensiveReport): string {
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * 導出為CSV
   */
  private exportAsCSV(report: ComprehensiveReport): string {
    const lines: string[] = [];
    
    // 標題
    lines.push(`報表標題,${report.title}`);
    lines.push(`生成時間,${report.generatedAt.toISOString()}`);
    lines.push('');
    
    // 概覽
    if (report.overview) {
      lines.push('指標,數值');
      lines.push(`總客戶數,${report.overview.totalLeads}`);
      lines.push(`新增客戶,${report.overview.newLeads}`);
      lines.push(`轉化數,${report.overview.conversions}`);
      lines.push(`轉化率,${report.overview.conversionRate}%`);
      lines.push(`總消息數,${report.overview.totalMessages}`);
      lines.push(`AI消息數,${report.overview.aiMessages}`);
      lines.push('');
    }
    
    // 漏斗
    if (report.funnel) {
      lines.push('階段,數量,佔比,轉化率');
      report.funnel.stages.forEach(stage => {
        lines.push(`${stage.name},${stage.count},${stage.percentage}%,${stage.conversionRate}%`);
      });
      lines.push('');
    }
    
    // 頂部客戶
    if (report.topLeads) {
      lines.push('客戶,分數,原因');
      report.topLeads.forEach(item => {
        lines.push(`${item.lead.displayName},${item.score},${item.reason}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * 導出為Markdown
   */
  private exportAsMarkdown(report: ComprehensiveReport): string {
    const lines: string[] = [];
    
    lines.push(`# ${report.title}`);
    lines.push('');
    lines.push(`> 生成時間：${report.generatedAt.toLocaleString('zh-TW')}`);
    lines.push('');
    
    // 概覽
    if (report.overview) {
      lines.push('## 📊 概覽');
      lines.push('');
      lines.push('| 指標 | 數值 |');
      lines.push('|------|------|');
      lines.push(`| 總客戶數 | ${report.overview.totalLeads} |`);
      lines.push(`| 新增客戶 | ${report.overview.newLeads} |`);
      lines.push(`| 轉化數 | ${report.overview.conversions} |`);
      lines.push(`| 轉化率 | ${report.overview.conversionRate}% |`);
      lines.push(`| 總消息數 | ${report.overview.totalMessages} |`);
      lines.push(`| AI消息數 | ${report.overview.aiMessages} |`);
      lines.push('');
    }
    
    // 漏斗
    if (report.funnel) {
      lines.push('## 📈 銷售漏斗');
      lines.push('');
      lines.push('| 階段 | 數量 | 佔比 | 轉化率 |');
      lines.push('|------|------|------|--------|');
      report.funnel.stages.forEach(stage => {
        lines.push(`| ${stage.name} | ${stage.count} | ${stage.percentage}% | ${stage.conversionRate}% |`);
      });
      lines.push('');
      
      if (report.funnelHealth) {
        lines.push(`**漏斗健康度**：${report.funnelHealth.score}分（${report.funnelHealth.grade}級）- ${report.funnelHealth.summary}`);
        lines.push('');
      }
    }
    
    // 瓶頸
    if (report.bottlenecks && report.bottlenecks.length > 0) {
      lines.push('## ⚠️ 瓶頸分析');
      lines.push('');
      report.bottlenecks.forEach(b => {
        const icon = b.severity === 'critical' ? '🔴' : b.severity === 'warning' ? '🟡' : '🔵';
        lines.push(`- ${icon} **${b.issue}**`);
        lines.push(`  - 影響：${b.impact}`);
        lines.push(`  - 建議：${b.suggestion}`);
      });
      lines.push('');
    }
    
    // AI效果
    if (report.aiPerformance) {
      lines.push('## 🤖 AI效果');
      lines.push('');
      lines.push(`- 總消息數：${report.aiPerformance.totalAIMessages}`);
      lines.push(`- 響應率：${report.aiPerformance.responseRate}%`);
      lines.push(`- 正面響應率：${report.aiPerformance.positiveResponseRate}%`);
      lines.push(`- 效果評分：${report.aiPerformance.avgEffectivenessScore}/100`);
      lines.push('');
    }
    
    // 頂部客戶
    if (report.topLeads && report.topLeads.length > 0) {
      lines.push('## 🎯 重點客戶');
      lines.push('');
      lines.push('| 客戶 | 分數 | 原因 |');
      lines.push('|------|------|------|');
      report.topLeads.slice(0, 10).forEach(item => {
        lines.push(`| ${item.lead.displayName} | ${item.score} | ${item.reason} |`);
      });
      lines.push('');
    }
    
    // 建議
    if (report.recommendations && report.recommendations.length > 0) {
      lines.push('## 💡 建議');
      lines.push('');
      report.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }
    
    // 總結
    if (report.summary) {
      lines.push('## 📝 總結');
      lines.push('');
      lines.push(report.summary);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 下載報表
   */
  downloadReport(report: ComprehensiveReport, format: ExportFormat): void {
    const content = this.exportReport(report, format);
    const mimeTypes: Record<ExportFormat, string> = {
      json: 'application/json',
      csv: 'text/csv',
      markdown: 'text/markdown'
    };
    const extensions: Record<ExportFormat, string> = {
      json: 'json',
      csv: 'csv',
      markdown: 'md'
    };
    
    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title}_${new Date().toISOString().split('T')[0]}.${extensions[format]}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ============ 歷史管理 ============
  
  /**
   * 添加到歷史
   */
  private addToHistory(report: ComprehensiveReport): void {
    const historyItem: ReportHistory = {
      id: report.id,
      title: report.title,
      type: report.type,
      generatedAt: report.generatedAt,
      timeRange: report.timeRange
    };
    
    this._reportHistory.update(history => [historyItem, ...history].slice(0, 50));
    this.saveHistory();
  }
  
  /**
   * 清除歷史
   */
  clearHistory(): void {
    this._reportHistory.set([]);
    localStorage.removeItem('tgai-report-history');
  }
  
  // ============ 持久化 ============
  
  private saveHistory(): void {
    try {
      const data = this._reportHistory().map(h => ({
        ...h,
        generatedAt: h.generatedAt.toISOString()
      }));
      localStorage.setItem('tgai-report-history', JSON.stringify(data));
    } catch (e) {
      console.error('[ReportGenerator] Save error:', e);
    }
  }
  
  private loadHistory(): void {
    try {
      const data = localStorage.getItem('tgai-report-history');
      if (data) {
        const parsed = JSON.parse(data).map((h: any) => ({
          ...h,
          generatedAt: new Date(h.generatedAt)
        }));
        this._reportHistory.set(parsed);
      }
    } catch (e) {
      console.error('[ReportGenerator] Load error:', e);
    }
  }
}
