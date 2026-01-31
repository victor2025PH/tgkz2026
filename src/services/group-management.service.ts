/**
 * 群組管理服務
 * Group Management Service
 * 
 * 🆕 Phase 21: 從 app.component.ts 提取群組相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface TelegramGroup {
  id: number;
  telegram_id?: number;
  title: string;
  username?: string;
  member_count?: number;
  is_public?: boolean;
  is_channel?: boolean;
  joined?: boolean;
  monitored?: boolean;
  last_activity?: string;
}

export interface JoinQueueItem {
  resourceId: number;
  title: string;
  status: 'pending' | 'joining' | 'joined' | 'failed';
  error?: string;
}

export interface JoinMonitorDialogState {
  isOpen: boolean;
  resource: any | null;
  selectedAccount: string;
  enableMonitoring: boolean;
  selectedKeywordSets: number[];
}

export interface BatchJoinDialogState {
  isOpen: boolean;
  selectedResources: any[];
  selectedAccount: string;
  enableMonitoring: boolean;
  selectedKeywordSets: number[];
}

export interface PostJoinDialogState {
  isOpen: boolean;
  resource: any | null;
  phone: string;
  keywordSetCount: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class GroupManagementService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _groups = signal<TelegramGroup[]>([]);
  private _joinQueue = signal<JoinQueueItem[]>([]);
  private _selectedGroupIds = signal<Set<number>>(new Set());
  private _isJoining = signal(false);
  
  groups = this._groups.asReadonly();
  joinQueue = this._joinQueue.asReadonly();
  selectedGroupIds = this._selectedGroupIds.asReadonly();
  isJoining = this._isJoining.asReadonly();
  
  // 對話框狀態
  private _joinMonitorDialog = signal<JoinMonitorDialogState>({
    isOpen: false,
    resource: null,
    selectedAccount: '',
    enableMonitoring: false,
    selectedKeywordSets: []
  });
  
  private _batchJoinDialog = signal<BatchJoinDialogState>({
    isOpen: false,
    selectedResources: [],
    selectedAccount: '',
    enableMonitoring: false,
    selectedKeywordSets: []
  });
  
  private _postJoinDialog = signal<PostJoinDialogState>({
    isOpen: false,
    resource: null,
    phone: '',
    keywordSetCount: 0
  });
  
  joinMonitorDialog = this._joinMonitorDialog.asReadonly();
  batchJoinDialog = this._batchJoinDialog.asReadonly();
  postJoinDialog = this._postJoinDialog.asReadonly();
  
  // ========== 計算屬性 ==========
  
  selectedGroups = computed(() => {
    const ids = this._selectedGroupIds();
    return this._groups().filter(g => ids.has(g.id));
  });
  
  selectedGroupCount = computed(() => this._selectedGroupIds().size);
  
  joinQueuePending = computed(() => 
    this._joinQueue().filter(item => item.status === 'pending')
  );
  
  joinQueueProgress = computed(() => {
    const queue = this._joinQueue();
    if (queue.length === 0) return 0;
    const completed = queue.filter(item => 
      item.status === 'joined' || item.status === 'failed'
    ).length;
    return Math.round((completed / queue.length) * 100);
  });
  
  // ========== 群組操作 ==========
  
  setGroups(groups: TelegramGroup[]): void {
    this._groups.set(groups);
  }
  
  updateGroup(group: TelegramGroup): void {
    this._groups.update(list => 
      list.map(g => g.id === group.id ? { ...g, ...group } : g)
    );
  }
  
  addGroup(group: TelegramGroup): void {
    this._groups.update(list => [...list, group]);
  }
  
  removeGroup(groupId: number): void {
    this._groups.update(list => list.filter(g => g.id !== groupId));
  }
  
  // ========== 選擇操作 ==========
  
  toggleGroupSelection(groupId: number): void {
    this._selectedGroupIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(groupId)) {
        newIds.delete(groupId);
      } else {
        newIds.add(groupId);
      }
      return newIds;
    });
  }
  
  selectAllGroups(): void {
    const allIds = new Set(this._groups().map(g => g.id));
    this._selectedGroupIds.set(allIds);
  }
  
  deselectAllGroups(): void {
    this._selectedGroupIds.set(new Set());
  }
  
  // ========== 加入群組操作 ==========
  
  openJoinMonitorDialog(resource: any): void {
    this._joinMonitorDialog.set({
      isOpen: true,
      resource,
      selectedAccount: '',
      enableMonitoring: false,
      selectedKeywordSets: []
    });
  }
  
  closeJoinMonitorDialog(): void {
    this._joinMonitorDialog.update(s => ({ ...s, isOpen: false }));
  }
  
  updateJoinMonitorDialog(updates: Partial<JoinMonitorDialogState>): void {
    this._joinMonitorDialog.update(s => ({ ...s, ...updates }));
  }
  
  executeJoinAndMonitor(): void {
    const dialog = this._joinMonitorDialog();
    if (!dialog.resource || !dialog.selectedAccount) {
      this.toast.error('請選擇帳號');
      return;
    }
    
    this._isJoining.set(true);
    
    this.ipc.send('join-group', {
      resourceId: dialog.resource.id,
      phone: dialog.selectedAccount,
      enableMonitoring: dialog.enableMonitoring,
      keywordSetIds: dialog.selectedKeywordSets
    });
    
    this.closeJoinMonitorDialog();
  }
  
  // ========== 批量加入操作 ==========
  
  openBatchJoinDialog(resources: any[]): void {
    this._batchJoinDialog.set({
      isOpen: true,
      selectedResources: resources,
      selectedAccount: '',
      enableMonitoring: false,
      selectedKeywordSets: []
    });
  }
  
  closeBatchJoinDialog(): void {
    this._batchJoinDialog.update(s => ({ ...s, isOpen: false }));
  }
  
  updateBatchJoinDialog(updates: Partial<BatchJoinDialogState>): void {
    this._batchJoinDialog.update(s => ({ ...s, ...updates }));
  }
  
  executeBatchJoin(): void {
    const dialog = this._batchJoinDialog();
    if (dialog.selectedResources.length === 0 || !dialog.selectedAccount) {
      this.toast.error('請選擇群組和帳號');
      return;
    }
    
    this._isJoining.set(true);
    
    // 添加到加入隊列
    const queueItems: JoinQueueItem[] = dialog.selectedResources.map(r => ({
      resourceId: r.id,
      title: r.title,
      status: 'pending' as const
    }));
    
    this._joinQueue.set(queueItems);
    
    // 發送批量加入請求
    this.ipc.send('batch-join-groups', {
      resourceIds: dialog.selectedResources.map(r => r.id),
      phone: dialog.selectedAccount,
      enableMonitoring: dialog.enableMonitoring,
      keywordSetIds: dialog.selectedKeywordSets
    });
    
    this.closeBatchJoinDialog();
  }
  
  // ========== 加入後操作 ==========
  
  openPostJoinDialog(resource: any, phone: string, keywordSetCount: number): void {
    this._postJoinDialog.set({
      isOpen: true,
      resource,
      phone,
      keywordSetCount
    });
  }
  
  closePostJoinDialog(): void {
    this._postJoinDialog.update(s => ({ ...s, isOpen: false }));
  }
  
  postJoinExtractMembers(): void {
    const dialog = this._postJoinDialog();
    if (!dialog.resource) return;
    
    this.ipc.send('extract-members', {
      resourceId: dialog.resource.id,
      phone: dialog.phone
    });
    
    this.closePostJoinDialog();
    this.toast.info('開始提取成員...');
  }
  
  postJoinSendMessage(): void {
    const dialog = this._postJoinDialog();
    if (!dialog.resource) return;
    
    // 觸發發送消息對話框
    this.closePostJoinDialog();
    // 這裡需要與 MessageService 協作
  }
  
  // ========== 離開群組操作 ==========
  
  leaveGroup(resource: any, phone: string): void {
    if (!confirm(`確定要離開群組 ${resource.title} 嗎？`)) {
      return;
    }
    
    this.ipc.send('leave-group', {
      resourceId: resource.id,
      phone
    });
    
    this.toast.info('正在離開群組...');
  }
  
  stopMonitoring(resource: any): void {
    this.ipc.send('stop-monitoring', {
      resourceId: resource.id
    });
    
    this.toast.info('已停止監控');
  }
  
  // ========== 隊列操作 ==========
  
  clearJoinQueue(): void {
    this._joinQueue.set([]);
  }
  
  updateQueueItemStatus(resourceId: number, status: JoinQueueItem['status'], error?: string): void {
    this._joinQueue.update(queue => 
      queue.map(item => 
        item.resourceId === resourceId 
          ? { ...item, status, error }
          : item
      )
    );
    
    // 檢查是否全部完成
    const queue = this._joinQueue();
    const allDone = queue.every(item => 
      item.status === 'joined' || item.status === 'failed'
    );
    
    if (allDone) {
      this._isJoining.set(false);
      const joined = queue.filter(item => item.status === 'joined').length;
      const failed = queue.filter(item => item.status === 'failed').length;
      
      if (failed > 0) {
        this.toast.warning(`完成：${joined} 成功，${failed} 失敗`);
      } else {
        this.toast.success(`成功加入 ${joined} 個群組`);
      }
    }
  }
  
  // ========== IPC 事件處理 ==========
  
  handleJoinResult(data: { 
    resourceId: number; 
    success: boolean; 
    error?: string;
    phone?: string;
    keywordSetCount?: number;
  }): void {
    this._isJoining.set(false);
    
    if (data.success) {
      this.toast.success('成功加入群組');
      
      // 更新群組狀態
      this.updateGroup({ id: data.resourceId, joined: true } as TelegramGroup);
      
      // 顯示加入後選項
      if (data.phone && data.keywordSetCount !== undefined) {
        const group = this._groups().find(g => g.id === data.resourceId);
        if (group) {
          this.openPostJoinDialog(group, data.phone, data.keywordSetCount);
        }
      }
    } else {
      this.toast.error(`加入群組失敗: ${data.error || '未知錯誤'}`);
    }
  }
  
  handleBatchJoinProgress(data: { 
    resourceId: number; 
    success: boolean; 
    error?: string 
  }): void {
    this.updateQueueItemStatus(
      data.resourceId,
      data.success ? 'joined' : 'failed',
      data.error
    );
  }
  
  handleLeaveResult(data: { resourceId: number; success: boolean; error?: string }): void {
    if (data.success) {
      this.updateGroup({ id: data.resourceId, joined: false } as TelegramGroup);
      this.toast.success('已離開群組');
    } else {
      this.toast.error(`離開群組失敗: ${data.error || '未知錯誤'}`);
    }
  }
}
