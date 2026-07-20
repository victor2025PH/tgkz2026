/**
 * TG-AI智控王 精簡獲客模式（Lean Acquisition Mode）共享判斷工具
 *
 * 背景：`src/app.component.ts` 的 `leanMode` getter 與
 * `src/guards/lean-mode.guard.ts` 的 `aiFeatureGuard` 原本各自維護一份
 * 完全相同的判斷邏輯（先讀 localStorage 覆蓋，否則回退 environment 開關），
 * 屬於刻意的暫時性重複（避免當時同一輪多個協作者同時改動 app.component.ts）。
 * 現統一提煉到此處，兩處改為呼叫同一函數，避免日後修改時只改一處導致行為漂移。
 */
import { environment } from '../environments/environment';

/**
 * 判斷目前是否處於精簡獲客模式
 *
 * 判斷順序：
 * 1. `localStorage.getItem('tg_lean_mode')` —— 運行時覆蓋（供演示/測試切換，
 *    值為字串 `'true'`/`'false'`），優先於構建期設定。
 * 2. `environment.features.leanMode` —— 構建期預設值。
 */
export function isLeanModeActive(): boolean {
  try {
    const ls = localStorage.getItem('tg_lean_mode');
    if (ls === 'true') { return true; }
    if (ls === 'false') { return false; }
  } catch { /* ignore：非瀏覽器環境或存取被拒絕時忽略，回退到 environment */ }
  return !!(environment as any)?.features?.leanMode;
}
