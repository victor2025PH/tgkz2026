/**
 * 搜索發現組件 - Search Discovery Component
 * 獨立頁面，專注於搜索和發現 Telegram 群組/頻道
 * 
 * 優化重點：
 * 1. 更大的搜索結果顯示區域
 * 2. 群組 ID 顯示和一鍵複製
 * 3. 更好的 UI/UX 體驗
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';

// 資源類型定義
export interface DiscoveredResource {
  id: number;
  telegram_id: string;
  title: string;
  username?: string;
  description?: string;
  member_count: number;
  resource_type: 'group' | 'channel' | 'supergroup';
  status: 'discovered' | 'pending' | 'joined' | 'monitoring' | 'failed';
  overall_score?: number;
  is_saved?: boolean;
  invite_link?: string;
  discovery_source?: string;
  discovery_keyword?: string;
  created_at?: string;
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
                {{ resources().length }} 結果
              </span>
              <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">
                {{ savedCount() }} 已收藏
              </span>
            </div>
          </div>
          
          <!-- 帳號選擇 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-slate-400">使用帳號:</span>
              @if (selectedAccount(); as account) {
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
                        @for (acc of availableAccounts(); track acc.id) {
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
            @if (isSearching()) {
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
            @if (showSuggestions() && !isSearching()) {
              <div class="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                @if (historyKeywords().length > 0) {
                  <div class="p-3 border-b border-slate-700">
                    <div class="text-xs text-slate-500 mb-2">🕐 最近搜索</div>
                    <div class="flex flex-wrap gap-2">
                      @for (kw of historyKeywords().slice(0, 5); track kw) {
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
                  [disabled]="isSearching() || !searchQuery.trim()"
                  class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/25">
            {{ isSearching() ? '搜索中...' : '搜索' }}
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
      @if (resources().length > 0 || currentKeyword()) {
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
              <span class="text-slate-400 text-sm">
                共 <span class="font-bold text-white">{{ resources().length }}</span> 個結果
              </span>
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
                      class="px-3 py-1.5 bg-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
                📤 導出
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
                </div>
              }
            </div>
          }
        </div>
      }
      
      <!-- 搜索結果列表 - 最大化顯示區域 -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        @if (isSearching()) {
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
            @if (searchError().hasError) {
              <div class="max-w-md">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-red-400 text-xl mb-2">搜索失敗</p>
                <p class="text-slate-400 mb-4">{{ searchError().message }}</p>
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
          <!-- 結果列表 -->
          <div class="space-y-3">
            @for (resource of filteredResources(); track getResourceTrackId(resource, $index)) {
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
                    <!-- 第一行：類型 + 標題 + Username -->
                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                      <span class="px-2.5 py-1 text-xs rounded-full font-medium flex-shrink-0" 
                            [class]="resource.resource_type === 'channel' ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/30 text-blue-300'">
                        {{ resource.resource_type === 'channel' ? '📢 頻道' : '👥 群組' }}
                      </span>
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
                      @if (resource.status === 'joined' || resource.status === 'monitoring') {
                        <span class="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">✓ 已加入</span>
                      }
                    </div>
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex-shrink-0 flex flex-col gap-2" (click)="$event.stopPropagation()">
                    @if (resource.status === 'joined' || resource.status === 'monitoring') {
                      <span class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm text-center">
                        ✅ 已加入
                      </span>
                    } @else {
                      <button (click)="joinResource(resource)" 
                              class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-cyan-500/20">
                        🚀 加入
                      </button>
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
                                title="需要先加入群組">
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
                    <div class="text-2xl font-bold" [class]="(resource.status === 'joined' || resource.status === 'monitoring') ? 'text-green-400' : 'text-slate-400'">
                      {{ (resource.status === 'joined' || resource.status === 'monitoring') ? '✓' : '—' }}
                    </div>
                    <div class="text-slate-500 text-sm">
                      @if (resource.status === 'monitoring') {
                        已加入·監控中
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
                  <button (click)="joinResource(resource); closeDetail()"
                          class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/20">
                    🚀 加入群組
                  </button>
                } @else {
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
  `]
})
export class SearchDiscoveryComponent implements OnInit, OnDestroy {
  private toast = inject(ToastService);
  
  // ============ 輸入信號 ============
  resources = input<DiscoveredResource[]>([]);
  isSearching = input<boolean>(false);
  selectedAccount = input<Account | null>(null);
  availableAccounts = input<Account[]>([]);
  historyKeywords = input<string[]>([]);
  currentKeyword = input<string>('');
  searchError = input<{ hasError: boolean; message: string }>({ hasError: false, message: '' });
  savedResourceIds = input<Set<string>>(new Set());
  
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
    let result = this.resources();
    
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
    
    // 🆕 加入狀態篩選
    const joinStatus = this.filterJoinStatus();
    if (joinStatus === 'joined') {
      result = result.filter(r => r.status === 'joined' || r.status === 'monitoring');
    } else if (joinStatus === 'not_joined') {
      result = result.filter(r => r.status !== 'joined' && r.status !== 'monitoring');
    }
    
    // 🆕 只顯示有 ID 的結果
    if (this.filterHasId()) {
      result = result.filter(r => r.telegram_id && r.telegram_id.trim() !== '');
    }
    
    return result;
  });
  
  // 已收藏數量
  savedCount = computed(() => {
    return this.resources().filter(r => r.is_saved).length;
  });
  
  // ============ 追蹤鍵生成 ============
  
  /**
   * 生成資源的唯一追蹤鍵
   * 解決 NG0955 錯誤：當 telegram_id 或 id 為空/0 時產生重複鍵
   * 
   * @param resource 資源對象
   * @param index 列表索引（作為最後的回退）
   * @returns 唯一的追蹤鍵字串
   */
  getResourceTrackId(resource: DiscoveredResource, index: number): string {
    // 優先使用 telegram_id（非空非0）
    if (resource.telegram_id && resource.telegram_id.toString().trim() !== '' && resource.telegram_id.toString() !== '0') {
      return `tg-${resource.telegram_id}`;
    }
    // 其次使用 id（非空非0）
    if (resource.id && resource.id !== 0) {
      return `id-${resource.id}`;
    }
    // 使用 username 作為備選
    if (resource.username && resource.username.trim() !== '') {
      return `user-${resource.username}`;
    }
    // 最後使用索引 + 標題hash確保唯一性
    const titleHash = resource.title ? resource.title.substring(0, 20) : 'untitled';
    return `idx-${index}-${titleHash}`;
  }
  
  // ============ 生命週期 ============
  
  ngOnInit(): void {
    // 點擊外部關閉下拉框
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    // 🆕 鍵盤快捷鍵支持
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }
  
  ngOnDestroy(): void {
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    document.removeEventListener('keydown', this.handleKeydown.bind(this));
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
    
    this.searchEvent.emit({
      query: this.searchQuery.trim(),
      sources: this.selectedSources()
    });
  }
  
  quickSearch(keyword: string): void {
    this.searchQuery = keyword;
    this.showSuggestions.set(false);
    this.doSearch();
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
    this.selectAccountEvent.emit(account);
    this.showAccountSelector.set(false);
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
  
  joinResource(resource: DiscoveredResource): void {
    this.joinResourceEvent.emit(resource);
  }
  
  extractMembers(resource: DiscoveredResource): void {
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
  
  batchSave(): void {
    const unsaved = this.filteredResources().filter(r => !r.is_saved);
    if (unsaved.length === 0) {
      this.toast.info('所有結果都已收藏');
      return;
    }
    unsaved.forEach(r => this.saveResourceEvent.emit(r));
    this.toast.success(`已收藏 ${unsaved.length} 個資源`);
  }
  
  exportResults(): void {
    const data = this.filteredResources().map(r => ({
      id: r.telegram_id,
      title: r.title,
      username: r.username || '',
      type: r.resource_type,
      members: r.member_count,
      link: r.username ? `https://t.me/${r.username}` : ''
    }));
    
    const csv = [
      ['ID', '名稱', 'Username', '類型', '成員數', '連結'].join(','),
      ...data.map(d => [d.id, `"${d.title}"`, d.username, d.type, d.members, d.link].join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    this.toast.success('已導出搜索結果');
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
