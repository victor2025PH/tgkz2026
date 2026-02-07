/**
 * 🔧 P14-4: 業務事件實時監聽服務
 * 
 * 監聽 WebSocket 業務事件，自動刷新相關數據：
 * - 評分完成 → 刷新線索數據
 * - 去重完成 → 刷新去重統計
 * - A/B 測試更新 → 刷新測試列表
 * - 消息狀態變更 → 更新隊列狀態
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { RealtimeService, RealtimeEvent } from '../core/realtime.service';
import { BusinessApiService } from './business-api.service';
import { NotificationService, NotificationType } from '../notification.service';

export interface BusinessNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessEventService implements OnDestroy {
  private realtime = inject(RealtimeService);
  private bizApi = inject(BusinessApiService);
  private notifService = inject(NotificationService);

  // 通知列表（最近 50 條）
  private _notifications = signal<BusinessNotification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => 
    this._notifications().filter(n => !n.read).length
  );

  // 最近業務事件
  private _lastEvent = signal<RealtimeEvent | null>(null);
  readonly lastEvent = this._lastEvent.asReadonly();

  // 消息隊列實時統計
  private _queueStats = signal<{
    completed: number;
    retrying: number;
    deadLetter: number;
    lastUpdated: string;
  }>({ completed: 0, retrying: 0, deadLetter: 0, lastUpdated: '' });
  readonly queueStats = this._queueStats.asReadonly();

  // 取消訂閱函數
  private unsubscribers: (() => void)[] = [];

  constructor() {
    this.initSubscriptions();
  }

  ngOnDestroy() {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
  }

  /** 初始化所有事件訂閱 */
  private initSubscriptions() {
    // 訂閱 WebSocket 頻道
    this.realtime.subscribe('business:event');
    this.realtime.subscribe('lead:scoring');
    this.realtime.subscribe('ab:test');
    this.realtime.subscribe('message:status');

    // 註冊事件處理器
    this.unsubscribers.push(
      this.realtime.on('business:event', (e) => this.handleBusinessEvent(e)),
      this.realtime.on('lead:scoring', (e) => this.handleScoringEvent(e)),
      this.realtime.on('ab:test', (e) => this.handleABTestEvent(e)),
      this.realtime.on('message:status', (e) => this.handleMessageStatus(e)),
    );
  }

  // ==================== 事件處理 ====================

  private handleBusinessEvent(event: RealtimeEvent) {
    this._lastEvent.set(event);
    const eventType = event.data?.event || '';

    if (eventType === 'dedup:completed') {
      this.addNotification('success', '去重完成', 
        `發現 ${event.data?.groups || 0} 組重複聯繫人`);
      this.bizApi.scanDuplicates();
    }
  }

  private handleScoringEvent(event: RealtimeEvent) {
    this._lastEvent.set(event);
    const data = event.data || {};
    this.addNotification('success', '線索評分完成', 
      `已評分 ${data.scored_count || 0} 條線索，${data.hot || 0} 條熱門`);
    // 自動刷新摘要
    this.bizApi.loadSummary();
  }

  private handleABTestEvent(event: RealtimeEvent) {
    this._lastEvent.set(event);
    const data = event.data || {};
    const eventType = data.event || '';

    if (eventType === 'ab_test:completed') {
      this.addNotification('success', 'A/B 測試完成', 
        `${data.test_name || 'N/A'} 測試完成，贏家: ${data.winner || 'N/A'}`);
      this.bizApi.loadABTests();
    } else if (eventType === 'ab_test:created') {
      this.addNotification('info', '新 A/B 測試', 
        `已創建測試: ${data.test_name || 'N/A'}`);
      this.bizApi.loadABTests();
    }
  }

  private handleMessageStatus(event: RealtimeEvent) {
    const data = event.data || {};
    const eventType = data.event || '';

    this._queueStats.update(current => {
      const updated = { ...current, lastUpdated: new Date().toISOString() };
      if (eventType === 'message:completed') {
        updated.completed = current.completed + 1;
      } else if (eventType === 'message:retrying') {
        updated.retrying = current.retrying + 1;
      } else if (eventType === 'message:dead_letter') {
        updated.deadLetter = current.deadLetter + 1;
        // 死信通知 — 需要用戶關注
        this.addNotification('warning', '消息送達失敗', 
          `消息 ${data.message_id || ''} 已進入死信隊列: ${data.reason || ''}`);
      }
      return updated;
    });
  }

  // ==================== 通知管理 ====================

  private addNotification(type: BusinessNotification['type'], title: string, message: string) {
    const notification: BusinessNotification = {
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
    };

    this._notifications.update(list => {
      const updated = [notification, ...list];
      return updated.slice(0, 50); // 只保留最近 50 條
    });

    // P15-4: 同步推送到全局通知中心（NotificationService）
    const typeMap: Record<string, NotificationType> = {
      info: 'info', success: 'success', warning: 'warning', error: 'error'
    };
    try {
      this.notifService.notify({
        type: typeMap[type] || 'info',
        title,
        body: message,
        priority: type === 'warning' || type === 'error' ? 'high' : 'normal',
      });
    } catch {
      // 通知服務不可用時靜默忽略
    }
  }

  /** 標記通知為已讀 */
  markAsRead(notificationId: string) {
    this._notifications.update(list =>
      list.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }

  /** 全部標記已讀 */
  markAllAsRead() {
    this._notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
  }

  /** 清空通知 */
  clearNotifications() {
    this._notifications.set([]);
  }

  /** 重置隊列統計 */
  resetQueueStats() {
    this._queueStats.set({ completed: 0, retrying: 0, deadLetter: 0, lastUpdated: '' });
  }
}
