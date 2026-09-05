import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * Small, dedicated reason-collection modal — `ConfirmDialogService` only
 * supports a fixed title/message, no free-text input, so anular (which needs
 * a mandatory reason, same as the backend's `VoidTicketRequestDto`) can't
 * reuse it. Dumb, like `SaveConfirmModalComponent`/`FinalBalanceConfirmModalComponent`
 * elsewhere in this app — the parent owns the actual `voidTicket()` call.
 */
@Component({
  selector: 'app-void-reason-modal',
  standalone: true,
  imports: [FormsModule, IconComponent, ButtonComponent],
  templateUrl: './void-reason-modal.component.html',
  styleUrl: './void-reason-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoidReasonModalComponent {
  @Input() open = false;
  @Input() ticketNumber = '';
  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly reason = signal('');

  get isValid(): boolean {
    return this.reason().trim().length >= 5;
  }

  confirm(): void {
    if (!this.isValid) {
      return;
    }
    this.confirmed.emit(this.reason().trim());
    this.reason.set('');
  }

  cancel(): void {
    this.reason.set('');
    this.cancelled.emit();
  }
}
