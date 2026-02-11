/**
 * Phase 10: Keyword Set Creator Dialog
 * Extracted from app.component.html (43 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-keyword-creator-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]"
         (click)="cancel.emit()">
      <div class="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-cyan-500/30"
           (click)="$event.stopPropagation()">
        
        <!-- Header -->
        <div class="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 border-b border-slate-700/50">
          <h2 class="text-lg font-bold text-white flex items-center gap-2">
            <span>🔑</span> 創建關鍵詞集
          </h2>
        </div>
        
        <!-- Content -->
        <div class="p-6">
          <label class="block text-sm text-slate-400 mb-2">關鍵詞集名稱</label>
          <input type="text" 
                 class="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white 
                        focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                 placeholder="例如：買家意向、產品諮詢..."
                 [value]="name()"
                 (input)="nameChange.emit($any($event.target).value)"
                 (keyup.enter)="submit.emit()"
                 autofocus>
          <p class="text-xs text-slate-500 mt-2">
            💡 創建後可在詞集中添加多個關鍵詞
          </p>
        </div>
        
        <!-- Footer -->
        <div class="p-4 bg-slate-700/30 flex justify-end gap-3">
          <button (click)="cancel.emit()" 
                  class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
            取消
          </button>
          <button (click)="submit.emit()" 
                  class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors font-medium">
            創建
          </button>
        </div>
      </div>
    </div>
  `
})
export class KeywordCreatorDialogComponent {
  name = input('');
  cancel = output<void>();
  submit = output<void>();
  nameChange = output<string>();
}
