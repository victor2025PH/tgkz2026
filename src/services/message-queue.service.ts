/**
 * 消息隊列服務
 * Message Queue Service
 * 
 * 🆕 Phase 21: 從 app.component.ts 提取消息相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export type MessageStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface QueuedMessage {
  id: string;
  phone: string;
  targetId: string | number;
  targetType: 'user' | 'group' | 'channel';
  targetTitle: string;
  content: string;
  status: MessageStatus;
  priority: MessagePriority;
  createdAt: string;
  sentAt?: string;
  error?: string;
  retryCount?: number;
}

export interface QueueStatus {
  phone: string;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  paused: boolean;
}

export interface SingleMessageDialogState {
  isOpen: boolean;
  target: any | null;
  targetType: 'user' | 'group' | 'channel';
  message: string;
  selectedAccount: string;
}

export interface BatchMessageDialogState {
  isOpen: boolean;
  targets: any[];
  targetType: 'user' | 'group' | 'channel';
  message: string;
  selectedAccount: string;
  delay: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class MessageQueueService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _queueStatuses = signal<Map<string, QueueStatus>>(new Map());
  private _messages = signal<QueuedMessage[]>([]);
  private _selectedPhone = signal<string | null>(null);
  
  queueStatuses = this._queueStatuses.asReadonly();
  messages = this._messages.asReadonly();
  selectedPhone = this._selectedPhone.asReadonly();
  
  // 對話框狀態
  private _singleMessageDialog = signal<SingleMessageDialogState>({
    isOpen: false,
    target: null,
    targetType: 'user',
    message: '',
    selectedAccount: ''
  });
  
  private _batchMessageDialog = signal<BatchMessageDialogState>({
    isOpen: false,
    targets: [],
    targetType: 'user',
    message: '',
    selectedAccount: '',
    delay: 5
  });
  
  singleMessageDialog = this._singleMessageDialog.asReadonly();
  batchMessageDialog = this._batchMessageDialog.asReadonly();
  
  // ========== 計算屬性 ==========
  
  totalPending = computed(() => {
    let total = 0;
    this._queueStatuses().forEach(status => {
      total += status.pending;
    });
    return total;
  });
  
  totalSent = computed(() => {
    let total = 0;
    this._queueStatuses().forEach(status => {
      total += status.sent;
    });
    return total;
  });
  
  totalFailed = computed(() => {
    let total = 0;
    this._queueStatuses().forEach(status => {
      total += status.failed;
    });
    return total;
  });
  
  selectedQueueStatus = computed(() => {
    const phone = this._selectedPhone();
    if (!phone) return null;
    return this._queueStatuses().get(phone) || null;
  });
  
  selectedQueueMessages = computed(() => {
    const phone = this._selectedPhone();
    if (!phone) return [];
    return this._messages().filter(m => m.phone === phone);
  });
  
  // ========== 隊列操作 ==========
  
  refreshQueueStatus(phone?: string): void {
    this.ipc.send('get-queue-status', { phone });
  }
  
  setQueueStatuses(statuses: QueueStatus[]): void {
    const map = new Map<string, QueueStatus>();
    for (const status of statuses) {
      map.set(status.phone, status);
    }
    this._queueStatuses.set(map);
  }
  
  updateQueueStatus(status: QueueStatus): void {
    this._queueStatuses.update(map => {
      const newMap = new Map(map);
      newMap.set(status.phone, status);
      return newMap;
    });
  }
  
  selectQueue(phone: string): void {
    this._selectedPhone.set(phone);
    this.loadQueueMessages(phone);
  }
  
  loadQueueMessages(phone: string, status?: MessageStatus, limit = 100): void {
    this.ipc.send('get-queue-messages', { phone, status, limit });
  }
  
  setMessages(messages: QueuedMessage[]): void {
    this._messages.set(messages);
  }
  
  // ========== 消息操作 ==========
  
  retryMessage(messageId: string): void {
    this.ipc.send('retry-message', { messageId });
    this.toast.info('正在重試發送...');
  }
  
  cancelMessage(messageId: string): void {
    this.ipc.send('cancel-message', { messageId });
    this.toast.info('已取消消息');
  }
  
  deleteMessage(phone: string, messageId: string): void {
    this.ipc.send('delete-queue-message', { phone, messageId });
  }
  
  updateMessagePriority(phone: string, messageId: string, priority: MessagePriority): void {
    this.ipc.send('update-message-priority', { phone, messageId, priority });
  }
  
  // ========== 隊列控制 ==========
  
  pauseQueue(phone: string): void {
    this.ipc.send('pause-queue', { phone });
    this.toast.info('隊列已暫停');
  }
  
  resumeQueue(phone: string): void {
    this.ipc.send('resume-queue', { phone });
    this.toast.info('隊列已恢復');
  }
  
  clearQueue(phone: string, status?: MessageStatus): void {
    if (!confirm(`確定要清空 ${phone} 的${status || '所有'}消息嗎？`)) {
      return;
    }
    
    this.ipc.send('clear-queue', { phone, status });
    this.toast.info('正在清空隊列...');
  }
  
  clearPendingQueue(): void {
    if (!confirm('確定要清空所有待發送的消息嗎？')) {
      return;
    }
    
    this.ipc.send('clear-all-pending');
    this.toast.info('正在清空待發送消息...');
  }
  
  // ========== 單條消息對話框 ==========
  
  openSingleMessageDialog(target: any, targetType: 'user' | 'group' | 'channel'): void {
    this._singleMessageDialog.set({
      isOpen: true,
      target,
      targetType,
      message: '',
      selectedAccount: ''
    });
  }
  
  closeSingleMessageDialog(): void {
    this._singleMessageDialog.update(s => ({ ...s, isOpen: false }));
  }
  
  updateSingleMessageDialog(updates: Partial<SingleMessageDialogState>): void {
    this._singleMessageDialog.update(s => ({ ...s, ...updates }));
  }
  
  executeSingleMessage(): void {
    const dialog = this._singleMessageDialog();
    if (!dialog.target || !dialog.selectedAccount || !dialog.message.trim()) {
      this.toast.error('請填寫完整信息');
      return;
    }
    
    this.ipc.send('send-message', {
      phone: dialog.selectedAccount,
      targetId: dialog.target.id || dialog.target.telegram_id,
      targetType: dialog.targetType,
      content: dialog.message.trim()
    });
    
    this.closeSingleMessageDialog();
    this.toast.success('消息已加入發送隊列');
  }
  
  // ========== 批量消息對話框 ==========
  
  openBatchMessageDialog(targets: any[], targetType: 'user' | 'group' | 'channel'): void {
    this._batchMessageDialog.set({
      isOpen: true,
      targets,
      targetType,
      message: '',
      selectedAccount: '',
      delay: 5
    });
  }
  
  closeBatchMessageDialog(): void {
    this._batchMessageDialog.update(s => ({ ...s, isOpen: false }));
  }
  
  updateBatchMessageDialog(updates: Partial<BatchMessageDialogState>): void {
    this._batchMessageDialog.update(s => ({ ...s, ...updates }));
  }
  
  executeBatchMessage(): void {
    const dialog = this._batchMessageDialog();
    if (dialog.targets.length === 0 || !dialog.selectedAccount || !dialog.message.trim()) {
      this.toast.error('請填寫完整信息');
      return;
    }
    
    this.ipc.send('batch-send-message', {
      phone: dialog.selectedAccount,
      targets: dialog.targets.map(t => ({
        id: t.id || t.telegram_id,
        type: dialog.targetType
      })),
      content: dialog.message.trim(),
      delay: dialog.delay
    });
    
    this.closeBatchMessageDialog();
    this.toast.success(`${dialog.targets.length} 條消息已加入發送隊列`);
  }
  
  // ========== 私信操作 ==========
  
  sendPrivateMessage(member: any, selectedAccount: string): void {
    this.openSingleMessageDialog(member, 'user');
    this.updateSingleMessageDialog({ selectedAccount });
  }
  
  batchSendPrivateMessage(members: any[]): void {
    this.openBatchMessageDialog(members, 'user');
  }
  
  // ========== 群組消息操作 ==========
  
  sendGroupMessage(group: any, selectedAccount: string): void {
    this.openSingleMessageDialog(group, 'group');
    this.updateSingleMessageDialog({ selectedAccount });
  }
  
  batchSendGroupMessage(groups: any[]): void {
    this.openBatchMessageDialog(groups, 'group');
  }
  
  // ========== IPC 事件處理 ==========
  
  handleQueueStatusUpdate(statuses: QueueStatus[]): void {
    this.setQueueStatuses(statuses);
  }
  
  handleMessagesLoaded(messages: QueuedMessage[]): void {
    this.setMessages(messages);
  }
  
  handleMessageSent(data: { messageId: string; success: boolean; error?: string }): void {
    this._messages.update(list => 
      list.map(m => 
        m.id === data.messageId
          ? { 
              ...m, 
              status: data.success ? 'sent' as const : 'failed' as const,
              error: data.error,
              sentAt: data.success ? new Date().toISOString() : undefined
            }
          : m
      )
    );
  }
  
  handleQueueCleared(data: { phone: string; count: number }): void {
    this.toast.success(`已清空 ${data.count} 條消息`);
    this.refreshQueueStatus(data.phone);
  }
}
