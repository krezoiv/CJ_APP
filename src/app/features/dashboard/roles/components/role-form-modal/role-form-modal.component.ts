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

import { Role, SYSTEM_ROLE_NAMES } from '../../../../../core/models';
import { RoleService } from '../../../../../core/services/role.service';
import { ConfirmDialogService } from '../../../../../core/services/confirm-dialog.service';
import { extractErrorMessage } from '../../../../../core/utils/extract-error-message';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

@Component({
  selector: 'app-role-form-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  templateUrl: './role-form-modal.component.html',
  styleUrl: './role-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormModalComponent implements OnChanges {
  @Input() open = false;
  /** null = create mode, a Role = edit mode (form is pre-filled from it). */
  @Input() role: Role | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<Role>();

  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly confirmDialogService = inject(ConfirmDialogService);

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(30)]],
    description: ['', Validators.maxLength(255)],
    isActive: [true],
  });

  get isEditMode(): boolean {
    return this.role !== null;
  }

  /** SUPER_ADMIN/ADMIN/USER — the backend rejects renaming these, so the field is locked here too. */
  get isSystemRole(): boolean {
    return this.role !== null && SYSTEM_ROLE_NAMES.includes(this.role.name);
  }

  /** Turning off a role with active users fails on the backend — block it here with an explanation instead. */
  get canDeactivate(): boolean {
    return this.role === null || this.role.usersCount === 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open'] || !this.open) {
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);

    if (this.role) {
      this.form.reset({
        name: this.role.name,
        description: this.role.description ?? '',
        isActive: this.role.isActive,
      });
      if (this.isSystemRole) {
        this.form.controls.name.disable();
      } else {
        this.form.controls.name.enable();
      }
      // A plain [disabled] template binding on a formControlName element is unreliable —
      // the forms directive owns the native disabled state, so it must be set here instead.
      if (this.canDeactivate) {
        this.form.controls.isActive.enable();
      } else {
        this.form.controls.isActive.disable();
      }
    } else {
      this.form.controls.name.enable();
      this.form.controls.isActive.enable();
      this.form.reset({ name: '', description: '', isActive: true });
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

    const { name, description, isActive } = this.form.getRawValue();
    this.isSubmitting.set(true);

    const request$ = this.isEditMode
      ? this.roleService.updateRole(this.role!.id, {
          ...(this.isSystemRole ? {} : { name }),
          description: description || undefined,
          isActive,
        })
      : this.roleService.createRole({ name, description: description || undefined });

    request$.subscribe({
      next: (role) => {
        this.isSubmitting.set(false);
        this.saved.emit(role);
      },
      error: (error: HttpErrorResponse) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'No se pudo guardar el rol. Inténtalo de nuevo.'));
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
