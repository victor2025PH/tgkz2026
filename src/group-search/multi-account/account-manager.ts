/**
 * TG-AI智控王 多帳號管理系統
 * Account Manager v1.0
 * 
 * 功能：
 * - 多帳號註冊與管理
 * - 帳號健康度監控
 * - 智能負載均衡
 * - 風險隔離策略
 * - 帳號預熱管理
 */

import { Injectable, signal, computed, inject, NgZone } from '@angular/core';

// ============ 類型定義 ============

export type AccountStatus = 
  | 'active'      // 活躍
  | 'idle'        // 閒置
  | 'busy'        // 忙碌
  | 'limited'     // 受限
  | 'banned'      // 封禁
  | 'warming'     // 預熱中
  | 'offline';    // 離線

export type AccountRole = 
  | 'primary'     // 主帳號
  | 'secondary'   // 副帳號
  | 'dedicated';  // 專用帳號（高風險操作）

export interface TelegramAccount {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  
  // 狀態
  status: AccountStatus;
  role: AccountRole;
  
  // 健康度 (0-100)
  healthScore: number;
  
  // 配額
  quotas: {
    dailyMessages: number;
    dailyMessagesUsed: number;
    dailySearches: number;
    dailySearchesUsed: number;
    dailyExtractions: number;
    dailyExtractionsUsed: number;
  };
  
  // 會話信息
  session?: {
    dcId: number;
    authKey: string;
    serverAddress: string;
  };
  
  // 帳號信息
  createdAt: Date;
  addedAt: Date;
  lastActiveAt?: Date;
  lastError?: string;
  
  // 預熱進度
  warmupProgress?: {
    day: number;
    totalDays: number;
    completedTasks: string[];
  };
  
  // 統計
  stats: {
    totalMessages: number;
    totalSearches: number;
    totalExtractions: number;
    successRate: number;
    errorCount: number;
    lastErrorAt?: Date;
  };
  
  // 風險標記
  riskFlags: string[];
}

export interface AccountHealth {
  accountId: string;
  score: number;
  factors: {
    activity: number;      // 活躍度
    errorRate: number;     // 錯誤率
    quotaUsage: number;    // 配額使用率
    age: number;           // 帳號年齡
    warmupStatus: number;  // 預熱狀態
  };
  warnings: string[];
  recommendations: string[];
}

// ============ 配置 ============

const ACCOUNT_CONFIG = {
  // 健康度閾值
  healthThresholds: {
    excellent: 90,
    good: 70,
    fair: 50,
    poor: 30
  },
  
  // 預熱配置
  warmup: {
    totalDays: 14,
    dailyTasks: [
      { day: 1, messages: 5, searches: 2 },
      { day: 2, messages: 8, searches: 3 },
      { day: 3, messages: 12, searches: 5 },
      { day: 5, messages: 20, searches: 8 },
      { day: 7, messages: 30, searches: 10 },
      { day: 10, messages: 40, searches: 15 },
      { day: 14, messages: 50, searches: 20 }
    ]
  },
  
  // 默認配額
  defaultQuotas: {
    dailyMessages: 50,
    dailySearches: 20,
    dailyExtractions: 500
  },
  
  // 輪換間隔（毫秒）
  rotationInterval: 5 * 60 * 1000,
  
  // 冷卻時間（毫秒）
  cooldownTime: 30 * 60 * 1000,
  
  // 最大錯誤次數
  maxErrorsBeforeCooldown: 3
};

@Injectable({
  providedIn: 'root'
})
export class AccountManager {
  private ngZone = inject(NgZone);
  
  // 帳號列表
  private _accounts = signal<TelegramAccount[]>([]);
  accounts = computed(() => this._accounts());
  
  // 當前活躍帳號
  private _activeAccountId = signal<string | null>(null);
  activeAccountId = computed(() => this._activeAccountId());
  
  // 帳號健康度
  private _accountHealth = signal<Map<string, AccountHealth>>(new Map());
  accountHealth = computed(() => this._accountHealth());
  
