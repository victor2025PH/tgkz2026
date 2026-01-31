/**
 * Automation View Component Tests
 * 自動化視圖組件單元測試
 * 
 * 🆕 Phase 32: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutomationViewComponent } from './automation-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('AutomationViewComponent', () => {
  let component: AutomationViewComponent;
  let fixture: ComponentFixture<AutomationViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockIpc.on.and.returnValue(() => {});
    
    await TestBed.configureTestingModule({
      imports: [AutomationViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AutomationViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should not be monitoring by default', () => {
      expect(component.isMonitoring()).toBeFalse();
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('dashboard');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
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
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('automation');
      expect(mockI18n.t).toHaveBeenCalledWith('automation');
    });
  });
});
