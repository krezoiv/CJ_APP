import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * "Apertura del Día" para Recargas — dumb, the parent
 * (`RechargesPageComponent`) owns the actual
 * `POST /recharges/day-status/open` call on confirm. "Cancelar" only
 * closes this modal; it never navigates or deletes anything, since
 * nothing was opened yet. Structural copy of Bancos' own
 * `EntryConfirmModalComponent`, feature-scoped per this app's convention.
 */
@Component({
  selector: 'app-recharge-entry-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './recharge-entry-confirm-modal.component.html',
  styleUrl: './recharge-entry-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeEntryConfirmModalComponent {
  @Input() open = false;
  @Input() isOpening = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
