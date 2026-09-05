import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { IceCream, formatIceCreamCurrency, formatQuantity, getIceCreamStockStatus } from '../../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../../shared/ui';

interface SummaryTile {
  icon: string;
  title: string;
  value: string;
  description: string;
}

@Component({
  selector: 'app-ice-cream-summary',
  standalone: true,
  imports: [CardComponent, IconComponent],
  templateUrl: './ice-cream-summary.component.html',
  styleUrl: './ice-cream-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamSummaryComponent {
  private readonly iceCreams = signal<IceCream[]>([]);

  @Input({ required: true })
  set data(value: IceCream[]) {
    this.iceCreams.set(value);
  }

  readonly tiles = computed<SummaryTile[]>(() => {
    const iceCreams = this.iceCreams();
    const totalStock = iceCreams.reduce((sum, i) => sum + i.stock, 0);
    const lowStock = iceCreams.filter((i) => getIceCreamStockStatus(i.stock) === 'low-stock').length;
    const outOfStock = iceCreams.filter((i) => getIceCreamStockStatus(i.stock) === 'out-of-stock').length;
    const estimatedValue = iceCreams.reduce((sum, i) => sum + i.stock * i.costPrice, 0);

    return [
      {
        icon: 'gift',
        title: 'Total de helados',
        value: formatQuantity(iceCreams.length),
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
        value: formatIceCreamCurrency(estimatedValue),
        description: 'a precio de costo',
      },
    ];
  });
}
