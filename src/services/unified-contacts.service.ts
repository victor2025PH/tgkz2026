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
import { ApiService } from '../core/api.service';
import { environment } from '../environments/environment';

// 聯繫人類型
export type ContactType = 'user' | 'group' | 'channel';

// 來源類型
export type SourceType = 'member' | 'resource' | 'lead' | 'manual' | 'import';

// 聯繫人狀態
// 🔧 P1: 擴展狀態類型支持發送控制台
export type ContactStatus = 'new' | 'contacted' | 'interested' | 'negotiating' | 'converted' | 'lost' | 'blocked' | 'replied' | 'failed';

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
  { value: 'blocked', label: '已封鎖', color: 'bg-red-500' },
  // 🔧 P1: 發送控制台專用狀態
  { value: 'replied', label: '已回覆', color: 'bg-teal-500' },
  { value: 'failed', label: '發送失敗', color: 'bg-rose-500' }
];

@Injectable({
  providedIn: 'root'
})
export class UnifiedContactsService {
  private ipc = inject(ElectronIpcService);
  private api = inject(ApiService);
  
  /** P15-1: 是否使用 HTTP API（非 Electron 環境） */
  private get useHttpApi(): boolean {
    const mode = environment.apiMode;
    if (mode === 'http') return true;
    if (mode === 'ipc') return false;
    // auto: 檢測 Electron
    return typeof (window as any)?.electron === 'undefined';
  }
  
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
  
  // 🆕 標記：數據是否已從 leads 導入（避免重複請求）
  private _hasImportedFromLeads = signal(false);
  hasData = computed(() => this._contacts().length > 0 || this._hasImportedFromLeads());
  
  // 🆕 待刪除的 IDs（用於刪除完成後更新本地狀態）
  private _pendingDeleteIds: Set<string> | undefined;
  
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
    
    // 監聯同步結果
    this.ipc.on('unified-contacts:sync-result', (data: any) => {
      console.log('[UnifiedContacts] ========== SYNC RESULT ==========');
      console.log('[UnifiedContacts] Sync result:', data);
      this._isSyncing.set(false);
      
      if (data.success) {
        console.log('[UnifiedContacts] Sync successful, stats:', data.stats);
        // 同步完成後重新載入
        this.loadContacts();
        this.loadStats();
      } else {
        console.error('[UnifiedContacts] Sync failed:', data.error);
      }
    });
    
