/**
 * 資源中心組件 - Resource Center Component
 * 整合 成員資料庫 + 資源發現 + 潛在客戶
 * 
 * 功能：
 * 1. 統一聯繫人視圖
 * 2. 篩選和搜索
 * 3. 批量操作
 * 4. 標籤管理
 * 5. 發送消息
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UnifiedContactsService, UnifiedContact, ContactType, ContactStatus, SourceType, DEFAULT_TAGS, STATUS_OPTIONS } from '../services/unified-contacts.service';
import { ToastService } from '../toast.service';

// Tab 類型
type ResourceTab = 'all' | 'users' | 'groups' | 'channels';

@Component({
  selector: 'app-resource-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="resource-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">📦</span>
              資源中心
            </h1>
            
            <!-- 同步狀態 -->
            @if (contactsService.isSyncing()) {
              <span class="flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm cursor-pointer hover:bg-blue-500/30"
                    (click)="forceEndSync()"
                    title="點擊強制結束同步">
                <span class="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></span>
                同步中... (點擊取消)
              </span>
            }
          </div>
          
          <!-- 操作按鈕 -->
          <div class="flex items-center gap-3">
            <button (click)="syncData()"
                    [disabled]="contactsService.isSyncing()"
                    class="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              同步數據
            </button>
            <button (click)="showImportDialog.set(true)"
                    class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
              導入
            </button>
            <button (click)="exportData()"
                    class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
              導出
            </button>
          </div>
        </div>
      </div>
      
      <!-- 統計卡片 -->
      <div class="p-4 border-b border-slate-700/30">
        <div class="grid grid-cols-5 gap-4">
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-slate-400 text-sm mb-1">📊 總數</div>
            <div class="text-2xl font-bold text-white">{{ contactsService.stats().total }}</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-slate-400 text-sm mb-1">👤 成員</div>
            <div class="text-2xl font-bold text-blue-400">{{ contactsService.stats().users }}</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-slate-400 text-sm mb-1">👥 群組</div>
            <div class="text-2xl font-bold text-green-400">{{ contactsService.stats().groups }}</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-slate-400 text-sm mb-1">📢 頻道</div>
            <div class="text-2xl font-bold text-purple-400">{{ contactsService.stats().channels }}</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div class="text-slate-400 text-sm mb-1">🆕 本週新增</div>
            <div class="text-2xl font-bold text-emerald-400">+{{ contactsService.stats().recent_added }}</div>
          </div>
        </div>
      </div>
      
      <!-- 篩選欄 -->
      <div class="p-4 border-b border-slate-700/30">
        <div class="flex items-center gap-4 flex-wrap">
          <!-- Tab 切換 -->
          <div class="flex bg-slate-800/50 rounded-lg p-1">
            @for (tab of tabs; track tab.id) {
              <button (click)="switchTab(tab.id)"
                      class="px-4 py-2 rounded-md text-sm transition-all"
                      [class.bg-purple-500]="activeTab() === tab.id"
                      [class.text-white]="activeTab() === tab.id"
                      [class.text-slate-400]="activeTab() !== tab.id"
                      [class.hover:text-white]="activeTab() !== tab.id">
                {{ tab.icon }} {{ tab.label }}
              </button>
            }
          </div>
          
          <!-- 狀態篩選 -->
          <select [(ngModel)]="selectedStatus"
                  (ngModelChange)="filterByStatus($event)"
                  class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
            <option value="">所有狀態</option>
            @for (status of statusOptions; track status.value) {
              <option [value]="status.value">{{ status.label }}</option>
            }
          </select>
          
          <!-- 標籤篩選 -->
          <select [(ngModel)]="selectedTag"
                  (ngModelChange)="filterByTag($event)"
                  class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm">
            <option value="">所有標籤</option>
            @for (tag of defaultTags; track tag) {
              <option [value]="tag">{{ tag }}</option>
            }
          </select>
          
          <!-- 搜索框 -->
          <div class="flex-1 max-w-md">
            <div class="relative">
              <input type="text"
                     [(ngModel)]="searchKeyword"
                     (keyup.enter)="search()"
                     placeholder="搜索名稱、用戶名或 ID..."
                     class="w-full px-4 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <button (click)="search()"
                  class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
            搜索
          </button>
          
          <button (click)="resetFilters()"
                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
            重置
          </button>
        </div>
      </div>
      
      <!-- 批量操作欄 -->
      @if (contactsService.selectedIds().size > 0) {
        <div class="p-3 bg-purple-500/10 border-b border-purple-500/30 flex items-center gap-4">
          <span class="text-purple-400 text-sm">
            已選擇 {{ contactsService.selectedIds().size }} 項
          </span>
          <button (click)="showBatchTagDialog.set(true)"
                  class="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30">
            批量標記
          </button>
          <button (click)="showBatchStatusDialog.set(true)"
                  class="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30">
            更新狀態
          </button>
          <button (click)="batchSendMessage()"
                  class="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30">
            批量發送
          </button>
          <button (click)="sendToAISales()"
                  class="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30">
            加入 AI 銷售
          </button>
          <button (click)="confirmBatchDelete()"
                  class="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">
            刪除
          </button>
          <button (click)="contactsService.clearSelection()"
                  class="ml-auto px-3 py-1.5 text-slate-400 text-sm hover:text-white">
            取消選擇
          </button>
        </div>
      }
      
      <!-- 列表區域 -->
      <div class="flex-1 overflow-y-auto p-4">
        @if (contactsService.isLoading()) {
          <div class="flex items-center justify-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        } @else if (contactsService.contacts().length === 0) {
          <div class="flex flex-col items-center justify-center h-64 text-slate-400">
            <div class="text-5xl mb-4">📦</div>
            <p class="text-lg mb-2">暫無資源數據</p>
            <p class="text-sm mb-4">點擊「同步數據」從各來源整合數據</p>
            <button (click)="syncData()"
                    class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
              同步數據
            </button>
          </div>
        } @else {
          <!-- 表格 -->
          <div class="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            <table class="w-full">
              <thead class="bg-slate-800/50">
                <tr class="text-left text-slate-400 text-sm">
                  <th class="p-3 w-12">
                    <input type="checkbox"
                           [checked]="isAllSelected()"
                           (change)="contactsService.toggleSelectAll()"
                           class="rounded bg-slate-700 border-slate-600">
                  </th>
                  <th class="p-3">名稱</th>
                  <th class="p-3">類型</th>
                  <th class="p-3">來源</th>
                  <th class="p-3">標籤</th>
                  <th class="p-3">狀態</th>
                  <th class="p-3">評分</th>
                  <th class="p-3">操作</th>
                </tr>
              </thead>
              <tbody>
                @for (contact of contactsService.contacts(); track contact.telegram_id) {
                  <tr class="border-t border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                    <td class="p-3">
                      <input type="checkbox"
                             [checked]="contactsService.selectedIds().has(contact.telegram_id)"
                             (change)="contactsService.toggleSelect(contact.telegram_id)"
                             class="rounded bg-slate-700 border-slate-600">
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {{ getInitial(contact) }}
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ contact.display_name }}</div>
                          @if (contact.username) {
                            <div class="text-sm text-slate-400">&#64;{{ contact.username }}</div>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="p-3">
                      <span class="px-2 py-1 rounded-full text-xs"
                            [class.bg-blue-500/20]="contact.contact_type === 'user'"
                            [class.text-blue-400]="contact.contact_type === 'user'"
                            [class.bg-green-500/20]="contact.contact_type === 'group'"
                            [class.text-green-400]="contact.contact_type === 'group'"
                            [class.bg-purple-500/20]="contact.contact_type === 'channel'"
                            [class.text-purple-400]="contact.contact_type === 'channel'">
                        {{ getTypeLabel(contact.contact_type) }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="text-sm text-slate-400">
                        {{ getSourceLabel(contact.source_type) }}
                      </div>
                      @if (contact.source_name) {
                        <div class="text-xs text-slate-500 truncate max-w-32">
                          {{ contact.source_name }}
                        </div>
                      }
                    </td>
                    <td class="p-3">
                      <div class="flex flex-wrap gap-1">
                        @for (tag of contact.tags.slice(0, 2); track tag) {
                          <span class="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                            {{ tag }}
                          </span>
                        }
                        @if (contact.tags.length > 2) {
                          <span class="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-xs">
                            +{{ contact.tags.length - 2 }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="p-3">
                      <span class="px-2 py-1 rounded-full text-xs"
                            [class]="contactsService.getStatusColor(contact.status)"
                            [class.text-white]="true">
                        {{ contactsService.getStatusLabel(contact.status) }}
                      </span>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <div class="w-16 bg-slate-700 rounded-full h-2">
                          <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                               [style.width.%]="contact.ai_score * 100"></div>
                        </div>
                        <span class="text-sm text-slate-400">{{ (contact.ai_score * 100).toFixed(0) }}</span>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        @if (contact.contact_type === 'user') {
                          <button (click)="sendMessage(contact)"
                                  class="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                                  title="發送消息">
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </button>
                        }
                        <button (click)="viewDetail(contact)"
                                class="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                                title="查看詳情">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button (click)="editContact(contact)"
                                class="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors"
                                title="編輯">
                          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          
          <!-- 分頁 -->
          <div class="flex items-center justify-between mt-4 text-slate-400 text-sm">
            <div>
              顯示 {{ contactsService.contacts().length }} / {{ contactsService.total() }} 條
            </div>
            <div class="flex items-center gap-2">
              <button (click)="prevPage()"
                      [disabled]="currentPage() <= 1"
                      class="px-3 py-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                上一頁
              </button>
              <span class="px-4">第 {{ currentPage() }} 頁</span>
              <button (click)="nextPage()"
                      [disabled]="!hasNextPage()"
                      class="px-3 py-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                下一頁
              </button>
            </div>
          </div>
        }
      </div>
      
      <!-- 批量標籤對話框 -->
      @if (showBatchTagDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-4">批量添加標籤</h3>
            <div class="space-y-3 max-h-64 overflow-y-auto">
              @for (tag of defaultTags; track tag) {
                <label class="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer">
                  <input type="checkbox"
                         [checked]="selectedBatchTags().has(tag)"
                         (change)="toggleBatchTag(tag)"
                         class="rounded bg-slate-700 border-slate-600">
                  <span class="text-white">{{ tag }}</span>
                </label>
              }
            </div>
            <div class="flex gap-3 mt-6">
              <button (click)="showBatchTagDialog.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                取消
              </button>
              <button (click)="applyBatchTags()"
                      class="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400">
                應用
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 批量狀態對話框 -->
      @if (showBatchStatusDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-4">更新狀態</h3>
            <div class="space-y-2">
              @for (status of statusOptions; track status.value) {
                <button (click)="applyBatchStatus(status.value)"
                        class="w-full p-3 text-left rounded-lg hover:bg-slate-700/50 flex items-center gap-3">
                  <span class="w-3 h-3 rounded-full" [class]="status.color"></span>
                  <span class="text-white">{{ status.label }}</span>
                </button>
              }
            </div>
            <button (click)="showBatchStatusDialog.set(false)"
                    class="w-full mt-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
              取消
            </button>
          </div>
        </div>
      }
      
      <!-- 刪除確認對話框 -->
      @if (showDeleteConfirm()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-red-400 mb-4">⚠️ 確認刪除</h3>
            <p class="text-slate-300 mb-6">
              確定要刪除選中的 {{ contactsService.selectedIds().size }} 個聯繫人嗎？此操作無法撤銷。
            </p>
            <div class="flex gap-3">
              <button (click)="showDeleteConfirm.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                取消
              </button>
              <button (click)="confirmDelete()"
                      class="flex-1 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-400">
                確認刪除
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .resource-center {
      min-height: 100vh;
    }
  `]
})
export class ResourceCenterComponent implements OnInit, OnDestroy {
  contactsService = inject(UnifiedContactsService);
  private toast = inject(ToastService);
  
  // 事件輸出
  sendMessageEvent = output<UnifiedContact>();
  viewDetailEvent = output<UnifiedContact>();
  batchSendEvent = output<UnifiedContact[]>();
  sendToAISalesEvent = output<UnifiedContact[]>();
  
  // Tab 配置
  tabs = [
    { id: 'all' as const, icon: '📊', label: '全部' },
    { id: 'users' as const, icon: '👤', label: '成員' },
    { id: 'groups' as const, icon: '👥', label: '群組' },
    { id: 'channels' as const, icon: '📢', label: '頻道' }
  ];
  
  // 狀態選項
  statusOptions = STATUS_OPTIONS;
  defaultTags = DEFAULT_TAGS;
  
  // 當前 Tab
  activeTab = signal<ResourceTab>('all');
  
  // 篩選狀態
  selectedStatus = '';
  selectedTag = '';
  searchKeyword = '';
  
  // 分頁
  pageSize = 50;
  currentPage = signal(1);
  
  // 對話框狀態
  showImportDialog = signal(false);
  showBatchTagDialog = signal(false);
  showBatchStatusDialog = signal(false);
  showDeleteConfirm = signal(false);
  
  // 批量標籤選擇
  selectedBatchTags = signal<Set<string>>(new Set());
  
  ngOnInit() {
    // 初始載入 - 只載入數據，不自動同步
    // 用戶需要手動點擊「同步數據」按鈕
    this.contactsService.loadContacts();
    this.contactsService.loadStats();
  }
  
  ngOnDestroy() {
    // 離開頁面時確保所有狀態重置
    this.contactsService.forceEndSync();
  }
  
  // 強制結束同步和載入狀態
  forceEndSync() {
    this.contactsService.forceEndSync();
    this.toast.info('已取消', 1500);
  }
  
  // Tab 切換
  switchTab(tab: ResourceTab) {
    this.activeTab.set(tab);
    
    let contactType: ContactType | undefined;
    switch (tab) {
      case 'users':
        contactType = 'user';
        break;
      case 'groups':
        contactType = 'group';
        break;
      case 'channels':
        contactType = 'channel';
        break;
      default:
        contactType = undefined;
    }
    
    this.contactsService.setFilter({ contactType, offset: 0 });
    this.currentPage.set(1);
  }
  
  // 同步數據
  syncData() {
    this.contactsService.syncFromSources();
    this.toast.info('正在同步數據...', 2000);
  }
  
  // 搜索
  search() {
    this.contactsService.search(this.searchKeyword);
    this.currentPage.set(1);
  }
  
  // 狀態篩選
  filterByStatus(status: string) {
    this.contactsService.setFilter({ 
      status: status as ContactStatus || undefined,
      offset: 0 
    });
    this.currentPage.set(1);
  }
  
  // 標籤篩選
  filterByTag(tag: string) {
    this.contactsService.setFilter({ 
      tags: tag ? [tag] : undefined,
      offset: 0 
    });
    this.currentPage.set(1);
  }
  
  // 重置篩選
  resetFilters() {
    this.selectedStatus = '';
    this.selectedTag = '';
    this.searchKeyword = '';
    this.activeTab.set('all');
    this.contactsService.resetFilter();
    this.currentPage.set(1);
  }
  
  // 分頁
  hasNextPage(): boolean {
    return this.currentPage() * this.pageSize < this.contactsService.total();
  }
  
  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.contactsService.setPage(this.currentPage(), this.pageSize);
    }
  }
  
  nextPage() {
    if (this.hasNextPage()) {
      this.currentPage.update(p => p + 1);
      this.contactsService.setPage(this.currentPage(), this.pageSize);
    }
  }
  
  // 全選檢查
  isAllSelected(): boolean {
    const contacts = this.contactsService.contacts();
    const selected = this.contactsService.selectedIds();
    return contacts.length > 0 && contacts.every(c => selected.has(c.telegram_id));
  }
  
  // 發送消息
  sendMessage(contact: UnifiedContact) {
    this.sendMessageEvent.emit(contact);
  }
  
  // 查看詳情
  viewDetail(contact: UnifiedContact) {
    this.viewDetailEvent.emit(contact);
  }
  
  // 編輯聯繫人
  editContact(contact: UnifiedContact) {
    // TODO: 打開編輯對話框
    this.toast.info('編輯功能開發中...', 2000);
  }
  
  // 批量發送
  batchSendMessage() {
    const selected = this.contactsService.selectedContacts();
    const users = selected.filter(c => c.contact_type === 'user');
    if (users.length === 0) {
      this.toast.warning('請選擇至少一個用戶', 2000);
      return;
    }
    // 發射事件給父組件處理批量發送
    this.batchSendEvent.emit(users);
    this.toast.info(`準備向 ${users.length} 個用戶發送消息...`, 2000);
  }
  
  // 加入 AI 銷售
  sendToAISales() {
    const selected = this.contactsService.selectedContacts();
    if (selected.length === 0) {
      this.toast.warning('請選擇至少一個聯繫人', 2000);
      return;
    }
    // 發射事件給父組件處理
    this.sendToAISalesEvent.emit(selected);
    this.toast.success(`已將 ${selected.length} 個聯繫人加入 AI 銷售隊列`, 2000);
  }
  
  // 批量標籤
  toggleBatchTag(tag: string) {
    const current = new Set(this.selectedBatchTags());
    if (current.has(tag)) {
      current.delete(tag);
    } else {
      current.add(tag);
    }
    this.selectedBatchTags.set(current);
  }
  
  applyBatchTags() {
    const tags = Array.from(this.selectedBatchTags());
    if (tags.length === 0) {
      this.toast.warning('請選擇至少一個標籤', 2000);
      return;
    }
    this.contactsService.addTagsToSelected(tags);
    this.showBatchTagDialog.set(false);
    this.selectedBatchTags.set(new Set());
    this.toast.success('標籤已添加', 2000);
  }
  
  // 批量狀態
  applyBatchStatus(status: ContactStatus) {
    this.contactsService.updateSelectedStatus(status);
    this.showBatchStatusDialog.set(false);
    this.toast.success('狀態已更新', 2000);
  }
  
  // 刪除確認
  confirmBatchDelete() {
    this.showDeleteConfirm.set(true);
  }
  
  confirmDelete() {
    this.contactsService.deleteSelected();
    this.showDeleteConfirm.set(false);
    this.toast.success('已刪除', 2000);
  }
  
  // 導出
  exportData() {
    // TODO: 實現導出
    this.toast.info('導出功能開發中...', 2000);
  }
  
  // 輔助方法
  getInitial(contact: UnifiedContact): string {
    if (contact.display_name) {
      return contact.display_name.charAt(0).toUpperCase();
    }
    return '?';
  }
  
  getTypeLabel(type: ContactType): string {
    switch (type) {
      case 'user': return '成員';
      case 'group': return '群組';
      case 'channel': return '頻道';
      default: return type;
    }
  }
  
  getSourceLabel(source: SourceType): string {
    switch (source) {
      case 'member': return '群組提取';
      case 'resource': return '資源發現';
      case 'manual': return '手動添加';
      case 'import': return '批量導入';
      default: return source;
    }
  }
}
