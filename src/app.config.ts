/**
 * TG-AI智控王 Application Configuration
 * 應用程式配置 - Angular 17+ Standalone
 * 
 * 🆕 Phase 20: Angular Router 配置
 * 🆕 Phase 25: 添加智能預加載策略
 */

import { ApplicationConfig, ErrorHandler, importProvidersFrom, isDevMode } from '@angular/core';
import { provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { offlineInterceptor } from './core/offline.interceptor';
import { GlobalErrorHandler } from './services/error-handler.service';
import { SmartPreloadingStrategy } from './preloading-strategy';

/**
 * 應用程式配置
 * 用於 bootstrapApplication
 * 
 * 🔧 P6-2: 啟用智能預加載策略（替代 withDebugTracing 減少生產環境日誌噪音）
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // 🔧 P6-2: 路由配置 + 智能預加載策略
    provideRouter(routes, withPreloading(SmartPreloadingStrategy)),
    
    // 🆕 HTTP 客戶端 + 認證攔截器 + 🔧 P8-1 離線攔截器
    provideHttpClient(withInterceptors([authInterceptor, offlineInterceptor])),
    
    // 動畫支持
    importProvidersFrom(BrowserAnimationsModule),
    
    // 🔧 P5-2: 全局錯誤處理器 — 攔截未捕獲的錯誤並上報到後端
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ]
};

/**
 * 視圖配置類型
 * 用於定義每個視圖的元數據
 */
export interface ViewMetadata {
  path: string;
  title: string;
  icon: string;
  category: 'core' | 'marketing' | 'ai' | 'system';
  requiredFeature?: string;
  membershipLevel?: 'free' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'star' | 'king';
}

/**
 * 視圖元數據映射
 */
export const VIEW_METADATA: Record<string, ViewMetadata> = {
  'dashboard': {
    path: '/dashboard',
    title: '儀表板',
    icon: '🏠',
    category: 'core'
  },
  'accounts': {
    path: '/accounts',
    title: '帳號管理',
    icon: '👥',
    category: 'core'
  },
  'automation': {
    path: '/automation',
    title: '自動化中心',
    icon: '⚙️',
    category: 'marketing'
  },
  'leads': {
    path: '/leads',
    title: '潛在客戶',
    icon: '🎯',
    category: 'marketing'
  },
  'ai-center': {
    path: '/ai-center',
    title: 'AI 中心',
    icon: '🧠',
    category: 'ai'
  },
  'multi-role': {
    path: '/multi-role',
    title: '多角色協作',
    icon: '🎭',
    category: 'ai',
    requiredFeature: 'multiRole',
    membershipLevel: 'diamond'
  },
  'analytics': {
    path: '/analytics',
    title: '數據分析',
    icon: '📊',
    category: 'system',
    requiredFeature: 'dataInsightsBasic',
    membershipLevel: 'gold'
  },
  'resource-discovery': {
    path: '/resource-discovery',
    title: '資源發現',
    icon: '🔍',
    category: 'marketing'
  },
  'monitoring': {
    path: '/monitoring',
    title: '監控中心',
    icon: '👁️',
    category: 'system'
  },
  'settings': {
    path: '/settings',
    title: '設定',
    icon: '⚙️',
    category: 'system'
  }
};

/**
 * 導航菜單分類
 */
export const NAV_CATEGORIES = [
  { id: 'core', name: '核心功能', icon: '🏠' },
  { id: 'marketing', name: '營銷自動化', icon: '📢' },
  { id: 'ai', name: 'AI 智能', icon: '🤖' },
  { id: 'system', name: '系統監控', icon: '⚙️' }
];
