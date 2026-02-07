/**
 * 🔧 P8-4: 通知中心面板組件
 * 
 * 功能：
 * - 鈴鐺圖標 + 未讀計數徽章
 * - 點擊展開通知面板（下拉）
 * - 通知按時間排序，優先顯示未讀
 * - 分類過濾（全部/系統/配額/安全/潛客）
 * - 一鍵標記全部已讀
 * - 一鍵清空
 * - 點擊外部自動關閉
 */

import { Component, computed, signal, inject, HostListener, ElementRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { NotificationService, AppNotification, NotificationType } from '../notification.service';
import { BusinessEventService } from '../services/business-event.service';
import { I18nPipe } from '../core/i18n.pipe';

type FilterType = 'all' | NotificationType;

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, DatePipe, I18nPipe],
  template: `
    <div class="notification-center" role="region" aria-label="通知中心">
      <!-- 鈴鐺按鈕 -->
      <button class="bell-btn" 
              (click)="togglePanel()" 
              [title]="('notification.title' | i18n) + ' (' + unreadCount() + ')'"
              [attr.aria-expanded]="isOpen()"
              aria-haspopup="true"
              [attr.aria-label]="('notification.title' | i18n) + ', ' + unreadCount() + ' 未讀'">
        <span class="bell-icon" aria-hidden="true">🔔</span>
        @if (unreadCount() > 0) {
          <span class="badge" aria-hidden="true">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
        }
      </button>
      
      <!-- 通知面板 -->
      @if (isOpen()) {
        <div class="panel" role="dialog" aria-label="通知列表" tabindex="-1">
          <!-- 頭部 -->
          <div class="panel-header">
            <h3 class="panel-title" id="notification-panel-title">{{ 'notification.center' | i18n }}</h3>
            <div class="panel-actions">
              @if (unreadCount() > 0) {
                <button class="action-btn" (click)="markAllRead()" [title]="'notification.markAllRead' | i18n">
                  ✓ {{ 'notification.markAllRead' | i18n }}
                </button>
              }
              @if (filteredNotifications().length > 0) {
                <button class="action-btn danger" (click)="clearAll()" title="清空">
                  🗑️
                </button>
              }
            </div>
          </div>
          
          <!-- P15-4: 消息隊列實時統計條 -->
          @if (queueStats().lastUpdated) {
            <div class="queue-stats-bar">
              <span class="qs-item qs-ok">✅ {{ queueStats().completed }}</span>
              <span class="qs-item qs-retry">🔄 {{ queueStats().retrying }}</span>
              @if (queueStats().deadLetter > 0) {
                <span class="qs-item qs-dead">💀 {{ queueStats().deadLetter }}</span>
              }
            </div>
          }
          
          <!-- 過濾標籤 -->
          <div class="filter-tabs" role="tablist" aria-label="通知分類">
            @for (tab of filterTabs; track tab.id) {
              <button 
                class="filter-tab" 
                role="tab"
                [attr.aria-selected]="activeFilter() === tab.id"
                [class.active]="activeFilter() === tab.id"
                (click)="activeFilter.set(tab.id)"
              >
                {{ tab.label }}
                @if (tab.id !== 'all' && getCountByType(tab.id) > 0) {
                  <span class="tab-count">{{ getCountByType(tab.id) }}</span>
                }
              </button>
            }
          </div>
          
          <!-- 通知列表 -->
          <div class="notification-list" role="tabpanel" aria-label="通知列表">
            @if (filteredNotifications().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>{{ 'notification.empty' | i18n }}</p>
              </div>
            } @else {
              @for (notif of filteredNotifications(); track notif.id) {
                <div 
                  class="notification-item" 
                  [class.unread]="!notif.read"
                  (click)="onNotifClick(notif)"
                >
                  <div class="notif-icon">{{ getTypeIcon(notif.type) }}</div>
                  <div class="notif-content">
                    <div class="notif-title">{{ notif.title }}</div>
                    <div class="notif-body">{{ notif.body }}</div>
                    <div class="notif-time">{{ notif.timestamp | date:'MM/dd HH:mm' }}</div>
                  </div>
                  <button class="notif-dismiss" (click)="dismiss(notif.id, $event)" title="移除">
                    ×
                  </button>
                </div>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .notification-center {
      position: relative;
    }
    
    .bell-btn {
      position: relative;
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 8px;
      transition: background 0.2s;
      font-size: 18px;
    }
    .bell-btn:hover { background: rgba(255,255,255,0.1); }
    
    .badge {
      position: absolute;
      top: 0;
      right: 0;
      min-width: 18px;
      height: 18px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      font-weight: 700;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      line-height: 1;
    }
    
    .panel {
      position: absolute;
      top: 100%;
      right: 0;
      width: 380px;
      max-height: 520px;
      background: var(--theme-surface, #1e293b);
      border: 1px solid var(--theme-border, #334155);
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideDown 0.2s ease;
    }
    
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--theme-border, #334155);
    }
    
    .panel-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--theme-text, #e2e8f0);
      margin: 0;
    }
    
    .panel-actions {
      display: flex;
      gap: 8px;
    }
    
    .action-btn {
      background: none;
      border: none;
      color: var(--theme-text-muted, #94a3b8);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .action-btn:hover { background: rgba(255,255,255,0.08); color: var(--theme-text, #e2e8f0); }
    .action-btn.danger:hover { color: #ef4444; }
    
    .filter-tabs {
      display: flex;
      gap: 2px;
      padding: 8px 12px;
      overflow-x: auto;
      border-bottom: 1px solid var(--theme-border, #334155);
    }
    
    .filter-tab {
      background: none;
      border: none;
      color: var(--theme-text-muted, #94a3b8);
      cursor: pointer;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 6px;
      white-space: nowrap;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .filter-tab:hover { background: rgba(255,255,255,0.06); }
    .filter-tab.active {
      background: var(--theme-primary, #3b82f6);
      color: white;
    }
    
    .tab-count {
      background: rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 0 5px;
      font-size: 10px;
      min-width: 16px;
      text-align: center;
    }
    
    .notification-list {
      overflow-y: auto;
      flex: 1;
      max-height: 380px;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--theme-text-muted, #94a3b8);
    }
    .empty-icon { font-size: 32px; margin-bottom: 8px; }
    .empty-state p { margin: 0; font-size: 14px; }
    
    .notification-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--theme-border, rgba(255,255,255,0.05));
      cursor: pointer;
      transition: background 0.15s;
      position: relative;
    }
    .notification-item:hover { background: rgba(255,255,255,0.04); }
    .notification-item.unread {
      background: rgba(59, 130, 246, 0.06);
      border-left: 3px solid var(--theme-primary, #3b82f6);
    }
    
    .notif-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
    
    .notif-content { flex: 1; min-width: 0; }
    
    .notif-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--theme-text, #e2e8f0);
      line-height: 1.3;
    }
    
    .notif-body {
      font-size: 12px;
      color: var(--theme-text-muted, #94a3b8);
      margin-top: 2px;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    
    .notif-time {
      font-size: 11px;
      color: var(--theme-text-muted, #64748b);
      margin-top: 4px;
    }
    
    .notif-dismiss {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: var(--theme-text-muted, #64748b);
      cursor: pointer;
      font-size: 16px;
      padding: 2px 6px;
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .notification-item:hover .notif-dismiss { opacity: 1; }
    .notif-dismiss:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
    
    /* P15-4: 隊列統計條 */
    .queue-stats-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 16px;
      background: rgba(15, 23, 42, 0.5);
      border-bottom: 1px solid var(--theme-border, #334155);
      font-size: 11px;
    }
    .qs-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .qs-ok { color: #22c55e; }
    .qs-retry { color: #f59e0b; }
    .qs-dead { color: #ef4444; font-weight: 600; }
    
    @media (max-width: 480px) {
      .panel {
        position: fixed;
        top: 60px;
        left: 8px;
        right: 8px;
        width: auto;
        max-height: calc(100vh - 80px);
      }
    }
  `]
})
export class NotificationCenterComponent {
  private notifService = inject(NotificationService);
  private bizEvents = inject(BusinessEventService);
  private elementRef = inject(ElementRef);
  
