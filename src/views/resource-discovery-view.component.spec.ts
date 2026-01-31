/**
 * Resource Discovery View Component Tests
 * 資源發現視圖組件單元測試
 * 
 * 🆕 Phase 32: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceDiscoveryViewComponent } from './resource-discovery-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, ResourceService } from '../services';
import { signal } from '@angular/core';

describe('ResourceDiscoveryViewComponent', () => {
  let component: ResourceDiscoveryViewComponent;
  let fixture: ComponentFixture<ResourceDiscoveryViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockIpc: jasmine.SpyObj<ElectronIpcService>;
  let mockToast: jasmine.SpyObj<ToastService>;
  let mockAccountService: jasmine.SpyObj<AccountManagementService>;
  let mockResourceService: jasmine.SpyObj<ResourceService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockIpc = jasmine.createSpyObj('ElectronIpcService', ['send', 'on']);
    mockToast = jasmine.createSpyObj('ToastService', ['success', 'info', 'warning', 'error']);
    mockAccountService = jasmine.createSpyObj('AccountManagementService', ['loadAccounts']);
    mockResourceService = jasmine.createSpyObj('ResourceService', ['toggleSelection', 'batchJoin']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    mockIpc.on.and.returnValue(() => {});
    (mockAccountService as any).accounts = signal([]);
    
    await TestBed.configureTestingModule({
      imports: [ResourceDiscoveryViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: ElectronIpcService, useValue: mockIpc },
        { provide: ToastService, useValue: mockToast },
        { provide: AccountManagementService, useValue: mockAccountService },
        { provide: ResourceService, useValue: mockResourceService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(ResourceDiscoveryViewComponent);
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
  
  describe('Resource Operations', () => {
    it('should select resource', () => {
      const resource = { id: 1, name: 'Test Resource' };
      component.selectResource(resource);
      expect(mockResourceService.toggleSelection).toHaveBeenCalledWith(1);
    });
    
    it('should batch join resources', () => {
      const resources = [
        { id: 1, name: 'Resource 1' },
        { id: 2, name: 'Resource 2' }
      ];
      component.batchJoin(resources);
      expect(mockResourceService.batchJoin).toHaveBeenCalledWith([1, 2]);
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('resourceDiscovery');
      expect(mockI18n.t).toHaveBeenCalledWith('resourceDiscovery');
    });
  });
});
