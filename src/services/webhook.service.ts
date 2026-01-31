/**
 * Webhook 服務
 * Webhook Service
 * 
 * 🆕 P5 階段：高級功能擴展
 * 
 * 功能：
 * - Webhook 端點管理
 * - 事件訂閱
 * - 自動重試
 * - 日誌記錄
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ResilienceService } from './resilience.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

/** 事件類型 */
export type WebhookEventType = 
  | 'session.started'      // 會話開始
  | 'session.completed'    // 會話完成
  | 'conversion.success'   // 轉化成功
  | 'user.new'             // 新用戶
  | 'user.updated'         // 用戶更新
  | 'alert.triggered'      // 告警觸發
  | 'experiment.completed' // 實驗完成
  | 'daily.summary';       // 每日摘要

/** Webhook 端點 */
export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret?: string;          // 簽名密鑰
  events: WebhookEventType[];
  headers?: Record<string, string>;
  
  // 狀態
  enabled: boolean;
  status: 'active' | 'failing' | 'disabled';
  
  // 統計
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  lastCalledAt?: Date;
  lastError?: string;
  
  // 配置
  retryCount: number;       // 重試次數
  timeout: number;          // 超時時間（毫秒）
  
  createdAt: Date;
  updatedAt: Date;
}

/** Webhook 事件 */
export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  timestamp: Date;
  data: Record<string, any>;
}

/** 發送日誌 */
export interface WebhookLog {
  id: string;
  endpointId: string;
  endpointName: string;
  eventType: WebhookEventType;
  eventData: any;
  
  // 請求
  requestUrl: string;
  requestHeaders: Record<string, string>;
  requestBody: string;
  
  // 響應
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;  // 毫秒
  
  // 狀態
  status: 'success' | 'failed' | 'pending' | 'retrying';
  attempt: number;
  errorMessage?: string;
  
  createdAt: Date;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private resilience = inject(ResilienceService);
  private toast = inject(ToastService);
  
  // 端點列表
  private _endpoints = signal<WebhookEndpoint[]>([]);
  endpoints = this._endpoints.asReadonly();
  
  // 發送日誌
  private _logs = signal<WebhookLog[]>([]);
  logs = this._logs.asReadonly();
  
  // 事件隊列
  private _eventQueue = signal<WebhookEvent[]>([]);
  
  // 統計
  activeEndpoints = computed(() => 
    this._endpoints().filter(e => e.enabled && e.status !== 'disabled')
  );
  
