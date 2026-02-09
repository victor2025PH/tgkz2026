/**
 * 監控群組管理頁面
 * 使用 MonitoringStateService 統一管理數據
 */
import { Component, signal, computed, inject, OnInit, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringStateService, MonitoringGroup } from './monitoring-state.service';
import { ConfigProgressComponent } from './config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';
import { HistoryCollectionDialogComponent, HistoryCollectionGroupInfo, CollectionResult } from '../dialogs/history-collection-dialog.component';

@Component({
  selector: 'app-monitoring-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfigProgressComponent, HistoryCollectionDialogComponent],
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
          
          <!-- 🆕 批量刷新成員數按鈕 -->
          <button (click)="refreshAllMemberCounts()"
                  [disabled]="isRefreshingMemberCounts()"
                  class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors flex items-center gap-2 border border-purple-500/30 disabled:opacity-50">
            <span [class.animate-spin]="isRefreshingMemberCounts()">👥</span>
            <span>{{ isRefreshingMemberCounts() ? '刷新中...' : '刷新成員數' }}</span>
          </button>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">🔄</span>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <!-- 統計卡片 - 🔧 美化優化 -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-xl border border-emerald-500/20 p-4 hover:border-emerald-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">💬</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.groups().length }}</div>
              <div class="text-xs text-slate-400">監控群組</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 rounded-xl border border-cyan-500/20 p-4 hover:border-cyan-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">👥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stateService.totalMembers() | number }}</div>
              <div class="text-xs text-slate-400">總成員</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl border border-orange-500/20 p-4 hover:border-orange-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">🔥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-400">{{ stateService.todayMatches() }}</div>
              <div class="text-xs text-slate-400">今日匹配</div>
            </div>
          </div>
        </div>
        <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-xl border border-purple-500/20 p-4 hover:border-purple-500/40 transition-colors">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <span class="text-2xl">🔗</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.groupsWithKeywords().length }}</div>
              <div class="text-xs text-slate-400">已綁定詞集</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 群組列表 - 🔧 改為全寬度 -->
      <div class="flex-1 overflow-hidden">
        <div class="h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>👥</span> 監控群組
              <span class="text-xs text-slate-500">({{ stateService.groups().length }})</span>
            </h3>
            <div class="flex items-center gap-2">
              <button (click)="showQuickAddDialog.set(true)"
                      class="text-sm px-3 py-1.5 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors border border-cyan-500/30">
                + 快速添加
              </button>
              <button (click)="navigateToResourceCenter()"
                      class="text-sm text-slate-400 hover:text-cyan-300 transition-colors">
                搜索發現 →
              </button>
            </div>
          </div>
          
          <!-- 🆕 P2: 快速添加群組對話框 -->
          @if (showQuickAddDialog()) {
            <div class="p-4 border-b border-slate-700/50 bg-slate-800/80">
              <div class="flex items-center gap-3">
                <input type="text"
                       [(ngModel)]="quickAddUrl"
                       (keydown.enter)="quickAddGroup()"
                       placeholder="輸入群組鏈接，如 https://t.me/groupname 或 @groupname"
                       class="flex-1 px-4 py-2.5 bg-slate-700/80 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30">
                <button (click)="quickAddGroup()"
                        [disabled]="isQuickAdding() || !quickAddUrl.trim()"
                        class="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg text-sm transition-colors whitespace-nowrap">
                  {{ isQuickAdding() ? '加入中...' : '加入並監控' }}
                </button>
                <button (click)="showQuickAddDialog.set(false)"
                        class="px-3 py-2.5 text-slate-400 hover:text-white transition-colors">
                  ✕
                </button>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                支持格式：t.me/groupname、@groupname、邀請鏈接 https://t.me/+xxxxx
              </p>
            </div>
          }
          
          <!-- 🔧 網格佈局 - 修復溢出問題 -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (group of stateService.groups(); track group.id) {
                <!-- 🔧 添加 overflow-hidden 防止內容溢出 -->
                <div (click)="openGroupDetail(group)"
                     class="p-4 bg-slate-800/60 rounded-xl hover:bg-slate-700/80 transition-all cursor-pointer group border border-slate-700/50 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 overflow-hidden">
                  
                  <!-- 頭部：頭像 + 名稱 + 類型標籤 -->
                  <div class="flex items-start gap-3 mb-3">
                    <!-- 頭像 - 固定尺寸 -->
                    <div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold flex-shrink-0 border"
                         [class.bg-gradient-to-br]="true"
                         [class.from-emerald-500/30]="group.resourceType !== 'channel'"
                         [class.to-teal-500/30]="group.resourceType !== 'channel'"
                         [class.text-emerald-400]="group.resourceType !== 'channel'"
                         [class.border-emerald-500/20]="group.resourceType !== 'channel'"
                         [class.from-blue-500/30]="group.resourceType === 'channel'"
                         [class.to-indigo-500/30]="group.resourceType === 'channel'"
                         [class.text-blue-400]="group.resourceType === 'channel'"
                         [class.border-blue-500/20]="group.resourceType === 'channel'">
                      {{ group.resourceType === 'channel' ? '📢' : group.name[0] }}
                    </div>
                    <!-- 文字區 - 限制寬度防止溢出 -->
                    <div class="flex-1 min-w-0 overflow-hidden">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-white truncate text-sm leading-tight" [title]="group.name">
                          {{ group.name }}
                        </span>
                        <!-- 🆕 群組類型標籤 -->
                        @if (group.resourceType === 'channel') {
                          <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded flex-shrink-0">
                            頻道
                          </span>
                        } @else if (group.resourceType === 'supergroup') {
                          <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded flex-shrink-0">
                            超級群
                          </span>
                        }
                      </div>
                      <div class="text-xs text-slate-500 truncate mt-0.5" [title]="group.url">
                        {{ group.url }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- 統計行 -->
                  <div class="flex items-center justify-between text-xs mb-3 px-1">
                    <div class="flex items-center gap-2">
                      <span class="text-slate-400 flex items-center gap-1">
                        <span class="text-base">👥</span>
                        <span class="font-medium">{{ group.memberCount | number }}</span>
                      </span>
                      @if (group.stats?.matchesToday && group.stats.matchesToday > 0) {
                        <span class="text-orange-400 flex items-center gap-1">
                          <span>🔥</span>
                          <span>{{ group.stats.matchesToday }}</span>
                        </span>
                      }
                    </div>
                    <span class="text-cyan-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      查看詳情 →
                    </span>
                  </div>
                  
                  <!-- 綁定的詞集標籤 - 限制高度防止溢出 -->
                  <div class="flex flex-wrap gap-1.5 overflow-hidden max-h-[52px]">
                    @if (group.linkedKeywordSets.length > 0) {
                      @for (setId of group.linkedKeywordSets.slice(0, 2); track setId) {
                        <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-md truncate max-w-[120px]" 
                              [title]="stateService.getKeywordSetName(setId)">
                          🔑 {{ stateService.getKeywordSetName(setId) }}
                        </span>
                      }
                      @if (group.linkedKeywordSets.length > 2) {
                        <span class="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded-md">
                          +{{ group.linkedKeywordSets.length - 2 }}
                        </span>
                      }
                    } @else {
                      <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md">
                        ⚠️ 未綁定詞集
                      </span>
                    }
                  </div>
                </div>
              } @empty {
                <div class="col-span-full text-center py-16 text-slate-400">
                  <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800/50 flex items-center justify-center">
                    <span class="text-4xl">👥</span>
                  </div>
                  <h3 class="text-lg font-medium text-white mb-2">還沒有監控群組</h3>
                  <p class="text-sm mb-6 text-slate-500">添加群組開始監控關鍵詞</p>
                  <div class="flex items-center justify-center gap-3">
                    <button (click)="showQuickAddDialog.set(true)"
                            class="px-5 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors">
                      + 快速添加群組
                    </button>
                    <button (click)="navigateToResourceCenter()"
                            class="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                      搜索發現 →
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 🆕 群組詳情彈窗 -->
    @if (showDetailDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- 遮罩層 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" 
             (click)="closeDetailDialog()"></div>
        
        <!-- 彈窗內容 -->
        <div class="relative w-full max-w-lg max-h-[85vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <!-- 彈窗頭部 -->
          <div class="flex items-center justify-between p-5 border-b border-slate-700/50">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>📋</span> 群組詳情
            </h3>
            <button (click)="closeDetailDialog()" 
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          
          <!-- 彈窗內容區 -->
          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            @if (selectedGroup()) {
              <!-- 基本信息 -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-3xl font-bold text-emerald-400">
                    {{ selectedGroup()!.name[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h4 class="text-xl font-medium text-white truncate">{{ selectedGroup()!.name }}</h4>
                    <p class="text-sm text-slate-400 truncate">{{ selectedGroup()!.url }}</p>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div class="text-2xl font-bold text-cyan-400">{{ selectedGroup()!.memberCount | number }}</div>
                    <div class="text-xs text-slate-500">成員數</div>
                  </div>
                  <div class="text-center p-3 bg-slate-700/30 rounded-lg">
                    <div class="text-2xl font-bold text-orange-400">{{ selectedGroup()!.stats?.matchesToday || 0 }}</div>
                    <div class="text-xs text-slate-500">今日匹配</div>
                  </div>
                </div>
              </div>

              <!-- 帳號信息 -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>📱</span> 監控帳號
                </h4>
                @if (selectedGroup()!.accountPhone) {
                  <div class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {{ getAccountInitial(selectedGroup()!.accountPhone) }}
                    </div>
                    <div class="flex-1">
                      <div class="text-sm text-white font-medium">{{ getAccountName(selectedGroup()!.accountPhone) }}</div>
                      <div class="text-xs text-slate-500">{{ selectedGroup()!.accountPhone }}</div>
                    </div>
                    <div class="flex gap-1">
                      @if (isListenerAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">監聽</span>
                      }
                      @if (isSenderAccount(selectedGroup()!.accountPhone)) {
                        <span class="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">發送</span>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="text-center py-4 text-slate-500 text-sm bg-slate-700/30 rounded-lg">
                    <p>尚未分配監控帳號</p>
                  </div>
                }
              </div>
              
              <!-- 🆕 用戶收集 - 突出的功能區塊 -->
              <div class="bg-gradient-to-br from-orange-500/10 to-amber-500/5 rounded-xl p-4 border border-orange-500/30">
                <h4 class="text-sm font-medium text-orange-400 mb-3 flex items-center justify-between">
                  <span class="flex items-center gap-2">
                    <span>🔄</span> 從歷史消息收集用戶
                  </span>
                  <span class="text-xs text-slate-500">替代成員提取</span>
                </h4>
                
                <!-- 統計卡片 -->
                <div class="grid grid-cols-3 gap-2 mb-4">
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-cyan-400">{{ monitoredMessagesCount() | number }}</div>
                    <div class="text-[10px] text-slate-500">監控消息</div>
                  </div>
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-emerald-400">{{ collectedUsersCount() }}</div>
                    <div class="text-[10px] text-slate-500">已收集</div>
                  </div>
                  <div class="p-2 bg-slate-800/50 rounded-lg text-center">
                    <div class="text-lg font-bold text-purple-400">{{ estimatedNewUsers() }}</div>
                    <div class="text-[10px] text-slate-500">可收集</div>
                  </div>
                </div>
                
                <!-- 主要操作按鈕 - 突出顯示 -->
                <button (click)="openHistoryCollectionDialog()"
                        [disabled]="monitoredMessagesCount() === 0"
                        class="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700">
                  <span class="text-base">🔄</span>
                  <span>開始收集用戶</span>
                  @if (monitoredMessagesCount() > 0) {
                    <span class="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      可收集 ~{{ estimatedNewUsers() }} 人
                    </span>
                  }
                </button>
                
                <!-- 次要操作 -->
                <div class="flex gap-2 mt-3">
                  @if (collectedUsersCount() > 0) {
                    <button (click)="viewCollectedUsers()"
                            class="flex-1 px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5">
                      <span>👁️</span>
                      <span>查看已收集 ({{ collectedUsersCount() }})</span>
                    </button>
                  }
                  <button (click)="refreshCollectedStats()"
                          [disabled]="isLoadingStats()"
                          class="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                    <span [class.animate-spin]="isLoadingStats()">🔄</span>
                    <span>刷新</span>
                  </button>
                </div>
                
                <!-- 提示信息 -->
                @if (monitoredMessagesCount() === 0) {
                  <div class="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <p class="text-xs text-slate-400 flex items-start gap-2">
                      <span class="text-amber-400">💡</span>
                      <span>開啟群組監控後，系統會自動記錄消息。累積一定消息後即可收集發言用戶。</span>
                    </p>
                  </div>
                } @else {
                  <div class="mt-3 p-2 bg-slate-800/30 rounded-lg">
                    <p class="text-[10px] text-slate-500 text-center">
                      從 {{ monitoredMessagesCount() | number }} 條消息中提取活躍用戶，無需管理員權限
                    </p>
                  </div>
                }
                
                @if (!selectedGroup()!.accountPhone) {
                  <div class="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p class="text-xs text-amber-400 flex items-center gap-2">
                      <span>⚠️</span>
                      <span>需要分配監控帳號才能收集用戶</span>
                    </p>
                  </div>
                }
              </div>

              <!-- 綁定的詞集 -->
              <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>🔑</span> 綁定的關鍵詞集
                </h4>
                @if (selectedGroup()!.linkedKeywordSets.length > 0) {
                  <div class="space-y-2">
                    @for (setId of selectedGroup()!.linkedKeywordSets; track setId) {
                      <div class="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <span class="text-sm text-white">{{ stateService.getKeywordSetName(setId) }}</span>
                        <button (click)="unbindKeywordSet(setId)"
                                class="px-2 py-1 hover:bg-red-500/20 rounded text-red-400 text-xs transition-colors">
                          解綁
                        </button>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-sm text-slate-500 text-center py-2">尚未綁定關鍵詞集</p>
                }
                
                <!-- 可綁定的詞集 -->
                @if (availableKeywordSets().length > 0) {
                  <div class="mt-3 pt-3 border-t border-slate-600/50">
                    <p class="text-xs text-slate-500 mb-2">點擊綁定詞集：</p>
                    <div class="flex flex-wrap gap-2">
                      @for (set of availableKeywordSets(); track set.id) {
                        <button (click)="bindKeywordSet(set.id)"
                                class="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-xs transition-colors">
                          + {{ set.name }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- 提取進度/結果 -->
              @if (extractionProgress().isExtracting && extractionProgress().groupId === selectedGroup()!.id) {
                <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-emerald-400 flex items-center gap-2">
                      <span class="animate-pulse">⏳</span> 正在提取成員...
                    </span>
                    <span class="text-xs text-slate-400">
                      {{ extractionProgress().extracted }} / {{ extractionProgress().total }}
                    </span>
                  </div>
                  <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                         [style.width.%]="getExtractionPercent()">
                    </div>
                  </div>
                  <div class="text-xs text-slate-500 mt-2">{{ extractionProgress().status }}</div>
                </div>
              }
              
              @if (extractionResult().completed && extractionResult().groupId === selectedGroup()!.id) {
                <div class="p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-emerald-400 flex items-center gap-2">
                      <span>✅</span> 提取完成
                    </span>
                    <span class="text-emerald-300 font-medium text-lg">{{ extractionResult().count }} 人</span>
                  </div>
                  <div class="flex items-center gap-3 mt-2 text-sm">
                    <span class="text-slate-400">🟢 {{ extractionResult().online }} 在線</span>
                    <span class="text-slate-400">⏰ {{ extractionResult().recently }} 最近</span>
                    <span class="text-slate-400">💎 {{ extractionResult().premium }} Premium</span>
                  </div>
                </div>
              }
            }
          </div>
          
          <!-- 彈窗底部操作按鈕 -->
          @if (selectedGroup()) {
            <div class="p-5 border-t border-slate-700/50 bg-slate-800/30">
              <div class="grid grid-cols-2 gap-3">
                <button (click)="extractMembers()"
                        [disabled]="extractionProgress().isExtracting"
                        class="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  @if (extractionProgress().isExtracting && extractionProgress().groupId === selectedGroup()!.id) {
                    <span class="animate-spin">⏳</span> 提取中...
                  } @else {
                    <span>👥</span> 提取成員
                  }
                </button>
                <button (click)="copyGroupLink()"
                        class="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>📋</span> 複製鏈接
                </button>
                <button (click)="openInTelegram()"
                        class="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>🔗</span> 在 Telegram 打開
                </button>
                <button (click)="removeGroup()"
                        class="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors flex items-center justify-center gap-2">
                  <span>🗑️</span> 移除監控
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
    
    <!-- 🆕 歷史消息收集對話框 -->
    <app-history-collection-dialog
      [isOpen]="showHistoryCollectionDialog()"
      [group]="historyCollectionGroup()"
      (closeDialog)="closeHistoryCollectionDialog()"
      (collectionComplete)="onHistoryCollectionComplete($event)"
      (viewUsersEvent)="viewCollectedUsers()">
    </app-history-collection-dialog>
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
  showDetailDialog = signal(false);  // 🆕 詳情彈窗狀態
  
  // 🆕 批量刷新成員數狀態
  isRefreshingMemberCounts = signal(false);
  refreshMemberCountProgress = signal({ current: 0, total: 0 });
  
  // 🆕 提取進度狀態
  extractionProgress = signal<{
    isExtracting: boolean;
    groupId: string;
    extracted: number;
    total: number;
    status: string;
  }>({
    isExtracting: false,
    groupId: '',
    extracted: 0,
    total: 0,
    status: ''
  });
  
  // 🆕 提取結果狀態
  extractionResult = signal<{
    completed: boolean;
    groupId: string;
    count: number;
    online: number;
    recently: number;
    premium: number;
  }>({
    completed: false,
    groupId: '',
    count: 0,
    online: 0,
    recently: 0,
    premium: 0
  });
  
  // 🆕 已收集用戶數量（從監控消息中收集）
  collectedUsersCount = signal(0);
  
  // 🆕 監控的消息數量
  monitoredMessagesCount = signal(0);
  
  // 🆕 是否正在從歷史消息收集
  isCollectingFromHistory = signal(false);
  
  // 🆕 歷史收集對話框狀態
  showHistoryCollectionDialog = signal(false);
  historyCollectionGroup = signal<HistoryCollectionGroupInfo | null>(null);
  isLoadingStats = signal(false);
  
  // 🆕 計算可收集的新用戶數（預估）
  estimatedNewUsers = computed(() => {
    const messages = this.monitoredMessagesCount();
    const collected = this.collectedUsersCount();
    // 簡單估算：每 5 條消息約 1 個唯一用戶
    const estimated = Math.max(0, Math.round(messages / 5) - collected);
    return estimated;
  });

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
    
    // 🆕 監聽成員提取進度
    const cleanup3 = this.ipcService.on('members-extraction-progress', (data: { resourceId: number, extracted: number, total: number, status: string }) => {
      const selected = this.selectedGroup();
      if (selected && String(selected.id) === String(data.resourceId)) {
        this.extractionProgress.set({
          isExtracting: true,
          groupId: String(data.resourceId),
          extracted: data.extracted,
          total: data.total,
          status: data.status
        });
      }
    });
    this.listeners.push(cleanup3);
    
    // 🆕 監聽成員提取完成
    const cleanup4 = this.ipcService.on('members-extracted', (data: { success: boolean, resourceId?: number, members?: any[], error?: string }) => {
      const selected = this.selectedGroup();
      if (data.success && data.members && selected && String(selected.id) === String(data.resourceId)) {
        // 計算統計
        let online = 0, recently = 0, premium = 0;
        for (const m of data.members) {
          if (m.online_status === 'online') online++;
          else if (m.online_status === 'recently') recently++;
          if (m.is_premium) premium++;
        }
        
        // 停止進度顯示
        this.extractionProgress.set({
          isExtracting: false,
          groupId: '',
          extracted: 0,
          total: 0,
          status: ''
        });
        
        // 顯示結果
        this.extractionResult.set({
          completed: true,
          groupId: String(data.resourceId),
          count: data.members.length,
          online,
          recently,
          premium
        });
        
        // 10秒後自動隱藏結果
        setTimeout(() => {
          if (this.extractionResult().groupId === String(data.resourceId)) {
            this.clearExtractionResult();
          }
        }, 10000);
      } else if (data.error) {
        // 提取失敗
        this.extractionProgress.set({
          isExtracting: false,
          groupId: '',
          extracted: 0,
          total: 0,
          status: ''
        });
      }
    });
    this.listeners.push(cleanup4);
    
    // 🆕 監聽已收集用戶統計
    const cleanup4b = this.ipcService.on('group-collected-stats', (data: {
      groupId: string;
      collectedUsers: number;
      monitoredMessages: number;
    }) => {
      const selected = this.selectedGroup();
      if (selected && String(selected.id) === String(data.groupId)) {
        this.collectedUsersCount.set(data.collectedUsers || 0);
        this.monitoredMessagesCount.set(data.monitoredMessages || 0);
      }
    });
    this.listeners.push(cleanup4b);
    
    // 🆕 監聯批量刷新成員數進度
    const cleanup5 = this.ipcService.on('batch-refresh-member-counts-progress', (data: { current: number, total: number, groupId: string, memberCount: number }) => {
      this.refreshMemberCountProgress.set({ current: data.current, total: data.total });
      
      // 更新本地群組成員數
      if (data.memberCount > 0) {
        this.stateService.updateGroupMemberCount(data.groupId, data.memberCount);
      }
    });
    this.listeners.push(cleanup5);
    
    // 🆕 監聯批量刷新成員數完成
    const cleanup6 = this.ipcService.on('batch-refresh-member-counts-complete', (data: { success: boolean, total: number, updated: number, failed: number }) => {
      this.isRefreshingMemberCounts.set(false);
      this.refreshMemberCountProgress.set({ current: 0, total: 0 });
      
      if (data.success) {
        this.toastService.success(`✅ 成員數刷新完成：${data.updated} 個成功，${data.failed} 個失敗`);
        // 刷新群組列表以顯示新數據
        this.stateService.refresh();
      } else {
        this.toastService.error('成員數刷新失敗');
      }
    });
    this.listeners.push(cleanup6);
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
  
  // 🆕 批量刷新所有群組的成員數
  refreshAllMemberCounts() {
    const groups = this.stateService.groups();
    if (groups.length === 0) {
      this.toastService.warning('沒有群組需要刷新');
      return;
    }
    
    this.isRefreshingMemberCounts.set(true);
    this.refreshMemberCountProgress.set({ current: 0, total: groups.length });
    
    // 發送批量刷新請求
    this.ipcService.send('batch-refresh-member-counts', {
      groups: groups.map(g => ({
        id: g.id,
        url: g.url,
        accountPhone: g.accountPhone
      }))
    });
    
    this.toastService.info(`🔄 開始刷新 ${groups.length} 個群組的成員數...`);
  }

  selectGroup(group: MonitoringGroup) {
    this.selectedGroup.set(group);
  }
  
  // 🆕 打開群組詳情彈窗
  openGroupDetail(group: MonitoringGroup) {
    this.selectedGroup.set(group);
    this.showDetailDialog.set(true);
    
    // 🆕 加載已收集用戶和消息數量
    this.loadCollectedStats(group);
  }
  
  // 🆕 關閉群組詳情彈窗
  closeDetailDialog() {
    this.showDetailDialog.set(false);
    // 不清空 selectedGroup，保留選中狀態
  }
  
  // 🆕 加載已收集用戶和消息統計
  private loadCollectedStats(group: MonitoringGroup) {
    // 重置計數
    this.collectedUsersCount.set(0);
    this.monitoredMessagesCount.set(0);
    
    // 請求後端獲取統計
    this.ipcService.send('get-group-collected-stats', {
      groupId: group.id,
      telegramId: group.telegramId
    });
  }
  
  // 🆕 查看已收集用戶
  viewCollectedUsers() {
    const group = this.selectedGroup();
    if (!group) return;
    
    this.closeDetailDialog();
    this.toastService.info(`📋 跳轉到「${group.name}」的已收集用戶...`);
    
    // 發送事件通知導航到資源中心並篩選該群組
    this.ipcService.send('navigate-to-collected-users', {
      groupId: group.id,
      groupName: group.name,
      telegramId: group.telegramId
    });
  }
  
  // 🆕 從歷史消息收集用戶
  collectFromHistory() {
    const group = this.selectedGroup();
    if (!group) return;
    
    this.isCollectingFromHistory.set(true);
    this.toastService.info('🔄 正在從歷史消息中收集用戶...');
    
    this.ipcService.send('collect-users-from-history', {
      groupId: group.id,
      telegramId: group.telegramId,
      limit: 500
    });
    
    // 監聽收集結果
    const cleanup = this.ipcService.on('collect-from-history-result', (data: {
      groupId: string;
      success: boolean;
      collected?: number;
      newUsers?: number;
      error?: string;
    }) => {
      if (String(data.groupId) === String(group.id)) {
        this.isCollectingFromHistory.set(false);
        cleanup();
        
        if (data.success) {
          this.toastService.success(`✅ 收集完成！共 ${data.collected} 位用戶，新增 ${data.newUsers || 0} 位`);
          // 刷新統計
          this.loadCollectedStats(group);
        } else {
          this.toastService.error(data.error || '收集失敗');
        }
      }
    });
    this.listeners.push(cleanup);
  }
  
  // 🆕 打開歷史收集對話框
  openHistoryCollectionDialog() {
    const group = this.selectedGroup();
    if (!group) return;
    
    // 設置對話框群組信息
    this.historyCollectionGroup.set({
      id: group.id,
      name: group.name,
      telegramId: group.telegramId,
      url: group.url,
      accountPhone: group.accountPhone
    });
    
    this.showHistoryCollectionDialog.set(true);
    
    // 觸發對話框加載統計數據
    setTimeout(() => {
      this.ipcService.send('get-history-collection-stats', {
        groupId: group.id,
        telegramId: group.telegramId
      });
    }, 100);
  }
  
  // 🆕 關閉歷史收集對話框
  closeHistoryCollectionDialog() {
    this.showHistoryCollectionDialog.set(false);
  }
  
  // 🆕 歷史收集完成回調
  onHistoryCollectionComplete(result: CollectionResult) {
    const group = this.selectedGroup();
    if (group) {
      // 刷新統計
      this.loadCollectedStats(group);
    }
  }
  
  // 🆕 刷新已收集統計
  refreshCollectedStats() {
    const group = this.selectedGroup();
    if (!group) return;
    
    this.isLoadingStats.set(true);
    this.loadCollectedStats(group);
    
    // 設置超時重置
    setTimeout(() => {
      this.isLoadingStats.set(false);
    }, 5000);
  }

  // 🆕 P2: 快速添加群組
  showQuickAddDialog = signal(false);
  quickAddUrl = '';
  isQuickAdding = signal(false);

  quickAddGroup() {
    const url = this.quickAddUrl.trim();
    if (!url) return;
    
    this.isQuickAdding.set(true);
    
    // 解析輸入：支持 @username、t.me/username、完整 URL
    let username = '';
    let groupUrl = url;
    
    if (url.startsWith('@')) {
      username = url.substring(1);
      groupUrl = `https://t.me/${username}`;
    } else if (url.match(/^[a-zA-Z0-9_]+$/)) {
      username = url;
      groupUrl = `https://t.me/${username}`;
    } else {
      const match = url.match(/t\.me\/([^/?\s]+)/);
      if (match) {
        username = match[1].startsWith('+') ? '' : match[1];
      }
    }
    
    // 發送加入命令
    this.ipcService.send('join-and-monitor-resource', {
      username: username,
      telegramId: '',
      title: username || url,
      resourceId: 0
    });
    
    // 監聽結果
    const handler = (result: any) => {
      this.isQuickAdding.set(false);
      if (result.success) {
        this.toastService.success(`已添加群組到監控: ${result.username || username || url}`);
        this.quickAddUrl = '';
        this.showQuickAddDialog.set(false);
        this.refreshData();
      } else {
        this.toastService.error(`添加失敗: ${result.error || '未知錯誤'}`);
      }
    };
    this.ipcService.once('join-and-monitor-complete', handler);
    
    // 超時保護
    setTimeout(() => {
      this.isQuickAdding.set(false);
    }, 30000);
  }

  navigateToResourceCenter() {
    this.configAction.emit('goto-search-discovery');
    this.toastService.info('請在「搜索發現」中搜索群組並點擊加入');
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

  /**
   * 打開提取成員配置對話框
   * 不再直接提取，而是先讓用戶配置篩選條件
   */
  extractMembers() {
    const group = this.selectedGroup();
    if (!group) return;

    // 🆕 發出事件打開配置對話框，而不是直接提取
    this.extractMembersEvent.emit(group);
  }
  
  /**
   * 執行成員提取（帶配置）
   * 由父組件在用戶確認配置後調用
   */
  executeExtraction(config: {
    limit: number;
    filters: {
      onlineStatus: 'all' | 'online' | 'recently' | 'offline';
      hasChinese: boolean | null;
      hasUsername: boolean | null;
      isPremium: boolean | null;
      excludeBots: boolean;
      excludeAdmins: boolean;
    };
    advanced: {
      autoSaveToResources: boolean;
      skipDuplicates: boolean;
    };
  }) {
    const group = this.selectedGroup();
    if (!group) return;
    
    // 設置提取進度初始狀態
    this.extractionProgress.set({
      isExtracting: true,
      groupId: group.id,
      extracted: 0,
      total: config.limit === -1 ? (group.memberCount || 0) : config.limit,
      status: '正在連接...'
    });
    
    // 清除之前的結果
    this.clearExtractionResult();
    
    // 🔧 FIX: 優先使用 telegramId（數字 ID），支持私有群組
    // 對於私有群組（邀請鏈接加入的），只有 telegramId 能正常工作
    let chatId = '';
    let username = '';
    
    // 優先使用 Telegram 數字 ID
    if (group.telegramId) {
      chatId = group.telegramId;
      console.log('[Groups] Using telegramId for extraction:', chatId);
    } else if (group.url) {
      // 從 URL 中提取 username（僅對公開群組有效）
      const match = group.url.match(/t\.me\/([^+/][^/]*?)(?:\?|$)/);  // 排除邀請鏈接格式 (+...)
      if (match) {
        username = match[1];
        chatId = username;
        console.log('[Groups] Using username for extraction:', username);
      } else {
        // 邀請鏈接格式，無法直接使用
        console.log('[Groups] URL is invite link, need telegramId:', group.url);
      }
    }
    
    if (!chatId) {
      this.toastService.error('無法提取成員：該群組缺少有效的 ID。請先手動打開群組以獲取其 ID。');
      this.extractionProgress.set({
        isExtracting: false,
        groupId: '',
        extracted: 0,
        total: 0,
        status: ''
      });
      return;
    }
    
    // 發送提取命令（帶篩選條件）
    this.ipcService.send('extract-members', {
      chatId: chatId,
      telegramId: group.telegramId,  // 🔧 FIX: 額外傳遞 telegramId
      username: username,
      resourceId: group.id,
      groupName: group.name,
      // 🆕 傳遞篩選配置
      limit: config.limit === -1 ? undefined : config.limit,
      filters: {
        bots: !config.filters.excludeBots,
        // 🔧 FIX: 傳遞 onlineStatus 字符串，確保後端正確解析
        onlineStatus: config.filters.onlineStatus || 'all',
        offline: config.filters.onlineStatus === 'offline',
        online: config.filters.onlineStatus === 'online',
        chinese: config.filters.hasChinese,
        hasUsername: config.filters.hasUsername,
        isPremium: config.filters.isPremium,
        excludeAdmins: config.filters.excludeAdmins
      },
      autoSave: config.advanced.autoSaveToResources,
      skipDuplicates: config.advanced.skipDuplicates
    });
    
    this.toastService.info(`🔄 正在提取 ${group.name} 的成員...`);
  }
  
  // 🆕 計算提取進度百分比
  getExtractionPercent(): number {
    const progress = this.extractionProgress();
    if (progress.total === 0) return 0;
    return Math.min(100, Math.round((progress.extracted / progress.total) * 100));
  }
  
  // 🆕 清除提取結果顯示
  clearExtractionResult() {
    this.extractionResult.set({
      completed: false,
      groupId: '',
      count: 0,
      online: 0,
      recently: 0,
      premium: 0
    });
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
      this.showDetailDialog.set(false);  // 🔧 關閉彈窗
      this.toastService.success(`🗑️ 已移除 ${group.name}`);
      
      // 刷新數據
      setTimeout(() => this.stateService.refresh(), 500);
    }
  }
}
