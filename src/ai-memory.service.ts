/**
 * AI Memory Service
 * AI 記憶增強服務
 * 
 * 功能：
 * - 對話歷史管理
 * - 長期記憶存儲
 * - 上下文壓縮
 * - 向量化記憶檢索
 */
import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  metadata?: {
    leadId?: string;
    sentiment?: string;
    intent?: string;
    entities?: string[];
  };
}

export interface Conversation {
  id: string;
  leadId: string;
  leadName: string;
  messages: ConversationMessage[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isArchived: boolean;
}

export interface Memory {
  id: string;
  type: 'fact' | 'preference' | 'interaction' | 'relationship';
  leadId: string;
  content: string;
  importance: number;  // 1-10
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  embedding?: number[];  // 向量嵌入（用於相似度搜索）
}

export interface MemorySearchResult {
  memory: Memory;
  relevance: number;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AIMemoryService {
  
  // 對話存儲
  private _conversations = signal<Map<string, Conversation>>(new Map());
  
  // 長期記憶
  private _memories = signal<Memory[]>([]);
  
  // 配置
  private _config = signal({
    maxMessagesPerConversation: 50,
    maxMemoriesPerLead: 100,
    contextWindowSize: 10,  // 發送給 AI 的最近消息數
    summaryThreshold: 20,   // 超過多少消息自動生成摘要
    memoryDecayDays: 90     // 記憶衰減天數
  });
  
  // 計算屬性
  conversations = computed(() => Array.from(this._conversations().values()));
  memories = computed(() => this._memories());
  
  constructor() {
    this.loadData();
  }
  
  // ============ 對話管理 ============
  
  /**
   * 獲取或創建對話
   */
  getOrCreateConversation(leadId: string, leadName: string): Conversation {
    const existing = this._conversations().get(leadId);
    if (existing) return existing;
    
    const conversation: Conversation = {
      id: 'conv-' + Date.now().toString(36),
      leadId,
      leadName,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      isArchived: false
    };
    
    this._conversations.update(convs => {
      const newConvs = new Map(convs);
      newConvs.set(leadId, conversation);
      return newConvs;
    });
    
    this.saveData();
    return conversation;
  }
  
  /**
   * 添加消息
   */
  addMessage(
    leadId: string, 
    role: 'user' | 'assistant',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): ConversationMessage {
    const message: ConversationMessage = {
      id: 'msg-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      role,
      content,
      timestamp: new Date(),
      tokens: this.estimateTokens(content),
      metadata
    };
    
    this._conversations.update(convs => {
      const newConvs = new Map(convs);
      const conv = newConvs.get(leadId);
      
      if (conv) {
        const updatedConv = {
          ...conv,
          messages: [...conv.messages, message].slice(-this._config().maxMessagesPerConversation),
          updatedAt: new Date()
        };
        newConvs.set(leadId, updatedConv);
        
        // 檢查是否需要生成摘要
        if (updatedConv.messages.length >= this._config().summaryThreshold && !updatedConv.summary) {
          this.generateSummary(leadId);
        }
      }
      
      return newConvs;
    });
    
    this.saveData();
    return message;
  }
  
  /**
   * 獲取對話上下文（用於發送給 AI）
   */
  getContext(leadId: string, includeMemories: boolean = true): ConversationMessage[] {
    const conv = this._conversations().get(leadId);
    if (!conv) return [];
    
    const config = this._config();
    const recentMessages = conv.messages.slice(-config.contextWindowSize);
    
    const context: ConversationMessage[] = [];
    
    // 添加摘要作為系統消息
    if (conv.summary) {
      context.push({
        id: 'summary',
        role: 'system',
        content: `對話摘要：${conv.summary}`,
        timestamp: new Date()
      });
    }
    
    // 添加相關記憶
    if (includeMemories) {
      const memories = this.getLeadMemories(leadId);
      if (memories.length > 0) {
        const memoryContext = memories
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 5)
          .map(m => `- ${m.content}`)
          .join('\n');
        
        context.push({
          id: 'memories',
          role: 'system',
          content: `關於此客戶的重要信息：\n${memoryContext}`,
          timestamp: new Date()
        });
      }
    }
    
    // 添加最近消息
    context.push(...recentMessages);
    
    return context;
  }
  
