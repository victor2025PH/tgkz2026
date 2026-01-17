/**
 * 實時匹配消息預覽組件
 * Realtime Matches Preview Component
 * 
 * 功能:
 * 1. 實時顯示匹配到的消息
 * 2. 消息來源和匹配關鍵詞高亮
 * 3. 快捷操作按鈕
 */

import { Component, input, output, signal, computed, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MatchedMessage {
  id: string;
  text: string;
  matchedKeyword: string;
  keywordSetName: string;
  groupName: string;
  groupId: string;
  senderName: string;
  senderId: string;
  timestamp: Date;
  isNew?: boolean;
}

@Component({
  selector: 'app-realtime-matches',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="realtime-matches bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden">
      <!-- 標題欄 -->
      <div class="p-3 border-b border-slate-700/50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full animate-pulse"
                [class.bg-emerald-500]="isMonitoring()"
                [class.bg-slate-500]="!isMonitoring()"></span>
          <h3 class="text-sm font-medium text-white">實時匹配</h3>
          @if (messages().length > 0) {
            <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {{ messages().length }}
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          @if (messages().length > 0) {
            <button (click)="clearMessages()"
                    class="text-xs text-slate-400 hover:text-slate-300">
              清空
            </button>
          }
          <button (click)="toggleExpand()"
                  class="text-xs text-cyan-400 hover:text-cyan-300">
            {{ isExpanded() ? '收起' : '展開' }}
          </button>
        </div>
      </div>
      
      <!-- 消息列表 -->
      @if (isExpanded()) {
        <div class="max-h-64 overflow-y-auto">
          @if (messages().length === 0) {
            <div class="p-6 text-center text-slate-500">
              @if (isMonitoring()) {
                <div class="text-2xl mb-2">👁️</div>
                <p class="text-sm">監控中，等待匹配消息...</p>
              } @else {
                <div class="text-2xl mb-2">💤</div>
                <p class="text-sm">監控未啟動</p>
              }
            </div>
          } @else {
            <div class="divide-y divide-slate-700/50">
              @for (msg of visibleMessages(); track msg.id) {
                <div class="p-3 hover:bg-slate-700/30 transition-colors"
                     [class.bg-cyan-500/5]="msg.isNew"
                     [class.animate-pulse]="msg.isNew">
                  <!-- 消息頭部 -->
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-purple-400">{{ msg.groupName }}</span>
                      <span class="text-slate-600">·</span>
                      <span class="text-slate-400">{{ msg.senderName }}</span>
                    </div>
                    <span class="text-xs text-slate-500">{{ formatTime(msg.timestamp) }}</span>
                  </div>
                  
                  <!-- 消息內容 -->
                  <div class="text-sm text-slate-300 mb-2 line-clamp-2" 
                       [innerHTML]="highlightKeyword(msg.text, msg.matchedKeyword)">
                  </div>
                  
                  <!-- 匹配信息和操作 -->
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                        🔑 {{ msg.keywordSetName }}
                      </span>
                      <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                        「{{ msg.matchedKeyword }}」
                      </span>
                    </div>
                    <div class="flex items-center gap-1">
                      <button (click)="onQuickReply(msg); $event.stopPropagation()"
                              class="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors">
                        快速回覆
                      </button>
                      <button (click)="onAddToLeads(msg); $event.stopPropagation()"
                              class="px-2 py-1 text-xs bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors">
                        加入線索
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
        
        <!-- 查看更多 -->
        @if (messages().length > maxVisible) {
          <div class="p-2 border-t border-slate-700/50 text-center">
            <button (click)="viewAllMatches.emit()"
                    class="text-xs text-cyan-400 hover:text-cyan-300">
              查看全部 {{ messages().length }} 條匹配 →
            </button>
          </div>
        }
      } @else {
        <!-- 收起狀態：顯示最新一條 -->
        @if (latestMessage()) {
          <div class="p-3 flex items-center gap-3">
            <div class="flex-1 min-w-0">
              <div class="text-xs text-purple-400 mb-0.5">{{ latestMessage()?.groupName }}</div>
              <div class="text-sm text-slate-300 truncate">{{ latestMessage()?.text }}</div>
            </div>
            <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded shrink-0">
              「{{ latestMessage()?.matchedKeyword }}」
            </span>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-in-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class RealtimeMatchesComponent implements OnDestroy {
  // 輸入
  isMonitoring = input(false);
  messages = input<MatchedMessage[]>([]);
  maxVisible = 5;
  
  // 輸出
  quickReply = output<MatchedMessage>();
  addToLeads = output<MatchedMessage>();
  viewAllMatches = output<void>();
  
  // 狀態
  isExpanded = signal(true);
  
  visibleMessages = computed(() => 
    this.messages().slice(0, this.maxVisible)
  );
  
  latestMessage = computed(() => 
    this.messages().length > 0 ? this.messages()[0] : null
  );
  
  toggleExpand() {
    this.isExpanded.set(!this.isExpanded());
  }
  
  clearMessages() {
    // 通過事件通知父組件清空消息
    window.dispatchEvent(new CustomEvent('clear-matched-messages'));
  }
  
  formatTime(date: Date): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  
  highlightKeyword(text: string, keyword: string): string {
    if (!keyword) return text;
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return text.replace(regex, '<span class="bg-yellow-500/30 text-yellow-300 px-0.5 rounded">$1</span>');
  }
  
  onQuickReply(msg: MatchedMessage) {
    this.quickReply.emit(msg);
  }
  
  onAddToLeads(msg: MatchedMessage) {
    this.addToLeads.emit(msg);
  }
  
  ngOnDestroy() {
    // 清理
  }
}
