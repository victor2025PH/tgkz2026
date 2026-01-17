/**
 * TG-AI智控王 成員提取服務
 * Member Extraction Service v1.0
 * 
 * 功能：
 * - 群組成員提取
 * - 成員篩選
 * - 數據導出
 * - 批量操作
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService as IpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MembershipService, MEMBERSHIP_CONFIG } from '../membership.service';
import {
  MemberBasicInfo,
  MemberDetailInfo,
  MemberFilters,
  MemberExtractionRequest,
  MemberExtractionResult,
  ExportConfig,
  ExportFormat,
  ExportResult,
  BatchOperation,
  BatchOperationType,
  BatchOperationConfig,
  GroupBasicInfo
} from './search.types';

// ============ 提取配額 ============

const EXTRACTION_QUOTAS: Record<string, number> = {
  bronze: 0,
  silver: 100,
  gold: 500,
  diamond: 2000,
  star: 5000,
  king: -1  // 無限
};

@Injectable({
  providedIn: 'root'
})
export class MemberExtractionService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  private membershipService = inject(MembershipService);
  
  // ============ 狀態 ============
  
  private _isExtracting = signal(false);
  private _extractionProgress = signal<{
    current: number;
    total: number;
    percent: number;
  } | null>(null);
  
  private _currentGroup = signal<GroupBasicInfo | null>(null);
  private _extractedMembers = signal<MemberBasicInfo[]>([]);
  private _selectedMembers = signal<Set<string>>(new Set());
  
  // 批量操作
  private _batchOperations = signal<BatchOperation[]>([]);
  private _currentOperation = signal<BatchOperation | null>(null);
  
  // 今日提取計數
  private _todayExtractionCount = signal(0);
  
  // ============ 計算屬性 ============
  
  isExtracting = computed(() => this._isExtracting());
  extractionProgress = computed(() => this._extractionProgress());
  currentGroup = computed(() => this._currentGroup());
  extractedMembers = computed(() => this._extractedMembers());
  selectedMembers = computed(() => this._selectedMembers());
  selectedCount = computed(() => this._selectedMembers().size);
  batchOperations = computed(() => this._batchOperations());
  currentOperation = computed(() => this._currentOperation());
  
  // 提取配額
  extractionQuota = computed(() => {
    const level = this.membershipService.level();
    return EXTRACTION_QUOTAS[level] || 0;
  });
  
  // 剩餘提取額度
  remainingExtraction = computed(() => {
    const quota = this.extractionQuota();
    if (quota === -1) return -1;
    return Math.max(0, quota - this._todayExtractionCount());
  });
  
  // 是否可以提取
  canExtract = computed(() => {
    const quota = this.extractionQuota();
    if (quota === 0) return false;
    if (quota === -1) return true;
    return this._todayExtractionCount() < quota;
  });
  
  constructor() {
    this.loadTodayCount();
    this.loadBatchOperations();
  }
  
  // ============ 初始化 ============
  
  private loadTodayCount(): void {
    try {
      const data = localStorage.getItem('tgai-extraction-count');
      if (data) {
        const { date, count } = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];
        if (date === today) {
          this._todayExtractionCount.set(count);
        }
      }
    } catch {}
  }
  
  private saveTodayCount(): void {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('tgai-extraction-count', JSON.stringify({
      date: today,
      count: this._todayExtractionCount()
    }));
  }
  
  private loadBatchOperations(): void {
    try {
      const data = localStorage.getItem('tgai-batch-operations');
      if (data) {
        const operations = JSON.parse(data);
        this._batchOperations.set(operations.map((op: any) => ({
          ...op,
          createdAt: new Date(op.createdAt),
          startedAt: op.startedAt ? new Date(op.startedAt) : undefined,
          completedAt: op.completedAt ? new Date(op.completedAt) : undefined
        })));
      }
    } catch {}
  }
  
  private saveBatchOperations(): void {
    localStorage.setItem('tgai-batch-operations', JSON.stringify(this._batchOperations()));
  }
  
  // ============ 成員提取 ============
  
  /**
   * 提取群組成員
   */
  async extractMembers(
    group: GroupBasicInfo,
    filters?: MemberFilters,
    limit?: number
  ): Promise<MemberExtractionResult | null> {
    // 檢查權限
    if (!this.canExtract()) {
      const quota = this.extractionQuota();
      if (quota === 0) {
        this.toastService.warning(`${this.membershipService.levelIcon()} ${this.membershipService.levelName()} 無法使用成員提取功能，請升級會員`);
      } else {
        this.toastService.warning(`今日提取額度已用完 (${quota}人)，請升級會員`);
      }
      return null;
    }
    
    // 計算實際可提取數量
    const remaining = this.remainingExtraction();
    const actualLimit = remaining === -1 ? (limit || 1000) : Math.min(limit || 1000, remaining);
    
    this._isExtracting.set(true);
    this._currentGroup.set(group);
    this._extractedMembers.set([]);
    this._selectedMembers.set(new Set());
    this._extractionProgress.set({ current: 0, total: group.membersCount, percent: 0 });
    
    try {
      const request: MemberExtractionRequest = {
        groupId: group.id,
        filters,
        limit: actualLimit,
        offset: 0
      };
      
      // 監聽進度更新
      const progressHandler = (data: any) => {
        this._extractionProgress.set({
          current: data.current,
          total: data.total,
          percent: Math.round((data.current / data.total) * 100)
        });
        
        // 增量添加成員
        if (data.members) {
          this._extractedMembers.update(members => [...members, ...data.members]);
        }
      };
      
      this.ipcService.on('extraction-progress', progressHandler);
      
      const result = await this.ipcService.invoke('extract-members', request);
      
      this.ipcService.off('extraction-progress', progressHandler);
      
      if (result.success) {
        const extractionResult: MemberExtractionResult = {
          groupId: group.id,
          groupTitle: group.title,
          members: result.data.members || this._extractedMembers(),
          totalCount: result.data.totalCount || group.membersCount,
          extractedCount: result.data.extractedCount || this._extractedMembers().length,
          hasMore: result.data.hasMore || false,
          timestamp: new Date()
        };
        
        // 更新提取數量
        this._extractedMembers.set(extractionResult.members);
        this._todayExtractionCount.update(n => n + extractionResult.extractedCount);
        this.saveTodayCount();
        
        this.toastService.success(`成功提取 ${extractionResult.extractedCount} 名成員`);
        
        return extractionResult;
      } else {
        throw new Error(result.message || '提取失敗');
      }
    } catch (error: any) {
      this.toastService.error(error.message || '成員提取失敗');
      return null;
    } finally {
      this._isExtracting.set(false);
      this._extractionProgress.set(null);
    }
  }
  
  /**
   * 停止提取
   */
  async stopExtraction(): Promise<void> {
    try {
      await this.ipcService.invoke('stop-extraction', {});
      this.toastService.info('已停止提取');
    } catch {}
    
    this._isExtracting.set(false);
    this._extractionProgress.set(null);
  }
  
  // ============ 成員選擇 ============
  
  selectMember(memberId: string): void {
    this._selectedMembers.update(set => {
      const newSet = new Set(set);
      newSet.add(memberId);
      return newSet;
    });
  }
  
  deselectMember(memberId: string): void {
    this._selectedMembers.update(set => {
      const newSet = new Set(set);
      newSet.delete(memberId);
      return newSet;
    });
  }
  
  toggleMember(memberId: string): void {
    const selected = this._selectedMembers();
    if (selected.has(memberId)) {
      this.deselectMember(memberId);
    } else {
      this.selectMember(memberId);
    }
  }
  
  selectAll(): void {
    const allIds = this._extractedMembers().map(m => m.id);
    this._selectedMembers.set(new Set(allIds));
  }
  
  deselectAll(): void {
    this._selectedMembers.set(new Set());
  }
  
  selectFiltered(predicate: (member: MemberBasicInfo) => boolean): void {
    const filteredIds = this._extractedMembers()
      .filter(predicate)
      .map(m => m.id);
    this._selectedMembers.set(new Set(filteredIds));
  }
  
  getSelectedMembers(): MemberBasicInfo[] {
    const selected = this._selectedMembers();
    return this._extractedMembers().filter(m => selected.has(m.id));
  }
  
  // ============ 成員篩選 ============
  
  filterMembers(filters: MemberFilters): MemberBasicInfo[] {
    let members = this._extractedMembers();
    
    if (filters.status?.length) {
      members = members.filter(m => filters.status!.includes(m.status));
    }
    
    if (filters.role?.length) {
      members = members.filter(m => filters.role!.includes(m.role));
    }
    
    if (filters.hasUsername) {
      members = members.filter(m => !!m.username);
    }
    
    if (filters.hasPhoto) {
      members = members.filter(m => !!m.photo?.smallUrl);
    }
    
    if (filters.isNotBot) {
      members = members.filter(m => !m.isBot);
    }
    
    if (filters.isPremium) {
      members = members.filter(m => m.isPremium);
    }
    
    return members;
  }
  
  // ============ 數據導出 ============
  
  /**
   * 導出成員數據
   */
  async exportMembers(config: ExportConfig): Promise<ExportResult> {
    const members = this.getSelectedMembers();
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇要導出的成員');
      return { success: false, recordCount: 0, error: '未選擇成員' };
    }
    
    // 檢查導出權限
    if (!this.membershipService.hasFeature('dataExport')) {
      this.toastService.warning('導出功能需要黃金大師或以上會員');
      return { success: false, recordCount: 0, error: '無權限' };
    }
    
    try {
      const result = await this.ipcService.invoke('export-members', {
        members,
        config,
        groupTitle: this._currentGroup()?.title || 'unknown'
      });
      
      if (result.success) {
        this.toastService.success(`成功導出 ${members.length} 名成員`);
        return {
          success: true,
          filePath: result.data.filePath,
          recordCount: members.length
        };
      } else {
        throw new Error(result.message || '導出失敗');
      }
    } catch (error: any) {
      this.toastService.error(error.message || '導出失敗');
      return { success: false, recordCount: 0, error: error.message };
    }
  }
  
  /**
   * 快速導出 Excel
   */
  async quickExportExcel(): Promise<ExportResult> {
    return this.exportMembers({
      format: 'excel',
      fields: ['id', 'username', 'firstName', 'lastName', 'phone', 'status', 'isBot', 'isPremium'],
      includeHeaders: true
    });
  }
  
  /**
   * 快速導出 CSV
   */
  async quickExportCSV(): Promise<ExportResult> {
    return this.exportMembers({
      format: 'csv',
      fields: ['id', 'username', 'firstName', 'lastName', 'phone'],
      includeHeaders: true
    });
  }
  
  // ============ 批量操作 ============
  
  /**
   * 創建批量操作
   */
  createBatchOperation(
    type: BatchOperationType,
    members: MemberBasicInfo[],
    config: BatchOperationConfig
  ): BatchOperation {
    const operation: BatchOperation = {
      id: `op_${Date.now()}`,
      type,
      targetMembers: members,
      config,
      status: 'pending',
      progress: {
        total: members.length,
        processed: 0,
        success: 0,
        failed: 0
      },
      createdAt: new Date()
    };
    
    this._batchOperations.update(ops => [operation, ...ops]);
    this.saveBatchOperations();
    
    return operation;
  }
  
  /**
   * 開始批量操作
   */
  async startBatchOperation(operationId: string): Promise<boolean> {
    const operation = this._batchOperations().find(op => op.id === operationId);
    if (!operation) return false;
    
    // 檢查權限
    if (operation.type === 'message' && !this.membershipService.hasFeature('batchOperations')) {
      this.toastService.warning('批量發送功能需要黃金大師或以上會員');
      return false;
    }
    
    // 更新狀態
    this.updateOperationStatus(operationId, 'running');
    this._currentOperation.set(operation);
    
    try {
      // 監聯進度
      const progressHandler = (data: any) => {
        this._batchOperations.update(ops => ops.map(op => 
          op.id === operationId ? {
            ...op,
            progress: data.progress,
            status: data.status
          } : op
        ));
      };
      
      this.ipcService.on('batch-progress', progressHandler);
      
      const result = await this.ipcService.invoke('start-batch-operation', operation);
      
      this.ipcService.off('batch-progress', progressHandler);
      
      if (result.success) {
        this.updateOperationStatus(operationId, 'completed');
        this.toastService.success(`批量操作完成: ${result.data.success}/${result.data.total}`);
        return true;
      } else {
        throw new Error(result.message || '操作失敗');
      }
    } catch (error: any) {
      this.updateOperationStatus(operationId, 'failed', error.message);
      this.toastService.error(error.message || '批量操作失敗');
      return false;
    } finally {
      this._currentOperation.set(null);
    }
  }
  
  /**
   * 暫停批量操作
   */
  async pauseBatchOperation(operationId: string): Promise<void> {
    await this.ipcService.invoke('pause-batch-operation', { operationId });
    this.updateOperationStatus(operationId, 'paused');
  }
  
  /**
   * 取消批量操作
   */
  async cancelBatchOperation(operationId: string): Promise<void> {
    await this.ipcService.invoke('cancel-batch-operation', { operationId });
    this.updateOperationStatus(operationId, 'cancelled');
    this._currentOperation.set(null);
  }
  
  /**
   * 刪除批量操作記錄
   */
  deleteBatchOperation(operationId: string): void {
    this._batchOperations.update(ops => ops.filter(op => op.id !== operationId));
    this.saveBatchOperations();
  }
  
  private updateOperationStatus(
    operationId: string, 
    status: BatchOperation['status'],
    error?: string
  ): void {
    this._batchOperations.update(ops => ops.map(op => {
      if (op.id !== operationId) return op;
      
      const updates: Partial<BatchOperation> = { status };
      
      if (status === 'running' && !op.startedAt) {
        updates.startedAt = new Date();
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updates.completedAt = new Date();
      }
      if (error) {
        updates.error = error;
      }
      
      return { ...op, ...updates };
    }));
    
    this.saveBatchOperations();
  }
  
  // ============ 清理 ============
  
  clearExtractedMembers(): void {
    this._extractedMembers.set([]);
    this._selectedMembers.set(new Set());
    this._currentGroup.set(null);
  }
}
