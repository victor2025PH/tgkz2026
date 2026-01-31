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
    debug: true
  },
  
  // 版本信息
  version: '2.1.1',
  buildDate: new Date().toISOString()
};
