import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AssetsReceivablesReportFilters,
  AssetsReceivablesReportType,
  Client,
  ReportStatusFilter,
  formatCurrency,
  formatQuantity,
} from '../../../../core/models';
import { AssetsReceivablesReportStateService } from '../../../../core/services/assets-receivables-report-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { BadgeComponent, ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';
import { ClientFilterSearchComponent } from '../components/client-filter-search/client-filter-search.component';

const TYPE_LABEL: Record<AssetsReceivablesReportType, string> = {
  assets: 'Activo',
  accounts_receivable: 'Cuenta por Cobrar',
};

/** `yyyy-MM-dd` → `dd-al-dd`/plain date, mirrors the backend's own filename logic exactly (`AssetsReceivablesReportController.buildExportFilename`). */
function buildExportFilename(startDate: string, endDate: string): string {
  if (startDate && endDate) {
    return `reporte-activos-cuentas-por-cobrar-${startDate}-al-${endDate}.pdf`;
  }
  const today = new Date().toISOString().slice(0, 10);
  return `reporte-activos-cuentas-por-cobrar-${today}.pdf`;
}

/**
 * Unified Reportería de Activos y Cuentas por Cobrar — replaces the former
 * separate standalone reports (both removed). State lives in
 * `AssetsReceivablesReportStateService` (a root-provided singleton), not
 * local signals, so checkboxes/filters/results survive navigating away and
 * back — see that service's own doc comment for why. This component is a
 * thin view over it, same draft/applied filter split every other report
 * page in this app already uses.
 */
@Component({
  selector: 'app-assets-receivables-report-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonComponent,
    IconComponent,
    BadgeComponent,
    ReportSummaryComponent,
    ReportPaginationComponent,
    ClientFilterSearchComponent,
  ],
  templateUrl: './assets-receivables-report-page.component.html',
  styleUrl: './assets-receivables-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetsReceivablesReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly notificationService = inject(NotificationService);
  readonly state = inject(AssetsReceivablesReportStateService);

  private readonly LIMIT = 20;

  readonly showTypeColumn = computed(() => this.state.includeAssets() && this.state.includeReceivables());

  readonly hasActiveFilters = computed(
    () =>
      !this.state.includeAssets() ||
      !this.state.includeReceivables() ||
      this.state.client() !== null ||
      this.state.startDate() !== '' ||
      this.state.endDate() !== '' ||
      this.state.status() !== 'all' ||
      this.state.search() !== '',
  );

  readonly summaryTiles = computed<ReportSummaryTile[]>(() => {
    const s = this.state.summary();
    const wantsAssets = this.state.includeAssets();
    const wantsReceivables = this.state.includeReceivables();
    const tiles: ReportSummaryTile[] = [];

    if (wantsAssets) {
      tiles.push({
        icon: 'package',
        title: 'Total Activos',
        value: formatCurrency(s?.totalAssets ?? 0),
        description: 'según los filtros aplicados',
      });
    }
    if (wantsReceivables) {
      tiles.push({
        icon: 'receipt',
        title: 'Total Cuentas por Cobrar',
        value: formatCurrency(s?.totalAccountsReceivable ?? 0),
        description: 'según los filtros aplicados',
      });
    }
    if (wantsAssets && wantsReceivables) {
      tiles.push({
        icon: 'trending-up',
        title: 'Total General',
        value: formatCurrency(s?.totalGeneral ?? 0),
        description: 'activos + cuentas por cobrar',
      });
    }
    tiles.push({
      icon: 'bar-chart',
      title: 'Total de Registros',
      value: formatQuantity(s?.recordCount ?? 0),
      description: 'registros en el período',
    });

    return tiles;
  });

  formatCurrency = formatCurrency;
  typeLabel(type: AssetsReceivablesReportType): string {
    return TYPE_LABEL[type];
  }

  constructor() {
    // Auto-query on first visit only — a subsequent revisit restores the last-fetched results from the state service instead of refetching.
    if (!this.state.hasQueried()) {
      this.runQuery();
    }
  }

  onDraftClientChange(client: Client | null): void {
    this.state.draftClient.set(client);
  }

  applyFilters(): void {
    if (!this.state.draftIncludeAssets() && !this.state.draftIncludeReceivables()) {
      this.notificationService.error('Debe seleccionar al menos un tipo de reporte.');
      return;
    }
    if (
      this.state.draftStartDate() &&
      this.state.draftEndDate() &&
      this.state.draftStartDate() > this.state.draftEndDate()
    ) {
      this.notificationService.error('La fecha de inicio debe ser anterior o igual a la fecha final.');
      return;
    }

    this.state.includeAssets.set(this.state.draftIncludeAssets());
    this.state.includeReceivables.set(this.state.draftIncludeReceivables());
    this.state.client.set(this.state.draftClient());
    this.state.startDate.set(this.state.draftStartDate());
    this.state.endDate.set(this.state.draftEndDate());
    this.state.status.set(this.state.draftStatus());
    this.state.search.set(this.state.draftSearch());

    this.state.page.set(1);
    this.runQuery();
  }

  clearFilters(): void {
    this.state.draftIncludeAssets.set(true);
    this.state.draftIncludeReceivables.set(true);
    this.state.draftClient.set(null);
    this.state.draftStartDate.set('');
    this.state.draftEndDate.set('');
    this.state.draftStatus.set('all');
    this.state.draftSearch.set('');

    this.state.includeAssets.set(true);
    this.state.includeReceivables.set(true);
    this.state.client.set(null);
    this.state.startDate.set('');
    this.state.endDate.set('');
    this.state.status.set('all');
    this.state.search.set('');

    this.state.page.set(1);
    this.runQuery();
  }

  onPageChange(page: number): void {
    this.state.page.set(page);
    this.fetchTable();
  }

  exportPdf(): void {
    this.state.exporting.set(true);
    this.reportsService.exportAssetsReceivablesReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.state.exporting.set(false);
        downloadBlob(blob, buildExportFilename(this.state.startDate(), this.state.endDate()));
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.state.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  private currentFilters(): AssetsReceivablesReportFilters {
    const types: AssetsReceivablesReportType[] = [
      ...(this.state.includeAssets() ? (['assets'] as const) : []),
      ...(this.state.includeReceivables() ? (['accounts_receivable'] as const) : []),
    ];
    return {
      types,
      clientId: this.state.client()?.id,
      startDate: this.state.startDate() || undefined,
      endDate: this.state.endDate() || undefined,
      status: this.state.status(),
      search: this.state.search() || undefined,
      page: this.state.page(),
      limit: this.LIMIT,
    };
  }

  private runQuery(): void {
    if (!this.state.includeAssets() && !this.state.includeReceivables()) {
      this.notificationService.error('Debe seleccionar al menos un tipo de reporte.');
      return;
    }

    this.state.hasQueried.set(true);
    this.state.loadingSummary.set(true);
    this.reportsService.getAssetsReceivablesReportSummary(this.currentFilters()).subscribe({
      next: (summary) => {
        this.state.summary.set(summary);
        this.state.loadingSummary.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.state.loadingSummary.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el resumen.'));
      },
    });
    this.fetchTable();
  }

  private fetchTable(): void {
    this.state.loadingTable.set(true);
    this.reportsService.getAssetsReceivablesReport(this.currentFilters()).subscribe({
      next: (result) => {
        this.state.rows.set(result.items);
        this.state.total.set(result.total);
        this.state.loadingTable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.state.loadingTable.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo cargar el reporte de activos y cuentas por cobrar.'),
        );
      },
    });
  }
}
