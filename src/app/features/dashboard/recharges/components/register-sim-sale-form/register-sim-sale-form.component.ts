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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { SimDailyStock, SimType, formatCurrency } from '../../../../../core/models';
import { RechargeSimsService } from '../../../../../core/services/recharge-sims.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

function integerValidator(control: AbstractControl): ValidationErrors | null {
  return control.value !== null && !Number.isInteger(control.value) ? { integer: true } : null;
}

/**
 * "Venta de SIM" — deliberately separate from `RechargeSaleFormModalComponent`
 * (venta de recarga electrónica, teléfono + monto): esta vende inventario
 * físico por cantidad, nunca afecta el saldo electrónico. El stock
 * disponible ("no vender más de las existentes") se valida aquí como una
 * ayuda de UX — la garantía real es la función SQL `register_recharge_sim_sale`,
 * que rechaza bajo `FOR UPDATE` incluso si este chequeo quedó desactualizado.
 */
@Component({
  selector: 'app-register-sim-sale-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './register-sim-sale-form.component.html',
  styleUrl: './register-sim-sale-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSimSaleFormComponent implements OnChanges {
  @Input() types: SimType[] = [];
  /** Current stock per SIM type id — used only for the client-side "no vender más de lo disponible" hint; the backend is the real guarantee. */
  @Input() stockByTypeId: Record<string, number> = {};
  @Input() operationDate = '';
  @Input() lockReason: 'closed' | 'not_opened' | null = null;

  @Output() registered = new EventEmitter<SimDailyStock>();

  private readonly fb = inject(FormBuilder);
  private readonly simsService = inject(RechargeSimsService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly selectedType = signal<SimType | null>(null);

  readonly form = this.fb.nonNullable.group({
    simTypeId: ['', Validators.required],
    quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), integerValidator]),
  });

  formatCurrency = formatCurrency;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['types'] && this.types.length > 0 && !this.form.controls.simTypeId.value) {
      this.form.controls.simTypeId.setValue(this.types[0].id);
      this.selectedType.set(this.types[0]);
    }
  }

  onTypeChange(id: string): void {
    this.selectedType.set(this.types.find((type) => type.id === id) ?? null);
  }

  get previewUnitPrice(): number {
    return this.selectedType()?.publicPrice ?? 0;
  }

  get previewTotal(): number {
    return this.previewUnitPrice * (this.form.controls.quantity.value ?? 0);
  }

  get availableStock(): number {
    const type = this.selectedType();
    return type ? (this.stockByTypeId[type.id] ?? 0) : 0;
  }

  get exceedsStock(): boolean {
    const quantity = this.form.controls.quantity.value;
    return quantity !== null && quantity > this.availableStock;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting() || this.lockReason !== null || this.exceedsStock) {
      this.form.markAllAsTouched();
      return;
    }

    const { simTypeId, quantity } = this.form.getRawValue();
    const type = this.selectedType();

    const confirmed = await this.confirmDialogService.confirm({
      type: 'FINANCIAL_OPERATION',
      title: 'Confirmar venta de SIM',
      message: `¿Desea registrar esta venta de SIM?\n\nProducto: ${type?.name ?? ''}\nCantidad: ${quantity}\nPrecio: ${formatCurrency(this.previewUnitPrice)}\nTotal: ${formatCurrency(this.previewTotal)}`,
      confirmText: 'Confirmar',
    });
    if (!confirmed) {
      return;
    }

    this.isSubmitting.set(true);

    this.simsService.registerSale({ simTypeId, quantity: quantity!, operationDate: this.operationDate }).subscribe({
      next: (stock) => {
        this.isSubmitting.set(false);
        this.form.controls.quantity.reset(null);
        this.notificationService.success(
          `Venta de ${quantity} ${stock.simTypeName} registrada (${formatCurrency(this.previewUnitPrice * quantity!)}).`,
        );
        this.registered.emit(stock);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la venta de SIM.'));
      },
    });
  }
}
