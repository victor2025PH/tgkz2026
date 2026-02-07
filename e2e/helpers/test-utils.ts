/**
 * 🔧 P9-1: E2E 測試公共輔助函數
 * 
 * 從 critical-paths.spec.ts 提取並擴展的共享工具：
 * - waitForAngular: 等待 Angular 應用穩定
 * - mockAuthenticatedUser: 模擬登入狀態
 * - mockOfflineMode: 模擬離線場景
 * - interceptApiResponse: 攔截並模擬 API 響應
 * - setViewport: 設置視窗大小（桌面/平板/手機）
 */

import { Page, expect } from '@playwright/test';

// ============ 類型定義 ============

export interface TestUser {
  id: number;
  username: string;
  displayName: string;
  membershipLevel: string;
}

export type ViewportPreset = 'desktop' | 'tablet' | 'mobile';

const VIEWPORT_PRESETS: Record<ViewportPreset, { width: number; height: number }> = {
  desktop: { width: 1280, height: 720 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
};

// ============ 核心工具 ============

/** 等待 Angular 應用穩定（帶回退） */
export async function waitForAngular(page: Page, timeoutMs = 15000): Promise<void> {
  await page.waitForFunction(() => {
    return (window as any).getAllAngularTestabilities?.()?.every((t: any) => t.isStable());
  }, { timeout: timeoutMs }).catch(() => {
    // fallback: 等待網絡空閒
  });
  await page.waitForLoadState('networkidle');
}

/** 模擬已認證用戶（注入 localStorage token） */
export async function mockAuthenticatedUser(page: Page, user: TestUser): Promise<void> {
  await page.addInitScript((userData) => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
    localStorage.setItem('access_token', fakeToken);
    localStorage.setItem('tg-matrix-user', JSON.stringify({
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName,
      display_name: userData.displayName,
      email: `${userData.username}@test.com`,
      membershipLevel: userData.membershipLevel,
      subscription_tier: userData.membershipLevel,
      maxAccounts: 10
    }));
    // 同時寫入舊 key（兼容）
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

// ============ P8 測試工具 ============

/** 設置視窗預設大小 */
export async function setViewport(page: Page, preset: ViewportPreset): Promise<void> {
  const size = VIEWPORT_PRESETS[preset];
  await page.setViewportSize(size);
}

/** 模擬離線狀態（攔截所有網絡請求） */
export async function goOffline(page: Page): Promise<void> {
  await page.context().setOffline(true);
}

/** 恢復在線狀態 */
export async function goOnline(page: Page): Promise<void> {
  await page.context().setOffline(false);
}

/** 模擬慢速網絡 */
export async function simulateSlowNetwork(page: Page): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);
  await cdpSession.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 50 * 1024,  // 50 KB/s
    uploadThroughput: 20 * 1024,    // 20 KB/s
    latency: 2000,                  // 2s latency
  });
}

/** 攔截 API 並返回模擬數據 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string,
  response: { status?: number; body: any }
): Promise<void> {
  await page.route(urlPattern, route => {
    route.fulfill({
      status: response.status || 200,
      contentType: 'application/json',
      body: JSON.stringify(response.body),
    });
  });
}

/** 攔截 API 並返回錯誤 */
export async function mockApiError(
  page: Page,
  urlPattern: string,
  status: number,
  errorBody?: any
): Promise<void> {
  await page.route(urlPattern, route => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(errorBody || { success: false, error: 'Mocked error' }),
    });
  });
}

/** 等待特定元素可見 */
export async function waitForVisible(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout: timeoutMs });
}

/** 等待特定元素消失 */
export async function waitForHidden(page: Page, selector: string, timeoutMs = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout: timeoutMs });
}

/** 檢查 localStorage 值 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/** 設置 localStorage 值 */
export async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(([k, v]) => localStorage.setItem(k as string, v as string), [key, value]);
}

// ============ 常用斷言 ============

/** 斷言頁面不包含指定文字 */
export async function expectNoText(page: Page, text: string): Promise<void> {
  const content = await page.textContent('body');
  expect(content).not.toContain(text);
}

/** 斷言安全響應頭存在 */
export async function assertSecurityHeaders(response: any): Promise<void> {
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBeDefined();
  if (headers['x-request-id']) {
    expect(headers['x-request-id']).toBeTruthy();
  }
}

// ============ 默認測試用戶 ============

export const DEFAULT_TEST_USER: TestUser = {
  id: 1,
  username: 'testuser123',
  displayName: '測試大師',
  membershipLevel: 'gold',
};

export const ADMIN_TEST_USER: TestUser = {
  id: 99,
  username: 'admin',
  displayName: '系統管理員',
  membershipLevel: 'king',
};
