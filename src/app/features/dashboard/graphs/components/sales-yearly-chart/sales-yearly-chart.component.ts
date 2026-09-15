import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { SalesMonthlyStat } from '../../../../../core/models';
import { SalesService } from '../../../../../core/services/sales.service';
import { formatCurrency } from '../../../../../core/utils/number-format.util';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

/**
 * "Ventas por mes" en Gráficas → Indicadores de Ventas — reutiliza
 * `SalesService.getYearlyStats()`. A diferencia de las otras dos gráficas
 * de este módulo, NO se reinicia cada mes — enero hasta el mes actual del
 * año en curso, acumulativo.
 */
@Component({
  selector: 'app-sales-yearly-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './sales-yearly-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesYearlyChartComponent {
  private readonly salesService = inject(SalesService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly months = signal<SalesMonthlyStat[]>([]);
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
    this.salesService.getYearlyStats().subscribe({
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
