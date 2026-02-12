/**
 * 资源中心 - 已收藏资源存储服务
 * 🔧 Phase2: 双层持久化 — IPC 后端 API + localStorage 备份
 * 
 * 优先通过 IPC 与后端交互（discovered_resources 表），
 * localStorage 仅作为离线备份和快速首屏渲染。
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

/** 可持久化的最小资源字段（与 DiscoveredResource 兼容） */
export interface SavedResourceEntry {
  id?: number;
  telegram_id: string;
  title: string;
  username?: string;
  description?: string;
  member_count?: number;
  resource_type?: string;
  status?: string;
  is_saved?: boolean;
  invite_link?: string;
  link?: string;
  accessibility?: string;
  discovery_source?: string;
  discovery_keyword?: string;
  created_at?: string;
  // 🔧 Phase3: 标签系统
  tags?: string[];
  sources?: string[];
  [key: string]: unknown;
}

const STORAGE_KEY = 'tg-resource-center-saved';

@Injectable({ providedIn: 'root' })
export class SavedResourcesService {
  private ipc = inject(ElectronIpcService);
  
  private _list = signal<SavedResourceEntry[]>([]);
  list = this._list.asReadonly();
  count = computed(() => this._list().length);
  
  // 🔧 Phase2: 后端同步状态
  private _backendSynced = signal(false);
  backendSynced = this._backendSynced.asReadonly();
  private _syncing = signal(false);
  syncing = this._syncing.asReadonly();

