/**
 * 關鍵詞集編輯器組件
 * Keyword Set Editor Component
 * 
 * 功能:
 * 1. 標籤式關鍵詞輸入
 * 2. 批量添加 (逗號分隔)
 * 3. 拖拽排序
 * 4. 匹配統計顯示
 * 5. 匹配模式選擇
 */

import { Component, input, output, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface KeywordItem {
  id: string;
  text: string;
  matchCount?: number;
  isNew?: boolean;
}

export interface KeywordSetData {
  id: string;
  name: string;
  keywords: KeywordItem[];
  matchMode: 'exact' | 'fuzzy' | 'regex';
  isActive: boolean;
  totalMatches?: number;
}

@Component({
  selector: 'app-keyword-set-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="keyword-set-editor">
      <!-- 查看模式 -->
      @if (!isEditing()) {
        <div class="flex items-start gap-3">
          <!-- 圖標 -->
          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0"
               [class.bg-orange-500/20]="data().isActive"
               [class.text-orange-400]="data().isActive"
               [class.bg-slate-700]="!data().isActive"
               [class.text-slate-500]="!data().isActive">
            {{ data().name.substring(0, 3) }}
          </div>
          
          <!-- 內容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-white">{{ data().name }}</span>
              @if (data().totalMatches && data().totalMatches > 0) {
                <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                  🔥 {{ data().totalMatches }}
                </span>
              }
            </div>
            
            <!-- 關鍵詞預覽 -->
            <div class="flex flex-wrap gap-1.5">
              @for (kw of previewKeywords(); track kw.id) {
                <span class="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full flex items-center gap-1">
                  {{ kw.text }}
                  @if (kw.matchCount && kw.matchCount > 0) {
                    <span class="text-cyan-400">({{ kw.matchCount }})</span>
                  }
                </span>
              }
              @if (data().keywords.length > 3) {
                <span class="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded-full">
                  +{{ data().keywords.length - 3 }}
                </span>
              }
            </div>
          </div>
          
          <!-- 開關 -->
          <label class="relative inline-flex cursor-pointer shrink-0">
            <input type="checkbox" 
                   [checked]="data().isActive"
                   (change)="toggleActive()"
                   class="sr-only">
            <div class="w-11 h-6 rounded-full transition-all"
                 [class.bg-emerald-500]="data().isActive"
                 [class.bg-slate-600]="!data().isActive">
              <div class="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow"
                   [class.left-5]="data().isActive"
                   [class.left-0.5]="!data().isActive">
              </div>
            </div>
          </label>
        </div>
      }
      
      <!-- 編輯模式 -->
      @if (isEditing()) {
        <div class="space-y-4">
          <!-- 詞集名稱 -->
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">詞集名稱</label>
            <input type="text"
                   [(ngModel)]="editName"
                   class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                          text-white placeholder-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                   placeholder="輸入詞集名稱">
          </div>
          
          <!-- 關鍵詞標籤輸入 -->
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">
              關鍵詞 ({{ editKeywords.length }}個)
            </label>
            <div class="min-h-[80px] p-3 bg-slate-700 border border-slate-600 rounded-lg 
                        focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500">
              <div class="flex flex-wrap gap-2">
                @for (kw of editKeywords; track kw.id; let i = $index) {
                  <span class="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm transition-all"
                        [class.bg-cyan-500/20]="kw.isNew"
                        [class.text-cyan-300]="kw.isNew"
                        [class.bg-slate-600]="!kw.isNew"
                        [class.text-slate-200]="!kw.isNew">
                    {{ kw.text }}
                    <button (click)="removeKeyword(i)"
                            class="w-4 h-4 flex items-center justify-center rounded-full 
                                   opacity-60 hover:opacity-100 hover:bg-red-500/30 hover:text-red-400 transition-all">
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
                       class="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white 
                              placeholder-slate-500 text-sm"
                       placeholder="輸入關鍵詞，按 Enter 添加...">
              </div>
            </div>
            <p class="mt-1.5 text-xs text-slate-500">
              💡 提示: 用逗號分隔可批量添加，例如: 詢價, 價格, 多少錢
            </p>
            
            <!-- 行業預設模板 -->
            <div class="mt-3">
              <label class="block text-xs text-slate-500 mb-2">📦 快速填充行業模板</label>
              <div class="flex flex-wrap gap-1.5">
                @for (tpl of presetTemplates; track tpl.name) {
                  <button (click)="applyTemplate(tpl.keywords)"
                          class="px-2.5 py-1 bg-slate-700/60 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 
                                 text-xs rounded-lg border border-slate-600/50 hover:border-cyan-500/30 transition-all"
                          [title]="tpl.keywords.join(', ')">
                    {{ tpl.icon }} {{ tpl.name }}
                  </button>
                }
              </div>
            </div>
          </div>
          
          <!-- 匹配模式 -->
          <div>
            <label class="block text-xs text-slate-400 mb-1.5">匹配模式</label>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" 
                       name="matchMode" 
                       value="exact"
                       [(ngModel)]="editMatchMode"
                       class="text-cyan-500 bg-slate-700 border-slate-600">
                <span class="text-sm text-slate-300">精確匹配</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" 
                       name="matchMode" 
                       value="fuzzy"
                       [(ngModel)]="editMatchMode"
                       class="text-cyan-500 bg-slate-700 border-slate-600">
                <span class="text-sm text-slate-300">模糊匹配</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" 
                       name="matchMode" 
                       value="regex"
                       [(ngModel)]="editMatchMode"
                       class="text-cyan-500 bg-slate-700 border-slate-600">
                <span class="text-sm text-slate-300">正則表達式</span>
              </label>
            </div>
          </div>
          
          <!-- 操作按鈕 -->
          <div class="flex justify-end gap-2 pt-2 border-t border-slate-700">
            <button (click)="cancelEdit()"
                    class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              ↩️ 取消
            </button>
            <button (click)="saveEdit()"
                    [disabled]="!canSave()"
                    class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg 
                           transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              💾 保存更改
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class KeywordSetEditorComponent implements OnInit {
  @ViewChild('keywordInput') keywordInput!: ElementRef<HTMLInputElement>;
  
  // 輸入
  data = input.required<KeywordSetData>();
  isEditing = input(false);
  
  // 輸出
  save = output<KeywordSetData>();
  cancel = output<void>();
  toggle = output<boolean>();
  startEdit = output<void>();
  
  // 編輯狀態
  editName = '';
  editKeywords: KeywordItem[] = [];
  editMatchMode: 'exact' | 'fuzzy' | 'regex' = 'fuzzy';
  newKeyword = '';
  
  // 行業預設關鍵詞模板
  presetTemplates = [
    { name: '加密貨幣', icon: '💰', keywords: ['USDT', 'BTC', 'ETH', '出U', '收U', '交易', '匯率', '代購', 'OTC', '換匯', '虛擬幣', '數字貨幣'] },
    { name: '電商代購', icon: '🛒', keywords: ['代購', '代發', '價格', '報價', '批發', '一手貨源', '工廠直銷', '微商', '進貨', '分銷'] },
    { name: '遊戲交易', icon: '🎮', keywords: ['代練', '遊戲幣', '賬號', '裝備', '充值', '金幣', '鑽石', '出號', '回收', '遊戲代付'] },
    { name: '金融投資', icon: '📈', keywords: ['理財', '投資', '收益', '返利', '保本', '基金', '股票', '期貨', '外匯', '分紅'] },
    { name: '社交營銷', icon: '📢', keywords: ['引流', '拉人', '推廣', '漲粉', '活躍', '群發', '私信', '精準客戶', '營銷', '獲客'] },
    { name: 'IT 技術', icon: '💻', keywords: ['開發', '接單', '外包', '定制', '程序員', 'APP', '小程序', '網站', '軟件', '系統'] },
  ];
  
  // 計算屬性
  previewKeywords = computed(() => this.data().keywords.slice(0, 3));
  
  canSave = computed(() => {
    return this.editName.trim().length > 0 && this.editKeywords.length > 0;
  });
  
  ngOnInit() {
    this.resetEditState();
  }
  
  resetEditState() {
    const d = this.data();
    this.editName = d.name;
    this.editKeywords = [...d.keywords];
    this.editMatchMode = d.matchMode;
    this.newKeyword = '';
  }
  
  toggleActive() {
    this.toggle.emit(!this.data().isActive);
  }
  
  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addKeywordFromInput();
    } else if (event.key === 'Backspace' && this.newKeyword === '' && this.editKeywords.length > 0) {
      // 刪除最後一個關鍵詞
      this.editKeywords.pop();
    }
  }
  
  addKeywordFromInput() {
    if (!this.newKeyword.trim()) return;
    
    // 支持逗號分隔批量添加
    const keywords = this.newKeyword.split(/[,，]/).map(k => k.trim()).filter(k => k);
    
    for (const kw of keywords) {
      // 檢查重複
      if (!this.editKeywords.some(k => k.text.toLowerCase() === kw.toLowerCase())) {
        this.editKeywords.push({
          id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: kw,
          isNew: true
        });
      }
    }
    
    this.newKeyword = '';
  }
  
  removeKeyword(index: number) {
    this.editKeywords.splice(index, 1);
  }
  
  applyTemplate(keywords: string[]) {
    for (const kw of keywords) {
      if (!this.editKeywords.some(k => k.text.toLowerCase() === kw.toLowerCase())) {
        this.editKeywords.push({
          id: `kw-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: kw,
          isNew: true
        });
      }
    }
  }
  
  saveEdit() {
    if (!this.canSave()) return;
    
    const updatedData: KeywordSetData = {
      ...this.data(),
      name: this.editName.trim(),
      keywords: this.editKeywords.map(k => ({ ...k, isNew: false })),
      matchMode: this.editMatchMode
    };
    
    this.save.emit(updatedData);
  }
  
  cancelEdit() {
    this.resetEditState();
    this.cancel.emit();
  }
}
