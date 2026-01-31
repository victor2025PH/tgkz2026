/**
 * AI 對話服務
 * AI Chat Service
 * 
 * 🆕 Phase 24: 從 app.component.ts 提取 AI 相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'local';

export interface AiSettings {
  provider: AiProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableMemory: boolean;
  enableRag: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  embedding?: number[];
}

// ============ 默認設置 ============

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'gemini',
  model: 'gemini-pro',
  temperature: 0.7,
  maxTokens: 2048,
  systemPrompt: '你是一個專業的 Telegram 營銷助手，幫助用戶進行群組管理和客戶開發。',
  enableMemory: true,
  enableRag: false
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _settings = signal<AiSettings>(DEFAULT_AI_SETTINGS);
  private _currentSession = signal<ChatSession | null>(null);
  private _sessions = signal<ChatSession[]>([]);
  private _isGenerating = signal(false);
  private _isConnected = signal(false);
  private _ragDocuments = signal<RagDocument[]>([]);
  
  settings = this._settings.asReadonly();
  currentSession = this._currentSession.asReadonly();
  sessions = this._sessions.asReadonly();
  isGenerating = this._isGenerating.asReadonly();
  isConnected = this._isConnected.asReadonly();
  ragDocuments = this._ragDocuments.asReadonly();
  
  // ========== 計算屬性 ==========
  
  currentMessages = computed(() => 
    this._currentSession()?.messages || []
  );
  
  hasMessages = computed(() => 
    (this._currentSession()?.messages.length || 0) > 0
  );
  
  provider = computed(() => this._settings().provider);
  
  // ========== 初始化 ==========
  
  constructor() {
    this.setupIpcListeners();
    this.loadSettings();
  }
  
  private setupIpcListeners(): void {
    this.ipc.on('ai-settings-loaded', (data: AiSettings) => {
      this._settings.set({ ...DEFAULT_AI_SETTINGS, ...data });
    });
    
    this.ipc.on('ai-response', (data: { content: string; tokens?: number }) => {
      this._isGenerating.set(false);
      this.addMessage('assistant', data.content, data.tokens);
    });
    
    this.ipc.on('ai-response-error', (data: { error: string }) => {
      this._isGenerating.set(false);
      this.toast.error(`AI 回復失敗: ${data.error}`);
    });
    
    this.ipc.on('ai-connection-status', (data: { connected: boolean }) => {
      this._isConnected.set(data.connected);
    });
    
    this.ipc.on('chat-sessions-loaded', (sessions: ChatSession[]) => {
      this._sessions.set(sessions);
    });
    
    this.ipc.on('rag-documents-loaded', (docs: RagDocument[]) => {
      this._ragDocuments.set(docs);
    });
  }
  
  // ========== 設置操作 ==========
  
  loadSettings(): void {
    this.ipc.send('get-ai-settings');
  }
  
  saveSettings(): void {
    this.ipc.send('save-ai-settings', this._settings());
    this.toast.success('AI 設置已保存');
  }
  
  updateSetting<K extends keyof AiSettings>(key: K, value: AiSettings[K]): void {
    this._settings.update(s => ({ ...s, [key]: value }));
  }
  
  setProvider(provider: AiProvider): void {
    this.updateSetting('provider', provider);
    
    // 根據提供者設置默認模型
    const defaultModels: Record<AiProvider, string> = {
      'gemini': 'gemini-pro',
      'openai': 'gpt-4',
      'claude': 'claude-3-opus',
      'local': 'llama2'
    };
    
    this.updateSetting('model', defaultModels[provider]);
  }
  
  // ========== 對話操作 ==========
  
  sendMessage(content: string): void {
    if (!content.trim() || this._isGenerating()) return;
    
    // 添加用戶消息
    this.addMessage('user', content.trim());
    
    // 發送到後端
    this._isGenerating.set(true);
    
    this.ipc.send('generate-ai-response', {
      prompt: content.trim(),
      settings: this._settings(),
      history: this.currentMessages().slice(-10),
      enableRag: this._settings().enableRag
    });
  }
  
  private addMessage(role: 'user' | 'assistant' | 'system', content: string, tokens?: number): void {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens
    };
    
    this._currentSession.update(session => {
      if (!session) {
        // 創建新會話
        return {
          id: crypto.randomUUID(),
          title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          messages: [message],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      return {
        ...session,
        messages: [...session.messages, message],
        updatedAt: new Date().toISOString()
      };
    });
  }
  
  // ========== 會話管理 ==========
  
  newSession(): void {
    // 保存當前會話
    const current = this._currentSession();
    if (current && current.messages.length > 0) {
      this.saveSession(current);
    }
    
    this._currentSession.set(null);
  }
  
  loadSession(sessionId: string): void {
    const session = this._sessions().find(s => s.id === sessionId);
    if (session) {
      this._currentSession.set(session);
    }
  }
  
  saveSession(session: ChatSession): void {
    this.ipc.send('save-chat-session', session);
    
    this._sessions.update(sessions => {
      const index = sessions.findIndex(s => s.id === session.id);
      if (index >= 0) {
        sessions[index] = session;
        return [...sessions];
      }
      return [session, ...sessions];
    });
  }
  
  deleteSession(sessionId: string): void {
    if (confirm('確定要刪除此對話嗎？')) {
      this.ipc.send('delete-chat-session', { sessionId });
      this._sessions.update(sessions => 
        sessions.filter(s => s.id !== sessionId)
      );
      
      if (this._currentSession()?.id === sessionId) {
        this._currentSession.set(null);
      }
      
      this.toast.success('對話已刪除');
    }
  }
  
  clearHistory(): void {
    if (confirm('確定要清空所有對話記錄嗎？')) {
      this.ipc.send('clear-chat-history');
      this._sessions.set([]);
      this._currentSession.set(null);
      this.toast.success('對話記錄已清空');
    }
  }
  
  // ========== RAG 操作 ==========
  
  loadRagDocuments(): void {
    this.ipc.send('get-rag-documents');
  }
  
  addRagDocument(doc: Omit<RagDocument, 'id' | 'embedding'>): void {
    this.ipc.send('add-rag-document', doc);
    this.toast.info('正在添加文檔...');
  }
  
  deleteRagDocument(docId: string): void {
    if (confirm('確定要刪除此文檔嗎？')) {
      this.ipc.send('delete-rag-document', { docId });
      this._ragDocuments.update(docs => 
        docs.filter(d => d.id !== docId)
      );
      this.toast.success('文檔已刪除');
    }
  }
  
  // ========== 連接測試 ==========
  
  testConnection(): void {
    this.ipc.send('test-ai-connection', this._settings());
    this.toast.info('正在測試 AI 連接...');
  }
  
  // ========== 快捷功能 ==========
  
  generateGreeting(context?: any): void {
    const prompt = `生成一條友好的問候消息，用於 Telegram 群組。${
      context ? `背景信息: ${JSON.stringify(context)}` : ''
    }`;
    
    this.sendMessage(prompt);
  }
  
  generateReply(originalMessage: string, context?: any): void {
    const prompt = `請針對以下消息生成一條專業的回復：
    
原消息：${originalMessage}
${context ? `背景信息: ${JSON.stringify(context)}` : ''}

請生成簡潔、專業的回復。`;
    
    this.sendMessage(prompt);
  }
  
  summarizeConversation(): void {
    const messages = this.currentMessages();
    if (messages.length < 2) {
      this.toast.warning('對話內容太少，無法生成摘要');
      return;
    }
    
    const conversation = messages
      .map(m => `${m.role === 'user' ? '用戶' : 'AI'}：${m.content}`)
      .join('\n');
    
    const prompt = `請總結以下對話的主要內容：\n\n${conversation}`;
    this.sendMessage(prompt);
  }
}
