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
  // 🆕 P3 優化：預估時間
  estimatedSeconds?: number;
  elapsedSeconds?: number;
  speed?: number;  // 每秒提取數
  fromCache?: boolean;
}

// 🆕 P3 優化：智能建議
export interface ExtractionSuggestion {
  type: 'info' | 'warning' | 'action';
  message: string;
  action?: string;
  actionLabel?: string;
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
  
  // 🆕 P3 優化：提取開始時間（用於計算速度）
  private _extractionStartTime: number = 0;
  private _lastProgressUpdate: { time: number; count: number } = { time: 0, count: 0 };
  
  private setupListeners() {
    // 監聽提取進度
    this.ipc.on('members-extraction-progress', (data: any) => {
      if (data) {
        // 🆕 P1 修復：處理多種狀態
        let statusText = data.status || '提取中...';
        if (data.status === 'retrying') {
          statusText = data.message || '正在同步群組狀態...';
        } else if (data.status === 'starting') {
          statusText = '正在連接群組...';
          this._extractionStartTime = Date.now();
          this._lastProgressUpdate = { time: Date.now(), count: 0 };
        } else if (data.status === 'waiting') {
          statusText = data.message || '等待群組同步...';
        } else if (data.status === 'completed') {
          statusText = '提取完成';
        } else if (data.status === 'extracting') {
          statusText = `正在提取 (${data.extracted || 0}/${data.total || '?'})...`;
        }
        
        // 🆕 P3 優化：計算速度和預估時間
        const now = Date.now();
        const current = data.extracted || 0;
        const total = data.total || 0;
        const elapsedSeconds = this._extractionStartTime ? Math.round((now - this._extractionStartTime) / 1000) : 0;
        
        let speed = 0;
        let estimatedSeconds = 0;
        
        if (current > 0 && elapsedSeconds > 0) {
          speed = Math.round((current / elapsedSeconds) * 10) / 10;  // 每秒提取數
          const remaining = total - current;
          if (speed > 0 && remaining > 0) {
            estimatedSeconds = Math.ceil(remaining / speed);
          }
        }
        
        // 格式化狀態文字（包含預估時間）
        if (data.status === 'extracting' && estimatedSeconds > 0) {
          const mins = Math.floor(estimatedSeconds / 60);
          const secs = estimatedSeconds % 60;
          const timeStr = mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`;
          statusText = `正在提取 (${current}/${total}) 預估剩餘 ${timeStr}`;
        }
        
        const progress: ExtractionProgress = {
          groupId: String(data.resourceId || data.groupId),
          current,
          total,
          status: statusText,
          percent: total > 0 ? Math.round((current / total) * 100) : 0,
          estimatedSeconds,
          elapsedSeconds,
          speed,
          fromCache: data.fromCache || false
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
        
        // 🆕 P3：顯示來自緩存的提示
        if (data.fromCache) {
          this.toast.info(`📦 使用緩存結果（${Math.round(data.cacheAge / 60)} 分鐘前）`);
        }
        
        // 更新配額
        this._quota.update(q => ({
          ...q,
          used: q.used + result.count,
          remaining: Math.max(0, q.remaining - result.count)
        }));
        
        // 🆕 P3：智能建議
        this.showSmartSuggestions(result);
      } else if (data.error) {
        // 🆕 P3：智能錯誤建議
        const suggestion = this.getErrorSuggestion(data.error_code, data.error_details);
        if (suggestion) {
          this.toast.warning(`${data.error}\n\n💡 ${suggestion}`);
        } else {
          this.toast.error(`提取失敗：${data.error}`);
        }
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
    
    // 🆕 P2：監聽背景提取完成
    this.ipc.on('background-extraction-completed', (data: any) => {
      if (data.success) {
        this.toast.success(`✅ 背景提取完成：${data.chatTitle || '群組'} - ${data.extracted} 個成員`);
      } else {
        this.toast.error(`❌ 背景提取失敗：${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 P2：監聽背景提取啟動確認
    this.ipc.on('background-extraction-started', (data: any) => {
      if (data.success) {
        console.log('[UnifiedExtraction] Background task started:', data.taskId);
      }
    });
    
    // 🆕 P4：監聽導出完成
    this.ipc.on('members-exported', (data: any) => {
      if (data.success && data.content) {
        // 創建下載
        const blob = new Blob([data.content], { 
          type: data.format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
        this.toast.success(`✅ 導出成功: ${data.filename}`);
      } else if (data.error) {
        this.toast.error(`導出失敗: ${data.error}`);
      }
    });
    
    // 🆕 P4：監聽去重完成
    this.ipc.on('members-deduplicated', (data: any) => {
      if (data.success) {
        this.toast.success(`✅ 去重完成: 合併 ${data.merged} 個，刪除 ${data.deleted} 條`);
      } else {
        this.toast.error(`去重失敗: ${data.error}`);
      }
    });
    
    // 🆕 P4：監聽批量標籤完成
    this.ipc.on('members-tagged', (data: any) => {
      if (data.success) {
        this.toast.success(`✅ 已${data.action === 'add' ? '添加' : '移除'}標籤「${data.tag}」: ${data.count} 個成員`);
      }
    });
    
    // 🆕 P4：監聯評分重算完成
    this.ipc.on('scores-recalculated', (data: any) => {
      if (data.success) {
        this.toast.success(`✅ 評分重算完成: ${data.count} 個成員`);
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
  
  // ==================== P2 優化：背景提取 ====================
  
  /**
   * 啟動背景提取（可以關閉對話框繼續其他操作）
   */
  startBackgroundExtraction(
    group: ExtractionGroupInfo,
    config: MemberExtractionConfig
  ): void {
    let chatId = '';
    if (group.url) {
      const match = group.url.match(/t\.me\/([+\w]+)/);
      if (match) {
        chatId = match[1];
      }
    }
    
    this.ipc.send('start-background-extraction', {
      chatId: chatId || group.telegramId || group.id,
      telegramId: group.telegramId,
      limit: config.limit === -1 ? undefined : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
        onlineStatus: config.filters.onlineStatus
      }
    });
    
    this.toast.success('🔄 背景提取已啟動，可以繼續其他操作');
  }
  
  /**
   * 獲取背景任務列表
   */
  getBackgroundTasks(): void {
    this.ipc.send('get-background-tasks', {});
  }
  
  // ==================== P2 優化：統計功能 ====================
  
  /**
   * 獲取提取統計
   */
  getExtractionStats(): void {
    this.ipc.send('get-extraction-stats', {});
  }
  
  /**
   * 清除緩存
   */
  clearExtractionCache(chatId?: string): void {
    this.ipc.send('clear-extraction-cache', { chatId });
    this.toast.info(chatId ? '已清除該群組緩存' : '已清除所有緩存');
  }
  
  // ==================== P4 優化：數據導出與管理 ====================
  
  /**
   * 導出成員數據
   */
  exportMembers(format: 'csv' | 'json' = 'csv', filters?: any): void {
    this.ipc.send('export-members', { format, filters });
    this.toast.info(`正在導出 ${format.toUpperCase()} 格式數據...`);
  }
  
  /**
   * 去重成員數據
   */
  deduplicateMembers(): void {
    this.ipc.send('deduplicate-members', {});
    this.toast.info('正在執行去重...');
  }
  
  /**
   * 批量添加標籤
   */
  batchAddTag(userIds: string[], tag: string): void {
    this.ipc.send('batch-tag-members', { userIds, tag, action: 'add' });
  }
  
  /**
   * 批量移除標籤
   */
  batchRemoveTag(userIds: string[], tag: string): void {
    this.ipc.send('batch-tag-members', { userIds, tag, action: 'remove' });
  }
  
  /**
   * 獲取所有標籤
   */
  getAllTags(): void {
    this.ipc.send('get-all-tags', {});
  }
  
  /**
   * 獲取群組畫像
   */
  getGroupProfile(chatId: string): void {
    this.ipc.send('get-group-profile', { chatId });
  }
  
  /**
   * 比較群組
   */
  compareGroups(chatIds: string[]): void {
    this.ipc.send('compare-groups', { chatIds });
  }
  
  /**
   * 重新計算評分
   */
  recalculateScores(chatId?: string): void {
    this.ipc.send('recalculate-scores', { chatId });
    this.toast.info('正在重新計算評分...');
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
  
  // ==================== P3 優化：智能建議 ====================
  
  /**
   * 根據錯誤代碼獲取建議
   */
  private getErrorSuggestion(errorCode?: string, errorDetails?: any): string | null {
    if (!errorCode) return null;
    
    const suggestions: Record<string, string> = {
      'PEER_ID_INVALID': '請先加入群組，然後等待 30 秒再嘗試提取',
      'NOT_PARTICIPANT': '請使用已加入群組的帳號進行提取',
      'USER_NOT_PARTICIPANT': '帳號尚未加入群組，請先加入後重試',
      'CHANNEL_PRIVATE': '這是私有群組，需要邀請鏈接或管理員批准',
      'ADMIN_REQUIRED': '群組設置限制了成員列表，可嘗試監控消息來收集用戶',
      'FLOOD_WAIT': '請求過於頻繁，系統會自動等待後重試',
      'CHANNEL_INVALID': '群組可能已被刪除，請刷新資源列表'
    };
    
    let suggestion = suggestions[errorCode];
    
    // 根據 errorDetails 提供更具體的建議
    if (errorDetails) {
      if (errorDetails.attempts && errorDetails.attempts > 1) {
        suggestion = `已嘗試 ${errorDetails.attempts} 次，Telegram 同步較慢。建議等待 1 分鐘後重試，或嘗試重新加入群組。`;
      }
      if (errorDetails.suggestion) {
        suggestion = errorDetails.suggestion;
      }
    }
    
    return suggestion || null;
  }
  
  /**
   * 顯示智能建議
   */
  private showSmartSuggestions(result: ExtractionResult): void {
    const suggestions: string[] = [];
    
    // 分析結果並提供建議
    if (result.count === 0) {
      suggestions.push('未提取到成員，可能是群組設置限制或成員列表為空');
    } else if (result.count < 10) {
      suggestions.push('提取成員較少，可能群組成員不多或有過濾條件');
    }
    
    // 質量分析
    const onlineRate = result.stats?.online ? result.stats.online / result.count : 0;
    if (onlineRate < 0.1 && result.count > 20) {
      suggestions.push('在線用戶比例較低，建議使用「最近活躍」過濾器獲取更活躍的用戶');
    }
    
    // 顯示建議
    if (suggestions.length > 0 && result.count > 0) {
      // 只在有實際數據時顯示建議
      console.log('[UnifiedExtraction] Smart suggestions:', suggestions);
    }
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
