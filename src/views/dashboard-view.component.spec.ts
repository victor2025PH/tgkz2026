/**
 * Dashboard View Component Tests
 * 儀表板視圖組件單元測試
 * 
 * 🆕 Phase 31: 添加視圖組件測試
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DashboardViewComponent } from './dashboard-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService } from '../services/account-management.service';
import { signal } from '@angular/core';

describe('DashboardViewComponent', () => {
  let component: DashboardViewComponent;
  let fixture: ComponentFixture<DashboardViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockAccountService: jasmine.SpyObj<AccountManagementService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    mockAccountService = jasmine.createSpyObj('AccountManagementService', ['loadAccounts']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockMembership.hasFeature.and.returnValue(true);
    mockIpc.on.and.returnValue(() => {});
    (mockAccountService as any).accounts = signal([
      { id: 1, phone: '+1234567890', is_connected: true },
      { id: 2, phone: '+0987654321', is_connected: false }
    ]);
    
    await TestBed.configureTestingModule({
      imports: [DashboardViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast },
        { provide: AccountManagementService, useValue: mockAccountService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(DashboardViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have more actions collapsed by default', () => {
      expect(component.showMore()).toBeFalse();
    });
    
    it('should not be starting by default', () => {
      expect(component.starting()).toBeFalse();
    });
    
    it('should not be monitoring by default', () => {
      expect(component.isMonitoring()).toBeFalse();
    });
  });
  
  describe('Setup Steps', () => {
    it('should compute completed steps from real data sources', () => {
      // mock 有 2 個帳號 → 第一步完成；其餘步驟未完成
      expect(component.completedSteps()).toBe(1);
      expect(component.setupComplete()).toBeFalse();
    });
    
    it('should point current step to first incomplete step', () => {
      expect(component.currentStep()?.id).toBe('groups');
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('accounts');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/accounts']);
    });
    
    it('should navigate to settings', () => {
      component.navigateTo('settings');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/settings']);
    });
  });
  
  describe('Status Operations', () => {
    it('should refresh status', () => {
      component.refreshStatus();
      expect(mockIpc.send).toHaveBeenCalledWith('get-system-status');
      expect(mockIpc.send).toHaveBeenCalledWith('get-monitoring-status');
    });
  });
  
  describe('One Click Operations', () => {
    it('should start one click start', () => {
      component.oneClickStart();
      expect(component.starting()).toBeTrue();
      expect(component.startProgress()).toBe(0);
      expect(mockIpc.send).toHaveBeenCalledWith('one-click-start');
    });
    
    it('should stop all services', () => {
      component.oneClickStop();
      expect(mockIpc.send).toHaveBeenCalledWith('one-click-stop');
      expect(mockToast.info).toHaveBeenCalledWith('正在停止所有服務...');
    });
  });
  
  describe('Monitoring Operations', () => {
    it('should start monitoring', () => {
      component.startMonitoring();
      expect(mockIpc.send).toHaveBeenCalledWith('start-monitoring');
    });
    
    it('should stop monitoring', () => {
      component.stopMonitoring();
      expect(mockIpc.send).toHaveBeenCalledWith('stop-monitoring');
    });
  });
  
  describe('Computed Properties', () => {
    it('should calculate online accounts count', () => {
      expect(component.onlineAccountsCount()).toBe(1);
    });
    
    it('should calculate total accounts count', () => {
      expect(component.totalAccountsCount()).toBe(2);
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('dashboard');
      expect(mockI18n.t).toHaveBeenCalledWith('dashboard');
    });
  });
});
