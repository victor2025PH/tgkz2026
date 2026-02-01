/**
 * 認證路由配置
 */

import { Routes } from '@angular/router';
import { guestGuard } from '../core/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        loadComponent: () => import('./login.component').then(m => m.LoginComponent),
        canActivate: [guestGuard],
        title: 'Login - TG-Matrix'
      },
      {
        path: 'register',
        loadComponent: () => import('./register.component').then(m => m.RegisterComponent),
        canActivate: [guestGuard],
        title: 'Register - TG-Matrix'
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./forgot-password.component').then(m => m.ForgotPasswordComponent),
        canActivate: [guestGuard],
        title: 'Forgot Password - TG-Matrix'
      },
      {
        path: 'verify-email',
        loadComponent: () => import('./verify-email.component').then(m => m.VerifyEmailComponent),
        title: 'Verify Email - TG-Matrix'
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./reset-password.component').then(m => m.ResetPasswordComponent),
        canActivate: [guestGuard],
        title: 'Reset Password - TG-Matrix'
      }
    ]
  }
];
