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
import { NavBridgeService } from '../services/nav-bridge.service';
import { SavedResourcesService } from '../services/saved-resources.service';

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
  link?: string;             // 🔧 原始連結（來自 Jiso 等第三方）
  discovery_source?: string;
  discovery_keyword?: string;
  created_at?: string;
  // 🆕 搜索歷史相關
  is_new?: boolean;          // 是否為新發現
  member_change?: number;    // 成員數變化（與上次相比）
  // 🔧 P0-1: 已加入狀態相關
  joined_phone?: string;     // 加入時使用的帳號電話
  // 🔧 可達性標記
  accessibility?: 'public' | 'invite_only' | 'id_only' | 'unknown';
  source?: string;           // 搜索來源（telegram/jiso/local）
  sources?: string[];        // 🔧 Phase3: 多來源合併後的所有來源
  // 🔧 Phase3: 標籤系統
  tags?: string[];
}

// 🔧 渠道搜索狀態
export interface SourceStatus {
  source: string;
  label: string;
  status: 'waiting' | 'searching' | 'completed' | 'failed' | 'timeout';
  count: number;
  elapsed_ms?: number;
  error?: string;
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
              <span class="text-2xl">{{ initialView() === 'resource-center' ? '📦' : '🔍' }}</span>
              {{ initialView() === 'resource-center' ? '資源中心' : '搜索發現' }}
            </h1>
            <!-- 快速統計：資源中心強調已收藏 + 添加資源入口 -->
            <div class="flex items-center gap-2 text-sm">
              @if (initialView() === 'resource-center') {
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                  {{ savedCount() }} 已收藏
                </span>
                <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  {{ mergedResources().length }} 項
                </span>
                <button (click)="goToSearchDiscovery()"
                        class="px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 hover:from-cyan-500/30 hover:to-blue-500/30 rounded-lg border border-cyan-500/50 transition-all flex items-center gap-1">
                  ➕ 添加資源
                </button>
                @if (mergedResources().length > 0) {
                  <button (click)="exportResults()"
                          class="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm transition-all flex items-center gap-1">
                    📤 導出
                  </button>
                  <button (click)="checkResourcesHealth()"
                          [disabled]="healthCheckRunning()"
                          class="px-3 py-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-lg text-sm transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-wait"
                          title="驗證收藏資源的可達性">
                    {{ healthCheckRunning() ? '⏳ 檢查中...' : '🏥 健康檢查' }}
                  </button>
                  <button (click)="batchUnsaveAll()"
                          class="px-3 py-1.5 bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-sm transition-all flex items-center gap-1">
                    🗑️ 清空收藏
                  </button>
                }
                <!-- 🔧 Phase3: 標籤篩選 -->
                @if (allTags().length > 0) {
                  <div class="flex items-center gap-1 ml-2 pl-2 border-l border-slate-700/50">
                    <span class="text-xs text-slate-500">標籤:</span>
                    <button (click)="filterByTag.set('')"
                            class="px-2 py-0.5 rounded text-xs transition-all"
                            [ngClass]="{'bg-cyan-500/20 text-cyan-400': !filterByTag(), 'bg-slate-700/30 text-slate-500 hover:text-slate-300': filterByTag()}">
                      全部
                    </button>
                    @for (tag of allTags(); track tag) {
                      <button (click)="filterByTag.set(filterByTag() === tag ? '' : tag)"
                              class="px-2 py-0.5 rounded text-xs transition-all"
                              [ngClass]="{'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30': filterByTag() === tag, 'bg-slate-700/30 text-slate-400 hover:text-slate-200': filterByTag() !== tag}">
                        🏷️ {{ tag }}
                      </button>
                    }
                  </div>
                }
              } @else {
                <span class="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg">
                  {{ mergedResources().length }} 結果
                </span>
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                  {{ savedCount() }} 已收藏
                </span>
              }
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

