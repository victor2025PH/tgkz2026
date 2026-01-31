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

// ==================== 服務實現 ====================

@Injectable({ providedIn: 'root' })
export class AdminService {
  private apiUrl = environment.apiBaseUrl || '';
  
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
}
