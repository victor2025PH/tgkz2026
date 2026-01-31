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
      }
    ]
  }
];
