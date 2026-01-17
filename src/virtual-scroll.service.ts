/**
 * 虛擬滾動服務 - Phase 2 前端性能優化
 * Virtual Scroll Service for Large Data Sets
 * 
 * 功能:
 * 1. 虛擬滾動 - 只渲染可視區域
 * 2. 滾動防抖
 * 3. 預加載優化
 * 4. 動態高度支持
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';

export interface VirtualScrollConfig {
  itemHeight: number;       // 項目高度（固定高度模式）
  containerHeight: number;  // 容器高度
  bufferSize: number;       // 緩衝區大小
  debounceMs: number;       // 滾動防抖時間
}

export interface VirtualScrollState<T> {
  items: T[];
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  totalHeight: number;
  offsetY: number;
}

export interface ScrollPosition {
  top: number;
  left: number;
}

@Injectable({
  providedIn: 'root'
})
export class VirtualScrollService implements OnDestroy {
  
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  
  /**
   * 計算虛擬滾動狀態
   */
  calculateVirtualScroll<T>(
    items: T[],
    scrollTop: number,
    config: VirtualScrollConfig
  ): VirtualScrollState<T> {
    const { itemHeight, containerHeight, bufferSize } = config;
    
    // 計算可視區域的項目數量
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    
    // 計算起始索引（含緩衝）
    const rawStartIndex = Math.floor(scrollTop / itemHeight);
    const startIndex = Math.max(0, rawStartIndex - bufferSize);
    
    // 計算結束索引（含緩衝）
    const rawEndIndex = rawStartIndex + visibleCount;
    const endIndex = Math.min(items.length, rawEndIndex + bufferSize);
    
    // 提取可見項目
    const visibleItems = items.slice(startIndex, endIndex);
    
    // 計算偏移量
    const offsetY = startIndex * itemHeight;
    
    // 計算總高度
    const totalHeight = items.length * itemHeight;
    
    return {
      items,
      visibleItems,
      startIndex,
      endIndex,
      scrollTop,
      totalHeight,
      offsetY
    };
  }
  
  /**
   * 創建滾動處理器（帶防抖）
   */
  createScrollHandler(
    id: string,
    callback: (scrollTop: number) => void,
    debounceMs: number = 16
  ): (event: Event) => void {
    return (event: Event) => {
      const target = event.target as HTMLElement;
      const scrollTop = target.scrollTop;
      
      // 清除之前的定時器
      const existingTimer = this.debounceTimers.get(id);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      // 設置新的定時器
      const timer = setTimeout(() => {
        callback(scrollTop);
        this.debounceTimers.delete(id);
      }, debounceMs);
      
      this.debounceTimers.set(id, timer);
    };
  }
  
  /**
   * 計算動態高度虛擬滾動
   * 用於項目高度不固定的情況
   */
  calculateDynamicVirtualScroll<T>(
    items: T[],
    scrollTop: number,
    containerHeight: number,
    getItemHeight: (item: T, index: number) => number,
    bufferSize: number = 3
  ): VirtualScrollState<T> & { itemPositions: number[] } {
    // 計算每個項目的位置
    const itemPositions: number[] = [];
    let totalHeight = 0;
    
    for (let i = 0; i < items.length; i++) {
      itemPositions.push(totalHeight);
      totalHeight += getItemHeight(items[i], i);
    }
    
    // 二分查找起始索引
    let startIndex = this.binarySearch(itemPositions, scrollTop);
    startIndex = Math.max(0, startIndex - bufferSize);
    
    // 查找結束索引
    const visibleBottom = scrollTop + containerHeight;
    let endIndex = this.binarySearch(itemPositions, visibleBottom);
    endIndex = Math.min(items.length, endIndex + bufferSize + 1);
    
    // 提取可見項目
    const visibleItems = items.slice(startIndex, endIndex);
    
    // 計算偏移量
    const offsetY = startIndex > 0 ? itemPositions[startIndex] : 0;
    
    return {
      items,
      visibleItems,
      startIndex,
      endIndex,
      scrollTop,
      totalHeight,
      offsetY,
      itemPositions
    };
  }
  
  /**
   * 二分查找
   */
  private binarySearch(positions: number[], target: number): number {
    let left = 0;
    let right = positions.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (positions[mid] <= target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.max(0, left - 1);
  }
  
  /**
   * 滾動到指定索引
   */
  scrollToIndex(
    container: HTMLElement,
    index: number,
    itemHeight: number,
    behavior: ScrollBehavior = 'smooth'
  ): void {
    const scrollTop = index * itemHeight;
    container.scrollTo({
      top: scrollTop,
      behavior
    });
  }
  
  /**
   * 滾動到底部
   */
  scrollToBottom(
    container: HTMLElement,
    behavior: ScrollBehavior = 'smooth'
  ): void {
    container.scrollTo({
      top: container.scrollHeight,
      behavior
    });
  }
  
  /**
   * 檢查是否接近底部
   */
  isNearBottom(
    container: HTMLElement,
    threshold: number = 100
  ): boolean {
    const { scrollTop, scrollHeight, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }
  
  /**
   * 檢查是否接近頂部
   */
  isNearTop(
    container: HTMLElement,
    threshold: number = 100
  ): boolean {
    return container.scrollTop < threshold;
  }
  
  ngOnDestroy(): void {
    // 清除所有定時器
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}


/**
 * 防抖工具函數
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = undefined;
    }, delay);
  }) as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
  
  return debounced;
}


/**
 * 節流工具函數
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  limit: number
): T {
  let inThrottle = false;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}


/**
 * 虛擬滾動列表組件的基礎邏輯
 * 可以在具體組件中使用
 */
export class VirtualListController<T> {
  private _items = signal<T[]>([]);
  private _scrollTop = signal(0);
  private _containerHeight = signal(400);
  private _itemHeight = signal(50);
  private _bufferSize = signal(5);
  
  private virtualScrollService = new VirtualScrollService();
  
  // 計算屬性
  state = computed(() => {
    return this.virtualScrollService.calculateVirtualScroll(
      this._items(),
      this._scrollTop(),
      {
        itemHeight: this._itemHeight(),
        containerHeight: this._containerHeight(),
        bufferSize: this._bufferSize(),
        debounceMs: 16
      }
    );
  });
  
  visibleItems = computed(() => this.state().visibleItems);
  totalHeight = computed(() => this.state().totalHeight);
  offsetY = computed(() => this.state().offsetY);
  
  // 設置項目
  setItems(items: T[]): void {
    this._items.set(items);
  }
  
  // 更新滾動位置
  updateScrollTop(scrollTop: number): void {
    this._scrollTop.set(scrollTop);
  }
  
  // 設置容器高度
  setContainerHeight(height: number): void {
    this._containerHeight.set(height);
  }
  
  // 設置項目高度
  setItemHeight(height: number): void {
    this._itemHeight.set(height);
  }
  
  // 設置緩衝區大小
  setBufferSize(size: number): void {
    this._bufferSize.set(size);
  }
  
  // 創建滾動事件處理器
  createScrollHandler(): (event: Event) => void {
    return this.virtualScrollService.createScrollHandler(
      'virtual-list',
      (scrollTop) => this.updateScrollTop(scrollTop),
      16
    );
  }
}
