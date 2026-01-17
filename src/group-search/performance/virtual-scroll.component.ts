/**
 * TG-AI智控王 虛擬滾動組件
 * Virtual Scroll Component v1.0
 * 
 * 💡 設計思考：
 * 1. 使用 Content Projection 支持任意模板
 * 2. 提供多種預設列表樣式
 * 3. 自動測量容器尺寸
 * 4. 支持鍵盤導航
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualScrollService, VirtualScrollController, VirtualScrollConfig } from './virtual-scroll.service';

@Component({
  selector: 'app-virtual-scroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      #container
      class="virtual-scroll-container"
      [style.height.px]="containerHeight"
      (scroll)="onScroll($event)">
      
      <!-- 總高度佔位 -->
      <div 
        class="virtual-scroll-spacer"
        [style.height.px]="controller?.totalHeight()">
      </div>
      
      <!-- 可見內容 -->
      <div 
        class="virtual-scroll-content"
        [style.transform]="'translateY(' + (controller?.offsetTop() || 0) + 'px)'">
        
        <!-- 渲染可見項目 -->
        <ng-container *ngFor="let item of controller?.visibleItems(); let i = index; trackBy: trackByFn">
          <div 
            class="virtual-scroll-item"
            [class.selected]="selectedIndex === (controller?.visibleRange()?.start || 0) + i"
            (click)="onItemClick(item, (controller?.visibleRange()?.start || 0) + i)">
            
            <!-- 自定義模板 -->
            <ng-container *ngIf="itemTemplate; else defaultTemplate">
              <ng-container *ngTemplateOutlet="itemTemplate; context: { 
                $implicit: item, 
                index: (controller?.visibleRange()?.start || 0) + i,
                selected: selectedIndex === (controller?.visibleRange()?.start || 0) + i
              }"></ng-container>
            </ng-container>
            
            <!-- 默認模板 -->
            <ng-template #defaultTemplate>
              <div class="default-item">
                {{ item | json }}
              </div>
            </ng-template>
          </div>
        </ng-container>
        
        <!-- 加載更多指示器 -->
        <div class="loading-more" *ngIf="controller?.isLoadingMore()">
          <div class="loading-spinner"></div>
          <span>加載中...</span>
        </div>
        
        <!-- 沒有更多數據 -->
        <div class="no-more" *ngIf="!controller?.hasMore() && showNoMoreHint">
          <span>{{ noMoreText }}</span>
        </div>
      </div>
      
      <!-- 空狀態 -->
      <div class="empty-state" *ngIf="controller?.totalCount() === 0 && !loading">
        <ng-container *ngIf="emptyTemplate; else defaultEmpty">
          <ng-container *ngTemplateOutlet="emptyTemplate"></ng-container>
        </ng-container>
        <ng-template #defaultEmpty>
          <div class="default-empty">
            <span class="empty-icon">📭</span>
            <p>{{ emptyText }}</p>
          </div>
        </ng-template>
      </div>
      
      <!-- 初始加載 -->
      <div class="initial-loading" *ngIf="loading">
        <div class="loading-spinner large"></div>
        <span>{{ loadingText }}</span>
      </div>
    </div>
    
    <!-- 滾動到頂部按鈕 -->
    <button 
      class="scroll-to-top"
      *ngIf="showScrollToTop && (controller?.scrollTop() || 0) > 300"
      (click)="scrollToTop()">
      ↑
    </button>
    
    <!-- 統計信息 -->
    <div class="scroll-info" *ngIf="showStats">
      <span>{{ controller?.visibleRange()?.start || 0 }}-{{ controller?.visibleRange()?.end || 0 }}</span>
      <span>/</span>
      <span>{{ controller?.totalCount() || 0 }}</span>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      position: relative;
    }
    
    .virtual-scroll-container {
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
      will-change: scroll-position;
      
      /* 優化滾動性能 */
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }
    
    /* 自定義滾動條 */
    .virtual-scroll-container::-webkit-scrollbar {
      width: 8px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-track {
      background: var(--tgai-bg-tertiary, #f1f5f9);
      border-radius: 4px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-thumb {
      background: var(--tgai-border-medium, #cbd5e1);
      border-radius: 4px;
    }
    
    .virtual-scroll-container::-webkit-scrollbar-thumb:hover {
      background: var(--tgai-border-dark, #94a3b8);
    }
    
    .virtual-scroll-spacer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      pointer-events: none;
    }
    
    .virtual-scroll-content {
      position: relative;
      will-change: transform;
    }
    
    .virtual-scroll-item {
      transition: background-color 0.15s ease;
    }
    
    .virtual-scroll-item:hover {
      background: var(--tgai-bg-tertiary, #f1f5f9);
    }
    
    .virtual-scroll-item.selected {
      background: var(--tgai-primary-50, #eef2ff);
    }
    
    .default-item {
      padding: 12px 16px;
      border-bottom: 1px solid var(--tgai-border-light, #e2e8f0);
      font-size: 14px;
    }
    
    /* 加載更多 */
    .loading-more, .no-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 20px;
      color: var(--tgai-text-secondary, #64748b);
      font-size: 14px;
    }
    
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--tgai-border-light, #e2e8f0);
      border-top-color: var(--tgai-primary, #6366f1);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    .loading-spinner.large {
      width: 32px;
      height: 32px;
      border-width: 3px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* 空狀態 */
    .empty-state, .initial-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: var(--tgai-text-secondary, #64748b);
    }
    
    .default-empty {
      text-align: center;
    }
    
    .empty-icon {
      font-size: 48px;
      opacity: 0.5;
    }
    
    /* 滾動到頂部 */
    .scroll-to-top {
      position: absolute;
      right: 20px;
      bottom: 20px;
      width: 40px;
      height: 40px;
      background: var(--tgai-primary, #6366f1);
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s ease;
      z-index: 10;
    }
    
    .scroll-to-top:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    
    /* 統計信息 */
    .scroll-info {
      position: absolute;
      left: 50%;
      bottom: 10px;
      transform: translateX(-50%);
      padding: 4px 12px;
      background: rgba(0,0,0,0.6);
      color: white;
      font-size: 12px;
      border-radius: 12px;
      pointer-events: none;
    }
  `]
})
export class VirtualScrollComponent<T> implements AfterViewInit, OnDestroy, OnChanges {
  private virtualScrollService = inject(VirtualScrollService);
  
  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;
  
  // === 輸入 ===
  
  /** 數據源 */
  @Input() items: T[] = [];
  
  /** 容器高度 */
  @Input() containerHeight = 500;
  
  /** 項目高度 */
  @Input() itemHeight = 60;
  
  /** 是否動態高度 */
  @Input() dynamicHeight = false;
  
  /** 緩衝區大小 */
  @Input() bufferSize = 5;
  
  /** 是否啟用無限滾動 */
  @Input() infiniteScroll = false;
  
  /** 加載更多閾值 */
  @Input() loadMoreThreshold = 200;
  
  /** 是否正在初始加載 */
  @Input() loading = false;
  
  /** 加載文字 */
  @Input() loadingText = '加載中...';
  
  /** 空狀態文字 */
  @Input() emptyText = '暫無數據';
  
  /** 沒有更多文字 */
  @Input() noMoreText = '已經到底了';
  
  /** 是否顯示沒有更多提示 */
  @Input() showNoMoreHint = true;
  
  /** 是否顯示滾動到頂部按鈕 */
  @Input() showScrollToTop = true;
  
  /** 是否顯示統計信息 */
  @Input() showStats = false;
  
  /** 選中的索引 */
  @Input() selectedIndex = -1;
  
  /** TrackBy 函數 */
  @Input() trackByFn: (index: number, item: T) => any = (index) => index;
  
  // === 模板 ===
  
  @ContentChild('itemTemplate') itemTemplate?: TemplateRef<any>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<any>;
  
  // === 輸出 ===
  
  /** 項目點擊 */
  @Output() itemClick = new EventEmitter<{ item: T; index: number }>();
  
  /** 加載更多 */
  @Output() loadMore = new EventEmitter<void>();
  
  /** 滾動事件 */
  @Output() scroll = new EventEmitter<{ scrollTop: number; direction: 'up' | 'down' | 'none' }>();
  
  /** 選中變化 */
  @Output() selectedIndexChange = new EventEmitter<number>();
  
  // === 控制器 ===
  
  controller?: VirtualScrollController<T>;
  
  ngAfterViewInit(): void {
    this.initController();
    
    // 設置加載更多回調
    if (this.infiniteScroll) {
      this.controller?.setLoadMoreCallback(async () => {
        return new Promise((resolve) => {
          this.loadMore.emit();
          // 返回空數組，實際數據通過 items 輸入更新
          resolve([]);
        });
      });
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items'] && this.controller) {
      // 💡 優化：檢測是追加還是替換
      const prev = changes['items'].previousValue as T[] | undefined;
      const curr = changes['items'].currentValue as T[];
      
      if (prev && curr.length > prev.length && 
          curr.slice(0, prev.length).every((item, i) => item === prev[i])) {
        // 追加模式
        this.controller.setItems(curr.slice(prev.length), true);
      } else {
        // 替換模式
        this.controller.setItems(curr);
      }
    }
    
    if (changes['containerHeight'] && this.controller) {
      this.controller.updateContainerHeight(this.containerHeight);
    }
  }
  
  ngOnDestroy(): void {
    this.controller?.destroy();
  }
  
  private initController(): void {
    const config: VirtualScrollConfig = {
      containerHeight: this.containerHeight,
      itemHeight: this.itemHeight,
      dynamicHeight: this.dynamicHeight,
      bufferSize: this.bufferSize,
      infiniteScroll: this.infiniteScroll,
      loadMoreThreshold: this.loadMoreThreshold
    };
    
    this.controller = this.virtualScrollService.createController<T>(config);
    this.controller.setItems(this.items);
  }
  
  onScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.controller?.handleScroll(target.scrollTop);
    
    this.scroll.emit({
      scrollTop: target.scrollTop,
      direction: this.controller?.scrollDirection() || 'none'
    });
  }
  
  onItemClick(item: T, index: number): void {
    this.selectedIndex = index;
    this.selectedIndexChange.emit(index);
    this.itemClick.emit({ item, index });
  }
  
  scrollToTop(): void {
    this.containerRef.nativeElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  scrollToIndex(index: number): void {
    const offset = this.controller?.scrollToIndex(index);
    if (offset !== undefined) {
      this.containerRef.nativeElement.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  }
  
  // === 鍵盤導航 ===
  
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const totalCount = this.controller?.totalCount() || 0;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.selectedIndex < totalCount - 1) {
          this.selectedIndex++;
          this.selectedIndexChange.emit(this.selectedIndex);
          this.ensureVisible(this.selectedIndex);
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          this.selectedIndexChange.emit(this.selectedIndex);
          this.ensureVisible(this.selectedIndex);
        }
        break;
        
      case 'Enter':
        if (this.selectedIndex >= 0 && this.selectedIndex < totalCount) {
          const items = this.controller?.items() || [];
          this.itemClick.emit({ 
            item: items[this.selectedIndex], 
            index: this.selectedIndex 
          });
        }
        break;
        
      case 'Home':
        event.preventDefault();
        this.selectedIndex = 0;
        this.selectedIndexChange.emit(this.selectedIndex);
        this.scrollToTop();
        break;
        
      case 'End':
        event.preventDefault();
        this.selectedIndex = totalCount - 1;
        this.selectedIndexChange.emit(this.selectedIndex);
        this.scrollToIndex(this.selectedIndex);
        break;
    }
  }
  
  private ensureVisible(index: number): void {
    const range = this.controller?.visibleRange();
    if (!range) return;
    
    // 如果選中項不在可見範圍內，滾動到該項
    if (index < range.start || index >= range.end) {
      this.scrollToIndex(index);
    }
  }
}
