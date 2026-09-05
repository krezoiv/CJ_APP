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

import { RechargeDailyBalance, RechargeType, formatCurrency } from '../../../../../core/models';
import { RechargesService } from '../../../../../core/services/recharges.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

/**
 * Self-contained, like `CategoryFormModalComponent`/`ProductFormModalComponent` — calls
 * `RechargesService` directly and emits the updated row so the parent only has to merge it
 * into its `balances` list, rather than owning the request itself. Now confirms via the
 * global `ConfirmDialogService` before submitting (this form had no confirmation step before
 * the Monto de Compra/Acreditado ticket) — the promise resolves and closes immediately, the
 * pre-existing `isSubmitting` signal takes over from there, same pattern already used by the
 * 11 CRUD form-modals migrated to this service.
 */
@Component({
  selector: 'app-register-purchase-form',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './register-purchase-form.component.html',
  styleUrl: './register-purchase-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPurchaseFormComponent implements OnChanges {
  @Input() types: RechargeType[] = [];
  /** `yyyy-MM-dd` — the page's operation-date picker value; every purchase is credited to this date, not necessarily today. */
  @Input() operationDate = '';
  /** The active date's Recargas day is CLOSED (via "Cerrar Día") or, for today, not yet opened — mirrors the backend's day-lifecycle gate. `null` means editing is unlocked. */
  @Input() lockReason: 'closed' | 'not_opened' | null = null;

  @Output() registered = new EventEmitter<RechargeDailyBalance>();

  private readonly fb = inject(FormBuilder);
  private readonly rechargesService = inject(RechargesService);
  private readonly notificationService = inject(NotificationService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    rechargeTypeId: ['', Validators.required],
    purchaseAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    creditedAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['types'] && this.types.length > 0 && !this.form.controls.rechargeTypeId.value) {
      this.form.controls.rechargeTypeId.setValue(this.types[0].id);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting() || this.lockReason !== null) {
      this.form.markAllAsTouched();
      return;
    }

    const { rechargeTypeId, purchaseAmount, creditedAmount } = this.form.getRawValue();

    const confirmed = await this.confirmDialogService.confirm({
      type: 'FINANCIAL_OPERATION',
      title: 'Confirmar registro de compra',
      message: `¿Desea registrar esta compra?\n\nMonto de Compra: ${formatCurrency(purchaseAmount!)}\nMonto Acreditado: ${formatCurrency(creditedAmount!)}`,
      confirmText: 'Confirmar',
    });
    if (!confirmed) {
      return;
    }

    this.isSubmitting.set(true);

    this.rechargesService
      .registerPurchase({
        rechargeTypeId,
        purchaseAmount: purchaseAmount!,
        creditedAmount: creditedAmount!,
        operationDate: this.operationDate,
      })
      .subscribe({
      next: (balance) => {
        this.isSubmitting.set(false);
        this.form.controls.purchaseAmount.reset(null);
        this.form.controls.creditedAmount.reset(null);
        this.notificationService.success(
          `Compra de ${formatCurrency(purchaseAmount!)} (acreditado ${formatCurrency(creditedAmount!)}) registrada para ${balance.rechargeTypeName}.`
        );
        this.registered.emit(balance);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo registrar la compra.'));
      },
    });
  }
}
