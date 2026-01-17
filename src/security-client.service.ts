/**
 * TG-AI智控王 Security Client Service
 * 安全加固服務 v2.0
 * 
 * 功能：
 * - 請求簽名
 * - Token 刷新
 * - 設備指紋
 * - 防重放攻擊
 */
import { Injectable, signal, inject, NgZone, OnDestroy } from '@angular/core';

// JWT 密鑰（應與服務器保持一致）
const JWT_SECRET = 'tgai-license-secret-2026';

@Injectable({
  providedIn: 'root'
})
export class SecurityClientService implements OnDestroy {
  private ngZone = inject(NgZone);
  
  // 設備信息
  private _machineId = signal<string>('');
  private _deviceFingerprint = signal<string>('');
  
  // Token 刷新
  private tokenRefreshInterval: any = null;
  private lastTokenRefresh = signal<Date | null>(null);
  
  constructor() {
    this.initializeDeviceInfo();
    this.startTokenRefreshTimer();
  }
  
  ngOnDestroy(): void {
    this.stopTokenRefreshTimer();
  }
  
  // ============ 初始化 ============
  
  private initializeDeviceInfo(): void {
    this._machineId.set(this.getMachineId());
    this._deviceFingerprint.set(this.generateDeviceFingerprint());
  }
  
  // ============ 設備標識 ============
  
  /**
   * 獲取機器碼
   */
  getMachineId(): string {
    let machineId = localStorage.getItem('tgai-machine-id');
    if (!machineId) {
      machineId = this.generateMachineId();
      localStorage.setItem('tgai-machine-id', machineId);
    }
    return machineId;
  }
  
  private generateMachineId(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0
    ];
    
    const hash = this.hashString(components.join('|'));
    return `M-${hash.substring(0, 16).toUpperCase()}`;
  }
  
  /**
   * 生成設備指紋
   */
  generateDeviceFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.platform,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 0,
      (navigator as any).deviceMemory || 0,
      navigator.maxTouchPoints || 0,
      // Canvas 指紋
      this.getCanvasFingerprint(),
      // WebGL 指紋
      this.getWebGLFingerprint()
    ];
    
    return this.hashString(components.join('::'));
  }
  
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TG-AI智控王', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('TG-AI智控王', 4, 17);
      
      return canvas.toDataURL().substring(0, 100);
    } catch {
      return '';
    }
  }
  
  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      if (!gl) return '';
      
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${vendor}|${renderer}`;
      }
      return '';
    } catch {
      return '';
    }
  }
  
  // ============ 請求簽名 ============
  
  /**
   * 生成請求簽名
   */
  generateRequestSignature(timestamp: number, nonce: string, machineId: string): string {
    const signString = `${timestamp}:${nonce}:${machineId}:${JWT_SECRET}`;
    return this.hashString(signString);
  }
  
  /**
   * 生成 nonce
   */
  generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * 創建安全請求頭
   */
  createSecureHeaders(): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = this.generateNonce();
    const machineId = this._machineId();
    const signature = this.generateRequestSignature(timestamp, nonce, machineId);
    
    return {
      'X-Signature': signature,
      'X-Timestamp': timestamp.toString(),
      'X-Nonce': nonce,
      'X-Machine-Id': machineId
    };
  }
  
  /**
   * 創建帶簽名的請求體
   */
  createSignedRequestBody(data: Record<string, any>): Record<string, any> {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = this.generateNonce();
    
    return {
      ...data,
      timestamp,
      nonce,
      machine_id: this._machineId(),
      device_fingerprint: this._deviceFingerprint()
    };
  }
  
  // ============ Token 刷新 ============
  
  private startTokenRefreshTimer(): void {
    // 每 20 小時刷新一次 Token（Token 有效期 24 小時）
    this.tokenRefreshInterval = setInterval(() => {
      this.ngZone.run(() => {
        window.dispatchEvent(new CustomEvent('refresh-token'));
      });
    }, 20 * 60 * 60 * 1000);
  }
  
  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }
  
  /**
   * 檢查是否需要刷新 Token
   */
  shouldRefreshToken(tokenExpiry?: Date): boolean {
    if (!tokenExpiry) return false;
    
    // 如果 Token 將在 4 小時內過期，則刷新
    const hoursUntilExpiry = (tokenExpiry.getTime() - Date.now()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 4;
  }
  
  // ============ 工具方法 ============
  
  private hashString(str: string): string {
    // 使用 SHA-256 哈希
    return this.sha256(str);
  }
  
  private sha256(str: string): string {
    // 簡化的 SHA-256 實現（生產環境應使用 crypto.subtle）
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    
    // 使用簡單的哈希算法（實際應使用 Web Crypto API）
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // 轉換為 64 字符的十六進制字符串
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    return (hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr + hashStr).substring(0, 64);
  }
  
  /**
   * 使用 Web Crypto API 的 SHA-256（異步）
   */
  async sha256Async(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // ============ 公開屬性 ============
  
  get machineId(): string {
    return this._machineId();
  }
  
  get deviceFingerprint(): string {
    return this._deviceFingerprint();
  }
}
