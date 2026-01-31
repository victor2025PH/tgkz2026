/**
 * 主題服務
 * Theme Service
 * 
 * 🆕 體驗優化: 主題切換功能
 * 
 * 功能：
 * - 暗色/亮色主題切換
 * - 自定義主題色
 * - 跟隨系統設置
 * - 主題持久化
 */

import { Injectable, signal, computed, effect } from '@angular/core';

// 主題模式
export type ThemeMode = 'dark' | 'light' | 'system';

// 主題配色
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  error: string;
}

// 預設主題
export interface ThemePreset {
  id: string;
  name: string;
  mode: 'dark' | 'light';
  colors: Partial<ThemeColors>;
}

// 默認暗色主題
const DARK_THEME: ThemeColors = {
  primary: '#8b5cf6',      // purple-500
  secondary: '#06b6d4',    // cyan-500
  accent: '#ec4899',       // pink-500
  background: '#0f172a',   // slate-900
  surface: '#1e293b',      // slate-800
  text: '#f8fafc',         // slate-50
  textMuted: '#94a3b8',    // slate-400
  border: '#334155',       // slate-700
  success: '#10b981',      // emerald-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444'         // red-500
};

// 默認亮色主題
const LIGHT_THEME: ThemeColors = {
  primary: '#7c3aed',      // violet-600
  secondary: '#0891b2',    // cyan-600
  accent: '#db2777',       // pink-600
  background: '#ffffff',   // white
  surface: '#f8fafc',      // slate-50
  text: '#0f172a',         // slate-900
  textMuted: '#64748b',    // slate-500
  border: '#e2e8f0',       // slate-200
  success: '#059669',      // emerald-600
  warning: '#d97706',      // amber-600
  error: '#dc2626'         // red-600
};

// 預設主題
const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'default-dark',
    name: '默認暗色',
    mode: 'dark',
    colors: {}
  },
  {
    id: 'default-light',
    name: '默認亮色',
    mode: 'light',
    colors: {}
  },
  {
    id: 'midnight',
    name: '午夜藍',
    mode: 'dark',
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#0c1222',
      surface: '#162032'
    }
  },
  {
    id: 'forest',
    name: '森林綠',
    mode: 'dark',
    colors: {
      primary: '#10b981',
      secondary: '#14b8a6',
      accent: '#22c55e',
      background: '#0a1410',
      surface: '#132820'
    }
  },
  {
    id: 'sunset',
    name: '日落橙',
    mode: 'dark',
    colors: {
      primary: '#f97316',
      secondary: '#fb923c',
      accent: '#ef4444',
      background: '#1c1210',
      surface: '#2a1f1a'
    }
  },
  {
    id: 'ocean',
    name: '海洋',
    mode: 'light',
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      background: '#f0f9ff',
      surface: '#e0f2fe'
    }
  }
];

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  
  // 狀態
  private _mode = signal<ThemeMode>('dark');
  mode = this._mode.asReadonly();
  
  private _activePreset = signal<string>('default-dark');
  activePreset = this._activePreset.asReadonly();
  
  private _customColors = signal<Partial<ThemeColors>>({});
  customColors = this._customColors.asReadonly();
  
  // 計算屬性
  isDark = computed(() => {
    const mode = this._mode();
    if (mode === 'system') {
      return this.getSystemPreference() === 'dark';
    }
    return mode === 'dark';
  });
  
  currentColors = computed<ThemeColors>(() => {
    const baseColors = this.isDark() ? DARK_THEME : LIGHT_THEME;
    const presetColors = this.getPresetColors();
    const customColors = this._customColors();
    
    return {
      ...baseColors,
      ...presetColors,
      ...customColors
    };
  });
  
  presets = computed(() => THEME_PRESETS);
  
  constructor() {
    this.loadSettings();
    this.setupSystemListener();
    
    // 當主題變化時應用到 DOM
    effect(() => {
      this.applyTheme();
    });
  }
  
  /**
   * 設置主題模式
   */
  setMode(mode: ThemeMode): void {
    this._mode.set(mode);
    this.saveSettings();
  }
  
  /**
   * 切換暗色/亮色
   */
  toggle(): void {
    const current = this._mode();
    if (current === 'system') {
      this._mode.set(this.isDark() ? 'light' : 'dark');
    } else {
      this._mode.set(current === 'dark' ? 'light' : 'dark');
    }
    this.saveSettings();
  }
  
  /**
   * 應用預設主題
   */
  applyPreset(presetId: string): void {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    this._activePreset.set(presetId);
    this._mode.set(preset.mode);
    this._customColors.set({});
    this.saveSettings();
  }
  
  /**
   * 設置自定義顏色
   */
  setCustomColor(key: keyof ThemeColors, value: string): void {
    this._customColors.update(colors => ({
      ...colors,
      [key]: value
    }));
    this.saveSettings();
  }
  
  /**
   * 重置自定義顏色
   */
  resetCustomColors(): void {
    this._customColors.set({});
    this.saveSettings();
  }
  
  /**
   * 獲取 CSS 變量
   */
  getCssVariables(): string {
    const colors = this.currentColors();
    return Object.entries(colors)
      .map(([key, value]) => `--theme-${this.camelToKebab(key)}: ${value};`)
      .join('\n');
  }
  
  // ============ 私有方法 ============
  
  private getPresetColors(): Partial<ThemeColors> {
    const preset = THEME_PRESETS.find(p => p.id === this._activePreset());
    return preset?.colors || {};
  }
  
  private getSystemPreference(): 'dark' | 'light' {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  
  private setupSystemListener(): void {
    window.matchMedia?.('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (this._mode() === 'system') {
          this.applyTheme();
        }
      });
  }
  
  private applyTheme(): void {
    const root = document.documentElement;
    const colors = this.currentColors();
    
    // 設置暗色/亮色類
    if (this.isDark()) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    
    // 設置 CSS 變量
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--theme-${this.camelToKebab(key)}`, value);
    }
    
    // 設置 meta 主題色
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', colors.background);
    }
  }
  
  private camelToKebab(str: string): string {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }
  
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('theme_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this._mode.set(settings.mode || 'dark');
        this._activePreset.set(settings.preset || 'default-dark');
        this._customColors.set(settings.customColors || {});
      }
    } catch (e) {
      console.error('Failed to load theme settings:', e);
    }
  }
  
  private saveSettings(): void {
    localStorage.setItem('theme_settings', JSON.stringify({
      mode: this._mode(),
      preset: this._activePreset(),
      customColors: this._customColors()
    }));
  }
}
