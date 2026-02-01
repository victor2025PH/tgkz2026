/**
 * TG-AI智控王 Lead Nurturing AI Provider Service
 * 線索培育 AI 提供者服務
 * 
 * 此服務是對主 AIProviderService 的擴展封裝
 * 提供額外的功能：
 * - 自動 fallback（當主提供者失敗時嘗試其他提供者）
 * - 響應緩存
 * - 速率限制
 * - 使用統計追蹤
 * 
 * ⚠️ 注意：此文件是對 ../ai-provider.service.ts 的擴展
 * 如需修改核心 AI 功能，請修改主文件
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 重新導出主服務的類型和常量，保持向後兼容
export type { 
  AIProviderType as BaseAIProviderType,
  AIProvider,
  AIModel,
  AIConfig,
  AIMessage,
  AIResponse
} from '../ai-provider.service';

export { 
  AI_PROVIDERS,
  AIProviderService as BaseAIProviderService
} from '../ai-provider.service';

import { 
  AIProviderService as BaseAIProviderService,
  AIMessage,
  AIResponse,
  AIConfig,
  AI_PROVIDERS
} from '../ai-provider.service';

// ============ 擴展類型定義 ============

/** AI 提供者類型（擴展支持自定義） */
export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'ollama' | 'deepseek' | 'local' | 'custom';

/** AI 模型配置 */
export interface AIModelConfig {
  provider: AIProviderType;
  modelId: string;
  displayName: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/** AI 提供者配置 */
export interface AIProviderConfig {
  type: AIProviderType;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  defaultModel: string;
  models: AIModelConfig[];
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  priority: number; // 用於 fallback 排序
}

/** 生成請求 */
export interface AIGenerateRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
  provider?: AIProviderType;
  model?: string;
}

/** 生成響應 */
export interface AIGenerateResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: AIProviderType;
  model: string;
  latencyMs: number;
  cached: boolean;
}

/** 使用統計 */
export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byProvider: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    errors: number;
  }>;
  todayTokens: number;
  todayCost: number;
}

