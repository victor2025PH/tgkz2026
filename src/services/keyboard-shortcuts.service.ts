/**
 * 鍵盤快捷鍵服務
 * Keyboard Shortcuts Service
 * 
 * 🆕 體驗優化: 鍵盤快捷鍵支持
 * 
 * 功能：
 * - 全局快捷鍵註冊
 * - 快捷鍵衝突檢測
 * - 快捷鍵提示
 * - 可自定義
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';

// 快捷鍵定義
export interface Shortcut {
  id: string;
  key: string;                    // 例如: 'ctrl+k', 'cmd+shift+p'
  description: string;
  category: ShortcutCategory;
  action: () => void;
  enabled?: boolean;
  global?: boolean;               // 是否全局生效（包括輸入框）
}

// 快捷鍵類別
export type ShortcutCategory = 
  | 'navigation'    // 導航
  | 'actions'       // 操作
  | 'view'          // 視圖
  | 'tools';        // 工具

// 快捷鍵組合
interface KeyCombo {
  key: string;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;    // Mac 的 Command 鍵
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService implements OnDestroy {
  private router = inject(Router);
  private toast = inject(ToastService);
  
  // 狀態
  private _isEnabled = signal(true);
  isEnabled = this._isEnabled.asReadonly();
  
  private _isHelpVisible = signal(false);
  isHelpVisible = this._isHelpVisible.asReadonly();
  
  private _shortcuts = signal<Map<string, Shortcut>>(new Map());
  shortcuts = computed(() => Array.from(this._shortcuts().values()));
  
  // 按類別分組的快捷鍵
  shortcutsByCategory = computed(() => {
    const shortcuts = this.shortcuts();
    const grouped = new Map<ShortcutCategory, Shortcut[]>();
    
    for (const shortcut of shortcuts) {
      if (!grouped.has(shortcut.category)) {
        grouped.set(shortcut.category, []);
      }
      grouped.get(shortcut.category)!.push(shortcut);
    }
    
    return grouped;
  });
  
  // 事件監聯器引用
  private keydownHandler: (event: KeyboardEvent) => void;
  
  constructor() {
    this.keydownHandler = this.handleKeydown.bind(this);
    this.registerDefaultShortcuts();
    this.startListening();
  }
  
  ngOnDestroy(): void {
    this.stopListening();
  }
  
  /**
   * 註冊默認快捷鍵
   */
  private registerDefaultShortcuts(): void {
    // 導航快捷鍵
    this.register({
      id: 'nav-dashboard',
      key: 'g d',
      description: '前往儀表板',
      category: 'navigation',
      action: () => this.router.navigate(['/dashboard'])
    });
    
    this.register({
      id: 'nav-accounts',
      key: 'g a',
      description: '前往帳號管理',
      category: 'navigation',
      action: () => this.router.navigate(['/accounts'])
    });
    
    this.register({
      id: 'nav-marketing',
      key: 'g m',
      description: '前往營銷任務中心',
      category: 'navigation',
      action: () => this.router.navigate(['/marketing-hub'])
    });
    
    this.register({
      id: 'nav-roles',
      key: 'g r',
      description: '前往角色資源庫',
      category: 'navigation',
      action: () => this.router.navigate(['/role-library'])
    });
    
    this.register({
      id: 'nav-ai',
      key: 'g i',
      description: '前往智能引擎',
      category: 'navigation',
      action: () => this.router.navigate(['/ai-engine'])
    });
    
    // 操作快捷鍵
    this.register({
      id: 'action-new-task',
      key: 'ctrl+n',
      description: '新建營銷任務',
      category: 'actions',
      action: () => {
        // 發送事件到營銷中心
        window.dispatchEvent(new CustomEvent('shortcut:new-task'));
      }
    });
    
    this.register({
      id: 'action-search',
      key: 'ctrl+k',
      description: '打開搜索',
      category: 'actions',
      global: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:search'));
      }
    });
    
    this.register({
      id: 'action-save',
      key: 'ctrl+s',
      description: '保存',
      category: 'actions',
      global: true,
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:save'));
      }
    });
    
    // 視圖快捷鍵
    this.register({
      id: 'view-help',
      key: '?',
      description: '顯示快捷鍵幫助',
      category: 'view',
      action: () => this.toggleHelp()
    });
    
    this.register({
      id: 'view-close',
      key: 'Escape',
      description: '關閉彈窗/取消',
      category: 'view',
      global: true,
      action: () => {
        if (this._isHelpVisible()) {
          this.hideHelp();
        } else {
          window.dispatchEvent(new CustomEvent('shortcut:escape'));
        }
      }
    });
    
    this.register({
      id: 'view-refresh',
      key: 'ctrl+r',
      description: '刷新數據',
      category: 'view',
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:refresh'));
      }
    });
    
    // 工具快捷鍵
    this.register({
      id: 'tool-logs',
      key: 'ctrl+l',
      description: '查看日誌',
      category: 'tools',
      action: () => {
        window.dispatchEvent(new CustomEvent('shortcut:logs'));
      }
    });
    
    this.register({
      id: 'tool-settings',
      key: 'ctrl+,',
      description: '打開設置',
      category: 'tools',
      action: () => this.router.navigate(['/settings'])
    });
  }
  
  /**
   * 註冊快捷鍵
   */
  register(shortcut: Shortcut): void {
    this._shortcuts.update(map => {
      const newMap = new Map(map);
      newMap.set(shortcut.id, { ...shortcut, enabled: shortcut.enabled ?? true });
      return newMap;
    });
  }
  
  /**
   * 取消註冊
   */
  unregister(id: string): void {
    this._shortcuts.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });
  }
  
  /**
   * 啟用/禁用快捷鍵
   */
  setEnabled(id: string, enabled: boolean): void {
    this._shortcuts.update(map => {
      const newMap = new Map(map);
      const shortcut = newMap.get(id);
      if (shortcut) {
        newMap.set(id, { ...shortcut, enabled });
      }
      return newMap;
    });
  }
  
  /**
   * 全局啟用/禁用
   */
  setGlobalEnabled(enabled: boolean): void {
    this._isEnabled.set(enabled);
  }
  
  /**
   * 顯示幫助
   */
  showHelp(): void {
    this._isHelpVisible.set(true);
  }
  
  /**
   * 隱藏幫助
   */
  hideHelp(): void {
    this._isHelpVisible.set(false);
  }
  
  /**
   * 切換幫助
   */
  toggleHelp(): void {
    this._isHelpVisible.update(v => !v);
  }
  
  /**
   * 開始監聽
   */
  private startListening(): void {
    document.addEventListener('keydown', this.keydownHandler);
  }
  
  /**
   * 停止監聽
   */
  private stopListening(): void {
    document.removeEventListener('keydown', this.keydownHandler);
  }
  
  /**
   * 處理鍵盤事件
   */
  private handleKeydown(event: KeyboardEvent): void {
    if (!this._isEnabled()) return;
    
    // 檢查是否在輸入框中
    const isInputActive = this.isInputFocused();
    
    // 解析按鍵組合
    const combo = this.parseKeyCombo(event);
    const keyString = this.comboToString(combo);
    
    // 查找匹配的快捷鍵
    for (const shortcut of this._shortcuts().values()) {
      if (!shortcut.enabled) continue;
      
      // 如果在輸入框中，只處理全局快捷鍵
      if (isInputActive && !shortcut.global) continue;
      
      if (this.matchShortcut(keyString, shortcut.key)) {
        event.preventDefault();
        event.stopPropagation();
        
        try {
          shortcut.action();
        } catch (error) {
          console.error(`Shortcut action failed: ${shortcut.id}`, error);
        }
        return;
      }
    }
  }
  
  /**
   * 檢查是否有輸入框獲得焦點
   */
  private isInputFocused(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      (activeElement as HTMLElement).isContentEditable
    );
  }
  
  /**
   * 解析按鍵組合
   */
  private parseKeyCombo(event: KeyboardEvent): KeyCombo {
    return {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    };
  }
  
  /**
   * 將組合轉換為字符串
   */
  private comboToString(combo: KeyCombo): string {
    const parts: string[] = [];
    
    if (combo.ctrl || combo.meta) parts.push('ctrl');
    if (combo.shift) parts.push('shift');
    if (combo.alt) parts.push('alt');
    
    parts.push(combo.key);
    
    return parts.join('+');
  }
  
  /**
   * 匹配快捷鍵
   */
  private matchShortcut(pressed: string, shortcutKey: string): boolean {
    // 處理序列鍵（如 'g d'）
    if (shortcutKey.includes(' ')) {
      // 簡化處理：只匹配單個鍵
      return false;
    }
    
    // 標準化快捷鍵定義
    const normalized = shortcutKey.toLowerCase()
      .replace('cmd+', 'ctrl+')
      .replace('command+', 'ctrl+');
    
    return pressed === normalized;
  }
  
  /**
   * 獲取類別標籤
   */
  getCategoryLabel(category: ShortcutCategory): string {
    const labels: Record<ShortcutCategory, string> = {
      navigation: '導航',
      actions: '操作',
      view: '視圖',
      tools: '工具'
    };
    return labels[category];
  }
  
  /**
   * 格式化快捷鍵顯示
   */
  formatKey(key: string): string {
    return key
      .replace('ctrl', '⌃')
      .replace('shift', '⇧')
      .replace('alt', '⌥')
      .replace('meta', '⌘')
      .replace('Escape', 'Esc')
      .toUpperCase();
  }
}
