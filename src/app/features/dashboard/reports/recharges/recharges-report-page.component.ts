import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RechargeDailyBalance, RechargeType, RechargesReportFilters, RechargesReportSummary, formatCurrency, formatQuantity } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
import { RechargesService } from '../../../../core/services/recharges.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';

interface FilterFieldsState {
  startDate: string;
  endDate: string;
  rechargeTypeId: string;
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

/** Same "current month" default as the Sales/Purchases reports — see those pages' own doc comments. */
function firstDayOfMonthIsoDate(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultFilterFields(): FilterFieldsState {
  return {
    startDate: firstDayOfMonthIsoDate(),
    endDate: todayIsoDate(),
    rechargeTypeId: '',
  };
}

/**
 * Simpler than Sales'/Purchases' report pages by design — Recargas has no
 * line items to join, no "por producto" breakdown, and no per-row detail to
 * drill into (each row already shows everything: saldo anterior, compra,
 * saldo del día, saldo final, venta). No sortable-column table component or
 * detail modal was built for this reason, not an oversight.
 */
@Component({
  selector: 'app-recharges-report-page',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonComponent, IconComponent, ReportSummaryComponent, ReportPaginationComponent],
  templateUrl: './recharges-report-page.component.html',
  styleUrl: './recharges-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargesReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly rechargesService = inject(RechargesService);
  private readonly notificationService = inject(NotificationService);

  private readonly LIMIT = 20;

  readonly types = signal<RechargeType[]>([]);

  /** Draft (form-bound) vs applied (query-driving) filter split — see the Sales/Purchases report pages' own doc comment for why this exists: it's what guarantees "Exportar PDF" can never export a filter edit that was never applied. */
  readonly draftStartDate = signal(firstDayOfMonthIsoDate());
  readonly draftEndDate = signal(todayIsoDate());
  readonly draftRechargeTypeId = signal('');

  readonly startDate = signal(firstDayOfMonthIsoDate());
  readonly endDate = signal(todayIsoDate());
  readonly rechargeTypeId = signal('');

  readonly page = signal(1);

  readonly rows = signal<RechargeDailyBalance[]>([]);
  readonly total = signal(0);
  readonly summary = signal<RechargesReportSummary | null>(null);

  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);

  readonly hasActiveFilters = computed(() => {
    const defaults = defaultFilterFields();
    return (
      this.rechargeTypeId() !== defaults.rechargeTypeId ||
      this.startDate() !== defaults.startDate ||
      this.endDate() !== defaults.endDate
    );
  });

  readonly summaryTiles = computed<ReportSummaryTile[]>(() => {
    const s = this.summary();
    return [
      {
        icon: 'shopping-bag',
        title: 'Total comprado',
        value: formatCurrency(s?.totalPurchases ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'trending-up',
        title: 'Total vendido',
        value: formatCurrency(s?.totalSales ?? 0),
        description: `${s?.closedCount ?? 0} días cerrados`,
      },
      {
        icon: 'smartphone',
        title: 'Registros',
        value: formatQuantity(s?.recordCount ?? 0),
        description: 'ciclos en el período',
      },
      {
        icon: 'bar-chart',
        title: 'Promedio de venta',
        value: formatCurrency(s?.averageSale ?? 0),
        description: 'por día cerrado',
      },
    ];
  });

  formatCurrency = formatCurrency;

  constructor() {
    this.rechargesService.getTypes().subscribe({
      next: (types) => this.types.set(types),
      error: () => this.notificationService.error('No se pudieron cargar los tipos de recarga.'),
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
    this.rechargeTypeId.set(this.draftRechargeTypeId());

    this.page.set(1);
    this.fetchAll();
  }

  clearFilters(): void {
    const defaults = defaultFilterFields();

    this.draftStartDate.set(defaults.startDate);
    this.draftEndDate.set(defaults.endDate);
    this.draftRechargeTypeId.set(defaults.rechargeTypeId);

    this.startDate.set(defaults.startDate);
    this.endDate.set(defaults.endDate);
    this.rechargeTypeId.set(defaults.rechargeTypeId);

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
    this.reportsService.exportRechargesReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `reporte-recargas-${todayIsoDate()}.pdf`);
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  private currentFilters(): RechargesReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      rechargeTypeId: this.rechargeTypeId() || undefined,
      page: this.page(),
      limit: this.LIMIT,
    };
  }

  private fetchAll(): void {
    this.loadingSummary.set(true);
    this.reportsService.getRechargesReportSummary(this.currentFilters()).subscribe({
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
    this.reportsService.getRechargesReport(this.currentFilters()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.loadingTable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadingTable.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de recargas.'));
      },
    });
  }
}
