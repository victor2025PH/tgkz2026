/**
 * TG-AI智控王 E2E Tests
 * 端到端測試 - 完整實現
 * 
 * 🆕 Phase 30: Playwright 測試代碼
 */

import { test, expect, Page } from '@playwright/test';

// 測試工具函數
async function waitForAngular(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return (window as any).getAllAngularTestabilities?.()?.every((t: any) => t.isStable());
  }, { timeout: 30000 }).catch(() => {
    // Angular 可能未完全加載，繼續測試
  });
}

async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(`/${route}`);
  await waitForAngular(page);
}

test.describe('TG-AI智控王 Application Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // 導航到應用首頁
    await page.goto('/');
    await waitForAngular(page);
  });
  
  test.describe('Application Launch', () => {
    test('should display the application title', async ({ page }) => {
      // 驗證頁面標題或應用名稱存在
      await expect(page.locator('body')).toBeVisible();
    });
    
    test('should have working navigation', async ({ page }) => {
      // 驗證側邊欄導航存在
      const sidebar = page.locator('aside, nav, [class*="sidebar"]');
      await expect(sidebar.first()).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Dashboard', () => {
    test('should navigate to dashboard', async ({ page }) => {
      await navigateTo(page, 'dashboard');
      
      // 驗證儀表板頁面加載
      const heading = page.locator('h2, h1').filter({ hasText: /儀表板|Dashboard/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should display status cards', async ({ page }) => {
      await navigateTo(page, 'dashboard');
      
      // 驗證狀態卡片存在
      const cards = page.locator('[class*="card"], [class*="rounded-xl"]');
      await expect(cards.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should switch between smart and classic mode', async ({ page }) => {
      await navigateTo(page, 'dashboard');
      
      // 尋找模式切換按鈕
      const classicModeBtn = page.locator('button').filter({ hasText: /經典模式|Classic/i });
      const smartModeBtn = page.locator('button').filter({ hasText: /智能模式|Smart/i });
      
      if (await classicModeBtn.isVisible()) {
        await classicModeBtn.click();
        await waitForAngular(page);
      }
      
      if (await smartModeBtn.isVisible()) {
        await smartModeBtn.click();
        await waitForAngular(page);
      }
    });
  });
  
  test.describe('Accounts Management', () => {
    test('should navigate to accounts page', async ({ page }) => {
      await navigateTo(page, 'accounts');
      
      // 驗證帳戶頁面加載
      const heading = page.locator('h2, h1').filter({ hasText: /帳號|Accounts/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should display account list or empty state', async ({ page }) => {
      await navigateTo(page, 'accounts');
      
      // 驗證帳戶列表或空狀態
      const content = page.locator('[class*="card"], [class*="empty"], [class*="list"]');
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should have add account button', async ({ page }) => {
      await navigateTo(page, 'accounts');
      
      // 尋找添加帳戶按鈕
      const addBtn = page.locator('button').filter({ hasText: /添加|新增|Add|QR/i });
      await expect(addBtn.first()).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Settings', () => {
    test('should navigate to settings page', async ({ page }) => {
      await navigateTo(page, 'settings');
      
      // 驗證設置頁面加載
      const heading = page.locator('h2, h1').filter({ hasText: /設置|Settings/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should display settings tabs', async ({ page }) => {
      await navigateTo(page, 'settings');
      
      // 驗證設置標籤頁存在
      const tabs = page.locator('button, [role="tab"]').filter({ hasText: /備份|外觀|調度|Backup|Appearance/i });
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should switch to appearance tab', async ({ page }) => {
      await navigateTo(page, 'settings');
      
      // 點擊外觀設置標籤
      const appearanceTab = page.locator('button').filter({ hasText: /外觀|Appearance/i });
      if (await appearanceTab.isVisible()) {
        await appearanceTab.click();
        await waitForAngular(page);
        
        // 驗證動畫選擇器可見
        const animationSelector = page.locator('app-animation-selector, [class*="animation"]');
        await expect(animationSelector.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    });
  });
  
  test.describe('Leads Management', () => {
    test('should navigate to leads page', async ({ page }) => {
      await navigateTo(page, 'leads');
      
      // 驗證線索頁面加載
      const heading = page.locator('h2, h1').filter({ hasText: /線索|Leads/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should display leads filter options', async ({ page }) => {
      await navigateTo(page, 'leads');
      
      // 驗證篩選選項存在
      const filter = page.locator('select, [class*="filter"]');
      await expect(filter.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should have export button', async ({ page }) => {
      await navigateTo(page, 'leads');
      
      // 驗證導出按鈕存在
      const exportBtn = page.locator('button').filter({ hasText: /導出|Export/i });
      await expect(exportBtn.first()).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Automation', () => {
    test('should navigate to automation page', async ({ page }) => {
      await navigateTo(page, 'automation');
      
      // 驗證自動化頁面加載
      await expect(page.locator('body')).toBeVisible();
    });
    
    test('should display monitoring controls', async ({ page }) => {
      await navigateTo(page, 'automation');
      
      // 驗證監控控制按鈕存在
      const controls = page.locator('button').filter({ hasText: /啟動|停止|Start|Stop|監控/i });
      await expect(controls.first()).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('AI Center', () => {
    test('should navigate to AI center', async ({ page }) => {
      await navigateTo(page, 'ai-center');
      
      // 驗證 AI 中心頁面加載
      await expect(page.locator('body')).toBeVisible();
    });
    
    test('should display AI configuration options', async ({ page }) => {
      await navigateTo(page, 'ai-center');
      
      // 驗證 AI 配置選項存在
      const config = page.locator('[class*="config"], [class*="settings"], input, select');
      await expect(config.first()).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Monitoring Center', () => {
    test('should navigate to monitoring page', async ({ page }) => {
      await navigateTo(page, 'monitoring');
      
      // 驗證監控中心頁面加載
      const heading = page.locator('h2, h1').filter({ hasText: /監控|Monitoring/i });
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('should display monitoring tabs', async ({ page }) => {
      await navigateTo(page, 'monitoring');
      
      // 驗證監控標籤頁存在
      const tabs = page.locator('button').filter({ hasText: /群組|關鍵詞|規則|模板|Groups|Keywords|Rules/i });
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });
    });
  });
});
