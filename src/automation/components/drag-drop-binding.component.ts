/**
 * 拖拽綁定組件
 * Drag & Drop Binding Component
 * 
 * 功能:
 * 1. 可拖拽的關鍵詞集芯片
 * 2. 可放置的群組卡片
 * 3. 視覺反饋動畫
 */

import { Component, input, output, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

// 可拖拽的關鍵詞集芯片
@Component({
  selector: 'app-draggable-keyword-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="draggable-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-grab
                transition-all duration-200 select-none"
         [class.bg-cyan-500/30]="!isDragging()"
         [class.text-cyan-300]="!isDragging()"
         [class.border-cyan-500/50]="!isDragging()"
         [class.bg-cyan-500]="isDragging()"
         [class.text-white]="isDragging()"
         [class.shadow-lg]="isDragging()"
         [class.shadow-cyan-500/30]="isDragging()"
         [class.scale-105]="isDragging()"
         [class.cursor-grabbing]="isDragging()"
         [class.border]="true"
         [attr.draggable]="true"
         (dragstart)="onDragStart($event)"
         (dragend)="onDragEnd($event)">
      <span class="text-sm">🔑</span>
      <span class="text-sm font-medium">{{ name() }}</span>
      <span class="text-xs opacity-70">({{ keywordCount() }})</span>
    </div>
  `,
  styles: [`
    .draggable-chip {
      touch-action: none;
    }
    .draggable-chip:active {
      cursor: grabbing;
    }
  `]
})
export class DraggableKeywordChipComponent {
  id = input.required<string>();
  name = input.required<string>();
  keywordCount = input(0);
  
  isDragging = signal(false);
  
  dragStart = output<{ id: string; name: string }>();
  dragEnd = output<void>();
  
  onDragStart(event: DragEvent) {
    this.isDragging.set(true);
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'keyword-set',
        id: this.id(),
        name: this.name()
      }));
      event.dataTransfer.effectAllowed = 'copy';
    }
    this.dragStart.emit({ id: this.id(), name: this.name() });
  }
  
  onDragEnd(event: DragEvent) {
    this.isDragging.set(false);
    this.dragEnd.emit();
  }
}

// 可放置的群組卡片
@Component({
  selector: 'app-droppable-group-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="droppable-card relative p-4 rounded-xl transition-all duration-200 border-2"
         [class.bg-slate-700/50]="!isDragOver()"
         [class.border-transparent]="!isDragOver()"
         [class.bg-emerald-500/10]="isDragOver()"
         [class.border-emerald-500]="isDragOver()"
         [class.border-dashed]="isDragOver()"
         (dragover)="onDragOver($event)"
         (dragleave)="onDragLeave($event)"
         (drop)="onDrop($event)">
      
      <!-- 拖拽提示覆蓋層 -->
      @if (isDragOver()) {
        <div class="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-xl z-10 pointer-events-none">
          <div class="flex items-center gap-2 text-emerald-400 font-medium">
            <span class="text-xl">✨</span>
            <span>放開以綁定詞集</span>
          </div>
        </div>
      }
      
      <!-- 群組內容 -->
      <div class="flex items-center gap-3" [class.opacity-50]="isDragOver()">
        <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 text-xl shrink-0">
          👥
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-white truncate">{{ name() }}</div>
          <div class="text-xs text-slate-400 flex items-center gap-2">
            <span>{{ memberCount() }} 成員</span>
            @if (linkedSetCount() > 0) {
              <span class="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                {{ linkedSetCount() }} 詞集
              </span>
            } @else {
              <span class="text-amber-400">未綁定詞集</span>
            }
          </div>
        </div>
        
        <!-- 已綁定的詞集標籤 -->
        @if (linkedSets().length > 0) {
          <div class="flex flex-wrap gap-1 max-w-[150px]">
            @for (set of linkedSets().slice(0, 2); track set) {
              <span class="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded truncate max-w-[60px]">
                {{ set }}
              </span>
            }
            @if (linkedSets().length > 2) {
              <span class="px-1.5 py-0.5 bg-slate-600 text-slate-400 text-xs rounded">
                +{{ linkedSets().length - 2 }}
              </span>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class DroppableGroupCardComponent {
  id = input.required<string>();
  name = input.required<string>();
  memberCount = input(0);
  linkedSets = input<string[]>([]);
  linkedSetCount = input(0);
  
  isDragOver = signal(false);
  
  keywordSetDropped = output<{ groupId: string; keywordSetId: string; keywordSetName: string }>();
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOver.set(true);
  }
  
  onDragLeave(event: DragEvent) {
    this.isDragOver.set(false);
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    
    if (event.dataTransfer) {
      const data = event.dataTransfer.getData('application/json');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'keyword-set') {
            this.keywordSetDropped.emit({
              groupId: this.id(),
              keywordSetId: parsed.id,
              keywordSetName: parsed.name
            });
          }
        } catch (e) {
          console.error('Failed to parse drag data:', e);
        }
      }
    }
  }
}

// 拖拽綁定區域組件 (用於顯示拖拽說明)
@Component({
  selector: 'app-drag-drop-hint',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="drag-hint flex items-center gap-2 px-3 py-2 bg-slate-700/30 rounded-lg text-sm text-slate-400"
         [class.text-cyan-400]="isActive()"
         [class.bg-cyan-500/10]="isActive()">
      <span>💡</span>
      @if (isActive()) {
        <span>將詞集拖到群組卡片上以綁定</span>
      } @else {
        <span>拖拽詞集到群組可快速綁定</span>
      }
    </div>
  `
})
export class DragDropHintComponent {
  isActive = input(false);
}
