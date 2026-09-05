import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { IceCreamStockStatus } from '../../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';

export type IceCreamStockFilterValue = 'all' | IceCreamStockStatus;

interface StockFilterOption {
  value: IceCreamStockFilterValue;
  label: string;
}

const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in-stock', label: 'Con stock' },
  { value: 'low-stock', label: 'Stock bajo' },
  { value: 'out-of-stock', label: 'Sin stock' },
];

@Component({
  selector: 'app-ice-cream-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './ice-cream-toolbar.component.html',
  styleUrl: './ice-cream-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamToolbarComponent {
  @Input() searchTerm = '';
  @Input() stockFilter: IceCreamStockFilterValue = 'all';
  /** USER role doesn't get to create helados — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() stockFilterChange = new EventEmitter<IceCreamStockFilterValue>();
  @Output() addIceCream = new EventEmitter<void>();

  readonly stockFilterOptions = STOCK_FILTER_OPTIONS;
}
