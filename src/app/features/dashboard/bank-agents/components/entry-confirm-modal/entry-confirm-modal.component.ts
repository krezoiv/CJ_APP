import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * "Apertura del Día" — dumb, the parent (`BankAgentsPageComponent`) owns
 * the actual `POST /banks/day-status/open` call on confirm. "Cancelar"
 * only closes this modal; it never navigates or deletes anything, since
 * nothing was opened yet.
 */
@Component({
  selector: 'app-entry-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './entry-confirm-modal.component.html',
  styleUrl: './entry-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryConfirmModalComponent {
  @Input() open = false;
  @Input() isOpening = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();
}
