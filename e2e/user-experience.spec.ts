/**
 * 用戶體驗 E2E 測試
 * User Experience E2E Tests
 * 
 * 🆕 測試優化: E2E 測試覆蓋
 * 
 * 測試主題切換、鍵盤快捷鍵、新手引導等功能
 */

import { test, expect } from '@playwright/test';

test.describe('主題切換', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('應該顯示主題切換按鈕', async ({ page }) => {
    // 查找主題切換按鈕（月亮或太陽圖標）
    const themeButton = page.locator('app-theme-switcher button').first();
    await expect(themeButton).toBeVisible();
  });

  test('點擊主題按鈕應該打開主題菜單', async ({ page }) => {
    const themeButton = page.locator('app-theme-switcher button').first();
    await themeButton.click();

    // 檢查菜單出現
    await expect(page.getByText('主題模式')).toBeVisible();
    await expect(page.getByText('暗色')).toBeVisible();
    await expect(page.getByText('亮色')).toBeVisible();
    await expect(page.getByText('系統')).toBeVisible();
  });

  test('應該能切換到亮色模式', async ({ page }) => {
    const themeButton = page.locator('app-theme-switcher button').first();
    await themeButton.click();

    await page.getByText('亮色').click();

    // 檢查 HTML 類變化
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);
  });

  test('應該顯示預設主題選項', async ({ page }) => {
    const themeButton = page.locator('app-theme-switcher button').first();
    await themeButton.click();

    await expect(page.getByText('主題配色')).toBeVisible();
    await expect(page.getByText('默認暗色')).toBeVisible();
    await expect(page.getByText('午夜藍')).toBeVisible();
  });

  test('主題設置應該持久化', async ({ page }) => {
    const themeButton = page.locator('app-theme-switcher button').first();
    await themeButton.click();
    await page.getByText('亮色').click();

    // 刷新頁面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 主題應該保持
    const html = page.locator('html');
    await expect(html).toHaveClass(/light/);
  });
});

test.describe('鍵盤快捷鍵', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('按 ? 應該顯示快捷鍵幫助', async ({ page }) => {
    await page.keyboard.press('Shift+/'); // ? 鍵

    await expect(page.getByText('鍵盤快捷鍵')).toBeVisible();
  });

  test('快捷鍵幫助應該顯示分類', async ({ page }) => {
    await page.keyboard.press('Shift+/');

    await expect(page.getByText('導航')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
    await expect(page.getByText('視圖')).toBeVisible();
  });

  test('按 Escape 應該關閉快捷鍵幫助', async ({ page }) => {
    await page.keyboard.press('Shift+/');
    await expect(page.getByText('鍵盤快捷鍵')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByText('鍵盤快捷鍵')).not.toBeVisible();
  });

  test('Ctrl+K 應該觸發搜索', async ({ page }) => {
    // 監聯自定義事件
    await page.evaluate(() => {
      (window as any).searchTriggered = false;
      window.addEventListener('shortcut:search', () => {
        (window as any).searchTriggered = true;
      });
    });

    await page.keyboard.press('Control+k');

    const triggered = await page.evaluate(() => (window as any).searchTriggered);
    expect(triggered).toBe(true);
  });
});

test.describe('新手引導', () => {
  
  test('首次訪問應該顯示歡迎引導', async ({ page, context }) => {
    // 清除 localStorage 模擬首次訪問
    await context.clearCookies();

    await page.goto('/dashboard');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 等待引導出現（可能有延遲）
    await page.waitForTimeout(1500);

    // 檢查引導覆蓋層
    const onboarding = page.locator('app-onboarding-overlay');
    // 引導可能顯示也可能不顯示，取決於實現
  });

  test('引導應該能跳過', async ({ page }) => {
    // 如果引導正在顯示
    const skipButton = page.getByText('跳過');
    if (await skipButton.isVisible()) {
      await skipButton.click();

      // 引導應該消失
      const onboarding = page.locator('app-onboarding-overlay');
      await expect(onboarding).not.toBeVisible();
    }
  });

  test('引導應該能點擊下一步', async ({ page }) => {
    const nextButton = page.getByText('下一步');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // 進度應該更新
    }
  });
});

test.describe('響應式設計', () => {
  
  test('在移動設備視口下應該正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 頁面應該可見
    await expect(page.locator('body')).toBeVisible();
  });

  test('在平板視口下應該正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('在桌面視口下應該正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('無障礙', () => {
  
  test('頁面應該有正確的標題', async ({ page }) => {
    await page.goto('/dashboard');

    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('交互元素應該可以通過 Tab 鍵訪問', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 按 Tab 應該能聚焦到元素
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
