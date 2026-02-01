/**
 * TG-Matrix 可訪問性模組
 * Phase D: UI/UX - 可訪問性
 *
 * 提供：
 * 1. ARIA 屬性管理
 * 2. 鍵盤導航
 * 3. 焦點管理
 * 4. 螢幕閱讀器支持
 */

import { Injectable, signal, computed, ElementRef } from '@angular/core';

// ==================== ARIA 工具 ====================

export interface AriaLiveOptions {
  politeness: 'off' | 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
}

export interface FocusTrapConfig {
  element: HTMLElement;
  initialFocus?: HTMLElement | string;
  returnFocus?: HTMLElement;
  escapeDeactivates?: boolean;
}

// ==================== 鍵盤快捷鍵 ====================

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  description: string;
  action: () => void;
  scope?: string;
  enabled?: boolean;
}

// ==================== 焦點管理器 ====================

export class FocusManager {
  private focusHistory: HTMLElement[] = [];
  private maxHistory = 10;

  /**
   * 將焦點移至元素
   */
  focusElement(element: HTMLElement | string, options?: FocusOptions): boolean {
    const el = typeof element === 'string'
      ? document.querySelector<HTMLElement>(element)
      : element;

    if (!el) return false;

    // 保存當前焦點
    if (document.activeElement instanceof HTMLElement) {
      this.pushFocusHistory(document.activeElement);
    }

    el.focus(options);
    return document.activeElement === el;
  }

  /**
   * 恢復上一個焦點
   */
  restoreFocus(): boolean {
    const previous = this.focusHistory.pop();
    if (previous && document.body.contains(previous)) {
      previous.focus();
      return true;
    }
    return false;
  }

  /**
   * 獲取可聚焦元素
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll<HTMLElement>(selector))
      .filter(el => {
        // 排除不可見元素
        const style = getComputedStyle(el);
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               el.offsetParent !== null;
      });
  }

  /**
   * 聚焦第一個可聚焦元素
   */
  focusFirst(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
      return true;
    }
    return false;
  }

  /**
   * 聚焦最後一個可聚焦元素
   */
  focusLast(container: HTMLElement): boolean {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus();
      return true;
    }
    return false;
  }

  private pushFocusHistory(element: HTMLElement) {
    this.focusHistory.push(element);
    if (this.focusHistory.length > this.maxHistory) {
      this.focusHistory.shift();
    }
  }
}

// ==================== 焦點陷阱 ====================

