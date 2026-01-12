/**
 * Keyboard Shortcuts Service
 * Provides global keyboard shortcut handling for the application
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

export interface Shortcut {
  key: string;           // The key (e.g., 's', 'Escape', 'Enter')
  ctrl?: boolean;        // Requires Ctrl/Cmd key
  shift?: boolean;       // Requires Shift key
  alt?: boolean;         // Requires Alt/Option key
  description: string;   // Human-readable description
  action: () => void;    // Action to perform
  context?: string;      // Context where this shortcut is active (e.g., 'global', 'dialog', 'accounts')
}

export interface ShortcutDisplay {
  keys: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private shortcuts: Shortcut[] = [];
  private enabled = true;
  private isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  // Signal to show/hide shortcuts help dialog
  showHelp: WritableSignal<boolean> = signal(false);
  
  constructor() {
    // Set up global keyboard listener
    document.addEventListener('keydown', (event) => this.handleKeyDown(event));
  }
  
  /**
   * Register a keyboard shortcut
   */
  register(shortcut: Shortcut): void {
    // Remove existing shortcut with same key combination
    this.shortcuts = this.shortcuts.filter(s => 
      !(s.key === shortcut.key && 
        s.ctrl === shortcut.ctrl && 
        s.shift === shortcut.shift && 
        s.alt === shortcut.alt &&
        s.context === shortcut.context)
    );
    
    this.shortcuts.push(shortcut);
  }
  
  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean, context?: string): void {
    this.shortcuts = this.shortcuts.filter(s => 
      !(s.key === key && 
        s.ctrl === ctrl && 
        s.shift === shift && 
        s.alt === alt &&
        s.context === context)
    );
  }
  
  /**
   * Unregister all shortcuts for a context
   */
  unregisterContext(context: string): void {
    this.shortcuts = this.shortcuts.filter(s => s.context !== context);
  }
  
  /**
   * Enable/disable all shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Handle keydown event
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    // Don't trigger shortcuts when typing in input fields (unless it's Escape)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' || 
                        target.tagName === 'TEXTAREA' || 
                        target.isContentEditable;
    
    // Allow Escape in input fields
    if (isInputField && event.key !== 'Escape') {
      return;
    }
    
    // Find matching shortcut
    const matchingShortcut = this.shortcuts.find(s => {
      const keyMatch = s.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = s.ctrl ? (event.ctrlKey || event.metaKey) : !(event.ctrlKey || event.metaKey);
      const shiftMatch = s.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = s.alt ? event.altKey : !event.altKey;
      
      return keyMatch && ctrlMatch && shiftMatch && altMatch;
    });
    
    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }
  
  /**
   * Get all registered shortcuts for display
   */
  getShortcutsForDisplay(): ShortcutDisplay[] {
    return this.shortcuts.map(s => ({
      keys: this.formatShortcut(s),
      description: s.description
    }));
  }
  
  /**
   * Format shortcut for display
   */
  private formatShortcut(shortcut: Shortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrl) {
      parts.push(this.isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.alt) {
      parts.push(this.isMac ? '⌥' : 'Alt');
    }
    if (shortcut.shift) {
      parts.push(this.isMac ? '⇧' : 'Shift');
    }
    
    // Format special keys
    let key = shortcut.key;
    switch (key.toLowerCase()) {
      case 'escape': key = 'Esc'; break;
      case 'enter': key = this.isMac ? '↵' : 'Enter'; break;
      case 'arrowup': key = '↑'; break;
      case 'arrowdown': key = '↓'; break;
      case 'arrowleft': key = '←'; break;
      case 'arrowright': key = '→'; break;
      case ' ': key = 'Space'; break;
      default: key = key.toUpperCase();
    }
    
    parts.push(key);
    
    return parts.join(this.isMac ? '' : '+');
  }
  
  /**
   * Toggle shortcuts help dialog
   */
  toggleHelp(): void {
    this.showHelp.update(v => !v);
  }
  
  /**
   * Register common shortcuts
   */
  registerCommonShortcuts(handlers: {
    save?: () => void;
    cancel?: () => void;
    refresh?: () => void;
    newItem?: () => void;
    delete?: () => void;
    search?: () => void;
    toggleSidebar?: () => void;
    help?: () => void;
    oneClickRun?: () => void;
    stopAll?: () => void;
  }): void {
    // Ctrl+S: Save
    if (handlers.save) {
      this.register({
        key: 's',
        ctrl: true,
        description: '保存',
        action: handlers.save,
        context: 'global'
      });
    }
    
    // Escape: Cancel/Close dialog
    if (handlers.cancel) {
      this.register({
        key: 'Escape',
        description: '取消/關閉',
        action: handlers.cancel,
        context: 'global'
      });
    }
    
    // Ctrl+R or F5: Refresh
    if (handlers.refresh) {
      this.register({
        key: 'r',
        ctrl: true,
        description: '刷新',
        action: handlers.refresh,
        context: 'global'
      });
    }
    
    // Ctrl+N: New item
    if (handlers.newItem) {
      this.register({
        key: 'n',
        ctrl: true,
        description: '新建',
        action: handlers.newItem,
        context: 'global'
      });
    }
    
    // Delete: Delete selected
    if (handlers.delete) {
      this.register({
        key: 'Delete',
        description: '刪除選中',
        action: handlers.delete,
        context: 'global'
      });
    }
    
    // Ctrl+F: Search
    if (handlers.search) {
      this.register({
        key: 'f',
        ctrl: true,
        description: '搜索',
        action: handlers.search,
        context: 'global'
      });
    }
    
    // Ctrl+B: Toggle sidebar
    if (handlers.toggleSidebar) {
      this.register({
        key: 'b',
        ctrl: true,
        description: '切換側邊欄',
        action: handlers.toggleSidebar,
        context: 'global'
      });
    }
    
    // F1 or Ctrl+?: Help
    if (handlers.help) {
      this.register({
        key: 'F1',
        description: '幫助',
        action: handlers.help,
        context: 'global'
      });
      
      this.register({
        key: '?',
        ctrl: true,
        shift: true,
        description: '快捷鍵幫助',
        action: () => this.toggleHelp(),
        context: 'global'
      });
    }
    
    // Ctrl+Enter: One-click run
    if (handlers.oneClickRun) {
      this.register({
        key: 'Enter',
        ctrl: true,
        description: '一鍵啟動',
        action: handlers.oneClickRun,
        context: 'global'
      });
    }
    
    // Ctrl+Shift+S: Stop all
    if (handlers.stopAll) {
      this.register({
        key: 's',
        ctrl: true,
        shift: true,
        description: '停止所有',
        action: handlers.stopAll,
        context: 'global'
      });
    }
  }
  
  /**
   * Register navigation shortcuts (1-9 for tabs)
   */
  registerNavigationShortcuts(navigateTo: (index: number) => void): void {
    for (let i = 1; i <= 9; i++) {
      this.register({
        key: i.toString(),
        alt: true,
        description: `跳轉到標籤 ${i}`,
        action: () => navigateTo(i - 1),
        context: 'navigation'
      });
    }
  }
}
