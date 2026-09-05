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
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin } from 'rxjs';

import {
  Business,
  Category,
  CreatePresentationInput,
  PresentationTypeListItem,
  Product,
  UnitOfMeasureListItem,
} from '../../../../../core/models';
import { InventoryService } from '../../../../../core/services/inventory.service';
import { InventoryLocationsService } from '../../../../../core/services/inventory-locations.service';
import { PresentationTypeService } from '../../../../../core/services/presentation-type.service';
import { UnitOfMeasureService } from '../../../../../core/services/unit-of-measure.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

type PresentationRow = FormGroup<{
  presentationTypeId: FormControl<string>;
  conversionFactor: FormControl<number>;
  costPrice: FormControl<number>;
  publicPrice: FormControl<number>;
}>;

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './product-form-modal.component.html',
  styleUrl: './product-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Product = edit mode (form is pre-filled from it). */
  @Input() product: Product | null = null;
  /** Real, active categories from the backend — never hardcoded. */
  @Input() categories: Category[] = [];
  /** Real, active businesses (líneas de negocio) from the backend — never hardcoded. */
  @Input() businesses: Business[] = [];
  /** Real, active units of measure (Unidad, Kilogramo, Litro...) from the backend — never hardcoded. */
  @Input() unitsOfMeasure: UnitOfMeasureListItem[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Product>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryService = inject(InventoryService);
  private readonly inventoryLocationsService = inject(InventoryLocationsService);
  private readonly presentationTypeService = inject(PresentationTypeService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Names of presentations the product already has (edit mode only) — shown as a hint so the user doesn't try to re-add "Caja" and hit a 409. */
  readonly existingPresentationNames = signal<string[]>([]);
  /** Active catalog entries for each new-presentation row's dropdown — "Unidad" excluded, it's auto-created and never picked here. */
  readonly presentationTypeOptions = signal<PresentationTypeListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    sku: ['', [Validators.maxLength(64), Validators.pattern(/^[a-zA-Z0-9-]+$/)]],
    categoryId: ['', Validators.required],
    businessId: ['', Validators.required],
    unitOfMeasureId: ['', Validators.required],
    costPrice: [0, [Validators.required, Validators.min(0.01)]],
    publicPrice: [0, [Validators.required, Validators.min(0.01)]],
    wholesalePrice: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    presentations: this.fb.array<PresentationRow>([]),
  });

  get isEditMode(): boolean {
    return this.product !== null;
  }

  get presentationRows() {
    return this.form.controls.presentations;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);
    this.existingPresentationNames.set([]);
    this.presentationRows.clear();

    this.presentationTypeService.getPresentationTypes().subscribe({
      next: (types) =>
        this.presentationTypeOptions.set(types.filter((t) => t.name.trim().toLowerCase() !== 'unidad')),
      error: () => {
        // Purely informational load failure — the add-presentation rows below still work, just with an empty dropdown until reopened.
      },
    });

    if (this.product) {
      const { name, sku, categoryId, businessId, unitOfMeasureId, costPrice, publicPrice, wholesalePrice, stock } =
        this.product;
      this.form.reset({
        name,
        sku: sku ?? '',
        categoryId,
        businessId,
        unitOfMeasureId,
        costPrice,
        publicPrice,
        wholesalePrice,
        stock,
        presentations: [],
      });

      this.inventoryLocationsService.getPresentations(this.product.id).subscribe({
        next: (presentations) =>
          this.existingPresentationNames.set(presentations.filter((p) => p.isActive).map((p) => p.name)),
        error: () => {
          // Purely informational — the add-presentation flow below still works without it.
        },
      });
    } else {
      this.form.reset({
        name: '',
        sku: '',
        categoryId: '',
        businessId: '',
        unitOfMeasureId: '',
        costPrice: 0,
        publicPrice: 0,
        wholesalePrice: 0,
        stock: 0,
        presentations: [],
      });
    }
  }

  addPresentationRow(): void {
    const row: PresentationRow = this.fb.nonNullable.group({
      presentationTypeId: this.fb.nonNullable.control('', Validators.required),
      conversionFactor: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
      costPrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
      publicPrice: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    });
    this.presentationRows.push(row);
  }

  removePresentationRow(index: number): void {
    this.presentationRows.removeAt(index);
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: this.isEditMode ? 'UPDATE' : 'SAVE',
    });
    if (!confirmed) {
      return;
    }

    const { sku, presentations, ...rest } = this.form.getRawValue();
    const input = { ...rest, sku: sku.trim() || null };
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.inventoryService.updateProduct(this.product!.id, input)
      : this.inventoryService.createProduct(input);

    request$.subscribe({
      next: (product) => this.createAdditionalPresentations(product, presentations),
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el producto. Inténtalo de nuevo.'));
      },
    });
  }

  /**
   * Fires after the product itself is successfully created/updated — the
   * product's own save is never blocked by this. A presentation-creation
   * failure (e.g. a duplicate name) is surfaced as a toast, not a form
   * error, because by this point the modal is already closing on a genuine
   * success; the user can always finish adding the missed presentation from
   * the product's own detail page.
   */
  private createAdditionalPresentations(product: Product, presentations: CreatePresentationInput[]): void {
    if (presentations.length === 0) {
      this.isSubmitting.set(false);
      this.saved.emit(product);
      return;
    }

    forkJoin(presentations.map((p) => this.inventoryLocationsService.createPresentation(product.id, p))).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.notificationService.success('Producto y presentaciones guardados correctamente.');
        this.saved.emit(product);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.notificationService.error(
          extractErrorMessage(
            error,
            'El producto se guardó, pero no se pudieron crear todas las presentaciones adicionales. Agrégalas desde el detalle del producto.',
          ),
        );
        this.saved.emit(product);
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
