/**
 * 使用量服務
 * 
 * 優化設計：
 * 1. 使用量數據緩存
 * 2. 實時更新
 * 3. 配額告警
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

export interface UsageStats {
  user_id: string;
  date: string;
  api_calls: number;
  api_calls_limit: number;
  api_calls_percentage: number;
  accounts_count: number;
  accounts_limit: number;
  accounts_percentage: number;
  messages_sent: number;
  messages_received: number;
  ai_requests: number;
  ai_tokens_used: number;
  storage_used_mb: number;
  storage_limit_mb: number;
}

export interface QuotaStatus {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
}

export interface UsageSummary {
  today: UsageStats;
  last_30_days: {
    api_calls: number;
    messages: number;
    ai_requests: number;
    daily_average: {
      api_calls: number;
      messages: number;
    };
  };
  limits: {
    api_calls: number;
    accounts: number;
    api_calls_remaining: number;
    accounts_remaining: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UsageService {
  private api = inject(ApiService);
  private authService = inject(AuthService);
  
  // 狀態
  private _isLoading = signal(false);
  private _todayUsage = signal<UsageStats | null>(null);
  private _summary = signal<UsageSummary | null>(null);
  private _quotaStatus = signal<Record<string, QuotaStatus>>({});
  private _history = signal<any[]>([]);
  
  // 公開狀態
  readonly isLoading = computed(() => this._isLoading());
  readonly todayUsage = computed(() => this._todayUsage());
  readonly summary = computed(() => this._summary());
  readonly quotaStatus = computed(() => this._quotaStatus());
  readonly history = computed(() => this._history());
  
  // 計算屬性
  readonly apiCallsPercentage = computed(() => {
    const usage = this._todayUsage();
    if (!usage || usage.api_calls_limit <= 0) return 0;
    return Math.min(100, (usage.api_calls / usage.api_calls_limit) * 100);
  });
  
  readonly accountsPercentage = computed(() => {
    const usage = this._todayUsage();
    if (!usage || usage.accounts_limit <= 0) return 0;
    return Math.min(100, (usage.accounts_count / usage.accounts_limit) * 100);
  });
  
  readonly isQuotaWarning = computed(() => {
    return this.apiCallsPercentage() >= 80;
  });
  
  readonly isQuotaExceeded = computed(() => {
    return this.apiCallsPercentage() >= 100;
  });
  
  /**
   * 刷新所有使用量數據
   */
  async refresh(): Promise<void> {
    // Electron 模式不追蹤
    if (environment.apiMode === 'ipc') {
      return;
    }
    
    this._isLoading.set(true);
    
    try {
      await Promise.all([
        this.fetchTodayUsage(),
        this.fetchSummary(),
        this.fetchQuotaStatus()
      ]);
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 獲取今日使用量
   */
  async fetchTodayUsage(): Promise<UsageStats | null> {
    if (environment.apiMode === 'ipc') return null;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/usage/today`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      
      if (result.success) {
        this._todayUsage.set(result.data);
        return result.data;
      }
      
      return null;
    } catch (e) {
      console.error('Fetch today usage error:', e);
      return null;
    }
  }
  
  /**
   * 獲取使用量摘要
   */
  async fetchSummary(): Promise<UsageSummary | null> {
    if (environment.apiMode === 'ipc') return null;
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/usage`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      
      if (result.success) {
        this._summary.set(result.data);
        return result.data;
      }
      
      return null;
    } catch (e) {
      console.error('Fetch summary error:', e);
      return null;
    }
  }
  
  /**
   * 獲取配額狀態
   */
  async fetchQuotaStatus(): Promise<Record<string, QuotaStatus>> {
    if (environment.apiMode === 'ipc') return {};
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/quota`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      
      if (result.success) {
        this._quotaStatus.set(result.data);
        return result.data;
      }
      
      return {};
    } catch (e) {
      console.error('Fetch quota status error:', e);
      return {};
    }
  }
  
  /**
   * 獲取使用量歷史
   */
  async fetchHistory(days: number = 30): Promise<any[]> {
    if (environment.apiMode === 'ipc') return [];
    
    try {
      const response = await fetch(`${this.getApiBaseUrl()}/api/v1/usage/history?days=${days}`, {
        headers: this.authService.getAuthHeaders()
      });
      
      const result = await response.json();
      
      if (result.success) {
        this._history.set(result.data);
        return result.data;
      }
      
      return [];
    } catch (e) {
      console.error('Fetch history error:', e);
      return [];
    }
  }
  
  /**
   * 檢查配額是否允許操作
   */
  checkQuota(type: 'api_calls' | 'accounts'): boolean {
    if (environment.apiMode === 'ipc') return true;
    
    const status = this._quotaStatus();
    const quota = status[type];
    
    if (!quota) return true;
    return quota.allowed;
  }
  
  private getApiBaseUrl(): string {
    if (window.location.hostname === 'localhost' && window.location.port === '4200') {
      return 'http://localhost:8000';
    }
    return '';
  }
}
