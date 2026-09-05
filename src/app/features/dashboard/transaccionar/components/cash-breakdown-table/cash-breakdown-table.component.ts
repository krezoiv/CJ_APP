import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

import { BANK_DEPOSIT_CASH_DENOMINATIONS, formatCurrency } from '../../../../../core/models';
import { CuadreStatus } from '../../../../../core/services/bank-deposit-draft.store';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';
import { StatusIndicatorComponent } from '../status-indicator/status-indicator.component';

interface CashRow {
  denomination: number;
  quantity: number;
  subtotal: number;
}

/** "Efectivo" — the fixed 11-row denomination breakdown; quantity per row is the only editable value, subtotal and the running total are always derived, never entered directly. */
@Component({
  selector: 'app-cash-breakdown-table',
  standalone: true,
  imports: [DecimalInputDirective, StatusIndicatorComponent],
  templateUrl: './cash-breakdown-table.component.html',
  styleUrl: './cash-breakdown-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashBreakdownTableComponent {
  @Input({ required: true }) cashCounts: Record<string, number> = {};
  @Input({ required: true }) totalCash = 0;
  @Input({ required: true }) totalAmount = 0;
  @Input({ required: true }) status!: CuadreStatus;
  @Input() disabled = false;

  @Output() quantityChange = new EventEmitter<{ denomination: number; quantity: number }>();

  readonly denominations = BANK_DEPOSIT_CASH_DENOMINATIONS;
  formatCurrency = formatCurrency;

  get rows(): CashRow[] {
    return this.denominations.map((denomination) => {
      const quantity = this.cashCounts[String(denomination)] || 0;
      return { denomination, quantity, subtotal: denomination * quantity };
    });
  }

  onQuantityInput(denomination: number, value: string): void {
    const parsed = parseInt(value, 10);
    this.quantityChange.emit({ denomination, quantity: Number.isNaN(parsed) ? 0 : Math.max(parsed, 0) });
  }

  /** Dynamic status copy — tells the user exactly how much is missing or in excess, not just that it doesn't match yet. */
  get statusText(): string {
    if (this.status === 'green') {
      return 'Efectivo cuadrado';
    }
    if (this.totalAmount <= 0) {
      return 'Ingresa el monto total a depositar';
    }
    const diff = this.totalAmount - this.totalCash;
    return diff > 0
      ? `Falta ${formatCurrency(diff)} en efectivo`
      : `Excede por ${formatCurrency(Math.abs(diff))}`;
  }

  formatDenomination(denomination: number): string {
    return `Q${denomination.toLocaleString('es-GT', { minimumFractionDigits: denomination < 1 ? 2 : 0 })}`;
  }
}
