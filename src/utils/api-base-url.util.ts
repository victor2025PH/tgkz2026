/**
 * TG-AI智控王 API / WebSocket 基址解析共用工具
 *
 * 背景：Electron 生產模式使用自訂 `app://` 協議載入 dist（見 electron.js 的
 * `protocol.handle('app', ...)`），該協議處理器會把任何 app:// 路徑當成靜態檔案讀取。
 * 因此若用相對路徑 fetch（如 `fetch('/api/v1/auth/login-token')`），請求會變成
 * `app://api/v1/...`，被協議處理器當檔案讀取而報 ENOENT，根本到不了後端。
 * WebSocket 同理：app:// 下 `window.location.host` 無意義，不能用來拼 ws URL。
 *
 * 統一規則（三種運行環境）：
 * 1. `app:` 協議（Electron 生產/dist 載入）→ 後端固定跑在本機 8000 埠
 *    → `http://127.0.0.1:8000` / `ws://127.0.0.1:8000`
 * 2. `localhost:4200`（ng serve 開發）→ 前後端分離，後端在 8000 埠
 *    → `http://localhost:8000` / `ws://localhost:8000`
 * 3. 其他（SaaS 部署，走同源反向代理）→ fetch 用相對路徑（返回 ''），
 *    WebSocket 按 https/http 對應 wss/ws 拼同源主機
 *
 * 注意：`src/core/auth.service.ts` 的 `getApiBaseUrl()` 已改為內部調用本工具；
 * 新代碼請直接使用本工具，不要再各自複製判斷邏輯。
 */

/**
 * 解析 HTTP API 基址
 *
 * @returns 不帶結尾斜線的絕對基址；返回 '' 表示同源（fetch 直接用相對路徑）
 *
 * 用法：`fetch(`${resolveApiBaseUrl()}/api/v1/...`)`
 */
export function resolveApiBaseUrl(): string {
  // Electron 生產模式：app:// 下相對路徑到不了後端，必須絕對指向本機後端。
  // 用 localhost 而非 127.0.0.1：index.html 的 CSP connect-src 白名單是
  // http://localhost:*，換成 127.0.0.1 會被 CSP 擋（實測 "Refused to connect"）。
  if (window.location.protocol === 'app:') {
    return 'http://localhost:8000';
  }
  // ng serve 開發模式：前端 4200、後端 8000
  if (window.location.hostname === 'localhost' && window.location.port === '4200') {
    return 'http://localhost:8000';
  }
  // SaaS 生產部署：同源反向代理，用相對路徑
  return '';
}

/**
 * 解析 WebSocket 基址（含協議與主機，不帶結尾斜線、不含路徑）
 *
 * 用法：`new WebSocket(`${resolveWsBaseUrl()}/ws/login-token/${token}`)`
 */
export function resolveWsBaseUrl(): string {
  // Electron 生產模式：直連本機後端（localhost 對齊 CSP 白名單，理由同上）
  if (window.location.protocol === 'app:') {
    return 'ws://localhost:8000';
  }
  // ng serve 開發模式：直連後端 8000 埠
  if (window.location.hostname === 'localhost' && window.location.port === '4200') {
    return 'ws://localhost:8000';
  }
  // SaaS 生產部署：同源主機，https → wss、http → ws
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}`;
}
