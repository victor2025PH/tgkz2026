/**
 * TG-AI智控王 Application Configuration
 * 應用程式配置 - Angular 17+ Standalone
 * 
 * 🆕 Phase 20: Angular Router 配置
 * 🆕 Phase 25: 添加智能預加載策略
 */

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { routes } from './app.routes';

/**
 * 應用程式配置
 * 用於 bootstrapApplication
 */
export const appConfig: ApplicationConfig = {
  providers: [
    // 路由配置 - 簡化版
    provideRouter(routes),
    
    // 動畫支持
    importProvidersFrom(BrowserAnimationsModule),
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
