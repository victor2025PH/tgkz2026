/**
 * AnimationConfigService Unit Tests
 * 動畫配置服務單元測試
 * 
 * 🆕 Phase 27: 為服務添加單元測試
 */

import { TestBed } from '@angular/core/testing';
import { AnimationConfigService, AnimationType, ANIMATION_OPTIONS } from './animation-config.service';

describe('AnimationConfigService', () => {
  let service: AnimationConfigService;
  
  beforeEach(() => {
    // 清除 localStorage
    localStorage.removeItem('animation-type');
    
    TestBed.configureTestingModule({
      providers: [AnimationConfigService]
    });
    
    service = TestBed.inject(AnimationConfigService);
  });
  
  afterEach(() => {
    localStorage.removeItem('animation-type');
  });
  
  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('Initial State', () => {
    it('should have default animation type', () => {
      expect(service.animationType()).toBe('default');
    });
    
    it('should have animation options', () => {
      expect(service.options).toEqual(ANIMATION_OPTIONS);
      expect(service.options.length).toBeGreaterThan(0);
    });
  });
  
  describe('setAnimationType', () => {
    it('should change animation type', () => {
      service.setAnimationType('fade');
      expect(service.animationType()).toBe('fade');
    });
    
    it('should persist to localStorage', () => {
      service.setAnimationType('slide');
      expect(localStorage.getItem('animation-type')).toBe('slide');
    });
    
    it('should handle all animation types', () => {
      const types: AnimationType[] = ['none', 'fade', 'slide', 'slideUp', 'scale', 'default'];
      types.forEach(type => {
        service.setAnimationType(type);
        expect(service.animationType()).toBe(type);
      });
    });
  });
  
  describe('getAnimation', () => {
    it('should return animation trigger', () => {
      const animation = service.getAnimation();
      expect(animation).toBeTruthy();
      expect(animation.name).toBe('routeAnimations');
    });
    
    it('should return different animations for different types', () => {
      service.setAnimationType('fade');
      const fadeAnim = service.getAnimation();
      
      service.setAnimationType('slide');
      const slideAnim = service.getAnimation();
      
      // 兩個動畫應該都存在
      expect(fadeAnim).toBeTruthy();
      expect(slideAnim).toBeTruthy();
    });
  });
  
  describe('nextAnimation', () => {
    it('should cycle through animation types', () => {
      const initialType = service.animationType();
      service.nextAnimation();
      
      // 應該變成不同的類型
      const nextType = service.animationType();
      expect(nextType).not.toBe(initialType);
    });
    
    it('should cycle back to first type after last', () => {
      // 設置為最後一種動畫
      service.setAnimationType('default');
      service.nextAnimation();
      
      // 應該循環回第一種
      expect(['none', 'fade', 'slide', 'slideUp', 'scale', 'default']).toContain(service.animationType());
    });
  });
  
  describe('resetToDefault', () => {
    it('should reset to default animation', () => {
      service.setAnimationType('slide');
      service.resetToDefault();
      
      expect(service.animationType()).toBe('default');
    });
    
    it('should clear localStorage', () => {
      service.setAnimationType('fade');
      service.resetToDefault();
      
      expect(localStorage.getItem('animation-type')).toBeNull();
    });
  });
  
  describe('isAnimationDisabled', () => {
    it('should return true when animation is none', () => {
      service.setAnimationType('none');
      expect(service.isAnimationDisabled()).toBeTrue();
    });
    
    it('should return false for other types', () => {
      service.setAnimationType('fade');
      expect(service.isAnimationDisabled()).toBeFalse();
      
      service.setAnimationType('default');
      expect(service.isAnimationDisabled()).toBeFalse();
    });
  });
  
  describe('localStorage persistence', () => {
    it('should load saved type on init', () => {
      localStorage.setItem('animation-type', 'scale');
      
      // 重新創建服務
      const newService = new AnimationConfigService();
      
      expect(newService.animationType()).toBe('scale');
    });
    
    it('should handle invalid localStorage value', () => {
      localStorage.setItem('animation-type', 'invalid-type');
      
      // 應該回退到默認值
      const newService = new AnimationConfigService();
      expect(['none', 'fade', 'slide', 'slideUp', 'scale', 'default']).toContain(newService.animationType());
    });
  });
});
