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

import { AccountType } from '../../../../../core/models';
import { AccountTypeService } from '../../../../../core/services/account-type.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-account-type-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './account-type-form-modal.component.html',
  styleUrl: './account-type-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, an AccountType = edit mode (form is pre-filled from it). */
  @Input() accountType: AccountType | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AccountType>();

  private readonly fb = inject(FormBuilder);
  private readonly accountTypeService = inject(AccountTypeService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
  });

  get isEditMode(): boolean {
    return this.accountType !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    this.form.reset({ name: this.accountType?.name ?? '' });
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
      ? this.accountTypeService.updateAccountType(this.accountType!.id, { name })
      : this.accountTypeService.createAccountType({ name });

    request$.subscribe({
      next: (accountType) => {
        this.isSubmitting.set(false);
        this.saved.emit(accountType);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el tipo de cuenta. Inténtalo de nuevo.'));
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
