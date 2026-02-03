import {
  Injectable,
  computed,
  effect,
  setClassMetadata,
  signal,
  ɵɵdefineInjectable
} from "./chunk-K4KD4A2Z.js";

// src/i18n.service.ts
var SUPPORTED_LOCALES = [
  { code: "en", name: "English", nativeName: "English", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "zh-CN", name: "Simplified Chinese", nativeName: "\u7B80\u4F53\u4E2D\u6587", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "zh-TW", name: "Traditional Chinese", nativeName: "\u7E41\u9AD4\u4E2D\u6587", flag: "\u{1F1F9}\u{1F1FC}" }
];
var I18nService = class _I18nService {
  constructor() {
    this._locale = signal("zh-TW", ...ngDevMode ? [{ debugName: "_locale" }] : []);
    this.locale = this._locale.asReadonly();
    this.translations = signal({
      "en": {},
      "zh-CN": {},
      "zh-TW": {}
    }, ...ngDevMode ? [{ debugName: "translations" }] : []);
    this._loading = signal(false, ...ngDevMode ? [{ debugName: "_loading" }] : []);
    this.loading = this._loading.asReadonly();
    this.currentLocaleInfo = computed(() => SUPPORTED_LOCALES.find((l) => l.code === this._locale()) || SUPPORTED_LOCALES[2], ...ngDevMode ? [{ debugName: "currentLocaleInfo" }] : []);
    this.supportedLocales = SUPPORTED_LOCALES;
    this.initLocale();
    this.loadTranslations();
    effect(() => {
      const locale = this._locale();
      localStorage.setItem("tg-matrix-locale", locale);
      document.documentElement.lang = locale;
    });
  }
  /**
   * 初始化語言設置
   * 🔧 優化：默認使用繁體中文，因為主要用戶群體是中文用戶
   */
  initLocale() {
    const stored = localStorage.getItem("tg-matrix-locale");
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      this._locale.set(stored);
      return;
    }
    const browserLang = navigator.language;
    if (browserLang.startsWith("en")) {
      this._locale.set("en");
    } else if (browserLang === "zh-CN" || browserLang === "zh-Hans") {
      this._locale.set("zh-CN");
    } else {
      this._locale.set("zh-TW");
    }
  }
  /**
   * 加載語言包 - 從 JSON 文件加載
   */
  async loadTranslations() {
    this._loading.set(true);
    try {
      const locales = ["en", "zh-CN", "zh-TW"];
      const loaded = {
        "en": {},
        "zh-CN": {},
        "zh-TW": {}
      };
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
      console.error("Failed to load translations:", e);
    } finally {
      this._loading.set(false);
    }
  }
  /**
   * 切換語言
   */
  setLocale(locale) {
    if (SUPPORTED_LOCALES.some((l) => l.code === locale)) {
      this._locale.set(locale);
    }
  }
  /**
   * 翻譯文本
   * @param key 翻譯鍵，支持點號分隔的嵌套鍵 (如 'menu.dashboard')
   * @param params 插值參數
   */
  t(key, params) {
    const locale = this._locale();
    const allTranslations = this.translations();
    const localeTranslations = allTranslations[locale] || {};
    let value;
    value = this.getNestedValue(localeTranslations, key);
    if (typeof value === "string") {
      return this.interpolate(value, params);
    }
    const flatKey = this.getFlatKeyMapping(key);
    if (flatKey) {
      value = this.getNestedValue(localeTranslations, flatKey);
      if (typeof value === "string") {
        return this.interpolate(value, params);
      }
    }
    if (locale !== "zh-TW") {
      value = this.getNestedValue(allTranslations["zh-TW"], key);
      if (typeof value === "string") {
        return this.interpolate(value, params);
      }
      if (flatKey) {
        value = this.getNestedValue(allTranslations["zh-TW"], flatKey);
        if (typeof value === "string") {
          return this.interpolate(value, params);
        }
      }
    }
    return key;
  }
  /**
   * 參數插值
   */
  interpolate(value, params) {
    if (!params)
      return value;
    let result = value;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    });
    return result;
  }
  /**
   * 舊扁平鍵到新嵌套鍵的映射（向下兼容）
   */
  getFlatKeyMapping(flatKey) {
    const mapping = {
      // 菜單項
      "dashboard": "menu.dashboard",
      "accounts": "menu.accounts",
      "automation": "menu.automation",
      "leads": "menu.leads",
      "analytics": "menu.analytics",
      "logs": "menu.logs",
      "performance": "menu.performance",
      "alerts": "menu.alerts",
      "settings": "menu.settings",
      "aiCenter": "menu.aiCenter",
      "resourceDiscoveryMenu": "menu.resourceDiscovery",
      "monitoringCenter": "menu.monitoringCenter",
      "resourceManagement": "menu.resourceManagement",
      "marketingAutomation": "menu.marketingAutomation",
      "aiIntelligence": "menu.aiIntelligence",
      "systemMonitor": "menu.systemMonitor",
      // 通用
      "save": "common.save",
      "cancel": "common.cancel",
      "delete": "common.delete",
      "edit": "common.edit",
      "add": "common.add",
      "close": "common.close",
      "confirm": "common.confirm",
      "search": "common.search",
      "loading": "common.loading",
      "success": "common.success",
      "error": "common.error",
      "warning": "common.warning",
      "refresh": "common.refresh",
      "start": "common.start",
      "stop": "common.stop",
      "active": "common.active",
      "inactive": "common.inactive",
      // 儀表板
      "totalAccounts": "dashboard.totalAccounts",
      "onlineAccounts": "dashboard.onlineAccounts",
      "leadsToday": "dashboard.leadsToday",
      "messagesSentToday": "dashboard.messagesSentToday",
      "systemControl": "dashboard.systemControl",
      "monitoringStatus": "dashboard.monitoringStatus",
      "recentLogs": "dashboard.recentLogs",
      "recentLeads": "dashboard.recentLeads",
      // 帳號
      "addNewAccount": "accounts.addNewAccount",
      "phoneNumber": "accounts.phoneNumber",
      "apiId": "accounts.apiId",
      "apiHash": "accounts.apiHash",
      "proxy": "accounts.proxy",
      "login": "accounts.login",
      "importSession": "accounts.importSession",
      "exportSession": "accounts.exportSession",
      "health": "accounts.health",
      "group": "accounts.group",
      "role": "accounts.role",
      // 設定
      "appearance": "settings.appearance",
      "language": "settings.language",
      "light": "settings.light",
      "dark": "settings.dark",
      // 狀態
      "Online": "status.Online",
      "Offline": "status.Offline",
      "Recently": "status.Recently",
      "Unknown": "status.Unknown",
      "Listener": "status.Listener",
      "Sender": "status.Sender",
      "Banned": "status.Banned",
      "Unassigned": "status.Unassigned"
    };
    return mapping[flatKey];
  }
  /**
   * 獲取嵌套值
   */
  getNestedValue(obj, key) {
    if (!key || typeof key !== "string")
      return void 0;
    return key.split(".").reduce((o, k) => o?.[k], obj);
  }
  /**
   * 獲取回退翻譯（當 JSON 加載失敗時使用）
   */
  getFallbackTranslations(locale) {
    const fallbacks = {
      "en": {
        app: { title: "TG-AI\u667A\u63A7\u738B", subtitle: "AI Smart Marketing System" },
        common: { loading: "Loading...", error: "Error", success: "Success" },
        menu: { dashboard: "Dashboard", accounts: "Accounts", settings: "Settings" }
      },
      "zh-CN": {
        app: { title: "TG-AI\u667A\u63A7\u738B", subtitle: "AI \u667A\u80FD\u8425\u9500\u7CFB\u7EDF" },
        common: { loading: "\u52A0\u8F7D\u4E2D...", error: "\u9519\u8BEF", success: "\u6210\u529F" },
        menu: { dashboard: "\u4EEA\u8868\u76D8", accounts: "\u8D26\u53F7\u7BA1\u7406", settings: "\u8BBE\u7F6E" }
      },
      "zh-TW": {
        app: { title: "TG-AI\u667A\u63A7\u738B", subtitle: "AI \u667A\u80FD\u884C\u92B7\u7CFB\u7D71" },
        common: { loading: "\u8F09\u5165\u4E2D...", error: "\u932F\u8AA4", success: "\u6210\u529F" },
        menu: { dashboard: "\u5100\u8868\u677F", accounts: "\u5E33\u865F\u7BA1\u7406", settings: "\u8A2D\u5B9A" }
      }
    };
    return fallbacks[locale];
  }
  static {
    this.\u0275fac = function I18nService_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _I18nService)();
    };
  }
  static {
    this.\u0275prov = /* @__PURE__ */ \u0275\u0275defineInjectable({ token: _I18nService, factory: _I18nService.\u0275fac, providedIn: "root" });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(I18nService, [{
    type: Injectable,
    args: [{
      providedIn: "root"
    }]
  }], () => [], null);
})();

export {
  SUPPORTED_LOCALES,
  I18nService
};
//# sourceMappingURL=chunk-ZTUGHWSQ.js.map
