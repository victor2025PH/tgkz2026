/**
 * 資料庫組件 - 自動化中心資源管理
 * Resource Library Component
 * 
 * 功能:
 * 1. 資源列表展示（表格+虛擬滾動）
 * 2. 類型篩選（個人/群組/頻道）
 * 3. 標籤管理
 * 4. 批量操作
 * 5. 搜索過濾
 */

import { Component, signal, computed, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceLibraryService, Resource, ResourceType, ResourceStatus, ResourceFilter } from './resource-library.service';

@Component({
  selector: 'app-resource-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="resource-library h-full flex flex-col">
      <!-- 頂部工具欄 -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📦</span> 資料庫
          </h3>
          <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
            {{ resourceService.stats().total }} 條資源
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <button (click)="showExtractionDialog.set(true)"
                  class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 
                         text-white text-sm rounded-lg transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            從群組提取
          </button>
          <button (click)="importResources()"
                  class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all">
            導入
          </button>
          <button (click)="exportResources()"
                  class="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all">
            導出
          </button>
        </div>
      </div>
      
      <!-- 搜索和篩選 -->
      <div class="p-4 border-b border-slate-700/50 space-y-3">
        <!-- 搜索框 -->
        <div class="flex items-center gap-3">
          <div class="flex-1 relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" 
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" 
                   [(ngModel)]="searchText"
                   (ngModelChange)="onSearchChange($event)"
                   placeholder="搜索名稱、用戶名或 ID..."
                   class="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
          </div>
          
          <!-- 類型篩選 -->
          <div class="flex bg-slate-800 rounded-lg p-0.5">
            <button (click)="setTypeFilter(undefined)"
                    class="px-3 py-1.5 text-sm rounded-md transition-all"
                    [class.bg-cyan-500]="!currentTypeFilter()"
                    [class.text-white]="!currentTypeFilter()"
                    [class.text-slate-400]="currentTypeFilter()">
              全部
            </button>
            <button (click)="setTypeFilter('user')"
                    class="px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1"
                    [class.bg-cyan-500]="currentTypeFilter() === 'user'"
                    [class.text-white]="currentTypeFilter() === 'user'"
                    [class.text-slate-400]="currentTypeFilter() !== 'user'">
              👤 個人
            </button>
            <button (click)="setTypeFilter('group')"
                    class="px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1"
                    [class.bg-cyan-500]="currentTypeFilter() === 'group'"
                    [class.text-white]="currentTypeFilter() === 'group'"
                    [class.text-slate-400]="currentTypeFilter() !== 'group'">
              👥 群組
            </button>
            <button (click)="setTypeFilter('channel')"
                    class="px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1"
                    [class.bg-cyan-500]="currentTypeFilter() === 'channel'"
                    [class.text-white]="currentTypeFilter() === 'channel'"
                    [class.text-slate-400]="currentTypeFilter() !== 'channel'">
              📢 頻道
            </button>
          </div>
        </div>
        
        <!-- 統計卡片 -->
        <div class="grid grid-cols-5 gap-3">
          <div class="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <div class="text-xs text-slate-400">全部資源</div>
            <div class="text-xl font-bold text-white">{{ resourceService.stats().total }}</div>
          </div>
          <div class="bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
            <div class="text-xs text-blue-400">個人用戶</div>
            <div class="text-xl font-bold text-blue-400">{{ resourceService.stats().users }}</div>
          </div>
          <div class="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
            <div class="text-xs text-purple-400">群組</div>
            <div class="text-xl font-bold text-purple-400">{{ resourceService.stats().groups }}</div>
          </div>
          <div class="bg-orange-500/10 rounded-lg p-3 border border-orange-500/30">
            <div class="text-xs text-orange-400">頻道</div>
            <div class="text-xl font-bold text-orange-400">{{ resourceService.stats().channels }}</div>
          </div>
          <div class="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
            <div class="text-xs text-green-400">本週新增</div>
            <div class="text-xl font-bold text-green-400">{{ resourceService.stats().recentAdded }}</div>
          </div>
        </div>
        
        <!-- 標籤篩選 -->
        @if (resourceService.tags().length > 0) {
          <div class="flex flex-wrap gap-2">
            <span class="text-xs text-slate-400 py-1">標籤篩選:</span>
            @for (tag of resourceService.tags(); track tag) {
              <button (click)="toggleTagFilter(tag)"
                      class="px-2 py-1 text-xs rounded-full transition-all"
                      [class.bg-cyan-500]="isTagSelected(tag)"
                      [class.text-white]="isTagSelected(tag)"
                      [class.bg-slate-700]="!isTagSelected(tag)"
                      [class.text-slate-300]="!isTagSelected(tag)">
                {{ tag }}
              </button>
            }
            @if (selectedTags().length > 0) {
              <button (click)="clearTagFilter()"
                      class="px-2 py-1 text-xs text-red-400 hover:text-red-300">
                清除篩選
              </button>
            }
          </div>
        }
      </div>
      
      <!-- 批量操作欄 -->
      @if (resourceService.selectedIds().size > 0) {
        <div class="px-4 py-3 bg-cyan-500/10 border-b border-cyan-500/30 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm text-cyan-400">
              已選擇 {{ resourceService.selectedIds().size }} 項
            </span>
            <button (click)="resourceService.selectAll()"
                    class="text-xs text-cyan-400 hover:text-cyan-300">
              全選
            </button>
            <button (click)="resourceService.deselectAll()"
                    class="text-xs text-slate-400 hover:text-slate-300">
              取消選擇
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button (click)="showBatchTagDialog.set(true)"
                    class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
              🏷️ 批量標記
            </button>
            <button (click)="batchUpdateStatus('contacted')"
                    class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg">
              ✅ 標記已聯繫
            </button>
            <button (click)="addSelectedToQueue()"
                    class="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg">
              📤 加入發送隊列
            </button>
            <button (click)="deleteSelected()"
                    class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg">
              🗑️ 刪除
            </button>
          </div>
        </div>
      }
      
      <!-- 資源列表 -->
      <div class="flex-1 overflow-y-auto">
        @if (resourceService.isLoading()) {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <svg class="w-12 h-12 text-cyan-500 animate-spin mx-auto" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p class="text-slate-400 mt-3">載入中...</p>
            </div>
          </div>
        } @else if (resourceService.filteredResources().length === 0) {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="text-5xl mb-3">📦</div>
              <p class="text-slate-400">暫無資源</p>
              <p class="text-sm text-slate-500 mt-1">點擊「從群組提取」開始添加資源</p>
            </div>
          </div>
        } @else {
          <table class="w-full">
            <thead class="sticky top-0 bg-slate-800 z-10">
              <tr class="text-left text-sm text-slate-400">
                <th class="py-3 px-4 w-10">
                  <input type="checkbox" 
                         [checked]="isAllSelected()"
                         (change)="toggleSelectAll()"
                         class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                </th>
                <th class="py-3 px-4">資源信息</th>
                <th class="py-3 px-4">類型</th>
                <th class="py-3 px-4">來源</th>
                <th class="py-3 px-4">標籤</th>
                <th class="py-3 px-4">狀態</th>
                <th class="py-3 px-4">添加時間</th>
                <th class="py-3 px-4 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              @for (resource of resourceService.filteredResources(); track resource.id) {
                <tr class="border-t border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                  <td class="py-3 px-4">
                    <input type="checkbox" 
                           [checked]="resourceService.isSelected(resource.id)"
                           (change)="resourceService.toggleSelect(resource.id)"
                           class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <!-- 頭像/在線狀態 -->
                      <div class="relative">
                        <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg">
                          {{ getAvatarEmoji(resource.type) }}
                        </div>
                        @if (resource.isOnline) {
                          <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></div>
                        }
                      </div>
                      <!-- 名稱信息 -->
                      <div>
                        <div class="font-medium text-white">{{ resource.displayName }}</div>
                        @if (resource.username) {
                          <div class="text-xs text-slate-400">&#64;{{ resource.username }}</div>
                        } @else {
                          <div class="text-xs text-slate-500">ID: {{ resource.telegramId }}</div>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full"
                          [class.bg-blue-500/20]="resource.type === 'user'"
                          [class.text-blue-400]="resource.type === 'user'"
                          [class.bg-purple-500/20]="resource.type === 'group'"
                          [class.text-purple-400]="resource.type === 'group'"
                          [class.bg-orange-500/20]="resource.type === 'channel'"
                          [class.text-orange-400]="resource.type === 'channel'">
                      {{ getTypeName(resource.type) }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="text-sm text-slate-300">{{ resource.sourceName || '-' }}</div>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex flex-wrap gap-1">
                      @for (tag of resource.tags.slice(0, 2); track tag) {
                        <span class="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                          {{ tag }}
                        </span>
                      }
                      @if (resource.tags.length > 2) {
                        <span class="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                          +{{ resource.tags.length - 2 }}
                        </span>
                      }
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-1 text-xs rounded-full"
                          [class]="getStatusClass(resource.status)">
                      {{ getStatusName(resource.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-sm text-slate-400">
                    {{ formatDate(resource.createdAt) }}
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-1">
                      <button (click)="sendMessage(resource)"
                              class="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700 rounded transition-all"
                              title="發送消息">
                        💬
                      </button>
                      <button (click)="editResource(resource)"
                              class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-all"
                              title="編輯">
                        ✏️
                      </button>
                      <button (click)="deleteResource(resource)"
                              class="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-all"
                              title="刪除">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      
      <!-- 提取任務進度 -->
      @if (resourceService.extractionTasks().length > 0) {
        <div class="p-4 border-t border-slate-700/50 bg-slate-800/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-white">提取任務</span>
            <button (click)="resourceService.clearCompletedTasks()"
                    class="text-xs text-slate-400 hover:text-white">
              清除已完成
            </button>
          </div>
          <div class="space-y-2 max-h-32 overflow-y-auto">
            @for (task of resourceService.extractionTasks(); track task.id) {
              <div class="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-white">{{ task.groupName }}</span>
                    <span class="text-xs text-slate-400">
                      {{ task.extractedCount }}/{{ task.totalMembers }}
                    </span>
                  </div>
                  <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div class="h-full transition-all duration-300"
                         [class.bg-cyan-500]="task.status === 'running'"
                         [class.bg-green-500]="task.status === 'completed'"
                         [class.bg-red-500]="task.status === 'failed'"
                         [class.bg-yellow-500]="task.status === 'pending'"
                         [style.width.%]="task.progress">
                    </div>
                  </div>
                </div>
                @if (task.status === 'running') {
                  <button (click)="resourceService.cancelExtraction(task.id)"
                          class="text-xs text-red-400 hover:text-red-300">
                    取消
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
    
    <!-- 提取對話框 -->
    @if (showExtractionDialog()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
           (click)="showExtractionDialog.set(false)">
        <div class="bg-slate-800 rounded-xl w-[500px] max-h-[80vh] overflow-hidden shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">從群組提取成員</h3>
            <button (click)="showExtractionDialog.set(false)"
                    class="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <div class="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label class="block text-sm text-slate-400 mb-2">選擇群組：</label>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                @for (group of availableGroups(); track group.id) {
                  <label class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700">
                    <input type="checkbox" 
                           [(ngModel)]="group.selected"
                           class="rounded text-cyan-500 bg-slate-600 border-slate-500">
                    <div class="flex-1">
                      <div class="text-sm text-white">{{ group.name }}</div>
                      <div class="text-xs text-slate-400">成員: {{ group.memberCount }}</div>
                    </div>
                  </label>
                }
              </div>
            </div>
            
            <div>
              <label class="block text-sm text-slate-400 mb-2">提取選項：</label>
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="extractionOptions.filterBots"
                         class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                  <span class="text-sm text-slate-300">過濾機器人和已刪除帳號</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="extractionOptions.skipExisting"
                         class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                  <span class="text-sm text-slate-300">跳過已存在的資源</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="extractionOptions.onlyActiveRecent"
                         class="rounded text-cyan-500 bg-slate-700 border-slate-600">
                  <span class="text-sm text-slate-300">僅提取最近活躍成員（7天內）</span>
                </label>
              </div>
            </div>
            
            <div class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p class="text-sm text-yellow-400">
                ⚠️ 提取過程可能需要幾分鐘，建議少量多次，避免觸發限制
              </p>
            </div>
          </div>
          
          <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
            <button (click)="showExtractionDialog.set(false)"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
              取消
            </button>
            <button (click)="startExtraction()"
                    [disabled]="getSelectedGroupCount() === 0"
                    class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 
                           text-white rounded-lg disabled:opacity-50">
              開始提取 ({{ getSelectedGroupCount() }} 個群組)
            </button>
          </div>
        </div>
      </div>
    }
    
    <!-- 批量標籤對話框 -->
    @if (showBatchTagDialog()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
           (click)="showBatchTagDialog.set(false)">
        <div class="bg-slate-800 rounded-xl w-[400px] overflow-hidden shadow-2xl"
             (click)="$event.stopPropagation()">
          <div class="p-4 border-b border-slate-700">
            <h3 class="text-lg font-semibold text-white">批量添加標籤</h3>
          </div>
          
          <div class="p-4">
            <div class="flex flex-wrap gap-2 mb-4">
              @for (tag of resourceService.tags(); track tag) {
                <button (click)="toggleBatchTag(tag)"
                        class="px-3 py-1.5 text-sm rounded-lg transition-all"
                        [class.bg-cyan-500]="batchTags().includes(tag)"
                        [class.text-white]="batchTags().includes(tag)"
                        [class.bg-slate-700]="!batchTags().includes(tag)"
                        [class.text-slate-300]="!batchTags().includes(tag)">
                  {{ tag }}
                </button>
              }
            </div>
            
            <div class="flex items-center gap-2">
              <input type="text" 
                     [(ngModel)]="newTagInput"
                     placeholder="新標籤..."
                     class="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400">
              <button (click)="addNewTag()"
                      [disabled]="!newTagInput"
                      class="px-3 py-2 bg-cyan-500 text-white rounded-lg disabled:opacity-50">
                添加
              </button>
            </div>
          </div>
          
          <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
            <button (click)="showBatchTagDialog.set(false)"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
              取消
            </button>
            <button (click)="applyBatchTags()"
                    [disabled]="batchTags().length === 0"
                    class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg disabled:opacity-50">
              應用標籤
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class ResourceLibraryComponent implements OnInit {
  resourceService = inject(ResourceLibraryService);
  
  // 輸出事件
  sendMessageEvent = output<Resource>();
  
  // 狀態
  searchText = '';
  showExtractionDialog = signal(false);
  showBatchTagDialog = signal(false);
  
  // 篩選
  currentTypeFilter = signal<ResourceType | undefined>(undefined);
  selectedTags = signal<string[]>([]);
  
  // 批量標籤
  batchTags = signal<string[]>([]);
  newTagInput = '';
  
  // 提取選項
  extractionOptions = {
    filterBots: true,
    filterDeleted: true,
    skipExisting: true,
    onlyActiveRecent: false,
    activeDays: 7
  };
  
  // 模擬可用群組（實際應從監控群組獲取）
  availableGroups = signal<Array<{ id: string; name: string; memberCount: number; selected: boolean }>>([
    { id: 'g1', name: '測試miniapp', memberCount: 1234, selected: false },
    { id: 'g2', name: '白資高價收USDT', memberCount: 567, selected: false },
    { id: 'g3', name: '幣⚡虛擬幣交流', memberCount: 2345, selected: false }
  ]);
  
  ngOnInit() {
    this.resourceService.loadResources();
  }
  
  // ========== 篩選操作 ==========
  
  onSearchChange(search: string) {
    this.resourceService.updateFilter({ search });
  }
  
  setTypeFilter(type: ResourceType | undefined) {
    this.currentTypeFilter.set(type);
    this.resourceService.updateFilter({ type });
  }
  
  toggleTagFilter(tag: string) {
    this.selectedTags.update(tags => {
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag);
      }
      return [...tags, tag];
    });
    this.resourceService.updateFilter({ tags: this.selectedTags() });
  }
  
  isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }
  
  clearTagFilter() {
    this.selectedTags.set([]);
    this.resourceService.updateFilter({ tags: undefined });
  }
  
  // ========== 選擇操作 ==========
  
  isAllSelected(): boolean {
    const filtered = this.resourceService.filteredResources();
    const selected = this.resourceService.selectedIds();
    return filtered.length > 0 && filtered.every(r => selected.has(r.id));
  }
  
  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.resourceService.deselectAll();
    } else {
      this.resourceService.selectAll();
    }
  }
  
  // ========== 批量操作 ==========
  
  batchUpdateStatus(status: ResourceStatus) {
    const ids = Array.from(this.resourceService.selectedIds());
    this.resourceService.updateResources(ids, { status });
  }
  
  addSelectedToQueue() {
    const ids = Array.from(this.resourceService.selectedIds());
    this.resourceService.addToSendQueue(ids);
  }
  
  deleteSelected() {
    if (confirm(`確定要刪除選中的 ${this.resourceService.selectedIds().size} 條資源嗎？`)) {
      const ids = Array.from(this.resourceService.selectedIds());
      this.resourceService.deleteResources(ids);
    }
  }
  
  // ========== 標籤操作 ==========
  
  toggleBatchTag(tag: string) {
    this.batchTags.update(tags => {
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag);
      }
      return [...tags, tag];
    });
  }
  
  addNewTag() {
    if (this.newTagInput.trim()) {
      this.resourceService.createTag(this.newTagInput.trim());
      this.batchTags.update(tags => [...tags, this.newTagInput.trim()]);
      this.newTagInput = '';
    }
  }
  
  applyBatchTags() {
    const ids = Array.from(this.resourceService.selectedIds());
    this.resourceService.addTagsToResources(ids, this.batchTags());
    this.showBatchTagDialog.set(false);
    this.batchTags.set([]);
  }
  
  // ========== 提取操作 ==========
  
  getSelectedGroupCount(): number {
    return this.availableGroups().filter(g => g.selected).length;
  }
  
  startExtraction() {
    const selectedGroups = this.availableGroups()
      .filter(g => g.selected)
      .map(g => ({ id: g.id, name: g.name, memberCount: g.memberCount }));
    
    if (selectedGroups.length > 0) {
      this.resourceService.startExtraction(selectedGroups, this.extractionOptions);
      this.showExtractionDialog.set(false);
      
      // 重置選擇
      this.availableGroups.update(groups => groups.map(g => ({ ...g, selected: false })));
    }
  }
  
  // ========== 單項操作 ==========
  
  sendMessage(resource: Resource) {
    this.sendMessageEvent.emit(resource);
  }
  
  editResource(resource: Resource) {
    // TODO: 打開編輯對話框
    console.log('Edit resource:', resource);
  }
  
  deleteResource(resource: Resource) {
    if (confirm(`確定要刪除 "${resource.displayName}" 嗎？`)) {
      this.resourceService.deleteResource(resource.id);
    }
  }
  
  // ========== 導入導出 ==========
  
  importResources() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        this.resourceService.importResources(file);
      }
    };
    input.click();
  }
  
  exportResources() {
    const selected = this.resourceService.selectedIds();
    if (selected.size > 0) {
      this.resourceService.exportResources('csv', Array.from(selected));
    } else {
      this.resourceService.exportResources('csv');
    }
  }
  
  // ========== 輔助方法 ==========
  
  getAvatarEmoji(type: ResourceType): string {
    const emojis = { user: '👤', group: '👥', channel: '📢' };
    return emojis[type];
  }
  
  getTypeName(type: ResourceType): string {
    const names = { user: '個人', group: '群組', channel: '頻道' };
    return names[type];
  }
  
  getStatusName(status: ResourceStatus): string {
    const names: Record<ResourceStatus, string> = {
      new: '新發現',
      contacted: '已聯繫',
      interested: '有興趣',
      converted: '已轉化',
      blocked: '已屏蔽',
      invalid: '無效'
    };
    return names[status];
  }
  
  getStatusClass(status: ResourceStatus): string {
    const classes: Record<ResourceStatus, string> = {
      new: 'bg-blue-500/20 text-blue-400',
      contacted: 'bg-cyan-500/20 text-cyan-400',
      interested: 'bg-yellow-500/20 text-yellow-400',
      converted: 'bg-green-500/20 text-green-400',
      blocked: 'bg-red-500/20 text-red-400',
      invalid: 'bg-slate-500/20 text-slate-400'
    };
    return classes[status];
  }
  
  formatDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }
}
