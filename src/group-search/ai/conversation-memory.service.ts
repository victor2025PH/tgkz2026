/**
 * TG-AI智控王 對話記憶服務
 * Conversation Memory Service v1.0
 * 
 * 💡 設計思考：
 * 1. 多層記憶 - 短期/長期/實體記憶
 * 2. 智能摘要 - 自動壓縮長對話
 * 3. 上下文窗口 - 動態調整上下文大小
 * 4. 用戶畫像 - 記住用戶偏好和特徵
 * 5. 記憶檢索 - 根據相關性檢索歷史
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IndexedDBService } from '../performance/indexed-db.service';
import { ChatMessage } from './model-provider.service';

// ============ 類型定義 ============

export interface Conversation {
  id: string;
  title: string;
  messages: ConversationMessage[];
  summary?: string;
  metadata: {
    userId?: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    totalTokens: number;
  };
  tags?: string[];
}

export interface ConversationMessage extends ChatMessage {
  id: string;
  timestamp: number;
  tokens?: number;
  metadata?: {
    model?: string;
    latency?: number;
    sentiment?: 'positive' | 'neutral' | 'negative';
  };
}

export interface UserProfile {
  id: string;
  name?: string;
  preferences: {
    language?: string;
    responseStyle?: 'concise' | 'detailed' | 'friendly' | 'formal';
    topics?: string[];
  };
  facts: UserFact[];
  lastInteraction: number;
}

export interface UserFact {
  id: string;
  category: 'personal' | 'preference' | 'context' | 'business';
  content: string;
  confidence: number;
  source: string;
  createdAt: number;
  expiresAt?: number;
}

export interface MemoryConfig {
  maxShortTermMessages: number;     // 短期記憶最大消息數
  maxLongTermSummaries: number;     // 長期記憶最大摘要數
  summaryTriggerLength: number;     // 觸發摘要的消息數
  contextWindowTokens: number;      // 上下文窗口 token 數
  factExtractionEnabled: boolean;   // 是否啟用事實提取
}

export interface MemoryContext {
  shortTerm: ConversationMessage[];
  longTerm: string[];
  userFacts: UserFact[];
  relevantHistory?: ConversationMessage[];
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: MemoryConfig = {
  maxShortTermMessages: 20,
  maxLongTermSummaries: 10,
  summaryTriggerLength: 10,
  contextWindowTokens: 4000,
  factExtractionEnabled: true
};

@Injectable({
  providedIn: 'root'
})
export class ConversationMemoryService {
  private db = inject(IndexedDBService);
  
  private config: MemoryConfig;
  
  // 當前對話
  private _currentConversation = signal<Conversation | null>(null);
  currentConversation = computed(() => this._currentConversation());
  
  // 用戶畫像
  private _userProfile = signal<UserProfile | null>(null);
  userProfile = computed(() => this._userProfile());
  
  // 對話列表
  private conversations = new Map<string, Conversation>();
  
  // 長期記憶（摘要）
  private longTermMemory: string[] = [];
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initialize();
  }
  
  // ============ 初始化 ============
  
  private async initialize(): Promise<void> {
    await this.loadConversations();
    await this.loadUserProfile();
    
    // 載入長期記憶
    const stored = localStorage.getItem('tgai-long-term-memory');
    if (stored) {
      this.longTermMemory = JSON.parse(stored);
    }
  }
  
  private async loadConversations(): Promise<void> {
    const stored = await this.db.getAll<Conversation>('conversations');
    for (const conv of stored) {
      this.conversations.set(conv.id, conv);
    }
  }
  
  private async loadUserProfile(): Promise<void> {
    const stored = localStorage.getItem('tgai-user-profile');
    if (stored) {
      this._userProfile.set(JSON.parse(stored));
    }
  }
  
  private saveUserProfile(): void {
    const profile = this._userProfile();
    if (profile) {
      localStorage.setItem('tgai-user-profile', JSON.stringify(profile));
    }
  }
  
  private saveLongTermMemory(): void {
    localStorage.setItem('tgai-long-term-memory', JSON.stringify(this.longTermMemory));
  }
  
  // ============ 對話管理 ============
  
  /**
   * 創建新對話
   */
  createConversation(title?: string): Conversation {
    const conversation: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || `對話 ${new Date().toLocaleDateString()}`,
      messages: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        totalTokens: 0
      }
    };
    
    this.conversations.set(conversation.id, conversation);
    this._currentConversation.set(conversation);
    
    return conversation;
  }
  
  /**
   * 切換對話
   */
  async switchConversation(id: string): Promise<Conversation | null> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this._currentConversation.set(conversation);
      return conversation;
    }
    return null;
  }
  
  /**
   * 獲取所有對話
   */
  getAllConversations(): Conversation[] {
    return [...this.conversations.values()]
      .sort((a, b) => b.metadata.updatedAt - a.metadata.updatedAt);
  }
  
  /**
   * 刪除對話
   */
  async deleteConversation(id: string): Promise<boolean> {
    if (!this.conversations.has(id)) return false;
    
    this.conversations.delete(id);
    await this.db.delete('conversations', id);
    
    if (this._currentConversation()?.id === id) {
      this._currentConversation.set(null);
    }
    
    return true;
  }
  
  // ============ 消息管理 ============
  
  /**
   * 添加消息到當前對話
   */
  async addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<ConversationMessage> {
    let conversation = this._currentConversation();
    
    if (!conversation) {
      conversation = this.createConversation();
    }
    
    const fullMessage: ConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    conversation.messages.push(fullMessage);
    conversation.metadata.messageCount++;
    conversation.metadata.updatedAt = Date.now();
    
    if (fullMessage.tokens) {
      conversation.metadata.totalTokens += fullMessage.tokens;
    }
    
    // 檢查是否需要生成摘要
    if (conversation.messages.length >= this.config.summaryTriggerLength) {
      await this.generateSummary(conversation);
    }
    
    // 提取用戶事實
    if (this.config.factExtractionEnabled && message.role === 'user') {
      await this.extractFacts(message.content);
    }
    
    // 保存
    await this.db.put('conversations', conversation);
    this._currentConversation.set(conversation);
    
    return fullMessage;
  }
  
  /**
   * 獲取上下文消息
   * 
   * 💡 智能組合短期記憶、長期摘要和相關歷史
   */
  async getContext(query?: string): Promise<MemoryContext> {
    const conversation = this._currentConversation();
    const profile = this._userProfile();
    
    // 短期記憶：最近的消息
    const shortTerm = conversation?.messages.slice(-this.config.maxShortTermMessages) || [];
    
    // 長期記憶：歷史摘要
    const longTerm = [...this.longTermMemory].slice(-this.config.maxLongTermSummaries);
    
    // 用戶事實
    const userFacts = profile?.facts.filter(f => {
      // 過濾過期的事實
      if (f.expiresAt && f.expiresAt < Date.now()) return false;
      return true;
    }) || [];
    
    // 相關歷史（如果有查詢）
    let relevantHistory: ConversationMessage[] = [];
    if (query) {
      relevantHistory = await this.searchRelevantHistory(query);
    }
    
    return {
      shortTerm,
      longTerm,
      userFacts,
      relevantHistory
    };
  }
  
  /**
   * 構建發送給模型的消息列表
   */
  async buildMessages(
    userMessage: string,
    systemPrompt?: string
  ): Promise<ChatMessage[]> {
    const context = await this.getContext(userMessage);
    const messages: ChatMessage[] = [];
    
    // 系統提示
    let system = systemPrompt || '你是一個有幫助的 AI 助手。';
    
    // 添加用戶畫像信息
    const profile = this._userProfile();
    if (profile) {
      if (profile.preferences.language) {
        system += `\n請使用${profile.preferences.language}回答。`;
      }
      if (profile.preferences.responseStyle) {
        const styles = {
          concise: '請簡潔地回答。',
          detailed: '請詳細地回答。',
          friendly: '請用友好的語氣回答。',
          formal: '請用正式的語氣回答。'
        };
        system += `\n${styles[profile.preferences.responseStyle]}`;
      }
    }
    
    // 添加用戶事實
    if (context.userFacts.length > 0) {
      system += '\n\n關於用戶的已知信息：\n';
      for (const fact of context.userFacts.slice(-5)) {
        system += `- ${fact.content}\n`;
      }
    }
    
    // 添加長期記憶
    if (context.longTerm.length > 0) {
      system += '\n\n歷史對話摘要：\n';
      for (const summary of context.longTerm.slice(-3)) {
        system += `- ${summary}\n`;
      }
    }
    
    messages.push({ role: 'system', content: system });
    
    // 添加相關歷史（如果有）
    if (context.relevantHistory.length > 0) {
      messages.push({
        role: 'system',
        content: `相關歷史對話：\n${context.relevantHistory.map(m => 
          `${m.role}: ${m.content.slice(0, 100)}...`
        ).join('\n')}`
      });
    }
    
    // 添加短期記憶
    let tokenCount = this.estimateTokens(system);
    const maxContextTokens = this.config.contextWindowTokens;
    
    // 從最近的消息開始添加，直到達到 token 限制
    const recentMessages: ChatMessage[] = [];
    for (let i = context.shortTerm.length - 1; i >= 0; i--) {
      const msg = context.shortTerm[i];
      const msgTokens = this.estimateTokens(msg.content);
      
      if (tokenCount + msgTokens > maxContextTokens) break;
      
      recentMessages.unshift({
        role: msg.role,
        content: msg.content
      });
      tokenCount += msgTokens;
    }
    
    messages.push(...recentMessages);
    
    // 添加當前用戶消息
    messages.push({ role: 'user', content: userMessage });
    
    return messages;
  }
  
  // ============ 記憶摘要 ============
  
  /**
   * 生成對話摘要
   * 
   * 💡 壓縮歷史消息，保留關鍵信息
   */
  private async generateSummary(conversation: Conversation): Promise<void> {
    const messagesToSummarize = conversation.messages.slice(0, -5);
    
    if (messagesToSummarize.length < 5) return;
    
    // 簡單摘要：提取關鍵信息
    const keyPoints: string[] = [];
    
    for (const msg of messagesToSummarize) {
      if (msg.role === 'user') {
        // 提取用戶問題
        const questions = msg.content.match(/[？?].{0,50}/g);
        if (questions) {
          keyPoints.push(...questions.map(q => `用戶問：${q}`));
        }
      } else if (msg.role === 'assistant') {
        // 提取關鍵回答（簡化）
        const firstSentence = msg.content.split(/[。.!！?？]/)[0];
        if (firstSentence.length > 10) {
          keyPoints.push(`AI答：${firstSentence.slice(0, 100)}`);
        }
      }
    }
    
    const summary = keyPoints.slice(0, 5).join('；');
    
    if (summary) {
      // 更新長期記憶
      this.longTermMemory.push(summary);
      if (this.longTermMemory.length > this.config.maxLongTermSummaries) {
        this.longTermMemory.shift();
      }
      this.saveLongTermMemory();
      
      // 更新對話摘要
      conversation.summary = summary;
      
      // 移除已摘要的消息，保留最近的
      conversation.messages = conversation.messages.slice(-this.config.maxShortTermMessages);
    }
  }
  
  // ============ 事實提取 ============
  
  /**
   * 從用戶消息中提取事實
   * 
   * 💡 識別並記住用戶提供的個人信息和偏好
   */
  private async extractFacts(content: string): Promise<void> {
    let profile = this._userProfile();
    
    if (!profile) {
      profile = {
        id: `user_${Date.now()}`,
        preferences: {},
        facts: [],
        lastInteraction: Date.now()
      };
    }
    
    // 簡單的模式匹配提取事實
    const patterns = [
      // 名字
      { regex: /我(?:叫|是|名字是)(.{2,10})/g, category: 'personal' as const, prefix: '用戶名字是' },
      // 職業
      { regex: /我(?:是|做|從事)(?:一?名?)?(.{2,15}?)(?:的|工作|行業)/g, category: 'personal' as const, prefix: '用戶職業是' },
      // 偏好
      { regex: /我(?:喜歡|偏好|習慣)(.{2,20})/g, category: 'preference' as const, prefix: '用戶喜歡' },
      // 不喜歡
      { regex: /我(?:不喜歡|討厭|不想)(.{2,20})/g, category: 'preference' as const, prefix: '用戶不喜歡' },
      // 地點
      { regex: /我(?:在|來自|住在)(.{2,15})/g, category: 'personal' as const, prefix: '用戶位於' }
    ];
    
    for (const { regex, category, prefix } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const value = match[1].trim();
        if (value.length >= 2 && value.length <= 20) {
          const fact: UserFact = {
            id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            category,
            content: `${prefix}${value}`,
            confidence: 0.8,
            source: 'extraction',
            createdAt: Date.now()
          };
          
          // 避免重複
          if (!profile.facts.some(f => f.content === fact.content)) {
            profile.facts.push(fact);
          }
        }
      }
    }
    
    // 檢測語言偏好
    if (/[\u4e00-\u9fa5]/.test(content)) {
      profile.preferences.language = '中文';
    } else if (/[a-zA-Z]/.test(content)) {
      profile.preferences.language = '英文';
    }
    
    profile.lastInteraction = Date.now();
    
    // 限制事實數量
    if (profile.facts.length > 50) {
      profile.facts = profile.facts.slice(-50);
    }
    
    this._userProfile.set(profile);
    this.saveUserProfile();
  }
  
  /**
   * 手動添加用戶事實
   */
  addUserFact(fact: Omit<UserFact, 'id' | 'createdAt'>): void {
    let profile = this._userProfile();
    
    if (!profile) {
      profile = {
        id: `user_${Date.now()}`,
        preferences: {},
        facts: [],
        lastInteraction: Date.now()
      };
    }
    
    profile.facts.push({
      ...fact,
      id: `fact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now()
    });
    
    this._userProfile.set(profile);
    this.saveUserProfile();
  }
  
  /**
   * 刪除用戶事實
   */
  removeUserFact(factId: string): void {
    const profile = this._userProfile();
    if (!profile) return;
    
    profile.facts = profile.facts.filter(f => f.id !== factId);
    
    this._userProfile.set(profile);
    this.saveUserProfile();
  }
  
  // ============ 記憶檢索 ============
  
  /**
   * 搜索相關歷史消息
   */
  private async searchRelevantHistory(query: string): Promise<ConversationMessage[]> {
    const allMessages: ConversationMessage[] = [];
    
    // 收集所有對話的消息
    for (const conv of this.conversations.values()) {
      allMessages.push(...conv.messages);
    }
    
    // 簡單的關鍵詞匹配
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const scored = allMessages.map(msg => {
      let score = 0;
      const content = msg.content.toLowerCase();
      
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 1;
        }
      }
      
      // 時間衰減
      const age = (Date.now() - msg.timestamp) / (24 * 60 * 60 * 1000);
      score *= Math.exp(-age / 30); // 30 天半衰期
      
      return { message: msg, score };
    });
    
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.message);
  }
  
  // ============ 輔助方法 ============
  
  private estimateTokens(text: string): number {
    const englishChars = text.replace(/[\u4e00-\u9fa5]/g, '').length;
    const chineseChars = text.length - englishChars;
    return Math.ceil(englishChars / 4 + chineseChars / 1.5);
  }
  
  /**
   * 更新用戶偏好
   */
  updatePreferences(preferences: Partial<UserProfile['preferences']>): void {
    let profile = this._userProfile();
    
    if (!profile) {
      profile = {
        id: `user_${Date.now()}`,
        preferences: {},
        facts: [],
        lastInteraction: Date.now()
      };
    }
    
    profile.preferences = { ...profile.preferences, ...preferences };
    
    this._userProfile.set(profile);
    this.saveUserProfile();
  }
  
  /**
   * 清空記憶
   */
  async clearMemory(type?: 'shortTerm' | 'longTerm' | 'facts' | 'all'): Promise<void> {
    switch (type) {
      case 'shortTerm':
        const current = this._currentConversation();
        if (current) {
          current.messages = [];
          await this.db.put('conversations', current);
        }
        break;
        
      case 'longTerm':
        this.longTermMemory = [];
        this.saveLongTermMemory();
        break;
        
      case 'facts':
        const profile = this._userProfile();
        if (profile) {
          profile.facts = [];
          this._userProfile.set(profile);
          this.saveUserProfile();
        }
        break;
        
      case 'all':
      default:
        this.conversations.clear();
        await this.db.clear('conversations');
        this._currentConversation.set(null);
        
        this.longTermMemory = [];
        this.saveLongTermMemory();
        
        this._userProfile.set(null);
        localStorage.removeItem('tgai-user-profile');
        break;
    }
  }
  
  /**
   * 導出記憶
   */
  async exportMemory(): Promise<string> {
    const data = {
      version: '1.0',
      exportedAt: Date.now(),
      conversations: [...this.conversations.values()],
      longTermMemory: this.longTermMemory,
      userProfile: this._userProfile()
    };
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 導入記憶
   */
  async importMemory(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);
    
    // 導入對話
    for (const conv of data.conversations) {
      this.conversations.set(conv.id, conv);
      await this.db.put('conversations', conv);
    }
    
    // 導入長期記憶
    if (data.longTermMemory) {
      this.longTermMemory = data.longTermMemory;
      this.saveLongTermMemory();
    }
    
    // 導入用戶畫像
    if (data.userProfile) {
      this._userProfile.set(data.userProfile);
      this.saveUserProfile();
    }
  }
}
