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
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { Client } from '../../../../../core/models';
import { ClientService } from '../../../../../core/services/client.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/** Rejects a whitespace-only name — `Validators.required` alone treats "   " as a non-empty value. */
function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : control.value;
  return value ? null : { required: true };
}

@Component({
  selector: 'app-client-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './client-form-modal.component.html',
  styleUrl: './client-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Client = edit mode (form is pre-filled from it). */
  @Input() client: Client | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Client>();

  private readonly fb = inject(FormBuilder);
  private readonly clientService = inject(ClientService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [notBlank, Validators.minLength(2), Validators.maxLength(150)]],
  });

  get isEditMode(): boolean {
    return this.client !== null;
  }

  nameErrorMessage(): string {
    const errors = this.form.controls.name.errors;
    if (!errors) {
      return '';
    }
    if (errors['required']) {
      return 'El nombre del cliente es obligatorio.';
    }
    if (errors['minlength']) {
      return 'El nombre del cliente debe tener al menos 2 caracteres.';
    }
    if (errors['maxlength']) {
      return 'El nombre del cliente no puede superar los 150 caracteres.';
    }
    return 'Ingresa un nombre válido.';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    this.form.reset({ name: this.client?.name ?? '' });
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

    // Trim + collapse internal whitespace client-side too — the backend re-normalizes
    // and re-validates independently, this is just so the user sees the clean value immediately.
    const name = this.form.getRawValue().name.trim().replace(/\s+/g, ' ');
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.clientService.updateClient(this.client!.id, { name })
      : this.clientService.createClient({ name });

    request$.subscribe({
      next: (client) => {
        this.isSubmitting.set(false);
        this.saved.emit(client);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el cliente. Inténtalo de nuevo.'));
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
