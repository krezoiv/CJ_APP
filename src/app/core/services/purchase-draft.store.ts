import { Injectable, computed, inject, signal } from '@angular/core';

import {
  Product,
  ProductPresentation,
  PurchaseDraftItem,
  PurchasePaymentType,
  calculatePurchaseTotal,
} from '../models';
import { AuthService } from './auth.service';

function todayIsoDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function newDraftId(): string {
  return crypto.randomUUID();
}

/** One in-progress "Compra" — everything `PurchasesPageComponent`'s form/table/summary needs, independent of any other open tab. */
export interface PurchaseDraft {
  id: string;
  supplierId: string;
  purchaseDate: string;
  items: PurchaseDraftItem[];
  paymentType: PurchasePaymentType;
  /** `yyyy-MM-dd` — only meaningful (and required) while `paymentType` is `'CREDITO'`. */
  paymentDueDate: string;
}

function makeBlankDraft(): PurchaseDraft {
  return {
    id: newDraftId(),
    supplierId: '',
    purchaseDate: todayIsoDate(),
    items: [],
    paymentType: 'CONTADO',
    paymentDueDate: '',
  };
}

interface PersistedPurchaseDrafts {
  drafts: PurchaseDraft[];
  activeDraftId: string;
}

const STORAGE_PREFIX = 'cj_purchase_draft:';

/**
 * The in-progress "Compras" invoice(s), lifted out of `PurchasesPageComponent`
 * into a root-provided singleton so it survives route navigation — Angular
 * never destroys a `providedIn: 'root'` service just because its consuming
 * component unmounts, only a full page reload does that. Unlike Ventas,
 * Compras has no server-side draft to refetch (see `PurchaseDraftItem`'s own
 * doc comment — nothing is sent to the backend until "Guardar compra"), so
 * this store is the *only* place any in-progress invoice lives.
 *
 * **Multiple simultaneous drafts (tabs)**: `drafts` holds every open Compra,
 * `activeDraftId` picks which one the page currently shows/edits — this is
 * what lets a cashier register several unrelated invoices side by side
 * (e.g. one per supplier) without losing progress on the others. There is
 * always at least one draft; `closeDraft()` on the last remaining one
 * replaces it with a fresh blank draft rather than ever leaving the array
 * empty, so the Compras screen always has something to render. This is
 * deliberately Compras-only — Ventas keeps a single draft because its
 * "borrador" is a real, server-persisted `OPEN` sale, and the backend only
 * allows one such row per user at a time (`UQ_sales_open_per_user`); nothing
 * here changes that.
 *
 * Every mutation is mirrored to `sessionStorage`, scoped by the current
 * user's id, so a reload doesn't lose any open tab either. `sessionStorage`
 * (not `localStorage`) is deliberate: it clears itself when the tab closes,
 * so an abandoned draft carrying real cost/price data doesn't linger
 * indefinitely on a shared machine.
 */
@Injectable({ providedIn: 'root' })
export class PurchaseDraftStore {
  private readonly authService = inject(AuthService);

  readonly drafts = signal<PurchaseDraft[]>([makeBlankDraft()]);
  readonly activeDraftId = signal<string>(this.drafts()[0].id);

  readonly activeDraft = computed(
    () => this.drafts().find((d) => d.id === this.activeDraftId()) ?? this.drafts()[0],
  );

  // Flat, active-draft-scoped views — kept so the existing template/component
  // surface (built around one draft) barely had to change when this became
  // multi-draft; every mutation below acts on whichever draft is active.
  readonly supplierId = computed(() => this.activeDraft().supplierId);
  readonly purchaseDate = computed(() => this.activeDraft().purchaseDate);
  readonly items = computed(() => this.activeDraft().items);
  readonly paymentType = computed(() => this.activeDraft().paymentType);
  readonly paymentDueDate = computed(() => this.activeDraft().paymentDueDate);
  readonly total = computed(() => calculatePurchaseTotal(this.activeDraft().items));

  /** At least one open tab has a product added — matches the "operación en proceso" rule used to gate the sidebar indicator and the unload warning, across every open tab, not just the active one. */
  readonly hasActiveDraft = computed(() => this.drafts().some((d) => d.items.length > 0));

  constructor() {
    this.restore();
  }

  /** Total for a specific tab — used by the tab bar to label/badge a non-active draft without switching to it first. */
  draftTotal(draft: PurchaseDraft): number {
    return calculatePurchaseTotal(draft.items);
  }

  openNewDraft(): void {
    const draft = makeBlankDraft();
    this.drafts.update((drafts) => [...drafts, draft]);
    this.activeDraftId.set(draft.id);
    this.persist();
  }

  setActiveDraft(id: string): void {
    if (this.drafts().some((d) => d.id === id)) {
      this.activeDraftId.set(id);
    }
  }

  /**
   * Closes one tab — used both for an explicit "×" on a tab and (via
   * `PurchasesPageComponent`) after a confirmed save or cancel of whichever
   * draft was active. Never leaves zero tabs: closing the last remaining
   * draft replaces it with a fresh blank one instead of emptying the array.
   */
  closeDraft(id: string): void {
    const remaining = this.drafts().filter((d) => d.id !== id);
    const nextDrafts = remaining.length > 0 ? remaining : [makeBlankDraft()];
    this.drafts.set(nextDrafts);
    if (!nextDrafts.some((d) => d.id === this.activeDraftId())) {
      this.activeDraftId.set(nextDrafts[0].id);
    }
    this.persist();
  }

