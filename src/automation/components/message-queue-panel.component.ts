/**
 * 消息隊列面板組件
 * 顯示發送隊列狀態、進度和消息列表
 */
import { Component, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronIpcService } from '../../electron-ipc.service';
import { I18nService } from '../../i18n.service';

interface QueueMessage {
  id: string;
  userId: string;
  username?: string;
  text: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'retrying';
  attempts: number;
  createdAt: string;
  scheduledAt?: string;
  error?: string;
}

interface QueueStatus {
  phone: string;
  username?: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  paused: boolean;
  messages: QueueMessage[];
  stats: {
    total: number;
    avgTime: number;
    successRate: number;
  };
}

@Component({
  selector: 'app-message-queue-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/50 border border-cyan-500/20 rounded-xl overflow-hidden">
      <!-- 標題欄 -->
      <div class="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-xl">📤</span>
          <h3 class="font-bold text-white">{{ t('messageQueue') }}</h3>
          @if(isLoading()) {
            <span class="animate-spin text-cyan-400">⟳</span>
          }
        </div>
        <div class="flex items-center gap-2">
          <button (click)="refreshStatus()" 
                  class="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-3 py-1.5 rounded-lg transition-colors">
            🔄 {{ t('refresh') }}
          </button>
        </div>
      </div>

      <!-- 總體統計 -->
      <div class="p-4 border-b border-slate-700/50">
        <div class="grid grid-cols-4 gap-4">
          <div class="text-center p-3 bg-slate-800/50 rounded-lg">
            <p class="text-2xl font-bold text-cyan-400">{{ totalPending() }}</p>
            <p class="text-xs text-slate-400">待發送</p>
          </div>
          <div class="text-center p-3 bg-slate-800/50 rounded-lg">
            <p class="text-2xl font-bold text-yellow-400">{{ totalProcessing() }}</p>
            <p class="text-xs text-slate-400">發送中</p>
          </div>
          <div class="text-center p-3 bg-slate-800/50 rounded-lg">
            <p class="text-2xl font-bold text-green-400">{{ totalCompleted() }}</p>
            <p class="text-xs text-slate-400">已發送</p>
          </div>
          <div class="text-center p-3 bg-slate-800/50 rounded-lg">
            <p class="text-2xl font-bold text-red-400">{{ totalFailed() }}</p>
            <p class="text-xs text-slate-400">失敗</p>
          </div>
        </div>
      </div>

      <!-- 帳號隊列列表 -->
      <div class="divide-y divide-slate-700/50">
        @for(queue of queueStatuses(); track queue.phone) {
          <div class="p-4">
            <!-- 帳號信息 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {{ (queue.username || queue.phone)[0].toUpperCase() }}
                </div>
                <div>
                  <p class="font-medium text-white">{{ queue.username || queue.phone }}</p>
                  <p class="text-xs text-slate-500">{{ queue.phone }}</p>
                </div>
                @if(queue.paused) {
                  <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">已暫停</span>
                }
              </div>
              <div class="flex items-center gap-2">
                @if(queue.paused) {
                  <button (click)="resumeQueue(queue.phone)" 
                          class="text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-1.5 rounded-lg transition-colors">
                    ▶ 恢復
                  </button>
                } @else {
                  <button (click)="pauseQueue(queue.phone)" 
                          class="text-xs bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg transition-colors">
                    ⏸ 暫停
                  </button>
                }
                <button (click)="clearQueue(queue.phone)" 
                        class="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-lg transition-colors">
                  🗑 清空
                </button>
              </div>
            </div>

            <!-- 進度條 -->
            <div class="mb-3">
              <div class="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>進度: {{ queue.stats.total > 0 ? Math.round((queue.completed / queue.stats.total) * 100) : 0 }}%</span>
                <span>成功率: {{ queue.stats.successRate.toFixed(1) }}%</span>
              </div>
              <div class="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-500"
                     [style.width.%]="queue.stats.total > 0 ? (queue.completed / queue.stats.total) * 100 : 0">
                </div>
              </div>
            </div>

            <!-- 隊列統計 -->
            <div class="flex items-center gap-4 text-xs">
              <span class="text-slate-400">待發送: <span class="text-cyan-400 font-bold">{{ queue.pending }}</span></span>
              <span class="text-slate-400">發送中: <span class="text-yellow-400 font-bold">{{ queue.processing }}</span></span>
              <span class="text-slate-400">已完成: <span class="text-green-400 font-bold">{{ queue.completed }}</span></span>
              <span class="text-slate-400">失敗: <span class="text-red-400 font-bold">{{ queue.failed }}</span></span>
              <span class="text-slate-400">平均耗時: <span class="text-white">{{ queue.stats.avgTime.toFixed(1) }}s</span></span>
            </div>

            <!-- 消息列表（可展開） -->
            @if(queue.messages && queue.messages.length > 0) {
              <div class="mt-3">
                <button (click)="toggleMessages(queue.phone)" 
                        class="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                  @if(expandedQueues().has(queue.phone)) {
                    <span>▼</span>
                  } @else {
                    <span>▶</span>
                  }
                  查看消息 ({{ queue.messages.length }})
                </button>
                
                @if(expandedQueues().has(queue.phone)) {
                  <div class="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    @for(msg of queue.messages.slice(0, 10); track msg.id) {
                      <div class="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg text-xs">
                        <div class="flex items-center gap-2 min-w-0 flex-1">
                          <span [class]="getStatusColor(msg.status)">{{ getStatusIcon(msg.status) }}</span>
                          <span class="text-slate-300 truncate">{{ msg.username || msg.userId }}</span>
                          <span class="text-slate-500 truncate max-w-[200px]">{{ msg.text | slice:0:50 }}...</span>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          @if(msg.attempts > 1) {
                            <span class="text-orange-400">重試 {{ msg.attempts }}</span>
                          }
                          @if(msg.status === 'failed' && msg.error) {
                            <span class="text-red-400" [title]="msg.error">❌</span>
                          }
                          @if(msg.status === 'pending' || msg.status === 'retrying') {
                            <button (click)="retryMessage(queue.phone, msg.id)"
                                    class="text-cyan-400 hover:text-cyan-300">🔄</button>
                          }
                        </div>
                      </div>
                    }
                    @if(queue.messages.length > 10) {
                      <p class="text-center text-xs text-slate-500">還有 {{ queue.messages.length - 10 }} 條消息...</p>
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="p-8 text-center text-slate-500">
            <div class="text-4xl mb-2">📭</div>
            <p>暫無發送隊列</p>
            <p class="text-xs mt-1">觸發關鍵詞後，消息將自動加入隊列</p>
          </div>
        }
      </div>
    </div>
  `
})
export class MessageQueuePanelComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private i18n = inject(I18nService);
  
  Math = Math;
  
  // 狀態
  queueStatuses = signal<QueueStatus[]>([]);
  isLoading = signal(false);
  expandedQueues = signal<Set<string>>(new Set());
  
  // 計算屬性
  totalPending = computed(() => this.queueStatuses().reduce((sum, q) => sum + q.pending, 0));
  totalProcessing = computed(() => this.queueStatuses().reduce((sum, q) => sum + q.processing, 0));
  totalCompleted = computed(() => this.queueStatuses().reduce((sum, q) => sum + q.completed, 0));
  totalFailed = computed(() => this.queueStatuses().reduce((sum, q) => sum + q.failed, 0));
  
  // 刷新定時器
  private refreshInterval: any;
  
  t(key: string): string {
    return this.i18n.t(key);
  }
  
  ngOnInit() {
    // 監聽隊列狀態更新
    this.ipcService.on('queue-status', (status: any) => {
      this.updateQueueStatus(status);
    });
    
    // 初始加載
    this.refreshStatus();
    
    // 定期刷新（每5秒）
    this.refreshInterval = setInterval(() => {
      this.refreshStatus();
    }, 5000);
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  refreshStatus() {
    this.isLoading.set(true);
    this.ipcService.send('get-queue-status', {});
    setTimeout(() => this.isLoading.set(false), 1000);
  }
  
  updateQueueStatus(status: any) {
    if (Array.isArray(status)) {
      // 多個帳號的狀態
      this.queueStatuses.set(status.map(s => this.normalizeStatus(s)));
    } else if (status && status.phone) {
      // 單個帳號的狀態
      const normalized = this.normalizeStatus(status);
      this.queueStatuses.update(queues => {
        const idx = queues.findIndex(q => q.phone === normalized.phone);
        if (idx >= 0) {
          queues[idx] = normalized;
          return [...queues];
        } else {
          return [...queues, normalized];
        }
      });
    }
  }
  
  normalizeStatus(s: any): QueueStatus {
    return {
      phone: s.phone || '',
      username: s.username || '',
      pending: s.pending || 0,
      processing: s.processing || 0,
      completed: s.completed || 0,
      failed: s.failed || 0,
      paused: s.paused || false,
      messages: (s.messages || []).map((m: any) => ({
        id: m.id || '',
        userId: m.userId || m.user_id || '',
        username: m.username || '',
        text: m.text || '',
        status: m.status || 'pending',
        attempts: m.attempts || 1,
        createdAt: m.createdAt || m.created_at || '',
        scheduledAt: m.scheduledAt || m.scheduled_at || '',
        error: m.error || ''
      })),
      stats: {
        total: s.stats?.total || s.total || 0,
        avgTime: s.stats?.avgTime || s.stats?.avg_time || 0,
        successRate: s.stats?.successRate || (s.completed && s.stats?.total ? (s.completed / s.stats.total) * 100 : 0)
      }
    };
  }
  
  pauseQueue(phone: string) {
    this.ipcService.send('pause-queue', { phone });
  }
  
  resumeQueue(phone: string) {
    this.ipcService.send('resume-queue', { phone });
  }
  
  clearQueue(phone: string) {
    if (confirm('確定要清空此帳號的發送隊列嗎？')) {
      this.ipcService.send('clear-queue', { phone });
    }
  }
  
  retryMessage(phone: string, messageId: string) {
    this.ipcService.send('retry-message', { phone, messageId });
  }
  
  toggleMessages(phone: string) {
    this.expandedQueues.update(set => {
      const newSet = new Set(set);
      if (newSet.has(phone)) {
        newSet.delete(phone);
      } else {
        newSet.add(phone);
      }
      return newSet;
    });
  }
  
  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return 'text-cyan-400';
      case 'processing': return 'text-yellow-400';
      case 'sent': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'retrying': return 'text-orange-400';
      default: return 'text-slate-400';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '🔄';
      case 'sent': return '✅';
      case 'failed': return '❌';
      case 'retrying': return '🔁';
      default: return '❓';
    }
  }
}
