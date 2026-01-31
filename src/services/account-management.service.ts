/**
 * 帳號管理服務
 * Account Management Service
 * 
 * 集中處理 Telegram 帳號的管理邏輯
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { TelegramAccount, AccountRole, AccountStatus } from '../models';

// ============ 類型定義 ============

export interface AccountFilter {
  status?: AccountStatus | 'all';
  role?: AccountRole | 'all';
  search?: string;
}

export interface AccountStats {
  total: number;
  online: number;
  offline: number;
  connecting: number;
  error: number;
  byRole: Record<string, number>;
}

export interface RoleInfo {
  id: AccountRole;
  name: string;
  icon: string;
  description: string;
  color: string;
}

// ============ 角色配置 ============

export const ACCOUNT_ROLES: RoleInfo[] = [
  { id: 'Listener', name: '監控號', icon: '👁️', description: '用於監控群組消息', color: 'blue' },
  { id: 'Sender', name: '發送號', icon: '📤', description: '用於發送消息', color: 'green' },
  { id: 'Explorer', name: '探索號', icon: '🔍', description: '用於搜索和發現資源', color: 'purple' },
  { id: 'AI', name: 'AI 號', icon: '🤖', description: '用於 AI 對話', color: 'cyan' },
  { id: 'Backup', name: '備用號', icon: '⚡', description: '備用帳號', color: 'yellow' },
  { id: 'Unassigned', name: '未分配', icon: '⭕', description: '尚未分配角色', color: 'gray' }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AccountManagementService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  private _accounts = signal<TelegramAccount[]>([]);
  private _selectedAccountIds = signal<Set<number>>(new Set());
  private _filter = signal<AccountFilter>({ status: 'all', role: 'all' });
  private _isLoading = signal(false);
  private _initialized = false;
  
  accounts = this._accounts.asReadonly();
  selectedAccountIds = this._selectedAccountIds.asReadonly();
  filter = this._filter.asReadonly();
  isLoading = this._isLoading.asReadonly();
  
  constructor() {
    // 🆕 自動監聽 accounts-updated 事件
    this.setupIpcListeners();
  }
  
  private setupIpcListeners(): void {
    if (this._initialized) return;
    this._initialized = true;
    
    console.log('[AccountManagementService] Setting up IPC listeners');
    
    // 監聽帳號更新事件
    this.ipc.on('accounts-updated', (accounts: TelegramAccount[]) => {
      console.log('[AccountManagementService] Received accounts-updated:', accounts.length, 'accounts');
      this._accounts.set(accounts);
      this._isLoading.set(false);
    });
    
    // 監聽帳號刪除結果
    this.ipc.on('account-deleted', (data: { success: boolean; accountId: number; error?: string }) => {
      if (data.success) {
        this._accounts.update(list => list.filter(a => a.id !== data.accountId));
        this.toast.success('帳號已刪除');
      } else {
        this.toast.error(`刪除失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 監聽驗證碼請求
    this.ipc.on('login-requires-code', (data: { accountId: number; phoneCodeHash: string }) => {
      console.log('[AccountManagementService] Login requires code for account:', data.accountId);
      this.handleCodeRequired(data);
    });
    
    // 監聯 2FA 請求
    this.ipc.on('login-requires-2fa', (data: { accountId: number }) => {
      console.log('[AccountManagementService] Login requires 2FA for account:', data.accountId);
      this.handle2FARequired(data);
    });
    
    // 監聽登錄成功
    this.ipc.on('login-success', (data: { accountId: number }) => {
      console.log('[AccountManagementService] Login success for account:', data.accountId);
      this.handleLoginSuccess(data);
    });
    
    // 監聽登錄失敗
    this.ipc.on('login-failed', (data: { accountId: number; error: string }) => {
      console.log('[AccountManagementService] Login failed for account:', data.accountId);
      this.handleLoginFailed(data);
    });
    
    // 監聽登出結果
    this.ipc.on('logout-result', (data: { success: boolean; accountId: number; error?: string }) => {
      this.handleLogoutResult(data);
    });
    
    // 初始加載帳號
    this.loadAccounts();
  }
  
  loadAccounts(): void {
    console.log('[AccountManagementService] Loading accounts...');
    this._isLoading.set(true);
    this.ipc.send('get-accounts');
  }
  
  // ========== 計算屬性 ==========
  
  filteredAccounts = computed(() => {
    const accounts = this._accounts();
    const filter = this._filter();
    
    return accounts.filter(account => {
      // 狀態過濾
      if (filter.status && filter.status !== 'all') {
        if (account.status !== filter.status) return false;
      }
      
      // 角色過濾
      if (filter.role && filter.role !== 'all') {
        if (account.role !== filter.role) return false;
      }
      
      // 搜索過濾
      if (filter.search) {
        const search = filter.search.toLowerCase();
        const matchPhone = account.phone?.toLowerCase().includes(search);
        const matchName = account.name?.toLowerCase().includes(search);
        if (!matchPhone && !matchName) return false;
      }
      
      return true;
    });
  });
  
  stats = computed((): AccountStats => {
    const accounts = this._accounts();
    const byRole: Record<string, number> = {};
    
    for (const role of ACCOUNT_ROLES) {
      byRole[role.id] = 0;
    }
    
    for (const account of accounts) {
      if (account.role && byRole[account.role] !== undefined) {
        byRole[account.role]++;
      }
    }
    
    return {
      total: accounts.length,
      online: accounts.filter(a => a.status === 'Online').length,
      offline: accounts.filter(a => a.status === 'Offline').length,
      connecting: accounts.filter(a => a.status === 'Connecting').length,
      error: accounts.filter(a => a.status === 'Error' || a.status === 'Banned').length,
      byRole
    };
  });
  
  onlineAccounts = computed(() => 
    this._accounts().filter(a => a.status === 'Online')
  );
  
  listenerAccounts = computed(() => 
    this._accounts().filter(a => a.role === 'Listener' && a.status === 'Online')
  );
  
  senderAccounts = computed(() => 
    this._accounts().filter(a => a.role === 'Sender' && a.status === 'Online')
  );
  
  selectedAccounts = computed(() => {
    const ids = this._selectedAccountIds();
    return this._accounts().filter(a => ids.has(a.id));
  });
  
  hasSelection = computed(() => this._selectedAccountIds().size > 0);
  
  allSelected = computed(() => {
    const filtered = this.filteredAccounts();
    const selected = this._selectedAccountIds();
    return filtered.length > 0 && filtered.every(a => selected.has(a.id));
  });
  
  // ========== 帳號操作 ==========
  
  setAccounts(accounts: TelegramAccount[]): void {
    this._accounts.set(accounts);
  }
  
  updateAccount(account: TelegramAccount): void {
    this._accounts.update(list => 
      list.map(a => a.id === account.id ? { ...a, ...account } : a)
    );
  }
  
  addAccount(account: TelegramAccount): void {
    this._accounts.update(list => [...list, account]);
  }
  
  removeAccount(accountId: number): void {
    this._accounts.update(list => list.filter(a => a.id !== accountId));
    this._selectedAccountIds.update(ids => {
      const newIds = new Set(ids);
      newIds.delete(accountId);
      return newIds;
    });
  }
  
  // ========== 選擇操作 ==========
  
  toggleSelection(accountId: number): void {
    this._selectedAccountIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(accountId)) {
        newIds.delete(accountId);
      } else {
        newIds.add(accountId);
      }
      return newIds;
    });
  }
  
  selectAll(): void {
    const filtered = this.filteredAccounts();
    this._selectedAccountIds.set(new Set(filtered.map(a => a.id)));
  }
  
  deselectAll(): void {
    this._selectedAccountIds.set(new Set());
  }
  
  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }
  
  isSelected(accountId: number): boolean {
    return this._selectedAccountIds().has(accountId);
  }
  
  // ========== 過濾操作 ==========
  
  setFilter(filter: Partial<AccountFilter>): void {
    this._filter.update(f => ({ ...f, ...filter }));
  }
  
  clearFilter(): void {
    this._filter.set({ status: 'all', role: 'all' });
  }
  
  // ========== API 操作 ==========
  
  async connectAccount(accountId: number): Promise<boolean> {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    this.updateAccount({ ...account, status: 'Connecting' as AccountStatus });
    
    return new Promise((resolve) => {
      this.ipc.send('connect-account', { accountId, phone: account.phone });
      // 結果通過 IPC 事件返回
      resolve(true);
    });
  }
  
  async disconnectAccount(accountId: number): Promise<boolean> {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    return new Promise((resolve) => {
      this.ipc.send('disconnect-account', { accountId, phone: account.phone });
      resolve(true);
    });
  }
  
  async deleteAccount(accountId: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.ipc.send('delete-account', { accountId });
      resolve(true);
    });
  }
  
  async setAccountRole(accountId: number, role: AccountRole): Promise<boolean> {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) return false;
    
    this.updateAccount({ ...account, role });
    
    return new Promise((resolve) => {
      this.ipc.send('update-account', { 
        accountId, 
        updates: { role } 
      });
      resolve(true);
    });
  }
  
  async batchSetRole(accountIds: number[], role: AccountRole): Promise<void> {
    for (const id of accountIds) {
      await this.setAccountRole(id, role);
    }
    this.toast.success(`已將 ${accountIds.length} 個帳號設為 ${this.getRoleName(role)}`);
  }
  
  async batchConnect(accountIds: number[]): Promise<void> {
    for (const id of accountIds) {
      await this.connectAccount(id);
    }
    this.toast.info(`正在連接 ${accountIds.length} 個帳號...`);
  }
  
  async batchDisconnect(accountIds: number[]): Promise<void> {
    for (const id of accountIds) {
      await this.disconnectAccount(id);
    }
    this.toast.info(`正在斷開 ${accountIds.length} 個帳號...`);
  }
  
  // ========== 輔助方法 ==========
  
  getAccount(accountId: number): TelegramAccount | undefined {
    return this._accounts().find(a => a.id === accountId);
  }
  
  getAccountByPhone(phone: string): TelegramAccount | undefined {
    return this._accounts().find(a => a.phone === phone);
  }
  
  getRoleInfo(role: AccountRole): RoleInfo | undefined {
    return ACCOUNT_ROLES.find(r => r.id === role);
  }
  
  getRoleName(role: AccountRole): string {
    return this.getRoleInfo(role)?.name || '未知';
  }
  
  getRoleIcon(role: AccountRole): string {
    return this.getRoleInfo(role)?.icon || '⭕';
  }
  
  getStatusColor(status: AccountStatus): string {
    const colors: Record<string, string> = {
      'Online': 'text-green-400',
      'Offline': 'text-gray-400',
      'Connecting': 'text-yellow-400',
      'Error': 'text-red-400',
      'Banned': 'text-red-500',
      'Limited': 'text-orange-400'
    };
    return colors[status] || 'text-gray-400';
  }
  
  getStatusText(status: AccountStatus): string {
    const texts: Record<string, string> = {
      'Online': '在線',
      'Offline': '離線',
      'Connecting': '連接中',
      'Error': '錯誤',
      'Banned': '已封禁',
      'Limited': '受限'
    };
    return texts[status] || '未知';
  }
  
  // ========== 登錄狀態管理 ==========
  
  private _loginState = signal<LoginState>({
    accountId: null,
    phone: '',
    requiresCode: false,
    requires2FA: false,
    phoneCodeHash: null,
    isSubmittingCode: false
  });
  
  private _loginCode = signal('');
  private _login2FAPassword = signal('');
  
  loginState = this._loginState.asReadonly();
  loginCode = this._loginCode.asReadonly();
  login2FAPassword = this._login2FAPassword.asReadonly();
  
  setLoginCode(code: string): void {
    this._loginCode.set(code);
  }
  
  setLogin2FAPassword(password: string): void {
    this._login2FAPassword.set(password);
  }
  
  // ========== 登錄操作 ==========
  
  loginAccount(accountId: number): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) {
      this.toast.error('账户未找到');
      return;
    }
    
    this.toast.info('正在登录账户...');
    
    // Reset login state
    this._loginState.set({
      accountId: accountId,
      phone: account.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set('');
    this._login2FAPassword.set('');
    
    this.ipc.send('login-account', accountId);
  }
  
  logoutAccount(accountId: number): void {
    const account = this._accounts().find(a => a.id === accountId);
    if (!account) {
      this.toast.error('账户未找到');
      return;
    }
    
    if (confirm(`确定要退出账户 ${account.phone} 吗？`)) {
      this.toast.info('正在退出账户...');
      this.ipc.send('logout-account', accountId);
    }
  }
  
  submitLoginCode(): void {
    const state = this._loginState();
    if (!state.accountId || !state.phoneCodeHash || !this._loginCode().trim()) {
      return;
    }
    
    // Immediately close dialog and show loading state
    this._loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: state.phoneCodeHash,
      isSubmittingCode: true
    });
    
    this.toast.info('正在验证验证码...');
    
    this.ipc.send('login-account', {
      accountId: state.accountId,
      phoneCode: this._loginCode().trim(),
      phoneCodeHash: state.phoneCodeHash
    });
    
    this._loginCode.set('');
  }
  
  submitLogin2FA(): void {
    const state = this._loginState();
    if (!state.accountId || !this._login2FAPassword().trim()) {
      return;
    }
    
    this.ipc.send('login-account', {
      accountId: state.accountId,
      twoFactorPassword: this._login2FAPassword().trim()
    });
    
    this._login2FAPassword.set('');
  }
  
  cancelLogin(): void {
    this._loginState.set({
      accountId: null,
      phone: '',
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set('');
    this._login2FAPassword.set('');
  }
  
  resendVerificationCode(): void {
    const state = this._loginState();
    if (!state.accountId) return;
    
    this._loginState.set({
      accountId: state.accountId,
      phone: state.phone,
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this._loginCode.set('');
    
    this.toast.info('正在重新发送验证码到您的 Telegram 应用...', 5000);
    this.ipc.send('login-account', state.accountId);
  }
  
  checkAccountStatus(accountId: number): void {
    this.ipc.send('check-account-status', accountId);
  }
  
  // ========== IPC 事件處理 ==========
  
  handleCodeRequired(data: { accountId: number; phoneCodeHash: string }): void {
    this._loginState.update(s => ({
      ...s,
      accountId: data.accountId,
      requiresCode: true,
      phoneCodeHash: data.phoneCodeHash,
      isSubmittingCode: false
    }));
  }
  
  handle2FARequired(data: { accountId: number }): void {
    this._loginState.update(s => ({
      ...s,
      accountId: data.accountId,
      requiresCode: false,
      requires2FA: true,
      isSubmittingCode: false
    }));
  }
  
  handleLoginSuccess(data: { accountId: number }): void {
    this._loginState.set({
      accountId: null,
      phone: '',
      requiresCode: false,
      requires2FA: false,
      phoneCodeHash: null,
      isSubmittingCode: false
    });
    this.toast.success('登录成功');
  }
  
  handleLoginFailed(data: { accountId: number; error: string }): void {
    this._loginState.update(s => ({
      ...s,
      isSubmittingCode: false
    }));
    this.toast.error(`登录失败: ${data.error}`);
  }
  
  handleLogoutResult(data: { success: boolean; accountId: number; error?: string }): void {
    if (data.success) {
      const account = this._accounts().find(a => a.id === data.accountId);
      this.toast.success(`账户 ${account?.phone || ''} 已退出`);
    } else {
      this.toast.error(`退出失败: ${data.error || '未知错误'}`);
    }
  }
}

// ========== 類型定義 ==========

export interface LoginState {
  accountId: number | null;
  phone: string;
  requiresCode: boolean;
  requires2FA: boolean;
  phoneCodeHash: string | null;
  isSubmittingCode: boolean;
}
