/**
 * 快捷鍵幫助組件
 * Shortcuts Help Component
 * 
 * 🆕 體驗優化: 鍵盤快捷鍵支持
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService, ShortcutCategory } from '../services/keyboard-shortcuts.service';

@Component({
  selector: 'app-shortcuts-help',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (service.isHelpVisible()) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
           (click)="service.hideHelp()">
        <div class="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
             (click)="$event.stopPropagation()">
          
          <!-- 標題 -->
          <div class="p-6 border-b border-slate-700/50 flex items-center justify-between">
            <h2 class="text-xl font-bold text-white flex items-center gap-3">
              <span>⌨️</span>
              鍵盤快捷鍵
            </h2>
            <button (click)="service.hideHelp()"
                    class="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          
          <!-- 快捷鍵列表 -->
          <div class="p-6 overflow-y-auto max-h-[60vh]">
            <div class="grid grid-cols-2 gap-8">
              @for (category of categories; track category) {
                <div class="space-y-3">
                  <h3 class="text-sm font-medium text-slate-400 uppercase tracking-wide">
                    {{ service.getCategoryLabel(category) }}
                  </h3>
                  
                  <div class="space-y-2">
                    @for (shortcut of getShortcutsForCategory(category); track shortcut.id) {
                      <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                        <span class="text-sm text-slate-300">{{ shortcut.description }}</span>
                        <kbd class="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 font-mono">
                          {{ formatKey(shortcut.key) }}
                        </kbd>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
          
          <!-- 底部提示 -->
          <div class="p-4 border-t border-slate-700/50 bg-slate-800/50 text-center">
            <p class="text-xs text-slate-500">
              按 <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">?</kbd> 再次顯示此幫助
            </p>
          </div>
        </div>
      </div>
    }
  `
})
export class ShortcutsHelpComponent {
  service = inject(KeyboardShortcutsService);
  
  categories: ShortcutCategory[] = ['navigation', 'actions', 'view', 'tools'];
  
  getShortcutsForCategory(category: ShortcutCategory) {
    return this.service.shortcutsByCategory().get(category) || [];
  }
  
  formatKey(key: string): string {
    return this.service.formatKey(key);
  }
}
