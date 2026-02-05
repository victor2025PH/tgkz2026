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
      {
        path: 'logs',
        loadComponent: () => import('./audit-logs.component')
          .then(m => m.AuditLogsComponent),
        title: '審計日誌'
      },
      // 🆕 API 池管理
      {
        path: 'api-pool',
        loadComponent: () => import('./api-pool-manager.component')
          .then(m => m.ApiPoolManagerComponent),
        title: 'API 池管理'
      },
      // 🆕 API 统计仪表板
      {
        path: 'api-stats',
        loadComponent: () => import('./api-stats-dashboard.component')
          .then(m => m.ApiStatsDashboardComponent),
        title: 'API 统计'
      },
      // 🆕 系统告警
      {
        path: 'alerts',
        loadComponent: () => import('./system-alerts.component')
          .then(m => m.SystemAlertsComponent),
        title: '系统告警'
      },
      // 🆕 审计日志（增强版）
      {
        path: 'audit-logs',
        loadComponent: () => import('./audit-logs.component')
          .then(m => m.AuditLogsComponent),
        title: '审计日志'
      },
      // 🆕 容量规划
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
