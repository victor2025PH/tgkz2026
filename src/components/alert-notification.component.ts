/**
 * 实时告警通知组件
 * 
 * 功能：
 * 1. 全局显示告警通知
 * 2. 支持多级告警样式
 * 3. 自动消失和手动关闭
 * 4. 点击跳转到详情
 */

import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronIpcService } from '../electron-ipc.service';
import { RealtimeEventsService, EventType, RealtimeEvent } from '../services/realtime-events.service';
import { Subscription } from 'rxjs';

interface AlertNotification {
  id: string;
  type: string;
  level: 'info' | 'warning' | 'critical' | 'urgent';
  title: string;
  message: string;
  timestamp: number;
  dismissed: boolean;
}

@Component({
  selector: 'app-alert-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      @for (notification of visibleNotifications(); track notification.id) {
        <div 
          class="notification" 
          [class]="'level-' + notification.level"
          [@slideIn]
          (click)="handleClick(notification)">
          <div class="notification-icon">{{ getIcon(notification.level) }}</div>
          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
          </div>
          <button class="notification-close" (click)="dismiss(notification, $event)">×</button>
        </div>
      }
    </div>

    <!-- 告警徽章（显示未读数量） -->
    @if (unreadCount() > 0) {
      <div class="alert-badge" (click)="togglePanel()">
        <span class="badge-icon">🔔</span>
        <span class="badge-count">{{ unreadCount() }}</span>
      </div>
    }

    <!-- 快速告警面板 -->
    @if (showPanel()) {
      <div class="quick-panel" (click)="$event.stopPropagation()">
        <div class="panel-header">
          <h4>系统告警</h4>
          <button (click)="markAllRead()">全部已读</button>
        </div>
        <div class="panel-content">
          @if (allNotifications().length === 0) {
            <div class="panel-empty">暂无告警</div>
          }
          @for (notification of allNotifications().slice(0, 5); track notification.id) {
            <div class="panel-item" [class]="'level-' + notification.level">
              <span class="item-icon">{{ getIcon(notification.level) }}</span>
              <div class="item-content">
                <div class="item-title">{{ notification.title }}</div>
                <div class="item-time">{{ formatTime(notification.timestamp) }}</div>
              </div>
            </div>
          }
        </div>
        <div class="panel-footer">
          <a (click)="goToAlerts()">查看全部 →</a>
        </div>
      </div>
    }
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-width: 400px;
      pointer-events: none;
    }

    .notification {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(30, 41, 59, 0.98);
      border-radius: 0.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      border-left: 4px solid #6b7280;
      pointer-events: auto;
      cursor: pointer;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(8px);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .notification.level-urgent {
      border-left-color: #ef4444;
      background: rgba(239, 68, 68, 0.15);
      animation: slideIn 0.3s ease-out, urgentPulse 2s infinite;
    }

    @keyframes urgentPulse {
      0%, 100% { box-shadow: 0 4px 20px rgba(239, 68, 68, 0.3); }
      50% { box-shadow: 0 4px 30px rgba(239, 68, 68, 0.5); }
    }

    .notification.level-critical {
      border-left-color: #f97316;
      background: rgba(249, 115, 22, 0.15);
    }

    .notification.level-warning {
      border-left-color: #f59e0b;
    }

    .notification.level-info {
      border-left-color: #3b82f6;
    }

    .notification-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 0.25rem;
    }

    .notification-message {
      font-size: 0.8rem;
      color: #d1d5db;
      line-height: 1.4;
    }

    .notification-time {
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 0.375rem;
    }

    .notification-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.2s;
    }

    .notification-close:hover {
      color: #f1f5f9;
    }

    /* 告警徽章 */
    .alert-badge {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      background: rgba(239, 68, 68, 0.9);
      border-radius: 2rem;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(239, 68, 68, 0.4);
      animation: badgePulse 2s infinite;
    }

    @keyframes badgePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .badge-icon {
      font-size: 1rem;
    }

    .badge-count {
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }

    /* 快速面板 */
    .quick-panel {
      position: fixed;
      top: 4rem;
      right: 1rem;
      z-index: 9998;
      width: 320px;
      background: rgba(30, 41, 59, 0.98);
      border-radius: 0.75rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-header h4 {
      margin: 0;
      font-size: 0.9rem;
      color: #f1f5f9;
    }

    .panel-header button {
      background: transparent;
      border: none;
      color: #3b82f6;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .panel-content {
      max-height: 300px;
      overflow-y: auto;
    }

    .panel-empty {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .panel-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-left: 3px solid #6b7280;
      cursor: pointer;
      transition: background 0.2s;
    }

    .panel-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .panel-item.level-urgent { border-left-color: #ef4444; }
    .panel-item.level-critical { border-left-color: #f97316; }
    .panel-item.level-warning { border-left-color: #f59e0b; }
    .panel-item.level-info { border-left-color: #3b82f6; }

    .item-icon {
      font-size: 1rem;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-title {
      font-size: 0.8rem;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-time {
      font-size: 0.7rem;
      color: #6b7280;
    }

    .panel-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
    }

    .panel-footer a {
      color: #3b82f6;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .panel-footer a:hover {
      text-decoration: underline;
    }
  `]
})
export class AlertNotificationComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private realtimeEvents = inject(RealtimeEventsService);

  // 状态
  allNotifications = signal<AlertNotification[]>([]);
  visibleNotifications = signal<AlertNotification[]>([]);
  unreadCount = signal(0);
  showPanel = signal(false);
  
  // 连接状态
  isConnected = signal(false);

  // 订阅
  private eventSubscription: Subscription | null = null;
  private pollInterval: any;
  private dismissTimeouts: Map<string, any> = new Map();

  ngOnInit(): void {
    // 初始加载
    this.loadAlerts();
    
    // 订阅实时告警事件
    this.subscribeToEvents();
    
    // 备用轮询（降低频率，作为后备）
    this.pollInterval = setInterval(() => this.loadAlerts(), 30000);
    
    // 点击其他地方关闭面板
    document.addEventListener('click', this.closePanel.bind(this));
  }

  ngOnDestroy(): void {
    if (this.eventSubscription) {
      this.eventSubscription.unsubscribe();
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    document.removeEventListener('click', this.closePanel.bind(this));
    
    // 清理所有超时
    this.dismissTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  /**
   * 订阅实时事件
   */
  private subscribeToEvents(): void {
    // 监听所有告警事件
    this.eventSubscription = this.realtimeEvents.onAlerts().subscribe({
      next: (event: RealtimeEvent) => {
        this.handleRealtimeEvent(event);
      },
      error: (err: Error) => {
        console.error('[AlertNotification] Realtime subscription error:', err);
      }
    });
    
    // 监听连接状态
    this.realtimeEvents.getConnectionState().subscribe(state => {
      this.isConnected.set(state === 'connected');
    });
  }
  
  /**
   * 处理实时事件
   */
  private handleRealtimeEvent(event: RealtimeEvent): void {
    console.log('[AlertNotification] Received realtime event:', event.type);
    
    switch (event.type) {
      case EventType.ALERT_NEW:
        // 新告警
        const alertData = event.data;
        const notification: AlertNotification = {
          id: alertData.id || event.id,
          type: alertData.type || 'system',
          level: alertData.level || 'warning',
          title: alertData.title || '系统告警',
          message: alertData.message || '',
          timestamp: event.timestamp,
          dismissed: false
        };
        
        // 添加到列表
        const current = this.allNotifications();
        if (!current.find(n => n.id === notification.id)) {
          this.allNotifications.set([notification, ...current]);
          this.unreadCount.update(c => c + 1);
          
          // 显示通知
          this.showNotification(notification);
        }
        break;
        
      case EventType.ALERT_RESOLVED:
        // 告警解决
        const resolvedId = event.data.alert_id;
        this.allNotifications.update(list => 
          list.filter(n => n.id !== resolvedId)
        );
        break;
        
      case EventType.ALERT_CLEARED:
        // 所有告警清除
        this.allNotifications.set([]);
        this.unreadCount.set(0);
        break;
    }
  }

  async loadAlerts(): Promise<void> {
    try {
      const result = await this.ipcService.send('alerts:get', {});

      if (result?.success) {
        const active = result.data?.active || [];
        
        // 检查是否有新告警（仅在非实时模式下显示通知）
        if (!this.isConnected()) {
          const currentIds = new Set(this.allNotifications().map(n => n.id));
          const newAlerts = active.filter((a: AlertNotification) => !currentIds.has(a.id));
          
          for (const alert of newAlerts) {
            this.showNotification(alert);
          }
        }
        
        // 更新列表
        this.allNotifications.set(active);
        this.unreadCount.set(active.filter((a: AlertNotification) => !a.dismissed).length);
      }
    } catch (e) {
      console.error('Load alerts failed:', e);
    }
  }

  showNotification(alert: AlertNotification): void {
    const current = this.visibleNotifications();
    
    // 最多显示 3 个
    if (current.length >= 3) {
      this.dismiss(current[0]);
    }
    
    this.visibleNotifications.set([...current, alert]);
    
    // 根据级别设置自动消失时间
    const duration = this.getDismissDuration(alert.level);
    if (duration > 0) {
      const timeout = setTimeout(() => this.dismiss(alert), duration);
      this.dismissTimeouts.set(alert.id, timeout);
    }
  }

  getDismissDuration(level: string): number {
    const durations: Record<string, number> = {
      info: 5000,
      warning: 8000,
      critical: 15000,
      urgent: 0  // 不自动消失
    };
    return durations[level] ?? 8000;
  }

  dismiss(notification: AlertNotification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    // 清除超时
    const timeout = this.dismissTimeouts.get(notification.id);
    if (timeout) {
      clearTimeout(timeout);
      this.dismissTimeouts.delete(notification.id);
    }
    
    // 从可见列表移除
    this.visibleNotifications.set(
      this.visibleNotifications().filter(n => n.id !== notification.id)
    );
  }

  handleClick(notification: AlertNotification): void {
    this.dismiss(notification);
    this.goToAlerts();
  }

  togglePanel(): void {
    this.showPanel.set(!this.showPanel());
  }

  closePanel(): void {
    this.showPanel.set(false);
  }

  async markAllRead(): Promise<void> {
    try {
      await this.ipcService.send('alerts:mark-read', {});
      this.unreadCount.set(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  }

  goToAlerts(): void {
    // 导航到告警页面
    window.dispatchEvent(new CustomEvent('changeView', { 
      detail: 'admin/alerts' 
    }));
    this.closePanel();
  }

  getIcon(level: string): string {
    const icons: Record<string, string> = {
      urgent: '🚨',
      critical: '⛔',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[level] || '🔔';
  }

  formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
    return date.toLocaleDateString();
  }
}
