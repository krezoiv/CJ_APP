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
 * "Compra de SIM" — deliberately a separate component from
 * `RegisterPurchaseFormComponent` (never mixed with "Monto de
 * Compra"/"Monto Acreditado" saldo electrónico), same shape (self-contained,
 * `types`/`operationDate`/`lockReason` in, `registered` out,
 * `ConfirmDialogService` before submitting). Only Cantidad is a real input —
 * el costo lo determina siempre el servidor a partir de `recharge_sim_types`,
 * nunca el cliente; el precio/total mostrados aquí son solo una vista previa.
 */
@Component({
  selector: 'app-register-sim-purchase-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './register-sim-purchase-form.component.html',
  styleUrl: './register-sim-purchase-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterSimPurchaseFormComponent implements OnChanges {
  @Input() types: SimType[] = [];
  /** `yyyy-MM-dd` — the page's operation-date picker value; every purchase is credited to this date, not necessarily today. */
  @Input() operationDate = '';
  /** The active date's Recargas day is CLOSED or, for today, not yet opened — same gate the electronic-balance side already uses. `null` means editing is unlocked. */
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

  get previewUnitCost(): number {
    return this.selectedType()?.costPrice ?? 0;
  }

  get previewTotal(): number {
    return this.previewUnitCost * (this.form.controls.quantity.value ?? 0);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting() || this.lockReason !== null) {
      this.form.markAllAsTouched();
      return;
    }

    const { simTypeId, quantity } = this.form.getRawValue();
    const type = this.selectedType();

    const confirmed = await this.confirmDialogService.confirm({
      type: 'FINANCIAL_OPERATION',
      title: 'Confirmar compra de SIM',
      message: `¿Desea registrar esta compra de SIM?\n\nProducto: ${type?.name ?? ''}\nCantidad: ${quantity}\nPrecio: ${formatCurrency(this.previewUnitCost)}\nTotal: ${formatCurrency(this.previewTotal)}`,
      confirmText: 'Confirmar',
    });
    if (!confirmed) {
      return;
    }

    this.isSubmitting.set(true);

    this.simsService.registerPurchase({ simTypeId, quantity: quantity!, operationDate: this.operationDate }).subscribe({
      next: (stock) => {
        this.isSubmitting.set(false);
        this.form.controls.quantity.reset(null);
        this.notificationService.success(
          `Compra de ${quantity} ${stock.simTypeName} registrada (${formatCurrency(this.previewUnitCost * quantity!)}).`,
        );
        this.registered.emit(stock);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la compra de SIM.'));
      },
    });
  }
}