    // 🆕 Phase2: 監聽自動同步事件（後端加入/監控/提取後自動觸發）
    this.ipc.on('unified-contacts:updated', (data: any) => {
      console.log('[UnifiedContacts] Auto-sync triggered by:', data?.reason);
      // 自動刷新聯繫人列表和統計
      this.loadContacts();
      this.loadStats();
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
        // 從本地狀態中移除已刪除的項目
        const deletedIds = this._pendingDeleteIds || new Set<string>();
        const currentContacts = this._contacts();
        const remainingContacts = currentContacts.filter(c => !deletedIds.has(c.telegram_id));
        
        this._contacts.set(remainingContacts);
        this._total.set(remainingContacts.length);
        this._selectedIds.set(new Set());
        this._pendingDeleteIds = undefined;
        
        // 更新統計
        this.updateLocalStats(remainingContacts);
        
        console.log('[UnifiedContacts] Deleted successfully, remaining:', remainingContacts.length);
      }
    });
  }
  
  /**
   * 同步所有來源數據
   */
  syncFromSources() {
    console.log('[UnifiedContacts] ========== SYNC START ==========');
    console.log('[UnifiedContacts] Sending unified-contacts:sync to backend...');
    this._isSyncing.set(true);
    
    // 🔧 FIX: 確保發送命令
    try {
      this.ipc.send('unified-contacts:sync', {});
      console.log('[UnifiedContacts] IPC command sent successfully');
    } catch (e) {
      console.error('[UnifiedContacts] Failed to send IPC command:', e);
      this._isSyncing.set(false);
      return;
    }
    
    // 添加超時保護：60秒後自動結束同步狀態（增加時間）
    setTimeout(() => {
      if (this._isSyncing()) {
        console.warn('[UnifiedContacts] Sync timeout after 60s, resetting state');
        this._isSyncing.set(false);
      }
    }, 60000);
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
   * 🆕 強制重新載入聯繫人（忽略緩存，確保數據最新）
   */
  forceReloadContacts(filter?: ContactFilter) {
    console.log('[UnifiedContacts] Force reload contacts');
    // 重置導入標記，強制從後端獲取
    this._hasImportedFromLeads.set(false);
    
    const currentFilter = filter || this._filter();
    this._filter.set(currentFilter);
    this._isLoading.set(true);
    
    // 獲取更多數據（提高限制）
    this.ipc.send('unified-contacts:get', {
      contactType: currentFilter.contactType,
      sourceType: currentFilter.sourceType,
      status: currentFilter.status,
      tags: currentFilter.tags,
      search: currentFilter.search,
      orderBy: currentFilter.orderBy || 'created_at DESC',
      limit: 500,  // 獲取更多數據
      offset: 0
    });
  }
  
  /**
   * 載入聯繫人列表
   * 🆕 優化：如果已從 leads 導入數據，則只在前端過濾，不發送後端請求
   */
  loadContacts(filter?: ContactFilter) {
    const currentFilter = filter || this._filter();
    this._filter.set(currentFilter);
    
    // 🆕 如果數據已從 leads 導入，直接在前端應用過濾，不請求後端
    if (this._hasImportedFromLeads() && this._contacts().length > 0) {
      console.log('[UnifiedContacts] Data already imported from leads, skipping backend request');
      this._isLoading.set(false);
      return;
    }
    
    console.log('[UnifiedContacts] Loading contacts with filter:', currentFilter);
    this._isLoading.set(true);
    
    // P15-1: HTTP 模式使用 REST API
    if (this.useHttpApi) {
      this._loadContactsViaHttp(currentFilter);
      return;
    }
    
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
   * 🆕 優化：如果已從 leads 導入數據，跳過後端請求
   */
  loadStats() {
    // 🆕 如果數據已從 leads 導入，統計已在 importLeadsDirectly 中計算
    if (this._hasImportedFromLeads()) {
      console.log('[UnifiedContacts] Stats already computed from leads, skipping backend request');
      return;
    }
    
    // P15-1: HTTP 模式
    if (this.useHttpApi) {
      this._loadStatsViaHttp();
      return;
    }
    
    console.log('[UnifiedContacts] Loading stats...');
    this.ipc.send('unified-contacts:stats', {});
  }
  
  /**
   * P15-1: 通過 HTTP REST API 加載聯繫人（非 Electron 環境）
   */
  private async _loadContactsViaHttp(filter: ContactFilter) {
    try {
      const params = new URLSearchParams();
      if (filter.search) params.set('search', filter.search);
      if (filter.status) params.set('status', filter.status);
      if (filter.sourceType) params.set('source_type', filter.sourceType);
      if (filter.orderBy) params.set('order_by', filter.orderBy);
      params.set('limit', String(filter.limit || 100));
      params.set('offset', String(filter.offset || 0));
      
      const result = await this.api.get<any>(`/api/v1/contacts?${params.toString()}`);
      if (result.success && result.data) {
        const respData = result.data.data || result.data;
        const contacts: UnifiedContact[] = (respData.contacts || []).map((c: any) => ({
          ...c,
          tags: Array.isArray(c.tags) ? c.tags : [],
          ai_score: c.ai_score || 0,
          activity_score: c.activity_score || 0,
          value_level: c.value_level || '',
          is_online: false,
          is_bot: false,
          is_premium: false,
          is_verified: false,
        }));
        
        this._contacts.set(contacts);
        this._total.set(respData.total ?? contacts.length);
      }
    } catch (e) {
      console.error('[UnifiedContacts] HTTP load failed:', e);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * P15-1: 通過 HTTP REST API 加載統計（非 Electron 環境）
   */
  private async _loadStatsViaHttp() {
    try {
      const result = await this.api.get<any>('/api/v1/contacts/stats');
      if (result.success && result.data) {
        const stats = result.data.data || result.data;
        this._stats.set({
          total: stats.total || 0,
          users: 0,
          groups: 0,
          channels: 0,
          by_status: stats.by_status || {},
          by_source: stats.by_source || {},
          recent_added: stats.recent_7d || 0,
        });
      }
    } catch (e) {
      console.error('[UnifiedContacts] HTTP stats load failed:', e);
    }
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
    console.log('[UnifiedContacts] Deleting contacts:', telegramIds.length);
    // 保存待刪除的 IDs，用於刪除完成後更新本地狀態
    this._pendingDeleteIds = new Set(telegramIds);
    this.ipc.send('unified-contacts:delete', {
      telegramIds
    });
  }
  
  /**
   * 🆕 更新本地統計（刪除後使用）
   */
  private updateLocalStats(contacts: UnifiedContact[]) {
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    
    contacts.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      bySource[c.source_type] = (bySource[c.source_type] || 0) + 1;
    });
    
    this._stats.set({
      total: contacts.length,
      users: contacts.filter(c => c.contact_type === 'user').length,
      groups: contacts.filter(c => c.contact_type === 'group').length,
      channels: contacts.filter(c => c.contact_type === 'channel').length,
      by_status: byStatus,
      by_source: bySource,
      recent_added: contacts.filter(c => {
        const created = new Date(c.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created > weekAgo;
      }).length
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
  
  // ==================== 🆕 直接從 Leads 導入（前端同步） ====================
  
  /**
   * Lead 狀態映射到 Contact 狀態
   */
  private mapLeadStatus(leadStatus: string): ContactStatus {
    const mapping: Record<string, ContactStatus> = {
      'New': 'new',
      'Contacted': 'contacted',
      'Replied': 'interested',
      'Interested': 'interested',
      'Follow-up': 'negotiating',
      'Negotiating': 'negotiating',
      'Closed-Won': 'converted',
      'Closed-Lost': 'lost',
      'Unsubscribed': 'blocked'
    };
    return mapping[leadStatus] || 'new';
  }
  
  /**
   * 直接從前端 leads 數據導入到資源中心
   * 這樣就不需要後端同步，數據保持一致
   */
  importLeadsDirectly(leads: any[]): void {
    console.log('[UnifiedContacts] Importing leads directly:', leads.length);
    
    if (!leads || leads.length === 0) {
      return;
    }
    
    // 將 leads 轉換為 UnifiedContact 格式
    const contacts: UnifiedContact[] = leads.map((lead, index) => ({
      id: lead.id || index,
      telegram_id: String(lead.userId || lead.user_id || ''),
      username: lead.username || '',
      display_name: lead.firstName || lead.username || String(lead.userId || ''),
      first_name: lead.firstName || '',
      last_name: lead.lastName || '',
      phone: lead.phone || '',
      
      contact_type: 'user' as ContactType,
      source_type: (lead.sourceType === 'group_extract' ? 'member' : 'lead') as SourceType,
      source_id: lead.sourceChatId || lead.campaignId?.toString() || '',
      source_name: lead.sourceGroup || lead.sourceChatTitle || '發送控制台',
      
      status: this.mapLeadStatus(lead.status || 'New'),
      tags: lead.tags || [],
      
      ai_score: lead.aiScore || 0.5,
      activity_score: lead.activityScore || 0.5,
      value_level: lead.valueLevel || 'C',
      
      is_online: lead.onlineStatus === 'Online',
      last_seen: lead.lastSeen,
      
      is_bot: false,
      is_premium: lead.isPremium || false,
      is_verified: lead.isVerified || false,
      member_count: 0,
      
      message_count: (lead.interactionHistory || []).length,
      last_contact_at: lead.lastContactAt,
      last_message_at: lead.lastMessageAt,
      
      bio: lead.bio || '',
      notes: lead.notes || '',
      metadata: {},
      
      created_at: lead.timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced_at: new Date().toISOString()
    }));
    
    // 更新聯繫人列表
    this._contacts.set(contacts);
    this._total.set(contacts.length);
    
    // 更新統計
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    
    contacts.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
      bySource[c.source_type] = (bySource[c.source_type] || 0) + 1;
    });
    
    this._stats.set({
      total: contacts.length,
      users: contacts.length,
      groups: 0,
      channels: 0,
      by_status: byStatus,
      by_source: bySource,
      recent_added: contacts.filter(c => {
        const created = new Date(c.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return created >= weekAgo;
      }).length
    });
    
    this._isLoading.set(false);
    this._isSyncing.set(false);
    
    // 🆕 標記數據已導入
    this._hasImportedFromLeads.set(true);
    
    console.log('[UnifiedContacts] Imported', contacts.length, 'contacts from leads');
  }
  
  /**
   * 🆕 重置導入狀態（用於強制刷新）
   */
  resetImportState() {
    this._hasImportedFromLeads.set(false);
  }
  
  /**
   * 清理
   */
  ngOnDestroy() {
    // IPC 監聽器隨服務生命週期自動清理
  }
}
