import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';

import { PriceListType, Product, Sale } from '../models';
import { extractErrorMessage } from '../utils/extract-error-message';
import { NotificationService } from './notification.service';
import { PdfPromptModalService } from './pdf-prompt-modal.service';
import { SalesService } from './sales.service';

function newDraftId(): string {
  return crypto.randomUUID();
}

/** One open tab's worth of Ventas state — `sale` is `null` until the first product is added (no server row exists yet for this tab). */
export interface SaleDraftState {
  draftKey: string;
  sale: Sale | null;
  pendingProductIds: Set<string>;
  isConfiguringPricing: boolean;
  isSaving: boolean;
  isCancelling: boolean;
}

function makeBlankDraft(): SaleDraftState {
  return {
    draftKey: newDraftId(),
    sale: null,
    pendingProductIds: new Set(),
    isConfiguringPricing: false,
    isSaving: false,
    isCancelling: false,
  };
}

/**
 * The in-progress "Ventas" receipt(s), lifted out of `SalesPageComponent`
 * into a root-provided singleton — same reasoning `PurchaseDraftStore`
 * documents for Compras (sidebar indicator without a round-trip, no refetch
 * needed on revisiting the page).
 *
 * **Multiple simultaneous drafts (tabs)**, mirroring Compras: `drafts` holds
 * every open receipt, `activeDraftId` picks which one the page currently
 * shows/edits. Unlike Compras, a Ventas draft IS a real, server-persisted
 * `OPEN` sale with stock already reserved — the backend gained a
 * `draft_key` column specifically so one user can now own several such rows
 * at once (see the API's own `AddDraftKeyToSales` migration), each
 * identified by the client-generated key this store assigns per tab.
 * Closing a tab that already reserved stock is therefore never a purely
 * local operation the way it is in Compras — it always goes through
 * `SalesService.cancelSale(draftKey)` first, to actually release that
 * stock back, before the tab disappears locally.
 *
 * Deliberately does NOT mirror itself to `sessionStorage`, same as before
 * this became multi-draft: every open tab is already durably represented by
 * its own real `sales` row, so a reload just re-fetches the full set via
 * `getCurrentSales()`.
 */
@Injectable({ providedIn: 'root' })
export class SalesDraftStore {
  private readonly salesService = inject(SalesService);
  private readonly notificationService = inject(NotificationService);
  private readonly pdfPromptModalService = inject(PdfPromptModalService);

  readonly drafts = signal<SaleDraftState[]>([makeBlankDraft()]);
  readonly activeDraftId = signal<string>(this.drafts()[0].draftKey);
  readonly loaded = signal(false);

  readonly activeDraft = computed(
    () => this.drafts().find((d) => d.draftKey === this.activeDraftId()) ?? this.drafts()[0],
  );

  // Flat, active-draft-scoped views — same "template barely changes" reasoning `PurchaseDraftStore` uses.
  readonly items = computed(() => this.activeDraft().sale?.items ?? []);
  readonly total = computed(() => this.activeDraft().sale?.total ?? 0);
  readonly clientId = computed(() => this.activeDraft().sale?.clientId ?? null);
  readonly clientName = computed(() => this.activeDraft().sale?.clientName ?? null);
  readonly priceList = computed<PriceListType>(() => this.activeDraft().sale?.priceList ?? 'PUBLIC');
  readonly pendingProductIds = computed(() => this.activeDraft().pendingProductIds);
  readonly isConfiguringPricing = computed(() => this.activeDraft().isConfiguringPricing);
  readonly isSaving = computed(() => this.activeDraft().isSaving);
  readonly isCancelling = computed(() => this.activeDraft().isCancelling);

  /** At least one open tab has a reserved line — matches the "operación en proceso" rule used to gate the sidebar indicator and the unload warning, across every open tab, not just the active one. */
  readonly hasActiveDraft = computed(() => this.drafts().some((d) => (d.sale?.items.length ?? 0) > 0));

  constructor() {
    this.restore();
  }

