/**
 * 工作流通知服務
 * Workflow Notification Service
 * 
 * 🆕 Phase 4：智能通知與提醒
 * 
 * 功能：
 * - 關鍵事件桌面通知
 * - 轉化提醒
 * - 異常警報
 * - 每日摘要
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AutomationWorkflowService, WorkflowExecution } from './automation-workflow.service';

// 通知類型
export type NotificationType = 'trigger' | 'conversion' | 'interest' | 'group_created' | 'error' | 'daily_summary';

// 通知配置
export interface NotificationConfig {
  enabled: boolean;
  types: {
    trigger: boolean;
    conversion: boolean;
    interest: boolean;
    groupCreated: boolean;
    error: boolean;
    dailySummary: boolean;
  };
  sound: boolean;
  desktop: boolean;
  quietHours: {
    enabled: boolean;
    start: string;  // HH:mm
    end: string;    // HH:mm
  };
}

// 通知記錄
export interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: any;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  types: {
    trigger: true,
    conversion: true,
    interest: true,
    groupCreated: true,
    error: true,
    dailySummary: true
  },
  sound: true,
  desktop: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

@Injectable({ providedIn: 'root' })
export class WorkflowNotificationService {
  private readonly ipc = inject(ElectronIpcService);
  private readonly toast = inject(ToastService);
  private readonly workflowService = inject(AutomationWorkflowService);
  
  private readonly STORAGE_KEY = 'workflowNotifications';
  private readonly MAX_NOTIFICATIONS = 100;
  
  // 配置
  private _config = signal<NotificationConfig>(DEFAULT_CONFIG);
  config = this._config.asReadonly();
  
  // 通知記錄
  private _notifications = signal<NotificationRecord[]>([]);
  notifications = this._notifications.asReadonly();
  
  // 未讀數量
  unreadCount = computed(() => 
    this._notifications().filter(n => !n.read).length
  );
  
  // IPC 清理函數
  private ipcCleanups: (() => void)[] = [];
  
  constructor() {
    this.loadConfig();
    this.loadNotifications();
    this.setupEventListeners();
    
    console.log('[WorkflowNotification] 服務已初始化');
  }
  
  // ============ 事件監聽 ============
  
  private setupEventListeners(): void {
    // 監聽工作流觸發
    const cleanup1 = this.ipc.on('keyword-matched', (data: any) => {
      this.handleTrigger(data);
    });
    this.ipcCleanups.push(cleanup1);
    
    // 監聽興趣信號
    const cleanup2 = this.ipc.on('ai:analyze-interest-result', (data: any) => {
      if (data.hasInterest) {
        this.handleInterest(data);
      }
    });
    this.ipcCleanups.push(cleanup2);
    
    // 監聽建群成功
    const cleanup3 = this.ipc.on('multi-role:group-created', (data: any) => {
      if (data.success) {
        this.handleGroupCreated(data);
      }
    });
    this.ipcCleanups.push(cleanup3);
    
    // 監聽協作完成
    const cleanup4 = this.ipc.on('collaboration-session-completed', (data: any) => {
      if (data.outcome === 'converted') {
        this.handleConversion(data);
      }
    });
    this.ipcCleanups.push(cleanup4);
  }
  
  // ============ 事件處理 ============
  
  private handleTrigger(data: any): void {
    if (!this.shouldNotify('trigger')) return;
    
    this.createNotification({
      type: 'trigger',
      title: '🎯 新觸發',
      message: `用戶 @${data.username || 'User'} 在「${data.groupName}」觸發了關鍵詞「${data.keyword}」`,
      data
    });
  }
  
  private handleInterest(data: any): void {
    if (!this.shouldNotify('interest')) return;
    
    const signalNames: Record<string, string> = {
      'price': '價格詢問',
      'buying': '購買意向',
      'positive': '正面反饋',
      'detail': '產品興趣',
      'compare': '比較諮詢'
    };
    
    this.createNotification({
      type: 'interest',
      title: '💡 興趣信號',
      message: `檢測到${signalNames[data.signalType] || '興趣信號'}：「${data.keyPhrase}」`,
      data
    });
  }
  
  private handleGroupCreated(data: any): void {
    if (!this.shouldNotify('groupCreated')) return;
    
    this.createNotification({
      type: 'group_created',
      title: '👥 群組創建',
      message: `VIP 群「${data.groupName}」創建成功`,
      data
    });
  }
  
  private handleConversion(data: any): void {
    if (!this.shouldNotify('conversion')) return;
    
    this.createNotification({
      type: 'conversion',
      title: '🎉 成功轉化',
      message: `用戶 @${data.targetUserName || 'User'} 已成功轉化！`,
      data
    });
    
    // 轉化是重要事件，額外顯示 Toast
    this.toast.success(`🎉 恭喜！用戶已成功轉化`);
  }
  
  // ============ 通知管理 ============
  
  private createNotification(params: {
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
  }): void {
    const notification: NotificationRecord = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: params.type,
      title: params.title,
      message: params.message,
      timestamp: new Date(),
      read: false,
      data: params.data
    };
    
    // 添加到列表
    this._notifications.update(list => {
      const newList = [notification, ...list];
      return newList.slice(0, this.MAX_NOTIFICATIONS);
    });
    
    // 保存
    this.saveNotifications();
    
    // 顯示桌面通知
    if (this._config().desktop) {
      this.showDesktopNotification(notification);
    }
    
    // 播放聲音
    if (this._config().sound && params.type === 'conversion') {
      this.playSound();
    }
    
    console.log(`[WorkflowNotification] ${params.title}: ${params.message}`);
  }
  
  private showDesktopNotification(notification: NotificationRecord): void {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icon.png',
        tag: notification.id
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/assets/icon.png',
            tag: notification.id
          });
        }
      });
    }
  }
  
  private playSound(): void {
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {
      // 忽略音頻錯誤
    }
  }
  
  private shouldNotify(type: NotificationType): boolean {
    const config = this._config();
    
    if (!config.enabled) return false;
    
    // 檢查類型是否啟用
    const typeKey = this.getTypeKey(type);
    if (!config.types[typeKey]) return false;
    
    // 檢查靜音時段
    if (config.quietHours.enabled && this.isInQuietHours()) return false;
    
    return true;
  }
  
  private getTypeKey(type: NotificationType): keyof NotificationConfig['types'] {
    const mapping: Record<NotificationType, keyof NotificationConfig['types']> = {
      'trigger': 'trigger',
      'conversion': 'conversion',
      'interest': 'interest',
      'group_created': 'groupCreated',
      'error': 'error',
      'daily_summary': 'dailySummary'
    };
    return mapping[type];
  }
  
  private isInQuietHours(): boolean {
    const config = this._config().quietHours;
    if (!config.enabled) return false;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (config.start < config.end) {
      return currentTime >= config.start && currentTime < config.end;
    } else {
      // 跨午夜
      return currentTime >= config.start || currentTime < config.end;
    }
  }
  
  // ============ 公開 API ============
  
  /**
   * 標記為已讀
   */
  markAsRead(id: string): void {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
    this.saveNotifications();
  }
  
  /**
   * 標記所有為已讀
   */
  markAllAsRead(): void {
    this._notifications.update(list =>
      list.map(n => ({ ...n, read: true }))
    );
    this.saveNotifications();
  }
  
  /**
   * 清除通知
   */
  clearNotification(id: string): void {
    this._notifications.update(list =>
      list.filter(n => n.id !== id)
    );
    this.saveNotifications();
  }
  
  /**
   * 清除所有通知
   */
  clearAll(): void {
    this._notifications.set([]);
    this.saveNotifications();
  }
  
  /**
   * 更新配置
   */
  updateConfig(updates: Partial<NotificationConfig>): void {
    this._config.update(config => ({
      ...config,
      ...updates,
      types: {
        ...config.types,
        ...(updates.types || {})
      },
      quietHours: {
        ...config.quietHours,
        ...(updates.quietHours || {})
      }
    }));
    this.saveConfig();
  }
  
  /**
   * 請求桌面通知權限
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  // ============ 持久化 ============
  
  private saveConfig(): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_config`, JSON.stringify(this._config()));
    } catch (e) {
      console.error('[WorkflowNotification] 保存配置失敗:', e);
    }
  }
  
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem(`${this.STORAGE_KEY}_config`);
      if (saved) {
        const config = JSON.parse(saved);
        this._config.set({ ...DEFAULT_CONFIG, ...config });
      }
    } catch (e) {
      console.error('[WorkflowNotification] 載入配置失敗:', e);
    }
  }
  
  private saveNotifications(): void {
    try {
      localStorage.setItem(`${this.STORAGE_KEY}_list`, JSON.stringify(this._notifications()));
    } catch (e) {
      console.error('[WorkflowNotification] 保存通知失敗:', e);
    }
  }
  
  private loadNotifications(): void {
    try {
      const saved = localStorage.getItem(`${this.STORAGE_KEY}_list`);
      if (saved) {
        const notifications = JSON.parse(saved);
        this._notifications.set(notifications.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (e) {
      console.error('[WorkflowNotification] 載入通知失敗:', e);
    }
  }
  
  /**
   * 清理
   */
  destroy(): void {
    this.ipcCleanups.forEach(cleanup => cleanup());
  }
}
