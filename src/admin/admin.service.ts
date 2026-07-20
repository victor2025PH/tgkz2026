/**
 * 管理員服務
 * 
 * 優化設計：
 * 1. 完整的管理功能
 * 2. 響應式狀態管理
 * 3. 緩存和刷新策略
 */

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

// ==================== 類型定義 ====================

export interface DashboardStats {
  total_users: number;
  active_users: number;
  new_users_today: number;
  users_by_tier: Record<string, number>;
  total_accounts: number;
  online_accounts: number;
  revenue_today: number;
  revenue_month: number;
  api_calls_today: number;
}

export interface UserListItem {
  user_id: string;
  email: string;
  username: string;
  status: string;
  subscription_tier: string;
  created_at: string;
  last_login?: string;
}

export interface UserDetail extends UserListItem {
  role: string;
  max_accounts: number;
  max_api_calls: number;
  accounts_count: number;
  subscription?: {
    status: string;
    current_period_end: string;
  };
  recent_logins: Array<{
    ip_address: string;
    user_agent: string;
    created_at: string;
  }>;
}

export interface SecurityOverview {
  unresolved_alerts: number;
  alerts_by_severity: Record<string, number>;
  locked_accounts: number;
  failed_logins_today: number;
  active_ip_rules: number;
}

export interface SecurityAlert {
  id: string;
  user_id: string;
  alert_type: string;
  message: string;
  severity: string;
  ip_address: string;
  resolved: boolean;
  created_at: string;
}

export interface UsageTrend {
  date: string;
  api_calls: number;
  messages: number;
  active_users: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_user: string;
  reason: string;
  created_at: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/**
 * 🆕 操作審計日誌（對應 backend/core/audit_service.py）
 * 注意：與 AuditLog（管理員操作日誌，/api/v1/admin/audit-logs）是不同的數據源，
 * 這裡對接的是 /api/v1/admin/audit/logs，記錄 API 池/帳號/告警/系統等操作事件。
 * 後端目前只回傳 {id, action, category, user_id, details, timestamp} 這幾個欄位。
 */
export interface OperationAuditLog {
  id: string;
  action: string;
  category: string;
  user_id: string;
  details: string;
  timestamp: number;
}

// ==================== 服務實現 ====================

function getAdminApiBase(): string {
  try {
    const v = localStorage.getItem('api_server');
    if (v) {
      const u = v.replace(/\/+$/, '');
      return u.startsWith('http') ? u : `https://${u}`;
    }
  } catch {}
  return environment.apiBaseUrl || '';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private get apiUrl(): string {
    return getAdminApiBase();
  }
  
  // 狀態
  private _dashboardStats = signal<DashboardStats | null>(null);
  private _securityOverview = signal<SecurityOverview | null>(null);
  private _usageTrends = signal<UsageTrend[]>([]);
  private _isLoading = signal(false);
  private _lastRefresh = signal<Date | null>(null);
  
  // 計算屬性
  readonly dashboardStats = this._dashboardStats.asReadonly();
  readonly securityOverview = this._securityOverview.asReadonly();
  readonly usageTrends = this._usageTrends.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly lastRefresh = this._lastRefresh.asReadonly();
  
  // 派生狀態
  readonly hasAlerts = computed(() => {
    const overview = this._securityOverview();
    return overview ? overview.unresolved_alerts > 0 : false;
  });
  
  readonly criticalAlerts = computed(() => {
    const overview = this._securityOverview();
    return overview?.alerts_by_severity?.['critical'] || 0;
  });
  
  constructor(private http: HttpClient) {}
  
  // ==================== 儀表板 ====================
  
  async refreshDashboard(): Promise<void> {
    this._isLoading.set(true);
    try {
      const [stats, security, trends] = await Promise.all([
        this.fetchDashboardStats(),
        this.fetchSecurityOverview(),
        this.fetchUsageTrends(30)
      ]);
      
      this._dashboardStats.set(stats);
      this._securityOverview.set(security);
      this._usageTrends.set(trends);
      this._lastRefresh.set(new Date());
    } finally {
      this._isLoading.set(false);
    }
  }
  
  private async fetchDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/dashboard`
      ).toPromise();
      return res?.data || this.defaultStats();
    } catch (e) {
      console.error('Fetch dashboard stats error:', e);
      return this.defaultStats();
    }
  }
  
  private defaultStats(): DashboardStats {
    return {
      total_users: 0,
      active_users: 0,
      new_users_today: 0,
      users_by_tier: {},
      total_accounts: 0,
      online_accounts: 0,
      revenue_today: 0,
      revenue_month: 0,
      api_calls_today: 0
    };
  }
  
  // ==================== 用戶管理 ====================
  
  async getUsers(
    page: number = 1,
    pageSize: number = 20,
    filters?: { search?: string; status?: string; tier?: string }
  ): Promise<PaginatedResult<UserListItem>> {
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize)
      });
      
      if (filters?.search) params.set('search', filters.search);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.tier) params.set('tier', filters.tier);
      
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/users?${params}`
      ).toPromise();
      
