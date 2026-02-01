/**
 * 歷史消息用戶收集對話框組件
 * History Collection Dialog Component
 * 
 * 功能：
 * - 從監控的歷史消息中收集活躍用戶
 * - 收集數量配置
 * - 時間範圍篩選
 * - 活躍度篩選（發言次數）
 * - 去重、排除機器人等選項
 * - 進度顯示與結果統計
 */

import { Component, signal, input, output, inject, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 收集配置接口
export interface HistoryCollectionConfig {
  // 基本配置
  limit: number;                // 收集數量上限 (-1 表示全部)
  
  // 時間範圍
  timeRange: '7d' | '30d' | '90d' | 'all' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  
  // 活躍度篩選
  minMessages: number;          // 最少發言次數
  
  // 選項
  options: {
    skipDuplicates: boolean;    // 跳過已收集的用戶
    excludeBots: boolean;       // 排除機器人
    requireUsername: boolean;   // 需要有用戶名
    excludeAdmins: boolean;     // 排除管理員
    autoSync: boolean;          // 自動同步到資源中心
  };
}

// 群組信息接口
export interface HistoryCollectionGroupInfo {
  id: string;
  name: string;
  telegramId?: string;
  url?: string;
  accountPhone?: string;
}

// 收集統計接口
export interface CollectionStats {
  totalMessages: number;        // 總消息數
  uniqueSenders: number;        // 唯一發送者數
  dateRange: {                  // 消息時間範圍
    first: string;
    last: string;
  };
  activeUsers: number;          // 活躍用戶數 (發言>=3次)
  collectedUsers: number;       // 已收集用戶數
}

// 收集結果接口
export interface CollectionResult {
  success: boolean;
  collected: number;
  newUsers: number;
  updated: number;
  skipped: number;
  quality: {
    highActivity: number;       // 高活躍（發言>=10次）
    mediumActivity: number;     // 中活躍（發言3-9次）
    lowActivity: number;        // 低活躍（發言<3次）
  };
}

// 快速模板類型
type QuickTemplate = 'quick' | 'precise' | 'deep';

@Component({
  selector: 'app-history-collection-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4"
           (click)="onBackdropClick($event)">
        <div class="bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col"
             (click)="$event.stopPropagation()">
          
          <!-- 頭部 -->
          <div class="p-5 border-b border-slate-700/50 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xl">
                  🔄
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">從歷史消息收集用戶</h2>
                  <p class="text-sm text-slate-400">收集監控期間的發言用戶</p>
                </div>
              </div>
              <button (click)="close()" 
                      class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容區域 -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            
            <!-- 群組信息 & 統計 -->
            @if (group()) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center text-2xl">
                    {{ group()!.name[0] }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-white truncate">{{ group()!.name }}</h3>
                    <p class="text-sm text-slate-400 truncate">{{ group()!.url || '私密群組' }}</p>
                  </div>
                </div>
                
                <!-- 數據統計 -->
                @if (isLoadingStats()) {
                  <div class="flex items-center justify-center py-4">
                    <span class="animate-spin text-xl mr-2">⏳</span>
                    <span class="text-slate-400">加載統計數據...</span>
                  </div>
                } @else if (stats()) {
                  <div class="grid grid-cols-3 gap-3">
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-cyan-400">{{ stats()!.totalMessages | number }}</div>
                      <div class="text-xs text-slate-500">監控消息</div>
                    </div>
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-emerald-400">{{ stats()!.uniqueSenders | number }}</div>
                      <div class="text-xs text-slate-500">唯一發言者</div>
                    </div>
                    <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                      <div class="text-xl font-bold text-purple-400">{{ stats()!.collectedUsers | number }}</div>
                      <div class="text-xs text-slate-500">已收集</div>
                    </div>
                  </div>
                  @if (stats()!.dateRange.first) {
                    <div class="mt-3 text-xs text-slate-500 text-center">
                      📅 消息範圍：{{ stats()!.dateRange.first | date:'yyyy-MM-dd' }} ~ {{ stats()!.dateRange.last | date:'yyyy-MM-dd' }}
                    </div>
                  }
                } @else {
                  <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                    <p class="text-sm text-amber-400">⚠️ 暫無監控數據</p>
                    <p class="text-xs text-slate-400 mt-1">請先開啟群組監控一段時間</p>
                  </div>
                }
              </div>
            }
            
            <!-- 無數據時禁用後續內容 -->
            @if (stats() && stats()!.totalMessages > 0) {
            
            <!-- 快速模板 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                ⚡ 快速模板
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button (click)="selectTemplate('quick')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-orange-500]="selectedTemplate() === 'quick'"
                        [class.bg-orange-500/20]="selectedTemplate() === 'quick'"
                        [class.border-slate-700]="selectedTemplate() !== 'quick'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'quick'">
                  <div class="text-2xl mb-1">⚡</div>
                  <p class="font-medium text-white text-sm">快速收集</p>
                  <p class="text-xs text-slate-400 mt-1">100人 · 7天內</p>
                </button>
                <button (click)="selectTemplate('precise')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-emerald-500]="selectedTemplate() === 'precise'"
                        [class.bg-emerald-500/20]="selectedTemplate() === 'precise'"
                        [class.border-slate-700]="selectedTemplate() !== 'precise'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'precise'">
                  <div class="text-2xl mb-1">🎯</div>
                  <p class="font-medium text-white text-sm">精準收集</p>
                  <p class="text-xs text-slate-400 mt-1">發言≥3次</p>
                </button>
                <button (click)="selectTemplate('deep')"
                        class="p-4 rounded-xl border transition-all text-center"
                        [class.border-blue-500]="selectedTemplate() === 'deep'"
                        [class.bg-blue-500/20]="selectedTemplate() === 'deep'"
                        [class.border-slate-700]="selectedTemplate() !== 'deep'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'deep'">
                  <div class="text-2xl mb-1">🔍</div>
                  <p class="font-medium text-white text-sm">深度收集</p>
                  <p class="text-xs text-slate-400 mt-1">全部歷史</p>
                </button>
              </div>
            </div>
            
            <!-- 收集數量 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                🔢 收集數量
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of limitOptions; track option.value) {
                  <button (click)="setLimit(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-orange-500]="config().limit === option.value"
                          [class.bg-orange-500/20]="config().limit === option.value"
                          [class.text-orange-400]="config().limit === option.value"
                          [class.border-slate-700]="config().limit !== option.value"
                          [class.bg-slate-800/50]="config().limit !== option.value"
                          [class.text-slate-400]="config().limit !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- 時間範圍 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                📅 時間範圍
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of timeRangeOptions; track option.value) {
                  <button (click)="setTimeRange(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-cyan-500]="config().timeRange === option.value"
                          [class.bg-cyan-500/20]="config().timeRange === option.value"
                          [class.text-cyan-400]="config().timeRange === option.value"
                          [class.border-slate-700]="config().timeRange !== option.value"
                          [class.bg-slate-800/50]="config().timeRange !== option.value"
                          [class.text-slate-400]="config().timeRange !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- 活躍度篩選 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                🔥 活躍度篩選（最少發言次數）
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of activityOptions; track option.value) {
                  <button (click)="setMinMessages(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-purple-500]="config().minMessages === option.value"
                          [class.bg-purple-500/20]="config().minMessages === option.value"
                          [class.text-purple-400]="config().minMessages === option.value"
                          [class.border-slate-700]="config().minMessages !== option.value"
                          [class.bg-slate-800/50]="config().minMessages !== option.value"
                          [class.text-slate-400]="config().minMessages !== option.value">
                    {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- 進階選項 -->
            <div class="border border-slate-700/50 rounded-xl overflow-hidden">
              <button (click)="showAdvanced.set(!showAdvanced())"
                      class="w-full p-4 bg-slate-800/30 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <span class="text-sm font-medium text-slate-300">⚙️ 進階選項</span>
                <svg class="w-4 h-4 text-slate-400 transition-transform"
                     [class.rotate-180]="showAdvanced()"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              @if (showAdvanced()) {
                <div class="p-4 space-y-3 border-t border-slate-700/50">
                  <div class="grid grid-cols-2 gap-3">
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.skipDuplicates"
                             (change)="toggleOption('skipDuplicates')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">去重</p>
                        <p class="text-xs text-slate-500">跳過已收集用戶</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.excludeBots"
                             (change)="toggleOption('excludeBots')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">排除機器人</p>
                        <p class="text-xs text-slate-500">過濾 Bot 帳號</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.requireUsername"
                             (change)="toggleOption('requireUsername')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">需有用戶名</p>
                        <p class="text-xs text-slate-500">僅收集有 &#64;username</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().options.autoSync"
                             (change)="toggleOption('autoSync')"
                             class="rounded bg-slate-700 border-slate-600 text-orange-500 focus:ring-orange-500">
                      <div>
                        <p class="text-sm text-white">自動同步</p>
                        <p class="text-xs text-slate-500">同步到資源中心</p>
                      </div>
                    </label>
                  </div>
                </div>
              }
            </div>
            
            }
            
            <!-- 進度顯示 -->
            @if (isCollecting()) {
              <div class="p-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm text-orange-400 flex items-center gap-2">
                    <span class="animate-spin">⏳</span> 正在收集用戶...
                  </span>
                  <span class="text-xs text-slate-400">
                    {{ collectionProgress().current }} / {{ collectionProgress().total }}
                  </span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300"
                       [style.width.%]="getProgressPercent()">
                  </div>
                </div>
                <div class="text-xs text-slate-500 mt-2">{{ collectionProgress().status }}</div>
              </div>
            }
            
            <!-- 結果顯示 -->
            @if (collectionResult()) {
              <div class="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm text-emerald-400 flex items-center gap-2">
                    <span>✅</span> 收集完成！
                  </span>
                  <span class="text-lg font-bold text-emerald-400">
                    {{ collectionResult()!.collected }} 人
                  </span>
                </div>
                
                <div class="grid grid-cols-4 gap-2 mb-3">
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-green-400">{{ collectionResult()!.newUsers }}</div>
                    <div class="text-xs text-slate-500">新增</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-blue-400">{{ collectionResult()!.updated }}</div>
                    <div class="text-xs text-slate-500">更新</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-slate-400">{{ collectionResult()!.skipped }}</div>
                    <div class="text-xs text-slate-500">跳過</div>
                  </div>
                  <div class="p-2 bg-slate-700/30 rounded-lg text-center">
                    <div class="text-sm font-bold text-orange-400">{{ collectionResult()!.quality.highActivity }}</div>
                    <div class="text-xs text-slate-500">高活躍</div>
                  </div>
                </div>
                
                <!-- 用戶質量分佈 -->
                <div class="text-xs text-slate-400">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-orange-400">🔥</span>
                    <span>高活躍 (≥10次)：{{ collectionResult()!.quality.highActivity }} 人</span>
                  </div>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-emerald-400">✓</span>
                    <span>中活躍 (3-9次)：{{ collectionResult()!.quality.mediumActivity }} 人</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-slate-500">○</span>
                    <span>低活躍 (&lt;3次)：{{ collectionResult()!.quality.lowActivity }} 人</span>
                  </div>
                </div>
              </div>
            }
            
          </div>
          
          <!-- 底部按鈕 -->
          <div class="p-5 border-t border-slate-700/50 bg-slate-800/30">
            <!-- 預估信息 -->
            @if (stats() && stats()!.totalMessages > 0 && !isCollecting() && !collectionResult()) {
              <div class="flex items-center justify-between mb-4 text-sm">
                <span class="text-slate-400">
                  💡 預計收集：
                  <span class="text-orange-400 font-medium">{{ estimatedCount() }}</span> 人
                </span>
              </div>
            }
            
            <div class="flex gap-3">
              <button (click)="close()"
                      class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors font-medium">
                {{ collectionResult() ? '關閉' : '取消' }}
              </button>
              
              @if (!collectionResult()) {
                <button (click)="startCollection()"
                        [disabled]="!canStart()"
                        class="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  @if (isCollecting()) {
                    <span class="animate-spin">⏳</span>
                    <span>收集中...</span>
                  } @else {
                    <span>🔄</span>
                    <span>開始收集</span>
                  }
                </button>
              } @else {
                <button (click)="viewCollectedUsers()"
                        class="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2">
                  <span>👥</span>
                  <span>查看已收集用戶</span>
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class HistoryCollectionDialogComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);

  // 輸入輸出
  isOpen = input<boolean>(false);
  group = input<HistoryCollectionGroupInfo | null>(null);
  
  closeDialog = output<void>();
  collectionComplete = output<CollectionResult>();
  viewUsersEvent = output<void>();

  // 狀態
  isLoadingStats = signal(false);
  
  // 🆕 監聽對話框打開狀態，自動加載統計
  private openEffect = effect(() => {
    if (this.isOpen() && this.group()) {
      this.loadStats();
    }
  });
  stats = signal<CollectionStats | null>(null);
  selectedTemplate = signal<QuickTemplate>('precise');
  showAdvanced = signal(false);
  isCollecting = signal(false);
  collectionProgress = signal({ current: 0, total: 0, status: '' });
  collectionResult = signal<CollectionResult | null>(null);

  // 配置
  config = signal<HistoryCollectionConfig>({
    limit: 200,
    timeRange: '30d',
    minMessages: 1,
    options: {
      skipDuplicates: true,
      excludeBots: true,
      requireUsername: false,
      excludeAdmins: false,
      autoSync: true
    }
  });

  // 選項列表
  limitOptions = [
    { value: 50, label: '50 人' },
    { value: 100, label: '100 人' },
    { value: 200, label: '200 人' },
    { value: 500, label: '500 人' },
    { value: -1, label: '全部' }
  ];

  timeRangeOptions = [
    { value: '7d' as const, label: '最近 7 天' },
    { value: '30d' as const, label: '最近 30 天' },
    { value: '90d' as const, label: '最近 90 天' },
    { value: 'all' as const, label: '全部歷史' }
  ];

  activityOptions = [
    { value: 1, label: '全部' },
    { value: 3, label: '≥ 3 次' },
    { value: 5, label: '≥ 5 次' },
    { value: 10, label: '≥ 10 次' }
  ];

  private listeners: (() => void)[] = [];

  ngOnInit() {
    this.setupListeners();
  }

  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }

  private setupListeners() {
    // 監聽統計數據返回
    const cleanup1 = this.ipcService.on('history-collection-stats', (data: {
      groupId: string;
      success: boolean;
      stats?: CollectionStats;
      error?: string;
    }) => {
      this.isLoadingStats.set(false);
      if (data.success && data.stats) {
        this.stats.set(data.stats);
      } else {
        this.stats.set(null);
      }
    });
    this.listeners.push(cleanup1);

    // 監聯收集進度
    const cleanup2 = this.ipcService.on('history-collection-progress', (data: {
      groupId: string;
      current: number;
      total: number;
      status: string;
    }) => {
      this.collectionProgress.set({
        current: data.current,
        total: data.total,
        status: data.status
      });
    });
    this.listeners.push(cleanup2);

    // 監聽收集結果
    const cleanup3 = this.ipcService.on('history-collection-result', (data: {
      groupId: string;
      success: boolean;
      result?: CollectionResult;
      error?: string;
    }) => {
      this.isCollecting.set(false);
      if (data.success && data.result) {
        this.collectionResult.set(data.result);
        this.collectionComplete.emit(data.result);
        this.toastService.success(`✅ 收集完成！共 ${data.result.collected} 位用戶`);
      } else {
        this.toastService.error(data.error || '收集失敗');
      }
    });
    this.listeners.push(cleanup3);
  }

  // 當對話框打開時加載統計
  loadStats() {
    const g = this.group();
    if (!g) return;

    this.isLoadingStats.set(true);
    this.stats.set(null);
    this.collectionResult.set(null);

    this.ipcService.send('get-history-collection-stats', {
      groupId: g.id,
      telegramId: g.telegramId
    });
  }

  // 選擇模板
  selectTemplate(template: QuickTemplate) {
    this.selectedTemplate.set(template);
    
    switch (template) {
      case 'quick':
        this.config.update(c => ({
          ...c,
          limit: 100,
          timeRange: '7d',
          minMessages: 1
        }));
        break;
      case 'precise':
        this.config.update(c => ({
          ...c,
          limit: 200,
          timeRange: '30d',
          minMessages: 3
        }));
        break;
      case 'deep':
        this.config.update(c => ({
          ...c,
          limit: -1,
          timeRange: 'all',
          minMessages: 1
        }));
        break;
    }
  }

  setLimit(value: number) {
    this.config.update(c => ({ ...c, limit: value }));
  }

  setTimeRange(value: '7d' | '30d' | '90d' | 'all' | 'custom') {
    this.config.update(c => ({ ...c, timeRange: value }));
  }

  setMinMessages(value: number) {
    this.config.update(c => ({ ...c, minMessages: value }));
  }

  toggleOption(key: keyof HistoryCollectionConfig['options']) {
    this.config.update(c => ({
      ...c,
      options: {
        ...c.options,
        [key]: !c.options[key]
      }
    }));
  }

  // 計算預估數量
  estimatedCount = computed(() => {
    const s = this.stats();
    const c = this.config();
    if (!s) return 0;

    let estimate = s.uniqueSenders;
    
    // 根據活躍度篩選調整
    if (c.minMessages >= 10) {
      estimate = Math.round(estimate * 0.15);
    } else if (c.minMessages >= 5) {
      estimate = Math.round(estimate * 0.3);
    } else if (c.minMessages >= 3) {
      estimate = Math.round(estimate * 0.5);
    }
    
    // 根據時間範圍調整
    if (c.timeRange === '7d') {
      estimate = Math.round(estimate * 0.3);
    } else if (c.timeRange === '30d') {
      estimate = Math.round(estimate * 0.6);
    } else if (c.timeRange === '90d') {
      estimate = Math.round(estimate * 0.85);
    }
    
    // 應用數量限制
    if (c.limit > 0) {
      estimate = Math.min(estimate, c.limit);
    }
    
    return Math.max(1, estimate);
  });

  canStart = computed(() => {
    const s = this.stats();
    return s && s.totalMessages > 0 && !this.isCollecting();
  });

  getProgressPercent(): number {
    const p = this.collectionProgress();
    if (p.total === 0) return 0;
    return Math.min(100, Math.round((p.current / p.total) * 100));
  }

  startCollection() {
    const g = this.group();
    if (!g || !this.canStart()) return;

    this.isCollecting.set(true);
    this.collectionResult.set(null);
    this.collectionProgress.set({ current: 0, total: 0, status: '正在初始化...' });

    const c = this.config();
    
    this.ipcService.send('collect-users-from-history-advanced', {
      groupId: g.id,
      telegramId: g.telegramId,
      config: {
        limit: c.limit,
        timeRange: c.timeRange,
        minMessages: c.minMessages,
        skipDuplicates: c.options.skipDuplicates,
        excludeBots: c.options.excludeBots,
        requireUsername: c.options.requireUsername,
        excludeAdmins: c.options.excludeAdmins,
        autoSync: c.options.autoSync
      }
    });
  }

  viewCollectedUsers() {
    this.viewUsersEvent.emit();
    this.close();
  }

  close() {
    this.closeDialog.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
