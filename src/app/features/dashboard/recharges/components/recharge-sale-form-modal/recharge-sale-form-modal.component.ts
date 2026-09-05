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

import { RechargeSale, RechargeType, formatCurrency } from '../../../../../core/models';
import { RechargesService } from '../../../../../core/services/recharges.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

/**
 * Self-contained (like `CategoryFormModalComponent`) — calls
 * `RechargesService` directly and emits the saved row. Handles both create
 * (`sale = null`) and edit (`sale` set) the same way that component
 * distinguishes them via one `@Input()`, rather than two separate modals.
 * The recharge type is locked (disabled, not hidden) once editing — see the
 * backend's own `update_recharge_sale`, which never accepts a type change.
 */
@Component({
  selector: 'app-recharge-sale-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './recharge-sale-form-modal.component.html',
  styleUrl: './recharge-sale-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeSaleFormModalComponent implements OnChanges {
  @Input() open = false;
  @Input() types: RechargeType[] = [];
  /** `yyyy-MM-dd` — the page's operation-date picker value; a new sale is always credited to this date. */
  @Input() operationDate = '';
  /** null = create mode, a RechargeSale = edit mode (form pre-filled from it, type locked). */
  @Input() sale: RechargeSale | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<RechargeSale>();

  private readonly fb = inject(FormBuilder);
  private readonly rechargesService = inject(RechargesService);
  private readonly notificationService = inject(NotificationService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    rechargeTypeId: ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
  });

  get isEditMode(): boolean {
    return this.sale !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.sale) {
      this.form.reset({
        rechargeTypeId: this.sale.rechargeTypeId,
        phoneNumber: this.sale.phoneNumber,
        amount: this.sale.amount,
      });
      // Imperative enable/disable, not a template `[disabled]` binding — a
      // value-only binding on a `formControlName` element doesn't reliably
      // control the native disabled state in this codebase (see
      // `RoleFormModalComponent`'s identical documented gotcha).
      this.form.controls.rechargeTypeId.disable();
    } else {
      this.form.controls.rechargeTypeId.enable();
      this.form.reset({ rechargeTypeId: this.types[0]?.id ?? '', phoneNumber: '', amount: null });
    }
  }

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { rechargeTypeId, phoneNumber, amount } = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.rechargesService.updateSale(this.sale!.id, { phoneNumber, amount: amount! })
      : this.rechargesService.registerSale({
          rechargeTypeId,
          phoneNumber,
          amount: amount!,
          operationDate: this.operationDate,
        });

    request$.subscribe({
      next: (sale) => {
        this.isSubmitting.set(false);
        this.notificationService.success(
          this.isEditMode
            ? 'Recarga actualizada correctamente.'
            : `Recarga de ${formatCurrency(amount!)} registrada para ${sale.rechargeTypeName}.`
        );
        this.saved.emit(sale);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar la recarga.'));
      },
    });
  }

  close(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.closed.emit();
  }
}
