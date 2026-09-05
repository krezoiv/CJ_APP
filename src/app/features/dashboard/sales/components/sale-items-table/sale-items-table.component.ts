import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { SaleItem, formatCurrency } from '../../../../../core/models';
import { EmptyStateComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

@Component({
  selector: 'app-sale-items-table',
  standalone: true,
  imports: [IconComponent, EmptyStateComponent, DecimalInputDirective],
  templateUrl: './sale-items-table.component.html',
  styleUrl: './sale-items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaleItemsTableComponent {
  @Input() items: SaleItem[] = [];
  /** Product ids with an in-flight request — that row's controls are disabled while its own change is still pending. */
  @Input() pendingProductIds: Set<string> = new Set();

  @Output() quantityChange = new EventEmitter<{ productId: string; quantity: number }>();
  @Output() removeItem = new EventEmitter<string>();

  formatCurrency = formatCurrency;

  increment(item: SaleItem): void {
    this.setQuantity(item, item.quantity + 1);
  }

  decrement(item: SaleItem): void {
    this.setQuantity(item, item.quantity - 1);
  }

  onQuantityInput(item: SaleItem, value: string): void {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.setQuantity(item, parsed);
  }

  isPending(item: SaleItem): boolean {
    return this.pendingProductIds.has(item.productId);
  }

  private setQuantity(item: SaleItem, quantity: number): void {
    // Never below 1 — removing a line is the separate, explicit "Quitar" action.
    // No upper clamp here: the backend is the live authority on available stock
    // now (every change is a real-time call), so an over-limit request is
    // simply rejected with a real error instead of silently capped client-side.
    const next = Math.max(quantity, 1);
    this.quantityChange.emit({ productId: item.productId, quantity: next });
  }
}
