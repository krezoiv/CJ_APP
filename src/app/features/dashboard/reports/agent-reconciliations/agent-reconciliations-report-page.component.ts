import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AgentReconciliationsReportFilters,
  AgentReconciliationsReportRow,
  AgentReconciliationsReportSummary,
  formatCurrency,
  formatQuantity,
} from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
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
}

/** Local-time `yyyy-MM-dd`, no UTC-offset dance — same technique the Recargas report page already uses. */
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
  return { startDate: firstDayOfMonthIsoDate(), endDate: todayIsoDate() };
}

/**
 * Structural clone of `RechargesReportPageComponent` — the simplest existing
 * report (no `viewMode` toggle, no detail modal, no product/type filter,
 * plain inline table) since Cuadre de Agentes has the same shape: no line
 * items, no dimension to filter/break down by beyond date.
 */
@Component({
  selector: 'app-agent-reconciliations-report-page',
  standalone: true,
  imports: [FormsModule, DatePipe, ButtonComponent, IconComponent, ReportSummaryComponent, ReportPaginationComponent],
  templateUrl: './agent-reconciliations-report-page.component.html',
  styleUrl: './agent-reconciliations-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgentReconciliationsReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly notificationService = inject(NotificationService);

  private readonly LIMIT = 20;

  /** Draft (form-bound) vs applied (query-driving) filter split — same guarantee as every other report page: "Exportar PDF" can never export a filter edit that was never applied. */
  readonly draftStartDate = signal(firstDayOfMonthIsoDate());
  readonly draftEndDate = signal(todayIsoDate());

  readonly startDate = signal(firstDayOfMonthIsoDate());
  readonly endDate = signal(todayIsoDate());

  readonly page = signal(1);

  readonly rows = signal<AgentReconciliationsReportRow[]>([]);
  readonly total = signal(0);
  readonly summary = signal<AgentReconciliationsReportSummary | null>(null);

  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);

  readonly hasActiveFilters = computed(() => {
    const defaults = defaultFilterFields();
    return this.startDate() !== defaults.startDate || this.endDate() !== defaults.endDate;
  });

  readonly summaryTiles = computed<ReportSummaryTile[]>(() => {
    const s = this.summary();
    return [
      {
        icon: 'receipt',
        title: 'Total efectivo',
        value: formatCurrency(s?.totalCash ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'bank',
        title: 'Total bancos',
        value: formatCurrency(s?.totalBanks ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'bar-chart',
        title: 'Registros',
        value: formatQuantity(s?.recordCount ?? 0),
        description: 'cuadres en el período',
      },
      {
        icon: 'trending-up',
        title: 'Resultado promedio',
        value: formatCurrency(s?.averageResult ?? 0),
        description: 'por cuadre registrado',
      },
    ];
  });

  formatCurrency = formatCurrency;

  constructor() {
    this.fetchAll();
  }

  applyFilters(): void {
    if (this.draftStartDate() && this.draftEndDate() && this.draftStartDate() > this.draftEndDate()) {
      this.notificationService.error('La fecha de inicio debe ser anterior o igual a la fecha final.');
      return;
    }

    this.startDate.set(this.draftStartDate());
    this.endDate.set(this.draftEndDate());

    this.page.set(1);
    this.fetchAll();
  }

  clearFilters(): void {
    const defaults = defaultFilterFields();

    this.draftStartDate.set(defaults.startDate);
    this.draftEndDate.set(defaults.endDate);

    this.startDate.set(defaults.startDate);
    this.endDate.set(defaults.endDate);

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
    this.reportsService.exportAgentReconciliationsReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `reporte-cuadre-agentes-${todayIsoDate()}.pdf`);
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  private currentFilters(): AgentReconciliationsReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      page: this.page(),
      limit: this.LIMIT,
    };
  }

  private fetchAll(): void {
    this.loadingSummary.set(true);
    this.reportsService.getAgentReconciliationsReportSummary(this.currentFilters()).subscribe({
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
    this.reportsService.getAgentReconciliationsReport(this.currentFilters()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.total);
        this.loadingTable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loadingTable.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de cuadre de agentes.'));
      },
    });
  }
}
