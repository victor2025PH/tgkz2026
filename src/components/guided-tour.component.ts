/**
 * 引導旅程組件
 * Guided Tour Component
 * 
 * 顯示當前引導步驟的提示框和高亮遮罩
 */

import { Component, inject, signal, effect, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GuidedTourService, TourStep } from '../services/guided-tour.service';

@Component({
  selector: 'app-guided-tour',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (tourService.isActive() && tourService.currentStep()) {
      <!-- 遮罩層 -->
      <div class="fixed inset-0 z-[9998] pointer-events-none">
        <!-- 高亮區域（使用 SVG 遮罩） -->
        @if (tourService.currentStep()?.highlight && highlightRect()) {
          <svg class="absolute inset-0 w-full h-full">
            <defs>
              <mask id="highlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white"/>
                <rect 
                  [attr.x]="highlightRect()!.left - 8"
                  [attr.y]="highlightRect()!.top - 8"
                  [attr.width]="highlightRect()!.width + 16"
                  [attr.height]="highlightRect()!.height + 16"
                  rx="8"
                  fill="black"/>
              </mask>
            </defs>
            <rect 
              x="0" y="0" 
              width="100%" height="100%" 
              fill="rgba(0,0,0,0.7)" 
              mask="url(#highlight-mask)"/>
          </svg>
          
          <!-- 高亮邊框 -->
          <div class="absolute border-2 border-cyan-400 rounded-lg shadow-lg shadow-cyan-500/50 animate-pulse"
               [style.left.px]="highlightRect()!.left - 8"
               [style.top.px]="highlightRect()!.top - 8"
               [style.width.px]="highlightRect()!.width + 16"
               [style.height.px]="highlightRect()!.height + 16">
          </div>
        } @else {
          <!-- 無高亮時的半透明遮罩 -->
          <div class="absolute inset-0 bg-black/60"></div>
        }
      </div>
      
      <!-- 提示框 -->
      <div class="fixed z-[9999] pointer-events-auto animate-fade-in-up"
           [style.top.px]="tooltipPosition().top"
           [style.left.px]="tooltipPosition().left"
           [style.max-width.px]="320">
        <div class="bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-500/20 overflow-hidden">
          <!-- 頭部 -->
          <div class="px-5 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ tourService.currentTour()?.icon }}</span>
                <span class="text-sm text-slate-400">{{ tourService.currentTour()?.name }}</span>
              </div>
              <button (click)="tourService.exitTour()" 
                      class="text-slate-400 hover:text-white transition-colors">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容 -->
          <div class="p-5">
            <h3 class="text-lg font-bold text-white mb-2">
              {{ tourService.currentStep()?.title }}
            </h3>
            <p class="text-slate-300 text-sm leading-relaxed mb-4">
              {{ tourService.currentStep()?.content }}
            </p>
            
            <!-- 進度指示器 -->
            <div class="flex items-center gap-2 mb-4">
              @for (step of tourService.currentTour()?.steps; track step.id; let i = $index) {
                <div class="h-1.5 flex-1 rounded-full transition-all duration-300"
                     [class.bg-cyan-500]="i <= tourService.currentStepIndex()"
                     [class.bg-slate-700]="i > tourService.currentStepIndex()">
                </div>
              }
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex items-center justify-between">
              <div class="text-xs text-slate-500">
                步驟 {{ tourService.currentStepIndex() + 1 }}/{{ tourService.currentTour()?.steps?.length }}
              </div>
              
              <div class="flex items-center gap-2">
                @if (!tourService.isFirstStep()) {
                  <button (click)="tourService.prevStep()"
                          class="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                    ← 上一步
                  </button>
                }
                
                @if (tourService.currentStep()?.allowSkip) {
                  <button (click)="tourService.skipStep()"
                          class="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                    跳過
                  </button>
                }
                
                <button (click)="handleNext()"
                        class="px-4 py-1.5 text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all font-medium">
                  {{ tourService.isLastStep() ? '完成 ✓' : '下一步 →' }}
                </button>
              </div>
            </div>
          </div>
          
          <!-- 箭頭指向（根據位置） -->
          @if (tourService.currentStep()?.highlight && tourService.currentStep()?.placement !== 'center') {
            <div class="absolute w-4 h-4 bg-slate-900 border-cyan-500/50 transform rotate-45"
                 [class.border-l]="tourService.currentStep()?.placement === 'right'"
                 [class.border-b]="tourService.currentStep()?.placement === 'right'"
                 [class.-left-2]="tourService.currentStep()?.placement === 'right'"
                 [class.top-1/2]="tourService.currentStep()?.placement === 'right' || tourService.currentStep()?.placement === 'left'"
                 [class.-translate-y-1/2]="tourService.currentStep()?.placement === 'right' || tourService.currentStep()?.placement === 'left'"
                 [class.border-r]="tourService.currentStep()?.placement === 'left'"
                 [class.border-t]="tourService.currentStep()?.placement === 'left'"
                 [class.-right-2]="tourService.currentStep()?.placement === 'left'"
                 [class.border-t-2]="tourService.currentStep()?.placement === 'bottom'"
                 [class.border-l-2]="tourService.currentStep()?.placement === 'bottom'"
                 [class.-top-2]="tourService.currentStep()?.placement === 'bottom'"
                 [class.left-1/2]="tourService.currentStep()?.placement === 'bottom' || tourService.currentStep()?.placement === 'top'"
                 [class.-translate-x-1/2]="tourService.currentStep()?.placement === 'bottom' || tourService.currentStep()?.placement === 'top'"
                 [class.border-b-2]="tourService.currentStep()?.placement === 'top'"
                 [class.border-r-2]="tourService.currentStep()?.placement === 'top'"
                 [class.-bottom-2]="tourService.currentStep()?.placement === 'top'">
            </div>
          }
        </div>
      </div>
      
      <!-- 快捷鍵提示 -->
      <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] text-xs text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-full">
        按 <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">ESC</kbd> 退出引導 · 
        <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">→</kbd> 下一步 · 
        <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">←</kbd> 上一步
      </div>
    }
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
    }
    
    .animate-fade-in-up {
      animation: fadeInUp 0.3s ease-out;
    }
    
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class GuidedTourComponent implements OnDestroy {
  tourService = inject(GuidedTourService);
  
  highlightRect = signal<DOMRect | null>(null);
  tooltipPosition = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  
  private resizeObserver?: ResizeObserver;
  private updateInterval?: number;
  
  constructor() {
    // 監聽步驟變化，更新位置
    effect(() => {
      const step = this.tourService.currentStep();
      if (step) {
        this.updatePositions(step);
        
        // 滾動到目標
        if (step.target && step.target !== 'body') {
          this.tourService.scrollToTarget(step.target);
        }
      }
    });
    
    // 定期更新位置（處理滾動和調整大小）
    this.updateInterval = window.setInterval(() => {
      const step = this.tourService.currentStep();
      if (step && this.tourService.isActive()) {
        this.updatePositions(step);
      }
    }, 200);
  }
  
  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
  
  /**
   * 鍵盤事件處理
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (!this.tourService.isActive()) return;
    
    switch (event.key) {
      case 'Escape':
        this.tourService.exitTour();
        break;
      case 'ArrowRight':
      case 'Enter':
        this.handleNext();
        break;
      case 'ArrowLeft':
        this.tourService.prevStep();
        break;
    }
  }
  
  /**
   * 更新位置
   */
  private updatePositions(step: TourStep) {
    // 獲取目標元素位置
    if (step.target && step.target !== 'body' && step.highlight) {
      const rect = this.tourService.getTargetRect(step.target);
      this.highlightRect.set(rect);
      
      if (rect) {
        const pos = this.tourService.getTooltipPosition(rect, step.placement);
        // 確保不超出視窗
        this.tooltipPosition.set({
          top: Math.max(16, Math.min(pos.top, window.innerHeight - 220)),
          left: Math.max(16, Math.min(pos.left, window.innerWidth - 336))
        });
      }
    } else {
      this.highlightRect.set(null);
      // 居中顯示
      this.tooltipPosition.set({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160
      });
    }
  }
  
  /**
   * 處理下一步
   */
  handleNext() {
    const step = this.tourService.currentStep();
    
    // 如果有導航動作
    if (step?.action === 'navigate' && step.actionTarget) {
      // 觸發導航事件（需要父組件處理）
      const event = new CustomEvent('tour-navigate', { 
        detail: { target: step.actionTarget } 
      });
      window.dispatchEvent(event);
    }
    
    this.tourService.nextStep();
  }
}
