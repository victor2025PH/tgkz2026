/**
 * TG-AI智控王 AI 回覆引擎
 * AI Reply Engine v1.0
 * 
 * 功能：
 * - 智能自動回覆生成
 * - 模板管理與變量替換
 * - 上下文對話管理
 * - 多語言支持
 * - 個性化風格設置
 * - 學習與優化
 */

import { Injectable, signal, computed, inject } from '@angular/core';

// ============ 類型定義 ============

export type ReplyStyle = 
  | 'professional'    // 專業
  | 'friendly'        // 友好
  | 'casual'          // 輕鬆
  | 'formal'          // 正式
  | 'humorous'        // 幽默
  | 'concise';        // 簡潔

export type ReplyLanguage = 
  | 'auto'            // 自動檢測
  | 'zh-CN'           // 簡體中文
  | 'zh-TW'           // 繁體中文
  | 'en'              // 英文
  | 'ja'              // 日文
  | 'ko';             // 韓文

export interface ReplyTemplate {
  id: string;
  name: string;
  description?: string;
  content: string;
  variables: string[];
  category: string;
  language: ReplyLanguage;
  style: ReplyStyle;
  tags: string[];
  usageCount: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationContext {
  id: string;
  peerId: string;
  peerName: string;
  peerType: 'user' | 'group' | 'channel';
  messages: ConversationMessage[];
  summary?: string;
  topics?: string[];
  sentiment?: SentimentResult;
  lastUpdated: Date;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: IntentResult;
    sentiment?: SentimentResult;
    entities?: ExtractedEntity[];
  };
}

export interface AIReplyRequest {
  message: string;
  context?: ConversationContext;
  style?: ReplyStyle;
  language?: ReplyLanguage;
  templateId?: string;
  variables?: Record<string, string>;
  maxLength?: number;
  includeEmoji?: boolean;
  tone?: string;
}

export interface AIReplyResponse {
  reply: string;
  confidence: number;
  source: 'ai' | 'template' | 'hybrid';
  suggestions?: string[];
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    model?: string;
  };
}

export interface IntentResult {
  intent: string;
  confidence: number;
  entities?: ExtractedEntity[];
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;  // -1 to 1
  emotions?: {
    joy?: number;
    anger?: number;
    sadness?: number;
    fear?: number;
    surprise?: number;
  };
}

export interface ExtractedEntity {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

// ============ 預設模板 ============

const DEFAULT_TEMPLATES: Omit<ReplyTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '歡迎新成員',
    description: '群組新成員加入時的歡迎消息',
    content: '👋 歡迎 {{name}} 加入我們的群組！\n\n請先閱讀群規，有任何問題歡迎提問！',
    variables: ['name'],
    category: 'welcome',
    language: 'zh-TW',
    style: 'friendly',
    tags: ['welcome', 'group'],
    usageCount: 0,
    successRate: 0
  },
  {
    name: '產品諮詢回覆',
    description: '回覆產品相關問題',
    content: '您好！感謝您對 {{product}} 的關注。\n\n{{answer}}\n\n如有其他問題，歡迎隨時諮詢！',
    variables: ['product', 'answer'],
    category: 'inquiry',
    language: 'zh-TW',
    style: 'professional',
    tags: ['product', 'inquiry'],
    usageCount: 0,
    successRate: 0
  },
  {
    name: '感謝回饋',
    description: '收到好評時的感謝回覆',
    content: '非常感謝您的認可！🙏\n\n您的支持是我們前進的動力，我們會繼續努力為您提供更好的服務！',
    variables: [],
    category: 'gratitude',
    language: 'zh-TW',
    style: 'friendly',
    tags: ['thanks', 'positive'],
    usageCount: 0,
    successRate: 0
  },
  {
    name: '處理投訴',
    description: '收到投訴時的回覆',
    content: '非常抱歉給您帶來不好的體驗 😔\n\n我們非常重視您的反饋，已經記錄了這個問題。\n\n{{resolution}}\n\n感謝您的耐心，如有其他問題請隨時聯繫。',
    variables: ['resolution'],
    category: 'complaint',
    language: 'zh-TW',
    style: 'professional',
    tags: ['complaint', 'support'],
    usageCount: 0,
    successRate: 0
  },
  {
    name: '自動問候',
    description: '日常問候回覆',
    content: '{{greeting}}！今天過得怎麼樣？有什麼我可以幫助您的嗎？😊',
    variables: ['greeting'],
    category: 'greeting',
    language: 'zh-TW',
    style: 'casual',
    tags: ['greeting', 'daily'],
    usageCount: 0,
    successRate: 0
  }
];

