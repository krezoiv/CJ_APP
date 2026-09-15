import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { PurchasesMonthlyStat } from '../../../../../core/models';
import { PurchasesService } from '../../../../../core/services/purchases.service';
import { formatCurrency } from '../../../../../core/utils/number-format.util';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

/**
 * "Compras por mes" en Gráficas → Indicadores de Compras — reutiliza
 * `PurchasesService.getYearlyStats()`. A diferencia de las otras dos
 * gráficas de este módulo, NO se reinicia cada mes — enero hasta el mes
 * actual del año en curso, acumulativo.
 */
@Component({
  selector: 'app-purchases-yearly-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './purchases-yearly-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesYearlyChartComponent {
  private readonly purchasesService = inject(PurchasesService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly months = signal<PurchasesMonthlyStat[]>([]);
  readonly year = signal<number | null>(null);

  formatCurrency = formatCurrency;

  readonly points = computed<LineChartPoint[]>(() =>
    this.months().map((month) => ({
      label: month.label.slice(0, 3),
      tooltipLabel: `${month.label} ${this.year() ?? ''}`.trim(),
      value: month.amount,
    })),
  );

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.purchasesService.getYearlyStats().subscribe({
      next: (stats) => {
        this.months.set(stats.months);
        this.year.set(stats.year);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
