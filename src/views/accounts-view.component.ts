/**
 * Accounts View Component
 * 帳號管理視圖組件 - 完整版
 * 
 * 🆕 Phase 28: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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

@Component({
  selector: 'app-accounts-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AccountCardListComponent
  ],
  template: `
    <!-- 帳戶管理頁面 - 使用卡片視圖 -->
    <div class="flex items-center justify-between mb-6">
      <h2 id="accounts-section" class="text-4xl font-bold text-slate-900 dark:text-white">{{ t('manageAccounts') }}</h2>
      <!-- 賬戶配額顯示 -->
      <div class="flex items-center gap-3">
        <span class="text-sm text-slate-500">賬戶配額:</span>
        <span class="text-lg font-bold px-3 py-1 rounded-lg"
              [class]="membershipService.quotas().maxAccounts === -1 ? 'bg-emerald-500/20 text-emerald-400' : 
                       (accounts().length >= membershipService.quotas().maxAccounts ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400')">
          {{ accounts().length }}/{{ membershipService.quotas().maxAccounts === -1 ? '∞' : membershipService.quotas().maxAccounts }}
        </span>
        @if (membershipService.quotas().maxAccounts !== -1 && accounts().length >= membershipService.quotas().maxAccounts) {
          <button (click)="showUpgrade()" class="text-xs px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:opacity-90 transition-opacity">
            升級解鎖更多
          </button>
        }
      </div>
    </div>
    
    <!-- 快速操作工具欄 -->
    <div class="bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm border border-slate-500/20 p-4 rounded-xl shadow-lg mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-3">
          <!-- 添加帳戶 -->
          <button (click)="navigateTo('add-account')" class="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-cyan-500/20">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            添加帳戶
          </button>
          
          <!-- API 憑據池 -->
          <button (click)="navigateTo('api-credentials')" class="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-amber-500/20">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            API 憑據池
          </button>
          
          <button (click)="openQrLogin()" class="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-bold py-2 px-4 rounded-lg transition duration-200 shadow-lg shadow-emerald-500/20">
            <span>📱</span>
            掃碼登入
          </button>
          
          <button (click)="importSession()" 
                  [disabled]="isImportingSession()"
                  class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold py-2 px-4 rounded-lg transition duration-200">
            @if (isImportingSession()) {
              <span class="animate-spin">⏳</span>
              導入中...
            } @else {
              <span>📥</span>
              導入 Session
            }
          </button>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="reloadAccounts()" class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 text-sm py-2 px-3 rounded-lg transition duration-200" title="刷新帳戶列表">
            <span>🔄</span>
          </button>
          <button (click)="refreshQueueStatus()" class="flex items-center gap-2 bg-slate-200 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 text-sm py-2 px-3 rounded-lg transition duration-200" title="刷新隊列狀態">
            <span>📊</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 帳戶卡片列表組件 -->
    <app-account-card-list
      [accounts]="accounts()"
      (addAccount)="navigateTo('add-account')"
      (accountLogin)="loginAccount($event.id)"
      (accountLogout)="logoutAccount($event.id)"
      (accountRemove)="removeAccount($event.id)"
      (accountExport)="exportAccount($event.phone)"
      (accountEdit)="editAccount($event)">
    </app-account-card-list>
  `
})
export class AccountsViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  
  // 直接使用服務的帳戶列表
  accounts = this.accountService.accounts;
  
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
