/**
 * 智能待辦清單組件 - Phase 1 優化
 * Smart Todo List with AI Prioritization
 * 
 * 功能:
 * 1. AI 智能排序優先跟進對象
 * 2. 實時在線狀態顯示
 * 3. 最佳聯繫時機提示
 * 4. 快速操作入口
 */

import { Component, signal, computed, input, output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// 待辦項目類型
export type TodoType = 'follow_up' | 'new_reply' | 'high_intent' | 'at_risk' | 'optimal_time';

// 待辦項目定義
export interface SmartTodoItem {
  id: string;
  leadId: number;
  leadName: string;
  username?: string;
  avatar?: string;
  type: TodoType;
  priority: number;  // 1-100
  title: string;
  description: string;
  reason: string;
  
  // 狀態信息
  isOnline: boolean;
  lastSeen?: Date;
  stage: string;
  score: number;
  
  // 時機信息
  isOptimalTime: boolean;
  optimalTimeReason?: string;
  
  // 操作
  actions: TodoAction[];
  
  // 時間
  createdAt: Date;
  dueAt?: Date;
}

// 待辦操作
export interface TodoAction {
  id: string;
  label: string;
  icon: string;
  type: 'primary' | 'secondary' | 'danger';
  handler: string;  // 操作類型標識
}

// 待辦統計
export interface TodoStats {
  total: number;
  byType: Record<TodoType, number>;
  urgent: number;
  completed: number;
  overdue: number;
}

@Component({
  selector: 'app-smart-todo-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smart-todo-list">
      <!-- 頭部統計 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span class="text-xl">⚡</span>
            智能待辦
          </h3>
          <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-sm rounded-full">
            {{ todoStats().total }} 項待處理
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- 篩選按鈕 -->
          <div class="flex bg-slate-800/50 rounded-lg p-0.5">
            @for (filter of filters; track filter.type) {
              <button (click)="activeFilter.set(filter.type)"
                      class="px-2.5 py-1 text-xs rounded-md transition-all"
                      [class.bg-cyan-500]="activeFilter() === filter.type"
                      [class.text-white]="activeFilter() === filter.type"
                      [class.text-slate-400]="activeFilter() !== filter.type"
                      [class.hover:text-slate-300]="activeFilter() !== filter.type">
                {{ filter.icon }} {{ filter.label }}
                @if (filter.count && filter.count() > 0) {
                  <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full"
                        [class.bg-white/20]="activeFilter() === filter.type"
                        [class.bg-slate-700]="activeFilter() !== filter.type">
                    {{ filter.count() }}
                  </span>
                }
              </button>
            }
          </div>
          
          <!-- 刷新按鈕 -->
          <button (click)="refresh.emit()"
                  class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 待辦列表 -->
      <div class="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        @for (item of filteredTodos(); track item.id) {
          <div class="todo-item group relative bg-slate-800/50 hover:bg-slate-700/50 
                      rounded-xl p-3 border transition-all cursor-pointer"
               [class.border-green-500/30]="item.isOnline && item.isOptimalTime"
               [class.border-cyan-500/30]="item.isOnline && !item.isOptimalTime"
               [class.border-yellow-500/30]="item.type === 'high_intent'"
               [class.border-orange-500/30]="item.type === 'at_risk'"
               [class.border-slate-600/50]="!item.isOnline && item.type !== 'high_intent' && item.type !== 'at_risk'"
               (click)="selectItem.emit(item)">
            
            <!-- 最佳時機標籤 -->
            @if (item.isOnline && item.isOptimalTime) {
              <div class="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 
                          text-white text-xs font-semibold rounded-full shadow-lg animate-pulse">
                🎯 最佳時機
              </div>
            }
            
            <div class="flex items-start gap-3">
              <!-- 頭像 -->
              <div class="relative flex-shrink-0">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center 
                            text-white font-bold text-sm"
                     [class.from-cyan-500]="item.isOnline"
                     [class.to-blue-500]="item.isOnline"
                     [class.from-slate-600]="!item.isOnline"
                     [class.to-slate-700]="!item.isOnline">
                  {{ getInitial(item) }}
                </div>
                <!-- 在線指示器 -->
                @if (item.isOnline) {
                  <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 
                              rounded-full border-2 border-slate-800 animate-pulse"></div>
                }
              </div>
              
              <!-- 內容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="font-medium text-white truncate">{{ item.leadName }}</span>
                  @if (item.username) {
                    <span class="text-xs text-slate-500">&#64;{{ item.username }}</span>
                  }
                  <!-- 優先級標籤 -->
                  <span class="px-1.5 py-0.5 text-xs rounded"
                        [class.bg-red-500/20]="item.priority >= 80"
                        [class.text-red-400]="item.priority >= 80"
                        [class.bg-yellow-500/20]="item.priority >= 60 && item.priority < 80"
                        [class.text-yellow-400]="item.priority >= 60 && item.priority < 80"
                        [class.bg-slate-600]="item.priority < 60"
                        [class.text-slate-400]="item.priority < 60">
                    {{ item.priority }}分
                  </span>
                </div>
                
                <!-- 描述 -->
                <p class="text-sm text-slate-300 truncate">{{ item.title }}</p>
                
                <!-- 原因/狀態 -->
                <div class="flex items-center gap-2 mt-1.5 text-xs">
                  <!-- 類型圖標 -->
                  <span class="px-1.5 py-0.5 rounded"
                        [class.bg-cyan-500/20]="item.type === 'follow_up'"
                        [class.text-cyan-400]="item.type === 'follow_up'"
                        [class.bg-blue-500/20]="item.type === 'new_reply'"
                        [class.text-blue-400]="item.type === 'new_reply'"
                        [class.bg-purple-500/20]="item.type === 'high_intent'"
                        [class.text-purple-400]="item.type === 'high_intent'"
                        [class.bg-orange-500/20]="item.type === 'at_risk'"
                        [class.text-orange-400]="item.type === 'at_risk'"
                        [class.bg-green-500/20]="item.type === 'optimal_time'"
                        [class.text-green-400]="item.type === 'optimal_time'">
                    {{ getTypeLabel(item.type) }}
                  </span>
                  
                  <!-- 階段 -->
                  <span class="text-slate-500">{{ item.stage }}</span>
                  
                  <!-- 最後活動 -->
                  @if (item.lastSeen) {
                    <span class="text-slate-500">· {{ formatLastSeen(item.lastSeen) }}</span>
                  }
                  
                  <!-- 最佳時機原因 -->
                  @if (item.isOptimalTime && item.optimalTimeReason) {
                    <span class="text-green-400">· {{ item.optimalTimeReason }}</span>
                  }
                </div>
              </div>
              
              <!-- 快速操作 -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                @for (action of item.actions.slice(0, 2); track action.id) {
                  <button (click)="executeAction(item, action); $event.stopPropagation()"
                          class="p-2 rounded-lg transition-all"
                          [class.bg-cyan-500/20]="action.type === 'primary'"
                          [class.text-cyan-400]="action.type === 'primary'"
                          [class.hover:bg-cyan-500/30]="action.type === 'primary'"
                          [class.bg-slate-600/50]="action.type === 'secondary'"
                          [class.text-slate-300]="action.type === 'secondary'"
                          [class.hover:bg-slate-500/50]="action.type === 'secondary'"
                          [title]="action.label">
                    <span>{{ action.icon }}</span>
                  </button>
                }
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-8">
            <div class="text-4xl mb-3">✨</div>
            <p class="text-slate-400">暫無待辦項目</p>
            <p class="text-sm text-slate-500 mt-1">所有跟進任務都已完成</p>
          </div>
        }
      </div>
      
      <!-- 查看更多 -->
      @if (hasMore()) {
        <button (click)="loadMore.emit()"
                class="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white 
                       hover:bg-slate-700/50 rounded-lg transition-all">
          查看更多 ({{ remainingCount() }} 項)
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
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.4);
    }
  `]
})
export class SmartTodoListComponent implements OnInit, OnDestroy {
  // 輸入
  todos = input<SmartTodoItem[]>([]);
  maxVisible = input(10);
  
  // 輸出事件
  selectItem = output<SmartTodoItem>();
  executeActionEvent = output<{item: SmartTodoItem, action: TodoAction}>();
  refresh = output<void>();
  loadMore = output<void>();
  
  // 狀態
  activeFilter = signal<'all' | TodoType>('all');
  
  // 篩選器
  filters = [
    { type: 'all' as const, icon: '📋', label: '全部', count: () => this.todos().length },
    { type: 'optimal_time' as TodoType, icon: '🎯', label: '最佳時機', count: () => this.getTypeCount('optimal_time') },
    { type: 'new_reply' as TodoType, icon: '💬', label: '新回覆', count: () => this.getTypeCount('new_reply') },
    { type: 'high_intent' as TodoType, icon: '🔥', label: '高意向', count: () => this.getTypeCount('high_intent') },
    { type: 'at_risk' as TodoType, icon: '⚠️', label: '流失風險', count: () => this.getTypeCount('at_risk') }
  ];
  
  // 計算屬性
  filteredTodos = computed(() => {
    const filter = this.activeFilter();
    let items = this.todos();
    
    if (filter !== 'all') {
      items = items.filter(i => i.type === filter);
    }
    
    // 按優先級排序
    items = [...items].sort((a, b) => {
      // 在線且最佳時機優先
      if (a.isOnline && a.isOptimalTime && !(b.isOnline && b.isOptimalTime)) return -1;
      if (b.isOnline && b.isOptimalTime && !(a.isOnline && a.isOptimalTime)) return 1;
      // 在線優先
      if (a.isOnline && !b.isOnline) return -1;
      if (b.isOnline && !a.isOnline) return 1;
      // 優先級排序
      return b.priority - a.priority;
    });
    
    return items.slice(0, this.maxVisible());
  });
  
  todoStats = computed<TodoStats>(() => {
    const items = this.todos();
    const byType: Record<TodoType, number> = {
      follow_up: 0,
      new_reply: 0,
      high_intent: 0,
      at_risk: 0,
      optimal_time: 0
    };
    
    items.forEach(item => {
      byType[item.type]++;
    });
    
    return {
      total: items.length,
      byType,
      urgent: items.filter(i => i.priority >= 80).length,
      completed: 0,
      overdue: items.filter(i => i.dueAt && new Date(i.dueAt) < new Date()).length
    };
  });
  
  hasMore = computed(() => this.todos().length > this.maxVisible());
  remainingCount = computed(() => Math.max(0, this.todos().length - this.maxVisible()));
  
  ngOnInit() {}
  ngOnDestroy() {}
  
  // 獲取類型數量
  getTypeCount(type: TodoType): number {
    return this.todos().filter(i => i.type === type).length;
  }
  
  // 獲取首字母
  getInitial(item: SmartTodoItem): string {
    return (item.leadName || item.username || '?').charAt(0).toUpperCase();
  }
  
  // 獲取類型標籤
  getTypeLabel(type: TodoType): string {
    const labels: Record<TodoType, string> = {
      follow_up: '🔔 待跟進',
      new_reply: '💬 新回覆',
      high_intent: '🔥 高意向',
      at_risk: '⚠️ 流失風險',
      optimal_time: '🎯 最佳時機'
    };
    return labels[type];
  }
  
  // 格式化最後活動時間
  formatLastSeen(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${days}天前`;
  }
  
  // 執行操作
  executeAction(item: SmartTodoItem, action: TodoAction) {
    this.executeActionEvent.emit({ item, action });
  }
}
