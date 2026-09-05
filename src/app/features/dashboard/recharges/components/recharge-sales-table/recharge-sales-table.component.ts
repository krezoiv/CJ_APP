import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { RechargeSale, formatCurrency } from '../../../../../core/models';
import { IconComponent } from '../../../../../shared/ui';

/**
 * Dumb table over "Recargas Vendidas" — the individual customer top-ups
 * recorded for the page's operation date. `locked` rows (their operator's
 * saldo final was already registered) hide the edit/delete actions instead
 * of showing them disabled, since a locked row is finished history, not a
 * temporarily-unavailable action — same reasoning `RechargeTableComponent`
 * uses for its own "día cerrado" hint, just without a "solo un
 * administrador" escape hatch (see this feature's own domain error).
 */
@Component({
  selector: 'app-recharge-sales-table',
  standalone: true,
  imports: [IconComponent, DatePipe],
  templateUrl: './recharge-sales-table.component.html',
  styleUrl: './recharge-sales-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechargeSalesTableComponent {
  @Input() sales: RechargeSale[] = [];
  @Input() loading = false;
  /** Whole-day gate — hides edit/delete for every row while non-null, same reasoning as a per-row `locked` sale, just module-wide instead of per-operator. `'closed'` vs `'not_opened'` drive different hint copy. */
  @Input() dayLockReason: 'closed' | 'not_opened' | null = null;

  @Output() editRequested = new EventEmitter<RechargeSale>();
  @Output() deleteRequested = new EventEmitter<RechargeSale>();

  readonly skeletonRows = [0, 1, 2];

  formatCurrency = formatCurrency;
}
