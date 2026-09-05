import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { Category } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

export type CategorySortColumn = 'name' | 'description' | 'isActive' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-category-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './category-table.component.html',
  styleUrl: './category-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTableComponent {
  private readonly categoriesInput = signal<Category[]>([]);

  @Input()
  set categories(value: Category[]) {
    this.categoriesInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** USER role is read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Category>();
  @Output() delete = new EventEmitter<Category>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addCategory = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  readonly sortColumn = signal<CategorySortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedCategories = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.categoriesInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (Number(aValue) - Number(bValue)) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: CategorySortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: CategorySortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }
}
