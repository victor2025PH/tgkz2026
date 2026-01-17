/**
 * TG-AI智控王 通知中心服務
 * Notification Center Service v1.0
 * 
 * 功能：
 * - 多渠道通知（應用內、桌面、聲音）
 * - 優先級管理
 * - 通知歷史
 * - 靜音和免打擾
 * - 關鍵詞觸發提醒
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { LeadNotification, NotificationPriority, NotificationType } from './lead.models';

// ============ 配置 ============

const NOTIFICATION_CONFIG = {
  // 聲音文件
  sounds: {
    urgent: 'assets/sounds/urgent.mp3',
    important: 'assets/sounds/notification.mp3',
    normal: 'assets/sounds/ding.mp3'
  },
  
  // 默認設置
  defaults: {
    soundEnabled: true,
    desktopEnabled: true,
    inAppEnabled: true,
    urgentOnly: false
  },
  
  // 免打擾時段
  quietHours: {
    enabled: false,
    start: 22, // 22:00
    end: 8    // 08:00
  },
  
  // 通知保留時間（毫秒）
  retentionMs: 7 * 24 * 60 * 60 * 1000, // 7天
  
  // 最大通知數量
  maxNotifications: 200
};

// ============ 類型定義 ============

/** 通知設置 */
export interface NotificationSettings {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  inAppEnabled: boolean;
  urgentOnly: boolean;
  quietHours: {
    enabled: boolean;
    start: number;
    end: number;
  };
  // 關鍵詞特殊設置
  keywordAlerts: {
    sound: boolean;
    desktop: boolean;
    keywords: string[];
  };
}

/** 通知動作結果 */
export interface NotificationActionResult {
  notificationId: string;
  action: string;
  success: boolean;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationCenterService {
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 通知設置
  private _settings = signal<NotificationSettings>({
    ...NOTIFICATION_CONFIG.defaults,
    quietHours: { ...NOTIFICATION_CONFIG.quietHours },
    keywordAlerts: {
      sound: true,
      desktop: true,
      keywords: []
    }
  });
  settings = computed(() => this._settings());
  
  // 通知列表（從 LeadService 獲取）
  notifications = computed(() => this.leadService.notifications());
  
  // 未讀數量
  unreadCount = computed(() => this.leadService.unreadNotificationCount());
  
  // 緊急通知
  urgentNotifications = computed(() => this.leadService.urgentNotifications());
  
  // 音頻上下文
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  
  // 桌面通知權限
  private _hasDesktopPermission = signal(false);
  hasDesktopPermission = computed(() => this._hasDesktopPermission());
  
  // 通知回調
  private actionCallbacks: Map<string, (result: NotificationActionResult) => void> = new Map();
  
  constructor() {
    this.loadSettings();
    this.initAudio();
    this.checkDesktopPermission();
  }
  
  // ============ 初始化 ============
  
  /**
   * 初始化音頻
   */
  private initAudio(): void {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
      // 預加載聲音（實際項目中需要真實的音頻文件）
    }
  }
  
