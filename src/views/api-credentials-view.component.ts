/**
 * API Credentials View Component
 * API 憑據管理視圖組件
 * 
 * 提供完整的 API 憑據 CRUD 操作界面
 */
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { NavBridgeService } from '../services/nav-bridge.service';

interface ApiCredential {
  api_id: string;
  api_hash: string;
  name: string;
  source: string;
  account_count: number;
  max_accounts: number;
  is_active: boolean;
  is_public: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-api-credentials-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <!-- 頁面標題 -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
            </svg>
            返回帳號管理
          </button>
        </div>
        <button (click)="refreshList()" 
                class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                [disabled]="isLoading()">
          <span [class.animate-spin]="isLoading()">🔄</span>
          刷新
        </button>
      </div>

      <h1 class="text-3xl font-bold text-white mb-2">🔐 API 憑據池</h1>
      <p class="text-slate-400 mb-8">管理您的 Telegram API 憑據，添加自定義 API 以獲得更好的穩定性</p>

      <!-- 統計卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-8">
        <div class="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
          <div class="text-2xl font-bold text-cyan-400">{{ credentials().length }}</div>
          <div class="text-sm text-slate-400">總 API 數量</div>
        </div>
        <div class="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
          <div class="text-2xl font-bold text-green-400">{{ activeCount() }}</div>
          <div class="text-sm text-slate-400">活躍中</div>
        </div>
        <div class="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
          <div class="text-2xl font-bold text-amber-400">{{ totalAccountsUsed() }}</div>
          <div class="text-sm text-slate-400">已綁定帳號</div>
        </div>
        <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
          <div class="text-2xl font-bold text-purple-400">{{ totalCapacity() }}</div>
          <div class="text-sm text-slate-400">總容量</div>
        </div>
      </div>

      <!-- 添加新 API 表單 -->
      <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 mb-8">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>➕</span> 添加新 API 憑據
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">API ID <span class="text-red-400">*</span></label>
            <input type="text" 
                   [(ngModel)]="newApiId"
                   placeholder="例如: 12345678"
                   class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">API Hash <span class="text-red-400">*</span></label>
            <input type="text" 
                   [(ngModel)]="newApiHash"
                   placeholder="32位十六進制字符串"
                   class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-400 mb-1">名稱（可選）</label>
            <input type="text" 
                   [(ngModel)]="newApiName"
                   placeholder="例如: 主力 API"
                   class="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none">
          </div>
          <div class="flex items-end">
            <button (click)="addCredential()" 
                    [disabled]="!isFormValid() || isSaving()"
                    class="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
              @if (isSaving()) {
                <span class="animate-spin">⏳</span> 保存中...
              } @else {
                <span>➕</span> 添加
              }
            </button>
          </div>
        </div>
        
        <div class="mt-3 text-sm text-slate-500 flex items-center gap-2">
          <span>💡</span>
          <span>前往 <a href="https://my.telegram.org" target="_blank" class="text-cyan-400 hover:underline">my.telegram.org</a> 申請您自己的 API 憑據</span>
        </div>
      </div>

      <!-- API 列表 -->
      <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-slate-700">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📋</span> 我的 API 列表
          </h3>
        </div>
        
