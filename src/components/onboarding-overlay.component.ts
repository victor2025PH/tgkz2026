/**
 * 新手引導覆蓋層組件
 * Onboarding Overlay Component
 * 
 * 🆕 體驗優化: 新手引導系統
 */

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../services/onboarding.service';

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (service.isActive() && currentStep()) {
      <!-- 背景遮罩 -->
      <div class="fixed inset-0 z-[9998]">
        <div class="absolute inset-0 bg-black/60"></div>
      </div>
      
      <!-- 引導卡片 -->
      <div class="fixed z-[9999] transition-all duration-300"
           [style]="getPositionStyle()">
        <div class="bg-slate-900 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 max-w-md overflow-hidden">
          
          <!-- 進度條 -->
          <div class="h-1 bg-slate-800">
            <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                 [style.width.%]="service.progressPercent()"></div>
          </div>
          
          <!-- 內容 -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-bold text-white">{{ currentStep()!.title }}</h3>
              <span class="text-xs text-slate-500">
                {{ service.currentStepIndex() + 1 }} / {{ service.totalSteps() }}
              </span>
            </div>
            
            <p class="text-slate-300 text-sm whitespace-pre-line mb-6">
              {{ currentStep()!.description }}
            </p>
            
            <!-- 操作按鈕 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                @if (service.currentStepIndex() > 0) {
                  <button (click)="service.prevStep()"
                          class="px-3 py-1.5 text-slate-400 hover:text-white text-sm transition-colors">
                    ← 上一步
                  </button>
                }
                
                @if (currentStep()!.skipable || isFirstStep()) {
                  <button (click)="service.skipTour()"
                          class="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors">
                    跳過
                  </button>
                }
              </div>
              
              <button (click)="service.nextStep()"
                      class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-all text-sm">
                {{ currentStep()!.actionLabel || (isLastStep() ? '完成' : '下一步') }}
              </button>
            </div>
          </div>
          
          <!-- 步驟指示器 -->
          <div class="px-6 pb-4 flex justify-center gap-1.5">
            @for (step of tour()?.steps || []; track step.id; let i = $index) {
              <button (click)="service.goToStep(i)"
                      class="w-2 h-2 rounded-full transition-all"
                      [class.bg-purple-500]="i === service.currentStepIndex()"
                      [class.w-4]="i === service.currentStepIndex()"
                      [class.bg-slate-600]="i !== service.currentStepIndex()">
              </button>
            }
          </div>
        </div>
        
        <!-- 箭頭指示器 -->
        @if (currentStep()!.target && currentStep()!.position !== 'center') {
          <div class="arrow absolute w-4 h-4 bg-slate-900 border border-purple-500/30 transform rotate-45"
               [class.arrow-top]="currentStep()!.position === 'bottom'"
               [class.arrow-bottom]="currentStep()!.position === 'top'"
               [class.arrow-left]="currentStep()!.position === 'right'"
               [class.arrow-right]="currentStep()!.position === 'left'">
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .arrow-top {
      top: -8px;
      left: 50%;
      margin-left: -8px;
      border-right: none;
      border-bottom: none;
    }
    
    .arrow-bottom {
      bottom: -8px;
      left: 50%;
      margin-left: -8px;
      border-left: none;
      border-top: none;
    }
    
    .arrow-left {
      left: -8px;
      top: 50%;
      margin-top: -8px;
      border-right: none;
      border-top: none;
    }
    
    .arrow-right {
      right: -8px;
      top: 50%;
      margin-top: -8px;
      border-left: none;
      border-bottom: none;
    }
    
    :host {
      position: relative;
      z-index: 9999;
    }
  `]
})
export class OnboardingOverlayComponent {
  service = inject(OnboardingService);
  
  tour = computed(() => this.service.currentTour());
  currentStep = computed(() => this.service.currentStep());
  
  isFirstStep = computed(() => this.service.currentStepIndex() === 0);
  isLastStep = computed(() => this.service.currentStepIndex() === this.service.totalSteps() - 1);
  
  getPositionStyle(): string {
    const step = this.currentStep();
    if (!step) return '';
    
    if (step.position === 'center' || !step.target) {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }
    
    const target = document.querySelector(step.target);
    if (!target) {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }
    
    const rect = target.getBoundingClientRect();
    const padding = 16;
    
    switch (step.position) {
      case 'bottom':
        return `top: ${rect.bottom + padding}px; left: ${rect.left + rect.width / 2}px; transform: translateX(-50%);`;
      case 'top':
        return `bottom: ${window.innerHeight - rect.top + padding}px; left: ${rect.left + rect.width / 2}px; transform: translateX(-50%);`;
      case 'left':
        return `top: ${rect.top + rect.height / 2}px; right: ${window.innerWidth - rect.left + padding}px; transform: translateY(-50%);`;
      case 'right':
        return `top: ${rect.top + rect.height / 2}px; left: ${rect.right + padding}px; transform: translateY(-50%);`;
      default:
        return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }
  }
}
