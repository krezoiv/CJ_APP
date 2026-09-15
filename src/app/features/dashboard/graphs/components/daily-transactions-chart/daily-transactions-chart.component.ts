import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BankDepositDailyStat } from '../../../../../core/models';
import { BankDepositService } from '../../../../../core/services/bank-deposit.service';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Local-time `yyyy-MM-dd` — small per-feature copy of the same helper already duplicated across this codebase (see `TransactionMonthlyChartComponent`'s own copy) rather than a shared util. */
function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * "Transacciones del mes" en Gráficas → Indicadores de Transacciones —
 * reutiliza `BankDepositService.getDailyStats()`, el mismo endpoint que ya
 * usa `TransactionMonthlyChartComponent` en Resumen/Transaccionar/Reporte
 * de Transacciones — cero cambios de backend para esta gráfica. Solo
 * traduce esos días a `LineChartPoint[]` y delega todo el dibujo a
 * `app-line-chart`.
 */
@Component({
  selector: 'app-daily-transactions-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './daily-transactions-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyTransactionsChartComponent {
  private readonly bankDepositService = inject(BankDepositService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly days = signal<BankDepositDailyStat[]>([]);

  readonly points = computed<LineChartPoint[]>(() => {
    const todayIso = todayIsoDate();
    return this.days().map((day) => {
      const dayNumber = Number(day.date.slice(-2));
      const monthIndex = Number(day.date.slice(5, 7)) - 1;
      return {
        label: String(dayNumber),
        tooltipLabel: `${dayNumber} de ${MONTH_NAMES_ES[monthIndex]}`,
        value: day.transactionCount,
        isToday: day.date === todayIso,
      };
    });
  });

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.bankDepositService.getDailyStats().subscribe({
      next: (stats) => {
        this.days.set(stats.days);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }
}
