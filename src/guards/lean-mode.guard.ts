/**
 * TG-AI智控王 路由守衛
 * 精簡獲客模式（Lean Acquisition Mode）AI 專屬路由守衛
 *
 * 背景：精簡模式下側邊欄會隱藏 AI 相關功能入口（策略規劃/自動執行/多角色協作/
 * 智能引擎等），但使用者仍可能透過網址直接輸入、瀏覽器書籤或歷史記錄，直接進入
 * 這些 AI 專屬路由。此時後端 ENABLE_AI=False，頁面內操作會靜默無效或返回空數據，
 * 使用者會困惑「為什麼點了沒反應」。
 *
 * 本守衛在精簡模式下攔截這些 AI 專屬路由，彈出清晰提示並導向儀表板，
 * 取代「靜默進入一個功能實際上被禁用的頁面」。
 */

import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { ToastService } from '../toast.service';
import { environment } from '../environments/environment';

/**
 * 判斷是否處於精簡獲客模式
 *
 * 🔧 判斷邏輯必須與 `app.component.ts` 的 `leanMode` getter 保持一致：
 * 優先讀 localStorage（供運行時切換/演示覆蓋），否則回退到構建期 environment 開關。
 *
 * ⚠️ 此處為刻意保留的重複邏輯（未提煉為共用函數）：`app.component.ts` 當前由另一
 * 位協作者處理中，本次改動避免碰觸該檔案。建議未來將此判斷提煉為共用工具函數
 * （例如 `src/utils/lean-mode.util.ts` 匯出 `isLeanModeActive()`），並讓
 * `app.component.ts` 的 `leanMode` getter 與本守衛都改為呼叫同一處，避免兩處判斷
 * 邏輯日後漂移不一致。（此重複模式在專案中已有先例：`isTokenAlive()` 目前也同時
 * 存在於 `src/core/auth.guard.ts` 與 `src/guards/auth.guard.ts` 兩處。）
 */
function isLeanModeActive(): boolean {
  try {
    const ls = localStorage.getItem('tg_lean_mode');
    if (ls === 'true') { return true; }
    if (ls === 'false') { return false; }
  } catch { /* ignore */ }
  return !!(environment as any)?.features?.leanMode;
}

/**
 * AI 專屬功能守衛
 *
 * 精簡獲客模式下，AI 相關路由（智能引擎/角色資源庫/營銷任務中心等）一律禁止進入：
 * 彈出提示說明原因，並導回儀表板 —— 避免使用者透過網址直接訪問到後端已停用 AI
 * 功能的頁面，進去後操作靜默無效卻不知道原因。
 *
 * 非精簡模式下完全不影響現有邏輯，直接放行。
 */
export const aiFeatureGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const toastService = inject(ToastService);
  const router = inject(Router);

  if (!isLeanModeActive()) {
    return true;
  }

  console.warn('[AiFeatureGuard] 精簡獲客模式下已攔截 AI 專屬路由：', state.url);
  toastService.warning('此功能依賴 AI，精簡獲客模式下已停用');
  router.navigate(['/dashboard']);
  return false;
};
