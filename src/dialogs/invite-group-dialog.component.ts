/**
 * Phase 10: Invite to Group Dialog
 * Extracted from app.component.html (54 lines)
 */
import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-invite-group-dialog',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center" 
         (click)="close.emit()">
      <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
           (click)="$event.stopPropagation()">
        <!-- Title -->
        <div class="px-6 py-4 border-b border-slate-700 flex items-center gap-3">
          <div class="p-2 bg-emerald-500/20 rounded-lg">
            <span class="text-xl">👥</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-white">邀請進群</h3>
            <p class="text-sm text-slate-400">選擇協作群組</p>
          </div>
        </div>
        
        <!-- Group List -->
        <div class="px-6 py-4 max-h-64 overflow-y-auto">
          @if(groups().length === 0) {
            <div class="text-center py-8 text-slate-400">
              <p class="mb-2">暫無協作群組</p>
              <button (click)="goCreateGroup.emit()" 
                      class="text-cyan-400 hover:underline text-sm">
                去創建群組 →
              </button>
            </div>
          } @else {
            <div class="space-y-2">
              @for(group of groups(); track group.id) {
                <button (click)="inviteToGroup.emit(group.id)"
                        class="w-full p-3 bg-slate-800/50 hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-left transition-all group">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-white group-hover:text-emerald-400">{{ group.name }}</p>
                      <p class="text-xs text-slate-500">{{ group.members?.length || 0 }} 個成員</p>
                    </div>
                    <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </button>
              }
            </div>
          }
        </div>
        
        <!-- Cancel -->
        <div class="px-6 py-4 border-t border-slate-700">
          <button (click)="close.emit()" 
                  class="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            取消
          </button>
        </div>
      </div>
    </div>
  `
})
export class InviteGroupDialogComponent {
  groups = input<any[]>([]);
  close = output<void>();
  inviteToGroup = output<string>();
  goCreateGroup = output<void>();
}
