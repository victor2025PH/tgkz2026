/**
 * 營銷任務 E2E 測試
 * Marketing Tasks E2E Tests
 * 
 * 🆕 測試優化: E2E 測試覆蓋
 */

import { test, expect, Page } from '@playwright/test';

test.describe('營銷任務中心', () => {
  
  test.beforeEach(async ({ page }) => {
    // 導航到營銷任務中心
    await page.goto('/marketing-hub');
    await page.waitForLoadState('networkidle');
  });

  test.describe('頁面加載', () => {
    
    test('應該正確加載營銷任務中心頁面', async ({ page }) => {
      // 檢查頁面標題
      await expect(page.locator('h1')).toContainText('營銷任務中心');
      
      // 檢查主要 Tab 存在
      await expect(page.getByText('快速啟動')).toBeVisible();
      await expect(page.getByText('任務列表')).toBeVisible();
      await expect(page.getByText('效果監控')).toBeVisible();
    });

    test('應該顯示目標類型選擇卡片', async ({ page }) => {
      await expect(page.getByText('促進首單')).toBeVisible();
      await expect(page.getByText('挽回流失')).toBeVisible();
      await expect(page.getByText('社群活躍')).toBeVisible();
      await expect(page.getByText('售後服務')).toBeVisible();
    });
  });

  test.describe('任務創建向導', () => {
    
    test('點擊目標卡片應該打開向導', async ({ page }) => {
      // 點擊「促進首單」卡片
      await page.getByText('促進首單').click();
      
      // 檢查向導對話框出現
      await expect(page.locator('.task-wizard')).toBeVisible();
      await expect(page.getByText('創建營銷任務')).toBeVisible();
    });

    test('向導應該有四個步驟', async ({ page }) => {
      await page.getByText('促進首單').click();
      
      // 檢查步驟指示器
      await expect(page.getByText('選擇目標')).toBeVisible();
      await expect(page.getByText('選擇客群')).toBeVisible();
      await expect(page.getByText('AI 配置')).toBeVisible();
      await expect(page.getByText('確認啟動')).toBeVisible();
    });

    test('應該能完成向導流程', async ({ page }) => {
      // 步驟 1: 選擇目標
      await page.getByText('促進首單').click();
      await page.getByText('下一步').click();
      
      // 步驟 2: 選擇客群
      await expect(page.getByText('選擇目標客群')).toBeVisible();
      await page.getByText('最近互動').click();
      await page.getByText('下一步').click();
      
      // 步驟 3: AI 配置
      await expect(page.getByText('確認 AI 配置')).toBeVisible();
      await page.getByText('下一步').click();
      
      // 步驟 4: 預覽確認
      await expect(page.getByText('確認任務配置')).toBeVisible();
    });

    test('應該能跳過向導', async ({ page }) => {
      await page.getByText('促進首單').click();
      
      await page.getByText('跳過').click();
      
      // 向導應該關閉
      await expect(page.locator('.task-wizard')).not.toBeVisible();
    });
  });

  test.describe('任務列表', () => {
    
    test('切換到任務列表 Tab', async ({ page }) => {
      await page.getByText('任務列表').click();
      
      // 應該顯示任務列表區域
      await expect(page.locator('[class*="tasks"]')).toBeVisible();
    });

    test('應該顯示批量操作按鈕', async ({ page }) => {
      await page.getByText('任務列表').click();
      
      await expect(page.getByText('批量操作')).toBeVisible();
    });

    test('應該顯示創建任務按鈕', async ({ page }) => {
      await page.getByText('任務列表').click();
      
      await expect(page.getByText('創建任務')).toBeVisible();
    });
  });

  test.describe('效果監控', () => {
    
    test('切換到效果監控 Tab', async ({ page }) => {
      await page.getByText('效果監控').click();
      
      // 應該顯示統計卡片
      await expect(page.getByText('總任務數')).toBeVisible();
      await expect(page.getByText('轉化率')).toBeVisible();
    });

    test('應該顯示轉化漏斗', async ({ page }) => {
      await page.getByText('效果監控').click();
      
      await expect(page.getByText('轉化漏斗')).toBeVisible();
      await expect(page.getByText('目標客戶')).toBeVisible();
      await expect(page.getByText('已接觸')).toBeVisible();
      await expect(page.getByText('已轉化')).toBeVisible();
    });

    test('應該顯示趨勢圖表', async ({ page }) => {
      await page.getByText('效果監控').click();
      
      await expect(page.getByText('轉化趨勢')).toBeVisible();
      await expect(page.getByText('目標類型分布')).toBeVisible();
    });
  });

  test.describe('設置', () => {
    
    test('切換到設置 Tab', async ({ page }) => {
      await page.getByText('設置').click();
      
      // 應該顯示設置區域
      await expect(page.getByText('意向分數閾值')).toBeVisible();
      await expect(page.getByText('最大同時任務數')).toBeVisible();
    });
  });
});

test.describe('導航', () => {
  
  test('應該能從儀表板導航到營銷任務中心', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 點擊導航菜單
    await page.getByText('營銷任務中心').click();
    
    await expect(page).toHaveURL(/marketing-hub/);
  });

  test('舊路由應該重定向到新路由', async ({ page }) => {
    await page.goto('/smart-marketing');
    
    await expect(page).toHaveURL(/marketing-hub/);
  });
});
