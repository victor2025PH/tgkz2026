/**
 * TG-AI智控王 成員列表組件
 * Member List Component v1.0
 */
import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberExtractionService } from './member-extraction.service';
import { MembershipService } from '../membership.service';
import { ToastService } from '../toast.service';
import { 
  GroupBasicInfo, 
  MemberBasicInfo, 
  MemberFilters, 
  MemberStatus,
  ExportFormat,
  BatchOperationType,
  BatchOperationConfig
} from './search.types';

@Component({
  selector: 'app-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col">
      <!-- 頂部導航 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center gap-4">
          <button (click)="back.emit()"
                  class="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            ← 返回
          </button>
          <div>
            <h3 class="text-lg font-semibold">{{ group.title }}</h3>
            <p class="text-sm text-slate-400">成員提取 · {{ group.membersCount }} 人</p>
          </div>
        </div>
        
        <!-- 配額顯示 -->
        <div class="flex items-center gap-4 text-sm">
          <div>
            <span class="text-slate-400">今日額度:</span>
            <span class="ml-2" [class]="extractionService.remainingExtraction() <= 100 ? 'text-orange-400' : 'text-green-400'">
              {{ extractionService.remainingExtraction() === -1 ? '∞' : extractionService.remainingExtraction() }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 提取進度 -->
      @if (extractionService.isExtracting()) {
        <div class="px-6 py-4 bg-cyan-500/10 border-b border-cyan-500/30">
          <div class="flex items-center justify-between mb-2">
            <span class="text-cyan-400">正在提取成員...</span>
            <span>{{ extractionService.extractionProgress()?.current || 0 }} / {{ extractionService.extractionProgress()?.total || 0 }}</span>
          </div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                 [style.width.%]="extractionService.extractionProgress()?.percent || 0"></div>
          </div>
          <button (click)="stopExtraction()"
                  class="mt-2 text-sm text-red-400 hover:text-red-300">
            停止提取
          </button>
        </div>
      }
      
      <!-- 工具欄 -->
      <div class="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- 提取按鈕 -->
          @if (extractionService.extractedMembers().length === 0) {
            <button (click)="startExtraction()"
                    [disabled]="extractionService.isExtracting() || !extractionService.canExtract()"
                    class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
              📥 開始提取
            </button>
          } @else {
            <!-- 選擇操作 -->
            <div class="flex items-center gap-2">
              <input type="checkbox"
                     [checked]="isAllSelected()"
                     (change)="toggleSelectAll()"
                     class="rounded bg-slate-700 border-slate-600 text-cyan-500">
              <span class="text-sm text-slate-400">
                已選 {{ extractionService.selectedCount() }} / {{ extractionService.extractedMembers().length }}
              </span>
            </div>
          }
          
          <!-- 篩選 -->
          @if (extractionService.extractedMembers().length > 0) {
            <select [(ngModel)]="statusFilter"
                    (change)="applyFilters()"
                    class="px-3 py-2 bg-slate-800 rounded-lg border-none text-sm">
              <option value="all">全部狀態</option>
              <option value="online">🟢 在線</option>
              <option value="recently">🟡 最近在線</option>
              <option value="offline">⚫ 離線</option>
            </select>
            
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox"
                     [(ngModel)]="hasUsernameFilter"
                     (change)="applyFilters()"
                     class="rounded bg-slate-700 border-slate-600 text-cyan-500">
              有用戶名
            </label>
            
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox"
                     [(ngModel)]="notBotFilter"
                     (change)="applyFilters()"
                     class="rounded bg-slate-700 border-slate-600 text-cyan-500">
              排除機器人
            </label>
          }
        </div>
        
        <!-- 操作按鈕 -->
        @if (extractionService.extractedMembers().length > 0) {
          <div class="flex items-center gap-2">
            <button (click)="showExportMenu.set(!showExportMenu())"
                    [disabled]="extractionService.selectedCount() === 0"
                    class="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
              📥 導出 {{ extractionService.selectedCount() > 0 ? '(' + extractionService.selectedCount() + ')' : '' }}
            </button>
            
            <button (click)="showBatchMenu.set(!showBatchMenu())"
                    [disabled]="extractionService.selectedCount() === 0 || !membershipService.hasFeature('batchOperations')"
                    class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2">
              📨 批量操作
              @if (!membershipService.hasFeature('batchOperations')) {
                <span class="text-xs">🔒</span>
              }
            </button>
          </div>
        }
      </div>
      
      <!-- 導出菜單 -->
      @if (showExportMenu()) {
        <div class="absolute right-6 top-40 z-50 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 min-w-48">
          <button (click)="exportExcel()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📊 導出 Excel
          </button>
          <button (click)="exportCSV()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📄 導出 CSV
          </button>
          <button (click)="exportJSON()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            🔧 導出 JSON
          </button>
        </div>
      }
      
      <!-- 批量操作菜單 -->
      @if (showBatchMenu()) {
        <div class="absolute right-6 top-40 z-50 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 min-w-48">
          <button (click)="openBatchMessage()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📨 批量私信
          </button>
          <button (click)="openBatchInvite()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            ➕ 批量邀請
          </button>
        </div>
      }
      
      <!-- 成員列表 -->
      <div class="flex-1 overflow-auto">
        @if (extractionService.extractedMembers().length === 0 && !extractionService.isExtracting()) {
          <!-- 空狀態 -->
          <div class="flex flex-col items-center justify-center py-20">
            <div class="text-6xl mb-4">👥</div>
            <p class="text-xl text-slate-400 mb-2">點擊上方按鈕開始提取成員</p>
            <p class="text-sm text-slate-500">
              可提取成員的頭像、暱稱、用戶名、ID 等公開信息
            </p>
            
            @if (!extractionService.canExtract()) {
              <div class="mt-4 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p class="text-orange-400 text-sm">
                  {{ membershipService.levelIcon() }} {{ membershipService.levelName() }} 
                  無法使用成員提取功能
                </p>
              </div>
            }
          </div>
        } @else {
          <!-- 成員表格 -->
          <table class="w-full">
            <thead class="bg-slate-800/50 sticky top-0">
              <tr>
                <th class="w-12 px-4 py-3 text-left">
                  <input type="checkbox"
                         [checked]="isAllSelected()"
                         (change)="toggleSelectAll()"
                         class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                </th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">頭像</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">暱稱</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">用戶名</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">ID</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">狀態</th>
                <th class="px-4 py-3 text-left text-sm font-medium text-slate-400">標籤</th>
              </tr>
            </thead>
            <tbody>
              @for (member of filteredMembers(); track member.id) {
                <tr class="border-t border-slate-700/50 hover:bg-slate-800/30 transition-colors"
                    [class.bg-cyan-500/5]="isSelected(member.id)">
                  <td class="px-4 py-3">
                    <input type="checkbox"
                           [checked]="isSelected(member.id)"
                           (change)="toggleMember(member.id)"
                           class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                  </td>
                  <td class="px-4 py-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-lg overflow-hidden">
                      @if (member.photo?.smallUrl) {
                        <img [src]="member.photo.smallUrl" class="w-full h-full object-cover">
                      } @else {
                        {{ getInitials(member) }}
                      }
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ getDisplayName(member) }}</span>
                      @if (member.isBot) {
                        <span class="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400">BOT</span>
                      }
                      @if (member.isPremium) {
                        <span class="text-yellow-400">⭐</span>
                      }
                      @if (member.isVerified) {
                        <span class="text-cyan-400">✓</span>
                      }
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    @if (member.username) {
                      <span class="text-cyan-400">{{ '@' + member.username }}</span>
                    } @else {
                      <span class="text-slate-500">-</span>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <code class="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">{{ member.id }}</code>
                  </td>
                  <td class="px-4 py-3">
                    <span class="flex items-center gap-1.5">
                      <span [class]="getStatusColor(member.status)">{{ getStatusIcon(member.status) }}</span>
                      <span class="text-sm text-slate-400">{{ getStatusText(member.status) }}</span>
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    @if (member.role === 'creator') {
                      <span class="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400">創建者</span>
                    } @else if (member.role === 'admin') {
                      <span class="px-2 py-1 text-xs rounded bg-orange-500/20 text-orange-400">管理員</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
      
      <!-- 批量私信對話框 -->
      @if (showMessageDialog()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-700">
            <h3 class="text-xl font-bold mb-4">📨 批量私信</h3>
            
            <div class="mb-4">
              <p class="text-sm text-slate-400 mb-2">目標用戶: {{ extractionService.selectedCount() }} 人</p>
            </div>
            
            <div class="mb-4">
              <label class="block text-sm text-slate-400 mb-2">消息內容</label>
              <textarea [(ngModel)]="messageTemplate"
                        rows="5"
                        class="w-full px-4 py-3 bg-slate-700 rounded-xl border-none resize-none"
                        placeholder="您好 {name}！&#10;&#10;歡迎加入我們的社群..."></textarea>
              <p class="text-xs text-slate-500 mt-1">支持變量: {name}, {username}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm text-slate-400 mb-2">發送間隔</label>
                <select [(ngModel)]="batchConfig.delayMin"
                        class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                  <option [ngValue]="30">30-60 秒</option>
                  <option [ngValue]="60">60-120 秒</option>
                  <option [ngValue]="120">2-3 分鐘</option>
                </select>
              </div>
              <div>
                <label class="block text-sm text-slate-400 mb-2">每日上限</label>
                <select [(ngModel)]="batchConfig.dailyLimit"
                        class="w-full px-3 py-2 bg-slate-700 rounded-lg border-none">
                  <option [ngValue]="20">20 人</option>
                  <option [ngValue]="50">50 人</option>
                  <option [ngValue]="100">100 人</option>
                </select>
              </div>
            </div>
            
            <div class="flex items-center gap-4 mb-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                       [(ngModel)]="batchConfig.smartAntiBlock"
                       class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                <span class="text-sm">智能防封</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                       [(ngModel)]="batchConfig.retryOnFail"
                       class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                <span class="text-sm">失敗重試</span>
              </label>
            </div>
            
            <div class="flex gap-3">
              <button (click)="showMessageDialog.set(false)"
                      class="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="startBatchMessage()"
                      [disabled]="!messageTemplate.trim()"
                      class="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 disabled:opacity-50 transition-all">
                開始發送
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
      position: relative;
    }
  `]
})
export class MemberListComponent implements OnInit {
  @Input({ required: true }) group!: GroupBasicInfo;
  @Output() back = new EventEmitter<void>();
  
  extractionService = inject(MemberExtractionService);
  membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  
  // UI 狀態
  showExportMenu = signal(false);
  showBatchMenu = signal(false);
  showMessageDialog = signal(false);
  
  // 篩選
  statusFilter = 'all';
  hasUsernameFilter = false;
  notBotFilter = false;
  
  // 批量操作配置
  messageTemplate = '';
  batchConfig: Partial<BatchOperationConfig> = {
    delayMin: 30,
    delayMax: 60,
    dailyLimit: 50,
    smartAntiBlock: true,
    retryOnFail: true
  };
  
  // 篩選後的成員
  filteredMembers = computed(() => {
    let members = this.extractionService.extractedMembers();
    
    if (this.statusFilter !== 'all') {
      if (this.statusFilter === 'online') {
        members = members.filter(m => m.status === 'online');
      } else if (this.statusFilter === 'recently') {
        members = members.filter(m => m.status === 'recently');
      } else if (this.statusFilter === 'offline') {
        members = members.filter(m => !['online', 'recently'].includes(m.status));
      }
    }
    
    if (this.hasUsernameFilter) {
      members = members.filter(m => !!m.username);
    }
    
    if (this.notBotFilter) {
      members = members.filter(m => !m.isBot);
    }
    
    return members;
  });
  
  ngOnInit(): void {
    // 關閉點擊外部的菜單
    document.addEventListener('click', this.closeMenus.bind(this));
  }
  
  private closeMenus(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('button')) {
      this.showExportMenu.set(false);
      this.showBatchMenu.set(false);
    }
  }
  
  // ============ 提取操作 ============
  
  async startExtraction(): Promise<void> {
    await this.extractionService.extractMembers(this.group);
  }
  
  stopExtraction(): void {
    this.extractionService.stopExtraction();
  }
  
  // ============ 選擇操作 ============
  
  isSelected(memberId: string): boolean {
    return this.extractionService.selectedMembers().has(memberId);
  }
  
  toggleMember(memberId: string): void {
    this.extractionService.toggleMember(memberId);
  }
  
  isAllSelected(): boolean {
    const filtered = this.filteredMembers();
    const selected = this.extractionService.selectedMembers();
    return filtered.length > 0 && filtered.every(m => selected.has(m.id));
  }
  
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.extractionService.deselectAll();
    } else {
      const ids = this.filteredMembers().map(m => m.id);
      this.extractionService.selectFiltered(m => ids.includes(m.id));
    }
  }
  
  // ============ 篩選 ============
  
  applyFilters(): void {
    // 篩選在 computed 中自動應用
  }
  
  // ============ 導出 ============
  
  async exportExcel(): Promise<void> {
    this.showExportMenu.set(false);
    await this.extractionService.quickExportExcel();
  }
  
  async exportCSV(): Promise<void> {
    this.showExportMenu.set(false);
    await this.extractionService.quickExportCSV();
  }
  
  async exportJSON(): Promise<void> {
    this.showExportMenu.set(false);
    await this.extractionService.exportMembers({
      format: 'json',
      fields: ['id', 'username', 'firstName', 'lastName', 'phone', 'status', 'isBot', 'isPremium', 'bio'],
      includeHeaders: false
    });
  }
  
  // ============ 批量操作 ============
  
  openBatchMessage(): void {
    this.showBatchMenu.set(false);
    this.showMessageDialog.set(true);
  }
  
  openBatchInvite(): void {
    this.showBatchMenu.set(false);
    this.toastService.info('批量邀請功能開發中...');
  }
  
  startBatchMessage(): void {
    const members = this.extractionService.getSelectedMembers();
    
    if (members.length === 0) {
      this.toastService.warning('請先選擇成員');
      return;
    }
    
    const operation = this.extractionService.createBatchOperation(
      'message',
      members,
      {
        messageTemplate: this.messageTemplate,
        delayMin: this.batchConfig.delayMin || 30,
        delayMax: this.batchConfig.delayMax || 60,
        dailyLimit: this.batchConfig.dailyLimit || 50,
        retryOnFail: this.batchConfig.retryOnFail || false,
        smartAntiBlock: this.batchConfig.smartAntiBlock || false
      }
    );
    
    this.showMessageDialog.set(false);
    this.extractionService.startBatchOperation(operation.id);
  }
  
  // ============ 工具方法 ============
  
  getDisplayName(member: MemberBasicInfo): string {
    if (member.firstName && member.lastName) {
      return `${member.firstName} ${member.lastName}`;
    }
    return member.firstName || member.lastName || member.username || '未知用戶';
  }
  
  getInitials(member: MemberBasicInfo): string {
    const name = member.firstName || member.username || '?';
    return name[0].toUpperCase();
  }
  
  getStatusIcon(status: MemberStatus): string {
    const icons: Record<MemberStatus, string> = {
      online: '🟢',
      recently: '🟡',
      lastWeek: '🟠',
      lastMonth: '🔴',
      longAgo: '⚫',
      unknown: '⚪'
    };
    return icons[status] || '⚪';
  }
  
  getStatusColor(status: MemberStatus): string {
    const colors: Record<MemberStatus, string> = {
      online: 'text-green-400',
      recently: 'text-yellow-400',
      lastWeek: 'text-orange-400',
      lastMonth: 'text-red-400',
      longAgo: 'text-slate-500',
      unknown: 'text-slate-400'
    };
    return colors[status] || 'text-slate-400';
  }
  
  getStatusText(status: MemberStatus): string {
    const texts: Record<MemberStatus, string> = {
      online: '在線',
      recently: '最近在線',
      lastWeek: '上週在線',
      lastMonth: '上月在線',
      longAgo: '很久未上線',
      unknown: '未知'
    };
    return texts[status] || '未知';
  }
}
