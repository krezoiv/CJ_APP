import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Role } from '../../../core/models';
import { RoleService } from '../../../core/services/role.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { RoleSummaryComponent } from './components/role-summary/role-summary.component';
import { RoleToolbarComponent, StatusFilterValue } from './components/role-toolbar/role-toolbar.component';
import { RoleTableComponent } from './components/role-table/role-table.component';
import { RoleFormModalComponent } from './components/role-form-modal/role-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    RoleSummaryComponent,
    RoleToolbarComponent,
    RoleTableComponent,
    RoleFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './roles-page.component.html',
  styleUrl: './roles-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/** A structural clone of `UsersPageComponent` — see that class's own doc comment for the page-
 * assembly pattern and the optimistic local-update-instead-of-refetch reasoning, both shared
 * as-is here. Genuine deltas: no role dropdown filter (roles have no analogous "role of a role"),
 * and no self-action guard (`UsersPageComponent`'s `currentUserId`/self-deactivation UI block has
 * no equivalent here — deactivating a role is blocked by whether it still has assigned users,
 * not by who's logged in, and that check already lives server-side/in `RoleTableComponent`). */
export class RolesPageComponent {
  private readonly roleService = inject(RoleService);
  private readonly notificationService = inject(NotificationService);

  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingRole = signal<Role | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingRole = signal<Role | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.roles().filter((role) => {
      const matchesTerm = !term || role.name.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? role.isActive : !role.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all');

  constructor() {
    this.fetchRoles();
  }

  private fetchRoles(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive roles too (with a status badge/filter).
    this.roleService.getRoles(true).subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los roles.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingRole.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(role: Role): void {
    this.editingRole.set(role);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onRoleSaved(role: Role): void {
    const wasEditing = this.editingRole() !== null;
    this.isFormOpen.set(false);

    this.roles.update((list) => (wasEditing ? list.map((r) => (r.id === role.id ? role : r)) : [role, ...list]));

    this.notificationService.success(
      wasEditing ? `"${role.name}" se actualizó correctamente.` : `"${role.name}" se agregó correctamente.`,
    );
  }

  requestDelete(role: Role): void {
    this.deletingRole.set(role);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingRole.set(null);
  }

  confirmDelete(): void {
    const role = this.deletingRole();
    if (!role) {
      return;
    }

    this.isDeleting.set(true);
    this.roleService.deleteRole(role.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingRole.set(null);
        this.roles.update((list) => list.map((r) => (r.id === role.id ? { ...r, isActive: false } : r)));
        this.notificationService.success(`"${role.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el rol.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
