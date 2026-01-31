/**
 * 實時通知服務
 * 
 * 優化設計：
 * 1. 自動重連機制
 * 2. 心跳保活
 * 3. 事件訂閱
 * 4. 離線消息隊列
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
}

export type EventHandler = (event: RealtimeEvent) => void;

@Injectable({
  providedIn: 'root'
})
export class RealtimeService implements OnDestroy {
  private authService = inject(AuthService);
  
  // WebSocket
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  
  // 配置
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 秒
  private readonly RECONNECT_DELAY = 3000; // 3 秒
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  
  // 狀態
  private _isConnected = signal(false);
  private _reconnectAttempts = signal(0);
  private _connectionId = signal('');
  
  // 公開狀態
  readonly isConnected = computed(() => this._isConnected());
  readonly connectionId = computed(() => this._connectionId());
  
  // 事件處理器
  private handlers: Map<string, Set<EventHandler>> = new Map();
  
  // 離線消息隊列
  private offlineQueue: { channel: string; action: 'subscribe' | 'unsubscribe' }[] = [];
  
  // 訂閱的頻道
  private subscriptions: Set<string> = new Set();
  
  constructor() {
    // 監聽認證狀態變化
    if (environment.apiMode === 'http') {
      this.initConnectionWatcher();
    }
  }
  
  ngOnDestroy() {
    this.disconnect();
  }
  
  /**
   * 初始化連接監視
   */
  private initConnectionWatcher() {
    // 當用戶登入時連接
    const checkAuth = () => {
      if (this.authService.isAuthenticated() && !this._isConnected()) {
        this.connect();
      } else if (!this.authService.isAuthenticated() && this._isConnected()) {
        this.disconnect();
      }
    };
    
    // 定期檢查
    setInterval(checkAuth, 5000);
    
    // 初始檢查
    setTimeout(checkAuth, 1000);
  }
  
  /**
   * 建立連接
   */
  connect(): void {
    if (environment.apiMode === 'ipc') {
      // Electron 模式不使用 WebSocket
      return;
    }
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      const wsUrl = this.getWebSocketUrl();
      const token = this.authService.accessToken();
      
      if (!token) {
        console.warn('No access token, skipping WebSocket connection');
        return;
      }
      
      this.ws = new WebSocket(`${wsUrl}?token=${token}`);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this._isConnected.set(true);
        this._reconnectAttempts.set(0);
        
        // 開始心跳
        this.startHeartbeat();
        
        // 處理離線隊列
        this.processOfflineQueue();
        
        // 重新訂閱頻道
        this.resubscribe();
      };
      
      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
      
      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this._isConnected.set(false);
        this.stopHeartbeat();
        
        // 自動重連
        if (this._reconnectAttempts() < this.MAX_RECONNECT_ATTEMPTS) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
    } catch (e) {
      console.error('WebSocket connection error:', e);
    }
  }
  
  /**
   * 斷開連接
   */
  disconnect(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this._isConnected.set(false);
  }
  
  /**
   * 發送消息
   */
  send(type: string, data: any = {}): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    try {
      this.ws.send(JSON.stringify({ type, data }));
      return true;
    } catch (e) {
      console.error('Send error:', e);
      return false;
    }
  }
  
  /**
   * 訂閱頻道
   */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    
    if (this._isConnected()) {
      this.send('subscribe', { channel });
    } else {
      this.offlineQueue.push({ channel, action: 'subscribe' });
    }
  }
  
  /**
   * 取消訂閱
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    
    if (this._isConnected()) {
      this.send('unsubscribe', { channel });
    } else {
      this.offlineQueue.push({ channel, action: 'unsubscribe' });
    }
  }
  
  /**
   * 監聽事件
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    
    // 返回取消訂閱函數
    return () => {
      this.off(eventType, handler);
    };
  }
  
  /**
   * 移除監聯
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }
  
  /**
   * 一次性監聽
   */
  once(eventType: string, handler: EventHandler): () => void {
    const wrapper: EventHandler = (event) => {
      handler(event);
      this.off(eventType, wrapper);
    };
    return this.on(eventType, wrapper);
  }
  
  // ==================== 私有方法 ====================
  
  private handleMessage(data: string) {
    try {
      const event: RealtimeEvent = JSON.parse(data);
      
      // 處理系統消息
      if (event.type === 'connected') {
        this._connectionId.set(event.data?.connection_id || '');
        return;
      }
      
      if (event.type === 'pong') {
        // 心跳響應
        return;
      }
      
      if (event.type === 'ping') {
        this.send('pong');
        return;
      }
      
      // 調用處理器
      const handlers = this.handlers.get(event.type);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(event);
          } catch (e) {
            console.error('Event handler error:', e);
          }
        });
      }
      
      // 通配符處理器
      const wildcardHandlers = this.handlers.get('*');
      if (wildcardHandlers) {
        wildcardHandlers.forEach(handler => {
          try {
            handler(event);
          } catch (e) {
            console.error('Wildcard handler error:', e);
          }
        });
      }
      
    } catch (e) {
      console.error('Parse message error:', e);
    }
  }
  
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send('ping');
    }, this.HEARTBEAT_INTERVAL);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  
  private scheduleReconnect() {
    this.clearReconnectTimer();
    
    const attempts = this._reconnectAttempts();
    const delay = this.RECONNECT_DELAY * Math.pow(1.5, attempts); // 指數退避
    
    console.log(`Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
    
    this.reconnectTimer = setTimeout(() => {
      this._reconnectAttempts.update(a => a + 1);
      this.connect();
    }, delay);
  }
  
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  private processOfflineQueue() {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift()!;
      this.send(item.action, { channel: item.channel });
    }
  }
  
  private resubscribe() {
    for (const channel of this.subscriptions) {
      this.send('subscribe', { channel });
    }
  }
  
  private getWebSocketUrl(): string {
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'ws://localhost:8000/ws';
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
}
