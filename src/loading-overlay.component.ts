/**
 * Loading Overlay Component
 * 全局加載遮罩組件
 */
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from './loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(loadingService.isLoading()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center animate-fade-in">
        <div class="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 max-w-sm w-full mx-4">
          <!-- Spinner 模式 -->
          @if(!hasProgress()) {
            <div class="flex flex-col items-center">
              <div class="relative w-16 h-16 mb-4">
                <!-- 外圈 -->
                <div class="absolute inset-0 border-4 border-slate-600 rounded-full"></div>
                <!-- 旋轉圈 -->
                <div class="absolute inset-0 border-4 border-transparent border-t-cyan-500 rounded-full animate-spin"></div>
                <!-- 內圈 -->
                <div class="absolute inset-2 border-4 border-transparent border-b-purple-500 rounded-full animate-spin" 
                     style="animation-direction: reverse; animation-duration: 0.8s;"></div>
              </div>
              <p class="text-white text-lg font-medium text-center">{{ message() }}</p>
              @if(taskCount() > 1) {
                <p class="text-slate-400 text-sm mt-2">{{ taskCount() }} 個任務進行中...</p>
              }
            </div>
          }
          
          <!-- Progress 模式 -->
          @if(hasProgress()) {
            <div class="flex flex-col items-center">
              <div class="w-full mb-4">
                <div class="flex justify-between text-sm text-slate-400 mb-2">
                  <span>{{ message() }}</span>
                  <span>{{ progress() }}%</span>
                </div>
                <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                       [style.width.%]="progress()">
                  </div>
                </div>
              </div>
              <p class="text-slate-400 text-sm">請稍候...</p>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    :host {
      display: contents;
    }
    .animate-fade-in {
      animation: fadeIn 0.2s ease-out;
    }
  `]
})
export class LoadingOverlayComponent {
  loadingService = inject(LoadingService);
  
  message = computed(() => this.loadingService.message() || '載入中...');
  progress = computed(() => this.loadingService.progress() || 0);
  hasProgress = computed(() => this.loadingService.progress() !== undefined);
  taskCount = computed(() => this.loadingService.taskCount());
}

/**
 * Skeleton Loader Component
 * 骨架屏組件
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-pulse">
      @switch(type) {
        @case('text') {
          <div class="h-4 bg-slate-700 rounded" [style.width]="width"></div>
        }
        @case('title') {
          <div class="h-6 bg-slate-700 rounded w-3/4"></div>
        }
        @case('avatar') {
          <div class="w-12 h-12 bg-slate-700 rounded-full"></div>
        }
        @case('card') {
          <div class="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 bg-slate-700 rounded-full"></div>
              <div class="flex-1">
                <div class="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                <div class="h-3 bg-slate-700 rounded w-1/3"></div>
              </div>
            </div>
            <div class="space-y-2">
              <div class="h-3 bg-slate-700 rounded w-full"></div>
              <div class="h-3 bg-slate-700 rounded w-5/6"></div>
              <div class="h-3 bg-slate-700 rounded w-4/6"></div>
            </div>
          </div>
        }
        @case('table-row') {
          <div class="flex items-center gap-4 py-3">
            <div class="w-8 h-8 bg-slate-700 rounded"></div>
            <div class="flex-1 h-4 bg-slate-700 rounded"></div>
            <div class="w-20 h-4 bg-slate-700 rounded"></div>
            <div class="w-16 h-4 bg-slate-700 rounded"></div>
          </div>
        }
        @case('chart') {
          <div class="h-48 bg-slate-700 rounded-xl"></div>
        }
        @default {
          <div class="h-4 bg-slate-700 rounded" [style.width]="width"></div>
        }
      }
    </div>
  `
})
export class SkeletonComponent {
  type: 'text' | 'title' | 'avatar' | 'card' | 'table-row' | 'chart' = 'text';
  width = '100%';
}

/**
 * Button Loading Component
 * 按鈕加載狀態
 */
@Component({
  selector: 'app-button-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button [disabled]="loading || disabled"
            [class]="buttonClass"
            class="relative overflow-hidden transition-all">
      @if(loading) {
        <span class="absolute inset-0 flex items-center justify-center bg-inherit">
          <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </span>
        <span class="invisible"><ng-content></ng-content></span>
      } @else {
        <ng-content></ng-content>
      }
    </button>
  `
})
export class ButtonLoadingComponent {
  loading = false;
  disabled = false;
  buttonClass = 'px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed';
}