  /**
   * 生成對話摘要
   */
  async generateSummary(leadId: string): Promise<string> {
    const conv = this._conversations().get(leadId);
    if (!conv || conv.messages.length < 5) return '';
    
    // 簡單摘要（實際應用中可以用 AI 生成）
    const keyMessages = conv.messages
      .filter(m => m.content.length > 20)
      .slice(0, 10)
      .map(m => m.content.substring(0, 50))
      .join('; ');
    
    const summary = `與 ${conv.leadName} 的對話，涉及：${keyMessages}...`;
    
    this._conversations.update(convs => {
      const newConvs = new Map(convs);
      const c = newConvs.get(leadId);
      if (c) {
        newConvs.set(leadId, { ...c, summary });
      }
      return newConvs;
    });
    
    this.saveData();
    return summary;
  }
  
  /**
   * 清除對話
   */
  clearConversation(leadId: string): void {
    this._conversations.update(convs => {
      const newConvs = new Map(convs);
      const conv = newConvs.get(leadId);
      if (conv) {
        newConvs.set(leadId, {
          ...conv,
          messages: [],
          summary: undefined,
          updatedAt: new Date()
        });
      }
      return newConvs;
    });
    this.saveData();
  }
  
  /**
   * 歸檔對話
   */
  archiveConversation(leadId: string): void {
    this._conversations.update(convs => {
      const newConvs = new Map(convs);
      const conv = newConvs.get(leadId);
      if (conv) {
        newConvs.set(leadId, { ...conv, isArchived: true });
      }
      return newConvs;
    });
    this.saveData();
  }
  
  // ============ 長期記憶管理 ============
  
  /**
   * 添加記憶
   */
  addMemory(params: {
    leadId: string;
    type: Memory['type'];
    content: string;
    importance?: number;
  }): Memory {
    const memory: Memory = {
      id: 'mem-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      type: params.type,
      leadId: params.leadId,
      content: params.content,
      importance: params.importance || 5,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0
    };
    
    this._memories.update(memories => {
      // 檢查重複
      const existing = memories.find(m => 
        m.leadId === params.leadId && 
        m.content.toLowerCase() === params.content.toLowerCase()
      );
      
      if (existing) {
        // 更新現有記憶的重要性
        return memories.map(m => 
          m.id === existing.id 
            ? { ...m, importance: Math.min(10, m.importance + 1), lastAccessed: new Date() }
            : m
        );
      }
      
      // 添加新記憶，限制數量
      const leadMemories = memories.filter(m => m.leadId === params.leadId);
      if (leadMemories.length >= this._config().maxMemoriesPerLead) {
        // 刪除最舊的低重要性記憶
        const toRemove = leadMemories
          .sort((a, b) => a.importance - b.importance)
          .slice(0, 5);
        return [...memories.filter(m => !toRemove.includes(m)), memory];
      }
      
      return [...memories, memory];
    });
    
    this.saveData();
    return memory;
  }
  
  /**
   * 從對話中提取記憶
   */
  extractMemoriesFromMessage(leadId: string, message: string): Memory[] {
    const extracted: Memory[] = [];
    
    // 提取聯繫方式
    const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      extracted.push(this.addMemory({
        leadId,
        type: 'fact',
        content: `郵箱: ${emailMatch[0]}`,
        importance: 8
      }));
    }
    
    const phoneMatch = message.match(/1[3-9]\d{9}/);
    if (phoneMatch) {
      extracted.push(this.addMemory({
        leadId,
        type: 'fact',
        content: `電話: ${phoneMatch[0]}`,
        importance: 8
      }));
    }
    
    // 提取偏好（簡單關鍵詞匹配）
    const preferencePatterns = [
      { pattern: /喜歡(.{2,10})/, type: 'preference' as const },
      { pattern: /需要(.{2,15})/, type: 'preference' as const },
      { pattern: /想要(.{2,15})/, type: 'preference' as const },
      { pattern: /預算(.{2,20})/, type: 'fact' as const },
      { pattern: /公司(.{2,20})/, type: 'fact' as const }
    ];
    
