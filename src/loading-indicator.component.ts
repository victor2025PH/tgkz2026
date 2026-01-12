/**
 * Loading Indicator Component
 * Displays loading spinner and message
 */
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(show) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div class="bg-slate-800/90 dark:bg-slate-900/90 rounded-lg p-6 shadow-xl border border-slate-700">
          <div class="flex flex-col items-center gap-4">
            <!-- Spinner -->
            <div class="relative w-12 h-12">
              <div class="absolute inset-0 border-4 border-slate-600 rounded-full"></div>
              <div class="absolute inset-0 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
            
            <!-- Message -->
            @if(message) {
              <p class="text-slate-200 text-sm font-medium">{{ message }}</p>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    
    .animate-spin {
      animation: spin 1s linear infinite;
    }
  `]
})
export class LoadingIndicatorComponent {
  @Input() show: boolean = false;
  @Input() message: string = '';
}

