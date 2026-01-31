/**
 * 對話框管理服務
 * Dialog Service
 * 
 * 🆕 Phase 26: 從 app.component.ts 提取對話框相關方法
 */

import { Injectable, signal, inject } from '@angular/core';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ProgressDialogConfig {
  show: boolean;
  title: string;
  progress: number;
  message?: string;
  cancellable?: boolean;
  onCancel?: () => void;
}

export interface SuccessOverlayConfig {
  icon?: string;
  title: string;
  subtitle?: string;
  duration?: number;
}

export interface DeleteConfirmDialog {
  show: boolean;
  type: 'single' | 'batch';
  count?: number;
  lead?: any;
  onConfirm?: () => void;
}

// 🆕 輸入對話框配置（替代 window.prompt）
export interface InputDialogConfig {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'text' | 'textarea';
  confirmText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null;  // 返回錯誤信息或 null
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  // 確認對話框
  private _confirmDialog = signal<ConfirmDialogConfig | null>(null);
  confirmDialog = this._confirmDialog.asReadonly();
  
  // 進度對話框
  private _progressDialog = signal<ProgressDialogConfig>({
    show: false,
    title: '',
    progress: 0,
    cancellable: false
  });
  progressDialog = this._progressDialog.asReadonly();
  
  // 成功覆蓋層
  private _showSuccessOverlay = signal(false);
  private _successOverlayConfig = signal<SuccessOverlayConfig | null>(null);
  showSuccessOverlay = this._showSuccessOverlay.asReadonly();
  successOverlayConfig = this._successOverlayConfig.asReadonly();
  
  // 刪除確認對話框
  private _deleteConfirmDialog = signal<DeleteConfirmDialog>({
    show: false,
    type: 'single'
  });
  deleteConfirmDialog = this._deleteConfirmDialog.asReadonly();
  
  // QR 登錄對話框
  private _showQrLoginDialog = signal(false);
  showQrLoginDialog = this._showQrLoginDialog.asReadonly();
  
  // 批量發送對話框
  private _showBatchMessageDialog = signal(false);
  private _batchSendTargets = signal<any[]>([]);
  showBatchMessageDialog = this._showBatchMessageDialog.asReadonly();
  batchSendTargets = this._batchSendTargets.asReadonly();
  
  // 批量拉群對話框
  private _showBatchInviteDialog = signal(false);
  private _batchInviteTargets = signal<any[]>([]);
  showBatchInviteDialog = this._showBatchInviteDialog.asReadonly();
  batchInviteTargets = this._batchInviteTargets.asReadonly();
  
  // 成員提取對話框
  private _showMemberExtractionDialog = signal(false);
  private _memberExtractionGroup = signal<any>(null);
  showMemberExtractionDialog = this._showMemberExtractionDialog.asReadonly();
  memberExtractionGroup = this._memberExtractionGroup.asReadonly();
  
  // 加入並監控對話框
  private _showJoinMonitorDialog = signal(false);
  private _joinMonitorResource = signal<any>(null);
  showJoinMonitorDialog = this._showJoinMonitorDialog.asReadonly();
  joinMonitorResource = this._joinMonitorResource.asReadonly();
  
  // 加入後選項對話框
  private _showPostJoinDialog = signal(false);
  private _postJoinResource = signal<any>(null);
  showPostJoinDialog = this._showPostJoinDialog.asReadonly();
  postJoinResource = this._postJoinResource.asReadonly();
  
  // 🆕 輸入對話框（替代 window.prompt）
  private _inputDialog = signal<InputDialogConfig | null>(null);
  private _inputDialogValue = signal('');
  private _inputDialogError = signal<string | null>(null);
  inputDialog = this._inputDialog.asReadonly();
  inputDialogValue = this._inputDialogValue.asReadonly();
  inputDialogError = this._inputDialogError.asReadonly();
  
  // ========== 確認對話框 ==========
  
  confirm(config: ConfirmDialogConfig): void {
    this._confirmDialog.set(config);
  }
  
  closeConfirmDialog(): void {
    const config = this._confirmDialog();
    if (config?.onCancel) {
      config.onCancel();
    }
    this._confirmDialog.set(null);
  }
  
  confirmAction(): void {
    const config = this._confirmDialog();
    if (config?.onConfirm) {
      config.onConfirm();
    }
    this._confirmDialog.set(null);
  }
  
  // ========== 進度對話框 ==========
  
  showProgress(title: string, cancellable = false): void {
    this._progressDialog.set({
      show: true,
      title,
      progress: 0,
      cancellable
    });
  }
  
