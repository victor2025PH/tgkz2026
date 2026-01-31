/**
 * 實時數據服務
 * Realtime Service
 * 
 * 🆕 數據優化: WebSocket 實時更新
 * 
 * 功能：
 * - WebSocket 連接管理
 * - 實時數據訂閱
 * - 自動重連
 * - 心跳檢測
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 連接狀態
export type RealtimeConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// 訂閱類型
export type SubscriptionType = 
  | 'task:status'      // 任務狀態更新
  | 'task:stats'       // 任務統計更新
  | 'task:log'         // 任務日誌
  | 'message:new'      // 新消息
  | 'message:status'   // 消息狀態
  | 'contact:update'   // 聯繫人更新
  | 'system:status';   // 系統狀態

// 訂閱選項
export interface SubscriptionOptions {
  filter?: Record<string, any>;
  throttle?: number;
}

// 訂閱回調
export type SubscriptionCallback<T = any> = (data: T) => void;

// 訂閱記錄
interface Subscription {
  id: string;
  type: SubscriptionType;
  callback: SubscriptionCallback;
  options?: SubscriptionOptions;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService implements OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 連接狀態
  private _state = signal<RealtimeConnectionState>('disconnected');
  state = this._state.asReadonly();
  
  isConnected = computed(() => this._state() === 'connected');
  
  // 重連計數
  private _reconnectAttempts = signal(0);
  reconnectAttempts = this._reconnectAttempts.asReadonly();
  
  // 最後心跳時間
  private _lastHeartbeat = signal<Date | null>(null);
  lastHeartbeat = this._lastHeartbeat.asReadonly();
  
  // 訂閱列表
  private subscriptions = new Map<string, Subscription>();
  
  // 定時器
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;
  
  // 配置
  private readonly HEARTBEAT_INTERVAL = 30000; // 30秒
  private readonly RECONNECT_DELAY = 5000;     // 5秒
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  
  constructor() {
    this.setupIpcListeners();
    this.connect();
  }
  
  ngOnDestroy(): void {
    this.disconnect();
  }
  
  /**
   * 設置 IPC 監聯器
   */
  private setupIpcListeners(): void {
    // 接收實時數據
    this.ipc.on('realtime:data', (payload: { type: SubscriptionType; data: any }) => {
      this.handleRealtimeData(payload.type, payload.data);
    });
    
    // 連接狀態變化
    this.ipc.on('realtime:state', (state: RealtimeConnectionState) => {
      this._state.set(state);
      
      if (state === 'connected') {
        this._reconnectAttempts.set(0);
        this.startHeartbeat();
        this.resubscribeAll();
      } else if (state === 'disconnected') {
        this.stopHeartbeat();
        this.scheduleReconnect();
      }
    });
    
    // 心跳響應
    this.ipc.on('realtime:heartbeat', () => {
      this._lastHeartbeat.set(new Date());
    });
    
    // 錯誤處理
    this.ipc.on('realtime:error', (error: { code: string; message: string }) => {
      console.error('Realtime error:', error);
      if (error.code === 'AUTH_FAILED') {
        this.toast.error('實時連接認證失敗');
      }
    });
  }
  
  /**
   * 連接
   */
  connect(): void {
    if (this._state() === 'connecting' || this._state() === 'connected') {
      return;
    }
    
    this._state.set('connecting');
    this.ipc.send('realtime:connect', {});
  }
  
  /**
   * 斷開連接
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimeout();
    this.ipc.send('realtime:disconnect', {});
    this._state.set('disconnected');
  }
  
  /**
   * 訂閱數據
   */
  subscribe<T>(
    type: SubscriptionType,
    callback: SubscriptionCallback<T>,
    options?: SubscriptionOptions
  ): string {
    const id = `sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: Subscription = {
      id,
      type,
      callback: callback as SubscriptionCallback,
      options
    };
    
    this.subscriptions.set(id, subscription);
    
    // 如果已連接，立即發送訂閱請求
    if (this.isConnected()) {
      this.sendSubscription(subscription);
    }
    
    return id;
  }
  
  /**
   * 取消訂閱
   */
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;
    
    this.subscriptions.delete(subscriptionId);
    
    if (this.isConnected()) {
      this.ipc.send('realtime:unsubscribe', { 
        id: subscriptionId,
        type: subscription.type 
      });
    }
  }
  
  /**
   * 取消所有訂閱
   */
  unsubscribeAll(): void {
    for (const id of this.subscriptions.keys()) {
      this.unsubscribe(id);
    }
  }
  
  /**
   * 發送訂閱請求
   */
  private sendSubscription(subscription: Subscription): void {
    this.ipc.send('realtime:subscribe', {
      id: subscription.id,
      type: subscription.type,
      filter: subscription.options?.filter
    });
  }
  
  /**
   * 重新訂閱所有
   */
  private resubscribeAll(): void {
    for (const subscription of this.subscriptions.values()) {
      this.sendSubscription(subscription);
    }
  }
  
  /**
   * 處理實時數據
   */
  private handleRealtimeData(type: SubscriptionType, data: any): void {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === type) {
        // 應用過濾器
        if (subscription.options?.filter) {
          const filter = subscription.options.filter;
          let matches = true;
          
          for (const [key, value] of Object.entries(filter)) {
            if (data[key] !== value) {
              matches = false;
              break;
            }
          }
          
          if (!matches) continue;
        }
        
        // 調用回調
        try {
          subscription.callback(data);
        } catch (error) {
          console.error('Subscription callback error:', error);
        }
      }
    }
  }
  
  /**
   * 開始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.ipc.send('realtime:heartbeat', {});
      }
    }, this.HEARTBEAT_INTERVAL);
  }
  
  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
  
  /**
   * 安排重連
   */
  private scheduleReconnect(): void {
    if (this._reconnectAttempts() >= this.MAX_RECONNECT_ATTEMPTS) {
      this.toast.error('無法建立實時連接，請檢查網絡');
      return;
    }
    
    this.clearReconnectTimeout();
    
    const delay = this.RECONNECT_DELAY * Math.pow(1.5, this._reconnectAttempts());
    
    this.reconnectTimeout = setTimeout(() => {
      this._reconnectAttempts.update(n => n + 1);
      this._state.set('reconnecting');
      this.connect();
    }, delay);
  }
  
  /**
   * 清除重連定時器
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
  }
  
  // ============ 便捷訂閱方法 ============
  
  /**
   * 訂閱任務狀態
   */
  subscribeTaskStatus(taskId: string, callback: SubscriptionCallback): string {
    return this.subscribe('task:status', callback, { filter: { taskId } });
  }
  
  /**
   * 訂閱任務統計
   */
  subscribeTaskStats(taskId: string, callback: SubscriptionCallback): string {
    return this.subscribe('task:stats', callback, { filter: { taskId } });
  }
  
  /**
   * 訂閱任務日誌
   */
  subscribeTaskLogs(taskId: string, callback: SubscriptionCallback): string {
    return this.subscribe('task:log', callback, { filter: { taskId } });
  }
  
  /**
   * 訂閱所有任務日誌
   */
  subscribeAllTaskLogs(callback: SubscriptionCallback): string {
    return this.subscribe('task:log', callback);
  }
  
  /**
   * 訂閱新消息
   */
  subscribeNewMessages(callback: SubscriptionCallback): string {
    return this.subscribe('message:new', callback);
  }
  
  /**
   * 訂閱系統狀態
   */
  subscribeSystemStatus(callback: SubscriptionCallback): string {
    return this.subscribe('system:status', callback);
  }
}
