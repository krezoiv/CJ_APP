import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TransactionType } from '../../../core/models';
import { TransactionTypeService } from '../../../core/services/transaction-type.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { TransactionTypeSummaryComponent } from './components/transaction-type-summary/transaction-type-summary.component';
import { TransactionTypeToolbarComponent, TransactionTypeStatusFilterValue } from './components/transaction-type-toolbar/transaction-type-toolbar.component';
import { TransactionTypeTableComponent } from './components/transaction-type-table/transaction-type-table.component';
import { TransactionTypeFormModalComponent } from './components/transaction-type-form-modal/transaction-type-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-transaction-types-page',
  standalone: true,
  imports: [
    TransactionTypeSummaryComponent,
    TransactionTypeToolbarComponent,
    TransactionTypeTableComponent,
    TransactionTypeFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './transaction-types-page.component.html',
  styleUrl: './transaction-types-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * "Tipo de Transacción" — Depósito, Retiro, Desembolso Préstamo, Pago
 * Cheque, etc. Selected on Transaccionar's own dashboard before a deposit
 * registration begins. Structurally a clone of `CategoriesPageComponent`
 * — see that component's own doc comment.
 */
export class TransactionTypesPageComponent {
  private readonly transactionTypeService = inject(TransactionTypeService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly transactionTypes = signal<TransactionType[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<TransactionTypeStatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingTransactionType = signal<TransactionType | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingTransactionType = signal<TransactionType | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredTransactionTypes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.transactionTypes().filter((transactionType) => {
      const matchesTerm = !term || transactionType.name.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? transactionType.isActive : !transactionType.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  constructor() {
    this.fetchTransactionTypes();
  }

  private fetchTransactionTypes(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive account types too (with a status badge/filter).
    this.transactionTypeService.getTransactionTypes(true).subscribe({
      next: (transactionTypes) => {
        this.transactionTypes.set(transactionTypes);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los tipos de transacción.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingTransactionType.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(transactionType: TransactionType): void {
    this.editingTransactionType.set(transactionType);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onTransactionTypeSaved(transactionType: TransactionType): void {
    const wasEditing = this.editingTransactionType() !== null;
    this.isFormOpen.set(false);

    this.transactionTypes.update((list) =>
      wasEditing ? list.map((a) => (a.id === transactionType.id ? transactionType : a)) : [transactionType, ...list],
    );

    this.notificationService.success(
      wasEditing ? `"${transactionType.name}" se actualizó correctamente.` : `"${transactionType.name}" se agregó correctamente.`,
    );
  }

  requestDelete(transactionType: TransactionType): void {
    this.deletingTransactionType.set(transactionType);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingTransactionType.set(null);
  }

  confirmDelete(): void {
    const transactionType = this.deletingTransactionType();
    if (!transactionType) {
      return;
    }

    this.isDeleting.set(true);
    this.transactionTypeService.deleteTransactionType(transactionType.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingTransactionType.set(null);
        this.transactionTypes.update((list) =>
          list.map((a) => (a.id === transactionType.id ? { ...a, isActive: false } : a)),
        );
        this.notificationService.success(`"${transactionType.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el tipo de transacción.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
