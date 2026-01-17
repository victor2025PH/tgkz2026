/**
 * 友好錯誤處理服務
 * Friendly Error Handler Service
 * 
 * 功能:
 * 1. 技術錯誤轉換為用戶可理解提示
 * 2. 提供解決建議
 * 3. 支持多語言
 */

import { Injectable, inject, signal, ErrorHandler } from '@angular/core';

/**
 * 全局錯誤處理器 (Angular ErrorHandler)
 * 保持向後兼容
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorHandlerService = inject(ErrorHandlerService);
  
  handleError(error: any): void {
    console.error('Global error caught:', error);
    // 使用友好錯誤處理服務
    this.errorHandlerService.handleError(error);
  }
}

// 錯誤類型
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// 友好錯誤信息
export interface FriendlyError {
  id: string;
  title: string;
  message: string;
  suggestion?: string;
  severity: ErrorSeverity;
  timestamp: Date;
  originalError?: string;
  actionLabel?: string;
  actionHandler?: string;
}

// 錯誤映射規則
interface ErrorMapping {
  pattern: RegExp;
  title: string;
  message: string;
  suggestion?: string;
  severity: ErrorSeverity;
  actionLabel?: string;
  actionHandler?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  
  // 當前錯誤列表
  errors = signal<FriendlyError[]>([]);
  
  // 錯誤映射表
  private errorMappings: ErrorMapping[] = [
    // 網絡錯誤
    {
      pattern: /connection.*reset|ECONNRESET|network.*error/i,
      title: '網絡連接中斷',
      message: '與服務器的連接被意外中斷',
      suggestion: '請檢查網絡連接，稍後重試',
      severity: 'warning',
      actionLabel: '重試',
      actionHandler: 'retry-connection'
    },
    {
      pattern: /timeout|ETIMEDOUT/i,
      title: '操作超時',
      message: '操作等待時間過長',
      suggestion: '網絡可能較慢，請稍後重試',
      severity: 'warning',
      actionLabel: '重試',
      actionHandler: 'retry-operation'
    },
    
    // Telegram 相關錯誤
    {
      pattern: /FloodWait.*?(\d+)/i,
      title: 'Telegram 頻率限制',
      message: '操作過於頻繁，需要等待',
      suggestion: '系統會自動等待後重試，請稍候',
      severity: 'warning'
    },
    {
      pattern: /USERNAME_INVALID|USERNAME_NOT_OCCUPIED/i,
      title: '用戶名無效',
      message: '找不到該 Telegram 用戶',
      suggestion: '請檢查用戶名是否正確',
      severity: 'info'
    },
    {
      pattern: /PEER_FLOOD/i,
      title: '操作受限',
      message: '您的帳號因頻繁操作被暫時限制',
      suggestion: '建議等待 24-48 小時後再試',
      severity: 'error'
    },
    {
      pattern: /AUTH_KEY_UNREGISTERED|SESSION_EXPIRED/i,
      title: '登錄已過期',
      message: '帳號的登錄狀態已失效',
      suggestion: '請重新登錄帳號',
      severity: 'error',
      actionLabel: '重新登錄',
      actionHandler: 'relogin'
    },
    {
      pattern: /PHONE_NUMBER_BANNED|USER_DEACTIVATED/i,
      title: '帳號已被封禁',
      message: '該 Telegram 帳號已被限制使用',
      suggestion: '請聯繫 Telegram 支持或使用其他帳號',
      severity: 'critical'
    },
    {
      pattern: /CHAT_WRITE_FORBIDDEN/i,
      title: '無法發送消息',
      message: '您沒有在該群組發送消息的權限',
      suggestion: '請檢查群組設置或申請發言權限',
      severity: 'warning'
    },
    {
      pattern: /USER_NOT_PARTICIPANT/i,
      title: '尚未加入群組',
      message: '需要先加入群組才能進行操作',
      suggestion: '請先加入目標群組',
      severity: 'warning',
      actionLabel: '加入群組',
      actionHandler: 'join-group'
    },
    
    // 數據庫錯誤
    {
      pattern: /database.*locked|SQLITE_BUSY/i,
      title: '數據正在處理',
      message: '數據庫正忙，請稍後重試',
      suggestion: '請等待幾秒後重試',
      severity: 'info'
    },
    {
      pattern: /no such table|table.*not.*exist/i,
      title: '數據初始化中',
      message: '系統正在初始化數據結構',
      suggestion: '請稍候，系統會自動完成初始化',
      severity: 'info'
    },
    
    // 後端錯誤
    {
      pattern: /Backend.*not.*running|python.*not.*found/i,
      title: '後端服務未運行',
      message: 'Python 後端服務尚未啟動',
      suggestion: '請確保後端程序正在運行',
      severity: 'critical',
      actionLabel: '查看幫助',
      actionHandler: 'show-backend-help'
    },
    {
      pattern: /object has no attribute/i,
      title: '功能暫時不可用',
      message: '該功能正在開發中',
      suggestion: '請等待後續更新',
      severity: 'info'
    },
    
    // 驗證錯誤
    {
      pattern: /PHONE_CODE_EXPIRED/i,
      title: '驗證碼已過期',
      message: '驗證碼已超時失效',
      suggestion: '請重新獲取驗證碼',
      severity: 'warning',
      actionLabel: '重新獲取',
      actionHandler: 'resend-code'
    },
    {
      pattern: /PHONE_CODE_INVALID/i,
      title: '驗證碼錯誤',
      message: '輸入的驗證碼不正確',
      suggestion: '請仔細核對後重新輸入',
      severity: 'warning'
    },
    
    // 通用錯誤
    {
      pattern: /permission.*denied|access.*denied/i,
      title: '權限不足',
      message: '沒有執行此操作的權限',
      suggestion: '請檢查帳號權限設置',
      severity: 'warning'
    },
    {
      pattern: /rate.*limit/i,
      title: '操作過快',
      message: '請求頻率超過限制',
      suggestion: '請稍等片刻後重試',
      severity: 'warning'
    }
  ];
  
  // 默認錯誤
  private defaultError: Omit<ErrorMapping, 'pattern'> = {
    title: '操作失敗',
    message: '遇到了一個意外錯誤',
    suggestion: '請稍後重試，如問題持續請聯繫支持',
    severity: 'error'
  };
  
  /**
   * 處理錯誤並返回友好信息
   */
  handleError(error: string | Error | unknown): FriendlyError {
    const errorString = this.extractErrorMessage(error);
    const mapping = this.findMapping(errorString);
    
    const friendlyError: FriendlyError = {
      id: this.generateId(),
      title: mapping.title,
      message: mapping.message,
      suggestion: mapping.suggestion,
      severity: mapping.severity,
      timestamp: new Date(),
      originalError: errorString,
      actionLabel: mapping.actionLabel,
      actionHandler: mapping.actionHandler
    };
    
    // 添加到錯誤列表
    this.errors.update(errors => [friendlyError, ...errors.slice(0, 19)]);
    
    // 觸發 Toast 顯示
    this.showToast(friendlyError);
    
    return friendlyError;
  }
  
  /**
   * 獲取錯誤的友好信息（不添加到列表）
   */
  getFriendlyMessage(error: string | Error | unknown): FriendlyError {
    const errorString = this.extractErrorMessage(error);
    const mapping = this.findMapping(errorString);
    
    return {
      id: this.generateId(),
      title: mapping.title,
      message: mapping.message,
      suggestion: mapping.suggestion,
      severity: mapping.severity,
      timestamp: new Date(),
      originalError: errorString,
      actionLabel: mapping.actionLabel,
      actionHandler: mapping.actionHandler
    };
  }
  
  /**
   * 清除所有錯誤
   */
  clearErrors() {
    this.errors.set([]);
  }
  
  /**
   * 移除特定錯誤
   */
  removeError(id: string) {
    this.errors.update(errors => errors.filter(e => e.id !== id));
  }
  
  // 提取錯誤消息
  private extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object') {
      const e = error as any;
      return e.message || e.error || e.detail || JSON.stringify(error);
    }
    return String(error);
  }
  
  // 查找匹配的映射規則
  private findMapping(errorString: string): Omit<ErrorMapping, 'pattern'> {
    for (const mapping of this.errorMappings) {
      if (mapping.pattern.test(errorString)) {
        // 處理特殊情況，如 FloodWait 需要提取等待時間
        if (mapping.pattern.source.includes('FloodWait')) {
          const match = errorString.match(/FloodWait.*?(\d+)/i);
          if (match) {
            const seconds = parseInt(match[1]);
            const minutes = Math.ceil(seconds / 60);
            return {
              ...mapping,
              message: `需要等待約 ${minutes} 分鐘後才能繼續操作`
            };
          }
        }
        return mapping;
      }
    }
    return this.defaultError;
  }
  
  // 顯示 Toast
  private showToast(error: FriendlyError) {
    const typeMap: Record<ErrorSeverity, string> = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'error'
    };
    
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: {
        message: `${error.title}: ${error.message}`,
        type: typeMap[error.severity],
        duration: error.severity === 'critical' ? 10000 : 5000
      }
    }));
  }
  
  // 生成唯一 ID
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 錯誤顯示組件
 * 可選：用於顯示錯誤通知列表
 */
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errorService.errors().length > 0) {
      <div class="fixed bottom-4 left-4 z-50 space-y-2 max-w-sm">
        @for (error of errorService.errors().slice(0, 3); track error.id) {
          <div class="p-4 rounded-xl shadow-lg border backdrop-blur-sm animate-slideIn"
               [class.bg-slate-800/95]="error.severity === 'info'"
               [class.border-slate-600]="error.severity === 'info'"
               [class.bg-amber-900/95]="error.severity === 'warning'"
               [class.border-amber-500/50]="error.severity === 'warning'"
               [class.bg-red-900/95]="error.severity === 'error' || error.severity === 'critical'"
               [class.border-red-500/50]="error.severity === 'error' || error.severity === 'critical'">
            <div class="flex items-start gap-3">
              <div class="text-xl shrink-0">
                @switch (error.severity) {
                  @case ('info') { ℹ️ }
                  @case ('warning') { ⚠️ }
                  @case ('error') { ❌ }
                  @case ('critical') { 🚨 }
                }
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-white text-sm">{{ error.title }}</h4>
                <p class="text-xs text-slate-300 mt-0.5">{{ error.message }}</p>
                @if (error.suggestion) {
                  <p class="text-xs text-slate-400 mt-1">💡 {{ error.suggestion }}</p>
                }
                @if (error.actionLabel) {
                  <button (click)="handleAction(error.actionHandler)"
                          class="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">
                    {{ error.actionLabel }}
                  </button>
                }
              </div>
              <button (click)="errorService.removeError(error.id)"
                      class="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(-100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slideIn {
      animation: slideIn 0.3s ease-out;
    }
  `]
})
export class ErrorNotificationComponent {
  errorService = inject(ErrorHandlerService);
  
  handleAction(handler?: string) {
    if (handler) {
      window.dispatchEvent(new CustomEvent('error-action', { detail: handler }));
    }
  }
}
