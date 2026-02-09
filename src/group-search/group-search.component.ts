/**
 * TG-AI智控王 群組搜索組件
 * Group Search Component v1.0
 */
import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupSearchService } from './search.service';
import { MemberExtractionService } from './member-extraction.service';
import { MembershipService, MEMBERSHIP_CONFIG } from '../membership.service';
import { ToastService } from '../toast.service';
import {
  SearchSource,
  SearchSourceConfig,
  SearchFilters,
  GroupSearchItem,
  GroupBasicInfo,
  GroupType,
  SearchHistory,
  FavoriteGroup
} from './search.types';

type ViewMode = 'search' | 'detail' | 'members' | 'history' | 'favorites';
type SortOption = 'relevance' | 'members' | 'activity' | 'growth';

@Component({
  selector: 'app-group-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-slate-900 text-white">
      <!-- 頂部標題欄 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🔍</span>
          <h2 class="text-xl font-bold">群組搜索中心</h2>
          <span class="px-2 py-0.5 text-xs rounded bg-cyan-500/20 text-cyan-400">Beta</span>
        </div>
        
        <!-- 視圖切換 -->
        <div class="flex items-center gap-2">
          <button (click)="currentView.set('search')"
                  [class]="currentView() === 'search' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <span>🔍</span> 搜索
          </button>
          <button (click)="currentView.set('history')"
                  [class]="currentView() === 'history' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <span>📜</span> 歷史
            @if (searchService.searchHistory().length > 0) {
              <span class="px-1.5 py-0.5 text-xs rounded-full bg-slate-700">{{ searchService.searchHistory().length }}</span>
            }
          </button>
          <button (click)="currentView.set('favorites')"
                  [class]="currentView() === 'favorites' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'"
                  class="px-4 py-2 rounded-lg transition-all flex items-center gap-2">
            <span>⭐</span> 收藏
            @if (searchService.favorites().length > 0) {
              <span class="px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">{{ searchService.favorites().length }}</span>
            }
          </button>
        </div>
        
        <!-- 配額顯示 -->
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="text-slate-400">今日搜索:</span>
            <span [class]="searchService.remainingSearches() <= 5 ? 'text-orange-400' : 'text-green-400'">
              {{ searchService.todaySearchCount() }}/{{ searchService.searchQuota().searches === -1 ? '∞' : searchService.searchQuota().searches }}
            </span>
          </div>
          <div class="px-3 py-1 rounded-lg bg-slate-800 flex items-center gap-2">
            <span>{{ membershipService.levelIcon() }}</span>
            <span class="text-slate-300">{{ membershipService.levelName() }}</span>
          </div>
        </div>
      </div>
      
      <!-- 主內容區 -->
      <div class="flex-1 overflow-hidden flex">
        <!-- 搜索視圖 -->
        @if (currentView() === 'search') {
          <div class="flex-1 flex flex-col">
            <!-- 搜索欄 -->
            <div class="p-6 border-b border-slate-700/50">
              <div class="max-w-4xl mx-auto">
                <!-- 搜索輸入框 -->
                <div class="relative">
                  <input type="text"
                         [(ngModel)]="searchKeyword"
                         (keyup.enter)="performSearch()"
                         placeholder="搜索中文群組、頻道..."
                         class="w-full px-6 py-4 pr-32 text-lg bg-slate-800/50 border border-slate-700 rounded-2xl focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all">
                  <button (click)="performSearch()"
                          [disabled]="searchService.isSearching() || !searchKeyword.trim()"
                          class="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2">
                    @if (searchService.isSearching()) {
                      <span class="animate-spin">⏳</span> 搜索中...
                    } @else {
                      <span>🔍</span> 搜索
                    }
                  </button>
                </div>
                
                <!-- 搜索選項 -->
                <div class="mt-4 flex items-center justify-between">
                  <!-- 搜索源選擇 -->
                  <div class="flex items-center gap-4">
                    <span class="text-sm text-slate-400">搜索源:</span>
                    @for (source of searchService.searchSources(); track source.id) {
                      <label class="flex items-center gap-2 cursor-pointer"
                             [class.opacity-50]="!isSourceAvailable(source)">
                        <input type="checkbox"
                               [checked]="selectedSources.has(source.id)"
                               [disabled]="!isSourceAvailable(source)"
                               (change)="toggleSource(source.id)"
                               class="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500">
                        <span class="flex items-center gap-1.5">
                          <span>{{ source.icon }}</span>
                          <span class="text-sm">{{ source.name }}</span>
                          @if (source.status === 'checking') {
                            <span class="text-xs text-slate-500">...</span>
                          } @else if (source.status === 'unavailable') {
                            <span class="text-xs text-red-400">✗</span>
                          }
                        </span>
                      </label>
                    }
                  </div>
                  
                  <!-- 篩選按鈕 -->
                  <button (click)="showFilters.set(!showFilters())"
                          class="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                    <span>🎛️</span> 篩選
                    @if (hasActiveFilters()) {
                      <span class="px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">{{ activeFilterCount() }}</span>
                    }
                  </button>
                </div>
                
                <!-- 篩選面板 -->
                @if (showFilters()) {
                  <div class="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                    <div class="grid grid-cols-4 gap-4">
                      <!-- 類型 -->
                      <div>
                        <label class="block text-sm text-slate-400 mb-2">類型</label>
                        <select [(ngModel)]="filters.type"
                                class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                          <option [ngValue]="undefined">全部</option>
                          <option value="group">群組</option>
                          <option value="supergroup">超級群組</option>
                          <option value="channel">頻道</option>
                        </select>
                      </div>
                      
                      <!-- 語言 -->
                      <div>
                        <label class="block text-sm text-slate-400 mb-2">語言</label>
                        <select [(ngModel)]="filters.language"
                                class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                          <option [ngValue]="undefined">全部</option>
                          <option value="zh">中文</option>
                          <option value="en">英文</option>
                          <option value="ru">俄文</option>
                        </select>
                      </div>
                      
                      <!-- 最小成員數 -->
                      <div>
                        <label class="block text-sm text-slate-400 mb-2">最小成員</label>
                        <select [(ngModel)]="filters.minMembers"
                                class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                          <option [ngValue]="undefined">不限</option>
                          <option [ngValue]="100">100+</option>
                          <option [ngValue]="500">500+</option>
                          <option [ngValue]="1000">1000+</option>
                          <option [ngValue]="5000">5000+</option>
                          <option [ngValue]="10000">10000+</option>
                        </select>
                      </div>
                      
                      <!-- 排序 -->
                      <div>
                        <label class="block text-sm text-slate-400 mb-2">排序</label>
                        <select [(ngModel)]="filters.sortBy"
                                class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                          <option value="relevance">相關度</option>
                          <option value="members">成員數</option>
                          <option value="activity">活躍度</option>
                        </select>
                      </div>
                    </div>
                    
                    <div class="mt-4 flex items-center gap-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                               [(ngModel)]="filters.hasUsername"
                               class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                        <span class="text-sm">有用戶名</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                               [(ngModel)]="filters.isActive"
                               class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                        <span class="text-sm">近期活躍</span>
                      </label>
                      
                      <button (click)="clearFilters()"
                              class="ml-auto text-sm text-slate-400 hover:text-white">
                        清除篩選
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- 搜索結果 -->
            <div class="flex-1 overflow-auto p-6">
              @if (searchService.searchResults(); as results) {
                <!-- 結果統計 -->
                <div class="mb-4 flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <span class="text-slate-400">
                      找到 <span class="text-white font-medium">{{ results.totalCount }}</span> 個結果
                    </span>
                    <span class="text-slate-500 text-sm">
                      耗時 {{ results.searchTime }}ms
                    </span>
                  </div>
                  
                  <!-- 來源統計 -->
                  <div class="flex items-center gap-2">
                    @for (source of results.sources; track source.source) {
                      <span class="px-2 py-1 text-xs rounded-lg"
                            [class]="source.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
                        {{ getSourceName(source.source) }}: {{ source.count }}
                      </span>
                    }
                  </div>
                </div>
                
                <!-- 群組列表 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (group of results.groups; track group.id) {
                    <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-cyan-500/50 transition-all cursor-pointer"
                         (click)="selectGroup(group)">
                      <div class="flex items-start gap-4">
                        <!-- 頭像 -->
                        <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl flex-shrink-0">
                          @if (group.photo?.smallUrl) {
                            <img [src]="group.photo.smallUrl" class="w-full h-full rounded-xl object-cover">
                          } @else {
                            {{ group.title[0] }}
                          }
                        </div>
                        
                        <!-- 信息 -->
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <h3 class="font-semibold truncate">{{ group.title }}</h3>
                            @if (group.type === 'channel') {
                              <span class="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">頻道</span>
                            }
                            @if (searchService.isFavorite(group.id)) {
                              <span class="text-yellow-400">⭐</span>
                            }
                          </div>
                          
                          @if (group.username) {
                            <p class="text-sm text-cyan-400">{{ '@' + group.username }}</p>
                          }
                          
                          @if (group.description) {
                            <p class="text-sm text-slate-400 line-clamp-2 mt-1">{{ group.description }}</p>
                          }
                          
                          <div class="mt-2 flex items-center gap-4 text-sm">
                            <span class="flex items-center gap-1">
                              <span class="text-slate-500">👥</span>
                              <span class="text-slate-300">{{ formatNumber(group.membersCount) }}</span>
                            </span>
                            <span class="px-2 py-0.5 text-xs rounded bg-slate-700 text-slate-400">
                              {{ getSourceName(group.source) }}
                            </span>
                          </div>
                        </div>
                        
                        <!-- 操作按鈕 -->
                        <div class="flex flex-col gap-2">
                          <button (click)="toggleFavorite(group, $event)"
                                  class="p-2 rounded-lg hover:bg-slate-700 transition-colors"
                                  [class.text-yellow-400]="searchService.isFavorite(group.id)">
                            {{ searchService.isFavorite(group.id) ? '⭐' : '☆' }}
                          </button>
                          <button (click)="joinGroup(group, $event)"
                                  class="p-2 rounded-lg hover:bg-cyan-500/20 text-cyan-400 transition-colors">
                            ➕
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
                
                <!-- 加載更多 -->
                @if (results.hasMore) {
                  <div class="mt-6 text-center">
                    <button (click)="loadMore()"
                            [disabled]="searchService.isSearching()"
                            class="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                      @if (searchService.isSearching()) {
                        <span class="animate-spin">⏳</span> 載入中...
                      } @else {
                        載入更多
                      }
                    </button>
                  </div>
                }
              } @else if (searchService.isSearching()) {
                <!-- 搜索中 -->
                <div class="flex flex-col items-center justify-center py-20">
                  <div class="text-4xl mb-4 animate-bounce">🔍</div>
                  <p class="text-slate-400">正在搜索中...</p>
                </div>
              } @else if (searchService.searchError()) {
                <!-- 錯誤 -->
                <div class="flex flex-col items-center justify-center py-20">
                  <div class="text-4xl mb-4">❌</div>
                  <p class="text-red-400">{{ searchService.searchError() }}</p>
                  <button (click)="performSearch()"
                          class="mt-4 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">
                    重試
                  </button>
                </div>
              } @else {
                <!-- 空狀態 -->
                <div class="flex flex-col items-center justify-center py-20">
                  <div class="text-6xl mb-4">🔎</div>
                  <p class="text-xl text-slate-400 mb-2">開始搜索 Telegram 群組</p>
                  <p class="text-sm text-slate-500">支持多個搜索源，可搜索中文群組和頻道</p>
                  
                  <!-- 熱門搜索 -->
                  <div class="mt-8">
                    <p class="text-sm text-slate-500 mb-3">熱門搜索:</p>
                    <div class="flex flex-wrap gap-2 justify-center">
                      @for (tag of hotKeywords; track tag) {
                        <button (click)="quickSearch(tag)"
                                class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                          {{ tag }}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
        
        <!-- 歷史視圖 -->
        @if (currentView() === 'history') {
          <div class="flex-1 p-6 overflow-auto">
            <div class="max-w-3xl mx-auto">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold">搜索歷史</h3>
                @if (searchService.searchHistory().length > 0) {
                  <button (click)="clearHistory()"
                          class="text-sm text-slate-400 hover:text-red-400">
                    清空歷史
                  </button>
                }
              </div>
              
              @if (searchService.searchHistory().length === 0) {
                <div class="text-center py-20 text-slate-500">
                  <div class="text-4xl mb-4">📜</div>
                  <p>暫無搜索歷史</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (item of searchService.searchHistory(); track item.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                         (click)="searchFromHistory(item)">
                      <div class="flex items-center gap-4">
                        <span class="text-slate-500">🔍</span>
                        <div>
                          <p class="font-medium">{{ item.query.keyword }}</p>
                          <p class="text-sm text-slate-500">{{ item.resultsCount }} 個結果 · {{ formatTime(item.timestamp) }}</p>
                        </div>
                      </div>
                      <button (click)="removeFromHistory(item.id, $event)"
                              class="p-2 text-slate-500 hover:text-red-400">
                        ✕
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
        
        <!-- 收藏視圖 -->
        @if (currentView() === 'favorites') {
          <div class="flex-1 p-6 overflow-auto">
            <div class="max-w-4xl mx-auto">
              <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-semibold">收藏的群組</h3>
                <span class="text-sm text-slate-400">{{ searchService.favorites().length }} 個收藏</span>
              </div>
              
              @if (searchService.favorites().length === 0) {
                <div class="text-center py-20 text-slate-500">
                  <div class="text-4xl mb-4">⭐</div>
                  <p>暫無收藏群組</p>
                  <p class="text-sm mt-2">搜索群組後點擊星標即可收藏</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  @for (fav of searchService.favorites(); track fav.id) {
                    <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50"
                         (click)="selectGroup(fav.group)">
                      <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-xl flex-shrink-0">
                          {{ fav.group.title[0] }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="font-medium truncate">{{ fav.group.title }}</h4>
                          @if (fav.group.username) {
                            <p class="text-sm text-cyan-400">{{ '@' + fav.group.username }}</p>
                          }
                          <p class="text-xs text-slate-500 mt-1">收藏於 {{ formatTime(fav.addedAt) }}</p>
                        </div>
                        <button (click)="removeFavorite(fav.group.id, $event)"
                                class="text-yellow-400 hover:text-yellow-300">
                          ⭐
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        }
        
        <!-- 群組詳情視圖 -->
        @if (currentView() === 'detail' && selectedGroup()) {
          <div class="flex-1 overflow-auto">
            <!-- 群組詳情面板會在這裡渲染 -->
            <app-group-detail 
              [group]="selectedGroup()!"
              (back)="currentView.set('search')"
              (extractMembers)="goToMembers()"
              (joinAndMonitor)="joinAndMonitorGroup()">
            </app-group-detail>
          </div>
        }
        
        <!-- 成員列表視圖 -->
        @if (currentView() === 'members' && selectedGroup()) {
          <div class="flex-1 overflow-auto">
            <!-- 成員提取面板會在這裡渲染 -->
            <app-member-list
              [group]="selectedGroup()!"
              (back)="currentView.set('detail')">
            </app-member-list>
          </div>
        }
      </div>
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
  `]
})
export class GroupSearchComponent implements OnInit, OnDestroy {
  searchService = inject(GroupSearchService);
  membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  
  // 視圖狀態
  currentView = signal<ViewMode>('search');
  
  // 搜索狀態
  searchKeyword = '';
  selectedSources = new Set<SearchSource>(['telegram', 'local']);
  showFilters = signal(false);
  
  // 篩選條件
  filters: Partial<SearchFilters> = {
    sortBy: 'relevance'
  };
  
  // 選中的群組
  selectedGroup = signal<GroupBasicInfo | null>(null);
  
  // 熱門關鍵詞
  hotKeywords = ['幣圈', '交流群', '中文', '投資', '區塊鏈', '電商', 'Web3', 'NFT'];
  
  ngOnInit(): void {
    // 初始化選中的搜索源
    const available = this.searchService.availableSources();
    this.selectedSources = new Set(available.map(s => s.id));
  }
  
  ngOnDestroy(): void {}
  
  // ============ 搜索操作 ============
  
  performSearch(): void {
    if (!this.searchKeyword.trim()) return;
    
    this.searchService.search(this.searchKeyword, {
      sources: Array.from(this.selectedSources),
      filters: this.filters
    });
  }
  
  loadMore(): void {
    this.searchService.loadMore();
  }
  
  quickSearch(keyword: string): void {
    this.searchKeyword = keyword;
    this.performSearch();
  }
  
  searchFromHistory(item: SearchHistory): void {
    this.searchKeyword = item.query.keyword;
    this.selectedSources = new Set(item.query.sources);
    this.filters = item.query.filters;
    this.currentView.set('search');
    this.performSearch();
  }
  
  // ============ 搜索源 ============
  
  toggleSource(sourceId: SearchSource): void {
    if (this.selectedSources.has(sourceId)) {
      this.selectedSources.delete(sourceId);
    } else {
      this.selectedSources.add(sourceId);
    }
  }
  
  isSourceAvailable(source: SearchSourceConfig): boolean {
    if (!source.enabled || source.status !== 'available') return false;
    const levelRank = this.membershipService.levelRank();
    const requiredRank = this.getLevelRank(source.requiredLevel);
    return levelRank >= requiredRank;
  }
  
  private getLevelRank(level: string): number {
    const ranks: Record<string, number> = {
      bronze: 0, silver: 1, gold: 2, diamond: 3, star: 4, king: 5
    };
    return ranks[level] || 0;
  }
  
  getSourceName(source: SearchSource): string {
    const names: Record<SearchSource, string> = {
      telegram: 'TG官方',
      jiso: '極搜',
      tgstat: 'TGStat',
      local: '本地'
    };
    return names[source] || source;
  }
  
  // ============ 篩選 ============
  
  hasActiveFilters(): boolean {
    return !!(
      this.filters.type ||
      this.filters.language ||
      this.filters.minMembers ||
      this.filters.hasUsername ||
      this.filters.isActive
    );
  }
  
  activeFilterCount(): number {
    let count = 0;
    if (this.filters.type) count++;
    if (this.filters.language) count++;
    if (this.filters.minMembers) count++;
    if (this.filters.hasUsername) count++;
    if (this.filters.isActive) count++;
    return count;
  }
  
  clearFilters(): void {
    this.filters = { sortBy: 'relevance' };
  }
  
  // ============ 群組操作 ============
  
  selectGroup(group: GroupBasicInfo): void {
    this.selectedGroup.set(group);
    this.currentView.set('detail');
  }
  
  toggleFavorite(group: GroupBasicInfo, event: Event): void {
    event.stopPropagation();
    if (this.searchService.isFavorite(group.id)) {
      this.searchService.removeFromFavorites(group.id);
    } else {
      this.searchService.addToFavorites(group);
    }
  }
  
  removeFavorite(groupId: string, event: Event): void {
    event.stopPropagation();
    this.searchService.removeFromFavorites(groupId);
  }
  
  joinGroup(group: GroupBasicInfo, event: Event): void {
    event.stopPropagation();
    this.searchService.joinGroup(group);
  }
  
  goToMembers(): void {
    this.currentView.set('members');
  }
  
  joinAndMonitorGroup(): void {
    const group = this.selectedGroup();
    if (!group) return;
    this.searchService.joinAndMonitorGroup(group);
  }
  
  // ============ 歷史操作 ============
  
  removeFromHistory(id: string, event: Event): void {
    event.stopPropagation();
    this.searchService.removeFromHistory(id);
  }
  
  clearHistory(): void {
    if (confirm('確定清空所有搜索歷史？')) {
      this.searchService.clearHistory();
    }
  }
  
  // ============ 工具方法 ============
  
  formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }
  
  formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分鐘前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小時前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    
    return new Date(date).toLocaleDateString();
  }
}
