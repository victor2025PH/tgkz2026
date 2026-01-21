/**
 * 監控帳號管理頁面
 * 使用 MonitoringStateService 統一管理數據
 */
import { Component, signal, computed, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringStateService, MonitoringAccount } from './monitoring-state.service';
import { ConfigProgressComponent } from './config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-monitoring-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfigProgressComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">🤖</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">監控帳號管理</h1>
            <p class="text-sm text-slate-400">管理用於監控群組消息的 Telegram 帳號</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- 配置進度（緊湊模式） -->
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">🔄</span>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">✓</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.connectedAccounts().length }}</div>
              <div class="text-xs text-slate-500">已連接</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span class="text-blue-400">👁️</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-blue-400">{{ stateService.listenerAccounts().length }}</div>
              <div class="text-xs text-slate-500">監聽帳號</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <span class="text-green-400">📤</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-green-400">{{ stateService.senderAccounts().length }}</div>
              <div class="text-xs text-slate-500">發送帳號</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">📊</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.accounts().length }}</div>
              <div class="text-xs text-slate-500">總帳號</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 帳號面板 -->
      <div class="flex-1 overflow-hidden flex gap-6">
        <!-- 左側：帳號列表 -->
        <div class="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>🤖</span> 監控帳號
              <span class="text-xs text-slate-500">({{ stateService.accounts().length }})</span>
            </h3>
            <button (click)="navigateToAccountManagement()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + 添加帳號
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            @for (account of stateService.accounts(); track account.id) {
              <div (click)="selectAccount(account)"
                   class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg 
                          hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                          hover:border-cyan-500/30"
                   [class.border-cyan-500/50]="selectedAccount()?.id === account.id"
                   [class.bg-slate-700]="selectedAccount()?.id === account.id">
                <div class="flex items-center gap-3">
                  @if (account.avatar) {
                    <img [src]="account.avatar" 
                         class="w-10 h-10 rounded-full object-cover"
                         [alt]="account.username">
                  } @else {
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {{ (account.username || account.phone || '?')[0].toUpperCase() }}
                    </div>
                  }
                  <div>
                    <div class="text-sm font-medium text-white">
                      {{ account.username || account.phone }}
                    </div>
                    <div class="text-xs text-slate-500">{{ account.phone }}</div>
                    <div class="flex items-center gap-2 text-xs mt-1">
                      @if (account.isListener) {
                        <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">監聽</span>
                      }
                      @if (account.isSender) {
                        <span class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">發送</span>
                      }
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full"
                          [class.bg-emerald-500]="account.status === 'connected'"
                          [class.bg-red-500]="account.status === 'error'"
                          [class.bg-slate-500]="account.status === 'disconnected'">
                    </span>
                    <span class="text-xs text-slate-400">
                      {{ account.status === 'connected' ? '已連接' : account.status === 'error' ? '錯誤' : '未連接' }}
                    </span>
                  </div>
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            } @empty {
              <div class="text-center py-12 text-slate-400">
                <div class="text-5xl mb-4">👤</div>
                <h3 class="text-lg font-medium text-white mb-2">暫無監控帳號</h3>
                <p class="text-sm mb-4">請在帳戶管理中添加帳號並設為監聽角色</p>
                <button (click)="navigateToAccountManagement()"
                        class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  + 添加帳號
                </button>
              </div>
            }
          </div>
        </div>

        <!-- 右側：帳號詳情 -->
        @if (selectedAccount()) {
          <div class="w-96 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-700/50">
              <h3 class="font-semibold text-white flex items-center gap-2">
                <span>📋</span> 帳號詳情
              </h3>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- 帳號信息 -->
              <div class="bg-slate-700/30 rounded-xl p-4 text-center">
                @if (selectedAccount()!.avatar) {
                  <img [src]="selectedAccount()!.avatar" 
                       class="w-20 h-20 rounded-full mx-auto mb-3 object-cover">
                } @else {
                  <div class="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                    {{ (selectedAccount()!.username || selectedAccount()!.phone || '?')[0].toUpperCase() }}
                  </div>
                }
                <h4 class="text-lg font-medium text-white">{{ selectedAccount()!.username || selectedAccount()!.phone }}</h4>
                <p class="text-sm text-slate-400">{{ selectedAccount()!.phone }}</p>
                <div class="flex items-center justify-center gap-2 mt-2">
                  <span class="w-2 h-2 rounded-full"
                        [class.bg-emerald-500]="selectedAccount()!.status === 'connected'"
                        [class.bg-red-500]="selectedAccount()!.status === 'error'"
                        [class.bg-slate-500]="selectedAccount()!.status === 'disconnected'">
                  </span>
                  <span class="text-sm"
                        [class.text-emerald-400]="selectedAccount()!.status === 'connected'"
                        [class.text-red-400]="selectedAccount()!.status === 'error'"
                        [class.text-slate-400]="selectedAccount()!.status === 'disconnected'">
                    {{ selectedAccount()!.status === 'connected' ? '已連接' : selectedAccount()!.status === 'error' ? '連接錯誤' : '未連接' }}
                  </span>
                </div>
              </div>

              <!-- 統計數據 -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-cyan-400">{{ selectedAccount()!.stats?.sentToday || 0 }}</div>
                  <div class="text-xs text-slate-500">今日發送</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-white">{{ selectedAccount()!.dailySendCount || 0 }}/{{ selectedAccount()!.dailySendLimit || 50 }}</div>
                  <div class="text-xs text-slate-500">發送配額</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-emerald-400">{{ selectedAccount()!.healthScore || 100 }}%</div>
                  <div class="text-xs text-slate-500">健康度</div>
                </div>
                <div class="bg-slate-700/30 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-purple-400">{{ selectedAccount()!.stats?.repliesWeek || 0 }}</div>
                  <div class="text-xs text-slate-500">本週回覆</div>
                </div>
              </div>

              <!-- 角色設置 -->
              <div class="bg-slate-700/30 rounded-xl p-4">
                <h4 class="text-sm font-medium text-slate-300 mb-3">角色設置</h4>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-blue-400">👁️</span>
                      <span class="text-sm text-white">監聽角色</span>
                    </div>
                    <label class="relative inline-flex cursor-pointer">
                      <input type="checkbox" 
                             [checked]="selectedAccount()!.isListener"
                             (change)="toggleListener()"
                             class="sr-only">
                      <div class="w-9 h-5 rounded-full transition-all"
                           [class.bg-blue-500]="selectedAccount()!.isListener"
                           [class.bg-slate-600]="!selectedAccount()!.isListener">
                        <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                             [class.left-4]="selectedAccount()!.isListener"
                             [class.left-0.5]="!selectedAccount()!.isListener">
                        </div>
                      </div>
                    </label>
                  </div>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-green-400">📤</span>
                      <span class="text-sm text-white">發送角色</span>
                    </div>
                    <label class="relative inline-flex cursor-pointer">
                      <input type="checkbox" 
                             [checked]="selectedAccount()!.isSender"
                             (change)="toggleSender()"
                             class="sr-only">
                      <div class="w-9 h-5 rounded-full transition-all"
                           [class.bg-green-500]="selectedAccount()!.isSender"
                           [class.bg-slate-600]="!selectedAccount()!.isSender">
                        <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                             [class.left-4]="selectedAccount()!.isSender"
                             [class.left-0.5]="!selectedAccount()!.isSender">
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <!-- 快捷操作 -->
              <div class="space-y-2">
                <button (click)="viewAccountDetails()"
                        class="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>📋</span> 查看完整詳情
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class MonitoringAccountsComponent implements OnInit {
  stateService = inject(MonitoringStateService);
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);

  // 配置動作事件
  configAction = output<string>();

  // 本地狀態
  selectedAccount = signal<MonitoringAccount | null>(null);

  ngOnInit() {
    // 載入數據
    this.stateService.loadAll();
  }

  refreshData() {
    this.stateService.refresh();
    this.toastService.info('正在刷新帳號列表...');
  }

  selectAccount(account: MonitoringAccount) {
    this.selectedAccount.set(account);
  }

  navigateToAccountManagement() {
    this.configAction.emit('goto-account-management');
    this.toastService.info('請在「帳戶管理」中添加帳號');
  }

  handleConfigAction(action: string) {
    this.configAction.emit(action);
  }

  toggleListener() {
    const account = this.selectedAccount();
    if (!account) return;

    const newRole = !account.isListener ? 'Listener' : (account.isSender ? 'Sender' : '');
    this.ipcService.send('update-account', {
      accountId: account.id,
      phone: account.phone,
      role: newRole
    });
    
    this.selectedAccount.update(a => a ? { ...a, isListener: !a.isListener } : null);
    this.toastService.success(
      !account.isListener 
        ? `已將 ${account.username || account.phone} 設為監聽帳號` 
        : `已取消 ${account.username || account.phone} 的監聽角色`
    );
  }

  toggleSender() {
    const account = this.selectedAccount();
    if (!account) return;

    const newRole = !account.isSender ? 'Sender' : (account.isListener ? 'Listener' : '');
    this.ipcService.send('update-account', {
      accountId: account.id,
      phone: account.phone,
      role: newRole
    });
    
    this.selectedAccount.update(a => a ? { ...a, isSender: !a.isSender } : null);
    this.toastService.success(
      !account.isSender 
        ? `已將 ${account.username || account.phone} 設為發送帳號` 
        : `已取消 ${account.username || account.phone} 的發送角色`
    );
  }

  viewAccountDetails() {
    this.configAction.emit('goto-account-management');
  }
}
