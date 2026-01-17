/**
 * TG-AI智控王 AI提供者整合服務
 * AI Provider Integration Service v1.0
 * 
 * 功能：
 * - 多AI提供者支持 (OpenAI, Gemini, Claude, 本地模型)
 * - 統一的API接口
 * - 自動fallback和負載均衡
 * - 令牌管理和費用追蹤
 * - 緩存和速率限制
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// ============ 類型定義 ============

/** AI提供者類型 */
export type AIProviderType = 'openai' | 'gemini' | 'claude' | 'local' | 'custom';

/** AI模型配置 */
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

/** AI提供者配置 */
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
  priority: number; // 用於fallback排序
}

/** 對話消息 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 生成請求 */
export interface AIGenerateRequest {
  messages: AIMessage[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
  stream?: boolean;
  /** 指定提供者（可選，否則使用默認） */
  provider?: AIProviderType;
  /** 指定模型（可選） */
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
  byProvider: Record<AIProviderType, {
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
  key: string;
  response: AIGenerateResponse;
  expiresAt: number;
}

// ============ 默認配置 ============

const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    type: 'gemini',
    enabled: true,
    defaultModel: 'gemini-pro',
    models: [
      {
        provider: 'gemini',
        modelId: 'gemini-pro',
        displayName: 'Gemini Pro',
        maxTokens: 8192,
        temperature: 0.7
      },
      {
        provider: 'gemini',
        modelId: 'gemini-pro-vision',
        displayName: 'Gemini Pro Vision',
        maxTokens: 4096,
        temperature: 0.7
      }
    ],
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 60000 },
    priority: 1
  },
  {
    type: 'openai',
    enabled: false,
    defaultModel: 'gpt-4o-mini',
    models: [
      {
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        maxTokens: 4096,
        temperature: 0.7
      },
      {
        provider: 'openai',
        modelId: 'gpt-4o',
        displayName: 'GPT-4o',
        maxTokens: 4096,
        temperature: 0.7
      }
    ],
    rateLimit: { requestsPerMinute: 60, tokensPerMinute: 90000 },
    priority: 2
  },
  {
    type: 'claude',
    enabled: false,
    defaultModel: 'claude-3-haiku-20240307',
    models: [
      {
        provider: 'claude',
        modelId: 'claude-3-haiku-20240307',
        displayName: 'Claude 3 Haiku',
        maxTokens: 4096,
        temperature: 0.7
      },
      {
        provider: 'claude',
        modelId: 'claude-3-sonnet-20240229',
        displayName: 'Claude 3 Sonnet',
        maxTokens: 4096,
        temperature: 0.7
      }
    ],
    rateLimit: { requestsPerMinute: 50, tokensPerMinute: 80000 },
    priority: 3
  },
  {
    type: 'local',
    enabled: false,
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama2',
    models: [
      {
        provider: 'local',
        modelId: 'llama2',
        displayName: 'Llama 2',
        maxTokens: 4096,
        temperature: 0.7
      }
    ],
    rateLimit: { requestsPerMinute: 100, tokensPerMinute: 100000 },
    priority: 4
  }
];

// 價格配置（每1000 tokens，美元）
const TOKEN_PRICES: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 }
};

@Injectable({
  providedIn: 'root'
})
export class AIProviderService {
  private ipcService = inject(ElectronIpcService);
  
  // ============ 狀態 ============
  
  // 提供者配置
  private _providers = signal<AIProviderConfig[]>(DEFAULT_PROVIDERS);
  providers = computed(() => this._providers());
  
  // 當前活躍提供者
  private _activeProvider = signal<AIProviderType>('gemini');
  activeProvider = computed(() => this._activeProvider());
  
  // 使用統計
  private _usageStats = signal<AIUsageStats>({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    byProvider: {
      openai: { requests: 0, tokens: 0, cost: 0, errors: 0 },
      gemini: { requests: 0, tokens: 0, cost: 0, errors: 0 },
      claude: { requests: 0, tokens: 0, cost: 0, errors: 0 },
      local: { requests: 0, tokens: 0, cost: 0, errors: 0 },
      custom: { requests: 0, tokens: 0, cost: 0, errors: 0 }
    },
    todayTokens: 0,
    todayCost: 0
  });
  usageStats = computed(() => this._usageStats());
  
