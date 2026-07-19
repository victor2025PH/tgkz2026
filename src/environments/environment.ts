/**
 * 開發環境配置
 */
export const environment = {
  production: false,
  
  // API 模式: 'auto' | 'ipc' | 'http'
  // auto: 自動檢測（Electron 用 IPC，瀏覽器用 HTTP）
  apiMode: 'auto',
  
  // HTTP API 配置（僅 http 模式使用）
  apiBaseUrl: 'http://localhost:8000',
  wsUrl: 'ws://localhost:8000/ws',
  
  // 功能開關
  features: {
    maxAccounts: 999,
    aiEnabled: true,
    teamFeatures: true,
    apiAccess: true,
    debug: true,
    // 🎯 精簡獲客模式：true 時隱藏 AI 增值入口（策略規劃/自動執行/多角色/智能引擎/客戶培育）
    leanMode: false,
    // 🎯 精簡獲客模式 - 獨立 Bootstrap 根組件（真正的 bundle 體積優化）：
    // true 時 main.ts 會改用 LeanRootComponent 作為應用程式根組件，取代
    // AppComponent（~5900行）。已通過編譯期驗證（ng build），但缺乏完整
    // Electron+後端環境做端到端互動驗證，故預設關閉。啟用前請先在真實環境
    // 手動驗證登入/帳號/搜索/監控/潛客/設定六大頁面皆正常。
    leanBootstrapRoot: false
  },
  
  // 版本信息
  version: '2.1.1',
  buildDate: new Date().toISOString()
};
