import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StockStatus } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

export type StockFilterValue = 'all' | StockStatus;

interface StockFilterOption {
  value: StockFilterValue;
  label: string;
}

const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in-stock', label: 'Con stock' },
  { value: 'low-stock', label: 'Stock bajo' },
  { value: 'out-of-stock', label: 'Sin stock' },
];

@Component({
  selector: 'app-inventory-toolbar',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './inventory-toolbar.component.html',
  styleUrl: './inventory-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryToolbarComponent {
  @Input() categories: string[] = [];
  @Input() businesses: string[] = [];
  @Input() searchTerm = '';
  @Input() selectedCategory = '';
  @Input() selectedBusiness = '';
  @Input() stockFilter: StockFilterValue = 'all';
  /** USER role doesn't get to create products — hides the button, the backend still enforces this. */
  @Input() canManage = true;

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() selectedCategoryChange = new EventEmitter<string>();
  @Output() selectedBusinessChange = new EventEmitter<string>();
  @Output() stockFilterChange = new EventEmitter<StockFilterValue>();
  @Output() addProduct = new EventEmitter<void>();
  @Output() transferInventory = new EventEmitter<void>();
  @Output() exportPdf = new EventEmitter<void>();
  @Output() exportExcel = new EventEmitter<void>();

  readonly stockFilterOptions = STOCK_FILTER_OPTIONS;
}
