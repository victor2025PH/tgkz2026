/**
 * TG-AI智控王 多模型提供者服務
 * Multi-Model Provider Service v1.0
 * 
 * 💡 設計思考：
 * 1. 統一接口 - 不同模型使用相同 API
 * 2. 自動切換 - 主模型失敗自動切換備用
 * 3. 成本優化 - 根據任務複雜度選擇模型
 * 4. 離線支持 - 本地模型無需網絡
 * 5. 流式輸出 - 支持 SSE 流式響應
 */

import { Injectable, signal, computed, inject } from '@angular/core';

// ============ 類型定義 ============

export type ModelProvider = 'openai' | 'claude' | 'gemini' | 'local' | 'custom';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  name: string;
  displayName: string;
  maxTokens: number;
  contextWindow: number;
  costPer1kTokens: number;    // 每千 token 成本（美元）
  capabilities: ModelCapability[];
  isDefault?: boolean;
  isEnabled?: boolean;
}

export type ModelCapability = 
  | 'chat'           // 對話
  | 'completion'     // 補全
  | 'embedding'      // 嵌入
  | 'vision'         // 視覺
  | 'function'       // 函數調用
  | 'streaming'      // 流式輸出
  | 'offline';       // 離線可用

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  functions?: FunctionDefinition[];
}

export interface ChatResponse {
  id: string;
  model: string;
  content: string;
  finishReason: 'stop' | 'length' | 'function_call';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  functionCall?: {
    name: string;
    arguments: Record<string, any>;
  };
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface StreamChunk {
  id: string;
  delta: string;
  finishReason?: string;
}

export interface ModelStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  errorRate: number;
  byModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
    errors: number;
  }>;
}

// ============ 預設模型配置 ============

const PRESET_MODELS: ModelConfig[] = [
  // OpenAI
  {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'gpt-4-turbo-preview',
    displayName: 'GPT-4 Turbo',
    maxTokens: 4096,
    contextWindow: 128000,
    costPer1kTokens: 0.01,
    capabilities: ['chat', 'completion', 'function', 'streaming', 'vision']
  },
  {
    id: 'gpt-4',
    provider: 'openai',
    name: 'gpt-4',
    displayName: 'GPT-4',
    maxTokens: 8192,
    contextWindow: 8192,
    costPer1kTokens: 0.03,
    capabilities: ['chat', 'completion', 'function', 'streaming']
  },
  {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    maxTokens: 4096,
    contextWindow: 16384,
    costPer1kTokens: 0.001,
    capabilities: ['chat', 'completion', 'function', 'streaming'],
    isDefault: true
  },
  
  // Claude
  {
    id: 'claude-3-opus',
    provider: 'claude',
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kTokens: 0.015,
    capabilities: ['chat', 'completion', 'streaming', 'vision']
  },
  {
    id: 'claude-3-sonnet',
    provider: 'claude',
    name: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kTokens: 0.003,
    capabilities: ['chat', 'completion', 'streaming', 'vision']
  },
  {
    id: 'claude-3-haiku',
    provider: 'claude',
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    maxTokens: 4096,
    contextWindow: 200000,
    costPer1kTokens: 0.00025,
    capabilities: ['chat', 'completion', 'streaming']
  },
  
  // Google Gemini
  {
    id: 'gemini-pro',
    provider: 'gemini',
    name: 'gemini-pro',
    displayName: 'Gemini Pro',
    maxTokens: 8192,
    contextWindow: 32000,
    costPer1kTokens: 0.0005,
    capabilities: ['chat', 'completion', 'streaming']
  },
  
  // 本地模型（示例）
  {
    id: 'local-llama',
    provider: 'local',
    name: 'llama-7b',
    displayName: '本地 LLaMA',
    maxTokens: 2048,
    contextWindow: 4096,
    costPer1kTokens: 0,
    capabilities: ['chat', 'completion', 'offline']
  }
];

// ============ 模型適配器接口 ============