      <!-- 搜索欄區域（僅搜索發現頁顯示；資源中心首屏以列表為主） -->
      @if (initialView() !== 'resource-center') {
      <div class="flex-shrink-0 px-6 py-4 border-b border-slate-700/30 bg-slate-800/30">
        <!-- 搜索輸入 -->
        <div class="flex gap-3 mb-4">
          <div class="flex-1 relative">
            <input type="text" 
                   [(ngModel)]="searchQuery"
                   (keyup.enter)="doSearch(); showSuggestions.set(false)"
                   (input)="onSearchInputChange($any($event.target).value)"
                   (focus)="onSearchInputChange(searchQuery); showSuggestions.set(true)"
                   (blur)="hideSuggestions()"
                   placeholder="輸入關鍵詞搜索群組和頻道..."
                   class="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 pl-12 text-white text-lg focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
            
            <!-- 🔧 Phase3: 智能搜索建議下拉 -->
            @if (showSuggestions() && !mergedSearching()) {
              <div class="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                <!-- 後端智能推薦（有輸入時顯示） -->
                @if (keywordSuggestions().length > 0) {
                  <div class="p-3 border-b border-slate-700/50">
                    <div class="text-xs text-slate-500 mb-2">💡 智能推薦</div>
                    @for (sg of keywordSuggestions(); track sg.keyword) {
                      <button (mousedown)="selectSuggestion(sg.keyword)" 
                              class="w-full text-left px-3 py-2 hover:bg-cyan-500/10 rounded-lg text-sm transition-all flex items-center justify-between group">
                        <div class="flex items-center gap-2">
                          <span class="text-white group-hover:text-cyan-400">{{ sg.keyword }}</span>
                          @if (sg.type === 'related') {
                            <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">相關</span>
                          } @else if (sg.type === 'popular') {
                            <span class="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">熱門</span>
                          } @else if (sg.type === 'recent') {
                            <span class="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 rounded text-xs">最近</span>
                          }
                        </div>
                        @if (sg.total_results > 0) {
                          <span class="text-xs text-slate-500">{{ sg.total_results }} 結果</span>
                        }
                      </button>
                    }
                  </div>
                }
                
                <!-- 最近搜索（本地歷史） -->
                @if (mergedHistoryKeywords().length > 0) {
                  <div class="p-3 border-b border-slate-700/50">
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
            <button (click)="forceRefreshSearch()"
                    class="text-xs px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded transition-all"
                    title="忽略緩存重新搜索">
              🔄 強制刷新
            </button>
            <button (click)="clearResults()"
                    class="text-xs px-2 py-1 bg-slate-600/50 hover:bg-slate-600 text-slate-400 rounded transition-all">
              清空結果
            </button>
          </div>
        </div>
      </div>
      }
      
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
                @if (isFromCache()) {
                  <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    📋 緩存
                  </span>
                }
                @if (newDiscoveredCount() > 0 || existingCount() > 0) {
                  <span class="text-green-400 text-xs">🆕 {{ newDiscoveredCount() }} 個新發現</span>
                  <span class="text-slate-500 text-xs">🔄 {{ existingCount() }} 個已知</span>
                }
              </span>
              <!-- 🔧 渠道級搜索進度 -->
              @if (sourceStatuses().length > 0 && mergedSearching()) {
                <div class="flex items-center gap-2 flex-wrap">
                  @for (ss of sourceStatuses(); track ss.source) {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                          [ngClass]="{
                            'bg-slate-700/50 text-slate-500': ss.status === 'waiting',
                            'bg-cyan-500/20 text-cyan-400': ss.status === 'searching',
                            'bg-green-500/20 text-green-400': ss.status === 'completed',
                            'bg-red-500/20 text-red-400': ss.status === 'failed',
                            'bg-amber-500/20 text-amber-400': ss.status === 'timeout'
                          }">
                      @if (ss.status === 'waiting') { ⏸ }
                      @else if (ss.status === 'searching') { <span class="animate-spin">⏳</span> }
                      @else if (ss.status === 'completed') { ✅ }
                      @else if (ss.status === 'failed') { ❌ }
                      @else if (ss.status === 'timeout') { ⚠️ }
                      {{ ss.label }}
                      @if (ss.count > 0) { ({{ ss.count }}) }
                    </span>
                  }
                  <span class="text-slate-500 text-xs">{{ sourceProgressText() }}</span>
                </div>
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
              <!-- 🔧 Phase3: 導出格式選擇 -->
              <div class="relative">
                <button (click)="toggleExportMenu($event)" 
                        [disabled]="filteredResources().length === 0"
                        class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-all"
                        [class]="filteredResources().length > 0 ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-slate-600/30 text-slate-500 cursor-not-allowed'">
                  📤 導出 ({{ filteredResources().length }}) ▾
                </button>
                @if (showExportMenu()) {
                  <div class="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 overflow-hidden min-w-32">
                    <button (click)="exportResults('csv'); showExportMenu.set(false)"
                            class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all">
                      📄 CSV 格式
                    </button>
                    <button (click)="exportResults('json'); showExportMenu.set(false)"
                            class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all">
                      📋 JSON 格式
                    </button>
                  </div>
                }
              </div>
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
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" 
                           [checked]="filterHideUnreachable()"
                           (change)="filterHideUnreachable.set($any($event.target).checked)"
                           class="rounded border-slate-500 bg-slate-700 text-cyan-500">
                    <span class="text-sm text-slate-300">隱藏不可操作群組</span>
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
                  <button (click)="batchAddToMonitoring()" 
                          class="px-2 py-1 text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded transition-all">
                    📡 批量監控
                  </button>
                  @if (initialView() === 'resource-center') {
                    <button (click)="batchUnsaveSelected()" 
                            class="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all">
                      🗑️ 取消收藏
                    </button>
                  }
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
          <!-- 空狀態：資源中心專用 vs 搜索發現 -->
          <div class="flex flex-col items-center justify-center h-full text-center">
            @if (initialView() === 'resource-center') {
              <div class="max-w-lg">
                <div class="text-6xl mb-4">📦</div>
                <p class="text-slate-300 text-xl mb-2">歡迎來到資源中心</p>
                <p class="text-slate-500 mb-6">這裡是你的群組與頻道資產庫。收藏的資源可在此統一管理、批量操作。</p>
                
                <!-- 🔧 3 步引導流程 -->
                <div class="grid grid-cols-3 gap-4 mb-6 text-sm">
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div class="text-3xl mb-2">🔍</div>
                    <div class="text-cyan-400 font-medium mb-1">第一步</div>
                    <div class="text-slate-400">去搜索發現搜索群組</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div class="text-3xl mb-2">⭐</div>
                    <div class="text-yellow-400 font-medium mb-1">第二步</div>
                    <div class="text-slate-400">點擊收藏感興趣的群組</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                    <div class="text-3xl mb-2">📦</div>
                    <div class="text-green-400 font-medium mb-1">第三步</div>
                    <div class="text-slate-400">回到這裡統一管理</div>
                  </div>
                </div>
                
                <button (click)="goToSearchDiscovery()"
                        class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium transition-all shadow-lg shadow-cyan-500/25">
                  🔍 去搜索發現添加資源
                </button>
                
                <!-- 🔧 快捷搜索提示 -->
                @if (mergedHistoryKeywords().length > 0) {
                  <div class="mt-4 text-sm">
                    <span class="text-slate-500">最近搜索過：</span>
                    @for (kw of mergedHistoryKeywords().slice(0, 3); track kw) {
                      <button (click)="goToSearchDiscovery()"
                              class="ml-2 px-3 py-1 bg-slate-700/50 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-full text-xs transition-all">
                        {{ kw }}
                      </button>
                    }
                  </div>
                }
              </div>
            } @else if (mergedSearchError().hasError) {
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
                    <!-- 🔧 Phase3: 標籤按鈕（僅已收藏資源顯示）-->
                    @if (resource.is_saved) {
                      <button (click)="openTagEditor(resource, $event)"
                              class="p-2 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-amber-500/20 hover:text-amber-400 transition-all"
                              title="管理標籤">
                        🏷️
                      </button>
                    }
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
                    
                    <!-- 🆕 第二行：群組 ID + 可達性標記 -->
                    <div class="flex items-center gap-3 mb-2 bg-slate-900/50 rounded-lg px-3 py-2">
                      <span class="text-slate-400 text-sm">ID:</span>
                      @if (resource.telegram_id) {
                        <code class="font-mono text-cyan-300 text-sm select-all">{{ resource.telegram_id }}</code>
                        <button (click)="copyId(resource, $event)"
                                class="px-2 py-1 text-xs rounded transition-all"
                                [class]="copiedId() === resource.telegram_id ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400 hover:bg-cyan-500/20 hover:text-cyan-400'"
                                title="複製 ID">
                          {{ copiedId() === resource.telegram_id ? '✓ 已複製' : '📋 複製' }}
                        </button>
                      } @else if (resource.username) {
                        <code class="font-mono text-slate-400 text-sm">@{{ resource.username }}</code>
                        <span class="text-xs text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded" title="加入後自動獲取數字 ID">
                          加入後自動獲取
                        </span>
                      } @else if (resource.invite_link || resource.link) {
                        <span class="text-xs text-blue-400/80 bg-blue-500/10 px-2 py-0.5 rounded">
                          有邀請鏈接，可加入
                        </span>
                      } @else {
                        <span class="text-slate-500 text-sm bg-red-500/10 px-2 py-0.5 rounded text-red-400/60">信息不完整</span>
                      }
                      <!-- 可達性 chip -->
                      <span class="text-xs px-2 py-0.5 rounded"
                            [ngClass]="{
                              'bg-green-500/10 text-green-400': (resource.accessibility || getAccessibility(resource)) === 'public',
                              'bg-blue-500/10 text-blue-400': (resource.accessibility || getAccessibility(resource)) === 'invite_only',
                              'bg-amber-500/10 text-amber-400': (resource.accessibility || getAccessibility(resource)) === 'id_only',
                              'bg-red-500/10 text-red-400': (resource.accessibility || getAccessibility(resource)) === 'unknown'
                            }">
                        {{ getAccessibilityLabel(resource) }}
                      </span>
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
                      
                      <!-- 來源標記 (支持多來源合併顯示) -->
                      @if (resource.sources && resource.sources.length > 1) {
                        @for (src of resource.sources; track src) {
                          <span class="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                            {{ getSourceLabel(src) }}
                          </span>
                        }
                        <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs" title="多來源驗證">
                          🔗 多源
                        </span>
                      } @else if (resource.source) {
                        <span class="px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                          {{ getSourceLabel(resource.source) }}
                        </span>
                      } @else if (resource.discovery_source) {
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
                      
                      <!-- 🔧 Phase3: 標籤顯示 -->
                      @for (tag of getResourceTags(resource); track tag) {
                        <span class="px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded text-xs">
                          🏷️ {{ tag }}
                        </span>
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
                    } @else if (!canJoin(resource)) {
                      <!-- 🔧 不可操作群組：按鈕置灰 -->
                      <button disabled
                              class="px-4 py-2 bg-slate-600/30 text-slate-500 rounded-lg text-sm cursor-not-allowed"
                              title="該群組信息不完整，無法加入">
                        🚫 無法加入
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
          
          <!-- 🔧 被隱藏的不可達群組提示 -->
          @if (hiddenUnreachableCount() > 0) {
            <div class="mt-3 py-2 px-4 bg-slate-800/30 rounded-lg border border-slate-700/30 text-center">
              <span class="text-slate-500 text-sm">
                還有 {{ hiddenUnreachableCount() }} 個信息不完整的群組已隱藏
              </span>
              <button (click)="filterHideUnreachable.set(false)" 
                      class="ml-2 text-xs text-cyan-400 hover:text-cyan-300 underline">
                顯示全部
              </button>
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
                        @if (resource.status !== 'joined' && resource.status !== 'monitoring') {
                          <span class="text-xs text-blue-400/80" title="加入群組後系統會自動獲取完整數字 ID">加入後自動獲取</span>
                        } @else {
                          <span class="text-xs text-blue-400/80" title="正在同步ID...">🔄 同步中</span>
                        }
                      } @else if (resource.invite_link || resource.link) {
                        <span class="text-xs text-blue-400/80">私有群組（可通過邀請鏈接加入）</span>
                      } @else {
                        <span class="text-slate-500 text-xs">信息不完整（來自第三方索引）</span>
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
                    } @else if (resource.invite_link || resource.link) {
                      <span class="text-blue-400 text-sm">有邀請鏈接（私有群組）</span>
                    } @else {
                      <span class="text-slate-500">無公開連結（第三方索引數據）</span>
                    }
                  </div>
                  <div>
                    <div class="text-slate-500 text-sm mb-1">可達性</div>
                    <span class="text-xs px-2 py-1 rounded"
                          [ngClass]="{
                            'bg-green-500/10 text-green-400': (resource.accessibility || getAccessibility(resource)) === 'public',
                            'bg-blue-500/10 text-blue-400': (resource.accessibility || getAccessibility(resource)) === 'invite_only',
                            'bg-amber-500/10 text-amber-400': (resource.accessibility || getAccessibility(resource)) === 'id_only',
                            'bg-red-500/10 text-red-400': (resource.accessibility || getAccessibility(resource)) === 'unknown'
                          }">
                      {{ getAccessibilityLabel(resource) }}
                    </span>
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
                  @if (resource.sources && resource.sources.length > 0) {
                    @for (src of resource.sources; track src) {
                      <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                        {{ getSourceLabel(src) }}
                      </span>
                    }
                    @if (resource.sources.length > 1) {
                      <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                        🔗 多來源交叉驗證
                      </span>
                    }
                  } @else if (resource.source) {
                    <span class="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
                      來源：{{ getSourceLabel(resource.source) }}
                    </span>
                  } @else if (resource.discovery_source) {
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
                  @if (canJoin(resource)) {
                    <!-- 可加入：加入 + 監控 -->
                    <button (click)="addToMonitoring(resource); closeDetail()"
                            class="px-5 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-medium transition-all">
                      📡 監控
                    </button>
                    <button (click)="openJoinDialog(resource); closeDetail()"
                            class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20">
                      🚀 加入群組
                    </button>
                  } @else {
                    <!-- 不可加入 -->
                    <span class="px-4 py-2 bg-red-500/10 text-red-400/60 rounded-lg text-sm">
                      信息不完整，無法加入
                    </span>
                  }
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
      
      <!-- 🔧 Phase3: 標籤編輯器彈窗 -->
      @if (showTagEditor() && tagEditorTarget(); as resource) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
             (click)="closeTagEditor()">
          <div class="bg-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-md overflow-hidden"
               (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                🏷️ 管理標籤
              </h3>
              <button (click)="closeTagEditor()" class="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div class="px-6 py-4">
              <div class="text-sm text-slate-400 mb-3">{{ resource.title }}</div>
              
              <!-- 已有標籤 -->
              <div class="flex flex-wrap gap-2 mb-4">
                @for (tag of getResourceTags(resource); track tag) {
                  <span class="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm flex items-center gap-1 group">
                    🏷️ {{ tag }}
                    <button (click)="removeTagFromResource(resource, tag)"
                            class="ml-1 text-amber-500/50 hover:text-red-400 transition-all">✕</button>
                  </span>
                }
                @if (getResourceTags(resource).length === 0) {
                  <span class="text-slate-500 text-sm">暫無標籤</span>
                }
              </div>
              
              <!-- 添加新標籤 -->
              <div class="flex items-center gap-2 mb-4">
                <input type="text" 
                       [value]="newTagInput()"
                       (input)="newTagInput.set($any($event.target).value)"
                       (keyup.enter)="addTagToResource()"
                       placeholder="輸入新標籤..."
                       class="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm placeholder-slate-500 focus:border-amber-500/50 focus:outline-none">
                <button (click)="addTagToResource()"
                        [disabled]="!newTagInput().trim()"
                        class="px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                  添加
                </button>
              </div>
              
              <!-- 預設標籤快速添加 -->
              <div class="border-t border-slate-700/30 pt-3">
                <div class="text-xs text-slate-500 mb-2">快速添加：</div>
                <div class="flex flex-wrap gap-1.5">
                  @for (tag of presetTags; track tag) {
                    <button (click)="addTagToResource(tag)"
                            class="px-2.5 py-1 bg-slate-700/40 text-slate-400 hover:bg-amber-500/20 hover:text-amber-400 rounded text-xs transition-all">
                      + {{ tag }}
                    </button>
                  }
                </div>
              </div>
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
  private navBridge = inject(NavBridgeService);
  private savedResourcesService = inject(SavedResourcesService);
  
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
  private readonly SEARCH_BASE_TIMEOUT_MS = 120000;   // 基礎超時 120 秒（對齊 Jiso 90s + 緩衝）
  private readonly HEARTBEAT_TIMEOUT_MS = 120000;     // 🔧 修復: 心跳超時 120 秒（不再誤報超時）
  private lastProgressTime: number = 0;               // 最後收到進度事件的時間
  
  // 🔧 渠道級搜索進度
  sourceStatuses = signal<SourceStatus[]>([]);
  allSourcesDone = computed(() => {
    const statuses = this.sourceStatuses();
    if (statuses.length === 0) return false;
    return statuses.every(s => s.status === 'completed' || s.status === 'failed' || s.status === 'timeout');
  });
  sourceProgressText = computed(() => {
    const statuses = this.sourceStatuses();
    if (statuses.length === 0) return '';
    const done = statuses.filter(s => s.status === 'completed' || s.status === 'failed' || s.status === 'timeout').length;
    return `${done}/${statuses.length} 個渠道已完成`;
  });
  
  // ============ 輸入信號 ============
  initialView = input<string>('search-discovery');  // 🔧 Phase9-5: 區分「資源中心」vs「搜索發現」
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
  // 資源中心模式且父組件傳入已收藏列表時，優先使用該列表；否則為搜索結果或父組件傳入的列表
  mergedResources = computed(() => {
    const isResourceCenter = this.initialView() === 'resource-center';
    const fromInput = this.resources();
    const internal = this._internalResources();
    if (isResourceCenter && fromInput.length > 0) return fromInput;
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
  navigateTo = output<string>();
  
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
  filterHideUnreachable = signal<boolean>(true); // 🔧 默認隱藏不可操作的群組
  filterSavedOnly = signal<boolean>(false); // 🔧 Phase9-5: 只顯示收藏的資源（資源中心模式）
  
  // 🔧 Phase3: 標籤系統
  filterByTag = signal<string>('');  // 按標籤篩選（空 = 全部）
  showTagEditor = signal<boolean>(false);  // 顯示標籤編輯器
  tagEditorTarget = signal<DiscoveredResource | null>(null);  // 標籤編輯目標資源
  newTagInput = signal<string>('');  // 新標籤輸入框
  allTags = computed(() => this.savedResourcesService.allTags());
  
  // 🔧 Phase3: 搜索推薦
  keywordSuggestions = signal<any[]>([]);
  // showSuggestions 已在上方聲明，此處不再重複
  private _suggestionTimer: any = null;
  
  // 🔧 Phase3: 資源健康檢查
  healthCheckRunning = signal(false);
  healthResults = signal<any[]>([]);
  
  // 🔧 Phase2: 搜索緩存控制
  private _lastSearchKey = '';
  private _forceRefresh = false;
  private _searchStartTime = 0;
  isFromCache = signal(false);  // 是否為緩存結果

  constructor() {
    // 路由切換時同步：資源中心只顯示收藏，搜索發現顯示全部
    effect(() => {
      this.filterSavedOnly.set(this.initialView() === 'resource-center');
    });
  }
  
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
    
    // 🔧 默認隱藏完全不可操作的群組（三項標識全無）
    if (this.filterHideUnreachable()) {
      result = result.filter(r => {
        const a = r.accessibility || this.getAccessibility(r);
        return a !== 'unknown';
      });
    }
    
    // 🔧 按可達性排序：public > invite_only > id_only > unknown
    const accessOrder: Record<string, number> = { public: 0, invite_only: 1, id_only: 2, unknown: 3 };
    result = [...result].sort((a, b) => {
      const aAccess = accessOrder[a.accessibility || this.getAccessibility(a)] ?? 3;
      const bAccess = accessOrder[b.accessibility || this.getAccessibility(b)] ?? 3;
      if (aAccess !== bAccess) return aAccess - bAccess;
      return 0;  // 保持原有排序
    });
    
    // 🔧 Phase9-5: 資源中心模式 - 只顯示收藏的資源
    if (this.filterSavedOnly()) {
      result = result.filter(r => r.is_saved);
    }
    
    // 🔧 Phase3: 按標籤篩選
    const tagFilter = this.filterByTag();
    if (tagFilter) {
      result = result.filter(r => {
        const tid = (r.telegram_id || '').toString().trim();
        const tags = this.savedResourcesService.getTags(tid);
        return tags.includes(tagFilter);
      });
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
    
    // 🔧 Phase9-5: 資源中心模式 - 默認只顯示收藏
    if (this.initialView() === 'resource-center') {
      this.filterSavedOnly.set(true);
    }
    
    // 🔧 P0: 獲取帳號列表並監聯更新
    this.loadAccounts();
    this.setupIpcListeners();
    this.loadSearchHistory();
    
    // 🔧 P1: 從 sessionStorage 恢復上次搜索結果
    this.restoreSearchResults();
    
    // 🔧 Phase4: 恢復後，向後端請求最新監控列表用於狀態交叉校驗
    this.syncResourceStatusWithMonitoredGroups();
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
  
  /**
   * 🔧 Phase4: 搜索結果狀態與監控列表交叉校驗
   * 解決：資源在 sessionStorage 中標記為 'monitoring'，但用戶可能已在監控頁刪除
   */
  private syncResourceStatusWithMonitoredGroups(): void {
    // 監聽監控列表返回，用它來校正搜索結果中的狀態
    const syncCleanup = this.ipc.on('get-groups-result', (data: any) => {
      const groups = data.groups || [];
      if (!groups.length && !this._internalResources().length) return;
      
      // 構建監控中的群組標識集合
      const monitoredUrls = new Set<string>();
      const monitoredUsernames = new Set<string>();
      const monitoredTelegramIds = new Set<string>();
      
      for (const g of groups) {
        if (g.url) monitoredUrls.add(g.url);
        if (g.username) monitoredUsernames.add(g.username.toLowerCase().replace('@', ''));
        if (g.telegramId) monitoredTelegramIds.add(String(g.telegramId));
      }
      
      // 校正搜索結果中的狀態
      let corrected = 0;
      const resources = this._internalResources();
      const updated = resources.map(r => {
        const isActuallyMonitored = 
          (r.username && monitoredUsernames.has(r.username.toLowerCase().replace('@', ''))) ||
          (r.telegram_id && monitoredTelegramIds.has(String(r.telegram_id)));
        
        if (r.status === 'monitoring' && !isActuallyMonitored) {
          // 搜索結果顯示監控中，但實際已不在監控列表 → 降級為 joined 或 discovered
          corrected++;
          return { ...r, status: 'joined' as any };
        }
        if (r.status !== 'monitoring' && isActuallyMonitored) {
          // 搜索結果未標記監控，但實際在監控列表 → 升級為 monitoring
          corrected++;
          return { ...r, status: 'monitoring' as any };
        }
        return r;
      });
      
      if (corrected > 0) {
        console.log(`[SearchDiscovery] Phase4: 校正了 ${corrected} 個資源的監控狀態`);
        this._internalResources.set(updated);
        this.saveSearchResults();
      }
    });
    this.ipcCleanup.push(syncCleanup);
    
    // 主動請求最新監控列表（觸發校驗）
    if (this._internalResources().length > 0) {
      this.ipc.send('get-monitored-groups', {});
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
        const resources: DiscoveredResource[] = data.groups.map((g: any, idx: number) => {
          const r: DiscoveredResource = {
            id: idx + 1,
            telegram_id: g.telegram_id || null,
            title: g.title,
            username: g.username,
            description: g.description,
            member_count: g.member_count || g.members_count || 0,
            resource_type: g.type || 'group',
            status: 'discovered',
            overall_score: g.score,
            discovery_source: 'search',
            discovery_keyword: this.searchQuery,
            source: g.source,
            sources: g.sources || (g.source ? [g.source] : []),  // 🔧 Phase3: 多來源
            link: g.link,
            invite_link: g.invite_link || g.link || undefined  // 🔧 統一映射 link → invite_link
          };
          r.accessibility = g.accessibility || this.getAccessibility(r);
          return r;
        });
        
        // 更新結果（累加顯示）
        this._internalResources.set(resources);
        
        // 🔧 更新渠道狀態
        if (data.source) {
          this.sourceStatuses.update(statuses =>
            statuses.map(s => s.source === data.source
              ? { ...s, status: 'completed' as const, count: data.groups?.filter((g: any) => g.source === data.source).length || 0 }
              : s.status === 'waiting' ? { ...s, status: 'searching' as const } : s
            )
          );
        }
        
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
      
      // 🔧 標記所有渠道完成
      this.sourceStatuses.update(statuses =>
        statuses.map(s => s.status === 'searching' || s.status === 'waiting'
          ? { ...s, status: 'completed' as const } : s)
      );
      
      if (data.success && data.groups) {
        const resources: DiscoveredResource[] = data.groups.map((g: any, idx: number) => {
          const r: DiscoveredResource = {
            id: idx + 1,
            telegram_id: g.telegram_id || null,
            title: g.title,
            username: g.username,
            description: g.description,
            member_count: g.member_count || g.members_count || 0,
            resource_type: g.type || 'group',
            status: g.status || 'discovered',
            joined_phone: g.joined_phone || g.joined_by_phone || null,
            overall_score: g.score,
            discovery_source: 'search',
            discovery_keyword: this.searchQuery,
            source: g.source,
            sources: g.sources || (g.source ? [g.source] : []),  // 🔧 Phase3: 多來源
            link: g.link,
            invite_link: g.invite_link || g.link || undefined,  // 🔧 統一映射
            is_new: g.is_new,
            member_change: g.member_change
          };
          r.accessibility = this.getAccessibility(r);
          return r;
        });
        this._internalResources.set(resources);
        this._internalSearchError.set({ hasError: false, message: '' });
        
        // 🔧 P1: 保存搜索結果到 sessionStorage
        this.saveSearchResults();
        
        // 🆕 更新統計計數
        const newCount = data.new_count || 0;
        const existingCount = data.existing_count || 0;
        this.newDiscoveredCount.set(newCount);
        this.existingCount.set(existingCount);
        
        // 🔧 Phase2: 判斷是否命中緩存
        const elapsed = this._searchStartTime ? Date.now() - this._searchStartTime : 99999;
        const isCached = elapsed < 2000;  // 2秒內返回視為緩存命中
        this.isFromCache.set(isCached);
        
        // 🆕 改進的提示消息
        let message = isCached 
          ? `📋 緩存命中：${resources.length} 個結果（${Math.round(elapsed)}ms）`
          : `搜索完成！共找到 ${resources.length} 個結果`;
        if (!isCached && newCount > 0) {
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
      
      // 🔧 更新 Jiso 渠道狀態
      if (data.status === 'searching' || data.status === 'basic_results' || data.status === 'fetching_details') {
        this.sourceStatuses.update(statuses =>
          statuses.map(s => s.source === 'jiso' ? { ...s, status: 'searching' as const } : s)
        );
      }
      
      // 根據狀態更新 UI
      if (data.status === 'basic_results' && data.data?.results) {
        // 🔧 P0: 收到基礎結果，立即顯示（不等待詳情）
        const basicResources: DiscoveredResource[] = data.data.results.map((g: any, idx: number) => {
          const r: DiscoveredResource = {
            id: idx + 1,
            telegram_id: g.telegram_id || null,
            title: g.title,
            username: g.username,
            description: g.description,
            member_count: g.member_count || 0,
            resource_type: g.chat_type || g.type || 'group',
            link: g.link,
            invite_link: g.invite_link || g.link || undefined,
            status: 'discovered',
            overall_score: g.score,
            discovery_source: 'search',
            discovery_keyword: this.searchQuery
          };
          r.accessibility = this.getAccessibility(r);
          return r;
        });
        this._internalResources.set(basicResources);
        this.isFetchingDetails.set(true);
        this.toast.info(`已載入 ${basicResources.length} 個基礎結果，正在獲取詳情...`);
      } else if (data.status === 'fetching_details') {
        this.isFetchingDetails.set(true);
      } else if (data.status === 'completed') {
        this.isFetchingDetails.set(false);
        this.searchProgress.set('');
        // 🔧 標記 Jiso 完成
        this.sourceStatuses.update(statuses =>
          statuses.map(s => s.source === 'jiso' ? { ...s, status: 'completed' as const } : s)
        );
      }
    });
    
    // 🔧 監聽渠道級搜索狀態（後端新增事件）
    const cleanup4b = this.ipc.on('search-source-status', (data: { source: string; status: string; count?: number; elapsed_ms?: number; error?: string }) => {
      this.resetHeartbeat();
      this.sourceStatuses.update(statuses =>
        statuses.map(s => s.source === data.source 
          ? { ...s, status: data.status as any, count: data.count || s.count, elapsed_ms: data.elapsed_ms, error: data.error } 
          : s)
      );
    });
    this.ipcCleanup.push(cleanup4b);
    
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
        if (data.username || data.telegramId || data.resourceId) {
          const currentResources = this._internalResources();
          currentResources.forEach(r => {
            if ((data.resourceId && r.id === data.resourceId) ||
                (data.username && r.username === data.username) ||
                (data.telegramId && r.telegram_id === data.telegramId)) {
              this.joiningResourceIds.update(ids => {
                const newIds = new Set(ids);
                newIds.delete(r.id);
                return newIds;
              });
            }
          });
        }
        
        // 🔧 Phase2: 根據 error_code 顯示精確錯誤提示
        const errorCode = data.error_code || 'UNKNOWN';
        const errorMsg = data.error || '加入失敗';
        this.showJoinError(errorCode, errorMsg);
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
        // 🔧 Phase4: 帶導航鏈接的 toast（只在首次觸發時顯示，避免重複）
        if (!alreadyUpdated) {
          this.toast.successWithNextStep(
            `📡 已成功添加到監控列表: ${data.name || ''}`,
            '前往監控頁 →',
            () => this.navBridge.navigateTo('monitoring-groups')
          );
        }
      } else {
        // 失敗：清除所有 loading + 顯示錯誤（只在有 loading 中的資源時顯示）
        if (this.monitoringResourceIds().size > 0) {
          this.monitoringResourceIds.set(new Set());
          this.toast.error(`❌ 添加監控失敗: ${data.error || '未知錯誤'}`);
        }
      }
    });
    
    // 🔧 Phase7-2: 監聽批量添加監控結果
    const cleanup8b = this.ipc.on('batch-add-monitored-result', (data: any) => {
      // 清除所有 loading 狀態
      this.monitoringResourceIds.set(new Set());
      if (data.success) {
        let msg = `批量添加完成: ${data.added} 個成功`;
        if (data.skipped) msg += `, ${data.skipped} 已存在`;
        if (data.failed) msg += `, ${data.failed} 失敗`;
        this.toast.success(msg);
      } else {
        this.toast.error(`批量添加失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🔧 Phase4: 監聽監控群組列表 → 交叉比對修正搜索結果中的狀態
    const cleanup9 = this.ipc.on('get-groups-result', (data: any) => {
      const groups = data.groups;
      if (!groups || !Array.isArray(groups) || groups.length === 0) return;
      
      const currentResources = this._internalResources();
      if (currentResources.length === 0) return;
      
      // 構建監控群組的 URL/username 集合（用於快速查找）
      const monitoredUrls = new Set<string>();
      const monitoredUsernames = new Set<string>();
      for (const g of groups) {
        if (g.url) monitoredUrls.add(g.url.toLowerCase());
        if (g.username) monitoredUsernames.add(g.username.toLowerCase().replace('@', ''));
      }
      
      // 交叉比對：如果搜索結果中的資源已在監控列表中但狀態不是 monitoring，修正它
      let fixCount = 0;
      const updatedResources = currentResources.map(r => {
        if (r.status === 'monitoring') return r; // 已正確
        
        const isMonitored = 
          (r.username && monitoredUsernames.has(r.username.toLowerCase().replace('@', ''))) ||
          (r.telegram_id && groups.some((g: any) => String(g.telegramId) === String(r.telegram_id)));
        
        if (isMonitored) {
          fixCount++;
          return { ...r, status: 'monitoring' as any };
        }
        return r;
      });
      
      if (fixCount > 0) {
        console.log(`[SearchDiscovery] Phase4: 修正 ${fixCount} 個資源狀態（discovered → monitoring）`);
        this._internalResources.set(updatedResources);
        this.saveSearchResults();
      }
    });
    
    // 🔧 Phase3: 監聽搜索關鍵詞推薦
    const cleanupSuggestions = this.ipc.on('keyword-suggestions', (data: any) => {
      if (data.success && Array.isArray(data.suggestions)) {
        this.keywordSuggestions.set(data.suggestions);
      }
    });
    
    // 🔧 Phase3: 監聽資源健康檢查結果
    const cleanupHealth = this.ipc.on('resources-health-result', (data: any) => {
      this.healthCheckRunning.set(false);
      if (data.success && Array.isArray(data.results)) {
        this.healthResults.set(data.results);
        const { healthy, unhealthy, total } = data;
        if (unhealthy > 0) {
          this.toast.warning(`健康檢查完成：${healthy} 健康, ${unhealthy} 異常（共 ${total}）`);
        } else {
          this.toast.success(`健康檢查完成：全部 ${total} 個資源正常`);
        }
        
        // 更新資源的健康狀態到列表
        this._internalResources.update(list => list.map(r => {
          const tid = (r.telegram_id || '').toString().trim();
          const healthInfo = data.results.find((h: any) => 
            (h.telegram_id || '').toString().trim() === tid ||
            (h.username && r.username && h.username === r.username)
          );
          if (healthInfo) {
            const newAccessibility = healthInfo.status === 'healthy' ? (r.accessibility || 'public') :
              healthInfo.status === 'private' ? 'invite_only' :
              healthInfo.status === 'deleted' || healthInfo.status === 'not_found' ? 'unknown' :
              r.accessibility;
            return {
              ...r,
              accessibility: newAccessibility,
              member_count: healthInfo.member_count || r.member_count,
              _healthStatus: healthInfo.status,
              _healthError: healthInfo.error
            } as DiscoveredResource;
          }
          return r;
        }));
      } else if (!data.success) {
        this.toast.error(`健康檢查失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2a, cleanup2, cleanup3, cleanup4, cleanup5, cleanup6, cleanup7, cleanup8, cleanup8b, cleanup9, cleanupSuggestions, cleanupHealth);
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

  /** 資源中心：跳轉到搜索發現頁添加資源 */
  goToSearchDiscovery(): void {
    this.navigateTo.emit('search-discovery');
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
    
    // 🔧 初始化渠道級搜索狀態
    const sourceLabels: Record<string, string> = { telegram: 'TG官方', jiso: '中文搜索', tgstat: 'TGStat', local: '本地索引' };
    this.sourceStatuses.set(sources.map(s => ({
      source: s,
      label: sourceLabels[s] || s,
      status: 'waiting' as const,
      count: 0
    })));
    
    // 🔧 Phase2: 檢查是否為重複搜索，告知後端可用緩存
    const searchKey = `${query.toLowerCase()}|${sources.sort().join('|')}`;
    const isRepeat = searchKey === this._lastSearchKey;
    this._lastSearchKey = searchKey;
    this._searchStartTime = Date.now();
    this.isFromCache.set(false);
    
    // 🔧 P0: 發送 IPC 搜索請求 - 不限制數量，返回全部結果
    this.ipc.send('search-groups', {
      keyword: query,
      sources: sources,
      account_id: selectedAcc.id,
      account_phone: selectedAcc.phone,
      limit: 500,
      force_refresh: this._forceRefresh  // 🔧 Phase2: 強制刷新標記
    });
    this._forceRefresh = false;  // 重置
    
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
  
  // 🔧 修復: 搜索超時 - 不再彈出誤導性 toast
  private handleSearchTimeout(): void {
    this.clearSearchTimeout();
    // 🔧 如果已有部分結果，不算失敗
    const hasResults = this._internalResources().length > 0;
    if (hasResults) {
      this._internalSearching.set(false);
      this.searchProgress.set('');
      this.isFetchingDetails.set(false);
      // 標記未完成的渠道為超時
      this.sourceStatuses.update(statuses => 
        statuses.map(s => s.status === 'searching' || s.status === 'waiting' 
          ? { ...s, status: 'timeout' as const } : s)
      );
      this.toast.info(`搜索完成，部分渠道響應較慢`);
    } else {
      this._internalSearching.set(false);
      this.searchProgress.set('');
      this.isFetchingDetails.set(false);
      this._internalSearchError.set({
        hasError: true,
        message: '所有搜索渠道均未返回結果，請檢查網路後重試'
      });
    }
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
  
  // 🔧 Phase2: 強制刷新搜索（忽略緩存）
  forceRefreshSearch(): void {
    this._forceRefresh = true;
    if (this.searchQuery.trim()) {
      this.doSearch();
    }
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
    const tid = (resource.telegram_id || '').toString().trim();
    if (resource.is_saved) {
      this.unsaveResourceEvent.emit(resource);
      this._internalResources.update(list =>
        list.map(r => (r.telegram_id === tid || (r.telegram_id || '').toString().trim() === tid) ? { ...r, is_saved: false } : r)
      );
    } else {
      this.saveResourceEvent.emit(resource);
      this._internalResources.update(list =>
        list.map(r => (r.telegram_id === tid || (r.telegram_id || '').toString().trim() === tid) ? { ...r, is_saved: true } : r)
      );
    }
  }
  
  // 🔧 P0: 待加入的資源（用於帳號選擇後繼續加入）
  private pendingJoinResource: DiscoveredResource | null = null;
  
  // 🔧 P0-2: 打開帳號選擇對話框（支持 invite_link）
  openJoinDialog(resource: DiscoveredResource): void {
    console.log('[SearchDiscovery] 打開加入對話框:', resource.title);
    
    if (!this.canJoin(resource)) {
      this.toast.warning('無法加入：該群組信息不完整，缺少用戶名、邀請鏈接和 ID');
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
    
    if (!this.canJoin(resource)) {
      this.toast.warning('無法加入：該群組信息不完整，缺少用戶名、邀請鏈接和 ID');
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
    // 🔧 新增 inviteLink 支持，讓後端可用邀請鏈接加入
    this.ipc.send('join-resource', {
      resourceId: resource.id || 0,
      username: resource.username,
      telegramId: resource.telegram_id,
      inviteLink: resource.invite_link || resource.link || null,
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
  
  // ============ Phase3: 標籤系統 ============
  
  /** 打開標籤編輯器 */
  openTagEditor(resource: DiscoveredResource, event?: Event): void {
    if (event) event.stopPropagation();
    this.tagEditorTarget.set(resource);
    this.showTagEditor.set(true);
    this.newTagInput.set('');
  }
  
  /** 關閉標籤編輯器 */
  closeTagEditor(): void {
    this.showTagEditor.set(false);
    this.tagEditorTarget.set(null);
    this.newTagInput.set('');
  }
  
  /** 添加標籤到目標資源 */
  addTagToResource(tag?: string): void {
    const resource = this.tagEditorTarget();
    if (!resource) return;
    const tagValue = (tag || this.newTagInput()).trim();
    if (!tagValue) return;
    
    const tid = (resource.telegram_id || '').toString().trim();
    this.savedResourcesService.addTag(tid, tagValue);
    this.newTagInput.set('');
    this.toast.success(`已添加標籤「${tagValue}」`);
  }
  
  /** 從資源移除標籤 */
  removeTagFromResource(resource: DiscoveredResource, tag: string): void {
    const tid = (resource.telegram_id || '').toString().trim();
    this.savedResourcesService.removeTag(tid, tag);
  }
  
  /** 獲取資源的標籤 */
  getResourceTags(resource: DiscoveredResource): string[] {
    const tid = (resource.telegram_id || '').toString().trim();
    return this.savedResourcesService.getTags(tid);
  }
  
  /** 常用預設標籤 */
  readonly presetTags = ['區塊鏈', '電商', '金融', '社交', '新聞', '技術', '營銷', '遊戲', 'NFT', 'DeFi'];
  
  // ============ Phase3: 搜索關鍵詞推薦 ============
  
  /** 輸入關鍵詞時請求推薦（防抖 300ms）*/
  onSearchInputChange(value: string): void {
    this.searchQuery = value;
    this.showSuggestions.set(value.trim().length > 0);
    
    if (this._suggestionTimer) clearTimeout(this._suggestionTimer);
    this._suggestionTimer = setTimeout(() => {
      if (value.trim()) {
        this.ipc.send('get-keyword-suggestions', { keyword: value.trim(), limit: 8 });
      } else {
        // 空輸入時請求最近和熱門
        this.ipc.send('get-keyword-suggestions', { keyword: '', limit: 8 });
      }
    }, 300);
  }
  
  /** 選中推薦詞直接搜索（復用 quickSearch）*/
  selectSuggestion(kw: string): void {
    this.quickSearch(kw);
  }
  
  // ============ Phase3: 資源健康檢查 ============
  
  /** 啟動健康檢查 */
  checkResourcesHealth(): void {
    const resources = this.mergedResources().filter(r => r.is_saved);
    if (resources.length === 0) {
      this.toast.info('沒有收藏的資源需要檢查');
      return;
    }
    
    this.healthCheckRunning.set(true);
    this.toast.info(`正在檢查 ${resources.length} 個資源...`);
    
    this.ipc.send('check-resources-health', {
      resources: resources.map(r => ({
        telegram_id: r.telegram_id,
        username: r.username,
        title: r.title
      }))
    });
  }
  
  /** 推薦類型標籤 */
  getSuggestionTypeLabel(type: string): string {
    switch (type) {
      case 'match': return '匹配';
      case 'recent': return '最近';
      case 'popular': return '熱門';
      case 'related': return '相關';
      default: return '';
    }
  }
  
  // 🔧 Phase2: 根據 error_code 顯示精確的加入失敗提示
  private showJoinError(errorCode: string, errorMsg: string): void {
    switch (errorCode) {
      case 'INVITE_EXPIRED':
        this.toast.error(`邀請鏈接已過期：${errorMsg}`);
        break;
      case 'INVITE_INVALID':
        this.toast.error(`邀請鏈接無效：${errorMsg}`);
        break;
      case 'INVITE_PENDING':
        this.toast.info(`已發送加入申請，等待管理員審核`);
        break;
      case 'ALREADY_MEMBER':
        this.toast.info(`已經是該群組的成員`);
        break;
      case 'USER_BANNED':
        this.toast.error(`帳號已被該群組封禁，請嘗試使用其他帳號`);
        break;
      case 'CHANNEL_PRIVATE':
        this.toast.warning(`私有群組，需要邀請鏈接才能加入`);
        break;
      case 'USERNAME_NOT_FOUND':
        this.toast.error(`群組不存在或已被刪除`);
        break;
      case 'FLOOD_WAIT':
        this.toast.warning(`操作過於頻繁，系統會自動重試`);
        break;
      case 'TOO_MANY_CHANNELS':
        this.toast.error(`已加入過多群組，請先退出一些再試`);
        break;
      case 'GROUP_FULL':
        this.toast.error(`群組已滿，無法加入`);
        break;
      case 'NOT_CONNECTED':
        this.toast.warning(`帳號未連接，請先登錄帳號`);
        break;
      case 'PEER_INVALID':
        this.toast.error(`群組 ID 無效，該群組可能已被刪除`);
        break;
      default:
        this.toast.error(`加入失敗：${errorMsg}`);
    }
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
    
    if (!this.canJoin(resource)) {
      this.toast.warning('無法監控：該群組信息不完整，缺少用戶名、邀請鏈接和 ID');
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

  // 🔧 Phase7-2: 批量添加到監控列表
  batchAddToMonitoring(): void {
    const selected = this.filteredResources().filter(r => 
      this.selectedForBatch().has(r.telegram_id || String(r.id))
    );
    
    // 過濾掉已在監控中的
    const toAdd = selected.filter(r => r.status !== 'monitoring');
    
    if (toAdd.length === 0) {
      this.toast.info('選中的資源已全部在監控列表中');
      return;
    }
    
    // 構建批量數據
    const groups = toAdd.map(r => ({
      url: r.username ? `https://t.me/${r.username}` : (r.invite_link || `tg://resolve?id=${r.telegram_id}`),
      name: r.title || r.username || '',
      telegramId: r.telegram_id,
      username: r.username,
      resourceId: r.id,
      phone: r.joined_phone || this.mergedSelectedAccount()?.phone,
    }));
    
    // 設置所有 loading 狀態
    this.monitoringResourceIds.update(ids => {
      const newIds = new Set(ids);
      toAdd.forEach(r => newIds.add(r.id));
      return newIds;
    });
    
    // 發送批量命令
    this.ipc.send('batch-add-monitored-groups', { groups });
    
    this.toast.info(`📡 正在批量添加 ${toAdd.length} 個群組到監控列表...`);
    
    // 超時清除 loading
    setTimeout(() => {
      this.monitoringResourceIds.update(ids => {
        const newIds = new Set(ids);
        toAdd.forEach(r => newIds.delete(r.id));
        return newIds;
      });
    }, 60000);
    
    this.clearSelection();
  }
  
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
  
  // 🔧 Phase2: 批量取消收藏（選中的）
  batchUnsaveSelected(): void {
    const selected = this.filteredResources().filter(r => 
      this.selectedForBatch().has(r.telegram_id || String(r.id)) && r.is_saved
    );
    if (selected.length === 0) {
      this.toast.info('未選中可取消的收藏');
      return;
    }
    selected.forEach(r => this.unsaveResourceEvent.emit(r));
    this._internalResources.update(list =>
      list.map(r => {
        const tid = (r.telegram_id || '').toString().trim();
        if (selected.some(s => (s.telegram_id || '').toString().trim() === tid)) {
          return { ...r, is_saved: false };
        }
        return r;
      })
    );
    this.toast.success(`已取消收藏 ${selected.length} 個資源`);
    this.clearSelection();
  }
  
  // 🔧 Phase2: 清空全部收藏
  batchUnsaveAll(): void {
    const saved = this.mergedResources().filter(r => r.is_saved);
    if (saved.length === 0) {
      this.toast.info('沒有已收藏的資源');
      return;
    }
    // 確認操作
    if (!confirm(`確定清空全部 ${saved.length} 個收藏？此操作不可撤銷。`)) return;
    saved.forEach(r => this.unsaveResourceEvent.emit(r));
    this._internalResources.update(list =>
      list.map(r => ({ ...r, is_saved: false }))
    );
    this.toast.success(`已清空 ${saved.length} 個收藏`);
  }
  
  // 🔧 Phase3: 增強版導出功能 — CSV + JSON + 完整字段
  exportResults(format: 'csv' | 'json' = 'csv'): void {
    const results = this.filteredResources();
    if (results.length === 0) {
      this.toast.warning('沒有可導出的結果');
      return;
    }
    
    const keyword = this.searchQuery || 'all';
    const dateStr = new Date().toISOString().split('T')[0];
    
    const data = results.map((r, index) => ({
      序號: index + 1,
      ID: r.telegram_id || '',
      名稱: r.title || '',
      Username: r.username || '',
      類型: r.resource_type === 'channel' ? '頻道' : '群組',
      成員數: r.member_count || 0,
      描述: (r.description || '').replace(/"/g, '""').substring(0, 200),
      連結: r.username ? `https://t.me/${r.username}` : (r.invite_link || r.link || ''),
      來源: (r.sources && r.sources.length > 0) ? r.sources.join('+') : ((r as any).source || 'search'),
      可達性: this.getAccessibilityLabel(r),
      邀請鏈接: r.invite_link || '',
      標籤: this.getResourceTags(r).join(', '),
      狀態: r.status === 'monitoring' ? '監控中' : r.status === 'joined' ? '已加入' : '未加入',
      收藏: r.is_saved ? '是' : '否'
    }));
    
    if (format === 'json') {
      // JSON 導出
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `telegram-search-${keyword}-${results.length}條-${dateStr}.json`;
      link.click();
    } else {
      // CSV 導出
      const headers = ['序號', 'ID', '名稱', 'Username', '類型', '成員數', '描述', '連結', '來源', '可達性', '邀請鏈接', '標籤', '狀態', '收藏'];
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
          `"${d.連結}"`,
          d.來源,
          d.可達性,
          `"${d.邀請鏈接}"`,
          `"${d.標籤}"`,
          d.狀態,
          d.收藏
        ].join(','))
      ].join('\n');
      
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `telegram-search-${keyword}-${results.length}條-${dateStr}.csv`;
      link.click();
    }
    
    this.toast.success(`已導出 ${results.length} 條結果 (${format.toUpperCase()})`);
  }
  
  // 🔧 Phase3: 導出格式選擇
  showExportMenu = signal(false);
  
  toggleExportMenu(event: Event): void {
    event.stopPropagation();
    this.showExportMenu.update(v => !v);
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
      local: '本地',
      search: '搜索'
    };
    return labels[source] || source;
  }
  
  // 🔧 計算資源可達性
  getAccessibility(r: DiscoveredResource): 'public' | 'invite_only' | 'id_only' | 'unknown' {
    if (r.username) return 'public';
    const inviteLink = r.invite_link || r.link || '';
    if (inviteLink && (inviteLink.includes('/+') || inviteLink.includes('joinchat'))) return 'invite_only';
    if (r.telegram_id) return 'id_only';
    return 'unknown';
  }
  
  // 🔧 獲取可達性標籤
  getAccessibilityLabel(r: DiscoveredResource): string {
    const a = r.accessibility || this.getAccessibility(r);
    switch (a) {
      case 'public': return '公開群組';
      case 'invite_only': return '邀請鏈接';
      case 'id_only': return '僅有ID';
      case 'unknown': return '信息不完整';
    }
  }
  
  // 🔧 獲取有效的加入鏈接
  getEffectiveJoinLink(r: DiscoveredResource): string | null {
    if (r.username) return `https://t.me/${r.username.replace('@', '')}`;
    const inviteLink = r.invite_link || r.link || '';
    if (inviteLink) return inviteLink;
    if (r.telegram_id) return String(r.telegram_id);
    return null;
  }
  
  // 🔧 判斷是否可以加入
  canJoin(r: DiscoveredResource): boolean {
    return !!(r.username || r.invite_link || r.link || r.telegram_id);
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
    this.filterHideUnreachable.set(true);
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
    if (!this.filterHideUnreachable()) count++;  // 如果手動關閉了，算一個篩選
    return count;
  });
  
  // 🔧 計算被隱藏的不可達群組數量
  hiddenUnreachableCount = computed(() => {
    if (!this.filterHideUnreachable()) return 0;
    return this.mergedResources().filter(r => {
      const a = r.accessibility || this.getAccessibility(r);
      return a === 'unknown';
    }).length;
  });
}
