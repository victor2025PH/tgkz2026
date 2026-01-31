/**
 * 資源服務
 * Resource Service
 * 
 * 🆕 Phase 25: 從 app.component.ts 提取資源相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export type ResourceType = 'group' | 'channel' | 'user' | 'bot';
export type ResourceStatus = 'discovered' | 'joined' | 'monitored' | 'left';

export interface Resource {
  id: number;
  telegram_id?: number;
  title: string;
  username?: string;
  type: ResourceType;
  status: ResourceStatus;
  member_count?: number;
  description?: string;
  is_public?: boolean;
  discovered_at: string;
  joined_at?: string;
  last_activity?: string;
  tags?: string[];
}

export interface ResourceFilter {
  type?: ResourceType | 'all';
  status?: ResourceStatus | 'all';
  search?: string;
  hasMembers?: boolean;
  isPublic?: boolean;
}

export interface ResourceStats {
  total: number;
  byType: Record<ResourceType, number>;
  byStatus: Record<ResourceStatus, number>;
  totalMembers: number;
}

export interface SearchQuery {
  keyword: string;
  type: 'group' | 'channel' | 'both';
  limit: number;
  includePrivate: boolean;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ResourceService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _resources = signal<Resource[]>([]);
  private _selectedIds = signal<Set<number>>(new Set());
  private _filter = signal<ResourceFilter>({ type: 'all', status: 'all' });
  private _isLoading = signal(false);
  private _searchResults = signal<Resource[]>([]);
  private _isSearching = signal(false);
  
  resources = this._resources.asReadonly();
  selectedIds = this._selectedIds.asReadonly();
  filter = this._filter.asReadonly();
  isLoading = this._isLoading.asReadonly();
  searchResults = this._searchResults.asReadonly();
  isSearching = this._isSearching.asReadonly();
  
  // ========== 計算屬性 ==========
  
  filteredResources = computed(() => {
    const resources = this._resources();
    const filter = this._filter();
    
    return resources.filter(r => {
      if (filter.type && filter.type !== 'all' && r.type !== filter.type) {
        return false;
      }
      
      if (filter.status && filter.status !== 'all' && r.status !== filter.status) {
        return false;
      }
      
      if (filter.search) {
        const search = filter.search.toLowerCase();
        const matchTitle = r.title?.toLowerCase().includes(search);
        const matchUsername = r.username?.toLowerCase().includes(search);
        if (!matchTitle && !matchUsername) return false;
      }
      
      if (filter.hasMembers !== undefined) {
        if (filter.hasMembers && !r.member_count) return false;
        if (!filter.hasMembers && r.member_count) return false;
      }
      
      if (filter.isPublic !== undefined && r.is_public !== filter.isPublic) {
        return false;
      }
      
      return true;
    });
  });
  
  stats = computed((): ResourceStats => {
    const resources = this._resources();
    
    const byType: Record<ResourceType, number> = {
      'group': 0, 'channel': 0, 'user': 0, 'bot': 0
    };
    
    const byStatus: Record<ResourceStatus, number> = {
      'discovered': 0, 'joined': 0, 'monitored': 0, 'left': 0
    };
    
    let totalMembers = 0;
    
    for (const r of resources) {
      if (byType[r.type] !== undefined) byType[r.type]++;
      if (byStatus[r.status] !== undefined) byStatus[r.status]++;
      totalMembers += r.member_count || 0;
    }
    
    return {
      total: resources.length,
      byType,
      byStatus,
      totalMembers
    };
  });
  
  selectedResources = computed(() => {
    const ids = this._selectedIds();
    return this._resources().filter(r => ids.has(r.id));
  });
  
  selectedCount = computed(() => this._selectedIds().size);
  
  groups = computed(() => this._resources().filter(r => r.type === 'group'));
  channels = computed(() => this._resources().filter(r => r.type === 'channel'));
  joinedResources = computed(() => this._resources().filter(r => r.status === 'joined'));
  monitoredResources = computed(() => this._resources().filter(r => r.status === 'monitored'));
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('resources-loaded', (data: Resource[]) => {
      this._resources.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('resource-updated', (data: Resource) => {
      this._resources.update(list => 
        list.map(r => r.id === data.id ? { ...r, ...data } : r)
      );
    });
    
    this.ipc.on('search-results', (data: Resource[]) => {
      this._searchResults.set(data);
      this._isSearching.set(false);
    });
    
    this.ipc.on('search-error', (data: { error: string }) => {
      this._isSearching.set(false);
      this.toast.error(`搜索失敗: ${data.error}`);
    });
  }
  
  // ========== 資源操作 ==========
  
  loadResources(): void {
    this._isLoading.set(true);
    this.ipc.send('get-resources');
  }
  
  refreshResources(): void {
    this.ipc.send('refresh-resources');
    this.toast.info('正在刷新資源...');
  }
  
  getResource(id: number): Resource | undefined {
    return this._resources().find(r => r.id === id);
  }
  
  updateResource(id: number, updates: Partial<Resource>): void {
    this._resources.update(list =>
      list.map(r => r.id === id ? { ...r, ...updates } : r)
    );
    
    this.ipc.send('update-resource', { id, updates });
  }
  
  deleteResource(id: number): void {
    if (!confirm('確定要刪除此資源嗎？')) return;
    
    this._resources.update(list => list.filter(r => r.id !== id));
    this._selectedIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(id);
      return newIds;
    });
    
    this.ipc.send('delete-resource', { id });
    this.toast.success('資源已刪除');
  }
  
  // ========== 選擇操作 ==========
  
  toggleSelection(id: number): void {
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
  
  selectAll(): void {
    const ids = new Set(this.filteredResources().map(r => r.id));
    this._selectedIds.set(ids);
  }
  
  deselectAll(): void {
    this._selectedIds.set(new Set());
  }
  
  isSelected(id: number): boolean {
    return this._selectedIds().has(id);
  }
  
  // ========== 過濾操作 ==========
  
  setFilter(filter: Partial<ResourceFilter>): void {
    this._filter.update(f => ({ ...f, ...filter }));
  }
  
  clearFilter(): void {
    this._filter.set({ type: 'all', status: 'all' });
  }
  
  setSearch(search: string): void {
    this._filter.update(f => ({ ...f, search }));
  }
  
  // ========== 搜索操作 ==========
  
  search(query: SearchQuery): void {
    this._isSearching.set(true);
    this._searchResults.set([]);
    
    this.ipc.send('search-resources', query);
    this.toast.info('正在搜索...');
  }
  
  clearSearchResults(): void {
    this._searchResults.set([]);
  }
  
  addSearchResultToResources(resource: Resource): void {
    this._resources.update(list => {
      if (list.some(r => r.telegram_id === resource.telegram_id)) {
        return list;
      }
      return [...list, resource];
    });
  }
  
  // ========== 批量操作 ==========
  
  batchJoin(phone: string): void {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning('請先選擇資源');
      return;
    }
    
    this.ipc.send('batch-join-resources', {
      resourceIds: selected.map(r => r.id),
      phone
    });
    
    this.toast.info(`正在加入 ${selected.length} 個資源...`);
  }
  
  batchLeave(phone: string): void {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning('請先選擇資源');
      return;
    }
    
    if (!confirm(`確定要離開 ${selected.length} 個資源嗎？`)) return;
    
    this.ipc.send('batch-leave-resources', {
      resourceIds: selected.map(r => r.id),
      phone
    });
    
    this.toast.info(`正在離開 ${selected.length} 個資源...`);
  }
  
  batchDelete(): void {
    const selected = this.selectedResources();
    if (selected.length === 0) {
      this.toast.warning('請先選擇資源');
      return;
    }
    
    if (!confirm(`確定要刪除 ${selected.length} 個資源嗎？`)) return;
    
    const ids = selected.map(r => r.id);
    this._resources.update(list => list.filter(r => !ids.includes(r.id)));
    this._selectedIds.set(new Set());
    
    this.ipc.send('batch-delete-resources', { resourceIds: ids });
    this.toast.success(`已刪除 ${selected.length} 個資源`);
  }
  
  // ========== 標籤操作 ==========
  
  addTag(resourceId: number, tag: string): void {
    this._resources.update(list =>
      list.map(r => {
        if (r.id === resourceId) {
          const tags = r.tags || [];
          if (!tags.includes(tag)) {
            return { ...r, tags: [...tags, tag] };
          }
        }
        return r;
      })
    );
    
    this.ipc.send('add-resource-tag', { resourceId, tag });
  }
  
  removeTag(resourceId: number, tag: string): void {
    this._resources.update(list =>
      list.map(r => {
        if (r.id === resourceId && r.tags) {
          return { ...r, tags: r.tags.filter(t => t !== tag) };
        }
        return r;
      })
    );
    
    this.ipc.send('remove-resource-tag', { resourceId, tag });
  }
}
