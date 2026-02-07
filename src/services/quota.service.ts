/**
 * 配額服務
 * 
 * 提供前端配額檢查、顯示和告警功能
 */

import { Injectable, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

export interface QuotaInfo {
  allowed: boolean;
  quota_type: string;
  status: 'ok' | 'warning' | 'critical' | 'exceeded' | 'unlimited';
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
  percentage: number;
  reset_at: string | null;
  message: string;
  upgrade_suggestion: string;
  unlimited: boolean;
}

export interface QuotaSummary {
  user_id: string;
  tier: string;
  tier_name: string;
  quotas: Record<string, QuotaInfo>;
  alerts: Array<{
    type: string;
    quota_type: string;
    message: string;
    percentage: number;
  }>;
  has_warnings: boolean;
  has_exceeded: boolean;
}

export interface MembershipLevel {
  level: string;
  name: string;
  name_en: string;
  icon: string;
  color: string;
  order: number;
  quotas: Record<string, number>;
  prices: Record<string, number>;
  features: string[];
}

@Injectable({
  providedIn: 'root'
})
export class QuotaService {
  // 配額摘要
  private _quotaSummary = signal<QuotaSummary | null>(null);
  readonly quotaSummary = this._quotaSummary.asReadonly();
  
  // 會員等級列表
  private _levels = signal<MembershipLevel[]>([]);
  readonly levels = this._levels.asReadonly();
  
  // 配額告警
  private _alerts = signal<Array<{ id: number; quota_type: string; message: string; acknowledged: boolean }>>([]);
  readonly alerts = this._alerts.asReadonly();
  
  // 加載狀態
  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();
  
  // 計算屬性
  readonly currentTier = computed(() => this._quotaSummary()?.tier || 'bronze');
  readonly currentTierName = computed(() => this._quotaSummary()?.tier_name || '青銅戰士');
  readonly hasWarnings = computed(() => this._quotaSummary()?.has_warnings || false);
  readonly hasExceeded = computed(() => this._quotaSummary()?.has_exceeded || false);
  readonly unacknowledgedAlerts = computed(() => 
    this._alerts().filter(a => !a.acknowledged).length
  );
  
  // 配額顯示名稱
  private quotaDisplayNames: Record<string, string> = {
    tg_accounts: 'TG 帳號',
    daily_messages: '每日消息',
    ai_calls: 'AI 調用',
    devices: '設備數',
    groups: '群組數',
    keyword_sets: '關鍵詞集',
    auto_reply_rules: '自動回覆',
    scheduled_tasks: '定時任務',
  };

  // 🔧 P6-3: 配額推送防抖計時器
  private _refreshDebounce: ReturnType<typeof setTimeout> | null = null;
  
  constructor(private ipc: ElectronIpcService) {
    // 🔧 P6-3: 監聽後端配額變更推送（實時更新，500ms 防抖）
    this.ipc.on('quota-updated', (_event: any, _data: any) => {
      // 防抖：500ms 內多次變更只刷新一次
      if (this._refreshDebounce) {
        clearTimeout(this._refreshDebounce);
      }
      this._refreshDebounce = setTimeout(() => {
        this._refreshDebounce = null;
        this.loadQuotaSummary();
      }, 500);
    });
  }

  /**
   * 加載配額摘要
   */
  async loadQuotaSummary(): Promise<void> {
    this._loading.set(true);
    try {
      const response = await this.ipc.invoke('get-quota-status', {});
      if (response?.success && response?.data) {
        this._quotaSummary.set(response.data);
      }
    } catch (error) {
      console.error('Failed to load quota summary:', error);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * 檢查特定配額
   */
  async checkQuota(quotaType: string, amount: number = 1): Promise<QuotaInfo | null> {
    try {
      const response = await this.ipc.invoke('check-quota', { quota_type: quotaType, amount });
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to check quota:', error);
      return null;
    }
  }

  /**
   * 加載配額告警
   */
  async loadAlerts(): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-quota-alerts', {});
      if (response?.success && response?.data?.alerts) {
        this._alerts.set(response.data.alerts);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  /**
   * 確認告警
   */
  async acknowledgeAlert(alertId: number): Promise<boolean> {
    try {
      const response = await this.ipc.invoke('acknowledge-quota-alert', { alert_id: alertId });
      if (response?.success) {
        // 更新本地狀態
        this._alerts.update(alerts => 
          alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      return false;
    }
  }

  /**
   * 加載會員等級列表
   */
  async loadMembershipLevels(): Promise<void> {
    try {
      const response = await this.ipc.invoke('get-membership-levels', {});
      if (response?.success && response?.data?.levels) {
        this._levels.set(response.data.levels);
      }
    } catch (error) {
      console.error('Failed to load membership levels:', error);
    }
  }

  /**
   * 獲取配額信息
   */
  getQuotaInfo(quotaType: string): QuotaInfo | null {
    const summary = this._quotaSummary();
    return summary?.quotas?.[quotaType] || null;
  }

  /**
   * 獲取配額顯示名稱
   */
  getQuotaDisplayName(quotaType: string): string {
    return this.quotaDisplayNames[quotaType] || quotaType;
  }

  /**
   * 格式化配額值
   */
  formatQuotaValue(value: number): string {
    if (value === -1) return '∞';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  }

  /**
   * 獲取狀態顏色
   */
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ok: '#22c55e',
      warning: '#f59e0b',
      critical: '#ef4444',
      exceeded: '#dc2626',
      unlimited: '#8b5cf6',
    };
    return colors[status] || '#666';
  }

  /**
   * 獲取狀態圖標
   */
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      ok: '✓',
      warning: '⚠️',
      critical: '⚡',
      exceeded: '🚫',
      unlimited: '∞',
    };
    return icons[status] || '';
  }

  /**
   * 獲取升級選項
   */
  getUpgradeOptions(): MembershipLevel[] {
    const currentTier = this.currentTier();
    const levels = this._levels();
    
    const currentOrder = levels.find(l => l.level === currentTier)?.order ?? 0;
    return levels.filter(l => l.order > currentOrder);
  }

  /**
   * 是否可以執行操作（基於配額）
   */
  canPerformAction(quotaType: string, amount: number = 1): boolean {
    const info = this.getQuotaInfo(quotaType);
    if (!info) return true; // 無法獲取信息時允許
    if (info.unlimited) return true;
    return info.remaining >= amount;
  }

  /**
   * 刷新所有配額數據
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.loadQuotaSummary(),
      this.loadAlerts(),
    ]);
  }

  /**
   * 獲取配額使用趨勢數據
   */
  async loadTrendData(period: '7d' | '30d' | '90d' = '7d', types: string[] = ['daily_messages', 'ai_calls']): Promise<{
    labels: string[];
    datasets: { name: string; data: number[]; color: string }[];
  } | null> {
    try {
      const response = await this.ipc.invoke('get-quota-trend', {
        period,
        types: types.join(',')
      });
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load trend data:', error);
      return null;
    }
  }

  /**
   * 獲取配額使用歷史
   */
  async loadHistory(limit: number = 50, offset: number = 0, type?: string): Promise<{
    history: Array<{
      date: string;
      quota_type: string;
      quota_name: string;
      used: number;
      limit: number;
      percentage: number;
      change: number;
    }>;
    has_more: boolean;
  } | null> {
    try {
      const params: any = { limit, offset };
      if (type) params.type = type;
      
      const response = await this.ipc.invoke('get-quota-history', params);
      if (response?.success && response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to load history:', error);
      return null;
    }
  }
}
