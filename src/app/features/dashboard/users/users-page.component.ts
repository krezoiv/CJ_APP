import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Role, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
import { UserService } from '../../../core/services/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { UserSummaryComponent } from './components/user-summary/user-summary.component';
import { UserToolbarComponent, StatusFilterValue } from './components/user-toolbar/user-toolbar.component';
import { UserTableComponent } from './components/user-table/user-table.component';
import { UserFormModalComponent } from './components/user-form-modal/user-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    UserSummaryComponent,
    UserToolbarComponent,
    UserTableComponent,
    UserFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './users-page.component.html',
  styleUrl: './users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Composes the Usuarios admin screen from five dumb child components (summary tiles, toolbar,
 * table, create/edit modal, delete-confirm modal) and owns all of their shared state itself —
 * none of the children fetch or hold data on their own. Search/status/role filtering is done
 * client-side over the full `users` list (`filteredUsers`), not via server-side query params,
 * since this is an admin list expected to stay small. After a successful create/edit/delete,
 * the local `users` signal is patched in place (`onUserSaved`/`confirmDelete`) rather than
 * re-fetching the whole list — cheaper and avoids a visible reload flicker; the API response
 * from the save/delete call is trusted as the new source of truth for that one row.
 * `RolesPageComponent` is a structural clone of this class — see this doc comment for its
 * shape too; its own comments only note genuine deltas (no role filter, no self-action guard).
 */
export class UsersPageComponent {
  private readonly userService = inject(UserService);
  private readonly roleService = inject(RoleService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  readonly users = signal<User[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');
  readonly roleFilter = signal<string>('all');

  readonly isFormOpen = signal(false);
  readonly editingUser = signal<User | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingUser = signal<User | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    const roleId = this.roleFilter();

    return this.users().filter((user) => {
      const matchesTerm =
        !term || user.username.toLowerCase().includes(term) || user.phone.toLowerCase().includes(term);
      const matchesStatus = status === 'all' || (status === 'active' ? user.isActive : !user.isActive);
      const matchesRole = roleId === 'all' || user.roleId === roleId;
      return matchesTerm && matchesStatus && matchesRole;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all' || this.roleFilter() !== 'all',
  );

  constructor() {
    this.fetchUsers();
    this.fetchRoles();
  }

  private fetchUsers(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive accounts too (with a status badge/filter).
    this.userService.getUsers(true).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los usuarios.'));
      },
    });
  }

  private fetchRoles(): void {
    // Active-only — what the create/edit form's role dropdown should offer.
    this.roleService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los roles.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingUser.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(user: User): void {
    this.editingUser.set(user);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onUserSaved(user: User): void {
    const wasEditing = this.editingUser() !== null;
    this.isFormOpen.set(false);

    this.users.update((list) => (wasEditing ? list.map((u) => (u.id === user.id ? user : u)) : [user, ...list]));

    this.notificationService.success(
      wasEditing ? `"${user.username}" se actualizó correctamente.` : `"${user.username}" se agregó correctamente.`,
    );
  }

  requestDelete(user: User): void {
    this.deletingUser.set(user);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingUser.set(null);
  }

  confirmDelete(): void {
    const user = this.deletingUser();
    if (!user) {
      return;
    }

    this.isDeleting.set(true);
    this.userService.deleteUser(user.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingUser.set(null);
        this.users.update((list) => list.map((u) => (u.id === user.id ? { ...u, isActive: false } : u)));
        this.notificationService.success(`"${user.username}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar el usuario.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
    this.roleFilter.set('all');
  }
}
