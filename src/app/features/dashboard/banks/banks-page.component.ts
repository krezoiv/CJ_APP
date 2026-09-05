import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AccountType, Bank } from '../../../core/models';
import { AccountTypeService } from '../../../core/services/account-type.service';
import { AuthService } from '../../../core/services/auth.service';
import { BankService } from '../../../core/services/bank.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { BankSummaryComponent } from './components/bank-summary/bank-summary.component';
import { BankToolbarComponent, BankStatusFilterValue } from './components/bank-toolbar/bank-toolbar.component';
import { BankTableComponent } from './components/bank-table/bank-table.component';
import { BankFormModalComponent } from './components/bank-form-modal/bank-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-banks-page',
  standalone: true,
  imports: [BankSummaryComponent, BankToolbarComponent, BankTableComponent, BankFormModalComponent, DeleteConfirmModalComponent],
  templateUrl: './banks-page.component.html',
  styleUrl: './banks-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Structurally the same page-assembly + optimistic-local-update pattern as `UsersPageComponent` — see that class's own doc comment. */
export class BanksPageComponent {
  private readonly bankService = inject(BankService);
  private readonly accountTypeService = inject(AccountTypeService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly banks = signal<Bank[]>([]);
  readonly loading = signal(true);

  /** Real, active account types from the backend, for the bank form's dropdown — never hardcoded. */
  readonly accountTypeOptions = signal<AccountType[]>([]);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<BankStatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingBank = signal<Bank | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingBank = signal<Bank | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredBanks = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.banks().filter((bank) => {
      const matchesTerm =
        !term || bank.name.toLowerCase().includes(term) || bank.accountNumber.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? bank.isActive : !bank.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  constructor() {
    this.bankService.getBanks(true).subscribe({
      next: (banks) => {
        this.banks.set(banks);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los bancos.'));
      },
    });

    this.accountTypeService.getAccountTypes().subscribe({
      next: (accountTypes) => this.accountTypeOptions.set(accountTypes),
      error: () => this.notificationService.error('No se pudieron cargar los tipos de cuenta.'),
    });
  }

  openCreateForm(): void {
    this.editingBank.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(bank: Bank): void {
    this.editingBank.set(bank);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onBankSaved(bank: Bank): void {
    const wasEditing = this.editingBank() !== null;
    this.isFormOpen.set(false);

    this.banks.update((list) => (wasEditing ? list.map((b) => (b.id === bank.id ? bank : b)) : [bank, ...list]));

    this.notificationService.success(
      wasEditing ? `"${bank.name}" se actualizó correctamente.` : `"${bank.name}" se agregó correctamente.`,
    );
  }

  requestDelete(bank: Bank): void {
    this.deletingBank.set(bank);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingBank.set(null);
  }

  confirmDelete(): void {
    const bank = this.deletingBank();
    if (!bank) {
      return;
    }

    this.isDeleting.set(true);
    this.bankService.deleteBank(bank.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingBank.set(null);
        this.banks.update((list) => list.map((b) => (b.id === bank.id ? { ...b, isActive: false } : b)));
        this.notificationService.success(`"${bank.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el banco.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