  private restore(): void {
    this.salesService.getCurrentSales().subscribe((sales) => {
      if (sales.length > 0) {
        this.drafts.set(
          sales.map((sale) => ({
            draftKey: sale.draftKey ?? newDraftId(),
            sale,
            pendingProductIds: new Set<string>(),
            isConfiguringPricing: false,
            isSaving: false,
            isCancelling: false,
          })),
        );
        this.activeDraftId.set(this.drafts()[0].draftKey);
      }
      this.loaded.set(true);
    });
  }

  private updateDraft(draftKey: string, updater: (draft: SaleDraftState) => SaleDraftState): void {
    this.drafts.update((drafts) => drafts.map((d) => (d.draftKey === draftKey ? updater(d) : d)));
  }

  // ---- Tabs ----

  openNewDraft(): void {
    const draft = makeBlankDraft();
    this.drafts.update((drafts) => [...drafts, draft]);
    this.activeDraftId.set(draft.draftKey);
  }

  setActiveDraft(draftKey: string): void {
    if (this.drafts().some((d) => d.draftKey === draftKey)) {
      this.activeDraftId.set(draftKey);
    }
  }

  /**
   * Removes a tab locally only — never releases stock on its own; only
   * `closeDraftWithoutServerRow()`/`cancelDraft()`/`confirmSale()` (below)
   * are the sanctioned ways to actually remove a tab, since only they know
   * whether a network call was needed first. Never leaves zero tabs:
   * closing the last remaining one replaces it with a fresh blank draft
   * instead of ever emptying the array.
   */
  private removeDraftLocally(draftKey: string): void {
    const remaining = this.drafts().filter((d) => d.draftKey !== draftKey);
    const nextDrafts = remaining.length > 0 ? remaining : [makeBlankDraft()];
    this.drafts.set(nextDrafts);
    if (!nextDrafts.some((d) => d.draftKey === this.activeDraftId())) {
      this.activeDraftId.set(nextDrafts[0].draftKey);
    }
  }

  /**
   * A tab whose `sale` is still `null` never created a server-side row at
   * all (no product was ever added to it) — there is nothing to cancel, so
   * closing it is purely local. Any tab whose `sale` is non-`null`
   * (including one with zero current items, e.g. every line was added then
   * removed again) still has a real `OPEN` row server-side and must go
   * through `cancelDraft()` instead, never this method — see
   * `SalesPageComponent.requestCloseTab()` for the decision between the two.
   */
  closeDraftWithoutServerRow(draftKey: string): void {
    const draft = this.drafts().find((d) => d.draftKey === draftKey);
    if (draft && draft.sale === null) {
      this.removeDraftLocally(draftKey);
    }
  }

  onProductSelected(product: Product): void {
    this.adjustItem(this.activeDraftId(), product.id, 1, product.name);
  }

  onQuantityChange(change: { productId: string; quantity: number }): void {
    const draftKey = this.activeDraftId();
    const current = this.items().find((item) => item.productId === change.productId);
    if (!current) {
      return;
    }
    const delta = change.quantity - current.quantity;
    if (delta === 0) {
      return;
    }
    this.adjustItem(draftKey, change.productId, delta, current.productName);
  }

  onRemoveItem(productId: string): void {
    const draftKey = this.activeDraftId();
    const current = this.items().find((item) => item.productId === productId);
    if (!current) {
      return;
    }
    this.adjustItem(draftKey, productId, -current.quantity, current.productName);
  }

  private adjustItem(draftKey: string, productId: string, quantityDelta: number, productName: string): void {
    const draft = this.drafts().find((d) => d.draftKey === draftKey);
    if (!draft || draft.pendingProductIds.has(productId)) {
      return;
    }

    this.updateDraft(draftKey, (d) => ({
      ...d,
      pendingProductIds: new Set(d.pendingProductIds).add(productId),
    }));

    this.salesService.adjustSaleItem(productId, quantityDelta, draftKey).subscribe({
      next: (sale) => {
        this.updateDraft(draftKey, (d) => ({
          ...d,
          sale,
          pendingProductIds: this.withoutId(d.pendingProductIds, productId),
        }));
      },
      error: (error: HttpErrorResponse) => {
        this.updateDraft(draftKey, (d) => ({
          ...d,
          pendingProductIds: this.withoutId(d.pendingProductIds, productId),
        }));
        this.notificationService.error(
          extractErrorMessage(error, `No se pudo actualizar "${productName}" en el recibo.`),
        );
      },
    });
  }

