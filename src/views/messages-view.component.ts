/**
 * 我的消息 — 統一消息中心（UI 層）
 *
 * P4 升級：
 *  - 搜索框：實時過濾標題 + 摘要（忽略大小寫），切換 Tab 自動清除搜索
 *  - 批量操作：選擇模式 → 勾選 → 批量已讀 / 批量刪除 / 全選
 */
import {
  Component, signal, computed, inject, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagesService, AppMessage, TabCategory, MsgCategory } from '../services/messages.service';

const CATEGORY_CONFIG: Record<MsgCategory, {
  label: string; icon: string; bg: string; activeColor: string
}> = {
  system: { label: '系統通知', icon: '🔧', bg: 'bg-blue-500/10 border-blue-500/20',      activeColor: 'rgba(59,130,246,0.30)'   },
  rule:   { label: '規則觸發', icon: '⚡', bg: 'bg-amber-500/10 border-amber-500/20',     activeColor: 'rgba(245,158,11,0.30)'   },
  lead:   { label: '新線索',   icon: '👤', bg: 'bg-emerald-500/10 border-emerald-500/20', activeColor: 'rgba(16,185,129,0.30)'   },
  task:   { label: '任務進度', icon: '📋', bg: 'bg-purple-500/10 border-purple-500/20',   activeColor: 'rgba(168,85,247,0.30)'   },
  alert:  { label: '告警',     icon: '🚨', bg: 'bg-red-500/10 border-red-500/20',         activeColor: 'rgba(239,68,68,0.30)'    },
};

/** P6-1: 各分類空狀態配置（引導意義） */
const EMPTY_STATE: Record<MsgCategory | 'all', {
  emoji: string; title: string; desc: string;
  action?: { label: string; view: string };
}> = {
  all:    { emoji: '📭', title: '消息箱是空的',       desc: '當有告警、規則觸發或新線索時，消息會在這裡出現' },
  system: { emoji: '🔧', title: '沒有系統通知',       desc: '系統目前運行正常，無需處理' },
  rule:   { emoji: '⚡', title: '還沒有規則觸發記錄',  desc: '設置觸發規則並啟動監控後，關鍵詞命中時會記錄在這裡',
            action: { label: '去設置觸發規則 →', view: 'trigger-rules' } },
  lead:   { emoji: '👤', title: '還沒有新線索',       desc: '啟動監控後，有人回覆關鍵詞時系統會自動捕獲線索',
            action: { label: '去設置監控群組 →', view: 'monitoring-groups' } },
  task:   { emoji: '📋', title: '沒有任務進度通知',   desc: '創建群發任務後，完成時系統會在這裡通知你',
            action: { label: '去創建群發任務 →', view: 'campaigns' } },
  alert:  { emoji: '✅', title: '目前沒有告警',       desc: '帳號全部在線，AI 運行正常 — 一切良好！' },
};

