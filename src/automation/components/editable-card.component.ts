/**
 * 可編輯卡片基礎組件
 * Editable Card Component
 * 
 * 功能:
 * 1. 查看/編輯/詳情三種模式
 * 2. 統一的編輯狀態管理
 * 3. 操作按鈕 hover 顯示
 * 4. 編輯狀態視覺反饋
 */

import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardMode = 'view' | 'edit' | 'detail';

export interface CardAction {
  id: string;
  icon: string;
  label: string;
  color?: 'default' | 'primary' | 'danger' | 'warning';
  disabled?: boolean;
}

@Component({
  selector: 'app-editable-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="editable-card group relative rounded-xl border transition-all duration-200"
         [class.border-slate-700]="mode() === 'view' && !isHovered()"
         [class.border-cyan-500]="mode() === 'edit' || isHovered()"
         [class.border-purple-500]="isSelected()"
         [class.bg-slate-800/50]="mode() === 'view'"
         [class.bg-slate-750]="mode() === 'edit' || isHovered()"
         [class.bg-purple-500/5]="isSelected()"
         [class.ring-2]="mode() === 'edit'"
         [class.ring-cyan-500/30]="mode() === 'edit'"
         (mouseenter)="isHovered.set(true)"
         (mouseleave)="isHovered.set(false)"
         (dblclick)="onDoubleClick()">
      
      <!-- 選中狀態勾選框 -->
      @if (selectable()) {
        <div class="absolute top-3 left-3 z-10">
          <label class="flex items-center cursor-pointer">
            <input type="checkbox" 
                   [checked]="isSelected()"
                   (change)="toggleSelect()"
                   class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 
                          focus:ring-purple-500 focus:ring-offset-0">
          </label>
        </div>
      }
      
      <!-- 編輯中標籤 -->
      @if (mode() === 'edit') {
        <div class="absolute -top-2 left-4 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
          編輯中
        </div>
      }
      
      <!-- 主內容區 -->
      <div class="p-4" [class.pl-10]="selectable()">
        <ng-content></ng-content>
      </div>
      
      <!-- 操作按鈕區 -->
      @if (showActions() && actions().length > 0) {
        <div class="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
             [class.opacity-100]="mode() === 'edit'">
          @for (action of actions(); track action.id) {
            <button (click)="onAction(action)"
                    [disabled]="action.disabled"
                    [title]="action.label"
                    class="p-1.5 rounded-lg transition-all text-sm"
                    [class.bg-slate-700]="action.color === 'default' || !action.color"
                    [class.hover:bg-slate-600]="action.color === 'default' || !action.color"
                    [class.text-slate-300]="action.color === 'default' || !action.color"
                    [class.bg-cyan-500/20]="action.color === 'primary'"
                    [class.hover:bg-cyan-500/30]="action.color === 'primary'"
                    [class.text-cyan-400]="action.color === 'primary'"
                    [class.bg-red-500/20]="action.color === 'danger'"
                    [class.hover:bg-red-500/30]="action.color === 'danger'"
                    [class.text-red-400]="action.color === 'danger'"
                    [class.bg-yellow-500/20]="action.color === 'warning'"
                    [class.hover:bg-yellow-500/30]="action.color === 'warning'"
                    [class.text-yellow-400]="action.color === 'warning'"
                    [class.opacity-50]="action.disabled"
                    [class.cursor-not-allowed]="action.disabled">
              {{ action.icon }}
            </button>
          }
        </div>
      }
    </div>
  `
})
export class EditableCardComponent {
  // 輸入
  mode = input<CardMode>('view');
  actions = input<CardAction[]>([]);
  showActions = input(true);
  selectable = input(false);
  isSelected = input(false);
  
  // 輸出
  modeChange = output<CardMode>();
  actionClick = output<CardAction>();
  selectChange = output<boolean>();
  doubleClick = output<void>();
  
  // 狀態
  isHovered = signal(false);
  
  onDoubleClick() {
    if (this.mode() === 'view') {
      this.modeChange.emit('edit');
      this.doubleClick.emit();
    }
  }
  
  onAction(action: CardAction) {
    if (!action.disabled) {
      this.actionClick.emit(action);
    }
  }
  
  toggleSelect() {
    this.selectChange.emit(!this.isSelected());
  }
}
