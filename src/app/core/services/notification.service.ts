import { Injectable, signal } from '@angular/core';

import { Toast, ToastType } from '../models';

/** Kept in sync with the `toast-progress` animation duration in `toast-container.component.scss` — the countdown bar must finish exactly when the toast auto-dismisses. */
const AUTO_DISMISS_MS = 4000;

/** Global toast feedback — one signal list, rendered once by ToastContainerComponent in AppComponent. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message);
  }

  /** Yellow — for cancelled/voided actions, distinct from a genuine error. */
  warning(message: string): void {
    this.push('warning', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: string): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(type: ToastType, message: string): void {
    const toast: Toast = { id: crypto.randomUUID(), type, message };
    this.toasts.update((toasts) => [...toasts, toast]);
    setTimeout(() => this.dismiss(toast.id), AUTO_DISMISS_MS);
  }
}
