import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Business, Category, Product, UnitOfMeasureListItem, getStockStatus } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { BusinessService } from '../../../core/services/business.service';
import { UnitOfMeasureService } from '../../../core/services/unit-of-measure.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { downloadBlob } from '../../../core/utils/download-blob';
import { extractBlobErrorMessage } from '../../../core/utils/extract-blob-error-message';
import { InventorySummaryComponent } from './components/inventory-summary/inventory-summary.component';
import { InventoryToolbarComponent, StockFilterValue } from './components/inventory-toolbar/inventory-toolbar.component';
import { ProductTableComponent } from './components/product-table/product-table.component';
import { ProductFormModalComponent } from './components/product-form-modal/product-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';
import { TransferInventoryModalComponent } from './components/transfer-inventory-modal/transfer-inventory-modal.component';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [
    InventorySummaryComponent,
    InventoryToolbarComponent,
    ProductTableComponent,
    ProductFormModalComponent,
    DeleteConfirmModalComponent,
    TransferInventoryModalComponent,
  ],
  templateUrl: './inventory-page.component.html',
  styleUrl: './inventory-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Same summary/toolbar/table/form-modal/delete-modal split as
 * `CategoriesPageComponent`, with two real additions: two dependent
 * reference-data dropdowns (`categoryOptions`/`businessOptions`, both
 * fetched once from their own services) and filtering that also matches
 * SKU, not just name.
 *
 * Filtering/sorting/searching all happen client-side over one fetched
 * page (`InventoryService.getProducts()` asks for `limit=100`), even
 * though the backend's `GET /products` already supports `search`/
 * `categoryId`/`businessId`/`sortBy`/`page` as real query params. This
 * was a deliberate "swap the data source, don't rearchitect an
 * already-working filter UI" call, not an oversight — wiring the
 * toolbar to drive those params directly instead is a legitimate future
 * improvement if the catalog grows past what one page comfortably holds.
 */