      const data = res?.data || {};
      return {
        items: data.users || [],
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || pageSize,
        total_pages: data.total_pages || 1
      };
    } catch (e) {
      console.error('Get users error:', e);
      return { items: [], total: 0, page, page_size: pageSize, total_pages: 1 };
    }
  }
  
  async getUserDetail(userId: string): Promise<UserDetail | null> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/users/${userId}`
      ).toPromise();
      return res?.data || null;
    } catch (e) {
      console.error('Get user detail error:', e);
      return null;
    }
  }
  
  async updateUser(userId: string, data: Partial<UserDetail>): Promise<boolean> {
    try {
      const res = await this.http.put<any>(
        `${this.apiUrl}/api/v1/admin/users/${userId}`,
        data
      ).toPromise();
      return res?.success || false;
    } catch (e) {
      console.error('Update user error:', e);
      return false;
    }
  }
  
  async suspendUser(userId: string, reason: string): Promise<boolean> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/users/${userId}/suspend`,
        { reason }
      ).toPromise();
      return res?.success || false;
    } catch (e) {
      console.error('Suspend user error:', e);
      return false;
    }
  }
  
  // ==================== 安全管理 ====================
  
  async fetchSecurityOverview(): Promise<SecurityOverview> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/security`
      ).toPromise();
      return res?.data || this.defaultSecurityOverview();
    } catch (e) {
      console.error('Fetch security overview error:', e);
      return this.defaultSecurityOverview();
    }
  }
  
  private defaultSecurityOverview(): SecurityOverview {
    return {
      unresolved_alerts: 0,
      alerts_by_severity: {},
      locked_accounts: 0,
      failed_logins_today: 0,
      active_ip_rules: 0
    };
  }
  
  async getSecurityAlerts(
    page: number = 1,
    resolved?: boolean
  ): Promise<PaginatedResult<SecurityAlert>> {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (resolved !== undefined) {
        params.set('resolved', String(resolved));
      }
      
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/security/alerts?${params}`
      ).toPromise();
      
      const data = res?.data || {};
      return {
        items: data.alerts || [],
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || 20,
        total_pages: Math.ceil((data.total || 0) / 20)
      };
    } catch (e) {
      console.error('Get security alerts error:', e);
      return { items: [], total: 0, page, page_size: 20, total_pages: 1 };
    }
  }
  
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/security/alerts/${alertId}/resolve`,
        {}
      ).toPromise();
      return res?.success || false;
    } catch (e) {
      console.error('Resolve alert error:', e);
      return false;
    }
  }
  
  // ==================== 使用趨勢 ====================
  
  async fetchUsageTrends(days: number = 30): Promise<UsageTrend[]> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/usage-trends?days=${days}`
      ).toPromise();
      return res?.data || [];
    } catch (e) {
      console.error('Fetch usage trends error:', e);
      return [];
    }
  }
  
  // ==================== 審計日誌 ====================
  
  async getAuditLogs(
    page: number = 1,
    action?: string
  ): Promise<PaginatedResult<AuditLog>> {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (action) params.set('action', action);
      
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/audit-logs?${params}`
      ).toPromise();
      
      const data = res?.data || {};
      return {
        items: data.logs || [],
        total: data.total || 0,
        page: data.page || page,
        page_size: data.page_size || 50,
        total_pages: Math.ceil((data.total || 0) / 50)
      };
    } catch (e) {
      console.error('Get audit logs error:', e);
      return { items: [], total: 0, page, page_size: 50, total_pages: 1 };
    }
  }

  /**
   * 🆕 操作審計日誌（core.audit_service，/api/v1/admin/audit/logs）
   * ⚠️ 已知後端限制：
   * 1. 該端點的 action / category 篩選參數目前未被後端實際套用（傳了也不會過濾）
   * 2. start_time / end_time 若傳入會因後端型別比較錯誤觸發 500，因此這裡刻意不傳
   * 3. /api/v1/admin/audit/stats 目前後端缺少 get_stats() 實作，會直接報錯，因此不呼叫
   * 故僅使用真正可用的 limit / offset，其餘篩選改由前端在拿到資料後自行處理。
   */
  async getOperationAuditLogs(limit: number = 100, offset: number = 0): Promise<{ success: boolean; data: OperationAuditLog[]; error?: string }> {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/audit/logs?${params}`
      ).toPromise();
      return { success: res?.success !== false, data: res?.data || [], error: res?.error };
    } catch (e) {
      console.error('Get operation audit logs error:', e);
      return { success: false, data: [], error: String(e) };
    }
  }

  // ==================== 系統告警（真實命令通道）====================
  // 🔧 說明：後端尚未提供 /api/v1/admin/alerts 這類 RESTful 端點，
  // 但通用命令通道 POST /api/command 已註冊 alerts:get / alerts:resolve / alerts:clear
  // （見 backend/main.py COMMAND_ALIAS_REGISTRY → api/handlers/analytics_handlers_impl.py），
  // 直接讀寫 system_alerts 表，是目前唯一真實可用的系統告警數據源。

  async getSystemAlerts(): Promise<any> {
    return this.sendCommand('alerts:get', {});
  }

  async resolveSystemAlert(alertId: string): Promise<any> {
    return this.sendCommand('alerts:resolve', { id: alertId });
  }

  async clearAllSystemAlerts(): Promise<any> {
    return this.sendCommand('alerts:clear', {});
  }

  /**
   * 通用命令通道 — 對應後端 POST /api/command（{command, payload} → backend_service.handle_command）
   */
  private async sendCommand(command: string, payload: any): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/command`,
        { command, payload }
      ).toPromise();
      return res;
    } catch (e) {
      console.error(`Command '${command}' error:`, e);
      return { success: false, error: String(e) };
    }
  }

  // ==================== 緩存統計 ====================
  
  async getCacheStats(): Promise<any> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/cache-stats`
      ).toPromise();
      return res?.data || {};
    } catch (e) {
      console.error('Get cache stats error:', e);
      return {};
    }
  }
  
  // ==================== 配額監控 ====================
  
  async getQuotaOverview(): Promise<any> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/quota/overview`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Get quota overview error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async getQuotaRankings(
    quotaType: string = 'daily_messages',
    period: string = 'today',
    limit: number = 20
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        type: quotaType,
        period,
        limit: String(limit)
      });
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/quota/rankings?${params}`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Get quota rankings error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async getQuotaAlerts(alertType?: string, page: number = 1): Promise<any> {
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (alertType) params.set('alert_type', alertType);
      
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/quota/alerts?${params}`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Get quota alerts error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async adjustUserQuota(
    userId: string,
    quotaType: string,
    newValue: number,
    reason?: string
  ): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/quota/adjust`,
        { user_id: userId, quota_type: quotaType, new_value: newValue, reason }
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Adjust user quota error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async batchAdjustQuotas(
    userIds: string[],
    quotaType: string,
    newValue: number,
    reason?: string
  ): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/quota/batch-adjust`,
        { user_ids: userIds, quota_type: quotaType, new_value: newValue, reason }
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Batch adjust quotas error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async exportQuotaReport(
    startDate?: string,
    endDate?: string,
    quotaTypes?: string[]
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('start_date', startDate);
      if (endDate) params.set('end_date', endDate);
      if (quotaTypes?.length) params.set('types', quotaTypes.join(','));
      
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/quota/export?${params}`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Export quota report error:', e);
      return { success: false, error: String(e) };
    }
  }
  
  async resetDailyQuotas(): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/quota/reset-daily`,
        {}
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Reset daily quotas error:', e);
      return { success: false, error: String(e) };
    }
  }

  // ==================== 計費管理 ====================

  async getBillingOverview(): Promise<any> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/billing/overview`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Get billing overview error:', e);
      return { success: false, error: String(e) };
    }
  }

  async getAllBills(
    page: number = 1,
    pageSize: number = 20,
    status?: string,
    type?: string,
    userId?: string
  ): Promise<any> {
    try {
      let url = `${this.apiUrl}/api/v1/admin/billing/bills?page=${page}&page_size=${pageSize}`;
      if (status) url += `&status=${status}`;
      if (type) url += `&type=${type}`;
      if (userId) url += `&user_id=${userId}`;
      
      const res = await this.http.get<any>(url).toPromise();
      return res;
    } catch (e) {
      console.error('Get all bills error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** GET /api/v1/admin/purchase-orders — 購買訂單對賬（JWT admin） */
  async getPurchaseOrders(
    status: string = '',
    limit: number = 50,
    offset: number = 0
  ): Promise<{ success: boolean; data?: any[]; total?: number; error?: string }> {
    try {
      let url = `${this.apiUrl}/api/v1/admin/purchase-orders?limit=${limit}&offset=${offset}`;
      if (status) url += `&status=${status}`;
      const res = await this.http.get<any>(url).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get purchase orders error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** POST /api/v1/admin/purchase-orders/{orderId}/refund — 客服退款（JWT admin） */
  async refundPurchaseOrder(orderId: string, reason: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/purchase-orders/${orderId}/refund`,
        { reason }
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Refund purchase order error:', e);
      return { success: false, error: String(e) };
    }
  }

  async processRefund(billId: string, refundAmount: number, reason: string): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/billing/refund`,
        { bill_id: billId, refund_amount: refundAmount, reason }
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Process refund error:', e);
      return { success: false, error: String(e) };
    }
  }

  async freezeUserQuota(userId: string, reason: string, durationHours: number = 24): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/billing/freeze`,
        { user_id: userId, reason, duration_hours: durationHours }
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Freeze user quota error:', e);
      return { success: false, error: String(e) };
    }
  }

  async unfreezeUserQuota(userId: string): Promise<any> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/billing/unfreeze`,
        { user_id: userId }
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Unfreeze user quota error:', e);
      return { success: false, error: String(e) };
    }
  }

  async getFrozenUsers(): Promise<any> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/billing/frozen-users`
      ).toPromise();
      return res;
    } catch (e) {
      console.error('Get frozen users error:', e);
      return { success: false, error: String(e) };
    }
  }

  // ==================== API 統計儀表板 ====================

  /** GET /api/v1/admin/api-stats/dashboard */
  async getApiStatsDashboard(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/api-stats/dashboard`
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get API stats dashboard error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** POST /api/v1/admin/api-stats/clear-alerts */
  async clearApiStatsAlerts(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await this.http.post<any>(
        `${this.apiUrl}/api/v1/admin/api-stats/clear-alerts`,
        {}
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Clear API stats alerts error:', e);
      return { success: false, error: String(e) };
    }
  }

  // ==================== 容量規劃 ====================

  /** GET /api/v1/admin/capacity/status — 前端 CapacityStatus 形狀 */
  async getCapacityStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/capacity/status`
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get capacity status error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** GET /api/v1/admin/capacity/history?hours=24 */
  async getCapacityHistory(hours: number = 24): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/capacity/history?hours=${hours}`
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get capacity history error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** GET /api/v1/admin/api-pool/alerts */
  async getApiPoolAlerts(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/api-pool/alerts`
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get API pool alerts error:', e);
      return { success: false, error: String(e) };
    }
  }

  /** GET /api/v1/admin/api-pool/forecast?days=7 */
  async getApiPoolForecast(days: number = 7): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await this.http.get<any>(
        `${this.apiUrl}/api/v1/admin/api-pool/forecast?days=${days}`
      ).toPromise();
      return res || { success: false, error: '空回應' };
    } catch (e) {
      console.error('Get API pool forecast error:', e);
      return { success: false, error: String(e) };
    }
  }
}
