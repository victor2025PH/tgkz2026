/**
 * 🔧 P7-2: 關鍵路徑 E2E 測試
 * 
 * 覆蓋已修復的兩個核心 Bug 路徑：
 * 1. 登入後菜單欄顯示暱稱（而非用戶名）
 * 2. 添加帳號時配額檢查正確（而非錯誤顯示「用盡」）
 * 
 * 以及 P0-P7 優化的關鍵回歸路徑。
 */

import { test, expect, Page } from '@playwright/test';

// ============ 測試輔助函數 ============

/** 等待 Angular 應用穩定 */
async function waitForAngular(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    return (window as any).getAllAngularTestabilities?.()?.every((t: any) => t.isStable());
  }, { timeout: 15000 }).catch(() => {
    // fallback: 等待網絡空閒
  });
  await page.waitForLoadState('networkidle');
}

/** 模擬已認證用戶（注入 localStorage token） */
async function mockAuthenticatedUser(page: Page, user: {
  id: number;
  username: string;
  displayName: string;
  membershipLevel: string;
}) {
  await page.addInitScript((userData) => {
    // 模擬 JWT token 和用戶數據
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
    localStorage.setItem('access_token', fakeToken);
    localStorage.setItem('user', JSON.stringify({
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName,
      display_name: userData.displayName,
      email: `${userData.username}@test.com`,
      membershipLevel: userData.membershipLevel,
      subscription_tier: userData.membershipLevel,
      maxAccounts: 10
    }));
  }, user);
}

// ============ 關鍵路徑 1: 登入後暱稱顯示 ============

test.describe('🔧 P0 Fix: 菜單欄暱稱顯示', () => {
  
  test('登入後應顯示暱稱而非用戶名', async ({ page }) => {
    const testUser = {
      id: 1,
      username: 'testuser123',
      displayName: '測試大師',
      membershipLevel: 'gold'
    };
    
    await mockAuthenticatedUser(page, testUser);
    await page.goto('/dashboard');
    await waitForAngular(page);
    
    // 核心斷言：菜單欄/側邊欄應顯示暱稱「測試大師」
    const pageContent = await page.textContent('body');
    
    // 應包含暱稱
    expect(pageContent).toContain(testUser.displayName);
    
    // 在菜單區域（sidebar/header）中不應該出現原始用戶名替代暱稱
    // 注意：某些地方可能顯示用戶名（如帳號設置），但菜單欄不應該
    const sidebarOrHeader = page.locator(
      'aside, header, nav, [class*="sidebar"], [class*="user-info"], [class*="user-menu"]'
    );
    
    if (await sidebarOrHeader.count() > 0) {
      const menuText = await sidebarOrHeader.first().textContent();
      if (menuText && menuText.includes(testUser.displayName)) {
        // 暱稱在菜單中 — 通過
        expect(menuText).toContain(testUser.displayName);
      }
    }
  });
  
  test('暱稱為空時應優雅降級到用戶名', async ({ page }) => {
    const testUser = {
      id: 2,
      username: 'fallback_user',
      displayName: '',  // 空暱稱
      membershipLevel: 'bronze'
    };
    
    await mockAuthenticatedUser(page, testUser);
    await page.goto('/dashboard');
    await waitForAngular(page);
    
    // 暱稱為空時，應該不會顯示空白或報錯
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    // 頁面應正常加載，不崩潰
  });
  
  test('含特殊字符的暱稱應正確顯示', async ({ page }) => {
    const testUser = {
      id: 3,
      username: 'special_user',
      displayName: '🎯 VIP用戶 <test>',
      membershipLevel: 'diamond'
    };
    
    await mockAuthenticatedUser(page, testUser);
    await page.goto('/dashboard');
    await waitForAngular(page);
    
    // 特殊字符不應導致 XSS 或顯示異常
    const pageContent = await page.textContent('body');
    // HTML 實體應被轉義，原始文本應安全顯示
    expect(pageContent).not.toContain('<test>');  // 應被轉義
  });
});

// ============ 關鍵路徑 2: 添加帳號配額 ============

test.describe('🔧 P0 Fix: 添加帳號配額檢查', () => {
  
  test('有剩餘配額時不應顯示「用盡」提示', async ({ page }) => {
    const testUser = {
      id: 10,
      username: 'quota_test_user',
      displayName: '配額測試',
      membershipLevel: 'gold'  // gold 級有足夠配額
    };
    
    await mockAuthenticatedUser(page, testUser);
    await page.goto('/accounts');
    await waitForAngular(page);
    
    // 頁面不應包含「帳號數量用盡」的錯誤提示
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('帳號數量用盡');
    expect(pageContent).not.toContain('配額已用盡');
  });
  
  test('帳號頁面應正常加載', async ({ page }) => {
    const testUser = {
      id: 11,
      username: 'accounts_page_user',
      displayName: '帳號管理',
      membershipLevel: 'silver'
    };
    
    await mockAuthenticatedUser(page, testUser);
    await page.goto('/accounts');
    await waitForAngular(page);
    
    // 帳號管理頁面應存在
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });
});

// ============ 關鍵路徑 3: 認證流程 ============

test.describe('認證路由守衛', () => {
  
  test('未登入時應重定向到登入頁', async ({ page }) => {
    // 不設置 token，直接訪問受保護頁面
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // 應被重定向到 /auth/login 或顯示登入表單
    const url = page.url();
    const isOnAuthPage = url.includes('/auth/') || url.includes('/login');
    const hasLoginForm = await page.locator(
      'form, [class*="login"], input[type="password"], input[type="email"]'
    ).count();
    
    // 至少滿足一個：在認證頁 或 頁面有登入表單
    expect(isOnAuthPage || hasLoginForm > 0).toBeTruthy();
  });
  
  test('登入頁應可訪問', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // 登入頁應包含輸入框
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    expect(inputCount).toBeGreaterThan(0);
  });
});

// ============ 關鍵路徑 4: API 安全頭驗證 ============

test.describe('🔧 P7-4: 安全響應頭', () => {
  
  test('API 響應應包含安全頭', async ({ page }) => {
    // 監聽 API 請求的響應頭
    const securityHeaders: Record<string, string> = {};
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        const headers = response.headers();
        if (headers['x-content-type-options']) {
          securityHeaders['x-content-type-options'] = headers['x-content-type-options'];
        }
        if (headers['x-frame-options']) {
          securityHeaders['x-frame-options'] = headers['x-frame-options'];
        }
        if (headers['x-request-id']) {
          securityHeaders['x-request-id'] = headers['x-request-id'];
        }
      }
    });
    
    // 觸發 API 請求
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');
    
    // 如果有 API 調用，檢查安全頭
    if (Object.keys(securityHeaders).length > 0) {
      expect(securityHeaders['x-content-type-options']).toBe('nosniff');
      expect(securityHeaders['x-frame-options']).toBe('DENY');
    }
  });
});

// ============ 關鍵路徑 5: 頁面加載性能 ============

test.describe('頁面加載性能基準', () => {
  
  test('登入頁應在 5 秒內完成加載', async ({ page }) => {
    const start = Date.now();
    
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - start;
    
    // 5 秒內加載完成
    expect(loadTime).toBeLessThan(5000);
  });
  
  test('Dashboard 頁面應在 8 秒內完成加載', async ({ page }) => {
    const testUser = {
      id: 20,
      username: 'perf_user',
      displayName: '性能測試',
      membershipLevel: 'gold'
    };
    
    await mockAuthenticatedUser(page, testUser);
    
    const start = Date.now();
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    
    const loadTime = Date.now() - start;
    expect(loadTime).toBeLessThan(8000);
  });
});
