import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';

import { AccountReceivable, ActiveBalanceSummary, Client } from '../../../core/models';
import { AccountReceivableService } from '../../../core/services/account-receivable.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { formatCurrency } from '../../../core/utils/number-format.util';
import { AccountStatementModalComponent, CardComponent, IconComponent, KardexStatementClient } from '../../../shared/ui';
import { ReportPaginationComponent } from '../reports/components/report-pagination/report-pagination.component';
import { AccountReceivableToolbarComponent, AccountReceivableStatusFilterValue } from './components/account-receivable-toolbar/account-receivable-toolbar.component';
import { AccountReceivableTableComponent } from './components/account-receivable-table/account-receivable-table.component';
import { AccountReceivableFormModalComponent } from './components/account-receivable-form-modal/account-receivable-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

const LIMIT = 20;

@Component({
  selector: 'app-accounts-receivable-page',
  standalone: true,
  imports: [
    AccountReceivableToolbarComponent,
    AccountReceivableTableComponent,
    AccountReceivableFormModalComponent,
    DeleteConfirmModalComponent,
    ReportPaginationComponent,
    AccountStatementModalComponent,
    CardComponent,
    IconComponent,
  ],
  templateUrl: './accounts-receivable-page.component.html',
  styleUrl: './accounts-receivable-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** Identical clone of `AssetsPageComponent` — see that class's own doc comment for the server-side-pagination/always-refetch pattern (a deliberate departure from `UsersPageComponent`/`BanksPageComponent`'s client-side-filtering pattern). */
export class AccountsReceivablePageComponent {
  /** Not private — bound directly as `[service]` on `<app-account-statement-modal>` in the template. */
  readonly accountReceivableService = inject(AccountReceivableService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for other roles. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly records = signal<AccountReceivable[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly limit = LIMIT;

  readonly searchTerm = signal('');
  readonly statusFilter = signal<AccountReceivableStatusFilterValue>('all');
  readonly clientFilter = signal<Client | null>(null);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly page = signal(1);

  readonly isFormOpen = signal(false);
  readonly editingRecord = signal<AccountReceivable | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingRecord = signal<AccountReceivable | null>(null);
  readonly isDeleting = signal(false);

  readonly isStatementOpen = signal(false);
  readonly statementClient = signal<KardexStatementClient | null>(null);

  /** Saldo total de cuentas activas — always unfiltered (independent of search/date/estado above), refetched whenever the underlying data actually changes (not on a plain filter/page change). */
  readonly activeBalance = signal<ActiveBalanceSummary | null>(null);
  formatCurrency = formatCurrency;

  readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim().length > 0 ||
      this.statusFilter() !== 'all' ||
      this.clientFilter() !== null ||
      this.dateFrom() !== '' ||
      this.dateTo() !== '',
  );

  private readonly searchTerm$ = new Subject<void>();

  constructor() {
    this.searchTerm$.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.page.set(1);
      this.fetchRecords();
    });
    this.fetchRecords();
    this.fetchActiveBalance();
  }

  /** Always active-only, unfiltered — refetched whenever the underlying data actually changes (create/edit/deactivate/Kardex movement), never on a plain search/date/page change. */
  fetchActiveBalance(): void {
    this.accountReceivableService.getActiveBalance().subscribe({
      next: (summary) => this.activeBalance.set(summary),
      error: () => {
        // Silent — this tile is a nice-to-have; the list itself already reports its own load errors.
      },
    });
  }

  /** Not private — also called from the template as `(changed)="fetchRecords()"` after a Kardex movement is registered. */
  fetchRecords(): void {
    this.loading.set(true);
    const status = this.statusFilter();
    this.accountReceivableService
      .getAccountsReceivable({
        search: this.searchTerm().trim() || undefined,
        clientId: this.clientFilter()?.id,
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        isActive: status === 'all' ? undefined : status === 'active',
        page: this.page(),
        limit: this.limit,
      })
      .subscribe({
        next: (result) => {
          this.records.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar las cuentas por cobrar.'));
        },
      });
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
    this.searchTerm$.next();
  }

  onStatusFilterChange(value: AccountReceivableStatusFilterValue): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.fetchRecords();
  }

  onClientFilterChange(client: Client | null): void {
    this.clientFilter.set(client);
    this.page.set(1);
    this.fetchRecords();
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
    this.page.set(1);
    this.fetchRecords();
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
    this.page.set(1);
    this.fetchRecords();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.fetchRecords();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.clientFilter.set(null);
    this.dateFrom.set('');
    this.dateTo.set('');
    this.page.set(1);
    this.fetchRecords();
  }

  openCreateForm(): void {
    this.editingRecord.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(record: AccountReceivable): void {
    this.editingRecord.set(record);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onRecordSaved(record: AccountReceivable): void {
    const wasEditing = this.editingRecord() !== null;
    this.isFormOpen.set(false);
    this.notificationService.success(
      wasEditing ? 'La cuenta por cobrar se actualizó correctamente.' : 'La cuenta por cobrar se registró correctamente.',
    );
    this.fetchRecords();
    this.fetchActiveBalance();
  }

  openStatement(record: AccountReceivable): void {
    this.statementClient.set({ id: record.clientId, name: record.clientName });
    this.isStatementOpen.set(true);
  }

  closeStatement(): void {
    this.isStatementOpen.set(false);
  }

  requestDelete(record: AccountReceivable): void {
    this.deletingRecord.set(record);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingRecord.set(null);
  }

  confirmDelete(): void {
    const record = this.deletingRecord();
    if (!record) {
      return;
    }

    this.isDeleting.set(true);
    this.accountReceivableService.deleteAccountReceivable(record.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingRecord.set(null);
        this.notificationService.success('La cuenta por cobrar se desactivó correctamente.');
        this.fetchRecords();
        this.fetchActiveBalance();
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar la cuenta por cobrar.'));
      },
    });
  }
}