  private updateActiveDraft(updater: (draft: PurchaseDraft) => PurchaseDraft): void {
    const activeId = this.activeDraftId();
    this.drafts.update((drafts) => drafts.map((d) => (d.id === activeId ? updater(d) : d)));
    this.persist();
  }

  onProductSelected(product: Product): void {
    this.updateActiveDraft((draft) => {
      const existing = draft.items.find((item) => item.productId === product.id);
      if (existing) {
        return {
          ...draft,
          items: draft.items.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        };
      }

      const draftItem: PurchaseDraftItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        costPrice: product.costPrice,
        publicPrice: product.publicPrice,
      };
      return { ...draft, items: [draftItem, ...draft.items] };
    });
  }

  /** `quantity` arrives already clamped (≥1) by `PurchaseItemsTableComponent` — this just applies it. */
  updateQuantity(productId: string, quantity: number): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => (item.productId === productId ? { ...item, quantity } : item)),
    }));
  }

  updateCostPrice(productId: string, costPrice: number): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => (item.productId === productId ? { ...item, costPrice } : item)),
    }));
  }

  updatePublicPrice(productId: string, publicPrice: number): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) => (item.productId === productId ? { ...item, publicPrice } : item)),
    }));
  }

  /**
   * `null` = back to the implicit base "Unidad". Also resets `costPrice`/
   * `publicPrice` to the chosen presentation's own prices (or the product's
   * base prices for "Unidad") — presentations price independently (e.g.
   * Q12/caja, not `precio_unidad × 12`), so switching presentation without
   * updating price would silently keep whatever the previous presentation's
   * price happened to be.
   */
  updatePresentation(productId: string, presentation: ProductPresentation | null): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      items: draft.items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              presentationId: presentation?.id,
              presentationName: presentation?.name,
              costPrice: presentation?.costPrice ?? item.costPrice,
              publicPrice: presentation?.publicPrice ?? item.publicPrice,
            }
          : item,
      ),
    }));
  }

  removeItem(productId: string): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      items: draft.items.filter((item) => item.productId !== productId),
    }));
  }

  setSupplier(supplierId: string): void {
    this.updateActiveDraft((draft) => ({ ...draft, supplierId }));
  }

  setPurchaseDate(date: string): void {
    this.updateActiveDraft((draft) => ({ ...draft, purchaseDate: date }));
  }

  setPaymentType(paymentType: PurchasePaymentType): void {
    this.updateActiveDraft((draft) => ({
      ...draft,
      paymentType,
      paymentDueDate: paymentType === 'CONTADO' ? '' : draft.paymentDueDate,
    }));
  }

  setPaymentDueDate(date: string): void {
    this.updateActiveDraft((draft) => ({ ...draft, paymentDueDate: date }));
  }

  /**
   * Clears whichever draft is active — called after a confirmed save or a
   * confirmed cancel. Delegates to `closeDraft()`: if other tabs are still
   * open, the active one simply disappears and another tab becomes active;
   * if it was the only tab, it's replaced by a fresh blank draft so the
   * page never ends up with nothing to show.
   */
  resetActiveDraft(): void {
    this.closeDraft(this.activeDraftId());
  }

  /**
   * Full wipe — every open tab, not just the active one. Only sanctioned use
   * is logout: an in-progress Compra shouldn't survive a different account
   * logging in on the same browser tab. Wipes both the in-memory signals and
   * the persisted `sessionStorage` entry.
   */
  reset(): void {
    const blank = makeBlankDraft();
    this.drafts.set([blank]);
    this.activeDraftId.set(blank.id);
    this.clearStorage();
  }

  private persist(): void {
    const key = this.storageKey();
    if (!key) {
      return;
    }
    const payload: PersistedPurchaseDrafts = {
      drafts: this.drafts(),
      activeDraftId: this.activeDraftId(),
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(payload));
    } catch {
      // Storage unavailable (private browsing, quota exceeded) — the drafts
      // still work for the rest of this tab session via the signals above,
      // they just won't survive a reload. Not worth surfacing to the user.
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
      const parsed = JSON.parse(raw) as Partial<PersistedPurchaseDrafts>;
      const drafts = Array.isArray(parsed.drafts) && parsed.drafts.length > 0 ? parsed.drafts : [makeBlankDraft()];
      this.drafts.set(drafts);
      const activeId =
        typeof parsed.activeDraftId === 'string' && drafts.some((d) => d.id === parsed.activeDraftId)
          ? parsed.activeDraftId
          : drafts[0].id;
      this.activeDraftId.set(activeId);
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

  /** `null` when nobody is logged in yet — nothing to scope a key to, so persistence is silently skipped rather than falling back to a shared/anonymous key. */
  private storageKey(): string | null {
    const userId = this.authService.currentUser()?.id;
    return userId ? `${STORAGE_PREFIX}${userId}` : null;
  }
}
