/**
 * Progress Dialog Component
 * Displays progress for batch operations
 */
import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressInfo {
  current: number;
  total: number;
  message?: string;
  itemName?: string;
}

@Component({
  selector: 'app-progress-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(showSignal()) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-slate-800/90 dark:bg-slate-900/90 rounded-lg p-6 shadow-xl border border-slate-700 min-w-[400px]">
          <div class="flex flex-col gap-4">
            <!-- Title -->
            <h3 class="text-lg font-semibold text-slate-200">{{ titleSignal() }}</h3>
            
            <!-- Progress Bar -->
            <div class="w-full">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm text-slate-300">{{ progressSignal().current }} / {{ progressSignal().total }}</span>
                <span class="text-sm text-slate-300">{{ percentage() }}%</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div 
                  class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 ease-out"
                  [style.width.%]="percentage()">
                </div>
              </div>
            </div>
            
            <!-- Current Item -->
            @if(progressSignal().itemName) {
              <p class="text-sm text-slate-400 text-center">{{ progressSignal().itemName }}</p>
            }
            
            <!-- Message -->
            @if(progressSignal().message) {
              <p class="text-sm text-slate-300">{{ progressSignal().message }}</p>
            }
            
            <!-- Cancel Button (if cancellable) -->
            @if(cancellableSignal()) {
              <button 
                (click)="onCancel()"
                class="mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-2 px-4 rounded-lg transition duration-200 text-sm">
                取消
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .transition-all {
      transition-property: all;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
      transition-duration: 300ms;
    }
  `]
})
export class ProgressDialogComponent {
  private _show = signal(false);
  private _title = signal('处理中...');
  private _progress = signal<ProgressInfo>({ current: 0, total: 0 });
  private _cancellable = signal(false);
  
  @Input() set show(value: boolean) {
    this._show.set(value);
  }
  
  @Input() set title(value: string) {
    this._title.set(value);
  }
  
  @Input() set progress(value: ProgressInfo) {
    this._progress.set(value);
  }
  
  @Input() set cancellable(value: boolean) {
    this._cancellable.set(value);
  }
  
  @Input() onCancelCallback?: () => void;
  
  // Computed signals for template
  showSignal = computed(() => this._show());
  titleSignal = computed(() => this._title());
  progressSignal = computed(() => this._progress());
  cancellableSignal = computed(() => this._cancellable());
  
  percentage = computed(() => {
    const p = this._progress();
    return p.total > 0 ? Math.round((p.current / p.total) * 100) : 0;
  });
  
  onCancel() {
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }
}
