/**
 * 向量記憶服務
 * Vector Memory Service
 * 
 * 🆕 Phase 26: 從 app.component.ts 提取向量記憶相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface VectorMemoryStats {
  totalMemories: number;
  totalUsers: number;
  averagePerUser: number;
  storageSize: string;
  oldestMemory: string | null;
  newestMemory: string | null;
}

export interface VectorMemory {
  id: string;
  userId: string;
  content: string;
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  accessCount: number;
  importance: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface MemorySearchResult {
  memory: VectorMemory;
  score: number;
}

export interface MemoryUser {
  userId: string;
  username?: string;
  memoryCount: number;
  lastActivity: string;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class VectorMemoryService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _stats = signal<VectorMemoryStats>({
    totalMemories: 0,
    totalUsers: 0,
    averagePerUser: 0,
    storageSize: '0 KB',
    oldestMemory: null,
    newestMemory: null
  });
  private _memories = signal<VectorMemory[]>([]);
  private _searchResults = signal<MemorySearchResult[]>([]);
  private _users = signal<MemoryUser[]>([]);
  private _isLoading = signal(false);
  private _selectedUserId = signal<string | null>(null);
  
  stats = this._stats.asReadonly();
  memories = this._memories.asReadonly();
  searchResults = this._searchResults.asReadonly();
  users = this._users.asReadonly();
  isLoading = this._isLoading.asReadonly();
  selectedUserId = this._selectedUserId.asReadonly();
  
  // ========== 計算屬性 ==========
  
  userMemories = computed(() => {
    const userId = this._selectedUserId();
    if (!userId) return [];
    return this._memories().filter(m => m.userId === userId);
  });
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ========== IPC 監聯 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('vector-memory-stats', (data: VectorMemoryStats) => {
      this._stats.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('vector-memories-loaded', (data: VectorMemory[]) => {
      this._memories.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('vector-memory-search-results', (data: { results: MemorySearchResult[] }) => {
      this._searchResults.set(data.results);
      this._isLoading.set(false);
    });
    
    this.ipc.on('memory-users-loaded', (data: MemoryUser[]) => {
      this._users.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('vector-memory-added', (data: VectorMemory) => {
      this._memories.update(list => [...list, data]);
      this.toast.success('記憶已添加');
    });
    
    this.ipc.on('vector-memory-deleted', (data: { id: string }) => {
      this._memories.update(list => list.filter(m => m.id !== data.id));
      this.toast.success('記憶已刪除');
    });
    
    this.ipc.on('cleanup-completed', (data: { removed: number }) => {
      this.toast.success(`已清理 ${data.removed} 個過期記憶`);
      this.refreshStats();
    });
    
    this.ipc.on('merge-completed', (data: { merged: number }) => {
      this.toast.success(`已合併 ${data.merged} 個相似記憶`);
      this.refreshStats();
    });
  }
  
  // ========== 搜索操作 ==========
  
  search(query: string, userId?: string): void {
    if (!query.trim()) {
      this._searchResults.set([]);
      return;
    }
    
    this._isLoading.set(true);
    this.ipc.send('search-vector-memory', { query, userId });
  }
  
  clearSearchResults(): void {
    this._searchResults.set([]);
  }
  
  // ========== 記憶操作 ==========
  
  addMemory(userId: string, content: string, metadata?: Record<string, any>): void {
    this.ipc.send('add-vector-memory', {
      userId,
      content,
      metadata
    });
  }
  
  deleteMemory(id: string): void {
    if (!confirm('確定要刪除此記憶嗎？')) return;
    this.ipc.send('delete-vector-memory', { id });
  }
  
  loadUserMemories(userId: string): void {
    this._selectedUserId.set(userId);
    this._isLoading.set(true);
    this.ipc.send('get-user-memories', { userId });
  }
  
  // ========== 用戶操作 ==========
  
  loadUserList(): void {
    this._isLoading.set(true);
    this.ipc.send('get-memory-users');
  }
  
  selectUser(userId: string | null): void {
    this._selectedUserId.set(userId);
    if (userId) {
      this.loadUserMemories(userId);
    }
  }
  
  // ========== 維護操作 ==========
  
  cleanupOldMemories(daysOld: number = 90): void {
    if (!confirm(`確定要清理 ${daysOld} 天前的舊記憶嗎？`)) return;
    this.ipc.send('cleanup-old-memories', { daysOld });
  }
  
  mergeSimilarMemories(threshold: number = 0.9): void {
    if (!confirm('確定要合併相似記憶嗎？此操作無法撤銷。')) return;
    this.ipc.send('merge-similar-memories', { threshold });
  }
  
  // ========== 統計操作 ==========
  
  refreshStats(): void {
    this._isLoading.set(true);
    this.ipc.send('get-vector-memory-stats');
  }
  
  loadAllMemories(): void {
    this._isLoading.set(true);
    this.ipc.send('get-all-memories');
  }
}