        @if (isLoading()) {
          <div class="p-12 text-center">
            <div class="animate-spin text-4xl mb-4">⏳</div>
            <p class="text-slate-400">正在加載...</p>
          </div>
        } @else if (credentials().length === 0) {
          <div class="p-12 text-center">
            <div class="text-6xl mb-4">📭</div>
            <p class="text-xl font-medium text-white mb-2">還沒有任何 API 憑據</p>
            <p class="text-slate-400">請在上方表單添加您的第一個 API</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-700">
            @for (cred of credentials(); track cred.api_id) {
              <div class="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <!-- 狀態指示器 -->
                  <div class="w-3 h-3 rounded-full" 
                       [class.bg-green-500]="cred.is_active"
                       [class.bg-slate-500]="!cred.is_active">
                  </div>
                  
                  <!-- API 信息 -->
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-white">{{ cred.name }}</span>
                      @if (cred.is_public) {
                        <span class="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">公共</span>
                      }
                      @if (cred.source === 'manual') {
                        <span class="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">手動添加</span>
                      }
                    </div>
                    <div class="text-sm text-slate-400">
                      ID: {{ cred.api_id }} • Hash: {{ cred.api_hash.slice(0, 8) }}...{{ cred.api_hash.slice(-4) }}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-4">
                  <!-- 使用量 -->
                  <div class="text-right">
                    <div class="text-sm font-medium" 
                         [class.text-green-400]="cred.account_count < cred.max_accounts * 0.8"
                         [class.text-amber-400]="cred.account_count >= cred.max_accounts * 0.8 && cred.account_count < cred.max_accounts"
                         [class.text-red-400]="cred.account_count >= cred.max_accounts">
                      {{ cred.account_count }}/{{ cred.max_accounts }} 帳號
                    </div>
                    <div class="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full transition-all"
                           [class.bg-green-500]="cred.account_count < cred.max_accounts * 0.8"
                           [class.bg-amber-500]="cred.account_count >= cred.max_accounts * 0.8 && cred.account_count < cred.max_accounts"
                           [class.bg-red-500]="cred.account_count >= cred.max_accounts"
                           [style.width.%]="(cred.account_count / cred.max_accounts) * 100">
                      </div>
                    </div>
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex items-center gap-2">
                    @if (!cred.is_public) {
                      <button (click)="toggleCredential(cred.api_id, !cred.is_active)"
                              class="px-3 py-1.5 rounded-lg text-sm transition-colors"
                              [class.bg-green-500/20]="!cred.is_active"
                              [class.text-green-400]="!cred.is_active"
                              [class.hover:bg-green-500/30]="!cred.is_active"
                              [class.bg-amber-500/20]="cred.is_active"
                              [class.text-amber-400]="cred.is_active"
                              [class.hover:bg-amber-500/30]="cred.is_active">
                        {{ cred.is_active ? '停用' : '啟用' }}
                      </button>
                      <button (click)="confirmDelete(cred)"
                              class="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors">
                        刪除
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- 刪除確認對話框 -->
      @if (deleteTarget()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" (click)="cancelDelete()">
          <div class="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4" (click)="$event.stopPropagation()">
            <h3 class="text-xl font-bold text-white mb-4">確認刪除</h3>
            <p class="text-slate-400 mb-6">
              確定要刪除 API「<span class="text-white">{{ deleteTarget()!.name }}</span>」嗎？
              @if (deleteTarget()!.account_count > 0) {
                <br><span class="text-amber-400">⚠️ 此 API 目前有 {{ deleteTarget()!.account_count }} 個帳號在使用。</span>
              }
            </p>
            <div class="flex gap-3">
              <button (click)="cancelDelete()" class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                取消
              </button>
              <button (click)="doDelete()" class="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                確認刪除
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ApiCredentialsViewComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private nav = inject(NavBridgeService);

  // 狀態
  credentials = signal<ApiCredential[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  deleteTarget = signal<ApiCredential | null>(null);

  // 表單
  newApiId = '';
  newApiHash = '';
  newApiName = '';

  // 計算屬性
  activeCount = () => this.credentials().filter(c => c.is_active && !c.is_public).length;
  totalAccountsUsed = () => this.credentials().reduce((sum, c) => sum + c.account_count, 0);
  totalCapacity = () => this.credentials().filter(c => !c.is_public).reduce((sum, c) => sum + c.max_accounts, 0);

  private ipcCleanup: (() => void)[] = [];

  ngOnInit(): void {
    this.setupIpcListeners();
    this.refreshList();
  }

  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }

  private setupIpcListeners(): void {
    // 監聽憑據列表更新
    const cleanup1 = this.ipc.on('api-credentials-updated', (data: any) => {
      this.isLoading.set(false);
      if (data.credentials) {
        this.credentials.set(data.credentials);
      }
    });

    // 監聽添加結果
    const cleanup2 = this.ipc.on('api-credential-added', (data: any) => {
      this.isSaving.set(false);
      if (data.success) {
        this.toast.success('✅ API 憑據添加成功！');
        this.clearForm();
        // 列表會自動刷新
      } else {
        this.toast.error(`添加失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 監聽刪除結果
    const cleanup3 = this.ipc.on('api-credential-removed', (data: any) => {
      if (data.success) {
        this.toast.success('🗑️ API 憑據已刪除');
      } else {
        this.toast.error(`刪除失敗: ${data.error || '未知錯誤'}`);
      }
    });

    // 監聽狀態切換結果
    const cleanup4 = this.ipc.on('api-credential-toggled', (data: any) => {
      if (data.success) {
        this.toast.success('狀態已更新');
      } else {
        this.toast.error(`操作失敗: ${data.error || '未知錯誤'}`);
      }
    });

    this.ipcCleanup.push(cleanup1, cleanup2, cleanup3, cleanup4);
  }

  refreshList(): void {
    this.isLoading.set(true);
    this.ipc.send('get-api-credentials', {});
  }

  isFormValid(): boolean {
    const apiId = this.newApiId.trim();
    const apiHash = this.newApiHash.trim();
    return apiId.length > 0 && /^\d+$/.test(apiId) && 
           apiHash.length === 32 && /^[a-f0-9]{32}$/i.test(apiHash);
  }

  addCredential(): void {
    if (!this.isFormValid()) {
      this.toast.error('請檢查 API ID 和 API Hash 格式');
      return;
    }

    this.isSaving.set(true);
    this.ipc.send('add-api-credential', {
      api_id: this.newApiId.trim(),
      api_hash: this.newApiHash.trim(),
      name: this.newApiName.trim() || `API_${this.newApiId.slice(-4)}`,
      source: 'manual',
      max_accounts: 5
    });
  }

  clearForm(): void {
    this.newApiId = '';
    this.newApiHash = '';
    this.newApiName = '';
  }

  toggleCredential(apiId: string, isActive: boolean): void {
    this.ipc.send('toggle-api-credential', { api_id: apiId, is_active: isActive });
  }

  confirmDelete(cred: ApiCredential): void {
    this.deleteTarget.set(cred);
  }

  cancelDelete(): void {
    this.deleteTarget.set(null);
  }

  doDelete(): void {
    const target = this.deleteTarget();
    if (target) {
      this.ipc.send('remove-api-credential', { api_id: target.api_id });
      this.deleteTarget.set(null);
    }
  }

  goBack(): void {
    this.nav.navigateTo('accounts');
  }
}
