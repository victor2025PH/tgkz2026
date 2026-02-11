/**
 * Phase 10: Backend Error Dialog
 * Extracted from app.component.html (74 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-backend-error-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div class="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-red-500/50">
        
        <!-- Header -->
        <div class="bg-red-500/20 p-6 text-center border-b border-red-500/30">
          <div class="text-5xl mb-3">⚠️</div>
          <h2 class="text-xl font-bold text-red-400">Python 後端未運行</h2>
        </div>
        
        <!-- Content -->
        <div class="p-6 space-y-4">
          <p class="text-slate-300">
            程序需要 Python 環境才能正常運行。請確保：
          </p>
          
          <div class="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <div class="flex items-start gap-3">
              <span class="text-cyan-400">1.</span>
              <div>
                <p class="text-white font-medium">安裝 Python 3.9+</p>
                <a href="https://www.python.org/downloads/" target="_blank" 
                   class="text-cyan-400 text-sm hover:underline">
                  https://www.python.org/downloads/
                </a>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-cyan-400">2.</span>
              <div>
                <p class="text-white font-medium">安裝時勾選 "Add Python to PATH"</p>
                <p class="text-slate-400 text-sm">確保 Python 添加到系統環境變量</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-cyan-400">3.</span>
              <div>
                <p class="text-white font-medium">安裝依賴</p>
                <code class="block bg-slate-800 text-green-400 text-sm p-2 rounded mt-1">
                  pip install pyrogram tgcrypto aiosqlite
                </code>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <span class="text-cyan-400">4.</span>
              <div>
                <p class="text-white font-medium">重新啟動程序</p>
              </div>
            </div>
          </div>
          
          @if (errorDetail()) {
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p class="text-red-400 text-sm">
                <span class="font-medium">錯誤詳情：</span>
                {{ errorDetail() }}
              </p>
            </div>
          }
        </div>
        
        <!-- Footer -->
        <div class="p-4 bg-slate-700/30 flex justify-end gap-3">
          <button (click)="close.emit()" 
                  class="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors">
            我知道了
          </button>
        </div>
      </div>
    </div>
  `
})
export class BackendErrorDialogComponent {
  errorDetail = input<string>('');
  close = output<void>();
}