    for (const { pattern, type } of preferencePatterns) {
      const match = message.match(pattern);
      if (match) {
        extracted.push(this.addMemory({
          leadId,
          type,
          content: match[0],
          importance: 6
        }));
      }
    }
    
    return extracted;
  }
  
  /**
   * 獲取客戶的所有記憶
   */
  getLeadMemories(leadId: string): Memory[] {
    return this._memories()
      .filter(m => m.leadId === leadId)
      .sort((a, b) => b.importance - a.importance);
  }
  
  /**
   * 搜索相關記憶
   */
  searchMemories(leadId: string, query: string, limit: number = 5): MemorySearchResult[] {
    const memories = this.getLeadMemories(leadId);
    
    // 簡單關鍵詞匹配（實際應用可使用向量搜索）
    const queryWords = query.toLowerCase().split(/\s+/);
    
    const results = memories.map(memory => {
      const contentWords = memory.content.toLowerCase().split(/\s+/);
      const matchCount = queryWords.filter(q => 
        contentWords.some(c => c.includes(q))
      ).length;
      
      const relevance = matchCount / queryWords.length;
      
      return { memory, relevance };
    });
    
    return results
      .filter(r => r.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }
  
  /**
   * 更新記憶訪問
   */
  accessMemory(memoryId: string): void {
    this._memories.update(memories =>
      memories.map(m => 
        m.id === memoryId 
          ? { ...m, lastAccessed: new Date(), accessCount: m.accessCount + 1 }
          : m
      )
    );
    this.saveData();
  }
  
  /**
   * 刪除記憶
   */
  deleteMemory(memoryId: string): void {
    this._memories.update(memories => memories.filter(m => m.id !== memoryId));
    this.saveData();
  }
  
  /**
   * 清理過期記憶
   */
  cleanupExpiredMemories(): number {
    const config = this._config();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.memoryDecayDays);
    
    const before = this._memories().length;
    
    this._memories.update(memories =>
      memories.filter(m => 
        m.importance >= 7 ||  // 高重要性記憶不過期
        m.lastAccessed > cutoffDate
      )
    );
    
    const removed = before - this._memories().length;
    if (removed > 0) this.saveData();
    
    return removed;
  }
  
  // ============ 統計 ============
  
  /**
   * 獲取記憶統計
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    totalMemories: number;
    memoriesByType: Record<string, number>;
  } {
    const conversations = this.conversations();
    const memories = this._memories();
    
    return {
      totalConversations: conversations.length,
      totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
      totalMemories: memories.length,
      memoriesByType: {
        fact: memories.filter(m => m.type === 'fact').length,
        preference: memories.filter(m => m.type === 'preference').length,
        interaction: memories.filter(m => m.type === 'interaction').length,
        relationship: memories.filter(m => m.type === 'relationship').length
      }
    };
  }
  
  // ============ 輔助方法 ============
  
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = text.length - chineseChars;
    return Math.ceil(chineseChars / 1.5 + otherChars / 4);
  }
  
  // ============ 持久化 ============
  
  private loadData(): void {
    try {
      // 加載對話
      const convData = localStorage.getItem('tg-matrix-conversations');
      if (convData) {
        const parsed = JSON.parse(convData);
        const convMap = new Map<string, Conversation>();
        for (const conv of parsed) {
          conv.createdAt = new Date(conv.createdAt);
          conv.updatedAt = new Date(conv.updatedAt);
          conv.messages = conv.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          convMap.set(conv.leadId, conv);
        }
        this._conversations.set(convMap);
      }
      
      // 加載記憶
      const memData = localStorage.getItem('tg-matrix-memories');
      if (memData) {
        const memories = JSON.parse(memData).map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
          lastAccessed: new Date(m.lastAccessed)
        }));
        this._memories.set(memories);
      }
    } catch (e) {
      console.error('Failed to load AI memory data:', e);
    }
  }
  
  private saveData(): void {
    try {
      // 保存對話
      const conversations = Array.from(this._conversations().values());
      localStorage.setItem('tg-matrix-conversations', JSON.stringify(conversations));
      
      // 保存記憶
      localStorage.setItem('tg-matrix-memories', JSON.stringify(this._memories()));
    } catch (e) {
      console.error('Failed to save AI memory data:', e);
    }
  }
}
