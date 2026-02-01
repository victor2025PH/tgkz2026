import { Injectable, NgZone, OnDestroy } from '@angular/core';

// Define a minimal interface for the Electron IpcRenderer to satisfy TypeScript.
interface IpcRenderer {
  send: (channel: string, ...args: any[]) => void;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  removeAllListeners: (channel: string) => void;
  removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
}

// 監聽器信息
interface ListenerInfo {
  channel: string;
  originalListener: (...args: any[]) => void;
  wrappedListener: (event: any, ...args: any[]) => void;
}

// 取消訂閱函數類型
export type Unsubscribe = () => void;

@Injectable({
  providedIn: 'root'
})
export class ElectronIpcService implements OnDestroy {
  private ipcRenderer?: IpcRenderer;
  
  // 追蹤所有監聽器
  private listeners: ListenerInfo[] = [];
  
  // 頻道到監聽器的映射
  private channelListeners = new Map<string, ListenerInfo[]>();
  
  // 🆕 Web 模式：WebSocket 連接
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private wsConnected = false;
  private webListeners = new Map<string, Set<(...args: any[]) => void>>();
  
  // 🆕 Web 模式：API 基礎 URL
  private apiBaseUrl: string = '';
  
  // 🆕 是否為 Web 模式
  private isWebMode: boolean = false;

  constructor(private ngZone: NgZone) {
    // Check if the app is running in Electron by looking for the 'require' function.
    if ((window as any).require) {
      try {
        const electron = (window as any).require('electron');
        if (electron && electron.ipcRenderer) {
          this.ipcRenderer = electron.ipcRenderer;
          console.log('Electron IPC renderer successfully loaded.');
        } else {
          console.warn('Electron IPC renderer not found, running in browser mode.');
          this.initWebMode();
        }
      } catch (e) {
        console.error('Could not load Electron IPC renderer:', e);
        this.initWebMode();
      }
    } else {
      console.warn('Electron IPC not available, running in browser mode.');
      this.initWebMode();
    }
  }
  
  /**
   * 🆕 初始化 Web 模式（HTTP + WebSocket）
   */
  private initWebMode(): void {
    this.isWebMode = true;
    
    // 設置 API 基礎 URL
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      this.apiBaseUrl = 'http://localhost:8000';
    } else {
      this.apiBaseUrl = `${window.location.protocol}//${window.location.host}`;
    }
    
    console.log(`[Web Mode] API URL: ${this.apiBaseUrl}`);
    
