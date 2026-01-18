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
    <div class="droppable-card relative p-4 rounded-xl transition-all duration-200 border-2 cursor-pointer hover:bg-slate-700/70"
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
      <div class="flex items-start gap-3" [class.opacity-50]="isDragOver()">
        <!-- 群組頭像 -->
        <div class="w-12 h-12 rounded-xl overflow-hidden shrink-0"
             [style.background]="'linear-gradient(135deg, ' + getGradientColor() + ')'">
          @if (avatar()) {
            <img [src]="avatar()" alt="群組頭像" class="w-full h-full object-cover">
          } @else {
            <div class="w-full h-full flex items-center justify-center text-white text-xl">
              {{ getInitial() }}
            </div>
          }
        </div>
        
        <div class="flex-1 min-w-0">
          <!-- 群組名稱 -->
          <div class="font-medium text-white truncate">{{ displayName() }}</div>
          
          <!-- 群組 URL (如果名稱不是 URL) -->
          @if (showUrl()) {
            <div class="text-xs text-slate-500 truncate">{{ url() }}</div>
          }
          
          <!-- 統計行 -->
          <div class="flex items-center gap-3 mt-1 text-xs">
            <span class="text-slate-400 flex items-center gap-1">
              <span>👥</span> {{ memberCount() || 0 }} 成員
            </span>
            @if (matchesToday() > 0) {
              <span class="text-emerald-400 flex items-center gap-1">
                <span>🎯</span> {{ matchesToday() }} 匹配
              </span>
            }
            @if (leadsToday() > 0) {
              <span class="text-cyan-400 flex items-center gap-1">
                <span>👤</span> {{ leadsToday() }} Lead
              </span>
            }
          </div>
          
          <!-- 已綁定詞集 -->
          <div class="flex items-center gap-2 mt-2">
            @if (linkedSets().length > 0) {
              @for (set of linkedSets().slice(0, 3); track set) {
                <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                  🔑 {{ set }}
                </span>
              }
              @if (linkedSets().length > 3) {
                <span class="text-xs text-slate-500">+{{ linkedSets().length - 3 }}</span>
              }
            } @else {
              <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                ⚠ 未綁定詞集
              </span>
            }
          </div>
        </div>
        
        <!-- 箭頭 -->
        <div class="text-slate-500 text-lg">›</div>
      </div>
    </div>
  `
})
export class DroppableGroupCardComponent {
  id = input.required<string>();
  name = input.required<string>();
  url = input<string>('');
  avatar = input<string>('');
  memberCount = input(0);
  matchesToday = input(0);
  leadsToday = input(0);
  linkedSets = input<string[]>([]);
  linkedSetCount = input(0);
  
  // 顯示名稱：如果 name 是 URL，則截取最後部分
  displayName = () => {
    const n = this.name();
    if (n.startsWith('http') || n.startsWith('t.me')) {
      const parts = n.split('/');
      return parts[parts.length - 1] || n;
    }
    return n;
  };
  
  // 是否顯示 URL（當名稱不是 URL 時顯示）
  showUrl = () => {
    const n = this.name();
    const u = this.url();
    return u && !n.startsWith('http') && !n.startsWith('t.me');
  };
  
  // 獲取首字母
  getInitial = () => {
    const n = this.displayName();
    return n ? n.charAt(0).toUpperCase() : '?';
  };
  
  // 獲取漸變顏色（基於名稱生成）
  getGradientColor = () => {
    const colors = [
      ['#8B5CF6', '#6366F1'],  // 紫色
      ['#EC4899', '#F43F5E'],  // 粉色
      ['#06B6D4', '#0EA5E9'],  // 青色
      ['#10B981', '#22C55E'],  // 綠色
      ['#F59E0B', '#EAB308'],  // 黃色
      ['#EF4444', '#F97316'],  // 紅橙
    ];
    const hash = this.name().split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const pair = colors[hash % colors.length];
    return pair.join(', ');
  };
  
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
