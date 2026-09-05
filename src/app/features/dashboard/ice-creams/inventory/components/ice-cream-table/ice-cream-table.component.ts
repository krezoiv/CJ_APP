import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import {
  ICE_CREAM_STOCK_STATUS_LABEL,
  IceCream,
  IceCreamStockStatus,
  formatIceCreamCurrency,
  formatQuantity,
  getIceCreamStockStatus,
} from '../../../../../../core/models';
import {
  BadgeComponent,
  BadgeTone,
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
} from '../../../../../../shared/ui';

const STOCK_BADGE_TONE: Record<IceCreamStockStatus, BadgeTone> = {
  'in-stock': 'success',
  'low-stock': 'gold',
  'out-of-stock': 'danger',
};

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 5;

export type IceCreamSortColumn = 'product' | 'sku' | 'costPrice' | 'publicPrice' | 'stock' | 'createdAt';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-ice-cream-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './ice-cream-table.component.html',
  styleUrl: './ice-cream-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamTableComponent {
  private readonly iceCreamsInput = signal<IceCream[]>([]);

  @Input()
  set iceCreams(value: IceCream[]) {
    this.iceCreamsInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** USER role is read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<IceCream>();
  @Output() delete = new EventEmitter<IceCream>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addIceCream = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  formatCurrency = formatIceCreamCurrency;
  formatQuantity = formatQuantity;

  readonly sortColumn = signal<IceCreamSortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedIceCreams = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.iceCreamsInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: IceCreamSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: IceCreamSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  statusOf(iceCream: IceCream): IceCreamStockStatus {
    return getIceCreamStockStatus(iceCream.stock);
  }

  statusLabel(iceCream: IceCream): string {
    return ICE_CREAM_STOCK_STATUS_LABEL[this.statusOf(iceCream)];
  }

  statusTone(iceCream: IceCream): BadgeTone {
    return STOCK_BADGE_TONE[this.statusOf(iceCream)];
  }
}
