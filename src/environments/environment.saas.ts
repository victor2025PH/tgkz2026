/**
 * SaaS 版生產環境配置 (Web)
 */
export const environment = {
  production: true,
  
  // SaaS 版使用 HTTP
  apiMode: 'http',
  
  // HTTP 配置 - 同源
  apiBaseUrl: '',  // 空字符串表示同源
  wsUrl: '',       // 自動檢測
  /** 掃碼登錄默認後端；SaaS 同源可為空 */
  defaultLoginApiUrl: '' as string,
  
  // 功能開關 - 根據用戶訂閱級別動態調整
  features: {
    maxAccounts: 3,         // 免費版默認
    aiEnabled: true,
    teamFeatures: false,    // 付費功能
    apiAccess: false,       // 付費功能
    debug: false
  },
  
  // 訂閱級別功能配置
  subscriptionTiers: {
    free: {
      maxAccounts: 3,
      aiEnabled: true,
      teamFeatures: false,
      apiAccess: false
    },
    basic: {
      maxAccounts: 10,
      aiEnabled: true,
      teamFeatures: false,
      apiAccess: false
    },
    pro: {
      maxAccounts: 50,
      aiEnabled: true,
      teamFeatures: true,
      apiAccess: true
    },
    enterprise: {
      maxAccounts: 999,
      aiEnabled: true,
      teamFeatures: true,
      apiAccess: true
    }
  },
  
  // 版本信息
  version: '2.1.1',
  buildDate: new Date().toISOString()
};
