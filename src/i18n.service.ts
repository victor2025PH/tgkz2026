/**
 * Internationalization (i18n) Service
 * 國際化服務 - 多語言支持
 * 
 * 優化版本：翻譯已移至 JSON 文件
 * - src/assets/i18n/en.json
 * - src/assets/i18n/zh-CN.json
 * - src/assets/i18n/zh-TW.json
 */
import { Injectable, signal, computed, effect } from '@angular/core';

export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW';

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇹🇼' }
];

type TranslationKey = string;
type TranslationValue = string | Record<string, any>;
type Translations = Record<TranslationKey, TranslationValue>;

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  // 當前語言
  private _locale = signal<SupportedLocale>('zh-TW');
  locale = this._locale.asReadonly();
  
  // 語言包緩存
  private translations = signal<Record<SupportedLocale, Translations>>({
    'en': {},
    'zh-CN': {},
    'zh-TW': {}
  });
  
  // 加載狀態
  private _loading = signal(false);
  loading = this._loading.asReadonly();
  
  // 計算屬性
  currentLocaleInfo = computed(() => 
    SUPPORTED_LOCALES.find(l => l.code === this._locale()) || SUPPORTED_LOCALES[2]
  );
  
  supportedLocales = SUPPORTED_LOCALES;
  
  constructor() {
    this.initLocale();
    this.loadTranslations();
    
    // 監聽語言變化，自動保存
    effect(() => {
      const locale = this._locale();
      localStorage.setItem('tg-matrix-locale', locale);
      document.documentElement.lang = locale;
    });
  }
  
  /**
   * 初始化語言設置
   * 🔧 優化：默認使用繁體中文，因為主要用戶群體是中文用戶
   */
  private initLocale(): void {
    // 優先從本地存儲讀取
    const stored = localStorage.getItem('tg-matrix-locale') as SupportedLocale;
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
      this._locale.set(stored);
      return;
    }
    
    // 自動檢測瀏覽器語言
    const browserLang = navigator.language;
    if (browserLang.startsWith('en')) {
      // 只有明確是英文才使用英文
      this._locale.set('en');
    } else if (browserLang === 'zh-CN' || browserLang === 'zh-Hans') {
      // 簡體中文
      this._locale.set('zh-CN');
    } else {
      // 🔧 其他所有情況（包括繁體中文、未知語言）默認使用繁體中文
      this._locale.set('zh-TW');
    }
  }
  
  /**
   * 加載語言包 - 從 JSON 文件加載
   */
  private async loadTranslations(): Promise<void> {
    this._loading.set(true);
    
    try {
      const locales: SupportedLocale[] = ['en', 'zh-CN', 'zh-TW'];
      const loaded: Record<SupportedLocale, Translations> = {
        'en': {},
        'zh-CN': {},
        'zh-TW': {}
      };
      
      // 並行加載所有語言包
      await Promise.all(locales.map(async (locale) => {
        try {
          const response = await fetch(`/assets/i18n/${locale}.json`);
          if (response.ok) {
            loaded[locale] = await response.json();
          } else {
            console.warn(`Failed to load ${locale}.json: ${response.status}`);
            loaded[locale] = this.getFallbackTranslations(locale);
          }
        } catch (e) {
          console.warn(`Error loading ${locale}.json:`, e);
          loaded[locale] = this.getFallbackTranslations(locale);
        }
      }));
      
      this.translations.set(loaded);
    } catch (e) {
      console.error('Failed to load translations:', e);
    } finally {
      this._loading.set(false);
    }
  }
  
  /**
   * 切換語言
   */
  setLocale(locale: SupportedLocale): void {
    if (SUPPORTED_LOCALES.some(l => l.code === locale)) {
      this._locale.set(locale);
    }
  }
  
  /**
   * 翻譯文本
   * @param key 翻譯鍵，支持點號分隔的嵌套鍵 (如 'menu.dashboard')
   * @param params 插值參數
   */
  t(key: string, params?: Record<string, string | number>): string {
    const locale = this._locale();
    const allTranslations = this.translations();
    const localeTranslations = allTranslations[locale] || {};
    
    let value: any;
    
    // 1. 嘗試嵌套鍵（如 'menu.dashboard'）
    value = this.getNestedValue(localeTranslations, key);
    if (typeof value === 'string') {
      return this.interpolate(value, params);
    }
    
    // 2. 嘗試扁平鍵映射（舊代碼兼容）
    const flatKey = this.getFlatKeyMapping(key);
    if (flatKey) {
      value = this.getNestedValue(localeTranslations, flatKey);
      if (typeof value === 'string') {
        return this.interpolate(value, params);
      }
    }
    
    // 3. 從繁體中文回退
    if (locale !== 'zh-TW') {
      value = this.getNestedValue(allTranslations['zh-TW'], key);
      if (typeof value === 'string') {
        return this.interpolate(value, params);
      }
      
      if (flatKey) {
        value = this.getNestedValue(allTranslations['zh-TW'], flatKey);
        if (typeof value === 'string') {
          return this.interpolate(value, params);
        }
      }
    }
    
    // 4. 返回鍵名
    return key;
  }
  
  /**
   * 參數插值
   */
  private interpolate(value: string, params?: Record<string, string | number>): string {
    if (!params) return value;
    let result = value;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    });
    return result;
  }
  
  /**
   * 舊扁平鍵到新嵌套鍵的映射（向下兼容）
   */
  private getFlatKeyMapping(flatKey: string): string | undefined {
    const mapping: Record<string, string> = {
      // 菜單項
      'dashboard': 'menu.dashboard',
      'accounts': 'menu.accounts',
      'automation': 'menu.automation',
      'leads': 'menu.leads',
      'analytics': 'menu.analytics',
      'logs': 'menu.logs',
      'performance': 'menu.performance',
      'alerts': 'menu.alerts',
      'settings': 'menu.settings',
      'aiCenter': 'menu.aiCenter',
      'resourceDiscoveryMenu': 'menu.resourceDiscovery',
      'monitoringCenter': 'menu.monitoringCenter',
      'resourceManagement': 'menu.resourceManagement',
      'marketingAutomation': 'menu.marketingAutomation',
      'aiIntelligence': 'menu.aiIntelligence',
      'systemMonitor': 'menu.systemMonitor',
      // 通用
      'save': 'common.save',
      'cancel': 'common.cancel',
      'delete': 'common.delete',
      'edit': 'common.edit',
      'add': 'common.add',
      'close': 'common.close',
      'confirm': 'common.confirm',
      'search': 'common.search',
      'loading': 'common.loading',
      'success': 'common.success',
      'error': 'common.error',
      'warning': 'common.warning',
      'refresh': 'common.refresh',
      'start': 'common.start',
      'stop': 'common.stop',
      'active': 'common.active',
      'inactive': 'common.inactive',
      // 儀表板
      'totalAccounts': 'dashboard.totalAccounts',
      'onlineAccounts': 'dashboard.onlineAccounts',
      'leadsToday': 'dashboard.leadsToday',
      'messagesSentToday': 'dashboard.messagesSentToday',
      'systemControl': 'dashboard.systemControl',
      'monitoringStatus': 'dashboard.monitoringStatus',
      'recentLogs': 'dashboard.recentLogs',
      'recentLeads': 'dashboard.recentLeads',
      // 帳號
      'addNewAccount': 'accounts.addNewAccount',
      'phoneNumber': 'accounts.phoneNumber',
      'apiId': 'accounts.apiId',
      'apiHash': 'accounts.apiHash',
      'proxy': 'accounts.proxy',
      'login': 'accounts.login',
      'importSession': 'accounts.importSession',
      'exportSession': 'accounts.exportSession',
      'health': 'accounts.health',
      'group': 'accounts.group',
      'role': 'accounts.role',
      // 設定
      'appearance': 'settings.appearance',
      'language': 'settings.language',
      'light': 'settings.light',
      'dark': 'settings.dark',
      // 狀態
      'Online': 'status.Online',
      'Offline': 'status.Offline',
      'Recently': 'status.Recently',
      'Unknown': 'status.Unknown',
      'Listener': 'status.Listener',
      'Sender': 'status.Sender',
      'Banned': 'status.Banned',
      'Unassigned': 'status.Unassigned'
    };
    return mapping[flatKey];
  }
  
  /**
   * 獲取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
    if (!key || typeof key !== 'string') return undefined;
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  /**
   * 獲取回退翻譯（當 JSON 加載失敗時使用）
   */
  private getFallbackTranslations(locale: SupportedLocale): Translations {
    // 最小化的回退翻譯
    const fallbacks: Record<SupportedLocale, Translations> = {
      'en': {
        app: { title: 'TG-AI智控王', subtitle: 'AI Smart Marketing System' },
        common: { loading: 'Loading...', error: 'Error', success: 'Success' },
        menu: { dashboard: 'Dashboard', accounts: 'Accounts', settings: 'Settings' }
      },
      'zh-CN': {
        app: { title: 'TG-AI智控王', subtitle: 'AI 智能营销系统' },
        common: { loading: '加载中...', error: '错误', success: '成功' },
        menu: { dashboard: '仪表盘', accounts: '账号管理', settings: '设置' }
      },
      'zh-TW': {
        app: { title: 'TG-AI智控王', subtitle: 'AI 智能行銷系統' },
        common: { loading: '載入中...', error: '錯誤', success: '成功' },
        menu: { dashboard: '儀表板', accounts: '帳號管理', settings: '設定' }
      }
    };
    return fallbacks[locale];
  }
}
