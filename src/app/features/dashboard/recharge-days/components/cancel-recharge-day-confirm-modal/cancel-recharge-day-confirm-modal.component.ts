import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

const MIN_REASON_LENGTH = 5;

/**
 * Dumb — same pattern as `ReopenRechargeDayConfirmModalComponent`. "Anular"
 * (not "Eliminar"): this is financial information and the backend never
 * does a physical `DELETE` (`cancel_recharge_day` only marks
 * `is_cancelled`, see the backend) — the modal's copy must reflect exactly
 * that.
 */
@Component({
  selector: 'app-cancel-recharge-day-confirm-modal',
  standalone: true,
  imports: [FormsModule, ButtonComponent, IconComponent],
  templateUrl: './cancel-recharge-day-confirm-modal.component.html',
  styleUrl: './cancel-recharge-day-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CancelRechargeDayConfirmModalComponent implements OnChanges {
  @Input() open = false;
  @Input() date: string | null = null;
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