// ============ 配置 ============

const AI_CONFIG = {
  // API 配置
  apiEndpoint: '/api/ai/generate',
  apiKey: '',  // 從設置中獲取
  model: 'gpt-4',
  
  // 默認設置
  defaults: {
    style: 'friendly' as ReplyStyle,
    language: 'auto' as ReplyLanguage,
    maxLength: 500,
    includeEmoji: true
  },
  
  // 上下文設置
  context: {
    maxMessages: 10,
    summaryThreshold: 20
  },
  
  // 速率限制
  rateLimit: {
    maxRequestsPerMinute: 20,
    cooldownMs: 3000
  },
  
  // 語言檢測
  languagePatterns: {
    'zh-CN': /[\u4e00-\u9fa5]/,
    'zh-TW': /[\u4e00-\u9fa5]/,
    'ja': /[\u3040-\u309f\u30a0-\u30ff]/,
    'ko': /[\uac00-\ud7af]/,
    'en': /^[a-zA-Z\s.,!?'"]+$/
  }
};

// ============ 風格提示 ============

const STYLE_PROMPTS: Record<ReplyStyle, string> = {
  professional: '使用專業、禮貌的語氣回覆，保持商業化的溝通風格。',
  friendly: '使用友好、親切的語氣回覆，讓對方感到溫暖。',
  casual: '使用輕鬆、隨意的語氣回覆，像朋友間的對話。',
  formal: '使用正式、嚴謹的語氣回覆，適合官方場合。',
  humorous: '適當加入幽默元素，讓對話更有趣味。',
  concise: '簡潔明了地回覆，直奔主題，不說廢話。'
};

@Injectable({
  providedIn: 'root'
})
export class AIReplyEngine {
  // 模板列表
  private _templates = signal<ReplyTemplate[]>([]);
  templates = computed(() => this._templates());
  
  // 對話上下文
  private _contexts = signal<Map<string, ConversationContext>>(new Map());
  contexts = computed(() => this._contexts());
  
  // 設置
  private _settings = signal<{
    style: ReplyStyle;
    language: ReplyLanguage;
    maxLength: number;
    includeEmoji: boolean;
    apiKey: string;
    model: string;
  }>({
    style: AI_CONFIG.defaults.style,
    language: AI_CONFIG.defaults.language,
    maxLength: AI_CONFIG.defaults.maxLength,
    includeEmoji: AI_CONFIG.defaults.includeEmoji,
    apiKey: '',
    model: AI_CONFIG.model
  });
  settings = computed(() => this._settings());
  
  // 統計
  private _stats = signal<{
    totalReplies: number;
    aiReplies: number;
    templateReplies: number;
    avgConfidence: number;
    avgResponseTime: number;
  }>({
    totalReplies: 0,
    aiReplies: 0,
    templateReplies: 0,
    avgConfidence: 0,
    avgResponseTime: 0
  });
  stats = computed(() => this._stats());
  
  // 速率限制
  private requestTimes: number[] = [];
  
  constructor() {
    this.loadTemplates();
    this.loadContexts();
    this.loadSettings();
  }
  
  // ============ 回覆生成 ============
  
  /**
   * 生成智能回覆
   */
  async generateReply(request: AIReplyRequest): Promise<AIReplyResponse> {
    const startTime = Date.now();
    
    // 檢查速率限制
    if (!this.checkRateLimit()) {
      throw new Error('請求過於頻繁，請稍後再試');
    }
    
    let reply: AIReplyResponse;
    
    // 1. 嘗試模板匹配
    if (request.templateId) {
      const templateReply = this.applyTemplate(request.templateId, request.variables || {});
      if (templateReply) {
        reply = {
          reply: templateReply,
          confidence: 1.0,
          source: 'template'
        };
      }
    }
    
    // 2. AI 生成
    if (!reply!) {
      reply = await this.generateAIReply(request);
    }
    
    // 更新統計
    const processingTime = Date.now() - startTime;
    this.updateStats(reply, processingTime);
    
    // 添加到上下文
    if (request.context) {
      this.addToContext(request.context.id, {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: reply.reply,
        timestamp: new Date()
      });
    }
    
    return reply;
  }
  
  /**
   * 生成 AI 回覆
   */
  private async generateAIReply(request: AIReplyRequest): Promise<AIReplyResponse> {
    const settings = this._settings();
    const style = request.style || settings.style;
    const language = request.language || settings.language;
    const maxLength = request.maxLength || settings.maxLength;
    
    // 構建系統提示
    const systemPrompt = this.buildSystemPrompt(style, language, request);
    
    // 構建消息
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];
    
    // 添加上下文
    if (request.context) {
      const contextMessages = request.context.messages.slice(-AI_CONFIG.context.maxMessages);
      for (const msg of contextMessages) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
    
    // 添加當前消息
    messages.push({ role: 'user', content: request.message });
    
    try {
      // 調用 AI API
      const response = await this.callAIAPI(messages, maxLength);
      
      // 後處理
      let reply = response.content;
      
      // 添加表情符號
      if (request.includeEmoji !== false && settings.includeEmoji) {
        reply = this.addEmojis(reply, style);
      }
      
      // 語言調整
      if (language !== 'auto') {
        reply = await this.adjustLanguage(reply, language);
      }
      
      return {
        reply,
        confidence: response.confidence || 0.85,
        source: 'ai',
        suggestions: this.generateSuggestions(request.message, reply),
        metadata: {
          tokensUsed: response.tokensUsed,
          model: settings.model
        }
      };
      
    } catch (error) {
      console.error('[AIReplyEngine] AI generation failed:', error);
      
      // 嘗試使用備選模板
      const fallback = this.findBestTemplate(request.message);
      if (fallback) {
        return {
          reply: fallback.content,
          confidence: 0.5,
          source: 'template'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * 構建系統提示
   */
  private buildSystemPrompt(
    style: ReplyStyle,
    language: ReplyLanguage,
    request: AIReplyRequest
  ): string {
    let prompt = `你是一個智能客服助手。${STYLE_PROMPTS[style]}\n\n`;
    
    // 語言設置
    if (language !== 'auto') {
      const langNames: Record<ReplyLanguage, string> = {
        'auto': '',
        'zh-CN': '簡體中文',
        'zh-TW': '繁體中文',
        'en': '英文',
        'ja': '日文',
        'ko': '韓文'
      };
      prompt += `請使用${langNames[language]}回覆。\n`;
    }
    
    // 長度限制
    if (request.maxLength) {
      prompt += `回覆請控制在 ${request.maxLength} 字以內。\n`;
    }
    
    // 額外語氣
    if (request.tone) {
      prompt += `語氣要求：${request.tone}\n`;
    }
    
    // 上下文摘要
    if (request.context?.summary) {
      prompt += `\n對話背景：${request.context.summary}\n`;
    }
    
    return prompt;
  }
  
  /**
   * 調用 AI API
   */
  private async callAIAPI(
    messages: Array<{ role: string; content: string }>,
    maxTokens: number
  ): Promise<{ content: string; confidence?: number; tokensUsed?: number }> {
    const settings = this._settings();
    
    if (!settings.apiKey) {
      // 使用本地模擬
      return this.simulateAIResponse(messages);
    }
    
    // 實際 API 調用
    // const response = await fetch(AI_CONFIG.apiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${settings.apiKey}`
    //   },
    //   body: JSON.stringify({
    //     model: settings.model,
    //     messages,
    //     max_tokens: maxTokens
    //   })
    // });
    
    // 模擬響應
    return this.simulateAIResponse(messages);
  }
  
  /**
   * 模擬 AI 響應（本地回退）
   */
  private simulateAIResponse(
    messages: Array<{ role: string; content: string }>
  ): Promise<{ content: string; confidence: number; tokensUsed: number }> {
    return new Promise(resolve => {
      setTimeout(() => {
        const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
        
        // 簡單的規則匹配回覆
        let reply = '感謝您的消息！我已收到您的信息，會盡快處理。';
        
        if (lastUserMessage.includes('你好') || lastUserMessage.includes('嗨')) {
          reply = '您好！很高興見到您，有什麼我可以幫助您的嗎？';
        } else if (lastUserMessage.includes('謝謝') || lastUserMessage.includes('感謝')) {
          reply = '不客氣！能幫到您是我的榮幸。如有其他問題，歡迎隨時聯繫！';
        } else if (lastUserMessage.includes('價格') || lastUserMessage.includes('多少錢')) {
          reply = '關於價格問題，您可以查看我們的官方網站或聯繫客服獲取最新報價。有其他問題歡迎繼續諮詢！';
        } else if (lastUserMessage.includes('問題') || lastUserMessage.includes('幫助')) {
          reply = '我理解您遇到了問題。請詳細描述一下具體情況，我會盡力為您解答。';
        }
        
        resolve({
          content: reply,
          confidence: 0.75,
          tokensUsed: reply.length
        });
      }, 500);
    });
  }
  
  // ============ 模板管理 ============
  
  /**
   * 創建模板
   */
  createTemplate(template: Omit<ReplyTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'successRate'>): ReplyTemplate {
    const newTemplate: ReplyTemplate = {
      ...template,
      id: `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usageCount: 0,
      successRate: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._templates.update(templates => [...templates, newTemplate]);
    this.saveTemplates();
    
    return newTemplate;
  }
  
  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<ReplyTemplate>): boolean {
    const template = this._templates().find(t => t.id === id);
    if (!template) return false;
    
    this._templates.update(templates =>
      templates.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t)
    );
    this.saveTemplates();
    
    return true;
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(id: string): boolean {
    const exists = this._templates().some(t => t.id === id);
    if (!exists) return false;
    
    this._templates.update(templates => templates.filter(t => t.id !== id));
    this.saveTemplates();
    
    return true;
  }
  
  /**
   * 應用模板
   */
  applyTemplate(templateId: string, variables: Record<string, string>): string | null {
    const template = this._templates().find(t => t.id === templateId);
    if (!template) return null;
    
    let content = template.content;
    
    // 替換變量
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    // 更新使用統計
    this.updateTemplate(templateId, {
      usageCount: template.usageCount + 1
    });
    
    return content;
  }
  
  /**
   * 查找最佳模板
   */
  findBestTemplate(message: string): ReplyTemplate | null {
    const templates = this._templates();
    const lowerMessage = message.toLowerCase();
    
    // 簡單的關鍵詞匹配
    const scored = templates.map(template => {
      let score = 0;
      
      // 標籤匹配
      for (const tag of template.tags) {
        if (lowerMessage.includes(tag)) {
          score += 10;
        }
      }
      
      // 類別匹配
      if (lowerMessage.includes(template.category)) {
        score += 5;
      }
      
      // 使用率和成功率
      score += template.usageCount * 0.1;
      score += template.successRate * 0.5;
      
      return { template, score };
    }).filter(item => item.score > 0);
    
    if (scored.length === 0) return null;
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0].template;
  }
  
  // ============ 上下文管理 ============
  
  /**
   * 獲取或創建上下文
   */
  getOrCreateContext(peerId: string, peerName: string, peerType: 'user' | 'group' | 'channel'): ConversationContext {
    const contexts = this._contexts();
    let context = contexts.get(peerId);
    
    if (!context) {
      context = {
        id: peerId,
        peerId,
        peerName,
        peerType,
        messages: [],
        lastUpdated: new Date()
      };
      
      this._contexts.update(c => {
        const newContexts = new Map(c);
        newContexts.set(peerId, context!);
        return newContexts;
      });
    }
    
    return context;
  }
  
  /**
   * 添加消息到上下文
   */
  addToContext(contextId: string, message: ConversationMessage): void {
    this._contexts.update(contexts => {
      const newContexts = new Map(contexts);
      const context = newContexts.get(contextId);
      
      if (context) {
        context.messages.push(message);
        context.lastUpdated = new Date();
        
        // 限制消息數量
        if (context.messages.length > AI_CONFIG.context.summaryThreshold) {
          // 觸發摘要生成
          this.generateContextSummary(context);
          context.messages = context.messages.slice(-AI_CONFIG.context.maxMessages);
        }
      }
      
      return newContexts;
    });
    
    this.saveContexts();
  }
  
  /**
   * 生成上下文摘要
   */
  private async generateContextSummary(context: ConversationContext): Promise<void> {
    const messages = context.messages.map(m => `${m.role}: ${m.content}`).join('\n');
    
    // 簡單的摘要生成
    context.summary = `與 ${context.peerName} 的對話，共 ${context.messages.length} 條消息。`;
    
    // 提取主題
    const topics = new Set<string>();
    for (const msg of context.messages) {
      // 簡單的關鍵詞提取
      const words = msg.content.match(/[\u4e00-\u9fa5]{2,}|[a-zA-Z]{3,}/g) || [];
      words.forEach(w => topics.add(w));
    }
    context.topics = [...topics].slice(0, 5);
  }
  
  /**
   * 清除上下文
   */
  clearContext(contextId: string): void {
    this._contexts.update(contexts => {
      const newContexts = new Map(contexts);
      newContexts.delete(contextId);
      return newContexts;
    });
    this.saveContexts();
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 檢測語言
   */
  detectLanguage(text: string): ReplyLanguage {
    for (const [lang, pattern] of Object.entries(AI_CONFIG.languagePatterns)) {
      if (pattern.test(text)) {
        return lang as ReplyLanguage;
      }
    }
    return 'en';
  }
  
  /**
   * 調整語言
   */
  private async adjustLanguage(text: string, targetLang: ReplyLanguage): Promise<string> {
    // 簡化版：如果需要翻譯，可以調用翻譯 API
    return text;
  }
  
  /**
   * 添加表情符號
   */
  private addEmojis(text: string, style: ReplyStyle): string {
    // 根據風格添加適當的表情
    const styleEmojis: Record<ReplyStyle, string[]> = {
      professional: ['✓', '📋', '💼'],
      friendly: ['😊', '👋', '🙏', '💪'],
      casual: ['😄', '👍', '✨', '🎉'],
      formal: ['📌', '•', '→'],
      humorous: ['😆', '🤣', '😜', '🎭'],
      concise: ['✓', '→']
    };
    
    // 如果文本已經有表情，不再添加
    if (/[\u{1F300}-\u{1F9FF}]/u.test(text)) {
      return text;
    }
    
    // 在適當位置添加表情
    const emojis = styleEmojis[style];
    if (style !== 'formal' && style !== 'concise' && Math.random() > 0.3) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      text = text.replace(/([。！？\!\.])(?=\s|$)/, `$1 ${emoji}`);
    }
    
    return text;
  }
  
  /**
   * 生成建議回覆
   */
  private generateSuggestions(userMessage: string, currentReply: string): string[] {
    return [
      '好的，收到！',
      '感謝您的反饋',
      '如有其他問題歡迎詢問'
    ];
  }
  
  /**
   * 檢查速率限制
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // 清理舊記錄
    this.requestTimes = this.requestTimes.filter(t => t > oneMinuteAgo);
    
    if (this.requestTimes.length >= AI_CONFIG.rateLimit.maxRequestsPerMinute) {
      return false;
    }
    
    this.requestTimes.push(now);
    return true;
  }
  
  /**
   * 更新統計
   */
  private updateStats(reply: AIReplyResponse, processingTime: number): void {
    this._stats.update(stats => {
      const newTotal = stats.totalReplies + 1;
      const newAvgTime = (stats.avgResponseTime * stats.totalReplies + processingTime) / newTotal;
      const newAvgConfidence = (stats.avgConfidence * stats.totalReplies + reply.confidence) / newTotal;
      
      return {
        totalReplies: newTotal,
        aiReplies: reply.source === 'ai' ? stats.aiReplies + 1 : stats.aiReplies,
        templateReplies: reply.source === 'template' ? stats.templateReplies + 1 : stats.templateReplies,
        avgConfidence: newAvgConfidence,
        avgResponseTime: newAvgTime
      };
    });
  }
  
  // ============ 設置 ============
  
  /**
   * 更新設置
   */
  updateSettings(updates: Partial<typeof this._settings extends ReturnType<typeof signal<infer T>> ? T : never>): void {
    this._settings.update(s => ({ ...s, ...updates }));
    this.saveSettings();
  }
  
  // ============ 持久化 ============
  
  private saveTemplates(): void {
    localStorage.setItem('tgai-reply-templates', JSON.stringify(this._templates()));
  }
  
  private loadTemplates(): void {
    try {
      const data = localStorage.getItem('tgai-reply-templates');
      if (data) {
        const templates = JSON.parse(data).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        }));
        this._templates.set(templates);
      } else {
        // 載入默認模板
        const templates = DEFAULT_TEMPLATES.map((t, i) => ({
          ...t,
          id: `tpl_default_${i}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        this._templates.set(templates);
      }
    } catch (e) {
      console.error('[AIReplyEngine] Failed to load templates:', e);
    }
  }
  
  private saveContexts(): void {
    const contexts = [...this._contexts().entries()].map(([k, v]) => [k, {
      ...v,
      messages: v.messages.slice(-20)  // 只保存最近 20 條
    }]);
    localStorage.setItem('tgai-conversations', JSON.stringify(contexts));
  }
  
  private loadContexts(): void {
    try {
      const data = localStorage.getItem('tgai-conversations');
      if (data) {
        const entries = JSON.parse(data).map(([k, v]: [string, any]) => [k, {
          ...v,
          lastUpdated: new Date(v.lastUpdated),
          messages: v.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }]);
        this._contexts.set(new Map(entries));
      }
    } catch (e) {}
  }
  
  private saveSettings(): void {
    localStorage.setItem('tgai-ai-settings', JSON.stringify(this._settings()));
  }
  
  private loadSettings(): void {
    try {
      const data = localStorage.getItem('tgai-ai-settings');
      if (data) {
        this._settings.set({ ...this._settings(), ...JSON.parse(data) });
      }
    } catch (e) {}
  }
}
