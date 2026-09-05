import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { Client } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

export type ClientSortColumn = 'name' | 'isActive' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-client-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './client-table.component.html',
  styleUrl: './client-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientTableComponent {
  private readonly clientsInput = signal<Client[]>([]);

  @Input()
  set clients(value: Client[]) {
    this.clientsInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;
  /** Other roles are read-only — hides the Acciones column and edit/delete buttons. The backend still enforces this. */
  @Input() canManage = true;

  @Output() edit = new EventEmitter<Client>();
  @Output() delete = new EventEmitter<Client>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addClient = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  readonly sortColumn = signal<ClientSortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedClients = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.clientsInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (Number(aValue) - Number(bValue)) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: ClientSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: ClientSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }
}
