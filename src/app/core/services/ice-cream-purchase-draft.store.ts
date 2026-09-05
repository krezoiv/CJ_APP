import { Injectable, computed, inject, signal } from '@angular/core';

import { IceCream, IceCreamPurchaseDraftItem, calculateIceCreamPurchaseTotal } from '../models';
import { AuthService } from './auth.service';

function todayIsoDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

interface PersistedIceCreamPurchaseDraft {
  supplierId: string;
  purchaseDate: string;
  items: IceCreamPurchaseDraftItem[];
}

const STORAGE_PREFIX = 'cj_ice_cream_purchase_draft:';

/**
 * The in-progress "Compras de Heladería" invoice — same root-provided,
 * sessionStorage-backed singleton pattern as `PurchaseDraftStore` (see that
 * file's own doc comment for the full reasoning). Nothing is sent to the
 * backend until "Guardar compra", which confirms the whole invoice
 * atomically via `confirm_ice_cream_purchase`.
 */
@Injectable({ providedIn: 'root' })
export class IceCreamPurchaseDraftStore {
  private readonly authService = inject(AuthService);

  readonly supplierId = signal('');
  readonly purchaseDate = signal(todayIsoDate());
  readonly items = signal<IceCreamPurchaseDraftItem[]>([]);

  readonly total = computed(() => calculateIceCreamPurchaseTotal(this.items()));
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

      const draftItem: IceCreamPurchaseDraftItem = {
        iceCreamId: iceCream.id,
        sku: iceCream.sku,
        product: iceCream.product,
        quantity: 1,
        costPrice: iceCream.costPrice,
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

  updateCostPrice(iceCreamId: string, costPrice: number): void {
    this.items.update((items) =>
      items.map((item) => (item.iceCreamId === iceCreamId ? { ...item, costPrice } : item)),
    );
    this.persist();
  }

  removeItem(iceCreamId: string): void {
    this.items.update((items) => items.filter((item) => item.iceCreamId !== iceCreamId));
    this.persist();
  }

  setSupplier(supplierId: string): void {
    this.supplierId.set(supplierId);
    this.persist();
  }

  setPurchaseDate(date: string): void {
    this.purchaseDate.set(date);
    this.persist();
  }

  reset(): void {
    this.items.set([]);
    this.supplierId.set('');
    this.purchaseDate.set(todayIsoDate());
    this.clearStorage();
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const payload: PersistedIceCreamPurchaseDraft = {
      supplierId: this.supplierId(),
      purchaseDate: this.purchaseDate(),
      items: this.items(),
    };
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
      const parsed = JSON.parse(raw) as PersistedIceCreamPurchaseDraft;
      this.supplierId.set(parsed.supplierId ?? '');
      this.purchaseDate.set(parsed.purchaseDate ?? todayIsoDate());
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
