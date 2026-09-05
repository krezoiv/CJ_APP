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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { InventoryLocation, Product, ProductPresentation, formatQuantity } from '../../../../../core/models';
import { InventoryLocationsService } from '../../../../../core/services/inventory-locations.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

/**
 * "Trasladar inventario" — Bodega ↔ Vitrina (or any two active locations),
 * by any presentation, with a live conversion preview and an exact-wording
 * confirmation before the real `POST /inventory/transfers` call. Mirrors
 * `ProductFormModalComponent`'s self-contained shape (injects the service
 * directly, emits `completed`), not a dumb confirm-then-parent-calls-service
 * pair — there's real form state here (product/presentation/locations/qty)
 * a parent has no reason to own.
 */
@Component({
  selector: 'app-transfer-inventory-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './transfer-inventory-modal.component.html',
  styleUrl: './transfer-inventory-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferInventoryModalComponent implements OnChanges {
  @Input() open = false;
  @Input() products: Product[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly inventoryLocationsService = inject(InventoryLocationsService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly locations = signal<InventoryLocation[]>([]);
  readonly presentations = signal<ProductPresentation[]>([]);
  readonly loadingPresentations = signal(false);

  formatQuantity = formatQuantity;

  readonly form = this.fb.nonNullable.group({
    productId: ['', Validators.required],
    presentationId: ['', Validators.required],
    fromLocationId: ['', Validators.required],
    toLocationId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]],
    reason: [''],
  });

  constructor() {
    this.form.controls.productId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((productId) => this.onProductChange(productId));
  }

  get selectedProduct(): Product | null {
    const id = this.form.controls.productId.value;
    return this.products.find((p) => p.id === id) ?? null;
  }

  get selectedPresentation(): ProductPresentation | null {
    const id = this.form.controls.presentationId.value;
    return this.presentations().find((p) => p.id === id) ?? null;
  }

  get conversionFactor(): number {
    return this.selectedPresentation?.conversionFactor ?? 1;
  }

  get totalBaseUnits(): number {
    const quantity = this.form.controls.quantity.value || 0;
    return quantity * this.conversionFactor;
  }

  get sameLocation(): boolean {
    const { fromLocationId, toLocationId } = this.form.getRawValue();
    return !!fromLocationId && fromLocationId === toLocationId;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);
    this.presentations.set([]);
    this.form.reset({
      productId: '',
      presentationId: '',
      fromLocationId: '',
      toLocationId: '',
      quantity: 1,
      reason: '',
    });

    this.inventoryLocationsService.getLocations().subscribe({
      next: (locations) => this.locations.set(locations.filter((l) => l.isActive)),
      error: () => this.errorMessage.set('No se pudieron cargar las ubicaciones.'),
    });
  }

  onProductChange(productId: string): void {
    this.form.controls.presentationId.setValue('');
    this.presentations.set([]);
    if (!productId) {
      return;
    }

    this.loadingPresentations.set(true);
    this.inventoryLocationsService.getPresentations(productId).subscribe({
      next: (presentations) => {
        this.loadingPresentations.set(false);
        const active = presentations.filter((p) => p.isActive);
        this.presentations.set(active);
        const unidad = active.find((p) => p.name === 'Unidad');
        if (unidad) {
          this.form.controls.presentationId.setValue(unidad.id);
        }
      },
      error: () => {
        this.loadingPresentations.set(false);
        this.errorMessage.set('No se pudieron cargar las presentaciones de este producto.');
      },
    });
  }

  async submit(): Promise<void> {
    this.errorMessage.set(null);

    if (this.form.invalid || this.sameLocation || this.isSubmitting()) {
      this.form.markAllAsTouched();
      if (this.sameLocation) {
        this.errorMessage.set('El origen y el destino deben ser ubicaciones distintas.');
      }
      return;
    }

    const { productId, presentationId, fromLocationId, toLocationId, quantity, reason } = this.form.getRawValue();
    const product = this.selectedProduct;
    const presentation = this.selectedPresentation;
    const fromName = this.locations().find((l) => l.id === fromLocationId)?.name ?? '';
    const toName = this.locations().find((l) => l.id === toLocationId)?.name ?? '';
    const presentationLabel = quantity === 1 ? presentation?.name : `${presentation?.name}s`;

    const confirmed = await this.confirmDialogService.confirm({
      type: 'FINANCIAL_OPERATION',
      title: 'Confirmar traslado de inventario',
      message: `¿Está seguro de trasladar ${formatQuantity(quantity)} ${presentationLabel} de ${product?.name} desde ${fromName} hacia ${toName}? 1 ${presentation?.name} = ${this.conversionFactor} unidades.`,
      confirmText: 'Confirmar traslado',
    });
    if (!confirmed) {
      return;
    }

    this.isSubmitting.set(true);
    this.inventoryLocationsService
      .registerTransfer({
        productId,
        presentationId: presentationId || undefined,
        fromLocationId,
        toLocationId,
        quantity,
        reason: reason.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.completed.emit();
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(extractErrorMessage(error, 'No se pudo registrar el traslado. Inténtalo de nuevo.'));
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
