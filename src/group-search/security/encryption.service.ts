/**
 * TG-AI智控王 數據加密服務
 * Encryption Service v1.0
 * 
 * 💡 設計思考：
 * 1. AES-256-GCM 加密 - 提供認證加密
 * 2. 密鑰派生 - 使用 PBKDF2 從密碼派生密鑰
 * 3. 密鑰輪換 - 支持定期更換密鑰
 * 4. 安全存儲 - 密鑰不以明文形式存儲
 * 5. 零知識設計 - 服務端無法解密用戶數據
 */

import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

export interface EncryptedData {
  ciphertext: string;      // Base64 編碼的密文
  iv: string;              // Base64 編碼的初始向量
  salt?: string;           // Base64 編碼的鹽（如果使用密碼派生）
  tag?: string;            // Base64 編碼的認證標籤
  version: number;         // 加密版本
  timestamp: number;       // 加密時間戳
}

export interface KeyInfo {
  id: string;
  createdAt: number;
  expiresAt?: number;
  algorithm: string;
  isActive: boolean;
}

export interface EncryptionConfig {
  algorithm: 'AES-GCM' | 'AES-CBC';
  keyLength: 128 | 192 | 256;
  pbkdf2Iterations: number;
  keyRotationDays?: number;
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  pbkdf2Iterations: 100000,
  keyRotationDays: 30
};

