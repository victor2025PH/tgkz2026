/**
 * 導出服務
 * Export Service
 * 
 * 🆕 Phase 25: 從 app.component.ts 提取導出相關方法
 */

import { Injectable, signal, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export type ExportFormat = 'csv' | 'xlsx' | 'json' | 'pdf';
export type ExportType = 'leads' | 'members' | 'resources' | 'messages' | 'analytics' | 'report';

export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  filters?: Record<string, any>;
  columns?: string[];
  includeHeaders?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface ExportJob {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  filePath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  type: ExportType;
  options: Partial<ExportOptions>;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _jobs = signal<ExportJob[]>([]);
  private _currentJob = signal<ExportJob | null>(null);
  private _templates = signal<ExportTemplate[]>([]);
  private _isExporting = signal(false);
  
  jobs = this._jobs.asReadonly();
  currentJob = this._currentJob.asReadonly();
  templates = this._templates.asReadonly();
  isExporting = this._isExporting.asReadonly();
  
  constructor() {
    this.setupIpcListeners();
    this.loadTemplates();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('export-started', (job: ExportJob) => {
      this._currentJob.set(job);
      this._jobs.update(jobs => [job, ...jobs]);
      this._isExporting.set(true);
    });
    
    this.ipc.on('export-progress', (data: { jobId: string; progress: number }) => {
      this._jobs.update(jobs =>
        jobs.map(j => j.id === data.jobId ? { ...j, progress: data.progress } : j)
      );
      
      if (this._currentJob()?.id === data.jobId) {
        this._currentJob.update(j => j ? { ...j, progress: data.progress } : j);
      }
    });
    
    this.ipc.on('export-completed', (data: { jobId: string; filePath: string }) => {
      this._jobs.update(jobs =>
        jobs.map(j => j.id === data.jobId ? {
          ...j,
          status: 'completed' as const,
          progress: 100,
          filePath: data.filePath,
          completedAt: new Date().toISOString()
        } : j)
      );
      
      this._currentJob.set(null);
      this._isExporting.set(false);
      this.toast.success('導出完成！');
    });
    
    this.ipc.on('export-failed', (data: { jobId: string; error: string }) => {
      this._jobs.update(jobs =>
        jobs.map(j => j.id === data.jobId ? {
          ...j,
          status: 'failed' as const,
          error: data.error
        } : j)
      );
      
      this._currentJob.set(null);
      this._isExporting.set(false);
      this.toast.error(`導出失敗: ${data.error}`);
    });
  }
  
  // ========== 導出操作 ==========
  
  /**
   * 導出線索
   */
  exportLeads(format: ExportFormat = 'csv', options?: Partial<ExportOptions>): void {
    this.startExport({
      format,
      type: 'leads',
      includeHeaders: true,
      ...options
    });
  }
  
  /**
   * 導出成員
   */
  exportMembers(resourceId: number, format: ExportFormat = 'csv', options?: Partial<ExportOptions>): void {
    this.startExport({
      format,
      type: 'members',
      filters: { resourceId },
      includeHeaders: true,
      ...options
    });
  }
  
  /**
   * 導出資源列表
   */
  exportResources(format: ExportFormat = 'csv', options?: Partial<ExportOptions>): void {
    this.startExport({
      format,
      type: 'resources',
      includeHeaders: true,
      ...options
    });
  }
  
  /**
   * 導出消息記錄
   */
  exportMessages(format: ExportFormat = 'json', options?: Partial<ExportOptions>): void {
    this.startExport({
      format,
      type: 'messages',
      ...options
    });
  }
  
  /**
   * 導出分析數據
   */
  exportAnalytics(format: ExportFormat = 'xlsx', options?: Partial<ExportOptions>): void {
    this.startExport({
      format,
      type: 'analytics',
      ...options
    });
  }
  
  /**
   * 導出報告
   */
  exportReport(type: 'daily' | 'weekly' | 'monthly', format: ExportFormat = 'pdf'): void {
    this.startExport({
      format,
      type: 'report',
      filters: { reportType: type }
    });
  }
  
  /**
   * 開始導出
   */
  private startExport(options: ExportOptions): void {
    if (this._isExporting()) {
      this.toast.warning('正在進行導出，請等待完成');
      return;
    }
    
    this.ipc.send('start-export', options);
    this.toast.info('開始導出...');
  }
  
  // ========== 任務管理 ==========
  
  /**
   * 取消當前導出
   */
  cancelExport(): void {
    const job = this._currentJob();
    if (!job) return;
    
    this.ipc.send('cancel-export', { jobId: job.id });
    this._currentJob.set(null);
    this._isExporting.set(false);
    this.toast.info('已取消導出');
  }
  
  /**
   * 打開導出文件
   */
  openExportFile(job: ExportJob): void {
    if (!job.filePath) {
      this.toast.error('文件路徑不存在');
      return;
    }
    
    this.ipc.send('open-file', { path: job.filePath });
  }
  
  /**
   * 打開導出目錄
   */
  openExportFolder(job: ExportJob): void {
    if (!job.filePath) {
      this.toast.error('文件路徑不存在');
      return;
    }
    
    this.ipc.send('open-folder', { path: job.filePath });
  }
  
  /**
   * 清除導出歷史
   */
  clearHistory(): void {
    if (!confirm('確定要清除導出歷史嗎？')) return;
    
    this._jobs.set([]);
    this.toast.success('導出歷史已清除');
  }
  
  /**
   * 刪除單個導出記錄
   */
  deleteJob(jobId: string): void {
    this._jobs.update(jobs => jobs.filter(j => j.id !== jobId));
  }
  
  // ========== 模板管理 ==========
  
  /**
   * 加載模板
   */
  loadTemplates(): void {
    try {
      const saved = localStorage.getItem('export-templates');
      if (saved) {
        this._templates.set(JSON.parse(saved));
      }
    } catch (e) {
      // 忽略錯誤
    }
  }
  
  /**
   * 保存模板
   */
  saveTemplate(template: Omit<ExportTemplate, 'id'>): void {
    const newTemplate: ExportTemplate = {
      ...template,
      id: crypto.randomUUID()
    };
    
    this._templates.update(templates => [...templates, newTemplate]);
    this.saveTemplatesToStorage();
    this.toast.success('模板已保存');
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(templateId: string): void {
    if (!confirm('確定要刪除此模板嗎？')) return;
    
    this._templates.update(templates => 
      templates.filter(t => t.id !== templateId)
    );
    this.saveTemplatesToStorage();
    this.toast.success('模板已刪除');
  }
  
  /**
   * 使用模板導出
   */
  useTemplate(templateId: string): void {
    const template = this._templates().find(t => t.id === templateId);
    if (!template) {
      this.toast.error('模板不存在');
      return;
    }
    
    this.startExport({
      format: template.options.format || 'csv',
      type: template.type,
      ...template.options
    });
  }
  
  private saveTemplatesToStorage(): void {
    try {
      localStorage.setItem('export-templates', JSON.stringify(this._templates()));
    } catch (e) {
      // 忽略錯誤
    }
  }
  
  // ========== 工具方法 ==========
  
  /**
   * 獲取格式圖標
   */
  getFormatIcon(format: ExportFormat): string {
    const icons: Record<ExportFormat, string> = {
      'csv': '📊',
      'xlsx': '📗',
      'json': '📋',
      'pdf': '📕'
    };
    return icons[format] || '📄';
  }
  
  /**
   * 獲取格式名稱
   */
  getFormatName(format: ExportFormat): string {
    const names: Record<ExportFormat, string> = {
      'csv': 'CSV',
      'xlsx': 'Excel',
      'json': 'JSON',
      'pdf': 'PDF'
    };
    return names[format] || format.toUpperCase();
  }
  
  /**
   * 獲取類型名稱
   */
  getTypeName(type: ExportType): string {
    const names: Record<ExportType, string> = {
      'leads': '線索',
      'members': '成員',
      'resources': '資源',
      'messages': '消息',
      'analytics': '分析',
      'report': '報告'
    };
    return names[type] || type;
  }
}
