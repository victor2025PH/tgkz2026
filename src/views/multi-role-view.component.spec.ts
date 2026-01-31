/**
 * Multi-Role View Component Tests
 * 多角色視圖組件單元測試
 * 
 * 🆕 Phase 32: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiRoleViewComponent } from './multi-role-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AccountManagementService } from '../services';
import { signal } from '@angular/core';

describe('MultiRoleViewComponent', () => {
  let component: MultiRoleViewComponent;
  let fixture: ComponentFixture<MultiRoleViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockAccountService: jasmine.SpyObj<AccountManagementService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockAccountService = jasmine.createSpyObj('AccountManagementService', ['loadAccounts']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    (mockAccountService as any).accounts = signal([
      { id: 1, phone: '+1234567890', is_connected: true },
      { id: 2, phone: '+0987654321', is_connected: false }
    ]);
    
    await TestBed.configureTestingModule({
      imports: [MultiRoleViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: AccountManagementService, useValue: mockAccountService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(MultiRoleViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('dashboard');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('multiRole');
      expect(mockI18n.t).toHaveBeenCalledWith('multiRole');
    });
  });
});
