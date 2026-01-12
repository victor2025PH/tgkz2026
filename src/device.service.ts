/**
 * 設備服務
 * 處理設備碼生成、設備信息收集、設備指紋
 */

import { Injectable, signal, computed } from '@angular/core';

// 設備信息接口
export interface DeviceDetails {
  platform: string;
  arch: string;
  hostname: string;
  cpuModel: string;
  cpuCores: number;
  totalMemory: number;
  osType: string;
  osVersion: string;
  username: string;
  screenResolution: string;
  timezone: string;
  language: string;
}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private _deviceCode = signal<string | null>(null);
  private _deviceDetails = signal<DeviceDetails | null>(null);
  
  // 公開的計算屬性
  deviceCode = computed(() => this._deviceCode());
  deviceDetails = computed(() => this._deviceDetails());

  constructor() {
    this.initDeviceInfo();
  }

  /**
   * 初始化設備信息
   */
  private async initDeviceInfo(): Promise<void> {
    try {
      const details = await this.collectDeviceDetails();
      this._deviceDetails.set(details);
      
      const code = await this.generateDeviceCode(details);
      this._deviceCode.set(code);
    } catch (error) {
      console.error('初始化設備信息失敗:', error);
      // 使用備用設備碼
      this._deviceCode.set(this.generateFallbackDeviceCode());
    }
  }

  /**
   * 獲取設備碼
   */
  async getDeviceCode(): Promise<string> {
    // 如果已經生成，直接返回
    if (this._deviceCode()) {
      return this._deviceCode()!;
    }
    
    // 等待初始化完成
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this._deviceCode()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // 超時處理
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!this._deviceCode()) {
          this._deviceCode.set(this.generateFallbackDeviceCode());
        }
        resolve();
      }, 3000);
    });
    
    return this._deviceCode()!;
  }

  /**
   * 收集設備詳情
   */
  private async collectDeviceDetails(): Promise<DeviceDetails> {
    // 檢測是否在 Electron 環境
    const isElectron = typeof window !== 'undefined' && 
                       (window as any).electronAPI !== undefined;
    
    if (isElectron) {
      // 從 Electron 主進程獲取系統信息
      try {
        const systemInfo = await (window as any).electronAPI.invoke('get-system-info');
        if (systemInfo) {
          return {
            platform: systemInfo.platform || 'unknown',
            arch: systemInfo.arch || 'unknown',
            hostname: systemInfo.hostname || 'unknown',
            cpuModel: systemInfo.cpuModel || 'unknown',
            cpuCores: systemInfo.cpuCores || 1,
            totalMemory: systemInfo.totalMemory || 0,
            osType: systemInfo.osType || 'unknown',
            osVersion: systemInfo.osVersion || 'unknown',
            username: systemInfo.username || 'unknown',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language
          };
        }
      } catch (error) {
        console.warn('無法從 Electron 獲取系統信息:', error);
      }
    }
    
    // 瀏覽器環境或 Electron 獲取失敗時的備用方案
    return {
      platform: navigator.platform || 'web',
      arch: this.detectArch(),
      hostname: 'browser',
      cpuModel: 'unknown',
      cpuCores: navigator.hardwareConcurrency || 1,
      totalMemory: (navigator as any).deviceMemory || 0,
      osType: this.detectOS(),
      osVersion: 'unknown',
      username: 'webuser',
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  /**
   * 生成設備碼
   */
  private async generateDeviceCode(details: DeviceDetails): Promise<string> {
    // 組合多個設備特徵
    const fingerprint = [
      details.platform,
      details.arch,
      details.hostname,
      details.cpuCores.toString(),
      details.totalMemory.toString(),
      details.osType,
      details.screenResolution,
      details.timezone,
      details.language,
      // 添加一些瀏覽器指紋
      this.getCanvasFingerprint(),
      this.getWebGLFingerprint()
    ].join('|');
    
    // 生成 SHA-256 哈希
    const hash = await this.sha256(fingerprint);
    
    // 格式化為設備碼
    const shortHash = hash.substr(0, 16).toUpperCase();
    return `TGM-${shortHash.substr(0, 4)}-${shortHash.substr(4, 4)}-${shortHash.substr(8, 4)}-${shortHash.substr(12, 4)}`;
  }

  /**
   * 生成備用設備碼（當無法獲取完整設備信息時）
   */
  private generateFallbackDeviceCode(): string {
    // 嘗試從 localStorage 獲取已保存的設備碼
    const saved = localStorage.getItem('tgm_device_code');
    if (saved) {
      return saved;
    }
    
    // 生成隨機設備碼並保存
    const random = Math.random().toString(36).substr(2, 16).toUpperCase();
    const code = `TGM-${random.substr(0, 4)}-${random.substr(4, 4)}-${random.substr(8, 4)}-${random.substr(12, 4)}`;
    localStorage.setItem('tgm_device_code', code);
    return code;
  }

  /**
   * SHA-256 哈希
   */
  private async sha256(message: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // 備用簡單哈希
    return this.simpleHash(message);
  }

  /**
   * 簡單哈希（備用）
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * 檢測操作系統
   */
  private detectOS(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.indexOf('Win') !== -1) return 'Windows';
    if (userAgent.indexOf('Mac') !== -1) return 'macOS';
    if (userAgent.indexOf('Linux') !== -1) return 'Linux';
    if (userAgent.indexOf('Android') !== -1) return 'Android';
    if (userAgent.indexOf('iOS') !== -1) return 'iOS';
    return 'Unknown';
  }

  /**
   * 檢測架構
   */
  private detectArch(): string {
    const platform = navigator.platform;
    if (platform.indexOf('64') !== -1) return 'x64';
    if (platform.indexOf('ARM') !== -1) return 'arm';
    return 'x86';
  }

  /**
   * Canvas 指紋
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';
      
      canvas.width = 200;
      canvas.height = 50;
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('TG-AI智控王', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('fingerprint', 4, 17);
      
      return canvas.toDataURL().substr(-50);
    } catch {
      return 'canvas-error';
    }
  }

  /**
   * WebGL 指紋
   */
  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        return `${vendor}|${renderer}`.substr(0, 50);
      }
      
      return 'webgl-no-debug';
    } catch {
      return 'webgl-error';
    }
  }

  /**
   * 獲取設備名稱（友好顯示）
   */
  getDeviceName(): string {
    const details = this._deviceDetails();
    if (!details) {
      return '未知設備';
    }
    
    const os = details.osType;
    const platform = details.platform;
    
    if (os === 'Windows') {
      return `Windows PC (${details.cpuCores} 核心)`;
    } else if (os === 'macOS') {
      return `Mac (${details.cpuCores} 核心)`;
    } else if (os === 'Linux') {
      return `Linux (${details.hostname})`;
    }
    
    return `${platform} 設備`;
  }

  /**
   * 獲取設備簡短 ID（用於顯示）
   */
  getShortDeviceId(): string {
    const code = this._deviceCode();
    if (!code) return '...';
    return code.substr(4, 9);
  }
}
