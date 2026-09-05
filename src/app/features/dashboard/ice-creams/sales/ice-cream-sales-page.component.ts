import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { IceCream } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
import { IceCreamSaleDraftStore } from '../../../../core/services/ice-cream-sale-draft.store';
import { IceCreamSalesService } from '../../../../core/services/ice-cream-sales.service';
import { extractErrorMessage } from '../../../../core/utils/extract-error-message';
import { IceCreamProductSearchComponent } from './components/ice-cream-product-search/ice-cream-product-search.component';
import { IceCreamSaleItemsTableComponent } from './components/ice-cream-sale-items-table/ice-cream-sale-items-table.component';
import { IceCreamSaleSummaryComponent } from './components/ice-cream-sale-summary/ice-cream-sale-summary.component';
import { CancelConfirmModalComponent } from './components/cancel-confirm-modal/cancel-confirm-modal.component';

/**
 * All receipt state lives in `IceCreamSaleDraftStore`, a root-provided
 * singleton persisted to `sessionStorage` — same client-only draft pattern
 * as `IceCreamPurchaseDraftStore`. Unlike Ventas' own `SalesPageComponent`
 * (which persists an "open sale" server-side, item by item), nothing is
 * sent to the backend here until "Guardar venta", which confirms the whole
 * receipt atomically and validates stock server-side under a row lock.
 */
@Component({
  selector: 'app-ice-cream-sales-page',
  standalone: true,
  imports: [
    IceCreamProductSearchComponent,
    IceCreamSaleItemsTableComponent,
    IceCreamSaleSummaryComponent,
    CancelConfirmModalComponent,
  ],
  templateUrl: './ice-cream-sales-page.component.html',
  styleUrl: './ice-cream-sales-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamSalesPageComponent {
  private readonly iceCreamSalesService = inject(IceCreamSalesService);
  private readonly notificationService = inject(NotificationService);
  protected readonly draft = inject(IceCreamSaleDraftStore);

  readonly isSaving = signal(false);
  readonly isCancelConfirmOpen = signal(false);

  onIceCreamSelected(iceCream: IceCream): void {
    this.draft.onIceCreamSelected(iceCream);
  }

  onQuantityChange(change: { iceCreamId: string; quantity: number }): void {
    this.draft.updateQuantity(change.iceCreamId, change.quantity);
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

  saveSale(): void {
    if (this.draft.items().length === 0 || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);
    this.iceCreamSalesService
      .createSale({
        items: this.draft.items().map((item) => ({ iceCreamId: item.iceCreamId, quantity: item.quantity })),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.draft.reset();
          this.notificationService.success('Venta de heladería registrada correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la venta.'));
        },
      });
  }
}
