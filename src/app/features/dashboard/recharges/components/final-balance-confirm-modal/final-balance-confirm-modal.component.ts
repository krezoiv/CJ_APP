import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { formatCurrency } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

/** Dumb — the page owns the actual `registerFinalBalance` call, same split as Compras' `SaveConfirmModalComponent`. */
@Component({
  selector: 'app-final-balance-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './final-balance-confirm-modal.component.html',
  styleUrl: './final-balance-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinalBalanceConfirmModalComponent {
  @Input() open = false;
  @Input() rechargeTypeName = '';
  @Input() dailyBalance = 0;
  @Input() finalBalance = 0;
  @Input() isSaving = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  formatCurrency = formatCurrency;

  get sale(): number {
    return this.dailyBalance - this.finalBalance;
  }
}
