/**
 * MessagesService — 全局消息中心
 *
 * 架構優化點：
 *  - 單例服務：IPC 監聽在應用啟動時即常駐，無論用戶是否打開消息頁面，消息都會被收集
 *  - localStorage 持久化：重啟後消息不丟失（最多保留 100 條）
 *  - 自動去重：同一標題 5 秒內不重複入庫，防止 IPC 事件刷屏
 *  - 統一入口：sidebar 角標、消息頁面共用同一個 signal，保持同步
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

const STORAGE_KEY = 'tgkz_messages_v1';
const MAX_MESSAGES = 100;
const DEDUP_WINDOW_MS = 5000;

@Injectable({ providedIn: 'root' })
export class MessagesService {
  private ipc = inject(ElectronIpcService);

  private _messages = signal<AppMessage[]>(this.loadFromStorage());
  readonly messages = this._messages.asReadonly();

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

  // 去重緩存：title → lastAdded timestamp
  private dedup = new Map<string, number>();

  constructor() {
    // 持久化：每次 messages 變化自動寫入 localStorage
    effect(() => {
      const msgs = this._messages();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
      } catch { /* quota exceeded — ignore */ }
    });

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

    this._messages.update(prev =>
      [entry, ...prev].slice(0, MAX_MESSAGES)
    );
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

  // ── IPC 常駐監聽 ─────────────────────────────────────────────
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

    // 規則觸發
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

    // 新線索採集
    this.ipc.on('new-lead-captured', (data: any) => {
      this.add({
        category: 'lead', icon: '👤',
        title: `新線索：${data?.username || data?.name || '未知用戶'}`,
        summary: `來源：${data?.groupName || data?.source || '群組採集'}，狀態：新線索`,
        actionView: 'lead-nurturing',
      });
    });

    // 任務進度
    this.ipc.on('task-progress', (data: any) => {
      this.add({
        category: 'task', icon: '📋',
        title: `任務更新：${data?.taskName || data?.name || '行銷任務'}`,
        summary: data?.message || `已發送 ${data?.sent || 0}/${data?.total || 0} 條消息`,
        actionView: 'campaigns',
      });
    });

    // AI 錯誤
    this.ipc.on('ai-error', (data: any) => {
      this.add({
        category: 'alert', icon: '🚨',
        title: 'AI 引擎錯誤',
        summary: data?.message || data?.error || 'AI 回覆出現異常，請檢查 AI 引擎配置',
        actionView: 'ai-engine',
      });
    });

    // 消息發送失敗
    this.ipc.on('message-send-failed', (data: any) => {
      this.add({
        category: 'alert', icon: '❌',
        title: '消息發送失敗',
        summary: data?.reason || `發送至 ${data?.target || '目標'} 失敗，請檢查帳號狀態`,
        actionView: 'accounts',
      });
    });
  }

  // ── localStorage ─────────────────────────────────────────────
  private loadFromStorage(): AppMessage[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.seedDemo();
      const parsed: AppMessage[] = JSON.parse(raw);
      // 若已有持久化數據，直接返回（首次啟動才顯示示例）
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : this.seedDemo();
    } catch {
      return this.seedDemo();
    }
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
        title: '群廣播任務完成',
        summary: '任務「週末促銷」已完成，成功發送 82/100 條',
        time: new Date(now - 26 * 3600000).toISOString(),
        actionView: 'campaigns',
      },
      {
        id: 'demo-4', category: 'alert', icon: '🚨', read: true,
        title: '消息發送失敗 3 次',
        summary: '帳號連續發送失敗，可能因頻率限制，建議降低發送速率',
        time: new Date(now - 27 * 3600000).toISOString(),
        actionView: 'accounts',
      },
    ];
  }
}