    // 連接 WebSocket
    this.connectWebSocket();
  }
  
  /**
   * 🆕 連接 WebSocket（用於接收事件）
   */
  private connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;
    
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      wsUrl = 'ws://localhost:8000/ws';
    } else {
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }
    
    console.log(`[Web Mode] Connecting WebSocket: ${wsUrl}`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[Web Mode] WebSocket connected');
        this.wsConnected = true;
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const eventName = message.event || message.type;
          const payload = message.data || message.payload || message;
          
          // 觸發監聽器
          const listeners = this.webListeners.get(eventName);
          if (listeners) {
            this.ngZone.run(() => {
              listeners.forEach(listener => {
                try {
                  listener(payload);
                } catch (e) {
                  console.error(`[Web Mode] Listener error for ${eventName}:`, e);
                }
              });
            });
          }
        } catch (e) {
          console.error('[Web Mode] WebSocket message parse error:', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[Web Mode] WebSocket disconnected');
        this.wsConnected = false;
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Web Mode] WebSocket error:', error);
      };
    } catch (e) {
      console.error('[Web Mode] WebSocket connection failed:', e);
      this.scheduleReconnect();
    }
  }
  
  /**
   * 🆕 計劃重新連接
   */
  private scheduleReconnect(): void {
    if (this.wsReconnectTimer) return;
    
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      console.log('[Web Mode] Attempting WebSocket reconnection...');
      this.connectWebSocket();
    }, 5000);
  }
  
  ngOnDestroy(): void {
    // 清理所有監聽器
    this.cleanupAll();
    
    // 🆕 關閉 WebSocket
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
    }
  }

  /**
   * Sends a message to the Electron main process over a specified channel.
   * @param channel The channel to send the message on.
   * @param args The data to send.
   */
  send(channel: string, ...args: any[]): void {
    if (this.ipcRenderer) {
      // Electron 模式
      console.log(`[IPC Service] → Sending '${channel}':`, args);
      this.ipcRenderer.send(channel, ...args);
    } else if (this.isWebMode) {
      // 🆕 Web 模式：使用 HTTP API
      console.log(`[Web Mode] → Sending '${channel}':`, args);
      this.httpSend(channel, args[0] || {});
    } else {
      console.log(`[Browser Mode] IPC Send to '${channel}':`, ...args);
    }
  }
  
  // 🆕 P0 優化：追蹤 HTTP 連接狀態
  private httpConnected = false;
  
  /**
   * 🆕 Web 模式：通過 HTTP 發送命令
   * P0 優化：任何成功的 HTTP 響應都確認連接
   */
  private async httpSend(command: string, payload: any): Promise<void> {
    try {
      const url = `${this.apiBaseUrl}/api/command`;
      console.log(`[Web Mode] HTTP POST to ${url}`, { command, payload });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, payload })
      });
      
      if (!response.ok) {
        console.error(`[Web Mode] HTTP error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`[Web Mode] Error body:`, errorText);
        
        // 🆕 P0: 觸發連接錯誤事件
        this.triggerEvent('connection-error', {
          error: `HTTP 錯誤: ${response.status}`,
          message: errorText
        });
        return;
      }
      
      const result = await response.json();
      console.log(`[Web Mode] Response for '${command}':`, result);
      
      // 🆕 P0 優化：首次成功響應 → 確認連接
      if (!this.httpConnected) {
        this.httpConnected = true;
        console.log('[Web Mode] ✅ HTTP connection confirmed');
        this.triggerEvent('connection-confirmed', { 
          mode: 'http',
          timestamp: Date.now()
        });
      }
      
      // 如果響應中有事件，手動觸發對應的監聯器
      if (result.event) {
        const listeners = this.webListeners.get(result.event);
        if (listeners) {
          this.ngZone.run(() => {
            listeners.forEach(listener => listener(result.data || result));
          });
        }
      }
      
      // 處理常見的響應事件映射
      this.handleResponseEvents(command, result);
      
    } catch (error: any) {
      console.error(`[Web Mode] HTTP send error for '${command}':`, error);
      
      // 🆕 P0: 觸發連接錯誤事件（僅在未連接時）
      if (!this.httpConnected) {
        this.triggerEvent('connection-error', {
          error: error.message || '網絡連接錯誤',
          message: '無法連接到服務器，請檢查網絡連接'
        });
      }
    }
  }
  
  /**
   * 🆕 處理 HTTP 響應並觸發對應的事件
   */
  private handleResponseEvents(command: string, result: any): void {
    // 根據命令和響應結果，觸發對應的事件
    if (command === 'login-account' || command === 'add-account') {
      if (result.success && result.requires_code) {
        // 需要驗證碼
        this.triggerEvent('login-requires-code', {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          phoneCodeHash: result.phone_code_hash || result.phoneCodeHash,
          sendType: result.send_type || result.sendType || 'app',
          message: result.message
        });
      } else if (result.success && result.requires_2fa) {
        // 需要 2FA
        this.triggerEvent('login-requires-2fa', {
          accountId: result.account_id || result.accountId,
          phone: result.phone
        });
      } else if (result.success && result.status === 'Online') {
        // 登入成功
        this.triggerEvent('login-success', {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          userInfo: result.user_info || result.userInfo
        });
      } else if (!result.success) {
        // 登入失敗
        this.triggerEvent('login-error', {
          error: result.error || result.message,
          phone: result.phone,
          codeExpired: result.code_expired || result.codeExpired
        });
      }
    }
    
    // 帳號更新事件
    if (result.accounts) {
      this.triggerEvent('accounts-updated', result.accounts);
    }
    
    // 🆕 API 憑據相關命令
    if (command === 'get-api-credentials') {
      // 無論成功與否，都觸發事件以結束 loading 狀態
      this.triggerEvent('api-credentials-updated', {
        credentials: result.credentials || result.data || []
      });
    }
    
    if (command === 'add-api-credential') {
      this.triggerEvent('api-credential-added', {
        success: result.success !== false,
        credential: result.credential || result.data,
        error: result.error
      });
    }
    
    // 🆕 初始狀態命令 - 觸發 initial-state 事件來確認連接
    if (command === 'get-initial-state') {
      this.triggerEvent('initial-state', result);
    }
    
    // 🆕 監控狀態命令
    if (command === 'get-monitoring-status') {
      this.triggerEvent('monitoring-status', result);
    }
    
    // 🆕 系統狀態命令
    if (command === 'get-system-status') {
      this.triggerEvent('system-status', result);
    }
  }
  
  /**
   * 🆕 手動觸發事件
   */
  private triggerEvent(eventName: string, payload: any): void {
    const listeners = this.webListeners.get(eventName);
    if (listeners && listeners.size > 0) {
      console.log(`[Web Mode] Triggering event '${eventName}':`, payload);
      this.ngZone.run(() => {
        listeners.forEach(listener => {
          try {
            listener(payload);
          } catch (e) {
            console.error(`[Web Mode] Listener error for ${eventName}:`, e);
          }
        });
      });
    }
  }

  /**
   * Listens for messages from the Electron main process on a specified channel.
   * Returns an unsubscribe function to remove the listener.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  on(channel: string, listener: (...args: any[]) => void): Unsubscribe {
    if (this.isWebMode) {
      // 🆕 Web 模式：添加到 WebSocket 監聽器
      if (!this.webListeners.has(channel)) {
        this.webListeners.set(channel, new Set());
      }
      this.webListeners.get(channel)!.add(listener);
      
      console.log(`[Web Mode] Added listener for '${channel}'`);
      
      return () => {
        const listeners = this.webListeners.get(channel);
        if (listeners) {
          listeners.delete(listener);
          console.log(`[Web Mode] Removed listener for '${channel}'`);
        }
      };
    }
    
    if (!this.ipcRenderer) {
      // 瀏覽器模式返回空的取消訂閱函數
      return () => {};
    }
    
    // 包裝監聽器以在 Angular Zone 中運行
    const wrappedListener = (event: any, ...args: any[]) => {
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    
    // 記錄監聽器信息
    const listenerInfo: ListenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    
    this.listeners.push(listenerInfo);
    
    // 更新頻道映射
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    
    // 添加監聽器
    this.ipcRenderer.on(channel, wrappedListener);
    
    // 返回取消訂閱函數
    return () => {
      this.removeListener(channel, listener);
    };
  }
  
  /**
   * Listens for a single message from the Electron main process on a specified channel.
   * Automatically removes the listener after first invocation.
   * @param channel The channel to listen on.
   * @param listener The function to execute when a message is received.
   * @returns Unsubscribe function
   */
  once(channel: string, listener: (...args: any[]) => void): Unsubscribe {
    if (this.isWebMode) {
      // 🆕 Web 模式：一次性監聽
      const onceListener = (...args: any[]) => {
        this.webListeners.get(channel)?.delete(onceListener);
        listener(...args);
      };
      
      if (!this.webListeners.has(channel)) {
        this.webListeners.set(channel, new Set());
      }
      this.webListeners.get(channel)!.add(onceListener);
      
      return () => {
        this.webListeners.get(channel)?.delete(onceListener);
      };
    }
    
    if (!this.ipcRenderer) {
      return () => {};
    }
    
    let fired = false;
    
    const wrappedListener = (event: any, ...args: any[]) => {
      if (fired) return;
      fired = true;
      
      // 自動移除監聽器
      this.removeListenerByWrapped(channel, wrappedListener);
      
      this.ngZone.run(() => {
        listener(...args);
      });
    };
    
    // 記錄監聽器信息
    const listenerInfo: ListenerInfo = {
      channel,
      originalListener: listener,
      wrappedListener
    };
    
    this.listeners.push(listenerInfo);
    
    const channelList = this.channelListeners.get(channel) || [];
    channelList.push(listenerInfo);
    this.channelListeners.set(channel, channelList);
    
    this.ipcRenderer.on(channel, wrappedListener);
    
    return () => {
      if (!fired) {
        this.removeListenerByWrapped(channel, wrappedListener);
      }
    };
  }

  /**
   * Invokes a method on the Electron main process and returns a promise.
   * @param channel The channel to invoke on.
   * @param args The data to send.
   */
  invoke(channel: string, ...args: any[]): Promise<any> {
    if (this.isWebMode) {
      // 🆕 Web 模式：使用 HTTP
      return this.httpInvoke(channel, args[0] || {});
    }
    
    if (!this.ipcRenderer) {
      console.log(`[Browser Mode] IPC Invoke to '${channel}':`, ...args);
      return Promise.resolve(null);
    }
    return this.ipcRenderer.invoke(channel, ...args);
  }
  
  /**
   * 🆕 Web 模式：HTTP invoke
   */
  private async httpInvoke(command: string, payload: any): Promise<any> {
    try {
      const url = `${this.apiBaseUrl}/api/command`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, payload })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`[Web Mode] HTTP invoke error for '${command}':`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 移除特定監聽器
   */
  removeListener(channel: string, listener: (...args: any[]) => void): void {
    if (this.isWebMode) {
      this.webListeners.get(channel)?.delete(listener);
      return;
    }
    
    if (!this.ipcRenderer) return;
    
    const channelList = this.channelListeners.get(channel);
    if (!channelList) return;
    
    const index = channelList.findIndex(info => info.originalListener === listener);
    if (index !== -1) {
      const info = channelList[index];
      this.ipcRenderer.removeListener(channel, info.wrappedListener);
      channelList.splice(index, 1);
      
      // 從全局列表移除
      const globalIndex = this.listeners.findIndex(l => l === info);
      if (globalIndex !== -1) {
        this.listeners.splice(globalIndex, 1);
      }
    }
  }
  
  /**
   * 通過包裝後的監聽器移除
   */
  private removeListenerByWrapped(channel: string, wrappedListener: (event: any, ...args: any[]) => void): void {
    if (!this.ipcRenderer) return;
    
    this.ipcRenderer.removeListener(channel, wrappedListener);
    
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      const index = channelList.findIndex(info => info.wrappedListener === wrappedListener);
      if (index !== -1) {
        const info = channelList[index];
        channelList.splice(index, 1);
        
        const globalIndex = this.listeners.findIndex(l => l === info);
        if (globalIndex !== -1) {
          this.listeners.splice(globalIndex, 1);
        }
      }
    }
  }

  /**
   * Removes all listeners from a specified channel to prevent memory leaks.
   * @param channel The channel to clean up listeners for.
   */
  cleanup(channel: string): void {
    if (this.isWebMode) {
      this.webListeners.delete(channel);
      return;
    }
    
    if (!this.ipcRenderer) return;
    
    this.ipcRenderer.removeAllListeners(channel);
    
    // 清理追蹤列表
    const channelList = this.channelListeners.get(channel);
    if (channelList) {
      channelList.forEach(info => {
        const index = this.listeners.findIndex(l => l === info);
        if (index !== -1) {
          this.listeners.splice(index, 1);
        }
      });
      this.channelListeners.delete(channel);
    }
  }
  
  /**
   * 清理所有監聽器
   */
  cleanupAll(): void {
    if (this.isWebMode) {
      this.webListeners.clear();
      return;
    }
    
    if (!this.ipcRenderer) return;
    
    // 移除所有追蹤的監聽器
    const channels = new Set(this.listeners.map(l => l.channel));
    channels.forEach(channel => {
      this.ipcRenderer!.removeAllListeners(channel);
    });
    
    this.listeners = [];
    this.channelListeners.clear();
    
    console.log('[IPC] All listeners cleaned up');
  }

  /**
   * Alias for cleanup - removes all listeners from a channel.
   * @param channel The channel to clean up listeners for.
   * @param _listener Ignored - provided for API compatibility
   */
  off(channel: string, _listener?: (...args: any[]) => void): void {
    this.cleanup(channel);
  }
  
  /**
   * 獲取當前監聽器數量（用於調試）
   */
  getListenerCount(channel?: string): number {
    if (this.isWebMode) {
      if (channel) {
        return this.webListeners.get(channel)?.size || 0;
      }
      let total = 0;
      this.webListeners.forEach(set => total += set.size);
      return total;
    }
    
    if (channel) {
      return this.channelListeners.get(channel)?.length || 0;
    }
    return this.listeners.length;
  }
  
  /**
   * 獲取所有活躍的頻道
   */
  getActiveChannels(): string[] {
    if (this.isWebMode) {
      return Array.from(this.webListeners.keys());
    }
    return Array.from(this.channelListeners.keys());
  }

  /**
   * 選擇文件附件（使用原生文件對話框）
   * 返回文件路徑而非 base64，支持大文件上傳
   * @param type 'image' 或 'file'
   * @param multiple 是否允許多選
   */
  async selectFileForAttachment(type: 'image' | 'file', multiple: boolean = false): Promise<{
    success: boolean;
    canceled?: boolean;
    filePath?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: 'image' | 'file';
    files?: Array<{
      filePath: string;
      fileName: string;
      fileSize: number;
      fileType: 'image' | 'file';
    }>;
  }> {
    if (this.isWebMode) {
      console.warn('[Web Mode] selectFileForAttachment - using browser file picker');
      // 在 Web 模式下，返回空結果（需要使用 HTML input file）
      return { success: false, canceled: true };
    }
    
    if (!this.ipcRenderer) {
      console.warn('[Browser Mode] selectFileForAttachment not available');
      return { success: false, canceled: true };
    }
    return this.invoke('select-file-for-attachment', { type, multiple });
  }
}
