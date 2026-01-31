/**
 * 數據導出服務
 * Data Export Service
 * 
 * 🆕 P5 階段：高級功能擴展
 * 
 * 功能：
 * - CSV/JSON/Excel 導出
 * - 報表生成
 * - 自動排程導出
 * - 導出歷史
 */

import { Injectable, signal, inject } from '@angular/core';
import { MarketingAnalyticsService } from './marketing-analytics.service';
import { SmartSegmentationService } from './smart-segmentation.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

/** 導出格式 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/** 導出類型 */
export type ExportType = 
  | 'sessions'        // 營銷會話
  | 'users'           // 用戶數據
  | 'segments'        // 分群數據
  | 'experiments'     // A/B 測試
  | 'daily_report'    // 日報
  | 'weekly_report'   // 週報
  | 'custom';         // 自定義

/** 導出配置 */
export interface ExportConfig {
  type: ExportType;
  format: ExportFormat;
  filename?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
  columns?: string[];
  includeHeaders?: boolean;
}

/** 導出記錄 */
export interface ExportRecord {
  id: string;
  type: ExportType;
  format: ExportFormat;
  filename: string;
  rowCount: number;
  fileSize: number;  // 字節
  createdAt: Date;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

/** 排程配置 */
export interface ScheduledExport {
  id: string;
  name: string;
  config: ExportConfig;
  schedule: 'daily' | 'weekly' | 'monthly';
  time: string;  // HH:mm
  dayOfWeek?: number;  // 0-6
  dayOfMonth?: number;  // 1-31
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
}

/** 報表模板 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: ExportType;
  columns: string[];
  filters?: Record<string, any>;
  isSystem: boolean;
}

// ============ 預設模板 ============

const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'tpl_daily_summary',
    name: '每日營銷摘要',
    description: '包含當日會話數、轉化數、收入等關鍵指標',
    type: 'daily_report',
    columns: ['date', 'sessions', 'conversions', 'conversion_rate', 'revenue', 'avg_interest_score'],
    isSystem: true
  },
  {
    id: 'tpl_user_list',
    name: '用戶列表',
    description: '所有用戶的基本信息和狀態',
    type: 'users',
    columns: ['user_id', 'name', 'segment', 'interest_score', 'last_contact', 'total_sessions', 'revenue'],
    isSystem: true
  },
  {
    id: 'tpl_session_detail',
    name: '會話詳情',
    description: '所有營銷會話的詳細記錄',
    type: 'sessions',
    columns: ['session_id', 'user_name', 'start_time', 'end_time', 'role_combo', 'messages', 'outcome', 'interest_score'],
    isSystem: true
  },
  {
    id: 'tpl_segment_analysis',
    name: '分群分析',
    description: '各分群的統計數據對比',
    type: 'segments',
    columns: ['segment_name', 'member_count', 'avg_interest', 'avg_engagement', 'conversion_rate', 'total_revenue'],
    isSystem: true
  }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class DataExportService {
  private analytics = inject(MarketingAnalyticsService);
  private segmentation = inject(SmartSegmentationService);
  private toast = inject(ToastService);
  
  // 導出歷史
  private _exportHistory = signal<ExportRecord[]>([]);
  exportHistory = this._exportHistory.asReadonly();
  
  // 排程導出
  private _scheduledExports = signal<ScheduledExport[]>([]);
  scheduledExports = this._scheduledExports.asReadonly();
  
  // 報表模板
  private _templates = signal<ReportTemplate[]>(DEFAULT_TEMPLATES);
  templates = this._templates.asReadonly();
  
  // 導出中狀態
  private _exporting = signal(false);
  exporting = this._exporting.asReadonly();
  
  private readonly STORAGE_KEY = 'dataExport';
  
  constructor() {
    this.loadFromStorage();
  }
  
  // ============ 導出功能 ============
  
  /**
   * 導出數據
   */
  async export(config: ExportConfig): Promise<ExportRecord> {
    this._exporting.set(true);
    const startTime = Date.now();
    
    try {
      // 獲取數據
      const data = await this.fetchData(config);
      
      // 生成文件內容
      let content: string;
      let mimeType: string;
      
      switch (config.format) {
        case 'csv':
          content = this.toCSV(data, config.columns, config.includeHeaders !== false);
          mimeType = 'text/csv;charset=utf-8';
          break;
        case 'json':
          content = JSON.stringify(data, null, 2);
          mimeType = 'application/json';
          break;
        case 'xlsx':
          // 簡化版：轉為 CSV（實際可用 xlsx 庫）
          content = this.toCSV(data, config.columns, true);
          mimeType = 'text/csv;charset=utf-8';
          break;
        default:
          throw new Error('不支援的格式');
      }
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = config.filename || `${config.type}_${timestamp}.${config.format}`;
      
      // 下載文件
      this.downloadFile(content, filename, mimeType);
      
      // 記錄導出
      const record: ExportRecord = {
        id: `exp_${Date.now()}`,
        type: config.type,
        format: config.format,
        filename,
        rowCount: Array.isArray(data) ? data.length : 1,
        fileSize: new Blob([content]).size,
        createdAt: new Date(),
        status: 'completed'
      };
      
      this._exportHistory.update(h => [record, ...h].slice(0, 50));
      this.saveToStorage();
      
      this.toast.success(`✅ 導出成功: ${filename}`);
      return record;
      
    } catch (error: any) {
      const record: ExportRecord = {
        id: `exp_${Date.now()}`,
        type: config.type,
        format: config.format,
        filename: 'failed',
        rowCount: 0,
        fileSize: 0,
        createdAt: new Date(),
        status: 'failed',
        errorMessage: error.message
      };
      
      this._exportHistory.update(h => [record, ...h].slice(0, 50));
      this.toast.error(`❌ 導出失敗: ${error.message}`);
      throw error;
      
    } finally {
      this._exporting.set(false);
    }
  }
  