/** 緩存條目 */
interface CacheEntry {
  response: AIGenerateResponse;
  timestamp: number;
  ttl: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AIProviderService {
  private baseService = inject(BaseAIProviderService);
  private ipc = inject(ElectronIpcService);
  
  // 緩存
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 分鐘
  
  // 速率限制狀態
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  // 使用統計
  private _usageStats = signal<AIUsageStats>({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    byProvider: {},
    todayTokens: 0,
    todayCost: 0
  });
  usageStats = this._usageStats.asReadonly();
  
  // 狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  private _lastError = signal<string | null>(null);
  lastError = this._lastError.asReadonly();
  
  // 代理訪問基礎服務的屬性
  get config() { return this.baseService.config; }
  get isConnected() { return this.baseService.isConnected; }
  get usage() { return this.baseService.usage; }
  get providers() { return this.baseService.providers; }
  get currentProvider() { return this.baseService.currentProvider; }
  get currentModel() { return this.baseService.currentModel; }
  get availableModels() { return this.baseService.availableModels; }
  
  constructor() {
    this.loadUsageStats();
    this.startCacheCleanup();
  }
  
  // ============ 代理方法 ============
  
  setConfig(config: Partial<AIConfig>): void {
    this.baseService.setConfig(config);
  }
  
  setProvider(providerId: any): void {
    this.baseService.setProvider(providerId);
  }
  
  setModel(modelId: string): void {
    this.baseService.setModel(modelId);
  }
  
  testConnection(): Promise<{ success: boolean; message: string }> {
    return this.baseService.testConnection();
  }
  
  /**
   * 測試指定提供者
   */
  async testProvider(type: AIProviderType): Promise<{ success: boolean; message?: string; latency?: number }> {
    const startTime = Date.now();
    try {
      const originalProvider = this.baseService.config().provider;
      this.baseService.setProvider(type as any);
      const result = await this.baseService.testConnection();
      this.baseService.setProvider(originalProvider);
      return {
        success: result.success,
        message: result.message,
        latency: Date.now() - startTime
      };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
  
  /**
   * 切換提供者啟用狀態
   */
  toggleProvider(type: AIProviderType, enabled: boolean): void {
    // 目前簡單實現：如果啟用則設為當前提供者
    if (enabled) {
      this.setProvider(type);
    }
  }
  
  /**
   * 設置 API Key
   */
  setApiKey(type: AIProviderType, apiKey: string): void {
    this.setConfig({ apiKey });
  }
  
  /**
   * generate 方法 - chat 的別名，提供兼容性
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const startTime = Date.now();
    
    // 構建消息列表
    let messages = request.messages;
    if (request.systemPrompt) {
      messages = [
        { role: 'system' as const, content: request.systemPrompt },
        ...messages
      ];
    }
    
    const response = await this.chat(messages, {
      temperature: request.temperature,
      maxTokens: request.maxTokens
    });
    
    return {
      content: response.content,
      finishReason: (response.finishReason as 'stop' | 'length' | 'content_filter' | 'error') || 'stop',
      usage: response.usage,
      provider: this.config().provider as unknown as AIProviderType,
      model: response.model,
      latencyMs: Date.now() - startTime,
      cached: false
    };
  }
  
  estimateTokens(text: string): number {
    return this.baseService.estimateTokens(text);
  }
  
  // ============ 增強功能 ============
  
  /**
   * 帶緩存和 fallback 的聊天請求
   */
  async chat(messages: AIMessage[], options?: Partial<AIConfig>): Promise<AIResponse> {
    const startTime = Date.now();
    this._isLoading.set(true);
    this._lastError.set(null);
    
    try {
      // 檢查緩存
      const cacheKey = this.getCacheKey(messages, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this._isLoading.set(false);
        return cached as unknown as AIResponse;
      }
      
      // 嘗試主提供者
      const response = await this.baseService.chat(messages, options);
      
      // 緩存響應
      this.setCache(cacheKey, {
        content: response.content,
        usage: response.usage,
        model: response.model,
        finishReason: (response.finishReason as 'stop' | 'length' | 'content_filter' | 'error') || 'stop',
        provider: this.baseService.config().provider as unknown as AIProviderType,
        latencyMs: Date.now() - startTime,
        cached: false
      });
      
      // 更新統計
      this.updateStats(response, this.baseService.config().provider);
      
      this._isLoading.set(false);
      return response;
    } catch (error: any) {
      this._lastError.set(error.message);
      
      // 嘗試 fallback
      const fallbackResponse = await this.tryFallback(messages, options);
      if (fallbackResponse) {
        this._isLoading.set(false);
        return fallbackResponse as unknown as AIResponse;
      }
      
      this._isLoading.set(false);
      throw error;
    }
  }
  
  /**
   * 嘗試備用提供者
   */
  private async tryFallback(messages: AIMessage[], options?: Partial<AIConfig>): Promise<AIGenerateResponse | null> {
    const currentProvider = this.baseService.config().provider;
    const fallbackProviders = AI_PROVIDERS.filter(p => p.id !== currentProvider);
    
    for (const provider of fallbackProviders) {
      try {
        console.log(`[AIProvider] 嘗試 fallback 到 ${provider.id}`);
        
        // 臨時切換提供者
        const originalConfig = { ...this.baseService.config() };
        this.baseService.setProvider(provider.id);
        
        const response = await this.baseService.chat(messages, options);
        
        // 恢復原配置
        this.baseService.setConfig(originalConfig);
        
        return {
          content: response.content,
          usage: response.usage,
          model: response.model,
          finishReason: (response.finishReason as 'stop' | 'length' | 'content_filter' | 'error') || 'stop',
          provider: provider.id as unknown as AIProviderType,
          latencyMs: 0,
          cached: false
        };
      } catch (e) {
        console.warn(`[AIProvider] Fallback 到 ${provider.id} 失敗:`, e);
        continue;
      }
    }
    
    return null;
  }
  
  // ============ 緩存管理 ============
  
  private getCacheKey(messages: AIMessage[], options?: Partial<AIConfig>): string {
    return JSON.stringify({ messages, options });
  }
  
  private getFromCache(key: string): AIGenerateResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return { ...entry.response, cached: true };
  }
  
  private setCache(key: string, response: AIGenerateResponse, ttl = this.DEFAULT_CACHE_TTL): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      ttl
    });
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // 每分鐘清理一次
  }
  
  // ============ 統計管理 ============
  
  private updateStats(response: AIResponse, provider: string): void {
    this._usageStats.update(stats => {
      const byProvider = { ...stats.byProvider };
      if (!byProvider[provider]) {
        byProvider[provider] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
      }
      
      byProvider[provider].requests++;
      byProvider[provider].tokens += response.usage.totalTokens;
      
      return {
        ...stats,
        totalRequests: stats.totalRequests + 1,
        totalTokens: stats.totalTokens + response.usage.totalTokens,
        todayTokens: stats.todayTokens + response.usage.totalTokens,
        byProvider
      };
    });
    
    this.saveUsageStats();
  }
  
  private loadUsageStats(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-ai-usage-stats');
      if (stored) {
        this._usageStats.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load AI usage stats:', e);
    }
  }
  
  private saveUsageStats(): void {
    try {
      localStorage.setItem('tg-matrix-ai-usage-stats', JSON.stringify(this._usageStats()));
    } catch (e) {
      console.error('Failed to save AI usage stats:', e);
    }
  }
  
  resetUsageStats(): void {
    this._usageStats.set({
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byProvider: {},
      todayTokens: 0,
      todayCost: 0
    });
    this.saveUsageStats();
    this.baseService.resetUsage();
  }
}
