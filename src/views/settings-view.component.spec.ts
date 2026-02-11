/**
 * Settings View Component Tests
 * 設置視圖組件單元測試
 * 
 * 🆕 Phase 31: 添加視圖組件測試
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsViewComponent } from './settings-view.component';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { SettingsService, BackupService, SchedulerService, AnimationConfigService } from '../services';
import { signal } from '@angular/core';

describe('SettingsViewComponent', () => {
  let component: SettingsViewComponent;
  let fixture: ComponentFixture<SettingsViewComponent>;
  let mockI18n: jasmine.SpyObj<I18nService>;
  let mockMembership: jasmine.SpyObj<MembershipService>;
  let mockSettings: jasmine.SpyObj<SettingsService>;
  let mockBackup: jasmine.SpyObj<BackupService>;
  let mockScheduler: jasmine.SpyObj<SchedulerService>;
  let mockAnimationConfig: jasmine.SpyObj<AnimationConfigService>;
  
  beforeEach(async () => {
    mockI18n = jasmine.createSpyObj('I18nService', ['t', 'setLocale']);
    mockMembership = jasmine.createSpyObj('MembershipService', ['hasFeature']);
    mockSettings = jasmine.createSpyObj('SettingsService', ['setTheme', 'loadSettings']);
    mockBackup = jasmine.createSpyObj('BackupService', ['loadBackups', 'createBackup', 'restoreBackup', 'deleteBackup']);
    mockScheduler = jasmine.createSpyObj('SchedulerService', ['loadStatus', 'start', 'stop', 'restart']);
    mockAnimationConfig = jasmine.createSpyObj('AnimationConfigService', ['setAnimationType']);
    
    // 設置默認值
    mockI18n.t.and.callFake((key: string) => key);
    (mockI18n as any).currentLocale = signal('zh-TW');
    (mockSettings as any).theme = signal('dark');
    (mockBackup as any).backups = signal([]);
    (mockBackup as any).isLoading = signal(false);
    (mockBackup as any).isCreating = signal(false);
    (mockScheduler as any).status = signal({ running: false, tasks: [] });
    (mockScheduler as any).isLoading = signal(false);
    (mockAnimationConfig as any).animationType = signal('fade');
    (mockMembership as any).currentTier = signal('free');
    
    await TestBed.configureTestingModule({
      imports: [SettingsViewComponent],
      providers: [
        { provide: I18nService, useValue: mockI18n },
        { provide: MembershipService, useValue: mockMembership },
        { provide: SettingsService, useValue: mockSettings },
        { provide: BackupService, useValue: mockBackup },
        { provide: SchedulerService, useValue: mockScheduler },
        { provide: AnimationConfigService, useValue: mockAnimationConfig }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(SettingsViewComponent);
    component = fixture.componentInstance;
  });
  
  afterEach(() => {
    fixture.destroy();
  });
  
  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should have appearance tab active by default', () => {
      expect(component.activeTab()).toBe('appearance');
    });
  });
  
  describe('Tab Switching', () => {
    it('should switch to backup tab', () => {
      component.activeTab.set('backup');
      expect(component.activeTab()).toBe('backup');
    });
    
    it('should switch to scheduler tab', () => {
      component.activeTab.set('scheduler');
      expect(component.activeTab()).toBe('scheduler');
    });
    
    it('should switch to about tab', () => {
      component.activeTab.set('about');
      expect(component.activeTab()).toBe('about');
    });
  });
  
  describe('Backup Operations', () => {
    it('should load backups', () => {
      component.loadBackups();
      expect(mockBackup.loadBackups).toHaveBeenCalled();
    });
    
    it('should create backup', () => {
      component.createBackup();
      expect(mockBackup.createBackup).toHaveBeenCalled();
    });
  });
  
  describe('Scheduler Operations', () => {
    it('should load scheduler status', () => {
      component.loadSchedulerStatus();
      expect(mockScheduler.loadStatus).toHaveBeenCalled();
    });
    
    it('should start scheduler', () => {
      component.startScheduler();
      expect(mockScheduler.start).toHaveBeenCalled();
    });
    
    it('should stop scheduler', () => {
      component.stopScheduler();
      expect(mockScheduler.stop).toHaveBeenCalled();
    });
  });
  
  describe('Theme Settings', () => {
    it('should set theme', () => {
      component.setTheme('light');
      expect(mockSettings.setTheme).toHaveBeenCalledWith('light');
    });
  });
  
  describe('Translation', () => {
    it('should call i18n service for translation', () => {
      component.t('settings.settingsTitle');
      expect(mockI18n.t).toHaveBeenCalledWith('settings.settingsTitle');
    });
  });
});
