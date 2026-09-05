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

import { Supplier } from '../../../../../core/models';
import { SupplierService } from '../../../../../core/services/supplier.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-supplier-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './supplier-form-modal.component.html',
  styleUrl: './supplier-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupplierFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Supplier = edit mode (form is pre-filled from it). */
  @Input() supplier: Supplier | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Supplier>();

  private readonly fb = inject(FormBuilder);
  private readonly supplierService = inject(SupplierService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    phone: ['', [Validators.pattern(/^\+?[0-9]{7,15}$/)]],
    email: ['', [Validators.email]],
    address: ['', Validators.maxLength(255)],
    taxId: ['', Validators.maxLength(50)],
  });

  get isEditMode(): boolean {
    return this.supplier !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.supplier) {
      this.form.reset({
        name: this.supplier.name,
        phone: this.supplier.phone ?? '',
        email: this.supplier.email ?? '',
        address: this.supplier.address ?? '',
        taxId: this.supplier.taxId ?? '',
      });
    } else {
      this.form.reset({ name: '', phone: '', email: '', address: '', taxId: '' });
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

    const { name, phone, email, address, taxId } = this.form.getRawValue();
    const input = {
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      taxId: taxId || undefined,
    };
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.supplierService.updateSupplier(this.supplier!.id, input)
      : this.supplierService.createSupplier(input);

    request$.subscribe({
      next: (supplier) => {
        this.isSubmitting.set(false);
        this.saved.emit(supplier);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el proveedor. Inténtalo de nuevo.'));
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
