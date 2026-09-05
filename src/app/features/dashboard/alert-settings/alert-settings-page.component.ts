import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { RechargeType } from '../../../core/models';
import { AlertSettingsService } from '../../../core/services/alert-settings.service';
import { RechargesService } from '../../../core/services/recharges.service';
import { NotificationService } from '../../../core/services/notification.service';
import { extractErrorMessage } from '../../../core/utils/extract-error-message';
import { ButtonComponent, CardComponent, IconComponent } from '../../../shared/ui';

/**
 * Admin-only screen for the DB-persisted alert thresholds: días de
 * anticipación de pago (global, one row) and saldo mínimo per recharge type
 * (Claro/Tigo, independently). Stock mínimo per producto+ubicación is
 * deliberately NOT here — it already lives on each product's own detail
 * page (`ProductDetailPageComponent`), right next to the stock it
 * thresholds, so it isn't duplicated in a second place. Route itself is
 * already `adminGuard`-gated in `app.routes.ts`; nothing here re-checks
 * `AuthService.isAdmin` the way Categorías/Inventario do, matching the same
 * "already unreachable for a non-admin" reasoning Usuarios/Roles use.
 */
@Component({
  selector: 'app-alert-settings-page',
  standalone: true,
  imports: [ButtonComponent, CardComponent, IconComponent],
  templateUrl: './alert-settings-page.component.html',
  styleUrl: './alert-settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertSettingsPageComponent {
  private readonly alertSettingsService = inject(AlertSettingsService);
  private readonly rechargesService = inject(RechargesService);
  private readonly notificationService = inject(NotificationService);

  readonly loading = signal(true);
  readonly rechargeTypes = signal<RechargeType[]>([]);

  readonly alertDaysDraft = signal('');
  readonly isSavingAlertDays = signal(false);

  /** Keyed by recharge type id. */
  readonly minBalanceDraft = signal<Record<string, string>>({});
  readonly savingTypeId = signal<string | null>(null);

  constructor() {
    this.fetchAll();
  }

  private fetchAll(): void {
    this.loading.set(true);
    this.alertSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.alertDaysDraft.set(String(settings.purchasePaymentAlertDays));
      },
      error: (error: HttpErrorResponse) => {
        this.notificationService.error(extractErrorMessage(error, 'No se pudo cargar la configuración de alertas.'));
      },
    });

    this.rechargesService.getTypes().subscribe({
      next: (types) => {
        this.rechargeTypes.set(types);
        this.minBalanceDraft.set(
          Object.fromEntries(types.map((type) => [type.id, String(type.minBalance)])),
        );
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.notificationService.error(extractErrorMessage(error, 'No se pudieron cargar los tipos de recarga.'));
      },
    });
  }

  onAlertDaysInput(value: string): void {
    this.alertDaysDraft.set(value);
  }

  canSaveAlertDays(): boolean {
    const parsed = Number(this.alertDaysDraft());
    return Number.isInteger(parsed) && parsed >= 0;
  }

  saveAlertDays(): void {
    if (!this.canSaveAlertDays() || this.isSavingAlertDays()) {
      return;
    }
    this.isSavingAlertDays.set(true);
    this.alertSettingsService
      .updateSettings({ purchasePaymentAlertDays: Number(this.alertDaysDraft()) })
      .subscribe({
        next: () => {
          this.isSavingAlertDays.set(false);
          this.notificationService.success('Días de anticipación actualizados correctamente.');
        },
        error: (error: HttpErrorResponse) => {
          this.isSavingAlertDays.set(false);
          this.notificationService.error(extractErrorMessage(error, 'No se pudo actualizar la configuración.'));
        },
      });
  }

  onMinBalanceInput(typeId: string, value: string): void {
    this.minBalanceDraft.update((draft) => ({ ...draft, [typeId]: value }));
  }

  canSaveMinBalance(typeId: string): boolean {
    const raw = this.minBalanceDraft()[typeId];
    if (raw === undefined) {
      return false;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0;
  }

  saveMinBalance(typeId: string): void {
    if (!this.canSaveMinBalance(typeId) || this.savingTypeId()) {
      return;
    }
    const minBalance = Number(this.minBalanceDraft()[typeId]);
    this.savingTypeId.set(typeId);
    this.rechargesService.updateTypeMinBalance(typeId, minBalance).subscribe({
      next: (updated) => {
        this.savingTypeId.set(null);
        this.rechargeTypes.update((types) => types.map((type) => (type.id === typeId ? updated : type)));
        this.notificationService.success('Saldo mínimo actualizado correctamente.');
      },
      error: (error: HttpErrorResponse) => {
        this.savingTypeId.set(null);
        this.notificationService.error(extractErrorMessage(error, 'No se pudo actualizar el saldo mínimo.'));
      },
    });
  }
}
