/**
 * RAG 知識庫服務
 * RAG Knowledge Service
 * 
 * 🆕 Phase 26: 從 app.component.ts 提取 RAG 相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface RagStats {
  totalDocuments: number;
  totalChunks: number;
  lastIndexed: string | null;
  indexSize: string;
  categories: Record<string, number>;
}

export interface RagDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface RagSearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RagFeedback {
  queryId: string;
  resultId: string;
  helpful: boolean;
  comment?: string;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class RagService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _isInitialized = signal(false);
  private _isLoading = signal(false);
  private _isIndexing = signal(false);
  private _stats = signal<RagStats>({
    totalDocuments: 0,
    totalChunks: 0,
    lastIndexed: null,
    indexSize: '0 KB',
    categories: {}
  });
  private _searchResults = signal<RagSearchResult[]>([]);
  private _searchQuery = signal('');
  
  isInitialized = this._isInitialized.asReadonly();
  isLoading = this._isLoading.asReadonly();
  isIndexing = this._isIndexing.asReadonly();
  stats = this._stats.asReadonly();
  searchResults = this._searchResults.asReadonly();
  searchQuery = this._searchQuery.asReadonly();
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('rag-initialized', (data: { success: boolean }) => {
      this._isInitialized.set(data.success);
      this._isLoading.set(false);
      if (data.success) {
        this.toast.success('RAG 系統初始化成功');
        this.refreshStats();
      }
    });
    
    this.ipc.on('rag-stats', (data: RagStats) => {
      this._stats.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('rag-search-results', (data: { results: RagSearchResult[] }) => {
      this._searchResults.set(data.results);
      this._isLoading.set(false);
    });
    
    this.ipc.on('rag-indexing-started', () => {
      this._isIndexing.set(true);
      this.toast.info('開始索引知識庫...');
    });
    
    this.ipc.on('rag-indexing-completed', (data: { count: number }) => {
      this._isIndexing.set(false);
      this.toast.success(`索引完成，共處理 ${data.count} 個文檔`);
      this.refreshStats();
    });
    
    this.ipc.on('rag-indexing-error', (data: { error: string }) => {
      this._isIndexing.set(false);
      this.toast.error(`索引失敗: ${data.error}`);
    });
    
    this.ipc.on('rag-knowledge-added', () => {
      this.toast.success('知識已添加');
      this.refreshStats();
    });
    
    this.ipc.on('rag-cleanup-completed', (data: { removed: number }) => {
      this.toast.success(`已清理 ${data.removed} 個過時知識`);
      this.refreshStats();
    });
  }
  
  // ========== 初始化操作 ==========
  
  initRagSystem(): void {
    this._isLoading.set(true);
    this.ipc.send('init-rag-system');
  }
  
  // ========== 索引操作 ==========
  
  triggerLearning(): void {
    this.ipc.send('rag-trigger-learning');
  }
  
  reindexConversations(): void {
    this.ipc.send('rag-reindex-conversations');
  }
  
  reindexHighValueConversations(): void {
    this.ipc.send('rag-reindex-high-value');
  }
  
  // ========== 搜索操作 ==========
  
  search(query: string): void {
    if (!query.trim()) {
      this._searchResults.set([]);
      return;
    }
    
    this._searchQuery.set(query);
    this._isLoading.set(true);
    this.ipc.send('rag-search', { query });
  }
  
  clearSearchResults(): void {
    this._searchResults.set([]);
    this._searchQuery.set('');
  }
  
  // ========== 知識管理 ==========
  
  addKnowledge(content: string, category: string, metadata?: Record<string, any>): void {
    this.ipc.send('rag-add-knowledge', {
      content,
      category,
      metadata
    });
  }
  
  deleteKnowledge(id: string): void {
    this.ipc.send('rag-delete-knowledge', { id });
  }
  
  // ========== 反饋操作 ==========
  
  sendFeedback(feedback: RagFeedback): void {
    this.ipc.send('rag-feedback', feedback);
    this.toast.success('感謝您的反饋！');
  }
  
  // ========== 清理操作 ==========
  
  cleanupKnowledge(): void {
    this.ipc.send('rag-cleanup');
  }
  
  // ========== 統計操作 ==========
  
  refreshStats(): void {
    this._isLoading.set(true);
    this.ipc.send('get-rag-stats');
  }
}
