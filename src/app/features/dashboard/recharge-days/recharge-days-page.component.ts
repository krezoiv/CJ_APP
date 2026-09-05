import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  RECHARGE_CLOSED_DAY_STATUS_LABEL,
  RechargeClosedDayRow,
  RechargeClosedDayStatus,
  RechargeClosedDaysFilters,
  RechargeResultSign,
  formatCurrency,
} from '../../../core/models';
import { RechargeDaysService } from '../../../core/services/recharge-days.service';
import { RechargeDayStatusService } from '../../../core/services/recharge-day-status.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, CardComponent, EmptyStateComponent, IconComponent } from '../../../shared/ui';
import { RechargeDayDetailModalComponent } from './components/recharge-day-detail-modal/recharge-day-detail-modal.component';
import { ReopenRechargeDayConfirmModalComponent } from './components/reopen-recharge-day-confirm-modal/reopen-recharge-day-confirm-modal.component';
import { CancelRechargeDayConfirmModalComponent } from './components/cancel-recharge-day-confirm-modal/cancel-recharge-day-confirm-modal.component';

const STATUS_BADGE_TONE: Record<RechargeClosedDayStatus, 'neutral-dark' | 'gold' | 'danger'> = {
  CLOSED: 'neutral-dark',
  REOPENED: 'gold',
  CANCELLED: 'danger',
};

const STATUS_ICON: Record<RechargeClosedDayStatus, string> = {
  CLOSED: 'lock',
  REOPENED: 'alert-triangle',
  CANCELLED: 'x-circle',
};

/**
 * "Sistema → Gestión de Días de Recargas" — the Recargas-specific
 * counterpart to Bancos' "Gestión de Días Cerrados" (`ClosedDaysPageComponent`),
 * structurally an exact mirror but fully independent: separate backend
 * table/lifecycle, separate service (`RechargeDaysService`), never shares
 * state with Bancos' own closed-days screen. Manages the cycle of a
 * Recargas day that is ALREADY closed (controlled reopening, re-closing,
 * cancellation) — never touches the day-in-progress logic (opening,
 * compras, ventas, cuadre) owned by the operational Recargas page.
 *
 * Route and menu already protected by `adminGuard`/`roles` (the same
 * mechanism Usuarios/Roles/Gestión de Días Cerrados use) — the real
 * protection is on the backend (`RechargeDaysController`, a class-level
 * `@Roles('ADMIN','SUPER_ADMIN')`, including the `GET`s).
 */
@Component({
  selector: 'app-recharge-days-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    CardComponent,
    ButtonComponent,
    IconComponent,
    EmptyStateComponent,
    RechargeDayDetailModalComponent,
    ReopenRechargeDayConfirmModalComponent,
    CancelRechargeDayConfirmModalComponent,
  ],
  templateUrl: './recharge-days-page.component.html',
  styleUrl: './recharge-days-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeDaysPageComponent {
  private readonly rechargeDaysService = inject(RechargeDaysService);
  private readonly dayStatusService = inject(RechargeDayStatusService);
  private readonly notificationService = inject(NotificationService);

  readonly rows = signal<RechargeClosedDayRow[]>([]);
  readonly loading = signal(true);

  readonly draftDateFrom = signal('');
  readonly draftDateTo = signal('');
  readonly draftStatus = signal<RechargeClosedDayStatus | ''>('');
  readonly draftResultSign = signal<RechargeResultSign | ''>('');

  private appliedFilters: RechargeClosedDaysFilters = {};
  readonly hasActiveFilters = signal(false);

  readonly selectedDate = signal<string | null>(null);
  readonly isDetailOpen = signal(false);
  readonly isReopenModalOpen = signal(false);
  readonly isCancelModalOpen = signal(false);
  readonly isSavingAction = signal(false);

  readonly statusLabel = RECHARGE_CLOSED_DAY_STATUS_LABEL;
  readonly statusBadgeTone = STATUS_BADGE_TONE;
  readonly statusIcon = STATUS_ICON;
  formatCurrency = formatCurrency;

  readonly selectedRow = computed(() => this.rows().find((row) => row.date === this.selectedDate()) ?? null);

  constructor() {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.rechargeDaysService.getClosedDays(this.appliedFilters).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar la lista de días de recargas.'));
      },
    });
  }

  applyFilters(): void {
    this.appliedFilters = {
      dateFrom: this.draftDateFrom() || undefined,
      dateTo: this.draftDateTo() || undefined,
      status: this.draftStatus() || undefined,
      resultSign: this.draftResultSign() || undefined,
    };
    this.hasActiveFilters.set(Object.values(this.appliedFilters).some((value) => value !== undefined));
    this.fetch();
  }

  clearFilters(): void {
    this.draftDateFrom.set('');
    this.draftDateTo.set('');
    this.draftStatus.set('');
    this.draftResultSign.set('');
    this.appliedFilters = {};
    this.hasActiveFilters.set(false);
    this.fetch();
  }

  openDetail(date: string): void {
    this.selectedDate.set(date);
    this.isDetailOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
  }

  openReopenModal(date: string): void {
    this.selectedDate.set(date);
    this.isReopenModalOpen.set(true);
  }

  cancelReopenModal(): void {
    if (this.isSavingAction()) {
      return;
    }
    this.isReopenModalOpen.set(false);
  }

  confirmReopen(reason: string): void {
    const date = this.selectedDate();
    if (!date || this.isSavingAction()) {
      return;
    }
    this.isSavingAction.set(true);
    this.rechargeDaysService.reopenDay(date, reason).subscribe({
      next: () => {
        this.isSavingAction.set(false);
        this.isReopenModalOpen.set(false);
        this.notificationService.success(`El día de recargas ${date} fue reabierto correctamente.`);
        this.fetch();
        this.dayStatusService.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingAction.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo reabrir el día.'));
      },
    });
  }

  openCancelModal(date: string): void {
    this.selectedDate.set(date);
    this.isCancelModalOpen.set(true);
  }

  cancelCancelModal(): void {
    if (this.isSavingAction()) {
      return;
    }
    this.isCancelModalOpen.set(false);
  }

  confirmCancel(reason: string): void {
    const date = this.selectedDate();
    if (!date || this.isSavingAction()) {
      return;
    }
    this.isSavingAction.set(true);
    this.rechargeDaysService.cancelDay(date, reason).subscribe({
      next: () => {
        this.isSavingAction.set(false);
        this.isCancelModalOpen.set(false);
        this.notificationService.success(`El día de recargas ${date} fue anulado correctamente.`);
        this.fetch();
        this.dayStatusService.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingAction.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo anular el día.'));
      },
    });
  }

  /** Only a CLOSED day accepts reopening/cancellation — one already REOPENED must be re-closed first (from the operational Recargas page's "Cerrar Día"), and a CANCELLED one is terminal. */
  canReopen(row: RechargeClosedDayRow): boolean {
    return row.status === 'CLOSED';
  }

  canCancel(row: RechargeClosedDayRow): boolean {
    return row.status === 'CLOSED';
  }
}
