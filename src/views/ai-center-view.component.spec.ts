/**
 * AI Center View Component Tests
 * AI 中心視圖組件單元測試
 * 
 * 🆕 Phase 32: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiCenterViewComponent } from './ai-center-view.component';
import { Router } from '@angular/router';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AiChatService } from '../services';
import { signal } from '@angular/core';

describe('AiCenterViewComponent', () => {
  let component: AiCenterViewComponent;
  let fixture: ComponentFixture<AiCenterViewComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockAiService: jasmine.SpyObj<AiChatService>;
  
  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockI18n = jasmine.createSpyObj('I18nService', ['t']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockAiService = jasmine.createSpyObj('AiChatService', ['loadSettings']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    
    await TestBed.configureTestingModule({
      imports: [AiCenterViewComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: AiChatService, useValue: mockAiService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AiCenterViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have config tab active by default', () => {
      expect(component.activeTab()).toBe('config');
    });
  });
  
  describe('Navigation', () => {
    it('should navigate to specified view', () => {
      component.navigateTo('dashboard');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
  
  describe('Tab Management', () => {
    it('should set active tab', () => {
      component.setActiveTab('chat');
      expect(component.activeTab()).toBe('chat');
    });
    
    it('should update URL when changing tab', () => {
      component.setActiveTab('rag');
      expect(mockRouter.navigate).toHaveBeenCalled();
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('aiCenter');
      expect(mockI18n.t).toHaveBeenCalledWith('aiCenter');
    });
  });
});
