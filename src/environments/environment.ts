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
    leanMode: false
  },
  
  // 版本信息
  version: '2.1.1',
  buildDate: new Date().toISOString()
};
