/**
 * Ad System Service
 * 廣告發送系統服務
 * 
 * 🆕 Phase 16: 從 app.component.ts 提取
 * 
 * 管理廣告模板、發送計劃、發送記錄等功能
 */

import { Injectable, signal, inject } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';
import { MembershipService } from '../membership.service';

// 類型定義
export interface AdTemplate {
  id: number;
  name: string;
  content: string;
  mediaType: 'text' | 'photo' | 'video' | 'document';
  active: boolean;
  createdAt: string;
}

export interface AdSchedule {
  id: number;
  name: string;
  templateId: number;
  targetGroups: string[];
  sendMode: 'scheduled' | 'triggered' | 'relay' | 'interval';
  scheduleType: 'once' | 'daily' | 'interval' | 'cron';
  scheduleTime: string;
  intervalMinutes: number;
  triggerKeywords: string[];
  accountStrategy: 'rotate' | 'random' | 'sequential';
  assignedAccounts: string[];
  active: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface AdSendLog {
  id: number;
  scheduleId: number;
  templateId: number;
  targetGroup: string;
  accountPhone: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

export interface AdOverviewStats {
  totalSent: number;
  successRate: number;
  todaySent: number;
  activeSchedules: number;
}

export interface NewAdTemplate {
  name: string;
  content: string;
  mediaType: 'text' | 'photo' | 'video' | 'document';
}

export interface NewAdSchedule {
  name: string;
  templateId: number;
  targetGroups: string[];
  sendMode: 'scheduled' | 'triggered' | 'relay' | 'interval';
  scheduleType: 'once' | 'daily' | 'interval' | 'cron';
  scheduleTime: string;
  intervalMinutes: number;
  triggerKeywords: string[];
  accountStrategy: 'rotate' | 'random' | 'sequential';
  assignedAccounts: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdSystemService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  private membershipService = inject(MembershipService);
  
  // 狀態
  readonly templates = signal<AdTemplate[]>([]);
  readonly schedules = signal<AdSchedule[]>([]);
  readonly sendLogs = signal<AdSendLog[]>([]);
  readonly overviewStats = signal<AdOverviewStats>({
    totalSent: 0,
    successRate: 0,
    todaySent: 0,
    activeSchedules: 0
  });
  
  // 表單狀態
  readonly showTemplateForm = signal(false);
  readonly showScheduleForm = signal(false);
  readonly newTemplate = signal<NewAdTemplate>({ name: '', content: '', mediaType: 'text' });
  readonly newSchedule = signal<NewAdSchedule>({
    name: '',
    templateId: 0,
    targetGroups: [],
    sendMode: 'scheduled',
    scheduleType: 'once',
    scheduleTime: '',
    intervalMinutes: 60,
    triggerKeywords: [],
    accountStrategy: 'rotate',
    assignedAccounts: []
  });
  
  // Spintax 預覽
  readonly isPreviewingSpintax = signal(false);
  readonly spintaxPreview = signal<string[]>([]);
  
  // ==================== 載入方法 ====================
  
  loadTemplates(): void {
    this.ipcService.send('get-ad-templates', { activeOnly: false });
  }
  
  loadSchedules(): void {
    this.ipcService.send('get-ad-schedules', { activeOnly: false });
  }
  
  loadSendLogs(limit = 100): void {
    this.ipcService.send('get-ad-send-logs', { limit });
  }
  
  loadOverviewStats(days = 7): void {
    this.ipcService.send('get-ad-overview-stats', { days });
  }
  
  loadAll(): void {
    this.loadTemplates();
    this.loadSchedules();
    this.loadOverviewStats();
  }
  
  // ==================== 模板操作 ====================
  
  createTemplate(): boolean {
    // 檢查權限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning('🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能');
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return false;
    }
    
    const form = this.newTemplate();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入模板名稱');
      return false;
    }
    if (!form.content.trim()) {
      this.toastService.warning('請輸入模板內容');
      return false;
    }
    
    this.ipcService.send('create-ad-template', {
      name: form.name,
      content: form.content,
      mediaType: form.mediaType
    });
    
    this.resetTemplateForm();
    return true;
  }
  
  deleteTemplate(templateId: number): void {
    if (!confirm('確定要刪除此廣告模板嗎？')) return;
    this.ipcService.send('delete-ad-template', { templateId });
  }
  
  toggleTemplateStatus(templateId: number): void {
    this.ipcService.send('toggle-ad-template-status', { templateId });
  }
  
  resetTemplateForm(): void {
    this.newTemplate.set({ name: '', content: '', mediaType: 'text' });
    this.showTemplateForm.set(false);
  }
  
  // ==================== 計劃操作 ====================
  
  createSchedule(): boolean {
    // 檢查權限
    if (!this.membershipService.hasFeature('adBroadcast')) {
      this.toastService.warning('🥈 廣告發送功能需要 白銀精英 或以上會員，升級解鎖更多功能');
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return false;
    }
    
    const form = this.newSchedule();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入計劃名稱');
      return false;
    }
    if (!form.templateId) {
      this.toastService.warning('請選擇廣告模板');
      return false;
    }
    if (form.targetGroups.length === 0) {
      this.toastService.warning('請選擇目標群組');
      return false;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇發送帳號');
      return false;
    }
    
