/**
 * Toast Notification Component
 * Displays toast notifications
 */
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      @for(toast of toasts(); track toast.id) {
        <div 
          class="toast-item flex items-start gap-3 p-4 rounded-lg shadow-lg backdrop-blur-sm border animate-slide-in"
          [class.bg-green-500/90]="toast.type === 'success'"
          [class.bg-red-500/90]="toast.type === 'error'"
          [class.bg-yellow-500/90]="toast.type === 'warning'"
          [class.bg-blue-500/90]="toast.type === 'info'"
          [class.border-green-400]="toast.type === 'success'"
          [class.border-red-400]="toast.type === 'error'"
          [class.border-yellow-400]="toast.type === 'warning'"
          [class.border-blue-400]="toast.type === 'info'">
          <!-- Icon -->
          <div class="flex-shrink-0 mt-0.5">
            @switch(toast.type) {
              @case('success') {
                <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              }
              @case('error') {
                <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              @case('warning') {
                <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              @case('info') {
                <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            }
          </div>
          
          <!-- Message -->
          <div class="flex-1 text-white text-sm font-medium">
            {{ toast.message }}
          </div>
          
          <!-- Close button -->
          <button 
            (click)="dismiss(toast.id)"
            class="flex-shrink-0 text-white/80 hover:text-white transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `]
})
export class ToastComponent {
  private toastService = inject(ToastService);
  
  get toasts() {
    return this.toastService.getToasts();
  }
  
  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}

