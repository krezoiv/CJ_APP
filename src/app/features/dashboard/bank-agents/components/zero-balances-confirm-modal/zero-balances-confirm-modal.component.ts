import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/** Dumb — the parent (`BankAgentsPageComponent`) owns applying the zeros to the draft; this modal only confirms the intent. */
@Component({
  selector: 'app-zero-balances-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './zero-balances-confirm-modal.component.html',
  styleUrl: './zero-balances-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZeroBalancesConfirmModalComponent {
  @Input() open = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
