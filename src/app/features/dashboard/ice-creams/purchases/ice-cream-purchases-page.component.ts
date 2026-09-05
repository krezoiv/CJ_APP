import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IceCream, Supplier } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
import { IceCreamPurchaseDraftStore } from '../../../../core/services/ice-cream-purchase-draft.store';
import { IceCreamPurchasesService } from '../../../../core/services/ice-cream-purchases.service';
import { SupplierService } from '../../../../core/services/supplier.service';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { IceCreamProductSearchComponent } from './components/ice-cream-product-search/ice-cream-product-search.component';
import { IceCreamPurchaseItemsTableComponent } from './components/ice-cream-purchase-items-table/ice-cream-purchase-items-table.component';
import { IceCreamPurchaseSummaryComponent } from './components/ice-cream-purchase-summary/ice-cream-purchase-summary.component';
import { CancelConfirmModalComponent } from './components/cancel-confirm-modal/cancel-confirm-modal.component';
import { SaveConfirmModalComponent } from './components/save-confirm-modal/save-confirm-modal.component';

/**
 * All invoice state (supplier/date/items/total) lives in
 * `IceCreamPurchaseDraftStore`, a root-provided singleton persisted to
 * `sessionStorage` — same pattern as `PurchasesPageComponent`, see that
 * file's own doc comment.
 */
@Component({
  selector: 'app-ice-cream-purchases-page',
  standalone: true,
  imports: [
    FormsModule,
    IceCreamProductSearchComponent,
    IceCreamPurchaseItemsTableComponent,
    IceCreamPurchaseSummaryComponent,
    CancelConfirmModalComponent,
    SaveConfirmModalComponent,
  ],
  templateUrl: './ice-cream-purchases-page.component.html',
  styleUrl: './ice-cream-purchases-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamPurchasesPageComponent {
  private readonly iceCreamPurchasesService = inject(IceCreamPurchasesService);
  private readonly supplierService = inject(SupplierService);
  private readonly notificationService = inject(NotificationService);
  protected readonly draft = inject(IceCreamPurchaseDraftStore);

  /** Real, active suppliers from the backend — never hardcoded. */
  readonly suppliers = signal<Supplier[]>([]);
  readonly isSaving = signal(false);

  readonly isCancelConfirmOpen = signal(false);
  readonly isSaveConfirmOpen = signal(false);

  readonly selectedSupplierName = computed(() => {
    const supplier = this.suppliers().find((s) => s.id === this.draft.supplierId());
    return supplier?.name ?? '';
  });

  readonly purchaseDateAsDate = computed(() => new Date(`${this.draft.purchaseDate()}T00:00:00`));

  constructor() {
    this.supplierService.getSuppliers().subscribe({
      next: (suppliers) => this.suppliers.set(suppliers),
      error: () => this.notificationService.error('No se pudieron cargar los proveedores.'),
    });
  }

  onSupplierChange(supplierId: string): void {
    this.draft.setSupplier(supplierId);
  }

  onDateChange(date: string): void {
    this.draft.setPurchaseDate(date);
  }

  onIceCreamSelected(iceCream: IceCream): void {
    this.draft.onIceCreamSelected(iceCream);
  }

  onQuantityChange(change: { iceCreamId: string; quantity: number }): void {
    this.draft.updateQuantity(change.iceCreamId, change.quantity);
  }

  onCostPriceChange(change: { iceCreamId: string; costPrice: number }): void {
    this.draft.updateCostPrice(change.iceCreamId, change.costPrice);
  }

  onRemoveItem(iceCreamId: string): void {
    this.draft.removeItem(iceCreamId);
  }

  requestCancel(): void {
    if (this.draft.items().length === 0) {
      return;
    }
    this.isCancelConfirmOpen.set(true);
  }

  confirmCancel(): void {
    this.isCancelConfirmOpen.set(false);
    this.draft.reset();
  }

  dismissCancel(): void {
    this.isCancelConfirmOpen.set(false);
  }

  requestSave(): void {
    if (!this.draft.supplierId() || this.draft.items().length === 0 || this.isSaving()) {
      return;
    }
    this.isSaveConfirmOpen.set(true);
  }

  dismissSaveConfirm(): void {
    if (this.isSaving()) {
      return;
    }
    this.isSaveConfirmOpen.set(false);
  }

  confirmSave(): void {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.iceCreamPurchasesService
      .createPurchase({
        supplierId: this.draft.supplierId(),
        purchaseDate: new Date(`${this.draft.purchaseDate()}T00:00:00`).toISOString(),
        items: this.draft.items().map((item) => ({
          iceCreamId: item.iceCreamId,
          quantity: item.quantity,
          costPrice: item.costPrice,
        })),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.isSaveConfirmOpen.set(false);
          this.draft.reset();
          this.notificationService.success('Compra de heladería registrada correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.isSaveConfirmOpen.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la compra.'));
        },
      });
  }
}
