/**
 * Lean Acquisition Shell Component
 * 精簡獲客模式 - 輕量導航外殼
 *
 * 🆕 Stage 2C: 為「精簡獲客模式」提供一個獨立、輕量的導航外殼
 * - 僅承載 6 個核心獲客功能的導航（儀表板/帳號管理/搜索發現/監控中心/潛在客戶/設定）
 * - 不重複實現任何業務邏輯，純導航 + 佈局容器（<router-outlet> 承載子路由）
 * - 樣式複用全局 CSS 變量（定義於 index.html 的 :root），保持與主應用一致的視覺風格
 */
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { OnboardingOverlayComponent } from '../components/onboarding-overlay.component';

@Component({
  selector: 'app-lean-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, OnboardingOverlayComponent],
  template: `
    <div class="flex h-screen" style="background-color: var(--bg-primary); color: var(--text-primary);">
      <!-- 精簡側邊導航：僅 6 個核心獲客入口 -->
      <aside class="flex-shrink-0 flex flex-col h-screen w-60 backdrop-blur-sm"
             style="background-color: var(--bg-sidebar); border-right: 1px solid var(--border-default);">

        <!-- Logo + 精簡獲客模式徽章 -->
        <div class="flex items-center gap-3 p-4" style="border-bottom: 1px solid var(--border-default);">
          <div class="relative flex-shrink-0">
            <div class="absolute inset-0 rounded-xl blur-md opacity-50"
                 style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);"></div>
            <svg class="h-9 w-9 relative z-10" viewBox="0 0 64 64" fill="none">
              <path d="M32 8L52 20V44L32 56L12 44V20L32 8Z" fill="url(#leanShellLogoGrad)"/>
              <path d="M22 28L40 22L34 36L28 32L22 28Z" fill="white" opacity="0.95"/>
              <defs>
                <linearGradient id="leanShellLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0891b2"/>
                  <stop offset="100%" stop-color="#7c3aed"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <h1 class="text-base font-bold truncate" style="color: var(--text-primary);">TG-AI智控王</h1>
            <span class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                  style="background: rgba(6, 182, 212, 0.15); color: var(--sidebar-text-active);">
              ⚡ 精簡獲客模式
            </span>
          </div>
        </div>

        <!-- 用戶資訊（若可取得登入用戶資料，僅作展示，取不到則跳過） -->
        @if (currentUser()) {
          <div class="flex items-center gap-3 mx-3 mt-3 p-2.5 rounded-xl" style="background-color: var(--bg-hover);">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                 style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);">
              {{ userInitial() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate" style="color: var(--text-primary);">{{ userDisplayName() }}</div>
            </div>
          </div>
        }

        <!-- 核心導航：僅 6 個獲客功能入口 -->
        <nav class="flex-1 overflow-y-auto sidebar-nav mt-3 px-2 pb-2">
          <a routerLink="/lean/dashboard" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>儀表板</span>
          </a>

          <a routerLink="/lean/accounts" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>帳號管理</span>
          </a>

          <a routerLink="/lean/search-discovery" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span>搜索發現</span>
          </a>

          <a routerLink="/lean/monitoring" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>監控中心</span>
          </a>

          <a routerLink="/lean/leads" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
            <span>潛在客戶</span>
          </a>

          <a routerLink="/lean/settings" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>設定</span>
          </a>
        </nav>

        <!-- 底部提示：標示目前處於精簡外殼 -->
        <div class="px-4 py-3 text-[11px] leading-tight" style="color: var(--text-muted); border-top: 1px solid var(--border-default);">
          精簡獲客外殼 · 僅載入核心功能
        </div>
      </aside>

      <!-- 子路由內容 -->
      <main role="main" aria-label="主要內容" class="flex-1 overflow-y-auto" style="background-color: var(--bg-primary);">
        <router-outlet></router-outlet>
      </main>

      <!-- 關鍵頁首訪 Spotlight 導覽（與完整殼層一致） -->
      <app-onboarding-overlay></app-onboarding-overlay>
    </div>
  `
})
export class LeanShellComponent {
  private readonly authService = inject(AuthService);

  /** 目前登入用戶（取不到時模板會自動跳過用戶資訊區塊） */
  readonly currentUser = this.authService.user;

  /** 顯示名稱：displayName → display_name → username → 預設值 */
  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    return user?.displayName || user?.display_name || user?.username || '訪客';
  });

  /** 頭像用首字母 */
  readonly userInitial = computed(() => this.userDisplayName().charAt(0).toUpperCase() || '?');
}
