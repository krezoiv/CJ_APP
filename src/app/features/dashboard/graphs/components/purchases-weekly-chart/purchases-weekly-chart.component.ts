import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { PurchasesWeeklyStat } from '../../../../../core/models';
import { PurchasesService } from '../../../../../core/services/purchases.service';
import { formatCurrency } from '../../../../../core/utils/number-format.util';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

function shortDayMonth(isoDate: string): string {
  const day = Number(isoDate.slice(-2));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const monthAbbr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][monthIndex];
  return `${day} ${monthAbbr}`;
}

/**
 * "Compras por semana" en Gráficas → Indicadores de Compras — reutiliza
 * `PurchasesService.getWeeklyStats()`. Buckets fijos de 7 días desde el
 * día 1 del mes actual, nunca semana ISO — se reinicia solo cada mes.
 */
@Component({
  selector: 'app-purchases-weekly-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './purchases-weekly-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesWeeklyChartComponent {
  private readonly purchasesService = inject(PurchasesService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly weeks = signal<PurchasesWeeklyStat[]>([]);

  formatCurrency = formatCurrency;

  readonly points = computed<LineChartPoint[]>(() =>
    this.weeks().map((week) => ({
      label: `Semana ${week.weekNumber}`,
      tooltipLabel: `Semana ${week.weekNumber} (${shortDayMonth(week.startDate)} - ${shortDayMonth(week.endDate)})`,
      value: week.amount,
    })),
  );

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.purchasesService.getWeeklyStats().subscribe({
      next: (stats) => {
        this.weeks.set(stats.weeks);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
