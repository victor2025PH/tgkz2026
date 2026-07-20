/**
 * 🆕 P4-3: 智能通知鈴鐺組件
 * 捕獲跨模塊系統事件，展示未讀通知徽章和抽屜式面板
 */
import {
  Component, signal, computed, inject, OnInit, OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronIpcService } from '../electron-ipc.service';

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  icon: string;
  title: string;
  desc: string;
  time: Date;
  read: boolean;
  actionView?: string;
}

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="relative">
  <!-- 鈴鐺按鈕 -->
  <button (click)="toggle()"
          class="relative p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          [class.text-cyan-400]="showDrawer()"
          [class.text-slate-400]="!showDrawer()"
          title="通知中心">
    <span class="text-lg" [class.animate-bounce]="unreadCount() > 0 && !showDrawer()">🔔</span>
    @if (unreadCount() > 0) {
      <span class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5
                   bg-red-500 text-white text-[10px] font-bold rounded-full
                   flex items-center justify-center leading-none
                   ring-2 ring-slate-900">
        {{ unreadCount() > 9 ? '9+' : unreadCount() }}
      </span>
    }
  </button>

  <!-- 通知抽屜 -->
  @if (showDrawer()) {
    <!-- 點擊外部關閉 -->
    <div class="fixed inset-0 z-40" (click)="showDrawer.set(false)"></div>

    <div class="absolute left-full top-0 ml-2 w-80 z-50
                bg-slate-800 border border-slate-700/60 rounded-2xl
                shadow-2xl shadow-black/40 overflow-hidden"
         style="max-height: 480px;">
      <!-- 抽屜標題 -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-700/50
                  bg-gradient-to-r from-slate-800 to-slate-800/80">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-white">通知中心</span>
          @if (unreadCount() > 0) {
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              {{ unreadCount() }} 未讀
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          @if (unreadCount() > 0) {
            <button (click)="markAllRead()" class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              全部已讀
            </button>
          }
          <button (click)="showDrawer.set(false)" class="text-slate-500 hover:text-slate-300 transition-colors text-sm">✕</button>
        </div>
      </div>

      <!-- 通知列表 -->
      <div class="overflow-y-auto" style="max-height: 380px;">
        @if (notifications().length === 0) {
          <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div class="text-4xl mb-3 opacity-50">🔕</div>
            <p class="text-slate-400 text-sm">暫無通知</p>
            <p class="text-slate-600 text-xs mt-1">系統事件將自動顯示在此</p>
          </div>
        } @else {
          <div class="divide-y divide-slate-700/40">
            @for (n of notifications(); track n.id) {
              <div class="flex items-start gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors cursor-pointer"
                   [class.bg-slate-700/10]="!n.read"
                   (click)="onNotifClick(n)">
                <!-- 圖標 -->
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm mt-0.5"
                     [class.bg-red-500/20]="n.type === 'error'"
                     [class.bg-amber-500/20]="n.type === 'warning'"
                     [class.bg-emerald-500/20]="n.type === 'success'"
                     [class.bg-blue-500/20]="n.type === 'info'">
                  {{ n.icon }}
                </div>
                <!-- 內容 -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-sm font-medium text-white leading-snug">{{ n.title }}</span>
                    @if (!n.read) {
                      <span class="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-1.5"></span>
                    }
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5 line-clamp-2">{{ n.desc }}</p>
                  <span class="text-[10px] text-slate-600 mt-1 block">{{ formatTime(n.time) }}</span>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- 底部操作 -->
      @if (notifications().length > 0) {
        <div class="px-4 py-2.5 border-t border-slate-700/50 flex items-center justify-between">
          <button (click)="clearAll()" class="text-xs text-slate-500 hover:text-red-400 transition-colors">
            清空通知
          </button>
          <button (click)="navigateTo('settings'); showDrawer.set(false)"
                  class="text-xs text-slate-500 hover:text-cyan-400 transition-colors">
            通知設置 →
          </button>
        </div>
      }
    </div>
  }
</div>
  `
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);

  showDrawer = signal(false);
  private _notifications = signal<AppNotification[]>([]);

  notifications = this._notifications.asReadonly();
  unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  private cleanups: Array<() => void> = [];
  private idCounter = 0;

  ngOnInit() {
    this.setupListeners();
  }

  ngOnDestroy() {
    this.cleanups.forEach(fn => fn());
  }

  toggle() {
    this.showDrawer.update(v => !v);
    if (this.showDrawer()) {
      // Mark all visible as read after a short delay
      setTimeout(() => this.markAllRead(), 1500);
    }
  }

  markAllRead() {
    this._notifications.update(prev => prev.map(n => ({ ...n, read: true })));
  }

  clearAll() {
    this._notifications.set([]);
  }

  onNotifClick(n: AppNotification) {
    this._notifications.update(prev =>
      prev.map(item => item.id === n.id ? { ...item, read: true } : item)
    );
    if (n.actionView) {
      this.navigateTo(n.actionView);
      this.showDrawer.set(false);
    }
  }

  navigateTo(view: string) {
    window.dispatchEvent(new CustomEvent('changeView', { detail: view }));
  }

  formatTime(time: Date): string {
    const now = new Date();
    const diff = now.getTime() - time.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '剛剛';
    if (mins < 60) return `${mins} 分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時前`;
    return time.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }

  private addNotification(notif: Omit<AppNotification, 'id' | 'time' | 'read'>) {
    const entry: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${this.idCounter++}`,
      time: new Date(),
      read: false
    };
    this._notifications.update(prev => [entry, ...prev].slice(0, 30));
  }

  private setupListeners() {
    // 帳號狀態變更
    const c1 = this.ipc.on('accounts-data', (accounts: any[]) => {
      const list: any[] = accounts || [];
      const offline = list.filter(
        (a: any) => String(a.status) === 'disconnected' || String(a.status) === 'error'
      );
      if (offline.length > 0) {
        this.addNotification({
          type: 'warning',
          icon: '📱',
          title: `${offline.length} 個帳號已斷線`,
          desc: offline.slice(0, 3).map((a: any) => a.phone || a.username || String(a.id)).join('、'),
          actionView: 'accounts'
        });
      }
    });
    this.cleanups.push(c1);

    // 規則觸發事件
    const c2 = this.ipc.on('rule-triggered', (data: any) => {
      if (data?.ruleName || data?.rule_name) {
        this.addNotification({
          type: 'success',
          icon: '⚡',
          title: `規則觸發：${data.ruleName || data.rule_name}`,
          desc: data.keyword
            ? `關鍵詞「${data.keyword}」匹配，執行 ${data.responseType || '自動回覆'}`
            : '觸發自動回覆流程',
          actionView: 'trigger-rules'
        });
      }
    });
    this.cleanups.push(c2);

    // AI 模型錯誤
    const c3 = this.ipc.on('ai-error', (data: any) => {
      this.addNotification({
        type: 'error',
        icon: '🧠',
        title: 'AI 引擎錯誤',
        desc: data?.message || data?.error || 'AI 回覆出現異常，請檢查配置',
        actionView: 'ai-engine'
      });
    });
    this.cleanups.push(c3);

    // AI 連接狀態
    const c4 = this.ipc.on('ai-settings-loaded', (data: any) => {
      if (data && !data.success && data.error) {
        this.addNotification({
          type: 'warning',
          icon: '⚠️',
          title: 'AI 配置載入失敗',
          desc: data.error || '無法讀取 AI 設置，請重試',
          actionView: 'ai-engine'
        });
      }
    });
    this.cleanups.push(c4);

    // 新消息/新線索 (可選)
    const c5 = this.ipc.on('new-message-received', (data: any) => {
      if (data?.fromName) {
        this.addNotification({
          type: 'info',
          icon: '💬',
          title: `新消息：${data.fromName}`,
          desc: data.text ? String(data.text).slice(0, 60) : '收到新消息',
          actionView: 'leads'
        });
      }
    });
    this.cleanups.push(c5);
  }
}
