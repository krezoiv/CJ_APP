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

import { Business } from '../../../../../core/models';
import { BusinessService } from '../../../../../core/services/business.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-business-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './business-form-modal.component.html',
  styleUrl: './business-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Business = edit mode (form is pre-filled from it). */
  @Input() business: Business | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Business>();

  private readonly fb = inject(FormBuilder);
  private readonly businessService = inject(BusinessService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    description: ['', Validators.maxLength(255)],
  });

  get isEditMode(): boolean {
    return this.business !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.business) {
      this.form.reset({ name: this.business.name, description: this.business.description ?? '' });
    } else {
      this.form.reset({ name: '', description: '' });
    }
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

    const { name, description } = this.form.getRawValue();
    const input = { name, description: description || undefined };
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.businessService.updateBusiness(this.business!.id, input)
      : this.businessService.createBusiness(input);

    request$.subscribe({
      next: (business) => {
        this.isSubmitting.set(false);
        this.saved.emit(business);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el negocio. Inténtalo de nuevo.'));
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
