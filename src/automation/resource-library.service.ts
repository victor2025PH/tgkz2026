/**
 * 資料庫服務 - 自動化中心資源管理
 * Resource Library Service
 * 
 * 功能:
 * 1. 資源CRUD操作
 * 2. 群組成員提取
 * 3. 標籤管理
 * 4. 批量操作
 * 5. 搜索過濾
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 資源類型
export type ResourceType = 'user' | 'group' | 'channel';

// 資源狀態
export type ResourceStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'blocked' | 'invalid';

// 來源類型
export type SourceType = 'group_member' | 'keyword_match' | 'manual' | 'import' | 'channel_subscriber';

// 資源數據
export interface Resource {
  id: number;
  type: ResourceType;
  telegramId: string;
  username?: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  
  // 來源信息
  sourceType: SourceType;
  sourceId?: string;
  sourceName?: string;
  
  // 標籤和狀態
  tags: string[];
  status: ResourceStatus;
  
  // 在線狀態
  isOnline?: boolean;
  lastSeen?: Date;
  
  // 統計
  messageCount?: number;
  lastContactAt?: Date;
  
  // 時間戳
  createdAt: Date;
  updatedAt: Date;
  
  // 額外數據
  metadata?: Record<string, any>;
}

// 資源統計
export interface ResourceStats {
  total: number;
  users: number;
  groups: number;
  channels: number;
  byStatus: Record<ResourceStatus, number>;
  bySource: Record<string, number>;
  recentAdded: number;  // 最近7天新增
}

// 篩選條件
export interface ResourceFilter {
  type?: ResourceType;
  status?: ResourceStatus[];
  tags?: string[];
  sourceId?: string;
  search?: string;
  dateRange?: { from: Date; to: Date };
  isOnline?: boolean;
}

// 排序選項
export interface ResourceSort {
  field: 'createdAt' | 'updatedAt' | 'displayName' | 'lastContactAt' | 'messageCount';
  direction: 'asc' | 'desc';
}

// 提取任務
export interface ExtractionTask {
  id: string;
  groupId: string;
  groupName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalMembers: number;
  extractedCount: number;
  skippedCount: number;
  errorCount: number;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// 提取選項
export interface ExtractionOptions {
  filterBots: boolean;
  filterDeleted: boolean;
  skipExisting: boolean;
  onlyActiveRecent: boolean;  // 僅最近活躍
  activeDays: number;         // 活躍天數閾值
  autoTag?: string[];         // 自動添加標籤
}

@Injectable({
  providedIn: 'root'
})
export class ResourceLibraryService {
  private ipcService = inject(ElectronIpcService);
  
  // 資源列表
  private _resources = signal<Resource[]>([]);
  resources = this._resources.asReadonly();
  
  // 統計
  private _stats = signal<ResourceStats>({
    total: 0,
    users: 0,
    groups: 0,
    channels: 0,
    byStatus: {} as Record<ResourceStatus, number>,
    bySource: {},
    recentAdded: 0
  });
  stats = this._stats.asReadonly();
  
  // 標籤列表
  private _tags = signal<string[]>([
    '高意向', '待跟進', '已成交', '流失風險', 'VIP', 
    '新發現', '已聯繫', '需要報價', '技術諮詢'
  ]);
  tags = this._tags.asReadonly();
  
  // 提取任務
  private _extractionTasks = signal<ExtractionTask[]>([]);
  extractionTasks = this._extractionTasks.asReadonly();
  
  // 選中的資源
  private _selectedIds = signal<Set<number>>(new Set());
  selectedIds = this._selectedIds.asReadonly();
  
  // 篩選條件
  private _filter = signal<ResourceFilter>({});
  filter = this._filter.asReadonly();
  
  // 排序
  private _sort = signal<ResourceSort>({ field: 'createdAt', direction: 'desc' });
  sort = this._sort.asReadonly();
  
  // 載入狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  // 計算屬性：篩選後的資源
  filteredResources = computed(() => {
    let result = this._resources();
    const f = this._filter();
    
    // 類型篩選
    if (f.type) {
      result = result.filter(r => r.type === f.type);
    }
    
    // 狀態篩選
    if (f.status && f.status.length > 0) {
      result = result.filter(r => f.status!.includes(r.status));
    }
    
    // 標籤篩選
    if (f.tags && f.tags.length > 0) {
      result = result.filter(r => f.tags!.some(t => r.tags.includes(t)));
    }
    
    // 來源篩選
    if (f.sourceId) {
      result = result.filter(r => r.sourceId === f.sourceId);
    }
    
    // 搜索
    if (f.search) {
      const search = f.search.toLowerCase();
      result = result.filter(r => 
        r.displayName.toLowerCase().includes(search) ||
        r.username?.toLowerCase().includes(search) ||
        r.telegramId.includes(search)
      );
    }
    
    // 在線狀態
    if (f.isOnline !== undefined) {
      result = result.filter(r => r.isOnline === f.isOnline);
    }
    
    // 日期範圍
    if (f.dateRange) {
      result = result.filter(r => {
        const created = new Date(r.createdAt);
        return created >= f.dateRange!.from && created <= f.dateRange!.to;
      });
    }
    
    // 排序
    const s = this._sort();
    result = [...result].sort((a, b) => {
      let aVal: any = a[s.field];
      let bVal: any = b[s.field];
      
      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (s.direction === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return result;
  });
  
  // 選中的資源列表
  selectedResources = computed(() => {
    const ids = this._selectedIds();
    return this._resources().filter(r => ids.has(r.id));
  });
  
  constructor() {
    this.setupIpcListeners();
  }
  
  private setupIpcListeners() {
    // 監聽資源列表更新
    this.ipcService.on('resources-loaded', (data: Resource[]) => {
      this._resources.set(data);
      this.updateStats();
      this._isLoading.set(false);
    });
    
    // 監聽提取進度
    this.ipcService.on('extraction-progress', (task: ExtractionTask) => {
      this._extractionTasks.update(tasks => {
        const index = tasks.findIndex(t => t.id === task.id);
        if (index >= 0) {
          tasks[index] = task;
          return [...tasks];
        }
        return [...tasks, task];
      });
    });
    
    // 監聽提取完成
    this.ipcService.on('extraction-completed', (task: ExtractionTask) => {
      this._extractionTasks.update(tasks => {
        const index = tasks.findIndex(t => t.id === task.id);
        if (index >= 0) {
          tasks[index] = { ...task, status: 'completed' };
          return [...tasks];
        }
        return tasks;
      });
      // 刷新資源列表
      this.loadResources();
    });
    
    // 監聯統計更新
    this.ipcService.on('resource-stats', (stats: ResourceStats) => {
      this._stats.set(stats);
    });
  }
  
  // ========== 資源操作 ==========
  
  /**
   * 載入資源列表
   */
  async loadResources(filter?: ResourceFilter) {
    this._isLoading.set(true);
    if (filter) {
      this._filter.set(filter);
    }
    this.ipcService.send('load-resources', { filter: this._filter() });
  }
  
  /**
   * 添加資源
   */
  async addResource(resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) {
    this.ipcService.send('add-resource', resource);
  }
  
  /**
   * 批量添加資源
   */
  async addResources(resources: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>[]) {
    this.ipcService.send('add-resources-batch', { resources });
  }
  
  /**
   * 更新資源
   */
  async updateResource(id: number, updates: Partial<Resource>) {
    this.ipcService.send('update-resource', { id, updates });
    
    // 樂觀更新本地
    this._resources.update(resources => 
      resources.map(r => r.id === id ? { ...r, ...updates, updatedAt: new Date() } : r)
    );
  }
  
  /**
   * 批量更新資源
   */
  async updateResources(ids: number[], updates: Partial<Resource>) {
    this.ipcService.send('update-resources-batch', { ids, updates });
    
    // 樂觀更新本地
    const idSet = new Set(ids);
    this._resources.update(resources => 
      resources.map(r => idSet.has(r.id) ? { ...r, ...updates, updatedAt: new Date() } : r)
    );
  }
  
  /**
   * 刪除資源
   */
  async deleteResource(id: number) {
    this.ipcService.send('delete-resource', { id });
    this._resources.update(resources => resources.filter(r => r.id !== id));
  }
  
  /**
   * 批量刪除資源
   */
  async deleteResources(ids: number[]) {
    this.ipcService.send('delete-resources-batch', { ids });
    const idSet = new Set(ids);
    this._resources.update(resources => resources.filter(r => !idSet.has(r.id)));
    this._selectedIds.set(new Set());
  }
  
  // ========== 標籤操作 ==========
  
  /**
   * 添加標籤到資源
   */
  async addTagsToResources(ids: number[], tags: string[]) {
    this.ipcService.send('add-tags-to-resources', { ids, tags });
    
    const idSet = new Set(ids);
    this._resources.update(resources => 
      resources.map(r => {
        if (idSet.has(r.id)) {
          const newTags = [...new Set([...r.tags, ...tags])];
          return { ...r, tags: newTags };
        }
        return r;
      })
    );
  }
  
  /**
   * 移除資源的標籤
   */
  async removeTagsFromResources(ids: number[], tags: string[]) {
    this.ipcService.send('remove-tags-from-resources', { ids, tags });
    
    const idSet = new Set(ids);
    const tagSet = new Set(tags);
    this._resources.update(resources => 
      resources.map(r => {
        if (idSet.has(r.id)) {
          return { ...r, tags: r.tags.filter(t => !tagSet.has(t)) };
        }
        return r;
      })
    );
  }
  
  /**
   * 創建新標籤
   */
  createTag(tag: string) {
    if (!this._tags().includes(tag)) {
      this._tags.update(tags => [...tags, tag]);
      this.ipcService.send('create-tag', { tag });
    }
  }
  
  // ========== 群組成員提取 ==========
  
  /**
   * 開始提取群組成員
   */
  async startExtraction(groups: { id: string; name: string; memberCount: number }[], options: ExtractionOptions) {
    const tasks: ExtractionTask[] = groups.map(g => ({
      id: `extract_${g.id}_${Date.now()}`,
      groupId: g.id,
      groupName: g.name,
      status: 'pending',
      totalMembers: g.memberCount,
      extractedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      progress: 0
    }));
    
    this._extractionTasks.update(existing => [...existing, ...tasks]);
    
    this.ipcService.send('start-member-extraction', {
      groups: groups.map(g => g.id),
      options
    });
  }
  
  /**
   * 取消提取任務
   */
  cancelExtraction(taskId: string) {
    this.ipcService.send('cancel-extraction', { taskId });
    this._extractionTasks.update(tasks => 
      tasks.map(t => t.id === taskId ? { ...t, status: 'cancelled' } : t)
    );
  }
  
  /**
   * 清除已完成的任務
   */
  clearCompletedTasks() {
    this._extractionTasks.update(tasks => 
      tasks.filter(t => t.status === 'pending' || t.status === 'running')
    );
  }
  
  // ========== 選擇操作 ==========
  
  toggleSelect(id: number) {
    this._selectedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }
  
  selectAll() {
    const allIds = this.filteredResources().map(r => r.id);
    this._selectedIds.set(new Set(allIds));
  }
  
  deselectAll() {
    this._selectedIds.set(new Set());
  }
  
  isSelected(id: number): boolean {
    return this._selectedIds().has(id);
  }
  
  // ========== 篩選和排序 ==========
  
  setFilter(filter: ResourceFilter) {
    this._filter.set(filter);
  }
  
  updateFilter(updates: Partial<ResourceFilter>) {
    this._filter.update(f => ({ ...f, ...updates }));
  }
  
  clearFilter() {
    this._filter.set({});
  }
  
  setSort(sort: ResourceSort) {
    this._sort.set(sort);
  }
  
  // ========== 導入導出 ==========
  
  /**
   * 導出資源
   */
  async exportResources(format: 'csv' | 'json' = 'csv', ids?: number[]) {
    const resourcesToExport = ids 
      ? this._resources().filter(r => ids.includes(r.id))
      : this.filteredResources();
    
    this.ipcService.send('export-resources', { resources: resourcesToExport, format });
  }
  
  /**
   * 導入資源
   */
  async importResources(file: File) {
    // 讀取文件內容
    const content = await file.text();
    this.ipcService.send('import-resources', { content, filename: file.name });
  }
  
  // ========== 內部方法 ==========
  
  private updateStats() {
    const resources = this._resources();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats: ResourceStats = {
      total: resources.length,
      users: resources.filter(r => r.type === 'user').length,
      groups: resources.filter(r => r.type === 'group').length,
      channels: resources.filter(r => r.type === 'channel').length,
      byStatus: {} as Record<ResourceStatus, number>,
      bySource: {},
      recentAdded: resources.filter(r => new Date(r.createdAt) >= weekAgo).length
    };
    
    // 按狀態統計
    for (const r of resources) {
      stats.byStatus[r.status] = (stats.byStatus[r.status] || 0) + 1;
      if (r.sourceName) {
        stats.bySource[r.sourceName] = (stats.bySource[r.sourceName] || 0) + 1;
      }
    }
    
    this._stats.set(stats);
  }
  
  /**
   * 將資源加入發送隊列
   */
  async addToSendQueue(ids: number[], templateId?: string) {
    const resources = this._resources().filter(r => ids.includes(r.id));
    this.ipcService.send('add-resources-to-queue', { 
      resources: resources.map(r => ({
        id: r.id,
        telegramId: r.telegramId,
        username: r.username,
        displayName: r.displayName
      })),
      templateId
    });
  }
}
