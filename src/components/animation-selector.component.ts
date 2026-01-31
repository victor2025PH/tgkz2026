/**
 * 動畫選擇器組件
 * Animation Selector Component
 * 
 * 🆕 Phase 25: 在設置頁面添加動畫選擇 UI
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimationConfigService, AnimationType, ANIMATION_OPTIONS } from '../services/animation-config.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-animation-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animation-selector">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <span class="text-xl">✨</span>
          <h3 class="text-lg font-semibold text-white">頁面切換動畫</h3>
        </div>
        <button 
          (click)="resetToDefault()"
          class="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
          重置默認
        </button>
      </div>
      
      <p class="text-sm text-slate-400 mb-4">
        選擇頁面切換時的動畫效果，讓您的操作體驗更加流暢。
      </p>
      
      <!-- 動畫選項網格 -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        @for (option of options; track option.id) {
          <button
            (click)="selectAnimation(option.id)"
            class="animation-option group"
            [class.active]="currentType() === option.id"
            (mouseenter)="previewAnimation(option.id)"
            (mouseleave)="stopPreview()">
            
            <!-- 預覽圖標 -->
            <div class="preview-icon" [class.animating]="previewingType() === option.id">
              <span class="text-2xl">{{ option.preview }}</span>
            </div>
            
            <!-- 選項信息 -->
            <div class="option-info">
              <span class="option-name">{{ option.name }}</span>
              <span class="option-desc">{{ option.description }}</span>
            </div>
            
            <!-- 選中指示器 -->
            @if (currentType() === option.id) {
              <div class="selected-badge">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </div>
            }
          </button>
        }
      </div>
      
      <!-- 當前動畫預覽 -->
      <div class="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm text-slate-400">當前效果預覽</span>
          <button 
            (click)="triggerPreview()"
            class="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors">
            播放預覽
          </button>
        </div>
        
        <div class="preview-container" [class.animate]="isPlaying()">
          <div class="preview-page from">
            <div class="page-icon">📋</div>
            <span>舊頁面</span>
          </div>
          <div class="preview-page to" [attr.data-animation]="currentType()">
            <div class="page-icon">📄</div>
            <span>新頁面</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animation-selector {
      padding: 1rem;
    }
    
    .animation-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      border-radius: 0.75rem;
      background: rgba(30, 41, 59, 0.5);
      border: 2px solid transparent;
      transition: all 0.2s ease;
      cursor: pointer;
      position: relative;
    }
    
    .animation-option:hover {
      background: rgba(30, 41, 59, 0.8);
      border-color: rgba(6, 182, 212, 0.3);
    }
    
    .animation-option.active {
      background: rgba(6, 182, 212, 0.1);
      border-color: rgb(6, 182, 212);
    }
    
    .preview-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.5rem;
      transition: transform 0.3s ease;
    }
    
    .preview-icon.animating {
      animation: bounce 0.5s ease infinite;
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    
    .option-info {
      text-align: center;
    }
    
    .option-name {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
      margin-bottom: 0.25rem;
    }
    
    .option-desc {
      display: block;
      font-size: 0.75rem;
      color: rgb(148, 163, 184);
    }
    
    .selected-badge {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgb(6, 182, 212);
      color: white;
    }
    
    .preview-container {
      position: relative;
      height: 80px;
      background: rgba(15, 23, 42, 0.5);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    
    .preview-page {
      position: absolute;
      inset: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(30, 41, 59, 0.8);
      border-radius: 0.375rem;
      color: white;
      font-size: 0.75rem;
    }
    
    .preview-page.from {
      z-index: 1;
    }
    
    .preview-page.to {
      z-index: 2;
      opacity: 0;
    }
    
    .page-icon {
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }
    
    .preview-container.animate .preview-page.from {
      animation: page-out 0.6s ease forwards;
    }
    
    .preview-container.animate .preview-page.to {
      animation: page-in 0.6s ease forwards;
    }
    
    @keyframes page-out {
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }
    
    @keyframes page-in {
      from {
        opacity: 0;
        transform: scale(1.05);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    
    .preview-page.to[data-animation="fade"] {
      animation-name: fade-in;
    }
    
    .preview-page.to[data-animation="slide"] {
      animation-name: slide-in;
    }
    
    .preview-page.to[data-animation="slideUp"] {
      animation-name: slide-up-in;
    }
    
    .preview-page.to[data-animation="scale"] {
      animation-name: scale-in;
    }
    
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes slide-up-in {
      from { opacity: 0; transform: translateY(100%); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scale-in {
      from { opacity: 0; transform: scale(0.5); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class AnimationSelectorComponent {
  private animationConfig = inject(AnimationConfigService);
  private toast = inject(ToastService);
  
  // 動畫選項
  options = ANIMATION_OPTIONS;
  
  // 狀態
  currentType = this.animationConfig.animationType;
  previewingType = signal<AnimationType | null>(null);
  isPlaying = signal(false);
  
  selectAnimation(type: AnimationType): void {
    this.animationConfig.setAnimationType(type);
    this.toast.success(`已切換為「${this.options.find(o => o.id === type)?.name}」動畫`);
  }
  
  previewAnimation(type: AnimationType): void {
    this.previewingType.set(type);
  }
  
  stopPreview(): void {
    this.previewingType.set(null);
  }
  
  resetToDefault(): void {
    this.animationConfig.resetToDefault();
    this.toast.info('已重置為默認動畫');
  }
  
  triggerPreview(): void {
    this.isPlaying.set(true);
    setTimeout(() => this.isPlaying.set(false), 700);
  }
}