export class InventoryPageComponent {
  private readonly inventoryService = inject(InventoryService);
  private readonly categoryService = inject(CategoryService);
  private readonly businessService = inject(BusinessService);
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isTransferOpen = signal(false);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);

  /** Real categories from the backend, for the product form's dropdown — never hardcoded. */
  readonly categoryOptions = signal<Category[]>([]);
  /** Real businesses (líneas de negocio) from the backend, for the product form's dropdown — never hardcoded. */
  readonly businessOptions = signal<Business[]>([]);
  /** Real, active units of measure from the backend, for the product form's dropdown — never hardcoded. */
  readonly unitOfMeasureOptions = signal<UnitOfMeasureListItem[]>([]);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal('');
  readonly selectedBusiness = signal('');
  readonly stockFilter = signal<StockFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingProduct = signal<Product | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingProduct = signal<Product | null>(null);
  readonly isDeleting = signal(false);

  /** Distinct category names already in use — what the toolbar's filter offers. */
  readonly categories = computed(() => [...new Set(this.products().map((p) => p.category))].sort());
  /** Distinct business names already in use — what the toolbar's filter offers. */
  readonly businesses = computed(() => [...new Set(this.products().map((p) => p.business))].sort());

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();
    const business = this.selectedBusiness();
    const stockFilter = this.stockFilter();

    return this.products().filter((product) => {
      const matchesTerm =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.business.toLowerCase().includes(term) ||
        (product.sku ?? '').toLowerCase().includes(term);
      const matchesCategory = !category || product.category === category;
      const matchesBusiness = !business || product.business === business;
      const matchesStock = stockFilter === 'all' || getStockStatus(product.stock) === stockFilter;
      return matchesTerm && matchesCategory && matchesBusiness && matchesStock;
    });
  });

  readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 ||
      this.selectedCategory().length > 0 ||
      this.selectedBusiness().length > 0 ||
      this.stockFilter() !== 'all'
  );

  constructor() {
    this.inventoryService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el inventario.'));
      },
    });

    this.categoryService.getCategories().subscribe({
      next: (categories) => this.categoryOptions.set(categories),
      error: () => this.notificationService.error('No se pudieron cargar las categorías.'),
    });

    this.businessService.getBusinesses().subscribe({
      next: (businesses) => this.businessOptions.set(businesses),
      error: () => this.notificationService.error('No se pudieron cargar los negocios.'),
    });

    this.unitOfMeasureService.getUnitsOfMeasure().subscribe({
      next: (unitsOfMeasure) => this.unitOfMeasureOptions.set(unitsOfMeasure),
      error: () => this.notificationService.error('No se pudieron cargar las unidades de medida.'),
    });
  }

  openCreateForm(): void {
    this.editingProduct.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(product: Product): void {
    this.editingProduct.set(product);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onProductSaved(product: Product): void {
    const wasEditing = this.editingProduct() !== null;
    this.isFormOpen.set(false);

    this.products.update((list) =>
      wasEditing ? list.map((p) => (p.id === product.id ? product : p)) : [product, ...list]
    );

    this.notificationService.success(
      wasEditing ? `"${product.name}" se actualizó correctamente.` : `"${product.name}" se agregó al inventario.`
    );
  }

  requestDelete(product: Product): void {
    this.deletingProduct.set(product);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingProduct.set(null);
  }

  confirmDelete(): void {
    const product = this.deletingProduct();
    if (!product) {
      return;
    }

    this.isDeleting.set(true);
    this.inventoryService.deleteProduct(product.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingProduct.set(null);
        this.products.update((list) => list.filter((p) => p.id !== product.id));
        this.notificationService.success(`"${product.name}" se desactivó del inventario.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el producto.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.selectedBusiness.set('');
    this.stockFilter.set('all');
  }

  viewDetail(product: Product): void {
    void this.router.navigate(['/dashboard/inventario', product.id]);
  }

  openTransferModal(): void {
    this.isTransferOpen.set(true);
  }

  closeTransferModal(): void {
    this.isTransferOpen.set(false);
  }

  /**
   * The toolbar's category/negocio filters store the selected *name*
   * (`categories()`/`businesses()` are distinct names pulled from already-
   * loaded products, not ids) — resolved back to the real id here via the
   * already-fetched `categoryOptions`/`businessOptions`, since the backend
   * export routes filter by id, not by display name. `search` maps
   * directly. The stock-status chip (Con stock/Stock bajo/Sin stock) has no
   * backend equivalent — it's purely a client-side computation over
   * `product.stock` — so it's deliberately never sent; the export always
   * reflects the search/categoría/negocio filters only, and a toast says so
   * when it's active so the export never silently looks "wrong".
   */
  private currentExportFilters(): { search?: string; categoryId?: string; businessId?: string } {
    const search = this.searchTerm().trim();
    const categoryName = this.selectedCategory();
    const businessName = this.selectedBusiness();

    return {
      search: search || undefined,
      categoryId: categoryName
        ? this.categoryOptions().find((c) => c.name === categoryName)?.id
        : undefined,
      businessId: businessName
        ? this.businessOptions().find((b) => b.name === businessName)?.id
        : undefined,
    };
  }

  private warnIfStockFilterActive(): void {
    if (this.stockFilter() !== 'all') {
      this.notificationService.info(
        'El filtro de estado de stock solo aplica en pantalla — la exportación incluye todos los productos que coinciden con la búsqueda, categoría y negocio seleccionados.',
      );
    }
  }

  onExportPdf(): void {
    this.warnIfStockFilterActive();
    this.inventoryService.exportProductsPdf(this.currentExportFilters()).subscribe({
      next: (blob) => downloadBlob(blob, `inventario-${Date.now()}.pdf`),
      error: async (error: HttpErrorResponse) =>
        this.notificationService.error(
          await extractBlobErrorMessage(error, 'No se pudo exportar el inventario a PDF.'),
        ),
    });
  }

  onExportExcel(): void {
    this.warnIfStockFilterActive();
    this.inventoryService.exportProductsExcel(this.currentExportFilters()).subscribe({
      next: (blob) => downloadBlob(blob, `inventario-${Date.now()}.xlsx`),
      error: async (error: HttpErrorResponse) =>
        this.notificationService.error(
          await extractBlobErrorMessage(error, 'No se pudo exportar el inventario a Excel.'),
        ),
    });
  }

  onTransferCompleted(): void {
    this.isTransferOpen.set(false);
    this.notificationService.success('Traslado registrado correctamente.');
    // Stock breakdown per product changed — the table's own Bodega/Vitrina
    // columns need the fresh totals, not just a toast.
    this.inventoryService.getProducts().subscribe((products) => this.products.set(products));
  }
}
