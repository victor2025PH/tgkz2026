/**
 * 執行環境偵測共用工具
 *
 * 背景（實測根因）：專案在多處各自判斷「是否運行於 Electron」，但判斷條件不一致：
 * - `ApiService.detectElectron()` 用 `window.electron || window.require`
 * - 各 Guard / MembershipService 用 `window.electronAPI || window.electron`（漏了 window.require）
 *
 * 本專案 Electron 採 `nodeIntegration: true + contextIsolation: false` 且 preload.js 為空，
 * renderer 是透過 `window.require('electron')` 取得 ipcRenderer（見 electron-ipc.service.ts），
 * 執行時 **只有 window.require 存在**，window.electron / window.electronAPI 皆為 undefined。
 *
 * 後果：ApiService 正確判定為 ipc 模式（連後端走 IPC），但 Guard 卻判 isElectron=false，
 * 使 .cursorrules 允許的「Electron 模式（apiMode==='ipc' && isElectron）免登入」例外失效，
 * 桌面版一開機就被踹到登入頁，而 Electron 後端又是純 stdin/stdout IPC、不開 HTTP，
 * 登入頁的 HTTP 請求無處可去 → 死路。
 *
 * 統一用本函數消除不一致。新代碼一律使用本函數，勿再各自造判斷。
 */

/**
 * 是否運行於 Electron（渲染進程）
 *
 * 涵蓋三種可能暴露方式，任一成立即判定為 Electron：
 * - `window.require`（nodeIntegration 模式，本專案當前配置）
 * - `window.electron`（部分 contextBridge 暴露命名）
 * - `window.electronAPI`（另一種 contextBridge 暴露命名）
 */
export function isElectronRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return !!w.require || !!w.electron || !!w.electronAPI;
}
