import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';

import { ProductPresentation, PurchaseDraftItem, calculatePurchaseItemTotal, formatCurrency } from '../../../../../core/models';
import { InventoryLocationsService } from '../../../../../core/services/inventory-locations.service';
import { EmptyStateComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';
import { PresentationFormModalComponent } from '../../../inventory/components/presentation-form-modal/presentation-form-modal.component';

@Component({
  selector: 'app-purchase-items-table',
  standalone: true,
  imports: [IconComponent, EmptyStateComponent, DecimalInputDirective, PresentationFormModalComponent],
  templateUrl: './purchase-items-table.component.html',
  styleUrl: './purchase-items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseItemsTableComponent {
  private readonly inventoryLocationsService = inject(InventoryLocationsService);

  /** Lazily fetched per product on first sight — a purchase invoice rarely spans more than a handful of distinct products, so this stays a handful of small requests, not a big upfront fetch. */
  private readonly presentationsCache = signal<Map<string, ProductPresentation[]>>(new Map());
  private readonly requestedProductIds = new Set<string>();

  /** Which row's "+ Nueva unidad de medida" is open — null when closed. Reuses Inventario's own presentation modal instead of duplicating its create logic. */
  readonly presentationModalProductId = signal<string | null>(null);

  private itemsValue: PurchaseDraftItem[] = [];

  @Input()
  set items(value: PurchaseDraftItem[]) {
    this.itemsValue = value;
    for (const item of value) {
      this.ensurePresentationsLoaded(item.productId);
    }
  }
  get items(): PurchaseDraftItem[] {
    return this.itemsValue;
  }

  @Output() quantityChange = new EventEmitter<{ productId: string; quantity: number }>();
  @Output() costPriceChange = new EventEmitter<{ productId: string; costPrice: number }>();
  @Output() publicPriceChange = new EventEmitter<{ productId: string; publicPrice: number }>();
  @Output() presentationChange = new EventEmitter<{ productId: string; presentation: ProductPresentation | null }>();
  @Output() removeItem = new EventEmitter<string>();

  calculateItemTotal = calculatePurchaseItemTotal;
  formatCurrency = formatCurrency;

  private ensurePresentationsLoaded(productId: string): void {
    if (this.requestedProductIds.has(productId)) {
      return;
    }
    this.requestedProductIds.add(productId);
    this.inventoryLocationsService.getPresentations(productId).subscribe({
      next: (presentations) => {
        const active = presentations.filter((p) => p.isActive);
        this.presentationsCache.update((cache) => {
          const next = new Map(cache);
          next.set(productId, active);
          return next;
        });
      },
      error: () => {
        // A presentation-selector that fails to load just falls back to the
        // implicit "Unidad" behavior for that row — never blocks the rest of
        // the invoice from being built.
      },
    });
  }

  presentationsFor(productId: string): ProductPresentation[] {
    return this.presentationsCache().get(productId) ?? [];
  }

  onPresentationInput(item: PurchaseDraftItem, presentationId: string): void {
    const presentation = this.presentationsFor(item.productId).find((p) => p.id === presentationId) ?? null;
    this.presentationChange.emit({ productId: item.productId, presentation });
  }

  openPresentationModal(productId: string): void {
    this.presentationModalProductId.set(productId);
  }

  closePresentationModal(): void {
    this.presentationModalProductId.set(null);
  }

  /** New presentation created from this row's "+ Nueva unidad de medida" — added to the cache and auto-selected for that line, same as picking an existing one from the dropdown. */
  onPresentationCreated(presentation: ProductPresentation): void {
    const productId = this.presentationModalProductId();
    this.presentationModalProductId.set(null);
    if (!productId) {
      return;
    }

    this.presentationsCache.update((cache) => {
      const next = new Map(cache);
      next.set(productId, [...(next.get(productId) ?? []), presentation]);
      return next;
    });
    this.presentationChange.emit({ productId, presentation });
  }

  increment(item: PurchaseDraftItem): void {
    this.quantityChange.emit({ productId: item.productId, quantity: item.quantity + 1 });
  }

  decrement(item: PurchaseDraftItem): void {
    this.quantityChange.emit({ productId: item.productId, quantity: Math.max(item.quantity - 1, 1) });
  }

  onQuantityInput(item: PurchaseDraftItem, value: string): void {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.quantityChange.emit({ productId: item.productId, quantity: Math.max(parsed, 1) });
  }

  onCostPriceInput(item: PurchaseDraftItem, value: string): void {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.costPriceChange.emit({ productId: item.productId, costPrice: Math.max(parsed, 0) });
  }

  onPublicPriceInput(item: PurchaseDraftItem, value: string): void {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.publicPriceChange.emit({ productId: item.productId, publicPrice: Math.max(parsed, 0) });
  }
}
