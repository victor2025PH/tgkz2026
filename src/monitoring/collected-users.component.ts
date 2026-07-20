/**
 * 收集用戶管理頁面
 * 顯示從群組收集的活躍用戶，識別廣告號
 */
import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';
import { EmptyStateComponent } from '../components/empty-state.component';

// 收集用戶接口
interface CollectedUser {
  id: number;
  telegram_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  ad_risk_score: number;
  risk_factors: any;
  is_ad_account: boolean | null;
  is_blacklisted: boolean;
  has_photo: boolean;
  is_premium: boolean;
  is_verified: boolean;
  is_bot: boolean;
  source_groups: string[];
  message_count: number;
  groups_count: number;
  value_level: string;
  activity_score: number;
  first_seen_at: string;
  last_seen_at: string;
  contacted: boolean;
  response_status: string;
  tags: string[];
  notes?: string;
}

// 統計接口
interface CollectedUsersStats {
  total: number;
  by_value_level: { S: number; A: number; B: number; C: number; D: number };
  by_risk: { low: number; medium: number; high: number };
  ad_accounts: number;
  blacklisted: number;
  with_username: number;
  premium: number;
}

@Component({
  selector: 'app-collected-users',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">👥</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">收集用戶</h1>
            <p class="text-sm text-slate-400">從群組自動收集的活躍用戶，智能識別廣告號</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="isLoading()">🔄</span>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="grid grid-cols-5 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
              <span class="text-violet-400">👥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-violet-400">{{ stats()?.total || 0 }}</div>
              <div class="text-xs text-slate-500">總收集</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">✓</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stats()?.by_risk?.low || 0 }}</div>
              <div class="text-xs text-slate-500">低風險</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span class="text-amber-400">⚠</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-amber-400">{{ stats()?.by_risk?.medium || 0 }}</div>
              <div class="text-xs text-slate-500">中風險</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <span class="text-red-400">🚫</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-red-400">{{ stats()?.ad_accounts || 0 }}</div>
              <div class="text-xs text-slate-500">廣告號</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">💎</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stats()?.premium || 0 }}</div>
              <div class="text-xs text-slate-500">Premium</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 篩選欄 -->
      <div class="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 mb-4">
        <div class="flex flex-wrap items-center gap-4">
          <!-- 風險篩選 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-400">風險等級:</span>
            <div class="flex gap-1">
              <button (click)="filterRisk = 'all'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-violet-500/20]="filterRisk === 'all'"
                      [class.text-violet-400]="filterRisk === 'all'"
                      [class.bg-slate-700]="filterRisk !== 'all'"
                      [class.text-slate-400]="filterRisk !== 'all'">
                全部
              </button>
              <button (click)="filterRisk = 'low'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-emerald-500/20]="filterRisk === 'low'"
                      [class.text-emerald-400]="filterRisk === 'low'"
                      [class.bg-slate-700]="filterRisk !== 'low'"
                      [class.text-slate-400]="filterRisk !== 'low'">
                🟢 安全
              </button>
              <button (click)="filterRisk = 'medium'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-amber-500/20]="filterRisk === 'medium'"
                      [class.text-amber-400]="filterRisk === 'medium'"
                      [class.bg-slate-700]="filterRisk !== 'medium'"
                      [class.text-slate-400]="filterRisk !== 'medium'">
                🟡 可疑
              </button>
              <button (click)="filterRisk = 'high'"
                      class="px-3 py-1 rounded text-xs transition-colors"
                      [class.bg-red-500/20]="filterRisk === 'high'"
                      [class.text-red-400]="filterRisk === 'high'"
                      [class.bg-slate-700]="filterRisk !== 'high'"
                      [class.text-slate-400]="filterRisk !== 'high'">
                🔴 高危
              </button>
            </div>
          </div>

          <!-- 價值等級篩選 -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-400">價值:</span>
            <div class="flex gap-1">
              @for (level of ['S', 'A', 'B', 'C', 'D']; track level) {
                <button (click)="toggleValueLevel(level)"
                        class="w-7 h-7 rounded text-xs font-bold transition-colors"
                        [class.bg-violet-500/20]="selectedValueLevels.includes(level)"
                        [class.text-violet-400]="selectedValueLevels.includes(level)"
                        [class.bg-slate-700]="!selectedValueLevels.includes(level)"
                        [class.text-slate-400]="!selectedValueLevels.includes(level)">
                  {{ level }}
                </button>
              }
            </div>
          </div>

          <!-- 其他篩選 -->
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="filterHasUsername"
                   class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500">
            <span class="text-sm text-slate-400">有用戶名</span>
          </label>
          
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="filterExcludeAds"
                   class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-violet-500">
            <span class="text-sm text-slate-400">排除廣告號</span>
          </label>

          <div class="flex-1"></div>

          <!-- 搜索 -->
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text" [(ngModel)]="searchQuery" (ngModelChange)="onSearchChange()"
                   placeholder="搜索用戶名..."
                   class="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm w-48">
          </div>
        </div>
      </div>

      <!-- 用戶列表 -->
      <div class="flex-1 overflow-hidden flex gap-4">
        <!-- 左側列表 -->
        <div class="flex-1 overflow-y-auto">
          @if (isLoading()) {
            <div class="flex items-center justify-center h-40">
              <div class="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
            </div>
          } @else if (filteredUsers().length === 0) {
            <app-empty-state iconKind="inbox" [compact]="true"
                             title="暫無收集的用戶"
                             description="開啟群組監控後，系統會自動收集發言者">
            </app-empty-state>
          } @else {
            <div class="grid gap-2">
              @for (user of filteredUsers(); track user.telegram_id) {
                <div (click)="selectUser(user)"
                     class="p-4 rounded-xl cursor-pointer transition-all border"
                     [class.bg-violet-500/10]="selectedUser()?.telegram_id === user.telegram_id"
                     [class.border-violet-500/50]="selectedUser()?.telegram_id === user.telegram_id"
                     [class.bg-slate-800/50]="selectedUser()?.telegram_id !== user.telegram_id"
                     [class.border-slate-700/50]="selectedUser()?.telegram_id !== user.telegram_id"
                     [class.hover:bg-slate-700/50]="selectedUser()?.telegram_id !== user.telegram_id">
                  <div class="flex items-center gap-3">
                    <!-- 頭像/風險指示 -->
                    <div class="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                         [class.bg-emerald-500/20]="user.ad_risk_score < 0.4"
                         [class.bg-amber-500/20]="user.ad_risk_score >= 0.4 && user.ad_risk_score < 0.7"
                         [class.bg-red-500/20]="user.ad_risk_score >= 0.7">
                      @if (user.is_ad_account) {
                        🚫
                      } @else if (user.is_blacklisted) {
                        ⛔
                      } @else if (!user.has_photo) {
                        👤
                      } @else {
                        {{ (user.first_name || user.username || '?')[0].toUpperCase() }}
                      }
                    </div>
                    
                    <!-- 用戶信息 -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-white truncate">
                          {{ user.first_name || user.username || 'ID:' + user.telegram_id }}
                        </span>
                        @if (user.username) {
                          <span class="text-xs text-slate-500">@{{ user.username }}</span>
                        }
                        @if (user.is_premium) {
                          <span class="text-xs">💎</span>
                        }
                        @if (user.is_verified) {
                          <span class="text-xs">✓</span>
                        }
                      </div>
                      <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>📊 {{ user.message_count }} 條消息</span>
                        <span>👥 {{ user.groups_count }} 個群</span>
                      </div>
                    </div>
                    
                    <!-- 風險評分 -->
                    <div class="text-right">
                      <div class="text-lg font-bold"
                           [class.text-emerald-400]="user.ad_risk_score < 0.4"
                           [class.text-amber-400]="user.ad_risk_score >= 0.4 && user.ad_risk_score < 0.7"
                           [class.text-red-400]="user.ad_risk_score >= 0.7">
                        {{ (user.ad_risk_score * 100).toFixed(0) }}%
                      </div>
                      <div class="text-xs px-2 py-0.5 rounded"
                           [class.bg-violet-500/20]="user.value_level === 'S'"
                           [class.text-violet-400]="user.value_level === 'S'"
                           [class.bg-blue-500/20]="user.value_level === 'A'"
                           [class.text-blue-400]="user.value_level === 'A'"
                           [class.bg-emerald-500/20]="user.value_level === 'B'"
                           [class.text-emerald-400]="user.value_level === 'B'"
                           [class.bg-slate-500/20]="user.value_level === 'C' || user.value_level === 'D'"
                           [class.text-slate-400]="user.value_level === 'C' || user.value_level === 'D'">
                        {{ user.value_level }}級
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <!-- 右側詳情 -->
        @if (selectedUser()) {
          <div class="w-96 bg-slate-800/30 rounded-xl border border-slate-700/50 p-4 overflow-y-auto">
            <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span>📋</span> 用戶詳情
            </h3>

            <!-- 基本信息 -->
            <div class="space-y-3 mb-6">
              <div class="flex justify-between">
                <span class="text-slate-400">Telegram ID</span>
                <span class="text-white font-mono">{{ selectedUser()!.telegram_id }}</span>
              </div>
              @if (selectedUser()!.username) {
                <div class="flex justify-between">
                  <span class="text-slate-400">用戶名</span>
                  <span class="text-cyan-400">@{{ selectedUser()!.username }}</span>
                </div>
              }
              <div class="flex justify-between">
                <span class="text-slate-400">姓名</span>
                <span class="text-white">{{ selectedUser()!.first_name }} {{ selectedUser()!.last_name }}</span>
              </div>
            </div>

            <!-- 風險評估 -->
            <div class="bg-slate-700/30 rounded-lg p-3 mb-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-slate-400">廣告風險</span>
                <span class="text-lg font-bold"
                      [class.text-emerald-400]="selectedUser()!.ad_risk_score < 0.4"
                      [class.text-amber-400]="selectedUser()!.ad_risk_score >= 0.4 && selectedUser()!.ad_risk_score < 0.7"
                      [class.text-red-400]="selectedUser()!.ad_risk_score >= 0.7">
                  {{ (selectedUser()!.ad_risk_score * 100).toFixed(1) }}%
                </span>
              </div>
              <div class="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                <div class="h-full transition-all"
                     [style.width.%]="selectedUser()!.ad_risk_score * 100"
                     [class.bg-emerald-500]="selectedUser()!.ad_risk_score < 0.4"
                     [class.bg-amber-500]="selectedUser()!.ad_risk_score >= 0.4 && selectedUser()!.ad_risk_score < 0.7"
                     [class.bg-red-500]="selectedUser()!.ad_risk_score >= 0.7">
                </div>
              </div>
            </div>

            <!-- 風險因素 -->
            @if (selectedUser()!.risk_factors?.factors?.length) {
              <div class="mb-4">
                <h4 class="text-sm font-medium text-slate-300 mb-2">風險因素</h4>
                <div class="space-y-1">
                  @for (factor of selectedUser()!.risk_factors.factors; track $index) {
                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-amber-400">⚠️</span>
                      <span class="text-slate-300">{{ factor.description }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- 操作按鈕 -->
            <div class="space-y-2">
              @if (!selectedUser()!.is_ad_account) {
                <button (click)="markAsAd(true)"
                        class="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                  🚫 標記為廣告號
                </button>
              } @else {
                <button (click)="markAsAd(false)"
                        class="w-full px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors">
                  ✓ 取消廣告標記
                </button>
              }
              
              @if (!selectedUser()!.is_blacklisted) {
                <button (click)="blacklistUser(true)"
                        class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                  ⛔ 加入黑名單
                </button>
              } @else {
                <button (click)="blacklistUser(false)"
                        class="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
                  ↩️ 移出黑名單
                </button>
              }
              
              <button (click)="recalculateRisk()"
                      class="w-full px-4 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg transition-colors">
                🔄 重新計算風險
              </button>
              
              @if (selectedUser()!.username) {
                <button (click)="openInTelegram()"
                        class="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                  💬 在 Telegram 查看
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class CollectedUsersComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // 數據
  users = signal<CollectedUser[]>([]);
  stats = signal<CollectedUsersStats | null>(null);
  selectedUser = signal<CollectedUser | null>(null);
  isLoading = signal(false);

  // 篩選
  filterRisk: 'all' | 'low' | 'medium' | 'high' = 'all';
  selectedValueLevels: string[] = [];
  filterHasUsername = false;
  filterExcludeAds = true;
  searchQuery = '';

  private listeners: (() => void)[] = [];

  // 計算篩選後的用戶
  filteredUsers = computed(() => {
    let result = this.users();

    // 風險篩選
    if (this.filterRisk === 'low') {
      result = result.filter(u => u.ad_risk_score < 0.4);
    } else if (this.filterRisk === 'medium') {
      result = result.filter(u => u.ad_risk_score >= 0.4 && u.ad_risk_score < 0.7);
    } else if (this.filterRisk === 'high') {
      result = result.filter(u => u.ad_risk_score >= 0.7);
    }

    // 價值等級篩選
    if (this.selectedValueLevels.length > 0) {
      result = result.filter(u => this.selectedValueLevels.includes(u.value_level));
    }

    // 有用戶名篩選
    if (this.filterHasUsername) {
      result = result.filter(u => u.username);
    }

    // 排除廣告號
    if (this.filterExcludeAds) {
      result = result.filter(u => !u.is_ad_account);
    }

    // 搜索
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        u.username?.toLowerCase().includes(query) ||
        u.first_name?.toLowerCase().includes(query) ||
        u.telegram_id.includes(query)
      );
    }

    return result;
  });

  ngOnInit() {
    this.setupListeners();
    this.loadData();
  }

  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }

  setupListeners() {
    const cleanup1 = this.ipcService.on('collected-users-result', (data: any) => {
      this.isLoading.set(false);
      if (data.success) {
        this.users.set(data.users || []);
      }
    });
    this.listeners.push(cleanup1);

    const cleanup2 = this.ipcService.on('collected-users-stats-result', (data: any) => {
      if (data.success) {
        this.stats.set(data.stats);
      }
    });
    this.listeners.push(cleanup2);

    const cleanup3 = this.ipcService.on('mark-user-as-ad-result', (data: any) => {
      if (data.success) {
        this.toastService.success(data.isAd ? '已標記為廣告號' : '已取消廣告標記');
        this.loadData();
      }
    });
    this.listeners.push(cleanup3);

    const cleanup4 = this.ipcService.on('blacklist-user-result', (data: any) => {
      if (data.success) {
        this.toastService.success(data.blacklisted ? '已加入黑名單' : '已移出黑名單');
        this.loadData();
      }
    });
    this.listeners.push(cleanup4);

    const cleanup5 = this.ipcService.on('recalculate-risk-result', (data: any) => {
      if (data.success) {
        this.toastService.success(`風險評分已更新: ${(data.riskScore * 100).toFixed(1)}%`);
        this.loadData();
      }
    });
    this.listeners.push(cleanup5);
  }

  loadData() {
    this.isLoading.set(true);
    this.ipcService.send('get-collected-users', {
      filters: {
        exclude_blacklist: false,
        order_by: 'last_seen_at DESC'
      },
      limit: 500
    });
    this.ipcService.send('get-collected-users-stats', {});
  }

  refreshData() {
    this.loadData();
  }

  onSearchChange() {
    // 觸發計算屬性重新計算
  }

  toggleValueLevel(level: string) {
    const index = this.selectedValueLevels.indexOf(level);
    if (index >= 0) {
      this.selectedValueLevels.splice(index, 1);
    } else {
      this.selectedValueLevels.push(level);
    }
  }

  selectUser(user: CollectedUser) {
    this.selectedUser.set(user);
  }

  markAsAd(isAd: boolean) {
    const user = this.selectedUser();
    if (!user) return;

    this.ipcService.send('mark-user-as-ad', {
      telegramId: user.telegram_id,
      isAd
    });
  }

  blacklistUser(blacklist: boolean) {
    const user = this.selectedUser();
    if (!user) return;

    this.ipcService.send('blacklist-user', {
      telegramId: user.telegram_id,
      blacklist
    });
  }

  recalculateRisk() {
    const user = this.selectedUser();
    if (!user) return;

    this.ipcService.send('recalculate-user-risk', {
      telegramId: user.telegram_id
    });
  }

  openInTelegram() {
    const user = this.selectedUser();
    if (!user?.username) return;

    window.open(`https://t.me/${user.username}`, '_blank');
  }
}
