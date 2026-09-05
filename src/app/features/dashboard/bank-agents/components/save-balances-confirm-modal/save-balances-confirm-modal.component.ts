import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/** Dumb — the parent (`BankAgentsPageComponent`) owns the actual save; this modal only confirms the intent. */
@Component({
  selector: 'app-save-balances-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './save-balances-confirm-modal.component.html',
  styleUrl: './save-balances-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveBalancesConfirmModalComponent {
  @Input() open = false;
  @Input() date = '';
  @Input() isSaving = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
