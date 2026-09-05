import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * "Cerrar Día" para Recargas — dumb, the parent (`RechargesPageComponent`)
 * owns the actual `POST /recharges/day-status/close` call on confirm. This
 * is a standalone action: it never saves a cuadre itself (that's still
 * "Guardar cuadre", unlimited-per-day and unchanged) — closing only blocks
 * further writes for the date from this point on, and can later be undone
 * only by an admin via "Reabrir Día" in Gestión de Días de Recargas.
 */
@Component({
  selector: 'app-close-recharge-day-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './close-recharge-day-confirm-modal.component.html',
  styleUrl: './close-recharge-day-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseRechargeDayConfirmModalComponent {
  @Input() open = false;
  @Input() isClosing = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
