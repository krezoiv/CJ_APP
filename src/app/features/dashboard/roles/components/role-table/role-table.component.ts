import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

import { Role } from '../../../../../core/models';
import { BadgeComponent, ButtonComponent, EmptyStateComponent, IconComponent } from '../../../../../shared/ui';

export type RoleSortColumn = 'name' | 'description' | 'isActive' | 'usersCount' | 'createdAt';
type SortDirection = 'asc' | 'desc';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

@Component({
  selector: 'app-role-table',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, IconComponent, EmptyStateComponent],
  templateUrl: './role-table.component.html',
  styleUrl: './role-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleTableComponent {
  private readonly rolesInput = signal<Role[]>([]);

  @Input()
  set roles(value: Role[]) {
    this.rolesInput.set(value);
  }

  @Input() loading = false;
  @Input() hasActiveFilters = false;

  @Output() edit = new EventEmitter<Role>();
  @Output() delete = new EventEmitter<Role>();
  @Output() clearFilters = new EventEmitter<void>();
  @Output() addRole = new EventEmitter<void>();

  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  readonly sortColumn = signal<RoleSortColumn>('createdAt');
  readonly sortDirection = signal<SortDirection>('desc');

  readonly sortedRoles = computed(() => {
    const column = this.sortColumn();
    const direction = this.sortDirection() === 'asc' ? 1 : -1;

    return [...this.rolesInput()].sort((a, b) => {
      const aValue = a[column];
      const bValue = b[column];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return (Number(aValue) - Number(bValue)) * direction;
      }
      return String(aValue ?? '').localeCompare(String(bValue ?? '')) * direction;
    });
  });

  toggleSort(column: RoleSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }

  sortIcon(column: RoleSortColumn): string {
    if (this.sortColumn() !== column) {
      return 'chevrons-up-down';
    }
    return this.sortDirection() === 'asc' ? 'chevron-up' : 'chevron-down';
  }

  /** Mirrors the backend's guard: a role with active users, or already inactive, can't be deactivated. */
  deleteDisabledReason(role: Role): string {
    if (!role.isActive) {
      return 'Este rol ya está inactivo.';
    }
    if (role.usersCount > 0) {
      return 'No se puede desactivar: tiene usuarios asignados.';
    }
    return '';
  }
}
