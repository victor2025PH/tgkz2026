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
      // ⚠️ 以下 4 個路由暫時停用，本輪掛載 ADMIN_ROUTES 時用真實 `ng build`
      // 驗證發現它們有實際的 TypeScript 編譯錯誤（並非本次改動引入，是這批
      // 組件從未被編譯過所以錯誤一直沒被發現）：
      // - api-stats-dashboard.component.ts / audit-logs.component.ts /
      //   capacity-chart.component.ts / system-alerts.component.ts
      //   四者都透過 `inject(ElectronIpcService).send(...)` 取資料，這是
      //   Electron-only 的 IPC 呼叫模式，在 SaaS/瀏覽器模式下沒有對應實作
      //   （回傳型別解析成 void/never），且呼叫了 ToastService 已改為 private
      //   的 show() 方法、簽名也對不上（該用 success()/error() 等公開方法）。
      // 這不是單純的路由缺口，需要把這 4 個組件的資料獲取邏輯改成跟同目錄
      // admin-dashboard/security-center/user-management 一致的
      // AdminService（HTTP /api/v1/admin/* 或 /api/v1/security/*）呼叫模式，
      // 屬於下一階段的獨立任務，不在本次「掛路由」範圍內。
      //
      // {
      //   path: 'api-stats',
      //   loadComponent: () => import('./api-stats-dashboard.component')
      //     .then(m => m.ApiStatsDashboardComponent),
      //   title: 'API 统计'
      // },
      // {
      //   path: 'alerts',
      //   loadComponent: () => import('./system-alerts.component')
      //     .then(m => m.SystemAlertsComponent),
      //   title: '系统告警'
      // },
      // {
      //   path: 'audit-logs',
      //   loadComponent: () => import('./audit-logs.component')
      //     .then(m => m.AuditLogsComponent),
      //   title: '审计日志'
      // },
      // {
      //   path: 'capacity',
      //   loadComponent: () => import('./capacity-chart.component')
      //     .then(m => m.CapacityChartComponent),
      //   title: '容量规划'
      // },
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