  /**
   * 使用模板導出
   */
  async exportWithTemplate(templateId: string, options?: {
    dateRange?: { start: Date; end: Date };
    format?: ExportFormat;
  }): Promise<ExportRecord> {
    const template = this._templates().find(t => t.id === templateId);
    if (!template) throw new Error('模板不存在');
    
    return this.export({
      type: template.type,
      format: options?.format || 'csv',
      columns: template.columns,
      filters: template.filters,
      dateRange: options?.dateRange
    });
  }
  
  /**
   * 獲取數據
   */
  private async fetchData(config: ExportConfig): Promise<any[]> {
    switch (config.type) {
      case 'sessions':
        return this.getSessionsData(config);
      case 'users':
        return this.getUsersData(config);
      case 'segments':
        return this.getSegmentsData(config);
      case 'daily_report':
        return this.getDailyReportData(config);
      case 'weekly_report':
        return this.getWeeklyReportData(config);
      default:
        return [];
    }
  }
  
  /**
   * 獲取會話數據
   */
  private getSessionsData(config: ExportConfig): any[] {
    const sessions = this.analytics.sessions();
    
    let filtered = sessions;
    
    // 日期過濾
    if (config.dateRange) {
      filtered = filtered.filter(s => 
        s.startTime >= config.dateRange!.start && s.startTime <= config.dateRange!.end
      );
    }
    
    return filtered.map(s => ({
      session_id: s.id,
      user_id: s.targetUserId,
      user_name: s.targetUserName,
      start_time: s.startTime.toISOString(),
      end_time: s.endTime?.toISOString() || '',
      role_combo: s.roleCombo.name,
      total_messages: s.totalMessages,
      user_messages: s.userMessages,
      outcome: s.outcome,
      interest_score: s.interestScore,
      engagement_score: s.engagementScore,
      final_stage: s.finalStage,
      conversion_value: s.conversionValue || 0,
      tags: s.tags.join(', ')
    }));
  }
  
