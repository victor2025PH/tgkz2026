/**
 * 動畫配置服務
 * Animation Config Service
 * 
 * 🆕 Phase 24: 動態切換動畫效果
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  fadeAnimation,
  slideAnimation,
  scaleAnimation,
  slideUpAnimation,
  defaultRouteAnimation,
  noAnimation
} from '../animations';
import { AnimationTriggerMetadata } from '@angular/animations';

// ============ 類型定義 ============

export type AnimationType = 'default' | 'fade' | 'slide' | 'scale' | 'slideUp' | 'none';

export interface AnimationOption {
  id: AnimationType;
  name: string;
  description: string;
  preview: string;
}

// ============ 動畫選項配置 ============

export const ANIMATION_OPTIONS: AnimationOption[] = [
  {
    id: 'default',
    name: '推薦',
    description: '淡入 + 微縮放效果，流暢自然',
    preview: '✨'
  },
  {
    id: 'fade',
    name: '淡入淡出',
    description: '簡單的透明度切換',
    preview: '🌫️'
  },
  {
    id: 'slide',
    name: '左右滑動',
    description: '頁面從右側滑入',
    preview: '➡️'
  },
  {
    id: 'slideUp',
    name: '上下滑動',
    description: '頁面從下方滑入',
    preview: '⬆️'
  },
  {
    id: 'scale',
    name: '縮放',
    description: '頁面放大淡入',
    preview: '🔍'
  },
  {
    id: 'none',
    name: '無動畫',
    description: '禁用所有動畫效果',
    preview: '⏹️'
  }
];

// ============ 動畫映射 ============

export const ANIMATION_MAP: Record<AnimationType, AnimationTriggerMetadata> = {
  'default': defaultRouteAnimation,
  'fade': fadeAnimation,
  'slide': slideAnimation,
  'scale': scaleAnimation,
  'slideUp': slideUpAnimation,
  'none': noAnimation
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class AnimationConfigService {
  // 當前動畫類型
  private _animationType = signal<AnimationType>('default');
  
  animationType = this._animationType.asReadonly();
  
  // 當前動畫選項
  currentOption = computed(() => {
    const type = this._animationType();
    return ANIMATION_OPTIONS.find(opt => opt.id === type) || ANIMATION_OPTIONS[0];
  });
  
  // 所有動畫選項
  readonly options = ANIMATION_OPTIONS;
  
  constructor() {
    // 從 localStorage 恢復設置
    this.loadFromStorage();
  }
  
  /**
   * 設置動畫類型
   */
  setAnimationType(type: AnimationType): void {
    this._animationType.set(type);
    this.saveToStorage();
  }
  
  /**
   * 獲取當前動畫
   */
  getAnimation(): AnimationTriggerMetadata {
    return ANIMATION_MAP[this._animationType()];
  }
  
  /**
   * 切換到下一個動畫
   */
  nextAnimation(): void {
    const current = this._animationType();
    const currentIndex = ANIMATION_OPTIONS.findIndex(opt => opt.id === current);
    const nextIndex = (currentIndex + 1) % ANIMATION_OPTIONS.length;
    this.setAnimationType(ANIMATION_OPTIONS[nextIndex].id);
  }
  
  /**
   * 重置為默認動畫
   */
  resetToDefault(): void {
    this.setAnimationType('default');
  }
  
  /**
   * 檢查是否禁用動畫
   */
  isAnimationDisabled(): boolean {
    return this._animationType() === 'none';
  }
  
  // ========== 存儲操作 ==========
  
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem('tg-animation-type');
      if (saved && ANIMATION_OPTIONS.some(opt => opt.id === saved)) {
        this._animationType.set(saved as AnimationType);
      }
    } catch (e) {
      // localStorage 不可用時忽略
    }
  }
  
  private saveToStorage(): void {
    try {
      localStorage.setItem('tg-animation-type', this._animationType());
    } catch (e) {
      // localStorage 不可用時忽略
    }
  }
}
