/**
 * 角色資源庫 E2E 測試
 * Role Library E2E Tests
 * 
 * 🆕 測試優化: E2E 測試覆蓋
 */

import { test, expect } from '@playwright/test';

test.describe('角色資源庫', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/role-library');
    await page.waitForLoadState('networkidle');
  });

  test.describe('頁面加載', () => {
    
    test('應該正確加載角色資源庫頁面', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('角色資源庫');
    });

    test('應該顯示角色相關的功能區', async ({ page }) => {
      // 檢查主要區域存在
      await expect(page.getByText('角色')).toBeVisible();
    });
  });

  test.describe('角色管理', () => {
    
    test('應該顯示預設角色列表', async ({ page }) => {
      // 檢查是否有角色卡片
      const roleCards = page.locator('[class*="role"]');
      await expect(roleCards.first()).toBeVisible();
    });
  });
});

test.describe('舊路由兼容', () => {
  
  test('multi-role 應該重定向到 role-library', async ({ page }) => {
    await page.goto('/multi-role');
    
    await expect(page).toHaveURL(/role-library/);
  });
});
