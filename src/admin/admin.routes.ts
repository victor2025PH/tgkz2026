/**
 * 管理員路由配置
 */

import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin-dashboard.component')
          .then(m => m.AdminDashboardComponent),
        title: '管理員儀表板'
      },
      {
        path: 'security',
        loadComponent: () => import('./security-center.component')
          .then(m => m.SecurityCenterComponent),
        title: '安全中心'
      },
      {
        path: 'users',
        loadComponent: () => import('./user-management.component')
          .then(m => m.UserManagementComponent),
        title: '用戶管理'
      },
      // ⚠️ 'logs' 路由原指向 audit-logs.component.ts，與下方 'audit-logs' 是
      // 同一個組件的重複路由；且該組件目前有真實的 TypeScript 編譯錯誤
      // （見下方說明），本次掛載路由時一併停用，避免掛出一個編譯不過的頁面。
      // 🆕 API 池管理
      {
        path: 'api-pool',
        loadComponent: () => import('./api-pool-manager.component')
          .then(m => m.ApiPoolManagerComponent),
        title: 'API 池管理'
      },
      // ✅ 以下 4 個路由已重新啟用（原先因 inject(ElectronIpcService).send(...)
      // 這種 Electron-only IPC 呼叫模式在 SaaS/瀏覽器模式下編譯不過而被停用）。
      // 本輪已將資料獲取邏輯改為 AdminService（HTTP）呼叫模式：
      // - system-alerts：改接 AdminService.getSystemAlerts/resolveSystemAlert/
      //   clearAllSystemAlerts（POST /api/command 的 alerts:get/resolve/clear，
      //   後端真實可用，讀寫 system_alerts 表）。
      // - audit-logs：改接 AdminService.getOperationAuditLogs（GET
      //   /api/v1/admin/audit/logs，後端真實可用，但欄位只有
      //   {id, action, category, user_id, details, timestamp}；異常偵測後端
      //   無對應 API，UI 已改為「功能開發中」提示，見組件內註釋）。
      // - api-stats / capacity：對應的後端命令 api-stats:command /
      //   capacity:status / capacity:history 在後端從未被註冊實現（純前端遺留
      //   呼叫），確認後端目前完全沒有可用端點，故 UI 改為「功能開發中」
      //   優雅降級提示（不影響編譯，也不會呼叫任何不存在的 API）。
      {
        path: 'api-stats',
        loadComponent: () => import('./api-stats-dashboard.component')
          .then(m => m.ApiStatsDashboardComponent),
        title: 'API 统计'
      },
      {
        path: 'alerts',
        loadComponent: () => import('./system-alerts.component')
          .then(m => m.SystemAlertsComponent),
        title: '系统告警'
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./audit-logs.component')
          .then(m => m.AuditLogsComponent),
        title: '审计日志'
      },
      {
        path: 'capacity',
        loadComponent: () => import('./capacity-chart.component')
          .then(m => m.CapacityChartComponent),
        title: '容量规划'
      },
      // 🆕 运维中心
      {
        path: 'ops',
        loadComponent: () => import('./ops-dashboard.component')
          .then(m => m.OpsDashboardComponent),
        title: '运维中心'
      },
      // 🆕 智能运维
      {
        path: 'smart-ops',
        loadComponent: () => import('./smart-ops.component')
          .then(m => m.SmartOpsComponent),
        title: '智能运维'
      }
    ]
  }
];
