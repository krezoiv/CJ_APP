import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Category } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { CategorySummaryComponent } from './components/category-summary/category-summary.component';
import { CategoryToolbarComponent, StatusFilterValue } from './components/category-toolbar/category-toolbar.component';
import { CategoryTableComponent } from './components/category-table/category-table.component';
import { CategoryFormModalComponent } from './components/category-form-modal/category-form-modal.component';
import { DeleteConfirmModalComponent } from './components/delete-confirm-modal/delete-confirm-modal.component';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [
    CategorySummaryComponent,
    CategoryToolbarComponent,
    CategoryTableComponent,
    CategoryFormModalComponent,
    DeleteConfirmModalComponent,
  ],
  templateUrl: './categories-page.component.html',
  styleUrl: './categories-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * The canonical shape every simple admin catalog screen in this app
 * follows — `BusinessesPageComponent`, `SuppliersPageComponent`,
 * `ClientsPageComponent`, `AccountTypesPageComponent` are all near-
 * identical clones of this exact component (same summary/toolbar/table/
 * form-modal/delete-modal split, same client-side search+status filtering,
 * same in-place row update on soft delete rather than removing it from
 * the list). `isAdmin` is UX-only here — hiding buttons for a non-admin
 * — the backend's own guard is what actually enforces it.
 */
export class CategoriesPageComponent {
  private readonly categoryService = inject(CategoryService);
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);

  /** ADMIN/SUPER_ADMIN only — passed down to hide add/edit/delete for USER. The backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');

  readonly isFormOpen = signal(false);
  readonly editingCategory = signal<Category | null>(null);

  readonly isDeleteOpen = signal(false);
  readonly deletingCategory = signal<Category | null>(null);
  readonly isDeleting = signal(false);

  readonly filteredCategories = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();

    return this.categories().filter((category) => {
      const matchesTerm = !term || category.name.toLowerCase().includes(term);
      const matchesStatus =
        status === 'all' || (status === 'active' ? category.isActive : !category.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(() => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all');

  constructor() {
    this.fetchCategories();
  }

  private fetchCategories(): void {
    this.loading.set(true);
    // Admin management screen — shows inactive categories too (with a status badge/filter),
    // unlike the product form's dropdown which only ever wants active ones.
    this.categoryService.getCategories(true).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar las categorías.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingCategory.set(null);
    this.isFormOpen.set(true);
  }

  openEditForm(category: Category): void {
    this.editingCategory.set(category);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  onCategorySaved(category: Category): void {
    const wasEditing = this.editingCategory() !== null;
    this.isFormOpen.set(false);

    this.categories.update((list) =>
      wasEditing ? list.map((c) => (c.id === category.id ? category : c)) : [category, ...list]
    );

    this.notificationService.success(
      wasEditing ? `"${category.name}" se actualizó correctamente.` : `"${category.name}" se agregó correctamente.`
    );
  }

  requestDelete(category: Category): void {
    this.deletingCategory.set(category);
    this.isDeleteOpen.set(true);
  }

  cancelDelete(): void {
    this.isDeleteOpen.set(false);
    this.deletingCategory.set(null);
  }

  confirmDelete(): void {
    const category = this.deletingCategory();
    if (!category) {
      return;
    }

    this.isDeleting.set(true);
    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.isDeleteOpen.set(false);
        this.deletingCategory.set(null);
        this.categories.update((list) =>
          list.map((c) => (c.id === category.id ? { ...c, isActive: false } : c))
        );
        this.notificationService.success(`"${category.name}" se desactivó correctamente.`);
      },
      error: (error: HttpErrorResponse) => {
        this.isDeleting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo desactivar la categoría.'));
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }
}
