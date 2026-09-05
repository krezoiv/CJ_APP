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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { TRANSACTION_TYPE_ICONS, TransactionType } from '../../../../../core/models';
import { TransactionTypeService } from '../../../../../core/services/transaction-type.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-transaction-type-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './transaction-type-form-modal.component.html',
  styleUrl: './transaction-type-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionTypeFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, an TransactionType = edit mode (form is pre-filled from it). */
  @Input() transactionType: TransactionType | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<TransactionType>();

  private readonly fb = inject(FormBuilder);
  private readonly transactionTypeService = inject(TransactionTypeService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly icons = TRANSACTION_TYPE_ICONS;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    icon: [TRANSACTION_TYPE_ICONS[0] as string, Validators.required],
  });

  get isEditMode(): boolean {
    return this.transactionType !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    this.form.reset({
      name: this.transactionType?.name ?? '',
      icon: this.transactionType?.icon ?? TRANSACTION_TYPE_ICONS[0],
    });
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

    const { name, icon } = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.transactionTypeService.updateTransactionType(this.transactionType!.id, { name, icon })
      : this.transactionTypeService.createTransactionType({ name, icon });

    request$.subscribe({
      next: (transactionType) => {
        this.isSubmitting.set(false);
        this.saved.emit(transactionType);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el tipo de transacción. Inténtalo de nuevo.'));
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
