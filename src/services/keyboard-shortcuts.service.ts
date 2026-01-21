/**
 * 鍵盤快捷鍵服務
 * Keyboard Shortcuts Service
 * 
 * 功能：
 * 1. 全局快捷鍵註冊
 * 2. 上下文感知快捷鍵
 * 3. 快捷鍵自定義
 * 4. 快捷鍵提示顯示
 * 5. 衝突檢測
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { ToastService } from '../toast.service';

// 快捷鍵修飾符
export type Modifier = 'ctrl' | 'alt' | 'shift' | 'meta';

// 快捷鍵定義
export interface Shortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];           // 按鍵組合，如 ['ctrl', 'k']
  category: 'navigation' | 'action' | 'ui' | 'editing';
  enabled: boolean;
  action: () => void;
  context?: string;         // 上下文限制，如 'editor', 'dashboard'
  priority?: number;        // 優先級（處理衝突）
}

// 快捷鍵組
export interface ShortcutCategory {
  id: string;
  name: string;
  icon: string;
  shortcuts: Shortcut[];
}

// 按鍵顯示映射
const KEY_DISPLAY: Record<string, string> = {
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  meta: '⌘',
  enter: '↵',
  escape: 'Esc',
  backspace: '⌫',
  delete: 'Del',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  space: '␣',
  tab: '⇥'
};

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private toast = inject(ToastService);
  
  // 所有快捷鍵
  private _shortcuts = signal<Shortcut[]>([]);
  shortcuts = this._shortcuts.asReadonly();
  
  // 是否啟用
  private _enabled = signal(true);
  enabled = this._enabled.asReadonly();
  
  // 當前上下文
  private _context = signal<string>('global');
  context = this._context.asReadonly();
  
  // 是否顯示快捷鍵面板
  private _showPanel = signal(false);
  showPanel = this._showPanel.asReadonly();
  
  // 按分類分組
  shortcutsByCategory = computed(() => {
    const shortcuts = this._shortcuts();
    const categories: ShortcutCategory[] = [
      { id: 'navigation', name: '導航', icon: '🧭', shortcuts: [] },
      { id: 'action', name: '操作', icon: '⚡', shortcuts: [] },
      { id: 'ui', name: '界面', icon: '🎨', shortcuts: [] },
      { id: 'editing', name: '編輯', icon: '✏️', shortcuts: [] }
    ];
    
    for (const shortcut of shortcuts) {
      const category = categories.find(c => c.id === shortcut.category);
      if (category) {
        category.shortcuts.push(shortcut);
      }
    }
    
    return categories.filter(c => c.shortcuts.length > 0);
  });
  
  // 事件監聽器引用
  private keydownHandler: (e: KeyboardEvent) => void;
  
  constructor() {
    this.keydownHandler = this.handleKeydown.bind(this);
    this.loadCustomShortcuts();
    this.registerDefaultShortcuts();
    
    // 添加全局監聽
    document.addEventListener('keydown', this.keydownHandler);
  }
  
  ngOnDestroy() {
    document.removeEventListener('keydown', this.keydownHandler);
  }
  
  /**
   * 載入自定義快捷鍵
   */
  private loadCustomShortcuts() {
    try {
      const customStr = localStorage.getItem('tg-matrix-custom-shortcuts');
      if (customStr) {
        // TODO: 合併自定義設置
      }
    } catch (e) {
      console.error('Failed to load custom shortcuts:', e);
    }
  }
  
  /**
   * 保存自定義快捷鍵
   */
  private saveCustomShortcuts() {
    try {
      const custom = this._shortcuts()
        .filter(s => s.id.startsWith('custom_'))
        .map(s => ({ id: s.id, keys: s.keys, enabled: s.enabled }));
      localStorage.setItem('tg-matrix-custom-shortcuts', JSON.stringify(custom));
    } catch (e) {
      console.error('Failed to save custom shortcuts:', e);
    }
  }
  
  /**
   * 註冊默認快捷鍵
   */
  private registerDefaultShortcuts() {
    const defaults: Omit<Shortcut, 'action'>[] = [
      // 導航
      { id: 'nav_dashboard', name: '儀表板', description: '跳轉到儀表板', keys: ['alt', 'd'], category: 'navigation', enabled: true },
      { id: 'nav_accounts', name: '帳戶管理', description: '跳轉到帳戶管理', keys: ['alt', 'a'], category: 'navigation', enabled: true },
      { id: 'nav_resources', name: '資源中心', description: '跳轉到資源中心', keys: ['alt', 'r'], category: 'navigation', enabled: true },
      { id: 'nav_ai_assistant', name: 'AI 助手', description: '跳轉到 AI 營銷助手', keys: ['alt', 'i'], category: 'navigation', enabled: true },
      { id: 'nav_ai_team', name: 'AI 團隊', description: '跳轉到 AI 團隊銷售', keys: ['alt', 't'], category: 'navigation', enabled: true },
      { id: 'nav_analytics', name: '數據分析', description: '跳轉到智能分析', keys: ['alt', 's'], category: 'navigation', enabled: true },
      
      // 操作
      { id: 'action_search', name: '全局搜索', description: '打開命令面板', keys: ['ctrl', 'k'], category: 'action', enabled: true, priority: 100 },
      { id: 'action_refresh', name: '刷新數據', description: '刷新當前頁面數據', keys: ['ctrl', 'r'], category: 'action', enabled: true },
      { id: 'action_new_message', name: '新消息', description: '打開發送消息對話框', keys: ['ctrl', 'n'], category: 'action', enabled: true },
      { id: 'action_diagnostic', name: '系統診斷', description: '運行一鍵診斷', keys: ['ctrl', 'shift', 'd'], category: 'action', enabled: true },
      { id: 'action_help', name: '幫助中心', description: '打開幫助文檔', keys: ['f1'], category: 'action', enabled: true },
      
      // 界面
      { id: 'ui_toggle_sidebar', name: '切換側邊欄', description: '顯示/隱藏側邊欄', keys: ['ctrl', 'b'], category: 'ui', enabled: true },
      { id: 'ui_toggle_theme', name: '切換主題', description: '切換深色/淺色主題', keys: ['ctrl', 'shift', 't'], category: 'ui', enabled: true },
      { id: 'ui_shortcuts', name: '快捷鍵面板', description: '顯示快捷鍵列表', keys: ['ctrl', '/'], category: 'ui', enabled: true },
      { id: 'ui_close', name: '關閉', description: '關閉當前對話框', keys: ['escape'], category: 'ui', enabled: true },
      
      // 編輯
      { id: 'edit_save', name: '保存', description: '保存當前編輯', keys: ['ctrl', 's'], category: 'editing', enabled: true },
      { id: 'edit_undo', name: '撤銷', description: '撤銷上一步操作', keys: ['ctrl', 'z'], category: 'editing', enabled: true },
      { id: 'edit_select_all', name: '全選', description: '選擇所有項目', keys: ['ctrl', 'a'], category: 'editing', enabled: true },
    ];
    
    // 添加默認快捷鍵（action 需要外部綁定）
    this._shortcuts.set(defaults.map(s => ({
      ...s,
      action: () => this.emitShortcutEvent(s.id)
    })));
  }
  
  /**
   * 處理鍵盤事件
   */
  private handleKeydown(event: KeyboardEvent) {
    if (!this._enabled()) return;
    
    // 忽略輸入框中的快捷鍵（除了特定的）
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // 只處理全局快捷鍵
      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
        return;
      }
    }
    
    // 構建當前按鍵組合
    const keys: string[] = [];
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.altKey) keys.push('alt');
    if (event.shiftKey) keys.push('shift');
    keys.push(event.key.toLowerCase());
    
    // 查找匹配的快捷鍵
    const shortcuts = this._shortcuts();
    const context = this._context();
    
    const matched = shortcuts
      .filter(s => s.enabled)
      .filter(s => !s.context || s.context === context || s.context === 'global')
      .filter(s => this.keysMatch(s.keys, keys))
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    if (matched.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      matched[0].action();
    }
  }
  
  /**
   * 檢查按鍵是否匹配
   */
  private keysMatch(shortcutKeys: string[], pressedKeys: string[]): boolean {
    if (shortcutKeys.length !== pressedKeys.length) return false;
    
    const normalized = shortcutKeys.map(k => k.toLowerCase());
    const pressed = pressedKeys.map(k => k.toLowerCase());
    
    return normalized.every(k => pressed.includes(k)) &&
           pressed.every(k => normalized.includes(k));
  }
  
  /**
   * 發出快捷鍵事件
   */
  private emitShortcutEvent(shortcutId: string) {
    const event = new CustomEvent('shortcut', { detail: { id: shortcutId } });
    window.dispatchEvent(event);
  }
  
  /**
   * 註冊快捷鍵
   */
  register(shortcut: Shortcut): void {
    // 檢查衝突
    const existing = this._shortcuts().find(s => 
      this.keysMatch(s.keys, shortcut.keys) && 
      s.id !== shortcut.id &&
      (!s.context || !shortcut.context || s.context === shortcut.context)
    );
    
    if (existing) {
      console.warn(`Shortcut conflict: ${shortcut.id} conflicts with ${existing.id}`);
    }
    
    this._shortcuts.update(shortcuts => {
      const index = shortcuts.findIndex(s => s.id === shortcut.id);
      if (index >= 0) {
        shortcuts[index] = shortcut;
        return [...shortcuts];
      }
      return [...shortcuts, shortcut];
    });
  }
  
  /**
   * 註銷快捷鍵
   */
  unregister(shortcutId: string): void {
    this._shortcuts.update(shortcuts => 
      shortcuts.filter(s => s.id !== shortcutId)
    );
  }
  
  /**
   * 綁定快捷鍵動作
   */
  bindAction(shortcutId: string, action: () => void): void {
    this._shortcuts.update(shortcuts =>
      shortcuts.map(s => s.id === shortcutId ? { ...s, action } : s)
    );
  }
  
  /**
   * 啟用/禁用快捷鍵
   */
  toggleShortcut(shortcutId: string, enabled: boolean): void {
    this._shortcuts.update(shortcuts =>
      shortcuts.map(s => s.id === shortcutId ? { ...s, enabled } : s)
    );
    this.saveCustomShortcuts();
  }
  
  /**
   * 更新快捷鍵按鍵
   */
  updateKeys(shortcutId: string, keys: string[]): void {
    this._shortcuts.update(shortcuts =>
      shortcuts.map(s => s.id === shortcutId ? { ...s, keys } : s)
    );
    this.saveCustomShortcuts();
  }
  
  /**
   * 設置上下文
   */
  setContext(context: string): void {
    this._context.set(context);
  }
  
  /**
   * 啟用/禁用快捷鍵服務
   */
  toggle(enabled: boolean): void {
    this._enabled.set(enabled);
  }
  
  /**
   * 顯示/隱藏快捷鍵面板
   */
  togglePanel(): void {
    this._showPanel.update(v => !v);
  }
  
  /**
   * 獲取按鍵顯示文本
   */
  getKeyDisplay(keys: string[]): string {
    return keys
      .map(k => KEY_DISPLAY[k.toLowerCase()] || k.toUpperCase())
      .join(' + ');
  }
  
  /**
   * 獲取快捷鍵
   */
  getShortcut(id: string): Shortcut | undefined {
    return this._shortcuts().find(s => s.id === id);
  }
  
  /**
   * 重置為默認
   */
  resetToDefault(): void {
    localStorage.removeItem('tg-matrix-custom-shortcuts');
    this.registerDefaultShortcuts();
    this.toast.success('快捷鍵已重置為默認設置');
  }
}
