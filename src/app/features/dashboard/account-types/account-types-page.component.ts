import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AccountType } from '../../../core/models';
import { AccountTypeService } from '../../../core/services/account-type.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { AccountTypeSummaryComponent } from './components/account-type-summary/account-type-summary.component';
import { AccountTypeToolbarComponent, AccountTypeStatusFilterValue } from './components/account-type-toolbar/account-type-toolbar.component';
import { AccountTypeTableComponent } from './components/account-type-table/account-type-table.component';
import { AccountTypeFormModalComponent } from './components/account-type-form-modal/account-type-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-account-types-page',
  standalone: true,
  imports: [
    AccountTypeSummaryComponent,
    AccountTypeToolbarComponent,
    AccountTypeTableComponent,
    AccountTypeFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './account-types-page.component.html',
  styleUrl: './account-types-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** A structural clone of `CategoriesPageComponent` — see that component's own doc comment. */
export class AccountTypesPageComponent {
  private readonly accountTypeService = inject(AccountTypeService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly accountTypes = signal<AccountType[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<AccountTypeStatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingAccountType = signal<AccountType | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingAccountType = signal<AccountType | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredAccountTypes = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.accountTypes().filter((accountType) => {
      const matchesTerm = !term || accountType.name.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? accountType.isActive : !accountType.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  constructor() {
    this.fetchAccountTypes();
  }

  private fetchAccountTypes(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive account types too (with a status badge/filter).
    this.accountTypeService.getAccountTypes(true).subscribe({
      next: (accountTypes) => {
        this.accountTypes.set(accountTypes);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los tipos de cuenta.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingAccountType.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(accountType: AccountType): void {
    this.editingAccountType.set(accountType);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onAccountTypeSaved(accountType: AccountType): void {
    const wasEditing = this.editingAccountType() !== null;
    this.isFormOpen.set(false);

    this.accountTypes.update((list) =>
      wasEditing ? list.map((a) => (a.id === accountType.id ? accountType : a)) : [accountType, ...list],
    );

    this.notificationService.success(
      wasEditing ? `"${accountType.name}" se actualizó correctamente.` : `"${accountType.name}" se agregó correctamente.`,
    );
  }

  requestDelete(accountType: AccountType): void {
    this.deletingAccountType.set(accountType);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingAccountType.set(null);
  }

  confirmDelete(): void {
    const accountType = this.deletingAccountType();
    if (!accountType) {
      return;
    }

    this.isDeleting.set(true);
    this.accountTypeService.deleteAccountType(accountType.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingAccountType.set(null);
        this.accountTypes.update((list) =>
          list.map((a) => (a.id === accountType.id ? { ...a, isActive: false } : a)),
        );
        this.notificationService.success(`"${accountType.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el tipo de cuenta.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
