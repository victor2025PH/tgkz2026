/**
 * Monitoring View Component Tests
 * 監控中心視圖組件單元測試
 * 
 * 🆕 Phase 31: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonitoringViewComponent } from './monitoring-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, DialogService } from '../services';
import { MonitoringStateService } from '../monitoring/monitoring-state.service';
import { signal } from '@angular/core';

describe('MonitoringViewComponent', () => {
  let component: MonitoringViewComponent;
  let fixture: ComponentFixture<MonitoringViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockAccountService: jasmine.SpyObj<AccountManagementService>;
  let mockDialog: jasmine.SpyObj<DialogService>;
  let mockMonitoringState: jasmine.SpyObj<MonitoringStateService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    mockAccountService = jasmine.createSpyObj('AccountManagementService', ['loadAccounts']);
    mockDialog = jasmine.createSpyObj('DialogService', ['openJoinMonitor']);
    mockMonitoringState = jasmine.createSpyObj('MonitoringStateService', [
      'loadAllData', 
      'loadMonitoringGroups', 
      'loadKeywordSets',
      'setSelectedAccount',
      'setSelectedGroup',
      'setSelectedKeywordSet',
      'setSelectedRule',
      'setSelectedTemplate'
    ]);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockIpc.on.and.returnValue(() => {});
    (mockMonitoringState as any).monitoringAccounts = signal([]);
    (mockMonitoringState as any).monitoringGroups = signal([]);
    (mockMonitoringState as any).keywordSets = signal([]);
    (mockMonitoringState as any).triggerRules = signal([]);
    (mockMonitoringState as any).chatTemplates = signal([]);
    
    await TestBed.configureTestingModule({
      imports: [MonitoringViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast },
        { provide: AccountManagementService, useValue: mockAccountService },
        { provide: DialogService, useValue: mockDialog },
        { provide: MonitoringStateService, useValue: mockMonitoringState }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(MonitoringViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have groups tab active by default', () => {
      expect(component.activeTab()).toBe('groups');
    });
    
    it('should have correct tabs configuration', () => {
      expect(component.tabs.length).toBe(5);
      expect(component.tabs[0].id).toBe('accounts');
      expect(component.tabs[1].id).toBe('groups');
    });
  });
  
  describe('Tab Switching', () => {
    it('should switch to accounts tab', () => {
      component.activeTab.set('accounts');
      expect(component.activeTab()).toBe('accounts');
    });
    
    it('should switch to keywords tab', () => {
      component.activeTab.set('keywords');
      expect(component.activeTab()).toBe('keywords');
    });
    
    it('should switch to rules tab', () => {
      component.activeTab.set('rules');
      expect(component.activeTab()).toBe('rules');
    });
    
    it('should switch to templates tab', () => {
      component.activeTab.set('templates');
      expect(component.activeTab()).toBe('templates');
    });
  });
  
  describe('Selection Operations', () => {
    it('should select account', () => {
      const account = { id: 1, phone: '+1234567890' };
      component.selectAccount(account);
      expect(mockMonitoringState.setSelectedAccount).toHaveBeenCalledWith(account);
    });
    
    it('should select group', () => {
      const group = { id: 1, name: 'Test Group' };
      component.selectGroup(group);
      expect(mockMonitoringState.setSelectedGroup).toHaveBeenCalledWith(group);
    });
    
    it('should select keyword set', () => {
      const keywordSet = { id: 1, name: 'Test Keywords' };
      component.selectKeywordSet(keywordSet);
      expect(mockMonitoringState.setSelectedKeywordSet).toHaveBeenCalledWith(keywordSet);
    });
  });
  
  describe('Add Operations', () => {
    it('should add group', () => {
      component.addGroup();
      expect(mockDialog.openJoinMonitor).toHaveBeenCalled();
    });
    
    it('should add keyword set', () => {
      component.addKeywordSet();
      expect(mockIpc.send).toHaveBeenCalledWith('open-add-keyword-set-dialog');
    });
    
    it('should add rule', () => {
      component.addRule();
      expect(mockIpc.send).toHaveBeenCalledWith('open-add-rule-dialog');
    });
    
    it('should add template', () => {
      component.addTemplate();
      expect(mockIpc.send).toHaveBeenCalledWith('open-add-template-dialog');
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('monitoring');
      expect(mockI18n.t).toHaveBeenCalledWith('monitoring');
    });
  });
});
