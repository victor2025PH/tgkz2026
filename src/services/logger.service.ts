/**
 * 統一日志服務
 * 在生產環境中禁用 console.log，減少性能開銷
 * 
 * 使用方式：
 *   import { Logger } from './services/logger.service';
 *   Logger.log('message');
 *   Logger.warn('warning');
 *   Logger.error('error');
 */

// 檢測是否為生產環境
const isProduction = (): boolean => {
  // Electron 環境檢測
  if (typeof window !== 'undefined' && (window as any).electron) {
    return !(window as any).electron.isDev;
  }
  // 通過 URL 判斷（開發環境通常使用 localhost）
  if (typeof window !== 'undefined' && window.location) {
    return !window.location.hostname.includes('localhost');
  }
  return true; // 默認為生產環境
};

// 日志級別
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// 當前日志級別（生產環境只顯示 WARN 和 ERROR）
const currentLevel = isProduction() ? LogLevel.WARN : LogLevel.DEBUG;

// 日志顏色
const colors = {
  debug: 'color: #6c757d',
  info: 'color: #17a2b8',
  warn: 'color: #ffc107',
  error: 'color: #dc3545',
  success: 'color: #28a745'
};

/**
 * 日志工具類
 */
export class Logger {
  private static prefix = '[TG-Matrix]';
  
  /**
   * 調試日志（僅開發環境）
   */
  static debug(...args: any[]): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.log(`%c${this.prefix} [DEBUG]`, colors.debug, ...args);
    }
  }
  
  /**
   * 信息日志（僅開發環境）
   */
  static log(...args: any[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(`%c${this.prefix} [INFO]`, colors.info, ...args);
    }
  }
  
  /**
   * 信息日志（同 log）
   */
  static info(...args: any[]): void {
    this.log(...args);
  }
  
  /**
   * 警告日志（生產環境可見）
   */
  static warn(...args: any[]): void {
    if (currentLevel <= LogLevel.WARN) {
      console.warn(`%c${this.prefix} [WARN]`, colors.warn, ...args);
    }
  }
  
  /**
   * 錯誤日志（生產環境可見）
   */
  static error(...args: any[]): void {
    if (currentLevel <= LogLevel.ERROR) {
      console.error(`%c${this.prefix} [ERROR]`, colors.error, ...args);
    }
  }
  
  /**
   * 成功日志（僅開發環境）
   */
  static success(...args: any[]): void {
    if (currentLevel <= LogLevel.INFO) {
      console.log(`%c${this.prefix} [SUCCESS]`, colors.success, ...args);
    }
  }
  
  /**
   * 分組日志
   */
  static group(label: string): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.group(`${this.prefix} ${label}`);
    }
  }
  
  static groupEnd(): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.groupEnd();
    }
  }
  
  /**
   * 表格日志
   */
  static table(data: any): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.table(data);
    }
  }
  
  /**
   * 計時器
   */
  static time(label: string): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.time(`${this.prefix} ${label}`);
    }
  }
  
  static timeEnd(label: string): void {
    if (currentLevel <= LogLevel.DEBUG) {
      console.timeEnd(`${this.prefix} ${label}`);
    }
  }
}

// 導出默認實例
export default Logger;
