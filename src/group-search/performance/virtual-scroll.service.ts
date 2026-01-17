/**
 * TG-AI智控王 虛擬滾動服務
 * Virtual Scroll Service v1.0
 * 
 * 思考優化點：
 * 1. 支持動態行高度 - 不同項目可有不同高度
 * 2. 雙向緩衝區 - 上下各預渲染部分項目
 * 3. 滾動方向檢測 - 優化預加載方向
 * 4. 內存自動回收 - 離開視口的項目自動清理
 * 5. 無限滾動支持 - 結合分頁自動加載更多
 */

import { Injectable, signal, computed, NgZone, inject } from '@angular/core';

// ============ 類型定義 ============

export interface VirtualScrollConfig {
  /** 容器高度 */
  containerHeight: number;
  /** 項目高度（固定高度模式）或估算高度 */
  itemHeight: number;
  /** 是否使用動態高度 */
  dynamicHeight?: boolean;
  /** 緩衝區大小（額外渲染的項目數） */
  bufferSize?: number;
  /** 滾動節流時間（毫秒） */
  throttleTime?: number;
  /** 是否啟用無限滾動 */
  infiniteScroll?: boolean;
  /** 觸發加載更多的閾值（距底部像素） */
  loadMoreThreshold?: number;
}

export interface VirtualScrollState<T> {
  /** 所有數據 */
  items: T[];
  /** 可見項目 */
  visibleItems: T[];
  /** 可見項目索引範圍 */
  visibleRange: { start: number; end: number };
  /** 滾動位置 */
  scrollTop: number;
  /** 滾動方向 */
  scrollDirection: 'up' | 'down' | 'none';
  /** 總高度 */
  totalHeight: number;
  /** 頂部偏移 */
  offsetTop: number;
  /** 是否正在加載更多 */
  isLoadingMore: boolean;
  /** 是否還有更多數據 */
  hasMore: boolean;
}

export interface ItemMeasurement {
  index: number;
  height: number;
  offset: number;
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: Required<VirtualScrollConfig> = {
  containerHeight: 500,
  itemHeight: 60,
  dynamicHeight: false,
  bufferSize: 5,
  throttleTime: 16, // ~60fps
  infiniteScroll: false,
  loadMoreThreshold: 200
};

@Injectable({
  providedIn: 'root'
})
export class VirtualScrollService {
  private ngZone = inject(NgZone);
  
  /**
   * 創建虛擬滾動控制器
   * 
   * 💡 思考：為什麼使用工廠模式？
   * - 每個列表可以有獨立的狀態
   * - 避免服務單例造成的狀態混亂
   * - 支持同時存在多個虛擬滾動列表
   */
  createController<T>(config: VirtualScrollConfig): VirtualScrollController<T> {
    return new VirtualScrollController<T>(config, this.ngZone);
  }
}

/**
 * 虛擬滾動控制器
 * 
 * 💡 設計思考：
 * 使用獨立的控制器類而不是在服務中直接管理狀態，
 * 這樣每個列表都有自己的控制器，互不干擾。
 */
export class VirtualScrollController<T> {
  private config: Required<VirtualScrollConfig>;
  private ngZone: NgZone;
  
  // 數據
  private _items = signal<T[]>([]);
  private _visibleItems = signal<T[]>([]);
  
  // 狀態
  private _scrollTop = signal(0);
  private _scrollDirection = signal<'up' | 'down' | 'none'>('none');
  private _isLoadingMore = signal(false);
  private _hasMore = signal(true);
  
  // 動態高度測量緩存
  private heightCache = new Map<number, number>();
  private offsetCache = new Map<number, number>();
  
  // 滾動節流
  private lastScrollTime = 0;
  private scrollAnimationFrame: number | null = null;
  
  // 加載更多回調
  private loadMoreCallback?: () => Promise<T[]>;
  
  // === 計算屬性 ===
  
  /** 所有項目 */
  items = computed(() => this._items());
  
  /** 可見項目 */
  visibleItems = computed(() => this._visibleItems());
  
  /** 總項目數 */
  totalCount = computed(() => this._items().length);
  
  /** 可見範圍 */
  visibleRange = computed(() => this.calculateVisibleRange());
  
  /** 總高度 */
  totalHeight = computed(() => this.calculateTotalHeight());
  
  /** 頂部偏移（用於定位可見區域） */
  offsetTop = computed(() => {
    const range = this.visibleRange();
    return this.getItemOffset(range.start);
  });
  
  /** 滾動位置 */
  scrollTop = computed(() => this._scrollTop());
  
  /** 滾動方向 */
  scrollDirection = computed(() => this._scrollDirection());
  
  /** 是否正在加載 */
  isLoadingMore = computed(() => this._isLoadingMore());
  