  private withoutId(ids: Set<string>, id: string): Set<string> {
    const next = new Set(ids);
    next.delete(id);
    return next;
  }

  /**
   * Sets/updates the client and price list for whichever tab is active —
   * called once, before or while that tab's cart is empty. Rejected by the
   * backend (and surfaced as a toast) if that receipt already has line
   * items and the price list would change.
   */
  configurePricing(clientId: string | null, priceList: PriceListType): void {
    const draftKey = this.activeDraftId();
    if (this.isConfiguringPricing()) {
      return;
    }

    this.updateDraft(draftKey, (d) => ({ ...d, isConfiguringPricing: true }));
    this.salesService.configurePricing(clientId, priceList, draftKey).subscribe({
      next: (sale) => {
        this.updateDraft(draftKey, (d) => ({ ...d, sale, isConfiguringPricing: false }));
      },
      error: (error: HttpErrorResponse) => {
        this.updateDraft(draftKey, (d) => ({ ...d, isConfiguringPricing: false }));
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo actualizar el cliente o la lista de precios.'),
        );
      },
    });
  }

  /** "Guardar venta" for whichever tab is active — on success, that tab closes (or resets to blank if it was the only one); every other open tab is untouched. */
  confirmSale(): void {
    const draftKey = this.activeDraftId();
    const draft = this.drafts().find((d) => d.draftKey === draftKey);
    if (!draft || (draft.sale?.items.length ?? 0) === 0 || draft.isSaving) {
      return;
    }

    this.updateDraft(draftKey, (d) => ({ ...d, isSaving: true }));
    this.salesService.confirmSale(draftKey).subscribe({
      next: (sale) => {
        this.removeDraftLocally(draftKey);
        this.notificationService.success('Venta registrada correctamente.');
        this.pdfPromptModalService.prompt({
          title: 'Venta registrada',
          generate: () => this.salesService.exportSalePdf(sale.id),
          filename: `venta-${sale.id.slice(0, 8)}.pdf`,
        });
      },
      error: (error: HttpErrorResponse) => {
        this.updateDraft(draftKey, (d) => ({ ...d, isSaving: false }));
        this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la venta.'));
      },
    });
  }

  /** Discards the targeted tab's receipt — restores every reserved line's stock, then removes that tab locally. Every other open tab is untouched. */
  cancelDraft(draftKey: string): void {
    const draft = this.drafts().find((d) => d.draftKey === draftKey);
    if (!draft || draft.isCancelling) {
      return;
    }

    this.updateDraft(draftKey, (d) => ({ ...d, isCancelling: true }));
    this.salesService.cancelSale(draftKey).subscribe({
      next: () => {
        this.removeDraftLocally(draftKey);
        this.notificationService.warning('Recibo cancelado — el inventario reservado se restauró.');
      },
      error: (error: HttpErrorResponse) => {
        this.updateDraft(draftKey, (d) => ({ ...d, isCancelling: false }));
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cancelar el recibo.'));
      },
    });
  }

  /**
   * Client-side only — clears the in-memory signals so a different user
   * logging in on the same tab never sees a flash of this one's receipts.
   * Deliberately never calls `cancelSale()` for any draft: every actual
   * `OPEN` sale stays reserved on the server for its owner and is restored
   * exactly as it was the next time they log back in and this store
   * re-runs `getCurrentSales()`.
   */
  resetOnLogout(): void {
    this.drafts.set([makeBlankDraft()]);
    this.activeDraftId.set(this.drafts()[0].draftKey);
    this.loaded.set(false);
  }
}
