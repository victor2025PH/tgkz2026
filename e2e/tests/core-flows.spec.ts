/**
 * TG-Matrix 核心流程 E2E 測試
 * Core Flows End-to-End Tests
 */

import { test, expect, Page } from '@playwright/test';

// ============ 測試輔助函數 ============

/**
 * 等待應用加載完成
 */
async function waitForAppLoad(page: Page) {
  // 等待 Angular 應用加載
  await page.waitForLoadState('networkidle');
  
  // 等待主要內容區域出現
  await page.waitForSelector('[data-testid="app-content"]', { 
    timeout: 30000,
    state: 'visible'
  }).catch(() => {
    // 如果沒有 testid，等待側邊欄
    return page.waitForSelector('.sidebar, nav', { timeout: 30000 });
  });
}

/**
 * 導航到指定視圖
 */
async function navigateTo(page: Page, viewName: string) {
  // 嘗試通過側邊欄導航
  const navItem = page.locator(`[data-tour="${viewName}"], a:has-text("${viewName}")`);
  if (await navItem.count() > 0) {
    await navItem.first().click();
    await page.waitForTimeout(500);
  }
}

// ============ 測試套件 ============

test.describe('應用啟動', () => {
  test('應用應該正常加載', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    // 檢查頁面標題
    await expect(page).toHaveTitle(/TG-AI|Matrix|智控王/i);
  });
  
  test('應該顯示儀表板', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    // 檢查儀表板內容
    const dashboard = page.locator('text=儀表板, text=Dashboard, text=總覽').first();
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });
});

test.describe('導航系統', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });
  
  test('側邊欄應該可見', async ({ page }) => {
    const sidebar = page.locator('.sidebar, aside, nav').first();
    await expect(sidebar).toBeVisible();
  });
  
  test('應該能導航到帳號管理', async ({ page }) => {
    await navigateTo(page, 'accounts');
    
    // 等待帳號列表加載
    await page.waitForTimeout(1000);
    
    // 檢查是否有帳號相關內容
    const accountContent = page.locator('text=帳號, text=Account, text=添加帳號').first();
    await expect(accountContent).toBeVisible({ timeout: 5000 });
  });
  
  test('應該能導航到自動化中心', async ({ page }) => {
    await navigateTo(page, 'automation');
    
    await page.waitForTimeout(1000);
    
    // 檢查自動化相關內容
    const autoContent = page.locator('text=自動化, text=Automation, text=監控').first();
    await expect(autoContent).toBeVisible({ timeout: 5000 });
  });
  
  test('快捷鍵 Ctrl+K 應該打開命令面板', async ({ page }) => {
    await page.keyboard.press('Control+k');
    
    // 檢查命令面板是否出現
    const commandPalette = page.locator('[data-testid="command-palette"], .command-palette, input[placeholder*="搜索"]');
    await expect(commandPalette).toBeVisible({ timeout: 3000 });
  });
});

test.describe('帳號管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await navigateTo(page, 'accounts');
    await page.waitForTimeout(1000);
  });
  
  test('應該顯示添加帳號按鈕', async ({ page }) => {
    const addButton = page.locator('button:has-text("添加"), button:has-text("Add"), button:has-text("新增")');
    await expect(addButton.first()).toBeVisible({ timeout: 5000 });
  });
  
  test('帳號列表應該存在', async ({ page }) => {
    // 檢查帳號列表容器
    const accountList = page.locator('.account-list, [data-testid="account-list"], .accounts-container');
    // 即使沒有帳號，容器也應該存在
    const exists = await accountList.count() > 0 || 
                   await page.locator('text=暫無帳號, text=No accounts, text=添加第一個帳號').count() > 0;
    expect(exists).toBeTruthy();
  });
});

test.describe('監控系統', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });
  
  test('應該能訪問關鍵詞設置', async ({ page }) => {
    await navigateTo(page, 'keyword-sets');
    await page.waitForTimeout(1000);
    
    const keywordContent = page.locator('text=關鍵詞, text=Keyword, text=添加關鍵詞').first();
    await expect(keywordContent).toBeVisible({ timeout: 5000 });
  });
  
  test('應該能訪問觸發規則', async ({ page }) => {
    await navigateTo(page, 'trigger-rules');
    await page.waitForTimeout(1000);
    
    const ruleContent = page.locator('text=觸發, text=規則, text=Trigger, text=Rule').first();
    await expect(ruleContent).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI 功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });
  
  test('應該能訪問 AI 中心', async ({ page }) => {
    await navigateTo(page, 'ai-center');
    await page.waitForTimeout(1000);
    
    const aiContent = page.locator('text=AI, text=對話, text=智能').first();
    await expect(aiContent).toBeVisible({ timeout: 5000 });
  });
});

test.describe('響應式設計', () => {
  test('移動端視口應該正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await waitForAppLoad(page);
    
    // 應用應該能在移動端加載
    await expect(page).toHaveTitle(/TG-AI|Matrix|智控王/i);
  });
  
  test('平板視口應該正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await waitForAppLoad(page);
    
    await expect(page).toHaveTitle(/TG-AI|Matrix|智控王/i);
  });
});

test.describe('錯誤處理', () => {
  test('無效路由應該優雅處理', async ({ page }) => {
    await page.goto('/invalid-route-12345');
    
    // 應該不會崩潰
    await page.waitForTimeout(2000);
    
    // 應該重定向到主頁或顯示 404
    const isOnMainPage = await page.locator('text=儀表板, text=Dashboard, text=404').count() > 0;
    expect(isOnMainPage).toBeTruthy();
  });
});

test.describe('性能', () => {
  test('頁面加載時間應該合理', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await waitForAppLoad(page);
    
    const loadTime = Date.now() - startTime;
    
    // 頁面加載應該在 10 秒內完成
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`頁面加載時間: ${loadTime}ms`);
  });
});
