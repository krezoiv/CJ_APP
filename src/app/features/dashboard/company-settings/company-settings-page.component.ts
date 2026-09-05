import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CompanySettingsService } from '../../../core/services/company-settings.service';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, CardComponent, IconComponent } from '../../../shared/ui';

const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Admin-only "Configuración de Empresa" screen — edits the one, always-existing
 * `company_settings` row (logo/nombre/dirección/teléfono/correo/NIT/redes
 * sociales) every document PDF (Venta, Compra, Ticket, Cotización) reads its
 * letterhead from. Route is already `adminGuard`-gated in `app.routes.ts`,
 * same "already unreachable for a non-admin" reasoning as `alert-settings`.
 * There is no file-upload backend (no multer/static-serving anywhere in this
 * project) — the logo is stored as a plain base64 string, read client-side
 * via `FileReader` and stripped of its `data:...;base64,` prefix before
 * submission, matching what `Buffer.from(logoBase64, 'base64')` expects on
 * the backend.
 */
@Component({
  selector: 'app-company-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, ButtonComponent, CardComponent, IconComponent],
  templateUrl: './company-settings-page.component.html',
  styleUrl: './company-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompanySettingsPageComponent {
  private readonly companySettingsService = inject(CompanySettingsService);
  private readonly confirmDialogService = inject(ConfirmDialogService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly isSaving = signal(false);
  readonly logoBase64 = signal<string | null>(null);
  readonly updatedByUsername = signal<string | null>(null);
  readonly updatedAt = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.maxLength(150)]],
    address: ['', [Validators.maxLength(255)]],
    phone: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
    taxId: ['', [Validators.maxLength(50)]],
    socialMedia: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    this.companySettingsService.getCompanySettings().subscribe({
      next: (settings) => {
        this.form.patchValue({
          businessName: settings.businessName,
          address: settings.address ?? '',
          phone: settings.phone ?? '',
          email: settings.email ?? '',
          taxId: settings.taxId ?? '',
          socialMedia: settings.socialMedia ?? '',
        });
        this.logoBase64.set(settings.logoBase64);
        this.updatedByUsername.set(settings.updatedByUsername);
        this.updatedAt.set(settings.updatedAt);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(
          extractErrorMessage(error, 'No se pudo cargar la configuración de la empresa.'),
        );
      },
    });
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.notificationService.error('El logo debe ser un archivo de imagen.');
      return;
    }
    if (file.size > MAX_LOGO_FILE_BYTES) {
      this.notificationService.error('La imagen del logo no debe superar 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const base64 = dataUrl.split(',')[1] ?? '';
      this.logoBase64.set(base64 || null);
    };
    reader.onerror = () => {
      this.notificationService.error('No se pudo leer el archivo seleccionado.');
    };
    reader.readAsDataURL(file);
  }

  removeLogo(): void {
    this.logoBase64.set(null);
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    const confirmed = await this.confirmDialogService.confirm({
      type: 'UPDATE',
      title: 'Actualizar configuración de la empresa',
      message: '¿Desea guardar los cambios en los datos de la empresa? Se usarán en todos los documentos PDF.',
    });
    if (!confirmed) {
      return;
    }

    const raw = this.form.getRawValue();
    this.isSaving.set(true);
    this.companySettingsService
      .updateCompanySettings({
        businessName: raw.businessName,
        address: raw.address.trim() || null,
        phone: raw.phone.trim() || null,
        email: raw.email.trim() || null,
        taxId: raw.taxId.trim() || null,
        socialMedia: raw.socialMedia.trim() || null,
        logoBase64: this.logoBase64(),
      })
      .subscribe({
        next: (settings) => {
          this.isSaving.set(false);
          this.updatedByUsername.set(settings.updatedByUsername);
          this.updatedAt.set(settings.updatedAt);
          this.notificationService.success('Configuración de la empresa actualizada correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSaving.set(false);
          this.notificationService.error(
            extractErrorMessage(error, 'No se pudo actualizar la configuración de la empresa.'),
          );
        },
      });
  }
}
