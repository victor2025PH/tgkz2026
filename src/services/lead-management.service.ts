/**
 * Lead Management Service
 * 線索管理服務
 * 
 * 🆕 Phase 19: 從 app.component.ts 提取
 * 
 * 管理潛在客戶的捕獲、分類、跟進等功能
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export type LeadStage = 'New' | 'Contacted' | 'Replied' | 'Follow-up' | 'Closed-Won' | 'Closed-Lost';

export interface Lead {
  id: number;
  username: string;
  userId?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  sourceGroup: string;
  sourceGroupId?: number;
  keyword: string;
  message: string;
  stage: LeadStage;
  score?: number;
  tags?: string[];
  notes?: string;
  assignedTo?: string;
  lastContact?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt?: string;
  interactions?: LeadInteraction[];
}

export interface LeadInteraction {
  id: number;
  leadId: number;
  type: 'message_sent' | 'message_received' | 'note_added' | 'stage_changed' | 'call';
  content: string;
  accountPhone?: string;
  createdAt: string;
}

export interface LeadFilter {
  stage?: LeadStage;
  search?: string;
  sourceGroup?: string;
  dateRange?: { start: string; end: string };
  assignedTo?: string;
  minScore?: number;
}

export interface LeadStats {
  total: number;
  byStage: Record<LeadStage, number>;
  todayNew: number;
  todayContacted: number;
  conversionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class LeadManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 狀態
  readonly leads = signal<Lead[]>([]);
  readonly selectedLead = signal<Lead | null>(null);
  readonly leadStats = signal<LeadStats>({
    total: 0,
    byStage: { 'New': 0, 'Contacted': 0, 'Replied': 0, 'Follow-up': 0, 'Closed-Won': 0, 'Closed-Lost': 0 },
    todayNew: 0,
    todayContacted: 0,
    conversionRate: 0
  });
  
  // 篩選和視圖
  readonly filter = signal<LeadFilter>({});
  readonly viewMode = signal<'kanban' | 'list'>('kanban');
  readonly isLoading = signal(false);
  
  // 批量操作
  readonly selectedLeadIds = signal<Set<number>>(new Set());
  readonly showBatchActions = signal(false);
  
  // 詳情面板
  readonly showLeadDetails = signal(false);
  readonly detailsTab = signal<'sendMessage' | 'history' | 'profile'>('sendMessage');
  
  // 刪除確認
  readonly showDeleteConfirm = signal(false);
  readonly leadsToDelete = signal<Lead[]>([]);
  
  // 計算屬性
  readonly filteredLeads = computed(() => {
    let result = this.leads();
    const f = this.filter();
    
    if (f.stage) {
      result = result.filter(l => l.stage === f.stage);
    }
    
    if (f.search) {
      const search = f.search.toLowerCase();
      result = result.filter(l => 
        l.username.toLowerCase().includes(search) ||
        l.firstName?.toLowerCase().includes(search) ||
        l.lastName?.toLowerCase().includes(search) ||
        l.message.toLowerCase().includes(search)
      );
    }
    
    if (f.sourceGroup) {
      result = result.filter(l => l.sourceGroup === f.sourceGroup);
    }
    
    if (f.minScore !== undefined) {
      result = result.filter(l => (l.score || 0) >= f.minScore!);
    }
    
    return result;
  });
  
  readonly leadsByStage = computed(() => {
    const stages: LeadStage[] = ['New', 'Contacted', 'Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost'];
    const result: Record<LeadStage, Lead[]> = {} as any;
    
    stages.forEach(stage => {
      result[stage] = this.filteredLeads().filter(l => l.stage === stage);
    });
    
    return result;
  });
  
  readonly selectedCount = computed(() => this.selectedLeadIds().size);
  
  readonly stageLabels: Record<LeadStage, string> = {
    'New': '新線索',
    'Contacted': '已聯繫',
    'Replied': '已回覆',
    'Follow-up': '需跟進',
    'Closed-Won': '已成交',
    'Closed-Lost': '已流失'
  };
  
  readonly stageColors: Record<LeadStage, string> = {
    'New': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'Contacted': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'Replied': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'Follow-up': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'Closed-Won': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'Closed-Lost': 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ==================== 加載方法 ====================
  
  loadLeads(limit = 100): void {
    this.isLoading.set(true);
    this.ipcService.send('get-leads', { limit });
  }
  
  loadLeadStats(): void {
    this.ipcService.send('get-lead-stats', {});
  }
  
  loadLeadDetails(leadId: number): void {
    this.ipcService.send('get-lead-details', { leadId });
  }
  
  refreshData(): void {
    this.loadLeads();
    this.loadLeadStats();
  }
  
  // ==================== 線索操作 ====================
  
  selectLead(lead: Lead): void {
    this.selectedLead.set(lead);
    this.showLeadDetails.set(true);
    this.loadLeadDetails(lead.id);
  }
  
  closeLeadDetails(): void {
    this.showLeadDetails.set(false);
    this.selectedLead.set(null);
  }
  
  updateLeadStage(leadId: number, newStage: LeadStage): void {
    this.ipcService.send('update-lead-stage', { leadId, stage: newStage });
    
    // 本地更新
    this.leads.update(leads => 
      leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l)
    );
    
    if (this.selectedLead()?.id === leadId) {
      this.selectedLead.update(l => l ? { ...l, stage: newStage } : null);
    }
  }
  
  addNote(leadId: number, note: string): void {
    if (!note.trim()) return;
    this.ipcService.send('add-lead-note', { leadId, note });
  }
  
  assignLead(leadId: number, assignTo: string): void {
    this.ipcService.send('assign-lead', { leadId, assignTo });
    
    // 本地更新
    this.leads.update(leads => 
      leads.map(l => l.id === leadId ? { ...l, assignedTo: assignTo } : l)
    );
  }
  
  addToBlacklist(leadId: number): void {
    if (!confirm('確定要將此用戶加入黑名單嗎？')) return;
    this.ipcService.send('add-to-blacklist', { leadId });
    this.toastService.success('已加入黑名單');
  }
  
  // ==================== 批量操作 ====================
  
  toggleLeadSelection(leadId: number): void {
    this.selectedLeadIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(leadId)) {
        newIds.delete(leadId);
      } else {
        newIds.add(leadId);
      }
      return newIds;
    });
  }
  
  selectAllLeads(): void {
    const allIds = new Set(this.filteredLeads().map(l => l.id));
    this.selectedLeadIds.set(allIds);
  }
  
  clearSelection(): void {
    this.selectedLeadIds.set(new Set());
  }
  
  batchUpdateStage(newStage: LeadStage): void {
    const ids = Array.from(this.selectedLeadIds());
    if (ids.length === 0) return;
    
    this.ipcService.send('batch-update-lead-stage', { leadIds: ids, stage: newStage });
    
    // 本地更新
    this.leads.update(leads => 
      leads.map(l => ids.includes(l.id) ? { ...l, stage: newStage } : l)
    );
    
    this.clearSelection();
    this.toastService.success(`已更新 ${ids.length} 個線索的狀態`);
  }
  
  confirmDeleteLeads(): void {
    const ids = Array.from(this.selectedLeadIds());
    if (ids.length === 0) return;
    
    const leadsToDelete = this.leads().filter(l => ids.includes(l.id));
    this.leadsToDelete.set(leadsToDelete);
    this.showDeleteConfirm.set(true);
  }
  
  cancelDeleteLeads(): void {
    this.showDeleteConfirm.set(false);
    this.leadsToDelete.set([]);
  }
  
  executeDeleteLeads(): void {
    const ids = this.leadsToDelete().map(l => l.id);
    
    this.ipcService.send('batch-delete-leads', { leadIds: ids });
    
    // 本地更新
    this.leads.update(leads => leads.filter(l => !ids.includes(l.id)));
    
    this.clearSelection();
    this.showDeleteConfirm.set(false);
    this.leadsToDelete.set([]);
    this.toastService.success(`已刪除 ${ids.length} 個線索`);
  }
  
  // ==================== 篩選和視圖 ====================
  
  setFilter(filter: Partial<LeadFilter>): void {
    this.filter.update(f => ({ ...f, ...filter }));
  }
  
  clearFilter(): void {
    this.filter.set({});
  }
  
  setViewMode(mode: 'kanban' | 'list'): void {
    this.viewMode.set(mode);
  }
  
  setDetailsTab(tab: 'sendMessage' | 'history' | 'profile'): void {
    this.detailsTab.set(tab);
  }
  
  // ==================== 導出 ====================
  
  exportToExcel(): void {
    const leads = this.filteredLeads();
    if (leads.length === 0) {
      this.toastService.warning('沒有可導出的線索');
      return;
    }
    
    this.ipcService.send('export-leads-to-excel', { 
      leadIds: leads.map(l => l.id) 
    });
    this.toastService.info('正在導出...');
  }
  
  // ==================== 輔助方法 ====================
  
  getStageLabel(stage: LeadStage): string {
    return this.stageLabels[stage] || stage;
  }
  
  getStageColor(stage: LeadStage): string {
    return this.stageColors[stage] || 'bg-slate-500/20 text-slate-400';
  }
  
  getLeadDisplayName(lead: Lead): string {
    if (lead.firstName || lead.lastName) {
      return `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    }
    return lead.username || 'Unknown';
  }
  
  // ==================== IPC 事件處理 ====================
  
  private setupIpcListeners(): void {
    this.ipcService.on('leads-result', (data: any) => this.handleLeads(data));
    this.ipcService.on('lead-stats-result', (data: any) => this.handleLeadStats(data));
    this.ipcService.on('lead-details-result', (data: any) => this.handleLeadDetails(data));
    this.ipcService.on('lead-captured', (data: any) => this.handleLeadCaptured(data));
    this.ipcService.on('lead-stage-updated', (data: any) => this.handleLeadStageUpdated(data));
    this.ipcService.on('leads-exported', (data: any) => this.handleLeadsExported(data));
  }
  
  private handleLeads(data: any): void {
    this.isLoading.set(false);
    if (data.success || data.leads) {
      this.leads.set(data.leads || []);
    }
  }
  
  private handleLeadStats(data: any): void {
    if (data.success) {
      this.leadStats.set(data.stats);
    }
  }
  
  private handleLeadDetails(data: any): void {
    if (data.success && data.lead) {
      this.selectedLead.set(data.lead);
    }
  }
  
  private handleLeadCaptured(data: any): void {
    if (data.lead) {
      this.leads.update(leads => [data.lead, ...leads]);
      this.toastService.success(`捕獲新線索: ${data.lead.username}`);
    }
  }
  
  private handleLeadStageUpdated(data: any): void {
    if (data.success) {
      this.loadLeadStats();
    }
  }
  
  private handleLeadsExported(data: any): void {
    if (data.success) {
      this.toastService.success(`導出成功: ${data.filePath}`);
    } else {
      this.toastService.error(`導出失敗: ${data.error}`);
    }
  }
}
