import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  BankDepositOperationSummary,
  CLOSED_DAY_STATUS_LABEL,
  DAY_AUDIT_ACTION_LABEL,
  ClosedDayDetail,
  formatCurrency,
} from '../../../../../core/models';
import { ClosedDaysService } from '../../../../../core/services/closed-days.service';
import { ReportsService } from '../../../../../core/services/reports.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { BankDepositDetailModalComponent } from '../../../reports/bank-deposits/components/bank-deposit-detail-modal/bank-deposit-detail-modal.component';

const STATUS_ICON: Record<string, string> = {
  CLOSED: 'lock',
  REOPENED: 'alert-triangle',
  CANCELLED: 'x-circle',
};

/** A single date's report page can never realistically exceed this — same reasoning as every other bounded listing in this app (e.g. Reportería's own export row cap). */
const OPERATIONS_LIMIT = 200;

/**
 * "Ver Detalle" of a Transacciones day — reuses `ClosedDaysService.getDayDetail`
 * for the shared status/audit-log fields (same day-cycle row "Gestión de Días
 * Cerrados" already reads, see `TransactionDaysPageComponent`'s own doc
 * comment), and additionally calls `ReportsService.getBankDepositsReport`
 * (already built for "Reporte de Transacciones") filtered to that single date
 * for the actual Transaccionar operations list — never a bank-balance/
 * reconciliation view, unlike "Gestión de Días Cerrados"' own detail modal.
 */
@Component({
  selector: 'app-transaction-day-detail-modal',
  standalone: true,
  imports: [DatePipe, ButtonComponent, IconComponent, BankDepositDetailModalComponent],
  templateUrl: './transaction-day-detail-modal.component.html',
  styleUrl: './transaction-day-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDayDetailModalComponent implements OnChanges {
  private readonly closedDaysService = inject(ClosedDaysService);
  private readonly reportsService = inject(ReportsService);
  private readonly notificationService = inject(NotificationService);

  @Input() open = false;
  @Input() date: string | null = null;

  @Output() closed = new EventEmitter<void>();

  readonly detail = signal<ClosedDayDetail | null>(null);
  readonly operations = signal<BankDepositOperationSummary[]>([]);
  readonly loading = signal(false);

  readonly selectedOperationId = signal<string | null>(null);
  readonly isOperationDetailOpen = signal(false);

  readonly statusLabel = CLOSED_DAY_STATUS_LABEL;
  readonly auditActionLabel = DAY_AUDIT_ACTION_LABEL;
  readonly statusIcon = STATUS_ICON;
  formatCurrency = formatCurrency;

  /** Excludes anuladas — same reasoning as the report's own `getReportSummary`: this is money actually deposited, not everything ever registered. */
  readonly activeOperations = computed(() => this.operations().filter((operation) => !operation.isVoided));
  readonly operationsTotal = computed(() =>
    this.activeOperations().reduce((sum, operation) => sum + operation.totalAmount, 0),
  );
  readonly transactionsTotal = computed(() =>
    this.activeOperations().reduce((sum, operation) => sum + operation.transactionCount, 0),
  );

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['open'] || changes['date']) && this.open && this.date) {
      this.fetch(this.date);
    }
  }

  onClose(): void {
    this.closed.emit();
  }

  openOperationDetail(id: string): void {
    this.selectedOperationId.set(id);
    this.isOperationDetailOpen.set(true);
  }

  closeOperationDetail(): void {
    this.isOperationDetailOpen.set(false);
  }

  private fetch(date: string): void {
    this.loading.set(true);
    this.detail.set(null);
    this.operations.set([]);

    forkJoin({
      detail: this.closedDaysService.getDayDetail(date),
      operations: this.reportsService.getBankDepositsReport({
        startDate: date,
        endDate: date,
        limit: OPERATIONS_LIMIT,
      }),
    }).subscribe({
      next: ({ detail, operations }) => {
        this.detail.set(detail);
        this.operations.set(operations.items);
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
