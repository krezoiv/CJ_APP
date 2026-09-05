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

import { TransactionBank } from '../../../../../core/models';
import { TransactionBankService } from '../../../../../core/services/transaction-bank.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-transaction-bank-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './transaction-bank-form-modal.component.html',
  styleUrl: './transaction-bank-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionBankFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, an TransactionBank = edit mode (form is pre-filled from it). */
  @Input() transactionBank: TransactionBank | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<TransactionBank>();

  private readonly fb = inject(FormBuilder);
  private readonly transactionBankService = inject(TransactionBankService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
  });

  get isEditMode(): boolean {
    return this.transactionBank !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    this.form.reset({ name: this.transactionBank?.name ?? '' });
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

    const { name } = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.transactionBankService.updateTransactionBank(this.transactionBank!.id, { name })
      : this.transactionBankService.createTransactionBank({ name });

    request$.subscribe({
      next: (transactionBank) => {
        this.isSubmitting.set(false);
        this.saved.emit(transactionBank);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el banco agente. Inténtalo de nuevo.'));
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
