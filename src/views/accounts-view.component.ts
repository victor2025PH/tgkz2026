/**
 * Accounts View Component
 * 帳號管理視圖組件 - 完整版
 * 
 * 🆕 Phase 28: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { TelegramAccount } from '../models';
import { 
  AccountManagementService, 
  DialogService 
} from '../services';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';

// 子組件導入
import { AccountCardListComponent } from '../account-card-list.component';
import { AddAccountSimpleComponent } from '../add-account-simple.component';

@Component({
  selector: 'app-accounts-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AccountCardListComponent,
    AddAccountSimpleComponent
  ],
  template: `
    @if (showAddForm()) {
      <app-add-account-simple (back)="navigateTo('accounts')" />
    } @else {
    <div class="page-content">
      <!-- Header -->
      <div class="flex items-center justify-between mb-5">
        <h2 id="accounts-section" class="text-3xl font-bold" style="color: var(--text-primary);">{{ t('accounts.manageAccounts') }}</h2>
        <div class="flex items-center gap-3">
          <span class="text-sm" style="color: var(--text-muted);">{{ t('membership.accountQuota') }}:</span>
          <span class="text-lg font-bold px-3 py-1 rounded-lg"
                [style.background]="membershipService.quotas().maxAccounts === -1 ? 'var(--success-bg)' :
                         (accounts().length >= membershipService.quotas().maxAccounts ? 'var(--error-bg)' : 'var(--primary-bg)')"
                [style.color]="membershipService.quotas().maxAccounts === -1 ? 'var(--success)' :
                         (accounts().length >= membershipService.quotas().maxAccounts ? 'var(--error)' : 'var(--primary-light)')">
            {{ accounts().length }}/{{ membershipService.quotas().maxAccounts === -1 ? '∞' : membershipService.quotas().maxAccounts }}
          </span>
          @if (membershipService.quotas().maxAccounts !== -1 && accounts().length >= membershipService.quotas().maxAccounts) {
            <button (click)="showUpgrade()" class="text-xs px-3 py-1 rounded-full text-white transition-opacity hover:opacity-90"
                    style="background: linear-gradient(90deg, var(--warning), #f97316);">
              {{ t('membership.upgradeUnlock') }}
            </button>
          }
        </div>
      </div>

      <!-- 一級：主 CTA 英雄條（無帳號時更突出；有帳號時顯示在線狀態+添加） -->
      <div class="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4"
           style="background: linear-gradient(135deg, var(--primary-bg), rgba(139, 92, 246, 0.08)); border: 1px solid var(--border-default); box-shadow: var(--shadow-md);">
        <div class="flex items-center gap-4 min-w-0">
          <span class="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                style="background: var(--primary-bg); color: var(--primary-light);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <div class="min-w-0">
            @if (accounts().length === 0) {
              <h3 class="text-lg font-bold" style="color: var(--text-primary);">添加你的第一個帳號</h3>
              <p class="text-sm" style="color: var(--text-muted);">這是跑通獲客鏈路的起點，支持手機號或掃碼登錄</p>
            } @else {
              <h3 class="text-lg font-bold" style="color: var(--text-primary);">
                {{ onlineCount() }} / {{ accounts().length }} 帳號在線
              </h3>
              <p class="text-sm" style="color: var(--text-muted);">
                @if (onlineCount() === 0) { 帳號已添加但未上線，請登錄後再啟動監控 }
                @else { 可在監控中心將帳號設為監聽/發送角色 }
              </p>
            }
          </div>
        </div>
        <button (click)="navigateTo('add-account')"
                class="inline-flex items-center gap-2 font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:brightness-110 shrink-0"
                style="background: linear-gradient(90deg, var(--primary), var(--accent)); color: #fff;">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {{ t('accounts.addAccount') }}
        </button>
      </div>

      <!-- 三級：更多操作（默認折疊，與儀表板一致） -->
      <div class="mb-5">
        <button (click)="showMore.set(!showMore())"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary);">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span class="text-sm font-medium">更多操作</span>
          <svg class="w-4 h-4 transition-transform" [class.rotate-180]="showMore()"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        @if (showMore()) {
          <div class="mt-3 flex flex-wrap items-center gap-3 p-4 rounded-xl"
               style="background-color: var(--bg-card); border: 1px solid var(--border-default);">
            <button (click)="openQrLogin()"
                    class="flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                    style="background: var(--success-bg); color: var(--success); border: 1px solid var(--success);">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01"/>
              </svg>
              {{ t('accounts.scanLogin') }}
            </button>
            <button (click)="importSession()" [disabled]="isImportingSession()"
                    class="flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                    style="background-color: var(--bg-tertiary); color: var(--text-primary);">
              @if (isImportingSession()) {
                <span class="animate-spin">⏳</span>{{ t('accounts.importing') }}
              } @else {
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {{ t('accounts.importSession') }}
              }
            </button>
            <button (click)="navigateTo('api-credentials')"
                    class="flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                    style="background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning);">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              {{ t('accounts.apiCredentialsPool') }}
            </button>
            <button (click)="reloadAccounts()"
                    class="flex items-center gap-2 text-sm py-2 px-3 rounded-lg transition-colors ml-auto"
                    style="background-color: var(--bg-tertiary); color: var(--text-secondary);" title="刷新帳戶列表">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        }
      </div>

      <!-- 二級：帳號列表 -->
      <app-account-card-list
        [accounts]="accounts()"
        (addAccount)="navigateTo('add-account')"
        (accountLogin)="loginAccount($event.id)"
        (accountLogout)="logoutAccount($event.id)"
        (accountRemove)="removeAccount($event.id)"
        (accountExport)="exportAccount($event.phone)"
        (accountEdit)="editAccount($event)">
      </app-account-card-list>
    </div>
    }
  `
})
export class AccountsViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  /** 是否顯示添加帳號表單（導航為 add-account 時為 true，解決點擊「添加帳號」無響應） */
  showAddForm = computed(() => this.nav.currentView() === 'add-account');
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  
  // 直接使用服務的帳戶列表
  accounts = this.accountService.accounts;

  /** 更多操作折疊（默認收起，與儀表板一致） */
  showMore = signal(false);

  onlineCount = computed(() =>
    this.accounts().filter(a => a.status === 'Online' || a.is_connected).length
  );

  // 導入狀態
  isImportingSession = signal(false);
  
  private ipcCleanup: (() => void)[] = [];
  
  ngOnInit(): void {
    this.loadAccounts();
    this.setupIpcListeners();
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }
  
  private loadAccounts(): void {
    // 通過 IPC 請求加載帳戶
    this.ipc.send('get-accounts');
  }
  
  private setupIpcListeners(): void {
    // 監聽 Session 導入結果（後端發送 session-import-result）
    const cleanup1 = this.ipc.on('session-import-result', (data: { success: boolean; message?: string; phone?: string; count?: number }) => {
      this.isImportingSession.set(false);
      if (data.success) {
        const msg = data.phone 
          ? `✅ Session 導入成功: ${data.phone}` 
          : `✅ Session 導入完成: ${data.count || 1} 個帳號`;
        this.toast.success(msg);
        this.reloadAccounts();
      } else {
        this.toast.error(`❌ 導入失敗: ${data.message || '未知錯誤'}`);
      }
    });
    
    const cleanup2 = this.ipc.on('session-import-error', (data: { error: string }) => {
      this.isImportingSession.set(false);
      this.toast.error(`❌ Session 導入失敗: ${data.error}`);
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2);
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 導航 - 使用 NavBridgeService 替代 Angular Router
  navigateTo(view: string): void {
    // 處理特殊視圖映射
    const viewMap: Record<string, LegacyView> = {
      'add-account': 'add-account',
      'api-credentials': 'api-credentials',
      'accounts': 'accounts',
      'settings': 'settings'
    };
    const targetView = viewMap[view] || (view as LegacyView);
    this.nav.navigateTo(targetView);
  }
  
  // 顯示升級提示
  showUpgrade(): void {
    this.toast.info('請升級會員以解鎖更多功能');
  }
  
  // 打開 QR 登入
  openQrLogin(): void {
    this.dialog.openQrLogin();
  }
  
  // 導入 Session
  importSession(): void {
    this.isImportingSession.set(true);
    this.toast.info('正在打開文件選擇器...');
    this.ipc.send('import-session');
    
    // 5秒超時保護
    setTimeout(() => {
      if (this.isImportingSession()) {
        this.isImportingSession.set(false);
      }
    }, 30000);
  }
  
  // 重新加載帳戶
  reloadAccounts(): void {
    this.ipc.send('get-accounts');
    this.toast.info('正在刷新帳戶列表...');
  }
  
  // 刷新隊列狀態
  refreshQueueStatus(): void {
    this.ipc.send('get-queue-status');
  }
  
  // 登入帳戶
  loginAccount(id: number): void {
    this.accountService.loginAccount(id);
  }
  
  // 登出帳戶
  logoutAccount(id: number): void {
    this.accountService.logoutAccount(id);
  }
  
  // 刪除帳戶
  removeAccount(id: number): void {
    this.dialog.confirm({
      title: '確認刪除',
      message: '確定要刪除此帳戶嗎？此操作無法撤銷。',
      type: 'danger',
      confirmText: '刪除',
      onConfirm: () => {
        this.accountService.removeAccount(id);
      }
    });
  }
  
  // 導出 Session
  exportAccount(phone: string): void {
    this.ipc.send('export-session', { phone });
    this.toast.info('正在導出 Session...');
  }
  
  // 編輯帳戶
  editAccount(account: TelegramAccount): void {
    this.accountService.toggleSelection(account.id);
    // TODO: 打開編輯對話框
    this.toast.info(`編輯帳戶: ${account.phone}`);
  }
}
