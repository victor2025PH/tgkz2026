/**
 * 我的消息 — 統一消息中心（UI 層）
 * 業務邏輯全部委託給 MessagesService
 */
import { Component, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessagesService, AppMessage, TabCategory, MsgCategory } from '../services/messages.service';

const CATEGORY_CONFIG: Record<MsgCategory, { label: string; icon: string; bg: string; activeColor: string }> = {
  system: { label: '系統通知', icon: '🔧', bg: 'bg-blue-500/10 border-blue-500/20',    activeColor: 'rgba(59,130,246,0.30)'  },
  rule:   { label: '規則觸發', icon: '⚡', bg: 'bg-amber-500/10 border-amber-500/20',   activeColor: 'rgba(245,158,11,0.30)'  },
  lead:   { label: '新線索',   icon: '👤', bg: 'bg-emerald-500/10 border-emerald-500/20', activeColor: 'rgba(16,185,129,0.30)' },
  task:   { label: '任務進度', icon: '📋', bg: 'bg-purple-500/10 border-purple-500/20',  activeColor: 'rgba(168,85,247,0.30)'  },
  alert:  { label: '告警',     icon: '🚨', bg: 'bg-red-500/10 border-red-500/20',        activeColor: 'rgba(239,68,68,0.30)'   },
};

@Component({
  selector: 'app-messages-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="h-full flex flex-col bg-slate-900 text-white">

  <!-- ── 頁頭 ────────────────────────────────────────────── -->
  <div class="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 flex-shrink-0">
    <div>
      <h1 class="text-2xl font-bold text-white flex items-center gap-3">
        <span class="text-2xl">🔔</span> 我的消息
        @if (svc.unreadCount() > 0) {
          <span class="px-2 py-0.5 text-xs font-bold bg-cyan-500 text-white rounded-full">
            {{ svc.unreadCount() }} 未讀
          </span>
        }
      </h1>
      <p class="text-slate-400 text-sm mt-1">系統通知、規則觸發、線索動態一覽 · 重啟後消息自動保留</p>
    </div>
    <div class="flex items-center gap-3">
      @if (svc.unreadCount() > 0) {
        <button (click)="svc.markAllRead()"
                class="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700/50
                       hover:bg-slate-700 border border-slate-600/50 rounded-xl transition-all">
          全部標為已讀
        </button>
      }
      <button (click)="svc.clearCategory(activeTab())"
              class="px-4 py-2 text-sm text-slate-400 hover:text-red-400
                     hover:bg-red-500/10 border border-transparent hover:border-red-500/20
                     rounded-xl transition-all">
        {{ activeTab() === 'all' ? '清空全部' : '清空此分類' }}
      </button>
    </div>
  </div>

  <!-- ── 分類 Tab ─────────────────────────────────────────── -->
  <div class="flex items-center gap-1 px-6 py-3 border-b border-slate-700/50 flex-shrink-0 overflow-x-auto">
    <button (click)="activeTab.set('all')"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
            [class.bg-cyan-500]="activeTab() === 'all'"
            [class.text-white]="activeTab() === 'all'"
            [class.text-slate-400]="activeTab() !== 'all'">
      <span>📬</span> 全部
      @if (svc.unreadCount() > 0) {
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">{{ svc.unreadCount() }}</span>
      }
    </button>

    @for (cat of categoryList; track cat.key) {
      <button (click)="activeTab.set(cat.key)"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              [class.text-white]="activeTab() === cat.key"
              [class.text-slate-400]="activeTab() !== cat.key"
              [style.background]="activeTab() === cat.key ? cat.activeColor : 'transparent'">
        <span>{{ cat.icon }}</span> {{ cat.label }}
        @if ((svc.unreadByCategory()[cat.key] ?? 0) > 0) {
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
            {{ svc.unreadByCategory()[cat.key] }}
          </span>
        }
      </button>
    }
  </div>

  <!-- ── 消息列表 ──────────────────────────────────────────── -->
  <div class="flex-1 overflow-y-auto">

    @if (filteredMessages().length === 0) {
      <div class="flex flex-col items-center justify-center h-64 text-center px-6">
        <div class="text-5xl mb-4 opacity-30">📭</div>
        <p class="text-slate-400 text-sm">{{ activeTab() === 'all' ? '暫無消息' : '該分類暫無消息' }}</p>
        <p class="text-slate-600 text-xs mt-2">系統事件會自動收集到此處</p>
      </div>
    } @else {
      @if (todayMessages().length > 0) {
        <div class="px-6 pt-4 pb-1">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">今天</span>
        </div>
        <div class="divide-y divide-slate-700/30">
          @for (msg of todayMessages(); track msg.id) {
            <ng-container *ngTemplateOutlet="msgRow; context: { msg: msg }"></ng-container>
          }
        </div>
      }
      @if (earlierMessages().length > 0) {
        <div class="px-6 pt-4 pb-1">
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">更早</span>
        </div>
        <div class="divide-y divide-slate-700/30">
          @for (msg of earlierMessages(); track msg.id) {
            <ng-container *ngTemplateOutlet="msgRow; context: { msg: msg }"></ng-container>
          }
        </div>
      }
    }
  </div>

  <!-- ── 消息行模板 ─────────────────────────────────────────── -->
  <ng-template #msgRow let-msg="msg">
    <div class="flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-slate-800/40 group"
         [class.bg-slate-800/20]="!msg.read"
         (click)="onMsgClick(msg)">

      <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg border"
           [class]="getCategoryBg(msg.category)">
        {{ msg.icon }}
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <span class="text-sm font-semibold text-white leading-snug group-hover:text-cyan-300 transition-colors">
            {{ msg.title }}
          </span>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-[11px] text-slate-500">{{ formatTime(msg.time) }}</span>
            @if (!msg.read) {
              <span class="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"></span>
            }
          </div>
        </div>
        <p class="text-sm text-slate-400 mt-1 leading-relaxed">{{ msg.summary }}</p>
        @if (msg.actionView) {
          <span class="text-xs text-cyan-400/70 mt-1 inline-block group-hover:text-cyan-400 transition-colors">
            點擊前往處理 →
          </span>
        }
      </div>

      <button (click)="removeMsg(msg.id, $event)"
              class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600
                     hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </ng-template>

</div>
  `
})
export class MessagesViewComponent {
  protected svc = inject(MessagesService);

  activeTab = signal<TabCategory>('all');

  readonly categoryList = (Object.entries(CATEGORY_CONFIG) as [MsgCategory, typeof CATEGORY_CONFIG[MsgCategory]][])
    .map(([key, cfg]) => ({ key, ...cfg }));

  filteredMessages = computed(() => {
    const tab = this.activeTab();
    const all = this.svc.messages();
    return tab === 'all' ? all : all.filter(m => m.category === tab);
  });

  todayMessages = computed(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => new Date(m.time) >= todayStart);
  });

  earlierMessages = computed(() => {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => new Date(m.time) < todayStart);
  });

  onMsgClick(msg: AppMessage) {
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
    const diff = Date.now() - time.getTime();
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
