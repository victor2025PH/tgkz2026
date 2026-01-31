/**
 * Analytics View Component Tests
 * 數據分析視圖組件單元測試
 * 
 * 🆕 Phase 32: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalyticsViewComponent } from './analytics-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

describe('AnalyticsViewComponent', () => {
  let component: AnalyticsViewComponent;
  let fixture: ComponentFixture<AnalyticsViewComponent>;
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
      imports: [AnalyticsViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AnalyticsViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have date range set to last 30 days by default', () => {
      fixture.detectChanges();
      const range = component.dateRange();
      expect(range).not.toBeNull();
      if (range) {
        const diffDays = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
        expect(diffDays).toBe(30);
      }
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('dashboard');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
  
  describe('Date Range', () => {
    it('should set date range', () => {
      const newRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31')
      };
      component.setDateRange(newRange);
      expect(component.dateRange()).toEqual(newRange);
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('analytics');
      expect(mockI18n.t).toHaveBeenCalledWith('analytics');
    });
  });
});
