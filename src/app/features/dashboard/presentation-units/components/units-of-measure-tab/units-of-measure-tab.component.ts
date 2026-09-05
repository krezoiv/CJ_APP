import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { UnitOfMeasureListItem } from '../../../../../core/models';
import { UnitOfMeasureService } from '../../../../../core/services/unit-of-measure.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  EmptyStateComponent,
  IconComponent,
} from '../../../../../shared/ui';

type StatusFilterValue = 'all' | 'active' | 'inactive';

/** Rows to render while `loading` is true — just enough to fill the fold without looking sparse. */
const SKELETON_ROWS = 4;

/**
 * "Unidades de Medida" tab — the master catalog `ProductFormModalComponent`
 * consumes for its "Unidad de medida" dropdown. Deliberately structured
 * identically to `PresentationTypesTabComponent` (same fetch/filter/create/
 * edit/reactivate-prompt/toggle-active shape) but never shares data with
 * it — a unit of measure and a presentation type are different concepts
 * (see both catalogs' own backend doc comments), each with its own table
 * and its own catalog.
 */
@Component({
  selector: 'app-units-of-measure-tab',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    IconComponent,
  ],
  templateUrl: './units-of-measure-tab.component.html',
  styleUrl: './units-of-measure-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnitsOfMeasureTabComponent {
  private readonly unitOfMeasureService = inject(UnitOfMeasureService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  /** ADMIN/SUPER_ADMIN only — the backend enforces this regardless. */
  readonly isAdmin = this.authService.isAdmin;

  readonly items = signal<UnitOfMeasureListItem[]>([]);
  readonly loading = signal(true);
  readonly searchTerm = signal('');
  readonly statusFilter = signal<StatusFilterValue>('all');
  readonly skeletonRows = Array.from({ length: SKELETON_ROWS });

  readonly isFormOpen = signal(false);
  readonly editingItem = signal<UnitOfMeasureListItem | null>(null);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    abbreviation: ['', [Validators.required, Validators.maxLength(10)]],
    description: ['', Validators.maxLength(255)],
  });

  readonly filteredItems = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.items().filter((item) => {
      const matchesTerm =
        !term ||
        item.name.toLowerCase().includes(term) ||
        item.abbreviation.toLowerCase().includes(term);
      const matchesStatus =
        status === 'all' || (status === 'active' ? item.isActive : !item.isActive);
      return matchesTerm && matchesStatus;
    });
  });

  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim().length > 0 || this.statusFilter() !== 'all',
  );

  readonly totalCount = computed(() => this.items().length);
  readonly activeCount = computed(() => this.items().filter((i) => i.isActive).length);
  readonly inactiveCount = computed(() => this.totalCount() - this.activeCount());

  get isEditMode(): boolean {
    return this.editingItem() !== null;
  }

  constructor() {
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    this.unitOfMeasureService.getUnitsOfMeasure({ includeInactive: true }).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudieron cargar las unidades de medida.'),
        );
      },
    });
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.statusFilter.set('all');
  }

  openCreateForm(): void {
    this.editingItem.set(null);
    this.formError.set(null);
    this.form.reset({ name: '', abbreviation: '', description: '' });
    this.isFormOpen.set(true);
  }

  openEditForm(item: UnitOfMeasureListItem): void {
    this.editingItem.set(item);
    this.formError.set(null);
    this.form.reset({
      name: item.name,
      abbreviation: item.abbreviation,
      description: item.description ?? '',
    });
    this.isFormOpen.set(true);
  }

  async closeForm(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.dirty) {
      const discard = await this.confirmDialogService.confirm({ type: 'CANCEL' });
      if (!discard) {
        return;
      }
    }
    this.isFormOpen.set(false);
  }

  /** Finds an existing row (any state) whose name matches case-insensitively, trimmed — mirrors the backend's own normalization exactly, so the "ya existe pero está inactiva" prompt fires under the same rule the database enforces. */
  private findByNormalizedName(name: string): UnitOfMeasureListItem | undefined {
    const normalized = name.trim().toLowerCase();
    return this.items().find((item) => item.name.trim().toLowerCase() === normalized);
  }

  async submit(): Promise<void> {
    this.formError.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, abbreviation, description } = this.form.getRawValue();
    const trimmedName = name.trim();
    const editing = this.editingItem();

    if (!editing) {
      const existing = this.findByNormalizedName(trimmedName);
      if (existing && !existing.isActive) {
        const activate = await this.confirmDialogService.confirm({
          type: 'UPDATE',
          title: 'Unidad de medida existente inactiva',
          message: `Ya existe una unidad de medida llamada "${existing.name}", pero está inactiva. ¿Desea activarla en vez de crear una nueva?`,
          confirmText: 'Activar existente',
        });
        if (activate) {
          this.reactivate(existing);
        }
        return;
      }
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: editing ? 'UPDATE' : 'SAVE',
    });
    if (!confirmed) {
      return;
    }

    this.isSubmitting.set(true);
    const input = {
      name: trimmedName,
      abbreviation: abbreviation.trim(),
      description: description.trim() || undefined,
    };

    const request$ = editing
      ? this.unitOfMeasureService.updateUnitOfMeasure(editing.id, input)
      : this.unitOfMeasureService.createUnitOfMeasure(input);

    request$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.notificationService.success(
          editing ? 'La unidad de medida se actualizó correctamente.' : 'La unidad de medida se registró correctamente.',
        );
        this.fetch();
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.formError.set(
          extractErrorMessage(error, 'No se pudo guardar la unidad de medida. Inténtalo de nuevo.'),
        );
      },
    });
  }

  private reactivate(item: UnitOfMeasureListItem): void {
    this.isSubmitting.set(true);
    this.unitOfMeasureService.updateUnitOfMeasure(item.id, { isActive: true }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.isFormOpen.set(false);
        this.notificationService.success(`"${item.name}" se activó correctamente.`);
        this.fetch();
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.formError.set(extractErrorMessage(error, 'No se pudo activar la unidad de medida.'));
      },
    });
  }

  async toggleActive(item: UnitOfMeasureListItem): Promise<void> {
    const activating = !item.isActive;
    const usageNote =
      !activating && item.usageCount > 0
        ? ` Actualmente la utilizan ${item.usageCount} producto(s) — seguirá funcionando para esos productos, solo dejará de aparecer para productos nuevos.`
        : '';

    const confirmed = await this.confirmDialogService.confirm({
      type: activating ? 'UPDATE' : 'DELETE',
      title: activating ? 'Confirmar activación' : 'Confirmar desactivación',
      message: activating
        ? `¿Desea activar la unidad de medida "${item.name}"?`
        : `¿Desea desactivar la unidad de medida "${item.name}"?${usageNote}`,
      confirmText: activating ? 'Activar' : 'Desactivar',
    });
    if (!confirmed) {
      return;
    }

    const request$: Observable<unknown> = activating
      ? this.unitOfMeasureService.updateUnitOfMeasure(item.id, { isActive: true })
      : this.unitOfMeasureService.deleteUnitOfMeasure(item.id);

    request$.subscribe({
      next: () => {
        this.notificationService.success(
          activating ? `"${item.name}" se activó correctamente.` : `"${item.name}" se desactivó correctamente.`,
        );
        this.fetch();
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(
          extractErrorMessage(
            error,
            activating ? 'No se pudo activar la unidad de medida.' : 'No se pudo desactivar la unidad de medida.',
          ),
        );
      },
    });
  }
}
