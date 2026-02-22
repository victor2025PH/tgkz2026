/**
 * 🔧 Phase8-P1-3: SidebarStateService
 * 
 * 從 AppComponent 提取側邊欄狀態管理，減少根組件體積
 * 管理：收縮/展開、移動端響應式、導航選擇、分組折疊
 */
import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  
  // --- 收縮/展開 ---
  readonly collapsed = signal(false);
  
  // --- 移動端響應 ---
  readonly isMobile = signal(false);
  readonly mobileMenuOpen = signal(false);
  
  // --- 分組折疊狀態 ---
  readonly groupStates = signal<Record<string, boolean>>({});

  private _mediaQuery: MediaQueryList | null = null;
  private _mediaHandler: ((e: MediaQueryListEvent | MediaQueryList) => void) | null = null;

  constructor() {
    // 從 localStorage 恢復收縮狀態
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') {
        this.collapsed.set(true);
      }
    } catch {}
    
    // 恢復分組折疊狀態
    try {
      const savedGroups = localStorage.getItem('sidebar_group_states');
      if (savedGroups) {
        this.groupStates.set(JSON.parse(savedGroups));
      }
    } catch {}
  }

  /** 是否為 Electron 安裝版（與 auth.guard 一致） */
  private isElectronEnv(): boolean {
    try {
      return !!(window as any).electronAPI || !!(window as any).electron ||
        !!((window as any).require && (window as any).require('electron')?.ipcRenderer);
    } catch {
      return false;
    }
  }

  /** 初始化移動端偵測；Electron 安裝版強制桌面布局以顯示側邊欄 */
  initMobileDetection(): void {
    if (typeof window === 'undefined') return;
    if (this.isElectronEnv()) {
      this.isMobile.set(false);
      return;
    }
    this._mediaQuery = window.matchMedia('(max-width: 768px)');
    
    this._mediaHandler = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      this.isMobile.set(mobile);
      if (mobile) {
        this.collapsed.set(false);
        this.mobileMenuOpen.set(false);
      }
    };
    
    this._mediaHandler(this._mediaQuery);
    this._mediaQuery.addEventListener('change', this._mediaHandler);
  }

  /** 銷毀移動端偵測 */
  destroyMobileDetection(): void {
    if (this._mediaQuery && this._mediaHandler) {
      this._mediaQuery.removeEventListener('change', this._mediaHandler as any);
    }
  }

  /** 切換收縮狀態 */
  toggleCollapse(): void {
    if (this.isMobile()) {
      this.toggleMobileMenu();
      return;
    }
    const newState = !this.collapsed();
    this.collapsed.set(newState);
    localStorage.setItem('sidebar_collapsed', String(newState));
  }

  /** 切換移動端選單 */
  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(v => !v);
  }

  /** 移動端選擇後自動關閉 */
  onMobileNavSelect(): void {
    if (this.isMobile()) {
      this.mobileMenuOpen.set(false);
    }
  }

  /** 切換分組折疊 */
  toggleGroup(groupKey: string): void {
    const states = { ...this.groupStates() };
    states[groupKey] = !states[groupKey];
    this.groupStates.set(states);
    try {
      localStorage.setItem('sidebar_group_states', JSON.stringify(states));
    } catch {}
  }

  /** 檢查分組是否折疊 */
  isGroupCollapsed(groupKey: string): boolean {
    return !!this.groupStates()[groupKey];
  }
}
