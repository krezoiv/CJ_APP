import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { PriceListType, Product } from '../../../core/models';
import { SaleDraftState, SalesDraftStore } from '../../../core/services/sales-draft.store';
import { ProductSearchComponent } from './components/product-search/product-search.component';
import { SaleItemsTableComponent } from './components/sale-items-table/sale-items-table.component';
import { SaleSummaryComponent } from './components/sale-summary/sale-summary.component';
import { SaleCancelConfirmModalComponent } from './components/cancel-confirm-modal/cancel-confirm-modal.component';
import { SalePricingBarComponent } from './components/sale-pricing-bar/sale-pricing-bar.component';

/**
 * All receipt state (for every open tab) lives in `SalesDraftStore`, a
 * root-provided singleton — this component is purely a thin view over
 * whichever draft is currently active. The tab bar (`draft.drafts()`) is
 * what lets a cashier build several unrelated receipts at once — see
 * `SalesDraftStore`'s own doc comment for why closing a tab with reserved
 * stock always goes through a real cancel call first, unlike Compras.
 */
@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [
    DatePipe,
    ProductSearchComponent,
    SaleItemsTableComponent,
    SaleSummaryComponent,
    SaleCancelConfirmModalComponent,
    SalePricingBarComponent,
  ],
  templateUrl: './sales-page.component.html',
  styleUrl: './sales-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesPageComponent {
  protected readonly draft = inject(SalesDraftStore);

  readonly today = signal(new Date());

  /** Non-`null` while the close/cancel confirmation is open, holding the id of the tab it targets. */
  readonly closeConfirmDraftId = signal<string | null>(null);

  onProductSelected(product: Product): void {
    this.draft.onProductSelected(product);
  }

  onConfigurePricing(event: { clientId: string | null; priceList: PriceListType }): void {
    this.draft.configurePricing(event.clientId, event.priceList);
  }

  onQuantityChange(change: { productId: string; quantity: number }): void {
    this.draft.onQuantityChange(change);
  }

  onRemoveItem(productId: string): void {
    this.draft.onRemoveItem(productId);
  }

  saveSale(): void {
    this.draft.confirmSale();
  }

  // ---- Tabs (multiple simultaneous ventas) ----

  draftLabel(draftItem: SaleDraftState): string {
    if (draftItem.sale?.clientName) {
      return draftItem.sale.clientName;
    }
    const index = this.draft.drafts().findIndex((d) => d.draftKey === draftItem.draftKey);
    return `Venta ${index + 1}`;
  }

  draftHasItems(draftItem: SaleDraftState): boolean {
    return (draftItem.sale?.items.length ?? 0) > 0;
  }

  switchDraft(draftKey: string): void {
    this.draft.setActiveDraft(draftKey);
  }

  openNewDraft(): void {
    this.draft.openNewDraft();
  }

  /**
   * A tab with no server-side row yet closes immediately (nothing to lose).
   * A tab whose receipt is empty but already has a server row closes via a
   * silent cancel (cleans up that empty `OPEN` row, nothing to confirm — the
   * user never sees a data-loss prompt for zero items). A tab with real
   * items requires confirmation before the cancel call, since it both
   * discards the line items and restores real reserved stock.
   */
  requestCloseTab(draftKey: string): void {
    const target = this.draft.drafts().find((d) => d.draftKey === draftKey);
    if (!target?.sale) {
      this.draft.closeDraftWithoutServerRow(draftKey);
      return;
    }
    if (target.sale.items.length === 0) {
      this.draft.cancelDraft(draftKey);
      return;
    }
    this.closeConfirmDraftId.set(draftKey);
  }

  /** "Cancelar" in the summary panel — always targets whichever tab is currently active. */
  requestCancel(): void {
    this.requestCloseTab(this.draft.activeDraftId());
  }

  confirmCloseTab(): void {
    const draftKey = this.closeConfirmDraftId();
    this.closeConfirmDraftId.set(null);
    if (draftKey) {
      this.draft.cancelDraft(draftKey);
    }
  }

  dismissCancel(): void {
    this.closeConfirmDraftId.set(null);
  }
}
