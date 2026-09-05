import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IceCream, IceCreamReportFilters, IceCreamReportType, User, formatCurrency, formatQuantity } from '../../../../core/models';
import { IceCreamReportStateService } from '../../../../core/services/ice-cream-report-state.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { UserService } from '../../../../core/services/user.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';
import { IceCreamFilterSearchComponent } from '../components/ice-cream-filter-search/ice-cream-filter-search.component';

const TYPE_LABEL: Record<IceCreamReportType, string> = {
  sales: 'Venta',
  purchases: 'Compra',
};

/** `yyyy-MM-dd` → `dd-al-dd`/plain date, mirrors the backend's own filename logic exactly (`IceCreamReportController.buildExportFilename`). */
function buildExportFilename(startDate: string, endDate: string): string {
  if (startDate && endDate) {
    return `reporte-heladeria-${startDate}-al-${endDate}.pdf`;
  }
  const today = new Date().toISOString().slice(0, 10);
  return `reporte-heladeria-${today}.pdf`;
}

/**
 * Unified Reportería de Heladería — replaces the former separate Ventas/
 * Compras de Heladería reports (both removed). State lives in
 * `IceCreamReportStateService` (root-provided singleton), same
 * survives-navigation reasoning as `AssetsReceivablesReportPageComponent`
 * (see that page's own doc comment) — this page mirrors it structurally.
 */
@Component({
  selector: 'app-ice-cream-report-page',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    ButtonComponent,
    IconComponent,
    ReportSummaryComponent,
    ReportPaginationComponent,
    IceCreamFilterSearchComponent,
  ],
  templateUrl: './ice-cream-report-page.component.html',
  styleUrl: './ice-cream-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);
  readonly state = inject(IceCreamReportStateService);

  private readonly LIMIT = 20;

  readonly users = signal<User[]>([]);

  readonly showTypeColumn = computed(() => this.state.includeSales() && this.state.includePurchases());

  readonly hasActiveFilters = computed(
    () =>
      !this.state.includeSales() ||
      !this.state.includePurchases() ||
      this.state.iceCream() !== null ||
      this.state.user() !== null ||
      this.state.startDate() !== '' ||
      this.state.endDate() !== '',
  );

  readonly summaryTiles = computed<ReportSummaryTile[]>(() => {
    const s = this.state.summary();
    const wantsSales = this.state.includeSales();
    const wantsPurchases = this.state.includePurchases();
    const tiles: ReportSummaryTile[] = [];

    if (wantsSales) {
      tiles.push({
        icon: 'receipt',
        title: 'Total de Ventas',
        value: formatCurrency(s?.totalSales ?? 0),
        description: 'en el período seleccionado',
      });
    }
    if (wantsPurchases) {
      tiles.push({
        icon: 'arrow-down-circle',
        title: 'Total de Compras',
        value: formatCurrency(s?.totalPurchases ?? 0),
        description: 'en el período seleccionado',
      });
    }
    if (wantsSales && wantsPurchases) {
      tiles.push({
        icon: 'trending-up',
        title: 'Diferencia',
        value: formatCurrency(s?.difference ?? 0),
        description: 'ventas menos compras',
      });
    }
    tiles.push({
      icon: 'bar-chart',
      title: 'Total de Movimientos',
      value: formatQuantity(s?.recordCount ?? 0),
      description: 'registros en el período',
    });

    return tiles;
  });

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;
  typeLabel(type: IceCreamReportType): string {
    return TYPE_LABEL[type];
  }

  constructor() {
    this.userService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.notificationService.error('No se pudieron cargar los usuarios.'),
    });

    if (!this.state.hasQueried()) {
      this.runQuery();
    }
  }

  onDraftIceCreamChange(iceCream: IceCream | null): void {
    this.state.draftIceCream.set(iceCream);
  }

  onDraftUserChange(userId: string): void {
    this.state.draftUser.set(this.users().find((u) => u.id === userId) ?? null);
  }

  applyFilters(): void {
    if (!this.state.draftIncludeSales() && !this.state.draftIncludePurchases()) {
      this.notificationService.error('Debe seleccionar al menos un tipo de movimiento.');
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

    this.state.includeSales.set(this.state.draftIncludeSales());
    this.state.includePurchases.set(this.state.draftIncludePurchases());
    this.state.iceCream.set(this.state.draftIceCream());
    this.state.user.set(this.state.draftUser());
    this.state.startDate.set(this.state.draftStartDate());
    this.state.endDate.set(this.state.draftEndDate());

    this.state.page.set(1);
    this.runQuery();
  }

  clearFilters(): void {
    this.state.draftIncludeSales.set(true);
    this.state.draftIncludePurchases.set(true);
    this.state.draftIceCream.set(null);
    this.state.draftUser.set(null);
    this.state.draftStartDate.set('');
    this.state.draftEndDate.set('');

    this.state.includeSales.set(true);
    this.state.includePurchases.set(true);
    this.state.iceCream.set(null);
    this.state.user.set(null);
    this.state.startDate.set('');
    this.state.endDate.set('');

    this.state.page.set(1);
    this.runQuery();
  }

  onPageChange(page: number): void {
    this.state.page.set(page);
    this.fetchTable();
  }

  exportPdf(): void {
    this.state.exporting.set(true);
    this.reportsService.exportIceCreamReportPdf(this.currentFilters()).subscribe({
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

  private currentFilters(): IceCreamReportFilters {
    const types: IceCreamReportType[] = [
      ...(this.state.includeSales() ? (['sales'] as const) : []),
      ...(this.state.includePurchases() ? (['purchases'] as const) : []),
    ];
    return {
      types,
      startDate: this.state.startDate() || undefined,
      endDate: this.state.endDate() || undefined,
      iceCreamId: this.state.iceCream()?.id,
      userId: this.state.user()?.id,
      page: this.state.page(),
      limit: this.LIMIT,
    };
  }

  private runQuery(): void {
    if (!this.state.includeSales() && !this.state.includePurchases()) {
      this.notificationService.error('Debe seleccionar al menos un tipo de movimiento.');
      return;
    }

    this.state.hasQueried.set(true);
    this.state.loadingSummary.set(true);
    this.reportsService.getIceCreamReportSummary(this.currentFilters()).subscribe({
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
    this.reportsService.getIceCreamReport(this.currentFilters()).subscribe({
      next: (result) => {
        this.state.rows.set(result.items);
        this.state.total.set(result.total);
        this.state.loadingTable.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.state.loadingTable.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de heladería.'));
      },
    });
  }
}
