/**
 * 实时事件订阅服务
 * =================
 * 
 * 功能：
 * 1. 接收后端实时推送
 * 2. 事件分发和订阅
 * 3. 自动重连
 * 4. 事件历史获取
 */

import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, filter, map } from 'rxjs';
import { ElectronIpcService } from '../electron-ipc.service';

// 事件类型枚举
export enum EventType {
  // 告警相关
  ALERT_NEW = 'alert.new',
  ALERT_RESOLVED = 'alert.resolved',
  ALERT_CLEARED = 'alert.cleared',
  
  // 容量相关
  CAPACITY_WARNING = 'capacity.warning',
  CAPACITY_CRITICAL = 'capacity.critical',
  CAPACITY_NORMAL = 'capacity.normal',
  
  // API 状态
  API_ADDED = 'api.added',
  API_REMOVED = 'api.removed',
  API_DISABLED = 'api.disabled',
  API_RECOVERED = 'api.recovered',
  API_EXHAUSTED = 'api.exhausted',
  
  // 登录相关
  LOGIN_SUCCESS = 'login.success',
  LOGIN_FAILED = 'login.failed',
  LOGIN_BATCH_COMPLETE = 'login.batch_complete',
  
  // 系统状态
  SYSTEM_STATUS = 'system.status',
  STATS_UPDATE = 'stats.update'
}

// 事件接口
export interface RealtimeEvent {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

// 连接状态
export enum ConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeEventsService implements OnDestroy {
  // 所有事件流
  private allEvents$ = new Subject<RealtimeEvent>();
  
  // 连接状态
  private connectionState$ = new BehaviorSubject<ConnectionState>(ConnectionState.DISCONNECTED);
  
  // 最近的事件
  private recentEvents: RealtimeEvent[] = [];
  private maxRecentEvents = 100;
  
  // 事件统计
  private eventCounts: Map<string, number> = new Map();
  
  // IPC 监听器清理
  private listenerCleanup: (() => void) | null = null;
  
  constructor(
    private ipc: ElectronIpcService,
    private ngZone: NgZone
  ) {
    this.initialize();
  }
  
  /**
   * 初始化事件监听
   */
  private async initialize(): Promise<void> {
    try {
      // 注册前端事件接收器（桌面版可能未註冊此 handler，靜默跳過）
      try {
        await this.ipc.invoke('events:register-receiver');
      } catch (e: any) {
        const msg = String((e?.message ?? e) ?? '');
        if (msg.includes('No handler registered') || msg.includes('events:register-receiver')) {
          // 桌面版無此 IPC，不視為失敗
        } else {
          throw e;
        }
      }
      
      // 监听来自后端的事件
      this.setupEventListener();
      
      // 获取初始历史
      await this.fetchHistory();
      
      this.connectionState$.next(ConnectionState.CONNECTED);
      console.log('[RealtimeEvents] Initialized successfully');
    } catch (error) {
      console.error('[RealtimeEvents] Initialization failed:', error);
      this.connectionState$.next(ConnectionState.DISCONNECTED);
    }
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListener(): void {
    // 通过 IPC 接收事件
    if ((window as any).electronAPI?.onEvent) {
      (window as any).electronAPI.onEvent((event: RealtimeEvent) => {
        this.ngZone.run(() => {
          this.handleIncomingEvent(event);
        });
      });
    }
  }
  
  /**
   * 处理接收到的事件
   */
  private handleIncomingEvent(event: RealtimeEvent): void {
    // 添加到最近事件
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.shift();
    }
    
    // 更新统计
    const count = this.eventCounts.get(event.type) || 0;
    this.eventCounts.set(event.type, count + 1);
    
    // 发射事件
    this.allEvents$.next(event);
    
    console.log(`[RealtimeEvents] Received: ${event.type}`, event.data);
  }
  
  /**
   * 获取历史事件
   */
  private async fetchHistory(): Promise<void> {
    try {
      const history = await this.ipc.invoke('events:get-history', {
        limit: 50
      });
      
      if (history && Array.isArray(history)) {
        this.recentEvents = history;
      }
    } catch (e: any) {
      const msg = String((e?.message ?? e) ?? '');
      if (msg.includes('No handler registered') || msg.includes('events:get-history')) {
        return; // 桌面版無此 IPC，靜默跳過
      }
      console.error('[RealtimeEvents] Failed to fetch history:', e);
    }
  }
  
  // ========== 公共 API ==========
  
  /**
   * 订阅所有事件
   */
  public events(): Observable<RealtimeEvent> {
    return this.allEvents$.asObservable();
  }
  
  /**
   * 订阅特定类型的事件
   */
  public on(eventType: EventType | string): Observable<RealtimeEvent> {
    return this.allEvents$.pipe(
      filter(event => event.type === eventType)
    );
  }
  
  /**
   * 订阅多个类型的事件
   */
  public onAny(eventTypes: (EventType | string)[]): Observable<RealtimeEvent> {
    return this.allEvents$.pipe(
      filter(event => eventTypes.includes(event.type as EventType))
    );
  }
  