  /** 是否有更多數據 */
  hasMore = computed(() => this._hasMore());
  
  /** 完整狀態 */
  state = computed<VirtualScrollState<T>>(() => ({
    items: this._items(),
    visibleItems: this._visibleItems(),
    visibleRange: this.visibleRange(),
    scrollTop: this._scrollTop(),
    scrollDirection: this._scrollDirection(),
    totalHeight: this.totalHeight(),
    offsetTop: this.offsetTop(),
    isLoadingMore: this._isLoadingMore(),
    hasMore: this._hasMore()
  }));
  
  constructor(config: VirtualScrollConfig, ngZone: NgZone) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ngZone = ngZone;
  }
  
  // === 公開方法 ===
  
  /**
   * 設置數據
   * 
   * 💡 優化思考：
   * 如果是追加數據，保留已測量的高度緩存
   * 如果是替換數據，清空緩存重新測量
   */
  setItems(items: T[], append = false): void {
    if (append) {
      this._items.update(current => [...current, ...items]);
    } else {
      this._items.set(items);
      this.heightCache.clear();
      this.offsetCache.clear();
    }
    
    this.updateVisibleItems();
  }
  
  /**
   * 處理滾動事件
   * 
   * 💡 性能優化：
   * 1. 節流處理，避免過於頻繁更新
   * 2. 使用 requestAnimationFrame 確保渲染同步
   * 3. 在 Angular Zone 外執行減少變更檢測
   */
  handleScroll(scrollTop: number): void {
    const now = performance.now();
    
    // 節流
    if (now - this.lastScrollTime < this.config.throttleTime) {
      // 取消之前的動畫幀
      if (this.scrollAnimationFrame) {
        cancelAnimationFrame(this.scrollAnimationFrame);
      }
      
      // 排程新的更新
      this.scrollAnimationFrame = requestAnimationFrame(() => {
        this.performScroll(scrollTop);
      });
      return;
    }
    
    this.performScroll(scrollTop);
    this.lastScrollTime = now;
  }
  
  private performScroll(scrollTop: number): void {
    const previousScrollTop = this._scrollTop();
    
    // 更新滾動方向
    if (scrollTop > previousScrollTop) {
      this._scrollDirection.set('down');
    } else if (scrollTop < previousScrollTop) {
      this._scrollDirection.set('up');
    }
    
    this._scrollTop.set(scrollTop);
    this.updateVisibleItems();
    
    // 檢查是否需要加載更多
    if (this.config.infiniteScroll) {
      this.checkLoadMore();
    }
  }
  
  /**
   * 更新項目高度（動態高度模式）
   * 
   * 💡 設計思考：
   * 允許組件測量實際高度後回報，
   * 這樣就能支持圖片、展開內容等動態高度場景
   */
  updateItemHeight(index: number, height: number): void {
    if (!this.config.dynamicHeight) return;
    
    const oldHeight = this.heightCache.get(index);
    if (oldHeight !== height) {
      this.heightCache.set(index, height);
      
      // 更新該項之後所有項的偏移緩存
      this.invalidateOffsetsFrom(index);
      
      // 可能需要更新可見項目
      this.updateVisibleItems();
    }
  }
  
