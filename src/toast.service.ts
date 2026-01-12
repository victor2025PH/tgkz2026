/**
 * Toast Notification Service
 * Provides toast notifications for success, error, warning, and info messages
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: WritableSignal<Toast[]> = signal([]);
  private toastIdCounter = 0;

  /**
   * Get all active toasts
   */
  getToasts(): WritableSignal<Toast[]> {
    return this.toasts;
  }

  /**
   * Show a success toast
   */
  success(message: string, duration: number = 3000): string {
    return this.show('success', message, duration);
  }

  /**
   * Show an error toast
   */
  error(message: string, duration: number = 5000): string {
    return this.show('error', message, duration);
  }

  /**
   * Show a warning toast
   */
  warning(message: string, duration: number = 4000): string {
    return this.show('warning', message, duration);
  }

  /**
   * Show an info toast
   */
  info(message: string, duration: number = 3000): string {
    return this.show('info', message, duration);
  }

  /**
   * Show a toast notification
   */
  private show(type: ToastType, message: string, duration: number = 3000): string {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration: duration > 0 ? duration : undefined,
      timestamp: new Date()
    };

    this.toasts.update(toasts => [...toasts, toast]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toasts.set([]);
  }
}

