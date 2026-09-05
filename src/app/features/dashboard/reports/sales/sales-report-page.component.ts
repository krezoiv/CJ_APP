import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Business,
  Category,
  Product,
  ReportSortDirection,
  ReportSortField,
  SaleReportDetail,
  SalesByProductRow,
  SalesReportFilters,
  SalesReportRow,
  SalesReportSummary,
  User,
  formatCurrency,
  formatQuantity,
} from '../../../../core/models';
import { BusinessService } from '../../../../core/services/business.service';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { UserService } from '../../../../core/services/user.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';
import { ProductFilterSearchComponent } from '../components/product-filter-search/product-filter-search.component';
import { SalesReportTableComponent } from './components/sales-report-table/sales-report-table.component';
import { SaleDetailModalComponent } from './components/sale-detail-modal/sale-detail-modal.component';

type ViewMode = 'detail' | 'byProduct';

interface FilterFieldsState {
  startDate: string;
  endDate: string;
  categoryId: string;
  businessId: string;
  selectedProduct: Product | null;
  userId: string;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/** Default filter window is "current month" — a reasonable, non-empty starting point rather than either "no filters" (every sale ever) or a blank form. Both reports use the same default for consistency. */
function firstDayOfMonthIsoDate(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultFilterFields(): FilterFieldsState {
  return {
    startDate: firstDayOfMonthIsoDate(),
    endDate: todayIsoDate(),
    categoryId: '',
    businessId: '',
    selectedProduct: null,
    userId: '',
  };
}

@Component({
  selector: 'app-sales-report-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IconComponent,
    ReportSummaryComponent,
    ReportPaginationComponent,
    ProductFilterSearchComponent,
    SalesReportTableComponent,
    SaleDetailModalComponent,
  ],
  templateUrl: './sales-report-page.component.html',
  styleUrl: './sales-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly categoryService = inject(CategoryService);
  private readonly businessService = inject(BusinessService);
  private readonly userService = inject(UserService);
  private readonly notificationService = inject(NotificationService);

  private readonly LIMIT = 20;

  readonly categories = signal<Category[]>([]);
  readonly businesses = signal<Business[]>([]);
  readonly users = signal<User[]>([]);

  /**
   * Two copies of every filter field, on purpose. `draft*` is what the form
   * inputs are bound to — editing a field only ever touches these. The
   * plain (`startDate`, `categoryId`, etc.) signals are the *applied*
   * filters: the ones the table, the summary tiles, and "Exportar PDF" all
   * actually query against. They only change inside `applyFilters()`/
   * `clearFilters()`, copied from the draft. This is what guarantees the
   * PDF can never reflect a filter edit that was typed but never applied —
   * before this, `exportPdf()` read the live (draft) signals directly, so
   * clicking "Exportar PDF" right after changing a dropdown but before
   * clicking "Aplicar filtros" could export different data than what the
   * table on screen was still showing.
   */
  readonly draftStartDate = signal(firstDayOfMonthIsoDate());
  readonly draftEndDate = signal(todayIsoDate());
  readonly draftCategoryId = signal('');
  readonly draftBusinessId = signal('');
  readonly draftSelectedProduct = signal<Product | null>(null);
  readonly draftUserId = signal('');

  readonly startDate = signal(firstDayOfMonthIsoDate());
  readonly endDate = signal(todayIsoDate());
  readonly categoryId = signal('');
  readonly businessId = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly userId = signal('');

  readonly viewMode = signal<ViewMode>('detail');
  readonly sortBy = signal<ReportSortField>('date');
  readonly sortDirection = signal<ReportSortDirection>('desc');
  readonly page = signal(1);

  readonly rows = signal<SalesReportRow[]>([]);
  readonly total = signal(0);
  readonly byProductRows = signal<SalesByProductRow[]>([]);
  readonly byProductTotal = signal(0);
  readonly summary = signal<SalesReportSummary | null>(null);

  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);

  readonly isDetailModalOpen = signal(false);
  readonly isDetailLoading = signal(false);
  readonly saleDetail = signal<SaleReportDetail | null>(null);

  /** Reflects the *applied* filters (matches what's actually on screen), not the draft form fields. */
  readonly hasActiveFilters = computed(() => {
    const defaults = defaultFilterFields();
    return (
      this.categoryId() !== defaults.categoryId ||
      this.businessId() !== defaults.businessId ||
      this.selectedProduct() !== null ||
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
        title: 'Total de ventas',
        value: formatCurrency(s?.totalAmount ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'receipt',
        title: 'Cantidad de ventas',
        value: formatQuantity(s?.salesCount ?? 0),
        description: 'ventas registradas',
      },
      {
        icon: 'package',
        title: 'Productos vendidos',
        value: formatQuantity(s?.unitsSold ?? 0),
        description: 'unidades vendidas',
      },
      {
        icon: 'trending-up',
        title: 'Promedio por venta',
        value: formatCurrency(s?.averageTicket ?? 0),
        description: 'ticket promedio',
      },
    ];
  });

  formatCurrency = formatCurrency;

  constructor() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.notificationService.error('No se pudieron cargar las categorías.'),
    });
    this.businessService.getBusinesses().subscribe({
      next: (businesses) => this.businesses.set(businesses),
      error: () => this.notificationService.error('No se pudieron cargar los negocios.'),
    });
    this.userService.getUsers().subscribe({
      next: (users) => this.users.set(users),
      error: () => this.notificationService.error('No se pudieron cargar los usuarios.'),
    });
    this.fetchAll();
  }

  onProductSelectionChange(product: Product | null): void {
    this.draftSelectedProduct.set(product);
  }

  applyFilters(): void {
    if (this.draftStartDate() && this.draftEndDate() && this.draftStartDate() > this.draftEndDate()) {
      this.notificationService.error('La fecha de inicio debe ser anterior o igual a la fecha final.');
      return;
    }

    this.startDate.set(this.draftStartDate());
    this.endDate.set(this.draftEndDate());
    this.categoryId.set(this.draftCategoryId());
    this.businessId.set(this.draftBusinessId());
    this.selectedProduct.set(this.draftSelectedProduct());
    this.userId.set(this.draftUserId());

    this.page.set(1);
    this.fetchAll();
  }

  clearFilters(): void {
    const defaults = defaultFilterFields();

    this.draftStartDate.set(defaults.startDate);
    this.draftEndDate.set(defaults.endDate);
    this.draftCategoryId.set(defaults.categoryId);
    this.draftBusinessId.set(defaults.businessId);
    this.draftSelectedProduct.set(defaults.selectedProduct);
    this.draftUserId.set(defaults.userId);

    this.startDate.set(defaults.startDate);
    this.endDate.set(defaults.endDate);
    this.categoryId.set(defaults.categoryId);
    this.businessId.set(defaults.businessId);
    this.selectedProduct.set(defaults.selectedProduct);
    this.userId.set(defaults.userId);

    this.sortBy.set('date');
    this.sortDirection.set('desc');
    this.page.set(1);
    this.fetchAll();
  }

  setViewMode(mode: ViewMode): void {
    if (this.viewMode() === mode) {
      return;
    }
    this.viewMode.set(mode);
    this.page.set(1);
    this.fetchTable();
  }

  onSortChange(change: { sortBy: ReportSortField; sortDirection: ReportSortDirection }): void {
    this.sortBy.set(change.sortBy);
    this.sortDirection.set(change.sortDirection);
    this.page.set(1);
    this.fetchTable();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.fetchTable();
  }

  viewDetail(id: string): void {
    this.isDetailModalOpen.set(true);
    this.isDetailLoading.set(true);
    this.saleDetail.set(null);
    this.reportsService.getSaleReportDetail(id).subscribe({
      next: (detail) => {
        this.saleDetail.set(detail);
        this.isDetailLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isDetailLoading.set(false);
        this.isDetailModalOpen.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el detalle de la venta.'));
      },
    });
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.saleDetail.set(null);
  }

  /** Always exports exactly the applied filters — never the draft form fields — so the PDF can never show different data than what's currently on screen. */
  exportPdf(): void {
    this.exporting.set(true);
    this.reportsService.exportSalesReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `reporte-ventas-${todayIsoDate()}.pdf`);
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  private currentFilters(): SalesReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      categoryId: this.categoryId() || undefined,
      businessId: this.businessId() || undefined,
      productId: this.selectedProduct()?.id,
      userId: this.userId() || undefined,
      sortBy: this.sortBy(),
      sortDirection: this.sortDirection(),
      page: this.page(),
      limit: this.LIMIT,
    };
  }

  private fetchAll(): void {
    this.loadingSummary.set(true);
    this.reportsService.getSalesReportSummary(this.currentFilters()).subscribe({
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
    if (this.viewMode() === 'detail') {
      this.reportsService.getSalesReport(this.currentFilters()).subscribe({
        next: (result) => {
          this.rows.set(result.items);
          this.total.set(result.total);
          this.loadingTable.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loadingTable.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de ventas.'));
        },
      });
    } else {
      this.reportsService.getSalesByProductReport(this.currentFilters()).subscribe({
        next: (result) => {
          this.byProductRows.set(result.items);
          this.byProductTotal.set(result.total);
          this.loadingTable.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loadingTable.set(false);
          this.notificationService.error(
            extractErrorMessage(error, 'No se pudo cargar el reporte por producto.'),
          );
        },
      });
    }
  }
}