    this.ipcService.send('create-ad-schedule', form);
    this.resetScheduleForm();
    return true;
  }
  
  deleteSchedule(scheduleId: number): void {
    if (!confirm('確定要刪除此廣告計劃嗎？')) return;
    this.ipcService.send('delete-ad-schedule', { scheduleId });
  }
  
  toggleScheduleStatus(scheduleId: number): void {
    this.ipcService.send('toggle-ad-schedule-status', { scheduleId });
  }
  
  runScheduleNow(scheduleId: number): void {
    if (!confirm('確定要立即執行此計劃嗎？')) return;
    this.ipcService.send('run-ad-schedule-now', { scheduleId });
    this.toastService.info('正在執行...');
  }
  
  resetScheduleForm(): void {
    this.newSchedule.set({
      name: '',
      templateId: 0,
      targetGroups: [],
      sendMode: 'scheduled',
      scheduleType: 'once',
      scheduleTime: '',
      intervalMinutes: 60,
      triggerKeywords: [],
      accountStrategy: 'rotate',
      assignedAccounts: []
    });
    this.showScheduleForm.set(false);
  }
  
  // ==================== Spintax 預覽 ====================
  
  previewSpintax(content: string): void {
    if (!content.trim()) {
      this.spintaxPreview.set([]);
      return;
    }
    this.isPreviewingSpintax.set(true);
    this.ipcService.send('validate-spintax', { content });
  }
  
  // ==================== 表單更新輔助方法 ====================
  
  updateTemplateName(value: string): void {
    this.newTemplate.update(t => ({ ...t, name: value }));
  }
  
  updateTemplateContent(value: string): void {
    this.newTemplate.update(t => ({ ...t, content: value }));
  }
  
  updateTemplateMediaType(value: string): void {
    this.newTemplate.update(t => ({ ...t, mediaType: value as any }));
  }
  
  updateScheduleName(value: string): void {
    this.newSchedule.update(s => ({ ...s, name: value }));
  }
  
  updateScheduleTemplateId(value: number): void {
    this.newSchedule.update(s => ({ ...s, templateId: value }));
  }
  
  updateScheduleSendMode(value: string): void {
    this.newSchedule.update(s => ({ ...s, sendMode: value as any }));
  }
  
  updateScheduleType(value: string): void {
    this.newSchedule.update(s => ({ ...s, scheduleType: value as any }));
  }
  
  updateScheduleTime(value: string): void {
    this.newSchedule.update(s => ({ ...s, scheduleTime: value }));
  }
  
  updateScheduleInterval(value: number): void {
    this.newSchedule.update(s => ({ ...s, intervalMinutes: value }));
  }
  
  updateScheduleStrategy(value: string): void {
    this.newSchedule.update(s => ({ ...s, accountStrategy: value as any }));
  }
  
  // ==================== 標籤輔助方法 ====================
  
  getSendModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'scheduled': '定時發送',
      'triggered': '關鍵詞觸發',
      'relay': '接力發送',
      'interval': '間隔循環'
    };
    return labels[mode] || mode;
  }
  
  getScheduleTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'once': '一次性',
      'daily': '每日',
      'interval': '間隔',
      'cron': 'Cron'
    };
    return labels[type] || type;
  }
  
  getAccountStrategyLabel(strategy: string): string {
    const labels: Record<string, string> = {
      'rotate': '輪換',
      'random': '隨機',
      'sequential': '順序'
    };
    return labels[strategy] || strategy;
  }
  
  // ==================== IPC 回調處理 ====================
  
  handleTemplatesResponse(data: any): void {
    if (data.success && data.templates) {
      this.templates.set(data.templates);
    }
  }
  
  handleSchedulesResponse(data: any): void {
    if (data.success && data.schedules) {
      this.schedules.set(data.schedules);
    }
  }
  
  handleSendLogsResponse(data: any): void {
    if (data.success && data.logs) {
      this.sendLogs.set(data.logs);
    }
  }
  
  handleOverviewStatsResponse(data: any): void {
    if (data.success) {
      this.overviewStats.set(data);
    }
  }
  
  handleSpintaxResponse(data: any): void {
    this.isPreviewingSpintax.set(false);
    if (data.success && data.variants) {
      this.spintaxPreview.set(data.variants.slice(0, 5));
    }
  }
  
  handleCreateTemplateResponse(data: any): void {
    if (data.success) {
      this.toastService.success('廣告模板創建成功');
      this.loadTemplates();
    } else {
      this.toastService.error(data.error || '創建失敗');
    }
  }
  
  handleCreateScheduleResponse(data: any): void {
    if (data.success) {
      this.toastService.success('廣告計劃創建成功');
      this.loadSchedules();
    } else {
      this.toastService.error(data.error || '創建失敗');
    }
  }
}
