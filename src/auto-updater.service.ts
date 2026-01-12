/**
 * Auto Updater Service
 * Handles automatic application updates via Electron
 */
import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { ToastService } from './toast.service';

export interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export type UpdateStatus = 
  | 'idle'           // No update activity
  | 'checking'       // Checking for updates
  | 'available'      // Update available
  | 'not-available'  // No update available
  | 'downloading'    // Downloading update
  | 'downloaded'     // Update downloaded, ready to install
  | 'error';         // Error occurred

export interface UpdateProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AutoUpdaterService {
  private toastService = inject(ToastService);
  private ngZone = inject(NgZone);
  
  // State signals
  private _status = signal<UpdateStatus>('idle');
  private _updateInfo = signal<UpdateInfo | null>(null);
  private _progress = signal<UpdateProgress | null>(null);
  private _error = signal<string | null>(null);
  private _isElectron = signal(false);
  
  // Computed properties
  status = computed(() => this._status());
  updateInfo = computed(() => this._updateInfo());
  progress = computed(() => this._progress());
  error = computed(() => this._error());
  isElectron = computed(() => this._isElectron());
  
  isUpdateAvailable = computed(() => 
    this._status() === 'available' || this._status() === 'downloaded'
  );
  
  progressPercent = computed(() => {
    const p = this._progress();
    return p ? Math.round(p.percent) : 0;
  });
  
  constructor() {
    this.initialize();
  }
  
  /**
   * Initialize the auto updater
   */
  private initialize(): void {
    // Check if running in Electron
    const win = window as any;
    if (win.electronAPI) {
      this._isElectron.set(true);
      this.setupElectronListeners();
    }
  }
  
  /**
   * Set up Electron IPC listeners for update events
   */
  private setupElectronListeners(): void {
    const win = window as any;
    
    // Listen for update events from main process
    if (win.electronAPI.onUpdateStatus) {
      win.electronAPI.onUpdateStatus((event: string, data: any) => {
        this.ngZone.run(() => {
          this.handleUpdateEvent(event, data);
        });
      });
    }
  }
  
  /**
   * Handle update events from Electron main process
   */
  private handleUpdateEvent(event: string, data: any): void {
    switch (event) {
      case 'checking-for-update':
        this._status.set('checking');
        break;
        
      case 'update-available':
        this._status.set('available');
        this._updateInfo.set({
          version: data.version,
          releaseDate: data.releaseDate,
          releaseNotes: data.releaseNotes
        });
        this.toastService.info(`🎉 發現新版本 ${data.version}！`, 5000);
        break;
        
      case 'update-not-available':
        this._status.set('not-available');
        break;
        
      case 'download-progress':
        this._status.set('downloading');
        this._progress.set({
          percent: data.percent,
          bytesPerSecond: data.bytesPerSecond,
          transferred: data.transferred,
          total: data.total
        });
        break;
        
      case 'update-downloaded':
        this._status.set('downloaded');
        this._progress.set(null);
        this.toastService.success('✅ 更新已下載，重啟應用即可安裝', 0); // Don't auto-dismiss
        break;
        
      case 'error':
        this._status.set('error');
        this._error.set(data.message || '更新時發生錯誤');
        this.toastService.error(`更新錯誤: ${data.message || '未知錯誤'}`, 5000);
        break;
    }
  }
  
  /**
   * Check for updates manually
   */
  async checkForUpdates(): Promise<void> {
    if (!this._isElectron()) {
      this.toastService.warning('自動更新僅在桌面應用中可用');
      return;
    }
    
    const win = window as any;
    this._status.set('checking');
    this._error.set(null);
    
    try {
      if (win.electronAPI.checkForUpdates) {
        await win.electronAPI.checkForUpdates();
      }
    } catch (e) {
      this._status.set('error');
      this._error.set((e as Error).message);
    }
  }
  
  /**
   * Download available update
   */
  async downloadUpdate(): Promise<void> {
    if (!this._isElectron() || this._status() !== 'available') {
      return;
    }
    
    const win = window as any;
    this._status.set('downloading');
    
    try {
      if (win.electronAPI.downloadUpdate) {
        await win.electronAPI.downloadUpdate();
      }
    } catch (e) {
      this._status.set('error');
      this._error.set((e as Error).message);
    }
  }
  
  /**
   * Install downloaded update and restart app
   */
  async installUpdate(): Promise<void> {
    if (!this._isElectron() || this._status() !== 'downloaded') {
      return;
    }
    
    const win = window as any;
    
    try {
      if (win.electronAPI.installUpdate) {
        await win.electronAPI.installUpdate();
      }
    } catch (e) {
      this._status.set('error');
      this._error.set((e as Error).message);
    }
  }
  
  /**
   * Get current app version
   */
  async getCurrentVersion(): Promise<string> {
    if (!this._isElectron()) {
      return '1.0.0';
    }
    
    const win = window as any;
    try {
      if (win.electronAPI.getAppVersion) {
        return await win.electronAPI.getAppVersion();
      }
    } catch (e) {
      console.error('Failed to get app version:', e);
    }
    
    return '1.0.0';
  }
  
  /**
   * Format bytes for display
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Format download speed for display
   */
  formatSpeed(bytesPerSecond: number): string {
    return this.formatBytes(bytesPerSecond) + '/s';
  }
}
