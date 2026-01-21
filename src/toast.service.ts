/**
 * Toast Notification Service
 * 增強版 - 提供豐富的操作反饋
 * 
 * 功能：
 * 1. 基礎通知（success/error/warning/info）
 * 2. 帶圖標和表情符號的消息
 * 3. 帶操作按鈕的通知
 * 4. 下一步提示
 * 5. 進度通知
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'progress';

export interface ToastAction {
  label: string;
  handler: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  icon?: string;
  duration?: number;
  timestamp: Date;
  actions?: ToastAction[];
  nextStep?: { label: string; action: () => void };
  progress?: number; // 0-100
  dismissible?: boolean;
}

// 預設圖標
const DEFAULT_ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  progress: '⏳'
};

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: WritableSignal<Toast[]> = signal([]);
  private toastIdCounter = 0;

  /**
   * Get all active toasts
   */
  getToasts(): WritableSignal<Toast[]> {
    return this.toasts;
  }

  /**
   * Show a success toast
   */
  success(message: string, duration: number = 3000): string {
    return this.show('success', message, duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, duration: number = 5000): string {
    return this.show('error', message, duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration: number = 4000): string {
    return this.show('warning', message, duration);
  }

  /**
   * Show a warning toast with an action button
   */
  warningWithAction(message: string, actionLabel: string, actionHandler: () => void, duration: number = 0): string {
    return this.withActions(
      'warning',
      message,
      [
        { label: actionLabel, handler: actionHandler, variant: 'primary' },
        { label: '稍後', handler: () => {}, variant: 'secondary' }
      ],
      duration
    );
  }

  /**
   * Show an info toast
   */
  info(message: string, duration: number = 3000): string {
    return this.show('info', message, duration);
  }

  /**
   * Show a success toast with next step hint
   */
  successWithNextStep(message: string, nextStepLabel: string, nextStepAction: () => void): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type: 'success',
      message,
      icon: '🎉',
      duration: 5000,
      timestamp: new Date(),
      nextStep: { label: nextStepLabel, action: nextStepAction },
      dismissible: true
    };

    this.toasts.update(toasts => [...toasts, toast]);
    
    setTimeout(() => this.dismiss(id), 5000);
    return id;
  }

  /**
   * Show a toast with action buttons
   */
  withActions(
    type: ToastType, 
    message: string, 
    actions: ToastAction[], 
    duration: number = 0
  ): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type,
      message,
      icon: DEFAULT_ICONS[type],
      duration: duration > 0 ? duration : undefined,
      timestamp: new Date(),
      actions,
      dismissible: true
    };

    this.toasts.update(toasts => [...toasts, toast]);
    
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    
    return id;
  }

  /**
   * Show a progress toast
   */
  showProgress(message: string, progress: number = 0): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type: 'progress',
      message,
      icon: '⏳',
      progress,
      timestamp: new Date(),
      dismissible: false
    };

    this.toasts.update(toasts => [...toasts, toast]);
    return id;
  }

  /**
   * Update progress toast
   */
  updateProgress(id: string, progress: number, message?: string): void {
    this.toasts.update(toasts => 
      toasts.map(t => t.id === id ? { 
        ...t, 
        progress, 
        message: message || t.message,
        icon: progress >= 100 ? '✅' : '⏳'
      } : t)
    );

    // Auto dismiss when complete
    if (progress >= 100) {
      setTimeout(() => this.dismiss(id), 2000);
    }
  }

  /**
   * Show a configuration reminder toast
   */
  configReminder(stepName: string, action: () => void): string {
    return this.withActions(
      'warning',
      `配置未完成：${stepName}`,
      [
        { label: '立即設置', handler: action, variant: 'primary' },
        { label: '稍後', handler: () => {}, variant: 'secondary' }
      ],
      0
    );
  }

  /**
   * Show operation result with emoji
   */
  operationResult(success: boolean, successMsg: string, errorMsg: string): string {
    if (success) {
      return this.success(successMsg);
    } else {
      return this.error(errorMsg);
    }
  }

  /**
   * Common operation feedback messages
   */
  
  // 帳號相關
  accountConnected(name: string): string {
    return this.successWithNextStep(
      `🔗 ${name} 已連接`,
      '設為監聽帳號',
      () => {}
    );
  }

  accountDisconnected(name: string): string {
    return this.warning(`📴 ${name} 已斷開連接`);
  }

  accountRoleChanged(name: string, role: string): string {
    const roleEmoji = role === 'Listener' ? '👁️' : role === 'Sender' ? '📤' : '👤';
    return this.success(`${roleEmoji} ${name} 已設為${role === 'Listener' ? '監聽' : role === 'Sender' ? '發送' : '普通'}帳號`);
  }

  // 群組相關
  groupAdded(name: string): string {
    return this.successWithNextStep(
      `💬 已添加群組「${name}」`,
      '綁定關鍵詞集',
      () => {}
    );
  }

  groupRemoved(name: string): string {
    return this.success(`🗑️ 已移除「${name}」`);
  }

  groupKeywordBound(groupName: string, keywordSetName: string): string {
    return this.success(`🔗 已將「${keywordSetName}」綁定到「${groupName}」`);
  }

  // 詞集相關
  keywordSetCreated(name: string): string {
    return this.successWithNextStep(
      `🔑 詞集「${name}」已創建`,
      '綁定到群組',
      () => {}
    );
  }

  keywordSetDeleted(name: string): string {
    return this.success(`🗑️ 詞集「${name}」已刪除`);
  }

  // 監控相關
  monitoringStarted(): string {
    return this.success('🚀 監控已啟動，系統正在工作中...');
  }

  monitoringStopped(): string {
    return this.info('⏸️ 監控已暫停');
  }

  keywordMatched(keyword: string, groupName: string): string {
    return this.info(`🎯 在「${groupName}」匹配到關鍵詞「${keyword}」`);
  }

  // 提取成員
  extractMembersStarted(groupName: string): string {
    return this.showProgress(`正在提取「${groupName}」的成員...`, 0);
  }

  extractMembersCompleted(count: number, groupName: string): string {
    return this.success(`✅ 已從「${groupName}」提取 ${count} 個成員`);
  }

  /**
   * Show a toast notification
   */
  private show(type: ToastType, message: string, duration: number = 3000): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type,
      message,
      icon: DEFAULT_ICONS[type],
      duration: duration > 0 ? duration : undefined,
      timestamp: new Date(),
      dismissible: true
    };

    this.toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toasts.set([]);
  }
}
