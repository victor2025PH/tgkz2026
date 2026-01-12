/**
 * Shortcuts Help Dialog Component
 * Displays available keyboard shortcuts
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService } from './keyboard-shortcuts.service';

@Component({
  selector: 'app-shortcuts-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(shortcutsService.showHelp()) {
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center"
           (click)="close()">
        <div class="bg-slate-800/95 rounded-xl p-6 shadow-2xl border border-slate-600 max-w-lg w-full mx-4"
             (click)="$event.stopPropagation()">
          <!-- Header -->
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-white flex items-center gap-2">
              <svg class="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              鍵盤快捷鍵
            </h2>
            <button (click)="close()" 
                    class="text-slate-400 hover:text-white transition-colors p-1">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Shortcuts List -->
          <div class="space-y-3 max-h-96 overflow-y-auto">
            <!-- Common Shortcuts -->
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-cyan-400 mb-2">通用操作</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">保存</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘' : 'Ctrl' }}+S</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">取消/關閉</span>
                  <kbd class="shortcut-key">Esc</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">刷新</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘' : 'Ctrl' }}+R</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">搜索</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘' : 'Ctrl' }}+F</kbd>
                </div>
              </div>
            </div>
            
            <!-- System Shortcuts -->
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-green-400 mb-2">系統控制</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">一鍵啟動</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘' : 'Ctrl' }}+{{ isMac ? '↵' : 'Enter' }}</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">停止所有</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘⇧' : 'Ctrl+Shift' }}+S</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">切換側邊欄</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘' : 'Ctrl' }}+B</kbd>
                </div>
              </div>
            </div>
            
            <!-- Navigation Shortcuts -->
            <div class="mb-4">
              <h3 class="text-sm font-semibold text-yellow-400 mb-2">快速導航</h3>
              <div class="space-y-2">
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">跳轉到標籤 1-9</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌥' : 'Alt' }}+1~9</kbd>
                </div>
                <div class="flex justify-between items-center py-1.5 border-b border-slate-700">
                  <span class="text-slate-300">顯示此幫助</span>
                  <kbd class="shortcut-key">{{ isMac ? '⌘⇧' : 'Ctrl+Shift' }}+?</kbd>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="mt-6 pt-4 border-t border-slate-700 text-center">
            <p class="text-xs text-slate-500">按 Esc 關閉此對話框</p>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .shortcut-key {
      @apply bg-slate-700 text-cyan-300 px-2 py-1 rounded text-sm font-mono;
    }
  `]
})
export class ShortcutsHelpComponent {
  shortcutsService = inject(KeyboardShortcutsService);
  isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  close(): void {
    this.shortcutsService.showHelp.set(false);
  }
}
