/**
 * Backup Service
 * 數據備份服務
 * 
 * 功能：
 * - 自動備份
 * - 手動備份
 * - 備份恢復
 * - 備份管理
 */
import { Injectable, inject, signal, computed } from '@angular/core';
import { ToastService } from './toast.service';
import { LoadingService } from './loading.service';

export interface BackupInfo {
  id: string;
  name: string;
  timestamp: Date;
  size: number;
  type: 'auto' | 'manual';
  version: string;
  checksum: string;
  items: {
    accounts: number;
    leads: number;
    keywords: number;
    templates: number;
    campaigns: number;
    groups: number;
  };
}

export interface BackupData {
  meta: {
    version: string;
    timestamp: string;
    checksum: string;
  };
  accounts: any[];
  leads: any[];
  keywords: any[];
  templates: any[];
  campaigns: any[];
  groups: any[];
  settings: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class BackupService {
  private toastService = inject(ToastService);
  private loadingService = inject(LoadingService);
  
  // 備份列表
  private backups = signal<BackupInfo[]>([]);
  
  // 自動備份設置
  private autoBackupEnabled = signal(true);
  private autoBackupInterval = signal(24); // 小時
  private maxBackups = signal(7);  // 最多保留備份數
  
  // 計算屬性
  backupList = computed(() => this.backups());
  lastBackup = computed(() => {
    const list = this.backups();
    return list.length > 0 ? list[0] : null;
  });
  
  private autoBackupTimer: any = null;
  
  constructor() {
    this.loadBackupList();
    this.startAutoBackup();
  }
  
  /**
   * 創建備份
   */
  async createBackup(name?: string, type: 'auto' | 'manual' = 'manual'): Promise<BackupInfo | null> {
    const taskId = this.loadingService.startWithProgress('正在創建備份...');
    
    try {
      // 收集數據
      this.loadingService.updateProgress(taskId, 10, '收集賬號數據...');
      const accounts = this.getStoredData('accounts');
      
      this.loadingService.updateProgress(taskId, 25, '收集潛在客戶數據...');
      const leads = this.getStoredData('leads');
      
      this.loadingService.updateProgress(taskId, 40, '收集關鍵詞數據...');
      const keywords = this.getStoredData('keywords');
      
      this.loadingService.updateProgress(taskId, 55, '收集模板數據...');
      const templates = this.getStoredData('templates');
      
      this.loadingService.updateProgress(taskId, 70, '收集活動數據...');
      const campaigns = this.getStoredData('campaigns');
      
      this.loadingService.updateProgress(taskId, 80, '收集群組數據...');
      const groups = this.getStoredData('groups');
      
      this.loadingService.updateProgress(taskId, 90, '收集設置...');
      const settings = this.getSettings();
      
      // 構建備份數據
      const backupData: BackupData = {
        meta: {
          version: '1.0.5',
          timestamp: new Date().toISOString(),
          checksum: ''
        },
        accounts,
        leads,
        keywords,
        templates,
        campaigns,
        groups,
        settings
      };
      
      // 計算校驗和
      backupData.meta.checksum = this.calculateChecksum(backupData);
      
      this.loadingService.updateProgress(taskId, 95, '保存備份...');
      
      // 創建備份信息
      const backupInfo: BackupInfo = {
        id: 'backup-' + Date.now().toString(36),
        name: name || `備份 ${new Date().toLocaleString()}`,
        timestamp: new Date(),
        size: JSON.stringify(backupData).length,
        type,
        version: '1.0.5',
        checksum: backupData.meta.checksum,
        items: {
          accounts: accounts.length,
          leads: leads.length,
          keywords: keywords.length,
          templates: templates.length,
          campaigns: campaigns.length,
          groups: groups.length
        }
      };
      
      // 保存備份
      this.saveBackupData(backupInfo.id, backupData);
      
      // 更新備份列表
      this.backups.update(list => {
        const newList = [backupInfo, ...list];
        // 限制備份數量
        return newList.slice(0, this.maxBackups());
      });
      this.saveBackupList();
      
      this.loadingService.updateProgress(taskId, 100, '備份完成！');
      
      if (type === 'manual') {
        this.toastService.success(`備份創建成功：${backupInfo.name}`);
      }
      
      return backupInfo;
      
    } catch (error) {
      console.error('Backup failed:', error);
      this.toastService.error('備份失敗，請重試');
      return null;
    } finally {
      this.loadingService.stop(taskId);
    }
  }
  
  /**
   * 恢復備份
   */
  async restoreBackup(backupId: string): Promise<boolean> {
    const taskId = this.loadingService.startWithProgress('正在恢復備份...');
    
    try {
      // 獲取備份數據
      const backupData = this.loadBackupData(backupId);
      if (!backupData) {
        this.toastService.error('找不到備份數據');
        return false;
      }
      
      // 驗證校驗和
      this.loadingService.updateProgress(taskId, 10, '驗證備份完整性...');
      const checksum = this.calculateChecksum({ ...backupData, meta: { ...backupData.meta, checksum: '' } });
      if (checksum !== backupData.meta.checksum) {
        this.toastService.error('備份數據已損壞');
        return false;
      }
      
      // 先創建當前數據的備份
      this.loadingService.updateProgress(taskId, 20, '創建恢復前備份...');
      await this.createBackup('恢復前自動備份', 'auto');
      
      // 恢復數據
      this.loadingService.updateProgress(taskId, 40, '恢復賬號數據...');
      this.setStoredData('accounts', backupData.accounts);
      
      this.loadingService.updateProgress(taskId, 50, '恢復潛在客戶數據...');
      this.setStoredData('leads', backupData.leads);
      
      this.loadingService.updateProgress(taskId, 60, '恢復關鍵詞數據...');
      this.setStoredData('keywords', backupData.keywords);
      
      this.loadingService.updateProgress(taskId, 70, '恢復模板數據...');
      this.setStoredData('templates', backupData.templates);
      
      this.loadingService.updateProgress(taskId, 80, '恢復活動數據...');
      this.setStoredData('campaigns', backupData.campaigns);
      
      this.loadingService.updateProgress(taskId, 90, '恢復群組數據...');
      this.setStoredData('groups', backupData.groups);
      
      this.loadingService.updateProgress(taskId, 95, '恢復設置...');
      this.restoreSettings(backupData.settings);
      
      this.loadingService.updateProgress(taskId, 100, '恢復完成！');
      this.toastService.success('備份恢復成功！請刷新頁面。');
      
      return true;
      
    } catch (error) {
      console.error('Restore failed:', error);
      this.toastService.error('恢復失敗，請重試');
      return false;
    } finally {
      this.loadingService.stop(taskId);
    }
  }
  
  /**
   * 導出備份文件
   */
  exportBackup(backupId: string): void {
    const backupData = this.loadBackupData(backupId);
    if (!backupData) {
      this.toastService.error('找不到備份數據');
      return;
    }
    
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tg-matrix-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.toastService.success('備份已導出');
  }
  
  /**
   * 導入備份文件
   */
  async importBackup(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);
      
      // 驗證格式
      if (!backupData.meta || !backupData.meta.version) {
        this.toastService.error('無效的備份文件格式');
        return false;
      }
      
      // 創建備份信息
      const backupInfo: BackupInfo = {
        id: 'backup-' + Date.now().toString(36),
        name: `導入: ${file.name}`,
        timestamp: new Date(backupData.meta.timestamp),
        size: text.length,
        type: 'manual',
        version: backupData.meta.version,
        checksum: backupData.meta.checksum,
        items: {
          accounts: backupData.accounts?.length || 0,
          leads: backupData.leads?.length || 0,
          keywords: backupData.keywords?.length || 0,
          templates: backupData.templates?.length || 0,
          campaigns: backupData.campaigns?.length || 0,
          groups: backupData.groups?.length || 0
        }
      };
      
      // 保存
      this.saveBackupData(backupInfo.id, backupData);
      this.backups.update(list => [backupInfo, ...list]);
      this.saveBackupList();
      
      this.toastService.success('備份導入成功');
      return true;
      
    } catch (error) {
      console.error('Import failed:', error);
      this.toastService.error('導入失敗，請檢查文件格式');
      return false;
    }
  }
  
  /**
   * 刪除備份
   */
  deleteBackup(backupId: string): void {
    localStorage.removeItem(`tg-matrix-backup-${backupId}`);
    this.backups.update(list => list.filter(b => b.id !== backupId));
    this.saveBackupList();
    this.toastService.success('備份已刪除');
  }
  
  /**
   * 配置自動備份
   */
  configureAutoBackup(enabled: boolean, intervalHours: number = 24, maxBackups: number = 7): void {
    this.autoBackupEnabled.set(enabled);
    this.autoBackupInterval.set(intervalHours);
    this.maxBackups.set(maxBackups);
    
    // 保存配置
    localStorage.setItem('tg-matrix-backup-config', JSON.stringify({
      enabled,
      intervalHours,
      maxBackups
    }));
    
    // 重啟自動備份
    this.startAutoBackup();
  }
  
  // ============ 私有方法 ============
  
  private startAutoBackup(): void {
    // 清除現有定時器
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }
    
    if (!this.autoBackupEnabled()) return;
    
    const intervalMs = this.autoBackupInterval() * 60 * 60 * 1000;
    
    // 檢查是否需要立即備份
    const lastBackup = this.lastBackup();
    if (!lastBackup || (Date.now() - lastBackup.timestamp.getTime()) > intervalMs) {
      // 延遲執行，避免影響啟動
      setTimeout(() => this.createBackup('自動備份', 'auto'), 30000);
    }
    
    // 設置定時備份
    this.autoBackupTimer = setInterval(() => {
      this.createBackup('自動備份', 'auto');
    }, intervalMs);
  }
  
  private loadBackupList(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-backup-list');
      if (stored) {
        const list = JSON.parse(stored).map((b: any) => ({
          ...b,
          timestamp: new Date(b.timestamp)
        }));
        this.backups.set(list);
      }
      
      // 加載配置
      const config = localStorage.getItem('tg-matrix-backup-config');
      if (config) {
        const { enabled, intervalHours, maxBackups } = JSON.parse(config);
        this.autoBackupEnabled.set(enabled);
        this.autoBackupInterval.set(intervalHours);
        this.maxBackups.set(maxBackups);
      }
    } catch (e) {
      console.error('Failed to load backup list:', e);
    }
  }
  
  private saveBackupList(): void {
    try {
      const list = this.backups().map(b => ({
        ...b,
        timestamp: b.timestamp.toISOString()
      }));
      localStorage.setItem('tg-matrix-backup-list', JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save backup list:', e);
    }
  }
  
  private saveBackupData(id: string, data: BackupData): void {
    try {
      localStorage.setItem(`tg-matrix-backup-${id}`, JSON.stringify(data));
    } catch (e) {
      // 存儲空間不足時，刪除舊備份
      console.error('Failed to save backup data:', e);
      const oldBackups = this.backups().slice(-3);
      oldBackups.forEach(b => localStorage.removeItem(`tg-matrix-backup-${b.id}`));
      localStorage.setItem(`tg-matrix-backup-${id}`, JSON.stringify(data));
    }
  }
  
  private loadBackupData(id: string): BackupData | null {
    try {
      const stored = localStorage.getItem(`tg-matrix-backup-${id}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }
  
  private getStoredData(key: string): any[] {
    try {
      const stored = localStorage.getItem(`tg-matrix-${key}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }
  
  private setStoredData(key: string, data: any[]): void {
    localStorage.setItem(`tg-matrix-${key}`, JSON.stringify(data));
  }
  
  private getSettings(): Record<string, any> {
    const settings: Record<string, any> = {};
    const keys = ['theme', 'language', 'ai-config', 'notification-settings'];
    
    keys.forEach(key => {
      const value = localStorage.getItem(`tg-matrix-${key}`);
      if (value) {
        try {
          settings[key] = JSON.parse(value);
        } catch {
          settings[key] = value;
        }
      }
    });
    
    return settings;
  }
  
  private restoreSettings(settings: Record<string, any>): void {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(`tg-matrix-${key}`, 
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    });
  }
  
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