  isOpen = signal(false);
  activeFilter = signal<FilterType>('all');
  
  readonly unreadCount = computed(() => this.notifService.unreadCount());
  
  // P15-4: 消息隊列實時統計
  readonly queueStats = this.bizEvents.queueStats;
  
  readonly filterTabs: { id: FilterType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'system', label: '系統' },
    { id: 'warning', label: '告警' },
    { id: 'error', label: '錯誤' },
    { id: 'lead', label: '潛客' },
    { id: 'success', label: '成功' },
  ];
  
  readonly filteredNotifications = computed(() => {
    const all = this.notifService.notifications();
    const filter = this.activeFilter();
    
    const filtered = filter === 'all' ? all : all.filter(n => n.type === filter);
    
    // 未讀在前，按時間倒序
    return [...filtered].sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  });
  
  /** 點擊外部關閉面板 */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
  
  /** ESC 關閉面板 */
  @HostListener('document:keydown.escape')
  onEscPress(): void {
    this.isOpen.set(false);
  }
  
  togglePanel(): void {
    this.isOpen.update(v => !v);
  }
  
  markAllRead(): void {
    this.notifService.markAllAsRead();
  }
  
  clearAll(): void {
    this.notifService.clearAll();
  }
  
  dismiss(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.notifService.remove(id);
  }
  
  onNotifClick(notif: AppNotification): void {
    if (!notif.read) {
      this.notifService.markAsRead(notif.id);
    }
    // 如果通知有 actions，觸發第一個
    if (notif.actions?.length) {
      notif.actions[0].handler();
      this.isOpen.set(false);
    }
  }
  
  getTypeIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      lead: '🎯',
      message: '💬',
      system: '🔧'
    };
    return icons[type] || '📌';
  }
  
  getCountByType(type: FilterType): number {
    if (type === 'all') return this.notifService.notifications().length;
    return this.notifService.notifications().filter(n => n.type === type && !n.read).length;
  }
}
