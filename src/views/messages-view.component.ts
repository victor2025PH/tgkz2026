/**
 * 我的消息 - 統一消息中心
 * Messages View Component
 *
 * 收集系統各模塊的消息，分類展示，支持點擊跳轉處理
 */
import {
  Component, signal, computed, inject, OnInit, OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

export type MsgCategory = 'all' | 'system' | 'rule' | 'lead' | 'task' | 'alert';

export interface AppMessage {
  id: string;
  category: Exclude<MsgCategory, 'all'>;
  icon: string;
  title: string;
  summary: string;
  time: Date;
  read: boolean;
  actionView?: string;
  detail?: string;
}

const CATEGORY_CONFIG: Record<Exclude<MsgCategory, 'all'>, { label: string; icon: string; color: string; bg: string }> = {
  system:  { label: '系統通知', icon: '🔧', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'   },
  rule:    { label: '規則觸發', icon: '⚡', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20'  },
  lead:    { label: '新線索',   icon: '👤', color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20'},
  task:    { label: '任務進度', icon: '📋', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  alert:   { label: '告警',     icon: '🚨', color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20'       },
};

@Component({
  selector: 'app-messages-view',
  standalone: true,
  imports: [CommonModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="h-full flex flex-col bg-slate-900 text-white">

  <!-- ── 頁頭 ─────────────────────────────────────────────────── -->
  <div class="flex items-center justify-between px-6 py-5 border-b border-slate-700/50 flex-shrink-0">
    <div>
      <h1 class="text-2xl font-bold text-white flex items-center gap-3">
        <span class="text-2xl">🔔</span> 我的消息
      </h1>
      <p class="text-slate-400 text-sm mt-1">系統通知、規則觸發、線索動態一覽</p>
    </div>
    <div class="flex items-center gap-3">
      @if (unreadCount() > 0) {
        <button (click)="markAllRead()"
                class="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-700/50
                       hover:bg-slate-700 border border-slate-600/50 rounded-xl transition-all">
          全部標為已讀
        </button>
      }
      <button (click)="clearAll()"
              class="px-4 py-2 text-sm text-slate-400 hover:text-red-400
                     hover:bg-red-500/10 border border-transparent hover:border-red-500/20
                     rounded-xl transition-all">
        清空
      </button>
    </div>
  </div>

  <!-- ── 分類 Tab ──────────────────────────────────────────────── -->
  <div class="flex items-center gap-1 px-6 py-3 border-b border-slate-700/50 flex-shrink-0 overflow-x-auto">
    <!-- 全部 -->
    <button (click)="activeTab.set('all')"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
            [class.bg-cyan-500]="activeTab() === 'all'"
            [class.text-white]="activeTab() === 'all'"
            [class.text-slate-400]="activeTab() !== 'all'"
            [class.hover:text-white]="activeTab() !== 'all'">
      <span>📬</span> 全部
      @if (unreadCount() > 0) {
        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
          {{ unreadCount() }}
        </span>
      }
    </button>

    @for (entry of categoryEntries; track entry.key) {
      <button (click)="activeTab.set(entry.key)"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
              [class.text-white]="activeTab() === entry.key"
              [class.text-slate-400]="activeTab() !== entry.key"
              [class.hover:text-white]="activeTab() !== entry.key"
              [style.background]="activeTab() === entry.key ? entry.activeColor : 'transparent'">
        <span>{{ entry.icon }}</span>
        {{ entry.label }}
        @if (unreadByCategory()[entry.key] > 0) {
          <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
            {{ unreadByCategory()[entry.key] }}
          </span>
        }
      </button>
    }
  </div>

  <!-- ── 消息列表 ───────────────────────────────────────────────── -->
  <div class="flex-1 overflow-y-auto">

    @if (filteredMessages().length === 0) {
      <div class="flex flex-col items-center justify-center h-64 text-center px-6">
        <div class="text-5xl mb-4 opacity-40">📭</div>
        <p class="text-slate-400 text-sm">{{ activeTab() === 'all' ? '暫無消息' : '該分類暫無消息' }}</p>
        <p class="text-slate-600 text-xs mt-2">系統事件會自動收集到此處</p>
      </div>
    } @else {
      <!-- 消息分組：今天 / 更早 -->
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

  <!-- ── 消息行模板 ─────────────────────────────────────────────── -->
  <ng-template #msgRow let-msg="msg">
    <div class="flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors
                hover:bg-slate-800/40 group"
         [class.bg-slate-800/20]="!msg.read"
         (click)="onMsgClick(msg)">

      <!-- 圖標 -->
      <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg border"
           [class]="getCategoryBg(msg.category)">
        {{ msg.icon }}
      </div>

      <!-- 主體 -->
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
            點擊查看詳情 →
          </span>
        }
      </div>

      <!-- 刪除 -->
      <button (click)="removeMsg(msg.id, $event)"
              class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                     text-slate-600 hover:text-red-400 hover:bg-red-500/10
                     transition-all flex-shrink-0">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  </ng-template>

</div>
  `
})
export class MessagesViewComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);

  activeTab = signal<MsgCategory>('all');
  private _messages = signal<AppMessage[]>([]);
  private cleanups: Array<() => void> = [];
  private idCnt = 0;

  readonly categoryEntries = (Object.entries(CATEGORY_CONFIG) as [Exclude<MsgCategory,'all'>, typeof CATEGORY_CONFIG[keyof typeof CATEGORY_CONFIG]][])
    .map(([key, cfg]) => ({
      key: key as Exclude<MsgCategory, 'all'>,
      label: cfg.label,
      icon: cfg.icon,
      activeColor: this.categoryActiveColor(key as Exclude<MsgCategory,'all'>),
    }));

  // ── Computed ─────────────────────────────────────────────────
  filteredMessages = computed(() => {
    const tab = this.activeTab();
    const all = this._messages();
    return tab === 'all' ? all : all.filter(m => m.category === tab);
  });

  unreadCount = computed(() => this._messages().filter(m => !m.read).length);

  unreadByCategory = computed(() => {
    const result: Record<string, number> = {};
    for (const key of Object.keys(CATEGORY_CONFIG)) {
      result[key] = this._messages().filter(m => m.category === key && !m.read).length;
    }
    return result;
  });

  todayMessages = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => m.time >= today);
  });

  earlierMessages = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.filteredMessages().filter(m => m.time < today);
  });

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit() {
    this.seedDemoMessages();
    this.setupIpcListeners();
  }

  ngOnDestroy() {
    this.cleanups.forEach(fn => fn());
  }

  // ── Actions ──────────────────────────────────────────────────
  markAllRead() {
    this._messages.update(prev => prev.map(m => ({ ...m, read: true })));
  }

  clearAll() {
    if (this.activeTab() === 'all') {
      this._messages.set([]);
    } else {
      this._messages.update(prev => prev.filter(m => m.category !== this.activeTab()));
    }
  }

  removeMsg(id: string, event: Event) {
    event.stopPropagation();
    this._messages.update(prev => prev.filter(m => m.id !== id));
  }

  onMsgClick(msg: AppMessage) {
    this._messages.update(prev =>
      prev.map(m => m.id === msg.id ? { ...m, read: true } : m)
    );
    if (msg.actionView) {
      window.dispatchEvent(new CustomEvent('changeView', { detail: msg.actionView }));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  getCategoryBg(cat: Exclude<MsgCategory, 'all'>): string {
    return CATEGORY_CONFIG[cat]?.bg ?? 'bg-slate-700/50 border-slate-600/30';
  }

  formatTime(time: Date): string {
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins} 分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時前`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} 天前`;
    return time.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }

  private categoryActiveColor(cat: Exclude<MsgCategory, 'all'>): string {
    const map: Record<string, string> = {
      system: 'rgba(59,130,246,0.35)',
      rule:   'rgba(245,158,11,0.35)',
      lead:   'rgba(16,185,129,0.35)',
      task:   'rgba(168,85,247,0.35)',
      alert:  'rgba(239,68,68,0.35)',
    };
    return map[cat] ?? 'rgba(6,182,212,0.35)';
  }

  private addMsg(msg: Omit<AppMessage, 'id' | 'time' | 'read'>) {
    const entry: AppMessage = {
      ...msg,
      id: `msg-${Date.now()}-${this.idCnt++}`,
      time: new Date(),
      read: false,
    };
    this._messages.update(prev => [entry, ...prev].slice(0, 100));
  }

  // ── IPC Listeners ─────────────────────────────────────────────
  private setupIpcListeners() {
    // 帳號狀態
    const c1 = this.ipc.on('accounts-data', (accs: any[]) => {
      const offline = (accs || []).filter((a: any) => String(a.status) === 'disconnected' || String(a.status) === 'error');
      if (offline.length > 0) {
        this.addMsg({
          category: 'system', icon: '📱',
          title: `${offline.length} 個帳號已斷線`,
          summary: offline.slice(0, 3).map((a: any) => a.phone || a.username || String(a.id)).join('、') + (offline.length > 3 ? ' 等' : ''),
          actionView: 'accounts'
        });
      }
    });
    this.cleanups.push(c1);

    // 規則觸發
    const c2 = this.ipc.on('rule-triggered', (data: any) => {
      if (data?.ruleName || data?.rule_name) {
        this.addMsg({
          category: 'rule', icon: '⚡',
          title: `規則「${data.ruleName || data.rule_name}」觸發`,
          summary: data.keyword
            ? `關鍵詞「${data.keyword}」匹配，執行 ${data.responseType || '自動回覆'}`
            : '關鍵詞匹配成功，已執行自動回覆',
          actionView: 'trigger-rules'
        });
      }
    });
    this.cleanups.push(c2);

    // 新線索 / 新採集用戶
    const c3 = this.ipc.on('new-lead-captured', (data: any) => {
      this.addMsg({
        category: 'lead', icon: '👤',
        title: `新線索：${data?.username || data?.name || '未知用戶'}`,
        summary: `來源：${data?.groupName || data?.source || '群組採集'}，狀態：新線索`,
        actionView: 'lead-nurturing'
      });
    });
    this.cleanups.push(c3);

    // 任務進度
    const c4 = this.ipc.on('task-progress', (data: any) => {
      this.addMsg({
        category: 'task', icon: '📋',
        title: `任務更新：${data?.taskName || data?.name || '行銷任務'}`,
        summary: data?.message || `已發送 ${data?.sent || 0}/${data?.total || 0} 條消息`,
        actionView: 'campaigns'
      });
    });
    this.cleanups.push(c4);

    // AI 錯誤 → 告警
    const c5 = this.ipc.on('ai-error', (data: any) => {
      this.addMsg({
        category: 'alert', icon: '🚨',
        title: 'AI 引擎錯誤',
        summary: data?.message || data?.error || 'AI 回覆出現異常，請檢查 AI 引擎配置',
        actionView: 'ai-engine'
      });
    });
    this.cleanups.push(c5);

    // 消息發送失敗 → 告警
    const c6 = this.ipc.on('message-send-failed', (data: any) => {
      this.addMsg({
        category: 'alert', icon: '❌',
        title: '消息發送失敗',
        summary: data?.reason || `發送至 ${data?.target || '目標'} 失敗，請檢查帳號狀態`,
        actionView: 'accounts'
      });
    });
    this.cleanups.push(c6);
  }

  // ── 預置示例消息（冷啟動時有內容可看）────────────────────────
  private seedDemoMessages() {
    const now = new Date();
    const demos: Omit<AppMessage, 'id' | 'read'>[] = [
      {
        category: 'rule', icon: '⚡',
        title: '規則「優惠促銷」觸發',
        summary: '關鍵詞「打折」匹配，已向 @user_demo 發送模板回覆',
        time: new Date(now.getTime() - 5 * 60000),
        actionView: 'trigger-rules'
      },
      {
        category: 'lead', icon: '👤',
        title: '新採集線索：@crypto_fan',
        summary: '來源：幣圈討論群，狀態：新線索，待跟進',
        time: new Date(now.getTime() - 18 * 60000),
        actionView: 'lead-nurturing'
      },
      {
        category: 'system', icon: '🔧',
        title: 'AI 模型連接待驗證',
        summary: '上次驗證已超過 30 分鐘，建議重新測試連接以確保回覆正常',
        time: new Date(now.getTime() - 2 * 3600000),
        actionView: 'ai-engine'
      },
      {
        category: 'task', icon: '📋',
        title: '群廣播任務完成',
        summary: '任務「週末促銷」已完成，成功發送 82/100 條，2 條因帳號限制跳過',
        time: new Date(now.getTime() - 24 * 3600000),
        actionView: 'campaigns'
      },
      {
        category: 'alert', icon: '🚨',
        title: '消息發送失敗 3 次',
        summary: '帳號 +852 xxx 連續發送失敗，可能因頻率限制，建議降低發送速率',
        time: new Date(now.getTime() - 25 * 3600000),
        actionView: 'accounts'
      },
    ];
    this._messages.set(
      demos.map((d, i) => ({ ...d, id: `demo-${i}`, read: i > 1 }))
    );
  }
}
