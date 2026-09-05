import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  CLOSED_DAY_STATUS_LABEL,
  ClosedDayRow,
  ClosedDayStatus,
  ClosedDaysFilters,
  ResultSign,
  formatCurrency,
} from '../../../core/models';
import { ClosedDaysService } from '../../../core/services/closed-days.service';
import { DayStatusService } from '../../../core/services/day-status.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, CardComponent, EmptyStateComponent, IconComponent } from '../../../shared/ui';
import { DayDetailModalComponent } from './components/day-detail-modal/day-detail-modal.component';
import { ReopenConfirmModalComponent } from './components/reopen-confirm-modal/reopen-confirm-modal.component';
import { CancelConfirmModalComponent } from './components/cancel-confirm-modal/cancel-confirm-modal.component';

const STATUS_BADGE_TONE: Record<ClosedDayStatus, 'neutral-dark' | 'gold' | 'danger'> = {
  CLOSED: 'neutral-dark',
  REOPENED: 'gold',
  CANCELLED: 'danger',
};

const STATUS_ICON: Record<ClosedDayStatus, string> = {
  CLOSED: 'lock',
  REOPENED: 'alert-triangle',
  CANCELLED: 'x-circle',
};

/**
 * "Sistema → Gestión de Días Cerrados" — manages the cycle of a day that
 * is ALREADY closed (controlled reopening, re-closing, cancellation).
 * Never touches the opening/balance-registration/cuadre logic of the day
 * IN PROGRESS (Agentes Bancarios → Bancos/Cuadre Agentes) — it reuses
 * those same endpoints (`POST /banks/balances`, `POST /agent-reconciliations`)
 * to edit and re-close a reopened day, with no new use case built for
 * that. See `ClosedDaysService`/`ReopenConfirmModalComponent`/
 * `CancelConfirmModalComponent`.
 *
 * Route and menu already protected by `adminGuard`/`roles` (the same
 * mechanism Usuarios/Roles use) — the real protection is on the backend
 * (`ClosedDaysController`, a class-level `@Roles('ADMIN','SUPER_ADMIN')`,
 * including the `GET`s).
 */
@Component({
  selector: 'app-closed-days-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    CardComponent,
    ButtonComponent,
    IconComponent,
    EmptyStateComponent,
    DayDetailModalComponent,
    ReopenConfirmModalComponent,
    CancelConfirmModalComponent,
  ],
  templateUrl: './closed-days-page.component.html',
  styleUrl: './closed-days-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClosedDaysPageComponent {
  private readonly closedDaysService = inject(ClosedDaysService);
  private readonly dayStatusService = inject(DayStatusService);
  private readonly notificationService = inject(NotificationService);

  readonly rows = signal<ClosedDayRow[]>([]);
  readonly loading = signal(true);

  readonly draftDateFrom = signal('');
  readonly draftDateTo = signal('');
  readonly draftStatus = signal<ClosedDayStatus | ''>('');
  readonly draftResultSign = signal<ResultSign | ''>('');

  private appliedFilters: ClosedDaysFilters = {};
  readonly hasActiveFilters = signal(false);

  readonly selectedDate = signal<string | null>(null);
  readonly isDetailOpen = signal(false);
  readonly isReopenModalOpen = signal(false);
  readonly isCancelModalOpen = signal(false);
  readonly isSavingAction = signal(false);

  readonly statusLabel = CLOSED_DAY_STATUS_LABEL;
  readonly statusBadgeTone = STATUS_BADGE_TONE;
  readonly statusIcon = STATUS_ICON;
  formatCurrency = formatCurrency;

  readonly selectedRow = computed(() => this.rows().find((row) => row.date === this.selectedDate()) ?? null);

  constructor() {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.closedDaysService.getClosedDays(this.appliedFilters).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar la lista de días cerrados.'));
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
    this.hasActiveFilters.set(
      Object.values(this.appliedFilters).some((value) => value !== undefined),
    );
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
    this.closedDaysService.reopenDay(date, reason).subscribe({
      next: () => {
        this.isSavingAction.set(false);
        this.isReopenModalOpen.set(false);
        this.notificationService.success(`El día ${date} fue reabierto correctamente.`);
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
    this.closedDaysService.cancelDay(date, reason).subscribe({
      next: () => {
        this.isSavingAction.set(false);
        this.isCancelModalOpen.set(false);
        this.notificationService.success(`El día ${date} fue anulado correctamente.`);
        this.fetch();
        this.dayStatusService.refresh();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingAction.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo anular el día.'));
      },
    });
  }

  /** Only a CLOSED day accepts reopening/cancellation — one already REOPENED must be re-closed first (from Agentes Bancarios), and a CANCELLED one is terminal. */
  canReopen(row: ClosedDayRow): boolean {
    return row.status === 'CLOSED';
  }

  canCancel(row: ClosedDayRow): boolean {
    return row.status === 'CLOSED';
  }
}