  /**
   * 订阅告警事件
   */
  public onAlerts(): Observable<RealtimeEvent> {
    return this.onAny([
      EventType.ALERT_NEW,
      EventType.ALERT_RESOLVED,
      EventType.ALERT_CLEARED
    ]);
  }
  
  /**
   * 订阅容量事件
   */
  public onCapacity(): Observable<RealtimeEvent> {
    return this.onAny([
      EventType.CAPACITY_WARNING,
      EventType.CAPACITY_CRITICAL,
      EventType.CAPACITY_NORMAL
    ]);
  }
  
  /**
   * 订阅 API 状态事件
   */
  public onApiStatus(): Observable<RealtimeEvent> {
    return this.onAny([
      EventType.API_ADDED,
      EventType.API_REMOVED,
      EventType.API_DISABLED,
      EventType.API_RECOVERED,
      EventType.API_EXHAUSTED
    ]);
  }
  
  /**
   * 订阅登录事件
   */
  public onLogin(): Observable<RealtimeEvent> {
    return this.onAny([
      EventType.LOGIN_SUCCESS,
      EventType.LOGIN_FAILED,
      EventType.LOGIN_BATCH_COMPLETE
    ]);
  }
  
  /**
   * 获取连接状态
   */
  public getConnectionState(): Observable<ConnectionState> {
    return this.connectionState$.asObservable();
  }
  
  /**
   * 获取最近的事件
   */
  public getRecentEvents(limit: number = 20): RealtimeEvent[] {
    return this.recentEvents.slice(-limit);
  }
  
  /**
   * 获取特定类型的最近事件
   */
  public getRecentByType(eventType: EventType | string, limit: number = 10): RealtimeEvent[] {
    return this.recentEvents
      .filter(e => e.type === eventType)
      .slice(-limit);
  }
  
  /**
   * 获取事件统计
   */
  public getStats(): { type: string; count: number }[] {
    return Array.from(this.eventCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * 手动刷新历史
   */
  public async refreshHistory(): Promise<void> {
    await this.fetchHistory();
  }
  
  /**
   * 清理资源
   */
  ngOnDestroy(): void {
    if (this.listenerCleanup) {
      this.listenerCleanup();
    }
    this.allEvents$.complete();
  }
}


/**
 * 事件工具类
 */
export class EventUtils {
  /**
   * 判断是否为严重事件
   */
  static isCritical(event: RealtimeEvent): boolean {
    const criticalTypes = [
      EventType.CAPACITY_CRITICAL,
      EventType.API_EXHAUSTED
    ];
    return criticalTypes.includes(event.type as EventType) ||
           (event.type === EventType.ALERT_NEW && event.data?.level === 'critical');
  }
  
  /**
   * 判断是否为警告事件
   */
  static isWarning(event: RealtimeEvent): boolean {
    const warningTypes = [
      EventType.CAPACITY_WARNING,
      EventType.API_DISABLED,
      EventType.LOGIN_FAILED
    ];
    return warningTypes.includes(event.type as EventType) ||
           (event.type === EventType.ALERT_NEW && event.data?.level === 'warning');
  }
  
  /**
   * 获取事件图标
   */
  static getIcon(event: RealtimeEvent): string {
    const iconMap: Record<string, string> = {
      [EventType.ALERT_NEW]: '🔔',
      [EventType.ALERT_RESOLVED]: '✅',
      [EventType.CAPACITY_WARNING]: '⚠️',
      [EventType.CAPACITY_CRITICAL]: '🚨',
      [EventType.API_ADDED]: '➕',
      [EventType.API_REMOVED]: '➖',
      [EventType.API_DISABLED]: '🚫',
      [EventType.API_RECOVERED]: '💚',
      [EventType.LOGIN_SUCCESS]: '🔓',
      [EventType.LOGIN_FAILED]: '🔐',
      [EventType.STATS_UPDATE]: '📊'
    };
    return iconMap[event.type] || '📌';
  }
  
  /**
   * 获取事件描述
   */
  static getDescription(event: RealtimeEvent): string {
    switch (event.type) {
      case EventType.ALERT_NEW:
        return event.data?.message || '新告警';
      case EventType.ALERT_RESOLVED:
        return '告警已解决';
      case EventType.CAPACITY_WARNING:
        return `容量警告: ${event.data?.usage_percent}%`;
      case EventType.CAPACITY_CRITICAL:
        return `容量危急: ${event.data?.usage_percent}%`;
      case EventType.API_ADDED:
        return `API 已添加: ${event.data?.platform || 'Unknown'}`;
      case EventType.API_DISABLED:
        return `API 已禁用: ${event.data?.api_id || 'Unknown'}`;
      case EventType.API_RECOVERED:
        return `API 已恢复: ${event.data?.api_id || 'Unknown'}`;
      case EventType.LOGIN_SUCCESS:
        return `登录成功: ${event.data?.phone || 'Unknown'}`;
      case EventType.LOGIN_FAILED:
        return `登录失败: ${event.data?.phone || 'Unknown'}`;
      default:
        return event.type;
    }
  }
  
  /**
   * 格式化时间
   */
  static formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
