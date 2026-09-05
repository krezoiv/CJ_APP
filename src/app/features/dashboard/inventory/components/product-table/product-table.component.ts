import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import {
  Product,
  STOCK_STATUS_LABEL,
  StockStatus,
  formatCurrency,
  formatQuantity,
  getStockStatus,
  stockAt,
} from '../../../../../core/models';
import {
  BadgeComponent,
  BadgeTone,
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
} from '../../../../../shared/ui';

const STOCK_BADGE_TONE: Record<StockStatus, BadgeTone> = {
  'in-stock': 'success',
  'low-stock': 'gold',
  'out-of-stock': 'danger',
};

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 5;

export type ProductSortColumn =
  | 'name'
  | 'sku'
  | 'category'
  | 'business'
  | 'costPrice'
  | 'publicPrice'
  | 'wholesalePrice'
  | 'stock'
  | 'createdAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-product-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './product-table.component.html',
  styleUrl: './product-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTableComponent {
  private readonly productsInput = signal<Product[]>([]);

  @Input()
  set products(value: Product[]) {
    this.productsInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** USER role is read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Product>();
  @Output() delete = new EventEmitter<Product>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addProduct = new EventEmitter<void>();
  @Output() viewDetail = new EventEmitter<Product>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  readonly sortColumn = signal<ProductSortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedProducts = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.productsInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: ProductSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: ProductSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  statusOf(product: Product): StockStatus {
    return getStockStatus(product.stock);
  }

  statusLabel(product: Product): string {
    return STOCK_STATUS_LABEL[this.statusOf(product)];
  }

  statusTone(product: Product): BadgeTone {
    return STOCK_BADGE_TONE[this.statusOf(product)];
  }

  bodegaStock(product: Product): number {
    return stockAt(product, 'Bodega');
  }

  vitrinaStock(product: Product): number {
    return stockAt(product, 'Vitrina');
  }
}
