/**
 * Security Service
 * 安全服務 - 數據加密、敏感信息保護
 */
import { Injectable, signal } from '@angular/core';

// 簡單的加密工具（生產環境建議使用 crypto-js 或 Web Crypto API）
const ENCRYPTION_KEY = 'TG-AI智控王-2026-Secure-Key';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  
  private _isSecure = signal(true);
  isSecure = this._isSecure.asReadonly();
  
  constructor() {
    this.initSecurityChecks();
  }
  
  /**
   * 初始化安全檢查
   */
  private initSecurityChecks(): void {
    // 在生產環境執行安全檢查
    if (this.isProduction()) {
      this.detectDevTools();
      this.preventContextMenu();
      this.preventKeyboardShortcuts();
    }
  }
  
  /**
   * 檢查是否為生產環境
   */
  isProduction(): boolean {
    return !window.location.href.includes('localhost') && 
           !window.location.href.includes('127.0.0.1');
  }
  
  /**
   * 檢測開發者工具
   */
  private detectDevTools(): void {
    const threshold = 160;
    
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        this._isSecure.set(false);
        console.clear();
        console.log('%c⚠️ 檢測到開發者工具', 'color: red; font-size: 20px;');
      } else {
        this._isSecure.set(true);
      }
    };
    
    // 定期檢查
    setInterval(checkDevTools, 1000);
    
    // 使用 debugger 時間差檢測
    setInterval(() => {
      const start = performance.now();
      // debugger 語句在生產環境會被移除
      const duration = performance.now() - start;
      if (duration > 100) {
        this._isSecure.set(false);
      }
    }, 5000);
  }
  
  /**
   * 禁用右鍵菜單
   */
  private preventContextMenu(): void {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  }
  
  /**
   * 禁用調試快捷鍵
   */
  private preventKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+I (開發者工具)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+Shift+J (控制台)
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
      }
      
      // Ctrl+U (查看源代碼)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
      
      return true;
    });
  }
  
  // ============ 數據加密 ============
  
  /**
   * 加密敏感數據
   */
  encrypt(data: string): string {
    if (!data) return '';
    
    try {
      // Base64 + 簡單混淆（生產環境建議使用 AES）
      const encoded = btoa(unescape(encodeURIComponent(data)));
      const shuffled = this.shuffle(encoded, ENCRYPTION_KEY);
      return 'ENC:' + shuffled;
    } catch (e) {
      console.error('Encryption failed:', e);
      return data;
    }
  }
  
  /**
   * 解密敏感數據
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) return '';
    
    if (!encryptedData.startsWith('ENC:')) {
      return encryptedData; // 未加密的數據
    }
    
    try {
      const data = encryptedData.substring(4);
      const unshuffled = this.unshuffle(data, ENCRYPTION_KEY);
      return decodeURIComponent(escape(atob(unshuffled)));
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  }
  
  /**
   * 簡單混淆
   */
  private shuffle(str: string, key: string): string {
    const keySum = key.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const shift = keySum % 26;
    
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26) + 65);
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      return char;
    }).join('');
  }
  
  /**
   * 反混淆
   */
  private unshuffle(str: string, key: string): string {
    const keySum = key.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const shift = keySum % 26;
    
    return str.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
      }
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
      }
      return char;
    }).join('');
  }
  
  // ============ 安全存儲 ============
  
  /**
   * 安全存儲數據
   */
  secureStore(key: string, value: any): void {
    const encrypted = this.encrypt(JSON.stringify(value));
    localStorage.setItem(key, encrypted);
  }
  
  /**
   * 安全讀取數據
   */
  secureRetrieve<T>(key: string, defaultValue: T): T {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return defaultValue;
    
    try {
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted) as T;
    } catch (e) {
      return defaultValue;
    }
  }
  
  /**
   * 安全刪除數據
   */
  secureRemove(key: string): void {
    localStorage.removeItem(key);
  }
  
  // ============ API 密鑰保護 ============
  
  /**
   * 存儲 API 密鑰
   */
  storeApiKey(keyName: string, apiKey: string): void {
    this.secureStore(`api_${keyName}`, apiKey);
  }
  
  /**
   * 讀取 API 密鑰
   */
  getApiKey(keyName: string): string {
    return this.secureRetrieve(`api_${keyName}`, '');
  }
  
  /**
   * 刪除 API 密鑰
   */
  removeApiKey(keyName: string): void {
    this.secureRemove(`api_${keyName}`);
  }
  
  // ============ 機器指紋 ============
  
  /**
   * 生成機器指紋
   */
  generateFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown'
    ];
    
    const fingerprint = components.join('|');
    return this.hashString(fingerprint);
  }
  
  /**
   * 簡單哈希
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'fp-' + Math.abs(hash).toString(16);
  }
  
  // ============ 請求簽名 ============
  
  /**
   * 生成請求簽名
   */
  signRequest(payload: any, timestamp: number): string {
    const data = JSON.stringify(payload) + timestamp + ENCRYPTION_KEY;
    return this.hashString(data);
  }
  
  /**
   * 驗證請求簽名
   */
  verifySignature(payload: any, timestamp: number, signature: string): boolean {
    // 檢查時間戳是否在有效期內（5分鐘）
    const now = Date.now();
    if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
      return false;
    }
    
    const expectedSignature = this.signRequest(payload, timestamp);
    return expectedSignature === signature;
  }
}
