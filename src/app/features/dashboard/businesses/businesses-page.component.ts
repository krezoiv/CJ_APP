import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Business } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessService } from '../../../core/services/business.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { BusinessSummaryComponent } from './components/business-summary/business-summary.component';
import { BusinessToolbarComponent, StatusFilterValue } from './components/business-toolbar/business-toolbar.component';
import { BusinessTableComponent } from './components/business-table/business-table.component';
import { BusinessFormModalComponent } from './components/business-form-modal/business-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-businesses-page',
  standalone: true,
  imports: [
    BusinessSummaryComponent,
    BusinessToolbarComponent,
    BusinessTableComponent,
    BusinessFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './businesses-page.component.html',
  styleUrl: './businesses-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** A structural clone of `CategoriesPageComponent` — see that component's own doc comment for the shared admin-catalog-screen pattern. */
export class BusinessesPageComponent {
  private readonly businessService = inject(BusinessService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly businesses = signal<Business[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingBusiness = signal<Business | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingBusiness = signal<Business | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredBusinesses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.businesses().filter((business) => {
      const matchesTerm = !term || business.name.toLowerCase().includes(term);
      const matchesStatus =
        status === 'all' || (status === 'active' ? business.isActive : !business.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all');

  constructor() {
    this.fetchBusinesses();
  }

  private fetchBusinesses(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive businesses too (with a status badge/filter),
    // unlike the product form's dropdown which only ever wants active ones.
    this.businessService.getBusinesses(true).subscribe({
      next: (businesses) => {
        this.businesses.set(businesses);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los negocios.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingBusiness.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(business: Business): void {
    this.editingBusiness.set(business);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onBusinessSaved(business: Business): void {
    const wasEditing = this.editingBusiness() !== null;
    this.isFormOpen.set(false);

    this.businesses.update((list) =>
      wasEditing ? list.map((b) => (b.id === business.id ? business : b)) : [business, ...list]
    );

    this.notificationService.success(
      wasEditing ? `"${business.name}" se actualizó correctamente.` : `"${business.name}" se agregó correctamente.`
    );
  }

  requestDelete(business: Business): void {
    this.deletingBusiness.set(business);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingBusiness.set(null);
  }

  confirmDelete(): void {
    const business = this.deletingBusiness();
    if (!business) {
      return;
    }

    this.isDeleting.set(true);
    this.businessService.deleteBusiness(business.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingBusiness.set(null);
        this.businesses.update((list) =>
          list.map((b) => (b.id === business.id ? { ...b, isActive: false } : b))
        );
        this.notificationService.success(`"${business.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el negocio.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