  // TG 客戶端映射
  private clients: Map<string, any> = new Map();
  
  // 輪換定時器
  private rotationTimer: any = null;
  
  // 計算屬性
  activeAccounts = computed(() => 
    this._accounts().filter(a => a.status === 'active' || a.status === 'idle')
  );
  
  primaryAccount = computed(() => 
    this._accounts().find(a => a.role === 'primary')
  );
  
  availableAccounts = computed(() => 
    this._accounts().filter(a => 
      (a.status === 'active' || a.status === 'idle') &&
      a.healthScore >= ACCOUNT_CONFIG.healthThresholds.fair
    )
  );
  
  currentAccount = computed(() => {
    const id = this._activeAccountId();
    return id ? this._accounts().find(a => a.id === id) : null;
  });
  
  constructor() {
    this.loadAccounts();
    this.startHealthMonitoring();
  }
  
  // ============ 帳號管理 ============
  
  /**
   * 添加帳號
   */
  async addAccount(
    phone: string,
    session?: TelegramAccount['session'],
    role: AccountRole = 'secondary'
  ): Promise<TelegramAccount> {
    const id = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const account: TelegramAccount = {
      id,
      phone,
      status: 'offline',
      role,
      healthScore: 100,
      quotas: {
        ...ACCOUNT_CONFIG.defaultQuotas,
        dailyMessagesUsed: 0,
        dailySearchesUsed: 0,
        dailyExtractionsUsed: 0
      },
      session,
      createdAt: new Date(),
      addedAt: new Date(),
      stats: {
        totalMessages: 0,
        totalSearches: 0,
        totalExtractions: 0,
        successRate: 100,
        errorCount: 0
      },
      riskFlags: []
    };
    
    // 如果是第一個帳號，設為主帳號
    if (this._accounts().length === 0) {
      account.role = 'primary';
    }
    
    this._accounts.update(accounts => [...accounts, account]);
    this.saveAccounts();
    
    // 初始化預熱計劃
    if (role !== 'primary') {
      this.initializeWarmup(account);
    }
    
    console.log(`[AccountManager] Added account: ${phone}`);
    
    return account;
  }
  
  /**
   * 移除帳號
   */
  removeAccount(accountId: string): boolean {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    // 不允許移除主帳號（除非是最後一個）
    if (account.role === 'primary' && this._accounts().length > 1) {
      console.warn('[AccountManager] Cannot remove primary account');
      return false;
    }
    
    // 斷開連接
    this.disconnectAccount(accountId);
    
    // 從列表中移除
    this._accounts.update(accounts => accounts.filter(a => a.id !== accountId));
    this.saveAccounts();
    
    // 如果是當前活躍帳號，切換到其他帳號
    if (this._activeAccountId() === accountId) {
      const next = this.selectBestAccount();
      this._activeAccountId.set(next?.id || null);
    }
    
    console.log(`[AccountManager] Removed account: ${account.phone}`);
    return true;
  }
  
  /**
   * 設置主帳號
   */
  setPrimaryAccount(accountId: string): boolean {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    this._accounts.update(accounts => accounts.map(a => ({
      ...a,
      role: a.id === accountId ? 'primary' : (a.role === 'primary' ? 'secondary' : a.role)
    })));
    
    this.saveAccounts();
    return true;
  }
  
  /**
   * 連接帳號
   */
  async connectAccount(accountId: string): Promise<boolean> {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    try {
      // 更新狀態
      this.updateAccountStatus(accountId, 'busy');
      
      // 創建 TG 客戶端
      // const client = new TelegramClient(...);
      // await client.connect();
      
      // 模擬連接
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 保存客戶端引用
      // this.clients.set(accountId, client);
      
      // 更新狀態
      this.updateAccountStatus(accountId, 'active');
      this.updateAccount(accountId, { lastActiveAt: new Date() });
      
      console.log(`[AccountManager] Connected account: ${account.phone}`);
      return true;
    } catch (error: any) {
      console.error(`[AccountManager] Failed to connect: ${error.message}`);
      this.updateAccountStatus(accountId, 'offline');
      this.recordError(accountId, error.message);
      return false;
    }
  }
  
