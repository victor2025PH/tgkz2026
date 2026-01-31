/**
 * 主題切換器組件
 * Theme Switcher Component
 * 
 * 🆕 體驗優化: 主題切換功能
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, ThemeMode } from '../services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="theme-switcher relative">
      <!-- 切換按鈕 -->
      <button (click)="toggleMenu()"
              class="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              [title]="themeService.isDark() ? '暗色模式' : '亮色模式'">
        <span class="text-lg">{{ themeService.isDark() ? '🌙' : '☀️' }}</span>
        <span class="text-sm text-slate-300 hidden sm:inline">
          {{ getModeLabel(themeService.mode()) }}
        </span>
      </button>
      
      <!-- 下拉菜單 -->
      @if (isMenuOpen()) {
        <div class="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden z-50">
          <!-- 模式選擇 -->
          <div class="p-3 border-b border-slate-700/50">
            <div class="text-xs text-slate-500 uppercase tracking-wide mb-2">主題模式</div>
            <div class="grid grid-cols-3 gap-2">
              @for (mode of modes; track mode.value) {
                <button (click)="setMode(mode.value)"
                        class="flex flex-col items-center gap-1 p-2 rounded-lg transition-all"
                        [class.bg-purple-500/20]="themeService.mode() === mode.value"
                        [class.text-purple-400]="themeService.mode() === mode.value"
                        [class.bg-slate-800]="themeService.mode() !== mode.value"
                        [class.text-slate-400]="themeService.mode() !== mode.value">
                  <span class="text-lg">{{ mode.icon }}</span>
                  <span class="text-xs">{{ mode.label }}</span>
                </button>
              }
            </div>
          </div>
          
          <!-- 預設主題 -->
          <div class="p-3">
            <div class="text-xs text-slate-500 uppercase tracking-wide mb-2">主題配色</div>
            <div class="grid grid-cols-2 gap-2">
              @for (preset of themeService.presets(); track preset.id) {
                <button (click)="applyPreset(preset.id)"
                        class="flex items-center gap-2 p-2 rounded-lg transition-all text-left"
                        [class.bg-purple-500/20]="themeService.activePreset() === preset.id"
                        [class.ring-1]="themeService.activePreset() === preset.id"
                        [class.ring-purple-500]="themeService.activePreset() === preset.id"
                        [class.bg-slate-800]="themeService.activePreset() !== preset.id">
                  <div class="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center"
                       [style.background]="preset.colors.primary || (preset.mode === 'dark' ? '#8b5cf6' : '#7c3aed')">
                    @if (themeService.activePreset() === preset.id) {
                      <span class="text-white text-xs">✓</span>
                    }
                  </div>
                  <span class="text-xs"
                        [class.text-white]="themeService.activePreset() === preset.id"
                        [class.text-slate-400]="themeService.activePreset() !== preset.id">
                    {{ preset.name }}
                  </span>
                </button>
              }
            </div>
          </div>
          
          <!-- 自定義顏色 -->
          <div class="p-3 border-t border-slate-700/50">
            <button (click)="showColorPicker = !showColorPicker"
                    class="w-full flex items-center justify-between text-sm text-slate-400 hover:text-white transition-colors">
              <span>自定義顏色</span>
              <span>{{ showColorPicker ? '▲' : '▼' }}</span>
            </button>
            
            @if (showColorPicker) {
              <div class="mt-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">主色調</span>
                  <input type="color"
                         [value]="themeService.currentColors().primary"
                         (change)="setColor('primary', $any($event.target).value)"
                         class="w-8 h-6 rounded cursor-pointer">
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">次要色</span>
                  <input type="color"
                         [value]="themeService.currentColors().secondary"
                         (change)="setColor('secondary', $any($event.target).value)"
                         class="w-8 h-6 rounded cursor-pointer">
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-slate-500">強調色</span>
                  <input type="color"
                         [value]="themeService.currentColors().accent"
                         (change)="setColor('accent', $any($event.target).value)"
                         class="w-8 h-6 rounded cursor-pointer">
                </div>
                
                <button (click)="themeService.resetCustomColors()"
                        class="w-full mt-2 px-3 py-1.5 bg-slate-800 text-slate-400 text-xs rounded hover:bg-slate-700 transition-colors">
                  重置自定義顏色
                </button>
              </div>
            }
          </div>
        </div>
        
        <!-- 點擊外部關閉 -->
        <div class="fixed inset-0 z-40" (click)="closeMenu()"></div>
      }
    </div>
  `
})
export class ThemeSwitcherComponent {
  themeService = inject(ThemeService);
  
  isMenuOpen = signal(false);
  showColorPicker = false;
  
  modes: { value: ThemeMode; icon: string; label: string }[] = [
    { value: 'light', icon: '☀️', label: '亮色' },
    { value: 'dark', icon: '🌙', label: '暗色' },
    { value: 'system', icon: '💻', label: '系統' }
  ];
  
  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }
  
  closeMenu(): void {
    this.isMenuOpen.set(false);
  }
  
  setMode(mode: ThemeMode): void {
    this.themeService.setMode(mode);
  }
  
  applyPreset(presetId: string): void {
    this.themeService.applyPreset(presetId);
    this.closeMenu();
  }
  
  setColor(key: 'primary' | 'secondary' | 'accent', value: string): void {
    this.themeService.setCustomColor(key, value);
  }
  
  getModeLabel(mode: ThemeMode): string {
    const labels: Record<ThemeMode, string> = {
      dark: '暗色',
      light: '亮色',
      system: '系統'
    };
    return labels[mode];
  }
}
