import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BankDepositWeeklyStat } from '../../../../../core/models';
import { BankDepositService } from '../../../../../core/services/bank-deposit.service';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

/** "1 sep" style, sin depender de `DatePipe` para un par de números — mismo estilo simple que el resto de este módulo. */
function shortDayMonth(isoDate: string): string {
  const day = Number(isoDate.slice(-2));
  const monthIndex = Number(isoDate.slice(5, 7)) - 1;
  const monthAbbr = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][monthIndex];
  return `${day} ${monthAbbr}`;
}

/**
 * "Transacciones por semana" en Gráficas → Indicadores de Transacciones —
 * reutiliza `BankDepositService.getWeeklyStats()`. Las semanas son buckets
 * fijos de 7 días desde el día 1 del mes (ver el use case del backend), así
 * que nunca mezclan días de otro mes; el mes actual se calcula siempre
 * server-side, así que esta gráfica se reinicia sola cada mes sin ningún
 * cambio de código.
 */
@Component({
  selector: 'app-weekly-transactions-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './weekly-transactions-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyTransactionsChartComponent {
  private readonly bankDepositService = inject(BankDepositService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly weeks = signal<BankDepositWeeklyStat[]>([]);

  readonly points = computed<LineChartPoint[]>(() =>
    this.weeks().map((week) => ({
      label: `Semana ${week.weekNumber}`,
      tooltipLabel: `Semana ${week.weekNumber} (${shortDayMonth(week.startDate)} - ${shortDayMonth(week.endDate)})`,
      value: week.transactionCount,
    })),
  );

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.bankDepositService.getWeeklyStats().subscribe({
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
