import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { getCommandConfig, buildEndpointUrl, CommandConfig } from './services/api-command-registry';

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
  
  // 🆕 P1 優化：智能連接管理
  private wsReconnectAttempts = 0;
  private readonly WS_MAX_RECONNECT_ATTEMPTS = 3;
  private readonly WS_RECONNECT_DELAYS = [5000, 10000, 20000, 40000, 60000]; // 指數退避
  private isDegradedMode = false; // 降級模式（WebSocket 失敗，使用 HTTP 輪詢）
  private pollingInterval: any = null;
  private readonly POLLING_INTERVAL_MS = 30000; // 30 秒輪詢

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
  
  // 🆕 心跳機制
  private wsHeartbeatTimer: any = null;
  private readonly WS_HEARTBEAT_INTERVAL = 30000; // 30 秒
  private wsLastPong: number = 0;
  private readonly WS_PONG_TIMEOUT = 10000; // 10 秒無響應視為斷開
  
  /**
   * 🆕 P1 優化：智能 WebSocket 連接
   * - 指數退避重連
   * - 心跳機制保活
   * - 超過最大重試次數後降級到 HTTP 輪詢
   */
  private connectWebSocket(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;
    
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      wsUrl = 'ws://localhost:8000/ws';
    } else {
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }
    
    console.log(`[Web Mode] Connecting WebSocket: ${wsUrl} (attempt ${this.wsReconnectAttempts + 1})`);
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[Web Mode] ✅ WebSocket connected');
        this.wsConnected = true;
        this.wsReconnectAttempts = 0;
        this.wsLastPong = Date.now();
        
        // 🆕 啟動心跳
        this.startHeartbeat();
        
        // 從降級模式恢復
        if (this.isDegradedMode) {
          console.log('[Web Mode] 🔄 Recovered from degraded mode');
          this.isDegradedMode = false;
          this.stopPolling();
          this.triggerEvent('connection-mode-changed', { mode: 'websocket' });
        }
        
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
        
        // 觸發連接成功事件
        this.triggerEvent('websocket-connected', { timestamp: Date.now() });
      };
      
      this.ws.onmessage = (event) => {
        try {
          // 更新最後收到消息的時間
          this.wsLastPong = Date.now();
          
          const message = JSON.parse(event.data);
          
          // 處理心跳響應
          if (message.type === 'pong' || message.event === 'pong') {
            return;
          }
          
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
      
      this.ws.onclose = (event) => {
        console.log(`[Web Mode] WebSocket disconnected (code: ${event.code}, reason: ${event.reason})`);
        this.wsConnected = false;
        this.stopHeartbeat();
        this.triggerEvent('websocket-disconnected', { code: event.code, reason: event.reason });
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[Web Mode] WebSocket error:', error);
        this.wsReconnectAttempts++;
      };
    } catch (e) {
      console.error('[Web Mode] WebSocket connection failed:', e);
      this.wsReconnectAttempts++;
      this.scheduleReconnect();
    }
  }
  
  /**
   * 🆕 啟動心跳機制
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.wsHeartbeatTimer = setInterval(() => {
      if (this.ws && this.wsConnected) {
        // 檢查是否超時
        const timeSinceLastPong = Date.now() - this.wsLastPong;
        if (timeSinceLastPong > this.WS_HEARTBEAT_INTERVAL + this.WS_PONG_TIMEOUT) {
          console.warn('[Web Mode] WebSocket heartbeat timeout, reconnecting...');
          this.ws.close();
          return;
        }
        
        // 發送心跳
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
        } catch (e) {
          console.error('[Web Mode] Failed to send heartbeat:', e);
        }
      }
    }, this.WS_HEARTBEAT_INTERVAL);
  }
  
  /**
   * 🆕 停止心跳機制
   */
  private stopHeartbeat(): void {
    if (this.wsHeartbeatTimer) {
      clearInterval(this.wsHeartbeatTimer);
      this.wsHeartbeatTimer = null;
    }
  }
  
  /**
   * 🆕 P1 優化：智能重連（指數退避 + 降級模式）
   */
  private scheduleReconnect(): void {
    if (this.wsReconnectTimer) return;
    
    // 檢查是否超過最大重試次數
    if (this.wsReconnectAttempts >= this.WS_MAX_RECONNECT_ATTEMPTS) {
      if (!this.isDegradedMode) {
        console.log('[Web Mode] ⚠️ WebSocket failed, switching to HTTP polling mode');
        this.isDegradedMode = true;
        this.startPolling();
        this.triggerEvent('connection-mode-changed', { mode: 'polling' });
      }
      
      // 繼續嘗試重連，但間隔更長（每 60 秒）
      this.wsReconnectTimer = setTimeout(() => {
        this.wsReconnectTimer = null;
        console.log('[Web Mode] Background WebSocket reconnection attempt...');
        this.connectWebSocket();
      }, 60000);
      return;
    }
    
    // 指數退避延遲
    const delay = this.WS_RECONNECT_DELAYS[Math.min(this.wsReconnectAttempts, this.WS_RECONNECT_DELAYS.length - 1)];
    console.log(`[Web Mode] Reconnecting in ${delay / 1000}s...`);
    
    this.wsReconnectTimer = setTimeout(() => {
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, delay);
  }
  
  /**
   * 🆕 P1: 啟動 HTTP 輪詢模式
   */
  private startPolling(): void {
    if (this.pollingInterval) return;
    
    console.log('[Web Mode] Starting HTTP polling mode');
    this.pollingInterval = setInterval(() => {
      if (this.httpConnected) {
        // 輪詢獲取系統狀態
        this.httpSend('get-system-status', {});
      }
    }, this.POLLING_INTERVAL_MS);
  }
  
  /**
   * 🆕 P1: 停止 HTTP 輪詢
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      console.log('[Web Mode] Stopping HTTP polling mode');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  /**
   * 🆕 P1: 獲取當前連接模式
   */
  getConnectionMode(): 'websocket' | 'polling' | 'disconnected' {
    if (this.wsConnected) return 'websocket';
    if (this.isDegradedMode && this.httpConnected) return 'polling';
    return 'disconnected';
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
  
  // 🆕 認證 Token（SaaS 模式）
  private authToken: string | null = null;
  
  /**
   * 設置認證 Token（供 AuthService 調用）
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }
  
  /**
   * 🆕 Web 模式：通過 HTTP 發送命令
   * 使用命令註冊表驅動，支持 RESTful 和通用命令端點
   */
  private async httpSend(command: string, payload: any): Promise<void> {
    try {
      // 獲取命令配置
      const config = getCommandConfig(command);
      
      let url: string;
      let method: string;
      let body: any;
      
      if (config && !config.useCommandEndpoint) {
        // 使用 RESTful 端點
        const endpoint = buildEndpointUrl(config, payload);
        url = `${this.apiBaseUrl}${endpoint}`;
        method = config.httpMethod;
        
        // GET 請求不需要 body
        if (method === 'GET') {
          body = undefined;
        } else {
          body = JSON.stringify(payload);
        }
      } else {
        // 使用通用命令端點
        url = `${this.apiBaseUrl}/api/command`;
        method = 'POST';
        body = JSON.stringify({ command, payload });
      }
      
      console.log(`[Web Mode] ${method} ${url}`, config ? '(registry)' : '(fallback)', { command, payload });
      
      // 構建請求頭
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // 添加認證頭（SaaS 模式）- 動態從 localStorage 讀取
      const token = this.authToken || localStorage.getItem('tgm_access_token');
      console.log(`[Web Mode] Token check for ${command}:`, {
        hasAuthToken: !!this.authToken,
        hasLocalStorageToken: !!localStorage.getItem('tgm_access_token'),
        tokenPrefix: token ? token.substring(0, 30) + '...' : 'NONE'
      });
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn(`[Web Mode] ⚠️ No token available for ${command}`);
      }
      
      const fetchOptions: RequestInit = {
        method,
        headers,
      };
      
      if (body) {
        fetchOptions.body = body;
      }
      
      const response = await fetch(url, fetchOptions);
      
      if (!response.ok) {
        console.error(`[Web Mode] HTTP error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`[Web Mode] Error body:`, errorText);
        
        // 處理認證錯誤
        if (response.status === 401) {
          this.triggerEvent('auth-error', {
            error: '認證失敗',
            message: '請重新登入'
          });
          return;
        }
        
        // 觸發連接錯誤事件
        this.triggerEvent('connection-error', {
          error: `HTTP 錯誤: ${response.status}`,
          message: errorText,
          command
        });
        
        // 觸發命令特定的錯誤事件
        this.handleResponseEvents(command, {
          success: false,
          error: errorText || `HTTP ${response.status}`,
          status: response.status
        });
        return;
      }
      
      const result = await response.json();
      console.log(`[Web Mode] Response for '${command}':`, result);
      
      // 首次成功響應確認連接
      if (!this.httpConnected) {
        this.httpConnected = true;
        console.log('[Web Mode] ✅ HTTP connection confirmed');
        this.triggerEvent('connection-confirmed', { 
          mode: 'http',
          timestamp: Date.now()
        });
      }
      
      // 處理後端返回的事件列表
      if (result.events && Array.isArray(result.events)) {
        for (const event of result.events) {
          this.triggerEvent(event.name || event.type, event.data || event.payload);
        }
      }
      
      // 如果響應中有單個事件
      if (result.event) {
        const listeners = this.webListeners.get(result.event);
        if (listeners) {
          this.ngZone.run(() => {
            listeners.forEach(listener => listener(result.data || result));
          });
        }
      }
      
      // 處理響應事件映射
      this.handleResponseEvents(command, result);
      
    } catch (error: any) {
      console.error(`[Web Mode] HTTP send error for '${command}':`, error);
      
      // 觸發連接錯誤事件
      this.triggerEvent('connection-error', {
        error: error.message || '網絡連接錯誤',
        message: '無法連接到服務器，請檢查網絡連接',
        command
      });
      
      // 觸發命令特定的錯誤事件
      this.handleResponseEvents(command, {
        success: false,
        error: error.message || '網絡錯誤'
      });
    }
  }
  
  /**
   * 🆕 處理 HTTP 響應並觸發對應的事件
   * 完整的命令-事件映射，支持所有 IPC 命令在 SaaS 模式下正常工作
   */
  private handleResponseEvents(command: string, result: any): void {
    // ==================== 帳號相關 ====================
    if (command === 'login-account' || command === 'add-account') {
      if (result.success && result.requires_code) {
        this.triggerEvent('login-requires-code', {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          phoneCodeHash: result.phone_code_hash || result.phoneCodeHash,
          sendType: result.send_type || result.sendType || 'app',
          message: result.message
        });
      } else if (result.success && result.requires_2fa) {
        this.triggerEvent('login-requires-2fa', {
          accountId: result.account_id || result.accountId,
          phone: result.phone
        });
      } else if (result.success && (result.status === 'Online' || result.logged_in)) {
        this.triggerEvent('login-success', {
          accountId: result.account_id || result.accountId,
          phone: result.phone,
          userInfo: result.user_info || result.userInfo
        });
      } else if (!result.success) {
        this.triggerEvent('login-error', {
          accountId: result.account_id || result.accountId,
          error: result.error || result.message,
          phone: result.phone,
          codeExpired: result.code_expired || result.codeExpired
        });
      }
    }
    
    if (command === 'get-accounts') {
      const accounts = result.accounts || result.data || result;
      if (Array.isArray(accounts)) {
        this.triggerEvent('accounts-updated', accounts);
      }
    }
    
    if (command === 'update-account' || command === 'update-account-data') {
      this.triggerEvent('account-updated', {
        success: result.success !== false,
        account: result.account || result.data,
        accountId: result.accountId || result.account_id
      });
    }
    
    if (command === 'delete-account' || command === 'remove-account') {
      this.triggerEvent('account-deleted', {
        success: result.success !== false,
        accountId: result.accountId || result.account_id,
        error: result.error
      });
    }
    
    if (command === 'connect-account') {
      this.triggerEvent('account-connection-status', {
        accountId: result.accountId || result.account_id,
        status: result.status || (result.success ? 'Connecting' : 'Error'),
        error: result.error
      });
    }
    
    if (command === 'disconnect-account') {
      this.triggerEvent('account-disconnected', {
        accountId: result.accountId || result.account_id,
        success: result.success !== false
      });
    }
    
    if (command === 'logout-account') {
      this.triggerEvent('logout-result', {
        success: result.success !== false,
        accountId: result.accountId || result.account_id,
        error: result.error
      });
    }
    
    if (command === 'check-account-status') {
      this.triggerEvent('account-status-checked', {
        accountId: result.accountId || result.account_id,
        status: result.status,
        online: result.online
      });
    }
    
    // 帳號更新事件（通用）
    if (result.accounts && Array.isArray(result.accounts)) {
      this.triggerEvent('accounts-updated', result.accounts);
    }
    
    // ==================== 監控相關 ====================
    if (command === 'start-monitoring') {
      this.triggerEvent('monitoring-started', {
        success: result.success !== false,
        error: result.error
      });
      if (result.success !== false) {
        this.triggerEvent('monitoring-status', { running: true, ...result });
      }
    }
    
    if (command === 'stop-monitoring') {
      this.triggerEvent('monitoring-stopped', {
        success: result.success !== false,
        error: result.error
      });
      if (result.success !== false) {
        this.triggerEvent('monitoring-status', { running: false, ...result });
      }
    }
    
    if (command === 'get-monitoring-status') {
      this.triggerEvent('monitoring-status', result);
    }
    
    if (command === 'one-click-start') {
      this.triggerEvent('one-click-started', result);
    }
    
    if (command === 'one-click-stop') {
      this.triggerEvent('one-click-stopped', result);
    }
    
    // ==================== 群組相關 ====================
    if (command === 'get-monitored-groups') {
      this.triggerEvent('monitored-groups-updated', {
        groups: result.groups || result.data || result
      });
    }
    
    if (command === 'add-group') {
      this.triggerEvent('group-added', {
        success: result.success !== false,
        group: result.group || result.data,
        error: result.error
      });
    }
    
    if (command === 'remove-group') {
      this.triggerEvent('group-removed', {
        success: result.success !== false,
        groupId: result.groupId || result.group_id,
        error: result.error
      });
    }
    
    if (command === 'join-group') {
      this.triggerEvent('group-joined', {
        success: result.success !== false,
        group: result.group,
        error: result.error
      });
    }
    
    if (command === 'leave-group') {
      this.triggerEvent('group-left', {
        success: result.success !== false,
        groupId: result.groupId || result.group_id,
        error: result.error
      });
    }
    
    if (command === 'join-and-monitor-with-account' || command === 'join-and-monitor-resource') {
      this.triggerEvent('join-and-monitor-result', {
        success: result.success !== false,
        group: result.group,
        error: result.error
      });
    }
    
    if (command === 'batch-join-and-monitor' || command === 'batch-join-resources') {
      this.triggerEvent('batch-join-result', {
        success: result.success !== false,
        results: result.results || result.data,
        error: result.error
      });
    }
    
    // ==================== 關鍵詞相關 ====================
    if (command === 'get-keyword-sets') {
      this.triggerEvent('keyword-sets-updated', {
        keywordSets: result.keywordSets || result.data || result
      });
    }
    
    if (command === 'add-keyword-set') {
      this.triggerEvent('keyword-set-added', {
        success: result.success !== false,
        setId: result.setId || result.id,
        keywordSet: result.keywordSet || result.data,
        error: result.error
      });
    }
    
    if (command === 'add-keyword') {
      this.triggerEvent('keyword-added', {
        success: result.success !== false,
        setId: result.setId,
        keyword: result.keyword,
        error: result.error
      });
    }
    
    if (command === 'remove-keyword') {
      this.triggerEvent('keyword-removed', {
        success: result.success !== false,
        setId: result.setId,
        keywordId: result.keywordId,
        error: result.error
      });
    }
    
    // ==================== 消息隊列相關 ====================
    if (command === 'get-queue-status') {
      this.triggerEvent('queue-status', result);
    }
    
    if (command === 'get-queue-messages') {
      this.triggerEvent('queue-messages', {
        messages: result.messages || result.data || result
      });
    }
    
    if (command === 'clear-queue') {
      this.triggerEvent('queue-cleared', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    if (command === 'retry-message') {
      this.triggerEvent('message-retried', {
        success: result.success !== false,
        messageId: result.messageId,
        error: result.error
      });
    }
    
    if (command === 'cancel-message') {
      this.triggerEvent('message-cancelled', {
        success: result.success !== false,
        messageId: result.messageId,
        error: result.error
      });
    }
    
    if (command === 'pause-queue') {
      this.triggerEvent('queue-paused', {
        success: result.success !== false,
        phone: result.phone,
        error: result.error
      });
    }
    
    if (command === 'resume-queue') {
      this.triggerEvent('queue-resumed', {
        success: result.success !== false,
        phone: result.phone,
        error: result.error
      });
    }
    
    if (command === 'send-message' || command === 'send-group-message' || command === 'schedule-message') {
      this.triggerEvent('message-sent', {
        success: result.success !== false,
        messageId: result.messageId || result.message_id,
        error: result.error
      });
    }
    
    // ==================== 線索管理相關 ====================
    if (command === 'get-leads' || command === 'get-leads-paginated') {
      this.triggerEvent('leads-updated', {
        leads: result.leads || result.data || result,
        total: result.total || result.leadsTotal,
        hasMore: result.hasMore || result.leadsHasMore
      });
    }
    
    if (command === 'add-lead') {
      this.triggerEvent('lead-added', {
        success: result.success !== false,
        lead: result.lead || result.data,
        error: result.error
      });
    }
    
    if (command === 'update-lead-status') {
      this.triggerEvent('lead-status-updated', {
        success: result.success !== false,
        leadId: result.leadId,
        newStatus: result.newStatus || result.status,
        error: result.error
      });
    }
    
    if (command === 'delete-lead') {
      this.triggerEvent('lead-deleted', {
        success: result.success !== false,
        leadId: result.leadId,
        error: result.error
      });
    }
    
    if (command === 'batch-delete-leads') {
      this.triggerEvent('leads-batch-deleted', {
        success: result.success !== false,
        count: result.count,
        error: result.error
      });
    }
    
    if (command === 'batch-update-lead-status') {
      this.triggerEvent('leads-status-batch-updated', {
        success: result.success !== false,
        count: result.count,
        error: result.error
      });
    }
    
    if (command === 'search-leads') {
      this.triggerEvent('leads-search-result', {
        leads: result.leads || result.data || result,
        total: result.total
      });
    }
    
    if (command === 'get-all-tags') {
      this.triggerEvent('tags-updated', {
        tags: result.tags || result.data || result
      });
    }
    
    // ==================== 資源發現相關 ====================
    if (command === 'search-resources' || command === 'search-jiso') {
      this.triggerEvent('resources-search-result', {
        resources: result.resources || result.data || result,
        total: result.total,
        source: command === 'search-jiso' ? 'jiso' : 'telegram'
      });
    }
    
    if (command === 'get-resources') {
      this.triggerEvent('resources-updated', {
        resources: result.resources || result.data || result
      });
    }
    
    if (command === 'save-resource') {
      this.triggerEvent('resource-saved', {
        success: result.success !== false,
        resource: result.resource,
        error: result.error
      });
    }
    
    if (command === 'unsave-resource') {
      this.triggerEvent('resource-unsaved', {
        success: result.success !== false,
        resourceId: result.resourceId,
        error: result.error
      });
    }
    
    if (command === 'get-resource-stats') {
      this.triggerEvent('resource-stats', result);
    }
    
    if (command === 'clear-all-resources' || command === 'clear-resources') {
      this.triggerEvent('resources-cleared', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    // ==================== 成員提取相關 ====================
    if (command === 'extract-members' || command === 'batch-extract-members') {
      this.triggerEvent('members-extracted', {
        success: result.success !== false,
        members: result.members || result.data,
        count: result.count,
        error: result.error
      });
    }
    
    // ==================== AI 相關 ====================
    if (command === 'generate-ai-response') {
      this.triggerEvent('ai-response-generated', {
        success: result.success !== false,
        response: result.response || result.message,
        error: result.error
      });
    }
    
    if (command === 'test-ai-connection') {
      this.triggerEvent('ai-connection-tested', {
        success: result.success !== false,
        provider: result.provider,
        error: result.error
      });
    }
    
    if (command === 'get-ollama-models') {
      this.triggerEvent('ollama-models', {
        models: result.models || result.data || result
      });
    }
    
    if (command === 'search-rag') {
      this.triggerEvent('rag-search-result', {
        results: result.results || result.data || result
      });
    }
    
    if (command === 'get-rag-stats') {
      this.triggerEvent('rag-stats', result);
    }
    
    if (command === 'search-vector-memories') {
      this.triggerEvent('vector-memories-result', {
        memories: result.memories || result.data || result
      });
    }
    
    if (command === 'get-memory-stats') {
      this.triggerEvent('memory-stats', result);
    }
    
    // ==================== 營銷相關 ====================
    if (command === 'get-ad-templates') {
      this.triggerEvent('ad-templates-updated', {
        templates: result.templates || result.data || result
      });
    }
    
    if (command === 'create-ad-template') {
      this.triggerEvent('ad-template-created', {
        success: result.success !== false,
        template: result.template || result.data,
        error: result.error
      });
    }
    
    if (command === 'delete-ad-template') {
      this.triggerEvent('ad-template-deleted', {
        success: result.success !== false,
        templateId: result.templateId,
        error: result.error
      });
    }
    
    if (command === 'get-ad-schedules') {
      this.triggerEvent('ad-schedules-updated', {
        schedules: result.schedules || result.data || result
      });
    }
    
    if (command === 'get-ad-send-logs') {
      this.triggerEvent('ad-send-logs', {
        logs: result.logs || result.data || result
      });
    }
    
    if (command === 'get-ad-overview-stats') {
      this.triggerEvent('ad-overview-stats', result);
    }
    
    if (command === 'get-marketing-stats') {
      this.triggerEvent('marketing-stats', result);
    }
    
    if (command === 'get-marketing-campaigns') {
      this.triggerEvent('marketing-campaigns-updated', {
        campaigns: result.campaigns || result.data || result
      });
    }
    
    if (command === 'create-marketing-campaign') {
      this.triggerEvent('marketing-campaign-created', {
        success: result.success !== false,
        campaign: result.campaign || result.data,
        error: result.error
      });
    }
    
    if (command === 'start-marketing-campaign') {
      this.triggerEvent('marketing-campaign-started', {
        success: result.success !== false,
        campaignId: result.campaignId,
        error: result.error
      });
    }
    
    // ==================== 設置相關 ====================
    if (command === 'get-settings') {
      this.triggerEvent('settings-loaded', {
        settings: result.settings || result.data || result
      });
    }
    
    if (command === 'save-settings') {
      this.triggerEvent('settings-saved', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    if (command === 'save-ai-settings' || command === 'update-ai-chat-settings') {
      this.triggerEvent('ai-settings-saved', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    // ==================== 備份相關 ====================
    if (command === 'list-backups') {
      this.triggerEvent('backups-listed', {
        backups: result.backups || result.data || result
      });
    }
    
    if (command === 'create-backup') {
      this.triggerEvent('backup-created', {
        success: result.success !== false,
        backup: result.backup || result.data,
        error: result.error
      });
    }
    
    if (command === 'restore-backup') {
      this.triggerEvent('backup-restored', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    if (command === 'delete-backup') {
      this.triggerEvent('backup-deleted', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    // ==================== Session 相關 ====================
    if (command === 'import-session') {
      this.triggerEvent('session-imported', {
        success: result.success !== false,
        account: result.account,
        error: result.error
      });
    }
    
    if (command === 'export-session') {
      this.triggerEvent('session-exported', {
        success: result.success !== false,
        path: result.path,
        error: result.error
      });
    }
    
    // ==================== 日誌相關 ====================
    if (command === 'get-logs') {
      this.triggerEvent('logs-updated', {
        logs: result.logs || result.data || result
      });
    }
    
    if (command === 'clear-logs') {
      this.triggerEvent('logs-cleared', {
        success: result.success !== false,
        error: result.error
      });
    }
    
    // ==================== 告警相關 ====================
    if (command === 'get-alerts') {
      this.triggerEvent('alerts-updated', {
        alerts: result.alerts || result.data || result
      });
    }
    
    if (command === 'acknowledge-alert' || command === 'resolve-alert') {
      this.triggerEvent('alert-updated', {
        success: result.success !== false,
        alertId: result.alertId,
        error: result.error
      });
    }
    
    // ==================== API 憑據相關 ====================
    if (command === 'get-api-credentials') {
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
    
    if (command === 'remove-api-credential') {
      this.triggerEvent('api-credential-removed', {
        success: result.success !== false,
        credentialId: result.credentialId,
        error: result.error
      });
    }
    
    // ==================== 系統狀態相關 ====================
    if (command === 'get-system-status') {
      this.triggerEvent('system-status', result);
    }
    
    // ==================== 初始狀態 ====================
    if (command === 'get-initial-state') {
      // 觸發 initial-state-core 事件
      if (result.accounts || result.settings) {
        this.triggerEvent('initial-state-core', {
          accounts: result.accounts || [],
          settings: result.settings || {},
          isMonitoring: result.isMonitoring || false
        });
      }
      
      // 觸發 initial-state-config 事件
      if (result.keywordSets || result.monitoredGroups || result.campaigns) {
        this.triggerEvent('initial-state-config', {
          keywordSets: result.keywordSets || [],
          monitoredGroups: result.monitoredGroups || [],
          campaigns: result.campaigns || [],
          messageTemplates: result.messageTemplates || [],
          chatTemplates: result.chatTemplates || [],
          triggerRules: result.triggerRules || []
        });
      }
      
      // 觸發 initial-state-data 事件
      if (result.leads || result.logs) {
        this.triggerEvent('initial-state-data', {
          leads: result.leads || [],
          leadsTotal: result.leadsTotal || 0,
          leadsHasMore: result.leadsHasMore || false,
          logs: result.logs || []
        });
      }
      
      // 觸發完整的 initial-state 事件
      this.triggerEvent('initial-state', result);
      
      // 觸發 accounts-updated 事件
      if (result.accounts && result.accounts.length > 0) {
        this.triggerEvent('accounts-updated', result.accounts);
      }
    }
    
    // ==================== 通用成功/失敗處理 ====================
    // 對於未特別處理的命令，觸發通用事件
    if (!this.isCommandHandled(command)) {
      const eventName = command.replace(/-/g, '-') + '-result';
      this.triggerEvent(eventName, {
        success: result.success !== false,
        data: result.data || result,
        error: result.error
      });
    }
  }
  
  /**
   * 檢查命令是否已被特別處理
   */
  private isCommandHandled(command: string): boolean {
    const handledCommands = [
      'login-account', 'add-account', 'get-accounts', 'update-account', 'update-account-data',
      'delete-account', 'remove-account', 'connect-account', 'disconnect-account', 'logout-account',
      'check-account-status', 'start-monitoring', 'stop-monitoring', 'get-monitoring-status',
      'one-click-start', 'one-click-stop', 'get-monitored-groups', 'add-group', 'remove-group',
      'join-group', 'leave-group', 'join-and-monitor-with-account', 'join-and-monitor-resource',
      'batch-join-and-monitor', 'batch-join-resources', 'get-keyword-sets', 'add-keyword-set',
      'add-keyword', 'remove-keyword', 'get-queue-status', 'get-queue-messages', 'clear-queue',
      'retry-message', 'cancel-message', 'pause-queue', 'resume-queue', 'send-message',
      'send-group-message', 'schedule-message', 'get-leads', 'get-leads-paginated', 'add-lead',
      'update-lead-status', 'delete-lead', 'batch-delete-leads', 'batch-update-lead-status',
      'search-leads', 'get-all-tags', 'search-resources', 'search-jiso', 'get-resources',
      'save-resource', 'unsave-resource', 'get-resource-stats', 'clear-all-resources',
      'clear-resources', 'extract-members', 'batch-extract-members', 'generate-ai-response',
      'test-ai-connection', 'get-ollama-models', 'search-rag', 'get-rag-stats',
      'search-vector-memories', 'get-memory-stats', 'get-ad-templates', 'create-ad-template',
      'delete-ad-template', 'get-ad-schedules', 'get-ad-send-logs', 'get-ad-overview-stats',
      'get-marketing-stats', 'get-marketing-campaigns', 'create-marketing-campaign',
      'start-marketing-campaign', 'get-settings', 'save-settings', 'save-ai-settings',
      'update-ai-chat-settings', 'list-backups', 'create-backup', 'restore-backup',
      'delete-backup', 'import-session', 'export-session', 'get-logs', 'clear-logs',
      'get-alerts', 'acknowledge-alert', 'resolve-alert', 'get-api-credentials',
      'add-api-credential', 'remove-api-credential', 'get-system-status', 'get-initial-state'
    ];
    return handledCommands.includes(command);
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
   * 🔧 修復：添加 Authorization header
   */
  private async httpInvoke(command: string, payload: any): Promise<any> {
    try {
      const url = `${this.apiBaseUrl}/api/command`;
      
      // 🔧 修復：添加認證 Token
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      const token = this.authToken || localStorage.getItem('tgm_access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
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
