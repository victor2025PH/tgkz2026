/**
 * AI Provider Service
 * AI 多模型提供商服務
 * 
 * 支持：
 * - Google Gemini
 * - OpenAI GPT
 * - Anthropic Claude
 * - 本地模型 (Ollama)
 * - DeepSeek
 */
import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

export type AIProviderType = 'gemini' | 'openai' | 'claude' | 'ollama' | 'deepseek';

export interface AIProvider {
  id: AIProviderType;
  name: string;
  icon: string;
  description: string;
  models: AIModel[];
  requiresApiKey: boolean;
  baseUrl?: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  pricePerMToken?: number;  // 每百萬 token 價格（美元）
  capabilities: string[];
}

export interface AIConfig {
  provider: AIProviderType;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  systemPrompt: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

// ============ 提供商定義 ============

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    icon: '✨',
    description: '谷歌最新 AI 模型，快速且多語言支持',
    requiresApiKey: true,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: '強大的多模態模型',
        contextLength: 2000000,
        pricePerMToken: 3.5,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: '快速高效的輕量模型',
        contextLength: 1000000,
        pricePerMToken: 0.075,
        capabilities: ['text', 'vision', 'code']
      },
      {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (實驗)',
        description: '最新實驗版本',
        contextLength: 1000000,
        pricePerMToken: 0,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    icon: '🤖',
    description: 'ChatGPT 背後的 AI 模型',
    requiresApiKey: true,
    baseUrl: 'https://api.openai.com/v1',
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: '最新旗艦模型',
        contextLength: 128000,
        pricePerMToken: 5,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: '經濟實惠的小型模型',
        contextLength: 128000,
        pricePerMToken: 0.15,
        capabilities: ['text', 'vision', 'code']
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: '高性能模型',
        contextLength: 128000,
        pricePerMToken: 10,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      },
      {
        id: 'o1-preview',
        name: 'o1 Preview',
        description: '深度推理模型',
        contextLength: 128000,
        pricePerMToken: 15,
        capabilities: ['text', 'code', 'reasoning', 'math']
      }
    ]
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    icon: '🧠',
    description: '安全可靠的 AI 助手',
    requiresApiKey: true,
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        description: '最佳綜合性能',
        contextLength: 200000,
        pricePerMToken: 3,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        description: '最強推理能力',
        contextLength: 200000,
        pricePerMToken: 15,
        capabilities: ['text', 'vision', 'code', 'reasoning']
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        description: '快速輕量',
        contextLength: 200000,
        pricePerMToken: 0.25,
        capabilities: ['text', 'vision', 'code']
      }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🔍',
    description: '高性價比的中國 AI 模型',
    requiresApiKey: true,
    baseUrl: 'https://api.deepseek.com',
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: '通用對話模型',
        contextLength: 64000,
        pricePerMToken: 0.14,
        capabilities: ['text', 'code']
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        description: '專業編程模型',
        contextLength: 64000,
        pricePerMToken: 0.14,
        capabilities: ['code', 'text']
      }
    ]
  },
  {
    id: 'ollama',
    name: 'Ollama (本地)',
    icon: '🦙',
    description: '本地運行，完全隱私',
    requiresApiKey: false,
    baseUrl: 'http://localhost:11434',
    models: [
      {
        id: 'llama3.2',
        name: 'Llama 3.2',
        description: 'Meta 最新開源模型',
        contextLength: 128000,
        capabilities: ['text', 'code']
      },
      {
        id: 'qwen2.5',
        name: 'Qwen 2.5',
        description: '阿里通義千問',
        contextLength: 128000,
        capabilities: ['text', 'code', 'reasoning']
      },
      {
        id: 'mistral',
        name: 'Mistral',
        description: '歐洲開源模型',
        contextLength: 32000,
        capabilities: ['text', 'code']
      },
      {
        id: 'codellama',
        name: 'Code Llama',
        description: '專業編程模型',
        contextLength: 16000,
        capabilities: ['code']
      }
    ]
  }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AIProviderService {
  
  // 當前配置
  private _config = signal<AIConfig>({
    provider: 'gemini',
    model: 'gemini-1.5-flash',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 0.9,
    systemPrompt: ''
  });
  
  config = this._config.asReadonly();
  
  // 連接狀態
  private _isConnected = signal(false);
  isConnected = this._isConnected.asReadonly();
  
  // 使用統計
  private _usage = signal({
    totalTokens: 0,
    totalCalls: 0,
    totalCost: 0
  });
  usage = this._usage.asReadonly();
  
  // 計算屬性
  providers = AI_PROVIDERS;
  
  currentProvider = computed(() => 
    AI_PROVIDERS.find(p => p.id === this._config().provider)
  );
  
  currentModel = computed(() => 
    this.currentProvider()?.models.find(m => m.id === this._config().model)
  );
  
  availableModels = computed(() => 
    this.currentProvider()?.models || []
  );
  
  constructor() {
    this.loadConfig();
  }
  
  /**
   * 設置配置
   */
  setConfig(config: Partial<AIConfig>): void {
    this._config.update(c => ({ ...c, ...config }));
    this.saveConfig();
  }
  
  /**
   * 切換提供商
   */
  setProvider(providerId: AIProviderType): void {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      this.setConfig({
        provider: providerId,
        model: provider.models[0]?.id || '',
        baseUrl: provider.baseUrl
      });
    }
  }
  
  /**
   * 切換模型
   */
  setModel(modelId: string): void {
    this.setConfig({ model: modelId });
  }
  
  /**
   * 測試連接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Hello, please respond with "OK".' }
      ]);
      
      if (response.content) {
        this._isConnected.set(true);
        return { success: true, message: '連接成功！' };
      }
      
      return { success: false, message: '無響應' };
    } catch (error: any) {
      this._isConnected.set(false);
      return { success: false, message: error.message || '連接失敗' };
    }
  }
  
  /**
   * 發送聊天請求
   */
  async chat(messages: AIMessage[], options?: Partial<AIConfig>): Promise<AIResponse> {
    const config = { ...this._config(), ...options };
    
    // 🔧 確保 baseUrl 正確設置
    if (!config.baseUrl || config.baseUrl.startsWith('/')) {
      const provider = AI_PROVIDERS.find(p => p.id === config.provider);
      if (provider?.baseUrl) {
        config.baseUrl = provider.baseUrl;
        console.log(`[AIProvider] 使用提供商默認 baseUrl: ${config.baseUrl}`);
      }
    }
    
    // 🔧 驗證配置
    if (!config.baseUrl) {
      throw new Error(`未配置 ${config.provider} 的 API 端點`);
    }
    
    if (config.provider !== 'ollama' && !config.apiKey) {
      throw new Error(`未配置 ${config.provider} 的 API Key`);
    }
    
    console.log(`[AIProvider] 調用 ${config.provider}/${config.model}, baseUrl: ${config.baseUrl}`);
    
    switch (config.provider) {
      case 'gemini':
        return this.chatGemini(messages, config);
      case 'openai':
        return this.chatOpenAI(messages, config);
      case 'claude':
        return this.chatClaude(messages, config);
      case 'deepseek':
        return this.chatDeepSeek(messages, config);
      case 'ollama':
        return this.chatOllama(messages, config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
  
  /**
   * 流式聊天
   */
  async *chatStream(messages: AIMessage[], options?: Partial<AIConfig>): AsyncGenerator<string> {
    const config = { ...this._config(), ...options };
    
    // 簡化實現：非流式回調
    const response = await this.chat(messages, options);
    
    // 模擬流式輸出
    const words = response.content.split('');
    for (const word of words) {
      yield word;
      await new Promise(r => setTimeout(r, 20));
    }
  }
  
  // ============ 提供商特定實現 ============
  
  private async chatGemini(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const url = `${config.baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`;
    
    console.log(`[AIProvider] Gemini URL: ${url.replace(config.apiKey, '***')}`);
    
    // 轉換消息格式
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
    
    const systemInstruction = messages.find(m => m.role === 'system');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          topP: config.topP
        }
      })
    });
    
    // 🔧 檢查響應類型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[AIProvider] Gemini 返回非 JSON 響應:`, text.substring(0, 200));
      throw new Error(`Gemini API 返回錯誤格式 (${response.status}): 可能是 URL 配置錯誤`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    this.updateUsage(data.usageMetadata?.promptTokenCount || 0, data.usageMetadata?.candidatesTokenCount || 0, config);
    
    return {
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0
      },
      model: config.model,
      finishReason: data.candidates?.[0]?.finishReason || 'stop'
    };
  }
  
  private async chatOpenAI(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const url = `${config.baseUrl}/chat/completions`;
    
    console.log(`[AIProvider] OpenAI URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP
      })
    });
    
    // 🔧 檢查響應類型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[AIProvider] OpenAI 返回非 JSON 響應:`, text.substring(0, 200));
      throw new Error(`OpenAI API 返回錯誤格式 (${response.status}): 可能是 URL 配置錯誤`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    this.updateUsage(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, config);
    
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: config.model,
      finishReason: data.choices?.[0]?.finish_reason || 'stop'
    };
  }
  
  private async chatClaude(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const url = `${config.baseUrl}/messages`;
    
    console.log(`[AIProvider] Claude URL: ${url}`);
    
    // 分離 system 消息
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemMessage?.content,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });
    
    // 🔧 檢查響應類型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[AIProvider] Claude 返回非 JSON 響應:`, text.substring(0, 200));
      throw new Error(`Claude API 返回錯誤格式 (${response.status}): 可能是 URL 配置錯誤`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.content?.[0]?.text || '';
    
    this.updateUsage(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, config);
    
    return {
      content,
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      },
      model: config.model,
      finishReason: data.stop_reason || 'stop'
    };
  }
  
  private async chatDeepSeek(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    // DeepSeek 使用 OpenAI 兼容 API
    const url = `${config.baseUrl}/chat/completions`;
    
    console.log(`[AIProvider] DeepSeek URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        top_p: config.topP
      })
    });
    
    // 🔧 檢查響應類型
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      console.error(`[AIProvider] DeepSeek 返回非 JSON 響應:`, text.substring(0, 200));
      throw new Error(`DeepSeek API 返回錯誤格式 (${response.status}): 可能是 URL 配置錯誤`);
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    this.updateUsage(data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0, config);
    
    return {
      content,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      },
      model: config.model,
      finishReason: data.choices?.[0]?.finish_reason || 'stop'
    };
  }
  
  private async chatOllama(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
    const url = `${config.baseUrl || 'http://localhost:11434'}/api/chat`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        options: {
          temperature: config.temperature,
          num_predict: config.maxTokens,
          top_p: config.topP
        },
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error('Ollama connection failed. Make sure Ollama is running.');
    }
    
    const data = await response.json();
    const content = data.message?.content || '';
    
    return {
      content,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
      },
      model: config.model,
      finishReason: 'stop'
    };
  }
  
  // ============ 輔助方法 ============
  
  private updateUsage(promptTokens: number, completionTokens: number, config: AIConfig): void {
    const model = this.currentModel();
    const cost = model?.pricePerMToken 
      ? ((promptTokens + completionTokens) / 1000000) * model.pricePerMToken
      : 0;
    
    this._usage.update(u => ({
      totalTokens: u.totalTokens + promptTokens + completionTokens,
      totalCalls: u.totalCalls + 1,
      totalCost: u.totalCost + cost
    }));
  }
  
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-ai-config');
      if (stored) {
        this._config.set(JSON.parse(stored));
      }
      
      const usage = localStorage.getItem('tg-matrix-ai-usage');
      if (usage) {
        this._usage.set(JSON.parse(usage));
      }
    } catch (e) {
      console.error('Failed to load AI config:', e);
    }
  }
  
  private saveConfig(): void {
    try {
      localStorage.setItem('tg-matrix-ai-config', JSON.stringify(this._config()));
      localStorage.setItem('tg-matrix-ai-usage', JSON.stringify(this._usage()));
    } catch (e) {
      console.error('Failed to save AI config:', e);
    }
  }
  
  /**
   * 重置使用統計
   */
  resetUsage(): void {
    this._usage.set({
      totalTokens: 0,
      totalCalls: 0,
      totalCost: 0
    });
    this.saveConfig();
  }
  
  /**
   * 估算文本 token 數（粗略估算）
   */
  estimateTokens(text: string): number {
    // 粗略估算：英文約 4 字符/token，中文約 2 字符/token
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }
}