interface IModelAdapter {
  provider: ModelProvider;
  chat(request: ChatRequest): Promise<ChatResponse>;
  chatStream(request: ChatRequest): AsyncGenerator<StreamChunk>;
  embed?(texts: string[]): Promise<number[][]>;
}

// ============ OpenAI 適配器 ============

class OpenAIAdapter implements IModelAdapter {
  provider: ModelProvider = 'openai';
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        functions: request.functions,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const choice = data.choices[0];
    
    return {
      id: data.id,
      model: data.model,
      content: choice.message.content || '',
      finishReason: choice.finish_reason,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      },
      functionCall: choice.message.function_call ? {
        name: choice.message.function_call.name,
        arguments: JSON.parse(choice.message.function_call.arguments)
      } : undefined
    };
  }
  
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: request.model || 'gpt-3.5-turbo',
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens,
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const json = JSON.parse(data);
            const delta = json.choices[0]?.delta?.content || '';
            if (delta) {
              yield {
                id: json.id,
                delta,
                finishReason: json.choices[0]?.finish_reason
              };
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }
    }
  }
  
  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

// ============ Claude 適配器 ============

class ClaudeAdapter implements IModelAdapter {
  provider: ModelProvider = 'claude';
  private apiKey: string;
  private baseUrl: string;
  
  constructor(apiKey: string, baseUrl = 'https://api.anthropic.com/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 轉換消息格式
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-sonnet-20240229',
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }))
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: data.id,
      model: data.model,
      content: data.content[0]?.text || '',
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      }
    };
  }
  
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const otherMessages = request.messages.filter(m => m.role !== 'system');
    
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: request.model || 'claude-3-sonnet-20240229',
        max_tokens: request.maxTokens || 4096,
        system: systemMessage?.content,
        messages: otherMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          try {
            const json = JSON.parse(data);
            if (json.type === 'content_block_delta') {
              yield {
                id: json.index?.toString() || '0',
                delta: json.delta?.text || '',
                finishReason: undefined
              };
            }
            if (json.type === 'message_stop') {
              return;
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }
    }
  }
}

// ============ 本地模型適配器 ============

class LocalModelAdapter implements IModelAdapter {
  provider: ModelProvider = 'local';
  private baseUrl: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }
  
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // 假設使用 Ollama API
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama2',
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local model error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      id: `local_${Date.now()}`,
      model: request.model || 'llama2',
      content: data.message?.content || '',
      finishReason: 'stop',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      }
    };
  }
  
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model || 'llama2',
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Local model error: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              yield {
                id: `local_${Date.now()}`,
                delta: json.message.content,
                finishReason: json.done ? 'stop' : undefined
              };
            }
          } catch {
            // 忽略解析錯誤
          }
        }
      }
    }
  }
}

// ============ 主服務 ============

@Injectable({
  providedIn: 'root'
})
export class ModelProviderService {
  // 配置
  private models = new Map<string, ModelConfig>();
  private adapters = new Map<ModelProvider, IModelAdapter>();
  private apiKeys = new Map<ModelProvider, string>();
  
  // 當前選擇
  private _currentModel = signal<ModelConfig | null>(null);
  currentModel = computed(() => this._currentModel());
  
  // 統計
  private _stats = signal<ModelStats>({
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
    errorRate: 0,
    byModel: {}
  });
  stats = computed(() => this._stats());
  
  private requestTimes: number[] = [];
  private errorCount = 0;
  
  constructor() {
    this.initializeModels();
    this.loadConfig();
  }
  
  // ============ 初始化 ============
  
  private initializeModels(): void {
    for (const model of PRESET_MODELS) {
      this.models.set(model.id, { ...model, isEnabled: true });
    }
    
    // 設置默認模型
    const defaultModel = PRESET_MODELS.find(m => m.isDefault);
    if (defaultModel) {
      this._currentModel.set(defaultModel);
    }
  }
  