  /**
   * 斷開帳號
   */
  disconnectAccount(accountId: string): void {
    const client = this.clients.get(accountId);
    if (client) {
      // client.disconnect();
      this.clients.delete(accountId);
    }
    
    this.updateAccountStatus(accountId, 'offline');
  }
  
  /**
   * 獲取帳號客戶端
   */
  getClient(accountId?: string): any {
    const id = accountId || this._activeAccountId();
    return id ? this.clients.get(id) : null;
  }
  
  // ============ 帳號選擇與輪換 ============
  
  /**
   * 選擇最佳帳號
   */
  selectBestAccount(purpose?: 'message' | 'search' | 'extraction'): TelegramAccount | null {
    const available = this.availableAccounts();
    if (available.length === 0) return null;
    
    // 按健康度和配額使用率排序
    const scored = available.map(account => {
      let score = account.healthScore;
      
      // 根據用途檢查配額
      if (purpose === 'message') {
        const usage = account.quotas.dailyMessagesUsed / account.quotas.dailyMessages;
        score -= usage * 20;
      } else if (purpose === 'search') {
        const usage = account.quotas.dailySearchesUsed / account.quotas.dailySearches;
        score -= usage * 20;
      } else if (purpose === 'extraction') {
        const usage = account.quotas.dailyExtractionsUsed / account.quotas.dailyExtractions;
        score -= usage * 20;
      }
      
      // 主帳號優先（非高風險操作）
      if (account.role === 'primary' && purpose !== 'message') {
        score += 10;
      }
      
      // 專用帳號處理高風險操作
      if (account.role === 'dedicated' && purpose === 'message') {
        score += 20;
      }
      
      return { account, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.account || null;
  }
  
  /**
   * 切換到指定帳號
   */
  async switchToAccount(accountId: string): Promise<boolean> {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    // 如果帳號未連接，先連接
    if (account.status === 'offline') {
      const connected = await this.connectAccount(accountId);
      if (!connected) return false;
    }
    
    // 將當前帳號設為閒置
    const currentId = this._activeAccountId();
    if (currentId && currentId !== accountId) {
      this.updateAccountStatus(currentId, 'idle');
    }
    
    // 切換活躍帳號
    this._activeAccountId.set(accountId);
    this.updateAccountStatus(accountId, 'active');
    
    console.log(`[AccountManager] Switched to: ${account.phone}`);
    return true;
  }
  
  /**
   * 自動輪換帳號
   */
  async rotateAccount(purpose?: 'message' | 'search' | 'extraction'): Promise<TelegramAccount | null> {
    const best = this.selectBestAccount(purpose);
    if (!best) return null;
    
    if (best.id !== this._activeAccountId()) {
      await this.switchToAccount(best.id);
    }
    
    return best;
  }
  
  /**
   * 開始自動輪換
   */
  startAutoRotation(): void {
    if (this.rotationTimer) return;
    
    this.rotationTimer = setInterval(() => {
      this.rotateAccount();
    }, ACCOUNT_CONFIG.rotationInterval);
    
    console.log('[AccountManager] Auto rotation started');
  }
  
  /**
   * 停止自動輪換
   */
  stopAutoRotation(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
    
    console.log('[AccountManager] Auto rotation stopped');
  }
  
  // ============ 健康度監控 ============
  
  /**
   * 計算帳號健康度
   */
  calculateHealth(account: TelegramAccount): AccountHealth {
    const factors = {
      activity: 0,
      errorRate: 0,
      quotaUsage: 0,
      age: 0,
      warmupStatus: 0
    };
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 活躍度 (0-25)
    if (account.lastActiveAt) {
      const hoursSinceActive = (Date.now() - new Date(account.lastActiveAt).getTime()) / (1000 * 60 * 60);
      if (hoursSinceActive < 1) factors.activity = 25;
      else if (hoursSinceActive < 24) factors.activity = 20;
      else if (hoursSinceActive < 72) factors.activity = 15;
      else factors.activity = 5;
    }
    
    // 錯誤率 (0-25)
    const totalOps = account.stats.totalMessages + account.stats.totalSearches + account.stats.totalExtractions;
    if (totalOps > 0) {
      const errorRate = account.stats.errorCount / totalOps;
      factors.errorRate = Math.max(0, 25 - errorRate * 100);
      
      if (errorRate > 0.1) {
        warnings.push('錯誤率過高');
        recommendations.push('減少操作頻率');
      }
    } else {
      factors.errorRate = 20;  // 新帳號默認分數
    }
    
    // 配額使用率 (0-25)
    const msgUsage = account.quotas.dailyMessagesUsed / account.quotas.dailyMessages;
    const searchUsage = account.quotas.dailySearchesUsed / account.quotas.dailySearches;
    const extractUsage = account.quotas.dailyExtractionsUsed / account.quotas.dailyExtractions;
    const avgUsage = (msgUsage + searchUsage + extractUsage) / 3;
    factors.quotaUsage = Math.max(0, 25 - avgUsage * 25);
    
    if (msgUsage > 0.8) {
      warnings.push('消息配額即將耗盡');
    }
    
    // 帳號年齡 (0-15)
    const ageInDays = (Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > 365) factors.age = 15;
    else if (ageInDays > 180) factors.age = 12;
    else if (ageInDays > 90) factors.age = 10;
    else if (ageInDays > 30) factors.age = 7;
    else if (ageInDays > 14) factors.age = 5;
    else {
      factors.age = 3;
      warnings.push('新帳號，建議預熱');
      recommendations.push('使用預熱計劃');
    }
    
    // 預熱狀態 (0-10)
    if (account.warmupProgress) {
      const progress = account.warmupProgress.day / account.warmupProgress.totalDays;
      factors.warmupStatus = progress * 10;
      
      if (progress < 1) {
        warnings.push(`預熱進度: ${Math.round(progress * 100)}%`);
      }
    } else if (ageInDays > 14) {
      factors.warmupStatus = 10;  // 老帳號無需預熱
    }
    
    // 風險標記檢查
    if (account.riskFlags.length > 0) {
      warnings.push(...account.riskFlags.map(f => `風險: ${f}`));
    }
    
    // 帳號狀態檢查
    if (account.status === 'limited') {
      warnings.push('帳號功能受限');
      recommendations.push('減少操作，等待限制解除');
    } else if (account.status === 'banned') {
      warnings.push('帳號已被封禁');
    }
    
    // 計算總分
    const score = Math.round(
      factors.activity + 
      factors.errorRate + 
      factors.quotaUsage + 
      factors.age + 
      factors.warmupStatus
    );
    
    return {
      accountId: account.id,
      score: Math.max(0, Math.min(100, score)),
      factors,
      warnings,
      recommendations
    };
  }
  
  /**
   * 更新所有帳號健康度
   */
  updateAllHealth(): void {
    const healthMap = new Map<string, AccountHealth>();
    
    for (const account of this._accounts()) {
      const health = this.calculateHealth(account);
      healthMap.set(account.id, health);
      
      // 更新帳號的健康分數
      this.updateAccount(account.id, { healthScore: health.score });
    }
    
    this._accountHealth.set(healthMap);
  }
  
  /**
   * 開始健康監控
   */
  private startHealthMonitoring(): void {
    // 每 5 分鐘更新一次健康度
    setInterval(() => {
      this.updateAllHealth();
    }, 5 * 60 * 1000);
    
    // 立即執行一次
    this.updateAllHealth();
  }
  
  // ============ 預熱管理 ============
  
  /**
   * 初始化預熱計劃
   */
  private initializeWarmup(account: TelegramAccount): void {
    account.warmupProgress = {
      day: 0,
      totalDays: ACCOUNT_CONFIG.warmup.totalDays,
      completedTasks: []
    };
    account.status = 'warming';
    
    this._accounts.update(accounts => 
      accounts.map(a => a.id === account.id ? account : a)
    );
    
    console.log(`[AccountManager] Warmup initialized for: ${account.phone}`);
  }
  
  /**
   * 獲取今日預熱任務
   */
  getWarmupTasks(accountId: string): { messages: number; searches: number } | null {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account?.warmupProgress) return null;
    
    const day = account.warmupProgress.day;
    const tasks = ACCOUNT_CONFIG.warmup.dailyTasks;
    
    // 找到當前階段的任務
    for (let i = tasks.length - 1; i >= 0; i--) {
      if (day >= tasks[i].day) {
        return { messages: tasks[i].messages, searches: tasks[i].searches };
      }
    }
    
    return tasks[0];
  }
  
  /**
   * 完成預熱任務
   */
  completeWarmupTask(accountId: string, task: string): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account?.warmupProgress) return;
    
    if (!account.warmupProgress.completedTasks.includes(task)) {
      account.warmupProgress.completedTasks.push(task);
    }
    
    this._accounts.update(accounts => 
      accounts.map(a => a.id === accountId ? account : a)
    );
    this.saveAccounts();
  }
  