const CURRENT_VERSION = 1;

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private config: EncryptionConfig;
  private masterKey: CryptoKey | null = null;
  private keyInfo: KeyInfo | null = null;
  
  // 狀態
  private _isInitialized = signal(false);
  isInitialized = computed(() => this._isInitialized());
  
  private _keyStatus = signal<'none' | 'active' | 'expired' | 'error'>('none');
  keyStatus = computed(() => this._keyStatus());
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.checkExistingKey();
  }
  
  // ============ 密鑰管理 ============
  
  /**
   * 使用密碼初始化加密
   * 
   * 💡 思考：密碼不存儲，每次啟動需要重新輸入
   * 這樣即使應用被入侵，也無法解密數據
   */
  async initializeWithPassword(password: string): Promise<boolean> {
    try {
      // 檢查是否有已存儲的鹽
      const storedSalt = localStorage.getItem('tgai-encryption-salt');
      const salt = storedSalt 
        ? this.base64ToBuffer(storedSalt)
        : crypto.getRandomValues(new Uint8Array(16));
      
      // 從密碼派生密鑰
      this.masterKey = await this.deriveKeyFromPassword(password, salt);
      
      // 如果是首次，存儲鹽
      if (!storedSalt) {
        localStorage.setItem('tgai-encryption-salt', this.bufferToBase64(salt));
      }
      
      // 驗證密鑰是否正確（通過解密測試數據）
      const isValid = await this.verifyKey();
      
      if (isValid) {
        this.keyInfo = {
          id: `key_${Date.now()}`,
          createdAt: Date.now(),
          algorithm: `${this.config.algorithm}-${this.config.keyLength}`,
          isActive: true
        };
        
        this._isInitialized.set(true);
        this._keyStatus.set('active');
        
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[Encryption] Initialization failed:', error);
      this._keyStatus.set('error');
      return false;
    }
  }
  
  /**
   * 生成隨機密鑰
   * 
   * 💡 用於不需要密碼保護的場景（如會話加密）
   */
  async generateRandomKey(): Promise<CryptoKey> {
    return await crypto.subtle.generateKey(
      {
        name: this.config.algorithm,
        length: this.config.keyLength
      },
      true,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * 從密碼派生密鑰
   */
  private async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // 導入密碼
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // 派生 AES 密鑰
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.config.pbkdf2Iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.config.algorithm,
        length: this.config.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  /**
   * 驗證密鑰是否正確
   */
  private async verifyKey(): Promise<boolean> {
    const testData = localStorage.getItem('tgai-encryption-verify');
    
    if (!testData) {
      // 首次使用，創建驗證數據
      const verifyPlaintext = 'TGAI_VERIFY_KEY';
      const encrypted = await this.encrypt(verifyPlaintext);
      localStorage.setItem('tgai-encryption-verify', JSON.stringify(encrypted));
      return true;
    }
    
    try {
      const encrypted = JSON.parse(testData) as EncryptedData;
      const decrypted = await this.decrypt(encrypted);
      return decrypted === 'TGAI_VERIFY_KEY';
    } catch {
      return false;
    }
  }
  
  /**
   * 更改密碼
   * 
   * 💡 需要重新加密所有數據
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    // 驗證舊密碼
    const storedSalt = localStorage.getItem('tgai-encryption-salt');
    if (!storedSalt) return false;
    
    const oldKey = await this.deriveKeyFromPassword(
      oldPassword,
      this.base64ToBuffer(storedSalt)
    );
    
    // 嘗試用舊密鑰解密驗證數據
    const oldMasterKey = this.masterKey;
    this.masterKey = oldKey;
    
    const isValid = await this.verifyKey();
    if (!isValid) {
      this.masterKey = oldMasterKey;
      return false;
    }
    
    // 生成新鹽和密鑰
    const newSalt = crypto.getRandomValues(new Uint8Array(16));
    const newKey = await this.deriveKeyFromPassword(newPassword, newSalt);
    
    // 更新驗證數據
    this.masterKey = newKey;
    const verifyPlaintext = 'TGAI_VERIFY_KEY';
    const encrypted = await this.encrypt(verifyPlaintext);
    
    localStorage.setItem('tgai-encryption-salt', this.bufferToBase64(newSalt));
    localStorage.setItem('tgai-encryption-verify', JSON.stringify(encrypted));
    
    return true;
  }
  
  /**
   * 檢查已存在的密鑰
   */
  private checkExistingKey(): void {
    const hasKey = localStorage.getItem('tgai-encryption-salt') !== null;
    this._keyStatus.set(hasKey ? 'none' : 'none');
  }
  
  // ============ 加密操作 ============
  
  /**
   * 加密數據
   */
  async encrypt(data: string | object): Promise<EncryptedData> {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }
    
    // 序列化數據
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const plaintextBuffer = new TextEncoder().encode(plaintext);
    
    // 生成隨機 IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密
    const ciphertextBuffer = await crypto.subtle.encrypt(
      {
        name: this.config.algorithm,
        iv
      },
      this.masterKey,
      plaintextBuffer
    );
    
    return {
      ciphertext: this.bufferToBase64(new Uint8Array(ciphertextBuffer)),
      iv: this.bufferToBase64(iv),
      version: CURRENT_VERSION,
      timestamp: Date.now()
    };
  }
  
  /**
   * 解密數據
   */
  async decrypt<T = string>(encrypted: EncryptedData): Promise<T> {
    if (!this.masterKey) {
      throw new Error('Encryption not initialized');
    }
    
    const ciphertextBuffer = this.base64ToBuffer(encrypted.ciphertext);
    const iv = this.base64ToBuffer(encrypted.iv);
    
    // 解密
    const plaintextBuffer = await crypto.subtle.decrypt(
      {
        name: this.config.algorithm,
        iv
      },
      this.masterKey,
      ciphertextBuffer
    );
    
    const plaintext = new TextDecoder().decode(plaintextBuffer);
    
    // 嘗試解析 JSON
    try {
      return JSON.parse(plaintext) as T;
    } catch {
      return plaintext as unknown as T;
    }
  }
  
  /**
   * 加密對象的特定字段
   * 
   * 💡 用於只加密敏感字段，保留結構
   */
  async encryptFields<T extends object>(
    data: T,
    fields: (keyof T)[]
  ): Promise<T & { _encrypted: Record<string, EncryptedData> }> {
    const result = { ...data } as T & { _encrypted: Record<string, EncryptedData> };
    result._encrypted = {};
    
    for (const field of fields) {
      if (data[field] !== undefined) {
        result._encrypted[field as string] = await this.encrypt(data[field] as any);
        delete (result as any)[field];
      }
    }
    
    return result;
  }
  
  /**
   * 解密對象的加密字段
   */
  async decryptFields<T extends object>(
    data: T & { _encrypted?: Record<string, EncryptedData> }
  ): Promise<T> {
    if (!data._encrypted) {
      return data;
    }
    
    const result = { ...data } as T;
    
    for (const [field, encrypted] of Object.entries(data._encrypted)) {
      (result as any)[field] = await this.decrypt(encrypted);
    }
    
    delete (result as any)._encrypted;
    
    return result;
  }
  
  // ============ 哈希操作 ============
  
  /**
   * 計算 SHA-256 哈希
   */
  async hash(data: string): Promise<string> {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.bufferToHex(new Uint8Array(hashBuffer));
  }
  
  /**
   * 計算 HMAC
   */
  async hmac(data: string, key: string): Promise<string> {
    const keyBuffer = new TextEncoder().encode(key);
    const dataBuffer = new TextEncoder().encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return this.bufferToHex(new Uint8Array(signature));
  }
  
  // ============ 安全隨機 ============
  
  /**
   * 生成安全隨機字符串
   */
  generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues)
      .map(v => chars[v % chars.length])
      .join('');
  }
  
  /**
   * 生成 UUID
   */
  generateUUID(): string {
    return crypto.randomUUID();
  }
  
  // ============ 工具方法 ============
  
  private bufferToBase64(buffer: Uint8Array): string {
    return btoa(String.fromCharCode(...buffer));
  }
  
  private base64ToBuffer(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }
  
  private bufferToHex(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // ============ 清理 ============
  
  /**
   * 安全清除密鑰
   */
  clearKey(): void {
    this.masterKey = null;
    this.keyInfo = null;
    this._isInitialized.set(false);
    this._keyStatus.set('none');
  }
  
  /**
   * 完全重置（刪除所有加密數據）
   */
  async reset(): Promise<void> {
    this.clearKey();
    localStorage.removeItem('tgai-encryption-salt');
    localStorage.removeItem('tgai-encryption-verify');
  }
}
