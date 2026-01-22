/**
 * 統一聯繫人服務 - Unified Contacts Service
 * 整合 extracted_members, discovered_resources 數據
 * 
 * 功能：
 * 1. 統一視圖查詢
 * 2. 數據同步
 * 3. 標籤管理
 * 4. 批量操作
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

// 聯繫人類型
export type ContactType = 'user' | 'group' | 'channel';

// 來源類型
export type SourceType = 'member' | 'resource' | 'manual' | 'import';

// 聯繫人狀態
export type ContactStatus = 'new' | 'contacted' | 'interested' | 'negotiating' | 'converted' | 'lost' | 'blocked';

// 統一聯繫人數據
export interface UnifiedContact {
  id: number;
  telegram_id: string;
  username?: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  
  // 類型
  contact_type: ContactType;
  
  // 來源
  source_type: SourceType;
  source_id?: string;
  source_name?: string;
  
  // 狀態和標籤
  status: ContactStatus;
  tags: string[];
  
  // 評分
  ai_score: number;
  activity_score: number;
  value_level: string;
  
  // 在線狀態
  is_online: boolean;
  last_seen?: string;
  
  // 屬性
  is_bot: boolean;
  is_premium: boolean;
  is_verified: boolean;
  member_count?: number;
  
  // 互動統計
  message_count: number;
  last_contact_at?: string;
  last_message_at?: string;
  
  // 元數據
  bio?: string;
  notes?: string;
  metadata?: Record<string, any>;
  
  // 時間戳
  created_at: string;
  updated_at: string;
  synced_at?: string;
}

// 統計數據
export interface UnifiedContactStats {
  total: number;
  users: number;
  groups: number;
  channels: number;
  by_status: Record<string, number>;
  by_source: Record<string, number>;
  recent_added: number;
}

// 篩選條件
export interface ContactFilter {
  contactType?: ContactType;
  sourceType?: SourceType;
  status?: ContactStatus;
  tags?: string[];
  search?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}

// 預設標籤
export const DEFAULT_TAGS = [
  '高意向', '待跟進', '已成交', '流失風險', 'VIP',
  '新發現', '已聯繫', '需要報價', '技術諮詢', '潛在大客戶'
];

// 狀態選項
export const STATUS_OPTIONS: { value: ContactStatus; label: string; color: string }[] = [
  { value: 'new', label: '新發現', color: 'bg-blue-500' },
  { value: 'contacted', label: '已聯繫', color: 'bg-yellow-500' },
  { value: 'interested', label: '有意向', color: 'bg-green-500' },
  { value: 'negotiating', label: '洽談中', color: 'bg-purple-500' },
  { value: 'converted', label: '已成交', color: 'bg-emerald-500' },
  { value: 'lost', label: '已流失', color: 'bg-gray-500' },
  { value: 'blocked', label: '已封鎖', color: 'bg-red-500' }
];

@Injectable({
  providedIn: 'root'
})
export class UnifiedContactsService {
  private ipc = inject(ElectronIpcService);
  
  // 聯繫人列表
  private _contacts = signal<UnifiedContact[]>([]);
  contacts = this._contacts.asReadonly();
  
  // 統計
  private _stats = signal<UnifiedContactStats>({
    total: 0,
    users: 0,
    groups: 0,
    channels: 0,
    by_status: {},
    by_source: {},
    recent_added: 0
  });
  stats = this._stats.asReadonly();
  
  // 總數
  private _total = signal(0);
  total = this._total.asReadonly();
  
  // 載入狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  // 同步狀態
  private _isSyncing = signal(false);
  isSyncing = this._isSyncing.asReadonly();
  
  // 當前篩選
  private _filter = signal<ContactFilter>({});
  filter = this._filter.asReadonly();
  
  // 選中的聯繫人
  private _selectedIds = signal<Set<string>>(new Set());
  selectedIds = this._selectedIds.asReadonly();
  
  // 計算屬性：選中的聯繫人列表
  selectedContacts = computed(() => {
    const ids = this._selectedIds();
    return this._contacts().filter(c => ids.has(c.telegram_id));
  });
  
  constructor() {
    this.setupIpcListeners();
  }
  
  private setupIpcListeners() {
    // 監聽聯繫人列表
    this.ipc.on('unified-contacts:list', (data: any) => {
      console.log('[UnifiedContacts] Received list:', data);
      this._isLoading.set(false);
      
      if (data.success) {
        this._contacts.set(data.contacts || []);
        this._total.set(data.total || 0);
      } else {
        console.error('[UnifiedContacts] List error:', data.error);
        this._contacts.set([]);
        this._total.set(0);
      }
    });
    
    // 監聽統計
    this.ipc.on('unified-contacts:stats', (data: any) => {
      console.log('[UnifiedContacts] Received stats:', data);
      if (data.success) {
        this._stats.set(data.stats);
      }
    });
    
    // 監聽同步結果
    this.ipc.on('unified-contacts:sync-result', (data: any) => {
      console.log('[UnifiedContacts] Sync result:', data);
      this._isSyncing.set(false);
      
      if (data.success) {
        // 同步完成後重新載入
        this.loadContacts();
        this.loadStats();
      }
    });
    
    // 監聽更新結果
    this.ipc.on('unified-contacts:update-result', (data: any) => {
      console.log('[UnifiedContacts] Update result:', data);
      if (data.success) {
        this.loadContacts();
      }
    });
    
    // 監聽標籤添加結果
    this.ipc.on('unified-contacts:add-tags-result', (data: any) => {
      console.log('[UnifiedContacts] Add tags result:', data);
      if (data.success) {
        this.loadContacts();
      }
    });
    
    // 監聽狀態更新結果
    this.ipc.on('unified-contacts:update-status-result', (data: any) => {
      console.log('[UnifiedContacts] Update status result:', data);
      if (data.success) {
        this.loadContacts();
      }
    });
    
    // 監聽刪除結果
    this.ipc.on('unified-contacts:delete-result', (data: any) => {
      console.log('[UnifiedContacts] Delete result:', data);
      if (data.success) {
        this._selectedIds.set(new Set());
        this.loadContacts();
        this.loadStats();
      }
    });
  }
  
  /**
   * 同步所有來源數據
   */
  syncFromSources() {
    console.log('[UnifiedContacts] Starting sync...');
    this._isSyncing.set(true);
    this.ipc.send('unified-contacts:sync', {});
    
    // 添加超時保護：30秒後自動結束同步狀態
    setTimeout(() => {
      if (this._isSyncing()) {
        console.warn('[UnifiedContacts] Sync timeout, resetting state');
        this._isSyncing.set(false);
      }
    }, 30000);
  }
  
  /**
   * 強制結束所有狀態（同步 + 載入）
   */
  forceEndSync() {
    console.log('[UnifiedContacts] Force ending all loading states...');
    this._isSyncing.set(false);
    this._isLoading.set(false);
  }
  
  /**
   * 載入聯繫人列表
   */
  loadContacts(filter?: ContactFilter) {
    const currentFilter = filter || this._filter();
    this._filter.set(currentFilter);
    
    console.log('[UnifiedContacts] Loading contacts with filter:', currentFilter);
    this._isLoading.set(true);
    
    this.ipc.send('unified-contacts:get', {
      contactType: currentFilter.contactType,
      sourceType: currentFilter.sourceType,
      status: currentFilter.status,
      tags: currentFilter.tags,
      search: currentFilter.search,
      orderBy: currentFilter.orderBy || 'created_at DESC',
      limit: currentFilter.limit || 100,
      offset: currentFilter.offset || 0
    });
    
    // 添加超時保護：15秒後自動結束載入狀態
    setTimeout(() => {
      if (this._isLoading()) {
        console.warn('[UnifiedContacts] Load timeout, resetting state');
        this._isLoading.set(false);
      }
    }, 15000);
  }
  
  /**
   * 載入統計數據
   */
  loadStats() {
    console.log('[UnifiedContacts] Loading stats...');
    this.ipc.send('unified-contacts:stats', {});
  }
  
  /**
   * 設置篩選條件
   */
  setFilter(filter: Partial<ContactFilter>) {
    const newFilter = { ...this._filter(), ...filter };
    this.loadContacts(newFilter);
  }
  
  /**
   * 重置篩選
   */
  resetFilter() {
    this.loadContacts({});
  }
  
  /**
   * 搜索
   */
  search(keyword: string) {
    this.setFilter({ search: keyword, offset: 0 });
  }
  
  /**
   * 分頁
   */
  setPage(page: number, pageSize: number = 100) {
    this.setFilter({ offset: (page - 1) * pageSize, limit: pageSize });
  }
  
  /**
   * 選擇/取消選擇聯繫人
   */
  toggleSelect(telegramId: string) {
    const current = new Set(this._selectedIds());
    if (current.has(telegramId)) {
      current.delete(telegramId);
    } else {
      current.add(telegramId);
    }
    this._selectedIds.set(current);
  }
  
  /**
   * 全選/取消全選
   */
  toggleSelectAll() {
    const current = this._selectedIds();
    const allIds = this._contacts().map(c => c.telegram_id);
    
    if (current.size === allIds.length) {
      this._selectedIds.set(new Set());
    } else {
      this._selectedIds.set(new Set(allIds));
    }
  }
  
  /**
   * 清除選擇
   */
  clearSelection() {
    this._selectedIds.set(new Set());
  }
  
  /**
   * 更新單個聯繫人
   */
  updateContact(telegramId: string, updates: Partial<UnifiedContact>) {
    console.log('[UnifiedContacts] Updating contact:', telegramId, updates);
    this.ipc.send('unified-contacts:update', {
      telegramId,
      updates
    });
  }
  
  /**
   * 批量添加標籤
   */
  addTags(telegramIds: string[], tags: string[]) {
    console.log('[UnifiedContacts] Adding tags:', telegramIds, tags);
    this.ipc.send('unified-contacts:add-tags', {
      telegramIds,
      tags
    });
  }
  
  /**
   * 批量更新狀態
   */
  updateStatus(telegramIds: string[], status: ContactStatus) {
    console.log('[UnifiedContacts] Updating status:', telegramIds, status);
    this.ipc.send('unified-contacts:update-status', {
      telegramIds,
      status
    });
  }
  
  /**
   * 批量刪除
   */
  deleteContacts(telegramIds: string[]) {
    console.log('[UnifiedContacts] Deleting contacts:', telegramIds);
    this.ipc.send('unified-contacts:delete', {
      telegramIds
    });
  }
  
  /**
   * 為選中的聯繫人添加標籤
   */
  addTagsToSelected(tags: string[]) {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.addTags(ids, tags);
    }
  }
  
  /**
   * 更新選中聯繫人的狀態
   */
  updateSelectedStatus(status: ContactStatus) {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.updateStatus(ids, status);
    }
  }
  
  /**
   * 刪除選中的聯繫人
   */
  deleteSelected() {
    const ids = Array.from(this._selectedIds());
    if (ids.length > 0) {
      this.deleteContacts(ids);
    }
  }
  
  // ==================== 成員提取同步 ====================
  
  /**
   * 從成員提取結果導入聯繫人
   * 將提取的成員自動同步到統一聯繫人庫
   */
  importFromExtraction(
    members: Array<{
      telegramId: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      displayName: string;
      phone?: string;
      isBot: boolean;
      isPremium: boolean;
      isVerified: boolean;
      onlineStatus: string;
      lastSeen?: string;
      isChinese?: boolean;
      activityScore?: number;
      valueLevel?: string;
    }>,
    source: {
      sourceType: SourceType;
      sourceName: string;
      sourceId?: string;
    }
  ): void {
    if (!members.length) return;
    
    console.log('[UnifiedContacts] Importing from extraction:', members.length, 'members from', source.sourceName);
    
    // 發送到後端處理
    this.ipc.send('unified-contacts:import-members', {
      members: members.map(m => ({
        telegram_id: m.telegramId,
        username: m.username,
        first_name: m.firstName,
        last_name: m.lastName,
        display_name: m.displayName,
        phone: m.phone,
        is_bot: m.isBot,
        is_premium: m.isPremium,
        is_verified: m.isVerified,
        online_status: m.onlineStatus,
        last_seen: m.lastSeen,
        is_chinese: m.isChinese,
        activity_score: m.activityScore,
        value_level: m.valueLevel
      })),
      sourceType: source.sourceType,
      sourceName: source.sourceName,
      sourceId: source.sourceId
    });
  }
  
  /**
   * 更新聯繫人狀態（從發送控制台接收）
   * 當用戶從發送控制台發送消息後，更新聯繫人狀態
   */
  updateContactStatus(telegramId: string, status: ContactStatus): void {
    console.log('[UnifiedContacts] Updating single contact status:', telegramId, status);
    this.updateContact(telegramId, { status });
  }
  
  /**
   * 同步發送控制台的目標列表
   * 返回所有可發送的用戶聯繫人
   */
  getSendTargets(): UnifiedContact[] {
    return this._contacts().filter(c => c.contact_type === 'user' && !c.is_bot);
  }
  
  /**
   * 標記聯繫人為已聯繫
   */
  markAsContacted(telegramIds: string[]): void {
    this.updateStatus(telegramIds, 'contacted');
  }
  
  /**
   * 獲取指定來源的聯繫人數量
   */
  getCountBySource(sourceType: SourceType): number {
    return this._contacts().filter(c => c.source_type === sourceType).length;
  }
  
  /**
   * 獲取狀態標籤顏色
   */
  getStatusColor(status: ContactStatus): string {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.color || 'bg-gray-500';
  }
  
  /**
   * 獲取狀態標籤
   */
  getStatusLabel(status: ContactStatus): string {
    const option = STATUS_OPTIONS.find(o => o.value === status);
    return option?.label || status;
  }
  
  /**
   * 清理
   */
  ngOnDestroy() {
    // IPC 監聽器隨服務生命週期自動清理
  }
}