  constructor() {
    // 先从 localStorage 快速加载（首屏渲染）
    this.loadFromStorage();
    this.loadTags();
    // 然后异步从后端加载最新数据
    this.loadFromBackend();
    // 监听后端事件
    this.setupListeners();
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedResourceEntry[];
      if (Array.isArray(parsed)) {
        this._list.set(parsed.map(r => ({ ...r, is_saved: true })));
      }
    } catch {
      this._list.set([]);
    }
  }

  private persist(): void {
    try {
      const list = this._list();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[SavedResourcesService] persist failed', e);
    }
  }
  
  // 🔧 Phase2: 从后端加载已收藏资源
  private loadFromBackend(): void {
    this._syncing.set(true);
    this.ipc.send('get-resources', { 
      status: 'discovered',
      limit: 500,
      offset: 0
    });
  }
  
  // 🔧 Phase2: 设置后端事件监听
  private setupListeners(): void {
    // 监听后端资源列表返回
    this.ipc.on('resources-list', (data: any) => {
      this._syncing.set(false);
      if (data.success && Array.isArray(data.resources)) {
        const backendList: SavedResourceEntry[] = data.resources.map((r: any) => ({
          id: r.id,
          telegram_id: r.telegram_id || '',
          title: r.title || '',
          username: r.username,
          description: r.description,
          member_count: r.member_count ?? 0,
          resource_type: r.resource_type || 'group',
          status: r.status || 'discovered',
          is_saved: true,
          invite_link: r.invite_link,
          discovery_source: r.discovery_source,
          discovery_keyword: r.discovery_keyword,
          created_at: r.created_at
        }));
        
        // 合并：后端为主，localStorage 补充
        const merged = this.mergeWithLocal(backendList);
        this._list.set(merged);
        this._backendSynced.set(true);
        this.persist(); // 更新 localStorage 备份
      }
    });
    
    // 监听收藏成功事件
    this.ipc.on('resource-saved', (data: any) => {
      if (data.success) {
        console.log(`[SavedResources] Backend saved: ${data.telegram_id}`);
      }
    });
    
    // 监听取消收藏事件
    this.ipc.on('resource-unsaved', (data: any) => {
      if (data.success) {
        console.log(`[SavedResources] Backend unsaved: ${data.telegram_id}`);
      }
    });
  }
  
  // 🔧 Phase2: 合并后端和本地数据
  private mergeWithLocal(backendList: SavedResourceEntry[]): SavedResourceEntry[] {
    const backendIds = new Set(backendList.map(r => (r.telegram_id || '').toString().trim()));
    const localList = this._list();
    
    // 本地有但后端没有的，尝试同步到后端
    const localOnly = localList.filter(r => {
      const tid = (r.telegram_id || '').toString().trim();
      return tid && !backendIds.has(tid);
    });
    
    if (localOnly.length > 0) {
      console.log(`[SavedResources] Syncing ${localOnly.length} local-only items to backend`);
      localOnly.forEach(r => this.syncToBackend(r));
    }
    
    // 合并结果：后端 + 本地独有
    return [...backendList, ...localOnly.map(r => ({ ...r, is_saved: true }))];
  }
  
  // 🔧 Phase2: 同步单个资源到后端
  private syncToBackend(resource: SavedResourceEntry): void {
    this.ipc.send('save-resource', {
      telegram_id: resource.telegram_id,
      title: resource.title,
      username: resource.username,
      description: resource.description,
      member_count: resource.member_count,
      resource_type: resource.resource_type || 'group',
      discovery_keyword: resource.discovery_keyword,
      overall_score: (resource as any).overall_score || 0.5,
      invite_link: resource.invite_link
    });
  }

  add(resource: SavedResourceEntry): void {
    const tid = (resource.telegram_id || '').toString().trim();
    if (!tid) return;
    const current = this._list();
    if (current.some(r => (r.telegram_id || '').toString().trim() === tid)) return;
    const entry: SavedResourceEntry = {
      ...resource,
      telegram_id: tid,
      is_saved: true,
      created_at: resource.created_at || new Date().toISOString()
    };
    this._list.set([...current, entry]);
    this.persist();
    
    // 🔧 Phase2: 同步到后端
    this.syncToBackend(entry);
  }

  remove(telegramId: string): void {
    const tid = (telegramId || '').toString().trim();
    if (!tid) return;
    this._list.update(list => list.filter(r => (r.telegram_id || '').toString().trim() !== tid));
    this.persist();
    
    // 🔧 Phase2: 通知后端取消收藏
    this.ipc.send('unsave-resource', { telegram_id: tid });
  }

  has(telegramId: string): boolean {
    const tid = (telegramId || '').toString().trim();
    return this._list().some(r => (r.telegram_id || '').toString().trim() === tid);
  }

  /** 返回与 DiscoveredResource 兼容的列表（含 is_saved: true） */
  asDiscoveredList(): SavedResourceEntry[] {
    return this._list().map(r => ({ ...r, is_saved: true }));
  }
  
  // 🔧 Phase2: 清空全部收藏
  removeAll(): void {
    const list = this._list();
    list.forEach(r => {
      const tid = (r.telegram_id || '').toString().trim();
      if (tid) {
        this.ipc.send('unsave-resource', { telegram_id: tid });
      }
    });
    this._list.set([]);
    this.persist();
  }
  
  // 🔧 Phase2: 手动刷新（强制从后端重新加载）
  refresh(): void {
    this._backendSynced.set(false);
    this.loadFromBackend();
  }
  
  // ============ Phase3: 标签系统 ============
  
  private _tags = signal<string[]>([]);
  /** 所有已使用的标签（去重） */
  allTags = this._tags.asReadonly();
  
  private loadTags(): void {
    try {
      const raw = localStorage.getItem('tg-resource-tags');
      if (raw) {
        this._tags.set(JSON.parse(raw));
      }
    } catch { /* ignore */ }
  }
  
  private persistTags(): void {
    // 从所有资源中提取标签集合
    const tagSet = new Set<string>();
    this._list().forEach(r => {
      (r.tags || []).forEach(t => tagSet.add(t));
    });
    const tags = Array.from(tagSet).sort();
    this._tags.set(tags);
    try {
      localStorage.setItem('tg-resource-tags', JSON.stringify(tags));
    } catch { /* ignore */ }
  }
  
  /** 给资源添加标签 */
  addTag(telegramId: string, tag: string): void {
    const tid = (telegramId || '').toString().trim();
    const normalizedTag = tag.trim();
    if (!tid || !normalizedTag) return;
    
    this._list.update(list =>
      list.map(r => {
        if ((r.telegram_id || '').toString().trim() === tid) {
          const current = r.tags || [];
          if (!current.includes(normalizedTag)) {
            return { ...r, tags: [...current, normalizedTag] };
          }
        }
        return r;
      })
    );
    this.persist();
    this.persistTags();
  }
  
  /** 移除资源的标签 */
  removeTag(telegramId: string, tag: string): void {
    const tid = (telegramId || '').toString().trim();
    if (!tid) return;
    
    this._list.update(list =>
      list.map(r => {
        if ((r.telegram_id || '').toString().trim() === tid) {
          return { ...r, tags: (r.tags || []).filter(t => t !== tag) };
        }
        return r;
      })
    );
    this.persist();
    this.persistTags();
  }
  
  /** 获取资源的标签 */
  getTags(telegramId: string): string[] {
    const tid = (telegramId || '').toString().trim();
    const entry = this._list().find(r => (r.telegram_id || '').toString().trim() === tid);
    return entry?.tags || [];
  }
  
  /** 按标签筛选资源 */
  getByTag(tag: string): SavedResourceEntry[] {
    return this._list().filter(r => (r.tags || []).includes(tag));
  }
}
