/**
 * 资源中心 - 已收藏资源存储服务
 * 用于资源中心页展示「我的收藏」列表，与搜索发现共用收藏状态；
 * 当前阶段使用 localStorage 持久化，后续可切换为后端 API。
 */

import { Injectable, signal, computed } from '@angular/core';

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
  discovery_source?: string;
  discovery_keyword?: string;
  created_at?: string;
  [key: string]: unknown;
}

const STORAGE_KEY = 'tg-resource-center-saved';

@Injectable({ providedIn: 'root' })
export class SavedResourcesService {
  private _list = signal<SavedResourceEntry[]>([]);
  list = this._list.asReadonly();
  count = computed(() => this._list().length);

  constructor() {
    this.loadFromStorage();
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
  }

  remove(telegramId: string): void {
    const tid = (telegramId || '').toString().trim();
    if (!tid) return;
    this._list.update(list => list.filter(r => (r.telegram_id || '').toString().trim() !== tid));
    this.persist();
  }

  has(telegramId: string): boolean {
    const tid = (telegramId || '').toString().trim();
    return this._list().some(r => (r.telegram_id || '').toString().trim() === tid);
  }

  /** 返回与 DiscoveredResource 兼容的列表（含 is_saved: true） */
  asDiscoveredList(): SavedResourceEntry[] {
    return this._list().map(r => ({ ...r, is_saved: true }));
  }
}
