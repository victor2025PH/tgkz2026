/**
 * Campaign Management Service
 * 營銷活動管理服務
 * 
 * 🆕 Phase 18: 從 app.component.ts 提取
 * 
 * 管理營銷活動的創建、啟動、暫停、刪除等功能
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';
import { MembershipService } from '../membership.service';

// 類型定義
export interface Campaign {
  id: string | number;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  phases: string[];
  keywords: string[];
  targetGroups: string[];
  assignedAccounts: string[];
  actions: CampaignAction[];
  trigger: CampaignTrigger;
  createdAt: string;
  updatedAt?: string;
  stats?: CampaignStats;
}

export interface CampaignAction {
  type: string;
  templateId?: number;
  minDelaySeconds: number;
  maxDelaySeconds: number;
}

export interface CampaignTrigger {
  sourceGroupIds: number[];
  keywordSetIds: number[];
}

export interface CampaignStats {
  totalSent: number;
  successCount: number;
  failureCount: number;
  conversionRate: number;
}

export interface CampaignFormData {
  name: string;
  description: string;
  phases: string[];
  keywords: string[];
  targetGroups: string[];
  assignedAccounts: string[];
}

export interface NewCampaignForm {
  name: string;
  trigger: CampaignTrigger;
  action: {
    templateId: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
  };
}

export interface UnifiedOverview {
  success: boolean;
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  dailyStats: any[];
}

export interface FunnelAnalysis {
  success: boolean;
  stages: FunnelStage[];
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  private membershipService = inject(MembershipService);
  
  // 狀態
  readonly campaigns = signal<Campaign[]>([]);
  readonly selectedCampaign = signal<Campaign | null>(null);
  readonly unifiedOverview = signal<UnifiedOverview | null>(null);
  readonly funnelAnalysis = signal<FunnelAnalysis | null>(null);
  
  // 表單狀態
  readonly showCampaignForm = signal(false);
  readonly campaignFormData = signal<CampaignFormData>({
    name: '',
    description: '',
    phases: ['discovery', 'monitoring', 'outreach'],
    keywords: [],
    targetGroups: [],
    assignedAccounts: []
  });
  readonly newCampaign = signal<NewCampaignForm>(this.getEmptyCampaignForm());
  readonly campaignKeywordInput = signal('');
  readonly isSubmittingCampaign = signal(false);
  
  // 計算屬性
  readonly activeCampaigns = computed(() => 
    this.campaigns().filter(c => c.status === 'running')
  );
  
  readonly pausedCampaigns = computed(() => 
    this.campaigns().filter(c => c.status === 'paused')
  );
  
  readonly completedCampaigns = computed(() => 
    this.campaigns().filter(c => c.status === 'completed')
  );
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ==================== 加載方法 ====================
  
  loadCampaigns(): void {
    this.ipcService.send('get-campaigns', { limit: 50 });
  }
  
  loadUnifiedOverview(): void {
    this.ipcService.send('get-unified-overview', { days: 7 });
  }
  
  loadFunnelAnalysis(): void {
    this.ipcService.send('get-funnel-analysis', {});
  }
  
  loadCampaignData(): void {
    this.loadCampaigns();
    this.loadUnifiedOverview();
    this.loadFunnelAnalysis();
  }
  
  // ==================== 活動操作 ====================
  
  createCampaignFromForm(): void {
    // 检查营销活动权限
    if (!this.membershipService.hasFeature('aiSalesFunnel')) {
      this.toastService.warning(`💎 營銷活動功能需要 鑽石王牌 或以上會員，升級解鎖更多功能`);
      window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      return;
    }
    
    const form = this.campaignFormData();
    if (!form.name.trim()) {
      this.toastService.warning('請輸入活動名稱');
      return;
    }
    if (form.assignedAccounts.length === 0) {
      this.toastService.warning('請選擇帳號');
      return;
    }
    
    this.ipcService.send('create-campaign', {
      name: form.name,
      description: form.description,
      phases: form.phases,
      keywords: form.keywords,
      targetGroups: form.targetGroups,
      assignedAccounts: form.assignedAccounts
    });
    
    this.resetCampaignForm();
  }
  
  addCampaign(): void {
    // 防止重複提交
    if (this.isSubmittingCampaign()) {
      this.toastService.warning('正在創建活動，請稍候...', 2000);
      return;
    }
    
    const form = this.newCampaign();
    const errors: string[] = [];
    
    if (!form.name?.trim()) {
      errors.push('活动名称');
    }
    if (!form.action.templateId || form.action.templateId === 0) {
      errors.push('消息模板');
    }
    if (form.trigger.sourceGroupIds.length === 0) {
      errors.push('至少选择一个来源群组');
    }
    if (form.trigger.keywordSetIds.length === 0) {
      errors.push('至少选择一个关键词集');
    }
    
    if (errors.length > 0) {
      this.toastService.error(`请完善以下内容: ${errors.join(', ')}`);
      return;
    }
    
    // 檢查本地是否已有同名活動
    const campaignName = form.name.trim();
    const existingCampaign = this.campaigns().find(c => c.name === campaignName);
    if (existingCampaign) {
      this.toastService.warning(`活動 "${campaignName}" 已存在，請使用不同的名稱`, 4000);
      return;
    }
    
    // 設置提交狀態
    this.isSubmittingCampaign.set(true);
    
    // 立即清空表單，防止重複提交
    this.newCampaign.set(this.getEmptyCampaignForm());
    
    // 發送創建請求
    this.ipcService.send('add-campaign', { ...form });
    
    // 3 秒後重置提交狀態（如果後端沒有響應）
    setTimeout(() => {
      this.isSubmittingCampaign.set(false);
    }, 3000);
  }
  
  startCampaign(campaignId: string): void {
    if (!confirm('確定要啟動此活動嗎？')) return;
    this.ipcService.send('start-campaign', { campaignId });
  }
  
  pauseCampaign(campaignId: string): void {
    this.ipcService.send('pause-campaign', { campaignId });
  }
  
  resumeCampaign(campaignId: string): void {
    this.ipcService.send('resume-campaign', { campaignId });
  }
  
  stopCampaign(campaignId: string): void {
    if (!confirm('確定要停止此活動嗎？')) return;
    this.ipcService.send('stop-campaign', { campaignId });
  }
  
  deleteCampaign(campaignId: string): void {
    if (!confirm('確定要刪除此活動嗎？')) return;
    this.ipcService.send('delete-campaign', { campaignId });
  }
  
  toggleCampaignStatus(id: number): void {
    this.ipcService.send('toggle-campaign-status', { id });
  }
  
  viewCampaignDetails(campaign: Campaign): void {
    this.selectedCampaign.set(campaign);
    this.ipcService.send('get-campaign-logs', { campaignId: campaign.id });
  }
  
  // ==================== 表單操作 ====================
  
  toggleCampaignPhase(phase: string): void {
    this.campaignFormData.update(c => {
      const phases = [...c.phases];
      const idx = phases.indexOf(phase);
      if (idx >= 0) {
        phases.splice(idx, 1);
      } else {
        phases.push(phase);
      }
      return { ...c, phases };
    });
  }
  
  addCampaignKeyword(): void {
    const keyword = this.campaignKeywordInput().trim();
    if (!keyword) return;
    
    this.campaignFormData.update(c => ({
      ...c,
      keywords: [...c.keywords, keyword]
    }));
    this.campaignKeywordInput.set('');
  }
  
  removeCampaignKeyword(keyword: string): void {
    this.campaignFormData.update(c => ({
      ...c,
      keywords: c.keywords.filter(k => k !== keyword)
    }));
  }
  
  toggleCampaignAccount(phone: string): void {
    this.campaignFormData.update(c => {
      const accounts = [...c.assignedAccounts];
      const idx = accounts.indexOf(phone);
      if (idx >= 0) {
        accounts.splice(idx, 1);
      } else {
        accounts.push(phone);
      }
      return { ...c, assignedAccounts: accounts };
    });
  }
  
  toggleNewCampaignSourceGroup(groupId: number): void {
    this.newCampaign.update(c => {
      const ids = [...c.trigger.sourceGroupIds];
      const idx = ids.indexOf(groupId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(groupId);
      }
      return { ...c, trigger: { ...c.trigger, sourceGroupIds: ids } };
    });
  }
  
  toggleNewCampaignKeywordSet(setId: number): void {
    this.newCampaign.update(c => {
      const ids = [...c.trigger.keywordSetIds];
      const idx = ids.indexOf(setId);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(setId);
      }
      return { ...c, trigger: { ...c.trigger, keywordSetIds: ids } };
    });
  }
  
  updateCampaignFormName(value: string): void {
    this.campaignFormData.update(c => ({ ...c, name: value }));
  }
  
  updateCampaignFormDesc(value: string): void {
    this.campaignFormData.update(c => ({ ...c, description: value }));
  }
  
  updateNewCampaignName(value: string): void {
    this.newCampaign.update(c => ({ ...c, name: value }));
  }
  
  updateNewCampaignTemplateId(value: number): void {
    this.newCampaign.update(c => ({ 
      ...c, 
      action: { ...c.action, templateId: value } 
    }));
  }
  
  // ==================== 輔助方法 ====================
  
  getEmptyCampaignForm(): NewCampaignForm {
    return {
      name: '',
      trigger: { sourceGroupIds: [], keywordSetIds: [] },
      action: { templateId: 0, minDelaySeconds: 30, maxDelaySeconds: 120 }
    };
  }
  
  resetCampaignForm(): void {
    this.campaignFormData.set({
      name: '',
      description: '',
      phases: ['discovery', 'monitoring', 'outreach'],
      keywords: [],
      targetGroups: [],
      assignedAccounts: []
    });
    this.showCampaignForm.set(false);
  }
  
  getCampaignStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': '草稿',
      'scheduled': '已排程',
      'running': '運行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  getCampaignStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'draft': 'bg-slate-500/20 text-slate-400',
      'scheduled': 'bg-blue-500/20 text-blue-400',
      'running': 'bg-green-500/20 text-green-400',
      'paused': 'bg-yellow-500/20 text-yellow-400',
      'completed': 'bg-cyan-500/20 text-cyan-400',
      'failed': 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  getPhaseLabel(phase: string): string {
    const labels: Record<string, string> = {
      'discovery': '資源發現',
      'monitoring': '監控獲客',
      'outreach': '廣告觸達',
      'tracking': '用戶追蹤',
      'conversion': '轉化成交'
    };
    return labels[phase] || phase;
  }
  
  getCampaignName(id?: number): string {
    if (!id) return 'N/A';
    return this.campaigns().find(c => c.id === id)?.name || 'Unknown Campaign';
  }
  
  getCampaignById(id: number | undefined): Campaign | undefined {
    if (id === undefined) return undefined;
    return this.campaigns().find(c => c.id === id);
  }
  
  // ==================== IPC 事件處理 ====================
  
  private setupIpcListeners(): void {
    this.ipcService.on('campaigns-result', (data: any) => this.handleCampaigns(data));
    this.ipcService.on('campaign-created', (data: any) => this.handleCampaignCreated(data));
    this.ipcService.on('campaign-deleted', (data: any) => this.handleCampaignDeleted(data));
    this.ipcService.on('unified-overview-result', (data: any) => this.handleUnifiedOverview(data));
    this.ipcService.on('funnel-analysis-result', (data: any) => this.handleFunnelAnalysis(data));
    this.ipcService.on('campaign-added', (data: any) => this.handleCampaignAdded(data));
    this.ipcService.on('campaign-status-toggled', (data: any) => this.handleCampaignStatusToggled(data));
  }
  
  private handleCampaigns(data: any): void {
    if (data.success) {
      this.campaigns.set(data.campaigns || []);
    }
  }
  
  private handleCampaignCreated(data: any): void {
    if (data.success) {
      this.toastService.success('營銷活動已創建');
      this.loadCampaigns();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleCampaignDeleted(data: any): void {
    if (data.success) {
      this.toastService.success('營銷活動已刪除');
      this.loadCampaigns();
    }
  }
  
  private handleUnifiedOverview(data: any): void {
    if (data.success) {
      this.unifiedOverview.set(data);
    }
  }
  
  private handleFunnelAnalysis(data: any): void {
    if (data.success) {
      this.funnelAnalysis.set(data);
    }
  }
  
  private handleCampaignAdded(data: any): void {
    this.isSubmittingCampaign.set(false);
    if (data.success) {
      this.toastService.success('活動創建成功');
      this.loadCampaigns();
    } else {
      this.toastService.error(`創建失敗: ${data.error}`);
    }
  }
  
  private handleCampaignStatusToggled(data: any): void {
    if (data.success) {
      this.loadCampaigns();
    }
  }
}
