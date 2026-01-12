/**
 * Virtual Scroll Component
 * 虛擬滾動組件 - 大數據列表性能優化
 * 
 * 功能：
 * - 只渲染可見區域的元素
 * - 支持動態高度
 * - 滾動性能優化
 * - 無限滾動支持
 */
import { 
  Component, 
  Input, 
  Output, 
  EventEmitter,
  signal, 
  computed,
  effect,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  TemplateRef,
  ContentChild,
  TrackByFunction
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VirtualScrollConfig {
  itemHeight: number;         // 項目高度（固定高度時使用）
  bufferSize: number;         // 緩衝區大小（上下各多渲染多少項）
  threshold: number;          // 無限滾動觸發閾值（距離底部多少像素）
  dynamicHeight?: boolean;    // 是否動態高度
}

const DEFAULT_CONFIG: VirtualScrollConfig = {
  itemHeight: 60,
  bufferSize: 5,
  threshold: 200,
  dynamicHeight: false
};

@Component({
  selector: 'app-virtual-scroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="virtual-scroll-container relative overflow-auto" 
         #container
         [style.height]="containerHeight"
         (scroll)="onScroll($event)">
      
      <!-- 撐開滾動區域的佔位元素 -->
      <div class="virtual-scroll-spacer absolute top-0 left-0 w-full pointer-events-none"
           [style.height.px]="totalHeight()">
      </div>
      
      <!-- 可見項目容器 -->
      <div class="virtual-scroll-content absolute top-0 left-0 w-full"
           [style.transform]="'translateY(' + offsetY() + 'px)'">
        
        @for(item of visibleItems(); track trackByFn ? trackByFn($index, item) : $index; let i = $index) {
          <div class="virtual-scroll-item" 
               [style.min-height.px]="config.itemHeight"
               [attr.data-index]="startIndex() + i">
            
            @if(itemTemplate) {
              <ng-container *ngTemplateOutlet="itemTemplate; context: { $implicit: item, index: startIndex() + i }">
              </ng-container>
            } @else {
              <!-- 默認渲染 -->
              <div class="p-4 border-b border-slate-700">
                {{ item | json }}
              </div>
            }
          </div>
        }
        
        <!-- 空狀態 -->
        @if(items.length === 0) {
          <div class="flex flex-col items-center justify-center py-16 text-slate-400">
            <div class="text-5xl mb-4">📭</div>
            <p>{{ emptyText }}</p>
          </div>
        }
        
        <!-- 加載中狀態 -->
        @if(loading()) {
          <div class="flex items-center justify-center py-8">
            <div class="w-8 h-8 border-4 border-slate-600 border-t-cyan-500 rounded-full animate-spin"></div>
            <span class="ml-3 text-slate-400">載入中...</span>
          </div>
        }
        
        <!-- 已加載完畢 -->
        @if(noMoreData() && items.length > 0) {
          <div class="text-center py-4 text-slate-500 text-sm">
            已加載全部 {{ items.length }} 條數據
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .virtual-scroll-container {
      will-change: scroll-position;
    }
    .virtual-scroll-content {
      will-change: transform;
    }
  `]
})
export class VirtualScrollComponent implements OnInit, OnDestroy {
  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;
  @ContentChild('itemTemplate') itemTemplate?: TemplateRef<any>;
  
  // 輸入
  @Input() items: any[] = [];
  @Input() containerHeight = '500px';
  @Input() config: VirtualScrollConfig = DEFAULT_CONFIG;
  @Input() trackByFn?: TrackByFunction<any>;
  @Input() emptyText = '暫無數據';
  
  // 輸出
  @Output() loadMore = new EventEmitter<void>();
  @Output() itemClick = new EventEmitter<{ item: any; index: number }>();
  
  // 狀態
  loading = signal(false);
  noMoreData = signal(false);
  private scrollTop = signal(0);
  private containerHeightPx = signal(0);
  
  // 計算屬性
  totalHeight = computed(() => this.items.length * this.config.itemHeight);
  
  visibleCount = computed(() => {
    const visible = Math.ceil(this.containerHeightPx() / this.config.itemHeight);
    return visible + this.config.bufferSize * 2;
  });
  
  startIndex = computed(() => {
    const start = Math.floor(this.scrollTop() / this.config.itemHeight) - this.config.bufferSize;
    return Math.max(0, start);
  });
  
  endIndex = computed(() => {
    const end = this.startIndex() + this.visibleCount();
    return Math.min(this.items.length, end);
  });
  
  visibleItems = computed(() => {
    return this.items.slice(this.startIndex(), this.endIndex());
  });
  
  offsetY = computed(() => this.startIndex() * this.config.itemHeight);
  
  private resizeObserver?: ResizeObserver;
  
  ngOnInit(): void {
    this.setupResizeObserver();
    this.updateContainerHeight();
  }
  
  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
  
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.containerHeightPx.set(entry.contentRect.height);
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }
  
  private updateContainerHeight(): void {
    const height = this.containerRef.nativeElement.clientHeight;
    this.containerHeightPx.set(height);
  }
  
  onScroll(event: Event): void {
    const target = event.target as HTMLDivElement;
    this.scrollTop.set(target.scrollTop);
    
    // 檢查是否需要加載更多
    const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollBottom < this.config.threshold && !this.loading() && !this.noMoreData()) {
      this.triggerLoadMore();
    }
  }
  
  private triggerLoadMore(): void {
    this.loading.set(true);
    this.loadMore.emit();
  }
  
  /**
   * 完成加載
   */
  finishLoading(hasMore: boolean = true): void {
    this.loading.set(false);
    if (!hasMore) {
      this.noMoreData.set(true);
    }
  }
  
  /**
   * 重置狀態
   */
  reset(): void {
    this.scrollTop.set(0);
    this.loading.set(false);
    this.noMoreData.set(false);
    this.containerRef.nativeElement.scrollTop = 0;
  }
  
  /**
   * 滾動到指定項目
   */
  scrollToIndex(index: number, behavior: ScrollBehavior = 'smooth'): void {
    const offset = index * this.config.itemHeight;
    this.containerRef.nativeElement.scrollTo({
      top: offset,
      behavior
    });
  }
  
  /**
   * 滾動到頂部
   */
  scrollToTop(behavior: ScrollBehavior = 'smooth'): void {
    this.containerRef.nativeElement.scrollTo({
      top: 0,
      behavior
    });
  }
  
  /**
   * 滾動到底部
   */
  scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    this.containerRef.nativeElement.scrollTo({
      top: this.totalHeight(),
      behavior
    });
  }
}

/**
 * Virtual Table Component
 * 虛擬表格組件
 */
@Component({
  selector: 'app-virtual-table',
  standalone: true,
  imports: [CommonModule, VirtualScrollComponent],
  template: `
    <div class="virtual-table rounded-xl overflow-hidden border border-slate-700">
      <!-- 表頭 -->
      <div class="table-header bg-slate-800 border-b border-slate-700">
        <div class="flex items-center" [style.padding-right.px]="scrollbarWidth">
          @for(column of columns; track column.key) {
            <div class="table-cell px-4 py-3 font-medium text-slate-300"
                 [style.width]="column.width || 'auto'"
                 [style.flex]="column.width ? 'none' : '1'"
                 [style.min-width]="column.minWidth || '100px'">
              <div class="flex items-center gap-2">
                <span>{{ column.label }}</span>
                @if(column.sortable) {
                  <button (click)="toggleSort(column.key)" 
                          class="text-slate-500 hover:text-slate-300">
                    @if(sortKey === column.key) {
                      @if(sortDirection === 'asc') {
                        ↑
                      } @else {
                        ↓
                      }
                    } @else {
                      ↕
                    }
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- 表體 -->
      <app-virtual-scroll
        [items]="sortedData"
        [containerHeight]="tableHeight"
        [config]="scrollConfig"
        (loadMore)="onLoadMore()">
        
        <ng-template #itemTemplate let-row let-index="index">
          <div class="flex items-center hover:bg-slate-800/50 transition-colors cursor-pointer"
               (click)="rowClick.emit({ row, index })">
            @for(column of columns; track column.key) {
              <div class="table-cell px-4 py-3 text-slate-300"
                   [style.width]="column.width || 'auto'"
                   [style.flex]="column.width ? 'none' : '1'"
                   [style.min-width]="column.minWidth || '100px'">
                @if(column.template) {
                  <ng-container *ngTemplateOutlet="column.template; context: { $implicit: row, column: column }">
                  </ng-container>
                } @else {
                  {{ getNestedValue(row, column.key) }}
                }
              </div>
            }
          </div>
        </ng-template>
      </app-virtual-scroll>
    </div>
  `
})
export class VirtualTableComponent {
  @Input() data: any[] = [];
  @Input() columns: TableColumn[] = [];
  @Input() tableHeight = '400px';
  @Input() rowHeight = 48;
  
  @Output() loadMore = new EventEmitter<void>();
  @Output() rowClick = new EventEmitter<{ row: any; index: number }>();
  @Output() sortChange = new EventEmitter<{ key: string; direction: 'asc' | 'desc' }>();
  
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  scrollbarWidth = 17; // 默認滾動條寬度
  
  scrollConfig: VirtualScrollConfig = {
    itemHeight: this.rowHeight,
    bufferSize: 3,
    threshold: 100
  };
  
  get sortedData(): any[] {
    if (!this.sortKey) return this.data;
    
    return [...this.data].sort((a, b) => {
      const aVal = this.getNestedValue(a, this.sortKey);
      const bVal = this.getNestedValue(b, this.sortKey);
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
  
  toggleSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.sortChange.emit({ key: this.sortKey, direction: this.sortDirection });
  }
  
  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  onLoadMore(): void {
    this.loadMore.emit();
  }
}

export interface TableColumn {
  key: string;
  label: string;
  width?: string;
  minWidth?: string;
  sortable?: boolean;
  template?: TemplateRef<any>;
}
