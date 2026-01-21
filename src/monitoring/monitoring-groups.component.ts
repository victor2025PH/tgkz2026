/**
 * 監控群組管理頁面
 * 使用 MonitoringStateService 統一管理數據
 */
import { Component, signal, computed, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringStateService, MonitoringGroup } from './monitoring-state.service';
import { ConfigProgressComponent } from './config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';

@Component({
  selector: 'app-monitoring-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfigProgressComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">👥</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">監控群組管理</h1>
            <p class="text-sm text-slate-400">管理正在監控的 Telegram 群組</p>
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
              <span class="text-emerald-400">💬</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.groups().length }}</div>
              <div class="text-xs text-slate-500">監控群組</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">👥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stateService.totalMembers() | number }}</div>
              <div class="text-xs text-slate-500">總成員</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span class="text-orange-400">🔥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-400">{{ stateService.todayMatches() }}</div>
              <div class="text-xs text-slate-500">今日匹配</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">🔗</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.groupsWithKeywords().length }}</div>
              <div class="text-xs text-slate-500">已綁定詞集</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 群組面板 -->
      <div class="flex-1 overflow-hidden flex gap-6">
        <!-- 左側：群組列表 -->
        <div class="flex-1 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>👥</span> 監控群組
              <span class="text-xs text-slate-500">({{ stateService.groups().length }})</span>
            </h3>
            <button (click)="navigateToResourceCenter()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + 添加群組
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            @for (group of stateService.groups(); track group.id) {
              <div (click)="selectGroup(group)"
                   class="p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent hover:border-cyan-500/30"
                   [class.border-cyan-500/50]="selectedGroup()?.id === group.id"
                   [class.bg-slate-700]="selectedGroup()?.id === group.id">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-xl">
                      {{ group.name[0] }}
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">{{ group.name }}</div>
                      <div class="text-xs text-slate-500 truncate">{{ group.url }}</div>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" 
                       fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
                
                <!-- 統計行 -->
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-3">
                    <span class="text-slate-400">👥 {{ group.memberCount | number }}</span>
                    @if (group.stats?.matchesToday && group.stats.matchesToday > 0) {
                      <span class="text-orange-400">🔥 {{ group.stats.matchesToday }} 匹配</span>
                    }
                    @if (group.stats?.leadsToday && group.stats.leadsToday > 0) {
                      <span class="text-emerald-400">✨ {{ group.stats.leadsToday }} leads</span>
                    }
                  </div>
                </div>
                
                <!-- 綁定的詞集標籤 -->
                @if (group.linkedKeywordSets.length > 0) {
                  <div class="flex flex-wrap gap-1 mt-2">
                    @for (setId of group.linkedKeywordSets.slice(0, 3); track setId) {
                      <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        🔑 {{ stateService.getKeywordSetName(setId) }}
                      </span>
                    }
                    @if (group.linkedKeywordSets.length > 3) {
                      <span class="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">
                        +{{ group.linkedKeywordSets.length - 3 }}
                      </span>
                    }
                  </div>
                } @else {
                  <div class="mt-2">
                    <span class="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                      ⚠️ 未綁定詞集
                    </span>
                  </div>
                }
              </div>
            } @empty {
              <div class="text-center py-12 text-slate-400">
                <div class="text-5xl mb-4">👥</div>
                <h3 class="text-lg font-medium text-white mb-2">還沒有監控群組</h3>
                <p class="text-sm mb-4">請在資源中心搜索並添加群組</p>
                <button (click)="navigateToResourceCenter()"
                        class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                  + 添加第一個群組
                </button>
              </div>
            }
          </div>
        </div>

        <!-- 右側：群組詳情 -->
        @if (selectedGroup()) {
          <div class="w-96 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
            <div class="p-4 border-b border-slate-700/50">
              <h3 class="font-semibold text-white flex items-center gap-2">
                <span>📋</span> 群組詳情
              </h3>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- 基本信息 -->
              <div class="bg-slate-700/30 rounded-xl p-4">
                <h4 class="text-lg font-medium text-white mb-2">{{ selectedGroup()!.name }}</h4>
                <p class="text-sm text-slate-400 mb-3 break-all">{{ selectedGroup()!.url }}</p>
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center">
                    <div class="text-xl font-bold text-cyan-400">{{ selectedGroup()!.memberCount | number }}</div>
                    <div class="text-xs text-slate-500">成員數</div>
                  </div>
                  <div class="text-center">
                    <div class="text-xl font-bold text-orange-400">{{ selectedGroup()!.stats?.matchesToday || 0 }}</div>
                    <div class="text-xs text-slate-500">今日匹配</div>
                  </div>
                </div>
              </div>

              <!-- 帳號信息 -->
              <div class="bg-slate-700/30 rounded-xl p-4">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>📱</span> 監控帳號
                </h4>
                @if (selectedGroup()!.accountPhone) {
                  <div class="flex items-center gap-3 p-2 bg-slate-600/30 rounded-lg">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {{ getAccountInitial(selectedGroup()!.accountPhone) }}
                    </div>
                    <div class="flex-1">
                      <div class="text-sm text-white">{{ getAccountName(selectedGroup()!.accountPhone) }}</div>
                      <div class="text-xs text-slate-500">{{ selectedGroup()!.accountPhone }}</div>
                    </div>
                    <div class="flex gap-1">
                      @if (isListenerAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">監聽</span>
                      }
                      @if (isSenderAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">發送</span>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-3 text-slate-500 text-sm">
                    <p>尚未分配監控帳號</p>
                  </div>
                }
              </div>

              <!-- 綁定的詞集 -->
              <div class="bg-slate-700/30 rounded-xl p-4">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>🔑</span> 綁定的關鍵詞集
                </h4>
                @if (selectedGroup()!.linkedKeywordSets.length > 0) {
                  <div class="space-y-2">
                    @for (setId of selectedGroup()!.linkedKeywordSets; track setId) {
                      <div class="flex items-center justify-between p-2 bg-slate-600/30 rounded-lg">
                        <span class="text-sm text-white">{{ stateService.getKeywordSetName(setId) }}</span>
                        <button (click)="unbindKeywordSet(setId)"
                                class="p-1 hover:bg-red-500/20 rounded text-red-400 text-xs">
                          解綁
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-slate-500">尚未綁定關鍵詞集</p>
                }
                
                <!-- 可綁定的詞集 -->
                @if (availableKeywordSets().length > 0) {
                  <div class="mt-3 pt-3 border-t border-slate-600/50">
                    <p class="text-xs text-slate-500 mb-2">點擊綁定詞集：</p>
                    <div class="flex flex-wrap gap-1">
                      @for (set of availableKeywordSets(); track set.id) {
                        <button (click)="bindKeywordSet(set.id)"
                                class="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded text-xs transition-colors">
                          + {{ set.name }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- 快捷操作 -->
              <div class="space-y-2">
                <div class="relative group/extract">
                  <button (click)="extractMembers()"
                          class="w-full px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <span>👥</span> 提取群成員
                  </button>
                  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-700 text-xs text-slate-300 rounded-lg opacity-0 group-hover/extract:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    💡 需要群組管理員權限才能提取成員
                  </div>
                </div>
                <button (click)="copyGroupLink()"
                        class="w-full px-4 py-2.5 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>📋</span> 複製鏈接
                </button>
                <button (click)="openInTelegram()"
                        class="w-full px-4 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>🔗</span> 在 Telegram 打開
                </button>
                <button (click)="removeGroup()"
                        class="w-full px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>🗑️</span> 移除監控
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class MonitoringGroupsComponent implements OnInit {
  stateService = inject(MonitoringStateService);
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // 配置動作事件
  configAction = output<string>();
  extractMembersEvent = output<MonitoringGroup>();

  // 本地狀態
  selectedGroup = signal<MonitoringGroup | null>(null);

  // 計算可綁定的詞集
  availableKeywordSets = computed(() => {
    const selected = this.selectedGroup();
    if (!selected) return [];
    return this.stateService.keywordSets().filter(s => !selected.linkedKeywordSets.includes(s.id));
  });

  ngOnInit() {
    this.stateService.loadAll();
    this.setupListeners();
  }

  private listeners: (() => void)[] = [];

  setupListeners() {
    // 監聽綁定結果
    const cleanup1 = this.ipcService.on('bind-keyword-set-result', (data: any) => {
      if (data.success && data.currentKeywordSetIds) {
        // 更新本地狀態
        this.stateService.updateGroupKeywordSets(String(data.groupId), data.currentKeywordSetIds.map((id: any) => String(id)));
        // 更新選中的群組
        const selected = this.selectedGroup();
        if (selected && String(selected.id) === String(data.groupId)) {
          this.selectedGroup.update(g => g ? { ...g, linkedKeywordSets: data.currentKeywordSetIds.map((id: any) => String(id)) } : null);
        }
      }
    });
    this.listeners.push(cleanup1);

    // 監聽解綁結果
    const cleanup2 = this.ipcService.on('unbind-keyword-set-result', (data: any) => {
      if (data.success && data.currentKeywordSetIds) {
        // 更新本地狀態
        this.stateService.updateGroupKeywordSets(String(data.groupId), data.currentKeywordSetIds.map((id: any) => String(id)));
        // 更新選中的群組
        const selected = this.selectedGroup();
        if (selected && String(selected.id) === String(data.groupId)) {
          this.selectedGroup.update(g => g ? { ...g, linkedKeywordSets: data.currentKeywordSetIds.map((id: any) => String(id)) } : null);
        }
      }
    });
    this.listeners.push(cleanup2);
  }

  // 帳號相關方法
  getAccountInitial(phone: string): string {
    const account = this.stateService.accounts().find(a => a.phone === phone);
    if (account?.username) {
      return account.username[0].toUpperCase();
    }
    return phone ? phone.slice(-2) : '?';
  }

  getAccountName(phone: string): string {
    const account = this.stateService.accounts().find(a => a.phone === phone);
    return account?.username || account?.firstName || phone || '未知帳號';
  }

  isListenerAccount(phone: string): boolean {
    const account = this.stateService.accounts().find(a => a.phone === phone);
    return account?.isListener ?? false;
  }

  isSenderAccount(phone: string): boolean {
    const account = this.stateService.accounts().find(a => a.phone === phone);
    return account?.isSender ?? false;
  }

  refreshData() {
    this.stateService.refresh();
    this.toastService.info('正在刷新群組列表...');
  }

  selectGroup(group: MonitoringGroup) {
    this.selectedGroup.set(group);
  }

  navigateToResourceCenter() {
    this.configAction.emit('goto-resource-center');
    this.toastService.info('請在「資源中心」搜索並添加群組');
  }

  handleConfigAction(action: string) {
    this.configAction.emit(action);
  }

  bindKeywordSet(setId: string) {
    const group = this.selectedGroup();
    if (!group) {
      console.log('[Groups] bindKeywordSet: No group selected');
      return;
    }

    const payload = {
      groupId: parseInt(group.id),
      keywordSetId: parseInt(setId)
    };
    console.log('[Groups] ========== bindKeywordSet ==========');
    console.log('[Groups] Sending bind-keyword-set with payload:', payload);
    
    this.ipcService.send('bind-keyword-set', payload);
    
    // 更新選中的群組
    const updatedLinkedSets = [...group.linkedKeywordSets, setId];
    this.selectedGroup.update(g => g ? { ...g, linkedKeywordSets: updatedLinkedSets } : null);
    
    // 同步更新 stateService 中的群組數據
    this.stateService.updateGroupKeywordSets(group.id, updatedLinkedSets);
    
    console.log('[Groups] Updated linkedKeywordSets:', updatedLinkedSets);
    this.toastService.success(`✅ 詞集已綁定到 ${group.name}`);
  }

  unbindKeywordSet(setId: string) {
    const group = this.selectedGroup();
    if (!group) return;

    this.ipcService.send('unbind-keyword-set', {
      groupId: parseInt(group.id),
      keywordSetId: parseInt(setId)
    });
    
    // 更新選中的群組
    const updatedLinkedSets = group.linkedKeywordSets.filter(id => id !== setId);
    this.selectedGroup.update(g => g ? { ...g, linkedKeywordSets: updatedLinkedSets } : null);
    
    // 同步更新 stateService 中的群組數據
    this.stateService.updateGroupKeywordSets(group.id, updatedLinkedSets);
    
    this.toastService.info(`已從 ${group.name} 解綁詞集`);
  }

  extractMembers() {
    const group = this.selectedGroup();
    if (!group) return;

    this.extractMembersEvent.emit(group);
    
    // 從 URL 中提取 username 或 chat_id
    // 支持格式：https://t.me/username 或 https://t.me/+inviteHash
    let chatId = '';
    if (group.url) {
      const match = group.url.match(/t\.me\/([+\w]+)/);
      if (match) {
        chatId = match[1];
      }
    }
    
    this.ipcService.send('extract-members', {
      chatId: chatId || group.url,  // 後端期望的參數名
      username: chatId,
      resourceId: group.id,  // 資源 ID 作為備用
      groupName: group.name
    });
    this.toastService.info(`🔄 正在提取 ${group.name} 的成員...`);
  }

  copyGroupLink() {
    const group = this.selectedGroup();
    if (!group) return;

    navigator.clipboard.writeText(group.url || '');
    this.toastService.success('📋 已複製群組鏈接');
  }

  openInTelegram() {
    const group = this.selectedGroup();
    if (!group?.url) return;

    window.open(group.url, '_blank');
  }

  async removeGroup() {
    const group = this.selectedGroup();
    if (!group) return;

    const confirmed = await this.confirmDialog.danger(
      '移除監控群組',
      `確定要移除監控群組「${group.name}」嗎？\n移除後將停止監控此群組的消息。`,
      [group.name || group.url || '']
    );

    if (confirmed) {
      this.ipcService.send('remove-group', { id: parseInt(group.id) });
      this.selectedGroup.set(null);
      this.toastService.success(`🗑️ 已移除 ${group.name}`);
      
      // 刷新數據
      setTimeout(() => this.stateService.refresh(), 500);
    }
  }
}