  /**
   * 獲取用戶數據
   */
  private getUsersData(config: ExportConfig): any[] {
    const profiles = this.analytics.userProfiles();
    
    return profiles.map(p => {
      const segments = this.segmentation.getUserSegments(p.userId);
      
      return {
        user_id: p.userId,
        name: p.name || '',
        segment: segments.map(s => s.name).join(', '),
        interest_score: 0,  // 需要從 sessions 計算
        total_sessions: p.totalSessions,
        total_messages: p.totalMessages,
        intent_level: p.intentLevel,
        interests: p.interests.join(', '),
        pain_points: p.painPoints.join(', '),
        last_contact: p.lastContactTime?.toISOString() || '',
        tags: p.tags.join(', ')
      };
    });
  }
  
  /**
   * 獲取分群數據
   */
  private getSegmentsData(config: ExportConfig): any[] {
    const segments = this.segmentation.segments();
    const stats = this.segmentation.segmentStats();
    
    return segments.map(s => {
      const stat = stats.find(st => st.segmentId === s.id);
      
      return {
        segment_id: s.id,
        segment_name: s.name,
        description: s.description || '',
        member_count: s.memberCount,
        avg_interest: stat?.avgInterestScore.toFixed(1) || 0,
        avg_engagement: stat?.avgEngagementScore.toFixed(1) || 0,
        conversion_rate: stat?.conversionRate.toFixed(1) || 0,
        total_revenue: stat?.totalRevenue || 0,
        is_active: s.isActive ? 'Yes' : 'No',
        last_updated: s.lastUpdated.toISOString()
      };
    });
  }
  
  /**
   * 獲取日報數據
   */
  private getDailyReportData(config: ExportConfig): any[] {
    const sessions = this.analytics.sessions();
    const dateMap = new Map<string, any>();
    
    sessions.forEach(s => {
      const date = s.startTime.toISOString().slice(0, 10);
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          sessions: 0,
          conversions: 0,
          revenue: 0,
          total_messages: 0,
          total_interest: 0
        });
      }
      
