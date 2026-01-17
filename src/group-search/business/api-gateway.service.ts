/**
 * TG-AI智控王 API 開放平台服務
 * API Gateway Service v1.0
 * 
 * 💡 設計思考：
 * 1. RESTful 風格 - 統一的 API 設計
 * 2. 速率限制 - 按 API Key 限流
 * 3. 版本管理 - 支持多版本 API
 * 4. Webhook - 支持事件推送
 * 5. SDK 生成 - 自動生成客戶端 SDK
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { EncryptionService } from '../security/encryption.service';
import { AuditService } from '../security/audit.service';

// ============ 類型定義 ============

export interface APIKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  permissions: APIPermission[];
  rateLimit: RateLimit;
  createdAt: number;
  expiresAt?: number;
  lastUsedAt?: number;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export type APIPermission = 
  | 'search:read'
  | 'search:write'
  | 'member:read'
  | 'member:export'
  | 'message:send'
  | 'group:read'
  | 'analytics:read'
  | 'automation:manage'
  | 'webhook:manage'
  | 'admin:*';

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

export interface APIRequest {
  id: string;
  apiKeyId: string;
  method: string;
  endpoint: string;
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  duration?: number;
  status?: number;
  error?: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    rateLimit: {
      remaining: number;
      reset: number;
    };
  };
}

export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: number;
  lastTriggeredAt?: number;
  failureCount: number;
}

export type WebhookEvent = 
  | 'search.completed'
  | 'member.extracted'
  | 'message.sent'
  | 'message.replied'
  | 'automation.triggered'
  | 'account.status_changed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  data: any;
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  permissions: APIPermission[];
  parameters?: EndpointParameter[];
  requestBody?: EndpointSchema;
  responses: Record<number, EndpointSchema>;
}

export interface EndpointParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
}

export interface EndpointSchema {
  description: string;
  example?: any;
  schema: Record<string, any>;
}

// ============ 預設配置 ============

const DEFAULT_RATE_LIMITS: Record<string, RateLimit> = {
  free: { requestsPerMinute: 10, requestsPerHour: 100, requestsPerDay: 500 },
  basic: { requestsPerMinute: 30, requestsPerHour: 500, requestsPerDay: 5000 },
  pro: { requestsPerMinute: 60, requestsPerHour: 2000, requestsPerDay: 20000 },
  enterprise: { requestsPerMinute: 200, requestsPerHour: 10000, requestsPerDay: 100000 }
};

// ============ API 端點定義 ============

const API_ENDPOINTS: APIEndpoint[] = [
  // 搜索 API
  {
    path: '/v1/search',
    method: 'POST',
    description: '執行群組搜索',
    permissions: ['search:write'],
    requestBody: {
      description: '搜索請求',
      example: { keyword: 'crypto', sources: ['telegram', 'tgstat'], limit: 20 },
      schema: {
        type: 'object',
        properties: {
          keyword: { type: 'string' },
          sources: { type: 'array', items: { type: 'string' } },
          language: { type: 'string' },
          minMembers: { type: 'number' },
          limit: { type: 'number' }
        },
        required: ['keyword']
      }
    },
    responses: {
      200: {
        description: '搜索成功',
        schema: {
          type: 'object',
          properties: {
            results: { type: 'array' },
            total: { type: 'number' }
          }
        }
      }
    }
  },
  {
    path: '/v1/search/history',
    method: 'GET',
    description: '獲取搜索歷史',
    permissions: ['search:read'],
    parameters: [
      { name: 'limit', in: 'query', type: 'number', required: false, description: '返回數量' },
      { name: 'offset', in: 'query', type: 'number', required: false, description: '偏移量' }
    ],
    responses: {
      200: { description: '成功', schema: { type: 'array' } }
    }
  },
  
  // 成員 API
  {
    path: '/v1/members',
    method: 'GET',
    description: '獲取成員列表',
    permissions: ['member:read'],
    parameters: [
      { name: 'groupId', in: 'query', type: 'string', required: false, description: '群組 ID' },
      { name: 'grade', in: 'query', type: 'string', required: false, description: '成員等級' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: '返回數量' }
    ],
    responses: {
      200: { description: '成功', schema: { type: 'array' } }
    }
  },
  {
    path: '/v1/members/extract',
    method: 'POST',
    description: '提取群組成員',
    permissions: ['member:read'],
    requestBody: {
      description: '提取請求',
      schema: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          limit: { type: 'number' }
        },
        required: ['groupId']
      }
    },
    responses: {
      200: { description: '提取任務已開始', schema: { type: 'object' } }
    }
  },
  {
    path: '/v1/members/export',
    method: 'POST',
    description: '導出成員數據',
    permissions: ['member:export'],
    requestBody: {
      description: '導出請求',
      schema: {
        type: 'object',
        properties: {
          memberIds: { type: 'array', items: { type: 'string' } },
          format: { type: 'string', enum: ['json', 'csv', 'excel'] },
          fields: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    responses: {
      200: { description: '導出成功', schema: { type: 'object' } }
    }
  },
  
  // 消息 API
  {
    path: '/v1/messages/send',
    method: 'POST',
    description: '發送消息',
    permissions: ['message:send'],
    requestBody: {
      description: '發送請求',
      schema: {
        type: 'object',
        properties: {
          recipients: { type: 'array', items: { type: 'string' } },
          content: { type: 'string' },
          templateId: { type: 'string' }
        },
        required: ['recipients']
      }
    },
    responses: {
      200: { description: '發送成功', schema: { type: 'object' } }
    }
  },
  
  // 分析 API
  {
    path: '/v1/analytics/overview',
    method: 'GET',
    description: '獲取數據總覽',
    permissions: ['analytics:read'],
    parameters: [
      { name: 'timeRange', in: 'query', type: 'string', required: false, description: '時間範圍' }
    ],
    responses: {
      200: { description: '成功', schema: { type: 'object' } }
    }
  },
  
  // Webhook API
  {
    path: '/v1/webhooks',
    method: 'GET',
    description: '獲取 Webhook 列表',
    permissions: ['webhook:manage'],
    responses: {
      200: { description: '成功', schema: { type: 'array' } }
    }
  },
  {
    path: '/v1/webhooks',
    method: 'POST',
    description: '創建 Webhook',
    permissions: ['webhook:manage'],
    requestBody: {
      description: '創建請求',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          events: { type: 'array', items: { type: 'string' } }
        },
        required: ['url', 'events']
      }
    },
    responses: {
      201: { description: '創建成功', schema: { type: 'object' } }
    }
  }
];

@Injectable({
  providedIn: 'root'
})
export class APIGatewayService {
  private encryption = inject(EncryptionService);
  private audit = inject(AuditService);
  
  // API Keys
  private apiKeys = new Map<string, APIKey>();
  
  // Webhooks
  private webhooks = new Map<string, Webhook>();
  
  // 速率限制追蹤
  private rateLimitCounters = new Map<string, {
    minute: { count: number; resetAt: number };
    hour: { count: number; resetAt: number };
    day: { count: number; resetAt: number };
  }>();
  
  // 請求歷史
  private requestHistory: APIRequest[] = [];
  
  // 狀態
  private _stats = signal({
    totalRequests: 0,
    successRate: 100,
    avgLatency: 0,
    activeKeys: 0
  });
  stats = computed(() => this._stats());
  
  constructor() {
    this.loadApiKeys();
    this.loadWebhooks();
  }
  
  // ============ API Key 管理 ============
  
  /**
   * 生成新的 API Key
   */
  async createAPIKey(config: {
    name: string;
    description?: string;
    permissions: APIPermission[];
    tier?: 'free' | 'basic' | 'pro' | 'enterprise';
    expiresInDays?: number;
  }): Promise<APIKey> {
    const key = this.generateSecureKey();
    
    const apiKey: APIKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      name: config.name,
      description: config.description,
      permissions: config.permissions,
      rateLimit: DEFAULT_RATE_LIMITS[config.tier || 'free'],
      createdAt: Date.now(),
      expiresAt: config.expiresInDays 
        ? Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000 
        : undefined,
      isActive: true
    };
    
    this.apiKeys.set(apiKey.key, apiKey);
    this.saveApiKeys();
    
    await this.audit.info('key_generate', {
      keyId: apiKey.id,
      name: apiKey.name,
      permissions: apiKey.permissions
    });
    
    return apiKey;
  }
  
  /**
   * 驗證 API Key
   */
  validateAPIKey(key: string): { valid: boolean; apiKey?: APIKey; error?: string } {
    const apiKey = this.apiKeys.get(key);
    
    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }
    
    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }
    
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false, error: 'API key has expired' };
    }
    
    return { valid: true, apiKey };
  }
  
  /**
   * 檢查權限
   */
  checkPermission(apiKey: APIKey, required: APIPermission): boolean {
    // 管理員權限
    if (apiKey.permissions.includes('admin:*')) return true;
    
    // 精確匹配
    if (apiKey.permissions.includes(required)) return true;
    
    // 通配符匹配 (e.g., 'member:*' 匹配 'member:read')
    const [resource] = required.split(':');
    if (apiKey.permissions.includes(`${resource}:*` as APIPermission)) return true;
    
    return false;
  }
  
  /**
   * 撤銷 API Key
   */
  async revokeAPIKey(keyId: string): Promise<boolean> {
    for (const [key, apiKey] of this.apiKeys) {
      if (apiKey.id === keyId) {
        apiKey.isActive = false;
        this.saveApiKeys();
        
        await this.audit.warn('key_generate', {
          action: 'revoke',
          keyId
        });
        
        return true;
      }
    }
    return false;
  }
  
  /**
   * 獲取所有 API Keys
   */
  getAllAPIKeys(): APIKey[] {
    return [...this.apiKeys.values()].map(key => ({
      ...key,
      key: this.maskKey(key.key) // 隱藏完整 key
    }));
  }
  
  private generateSecureKey(): string {
    const prefix = 'tgai_';
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return prefix + randomPart;
  }
  
  private maskKey(key: string): string {
    if (key.length <= 12) return key;
    return key.slice(0, 8) + '...' + key.slice(-4);
  }
  
  // ============ 速率限制 ============
  
  /**
   * 檢查速率限制
   */
  checkRateLimit(apiKey: APIKey): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    let counter = this.rateLimitCounters.get(apiKey.key);
    
    if (!counter) {
      counter = {
        minute: { count: 0, resetAt: now + 60000 },
        hour: { count: 0, resetAt: now + 3600000 },
        day: { count: 0, resetAt: now + 86400000 }
      };
      this.rateLimitCounters.set(apiKey.key, counter);
    }
    
    // 重置過期的計數器
    if (now >= counter.minute.resetAt) {
      counter.minute = { count: 0, resetAt: now + 60000 };
    }
    if (now >= counter.hour.resetAt) {
      counter.hour = { count: 0, resetAt: now + 3600000 };
    }
    if (now >= counter.day.resetAt) {
      counter.day = { count: 0, resetAt: now + 86400000 };
    }
    
    // 檢查限制
    const limits = apiKey.rateLimit;
    
    if (counter.minute.count >= limits.requestsPerMinute) {
      return { allowed: false, retryAfter: counter.minute.resetAt - now };
    }
    if (counter.hour.count >= limits.requestsPerHour) {
      return { allowed: false, retryAfter: counter.hour.resetAt - now };
    }
    if (counter.day.count >= limits.requestsPerDay) {
      return { allowed: false, retryAfter: counter.day.resetAt - now };
    }
    
    return { allowed: true };
  }
  
  /**
   * 記錄請求
   */
  recordRequest(apiKey: APIKey): void {
    const counter = this.rateLimitCounters.get(apiKey.key);
    if (counter) {
      counter.minute.count++;
      counter.hour.count++;
      counter.day.count++;
    }
    
    // 更新最後使用時間
    apiKey.lastUsedAt = Date.now();
  }
  
  /**
   * 獲取剩餘配額
   */
  getRemainingQuota(apiKey: APIKey): { minute: number; hour: number; day: number } {
    const counter = this.rateLimitCounters.get(apiKey.key);
    const limits = apiKey.rateLimit;
    
    if (!counter) {
      return {
        minute: limits.requestsPerMinute,
        hour: limits.requestsPerHour,
        day: limits.requestsPerDay
      };
    }
    
    return {
      minute: Math.max(0, limits.requestsPerMinute - counter.minute.count),
      hour: Math.max(0, limits.requestsPerHour - counter.hour.count),
      day: Math.max(0, limits.requestsPerDay - counter.day.count)
    };
  }
  
  // ============ 請求處理 ============
  
  /**
   * 處理 API 請求
   * 
   * 💡 統一的請求處理流程
   */
  async handleRequest<T>(
    key: string,
    endpoint: string,
    method: string,
    handler: () => Promise<T>,
    requiredPermission?: APIPermission
  ): Promise<APIResponse<T>> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 驗證 API Key
    const validation = this.validateAPIKey(key);
    if (!validation.valid) {
      return this.errorResponse(401, 'INVALID_API_KEY', validation.error!);
    }
    
    const apiKey = validation.apiKey!;
    
    // 檢查權限
    if (requiredPermission && !this.checkPermission(apiKey, requiredPermission)) {
      return this.errorResponse(403, 'PERMISSION_DENIED', 'Insufficient permissions');
    }
    
    // 檢查速率限制
    const rateCheck = this.checkRateLimit(apiKey);
    if (!rateCheck.allowed) {
      return this.errorResponse(429, 'RATE_LIMIT_EXCEEDED', 
        `Rate limit exceeded. Retry after ${Math.ceil(rateCheck.retryAfter! / 1000)} seconds`);
    }
    
    // 記錄請求
    this.recordRequest(apiKey);
    
    try {
      // 執行處理
      const data = await handler();
      const duration = Date.now() - startTime;
      
      // 記錄歷史
      this.logRequest({
        id: requestId,
        apiKeyId: apiKey.id,
        method,
        endpoint,
        timestamp: startTime,
        duration,
        status: 200
      });
      
      // 返回成功響應
      return {
        success: true,
        data,
        meta: {
          requestId,
          timestamp: Date.now(),
          rateLimit: {
            remaining: this.getRemainingQuota(apiKey).minute,
            reset: this.rateLimitCounters.get(apiKey.key)?.minute.resetAt || 0
          }
        }
      };
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      this.logRequest({
        id: requestId,
        apiKeyId: apiKey.id,
        method,
        endpoint,
        timestamp: startTime,
        duration,
        status: 500,
        error: error.message
      });
      
      return this.errorResponse(500, 'INTERNAL_ERROR', error.message);
    }
  }
  
  private errorResponse(status: number, code: string, message: string): APIResponse {
    return {
      success: false,
      error: { code, message }
    };
  }
  
  private logRequest(request: APIRequest): void {
    this.requestHistory.push(request);
    
    // 保留最近 1000 條
    if (this.requestHistory.length > 1000) {
      this.requestHistory.shift();
    }
    
    // 更新統計
    this.updateStats();
  }
  
  // ============ Webhook 管理 ============
  
  /**
   * 創建 Webhook
   */
  createWebhook(url: string, events: WebhookEvent[]): Webhook {
    const webhook: Webhook = {
      id: `webhook_${Date.now()}`,
      url,
      events,
      secret: this.generateSecureKey(),
      isActive: true,
      createdAt: Date.now(),
      failureCount: 0
    };
    
    this.webhooks.set(webhook.id, webhook);
    this.saveWebhooks();
    
    return webhook;
  }
  
  /**
   * 觸發 Webhook
   */
  async triggerWebhook(event: WebhookEvent, data: any): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: Date.now(),
      data
    };
    
    for (const webhook of this.webhooks.values()) {
      if (!webhook.isActive || !webhook.events.includes(event)) continue;
      
      try {
        const signature = await this.signPayload(payload, webhook.secret);
        
        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-TGAI-Signature': signature,
            'X-TGAI-Event': event
          },
          body: JSON.stringify(payload)
        });
        
        webhook.lastTriggeredAt = Date.now();
        webhook.failureCount = 0;
        
      } catch (error) {
        webhook.failureCount++;
        
        // 連續失敗 5 次後禁用
        if (webhook.failureCount >= 5) {
          webhook.isActive = false;
        }
      }
    }
    
    this.saveWebhooks();
  }
  
  private async signPayload(payload: WebhookPayload, secret: string): Promise<string> {
    const data = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * 獲取所有 Webhook
   */
  getAllWebhooks(): Webhook[] {
    return [...this.webhooks.values()];
  }
  
  /**
   * 刪除 Webhook
   */
  deleteWebhook(id: string): boolean {
    if (this.webhooks.has(id)) {
      this.webhooks.delete(id);
      this.saveWebhooks();
      return true;
    }
    return false;
  }
  
  // ============ API 文檔 ============
  
  /**
   * 獲取 API 端點列表
   */
  getEndpoints(): APIEndpoint[] {
    return API_ENDPOINTS;
  }
  
  /**
   * 生成 OpenAPI 規範
   */
  generateOpenAPISpec(): any {
    return {
      openapi: '3.0.0',
      info: {
        title: 'TG-AI智控王 API',
        version: '1.0.0',
        description: 'TG-AI智控王開放 API'
      },
      servers: [
        { url: 'https://api.tgai.app/v1', description: '生產環境' }
      ],
      paths: this.generatePaths(),
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
          }
        }
      },
      security: [{ ApiKeyAuth: [] }]
    };
  }
  
  private generatePaths(): Record<string, any> {
    const paths: Record<string, any> = {};
    
    for (const endpoint of API_ENDPOINTS) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }
      
      paths[endpoint.path][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody ? {
          content: {
            'application/json': {
              schema: endpoint.requestBody.schema,
              example: endpoint.requestBody.example
            }
          }
        } : undefined,
        responses: Object.fromEntries(
          Object.entries(endpoint.responses).map(([code, schema]) => [
            code,
            {
              description: schema.description,
              content: {
                'application/json': {
                  schema: schema.schema
                }
              }
            }
          ])
        )
      };
    }
    
    return paths;
  }
  
  // ============ 統計 ============
  
  private updateStats(): void {
    const recentRequests = this.requestHistory.slice(-100);
    const successful = recentRequests.filter(r => r.status === 200).length;
    const totalLatency = recentRequests.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    this._stats.set({
      totalRequests: this.requestHistory.length,
      successRate: recentRequests.length > 0 
        ? (successful / recentRequests.length) * 100 
        : 100,
      avgLatency: recentRequests.length > 0 
        ? totalLatency / recentRequests.length 
        : 0,
      activeKeys: [...this.apiKeys.values()].filter(k => k.isActive).length
    });
  }
  
  /**
   * 獲取請求歷史
   */
  getRequestHistory(limit = 100): APIRequest[] {
    return this.requestHistory.slice(-limit);
  }
  
  // ============ 持久化 ============
  
  private loadApiKeys(): void {
    const stored = localStorage.getItem('tgai-api-keys');
    if (stored) {
      const keys = JSON.parse(stored) as APIKey[];
      for (const key of keys) {
        this.apiKeys.set(key.key, key);
      }
    }
  }
  
  private saveApiKeys(): void {
    localStorage.setItem('tgai-api-keys', JSON.stringify([...this.apiKeys.values()]));
  }
  
  private loadWebhooks(): void {
    const stored = localStorage.getItem('tgai-webhooks');
    if (stored) {
      const webhooks = JSON.parse(stored) as Webhook[];
      for (const webhook of webhooks) {
        this.webhooks.set(webhook.id, webhook);
      }
    }
  }
  
  private saveWebhooks(): void {
    localStorage.setItem('tgai-webhooks', JSON.stringify([...this.webhooks.values()]));
  }
}