  // 速率限制追蹤
  private requestCounts: Map<AIProviderType, { count: number; resetAt: number }> = new Map();
  
  // 緩存
  private cache: Map<string, CacheEntry> = new Map();
  private cacheEnabled = true;
  private cacheTTL = 3600000; // 1小時
  
  // 可用的提供者
  availableProviders = computed(() => 
    this._providers().filter(p => p.enabled && this.hasValidConfig(p))
  );
  
  constructor() {
    this.loadConfig();
    this.loadStats();
  }
  
  // ============ 核心生成功能 ============
  
  /**
   * 生成AI回覆
   */
  async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const startTime = Date.now();
    
    // 檢查緩存
    if (this.cacheEnabled && !request.stream) {
      const cached = this.checkCache(request);
      if (cached) {
        return { ...cached, cached: true, latencyMs: Date.now() - startTime };
      }
    }
    
    // 選擇提供者
    const provider = this.selectProvider(request.provider);
    if (!provider) {
      throw new Error('沒有可用的AI提供者');
    }
    
    // 檢查速率限制
    if (!this.checkRateLimit(provider.type)) {
      // 嘗試fallback
      const fallback = this.getFallbackProvider(provider.type);
      if (fallback) {
        return this.generateWithProvider(request, fallback, startTime);
      }
      throw new Error('已達速率限制，請稍後再試');
    }
    
