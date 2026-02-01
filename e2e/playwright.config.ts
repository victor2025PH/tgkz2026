/**
 * Playwright 配置
 * Playwright Configuration
 * 
 * 🆕 測試優化: E2E 測試覆蓋
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  
  /* 全局超時 */
  timeout: 30 * 1000,
  
  /* 測試期望超時 */
  expect: {
    timeout: 5000
  },
  
  /* 完整的並行測試 */
  fullyParallel: true,
  
  /* 在 CI 上禁用重試 */
  retries: process.env.CI ? 2 : 0,
  
  /* 在 CI 上限制並行數 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 報告器 */
  reporter: [
    ['html', { outputFolder: '../playwright-report' }],
    ['json', { outputFile: '../playwright-report/results.json' }],
    ['list']
  ],
  
  /* 全局配置 */
  use: {
    /* 基礎 URL */
    baseURL: 'http://localhost:4200',
    
    /* 收集失敗測試的跟蹤 */
    trace: 'on-first-retry',
    
    /* 截圖 */
    screenshot: 'only-on-failure',
    
    /* 視頻 */
    video: 'on-first-retry',
    
    /* 動作超時 */
    actionTimeout: 10000,
    
    /* 導航超時 */
    navigationTimeout: 30000,
  },

  /* 配置瀏覽器項目 */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 }
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 }
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 }
      },
    },

    /* 移動端測試 */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* 本地開發服務器 */
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
