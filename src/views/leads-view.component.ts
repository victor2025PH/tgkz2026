/**
 * Leads View Component → 發送控制台
 * 🔧 P0 修復：統一命名 + 統一數據源
 * 🔧 恢復完整功能：卡片視圖、刪除、拉群等操作
 * 
 * 核心功能：
 * 1. 從 unified_contacts 讀取客戶數據（與資源中心共享數據源）
 * 2. 批量選擇客戶發送消息
 * 3. 批量拉群功能
 * 4. 刪除客戶功能
 * 5. 卡片/列表視圖切換
 * 6. 追蹤發送狀態
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { DialogService, ExportService } from '../services';
import { UnifiedContactsService, UnifiedContact } from '../services/unified-contacts.service';
import { LeadScoringPanelComponent } from '../lead-nurturing/lead-scoring-panel.component';
import { EmptyStateComponent } from '../components/empty-state.component';

@Component({
  selector: 'app-leads-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, LeadScoringPanelComponent, EmptyStateComponent],
  template: `
    <div class="page-content">
      <!-- 🔧 頁面標題 + 操作按鈕 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">📤</span>
          <h2 class="text-2xl font-bold" style="color: var(--text-primary);">發送控制台</h2>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="showToolsPanel.set(!showToolsPanel())" 
                  class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  [class.bg-amber-500]="showToolsPanel()"
                  [class.text-white]="showToolsPanel()"
                  [style.background-color]="!showToolsPanel() ? 'var(--bg-tertiary)' : ''"
                  [style.color]="!showToolsPanel() ? 'var(--text-primary)' : ''">
            <span>⭐</span>
            評分 & 去重
          </button>
          <button (click)="refresh()" 
                  class="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style="background-color: var(--bg-tertiary); color: var(--text-primary);">
            <span>🔄</span>
            刷新
          </button>
          <button (click)="batchSend()" 
                  [disabled]="selectedCount() === 0"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:opacity-50">
            <span>📨</span>
            批量發送
          </button>
        </div>
      </div>
      
      <!-- 🔧 P13-3: 評分 & 去重面板 -->
      @if (showToolsPanel()) {
        <div class="mb-6 animate-in slide-in-from-top">
          <app-lead-scoring-panel></app-lead-scoring-panel>
        </div>
      }
      
      <!-- 🔧 統計卡片 -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">👥</div>
          <div class="text-sm" style="color: var(--text-muted);">總客戶</div>
          <div class="text-xl font-bold text-cyan-400">{{ contacts().length }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">⏳</div>
          <div class="text-sm" style="color: var(--text-muted);">待發送</div>
          <div class="text-xl font-bold text-blue-400">{{ pendingCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">✅</div>
          <div class="text-sm" style="color: var(--text-muted);">已發送</div>
          <div class="text-xl font-bold text-emerald-400">{{ sentCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">💬</div>
          <div class="text-sm" style="color: var(--text-muted);">已回覆</div>
          <div class="text-xl font-bold text-green-400">{{ repliedCount() }}</div>
        </div>
        <div class="rounded-xl p-4 text-center" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <div class="text-2xl mb-1">❌</div>
          <div class="text-sm" style="color: var(--text-muted);">發送失敗</div>
          <div class="text-xl font-bold text-red-400">{{ failedCount() }}</div>
        </div>
      </div>
      
      <!-- 搜索和篩選 + 視圖切換 -->
      <div class="flex items-center gap-4 mb-6">
        <div class="flex-1 relative">
          <input type="text" 
                 [ngModel]="searchTerm()"
                 (ngModelChange)="searchTerm.set($event)"
                 placeholder="搜索客戶名稱、用戶名或來源..."
                 class="w-full py-3 px-4 pl-10 rounded-xl"
                 style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        <select [ngModel]="statusFilter()"
                (ngModelChange)="statusFilter.set($event)"
                class="py-3 px-4 rounded-xl"
                style="background-color: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color);">
          <option value="">全部狀態</option>
          <option value="new">待發送</option>
          <option value="contacted">已發送</option>
          <option value="replied">已回覆</option>
          <option value="failed">發送失敗</option>
        </select>
        <!-- 視圖切換按鈕 -->
        <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--border-color);">
          <button (click)="viewMode.set('list')" 
                  class="p-2 px-3 transition-colors"
                  [class.bg-cyan-500]="viewMode() === 'list'"
                  [class.text-white]="viewMode() === 'list'"
                  [style.background-color]="viewMode() !== 'list' ? 'var(--bg-tertiary)' : ''">
            📋
          </button>
          <button (click)="viewMode.set('card')" 
                  class="p-2 px-3 transition-colors"
                  [class.bg-cyan-500]="viewMode() === 'card'"
                  [class.text-white]="viewMode() === 'card'"
                  [style.background-color]="viewMode() !== 'card' ? 'var(--bg-tertiary)' : ''">
            🃏
          </button>
        </div>
      </div>
      
      <!-- 🆕 全選控制欄 - 始終顯示 -->
      <div class="flex items-center gap-4 mb-4 p-3 rounded-xl"
           style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
        <!-- 全選複選框（三態） -->
        <div class="flex items-center gap-3">
          <input type="checkbox" 
                 [checked]="isAllSelected()"
                 [indeterminate]="isPartialSelected()"
                 (change)="toggleSelectAll()"
                 class="w-5 h-5 rounded accent-cyan-500 cursor-pointer">
          <span class="text-sm" style="color: var(--text-muted);">
            @if (isAllSelected()) {
              已全選
            } @else if (isPartialSelected()) {
              部分選中
            } @else {
              全選
            }
          </span>
        </div>
        
        <!-- 快捷選擇按鈕 -->
        <div class="flex items-center gap-2">
          <button (click)="selectAll()" 
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  [class.bg-cyan-500]="isAllSelected()"
                  [class.text-white]="isAllSelected()"
                  [style.background-color]="!isAllSelected() ? 'var(--bg-tertiary)' : ''"
                  [style.color]="!isAllSelected() ? 'var(--text-muted)' : ''">
            ☑️ 全選 ({{ filteredContacts().length }})
          </button>
          <button (click)="invertSelection()" 
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors"
                  style="background-color: var(--bg-tertiary); color: var(--text-muted);">
            🔄 反選
          </button>
          <button (click)="clearSelection()" 
                  [disabled]="selectedCount() === 0"
                  class="px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                  style="background-color: var(--bg-tertiary); color: var(--text-muted);">
            ✖ 清除
          </button>
        </div>
        
        <!-- 分隔線 -->
        <div class="w-px h-6 bg-slate-700"></div>
        
        <!-- 選中計數 -->
        <div class="flex items-center gap-2">
          @if (selectedCount() > 0) {
            <span class="px-3 py-1 rounded-full text-sm font-medium bg-cyan-500/20 text-cyan-400">
              已選 {{ selectedCount() }} 個
            </span>
          } @else {
            <span class="text-sm" style="color: var(--text-muted);">
              共 {{ filteredContacts().length }} 個客戶
            </span>
          }
        </div>
        
        <!-- 右側快捷操作（選中時顯示） -->
        <div class="flex-1"></div>
        @if (selectedCount() > 0) {
          <div class="flex items-center gap-2">
            <button (click)="batchSend()" 
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">
              📨 群發
            </button>
            <button (click)="batchInvite()" 
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-purple-500 hover:bg-purple-600 text-white transition-colors">
              👥 拉群
            </button>
            <button (click)="batchDelete()" 
                    [disabled]="isDeleting()"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50">
              🗑️ 刪除
            </button>
          </div>
        }
      </div>
      
      <!-- 批量操作欄 (選中多個時顯示) - 🔧 P0: sticky 定位始終可見 -->
      @if (selectedCount() > 1) {
        <div class="sticky top-0 z-50 flex items-center gap-4 mb-4 p-4 rounded-xl border transition-all duration-300 shadow-lg backdrop-blur-sm bg-gradient-to-r from-amber-500/30 to-orange-500/30 border-amber-500/50"
             style="background-color: rgba(15, 23, 42, 0.95);">
          <span class="text-amber-400 font-bold text-lg">
            👆 已選擇 {{ selectedCount() }} 個客戶 - 請選擇批量操作
          </span>
          <div class="flex-1"></div>
          <button (click)="batchSend()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">
            <span>📨</span> 群發消息
          </button>
          <button (click)="batchInvite()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors">
            <span>👥</span> 批量拉群
          </button>
          <button (click)="startMultiRoleCollaboration()" class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white transition-colors">
            <span>🤖</span> AI 多角色營銷
          </button>
          <button (click)="batchDelete()" 
                  [disabled]="isDeleting()"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors disabled:opacity-50">
            <span>{{ isDeleting() ? '⏳' : '🗑️' }}</span> {{ isDeleting() ? '刪除中...' : '刪除' }}
          </button>
          <button (click)="clearSelection()" class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400">
            ✖ 取消選擇
          </button>
        </div>
      }
      
      <!-- 客戶列表 / 卡片 -->
      <div class="rounded-xl overflow-hidden" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
        @if (filteredContacts().length === 0) {
          <app-empty-state iconKind="inbox"
                           title="暫無客戶數據"
                           description="請先到「資源中心」添加客戶，或從監控群組自動收集"
                           ctaLabel="前往資源中心"
                           (cta)="goToResourceCenter()">
          </app-empty-state>
        } @else if (viewMode() === 'card') {
          <!-- 卡片視圖 -->
          <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            @for (contact of filteredContacts(); track contact.id) {
              <div class="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer relative group"
                   [class.ring-2]="isSelected(contact.id)"
                   [class.ring-cyan-500]="isSelected(contact.id)"
                   style="background-color: var(--bg-tertiary); border: 1px solid var(--border-color);"
                   (click)="toggleSelect(contact.id)">
                <!-- 選中標記 - 🔧 P0: 綁定 change 事件 -->
                <div class="absolute top-3 right-3">
                  <input type="checkbox" 
                         [checked]="isSelected(contact.id)" 
                         (change)="toggleSelect(contact.id)"
                         (click)="$event.stopPropagation()"
                         class="rounded w-5 h-5 accent-cyan-500 cursor-pointer">
                </div>
                
                <!-- 頭像和基本信息 -->
                <div class="flex items-center gap-3 mb-3">
                  <div class="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                    {{ getInitial(contact) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium truncate" style="color: var(--text-primary);">{{ contact.display_name || contact.username || contact.telegram_id }}</p>
                    @if (contact.username) {
                      <p class="text-xs truncate" style="color: var(--text-muted);">&#64;{{ contact.username }}</p>
                    }
                  </div>
                </div>
                
                <!-- 來源和狀態 -->
                <div class="flex items-center justify-between mb-3">
                  <span class="text-xs px-2 py-1 rounded bg-slate-700/50" style="color: var(--text-muted);">
                    {{ contact.source_name || contact.source_type || '未知來源' }}
                  </span>
                  <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getStatusClass(contact.status)">
                    {{ getStatusLabel(contact.status) }}
                  </span>
                </div>
                
                <!-- 快捷操作按鈕 - 🔧 P0: 選中多個時禁用單個操作 -->
                <div class="flex items-center gap-2 pt-2 border-t" style="border-color: var(--border-color);">
                  @if (selectedIds().size > 1) {
                    <!-- 選中多個時提示使用批量操作 -->
                    <div class="flex-1 text-center py-2 text-xs text-amber-400">
                      ⬆️ 請使用上方批量操作欄
                    </div>
                  } @else {
                    <button (click)="sendMessage(contact); $event.stopPropagation()" 
                            class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400">
                      💬 發送
                    </button>
                    <button (click)="inviteToGroup(contact); $event.stopPropagation()" 
                            class="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-500/20 hover:bg-purple-500/30 text-purple-400">
                      👥 拉群
                    </button>
                    <button (click)="deleteContact(contact); $event.stopPropagation()" 
                            class="p-2 rounded-lg text-xs transition-colors hover:bg-red-500/20 text-red-400" title="刪除">
                      🗑️
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- 列表視圖 -->
          <table class="w-full">
            <thead>
              <tr style="background-color: var(--bg-tertiary);">
                <th class="py-3 px-4 text-left text-sm font-medium w-10" style="color: var(--text-muted);">
                  <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()" class="rounded">
                </th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">客戶</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">來源</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">狀態</th>
                <th class="py-3 px-4 text-left text-sm font-medium" style="color: var(--text-muted);">操作</th>
              </tr>
            </thead>
            <tbody>
              @for (contact of filteredContacts(); track contact.id) {
                <tr class="border-t transition-colors hover:bg-slate-800/30" style="border-color: var(--border-color);">
                  <td class="py-3 px-4">
                    <input type="checkbox" [checked]="isSelected(contact.id)" (change)="toggleSelect(contact.id)" class="rounded">
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        {{ getInitial(contact) }}
                      </div>
                      <div>
                        <p class="font-medium" style="color: var(--text-primary);">{{ contact.display_name || contact.username || contact.telegram_id }}</p>
                        @if (contact.username) {
                          <p class="text-xs" style="color: var(--text-muted);">&#64;{{ contact.username }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4" style="color: var(--text-muted);">
                    <span class="text-xs px-2 py-1 rounded bg-slate-700/50">{{ contact.source_name || contact.source_type || '-' }}</span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="getStatusClass(contact.status)">
                      {{ getStatusLabel(contact.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <!-- 🔧 P0: 選中多個時禁用單個操作 -->
                    @if (selectedIds().size > 1) {
                      <div class="text-xs text-amber-400">
                        ⬆️ 使用批量操作
                      </div>
                    } @else {
                      <div class="flex items-center gap-2">
                        <button (click)="sendMessage(contact)" class="p-2 rounded-lg hover:bg-cyan-500/20 transition-colors text-cyan-400" title="發送消息">
                          💬
                        </button>
                        <button (click)="inviteToGroup(contact)" class="p-2 rounded-lg hover:bg-purple-500/20 transition-colors text-purple-400" title="拉群">
                          👥
                        </button>
                        <button (click)="viewContact(contact)" class="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400" title="查看詳情">
                          👁️
                        </button>
                        <button (click)="deleteContact(contact)" class="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-red-400" title="刪除">
                          🗑️
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `
})
export class LeadsViewComponent implements OnInit, OnDestroy {
  // 🔧 P0: 服務注入 - 添加 UnifiedContactsService
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  private exportService = inject(ExportService);
  public membershipService = inject(MembershipService);
  public contactsService = inject(UnifiedContactsService);
  
  // 狀態
  searchTerm = signal('');
  statusFilter = signal('');
  selectedIds = signal<Set<number>>(new Set());
  viewMode = signal<'list' | 'card'>('card');  // 🔧 P0: 默認卡片視圖
  showToolsPanel = signal(false);  // 🔧 P13-3: 評分 & 去重面板
  
  // 🔧 P1: 操作 loading 狀態
  isDeleting = signal(false);
  isSending = signal(false);
  isInviting = signal(false);
  sendProgress = signal({ sent: 0, total: 0, success: 0, failed: 0 });
  inviteProgress = signal({ invited: 0, total: 0, success: 0, failed: 0, skipped: 0 });
  
  // 🔧 P0: 從 UnifiedContactsService 獲取數據
  contacts = computed(() => this.contactsService.contacts());
  
  // 篩選後的聯繫人
  filteredContacts = computed(() => {
    let result = this.contacts();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();
    
    // 只顯示用戶類型（排除群組和頻道）
    result = result.filter(c => c.contact_type === 'user');
    
    if (search) {
      result = result.filter(c => 
        (c.display_name?.toLowerCase().includes(search)) ||
        (c.username?.toLowerCase().includes(search)) ||
        (c.telegram_id?.toString().includes(search)) ||
        (c.source_name?.toLowerCase().includes(search))
      );
    }
    
    if (status) {
      result = result.filter(c => c.status === status);
    }
    
    return result;
  });
  
  // 統計計算
  pendingCount = computed(() => this.contacts().filter(c => c.contact_type === 'user' && c.status === 'new').length);
  sentCount = computed(() => this.contacts().filter(c => c.contact_type === 'user' && c.status === 'contacted').length);
  repliedCount = computed(() => this.contacts().filter(c => c.contact_type === 'user' && c.status === 'replied').length);
  failedCount = computed(() => this.contacts().filter(c => c.contact_type === 'user' && c.status === 'failed').length);
  selectedCount = computed(() => this.selectedIds().size);
  
  private ipcCleanup: (() => void)[] = [];
  
  ngOnInit(): void {
    // 🔧 P0: 使用 UnifiedContactsService 加載數據
    this.contactsService.loadContacts();
    this.setupIpcListeners();
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }
  
  private setupIpcListeners(): void {
    // 🔧 P1: 監聽發送完成事件並更新狀態
    const cleanup1 = this.ipc.on('message-sent', (data: { contactId?: number, telegramId?: string, success: boolean }) => {
      if (data.success) {
        this.toast.success('消息發送成功');
        if (data.telegramId) {
          this.contactsService.updateContactStatus(data.telegramId, 'contacted');
        }
      } else {
        if (data.telegramId) {
          this.contactsService.updateContactStatus(data.telegramId, 'failed');
        }
      }
    });
    
    // 監聯私信回覆事件
    const cleanup2 = this.ipc.on('private-message-received', (data: { telegramId: string }) => {
      if (data.telegramId) {
        this.contactsService.updateContactStatus(data.telegramId, 'replied');
        this.toast.info('收到客戶回覆');
      }
    });
    
    // 🔧 P1: 監聽批量發送進度（使用正確的事件名）
    const cleanup3 = this.ipc.on('batch-send:progress', (data: { 
      sent: number, 
      total: number, 
      success: number, 
      failed: number,
      currentTarget?: string 
    }) => {
      this.sendProgress.set(data);
      console.log(`發送進度: ${data.sent}/${data.total}, 成功: ${data.success}, 失敗: ${data.failed}`);
    });
    
    // 🔧 P1: 監聽批量發送完成（使用正確的事件名）
    const cleanup4 = this.ipc.on('batch-send:complete', (data: { 
      success: number, 
      failed: number,
      failureSummary?: string 
    }) => {
      this.isSending.set(false);
      this.sendProgress.set({ sent: 0, total: 0, success: 0, failed: 0 });
      
      if (data.failed > 0) {
        this.toast.warning(`批量發送完成: 成功 ${data.success}，失敗 ${data.failed}${data.failureSummary ? ` (${data.failureSummary})` : ''}`);
      } else {
        this.toast.success(`批量發送完成: 成功 ${data.success} 條`);
      }
      this.contactsService.loadContacts();
    });
    
    // 🔧 P1: 監聽批量拉群進度
    const cleanup5 = this.ipc.on('batch-invite:progress', (data: { 
      invited: number, 
      total: number, 
      success: number, 
      failed: number,
      skipped: number 
    }) => {
      this.inviteProgress.set(data);
      console.log(`拉群進度: ${data.invited}/${data.total}`);
    });
    
    // 🔧 P1: 監聽批量拉群完成
    const cleanup6 = this.ipc.on('batch-invite:complete', (data: { 
      success: number, 
      failed: number,
      skipped: number 
    }) => {
      this.isInviting.set(false);
      this.inviteProgress.set({ invited: 0, total: 0, success: 0, failed: 0, skipped: 0 });
      this.toast.success(`批量拉群完成: 成功 ${data.success}，跳過 ${data.skipped}，失敗 ${data.failed}`);
      this.contactsService.loadContacts();
    });
    
    this.ipcCleanup.push(cleanup1, cleanup2, cleanup3, cleanup4, cleanup5, cleanup6);
  }
  
  // 刷新數據
  refresh(): void {
    this.contactsService.loadContacts();
    this.toast.info('正在刷新...');
  }
  
  // 前往資源中心
  goToResourceCenter(): void {
    this.nav.navigateTo('resource-center');
  }
  
  // 選擇相關方法
  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }
  
  toggleSelect(id: number): void {
    this.selectedIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }
  
  isAllSelected(): boolean {
    const filtered = this.filteredContacts();
    return filtered.length > 0 && filtered.every(c => this.selectedIds().has(c.id));
  }
  
  // 🆕 部分選中狀態（三態複選框）
  isPartialSelected(): boolean {
    const filtered = this.filteredContacts();
    const selectedCount = this.selectedIds().size;
    return selectedCount > 0 && selectedCount < filtered.length && !this.isAllSelected();
  }
  
  toggleSelectAll(): void {
    const filtered = this.filteredContacts();
    if (this.isAllSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(filtered.map(c => c.id)));
    }
  }
  
  // 🆕 全選（明確方法）
  selectAll(): void {
    const filtered = this.filteredContacts();
    this.selectedIds.set(new Set(filtered.map(c => c.id)));
    this.toast.info(`已全選 ${filtered.length} 個客戶`);
  }
  
  // 🆕 反選
  invertSelection(): void {
    const filtered = this.filteredContacts();
    const currentSelected = this.selectedIds();
    const newSelected = new Set<number>();
    
    filtered.forEach(c => {
      if (!currentSelected.has(c.id)) {
        newSelected.add(c.id);
      }
    });
    
    this.selectedIds.set(newSelected);
    this.toast.info(`已選擇 ${newSelected.size} 個客戶`);
  }
  
  // 批量發送 - 🔧 P0: 轉換數據格式
  batchSend(): void {
    const selectedContacts = this.contacts().filter(c => this.selectedIds().has(c.id));
    if (selectedContacts.length === 0) {
      this.toast.warning('請先選擇客戶');
      return;
    }
    // 轉換為 BatchSendTarget 格式
    const targets = this.convertToSendTargets(selectedContacts);
    if (targets.length === 0) {
      this.toast.error('選中的客戶沒有有效的 Telegram ID');
      return;
    }
    this.dialog.openBatchSend(targets);
  }
  
  // 單個發送消息 - 🔧 P0: 轉換數據格式
  sendMessage(contact: UnifiedContact): void {
    const targets = this.convertToSendTargets([contact]);
    if (targets.length === 0) {
      this.toast.error('此客戶沒有有效的 Telegram ID');
      return;
    }
    this.dialog.openBatchSend(targets);
  }
  
  // 🔧 P0: 將 UnifiedContact 轉換為 BatchSendTarget 格式
  private convertToSendTargets(contacts: UnifiedContact[]): any[] {
    return contacts
      .filter(c => c.telegram_id) // 過濾無效 ID
      .map(c => ({
        telegramId: c.telegram_id,
        username: c.username || '',
        firstName: c.first_name || c.display_name?.split(' ')[0] || '',
        lastName: c.last_name || c.display_name?.split(' ')[1] || '',
        displayName: c.display_name || c.username || c.telegram_id,
        // 來源信息（用於變量替換）
        groupName: c.source_name || '',
        source: c.source_type || ''
      }));
  }
  
  // 🔧 批量拉群
  batchInvite(): void {
    const selectedContacts = this.contacts().filter(c => this.selectedIds().has(c.id));
    if (selectedContacts.length === 0) {
      this.toast.warning('請先選擇客戶');
      return;
    }
    // 轉換為拉群目標格式
    const targets = selectedContacts.map(c => ({
      telegramId: c.telegram_id || String(c.id),
      username: c.username || '',
      firstName: c.first_name || c.display_name?.split(' ')[0] || '',
      lastName: c.last_name || c.display_name?.split(' ')[1] || ''
    }));
    this.dialog.openBatchInvite(targets);
  }
  
  // 🔧 單個拉群
  inviteToGroup(contact: UnifiedContact): void {
    const target = {
      telegramId: contact.telegram_id || String(contact.id),
      username: contact.username || '',
      firstName: contact.first_name || contact.display_name?.split(' ')[0] || '',
      lastName: contact.last_name || contact.display_name?.split(' ')[1] || ''
    };
    this.dialog.openBatchInvite([target]);
  }
  
  // 🔧 P0: 批量刪除 - 使用 contactsService 確保本地狀態同步
  batchDelete(): void {
    const count = this.selectedIds().size;
    if (count === 0) {
      this.toast.warning('請先選擇客戶');
      return;
    }
    
    if (this.isDeleting()) {
      this.toast.warning('正在刪除中，請稍候...');
      return;
    }
    
    if (!confirm(`確定要刪除選中的 ${count} 個客戶嗎？此操作不可恢復。`)) {
      return;
    }
    
    // 獲取選中客戶的 telegram_id
    const selectedContacts = this.contacts().filter(c => this.selectedIds().has(c.id));
    const telegramIds = selectedContacts.map(c => c.telegram_id).filter(Boolean);
    
    if (telegramIds.length === 0) {
      this.toast.error('選中的客戶沒有有效的 Telegram ID');
      return;
    }
    
    // 🔧 P0: 使用 contactsService 的刪除方法（會設置 pendingDeleteIds）
    this.isDeleting.set(true);
    this.contactsService.deleteContacts(telegramIds);
    this.toast.info(`正在刪除 ${telegramIds.length} 個客戶...`);
    
    // 監聯刪除結果更新 UI
    const cleanup = this.ipc.once('unified-contacts:delete-result', (result: { success: boolean, deleted: number, leadsDeleted?: number, error?: string }) => {
      this.isDeleting.set(false);
      if (result.success) {
        this.toast.success(`已刪除 ${result.deleted || result.leadsDeleted || telegramIds.length} 個客戶`);
        this.clearSelection();
        // 服務已自動更新本地狀態，無需再調用 loadContacts
      } else {
        this.toast.error(`刪除失敗: ${result.error || '未知錯誤'}`);
      }
    });
    
    // 超時保護
    setTimeout(() => {
      if (this.isDeleting()) {
        this.isDeleting.set(false);
        this.toast.warning('刪除操作超時，請刷新頁面查看結果');
      }
    }, 30000);
  }
  
  // 🔧 P0: 單個刪除 - 使用 contactsService 確保本地狀態同步
  deleteContact(contact: UnifiedContact): void {
    if (!confirm(`確定要刪除客戶「${contact.display_name || contact.username || contact.telegram_id}」嗎？`)) {
      return;
    }
    
    if (!contact.telegram_id) {
      this.toast.error('此客戶沒有有效的 Telegram ID');
      return;
    }
    
    // 🔧 P0: 使用 contactsService 的刪除方法
    this.isDeleting.set(true);
    this.contactsService.deleteContacts([contact.telegram_id]);
    this.toast.info('正在刪除客戶...');
    
    const cleanup = this.ipc.once('unified-contacts:delete-result', (result: { success: boolean, deleted: number, error?: string }) => {
      this.isDeleting.set(false);
      if (result.success) {
        this.toast.success('客戶已刪除');
        // 服務已自動更新本地狀態
      } else {
        this.toast.error(`刪除失敗: ${result.error || '未知錯誤'}`);
      }
    });
  }
  
  // 🔧 清除選擇
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }
  
  // 查看聯繫人詳情
  viewContact(contact: UnifiedContact): void {
    // TODO: 打開詳情對話框
    console.log('View contact:', contact);
  }
  
  // 獲取首字母
  getInitial(contact: UnifiedContact): string {
    const name = contact.display_name || contact.username || contact.telegram_id || '?';
    return name.charAt(0).toUpperCase();
  }
  
  // 獲取狀態樣式類
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'new': 'bg-blue-500/20 text-blue-400',
      'contacted': 'bg-emerald-500/20 text-emerald-400',
      'replied': 'bg-green-500/20 text-green-400',
      'failed': 'bg-red-500/20 text-red-400',
      'blacklisted': 'bg-slate-500/20 text-slate-400'
    };
    return classes[status] || 'bg-slate-500/20 text-slate-400';
  }
  
  // 獲取狀態標籤
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'new': '待發送',
      'contacted': '已發送',
      'replied': '已回覆',
      'failed': '發送失敗',
      'blacklisted': '已拉黑'
    };
    return labels[status] || status || '未知';
  }
  
  /**
   * 🆕 啟動 AI 多角色協作營銷
   */
  startMultiRoleCollaboration(): void {
    const selectedContacts = this.contacts().filter(c => this.selectedIds().has(c.id));
    
    if (selectedContacts.length === 0) {
      this.toast.warning('請先選擇客戶');
      return;
    }
    
    // 轉換為目標用戶格式
    const targetUsers = selectedContacts.map(c => ({
      id: c.id?.toString() || c.telegram_id,
      telegramId: c.telegram_id || c.id?.toString() || '',
      username: c.username,
      firstName: c.first_name || c.display_name?.split(' ')[0],
      lastName: c.last_name || c.display_name?.split(' ')[1],
      intentScore: this.calculateContactIntent(c),
      source: c.source_type || 'leads'
    }));
    
    // 存儲選中的用戶到動態引擎服務（通過 signal 或 sessionStorage）
    sessionStorage.setItem('multiRoleTargetUsers', JSON.stringify(targetUsers));
    
    this.toast.success(`🤖 已選擇 ${targetUsers.length} 個目標，正在跳轉到多角色協作中心...`);
    
    // 導航到多角色協作中心（使用 IPC 通知主視圖切換）
    this.ipc.send('navigate-to-multi-role', { targetUsers });
    
    // 發送事件通知多角色中心打開 AI 策劃
    setTimeout(() => {
      this.ipc.send('multi-role:open-ai-planner', { targetUsers });
    }, 500);
  }
  
  /**
   * 計算聯繫人意向分數
   */
  private calculateContactIntent(contact: UnifiedContact): number {
    let score = 30;
    
    if (contact.status === 'replied') score += 30;
    else if (contact.status === 'contacted') score += 15;
    else if (contact.status === 'new') score += 10;
    
    // 根據來源加分
    if (contact.source_type === 'lead') score += 20;
    else if (contact.source_type === 'member') score += 10;
    
    if (contact.tags?.includes('高意向')) score += 25;
    else if (contact.tags?.includes('有興趣')) score += 15;
    
    if (contact.last_message_at) score += 10;
    
    return Math.min(100, score);
  }
}
