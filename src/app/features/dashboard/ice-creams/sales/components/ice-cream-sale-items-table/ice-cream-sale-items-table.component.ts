import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  IceCreamSaleDraftItem,
  calculateIceCreamSaleItemTotal,
  formatIceCreamCurrency,
} from '../../../../../../core/models';
import { EmptyStateComponent, IconComponent } from '../../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../../shared/directives/decimal-input.directive';

@Component({
  selector: 'app-ice-cream-sale-items-table',
  standalone: true,
  imports: [IconComponent, EmptyStateComponent, DecimalInputDirective],
  templateUrl: './ice-cream-sale-items-table.component.html',
  styleUrl: './ice-cream-sale-items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamSaleItemsTableComponent {
  @Input() items: IceCreamSaleDraftItem[] = [];

  @Output() quantityChange = new EventEmitter<{ iceCreamId: string; quantity: number }>();
  @Output() removeItem = new EventEmitter<string>();

  calculateItemTotal = calculateIceCreamSaleItemTotal;
  formatCurrency = formatIceCreamCurrency;

  /** Client-side hint only — the backend re-validates stock under a row lock at save time regardless. */
  atStockLimit(item: IceCreamSaleDraftItem): boolean {
    return item.quantity >= item.availableStock;
  }

  increment(item: IceCreamSaleDraftItem): void {
    if (this.atStockLimit(item)) {
      return;
    }
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: item.quantity + 1 });
  }

  decrement(item: IceCreamSaleDraftItem): void {
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: Math.max(item.quantity - 1, 1) });
  }

  onQuantityInput(item: IceCreamSaleDraftItem, value: string): void {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), item.availableStock);
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: clamped });
  }
}
