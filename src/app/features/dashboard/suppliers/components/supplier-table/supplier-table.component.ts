import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { Supplier } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

export type SupplierSortColumn = 'name' | 'taxId' | 'phone' | 'email' | 'isActive' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-supplier-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './supplier-table.component.html',
  styleUrl: './supplier-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierTableComponent {
  private readonly suppliersInput = signal<Supplier[]>([]);

  @Input()
  set suppliers(value: Supplier[]) {
    this.suppliersInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** USER role is read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Supplier>();
  @Output() delete = new EventEmitter<Supplier>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addSupplier = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  readonly sortColumn = signal<SupplierSortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedSuppliers = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.suppliersInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (Number(aValue) - Number(bValue)) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: SupplierSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: SupplierSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }
}