  updateProgress(progress: number, message?: string): void {
    this._progressDialog.update(d => ({
      ...d,
      progress,
      message
    }));
  }
  
  hideProgress(): void {
    this._progressDialog.update(d => ({ ...d, show: false }));
  }
  
  // ========== 成功覆蓋層 ==========
  
  showSuccess(config: SuccessOverlayConfig): void {
    this._successOverlayConfig.set(config);
    this._showSuccessOverlay.set(true);
    
    const duration = config.duration ?? 2000;
    setTimeout(() => {
      this._showSuccessOverlay.set(false);
      this._successOverlayConfig.set(null);
    }, duration);
  }
  
  hideSuccess(): void {
    this._showSuccessOverlay.set(false);
    this._successOverlayConfig.set(null);
  }
  
  // ========== 刪除確認對話框 ==========
  
  showDeleteConfirm(type: 'single' | 'batch', lead?: any, count?: number): void {
    this._deleteConfirmDialog.set({
      show: true,
      type,
      lead,
      count
    });
  }
  
  hideDeleteConfirm(): void {
    this._deleteConfirmDialog.update(d => ({ ...d, show: false }));
  }
  
  // ========== QR 登錄對話框 ==========
  
  openQrLogin(): void {
    this._showQrLoginDialog.set(true);
  }
  
  closeQrLogin(): void {
    this._showQrLoginDialog.set(false);
  }
  
  // ========== 批量發送對話框 ==========
  
  openBatchSend(targets: any[]): void {
    this._batchSendTargets.set(targets);
    this._showBatchMessageDialog.set(true);
  }
  
  closeBatchSend(): void {
    this._showBatchMessageDialog.set(false);
    this._batchSendTargets.set([]);
  }
  
  // ========== 批量拉群對話框 ==========
  
  openBatchInvite(targets: any[]): void {
    this._batchInviteTargets.set(targets);
    this._showBatchInviteDialog.set(true);
  }
  
  closeBatchInvite(): void {
    this._showBatchInviteDialog.set(false);
    this._batchInviteTargets.set([]);
  }
  
  // ========== 成員提取對話框 ==========
  
  openMemberExtraction(group: any): void {
    this._memberExtractionGroup.set(group);
    this._showMemberExtractionDialog.set(true);
  }
  
  closeMemberExtraction(): void {
    this._showMemberExtractionDialog.set(false);
    this._memberExtractionGroup.set(null);
  }
  
  // ========== 加入並監控對話框 ==========
  
  openJoinMonitor(resource: any): void {
    this._joinMonitorResource.set(resource);
    this._showJoinMonitorDialog.set(true);
  }
  
  closeJoinMonitor(): void {
    this._showJoinMonitorDialog.set(false);
    this._joinMonitorResource.set(null);
  }
  
  // ========== 加入後選項對話框 ==========
  
  openPostJoin(resource: any): void {
    this._postJoinResource.set(resource);
    this._showPostJoinDialog.set(true);
  }
  
  closePostJoin(): void {
    this._showPostJoinDialog.set(false);
    this._postJoinResource.set(null);
  }
  
  // ========== 🆕 輸入對話框（替代 window.prompt）==========
  
  /**
   * 顯示輸入對話框（替代 window.prompt）
   * @param config 配置
   */
  prompt(config: InputDialogConfig): void {
    this._inputDialogValue.set(config.defaultValue || '');
    this._inputDialogError.set(null);
    this._inputDialog.set(config);
  }
  
  /**
   * 更新輸入值
   */
  updateInputValue(value: string): void {
    this._inputDialogValue.set(value);
    // 清除錯誤
    this._inputDialogError.set(null);
  }
  
  /**
   * 確認輸入對話框
   */
  confirmInput(): void {
    const config = this._inputDialog();
    const value = this._inputDialogValue();
    
    if (!config) return;
    
    // 驗證
    if (config.validator) {
      const error = config.validator(value);
      if (error) {
        this._inputDialogError.set(error);
        return;
      }
    }
    
    // 基本驗證：不能為空
    if (!value.trim()) {
      this._inputDialogError.set('請輸入內容');
      return;
    }
    
    // 調用回調
    if (config.onConfirm) {
      config.onConfirm(value.trim());
    }
    
    // 關閉對話框
    this._inputDialog.set(null);
    this._inputDialogValue.set('');
    this._inputDialogError.set(null);
  }
  
  /**
   * 取消輸入對話框
   */
  cancelInput(): void {
    const config = this._inputDialog();
    if (config?.onCancel) {
      config.onCancel();
    }
    this._inputDialog.set(null);
    this._inputDialogValue.set('');
    this._inputDialogError.set(null);
  }
}
