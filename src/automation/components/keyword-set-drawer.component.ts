/**
 * 關鍵詞集編輯抽屜組件
 * Keyword Set Editor Drawer Component
 * 
 * 功能:
 * 1. 關鍵詞集詳情顯示
 * 2. 標籤式關鍵詞編輯
 * 3. 批量添加 (逗號分隔)
 * 4. 匹配模式設置
 * 5. 匹配統計展示
 */

import { Component, input, output, signal, OnInit, OnChanges, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlideDrawerComponent } from './slide-drawer.component';

export interface KeywordItemData {
  id: string;
  text: string;
  matchCount?: number;
  isNew?: boolean;
}

export interface KeywordSetDetailData {
  id: string;
  name: string;
  keywords: KeywordItemData[];
  matchMode: 'exact' | 'fuzzy' | 'regex';
  isActive: boolean;
  totalMatches?: number;
  createdAt?: string;
  // 統計
  stats?: {
    matchesToday: number;
    matchesWeek: number;
    leadsGenerated: number;
  };
  // 綁定的群組
  linkedGroups?: { id: string; name: string }[];
}

@Component({
  selector: 'app-keyword-set-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, SlideDrawerComponent],
  template: `
    <app-slide-drawer
      [isOpen]="isOpen()"
      [title]="isNew() ? '新建關鍵詞集' : (keywordSet()?.name || '關鍵詞集')"
      [subtitle]="isNew() ? '創建新的關鍵詞集' : (keywordSet()?.keywords?.length || 0) + ' 個關鍵詞'"
      icon="🔑"
      size="lg"
      [hasUnsavedChanges]="hasChanges()"
      (close)="onClose()">
      
      <div class="p-4 space-y-6">
        <!-- 基本設置 -->
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <span>📝</span> 基本設置
          </h3>
          <div class="space-y-4">
            <!-- 詞集名稱 -->
            <div>
              <label class="block text-sm text-slate-400 mb-1.5">詞集名稱</label>
              <input type="text"
                     [(ngModel)]="editData.name"
                     (input)="markChanged()"
                     class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                     placeholder="例如: 詢價相關">
            </div>
            
            <!-- 啟用狀態 -->
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                          hover:bg-slate-700 transition-colors">
              <div>
                <div class="text-sm text-white font-medium">啟用詞集</div>
                <div class="text-xs text-slate-400">禁用後將暫停匹配</div>
              </div>
              <input type="checkbox" 
                     [(ngModel)]="editData.isActive"
                     (change)="markChanged()"
                     class="w-5 h-5 rounded text-emerald-500 bg-slate-600 border-slate-500 
                            focus:ring-emerald-500 focus:ring-offset-0">
            </label>
          </div>
        </div>
        
        <!-- 關鍵詞列表 -->
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <span>🏷️</span> 關鍵詞
            <span class="text-xs text-slate-500">({{ editData.keywords.length }}個)</span>
            @if (editData.totalMatches && editData.totalMatches > 0) {
              <span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full ml-auto">
                🔥 總匹配 {{ editData.totalMatches }}
              </span>
            }
          </h3>
          
          <!-- 關鍵詞標籤區 -->
          <div class="min-h-[120px] p-3 bg-slate-700/50 border border-slate-600 rounded-lg 
                      focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
            <div class="flex flex-wrap gap-2">
              @for (kw of editData.keywords; track kw.id; let i = $index) {
                <span class="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
                      [class.bg-cyan-500/20]="kw.isNew"
                      [class.text-cyan-300]="kw.isNew"
                      [class.border]="kw.isNew"
                      [class.border-cyan-500/30]="kw.isNew"
                      [class.bg-slate-600]="!kw.isNew"
                      [class.text-slate-200]="!kw.isNew">
                  <span>{{ kw.text }}</span>
                  @if (kw.matchCount && kw.matchCount > 0) {
                    <span class="text-xs opacity-60">({{ kw.matchCount }})</span>
                  }
                  <button (click)="removeKeyword(i)"
                          class="w-5 h-5 flex items-center justify-center rounded-full 
                                 opacity-60 hover:opacity-100 hover:bg-red-500/30 hover:text-red-400 
                                 transition-all text-lg leading-none">
                    ×
                  </button>
                </span>
              }
              
              <!-- 輸入框 -->
              <input #keywordInput
                     type="text"
                     [(ngModel)]="newKeyword"
                     (keydown)="onKeydown($event)"
                     (blur)="addKeywordFromInput()"
                     class="flex-1 min-w-[150px] bg-transparent border-none outline-none text-white 
                            placeholder-slate-500 text-sm py-1.5"
                     placeholder="輸入關鍵詞，按 Enter 添加...">
            </div>
          </div>
          
          <!-- 提示 -->
          <div class="mt-3 flex items-center justify-between">
            <p class="text-xs text-slate-500">
              💡 用逗號分隔可批量添加，例如: 詢價, 價格, 多少錢
            </p>
            <button (click)="clearAllKeywords()"
                    [disabled]="editData.keywords.length === 0"
                    class="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed">
              清空全部
            </button>
          </div>
        </div>
        
        <!-- 匹配模式 -->
        <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <span>⚙️</span> 匹配模式
          </h3>
          <div class="space-y-2">
            <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                   [class.bg-cyan-500/10]="editData.matchMode === 'exact'"
                   [class.border]="editData.matchMode === 'exact'"
                   [class.border-cyan-500/30]="editData.matchMode === 'exact'"
                   [class.bg-slate-700/50]="editData.matchMode !== 'exact'"
                   [class.hover:bg-slate-700]="editData.matchMode !== 'exact'">
              <input type="radio" 
                     name="matchMode" 
                     value="exact"
                     [(ngModel)]="editData.matchMode"
                     (change)="markChanged()"
                     class="text-cyan-500 bg-slate-600 border-slate-500">
              <div>
                <div class="text-sm text-white font-medium">精確匹配</div>
                <div class="text-xs text-slate-400">消息必須完全包含關鍵詞</div>
              </div>
            </label>
            
            <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                   [class.bg-cyan-500/10]="editData.matchMode === 'fuzzy'"
                   [class.border]="editData.matchMode === 'fuzzy'"
                   [class.border-cyan-500/30]="editData.matchMode === 'fuzzy'"
                   [class.bg-slate-700/50]="editData.matchMode !== 'fuzzy'"
                   [class.hover:bg-slate-700]="editData.matchMode !== 'fuzzy'">
              <input type="radio" 
                     name="matchMode" 
                     value="fuzzy"
                     [(ngModel)]="editData.matchMode"
                     (change)="markChanged()"
                     class="text-cyan-500 bg-slate-600 border-slate-500">
              <div>
                <div class="text-sm text-white font-medium">模糊匹配</div>
                <div class="text-xs text-slate-400">忽略大小寫，支持部分匹配</div>
              </div>
            </label>
            
            <label class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                   [class.bg-cyan-500/10]="editData.matchMode === 'regex'"
                   [class.border]="editData.matchMode === 'regex'"
                   [class.border-cyan-500/30]="editData.matchMode === 'regex'"
                   [class.bg-slate-700/50]="editData.matchMode !== 'regex'"
                   [class.hover:bg-slate-700]="editData.matchMode !== 'regex'">
              <input type="radio" 
                     name="matchMode" 
                     value="regex"
                     [(ngModel)]="editData.matchMode"
                     (change)="markChanged()"
                     class="text-cyan-500 bg-slate-600 border-slate-500">
              <div>
                <div class="text-sm text-white font-medium">正則表達式</div>
                <div class="text-xs text-slate-400">使用正則表達式進行高級匹配</div>
              </div>
            </label>
          </div>
        </div>
        
        <!-- 統計數據 (僅編輯模式) -->
        @if (!isNew() && keywordSet()?.stats) {
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>📊</span> 匹配統計
            </h3>
            <div class="grid grid-cols-3 gap-3">
              <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                <div class="text-2xl font-bold text-cyan-400">{{ keywordSet()!.stats!.matchesToday }}</div>
                <div class="text-xs text-slate-400 mt-1">今日匹配</div>
              </div>
              <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                <div class="text-2xl font-bold text-purple-400">{{ keywordSet()!.stats!.matchesWeek }}</div>
                <div class="text-xs text-slate-400 mt-1">本週匹配</div>
              </div>
              <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                <div class="text-2xl font-bold text-emerald-400">{{ keywordSet()!.stats!.leadsGenerated }}</div>
                <div class="text-xs text-slate-400 mt-1">生成 Leads</div>
              </div>
            </div>
          </div>
        }
        
        <!-- 綁定的群組 (僅編輯模式) -->
        @if (!isNew() && keywordSet()?.linkedGroups && keywordSet()!.linkedGroups!.length > 0) {
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>👥</span> 已綁定群組
              <span class="text-xs text-slate-500">({{ keywordSet()!.linkedGroups!.length }})</span>
            </h3>
            <div class="flex flex-wrap gap-2">
              @for (group of keywordSet()!.linkedGroups!; track group.id) {
                <span class="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                  {{ group.name }}
                </span>
              }
            </div>
          </div>
        }
      </div>
      
      <!-- 底部操作欄 -->
      <div drawer-footer class="flex items-center justify-between">
        <div class="flex gap-2">
          @if (!isNew()) {
            <button (click)="onDelete()"
                    class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 
                           rounded-lg transition-colors flex items-center gap-2 text-sm">
              🗑️ 刪除詞集
            </button>
          }
        </div>
        <div class="flex gap-2">
          <button (click)="onClose()"
                  class="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm">
            取消
          </button>
          <button (click)="onSave()"
                  [disabled]="!canSave()"
                  class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg 
                         transition-colors flex items-center gap-2 text-sm font-medium
                         disabled:opacity-50 disabled:cursor-not-allowed">
            💾 {{ isNew() ? '創建詞集' : '保存更改' }}
          </button>
        </div>
      </div>
    </app-slide-drawer>
  `
})
export class KeywordSetDrawerComponent implements OnInit, OnChanges {
  @ViewChild('keywordInput') keywordInput!: ElementRef<HTMLInputElement>;
  private cdr = inject(ChangeDetectorRef);
  
