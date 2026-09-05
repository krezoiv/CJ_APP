import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { BANK_DEPOSIT_CASH_DENOMINATIONS, formatCurrency, formatQuantity } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';

interface CashSummaryRow {
  denomination: number;
  quantity: number;
  subtotal: number;
}

/** Rich summary-before-save — a bespoke modal (not the generic `ConfirmDialogService`) because it needs to render the full cash breakdown and per-transaction list, which that service's plain string API can't express. */
@Component({
  selector: 'app-bank-deposit-save-confirm-modal',
  standalone: true,
  imports: [ButtonComponent, IconComponent],
  templateUrl: './save-confirm-modal.component.html',
  styleUrl: './save-confirm-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SaveConfirmModalComponent {
  @Input() open = false;
  @Input() transactionTypeName = '';
  @Input() transactionBankName = '';
  @Input() clientName = '';
  @Input() totalAmount = 0;
  @Input() cashCounts: Record<string, number> = {};
  @Input() transactionAmounts: number[] = [];
  @Input() isSaving = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  get cashRows(): CashSummaryRow[] {
    return BANK_DEPOSIT_CASH_DENOMINATIONS.map((denomination) => ({
      denomination,
      quantity: this.cashCounts[String(denomination)] || 0,
      subtotal: denomination * (this.cashCounts[String(denomination)] || 0),
    })).filter((row) => row.quantity > 0);
  }

  formatDenomination(denomination: number): string {
    return `Q${denomination.toLocaleString('es-GT', { minimumFractionDigits: denomination < 1 ? 2 : 0 })}`;
  }
}
