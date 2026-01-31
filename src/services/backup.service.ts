/**
 * 備份服務
 * Backup Service
 * 
 * 🆕 Phase 26: 從 app.component.ts 提取備份相關方法
 */

import { Injectable, signal, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

export interface Backup {
  id: string;
  name: string;
  created_at: string;
  size?: string;
  type: 'manual' | 'auto';
  description?: string;
}

export interface BackupSettings {
  autoBackup: boolean;
  interval: number; // 小時
  maxBackups: number;
  includeMedia: boolean;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ========== 狀態 ==========
  
  private _backups = signal<Backup[]>([]);
  private _isLoading = signal(false);
  private _isCreating = signal(false);
  private _isRestoring = signal(false);
  private _settings = signal<BackupSettings>({
    autoBackup: false,
    interval: 24,
    maxBackups: 10,
    includeMedia: false
  });
  
  backups = this._backups.asReadonly();
  isLoading = this._isLoading.asReadonly();
  isCreating = this._isCreating.asReadonly();
  isRestoring = this._isRestoring.asReadonly();
  settings = this._settings.asReadonly();
  
  constructor() {
    this.setupIpcListeners();
  }
  
  // ========== IPC 監聽 ==========
  
  private setupIpcListeners(): void {
    this.ipc.on('backups-loaded', (data: Backup[]) => {
      this._backups.set(data);
      this._isLoading.set(false);
    });
    
    this.ipc.on('backup-created', (data: Backup) => {
      this._backups.update(list => [data, ...list]);
      this._isCreating.set(false);
      this.toast.success('備份創建成功！');
    });
    
    this.ipc.on('backup-create-error', (data: { error: string }) => {
      this._isCreating.set(false);
      this.toast.error(`備份創建失敗: ${data.error}`);
    });
    
    this.ipc.on('backup-restored', () => {
      this._isRestoring.set(false);
      this.toast.success('備份恢復成功！應用將重新加載...');
      setTimeout(() => window.location.reload(), 2000);
    });
    
    this.ipc.on('backup-restore-error', (data: { error: string }) => {
      this._isRestoring.set(false);
      this.toast.error(`備份恢復失敗: ${data.error}`);
    });
    
    this.ipc.on('backup-deleted', (data: { id: string }) => {
      this._backups.update(list => list.filter(b => b.id !== data.id));
      this.toast.success('備份已刪除');
    });
    
    this.ipc.on('backup-settings-loaded', (data: BackupSettings) => {
      this._settings.set(data);
    });
  }
  
  // ========== 備份操作 ==========
  
  loadBackups(): void {
    this._isLoading.set(true);
    this.ipc.send('get-backups');
  }
  
  createBackup(description?: string): void {
    this._isCreating.set(true);
    this.ipc.send('create-backup', { description });
  }
  
  restoreBackup(id: string): void {
    if (!confirm('確定要恢復此備份嗎？當前數據將被覆蓋。')) {
      return;
    }
    
    this._isRestoring.set(true);
    this.ipc.send('restore-backup', { id });
  }
  
  deleteBackup(id: string): void {
    if (!confirm('確定要刪除此備份嗎？')) {
      return;
    }
    
    this.ipc.send('delete-backup', { id });
  }
  
  // ========== 設置操作 ==========
  
  loadSettings(): void {
    this.ipc.send('get-backup-settings');
  }
  
  updateSettings(settings: Partial<BackupSettings>): void {
    this._settings.update(s => ({ ...s, ...settings }));
    this.ipc.send('save-backup-settings', this._settings());
    this.toast.success('備份設置已保存');
  }
  
  toggleAutoBackup(): void {
    this.updateSettings({ autoBackup: !this._settings().autoBackup });
  }
  
  // ========== 工具方法 ==========
  
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  
  getBackupAge(createdAt: string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays} 天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
    return `${Math.floor(diffDays / 30)} 個月前`;
  }
}