  /**
   * 推進預熱進度
   */
  advanceWarmupDay(accountId: string): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account?.warmupProgress) return;
    
    account.warmupProgress.day++;
    account.warmupProgress.completedTasks = [];
    
    // 檢查是否完成預熱
    if (account.warmupProgress.day >= account.warmupProgress.totalDays) {
      account.status = 'idle';
      delete account.warmupProgress;
      console.log(`[AccountManager] Warmup completed: ${account.phone}`);
    }
    
    this._accounts.update(accounts => 
      accounts.map(a => a.id === accountId ? account : a)
    );
    this.saveAccounts();
  }
  
  // ============ 配額管理 ============
  
  /**
   * 使用配額
   */
  useQuota(accountId: string, type: 'message' | 'search' | 'extraction', amount: number = 1): boolean {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    const quotaKey = `daily${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof TelegramAccount['quotas'];
    const usedKey = `${quotaKey}Used` as keyof TelegramAccount['quotas'];
    
    const limit = account.quotas[quotaKey];
    const used = account.quotas[usedKey];
    
    if (used + amount > limit) {
      return false;  // 配額不足
    }
    
    // 更新使用量
    this.updateAccount(accountId, {
      quotas: {
        ...account.quotas,
        [usedKey]: used + amount
      }
    });
    
    // 更新統計
    const statsKey = `total${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof TelegramAccount['stats'];
    this.updateAccount(accountId, {
      stats: {
        ...account.stats,
        [statsKey]: (account.stats[statsKey] as number) + amount
      }
    });
    
    return true;
  }
  
  /**
   * 檢查配額
   */
  checkQuota(accountId: string, type: 'message' | 'search' | 'extraction', amount: number = 1): boolean {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    const quotaKey = `daily${type.charAt(0).toUpperCase() + type.slice(1)}s` as keyof TelegramAccount['quotas'];
    const usedKey = `${quotaKey}Used` as keyof TelegramAccount['quotas'];
    
    return (account.quotas[usedKey] + amount) <= account.quotas[quotaKey];
  }
  
  /**
   * 重置每日配額
   */
  resetDailyQuotas(): void {
    this._accounts.update(accounts => accounts.map(a => ({
      ...a,
      quotas: {
        ...a.quotas,
        dailyMessagesUsed: 0,
        dailySearchesUsed: 0,
        dailyExtractionsUsed: 0
      }
    })));
    this.saveAccounts();
    
    console.log('[AccountManager] Daily quotas reset');
  }
  
  // ============ 錯誤處理 ============
  
  /**
   * 記錄錯誤
   */
  recordError(accountId: string, error: string): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return;
    
    // 更新錯誤計數
    const errorCount = account.stats.errorCount + 1;
    const totalOps = account.stats.totalMessages + account.stats.totalSearches + account.stats.totalExtractions + 1;
    const successRate = Math.max(0, 100 - (errorCount / totalOps) * 100);
    
    this.updateAccount(accountId, {
      lastError: error,
      stats: {
        ...account.stats,
        errorCount,
        successRate,
        lastErrorAt: new Date()
      }
    });
    
    // 連續錯誤檢測
    if (errorCount >= ACCOUNT_CONFIG.maxErrorsBeforeCooldown) {
      this.triggerCooldown(accountId);
    }
    
    // 特殊錯誤處理
    if (error.includes('FLOOD_WAIT') || error.includes('rate limit')) {
      this.addRiskFlag(accountId, '速率限制');
      this.triggerCooldown(accountId);
    }
    
    if (error.includes('BANNED') || error.includes('deactivated')) {
      this.updateAccountStatus(accountId, 'banned');
      this.addRiskFlag(accountId, '帳號封禁');
    }
  }
  
  /**
   * 觸發冷卻
   */
  private triggerCooldown(accountId: string): void {
    this.updateAccountStatus(accountId, 'limited');
    
    console.log(`[AccountManager] Account ${accountId} entered cooldown`);
    
    // 冷卻結束後恢復
    setTimeout(() => {
      const account = this._accounts().find(a => a.id === accountId);
      if (account?.status === 'limited') {
        this.updateAccountStatus(accountId, 'idle');
        console.log(`[AccountManager] Account ${accountId} cooldown ended`);
      }
    }, ACCOUNT_CONFIG.cooldownTime);
  }
  
  /**
   * 添加風險標記
   */
  addRiskFlag(accountId: string, flag: string): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return;
    
    if (!account.riskFlags.includes(flag)) {
      this.updateAccount(accountId, {
        riskFlags: [...account.riskFlags, flag]
      });
    }
  }
  
  /**
   * 清除風險標記
   */
  clearRiskFlags(accountId: string): void {
    this.updateAccount(accountId, { riskFlags: [] });
  }
  
  // ============ 輔助方法 ============
  
  private updateAccount(accountId: string, updates: Partial<TelegramAccount>): void {
    this._accounts.update(accounts => 
      accounts.map(a => a.id === accountId ? { ...a, ...updates } : a)
    );
    this.saveAccounts();
  }
  
  private updateAccountStatus(accountId: string, status: AccountStatus): void {
    this.updateAccount(accountId, { status });
  }
  
  private saveAccounts(): void {
    try {
      const accounts = this._accounts().map(a => ({
        ...a,
        session: undefined  // 不保存敏感的會話信息到 localStorage
      }));
      localStorage.setItem('tgai-accounts', JSON.stringify(accounts));
    } catch (e) {
      console.error('[AccountManager] Failed to save accounts:', e);
    }
  }
  
  private loadAccounts(): void {
    try {
      const data = localStorage.getItem('tgai-accounts');
      if (data) {
        const accounts = JSON.parse(data);
        this._accounts.set(accounts.map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt),
          addedAt: new Date(a.addedAt),
          lastActiveAt: a.lastActiveAt ? new Date(a.lastActiveAt) : undefined,
          stats: {
            ...a.stats,
            lastErrorAt: a.stats?.lastErrorAt ? new Date(a.stats.lastErrorAt) : undefined
          }
        })));
      }
    } catch (e) {
      console.error('[AccountManager] Failed to load accounts:', e);
    }
  }
  
  /**
   * 獲取帳號統計摘要
   */
  getAccountSummary(): {
    total: number;
    active: number;
    warming: number;
    limited: number;
    avgHealth: number;
  } {
    const accounts = this._accounts();
    
    return {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active' || a.status === 'idle').length,
      warming: accounts.filter(a => a.status === 'warming').length,
      limited: accounts.filter(a => a.status === 'limited' || a.status === 'banned').length,
      avgHealth: accounts.length > 0 
        ? accounts.reduce((sum, a) => sum + a.healthScore, 0) / accounts.length 
        : 0
    };
  }
}
