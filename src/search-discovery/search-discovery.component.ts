/**
 * 搜索發現組件 - Search Discovery Component
 * 獨立頁面，專注於搜索和發現 Telegram 群組/頻道
 * 
 * 優化重點：
 * 1. 更大的搜索結果顯示區域
 * 2. 群組 ID 顯示和一鍵複製
 * 3. 更好的 UI/UX 體驗
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { AccountManagementService } from '../services';
import { DialogService } from '../services/dialog.service';
import { OperationHistoryService } from '../services/operation-history.service';

// 資源類型定義
export interface DiscoveredResource {
  id: number;
  telegram_id: string;
  title: string;
  username?: string;
  description?: string;
  member_count: number;
  resource_type: 'group' | 'channel' | 'supergroup';
  status: 'discovered' | 'pending' | 'joined' | 'monitoring' | 'paused' | 'failed';
  overall_score?: number;
  is_saved?: boolean;
  invite_link?: string;
  discovery_source?: string;
  discovery_keyword?: string;
  created_at?: string;
  // 🆕 搜索歷史相關
  is_new?: boolean;          // 是否為新發現
  member_change?: number;    // 成員數變化（與上次相比）
  // 🔧 P0-1: 已加入狀態相關
  joined_phone?: string;     // 加入時使用的帳號電話
}

// 搜索渠道類型
export type SearchSource = 'telegram' | 'jiso' | 'tgstat' | 'local';

// 帳號類型
export interface Account {
  id: number;
  phone: string;
  status: string;
}

@Component({
  selector: 'app-search-discovery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-slate-900 text-white overflow-hidden">
      <!-- 頂部標題欄 - 精簡設計 -->
      <div class="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 bg-slate-900/95 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🔍</span>
              搜索發現
            </h1>
            <!-- 快速統計 -->
            <div class="flex items-center gap-2 text-sm">
              <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg">
                {{ mergedResources().length }} 結果
              </span>
              <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                {{ savedCount() }} 已收藏
              </span>
              <!-- Phase3: 操作歷史快捷按鈕 -->
              <button (click)="showOperationHistory.set(!showOperationHistory())"
                      class="px-3 py-1 rounded-lg text-sm transition-all"
                      [class]="showOperationHistory() ? 'bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/50' : 'bg-slate-700/30 text-slate-400 hover:bg-slate-600/30'">
                📋 {{ opHistory.todayRecords().length }} 操作
              </button>
            </div>
          </div>
          
          <!-- 帳號選擇 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-slate-400">使用帳號:</span>
              @if (mergedSelectedAccount(); as account) {
                <div class="relative">
                  <button (click)="showAccountSelector.set(!showAccountSelector())"
                          class="flex items-center gap-2 px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg border border-slate-600/50">
                    <span class="w-2 h-2 rounded-full" [class.bg-green-400]="account.status === 'Online'" [class.bg-slate-400]="account.status !== 'Online'"></span>
                    <span class="font-mono text-sm">{{ account.phone }}</span>
                    <span class="text-slate-400 text-xs">▼</span>
                  </button>
                  @if (showAccountSelector()) {
                    <div class="absolute top-full right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                      <div class="max-h-48 overflow-y-auto p-1">
                        @for (acc of mergedAccounts(); track acc.id) {
                          <button (click)="selectAccount(acc)"
                                  class="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 rounded-lg text-left">
                            <span class="w-2 h-2 rounded-full" [class.bg-green-400]="acc.status === 'Online'" [class.bg-slate-400]="acc.status !== 'Online'"></span>
                            <span class="font-mono text-sm flex-1">{{ acc.phone }}</span>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <span class="text-red-400 text-sm px-3 py-1.5 bg-red-500/10 rounded-lg">⚠️ 無可用帳號</span>
              }
            </div>
            
            <!-- 系統狀態 -->
            @if (mergedSearching()) {
              <span class="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 animate-pulse">
                🔄 搜索中...
              </span>
            } @else {
              <span class="px-3 py-1.5 rounded-lg text-sm bg-green-500/20 text-green-400">
                ✅ 就緒
              </span>
            }
          </div>
        </div>
      </div>
      
      <!-- Phase3: 操作歷史面板 (可摺疊) -->
      @if (showOperationHistory()) {
        <div class="flex-shrink-0 border-b border-purple-500/20 bg-purple-900/10 animate-slideDown">
          <div class="px-6 py-3">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3 text-sm">
                <span class="text-purple-400 font-medium">📋 今日操作記錄</span>
                <span class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                  ✅ {{ opHistory.statsByType().join.success + opHistory.statsByType().monitor.success + opHistory.statsByType().extract.success }}
                </span>
                <span class="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">
                  ❌ {{ opHistory.statsByType().join.failed + opHistory.statsByType().monitor.failed + opHistory.statsByType().extract.failed }}
                </span>
              </div>
              <button (click)="showOperationHistory.set(false)" 
                      class="text-slate-400 hover:text-white text-sm px-2">✕</button>
            </div>
            <div class="max-h-32 overflow-y-auto space-y-1">
              @for (record of opHistory.todayRecords().slice(0, 10); track record.id) {
                <div class="flex items-center gap-2 text-xs py-1 px-2 rounded bg-slate-800/30">
                  <span>{{ opHistory.getStatusIcon(record.status) }}</span>
                  <span class="text-slate-400 w-14 flex-shrink-0">{{ opHistory.getTypeLabel(record.type) }}</span>
                  <span class="text-slate-300 truncate flex-1">{{ record.resourceTitle || record.resourceUsername || '未知' }}</span>
                  @if (record.memberCount) {
                    <span class="text-cyan-400 flex-shrink-0">{{ record.memberCount }}人</span>
                  }
                  @if (record.errorMessage) {
                    <span class="text-red-400 truncate max-w-[200px]" [title]="record.errorMessage">{{ record.errorMessage }}</span>
                  }
                  <span class="text-slate-500 flex-shrink-0">{{ formatTime(record.timestamp) }}</span>
                </div>
              }
              @if (opHistory.todayRecords().length === 0) {
                <div class="text-center text-slate-500 py-2 text-xs">今天還沒有操作記錄</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- 搜索欄區域 -->
      <div class="flex-shrink-0 px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
        <!-- 搜索輸入 -->
        <div class="flex gap-3 mb-4">
          <div class="flex-1 relative">
            <input type="text" 
                   [(ngModel)]="searchQuery"
                   (keyup.enter)="doSearch()"
                   (focus)="showSuggestions.set(true)"
                   (blur)="hideSuggestions()"
                   placeholder="輸入關鍵詞搜索群組和頻道..."
                   class="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 pl-12 text-white text-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            
            <!-- 搜索建議下拉 -->
            @if (showSuggestions() && !mergedSearching()) {
              <div class="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                @if (mergedHistoryKeywords().length > 0) {
                  <div class="p-3 border-b border-slate-700">
                    <div class="text-xs text-slate-500 mb-2">🕐 最近搜索</div>
                    <div class="flex flex-wrap gap-2">
                      @for (kw of mergedHistoryKeywords().slice(0, 5); track kw) {
                        <button (mousedown)="quickSearch(kw)" 
                                class="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg text-sm transition-all">
                          {{ kw }}
                        </button>
                      }
                    </div>
                  </div>
                }
                <div class="p-3">
                  <div class="text-xs text-slate-500 mb-2">🔥 熱門搜索</div>
                  <div class="flex flex-wrap gap-2">
                    @for (kw of hotKeywords; track kw) {
                      <button (mousedown)="quickSearch(kw)" 
                              class="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 rounded-lg text-sm transition-all">
                        {{ kw }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          <button (click)="doSearch()" 
                  [disabled]="mergedSearching() || !searchQuery.trim()"
                  class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25">
            {{ mergedSearching() ? '搜索中...' : '搜索' }}
          </button>
        </div>
        
        <!-- 搜索渠道選擇 -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-sm text-slate-400">搜索渠道:</span>
            <div class="flex gap-2">
              @for (source of searchSources; track source.id) {
                <label class="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
                       [class]="source.disabled 
                         ? 'bg-slate-800/50 border border-slate-700/30 cursor-not-allowed opacity-50' 
                         : selectedSources().includes(source.id) 
                           ? 'bg-cyan-500/20 border border-cyan-500/50 cursor-pointer' 
                           : 'bg-slate-700/30 border border-slate-700 hover:bg-slate-700/50 cursor-pointer'"
                       [title]="source.disabled ? '該功能正在開發中，敬請期待' : ''">
                  <input type="checkbox"
                         [checked]="selectedSources().includes(source.id)"
                         [disabled]="source.disabled"
                         (change)="toggleSource(source.id)"
                         class="hidden">
                  <span>{{ source.icon }}</span>
                  <span class="text-sm">{{ source.name }}</span>
                  @if (source.tag) {
                    <span class="text-[10px] px-1.5 py-0.5 rounded" [class]="source.tagClass">{{ source.tag }}</span>
                  }
                </label>
              }
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <button (click)="selectedSources.set(['telegram', 'jiso'])"
                    class="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-all">
              推薦組合
            </button>
            <button (click)="clearResults()"
                    class="text-xs px-2 py-1 bg-slate-600/50 hover:bg-slate-600 text-slate-400 rounded transition-all">
              清空結果
            </button>
          </div>
        </div>
      </div>
      
      <!-- 結果統計和操作欄 -->
      @if (mergedResources().length > 0 || currentKeyword()) {
        <div class="flex-shrink-0 px-6 py-3 border-b border-slate-700/30 bg-slate-800/20">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              @if (currentKeyword()) {
                <div class="flex items-center gap-2">
                  <span class="text-slate-400 text-sm">當前搜索：</span>
                  <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm font-medium">
                    🔍 {{ currentKeyword() }}
                  </span>
                </div>
              }
              <span class="text-slate-400 text-sm flex items-center gap-3">
                共 <span class="font-bold text-white">{{ mergedResources().length }}</span> 個結果
                <!-- 🆕 顯示新發現/已知統計 -->
                @if (newDiscoveredCount() > 0 || existingCount() > 0) {
                  <span class="text-green-400 text-xs">🆕 {{ newDiscoveredCount() }} 個新發現</span>
                  <span class="text-slate-500 text-xs">🔄 {{ existingCount() }} 個已知</span>
                }
              </span>
              <!-- 🆕 搜索進度提示 -->
              @if (searchProgress()) {
                <span class="text-cyan-400 text-sm flex items-center gap-1">
                  <span class="animate-spin">⏳</span>
                  {{ searchProgress() }}
                </span>
              }
              @if (isFetchingDetails()) {
                <span class="text-amber-400 text-sm flex items-center gap-1">
                  <span class="animate-pulse">📊</span>
                  正在獲取成員數等詳情...
                </span>
              }
            </div>
            
            <div class="flex items-center gap-2">
              <select [(ngModel)]="filterType"
                      class="bg-slate-700/50 border border-slate-600 rounded-lg py-1.5 px-3 text-white text-sm">
                <option value="all">全部類型</option>
                <option value="group">群組</option>
                <option value="channel">頻道</option>
              </select>
              <!-- 🆕 高級篩選按鈕 -->
              <button (click)="showAdvancedFilter.set(!showAdvancedFilter())"
                      class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all"
                      [class]="showAdvancedFilter() || activeFilterCount() > 0 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                        : 'bg-slate-700/50 text-slate-300 border border-slate-700 hover:border-slate-600'">
                🎛️ 高級篩選
                @if (activeFilterCount() > 0) {
                  <span class="ml-1 px-1.5 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                    {{ activeFilterCount() }}
                  </span>
                }
              </button>
              <button (click)="batchSave()" 
                      class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 text-sm flex items-center gap-1">
                ⭐ 批量收藏
              </button>
              <button (click)="exportResults()" 
                      [disabled]="filteredResources().length === 0"
                      class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all"
                      [class]="filteredResources().length > 0 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-600/30 text-slate-500 cursor-not-allowed'">
                📤 導出全部 ({{ filteredResources().length }})
              </button>
            </div>
          </div>
          
          <!-- 🆕 高級篩選面板 -->
          @if (showAdvancedFilter()) {
            <div class="mt-3 pt-3 border-t border-slate-700/30 grid grid-cols-2 md:grid-cols-4 gap-4">
              <!-- 成員數範圍 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">成員數範圍</label>
                <div class="flex items-center gap-2">
                  <input type="number" 
                         [value]="filterMemberMin() || ''"
                         (change)="filterMemberMin.set($any($event.target).value ? +$any($event.target).value : null)"
                         placeholder="最少"
                         class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <span class="text-slate-500">-</span>
                  <input type="number" 
                         [value]="filterMemberMax() || ''"
                         (change)="filterMemberMax.set($any($event.target).value ? +$any($event.target).value : null)"
                         placeholder="最多"
                         class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                </div>
              </div>
              
              <!-- 來源渠道 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">來源渠道</label>
                <select [value]="filterSource()"
                        (change)="filterSource.set($any($event.target).value)"
                        class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <option value="all">全部來源</option>
                  <option value="telegram">TG 官方</option>
                  <option value="jiso">中文搜索</option>
                  <option value="local">本地索引</option>
                </select>
              </div>
              
              <!-- 加入狀態 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">加入狀態</label>
                <select [value]="filterJoinStatus()" 
                        (change)="filterJoinStatus.set($any($event.target).value)"
                        class="w-full bg-slate-700/50 border border-slate-600 rounded py-1.5 px-2 text-white text-sm">
                  <option value="all">全部狀態</option>
                  <option value="monitoring">監控中</option>
                  <option value="joined">已加入</option>
                  <option value="not_joined">未加入</option>
                </select>
              </div>
              
              <!-- 其他選項 -->
              <div>
                <label class="text-xs text-slate-400 mb-1 block">其他選項</label>
                <div class="flex items-center gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" 
                           [checked]="filterHasId()"
                           (change)="filterHasId.set($any($event.target).checked)"
                           class="rounded border-slate-500 bg-slate-700 text-cyan-500">
                    <span class="text-sm text-slate-300">只顯示有 ID</span>
                  </label>
                  <button (click)="resetFilters()"
                          class="text-xs text-slate-400 hover:text-white underline">
                    重置篩選
                  </button>
                </div>
              </div>
            </div>
          }
          
          <!-- 🆕 批量選擇面板 -->
          @if (filteredResources().length > 0) {
            <div class="mt-3 pt-3 border-t border-slate-700/30 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-slate-400 text-sm">批量操作:</span>
                <button (click)="selectAllVisible()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  ☑️ 全選本頁
                </button>
                <button (click)="clearSelection()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  ☐ 取消全選
                </button>
                <button (click)="invertSelection()" 
                        class="px-2 py-1 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded transition-all">
                  ⇆ 反選
                </button>
              </div>
              
              @if (selectedCount() > 0) {
                <div class="flex items-center gap-3 px-3 py-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <span class="text-cyan-400 text-sm font-medium">
                    ✓ 已選 {{ selectedCount() }} 項
                  </span>
                  <div class="w-px h-4 bg-slate-600"></div>
                  <button (click)="batchSaveSelected()" 
                          class="px-2 py-1 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-all">
                    ⭐ 收藏選中
                  </button>
                  <button (click)="copySelectedIds()" 
                          class="px-2 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-all">
                    📋 複製ID
                  </button>
                  <button (click)="batchExtractSelected()" 
                          class="px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded transition-all">
                    👥 批量提取成員
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
      
      <!-- 搜索結果列表 - 最大化顯示區域 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        @if (mergedSearching()) {
          <!-- 搜索中骨架屏 -->
          <div class="space-y-4">
            @for (i of [1,2,3,4,5]; track i) {
              <div class="animate-pulse bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <div class="flex items-start gap-4">
                  <div class="w-12 h-12 bg-slate-700 rounded-lg"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-5 bg-slate-700 rounded w-1/3"></div>
                    <div class="h-4 bg-slate-700 rounded w-1/4"></div>
                    <div class="h-3 bg-slate-700 rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredResources().length === 0) {
          <!-- 空狀態 -->
          <div class="flex flex-col items-center justify-center h-full text-center">
            @if (mergedSearchError().hasError) {
              <div class="max-w-md">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-red-400 text-xl mb-2">搜索失敗</p>
                <p class="text-slate-400 mb-4">{{ mergedSearchError().message }}</p>
                <button (click)="doSearch()" class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">
                  🔄 重試
                </button>
              </div>
            } @else {
              <div class="text-6xl mb-4">🔍</div>
              <p class="text-slate-300 text-xl mb-2">開始搜索發現群組</p>
              <p class="text-slate-500 mb-6">輸入關鍵詞搜索 Telegram 群組和頻道</p>
              <div class="flex flex-wrap justify-center gap-2 max-w-lg">
                <span class="text-slate-500 text-sm">試試：</span>
                @for (kw of hotKeywords.slice(0, 5); track kw) {
                  <button (click)="quickSearch(kw)" 
                          class="px-3 py-1.5 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-full text-sm transition-all">
                    {{ kw }}
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <!-- 🔧 P0: 分頁信息 -->
          <div class="flex items-center justify-between mb-3 px-1">
            <div class="text-sm text-slate-400">
              共 <span class="text-white font-bold">{{ filteredResources().length }}</span> 個結果，
              顯示第 <span class="text-cyan-400">{{ (currentPage() - 1) * pageSize() + 1 }}</span> - 
              <span class="text-cyan-400">{{ Math.min(currentPage() * pageSize(), filteredResources().length) }}</span> 個
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-400">每頁</span>
              <select [ngModel]="pageSize()" (ngModelChange)="changePageSize($event)"
                      class="bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-sm text-white">
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </div>
          </div>
          
          <!-- 結果列表 -->
          <div class="space-y-3">
            @for (resource of pagedResources(); track getResourceTrackId(resource, $index)) {
              <div class="group bg-gradient-to-r from-slate-800/80 to-slate-800/40 rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer"
                   [class]="isSelectedForBatch(resource) ? 'border-cyan-500/70 shadow-lg shadow-cyan-500/10' : 'border-slate-700/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10'"
                   (click)="openDetail(resource)">
                <div class="p-4 flex items-start gap-4">
                  <!-- 🆕 批量選擇複選框 -->
                  <div class="flex-shrink-0 flex flex-col gap-2">
                    <label class="relative cursor-pointer" (click)="$event.stopPropagation()">
                      <input type="checkbox" 
                             [checked]="isSelectedForBatch(resource)"
                             (change)="toggleBatchSelect(resource, $event)"
                             class="sr-only">
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                           [class]="isSelectedForBatch(resource) ? 'bg-cyan-500 border-cyan-500' : 'border-slate-500 hover:border-cyan-400'">
                        @if (isSelectedForBatch(resource)) {
                          <span class="text-white text-xs">✓</span>
                        }
                      </div>
                    </label>
                    <!-- 收藏按鈕 -->
                    <button (click)="toggleSave(resource); $event.stopPropagation()"
                            class="p-2 rounded-lg transition-all"
                            [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700/50 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400'"
                            [title]="resource.is_saved ? '取消收藏' : '收藏'">
                      {{ resource.is_saved ? '⭐' : '☆' }}
                    </button>
                  </div>
                  
                  <!-- 主要信息 -->
                  <div class="flex-1 min-w-0">
                    <!-- 第一行：類型 + 新發現標記 + 標題 + Username -->
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                      <span class="px-2.5 py-1 text-xs rounded-full font-medium flex-shrink-0" 
                            [class]="resource.resource_type === 'channel' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'">
                        {{ resource.resource_type === 'channel' ? '📢 頻道' : '👥 群組' }}
                      </span>
                      
                      <!-- 🔧 P1: 統一狀態標識 -->
                      @if (resource.status === 'monitoring') {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-green-500/30 text-green-300 flex-shrink-0">
                          ● 監控中
                        </span>
                      } @else if (resource.status === 'joined') {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-blue-500/30 text-blue-300 flex-shrink-0">
                          ● 已加入
                        </span>
                      } @else if (resource.status === 'paused') {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-yellow-500/30 text-yellow-300 flex-shrink-0">
                          ● 已暫停
                        </span>
                      }
                      
                      <!-- 🆕 新發現/已知標記 -->
                      @if (resource.is_new) {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-cyan-500/30 text-cyan-300 flex-shrink-0 animate-pulse">
                          🆕 新發現
                        </span>
                      } @else if (resource.is_new === false) {
                        <span class="px-2 py-0.5 text-xs rounded-full font-medium bg-slate-600/30 text-slate-400 flex-shrink-0">
                          🔄 已知
                        </span>
                      }
                      
                      <h4 class="font-semibold text-white truncate">{{ resource.title }}</h4>
                      @if (resource.username) {
                        <a [href]="'https://t.me/' + resource.username" target="_blank" 
                           class="text-cyan-400 text-sm hover:underline flex-shrink-0"
                           (click)="$event.stopPropagation()">
                          @{{ resource.username }}
                        </a>
                      }
                    </div>
                    
                    <!-- 🆕 第二行：群組 ID（重點顯示，優化後的友好提示） -->
                    <div class="flex items-center gap-3 mb-2 bg-slate-900/50 rounded-lg px-3 py-2">
                      <span class="text-slate-400 text-sm">ID:</span>
                      @if (resource.telegram_id) {
                        <!-- 有數字 ID -->
                        <code class="font-mono text-cyan-300 text-sm select-all">{{ resource.telegram_id }}</code>
                        <button (click)="copyId(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedId() === resource.telegram_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'"
                                title="複製 ID">
                          {{ copiedId() === resource.telegram_id ? '✓ 已複製' : '📋 複製' }}
                        </button>
                      } @else if (resource.username) {
                        <!-- 無 ID 但有 username -->
                        <code class="font-mono text-slate-400 text-sm">@{{ resource.username }}</code>
                        <span class="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded" title="加入群組後可獲取完整數字 ID">
                          ⚠️ 需加入獲取
                        </span>
                      } @else {
                        <!-- 都沒有 -->
                        <span class="text-slate-500 text-sm">需通過邀請鏈接加入</span>
                      }
                      @if (resource.username) {
                        <span class="text-slate-600">|</span>
                        <button (click)="copyLink(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedLink() === resource.username ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'"
                                title="複製連結">
                          {{ copiedLink() === resource.username ? '✓ 已複製' : '🔗 複製連結' }}
                        </button>
                      }
                    </div>
                    
                    <!-- 描述 -->
                    @if (resource.description) {
                      <p class="text-slate-400 text-sm mb-2 line-clamp-2">{{ resource.description }}</p>
                    }
                    
                    <!-- 統計信息 -->
                    <div class="flex items-center gap-4 text-sm flex-wrap">
                      <span class="flex items-center gap-1 text-slate-400">
                        <span class="text-lg">👥</span>
                        <span class="font-medium text-white">{{ resource.member_count | number }}</span>
                        成員
                        <!-- 🆕 成員數變化標記 -->
                        @if (resource.member_change && resource.member_change > 0) {
                          <span class="text-green-400 text-xs ml-1" title="相比上次增加">
                            📈 +{{ resource.member_change | number }}
                          </span>
                        } @else if (resource.member_change && resource.member_change < 0) {
                          <span class="text-red-400 text-xs ml-1" title="相比上次減少">
                            📉 {{ resource.member_change | number }}
                          </span>
                        }
                      </span>
                      
                      <!-- 相關度評分（帶分數顯示） -->
                      <span class="flex items-center gap-1.5">
                        @if ((resource.overall_score || 0) >= 0.7) {
                          <span class="text-yellow-400">⭐⭐⭐</span>
                          <span class="text-yellow-400 font-medium">高度相關</span>
                        } @else if ((resource.overall_score || 0) >= 0.5) {
                          <span class="text-yellow-400">⭐⭐</span>
                          <span class="text-slate-400">中度相關</span>
                        } @else {
                          <span class="text-yellow-400">⭐</span>
                          <span class="text-slate-500">一般相關</span>
                        }
                        <span class="text-xs text-slate-500 font-mono">
                          ({{ formatScore(resource.overall_score) }})
                        </span>
                      </span>
                      
                      <!-- 來源標記 -->
                      @if (resource.discovery_source) {
                        <span class="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                          {{ getSourceLabel(resource.discovery_source) }}
                        </span>
                      }
                      
                      <!-- 狀態標記 -->
                      @if (resource.status === 'monitoring') {
                        <span class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">● 監控中</span>
                      } @else if (resource.status === 'joined' || resource.status === 'paused') {
                        <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">✓ 已加入</span>
                      }
                    </div>
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex-shrink-0 flex flex-col gap-2" (click)="$event.stopPropagation()">
                    @if (resource.status === 'monitoring') {
                      <!-- 監控中狀態 -->
                      <div class="flex flex-col items-center">
                        <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                          ✅ 已加入
                        </span>
                        <span class="px-4 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs text-center mt-1">
                          📡 監控中
                        </span>
                        @if (resource.joined_phone) {
                          <span class="text-xs text-slate-500 mt-1">{{ resource.joined_phone.slice(0, 7) }}***</span>
                        }
                      </div>
                    } @else if (resource.status === 'joined') {
                      <!-- 已加入但未監控 -->
                      <div class="flex flex-col items-center">
                        <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                          ✅ 已加入
                        </span>
                        @if (resource.joined_phone) {
                          <span class="text-xs text-slate-500 mt-1">{{ resource.joined_phone.slice(0, 7) }}***</span>
                        }
                      </div>
                      @if (isAddingMonitor(resource)) {
                        <button disabled
                                class="px-4 py-2 bg-emerald-500/10 text-emerald-400/60 rounded-lg text-sm cursor-wait flex items-center gap-1">
                          <span class="animate-spin">⏳</span> 添加中...
                        </button>
                      } @else {
                        <button (click)="addToMonitoring(resource)" 
                                class="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-all">
                          📡 加入監控
                        </button>
                      }
                    } @else if (isJoining(resource)) {
                      <button disabled
                              class="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg text-sm font-medium cursor-wait flex items-center gap-1">
                        <span class="animate-spin">⏳</span> 加入中...
                      </button>
                    } @else {
                      <!-- 未加入：顯示加入和加入並監控兩個選項 -->
                      <button (click)="openJoinDialog(resource)" 
                              class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20">
                        🚀 加入
                      </button>
                      @if (isAddingMonitor(resource)) {
                        <button disabled
                                class="px-4 py-2 bg-emerald-500/10 text-emerald-400/60 rounded-lg text-sm cursor-wait flex items-center gap-1"
                                title="正在添加到監控列表...">
                          <span class="animate-spin">⏳</span> 監控中...
                        </button>
                      } @else {
                        <button (click)="addToMonitoring(resource)" 
                                class="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-all"
                                title="直接添加到監控群組列表">
                          📡 監控
                        </button>
                      }
                    }
                    
                    @if (resource.resource_type !== 'channel') {
                      @if (resource.status === 'joined' || resource.status === 'monitoring') {
                        <button (click)="extractMembers(resource)" 
                                class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-all">
                          👥 提取成員
                        </button>
                      } @else {
                        <button disabled
                                class="px-4 py-2 bg-slate-500/20 text-slate-500 rounded-lg text-sm cursor-not-allowed"
                                title="需要先加入群組才能提取成員">
                          👥 成員
                        </button>
                      }
                    } @else {
                      <button disabled
                              class="px-4 py-2 bg-slate-500/20 text-slate-500 rounded-lg text-sm cursor-not-allowed"
                              title="頻道無法提取成員">
                        👥 成員 🔒
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
          
          <!-- 🔧 P0: 分頁控件 -->
          @if (filteredResources().length > pageSize()) {
            <div class="flex items-center justify-center gap-2 mt-4 py-3 border-t border-slate-700/50">
              <button (click)="firstPage()" 
                      [disabled]="currentPage() === 1"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === 1 ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                ⏮️ 首頁
              </button>
              <button (click)="prevPage()" 
                      [disabled]="currentPage() === 1"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === 1 ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                ◀️ 上一頁
              </button>
              
              @for (page of pageNumbers(); track page) {
                <button (click)="goToPage(page)"
                        class="w-8 h-8 rounded-lg text-sm font-medium transition-all"
                        [class]="page === currentPage() ? 'bg-cyan-500 text-white' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                  {{ page }}
                </button>
              }
              
              <button (click)="nextPage()" 
                      [disabled]="currentPage() === totalPages()"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === totalPages() ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                下一頁 ▶️
              </button>
              <button (click)="lastPage()" 
                      [disabled]="currentPage() === totalPages()"
                      class="px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class]="currentPage() === totalPages() ? 'bg-slate-700/30 text-slate-500 cursor-not-allowed' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'">
                尾頁 ⏭️
              </button>
              
              <span class="ml-2 text-sm text-slate-400">
                第 {{ currentPage() }} / {{ totalPages() }} 頁
              </span>
            </div>
          }
        }
      </div>
      
      <!-- 🆕 群組詳情彈窗 -->
      @if (showDetailDialog() && selectedResource(); as resource) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             (click)="closeDetail()">
          <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl border border-slate-700"
               (click)="$event.stopPropagation()">
            <!-- 彈窗標題欄 -->
            <div class="px-6 py-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/95">
              <div class="flex items-center gap-3">
                <span class="px-3 py-1 text-sm rounded-full font-medium" 
                      [class]="resource.resource_type === 'channel' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'">
                  {{ resource.resource_type === 'channel' ? '📢 頻道' : '👥 群組' }}
                </span>
                <h2 class="text-xl font-bold text-white">群組詳情</h2>
                <!-- 🆕 導航計數 -->
                <span class="text-sm text-slate-400">
                  {{ selectedResourceIndex() + 1 }} / {{ filteredResources().length }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <!-- 🆕 導航按鈕 -->
                <button (click)="navigatePrev()" 
                        [disabled]="!canNavigatePrev()"
                        class="p-2 rounded-lg transition-all"
                        [class]="canNavigatePrev() ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'"
                        title="上一個 (← 鍵)">
                  ←
                </button>
                <button (click)="navigateNext()" 
                        [disabled]="!canNavigateNext()"
                        class="p-2 rounded-lg transition-all"
                        [class]="canNavigateNext() ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'"
                        title="下一個 (→ 鍵)">
                  →
                </button>
                <div class="w-px h-6 bg-slate-700 mx-1"></div>
                <button (click)="closeDetail()" 
                        class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        title="關閉 (Esc 鍵)">
                  ✕
                </button>
              </div>
            </div>
            
            <!-- 彈窗內容 -->
            <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <!-- 標題和頭像 -->
              <div class="flex items-start gap-4 mb-6">
                <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-3xl flex-shrink-0">
                  {{ resource.title[0] || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-2xl font-bold text-white mb-1">{{ resource.title }}</h3>
                  @if (resource.username) {
                    <a [href]="'https://t.me/' + resource.username" target="_blank" 
                       class="text-cyan-400 hover:underline">
                      @{{ resource.username }}
                    </a>
                  }
                </div>
                <button (click)="toggleSave(resource)"
                        class="p-3 rounded-xl transition-all"
                        [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400 hover:bg-yellow-500/20 hover:text-yellow-400'">
                  {{ resource.is_saved ? '⭐' : '☆' }}
                </button>
              </div>
              
              <!-- 📊 基本信息 -->
              <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>📊</span> 基本信息
                </h4>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <div class="text-slate-500 text-sm mb-1">類型</div>
                    <div class="text-white">{{ resource.resource_type === 'channel' ? '頻道' : '群組' }}</div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">Telegram ID</div>
                    <div class="flex items-center gap-2">
                      @if (resource.telegram_id) {
                        <code class="font-mono text-cyan-300">{{ resource.telegram_id }}</code>
                        <button (click)="copyId(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedId() === resource.telegram_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'">
                          {{ copiedId() === resource.telegram_id ? '✓' : '📋' }}
                        </button>
                      } @else if (resource.username) {
                        <code class="font-mono text-slate-400">@{{ resource.username }}</code>
                        <!-- 只在未加入時顯示「需加入」提示，避免狀態矛盾 -->
                        @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                          <span class="text-xs text-amber-400/80" title="加入群組後可獲取完整數字 ID">⚠️ 需加入獲取ID</span>
                        } @else {
                          <span class="text-xs text-blue-400/80" title="正在同步ID...">🔄 同步中</span>
                        }
                      } @else {
                        @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                          <span class="text-slate-500">需加入獲取</span>
                        } @else {
                          <span class="text-blue-400">🔄 同步中</span>
                        }
                      }
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">Username</div>
                    <div class="flex items-center gap-2">
                      @if (resource.username) {
                        <span class="text-white">@{{ resource.username }}</span>
                        <button (click)="copyLink(resource, $event)"
                                class="px-2 py-1 text-xs bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400 rounded transition-all">
                          🔗
                        </button>
                      } @else {
                        <span class="text-slate-500">無</span>
                      }
                    </div>
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">連結</div>
                    @if (resource.username) {
                      <a [href]="'https://t.me/' + resource.username" target="_blank" 
                         class="text-cyan-400 hover:underline text-sm">
                        t.me/{{ resource.username }}
                      </a>
                    } @else {
                      <span class="text-slate-500">無公開連結</span>
                    }
                  </div>
                </div>
              </div>
              
              <!-- 👥 成員數據 -->
              <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>👥</span> 成員數據
                </h4>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-2xl font-bold text-cyan-400">{{ resource.member_count | number }}</div>
                    <div class="text-slate-500 text-sm">總成員</div>
                  </div>
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-xl font-bold text-yellow-400 mb-1">
                      @if ((resource.overall_score || 0) >= 0.7) {
                        ⭐⭐⭐
                      } @else if ((resource.overall_score || 0) >= 0.5) {
                        ⭐⭐
                      } @else {
                        ⭐
                      }
                    </div>
                    <div class="text-cyan-400 font-mono text-lg">{{ formatScore(resource.overall_score) }}</div>
                    <div class="text-slate-500 text-xs">相關度</div>
                  </div>
                  <div class="text-center p-3 bg-slate-800/50 rounded-lg">
                    <div class="text-2xl font-bold" [class]="resource.status === 'monitoring' ? 'text-green-400' : resource.status === 'joined' ? 'text-blue-400' : resource.status === 'paused' ? 'text-yellow-400' : 'text-slate-400'">
                      {{ (resource.status === 'joined' || resource.status === 'monitoring' || resource.status === 'paused') ? '✓' : '—' }}
                    </div>
                    <div class="text-slate-500 text-sm">
                      @if (resource.status === 'monitoring') {
                        監控中
                      } @else if (resource.status === 'paused') {
                        已暫停
                      } @else if (resource.status === 'joined') {
                        已加入
                      } @else if (resource.status === 'joining') {
                        加入中...
                      } @else {
                        未加入
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 📝 描述 -->
              @if (resource.description) {
                <div class="bg-slate-900/50 rounded-xl p-4 mb-4">
                  <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                    <span>📝</span> 群組描述
                  </h4>
                  <p class="text-slate-400 whitespace-pre-wrap">{{ resource.description }}</p>
                </div>
              }
              
              <!-- 🏷️ 來源信息 -->
              <div class="bg-slate-900/50 rounded-xl p-4">
                <h4 class="text-slate-300 font-medium mb-3 flex items-center gap-2">
                  <span>🏷️</span> 來源信息
                </h4>
                <div class="flex flex-wrap gap-2">
                  @if (resource.discovery_source) {
                    <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      來源：{{ getSourceLabel(resource.discovery_source) }}
                    </span>
                  }
                  @if (resource.discovery_keyword) {
                    <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
                      關鍵詞：{{ resource.discovery_keyword }}
                    </span>
                  }
                  @if (resource.created_at) {
                    <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      發現時間：{{ resource.created_at | date:'yyyy-MM-dd HH:mm' }}
                    </span>
                  }
                </div>
              </div>
            </div>
            
            <!-- 彈窗底部操作欄 -->
            <div class="px-6 py-4 border-t border-slate-700 bg-slate-800/95 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <button (click)="toggleSave(resource)"
                        class="px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                        [class]="resource.is_saved ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'">
                  {{ resource.is_saved ? '⭐ 已收藏' : '☆ 收藏' }}
                </button>
                @if (resource.username) {
                  <a [href]="'https://t.me/' + resource.username" target="_blank"
                     class="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg flex items-center gap-2">
                    🔗 打開 Telegram
                  </a>
                }
              </div>
              <div class="flex items-center gap-2">
                <button (click)="closeDetail()"
                        class="px-4 py-2 bg-slate-700 text-slate-300 hover:bg-slate-600 rounded-lg">
                  關閉
                </button>
                
                @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                  <!-- 未加入：加入 + 加入並監控 -->
                  <button (click)="addToMonitoring(resource); closeDetail()"
                          class="px-5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-medium transition-all">
                    📡 監控
                  </button>
                  <button (click)="openJoinDialog(resource); closeDetail()"
                          class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20">
                    🚀 加入群組
                  </button>
                } @else if (resource.status === 'joined') {
                  <!-- 已加入未監控：加入監控 + 提取成員 -->
                  <button (click)="addToMonitoring(resource); closeDetail()"
                          class="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-all">
                    📡 加入監控
                  </button>
                  @if (resource.resource_type !== 'channel') {
                    <button (click)="extractMembers(resource); closeDetail()"
                            class="px-6 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-all">
                      👥 提取成員
                    </button>
                  }
                } @else {
                  <!-- 監控中：顯示狀態 + 提取成員 -->
                  <span class="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg text-sm font-medium">
                    📡 監控中
                  </span>
                  @if (resource.resource_type !== 'channel') {
                    <button (click)="extractMembers(resource); closeDetail()"
                            class="px-6 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg font-medium transition-all">
                      👥 提取成員
                    </button>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- 🔧 P0-2: 帳號選擇對話框 -->
      @if (showJoinAccountDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
             (click)="cancelJoinDialog()">
          <div class="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-[420px] max-h-[80vh] overflow-hidden"
               (click)="$event.stopPropagation()">
            <!-- 標題 -->
            <div class="p-5 border-b border-slate-700 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                🚀 選擇加入帳號
              </h3>
              @if (joinDialogResource(); as resource) {
                <p class="text-sm text-slate-400 mt-1 truncate">{{ resource.title }}</p>
              }
            </div>
            
            <!-- 群組信息 -->
            @if (joinDialogResource(); as resource) {
              <div class="p-4 border-b border-slate-700/50 bg-slate-800/50">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {{ resource.title?.charAt(0) || 'G' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-white truncate">{{ resource.title }}</div>
                    @if (resource.username) {
                      <div class="text-sm text-cyan-400">@{{ resource.username }}</div>
                    }
                    <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>👥 {{ resource.member_count | number }} 成員</span>
                    </div>
                  </div>
                </div>
              </div>
            }
            
            <!-- 帳號列表 -->
            <div class="p-4 max-h-[300px] overflow-y-auto">
              <div class="text-sm text-slate-400 mb-3">選擇要使用的帳號：</div>
              <div class="space-y-2">
                @for (acc of mergedAccounts(); track acc.id) {
                  @if (acc.status === 'Online') {
                    <label class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                           [class]="joinDialogSelectedPhone() === acc.phone 
                             ? 'bg-cyan-500/20 border-2 border-cyan-500' 
                             : 'bg-slate-700/30 border-2 border-transparent hover:bg-slate-700/50'">
                      <input type="radio" 
                             [value]="acc.phone" 
                             [checked]="joinDialogSelectedPhone() === acc.phone"
                             (change)="joinDialogSelectedPhone.set(acc.phone)"
                             class="w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 focus:ring-cyan-500">
                      <div class="flex-1">
                        <div class="font-mono text-white">{{ acc.phone }}</div>
                        @if (acc.display_name) {
                          <div class="text-xs text-slate-400">{{ acc.display_name }}</div>
                        }
                      </div>
                      <span class="w-2 h-2 rounded-full bg-green-400"></span>
                    </label>
                  }
                }
              </div>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
              <button (click)="cancelJoinDialog()"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
                取消
              </button>
              <button (click)="confirmJoinFromDialog()"
                      [disabled]="!joinDialogSelectedPhone()"
                      class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all">
                確認加入
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
      height: 100%;
    }
    
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    /* 自定義滾動條 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(100, 116, 139, 0.3);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(100, 116, 139, 0.5);
    }
    
    /* Phase3: 操作歷史面板滑入動畫 */
    .animate-slideDown {
      animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown {
      from { max-height: 0; opacity: 0; overflow: hidden; }
      to { max-height: 200px; opacity: 1; }
    }
  `]
})
export class SearchDiscoveryComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  private ipc = inject(ElectronIpcService);
  private accountService = inject(AccountManagementService);
  private dialogService = inject(DialogService);
  opHistory = inject(OperationHistoryService);
  
  // 🆕 Phase3: 操作歷史面板開關
  showOperationHistory = signal(false);
  
  // 🔧 P0: 注入群組管理服務用於打開加入對話框
  private groupService: any = null;  // 延遲注入避免循環依賴
  
  // 🔧 P0: 暴露 Math 給模板使用
  Math = Math;
  
  // 🔧 P0: 內部狀態 - 從服務獲取帳號
  private _internalAccounts = signal<Account[]>([]);
  private _internalResources = signal<DiscoveredResource[]>([]);
  private _internalSearching = signal(false);
  private _internalSelectedAccount = signal<Account | null>(null);
  private _internalSearchError = signal<{ hasError: boolean; message: string }>({ hasError: false, message: '' });
  private _historyKeywords = signal<string[]>([]);
  private ipcCleanup: (() => void)[] = [];
  
  // 🆕 搜索進度狀態
  searchProgress = signal<string>('');
  isFetchingDetails = signal(false);
  
  // 🆕 搜索歷史統計
  newDiscoveredCount = signal(0);      // 新發現數量
  existingCount = signal(0);           // 已知數量
  
  // 🔧 P0: 分頁狀態
  currentPage = signal(1);
  pageSize = signal(50);  // 每頁顯示數量
  pageSizeOptions = [20, 50, 100, 200];
  
  // 🔧 P0: 動態超時+心跳保活機制
  private searchTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly SEARCH_BASE_TIMEOUT_MS = 60000;    // 基礎超時 60 秒
  private readonly HEARTBEAT_TIMEOUT_MS = 15000;      // 心跳超時 15 秒（收到進度事件後重置）
  private lastProgressTime: number = 0;               // 最後收到進度事件的時間
  
  // ============ 輸入信號 ============
  resources = input<DiscoveredResource[]>([]);
  isSearching = input<boolean>(false);
  selectedAccount = input<Account | null>(null);
  availableAccounts = input<Account[]>([]);
  historyKeywords = input<string[]>([]);
  currentKeyword = input<string>('');
  searchError = input<{ hasError: boolean; message: string }>({ hasError: false, message: '' });
  savedResourceIds = input<Set<string>>(new Set());
  
  // 🔧 P0: 合併的帳號列表（優先使用內部獲取的，fallback 到 input）
  mergedAccounts = computed(() => {
    const internal = this._internalAccounts();
    const fromInput = this.availableAccounts();
    // 優先使用內部獲取的在線帳號
    if (internal.length > 0) return internal;
    return fromInput;
  });
  
  // 🔧 P0: 合併的資源列表（全部）
  mergedResources = computed(() => {
    const internal = this._internalResources();
    const fromInput = this.resources();
    if (internal.length > 0) return internal;
    return fromInput;
  });
  
  // 🔧 P0: 分頁後的資源列表（當前頁顯示）
  pagedResources = computed(() => {
    const all = this.filteredResources();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    const end = start + size;
    return all.slice(start, end);
  });
  
  // 🔧 P0: 總頁數
  totalPages = computed(() => {
    const total = this.filteredResources().length;
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });
  
  // 🔧 P0: 頁碼數組（用於渲染分頁按鈕）
  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    
    // 顯示當前頁前後各2頁
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });
  
  // 🔧 P0: 合併的搜索狀態
  mergedSearching = computed(() => this._internalSearching() || this.isSearching());
  
  // 🔧 P0: 合併的選中帳號
  mergedSelectedAccount = computed(() => this._internalSelectedAccount() || this.selectedAccount());
  
  // 🔧 P0: 合併的搜索錯誤
  mergedSearchError = computed(() => {
    const internal = this._internalSearchError();
    if (internal.hasError) return internal;
    return this.searchError();
  });
  
  // 🔧 P0: 合併的歷史關鍵詞
  mergedHistoryKeywords = computed(() => {
    const internal = this._historyKeywords();
    const fromInput = this.historyKeywords();
    if (internal.length > 0) return internal;
    return fromInput;
  });
  
  // ============ 輸出事件 ============
  searchEvent = output<{ query: string; sources: SearchSource[] }>();
  selectAccountEvent = output<Account>();
  saveResourceEvent = output<DiscoveredResource>();
  unsaveResourceEvent = output<DiscoveredResource>();
  joinResourceEvent = output<DiscoveredResource>();
  extractMembersEvent = output<DiscoveredResource>();
  clearResultsEvent = output<void>();
  
  // ============ 本地狀態 ============
  searchQuery = '';
  filterType: 'all' | 'group' | 'channel' = 'all';
  showAccountSelector = signal(false);
  showSuggestions = signal(false);
  copiedId = signal<string>('');
  copiedLink = signal<string>(''); // 🆕 複製連結狀態
  selectedSources = signal<SearchSource[]>(['telegram', 'jiso']);
  
  // 🔧 P0-2: 帳號選擇對話框狀態
  showJoinAccountDialog = signal(false);
  joinDialogResource = signal<DiscoveredResource | null>(null);
  joinDialogSelectedPhone = signal<string>('');
  
  // 🔧 P0: 加入中的資源 ID 列表（用於顯示 Loading 狀態）
  joiningResourceIds = signal<Set<number>>(new Set());
  
  // 🔧 Phase2: 正在添加監控的資源 ID 列表
  monitoringResourceIds = signal<Set<number>>(new Set());
  
  // 🆕 高級篩選狀態
  showAdvancedFilter = signal(false);
  filterMemberMin = signal<number | null>(null);
  filterMemberMax = signal<number | null>(null);
  filterSource = signal<string>('all'); // 'all' | 'telegram' | 'jiso' | 'local'
  filterJoinStatus = signal<string>('all'); // 'all' | 'joined' | 'not_joined'
  filterHasId = signal<boolean>(false); // 只顯示有完整 ID 的結果
  
  // 🆕 詳情彈窗狀態
  showDetailDialog = signal(false);
  selectedResource = signal<DiscoveredResource | null>(null);
  selectedResourceIndex = signal<number>(-1); // 🆕 當前選中資源的索引
  
  // 🆕 批量選擇狀態
  selectedForBatch = signal<Set<string>>(new Set());
  
  // 搜索渠道配置
  searchSources = [
    { id: 'telegram' as SearchSource, name: '官方搜索', icon: '📱', tag: '穩定', tagClass: 'bg-green-500/20 text-green-400', disabled: false },
    { id: 'jiso' as SearchSource, name: '中文搜索', icon: '🔍', tag: '推薦', tagClass: 'bg-yellow-500/20 text-yellow-400', disabled: false },
    { id: 'tgstat' as SearchSource, name: 'TGStat', icon: '📊', tag: '開發中', tagClass: 'bg-slate-600 text-slate-400', disabled: true },
    { id: 'local' as SearchSource, name: '本地索引', icon: '💾', tag: null, tagClass: '', disabled: false }
  ];
  
  // 熱門關鍵詞
  hotKeywords = ['支付', 'USDT', '交易', '招聘', '代購', '加密貨幣', '電影', '資源分享'];
  
  // ============ 計算屬性 ============
  
  // 過濾後的資源列表（支持高級篩選）
  filteredResources = computed(() => {
    let result = this.mergedResources();
    
    // 類型篩選
    if (this.filterType !== 'all') {
      result = result.filter(r => {
        if (this.filterType === 'channel') return r.resource_type === 'channel';
        return r.resource_type !== 'channel';
      });
    }
    
    // 🆕 成員數篩選
    const minMember = this.filterMemberMin();
    const maxMember = this.filterMemberMax();
    if (minMember !== null && minMember > 0) {
      result = result.filter(r => r.member_count >= minMember);
    }
    if (maxMember !== null && maxMember > 0) {
      result = result.filter(r => r.member_count <= maxMember);
    }
    
    // 🆕 來源篩選
    const sourceFilter = this.filterSource();
    if (sourceFilter !== 'all') {
      result = result.filter(r => r.discovery_source === sourceFilter);
    }
    
    // 🆕 加入狀態篩選（統一 4 態：discovered/joined/monitoring/paused）
    const joinStatus = this.filterJoinStatus();
    if (joinStatus === 'monitoring') {
      result = result.filter(r => r.status === 'monitoring');
    } else if (joinStatus === 'joined') {
      result = result.filter(r => r.status === 'joined' || r.status === 'monitoring' || r.status === 'paused');
    } else if (joinStatus === 'not_joined') {
      result = result.filter(r => r.status !== 'joined' && r.status !== 'monitoring' && r.status !== 'paused');
    }
    
    // 🆕 只顯示有 ID 的結果
    if (this.filterHasId()) {
      result = result.filter(r => r.telegram_id && r.telegram_id.trim() !== '');
    }
    
    return result;
  });
  
  // 已收藏數量
  savedCount = computed(() => {
    return this.mergedResources().filter(r => r.is_saved).length;
  });
  
  // ============ 追蹤鍵生成 ============
  
  /**
   * 生成資源的唯一追蹤鍵
   * 解決 NG0955 錯誤：確保每個資源有唯一鍵
   * 
   * @param resource 資源對象
   * @param index 列表索引
   * @returns 唯一的追蹤鍵字串
   */
  getResourceTrackId(resource: DiscoveredResource, index: number): string {
    // 🔧 P1: 使用組合鍵確保唯一性
    // 結合 index + id/telegram_id + source 來確保唯一
    const parts: string[] = [`idx-${index}`];
    
    if (resource.id && resource.id !== 0) {
      parts.push(`id-${resource.id}`);
    }
    
    if (resource.telegram_id && resource.telegram_id.toString().trim() !== '') {
      parts.push(`tg-${resource.telegram_id}`);
    }
    
    if (resource.username && resource.username.trim() !== '') {
      parts.push(`u-${resource.username}`);
    }
    
    // 添加來源以區分不同來源的相同資源
    if ((resource as any).source) {
      parts.push(`src-${(resource as any).source}`);
    }
    
    return parts.join('_');
  }
  
  // ============ 生命週期 ============
  
  ngOnInit(): void {
    // 點擊外部關閉下拉框
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    // 🆕 鍵盤快捷鍵支持
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    
    // 🔧 P0: 獲取帳號列表並監聯更新
    this.loadAccounts();
    this.setupIpcListeners();
    this.loadSearchHistory();
    
    // 🔧 P1: 從 sessionStorage 恢復上次搜索結果
    this.restoreSearchResults();
  }
  
  // 🔧 P1: 保存搜索結果到 sessionStorage
  private saveSearchResults(): void {
    try {
      const resources = this._internalResources();
      const query = this.searchQuery;
      if (resources.length > 0) {
        const data = {
          query,
          resources,
          timestamp: Date.now(),
          newCount: this.newDiscoveredCount(),
          existingCount: this.existingCount()
        };
        sessionStorage.setItem('search-discovery-results', JSON.stringify(data));
        console.log(`[SearchDiscovery] 已保存 ${resources.length} 個搜索結果到 sessionStorage`);
      }
    } catch (e) {
      console.error('[SearchDiscovery] 保存搜索結果失敗:', e);
    }
  }
  
  // 🔧 P1: 從 sessionStorage 恢復搜索結果
  private restoreSearchResults(): void {
    try {
      const saved = sessionStorage.getItem('search-discovery-results');
      if (saved) {
        const data = JSON.parse(saved);
        // 檢查是否過期（30分鐘）
        const age = Date.now() - (data.timestamp || 0);
        if (age < 30 * 60 * 1000) {
          this._internalResources.set(data.resources || []);
          this.searchQuery = data.query || '';
          this.newDiscoveredCount.set(data.newCount || 0);
          this.existingCount.set(data.existingCount || 0);
          console.log(`[SearchDiscovery] 已恢復 ${data.resources?.length || 0} 個搜索結果`);
        } else {
          // 過期，清除
          sessionStorage.removeItem('search-discovery-results');
        }
      }
    } catch (e) {
      console.error('[SearchDiscovery] 恢復搜索結果失敗:', e);
    }
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
    // 🔧 P0: 清理 IPC 監聽器
    this.ipcCleanup.forEach(cleanup => cleanup());
    // 🔧 P1: 清除搜索超時計時器
    this.clearSearchTimeout();
  }
  
  // 🔧 P0: 從服務獲取帳號
  private loadAccounts(): void {
    // 從 AccountManagementService 獲取帳號
    const accounts = this.accountService.accounts();
    // 過濾在線帳號
    const onlineAccounts = accounts.filter(acc => 
      acc.status === 'Online'
    );
    this._internalAccounts.set(onlineAccounts.map(acc => ({
      id: acc.id,
      phone: acc.phone,
      status: acc.status
    })));
    
    // 如果沒有選中帳號，自動選擇第一個在線帳號
    if (!this._internalSelectedAccount() && onlineAccounts.length > 0) {
      this._internalSelectedAccount.set({
        id: onlineAccounts[0].id,
        phone: onlineAccounts[0].phone,
        status: onlineAccounts[0].status
      });
    }
    
    console.log('[SearchDiscovery] 載入帳號:', onlineAccounts.length, '個在線');
  }
  
  // 🔧 P0: 設置 IPC 監聯器
  private setupIpcListeners(): void {
    // 監聽帳號更新
    const cleanup1 = this.ipc.on('accounts-updated', (accounts: any[]) => {
      const onlineAccounts = accounts.filter(acc => 
        acc.status === 'Online'
      );
      this._internalAccounts.set(onlineAccounts.map(acc => ({
        id: acc.id,
        phone: acc.phone,
        status: acc.status
      })));
      
      // 如果當前選中帳號已離線，切換到其他在線帳號
      const currentSelected = this._internalSelectedAccount();
      if (currentSelected) {
        const stillOnline = onlineAccounts.find(a => a.id === currentSelected.id);
        if (!stillOnline && onlineAccounts.length > 0) {
          this._internalSelectedAccount.set({
            id: onlineAccounts[0].id,
            phone: onlineAccounts[0].phone,
            status: onlineAccounts[0].status
          });
        }
      } else if (onlineAccounts.length > 0) {
        this._internalSelectedAccount.set({
          id: onlineAccounts[0].id,
          phone: onlineAccounts[0].phone,
          status: onlineAccounts[0].status
        });
      }
      
      console.log('[SearchDiscovery] 帳號更新:', onlineAccounts.length, '個在線');
    });
    
    // 🔧 P1: 監聽流式批次結果（邊搜邊顯示）
    const cleanup2a = this.ipc.on('search-batch', (data: any) => {
      // 重置心跳
      this.resetHeartbeat();
      
      if (data.success && data.groups) {
        const resources: DiscoveredResource[] = data.groups.map((g: any, idx: number) => ({
          id: idx + 1,  // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,  // 🔧 P0: 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || g.members_count || 0,
          resource_type: g.type || 'group',
          status: 'discovered',
          overall_score: g.score,
          discovery_source: 'search',
          discovery_keyword: this.searchQuery,
          source: g.source,  // 保留來源標記
          link: g.link       // 🔧 保留連結
        }));
        
        // 更新結果（累加顯示）
        this._internalResources.set(resources);
        
        // 顯示進度提示
        if (data.message) {
          this.searchProgress.set(data.message);
        }
        
        console.log(`[SearchDiscovery] 收到批次結果: ${resources.length} 個 (來源: ${data.source})`);
      }
    });
    
    // 監聽搜索最終結果
    const cleanup2 = this.ipc.on('search-results', (data: any) => {
      // 🔧 P0: 清除所有狀態
      this.clearSearchTimeout();
      this._internalSearching.set(false);
      this.searchProgress.set('');
      this.isFetchingDetails.set(false);
      
      if (data.success && data.groups) {
        const resources: DiscoveredResource[] = data.groups.map((g: any, idx: number) => ({
          id: idx + 1,  // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,  // 🔧 P0: 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || g.members_count || 0,
          resource_type: g.type || 'group',
          // 🔧 P0-1: 從後端獲取狀態（已加入/未加入）
          status: g.status || 'discovered',
          // 🔧 FIX: 同時檢查 joined_phone（前端）和 joined_by_phone（後端數據庫）
          joined_phone: g.joined_phone || g.joined_by_phone || null,
          overall_score: g.score,
          discovery_source: 'search',
          discovery_keyword: this.searchQuery,
          source: g.source,  // 保留來源標記
          link: g.link,      // 🔧 保留連結
          // 🆕 搜索歷史相關
          is_new: g.is_new,           // 是否為新發現
          member_change: g.member_change  // 成員數變化
        }));
        this._internalResources.set(resources);
        this._internalSearchError.set({ hasError: false, message: '' });
        
        // 🔧 P1: 保存搜索結果到 sessionStorage
        this.saveSearchResults();
        
        // 🆕 更新統計計數
        const newCount = data.new_count || 0;
        const existingCount = data.existing_count || 0;
        this.newDiscoveredCount.set(newCount);
        this.existingCount.set(existingCount);
        
        // 🆕 改進的提示消息
        let message = `搜索完成！共找到 ${resources.length} 個結果`;
        if (newCount > 0) {
          message += `，其中 ${newCount} 個為新發現`;
        }
        this.toast.success(message);
      } else {
        this._internalSearchError.set({ 
          hasError: true, 
          message: data.error || '搜索失敗' 
        });
      }
    });
    
    // 監聽搜索錯誤
    const cleanup3 = this.ipc.on('search-error', (error: any) => {
      // 🔧 P0: 清除所有狀態
      this.clearSearchTimeout();
      this._internalSearching.set(false);
      this.searchProgress.set('');
      this.isFetchingDetails.set(false);
      this._internalSearchError.set({ 
        hasError: true, 
        message: error.message || '搜索請求失敗' 
      });
      this.toast.error('搜索失敗: ' + (error.message || '未知錯誤'));
    });
    
    // 🔧 P0: 監聽搜索進度事件 + 心跳重置 + 分段結果處理
    const cleanup4 = this.ipc.on('jiso-search-progress', (data: { status: string; message: string; data?: any }) => {
      // 重置心跳時間（保持連接活躍）
      this.resetHeartbeat();
      
      this.searchProgress.set(data.message);
      
      // 根據狀態更新 UI
      if (data.status === 'basic_results' && data.data?.results) {
        // 🔧 P0: 收到基礎結果，立即顯示（不等待詳情）
        const basicResources: DiscoveredResource[] = data.data.results.map((g: any, idx: number) => ({
          id: idx + 1,  // 使用序號作為內部 ID
          telegram_id: g.telegram_id || null,  // 🔧 保持真實 ID（可為 null）
          title: g.title,
          username: g.username,
          description: g.description,
          member_count: g.member_count || 0,  // 可能為0，等待詳情更新
          resource_type: g.chat_type || g.type || 'group',
          link: g.link,  // 🔧 保留連結
          status: 'discovered',
          overall_score: g.score,
          discovery_source: 'search',
          discovery_keyword: this.searchQuery
        }));
        this._internalResources.set(basicResources);
        this.isFetchingDetails.set(true);
        this.toast.info(`已載入 ${basicResources.length} 個基礎結果，正在獲取詳情...`);
      } else if (data.status === 'fetching_details') {
        this.isFetchingDetails.set(true);
      } else if (data.status === 'completed') {
        this.isFetchingDetails.set(false);
        this.searchProgress.set('');
      }
    });
    
    // 🔧 P0: 監聯加入群組完成事件，更新本地資源狀態
    const cleanup5 = this.ipc.on('join-and-monitor-complete', (data: any) => {
      // 🔧 P0: 清除 Loading 狀態
      if (data.resourceId) {
        this.joiningResourceIds.update(ids => {
          const newIds = new Set(ids);
          newIds.delete(data.resourceId);
          return newIds;
        });
      }
      
      if (data.success) {
        // 更新本地資源列表中對應資源的狀態
        const currentResources = this._internalResources();
        const updatedResources = currentResources.map(r => {
          // 通過 resourceId、username 或 telegramId 匹配
          const isMatch = 
            (data.resourceId && r.id === data.resourceId) ||
            (data.username && r.username === data.username) ||
            (data.telegramId && r.telegram_id === data.telegramId);
          
          if (isMatch) {
            // 🔧 P0: 同時清除該資源的 Loading 狀態
            this.joiningResourceIds.update(ids => {
              const newIds = new Set(ids);
              newIds.delete(r.id);
              return newIds;
            });
            
            return {
              ...r,
              status: 'joined' as const,
              member_count: data.memberCount || r.member_count,
              // 🔧 P2: 保存加入時使用的帳號
              joined_phone: data.phone || r.joined_phone
            };
          }
          return r;
        });
        
        this._internalResources.set(updatedResources);
        
        // 🔧 P2: 同步更新 sessionStorage
        this.saveSearchResults();
        
        console.log(`[SearchDiscovery] 資源狀態已更新: ${data.username || data.telegramId} → joined (${data.phone})`);
      } else {
        // 🔧 P0: 加入失敗時也清除 Loading 狀態
        if (data.username || data.telegramId) {
          const currentResources = this._internalResources();
          currentResources.forEach(r => {
            if ((data.username && r.username === data.username) ||
                (data.telegramId && r.telegram_id === data.telegramId)) {
              this.joiningResourceIds.update(ids => {
                const newIds = new Set(ids);
                newIds.delete(r.id);
                return newIds;
              });
            }
          });
        }
      }
    });
    
    // 🆕 監聽資源狀態更新事件（監控添加成功後）
    const cleanup6 = this.ipc.on('resource-status-updated', (data: any) => {
      const currentResources = this._internalResources();
      const updatedResources = currentResources.map(r => {
        const isMatch = 
          (data.resourceId && r.id === data.resourceId) ||
          (data.username && r.username === data.username) ||
          (data.telegramId && r.telegram_id === data.telegramId);
        
        if (isMatch && data.newStatus) {
          // 🔧 Phase2: 清除對應資源的 monitoring loading 狀態
          if (data.newStatus === 'monitoring') {
            this.monitoringResourceIds.update(ids => {
              const newIds = new Set(ids);
              newIds.delete(r.id);
              return newIds;
            });
          }
          return { ...r, status: data.newStatus as any };
        }
        return r;
      });
      this._internalResources.set(updatedResources);
      this.saveSearchResults();
    });
    
    // 🆕 監聽群組添加失敗事件
    const cleanup7 = this.ipc.on('group-added', (data: any) => {
      if (data && data.success === false && data.error) {
        this.toast.error(`添加監控失敗: ${data.error}`);
        // 清除所有 monitoring loading 狀態（因為不知道具體是哪個資源的失敗）
        this.monitoringResourceIds.set(new Set());
      }
    });
    
    // 🔧 Phase2: 監聽監控群組添加結果（成功/失敗閉環，幂等防重複）
    const cleanup8 = this.ipc.on('monitored-group-added', (data: any) => {
      if (data.success) {
        // 成功：更新資源狀態 + 清除 loading
        let alreadyUpdated = false;
        const currentResources = this._internalResources();
        const updatedResources = currentResources.map(r => {
          const isMatch = 
            (data.telegramId && r.telegram_id === data.telegramId) ||
            (data.username && r.username === data.username);
          if (isMatch) {
            // 幂等：如果已經是 monitoring 狀態，跳過 toast
            if (r.status === 'monitoring') {
              alreadyUpdated = true;
            }
            this.monitoringResourceIds.update(ids => {
              const newIds = new Set(ids);
              newIds.delete(r.id);
              return newIds;
            });
            return { ...r, status: 'monitoring' as any };
          }
          return r;
        });
        this._internalResources.set(updatedResources);
        this.saveSearchResults();
        // 只在首次收到成功事件時顯示 toast（避免 WS + HTTP 雙重觸發）
        if (!alreadyUpdated) {
          this.toast.success(`📡 已成功添加到監控列表: ${data.name || ''}`);
        }
      } else {
        // 失敗：清除所有 loading + 顯示錯誤（只在有 loading 中的資源時顯示）
        if (this.monitoringResourceIds().size > 0) {
          this.monitoringResourceIds.set(new Set());
          this.toast.error(`❌ 添加監控失敗: ${data.error || '未知錯誤'}`);
        }
      }
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2a, cleanup2, cleanup3, cleanup4, cleanup5, cleanup6, cleanup7, cleanup8);
  }
  
  // 🔧 P0: 加載搜索歷史
  private loadSearchHistory(): void {
    try {
      const history = localStorage.getItem('search-history');
      if (history) {
        this._historyKeywords.set(JSON.parse(history));
      }
    } catch (e) {
      console.warn('[SearchDiscovery] 加載搜索歷史失敗:', e);
    }
  }
  
  // 🔧 P0: 保存搜索歷史
  private saveSearchHistory(keyword: string): void {
    const history = this._historyKeywords();
    const updated = [keyword, ...history.filter(k => k !== keyword)].slice(0, 10);
    this._historyKeywords.set(updated);
    try {
      localStorage.setItem('search-history', JSON.stringify(updated));
    } catch (e) {
      console.warn('[SearchDiscovery] 保存搜索歷史失敗:', e);
    }
  }
  
  // 🆕 Phase3: 格式化時間戳 (操作歷史用)
  formatTime(timestamp: number): string {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 🆕 鍵盤事件處理
  private handleKeydown(event: KeyboardEvent): void {
    // 只在詳情彈窗打開時處理
    if (!this.showDetailDialog()) return;
    
    switch (event.key) {
      case 'Escape':
        this.closeDetail();
        break;
      case 'ArrowLeft':
        if (this.canNavigatePrev()) {
          this.navigatePrev();
        }
        break;
      case 'ArrowRight':
        if (this.canNavigateNext()) {
          this.navigateNext();
        }
        break;
    }
  }
  
  private handleOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.showAccountSelector.set(false);
    }
  }
  
  // ============ 搜索操作 ============
  
  doSearch(): void {
    if (!this.searchQuery.trim()) {
      this.toast.warning('請輸入搜索關鍵詞');
      return;
    }
    
    if (this.selectedSources().length === 0) {
      this.toast.warning('請至少選擇一個搜索渠道');
      return;
    }
    
    // 🔧 P0: 檢查是否有可用帳號
    const selectedAcc = this.mergedSelectedAccount();
    if (!selectedAcc) {
      this.toast.warning('請先選擇一個在線帳號');
      // 嘗試重新加載帳號
      this.loadAccounts();
      return;
    }
    
    // 🔧 P0: 直接執行搜索
    const query = this.searchQuery.trim();
    const sources = this.selectedSources();
    
    console.log('[SearchDiscovery] 開始搜索:', { query, sources, account: selectedAcc.phone });
    
    // 清除之前的超時計時器
    this.clearSearchTimeout();
    
    // 🔧 P0: 重置分頁到第一頁
    this.resetPagination();
    
    this._internalSearching.set(true);
    this._internalSearchError.set({ hasError: false, message: '' });
    
    // 保存搜索歷史
    this.saveSearchHistory(query);
    
    // 🔧 P0: 初始化心跳時間並設置動態超時
    this.lastProgressTime = Date.now();
    this.startHeartbeatCheck();
    
    // 🔧 P0: 發送 IPC 搜索請求 - 不限制數量，返回全部結果
    this.ipc.send('search-groups', {
      keyword: query,
      sources: sources,
      account_id: selectedAcc.id,
      account_phone: selectedAcc.phone,
      limit: 500  // 🔧 增加到 500，支持更多結果（後端會分頁返回）
    });
    
    // 同時發出事件（兼容父組件監聽）
    this.searchEvent.emit({
      query: query,
      sources: sources
    });
  }
  
  // 🔧 P0: 清除搜索超時計時器
  private clearSearchTimeout(): void {
    if (this.searchTimeoutId) {
      clearTimeout(this.searchTimeoutId);
      this.searchTimeoutId = null;
    }
  }
  
  // 🔧 P0: 心跳檢查機制 - 動態超時
  private startHeartbeatCheck(): void {
    this.clearSearchTimeout();
    
    this.searchTimeoutId = setTimeout(() => {
      if (!this._internalSearching()) return;
      
      const now = Date.now();
      const timeSinceLastProgress = now - this.lastProgressTime;
      const totalElapsed = now - (this.lastProgressTime - timeSinceLastProgress);
      
      // 如果超過心跳超時且超過基礎超時，則判定為超時
      if (timeSinceLastProgress > this.HEARTBEAT_TIMEOUT_MS) {
        console.warn('[SearchDiscovery] 搜索超時 - 無進度更新', {
          timeSinceLastProgress,
          totalElapsed
        });
        this.handleSearchTimeout();
      } else {
        // 繼續檢查
        this.startHeartbeatCheck();
      }
    }, 5000); // 每5秒檢查一次
  }
  
  // 🔧 P0: 處理搜索超時
  private handleSearchTimeout(): void {
    this.clearSearchTimeout();
    this._internalSearching.set(false);
    this.searchProgress.set('');
    this.isFetchingDetails.set(false);
    this._internalSearchError.set({
      hasError: true,
      message: '搜索超時，請稍後重試'
    });
    this.toast.warning('搜索超時，請稍後重試');
  }
  
  // 🔧 P0: 重置心跳時間（收到進度事件時調用）
  private resetHeartbeat(): void {
    this.lastProgressTime = Date.now();
  }
  
  quickSearch(keyword: string): void {
    this.searchQuery = keyword;
    this.showSuggestions.set(false);
    this.doSearch();
  }
  
  // ============ 🔧 P0: 分頁控制方法 ============
  
  goToPage(page: number): void {
    const total = this.totalPages();
    if (page >= 1 && page <= total) {
      this.currentPage.set(page);
    }
  }
  
  nextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }
  
  prevPage(): void {
    this.goToPage(this.currentPage() - 1);
  }
  
  firstPage(): void {
    this.goToPage(1);
  }
  
  lastPage(): void {
    this.goToPage(this.totalPages());
  }
  
  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);  // 重置到第一頁
  }
  
  // 🔧 P0: 搜索時重置分頁
  private resetPagination(): void {
    this.currentPage.set(1);
  }
  
  toggleSource(sourceId: SearchSource): void {
    // 🆕 檢查是否為禁用渠道
    const sourceConfig = this.searchSources.find(s => s.id === sourceId);
    if (sourceConfig?.disabled) {
      console.log('⚠️ 該搜索渠道正在開發中:', sourceId);
      return; // 禁止切換禁用的渠道
    }
    
    const current = this.selectedSources();
    if (current.includes(sourceId)) {
      this.selectedSources.set(current.filter(s => s !== sourceId));
    } else {
      this.selectedSources.set([...current, sourceId]);
    }
  }
  
  hideSuggestions(): void {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }
  
  clearResults(): void {
    this.clearResultsEvent.emit();
  }
  
  // ============ 帳號操作 ============
  
  selectAccount(account: Account): void {
    // 🔧 P0: 更新內部選中帳號
    this._internalSelectedAccount.set(account);
    this.selectAccountEvent.emit(account);
    this.showAccountSelector.set(false);
    
    // 🔧 P0: 如果有待加入的資源，選擇帳號後繼續加入
    if (this.pendingJoinResource) {
      const resource = this.pendingJoinResource;
      
      // 檢查帳號是否在線
      if (account.status !== 'Online') {
        this.toast.warning(`帳號 ${account.phone} 未連接，無法加入群組`);
        return;
      }
      
      // 延遲執行，確保 UI 更新
      setTimeout(() => {
        this.executeJoin(resource, account.phone);
      }, 100);
    }
  }
  
  // ============ 資源操作 ============
  
  // ============ 詳情彈窗操作 ============
  
  openDetail(resource: DiscoveredResource): void {
    const resources = this.filteredResources();
    const index = resources.findIndex(r => 
      (r.telegram_id && r.telegram_id === resource.telegram_id) || 
      (r.id && r.id === resource.id)
    );
    this.selectedResource.set(resource);
    this.selectedResourceIndex.set(index);
    this.showDetailDialog.set(true);
  }
  
  closeDetail(): void {
    this.showDetailDialog.set(false);
    this.selectedResource.set(null);
    this.selectedResourceIndex.set(-1);
  }
  
  // 🆕 導航到上一個
  navigatePrev(): void {
    const resources = this.filteredResources();
    const currentIndex = this.selectedResourceIndex();
    if (currentIndex > 0) {
      const prevResource = resources[currentIndex - 1];
      this.selectedResource.set(prevResource);
      this.selectedResourceIndex.set(currentIndex - 1);
    }
  }
  
  // 🆕 導航到下一個
  navigateNext(): void {
    const resources = this.filteredResources();
    const currentIndex = this.selectedResourceIndex();
    if (currentIndex < resources.length - 1) {
      const nextResource = resources[currentIndex + 1];
      this.selectedResource.set(nextResource);
      this.selectedResourceIndex.set(currentIndex + 1);
    }
  }
  
  // 🆕 計算屬性：是否可以導航
  canNavigatePrev = computed(() => this.selectedResourceIndex() > 0);
  canNavigateNext = computed(() => {
    const resources = this.filteredResources();
    return this.selectedResourceIndex() < resources.length - 1;
  });
  
  toggleSave(resource: DiscoveredResource): void {
    if (resource.is_saved) {
      this.unsaveResourceEvent.emit(resource);
    } else {
      this.saveResourceEvent.emit(resource);
    }
  }
  
  // 🔧 P0: 待加入的資源（用於帳號選擇後繼續加入）
  private pendingJoinResource: DiscoveredResource | null = null;
  
  // 🔧 P0-2: 打開帳號選擇對話框
  openJoinDialog(resource: DiscoveredResource): void {
    console.log('[SearchDiscovery] 打開加入對話框:', resource.title);
    
    if (!resource.username && !resource.telegram_id) {
      this.toast.warning('無法加入：缺少群組標識');
      return;
    }
    
    // 檢查是否已經在加入中
    if (this.joiningResourceIds().has(resource.id)) {
      this.toast.warning('正在加入中，請稍候...');
      return;
    }
    
    // 獲取在線帳號
    const onlineAccounts = this.mergedAccounts().filter(acc => acc.status === 'Online');
    if (onlineAccounts.length === 0) {
      this.toast.warning('沒有在線帳號，請先登錄帳號');
      return;
    }
    
    // 如果只有一個在線帳號，直接使用
    if (onlineAccounts.length === 1) {
      this.executeJoin(resource, onlineAccounts[0].phone);
      return;
    }
    
    // 多個在線帳號，打開選擇對話框
    this.joinDialogResource.set(resource);
    this.joinDialogSelectedPhone.set('');  // 清除之前的選擇
    this.showJoinAccountDialog.set(true);
  }
  
  // 🔧 P0-2: 確認加入（從對話框）
  confirmJoinFromDialog(): void {
    const resource = this.joinDialogResource();
    const phone = this.joinDialogSelectedPhone();
    
    if (!resource) {
      this.toast.warning('請選擇要加入的群組');
      return;
    }
    
    if (!phone) {
      this.toast.warning('請選擇要使用的帳號');
      return;
    }
    
    // 關閉對話框
    this.showJoinAccountDialog.set(false);
    
    // 執行加入
    this.executeJoin(resource, phone);
  }
  
  // 🔧 P0-2: 取消加入對話框
  cancelJoinDialog(): void {
    this.showJoinAccountDialog.set(false);
    this.joinDialogResource.set(null);
    this.joinDialogSelectedPhone.set('');
  }
  
  joinResource(resource: DiscoveredResource): void {
    console.log('[SearchDiscovery] 加入群組:', resource.title, resource.username);
    
    if (!resource.username && !resource.telegram_id) {
      this.toast.warning('無法加入：缺少群組標識');
      return;
    }
    
    // 🔧 P0: 檢查是否已經在加入中
    if (this.joiningResourceIds().has(resource.id)) {
      this.toast.warning('正在加入中，請稍候...');
      return;
    }
    
    // 🔧 P0: 獲取當前選擇的帳號
    const selectedAcc = this.mergedSelectedAccount();
    
    // 🔧 P0: 如果沒有選擇帳號或帳號未連接，彈出選擇器
    if (!selectedAcc) {
      // 保存待加入資源，打開帳號選擇器
      this.pendingJoinResource = resource;
      this.showAccountSelector.set(true);
      this.toast.warning('請選擇一個帳號來加入群組');
      return;
    }
    
    // 🔧 P0: 檢查帳號是否在線
    if (selectedAcc.status !== 'Online') {
      this.toast.warning(`帳號 ${selectedAcc.phone} 未連接，請選擇已連接的帳號`);
      this.pendingJoinResource = resource;
      this.showAccountSelector.set(true);
      return;
    }
    
    // 執行加入
    this.executeJoin(resource, selectedAcc.phone);
  }
  
  // 🔧 Phase2: 執行加入操作（僅加入，不監控）
  private executeJoin(resource: DiscoveredResource, phone: string): void {
    // 設置 Loading 狀態
    this.joiningResourceIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(resource.id);
      return newIds;
    });
    
    this.toast.info(`正在使用 ${phone.slice(0, 4)}**** 加入群組: ${resource.title || resource.username}...`);
    
    // 🆕 Phase2: 使用 join-resource 命令（僅加入，不自動添加到監控）
    this.ipc.send('join-resource', {
      resourceId: resource.id || 0,
      username: resource.username,
      telegramId: resource.telegram_id,
      title: resource.title,
      phone: phone
    });
    
    // 清除待加入資源
    this.pendingJoinResource = null;
    
    // 同時發出事件（保持向後兼容）
    this.joinResourceEvent.emit(resource);
  }
  
  // 🔧 P0: 檢查資源是否正在加入中
  isJoining(resource: DiscoveredResource): boolean {
    return this.joiningResourceIds().has(resource.id);
  }
  
  // 🔧 Phase2: 檢查資源是否正在添加監控中
  isAddingMonitor(resource: DiscoveredResource): boolean {
    return this.monitoringResourceIds().has(resource.id);
  }

  // 🔧 Phase2: 添加到監控列表（帶 Loading 狀態閉環）
  addToMonitoring(resource: DiscoveredResource): void {
    console.log('[SearchDiscovery] 添加到監控:', resource.title);
    
    // 已在監控中 → 跳過
    if (resource.status === 'monitoring') {
      this.toast.info('此群組已在監控列表中');
      return;
    }
    
    // 防重複點擊
    if (this.monitoringResourceIds().has(resource.id)) {
      this.toast.info('正在添加中，請稍候...');
      return;
    }
    
    if (!resource.username && !resource.telegram_id) {
      this.toast.warning('無法監控：缺少群組標識');
      return;
    }
    
    // 設置 Loading 狀態
    this.monitoringResourceIds.update(ids => {
      const newIds = new Set(ids);
      newIds.add(resource.id);
      return newIds;
    });
    
    // 構建監控群組 URL
    const url = resource.username 
      ? `https://t.me/${resource.username}` 
      : (resource.invite_link || `tg://resolve?id=${resource.telegram_id}`);
    
    // 發送 add-monitored-group 命令
    this.ipc.send('add-monitored-group', {
      url: url,
      name: resource.title || resource.username || '',
      telegramId: resource.telegram_id,
      username: resource.username,
      resourceId: resource.id,
      phone: resource.joined_phone || this.mergedSelectedAccount()?.phone,
      keywordSetIds: []
    });
    
    this.toast.info(`📡 正在將「${resource.title || resource.username}」添加到監控列表...`);
    
    // 🔧 Phase2: 安全超時 - 30 秒後自動清除 loading 狀態（防止後端無響應卡死）
    setTimeout(() => {
      if (this.monitoringResourceIds().has(resource.id)) {
        this.monitoringResourceIds.update(ids => {
          const newIds = new Set(ids);
          newIds.delete(resource.id);
          return newIds;
        });
        console.warn('[SearchDiscovery] 監控添加超時，已清除 loading 狀態:', resource.title);
      }
    }, 30000);
  }

  extractMembers(resource: DiscoveredResource): void {
    console.log('[SearchDiscovery] 打開提取成員對話框:', resource.title);
    
    if (!resource.telegram_id && !resource.username) {
      this.toast.warning('無法提取：缺少群組標識');
      return;
    }
    
    // 🔧 修復：確保使用已加入帳號
    const joinedPhone = resource.joined_phone || this.mergedSelectedAccount()?.phone;
    
    // 🆕 Phase3: 未加入群組 → 使用 join-and-extract 一鍵命令
    if (resource.status !== 'joined' && resource.status !== 'monitoring') {
      if (!joinedPhone) {
        this.toast.warning('⚠️ 沒有可用帳號，請先登錄一個 Telegram 帳號。', 5000);
        return;
      }
      this.toast.info('🚀 未加入群組，正在自動加入並提取成員...');
      this.ipc.send('join-and-extract', {
        resourceId: resource.id,
        telegramId: resource.telegram_id,
        username: resource.username,
        groupName: resource.title,
        phone: joinedPhone,
        limit: 200
      });
      return;
    }
    
    // 🔧 修復：使用 DialogService 打開成員提取配置對話框
    const groupInfo = {
      id: String(resource.id || resource.telegram_id || ''),
      name: resource.title || '未知群組',
      url: resource.username ? `https://t.me/${resource.username}` : '',
      telegramId: resource.telegram_id || '',
      memberCount: resource.member_count || 0,
      accountPhone: joinedPhone,
      resourceType: resource.resource_type || 'group'
    };
    
    console.log('[SearchDiscovery] 打開提取成員對話框，群組信息:', groupInfo);
    
    this.dialogService.openMemberExtraction(groupInfo);
    
    // 同時發出事件（保持向後兼容）
    this.extractMembersEvent.emit(resource);
  }
  
  // ============ 批量選擇操作 ============
  
  // 切換單個選擇
  toggleBatchSelect(resource: DiscoveredResource, event: Event): void {
    event.stopPropagation();
    const key = resource.telegram_id || String(resource.id);
    const current = new Set(this.selectedForBatch());
    if (current.has(key)) {
      current.delete(key);
    } else {
      current.add(key);
    }
    this.selectedForBatch.set(current);
  }
  
  // 是否被選中
  isSelectedForBatch(resource: DiscoveredResource): boolean {
    const key = resource.telegram_id || String(resource.id);
    return this.selectedForBatch().has(key);
  }
  
  // 全選本頁
  selectAllVisible(): void {
    const keys = this.filteredResources().map(r => r.telegram_id || String(r.id));
    this.selectedForBatch.set(new Set(keys));
  }
  
  // 取消全選
  clearSelection(): void {
    this.selectedForBatch.set(new Set());
  }
  
  // 反選
  invertSelection(): void {
    const current = this.selectedForBatch();
    const all = this.filteredResources().map(r => r.telegram_id || String(r.id));
    const inverted = new Set(all.filter(key => !current.has(key)));
    this.selectedForBatch.set(inverted);
  }
  
  // 批量收藏選中的
  batchSaveSelected(): void {
    const selected = this.filteredResources().filter(r => 
      this.selectedForBatch().has(r.telegram_id || String(r.id)) && !r.is_saved
    );
    if (selected.length === 0) {
      this.toast.info('未選中可收藏的資源');
      return;
    }
    selected.forEach(r => this.saveResourceEvent.emit(r));
    this.toast.success(`已收藏 ${selected.length} 個資源`);
    this.clearSelection();
  }
  
  // 複製所有選中的 ID
  copySelectedIds(): void {
    const ids = this.filteredResources()
      .filter(r => this.selectedForBatch().has(r.telegram_id || String(r.id)))
      .map(r => r.telegram_id)
      .filter(id => id);
    
    if (ids.length === 0) {
      this.toast.warning('選中的資源中沒有可複製的 ID');
      return;
    }
    
    navigator.clipboard.writeText(ids.join('\n')).then(() => {
      this.toast.success(`已複製 ${ids.length} 個 ID`);
    }).catch(() => {
      this.toast.error('複製失敗');
    });
  }
  
  // 選中數量
  selectedCount = computed(() => this.selectedForBatch().size);
  
  // 🆕 Phase4: 批量提取選中群組的成員
  batchExtractSelected(): void {
    const selected = this.filteredResources().filter(r => 
      this.selectedForBatch().has(r.telegram_id || String(r.id))
    );
    
    if (selected.length === 0) {
      this.toast.warning('請先選擇群組');
      return;
    }
    
    // 收集資源 ID
    const resourceIds = selected.map(r => r.id).filter(id => id);
    
    if (resourceIds.length === 0) {
      this.toast.warning('選中的群組缺少有效 ID');
      return;
    }
    
    this.toast.info(`🚀 開始批量提取 ${resourceIds.length} 個群組的成員...`);
    
    this.ipc.send('batch-extract-members', {
      resourceIds: resourceIds,
      limit: 100,
      safeMode: true
    });
    
    this.clearSelection();
  }

  batchSave(): void {
    const unsaved = this.filteredResources().filter(r => !r.is_saved);
    if (unsaved.length === 0) {
      this.toast.info('所有結果都已收藏');
      return;
    }
    unsaved.forEach(r => this.saveResourceEvent.emit(r));
    this.toast.success(`已收藏 ${unsaved.length} 個資源`);
  }
  
  // 🔧 P0: 增強版導出功能 - 導出全部結果
  exportResults(): void {
    const results = this.filteredResources();
    if (results.length === 0) {
      this.toast.warning('沒有可導出的結果');
      return;
    }
    
    const data = results.map((r, index) => ({
      序號: index + 1,
      ID: r.telegram_id || '',
      名稱: r.title || '',
      Username: r.username || '',
      類型: r.resource_type === 'channel' ? '頻道' : '群組',
      成員數: r.member_count || 0,
      描述: (r.description || '').replace(/"/g, '""').substring(0, 200),
      連結: r.username ? `https://t.me/${r.username}` : '',
      來源: (r as any).source || 'search'
    }));
    
    const headers = ['序號', 'ID', '名稱', 'Username', '類型', '成員數', '描述', '連結', '來源'];
    const csv = [
      headers.join(','),
      ...data.map(d => [
        d.序號,
        `"${d.ID}"`,
        `"${d.名稱}"`,
        d.Username,
        d.類型,
        d.成員數,
        `"${d.描述}"`,
        d.連結,
        d.來源
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const keyword = this.searchQuery || 'all';
    link.download = `telegram-search-${keyword}-${results.length}條-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.toast.success(`已導出 ${results.length} 條搜索結果`);
  }
  
  // ============ 複製功能 ============
  
  copyId(resource: DiscoveredResource, event: Event): void {
    event.stopPropagation();
    const id = resource.telegram_id || '';
    if (!id) {
      this.toast.warning('無可複製的 ID');
      return;
    }
    
    navigator.clipboard.writeText(id).then(() => {
      this.copiedId.set(id);
      console.log('✅ ID 已複製:', id);
      // 2秒後自動恢復狀態
      setTimeout(() => this.copiedId.set(''), 2000);
    }).catch(() => {
      this.toast.error('複製失敗');
    });
  }
  
  copyLink(resource: DiscoveredResource, event: Event): void {
    event.stopPropagation();
    if (!resource.username) {
      this.toast.warning('該資源沒有公開連結');
      return;
    }
    
    const link = `https://t.me/${resource.username}`;
    navigator.clipboard.writeText(link).then(() => {
      this.copiedLink.set(resource.username!);
      console.log('✅ 連結已複製:', link);
      // 2秒後自動恢復狀態
      setTimeout(() => this.copiedLink.set(''), 2000);
    }).catch(() => {
      this.toast.error('複製失敗');
    });
  }
  
  // ============ 輔助方法 ============
  
  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      telegram: 'TG官方',
      jiso: '中文搜索',
      tgstat: 'TGStat',
      local: '本地'
    };
    return labels[source] || source;
  }
  
  // 🆕 格式化分數顯示
  formatScore(score: number | undefined): string {
    if (score === undefined || score === null) {
      return '0.0/1.0';
    }
    return `${score.toFixed(1)}/1.0`;
  }
  
  // 🆕 重置所有篩選條件
  resetFilters(): void {
    this.filterType = 'all';
    this.filterMemberMin.set(null);
    this.filterMemberMax.set(null);
    this.filterSource.set('all');
    this.filterJoinStatus.set('all');
    this.filterHasId.set(false);
  }
  
  // 🆕 計算活躍篩選數量
  activeFilterCount = computed(() => {
    let count = 0;
    if (this.filterType !== 'all') count++;
    if (this.filterMemberMin() !== null && this.filterMemberMin()! > 0) count++;
    if (this.filterMemberMax() !== null && this.filterMemberMax()! > 0) count++;
    if (this.filterSource() !== 'all') count++;
    if (this.filterJoinStatus() !== 'all') count++;
    if (this.filterHasId()) count++;
    return count;
  });
}
