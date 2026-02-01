/**
 * 統一資源提取服務 - Unified Extraction Service
 * 
 * 功能：
 * 1. 執行成員提取並自動同步到資源中心
 * 2. 管理提取配額
 * 3. 發射事件通知其他組件
 * 4. 提取歷史記錄
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { UnifiedContactsService, SourceType } from './unified-contacts.service';
import { MemberExtractionConfig, ExtractionGroupInfo } from '../dialogs/member-extraction-dialog.component';

// 提取結果
export interface ExtractionResult {
  success: boolean;
  groupId: string;
  groupName: string;
  count: number;
  stats: {
    total: number;
    online: number;
    recently: number;
    premium: number;
    hasUsername: number;
    chinese: number;
    bots: number;
  };
  members: ExtractedMember[];
  duration: number;
  timestamp: Date;
}

// 提取的成員
export interface ExtractedMember {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  phone?: string;
  isBot: boolean;
  isPremium: boolean;
  isVerified: boolean;
  onlineStatus: 'online' | 'recently' | 'offline' | 'unknown';
  lastSeen?: string;
  isChinese?: boolean;
  activityScore?: number;
  valueLevel?: string;
}

// 提取進度
export interface ExtractionProgress {
  groupId: string;
  current: number;
  total: number;
  status: string;
  percent: number;
}

// 配額信息
export interface ExtractionQuota {
  daily: number;
  used: number;
  remaining: number;
  resetAt: string;
}

// 提取歷史
export interface ExtractionHistory {
  id: string;
  groupId: string;
  groupName: string;
  groupUrl?: string;
  count: number;
  config: MemberExtractionConfig;
  timestamp: Date;
  syncedToResources: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnifiedExtractionService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private contactsService = inject(UnifiedContactsService);
  
  // ==================== 狀態 ====================
  
  // 提取中狀態
  private _isExtracting = signal(false);
  isExtracting = this._isExtracting.asReadonly();
  
  // 當前提取進度
  private _progress = signal<ExtractionProgress | null>(null);
  progress = this._progress.asReadonly();
  
  // 配額信息
  private _quota = signal<ExtractionQuota>({
    daily: 1000,
    used: 0,
    remaining: 1000,
    resetAt: ''
  });
  quota = this._quota.asReadonly();
  
  // 提取歷史
  private _history = signal<ExtractionHistory[]>([]);
  history = this._history.asReadonly();
  
  // 最近提取結果
  private _lastResult = signal<ExtractionResult | null>(null);
  lastResult = this._lastResult.asReadonly();
  
  // ==================== 事件 ====================
  
  // 資源更新事件
  resourcesUpdated$ = new Subject<{ action: string; count: number; groupName: string }>();
  
  // 提取完成事件
  extractionCompleted$ = new Subject<ExtractionResult>();
  
  // 提取進度事件
  extractionProgress$ = new Subject<ExtractionProgress>();
  
  // ==================== 計算屬性 ====================
  
  remainingQuota = computed(() => this._quota().remaining);
  
  canExtract = computed(() => {
    return !this._isExtracting() && this._quota().remaining > 0;
  });
  
  // ==================== 初始化 ====================
  
  constructor() {
    this.setupListeners();
    this.loadQuota();
    this.loadHistory();
  }
  
  private setupListeners() {
    // 監聽提取進度
    this.ipc.on('members-extraction-progress', (data: any) => {
      if (data) {
        // 🆕 P0 修復：處理重試狀態
        let statusText = data.status || '提取中...';
        if (data.status === 'retrying') {
          statusText = data.message || '正在同步群組狀態...';
        } else if (data.status === 'starting') {
          statusText = '正在連接群組...';
        } else if (data.status === 'completed') {
          statusText = '提取完成';
        }
        
        const progress: ExtractionProgress = {
          groupId: String(data.resourceId || data.groupId),
          current: data.extracted || 0,
          total: data.total || 0,
          status: statusText,
          percent: data.total > 0 ? Math.round((data.extracted / data.total) * 100) : 0
        };
        this._progress.set(progress);
        this.extractionProgress$.next(progress);
      }
    });
    
    // 監聽提取完成
    this.ipc.on('members-extracted', (data: any) => {
      this._isExtracting.set(false);
      this._progress.set(null);
      
      if (data.success && data.members) {
        const result = this.processExtractionResult(data);
        this._lastResult.set(result);
        this.extractionCompleted$.next(result);
        
        // 更新配額
        this._quota.update(q => ({
          ...q,
          used: q.used + result.count,
          remaining: Math.max(0, q.remaining - result.count)
        }));
      } else if (data.error) {
        this.toast.error(`提取失敗：${data.error}`);
      }
    });
    
    // 監聯配額更新
    this.ipc.on('extraction-quota', (data: any) => {
      if (data) {
        this._quota.set({
          daily: data.daily || 1000,
          used: data.used || 0,
          remaining: data.remaining || 1000,
          resetAt: data.resetAt || ''
        });
      }
    });
  }
  
  // ==================== 核心方法 ====================
  
  /**
   * 執行成員提取並同步到資源中心
   */
  async extractAndSync(
    group: ExtractionGroupInfo,
    config: MemberExtractionConfig
  ): Promise<ExtractionResult | null> {
    if (this._isExtracting()) {
      this.toast.warning('已有提取任務進行中');
      return null;
    }
    
    if (this._quota().remaining <= 0) {
      this.toast.error('今日配額已用完');
      return null;
    }
    
    this._isExtracting.set(true);
    this._progress.set({
      groupId: group.id,
      current: 0,
      total: config.limit === -1 ? group.memberCount : config.limit,
      status: '正在連接...',
      percent: 0
    });
    
    // 從 URL 中提取 chat_id
    let chatId = '';
    if (group.url) {
      const match = group.url.match(/t\.me\/([+\w]+)/);
      if (match) {
        chatId = match[1];
      }
    }
    
    // 發送提取命令
    this.ipc.send('extract-members', {
      chatId: chatId || group.url,
      username: chatId,
      resourceId: group.id,
      groupName: group.name,
      limit: config.limit === -1 ? undefined : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
        offline: config.filters.onlineStatus === 'offline',
        online: config.filters.onlineStatus === 'online',
        chinese: config.filters.hasChinese,
        hasUsername: config.filters.hasUsername,
        isPremium: config.filters.isPremium,
        excludeAdmins: config.filters.excludeAdmins
      },
      autoSave: config.advanced.autoSaveToResources,
      skipDuplicates: config.advanced.skipDuplicates
    });
    
    this.toast.info(`🔄 正在提取 ${group.name} 的成員...`);
    
    // 添加到歷史
    this.addToHistory({
      id: `${Date.now()}`,
      groupId: group.id,
      groupName: group.name,
      groupUrl: group.url,
      count: 0,
      config,
      timestamp: new Date(),
      syncedToResources: config.advanced.autoSaveToResources
    });
    
    return null; // 結果會通過事件返回
  }
  
  /**
   * 處理提取結果
   */
  private processExtractionResult(data: any): ExtractionResult {
    const members = data.members || [];
    
    // 計算統計
    let online = 0, recently = 0, premium = 0, hasUsername = 0, chinese = 0, bots = 0;
    
    for (const m of members) {
      if (m.online_status === 'online' || m.onlineStatus === 'online') online++;
      else if (m.online_status === 'recently' || m.onlineStatus === 'recently') recently++;
      if (m.is_premium || m.isPremium) premium++;
      if (m.username) hasUsername++;
      if (m.is_chinese || m.isChinese) chinese++;
      if (m.is_bot || m.isBot) bots++;
    }
    
    const result: ExtractionResult = {
      success: true,
      groupId: String(data.resourceId || data.groupId),
      groupName: data.groupName || '',
      count: members.length,
      stats: {
        total: members.length,
        online,
        recently,
        premium,
        hasUsername,
        chinese,
        bots
      },
      members: members.map((m: any) => ({
        telegramId: String(m.telegram_id || m.id),
        username: m.username,
        firstName: m.first_name || m.firstName,
        lastName: m.last_name || m.lastName,
        displayName: m.display_name || m.displayName || m.first_name || m.username || 'Unknown',
        phone: m.phone,
        isBot: m.is_bot || m.isBot || false,
        isPremium: m.is_premium || m.isPremium || false,
        isVerified: m.is_verified || m.isVerified || false,
        onlineStatus: m.online_status || m.onlineStatus || 'unknown',
        lastSeen: m.last_seen || m.lastSeen,
        isChinese: m.is_chinese || m.isChinese,
        activityScore: m.activity_score || m.activityScore,
        valueLevel: m.value_level || m.valueLevel
      })),
      duration: data.duration || 0,
      timestamp: new Date()
    };
    
    // 更新歷史記錄中的數量
    this._history.update(h => {
      const latest = h[0];
      if (latest && latest.groupId === result.groupId) {
        return [{ ...latest, count: result.count }, ...h.slice(1)];
      }
      return h;
    });
    
    // 通知資源更新
    this.resourcesUpdated$.next({
      action: 'members-extracted',
      count: result.count,
      groupName: result.groupName
    });
    
    this.toast.success(`✅ 成功提取 ${result.count} 個成員`);
    
    return result;
  }
  
  /**
   * 將提取結果同步到資源中心
   */
  async syncToResourceCenter(result: ExtractionResult): Promise<void> {
    if (!result.members.length) return;
    
    // 通過 IPC 發送同步請求
    this.ipc.send('sync-members-to-resources', {
      members: result.members,
      sourceType: 'member' as SourceType,
      sourceName: result.groupName,
      sourceId: result.groupId
    });
    
    // 刷新資源中心數據
    setTimeout(() => {
      this.contactsService.loadContacts();
      this.contactsService.loadStats();
    }, 500);
    
    this.toast.success(`📦 已將 ${result.count} 個成員同步到資源中心`);
  }
  
  /**
   * 停止提取
   */
  stopExtraction(): void {
    this.ipc.send('stop-extraction', {});
    this._isExtracting.set(false);
    this._progress.set(null);
    this.toast.info('已停止提取');
  }
  
  // ==================== 配額管理 ====================
  
  /**
   * 載入配額
   */
  loadQuota(): void {
    this.ipc.send('get-extraction-quota', {});
  }
  
  /**
   * 重置配額（僅管理員）
   */
  resetQuota(): void {
    this.ipc.send('reset-extraction-quota', {});
    this.loadQuota();
  }
  
  // ==================== 歷史記錄 ====================
  
  /**
   * 載入歷史
   */
  private loadHistory(): void {
    // 從本地存儲載入
    try {
      const saved = localStorage.getItem('extraction_history');
      if (saved) {
        const data = JSON.parse(saved);
        this._history.set(data.slice(0, 50)); // 只保留最近50條
      }
    } catch (e) {
      console.error('Failed to load extraction history:', e);
    }
  }
  
  /**
   * 添加到歷史
   */
  private addToHistory(record: ExtractionHistory): void {
    this._history.update(h => {
      const updated = [record, ...h.slice(0, 49)];
      // 保存到本地存儲
      try {
        localStorage.setItem('extraction_history', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save extraction history:', e);
      }
      return updated;
    });
  }
  
  /**
   * 清除歷史
   */
  clearHistory(): void {
    this._history.set([]);
    localStorage.removeItem('extraction_history');
  }
  
  // ==================== 輔助方法 ====================
  
  /**
   * 獲取預估提取數量
   */
  estimateCount(group: ExtractionGroupInfo, config: MemberExtractionConfig): number {
    const limit = config.limit === -1 ? group.memberCount : config.limit;
    return Math.min(limit, group.memberCount, this._quota().remaining);
  }
}
