import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import {
  IceCreamPurchaseDraftItem,
  calculateIceCreamPurchaseItemTotal,
  formatIceCreamCurrency,
} from '../../../../../../core/models';
import { EmptyStateComponent, IconComponent } from '../../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../../shared/directives/decimal-input.directive';

@Component({
  selector: 'app-ice-cream-purchase-items-table',
  standalone: true,
  imports: [IconComponent, EmptyStateComponent, DecimalInputDirective],
  templateUrl: './ice-cream-purchase-items-table.component.html',
  styleUrl: './ice-cream-purchase-items-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamPurchaseItemsTableComponent {
  @Input() items: IceCreamPurchaseDraftItem[] = [];

  @Output() quantityChange = new EventEmitter<{ iceCreamId: string; quantity: number }>();
  @Output() costPriceChange = new EventEmitter<{ iceCreamId: string; costPrice: number }>();
  @Output() removeItem = new EventEmitter<string>();

  calculateItemTotal = calculateIceCreamPurchaseItemTotal;
  formatCurrency = formatIceCreamCurrency;

  increment(item: IceCreamPurchaseDraftItem): void {
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: item.quantity + 1 });
  }

  decrement(item: IceCreamPurchaseDraftItem): void {
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: Math.max(item.quantity - 1, 1) });
  }

  onQuantityInput(item: IceCreamPurchaseDraftItem, value: string): void {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.quantityChange.emit({ iceCreamId: item.iceCreamId, quantity: Math.max(parsed, 1) });
  }

  onCostPriceInput(item: IceCreamPurchaseDraftItem, value: string): void {
    const parsed = parseFloat(value);
    if (Number.isNaN(parsed)) {
      return;
    }
    this.costPriceChange.emit({ iceCreamId: item.iceCreamId, costPrice: Math.max(parsed, 0) });
  }
}
