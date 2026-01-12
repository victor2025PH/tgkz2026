/**
 * Form Validator Service
 * Provides real-time form validation with consistent error messages
 */
import { Injectable, signal } from '@angular/core';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface FieldValidation {
  field: string;
  valid: boolean;
  error?: string;
  touched: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FormValidatorService {
  
  // ========== Phone Number Validation ==========
  
  /**
   * Validate phone number format (+country code + number)
   */
  validatePhone(phone: string): ValidationResult {
    if (!phone || !phone.trim()) {
      return { valid: false, error: '手機號碼為必填項' };
    }
    
    phone = phone.trim();
    
    // Must start with +
    if (!phone.startsWith('+')) {
      return { valid: false, error: '手機號碼必須以 + 開頭（包含國家碼）' };
    }
    
    // Check format: + followed by 7-15 digits
    const phoneRegex = /^\+\d{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, error: '手機號碼格式不正確，例如: +8613800138000' };
    }
    
    return { valid: true };
  }
  
  // ========== API Credentials Validation ==========
  
  /**
   * Validate API ID (positive integer)
   */
  validateApiId(apiId: string): ValidationResult {
    if (!apiId || !apiId.trim()) {
      return { valid: false, error: 'API ID 為必填項' };
    }
    
    apiId = apiId.trim();
    
    // Must be positive integer
    const apiIdRegex = /^\d+$/;
    if (!apiIdRegex.test(apiId)) {
      return { valid: false, error: 'API ID 必須是數字' };
    }
    
    const apiIdNum = parseInt(apiId, 10);
    if (apiIdNum <= 0) {
      return { valid: false, error: 'API ID 必須是正整數' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate API Hash (32-character hex string)
   */
  validateApiHash(apiHash: string): ValidationResult {
    if (!apiHash || !apiHash.trim()) {
      return { valid: false, error: 'API Hash 為必填項' };
    }
    
    apiHash = apiHash.trim();
    
    // Must be 32-character hex string
    const apiHashRegex = /^[a-fA-F0-9]{32}$/;
    if (!apiHashRegex.test(apiHash)) {
      return { valid: false, error: 'API Hash 必須是 32 位十六進制字符串' };
    }
    
    return { valid: true };
  }
  
  // ========== Proxy Validation ==========
  
  /**
   * Validate proxy URL format (optional)
   */
  validateProxy(proxy: string): ValidationResult {
    if (!proxy || !proxy.trim()) {
      return { valid: true }; // Proxy is optional
    }
    
    proxy = proxy.trim();
    
    // Supported formats:
    // socks5://host:port
    // socks5://user:pass@host:port
    // http://host:port
    // https://host:port
    const proxyRegex = /^(socks5|http|https):\/\/([^:]+:[^@]+@)?[^:]+:\d+$/;
    if (!proxyRegex.test(proxy)) {
      return { valid: false, error: '代理格式不正確，例如: socks5://127.0.0.1:1080' };
    }
    
    return { valid: true };
  }
  
  // ========== Group/Channel Validation ==========
  
  /**
   * Validate Telegram group/channel URL or username
   */
  validateGroupUrl(url: string): ValidationResult {
    if (!url || !url.trim()) {
      return { valid: false, error: '群組 URL 或用戶名為必填項' };
    }
    
    url = url.trim();
    
    // Accept various formats:
    // - https://t.me/groupname
    // - t.me/groupname
    // - @username
    // - username
    // - https://t.me/+invitecode
    const urlRegex = /^(https?:\/\/)?(t\.me|telegram\.me)\/(joinchat\/)?[\w+-]+$/i;
    const usernameRegex = /^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
    const inviteRegex = /^(https?:\/\/)?(t\.me|telegram\.me)\/\+[\w-]+$/i;
    
    if (urlRegex.test(url) || usernameRegex.test(url) || inviteRegex.test(url)) {
      return { valid: true };
    }
    
    return { valid: false, error: '請輸入有效的 Telegram 群組 URL 或 @username' };
  }
  
  // ========== Keyword Validation ==========
  
  /**
   * Validate keyword
   */
  validateKeyword(keyword: string, isRegex: boolean = false): ValidationResult {
    if (!keyword || !keyword.trim()) {
      return { valid: false, error: '關鍵詞為必填項' };
    }
    
    keyword = keyword.trim();
    
    if (keyword.length > 200) {
      return { valid: false, error: '關鍵詞長度不能超過 200 個字符' };
    }
    
    if (isRegex) {
      try {
        new RegExp(keyword);
      } catch (e) {
        return { valid: false, error: `正則表達式語法錯誤: ${(e as Error).message}` };
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Validate keyword set name
   */
  validateKeywordSetName(name: string): ValidationResult {
    if (!name || !name.trim()) {
      return { valid: false, error: '關鍵詞集名稱為必填項' };
    }
    
    name = name.trim();
    
    if (name.length > 100) {
      return { valid: false, error: '關鍵詞集名稱不能超過 100 個字符' };
    }
    
    // Check for invalid characters
    if (/[\x00-\x1f\x7f<>"|?*\\/:;]/.test(name)) {
      return { valid: false, error: '名稱包含無效字符' };
    }
    
    return { valid: true };
  }
  
  // ========== Template Validation ==========
  
  /**
   * Validate template name
   */
  validateTemplateName(name: string): ValidationResult {
    if (!name || !name.trim()) {
      return { valid: false, error: '模板名稱為必填項' };
    }
    
    if (name.trim().length > 100) {
      return { valid: false, error: '模板名稱不能超過 100 個字符' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate template content
   */
  validateTemplateContent(content: string): ValidationResult {
    if (!content || !content.trim()) {
      return { valid: false, error: '模板內容為必填項' };
    }
    
    content = content.trim();
    
    if (content.length > 4096) {
      return { valid: false, error: '模板內容不能超過 4096 個字符（Telegram 限制）' };
    }
    
    // Check for unmatched braces
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: '模板中的大括號不匹配' };
    }
    
    return { valid: true };
  }
  
  // ========== Campaign Validation ==========
  
  /**
   * Validate campaign name
   */
  validateCampaignName(name: string): ValidationResult {
    if (!name || !name.trim()) {
      return { valid: false, error: '活動名稱為必填項' };
    }
    
    if (name.trim().length > 100) {
      return { valid: false, error: '活動名稱不能超過 100 個字符' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate delay range
   */
  validateDelayRange(minDelay: number, maxDelay: number): ValidationResult {
    if (minDelay < 0) {
      return { valid: false, error: '最小延遲不能為負數' };
    }
    
    if (maxDelay > 3600) {
      return { valid: false, error: '最大延遲不能超過 3600 秒（1小時）' };
    }
    
    if (minDelay > maxDelay) {
      return { valid: false, error: '最小延遲不能大於最大延遲' };
    }
    
    return { valid: true };
  }
  
  // ========== Generic Validations ==========
  
  /**
   * Validate email format
   */
  validateEmail(email: string): ValidationResult {
    if (!email || !email.trim()) {
      return { valid: false, error: '電子郵件為必填項' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { valid: false, error: '電子郵件格式不正確' };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate required field
   */
  validateRequired(value: string, fieldName: string): ValidationResult {
    if (!value || !value.trim()) {
      return { valid: false, error: `${fieldName}為必填項` };
    }
    return { valid: true };
  }
  
  /**
   * Validate string length
   */
  validateLength(value: string, fieldName: string, minLength: number = 0, maxLength?: number): ValidationResult {
    const len = value ? value.trim().length : 0;
    
    if (len < minLength) {
      return { valid: false, error: `${fieldName}至少需要 ${minLength} 個字符` };
    }
    
    if (maxLength && len > maxLength) {
      return { valid: false, error: `${fieldName}不能超過 ${maxLength} 個字符` };
    }
    
    return { valid: true };
  }
  
  /**
   * Validate number range
   */
  validateNumberRange(value: number, fieldName: string, min?: number, max?: number): ValidationResult {
    if (isNaN(value)) {
      return { valid: false, error: `${fieldName}必須是數字` };
    }
    
    if (min !== undefined && value < min) {
      return { valid: false, error: `${fieldName}不能小於 ${min}` };
    }
    
    if (max !== undefined && value > max) {
      return { valid: false, error: `${fieldName}不能大於 ${max}` };
    }
    
    return { valid: true };
  }
  
  // ========== Account Form Validation ==========
  
  /**
   * Validate complete account form
   */
  validateAccountForm(data: {
    phone: string;
    apiId: string;
    apiHash: string;
    proxy?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const phoneResult = this.validatePhone(data.phone);
    if (!phoneResult.valid) errors.push(phoneResult.error!);
    
    const apiIdResult = this.validateApiId(data.apiId);
    if (!apiIdResult.valid) errors.push(apiIdResult.error!);
    
    const apiHashResult = this.validateApiHash(data.apiHash);
    if (!apiHashResult.valid) errors.push(apiHashResult.error!);
    
    if (data.proxy) {
      const proxyResult = this.validateProxy(data.proxy);
      if (!proxyResult.valid) errors.push(proxyResult.error!);
    }
    
    return { valid: errors.length === 0, errors };
  }
}
