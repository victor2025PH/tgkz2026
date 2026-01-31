/**
 * BackupService Unit Tests
 * 備份服務單元測試
 * 
 * 🆕 Phase 27: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { BackupService, Backup } from './backup.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('BackupService', () => {
  let service: BackupService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(() => {
    // 創建 mock 對象
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        BackupService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(BackupService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have empty backups initially', () => {
      expect(service.backups()).toEqual([]);
    });
    
    it('should not be loading initially', () => {
      expect(service.isLoading()).toBeFalse();
    });
    
    it('should not be creating initially', () => {
      expect(service.isCreating()).toBeFalse();
    });
    
    it('should not be restoring initially', () => {
      expect(service.isRestoring()).toBeFalse();
    });
  });
  
  describe('loadBackups', () => {
    it('should set isLoading to true and send IPC message', () => {
      service.loadBackups();
      
      expect(service.isLoading()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('get-backups');
    });
  });
  
  describe('createBackup', () => {
    it('should set isCreating to true and send IPC message', () => {
      service.createBackup('Test backup');
      
      expect(service.isCreating()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('create-backup', { description: 'Test backup' });
    });
    
    it('should work without description', () => {
      service.createBackup();
      
      expect(mockIpc.send).toHaveBeenCalledWith('create-backup', { description: undefined });
    });
  });
  
  describe('restoreBackup', () => {
    it('should not proceed without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.restoreBackup('backup-123');
      
      expect(service.isRestoring()).toBeFalse();
      expect(mockIpc.send).not.toHaveBeenCalledWith('restore-backup', jasmine.any(Object));
    });
    
    it('should set isRestoring and send IPC message on confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.restoreBackup('backup-123');
      
      expect(service.isRestoring()).toBeTrue();
      expect(mockIpc.send).toHaveBeenCalledWith('restore-backup', { id: 'backup-123' });
    });
  });
  
  describe('deleteBackup', () => {
    it('should not proceed without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.deleteBackup('backup-123');
      
      expect(mockIpc.send).not.toHaveBeenCalledWith('delete-backup', jasmine.any(Object));
    });
    
    it('should send IPC message on confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.deleteBackup('backup-123');
      
      expect(mockIpc.send).toHaveBeenCalledWith('delete-backup', { id: 'backup-123' });
    });
  });
  
  describe('Utility Methods', () => {
    it('should format size correctly', () => {
      expect(service.formatSize(500)).toBe('500 B');
      expect(service.formatSize(1024)).toBe('1.0 KB');
      expect(service.formatSize(1024 * 1024)).toBe('1.0 MB');
      expect(service.formatSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
    
    it('should calculate backup age correctly', () => {
      const now = new Date();
      const today = now.toISOString();
      expect(service.getBackupAge(today)).toBe('今天');
      
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      expect(service.getBackupAge(yesterday)).toBe('昨天');
      
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(service.getBackupAge(threeDaysAgo)).toBe('3 天前');
    });
  });
});
