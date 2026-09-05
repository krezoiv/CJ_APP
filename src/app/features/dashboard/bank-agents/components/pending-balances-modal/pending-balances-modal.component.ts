import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { MissingBankInfo } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * Dumb — the parent (`CuadreAgentesPageComponent`) owns the validation
 * and when to show it. "Permanecer aquí" only closes the modal (the real
 * block lives in the "Guardar Cuadre" button, not here); "Ir a registrar
 * saldos" navigates to Agentes Bancarios → Bancos, which already
 * operates on "today" by default — the same implicit date Cuadre
 * Agentes uses, so the date is never lost across the navigation.
 */
@Component({
  selector: 'app-pending-balances-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent, RouterLink],
  templateUrl: './pending-balances-modal.component.html',
  styleUrl: './pending-balances-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingBalancesModalComponent {
  @Input() open = false;
  @Input() date = '';
  @Input() missingBanks: MissingBankInfo[] = [];

  @Output() dismissed = new EventEmitter<void>();
}
