/**
 * Queue Management Service
 * 消息隊列管理服務
 * 
 * 🆕 Phase 17: 從 app.component.ts 提取
 * 
 * 管理消息發送隊列、狀態監控、優先級調整等功能
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// 類型定義
export interface QueueMessage {
  id: string;
  phone: string;
  targetId: string;
  targetType: 'user' | 'group' | 'channel';
  content: string;
  mediaType?: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'paused';
  retryCount: number;
  createdAt: string;
  sentAt?: string;
  error?: string;
}

export interface QueueStatus {
  phone: string;
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  paused: boolean;
  lastActivity?: string;
}

export interface QueueStats {
  totalPending: number;
  totalSending: number;
  totalSent: number;
  totalFailed: number;
  activeQueues: number;
  pausedQueues: number;
}

export interface AccountQueueStatus {
  phone: string;
  status: QueueStatus;
  messages: QueueMessage[];
}

@Injectable({
  providedIn: 'root'
})
export class QueueManagementService {
  private ipcService = inject(IpcService);
  private toastService = inject(ToastService);
  
  // 隊列狀態
  readonly queueStatuses = signal<Map<string, QueueStatus>>(new Map());
  readonly currentQueueMessages = signal<QueueMessage[]>([]);
  readonly selectedPhone = signal<string | null>(null);
  readonly queueLengthHistory = signal<any[]>([]);
  
  // UI 狀態
  readonly showQueueDetails = signal(false);
  readonly isRefreshing = signal(false);
  
  // 節流控制
  private refreshTimeout: any = null;
  
  // 計算屬性
  readonly totalStats = computed<QueueStats>(() => {
    const statuses = Array.from(this.queueStatuses().values());
    return {
      totalPending: statuses.reduce((sum, s) => sum + s.pending, 0),
      totalSending: statuses.reduce((sum, s) => sum + s.sending, 0),
      totalSent: statuses.reduce((sum, s) => sum + s.sent, 0),
      totalFailed: statuses.reduce((sum, s) => sum + s.failed, 0),
      activeQueues: statuses.filter(s => !s.paused && s.pending > 0).length,
      pausedQueues: statuses.filter(s => s.paused).length
    };
  });
  
  readonly accountQueueStatuses = computed<AccountQueueStatus[]>(() => {
    return Array.from(this.queueStatuses().entries()).map(([phone, status]) => ({
      phone,
      status,
      messages: this.currentQueueMessages().filter(m => m.phone === phone)
    }));
  });
  
  // ==================== 隊列操作 ====================
  
  refreshStatus(phone?: string): void {
    this.isRefreshing.set(true);
    this.ipcService.send('get-queue-status', { phone });
  }
  
  refreshStatusThrottled(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }
    this.refreshTimeout = setTimeout(() => {
      this.refreshStatus();
    }, 500);
  }
  
  getMessages(phone?: string, status?: string, limit = 100): void {
    this.ipcService.send('get-queue-messages', { phone, status, limit });
  }
  
  clearPendingQueue(): void {
    if (!confirm('確定要清除所有待發送消息嗎？')) return;
    this.ipcService.send('clear-pending-queue', {});
    this.toastService.info('正在清除待發送隊列...');
  }
  
  clearQueue(phone: string, status?: string): void {
    if (!confirm(`確定要清除 ${phone} 的隊列嗎？`)) return;
    this.ipcService.send('clear-queue', { phone, status });
  }
  
  pauseQueue(phone: string): void {
    this.ipcService.send('pause-queue', { phone });
    this.toastService.info(`暫停 ${phone} 的發送隊列`);
  }
  
  resumeQueue(phone: string): void {
    this.ipcService.send('resume-queue', { phone });
    this.toastService.info(`恢復 ${phone} 的發送隊列`);
  }
  
  pauseAllQueues(): void {
    const statuses = this.queueStatuses();
    statuses.forEach((_, phone) => {
      this.ipcService.send('pause-queue', { phone });
    });
    this.toastService.info('已暫停所有發送隊列');
  }
  
  resumeAllQueues(): void {
    const statuses = this.queueStatuses();
    statuses.forEach((_, phone) => {
      this.ipcService.send('resume-queue', { phone });
    });
    this.toastService.info('已恢復所有發送隊列');
  }
  
  deleteMessage(phone: string, messageId: string): void {
    if (!confirm('確定要刪除此消息嗎？')) return;
    this.ipcService.send('delete-queue-message', { phone, messageId });
  }
  
  updateMessagePriority(phone: string, messageId: string, priority: string): void {
    this.ipcService.send('update-queue-priority', { phone, messageId, priority });
  }
  
  retryFailedMessages(phone?: string): void {
    this.ipcService.send('retry-failed-messages', { phone });
    this.toastService.info('正在重試失敗的消息...');
  }
  
  // ==================== 對話框操作 ====================
  
  viewDetails(phone: string): void {
    this.selectedPhone.set(phone);
    this.getMessages(phone);
    this.showQueueDetails.set(true);
  }
  
  closeDetails(): void {
    this.showQueueDetails.set(false);
    this.selectedPhone.set(null);
    this.currentQueueMessages.set([]);
  }
  
  // ==================== 歷史數據 ====================
  
  loadHistory(days = 7): void {
    this.ipcService.send('get-queue-length-history', { days });
  }
  
  // ==================== 輔助方法 ====================
  
  getStatusForAccount(phone: string): QueueStatus | null {
    return this.queueStatuses().get(phone) || null;
  }
  
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待發送',
      'sending': '發送中',
      'sent': '已發送',
      'failed': '失敗',
      'paused': '已暫停'
    };
    return labels[status] || status;
  }
  
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'pending': 'bg-amber-500/20 text-amber-400',
      'sending': 'bg-cyan-500/20 text-cyan-400 animate-pulse',
      'sent': 'bg-emerald-500/20 text-emerald-400',
      'failed': 'bg-red-500/20 text-red-400',
      'paused': 'bg-slate-500/20 text-slate-400'
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'high': '高優先',
      'normal': '普通',
      'low': '低優先'
    };
    return labels[priority] || priority;
  }
  
  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'high': 'bg-red-500/20 text-red-400',
      'normal': 'bg-cyan-500/20 text-cyan-400',
      'low': 'bg-slate-500/20 text-slate-400'
    };
    return colors[priority] || 'bg-slate-500/20 text-slate-400';
  }
  
  // ==================== IPC 回調處理 ====================
  
  handleQueueStatusResponse(data: any): void {
    this.isRefreshing.set(false);
    if (data.success && data.statuses) {
      const statusMap = new Map<string, QueueStatus>();
      for (const status of data.statuses) {
        statusMap.set(status.phone, status);
      }
      this.queueStatuses.set(statusMap);
    }
  }
  
  handleQueueMessagesResponse(data: any): void {
    if (data.success && data.messages) {
      this.currentQueueMessages.set(data.messages);
    }
  }
  
  handleQueueHistoryResponse(data: any): void {
    if (data.success && data.history) {
      this.queueLengthHistory.set(data.history);
    }
  }
  
  handleQueueUpdate(data: any): void {
    // 實時更新單個隊列狀態
    if (data.phone && data.status) {
      const statuses = new Map(this.queueStatuses());
      statuses.set(data.phone, data.status);
      this.queueStatuses.set(statuses);
    }
  }
  
  handleMessageSent(data: any): void {
    // 更新發送成功的消息
    if (data.messageId) {
      this.currentQueueMessages.update(messages =>
        messages.map(m =>
          m.id === data.messageId
            ? { ...m, status: 'sent' as const, sentAt: new Date().toISOString() }
            : m
        )
      );
    }
  }
  
  handleMessageFailed(data: any): void {
    // 更新發送失敗的消息
    if (data.messageId) {
      this.currentQueueMessages.update(messages =>
        messages.map(m =>
          m.id === data.messageId
            ? { ...m, status: 'failed' as const, error: data.error }
            : m
        )
      );
    }
  }
}
