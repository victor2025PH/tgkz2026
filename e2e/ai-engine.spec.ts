/**
 * 智能引擎 E2E 測試
 * AI Engine E2E Tests
 * 
 * 🆕 測試優化: E2E 測試覆蓋
 */

import { test, expect } from '@playwright/test';

test.describe('智能引擎設置', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/ai-engine');
    await page.waitForLoadState('networkidle');
  });

  test.describe('頁面加載', () => {
    
    test('應該正確加載智能引擎頁面', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('智能引擎設置');
    });

    test('應該顯示主要 Tab', async ({ page }) => {
      await expect(page.getByText('引擎概覽')).toBeVisible();
      await expect(page.getByText('模型配置')).toBeVisible();
      await expect(page.getByText('知識大腦')).toBeVisible();
      await expect(page.getByText('人格風格')).toBeVisible();
    });
  });

  test.describe('模型配置', () => {
    
    test('應該能切換到模型配置 Tab', async ({ page }) => {
      await page.getByText('模型配置').click();
      
      // 應該顯示 API Key 輸入區域
      await expect(page.getByText('API Key')).toBeVisible();
    });

    test('應該顯示模型選擇區域', async ({ page }) => {
      await page.getByText('模型配置').click();
      
      await expect(page.getByText('GPT-4')).toBeVisible();
    });
  });

  test.describe('知識大腦', () => {
    
    test('應該能切換到知識大腦 Tab', async ({ page }) => {
      await page.getByText('知識大腦').click();
      
      // 應該顯示知識庫管理區域
      await expect(page.getByText('知識庫')).toBeVisible();
    });
  });

  test.describe('智能營銷中心入口', () => {
    
    test('應該顯示前往智能營銷中心的按鈕', async ({ page }) => {
      await expect(page.getByText('智能營銷中心')).toBeVisible();
      await expect(page.getByText('前往使用')).toBeVisible();
    });

    test('點擊按鈕應該導航到營銷中心', async ({ page }) => {
      await page.getByText('前往使用').click();
      
      await expect(page).toHaveURL(/marketing-hub|smart-marketing/);
    });
  });
});

test.describe('舊路由兼容', () => {
  
  test('ai-center 應該重定向到 ai-engine', async ({ page }) => {
    await page.goto('/ai-center');
    
    await expect(page).toHaveURL(/ai-engine/);
  });
});