      const stats = dateMap.get(date);
      stats.sessions++;
      if (s.outcome === 'converted') stats.conversions++;
      stats.revenue += s.conversionValue || 0;
      stats.total_messages += s.totalMessages;
      stats.total_interest += s.interestScore;
    });
    
    return Array.from(dateMap.values()).map(d => ({
      date: d.date,
      sessions: d.sessions,
      conversions: d.conversions,
      conversion_rate: d.sessions > 0 ? ((d.conversions / d.sessions) * 100).toFixed(1) + '%' : '0%',
      revenue: d.revenue,
      avg_messages: d.sessions > 0 ? (d.total_messages / d.sessions).toFixed(1) : 0,
      avg_interest_score: d.sessions > 0 ? (d.total_interest / d.sessions).toFixed(1) : 0
    })).sort((a, b) => b.date.localeCompare(a.date));
  }
  
  /**
   * 獲取週報數據
   */
  private getWeeklyReportData(config: ExportConfig): any[] {
    const dailyData = this.getDailyReportData(config);
    const weekMap = new Map<string, any>();
    
    dailyData.forEach(d => {
      const date = new Date(d.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().slice(0, 10);
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          week_start: weekKey,
          sessions: 0,
          conversions: 0,
          revenue: 0,
          days: 0
        });
      }
      
      const stats = weekMap.get(weekKey);
      stats.sessions += d.sessions;
      stats.conversions += d.conversions;
      stats.revenue += d.revenue;
      stats.days++;
    });
    
    return Array.from(weekMap.values()).map(w => ({
      week_start: w.week_start,
      sessions: w.sessions,
      conversions: w.conversions,
      conversion_rate: w.sessions > 0 ? ((w.conversions / w.sessions) * 100).toFixed(1) + '%' : '0%',
      revenue: w.revenue,
      avg_daily_sessions: w.days > 0 ? (w.sessions / w.days).toFixed(1) : 0
    })).sort((a, b) => b.week_start.localeCompare(a.week_start));
  }
  
  // ============ 格式轉換 ============
  
  /**
   * 轉換為 CSV
   */
  private toCSV(data: any[], columns?: string[], includeHeaders = true): string {
    if (data.length === 0) return '';
    
    const keys = columns || Object.keys(data[0]);
    const lines: string[] = [];
    
    if (includeHeaders) {
      lines.push(keys.join(','));
    }
    
    data.forEach(row => {
      const values = keys.map(key => {
        const value = row[key];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      lines.push(values.join(','));
    });
    
    return '\ufeff' + lines.join('\n');  // BOM for Excel
  }
  
  /**
   * 下載文件
   */
  private downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
  
  // ============ 模板管理 ============
  
  /**
   * 創建模板
   */
  createTemplate(config: {
    name: string;
    description?: string;
    type: ExportType;
    columns: string[];
    filters?: Record<string, any>;
  }): ReportTemplate {
    const template: ReportTemplate = {
      id: `tpl_${Date.now()}`,
      name: config.name,
      description: config.description || '',
      type: config.type,
      columns: config.columns,
      filters: config.filters,
      isSystem: false
    };
    
    this._templates.update(t => [...t, template]);
    this.saveToStorage();
    return template;
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(templateId: string): boolean {
    const template = this._templates().find(t => t.id === templateId);
    if (!template || template.isSystem) return false;
    
    this._templates.update(t => t.filter(tpl => tpl.id !== templateId));
    this.saveToStorage();
    return true;
  }
  
  // ============ 排程導出 ============
  
  /**
   * 創建排程導出
   */
  createScheduledExport(config: {
    name: string;
    exportConfig: ExportConfig;
    schedule: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  }): ScheduledExport {
    const scheduled: ScheduledExport = {
      id: `sch_${Date.now()}`,
      name: config.name,
      config: config.exportConfig,
      schedule: config.schedule,
      time: config.time,
      dayOfWeek: config.dayOfWeek,
      dayOfMonth: config.dayOfMonth,
      enabled: true,
      nextRun: this.calculateNextRun(config.schedule, config.time, config.dayOfWeek, config.dayOfMonth)
    };
    
    this._scheduledExports.update(s => [...s, scheduled]);
    this.saveToStorage();
    return scheduled;
  }
  
  /**
   * 計算下次執行時間
   */
  private calculateNextRun(
    schedule: 'daily' | 'weekly' | 'monthly',
    time: string,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    const next = new Date(now);
    
    next.setHours(hours, minutes, 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    
    if (schedule === 'weekly' && dayOfWeek !== undefined) {
      while (next.getDay() !== dayOfWeek) {
        next.setDate(next.getDate() + 1);
      }
    }
    
    if (schedule === 'monthly' && dayOfMonth !== undefined) {
      next.setDate(dayOfMonth);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
    }
    
    return next;
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      exportHistory: this._exportHistory(),
      scheduledExports: this._scheduledExports(),
      templates: this._templates().filter(t => !t.isSystem),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.exportHistory) {
        this._exportHistory.set(data.exportHistory.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt)
        })));
      }
      
      if (data.scheduledExports) {
        this._scheduledExports.set(data.scheduledExports.map((s: any) => ({
          ...s,
          lastRun: s.lastRun ? new Date(s.lastRun) : undefined,
          nextRun: new Date(s.nextRun)
        })));
      }
      
      if (data.templates) {
        this._templates.update(t => [...t, ...data.templates]);
      }
      
      console.log('[DataExport] 已從存儲恢復數據');
    } catch (e) {
      console.error('[DataExport] 恢復數據失敗:', e);
    }
  }
}