  // 輸入
  isOpen = input(false);
  keywordSet = input<KeywordSetDetailData | null>(null);
  isNew = input(false);
  
  // 輸出
  close = output<void>();
  save = output<KeywordSetDetailData>();
  delete = output<KeywordSetDetailData>();
  
  // 編輯狀態
  editData: {
    name: string;
    keywords: KeywordItemData[];
    matchMode: 'exact' | 'fuzzy' | 'regex';
    isActive: boolean;
    totalMatches?: number;
  } = {
    name: '',
    keywords: [],
    matchMode: 'fuzzy',
    isActive: true
  };
  
  newKeyword = '';
  hasChanges = signal(false);
  
  // 改用方法而非 computed，因為 editData 不是 signal
  canSave(): boolean {
    const result = this.editData.name.trim().length > 0 && this.editData.keywords.length > 0;
    return result;
  }
  
  ngOnInit() {
    this.resetEditData();
  }
  
  ngOnChanges() {
    this.resetEditData();
  }
  
  resetEditData() {
    const set = this.keywordSet();
    if (set) {
      this.editData = {
        name: set.name,
        keywords: set.keywords.map(k => ({ ...k })),
        matchMode: set.matchMode,
        isActive: set.isActive,
        totalMatches: set.totalMatches
      };
    } else if (this.isNew()) {
      this.editData = {
        name: '',
        keywords: [],
        matchMode: 'fuzzy',
        isActive: true
      };
    }
    this.newKeyword = '';
    this.hasChanges.set(false);
    this.cdr.markForCheck();
  }
  
