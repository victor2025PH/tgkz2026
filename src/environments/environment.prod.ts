/**
 * 本地版生產環境配置 (Electron)
 */
export const environment = {
  production: true,
  
  // 本地版使用 IPC
  apiMode: 'ipc',
  
  // HTTP 配置（備用）
  apiBaseUrl: 'http://localhost:8000',
  wsUrl: 'ws://localhost:8000/ws',
  
  // 功能開關 - 本地版
  features: {
    maxAccounts: 10,        // 本地免費版限制
    aiEnabled: true,
    teamFeatures: false,    // 本地版不支持團隊
    apiAccess: false,       // 本地版不開放 API
    debug: false
  },
  
  // 版本信息
  version: '2.1.1',
  buildDate: new Date().toISOString()
};
