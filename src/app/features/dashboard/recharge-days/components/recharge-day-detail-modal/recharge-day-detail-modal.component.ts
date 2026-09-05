import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';

import {
  RECHARGE_CLOSED_DAY_STATUS_LABEL,
  RECHARGE_DAY_AUDIT_ACTION_LABEL,
  RechargeDayDetail,
  SalesClosureStatus,
  formatCurrency,
  getSalesClosureStatus,
} from '../../../../../core/models';
import { RechargeDaysService } from '../../../../../core/services/recharge-days.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

const STATUS_ICON: Record<string, string> = {
  CLOSED: 'lock',
  REOPENED: 'alert-triangle',
  CANCELLED: 'x-circle',
};

/** Same three-way "cuadre correcto / diferencia pendiente / se recaudó de más" reading `SalesSummaryCardComponent` already uses for the live preview — applied here to each saved cycle's own frozen `result`. */
const CLOSURE_STATUS_ICON: Record<SalesClosureStatus, string> = {
  zero: 'check-circle',
  positive: 'alert-circle',
  negative: 'x-circle',
};

/**
 * "Ver Detalle" of a closed Recargas day — calls
 * `RechargeDaysService.getDayDetail` every time it opens (or the selected
 * date changes), never caches across openings. Unlike Bancos' own
 * `DayDetailModalComponent`, the main body is a table of EVERY cuadre
 * cycle saved that date (`closures`), not a single reconciliation block —
 * the direct consequence of Recargas' own multi-cycle-per-day feature.
 */
@Component({
  selector: 'app-recharge-day-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent],
  templateUrl: './recharge-day-detail-modal.component.html',
  styleUrl: './recharge-day-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeDayDetailModalComponent implements OnChanges {
  private readonly rechargeDaysService = inject(RechargeDaysService);
  private readonly notificationService = inject(NotificationService);

  @Input() open = false;
  @Input() date: string | null = null;

  @Output() closed = new EventEmitter<void>();

  readonly detail = signal<RechargeDayDetail | null>(null);
  readonly loading = signal(false);

  readonly statusLabel = RECHARGE_CLOSED_DAY_STATUS_LABEL;
  readonly auditActionLabel = RECHARGE_DAY_AUDIT_ACTION_LABEL;
  readonly statusIcon = STATUS_ICON;
  formatCurrency = formatCurrency;

  closureStatus(result: number): SalesClosureStatus {
    return getSalesClosureStatus(result);
  }

  closureStatusIcon(result: number): string {
    return CLOSURE_STATUS_ICON[this.closureStatus(result)];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['date']) && this.open && this.date) {
      this.fetch(this.date);
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  private fetch(date: string): void {
    this.loading.set(true);
    this.detail.set(null);
    this.rechargeDaysService.getDayDetail(date).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el detalle del día.'));
        this.closed.emit();
      },
    });
  }
}
