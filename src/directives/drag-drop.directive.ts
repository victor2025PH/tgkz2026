/**
 * 拖拽排序指令
 * Drag Drop Directive
 * 
 * 🆕 前端優化: 拖拽排序功能
 */

import { 
  Directive, 
  ElementRef, 
  inject, 
  input, 
  output,
  HostListener,
  Renderer2,
  OnInit,
  OnDestroy
} from '@angular/core';

@Directive({
  selector: '[appDraggable]',
  standalone: true
})
export class DraggableDirective implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  
  // 輸入
  draggableData = input<any>(null, { alias: 'appDraggable' });
  draggableGroup = input<string>('default');
  draggableDisabled = input(false);
  
  // 輸出
  dragStart = output<DragStartEvent>();
  dragEnd = output<DragEndEvent>();
  
  private isDragging = false;
  
  ngOnInit(): void {
    if (!this.draggableDisabled()) {
      this.renderer.setAttribute(this.el.nativeElement, 'draggable', 'true');
      this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
    }
  }
  
  ngOnDestroy(): void {}
  
  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    if (this.draggableDisabled()) {
      event.preventDefault();
      return;
    }
    
    this.isDragging = true;
    
    // 設置數據
    const data: DragData = {
      data: this.draggableData(),
      group: this.draggableGroup()
    };
    event.dataTransfer?.setData('application/json', JSON.stringify(data));
    event.dataTransfer!.effectAllowed = 'move';
    
    // 樣式
    this.renderer.addClass(this.el.nativeElement, 'dragging');
    this.renderer.setStyle(this.el.nativeElement, 'opacity', '0.5');
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grabbing');
    
    this.dragStart.emit({
      data: this.draggableData(),
      group: this.draggableGroup(),
      event
    });
  }
  
  @HostListener('dragend', ['$event'])
  onDragEnd(event: DragEvent): void {
    this.isDragging = false;
    
    // 恢復樣式
    this.renderer.removeClass(this.el.nativeElement, 'dragging');
    this.renderer.setStyle(this.el.nativeElement, 'opacity', '1');
    this.renderer.setStyle(this.el.nativeElement, 'cursor', 'grab');
    
    this.dragEnd.emit({
      data: this.draggableData(),
      group: this.draggableGroup(),
      event
    });
  }
}

@Directive({
  selector: '[appDropzone]',
  standalone: true
})
export class DropzoneDirective implements OnInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  
  // 輸入
  dropzoneGroup = input<string>('default', { alias: 'appDropzone' });
  dropzoneAccept = input<string[]>([]);
  dropzoneDisabled = input(false);
  
  // 輸出
  itemDropped = output<DropEvent>();
  dragOver = output<DragEvent>();
  dragLeave = output<DragEvent>();
  
  ngOnInit(): void {}
  
  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    if (this.dropzoneDisabled()) return;
    
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'move';
    
    this.renderer.addClass(this.el.nativeElement, 'drag-over');
    this.dragOver.emit(event);
  }
  
  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    this.renderer.removeClass(this.el.nativeElement, 'drag-over');
    this.dragLeave.emit(event);
  }
  
  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    if (this.dropzoneDisabled()) return;
    
    event.preventDefault();
    this.renderer.removeClass(this.el.nativeElement, 'drag-over');
    
    const jsonData = event.dataTransfer?.getData('application/json');
    if (!jsonData) return;
    
    try {
      const dragData: DragData = JSON.parse(jsonData);
      
      // 檢查組是否匹配
      if (dragData.group !== this.dropzoneGroup()) {
        const accept = this.dropzoneAccept();
        if (accept.length > 0 && !accept.includes(dragData.group)) {
          return;
        }
      }
      
      this.itemDropped.emit({
        data: dragData.data,
        group: dragData.group,
        event
      });
    } catch (e) {
      console.error('Failed to parse drag data:', e);
    }
  }
}

// 類型定義
interface DragData {
  data: any;
  group: string;
}

export interface DragStartEvent {
  data: any;
  group: string;
  event: DragEvent;
}

export interface DragEndEvent {
  data: any;
  group: string;
  event: DragEvent;
}

export interface DropEvent {
  data: any;
  group: string;
  event: DragEvent;
}
