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

import { AccountType, Bank } from '../../../../../core/models';
import { BankService } from '../../../../../core/services/bank.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

@Component({
  selector: 'app-bank-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './bank-form-modal.component.html',
  styleUrl: './bank-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BankFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Bank = edit mode (form is pre-filled from it). */
  @Input() bank: Bank | null = null;
  /** Real, active account types from the backend — never hardcoded. */
  @Input() accountTypes: AccountType[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Bank>();

  private readonly fb = inject(FormBuilder);
  private readonly bankService = inject(BankService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    accountNumber: ['', [Validators.required, Validators.maxLength(34)]],
    accountTypeId: ['', Validators.required],
    previousBalance: [0, [Validators.required, Validators.min(0)]],
    finalBalance: [0, [Validators.required, Validators.min(0)]],
  });

  get isEditMode(): boolean {
    return this.bank !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.bank) {
      const { name, accountNumber, accountTypeId, previousBalance, finalBalance } = this.bank;
      this.form.reset({ name, accountNumber, accountTypeId, previousBalance, finalBalance });
    } else {
      this.form.reset({ name: '', accountNumber: '', accountTypeId: '', previousBalance: 0, finalBalance: 0 });
    }
  }

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const input = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.bankService.updateBank(this.bank!.id, input)
      : this.bankService.createBank(input);

    request$.subscribe({
      next: (bank) => {
        this.isSubmitting.set(false);
        this.saved.emit(bank);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el banco. Inténtalo de nuevo.'));
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
