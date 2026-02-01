/**
 * TG-AI智控王 路由 Resolver
 * Route Resolvers - 預加載路由數據
 * 
 * 🆕 Phase 22: 實現數據預加載
 */

import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ElectronIpcService } from '../electron-ipc.service';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

// ============ 類型定義 ============

export interface DashboardData {
  accounts: any[];
  systemStatus: any;
  recentActivity: any[];
}

export interface AccountsData {
  accounts: any[];
  stats: any;
}

export interface LeadsData {
  leads: any[];
  stats: any;
}

export interface MonitoringData {
  groups: any[];
  keywordSets: any[];
  triggerRules: any[];
}

export interface AnalyticsData {
  metrics: any;
  charts: any[];
}

// ============ 通用 IPC 請求函數 ============

async function ipcRequest<T>(
  ipc: ElectronIpcService, 
  channel: string, 
  data?: any,
  timeoutMs = 5000
): Promise<T | null> {
  return new Promise((resolve) => {
    const resultChannel = `${channel}-result`;
    
    const timer = setTimeout(() => {
      resolve(null);
    }, timeoutMs);
    
    ipc.once(resultChannel, (result: T) => {
      clearTimeout(timer);
      resolve(result);
    });
    
    ipc.send(channel, data);
  });
}

// ============ Resolver 實現 ============

/**
 * 儀表板數據 Resolver
 * 預加載帳號列表和系統狀態
 */
export const dashboardResolver: ResolveFn<DashboardData | null> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    // 並行加載多個數據源
    const [accounts, systemStatus] = await Promise.all([
      ipcRequest<any[]>(ipc, 'get-accounts'),
      ipcRequest<any>(ipc, 'get-system-status')
    ]);
    
    return {
      accounts: accounts || [],
      systemStatus: systemStatus || {},
      recentActivity: []
    };
  } catch (error) {
    console.error('[Resolver] Dashboard data load failed:', error);
    return null;
  }
};

/**
 * 帳號管理數據 Resolver
 */
export const accountsResolver: ResolveFn<AccountsData | null> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const accounts = await ipcRequest<any[]>(ipc, 'get-accounts');
    
    // 計算統計
    const stats = {
      total: accounts?.length || 0,
      online: accounts?.filter((a: any) => a.status === 'Online').length || 0,
      offline: accounts?.filter((a: any) => a.status === 'Offline').length || 0
    };
    
    return { accounts: accounts || [], stats };
  } catch (error) {
    console.error('[Resolver] Accounts data load failed:', error);
    return null;
  }
};

/**
 * 潛在客戶數據 Resolver
 */
export const leadsResolver: ResolveFn<LeadsData | null> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const [leads, stats] = await Promise.all([
      ipcRequest<any[]>(ipc, 'get-leads', { limit: 100 }),
      ipcRequest<any>(ipc, 'get-lead-stats')
    ]);
    
    return {
      leads: leads || [],
      stats: stats || { total: 0, new: 0, contacted: 0, converted: 0 }
    };
  } catch (error) {
    console.error('[Resolver] Leads data load failed:', error);
    return null;
  }
};

/**
 * 監控中心數據 Resolver
 */
export const monitoringResolver: ResolveFn<MonitoringData | null> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const [groups, keywordSets, triggerRules] = await Promise.all([
      ipcRequest<any[]>(ipc, 'get-monitored-groups'),
      ipcRequest<any[]>(ipc, 'get-keyword-sets'),
      ipcRequest<any[]>(ipc, 'get-trigger-rules')
    ]);
    
    return {
      groups: groups || [],
      keywordSets: keywordSets || [],
      triggerRules: triggerRules || []
    };
  } catch (error) {
    console.error('[Resolver] Monitoring data load failed:', error);
    return null;
  }
};

/**
 * 數據分析 Resolver
 */
export const analyticsResolver: ResolveFn<AnalyticsData | null> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const metrics = await ipcRequest<any>(ipc, 'get-analytics-metrics');
    
    return {
      metrics: metrics || {},
      charts: []
    };
  } catch (error) {
    console.error('[Resolver] Analytics data load failed:', error);
    return null;
  }
};

/**
 * 自動化中心數據 Resolver
 */
export const automationResolver: ResolveFn<any> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const [campaigns, templates] = await Promise.all([
      ipcRequest<any[]>(ipc, 'get-campaigns'),
      ipcRequest<any[]>(ipc, 'get-templates')
    ]);
    
    return {
      campaigns: campaigns || [],
      templates: templates || []
    };
  } catch (error) {
    console.error('[Resolver] Automation data load failed:', error);
    return null;
  }
};

/**
 * 資源發現數據 Resolver
 */
export const resourceDiscoveryResolver: ResolveFn<any> = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const ipc = inject(ElectronIpcService);
  
  try {
    const resources = await ipcRequest<any[]>(ipc, 'get-discovered-resources');
    
    return {
      resources: resources || [],
      categories: []
    };
  } catch (error) {
    console.error('[Resolver] Resource discovery data load failed:', error);
    return null;
  }
};
