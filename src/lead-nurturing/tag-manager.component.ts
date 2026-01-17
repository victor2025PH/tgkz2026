/**
 * 標籤管理組件
 * Tag Manager Component
 * 
 * 功能:
 * 1. 標籤選擇器
 * 2. 標籤輸入（支持新建）
 * 3. 標籤顏色顯示
 */

import { Component, input, output, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadClassifierService, TagCategory } from './lead-classifier.service';

@Component({
  selector: 'app-tag-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tag-selector">
      <!-- 已選標籤 -->
      <div class="flex flex-wrap gap-1.5 mb-2">
        @for (tag of selectedTags(); track tag) {
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                [style.backgroundColor]="classifierService.getTagColor(tag) + '40'"
                [style.borderColor]="classifierService.getTagColor(tag)"
                style="border-width: 1px;">
            {{ tag }}
            <button (click)="removeTag(tag)"
                    class="w-4 h-4 rounded-full hover:bg-white/20 flex items-center justify-center">
              ✕
            </button>
          </span>
        }
        @if (selectedTags().length === 0) {
          <span class="text-xs text-slate-500">點擊下方標籤添加</span>
        }
      </div>
      
      <!-- 搜索/新建輸入框 -->
      <div class="relative mb-3">
        <input type="text"
               [(ngModel)]="searchText"
               (keyup.enter)="addCustomTag()"
               class="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white
                      placeholder-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
               placeholder="搜索或輸入新標籤...">
        @if (searchText) {
          <button (click)="addCustomTag()"
                  class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-cyan-500/20 text-cyan-400 
                         text-xs rounded hover:bg-cyan-500/30 transition-colors">
            + 新建
          </button>
        }
      </div>
      
      <!-- 標籤類別 -->
      <div class="space-y-3 max-h-60 overflow-y-auto">
        @for (category of filteredCategories(); track category.id) {
          <div>
            <div class="text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" [style.backgroundColor]="category.color"></span>
              {{ category.name }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              @for (tag of getFilteredTags(category); track tag) {
                <button (click)="toggleTag(tag)"
                        class="px-2 py-1 rounded-lg text-xs transition-all"
                        [class.bg-slate-700]="!isSelected(tag)"
                        [class.text-slate-300]="!isSelected(tag)"
                        [class.hover:bg-slate-600]="!isSelected(tag)"
                        [style.backgroundColor]="isSelected(tag) ? category.color + '40' : ''"
                        [style.borderColor]="isSelected(tag) ? category.color : 'transparent'"
                        [style.color]="isSelected(tag) ? category.color : ''"
                        style="border-width: 1px;">
                  {{ tag }}
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class TagSelectorComponent {
  classifierService = inject(LeadClassifierService);
  
  // 輸入
  selectedTags = input<string[]>([]);
  maxTags = input(10);
  
  // 輸出
  tagsChange = output<string[]>();
  
  // 搜索文本
  searchText = '';
  
  // 過濾後的類別
  filteredCategories = computed(() => {
    const categories = this.classifierService.tagCategories();
    if (!this.searchText) return categories;
    
    return categories.filter(c => 
      c.tags.some(t => t.toLowerCase().includes(this.searchText.toLowerCase()))
    );
  });
  
  // 獲取過濾後的標籤
  getFilteredTags(category: TagCategory): string[] {
    if (!this.searchText) return category.tags;
    return category.tags.filter(t => 
      t.toLowerCase().includes(this.searchText.toLowerCase())
    );
  }
  
  // 是否已選中
  isSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }
  
  // 切換標籤
  toggleTag(tag: string) {
    const current = [...this.selectedTags()];
    const index = current.indexOf(tag);
    
    if (index > -1) {
      current.splice(index, 1);
    } else if (current.length < this.maxTags()) {
      current.push(tag);
    }
    
    this.tagsChange.emit(current);
  }
  
  // 移除標籤
  removeTag(tag: string) {
    const current = this.selectedTags().filter(t => t !== tag);
    this.tagsChange.emit(current);
  }
  
  // 添加自定義標籤
  addCustomTag() {
    const tag = this.searchText.trim();
    if (!tag) return;
    
    // 檢查是否已存在
    if (!this.classifierService.allTags().includes(tag)) {
      this.classifierService.addCustomTag(tag);
    }
    
    // 添加到選中列表
    if (!this.selectedTags().includes(tag) && this.selectedTags().length < this.maxTags()) {
      this.tagsChange.emit([...this.selectedTags(), tag]);
    }
    
    this.searchText = '';
  }
}

// 標籤顯示組件（只讀）
@Component({
  selector: 'app-tag-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap gap-1">
      @for (tag of tags().slice(0, maxDisplay()); track tag) {
        <span class="px-1.5 py-0.5 rounded text-xs"
              [style.backgroundColor]="getTagColor(tag) + '30'"
              [style.color]="getTagColor(tag)">
          {{ tag }}
        </span>
      }
      @if (tags().length > maxDisplay()) {
        <span class="px-1.5 py-0.5 bg-slate-600 text-slate-400 rounded text-xs">
          +{{ tags().length - maxDisplay() }}
        </span>
      }
      @if (tags().length === 0 && showEmpty()) {
        <span class="text-xs text-slate-500">無標籤</span>
      }
    </div>
  `
})
export class TagDisplayComponent {
  private classifierService = inject(LeadClassifierService);
  
  tags = input<string[]>([]);
  maxDisplay = input(3);
  showEmpty = input(false);
  
  getTagColor(tag: string): string {
    return this.classifierService.getTagColor(tag);
  }
}

// 快速標籤組件（常用標籤快捷選擇）
@Component({
  selector: 'app-quick-tags',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap gap-1">
      @for (tag of quickTags(); track tag) {
        <button (click)="toggleTag(tag)"
                class="px-2 py-1 rounded-lg text-xs transition-all"
                [class.bg-slate-700]="!isSelected(tag)"
                [class.text-slate-300]="!isSelected(tag)"
                [class.hover:bg-slate-600]="!isSelected(tag)"
                [style.backgroundColor]="isSelected(tag) ? getTagColor(tag) + '40' : ''"
                [style.color]="isSelected(tag) ? getTagColor(tag) : ''">
          {{ tag }}
        </button>
      }
    </div>
  `
})
export class QuickTagsComponent {
  private classifierService = inject(LeadClassifierService);
  
  selectedTags = input<string[]>([]);
  quickTags = input<string[]>(['🔥 高意向', '⭐ 高活躍', '💎 VIP', '待跟進']);
  
  tagsChange = output<string[]>();
  
  isSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }
  
  getTagColor(tag: string): string {
    return this.classifierService.getTagColor(tag);
  }
  
  toggleTag(tag: string) {
    const current = [...this.selectedTags()];
    const index = current.indexOf(tag);
    
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(tag);
    }
    
    this.tagsChange.emit(current);
  }
}
