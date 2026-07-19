/**
 * TG-AI智控王 精簡獲客模式 - 獨立輕量 Bootstrap 根組件
 *
 * 🎯 Stage：真正的 bundle 體積優化（區別於 Stage 2C 的 LeanShellComponent）
 *
 * 背景：LeanShellComponent（`views/lean-shell.component.ts`）只是在既有的
 * `/lean/*` 子路由下提供一個精簡導航殼，但它仍然嵌套在 bootstrap 根組件
 * `AppComponent`（~5900 行）之內渲染 —— 也就是說 `AppComponent` 的 TS 類別
 * （建構子注入、`ngOnInit` 裡的 IPC 監聽註冊、初始狀態拉取等）依然會被完整
 * 實例化執行，並沒有真正降低精簡模式的啟動成本。
 *
 * 這個組件是專門設計來取代 `AppComponent` 作為 `bootstrapApplication()` 的
 * 根組件使用（見 `main.ts`），只在 `environment.features.leanBootstrapRoot`
 * 明確開啟時才會啟用（預設關閉，零風險）。
 *
 * 🔍 安全性依據（已逐一核實，不是臆測）：
 * 1. 六大核心獲客視圖（Dashboard/Accounts/SearchDiscovery/Monitoring/Leads/
 *    Settings）皆為 standalone 路由組件，各自 inject 自己的專屬 service
 *    （如 AccountManagementService、MonitoringManagementService、
 *    ResourceService、UnifiedContactsService），不依賴 AppComponent 的
 *    instance 狀態。
 * 2. 這些 service 的 constructor 本身就會自行呼叫 `this.ipcService.on(...)`
 *    註冊監聽器並主動拉取初始資料（例如 AccountManagementService.constructor
 *    裡呼叫 `this.loadAccounts()`），完全不依賴 AppComponent.ngOnInit 執行過。
 * 3. `ElectronIpcService`（`providedIn: 'root'` 單例）的連線建立（Electron
 *    ipcRenderer 或 Web 模式 WebSocket）發生在它自己的 constructor 裡，只要
 *    任何組件/服務第一次注入它就會自動建立連線，與 AppComponent 是否存在
 *    無關。
 *
 * 因此，即使 AppComponent 從未被實例化，這六大核心視圖仍應能正常運作。
 * 唯一不受保障的是 AppComponent 自己（及其巨型側欄）持有的、尚未被證實
 * 有其他讀取者的舊有狀態/邏輯 —— 但這些正是精簡模式本來就不需要的部分。
 *
 * ⚠️ 儘管有以上依據，仍缺乏可實際啟動 Electron + 後端做端到端互動驗證的
 * 環境，僅完成了 `ng build` 編譯期驗證。故本功能預設關閉，建議在有完整
 * 執行環境時先小範圍手動驗證（登入、加帳號、搜索、監控、潛客、設定六個
 * 頁面皆可正常讀寫）後才啟用於生產。
 *
 * ⚠️ 另一個已用真實構建驗證確認的限制：main.ts 目前用手動 `import()` 切換
 * 根組件，但實測 AppComponent 的程式碼依然被打進主 chunk（esbuild 應用
 * 建構器似乎只在 Angular Router 的懶加載邊界才做真正拆分）。也就是說，目前
 * 這個機制在「運行時邏輯」層面是對的、可用的，但**還沒有達成縮小主包體積**
 * 的目標，詳見 `main.ts` 裡對應的完整說明。真正要縮小體積，需要把
 * AppComponent 的殼改造成透過 Router `loadComponent` 掛載的路由組件，而不是
 * 停留在目前「bootstrap 根組件手動切換」的做法。
 */
import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastComponent } from './toast.component';
import { GlobalConfirmDialogComponent } from './global-confirm-dialog.component';
import { GlobalInputDialogComponent } from './global-input-dialog.component';
import { AlertNotificationComponent } from './components/alert-notification.component';
import { OfflineIndicatorComponent } from './components/offline-indicator.component';
import { NetworkStatusComponent } from './core/network-status.component';
import { AuthTransitionComponent } from './core/auth-transition.component';

@Component({
  selector: 'app-lean-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ToastComponent,
    GlobalConfirmDialogComponent,
    GlobalInputDialogComponent,
    AlertNotificationComponent,
    OfflineIndicatorComponent,
    NetworkStatusComponent,
    AuthTransitionComponent
  ],
  template: `
    <app-network-status></app-network-status>
    <app-auth-transition></app-auth-transition>
    <app-toast></app-toast>
    <app-global-confirm-dialog></app-global-confirm-dialog>
    <app-global-input-dialog></app-global-input-dialog>
    <app-alert-notification></app-alert-notification>
    <app-offline-indicator></app-offline-indicator>

    <div class="flex h-screen" style="background-color: var(--bg-primary); color: var(--text-primary);">
      <!-- 精簡側邊導航：僅 6 個核心獲客入口，直接指向既有頂層路由 -->
      <aside class="flex-shrink-0 flex flex-col h-screen w-60 backdrop-blur-sm"
             style="background-color: var(--bg-sidebar); border-right: 1px solid var(--border-default);">

        <div class="flex items-center gap-3 p-4" style="border-bottom: 1px solid var(--border-default);">
          <div class="relative flex-shrink-0">
            <div class="absolute inset-0 rounded-xl blur-md opacity-50"
                 style="background: linear-gradient(135deg, #06b6d4, #8b5cf6);"></div>
            <svg class="h-9 w-9 relative z-10" viewBox="0 0 64 64" fill="none">
              <path d="M32 8L52 20V44L32 56L12 44V20L32 8Z" fill="url(#leanRootLogoGrad)"/>
              <path d="M22 28L40 22L34 36L28 32L22 28Z" fill="white" opacity="0.95"/>
              <defs>
                <linearGradient id="leanRootLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
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
              ⚡ 精簡獲客模式（獨立根）
            </span>
          </div>
        </div>

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

        <nav class="flex-1 overflow-y-auto sidebar-nav mt-3 px-2 pb-2">
          <a routerLink="/dashboard" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>儀表板</span>
          </a>
          <a routerLink="/accounts" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>帳號管理</span>
          </a>
          <a routerLink="/search-discovery" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span>搜索發現</span>
          </a>
          <a routerLink="/monitoring" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>監控中心</span>
          </a>
          <a routerLink="/leads" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
            <span>潛在客戶</span>
          </a>
          <a routerLink="/settings" routerLinkActive="active"
             class="sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 cursor-pointer mb-1">
            <svg class="h-5 w-5 sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            <span>設定</span>
          </a>
        </nav>

        <div class="px-4 py-3 text-[11px] leading-tight" style="color: var(--text-muted); border-top: 1px solid var(--border-default);">
          精簡獲客獨立根 · 未加載完整應用殼
        </div>
      </aside>

      <main role="main" aria-label="主要內容" class="flex-1 overflow-y-auto" style="background-color: var(--bg-primary);">
        <router-outlet></router-outlet>
      </main>
    </div>
  `
})
export class LeanRootComponent {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.user;

  readonly userDisplayName = computed(() => {
    const user = this.currentUser();
    return user?.displayName || user?.display_name || user?.username || '訪客';
  });

  readonly userInitial = computed(() => this.userDisplayName().charAt(0).toUpperCase() || '?');
}
