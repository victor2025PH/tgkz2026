/**
 * 設定服務
 * Settings Service
 * 
 * 🆕 Phase 24: 從 app.component.ts 提取設定相關方法
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { I18nService } from '../i18n.service';

// ============ 類型定義 ============

export interface AppSettings {
  // 外觀設置
  theme: 'dark' | 'light' | 'system';
  language: 'zh-TW' | 'zh-CN' | 'en';
  sidebarCollapsed: boolean;
  animationType: string;
  
  // 功能設置
  autoConnect: boolean;
  autoMonitor: boolean;
  showNotifications: boolean;
  soundEnabled: boolean;
  
  // 安全設置
  autoLock: boolean;
  lockTimeout: number;
  
  // 性能設置
  enableAnalytics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface ApiCredentials {
  geminiApiKey?: string;
  openaiApiKey?: string;
  telegramApiId?: string;
  telegramApiHash?: string;
}

// ============ 默認設置 ============

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'zh-CN',
  sidebarCollapsed: false,
  animationType: 'default',
  autoConnect: true,
  autoMonitor: false,
  showNotifications: true,
  soundEnabled: true,
  autoLock: false,
  lockTimeout: 5,
  enableAnalytics: true,
  logLevel: 'info'
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  
  // ========== 狀態 ==========
  
  private _settings = signal<AppSettings>(DEFAULT_SETTINGS);
  private _credentials = signal<ApiCredentials>({});
  private _isLoading = signal(false);
  private _isDirty = signal(false);
  
  settings = this._settings.asReadonly();
  credentials = this._credentials.asReadonly();
  isLoading = this._isLoading.asReadonly();
  isDirty = this._isDirty.asReadonly();
  
  // ========== 計算屬性 ==========
  
  theme = computed(() => this._settings().theme);
  language = computed(() => this._settings().language);
  sidebarCollapsed = computed(() => this._settings().sidebarCollapsed);
  
  hasApiCredentials = computed(() => {
    const creds = this._credentials();
    return !!(creds.geminiApiKey || creds.openaiApiKey);
  });
  
  hasTelegramCredentials = computed(() => {
    const creds = this._credentials();
    return !!(creds.telegramApiId && creds.telegramApiHash);
  });
  
  constructor() {
    this.setupIpcListeners();
    this.loadSettings();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('settings-loaded', (data: AppSettings) => {
      this._settings.set({ ...DEFAULT_SETTINGS, ...data });
      this._isLoading.set(false);
    });
    
    this.ipc.on('settings-saved', () => {
      this._isDirty.set(false);
      this.toast.success('設置已保存');
    });
    
    this.ipc.on('credentials-loaded', (data: ApiCredentials) => {
      this._credentials.set(data);
    });
  }
  
  // ========== 設置操作 ==========
  
  loadSettings(): void {
    this._isLoading.set(true);
    this.ipc.send('get-settings');
    this.ipc.send('get-credentials');
  }
  
  saveSettings(): void {
    this.ipc.send('save-settings', this._settings());
  }
  
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this._settings.update(s => ({ ...s, [key]: value }));
    this._isDirty.set(true);
  }
  
  resetSettings(): void {
    if (confirm('確定要重置所有設置嗎？')) {
      this._settings.set(DEFAULT_SETTINGS);
      this._isDirty.set(true);
      this.saveSettings();
    }
  }
  
  // ========== 主題操作 ==========
  
  setTheme(theme: 'dark' | 'light' | 'system'): void {
    this.updateSetting('theme', theme);
    this.applyTheme(theme);
  }
  
  toggleTheme(): void {
    const current = this._settings().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }
  
  private applyTheme(theme: 'dark' | 'light' | 'system'): void {
    const root = document.documentElement;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }
  
  // ========== 語言操作 ==========
  
  setLanguage(language: 'zh-TW' | 'zh-CN' | 'en'): void {
    this.updateSetting('language', language);
    this.i18n.setLocale(language);
  }
  
  // ========== 側邊欄操作 ==========
  
  toggleSidebar(): void {
    const current = this._settings().sidebarCollapsed;
    this.updateSetting('sidebarCollapsed', !current);
  }
  
  setSidebarCollapsed(collapsed: boolean): void {
    this.updateSetting('sidebarCollapsed', collapsed);
  }
  
  // ========== API 憑證操作 ==========
  
  saveCredentials(credentials: Partial<ApiCredentials>): void {
    this._credentials.update(c => ({ ...c, ...credentials }));
    this.ipc.send('save-credentials', this._credentials());
    this.toast.success('API 憑證已保存');
  }
  
  testGeminiConnection(): void {
    const key = this._credentials().geminiApiKey;
    if (!key) {
      this.toast.error('請先設置 Gemini API Key');
      return;
    }
    
    this.ipc.send('test-gemini-connection', { apiKey: key });
    this.toast.info('正在測試 Gemini 連接...');
  }
  
  testOpenAiConnection(): void {
    const key = this._credentials().openaiApiKey;
    if (!key) {
      this.toast.error('請先設置 OpenAI API Key');
      return;
    }
    
    this.ipc.send('test-openai-connection', { apiKey: key });
    this.toast.info('正在測試 OpenAI 連接...');
  }
  
  testTelegramCredentials(): void {
    const creds = this._credentials();
    if (!creds.telegramApiId || !creds.telegramApiHash) {
      this.toast.error('請先設置 Telegram API 憑證');
      return;
    }
    
    this.ipc.send('test-telegram-credentials', {
      apiId: creds.telegramApiId,
      apiHash: creds.telegramApiHash
    });
    this.toast.info('正在測試 Telegram 憑證...');
  }
  
  // ========== 導出/導入 ==========
  
  exportSettings(): void {
    const data = {
      settings: this._settings(),
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tg-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.toast.success('設置已導出');
  }
  
  importSettings(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.settings) {
          this._settings.set({ ...DEFAULT_SETTINGS, ...data.settings });
          this._isDirty.set(true);
          this.saveSettings();
          this.toast.success('設置已導入');
        } else {
          this.toast.error('無效的設置文件');
        }
      } catch (error) {
        this.toast.error('設置文件解析失敗');
      }
    };
    
    reader.readAsText(file);
  }
}
