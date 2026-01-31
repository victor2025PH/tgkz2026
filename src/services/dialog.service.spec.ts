/**
 * DialogService Unit Tests
 * 對話框服務單元測試
 * 
 * 🆕 Phase 27: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { DialogService } from './dialog.service';
import { ToastService } from '../toast.service';

describe('DialogService', () => {
  let service: DialogService;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(() => {
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(DialogService);
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Confirm Dialog', () => {
    it('should open confirm dialog', () => {
      const config = {
        title: 'Test Title',
        message: 'Test Message'
      };
      
      service.confirm(config);
      
      expect(service.confirmDialog()).toEqual(config);
    });
    
    it('should close confirm dialog', () => {
      service.confirm({ title: 'Test', message: 'Test' });
      service.closeConfirmDialog();
      
      expect(service.confirmDialog()).toBeNull();
    });
    
    it('should call onCancel when closing', () => {
      const onCancel = jasmine.createSpy('onCancel');
      service.confirm({ title: 'Test', message: 'Test', onCancel });
      
      service.closeConfirmDialog();
      
      expect(onCancel).toHaveBeenCalled();
    });
    
    it('should call onConfirm when confirming', () => {
      const onConfirm = jasmine.createSpy('onConfirm');
      service.confirm({ title: 'Test', message: 'Test', onConfirm });
      
      service.confirmAction();
      
      expect(onConfirm).toHaveBeenCalled();
    });
  });
  
  describe('Progress Dialog', () => {
    it('should show progress dialog', () => {
      service.showProgress('Loading...');
      
      const dialog = service.progressDialog();
      expect(dialog.show).toBeTrue();
      expect(dialog.title).toBe('Loading...');
      expect(dialog.progress).toBe(0);
    });
    
    it('should update progress', () => {
      service.showProgress('Loading...');
      service.updateProgress(50, 'Half done');
      
      const dialog = service.progressDialog();
      expect(dialog.progress).toBe(50);
      expect(dialog.message).toBe('Half done');
    });
    
    it('should hide progress dialog', () => {
      service.showProgress('Loading...');
      service.hideProgress();
      
      expect(service.progressDialog().show).toBeFalse();
    });
  });
  
  describe('Success Overlay', () => {
    beforeEach(() => {
      jasmine.clock().install();
    });
    
    afterEach(() => {
      jasmine.clock().uninstall();
    });
    
    it('should show success overlay', () => {
      service.showSuccess({ title: 'Success!' });
      
      expect(service.showSuccessOverlay()).toBeTrue();
      expect(service.successOverlayConfig()?.title).toBe('Success!');
    });
    
    it('should auto-hide after duration', () => {
      service.showSuccess({ title: 'Success!', duration: 1000 });
      
      jasmine.clock().tick(1000);
      
      expect(service.showSuccessOverlay()).toBeFalse();
    });
    
    it('should use default duration if not specified', () => {
      service.showSuccess({ title: 'Success!' });
      
      jasmine.clock().tick(2000);
      
      expect(service.showSuccessOverlay()).toBeFalse();
    });
  });
  
  describe('Delete Confirm Dialog', () => {
    it('should show single delete confirm', () => {
      const lead = { id: 1, username: 'test' };
      service.showDeleteConfirm('single', lead);
      
      const dialog = service.deleteConfirmDialog();
      expect(dialog.show).toBeTrue();
      expect(dialog.type).toBe('single');
      expect(dialog.lead).toEqual(lead);
    });
    
    it('should show batch delete confirm', () => {
      service.showDeleteConfirm('batch', undefined, 5);
      
      const dialog = service.deleteConfirmDialog();
      expect(dialog.show).toBeTrue();
      expect(dialog.type).toBe('batch');
      expect(dialog.count).toBe(5);
    });
    
    it('should hide delete confirm', () => {
      service.showDeleteConfirm('single');
      service.hideDeleteConfirm();
      
      expect(service.deleteConfirmDialog().show).toBeFalse();
    });
  });
  
  describe('QR Login Dialog', () => {
    it('should open QR login dialog', () => {
      service.openQrLogin();
      expect(service.showQrLoginDialog()).toBeTrue();
    });
    
    it('should close QR login dialog', () => {
      service.openQrLogin();
      service.closeQrLogin();
      expect(service.showQrLoginDialog()).toBeFalse();
    });
  });
  
  describe('Batch Send Dialog', () => {
    it('should open batch send dialog with targets', () => {
      const targets = [{ id: 1 }, { id: 2 }];
      service.openBatchSend(targets);
      
      expect(service.showBatchMessageDialog()).toBeTrue();
      expect(service.batchSendTargets()).toEqual(targets);
    });
    
    it('should close batch send dialog and clear targets', () => {
      service.openBatchSend([{ id: 1 }]);
      service.closeBatchSend();
      
      expect(service.showBatchMessageDialog()).toBeFalse();
      expect(service.batchSendTargets()).toEqual([]);
    });
  });
  
  describe('Batch Invite Dialog', () => {
    it('should open batch invite dialog with targets', () => {
      const targets = [{ id: 1 }, { id: 2 }];
      service.openBatchInvite(targets);
      
      expect(service.showBatchInviteDialog()).toBeTrue();
      expect(service.batchInviteTargets()).toEqual(targets);
    });
    
    it('should close batch invite dialog and clear targets', () => {
      service.openBatchInvite([{ id: 1 }]);
      service.closeBatchInvite();
      
      expect(service.showBatchInviteDialog()).toBeFalse();
      expect(service.batchInviteTargets()).toEqual([]);
    });
  });
  
  describe('Member Extraction Dialog', () => {
    it('should open member extraction dialog', () => {
      const group = { id: 1, title: 'Test Group' };
      service.openMemberExtraction(group);
      
      expect(service.showMemberExtractionDialog()).toBeTrue();
      expect(service.memberExtractionGroup()).toEqual(group);
    });
    
    it('should close member extraction dialog', () => {
      service.openMemberExtraction({ id: 1 });
      service.closeMemberExtraction();
      
      expect(service.showMemberExtractionDialog()).toBeFalse();
      expect(service.memberExtractionGroup()).toBeNull();
    });
  });
  
  describe('Join Monitor Dialog', () => {
    it('should open join monitor dialog', () => {
      const resource = { id: 1, title: 'Test' };
      service.openJoinMonitor(resource);
      
      expect(service.showJoinMonitorDialog()).toBeTrue();
      expect(service.joinMonitorResource()).toEqual(resource);
    });
    
    it('should close join monitor dialog', () => {
      service.openJoinMonitor({ id: 1 });
      service.closeJoinMonitor();
      
      expect(service.showJoinMonitorDialog()).toBeFalse();
      expect(service.joinMonitorResource()).toBeNull();
    });
  });
  
  describe('Post Join Dialog', () => {
    it('should open post join dialog', () => {
      const resource = { id: 1, title: 'Test' };
      service.openPostJoin(resource);
      
      expect(service.showPostJoinDialog()).toBeTrue();
      expect(service.postJoinResource()).toEqual(resource);
    });
    
    it('should close post join dialog', () => {
      service.openPostJoin({ id: 1 });
      service.closePostJoin();
      
      expect(service.showPostJoinDialog()).toBeFalse();
      expect(service.postJoinResource()).toBeNull();
    });
  });
});
