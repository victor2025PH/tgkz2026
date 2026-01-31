/**
 * Accounts View Component Tests
 * 帳號管理視圖組件單元測試
 * 
 * 🆕 Phase 31: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountsViewComponent } from './accounts-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, DialogService } from '../services';
import { signal } from '@angular/core';

describe('AccountsViewComponent', () => {
  let component: AccountsViewComponent;
  let fixture: ComponentFixture<AccountsViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockAccountService: jasmine.SpyObj<AccountManagementService>;
  let mockDialog: jasmine.SpyObj<DialogService>;
  
  const mockAccounts = [
    { id: 1, phone: '+1234567890', is_connected: true, display_name: 'User 1' },
    { id: 2, phone: '+0987654321', is_connected: false, display_name: 'User 2' }
  ];
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature', 'showDialog']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    mockAccountService = jasmine.createSpyObj('AccountManagementService', ['loadAccounts', 'removeAccount', 'loginAccount', 'logoutAccount']);
    mockDialog = jasmine.createSpyObj('DialogService', ['confirm', 'openQrLogin', 'openBatchSend']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockIpc.on.and.returnValue(() => {});
    (mockAccountService as any).accounts = signal(mockAccounts);
    (mockMembership as any).quotas = signal({ maxAccounts: 5 });
    
    await TestBed.configureTestingModule({
      imports: [AccountsViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast },
        { provide: AccountManagementService, useValue: mockAccountService },
        { provide: DialogService, useValue: mockDialog }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AccountsViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have accounts from service', () => {
      expect(component.accounts().length).toBe(2);
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('dashboard');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
  
  describe('Upgrade Dialog', () => {
    it('should show upgrade dialog', () => {
      component.showUpgrade();
      expect(mockMembership.showDialog).toHaveBeenCalled();
    });
  });
  
  describe('QR Login', () => {
    it('should open QR login dialog', () => {
      component.openQrLogin();
      expect(mockDialog.openQrLogin).toHaveBeenCalled();
    });
  });
  
  describe('Account Removal', () => {
    it('should show confirm dialog for account removal', () => {
      const account = mockAccounts[0];
      component.removeAccount(account.id);
      expect(mockDialog.confirm).toHaveBeenCalled();
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('manageAccounts');
      expect(mockI18n.t).toHaveBeenCalledWith('manageAccounts');
    });
  });
});