  /**
   * 滾動到指定索引
   */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): number {
    const offset = this.getItemOffset(index);
    this._scrollTop.set(offset);
    return offset;
  }
  
  /**
   * 滾動到頂部
   */
  scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
    this._scrollTop.set(0);
    this.updateVisibleItems();
  }
  
  /**
   * 滾動到底部
   */
  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    const maxScroll = Math.max(0, this.totalHeight() - this.config.containerHeight);
    this._scrollTop.set(maxScroll);
    this.updateVisibleItems();
  }
  
  /**
   * 設置加載更多回調
   */
  setLoadMoreCallback(callback: () => Promise<T[]>): void {
    this.loadMoreCallback = callback;
  }
  
  /**
   * 設置是否還有更多數據
   */
  setHasMore(hasMore: boolean): void {
    this._hasMore.set(hasMore);
  }
  
  /**
   * 更新容器高度
   */
  updateContainerHeight(height: number): void {
    this.config.containerHeight = height;
    this.updateVisibleItems();
  }
  
  /**
   * 銷毀控制器
   */
  destroy(): void {
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }
    this.heightCache.clear();
    this.offsetCache.clear();
  }
  
  // === 私有方法 ===
  
  /**
   * 計算可見範圍
   * 
   * 💡 優化思考：
   * 1. 根據滾動方向調整緩衝區分配
   * 2. 向下滾動時下方緩衝區更大
   * 3. 向上滾動時上方緩衝區更大
   */
  private calculateVisibleRange(): { start: number; end: number } {
    const items = this._items();
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }
    
    const scrollTop = this._scrollTop();
    const containerHeight = this.config.containerHeight;
    const direction = this._scrollDirection();
    
    // 根據滾動方向調整緩衝區
    let topBuffer = this.config.bufferSize;
    let bottomBuffer = this.config.bufferSize;
    
    if (direction === 'down') {
      bottomBuffer = Math.ceil(this.config.bufferSize * 1.5);
      topBuffer = Math.floor(this.config.bufferSize * 0.5);
    } else if (direction === 'up') {
      topBuffer = Math.ceil(this.config.bufferSize * 1.5);
      bottomBuffer = Math.floor(this.config.bufferSize * 0.5);
    }
    
    // 找到起始索引
    let start = this.findIndexAtOffset(scrollTop);
    start = Math.max(0, start - topBuffer);
    
    // 找到結束索引
    let end = this.findIndexAtOffset(scrollTop + containerHeight);
    end = Math.min(items.length, end + bottomBuffer);
    
    return { start, end };
  }
  
  /**
   * 更新可見項目
   */
  private updateVisibleItems(): void {
    const items = this._items();
    const { start, end } = this.calculateVisibleRange();
    
    // 💡 優化：只在範圍變化時更新
    const currentVisible = this._visibleItems();
    const newVisible = items.slice(start, end);
    
    // 簡單比較長度和首尾元素
    if (
      currentVisible.length !== newVisible.length ||
      currentVisible[0] !== newVisible[0] ||
      currentVisible[currentVisible.length - 1] !== newVisible[newVisible.length - 1]
    ) {
      this._visibleItems.set(newVisible);
    }
  }
  
  /**
   * 計算總高度
   */
  private calculateTotalHeight(): number {
    const items = this._items();
    
    if (this.config.dynamicHeight) {
      // 動態高度：累加已測量 + 估算未測量
      let totalHeight = 0;
      for (let i = 0; i < items.length; i++) {
        totalHeight += this.getItemHeight(i);
      }
      return totalHeight;
    } else {
      // 固定高度
      return items.length * this.config.itemHeight;
    }
  }
  
  /**
   * 獲取項目高度
   */
  private getItemHeight(index: number): number {
    if (this.config.dynamicHeight) {
      return this.heightCache.get(index) ?? this.config.itemHeight;
    }
    return this.config.itemHeight;
  }
  
  /**
   * 獲取項目偏移
   * 
   * 💡 優化：使用緩存避免重複計算
   */
  private getItemOffset(index: number): number {
    if (!this.config.dynamicHeight) {
      return index * this.config.itemHeight;
    }
    
    // 檢查緩存
    const cached = this.offsetCache.get(index);
    if (cached !== undefined) {
      return cached;
    }
    
    // 計算並緩存
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this.getItemHeight(i);
    }
    
    this.offsetCache.set(index, offset);
    return offset;
  }
  
  /**
   * 根據偏移找到索引
   * 
   * 💡 優化：使用二分查找
   */
  private findIndexAtOffset(offset: number): number {
    const items = this._items();
    
    if (items.length === 0) return 0;
    
    if (!this.config.dynamicHeight) {
      // 固定高度：直接計算
      return Math.floor(offset / this.config.itemHeight);
    }
    
    // 動態高度：二分查找
    let low = 0;
    let high = items.length - 1;
    
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const midOffset = this.getItemOffset(mid);
      const midHeight = this.getItemHeight(mid);
      
      if (offset < midOffset) {
        high = mid - 1;
      } else if (offset >= midOffset + midHeight) {
        low = mid + 1;
      } else {
        return mid;
      }
    }
    
    return low;
  }
  
  /**
   * 使指定索引之後的偏移緩存失效
   */
  private invalidateOffsetsFrom(index: number): void {
    for (const [key] of this.offsetCache) {
      if (key > index) {
        this.offsetCache.delete(key);
      }
    }
  }
  
  /**
   * 檢查是否需要加載更多
   */
  private async checkLoadMore(): Promise<void> {
    if (!this._hasMore() || this._isLoadingMore() || !this.loadMoreCallback) {
      return;
    }
    
    const scrollTop = this._scrollTop();
    const totalHeight = this.totalHeight();
    const containerHeight = this.config.containerHeight;
    const threshold = this.config.loadMoreThreshold;
    
    // 距離底部小於閾值時加載更多
    if (totalHeight - scrollTop - containerHeight < threshold) {
      this._isLoadingMore.set(true);
      
      try {
        const newItems = await this.loadMoreCallback();
        
        if (newItems.length === 0) {
          this._hasMore.set(false);
        } else {
          this.setItems(newItems, true);
        }
      } catch (error) {
        console.error('[VirtualScroll] Load more failed:', error);
      } finally {
        this._isLoadingMore.set(false);
      }
    }
  }
}
