/**
 * 消息隊列儀表盤組件
 * Message Queue Dashboard Component
 * 
 * 功能:
 * 1. 隊列狀態總覽
 * 2. 待發送消息列表
 * 3. 發送進度追蹤
 * 4. 失敗重試管理
 */

import { Component, input, output, signal, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 消息狀態
export type MessageStatus = 'pending' | 'sending' | 'sent' | 'failed' | 'cancelled' | 'retrying';

// 隊列消息
export interface QueuedMessage {
  id: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  content: string;
  templateId?: string;
  templateName?: string;
  status: MessageStatus;
  priority: number; // 1-5, 1最高
  scheduledAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  failReason?: string;
  retryCount: number;
  maxRetries: number;
  accountPhone?: string;
  createdAt: Date;
  source: 'manual' | 'automation' | 'batch' | 'follow_up';
}

// 隊列統計
export interface QueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
  retrying: number;
  totalToday: number;
  successRate: number;
  avgSendTime: number; // 秒
}

@Component({
  selector: 'app-queue-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="queue-dashboard bg-slate-900/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      <!-- 標題欄 -->
      <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <span class="text-xl">📤</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">發送隊列</h3>
            <p class="text-xs text-slate-400">
              @if (isProcessing()) {
                <span class="text-emerald-400">● 處理中</span>
              } @else {
                <span class="text-slate-500">○ 暫停</span>
              }
              · {{ stats().pending }} 待發送
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- 控制按鈕 -->
          @if (isProcessing()) {
            <button (click)="pauseQueue.emit()"
                    class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition-colors">
              ⏸️ 暫停
            </button>
          } @else {
            <button (click)="resumeQueue.emit()"
                    class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors">
              ▶️ 繼續
            </button>
          }
          <button (click)="showSettings.set(!showSettings())"
                  class="p-1.5 text-slate-400 hover:text-white transition-colors">
            ⚙️
          </button>
        </div>
      </div>
      
      <!-- 統計卡片 -->
      <div class="grid grid-cols-5 gap-3 p-4 border-b border-slate-700/50">
        <div class="text-center p-3 bg-slate-800/50 rounded-lg">
          <div class="text-2xl font-bold text-amber-400">{{ stats().pending }}</div>
          <div class="text-xs text-slate-400">待發送</div>
        </div>
        <div class="text-center p-3 bg-slate-800/50 rounded-lg">
          <div class="text-2xl font-bold text-cyan-400">{{ stats().sending }}</div>
          <div class="text-xs text-slate-400">發送中</div>
        </div>
        <div class="text-center p-3 bg-slate-800/50 rounded-lg">
          <div class="text-2xl font-bold text-emerald-400">{{ stats().sent }}</div>
          <div class="text-xs text-slate-400">已發送</div>
        </div>
        <div class="text-center p-3 bg-slate-800/50 rounded-lg">
          <div class="text-2xl font-bold text-red-400">{{ stats().failed }}</div>
          <div class="text-xs text-slate-400">失敗</div>
        </div>
        <div class="text-center p-3 bg-slate-800/50 rounded-lg">
          <div class="text-2xl font-bold text-purple-400">{{ stats().successRate }}%</div>
          <div class="text-xs text-slate-400">成功率</div>
        </div>
      </div>
      
      <!-- 進度條 -->
      @if (stats().totalToday > 0) {
        <div class="px-4 py-3 border-b border-slate-700/50">
          <div class="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>今日進度</span>
            <span>{{ stats().sent }} / {{ stats().totalToday }}</span>
          </div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                 [style.width.%]="(stats().sent / stats().totalToday) * 100"></div>
          </div>
        </div>
      }
      
      <!-- 篩選標籤 -->
      <div class="px-4 py-2 border-b border-slate-700/50 flex items-center gap-2">
        @for (tab of statusTabs; track tab.value) {
          <button (click)="activeTab.set(tab.value)"
                  class="px-3 py-1 rounded-lg text-xs transition-colors"
                  [class.bg-cyan-500]="activeTab() === tab.value"
                  [class.text-white]="activeTab() === tab.value"
                  [class.bg-slate-700]="activeTab() !== tab.value"
                  [class.text-slate-400]="activeTab() !== tab.value">
            {{ tab.label }}
            @if (getCountByStatus(tab.value) > 0) {
              <span class="ml-1 px-1 py-0.5 rounded text-xs"
                    [class.bg-white/20]="activeTab() === tab.value"
                    [class.bg-slate-600]="activeTab() !== tab.value">
                {{ getCountByStatus(tab.value) }}
              </span>
            }
          </button>
        }
      </div>
      
      <!-- 消息列表 -->
      <div class="max-h-96 overflow-y-auto">
        @if (filteredMessages().length === 0) {
          <div class="p-8 text-center text-slate-500">
            <div class="text-3xl mb-2">📭</div>
            <p>沒有{{ getTabLabel(activeTab()) }}的消息</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-700/50">
            @for (msg of filteredMessages(); track msg.id) {
              <div class="p-3 hover:bg-slate-800/30 transition-colors flex items-center gap-3">
                <!-- 狀態圖標 -->
                <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                     [class.bg-amber-500/20]="msg.status === 'pending'"
                     [class.bg-cyan-500/20]="msg.status === 'sending'"
                     [class.bg-emerald-500/20]="msg.status === 'sent'"
                     [class.bg-red-500/20]="msg.status === 'failed'"
                     [class.bg-purple-500/20]="msg.status === 'retrying'"
                     [class.animate-pulse]="msg.status === 'sending' || msg.status === 'retrying'">
                  @switch (msg.status) {
                    @case ('pending') { <span>⏳</span> }
                    @case ('sending') { <span>📤</span> }
                    @case ('sent') { <span>✅</span> }
                    @case ('failed') { <span>❌</span> }
                    @case ('retrying') { <span>🔄</span> }
                    @default { <span>📨</span> }
                  }
                </div>
                
                <!-- 接收者信息 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="text-sm font-medium text-white truncate">{{ msg.recipientName }}</span>
                    @if (msg.priority === 1) {
                      <span class="px-1 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">緊急</span>
                    }
                    @if (msg.templateName) {
                      <span class="px-1 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">{{ msg.templateName }}</span>
                    }
                  </div>
                  <p class="text-xs text-slate-400 truncate">{{ msg.content }}</p>
                  @if (msg.status === 'failed' && msg.failReason) {
                    <p class="text-xs text-red-400 mt-0.5">❌ {{ msg.failReason }}</p>
                  }
                </div>
                
                <!-- 時間和操作 -->
                <div class="text-right shrink-0">
                  <div class="text-xs text-slate-500 mb-1">
                    @if (msg.status === 'sent' && msg.sentAt) {
                      {{ formatTime(msg.sentAt) }}
                    } @else if (msg.scheduledAt) {
                      {{ formatTime(msg.scheduledAt) }}
                    } @else {
                      {{ formatTime(msg.createdAt) }}
                    }
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex items-center gap-1">
                    @if (msg.status === 'failed') {
                      <button (click)="retryMessage.emit(msg.id)"
                              class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30">
                        重試
                      </button>
                    }
                    @if (msg.status === 'pending' || msg.status === 'failed') {
                      <button (click)="cancelMessage.emit(msg.id)"
                              class="px-2 py-0.5 bg-slate-600 text-slate-400 rounded text-xs hover:bg-slate-500">
                        取消
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
      
      <!-- 底部操作 -->
      @if (stats().failed > 0) {
        <div class="p-3 border-t border-slate-700/50 bg-red-500/5 flex items-center justify-between">
          <span class="text-sm text-red-400">{{ stats().failed }} 條消息發送失敗</span>
          <div class="flex gap-2">
            <button (click)="retryAllFailed.emit()"
                    class="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-400 transition-colors">
              全部重試
            </button>
            <button (click)="clearFailed.emit()"
                    class="px-3 py-1.5 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 transition-colors">
              清除失敗
            </button>
          </div>
        </div>
      }
      
      <!-- 設置面板 -->
      @if (showSettings()) {
        <div class="p-4 border-t border-slate-700/50 bg-slate-800/50 space-y-3">
          <h4 class="text-sm font-medium text-white">發送設置</h4>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-400 block mb-1">發送間隔（秒）</label>
              <input type="number" [(ngModel)]="sendInterval" min="1" max="300"
                     class="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white">
            </div>
            <div>
              <label class="text-xs text-slate-400 block mb-1">最大重試次數</label>
              <input type="number" [(ngModel)]="maxRetries" min="0" max="10"
                     class="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white">
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" [(ngModel)]="randomDelay" class="rounded">
              隨機延遲（防止封號）
            </label>
            <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
              <input type="checkbox" [(ngModel)]="autoRetry" class="rounded">
              自動重試失敗消息
            </label>
          </div>
          
          <button (click)="saveSettings()"
                  class="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-400 transition-colors">
            保存設置
          </button>
        </div>
      }
    </div>
  `
})
export class QueueDashboardComponent {
  // 輸入
  messages = input<QueuedMessage[]>([]);
  stats = input<QueueStats>({
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
    totalToday: 0,
    successRate: 100,
    avgSendTime: 0
  });
  isProcessing = input(false);
  
  // 輸出
  pauseQueue = output<void>();
  resumeQueue = output<void>();
  retryMessage = output<string>();
  cancelMessage = output<string>();
  retryAllFailed = output<void>();
  clearFailed = output<void>();
  settingsChange = output<{ sendInterval: number; maxRetries: number; randomDelay: boolean; autoRetry: boolean }>();
  
  // 狀態
  activeTab = signal<MessageStatus | 'all'>('all');
  showSettings = signal(false);
  
  // 設置
  sendInterval = 5;
  maxRetries = 3;
  randomDelay = true;
  autoRetry = true;
  
  // 標籤配置
  statusTabs: { value: MessageStatus | 'all'; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待發送' },
    { value: 'sending', label: '發送中' },
    { value: 'sent', label: '已發送' },
    { value: 'failed', label: '失敗' }
  ];
  
  // 過濾後的消息
  filteredMessages = computed(() => {
    const tab = this.activeTab();
    if (tab === 'all') return this.messages();
    return this.messages().filter(m => m.status === tab);
  });
  
  getCountByStatus(status: MessageStatus | 'all'): number {
    if (status === 'all') return this.messages().length;
    return this.messages().filter(m => m.status === status).length;
  }
  
  getTabLabel(tab: MessageStatus | 'all'): string {
    return this.statusTabs.find(t => t.value === tab)?.label || '';
  }
  
  formatTime(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  
  saveSettings() {
    this.settingsChange.emit({
      sendInterval: this.sendInterval,
      maxRetries: this.maxRetries,
      randomDelay: this.randomDelay,
      autoRetry: this.autoRetry
    });
    this.showSettings.set(false);
  }
}
