/**
 * Enhanced Notification Service
 * 增強型通知服務
 * 
 * 功能：
 * - 桌面通知
 * - 音效提示
 * - 優先級分類
 * - 通知歷史
 * - 免打擾模式
 */
import { Injectable, signal, computed, effect } from '@angular/core';

// ============ 類型定義 ============

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'lead' | 'message' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  icon?: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, any>;
  actions?: NotificationAction[];
  sound?: boolean;
  desktop?: boolean;
  persistent?: boolean;  // 是否持久顯示
}

export interface NotificationAction {
  id: string;
  label: string;
  handler: () => void;
}

export interface NotificationSettings {
  enabled: boolean;
  desktop: boolean;
  sound: boolean;
  soundVolume: number;  // 0-1
  doNotDisturb: boolean;
  doNotDisturbSchedule?: {
    enabled: boolean;
    startTime: string;  // HH:mm
    endTime: string;
  };
  priorities: {
    [K in NotificationPriority]: {
      enabled: boolean;
      sound: boolean;
      desktop: boolean;
    };
  };
  types: {
    [K in NotificationType]: {
      enabled: boolean;
      sound: string;
    };
  };
}

// ============ 音效 ============

const NOTIFICATION_SOUNDS: Record<string, string> = {
  default: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdHWAgoOBgX98fX19e3t7e3t7e3t7e3t7e3t7e3t7fHx9fX5+f4CAgoKDhIWFhYWEg4KBgH9+fXx7enp5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl6enp7e3x8fX1+fn9/gICBgYKCg4ODhISEhISEg4OCgoGBgH9/fn59fXx8e3t7e3t7e3t7e3t7e3t7e3t7fHx9fX5+f4CAgoKDhIWFhYWEg4KBgH9+fXx7enp5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl6enp7e3x8fX1+fn9/gICBgYKCg4ODhISEhISEg4OCgoGBgH9/fn59fXx8e3t7e3t7e3t7e3t7e3t7e3t7',
  success: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=',
  warning: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgICAgICAgICAgH9/f39/f39/f39/f39/f4CAgICAgIGBgYGBgYGBgYGBgYGBgYCAgICAgH9/f39/f39/f39/f39/f39/gICAgICAgYGBgYGBgYGBgYGBgYGBgICAgICAf39/f39/f39/f39/f39/f3+AgICAgICBgYGBgYGBgYGBgYGBgYGAgICAgIB/f39/f39/f39/f39/f39/f4CAgICAgIGBgYGBgYGBgYGBgYGBgYCAgICAf39/f39/f39/f39/f39/f39/gICAgICAgYGBgYGBgYGBgYGBgYGBgICAgICA',
  error: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAAD/////////////////////gICAgICAgICAgICA////////////////////////gICAgICAgICAgICA////////////////////////gICAgICAgICAgICA////////////////////////gICAgICAgICAgICA////////////////////////gICAgICAgICAgICA////////////////////////gICAgICAgICAgICA',
  lead: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=',
  message: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAABgYGBhYWFiYmJjY2NkZGRlZWVmZmZnZ2doaGhpaWlqampra2tsbGxtbW1ubm5vb29wcHBxcXFycnJzc3N0dHR1dXV2dnZ3d3d4eHh5eXl6enp7e3t8fHx9fX1+fn5/f3+AgICBgYGCgoKDg4OEhISFhYWGhoaHh4eIiIiJiYmKioqLi4uMjIyNjY2Ojo6Pj4+QkJCRkZGSkpKTk5OUlJSVlZWWlpaXl5eYmJiZmZmampqbm5ucnJydnZ2enp6fn5+goKChoaGioqKjo6OkpKSlpaWmpqanp6eoqKipqamqqqqrq6usrKytra2urq6vr6+wsLCxsbGysrKzs7O0tLS1tbW2tra3t7e4uLi5ubm6urq7u7u8vLy9vb2+vr6/v7/AwMDBwcHCwsLDw8PExMTFxcXGxsbHx8fIyMjJycnKysrLy8vMzMzNzc3Ozs7Pz8/Q0NDR0dHS0tLT09PU1NTV1dXW1tbX19fY2NjZ2dna2trb29vc3Nzd3d3e3t7f39/g4ODh4eHi4uLj4+Pk5OTl5eXm5ubn5+fo6Ojp6enq6urr6+vs7Ozt7e3u7u7v7+/w8PDx8fHy8vLz8/P09PT19fX29vb39/f4+Pj5+fn6+vr7+/v8/Pz9/f3+/v7//w=='
};

