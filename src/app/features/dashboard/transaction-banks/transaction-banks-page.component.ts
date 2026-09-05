import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { TransactionBank } from '../../../core/models';
import { TransactionBankService } from '../../../core/services/transaction-bank.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { TransactionBankSummaryComponent } from './components/transaction-bank-summary/transaction-bank-summary.component';
import { TransactionBankToolbarComponent, TransactionBankStatusFilterValue } from './components/transaction-bank-toolbar/transaction-bank-toolbar.component';
import { TransactionBankTableComponent } from './components/transaction-bank-table/transaction-bank-table.component';
import { TransactionBankFormModalComponent } from './components/transaction-bank-form-modal/transaction-bank-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-transaction-banks-page',
  standalone: true,
  imports: [
    TransactionBankSummaryComponent,
    TransactionBankToolbarComponent,
    TransactionBankTableComponent,
    TransactionBankFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './transaction-banks-page.component.html',
  styleUrl: './transaction-banks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * "Banco Agente" — the simple catalog Transaccionar's bank dropdown reads
 * from. Deliberately separate from Bancos (Agentes Bancarios), which is a
 * heavier entity coupled to Cuadre de Agentes. Structurally a clone of
 * `CategoriesPageComponent` — see that component's own doc comment.
 */
export class TransactionBanksPageComponent {
  private readonly transactionBankService = inject(TransactionBankService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly transactionBanks = signal<TransactionBank[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<TransactionBankStatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingTransactionBank = signal<TransactionBank | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingTransactionBank = signal<TransactionBank | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredTransactionBanks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.transactionBanks().filter((transactionBank) => {
      const matchesTerm = !term || transactionBank.name.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? transactionBank.isActive : !transactionBank.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  constructor() {
    this.fetchTransactionBanks();
  }

  private fetchTransactionBanks(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive account types too (with a status badge/filter).
    this.transactionBankService.getTransactionBanks(true).subscribe({
      next: (transactionBanks) => {
        this.transactionBanks.set(transactionBanks);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los bancos agente.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingTransactionBank.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(transactionBank: TransactionBank): void {
    this.editingTransactionBank.set(transactionBank);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onTransactionBankSaved(transactionBank: TransactionBank): void {
    const wasEditing = this.editingTransactionBank() !== null;
    this.isFormOpen.set(false);

    this.transactionBanks.update((list) =>
      wasEditing ? list.map((a) => (a.id === transactionBank.id ? transactionBank : a)) : [transactionBank, ...list],
    );

    this.notificationService.success(
      wasEditing ? `"${transactionBank.name}" se actualizó correctamente.` : `"${transactionBank.name}" se agregó correctamente.`,
    );
  }

  requestDelete(transactionBank: TransactionBank): void {
    this.deletingTransactionBank.set(transactionBank);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingTransactionBank.set(null);
  }

  confirmDelete(): void {
    const transactionBank = this.deletingTransactionBank();
    if (!transactionBank) {
      return;
    }

    this.isDeleting.set(true);
    this.transactionBankService.deleteTransactionBank(transactionBank.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingTransactionBank.set(null);
        this.transactionBanks.update((list) =>
          list.map((a) => (a.id === transactionBank.id ? { ...a, isActive: false } : a)),
        );
        this.notificationService.success(`"${transactionBank.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el banco agente.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
