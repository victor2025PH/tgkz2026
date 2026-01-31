/**
 * 主題服務單元測試
 * Theme Service Unit Tests
 * 
 * 🆕 測試優化: 前端單元測試
 */

import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [ThemeService]
    });

    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark', 'light');
  });

  describe('主題模式', () => {
    it('應該默認為暗色模式', () => {
      expect(service.mode()).toBe('dark');
      expect(service.isDark()).toBe(true);
    });

    it('應該能設置亮色模式', () => {
      service.setMode('light');

      expect(service.mode()).toBe('light');
      expect(service.isDark()).toBe(false);
    });

    it('應該能設置系統模式', () => {
      service.setMode('system');

      expect(service.mode()).toBe('system');
    });

    it('應該能切換主題', () => {
      expect(service.isDark()).toBe(true);

      service.toggle();

      expect(service.isDark()).toBe(false);

      service.toggle();

      expect(service.isDark()).toBe(true);
    });
  });

  describe('預設主題', () => {
    it('應該有預設主題列表', () => {
      const presets = service.presets();

      expect(presets.length).toBeGreaterThan(0);
    });

    it('應該能應用預設主題', () => {
      const presets = service.presets();
      const preset = presets.find(p => p.id === 'midnight');

      if (preset) {
        service.applyPreset('midnight');

        expect(service.activePreset()).toBe('midnight');
        expect(service.mode()).toBe(preset.mode);
      }
    });

    it('預設主題應該有必要屬性', () => {
      const presets = service.presets();

      presets.forEach(preset => {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(['dark', 'light']).toContain(preset.mode);
      });
    });
  });

  describe('自定義顏色', () => {
    it('應該能設置自定義顏色', () => {
      service.setCustomColor('primary', '#ff0000');

      expect(service.customColors().primary).toBe('#ff0000');
    });

    it('應該能重置自定義顏色', () => {
      service.setCustomColor('primary', '#ff0000');
      service.setCustomColor('secondary', '#00ff00');

      service.resetCustomColors();

      expect(service.customColors()).toEqual({});
    });

    it('自定義顏色應該覆蓋預設顏色', () => {
      const originalPrimary = service.currentColors().primary;

      service.setCustomColor('primary', '#123456');

      expect(service.currentColors().primary).toBe('#123456');
      expect(service.currentColors().primary).not.toBe(originalPrimary);
    });
  });

  describe('當前顏色', () => {
    it('暗色模式應該有正確的顏色', () => {
      service.setMode('dark');

      const colors = service.currentColors();

      expect(colors.background).toBeTruthy();
      expect(colors.text).toBeTruthy();
      expect(colors.primary).toBeTruthy();
    });

    it('亮色模式應該有正確的顏色', () => {
      service.setMode('light');

      const colors = service.currentColors();

      expect(colors.background).toBeTruthy();
      expect(colors.text).toBeTruthy();
      expect(colors.primary).toBeTruthy();
    });

    it('亮色和暗色的背景色應該不同', () => {
      service.setMode('dark');
      const darkBg = service.currentColors().background;

      service.setMode('light');
      const lightBg = service.currentColors().background;

      expect(darkBg).not.toBe(lightBg);
    });
  });

  describe('CSS 變量', () => {
    it('應該生成正確的 CSS 變量', () => {
      const cssVars = service.getCssVariables();

      expect(cssVars).toContain('--theme-primary');
      expect(cssVars).toContain('--theme-background');
      expect(cssVars).toContain('--theme-text');
    });
  });

  describe('持久化', () => {
    it('應該保存設置到 localStorage', () => {
      service.setMode('light');
      service.applyPreset('midnight');

      const saved = localStorage.getItem('theme_settings');
      expect(saved).toBeTruthy();

      const settings = JSON.parse(saved!);
      expect(settings.mode).toBe('dark'); // midnight 是暗色主題
      expect(settings.preset).toBe('midnight');
    });

    it('應該從 localStorage 加載設置', () => {
      localStorage.setItem('theme_settings', JSON.stringify({
        mode: 'light',
        preset: 'ocean',
        customColors: { primary: '#custom' }
      }));

      // 重新創建服務
      const newService = new ThemeService();

      expect(newService.mode()).toBe('light');
      expect(newService.activePreset()).toBe('ocean');
      expect(newService.customColors().primary).toBe('#custom');
    });
  });
});
