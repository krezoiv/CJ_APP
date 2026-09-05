import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AlertsService } from '../../../../../core/services/alerts.service';
import { PurchasesService } from '../../../../../core/services/purchases.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { Alert, AlertType, ALERT_PRIORITY_ICON, ALERT_PRIORITY_TONE } from '../../../../../core/models';
import { IconComponent, BadgeComponent } from '../../../../../shared/ui';

const PAYABLE_ALERT_TYPES: AlertType[] = ['PURCHASE_PAYMENT_DUE', 'PURCHASE_PAYMENT_OVERDUE'];

const POLL_INTERVAL_MS = 60_000;

/**
 * Self-contained, like `RegisterPurchaseFormComponent`/`RechargeSalesSummaryCardComponent` — calls
 * `AlertsService` directly rather than routing state through a parent. Polls on a fixed interval,
 * refetches whenever the panel opens (so a badge count that's gone stale between polls is corrected
 * the moment the user actually looks), and refetches on every navigation (an alert's underlying
 * condition can change as a side effect of whatever screen the user just left — paying a purchase,
 * closing a recharge day, registering a transfer).
 *
 * Deliberately polling, not a WebSocket — this app has no real-time transport anywhere else
 * (`SalesDraftStore`/`PurchaseDraftStore` are local/sessionStorage-only), and alerts are read-heavy,
 * low-frequency-change data where a 60s staleness window is an acceptable, much simpler trade-off.
 */
@Component({
  selector: 'app-alert-bell',
  standalone: true,
  imports: [IconComponent, BadgeComponent],
  templateUrl: './alert-bell.component.html',
  styleUrl: './alert-bell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertBellComponent {
  private readonly alertsService = inject(AlertsService);
  private readonly purchasesService = inject(PurchasesService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly items = signal<Alert[]>([]);
  readonly unreadCount = signal(0);
  readonly payingKeys = signal<Set<string>>(new Set());

  readonly priorityTone = ALERT_PRIORITY_TONE;
  readonly priorityIcon = ALERT_PRIORITY_ICON;

  constructor() {
    this.fetchAlerts();

    const intervalId = setInterval(() => this.fetchAlerts(), POLL_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalId));

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.fetchAlerts());
  }

  private fetchAlerts(): void {
    this.isLoading.set(true);
    this.alertsService.getAlerts().subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.unreadCount.set(result.count);
        this.isLoading.set(false);
      },
      error: () => {
        // A transient failure just leaves the last-known state on screen —
        // same resilience reasoning as the Resumen dashboard's own tiles
        // (see the API's CLAUDE.md), never a broken/blank bell.
        this.isLoading.set(false);
      },
    });
  }

  togglePanel(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.fetchAlerts();
    }
  }

  closePanel(): void {
    this.isOpen.set(false);
  }

  selectAlert(alert: Alert): void {
    if (!alert.isRead) {
      this.alertsService.markAsRead(alert.key).subscribe();
      this.items.update((items) =>
        items.map((item) => (item.key === alert.key ? { ...item, isRead: true } : item)),
      );
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }
    this.closePanel();
    this.router.navigateByUrl(alert.route);
  }

  /** Only `PURCHASE_PAYMENT_DUE`/`PURCHASE_PAYMENT_OVERDUE` alerts carry a purchase id worth acting on directly from the panel. */
  isPayable(alert: Alert): boolean {
    return PAYABLE_ALERT_TYPES.includes(alert.type);
  }

  isPaying(alert: Alert): boolean {
    return this.payingKeys().has(alert.key);
  }

  /**
   * "Marcar como pagada" straight from the panel — this is the deliberate,
   * minimal UI home for the payment action (see the API's CLAUDE.md,
   * `MarkPurchaseAsPaidUseCase`'s own doc comment): no purchase-history list
   * page exists yet to put it on instead, and the alert already carries
   * everything needed (`referenceId` is the purchase id).
   */
  markPurchaseAsPaid(event: Event, alert: Alert): void {
    event.stopPropagation();
    if (this.isPaying(alert)) {
      return;
    }
    this.payingKeys.update((keys) => new Set(keys).add(alert.key));
    this.purchasesService.markAsPaid(alert.referenceId).subscribe({
      next: () => {
        this.notificationService.success('Compra marcada como pagada.');
        this.payingKeys.update((keys) => {
          const next = new Set(keys);
          next.delete(alert.key);
          return next;
        });
        this.removeAlert(alert.key);
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo marcar la compra como pagada.'));
        this.payingKeys.update((keys) => {
          const next = new Set(keys);
          next.delete(alert.key);
          return next;
        });
      },
    });
  }

  private removeAlert(key: string): void {
    const wasUnread = this.items().find((item) => item.key === key)?.isRead === false;
    this.items.update((items) => items.filter((item) => item.key !== key));
    if (wasUnread) {
      this.unreadCount.update((count) => Math.max(0, count - 1));
    }
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }
    this.alertsService.markAllAsRead().subscribe(() => {
      this.items.update((items) => items.map((item) => ({ ...item, isRead: true })));
      this.unreadCount.set(0);
    });
  }
}
