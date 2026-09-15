import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { BankDepositMonthlyStat } from '../../../../../core/models';
import { BankDepositService } from '../../../../../core/services/bank-deposit.service';
import { LineChartComponent, LineChartPoint } from '../../../../../shared/ui';

/**
 * "Transacciones por mes" en Gráficas → Indicadores de Transacciones —
 * reutiliza `BankDepositService.getYearlyStats()`. A diferencia de las
 * otras dos gráficas de este módulo, ésta NO se reinicia cada mes — enero
 * hasta el mes actual del año en curso, acumulativo, permitiendo comparar
 * meses y ver tendencias dentro del año.
 */
@Component({
  selector: 'app-yearly-transactions-chart',
  standalone: true,
  imports: [LineChartComponent],
  templateUrl: './yearly-transactions-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YearlyTransactionsChartComponent {
  private readonly bankDepositService = inject(BankDepositService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  private readonly months = signal<BankDepositMonthlyStat[]>([]);
  readonly year = signal<number | null>(null);

  readonly points = computed<LineChartPoint[]>(() =>
    this.months().map((month) => ({
      label: month.label.slice(0, 3),
      tooltipLabel: `${month.label} ${this.year() ?? ''}`.trim(),
      value: month.transactionCount,
    })),
  );

  constructor() {
    this.fetch();
  }

  fetch(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.bankDepositService.getYearlyStats().subscribe({
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
