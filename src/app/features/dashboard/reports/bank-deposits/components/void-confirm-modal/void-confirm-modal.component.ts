import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../../shared/ui';

const MIN_REASON_LENGTH = 5;

/**
 * "Anular transacción" — dumb, same pattern as "Gestión de Transacciones"'
 * own reopen/cancel confirm modals: the parent owns the actual
 * `BankDepositService.voidOperation` call. Copy is explicit that this is
 * never a delete/edit — the operation stays in the historial forever, only
 * marked, and excluded from the report's own totals.
 */
@Component({
  selector: 'app-void-confirm-modal',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './void-confirm-modal.component.html',
  styleUrl: './void-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VoidConfirmModalComponent implements OnChanges {
  @Input() open = false;
  @Input() isSaving = false;

  @Output() confirmed = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  readonly reason = signal('');

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.reason.set('');
    }
  }

  get canConfirm(): boolean {
    return this.reason().trim().length >= MIN_REASON_LENGTH;
  }

  onCancel(): void {
    if (this.isSaving) {
      return;
    }
    this.reason.set('');
    this.cancelled.emit();
  }

  onConfirm(): void {
    if (!this.canConfirm || this.isSaving) {
      return;
    }
    this.confirmed.emit(this.reason().trim());
  }
}