@Component({
  selector: 'app-messages-view',
  standalone: true,
  imports: [CommonModule, FormsModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="h-full flex flex-col bg-slate-900 text-white">

  <!-- ── 頁頭 ────────────────────────────────────────────── -->
  <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0 gap-4">
    <div class="flex-shrink-0">
      <h1 class="text-2xl font-bold text-white flex items-center gap-2">
        <span>🔔</span> 我的消息
        @if (svc.unreadCount() > 0) {
          <span class="px-2 py-0.5 text-xs font-bold bg-cyan-500 text-white rounded-full">
            {{ svc.unreadCount() }}
          </span>
        }
      </h1>
      <p class="text-slate-500 text-xs mt-0.5">重啟後自動保留 · 點擊消息可跳轉</p>
    </div>

    <!-- ── 搜索框（P4-2）──────────────────────────────── -->
    <div class="flex-1 max-w-sm relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
           fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input [(ngModel)]="searchTerm"
             type="text" placeholder="搜索消息…"
             class="w-full pl-9 pr-8 py-2 text-sm bg-slate-800/60 border border-slate-700/50
                    rounded-xl text-white placeholder-slate-500 focus:outline-none
                    focus:border-cyan-500/50 focus:bg-slate-800 transition-all" />
      @if (searchTerm()) {
        <button (click)="searchTerm.set('')"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      }
    </div>

    <!-- ── 操作按鈕 ─────────────────────────────────── -->
    <div class="flex items-center gap-2 flex-shrink-0">
      @if (!selectMode()) {
        @if (svc.unreadCount() > 0) {
          <button (click)="svc.markAllRead()"
                  class="px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-700/50
                         hover:bg-slate-700 border border-slate-600/50 rounded-xl transition-all">
            全部已讀
          </button>
        }
        <!-- 提示音 -->
        <button (click)="svc.toggleSound()"
                class="px-2.5 py-2 text-sm rounded-xl border transition-all"
                [class.bg-cyan-500/15]="svc.soundEnabled()"
                [class.border-cyan-500/30]="svc.soundEnabled()"
                [class.text-cyan-300]="svc.soundEnabled()"
                [class.bg-slate-700/30]="!svc.soundEnabled()"
                [class.border-slate-600/30]="!svc.soundEnabled()"
                [class.text-slate-500]="!svc.soundEnabled()"
                [title]="svc.soundEnabled() ? '關閉提示音' : '開啟提示音'">
          {{ svc.soundEnabled() ? '🔔' : '🔕' }}
        </button>
        <!-- 進入選擇模式 -->
        @if (filteredMessages().length > 0) {
          <button (click)="enterSelectMode()"
                  class="px-3 py-2 text-sm text-slate-400 hover:text-white bg-slate-700/30
                         hover:bg-slate-700/60 border border-slate-600/30 rounded-xl transition-all">
            選擇
          </button>
        }
        <button (click)="svc.clearCategory(activeTab())"
                class="px-3 py-2 text-sm text-slate-500 hover:text-red-400
                       hover:bg-red-500/10 border border-transparent hover:border-red-500/20
                       rounded-xl transition-all">
          清空
        </button>
      } @else {
        <!-- 選擇模式操作欄 -->
        <span class="text-sm text-slate-400 mr-1">已選 {{ selectedCount() }} 條</span>
        <button (click)="toggleSelectAll()"
                class="px-3 py-2 text-sm text-slate-300 hover:text-white bg-slate-700/50
                       border border-slate-600/50 rounded-xl transition-all">
          {{ allPageSelected() ? '取消全選' : '全選' }}
        </button>
        @if (selectedCount() > 0) {
          <button (click)="batchMarkRead()"
                  class="px-3 py-2 text-sm bg-cyan-500/20 hover:bg-cyan-500/40
                         border border-cyan-500/30 text-cyan-300 rounded-xl transition-all">
            標為已讀
          </button>
          <button (click)="batchDelete()"
                  class="px-3 py-2 text-sm bg-red-500/15 hover:bg-red-500/30
                         border border-red-500/20 text-red-400 rounded-xl transition-all">
            刪除
          </button>
        }
        <button (click)="exitSelectMode()"
                class="px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-600/30
                       rounded-xl transition-all">
          取消
        </button>
      }
    </div>
  </div>

  <!-- ── 分類 Tab ─────────────────────────────────────────── -->
  <div class="flex items-center gap-1 px-6 py-2.5 border-b border-slate-700/50 flex-shrink-0 overflow-x-auto">
    <button (click)="setTab('all')"
            class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium
                   transition-all whitespace-nowrap"
            [class.bg-cyan-500]="activeTab() === 'all'"
            [class.text-white]="activeTab() === 'all'"
            [class.text-slate-400]="activeTab() !== 'all'">
      📬 全部
      @if (svc.unreadCount() > 0) {
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
          {{ svc.unreadCount() }}
        </span>
      }
    </button>
    @for (cat of categoryList; track cat.key) {
      <button (click)="setTab(cat.key)"
              class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium
                     transition-all whitespace-nowrap"
              [class.text-white]="activeTab() === cat.key"
              [class.text-slate-400]="activeTab() !== cat.key"
              [style.background]="activeTab() === cat.key ? cat.activeColor : 'transparent'">
        {{ cat.icon }} {{ cat.label }}
        @if ((svc.unreadByCategory()[cat.key] ?? 0) > 0) {
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
            {{ svc.unreadByCategory()[cat.key] }}
          </span>
        }
      </button>
    }

    <!-- 搜索結果計數 -->
    @if (searchTerm()) {
      <span class="ml-auto text-xs text-slate-500 whitespace-nowrap">
        找到 {{ filteredMessages().length }} 條
      </span>
    }
  </div>

  <!-- ── 消息列表 ──────────────────────────────────────────── -->
  <div class="flex-1 overflow-y-auto">

    @if (filteredMessages().length === 0) {
      <!-- P6-1: 引導式空狀態 -->
      @if (searchTerm()) {
        <!-- 搜索無結果 -->
        <div class="flex flex-col items-center justify-center h-64 text-center px-6">
          <div class="text-5xl mb-4 opacity-25">🔍</div>
          <p class="text-slate-300 text-sm font-medium">沒有符合「{{ searchTerm() }}」的消息</p>
          <button (click)="searchTerm.set('')"
                  class="mt-3 text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">
            清除搜索
          </button>
        </div>
      } @else {
        <!-- 分類空狀態 -->
        <div class="flex flex-col items-center justify-center py-20 text-center px-8">
          <div class="text-6xl mb-5 opacity-20 select-none">{{ emptyState().emoji }}</div>
          <h3 class="text-white text-base font-semibold mb-2">{{ emptyState().title }}</h3>
          <p class="text-slate-500 text-sm max-w-xs leading-relaxed">{{ emptyState().desc }}</p>
          @if (emptyState().action) {
            <button (click)="navigateTo(emptyState().action!.view)"
                    class="mt-5 px-4 py-2 text-sm rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30
                           border border-cyan-500/30 text-cyan-400 hover:text-cyan-300
                           transition-all font-medium">
              {{ emptyState().action!.label }}
            </button>
          }
        </div>
      }
    } @else {
      @if (todayMessages().length > 0) {
        <div class="px-6 pt-4 pb-1 flex items-center gap-3">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">今天</span>
          <div class="flex-1 h-px bg-slate-700/50"></div>
        </div>
        <div class="divide-y divide-slate-700/20">
          @for (msg of todayMessages(); track msg.id) {
            <ng-container *ngTemplateOutlet="msgRow; context: { msg: msg }"></ng-container>
          }
        </div>
      }
      @if (earlierMessages().length > 0) {
        <div class="px-6 pt-4 pb-1 flex items-center gap-3">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">更早</span>
          <div class="flex-1 h-px bg-slate-700/50"></div>
        </div>
        <div class="divide-y divide-slate-700/20">
          @for (msg of earlierMessages(); track msg.id) {
            <ng-container *ngTemplateOutlet="msgRow; context: { msg: msg }"></ng-container>
          }
        </div>
      }
    }
  </div>

  <!-- ── 消息行模板 ─────────────────────────────────────────── -->
  <ng-template #msgRow let-msg="msg">
    <div class="flex items-start gap-3 px-6 py-3.5 transition-colors group"
         [class.bg-slate-800/25]="!msg.read"
         [class.cursor-pointer]="!selectMode()"
         [class.hover:bg-slate-800/40]="!selectMode()"
         [class.cursor-default]="selectMode()"
         [class.bg-cyan-500/5]="selectedIds().has(msg.id)"
         (click)="onRowClick(msg)">

      <!-- 複選框（選擇模式）或 分類圖標 -->
      @if (selectMode()) {
        <div class="w-5 h-5 flex-shrink-0 mt-0.5 rounded border-2 flex items-center justify-center transition-all"
             [class.border-cyan-500]="selectedIds().has(msg.id)"
             [class.bg-cyan-500]="selectedIds().has(msg.id)"
             [class.border-slate-600]="!selectedIds().has(msg.id)">
          @if (selectedIds().has(msg.id)) {
            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          }
        </div>
      } @else {
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base border"
             [class]="getCategoryBg(msg.category)">
          {{ msg.icon }}
        </div>
      }

      <!-- 正文 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <!-- 高亮搜索詞 -->
          <span class="text-sm font-medium leading-snug"
                [class.text-white]="!msg.read"
                [class.text-slate-300]="msg.read"
                [class.group-hover:text-cyan-300]="!selectMode()">
            {{ msg.title }}
          </span>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="text-[11px] text-slate-600">{{ formatTime(msg.time) }}</span>
            @if (!msg.read) {
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0"></span>
            }
          </div>
        </div>
        <p class="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{{ msg.summary }}</p>
        @if (msg.actionView && !selectMode()) {
          <span class="text-[11px] text-cyan-500/60 mt-0.5 inline-block group-hover:text-cyan-400 transition-colors">
            點擊前往處理 →
          </span>
        }
      </div>

      <!-- 刪除（非選擇模式） -->
      @if (!selectMode()) {
        <button (click)="removeMsg(msg.id, $event)"
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600
                       hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 mt-0.5">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      }
    </div>
  </ng-template>

</div>
  `
})
export class MessagesViewComponent {
  protected svc = inject(MessagesService);

  activeTab  = signal<TabCategory>('all');
  searchTerm = signal('');

  // ── 選擇模式 ─────────────────────────────────────────────
  selectMode  = signal(false);
  selectedIds = signal(new Set<string>());

  readonly categoryList = (
    Object.entries(CATEGORY_CONFIG) as [MsgCategory, typeof CATEGORY_CONFIG[MsgCategory]][]
  ).map(([key, cfg]) => ({ key, ...cfg }));

  // ── Computed ─────────────────────────────────────────────
  filteredMessages = computed(() => {
    const tab    = this.activeTab();
    const search = this.searchTerm().toLowerCase().trim();
    let msgs = this.svc.messages();
    if (tab !== 'all') msgs = msgs.filter(m => m.category === tab);
    if (search) {
      msgs = msgs.filter(m =>
        m.title.toLowerCase().includes(search) ||
        m.summary.toLowerCase().includes(search)
      );
    }
    return msgs;
  });

  todayMessages = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => new Date(m.time) >= today);
  });

  earlierMessages = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => new Date(m.time) < today);
  });

  selectedCount = computed(() => this.selectedIds().size);

  allPageSelected = computed(() => {
    const msgs = this.filteredMessages();
    return msgs.length > 0 && msgs.every(m => this.selectedIds().has(m.id));
  });

  /** P6-1: 當前分類的空狀態配置 */
  emptyState = computed(() => EMPTY_STATE[this.activeTab()] ?? EMPTY_STATE['all']);

  /** P6-1: 發出全局導航事件（empty state 按鈕使用） */
  navigateTo(view: string) {
    window.dispatchEvent(new CustomEvent('changeView', { detail: view }));
  }

  // ── Tab 切換（清空搜索） ──────────────────────────────────
  setTab(tab: TabCategory) {
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.exitSelectMode();
  }

  // ── 選擇模式 ──────────────────────────────────────────────
  enterSelectMode() {
    this.selectMode.set(true);
    this.selectedIds.set(new Set());
  }

  exitSelectMode() {
    this.selectMode.set(false);
    this.selectedIds.set(new Set());
  }

  toggleSelectAll() {
    if (this.allPageSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.filteredMessages().map(m => m.id)));
    }
  }

  toggleSelect(id: string) {
    this.selectedIds.update(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  batchMarkRead() {
    this.selectedIds().forEach(id => this.svc.markRead(id));
    this.exitSelectMode();
  }

  batchDelete() {
    this.selectedIds().forEach(id => this.svc.remove(id));
    this.exitSelectMode();
  }

  // ── 行點擊 ───────────────────────────────────────────────
  onRowClick(msg: AppMessage) {
    if (this.selectMode()) {
      this.toggleSelect(msg.id);
      return;
    }
    this.svc.markRead(msg.id);
    if (msg.actionView) {
      window.dispatchEvent(new CustomEvent('changeView', { detail: msg.actionView }));
    }
  }

  removeMsg(id: string, event: Event) {
    event.stopPropagation();
    this.svc.remove(id);
  }

  getCategoryBg(cat: MsgCategory): string {
    return CATEGORY_CONFIG[cat]?.bg ?? 'bg-slate-700/50 border-slate-600/30';
  }

  formatTime(isoStr: string): string {
    const time = new Date(isoStr);
    const diff = this.svc.nowMs() - time.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins} 分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時前`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} 天前`;
    return time.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }
}
