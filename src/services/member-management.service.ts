/**
 * Member Management Service
 * 成員管理服務
 * 
 * 🆕 Phase 17: 從 app.component.ts 提取
 * 
 * 管理群組成員提取、篩選、導出等功能
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export interface ExtractedMember {
  id: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  isPremium: boolean;
  isBot: boolean;
  isScam: boolean;
  isDeleted: boolean;
  lastOnline?: Date;
  photo?: string;
  valueLevel?: 'high' | 'medium' | 'low';
}

export interface MemberExtractionConfig {
  limit: number;
  customLimit: number;
  backgroundMode: boolean;
  userTypes: {
    chinese: boolean;
    overseas: boolean;
  };
  activityFilters: {
    onlineNow: boolean;
    within3Days: boolean;
    within7Days: boolean;
    within30Days: boolean;
    longOffline: boolean;
  };
  accountFeatures: {
    premium: boolean;
    hasUsername: boolean;
    hasPhoto: boolean;
    newAccount: boolean;
    activeAccount: boolean;
    verified: boolean;
  };
  excludeFilters: {
    bots: boolean;
    scam: boolean;
    deleted: boolean;
  };
}

export interface MemberListProgress {
  extracted: number;
  total: number;
  status: string;
}

export interface GroupResource {
  id: number;
  telegram_id: string;
  username?: string;
  title: string;
  member_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class MemberManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 成員列表狀態
  readonly members = signal<ExtractedMember[]>([]);
  readonly selectedMemberIds = signal<string[]>([]);
  readonly currentResource = signal<GroupResource | null>(null);
  readonly isLoading = signal(false);
  readonly progress = signal<MemberListProgress>({ extracted: 0, total: 0, status: '' });
  
  // 提取設置
  readonly extractionConfig = signal<MemberExtractionConfig>(this.getDefaultConfig());
  readonly extractionStarted = signal(false);
  readonly extractionPaused = signal(false);
  
  // 對話框狀態
  readonly showMemberListDialog = signal(false);
  readonly showBatchExtractDialog = signal(false);
  
  // 篩選器
  readonly memberFilter = signal<string>('all');
  
  // 計算屬性
  readonly filteredMembers = computed(() => {
    const members = this.members();
    const filter = this.memberFilter();
    
    switch (filter) {
      case 'chinese':
        return members.filter(m => this.isChineseMember(m));
      case 'online':
        return members.filter(m => this.isOnlineMember(m));
      case 'premium':
        return members.filter(m => m.isPremium);
      case 'high-value':
        return members.filter(m => m.valueLevel === 'high');
      default:
        return members;
    }
  });
  
  readonly selectedCount = computed(() => this.selectedMemberIds().length);
  readonly chineseMemberCount = computed(() => this.members().filter(m => this.isChineseMember(m)).length);
  readonly onlineMemberCount = computed(() => this.members().filter(m => this.isOnlineMember(m)).length);
  readonly premiumMemberCount = computed(() => this.members().filter(m => m.isPremium).length);
  readonly isAllSelected = computed(() => {
    const filtered = this.filteredMembers();
    const selected = this.selectedMemberIds();
    return filtered.length > 0 && filtered.every(m => selected.includes(m.id));
  });
  
  // ==================== 對話框操作 ====================
  
  openMemberListDialog(resource: GroupResource): void {
    this.currentResource.set(resource);
    this.members.set([]);
    this.isLoading.set(false);
    this.progress.set({ extracted: 0, total: resource.member_count || 0, status: '' });
    this.selectedMemberIds.set([]);
    this.extractionStarted.set(false);
    this.memberFilter.set('all');
    this.extractionConfig.set(this.getDefaultConfig());
    this.showMemberListDialog.set(true);
  }
  
  closeMemberListDialog(): void {
    this.showMemberListDialog.set(false);
    this.currentResource.set(null);
    this.members.set([]);
  }
  
  openBatchExtractDialog(): void {
    this.showBatchExtractDialog.set(true);
  }
  
  closeBatchExtractDialog(): void {
    this.showBatchExtractDialog.set(false);
  }
  
  // ==================== 成員提取操作 ====================
  
  loadMembers(resource?: GroupResource): void {
    const target = resource || this.currentResource();
    if (!target || !target.telegram_id) {
      this.toastService.error('無效的群組信息');
      return;
    }
    
    this.isLoading.set(true);
    this.progress.update(p => ({ ...p, status: '正在提取成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: target.id,
      telegramId: target.telegram_id,
      username: target.username,
      phone: (target as any).joined_phone || (target as any).joined_by_phone || null,  // 🆕 Phase2: 補全 phone
      limit: 200,
      offset: 0
    });
  }
  
  loadMore(): void {
    const resource = this.currentResource();
    const currentCount = this.members().length;
    
    if (!resource) return;
    
    this.isLoading.set(true);
    this.progress.update(p => ({ ...p, status: '正在提取更多成員...' }));
    
    this.ipcService.send('extract-members', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      phone: (resource as any).joined_phone || (resource as any).joined_by_phone || null,  // 🆕 Phase2: 補全 phone
      limit: 200,
      offset: currentCount
    });
  }
  
  startExtraction(): void {
    const resource = this.currentResource();
    const config = this.extractionConfig();
    
    if (!resource) {
      this.toastService.error('無效的群組信息');
      return;
    }
    
    this.extractionStarted.set(true);
    this.isLoading.set(true);
    this.progress.set({ extracted: 0, total: resource.member_count || 0, status: '開始提取...' });
    
    this.ipcService.send('start-member-extraction', {
      resourceId: resource.id,
      telegramId: resource.telegram_id,
      username: resource.username,
      config
    });
  }
  
  pauseExtraction(): void {
    this.extractionPaused.set(true);
    this.ipcService.send('pause-member-extraction', {});
  }
  
  resumeExtraction(): void {
    this.extractionPaused.set(false);
    this.ipcService.send('resume-member-extraction', {});
  }
  
  stopExtraction(): void {
    this.extractionStarted.set(false);
    this.extractionPaused.set(false);
    this.isLoading.set(false);
    this.ipcService.send('stop-member-extraction', {});
  }
  
  // ==================== 成員選擇操作 ====================
  
  toggleMemberSelection(memberId: string): void {
    const current = this.selectedMemberIds();
    if (current.includes(memberId)) {
      this.selectedMemberIds.set(current.filter(id => id !== memberId));
    } else {
      this.selectedMemberIds.set([...current, memberId]);
    }
  }
  
  selectAll(): void {
    const filtered = this.filteredMembers();
    this.selectedMemberIds.set(filtered.map(m => m.id));
  }
  
  clearSelection(): void {
    this.selectedMemberIds.set([]);
  }
  
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  }
  
  selectHighValue(): void {
    const highValue = this.members().filter(m => m.valueLevel === 'high');
    this.selectedMemberIds.set(highValue.map(m => m.id));
    this.toastService.info(`已選擇 ${highValue.length} 個高價值成員`);
  }
  
  selectOnline(): void {
    const online = this.members().filter(m => this.isOnlineMember(m));
    this.selectedMemberIds.set(online.map(m => m.id));
    this.toastService.info(`已選擇 ${online.length} 個在線成員`);
  }
  
  // ==================== 設置操作 ====================
  
  setFilter(filter: string): void {
    this.memberFilter.set(filter);
  }
  
  setExtractLimit(limit: number): void {
    this.extractionConfig.update(c => ({ ...c, limit }));
  }
  
  setCustomLimit(customLimit: number): void {
    this.extractionConfig.update(c => ({ ...c, customLimit }));
  }
  
  toggleBackgroundMode(): void {
    this.extractionConfig.update(c => ({ ...c, backgroundMode: !c.backgroundMode }));
  }
  
  toggleUserType(type: 'chinese' | 'overseas'): void {
    this.extractionConfig.update(c => ({
      ...c,
      userTypes: { ...c.userTypes, [type]: !c.userTypes[type] }
    }));
  }
  
  toggleActivityFilter(filter: keyof MemberExtractionConfig['activityFilters']): void {
    this.extractionConfig.update(c => ({
      ...c,
      activityFilters: { ...c.activityFilters, [filter]: !c.activityFilters[filter] }
    }));
  }
  
  toggleAccountFeature(feature: keyof MemberExtractionConfig['accountFeatures']): void {
    this.extractionConfig.update(c => ({
      ...c,
      accountFeatures: { ...c.accountFeatures, [feature]: !c.accountFeatures[feature] }
    }));
  }
  
  toggleExcludeFilter(filter: keyof MemberExtractionConfig['excludeFilters']): void {
    this.extractionConfig.update(c => ({
      ...c,
      excludeFilters: { ...c.excludeFilters, [filter]: !c.excludeFilters[filter] }
    }));
  }
  
  // ==================== 導出操作 ====================
  
  exportToCSV(): void {
    const members = this.members();
    if (members.length === 0) {
      this.toastService.warning('沒有可導出的成員');
      return;
    }
    
    const csv = this.generateCSV(members);
    this.downloadCSV(csv, `members_${Date.now()}.csv`);
    this.toastService.success(`已導出 ${members.length} 個成員`);
  }
  
  exportSelectedToCSV(): void {
    const selectedIds = this.selectedMemberIds();
    const selected = this.members().filter(m => selectedIds.includes(m.id));
    
    if (selected.length === 0) {
      this.toastService.warning('請先選擇要導出的成員');
      return;
    }
    
    const csv = this.generateCSV(selected);
    this.downloadCSV(csv, `selected_members_${Date.now()}.csv`);
    this.toastService.success(`已導出 ${selected.length} 個成員`);
  }
  
  // ==================== 輔助方法 ====================
  
  isChineseMember(member: ExtractedMember): boolean {
    const name = `${member.firstName || ''} ${member.lastName || ''}`;
    return /[\u4e00-\u9fff]/.test(name);
  }
  
  isOnlineMember(member: ExtractedMember): boolean {
    if (!member.lastOnline) return false;
    const now = new Date();
    const diff = now.getTime() - new Date(member.lastOnline).getTime();
    return diff < 5 * 60 * 1000; // 5分鐘內
  }
  
  calculateValueLevel(member: ExtractedMember): 'high' | 'medium' | 'low' {
    let score = 0;
    
    if (member.isPremium) score += 3;
    if (member.username) score += 2;
    if (member.photo) score += 1;
    if (this.isOnlineMember(member)) score += 2;
    if (!member.isBot && !member.isScam && !member.isDeleted) score += 1;
    
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }
  
  formatMemberCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  }
  
  getExtractPercent(): number {
    const progress = this.progress();
    if (progress.total === 0) return 0;
    return Math.round((progress.extracted / progress.total) * 100);
  }
  
  private getDefaultConfig(): MemberExtractionConfig {
    return {
      limit: 500,
      customLimit: 1000,
      backgroundMode: false,
      userTypes: { chinese: false, overseas: false },
      activityFilters: {
        onlineNow: false,
        within3Days: false,
        within7Days: false,
        within30Days: false,
        longOffline: false
      },
      accountFeatures: {
        premium: false,
        hasUsername: false,
        hasPhoto: false,
        newAccount: false,
        activeAccount: false,
        verified: false
      },
      excludeFilters: {
        bots: true,
        scam: true,
        deleted: true
      }
    };
  }
  
  private generateCSV(members: ExtractedMember[]): string {
    const headers = ['ID', 'Username', 'First Name', 'Last Name', 'Premium', 'Value Level'];
    const rows = members.map(m => [
      m.telegramId,
      m.username || '',
      m.firstName || '',
      m.lastName || '',
      m.isPremium ? 'Yes' : 'No',
      m.valueLevel || ''
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
  
  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
  
  // ==================== IPC 回調處理 ====================
  
  handleMembersResponse(data: any): void {
    this.isLoading.set(false);
    if (data.success && data.members) {
      const current = this.members();
      const newMembers = data.members.map((m: any) => ({
        ...m,
        valueLevel: this.calculateValueLevel(m)
      }));
      
      if (data.offset === 0) {
        this.members.set(newMembers);
      } else {
        this.members.set([...current, ...newMembers]);
      }
      
      this.progress.update(p => ({
        ...p,
        extracted: this.members().length,
        status: `已提取 ${this.members().length} 個成員`
      }));
    } else {
      this.toastService.error(data.error || '提取成員失敗');
    }
  }
  
  handleExtractionProgress(data: any): void {
    this.progress.set({
      extracted: data.extracted || 0,
      total: data.total || 0,
      status: data.status || ''
    });
  }
  
  handleExtractionComplete(data: any): void {
    this.isLoading.set(false);
    this.extractionStarted.set(false);
    if (data.success) {
      this.toastService.success(`成員提取完成，共 ${data.count} 個`);
    }
  }
  
  handleExtractionError(data: any): void {
    this.isLoading.set(false);
    this.toastService.error(data.error || '提取過程發生錯誤');
  }
}
