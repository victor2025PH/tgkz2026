/**
 * 本機安全存儲共用工具
 *
 * 背景（LICENSE_CONTRACT.md §6④ 續 / 融合方案文檔 §9.22-§9.23）：license token 與
 * 會話級請求簽名密鑰目前明文存在 localStorage——若攻擊者能整份拷走本機用戶數據
 * 目錄（不需要反編譯，只需要文件系統訪問權限），就能直接讀到兩者。
 *
 * 本工具把這兩項改為調用 Electron 主進程的 `safeStorage`（Windows 為 DPAPI，
 * 綁定當前系統用戶賬戶）加密後再落 localStorage；加密後的內容拷到另一台機器或
 * 另一個系統用戶下解不開。**局限（如實記錄）**：與當前用戶同權限運行的惡意程序
 * 仍可調用同一份 safeStorage API 自行解密——這是操作系統級限制，任何應用層方案
 * 都繞不開；本工具收窄的是"整份拷走本機存儲"這一類攻擊，不是萬能解法。
 *
 * 非 Electron 環境（純瀏覽器 Web 模式）/ safeStorage 不可用時：自動降級為明文
 * localStorage，與此前行為一致，不引入功能倒退。
 *
 * 存儲格式：加密值前綴 `enc1:`，方便 getItem 區分"這是加密過的"還是"歷史明文
 * 遺留值"，兩者都能正確讀出。
 */
import { isElectronRuntime } from './runtime-env.util';

const ENC_PREFIX = 'enc1:';

function getIpcRenderer(): { invoke: (channel: string, ...args: any[]) => Promise<any> } | null {
  if (!isElectronRuntime()) return null;
  try {
    const w = window as any;
    const electron = w.require ? w.require('electron') : null;
    return electron && electron.ipcRenderer ? electron.ipcRenderer : null;
  } catch {
    return null;
  }
}

/**
 * 加密並寫入 localStorage；非 Electron / 加密失敗時原樣明文寫入（降級，不拋異常）。
 */
export async function secureSetItem(key: string, value: string): Promise<void> {
  const ipc = getIpcRenderer();
  if (ipc) {
    try {
      const result = await ipc.invoke('secure-storage-encrypt', { text: value });
      if (result && result.success && result.cipher) {
        localStorage.setItem(key, ENC_PREFIX + result.cipher);
        return;
      }
    } catch {
      // 走下面的明文降級
    }
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage 本身不可用（如隱私模式）：靜默放棄，與此前行為一致
  }
}

/**
 * 讀取並按需解密；找不到返回 null。
 *
 * 加密值解不開時（非 Electron 環境 / 換了機器或系統用戶 / safeStorage 不可用）
 * 返回 null 而不是返回密文本身——調用方應視為"沒有這個值"，走各自的重新獲取
 * 路徑（重新登錄/重新心跳），絕不能把密文誤當明文使用。
 */
export async function secureGetItem(key: string): Promise<string | null> {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) return null;
  if (!raw.startsWith(ENC_PREFIX)) {
    return raw; // 兼容此前明文寫入的舊值
  }
  const cipher = raw.slice(ENC_PREFIX.length);
  const ipc = getIpcRenderer();
  if (!ipc) return null;
  try {
    const result = await ipc.invoke('secure-storage-decrypt', { cipher });
    return result && result.success ? (result.text ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * 與 localStorage.removeItem 等價（加密值/明文值都是同一個 key，直接刪即可）。
 */
export function secureRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 忽略
  }
}