  private loadConfig(): void {
    const stored = localStorage.getItem('tgai-model-config');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        
        // 載入 API Keys
        if (config.apiKeys) {
          for (const [provider, key] of Object.entries(config.apiKeys)) {
            this.setApiKey(provider as ModelProvider, key as string);
          }
        }
        
        // 載入當前模型
        if (config.currentModel) {
          const model = this.models.get(config.currentModel);
          if (model) {
            this._currentModel.set(model);
          }
        }
      } catch {
        // 忽略解析錯誤
      }
    }
  }
  
  private saveConfig(): void {
    const config = {
      apiKeys: Object.fromEntries(this.apiKeys),
      currentModel: this._currentModel()?.id
    };
    localStorage.setItem('tgai-model-config', JSON.stringify(config));
  }
  
  // ============ 配置管理 ============
  
  /**
   * 設置 API Key
   */
  setApiKey(provider: ModelProvider, apiKey: string): void {
    this.apiKeys.set(provider, apiKey);
    
    // 創建適配器
    switch (provider) {
      case 'openai':
        this.adapters.set(provider, new OpenAIAdapter(apiKey));
        break;
      case 'claude':
        this.adapters.set(provider, new ClaudeAdapter(apiKey));
        break;
      case 'local':
        this.adapters.set(provider, new LocalModelAdapter());
        break;
    }
    
    this.saveConfig();
  }
  
  /**
   * 選擇模型
   */
  selectModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (model) {
      this._currentModel.set(model);
      this.saveConfig();
      return true;
    }
    return false;
  }
  
  /**
   * 獲取可用模型列表
   */
  getAvailableModels(): ModelConfig[] {
    return [...this.models.values()].filter(m => {
      if (!m.isEnabled) return false;
      if (m.provider === 'local') return true;
      return this.apiKeys.has(m.provider);
    });
  }
  
  /**
   * 添加自定義模型
   */
  addCustomModel(config: Omit<ModelConfig, 'id'>): ModelConfig {
    const model: ModelConfig = {
      ...config,
      id: `custom_${Date.now()}`
    };
    this.models.set(model.id, model);
    return model;
  }
  
  // ============ 對話 API ============
  
  /**
   * 發送對話請求
   * 
   * 💡 自動選擇最佳模型並處理故障轉移
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const model = this.selectBestModel(request);
    
    if (!model) {
      throw new Error('No available model');
    }
    
    const adapter = this.getAdapter(model.provider);
    if (!adapter) {
      throw new Error(`No adapter for provider: ${model.provider}`);
    }
    
    try {
      const response = await adapter.chat({
        ...request,
        model: model.name
      });
      
      this.recordSuccess(model, response, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.recordError(model);
      
      // 嘗試備用模型
      const fallback = this.getFallbackModel(model);
      if (fallback) {
        console.log(`[ModelProvider] Falling back to ${fallback.displayName}`);
        return this.chatWithModel(fallback, request);
      }
      
      throw error;
    }
  }
  
  /**
   * 使用指定模型對話
   */
  async chatWithModel(model: ModelConfig, request: ChatRequest): Promise<ChatResponse> {
    const adapter = this.getAdapter(model.provider);
    if (!adapter) {
      throw new Error(`No adapter for provider: ${model.provider}`);
    }
    
    const startTime = Date.now();
    
    try {
      const response = await adapter.chat({
        ...request,
        model: model.name
      });
      
      this.recordSuccess(model, response, Date.now() - startTime);
      return response;
      
    } catch (error) {
      this.recordError(model);
      throw error;
    }
  }
  
  /**
   * 流式對話
   */
  async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const model = this.selectBestModel(request);
    
    if (!model) {
      throw new Error('No available model');
    }
    
    if (!model.capabilities.includes('streaming')) {
      // 不支持流式，使用普通請求模擬
      const response = await this.chat(request);
      yield {
        id: response.id,
        delta: response.content,
        finishReason: response.finishReason
      };
      return;
    }
    
    const adapter = this.getAdapter(model.provider);
    if (!adapter) {
      throw new Error(`No adapter for provider: ${model.provider}`);
    }
    
    yield* adapter.chatStream({
      ...request,
      model: model.name
    });
  }
  
  // ============ 模型選擇 ============
  
  /**
   * 選擇最佳模型
   * 
   * 💡 根據任務需求、成本、可用性選擇
   */
  private selectBestModel(request: ChatRequest): ModelConfig | null {
    // 如果指定了模型
    if (request.model) {
      return this.models.get(request.model) || null;
    }
    
    // 使用當前選擇的模型
    const current = this._currentModel();
    if (current && this.isModelAvailable(current)) {
      return current;
    }
    
    // 選擇第一個可用模型
    const available = this.getAvailableModels();
    return available[0] || null;
  }
  
  /**
   * 獲取備用模型
   */
  private getFallbackModel(failed: ModelConfig): ModelConfig | null {
    const available = this.getAvailableModels()
      .filter(m => m.id !== failed.id)
      .sort((a, b) => a.costPer1kTokens - b.costPer1kTokens);
    
    return available[0] || null;
  }
  
  private isModelAvailable(model: ModelConfig): boolean {
    if (model.provider === 'local') return true;
    return this.adapters.has(model.provider);
  }
  
  private getAdapter(provider: ModelProvider): IModelAdapter | undefined {
    return this.adapters.get(provider);
  }
  
  // ============ 統計記錄 ============
  
  private recordSuccess(model: ModelConfig, response: ChatResponse, latency: number): void {
    this.requestTimes.push(latency);
    if (this.requestTimes.length > 100) {
      this.requestTimes.shift();
    }
    
    const cost = (response.usage.totalTokens / 1000) * model.costPer1kTokens;
    
    this._stats.update(stats => {
      const modelStats = stats.byModel[model.id] || { requests: 0, tokens: 0, cost: 0, errors: 0 };
      
      return {
        totalRequests: stats.totalRequests + 1,
        totalTokens: stats.totalTokens + response.usage.totalTokens,
        totalCost: stats.totalCost + cost,
        avgLatency: this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length,
        errorRate: this.errorCount / (stats.totalRequests + 1),
        byModel: {
          ...stats.byModel,
          [model.id]: {
            requests: modelStats.requests + 1,
            tokens: modelStats.tokens + response.usage.totalTokens,
            cost: modelStats.cost + cost,
            errors: modelStats.errors
          }
        }
      };
    });
  }
  
  private recordError(model: ModelConfig): void {
    this.errorCount++;
    
    this._stats.update(stats => {
      const modelStats = stats.byModel[model.id] || { requests: 0, tokens: 0, cost: 0, errors: 0 };
      
      return {
        ...stats,
        errorRate: this.errorCount / (stats.totalRequests + 1),
        byModel: {
          ...stats.byModel,
          [model.id]: {
            ...modelStats,
            errors: modelStats.errors + 1
          }
        }
      };
    });
  }
  
  // ============ 輔助功能 ============
  
  /**
   * 估算 token 數
   */
  estimateTokens(text: string): number {
    // 粗略估算：英文 1 token ≈ 4 字符，中文 1 token ≈ 1.5 字符
    const englishChars = text.replace(/[\u4e00-\u9fa5]/g, '').length;
    const chineseChars = text.length - englishChars;
    return Math.ceil(englishChars / 4 + chineseChars / 1.5);
  }
  
  /**
   * 估算成本
   */
  estimateCost(tokens: number, modelId?: string): number {
    const model = modelId ? this.models.get(modelId) : this._currentModel();
    if (!model) return 0;
    return (tokens / 1000) * model.costPer1kTokens;
  }
  
  /**
   * 測試連接
   */
  async testConnection(provider: ModelProvider): Promise<boolean> {
    const adapter = this.adapters.get(provider);
    if (!adapter) return false;
    
    try {
      await adapter.chat({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5
      });
      return true;
    } catch {
      return false;
    }
  }
}
