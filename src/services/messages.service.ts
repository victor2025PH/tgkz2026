/**
 * MessagesService — 全局消息中心
 *
 * P3 升級：
 *  - nowTick signal：每 60 秒更新，驅動 UI 相對時間自動刷新，無需手動重載
 *  - 對齊後端真實 IPC 事件名稱（移除 task-progress/message-send-failed 幽靈事件）
 *  - 新增 alert-triggered、monitoring-start-failed、monitoring-status-changed、campaign-complete
 *  - 提示音：Web Audio API 生成，無需音頻文件；soundEnabled 持久化至 localStorage
 */
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';

export type MsgCategory = 'system' | 'rule' | 'lead' | 'task' | 'alert';
export type TabCategory = 'all' | MsgCategory;

export interface AppMessage {
  id: string;
  category: MsgCategory;
  icon: string;
  title: string;
  summary: string;
  time: string;     // ISO string — serialisable for localStorage
  read: boolean;
  actionView?: string;
}

const STORAGE_KEY   = 'tgkz_messages_v1';
const SOUND_KEY     = 'tgkz_msg_sound';
const MAX_MESSAGES  = 100;
const DEDUP_WINDOW_MS = 5000;
const TICK_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private ipc = inject(ElectronIpcService);

  // ── 消息狀態 ─────────────────────────────────────────────────
  private _messages = signal<AppMessage[]>(this.loadFromStorage());
  readonly messages = this._messages.asReadonly();

  // ── 時鐘 Tick（每分鐘更新，驅動相對時間顯示刷新）────────────
  readonly nowMs = signal(Date.now());

  // ── 提示音開關 ───────────────────────────────────────────────
  readonly soundEnabled = signal<boolean>(
    localStorage.getItem(SOUND_KEY) !== 'false'   // 預設開啟
  );

  readonly unreadCount = computed(() =>
    this._messages().filter(m => !m.read).length
  );

  readonly unreadByCategory = computed(() => {
    const result: Record<MsgCategory, number> = { system: 0, rule: 0, lead: 0, task: 0, alert: 0 };
    for (const m of this._messages()) {
      if (!m.read) result[m.category]++;
    }
    return result;
  });

  private idCnt = 0;
  private dedup = new Map<string, number>();

  constructor() {
    // 持久化消息
    effect(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._messages())); }
      catch { /* quota exceeded */ }
    });

    // 持久化音效設定
    effect(() => {
      localStorage.setItem(SOUND_KEY, String(this.soundEnabled()));
    });

    // 每分鐘更新時鐘（驅動相對時間刷新）
    setInterval(() => this.nowMs.set(Date.now()), TICK_INTERVAL_MS);

    this.setupIpcListeners();
  }

  // ── 公開方法 ────────────────────────────────────────────────
  add(msg: Omit<AppMessage, 'id' | 'time' | 'read'>) {
    const now = Date.now();
    const lastAdded = this.dedup.get(msg.title);
    if (lastAdded && now - lastAdded < DEDUP_WINDOW_MS) return;
    this.dedup.set(msg.title, now);

    const entry: AppMessage = {
      ...msg,
      id: `msg-${now}-${this.idCnt++}`,
      time: new Date(now).toISOString(),
      read: false,
    };

    this._messages.update(prev => [entry, ...prev].slice(0, MAX_MESSAGES));

    // 提示音（不在消息頁面時才播放）
    if (this.soundEnabled()) {
      this.playNotifSound();
    }
  }

  markAllRead() {
    this._messages.update(prev => prev.map(m => ({ ...m, read: true })));
  }

  markRead(id: string) {
    this._messages.update(prev =>
      prev.map(m => m.id === id ? { ...m, read: true } : m)
    );
  }

  remove(id: string) {
    this._messages.update(prev => prev.filter(m => m.id !== id));
  }

  clearCategory(cat: TabCategory) {
    if (cat === 'all') {
      this._messages.set([]);
    } else {
      this._messages.update(prev => prev.filter(m => m.category !== cat));
    }
  }

  toggleSound() {
    this.soundEnabled.update(v => !v);
  }

  // ── 提示音（Web Audio API，無需音頻文件）────────────────────
  private playNotifSound() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
      osc.onended = () => ctx.close();
    } catch { /* AudioContext unavailable */ }
  }

  // ── IPC 常駐監聽（使用後端真實事件名稱）─────────────────────
  private setupIpcListeners() {

    // 帳號斷線
    this.ipc.on('accounts-data', (accs: any[]) => {
      const offline = (accs || []).filter(
        (a: any) => String(a.status) === 'disconnected' || String(a.status) === 'error'
      );
      if (offline.length > 0) {
        this.add({
          category: 'system', icon: '📱',
          title: `${offline.length} 個帳號已斷線`,
          summary: offline.slice(0, 3).map((a: any) => a.phone || a.username || String(a.id)).join('、')
                   + (offline.length > 3 ? ' 等' : ''),
          actionView: 'accounts',
        });
      }
    });

    // 規則觸發（後端事件：rule-triggered）
    this.ipc.on('rule-triggered', (data: any) => {
      const name = data?.ruleName || data?.rule_name;
      if (name) {
        this.add({
          category: 'rule', icon: '⚡',
          title: `規則「${name}」觸發`,
          summary: data.keyword
            ? `關鍵詞「${data.keyword}」匹配，執行 ${data.responseType || '自動回覆'}`
            : '關鍵詞匹配成功，已執行自動回覆',
          actionView: 'trigger-rules',
        });
      }
    });

    // 新線索採集（後端事件：new-lead-captured）
    this.ipc.on('new-lead-captured', (data: any) => {
      this.add({
        category: 'lead', icon: '👤',
        title: `新線索：${data?.username || data?.name || data?.first_name || '未知用戶'}`,
        summary: `來源：${data?.groupName || data?.group_name || data?.source || '群組採集'}，狀態：新線索`,
        actionView: 'lead-nurturing',
      });
    });

    // AI 錯誤（後端事件：ai-error）
    this.ipc.on('ai-error', (data: any) => {
      this.add({
        category: 'alert', icon: '🚨',
        title: 'AI 引擎錯誤',
        summary: data?.message || data?.error || 'AI 回覆出現異常，請檢查 AI 引擎配置',
        actionView: 'ai-engine',
      });
    });

    // 系統告警（後端事件：alert-triggered，對應 Alert 結構）
    this.ipc.on('alert-triggered', (alert: any) => {
      const isError = alert?.level === 'error' || alert?.level === 'critical';
      this.add({
        category: isError ? 'alert' : 'system',
        icon: isError ? '🚨' : '⚠️',
        title: alert?.alert_type
          ? `系統告警：${alert.alert_type.replace(/_/g, ' ')}`
          : '系統告警',
        summary: alert?.message || '請查看詳情',
        actionView: isError ? 'monitoring' : undefined,
      });
    });

    // 監控啟動失敗（後端事件：monitoring-start-failed）
    this.ipc.on('monitoring-start-failed', (data: any) => {
      this.add({
        category: 'alert', icon: '❌',
        title: '監控啟動失敗',
        summary: data?.message || data?.reason || '請檢查帳號狀態和群組配置',
        actionView: 'monitoring-groups',
      });
    });

    // 監控狀態變化（後端事件：monitoring-status-changed）
    this.ipc.on('monitoring-status-changed', (active: boolean) => {
      if (!active) {
        this.add({
          category: 'system', icon: '📡',
          title: '監控已停止',
          summary: '消息監控已關閉，觸發規則暫停，點擊前往運控中心重新啟動',
          actionView: 'dashboard',
        });
      }
    });

    // 行銷任務完成（後端事件：campaign-complete）
    this.ipc.on('campaign-complete', (data: any) => {
      const success = data?.stats?.success || 0;
      const failed  = data?.stats?.failed  || 0;
      const total   = success + failed;
      this.add({
        category: 'task', icon: '📋',
        title: data?.success
          ? `行銷任務完成：${data?.name || '群廣播'}`
          : `行銷任務失敗`,
        summary: total > 0
          ? `成功發送 ${success}/${total} 條${failed > 0 ? `，${failed} 條失敗` : ''}`
          : data?.message || '任務已結束',
        actionView: 'campaigns',
      });
    });
  }

  // ── localStorage ─────────────────────────────────────────────
  private loadFromStorage(): AppMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: AppMessage[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* invalid JSON */ }
    return this.seedDemo();
  }

  private seedDemo(): AppMessage[] {
    const now = Date.now();
    return [
      {
        id: 'demo-0', category: 'rule', icon: '⚡', read: false,
        title: '規則「優惠促銷」觸發',
        summary: '關鍵詞「打折」匹配，已向 @user_demo 發送模板回覆',
        time: new Date(now - 5 * 60000).toISOString(),
        actionView: 'trigger-rules',
      },
      {
        id: 'demo-1', category: 'lead', icon: '👤', read: false,
        title: '新採集線索：@crypto_fan',
        summary: '來源：幣圈討論群，狀態：新線索，待跟進',
        time: new Date(now - 18 * 60000).toISOString(),
        actionView: 'lead-nurturing',
      },
      {
        id: 'demo-2', category: 'system', icon: '🔧', read: true,
        title: 'AI 模型連接待驗證',
        summary: '上次驗證已超過 30 分鐘，建議重新測試連接',
        time: new Date(now - 2 * 3600000).toISOString(),
        actionView: 'ai-engine',
      },
      {
        id: 'demo-3', category: 'task', icon: '📋', read: true,
        title: '行銷任務完成：週末促銷',
        summary: '成功發送 82/100 條，18 條因帳號限制跳過',
        time: new Date(now - 26 * 3600000).toISOString(),
        actionView: 'campaigns',
      },
      {
        id: 'demo-4', category: 'alert', icon: '🚨', read: true,
        title: '系統告警：帳號頻率限制',
        summary: '帳號連續發送失敗，可能因頻率限制，建議降低發送速率',
        time: new Date(now - 27 * 3600000).toISOString(),
        actionView: 'accounts',
      },
    ];
  }
}