// ============ 默認設置 ============

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  desktop: true,
  sound: true,
  soundVolume: 0.5,
  doNotDisturb: false,
  doNotDisturbSchedule: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00'
  },
  priorities: {
    low: { enabled: true, sound: false, desktop: false },
    normal: { enabled: true, sound: true, desktop: true },
    high: { enabled: true, sound: true, desktop: true },
    urgent: { enabled: true, sound: true, desktop: true }
  },
  types: {
    info: { enabled: true, sound: 'default' },
    success: { enabled: true, sound: 'success' },
    warning: { enabled: true, sound: 'warning' },
    error: { enabled: true, sound: 'error' },
    lead: { enabled: true, sound: 'lead' },
    message: { enabled: true, sound: 'message' },
    system: { enabled: true, sound: 'default' }
  }
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  
  // 通知列表
  private _notifications = signal<AppNotification[]>([]);
  notifications = this._notifications.asReadonly();
  
  // 設置
  private _settings = signal<NotificationSettings>(DEFAULT_SETTINGS);
  settings = this._settings.asReadonly();
  
  // 計算屬性
  unreadCount = computed(() => 
    this._notifications().filter(n => !n.read).length
  );
  
  unreadByPriority = computed(() => {
    const notifications = this._notifications().filter(n => !n.read);
    return {
      urgent: notifications.filter(n => n.priority === 'urgent').length,
      high: notifications.filter(n => n.priority === 'high').length,
      normal: notifications.filter(n => n.priority === 'normal').length,
      low: notifications.filter(n => n.priority === 'low').length
    };
  });
  
  // 桌面通知權限
  private _desktopPermission = signal<NotificationPermission>('default');
  desktopPermission = this._desktopPermission.asReadonly();
  
  constructor() {
    this.loadSettings();
    this.loadNotifications();
    this.checkDesktopPermission();
  }
  
  // ============ 通知發送 ============
  
  /**
   * 發送通知
   */
  notify(params: {
    type?: NotificationType;
    priority?: NotificationPriority;
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, any>;
    actions?: NotificationAction[];
    sound?: boolean;
    desktop?: boolean;
    persistent?: boolean;
  }): AppNotification {
    const notification: AppNotification = {
      id: 'notif-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      type: params.type || 'info',
      priority: params.priority || 'normal',
      title: params.title,
      body: params.body,
      icon: params.icon || this.getDefaultIcon(params.type || 'info'),
      timestamp: new Date(),
      read: false,
      data: params.data,
      actions: params.actions,
      sound: params.sound ?? true,
      desktop: params.desktop ?? true,
      persistent: params.persistent ?? false
    };
    
    // 檢查是否應該發送
    if (!this.shouldNotify(notification)) {
      // 仍然添加到歷史，但不播放聲音或顯示桌面通知
      this.addToHistory(notification);
      return notification;
    }
    
    // 添加到歷史
    this.addToHistory(notification);
    
    // 播放聲音
    if (notification.sound && this._settings().sound) {
      this.playSound(notification.type);
    }
    
    // 顯示桌面通知
    if (notification.desktop && this._settings().desktop) {
      this.showDesktopNotification(notification);
    }
    
    return notification;
  }
  
  /**
   * 便捷方法
   */
  info(title: string, body: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({ ...options, type: 'info', title, body });
  }
  
  success(title: string, body: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({ ...options, type: 'success', title, body });
  }
  
  warning(title: string, body: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({ ...options, type: 'warning', priority: 'high', title, body });
  }
  
  error(title: string, body: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({ ...options, type: 'error', priority: 'urgent', title, body });
  }
  
  lead(leadName: string, source: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({
      ...options,
      type: 'lead',
      priority: 'high',
      title: '🎯 新潛在客戶',
      body: `${leadName} 來自 ${source}`,
      icon: '🎯'
    });
  }
  
  message(from: string, preview: string, options?: Partial<AppNotification>): AppNotification {
    return this.notify({
      ...options,
      type: 'message',
      title: `💬 ${from}`,
      body: preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
      icon: '💬'
    });
  }
  
  // ============ 通知管理 ============
  
  /**
   * 標記為已讀
   */
  markAsRead(notificationId: string): void {
    this._notifications.update(notifications =>
      notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    this.saveNotifications();
  }
  
  /**
   * 標記全部已讀
   */
  markAllAsRead(): void {
    this._notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
    this.saveNotifications();
  }
  
  /**
   * 刪除通知
   */
  remove(notificationId: string): void {
    this._notifications.update(notifications =>
      notifications.filter(n => n.id !== notificationId)
    );
    this.saveNotifications();
  }
  
  /**
   * 清空所有通知
   */
  clearAll(): void {
    this._notifications.set([]);
    this.saveNotifications();
  }
  
  /**
   * 清空已讀通知
   */
  clearRead(): void {
    this._notifications.update(notifications =>
      notifications.filter(n => !n.read)
    );
    this.saveNotifications();
  }
  
  // ============ 設置管理 ============
  
  /**
   * 更新設置
   */
  updateSettings(settings: Partial<NotificationSettings>): void {
    this._settings.update(s => ({ ...s, ...settings }));
    this.saveSettings();
  }
  
  /**
   * 切換免打擾
   */
  toggleDoNotDisturb(): void {
    this._settings.update(s => ({ ...s, doNotDisturb: !s.doNotDisturb }));
    this.saveSettings();
  }
  
  /**
   * 請求桌面通知權限
   */
  async requestDesktopPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }
    
    const permission = await Notification.requestPermission();
    this._desktopPermission.set(permission);
    return permission === 'granted';
  }
  
  // ============ 私有方法 ============
  
  private addToHistory(notification: AppNotification): void {
    this._notifications.update(notifications => {
      const newList = [notification, ...notifications];
      // 保留最近 100 條
      return newList.slice(0, 100);
    });
    this.saveNotifications();
  }
  
  private shouldNotify(notification: AppNotification): boolean {
    const settings = this._settings();
    
    // 全局禁用
    if (!settings.enabled) return false;
    
    // 免打擾模式
    if (settings.doNotDisturb) {
      if (notification.priority !== 'urgent') return false;
    }
    
    // 檢查定時免打擾
    if (settings.doNotDisturbSchedule?.enabled) {
      if (this.isInDoNotDisturbTime()) {
        if (notification.priority !== 'urgent') return false;
      }
    }
    
    // 檢查優先級設置
    if (!settings.priorities[notification.priority].enabled) return false;
    
    // 檢查類型設置
    if (!settings.types[notification.type].enabled) return false;
    
    return true;
  }
  
  private isInDoNotDisturbTime(): boolean {
    const schedule = this._settings().doNotDisturbSchedule;
    if (!schedule?.enabled) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    
    if (startMinutes < endMinutes) {
      // 同一天內
      return currentTime >= startMinutes && currentTime < endMinutes;
    } else {
      // 跨天
      return currentTime >= startMinutes || currentTime < endMinutes;
    }
  }
  
  private playSound(type: NotificationType): void {
    const settings = this._settings();
    const soundName = settings.types[type]?.sound || 'default';
    const soundData = NOTIFICATION_SOUNDS[soundName] || NOTIFICATION_SOUNDS.default;
    
    try {
      const audio = new Audio(soundData);
      audio.volume = settings.soundVolume;
      audio.play().catch(e => console.warn('Failed to play notification sound:', e));
    } catch (e) {
      console.warn('Failed to create audio:', e);
    }
  }
  
  private showDesktopNotification(notification: AppNotification): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    
    try {
      const desktopNotif = new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        tag: notification.id,
        requireInteraction: notification.persistent
      });
      
      desktopNotif.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        desktopNotif.close();
      };
      
      // 非持久通知 5 秒後自動關閉
      if (!notification.persistent) {
        setTimeout(() => desktopNotif.close(), 5000);
      }
    } catch (e) {
      console.warn('Failed to show desktop notification:', e);
    }
  }
  
  private getDefaultIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      lead: '🎯',
      message: '💬',
      system: '⚙️'
    };
    return icons[type];
  }
  
  private checkDesktopPermission(): void {
    if ('Notification' in window) {
      this._desktopPermission.set(Notification.permission);
    }
  }
  
  // ============ 持久化 ============
  
  private loadSettings(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-notification-settings');
      if (stored) {
        this._settings.set({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load notification settings:', e);
    }
  }
  
  private saveSettings(): void {
    try {
      localStorage.setItem('tg-matrix-notification-settings', JSON.stringify(this._settings()));
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  }
  
  private loadNotifications(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-notifications');
      if (stored) {
        const notifications = JSON.parse(stored).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this._notifications.set(notifications);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  }
  
  private saveNotifications(): void {
    try {
      localStorage.setItem('tg-matrix-notifications', JSON.stringify(this._notifications()));
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }
}
