import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { IceCream, getIceCreamStockStatus } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { IceCreamService } from '../../../../core/services/ice-cream.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { IceCreamSummaryComponent } from './components/ice-cream-summary/ice-cream-summary.component';
import { IceCreamToolbarComponent, IceCreamStockFilterValue } from './components/ice-cream-toolbar/ice-cream-toolbar.component';
import { IceCreamTableComponent } from './components/ice-cream-table/ice-cream-table.component';
import { IceCreamFormModalComponent } from './components/ice-cream-form-modal/ice-cream-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-ice-cream-inventory-page',
  standalone: true,
  imports: [
    IceCreamSummaryComponent,
    IceCreamToolbarComponent,
    IceCreamTableComponent,
    IceCreamFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './ice-cream-inventory-page.component.html',
  styleUrl: './ice-cream-inventory-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Same page-assembly pattern as `UsersPageComponent`/`BanksPageComponent` —
 * see that class's own doc comment. One real delta from those: there is no
 * "mostrar inactivos" toggle here (`IceCreamService.getIceCreams()` never
 * passes `includeInactive`, and `IceCreamToolbarComponent`'s filter is by
 * stock status, not active/inactive) — `confirmDelete` removes the
 * deactivated row from the local list entirely rather than keeping it
 * visible with an inactive badge, so a deactivated helado has no path back
 * to visible/reactivatable from this screen.
 */
export class IceCreamInventoryPageComponent {
  private readonly iceCreamService = inject(IceCreamService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/deactivate for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly iceCreams = signal<IceCream[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly stockFilter = signal<IceCreamStockFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingIceCream = signal<IceCream | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingIceCream = signal<IceCream | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredIceCreams = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const stockFilter = this.stockFilter();

    return this.iceCreams().filter((iceCream) => {
      const matchesTerm =
        !term || iceCream.product.toLowerCase().includes(term) || iceCream.sku.toLowerCase().includes(term);
      const matchesStock = stockFilter === 'all' || getIceCreamStockStatus(iceCream.stock) === stockFilter;
      return matchesTerm && matchesStock;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.stockFilter() !== 'all',
  );

  constructor() {
    this.iceCreamService.getIceCreams().subscribe({
      next: (iceCreams) => {
        this.iceCreams.set(iceCreams);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el inventario de heladería.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingIceCream.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(iceCream: IceCream): void {
    this.editingIceCream.set(iceCream);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onIceCreamSaved(iceCream: IceCream): void {
    const wasEditing = this.editingIceCream() !== null;
    this.isFormOpen.set(false);

    this.iceCreams.update((list) =>
      wasEditing ? list.map((i) => (i.id === iceCream.id ? iceCream : i)) : [iceCream, ...list],
    );

    this.notificationService.success(
      wasEditing ? `"${iceCream.product}" se actualizó correctamente.` : `"${iceCream.product}" se agregó al inventario.`,
    );
  }

  requestDelete(iceCream: IceCream): void {
    this.deletingIceCream.set(iceCream);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingIceCream.set(null);
  }

  confirmDelete(): void {
    const iceCream = this.deletingIceCream();
    if (!iceCream) {
      return;
    }

    this.isDeleting.set(true);
    this.iceCreamService.deleteIceCream(iceCream.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingIceCream.set(null);
        this.iceCreams.update((list) => list.filter((i) => i.id !== iceCream.id));
        this.notificationService.success(`"${iceCream.product}" se desactivó del inventario.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el helado.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.stockFilter.set('all');
  }
}
