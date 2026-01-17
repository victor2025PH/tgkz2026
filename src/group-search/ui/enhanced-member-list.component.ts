/**
 * TG-AI智控王 增強版成員列表組件
 * Enhanced Member List Component v1.0
 * 
 * 整合虛擬滾動和 Worker 處理，支持 10 萬+ 成員流暢操作
 */
import { Component, Input, Output, EventEmitter, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemberExtractionService } from '../member-extraction.service';
import { MembershipService } from '../../membership.service';
import { ToastService } from '../../toast.service';
import { VirtualScrollComponent } from '../performance/virtual-scroll.component';
import { VirtualScrollService, VirtualScrollController } from '../performance/virtual-scroll.service';
import { WorkerPoolService } from '../performance/worker-pool.service';
import { 
  GroupBasicInfo, 
  MemberBasicInfo, 
  MemberStatus,
  BatchOperationConfig
} from '../search.types';

@Component({
  selector: 'app-enhanced-member-list',
  standalone: true,
  imports: [CommonModule, FormsModule, VirtualScrollComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 text-white">
      <!-- 頂部導航 -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center gap-4">
          <button (click)="back.emit()"
                  class="p-2 rounded-lg hover:bg-slate-800 transition-colors">
            ← 返回
          </button>
          <div>
            <h3 class="text-lg font-semibold">{{ group.title }}</h3>
            <p class="text-sm text-slate-400">成員管理 · {{ totalCount() }} 人</p>
          </div>
        </div>
        
        <!-- 性能指標 -->
        <div class="flex items-center gap-4 text-sm">
          <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
            <span class="text-green-400">⚡</span>
            <span>渲染: {{ renderCount() }} 項</span>
          </div>
          @if (isAnalyzing()) {
            <div class="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
              <span class="animate-spin">⏳</span>
              <span class="text-blue-400">分析中 {{ analysisProgress() }}%</span>
            </div>
          }
        </div>
      </div>
      
      <!-- 工具欄 -->
      <div class="px-6 py-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between">
          <!-- 左側操作 -->
          <div class="flex items-center gap-4">
            <!-- 提取按鈕 -->
            @if (extractionService.extractedMembers().length === 0) {
              <button (click)="startExtraction()"
                      [disabled]="extractionService.isExtracting()"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-lg transition-colors">
                📥 開始提取
              </button>
            } @else {
              <!-- 選擇控制 -->
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         [checked]="isAllSelected()"
                         (change)="toggleSelectAll()"
                         class="rounded bg-slate-700 border-slate-600 text-cyan-500">
                  <span class="text-sm">全選</span>
                </label>
                <span class="text-sm text-slate-400">
                  已選 {{ selectedCount() }} / {{ filteredCount() }}
                </span>
              </div>
              
              <!-- 快速篩選 -->
              <div class="flex items-center gap-2 ml-4">
                <button (click)="quickFilter('online')"
                        [class.bg-green-500/20]="activeQuickFilter() === 'online'"
                        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors">
                  🟢 在線
                </button>
                <button (click)="quickFilter('hasUsername')"
                        [class.bg-blue-500/20]="activeQuickFilter() === 'hasUsername'"
                        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors">
                  @有用戶名
                </button>
                <button (click)="quickFilter('premium')"
                        [class.bg-yellow-500/20]="activeQuickFilter() === 'premium'"
                        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors">
                  ⭐ 會員
                </button>
                <button (click)="quickFilter('highValue')"
                        [class.bg-purple-500/20]="activeQuickFilter() === 'highValue'"
                        class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm transition-colors">
                  💎 高價值
                </button>
              </div>
            }
          </div>
          
          <!-- 右側操作 -->
          <div class="flex items-center gap-3">
            @if (extractionService.extractedMembers().length > 0) {
              <!-- 分析按鈕 -->
              <button (click)="analyzeMembers()"
                      [disabled]="isAnalyzing()"
                      class="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors">
                🔬 智能分析
              </button>
              
              <!-- 導出按鈕 -->
              <button (click)="showExportMenu.set(!showExportMenu())"
                      class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
                📥 導出
              </button>
              
              <!-- 批量操作 -->
              <button (click)="showBatchMenu.set(!showBatchMenu())"
                      [disabled]="selectedCount() === 0"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors">
                📨 批量操作 ({{ selectedCount() }})
              </button>
            }
          </div>
        </div>
        
        <!-- 搜索框 -->
        @if (extractionService.extractedMembers().length > 0) {
          <div class="mt-4">
            <input type="text"
                   [(ngModel)]="searchQuery"
                   (input)="onSearchChange()"
                   placeholder="搜索成員（姓名、用戶名、ID）..."
                   class="w-full px-4 py-2.5 bg-slate-800 rounded-lg border border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors">
          </div>
        }
      </div>
      
      <!-- 提取進度 -->
      @if (extractionService.isExtracting()) {
        <div class="px-6 py-4 bg-cyan-500/10 border-b border-cyan-500/30">
          <div class="flex items-center justify-between mb-2">
            <span class="text-cyan-400">正在提取成員...</span>
            <div class="flex items-center gap-4">
              <span>{{ extractionService.extractionProgress()?.current || 0 }} / {{ extractionService.extractionProgress()?.total || 0 }}</span>
              <button (click)="stopExtraction()"
                      class="text-sm text-red-400 hover:text-red-300">
                停止
              </button>
            </div>
          </div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                 [style.width.%]="extractionService.extractionProgress()?.percent || 0"></div>
          </div>
        </div>
      }
      
      <!-- 成員列表（虛擬滾動） -->
      <div class="flex-1 overflow-hidden">
        @if (filteredMembers().length === 0 && !extractionService.isExtracting()) {
          <!-- 空狀態 -->
          <div class="flex flex-col items-center justify-center h-full">
            <div class="text-6xl mb-4">👥</div>
            <p class="text-xl text-slate-400 mb-2">
              {{ extractionService.extractedMembers().length === 0 ? '點擊上方按鈕開始提取成員' : '沒有符合條件的成員' }}
            </p>
          </div>
        } @else {
          <app-virtual-scroll
            [items]="filteredMembers()"
            [containerHeight]="containerHeight"
            [itemHeight]="72"
            [bufferSize]="10"
            [showScrollToTop]="true"
            [showStats]="true"
            (itemClick)="onMemberClick($event)"
            (scroll)="onScroll($event)">
            
            <ng-template #itemTemplate let-member let-index="index" let-selected="selected">
              <div class="flex items-center px-6 py-3 border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors"
                   [class.bg-cyan-500/10]="isSelected(member.id)">
                
                <!-- 選擇框 -->
                <div class="w-12">
                  <input type="checkbox"
                         [checked]="isSelected(member.id)"
                         (change)="toggleMember(member.id); $event.stopPropagation()"
                         class="rounded bg-slate-700 border-slate-600 text-cyan-500 cursor-pointer">
                </div>
                
                <!-- 頭像 -->
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-lg overflow-hidden mr-4">
                  @if (member.photo?.smallUrl) {
                    <img [src]="member.photo.smallUrl" class="w-full h-full object-cover" loading="lazy">
                  } @else {
                    {{ getInitials(member) }}
                  }
                </div>
                
                <!-- 信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-medium truncate">{{ getDisplayName(member) }}</span>
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
                  <div class="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                    @if (member.username) {
                      <span class="text-cyan-400">@{{ member.username }}</span>
                    }
                    <code class="text-xs bg-slate-800 px-1.5 py-0.5 rounded">{{ member.id }}</code>
                  </div>
                </div>
                
                <!-- 狀態和分數 -->
                <div class="flex items-center gap-4">
                  <!-- 狀態 -->
                  <div class="flex items-center gap-1.5 w-24">
                    <span>{{ getStatusIcon(member.status) }}</span>
                    <span class="text-sm text-slate-400">{{ getStatusText(member.status) }}</span>
                  </div>
                  
                  <!-- 價值分數 -->
                  @if (member['valueScore'] !== undefined) {
                    <div class="flex items-center gap-2 w-20">
                      <div class="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all"
                             [class]="getScoreColor(member['valueScore'])"
                             [style.width.%]="member['valueScore']"></div>
                      </div>
                      <span class="text-xs font-medium" [class]="getScoreTextColor(member['valueScore'])">
                        {{ member['valueScore'] }}
                      </span>
                    </div>
                  }
                  
                  <!-- 等級標籤 -->
                  @if (member['grade']) {
                    <span class="px-2 py-1 text-xs rounded font-medium"
                          [class]="getGradeClass(member['grade'])">
                      {{ member['grade'] }}
                    </span>
                  }
                </div>
              </div>
            </ng-template>
            
            <ng-template #emptyTemplate>
              <div class="flex flex-col items-center justify-center py-20">
                <div class="text-6xl mb-4">👥</div>
                <p class="text-xl text-slate-400">暫無成員數據</p>
              </div>
            </ng-template>
          </app-virtual-scroll>
        }
      </div>
      
      <!-- 導出菜單 -->
      @if (showExportMenu()) {
        <div class="absolute right-24 top-32 z-50 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 min-w-48"
             (click)="$event.stopPropagation()">
          <button (click)="exportData('excel')"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📊 導出 Excel
          </button>
          <button (click)="exportData('csv')"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📄 導出 CSV
          </button>
          <button (click)="exportData('json')"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            🔧 導出 JSON
          </button>
          <div class="border-t border-slate-700 my-2"></div>
          <button (click)="exportData('excel', true)"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 text-cyan-400">
            ✨ 導出選中 ({{ selectedCount() }})
          </button>
        </div>
      }
      
      <!-- 批量操作菜單 -->
      @if (showBatchMenu()) {
        <div class="absolute right-6 top-32 z-50 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 min-w-48"
             (click)="$event.stopPropagation()">
          <button (click)="openBatchMessage()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            📨 批量私信
          </button>
          <button (click)="openBatchInvite()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            ➕ 批量邀請
          </button>
          <div class="border-t border-slate-700 my-2"></div>
          <button (click)="tagSelected()"
                  class="w-full px-4 py-2 text-left hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2">
            🏷️ 添加標籤
          </button>
        </div>
      }
      
      <!-- 分析結果面板 -->
      @if (showAnalysisPanel()) {
        <div class="absolute right-0 top-0 bottom-0 w-96 bg-slate-800 border-l border-slate-700 shadow-2xl z-40 flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <h3 class="font-semibold">🔬 智能分析結果</h3>
            <button (click)="showAnalysisPanel.set(false)"
                    class="p-1 hover:bg-slate-700 rounded">
              ✕
            </button>
          </div>
          
          <div class="flex-1 overflow-auto p-4 space-y-4">
            <!-- 分佈統計 -->
            <div class="bg-slate-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-slate-400 mb-3">成員等級分佈</h4>
              <div class="space-y-2">
                @for (grade of gradeDistribution(); track grade.grade) {
                  <div class="flex items-center gap-3">
                    <span class="w-8 text-center font-bold" [class]="getGradeTextColor(grade.grade)">
                      {{ grade.grade }}
                    </span>
                    <div class="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full transition-all"
                           [class]="getGradeBarColor(grade.grade)"
                           [style.width.%]="grade.percentage"></div>
                    </div>
                    <span class="text-sm text-slate-400 w-16 text-right">
                      {{ grade.count }} ({{ grade.percentage.toFixed(1) }}%)
                    </span>
                  </div>
                }
              </div>
            </div>
            
            <!-- 關鍵指標 -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-slate-900 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-green-400">{{ analysisStats().onlineRate }}%</div>
                <div class="text-xs text-slate-400">在線率</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-yellow-400">{{ analysisStats().premiumRate }}%</div>
                <div class="text-xs text-slate-400">會員率</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-blue-400">{{ analysisStats().usernameRate }}%</div>
                <div class="text-xs text-slate-400">有用戶名</div>
              </div>
              <div class="bg-slate-900 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-purple-400">{{ analysisStats().avgScore }}</div>
                <div class="text-xs text-slate-400">平均分數</div>
              </div>
            </div>
            
            <!-- 快速操作 -->
            <div class="bg-slate-900 rounded-lg p-4">
              <h4 class="text-sm font-medium text-slate-400 mb-3">快速選擇</h4>
              <div class="space-y-2">
                <button (click)="selectByGrade('A')"
                        class="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors">
                  選擇所有 A 級成員
                </button>
                <button (click)="selectHighValue()"
                        class="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors">
                  選擇高價值成員 (分數 ≥ 80)
                </button>
                <button (click)="selectActive()"
                        class="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-left transition-colors">
                  選擇活躍成員
                </button>
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
      position: relative;
    }
  `]
})
export class EnhancedMemberListComponent implements OnInit, OnDestroy {
  @Input({ required: true }) group!: GroupBasicInfo;
  @Output() back = new EventEmitter<void>();
  
  extractionService = inject(MemberExtractionService);
  membershipService = inject(MembershipService);
  private toastService = inject(ToastService);
  private virtualScrollService = inject(VirtualScrollService);
  private workerPool = inject(WorkerPoolService);
  
  // UI 狀態
  showExportMenu = signal(false);
  showBatchMenu = signal(false);
  showAnalysisPanel = signal(false);
  containerHeight = 600;
  
  // 搜索
  searchQuery = '';
  activeQuickFilter = signal<string | null>(null);
  
  // 分析狀態
  isAnalyzing = signal(false);
  analysisProgress = signal(0);
  analyzedMembers = signal<MemberBasicInfo[]>([]);
  
  // 統計數據
  totalCount = computed(() => this.extractionService.extractedMembers().length);
  selectedCount = computed(() => this.extractionService.selectedCount());
  filteredCount = computed(() => this.filteredMembers().length);
  renderCount = signal(0);
  
  // 篩選後的成員
  filteredMembers = computed(() => {
    let members = this.analyzedMembers().length > 0 
      ? this.analyzedMembers() 
      : this.extractionService.extractedMembers();
    
    // 搜索過濾
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      members = members.filter(m => 
        m.firstName?.toLowerCase().includes(query) ||
        m.lastName?.toLowerCase().includes(query) ||
        m.username?.toLowerCase().includes(query) ||
        m.id.toString().includes(query)
      );
    }
    
    // 快速篩選
    const filter = this.activeQuickFilter();
    if (filter) {
      switch (filter) {
        case 'online':
          members = members.filter(m => m.status === 'online');
          break;
        case 'hasUsername':
          members = members.filter(m => !!m.username);
          break;
        case 'premium':
          members = members.filter(m => m.isPremium);
          break;
        case 'highValue':
          members = members.filter(m => (m as any).valueScore >= 80);
          break;
      }
    }
    
    return members;
  });
  
  // 分析統計
  analysisStats = computed(() => {
    const members = this.analyzedMembers();
    if (members.length === 0) {
      return { onlineRate: 0, premiumRate: 0, usernameRate: 0, avgScore: 0 };
    }
    
    const online = members.filter(m => m.status === 'online').length;
    const premium = members.filter(m => m.isPremium).length;
    const hasUsername = members.filter(m => !!m.username).length;
    const scores = members.map(m => (m as any).valueScore || 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / members.length);
    
    return {
      onlineRate: Math.round((online / members.length) * 100),
      premiumRate: Math.round((premium / members.length) * 100),
      usernameRate: Math.round((hasUsername / members.length) * 100),
      avgScore
    };
  });
  
  // 等級分佈
  gradeDistribution = computed(() => {
    const members = this.analyzedMembers();
    if (members.length === 0) return [];
    
    const grades = ['A', 'B', 'C', 'D'];
    return grades.map(grade => {
      const count = members.filter(m => (m as any).grade === grade).length;
      return {
        grade,
        count,
        percentage: (count / members.length) * 100
      };
    });
  });
  
  ngOnInit(): void {
    // 計算容器高度
    this.updateContainerHeight();
    window.addEventListener('resize', this.updateContainerHeight.bind(this));
    
    // 點擊外部關閉菜單
    document.addEventListener('click', this.closeMenus.bind(this));
  }
  
  ngOnDestroy(): void {
    window.removeEventListener('resize', this.updateContainerHeight.bind(this));
    document.removeEventListener('click', this.closeMenus.bind(this));
  }
  
  private updateContainerHeight(): void {
    // 減去頭部和工具欄的高度
    this.containerHeight = window.innerHeight - 250;
  }
  
  private closeMenus(): void {
    this.showExportMenu.set(false);
    this.showBatchMenu.set(false);
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
  
  // ============ 篩選和搜索 ============
  
  quickFilter(filter: string): void {
    this.activeQuickFilter.set(
      this.activeQuickFilter() === filter ? null : filter
    );
  }
  
  onSearchChange(): void {
    // 搜索在 computed 中自動處理
  }
  
  // ============ 智能分析 ============
  
  async analyzeMembers(): Promise<void> {
    const members = this.extractionService.extractedMembers();
    if (members.length === 0) {
      this.toastService.warning('沒有可分析的成員');
      return;
    }
    
    this.isAnalyzing.set(true);
    this.analysisProgress.set(0);
    
    try {
      // 使用 Web Worker 進行分析
      const result = await this.workerPool.execute<any, any[]>(
        'analyze-members',
        { members },
        {
          priority: 5,
          onProgress: (progress) => {
            this.analysisProgress.set(progress);
          }
        }
      );
      
      this.analyzedMembers.set(result);
      this.showAnalysisPanel.set(true);
      this.toastService.success(`已分析 ${result.length} 名成員`);
      
    } catch (error: any) {
      this.toastService.error(`分析失敗: ${error.message}`);
    } finally {
      this.isAnalyzing.set(false);
    }
  }
  
  // ============ 按條件選擇 ============
  
  selectByGrade(grade: string): void {
    this.extractionService.selectFiltered(m => (m as any).grade === grade);
    this.toastService.success(`已選擇所有 ${grade} 級成員`);
  }
  
  selectHighValue(): void {
    this.extractionService.selectFiltered(m => (m as any).valueScore >= 80);
    this.toastService.success('已選擇高價值成員');
  }
  
  selectActive(): void {
    this.extractionService.selectFiltered(m => 
      m.status === 'online' || m.status === 'recently'
    );
    this.toastService.success('已選擇活躍成員');
  }
  
  // ============ 導出 ============
  
  async exportData(format: 'excel' | 'csv' | 'json', selectedOnly = false): Promise<void> {
    this.showExportMenu.set(false);
    
    const members = selectedOnly 
      ? this.extractionService.getSelectedMembers()
      : this.filteredMembers();
    
    if (members.length === 0) {
      this.toastService.warning('沒有可導出的成員');
      return;
    }
    
    // 使用 Worker 處理導出
    try {
      const exportFormat = format === 'excel' ? 'csv' : format; // Excel 簡化為 CSV
      const result = await this.workerPool.execute<any, string>(
        'export-data',
        { 
          items: members,
          format: exportFormat,
          fields: ['id', 'username', 'firstName', 'lastName', 'status', 'isPremium', 'valueScore', 'grade']
        }
      );
      
      // 下載文件
      const blob = new Blob([result], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-${Date.now()}.${format === 'excel' ? 'csv' : format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      this.toastService.success(`已導出 ${members.length} 名成員`);
      
    } catch (error: any) {
      this.toastService.error(`導出失敗: ${error.message}`);
    }
  }
  
  // ============ 批量操作 ============
  
  openBatchMessage(): void {
    this.showBatchMenu.set(false);
    this.toastService.info('批量私信功能準備中...');
  }
  
  openBatchInvite(): void {
    this.showBatchMenu.set(false);
    this.toastService.info('批量邀請功能準備中...');
  }
  
  tagSelected(): void {
    this.showBatchMenu.set(false);
    this.toastService.info('標籤功能準備中...');
  }
  
  // ============ 事件處理 ============
  
  onMemberClick(event: { item: MemberBasicInfo; index: number }): void {
    // 可以打開成員詳情
    console.log('Member clicked:', event.item);
  }
  
  onScroll(event: { scrollTop: number; direction: string }): void {
    this.renderCount.set(
      Math.min(this.filteredMembers().length, Math.ceil(this.containerHeight / 72) + 20)
    );
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
  
  getStatusText(status: MemberStatus): string {
    const texts: Record<MemberStatus, string> = {
      online: '在線',
      recently: '最近',
      lastWeek: '上週',
      lastMonth: '上月',
      longAgo: '很久',
      unknown: '未知'
    };
    return texts[status] || '未知';
  }
  
  getScoreColor(score: number): string {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }
  
  getScoreTextColor(score: number): string {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-blue-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  }
  
  getGradeClass(grade: string): string {
    const classes: Record<string, string> = {
      'A': 'bg-green-500/20 text-green-400',
      'B': 'bg-blue-500/20 text-blue-400',
      'C': 'bg-yellow-500/20 text-yellow-400',
      'D': 'bg-red-500/20 text-red-400'
    };
    return classes[grade] || 'bg-slate-500/20 text-slate-400';
  }
  
  getGradeTextColor(grade: string): string {
    const colors: Record<string, string> = {
      'A': 'text-green-400',
      'B': 'text-blue-400',
      'C': 'text-yellow-400',
      'D': 'text-red-400'
    };
    return colors[grade] || 'text-slate-400';
  }
  
  getGradeBarColor(grade: string): string {
    const colors: Record<string, string> = {
      'A': 'bg-green-500',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-red-500'
    };
    return colors[grade] || 'bg-slate-500';
  }
}
