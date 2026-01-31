/**
 * Leads View Component Tests
 * 線索管理視圖組件單元測試
 * 
 * 🆕 Phase 31: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeadsViewComponent } from './leads-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { LeadManagementService, DialogService, ExportService } from '../services';
import { signal } from '@angular/core';

describe('LeadsViewComponent', () => {
  let component: LeadsViewComponent;
  let fixture: ComponentFixture<LeadsViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockLeadService: jasmine.SpyObj<LeadManagementService>;
  let mockDialog: jasmine.SpyObj<DialogService>;
  let mockExport: jasmine.SpyObj<ExportService>;
  
  const mockLeads = [
    { id: 1, userId: 'user1', username: 'User One', stage: 'new', score: 80 },
    { id: 2, userId: 'user2', username: 'User Two', stage: 'contacted', score: 60 }
  ];
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    mockLeadService = jasmine.createSpyObj('LeadManagementService', ['setSelectedLead']);
    mockDialog = jasmine.createSpyObj('DialogService', ['confirm', 'openBatchSend']);
    mockExport = jasmine.createSpyObj('ExportService', ['exportLeads']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockIpc.on.and.returnValue(() => {});
    
    await TestBed.configureTestingModule({
      imports: [LeadsViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast },
        { provide: LeadManagementService, useValue: mockLeadService },
        { provide: DialogService, useValue: mockDialog },
        { provide: ExportService, useValue: mockExport }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(LeadsViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have empty search term by default', () => {
      expect(component.searchTerm()).toBe('');
    });
    
    it('should have empty stage filter by default', () => {
      expect(component.stageFilter()).toBe('');
    });
  });
  
  describe('Refresh', () => {
    it('should refresh leads', () => {
      component.refresh();
      expect(mockIpc.send).toHaveBeenCalledWith('get-leads');
      expect(mockIpc.send).toHaveBeenCalledWith('get-lead-stats');
      expect(mockToast.info).toHaveBeenCalledWith('正在刷新...');
    });
  });
  
  describe('Export', () => {
    it('should export leads', () => {
      component.exportLeads();
      expect(mockExport.exportLeads).toHaveBeenCalledWith('csv');
    });
  });
  
  describe('Lead Operations', () => {
    it('should view lead', () => {
      const lead = mockLeads[0];
      component.viewLead(lead);
      expect(mockLeadService.setSelectedLead).toHaveBeenCalledWith(lead);
    });
    
    it('should message lead', () => {
      const lead = mockLeads[0];
      component.messageLead(lead);
      expect(mockDialog.openBatchSend).toHaveBeenCalledWith([lead]);
    });
    
    it('should delete lead with confirmation', () => {
      const lead = mockLeads[0];
      component.deleteLead(lead);
      expect(mockDialog.confirm).toHaveBeenCalled();
    });
  });
  
  describe('Stage Utilities', () => {
    it('should get stage class', () => {
      expect(component.getStageClass('new')).toBe('bg-blue-500/20 text-blue-400');
      expect(component.getStageClass('contacted')).toBe('bg-amber-500/20 text-amber-400');
      expect(component.getStageClass('converted')).toBe('bg-green-500/20 text-green-400');
    });
    
    it('should get stage label', () => {
      expect(component.getStageLabel('new')).toBe('新線索');
      expect(component.getStageLabel('contacted')).toBe('已聯繫');
      expect(component.getStageLabel('converted')).toBe('已轉化');
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('leads');
      expect(mockI18n.t).toHaveBeenCalledWith('leads');
    });
  });
});
