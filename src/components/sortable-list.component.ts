/**
 * 可排序列表組件
 * Sortable List Component
 * 
 * 🆕 前端優化: 拖拽排序功能
 */

import { 
  Component, 
  input, 
  output, 
  signal,
  computed,
  ContentChild,
  TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DraggableDirective, DropzoneDirective, DropEvent } from '../directives/drag-drop.directive';

@Component({
  selector: 'app-sortable-list',
  standalone: true,
  imports: [CommonModule, DraggableDirective, DropzoneDirective],
  template: `
    <div class="sortable-list">
      @for (item of items(); track trackByFn()(item); let i = $index) {
        <div class="sortable-item"
             [appDraggable]="{ item, index: i }"
             [draggableGroup]="group()"
             [draggableDisabled]="disabled()"
             (dragStart)="onDragStart($event)"
             (dragEnd)="onDragEnd()">
          
          <!-- 拖拽手柄 -->
          @if (showHandle()) {
            <div class="drag-handle cursor-grab active:cursor-grabbing p-2 text-slate-500 hover:text-slate-300">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="4" cy="4" r="1.5"/>
                <circle cx="12" cy="4" r="1.5"/>
                <circle cx="4" cy="8" r="1.5"/>
                <circle cx="12" cy="8" r="1.5"/>
                <circle cx="4" cy="12" r="1.5"/>
                <circle cx="12" cy="12" r="1.5"/>
              </svg>
            </div>
          }
          
          <!-- 放置區域 (上方) -->
          <div class="drop-indicator-top h-1 -mt-0.5 mb-0.5 rounded transition-all"
               [appDropzone]="group()"
               [dropzoneDisabled]="disabled()"
               (itemDropped)="onDropBefore(i, $event)"
               [class.bg-purple-500]="dropIndex() === i"
               [class.opacity-0]="dropIndex() !== i">
          </div>
          
          <!-- 項目內容 -->
          <div class="sortable-content flex-1"
               [class.opacity-50]="draggingIndex() === i">
            <ng-container *ngTemplateOutlet="itemTemplate || defaultTemplate; context: { $implicit: item, index: i }">
            </ng-container>
          </div>
          
          <!-- 放置區域 (下方，最後一個項目) -->
          @if (i === items().length - 1) {
            <div class="drop-indicator-bottom h-1 mt-0.5 rounded transition-all"
                 [appDropzone]="group()"
                 [dropzoneDisabled]="disabled()"
                 (itemDropped)="onDropAfter(i, $event)"
                 [class.bg-purple-500]="dropIndex() === i + 1"
                 [class.opacity-0]="dropIndex() !== i + 1">
            </div>
          }
        </div>
      }
      
      <!-- 空狀態 -->
      @if (items().length === 0) {
        <div class="empty-state p-8 text-center text-slate-400 border-2 border-dashed border-slate-700 rounded-xl"
             [appDropzone]="group()"
             [dropzoneDisabled]="disabled()"
             (itemDropped)="onDropEmpty($event)">
          <ng-container *ngTemplateOutlet="emptyTemplate || defaultEmptyTemplate"></ng-container>
        </div>
      }
    </div>
    
    <!-- 默認模板 -->
    <ng-template #defaultTemplate let-item let-index="index">
      <div class="p-3 bg-slate-800 rounded-lg">
        {{ item }}
      </div>
    </ng-template>
    
    <ng-template #defaultEmptyTemplate>
      <p>拖拽項目到這裡</p>
    </ng-template>
  `,
  styles: [`
    .sortable-item {
      display: flex;
      align-items: center;
      position: relative;
    }
    
    .sortable-item.dragging {
      opacity: 0.5;
    }
    
    .drop-indicator-top,
    .drop-indicator-bottom {
      position: absolute;
      left: 0;
      right: 0;
      z-index: 10;
    }
    
    .drop-indicator-top {
      top: 0;
    }
    
    .drop-indicator-bottom {
      bottom: 0;
    }
    
    .drag-over {
      background-color: rgba(139, 92, 246, 0.1);
    }
  `]
})
export class SortableListComponent<T> {
  // 輸入
  items = input<T[]>([]);
  group = input('default');
  showHandle = input(true);
  disabled = input(false);
  trackByFn = input<(item: T) => any>((item: any) => item.id || item);
  
  // 輸出
  orderChange = output<T[]>();
  itemMoved = output<{ item: T; fromIndex: number; toIndex: number }>();
  
  // 模板
  @ContentChild('itemTemplate') itemTemplate?: TemplateRef<any>;
  @ContentChild('emptyTemplate') emptyTemplate?: TemplateRef<any>;
  
  // 狀態
  draggingIndex = signal<number | null>(null);
  dropIndex = signal<number | null>(null);
  
  onDragStart(event: any): void {
    this.draggingIndex.set(event.data.index);
  }
  
  onDragEnd(): void {
    this.draggingIndex.set(null);
    this.dropIndex.set(null);
  }
  
  onDropBefore(targetIndex: number, event: DropEvent): void {
    const sourceData = event.data;
    if (!sourceData || sourceData.index === undefined) return;
    
    const fromIndex = sourceData.index;
    let toIndex = targetIndex;
    
    // 如果從後面拖到前面，需要調整目標索引
    if (fromIndex < toIndex) {
      toIndex--;
    }
    
    if (fromIndex !== toIndex) {
      this.moveItem(fromIndex, toIndex);
    }
  }
  
  onDropAfter(targetIndex: number, event: DropEvent): void {
    const sourceData = event.data;
    if (!sourceData || sourceData.index === undefined) return;
    
    const fromIndex = sourceData.index;
    const toIndex = targetIndex + 1;
    
    if (fromIndex !== toIndex && fromIndex !== toIndex - 1) {
      this.moveItem(fromIndex, fromIndex < toIndex ? toIndex - 1 : toIndex);
    }
  }
  
  onDropEmpty(event: DropEvent): void {
    const sourceData = event.data;
    if (!sourceData) return;
    
    // 從其他列表拖入
    // 這裡可以擴展支持跨列表拖拽
  }
  
  private moveItem(fromIndex: number, toIndex: number): void {
    const currentItems = [...this.items()];
    const [movedItem] = currentItems.splice(fromIndex, 1);
    currentItems.splice(toIndex, 0, movedItem);
    
    this.orderChange.emit(currentItems);
    this.itemMoved.emit({
      item: movedItem,
      fromIndex,
      toIndex
    });
  }
}
