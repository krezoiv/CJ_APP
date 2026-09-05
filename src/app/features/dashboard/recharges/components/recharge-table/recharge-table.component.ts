import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { RechargeDailyBalance, formatCurrency } from '../../../../../core/models';
import { ButtonComponent, IconComponent } from '../../../../../shared/ui';
import { DecimalInputDirective } from '../../../../../shared/directives/decimal-input.directive';

export interface RequestFinalBalanceEvent {
  balance: RechargeDailyBalance;
  finalBalance: number;
}

/**
 * Dumb table over today's balances — one row per active recharge type. The
 * "Saldo Final" cell is the only editable one; "Compra" is a read-only
 * running total, always computed by the backend
 * (`dailyBalance - previousBalance`), never entered directly here (that's
 * what the separate "Registrar compra" form is for).
 */
@Component({
  selector: 'app-recharge-table',
  standalone: true,
  imports: [ButtonComponent, IconComponent, DecimalInputDirective],
  templateUrl: './recharge-table.component.html',
  styleUrl: './recharge-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeTableComponent implements OnChanges {
  @Input() balances: RechargeDailyBalance[] = [];
  @Input() loading = false;
  /** Whether the caller can re-edit an already-closed day — mirrors the backend's admin-only re-edit rule. */
  @Input() isAdmin = false;
  /**
   * Whole-day gate, stronger than the per-type `isAdmin` re-edit rule below:
   * `'closed'` (via "Cerrar Día") blocks everyone, admin included, until
   * reopened via Gestión de Días de Recargas; `'not_opened'` (today only)
   * just needs "Confirmar Apertura" — no admin action needed. `null` means
   * editing is unlocked.
   */
  @Input() dayLockReason: 'closed' | 'not_opened' | null = null;

  @Output() requestFinalBalance = new EventEmitter<RequestFinalBalanceEvent>();

  readonly skeletonRows = [0, 1];

  formatCurrency = formatCurrency;

  /** Per-row typed "Saldo Final" text, keyed by balance id — not a two-way `[(ngModel)]`, mirrors Compras' price-input pattern. */
  draftFinalBalance: Partial<Record<string, string>> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['balances']) {
      return;
    }
    for (const balance of this.balances) {
      if (!(balance.id in this.draftFinalBalance)) {
        this.draftFinalBalance[balance.id] = balance.finalBalance !== null ? String(balance.finalBalance) : '';
      }
    }
  }

  onFinalBalanceInput(balance: RechargeDailyBalance, value: string): void {
    this.draftFinalBalance[balance.id] = value;
  }

  /** A day already closed can only be re-edited by an admin — same rule `RegisterRechargeFinalBalanceUseCase` enforces server-side. A day locked via "Cerrar Día" (or not yet opened) blocks everyone, admin included. */
  canEditFinalBalance(balance: RechargeDailyBalance): boolean {
    return this.dayLockReason === null && (balance.finalBalance === null || this.isAdmin);
  }

  canSave(balance: RechargeDailyBalance): boolean {
    return this.canEditFinalBalance(balance) && this.draftHasValue(balance) && this.finalBalanceError(balance) === null;
  }

  /**
   * Explains exactly why "Guardar" is disabled instead of leaving the button
   * silently grayed out — a typed value over the daily balance (a real,
   * backend-enforced rule: `FINAL_BALANCE_EXCEEDS_DAILY`) used to look
   * indistinguishable from a broken input once it grew past a few digits,
   * since nothing on screen said why. `null` means either there's nothing
   * to validate yet (empty draft) or the value is valid.
   */
  finalBalanceError(balance: RechargeDailyBalance): string | null {
    if (!this.canEditFinalBalance(balance) || !this.draftHasValue(balance)) {
      return null;
    }
    const value = Number(this.draftFinalBalance[balance.id]);
    if (!Number.isFinite(value)) {
      return 'Ingresa un número válido.';
    }
    if (value < 0) {
      return 'El saldo final no puede ser negativo.';
    }
    if (value > balance.dailyBalance) {
      return `No puede superar el saldo del día (${formatCurrency(balance.dailyBalance)}).`;
    }
    return null;
  }

  private draftHasValue(balance: RechargeDailyBalance): boolean {
    const raw = this.draftFinalBalance[balance.id];
    return raw !== undefined && raw.trim() !== '';
  }

  save(balance: RechargeDailyBalance): void {
    if (!this.canSave(balance)) {
      return;
    }
    this.requestFinalBalance.emit({ balance, finalBalance: Number(this.draftFinalBalance[balance.id]) });
  }
}
