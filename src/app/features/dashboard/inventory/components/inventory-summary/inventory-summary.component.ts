import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { Product, formatCurrency, formatQuantity, getStockStatus } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-inventory-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './inventory-summary.component.html',
  styleUrl: './inventory-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventorySummaryComponent {
  private readonly products = signal<Product[]>([]);

  @Input({ required: true })
  set data(value: Product[]) {
    this.products.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const products = this.products();
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStock = products.filter((p) => getStockStatus(p.stock) === 'low-stock').length;
    const outOfStock = products.filter((p) => getStockStatus(p.stock) === 'out-of-stock').length;
    const estimatedValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);

    return [
      {
        icon: 'package',
        title: 'Total de productos',
        value: formatQuantity(products.length),
        description: 'productos registrados',
      },
      {
        icon: 'layers',
        title: 'Stock total',
        value: formatQuantity(totalStock),
        description: 'unidades disponibles',
      },
      {
        icon: 'alert-triangle',
        title: 'Stock bajo',
        value: formatQuantity(lowStock),
        description: outOfStock > 0 ? `+ ${outOfStock} sin stock` : 'productos por reabastecer',
      },
      {
        icon: 'trending-up',
        title: 'Valor del inventario',
        value: formatCurrency(estimatedValue),
        description: 'a precio de costo',
      },
    ];
  });
}
