/**
 * 統一 API 服務器配置
 * 與管理後台 localStorage['api_server'] 對齊，使網站版 / 本地安裝版 / 開發版登錄走同一套數據。
 * 管理後台用此地址拉取用戶列表並管理會員等級。
 */

const KEY = 'api_server';

/** 取存儲的 API 服務器地址（不含末尾斜杠） */
export function getStoredApiServer(): string {
  try {
    const v = localStorage.getItem(KEY);
    return v ? v.replace(/\/+$/, '') : '';
  } catch {
    return '';
  }
}

/** 寫入並返回規範化後的地址 */
export function setStoredApiServer(url: string): string {
  const normalized = url ? url.replace(/\/+$/, '') : '';
  try {
    if (normalized) localStorage.setItem(KEY, normalized);
    else localStorage.removeItem(KEY);
  } catch {}
  return normalized;
}

/** 根據 API 基地址得到 WebSocket 的 host（用於 QR 輪詢/WS 連接） */
export function getWsUrlFromApiServer(apiServer: string): string {
  if (!apiServer) return '';
  try {
    const u = new URL(apiServer.startsWith('http') ? apiServer : `https://${apiServer}`);
    const protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${u.host}/ws`;
  } catch {
    return '';
  }
}
