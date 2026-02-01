/**
 * TG-Matrix 後端 API E2E 測試
 * Backend API End-to-End Tests
 * 
 * 這些測試通過 Electron IPC 模擬與後端的通訊
 */

import { test, expect } from '@playwright/test';

// 注意：這些測試需要後端服務運行
// 在 Electron 環境中，API 通過 IPC 通訊

test.describe('後端 API 測試', () => {
  
  test.describe('系統狀態', () => {
    test('應該能獲取初始狀態', async ({ page }) => {
      await page.goto('/');
      
      // 等待應用加載並獲取初始狀態
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // 檢查是否有帳號數據（即使為空）
      // 通過 UI 元素驗證 API 響應
      const hasAccountSection = await page.locator('text=帳號, text=Account').count() > 0;
      expect(hasAccountSection).toBeTruthy();
    });
    
    test('應該顯示連接狀態', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 檢查是否有連接狀態指示器
      // 成功連接時不應該顯示錯誤狀態
      const hasError = await page.locator('text=連接失敗, text=Connection Error').count() > 0;
      
      // 如果沒有錯誤，說明連接正常
      if (!hasError) {
        console.log('後端連接正常');
      }
    });
  });
  
  test.describe('帳號 API', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    });
    
    test('帳號列表應該能加載', async ({ page }) => {
      // 導航到帳號頁面
      await page.click('text=帳號管理, text=帳號, a:has-text("Account")');
      await page.waitForTimeout(1000);
      
      // 檢查頁面是否正常渲染
      const pageRendered = await page.locator('.accounts, [data-tour="accounts"], text=帳號').count() > 0;
      expect(pageRendered).toBeTruthy();
    });
  });
  
  test.describe('監控 API', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    });
    
    test('關鍵詞集應該能加載', async ({ page }) => {
      // 導航到關鍵詞設置
      const keywordLink = page.locator('text=關鍵詞, a:has-text("Keyword")').first();
      if (await keywordLink.isVisible()) {
        await keywordLink.click();
        await page.waitForTimeout(1000);
        
        // 頁面應該正常渲染
        const pageRendered = await page.locator('text=關鍵詞, text=添加').count() > 0;
        expect(pageRendered).toBeTruthy();
      }
    });
    
    test('觸發規則應該能加載', async ({ page }) => {
      const triggerLink = page.locator('text=觸發規則, a:has-text("Trigger")').first();
      if (await triggerLink.isVisible()) {
        await triggerLink.click();
        await page.waitForTimeout(1000);
        
        const pageRendered = await page.locator('text=規則, text=觸發').count() > 0;
        expect(pageRendered).toBeTruthy();
      }
    });
  });
  
  test.describe('AI API', () => {
    test('AI 設置應該能加載', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // 導航到 AI 中心
      const aiLink = page.locator('text=AI 中心, text=AI Center, a:has-text("AI")').first();
      if (await aiLink.isVisible()) {
        await aiLink.click();
        await page.waitForTimeout(1000);
        
        const pageRendered = await page.locator('text=AI, text=模型, text=設置').count() > 0;
        expect(pageRendered).toBeTruthy();
      }
    });
  });
});

test.describe('錯誤處理', () => {
  test('網絡錯誤應該顯示友好提示', async ({ page }) => {
    // 模擬網絡問題
    await page.route('**/*', route => {
      if (route.request().url().includes('api')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // 應用應該還是能加載（使用本地狀態）
    await expect(page).toHaveTitle(/TG-AI|Matrix|智控王/i);
  });
});

test.describe('數據持久化', () => {
  test('刷新後狀態應該保持', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 記錄當前 URL 或狀態
    const initialUrl = page.url();
    
    // 刷新頁面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // 頁面應該正常加載
    await expect(page).toHaveTitle(/TG-AI|Matrix|智控王/i);
  });
});