export class FocusTrap {
  private config: FocusTrapConfig;
  private active = false;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(config: FocusTrapConfig) {
    this.config = config;
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  /**
   * 啟動焦點陷阱
   */
  activate() {
    if (this.active) return;

    this.active = true;
    document.addEventListener('keydown', this.handleKeyDown);

    // 設置初始焦點
    const initialFocus = typeof this.config.initialFocus === 'string'
      ? this.config.element.querySelector<HTMLElement>(this.config.initialFocus)
      : this.config.initialFocus;

    if (initialFocus) {
      initialFocus.focus();
    } else {
      // 聚焦第一個可聚焦元素
      const focusManager = new FocusManager();
      focusManager.focusFirst(this.config.element);
    }
  }

  /**
   * 停用焦點陷阱
   */
  deactivate() {
    if (!this.active) return;

    this.active = false;
    document.removeEventListener('keydown', this.handleKeyDown);

    // 恢復焦點
    if (this.config.returnFocus) {
      this.config.returnFocus.focus();
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (!this.active) return;

    // ESC 退出
    if (e.key === 'Escape' && this.config.escapeDeactivates !== false) {
      e.preventDefault();
      this.deactivate();
      return;
    }

    // Tab 循環
    if (e.key === 'Tab') {
      const focusManager = new FocusManager();
      const focusable = focusManager.getFocusableElements(this.config.element);

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement;

      if (e.shiftKey && current === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && current === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}

// ==================== ARIA Live Region ====================

export class AriaLiveRegion {
  private container: HTMLElement;

  constructor(options: AriaLiveOptions = { politeness: 'polite' }) {
    this.container = document.createElement('div');
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', options.politeness);
    this.container.setAttribute('aria-atomic', String(options.atomic ?? true));

    if (options.relevant) {
      this.container.setAttribute('aria-relevant', options.relevant);
    }

    // 視覺隱藏但對螢幕閱讀器可見
    Object.assign(this.container.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0'
    });

    document.body.appendChild(this.container);
  }

  /**
   * 通知螢幕閱讀器
   */
  announce(message: string, delay = 100) {
    // 清空後重新設置以觸發通知
    this.container.textContent = '';

    setTimeout(() => {
      this.container.textContent = message;
    }, delay);
  }

  /**
   * 銷毀
   */
  destroy() {
    this.container.remove();
  }
}

// ==================== 可訪問性服務 ====================

@Injectable({
  providedIn: 'root'
})
export class AccessibilityService {
  // 狀態
  private _reducedMotion = signal(false);
  private _highContrast = signal(false);
  private _screenReaderActive = signal(false);

  // 快捷鍵
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private globalKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  // 焦點管理器
  readonly focusManager = new FocusManager();

  // Live region
  private liveRegion: AriaLiveRegion | null = null;

  // 計算屬性
  readonly reducedMotion = computed(() => this._reducedMotion());
  readonly highContrast = computed(() => this._highContrast());
  readonly screenReaderActive = computed(() => this._screenReaderActive());

  constructor() {
    this.detectPreferences();
    this.initGlobalKeyHandler();
    this.initLiveRegion();
  }

  // ==================== 偏好檢測 ====================

  private detectPreferences() {
    // 檢測減少動畫偏好
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._reducedMotion.set(motionQuery.matches);
    motionQuery.addEventListener('change', (e) => {
      this._reducedMotion.set(e.matches);
    });

    // 檢測高對比度
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    this._highContrast.set(contrastQuery.matches);
    contrastQuery.addEventListener('change', (e) => {
      this._highContrast.set(e.matches);
    });
  }

  // ==================== 快捷鍵管理 ====================

  /**
   * 註冊快捷鍵
   */
  registerShortcut(id: string, shortcut: KeyboardShortcut) {
    this.shortcuts.set(id, { ...shortcut, enabled: shortcut.enabled ?? true });
  }

  /**
   * 移除快捷鍵
   */
  unregisterShortcut(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * 啟用/禁用快捷鍵
   */
  toggleShortcut(id: string, enabled: boolean) {
    const shortcut = this.shortcuts.get(id);
    if (shortcut) {
      shortcut.enabled = enabled;
    }
  }

  /**
   * 獲取所有快捷鍵
   */
  getShortcuts(scope?: string): KeyboardShortcut[] {
    const shortcuts = Array.from(this.shortcuts.values());
    return scope
      ? shortcuts.filter(s => s.scope === scope)
      : shortcuts;
  }

  private initGlobalKeyHandler() {
    this.globalKeyHandler = (e: KeyboardEvent) => {
      // 忽略輸入框中的快捷鍵
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // 只處理 Escape
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of this.shortcuts.values()) {
        if (!shortcut.enabled) continue;

        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const mods = shortcut.modifiers || {};

        const modsMatch =
          (!!mods.ctrl === e.ctrlKey) &&
          (!!mods.alt === e.altKey) &&
          (!!mods.shift === e.shiftKey) &&
          (!!mods.meta === e.metaKey);

        if (keyMatch && modsMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    };

    document.addEventListener('keydown', this.globalKeyHandler);
  }

  // ==================== 螢幕閱讀器通知 ====================

  private initLiveRegion() {
    this.liveRegion = new AriaLiveRegion({ politeness: 'polite' });
  }

  /**
   * 通知螢幕閱讀器
   */
  announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
    if (politeness === 'assertive') {
      // 創建臨時 assertive region
      const region = new AriaLiveRegion({ politeness: 'assertive' });
      region.announce(message);
      setTimeout(() => region.destroy(), 1000);
    } else {
      this.liveRegion?.announce(message);
    }
  }

  // ==================== 焦點陷阱 ====================

  /**
   * 創建焦點陷阱
   */
  createFocusTrap(config: FocusTrapConfig): FocusTrap {
    return new FocusTrap(config);
  }

  // ==================== ARIA 輔助 ====================

  /**
   * 設置 ARIA 屬性
   */
  setAriaAttribute(element: HTMLElement, attribute: string, value: string | boolean) {
    if (typeof value === 'boolean') {
      element.setAttribute(`aria-${attribute}`, String(value));
    } else {
      element.setAttribute(`aria-${attribute}`, value);
    }
  }

  /**
   * 設置多個 ARIA 屬性
   */
  setAriaAttributes(element: HTMLElement, attributes: Record<string, string | boolean>) {
    for (const [key, value] of Object.entries(attributes)) {
      this.setAriaAttribute(element, key, value);
    }
  }

  /**
   * 創建 ID 引用
   */
  createIdRef(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==================== 鍵盤導航輔助 ====================

  /**
   * 箭頭鍵導航
   */
  handleArrowNavigation(
    e: KeyboardEvent,
    items: HTMLElement[],
    options: {
      orientation?: 'horizontal' | 'vertical' | 'both';
      loop?: boolean;
    } = {}
  ): HTMLElement | null {
    const { orientation = 'vertical', loop = true } = options;
    const current = items.findIndex(el => el === document.activeElement);

    if (current === -1) return null;

    let next = current;

    switch (e.key) {
      case 'ArrowUp':
        if (orientation === 'horizontal') return null;
        next = current - 1;
        break;
      case 'ArrowDown':
        if (orientation === 'horizontal') return null;
        next = current + 1;
        break;
      case 'ArrowLeft':
        if (orientation === 'vertical') return null;
        next = current - 1;
        break;
      case 'ArrowRight':
        if (orientation === 'vertical') return null;
        next = current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = items.length - 1;
        break;
      default:
        return null;
    }

    // 處理循環
    if (loop) {
      if (next < 0) next = items.length - 1;
      if (next >= items.length) next = 0;
    } else {
      next = Math.max(0, Math.min(items.length - 1, next));
    }

    if (next !== current) {
      e.preventDefault();
      items[next].focus();
      return items[next];
    }

    return null;
  }

  // ==================== 清理 ====================

  destroy() {
    if (this.globalKeyHandler) {
      document.removeEventListener('keydown', this.globalKeyHandler);
    }
    this.liveRegion?.destroy();
  }
}

// ==================== 導出 ====================

export const focusManager = new FocusManager();

export default AccessibilityService;
