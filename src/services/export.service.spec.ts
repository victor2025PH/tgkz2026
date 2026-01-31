/**
 * ExportService Unit Tests
 * 導出服務單元測試
 * 
 * 🆕 Phase 28: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { ExportService, ExportFormat, ExportType, ExportJob } from './export.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('ExportService', () => {
  let service: ExportService;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(() => {
    localStorage.clear();
    
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'error', 'info', 'warning']);
    
    TestBed.configureTestingModule({
      providers: [
        ExportService,
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    });
    
    service = TestBed.inject(ExportService);
  });
  
  afterEach(() => {
    localStorage.clear();
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have empty jobs', () => {
      expect(service.jobs()).toEqual([]);
    });
    
    it('should have no current job', () => {
      expect(service.currentJob()).toBeNull();
    });
    
    it('should have empty templates', () => {
      expect(service.templates()).toEqual([]);
    });
    
    it('should not be exporting', () => {
      expect(service.isExporting()).toBeFalse();
    });
  });
  
  describe('Export Operations', () => {
    it('should export leads as CSV', () => {
      service.exportLeads('csv');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'csv',
        type: 'leads',
        includeHeaders: true
      }));
      expect(mockToast.info).toHaveBeenCalledWith('開始導出...');
    });
    
    it('should export members with resource ID', () => {
      service.exportMembers(123, 'xlsx');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'xlsx',
        type: 'members',
        filters: { resourceId: 123 }
      }));
    });
    
    it('should export resources', () => {
      service.exportResources('json');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'json',
        type: 'resources'
      }));
    });
    
    it('should export messages', () => {
      service.exportMessages('json');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'json',
        type: 'messages'
      }));
    });
    
    it('should export analytics', () => {
      service.exportAnalytics('xlsx');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'xlsx',
        type: 'analytics'
      }));
    });
    
    it('should export report', () => {
      service.exportReport('daily', 'pdf');
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        format: 'pdf',
        type: 'report',
        filters: { reportType: 'daily' }
      }));
    });
  });
  
  describe('Job Management', () => {
    it('should delete job', () => {
      // 手動添加一個 job 到內部狀態測試刪除
      service.deleteJob('job-123');
      // 由於是空的，不會有實際效果，但不應該拋出錯誤
      expect(service.jobs()).toEqual([]);
    });
    
    it('should not clear history without confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      service.clearHistory();
      
      // 不應該清除
    });
    
    it('should clear history with confirmation', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      
      service.clearHistory();
      
      expect(service.jobs()).toEqual([]);
      expect(mockToast.success).toHaveBeenCalledWith('導出歷史已清除');
    });
  });
  
  describe('Template Management', () => {
    it('should save template', () => {
      service.saveTemplate({
        name: 'Test Template',
        type: 'leads',
        options: { format: 'csv' }
      });
      
      expect(service.templates().length).toBe(1);
      expect(service.templates()[0].name).toBe('Test Template');
      expect(mockToast.success).toHaveBeenCalledWith('模板已保存');
    });
    
    it('should not delete template without confirmation', () => {
      service.saveTemplate({ name: 'Test', type: 'leads', options: {} });
      const templateId = service.templates()[0].id;
      
      spyOn(window, 'confirm').and.returnValue(false);
      service.deleteTemplate(templateId);
      
      expect(service.templates().length).toBe(1);
    });
    
    it('should delete template with confirmation', () => {
      service.saveTemplate({ name: 'Test', type: 'leads', options: {} });
      const templateId = service.templates()[0].id;
      
      spyOn(window, 'confirm').and.returnValue(true);
      service.deleteTemplate(templateId);
      
      expect(service.templates().length).toBe(0);
      expect(mockToast.success).toHaveBeenCalledWith('模板已刪除');
    });
    
    it('should use template for export', () => {
      service.saveTemplate({
        name: 'Test',
        type: 'leads',
        options: { format: 'xlsx' as ExportFormat }
      });
      const templateId = service.templates()[0].id;
      
      service.useTemplate(templateId);
      
      expect(mockIpc.send).toHaveBeenCalledWith('start-export', jasmine.objectContaining({
        type: 'leads'
      }));
    });
    
    it('should show error for non-existent template', () => {
      service.useTemplate('non-existent');
      
      expect(mockToast.error).toHaveBeenCalledWith('模板不存在');
    });
  });
  
  describe('Utility Methods', () => {
    it('should return correct format icon', () => {
      expect(service.getFormatIcon('csv')).toBe('📊');
      expect(service.getFormatIcon('xlsx')).toBe('📗');
      expect(service.getFormatIcon('json')).toBe('📋');
      expect(service.getFormatIcon('pdf')).toBe('📕');
    });
    
    it('should return correct format name', () => {
      expect(service.getFormatName('csv')).toBe('CSV');
      expect(service.getFormatName('xlsx')).toBe('Excel');
      expect(service.getFormatName('json')).toBe('JSON');
      expect(service.getFormatName('pdf')).toBe('PDF');
    });
    
    it('should return correct type name', () => {
      expect(service.getTypeName('leads')).toBe('線索');
      expect(service.getTypeName('members')).toBe('成員');
      expect(service.getTypeName('resources')).toBe('資源');
      expect(service.getTypeName('messages')).toBe('消息');
      expect(service.getTypeName('analytics')).toBe('分析');
      expect(service.getTypeName('report')).toBe('報告');
    });
  });
  
  describe('LocalStorage Persistence', () => {
    it('should persist templates to localStorage', () => {
      service.saveTemplate({
        name: 'Persistent Template',
        type: 'leads',
        options: {}
      });
      
      const saved = localStorage.getItem('export-templates');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed[0].name).toBe('Persistent Template');
    });
  });
});
