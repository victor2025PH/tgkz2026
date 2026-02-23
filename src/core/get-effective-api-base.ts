/**
 * 與管理後台 / 掃碼登錄同一套數據：有效 API 基址
 * 用於 auth/me、refresh、訂閱、用量等所有需與登錄後端一致的請求。
 */

import { environment } from '../environments/environment';

function isElectronEnv(): boolean {
  try {
    return !!(typeof window !== 'undefined' && (
      (window as any).electronAPI ||
      (window as any).electron ||
      !!((window as any).require && (window as any).require('electron')?.ipcRenderer)
    ));
  } catch {
    return false;
  }
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined' || !window.location) return false;
  return window.location.hostname === 'localhost' &&
    (window.location.port === '4200' || window.location.port === '4201');
}

/**
 * 返回當前應使用的 API 基址（與登錄、Bot 同一套系統）。
 * 優先級：api_server 存儲 > defaultLoginApiUrl（Electron/本地開發）> localhost:8000 > environment.apiBaseUrl
 */
export function getEffectiveApiBaseUrl(): string {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('api_server') : null;
  if (stored) {
    const url = stored.replace(/\/+$/, '');
    return url.startsWith('http') ? url : `https://${url}`;
  }
  const defaultUrl = (environment as { defaultLoginApiUrl?: string }).defaultLoginApiUrl?.trim?.();
  if (defaultUrl && (isElectronEnv() || isLocalDevHost())) {
    const url = defaultUrl.replace(/\/+$/, '');
    return url.startsWith('http') ? url : `https://${url}`;
  }
  if (isElectronEnv()) {
    const port = typeof localStorage !== 'undefined' ? localStorage.getItem('api_port') : null;
    return `http://localhost:${port && /^\d+$/.test(port) ? port : '8000'}`;
  }
  if (isLocalDevHost()) return 'http://localhost:8000';
  return (environment?.apiBaseUrl ?? '') || '';
}