  totalCallsToday = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this._logs().filter(l => 
      l.createdAt.toISOString().slice(0, 10) === today
    ).length;
  });
  
  private readonly STORAGE_KEY = 'webhooks';
  private processingQueue = false;
  
  constructor() {
    this.loadFromStorage();
    this.startQueueProcessor();
  }
  
  // ============ 端點管理 ============
  
  /**
   * 創建端點
   */
  createEndpoint(config: {
    name: string;
    url: string;
    secret?: string;
    events: WebhookEventType[];
    headers?: Record<string, string>;
    retryCount?: number;
    timeout?: number;
  }): WebhookEndpoint {
    const endpoint: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      name: config.name,
      url: config.url,
      secret: config.secret,
      events: config.events,
      headers: config.headers,
      enabled: true,
      status: 'active',
      totalCalls: 0,
      successCalls: 0,
      failedCalls: 0,
      retryCount: config.retryCount ?? 3,
      timeout: config.timeout ?? 30000,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._endpoints.update(eps => [...eps, endpoint]);
    this.saveToStorage();
    
    console.log(`[Webhook] 創建端點: ${endpoint.name}`);
    return endpoint;
  }
  
  /**
   * 更新端點
   */
  updateEndpoint(endpointId: string, updates: Partial<WebhookEndpoint>) {
    this._endpoints.update(eps => 
      eps.map(e => e.id === endpointId ? { ...e, ...updates, updatedAt: new Date() } : e)
    );
    this.saveToStorage();
  }
  
  /**
   * 刪除端點
   */
  deleteEndpoint(endpointId: string) {
    this._endpoints.update(eps => eps.filter(e => e.id !== endpointId));
    this.saveToStorage();
  }
  
  /**
   * 測試端點
   */
  async testEndpoint(endpointId: string): Promise<boolean> {
    const endpoint = this._endpoints().find(e => e.id === endpointId);
    if (!endpoint) return false;
    
    const testEvent: WebhookEvent = {
      id: `test_${Date.now()}`,
      type: 'session.started',
      timestamp: new Date(),
      data: {
        test: true,
        message: 'This is a test webhook from TG-Matrix'
      }
    };
    
    try {
      await this.sendToEndpoint(endpoint, testEvent);
      this.toast.success(`✅ Webhook 測試成功: ${endpoint.name}`);
      return true;
    } catch (error: any) {
      this.toast.error(`❌ Webhook 測試失敗: ${error.message}`);
      return false;
    }
  }
  
  // ============ 事件發送 ============
  
  /**
   * 觸發事件
   */
  trigger(type: WebhookEventType, data: Record<string, any>) {
    const event: WebhookEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data
    };
    
    // 加入隊列
    this._eventQueue.update(queue => [...queue, event]);
    
    console.log(`[Webhook] 事件觸發: ${type}`);
  }
  
  /**
   * 發送到端點
   */
  private async sendToEndpoint(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<void> {
    const log: WebhookLog = {
      id: `log_${Date.now()}`,
      endpointId: endpoint.id,
      endpointName: endpoint.name,
      eventType: event.type,
      eventData: event.data,
      requestUrl: endpoint.url,
      requestHeaders: this.buildHeaders(endpoint, event),
      requestBody: JSON.stringify(this.buildPayload(endpoint, event)),
      status: 'pending',
      attempt: 1,
      createdAt: new Date()
    };
    
    this._logs.update(logs => [log, ...logs].slice(0, 200));
    
    const startTime = Date.now();
    
    try {
      const response = await this.resilience.withTimeout(
        fetch(endpoint.url, {
          method: 'POST',
          headers: log.requestHeaders,
          body: log.requestBody
        }),
        endpoint.timeout
      );
      
      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseBody}`);
      }
      
      // 更新日誌
      this.updateLog(log.id, {
        status: 'success',
        responseStatus: response.status,
        responseBody: responseBody.slice(0, 1000),
        responseTime
      });
      
      // 更新端點統計
      this.updateEndpoint(endpoint.id, {
        totalCalls: endpoint.totalCalls + 1,
        successCalls: endpoint.successCalls + 1,
        lastCalledAt: new Date(),
        status: 'active'
      });
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // 更新日誌
      this.updateLog(log.id, {
        status: 'failed',
        responseTime,
        errorMessage: error.message
      });
      
      // 更新端點統計
      const newFailedCalls = endpoint.failedCalls + 1;
      const status = newFailedCalls >= 5 ? 'failing' : 'active';
      
      this.updateEndpoint(endpoint.id, {
        totalCalls: endpoint.totalCalls + 1,
        failedCalls: newFailedCalls,
        lastCalledAt: new Date(),
        lastError: error.message,
        status
      });
      
      throw error;
    }
  }
  
  /**
   * 構建請求頭
   */
  private buildHeaders(endpoint: WebhookEndpoint, event: WebhookEvent): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'TG-Matrix-Webhook/1.0',
      'X-Webhook-Event': event.type,
      'X-Webhook-Timestamp': event.timestamp.toISOString(),
      'X-Webhook-ID': event.id,
      ...endpoint.headers
    };
    
    // 添加簽名
    if (endpoint.secret) {
      headers['X-Webhook-Signature'] = this.generateSignature(endpoint.secret, event);
    }
    
    return headers;
  }
  
  /**
   * 構建請求體
   */
  private buildPayload(endpoint: WebhookEndpoint, event: WebhookEvent): Record<string, any> {
    return {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp.toISOString(),
      data: event.data
    };
  }
  
  /**
   * 生成簽名
   */
  private generateSignature(secret: string, event: WebhookEvent): string {
    // 簡化版簽名（實際應使用 HMAC-SHA256）
    const payload = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp.toISOString()
    });
    
    // 簡單的哈希實現
    let hash = 0;
    const combined = secret + payload;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return `sha256=${Math.abs(hash).toString(16)}`;
  }
  
  /**
   * 更新日誌
   */
  private updateLog(logId: string, updates: Partial<WebhookLog>) {
    this._logs.update(logs => 
      logs.map(l => l.id === logId ? { ...l, ...updates } : l)
    );
  }
  
  // ============ 隊列處理 ============
  
  /**
   * 啟動隊列處理器
   */
  private startQueueProcessor() {
    setInterval(() => {
      this.processQueue();
    }, 1000);
  }
  
  /**
   * 處理事件隊列
   */
  private async processQueue() {
    if (this.processingQueue) return;
    
    const queue = this._eventQueue();
    if (queue.length === 0) return;
    
    this.processingQueue = true;
    
    try {
      const event = queue[0];
      this._eventQueue.update(q => q.slice(1));
      
      // 找到訂閱此事件的端點
      const subscribedEndpoints = this.activeEndpoints().filter(e => 
        e.events.includes(event.type)
      );
      
      // 並行發送
      await Promise.allSettled(
        subscribedEndpoints.map(ep => 
          this.resilience.withRetry(
            () => this.sendToEndpoint(ep, event),
            { name: `webhook:${ep.name}`, config: { maxAttempts: ep.retryCount } }
          )
        )
      );
      
    } finally {
      this.processingQueue = false;
    }
  }
  
  // ============ 便捷方法 ============
  
  /**
   * 會話開始
   */
  onSessionStarted(data: { sessionId: string; userId: string; userName: string }) {
    this.trigger('session.started', data);
  }
  
  /**
   * 會話完成
   */
  onSessionCompleted(data: { sessionId: string; userId: string; outcome: string; interestScore: number }) {
    this.trigger('session.completed', data);
  }
  
  /**
   * 轉化成功
   */
  onConversionSuccess(data: { userId: string; userName: string; amount?: number }) {
    this.trigger('conversion.success', data);
  }
  
  /**
   * 告警觸發
   */
  onAlertTriggered(data: { alertId: string; type: string; message: string }) {
    this.trigger('alert.triggered', data);
  }
  
  // ============ 獲取可用事件 ============
  
  /**
   * 獲取所有事件類型
   */
  getEventTypes(): { type: WebhookEventType; label: string; description: string }[] {
    return [
      { type: 'session.started', label: '會話開始', description: '當新的營銷會話開始時' },
      { type: 'session.completed', label: '會話完成', description: '當營銷會話結束時' },
      { type: 'conversion.success', label: '轉化成功', description: '當用戶成功轉化時' },
      { type: 'user.new', label: '新用戶', description: '當發現新的潛在客戶時' },
      { type: 'user.updated', label: '用戶更新', description: '當用戶信息更新時' },
      { type: 'alert.triggered', label: '告警觸發', description: '當系統告警觸發時' },
      { type: 'experiment.completed', label: '實驗完成', description: '當 A/B 測試實驗完成時' },
      { type: 'daily.summary', label: '每日摘要', description: '每日營銷數據摘要' }
    ];
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      endpoints: this._endpoints(),
      logs: this._logs().slice(0, 100),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.endpoints) {
        this._endpoints.set(data.endpoints.map((e: any) => ({
          ...e,
          lastCalledAt: e.lastCalledAt ? new Date(e.lastCalledAt) : undefined,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt)
        })));
      }
      
      if (data.logs) {
        this._logs.set(data.logs.map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt)
        })));
      }
      
      console.log('[Webhook] 已從存儲恢復數據');
    } catch (e) {
      console.error('[Webhook] 恢復數據失敗:', e);
    }
  }
}
