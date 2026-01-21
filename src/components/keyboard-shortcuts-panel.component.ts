/**
 * 快捷鍵面板組件
 * Keyboard Shortcuts Panel Component
 */

import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeyboardShortcutsService } from '../services/keyboard-shortcuts.service';

@Component({
  selector: 'app-keyboard-shortcuts-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shortcuts.showPanel()) {
      <!-- 遮罩 -->
      <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" 
           (click)="shortcuts.togglePanel()">
      </div>
      
      <!-- 面板 -->
      <div class="fixed inset-4 md:inset-10 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl z-50 overflow-hidden flex flex-col">
        
        <!-- 頭部 -->
        <div class="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            ⌨️ 鍵盤快捷鍵
          </h2>
          <button (click)="shortcuts.togglePanel()" 
                  class="text-slate-400 hover:text-white transition-colors">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <!-- 內容 -->
        <div class="flex-1 overflow-y-auto p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @for (category of shortcuts.shortcutsByCategory(); track category.id) {
              <div class="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span class="text-xl">{{ category.icon }}</span>
                  {{ category.name }}
                </h3>
                
                <div class="space-y-3">
                  @for (shortcut of category.shortcuts; track shortcut.id) {
                    <div class="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
                         [class.opacity-50]="!shortcut.enabled">
                      <div class="flex-1">
                        <div class="text-sm text-white">{{ shortcut.name }}</div>
                        <div class="text-xs text-slate-500">{{ shortcut.description }}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <kbd class="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-300 font-mono">
                          {{ shortcuts.getKeyDisplay(shortcut.keys) }}
                        </kbd>
                        <button (click)="toggleShortcut(shortcut.id, !shortcut.enabled)"
                                class="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                                [class.bg-green-500/20]="shortcut.enabled"
                                [class.text-green-400]="shortcut.enabled"
                                [class.bg-slate-700]="!shortcut.enabled"
                                [class.text-slate-500]="!shortcut.enabled">
                          {{ shortcut.enabled ? '✓' : '✗' }}
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
        
        <!-- 底部 -->
        <div class="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
          <div class="text-sm text-slate-500">
            按 <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Esc</kbd> 或 
            <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl + /</kbd> 關閉此面板
          </div>
          <button (click)="shortcuts.resetToDefault()"
                  class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
            重置為默認
          </button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
    
    kbd {
      font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, monospace;
    }
  `]
})
export class KeyboardShortcutsPanelComponent {
  shortcuts = inject(KeyboardShortcutsService);
  
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    // Escape 關閉面板
    if (event.key === 'Escape' && this.shortcuts.showPanel()) {
      this.shortcuts.togglePanel();
      event.preventDefault();
    }
  }
  
  toggleShortcut(id: string, enabled: boolean) {
    this.shortcuts.toggleShortcut(id, enabled);
  }
}
