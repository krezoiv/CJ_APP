import { Injectable, computed, inject, signal } from '@angular/core';

import { IceCream, IceCreamSaleDraftItem, calculateIceCreamSaleTotal } from '../models';
import { AuthService } from './auth.service';

interface PersistedIceCreamSaleDraft {
  items: IceCreamSaleDraftItem[];
}

const STORAGE_PREFIX = 'cj_ice_cream_sale_draft:';

/**
 * The in-progress "Ventas de Heladería" receipt — same client-only draft
 * pattern as `IceCreamPurchaseDraftStore`/`PurchaseDraftStore` rather than
 * Ventas' server-persisted open-sale pattern: nothing is sent to the
 * backend until "Guardar venta", which confirms the whole receipt
 * atomically via `confirm_ice_cream_sale` (stock is validated there, under
 * a row lock — this store's `availableStock` is a display hint only).
 */
@Injectable({ providedIn: 'root' })
export class IceCreamSaleDraftStore {
  private readonly authService = inject(AuthService);

  readonly items = signal<IceCreamSaleDraftItem[]>([]);

  readonly total = computed(() => calculateIceCreamSaleTotal(this.items()));
  readonly hasActiveDraft = computed(() => this.items().length > 0);

  constructor() {
    this.restore();
  }

  onIceCreamSelected(iceCream: IceCream): void {
    this.items.update((items) => {
      const existing = items.find((item) => item.iceCreamId === iceCream.id);
      if (existing) {
        return items.map((item) =>
          item.iceCreamId === iceCream.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      const draftItem: IceCreamSaleDraftItem = {
        iceCreamId: iceCream.id,
        sku: iceCream.sku,
        product: iceCream.product,
        quantity: 1,
        unitPrice: iceCream.publicPrice,
        availableStock: iceCream.stock,
      };
      return [draftItem, ...items];
    });
    this.persist();
  }

  /** `quantity` arrives already clamped (≥1) by the items table — this just applies it. */
  updateQuantity(iceCreamId: string, quantity: number): void {
    this.items.update((items) =>
      items.map((item) => (item.iceCreamId === iceCreamId ? { ...item, quantity } : item)),
    );
    this.persist();
  }

  removeItem(iceCreamId: string): void {
    this.items.update((items) => items.filter((item) => item.iceCreamId !== iceCreamId));
    this.persist();
  }

  reset(): void {
    this.items.set([]);
    this.clearStorage();
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const payload: PersistedIceCreamSaleDraft = { items: this.items() };
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — the draft
      // still works for the rest of this tab session via the signals above.
    }
  }

  private restore(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedIceCreamSaleDraft;
      this.items.set(Array.isArray(parsed.items) ? parsed.items : []);
    } catch {
      sessionStorage.removeItem(key);
    }
  }

  private clearStorage(): void {
    const key = this.storageKey();
    if (key) {
      sessionStorage.removeItem(key);
    }
  }

  private storageKey(): string | null {
    const userId = this.authService.currentUser()?.id;
    return userId ? `${STORAGE_PREFIX}${userId}` : null;
  }
}
