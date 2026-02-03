/**
 * TG-Matrix 統一 API 服務
 * 
 * 優化設計：
 * 1. 自動檢測環境（Electron vs Web）
 * 2. 統一的請求/響應接口
 * 3. 自動重試和錯誤處理
 * 4. 請求緩存和去重
 * 5. WebSocket 實時通訊支持
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, from, of, throwError } from 'rxjs';
import { map, catchError, retry, shareReplay, tap, timeout } from 'rxjs/operators';

// 環境配置
export interface ApiConfig {
  mode: 'ipc' | 'http';
  baseUrl?: string;
  wsUrl?: string;
  timeout?: number;
  retries?: number;
}

// API 響應格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  request_id?: string;
}

// WebSocket 消息格式
export interface WsMessage {
  type: 'event' | 'response' | 'error';
  event?: string;
  data?: any;
  request_id?: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  
  // 環境檢測
  private _isElectron = signal<boolean>(this.detectElectron());
  private _isConnected = signal<boolean>(false);
  private _config = signal<ApiConfig>(this.getDefaultConfig());
  
  // WebSocket
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private wsMessageSubject = new Subject<WsMessage>();
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();
  
  // 請求緩存
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 30000; // 30 秒緩存
  
  // 請求去重
  private inflightRequests = new Map<string, Promise<any>>();
  
  // 公開狀態
  readonly isElectron = computed(() => this._isElectron());
  readonly isConnected = computed(() => this._isConnected());
  readonly mode = computed(() => this._config().mode);
  
  // 事件流
  readonly events$ = this.wsMessageSubject.asObservable();
  
  constructor() {
    this.init();
  }
  
  // ==================== 初始化 ====================
  
  private init(): void {
    console.log(`[ApiService] Initializing in ${this._config().mode} mode`);
    
    if (this._config().mode === 'http') {
      this.connectWebSocket();
    }
    
    // 測試連接
    this.healthCheck().then(ok => {
      this._isConnected.set(ok);
      console.log(`[ApiService] Connection status: ${ok ? 'connected' : 'disconnected'}`);
    });
  }
  
  private detectElectron(): boolean {
    return !!(window as any).electron || !!(window as any).require;
  }
  
  private getDefaultConfig(): ApiConfig {
    // 優先從環境變量獲取
    const envMode = (window as any).__API_MODE__ || 'auto';
    const envBaseUrl = (window as any).__API_BASE_URL__;
    
    if (envMode === 'http' || envBaseUrl) {
      return {
        mode: 'http',
        baseUrl: envBaseUrl || this.detectApiUrl(),
        wsUrl: this.detectWsUrl(),
        timeout: 30000,
        retries: 2
      };
    }
    
    if (this.detectElectron()) {
      return {
        mode: 'ipc',
        timeout: 30000,
        retries: 2
      };
    }
    
    // Web 環境默認使用 HTTP
    return {
      mode: 'http',
      baseUrl: this.detectApiUrl(),
      wsUrl: this.detectWsUrl(),
      timeout: 30000,
      retries: 2
    };
  }
  
  private detectApiUrl(): string {
    // 開發環境
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000';
    }
    // 生產環境 - 同源
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  private detectWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'ws://localhost:8000/ws';
    }
    return `${protocol}//${window.location.host}/ws`;
  }
  
  // ==================== 核心請求方法 ====================
  
  /**
   * 執行命令 - 核心方法
   * 自動選擇 IPC 或 HTTP
   */
  async command<T = any>(cmd: string, payload: any = {}): Promise<ApiResponse<T>> {
    const requestKey = `${cmd}:${JSON.stringify(payload)}`;
    
    // 請求去重
    if (this.inflightRequests.has(requestKey)) {
      return this.inflightRequests.get(requestKey)!;
    }
    
    const promise = this._executeCommand<T>(cmd, payload);
    this.inflightRequests.set(requestKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.inflightRequests.delete(requestKey);
    }
  }
  
  private async _executeCommand<T>(cmd: string, payload: any): Promise<ApiResponse<T>> {
    if (this._config().mode === 'ipc') {
      return this.ipcCommand(cmd, payload);
    } else {
      return this.httpCommand(cmd, payload);
    }
  }
  
  // ==================== IPC 模式 ====================
  
  private async ipcCommand<T>(cmd: string, payload: any): Promise<ApiResponse<T>> {
    const electron = (window as any).electron;
    if (!electron?.ipcRenderer) {
      throw new Error('Electron IPC not available');
    }
    
    try {
      const result = await electron.ipcRenderer.invoke(cmd, payload);
      return this.normalizeResponse(result);
    } catch (error: any) {
      return { success: false, error: error.message || 'IPC error' };
    }
  }
  
  // ==================== HTTP 模式 ====================
  
  private async httpCommand<T>(cmd: string, payload: any): Promise<ApiResponse<T>> {
    const config = this._config();
    const url = `${config.baseUrl}/api/command`;
    
    // 🔧 獲取認證 Token
    const token = localStorage.getItem('tgm_access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ command: cmd, payload })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return this.normalizeResponse(result);
    } catch (error: any) {
      // 自動重試
      if (config.retries && config.retries > 0) {
        console.warn(`[ApiService] Retrying command: ${cmd}`);
        const newConfig = { ...config, retries: config.retries - 1 };
        this._config.set(newConfig);
        return this.httpCommand(cmd, payload);
      }
      
      return { success: false, error: error.message || 'HTTP error' };
    }
  }
  
  private normalizeResponse<T>(result: any): ApiResponse<T> {
    if (typeof result === 'object' && result !== null) {
      if ('success' in result) {
        return result;
      }
      return { success: true, data: result };
    }
    return { success: true, data: result as T };
  }
  
  // ==================== WebSocket ====================
  
  private connectWebSocket(): void {
    const wsUrl = this._config().wsUrl;
    if (!wsUrl) return;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[ApiService] WebSocket connected');
        this._isConnected.set(true);
        if (this.wsReconnectTimer) {
          clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = null;
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          
          // 處理請求響應
          if (message.request_id && this.pendingRequests.has(message.request_id)) {
            const { resolve } = this.pendingRequests.get(message.request_id)!;
            this.pendingRequests.delete(message.request_id);
            resolve(message);
          }
          
          // 廣播事件
          this.wsMessageSubject.next(message);
        } catch (e) {
          console.error('[ApiService] WebSocket message parse error', e);
        }
      };
      
      this.ws.onclose = () => {
        console.log('[ApiService] WebSocket disconnected');
        this._isConnected.set(false);
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('[ApiService] WebSocket error', error);
      };
    } catch (e) {
      console.error('[ApiService] WebSocket connection failed', e);
      this.scheduleReconnect();
    }
  }
  
  private scheduleReconnect(): void {
    if (this.wsReconnectTimer) return;
    
    this.wsReconnectTimer = setTimeout(() => {
      console.log('[ApiService] Attempting WebSocket reconnection...');
      this.wsReconnectTimer = null;
      this.connectWebSocket();
    }, 5000);
  }
  
  /**
   * 通過 WebSocket 發送命令
   */
  async wsCommand<T>(cmd: string, payload: any = {}): Promise<ApiResponse<T>> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 降級到 HTTP
      return this.httpCommand(cmd, payload);
    }
    
    const requestId = crypto.randomUUID();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // 超時處理
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('WebSocket request timeout'));
        }
      }, this._config().timeout || 30000);
      
      this.ws!.send(JSON.stringify({
        command: cmd,
        payload,
        request_id: requestId
      }));
    });
  }
  
  // ==================== 便捷方法 ====================
  
  /**
   * 健康檢查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.command('get-initial-state');
      return result.success;
    } catch {
      return false;
    }
  }
  
  /**
   * 帶緩存的請求
   */
  async cachedCommand<T>(cmd: string, payload: any = {}, ttl: number = this.cacheTimeout): Promise<ApiResponse<T>> {
    const cacheKey = `${cmd}:${JSON.stringify(payload)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return { success: true, data: cached.data };
    }
    
    const result = await this.command<T>(cmd, payload);
    
    if (result.success && result.data) {
      this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() });
    }
    
    return result;
  }
  
  /**
   * 清除緩存
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
  
  // ==================== 常用 API 快捷方法 ====================
  
  // 帳號
  getAccounts() { return this.cachedCommand('get-accounts'); }
  addAccount(data: any) { return this.command('add-account', data); }
  loginAccount(id: string | number) { return this.command('login-account', { id }); }
  logoutAccount(id: string | number) { return this.command('logout-account', { id }); }
  
  // 認證
  sendCode(phone: string, apiId?: string, apiHash?: string) {
    return this.command('send-code', { phone, apiId, apiHash });
  }
  verifyCode(phone: string, code: string, phoneCodeHash: string) {
    return this.command('verify-code', { phone, code, phoneCodeHash });
  }
  
  // API 憑證
  getCredentials() { return this.cachedCommand('get-api-credentials'); }
  addCredential(data: any) { return this.command('add-api-credential', data); }
  getRecommendedCredential() { return this.cachedCommand('get-api-recommendation'); }
  
  // 監控
  getMonitoringStatus() { return this.command('get-monitoring-status'); }
  startMonitoring(config?: any) { return this.command('start-monitoring', config); }
  stopMonitoring() { return this.command('stop-monitoring'); }
  
  // 初始狀態
  getInitialState() { return this.cachedCommand('get-initial-state', {}, 5000); }
  
  // 設置
  getSettings() { return this.cachedCommand('get-settings'); }
  saveSettings(settings: any) {
    this.clearCache('get-settings');
    return this.command('save-settings', settings);
  }
}
