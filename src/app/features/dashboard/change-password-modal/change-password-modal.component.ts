import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent, IconComponent } from '../../../shared/ui';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './change-password-modal.component.html',
  styleUrl: './change-password-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordModalComponent {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly errorMessage = signal<string | null>(null);
  readonly isSuccess = signal(false);
  readonly isSubmitting = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator }
  );

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.authService.changePassword(currentPassword, newPassword).subscribe((result) => {
      this.isSubmitting.set(false);

      if (!result.success) {
        this.errorMessage.set(result.error ?? 'No se pudo actualizar la contraseña.');
        return;
      }

      this.isSuccess.set(true);
    });
  }

  close(): void {
    this.form.reset();
    this.errorMessage.set(null);
    this.isSuccess.set(false);
    this.isSubmitting.set(false);
    this.closed.emit();
  }
}
