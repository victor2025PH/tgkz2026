/**
 * 發送隊列進度組件 - Phase 1 優化
 * Queue Progress with Real-time Updates
 * 
 * 功能:
 * 1. 實時進度條顯示
 * 2. 預計剩餘時間
 * 3. 帳號維度統計
 * 4. 暫停/恢復控制
 * 5. 錯誤重試管理
 */

import { Component, signal, computed, input, output, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

// 帳號隊列狀態
export interface AccountQueueStatus {
  phone: string;
  displayName?: string;
  status: 'active' | 'paused' | 'rate_limited' | 'error' | 'idle';
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  // 速率信息
  sendRate: number;  // 每分鐘發送數
  avgResponseTime: number;  // 平均響應時間ms
  // 限制信息
  dailyLimit: number;
  dailyUsed: number;
  // 時間預估
  estimatedMinutes?: number;
  // 最近錯誤
  lastError?: string;
  lastErrorTime?: Date;
}

// 整體隊列統計
export interface QueueStats {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  totalRetrying: number;
  activeAccounts: number;
  // 進度
  progressPercent: number;
  // 時間
  estimatedMinutes: number;
  startTime?: Date;
  // 效率
  avgSendRate: number;
  successRate: number;
}

@Component({
  selector: 'app-queue-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="queue-progress bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <!-- 整體進度頭部 -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span class="text-xl">📬</span>
              發送隊列
            </h3>
            
            <!-- 狀態指示 -->
            @if (isActive()) {
              <span class="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                <span class="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                發送中
              </span>
            } @else if (isPaused()) {
              <span class="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                <span class="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                已暫停
              </span>
            } @else {
              <span class="flex items-center gap-1.5 px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded-full">
                <span class="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                空閒
              </span>
            }
          </div>
          
          <div class="flex items-center gap-2">
            <!-- 控制按鈕 -->
            @if (isActive()) {
              <button (click)="pauseQueue.emit()"
                      class="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all"
                      title="暫停發送">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              </button>
            } @else if (queueStats().totalPending > 0) {
              <button (click)="resumeQueue.emit()"
                      class="p-1.5 text-green-400 hover:bg-green-500/20 rounded-lg transition-all"
                      title="繼續發送">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
            }
            
            @if (queueStats().totalFailed > 0) {
              <button (click)="retryFailed.emit()"
                      class="p-1.5 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-all"
                      title="重試失敗項">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
            }
            
            <button (click)="refreshStatus.emit()"
                    class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                    title="刷新狀態">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 進度條 -->
        <div class="relative h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
          <!-- 完成部分 -->
          <div class="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
               [style.width.%]="completedPercent()"></div>
          <!-- 處理中部分 -->
          <div class="absolute top-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
               [style.left.%]="completedPercent()"
               [style.width.%]="processingPercent()">
            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
          <!-- 重試部分 -->
          <div class="absolute top-0 h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
               [style.left.%]="completedPercent() + processingPercent()"
               [style.width.%]="retryingPercent()"></div>
        </div>
        
        <!-- 統計數據 -->
        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-4">
            <span class="text-slate-400">
              進度: <span class="text-white font-medium">{{ queueStats().progressPercent }}%</span>
            </span>
            <span class="text-green-400">
              完成: {{ queueStats().totalCompleted }}
            </span>
            <span class="text-cyan-400">
              發送中: {{ queueStats().totalProcessing }}
            </span>
            <span class="text-yellow-400">
              待發送: {{ queueStats().totalPending }}
            </span>
            @if (queueStats().totalRetrying > 0) {
              <span class="text-orange-400">
                重試中: {{ queueStats().totalRetrying }}
              </span>
            }
            @if (queueStats().totalFailed > 0) {
              <span class="text-red-400">
                失敗: {{ queueStats().totalFailed }}
              </span>
            }
          </div>
          
          <div class="flex items-center gap-3 text-slate-400">
            @if (queueStats().estimatedMinutes > 0) {
              <span>
                預計剩餘: <span class="text-white">{{ formatTime(queueStats().estimatedMinutes) }}</span>
              </span>
            }
            @if (queueStats().avgSendRate > 0) {
              <span>
                速率: <span class="text-white">{{ queueStats().avgSendRate.toFixed(1) }}</span> 條/分
              </span>
            }
            @if (queueStats().successRate > 0) {
              <span>
                成功率: 
                <span [class.text-green-400]="queueStats().successRate >= 90"
                      [class.text-yellow-400]="queueStats().successRate >= 70 && queueStats().successRate < 90"
                      [class.text-red-400]="queueStats().successRate < 70">
                  {{ queueStats().successRate.toFixed(1) }}%
                </span>
              </span>
            }
          </div>
        </div>
      </div>
      
      <!-- 帳號詳情（可展開） -->
      @if (showDetails()) {
        <div class="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
          @for (account of accountStatuses(); track account.phone) {
            <div class="bg-slate-700/30 rounded-lg p-3 border border-slate-600/30">
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <!-- 狀態指示器 -->
                  <div class="w-2 h-2 rounded-full"
                       [class.bg-green-500]="account.status === 'active'"
                       [class.animate-pulse]="account.status === 'active'"
                       [class.bg-yellow-500]="account.status === 'paused' || account.status === 'rate_limited'"
                       [class.bg-red-500]="account.status === 'error'"
                       [class.bg-slate-500]="account.status === 'idle'">
                  </div>
                  <span class="font-medium text-white text-sm">{{ account.displayName || account.phone }}</span>
                  
                  <!-- 狀態標籤 -->
                  @switch (account.status) {
                    @case ('active') {
                      <span class="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">發送中</span>
                    }
                    @case ('paused') {
                      <span class="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">已暫停</span>
                    }
                    @case ('rate_limited') {
                      <span class="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded">受限</span>
                    }
                    @case ('error') {
                      <span class="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">錯誤</span>
                    }
                  }
                </div>
                
                <!-- 配額 -->
                <div class="text-xs text-slate-400">
                  今日: {{ account.dailyUsed }}/{{ account.dailyLimit }}
                  <span class="ml-2" 
                        [class.text-green-400]="getQuotaPercent(account) < 80"
                        [class.text-yellow-400]="getQuotaPercent(account) >= 80 && getQuotaPercent(account) < 100"
                        [class.text-red-400]="getQuotaPercent(account) >= 100">
                    ({{ getQuotaPercent(account) }}%)
                  </span>
                </div>
              </div>
              
              <!-- 帳號進度條 -->
              <div class="h-1.5 bg-slate-600 rounded-full overflow-hidden mb-2">
                <div class="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                     [style.width.%]="getAccountProgress(account)"></div>
              </div>
              
              <!-- 帳號統計 -->
              <div class="flex items-center justify-between text-xs">
                <div class="flex items-center gap-3">
                  <span class="text-slate-400">隊列: <span class="text-white">{{ account.pending }}</span></span>
                  <span class="text-green-400">完成: {{ account.completed }}</span>
                  @if (account.retrying > 0) {
                    <span class="text-orange-400">重試: {{ account.retrying }}</span>
                  }
                  @if (account.failed > 0) {
                    <span class="text-red-400">失敗: {{ account.failed }}</span>
                  }
                </div>
                
                <div class="flex items-center gap-2 text-slate-400">
                  @if (account.sendRate > 0) {
                    <span>{{ account.sendRate.toFixed(1) }} 條/分</span>
                  }
                  @if (account.estimatedMinutes && account.estimatedMinutes > 0) {
                    <span>剩餘 {{ formatTime(account.estimatedMinutes) }}</span>
                  }
                </div>
              </div>
              
              <!-- 錯誤信息 -->
              @if (account.lastError) {
                <div class="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
                  ⚠️ {{ account.lastError }}
                  @if (account.lastErrorTime) {
                    <span class="text-red-400/60 ml-2">{{ formatLastError(account.lastErrorTime) }}</span>
                  }
                </div>
              }
              
              <!-- 受限提示 -->
              @if (account.status === 'rate_limited') {
                <div class="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-300">
                  ⏳ 帳號已達發送限制，建議休息後繼續
                </div>
              }
            </div>
          } @empty {
            <div class="text-center py-6 text-slate-400">
              <div class="text-2xl mb-2">📭</div>
              <p>暫無活躍帳號</p>
            </div>
          }
        </div>
      }
      
      <!-- 展開/收起按鈕 -->
      @if (accountStatuses().length > 0) {
        <button (click)="showDetails.set(!showDetails())"
                class="w-full py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 
                       border-t border-slate-700/50 transition-all flex items-center justify-center gap-1">
          @if (showDetails()) {
            <span>收起詳情</span>
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          } @else {
            <span>查看 {{ accountStatuses().length }} 個帳號詳情</span>
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.2);
      border-radius: 3px;
    }
  `]
})
export class QueueProgressComponent implements OnInit, OnDestroy {
  // 輸入
  accountStatuses = input<AccountQueueStatus[]>([]);
  
  // 輸出事件
  pauseQueue = output<void>();
  resumeQueue = output<void>();
  retryFailed = output<void>();
  refreshStatus = output<void>();
  
  // 狀態
  showDetails = signal(false);
  
  // 計算屬性
  queueStats = computed<QueueStats>(() => {
    const accounts = this.accountStatuses();
    let totalPending = 0;
    let totalProcessing = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalRetrying = 0;
    let totalSendRate = 0;
    let activeCount = 0;
    
    accounts.forEach(a => {
      totalPending += a.pending;
      totalProcessing += a.processing;
      totalCompleted += a.completed;
      totalFailed += a.failed;
      totalRetrying += a.retrying;
      if (a.status === 'active') {
        totalSendRate += a.sendRate;
        activeCount++;
      }
    });
    
    const total = totalPending + totalProcessing + totalCompleted + totalFailed;
    const progressPercent = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;
    const successRate = (totalCompleted + totalFailed) > 0 
      ? (totalCompleted / (totalCompleted + totalFailed)) * 100 
      : 100;
    
    // 預估剩餘時間
    const remaining = totalPending + totalProcessing + totalRetrying;
    const estimatedMinutes = totalSendRate > 0 ? Math.ceil(remaining / totalSendRate) : 0;
    
    return {
      totalPending,
      totalProcessing,
      totalCompleted,
      totalFailed,
      totalRetrying,
      activeAccounts: activeCount,
      progressPercent,
      estimatedMinutes,
      avgSendRate: totalSendRate,
      successRate
    };
  });
  
  isActive = computed(() => this.queueStats().totalProcessing > 0 || 
    this.accountStatuses().some(a => a.status === 'active'));
  
  isPaused = computed(() => this.accountStatuses().some(a => a.status === 'paused'));
  
  // 進度百分比計算
  completedPercent = computed(() => {
    const stats = this.queueStats();
    const total = stats.totalPending + stats.totalProcessing + stats.totalCompleted + 
                  stats.totalFailed + stats.totalRetrying;
    return total > 0 ? (stats.totalCompleted / total) * 100 : 0;
  });
  
  processingPercent = computed(() => {
    const stats = this.queueStats();
    const total = stats.totalPending + stats.totalProcessing + stats.totalCompleted + 
                  stats.totalFailed + stats.totalRetrying;
    return total > 0 ? (stats.totalProcessing / total) * 100 : 0;
  });
  
  retryingPercent = computed(() => {
    const stats = this.queueStats();
    const total = stats.totalPending + stats.totalProcessing + stats.totalCompleted + 
                  stats.totalFailed + stats.totalRetrying;
    return total > 0 ? (stats.totalRetrying / total) * 100 : 0;
  });
  
  ngOnInit() {}
  ngOnDestroy() {}
  
  // 格式化時間
  formatTime(minutes: number): string {
    if (minutes < 1) return '< 1 分鐘';
    if (minutes < 60) return `${minutes} 分鐘`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} 小時 ${mins} 分鐘` : `${hours} 小時`;
  }
  
  // 格式化最後錯誤時間
  formatLastError(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    return `${Math.floor(minutes / 60)}小時前`;
  }
  
  // 獲取配額百分比
  getQuotaPercent(account: AccountQueueStatus): number {
    if (account.dailyLimit <= 0) return 0;
    return Math.round((account.dailyUsed / account.dailyLimit) * 100);
  }
  
  // 獲取帳號進度
  getAccountProgress(account: AccountQueueStatus): number {
    const total = account.pending + account.processing + account.completed + account.failed;
    return total > 0 ? (account.completed / total) * 100 : 0;
  }
}
