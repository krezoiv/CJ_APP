import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BankDepositOperationSummary,
  BankDepositsReportFilters,
  BankDepositsReportSummary,
  TransactionBank,
  TransactionType,
  User,
  formatCurrency,
  formatQuantity,
} from '../../../../core/models';
import { BankDepositService } from '../../../../core/services/bank-deposit.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { TransactionBankService } from '../../../../core/services/transaction-bank.service';
import { TransactionTypeService } from '../../../../core/services/transaction-type.service';
import { UserService } from '../../../../core/services/user.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';
import { BankDepositDetailModalComponent } from './components/bank-deposit-detail-modal/bank-deposit-detail-modal.component';
import { VoidConfirmModalComponent } from './components/void-confirm-modal/void-confirm-modal.component';

interface FilterFieldsState {
  startDate: string;
  endDate: string;
  transactionBankId: string;
  transactionTypeId: string;
  userId: string;
}

/** Local-time `yyyy-MM-dd`, no UTC-offset dance — same technique every other date-driven page in this app already uses. */
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/** Same "current month" default as every other report page in this app. */
function firstDayOfMonthIsoDate(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultFilterFields(): FilterFieldsState {
  return {
    startDate: firstDayOfMonthIsoDate(),
    endDate: todayIsoDate(),
    transactionBankId: '',
    transactionTypeId: '',
    userId: '',
  };
}

/**
 * Reportería de Transaccionar — simpler than Sales'/Purchases' report
 * pages, same reasoning as `RechargesReportPageComponent`: each row already
 * shows everything (no line items to drill into, no detail modal). The one
 * addition over the Recargas report's shape is the "por banco" breakdown,
 * always shown below the main table (not behind a toggle) since it's a
 * small, always-relevant summary rather than a genuinely separate view.
 */
@Component({
  selector: 'app-bank-deposits-report-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonComponent,
    IconComponent,
    ReportSummaryComponent,
    ReportPaginationComponent,
    BankDepositDetailModalComponent,
    VoidConfirmModalComponent,
  ],
  templateUrl: './bank-deposits-report-page.component.html',
  styleUrl: './bank-deposits-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankDepositsReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly transactionBankService = inject(TransactionBankService);
  private readonly transactionTypeService = inject(TransactionTypeService);
  private readonly userService = inject(UserService);
  private readonly bankDepositService = inject(BankDepositService);
  private readonly notificationService = inject(NotificationService);

  private readonly LIMIT = 20;

  readonly transactionBanks = signal<TransactionBank[]>([]);
  readonly transactionTypes = signal<TransactionType[]>([]);
  readonly users = signal<User[]>([]);

  readonly draftStartDate = signal(firstDayOfMonthIsoDate());
  readonly draftEndDate = signal(todayIsoDate());
  readonly draftTransactionBankId = signal('');
  readonly draftTransactionTypeId = signal('');
  readonly draftUserId = signal('');

  readonly startDate = signal(firstDayOfMonthIsoDate());
  readonly endDate = signal(todayIsoDate());
  readonly transactionBankId = signal('');
  readonly transactionTypeId = signal('');
  readonly userId = signal('');

  readonly page = signal(1);

  readonly rows = signal<BankDepositOperationSummary[]>([]);
  readonly total = signal(0);
  readonly summary = signal<BankDepositsReportSummary | null>(null);

  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);

  readonly selectedOperationId = signal<string | null>(null);
  readonly isDetailOpen = signal(false);
  readonly isVoidModalOpen = signal(false);
  readonly isSavingVoid = signal(false);

  readonly hasActiveFilters = computed(() => {
    const defaults = defaultFilterFields();
    return (
      this.transactionBankId() !== defaults.transactionBankId ||
      this.transactionTypeId() !== defaults.transactionTypeId ||
      this.userId() !== defaults.userId ||
      this.startDate() !== defaults.startDate ||
      this.endDate() !== defaults.endDate
    );
  });

  readonly summaryTiles = computed<ReportSummaryTile[]>(() => {
    const s = this.summary();
    return [
      {
        icon: 'bank',
        title: 'Operaciones',
        value: formatQuantity(s?.operationCount ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'arrow-right',
        title: 'Transacciones',
        value: formatQuantity(s?.transactionCount ?? 0),
        description: 'sub-transacciones registradas',
      },
      {
        icon: 'trending-up',
        title: 'Monto total',
        value: formatCurrency(s?.totalAmount ?? 0),
        description: 'depositado en el período',
      },
    ];
  });

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  constructor() {
    this.transactionBankService.getTransactionBanks().subscribe({
      next: (banks) => this.transactionBanks.set(banks),
      error: () => this.notificationService.error('No se pudieron cargar los bancos agente.'),
    });
    this.transactionTypeService.getTransactionTypes().subscribe({
      next: (types) => this.transactionTypes.set(types),
      error: () => this.notificationService.error('No se pudieron cargar los tipos de transacción.'),
    });
    this.userService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.notificationService.error('No se pudieron cargar los usuarios.'),
    });
    this.fetchAll();
  }

  applyFilters(): void {
    if (this.draftStartDate() && this.draftEndDate() && this.draftStartDate() > this.draftEndDate()) {
      this.notificationService.error('La fecha de inicio debe ser anterior o igual a la fecha final.');
      return;
    }

    this.startDate.set(this.draftStartDate());
    this.endDate.set(this.draftEndDate());
    this.transactionBankId.set(this.draftTransactionBankId());
    this.transactionTypeId.set(this.draftTransactionTypeId());
    this.userId.set(this.draftUserId());

    this.page.set(1);
    this.fetchAll();
  }

  clearFilters(): void {
    const defaults = defaultFilterFields();

    this.draftStartDate.set(defaults.startDate);
    this.draftEndDate.set(defaults.endDate);
    this.draftTransactionBankId.set(defaults.transactionBankId);
    this.draftTransactionTypeId.set(defaults.transactionTypeId);
    this.draftUserId.set(defaults.userId);

    this.startDate.set(defaults.startDate);
    this.endDate.set(defaults.endDate);
    this.transactionBankId.set(defaults.transactionBankId);
    this.transactionTypeId.set(defaults.transactionTypeId);
    this.userId.set(defaults.userId);

    this.page.set(1);
    this.fetchAll();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.fetchTable();
  }

  /** Always exports exactly the applied filters — never the draft form fields — so the PDF can never show different data than what's currently on screen. */
  exportPdf(): void {
    this.exporting.set(true);
    this.reportsService.exportBankDepositsReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `reporte-transacciones-${todayIsoDate()}.pdf`);
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  openDetail(id: string): void {
    this.selectedOperationId.set(id);
    this.isDetailOpen.set(true);
  }

  closeDetail(): void {
    this.isDetailOpen.set(false);
  }

  openVoidModal(id: string): void {
    this.selectedOperationId.set(id);
    this.isVoidModalOpen.set(true);
  }

  cancelVoidModal(): void {
    if (this.isSavingVoid()) {
      return;
    }
    this.isVoidModalOpen.set(false);
  }

  confirmVoid(reason: string): void {
    const id = this.selectedOperationId();
    if (!id || this.isSavingVoid()) {
      return;
    }
    this.isSavingVoid.set(true);
    this.bankDepositService.voidOperation(id, reason).subscribe({
      next: () => {
        this.isSavingVoid.set(false);
        this.isVoidModalOpen.set(false);
        this.notificationService.success('La transacción fue anulada correctamente.');
        this.fetchAll();
      },
      error: (error: HttpErrorResponse) => {
        this.isSavingVoid.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo anular la transacción.'));
      },
    });
  }

  private currentFilters(): BankDepositsReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      transactionBankId: this.transactionBankId() || undefined,
      transactionTypeId: this.transactionTypeId() || undefined,
      userId: this.userId() || undefined,
      page: this.page(),
      limit: this.LIMIT,
    };
  }

  private fetchAll(): void {
    this.loadingSummary.set(true);
    this.reportsService.getBankDepositsReportSummary(this.currentFilters()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loadingSummary.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadingSummary.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el resumen.'));
      },
    });
    this.fetchTable();
  }

  private fetchTable(): void {
    this.loadingTable.set(true);
    this.reportsService.getBankDepositsReport(this.currentFilters()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.loadingTable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadingTable.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de transacciones.'));
      },
    });
  }
}
