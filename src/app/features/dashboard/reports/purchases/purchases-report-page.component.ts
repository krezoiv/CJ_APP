import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  Business,
  Category,
  Product,
  PurchaseReportDetail,
  PurchasesByProductRow,
  PurchasesReportFilters,
  PurchasesReportRow,
  PurchasesReportSummary,
  ReportSortDirection,
  ReportSortField,
  Supplier,
  User,
  formatCurrency,
  formatQuantity,
} from '../../../../core/models';
import { BusinessService } from '../../../../core/services/business.service';
import { CategoryService } from '../../../../core/services/category.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReportsService } from '../../../../core/services/reports.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { UserService } from '../../../../core/services/user.service';
import { downloadBlob } from '../../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../../core/utils/extract-blob-error-message';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../shared/ui';
import { ReportSummaryComponent, ReportSummaryTile } from '../components/report-summary/report-summary.component';
import { ReportPaginationComponent } from '../components/report-pagination/report-pagination.component';
import { ProductFilterSearchComponent } from '../components/product-filter-search/product-filter-search.component';
import { PurchasesReportTableComponent } from './components/purchases-report-table/purchases-report-table.component';
import { PurchaseDetailModalComponent } from './components/purchase-detail-modal/purchase-detail-modal.component';

type ViewMode = 'detail' | 'byProduct';

interface FilterFieldsState {
  startDate: string;
  endDate: string;
  supplierId: string;
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

/** Same "current month" default as the Sales report — see that page's doc comment. */
function firstDayOfMonthIsoDate(): string {
  const now = new Date();
  return toIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultFilterFields(): FilterFieldsState {
  return {
    startDate: firstDayOfMonthIsoDate(),
    endDate: todayIsoDate(),
    supplierId: '',
    categoryId: '',
    businessId: '',
    selectedProduct: null,
    userId: '',
  };
}

@Component({
  selector: 'app-purchases-report-page',
  standalone: true,
  imports: [
    FormsModule,
    ButtonComponent,
    IconComponent,
    ReportSummaryComponent,
    ReportPaginationComponent,
    ProductFilterSearchComponent,
    PurchasesReportTableComponent,
    PurchaseDetailModalComponent,
  ],
  templateUrl: './purchases-report-page.component.html',
  styleUrl: './purchases-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesReportPageComponent {
  private readonly reportsService = inject(ReportsService);
  private readonly categoryService = inject(CategoryService);
  private readonly businessService = inject(BusinessService);
  private readonly userService = inject(UserService);
  private readonly supplierService = inject(SupplierService);
  private readonly notificationService = inject(NotificationService);

  private readonly LIMIT = 20;

  readonly categories = signal<Category[]>([]);
  readonly businesses = signal<Business[]>([]);
  readonly users = signal<User[]>([]);
  readonly suppliers = signal<Supplier[]>([]);

  /** Draft (form-bound) vs applied (query-driving) filter split — see `SalesReportPageComponent`'s own doc comment for why this exists: it's what guarantees "Exportar PDF" can never export a filter edit that was never applied. */
  readonly draftStartDate = signal(firstDayOfMonthIsoDate());
  readonly draftEndDate = signal(todayIsoDate());
  readonly draftSupplierId = signal('');
  readonly draftCategoryId = signal('');
  readonly draftBusinessId = signal('');
  readonly draftSelectedProduct = signal<Product | null>(null);
  readonly draftUserId = signal('');

  readonly startDate = signal(firstDayOfMonthIsoDate());
  readonly endDate = signal(todayIsoDate());
  readonly supplierId = signal('');
  readonly categoryId = signal('');
  readonly businessId = signal('');
  readonly selectedProduct = signal<Product | null>(null);
  readonly userId = signal('');

  readonly viewMode = signal<ViewMode>('detail');
  readonly sortBy = signal<ReportSortField>('date');
  readonly sortDirection = signal<ReportSortDirection>('desc');
  readonly page = signal(1);

  readonly rows = signal<PurchasesReportRow[]>([]);
  readonly total = signal(0);
  readonly byProductRows = signal<PurchasesByProductRow[]>([]);
  readonly byProductTotal = signal(0);
  readonly summary = signal<PurchasesReportSummary | null>(null);

  readonly loadingTable = signal(false);
  readonly loadingSummary = signal(false);
  readonly exporting = signal(false);

  readonly isDetailModalOpen = signal(false);
  readonly isDetailLoading = signal(false);
  readonly purchaseDetail = signal<PurchaseReportDetail | null>(null);

  /** Reflects the *applied* filters (matches what's actually on screen), not the draft form fields. */
  readonly hasActiveFilters = computed(() => {
    const defaults = defaultFilterFields();
    return (
      this.supplierId() !== defaults.supplierId ||
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
        title: 'Total comprado',
        value: formatCurrency(s?.totalAmount ?? 0),
        description: 'en el período seleccionado',
      },
      {
        icon: 'truck',
        title: 'Cantidad de compras',
        value: formatQuantity(s?.purchasesCount ?? 0),
        description: 'compras registradas',
      },
      {
        icon: 'package',
        title: 'Productos comprados',
        value: formatQuantity(s?.unitsPurchased ?? 0),
        description: 'unidades compradas',
      },
      {
        icon: 'trending-up',
        title: 'Promedio por compra',
        value: formatCurrency(s?.averagePurchase ?? 0),
        description: 'costo promedio',
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
    this.supplierService.getSuppliers().subscribe({
      next: (suppliers) => this.suppliers.set(suppliers),
      error: () => this.notificationService.error('No se pudieron cargar los proveedores.'),
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
    this.supplierId.set(this.draftSupplierId());
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
    this.draftSupplierId.set(defaults.supplierId);
    this.draftCategoryId.set(defaults.categoryId);
    this.draftBusinessId.set(defaults.businessId);
    this.draftSelectedProduct.set(defaults.selectedProduct);
    this.draftUserId.set(defaults.userId);

    this.startDate.set(defaults.startDate);
    this.endDate.set(defaults.endDate);
    this.supplierId.set(defaults.supplierId);
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
    this.purchaseDetail.set(null);
    this.reportsService.getPurchaseReportDetail(id).subscribe({
      next: (detail) => {
        this.purchaseDetail.set(detail);
        this.isDetailLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.isDetailLoading.set(false);
        this.isDetailModalOpen.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el detalle de la compra.'));
      },
    });
  }

  closeDetail(): void {
    this.isDetailModalOpen.set(false);
    this.purchaseDetail.set(null);
  }

  /** Always exports exactly the applied filters — never the draft form fields — so the PDF can never show different data than what's currently on screen. */
  exportPdf(): void {
    this.exporting.set(true);
    this.reportsService.exportPurchasesReportPdf(this.currentFilters()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `reporte-compras-${todayIsoDate()}.pdf`);
        this.notificationService.success('El PDF se generó correctamente.');
      },
      error: async (error: HttpErrorResponse) => {
        this.exporting.set(false);
        this.notificationService.error(await extractBlobErrorMessage(error, 'No se pudo exportar el reporte.'));
      },
    });
  }

  private currentFilters(): PurchasesReportFilters {
    return {
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      supplierId: this.supplierId() || undefined,
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
    this.reportsService.getPurchasesReportSummary(this.currentFilters()).subscribe({
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
      this.reportsService.getPurchasesReport(this.currentFilters()).subscribe({
        next: (result) => {
          this.rows.set(result.items);
          this.total.set(result.total);
          this.loadingTable.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loadingTable.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el reporte de compras.'));
        },
      });
    } else {
      this.reportsService.getPurchasesByProductReport(this.currentFilters()).subscribe({
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