    return this.generateWithProvider(request, provider, startTime);
  }
  
  /**
   * 使用指定提供者生成
   */
  private async generateWithProvider(
    request: AIGenerateRequest,
    provider: AIProviderConfig,
    startTime: number
  ): Promise<AIGenerateResponse> {
    try {
      // 準備消息
      const messages = this.prepareMessages(request);
      
      // 選擇模型
      const modelId = request.model || provider.defaultModel;
      const model = provider.models.find(m => m.modelId === modelId) || provider.models[0];
      
      // 調用API
      let response: AIGenerateResponse;
      
      switch (provider.type) {
        case 'gemini':
          response = await this.callGemini(messages, model, provider);
          break;
        case 'openai':
          response = await this.callOpenAI(messages, model, provider);
          break;
        case 'claude':
          response = await this.callClaude(messages, model, provider);
          break;
        case 'local':
          response = await this.callLocal(messages, model, provider);
          break;
        default:
          throw new Error(`不支持的提供者: ${provider.type}`);
      }
      
      response.latencyMs = Date.now() - startTime;
      response.cached = false;
      
      // 更新統計
      this.updateStats(provider.type, response.usage, modelId);
      
      // 更新速率限制計數
      this.incrementRateCount(provider.type);
      
      // 緩存響應
      if (this.cacheEnabled) {
        this.addToCache(request, response);
      }
      
      return response;
      
    } catch (error: any) {
      // 記錄錯誤
      this._usageStats.update(stats => ({
        ...stats,
        byProvider: {
          ...stats.byProvider,
          [provider.type]: {
            ...stats.byProvider[provider.type],
            errors: stats.byProvider[provider.type].errors + 1
          }
        }
      }));
      
      // 嘗試fallback
      const fallback = this.getFallbackProvider(provider.type);
      if (fallback) {
        console.log(`[AIProvider] Falling back from ${provider.type} to ${fallback.type}`);
        return this.generateWithProvider(request, fallback, startTime);
      }
      
      throw error;
    }
  }
  
  /**
   * 準備消息列表
   */
  private prepareMessages(request: AIGenerateRequest): AIMessage[] {
    const messages: AIMessage[] = [];
    
    // 添加系統提示
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    // 添加對話消息
    messages.push(...request.messages);
    
    return messages;
  }
  
  // ============ 各提供者實現 ============
  
  /**
   * 調用 Gemini API
   */
  private async callGemini(
    messages: AIMessage[],
    model: AIModelConfig,
    provider: AIProviderConfig
  ): Promise<AIGenerateResponse> {
    // 通過IPC調用後端
    const result = await this.ipcService.invoke('ai-generate', {
      provider: 'gemini',
      model: model.modelId,
      messages,
      apiKey: provider.apiKey,
      temperature: model.temperature,
      maxTokens: model.maxTokens
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Gemini API調用失敗');
    }
    
    return {
      content: result.data.content,
      finishReason: result.data.finishReason || 'stop',
      usage: {
        promptTokens: result.data.usage?.promptTokens || 0,
        completionTokens: result.data.usage?.completionTokens || 0,
        totalTokens: result.data.usage?.totalTokens || 0
      },
      provider: 'gemini',
      model: model.modelId,
      latencyMs: 0,
      cached: false
    };
  }
  
  /**
   * 調用 OpenAI API
   */
  private async callOpenAI(
    messages: AIMessage[],
    model: AIModelConfig,
    provider: AIProviderConfig
  ): Promise<AIGenerateResponse> {
    const result = await this.ipcService.invoke('ai-generate', {
      provider: 'openai',
      model: model.modelId,
      messages,
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      temperature: model.temperature,
      maxTokens: model.maxTokens
    });
    
    if (!result.success) {
      throw new Error(result.error || 'OpenAI API調用失敗');
    }
    
    return {
      content: result.data.content,
      finishReason: result.data.finishReason || 'stop',
      usage: {
        promptTokens: result.data.usage?.promptTokens || 0,
        completionTokens: result.data.usage?.completionTokens || 0,
        totalTokens: result.data.usage?.totalTokens || 0
      },
      provider: 'openai',
      model: model.modelId,
      latencyMs: 0,
      cached: false
    };
  }
  
  /**
   * 調用 Claude API
   */
  private async callClaude(
    messages: AIMessage[],
    model: AIModelConfig,
    provider: AIProviderConfig
  ): Promise<AIGenerateResponse> {
    const result = await this.ipcService.invoke('ai-generate', {
      provider: 'claude',
      model: model.modelId,
      messages,
      apiKey: provider.apiKey,
      temperature: model.temperature,
      maxTokens: model.maxTokens
    });
    
    if (!result.success) {
      throw new Error(result.error || 'Claude API調用失敗');
    }
    
    return {
      content: result.data.content,
      finishReason: result.data.finishReason || 'stop',
      usage: {
        promptTokens: result.data.usage?.promptTokens || 0,
        completionTokens: result.data.usage?.completionTokens || 0,
        totalTokens: result.data.usage?.totalTokens || 0
      },
      provider: 'claude',
      model: model.modelId,
      latencyMs: 0,
      cached: false
    };
  }
  
  /**
   * 調用本地模型 (Ollama)
   */
  private async callLocal(
    messages: AIMessage[],
    model: AIModelConfig,
    provider: AIProviderConfig
  ): Promise<AIGenerateResponse> {
    const result = await this.ipcService.invoke('ai-generate', {
      provider: 'local',
      model: model.modelId,
      messages,
      baseUrl: provider.baseUrl,
      temperature: model.temperature
    });
    
    if (!result.success) {
      throw new Error(result.error || '本地模型調用失敗');
    }
    
    return {
      content: result.data.content,
      finishReason: 'stop',
      usage: {
        promptTokens: result.data.usage?.promptTokens || this.estimateTokens(messages),
        completionTokens: result.data.usage?.completionTokens || this.estimateTokens([{ role: 'assistant', content: result.data.content }]),
        totalTokens: 0
      },
      provider: 'local',
      model: model.modelId,
      latencyMs: 0,
      cached: false
    };
  }
  
  // ============ 提供者選擇 ============
  
  /**
   * 選擇提供者
   */
  private selectProvider(preferred?: AIProviderType): AIProviderConfig | null {
    const providers = this.availableProviders();
    
    if (preferred) {
      const found = providers.find(p => p.type === preferred);
      if (found) return found;
    }
    
    // 按優先級返回第一個
    return providers.sort((a, b) => a.priority - b.priority)[0] || null;
  }
  
  /**
   * 獲取fallback提供者
   */
  private getFallbackProvider(excludeType: AIProviderType): AIProviderConfig | null {
    const providers = this.availableProviders()
      .filter(p => p.type !== excludeType)
      .sort((a, b) => a.priority - b.priority);
    
    return providers[0] || null;
  }
  
  /**
   * 檢查提供者配置是否有效
   */
  private hasValidConfig(provider: AIProviderConfig): boolean {
    if (provider.type === 'local') {
      return !!provider.baseUrl;
    }
    return !!provider.apiKey || provider.type === 'gemini'; // Gemini可能使用環境變量
  }
  
  // ============ 速率限制 ============
  
  /**
   * 檢查速率限制
   */
  private checkRateLimit(providerType: AIProviderType): boolean {
    const count = this.requestCounts.get(providerType);
    if (!count) return true;
    
    const now = Date.now();
    if (now >= count.resetAt) {
      this.requestCounts.delete(providerType);
      return true;
    }
    
    const provider = this._providers().find(p => p.type === providerType);
    if (!provider) return false;
    
    return count.count < provider.rateLimit.requestsPerMinute;
  }
  
  /**
   * 增加速率計數
   */
  private incrementRateCount(providerType: AIProviderType): void {
    const now = Date.now();
    const count = this.requestCounts.get(providerType);
    
    if (!count || now >= count.resetAt) {
      this.requestCounts.set(providerType, {
        count: 1,
        resetAt: now + 60000
      });
    } else {
      count.count++;
    }
  }
  
  // ============ 緩存 ============
  
  /**
   * 生成緩存鍵
   */
  private generateCacheKey(request: AIGenerateRequest): string {
    const keyData = {
      messages: request.messages.map(m => `${m.role}:${m.content}`).join('|'),
      systemPrompt: request.systemPrompt,
      provider: request.provider,
      model: request.model
    };
    return JSON.stringify(keyData);
  }
  
  /**
   * 檢查緩存
   */
  private checkCache(request: AIGenerateRequest): AIGenerateResponse | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);
    
    if (entry && entry.expiresAt > Date.now()) {
      return entry.response;
    }
    
    if (entry) {
      this.cache.delete(key);
    }
    
    return null;
  }
  
  /**
   * 添加到緩存
   */
  private addToCache(request: AIGenerateRequest, response: AIGenerateResponse): void {
    const key = this.generateCacheKey(request);
    this.cache.set(key, {
      key,
      response,
      expiresAt: Date.now() + this.cacheTTL
    });
    
    // 清理過期緩存
    this.cleanCache();
  }
  
  /**
   * 清理過期緩存
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    
    // 限制緩存大小
    if (this.cache.size > 1000) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      
      for (let i = 0; i < entries.length - 500; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
  
  // ============ 統計 ============
  
  /**
   * 更新使用統計
   */
  private updateStats(
    provider: AIProviderType,
    usage: AIGenerateResponse['usage'],
    modelId: string
  ): void {
    const cost = this.calculateCost(modelId, usage);
    
    this._usageStats.update(stats => ({
      totalRequests: stats.totalRequests + 1,
      totalTokens: stats.totalTokens + usage.totalTokens,
      totalCost: stats.totalCost + cost,
      byProvider: {
        ...stats.byProvider,
        [provider]: {
          requests: stats.byProvider[provider].requests + 1,
          tokens: stats.byProvider[provider].tokens + usage.totalTokens,
          cost: stats.byProvider[provider].cost + cost,
          errors: stats.byProvider[provider].errors
        }
      },
      todayTokens: stats.todayTokens + usage.totalTokens,
      todayCost: stats.todayCost + cost
    }));
    
    this.saveStats();
  }
  
  /**
   * 計算費用
   */
  private calculateCost(modelId: string, usage: AIGenerateResponse['usage']): number {
    const prices = TOKEN_PRICES[modelId];
    if (!prices) return 0;
    
    return (usage.promptTokens / 1000 * prices.input) +
           (usage.completionTokens / 1000 * prices.output);
  }
  
  /**
   * 估算令牌數（用於本地模型）
   */
  private estimateTokens(messages: AIMessage[]): number {
    const text = messages.map(m => m.content).join(' ');
    // 簡單估算：每4個字符約1個token
    return Math.ceil(text.length / 4);
  }
  
  // ============ 配置管理 ============
  
  /**
   * 設置提供者配置
   */
  setProviderConfig(type: AIProviderType, config: Partial<AIProviderConfig>): void {
    this._providers.update(providers =>
      providers.map(p => p.type === type ? { ...p, ...config } : p)
    );
    this.saveConfig();
  }
  
  /**
   * 啟用/禁用提供者
   */
  toggleProvider(type: AIProviderType, enabled: boolean): void {
    this.setProviderConfig(type, { enabled });
  }
  
  /**
   * 設置API密鑰
   */
  setApiKey(type: AIProviderType, apiKey: string): void {
    this.setProviderConfig(type, { apiKey });
  }
  
  /**
   * 設置活躍提供者
   */
  setActiveProvider(type: AIProviderType): void {
    const provider = this._providers().find(p => p.type === type);
    if (provider && provider.enabled) {
      this._activeProvider.set(type);
      this.saveConfig();
    }
  }
  
  /**
   * 獲取提供者配置
   */
  getProviderConfig(type: AIProviderType): AIProviderConfig | undefined {
    return this._providers().find(p => p.type === type);
  }
  
  /**
   * 測試提供者連接
   */
  async testProvider(type: AIProviderType): Promise<{ success: boolean; message: string; latency?: number }> {
    const provider = this._providers().find(p => p.type === type);
    if (!provider) {
      return { success: false, message: '提供者不存在' };
    }
    
    if (!this.hasValidConfig(provider)) {
      return { success: false, message: '配置不完整' };
    }
    
    try {
      const startTime = Date.now();
      const response = await this.generate({
        messages: [{ role: 'user', content: '你好' }],
        provider: type,
        maxTokens: 10
      });
      
      return {
        success: true,
        message: `連接成功，模型: ${response.model}`,
        latency: response.latencyMs
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || '連接失敗'
      };
    }
  }
  
  // ============ 便捷方法 ============
  
  /**
   * 簡單對話生成
   */
  async chat(message: string, systemPrompt?: string): Promise<string> {
    const response = await this.generate({
      messages: [{ role: 'user', content: message }],
      systemPrompt
    });
    return response.content;
  }
  
  /**
   * 帶歷史的對話
   */
  async chatWithHistory(
    message: string,
    history: AIMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const response = await this.generate({
      messages: [...history, { role: 'user', content: message }],
      systemPrompt
    });
    return response.content;
  }
  
  // ============ 持久化 ============
  
  private saveConfig(): void {
    try {
      // 不保存API密鑰到localStorage，只保存其他配置
      const safeProviders = this._providers().map(p => ({
        ...p,
        apiKey: undefined
      }));
      localStorage.setItem('tgai-ai-providers', JSON.stringify(safeProviders));
      localStorage.setItem('tgai-ai-active-provider', this._activeProvider());
    } catch (e) {
      console.error('[AIProvider] Save config error:', e);
    }
  }
  
  private loadConfig(): void {
    try {
      const data = localStorage.getItem('tgai-ai-providers');
      if (data) {
        const saved = JSON.parse(data);
        // 合併保存的配置
        this._providers.update(providers =>
          providers.map(p => {
            const savedP = saved.find((s: any) => s.type === p.type);
            return savedP ? { ...p, ...savedP } : p;
          })
        );
      }
      
      const activeProvider = localStorage.getItem('tgai-ai-active-provider');
      if (activeProvider) {
        this._activeProvider.set(activeProvider as AIProviderType);
      }
    } catch (e) {
      console.error('[AIProvider] Load config error:', e);
    }
  }
  
  private saveStats(): void {
    try {
      localStorage.setItem('tgai-ai-usage-stats', JSON.stringify({
        stats: this._usageStats(),
        date: new Date().toDateString()
      }));
    } catch (e) {
      console.error('[AIProvider] Save stats error:', e);
    }
  }
  
  private loadStats(): void {
    try {
      const data = localStorage.getItem('tgai-ai-usage-stats');
      if (data) {
        const { stats, date } = JSON.parse(data);
        
        // 如果是今天的數據，保留todayTokens和todayCost
        if (date === new Date().toDateString()) {
          this._usageStats.set(stats);
        } else {
          // 重置今日統計
          this._usageStats.set({
            ...stats,
            todayTokens: 0,
            todayCost: 0
          });
        }
      }
    } catch (e) {
      console.error('[AIProvider] Load stats error:', e);
    }
  }
}
