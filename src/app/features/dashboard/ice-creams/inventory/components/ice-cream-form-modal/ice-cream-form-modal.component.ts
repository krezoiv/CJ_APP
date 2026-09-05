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

import { IceCream } from '../../../../../../core/models';
import { IceCreamService } from '../../../../../../core/services/ice-cream.service';
import { ConfirmDialogService } from '../../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../../shared/directives/decimal-input.directive';

@Component({
  selector: 'app-ice-cream-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './ice-cream-form-modal.component.html',
  styleUrl: './ice-cream-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IceCreamFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, an IceCream = edit mode (form is pre-filled from it). */
  @Input() iceCream: IceCream | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<IceCream>();

  private readonly fb = inject(FormBuilder);
  private readonly iceCreamService = inject(IceCreamService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    sku: ['', [Validators.required, Validators.maxLength(64), Validators.pattern(/^[a-zA-Z0-9-]+$/)]],
    product: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    publicPrice: [0, [Validators.required, Validators.min(0)]],
  });

  get isEditMode(): boolean {
    return this.iceCream !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.iceCream) {
      const { sku, product, costPrice, publicPrice } = this.iceCream;
      this.form.reset({ sku, product, costPrice, publicPrice });
    } else {
      this.form.reset({ sku: '', product: '', costPrice: 0, publicPrice: 0 });
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

    const input = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.iceCreamService.updateIceCream(this.iceCream!.id, input)
      : this.iceCreamService.createIceCream(input);

    request$.subscribe({
      next: (iceCream) => {
        this.isSubmitting.set(false);
        this.saved.emit(iceCream);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el helado. Inténtalo de nuevo.'));
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
