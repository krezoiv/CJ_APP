import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Supplier } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { SupplierService } from '../../../core/services/supplier.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { SupplierSummaryComponent } from './components/supplier-summary/supplier-summary.component';
import { SupplierToolbarComponent, StatusFilterValue } from './components/supplier-toolbar/supplier-toolbar.component';
import { SupplierTableComponent } from './components/supplier-table/supplier-table.component';
import { SupplierFormModalComponent } from './components/supplier-form-modal/supplier-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [
    SupplierSummaryComponent,
    SupplierToolbarComponent,
    SupplierTableComponent,
    SupplierFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './suppliers-page.component.html',
  styleUrl: './suppliers-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** A structural clone of `CategoriesPageComponent` — see that component's own doc comment. One real difference: uniqueness is on `taxId`, not `name` (see the backend's `SuppliersController`), so this screen's search/filter never assumes `name` is unique. */
export class SuppliersPageComponent {
  private readonly supplierService = inject(SupplierService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly suppliers = signal<Supplier[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingSupplier = signal<Supplier | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingSupplier = signal<Supplier | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredSuppliers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.suppliers().filter((supplier) => {
      const matchesTerm =
        !term ||
        supplier.name.toLowerCase().includes(term) ||
        (supplier.taxId ?? '').toLowerCase().includes(term) ||
        (supplier.phone ?? '').toLowerCase().includes(term);
      const matchesStatus =
        status === 'all' || (status === 'active' ? supplier.isActive : !supplier.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all');

  constructor() {
    this.fetchSuppliers();
  }

  private fetchSuppliers(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive suppliers too (with a status badge/filter).
    this.supplierService.getSuppliers(true).subscribe({
      next: (suppliers) => {
        this.suppliers.set(suppliers);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los proveedores.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingSupplier.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(supplier: Supplier): void {
    this.editingSupplier.set(supplier);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onSupplierSaved(supplier: Supplier): void {
    const wasEditing = this.editingSupplier() !== null;
    this.isFormOpen.set(false);

    this.suppliers.update((list) =>
      wasEditing ? list.map((s) => (s.id === supplier.id ? supplier : s)) : [supplier, ...list]
    );

    this.notificationService.success(
      wasEditing ? `"${supplier.name}" se actualizó correctamente.` : `"${supplier.name}" se agregó correctamente.`
    );
  }

  requestDelete(supplier: Supplier): void {
    this.deletingSupplier.set(supplier);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingSupplier.set(null);
  }

  confirmDelete(): void {
    const supplier = this.deletingSupplier();
    if (!supplier) {
      return;
    }

    this.isDeleting.set(true);
    this.supplierService.deleteSupplier(supplier.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingSupplier.set(null);
        this.suppliers.update((list) =>
          list.map((s) => (s.id === supplier.id ? { ...s, isActive: false } : s))
        );
        this.notificationService.success(`"${supplier.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el proveedor.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