  /**
   * 檢查桌面通知權限
   */
  private async checkDesktopPermission(): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        this._hasDesktopPermission.set(true);
      } else if (Notification.permission !== 'denied') {
        // 稍後會請求權限
      }
    }
  }
  
  /**
   * 請求桌面通知權限
   */
  async requestDesktopPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      this._hasDesktopPermission.set(granted);
      return granted;
    } catch (e) {
      console.error('[NotificationCenter] Failed to request permission:', e);
      return false;
    }
  }
  
  // ============ 發送通知 ============
  
  /**
   * 發送通知
   */
  async notify(params: {
    leadId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    suggestedActions?: LeadNotification['suggestedActions'];
  }): Promise<LeadNotification> {
    const settings = this._settings();
    
    // 檢查是否在免打擾時段
    if (this.isQuietHours()) {
      // 只允許緊急通知
      if (params.priority !== 'urgent') {
        console.log('[NotificationCenter] Quiet hours, skipping non-urgent notification');
      }
    }
    
    // 檢查是否只接收緊急通知
    if (settings.urgentOnly && params.priority !== 'urgent') {
      console.log('[NotificationCenter] Urgent only mode, skipping');
    }
    
    // 創建通知
    const notification = this.leadService.addNotification(params);
    
    // 發送各渠道通知
    await this.deliverNotification(notification);
    
    return notification;
  }
  
  /**
   * 發送關鍵詞觸發通知
   */
  async notifyKeywordTrigger(params: {
    leadId: string;
    keyword: string;
    message: string;
    groupTitle?: string;
  }): Promise<LeadNotification> {
    const lead = this.leadService.getLead(params.leadId);
    const displayName = lead?.displayName || params.leadId;
    
    return this.notify({
      leadId: params.leadId,
      type: 'keyword_trigger',
      priority: 'important',
      title: `🔑 關鍵詞觸發: "${params.keyword}"`,
      message: `${displayName}: ${params.message.substring(0, 100)}...`,
      data: {
        keyword: params.keyword,
        fullMessage: params.message,
        groupTitle: params.groupTitle
      },
      suggestedActions: [
        { label: '查看消息', action: 'view_message', params: { leadId: params.leadId } },
        { label: 'AI回覆', action: 'ai_reply', params: { leadId: params.leadId } },
        { label: '人工回覆', action: 'manual_reply', params: { leadId: params.leadId } }
      ]
    });
  }
  
  /**
   * 發送購買意向通知
   */
  async notifyPurchaseIntent(params: {
    leadId: string;
    signal: string;
    message: string;
    signalType: 'strong' | 'medium' | 'weak';
  }): Promise<LeadNotification> {
    const lead = this.leadService.getLead(params.leadId);
    const displayName = lead?.displayName || params.leadId;
    
    const priority: NotificationPriority = 
      params.signalType === 'strong' ? 'urgent' : 
      params.signalType === 'medium' ? 'important' : 'normal';
    
    const emoji = params.signalType === 'strong' ? '🔥' : 
                  params.signalType === 'medium' ? '💡' : '👀';
    
    return this.notify({
      leadId: params.leadId,
      type: 'purchase_intent',
      priority,
      title: `${emoji} 購買信號: ${displayName}`,
      message: `"${params.signal}" - ${params.message.substring(0, 80)}...`,
      data: {
        signal: params.signal,
        signalType: params.signalType,
        fullMessage: params.message
      },
      suggestedActions: [
        { label: '立即跟進', action: 'follow_up', params: { leadId: params.leadId } },
        { label: '發送報價', action: 'send_pricing', params: { leadId: params.leadId } },
        { label: '人工接管', action: 'takeover', params: { leadId: params.leadId } }
      ]
    });
  }
  
  /**
   * 發送新回覆通知
   */
  async notifyNewReply(params: {
    leadId: string;
    message: string;
  }): Promise<LeadNotification> {
    const lead = this.leadService.getLead(params.leadId);
    const displayName = lead?.displayName || params.leadId;
    
    // 判斷優先級
    let priority: NotificationPriority = 'normal';
    if (lead?.stage === 'qualified') {
      priority = 'important';
    }
    
    return this.notify({
      leadId: params.leadId,
      type: 'new_reply',
      priority,
      title: `💬 新消息: ${displayName}`,
      message: params.message.substring(0, 100),
      suggestedActions: [
        { label: '查看對話', action: 'view_conversation', params: { leadId: params.leadId } },
        { label: 'AI回覆', action: 'ai_reply', params: { leadId: params.leadId } }
      ]
    });
  }
  
  /**
   * 發送跟進提醒通知
   */
  async notifyFollowUpDue(params: {
    leadId: string;
    followUpType: string;
  }): Promise<LeadNotification> {
    const lead = this.leadService.getLead(params.leadId);
    const displayName = lead?.displayName || params.leadId;
    
    return this.notify({
      leadId: params.leadId,
      type: 'follow_up_due',
      priority: 'normal',
      title: `⏰ 跟進提醒: ${displayName}`,
      message: `計劃的${params.followUpType}跟進已到期`,
      suggestedActions: [
        { label: '立即跟進', action: 'execute_followup', params: { leadId: params.leadId } },
        { label: '延後', action: 'postpone', params: { leadId: params.leadId } },
        { label: '跳過', action: 'skip', params: { leadId: params.leadId } }
      ]
    });
  }
  
  // ============ 通知交付 ============
  
  /**
   * 交付通知到各渠道
   */
  private async deliverNotification(notification: LeadNotification): Promise<void> {
    const settings = this._settings();
    
    // 聲音通知
    if (settings.soundEnabled && this.shouldPlaySound(notification.priority)) {
      this.playSound(notification.priority);
    }
    
    // 桌面通知
    if (settings.desktopEnabled && this._hasDesktopPermission() && 
        this.shouldShowDesktop(notification.priority)) {
      this.showDesktopNotification(notification);
    }
    
    console.log(`[NotificationCenter] Delivered: ${notification.title}`);
  }
  
  /**
   * 播放聲音
   */
  private playSound(priority: NotificationPriority): void {
    // 使用 Web Audio API 或 HTMLAudioElement
    try {
      // 簡單的蜂鳴聲
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // 根據優先級調整音調
        const frequency = priority === 'urgent' ? 880 : 
                         priority === 'important' ? 660 : 440;
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        
        // 播放時長
        const duration = priority === 'urgent' ? 300 : 200;
        setTimeout(() => {
          oscillator.stop();
        }, duration);
        
        // 緊急通知播放兩次
        if (priority === 'urgent') {
          setTimeout(() => {
            const osc2 = this.audioContext!.createOscillator();
            const gain2 = this.audioContext!.createGain();
            osc2.connect(gain2);
            gain2.connect(this.audioContext!.destination);
            osc2.frequency.value = frequency;
            osc2.type = 'sine';
            gain2.gain.value = 0.3;
            osc2.start();
            setTimeout(() => osc2.stop(), duration);
          }, 400);
        }
      }
    } catch (e) {
      console.error('[NotificationCenter] Failed to play sound:', e);
    }
  }
  
  /**
   * 顯示桌面通知
   */
  private showDesktopNotification(notification: LeadNotification): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    
    try {
      const desktopNotif = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/icon-192.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      });
      
      desktopNotif.onclick = () => {
        window.focus();
        this.handleNotificationClick(notification);
        desktopNotif.close();
      };
      
      // 非緊急通知自動關閉
      if (notification.priority !== 'urgent') {
        setTimeout(() => desktopNotif.close(), 5000);
      }
    } catch (e) {
      console.error('[NotificationCenter] Failed to show desktop notification:', e);
    }
  }
  
  /**
   * 處理通知點擊
   */
  private handleNotificationClick(notification: LeadNotification): void {
    // 標記為已讀
    this.leadService.markNotificationRead(notification.id);
    
    // 觸發回調
    const callback = this.actionCallbacks.get('click');
    if (callback) {
      callback({
        notificationId: notification.id,
        action: 'click',
        success: true,
        data: notification
      });
    }
  }
  
  // ============ 判斷邏輯 ============
  
  /**
   * 是否在免打擾時段
   */
  isQuietHours(): boolean {
    const settings = this._settings();
    if (!settings.quietHours.enabled) return false;
    
    const hour = new Date().getHours();
    const start = settings.quietHours.start;
    const end = settings.quietHours.end;
    
    // 處理跨午夜的情況
    if (start > end) {
      return hour >= start || hour < end;
    }
    return hour >= start && hour < end;
  }
  
  /**
   * 是否應該播放聲音
   */
  private shouldPlaySound(priority: NotificationPriority): boolean {
    if (this.isQuietHours() && priority !== 'urgent') return false;
    if (this._settings().urgentOnly && priority !== 'urgent') return false;
    return true;
  }
  
  /**
   * 是否應該顯示桌面通知
   */
  private shouldShowDesktop(priority: NotificationPriority): boolean {
    if (this.isQuietHours() && priority !== 'urgent') return false;
    if (this._settings().urgentOnly && priority !== 'urgent') return false;
    return true;
  }
  
  // ============ 通知操作 ============
  
  /**
   * 標記通知已讀
   */
  markAsRead(notificationId: string): void {
    this.leadService.markNotificationRead(notificationId);
  }
  
  /**
   * 標記通知已處理
   */
  markAsHandled(notificationId: string): void {
    this.leadService.markNotificationHandled(notificationId);
  }
  
  /**
   * 標記所有已讀
   */
  markAllAsRead(): void {
    this.leadService.markAllNotificationsRead();
  }
  
  /**
   * 執行通知動作
   */
  executeAction(notificationId: string, action: string, params?: any): void {
    const notification = this.notifications().find(n => n.id === notificationId);
    if (!notification) return;
    
    // 標記為已處理
    this.markAsHandled(notificationId);
    
    // 觸發回調
    const callback = this.actionCallbacks.get(action);
    if (callback) {
      callback({
        notificationId,
        action,
        success: true,
        data: { ...params, notification }
      });
    }
    
    console.log(`[NotificationCenter] Action executed: ${action}`);
  }
  
  /**
   * 註冊動作回調
   */
  onAction(action: string, callback: (result: NotificationActionResult) => void): void {
    this.actionCallbacks.set(action, callback);
  }
  
  /**
   * 取消動作回調
   */
  offAction(action: string): void {
    this.actionCallbacks.delete(action);
  }
  
  // ============ 設置管理 ============
  
  /**
   * 更新設置
   */
  updateSettings(updates: Partial<NotificationSettings>): void {
    this._settings.update(s => ({ ...s, ...updates }));
    this.saveSettings();
  }
  
  /**
   * 切換聲音
   */
  toggleSound(): void {
    this._settings.update(s => ({ ...s, soundEnabled: !s.soundEnabled }));
    this.saveSettings();
  }
  
  /**
   * 切換桌面通知
   */
  async toggleDesktop(): Promise<void> {
    const settings = this._settings();
    
    if (!settings.desktopEnabled && !this._hasDesktopPermission()) {
      // 請求權限
      const granted = await this.requestDesktopPermission();
      if (!granted) return;
    }
    
    this._settings.update(s => ({ ...s, desktopEnabled: !s.desktopEnabled }));
    this.saveSettings();
  }
  
  /**
   * 設置免打擾
   */
  setQuietHours(enabled: boolean, start?: number, end?: number): void {
    this._settings.update(s => ({
      ...s,
      quietHours: {
        enabled,
        start: start ?? s.quietHours.start,
        end: end ?? s.quietHours.end
      }
    }));
    this.saveSettings();
  }
  
  /**
   * 設置關鍵詞提醒
   */
  setKeywordAlerts(keywords: string[], sound: boolean = true, desktop: boolean = true): void {
    this._settings.update(s => ({
      ...s,
      keywordAlerts: { keywords, sound, desktop }
    }));
    this.saveSettings();
  }
  
  /**
   * 添加關鍵詞提醒
   */
  addKeywordAlert(keyword: string): void {
    this._settings.update(s => ({
      ...s,
      keywordAlerts: {
        ...s.keywordAlerts,
        keywords: [...s.keywordAlerts.keywords, keyword]
      }
    }));
    this.saveSettings();
  }
  
  /**
   * 移除關鍵詞提醒
   */
  removeKeywordAlert(keyword: string): void {
    this._settings.update(s => ({
      ...s,
      keywordAlerts: {
        ...s.keywordAlerts,
        keywords: s.keywordAlerts.keywords.filter(k => k !== keyword)
      }
    }));
    this.saveSettings();
  }
  
  // ============ 統計 ============
  
  /**
   * 獲取通知統計
   */
  getStats(): {
    total: number;
    unread: number;
    urgent: number;
    today: number;
    byType: Record<string, number>;
  } {
    const notifications = this.notifications();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const byType: Record<string, number> = {};
    let todayCount = 0;
    
    for (const n of notifications) {
      byType[n.type] = (byType[n.type] || 0) + 1;
      if (new Date(n.createdAt) >= today) {
        todayCount++;
      }
    }
    
    return {
      total: notifications.length,
      unread: this.unreadCount(),
      urgent: this.urgentNotifications().length,
      today: todayCount,
      byType
    };
  }
  
  // ============ 持久化 ============
  
  private saveSettings(): void {
    localStorage.setItem('tgai-notification-settings', JSON.stringify(this._settings()));
  }
  
  private loadSettings(): void {
    try {
      const data = localStorage.getItem('tgai-notification-settings');
      if (data) {
        const settings = JSON.parse(data);
        this._settings.set({ ...this._settings(), ...settings });
      }
    } catch (e) {
      console.error('[NotificationCenter] Failed to load settings:', e);
    }
  }
  
  // ============ 測試 ============
  
  /**
   * 發送測試通知
   */
  async sendTestNotification(): Promise<void> {
    await this.notify({
      leadId: 'test',
      type: 'keyword_trigger',
      priority: 'important',
      title: '🔔 測試通知',
      message: '這是一條測試通知，確認通知功能正常運作',
      suggestedActions: [
        { label: '確認', action: 'confirm', params: {} }
      ]
    });
  }
}
