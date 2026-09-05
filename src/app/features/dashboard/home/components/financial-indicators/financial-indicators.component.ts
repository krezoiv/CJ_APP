import { DatePipe, TitleCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';

import { DashboardMetrics, formatCurrency, formatQuantity } from '../../../../../core/models';
import { CardComponent, IconComponent } from '../../../../../shared/ui';

/**
 * "Indicadores del mes" — Ventas de Recargas / Ventas / Compras /
 * Transacciones Bancarias, all sourced from `GET /dashboard/summary` (see
 * the backend `CLAUDE.md`'s "Dashboard" section). Dumb/presentational: the
 * parent (`DashboardHomeComponent`) owns the fetch, the `AuthService.isAdmin`
 * gate, and loading/error state — this component only ever renders whatever
 * `metrics` it's handed, or a loading/empty placeholder.
 *
 * No client-side date-range logic anywhere in this component — `period`
 * (año/mes/rango) is rendered exactly as the backend computed it, never
 * re-derived from the browser's own clock, so there is nothing here that
 * could disagree with the server about which month "now" is.
 */
@Component({
  selector: 'app-financial-indicators',
  standalone: true,
  imports: [DatePipe, TitleCasePipe, CardComponent, IconComponent],
  templateUrl: './financial-indicators.component.html',
  styleUrl: './financial-indicators.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialIndicatorsComponent {
  @Input() set metrics(value: DashboardMetrics | null) {
    this._metrics.set(value);
  }
  get metrics(): DashboardMetrics | null {
    return this._metrics();
  }
  private readonly _metrics = signal<DashboardMetrics | null>(null);

  @Input() loading = false;

  formatCurrency = formatCurrency;
  formatQuantity = formatQuantity;

  /** `period.year`/`period.month` → a real `Date` purely for the `date` pipe's `'MMMM yyyy'` formatting — never used for any range computation, that's entirely server-side. */
  readonly periodDate = computed(() => {
    const period = this._metrics()?.period;
    return period ? new Date(period.year, period.month - 1, 1) : null;
  });
}
