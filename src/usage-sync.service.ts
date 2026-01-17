/**
 * TG-AI智控王 Usage Sync Service
 * 用量數據同步服務 v2.0
 * 
 * 功能：
 * - 本地用量追蹤
 * - 服務器同步
 * - 配額實時更新
 * - 離線緩存
 */
import { Injectable, signal, computed, inject, NgZone, OnDestroy } from '@angular/core';
import { MembershipService } from './membership.service';
import { SecurityClientService } from './security-client.service';
import { ToastService } from './toast.service';

export interface UsageData {
  date: string;
  messages: number;
  aiCalls: number;
  accounts: number;
  groups: number;
  keywordSets: number;
}

export interface QuotaStatus {
  used: {
    messages: number;
    ai: number;
  };
  remaining: {
    messages: number;
    ai: number;
  };
  max: {
    messages: number;
    ai: number;
  };
  synced: boolean;
  lastSync?: Date;
}

export interface PendingUsage {
  type: 'message' | 'ai' | 'account' | 'group' | 'keyword_set';
  action: 'use' | 'create' | 'delete';
  count: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class UsageSyncService implements OnDestroy {
  private membershipService = inject(MembershipService);
  private securityService = inject(SecurityClientService);
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  
  // 服務器配置
  private serverUrl = signal<string>('');
  private token = signal<string | null>(null);
  
  // 配額狀態
  private _quotaStatus = signal<QuotaStatus>({
    used: { messages: 0, ai: 0 },
    remaining: { messages: -1, ai: -1 },
    max: { messages: -1, ai: -1 },
    synced: false
  });
  
  // 離線緩存
  private pendingUsages: PendingUsage[] = [];
  private readonly PENDING_STORAGE_KEY = 'tgai-pending-usage';
  
  // 同步狀態
  private syncInterval: any = null;
  isOnline = signal(true);
  isSyncing = signal(false);
  lastSyncTime = signal<Date | null>(null);
  
  // 計算屬性
  quotaStatus = computed(() => this._quotaStatus());
  
  messagesRemaining = computed(() => {
    const status = this._quotaStatus();
    return status.remaining.messages;
  });
  
  aiRemaining = computed(() => {
    const status = this._quotaStatus();
    return status.remaining.ai;
  });
  
  isMessageQuotaExceeded = computed(() => {
    const status = this._quotaStatus();
    return status.max.messages !== -1 && status.used.messages >= status.max.messages;
  });
  
  isAiQuotaExceeded = computed(() => {
    const status = this._quotaStatus();
    return status.max.ai !== -1 && status.used.ai >= status.max.ai;
  });
  
  constructor() {
    this.loadConfig();
    this.loadPendingUsages();
    this.startSyncTimer();
    this.initializeFromLocal();
  }
  
  ngOnDestroy(): void {
    this.stopSyncTimer();
  }
  
  // ============ 初始化 ============
  
  private loadConfig(): void {
    this.serverUrl.set(localStorage.getItem('tgai-license-server') || '');
    this.token.set(localStorage.getItem('tgai-license-token'));
  }
  
  private loadPendingUsages(): void {
    try {
      const stored = localStorage.getItem(this.PENDING_STORAGE_KEY);
      if (stored) {
        this.pendingUsages = JSON.parse(stored);
      }
    } catch {
      this.pendingUsages = [];
    }
  }
  
  private savePendingUsages(): void {
    localStorage.setItem(this.PENDING_STORAGE_KEY, JSON.stringify(this.pendingUsages));
  }
  
  private initializeFromLocal(): void {
    // 從本地會員服務獲取初始配額
    const quotas = this.membershipService.quotas();
    const usage = this.membershipService.usage();
    
    this._quotaStatus.set({
      used: {
        messages: usage.todayMessages,
        ai: usage.todayAiCalls
      },
      remaining: {
        messages: quotas.dailyMessages === -1 ? -1 : quotas.dailyMessages - usage.todayMessages,
        ai: quotas.dailyAiCalls === -1 ? -1 : quotas.dailyAiCalls - usage.todayAiCalls
      },
      max: {
        messages: quotas.dailyMessages,
        ai: quotas.dailyAiCalls
      },
      synced: false
    });
  }
  
  // ============ 同步定時器 ============
  
  private startSyncTimer(): void {
    // 每 5 分鐘同步一次
    this.syncInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.syncWithServer();
      });
    }, 5 * 60 * 1000);
    
    // 立即進行一次同步
    setTimeout(() => this.syncWithServer(), 1000);
  }
  
  private stopSyncTimer(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // ============ 用量記錄 ============
  
  /**
   * 記錄消息發送
   */
  async logMessageSent(count: number = 1): Promise<{ allowed: boolean; remaining: number }> {
    return this.logUsage('message', 'use', count);
  }
  
  /**
   * 記錄 AI 調用
   */
  async logAiCall(count: number = 1): Promise<{ allowed: boolean; remaining: number }> {
    return this.logUsage('ai', 'use', count);
  }
  
  /**
   * 記錄賬戶操作
   */
  async logAccountOperation(action: 'create' | 'delete'): Promise<{ allowed: boolean }> {
    const result = await this.logUsage('account', action, 1);
    return { allowed: result.allowed };
  }
  
  /**
   * 記錄群組操作
   */
  async logGroupOperation(action: 'create' | 'delete'): Promise<{ allowed: boolean }> {
    const result = await this.logUsage('group', action, 1);
    return { allowed: result.allowed };
  }
  
  /**
   * 通用用量記錄
   */
  private async logUsage(
    type: 'message' | 'ai' | 'account' | 'group' | 'keyword_set',
    action: 'use' | 'create' | 'delete',
    count: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    // 先進行本地檢查
    const localCheck = this.checkLocalQuota(type, count);
    if (!localCheck.allowed) {
      return localCheck;
    }
    
    // 更新本地計數
    this.updateLocalUsage(type, action, count);
    
    // 如果有服務器配置，則同步到服務器
    if (this.serverUrl() && this.token()) {
      try {
        const result = await this.syncUsageToServer(type, action, count);
        if (result.success) {
          // 更新本地狀態
          this.updateQuotaStatus(result.data);
          return { allowed: true, remaining: result.data?.remaining?.[type === 'message' ? 'messages' : 'ai'] ?? -1 };
        } else if (result.quotaExceeded) {
          // 服務器說配額已滿
          return { allowed: false, remaining: 0 };
        }
      } catch {
        // 離線模式，添加到待同步隊列
        this.addPendingUsage({ type, action, count, timestamp: Date.now() });
      }
    }
    
    return localCheck;
  }
  
  private checkLocalQuota(type: string, count: number): { allowed: boolean; remaining: number } {
    const status = this._quotaStatus();
    
    if (type === 'message') {
      if (status.max.messages === -1) {
        return { allowed: true, remaining: -1 };
      }
      const remaining = status.max.messages - status.used.messages;
      return { allowed: remaining >= count, remaining: Math.max(0, remaining - count) };
    }
    
    if (type === 'ai') {
      if (status.max.ai === -1) {
        return { allowed: true, remaining: -1 };
      }
      const remaining = status.max.ai - status.used.ai;
      return { allowed: remaining >= count, remaining: Math.max(0, remaining - count) };
    }
    
    return { allowed: true, remaining: -1 };
  }
  
  private updateLocalUsage(type: string, action: string, count: number): void {
    const status = this._quotaStatus();
    
    if (type === 'message' && action === 'use') {
      this._quotaStatus.set({
        ...status,
        used: { ...status.used, messages: status.used.messages + count },
        remaining: {
          ...status.remaining,
          messages: status.max.messages === -1 ? -1 : status.remaining.messages - count
        }
      });
      
      // 同步到 membership service
      this.membershipService.recordMessageSent(count);
    }
    
    if (type === 'ai' && action === 'use') {
      this._quotaStatus.set({
        ...status,
        used: { ...status.used, ai: status.used.ai + count },
        remaining: {
          ...status.remaining,
          ai: status.max.ai === -1 ? -1 : status.remaining.ai - count
        }
      });
      
      // 同步到 membership service
      this.membershipService.recordAiCall(count);
    }
  }
  
  // ============ 服務器同步 ============
  
  private async syncUsageToServer(
    type: string,
    action: string,
    count: number
  ): Promise<{ success: boolean; quotaExceeded?: boolean; data?: any }> {
    const url = this.serverUrl();
    const token = this.token();
    
    if (!url || !token) {
      return { success: false };
    }
    
    try {
      const body = this.securityService.createSignedRequestBody({
        token,
        type,
        action,
        count
      });
      
      const headers = this.securityService.createSecureHeaders();
      
      const response = await fetch(`${url}/api/usage/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      this.ngZone.run(() => {
        this.isOnline.set(true);
      });
      
      return {
        success: result.success,
        quotaExceeded: result.data?.quotaExceeded,
        data: result.data
      };
    } catch {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
      throw new Error('Network error');
    }
  }
  
  /**
   * 與服務器同步配額狀態
   */
  async syncWithServer(): Promise<void> {
    const url = this.serverUrl();
    const token = this.token();
    
    if (!url || !token) {
      return;
    }
    
    this.isSyncing.set(true);
    
    try {
      // 先同步待處理的用量
      await this.flushPendingUsages();
      
      // 獲取最新配額
      const response = await fetch(`${url}/api/usage/sync`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      this.ngZone.run(() => {
        this.isOnline.set(true);
        
        if (result.success && result.data) {
          this.updateQuotaStatus(result.data);
          this.lastSyncTime.set(new Date());
        }
      });
    } catch {
      this.ngZone.run(() => {
        this.isOnline.set(false);
      });
    } finally {
      this.isSyncing.set(false);
    }
  }
  
  private updateQuotaStatus(data: any): void {
    if (!data) return;
    
    this._quotaStatus.set({
      used: data.used || { messages: 0, ai: 0 },
      remaining: data.remaining || { messages: -1, ai: -1 },
      max: data.max || { messages: -1, ai: -1 },
      synced: true,
      lastSync: new Date()
    });
  }
  
  // ============ 離線隊列 ============
  
  private addPendingUsage(usage: PendingUsage): void {
    this.pendingUsages.push(usage);
    this.savePendingUsages();
  }
  
  private async flushPendingUsages(): Promise<void> {
    if (this.pendingUsages.length === 0) return;
    
    const usages = [...this.pendingUsages];
    this.pendingUsages = [];
    
    for (const usage of usages) {
      try {
        await this.syncUsageToServer(usage.type, usage.action, usage.count);
      } catch {
        // 重新添加到隊列
        this.pendingUsages.push(usage);
      }
    }
    
    this.savePendingUsages();
  }
  
  // ============ Token 刷新 ============
  
  /**
   * 刷新 Token
   */
  async refreshToken(): Promise<{ success: boolean; token?: string }> {
    const url = this.serverUrl();
    const token = this.token();
    
    if (!url || !token) {
      return { success: false };
    }
    
    try {
      const body = this.securityService.createSignedRequestBody({
        token,
        machine_id: this.securityService.machineId,
        device_fingerprint: this.securityService.deviceFingerprint
      });
      
      const headers = this.securityService.createSecureHeaders();
      
      const response = await fetch(`${url}/api/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      
      if (result.success && result.data?.token) {
        this.token.set(result.data.token);
        localStorage.setItem('tgai-license-token', result.data.token);
        return { success: true, token: result.data.token };
      }
      
      return { success: false };
    } catch {
      return { success: false };
    }
  }
  
  // ============ 配置更新 ============
  
  setServerUrl(url: string): void {
    this.serverUrl.set(url.replace(/\/$/, ''));
  }
  
  setToken(token: string): void {
    this.token.set(token);
  }
}
