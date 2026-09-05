import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PresentationTypeListItem, ProductPresentation } from '../../../../../core/models';
import { InventoryLocationsService } from '../../../../../core/services/inventory-locations.service';
import { PresentationTypeService } from '../../../../../core/services/presentation-type.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

/**
 * "Administración de presentaciones" — create/edit a product's presentations
 * (Unidad, Caja, Paquete...). Never physically deletes one; deactivating is
 * the only "removal" this module offers, and "Unidad" itself can't be
 * renamed/deactivated/have its factor changed (mirrors the backend's
 * `UnidadPresentationImmutableError`).
 */
@Component({
  selector: 'app-presentation-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './presentation-form-modal.component.html',
  styleUrl: './presentation-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentationFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() productId: string | null = null;
  /** null = create mode, a ProductPresentation = edit mode. */
  @Input() presentation: ProductPresentation | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<ProductPresentation>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryLocationsService = inject(InventoryLocationsService);
  private readonly presentationTypeService = inject(PresentationTypeService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Active catalog entries for the dropdown — loaded once when the modal opens, never free text. */
  readonly presentationTypes = signal<PresentationTypeListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    presentationTypeId: ['', Validators.required],
    conversionFactor: [1, [Validators.required, Validators.min(1)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    publicPrice: [0, [Validators.required, Validators.min(0)]],
  });

  get isEditMode(): boolean {
    return this.presentation !== null;
  }

  /** "Unidad" is the immutable base presentation — the backend rejects renaming/re-factoring/deactivating it. */
  get isUnidad(): boolean {
    return this.presentation?.name === 'Unidad';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.presentation) {
      const { presentationTypeId, conversionFactor, costPrice, publicPrice } = this.presentation;
      this.form.reset({ presentationTypeId, conversionFactor, costPrice, publicPrice });
    } else {
      this.form.reset({ presentationTypeId: '', conversionFactor: 1, costPrice: 0, publicPrice: 0 });
    }

    if (this.isUnidad) {
      this.form.controls.presentationTypeId.disable();
      this.form.controls.conversionFactor.disable();
    } else {
      this.form.controls.presentationTypeId.enable();
      this.form.controls.conversionFactor.enable();
    }

    // Active types only — "Unidad" itself is excluded from a *new*
    // presentation's options (it's auto-created once per product, never
    // picked here), but stays selectable while editing the product's own
    // "Unidad" row (disabled control above, so it never actually changes).
    this.presentationTypeService.getPresentationTypes().subscribe({
      next: (types) =>
        this.presentationTypes.set(
          this.isUnidad ? types : types.filter((t) => t.name.trim().toLowerCase() !== 'unidad'),
        ),
      error: () => {
        // Purely informational load failure — the form still renders, just with an empty dropdown; the user can retry by reopening.
      },
    });
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting() || !this.productId) {
      this.form.markAllAsTouched();
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: this.isEditMode ? 'UPDATE' : 'SAVE',
    });
    if (!confirmed) {
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.inventoryLocationsService.updatePresentation(this.presentation!.id, value)
      : this.inventoryLocationsService.createPresentation(this.productId, value);

    request$.subscribe({
      next: (presentation) => {
        this.isSubmitting.set(false);
        this.saved.emit(presentation);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar la presentación. Inténtalo de nuevo.'));
      },
    });
  }

  async close(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }
    if (this.form.dirty) {
      const discard = await this.confirmDialogService.confirm({ type: 'CANCEL' });
      if (!discard) {
        return;
      }
    }
    this.closed.emit();
  }
}
