import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/**
 * Small, dedicated reason-collection modal — `ConfirmDialogService` only
 * supports a fixed title/message, no free-text input, so anular (which needs
 * a mandatory reason, same as the backend's `VoidQuotationRequestDto`) can't
 * reuse it. A small, deliberate copy of Tickets' own `VoidReasonModalComponent`
 * (same convention as that component's own doc comment) rather than a shared
 * one, since the label text genuinely differs ("cotización" vs "ticket").
 * Dumb — the parent owns the actual `voidQuotation()` call.
 */
@Component({
  selector: 'app-quotation-void-reason-modal',
  standalone: true,
  imports: [FormsModule, IconComponent, ButtonComponent],
  templateUrl: './quotation-void-reason-modal.component.html',
  styleUrl: './quotation-void-reason-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotationVoidReasonModalComponent {
  @Input() open = false;
  @Input() quotationNumber = '';
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
