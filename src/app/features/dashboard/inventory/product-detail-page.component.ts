import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  MOVEMENT_TYPE_LABEL,
  ProductInventoryDetail,
  ProductPresentation,
  formatCurrency,
  formatQuantity,
} from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryLocationsService } from '../../../core/services/inventory-locations.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, BadgeComponent, CardComponent, IconComponent, EmptyStateComponent } from '../../../shared/ui';
import { PresentationFormModalComponent } from './components/presentation-form-modal/presentation-form-modal.component';

/**
 * Product detail view — General / Presentaciones / Inventario / Movimientos
 * recientes, exactly the four sections the "Inventario por ubicación" ticket
 * asked for. Reached from `ProductTableComponent`'s new "Ver detalle" action
 * (`/dashboard/inventario/:id`). Read-only for everyone except the
 * "Administración de presentaciones" actions, gated the same way every
 * other admin-only mutation in this app already is (`AuthService.isAdmin`,
 * UI-only — the backend's own `@Roles(...)` is the real enforcement).
 */
@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    DatePipe,
    ButtonComponent,
    BadgeComponent,
    CardComponent,
    IconComponent,
    EmptyStateComponent,
    PresentationFormModalComponent,
  ],
  templateUrl: './product-detail-page.component.html',
  styleUrl: './product-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inventoryLocationsService = inject(InventoryLocationsService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.isAdmin;
  readonly movementTypeLabel = MOVEMENT_TYPE_LABEL;
  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  readonly productId = this.route.snapshot.paramMap.get('id')!;
  readonly detail = signal<ProductInventoryDetail | null>(null);
  readonly loading = signal(true);

  readonly isPresentationFormOpen = signal(false);
  readonly editingPresentation = signal<ProductPresentation | null>(null);

  /** Keyed by `locationId` — mirrors `RechargeTableComponent`'s own `draftFinalBalance` pattern: a plain record, not a reactive form, seeded once per row so an in-progress edit is never clobbered by an unrelated refetch. */
  readonly draftMinStock = signal<Record<string, string>>({});
  readonly savingMinStockLocationId = signal<string | null>(null);

  constructor() {
    this.fetchDetail();
  }

  private fetchDetail(): void {
    this.loading.set(true);
    this.inventoryLocationsService.getProductInventory(this.productId).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        this.loading.set(false);
        // Only seed rows not already tracked — same "never clobber an
        // in-progress edit" rule `RechargeTableComponent.ngOnChanges` uses.
        this.draftMinStock.update((draft) => {
          const next = { ...draft };
          for (const row of detail.stockByLocation) {
            if (!(row.locationId in next)) {
              next[row.locationId] = String(row.minStock);
            }
          }
          return next;
        });
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar el detalle del producto.'));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/dashboard/inventario']);
  }

  openCreatePresentation(): void {
    this.editingPresentation.set(null);
    this.isPresentationFormOpen.set(true);
  }

  openEditPresentation(presentation: ProductPresentation): void {
    this.editingPresentation.set(presentation);
    this.isPresentationFormOpen.set(true);
  }

  closePresentationForm(): void {
    this.isPresentationFormOpen.set(false);
  }

  onPresentationSaved(): void {
    this.isPresentationFormOpen.set(false);
    this.notificationService.success('Presentación guardada correctamente.');
    this.fetchDetail();
  }

  onMinStockInput(locationId: string, value: string): void {
    this.draftMinStock.update((draft) => ({ ...draft, [locationId]: value }));
  }

  /** Mirrors `RechargeTableComponent.canSave()`'s proactive UX echo of the backend's own validation — an integer `>= 0`. */
  canSaveMinStock(locationId: string): boolean {
    const raw = this.draftMinStock()[locationId];
    if (raw === undefined) {
      return false;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed >= 0;
  }

  saveMinStock(locationId: string): void {
    if (!this.canSaveMinStock(locationId) || this.savingMinStockLocationId()) {
      return;
    }
    const minStock = Number(this.draftMinStock()[locationId]);
    this.savingMinStockLocationId.set(locationId);
    this.inventoryLocationsService.setMinStock(this.productId, locationId, minStock).subscribe({
      next: () => {
        this.savingMinStockLocationId.set(null);
        this.notificationService.success('Stock mínimo actualizado correctamente.');
        this.fetchDetail();
      },
      error: (error: HttpErrorResponse) => {
        this.savingMinStockLocationId.set(null);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo actualizar el stock mínimo.'));
      },
    });
  }

  async toggleActive(presentation: ProductPresentation): Promise<void> {
    const activating = !presentation.isActive;
    const confirmed = await this.confirmDialogService.confirm({
      type: activating ? 'UPDATE' : 'DELETE',
      title: activating ? 'Reactivar presentación' : 'Desactivar presentación',
      message: activating
        ? `¿Está seguro de reactivar la presentación "${presentation.name}"?`
        : `¿Está seguro de desactivar la presentación "${presentation.name}"? No se eliminará, solo dejará de estar disponible para nuevas compras/ventas/traslados.`,
    });
    if (!confirmed) {
      return;
    }

    this.inventoryLocationsService.updatePresentation(presentation.id, { isActive: activating }).subscribe({
      next: () => {
        this.notificationService.success(
          activating ? 'Presentación reactivada correctamente.' : 'Presentación desactivada correctamente.'
        );
        this.fetchDetail();
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo actualizar la presentación.'));
      },
    });
  }
}
