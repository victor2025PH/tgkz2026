/**
 * 🔧 P13-5: 消息重試策略展示組件
 * 
 * 展示後端 P12-3 的重試策略配置：
 * - 重試時間表（指數退避可視化）
 * - 錯誤分類說明
 * - 策略參數
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessApiService, RetryInfo, RetryScheduleItem } from '../services/business-api.service';

@Component({
  selector: 'app-retry-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- 策略概覽 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>🔄</span> 消息重試策略
          </h3>
          <button (click)="loadRetryInfo()"
                  [disabled]="isLoading()"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg 
                         transition-all disabled:opacity-50">
            {{ isLoading() ? '加載中...' : '🔄 刷新' }}
          </button>
        </div>

        @if (retryInfo(); as info) {
          <!-- 策略參數 -->
          <div class="grid grid-cols-3 gap-3 mb-6">
            <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-blue-400">{{ info.max_retries }}</div>
              <div class="text-xs text-blue-400/70 mt-1">最大重試次數</div>
            </div>
            <div class="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-cyan-400">{{ info.base_delay }}s</div>
              <div class="text-xs text-cyan-400/70 mt-1">基礎延遲</div>
            </div>
            <div class="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-purple-400">{{ formatDelay(info.max_delay) }}</div>
              <div class="text-xs text-purple-400/70 mt-1">最大延遲</div>
            </div>
          </div>

          <!-- 重試時間表可視化 -->
          <div class="mb-6">
            <h4 class="text-sm font-medium text-white mb-3">📈 指數退避時間表</h4>
            <div class="space-y-2">
              @for (item of info.schedule; track item.attempt) {
                <div class="flex items-center gap-3">
                  <span class="w-16 text-xs text-slate-400 text-right">第 {{ item.attempt }} 次</span>
                  <div class="flex-1 h-6 bg-slate-700/50 rounded-full overflow-hidden relative">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all flex items-center justify-end pr-2"
                         [style.width.%]="getBarWidth(item.delay_seconds, info.max_delay)">
                      <span class="text-xs text-white font-medium whitespace-nowrap">{{ item.delay_human }}</span>
                    </div>
                  </div>
                  <span class="w-14 text-xs text-slate-500 text-right">{{ item.delay_seconds.toFixed(0) }}s</span>
                </div>
              }
            </div>
          </div>

          <!-- 錯誤分類 -->
          <div>
            <h4 class="text-sm font-medium text-white mb-3">📋 錯誤分類策略</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <!-- 暫時性 → 重試 -->
              @if (info.error_categories['transient']) {
                <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <div class="text-sm font-medium text-blue-400 mb-2 flex items-center gap-1">
                    <span>🔄</span> 暫時性（會重試）
                  </div>
                  <div class="space-y-1">
                    @for (err of info.error_categories['transient'].slice(0, 6); track err) {
                      <span class="inline-block text-xs px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded mr-1 mb-1">{{ err }}</span>
                    }
                  </div>
                </div>
              }

              <!-- 永久性 → 不重試 -->
              @if (info.error_categories['permanent']) {
                <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div class="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                    <span>🚫</span> 永久性（不重試）
                  </div>
                  <div class="space-y-1">
                    @for (err of info.error_categories['permanent'].slice(0, 6); track err) {
                      <span class="inline-block text-xs px-2 py-0.5 bg-red-500/10 text-red-300 rounded mr-1 mb-1">{{ err }}</span>
                    }
                  </div>
                </div>
              }

              <!-- 人工處理 -->
              @if (info.error_categories['manual']) {
                <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div class="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                    <span>👤</span> 需人工介入
                  </div>
                  <div class="space-y-1">
                    @for (err of info.error_categories['manual']; track err) {
                      <span class="inline-block text-xs px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded mr-1 mb-1">{{ err }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="text-center py-8 text-slate-500">
            <p class="text-lg mb-2">🔄</p>
            <p>點擊刷新加載重試策略配置</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class RetryStatusComponent implements OnInit {
  private bizApi = inject(BusinessApiService);

  isLoading = signal(false);
  retryInfo = this.bizApi.retryInfo;

  ngOnInit() {
    this.loadRetryInfo();
  }

  async loadRetryInfo() {
    this.isLoading.set(true);
    try {
      await this.bizApi.loadRetrySchedule();
    } finally {
      this.isLoading.set(false);
    }
  }

  getBarWidth(delay: number, maxDelay: number): number {
    return Math.max(15, (delay / maxDelay) * 100);
  }

  formatDelay(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(0)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  }
}