  markChanged() {
    this.hasChanges.set(true);
    this.cdr.markForCheck();
  }
  
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addKeywordFromInput();
    } else if (event.key === 'Backspace' && this.newKeyword === '' && this.editData.keywords.length > 0) {
      this.editData.keywords.pop();
      this.markChanged();
    }
  }
  
  addKeywordFromInput() {
    if (!this.newKeyword.trim()) return;
    
    // 支持逗號分隔批量添加
    const keywords = this.newKeyword.split(/[,，]/).map(k => k.trim()).filter(k => k);
    
    for (const kw of keywords) {
      if (!this.editData.keywords.some(k => k.text.toLowerCase() === kw.toLowerCase())) {
        this.editData.keywords.push({
          id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: kw,
          isNew: true
        });
      }
    }
    
    this.newKeyword = '';
    this.markChanged();
  }
  
  removeKeyword(index: number) {
    this.editData.keywords.splice(index, 1);
    this.markChanged();
  }
  
  clearAllKeywords() {
    if (confirm('確定要清空所有關鍵詞嗎？')) {
      this.editData.keywords = [];
      this.markChanged();
    }
  }
  
  onClose() {
    this.close.emit();
  }
  
  onSave() {
    if (!this.canSave()) return;
    
    const result: KeywordSetDetailData = {
      id: this.keywordSet()?.id || `set-${Date.now()}`,
      name: this.editData.name.trim(),
      keywords: this.editData.keywords.map(k => ({ ...k, isNew: false })),
      matchMode: this.editData.matchMode,
      isActive: this.editData.isActive,
      totalMatches: this.editData.totalMatches,
      stats: this.keywordSet()?.stats,
      linkedGroups: this.keywordSet()?.linkedGroups
    };
    
    this.save.emit(result);
    this.hasChanges.set(false);
  }
  
  onDelete() {
    if (this.keywordSet()) {
      this.delete.emit(this.keywordSet()!);
    }
  }
}
