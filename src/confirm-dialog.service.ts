/**
 * 確認對話框服務
 * 提供統一的確認對話框 API
 */
import { Injectable, signal } from '@angular/core';

export type DialogType = 'info' | 'warning' | 'danger';

export interface ConfirmDialogConfig {
  type?: DialogType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  affectedItems?: string[];
  requireConfirmText?: boolean;
  confirmTextRequired?: string;
}

export interface ConfirmDialogState extends ConfirmDialogConfig {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  // 對話框狀態
  state = signal<ConfirmDialogState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: '確定',
    cancelText: '取消',
    affectedItems: [],
    requireConfirmText: false,
    confirmTextRequired: ''
  });

  /**
   * 顯示確認對話框
   * @returns Promise<boolean> - 用戶點擊確定返回 true，取消返回 false
   */
  confirm(config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({
        isOpen: true,
        type: config.type || 'info',
        title: config.title,
        message: config.message,
        confirmText: config.confirmText || '確定',
        cancelText: config.cancelText || '取消',
        affectedItems: config.affectedItems || [],
        requireConfirmText: config.requireConfirmText || false,
        confirmTextRequired: config.confirmTextRequired || 'DELETE',
        resolve
      });
    });
  }

  /**
   * 危險操作確認（紅色樣式）
   */
  danger(title: string, message: string, affectedItems?: string[]): Promise<boolean> {
    return this.confirm({
      type: 'danger',
      title,
      message,
      confirmText: '刪除',
      affectedItems
    });
  }

  /**
   * 警告確認（黃色樣式）
   */
  warning(title: string, message: string): Promise<boolean> {
    return this.confirm({
      type: 'warning',
      title,
      message,
      confirmText: '確定'
    });
  }

  /**
   * 普通確認（藍色樣式）
   */
  info(title: string, message: string): Promise<boolean> {
    return this.confirm({
      type: 'info',
      title,
      message
    });
  }

  /**
   * 處理確定
   */
  onConfirm() {
    const currentState = this.state();
    if (currentState.resolve) {
      currentState.resolve(true);
    }
    this.close();
  }

  /**
   * 處理取消
   */
  onCancel() {
    const currentState = this.state();
    if (currentState.resolve) {
      currentState.resolve(false);
    }
    this.close();
  }

  /**
   * 關閉對話框
   */
  private close() {
    this.state.update(s => ({ ...s, isOpen: false }));
  }
}
