/**
 * Global Error Handler Service
 * 全局錯誤處理服務
 * 
 * 功能：
 * - 捕獲未處理的錯誤
 * - 生成錯誤報告
 * - 用戶友好的錯誤提示
 * - 可選的遠程錯誤上報
 */
import { Injectable, ErrorHandler, inject, signal, NgZone } from '@angular/core';
import { ToastService } from './toast.service';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  type: 'error' | 'unhandledrejection' | 'http' | 'validation' | 'network';
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  platform: string;
  appVersion: string;
  context?: Record<string, any>;
  resolved: boolean;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: ErrorReport[];
}

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
  private ngZone = inject(NgZone);
  
  // 錯誤存儲
  private errors = signal<ErrorReport[]>([]);
  private maxErrors = 100;  // 最多保留 100 條錯誤記錄
  
  // 遠程上報配置
  private remoteReportingEnabled = false;
  private remoteReportingUrl = '';
  
  // Toast 服務（延遲注入以避免循環依賴）
  private _toastService: ToastService | null = null;
  
  private get toastService(): ToastService {
    if (!this._toastService) {
      // 延遲注入
      this._toastService = inject(ToastService);
    }
    return this._toastService;
  }
  
  constructor() {
    this.setupGlobalHandlers();
    this.loadErrorHistory();
  }
  
  /**
   * Angular 錯誤處理器接口
   */
  handleError(error: any): void {
    this.ngZone.run(() => {
      this.captureError(error, 'error');
    });
  }
  
  /**
   * 設置全局錯誤處理器
   */
  private setupGlobalHandlers(): void {
    // 未捕獲的 Promise 錯誤
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, 'unhandledrejection');
    });
    
    // 全局錯誤
    window.addEventListener('error', (event) => {
      if (event.error) {
        this.captureError(event.error, 'error', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });
    
    // 網絡錯誤監控
    this.setupNetworkErrorHandler();
  }
  
  /**
   * 網絡錯誤監控
   */
  private setupNetworkErrorHandler(): void {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.status >= 500) {
          this.captureError(
            new Error(`HTTP ${response.status}: ${response.statusText}`),
            'http',
            { url: args[0], status: response.status }
          );
        }
        
        return response;
      } catch (error) {
        this.captureError(error, 'network', { url: args[0] });
        throw error;
      }
    };
  }
  
  /**
   * 捕獲錯誤
   */
  captureError(
    error: any,
    type: ErrorReport['type'] = 'error',
    context?: Record<string, any>
  ): void {
    const errorReport = this.createErrorReport(error, type, context);
    
    // 添加到錯誤列表
    this.errors.update(errors => {
      const newErrors = [errorReport, ...errors];
      return newErrors.slice(0, this.maxErrors);
    });
    
    // 保存到本地存儲
    this.saveErrorHistory();
    
    // 控制台輸出
    console.error(`[${type.toUpperCase()}]`, error);
    
    // 用戶提示
    this.showUserFriendlyError(errorReport);
    
    // 遠程上報
    if (this.remoteReportingEnabled) {
      this.reportToRemote(errorReport);
    }
  }
  
  /**
   * 創建錯誤報告
   */
  private createErrorReport(
    error: any,
    type: ErrorReport['type'],
    context?: Record<string, any>
  ): ErrorReport {
    const message = this.extractErrorMessage(error);
    const stack = error?.stack || '';
    
    return {
      id: this.generateId(),
      timestamp: new Date(),
      type,
      message,
      stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      appVersion: '1.0.5',  // 從配置讀取
      context,
      resolved: false
    };
  }
  
  /**
   * 提取錯誤消息
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return '未知錯誤';
  }
  
  /**
   * 顯示用戶友好的錯誤提示
   */
  private showUserFriendlyError(report: ErrorReport): void {
    const friendlyMessages: Record<string, string> = {
      'network': '網絡連接失敗，請檢查網絡設置',
      'http': '服務器響應異常，請稍後重試',
      'validation': '輸入數據驗證失敗',
      'error': '操作失敗，請重試',
      'unhandledrejection': '操作未完成，請重試'
    };
    
    const message = friendlyMessages[report.type] || '發生未知錯誤';
    
    try {
      this.toastService?.error(message, 5000);
    } catch (e) {
      // Toast 服務不可用時使用 alert
      console.error('Toast service unavailable:', e);
    }
  }
  
  /**
   * 遠程上報
   */
  private async reportToRemote(report: ErrorReport): Promise<void> {
    if (!this.remoteReportingUrl) return;
    
    try {
      await fetch(this.remoteReportingUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          timestamp: report.timestamp.toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }
  
  /**
   * 配置遠程上報
   */
  configureRemoteReporting(url: string): void {
    this.remoteReportingEnabled = true;
    this.remoteReportingUrl = url;
  }
  
  /**
   * 禁用遠程上報
   */
  disableRemoteReporting(): void {
    this.remoteReportingEnabled = false;
  }
  
  // ============ 錯誤歷史管理 ============
  
  /**
   * 獲取所有錯誤
   */
  getErrors(): ErrorReport[] {
    return this.errors();
  }
  
  /**
   * 獲取錯誤統計
   */
  getStats(): ErrorStats {
    const errors = this.errors();
    const errorsByType: Record<string, number> = {};
    
    errors.forEach(e => {
      errorsByType[e.type] = (errorsByType[e.type] || 0) + 1;
    });
    
    return {
      totalErrors: errors.length,
      errorsByType,
      recentErrors: errors.slice(0, 10)
    };
  }
  
  /**
   * 標記錯誤為已解決
   */
  resolveError(id: string): void {
    this.errors.update(errors =>
      errors.map(e => e.id === id ? { ...e, resolved: true } : e)
    );
    this.saveErrorHistory();
  }
  
  /**
   * 清除所有錯誤
   */
  clearErrors(): void {
    this.errors.set([]);
    this.saveErrorHistory();
  }
  
  /**
   * 導出錯誤報告
   */
  exportErrorReport(): string {
    const errors = this.errors();
    const report = {
      exportTime: new Date().toISOString(),
      appVersion: '1.0.5',
      platform: navigator.platform,
      totalErrors: errors.length,
      errors: errors.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      }))
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * 下載錯誤報告
   */
  downloadErrorReport(): void {
    const report = this.exportErrorReport();
    const blob = new Blob([report], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ============ 持久化 ============
  
  private saveErrorHistory(): void {
    try {
      const errors = this.errors().map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString()
      }));
      localStorage.setItem('tg-matrix-errors', JSON.stringify(errors.slice(0, 50)));
    } catch (e) {
      console.error('Failed to save error history:', e);
    }
  }
  
  private loadErrorHistory(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-errors');
      if (stored) {
        const errors = JSON.parse(stored).map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
        this.errors.set(errors);
      }
    } catch (e) {
      console.error('Failed to load error history:', e);
    }
  }
  
  private generateId(): string {
    return 'err-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// ============ 錯誤邊界組件 ============

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-boundary',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(hasError) {
      <div class="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div class="text-4xl mb-4">❌</div>
        <h3 class="text-xl font-bold text-white mb-2">出錯了</h3>
        <p class="text-slate-400 text-center mb-4">{{ errorMessage }}</p>
        <div class="flex gap-3">
          <button (click)="retry()" 
                  class="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600">
            重試
          </button>
          <button (click)="dismiss()" 
                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
            忽略
          </button>
        </div>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `
})
export class ErrorBoundaryComponent {
  @Input() fallbackMessage = '組件加載失敗';
  
  hasError = false;
  errorMessage = '';
  
  handleError(error: any): void {
    this.hasError = true;
    this.errorMessage = error?.message || this.fallbackMessage;
  }
  
  retry(): void {
    this.hasError = false;
    this.errorMessage = '';
  }
  
  dismiss(): void {
    this.hasError = false;
  }
}
