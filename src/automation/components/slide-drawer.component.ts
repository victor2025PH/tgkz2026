/**
 * 通用側邊抽屜組件
 * Slide Drawer Component
 * 
 * 功能:
 * 1. 從右側滑入的抽屜面板
 * 2. 半透明遮罩背景
 * 3. 支持 Esc 關閉
 * 4. 點擊遮罩關閉
 * 5. 平滑動畫效果
 * 6. 未保存提醒
 */

import { Component, input, output, signal, computed, HostListener, effect, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-slide-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex justify-end"
           (keydown.escape)="onEscapeKey()">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
             [class.opacity-100]="isAnimating()"
             [class.opacity-0]="!isAnimating()"
             (click)="onOverlayClick()">
        </div>
        
        <!-- 抽屜面板 -->
        <div class="relative h-full bg-slate-900 border-l border-slate-700/50 shadow-2xl 
                    flex flex-col transform transition-transform duration-300 ease-out"
             [class.translate-x-0]="isAnimating()"
             [class.translate-x-full]="!isAnimating()"
             [style.width]="drawerWidth()">
          
          <!-- 頂部標題欄 -->
          <div class="flex items-center justify-between p-4 border-b border-slate-700/50 bg-slate-800/50">
            <div class="flex items-center gap-3">
              @if (icon()) {
                <span class="text-2xl">{{ icon() }}</span>
              }
              <div>
                <h2 class="text-lg font-semibold text-white">{{ title() }}</h2>
                @if (subtitle()) {
                  <p class="text-sm text-slate-400">{{ subtitle() }}</p>
                }
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <!-- 自定義頂部操作 -->
              <ng-content select="[drawer-header-actions]"></ng-content>
              
              <!-- 關閉按鈕 -->
              <button (click)="onCloseClick()"
                      class="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="關閉 (Esc)">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容區 -->
          <div class="flex-1 overflow-y-auto">
            <ng-content></ng-content>
          </div>
          
          <!-- 底部操作欄 -->
          @if (showFooter()) {
            <div class="p-4 border-t border-slate-700/50 bg-slate-800/50">
              <ng-content select="[drawer-footer]"></ng-content>
            </div>
          }
        </div>
      </div>
    }
    
    <!-- 未保存確認對話框 -->
    @if (showUnsavedDialog()) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60" (click)="cancelClose()"></div>
        <div class="relative bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-6 max-w-sm w-full">
          <div class="text-center mb-4">
            <span class="text-4xl">⚠️</span>
          </div>
          <h3 class="text-lg font-semibold text-white text-center mb-2">有未保存的更改</h3>
          <p class="text-sm text-slate-400 text-center mb-6">
            您有尚未保存的更改，確定要離開嗎？
          </p>
          <div class="flex gap-3">
            <button (click)="cancelClose()"
                    class="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              繼續編輯
            </button>
            <button (click)="confirmClose()"
                    class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg transition-colors">
              放棄更改
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class SlideDrawerComponent implements OnChanges {
  // 輸入
  isOpen = input(false);
  title = input('');
  subtitle = input('');
  icon = input('');
  size = input<DrawerSize>('md');
  showFooter = input(true);
  hasUnsavedChanges = input(false);
  
  // 輸出
  close = output<void>();
  
  // 狀態
  isAnimating = signal(false);
  showUnsavedDialog = signal(false);
  private pendingClose = false;
  
  // 計算抽屜寬度
  drawerWidth = computed(() => {
    switch (this.size()) {
      case 'sm': return '360px';
      case 'md': return '480px';
      case 'lg': return '600px';
      case 'xl': return '800px';
      default: return '480px';
    }
  });
  
  // 使用 effect 監聽 isOpen 變化 (在類字段初始化器中調用，處於注入上下文)
  private openEffect = effect(() => {
    const open = this.isOpen();
    if (open) {
      // 打開時，延遲一幀後開始動畫
      requestAnimationFrame(() => {
        this.isAnimating.set(true);
      });
    } else {
      this.isAnimating.set(false);
    }
  });
  
  ngOnChanges(changes: SimpleChanges) {
    // 備用：確保動畫狀態正確
    if (this.isOpen()) {
      requestAnimationFrame(() => {
        this.isAnimating.set(true);
      });
    } else {
      this.isAnimating.set(false);
    }
  }
  
  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.isOpen()) {
      this.onCloseClick();
    }
  }
  
  onOverlayClick() {
    this.onCloseClick();
  }
  
  onCloseClick() {
    if (this.hasUnsavedChanges()) {
      this.showUnsavedDialog.set(true);
      this.pendingClose = true;
    } else {
      this.performClose();
    }
  }
  
  cancelClose() {
    this.showUnsavedDialog.set(false);
    this.pendingClose = false;
  }
  
  confirmClose() {
    this.showUnsavedDialog.set(false);
    this.performClose();
  }
  
  private performClose() {
    this.isAnimating.set(false);
    // 等待動畫完成後再關閉
    setTimeout(() => {
      this.close.emit();
    }, 300);
  }
}
